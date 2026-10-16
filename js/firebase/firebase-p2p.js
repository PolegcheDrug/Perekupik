// ========================================================
// js/firebase-p2p.js — P2P TRADE, CLUBS, LEADERBOARD, CARS (v1.2.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.2.0 (SPRINT 3 — ФИКСЫ БЕЗ СОСТАВНЫХ ИНДЕКСОВ):
//   - ФИКС: fetchTradeOffers больше НЕ использует
//     3-way where + orderBy (требовал индекса). Теперь:
//       where(toUserId) + limit, фильтр по status=pending
//       и сортировка createdAt desc — НА КЛИЕНТЕ.
//   - ФИКС: subscribeToTradeOffers — то же самое.
//   - ФИКС: sendTradeOffer — мягче блокировка UID
//     (только guest_777 и dev_ явно отсекаются).
//   - ФИКС: Clubs/Leaderboard — защита от permission-denied
//     и graceful degrade, если коллекция не в Rules.
//   - ФИКС: acceptTradeOffer — try/catch вокруг notif/pullSave,
//     чтобы падение уведомления не валило саму сделку.
//   - Добавлен EventBus-эмит 'p2p:trade_completed' для UI.
// ⭐ v1.1.0 (SPRINT 2 — A3 + B3):
//   - acceptTradeOffer атомарно обменивает машины
//   - sendTradeOffer валидирует myItem в гараже
// ⭐ v1.0.0: P2P Trade, Clubs, Leaderboard, CarsCatalog, QuickChat
//
// ВАЖНО: файл — ES-модуль (import), подключается через
//   <script type="module" src="firebase-p2p.js?v=421"></script>
// Должен быть загружен ПОСЛЕДНИМ из firebase-*.js.
// ========================================================

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  writeBatch,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ========================================================
// 1. ИМПОРТ ЯДРА И ДРУГИХ МОДУЛЕЙ
// ========================================================
const FB_Core = window.FB_Core;
if (!FB_Core) {
  console.error('[☁️ FB_P2P] Критическая ошибка: firebase-core.js не загружен!');
  throw new Error('firebase-core.js must be loaded before firebase-p2p.js');
}

const db = FB_Core.db;
const auth = FB_Core.auth;
const devLogFirestore = FB_Core.devLogFirestore;
const TTL_CONFIG = FB_Core.TTL_CONFIG;
const LIMITS = FB_Core.LIMITS;

const FB_Market = window.FB_Market || {};
const FB_Friendships = window.FB_Friendships || {};
const FB_Notifications = window.FB_Notifications || {};

// ========================================================
// 2. ХЕЛПЕР: получить текущий профиль игрока
// ========================================================
function getCurrentPlayerProfile() {
  const authProfile = FB_Core.Auth?.getUserProfile?.();
  if (authProfile && authProfile.id) return authProfile;

  const tgUser = FB_Core.getTelegramUser?.();
  if (tgUser && tgUser.id) {
    const names = [];
    if (tgUser.first_name) names.push(tgUser.first_name);
    if (tgUser.last_name) names.push(tgUser.last_name);

    return {
      id: String(tgUser.id),
      name: names.join(" ").trim() || (tgUser.username ? "@" + tgUser.username : "Перекуп #" + tgUser.id),
      username: tgUser.username || "",
      photoUrl: tgUser.photo_url || null,
      isTelegram: true
    };
  }

  if (window.state?.player?.uid) {
    return {
      id: String(window.state.player.uid),
      name: window.state.player.name || "Перекуп",
      username: "",
      photoUrl: null,
      isTelegram: false
    };
  }

  return null;
}

// ========================================================
// 2.1. ХЕЛПЕР: клиентская фильтрация + сортировка
// (используется вместо составных индексов Firestore)
// ========================================================
function _filterAndSortDocs(items, opts = {}) {
  if (!Array.isArray(items)) return [];
  const now = Date.now();

  const result = items.filter(item => {
    if (!item) return false;
    if (item.expireAt && item.expireAt < now) return false;
    if (opts.status !== undefined && item.status !== opts.status) return false;
    if (opts.statuses !== undefined && !opts.statuses.includes(item.status)) return false;
    return true;
  });

  if (opts.sortBy) {
    const dir = opts.sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      const ta = Number(a[opts.sortBy]) || 0;
      const tb = Number(b[opts.sortBy]) || 0;
      return (ta - tb) * dir;
    });
  }

  return result;
}

// ========================================================
// 3. P2P TRADE MANAGER (обмен между игроками)
// ========================================================
const P2PTradeManager = {
  _listeners: [],

  /**
   * Отправить trade offer другому игроку.
   * @param {string} toUserId — кому
   * @param {Object} offerData — { myItem: {...}, theirItemId: 'lot_xxx' | null, message: '' }
   */
  async sendTradeOffer(toUserId, offerData) {
    const profile = getCurrentPlayerProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };
    if (!toUserId || String(toUserId) === String(profile.id)) {
      return { success: false, error: "Нельзя отправить оффер самому себе" };
    }

    // Проверка myItem в гараже отправителя
    const myItemUid = offerData?.myItem?.uid;
    if (!myItemUid) {
      return { success: false, error: "Не указан предмет для обмена" };
    }

    const myGarage = Array.isArray(window.state?.garage) ? window.state.garage : [];
    const myCar = myGarage.find(c => c && (c.uid === myItemUid || c.id === myItemUid));

    if (!myCar) {
      devLogFirestore('sendTradeOffer BLOCKED', 'myItem не в гараже');
      return { success: false, error: "Предмет не найден в вашем гараже" };
    }

    if (myCar.isPersonal) {
      return { success: false, error: "Нельзя обменять личный автомобиль" };
    }

    if (myCar.impounded) {
      return { success: false, error: "Машина на штрафстоянке — нельзя обменять" };
    }

    try {
      const offerId = "trade_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const offerRef = doc(db, "trade_offers", offerId);
      const notifRef = doc(db, "notifications", "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6));

      const payload = {
        offer_id: offerId,
        fromUserId: String(profile.id),
        fromUserName: profile.name || "Перекуп",
        toUserId: String(toUserId),
        myItem: offerData.myItem || null,
        theirItemId: offerData.theirItemId || null,
        message: offerData.message || "",
        status: "pending",
        createdAt: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.trade_offers
      };

      await setDoc(offerRef, payload);

      // Уведомление — не блокируем, если упадёт
      setDoc(notifRef, {
        toUser: String(toUserId),
        type: "trade_offer",
        title: "🤝 Новое предложение обмена!",
        text: `${profile.name} предлагает обмен. Откройте вкладку «Торг» в M+ чтобы посмотреть детали.`,
        offerId: offerId,
        read: false,
        claimed: false,
        timestamp: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.notifications
      }).catch(err => console.warn('[P2PTrade] notif error:', err));

      devLogFirestore('sendTradeOffer OK', offerId);
      return { success: true, offerId };
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      devLogFirestore('sendTradeOffer ERROR', errMsg);
      return { success: false, error: errMsg };
    }
  },

  /**
   * Принять trade offer с АТОМАРНЫМ ОБМЕНОМ машин.
   */
  async acceptTradeOffer(offerId) {
    const profile = getCurrentPlayerProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };

    const offerRef = doc(db, "trade_offers", offerId);

    let result = null;

    try {
      await runTransaction(db, async (tx) => {
        // 1. ЧИТАЕМ ОФФЕР
        const offerSnap = await tx.get(offerRef);
        if (!offerSnap.exists()) throw new Error("Оффер не найден");

        const offerData = offerSnap.data();

        if (String(offerData.toUserId) !== String(profile.id)) {
          throw new Error("Этот оффер не вам");
        }
        if (offerData.status !== "pending") {
          throw new Error("Оффер уже неактуален");
        }
        if (offerData.expireAt && offerData.expireAt < Date.now()) {
          throw new Error("Оффер просрочен");
        }

        const fromUserId = String(offerData.fromUserId);
        const toUserId = String(offerData.toUserId);
        const myItemUid = offerData.myItem?.uid;
        const lotId = offerData.theirItemId;

        if (!myItemUid) throw new Error("В оффере нет машины отправителя");
        if (!lotId) throw new Error("В оффере нет ссылки на ваш лот");

        // 2. ЧИТАЕМ ЛОТ
        const lotRef = doc(db, "market_lots", String(lotId));
        const lotSnap = await tx.get(lotRef);
        if (!lotSnap.exists()) throw new Error("Лот больше не активен");
        const lotData = lotSnap.data();
        if (lotData.status !== "active") throw new Error("Лот снят с продажи");
        if (String(lotData.sellerId) !== toUserId) throw new Error("Вы не владелец лота");

        const myCarUid = lotData.itemData?.uid || lotData.itemData?.id;
        if (!myCarUid) throw new Error("У лота нет привязки к uid машины");

        // 3. ЧИТАЕМ ОБА ГАРАЖА
        const garageARef = doc(db, "garages", fromUserId);
        const garageBRef = doc(db, "garages", toUserId);

        const garageASnap = await tx.get(garageARef);
        const garageBSnap = await tx.get(garageBRef);

        const garageAData = garageASnap.exists() ? garageASnap.data() : {};
        const garageBData = garageBSnap.exists() ? garageBSnap.data() : {};

        const carsA = Array.isArray(garageAData.cars) ? [...garageAData.cars] : [];
        const carsB = Array.isArray(garageBData.cars) ? [...garageBData.cars] : [];

        // 4. ВАЛИДАЦИЯ МАШИН
        const idxA = carsA.findIndex(c => c && (c.uid === myItemUid || c.id === myItemUid));
        if (idxA === -1) throw new Error("Машина отправителя не найдена в гараже A");

        const carA = carsA[idxA];
        if (carA.isPersonal) throw new Error("Машина отправителя помечена как личная");
        if (carA.impounded) throw new Error("Машина отправителя на штрафстоянке");

        const idxB = carsB.findIndex(c => c && (c.uid === myCarUid || c.id === myCarUid));
        if (idxB === -1) throw new Error("Ваша машина не найдена в гараже");

        const carB = carsB[idxB];
        if (carB.isPersonal) throw new Error("Ваша машина помечена как личная");
        if (carB.impounded) throw new Error("Ваша машина на штрафстоянке");

        // 5. АТОМАРНЫЙ ОБМЕН
        carsA.splice(idxA, 1);
        carsB.splice(idxB, 1);

        carA.ownershipDays = 0;
        carA.isRegisteredOnPlayer = false;
        carA.impounded = false;

        carB.ownershipDays = 0;
        carB.isRegisteredOnPlayer = false;
        carB.impounded = false;

        carsB.push(carA);
        carsA.push(carB);

        // 6. ЗАПИСЬ ГАРАЖЕЙ
        const nowTs = Date.now();

        tx.set(garageARef, {
          ...garageAData,
          telegram_id: String(fromUserId),
          cars: carsA,
          updatedAt: nowTs
        }, { merge: true });

        tx.set(garageBRef, {
          ...garageBData,
          telegram_id: String(toUserId),
          cars: carsB,
          updatedAt: nowTs
        }, { merge: true });

        // 7. ПОМЕЧАЕМ ЛОТ КАК ПРОДАННЫЙ
        tx.update(lotRef, {
          status: "sold",
          swappedAt: nowTs,
          swappedWith: fromUserId
        });

        // 8. ПОМЕЧАЕМ ОФФЕР ПРИНЯТЫМ
        tx.update(offerRef, {
          status: "accepted",
          acceptedAt: nowTs
        });

        result = {
          fromUserId,
          toUserId,
          carA: { uid: myItemUid, name: carA.name || "Авто A" },
          carB: { uid: myCarUid, name: carB.name || "Авто B" },
          fromUserName: offerData.fromUserName || "Игрок"
        };
      });

      // ПОСТ-ОБРАБОТКА
      if (result) {
        // Уведомление отправителю
        try {
          const notifRef = doc(db, "notifications", "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6));
          await setDoc(notifRef, {
            toUser: result.fromUserId,
            type: "trade_accepted",
            title: "✅ Оффер принят!",
            text: `${profile.name} принял обмен: вы отдали «${result.carA.name}» и получили «${result.carB.name}».`,
            offerId: offerId,
            read: false,
            claimed: false,
            timestamp: Date.now(),
            expireAt: Date.now() + TTL_CONFIG.notifications
          });
        } catch (notifErr) {
          console.warn('[P2PTrade] Уведомление не отправлено:', notifErr);
        }

        // EventBus
        if (window.EventBus) {
          window.EventBus.emit('p2p:trade_accepted', {
            offerId,
            fromUserId: result.fromUserId,
            toUserId: result.toUserId,
            swapped: [result.carA, result.carB]
          });
          window.EventBus.emit('p2p:trade_completed', {
            offerId,
            fromUserId: result.fromUserId,
            toUserId: result.toUserId
          });
        }

        // Sync локального стейта игрока B
        try {
          const fresh = await FB_Core.Players.pullSave(profile.id);
          if (fresh && typeof window.applyLoadedState === 'function') {
            window.applyLoadedState(fresh);
            if (typeof window.saveState === 'function') window.saveState();
            if (typeof window.updateHeaderUI === 'function') window.updateHeaderUI();
            if (typeof window.renderGarage === 'function') window.renderGarage();
          }
        } catch (syncErr) {
          console.warn('[P2PTrade] Не удалось синхронизировать локальный стейт:', syncErr);
        }

        devLogFirestore('acceptTradeOffer OK', `${offerId}: ${result.carA.name} ↔ ${result.carB.name}`);
        return { success: true, offer: result };
      }

      return { success: false, error: "Транзакция не дала результата" };

    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      devLogFirestore('acceptTradeOffer ERROR', errMsg);
      return { success: false, error: errMsg };
    }
  },

  /**
   * Отклонить trade offer.
   */
  async rejectTradeOffer(offerId) {
    const profile = getCurrentPlayerProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };

    try {
      const offerRef = doc(db, "trade_offers", offerId);
      let offerData = null;

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(offerRef);
        if (!snap.exists()) throw new Error("Оффер не найден");
        const data = snap.data();
        if (String(data.toUserId) !== String(profile.id)) throw new Error("Этот оффер не вам");
        if (data.status !== "pending") throw new Error("Оффер уже обработан");
        offerData = data;

        tx.update(offerRef, {
          status: "rejected",
          rejectedAt: Date.now()
        });
      });

      // Уведомление — не блокируем
      try {
        const notifRef = doc(db, "notifications", "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6));
        await setDoc(notifRef, {
          toUser: String(offerData.fromUserId),
          type: "trade_rejected",
          title: "❌ Оффер отклонён",
          text: `${profile.name} отказался от вашего предложения.`,
          offerId: offerId,
          read: false,
          claimed: false,
          timestamp: Date.now(),
          expireAt: Date.now() + TTL_CONFIG.notifications
        });
      } catch (notifErr) {
        console.warn('[P2PTrade] notif error:', notifErr);
      }

      devLogFirestore('rejectTradeOffer OK', offerId);
      return { success: true };
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      devLogFirestore('rejectTradeOffer ERROR', errMsg);
      return { success: false, error: errMsg };
    }
  },

  /**
   * Отменить свой trade offer.
   */
  async cancelTradeOffer(offerId) {
    const profile = getCurrentPlayerProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };

    try {
      const offerRef = doc(db, "trade_offers", offerId);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(offerRef);
        if (!snap.exists()) throw new Error("Оффер не найден");
        const data = snap.data();
        if (String(data.fromUserId) !== String(profile.id)) throw new Error("Это не ваш оффер");
        if (data.status !== "pending") throw new Error("Оффер уже обработан");
        tx.update(offerRef, {
          status: "cancelled",
          cancelledAt: Date.now()
        });
      });

      devLogFirestore('cancelTradeOffer OK', offerId);
      return { success: true };
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      devLogFirestore('cancelTradeOffer ERROR', errMsg);
      return { success: false, error: errMsg };
    }
  },

  /**
   * Получить все офферы игрока (входящие + исходящие).
   * ⭐ v1.2.0: single-field where + клиентский фильтр по status.
   */
  async fetchTradeOffers(userId) {
    const targetUid = userId || FB_Core.Auth.getVerifiedUserId();
    if (!targetUid) return { incoming: [], outgoing: [] };

    try {
      const [incomingSnap, outgoingSnap] = await Promise.all([
        getDocs(query(
          collection(db, "trade_offers"),
          where("toUserId", "==", String(targetUid)),
          limit(LIMITS.maxTradeOffersPerUser * 2)
        )),
        getDocs(query(
          collection(db, "trade_offers"),
          where("fromUserId", "==", String(targetUid)),
          limit(LIMITS.maxTradeOffersPerUser * 2)
        ))
      ]);

      const incomingRaw = [];
      const outgoingRaw = [];

      incomingSnap.forEach(d => incomingRaw.push({ id: d.id, ...d.data() }));
      outgoingSnap.forEach(d => outgoingRaw.push({ id: d.id, ...d.data() }));

      // ⭐ Клиентский фильтр по status + сортировка
      const incoming = _filterAndSortDocs(incomingRaw, {
        status: 'pending',
        sortBy: 'createdAt',
        sortDir: 'desc'
      }).slice(0, LIMITS.maxTradeOffersPerUser);

      const outgoing = _filterAndSortDocs(outgoingRaw, {
        status: 'pending',
        sortBy: 'createdAt',
        sortDir: 'desc'
      }).slice(0, LIMITS.maxTradeOffersPerUser);

      return { incoming, outgoing };
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      if (errMsg.includes('permission-denied')) {
        console.warn('[P2PTrade] fetch: permission-denied (проверьте Firestore Rules для trade_offers)');
      } else {
        console.warn('[P2PTrade] fetch error:', errMsg);
      }
      return { incoming: [], outgoing: [] };
    }
  },

  /**
   * Real-time подписка на входящие trade offers.
   * ⭐ v1.2.0: single-field where + клиентский фильтр.
   */
  subscribeToTradeOffers(userId, callback) {
    const targetUid = userId || FB_Core.Auth.getVerifiedUserId();
    if (!targetUid || typeof callback !== 'function') return () => {};

    try {
      const q = query(
        collection(db, "trade_offers"),
        where("toUserId", "==", String(targetUid)),
        limit(LIMITS.maxTradeOffersPerUser * 2)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const raw = [];
        snap.forEach(d => raw.push({ id: d.id, ...d.data() }));

        // ⭐ Клиентский фильтр
        const offers = _filterAndSortDocs(raw, {
          status: 'pending',
          sortBy: 'createdAt',
          sortDir: 'desc'
        }).slice(0, LIMITS.maxTradeOffersPerUser);

        try { callback(offers); } catch (e) { console.warn('[P2PTrade] callback error:', e); }
      }, (error) => {
        const errMsg = error?.code || error?.message || String(error);
        if (errMsg.includes('permission-denied')) {
          console.warn('[P2PTrade] subscribeToTradeOffers: permission-denied');
        } else {
          console.warn('[P2PTrade] subscribe error:', errMsg);
        }
      });

      this._listeners.push(unsubscribe);
      return unsubscribe;
    } catch (e) {
      console.warn('[P2PTrade] subscribe exception:', e);
      return () => {};
    }
  },

  /**
   * Отписаться от всех.
   */
  unsubscribeAll() {
    this._listeners.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this._listeners = [];
  }
};

// ========================================================
// 4. CLUBS MANAGER
// ========================================================
const ClubsManager = {
  _listeners: [],

  /**
   * Получить список клубов.
   * ⭐ v1.2.0: защита от permission-denied + fallback.
   */
  async fetchClubs(force = false) {
    try {
      const q = query(
        collection(db, "clubs"),
        orderBy("bank", "desc"),
        limit(25)
      );
      const snap = await getDocs(q);
      const clubs = [];
      snap.forEach(d => clubs.push({ id: d.id, ...d.data() }));
      return clubs;
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      if (errMsg.includes('permission-denied')) {
        console.warn('[Clubs] fetch: permission-denied');
      } else {
        console.warn('[Clubs] fetch error:', errMsg);
      }
      return [];
    }
  },

  /**
   * Real-time подписка на клубы.
   */
  subscribeToClubs(callback) {
    if (typeof callback !== 'function') return () => {};
    try {
      const q = query(
        collection(db, "clubs"),
        orderBy("bank", "desc"),
        limit(25)
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        const clubs = [];
        snap.forEach(d => clubs.push({ id: d.id, ...d.data() }));
        try { callback(clubs); } catch (e) {}
      }, (error) => {
        const errMsg = error?.code || error?.message || String(error);
        if (errMsg.includes('permission-denied')) {
          console.warn('[Clubs] subscribe: permission-denied');
        } else {
          console.warn('[Clubs] subscribe error:', errMsg);
        }
      });
      this._listeners.push(unsubscribe);
      return unsubscribe;
    } catch (e) { return () => {}; }
  },

  /**
   * Создать новый клуб.
   */
  async createClub(clubName, userProfile, fee = 100000) {
    const profile = userProfile || getCurrentPlayerProfile();
    if (!clubName || !profile?.id) return { success: false };

    try {
      const clubId = "club_" + Date.now();
      const clubData = {
        club_id: clubId,
        id: clubId,
        name: clubName.trim(),
        ownerId: String(profile.id),
        leaderName: profile.name || "Олигарх",
        membersCount: 1,
        bank: 0,
        fee: Math.max(10000, fee),
        perk: "+10% к оценке авто клуба",
        createdAt: Date.now()
      };
      await setDoc(doc(db, "clubs", clubId), clubData);
      return { success: true, club: clubData };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Вступить в клуб.
   */
  async joinClub(clubId, userProfile) {
    const profile = userProfile || getCurrentPlayerProfile();
    if (!clubId || !profile?.id) return false;

    try {
      const clubRef = doc(db, "clubs", String(clubId));
      await runTransaction(db, async (tx) => {
        const cSnap = await tx.get(clubRef);
        if (!cSnap.exists()) throw new Error("Клуб не найден!");
        const cur = cSnap.data();
        tx.update(clubRef, {
          membersCount: (cur.membersCount || 1) + 1
        });
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Внести вклад в клубный банк.
   */
  async depositToClubBank(clubId, amount) {
    if (!clubId || amount <= 0) return false;

    try {
      const clubRef = doc(db, "clubs", String(clubId));
      await runTransaction(db, async (tx) => {
        const cSnap = await tx.get(clubRef);
        if (!cSnap.exists()) throw new Error();
        const cur = cSnap.data();
        tx.update(clubRef, {
          bank: (cur.bank || 0) + amount
        });
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  unsubscribeAll() {
    this._listeners.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this._listeners = [];
  }
};

// ========================================================
// 5. LEADERBOARD MANAGER
// ========================================================
let lastLeaderboardUpdate = 0;

const LeaderboardManager = {
  _listeners: [],

  /**
   * Обновить ранг игрока (не чаще 1 раза в 90 секунд).
   */
  async updateRank(userId, playerName, profit, level) {
    const targetUid = userId || FB_Core.Auth.getVerifiedUserId();
    if (!targetUid || profit <= 0) return;

    const now = Date.now();
    if (now - lastLeaderboardUpdate < 90000) return;

    try {
      await setDoc(doc(db, "leaderboard", String(targetUid)), {
        telegram_id: String(targetUid),
        name: playerName || "Перекуп",
        profit: Math.round(profit),
        level: level || 1,
        lastUpdate: now
      }, { merge: true });
      lastLeaderboardUpdate = now;
    } catch (e) {}
  },

  /**
   * Получить топ игроков.
   */
  async fetchTop(force = false) {
    try {
      const q = query(
        collection(db, "leaderboard"),
        orderBy("profit", "desc"),
        limit(30)
      );
      const snap = await getDocs(q);
      const leaders = [];
      snap.forEach(d => leaders.push({ id: d.id, ...d.data() }));
      return leaders;
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      if (errMsg.includes('permission-denied')) {
        console.warn('[Leaderboard] fetch: permission-denied');
      } else {
        console.warn('[Leaderboard] fetch error:', errMsg);
      }
      return [];
    }
  },

  /**
   * Real-time подписка на топ.
   */
  subscribeToTop(callback) {
    if (typeof callback !== 'function') return () => {};
    try {
      const q = query(
        collection(db, "leaderboard"),
        orderBy("profit", "desc"),
        limit(30)
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        const leaders = [];
        snap.forEach(d => leaders.push({ id: d.id, ...d.data() }));
        try { callback(leaders); } catch (e) {}
      }, (error) => {
        const errMsg = error?.code || error?.message || String(error);
        if (errMsg.includes('permission-denied')) {
          console.warn('[Leaderboard] subscribe: permission-denied');
        } else {
          console.warn('[Leaderboard] subscribe error:', errMsg);
        }
      });
      this._listeners.push(unsubscribe);
      return unsubscribe;
    } catch (e) { return () => {}; }
  },

  unsubscribeAll() {
    this._listeners.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this._listeners = [];
  }
};

// ========================================================
// 6. CARS CATALOG MANAGER
// ========================================================
const CarsCatalogManager = {
  /**
   * Загрузить дефолтный каталог машин в Firestore (для админа).
   */
  async seedDefaultCarsCatalog(force = false) {
    const isSeeded = localStorage.getItem("perekup_db_seeded_v2");
    if (isSeeded && !force) return { success: true };

    if (typeof window.CAR_DATABASE === "undefined") {
      return { success: false, error: "CAR_DATABASE не загружен" };
    }

    try {
      let count = 0;
      const batches = [];
      let currentBatch = writeBatch(db);
      let batchCount = 0;

      for (const [category, carsList] of Object.entries(window.CAR_DATABASE)) {
        if (!Array.isArray(carsList)) continue;
        for (const car of carsList) {
          if (!car || !car.name) continue;

          const carDocId = "car_" + car.name.toLowerCase().replace(/[^a-z0-9а-я]/gi, "_");

          currentBatch.set(doc(db, "cars_catalog", carDocId), {
            id: carDocId,
            name: car.name,
            power: Number(car.power) || 100,
            basePrice: Number(car.basePrice) || 100000,
            drivetrain: car.drivetrain || "rwd",
            type: car.type || category,
            img: car.img || "",
            images: Array.isArray(car.images) && car.images.length > 0 ? car.images : [car.img || ""],
            fallback: car.fallback || "",
            authorId: "system",
            authorName: "Perekup Base",
            isActive: true,
            createdAt: Date.now()
          }, { merge: true });

          count++;
          batchCount++;

          if (batchCount >= 450) {
            batches.push(currentBatch);
            currentBatch = writeBatch(db);
            batchCount = 0;
          }
        }
      }

      if (batchCount > 0) batches.push(currentBatch);

      for (const b of batches) {
        await b.commit();
      }

      localStorage.setItem("perekup_db_seeded_v2", "true");
      devLogFirestore('seedCarsCatalog OK', `${count} моделей в ${batches.length} batch`);
      return { success: true, count };
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      devLogFirestore('seedCarsCatalog ERROR', errMsg);
      return { success: false, error: errMsg };
    }
  },

  /**
   * Загрузить каталог машин из облака (заменяет CAR_DATABASE).
   */
  async fetchCloudCars(force = false) {
    try {
      const q = query(
        collection(db, "cars_catalog"),
        orderBy("basePrice", "asc"),
        limit(250)
      );
      const snap = await getDocs(q);
      const cars = [];
      snap.forEach(d => {
        const item = d.data();
        if (item.isActive !== false) cars.push(item);
      });

      if (cars.length > 0) {
        const updatedDatabase = {
          economy: [], scooter: [], moto: [], atv: [], comfort: [],
          premium: [], hyper: [], truck: [], yacht: []
        };

        cars.forEach(c => {
          const cat = c.type || "economy";
          if (!updatedDatabase[cat]) updatedDatabase[cat] = [];
          updatedDatabase[cat].push(c);
        });

        window.CAR_DATABASE = updatedDatabase;
      }

      return cars;
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      if (errMsg.includes('permission-denied')) {
        console.warn('[CarsCatalog] fetch: permission-denied');
      } else {
        console.warn('[CarsCatalog] fetch error:', errMsg);
      }
      return [];
    }
  },

  /**
   * Сохранить машину в облако (для DEV-студии).
   */
  async saveCarToCloud(carData, authorProfile) {
    const profile = authorProfile || getCurrentPlayerProfile();
    if (!carData || !carData.name || !profile?.id) {
      return { success: false, error: "Нет данных" };
    }

    try {
      const slug = carData.name.toLowerCase().replace(/[^a-z0-9а-я]/gi, "_");
      const carDocId = carData.id || ("car_" + slug);

      const payload = {
        id: carDocId,
        name: carData.name.trim(),
        power: Number(carData.power) || 100,
        basePrice: Number(carData.basePrice) || 100000,
        drivetrain: carData.drivetrain || "rwd",
        type: carData.type || "economy",
        img: carData.img || "",
        images: Array.isArray(carData.images) && carData.images.length > 0 ? carData.images : [carData.img || ""],
        fallback: carData.fallback || "",
        authorId: String(profile?.id || "unknown"),
        authorName: profile?.name || "Перекуп",
        isActive: true,
        updatedAt: Date.now()
      };

      await setDoc(doc(db, "cars_catalog", carDocId), payload, { merge: true });
      return { success: true, car: payload };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};

// ========================================================
// 7. QUICK CHAT (фасад для чатов M+)
// ========================================================
const QuickChat = {
  getPhrasesList: (cat) => {
    const phrases = FB_Notifications?.CANNED_PHRASES || {};
    return Object.values(phrases).filter(p => !cat || p.category === cat);
  },

  makeDialogId: (a, b, c) => `dlg_${[String(a), String(b)].sort().join("_")}_${c}`,

  sendPhrase: async (dId, pId, pr) => {
    const phrases = FB_Notifications?.CANNED_PHRASES || {};
    const phr = phrases[pId];
    if (!phr) return false;

    const chatMgr = FB_Notifications?.ChatMessages;
    if (!chatMgr) return false;

    const res = await chatMgr.sendMessage({
      dialogId: dId,
      text: phr.text,
      senderProfile: pr
    });
    return res.success;
  },

  fetchDialogMessages: (dId) => {
    const chatMgr = FB_Notifications?.ChatMessages;
    if (!chatMgr) return Promise.resolve([]);
    return chatMgr.fetchMessagesForDialog(dId);
  },

  subscribeToDialog: (dId, cb) => {
    const chatMgr = FB_Notifications?.ChatMessages;
    if (!chatMgr) return () => {};
    return chatMgr.subscribeToDialog(dId, cb);
  }
};

// ========================================================
// 8. СБОРКА ЕДИНОГО window.FB_Bridge
// ========================================================
const FB_Bridge = {
  db: FB_Core.db,
  auth: FB_Core.auth,
  enabled: true,

  Auth: FB_Core.Auth,
  getProfile: getCurrentPlayerProfile,
  getTelegramUser: FB_Core.getTelegramUser,

  Players: FB_Core.Players,
  CloudSave: {
    pushSave: FB_Core.Players.pushSave,
    pushSaveForce: FB_Core.Players.pushSaveForce,
    pullSave: FB_Core.Players.pullSave
  },

  MarketLots: FB_Market.MarketLots,
  P2P: FB_Market.MarketLots,
  Transactions: FB_Market.Transactions,
  Plates: FB_Market.Plates,

  Offers: window.P2POffersManager,

  Friendships: FB_Friendships.Friendships,

  Notifications: FB_Notifications.Notifications,
  ChatMessages: FB_Notifications.ChatMessages,
  Events: FB_Notifications.Events,

  P2PTrade: P2PTradeManager,
  Clubs: ClubsManager,
  Leaderboard: LeaderboardManager,
  CarsCatalog: CarsCatalogManager,

  Cleanup: FB_Core.Cleanup,
  getStats: FB_Core.getStats,

  QuickChat
};

// ========================================================
// 9. ЭКСПОРТ В WINDOW
// ========================================================
window.FB_P2P = {
  P2PTrade: P2PTradeManager,
  Clubs: ClubsManager,
  Leaderboard: LeaderboardManager,
  CarsCatalog: CarsCatalogManager,
  QuickChat
};

window.FB_Bridge = FB_Bridge;

console.log('[🤝 FB_P2P v1.2.0] Без составных индексов в trade_offers + атомарный обмен + graceful degrade ✓');
console.log('[🌟 FB_Bridge v2.2.0] Единый шлюз восстановлен. Offers → P2POffersManager ✓');

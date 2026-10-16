// ========================================================
// js/firebase-market.js — P2P БИРЖА + REGISTERED PLATES (v1.2.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.2.0 (SPRINT 3 — ФИКСЫ БЕЗ СОСТАВНЫХ ИНДЕКСОВ):
//   - ФИКС: publishLot больше не использует 3-way where
//     (sellerId + status + name) — теперь только where(sellerId),
//     фильтр по status/name — НА КЛИЕНТЕ. Больше не требует
//     составного индекса.
//   - ФИКС: fetchLots убран orderBy('timestamp') — сортировка
//     на клиенте. Не требует индекса.
//   - ФИКС: subscribeToLots аналогично без orderBy.
//   - ФИКС: buyLotAtomic теперь принимает 5-й параметр offerId
//     и в той же транзакции помечает связанный оффер как completed.
//   - ФИКС: cancelLot помечает все активные офферы по lotId
//     как cancelled (без индексов, через клиентскую фильтрацию).
//   - ФИКС: publishLot смягчена блокировка guest_-UID (только
//     явно guest_777 и dev_ блокируются, p_ пропускаем).
// ⭐ v1.1.0 (SPRINT 2 — OVERRIDE PRICE):
//   - buyLotAtomic принимает 4-й параметр overridePrice
//   - Все расчёты (комиссия, payout) идут от finalPrice
//   - Защита от overridePrice ниже 10% и выше 200% от lot.price
// ⭐ v1.0.0 (ВЫДЕЛЕНО ИЗ firebase-bridge.js):
//   - MARKET_FEE_PERCENT (3% комиссия биржи)
//   - MarketLotsManager (publishLot, fetchLots, subscribeToLots,
//     buyLotAtomic, cancelLot)
//   - RegisteredPlatesManager (claimPlateAtomic, releasePlate,
//     isPlateAvailable, cleanPlateString)
//   - TransactionsManager (алиас)
//   - getCurrentPlayerProfile()
//   - Экспорт в window.FB_Market
//
// ВАЖНО: файл — ES-модуль (import), подключается через
//   <script type="module" src="firebase-market.js?v=421"></script>
// Должен быть загружен ПОСЛЕ firebase-core.js.
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
// 1. ИМПОРТ ЯДРА (db, auth, хелперы)
// ========================================================
const FB_Core = window.FB_Core;
if (!FB_Core) {
  console.error('[☁️ FB_Market] Критическая ошибка: firebase-core.js не загружен!');
  throw new Error('firebase-core.js must be loaded before firebase-market.js');
}

const db = FB_Core.db;
const devLogFirestore = FB_Core.devLogFirestore;
const TTL_CONFIG = FB_Core.TTL_CONFIG;
const LIMITS = FB_Core.LIMITS;

// ========================================================
// 2. КОНСТАНТЫ
// ========================================================
const MARKET_FEE_PERCENT = 0.03; // 3% комиссия биржи

// ⭐ v1.1.0: границы допустимого overridePrice
const OVERRIDE_PRICE_MIN_RATIO = 0.10; // не ниже 10% от lot.price
const OVERRIDE_PRICE_MAX_RATIO = 2.00; // не выше 200% от lot.price

// ========================================================
// 3. ХЕЛПЕР: получить текущий профиль игрока
// ========================================================
function getCurrentPlayerProfile() {
  // 1. Из Auth-менеджера
  const authProfile = FB_Core.Auth?.getUserProfile?.();
  if (authProfile && authProfile.id) return authProfile;

  // 2. Fallback на Telegram
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

  // 3. Fallback на state
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
// 4. REGISTERED PLATES MANAGER
// (атомарная регистрация номеров в Firestore)
// ========================================================
const RegisteredPlatesManager = {
  /**
   * Нормализация номера.
   */
  cleanPlateString(plateStr) {
    if (!plateStr) return "";
    return String(plateStr).toUpperCase().replace(/\s+/g, " ").trim();
  },

  /**
   * Атомарная регистрация номера за игроком.
   * @param {string} plateStr — 'А777АА 77'
   * @param {string} ownerId — UID игрока
   * @param {string|null} carId — UID машины (опционально)
   */
  async claimPlateAtomic(plateStr, ownerId, carId = null) {
    const cleanPlate = this.cleanPlateString(plateStr);
    if (!cleanPlate || cleanPlate.includes("ТРАНЗИТ")) {
      return { success: true, plate: cleanPlate, transit: true };
    }
    const docId = cleanPlate.replace(/\s+/g, "_");
    const plateRef = doc(db, "registered_plates", docId);
    const targetUid = ownerId || FB_Core.Auth.getVerifiedUserId();
    if (!targetUid) return { success: false, error: "Нет владельца" };

    try {
      const result = await runTransaction(db, async (tx) => {
        const plateSnap = await tx.get(plateRef);
        if (plateSnap.exists()) {
          const data = plateSnap.data();
          if (data.ownerId && String(data.ownerId) !== String(targetUid) && data.status === "owned") {
            throw new Error(`Госномер «${cleanPlate}» уже зарегистрирован!`);
          }
        }
        const payload = {
          plate: cleanPlate,
          ownerId: String(targetUid),
          carId: carId ? String(carId) : null,
          status: "owned",
          updatedAt: Date.now()
        };
        tx.set(plateRef, payload, { merge: true });
        return payload;
      });
      return { success: true, plate: result.plate };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Освободить номер (снять с игрока).
   * @param {string} plateStr
   * @param {string} ownerId
   * @param {boolean} archive — в архив или в storage
   */
  async releasePlate(plateStr, ownerId, archive = false) {
    const cleanPlate = this.cleanPlateString(plateStr);
    if (!cleanPlate || cleanPlate.includes("ТРАНЗИТ")) return true;
    const docId = cleanPlate.replace(/\s+/g, "_");
    const plateRef = doc(db, "registered_plates", docId);
    const targetUid = ownerId || FB_Core.Auth.getVerifiedUserId();
    if (!targetUid) return false;
    try {
      await runTransaction(db, async (tx) => {
        const plateSnap = await tx.get(plateRef);
        if (!plateSnap.exists()) return;
        const data = plateSnap.data();
        if (data.ownerId && String(data.ownerId) !== String(targetUid)) {
          throw new Error("Вы не владелец номера!");
        }
        tx.update(plateRef, {
          ownerId: archive ? null : String(targetUid),
          carId: null,
          status: archive ? "archived" : "storage",
          updatedAt: Date.now()
        });
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Проверить, свободен ли номер.
   */
  async isPlateAvailable(plateStr) {
    const cleanPlate = this.cleanPlateString(plateStr);
    if (!cleanPlate || cleanPlate.includes("ТРАНЗИТ")) return true;
    const docId = cleanPlate.replace(/\s+/g, "_");
    try {
      const snap = await getDoc(doc(db, "registered_plates", docId));
      if (!snap.exists()) return true;
      return snap.data().status !== "owned";
    } catch (e) {
      return true;
    }
  }
};

// ========================================================
// 5. MARKET LOTS MANAGER
// ========================================================
const MarketLotsManager = {
  _listeners: [],

  /**
   * Публикация лота с защитой от дубликатов.
   * ⭐ v1.2.0: проверка дубликата через клиентскую фильтрацию
   * (без составного индекса Firestore).
   * @param {Object} lotData — { type, name, price, itemData }
   * @param {Object} sellerProfile — { id, name }
   */
  async publishLot(lotData, sellerProfile) {
    const profile = sellerProfile || getCurrentPlayerProfile();
    if (!lotData || !profile?.id) return { success: false, error: "Нет данных" };

    const uidStr = String(profile.id);
    if (uidStr === 'guest_777' || uidStr.startsWith('dev_')) {
      return { success: false, error: "P2P доступен только через Telegram" };
    }

    try {
      const lotId = "lot_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const rawPrice = Math.max(1000, parseInt(lotData.price) || 50000);

      if (lotData.itemData && (lotData.type === 'car' || lotData.type === 'cars')) {
        if (typeof window.ensureCarIdentity === 'function') {
          const res = window.ensureCarIdentity(lotData.itemData);
          if (res) lotData.itemData = res;
        }
      }

      // ⭐ v1.2.0: проверка дубликата — single-field where + клиентский фильтр
      // (раньше было 3 where, требовался составной индекс)
      try {
        const dupCheckQuery = query(
          collection(db, "market_lots"),
          where("sellerId", "==", uidStr),
          limit(50)
        );
        const dupSnap = await getDocs(dupCheckQuery);
        const targetName = String(lotData.name || '');
        const hasDup = dupSnap.docs.some(d => {
          const data = d.data();
          return data && data.status === 'active' && String(data.name || '') === targetName;
        });
        if (hasDup) {
          return { success: false, error: "У вас уже есть активный лот с таким же названием" };
        }
      } catch (dupErr) {
        // Не блокируем публикацию, если проверка упала
        console.warn('[MarketLots] Дубликат-чек упал:', dupErr);
      }

      const payload = {
        lot_id: lotId,
        id: lotId,
        sellerId: uidStr,
        sellerName: profile.name || "Перекуп",
        sellerAvatar: profile.avatar || profile.photoUrl || '🧔',
        type: lotData.type,
        name: lotData.name,
        price: rawPrice,
        itemData: lotData.itemData || {},
        status: "active",
        timestamp: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.market_lots
      };

      // Если лот — номер, регистрируем его на продавца
      if (lotData.type === "plate" || lotData.type === "plates") {
        const plateStr = lotData.itemData?.plate || lotData.name;
        const clean = RegisteredPlatesManager.cleanPlateString(plateStr);
        if (clean) {
          const pDocId = clean.replace(/\s+/g, "_");
          await setDoc(doc(db, "registered_plates", pDocId), {
            plate: clean,
            ownerId: uidStr,
            status: "on_sale",
            updatedAt: Date.now()
          }, { merge: true });
        }
      }

      await setDoc(doc(db, "market_lots", lotId), payload);

      devLogFirestore('publishLot OK', lotId);
      return { success: true, lotId };
    } catch (e) {
      devLogFirestore('publishLot ERROR', e.message || String(e));
      return { success: false, error: e.message };
    }
  },

  /**
   * Получить активные лоты.
   * ⭐ v1.2.0: single-field where + клиентская сортировка
   * (раньше был orderBy + where, требовался индекс).
   */
  async fetchLots(force = false) {
    try {
      const now = Date.now();
      const q = query(
        collection(db, "market_lots"),
        where("status", "==", "active"),
        limit(LIMITS.maxLotsPerFetch)
      );
      const snap = await getDocs(q);
      const lots = [];
      snap.forEach(d => {
        const item = d.data();
        if (!item) return;
        if (item.expireAt && item.expireAt < now) return;
        lots.push(item);
      });

      // ⭐ Клиентская сортировка по timestamp (свежие сверху)
      lots.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      devLogFirestore('fetchLots OK', `${lots.length} лотов`);
      return lots;
    } catch (e) {
      devLogFirestore('fetchLots ERROR', e.message || String(e));
      return [];
    }
  },

  /**
   * Real-time подписка на активные лоты.
   * ⭐ v1.2.0: без orderBy (индекс не нужен), сортировка на клиенте.
   */
  subscribeToLots(callback) {
    if (typeof callback !== 'function') return () => {};
    try {
      const q = query(
        collection(db, "market_lots"),
        where("status", "==", "active"),
        limit(LIMITS.maxLotsPerFetch)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const now = Date.now();
        const lots = [];
        snap.forEach(d => {
          const item = d.data();
          if (!item) return;
          if (item.expireAt && item.expireAt < now) return;
          lots.push(item);
        });

        // ⭐ Клиентская сортировка
        lots.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        try { callback(lots); } catch (e) { console.warn('[MarketLots] callback error:', e); }
      }, (error) => {
        console.warn('[MarketLots] subscribeToLots error:', error);
      });

      this._listeners.push(unsubscribe);
      return unsubscribe;
    } catch (e) {
      console.warn('[MarketLots] subscribeToLots exception:', e);
      return () => {};
    }
  },

  /**
   * ⭐ v1.1.0 / v1.2.0: Атомарная покупка лота через транзакцию.
   *
   * @param {string} lotId — ID лота
   * @param {Object} buyerProfile — профиль покупателя
   * @param {number} buyerCash — баланс покупателя
   * @param {number|null} overridePrice — сторгованная цена (если null — используется lot.price)
   * @param {string|null} offerId — ⭐ НОВОЕ в v1.2.0: ID оффера в p2p_offers,
   *                               который будет помечен как completed в той же транзакции
   * @returns {Promise<{success, lot, finalPrice?, error}>}
   */
  async buyLotAtomic(lotId, buyerProfile, buyerCash, overridePrice = null, offerId = null) {
    const profile = buyerProfile || getCurrentPlayerProfile();
    if (!lotId || !profile?.id) return { success: false, error: "Неверные данные" };

    const lotRef = doc(db, "market_lots", String(lotId));
    const txId = "tx_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const txRef = doc(db, "transactions", txId);
    const notifRef = doc(db, "notifications", "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6));

    // ⭐ v1.2.0: ссылка на оффер (если передан) — обновим в той же транзакции
    let offerRef = null;
    if (offerId) {
      offerRef = doc(db, "p2p_offers", String(offerId));
    }

    try {
      const transactionResult = await runTransaction(db, async (tx) => {
        const lotSnap = await tx.get(lotRef);
        if (!lotSnap.exists()) throw new Error("Лот снят с продажи!");

        const lot = lotSnap.data();
        if (lot.status !== "active") throw new Error("Лот уже куплен!");
        if (String(lot.sellerId) === String(profile.id)) throw new Error("Нельзя купить свой лот!");

        // ⭐ v1.1.0: определяем финальную цену с учётом overridePrice
        let finalPrice = Number(lot.price) || 0;

        if (overridePrice !== null && overridePrice !== undefined) {
          const ovr = Number(overridePrice);
          if (isNaN(ovr) || ovr < 1000) {
            throw new Error("Некорректная сторгованная цена");
          }

          // Защита от подделки цены:
          const minAllowed = Math.round((Number(lot.price) || 0) * OVERRIDE_PRICE_MIN_RATIO);
          const maxAllowed = Math.round((Number(lot.price) || 0) * OVERRIDE_PRICE_MAX_RATIO);

          if (ovr < minAllowed || ovr > maxAllowed) {
            devLogFirestore(
              'buyLotAtomic overridePrice отклонён',
              `override=${ovr}, lotPrice=${lot.price}, min=${minAllowed}, max=${maxAllowed}`
            );
            finalPrice = Number(lot.price) || 0;
          } else {
            finalPrice = ovr;
          }
        }

        // Проверка баланса покупателя
        if (Number(buyerCash) < finalPrice) {
          throw new Error("Недостаточно денег!");
        }

        const marketFee = Math.round(finalPrice * MARKET_FEE_PERCENT);
        const sellerPayout = finalPrice - marketFee;

        // 1. Помечаем лот проданным
        tx.update(lotRef, {
          status: "sold",
          buyerId: String(profile.id),
          buyerName: profile.name || "Покупатель",
          soldAt: Date.now(),
          finalPrice: finalPrice,
          originalPrice: Number(lot.price) || 0
        });

        // 2. Создаём транзакцию (аудит)
        tx.set(txRef, {
          tx_id: txId,
          lot_id: String(lotId),
          buyerId: String(profile.id),
          buyerName: profile.name || "Покупатель",
          sellerId: String(lot.sellerId),
          sellerName: lot.sellerName || "Продавец",
          item: lot.name,
          type: lot.type,
          price: finalPrice,
          originalPrice: Number(lot.price) || 0,
          wasNegotiated: overridePrice !== null && overridePrice !== undefined && finalPrice !== Number(lot.price),
          fee: marketFee,
          payout: sellerPayout,
          offerId: offerId || null,
          timestamp: Date.now(),
          expireAt: Date.now() + TTL_CONFIG.transactions
        });

        // 3. Уведомление продавцу (в его Почту)
        const isNegotiated = overridePrice !== null && overridePrice !== undefined && finalPrice !== Number(lot.price);
        const notifText = isNegotiated
          ? `Покупатель ${profile.name} приобрёл «${lot.name}» после торга за ${finalPrice.toLocaleString()} ₽ (начислено: +${sellerPayout.toLocaleString()} ₽).`
          : `Покупатель ${profile.name} приобрёл «${lot.name}» за ${finalPrice.toLocaleString()} ₽ (начислено: +${sellerPayout.toLocaleString()} ₽).`;

        tx.set(notifRef, {
          toUser: String(lot.sellerId),
          type: "deal_payout",
          title: isNegotiated ? "Продажа после торга на P2P!" : "Продажа на P2P бирже!",
          text: notifText,
          amount: sellerPayout,
          offerId: String(lotId),
          read: false,
          claimed: false,
          timestamp: Date.now(),
          expireAt: Date.now() + TTL_CONFIG.notifications
        });

        // 4. Если лот — номер, передаём права покупателю
        if (lot.type === "plate" || lot.type === "plates") {
          const plateStr = lot.itemData?.plate || lot.name;
          const clean = RegisteredPlatesManager.cleanPlateString(plateStr);
          if (clean) {
            const pDocId = clean.replace(/\s+/g, "_");
            tx.set(doc(db, "registered_plates", pDocId), {
              plate: clean,
              ownerId: String(profile.id),
              carId: null,
              status: "owned",
              updatedAt: Date.now()
            }, { merge: true });
          }
        }

        // ⭐ v1.2.0: помечаем связанный оффер как completed в той же транзакции
        if (offerRef) {
          const offerSnap = await tx.get(offerRef);
          if (offerSnap.exists()) {
            tx.update(offerRef, {
              status: "completed",
              completedAt: Date.now(),
              finalPrice: finalPrice
            });
          }
        }

        return { ...lot, _finalPrice: finalPrice };
      });

      devLogFirestore('buyLotAtomic OK', `${lotId} → ${transactionResult._finalPrice}`);

      return {
        success: true,
        lot: transactionResult,
        finalPrice: transactionResult._finalPrice || Number(transactionResult.price) || 0
      };
    } catch (e) {
      devLogFirestore('buyLotAtomic ERROR', e.message);
      return { success: false, error: e.message };
    }
  },

  /**
   * Атомарная отмена лота.
   * ⭐ v1.2.0: помечает связанные офферы как cancelled
   * (без составных индексов, через клиентскую фильтрацию).
   */
  async cancelLot(lotId, sellerId) {
    const targetUid = sellerId || FB_Core.Auth.getVerifiedUserId();
    if (!targetUid) return false;
    try {
      const lotRef = doc(db, "market_lots", String(lotId));
      let cancelled = false;
      let lotData = null;

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(lotRef);
        if (!snap.exists()) throw new Error("Лот не найден");
        const lot = snap.data();
        if (String(lot.sellerId) !== String(targetUid)) throw new Error("Не ваш лот");
        lotData = lot;
        tx.delete(lotRef);
        cancelled = true;
      });

      if (cancelled && lotData) {
        // Если лот — номер, возвращаем в storage
        if (lotData.type === "plate" || lotData.type === "plates") {
          const plateStr = lotData.itemData?.plate || lotData.name;
          await RegisteredPlatesManager.releasePlate(plateStr, targetUid, false);
        }

        // ⭐ v1.2.0: пометить связанные офферы как cancelled
        try {
          const now = Date.now();
          const offersQ = query(
            collection(db, "p2p_offers"),
            where("lotId", "==", String(lotId)),
            limit(50)
          );
          const offersSnap = await getDocs(offersQ);
          const batch = writeBatch(db);
          let cancelledOffers = 0;
          offersSnap.forEach(d => {
            const data = d.data();
            if (!data) return;
            if (data.status === 'pending' || data.status === 'countered') {
              batch.update(d.ref, {
                status: 'cancelled',
                cancelledReason: 'lot_cancelled_by_seller',
                respondedAt: now
              });
              cancelledOffers++;
            }
          });
          if (cancelledOffers > 0) {
            await batch.commit();
            devLogFirestore('cancelLot offers cancelled', `${cancelledOffers} офферов`);
          }
        } catch (offErr) {
          console.warn('[MarketLots] cancelLot: не удалось отменить офферы:', offErr);
        }

        devLogFirestore('cancelLot OK', lotId);
        return true;
      }
      return false;
    } catch (e) {
      devLogFirestore('cancelLot ERROR', e.message);
      return false;
    }
  },

  /**
   * Отписаться от всех подписок (для cleanup при выходе).
   */
  unsubscribeAll() {
    this._listeners.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this._listeners = [];
  }
};

// ========================================================
// 6. TRANSACTIONS MANAGER (алиас)
// ========================================================
const TransactionsManager = {
  buyLot: (lotId, buyerProfile, buyerCash, overridePrice = null, offerId = null) =>
    MarketLotsManager.buyLotAtomic(lotId, buyerProfile, buyerCash, overridePrice, offerId)
};

// ========================================================
// 7. ЭКСПОРТ В WINDOW
// ========================================================
window.FB_Market = {
  MARKET_FEE_PERCENT,
  OVERRIDE_PRICE_MIN_RATIO,
  OVERRIDE_PRICE_MAX_RATIO,
  MarketLots: MarketLotsManager,
  Plates: RegisteredPlatesManager,
  Transactions: TransactionsManager,
  getCurrentPlayerProfile
};

// Алиасы для совместимости со старым кодом
window.FB_MarketLots = MarketLotsManager;
window.FB_RegisteredPlates = RegisteredPlatesManager;

console.log('[💱 FB_Market v1.2.0] P2P биржа: без составных индексов + offerId в buyLotAtomic + cancelLot чистит офферы ✓');

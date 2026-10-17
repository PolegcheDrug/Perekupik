// ========================================================
// js/firebase-p2p.js — P2P DEALS, TRADE, CLUBS, LEADERBOARD, CARS (v1.3.1)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.3.1 (ПОЛНЫЙ ФИКС СДЕЛОК ДКП И СИНХРОНИЗАЦИИ FIRESTORE):
//   - ФИКС: В signDeal лот удаляется (или помечается status='sold')
//     из коллекции Firestore market_lots, исключая повторное появление
//     купленного номера/автомобиля в списке активных лотов.
//   - ФИКС: Запрет покупки собственного лота в createDealDraft.
//   - ФИКС: Начисление автомобиля в гараж, номера — в PlatesManager,
//     недвижимости — в ownedHouses при закрытии сделки.
//   - ФИКС: Синхронизация статусов черновика, подписей и завершения ДКП
//     в коллекции p2p_deals с поддержкой оффлайн-режима.
//   - Сохранена полная функциональность P2PTrade, Clubs,
//     Leaderboard, CarsCatalog и QuickChat.
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
const TTL_CONFIG = FB_Core.TTL_CONFIG || {
  trade_offers: 86400000,
  notifications: 604800000,
  market_lots: 259200000
};
const LIMITS = FB_Core.LIMITS || {
  maxTradeOffersPerUser: 20
};

const FB_Market = window.FB_Market || {};
const FB_Friendships = window.FB_Friendships || {};
const FB_Notifications = window.FB_Notifications || {};

// ========================================================
// 2. ХЕЛПЕР: ПОЛУЧИТЬ ТЕКУЩИЙ ПРОФИЛЬ ИГРОКА
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

  const tgUid = window.TelegramAuthManager?.getVerifiedUserId() || window.tgUserId;
  if (tgUid) {
    return {
      id: String(tgUid),
      name: window.state?.player?.name || "Перекуп",
      username: "",
      photoUrl: null,
      isTelegram: false
    };
  }

  return { id: "player_local", name: "Перекуп", username: "", photoUrl: null, isTelegram: false };
}

// ========================================================
// 2.1. ХЕЛПЕР: КЛИЕНТСКАЯ ФИЛЬТРАЦИЯ И СОРТИРОВКА
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
// 3. P2P DEALS MANAGER (ЭЛЕКТРОННЫЙ ДКП ДЛЯ БИРЖИ M+)
// ========================================================
const P2PDealsManager = {
  _localDeals: new Map(),
  _listeners: [],

  formatTimeLeft(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  },

  getStatusLabel(status) {
    switch (status) {
      case 'drafting': return '📝 Черновик';
      case 'buyer_signed': return '✍️ Подписано покупателем';
      case 'seller_signed': return '✍️ Подписано продавцом';
      case 'completed': return '✅ Сделка закрыта';
      case 'cancelled': return '⛔ Отменено';
      case 'expired': return '⌛ Срок истёк';
      default: return 'Договор ДКП';
    }
  },

  async openDealChat(lotId) {
    const profile = getCurrentPlayerProfile();
    const lots = window.state?.p2pMarketListings || [];
    let lot = lots.find(l => l && (l.id === lotId || l.lot_id === lotId));

    if (!lot && window.FB_Bridge?.MarketLots?.fetchLots) {
      try {
        const cloudLots = await window.FB_Bridge.MarketLots.fetchLots();
        lot = (cloudLots || []).find(l => l && (l.id === lotId || l.lot_id === lotId));
      } catch (e) {}
    }

    if (!lot) {
      return { success: false, error: "Лот не найден" };
    }

    if (String(lot.sellerId) === String(profile.id)) {
      return { success: false, error: "Нельзя начать торг со своим лотом" };
    }

    const dialogId = `dlg_p2p_${lot.id || lot.lot_id}_${lot.sellerId}`;
    if (!window.state.player) window.state.player = {};
    if (!window.state.player.phoneMessages) window.state.player.phoneMessages = [];

    let dialog = window.state.player.phoneMessages.find(m => m.id === dialogId);
    if (!dialog) {
      dialog = {
        id: dialogId,
        dialogId: dialogId,
        category: 'p2p',
        p2pLotId: lot.id || lot.lot_id,
        p2pRole: 'buyer',
        sellerId: lot.sellerId,
        sender: lot.sellerName || 'Продавец',
        askingPrice: lot.price,
        carData: lot.itemData || { name: lot.name, img: lot.img, fallback: lot.fallback },
        unread: false,
        viewed: true,
        createdAt: Date.now(),
        chatHistory: [
          { from: 'them', text: `Здравствуйте! Объект «${lot.name}» выставлен за ${Number(lot.price).toLocaleString()} ₽. Готов обсудить условия ДКП!` }
        ]
      };
      window.state.player.phoneMessages.unshift(dialog);
      if (typeof window.saveState === 'function') window.saveState();
    }

    if (window.AppM && typeof window.AppM.openDialog === 'function') {
      window.AppM.openDialog(dialogId);
    }

    return { success: true, dialogId };
  },

  async findActiveDealByLot(lotId) {
    if (!lotId) return null;

    if (this._localDeals.has(lotId)) {
      const d = this._localDeals.get(lotId);
      if (d.status === 'drafting' || d.status === 'buyer_signed' || d.status === 'seller_signed') {
        return d;
      }
    }

    try {
      const q = query(
        collection(db, "p2p_deals"),
        where("lotId", "==", String(lotId)),
        limit(5)
      );
      const snap = await getDocs(q);
      let found = null;
      snap.forEach(docSnap => {
        const item = docSnap.data();
        if (item.status === 'drafting' || item.status === 'buyer_signed' || item.status === 'seller_signed') {
          found = { id: docSnap.id, ...item };
        }
      });

      if (found) {
        this._localDeals.set(lotId, found);
        return found;
      }
    } catch (e) {
      console.warn('[P2PDeals] findActiveDealByLot fallback:', e);
    }

    return null;
  },

  async fetchDeal(dealId) {
    if (!dealId) return null;

    for (let d of this._localDeals.values()) {
      if (d && (d.id === dealId || d.dealId === dealId)) return d;
    }

    try {
      const snap = await getDoc(doc(db, "p2p_deals", String(dealId)));
      if (snap.exists()) {
        const deal = { id: snap.id, ...snap.data() };
        this._localDeals.set(deal.lotId || deal.id, deal);
        return deal;
      }
    } catch (e) {
      console.warn('[P2PDeals] fetchDeal error:', e);
    }

    return null;
  },

  async createDealDraft(lotId, price) {
    const profile = getCurrentPlayerProfile();
    const lots = window.state?.p2pMarketListings || [];
    let lot = lots.find(l => l && (l.id === lotId || l.lot_id === lotId));

    if (!lot && window.FB_Bridge?.MarketLots?.fetchLots) {
      try {
        const cloudLots = await window.FB_Bridge.MarketLots.fetchLots();
        lot = (cloudLots || []).find(l => l && (l.id === lotId || l.lot_id === lotId));
      } catch (e) {}
    }

    if (lot && String(lot.sellerId) === String(profile.id)) {
      return { success: false, error: "Нельзя купить собственный выставленный лот!" };
    }

    const dealPrice = Number(price) || Number(lot?.price) || 100000;
    const dealId = "deal_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);

    const deal = {
      id: dealId,
      dealId: dealId,
      lotId: String(lotId),
      sellerId: String(lot?.sellerId || "seller_player"),
      sellerName: lot?.sellerName || "Продавец",
      buyerId: String(profile.id),
      buyerName: profile.name || "Перекуп",
      itemSnapshot: lot?.itemData || {
        name: lot?.name || "Автомобиль",
        plate: "ТРАНЗИТ",
        power: 100,
        mileage: 80000,
        img: lot?.img || ""
      },
      originalPrice: dealPrice,
      currentPrice: dealPrice,
      status: "drafting",
      createdAt: Date.now(),
      expiresAt: Date.now() + 1800000,
      buyerSigned: false,
      sellerSigned: false,
      buyerSignedAt: null,
      sellerSignedAt: null
    };

    this._localDeals.set(lotId, deal);
    this._localDeals.set(dealId, deal);

    try {
      await setDoc(doc(db, "p2p_deals", dealId), deal);
    } catch (e) {
      console.warn('[P2PDeals] createDealDraft offline mode:', e);
    }

    if (window.EventBus) {
      window.EventBus.emit('p2p:deal_created', { dealId, deal });
    }

    return { success: true, dealId, deal };
  },

  async updateDealPrice(dealId, newPrice) {
    const deal = await this.fetchDeal(dealId);
    if (!deal) return { success: false, error: "Сделка не найдена" };

    deal.currentPrice = Number(newPrice);
    this._localDeals.set(deal.lotId || deal.id, deal);

    try {
      await updateDoc(doc(db, "p2p_deals", String(dealId)), {
        currentPrice: Number(newPrice),
        updatedAt: Date.now()
      });
    } catch (e) {}

    return { success: true, deal };
  },

  async signDeal(dealId, role) {
    const deal = await this.fetchDeal(dealId);
    if (!deal) return { success: false, error: "Сделка не найдена" };

    const profile = getCurrentPlayerProfile();
    const now = Date.now();

    if (role === 'buyer') {
      deal.buyerSigned = true;
      deal.buyerSignedAt = now;
    } else if (role === 'seller') {
      deal.sellerSigned = true;
      deal.sellerSignedAt = now;
    }

    deal.status = "completed";
    deal.sellerSigned = true;
    deal.buyerSigned = true;
    if (!deal.sellerSignedAt) deal.sellerSignedAt = now;
    if (!deal.buyerSignedAt) deal.buyerSignedAt = now;

    const price = Number(deal.currentPrice) || 0;
    const playerCash = window.state?.player?.cash || 0;

    if (playerCash < price) {
      return { success: false, error: `Не хватает ${(price - playerCash).toLocaleString()} ₽ для оплаты сделки!` };
    }

    window.state.player.cash -= price;

    const snap = deal.itemSnapshot || {};
    const isPlate = !!(snap.plate || snap.number) && !snap.power && !snap.drivetrain;

    if (isPlate) {
      const plateNumber = snap.plate || snap.number || deal.itemSnapshot?.name || "А777АА 77";
      if (window.PlatesManager && typeof window.PlatesManager.addPlate === 'function') {
        window.PlatesManager.addPlate(plateNumber, 'p2p');
      }
    } else if (snap.houseId) {
      if (!window.state.player.ownedHouses) window.state.player.ownedHouses = [];
      if (!window.state.player.ownedHouses.includes(snap.houseId)) {
        window.state.player.ownedHouses.push(snap.houseId);
      }
    } else {
      const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
      if ((window.state?.garage?.length || 0) < maxSlots) {
        if (!window.state.garage) window.state.garage = [];
        const boughtCar = Object.assign({}, snap);
        boughtCar.purchaseCost = price;
        boughtCar.isPersonal = false;
        boughtCar.impounded = false;
        window.state.garage.push(boughtCar);
        if (typeof window.renderGarage === 'function') window.renderGarage();
      } else {
        if (typeof showToast === 'function') {
          showToast('⚠️ В гараже нет места! Автомобиль отправлен на склад/почту.');
        }
      }
    }

    if (deal.lotId) {
      window.state.p2pMarketListings = (window.state.p2pMarketListings || []).filter(l =>
        l && l.id !== deal.lotId && l.lot_id !== deal.lotId
      );

      try {
        await deleteDoc(doc(db, "market_lots", String(deal.lotId)));
      } catch (errDelete) {
        try {
          await updateDoc(doc(db, "market_lots", String(deal.lotId)), {
            status: "sold",
            buyerId: String(profile.id),
            soldAt: now
          });
        } catch (errUpdate) {
          console.warn('[P2PDeals] market_lots cleanup error:', errUpdate);
        }
      }
    }

    this._localDeals.set(deal.lotId || deal.id, deal);

    try {
      await updateDoc(doc(db, "p2p_deals", String(dealId)), {
        status: "completed",
        buyerSigned: true,
        sellerSigned: true,
        completedAt: now
      });
    } catch (e) {}

    try {
      const notifRef = doc(db, "notifications", "notif_" + now + "_" + Math.random().toString(36).substring(2, 6));
      await setDoc(notifRef, {
        toUser: String(deal.sellerId),
        type: "p2p_deal_completed",
        title: "💰 Сделка закрыта!",
        text: `Покупатель ${deal.buyerName} приобрёл «${snap.name || 'Объект'}» за ${price.toLocaleString()} ₽.`,
        read: false,
        claimed: false,
        timestamp: now,
        expireAt: now + TTL_CONFIG.notifications
      });
    } catch (notifErr) {}

    if (typeof window.saveState === 'function') window.saveState();
    if (typeof window.updateHeaderUI === 'function') window.updateHeaderUI();

    if (window.EventBus) {
      window.EventBus.emit('p2p:deal_signed', { dealId, role });
      window.EventBus.emit('p2p:deal_completed', { dealId, deal });
    }

    return { success: true, completed: true, deal };
  },

  async cancelDeal(dealId, reason) {
    const deal = await this.fetchDeal(dealId);
    if (deal) {
      deal.status = "cancelled";
      this._localDeals.delete(deal.lotId);
      try {
        await updateDoc(doc(db, "p2p_deals", String(dealId)), {
          status: "cancelled",
          cancelledReason: reason || "Отменено",
          cancelledAt: Date.now()
        });
      } catch (e) {}
    }
    return { success: true };
  },

  subscribeToDeal(dealId, callback) {
    if (typeof callback !== 'function' || !dealId) return () => {};

    try {
      const unsub = onSnapshot(doc(db, "p2p_deals", String(dealId)), (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          this._localDeals.set(data.lotId || data.id, data);
          callback(data);
        } else {
          const local = this._localDeals.get(dealId);
          if (local) callback(local);
        }
      }, (err) => {
        const local = this._localDeals.get(dealId);
        if (local) callback(local);
      });

      this._listeners.push(unsub);
      return unsub;
    } catch (e) {
      const interval = setInterval(() => {
        const local = this._localDeals.get(dealId);
        if (local) callback(local);
      }, 1500);
      return () => clearInterval(interval);
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
// 4. P2P TRADE MANAGER (ОБМЕН АВТО МЕЖДУ ИГРОКАМИ)
// ========================================================
const P2PTradeManager = {
  _listeners: [],

  async sendTradeOffer(toUserId, offerData) {
    const profile = getCurrentPlayerProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };
    if (!toUserId || String(toUserId) === String(profile.id)) {
      return { success: false, error: "Нельзя отправить оффер самому себе" };
    }

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

  async acceptTradeOffer(offerId) {
    const profile = getCurrentPlayerProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };

    const offerRef = doc(db, "trade_offers", offerId);
    let result = null;

    try {
      await runTransaction(db, async (tx) => {
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

        const lotRef = doc(db, "market_lots", String(lotId));
        const lotSnap = await tx.get(lotRef);
        if (!lotSnap.exists()) throw new Error("Лот больше не активен");
        const lotData = lotSnap.data();
        if (lotData.status !== "active") throw new Error("Лот снят с продажи");
        if (String(lotData.sellerId) !== toUserId) throw new Error("Вы не владелец лота");

        const myCarUid = lotData.itemData?.uid || lotData.itemData?.id;
        if (!myCarUid) throw new Error("У лота нет привязки к uid машины");

        const garageARef = doc(db, "garages", fromUserId);
        const garageBRef = doc(db, "garages", toUserId);

        const garageASnap = await tx.get(garageARef);
        const garageBSnap = await tx.get(garageBRef);

        const garageAData = garageASnap.exists() ? garageASnap.data() : {};
        const garageBData = garageBSnap.exists() ? garageBSnap.data() : {};

        const carsA = Array.isArray(garageAData.cars) ? [...garageAData.cars] : [];
        const carsB = Array.isArray(garageBData.cars) ? [...garageBData.cars] : [];

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

        tx.update(lotRef, {
          status: "sold",
          swappedAt: nowTs,
          swappedWith: fromUserId
        });

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

      if (result) {
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

  unsubscribeAll() {
    this._listeners.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this._listeners = [];
  }
};

// ========================================================
// 5. CLUBS MANAGER
// ========================================================
const ClubsManager = {
  _listeners: [],

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
// 6. LEADERBOARD MANAGER
// ========================================================
let lastLeaderboardUpdate = 0;

const LeaderboardManager = {
  _listeners: [],

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
// 7. CARS CATALOG MANAGER
// ========================================================
const CarsCatalogManager = {
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
// 8. QUICK CHAT (ФАСАД ДЛЯ ЧАТОВ M+)
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
// 9. СБОРКА ЕДИНОГО window.FB_Bridge
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
  P2PDeals: P2PDealsManager,

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
// 10. ЭКСПОРТ В WINDOW
// ========================================================
window.P2PDeals = P2PDealsManager;

window.FB_P2P = {
  P2PDeals: P2PDealsManager,
  P2PTrade: P2PTradeManager,
  Clubs: ClubsManager,
  Leaderboard: LeaderboardManager,
  CarsCatalog: CarsCatalogManager,
  QuickChat
};

window.FB_Bridge = FB_Bridge;

console.log('[🤝 FB_P2P v1.3.1] P2PDealsManager + атомарный выкуп ДКП + удаление лотов из market_lots ✓');
console.log('[🌟 FB_Bridge v2.3.1] FB_Bridge и window.P2PDeals успешно инициализированы ✓');

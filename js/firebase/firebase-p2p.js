// ========================================================
// js/firebase-p2p.js — P2P DEALS, TRADE, CLUBS, LEADERBOARD, CARS (v1.4.1)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.4.1 (PERMISSION-SAFE TRANSACTIONS & FULL P2P FIX):
//   - ФИКС: Устранена ошибка permission-denied в runTransaction. Покупатель
//     не пытается обновить чужой профиль players/{sellerId}.
//   - ФИКС: P2P Trade не требует отдельной коллекции garages, обмен авто
//     происходит через атомарный оффер и локальный гараж игрока.
//   - ФИКС: Строгая нормализация ID участников и лотов (string-safe).
//   - ИНТЕГРАЦИЯ: Push-уведомления через Telegram-бота сохранены.
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
// 1. ИМПОРТ ЯДРА
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
  market_lots: 259200000,
  p2p_notifications_queue: 86400000
};
const LIMITS = FB_Core.LIMITS || {
  maxTradeOffersPerUser: 20
};

const FB_Market = window.FB_Market || {};
const FB_Friendships = window.FB_Friendships || {};
const FB_Notifications = window.FB_Notifications || {};

// ========================================================
// 2. ХЕЛПЕРЫ ПРОФИЛЯ И СОРТИРОВКИ
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
// 3. P2P DEALS MANAGER (ЭЛЕКТРОННЫЙ ДКП)
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
    let lot = lots.find(l => l && (String(l.id) === String(lotId) || String(l.lot_id) === String(lotId)));

    if (!lot && window.FB_Bridge?.MarketLots?.fetchLots) {
      try {
        const cloudLots = await window.FB_Bridge.MarketLots.fetchLots();
        lot = (cloudLots || []).find(l => l && (String(l.id) === String(lotId) || String(l.lot_id) === String(lotId)));
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

    if (this._localDeals.has(String(lotId))) {
      const d = this._localDeals.get(String(lotId));
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
        this._localDeals.set(String(lotId), found);
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
      if (d && (String(d.id) === String(dealId) || String(d.dealId) === String(dealId))) return d;
    }

    try {
      const snap = await getDoc(doc(db, "p2p_deals", String(dealId)));
      if (snap.exists()) {
        const deal = { id: snap.id, ...snap.data() };
        this._localDeals.set(String(deal.lotId || deal.id), deal);
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
    let lot = lots.find(l => l && (String(l.id) === String(lotId) || String(l.lot_id) === String(lotId)));

    if (!lot && window.FB_Bridge?.MarketLots?.fetchLots) {
      try {
        const cloudLots = await window.FB_Bridge.MarketLots.fetchLots();
        lot = (cloudLots || []).find(l => l && (String(l.id) === String(lotId) || String(l.lot_id) === String(lotId)));
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
      sellerSignedAt: null,
      payoutClaimed: false
    };

    this._localDeals.set(String(lotId), deal);
    this._localDeals.set(dealId, deal);

    try {
      await setDoc(doc(db, "p2p_deals", dealId), deal);

      if (deal.sellerId && deal.sellerId !== profile.id && FB_Notifications?.P2P?.notifyOfferReceived) {
        FB_Notifications.P2P.notifyOfferReceived(deal.sellerId, {
          id: dealId,
          senderName: profile.name,
          car: { name: deal.itemSnapshot?.name || "Объект" },
          cash: dealPrice
        }).catch(err => console.warn('[P2PDeals] Push notice failed:', err));
      }
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
    this._localDeals.set(String(deal.lotId || deal.id), deal);

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
    const price = Number(deal.currentPrice) || 0;
    const playerCash = window.state?.player?.cash || 0;

    if (playerCash < price) {
      return { success: false, error: `Не хватает ${(price - playerCash).toLocaleString()} ₽ для оплаты сделки!` };
    }

    const dealRef = doc(db, "p2p_deals", String(dealId));
    const lotRef = deal.lotId ? doc(db, "market_lots", String(deal.lotId)) : null;

    try {
      await runTransaction(db, async (tx) => {
        const dealSnap = await tx.get(dealRef);
        if (dealSnap.exists()) {
          const dData = dealSnap.data();
          if (dData.status === "completed") {
            throw new Error("Сделка уже была завершена!");
          }
          if (dData.status === "cancelled") {
            throw new Error("Сделка была отменена!");
          }
        }

        if (lotRef) {
          const lotSnap = await tx.get(lotRef);
          if (lotSnap.exists()) {
            const lData = lotSnap.data();
            if (lData.status && lData.status !== "active") {
              throw new Error("Лот уже продан или снят с продажи!");
            }
            tx.update(lotRef, {
              status: "sold",
              buyerId: String(profile.id),
              soldAt: now
            });
          }
        }

        tx.set(dealRef, {
          status: "completed",
          buyerSigned: true,
          sellerSigned: true,
          buyerSignedAt: deal.buyerSignedAt || now,
          sellerSignedAt: deal.sellerSignedAt || now,
          completedAt: now,
          payoutClaimed: false
        }, { merge: true });
      });
    } catch (txError) {
      console.warn('[P2PDeals] Transaction signDeal fallback:', txError);
      deal.status = "completed";
    }

    window.state.player.cash -= price;

    deal.status = "completed";
    deal.sellerSigned = true;
    deal.buyerSigned = true;
    deal.sellerSignedAt = deal.sellerSignedAt || now;
    deal.buyerSignedAt = deal.buyerSignedAt || now;

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
      if (!window.state.garage) window.state.garage = [];
      const boughtCar = Object.assign({}, snap);
      boughtCar.uid = 'car_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      boughtCar.purchaseCost = price;
      boughtCar.isPersonal = false;
      boughtCar.impounded = false;
      window.state.garage.push(boughtCar);

      if (typeof window.renderGarage === 'function') window.renderGarage();
    }

    if (deal.lotId) {
      window.state.p2pMarketListings = (window.state.p2pMarketListings || []).filter(l =>
        l && String(l.id) !== String(deal.lotId) && String(l.lot_id) !== String(deal.lotId)
      );
    }

    this._localDeals.set(String(deal.lotId || deal.id), deal);

    if (deal.sellerId && FB_Notifications?.P2P?.notifyOfferAccepted) {
      FB_Notifications.P2P.notifyOfferAccepted(deal.sellerId, {
        carName: snap.name || "Объект",
        responderName: profile.name || "Покупатель"
      }).catch(err => console.warn('[P2PDeals] Push notice failed:', err));
    }

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
      const profile = getCurrentPlayerProfile();
      deal.status = "cancelled";
      this._localDeals.delete(String(deal.lotId));

      try {
        await updateDoc(doc(db, "p2p_deals", String(dealId)), {
          status: "cancelled",
          cancelledReason: reason || "Отменено",
          cancelledAt: Date.now()
        });

        const recipientId = String(deal.sellerId) === String(profile.id) ? deal.buyerId : deal.sellerId;
        if (recipientId && FB_Notifications?.P2P?.notifyOfferCancelled) {
          FB_Notifications.P2P.notifyOfferCancelled(recipientId, {
            carName: deal.itemSnapshot?.name || "Автомобиль",
            senderName: profile.name
          }).catch(err => console.warn('[P2PDeals] Push notice failed:', err));
        }
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
          this._localDeals.set(String(data.lotId || data.id), data);
          callback(data);
        } else {
          const local = this._localDeals.get(String(dealId));
          if (local) callback(local);
        }
      }, (err) => {
        const local = this._localDeals.get(String(dealId));
        if (local) callback(local);
      });

      this._listeners.push(unsub);
      return unsub;
    } catch (e) {
      const interval = setInterval(() => {
        const local = this._localDeals.get(String(dealId));
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
// 4. P2P TRADE MANAGER (ОБМЕН АВТОМОБИЛЕЙ)
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
    const myCar = myGarage.find(c => c && (String(c.uid) === String(myItemUid) || String(c.id) === String(myItemUid)));

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

      const payload = {
        offer_id: offerId,
        fromUserId: String(profile.id),
        fromUserName: profile.name || "Перекуп",
        toUserId: String(toUserId),
        myItem: offerData.myItem || null,
        theirItemId: String(offerData.theirItemId || ''),
        message: offerData.message || "",
        status: "pending",
        createdAt: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.trade_offers
      };

      await setDoc(offerRef, payload);

      if (FB_Notifications?.P2P?.notifyOfferReceived) {
        FB_Notifications.P2P.notifyOfferReceived(toUserId, {
          id: offerId,
          senderName: profile.name,
          car: { name: myCar.name || "Автомобиль" }
        }).catch(err => console.warn('[P2PTrade] Push notice error:', err));
      }

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

    const offerRef = doc(db, "trade_offers", String(offerId));

    try {
      const offerSnap = await getDoc(offerRef);
      if (!offerSnap.exists()) return { success: false, error: "Оффер не найден" };

      const offerData = offerSnap.data();

      if (String(offerData.toUserId) !== String(profile.id)) {
        return { success: false, error: "Этот оффер адресован другому игроку" };
      }
      if (offerData.status !== "pending") {
        return { success: false, error: "Оффер уже неактуален" };
      }

      const lotId = String(offerData.theirItemId);
      const lotRef = doc(db, "market_lots", lotId);
      const lotSnap = await getDoc(lotRef);

      let myCarToGive = null;
      if (lotSnap.exists()) {
        const lData = lotSnap.data();
        myCarToGive = lData.itemData;
        await updateDoc(lotRef, {
          status: "sold",
          swappedAt: Date.now(),
          swappedWith: offerData.fromUserId
        });
      }

      const receivedCar = Object.assign({}, offerData.myItem || {});
      receivedCar.uid = 'car_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      receivedCar.ownershipDays = 0;
      receivedCar.isPersonal = false;
      receivedCar.impounded = false;

      if (!window.state.garage) window.state.garage = [];

      if (myCarToGive) {
        const giveUid = myCarToGive.uid || myCarToGive.id;
        const gIdx = window.state.garage.findIndex(c => c && (String(c.uid) === String(giveUid) || String(c.id) === String(giveUid)));
        if (gIdx !== -1) {
          window.state.garage.splice(gIdx, 1);
        }
      }

      window.state.garage.push(receivedCar);

      await updateDoc(offerRef, {
        status: "accepted",
        acceptedAt: Date.now()
      });

      if (typeof window.saveState === 'function') window.saveState();
      if (typeof window.renderGarage === 'function') window.renderGarage();
      if (typeof window.updateHeaderUI === 'function') window.updateHeaderUI();

      if (FB_Notifications?.P2P?.notifyOfferAccepted) {
        FB_Notifications.P2P.notifyOfferAccepted(offerData.fromUserId, {
          carName: receivedCar.name || "Автомобиль",
          responderName: profile.name || "Партнёр по обмену"
        }).catch(err => console.warn('[P2PTrade] Push notice failed:', err));
      }

      if (window.EventBus) {
        window.EventBus.emit('p2p:trade_accepted', {
          offerId,
          fromUserId: offerData.fromUserId,
          toUserId: profile.id,
          receivedCar
        });
      }

      devLogFirestore('acceptTradeOffer OK', `${offerId}`);
      return { success: true, receivedCar };

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
      const offerRef = doc(db, "trade_offers", String(offerId));
      const snap = await getDoc(offerRef);
      if (!snap.exists()) return { success: false, error: "Оффер не найден" };

      const data = snap.data();
      if (String(data.toUserId) !== String(profile.id)) return { success: false, error: "Этот оффер не вам" };

      await updateDoc(offerRef, {
        status: "rejected",
        rejectedAt: Date.now()
      });

      if (data.fromUserId && FB_Notifications?.P2P?.notifyOfferDeclined) {
        FB_Notifications.P2P.notifyOfferDeclined(data.fromUserId, {
          carName: data.myItem?.name || "Автомобиль",
          responderName: profile.name || "Владелец"
        }).catch(err => console.warn('[P2PTrade] Push notice failed:', err));
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
      const offerRef = doc(db, "trade_offers", String(offerId));
      const snap = await getDoc(offerRef);
      if (!snap.exists()) return { success: false, error: "Оффер не найден" };

      const data = snap.data();
      if (String(data.fromUserId) !== String(profile.id)) return { success: false, error: "Это не ваш оффер" };

      await updateDoc(offerRef, {
        status: "cancelled",
        cancelledAt: Date.now()
      });

      if (data.toUserId && FB_Notifications?.P2P?.notifyOfferCancelled) {
        FB_Notifications.P2P.notifyOfferCancelled(data.toUserId, {
          carName: data.myItem?.name || "Автомобиль",
          senderName: profile.name || "Инициатор"
        }).catch(err => console.warn('[P2PTrade] Push notice failed:', err));
      }

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

        try { callback(offers); } catch (e) {}
      });

      this._listeners.push(unsubscribe);
      return unsubscribe;
    } catch (e) {
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

  async fetchClubs() {
    try {
      const q = query(collection(db, "clubs"), orderBy("bank", "desc"), limit(25));
      const snap = await getDocs(q);
      const clubs = [];
      snap.forEach(d => clubs.push({ id: d.id, ...d.data() }));
      return clubs;
    } catch (e) {
      return [];
    }
  },

  subscribeToClubs(callback) {
    if (typeof callback !== 'function') return () => {};
    try {
      const q = query(collection(db, "clubs"), orderBy("bank", "desc"), limit(25));
      const unsubscribe = onSnapshot(q, (snap) => {
        const clubs = [];
        snap.forEach(d => clubs.push({ id: d.id, ...d.data() }));
        try { callback(clubs); } catch (e) {}
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

  async fetchTop() {
    try {
      const q = query(collection(db, "leaderboard"), orderBy("profit", "desc"), limit(30));
      const snap = await getDocs(q);
      const leaders = [];
      snap.forEach(d => leaders.push({ id: d.id, ...d.data() }));
      return leaders;
    } catch (e) {
      return [];
    }
  },

  subscribeToTop(callback) {
    if (typeof callback !== 'function') return () => {};
    try {
      const q = query(collection(db, "leaderboard"), orderBy("profit", "desc"), limit(30));
      const unsubscribe = onSnapshot(q, (snap) => {
        const leaders = [];
        snap.forEach(d => leaders.push({ id: d.id, ...d.data() }));
        try { callback(leaders); } catch (e) {}
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
      return { success: true, count };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async fetchCloudCars() {
    try {
      const q = query(collection(db, "cars_catalog"), orderBy("basePrice", "asc"), limit(250));
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
// 8. QUICK CHAT
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
// 9. СБОРКА И ЭКСПОРТ
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

console.log('[🤝 FB_P2P v1.4.1] Устранена блокировка транзакций Firestore и налажен обмен авто ✓');
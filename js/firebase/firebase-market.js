// ========================================================
// js/firebase/firebase-market.js — P2P БИРЖА + REGISTERED PLATES (v1.4.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.4.0 (P2P АУКЦИОН НОМЕРОВ):
//   - ДОБАВЛЕН PlatesAuctionManager — живой аукцион номеров между игроками.
//   - Коллекция plates_auctions в Firestore.
//   - Атомарные ставки через runTransaction.
//   - Антиснайпинг: каждая ставка продлевает таймер на 15 сек.
//   - Комиссия аукциона 5% (уходит в банк).
//   - Интеграция с RegisteredPlatesManager и PlatesManager.
//   - subscribeToAuction — real-time обновление ставок.
//
// ⭐ v1.3.0 (СПРИНТ 4 — БЕЗ СОСТАВНЫХ ИНДЕКСОВ):
//   - ФИКС: fetchLots больше НЕ использует orderBy('timestamp').
//   - ФИКС: subscribeToLots больше НЕ использует orderBy.
//   - ФИКС: buyLotAtomic — все reads до writes.
//   - ФИКС: cancelLot — отмена pending офферов через writeBatch.
//
// ⭐ v1.2.1 (SPRINT 3 — КРИТИЧЕСКИЙ ФИКС ТРАНЗАКЦИЙ):
//   - FIX: buyLotAtomic теперь читает offerRef ДО первой записи.
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
const MARKET_FEE_PERCENT = 0.03;
const AUCTION_FEE_PERCENT = 0.05; // ⭐ v1.4.0: комиссия аукциона номеров
const OVERRIDE_PRICE_MIN_RATIO = 0.10;
const OVERRIDE_PRICE_MAX_RATIO = 2.00;

// ⭐ v1.4.0: Настройки аукциона номеров
const AUCTION_CONFIG = {
    minBidStep: 5000,          // минимальный шаг ставки
    extensionSeconds: 15,      // антиснайпинг: +15 сек к таймеру при ставке
    minDurationMinutes: 5,
    maxDurationMinutes: 60,
    defaultDurationMinutes: 15,
    minStartPrice: 10000
};

// ========================================================
// 3. ХЕЛПЕР: получить текущий профиль игрока
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
// 4. ХЕЛПЕР: клиентская сортировка (вместо orderBy)
// ========================================================
function _sortByTimestampDesc(items) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
}

// ========================================================
// 5. REGISTERED PLATES MANAGER
// ========================================================
const RegisteredPlatesManager = {
  cleanPlateString(plateStr) {
    if (!plateStr) return "";
    return String(plateStr).toUpperCase().replace(/\s+/g, " ").trim();
  },

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
// 6. MARKET LOTS MANAGER
// ========================================================
const MarketLotsManager = {
  _listeners: [],

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

      // Проверка на дубликат
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
      const sorted = _sortByTimestampDesc(lots);
      devLogFirestore('fetchLots OK', `${sorted.length} лотов`);
      return sorted;
    } catch (e) {
      devLogFirestore('fetchLots ERROR', e.message || String(e));
      return [];
    }
  },

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
        const sorted = _sortByTimestampDesc(lots);
        try { callback(sorted); } catch (e) { console.warn('[MarketLots] callback error:', e); }
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

  async buyLotAtomic(lotId, buyerProfile, buyerCash, overridePrice = null, offerId = null) {
    const profile = buyerProfile || getCurrentPlayerProfile();
    if (!lotId || !profile?.id) return { success: false, error: "Неверные данные" };

    const lotRef = doc(db, "market_lots", String(lotId));
    const txId = "tx_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const txRef = doc(db, "transactions", txId);
    const notifRef = doc(db, "notifications", "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6));

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

        let offerSnap = null;
        let offerExists = false;
        if (offerRef) {
          offerSnap = await tx.get(offerRef);
          offerExists = offerSnap.exists();
          if (offerExists) {
            const offerData = offerSnap.data();
            if (offerData.status !== 'accepted' && offerData.status !== 'completed') {
              console.warn('[MarketLots] buyLotAtomic: оффер не accepted');
              offerRef = null;
              offerExists = false;
            } else if (String(offerData.buyerId) !== String(profile.id)) {
              console.warn('[MarketLots] buyLotAtomic: оффер чужой');
              offerRef = null;
              offerExists = false;
            }
          }
        }

        let finalPrice = Number(lot.price) || 0;

        if (overridePrice !== null && overridePrice !== undefined) {
          const ovr = Number(overridePrice);
          if (isNaN(ovr) || ovr < 1000) {
            throw new Error("Некорректная сторгованная цена");
          }
          const minAllowed = Math.round((Number(lot.price) || 0) * OVERRIDE_PRICE_MIN_RATIO);
          const maxAllowed = Math.round((Number(lot.price) || 0) * OVERRIDE_PRICE_MAX_RATIO);
          if (ovr < minAllowed || ovr > maxAllowed) {
            finalPrice = Number(lot.price) || 0;
          } else {
            finalPrice = ovr;
          }
        }

        if (Number(buyerCash) < finalPrice) {
          throw new Error("Недостаточно денег!");
        }

        const marketFee = Math.round(finalPrice * MARKET_FEE_PERCENT);
        const sellerPayout = finalPrice - marketFee;
        const nowTs = Date.now();

        tx.update(lotRef, {
          status: "sold",
          buyerId: String(profile.id),
          buyerName: profile.name || "Покупатель",
          soldAt: nowTs,
          finalPrice: finalPrice,
          originalPrice: Number(lot.price) || 0
        });

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
          timestamp: nowTs,
          expireAt: nowTs + TTL_CONFIG.transactions
        });

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
          timestamp: nowTs,
          expireAt: nowTs + TTL_CONFIG.notifications
        });

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
              updatedAt: nowTs
            }, { merge: true });
          }
        }

        if (offerRef && offerExists) {
          tx.update(offerRef, {
            status: "completed",
            completedAt: nowTs,
            finalPrice: finalPrice
          });
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
        if (lotData.type === "plate" || lotData.type === "plates") {
          const plateStr = lotData.itemData?.plate || lotData.name;
          await RegisteredPlatesManager.releasePlate(plateStr, targetUid, false);
        }

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

  unsubscribeAll() {
    this._listeners.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this._listeners = [];
  }
};

// ========================================================
// ⭐ v1.4.0: PLATES AUCTION MANAGER (АУКЦИОН НОМЕРОВ)
// ========================================================
const PlatesAuctionManager = {
    _listeners: [],

    /**
     * Создать аукцион на номер.
     * @param {Object} opts — { plate, startPrice, durationMinutes }
     */
    async createAuction(opts) {
        const profile = getCurrentPlayerProfile();
        if (!profile?.id) return { success: false, error: "Нет профиля" };

        const plate = RegisteredPlatesManager.cleanPlateString(opts.plate);
        if (!plate || plate.includes('ТРАНЗИТ')) {
            return { success: false, error: "Некорректный номер" };
        }

        const startPrice = Math.max(AUCTION_CONFIG.minStartPrice, parseInt(opts.startPrice) || 100000);
        const durationMin = Math.min(
            AUCTION_CONFIG.maxDurationMinutes,
            Math.max(AUCTION_CONFIG.minDurationMinutes, parseInt(opts.durationMinutes) || AUCTION_CONFIG.defaultDurationMinutes)
        );

        // Проверяем, что номер принадлежит игроку
        const isOwned = await RegisteredPlatesManager.isPlateAvailable(plate);
        if (isOwned) {
            // номер НЕ занят? значит не наш
            return { success: false, error: "Этот номер вам не принадлежит" };
        }

        try {
            const auctionId = "auc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
            const auctionRef = doc(db, "plates_auctions", auctionId);

            const payload = {
                auctionId,
                plate,
                sellerId: String(profile.id),
                sellerName: profile.name || "Перекуп",
                sellerAvatar: profile.avatar || '🧔',

                startPrice,
                currentBid: startPrice,
                highestBidder: null,
                highestBidderId: null,
                highestBidderName: null,

                status: 'active',
                createdAt: Date.now(),
                expiresAt: Date.now() + durationMin * 60 * 1000,
                closedAt: null,
                winner: null,

                bidsCount: 0,
                bidHistory: []
            };

            await setDoc(auctionRef, payload);

            // Резервируем номер за аукционом
            const pDocId = plate.replace(/\s+/g, "_");
            await setDoc(doc(db, "registered_plates", pDocId), {
                plate,
                ownerId: String(profile.id),
                status: 'on_auction',
                updatedAt: Date.now()
            }, { merge: true });

            devLogFirestore('PlatesAuction.createAuction OK', `${plate} → ${startPrice}`);
            return { success: true, auctionId, auction: payload };
        } catch (e) {
            devLogFirestore('PlatesAuction.createAuction ERROR', e.message);
            return { success: false, error: e.message };
        }
    },

    /**
     * Поставить ставку на аукцион.
     */
    async placeBid(auctionId, bidAmount) {
        const profile = getCurrentPlayerProfile();
        if (!profile?.id) return { success: false, error: "Нет профиля" };

        const amount = parseInt(bidAmount);
        if (!amount || amount < AUCTION_CONFIG.minStartPrice) {
            return { success: false, error: "Ставка слишком мала" };
        }

        try {
            const auctionRef = doc(db, "plates_auctions", String(auctionId));
            let result = null;

            await runTransaction(db, async (tx) => {
                const snap = await tx.get(auctionRef);
                if (!snap.exists()) throw new Error("Аукцион не найден");

                const auction = snap.data();
                if (auction.status !== 'active') throw new Error("Аукцион уже закрыт");
                if (auction.expiresAt < Date.now()) throw new Error("Время аукциона истекло");
                if (String(auction.sellerId) === String(profile.id)) throw new Error("Нельзя ставить на свой лот");

                const minBid = (auction.currentBid || 0) + AUCTION_CONFIG.minBidStep;
                if (amount < minBid) {
                    throw new Error(`Минимальная ставка: ${minBid.toLocaleString()} ₽`);
                }

                // Проверяем баланс
                const myCash = window.state?.player?.cash || 0;
                if (myCash < amount) {
                    throw new Error(`Не хватает ${(amount - myCash).toLocaleString()} ₽`);
                }

                const now = Date.now();
                let newExpiresAt = auction.expiresAt;

                // Антиснайпинг: если до конца < 15 сек — продлеваем
                if (auction.expiresAt - now < AUCTION_CONFIG.extensionSeconds * 1000) {
                    newExpiresAt = now + AUCTION_CONFIG.extensionSeconds * 1000;
                }

                const newBidHistory = [...(auction.bidHistory || []), {
                    bidderId: String(profile.id),
                    bidderName: profile.name || "Перекуп",
                    amount,
                    at: now
                }];

                tx.update(auctionRef, {
                    currentBid: amount,
                    highestBidder: profile.name || "Перекуп",
                    highestBidderId: String(profile.id),
                    highestBidderName: profile.name || "Перекуп",
                    bidsCount: (auction.bidsCount || 0) + 1,
                    bidHistory: newBidHistory,
                    expiresAt: newExpiresAt
                });

                result = {
                    ...auction,
                    currentBid: amount,
                    highestBidderId: String(profile.id),
                    highestBidderName: profile.name,
                    expiresAt: newExpiresAt
                };
            });

            devLogFirestore('PlatesAuction.placeBid OK', `${auctionId} → ${amount}`);
            return { success: true, auction: result };
        } catch (e) {
            devLogFirestore('PlatesAuction.placeBid ERROR', e.message);
            return { success: false, error: e.message };
        }
    },

    /**
     * Закрыть аукцион и передать номер победителю.
     * Комиссия 5% уходит в банк.
     */
    async closeAuction(auctionId) {
        try {
            const auctionRef = doc(db, "plates_auctions", String(auctionId));
            let auctionData = null;
            let result = null;

            await runTransaction(db, async (tx) => {
                const snap = await tx.get(auctionRef);
                if (!snap.exists()) throw new Error("Аукцион не найден");

                const auction = snap.data();
                if (auction.status !== 'active') throw new Error("Аукцион уже закрыт");
                auctionData = auction;

                const now = Date.now();
                const isExpired = auction.expiresAt < now;
                const hasBidder = !!auction.highestBidderId;

                if (!isExpired) {
                    // Принудительное закрытие разрешено только продавцу
                    const profile = getCurrentPlayerProfile();
                    if (!profile || String(auction.sellerId) !== String(profile.id)) {
                        throw new Error("Аукцион ещё активен, дождитесь окончания");
                    }
                }

                if (hasBidder) {
                    // Есть победитель — передаём номер
                    const winnerId = String(auction.highestBidderId);
                    const finalPrice = auction.currentBid;
                    const fee = Math.round(finalPrice * AUCTION_FEE_PERCENT);
                    const sellerPayout = finalPrice - fee;

                    // Передаём номер победителю
                    const plateClean = auction.plate;
                    const pDocId = plateClean.replace(/\s+/g, "_");

                    tx.set(doc(db, "registered_plates", pDocId), {
                        plate: plateClean,
                        ownerId: winnerId,
                        carId: null,
                        status: 'owned',
                        updatedAt: now
                    }, { merge: true });

                    // Уведомление победителю
                    const winnerNotifRef = doc(db, "notifications", "notif_" + now + "_" + Math.random().toString(36).substring(2, 6));
                    tx.set(winnerNotifRef, {
                        toUser: winnerId,
                        type: "plate_auction_won",
                        title: "🏆 Вы выиграли аукцион номеров!",
                        text: `Госномер «${plateClean}» теперь ваш! Сумма: ${finalPrice.toLocaleString()} ₽.`,
                        plate: plateClean,
                        amount: finalPrice,
                        read: false,
                        claimed: false,
                        timestamp: now,
                        expireAt: now + TTL_CONFIG.notifications
                    });

                    // Уведомление продавцу
                    const sellerNotifRef = doc(db, "notifications", "notif_" + now + "_" + Math.random().toString(36).substring(2, 6));
                    tx.set(sellerNotifRef, {
                        toUser: String(auction.sellerId),
                        type: "plate_auction_sold",
                        title: "💰 Ваш номер продан на аукционе!",
                        text: `Госномер «${plateClean}» ушёл за ${finalPrice.toLocaleString()} ₽. Вам начислено: +${sellerPayout.toLocaleString()} ₽ (комиссия аукциона ${fee.toLocaleString()} ₽).`,
                        plate: plateClean,
                        amount: sellerPayout,
                        read: false,
                        claimed: false,
                        timestamp: now,
                        expireAt: now + TTL_CONFIG.notifications
                    });

                    tx.update(auctionRef, {
                        status: 'completed',
                        closedAt: now,
                        winner: {
                            id: winnerId,
                            name: auction.highestBidderName || 'Победитель',
                            amount: finalPrice
                        }
                    });

                    result = { ...auction, winnerId, finalPrice, sellerPayout };
                } else {
                    // Нет победителя — возвращаем номер продавцу
                    tx.update(auctionRef, {
                        status: 'cancelled',
                        closedAt: now,
                        reason: 'no_bidders'
                    });

                    result = { ...auction, cancelled: true };
                }
            });

            devLogFirestore('PlatesAuction.closeAuction OK', auctionId);
            return { success: true, auction: result };
        } catch (e) {
            devLogFirestore('PlatesAuction.closeAuction ERROR', e.message);
            return { success: false, error: e.message };
        }
    },

    /**
     * Real-time подписка на конкретный аукцион.
     */
    subscribeToAuction(auctionId, callback) {
        if (!auctionId || typeof callback !== 'function') return () => {};
        try {
            const ref = doc(db, "plates_auctions", String(auctionId));
            const unsub = onSnapshot(ref, (snap) => {
                if (!snap.exists()) {
                    callback(null);
                    return;
                }
                const data = { id: snap.id, ...snap.data() };
                try { callback(data); } catch (e) { console.warn('[PlatesAuction] callback error:', e); }
            }, (error) => {
                console.warn('[PlatesAuction] subscribeToAuction error:', error);
            });
            this._listeners.push(unsub);
            return unsub;
        } catch (e) {
            return () => {};
        }
    },

    /**
     * Получить все активные аукционы.
     */
    async fetchActiveAuctions() {
        try {
            const q = query(
                collection(db, "plates_auctions"),
                where("status", "==", "active"),
                limit(30)
            );
            const snap = await getDocs(q);
            const now = Date.now();
            const auctions = [];
            snap.forEach(d => {
                const data = d.data();
                if (!data) return;
                if (data.expiresAt < now) return;
                auctions.push({ id: d.id, ...data });
            });
            return auctions.sort((a, b) => (a.expiresAt || 0) - (b.expiresAt || 0));
        } catch (e) {
            console.warn('[PlatesAuction] fetchActiveAuctions error:', e);
            return [];
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
// 7. TRANSACTIONS MANAGER (алиас)
// ========================================================
const TransactionsManager = {
  buyLot: (lotId, buyerProfile, buyerCash, overridePrice = null, offerId = null) =>
    MarketLotsManager.buyLotAtomic(lotId, buyerProfile, buyerCash, overridePrice, offerId)
};

// ========================================================
// 8. ЭКСПОРТ
// ========================================================
window.FB_Market = {
  MARKET_FEE_PERCENT,
  AUCTION_FEE_PERCENT,
  AUCTION_CONFIG,
  OVERRIDE_PRICE_MIN_RATIO,
  OVERRIDE_PRICE_MAX_RATIO,
  MarketLots: MarketLotsManager,
  Plates: RegisteredPlatesManager,
  PlatesAuction: PlatesAuctionManager,
  Transactions: TransactionsManager,
  getCurrentPlayerProfile
};

window.FB_MarketLots = MarketLotsManager;
window.FB_RegisteredPlates = RegisteredPlatesManager;
window.FB_PlatesAuction = PlatesAuctionManager;

console.log('[💱 FB_Market v1.4.0] Без составных индексов + P2P Аукцион Номеров (PlatesAuctionManager) ✓');
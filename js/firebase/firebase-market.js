// ========================================================
// js/firebase/firebase-market.js — P2P БИРЖА + REGISTERED PLATES + AUTO-LIQUIDATION (v1.6.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.6.0 (STALE LOTS AUTO-BUYOUT & INCIDENTS):
//   - Встроен автовыкуп зависших лотов (> 24 часов):
//       • При открытии биржи или запуске сессии проверяются устаревшие лоты игрока.
//       • Если лот провисел более 24 часов, он атомарно выкупается ботом с дисконтом 25–50%
//         либо списывается в рамках одного из 5 сценариев (мошенники, ДТП на стоянке, угон, эвакуация, перекупы).
//       • Создается системное уведомление в notifications с детальным описанием и выплатой.
//   - ФИКС: Снято искусственное ограничение на публикацию лотов в DEV/локальном режиме.
//   - ФИКС: Безопасный fetchLots без падения из-за отсутствия составных индексов.
//   - ФИКС: Подписка subscribeToLots обновляет активный экран P2P-биржи в телефоне (AppM).
//   - Сохранены все аукционы номеров, Registered Plates и атомарный выкуп.
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
const TTL_CONFIG = FB_Core.TTL_CONFIG || {
  market_lots: 259200000,
  notifications: 604800000,
  transactions: 7776000000
};
const LIMITS = FB_Core.LIMITS || {
  maxLotsPerFetch: 100
};

// ========================================================
// 2. КОНСТАНТЫ
// ========================================================
const MARKET_FEE_PERCENT = 0.03;
const AUCTION_FEE_PERCENT = 0.05;
const OVERRIDE_PRICE_MIN_RATIO = 0.10;
const OVERRIDE_PRICE_MAX_RATIO = 2.00;

const LOT_STALE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 часа

const AUCTION_CONFIG = {
    minBidStep: 5000,
    extensionSeconds: 15,
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
      photoUrl: window.state.player?.avatarUrl || null,
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
// 4. ХЕЛПЕР: клиентская сортировка
// ========================================================
function _sortByTimestampDesc(items) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const ta = Number(b.createdAt || b.timestamp || 0);
    const tb = Number(a.createdAt || a.timestamp || 0);
    return ta - tb;
  });
}

// ========================================================
// 5. ГЕНЕРАТОР ИНЦИДЕНТОВ ДЛЯ ЗАВИСШИХ ЛОТОВ
// ========================================================
function generateStaleLotIncident(lotName, askingPrice) {
  const randomPercent = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

  const scenarios = [
    {
      type: "scam_buyer",
      title: "🕵️‍♂️ Нарвались на мошенников!",
      generate: () => {
        const disc = randomPercent(30, 50);
        const payout = Math.max(0, Math.round(askingPrice * (1 - disc / 100)));
        return {
          disc,
          payout,
          text: `Лот «${lotName}» провисел более 24 часов. На сделку приехали мутные типы: запудрили мозги поддельными дефектами и навязали кабальную расписку с дисконтом ${disc}%. Получено: ${payout.toLocaleString()} ₽ (потери: -${(askingPrice - payout).toLocaleString()} ₽).`
        };
      }
    },
    {
      type: "urgent_bot_buyout",
      title: "🏢 Срочный автовыкуп салоном",
      generate: () => {
        const disc = randomPercent(25, 40);
        const payout = Math.max(0, Math.round(askingPrice * (1 - disc / 100)));
        return {
          disc,
          payout,
          text: `Поскольку покупатели не нашлись за сутки, бот-агрегатор выкупил «${lotName}» по программе экспресс-трейд-ин со скидкой ${disc}%. Выручено: ${payout.toLocaleString()} ₽.`
        };
      }
    },
    {
      type: "parking_crash",
      title: "💥 ДТП на стоянке продажи!",
      generate: () => {
        const disc = randomPercent(45, 60);
        const payout = Math.max(0, Math.round(askingPrice * (1 - disc / 100)));
        return {
          disc,
          payout,
          text: `Пока «${lotName}» стоял на авторынке, в него сдал задом грузовик! Виновник скрылся, а разбитый кузов пришлось экстренно отдать перекупам на разборку за ${payout.toLocaleString()} ₽ (уценка: -${disc}%).`
        };
      }
    },
    {
      type: "car_theft",
      title: "🚨 Автомобиль угнали с парковки!",
      generate: () => {
        const disc = 100;
        const payout = 0;
        return {
          disc,
          payout,
          text: `Спустя сутки простоя на неохраняемой площадке «${lotName}» был угнан неизвестными! Полиция разводит руками, автомобиль объявлен в розыск. Потери составили всю стоимость: ${askingPrice.toLocaleString()} ₽.`
        };
      }
    },
    {
      type: "impound_evacuation",
      title: "🚔 Эвакуация и штрафстоянка",
      generate: () => {
        const disc = randomPercent(35, 50);
        const payout = Math.max(0, Math.round(askingPrice * (1 - disc / 100)));
        return {
          disc,
          payout,
          text: `Место показа «${lotName}» оказалось зоной платной стоянки. Машину эвакуировали, а накопившийся штраф съел ${disc}% её стоимости. Чистый остаток после покрытия расходов: ${payout.toLocaleString()} ₽.`
        };
      }
    }
  ];

  const chosen = scenarios[Math.floor(Math.random() * scenarios.length)];
  const details = chosen.generate();

  return {
    type: chosen.type,
    title: chosen.title,
    discountPct: details.disc,
    payout: details.payout,
    text: details.text
  };
}

// ========================================================
// 6. REGISTERED PLATES MANAGER
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
    const targetUid = ownerId || FB_Core.Auth?.getVerifiedUserId?.();
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
    const targetUid = ownerId || FB_Core.Auth?.getVerifiedUserId?.();
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
// 7. MARKET LOTS MANAGER
// ========================================================
const MarketLotsManager = {
  _listeners: [],

  async checkAndLiquidateStaleLots(userId = null) {
    try {
      const targetUser = userId || getCurrentPlayerProfile()?.id;
      if (!targetUser) return 0;

      const now = Date.now();
      const q = query(
        collection(db, "market_lots"),
        where("sellerId", "==", String(targetUser)),
        where("status", "==", "active")
      );

      const snap = await getDocs(q);
      if (snap.empty) return 0;

      let liquidatedCount = 0;

      for (const d of snap.docs) {
        const lot = d.data();
        const lotId = d.id;
        const createdAt = Number(lot.createdAt || lot.timestamp || 0);

        if (createdAt && (now - createdAt >= LOT_STALE_TIMEOUT_MS)) {
          const askingPrice = Number(lot.price) || 50000;
          const lotName = lot.name || 'Транспорт';
          const incident = generateStaleLotIncident(lotName, askingPrice);

          const lotRef = doc(db, "market_lots", lotId);
          const notifId = "notif_liq_" + now + "_" + Math.random().toString(36).substring(2, 6);
          const notifRef = doc(db, "notifications", notifId);
          const txId = "tx_liq_" + now + "_" + Math.random().toString(36).substring(2, 6);
          const txRef = doc(db, "transactions", txId);

          await runTransaction(db, async (tx) => {
            const currentLotSnap = await tx.get(lotRef);
            if (!currentLotSnap.exists() || currentLotSnap.data().status !== "active") return;

            tx.update(lotRef, {
              status: "sold",
              buyerId: "bot_liquidator",
              buyerName: "Служба утилизации/рынок",
              soldAt: now,
              finalPrice: incident.payout,
              originalPrice: askingPrice,
              liquidationType: incident.type,
              liquidationDiscount: incident.discountPct
            });

            tx.set(notifRef, {
              toUser: String(targetUser),
              type: "deal_payout",
              title: incident.title,
              text: incident.text,
              amount: incident.payout,
              lotId: lotId,
              read: false,
              claimed: false,
              timestamp: now,
              expireAt: now + (TTL_CONFIG.notifications || 604800000)
            });

            tx.set(txRef, {
              tx_id: txId,
              lot_id: lotId,
              sellerId: String(targetUser),
              buyerId: "bot_liquidator",
              buyerName: "Автоликвидация",
              item: lotName,
              price: incident.payout,
              originalPrice: askingPrice,
              fee: 0,
              payout: incident.payout,
              timestamp: now
            });
          });

          liquidatedCount++;
          devLogFirestore('Stale lot liquidated', `${lotId} → ${incident.title} (${incident.payout} ₽)`);
        }
      }

      return liquidatedCount;
    } catch (e) {
      console.warn('[FB_Market] checkAndLiquidateStaleLots error:', e);
      return 0;
    }
  },

  async publishLot(lotData, sellerProfile) {
    const profile = sellerProfile || getCurrentPlayerProfile();
    if (!lotData || !profile?.id) return { success: false, error: "Нет данных" };

    const uidStr = String(profile.id);

    try {
      const lotId = String(lotData.id || lotData.lot_id || ("lot_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6)));
      const rawPrice = Math.max(1000, parseInt(lotData.price) || 50000);
      const now = Date.now();

      if (lotData.itemData && (lotData.type === 'car' || lotData.type === 'cars')) {
        if (typeof window.ensureCarIdentity === 'function') {
          const res = window.ensureCarIdentity(lotData.itemData);
          if (res) lotData.itemData = res;
        }
      }

      const payload = {
        lot_id: lotId,
        id: lotId,
        sellerId: uidStr,
        sellerName: profile.name || "Перекуп",
        sellerAvatar: profile.avatar || profile.photoUrl || '🧔',
        type: lotData.type || 'cars',
        name: lotData.name || 'Объект',
        price: rawPrice,
        img: lotData.img || '',
        fallback: lotData.fallback || '',
        itemData: lotData.itemData || {},
        status: "active",
        createdAt: now,
        timestamp: now,
        expireAt: now + (TTL_CONFIG.market_lots || 259200000)
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
            updatedAt: now
          }, { merge: true });
        }
      }

      await setDoc(doc(db, "market_lots", lotId), payload, { merge: true });

      devLogFirestore('publishLot OK', lotId);
      return { success: true, lotId, lot: payload };
    } catch (e) {
      devLogFirestore('publishLot ERROR', e.message || String(e));
      return { success: false, error: e.message };
    }
  },

  async fetchLots(force = false) {
    try {
      this.checkAndLiquidateStaleLots().catch(() => {});

      const now = Date.now();
      const q = query(
        collection(db, "market_lots"),
        where("status", "==", "active"),
        limit(LIMITS.maxLotsPerFetch || 100)
      );
      const snap = await getDocs(q);
      const lots = [];
      snap.forEach(d => {
        const item = d.data();
        if (!item) return;
        if (item.expireAt && item.expireAt < now) return;
        lots.push({ id: d.id, ...item });
      });
      const sorted = _sortByTimestampDesc(lots);
      devLogFirestore('fetchLots OK', `${sorted.length} лотов`);
      return sorted;
    } catch (e) {
      console.warn('[FB_Market] fetchLots filter query fallback:', e);
      try {
        const fallbackSnap = await getDocs(collection(db, "market_lots"));
        const fallbackLots = [];
        fallbackSnap.forEach(d => {
          const item = d.data();
          if (item && (item.status === 'active' || !item.status)) {
            fallbackLots.push({ id: d.id, ...item });
          }
        });
        const sorted = _sortByTimestampDesc(fallbackLots);
        devLogFirestore('fetchLots Fallback OK', `${sorted.length} лотов`);
        return sorted;
      } catch (err) {
        devLogFirestore('fetchLots ERROR', err.message || String(err));
        return [];
      }
    }
  },

  subscribeToLots(callback) {
    if (typeof callback !== 'function') return () => {};
    try {
      const q = query(
        collection(db, "market_lots"),
        where("status", "==", "active"),
        limit(LIMITS.maxLotsPerFetch || 100)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const now = Date.now();
        const lots = [];
        snap.forEach(d => {
          const item = d.data();
          if (!item) return;
          if (item.expireAt && item.expireAt < now) return;
          lots.push({ id: d.id, ...item });
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
        // 1. СНАЧАЛА ВСЕ READS
        const lotSnap = await tx.get(lotRef);
        if (!lotSnap.exists()) throw new Error("Лот снят с продажи!");

        const lot = lotSnap.data();
        if (lot.status !== "active") throw new Error("Лот уже куплен!");
        if (String(lot.sellerId) === String(profile.id)) throw new Error("Нельзя купить свой лот!");

        const sellerGarageRef = doc(db, "garages", String(lot.sellerId));
        const sellerGarageSnap = await tx.get(sellerGarageRef);

        let offerSnap = null;
        let offerExists = false;
        if (offerRef) {
          offerSnap = await tx.get(offerRef);
          offerExists = offerSnap.exists();
          if (offerExists) {
            const offerData = offerSnap.data();
            if (offerData.status !== 'accepted' && offerData.status !== 'completed') {
              offerRef = null;
              offerExists = false;
            } else if (String(offerData.buyerId) !== String(profile.id)) {
              offerRef = null;
              offerExists = false;
            }
          }
        }

        // 2. РАСЧЁТ ЦЕНЫ
        let finalPrice = Number(lot.price) || 0;
        if (overridePrice !== null && overridePrice !== undefined) {
          const ovr = Number(overridePrice);
          if (!isNaN(ovr) && ovr >= 1000) {
            const minAllowed = Math.round((Number(lot.price) || 0) * OVERRIDE_PRICE_MIN_RATIO);
            const maxAllowed = Math.round((Number(lot.price) || 0) * OVERRIDE_PRICE_MAX_RATIO);
            if (ovr >= minAllowed && ovr <= maxAllowed) {
              finalPrice = ovr;
            }
          }
        }

        if (Number(buyerCash) < finalPrice) {
          throw new Error("Недостаточно денег!");
        }

        const marketFee = Math.round(finalPrice * MARKET_FEE_PERCENT);
        const sellerPayout = finalPrice - marketFee;
        const nowTs = Date.now();

        // 3. ЗАТЕМ ВСЕ WRITES
        tx.update(lotRef, {
          status: "sold",
          buyerId: String(profile.id),
          buyerName: profile.name || "Покупатель",
          soldAt: nowTs,
          finalPrice: finalPrice,
          originalPrice: Number(lot.price) || 0
        });

        if (sellerGarageSnap.exists() && (lot.type === 'car' || lot.type === 'cars')) {
          const sGarageData = sellerGarageSnap.data();
          const targetCarUid = lot.itemData?.uid;
          const targetCarName = lot.name;
          const updatedCars = (sGarageData.cars || []).filter(c => {
            if (targetCarUid && c.uid) return String(c.uid) !== String(targetCarUid);
            return String(c.name) !== String(targetCarName);
          });
          tx.update(sellerGarageRef, {
            cars: updatedCars,
            updatedAt: nowTs
          });
        }

        tx.set(txRef, {
          tx_id: txId,
          lot_id: String(lotId),
          buyerId: String(profile.id),
          buyerName: profile.name || "Покупатель",
          sellerId: String(lot.sellerId),
          sellerName: lot.sellerName || "Продавец",
          item: lot.name,
          type: lot.type || 'cars',
          price: finalPrice,
          originalPrice: Number(lot.price) || 0,
          wasNegotiated: overridePrice !== null && overridePrice !== undefined && finalPrice !== Number(lot.price),
          fee: marketFee,
          payout: sellerPayout,
          offerId: offerId || null,
          timestamp: nowTs,
          expireAt: nowTs + (TTL_CONFIG.transactions || 7776000000)
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
          expireAt: nowTs + (TTL_CONFIG.notifications || 604800000)
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
    const targetUid = sellerId || FB_Core.Auth?.getVerifiedUserId?.();
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
          }
        } catch (offErr) {
          console.warn('[MarketLots] cancelLot офферы:', offErr);
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
// 8. PLATES AUCTION MANAGER
// ========================================================
const PlatesAuctionManager = {
    _listeners: [],

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

        const isOwned = await RegisteredPlatesManager.isPlateAvailable(plate);
        if (isOwned) {
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

                const myCash = window.state?.player?.cash || 0;
                if (myCash < amount) {
                    throw new Error(`Не хватает ${(amount - myCash).toLocaleString()} ₽`);
                }

                const now = Date.now();
                let newExpiresAt = auction.expiresAt;
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
                    const profile = getCurrentPlayerProfile();
                    if (!profile || String(auction.sellerId) !== String(profile.id)) {
                        throw new Error("Аукцион ещё активен, дождитесь окончания");
                    }
                }

                if (hasBidder) {
                    const winnerId = String(auction.highestBidderId);
                    const finalPrice = auction.currentBid;
                    const fee = Math.round(finalPrice * AUCTION_FEE_PERCENT);
                    const sellerPayout = finalPrice - fee;

                    const plateClean = auction.plate;
                    const pDocId = plateClean.replace(/\s+/g, "_");

                    tx.set(doc(db, "registered_plates", pDocId), {
                        plate: plateClean,
                        ownerId: winnerId,
                        carId: null,
                        status: 'owned',
                        updatedAt: now
                    }, { merge: true });

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
                        expireAt: now + (TTL_CONFIG.notifications || 604800000)
                    });

                    const sellerNotifRef = doc(db, "notifications", "notif_" + now + "_" + Math.random().toString(36).substring(2, 6));
                    tx.set(sellerNotifRef, {
                        toUser: String(auction.sellerId),
                        type: "plate_auction_sold",
                        title: "💰 Ваш номер продан на аукционе!",
                        text: `Госномер «${plateClean}» ушёл за ${finalPrice.toLocaleString()} ₽. Вам начислено: +${sellerPayout.toLocaleString()} ₽.`,
                        plate: plateClean,
                        amount: sellerPayout,
                        read: false,
                        claimed: false,
                        timestamp: now,
                        expireAt: now + (TTL_CONFIG.notifications || 604800000)
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
                try { callback(data); } catch (e) {}
            }, (error) => {
                console.warn('[PlatesAuction] subscribeToAuction error:', error);
            });
            this._listeners.push(unsub);
            return unsub;
        } catch (e) {
            return () => {};
        }
    },

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
// 9. ПРЯМОЙ ВЫКУП P2P ЛОТА (КНОПКА «ВЫКУПИТЬ»)
// ========================================================
window.buyP2PLotDirect = async function(lotId) {
  const toast = (m) => { if (typeof showToast === 'function') showToast(m); };
  if (!lotId) return toast("❌ ID лота не указан");

  const profile = getCurrentPlayerProfile();
  if (!profile?.id) return toast("❌ Не удалось определить ваш профиль");

  const myCash = window.state?.player?.cash || 0;
  toast("⏳ Оформление выкупа через P2P биржу...");

  try {
    const res = await MarketLotsManager.buyLotAtomic(lotId, profile, myCash);
    if (!res.success) {
      if (window.AudioFx) window.AudioFx.play('error');
      return toast(`❌ ${res.error || 'Ошибка выкупа'}`);
    }

    const boughtLot = res.lot;
    const finalPrice = res.finalPrice;

    window.state.player.cash -= finalPrice;

    if (boughtLot.type === 'car' || boughtLot.type === 'cars') {
      const carData = Object.assign({}, boughtLot.itemData || {});
      carData.name = boughtLot.name;
      carData.purchaseCost = finalPrice;
      carData.customPlate = carData.plate || boughtLot.plate || "ТРАНЗИТ";
      if (!window.state.garage) window.state.garage = [];
      if (typeof window.ensureCarIdentity === 'function') window.ensureCarIdentity(carData);
      window.state.garage.push(carData);
    }

    if (Array.isArray(window.state.p2pMarketListings)) {
      window.state.p2pMarketListings = window.state.p2pMarketListings.filter(l =>
        l && String(l.id || l.lot_id) !== String(lotId)
      );
    }
    if (Array.isArray(window.state.marketFeed)) {
      window.state.marketFeed = window.state.marketFeed.filter(l =>
        l && String(l.id || l.lot_id) !== String(lotId)
      );
    }

    if (typeof saveState === 'function') saveState();
    if (typeof updateHeaderUI === 'function') updateHeaderUI();
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
    if (typeof renderGarage === 'function') renderGarage();

    const area = document.getElementById('p2pLotsArea');
    if (area && window.AppM?.renderP2PLotsHtml) {
      area.innerHTML = window.AppM.renderP2PLotsHtml(window.AppM.marketFilter || 'cars');
    }

    if (window.AudioFx) {
      window.AudioFx.play('win');
      window.AudioFx.haptic('success');
    }

    toast(`🎉 «${boughtLot.name}» успешно выкуплен за ${finalPrice.toLocaleString()} ₽!`);
    setTimeout(() => { if (typeof switchTab === 'function') switchTab("tabGarage"); }, 500);
  } catch (err) {
    console.error('[FB_Market] buyP2PLotDirect exception:', err);
    toast(`❌ Ошибка: ${err.message || String(err)}`);
  }
};

// ========================================================
// 10. АВТОПОДПИСКА НА ОБНОВЛЕНИЯ БИРЖИ В РЕАЛЬНОМ ВРЕМЕНИ
// ========================================================
if (typeof window !== 'undefined') {
  MarketLotsManager.subscribeToLots((activeLots) => {
    if (window.state) {
      window.state.p2pMarketListings = activeLots;
      if (typeof renderMarketFeed === 'function') {
        renderMarketFeed();
      }
      const area = document.getElementById('p2pLotsArea');
      if (area && window.AppM?.renderP2PLotsHtml) {
        area.innerHTML = window.AppM.renderP2PLotsHtml(window.AppM.marketFilter || 'cars');
      }
    }
  });

  // Запуск проверки зависших лотов при старте скрипта
  setTimeout(() => {
    MarketLotsManager.checkAndLiquidateStaleLots().catch(() => {});
  }, 3500);
}

// ========================================================
// 11. ЭКСПОРТ
// ========================================================
window.FB_Market = {
  MARKET_FEE_PERCENT,
  AUCTION_FEE_PERCENT,
  AUCTION_CONFIG,
  OVERRIDE_PRICE_MIN_RATIO,
  OVERRIDE_PRICE_MAX_RATIO,
  LOT_STALE_TIMEOUT_MS,
  MarketLots: MarketLotsManager,
  Plates: RegisteredPlatesManager,
  PlatesAuction: PlatesAuctionManager,
  Transactions: {
    buyLot: (lotId, buyerProfile, buyerCash, overridePrice = null, offerId = null) =>
      MarketLotsManager.buyLotAtomic(lotId, buyerProfile, buyerCash, overridePrice, offerId)
  },
  getCurrentPlayerProfile,
  generateStaleLotIncident
};

window.FB_MarketLots = MarketLotsManager;
window.FB_RegisteredPlates = RegisteredPlatesManager;
window.FB_PlatesAuction = PlatesAuctionManager;

if (window.FB_Bridge) {
  window.FB_Bridge.MarketLots = MarketLotsManager;
  window.FB_Bridge.Plates = RegisteredPlatesManager;
}

console.log('[💱 FB_Market v1.6.0] Полная версия: Автовыкуп >24ч, Атомарный выкуп, Аукционы, Гаражи и подписка AppM ✓');
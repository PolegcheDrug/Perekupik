// ========================================================
// js/firebase-market.js — P2P БИРЖА + REGISTERED PLATES (v1.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.1.0 (SPRINT 2 — OVERRIDE PRICE):
//   - buyLotAtomic теперь принимает 4-й параметр overridePrice
//   - Если overridePrice валиден — используется как finalPrice
//   - Все расчёты (комиссия, payout, баланс покупателя) идут от finalPrice
//   - В transactions пишется именно сторгованная цена
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
   * @param {Object} lotData — { type, name, price, itemData }
   * @param {Object} sellerProfile — { id, name }
   */
  async publishLot(lotData, sellerProfile) {
    const profile = sellerProfile || getCurrentPlayerProfile();
    if (!lotData || !profile?.id) return { success: false, error: "Нет данных" };
    if (String(profile.id).startsWith('guest_') || String(profile.id).startsWith('p_')) {
      return { success: false, error: "P2P доступен только через Telegram" };
    }

    try {
      const lotId = "lot_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const rawPrice = Math.max(1000, parseInt(lotData.price) || 50000);

      if (lotData.itemData && (lotData.type === 'car' || lotData.type === 'cars')) {
        if (typeof window.ensureCarIdentity === 'function') {
          lotData.itemData = window.ensureCarIdentity(lotData.itemData);
        }
      }

      // ⭐ Проверка на дубликат через транзакцию
      const dupCheckQuery = query(
        collection(db, "market_lots"),
        where("sellerId", "==", String(profile.id)),
        where("status", "==", "active"),
        where("name", "==", String(lotData.name || "")),
        limit(1)
      );
      const dupSnap = await getDocs(dupCheckQuery);
      if (!dupSnap.empty) {
        return { success: false, error: "У вас уже есть активный лот с таким же названием" };
      }

      const payload = {
        lot_id: lotId,
        id: lotId,
        sellerId: String(profile.id),
        sellerName: profile.name || "Перекуп",
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
            ownerId: String(profile.id),
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
   * Получить активные лоты (с кэшем).
   */
  async fetchLots(force = false) {
    try {
      const now = Date.now();
      const q = query(
        collection(db, "market_lots"),
        where("status", "==", "active"),
        orderBy("timestamp", "desc"),
        limit(LIMITS.maxLotsPerFetch)
      );
      const snap = await getDocs(q);
      const lots = [];
      snap.forEach(d => {
        const item = d.data();
        if (item.expireAt && item.expireAt < now) return;
        lots.push(item);
      });
      devLogFirestore('fetchLots OK', `${lots.length} лотов`);
      return lots;
    } catch (e) {
      devLogFirestore('fetchLots ERROR', e.message || String(e));
      return [];
    }
  },

  /**
   * Real-time подписка на активные лоты.
   * @param {Function} callback — вызывается с массивом лотов
   * @returns {Function} unsubscribe
   */
  subscribeToLots(callback) {
    if (typeof callback !== 'function') return () => {};
    try {
      const now = Date.now();
      const q = query(
        collection(db, "market_lots"),
        where("status", "==", "active"),
        orderBy("timestamp", "desc"),
        limit(LIMITS.maxLotsPerFetch)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const lots = [];
        snap.forEach(d => {
          const item = d.data();
          if (item.expireAt && item.expireAt < now) return;
          lots.push(item);
        });
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
   * ⭐ v1.1.0: Атомарная покупка лота через транзакцию.
   *
   * @param {string} lotId — ID лота
   * @param {Object} buyerProfile — профиль покупателя
   * @param {number} buyerCash — баланс покупателя
   * @param {number|null} overridePrice — ⭐ НОВОЕ: сторгованная цена (если null — используется lot.price)
   * @returns {Promise<{success, lot, finalPrice?, error}>}
   */
  async buyLotAtomic(lotId, buyerProfile, buyerCash, overridePrice = null) {
    const profile = buyerProfile || getCurrentPlayerProfile();
    if (!lotId || !profile?.id) return { success: false, error: "Неверные данные" };

    const lotRef = doc(db, "market_lots", String(lotId));
    const txId = "tx_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const txRef = doc(db, "transactions", txId);
    const notifRef = doc(db, "notifications", "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6));

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
          // - не ниже 10% от lot.price
          // - не выше 200% от lot.price
          const minAllowed = Math.round((Number(lot.price) || 0) * OVERRIDE_PRICE_MIN_RATIO);
          const maxAllowed = Math.round((Number(lot.price) || 0) * OVERRIDE_PRICE_MAX_RATIO);

          if (ovr < minAllowed || ovr > maxAllowed) {
            devLogFirestore(
              'buyLotAtomic overridePrice отклонён',
              `override=${ovr}, lotPrice=${lot.price}, min=${minAllowed}, max=${maxAllowed}`
            );
            // Не блокируем сделку — просто игнорируем подозрительный override
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
          finalPrice: finalPrice,          // ⭐ фиксируем сторгованную цену
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
          price: finalPrice,               // ⭐ сторгованная цена
          originalPrice: Number(lot.price) || 0,
          wasNegotiated: overridePrice !== null && overridePrice !== undefined && finalPrice !== Number(lot.price),
          fee: marketFee,
          payout: sellerPayout,
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
  buyLot: (lotId, buyerProfile, buyerCash, overridePrice = null) =>
    MarketLotsManager.buyLotAtomic(lotId, buyerProfile, buyerCash, overridePrice)
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

console.log('[💱 FB_Market v1.1.0] P2P биржа + overridePrice в buyLotAtomic + RegisteredPlates ✓');

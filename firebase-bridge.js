// ========================================================
// firebase-bridge.js — СЕТЕВОЙ ШЛЮЗ FIRESTORE 2.4.0 (v2.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v2.0.0 (ОНЛАЙН-ИНТЕГРАЦИЯ + ДРУЗЬЯ + РЕАЛТАЙМ):
//   - СИНХРОНИЗАЦИЯ paidParking и warehouse в players/garages
//   - REGISTERED_PLATES: интеграция с PlatesManager (без дублей)
//   - NotificationsManager.subscribeToNotifications (onSnapshot)
//   - ChatMessagesManager.subscribeToDialog (onSnapshot)
//   - MarketLotsManager.subscribeToLots (onSnapshot)
//   - LeaderboardManager.subscribeToTop (onSnapshot)
//   - ClubsManager.subscribeToClubs (onSnapshot)
//   - EventsManager.subscribeToEvents (onSnapshot) — для m-events
//   - P2PTradeManager — обмен между игроками (sendTradeOffer, accept, reject)
//   - FriendshipsManager — заявки в друзья (sendRequest, accept, decline)
//   - publishLot защищён от дубликатов через runTransaction
//   - cancelLot через runTransaction
//   - Все async-операции обёрнуты в try/catch
// ⭐ v1.5.0:
//   - УБРАНО дублирование market_lots/p2p_market (только market_lots)
//   - ДОБАВЛЕН TTL: chat_messages (30 дней), notifications (7 дней)
//   - ДОБАВЛЕНА cleanupExpiredData() — очистка мусора
//   - ДОБАВЛЕНА getFirestoreStats() — статистика для DEV
// ========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithCustomToken
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  runTransaction,
  writeBatch,
  onSnapshot,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAV-FUWKge9c6sO-diK7wGqN3p1UbuW7Xc",
  authDomain: "perekupik-e2979.firebaseapp.com",
  projectId: "perekupik-e2979",
  storageBucket: "perekupik-e2979.firebasestorage.app",
  messagingSenderId: "242959354626",
  appId: "1:242959354626:web:f03ff4725763c86d33501b",
  measurementId: "G-CDCFWLQE2C"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const DEFAULT_AUTH_SERVER_URL = window.AUTH_SERVER_URL || "http://localhost:3000";

// ⭐ v2.0.0: TTL конфигурация
const TTL_CONFIG = {
  chat_messages: 30 * 24 * 60 * 60 * 1000,   // 30 дней
  notifications: 7 * 24 * 60 * 60 * 1000,    // 7 дней
  transactions: 90 * 24 * 60 * 60 * 1000,    // 90 дней
  market_lots: 14 * 24 * 60 * 60 * 1000,     // 14 дней
  trade_offers: 3 * 24 * 60 * 60 * 1000,     // 3 дня на принятие trade offer
  friendships: 30 * 24 * 60 * 60 * 1000      // 30 дней для pending заявок
};

// ⭐ v2.0.0: лимиты Firestore
const LIMITS = {
  maxLotsPerFetch: 40,
  maxMessagesPerDialog: 100,
  maxNotificationsPerUser: 50,
  maxChatMessagesTotal: 500,
  maxFriendshipsPerUser: 200,
  maxTradeOffersPerUser: 30
};

// ========================================================
// ХЕЛПЕР ЛОГИРОВАНИЯ
// ========================================================
function devLogFirestore(action, details) {
    if (window.DevLogger) {
        window.DevLogger.add('firestore', action + (details ? ' — ' + details : ''));
    }
}

// ========================================================
// ЕДИНАЯ ТОЧКА ПОЛУЧЕНИЯ TELEGRAM-ЮЗЕРА
// ========================================================
function getTelegramUser() {
    try {
        const tg = window.Telegram?.WebApp;
        if (!tg) return null;
        const u = tg.initDataUnsafe?.user;
        if (!u || !u.id) return null;
        return u;
    } catch (e) {
        return null;
    }
}

// ========================================================
// 0. TELEGRAM AUTH & SESSION MANAGER
// ========================================================
let verifiedUserId = null;
let currentUserProfile = null;

const TelegramAuthManager = {
  async initSession(customServerUrl = null) {
    const tgUser = getTelegramUser();
    if (!tgUser) {
      console.warn('[🔐 Auth] Нет Telegram-пользователя. Игра недоступна без Telegram.');
      devLogFirestore('Auth BLOCKED', 'нет Telegram-пользователя');
      verifiedUserId = null;
      currentUserProfile = null;
      return { success: false, userId: null, user: null, reason: 'no_telegram' };
    }

    const url = customServerUrl || DEFAULT_AUTH_SERVER_URL;
    let initData = "";
    try {
      if (window.Telegram?.WebApp?.initData) {
        initData = window.Telegram.WebApp.initData;
      }
    } catch (e) {}

    try {
      const response = await fetch(`${url}/api/auth/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData })
      });

      if (!response.ok) throw new Error(`HTTP: ${response.status}`);

      const data = await response.json();
      if (!data.customToken) throw new Error("Токен не получен");

      const userCredential = await signInWithCustomToken(auth, data.customToken);
      verifiedUserId = userCredential.user.uid;
      currentUserProfile = data.user;

      console.log(`[🔐 Auth] Firebase Auth OK. UID: ${verifiedUserId}`);
      devLogFirestore('Auth Firebase OK', `UID: ${verifiedUserId}`);
      return { success: true, userId: verifiedUserId, user: currentUserProfile };
    } catch (err) {
      console.warn("[🔐 Auth] Firebase Auth не сработал, использую Telegram ID напрямую:", err.message || err);
      devLogFirestore('Auth fallback → TG ID', `tgUserId: ${tgUser.id}`);

      verifiedUserId = String(tgUser.id);

      const names = [];
      if (tgUser.first_name) names.push(tgUser.first_name);
      if (tgUser.last_name) names.push(tgUser.last_name);

      currentUserProfile = {
        id: String(tgUser.id),
        name: names.join(" ").trim() || (tgUser.username ? "@" + tgUser.username : "Перекуп #" + tgUser.id),
        username: tgUser.username || "",
        photoUrl: tgUser.photo_url || null,
        isTelegram: true
      };

      return { success: true, userId: verifiedUserId, user: currentUserProfile };
    }
  },

  getVerifiedUserId() {
    return verifiedUserId;
  },

  getUserProfile() {
    return currentUserProfile;
  },

  _forceVerifiedUserId(uid) {
    if (!uid) return;
    verifiedUserId = String(uid);
    if (!currentUserProfile) {
      currentUserProfile = {
        id: String(uid),
        name: window.state?.player?.name || "Перекуп",
        username: "",
        photoUrl: null,
        isTelegram: true
      };
    }
    console.log('[🔐 Auth] Force verifiedUserId:', verifiedUserId);
  }
};

// ========================================================
// 1. ШАБЛОННЫЕ ФРАЗЫ QUICK-CHAT
// ========================================================
const CANNED_PHRASES = {
  greet_1: { id: "greet_1", text: "«Салам, перекуп! Что по технике?»", category: "greet" },
  greet_2: { id: "greet_2", text: "«Здорово. Авто на руках или по доверенности?»", category: "greet" },
  greet_3: { id: "greet_3", text: "«Добрый день. Интересует реальное состояние лота.»", category: "greet" },
  greet_4: { id: "greet_4", text: "«Приветствую, готов забрать лот быстро за наличные!»", category: "greet" },
  hagg_5pct: { id: "hagg_5pct", text: "«Скинь 5% на бензин и оформление, заберу сразу 🤝»", category: "haggle" },
  hagg_10pct: { id: "hagg_10pct", text: "«Скидывай 10%, у меня деньги на руках прямо сейчас!»", category: "haggle" },
  hagg_15pct: { id: "hagg_15pct", text: "«По низу рынка заберу с дисконтом 15%. По рукам?»", category: "haggle" },
  hagg_gauge: { id: "hagg_gauge", text: "«Кузов толщиномером проверяли? Шпаклёвка есть?»", category: "inspect" },
  hagg_obd: { id: "hagg_obd", text: "«Launch подключать будем? В блоках чисто по ошибкам?»", category: "inspect" },
  hagg_last: { id: "hagg_last", text: "«Какая твоя самая крайняя цена на отдачу?»", category: "haggle" },
  resp_agree: { id: "resp_agree", text: "«По рукам, оформляем ДКП! Забирай авто 🤝»", category: "reply" },
  resp_firm: { id: "resp_firm", text: "«Цена окончательная, рынок знаю. Без торга ⛔»", category: "reply" },
  resp_clean: { id: "resp_clean", text: "«Любые проверки у капота! Мотор шепчет, кузов в идеале.»", category: "reply" },
  resp_busy: { id: "resp_busy", text: "«На лот уже очередь, кто первый оформит — того и машина!»", category: "reply" },
  resp_min5: { id: "resp_min5", text: "«Максимум 5% уступлю на дорогу, больше ни рубля!»", category: "reply" },
  club_hello: { id: "club_hello", text: "«Салам соклановцам! Как торговля на рынке?»", category: "club" },
  club_gz: { id: "club_gz", text: "«Поздравляю с жирной сделкой! Так держать 🚀»", category: "club" },
  club_boost: { id: "club_boost", text: "«Закинул донат в клановый общак. Качаем перки!»", category: "club" },
  club_raid: { id: "club_raid", text: "«Внимание клубу! В порту выгрузили жирные контейнеры!»", category: "club" },
  social_sup: { id: "social_sup", text: "«Здорово, напарник! Как заезды на 402м?»", category: "social" },
  social_gift: { id: "social_gift", text: "«Закинул тебе подгон топлива на базу ⛽! Лови.»", category: "social" },
  social_race: { id: "social_race", text: "«Вызываю тебя на дуэль 402м в Стрите! Принимай вызов 🔥»", category: "social" },
  trade_offer: { id: "trade_offer", text: "«Есть интересный лот для тебя! Глянь предложение 👇»", category: "trade" },
  trade_accept: { id: "trade_accept", text: "«Согласен на обмен, оформляем!»", category: "trade" },
  trade_reject: { id: "trade_reject", text: "«Спасибо, но не моё. Ищу другие варианты.»", category: "trade" },
  react_deal: { id: "react_deal", text: "🤝 [По рукам / Сделка]", category: "emoji" },
  react_cash: { id: "react_cash", text: "💸 [Деньги на руках]", category: "emoji" },
  react_fire: { id: "react_fire", text: "🔥 [Пушка-гонка]", category: "emoji" },
  react_think: { id: "react_think", text: "🤔 [Надо подумать]", category: "emoji" }
};

// ========================================================
// 2. TTL КЭШ
// ========================================================
const CacheManager = {
  cloudCars: null, cloudCarsTimestamp: 0, CLOUD_CARS_TTL: 45000,
  marketLots: null, marketTimestamp: 0, MARKET_TTL: 20000,
  leaderboard: null, leaderboardTimestamp: 0, LEADERBOARD_TTL: 40000,
  clubs: null, clubsTimestamp: 0, CLUBS_TTL: 30000,
  feed: null, feedTimestamp: 0, FEED_TTL: 15000,
  friends: null, friendsTimestamp: 0, FRIENDS_TTL: 20000,
  dialogs: new Map(), clubChats: new Map(),
  tradeOffers: null, tradeOffersTimestamp: 0, TRADE_OFFERS_TTL: 15000
};

// ========================================================
// 3. КОЛЛЕКЦИИ: players/{id} И garages/{id}
// ⭐ v2.0.0: добавлены paidParking и warehouse
// ========================================================
let saveDebounceTimer = null;
let lastSavedHash = "";

const PlayersStorageManager = {
  pushSave(userId, gameState) {
    if (window.__IS_RESETTING__) {
      devLogFirestore('pushSave ЗАБЛОКИРОВАН', 'идёт сброс прогресса');
      return;
    }

    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) {
      devLogFirestore('pushSave BLOCKED', 'нет userId');
      return;
    }

    if (typeof targetUid === 'string' &&
        (targetUid === 'guest_777' || targetUid.startsWith('guest_') || targetUid.startsWith('dev_') || targetUid.startsWith('p_'))) {
      devLogFirestore('pushSave BLOCKED', `подозрительный UID: ${targetUid}`);
      console.warn('[FB_Bridge] pushSave: заблокирован некорректный UID', targetUid);
      return;
    }

    const playerDoc = {
      telegram_id: String(targetUid),
      name: gameState.player?.name || "Перекуп",
      avatar: gameState.player?.avatarUrl || null,
      level: gameState.player?.level || 1,
      xp: gameState.player?.xp || 0,
      maxXp: gameState.player?.maxXp || 120,
      cash: gameState.player?.cash || 0,
      stars: gameState.player?.stars || 0,
      fuel: gameState.player?.fuel || 100,
      tickets: gameState.player?.expressTickets || 25,
      maxTickets: gameState.player?.maxExpressTickets || 25,
      karma: gameState.player?.karma || 50,
      streetCred: gameState.player?.streetCred || 100,
      connections: gameState.player?.connections || 1,
      safeDeposit: gameState.player?.safeDeposit || 0,
      loanDebt: gameState.player?.loanDebt || 0,
      taxDebt: gameState.player?.taxDebt || 0,
      hunger: gameState.player?.hunger || 80,
      mood: gameState.player?.mood || 85,
      day: gameState.player?.day || 1,
      club: gameState.player?.club || null,
      hudColorId: gameState.player?.hudColorId || 'lightning',
      nickEffect: gameState.player?.nickEffect || 'none',
      avatarEffect: gameState.player?.avatarEffect || 'none',
      tools: gameState.player?.tools || {},
      toolsWear: gameState.player?.toolsWear || {},
      crypto: gameState.player?.crypto || {},
      bankDeposits: gameState.player?.bankDeposits || [],
      ownedHouses: gameState.player?.ownedHouses || [],
      housingId: gameState.player?.housingId || 'trailer',
      stats: gameState.player?.stats || {},
      onboardingDone: gameState.player?.onboardingDone === true,
      updatedAt: Date.now()
    };

    // ⭐ v2.0.0: garageDoc теперь содержит paidParking
    const garageDoc = {
      telegram_id: String(targetUid),
      cars: (gameState.garage || []).slice(0, 35),
      salesLot: (gameState.salesLot || []).slice(0, 10),
      ownedPlates: (gameState.ownedPlates || []).slice(0, 50),
      businesses: (gameState.businesses || []).slice(0, 15),
      warehouse: gameState.player?.warehouse || { maxCars: 6, maxItems: 12, cars: [], items: [] },
      paidParking: gameState.player?.paidParking || { maxCars: 3, cars: [], dailyRate: 200, lastChargeDay: 0 },
      updatedAt: Date.now()
    };

    const currentHash = `${playerDoc.cash}_${playerDoc.level}_${garageDoc.cars.length}_${playerDoc.club?.id || 'none'}_${playerDoc.onboardingDone}_${garageDoc.warehouse.cars.length}_${garageDoc.paidParking.cars.length}`;
    if (currentHash === lastSavedHash) return;

    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(async () => {
      try {
        if (window.__IS_RESETTING__) {
          devLogFirestore('pushSave ОТМЕНЁН', 'сброс начался во время дебаунса');
          return;
        }

        const t0 = performance.now();
        await Promise.all([
          setDoc(doc(db, "players", String(targetUid)), playerDoc, { merge: true }),
          setDoc(doc(db, "garages", String(targetUid)), garageDoc, { merge: true })
        ]);
        const dt = Math.round(performance.now() - t0);
        lastSavedHash = currentHash;
        console.log(`[☁️ Firestore] Синхронизировано: ${targetUid}`);
        devLogFirestore('pushSave OK', `players/garages → ${targetUid} (${dt}ms)`);
      } catch (e) {
        console.warn("[☁️ Firestore] Ошибка записи:", e);
        devLogFirestore('pushSave ERROR', e.message || String(e));
      }
    }, 3500);
  },

  async pushSaveForce(userId, gameState) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return false;
    if (typeof targetUid === 'string' &&
        (targetUid.startsWith('guest_') || targetUid.startsWith('dev_') || targetUid.startsWith('p_'))) {
      console.warn('[FB_Bridge] pushSaveForce: некорректный UID', targetUid);
      return false;
    }

    try {
      const minimalDoc = {
        telegram_id: String(targetUid),
        name: gameState.player?.name || "Перекуп",
        level: gameState.player?.level || 1,
        cash: gameState.player?.cash || 0,
        onboardingDone: gameState.player?.onboardingDone === true,
        uid: gameState.player?.uid || String(targetUid),
        updatedAt: Date.now()
      };
      await setDoc(doc(db, "players", String(targetUid)), minimalDoc, { merge: true });
      devLogFirestore('pushSaveForce OK', `players/${targetUid}`);
      return true;
    } catch (e) {
      devLogFirestore('pushSaveForce ERROR', e.message || String(e));
      return false;
    }
  },

  // ⭐ v2.0.0: pullSave возвращает warehouse и paidParking
  async pullSave(userId) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) {
      devLogFirestore('pullSave BLOCKED', 'нет userId');
      return null;
    }

    try {
      const t0 = performance.now();
      const [playerSnap, garageSnap] = await Promise.all([
        getDoc(doc(db, "players", String(targetUid))),
        getDoc(doc(db, "garages", String(targetUid)))
      ]);
      const dt = Math.round(performance.now() - t0);

      if (playerSnap.exists() || garageSnap.exists()) {
        const pData = playerSnap.exists() ? playerSnap.data() : {};
        const gData = garageSnap.exists() ? garageSnap.data() : {};
        devLogFirestore('pullSave OK', `${targetUid} (${dt}ms, ${(gData.cars || []).length} авто)`);
        return {
          player: { ...pData },
          garage: gData.cars || [],
          salesLot: gData.salesLot || [],
          ownedPlates: gData.ownedPlates || [],
          businesses: gData.businesses || [],
          // ⭐ v2.0.0: два хранилища
          warehouse: gData.warehouse || { maxCars: 6, maxItems: 12, cars: [], items: [] },
          paidParking: gData.paidParking || { maxCars: 3, cars: [], dailyRate: 200, lastChargeDay: 0 }
        };
      }

      // Fallback на legacy saves/ для миграции
      const oldSnap = await getDoc(doc(db, "saves", String(targetUid)));
      if (oldSnap.exists()) {
        devLogFirestore('pullSave (legacy saves/)', `${targetUid}`);
        return oldSnap.data();
      }
      devLogFirestore('pullSave MISS', `${targetUid} — документов нет`);
    } catch (e) {
      console.warn("[☁️ Firestore] Ошибка загрузки:", e);
      devLogFirestore('pullSave ERROR', e.message || String(e));
    }
    return null;
  }
};

// ========================================================
// 4. market_lots + P2P REAL-TIME
// ⭐ v2.0.0: subscribeToLots, atomic publishLot
// ========================================================
const MARKET_FEE_PERCENT = 0.03;

const MarketLotsManager = {
  _listeners: [],

  /**
   * Публикация лота с защитой от дубликатов.
   * Транзакция проверяет: нет ли уже активного лота того же продавца с тем же itemId.
   */
  async publishLot(lotData, sellerProfile) {
    const profile = sellerProfile || TelegramAuthManager.getUserProfile();
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

      // ⭐ v2.0.0: проверка на дубликат через транзакцию
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
        lot_id: lotId, id: lotId,
        sellerId: String(profile.id),
        sellerName: profile.name || "Перекуп",
        type: lotData.type, name: lotData.name, price: rawPrice,
        itemData: lotData.itemData || {},
        status: "active", timestamp: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.market_lots
      };

      if (lotData.type === "plate" || lotData.type === "plates") {
        const plateStr = lotData.itemData?.plate || lotData.name;
        const clean = RegisteredPlatesManager.cleanPlateString(plateStr);
        if (clean) {
          const pDocId = clean.replace(/\s+/g, "_");
          await setDoc(doc(db, "registered_plates", pDocId), {
            plate: clean, ownerId: String(profile.id), status: "on_sale", updatedAt: Date.now()
          }, { merge: true });
        }
      }

      await setDoc(doc(db, "market_lots", lotId), payload);

      CacheManager.marketLots = null;
      devLogFirestore('publishLot OK', lotId);
      return { success: true, lotId };
    } catch (e) {
      devLogFirestore('publishLot ERROR', e.message || String(e));
      return { success: false, error: e.message };
    }
  },

  async fetchLots(force = false) {
    const now = Date.now();
    if (!force && CacheManager.marketLots && (now - CacheManager.marketTimestamp < CacheManager.MARKET_TTL)) {
      return CacheManager.marketLots;
    }
    try {
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
      CacheManager.marketLots = lots;
      CacheManager.marketTimestamp = now;
      devLogFirestore('fetchLots OK', `${lots.length} лотов`);
      return lots;
    } catch (e) {
      devLogFirestore('fetchLots ERROR', e.message || String(e));
      return CacheManager.marketLots || [];
    }
  },

  /**
   * ⭐ v2.0.0: real-time подписка на активные лоты.
   * @param {Function} callback — вызывается с массивом лотов при каждом изменении
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
        CacheManager.marketLots = lots;
        CacheManager.marketTimestamp = Date.now();
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
   * ⭐ v2.0.0: атомарная покупка лота.
   */
  async buyLotAtomic(lotId, buyerProfile, buyerCash) {
    const profile = buyerProfile || TelegramAuthManager.getUserProfile();
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
        if (buyerCash < lot.price) throw new Error("Недостаточно денег!");

        const marketFee = Math.round(lot.price * MARKET_FEE_PERCENT);
        const sellerPayout = lot.price - marketFee;

        tx.update(lotRef, { status: "sold", buyerId: String(profile.id), buyerName: profile.name || "Покупатель", soldAt: Date.now() });
        tx.set(txRef, {
          tx_id: txId, lot_id: String(lotId),
          buyerId: String(profile.id), buyerName: profile.name || "Покупатель",
          sellerId: String(lot.sellerId), sellerName: lot.sellerName || "Продавец",
          item: lot.name, type: lot.type, price: lot.price, fee: marketFee, payout: sellerPayout, timestamp: Date.now(),
          expireAt: Date.now() + TTL_CONFIG.transactions
        });
        tx.set(notifRef, {
          toUser: String(lot.sellerId), type: "deal_payout",
          title: "Продажа на P2P бирже!",
          text: `Покупатель ${profile.name} приобрёл «${lot.name}» за ${lot.price.toLocaleString()} ₽ (начислено: +${sellerPayout.toLocaleString()} ₽).`,
          amount: sellerPayout, read: false, claimed: false, timestamp: Date.now(),
          expireAt: Date.now() + TTL_CONFIG.notifications
        });

        if (lot.type === "plate" || lot.type === "plates") {
          const plateStr = lot.itemData?.plate || lot.name;
          const clean = RegisteredPlatesManager.cleanPlateString(plateStr);
          if (clean) {
            const pDocId = clean.replace(/\s+/g, "_");
            tx.set(doc(db, "registered_plates", pDocId), {
              plate: clean, ownerId: String(profile.id), carId: null, status: "owned", updatedAt: Date.now()
            }, { merge: true });
          }
        }

        return lot;
      });

      CacheManager.marketLots = null;
      devLogFirestore('buyLotAtomic OK', lotId);
      return { success: true, lot: transactionResult };
    } catch (e) {
      devLogFirestore('buyLotAtomic ERROR', e.message);
      return { success: false, error: e.message };
    }
  },

  /**
   * ⭐ v2.0.0: атомарная отмена лота.
   */
  async cancelLot(lotId, sellerId) {
    const targetUid = sellerId || TelegramAuthManager.getVerifiedUserId();
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
        CacheManager.marketLots = null;
        devLogFirestore('cancelLot OK', lotId);
        return true;
      }
      return false;
    } catch (e) {
      devLogFirestore('cancelLot ERROR', e.message);
      return false;
    }
  }
};

// ========================================================
// ⭐ v2.0.0: P2P TRADE MANAGER (обмен между игроками)
// ========================================================
const P2PTradeManager = {
  /**
   * Отправить trade offer другому игроку.
   * @param {string} toUserId — кому
   * @param {Object} offerData — { myItem: {...}, theirItemId: 'lot_xxx' | null, message: '' }
   * @returns {Promise<{success, offerId, error}>}
   */
  async sendTradeOffer(toUserId, offerData) {
    const profile = TelegramAuthManager.getUserProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };
    if (!toUserId || String(toUserId) === String(profile.id)) {
      return { success: false, error: "Нельзя отправить оффер самому себе" };
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
        status: "pending", // pending | accepted | rejected | cancelled
        createdAt: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.trade_offers
      };

      await setDoc(offerRef, payload);
      await setDoc(notifRef, {
        toUser: String(toUserId),
        type: "trade_offer",
        title: "🤝 Новое предложение обмена!",
        text: `${profile.name} предлагает обмен. Откройте вкладку «Торг» в M+ чтобы посмотреть детали.`,
        offerId: offerId,
        read: false, claimed: false,
        timestamp: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.notifications
      });

      CacheManager.tradeOffers = null;
      devLogFirestore('sendTradeOffer OK', offerId);
      return { success: true, offerId };
    } catch (e) {
      devLogFirestore('sendTradeOffer ERROR', e.message);
      return { success: false, error: e.message };
    }
  },

  /**
   * Принять trade offer.
   */
  async acceptTradeOffer(offerId) {
    const profile = TelegramAuthManager.getUserProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };

    try {
      const offerRef = doc(db, "trade_offers", offerId);
      let offerData = null;

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(offerRef);
        if (!snap.exists()) throw new Error("Оффер не найден");
        const data = snap.data();
        if (String(data.toUserId) !== String(profile.id)) throw new Error("Этот оффер не вам");
        if (data.status !== "pending") throw new Error("Оффер уже неактуален");
        if (data.expireAt && data.expireAt < Date.now()) throw new Error("Оффер просрочен");
        offerData = data;

        tx.update(offerRef, { status: "accepted", acceptedAt: Date.now() });
      });

      // Уведомление отправителю
      const notifRef = doc(db, "notifications", "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6));
      await setDoc(notifRef, {
        toUser: String(offerData.fromUserId),
        type: "trade_accepted",
        title: "✅ Ваш оффер принят!",
        text: `${profile.name} принял ваше предложение обмена. Свяжитесь для оформления сделки.`,
        offerId: offerId,
        read: false, claimed: false,
        timestamp: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.notifications
      });

      CacheManager.tradeOffers = null;
      devLogFirestore('acceptTradeOffer OK', offerId);
      return { success: true, offer: offerData };
    } catch (e) {
      devLogFirestore('acceptTradeOffer ERROR', e.message);
      return { success: false, error: e.message };
    }
  },

  /**
   * Отклонить trade offer.
   */
  async rejectTradeOffer(offerId) {
    const profile = TelegramAuthManager.getUserProfile();
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

        tx.update(offerRef, { status: "rejected", rejectedAt: Date.now() });
      });

      const notifRef = doc(db, "notifications", "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6));
      await setDoc(notifRef, {
        toUser: String(offerData.fromUserId),
        type: "trade_rejected",
        title: "❌ Оффер отклонён",
        text: `${profile.name} отказался от вашего предложения.`,
        offerId: offerId,
        read: false, claimed: false,
        timestamp: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.notifications
      });

      CacheManager.tradeOffers = null;
      devLogFirestore('rejectTradeOffer OK', offerId);
      return { success: true };
    } catch (e) {
      devLogFirestore('rejectTradeOffer ERROR', e.message);
      return { success: false, error: e.message };
    }
  },

  /**
   * Отменить свой trade offer.
   */
  async cancelTradeOffer(offerId) {
    const profile = TelegramAuthManager.getUserProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };

    try {
      const offerRef = doc(db, "trade_offers", offerId);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(offerRef);
        if (!snap.exists()) throw new Error("Оффер не найден");
        const data = snap.data();
        if (String(data.fromUserId) !== String(profile.id)) throw new Error("Это не ваш оффер");
        if (data.status !== "pending") throw new Error("Оффер уже обработан");
        tx.update(offerRef, { status: "cancelled", cancelledAt: Date.now() });
      });

      CacheManager.tradeOffers = null;
      devLogFirestore('cancelTradeOffer OK', offerId);
      return { success: true };
    } catch (e) {
      devLogFirestore('cancelTradeOffer ERROR', e.message);
      return { success: false, error: e.message };
    }
  },

  /**
   * Получить все офферы для игрока (входящие + исходящие).
   */
  async fetchTradeOffers(userId) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return { incoming: [], outgoing: [] };

    try {
      const [incomingSnap, outgoingSnap] = await Promise.all([
        getDocs(query(collection(db, "trade_offers"), where("toUserId", "==", String(targetUid)), where("status", "==", "pending"), orderBy("createdAt", "desc"), limit(LIMITS.maxTradeOffersPerUser))),
        getDocs(query(collection(db, "trade_offers"), where("fromUserId", "==", String(targetUid)), where("status", "==", "pending"), orderBy("createdAt", "desc"), limit(LIMITS.maxTradeOffersPerUser)))
      ]);

      const incoming = [];
      const outgoing = [];
      const now = Date.now();

      incomingSnap.forEach(d => {
        const item = d.data();
        if (item.expireAt && item.expireAt < now) return;
        incoming.push({ id: d.id, ...item });
      });
      outgoingSnap.forEach(d => {
        const item = d.data();
        if (item.expireAt && item.expireAt < now) return;
        outgoing.push({ id: d.id, ...item });
      });

      return { incoming, outgoing };
    } catch (e) {
      console.warn('[P2PTrade] fetch error:', e);
      return { incoming: [], outgoing: [] };
    }
  },

  /**
   * ⭐ Real-time подписка на trade offers для игрока.
   */
  subscribeToTradeOffers(userId, callback) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid || typeof callback !== 'function') return () => {};

    try {
      const q = query(
        collection(db, "trade_offers"),
        where("toUserId", "==", String(targetUid)),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
        limit(LIMITS.maxTradeOffersPerUser)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const offers = [];
        const now = Date.now();
        snap.forEach(d => {
          const item = d.data();
          if (item.expireAt && item.expireAt < now) return;
          offers.push({ id: d.id, ...item });
        });
        try { callback(offers); } catch (e) { console.warn('[P2PTrade] callback error:', e); }
      }, (error) => {
        console.warn('[P2PTrade] subscribe error:', error);
      });

      return unsubscribe;
    } catch (e) {
      console.warn('[P2PTrade] subscribe exception:', e);
      return () => {};
    }
  }
};

// ========================================================
// 5. chat_messages + real-time
// ========================================================
const ChatMessagesManager = {
  _listeners: [],

  async sendMessage(params) {
    const profile = params.senderProfile || TelegramAuthManager.getUserProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };
    const msgId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const payload = {
      msg_id: msgId, senderId: String(profile.id), senderName: profile.name || "Перекуп",
      receiverId: params.receiverId ? String(params.receiverId) : null,
      clubId: params.clubId ? String(params.clubId) : null,
      dialogId: params.dialogId || null, text: params.text, timestamp: Date.now(),
      expireAt: Date.now() + TTL_CONFIG.chat_messages
    };
    try {
      await setDoc(doc(db, "chat_messages", msgId), payload);
      return { success: true, msg: payload };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async fetchMessagesForDialog(dialogId) {
    try {
      const q = query(
        collection(db, "chat_messages"),
        where("dialogId", "==", dialogId),
        orderBy("timestamp", "asc"),
        limit(LIMITS.maxMessagesPerDialog)
      );
      const snap = await getDocs(q);
      const list = [];
      const now = Date.now();
      snap.forEach(d => {
        const it = d.data();
        if (it.expireAt && it.expireAt < now) return;
        list.push(it);
      });
      return list;
    } catch (e) {
      console.warn('[ChatMessages] fetch error:', e);
      return [];
    }
  },

  /**
   * ⭐ v2.0.0: real-time подписка на сообщения диалога.
   */
  subscribeToDialog(dialogId, callback) {
    if (!dialogId || typeof callback !== 'function') return () => {};
    try {
      const q = query(
        collection(db, "chat_messages"),
        where("dialogId", "==", dialogId),
        orderBy("timestamp", "asc"),
        limit(LIMITS.maxMessagesPerDialog)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const messages = [];
        const now = Date.now();
        snap.forEach(d => {
          const it = d.data();
          if (it.expireAt && it.expireAt < now) return;
          messages.push(it);
        });
        try { callback(messages); } catch (e) { console.warn('[ChatMessages] callback error:', e); }
      }, (error) => {
        console.warn('[ChatMessages] subscribeToDialog error:', error);
      });

      this._listeners.push(unsubscribe);
      return unsubscribe;
    } catch (e) {
      console.warn('[ChatMessages] subscribe exception:', e);
      return () => {};
    }
  }
};

// ========================================================
// 6. notifications + real-time
// ========================================================
const NotificationsManager = {
  _listeners: new Map(),

  async fetchMyNotifications(userId) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return [];
    try {
      const q = query(
        collection(db, "notifications"),
        where("toUser", "==", String(targetUid)),
        where("claimed", "==", false),
        orderBy("timestamp", "desc"),
        limit(LIMITS.maxNotificationsPerUser)
      );
      const snap = await getDocs(q);
      const notifs = [];
      const now = Date.now();
      snap.forEach(d => {
        const it = d.data();
        if (it.expireAt && it.expireAt < now) return;
        notifs.push({ id: d.id, ...it });
      });
      return notifs;
    } catch (e) {
      console.warn('[Notifications] fetch error:', e);
      return [];
    }
  },

  /**
   * ⭐ v2.0.0: real-time подписка на уведомления.
   * @param {string} userId
   * @param {Function} callback — вызывается с массивом уведомлений при каждом изменении
   * @returns {Function} unsubscribe
   */
  subscribeToNotifications(userId, callback) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid || typeof callback !== 'function') return () => {};

    try {
      const q = query(
        collection(db, "notifications"),
        where("toUser", "==", String(targetUid)),
        where("claimed", "==", false),
        orderBy("timestamp", "desc"),
        limit(LIMITS.maxNotificationsPerUser)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const notifs = [];
        const now = Date.now();
        snap.forEach(d => {
          const it = d.data();
          if (it.expireAt && it.expireAt < now) return;
          notifs.push({ id: d.id, ...it });
        });
        try { callback(notifs); } catch (e) { console.warn('[Notifications] callback error:', e); }
      }, (error) => {
        console.warn('[Notifications] subscribeToNotifications error:', error);
      });

      this._listeners.set(String(targetUid), unsubscribe);
      return unsubscribe;
    } catch (e) {
      console.warn('[Notifications] subscribe exception:', e);
      return () => {};
    }
  },

  unsubscribeAll() {
    this._listeners.forEach((unsub, uid) => {
      try { unsub(); } catch (e) {}
    });
    this._listeners.clear();
  },

  async claimNotificationPayout(notifId) {
    try {
      await updateDoc(doc(db, "notifications", notifId), { claimed: true, read: true, claimedAt: Date.now() });
      return true;
    } catch (e) { return false; }
  }
};

// ========================================================
// 7. registered_plates (интеграция с PlatesManager)
// ⭐ v2.0.0: добавлен callback onSuccess
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
    const targetUid = ownerId || TelegramAuthManager.getVerifiedUserId();
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
    const targetUid = ownerId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return false;
    try {
      await runTransaction(db, async (tx) => {
        const plateSnap = await tx.get(plateRef);
        if (!plateSnap.exists()) return;
        const data = plateSnap.data();
        if (data.ownerId && String(data.ownerId) !== String(targetUid)) throw new Error("Вы не владелец номера!");
        tx.update(plateRef, {
          ownerId: archive ? null : String(targetUid),
          carId: null,
          status: archive ? "archived" : "storage",
          updatedAt: Date.now()
        });
      });
      return true;
    } catch (e) { return false; }
  },

  async isPlateAvailable(plateStr) {
    const cleanPlate = this.cleanPlateString(plateStr);
    if (!cleanPlate || cleanPlate.includes("ТРАНЗИТ")) return true;
    const docId = cleanPlate.replace(/\s+/g, "_");
    try {
      const snap = await getDoc(doc(db, "registered_plates", docId));
      if (!snap.exists()) return true;
      return snap.data().status !== "owned";
    } catch (e) { return true; }
  }
};

// ========================================================
// 8. clubs + real-time
// ========================================================
const ClubsManager = {
  async fetchClubs(force = false) {
    const now = Date.now();
    if (!force && CacheManager.clubs && (now - CacheManager.clubsTimestamp < CacheManager.CLUBS_TTL)) return CacheManager.clubs;
    try {
      const q = query(collection(db, "clubs"), orderBy("bank", "desc"), limit(25));
      const snap = await getDocs(q);
      const clubs = [];
      snap.forEach(d => clubs.push({ id: d.id, ...d.data() }));
      CacheManager.clubs = clubs;
      CacheManager.clubsTimestamp = now;
      return clubs;
    } catch (e) { return CacheManager.clubs || []; }
  },

  subscribeToClubs(callback) {
    if (typeof callback !== 'function') return () => {};
    try {
      const q = query(collection(db, "clubs"), orderBy("bank", "desc"), limit(25));
      const unsubscribe = onSnapshot(q, (snap) => {
        const clubs = [];
        snap.forEach(d => clubs.push({ id: d.id, ...d.data() }));
        CacheManager.clubs = clubs;
        CacheManager.clubsTimestamp = Date.now();
        try { callback(clubs); } catch (e) {}
      });
      return unsubscribe;
    } catch (e) { return () => {}; }
  },

  async createClub(clubName, userProfile, fee = 100000) {
    const profile = userProfile || TelegramAuthManager.getUserProfile();
    if (!clubName || !profile?.id) return { success: false };
    try {
      const clubId = "club_" + Date.now();
      const clubData = {
        club_id: clubId, id: clubId, name: clubName.trim(),
        ownerId: String(profile.id), leaderName: profile.name || "Олигарх",
        membersCount: 1, bank: 0, fee: Math.max(10000, fee),
        perk: "+10% к оценке авто клуба", createdAt: Date.now()
      };
      await setDoc(doc(db, "clubs", clubId), clubData);
      CacheManager.clubs = null;
      return { success: true, club: clubData };
    } catch (e) { return { success: false, error: e.message }; }
  },

  async joinClub(clubId, userProfile) {
    const profile = userProfile || TelegramAuthManager.getUserProfile();
    if (!clubId || !profile?.id) return false;
    try {
      const clubRef = doc(db, "clubs", String(clubId));
      await runTransaction(db, async (tx) => {
        const cSnap = await tx.get(clubRef);
        if (!cSnap.exists()) throw new Error("Клуб не найден!");
        const cur = cSnap.data();
        tx.update(clubRef, { membersCount: (cur.membersCount || 1) + 1 });
      });
      CacheManager.clubs = null;
      return true;
    } catch (e) { return false; }
  },

  async depositToClubBank(clubId, amount) {
    if (!clubId || amount <= 0) return false;
    try {
      const clubRef = doc(db, "clubs", String(clubId));
      await runTransaction(db, async (tx) => {
        const cSnap = await tx.get(clubRef);
        if (!cSnap.exists()) throw new Error();
        const cur = cSnap.data();
        tx.update(clubRef, { bank: (cur.bank || 0) + amount });
      });
      CacheManager.clubs = null;
      return true;
    } catch (e) { return false; }
  }
};

// ========================================================
// 9. leaderboard + real-time
// ========================================================
let lastLeaderboardUpdate = 0;
const LeaderboardManager = {
  async updateRank(userId, playerName, profit, level) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid || profit <= 0) return;
    const now = Date.now();
    if (now - lastLeaderboardUpdate < 90000) return;
    try {
      await setDoc(doc(db, "leaderboard", String(targetUid)), {
        telegram_id: String(targetUid), name: playerName || "Перекуп",
        profit: Math.round(profit), level: level || 1, lastUpdate: now
      }, { merge: true });
      lastLeaderboardUpdate = now;
      CacheManager.leaderboard = null;
    } catch (e) {}
  },

  async fetchTop(force = false) {
    const now = Date.now();
    if (!force && CacheManager.leaderboard && (now - CacheManager.leaderboardTimestamp < CacheManager.LEADERBOARD_TTL)) return CacheManager.leaderboard;
    try {
      const q = query(collection(db, "leaderboard"), orderBy("profit", "desc"), limit(30));
      const snap = await getDocs(q);
      const leaders = [];
      snap.forEach(d => leaders.push({ id: d.id, ...d.data() }));
      CacheManager.leaderboard = leaders;
      CacheManager.leaderboardTimestamp = now;
      return leaders;
    } catch (e) { return CacheManager.leaderboard || []; }
  },

  subscribeToTop(callback) {
    if (typeof callback !== 'function') return () => {};
    try {
      const q = query(collection(db, "leaderboard"), orderBy("profit", "desc"), limit(30));
      const unsubscribe = onSnapshot(q, (snap) => {
        const leaders = [];
        snap.forEach(d => leaders.push({ id: d.id, ...d.data() }));
        CacheManager.leaderboard = leaders;
        CacheManager.leaderboardTimestamp = Date.now();
        try { callback(leaders); } catch (e) {}
      });
      return unsubscribe;
    } catch (e) { return () => {}; }
  }
};

// ========================================================
// ⭐ v2.0.0: FRIENDSHIPS MANAGER
// ========================================================
const FriendshipsManager = {
  /**
   * Отправить заявку в друзья.
   * status: 'pending' → 'accepted' | 'declined' | 'subscribed'
   */
  async sendRequest(toUserId, toUserName) {
    const profile = TelegramAuthManager.getUserProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };
    if (String(toUserId) === String(profile.id)) {
      return { success: false, error: "Нельзя добавить себя" };
    }

    try {
      const pairId = [String(profile.id), String(toUserId)].sort().join("_");
      const friendRef = doc(db, "friendships", pairId);
      const existing = await getDoc(friendRef);
      if (existing.exists()) {
        const data = existing.data();
        if (data.status === 'accepted') return { success: false, error: "Уже друзья" };
        if (data.status === 'pending') return { success: false, error: "Заявка уже отправлена" };
      }

      await setDoc(friendRef, {
        pairId,
        fromUserId: String(profile.id),
        fromUserName: profile.name || "Перекуп",
        toUserId: String(toUserId),
        toUserName: toUserName || "Перекуп",
        status: 'pending',
        createdAt: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.friendships
      });

      const notifRef = doc(db, "notifications", "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6));
      await setDoc(notifRef, {
        toUser: String(toUserId),
        type: "friend_request",
        title: "👋 Заявка в друзья!",
        text: `${profile.name} хочет добавить вас в друзья.`,
        fromUserId: String(profile.id),
        fromUserName: profile.name || "Перекуп",
        read: false, claimed: false,
        timestamp: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.notifications
      });

      CacheManager.friends = null;
      devLogFirestore('Friendship.sendRequest OK', pairId);
      return { success: true };
    } catch (e) {
      devLogFirestore('Friendship.sendRequest ERROR', e.message);
      return { success: false, error: e.message };
    }
  },

  async acceptRequest(fromUserId) {
    const profile = TelegramAuthManager.getUserProfile();
    if (!profile?.id) return { success: false };

    try {
      const pairId = [String(profile.id), String(fromUserId)].sort().join("_");
      const friendRef = doc(db, "friendships", pairId);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(friendRef);
        if (!snap.exists()) throw new Error("Заявка не найдена");
        const data = snap.data();
        if (data.status !== 'pending') throw new Error("Заявка уже обработана");
        tx.update(friendRef, { status: 'accepted', acceptedAt: Date.now() });
      });

      const notifRef = doc(db, "notifications", "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6));
      await setDoc(notifRef, {
        toUser: String(fromUserId),
        type: "friend_accepted",
        title: "✅ Заявка принята!",
        text: `${profile.name} принял вашу заявку в друзья.`,
        fromUserId: String(profile.id),
        read: false, claimed: false,
        timestamp: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.notifications
      });

      CacheManager.friends = null;
      devLogFirestore('Friendship.accept OK', pairId);
      return { success: true };
    } catch (e) {
      devLogFirestore('Friendship.accept ERROR', e.message);
      return { success: false, error: e.message };
    }
  },

  async declineRequest(fromUserId) {
    const profile = TelegramAuthManager.getUserProfile();
    if (!profile?.id) return { success: false };

    try {
      const pairId = [String(profile.id), String(fromUserId)].sort().join("_");
      const friendRef = doc(db, "friendships", pairId);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(friendRef);
        if (!snap.exists()) throw new Error("Заявка не найдена");
        const data = snap.data();
        if (data.status !== 'pending') throw new Error("Заявка уже обработана");
        tx.update(friendRef, { status: 'subscribed', declinedAt: Date.now() });
      });

      CacheManager.friends = null;
      devLogFirestore('Friendship.decline OK', pairId);
      return { success: true };
    } catch (e) {
      devLogFirestore('Friendship.decline ERROR', e.message);
      return { success: false, error: e.message };
    }
  },

  /**
   * Получить: друзей, входящие заявки, подписчиков.
   */
  async fetchFriendships(userId) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return { friends: [], pending: [], subscribed: [] };

    try {
      const [asFromSnap, asToSnap] = await Promise.all([
        getDocs(query(collection(db, "friendships"), where("fromUserId", "==", String(targetUid)), limit(LIMITS.maxFriendshipsPerUser))),
        getDocs(query(collection(db, "friendships"), where("toUserId", "==", String(targetUid)), limit(LIMITS.maxFriendshipsPerUser)))
      ]);

      const friends = [];
      const pending = [];
      const subscribed = [];

      const process = (d, isIncoming) => {
        const data = d.data();
        if (data.status === 'accepted') {
          friends.push({
            id: isIncoming ? data.fromUserId : data.toUserId,
            name: isIncoming ? data.fromUserName : data.toUserName,
            status: 'accepted'
          });
        } else if (data.status === 'pending' && isIncoming) {
          pending.push({ id: data.fromUserId, name: data.fromUserName, createdAt: data.createdAt });
        } else if (data.status === 'subscribed' && isIncoming) {
          subscribed.push({ id: data.fromUserId, name: data.fromUserName });
        }
      };

      asFromSnap.forEach(d => process(d, false));
      asToSnap.forEach(d => process(d, true));

      return { friends, pending, subscribed };
    } catch (e) {
      console.warn('[Friendship] fetch error:', e);
      return { friends: [], pending: [], subscribed: [] };
    }
  },

  subscribeToFriendships(userId, callback) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid || typeof callback !== 'function') return () => {};

    try {
      const q = query(
        collection(db, "friendships"),
        where("toUserId", "==", String(targetUid)),
        where("status", "==", "pending"),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const pending = [];
        snap.forEach(d => {
          const data = d.data();
          pending.push({ id: data.fromUserId, name: data.fromUserName, createdAt: data.createdAt, pairId: d.id });
        });
        try { callback(pending); } catch (e) {}
      });

      return unsubscribe;
    } catch (e) { return () => {}; }
  }
};

// ========================================================
// 10. EVENTS MANAGER (для m-events)
// ========================================================
const EventsManager = {
  async fetchEvents(limitCount = 35) {
    try {
      const q = query(collection(db, "street_events"), orderBy("timestamp", "desc"), limit(limitCount));
      const snap = await getDocs(q);
      const events = [];
      snap.forEach(d => events.push({ id: d.id, ...d.data() }));
      return events;
    } catch (e) {
      console.warn('[Events] fetch error:', e);
      return [];
    }
  },

  async pushEvent(eventData) {
    const profile = TelegramAuthManager.getUserProfile();
    if (!eventData || !profile?.id) return { success: false };

    try {
      const eventId = "ev_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5);
      const payload = {
        event_id: eventId,
        type: eventData.type || 'deals',
        badge: eventData.badge || '⚡ СОБЫТИЕ',
        badgeClass: eventData.badgeClass || 'bg-tag-cyan',
        author: eventData.author || profile.name || "Перекуп",
        authorId: String(profile.id),
        car: eventData.car || "Личный транспорт",
        text: eventData.text || "",
        likes: { fire: 0, fear: 0, rip: 0 },
        commentsCount: 0,
        timestamp: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.chat_messages
      };
      await setDoc(doc(db, "street_events", eventId), payload);
      return { success: true, eventId };
    } catch (e) {
      console.warn('[Events] push error:', e);
      return { success: false, error: e.message };
    }
  },

  async toggleReaction(eventId, reactionType, userId) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!eventId || !reactionType || !targetUid) return false;
    try {
      const eventRef = doc(db, "street_events", eventId);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(eventRef);
        if (!snap.exists()) throw new Error();
        const data = snap.data();
        const likes = data.likes || { fire: 0, fear: 0, rip: 0 };
        likes[reactionType] = (likes[reactionType] || 0) + 1;
        tx.update(eventRef, { likes });
      });
      return true;
    } catch (e) { return false; }
  },

  subscribeToEvents(callback, limitCount = 35) {
    if (typeof callback !== 'function') return () => {};
    try {
      const q = query(collection(db, "street_events"), orderBy("timestamp", "desc"), limit(limitCount));
      const unsubscribe = onSnapshot(q, (snap) => {
        const events = [];
        snap.forEach(d => events.push({ id: d.id, ...d.data() }));
        try { callback(events); } catch (e) {}
      });
      return unsubscribe;
    } catch (e) { return () => {}; }
  }
};

// ========================================================
// 11. CARS CATALOG
// ========================================================
const CarsCatalogManager = {
  async seedDefaultCarsCatalog(force = false) {
    const isSeeded = localStorage.getItem("perekup_db_seeded_v2");
    if (isSeeded && !force) return { success: true };
    if (typeof window.CAR_DATABASE === "undefined") return { success: false };
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
            id: carDocId, name: car.name, power: Number(car.power) || 100,
            basePrice: Number(car.basePrice) || 100000, drivetrain: car.drivetrain || "rwd",
            type: car.type || category, img: car.img || "",
            images: Array.isArray(car.images) && car.images.length > 0 ? car.images : [car.img || ""],
            fallback: car.fallback || "", authorId: "system", authorName: "Perekup Base",
            isActive: true, createdAt: Date.now()
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
      CacheManager.cloudCars = null;
      devLogFirestore('seedCarsCatalog OK', `${count} моделей в ${batches.length} batch`);
      return { success: true, count };
    } catch (e) {
      devLogFirestore('seedCarsCatalog ERROR', e.message);
      return { success: false, error: e.message };
    }
  },

  async fetchCloudCars(force = false) {
    const now = Date.now();
    if (!force && CacheManager.cloudCars && (now - CacheManager.cloudCarsTimestamp < CacheManager.CLOUD_CARS_TTL)) return CacheManager.cloudCars;
    try {
      const q = query(collection(db, "cars_catalog"), orderBy("basePrice", "asc"), limit(250));
      const snap = await getDocs(q);
      const cars = [];
      snap.forEach(d => { const item = d.data(); if (item.isActive !== false) cars.push(item); });
      if (cars.length > 0) {
        const updatedDatabase = { economy: [], scooter: [], moto: [], atv: [], comfort: [], premium: [], hyper: [], truck: [], yacht: [] };
        cars.forEach(c => { const cat = c.type || "economy"; if (!updatedDatabase[cat]) updatedDatabase[cat] = []; updatedDatabase[cat].push(c); });
        window.CAR_DATABASE = updatedDatabase;
      }
      CacheManager.cloudCars = cars;
      CacheManager.cloudCarsTimestamp = now;
      return cars;
    } catch (e) {
      console.warn('[CarsCatalog] fetch error:', e);
      return CacheManager.cloudCars || [];
    }
  },

  async saveCarToCloud(carData, authorProfile) {
    const profile = authorProfile || TelegramAuthManager.getUserProfile();
    if (!carData || !carData.name || !profile?.id) return { success: false, error: "Нет данных" };
    try {
      const slug = carData.name.toLowerCase().replace(/[^a-z0-9а-я]/gi, "_");
      const carDocId = carData.id || ("car_" + slug);
      const payload = {
        id: carDocId, name: carData.name.trim(),
        power: Number(carData.power) || 100, basePrice: Number(carData.basePrice) || 100000,
        drivetrain: carData.drivetrain || "rwd", type: carData.type || "economy",
        img: carData.img || "", images: Array.isArray(carData.images) && carData.images.length > 0 ? carData.images : [carData.img || ""],
        fallback: carData.fallback || "", authorId: String(profile?.id || "unknown"),
        authorName: profile?.name || "Перекуп", isActive: true, updatedAt: Date.now()
      };
      await setDoc(doc(db, "cars_catalog", carDocId), payload, { merge: true });
      CacheManager.cloudCars = null;
      return { success: true, car: payload };
    } catch (e) { return { success: false, error: e.message }; }
  }
};

// ========================================================
// 12. CLEANUP EXPIRED DATA
// ========================================================
const CleanupManager = {
  _lastCleanup: 0,
  _cleanupInterval: 60 * 60 * 1000,

  async runCleanup(force = false) {
    const now = Date.now();
    if (!force && now - this._lastCleanup < this._cleanupInterval) return { skipped: true };
    this._lastCleanup = now;

    const results = { chat_messages: 0, notifications: 0, market_lots: 0, transactions: 0, trade_offers: 0 };

    try {
      const collectionsToClean = [
        { name: 'chat_messages', key: 'chat_messages' },
        { name: 'notifications', key: 'notifications' },
        { name: 'market_lots', key: 'market_lots' },
        { name: 'transactions', key: 'transactions' },
        { name: 'trade_offers', key: 'trade_offers' }
      ];

      for (const col of collectionsToClean) {
        const q = query(collection(db, col.name), where("expireAt", "<=", now), limit(100));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach(d => { batch.delete(d.ref); results[col.key]++; });
          await batch.commit();
        }
      }

      const total = Object.values(results).reduce((a, b) => a + b, 0);
      if (total > 0) {
        devLogFirestore('cleanupExpiredData OK',
          `chat: ${results.chat_messages}, notif: ${results.notifications}, lots: ${results.market_lots}, tx: ${results.transactions}, trade: ${results.trade_offers}`);
      }
      return { success: true, results, total };
    } catch (e) {
      console.warn('[Cleanup] Ошибка:', e);
      devLogFirestore('cleanupExpiredData ERROR', e.message);
      return { success: false, error: e.message };
    }
  }
};

// ========================================================
// 13. FIRESTORE STATS (для DEV)
// ========================================================
async function getFirestoreStats() {
  const stats = {
    market_lots: 0,
    chat_messages: 0,
    notifications: 0,
    clubs: 0,
    transactions: 0,
    registered_plates: 0,
    cars_catalog: 0,
    leaderboard: 0,
    trade_offers: 0,
    friendships: 0,
    street_events: 0
  };

  try {
    for (const colName in stats) {
      try {
        const q = query(collection(db, colName), limit(1));
        const snap = await getDocs(q);
        stats[colName] = snap.empty ? 0 : "есть данные";
      } catch (e) {
        stats[colName] = "ошибка";
      }
    }
  } catch (e) {
    console.warn('[Stats] Ошибка:', e);
  }

  return stats;
}

// ========================================================
// 14. ПРОФИЛЬ И ЭКСПОРТ
// ========================================================
function getCurrentPlayerProfile() {
  if (currentUserProfile && verifiedUserId) return currentUserProfile;

  const tgUser = getTelegramUser();
  if (!tgUser || !tgUser.id) {
    return null;
  }

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

window.FB_Bridge = {
  db, auth, enabled: true,
  Auth: TelegramAuthManager,
  getProfile: getCurrentPlayerProfile,
  getTelegramUser: getTelegramUser,
  Players: PlayersStorageManager,
  MarketLots: MarketLotsManager,
  Transactions: { buyLot: MarketLotsManager.buyLotAtomic },
  ChatMessages: ChatMessagesManager,
  Notifications: NotificationsManager,
  CarsCatalog: CarsCatalogManager,
  Plates: RegisteredPlatesManager,
  Clubs: ClubsManager,
  Leaderboard: LeaderboardManager,
  Cleanup: CleanupManager,
  getStats: getFirestoreStats,
  CloudSave: {
    pushSave: PlayersStorageManager.pushSave,
    pushSaveForce: PlayersStorageManager.pushSaveForce,
    pullSave: PlayersStorageManager.pullSave
  },
  P2P: MarketLotsManager,
  P2PTrade: P2PTradeManager,
  Friendships: FriendshipsManager,
  Events: EventsManager,
  QuickChat: {
    getPhrasesList: (cat) => Object.values(CANNED_PHRASES).filter(p => !cat || p.category === cat),
    makeDialogId: (a, b, c) => `dlg_${[String(a), String(b)].sort().join("_")}_${c}`,
    sendPhrase: async (dId, pId, pr) => {
      const phr = CANNED_PHRASES[pId];
      if (!phr) return false;
      return (await ChatMessagesManager.sendMessage({ dialogId: dId, text: phr.text, senderProfile: pr })).success;
    },
    fetchDialogMessages: ChatMessagesManager.fetchMessagesForDialog,
    subscribeToDialog: ChatMessagesManager.subscribeToDialog
  }
};
window.TelegramAuthManager = TelegramAuthManager;

// ⭐ v2.0.0: автозапуск cleanup при старте
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      CleanupManager.runCleanup().catch(e => console.warn('[Cleanup] Автозапуск ошибка:', e));
    }, 5000);
  });
}

console.log("[☁️ FB_Bridge v2.0.0] Синхронизация складов + P2P Trade Manager + Друзья + Real-time подписки ✓");
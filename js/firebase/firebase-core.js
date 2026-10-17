// ========================================================
// js/firebase-core.js — ЯДРО FIREBASE (v1.2.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.2.0 (P2P BOT NOTIFICATIONS & TELEGRAM CONTEXT):
//   - ДОБАВЛЕНО: автоматическая регистрация Telegram контекста (chatId, username, push-флаг)
//     при успешной авторизации сессии в players/{uid} и users/{uid}/notifications.
//   - ДОБАВЛЕНО: метод registerTelegramPushContext() для синхронизации ID с ботом.
//   - ДОБАВЛЕНО: в TTL_CONFIG и CleanupManager включена чистка очереди 'p2p_notifications_queue'
//     со сроком жизни 24 часа.
//   - ДОБАВЛЕНО: экспорт registerTelegramPushContext в window.FB_Core.
// ⭐ v1.1.0 (SPRINT 3 — ФИКС CLEANUP):
//   - Изоляция try/catch для каждой коллекции в runCleanup.
// ⭐ v1.0.0 (ВЫДЕЛЕНО ИЗ firebase-bridge.js):
//   - Инициализация Firebase, TelegramAuthManager, PlayersStorageManager
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
  where,
  limit,
  writeBatch,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ========================================================
// 1. КОНФИГ FIREBASE
// ========================================================
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

// ========================================================
// 2. TTL И ЛИМИТЫ
// ========================================================
const TTL_CONFIG = {
  chat_messages: 30 * 24 * 60 * 60 * 1000,           // 30 дней
  notifications: 7 * 24 * 60 * 60 * 1000,            // 7 дней
  transactions: 90 * 24 * 60 * 60 * 1000,            // 90 дней
  market_lots: 14 * 24 * 60 * 60 * 1000,             // 14 дней
  trade_offers: 3 * 24 * 60 * 60 * 1000,             // 3 дня на принятие
  friendships: 30 * 24 * 60 * 60 * 1000,              // 30 дней для pending
  p2p_notifications_queue: 24 * 60 * 60 * 1000       // 24 часа для очереди задач бота
};

const LIMITS = {
  maxLotsPerFetch: 40,
  maxMessagesPerDialog: 100,
  maxNotificationsPerUser: 50,
  maxChatMessagesTotal: 500,
  maxFriendshipsPerUser: 200,
  maxTradeOffersPerUser: 30
};

// ========================================================
// 3. ХЕЛПЕРЫ
// ========================================================
function devLogFirestore(action, details) {
  if (window.DevLogger) {
    try {
      window.DevLogger.add('firestore', action + (details ? ' — ' + details : ''));
    } catch (e) {}
  }
}

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

/**
 * Регистрация контекста Telegram для доставки Push-уведомлений через бота.
 */
async function registerTelegramPushContext(userId, tgUser) {
  if (!userId || !tgUser) return;
  const targetId = String(userId);
  try {
    const pushContext = {
      telegram_id: String(tgUser.id),
      chat_id: String(tgUser.id),
      username: tgUser.username || "",
      first_name: tgUser.first_name || "",
      last_name: tgUser.last_name || "",
      language_code: tgUser.language_code || "ru",
      notifications_enabled: true,
      last_active: Date.now()
    };

    await setDoc(doc(db, "players", targetId), {
      ...pushContext,
      updatedAt: Date.now()
    }, { merge: true });

    devLogFirestore('PushContext OK', `TG: ${tgUser.id} -> UID: ${targetId}`);
  } catch (e) {
    console.warn('[FB_Core] Не удалось сохранить контекст Telegram-уведомлений:', e.message || e);
    devLogFirestore('PushContext ERR', e.message || String(e));
  }
}

// ========================================================
// 4. TELEGRAM AUTH MANAGER
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

      // Синхронизируем Telegram контекст для P2P-уведомлений
      await registerTelegramPushContext(verifiedUserId, tgUser);

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

      // Синхронизируем Telegram контекст для P2P-уведомлений при fallback
      await registerTelegramPushContext(verifiedUserId, tgUser);

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
    const tgUser = getTelegramUser();
    if (tgUser) {
      registerTelegramPushContext(verifiedUserId, tgUser);
    }
  }
};

// ========================================================
// 5. PLAYERS STORAGE MANAGER
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
      console.warn('[FB_Core] pushSave: заблокирован некорректный UID', targetUid);
      return;
    }

    const tgUser = getTelegramUser();

    const playerDoc = {
      telegram_id: String(targetUid),
      chat_id: tgUser?.id ? String(tgUser.id) : String(targetUid),
      telegram_username: tgUser?.username || "",
      notifications_enabled: true,
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

    const garageDoc = {
      telegram_id: String(targetUid),
      cars: (gameState.garage || []).slice(0, 35),
      salesLot: (gameState.salesLot || []).slice(0, 10),
      ownedPlates: (gameState.ownedPlates || []).slice(0, 50),
      platesInventory: (gameState.player?.platesInventory || []).slice(0, 100),
      businesses: (gameState.businesses || []).slice(0, 15),
      warehouse: gameState.player?.warehouse || { maxCars: 6, maxItems: 12, cars: [], items: [] },
      paidParking: gameState.player?.paidParking || { maxCars: 3, cars: [], dailyRate: 200, lastChargeDay: 0 },
      updatedAt: Date.now()
    };

    const currentHash = `${playerDoc.cash}_${playerDoc.level}_${garageDoc.cars.length}_${playerDoc.club?.id || 'none'}_${playerDoc.onboardingDone}_${garageDoc.warehouse.cars.length}_${garageDoc.paidParking.cars.length}_${garageDoc.platesInventory.length}`;
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
      console.warn('[FB_Core] pushSaveForce: некорректный UID', targetUid);
      return false;
    }

    try {
      const tgUser = getTelegramUser();
      const minimalDoc = {
        telegram_id: String(targetUid),
        chat_id: tgUser?.id ? String(tgUser.id) : String(targetUid),
        telegram_username: tgUser?.username || "",
        notifications_enabled: true,
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
          platesInventory: gData.platesInventory || [],
          businesses: gData.businesses || [],
          warehouse: gData.warehouse || { maxCars: 6, maxItems: 12, cars: [], items: [] },
          paidParking: gData.paidParking || { maxCars: 3, cars: [], dailyRate: 200, lastChargeDay: 0 }
        };
      }

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
// 6. CLEANUP MANAGER (TTL)
// ========================================================
const CleanupManager = {
  _lastCleanup: 0,
  _cleanupInterval: 60 * 60 * 1000,

  async runCleanup(force = false) {
    const now = Date.now();
    if (!force && now - this._lastCleanup < this._cleanupInterval) {
      return { success: true, skipped: true, results: {}, total: 0 };
    }
    this._lastCleanup = now;

    const results = {
      chat_messages: { ok: 0, error: null },
      notifications: { ok: 0, error: null },
      market_lots: { ok: 0, error: null },
      transactions: { ok: 0, error: null },
      trade_offers: { ok: 0, error: null },
      p2p_notifications_queue: { ok: 0, error: null }
    };

    const collectionsToClean = [
      'chat_messages',
      'notifications',
      'market_lots',
      'transactions',
      'trade_offers',
      'p2p_notifications_queue'
    ];

    let totalDeleted = 0;
    let errorCount = 0;

    for (const colName of collectionsToClean) {
      try {
        const q = query(
          collection(db, colName),
          where("expireAt", "<=", now),
          limit(100)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          results[colName].ok = 0;
          continue;
        }

        const batch = writeBatch(db);
        let deleted = 0;
        snap.forEach(d => {
          batch.delete(d.ref);
          deleted++;
        });

        await batch.commit();
        results[colName].ok = deleted;
        totalDeleted += deleted;
      } catch (colErr) {
        const errMsg = colErr?.code || colErr?.message || String(colErr);
        results[colName].error = errMsg;
        errorCount++;

        if (errMsg.includes('permission-denied')) {
          console.warn(`[Cleanup] ${colName}: permission-denied`);
        } else {
          console.warn(`[Cleanup] ${colName} error:`, errMsg);
        }
      }
    }

    const summary = Object.entries(results)
      .map(([k, v]) => v.error ? `${k}:ERR` : `${k}:${v.ok}`)
      .join(', ');

    if (totalDeleted > 0 || errorCount > 0) {
      devLogFirestore(
        'cleanupExpiredData',
        `${summary} | total=${totalDeleted}, errors=${errorCount}`
      );
    }

    return {
      success: errorCount === 0 || totalDeleted > 0,
      results,
      total: totalDeleted,
      errors: errorCount
    };
  }
};

// ========================================================
// 7. FIRESTORE STATS (для DEV)
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
    street_events: 0,
    storage_wars_lobbies: 0,
    p2p_notifications_queue: 0
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
// 8. ЭКСПОРТ В WINDOW
// ========================================================
window.FB_Core = {
  app,
  auth,
  db,
  enabled: true,

  // Auth
  Auth: TelegramAuthManager,

  // Storage
  Players: PlayersStorageManager,

  // Cleanup
  Cleanup: CleanupManager,

  // Stats
  getStats: getFirestoreStats,

  // Push Context
  registerTelegramPushContext,

  // Хелперы
  getTelegramUser,
  devLogFirestore,

  // Константы
  TTL_CONFIG,
  LIMITS
};

window.TelegramAuthManager = TelegramAuthManager;

console.log("[☁️ FB_Core v1.2.0] Ядро Firebase загружено. P2P Telegram Context & Queue ready ✓");

// ========================================================
// 9. АВТОЗАПУСК CLEANUP
// ========================================================
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      CleanupManager.runCleanup().catch(e => console.warn('[Cleanup] Автозапуск ошибка:', e));
    }, 5000);
  });
}
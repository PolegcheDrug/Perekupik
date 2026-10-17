// ========================================================
// js/firebase-core.js — ЯДРО FIREBASE (v1.3.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.3.0 (DEV GLOBAL WIPES):
//   - ДОБАВЛЕНО: AdminManager для безопасного управления сбросами:
//       1. wipeMarketAndP2P() — глобальный сброс рынка, сделок,
//          офферов, очереди пушей и чатов (ПРОГРЕСС ИГРОКОВ СОХРАНЯЕТСЯ).
//       2. wipeAllGlobal() — полный вайп базы данных (включая players и garages).
//   - Экспорт AdminManager в window.FB_Core.Admin
// ⭐ v1.2.0 (P2P BOT NOTIFICATIONS & TELEGRAM CONTEXT):
//   - Регистрация контекста Telegram для push-уведомлений бота.
//   - Очередь 'p2p_notifications_queue' с автоочисткой TTL.
// ⭐ v1.1.0: Изолированный per-collection cleanup.
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
  chat_messages: 30 * 24 * 60 * 60 * 1000,
  notifications: 7 * 24 * 60 * 60 * 1000,
  transactions: 90 * 24 * 60 * 60 * 1000,
  market_lots: 14 * 24 * 60 * 60 * 1000,
  trade_offers: 3 * 24 * 60 * 60 * 1000,
  friendships: 30 * 24 * 60 * 60 * 1000,
  p2p_notifications_queue: 24 * 60 * 60 * 1000
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

      devLogFirestore('Auth Firebase OK', `UID: ${verifiedUserId}`);
      await registerTelegramPushContext(verifiedUserId, tgUser);

      return { success: true, userId: verifiedUserId, user: currentUserProfile };
    } catch (err) {
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
    if (!targetUid) return;

    if (typeof targetUid === 'string' &&
        (targetUid === 'guest_777' || targetUid.startsWith('guest_') || targetUid.startsWith('dev_') || targetUid.startsWith('p_'))) {
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
        if (window.__IS_RESETTING__) return;

        const t0 = performance.now();
        await Promise.all([
          setDoc(doc(db, "players", String(targetUid)), playerDoc, { merge: true }),
          setDoc(doc(db, "garages", String(targetUid)), garageDoc, { merge: true })
        ]);
        const dt = Math.round(performance.now() - t0);
        lastSavedHash = currentHash;
        devLogFirestore('pushSave OK', `players/garages → ${targetUid} (${dt}ms)`);
      } catch (e) {
        devLogFirestore('pushSave ERROR', e.message || String(e));
      }
    }, 3500);
  },

  async pushSaveForce(userId, gameState) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return false;

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
    if (!targetUid) return null;

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
        devLogFirestore('pullSave OK', `${targetUid} (${dt}ms)`);
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
      if (oldSnap.exists()) return oldSnap.data();
    } catch (e) {
      devLogFirestore('pullSave ERROR', e.message || String(e));
    }
    return null;
  }
};

// ========================================================
// 6. ADMIN MANAGER (ГЛОБАЛЬНЫЕ СБРОСЫ И ВАЙПЫ ДЛЯ DEV)
// ========================================================
const AdminManager = {
  /**
   * Удаляет коллекцию пачками по 350 документов.
   */
  async _wipeCollection(colName) {
    let total = 0;
    while (true) {
      const q = query(collection(db, colName), limit(350));
      const snap = await getDocs(q);
      if (snap.empty) break;

      const batch = writeBatch(db);
      snap.forEach(d => {
        batch.delete(d.ref);
        total++;
      });
      await batch.commit();
      if (snap.size < 350) break;
    }
    return total;
  },

  /**
   * 1. Сброс рынка, сделок и P2P с СОХРАНЕНИЕМ прогресса игроков
   */
  async wipeMarketAndP2P() {
    devLogFirestore('ADMIN', 'Начат вайп рынка и P2P (с сохранением игроков)');
    const collectionsToWipe = [
      'market_lots',
      'p2p_deals',
      'trade_offers',
      'p2p_notifications_queue',
      'notifications',
      'chat_messages',
      'street_events'
    ];

    const results = {};
    for (const col of collectionsToWipe) {
      try {
        const count = await this._wipeCollection(col);
        results[col] = count;
      } catch (e) {
        results[col] = 'ERR: ' + (e.message || String(e));
      }
    }

    devLogFirestore('ADMIN', 'Вайп рынка завершен: ' + JSON.stringify(results));
    return { success: true, preserved: ['players', 'garages', 'clubs'], results };
  },

  /**
   * 2. Полный глобальный вайп всей базы данных (включая игроков)
   */
  async wipeAllGlobal() {
    window.__IS_RESETTING__ = true;
    devLogFirestore('ADMIN', 'ВНИМАНИЕ: Начат полный глобальный вайп базы');
    const collectionsToWipe = [
      'market_lots',
      'p2p_deals',
      'trade_offers',
      'p2p_notifications_queue',
      'notifications',
      'chat_messages',
      'street_events',
      'clubs',
      'leaderboard',
      'garages',
      'players',
      'saves'
    ];

    const results = {};
    for (const col of collectionsToWipe) {
      try {
        const count = await this._wipeCollection(col);
        results[col] = count;
      } catch (e) {
        results[col] = 'ERR: ' + (e.message || String(e));
      }
    }

    devLogFirestore('ADMIN', 'Полный вайп завершен: ' + JSON.stringify(results));
    return { success: true, results };
  }
};

// ========================================================
// 7. CLEANUP MANAGER (TTL)
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
      }
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
// 8. FIRESTORE STATS
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
    p2p_notifications_queue: 0,
    players: 0,
    garages: 0
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
  } catch (e) {}

  return stats;
}

// ========================================================
// 9. ЭКСПОРТ В WINDOW
// ========================================================
window.FB_Core = {
  app,
  auth,
  db,
  enabled: true,

  Auth: TelegramAuthManager,
  Players: PlayersStorageManager,
  Cleanup: CleanupManager,
  Admin: AdminManager,

  getStats: getFirestoreStats,
  registerTelegramPushContext,
  getTelegramUser,
  devLogFirestore,

  TTL_CONFIG,
  LIMITS
};

window.TelegramAuthManager = TelegramAuthManager;

console.log("[☁️ FB_Core v1.3.0] Ядро Firebase + Admin Wipes (Market / Global) ✓");

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      CleanupManager.runCleanup().catch(() => {});
    }, 5000);
  });
}

// ========================================================
// js/firebase-core.js — ЯДРО FIREBASE (v1.5.0 CLOUD-FIRST & WIPE EPOCH)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.5.0:
//   - Внедрена система serverEpoch для управляемого вайпа через DEV.
//   - Публикация реальных игроков в коллекцию leaderboard.
//   - Защита от воскрешения сейвов из localStorage после вайпа.
// ========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  initializeFirestore,
  enableNetwork,
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
  Timestamp,
  orderBy
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

const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

console.log('[🔥 Firebase Core] Firestore инициализирован (v1.5.0)');

const DEFAULT_AUTH_SERVER_URL = window.AUTH_SERVER_URL || null;

// ========================================================
// 2. TTL И ЛИМИТЫ
// ========================================================
const TTL_CONFIG = {
  chat_messages: 30 * 24 * 60 * 60 * 1000,
  notifications: 7 * 24 * 60 * 60 * 1000,
  transactions: 90 * 24 * 60 * 60 * 1000,
  market_lots: 14 * 24 * 60 * 60 * 1000,
  trade_offers: 3 * 24 * 60 * 60 * 1000,
  friendships: 30 * 24 * 60 * 60 * 1000
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

// ========================================================
// 4. TELEGRAM AUTH MANAGER
// ========================================================
let verifiedUserId = null;
let currentUserProfile = null;

const TelegramAuthManager = {
  async initSession(customServerUrl = null) {
    if (window.AppLoadingManager) {
      window.AppLoadingManager.setProgress(78, "Авторизация в облаке...");
    }

    const tgUser = getTelegramUser();
    const url = customServerUrl || DEFAULT_AUTH_SERVER_URL;
    let initData = "";
    try {
      if (window.Telegram?.WebApp?.initData) {
        initData = window.Telegram.WebApp.initData;
      }
    } catch (e) {}

    // 1. Авторизация через сервер
    if (url && initData) {
      try {
        const response = await fetch(`${url}/api/auth/telegram`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.customToken) {
            const userCredential = await signInWithCustomToken(auth, data.customToken);
            verifiedUserId = userCredential.user.uid;
            currentUserProfile = data.user;
            devLogFirestore('Auth Firebase OK', `UID: ${verifiedUserId}`);
            return { success: true, userId: verifiedUserId, user: currentUserProfile };
          }
        }
      } catch (err) {
        console.warn("[🔐 Auth] Сервер кастомных токенов недоступен:", err.message || err);
      }
    }

    // 2. Резервная авторизация (Anonymous)
    try {
      let anonCredential;
      if (!auth.currentUser) {
        anonCredential = await signInAnonymously(auth);
      } else {
        anonCredential = { user: auth.currentUser };
      }

      if (tgUser) {
        verifiedUserId = String(tgUser.id);
        const names = [];
        if (tgUser.first_name) names.push(tgUser.first_name);
        if (tgUser.last_name) names.push(tgUser.last_name);

        currentUserProfile = {
          id: String(tgUser.id),
          name: names.join(" ").trim() || (tgUser.username ? "@" + tgUser.username : "Перекуп #" + tgUser.id),
          username: tgUser.username || "",
          photoUrl: tgUser.photo_url || null,
          isTelegram: true,
          authUid: anonCredential.user.uid
        };
      } else {
        verifiedUserId = anonCredential.user.uid;
        currentUserProfile = {
          id: verifiedUserId,
          name: window.state?.player?.name || "Игрок (Web)",
          username: "",
          photoUrl: null,
          isTelegram: false,
          authUid: verifiedUserId
        };
      }

      devLogFirestore('Auth Fallback OK', `UID: ${verifiedUserId}`);
      return { success: true, userId: verifiedUserId, user: currentUserProfile };
    } catch (authErr) {
      console.error("[🔐 Auth] Критическая ошибка авторизации Firebase:", authErr);
      devLogFirestore('Auth CRITICAL ERROR', authErr.message || String(authErr));
      return { success: false, userId: null, user: null, reason: authErr.message };
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
  }
};

// ========================================================
// 5. SYSTEM & EPOCH MANAGER (УПРАВЛЯЕМЫЙ ВАЙП)
// ========================================================
const SystemConfigManager = {
  async getServerEpoch() {
    try {
      const snap = await getDoc(doc(db, "system", "server_config"));
      if (snap.exists()) {
        return Number(snap.data().serverEpoch) || 1;
      }
      // Если документа еще нет, создаем начальную эпоху
      await setDoc(doc(db, "system", "server_config"), { serverEpoch: 1, updatedAt: Date.now() }, { merge: true });
      return 1;
    } catch (e) {
      console.warn('[System] Ошибка чтения serverEpoch:', e);
      return 1;
    }
  },

  async triggerGlobalWipe() {
    try {
      const currentEpoch = await this.getServerEpoch();
      const newEpoch = currentEpoch + 1;
      await setDoc(doc(db, "system", "server_config"), { 
        serverEpoch: newEpoch, 
        lastWipedAt: Date.now(),
        wipedBy: verifiedUserId || 'owner'
      }, { merge: true });

      // Очищаем рынок и P2P
      await AdminManager.wipeMarketOnly(true);

      console.log(`[Wipe] 🚨 Глобальная эпоха сервера повышена до: ${newEpoch}`);
      devLogFirestore('triggerGlobalWipe OK', `Новая эпоха: ${newEpoch}`);
      return newEpoch;
    } catch (e) {
      console.error('[Wipe] Ошибка запуска вайпа:', e);
      throw e;
    }
  }
};

// ========================================================
// 6. LEADERBOARD MANAGER (РЕАЛЬНЫЕ ИГРОКИ)
// ========================================================
const LeaderboardManager = {
  async publishEntry(userId, gameState) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid || !gameState?.player) return;

    try {
      const p = gameState.player;
      let totalAssets = Number(p.cash) || 0;
      (gameState.garage || []).forEach(c => {
        totalAssets += Number(c.price || c.basePrice || 0);
      });
      (gameState.businesses || []).forEach(b => {
        if (b && b.level > 0) totalAssets += Number(b.cost || 0);
      });

      const leaderData = {
        uid: String(targetUid),
        name: p.name || "Перекуп",
        avatar: p.avatarUrl || null,
        level: Number(p.level) || 1,
        netWorth: Math.round(totalAssets),
        profit: Number(p.stats?.totalNetProfit) || 0,
        bestCar: gameState.garage?.[0]?.name || "Пешком",
        updatedAt: Date.now()
      };

      await setDoc(doc(db, "leaderboard", String(targetUid)), leaderData, { merge: true });
    } catch (e) {
      console.warn('[Leaderboard] Ошибка публикации:', e);
    }
  },

  async fetchTop(sortBy = 'netWorth', count = 30) {
    try {
      const q = query(
        collection(db, "leaderboard"),
        orderBy(sortBy, "desc"),
        limit(count)
      );
      const snap = await getDocs(q);
      const players = [];
      snap.forEach(d => players.push(d.data()));
      return players;
    } catch (e) {
      console.warn('[Leaderboard] Ошибка получения лидеров:', e);
      return [];
    }
  }
};

// ========================================================
// 7. PLAYERS STORAGE MANAGER
// ========================================================
let saveDebounceTimer = null;
let lastSavedHash = "";

const PlayersStorageManager = {
  pushSave(userId, gameState) {
    if (window.__IS_RESETTING__) return;

    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return;

    // Публикуем в лидерборд при сохранениях
    LeaderboardManager.publishEntry(targetUid, gameState);

    const playerDoc = {
      telegram_id: String(targetUid),
      serverEpoch: Number(gameState.player?.serverEpoch) || 1,
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
      foundedCorporations: gameState.player?.foundedCorporations || [],
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

    const currentHash = `${playerDoc.cash}_${playerDoc.level}_${garageDoc.cars.length}_${playerDoc.onboardingDone}_${garageDoc.businesses.length}`;
    if (currentHash === lastSavedHash) return;

    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(async () => {
      try {
        if (window.__IS_RESETTING__) return;

        await Promise.all([
          setDoc(doc(db, "players", String(targetUid)), playerDoc, { merge: true }),
          setDoc(doc(db, "garages", String(targetUid)), garageDoc, { merge: true })
        ]);
        lastSavedHash = currentHash;
        console.log(`[☁️ Firestore] Синхронизировано в облако: ${targetUid}`);
      } catch (e) {
        console.warn("[☁️ Firestore] Ошибка записи в облако, сохраняем в fallback localStorage:", e);
        try {
          localStorage.setItem('perekup_save_' + targetUid, JSON.stringify(gameState));
        } catch(lsErr) {}
      }
    }, 3000);
  },

  async pushSaveForce(userId, gameState) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return false;

    try {
      const minimalDoc = {
        telegram_id: String(targetUid),
        serverEpoch: Number(gameState.player?.serverEpoch) || 1,
        name: gameState.player?.name || "Перекуп",
        level: gameState.player?.level || 1,
        cash: gameState.player?.cash || 0,
        onboardingDone: gameState.player?.onboardingDone === true,
        uid: gameState.player?.uid || String(targetUid),
        updatedAt: Date.now()
      };
      await setDoc(doc(db, "players", String(targetUid)), minimalDoc, { merge: true });
      LeaderboardManager.publishEntry(targetUid, gameState);
      return true;
    } catch (e) {
      return false;
    }
  },

  async pullSave(userId) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return null;

    try {
      const [playerSnap, garageSnap] = await Promise.all([
        getDoc(doc(db, "players", String(targetUid))),
        getDoc(doc(db, "garages", String(targetUid)))
      ]);

      if (playerSnap.exists() || garageSnap.exists()) {
        const pData = playerSnap.exists() ? playerSnap.data() : {};
        const gData = garageSnap.exists() ? garageSnap.data() : {};

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
    } catch (e) {
      console.warn("[☁️ Firestore] Ошибка загрузки облачного сейва:", e);
    }
    return null;
  }
};

// ========================================================
// 8. ADMIN MANAGER
// ========================================================
const AdminManager = {
  async _deleteEntireCollection(colName) {
    let deletedCount = 0;
    while (true) {
      const q = query(collection(db, colName), limit(250));
      const snap = await getDocs(q);
      if (snap.empty) break;

      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      deletedCount += snap.size;
    }
    return deletedCount;
  },

  async wipeMarketOnly(silent = false) {
    if (!silent && !confirm("Очистить все лоты авторынка и P2P?")) return false;

    try {
      const targetCols = ['market_lots', 'p2p_deals', 'trade_offers', 'chat_messages'];
      let total = 0;
      for (const col of targetCols) {
        total += await this._deleteEntireCollection(col);
      }
      if (!silent) showToast(`Рынок очищен (${total} лотов)`, 'success');
      return true;
    } catch (e) {
      if (!silent) showToast(`Ошибка: ${e.message}`, 'error');
      return false;
    }
  },

  async wipeAllGlobal() {
    const confirmation = prompt("🚨 ВНИМАНИЕ: Это проведёт глобальный ВАЙП сервера!\nВсе игроки начнут заново с 1 уровня.\nВведите «ВАЙП» для подтверждения:");
    if (confirmation !== "ВАЙП") {
      if (typeof showToast === 'function') showToast("Вайп отменён");
      return false;
    }

    try {
      if (typeof showToast === 'function') showToast('⏳ Запуск глобального вайпа...');
      
      // Повышаем эпоху сервера (это автоматически сбросит всех игроков при следующем входе)
      const newEpoch = await SystemConfigManager.triggerGlobalWipe();

      // Очищаем локальные данные на текущем устройстве
      try { localStorage.clear(); } catch(e) {}
      try { sessionStorage.clear(); } catch(e) {}

      alert(`✅ Глобальный вайп успешно проведён! Начата эпоха #${newEpoch}. Игра будет перезагружена.`);
      window.location.reload();
      return true;
    } catch (e) {
      alert(`Ошибка вайпа: ${e.message}`);
      return false;
    }
  },

  resetCurrentPlayerLocal() {
    if (!confirm("Сбросить сохранение на этом телефоне?")) return;
    try { localStorage.clear(); } catch(e) {}
    try { sessionStorage.clear(); } catch(e) {}
    window.location.reload();
  }
};

// ========================================================
// 9. CLEANUP MANAGER (TTL)
// ========================================================
const CleanupManager = {
  _lastCleanup: 0,
  _cleanupInterval: 60 * 60 * 1000,

  async runCleanup(force = false) {
    const now = Date.now();
    if (!force && now - this._lastCleanup < this._cleanupInterval) {
      return { success: true, skipped: true };
    }
    this._lastCleanup = now;

    const collectionsToClean = ['chat_messages', 'notifications', 'market_lots', 'transactions', 'trade_offers'];
    for (const colName of collectionsToClean) {
      try {
        const q = query(collection(db, colName), where("expireAt", "<=", now), limit(100));
        const snap = await getDocs(q);
        if (snap.empty) continue;

        const batch = writeBatch(db);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } catch (colErr) {}
    }
    return { success: true };
  }
};

// ========================================================
// 10. ЭКСПОРТ В WINDOW И BRIDGE
// ========================================================
window.FB_Core = {
  app,
  auth,
  db,
  enabled: true,
  Auth: TelegramAuthManager,
  Players: PlayersStorageManager,
  Admin: AdminManager,
  System: SystemConfigManager,
  Leaderboard: LeaderboardManager,
  Cleanup: CleanupManager,
  getTelegramUser,
  devLogFirestore,
  TTL_CONFIG,
  LIMITS
};

// Экспортируем в FB_Bridge для удобной связи модулей
if (!window.FB_Bridge) window.FB_Bridge = {};
window.FB_Bridge.Players = PlayersStorageManager;
window.FB_Bridge.System = SystemConfigManager;
window.FB_Bridge.Leaderboard = LeaderboardManager;
window.FB_Bridge.Auth = TelegramAuthManager;
window.TelegramAuthManager = TelegramAuthManager;

console.log("[☁️ FB_Core v1.5.0] Ядро Firebase загружено. Система эпох и Leaderboard активны ✓");

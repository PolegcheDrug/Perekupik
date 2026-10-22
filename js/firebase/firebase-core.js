// ========================================================
// js/firebase-core.js — ЯДРО FIREBASE (v1.6.0 RESET & CLOUD-WIPE)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.6.0:
//   - Встроен нативный внутриигровой модал подтверждения сброса (без window.confirm).
//   - Добавлен метод resetPlayerCloud: принудительная очистка коллекций в Firestore.
//   - Защита от воскрешения старых миллионов при перезагрузке страницы.
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

console.log('[🔥 Firebase Core] Firestore инициализирован (v1.6.0)');

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
// 6. LEADERBOARD MANAGER
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
      hudColorId: gameState.player?.hudColorId || 'cyber_neon',
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
        console.warn("[☁️ Firestore] Ошибка записи в облако:", e);
      }
    }, 3000);
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
  },

  // ⭐ ПРИНУДИТЕЛЬНАЯ ПЕРЕЗАПИСЬ ОБЛАКА ЧИСТЫМ СТАРТОВЫМ ПРОФИЛЕМ 75 000 ₽
  async resetPlayerCloud(userId, customName = null) {
    const targetUid = String(userId || TelegramAuthManager.getVerifiedUserId() || window.tgUserId || window.state?.player?.uid || "102125050");
    if (!targetUid) return false;

    try {
      const pName = customName || window.tgUserData?.first_name || window.state?.player?.name || "Taktoje";
      
      const cleanPlayerDoc = {
        telegram_id: targetUid,
        serverEpoch: 1,
        name: pName,
        avatar: window.state?.player?.avatarUrl || null,
        level: 1,
        xp: 0,
        maxXp: 120,
        cash: 75000,
        stars: 0,
        fuel: 100,
        tickets: 25,
        maxTickets: 25,
        karma: 50,
        streetCred: 100,
        connections: 0,
        safeDeposit: 0,
        loanDebt: 0,
        taxDebt: 0,
        hunger: 80,
        mood: 85,
        day: 1,
        club: null,
        hudColorId: 'cyber_neon',
        nickEffect: 'none',
        avatarEffect: 'none',
        tools: {},
        toolsWear: {},
        crypto: {},
        bankDeposits: [],
        ownedHouses: [],
        housingId: 'trailer',
        stats: { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 },
        foundedCorporations: [],
        onboardingDone: true,
        updatedAt: Date.now()
      };

      const cleanGarageDoc = {
        telegram_id: targetUid,
        cars: [],
        salesLot: [],
        ownedPlates: [],
        platesInventory: [],
        businesses: [],
        warehouse: { maxCars: 6, maxItems: 12, cars: [], items: [] },
        paidParking: { maxCars: 3, cars: [], dailyRate: 200, lastChargeDay: 0 },
        updatedAt: Date.now()
      };

      const cleanLeaderDoc = {
        uid: targetUid,
        name: pName,
        avatar: cleanPlayerDoc.avatar,
        level: 1,
        netWorth: 75000,
        profit: 0,
        bestCar: "Пешком",
        updatedAt: Date.now()
      };

      await Promise.all([
        setDoc(doc(db, "players", targetUid), cleanPlayerDoc),
        setDoc(doc(db, "garages", targetUid), cleanGarageDoc),
        setDoc(doc(db, "leaderboard", targetUid), cleanLeaderDoc)
      ]);

      console.log(`[☁️ Firestore] Профиль игрока ${targetUid} успешно сброшен в облаке до 75,000 ₽.`);
      return true;
    } catch (e) {
      console.error("[☁️ Firestore] Ошибка сброса профиля в облаке:", e);
      return false;
    }
  }
};

// ========================================================
// 8. НАДЁЖНЫЙ ВНУТРИИГРОВОЙ СБРОС (БЕЗ WINDOW.CONFIRM)
// ========================================================
function resetGameData() {
    let modal = document.getElementById('modalHardResetConfirm');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalHardResetConfirm';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-box text-center" style="max-width: 380px; background: #070b14; border: 1.5px solid var(--red); border-radius: 16px; padding: 18px; box-shadow: 0 0 30px rgba(255, 51, 102, 0.35);">
            <div style="font-size: 38px; margin-bottom: 6px;">⚠️</div>
            <div class="modal-glow-badge mb-2" style="color:var(--red); border-color:var(--red); display:inline-block;">
                ПОЛНЫЙ СБРОС ПРОФИЛЯ
            </div>
            <h3 class="font-bold mb-2 color-red" style="font-size:15px;">Начать с 75 000 ₽ (1 ур.)?</h3>
            <p class="sub-label mb-3" style="font-size:10px; line-height:1.45; color:#cbd5e1;">
                Все накопленные миллионы, автопарк, купленные бизнесы и недвижимость будут <b>безвозвратно удалены</b> и в памяти телефона, и в базе Firestore.
            </p>

            <div class="space-y-2">
                <button id="btnConfirmResetAction" onclick="window._executeHardResetFinal()" class="btn btn-danger w-full font-bold" style="padding:10px 0; font-size:11px;">
                    <i class="fa-solid fa-trash-can mr-1"></i> ДА, СТЕРЕТЬ И НАЧАТЬ СНАЧАЛА
                </button>
                <button onclick="document.getElementById('modalHardResetConfirm').classList.remove('active'); document.getElementById('modalHardResetConfirm').style.display='none';" class="btn btn-dark w-full" style="padding:8px 0; font-size:10px;">
                    Отмена
                </button>
            </div>
        </div>
    `;

    modal.classList.add('active');
    modal.style.display = 'flex';
    if (window.AudioFx) window.AudioFx.play('error');
}

async function _executeHardResetFinal() {
    const btn = document.getElementById('btnConfirmResetAction');
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Очистка базы Firestore...';
        btn.disabled = true;
    }

    window.__IS_RESETTING__ = true;
    const uid = String(TelegramAuthManager.getVerifiedUserId() || window.tgUserId || window.state?.player?.uid || "102125050");
    const pName = window.tgUserData?.first_name || window.state?.player?.name || "Taktoje";

    try {
        // 1. Очистка и перезапись в облаке Firestore
        await PlayersStorageManager.resetPlayerCloud(uid, pName);

        // 2. Очистка Telegram CloudStorage
        if (window.Telegram?.WebApp?.CloudStorage) {
            try {
                const tgCloud = window.Telegram.WebApp.CloudStorage;
                tgCloud.getKeys((err, keys) => {
                    if (!err && Array.isArray(keys)) {
                        keys.forEach(k => {
                            if (k && (k.includes('perekup') || k.includes('save'))) {
                                tgCloud.removeItem(k);
                            }
                        });
                    }
                });
            } catch(e) {}
        }

        // 3. Очистка локальных хранилищ
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch(e) {}

        // 4. Очистка памяти игры
        if (window.DEFAULT_STATE) {
            const clean = JSON.parse(JSON.stringify(window.DEFAULT_STATE));
            clean.player.cash = 75000;
            clean.player.level = 1;
            clean.player.name = pName;
            clean.player.uid = uid;
            Object.keys(window.state).forEach(k => delete window.state[k]);
            Object.assign(window.state, clean);
        }

        if (typeof showToast === 'function') {
            showToast("✅ Прогресс сброшен до 75 000 ₽! Перезагрузка...", "success");
        }

        // 5. Перезагрузка страницы
        setTimeout(() => {
            const cleanUrl = window.location.href.split('?')[0];
            window.location.replace(cleanUrl + '?reset=' + Date.now());
        }, 400);

    } catch (err) {
        console.error("[Reset Error]", err);
        localStorage.clear();
        window.location.reload();
    }
}

// ========================================================
// 9. ADMIN MANAGER
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
      if (!silent && typeof showToast === 'function') showToast(`Рынок очищен (${total} лотов)`, 'success');
      return true;
    } catch (e) {
      if (!silent && typeof showToast === 'function') showToast(`Ошибка: ${e.message}`, 'error');
      return false;
    }
  },

  resetCurrentPlayerLocal: resetGameData
};

// ========================================================
// 10. CLEANUP MANAGER (TTL)
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
// 11. ЭКСПОРТ
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

if (!window.FB_Bridge) window.FB_Bridge = {};
window.FB_Bridge.Players = PlayersStorageManager;
window.FB_Bridge.System = SystemConfigManager;
window.FB_Bridge.Leaderboard = LeaderboardManager;
window.FB_Bridge.Auth = TelegramAuthManager;
window.TelegramAuthManager = TelegramAuthManager;

window.resetGameData = resetGameData;
window._executeHardResetFinal = _executeHardResetFinal;

console.log("[☁️ FB_Core v1.6.0] Облачный сброс resetPlayerCloud активирован ✓");

// ========================================================
// firebase-bridge.js — ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ НА CLOUD FIRESTORE (v0.5.0)
// Разработчики: Илья Чепиль (DXF) & Perekup Dev Team
// Работает как ES-модуль. Требует <script type="module" src="firebase-bridge.js">
// ========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
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
  limit
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// --- ВСТАВЬТЕ СВОЙ КОНФИГ ИЗ КОНСОЛИ FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAV-FUWKge9c6sO-diK7wGqN3p1UbuW7Xc",
  authDomain: "perekupik-e2979.firebaseapp.com",
  projectId: "perekupik-e2979",
  storageBucket: "perekupik-e2979.firebasestorage.app",
  messagingSenderId: "242959354626",
  appId: "1:242959354626:web:f03ff4725763c86d33501b",
  measurementId: "G-CDCFWLQE2C"
};

// Флаг: включать ли реальную синхронизацию. Пока false — игра работает локально.
const FIREBASE_ENABLED = true;

let db = null;
if (FIREBASE_ENABLED) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

function fbLog(msg, data = null) {
  if (data) console.log(`[☁️ Firebase Bridge v0.5.0] ${msg}`, data);
  else console.log(`[☁️ Firebase Bridge v0.5.0] ${msg}`);
}

// ========================================================
// 1. СИНХРОНИЗАЦИЯ ИГРОВОГО СОХРАНЕНИЯ
// ========================================================
const CloudSaveManager = {
  async pushSave(userId, gameState) {
    if (!FIREBASE_ENABLED || !db) return;
    fbLog(`Отправка сейва: ${userId}`);
    const lightState = {
      player: gameState.player,
      timestamp: Date.now(),
      version: "v0.5.0"
    };
    try {
      await setDoc(doc(db, "saves", String(userId)), lightState);
    } catch (e) {
      console.error("[Firebase Bridge] Ошибка pushSave:", e);
    }
  },

  async pullSave(userId) {
    if (!FIREBASE_ENABLED || !db) return null;
    fbLog(`Запрос сейва: ${userId}`);
    try {
      const snap = await getDoc(doc(db, "saves", String(userId)));
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      console.error("[Firebase Bridge] Ошибка pullSave:", e);
      return null;
    }
  }
};

// ========================================================
// 2. ГЛОБАЛЬНАЯ P2P БИРЖА
// ========================================================
const P2PMarketManager = {
  async publishLot(lotData) {
    if (!FIREBASE_ENABLED || !db) {
      fbLog("Симуляция лота (Firebase отключён)", lotData);
      return true;
    }
    try {
      const payload = { ...lotData, timestamp: Date.now() };
      await setDoc(doc(db, "p2p_market", String(lotData.id)), payload);
      return true;
    } catch (e) {
      console.error("[Firebase Bridge] Ошибка publishLot:", e);
      return false;
    }
  },

  async fetchAllLots() {
    if (!FIREBASE_ENABLED || !db) return null;
    fbLog("Загрузка P2P рынка...");
    try {
      const q = query(collection(db, "p2p_market"), orderBy("timestamp", "desc"), limit(100));
      const snap = await getDocs(q);
      const lots = [];
      snap.forEach(d => lots.push({ id: d.id, ...d.data() }));
      return lots;
    } catch (e) {
      console.error("[Firebase Bridge] Ошибка fetchAllLots:", e);
      return [];
    }
  },

  async removeLot(lotId) {
    if (!FIREBASE_ENABLED || !db) return true;
    try {
      await deleteDoc(doc(db, "p2p_market", String(lotId)));
      return true;
    } catch (e) {
      console.error("[Firebase Bridge] Ошибка removeLot:", e);
      return false;
    }
  }
};

// ========================================================
// 3. ГЛОБАЛЬНЫЙ ЛИДЕРБОРД
// ========================================================
const LeaderboardManager = {
  async updateMyRank(userId, playerName, profit, level) {
    if (!FIREBASE_ENABLED || !db) return;
    if (profit <= 0) return;
    try {
      await setDoc(doc(db, "leaderboard", String(userId)), {
        name: playerName,
        profit,
        level,
        lastUpdate: Date.now()
      });
    } catch (e) {
      console.error("[Firebase Bridge] Ошибка updateMyRank:", e);
    }
  },

  async fetchTopPlayers() {
    if (!FIREBASE_ENABLED || !db) return null;
    fbLog("Загрузка лидерборда...");
    try {
      const q = query(collection(db, "leaderboard"), orderBy("profit", "desc"), limit(50));
      const snap = await getDocs(q);
      const players = [];
      snap.forEach(d => players.push({ id: d.id, ...d.data() }));
      return players;
    } catch (e) {
      console.error("[Firebase Bridge] Ошибка fetchTopPlayers:", e);
      return [];
    }
  }
};

// ========================================================
// 4. АВТОКЛУБЫ
// ========================================================
const SyndicateClubsManager = {
  async createOrUpdateClub(clubId, clubData) {
    if (!FIREBASE_ENABLED || !db) return true;
    try {
      await setDoc(doc(db, "clubs", String(clubId)), clubData);
      return true;
    } catch (e) {
      console.error("[Firebase Bridge] Ошибка createOrUpdateClub:", e);
      return false;
    }
  },

  async fetchAllClubs() {
    if (!FIREBASE_ENABLED || !db) return null;
    try {
      const snap = await getDocs(collection(db, "clubs"));
      const clubs = [];
      snap.forEach(d => clubs.push({ id: d.id, ...d.data() }));
      return clubs;
    } catch (e) {
      console.error("[Firebase Bridge] Ошибка fetchAllClubs:", e);
      return [];
    }
  }
};

// --- Экспорт в глобальную область для остальных скриптов игры ---
window.FB_Bridge = {
  CloudSave: CloudSaveManager,
  P2P: P2PMarketManager,
  Leaderboard: LeaderboardManager,
  Clubs: SyndicateClubsManager,
  enabled: FIREBASE_ENABLED
};

if (FIREBASE_ENABLED) {
  fbLog("Инициализация завершена. МУЛЬТИПЛЕЕР АКТИВЕН 🌐");
  fbLog(`Project ID: ${firebaseConfig.projectId}`);
} else {
  fbLog("Локальный (offline) режим 🔒");
}
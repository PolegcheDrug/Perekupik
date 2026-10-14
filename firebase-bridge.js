// ========================================================
// firebase-bridge.js — СЕТЕВОЙ ШЛЮЗ FIRESTORE 2.3.0 (v1.4.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.4.0:
//   - НИКАКИХ профилей без Telegram ID. Guest/dev/p2p профили удалены.
//   - getCurrentPlayerProfile() возвращает null при отсутствии Telegram.
//   - initSession() возвращает success:false, userId:null без Telegram.
//   - pushSave/pullSave безопасно выходят при null userId.
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
  runTransaction
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

// ========================================================
// ⭐ ХЕЛПЕР ЛОГИРОВАНИЯ FIRESTORE В DEVLOGGER
// ========================================================
function devLogFirestore(action, details) {
    if (window.DevLogger) {
        window.DevLogger.add('firestore', action + (details ? ' — ' + details : ''));
    }
}

// ========================================================
// ⭐ v1.4.0: ЕДИНАЯ ТОЧКА ПОЛУЧЕНИЯ TELEGRAM-ЮЗЕРА
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
  dialogs: new Map(), clubChats: new Map()
};

// ========================================================
// 3. КОЛЛЕКЦИИ: players/{id} И garages/{id}
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
      devLogFirestore('pushSave BLOCKED', 'нет userId — сохранение невозможно');
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

    const garageDoc = {
      telegram_id: String(targetUid),
      cars: (gameState.garage || []).slice(0, 35),
      salesLot: (gameState.salesLot || []).slice(0, 10),
      ownedPlates: (gameState.ownedPlates || []).slice(0, 20),
      businesses: (gameState.businesses || []).slice(0, 15),
      warehouse: gameState.player?.warehouse || { cars: [], items: [] },
      updatedAt: Date.now()
    };

    const currentHash = `${playerDoc.cash}_${playerDoc.level}_${garageDoc.cars.length}_${playerDoc.club?.id || 'none'}_${playerDoc.onboardingDone}`;
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
          setDoc(doc(db, "garages", String(targetUid)), garageDoc, { merge: true }),
          setDoc(doc(db, "saves", String(targetUid)), { ...playerDoc, ...garageDoc }, { merge: true })
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
          businesses: gData.businesses || []
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
// 4. market_lots
// ========================================================
const MARKET_FEE_PERCENT = 0.03;

const MarketLotsManager = {
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

      const payload = {
        lot_id: lotId, id: lotId,
        sellerId: String(profile.id),
        sellerName: profile.name || "Перекуп",
        type: lotData.type, name: lotData.name, price: rawPrice,
        itemData: lotData.itemData || {},
        status: "active", timestamp: Date.now()
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

      await Promise.all([
        setDoc(doc(db, "market_lots", lotId), payload),
        setDoc(doc(db, "p2p_market", lotId), payload)
      ]);

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
      const q = query(collection(db, "market_lots"), orderBy("timestamp", "desc"), limit(40));
      const snap = await getDocs(q);
      const lots = [];
      snap.forEach(d => {
        const item = d.data();
        if (item.status === "active") lots.push(item);
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
          item: lot.name, type: lot.type, price: lot.price, fee: marketFee, payout: sellerPayout, timestamp: Date.now()
        });
        tx.set(notifRef, {
          toUser: String(lot.sellerId), type: "deal_payout",
          title: "Продажа на P2P бирже!",
          text: `Покупатель ${profile.name} приобрёл «${lot.name}» за ${lot.price.toLocaleString()} ₽ (начислено: +${sellerPayout.toLocaleString()} ₽).`,
          amount: sellerPayout, read: false, claimed: false, timestamp: Date.now()
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

  async cancelLot(lotId, sellerId) {
    const targetUid = sellerId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return false;
    try {
      const lotRef = doc(db, "market_lots", String(lotId));
      const snap = await getDoc(lotRef);
      if (snap.exists() && String(snap.data().sellerId) === String(targetUid)) {
        const lot = snap.data();
        if (lot.type === "plate" || lot.type === "plates") {
          const plateStr = lot.itemData?.plate || lot.name;
          await RegisteredPlatesManager.releasePlate(plateStr, targetUid, false);
        }
        await deleteDoc(lotRef);
        CacheManager.marketLots = null;
        devLogFirestore('cancelLot OK', lotId);
        return true;
      }
    } catch (e) {
      devLogFirestore('cancelLot ERROR', e.message);
    }
    return false;
  }
};

// ========================================================
// 5. chat_messages
// ========================================================
const ChatMessagesManager = {
  async sendMessage(params) {
    const profile = params.senderProfile || TelegramAuthManager.getUserProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };
    const msgId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const payload = {
      msg_id: msgId, senderId: String(profile.id), senderName: profile.name || "Перекуп",
      receiverId: params.receiverId ? String(params.receiverId) : null,
      clubId: params.clubId ? String(params.clubId) : null,
      dialogId: params.dialogId || null, text: params.text, timestamp: Date.now()
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
      const q = query(collection(db, "chat_messages"), orderBy("timestamp", "asc"), limit(40));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => { const it = d.data(); if (it.dialogId === dialogId) list.push(it); });
      return list;
    } catch (e) { return []; }
  }
};

// ========================================================
// 6. notifications
// ========================================================
const NotificationsManager = {
  async fetchMyNotifications(userId) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return [];
    try {
      const q = query(collection(db, "notifications"), orderBy("timestamp", "desc"), limit(20));
      const snap = await getDocs(q);
      const notifs = [];
      snap.forEach(d => {
        const it = d.data();
        if (String(it.toUser) === String(targetUid) && !it.claimed) notifs.push({ id: d.id, ...it });
      });
      return notifs;
    } catch (e) { return []; }
  },
  async claimNotificationPayout(notifId) {
    try {
      await updateDoc(doc(db, "notifications", notifId), { claimed: true, read: true, claimedAt: Date.now() });
      return true;
    } catch (e) { return false; }
  }
};

// ========================================================
// 7. registered_plates & cars_catalog
// ========================================================
const RegisteredPlatesManager = {
  cleanPlateString(plateStr) {
    if (!plateStr) return "";
    return String(plateStr).toUpperCase().replace(/\s+/g, " ").trim();
  },
  async claimPlateAtomic(plateStr, ownerId, carId = null) {
    const cleanPlate = this.cleanPlateString(plateStr);
    if (!cleanPlate || cleanPlate.includes("ТРАНЗИТ")) return { success: true, plate: cleanPlate, transit: true };
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
        const payload = { plate: cleanPlate, ownerId: String(targetUid), carId: carId ? String(carId) : null, status: "owned", updatedAt: Date.now() };
        tx.set(plateRef, payload, { merge: true });
        return payload;
      });
      return { success: true, plate: result.plate };
    } catch (e) { return { success: false, error: e.message }; }
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
        tx.update(plateRef, { ownerId: archive ? null : String(targetUid), carId: null, status: archive ? "archived" : "storage", updatedAt: Date.now() });
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

const CarsCatalogManager = {
  async seedDefaultCarsCatalog(force = false) {
    const isSeeded = localStorage.getItem("perekup_db_seeded_v1");
    if (isSeeded && !force) return { success: true };
    if (typeof window.CAR_DATABASE === "undefined") return { success: false };
    try {
      let count = 0;
      for (const [category, carsList] of Object.entries(window.CAR_DATABASE)) {
        if (!Array.isArray(carsList)) continue;
        for (const car of carsList) {
          if (!car || !car.name) continue;
          const carDocId = "car_" + car.name.toLowerCase().replace(/[^a-z0-9а-я]/gi, "_");
          await setDoc(doc(db, "cars_catalog", carDocId), {
            id: carDocId, name: car.name, power: Number(car.power) || 100,
            basePrice: Number(car.basePrice) || 100000, drivetrain: car.drivetrain || "rwd",
            type: car.type || category, img: car.img || "",
            images: Array.isArray(car.images) && car.images.length > 0 ? car.images : [car.img || ""],
            fallback: car.fallback || "", authorId: "system", authorName: "Perekup Base",
            isActive: true, createdAt: Date.now()
          }, { merge: true });
          count++;
        }
      }
      localStorage.setItem("perekup_db_seeded_v1", "true");
      CacheManager.cloudCars = null;
      return { success: true, count };
    } catch (e) { return { success: false, error: e.message }; }
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
    } catch (e) { return CacheManager.cloudCars || []; }
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
// 8. clubs
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
// 9. leaderboard
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
  }
};

// ========================================================
// 10. ПРОФИЛЬ И ЭКСПОРТ
// ⭐ v1.4.0: НИКАКИХ guest/dev/p2p профилей.
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
  CloudSave: {
    pushSave: PlayersStorageManager.pushSave,
    pushSaveForce: PlayersStorageManager.pushSaveForce,
    pullSave: PlayersStorageManager.pullSave
  },
  P2P: MarketLotsManager,
  QuickChat: {
    getPhrasesList: (cat) => Object.values(CANNED_PHRASES).filter(p => !cat || p.category === cat),
    makeDialogId: (a, b, c) => `dlg_${[String(a), String(b)].sort().join("_")}_${c}`,
    sendPhrase: async (dId, pId, pr) => {
      const phr = CANNED_PHRASES[pId];
      if (!phr) return false;
      return (await ChatMessagesManager.sendMessage({ dialogId: dId, text: phr.text, senderProfile: pr })).success;
    },
    fetchDialogMessages: ChatMessagesManager.fetchMessagesForDialog
  }
};
window.TelegramAuthManager = TelegramAuthManager;

console.log("[☁️ FB_Bridge v1.4.0] Telegram-only. Guest/dev профили отключены.");
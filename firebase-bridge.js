// ========================================================
// firebase-bridge.js — СЕТЕВОЙ ШЛЮЗ FIRESTORE & AUTH 2.0 (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Полная облачная экосистема (Spark Plan 100% Free):
// 1. Cloud Cars Catalog (cars_catalog) с автоматической миграцией из data.js
// 2. Единый реестр уникальных госномеров (registered_plates) через runTransaction
// 3. Защищённая P2P-биржа с налогом рынка и отложенными выплатами
// 4. Облачные сейвы, Соцсеть «M», QuickChat, Клубы и Лидерборд
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

const DEFAULT_AUTH_SERVER_URL = "http://localhost:3000";

// ========================================================
// 0. TELEGRAM AUTH & SESSION MANAGER
// ========================================================
let verifiedUserId = null;
let currentUserProfile = null;

const TelegramAuthManager = {
  async initSession(customServerUrl = null) {
    const url = customServerUrl || window.AUTH_SERVER_URL || DEFAULT_AUTH_SERVER_URL;
    let initData = "";
    try {
      if (window.Telegram?.WebApp?.initData) {
        initData = window.Telegram.WebApp.initData;
      }
    } catch (e) {}

    const devUserId = (!initData && (location.hostname === "localhost" || location.hostname === "127.0.0.1"))
      ? (localStorage.getItem("perekup_dev_uid") || "dev_777")
      : null;

    try {
      const response = await fetch(`${url}/api/auth/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, devUserId })
      });

      if (!response.ok) throw new Error(`HTTP: ${response.status}`);

      const data = await response.json();
      if (!data.customToken) throw new Error("Токен не получен");

      const userCredential = await signInWithCustomToken(auth, data.customToken);
      verifiedUserId = userCredential.user.uid;
      currentUserProfile = data.user;

      console.log(`[🔐 Auth] Сессия подтверждена. UID: ${verifiedUserId}`);
      return { success: true, userId: verifiedUserId, user: currentUserProfile };
    } catch (err) {
      console.warn("[🔐 Auth] Фолбек на локальный профиль:", err);
      const fallback = getCurrentPlayerProfile();
      verifiedUserId = fallback.id;
      currentUserProfile = fallback;
      return { success: false, userId: verifiedUserId, user: currentUserProfile };
    }
  },

  getVerifiedUserId() {
    return verifiedUserId || getCurrentPlayerProfile().id;
  },

  getUserProfile() {
    return currentUserProfile || getCurrentPlayerProfile();
  }
};

// ========================================================
// 1. WHITE-LIST ШАБЛОННЫХ ФРАЗ (QUICK-CHAT)
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
// 2. TTL КЭШ ДЛЯ ОПТИМИЗАЦИИ ЗАПРОСОВ (SPARK QUOTA PROTECT)
// ========================================================
const CacheManager = {
  cloudCars: null,
  cloudCarsTimestamp: 0,
  CLOUD_CARS_TTL: 45000,

  marketLots: null,
  marketTimestamp: 0,
  MARKET_TTL: 20000,

  leaderboard: null,
  leaderboardTimestamp: 0,
  LEADERBOARD_TTL: 40000,

  clubs: null,
  clubsTimestamp: 0,
  CLUBS_TTL: 30000,

  feed: null,
  feedTimestamp: 0,
  FEED_TTL: 15000,

  friends: null,
  friendsTimestamp: 0,
  FRIENDS_TTL: 20000,

  dialogs: new Map(),
  clubChats: new Map()
};

// ========================================================
// 3. БЛОК 1: ОБЛАЧНЫЙ КАТАЛОГ АВТОМОБИЛЕЙ (CARS_CATALOG)
// ========================================================
const CarsCatalogManager = {
  // Миграция локальной базы CAR_DATABASE (из data.js) в Firestore
  async seedDefaultCarsCatalog(force = false) {
    const isSeeded = localStorage.getItem("perekup_db_seeded_v1");
    if (isSeeded && !force) return { success: true, message: "База уже мигрирована ранее" };

    if (typeof window.CAR_DATABASE === "undefined") {
      return { success: false, error: "Локальная база CAR_DATABASE не найдена" };
    }

    try {
      console.log("[☁️ CarsCatalog] Запуск миграции локальных авто в Cloud Firestore...");
      let totalMigrated = 0;

      for (const [category, carsList] of Object.entries(window.CAR_DATABASE)) {
        if (!Array.isArray(carsList)) continue;

        for (const car of carsList) {
          if (!car || !car.name) continue;
          const carDocId = "car_" + car.name.toLowerCase().replace(/[^a-z0-9а-я]/gi, "_");
          const carRef = doc(db, "cars_catalog", carDocId);

          const payload = {
            id: carDocId,
            name: car.name,
            power: Number(car.power) || 100,
            basePrice: Number(car.basePrice) || 100000,
            drivetrain: car.drivetrain || "rwd",
            type: car.type || category,
            img: car.img || "",
            images: Array.isArray(car.images) && car.images.length > 0 ? car.images : [car.img || ""],
            fallback: car.fallback || "",
            authorId: "system",
            authorName: "Perekup Base",
            isActive: true,
            createdAt: Date.now()
          };

          await setDoc(carRef, payload, { merge: true });
          totalMigrated++;
        }
      }

      localStorage.setItem("perekup_db_seeded_v1", "true");
      console.log(`[☁️ CarsCatalog] Миграция успешно завершена! Перенесено ${totalMigrated} моделей.`);
      CacheManager.cloudCars = null;
      return { success: true, count: totalMigrated };
    } catch (e) {
      console.error("[☁️ CarsCatalog] Ошибка миграции базы:", e);
      return { success: false, error: e.message };
    }
  },

  // Получить все машины из Cloud Firestore с интеграцией в CAR_DATABASE
  async fetchCloudCars(force = false) {
    const now = Date.now();
    if (!force && CacheManager.cloudCars && (now - CacheManager.cloudCarsTimestamp < CacheManager.CLOUD_CARS_TTL)) {
      return CacheManager.cloudCars;
    }

    try {
      const q = query(collection(db, "cars_catalog"), orderBy("basePrice", "asc"), limit(200));
      const snap = await getDocs(q);
      const cars = [];

      snap.forEach(d => {
        const item = d.data();
        if (item.isActive !== false) {
          cars.push(item);
        }
      });

      // Перезаписываем глобальный CAR_DATABASE, чтобы игра больше не использовала статичный data.js
      if (cars.length > 0) {
        const updatedDatabase = {
          economy: [], scooter: [], moto: [], atv: [],
          comfort: [], premium: [], hyper: [], truck: [], yacht: []
        };

        cars.forEach(c => {
          const cat = c.type || "economy";
          if (!updatedDatabase[cat]) updatedDatabase[cat] = [];
          updatedDatabase[cat].push(c);
        });

        window.CAR_DATABASE = updatedDatabase;
        console.log(`[☁️ CarsCatalog] Синхронизировано ${cars.length} машин из Cloud Firestore. Локальная база обновлена.`);
      }

      CacheManager.cloudCars = cars;
      CacheManager.cloudCarsTimestamp = now;
      return cars;
    } catch (e) {
      console.warn("[☁️ CarsCatalog] Сбой загрузки облачных авто, используем кэш/фолбек:", e);
      return CacheManager.cloudCars || [];
    }
  },

  // Создание или обновление карточки машины онлайн (из DevStudio)
  async saveCarToCloud(carData, authorProfile) {
    const profile = authorProfile || TelegramAuthManager.getUserProfile();
    if (!carData || !carData.name) return { success: false, error: "Не указано название авто" };

    try {
      const carDocId = carData.id || ("car_" + carData.name.toLowerCase().replace(/[^a-z0-9а-я]/gi, "_"));
      const carRef = doc(db, "cars_catalog", carDocId);

      const payload = {
        id: carDocId,
        name: carData.name.trim(),
        power: Number(carData.power) || 100,
        basePrice: Number(carData.basePrice) || 100000,
        drivetrain: carData.drivetrain || "rwd",
        type: carData.type || "economy",
        img: carData.img || (carData.images && carData.images[0]) || "",
        images: Array.isArray(carData.images) && carData.images.length > 0 ? carData.images : [carData.img || ""],
        fallback: carData.fallback || "",
        authorId: String(profile?.id || "unknown"),
        authorName: profile?.name || "Перекуп",
        isActive: true,
        updatedAt: Date.now()
      };

      await setDoc(carRef, payload, { merge: true });
      CacheManager.cloudCars = null;

      // Мгновенно добавляем в память текущей сессии
      if (window.CAR_DATABASE) {
        const cat = payload.type;
        if (!window.CAR_DATABASE[cat]) window.CAR_DATABASE[cat] = [];
        const existingIdx = window.CAR_DATABASE[cat].findIndex(c => c.name === payload.name);
        if (existingIdx !== -1) {
          window.CAR_DATABASE[cat][existingIdx] = payload;
        } else {
          window.CAR_DATABASE[cat].unshift(payload);
        }
      }

      return { success: true, car: payload };
    } catch (e) {
      console.error("[☁️ CarsCatalog] Ошибка сохранения машины в Firestore:", e);
      return { success: false, error: e.message };
    }
  }
};

// ========================================================
// 4. БЛОК 2: ЕДИНЫЙ РЕЕСТР ГОСНОМЕРОВ (REGISTERED_PLATES)
// ========================================================
const RegisteredPlatesManager = {
  cleanPlateString(plateStr) {
    if (!plateStr) return "";
    return String(plateStr).toUpperCase().replace(/\s+/g, " ").trim();
  },

  // Проверка уникальности и резерв номера через транзакцию Firestore
  async claimPlateAtomic(plateStr, ownerId, carId = null) {
    const cleanPlate = this.cleanPlateString(plateStr);
    if (!cleanPlate || cleanPlate.includes("ТРАНЗИТ")) {
      return { success: true, plate: cleanPlate, transit: true };
    }

    const docId = cleanPlate.replace(/\s+/g, "_");
    const plateRef = doc(db, "registered_plates", docId);
    const targetUid = ownerId || TelegramAuthManager.getVerifiedUserId();

    try {
      const result = await runTransaction(db, async (tx) => {
        const plateSnap = await tx.get(plateRef);

        if (plateSnap.exists()) {
          const data = plateSnap.data();
          if (data.ownerId && String(data.ownerId) !== String(targetUid) && data.status === "owned") {
            throw new Error(`Госномер «${cleanPlate}» уже зарегистрирован за другим владельцем!`);
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

      console.log(`[🏷️ Plates] Госномер «${cleanPlate}» успешно закреплен за ${targetUid}`);
      return { success: true, plate: result.plate };
    } catch (e) {
      console.warn("[🏷️ Plates] Ошибка резерва номера:", e.message);
      return { success: false, error: e.message };
    }
  },

  // Освобождение / Снятие номера на хранение или в архив
  async releasePlate(plateStr, ownerId, archive = false) {
    const cleanPlate = this.cleanPlateString(plateStr);
    if (!cleanPlate || cleanPlate.includes("ТРАНЗИТ")) return true;

    const docId = cleanPlate.replace(/\s+/g, "_");
    const plateRef = doc(db, "registered_plates", docId);
    const targetUid = ownerId || TelegramAuthManager.getVerifiedUserId();

    try {
      await runTransaction(db, async (tx) => {
        const plateSnap = await tx.get(plateRef);
        if (!plateSnap.exists()) return;

        const data = plateSnap.data();
        if (data.ownerId && String(data.ownerId) !== String(targetUid)) {
          throw new Error("Вы не являетесь владельцем этого госномера!");
        }

        if (archive) {
          tx.update(plateRef, {
            ownerId: null,
            carId: null,
            status: "archived",
            updatedAt: Date.now()
          });
        } else {
          tx.update(plateRef, {
            carId: null,
            status: "storage",
            updatedAt: Date.now()
          });
        }
      });

      return true;
    } catch (e) {
      console.warn("[🏷️ Plates] Ошибка освобождения номера:", e);
      return false;
    }
  },

  // Проверка статуса номера онлайн
  async isPlateAvailable(plateStr) {
    const cleanPlate = this.cleanPlateString(plateStr);
    if (!cleanPlate || cleanPlate.includes("ТРАНЗИТ")) return true;

    const docId = cleanPlate.replace(/\s+/g, "_");
    try {
      const snap = await getDoc(doc(db, "registered_plates", docId));
      if (!snap.exists()) return true;
      const data = snap.data();
      return data.status !== "owned";
    } catch (e) {
      return true;
    }
  }
};

// ========================================================
// 5. БЛОК 3: P2P БИРЖА (НАЛОГ РЫНКА 3% И ЧЕСТНЫЕ ВЫПЛАТЫ)
// ========================================================
const MARKET_FEE_PERCENT = 0.03; // 3% анти-инфляционный сбор биржи

const P2PMarketManager = {
  async publishLot(lotData, sellerProfile) {
    const profile = sellerProfile || TelegramAuthManager.getUserProfile();
    if (!lotData || !profile?.id) return { success: false, error: "Нет данных" };

    try {
      const lotId = "lot_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const rawPrice = Math.max(1000, parseInt(lotData.price) || 50000);

      const payload = {
        id: lotId,
        sellerId: String(profile.id),
        sellerName: profile.name || "Перекуп",
        type: lotData.type,
        name: lotData.name,
        price: rawPrice,
        itemData: lotData.itemData || {},
        status: "active",
        createdAt: Date.now()
      };

      // Если выставляется номер — помечаем статус на бирже
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

      await setDoc(doc(db, "p2p_market", lotId), payload);
      CacheManager.marketLots = null;
      return { success: true, lotId };
    } catch (e) {
      console.error("[P2P] Ошибка публикации лота:", e);
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
        collection(db, "p2p_market"),
        orderBy("createdAt", "desc"),
        limit(40)
      );
      const snap = await getDocs(q);
      const lots = [];
      snap.forEach(d => {
        const item = d.data();
        if (item.status === "active") lots.push(item);
      });

      CacheManager.marketLots = lots;
      CacheManager.marketTimestamp = now;
      return lots;
    } catch (e) {
      console.warn("[P2P] Ошибка загрузки рынка:", e);
      return CacheManager.marketLots || [];
    }
  },

  async buyLotAtomic(lotId, buyerProfile, buyerCash) {
    const profile = buyerProfile || TelegramAuthManager.getUserProfile();
    if (!lotId || !profile?.id) return { success: false, error: "Неверные данные" };

    const lotRef = doc(db, "p2p_market", String(lotId));
    const payoutRef = doc(db, "payouts", "pay_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6));

    try {
      const transactionResult = await runTransaction(db, async (tx) => {
        const lotSnap = await tx.get(lotRef);
        if (!lotSnap.exists()) throw new Error("Лот снят с продажи или не существует!");

        const lot = lotSnap.data();
        if (lot.status !== "active") throw new Error("Этот лот уже успел купить другой перекуп!");
        if (lot.sellerId === String(profile.id)) throw new Error("Нельзя купить собственный лот!");
        if (buyerCash < lot.price) throw new Error("Недостаточно денег на балансе!");

        // Расчет выплаты продавцу с вычетом налога биржи
        const marketFee = Math.round(lot.price * MARKET_FEE_PERCENT);
        const sellerPayout = lot.price - marketFee;

        tx.update(lotRef, {
          status: "sold",
          buyerId: String(profile.id),
          buyerName: profile.name || "Покупатель",
          soldAt: Date.now()
        });

        tx.set(payoutRef, {
          sellerId: lot.sellerId,
          buyerName: profile.name || "Покупатель",
          amount: sellerPayout,
          grossAmount: lot.price,
          fee: marketFee,
          itemTitle: lot.name,
          claimed: false,
          createdAt: Date.now()
        });

        // Если куплен номер — перепривязываем владельца в едином реестре
        if (lot.type === "plate" || lot.type === "plates") {
          const plateStr = lot.itemData?.plate || lot.name;
          const clean = RegisteredPlatesManager.cleanPlateString(plateStr);
          if (clean) {
            const pDocId = clean.replace(/\s+/g, "_");
            const plateRef = doc(db, "registered_plates", pDocId);
            tx.set(plateRef, {
              plate: clean,
              ownerId: String(profile.id),
              carId: null,
              status: "owned",
              updatedAt: Date.now()
            }, { merge: true });
          }
        }

        return lot;
      });

      CacheManager.marketLots = null;
      return { success: true, lot: transactionResult };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async cancelLot(lotId, sellerId) {
    const targetUid = sellerId || TelegramAuthManager.getVerifiedUserId();
    try {
      const lotRef = doc(db, "p2p_market", String(lotId));
      const snap = await getDoc(lotRef);
      if (snap.exists() && snap.data().sellerId === String(targetUid)) {
        const lot = snap.data();
        
        // Возвращаем статус номера обратно владельцу
        if (lot.type === "plate" || lot.type === "plates") {
          const plateStr = lot.itemData?.plate || lot.name;
          await RegisteredPlatesManager.releasePlate(plateStr, targetUid, false);
        }

        await deleteDoc(lotRef);
        CacheManager.marketLots = null;
        return true;
      }
    } catch (e) {
      console.warn("[P2P] Ошибка отмены лота:", e);
    }
    return false;
  },

  async claimPendingPayouts(userId) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return { totalClaimed: 0, claimedItems: [] };
    try {
      const q = query(collection(db, "payouts"), limit(15));
      const snap = await getDocs(q);
      let totalClaimed = 0;
      const claimedItems = [];

      for (const d of snap.docs) {
        const item = d.data();
        if (item.sellerId === String(targetUid) && !item.claimed) {
          totalClaimed += item.amount;
          claimedItems.push(`${item.itemTitle} (+${Number(item.amount).toLocaleString()} ₽)`);
          await updateDoc(d.ref, { claimed: true, claimedAt: Date.now() });
        }
      }
      return { totalClaimed, claimedItems };
    } catch (e) {
      console.warn("[P2P] Ошибка сбора выплат:", e);
      return { totalClaimed: 0, claimedItems: [] };
    }
  }
};

// ========================================================
// 6. ОБЛАЧНЫЕ СОХРАНЕНИЯ (CLOUD SAVE)
// ========================================================
let saveDebounceTimer = null;
let lastSavedHash = "";

const CloudSaveManager = {
  pushSave(userId, gameState) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return;

    const payload = {
      player: {
        name: gameState.player?.name || "Перекуп",
        cash: gameState.player?.cash || 0,
        stars: gameState.player?.stars || 0,
        fuel: gameState.player?.fuel || 100,
        level: gameState.player?.level || 1,
        xp: gameState.player?.xp || 0,
        maxXp: gameState.player?.maxXp || 120,
        karma: gameState.player?.karma || 50,
        streetCred: gameState.player?.streetCred || 100,
        connections: gameState.player?.connections || 1,
        expressTickets: gameState.player?.expressTickets || 25,
        maxExpressTickets: gameState.player?.maxExpressTickets || 25,
        safeDeposit: gameState.player?.safeDeposit || 0,
        loanDebt: gameState.player?.loanDebt || 0,
        taxDebt: gameState.player?.taxDebt || 0,
        hunger: gameState.player?.hunger || 80,
        mood: gameState.player?.mood || 85,
        day: gameState.player?.day || 1,
        stats: gameState.player?.stats || {},
        ownedHouses: gameState.player?.ownedHouses || [],
        housingId: gameState.player?.housingId || 'trailer',
        housingType: gameState.player?.housingType || 'rent',
        hudColorId: gameState.player?.hudColorId || 'lightning',
        nickEffect: gameState.player?.nickEffect || 'none',
        avatarEffect: gameState.player?.avatarEffect || 'none',
        club: gameState.player?.club || null,
        tools: gameState.player?.tools || {},
        toolsWear: gameState.player?.toolsWear || {},
        crypto: gameState.player?.crypto || {},
        bankDeposits: gameState.player?.bankDeposits || []
      },
      garage: (gameState.garage || []).slice(0, 35),
      salesLot: (gameState.salesLot || []).slice(0, 10),
      ownedPlates: (gameState.ownedPlates || []).slice(0, 20),
      businesses: (gameState.businesses || []).slice(0, 15),
      updatedAt: Date.now()
    };

    const currentHash = `${payload.player.cash}_${payload.player.level}_${payload.garage.length}_${payload.player.club?.id || 'none'}`;
    if (currentHash === lastSavedHash) return;

    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(async () => {
      try {
        await setDoc(doc(db, "saves", String(targetUid)), payload, { merge: true });
        lastSavedHash = currentHash;
        console.log(`[☁️ Firebase] Прогресс синхронизирован для ${targetUid}`);
      } catch (e) {
        console.warn("[☁️ Firebase] Ошибка записи сейва:", e);
      }
    }, 3500);
  },

  async pullSave(userId) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return null;
    try {
      const snap = await getDoc(doc(db, "saves", String(targetUid)));
      if (snap.exists()) {
        console.log(`[☁️ Firebase] Сейв найден в облаке для ${targetUid}`);
        return snap.data();
      }
    } catch (e) {
      console.warn("[☁️ Firebase] Ошибка загрузки сейва:", e);
    }
    return null;
  }
};

// ========================================================
// 7. СОЦИАЛЬНАЯ СЕТЬ «M» (ПУЛЬС, ДРУЗЬЯ, ПОДАРКИ, ДУЭЛИ)
// ========================================================
const M_NetworkManager = {
  async publishPost(eventData, userProfile) {
    const profile = userProfile || TelegramAuthManager.getUserProfile();
    if (!eventData || !profile?.id) return false;

    try {
      const postId = "post_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const payload = {
        id: postId,
        authorId: String(profile.id),
        authorName: profile.name || "Перекуп",
        avatar: profile.photoUrl || null,
        type: eventData.type || "deal",
        title: eventData.title || "Сделка закрыта!",
        text: eventData.text || "",
        carName: eventData.carName || null,
        carImg: eventData.carImg || null,
        profit: eventData.profit || 0,
        reactions: { fire: 0, cash: 0, handshake: 0, skull: 0 },
        reactedUsers: [],
        createdAt: Date.now()
      };

      await setDoc(doc(db, "m_feed", postId), payload);
      CacheManager.feed = null;
      return true;
    } catch (e) {
      console.warn("[M-Network] Ошибка публикации поста:", e);
      return false;
    }
  },

  async fetchFeed(force = false) {
    const now = Date.now();
    if (!force && CacheManager.feed && (now - CacheManager.feedTimestamp < CacheManager.FEED_TTL)) {
      return CacheManager.feed;
    }

    try {
      const q = query(collection(db, "m_feed"), orderBy("createdAt", "desc"), limit(25));
      const snap = await getDocs(q);
      const posts = [];
      snap.forEach(d => posts.push(d.data()));

      CacheManager.feed = posts;
      CacheManager.feedTimestamp = now;
      return posts;
    } catch (e) {
      console.warn("[M-Network] Ошибка загрузки ленты:", e);
      return CacheManager.feed || [];
    }
  },

  async toggleReaction(postId, reactionType, userProfile) {
    const profile = userProfile || TelegramAuthManager.getUserProfile();
    if (!postId || !profile?.id) return false;

    try {
      const postRef = doc(db, "m_feed", postId);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(postRef);
        if (!snap.exists()) return;

        const data = snap.data();
        const reacted = data.reactedUsers || [];
        const userReactionKey = `${profile.id}_${reactionType}`;

        if (reacted.includes(userReactionKey)) {
          const newReacted = reacted.filter(r => r !== userReactionKey);
          const currentCount = (data.reactions && data.reactions[reactionType]) ? data.reactions[reactionType] : 1;
          tx.update(postRef, {
            [`reactions.${reactionType}`]: Math.max(0, currentCount - 1),
            reactedUsers: newReacted
          });
        } else {
          reacted.push(userReactionKey);
          const currentCount = (data.reactions && data.reactions[reactionType]) ? data.reactions[reactionType] : 0;
          tx.update(postRef, {
            [`reactions.${reactionType}`]: currentCount + 1,
            reactedUsers: reacted
          });
        }
      });

      CacheManager.feed = null;
      return true;
    } catch (e) {
      console.warn("[M-Network] Ошибка реакции:", e);
      return false;
    }
  },

  async addFriendDirect(myProfile, targetProfile) {
    if (!myProfile?.id || !targetProfile?.id || String(myProfile.id) === String(targetProfile.id)) {
      return { success: false, error: "Некорректный ID" };
    }

    try {
      const docId = `friend_${myProfile.id}_${targetProfile.id}`;
      await setDoc(doc(db, "m_friends", docId), {
        userIdA: String(myProfile.id),
        userIdB: String(targetProfile.id),
        friendName: targetProfile.name || "Напарник",
        friendUsername: targetProfile.username || "",
        status: "active",
        lastGiftSentAt: 0,
        createdAt: Date.now()
      });

      CacheManager.friends = null;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async fetchFriends(userId, force = false) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    const now = Date.now();
    if (!force && CacheManager.friends && (now - CacheManager.friendsTimestamp < CacheManager.FRIENDS_TTL)) {
      return CacheManager.friends;
    }

    try {
      const q = query(collection(db, "m_friends"), limit(50));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => {
        const item = d.data();
        if (item.userIdA === String(targetUid) || item.userIdB === String(targetUid)) {
          list.push({
            id: item.userIdA === String(targetUid) ? item.userIdB : item.userIdA,
            name: item.friendName || "Напарник",
            lastGiftSentAt: item.lastGiftSentAt || 0
          });
        }
      });

      CacheManager.friends = list;
      CacheManager.friendsTimestamp = now;
      return list;
    } catch (e) {
      return CacheManager.friends || [];
    }
  },

  async sendDailyGift(senderProfile, targetFriendId, giftType = "fuel") {
    const profile = senderProfile || TelegramAuthManager.getUserProfile();
    if (!profile?.id || !targetFriendId) return { success: false, error: "Ошибка данных" };

    try {
      const giftDocId = `gift_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      await setDoc(doc(db, "m_gifts", giftDocId), {
        id: giftDocId,
        fromId: String(profile.id),
        fromName: profile.name,
        toId: String(targetFriendId),
        giftType: giftType,
        claimed: false,
        createdAt: Date.now()
      });

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async claimIncomingGifts(userId) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return { totalFuel: 0, totalTickets: 0, senders: [] };

    try {
      const q = query(collection(db, "m_gifts"), limit(20));
      const snap = await getDocs(q);
      let totalFuel = 0;
      let totalTickets = 0;
      const senders = [];

      for (const d of snap.docs) {
        const item = d.data();
        if (item.toId === String(targetUid) && !item.claimed) {
          if (item.giftType === "fuel") totalFuel += 10;
          if (item.giftType === "ticket") totalTickets += 1;
          senders.push(item.fromName || "Друг");
          await updateDoc(d.ref, { claimed: true, claimedAt: Date.now() });
        }
      }

      return { totalFuel, totalTickets, senders };
    } catch (e) {
      return { totalFuel: 0, totalTickets: 0, senders: [] };
    }
  }
};

// ========================================================
// 8. МЕССЕНДЖЕР И ШАБЛОННЫЕ ДИАЛОГИ (QUICK-CHAT)
// ========================================================
const QuickChatManager = {
  getPhrasesList(filterCat = null) {
    const list = Object.values(CANNED_PHRASES);
    if (!filterCat) return list;
    return list.filter(p => p.category === filterCat);
  },

  makeDialogId(userIdA, userIdB, contextId = "general") {
    const sortedUsers = [String(userIdA), String(userIdB)].sort().join("_");
    return `dlg_${sortedUsers}_${contextId}`;
  },

  async sendPhrase(dialogId, phraseId, senderProfile, contextMeta = {}) {
    const profile = senderProfile || TelegramAuthManager.getUserProfile();
    if (!dialogId || !profile?.id) return false;
    const phraseObj = CANNED_PHRASES[phraseId];
    if (!phraseObj) return false;

    try {
      const msgId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5);
      const msgRef = doc(db, "chat_dialogs", dialogId, "messages", msgId);

      await setDoc(msgRef, {
        id: msgId,
        senderId: String(profile.id),
        senderName: profile.name || "Перекуп",
        phraseId: phraseObj.id,
        text: phraseObj.text,
        createdAt: Date.now()
      });

      const dialogMetaRef = doc(db, "dialogs_meta", dialogId);
      await setDoc(dialogMetaRef, {
        dialogId,
        lastMessage: phraseObj.text,
        lastSender: profile.name || "Перекуп",
        lastSenderId: String(profile.id),
        participantA: String(contextMeta.participantA || profile.id),
        participantB: String(contextMeta.participantB || "other"),
        lotTitle: contextMeta.lotTitle || "",
        lotPrice: contextMeta.lotPrice || 0,
        lotCarData: contextMeta.lotCarData || null,
        buyerAvatar: contextMeta.buyerAvatar || "👨‍💼",
        updatedAt: Date.now()
      }, { merge: true });

      const cached = CacheManager.dialogs.get(dialogId);
      if (cached) {
        cached.msgs.push({
          id: msgId,
          senderId: String(profile.id),
          senderName: profile.name || "Перекуп",
          phraseId: phraseObj.id,
          text: phraseObj.text,
          createdAt: Date.now()
        });
      }

      return true;
    } catch (e) {
      console.warn("[Chat] Ошибка отправки реплики:", e);
      return false;
    }
  },

  async fetchDialogMessages(dialogId) {
    if (!dialogId) return [];
    const now = Date.now();
    const cached = CacheManager.dialogs.get(dialogId);
    if (cached && (now - cached.timestamp < 6000)) {
      return cached.msgs;
    }

    try {
      const q = query(
        collection(db, "chat_dialogs", dialogId, "messages"),
        orderBy("createdAt", "asc"),
        limit(35)
      );
      const snap = await getDocs(q);
      const msgs = [];
      snap.forEach(d => msgs.push(d.data()));

      CacheManager.dialogs.set(dialogId, { msgs, timestamp: now });
      return msgs;
    } catch (e) {
      console.warn("[Chat] Ошибка загрузки сообщений диалога:", e);
      return cached ? cached.msgs : [];
    }
  },

  async fetchUserDialogs(userId) {
    const targetUid = userId || TelegramAuthManager.getVerifiedUserId();
    if (!targetUid) return [];
    try {
      const q = query(
        collection(db, "dialogs_meta"),
        orderBy("updatedAt", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => {
        const item = d.data();
        if (item.participantA === String(targetUid) || item.participantB === String(targetUid) || item.dialogId.includes(String(targetUid))) {
          list.push(item);
        }
      });
      return list;
    } catch (e) {
      console.warn("[Chat] Ошибка загрузки списка диалогов:", e);
      return [];
    }
  }
};

// ========================================================
// 9. СООБЩЕСТВА: АВТОКЛУБЫ С КЛАНОВЫМ ОБЩАКОМ И ЧАТОМ
// ========================================================
const ClubsManager = {
  async fetchClubs(force = false) {
    const now = Date.now();
    if (!force && CacheManager.clubs && (now - CacheManager.clubsTimestamp < CacheManager.CLUBS_TTL)) {
      return CacheManager.clubs;
    }

    try {
      const q = query(collection(db, "clubs"), orderBy("bank", "desc"), limit(25));
      const snap = await getDocs(q);
      const clubs = [];
      snap.forEach(d => clubs.push({ id: d.id, ...d.data() }));

      CacheManager.clubs = clubs;
      CacheManager.clubsTimestamp = now;
      return clubs;
    } catch (e) {
      console.warn("[Clubs] Ошибка загрузки клубов:", e);
      return CacheManager.clubs || [];
    }
  },

  async createClub(clubName, userProfile, fee = 100000) {
    const profile = userProfile || TelegramAuthManager.getUserProfile();
    if (!clubName || !profile?.id) return { success: false, error: "Неверные данные" };

    try {
      const clubId = "club_" + Date.now();
      const clubData = {
        id: clubId,
        name: clubName.trim(),
        leaderId: String(profile.id),
        leaderName: profile.name || "Олигарх",
        membersCount: 1,
        bank: 0,
        fee: Math.max(10000, fee),
        perk: "+10% к оценке авто клуба",
        createdAt: Date.now()
      };

      await setDoc(doc(db, "clubs", clubId), clubData);
      await setDoc(doc(db, "clubs", clubId, "members", String(profile.id)), {
        userId: String(profile.id),
        userName: profile.name,
        role: "leader",
        joinedAt: Date.now()
      });

      CacheManager.clubs = null;
      return { success: true, club: clubData };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async joinClub(clubId, userProfile) {
    const profile = userProfile || TelegramAuthManager.getUserProfile();
    if (!clubId || !profile?.id) return false;
    try {
      const clubRef = doc(db, "clubs", String(clubId));
      const memberRef = doc(db, "clubs", String(clubId), "members", String(profile.id));

      await runTransaction(db, async (tx) => {
        const cSnap = await tx.get(clubRef);
        if (!cSnap.exists()) throw new Error("Клуб не найден!");

        const cur = cSnap.data();
        tx.update(clubRef, { membersCount: (cur.membersCount || 1) + 1 });
        tx.set(memberRef, {
          userId: String(profile.id),
          userName: profile.name,
          role: "member",
          joinedAt: Date.now()
        });
      });

      CacheManager.clubs = null;
      return true;
    } catch (e) {
      console.warn("[Clubs] Ошибка вступления в клуб:", e);
      return false;
    }
  },

  async depositToClubBank(clubId, amount, userProfile) {
    if (!clubId || amount <= 0) return false;
    const clubRef = doc(db, "clubs", String(clubId));

    try {
      await runTransaction(db, async (tx) => {
        const cSnap = await tx.get(clubRef);
        if (!cSnap.exists()) throw new Error("Клуб не найден!");
        const cur = cSnap.data();
        tx.update(clubRef, { bank: (cur.bank || 0) + amount });
      });

      CacheManager.clubs = null;
      return true;
    } catch (e) {
      console.warn("[Clubs] Ошибка взноса в общак:", e);
      return false;
    }
  },

  async sendClubChatMessage(clubId, phraseId, userProfile) {
    const profile = userProfile || TelegramAuthManager.getUserProfile();
    if (!clubId || !profile?.id) return false;
    const phraseObj = CANNED_PHRASES[phraseId];
    if (!phraseObj) return false;

    try {
      const msgId = "cmsg_" + Date.now();
      const msgRef = doc(db, "clubs", String(clubId), "chat", msgId);

      await setDoc(msgRef, {
        id: msgId,
        senderId: String(profile.id),
        senderName: profile.name || "Член клуба",
        text: phraseObj.text,
        createdAt: Date.now()
      });

      return true;
    } catch (e) {
      console.warn("[Clubs] Ошибка отправки сообщения в клуб:", e);
      return false;
    }
  },

  async fetchClubChatMessages(clubId) {
    if (!clubId) return [];
    try {
      const q = query(
        collection(db, "clubs", String(clubId), "chat"),
        orderBy("createdAt", "asc"),
        limit(30)
      );
      const snap = await getDocs(q);
      const msgs = [];
      snap.forEach(d => msgs.push(d.data()));
      return msgs;
    } catch (e) {
      return [];
    }
  }
};

// ========================================================
// 10. РЕФЕРАЛЫ TELEGRAM & СТАРТОВЫЕ БОНУСЫ
// ========================================================
const FriendsReferralManager = {
  async handleReferralEntry(referrerId, myProfile) {
    const profile = myProfile || TelegramAuthManager.getUserProfile();
    if (!referrerId || !profile?.id || String(referrerId) === String(profile.id)) {
      return { rewarded: false };
    }

    const refDoc = doc(db, "referrals", `${referrerId}_${profile.id}`);
    try {
      const snap = await getDoc(refDoc);
      if (snap.exists()) return { rewarded: false };

      await setDoc(refDoc, {
        referrerId: String(referrerId),
        invitedId: String(profile.id),
        invitedName: profile.name,
        rewardCash: 75000,
        createdAt: Date.now()
      });

      const payoutRef = doc(db, "payouts", "refpay_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5));
      await setDoc(payoutRef, {
        sellerId: String(referrerId),
        buyerName: profile.name,
        amount: 75000,
        itemTitle: "Реферальный бонус за друга 🤝",
        claimed: false,
        createdAt: Date.now()
      });

      await M_NetworkManager.addFriendDirect(profile, { id: referrerId, name: "Пригласивший напарник" });

      return { rewarded: true, bonusCash: 75000 };
    } catch (e) {
      console.warn("[Friends] Ошибка обработки реферала:", e);
      return { rewarded: false };
    }
  }
};

// ========================================================
// 11. ОНЛАЙН-ЛИДЕРБОРД ПЕРЕКУПОВ
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
        name: playerName || "Перекуп",
        profit: Math.round(profit),
        level: level || 1,
        updatedAt: now
      }, { merge: true });

      lastLeaderboardUpdate = now;
      CacheManager.leaderboard = null;
    } catch (e) {
      console.warn("[Leaderboard] Ошибка записи ранга:", e);
    }
  },

  async fetchTop(force = false) {
    const now = Date.now();
    if (!force && CacheManager.leaderboard && (now - CacheManager.leaderboardTimestamp < CacheManager.LEADERBOARD_TTL)) {
      return CacheManager.leaderboard;
    }

    try {
      const q = query(
        collection(db, "leaderboard"),
        orderBy("profit", "desc"),
        limit(30)
      );
      const snap = await getDocs(q);
      const leaders = [];
      snap.forEach(d => leaders.push({ id: d.id, ...d.data() }));

      CacheManager.leaderboard = leaders;
      CacheManager.leaderboardTimestamp = now;
      return leaders;
    } catch (e) {
      return CacheManager.leaderboard || [];
    }
  }
};

// ========================================================
// 12. ВСПОМОГАТЕЛЬНЫЙ ПРОФИЛЬ И ЭКСПОРТ
// ========================================================
function getCurrentPlayerProfile() {
  if (currentUserProfile && verifiedUserId) {
    return currentUserProfile;
  }
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (tgUser?.id) {
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

  let localUid = localStorage.getItem("perekup_online_uid");
  if (!localUid) {
    localUid = "p_" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem("perekup_online_uid", localUid);
  }
  return {
    id: localUid,
    name: (window.state?.player?.name) || "Гость #" + localUid.substring(2, 6),
    username: "",
    photoUrl: null,
    isTelegram: false
  };
}

window.FB_Bridge = {
  db,
  auth,
  enabled: true,
  Auth: TelegramAuthManager,
  getProfile: getCurrentPlayerProfile,
  CarsCatalog: CarsCatalogManager,
  Plates: RegisteredPlatesManager,
  CloudSave: CloudSaveManager,
  M: M_NetworkManager,
  P2P: P2PMarketManager,
  QuickChat: QuickChatManager,
  Clubs: ClubsManager,
  Friends: FriendsReferralManager,
  Leaderboard: LeaderboardManager
};
window.TelegramAuthManager = TelegramAuthManager;

console.log("[☁️ FB_Bridge v1.0.0] CarsCatalog, RegisteredPlates, P2P, CloudSave активны 🌐");
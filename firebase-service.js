import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  addDoc,
  deleteDoc,
  where
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
const db = getFirestore(app);

// Определение ID пользователя (Telegram ID или локальный ключ)
export function getPlayerProfile() {
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (tgUser?.id) {
    return {
      id: `tg_${tgUser.id}`,
      name: tgUser.first_name || tgUser.username || "Перекуп"
    };
  }

  let localId = localStorage.getItem("perekupik_uid");
  if (!localId) {
    localId = "guest_" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem("perekupik_uid", localId);
  }

  return {
    id: localId,
    name: "Гость"
  };
}

// Загрузка сохранений из облака[cite: 12]
export async function loadCloudSave() {
  const { id } = getPlayerProfile();
  try {
    const docRef = doc(db, "saves", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn("Не удалось прочитать Firebase, откат на локальное сохранение:", err);
  }
  return null;
}

// Сохранение в облако с дебаунсом (3 сек) для экономии квот[cite: 12]
let saveTimer = null;
export function saveCloudSave(state) {
  localStorage.setItem("perekupik_save", JSON.stringify(state));

  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { id, name } = getPlayerProfile();
    try {
      const docRef = doc(db, "saves", id);
      await setDoc(docRef, {
        ...state,
        playerName: state.playerName || name,
        updatedAt: Date.now()
      }, { merge: true });

      if (typeof state.balance === "number") {
        const lbRef = doc(db, "leaderboard", id);
        await setDoc(lbRef, {
          name: state.playerName || name,
          balance: state.balance,
          updatedAt: Date.now()
        }, { merge: true });
      }
    } catch (err) {
      console.error("Ошибка записи в Firebase:", err);
    }
  }, 3000);
}

// Получение ТОП-10 перекупов[cite: 12]
export async function getLeaderboard() {
  try {
    const q = query(
      collection(db, "leaderboard"), 
      orderBy("balance", "desc"), 
      limit(10)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (err) {
    console.error("Ошибка загрузки лидерборда:", err);
    return [];
  }
}

// ========================================================
// УНИВЕРСАЛЬНАЯ P2P БИРЖА (АВТО, НОМЕРА, БИЗНЕС, ЖИЛЬЕ)
// ========================================================

// Опубликовать любой лот на P2P рынок
export async function publishP2PLot(lotData) {
  const { id, name } = getPlayerProfile();
  try {
    const lotRef = collection(db, "market_lots");
    const docRef = await addDoc(lotRef, {
      ...lotData,
      sellerId: id,
      sellerName: lotData.sellerName || name,
      // Универсальный тип имущества: 'car', 'plate', 'business', 'housing'
      itemType: lotData.type || lotData.itemType || 'car', 
      createdAt: Date.now(),
      status: "active"
    });
    return docRef.id;
  } catch (err) {
    console.error("Ошибка публикации универсального P2P лота:", err);
    throw err;
  }
}

// Загрузить все активные P2P лоты (с фильтрацией по типу, если нужно)
export async function fetchMarketLots(itemTypeFilter = null) {
  try {
    let q;
    if (itemTypeFilter && itemTypeFilter !== 'all') {
      q = query(
        collection(db, "market_lots"), 
        where("status", "==", "active"), 
        where("itemType", "==", itemTypeFilter),
        limit(50)
      );
    } else {
      q = query(
        collection(db, "market_lots"), 
        where("status", "==", "active"), 
        limit(50)
      );
    }

    const snapshot = await getDocs(q);
    let lots = [];
    snapshot.forEach(docSnap => {
      lots.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    return lots;
  } catch (err) {
    console.error("Ошибка загрузки универсального P2P рынка:", err);
    return [];
  }
}

// Удалить/купить P2P лот
export async function removeP2PLot(lotId) {
  try {
    const lotRef = doc(db, "market_lots", lotId);
    await deleteDoc(lotRef);
    return true;
  } catch (err) {
    console.error("Ошибка удаления лота с биржи:", err);
    return false;
  }
}
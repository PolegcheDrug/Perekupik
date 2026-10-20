// ========================================================
// js/firebase/firebase-friendships.js — СИСТЕМА ДРУЗЕЙ & СОЦИАЛА (v1.3.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.3.0 (СОЦИУМ: ДРУЗЬЯ, ЗАГОТОВКИ ФРАЗ, P2P ОФФЕРЫ):
//   - ПОЛНЫЙ ФИКС ВЗАИМНОГО ДОБАВЛЕНИЯ: если есть встречная заявка,
//     она мгновенно переводится в статус 'accepted' без конфликта дублей.
//   - ХРАНЕНИЕ МЕТАДАННЫХ: сохраняются аватары, никнеймы, уровни
//     и машины игроков для быстрого рендера карточек друзей.
//   - БЫСТРЫЕ ФРАЗЫ (sendQuickPhrase): мгновенная отправка заготовок
//     с пушем и записью в документ дружбы/уведомлений.
//   - ИНТЕГРАЦИЯ С ОФФЕРАМИ (sendDirectOffer): отправка предложения
//     покупки авто напрямую другу.
//   - ПОДПИСКИ REALTIME: подписка на список друзей и входящие заявки.
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
// 1. ИМПОРТ ЯДРА
// ========================================================
const FB_Core = window.FB_Core;
if (!FB_Core) {
  console.error('[☁️ FB_Friendships] Критическая ошибка: firebase-core.js не загружен!');
  throw new Error('firebase-core.js must be loaded before firebase-friendships.js');
}

const db = FB_Core.db;
const devLogFirestore = FB_Core.devLogFirestore || console.log;
const TTL_CONFIG = FB_Core.TTL_CONFIG || { friendships: 30 * 86400000, notifications: 7 * 86400000 };
const LIMITS = FB_Core.LIMITS || { maxFriendshipsPerUser: 100 };

// ========================================================
// 2. ХЕЛПЕР: получить актуальный профиль игрока со всеми статами
// ========================================================
function getCurrentPlayerProfile() {
  const authProfile = FB_Core.Auth?.getUserProfile?.();
  const player = window.state?.player || {};
  const currentCar = window.state?.garage?.[0] || null;

  let id = authProfile?.id || FB_Core.Auth?.getVerifiedUserId?.() || player.uid;
  let name = authProfile?.name || player.name || "Перекуп";
  let photoUrl = authProfile?.photoUrl || null;
  let isTelegram = false;

  const tgUser = FB_Core.getTelegramUser?.();
  if (tgUser && tgUser.id) {
    id = String(tgUser.id);
    const names = [];
    if (tgUser.first_name) names.push(tgUser.first_name);
    if (tgUser.last_name) names.push(tgUser.last_name);
    name = names.join(" ").trim() || (tgUser.username ? "@" + tgUser.username : "Перекуп #" + tgUser.id);
    photoUrl = tgUser.photo_url || photoUrl;
    isTelegram = true;
  }

  if (!id) return null;

  return {
    id: String(id),
    name: name,
    username: tgUser?.username || "",
    photoUrl: photoUrl,
    level: Number(player.level) || 1,
    balance: Number(player.balance) || 0,
    carName: currentCar ? (currentCar.name || currentCar.title || "Пешком") : "Пешком",
    isTelegram: isTelegram
  };
}

// ========================================================
// 3. ХЕЛПЕР: детерминированный Pair ID
// ========================================================
function _buildPairId(uid1, uid2) {
  if (!uid1 || !uid2) return null;
  return [String(uid1), String(uid2)].sort().join("_");
}

function _filterAndSortDocs(items, opts = {}) {
  if (!Array.isArray(items)) return [];
  const now = Date.now();

  const result = items.filter(item => {
    if (!item) return false;
    if (item.expireAt && item.expireAt < now) return false;
    if (opts.status !== undefined && item.status !== opts.status) return false;
    return true;
  });

  if (opts.sortBy) {
    const dir = opts.sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      const ta = Number(a[opts.sortBy]) || 0;
      const tb = Number(b[opts.sortBy]) || 0;
      return (ta - tb) * dir;
    });
  }

  return result;
}

// ========================================================
// 4. FRIENDSHIPS & SOCIAL MANAGER
// ========================================================
const FriendshipsManager = {
  _listeners: [],

  /**
   * Отправить заявку в друзья.
   * Если вторая сторона уже отправила заявку — мгновенное взаимное автопринятие.
   */
  async sendRequest(toUserId, toUserName = "Перекуп") {
    const me = getCurrentPlayerProfile();
    if (!me?.id) return { success: false, error: "Требуется авторизация" };

    const targetId = String(toUserId);
    if (targetId === String(me.id)) {
      return { success: false, error: "Нельзя добавить самого себя" };
    }

    try {
      const pairId = _buildPairId(me.id, targetId);
      if (!pairId) return { success: false, error: "Ошибка формирования пары" };

      const friendRef = doc(db, "friendships", pairId);
      const snap = await getDoc(friendRef);

      if (snap.exists()) {
        const data = snap.data();

        // 1. Уже друзья
        if (data.status === 'accepted') {
          return { success: true, alreadyFriends: true, message: "Вы уже друзья!" };
        }

        // 2. Мы уже отправляли запрос ранее, ждем
        if (data.status === 'pending' && String(data.fromUserId) === String(me.id)) {
          return { success: false, error: "Заявка уже отправлена и ожидает ответа" };
        }

        // 3. ⭐ ВСТРЕЧНАЯ ЗАЯВКА (он уже отправил нам) -> Мгновенное взаимное принятие
        if (data.status === 'pending' && String(data.fromUserId) === targetId) {
          devLogFirestore('Friendships: встречный запрос обнаружен -> автопринятие', pairId);

          await updateDoc(friendRef, {
            status: 'accepted',
            acceptedAt: Date.now(),
            // обновляем статы обоих участников
            [`profiles.${me.id}`]: me,
            updatedAt: Date.now()
          });

          // Шлем уведомление партнеру, что дружба подтверждена
          await this._sendSystemNotification({
            toUser: targetId,
            type: "friend_accepted",
            title: "🤝 Заявка принята!",
            text: `${me.name} принял вашу заявку в друзья. Теперь вы можете общаться и совершать сделки!`,
            fromUserId: me.id,
            fromUserName: me.name
          });

          return { success: true, autoAccepted: true, message: "Вы теперь друзья!" };
        }

        // 4. Если ранее была отклонена/удалена — возобновляем
        await setDoc(friendRef, {
          pairId,
          fromUserId: me.id,
          fromUserName: me.name,
          toUserId: targetId,
          toUserName: toUserName,
          status: 'pending',
          profiles: {
            [me.id]: me,
            [targetId]: { id: targetId, name: toUserName }
          },
          createdAt: Date.now(),
          expireAt: Date.now() + TTL_CONFIG.friendships
        }, { merge: true });

      } else {
        // Создаем новую заявку с нуля
        await setDoc(friendRef, {
          pairId,
          fromUserId: me.id,
          fromUserName: me.name,
          toUserId: targetId,
          toUserName: toUserName,
          status: 'pending',
          profiles: {
            [me.id]: me,
            [targetId]: { id: targetId, name: toUserName }
          },
          createdAt: Date.now(),
          expireAt: Date.now() + TTL_CONFIG.friendships
        });
      }

      // Создаем push-уведомление для адресата
      await this._sendSystemNotification({
        toUser: targetId,
        type: "friend_request",
        title: "👋 Заявка в друзья!",
        text: `${me.name} хочет добавить вас в друзья.`,
        fromUserId: me.id,
        fromUserName: me.name
      });

      devLogFirestore('Friendships.sendRequest: успешно отправлено', pairId);
      return { success: true, message: "Заявка отправлена" };
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      devLogFirestore('Friendships.sendRequest ERROR', errMsg);
      return { success: false, error: errMsg };
    }
  },

  /**
   * Принять входящую заявку от игрока.
   */
  async acceptRequest(fromUserId) {
    const me = getCurrentPlayerProfile();
    if (!me?.id) return { success: false, error: "Нет профиля" };

    try {
      const pairId = _buildPairId(me.id, fromUserId);
      const friendRef = doc(db, "friendships", pairId);

      const snap = await getDoc(friendRef);
      if (!snap.exists()) return { success: false, error: "Заявка не найдена" };

      await updateDoc(friendRef, {
        status: 'accepted',
        acceptedAt: Date.now(),
        [`profiles.${me.id}`]: me,
        updatedAt: Date.now()
      });

      // Уведомление инициатору заявки
      await this._sendSystemNotification({
        toUser: String(fromUserId),
        type: "friend_accepted",
        title: "✅ Заявка принята!",
        text: `${me.name} принял вашу заявку в друзья.`,
        fromUserId: me.id,
        fromUserName: me.name
      });

      devLogFirestore('Friendships.accept OK', pairId);
      return { success: true };
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      devLogFirestore('Friendships.accept ERROR', errMsg);
      return { success: false, error: errMsg };
    }
  },

  /**
   * Отклонить входящую заявку.
   */
  async declineRequest(fromUserId) {
    const me = getCurrentPlayerProfile();
    if (!me?.id) return { success: false, error: "Нет профиля" };

    try {
      const pairId = _buildPairId(me.id, fromUserId);
      const friendRef = doc(db, "friendships", pairId);

      await updateDoc(friendRef, {
        status: 'declined',
        declinedAt: Date.now(),
        updatedAt: Date.now()
      });

      devLogFirestore('Friendships.decline OK', pairId);
      return { success: true };
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      devLogFirestore('Friendships.decline ERROR', errMsg);
      return { success: false, error: errMsg };
    }
  },

  /**
   * Удалить пользователя из списка друзей.
   */
  async removeFriend(friendUserId) {
    const me = getCurrentPlayerProfile();
    if (!me?.id) return { success: false, error: "Нет профиля" };

    try {
      const pairId = _buildPairId(me.id, friendUserId);
      const friendRef = doc(db, "friendships", pairId);

      await updateDoc(friendRef, {
        status: 'removed',
        removedAt: Date.now(),
        updatedAt: Date.now()
      });

      devLogFirestore('Friendships.removeFriend OK', pairId);
      return { success: true };
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      devLogFirestore('Friendships.removeFriend ERROR', errMsg);
      return { success: false, error: errMsg };
    }
  },

  /**
   * Отправить заготовленную фразу другу (Quick Chat).
   */
  async sendQuickPhrase(friendUserId, phraseText) {
    const me = getCurrentPlayerProfile();
    if (!me?.id) return { success: false, error: "Нет профиля" };
    if (!phraseText || !phraseText.trim()) return { success: false, error: "Пустая фраза" };

    try {
      const pairId = _buildPairId(me.id, friendUserId);
      const friendRef = doc(db, "friendships", pairId);

      // Записываем последнюю фразу прямо в диалог дружбы
      await updateDoc(friendRef, {
        lastMessage: {
          fromUserId: me.id,
          fromUserName: me.name,
          text: phraseText.trim(),
          timestamp: Date.now()
        },
        updatedAt: Date.now()
      });

      // Отправляем пуш-уведомление с репликой
      await this._sendSystemNotification({
        toUser: String(friendUserId),
        type: "chat_phrase",
        title: `💬 Сообщение от ${me.name}`,
        text: `"${phraseText.trim()}"`,
        fromUserId: me.id,
        fromUserName: me.name
      });

      return { success: true };
    } catch (e) {
      console.warn('[Friendship] Ошибка отправки фразы:', e);
      return { success: false, error: e?.message || String(e) };
    }
  },

  /**
   * Сделать прямое предложение авто другу (P2P Оффер).
   */
  async sendDirectCarOffer(friendUserId, carData, offerPrice) {
    const me = getCurrentPlayerProfile();
    if (!me?.id) return { success: false, error: "Нет профиля" };
    if (!carData || !offerPrice || offerPrice <= 0) {
      return { success: false, error: "Некорректные данные автомобиля или цены" };
    }

    try {
      const offerId = "offer_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const offerRef = doc(db, "p2p_offers", offerId);

      const payload = {
        offerId,
        sellerId: me.id,
        sellerName: me.name,
        buyerId: String(friendUserId),
        car: carData,
        price: Number(offerPrice),
        status: "pending", // pending | accepted | rejected | expired
        createdAt: Date.now(),
        expireAt: Date.now() + (24 * 3600 * 1000) // 24 часа
      };

      await setDoc(offerRef, payload);

      // Шлем уведомление покупателю
      await this._sendSystemNotification({
        toUser: String(friendUserId),
        type: "p2p_offer",
        title: "🚗 Предложение авто от друга!",
        text: `${me.name} предлагает вам ${carData.name || "автомобиль"} за ${Number(offerPrice).toLocaleString('ru-RU')} ₽`,
        fromUserId: me.id,
        fromUserName: me.name,
        offerId: offerId
      });

      return { success: true, offerId };
    } catch (e) {
      console.warn('[Friendship] Ошибка создания оффера:', e);
      return { success: false, error: e?.message || String(e) };
    }
  },

  /**
   * Получить полный срез: друзья, входящие заявки, исходящие заявки.
   */
  async fetchFriendships(userId) {
    const targetUid = userId || FB_Core.Auth.getVerifiedUserId();
    if (!targetUid) return { friends: [], pending: [], outgoing: [] };

    try {
      const [asFromSnap, asToSnap] = await Promise.all([
        getDocs(query(
          collection(db, "friendships"),
          where("fromUserId", "==", String(targetUid)),
          limit(LIMITS.maxFriendshipsPerUser)
        )),
        getDocs(query(
          collection(db, "friendships"),
          where("toUserId", "==", String(targetUid)),
          limit(LIMITS.maxFriendshipsPerUser)
        ))
      ]);

      const friends = [];
      const pending = [];
      const outgoing = [];
      const now = Date.now();

      // Мои исходящие
      asFromSnap.forEach(d => {
        const data = d.data();
        if (data.expireAt && data.expireAt < now) return;

        const partnerProfile = data.profiles?.[data.toUserId] || {};

        if (data.status === 'accepted') {
          friends.push({
            id: data.toUserId,
            name: partnerProfile.name || data.toUserName || "Перекуп",
            level: partnerProfile.level || 1,
            carName: partnerProfile.carName || "В гараже",
            lastMessage: data.lastMessage || null,
            acceptedAt: data.acceptedAt || data.createdAt
          });
        } else if (data.status === 'pending') {
          outgoing.push({
            id: data.toUserId,
            name: partnerProfile.name || data.toUserName || "Перекуп",
            createdAt: data.createdAt
          });
        }
      });

      // Входящие ко мне
      asToSnap.forEach(d => {
        const data = d.data();
        if (data.expireAt && data.expireAt < now) return;

        const partnerProfile = data.profiles?.[data.fromUserId] || {};

        if (data.status === 'accepted') {
          if (!friends.some(f => String(f.id) === String(data.fromUserId))) {
            friends.push({
              id: data.fromUserId,
              name: partnerProfile.name || data.fromUserName || "Перекуп",
              level: partnerProfile.level || 1,
              carName: partnerProfile.carName || "В гараже",
              lastMessage: data.lastMessage || null,
              acceptedAt: data.acceptedAt || data.createdAt
            });
          }
        } else if (data.status === 'pending') {
          pending.push({
            id: data.fromUserId,
            name: partnerProfile.name || data.fromUserName || "Перекуп",
            level: partnerProfile.level || 1,
            carName: partnerProfile.carName || "В гараже",
            createdAt: data.createdAt,
            pairId: d.id
          });
        }
      });

      return { friends, pending, outgoing };
    } catch (e) {
      console.warn('[Friendship] Ошибка выборки fetchFriendships:', e);
      return { friends: [], pending: [], outgoing: [] };
    }
  },

  /**
   * Исходящие заявки (для кнопок "Ожидает" в таблице лидеров).
   */
  async getOutgoingRequests(userId) {
    const res = await this.fetchFriendships(userId);
    return res.outgoing || [];
  },

  /**
   * Служебная отправка уведомления.
   */
  async _sendSystemNotification(notifData) {
    try {
      const notifId = "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const notifRef = doc(db, "notifications", notifId);
      await setDoc(notifRef, {
        toUser: String(notifData.toUser),
        type: notifData.type || "system",
        title: notifData.title || "Уведомление",
        text: notifData.text || "",
        fromUserId: String(notifData.fromUserId || ""),
        fromUserName: notifData.fromUserName || "Перекуп",
        offerId: notifData.offerId || null,
        read: false,
        claimed: false,
        timestamp: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.notifications
      });
    } catch (err) {
      console.warn('[Friendship] Не удалось отправить push-нотификацию:', err);
    }
  },

  /**
   * Слушатель входящих заявок в реальном времени.
   */
  subscribeToFriendships(userId, callback) {
    const targetUid = userId || FB_Core.Auth.getVerifiedUserId();
    if (!targetUid || typeof callback !== 'function') return () => {};

    try {
      const q = query(
        collection(db, "friendships"),
        where("toUserId", "==", String(targetUid)),
        limit(LIMITS.maxFriendshipsPerUser)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const raw = [];
        snap.forEach(d => {
          const data = d.data();
          raw.push({
            id: data.fromUserId,
            name: data.fromUserName || "Перекуп",
            createdAt: data.createdAt,
            pairId: d.id,
            status: data.status,
            expireAt: data.expireAt
          });
        });

        const pending = _filterAndSortDocs(raw, {
          status: 'pending',
          sortBy: 'createdAt',
          sortDir: 'desc'
        });

        try { callback(pending); } catch (e) { console.warn('[Friendship] callback error:', e); }
      });

      this._listeners.push(unsubscribe);
      return unsubscribe;
    } catch (e) {
      console.warn('[Friendship] subscribe exception:', e);
      return () => {};
    }
  },

  unsubscribeAll() {
    this._listeners.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this._listeners = [];
  }
};

// ========================================================
// 5. ЭКСПОРТ
// ========================================================
window.FB_Friendships = {
  Friendships: FriendshipsManager
};
window.FB_FriendshipsManager = FriendshipsManager;

console.log('[👥 FB_Friendships v1.3.0] Дружба, Автопринятие, Заготовки фраз и Офферы готовы ✓');

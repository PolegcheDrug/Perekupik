// ========================================================
// js/firebase-notifications.js — УВЕДОМЛЕНИЯ, ЧАТ, СОБЫТИЯ (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.0.0 (ВЫДЕЛЕНО ИЗ firebase-bridge.js):
//   - NotificationsManager (fetchMyNotifications,
//     subscribeToNotifications, claimNotificationPayout,
//     unsubscribeAll)
//   - ChatMessagesManager (sendMessage, fetchMessagesForDialog,
//     subscribeToDialog)
//   - EventsManager (fetchEvents, pushEvent, toggleReaction,
//     subscribeToEvents)
//   - CANNED_PHRASES (quick-chat фразы для M+)
//   - Экспорт в window.FB_Notifications
//
// ВАЖНО: файл — ES-модуль (import), подключается через
//   <script type="module" src="firebase-notifications.js?v=410"></script>
// Должен быть загружен ПОСЛЕ firebase-core.js.
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
// 1. ИМПОРТ ЯДРА (db, auth, хелперы)
// ========================================================
const FB_Core = window.FB_Core;
if (!FB_Core) {
  console.error('[☁️ FB_Notifications] Критическая ошибка: firebase-core.js не загружен!');
  throw new Error('firebase-core.js must be loaded before firebase-notifications.js');
}

const db = FB_Core.db;
const devLogFirestore = FB_Core.devLogFirestore;
const TTL_CONFIG = FB_Core.TTL_CONFIG;
const LIMITS = FB_Core.LIMITS;

// ========================================================
// 2. ХЕЛПЕР: получить текущий профиль игрока
// ========================================================
function getCurrentPlayerProfile() {
  const authProfile = FB_Core.Auth?.getUserProfile?.();
  if (authProfile && authProfile.id) return authProfile;

  const tgUser = FB_Core.getTelegramUser?.();
  if (tgUser && tgUser.id) {
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

  if (window.state?.player?.uid) {
    return {
      id: String(window.state.player.uid),
      name: window.state.player.name || "Перекуп",
      username: "",
      photoUrl: null,
      isTelegram: false
    };
  }

  return null;
}

// ========================================================
// 3. QUICK-CHAT ФРАЗЫ (для M+ мессенджера)
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
// 4. NOTIFICATIONS MANAGER
// ========================================================
const NotificationsManager = {
  _listeners: new Map(),

  /**
   * Получить все непрочитанные уведомления игрока.
   */
  async fetchMyNotifications(userId) {
    const targetUid = userId || FB_Core.Auth.getVerifiedUserId();
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
   * Real-time подписка на уведомления.
   * @param {string} userId
   * @param {Function} callback — вызывается с массивом уведомлений
   * @returns {Function} unsubscribe
   */
  subscribeToNotifications(userId, callback) {
    const targetUid = userId || FB_Core.Auth.getVerifiedUserId();
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

  /**
   * Отписаться от всех подписок.
   */
  unsubscribeAll() {
    this._listeners.forEach((unsub) => {
      try { unsub(); } catch (e) {}
    });
    this._listeners.clear();
  },

  /**
   * Пометить уведомление как обработанное (claimed).
   */
  async claimNotificationPayout(notifId) {
    try {
      await updateDoc(doc(db, "notifications", notifId), {
        claimed: true,
        read: true,
        claimedAt: Date.now()
      });
      return true;
    } catch (e) {
      return false;
    }
  }
};

// ========================================================
// 5. CHAT MESSAGES MANAGER
// ========================================================
const ChatMessagesManager = {
  _listeners: [],

  /**
   * Отправить сообщение в диалог.
   * @param {Object} params — { receiverId?, clubId?, dialogId?, text, senderProfile? }
   */
  async sendMessage(params) {
    const profile = params.senderProfile || getCurrentPlayerProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };

    const msgId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const payload = {
      msg_id: msgId,
      senderId: String(profile.id),
      senderName: profile.name || "Перекуп",
      receiverId: params.receiverId ? String(params.receiverId) : null,
      clubId: params.clubId ? String(params.clubId) : null,
      dialogId: params.dialogId || null,
      text: params.text,
      timestamp: Date.now(),
      expireAt: Date.now() + TTL_CONFIG.chat_messages
    };

    try {
      await setDoc(doc(db, "chat_messages", msgId), payload);
      return { success: true, msg: payload };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Получить сообщения диалога (одноразово).
   */
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
   * Real-time подписка на сообщения диалога.
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
  },

  /**
   * Отписаться от всех подписок.
   */
  unsubscribeAll() {
    this._listeners.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this._listeners = [];
  }
};

// ========================================================
// 6. EVENTS MANAGER (уличные события M+)
// ========================================================
const EventsManager = {
  /**
   * Получить последние события.
   */
  async fetchEvents(limitCount = 35) {
    try {
      const q = query(
        collection(db, "street_events"),
        orderBy("timestamp", "desc"),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      const events = [];
      snap.forEach(d => events.push({ id: d.id, ...d.data() }));
      return events;
    } catch (e) {
      console.warn('[Events] fetch error:', e);
      return [];
    }
  },

  /**
   * Опубликовать новое событие.
   */
  async pushEvent(eventData) {
    const profile = getCurrentPlayerProfile();
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

  /**
   * Увеличить счётчик реакции.
   */
  async toggleReaction(eventId, reactionType, userId) {
    const targetUid = userId || FB_Core.Auth.getVerifiedUserId();
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

  /**
   * Real-time подписка на ленту событий.
   */
  subscribeToEvents(callback, limitCount = 35) {
    if (typeof callback !== 'function') return () => {};
    try {
      const q = query(
        collection(db, "street_events"),
        orderBy("timestamp", "desc"),
        limit(limitCount)
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        const events = [];
        snap.forEach(d => events.push({ id: d.id, ...d.data() }));
        try { callback(events); } catch (e) {}
      }, (error) => {
        console.warn('[Events] subscribe error:', error);
      });
      return unsubscribe;
    } catch (e) { return () => {}; }
  }
};

// ========================================================
// 7. ЭКСПОРТ В WINDOW
// ========================================================
window.FB_Notifications = {
  Notifications: NotificationsManager,
  ChatMessages: ChatMessagesManager,
  Events: EventsManager,
  CANNED_PHRASES
};

// Алиасы для совместимости со старым кодом
window.FB_NotificationsManager = NotificationsManager;
window.FB_ChatMessagesManager = ChatMessagesManager;
window.FB_EventsManager = EventsManager;

console.log('[🔔 FB_Notifications v1.0.0] Уведомления, чат, события загружены. Notifications, ChatMessages, Events, CANNED_PHRASES ✓');
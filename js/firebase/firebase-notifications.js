// ========================================================
// js/firebase-notifications.js — УВЕДОМЛЕНИЯ, ЧАТ, СОБЫТИЯ (v1.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.1.0 (SPRINT 3 — ФИКСЫ БЕЗ СОСТАВНЫХ ИНДЕКСОВ):
//   - ФИКС: fetchMyNotifications — убран 3-way where + orderBy
//     (требовал индекса). Теперь single-field where(toUser)
//     + клиентская фильтрация по claimed/expireAt и сортировка.
//   - ФИКС: subscribeToNotifications — то же самое.
//   - ФИКС: fetchMessagesForDialog — убран orderBy, сортировка
//     на клиенте. Требовал индекса dialogId+timestamp.
//   - ФИКС: subscribeToDialog — то же самое.
//   - ФИКС: fetchEvents / subscribeToEvents — orderBy убран,
//     сортировка на клиенте (single-field auto-index уже есть,
//     но избегаем любых сюрпризов с коллекциями).
//   - ФИКС: sendMessage и pushEvent — защита от ошибок, возврат
//     осмысленного сообщения при permission-denied.
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
//   <script type="module" src="firebase-notifications.js?v=421"></script>
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
// 3. ХЕЛПЕР: клиентская фильтрация + сортировка
// (используется вместо составных индексов Firestore)
// ========================================================
function _filterAndSortDocs(items, opts = {}) {
  if (!Array.isArray(items)) return [];
  const now = Date.now();

  const result = items.filter(item => {
    if (!item) return false;
    // Отсеиваем протухшие (если есть expireAt)
    if (item.expireAt && item.expireAt < now) return false;
    // Фильтр по claimed (для уведомлений)
    if (opts.claimed !== undefined && item.claimed !== opts.claimed) return false;
    return true;
  });

  // Сортировка по timestamp
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
// 4. QUICK-CHAT ФРАЗЫ (для M+ мессенджера)
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
// 5. NOTIFICATIONS MANAGER
// ========================================================
const NotificationsManager = {
  _listeners: new Map(),

  /**
   * Получить все непрочитанные уведомления игрока.
   * ⭐ v1.1.0: single-field where(toUser) + клиентская фильтрация.
   */
  async fetchMyNotifications(userId) {
    const targetUid = userId || FB_Core.Auth.getVerifiedUserId();
    if (!targetUid) return [];

    try {
      const q = query(
        collection(db, "notifications"),
        where("toUser", "==", String(targetUid)),
        limit(LIMITS.maxNotificationsPerUser * 2)
      );
      const snap = await getDocs(q);

      const raw = [];
      snap.forEach(d => raw.push({ id: d.id, ...d.data() }));

      // ⭐ Клиентская фильтрация: только claimed=false + сортировка timestamp desc
      const filtered = _filterAndSortDocs(raw, {
        claimed: false,
        sortBy: 'timestamp',
        sortDir: 'desc'
      });

      return filtered.slice(0, LIMITS.maxNotificationsPerUser);
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      if (errMsg.includes('permission-denied')) {
        console.warn('[Notifications] fetchMyNotifications: permission-denied (проверьте Firestore Rules)');
      } else {
        console.warn('[Notifications] fetch error:', errMsg);
      }
      return [];
    }
  },

  /**
   * Real-time подписка на уведомления.
   * ⭐ v1.1.0: single-field where(toUser) + клиентский фильтр.
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
        limit(LIMITS.maxNotificationsPerUser * 2)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const raw = [];
        snap.forEach(d => raw.push({ id: d.id, ...d.data() }));

        const notifs = _filterAndSortDocs(raw, {
          claimed: false,
          sortBy: 'timestamp',
          sortDir: 'desc'
        }).slice(0, LIMITS.maxNotificationsPerUser);

        try { callback(notifs); } catch (e) { console.warn('[Notifications] callback error:', e); }
      }, (error) => {
        const errMsg = error?.code || error?.message || String(error);
        if (errMsg.includes('permission-denied')) {
          console.warn('[Notifications] subscribeToNotifications: permission-denied');
        } else {
          console.warn('[Notifications] subscribeToNotifications error:', errMsg);
        }
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
// 6. CHAT MESSAGES MANAGER
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
      const errMsg = e?.code || e?.message || String(e);
      if (errMsg.includes('permission-denied')) {
        console.warn('[ChatMessages] sendMessage: permission-denied');
      } else {
        console.warn('[ChatMessages] sendMessage error:', errMsg);
      }
      return { success: false, error: errMsg };
    }
  },

  /**
   * Получить сообщения диалога (одноразово).
   * ⭐ v1.1.0: single-field where(dialogId) + клиентская сортировка.
   */
  async fetchMessagesForDialog(dialogId) {
    if (!dialogId) return [];
    try {
      const q = query(
        collection(db, "chat_messages"),
        where("dialogId", "==", dialogId),
        limit(LIMITS.maxMessagesPerDialog * 2)
      );
      const snap = await getDocs(q);

      const raw = [];
      snap.forEach(d => raw.push(d.data()));

      // ⭐ Клиентская сортировка по timestamp asc
      const sorted = _filterAndSortDocs(raw, {
        sortBy: 'timestamp',
        sortDir: 'asc'
      });

      return sorted.slice(0, LIMITS.maxMessagesPerDialog);
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      if (errMsg.includes('permission-denied')) {
        console.warn('[ChatMessages] fetchMessagesForDialog: permission-denied');
      } else {
        console.warn('[ChatMessages] fetch error:', errMsg);
      }
      return [];
    }
  },

  /**
   * Real-time подписка на сообщения диалога.
   * ⭐ v1.1.0: single-field where(dialogId) + клиентская сортировка.
   */
  subscribeToDialog(dialogId, callback) {
    if (!dialogId || typeof callback !== 'function') return () => {};

    try {
      const q = query(
        collection(db, "chat_messages"),
        where("dialogId", "==", dialogId),
        limit(LIMITS.maxMessagesPerDialog * 2)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const raw = [];
        snap.forEach(d => raw.push(d.data()));

        const messages = _filterAndSortDocs(raw, {
          sortBy: 'timestamp',
          sortDir: 'asc'
        }).slice(0, LIMITS.maxMessagesPerDialog);

        try { callback(messages); } catch (e) { console.warn('[ChatMessages] callback error:', e); }
      }, (error) => {
        const errMsg = error?.code || error?.message || String(error);
        if (errMsg.includes('permission-denied')) {
          console.warn('[ChatMessages] subscribeToDialog: permission-denied');
        } else {
          console.warn('[ChatMessages] subscribeToDialog error:', errMsg);
        }
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
// 7. EVENTS MANAGER (уличные события M+)
// ========================================================
const EventsManager = {
  _listeners: [],

  /**
   * Получить последние события.
   * ⭐ v1.1.0: клиентская сортировка вместо orderBy.
   */
  async fetchEvents(limitCount = 35) {
    try {
      const q = query(
        collection(db, "street_events"),
        limit(limitCount * 2)
      );
      const snap = await getDocs(q);

      const raw = [];
      snap.forEach(d => raw.push({ id: d.id, ...d.data() }));

      // ⭐ Клиентская сортировка по timestamp desc
      const sorted = _filterAndSortDocs(raw, {
        sortBy: 'timestamp',
        sortDir: 'desc'
      });

      return sorted.slice(0, limitCount);
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      if (errMsg.includes('permission-denied')) {
        console.warn('[Events] fetchEvents: permission-denied (добавьте street_events в Rules)');
      } else {
        console.warn('[Events] fetch error:', errMsg);
      }
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
      const errMsg = e?.code || e?.message || String(e);
      if (errMsg.includes('permission-denied')) {
        console.warn('[Events] pushEvent: permission-denied');
      } else {
        console.warn('[Events] push error:', errMsg);
      }
      return { success: false, error: errMsg };
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
    } catch (e) {
      return false;
    }
  },

  /**
   * Real-time подписка на ленту событий.
   * ⭐ v1.1.0: клиентская сортировка.
   */
  subscribeToEvents(callback, limitCount = 35) {
    if (typeof callback !== 'function') return () => {};
    try {
      const q = query(
        collection(db, "street_events"),
        limit(limitCount * 2)
      );

      const unsubscribe = onSnapshot(q, (snap) => {
        const raw = [];
        snap.forEach(d => raw.push({ id: d.id, ...d.data() }));

        const events = _filterAndSortDocs(raw, {
          sortBy: 'timestamp',
          sortDir: 'desc'
        }).slice(0, limitCount);

        try { callback(events); } catch (e) {}
      }, (error) => {
        const errMsg = error?.code || error?.message || String(error);
        if (errMsg.includes('permission-denied')) {
          console.warn('[Events] subscribeToEvents: permission-denied');
        } else {
          console.warn('[Events] subscribe error:', errMsg);
        }
      });

      this._listeners.push(unsubscribe);
      return unsubscribe;
    } catch (e) { return () => {}; }
  },

  unsubscribeAll() {
    this._listeners.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this._listeners = [];
  }
};

// ========================================================
// 8. ЭКСПОРТ В WINDOW
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

console.log('[🔔 FB_Notifications v1.1.0] Без составных индексов. Notifications, ChatMessages, Events, CANNED_PHRASES ✓');

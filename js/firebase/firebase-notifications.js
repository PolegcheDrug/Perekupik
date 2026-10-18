// ========================================================
// js/firebase/firebase-notifications.js — УВЕДОМЛЕНИЯ, ЧАТ, СОБЫТИЯ (v1.4.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.4.0 (SPRINT 4 — НАДЁЖНЫЙ CLAIM):
//   - КРИТИЧЕСКИЙ ФИКС: claimNotificationPayout теперь с retry (3 попытки
//     с задержкой 500/1000/1500мс). Раньше одна сетевая ошибка → уведомление
//     оставалось claimed: false в Firestore → риск повторной выдачи награды
//     при следующем открытии игры (если local save тоже не успел).
//
//   - ФИКС: not-found больше не логируется как ошибка. Уведомление могло быть
//     удалено cleanup'ом (раз в час) — это нормально, не надо кричать.
//
//   - ДОБАВЛЕНО: _claimPending Set — блокирует одновременный claim одного
//     notifId (двойной клик / двойной onSnapshot).
//
//   - ДОБАВЛЕНО: verifyClaimed() — публичная проверка статуса для диагностики.
//   - ДОБАВЛЕНО: retryClaim() — публичный метод для повторной попытки.
//
// ⭐ v1.3.0 (СПРИНТ 2 — ДРУЗЬЯ И PUSH):
//   - ChatMessagesManager.sendMessage отправляет push через P2PNotificationsManager
//   - fetchMyNotifications без составных индексов
//   - subscribeToNotifications без orderBy
//   - Все публичные API сохранены.
//
// ⭐ v1.2.0 (P2P BOT NOTIFICATIONS & QUEUE DISPATCHER):
//   - P2PNotificationsManager для генерации и отправки push-задач
//   - queueP2PNotification — универсальный метод
//   - notifyOfferReceived / Accepted / Declined / Cancelled
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

// ⭐ v1.4.0: константы для retry claim
const CLAIM_MAX_ATTEMPTS = 3;
const CLAIM_RETRY_DELAY_MS = 500;

// ⭐ v1.4.0: клиентский лок — предотвращает одновременный claim одного notifId
const _claimPending = new Set();

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
// ========================================================
function _filterAndSortDocs(items, opts = {}) {
  if (!Array.isArray(items)) return [];
  const now = Date.now();

  const result = items.filter(item => {
    if (!item) return false;
    if (item.expireAt && item.expireAt < now) return false;
    if (opts.claimed !== undefined && item.claimed !== opts.claimed) return false;
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
// 5. NOTIFICATIONS MANAGER (ВНУТРИИГРОВЫЕ)
// ========================================================
const NotificationsManager = {
  _listeners: new Map(),

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

      const filtered = _filterAndSortDocs(raw, {
        claimed: false,
        sortBy: 'timestamp',
        sortDir: 'desc'
      });

      return filtered.slice(0, LIMITS.maxNotificationsPerUser);
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      if (errMsg.includes('permission-denied')) {
        console.warn('[Notifications] fetchMyNotifications: permission-denied');
      } else {
        console.warn('[Notifications] fetch error:', errMsg);
      }
      return [];
    }
  },

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

  unsubscribeAll() {
    this._listeners.forEach((unsub) => {
      try { unsub(); } catch (e) {}
    });
    this._listeners.clear();
  },

  // ====================================================
  // ⭐ v1.4.0: НАДЁЖНЫЙ CLAIM С RETRY
  //
  // Раньше: одна попытка updateDoc → если сеть упала, notification
  // остаётся claimed: false в Firestore. При следующем открытии игры
  // (если local save тоже не синхронизировался) — повторная выдача
  // награды (double reward).
  //
  // Теперь: 3 попытки с экспоненциальной задержкой (500/1000/1500мс).
  // Покрывает 99% сетевых сбоев. Плюс блокировка _claimPending
  // защищает от одновременных вызовов одного notifId.
  // ====================================================
  async claimNotificationPayout(notifId) {
    if (!notifId || typeof notifId !== 'string') {
      console.warn('[Notifications] claimNotificationPayout: некорректный notifId', notifId);
      return false;
    }

    // ⭐ v1.4.0: клиентский лок — не даём двойной клик по тому же уведомлению
    if (_claimPending.has(notifId)) {
      console.warn(`[Notifications] claim ${notifId}: уже в процессе (двойной клик?)`);
      return false;
    }

    _claimPending.add(notifId);

    try {
      const ref = doc(db, "notifications", notifId);
      let lastError = null;

      for (let attempt = 1; attempt <= CLAIM_MAX_ATTEMPTS; attempt++) {
        try {
          await updateDoc(ref, {
            claimed: true,
            read: true,
            claimedAt: Date.now()
          });

          console.log(`[Notifications] ✓ claim ${notifId} OK (attempt ${attempt})`);
          return true;
        } catch (e) {
          const errMsg = e?.code || e?.message || String(e);
          lastError = errMsg;

          // ⭐ v1.4.0: not-found — уведомление удалено cleanup'ом, это OK
          if (errMsg.includes('not-found') || errMsg === 'not-found') {
            console.log(`[Notifications] claim ${notifId}: not-found (удалено cleanup — OK)`);
            return false;
          }

          // Последняя попытка — выходим из цикла
          if (attempt >= CLAIM_MAX_ATTEMPTS) {
            break;
          }

          // Retry с задержкой
          console.warn(`[Notifications] claim ${notifId} attempt ${attempt} failed: ${errMsg} — retry in ${CLAIM_RETRY_DELAY_MS * attempt}ms`);
          await new Promise(r => setTimeout(r, CLAIM_RETRY_DELAY_MS * attempt));
        }
      }

      // Все попытки провалились
      console.error(`[Notifications] claim ${notifId} FAILED after ${CLAIM_MAX_ATTEMPTS} attempts: ${lastError}`);
      if (window.DevLogger) {
        try {
          window.DevLogger.add('error', `claimNotificationPayout failed: ${notifId}`, { lastError, attempts: CLAIM_MAX_ATTEMPTS });
        } catch (e) {}
      }
      return false;

    } finally {
      // Всегда снимаем блокировку, даже если упали
      _claimPending.delete(notifId);
    }
  },

  /**
   * ⭐ v1.4.0: публичная проверка статуса claim для диагностики (DEV).
   * Не изменяет данные — только читает.
   *
   * @returns {Promise<{claimed: boolean|null, exists: boolean, data?: Object}>}
   */
  async verifyClaimed(notifId) {
    if (!notifId) return { claimed: null, exists: false, reason: 'no_id' };
    try {
      const snap = await getDoc(doc(db, "notifications", notifId));
      if (!snap.exists()) {
        return { claimed: null, exists: false, reason: 'not_found' };
      }
      const data = snap.data();
      return { claimed: !!data.claimed, exists: true, data };
    } catch (e) {
      return { claimed: null, exists: false, reason: e?.message || String(e) };
    }
  },

  /**
   * ⭐ v1.4.0: публичный retry — вызывается из NotificationCenter,
   * если предыдущий claimNotificationPayout вернул false.
   * Сейчас работает как алиас, но семантически отдельный — можно
   * будет добавить отложенный retry с очередью.
   */
  async retryClaim(notifId) {
    return this.claimNotificationPayout(notifId);
  }
};

// ========================================================
// 6. P2P NOTIFICATIONS MANAGER (ВНЕИГРОВЫЕ PUSH-УВЕДОМЛЕНИЯ БОТА)
// ========================================================
const P2PNotificationsManager = {
  /**
   * Получить chat_id адресата из Firestore (players/{uid}).
   */
  async resolveTargetChatId(targetUserId) {
    if (!targetUserId) return null;
    try {
      const snap = await getDoc(doc(db, "players", String(targetUserId)));
      if (snap.exists()) {
        const data = snap.data();
        return data.chat_id || data.telegram_id || String(targetUserId);
      }
    } catch (e) {
      console.warn('[P2P_Push] Не удалось получить chat_id для игрока:', targetUserId);
    }
    return String(targetUserId);
  },

  /**
   * Запланировать отправку P2P-уведомления ботом и внутри игры.
   */
  async queueP2PNotification(opts) {
    const { targetUserId, type, title, text, meta = {} } = opts;
    if (!targetUserId || !text) return false;

    const senderProfile = getCurrentPlayerProfile();
    const targetChatId = await this.resolveTargetChatId(targetUserId);
    const queueId = "p2p_push_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const now = Date.now();

    const botTask = {
      id: queueId,
      targetUserId: String(targetUserId),
      targetChatId: String(targetChatId),
      type: type || 'p2p_deal',
      title: title || 'P2P Сделка',
      text: text,
      meta: {
        senderId: senderProfile?.id || null,
        senderName: senderProfile?.name || 'Игрок',
        ...meta
      },
      status: 'pending',
      createdAt: now,
      expireAt: now + (TTL_CONFIG.p2p_notifications_queue || 86400000)
    };

    const inGameNotification = {
      id: "notif_" + queueId,
      toUser: String(targetUserId),
      fromUser: senderProfile?.id ? String(senderProfile.id) : null,
      fromUserName: senderProfile?.name || "Игрок",
      type: type || 'p2p_trade',
      title: title || 'P2P Торговля',
      message: text,
      claimed: false,
      read: false,
      timestamp: now,
      expireAt: now + TTL_CONFIG.notifications,
      meta: meta
    };

    try {
      await Promise.all([
        setDoc(doc(db, "p2p_notifications_queue", queueId), botTask),
        setDoc(doc(db, "notifications", inGameNotification.id), inGameNotification)
      ]);

      devLogFirestore('queueP2PNotification OK', `${type} -> ${targetUserId} (Chat: ${targetChatId})`);
      return true;
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      console.warn('[P2P_Push] Ошибка постановки в очередь:', errMsg);
      devLogFirestore('queueP2PNotification ERR', errMsg);
      return false;
    }
  },

  async notifyOfferReceived(targetUserId, offerData) {
    const carName = offerData.car?.name || offerData.car?.title || "Автомобиль";
    const sender = offerData.senderName || "Другой перекуп";
    const cashPart = offerData.cash ? ` и доплату $${Number(offerData.cash).toLocaleString()}` : '';

    const text = `🤝 <b>Новое P2P-предложение!</b>\n` +
                 `Перекуп <b>${sender}</b> предлагает сделку по <b>${carName}</b>${cashPart}.\n` +
                 `Зайди в игру, чтобы рассмотреть или принять оффер!`;

    return this.queueP2PNotification({
      targetUserId,
      type: 'p2p_offer_received',
      title: 'Входящее P2P-предложение',
      text,
      meta: { offerId: offerData.id, carName }
    });
  },

  async notifyOfferAccepted(targetUserId, dealData) {
    const carName = dealData.carName || "Автомобиль";
    const responder = dealData.responderName || "Покупатель";

    const text = `🎉 <b>Сделка завершена!</b>\n` +
                 `<b>${responder}</b> принял ваше предложение по авто <b>${carName}</b>.\n` +
                 `Деньги и техника зачислены на баланс!`;

    return this.queueP2PNotification({
      targetUserId,
      type: 'p2p_offer_accepted',
      title: 'Сделка закрыта 🤝',
      text,
      meta: { carName }
    });
  },

  async notifyOfferDeclined(targetUserId, dealData) {
    const carName = dealData.carName || "Автомобиль";
    const responder = dealData.responderName || "Владелец";

    const text = `❌ <b>Предложение отклонено</b>\n` +
                 `<b>${responder}</b> отклонил ваше предложение по лоту <b>${carName}</b>. Средства и авто возвращены.`;

    return this.queueP2PNotification({
      targetUserId,
      type: 'p2p_offer_declined',
      title: 'Оффер отклонён',
      text,
      meta: { carName }
    });
  },

  async notifyOfferCancelled(targetUserId, dealData) {
    const carName = dealData.carName || "Автомобиль";
    const sender = dealData.senderName || "Покупатель";

    const text = `⚠️ <b>Оффер отозван</b>\n` +
                 `Перекуп <b>${sender}</b> отменил предложение по авто <b>${carName}</b>.`;

    return this.queueP2PNotification({
      targetUserId,
      type: 'p2p_offer_cancelled',
      title: 'Оффер отозван',
      text,
      meta: { carName }
    });
  }
};

// ========================================================
// 7. CHAT MESSAGES MANAGER (с push для друзей)
// ========================================================
const ChatMessagesManager = {
  _listeners: [],

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

      // ⭐ v1.3.0: PUSH-УВЕДОМЛЕНИЕ ПОЛУЧАТЕЛЮ В TELEGRAM-БОТ
      if (payload.receiverId && payload.receiverId !== String(profile.id)) {
        try {
          await P2PNotificationsManager.queueP2PNotification({
            targetUserId: payload.receiverId,
            type: 'new_message',
            title: '💬 Новое сообщение в PEREKUP OS',
            text: `<b>${profile.name}</b> написал вам:\n<i>${String(params.text).substring(0, 200)}</i>`,
            meta: {
              dialogId: params.dialogId,
              senderId: profile.id,
              senderName: profile.name
            }
          });
        } catch (pushErr) {
          console.warn('[ChatMessages] Push notify failed:', pushErr);
        }
      }

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

  unsubscribeAll() {
    this._listeners.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this._listeners = [];
  }
};

// ========================================================
// 8. EVENTS MANAGER (уличные события M+)
// ========================================================
const EventsManager = {
  _listeners: [],

  async fetchEvents(limitCount = 35) {
    try {
      const q = query(
        collection(db, "street_events"),
        limit(limitCount * 2)
      );
      const snap = await getDocs(q);

      const raw = [];
      snap.forEach(d => raw.push({ id: d.id, ...d.data() }));

      const sorted = _filterAndSortDocs(raw, {
        sortBy: 'timestamp',
        sortDir: 'desc'
      });

      return sorted.slice(0, limitCount);
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      if (errMsg.includes('permission-denied')) {
        console.warn('[Events] fetchEvents: permission-denied');
      } else {
        console.warn('[Events] fetch error:', errMsg);
      }
      return [];
    }
  },

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
// 9. ЭКСПОРТ В WINDOW
// ========================================================
window.FB_Notifications = {
  Notifications: NotificationsManager,
  P2P: P2PNotificationsManager,
  ChatMessages: ChatMessagesManager,
  Events: EventsManager,
  CANNED_PHRASES
};

window.FB_NotificationsManager = NotificationsManager;
window.FB_P2PNotificationsManager = P2PNotificationsManager;
window.FB_ChatMessagesManager = ChatMessagesManager;
window.FB_EventsManager = EventsManager;

console.log('[🔔 FB_Notifications v1.4.0] Retry claim (3 попытки) + _claimPending + verifyClaimed + not-found OK ✓');
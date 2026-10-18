// ========================================================
// js/firebase-friendships.js — СИСТЕМА ДРУЗЕЙ (v1.2.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.2.0 (СПРИНТ 2 — ДРУЗЬЯ И PUSH):
//   - ДОБАВЛЕНО: getOutgoingRequests(userId) — список исходящих
//     pending-заявок. Нужен m-leaderboard.js для отображения
//     статуса "Ожидает" на кнопке.
//   - ФИКС: subscribeToFriendships без составных индексов.
//   - ФИКС: fetchFriendships защищён от permission-denied.
//   - ФИКС: sendRequest при отказе автопринятия возвращает
//     детальную ошибку.
//   - ФИКС: removeFriend переводит в 'declined' (мягкое удаление).
//   - Все публичные API сохранены.
//
// ВАЖНО: файл — ES-модуль (import).
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
  console.error('[☁️ FB_Friendships] Критическая ошибка: firebase-core.js не загружен!');
  throw new Error('firebase-core.js must be loaded before firebase-friendships.js');
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
// 3. ХЕЛПЕР: построить pairId (порядок не важен)
// ========================================================
function _buildPairId(uid1, uid2) {
  if (!uid1 || !uid2) return null;
  return [String(uid1), String(uid2)].sort().join("_");
}

// ========================================================
// 4. ХЕЛПЕР: клиентская фильтрация + сортировка
// (используется вместо составных индексов Firestore)
// ========================================================
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
// 5. FRIENDSHIPS MANAGER
// ========================================================
const FriendshipsManager = {
  _listeners: [],

  /**
   * Отправить заявку в друзья.
   * Если встречная заявка уже существует — автоматически принимаем её.
   */
  async sendRequest(toUserId, toUserName) {
    const profile = getCurrentPlayerProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };

    if (String(toUserId) === String(profile.id)) {
      return { success: false, error: "Нельзя добавить себя" };
    }

    if (!toUserId) {
      return { success: false, error: "Некорректный получатель" };
    }

    try {
      const pairId = _buildPairId(String(profile.id), String(toUserId));
      if (!pairId) return { success: false, error: "Ошибка пары" };

      const friendRef = doc(db, "friendships", pairId);
      const existing = await getDoc(friendRef);

      if (existing.exists()) {
        const data = existing.data();

        // Уже друзья
        if (data.status === 'accepted') {
          return { success: false, error: "Уже друзья" };
        }

        // Уже отправлена исходящая заявка
        if (data.status === 'pending' && String(data.fromUserId) === String(profile.id)) {
          return { success: false, error: "Заявка уже отправлена" };
        }

        // ⭐ ВСТРЕЧНАЯ ЗАЯВКА — сразу принимаем
        if (data.status === 'pending' && String(data.fromUserId) === String(toUserId)) {
          devLogFirestore('Friendships: встречная заявка, автопринятие', pairId);
          const autoRes = await this.acceptRequest(toUserId);
          if (!autoRes || !autoRes.success) {
            return {
              success: false,
              error: autoRes?.error || "Не удалось принять встречную заявку"
            };
          }
          return { success: true, autoAccepted: true };
        }

        // Отклонённая/subscribed — позволяем отправить снова
        if (data.status === 'declined' || data.status === 'subscribed') {
          await setDoc(friendRef, {
            pairId,
            fromUserId: String(profile.id),
            fromUserName: profile.name || "Перекуп",
            toUserId: String(toUserId),
            toUserName: toUserName || "Перекуп",
            status: 'pending',
            createdAt: Date.now(),
            expireAt: Date.now() + TTL_CONFIG.friendships
          }, { merge: true });
        } else {
          return { success: false, error: "Заявка уже существует" };
        }
      } else {
        // Создаём новую
        await setDoc(friendRef, {
          pairId,
          fromUserId: String(profile.id),
          fromUserName: profile.name || "Перекуп",
          toUserId: String(toUserId),
          toUserName: toUserName || "Перекуп",
          status: 'pending',
          createdAt: Date.now(),
          expireAt: Date.now() + TTL_CONFIG.friendships
        });
      }

      // Уведомление получателю
      const notifRef = doc(db, "notifications", "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6));
      await setDoc(notifRef, {
        toUser: String(toUserId),
        type: "friend_request",
        title: "👋 Заявка в друзья!",
        text: `${profile.name} хочет добавить вас в друзья.`,
        fromUserId: String(profile.id),
        fromUserName: profile.name || "Перекуп",
        read: false,
        claimed: false,
        timestamp: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.notifications
      });

      devLogFirestore('Friendships.sendRequest OK', pairId);
      return { success: true };
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      devLogFirestore('Friendships.sendRequest ERROR', errMsg);
      if (errMsg.includes('permission-denied')) {
        return { success: false, error: "Доступ к friendships запрещён (проверьте Firestore Rules)" };
      }
      return { success: false, error: errMsg };
    }
  },

  /**
   * Принять входящую заявку.
   */
  async acceptRequest(fromUserId) {
    const profile = getCurrentPlayerProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };

    try {
      const pairId = _buildPairId(String(profile.id), String(fromUserId));
      if (!pairId) return { success: false, error: "Ошибка пары" };

      const friendRef = doc(db, "friendships", pairId);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(friendRef);
        if (!snap.exists()) throw new Error("Заявка не найдена");
        const data = snap.data();
        if (data.status !== 'pending') throw new Error("Заявка уже обработана");
        if (String(data.fromUserId) !== String(fromUserId)) throw new Error("Это не встречная заявка");

        tx.update(friendRef, {
          status: 'accepted',
          acceptedAt: Date.now()
        });
      });

      // Уведомление отправителю
      const notifRef = doc(db, "notifications", "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6));
      await setDoc(notifRef, {
        toUser: String(fromUserId),
        type: "friend_accepted",
        title: "✅ Заявка принята!",
        text: `${profile.name} принял вашу заявку в друзья.`,
        fromUserId: String(profile.id),
        fromUserName: profile.name || "Перекуп",
        read: false,
        claimed: false,
        timestamp: Date.now(),
        expireAt: Date.now() + TTL_CONFIG.notifications
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
   * Отклонить входящую заявку (переводит в 'subscribed').
   */
  async declineRequest(fromUserId) {
    const profile = getCurrentPlayerProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };

    try {
      const pairId = _buildPairId(String(profile.id), String(fromUserId));
      if (!pairId) return { success: false, error: "Ошибка пары" };

      const friendRef = doc(db, "friendships", pairId);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(friendRef);
        if (!snap.exists()) throw new Error("Заявка не найдена");
        const data = snap.data();
        if (data.status !== 'pending') throw new Error("Заявка уже обработана");
        if (String(data.fromUserId) !== String(fromUserId)) throw new Error("Это не встречная заявка");

        tx.update(friendRef, {
          status: 'subscribed',
          declinedAt: Date.now()
        });
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
   * Удалить из друзей (мягкое удаление — статус 'declined').
   */
  async removeFriend(friendUserId) {
    const profile = getCurrentPlayerProfile();
    if (!profile?.id) return { success: false, error: "Нет профиля" };

    try {
      const pairId = _buildPairId(String(profile.id), String(friendUserId));
      if (!pairId) return { success: false, error: "Ошибка пары" };

      const friendRef = doc(db, "friendships", pairId);
      const snap = await getDoc(friendRef);

      if (!snap.exists()) {
        return { success: false, error: "Связь не найдена" };
      }

      const data = snap.data();
      if (data.status !== 'accepted') {
        return { success: false, error: "Вы не друзья" };
      }

      await updateDoc(friendRef, {
        status: 'declined',
        removedAt: Date.now()
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
   * Получить: друзей, входящие заявки, подписчиков.
   */
  async fetchFriendships(userId) {
    const targetUid = userId || FB_Core.Auth.getVerifiedUserId();
    if (!targetUid) return { friends: [], pending: [], subscribed: [] };

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
      const subscribed = [];
      const now = Date.now();

      // Обработка исходящих (я — fromUserId)
      asFromSnap.forEach(d => {
        const data = d.data();
        if (data.expireAt && data.expireAt < now) return;

        if (data.status === 'accepted') {
          friends.push({
            id: data.toUserId,
            name: data.toUserName || "Перекуп",
            status: 'accepted'
          });
        }
      });

      // Обработка входящих (я — toUserId)
      asToSnap.forEach(d => {
        const data = d.data();
        if (data.expireAt && data.expireAt < now) return;

        if (data.status === 'accepted') {
          if (!friends.some(f => String(f.id) === String(data.fromUserId))) {
            friends.push({
              id: data.fromUserId,
              name: data.fromUserName || "Перекуп",
              status: 'accepted'
            });
          }
        } else if (data.status === 'pending') {
          pending.push({
            id: data.fromUserId,
            name: data.fromUserName || "Перекуп",
            createdAt: data.createdAt,
            pairId: d.id
          });
        } else if (data.status === 'subscribed') {
          subscribed.push({
            id: data.fromUserId,
            name: data.fromUserName || "Перекуп"
          });
        }
      });

      return { friends, pending, subscribed };
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      if (errMsg.includes('permission-denied')) {
        console.warn('[Friendship] fetch: permission-denied (проверьте Firestore Rules)');
      } else {
        console.warn('[Friendship] fetch error:', errMsg);
      }
      return { friends: [], pending: [], subscribed: [] };
    }
  },

  /**
   * ⭐ v1.2.0: ИСХОДЯЩИЕ ЗАЯВКИ (для отображения "Ожидает" в топе).
   * Возвращает массив { id, name, status: 'pending_out' }.
   */
  async getOutgoingRequests(userId) {
    const targetUid = userId || FB_Core.Auth.getVerifiedUserId();
    if (!targetUid) return [];

    try {
      const q = query(
        collection(db, "friendships"),
        where("fromUserId", "==", String(targetUid)),
        limit(50)
      );
      const snap = await getDocs(q);
      const result = [];
      const now = Date.now();

      snap.forEach(d => {
        const data = d.data();
        if (data.expireAt && data.expireAt < now) return;
        if (data.status === 'pending') {
          result.push({
            id: data.toUserId,
            name: data.toUserName || "Перекуп",
            status: 'pending_out'
          });
        }
      });

      return result;
    } catch (e) {
      const errMsg = e?.code || e?.message || String(e);
      if (errMsg.includes('permission-denied')) {
        console.warn('[Friendship] getOutgoingRequests: permission-denied');
      } else {
        console.warn('[Friendship] getOutgoingRequests error:', errMsg);
      }
      return [];
    }
  },

  /**
   * Real-time подписка на ВХОДЯЩИЕ заявки.
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
      }, (error) => {
        const errMsg = error?.code || error?.message || String(error);
        if (errMsg.includes('permission-denied')) {
          console.warn('[Friendship] subscribeToFriendships: permission-denied');
        } else {
          console.warn('[Friendship] subscribe error:', errMsg);
        }
      });

      this._listeners.push(unsubscribe);
      return unsubscribe;
    } catch (e) {
      console.warn('[Friendship] subscribe exception:', e);
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
// 6. ЭКСПОРТ В WINDOW
// ========================================================
window.FB_Friendships = {
  Friendships: FriendshipsManager
};

// Алиасы для совместимости со старым кодом
window.FB_FriendshipsManager = FriendshipsManager;

console.log('[👥 FB_Friendships v1.2.0] Друзья + getOutgoingRequests + защита от permission-denied ✓');
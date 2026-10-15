// ========================================================
// js/realtime-manager.js — ЕДИНЫЙ МЕНЕДЖЕР REAL-TIME ПОДПИСОК (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.0.0:
//   - Центральный менеджер всех real-time подписок Firestore
//   - subscribe(channel, key, callback, options)
//   - unsubscribe(channel, key)
//   - unsubscribeAll()
//   - unsubscribeChannel(channel)
//   - getActiveSubscriptions() — для DEV
//   - Автоматический reconnect при возврате онлайна
//   - Защита от дублирования подписок
//   - Маршрутизация каналов: lots, notifications, chat,
//     tradeOffers, friendships, clubs, leaderboard, events
//   - Экспорт в window.RealtimeManager
//
// ИСПОЛЬЗОВАНИЕ:
//   RealtimeManager.subscribe('lots', null, (lots) => { ... });
//   RealtimeManager.subscribe('chat', dialogId, (msgs) => { ... });
//   RealtimeManager.unsubscribe('chat', dialogId);
//   RealtimeManager.unsubscribeChannel('lots');
//   RealtimeManager.unsubscribeAll();
// ========================================================

(function() {
    'use strict';

    /**
     * Внутренняя структура:
     *   _subscriptions: Map<string, Map<string, {callback, unsubscribe, channel, key, createdAt}>>
     *   Ключ первого уровня — channel (lots, chat, ...)
     *   Ключ второго уровня — key (null для глобальных, dialogId для chat, ...)
     */
    const _subscriptions = new Map();

    /**
     * Генератор внутренних ключей.
     */
    function _makeKey(channel, key) {
        return `${channel}::${key === null || key === undefined ? '__default__' : key}`;
    }

    /**
     * Внутренний лог.
     */
    function _log(message, payload) {
        if (window.DevLogger) {
            try {
                window.DevLogger.add('event', '[RealtimeManager] ' + message, payload || null);
            } catch (e) {}
        }
    }

    /**
     * Публикация события.
     */
    function _emit(eventName, payload) {
        if (window.EventBus) {
            try {
                window.EventBus.emit(eventName, payload || {});
            } catch (e) {}
        }
    }

    /**
     * Обёртка над callback: защищает от ошибок и логирует.
     */
    function _safeCallback(cb, channel, key) {
        return function(payload) {
            try {
                cb(payload);
            } catch (e) {
                console.error(`[RealtimeManager] Ошибка в callback «${channel}::${key}»:`, e);
                _log(`Callback error в «${channel}::${key}»`, { error: e.message });
            }
        };
    }

    /**
     * Маршрутизация: вызывает нужный метод FB_Bridge для подписки.
     * Возвращает функцию unsubscribe или null.
     */
    function _routeSubscribe(channel, key, wrappedCallback) {
        const FB = window.FB_Bridge;
        if (!FB) {
            console.warn('[RealtimeManager] FB_Bridge не загружен');
            return null;
        }

        try {
            switch (channel) {
                case 'lots':
                    if (FB.MarketLots?.subscribeToLots) {
                        return FB.MarketLots.subscribeToLots(wrappedCallback);
                    }
                    break;

                case 'notifications':
                    if (FB.Notifications?.subscribeToNotifications) {
                        const uid = window.TelegramAuthManager?.getVerifiedUserId() || window.state?.player?.uid;
                        if (uid) return FB.Notifications.subscribeToNotifications(uid, wrappedCallback);
                    }
                    break;

                case 'chat':
                    if (FB.ChatMessages?.subscribeToDialog && key) {
                        return FB.ChatMessages.subscribeToDialog(key, wrappedCallback);
                    }
                    break;

                case 'tradeOffers':
                    if (FB.P2PTrade?.subscribeToTradeOffers) {
                        const uid = window.TelegramAuthManager?.getVerifiedUserId() || window.state?.player?.uid;
                        if (uid) return FB.P2PTrade.subscribeToTradeOffers(uid, wrappedCallback);
                    }
                    break;

                case 'friendships':
                    if (FB.Friendships?.subscribeToFriendships) {
                        const uid = window.TelegramAuthManager?.getVerifiedUserId() || window.state?.player?.uid;
                        if (uid) return FB.Friendships.subscribeToFriendships(uid, wrappedCallback);
                    }
                    break;

                case 'clubs':
                    if (FB.Clubs?.subscribeToClubs) {
                        return FB.Clubs.subscribeToClubs(wrappedCallback);
                    }
                    break;

                case 'leaderboard':
                    if (FB.Leaderboard?.subscribeToTop) {
                        return FB.Leaderboard.subscribeToTop(wrappedCallback);
                    }
                    break;

                case 'events':
                    if (FB.Events?.subscribeToEvents) {
                        return FB.Events.subscribeToEvents(wrappedCallback);
                    }
                    break;

                case 'storage_wars':
                    // Storage Wars использует свой механизм через StorageWarsP2P._subscribeToLobby
                    // Менеджер здесь только регистрирует факт подписки, сама подписка — внутри модуля
                    console.warn('[RealtimeManager] Канал storage_wars управляется StorageWarsP2P напрямую');
                    return null;

                default:
                    console.warn(`[RealtimeManager] Неизвестный канал: ${channel}`);
                    return null;
            }
        } catch (e) {
            console.warn(`[RealtimeManager] Ошибка подписки на «${channel}::${key}»:`, e);
            return null;
        }

        return null;
    }

    const RealtimeManager = {
        /**
         * Подписаться на real-time события канала.
         * @param {string} channel — 'lots' | 'notifications' | 'chat' | 'tradeOffers' | 'friendships' | 'clubs' | 'leaderboard' | 'events'
         * @param {string|null} key — идентификатор (для chat — dialogId; для остальных — null)
         * @param {Function} callback — обработчик
         * @param {Object} [options] — { force: bool } — пересоздать подписку, даже если уже есть
         * @returns {Function} — unsubscribe
         */
        subscribe(channel, key = null, callback, options = {}) {
            if (!channel || typeof callback !== 'function') {
                console.warn('[RealtimeManager] subscribe: некорректные аргументы');
                return () => {};
            }

            const internalKey = _makeKey(channel, key);

            if (!_subscriptions.has(channel)) {
                _subscriptions.set(channel, new Map());
            }
            const channelMap = _subscriptions.get(channel);

            // Если уже подписаны — отписываемся (если force) или возвращаем существующий unsubscribe
            if (channelMap.has(internalKey)) {
                const existing = channelMap.get(internalKey);

                if (!options.force) {
                    // Возвращаем новый unsubscribe, который удалит старую подписку
                    return () => this.unsubscribe(channel, key);
                }

                // force — отписываемся от старой
                try { existing.unsubscribe && existing.unsubscribe(); } catch (e) {}
                channelMap.delete(internalKey);
            }

            const wrappedCallback = _safeCallback(callback, channel, key);
            const unsubscribeFn = _routeSubscribe(channel, key, wrappedCallback);

            if (!unsubscribeFn) {
                console.warn(`[RealtimeManager] Не удалось подписаться на «${channel}::${key}»`);
                return () => {};
            }

            channelMap.set(internalKey, {
                callback: wrappedCallback,
                originalCallback: callback,
                unsubscribe: unsubscribeFn,
                channel,
                key,
                createdAt: Date.now()
            });

            _log(`Подписка создана: ${channel}::${key || 'default'}`);
            _emit('realtime:subscribed', { channel, key });

            return () => this.unsubscribe(channel, key);
        },

        /**
         * Отписаться от конкретной подписки.
         */
        unsubscribe(channel, key = null) {
            const internalKey = _makeKey(channel, key);
            const channelMap = _subscriptions.get(channel);
            if (!channelMap || !channelMap.has(internalKey)) return;

            const entry = channelMap.get(internalKey);
            try {
                if (typeof entry.unsubscribe === 'function') {
                    entry.unsubscribe();
                }
            } catch (e) {
                console.warn(`[RealtimeManager] Ошибка отписки «${channel}::${key}»:`, e);
            }

            channelMap.delete(internalKey);
            if (channelMap.size === 0) {
                _subscriptions.delete(channel);
            }

            _log(`Подписка удалена: ${channel}::${key || 'default'}`);
            _emit('realtime:unsubscribed', { channel, key });
        },

        /**
         * Отписаться от всех подписок в канале.
         */
        unsubscribeChannel(channel) {
            const channelMap = _subscriptions.get(channel);
            if (!channelMap) return;

            const keys = [...channelMap.keys()];
            keys.forEach(internalKey => {
                const entry = channelMap.get(internalKey);
                try {
                    if (typeof entry.unsubscribe === 'function') {
                        entry.unsubscribe();
                    }
                } catch (e) {}
                channelMap.delete(internalKey);
            });

            _subscriptions.delete(channel);
            _log(`Канал очищен: ${channel} (${keys.length} подписок)`);
            _emit('realtime:channel_cleared', { channel, count: keys.length });
        },

        /**
         * Отписаться от ВСЕХ подписок.
         */
        unsubscribeAll() {
            let totalUnsubs = 0;
            _subscriptions.forEach((channelMap, channel) => {
                channelMap.forEach((entry, internalKey) => {
                    try {
                        if (typeof entry.unsubscribe === 'function') {
                            entry.unsubscribe();
                        }
                    } catch (e) {}
                    totalUnsubs++;
                });
            });
            _subscriptions.clear();
            _log(`Все подписки очищены (${totalUnsubs})`);
            _emit('realtime:all_cleared', { count: totalUnsubs });
        },

        /**
         * Получить активные подписки (для DEV).
         */
        getActiveSubscriptions() {
            const result = [];
            _subscriptions.forEach((channelMap, channel) => {
                channelMap.forEach((entry, internalKey) => {
                    result.push({
                        channel: entry.channel,
                        key: entry.key,
                        createdAt: entry.createdAt,
                        ageMs: Date.now() - entry.createdAt
                    });
                });
            });
            return result;
        },

        /**
         * Получить статистику по каналам.
         */
        getStats() {
            const stats = {};
            _subscriptions.forEach((channelMap, channel) => {
                stats[channel] = channelMap.size;
            });
            return stats;
        },

        /**
         * Проверить, подписан ли на канал+key.
         */
        isSubscribed(channel, key = null) {
            const internalKey = _makeKey(channel, key);
            const channelMap = _subscriptions.get(channel);
            return !!(channelMap && channelMap.has(internalKey));
        },

        /**
         * ⭐ Автоматический reconnect при возврате онлайна.
         * Пересоздаёт все подписки.
         */
        _handleReconnect() {
            const active = this.getActiveSubscriptions();
            if (active.length === 0) return;

            console.log(`[RealtimeManager] Восстановление онлайна. Пересоздаём ${active.length} подписок...`);
            _log(`Reconnect: ${active.length} подписок`);

            // Сохраняем callback'и
            const snapshot = active.map(entry => ({
                channel: entry.channel,
                key: entry.key,
                callback: _subscriptions.get(entry.channel)?.get(_makeKey(entry.channel, entry.key))?.originalCallback
            }));

            // Пересоздаём
            this.unsubscribeAll();
            snapshot.forEach(entry => {
                if (entry.callback) {
                    this.subscribe(entry.channel, entry.key, entry.callback, { force: true });
                }
            });
        },

        /**
         * Установить слушатель онлайна.
         */
        _setupOnlineListener() {
            if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

            window.addEventListener('online', () => {
                console.log('[RealtimeManager] Онлайн восстановлен');
                _log('Событие online');
                setTimeout(() => this._handleReconnect(), 500);
            });

            window.addEventListener('offline', () => {
                console.log('[RealtimeManager] Онлайн потерян');
                _log('Событие offline');
            });
        }
    };

    // Экспорт
    window.RealtimeManager = RealtimeManager;

    // Автоматическая установка слушателя онлайна
    RealtimeManager._setupOnlineListener();

    console.log('[📡 RealtimeManager v1.0.0] Единый менеджер real-time подписок загружен. Каналы: lots, notifications, chat, tradeOffers, friendships, clubs, leaderboard, events ✓');

})();
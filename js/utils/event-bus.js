// ========================================================
// js/utils/event-bus.js — ЕДИНАЯ ШИНА СОБЫТИЙ (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ Заменяет прямые вызовы renderXXX() и saveState() между модулями.
//     Все модули подписываются на события и реагируют локально.
//     Это устраняет race conditions и упрощает отладку.
//
// Использование:
//   EventBus.on('money:changed', (payload) => { ... });
//   EventBus.emit('money:changed', { amount: 5000, source: 'sale' });
//   EventBus.off('money:changed', callback);
//   EventBus.once('state:loaded', callback);
// ========================================================

(function() {
    'use strict';

    const _listeners = new Map();     // event -> Set<callback>
    const _eventHistory = [];          // последние 200 событий (для DEV)
    const MAX_HISTORY = 200;

    // Известные события (для типизации в DEV-логах)
    const KNOWN_EVENTS = {
        // === ДЕНЬГИ ===
        'money:changed':        { desc: 'Изменение баланса игрока', payload: '{amount, source, direction}' },
        'money:earned':         { desc: 'Игрок заработал', payload: '{amount, source}' },
        'money:spent':          { desc: 'Игрок потратил', payload: '{amount, source}' },

        // === НОМЕРА ===
        'plate:added':          { desc: 'Номер добавлен в инвентарь', payload: '{plate, source}' },
        'plate:installed':      { desc: 'Номер установлен на авто', payload: '{plate, carUid}' },
        'plate:removed':        { desc: 'Номер снят с авто', payload: '{plate, carUid}' },

        // === АВТОМОБИЛИ ===
        'car:added':            { desc: 'Машина добавлена в гараж', payload: '{carUid, source}' },
        'car:removed':          { desc: 'Машина удалена из гаража', payload: '{carUid, reason}' },
        'car:moved':            { desc: 'Машина перемещена', payload: '{carUid, from, to}' },

        // === P2P ===
        'p2p:lot_published':    { desc: 'Лот выставлен на биржу', payload: '{lotId, price}' },
        'p2p:lot_sold':         { desc: 'Лот продан', payload: '{lotId, buyerId, price}' },
        'p2p:lot_bought':       { desc: 'Игрок купил лот', payload: '{lotId, sellerId, price}' },
        'p2p:lot_cancelled':    { desc: 'Лот снят с биржи', payload: '{lotId}' },

        // === ДРУЗЬЯ ===
        'friend:request_sent':  { desc: 'Отправлена заявка в друзья', payload: '{toUserId}' },
        'friend:request_received': { desc: 'Получена заявка', payload: '{fromUserId, fromUserName}' },
        'friend:accepted':      { desc: 'Заявка принята', payload: '{userId}' },
        'friend:declined':      { desc: 'Заявка отклонена', payload: '{userId}' },

        // === УВЕДОМЛЕНИЯ ===
        'notification:received': { desc: 'Получено уведомление из Firestore', payload: '{notif}' },
        'notification:handled':  { desc: 'Уведомление обработано', payload: '{notifId}' },

        // === STATE ===
        'state:loaded':         { desc: 'Сейв загружен', payload: '{source}' },
        'state:saved':          { desc: 'Сейв сохранён', payload: '{source}' },
        'state:reset':          { desc: 'Сейв сброшен', payload: '{reason}' },

        // === БИЗНЕС ===
        'business:income_collected': { desc: 'Собрана касса', payload: '{bizId, amount}' },
        'business:upgraded':    { desc: 'Бизнес улучшен', payload: '{bizId, newLevel}' },

        // === UI ===
        'ui:tab_changed':       { desc: 'Смена вкладки', payload: '{tabId}' },
        'ui:modal_opened':      { desc: 'Открыто модальное окно', payload: '{modalId}' },
        'ui:toast':             { desc: 'Показать тост', payload: '{message, type}' }
    };

    const EventBus = {
        /**
         * Подписаться на событие.
         * @param {string} event — имя события
         * @param {Function} callback — обработчик
         * @param {Object} [options] — { once: true, priority: number }
         * @returns {Function} unsubscribe
         */
        on(event, callback, options = {}) {
            if (!event || typeof callback !== 'function') {
                console.warn('[EventBus] on: некорректные аргументы', event, callback);
                return () => {};
            }

            if (!_listeners.has(event)) {
                _listeners.set(event, new Set());
            }

            const wrappedCallback = options.once
                ? (payload) => {
                    try { callback(payload); }
                    finally { EventBus.off(event, wrappedCallback); }
                }
                : callback;

            wrappedCallback._priority = options.priority || 0;
            _listeners.get(event).add(wrappedCallback);

            return () => EventBus.off(event, wrappedCallback);
        },

        /**
         * Подписаться один раз.
         */
        once(event, callback) {
            return this.on(event, callback, { once: true });
        },

        /**
         * Отписаться.
         */
        off(event, callback) {
            if (!event || !_listeners.has(event)) return;
            _listeners.get(event).delete(callback);
        },

        /**
         * Опубликовать событие.
         * @param {string} event — имя события
         * @param {Object} payload — данные
         */
        emit(event, payload = {}) {
            if (!event) return;

            const listeners = _listeners.get(event);
            const timestamp = Date.now();

            // Логирование в историю
            _eventHistory.push({
                event,
                payload: this._safeSerialize(payload),
                ts: timestamp,
                listenersCount: listeners ? listeners.size : 0
            });
            if (_eventHistory.length > MAX_HISTORY) {
                _eventHistory.shift();
            }

            // DEV-лог
            if (window.DevLogger && typeof window.DevLogger.add === 'function') {
                const known = KNOWN_EVENTS[event];
                const desc = known ? known.desc : 'Неизвестное событие';
                window.DevLogger.add('event', `${event} (${desc})`, payload);
            }

            if (!listeners || listeners.size === 0) {
                // Не логируем warn, чтобы не засорять консоль
                return;
            }

            // Сортируем по priority (больше = раньше)
            const sorted = [...listeners].sort((a, b) => (b._priority || 0) - (a._priority || 0));

            sorted.forEach(cb => {
                try {
                    cb(payload);
                } catch (e) {
                    console.error(`[EventBus] Ошибка в обработчике «${event}»:`, e);
                    if (window.DevLogger) {
                        window.DevLogger.add('error', `EventBus handler error in «${event}»: ${e.message}`);
                    }
                }
            });
        },

        /**
         * Получить историю событий (для DEV).
         */
        getHistory(filter = null) {
            if (!filter) return [..._eventHistory];
            return _eventHistory.filter(h => h.event.includes(filter));
        },

        /**
         * Очистить историю.
         */
        clearHistory() {
            _eventHistory.length = 0;
        },

        /**
         * Получить список всех известных событий (для DEV).
         */
        getKnownEvents() {
            return { ...KNOWN_EVENTS };
        },

        /**
         * Получить количество активных подписок по событиям.
         */
        getStats() {
            const stats = {};
            _listeners.forEach((set, event) => {
                stats[event] = set.size;
            });
            return stats;
        },

        /**
         * Безопасная сериализация payload для логов.
         * Убирает циклические ссылки, обрезает длинные строки.
         */
        _safeSerialize(obj, depth = 0) {
            if (depth > 3) return '[глубже]';
            if (obj === null || obj === undefined) return obj;
            if (typeof obj === 'string') return obj.length > 200 ? obj.substring(0, 200) + '...' : obj;
            if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
            if (typeof obj === 'function') return '[function]';

            if (Array.isArray(obj)) {
                return obj.slice(0, 5).map(item => this._safeSerialize(item, depth + 1));
            }

            if (typeof obj === 'object') {
                const result = {};
                const keys = Object.keys(obj).slice(0, 10);
                for (const k of keys) {
                    result[k] = this._safeSerialize(obj[k], depth + 1);
                }
                return result;
            }

            return String(obj);
        }
    };

    // Экспорт
    window.EventBus = EventBus;

    console.log('[📡 EventBus v1.0.0] Шина событий загружена. Известных событий:', Object.keys(KNOWN_EVENTS).length);

    // Хук для DEV-вкладки
    if (window.DevLogger) {
        window.DevLogger.add('system', 'EventBus v1.0.0 инициализирован');
    }
})();
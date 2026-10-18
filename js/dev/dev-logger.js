// ========================================================
// js/dev/dev-logger.js — ПЕРЕХВАТ СОБЫТИЙ ДЛЯ DEV (v1.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.1.0 (SPRINT 4 — ГЛАВНЫЙ ФИКС ПРОИЗВОДИТЕЛЬНОСТИ):
//   - КРИТИЧЕСКИЙ ФИКС: раньше перехват console.log/warn/error,
//     window.onerror, saveState, switchTab и setCategory работали
//     ВСЕГДА — включая продакшен. Это давало:
//       • ×2 нагрузку на каждое saveState (JSON.stringify дублировался)
//       • дублирование всех логов в консоли
//       • лишние listeners на window
//
//   - ТЕПЕРЬ: все перехваты включаются ТОЛЬКО при:
//       • window.isPcDevMode() === true (DEV-сессия)
//       • URL параметр ?dev=1
//       • явный вызов window.DevLogger.enable()
//
//   - Объект window.DevLogger существует ВСЕГДА (совместимость
//     с phone-dev.js, event-bus.js, money-manager.js, access-control.js).
//     В disabled-режиме все методы работают, но буфер пуст.
//
//   - Добавлены методы: enable(), disable(), isEnabled()
//
// ⭐ v1.0.0:
//   - Хранит последние 200 событий в памяти
//   - Перехват console.log/warn/error
//   - Перехват window.onerror и unhandledrejection
//   - Перехват saveState / switchTab / setCategory
// ========================================================

(function initDevLogger() {
    'use strict';

    const MAX_EVENTS = 200;

    /**
     * ⭐ v1.1.0: определить, находимся ли мы в DEV-режиме.
     * @returns {boolean}
     */
    function _detectDevMode() {
        // 1. Принудительный DEV-режим (PC)
        try {
            if (typeof window.isPcDevMode === 'function' && window.isPcDevMode()) {
                return true;
            }
        } catch (e) {}

        // 2. URL параметр ?dev=1
        try {
            if (typeof window.location !== 'undefined') {
                const params = new URLSearchParams(window.location.search);
                if (params.get('dev') === '1') return true;
            }
        } catch (e) {}

        // 3. localhost (разработка)
        try {
            const host = window.location?.hostname || '';
            if (host === 'localhost' || host === '127.0.0.1') return true;
        } catch (e) {}

        return false;
    }

    const DevLogger = {
        // ⭐ v1.1.0: включается автоматически только в DEV-режиме
        enabled: _detectDevMode(),

        _events: [],
        _installed: false,

        _originalConsole: {
            log: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console)
        },

        // ----------------------------------------------------
        // ⭐ v1.1.0: РУЧНОЕ УПРАВЛЕНИЕ
        // ----------------------------------------------------

        /**
         * Включить логирование (например, из консоли в проде для отладки).
         * После вызова подхватываются все перехваты.
         */
        enable() {
            if (this.enabled && this._installed) {
                this._originalConsole.log('[DEV Logger] Уже включён');
                return;
            }
            this.enabled = true;
            this._originalConsole.log('%c[DEV Logger] ✅ Включён вручную', 'color:#00e676;font-weight:700;');
            this.install();
        },

        /**
         * Выключить логирование. Перехваты перестают работать
         * (но originalConsole остаётся, saveState перестаёт быть обёрнутым —
         *  правда, уже нельзя откатить, если install уже был вызван).
         *
         * Для чистого отключения нужна перезагрузка страницы.
         */
        disable() {
            this.enabled = false;
            this._originalConsole.log('%c[DEV Logger] ⛔ Отключён (требуется перезагрузка для полного отката)', 'color:#ff3366;font-weight:700;');
        },

        isEnabled() {
            return this.enabled === true;
        },

        // ----------------------------------------------------
        // ДОБАВЛЕНИЕ СОБЫТИЯ
        // ----------------------------------------------------
        add(type, message, payload = null) {
            // ⭐ v1.1.0: если disabled — тихо игнорируем (не пишем в буфер, не дублируем в консоль)
            if (!this.enabled) return;

            const evt = {
                id: this._events.length + 1,
                ts: Date.now(),
                time: new Date().toLocaleTimeString('ru-RU'),
                type: type,
                message: String(message || '').substring(0, 500),
                payload: payload
            };

            this._events.push(evt);
            if (this._events.length > MAX_EVENTS) {
                this._events.splice(0, this._events.length - MAX_EVENTS);
            }

            // Дублируем в реальную консоль
            try {
                const prefix = `[DEV:${type.toUpperCase()}]`;
                if (type === 'error') this._originalConsole.error(prefix, message, payload || '');
                else if (type === 'warn') this._originalConsole.warn(prefix, message, payload || '');
                else this._originalConsole.log(prefix, message, payload || '');
            } catch (e) {}
        },

        // ----------------------------------------------------
        // ПОЛУЧЕНИЕ ВСЕХ СОБЫТИЙ
        // ----------------------------------------------------
        getAll() {
            return [...this._events];
        },

        // ----------------------------------------------------
        // ПОЛУЧЕНИЕ ПО ФИЛЬТРУ
        // ----------------------------------------------------
        getFiltered(typeFilter = 'all', searchText = '') {
            let list = [...this._events];
            if (typeFilter && typeFilter !== 'all') {
                list = list.filter(e => e.type === typeFilter);
            }
            if (searchText && searchText.trim()) {
                const q = searchText.trim().toLowerCase();
                list = list.filter(e => e.message.toLowerCase().includes(q));
            }
            return list;
        },

        // ----------------------------------------------------
        // ОЧИСТКА
        // ----------------------------------------------------
        clear() {
            this._events.length = 0;
            if (this.enabled) {
                this._originalConsole.log('[DEV Logger] Лог очищен');
            }
        },

        // ----------------------------------------------------
        // ЭКСПОРТ В ТЕКСТ
        // ----------------------------------------------------
        exportAsText() {
            const lines = this._events.map(e => {
                return `[${e.time}] [${e.type.toUpperCase()}] ${e.message}`;
            });
            return lines.join('\n');
        },

        // ----------------------------------------------------
        // УСТАНОВКА ПЕРЕХВАТОВ
        // ⭐ v1.1.0: вызывается ТОЛЬКО если enabled === true
        // ----------------------------------------------------
        install() {
            if (this._installed) return;
            if (!this.enabled) {
                this._originalConsole.log('[DEV Logger] install() пропущен — enabled=false');
                return;
            }

            this._installed = true;
            const self = this;

            // ─── 1. Перехват console.log/warn/error ───
            console.log = function(...args) {
                self.add('log', args.map(a => {
                    try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
                    catch (e) { return String(a); }
                }).join(' '));
            };
            console.warn = function(...args) {
                self.add('warn', args.map(a => String(a)).join(' '));
            };
            console.error = function(...args) {
                self.add('error', args.map(a => String(a)).join(' '));
            };

            // ─── 2. Перехват window.onerror ───
            const prevOnError = window.onerror;
            window.onerror = function(msg, url, line, col, err) {
                const text = `${msg} @ ${url}:${line}:${col}`;
                self.add('error', text, err ? (err.stack || null) : null);
                if (prevOnError) {
                    try { prevOnError.apply(window, arguments); } catch (e) {}
                }
                return false;
            };

            // ─── 3. Перехват unhandledrejection ───
            window.addEventListener('unhandledrejection', (ev) => {
                const reason = ev.reason;
                const text = reason && reason.message ? reason.message : String(reason);
                self.add('error', 'Promise rejection: ' + text, reason && reason.stack ? reason.stack : null);
            });

            // ─── 4. Обёртка saveState (если уже определён) ───
            this._wrapSaveState();

            // ─── 5. Обёртка switchTab ───
            this._wrapSwitchTab();

            // ─── 6. Обёртка setCategory (появится позже через setTimeout) ───
            setTimeout(() => self._wrapSetCategory(), 1500);

            this._originalConsole.log('[DEV Logger] ✅ Перехваты установлены. Событий в буфере: 0');
        },

        _wrapSaveState() {
            if (typeof window.saveState !== 'function') {
                setTimeout(() => this._wrapSaveState(), 300);
                return;
            }
            if (window.saveState.__devWrapped) return;

            const self = this;
            const orig = window.saveState;

            const wrapped = function() {
                if (window.__IS_RESETTING__) {
                    self.add('save', 'saveState() ЗАБЛОКИРОВАН — идёт сброс');
                    return;
                }
                const startTs = performance.now();
                const result = orig.apply(this, arguments);
                const duration = (performance.now() - startTs).toFixed(1);

                try {
                    const jsonSize = (JSON.stringify(window.state) || '').length;
                    self.add('save', `saveState() — ${duration}ms, размер JSON: ${jsonSize} байт`);
                } catch (e) {
                    self.add('save', `saveState() — ${duration}ms (ошибка подсчёта размера)`);
                }
                return result;
            };
            wrapped.__devWrapped = true;
            window.saveState = wrapped;
        },

        _wrapSwitchTab() {
            if (typeof window.switchTab !== 'function') {
                setTimeout(() => this._wrapSwitchTab(), 300);
                return;
            }
            if (window.switchTab.__devWrapped) return;

            const self = this;
            const orig = window.switchTab;

            const wrapped = function(tabId) {
                self.add('tab', `switchTab → ${tabId}`);
                return orig.apply(this, arguments);
            };
            wrapped.__devWrapped = true;
            window.switchTab = wrapped;
        },

        _wrapSetCategory() {
            if (typeof window.setCategory !== 'function') {
                setTimeout(() => this._wrapSetCategory(), 800);
                return;
            }
            if (window.setCategory.__devWrapped) return;

            const self = this;
            const orig = window.setCategory;

            const wrapped = function(cat) {
                self.add('cat', `setCategory → ${cat}`);
                return orig.apply(this, arguments);
            };
            wrapped.__devWrapped = true;
            window.setCategory = wrapped;
        }
    };

    window.DevLogger = DevLogger;

    // ⭐ v1.1.0: устанавливаем перехваты ТОЛЬКО если enabled
    if (DevLogger.enabled) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => DevLogger.install());
        } else {
            DevLogger.install();
        }
        DevLogger._originalConsole.log('[🔎 dev-logger v1.1.0] DEV-режим. Перехваты активны.');
    } else {
        DevLogger._originalConsole.log(
            '%c[🔎 dev-logger v1.1.0] Отключён в продакшене (это правильно — для производительности). ' +
            'Включить: ?dev=1 или DevLogger.enable()',
            'color:#64748b;'
        );
    }

    // ═══════════════════════════════════════════════════════
    // ФАЙЛ ЗАГРУЖЕН
    // ═══════════════════════════════════════════════════════
    console.log('[🔎 dev-logger v1.1.0] Модуль загружен. enabled=' + DevLogger.enabled);
})();
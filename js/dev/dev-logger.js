// ========================================================
// js/dev/dev-logger.js — ПЕРЕХВАТ СОБЫТИЙ ДЛЯ DEV (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Хранит последние 200 событий в памяти. Логирует:
//   - console.log/warn/error
//   - window.onerror и unhandledrejection
//   - saveState / pushSave
//   - switchTab / setCategory
//   - операции Firestore (pullSave/pushSave/publishLot)
// ========================================================

(function initDevLogger() {
    'use strict';

    const MAX_EVENTS = 200;
    const events = [];

    const DevLogger = {
        enabled: true,
        _originalConsole: {
            log: console.log,
            warn: console.warn,
            error: console.error
        },

        // ---------- ДОБАВЛЕНИЕ СОБЫТИЯ ----------
        add(type, message, payload = null) {
            if (!this.enabled) return;

            const evt = {
                id: events.length + 1,
                ts: Date.now(),
                time: new Date().toLocaleTimeString('ru-RU'),
                type: type, // 'log' | 'warn' | 'error' | 'save' | 'firestore' | 'tab' | 'cat' | 'system'
                message: String(message || '').substring(0, 500),
                payload: payload
            };

            events.push(evt);
            if (events.length > MAX_EVENTS) {
                events.splice(0, events.length - MAX_EVENTS);
            }

            // Дублируем в реальную консоль для отладки
            try {
                const prefix = `[DEV:${type.toUpperCase()}]`;
                if (type === 'error') this._originalConsole.error(prefix, message, payload || '');
                else if (type === 'warn') this._originalConsole.warn(prefix, message, payload || '');
                else this._originalConsole.log(prefix, message, payload || '');
            } catch (e) {}
        },

        // ---------- ПОЛУЧЕНИЕ ВСЕХ СОБЫТИЙ ----------
        getAll() {
            return [...events];
        },

        // ---------- ПОЛУЧЕНИЕ ПО ФИЛЬТРУ ----------
        getFiltered(typeFilter = 'all', searchText = '') {
            let list = [...events];
            if (typeFilter && typeFilter !== 'all') {
                list = list.filter(e => e.type === typeFilter);
            }
            if (searchText && searchText.trim()) {
                const q = searchText.trim().toLowerCase();
                list = list.filter(e => e.message.toLowerCase().includes(q));
            }
            return list;
        },

        // ---------- ОЧИСТКА ----------
        clear() {
            events.length = 0;
            this._originalConsole.log('[DEV Logger] Лог очищен');
        },

        // ---------- ЭКСПОРТ В ТЕКСТ ----------
        exportAsText() {
            const lines = events.map(e => {
                return `[${e.time}] [${e.type.toUpperCase()}] ${e.message}`;
            });
            return lines.join('\n');
        },

        // ---------- ИНСТАЛЛЯЦИЯ ПЕРЕХВАТОВ ----------
        install() {
            const self = this;

            // 1. Перехват console.log/warn/error
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

            // 2. Перехват window.onerror
            const prevOnError = window.onerror;
            window.onerror = function(msg, url, line, col, err) {
                const text = `${msg} @ ${url}:${line}:${col}`;
                self.add('error', text, err ? (err.stack || null) : null);
                if (prevOnError) {
                    try { prevOnError.apply(window, arguments); } catch (e) {}
                }
                return false;
            };

            // 3. Перехват unhandledrejection
            window.addEventListener('unhandledrejection', (ev) => {
                const reason = ev.reason;
                const text = reason && reason.message ? reason.message : String(reason);
                self.add('error', 'Promise rejection: ' + text, reason && reason.stack ? reason.stack : null);
            });

            // 4. Обёртка saveState (если уже определён)
            this._wrapSaveState();

            // 5. Обёртка switchTab
            this._wrapSwitchTab();

            // 6. Обёртка setCategory (появится позже через setTimeout)
            setTimeout(() => self._wrapSetCategory(), 1500);

            this._originalConsole.log('[DEV Logger] Перехваты установлены. Событий в буфере: 0');
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

    // Устанавливаем перехваты сразу после загрузки
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => DevLogger.install());
    } else {
        DevLogger.install();
    }

    console.log('[🔎 dev-logger v1.0.0] Перехватчик событий для DEV загружен ✓');
})();
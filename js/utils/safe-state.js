// ========================================================
// js/utils/safe-state.js — БЕЗОПАСНЫЙ ДОСТУП К STATE (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ Помогает избежать TypeError при работе с state.
//     Все модули используют SafeState.get('player.cash', 0).
//
// Использование:
//   SafeState.get('player.cash', 0);
//   SafeState.set('player.cash', 50000);
//   SafeState.ensure('player.warehouse.cars', []);
// ========================================================

(function() {
    'use strict';

    const SafeState = {
        /**
         * Получить значение по пути.
         * @param {string} path — 'player.cash' или 'garage.0.name'
         * @param {*} defaultValue — значение по умолчанию
         */
        get(path, defaultValue = undefined) {
            if (!window.state || typeof path !== 'string') return defaultValue;

            const parts = path.split('.');
            let current = window.state;

            for (let i = 0; i < parts.length; i++) {
                if (current === null || current === undefined) return defaultValue;
                current = current[parts[i]];
            }

            return current === undefined ? defaultValue : current;
        },

        /**
         * Установить значение по пути.
         * Создаёт промежуточные объекты.
         */
        set(path, value) {
            if (!window.state || typeof path !== 'string') return false;

            const parts = path.split('.');
            let current = window.state;

            for (let i = 0; i < parts.length - 1; i++) {
                const key = parts[i];
                if (current[key] === null || current[key] === undefined || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                current = current[key];
            }

            current[parts[parts.length - 1]] = value;
            return true;
        },

        /**
         * Убедиться, что путь существует. Если нет — создать.
         * @returns {*} — текущее значение по пути
         */
        ensure(path, defaultValue) {
            const existing = this.get(path, undefined);
            if (existing !== undefined && existing !== null) return existing;
            this.set(path, defaultValue);
            return defaultValue;
        },

        /**
         * Проверить, что state.player существует.
         */
        hasPlayer() {
            return !!(window.state && window.state.player);
        },

        /**
         * Безопасно получить ссылку на игрока.
         */
        getPlayer() {
            if (!window.state) window.state = {};
            if (!window.state.player) window.state.player = {};
            return window.state.player;
        },

        /**
         * Безопасно получить гараж.
         */
        getGarage() {
            if (!window.state) window.state = {};
            if (!Array.isArray(window.state.garage)) window.state.garage = [];
            return window.state.garage;
        },

        /**
         * Безопасно найти машину по uid.
         */
        findCarByUid(uid) {
            const garage = this.getGarage();
            return garage.find(c => c && (c.uid === uid || c.id === uid)) || null;
        },

        /**
         * Безопасно найти индекс машины по uid.
         */
        findCarIndexByUid(uid) {
            const garage = this.getGarage();
            return garage.findIndex(c => c && (c.uid === uid || c.id === uid));
        },

        /**
         * Удалить машину из гаража по uid.
         * @returns {Object|null} — удалённая машина или null
         */
        removeCarByUid(uid) {
            const idx = this.findCarIndexByUid(uid);
            if (idx === -1) return null;
            const removed = window.state.garage.splice(idx, 1);
            return removed[0] || null;
        }
    };

    // Экспорт
    window.SafeState = SafeState;

    console.log('[🛡 SafeState v1.0.0] Безопасный доступ к state загружен');
})();
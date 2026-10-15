// ========================================================
// js/utils/game-helpers.js — ЕДИНЫЕ УТИЛИТЫ ИГРЫ (v1.0.1)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.0.1 (ОБНОВЛЕНИЕ):
//   - Установлен OWNER_TELEGRAM_ID = 1944392183
//   - Owner определяется по ID ИЛИ по username
// ⭐ v1.0.0 (ФУНДАМЕНТ ВСЕГО ПРОЕКТА):
//   - Заменяет дубликаты escapeHtml/safeGetCar/formatMoney
//     в 15+ файлах игры
//   - Единые helper'ы для денег, времени, DOM, звука
//   - Owner-логика для access-control
//   - Курс Stars из BANK_EXCHANGE_RATES
//   - Обёртки над DevLogger
//
// ВАЖНО: файл загружается ПЕРВЫМ (после safe-state.js и event-bus.js)
// ========================================================

(function() {
    'use strict';

    // ========================================================
    // 1. КОНСТАНТЫ
    // ========================================================
    const OWNER_USERNAME = 'taktojenorm';            // lower-case для сравнения
    const OWNER_TELEGRAM_ID = '1944392183';          // ✅ твой ID
    const FALLBACK_STAR_RATE = 2500;                 // ₽ за 1 ⭐

    // ========================================================
    // 2. ХЕЛПЕР: получить текущее время
    // ========================================================
    function _now() {
        return Date.now();
    }

    // ========================================================
    // 3. БЕЗОПАСНЫЙ DOM
    // ========================================================
    function safeGetEl(id) {
        if (!id) return null;
        return document.getElementById(id);
    }

    function safeSetTxt(id, val) {
        const el = safeGetEl(id);
        if (el) el.innerHTML = val;
        return el;
    }

    // ========================================================
    // 4. ESCAPE HTML
    // ========================================================
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeAttr(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // ========================================================
    // 5. БЕЗОПАСНОЕ ЧИСЛО
    // ========================================================
    function safeNum(val, fallback = 0) {
        const n = Number(val);
        return isNaN(n) || !isFinite(n) ? fallback : n;
    }

    function clamp(val, min, max) {
        const n = safeNum(val, min);
        return Math.max(min, Math.min(max, n));
    }

    // ========================================================
    // 6. ДЕНЬГИ
    // ========================================================
    function formatMoney(amount) {
        const n = Math.round(safeNum(amount, 0));
        return n.toLocaleString('ru-RU') + ' ₽';
    }

    function formatMoneyShort(amount) {
        const n = Math.round(safeNum(amount, 0));
        if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B ₽';
        if (Math.abs(n) >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M ₽';
        if (Math.abs(n) >= 1_000)         return (n / 1_000).toFixed(0) + 'k ₽';
        return n.toLocaleString('ru-RU') + ' ₽';
    }

    function formatStars(stars, withRub = true) {
        const n = safeNum(stars, 0);
        if (!withRub) return n + ' ⭐';
        const rate = getStarRate();
        return `${n} ⭐ (${(n * rate).toLocaleString('ru-RU')} ₽)`;
    }

    function getStarRate() {
        const cfg = window.BANK_EXCHANGE_RATES;
        if (cfg && cfg.stars && typeof cfg.stars.buyRub === 'number') {
            return cfg.stars.buyRub;
        }
        return FALLBACK_STAR_RATE;
    }

    // ========================================================
    // 7. ВРЕМЯ
    // ========================================================
    function timeAgo(timestamp) {
        if (!timestamp) return 'Недавно';
        const diff = _now() - timestamp;
        const sec = Math.floor(diff / 1000);
        const min = Math.floor(sec / 60);
        const hr  = Math.floor(min / 60);
        const day = Math.floor(hr / 24);
        const week = Math.floor(day / 7);

        if (sec < 30)  return 'Только что';
        if (sec < 60)  return sec + ' сек назад';
        if (min < 60)  return min + ' мин назад';
        if (hr  < 24)  return hr + ' ч назад';
        if (day < 7)   return day + ' д назад';
        if (week < 4)  return week + ' нед назад';
        return new Date(timestamp).toLocaleDateString('ru-RU');
    }

    function formatTime(dateObj) {
        const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }

    function formatDate(dateObj) {
        const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    }

    // ========================================================
    // 8. БЕЗОПАСНЫЙ ГАРАЖ
    // ========================================================
    function safeGetCar(idx) {
        if (idx === null || idx === undefined) return null;
        const garage = window.state?.garage;
        if (!Array.isArray(garage)) return null;
        const i = parseInt(idx, 10);
        if (isNaN(i) || i < 0 || i >= garage.length) return null;
        return garage[i] || null;
    }

    function findCarByUid(uid) {
        if (!uid) return null;
        const garage = window.state?.garage || [];
        return garage.find(c => c && (c.uid === uid || c.id === uid)) || null;
    }

    function findCarIndexByUid(uid) {
        if (!uid) return -1;
        const garage = window.state?.garage || [];
        return garage.findIndex(c => c && (c.uid === uid || c.id === uid));
    }

    // ========================================================
    // 9. БЕЗОПАСНЫЙ ЗВУК/ВИБРО/TOAST
    // ========================================================
    function safeShowToast(msg) {
        if (typeof window.showToast === 'function') {
            try { window.showToast(msg); } catch (e) {}
        }
    }

    function safePlaySound(snd) {
        if (typeof window.playSound === 'function') {
            try { window.playSound(snd); } catch (e) {}
        }
    }

    function safeTgHaptic(type) {
        if (typeof window.tgHaptic === 'function') {
            try { window.tgHaptic(type); } catch (e) {}
        }
    }

    function safeSaveState() {
        if (typeof window.saveState === 'function') {
            try { window.saveState(); } catch (e) {}
        }
    }

    function safeUpdateHeaderUI() {
        if (typeof window.updateHeaderUI === 'function') {
            try { window.updateHeaderUI(); } catch (e) {}
        }
    }

    // ========================================================
    // 10. ЛОГИРОВАНИЕ
    // ========================================================
    function logDev(category, message, data) {
        if (window.DevLogger && typeof window.DevLogger.add === 'function') {
            try {
                window.DevLogger.add(category || 'log', message, data || null);
            } catch (e) {}
        }
    }

    // ========================================================
    // 11. ОБЪЕКТЫ: КЛОНИРОВАНИЕ, СРАВНЕНИЕ
    // ========================================================
    function deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            return obj;
        }
    }

    function isEmpty(val) {
        if (val === null || val === undefined) return true;
        if (typeof val === 'string') return val.trim().length === 0;
        if (Array.isArray(val)) return val.length === 0;
        if (typeof val === 'object') return Object.keys(val).length === 0;
        return false;
    }

    // ========================================================
    // 12. ДЕБАУНС / ТРОТТЛИНГ
    // ========================================================
    function debounce(fn, wait = 300) {
        let timer = null;
        return function() {
            const ctx = this;
            const args = arguments;
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(ctx, args), wait);
        };
    }

    function throttle(fn, limit = 300) {
        let lastCall = 0;
        return function() {
            const now = _now();
            if (now - lastCall < limit) return;
            lastCall = now;
            return fn.apply(this, arguments);
        };
    }

    // ========================================================
    // 13. OWNER-ЛОГИКА (для access-control)
    // ========================================================
    function getOwnerUsername() {
        return OWNER_USERNAME;
    }

    function getOwnerTelegramId() {
        return OWNER_TELEGRAM_ID;
    }

    /**
     * Проверка: текущий игрок — владелец игры?
     * Проверяет и числовой ID, и username.
     */
    function isOwnerUser() {
        // 1. Проверка по числовому ID
        if (OWNER_TELEGRAM_ID) {
            const currentId = String(window.tgUserId || window.state?.player?.uid || '');
            if (currentId === String(OWNER_TELEGRAM_ID)) return true;
        }

        // 2. Проверка по username (Telegram)
        try {
            const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
            if (tgUser && tgUser.username) {
                const uname = String(tgUser.username).toLowerCase().replace(/^@/, '');
                if (uname === OWNER_USERNAME) return true;
            }
        } catch (e) {}

        // 3. Проверка через FB_Bridge.Auth
        try {
            const authProfile = window.FB_Bridge?.Auth?.getUserProfile?.();
            if (authProfile && authProfile.username) {
                const uname = String(authProfile.username).toLowerCase().replace(/^@/, '');
                if (uname === OWNER_USERNAME) return true;
            }
        } catch (e) {}

        return false;
    }

    // ========================================================
    // 14. УТИЛИТЫ ДЛЯ МАССИВОВ
    // ========================================================
    function shuffleArray(arr) {
        if (!Array.isArray(arr)) return [];
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function pickRandom(arr) {
        if (!Array.isArray(arr) || arr.length === 0) return null;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function sumBy(arr, key) {
        if (!Array.isArray(arr)) return 0;
        return arr.reduce((sum, item) => sum + safeNum(item && item[key], 0), 0);
    }

    // ========================================================
    // 15. УТИЛИТЫ ДЛЯ URL / СТРОК
    // ========================================================
    function truncate(str, maxLen = 100) {
        if (!str) return '';
        const s = String(str);
        if (s.length <= maxLen) return s;
        return s.substring(0, maxLen - 1) + '…';
    }

    function slugify(str) {
        if (!str) return '';
        return String(str)
            .toLowerCase()
            .replace(/[^a-z0-9а-я]/gi, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    function capitalize(str) {
        if (!str) return '';
        const s = String(str);
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    // ========================================================
    // 16. ГЕНЕРАЦИЯ ID
    // ========================================================
    function generateId(prefix = 'id') {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    }

    // ========================================================
    // 17. СБОРКА ОБЪЕКТА GameHelpers
    // ========================================================
    const GameHelpers = {
        version: '1.0.1',

        // Константы
        OWNER_USERNAME,
        OWNER_TELEGRAM_ID,

        // DOM
        safeGetEl,
        safeSetTxt,

        // Escape
        escapeHtml,
        escapeAttr,

        // Числа
        safeNum,
        clamp,

        // Деньги
        formatMoney,
        formatMoneyShort,
        formatStars,
        getStarRate,

        // Время
        timeAgo,
        formatTime,
        formatDate,

        // Гараж
        safeGetCar,
        findCarByUid,
        findCarIndexByUid,

        // Звук/вибро/toast/save
        safeShowToast,
        safePlaySound,
        safeTgHaptic,
        safeSaveState,
        safeUpdateHeaderUI,

        // Логирование
        logDev,

        // Объекты
        deepClone,
        isEmpty,

        // Дебаунс/троттлинг
        debounce,
        throttle,

        // Owner
        getOwnerUsername,
        getOwnerTelegramId,
        isOwnerUser,

        // Массивы
        shuffleArray,
        pickRandom,
        sumBy,

        // Строки
        truncate,
        slugify,
        capitalize,

        // ID
        generateId
    };

    // ========================================================
    // 18. ЭКСПОРТ В WINDOW
    // ========================================================
    window.GameHelpers = GameHelpers;

    // Дублируем отдельные функции в window для обратной совместимости
    window.escapeHtml = window.escapeHtml || escapeHtml;
    window.safeGetCar = window.safeGetCar || safeGetCar;
    window.formatMoney = window.formatMoney || formatMoney;
    window.timeAgo = window.timeAgo || timeAgo;

    // ========================================================
    // 19. ЛОГ ЗАГРУЗКИ
    // ========================================================
    if (window.DevLogger && typeof window.DevLogger.add === 'function') {
        window.DevLogger.add('system', 'GameHelpers v1.0.1 загружен (owner: ' + OWNER_TELEGRAM_ID + ')');
    }

    console.log('[🧰 GameHelpers v1.0.1] Единые утилиты загружены. Owner ID: ' + OWNER_TELEGRAM_ID + ' / @' + OWNER_USERNAME);

})();
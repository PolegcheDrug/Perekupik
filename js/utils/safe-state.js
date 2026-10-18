// ========================================================
// js/utils/safe-state.js — БЕЗОПАСНЫЙ ДОСТУП К STATE (v1.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.1.0 (ЮРИДИЧЕСКИЕ ЛИЦА И КОММЕРЧЕСКИЙ АВТОПАРК):
//   - Инициализация и валидация state.player.legalEntity (ИП/ООО)
//   - Нормализация полей коммерческого учета для машин в гараже
//   - Методы быстрого доступа к автопаркам предприятий
//   - Защита от потери данных и undefined при сохранении/загрузке
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
         * Создаёт промежуточные объекты при их отсутствии.
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
         * Безопасно найти машину по uid или id.
         */
        findCarByUid(uid) {
            const garage = this.getGarage();
            return garage.find(c => c && (c.uid === uid || c.id === uid)) || null;
        },

        /**
         * Безопасно найти индекс машины по uid или id.
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
        },

        // ========================================================
        // МЕТОДЫ ЮРИДИЧЕСКИХ ЛИЦ И АВТОПАРКОВ
        // ========================================================

        /**
         * Гарантирует наличие структуры юридического лица у игрока.
         */
        initLegalEntity() {
            const player = this.getPlayer();
            if (!player.legalEntity || typeof player.legalEntity !== 'object') {
                player.legalEntity = {
                    type: 'none',
                    inn: null,
                    ogrn: null,
                    regDate: null,
                    companyName: null
                };
            }
            return player.legalEntity;
        },

        /**
         * Получить статус юридического лица (none, ip, ooo).
         */
        getLegalEntity() {
            return this.initLegalEntity();
        },

        /**
         * Нормализует поля коммерческого учета для всех машин в гараже.
         */
        ensureCommercialCarFields() {
            const garage = this.getGarage();
            garage.forEach(car => {
                if (!car || typeof car !== 'object') return;
                if (typeof car.commercialRegistered !== 'boolean') {
                    car.commercialRegistered = false;
                }
                if (car.assignedBusinessId === undefined) {
                    car.assignedBusinessId = null;
                }
                if (car.assignedBusinessName === undefined) {
                    car.assignedBusinessName = null;
                }
                if (car.registeredCompany === undefined) {
                    car.registeredCompany = null;
                }
            });
        },

        /**
         * Получить все машины, привязанные к автопарку конкретного бизнеса.
         * @param {string} bizId — taxi, delivery, transport_company, tow_truck, razborka
         */
        getBusinessFleet(bizId) {
            if (!bizId) return [];
            return this.getGarage().filter(c => c && c.assignedBusinessId === bizId);
        },

        /**
         * Комплексная проверка целостности структуры сохранения при старте игры.
         */
        validateStateIntegrity() {
            this.getPlayer();
            this.getGarage();
            this.initLegalEntity();
            this.ensureCommercialCarFields();
            this.ensure('businesses', []);
            this.ensure('player.cash', 50000);
            this.ensure('player.level', 1);
            this.ensure('player.day', 1);
        }
    };

    // Экспорт
    window.SafeState = SafeState;

    // Автоматическая валидация при первой загрузке
    if (typeof window !== 'undefined') {
        SafeState.validateStateIntegrity();
    }

    console.log('[🛡 SafeState v1.1.0] Загружен: Юрлица ИП/ООО + Валидация автопарков бизнеса ✓');
})();
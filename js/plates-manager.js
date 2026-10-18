// ========================================================
// plates-manager.js — ЕДИНЫЙ МЕНЕДЖЕР НОМЕРНЫХ ЗНАКОВ (v2.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v2.0.0 (ПОЛНЫЙ РЕФАКТОРИНГ):
//   - ЕДИНЫЙ источник правды: state.player.platesInventory
//   - УСТРАНЕНЫ дубликаты (миграция state.ownedPlates → platesInventory)
//   - Публичное API: addPlate, getFreePlates, attachPlateToCar,
//     detachPlateFromCar, removePlate, isPlateTaken, syncLegacy
//   - Автоматические события EventBus (plate:added, plate:installed, ...)
//   - Автоматический saveState + updateHeaderUI
//   - Синхронизация с Firestore (registered_plates)
//   - Совместимость с DEV (getStats)
//   - try/catch во всех публичных методах
//
// ИСПОЛЬЗОВАНИЕ:
//   PlatesManager.addPlate('А777АА 77', 'gosuslugi');
//   PlatesManager.getFreePlates();       // [{id, number}]
//   PlatesManager.attachPlateToCar(car, 'А777АА 77');
//   PlatesManager.detachPlateFromCar(car);
//   PlatesManager.removePlate('А777АА 77');
// ========================================================

(function() {
    'use strict';

    // ========================================================
    // ВНУТРЕННИЕ УТИЛИТЫ
    // ========================================================

    /**
     * Генерация уникального ID для экземпляра номера.
     */
    function generatePlateId() {
        return 'plate_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }

    /**
     * Нормализация номера (верхний регистр, trim).
     * Убирает лишние пробелы, приводит к каноничному виду.
     */
    function formatPlateString(numberStr) {
        if (!numberStr || typeof numberStr !== 'string') return '';
        return numberStr.trim().toUpperCase().replace(/\s+/g, ' ');
    }

    /**
     * Извлечение региона из номера.
     */
    function extractRegion(plateStr) {
        if (!plateStr || typeof plateStr !== 'string') return 77;
        const match = plateStr.match(/(\d{2,3})$/);
        return match ? parseInt(match[1], 10) : 77;
    }

    /**
     * Получить ссылку на state.
     */
    function getState() {
        if (typeof window.state !== 'undefined' && window.state) return window.state;
        if (typeof window.gameState !== 'undefined' && window.gameState) return window.gameState;
        return null;
    }

    /**
     * Сохранить сейв.
     */
    function persistState() {
        if (typeof window.saveState === 'function') {
            try {
                window.saveState();
            } catch (e) {
                console.warn('[PlatesManager] Ошибка saveState:', e);
            }
        }
    }

    /**
     * Обновить HUD.
     */
    function refreshHeader() {
        if (typeof window.updateHeaderUI === 'function') {
            try {
                window.updateHeaderUI();
            } catch (e) {}
        }
    }

    /**
     * Опубликовать событие (если EventBus загружен).
     */
    function emitEvent(eventName, payload) {
        if (window.EventBus && typeof window.EventBus.emit === 'function') {
            try {
                window.EventBus.emit(eventName, payload || {});
            } catch (e) {}
        }
    }

    /**
     * DEV-лог.
     */
    function devLog(type, message, payload) {
        if (window.DevLogger && typeof window.DevLogger.add === 'function') {
            try {
                window.DevLogger.add(type, '[PlatesManager] ' + message, payload || null);
            } catch (e) {}
        }
    }

    // ========================================================
    // МИГРАЦИЯ СТАРЫХ СЕЙВОВ
    // ========================================================

    /**
     * Приводит platesInventory к актуальному формату.
     * Сливает state.ownedPlates (строки) в platesInventory (объекты).
     * Устраняет дубликаты по номеру.
     */
    function migratePlayerPlates(state) {
        if (!state) return;
        if (!state.player) state.player = {};

        // Убедимся, что platesInventory — массив
        if (!Array.isArray(state.player.platesInventory)) {
            state.player.platesInventory = [];
        }

        const seenNumbers = new Map(); // number -> plateObject
        const migrated = [];

        // 1. Сначала обрабатываем platesInventory (приоритет — объекты с полной инфой)
        state.player.platesInventory.forEach((item) => {
            let plateObj = null;

            if (typeof item === 'string') {
                // Legacy: строка
                const clean = formatPlateString(item);
                if (clean) {
                    plateObj = {
                        id: generatePlateId(),
                        number: clean,
                        region: extractRegion(clean),
                        status: 'inventory',
                        installedCarId: null,
                        ownerId: state.player.uid || state.playerId || 'player_local',
                        source: 'legacy_migration',
                        createdAt: Date.now()
                    };
                }
            } else if (item && typeof item === 'object' && item.number) {
                // Уже объект
                const cleanNumber = formatPlateString(item.number);
                if (cleanNumber) {
                    plateObj = {
                        id: item.id || generatePlateId(),
                        number: cleanNumber,
                        region: item.region || extractRegion(cleanNumber),
                        status: item.status || (item.installedCarId ? 'installed' : 'inventory'),
                        installedCarId: item.installedCarId || null,
                        ownerId: item.ownerId || state.player.uid || 'player_local',
                        source: item.source || 'unknown',
                        createdAt: item.createdAt || Date.now()
                    };
                }
            }

            if (plateObj) {
                // Если такой номер уже был — оставляем первый, остальные в архив
                if (seenNumbers.has(plateObj.number)) {
                    plateObj.status = 'archived';
                } else {
                    seenNumbers.set(plateObj.number, plateObj);
                }
                migrated.push(plateObj);
            }
        });

        // 2. Сливаем legacy state.ownedPlates (строки)
        if (Array.isArray(state.ownedPlates) && state.ownedPlates.length > 0) {
            state.ownedPlates.forEach((rawPlate) => {
                if (typeof rawPlate !== 'string') return;
                const clean = formatPlateString(rawPlate);
                if (!clean) return;

                if (seenNumbers.has(clean)) {
                    // Уже есть — пропускаем
                    return;
                }

                const plateObj = {
                    id: generatePlateId(),
                    number: clean,
                    region: extractRegion(clean),
                    status: 'inventory',
                    installedCarId: null,
                    ownerId: state.player.uid || 'player_local',
                    source: 'legacy_ownedPlates',
                    createdAt: Date.now()
                };

                seenNumbers.set(clean, plateObj);
                migrated.push(plateObj);
            });

            // Очищаем legacy поле (чтобы не мигрировать дважды)
            state.ownedPlates = [];
        }

        state.player.platesInventory = migrated;
    }

    // ========================================================
    // ВНУТРЕННИЕ ПОИСКОВЫЕ ФУНКЦИИ
    // ========================================================

    /**
     * Найти номер в инвентаре по строке номера.
     */
    function _findPlateByNumber(state, plateNumber) {
        if (!state?.player?.platesInventory) return null;
        const clean = formatPlateString(plateNumber);
        if (!clean) return null;

        return state.player.platesInventory.find(
            (p) => p && p.number === clean
        ) || null;
    }

    /**
     * Найти номер по ID.
     */
    function _findPlateById(state, plateId) {
        if (!state?.player?.platesInventory) return null;
        return state.player.platesInventory.find((p) => p && p.id === plateId) || null;
    }

    /**
     * Найти номер, установленный на конкретной машине.
     */
    function _findPlateOnCar(state, carUid) {
        if (!state?.player?.platesInventory || !carUid) return null;
        return state.player.platesInventory.find(
            (p) => p && p.installedCarId === carUid
        ) || null;
    }

    /**
     * Найти машину в гараже по uid.
     */
    function _findCarByUid(state, carUid) {
        if (!state?.garage || !carUid) return null;
        return state.garage.find((c) => c && (c.uid === carUid || c.id === carUid)) || null;
    }

    // ========================================================
    // ПУБЛИЧНОЕ API
    // ========================================================

    const PlatesManager = {
        /**
         * Инициализация менеджера.
         * Вызывается один раз при старте игры.
         */
        init() {
            try {
                const state = getState();
                if (state) {
                    migratePlayerPlates(state);
                }
                console.log('[PlatesManager v2.0.0] Инициализирован. Номеров в инвентаре:', 
                    state?.player?.platesInventory?.length || 0);
                devLog('system', 'PlatesManager инициализирован');
            } catch (e) {
                console.error('[PlatesManager] Ошибка init:', e);
            }
        },

        /**
         * ⭐ ЕДИНАЯ ТОЧКА ВЫДАЧИ НОВОГО НОМЕРА.
         * @param {string} plateNumber — 'А777АА 77'
         * @param {string} source — 'gosuslugi' | 'barn' | 'p2p' | 'super_spin' | 'mail' | 'port' | 'auction' | 'legacy' | 'manual'
         * @param {Object} [options] — { silent: bool, region: number }
         * @returns {Object|null} — созданный объект номера (или существующий, если дубликат)
         */
        addPlate(plateNumber, source, options = {}) {
            try {
                const state = getState();
                if (!state) {
                    console.error('[PlatesManager] addPlate: state недоступен');
                    return null;
                }

                migratePlayerPlates(state);

                const cleanNumber = formatPlateString(plateNumber);
                if (!cleanNumber) {
                    console.warn('[PlatesManager] addPlate: некорректный номер', plateNumber);
                    return null;
                }

                // Если номер уже в инвентаре — возвращаем существующий
                const existing = _findPlateByNumber(state, cleanNumber);
                if (existing) {
                    if (existing.status === 'inventory') {
                        console.warn('[PlatesManager] addPlate: дубликат предотвращён', cleanNumber);
                        if (!options.silent && typeof window.showToast === 'function') {
                            window.showToast(`⚠️ Номер ${cleanNumber} уже в инвентаре`);
                        }
                        return existing;
                    }
                    // Если номер был на авто или в продаже — переводим в inventory и возвращаем
                    if (existing.status === 'archived' || existing.status === 'on_sale') {
                        existing.status = 'inventory';
                        existing.installedCarId = null;
                        persistState();
                        refreshHeader();
                        return existing;
                    }
                }

                // Создаём новый
                const newPlate = {
                    id: generatePlateId(),
                    number: cleanNumber,
                    region: options.region || extractRegion(cleanNumber),
                    status: 'inventory',
                    installedCarId: null,
                    ownerId: state.player.uid || 'player_local',
                    source: source || 'unknown',
                    createdAt: Date.now()
                };

                state.player.platesInventory.push(newPlate);

                // Синхронизация с Firestore
                if (window.FB_Bridge?.Plates?.claimPlateAtomic) {
                    try {
                        window.FB_Bridge.Plates.claimPlateAtomic(cleanNumber, null, null);
                    } catch (e) {
                        console.warn('[PlatesManager] Firestore claim error:', e);
                    }
                }

                persistState();
                refreshHeader();

                // Событие
                emitEvent('plate:added', {
                    plate: cleanNumber,
                    source: source || 'unknown',
                    plateId: newPlate.id
                });

                devLog('log', `Номер выдан: ${cleanNumber} (${source || 'unknown'})`);

                if (!options.silent && typeof window.showToast === 'function') {
                    window.showToast(`🏷️ Номер ${cleanNumber} добавлен в инвентарь!`);
                }
                if (!options.silent && typeof window.playSound === 'function') {
                    window.playSound('win');
                }
                if (!options.silent && typeof window.tgHaptic === 'function') {
                    window.tgHaptic('success');
                }

                return newPlate;

            } catch (e) {
                console.error('[PlatesManager] Ошибка addPlate:', e);
                devLog('error', `addPlate: ${e.message}`);
                return null;
            }
        },

        /**
         * ⭐ Список СВОБОДНЫХ номеров (status === 'inventory').
         * Возвращает массив объектов {id, number, region, ...}.
         */
        getFreePlates() {
            try {
                const state = getState();
                if (!state) return [];
                migratePlayerPlates(state);
                return state.player.platesInventory.filter(
                    (p) => p && p.status === 'inventory' && !p.installedCarId
                );
            } catch (e) {
                console.error('[PlatesManager] Ошибка getFreePlates:', e);
                return [];
            }
        },

        /**
         * ⭐ Список ВСЕХ номеров игрока (включая установленные, проданные, архивированные).
         */
        getAllPlates() {
            try {
                const state = getState();
                if (!state) return [];
                migratePlayerPlates(state);
                return state.player.platesInventory;
            } catch (e) {
                console.error('[PlatesManager] Ошибка getAllPlates:', e);
                return [];
            }
        },

        /**
         * ⭐ Список номеров в конкретном статусе.
         */
        getPlatesByStatus(status) {
            try {
                const state = getState();
                if (!state) return [];
                migratePlayerPlates(state);
                return state.player.platesInventory.filter((p) => p && p.status === status);
            } catch (e) {
                return [];
            }
        },

        /**
         * ⭐ УСТАНОВИТЬ НОМЕР НА АВТОМОБИЛЬ.
         * @param {Object} car — объект машины из гаража
         * @param {string} plateNumber — 'А777АА 77'
         * @param {Object} [options] — { silent: bool, skipFirestore: bool }
         * @returns {Object} — { success: bool, newPlate, oldPlate, error }
         */
        attachPlateToCar(car, plateNumber, options = {}) {
            try {
                const state = getState();
                if (!state || !car) {
                    return { success: false, error: 'Автомобиль не найден' };
                }

                migratePlayerPlates(state);

                const cleanNumber = formatPlateString(plateNumber);
                if (!cleanNumber) {
                    return { success: false, error: 'Некорректный номер' };
                }

                // Находим номер в инвентаре
                const plate = _findPlateByNumber(state, cleanNumber);
                if (!plate) {
                    return { success: false, error: `Номер ${cleanNumber} не найден в инвентаре` };
                }

                if (plate.status === 'installed' && plate.installedCarId && plate.installedCarId !== (car.uid || car.id)) {
                    return { success: false, error: `Номер ${cleanNumber} уже установлен на другое авто` };
                }

                if (plate.status === 'on_sale') {
                    return { success: false, error: `Номер ${cleanNumber} выставлен на продажу` };
                }

                // Снимаем старый номер с этой машины
                const oldPlateObj = _findPlateOnCar(state, car.uid || car.id);
                let oldPlateNumber = null;

                if (oldPlateObj) {
                    oldPlateObj.status = 'inventory';
                    oldPlateObj.installedCarId = null;
                    oldPlateNumber = oldPlateObj.number;
                }

                // Устанавливаем новый
                plate.status = 'installed';
                plate.installedCarId = car.uid || car.id || null;

                // Обновляем ссылки на машине
                car.plate = cleanNumber;
                car.customPlate = cleanNumber;
                car.plateId = plate.id;

                persistState();
                refreshHeader();

                // Пересчёт цены авто
                if (typeof window.recalculateCarMarketValue === 'function') {
                    try { window.recalculateCarMarketValue(car); } catch (e) {}
                }

                // Firestore
                if (!options.skipFirestore && window.FB_Bridge?.Plates) {
                    try {
                        if (oldPlateNumber && oldPlateNumber !== 'ТРАНЗИТ') {
                            window.FB_Bridge.Plates.releasePlate(oldPlateNumber, null, false);
                        }
                        window.FB_Bridge.Plates.claimPlateAtomic(cleanNumber, null, car.uid || car.id);
                    } catch (e) {
                        console.warn('[PlatesManager] Firestore sync error:', e);
                    }
                }

                // Событие
                emitEvent('plate:installed', {
                    plate: cleanNumber,
                    carUid: car.uid || car.id,
                    oldPlate: oldPlateNumber
                });

                devLog('log', `Номер установлен: ${cleanNumber} → ${car.name}`);

                if (!options.silent && typeof window.playSound === 'function') {
                    window.playSound('win');
                }
                if (!options.silent && typeof window.tgHaptic === 'function') {
                    window.tgHaptic('success');
                }

                return {
                    success: true,
                    newPlate: cleanNumber,
                    oldPlate: oldPlateNumber
                };

            } catch (e) {
                console.error('[PlatesManager] Ошибка attachPlateToCar:', e);
                devLog('error', `attachPlateToCar: ${e.message}`);
                return { success: false, error: e.message };
            }
        },

        /**
         * ⭐ СНЯТЬ НОМЕР С АВТОМОБИЛЯ.
         * @param {Object} car — объект машины
         * @param {Object} [options] — { silent: bool, archive: bool, skipFirestore: bool }
         * @returns {Object} — { success: bool, removedPlate, error }
         */
        detachPlateFromCar(car, options = {}) {
            try {
                const state = getState();
                if (!state || !car) {
                    return { success: false, error: 'Автомобиль не найден' };
                }

                migratePlayerPlates(state);

                const carUid = car.uid || car.id;
                const plate = _findPlateOnCar(state, carUid);

                if (!plate) {
                    // Может быть legacy: у машины есть car.plate, но нет записи в platesInventory
                    const carPlateNumber = car.customPlate || car.plate;
                    if (carPlateNumber && carPlateNumber !== 'ТРАНЗИТ') {
                        // Создаём запись и сразу снимаем
                        const clean = formatPlateString(carPlateNumber);
                        if (clean) {
                            state.player.platesInventory.push({
                                id: generatePlateId(),
                                number: clean,
                                region: extractRegion(clean),
                                status: options.archive ? 'archived' : 'inventory',
                                installedCarId: null,
                                ownerId: state.player.uid || 'player_local',
                                source: 'detach_recovered',
                                createdAt: Date.now()
                            });
                        }
                    }

                    // Очищаем поля у машины
                    car.plate = null;
                    car.customPlate = null;
                    car.plateId = null;

                    persistState();

                    if (!options.silent && typeof window.showToast === 'function') {
                        window.showToast('Номер снят с авто');
                    }

                    return {
                        success: true,
                        removedPlate: carPlateNumber || null
                    };
                }

                const removedNumber = plate.number;
                plate.status = options.archive ? 'archived' : 'inventory';
                plate.installedCarId = null;

                // Очищаем поля у машины
                car.plate = null;
                car.customPlate = null;
                car.plateId = null;

                persistState();
                refreshHeader();

                // Пересчёт цены авто
                if (typeof window.recalculateCarMarketValue === 'function') {
                    try { window.recalculateCarMarketValue(car); } catch (e) {}
                }

                // Firestore
                if (!options.skipFirestore && window.FB_Bridge?.Plates) {
                    try {
                        window.FB_Bridge.Plates.releasePlate(removedNumber, null, options.archive);
                    } catch (e) {
                        console.warn('[PlatesManager] Firestore release error:', e);
                    }
                }

                // Событие
                emitEvent('plate:removed', {
                    plate: removedNumber,
                    carUid: carUid
                });

                devLog('log', `Номер снят: ${removedNumber} ← ${car.name}`);

                if (!options.silent && typeof window.playSound === 'function') {
                    window.playSound('tick');
                }

                return {
                    success: true,
                    removedPlate: removedNumber
                };

            } catch (e) {
                console.error('[PlatesManager] Ошибка detachPlateFromCar:', e);
                devLog('error', `detachPlateFromCar: ${e.message}`);
                return { success: false, error: e.message };
            }
        },

        /**
         * ⭐ УДАЛИТЬ НОМЕР ИЗ ИНВЕНТАРЯ (полностью).
         * Используется при продаже на P2P, обмене с игроком и т.д.
         * @param {string} plateNumber — 'А777АА 77'
         * @param {Object} [options] — { silent: bool }
         * @returns {Object} — { success: bool, removedPlate, error }
         */
        removePlate(plateNumber, options = {}) {
            try {
                const state = getState();
                if (!state) return { success: false, error: 'state недоступен' };

                migratePlayerPlates(state);

                const clean = formatPlateString(plateNumber);
                if (!clean) return { success: false, error: 'Некорректный номер' };

                const idx = state.player.platesInventory.findIndex((p) => p && p.number === clean);
                if (idx === -1) {
                    return { success: false, error: `Номер ${clean} не найден в инвентаре` };
                }

                const removed = state.player.platesInventory.splice(idx, 1)[0];

                // Если номер был на машине — снимаем ссылку
                if (removed.installedCarId) {
                    const car = _findCarByUid(state, removed.installedCarId);
                    if (car) {
                        car.plate = null;
                        car.customPlate = null;
                        car.plateId = null;
                    }
                }

                persistState();

                // Firestore
                if (window.FB_Bridge?.Plates) {
                    try {
                        window.FB_Bridge.Plates.releasePlate(clean, null, true);
                    } catch (e) {}
                }

                emitEvent('plate:removed', { plate: clean });

                devLog('log', `Номер удалён: ${clean}`);

                if (!options.silent && typeof window.showToast === 'function') {
                    window.showToast(`Номер ${clean} удалён из инвентаря`);
                }

                return { success: true, removedPlate: clean };

            } catch (e) {
                console.error('[PlatesManager] Ошибка removePlate:', e);
                return { success: false, error: e.message };
            }
        },

        /**
         * ⭐ ВЛАДЕЕТ ЛИ ИГРОК ЭТИМ НОМЕРОМ.
         */
        isPlateOwnedByPlayer(plateNumber) {
            try {
                const state = getState();
                if (!state) return false;
                migratePlayerPlates(state);
                const clean = formatPlateString(plateNumber);
                return state.player.platesInventory.some((p) => p && p.number === clean);
            } catch (e) {
                return false;
            }
        },

        /**
         * ⭐ ЗАНЯТ ЛИ НОМЕР ДРУГИМ ИГРОКОМ (по Firestore).
         * Асинхронная — проверяет удалённую коллекцию registered_plates.
         * @returns {Promise<bool>}
         */
        async isPlateTaken(plateNumber) {
            try {
                const clean = formatPlateString(plateNumber);
                if (!clean || clean.includes('ТРАНЗИТ')) return false;

                if (window.FB_Bridge?.Plates?.isPlateAvailable) {
                    const available = await window.FB_Bridge.Plates.isPlateAvailable(clean);
                    return !available;
                }
                return false;
            } catch (e) {
                return false;
            }
        },

        /**
         * ⭐ УСТАНОВЛЕННЫЙ НОМЕР НА КОНКРЕТНОЙ МАШИНЕ.
         */
        getPlateOnCar(car) {
            try {
                const state = getState();
                if (!state || !car) return null;
                migratePlayerPlates(state);
                const carUid = car.uid || car.id;
                return _findPlateOnCar(state, carUid);
            } catch (e) {
                return null;
            }
        },

        /**
         * ⭐ КОЛИЧЕСТВО СВОБОДНЫХ НОМЕРОВ.
         */
        getFreePlatesCount() {
            try {
                return this.getFreePlates().length;
            } catch (e) {
                return 0;
            }
        },

        /**
         * ⭐ Синхронизация legacy state.ownedPlates (вызывается из app.js при загрузке сейва).
         */
        syncLegacyOwnedPlates() {
            try {
                const state = getState();
                if (!state) return;
                migratePlayerPlates(state);
                persistState();
                devLog('log', 'Legacy ownedPlates синхронизирован');
            } catch (e) {
                console.error('[PlatesManager] Ошибка syncLegacyOwnedPlates:', e);
            }
        },

        /**
         * ⭐ СТАТИСТИКА (для DEV-вкладки).
         */
        getStats() {
            try {
                const state = getState();
                if (!state?.player?.platesInventory) {
                    return { total: 0, inventory: 0, installed: 0, on_sale: 0, archived: 0 };
                }
                migratePlayerPlates(state);
                const all = state.player.platesInventory;
                return {
                    total: all.length,
                    inventory: all.filter(p => p.status === 'inventory').length,
                    installed: all.filter(p => p.status === 'installed').length,
                    on_sale: all.filter(p => p.status === 'on_sale').length,
                    archived: all.filter(p => p.status === 'archived').length,
                    legacyOwnedPlatesCount: (state.ownedPlates || []).length
                };
            } catch (e) {
                return { error: e.message };
            }
        },

        /**
         * ⭐ ПОЛНАЯ ОЧИСТКА ИНВЕНТАРЯ (для DEV).
         */
        _clearAllForDev() {
            try {
                const state = getState();
                if (!state?.player) return false;
                state.player.platesInventory = [];
                state.ownedPlates = [];
                persistState();
                devLog('warn', 'Все номера очищены (DEV)');
                return true;
            } catch (e) {
                return false;
            }
        }
    };

    // ========================================================
    // АВТОИНИЦИАЛИЗАЦИЯ
    // ========================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => PlatesManager.init(), 500);
        });
    } else {
        setTimeout(() => PlatesManager.init(), 500);
    }

    // ========================================================
    // ЭКСПОРТ В WINDOW
    // ========================================================
    window.PlatesManager = PlatesManager;

    console.log('[🏷️ plates-manager v2.0.0] Единый менеджер номеров загружен. API: addPlate, getFreePlates, attachPlateToCar, detachPlateFromCar ✓');
})();
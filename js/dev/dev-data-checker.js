// ========================================================
// js/dev/dev-data-checker.js — DEV ПРОВЕРКА ДАННЫХ (v1.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.1.0:
//   - Расширенные проверки целостности сейва
//   - Проверка мёртвых лотов, диалогов-сирот
//   - Проверка отрицательного износа инструментов
//   - Кнопки «Починить» рядом с проблемами
// ========================================================

const DevDataChecker = {

    checks: [
        // ═══════════════ CORE DATA ═══════════════
        { path: 'CAR_DATABASE',                          label: 'База автотехники (CAR_DATABASE)',          expectedType: 'object', critical: true },
        { path: 'CAR_FALLBACKS_BY_CATEGORY',             label: 'Фолбеки картинок по категориям',           expectedType: 'object', critical: false },
        { path: 'BANK_EXCHANGE_RATES',                   label: 'Курсы валют Во-Банка',                     expectedType: 'object', critical: true },
        { path: 'GAME_METADATA',                         label: 'Метаданные игры',                          expectedType: 'object', critical: false },
        { path: 'WHEEL_CONFIG',                          label: 'Конфиг вилспина',                          expectedType: 'object', critical: false },
        { path: 'SUPER_SPIN_TIERS',                      label: 'Призы СуперВилспина',                      expectedType: 'object', critical: false },

        // ═══════════════ ECONOMY & HOUSING ═══════════════
        { path: 'HOUSING_LIST',                          label: 'Каталог недвижимости',                     expectedType: 'array',  minLength: 5, critical: true },
        { path: 'BUSINESS_DATA',                         label: 'Каталог бизнесов',                         expectedType: 'array',  minLength: 5, critical: true },
        { path: 'SHOP_CATALOG',                          label: 'Каталог Авто-Маркета',                     expectedType: 'object', critical: true },
        { path: 'DAILY_REWARDS_CONFIG',                  label: 'Ежедневные награды',                       expectedType: 'array',  minLength: 5, critical: false },
        { path: 'BANK_DEPOSIT_CONFIG',                   label: 'Конфиг вкладов',                           expectedType: 'object', critical: false },
        { path: 'APP_ACCESS_CONFIG',                     label: 'Разблокировки приложений',                 expectedType: 'object', critical: false },

        // ═══════════════ ACTIVITIES & QUESTS ═══════════════
        { path: 'PORT_AUCTIONS_CATALOG',                 label: 'Каталог контейнеров Порта',                expectedType: 'array',  minLength: 3, critical: true },
        { path: 'PORT_BROKER_PROFILES',                  label: 'Профили брокеров Порта',                   expectedType: 'array',  minLength: 1, critical: false },
        { path: 'STORAGE_WARS_CONTAINERS',               label: 'Каталог Storage Wars',                     expectedType: 'array',  minLength: 2, critical: true },
        { path: 'STORAGE_WARS_BOTS',                     label: 'Боты Storage Wars',                        expectedType: 'array',  minLength: 2, critical: false },
        { path: 'OBD_ERRORS',                            label: 'Каталог OBD-ошибок',                       expectedType: 'array',  minLength: 5, critical: true },
        { path: 'DAILY_QUESTS_POOL',                     label: 'Пул ежедневных заданий',                   expectedType: 'array',  minLength: 3, critical: false },
        { path: 'NOTEPAD_CAREER_GOALS',                  label: 'Цели карьеры в блокноте',                  expectedType: 'array',  minLength: 3, critical: false },
        { path: 'DIETS',                                 label: 'Каталог рационов питания',                 expectedType: 'array',  minLength: 3, critical: false },
        { path: 'LIFE_ACTIVITIES',                       label: 'Каталог активностей',                      expectedType: 'array',  minLength: 2, critical: false },
        { path: 'STREET_CHAT_LOG',                       label: 'Лог чата авторынка',                       expectedType: 'array',  minLength: 2, critical: false },

        // ═══════════════ MARKET & DEALS ═══════════════
        { path: 'BUYERS_CATALOG',                        label: 'Каталог покупателей',                      expectedType: 'object', critical: true },
        { path: 'MARKET_NEWS_EVENTS',                    label: 'Новости авторынка',                        expectedType: 'array',  minLength: 3, critical: false },
        { path: 'DIALOGUES_DATABASE',                    label: 'Диалоги (торг)',                           expectedType: 'object', critical: false },
        { path: 'STREET_EVENTS_DATA',                    label: 'Уличные мероприятия',                      expectedType: 'array',  minLength: 1, critical: false },

        // ═══════════════ SYNDICATE ═══════════════
        { path: 'PODKLYUCH_CONTRACT_TEMPLATES',          label: 'Шаблоны контрактов ПодКлюч',               expectedType: 'array',  minLength: 3, critical: false },
        { path: 'BUYER_BACKFIRE_EVENTS',                 label: 'События-претензии покупателей',            expectedType: 'array',  minLength: 1, critical: false },
        { path: 'SELLER_ADS_PHRASES',                    label: 'Фразы продавцов',                          expectedType: 'array',  minLength: 3, critical: false },

        // ═══════════════ CARS BY CATEGORY ═══════════════
        { path: 'CARS_CATEGORY_ECONOMY',                 label: 'Машины: Эконом',                           expectedType: 'array',  minLength: 10, critical: true },
        { path: 'CARS_CATEGORY_SCOOTER',                 label: 'Машины: Скутеры',                          expectedType: 'array',  minLength: 2,  critical: false },
        { path: 'CARS_CATEGORY_MOTO',                    label: 'Машины: Мото',                             expectedType: 'array',  minLength: 3,  critical: false },
        { path: 'CARS_CATEGORY_ATV',                     label: 'Машины: Квадро',                           expectedType: 'array',  minLength: 2,  critical: false },
        { path: 'CARS_CATEGORY_COMFORT',                 label: 'Машины: Комфорт',                          expectedType: 'array',  minLength: 5,  critical: true },
        { path: 'CARS_CATEGORY_PREMIUM',                 label: 'Машины: Премиум',                          expectedType: 'array',  minLength: 5,  critical: false },
        { path: 'CARS_CATEGORY_HYPER',                   label: 'Машины: Гиперкары',                        expectedType: 'array',  minLength: 3,  critical: false },
        { path: 'CARS_CATEGORY_TRUCK',                   label: 'Машины: Грузовики',                        expectedType: 'array',  minLength: 2,  critical: false },
        { path: 'CARS_CATEGORY_YACHT',                   label: 'Машины: Яхты',                             expectedType: 'array',  minLength: 2,  critical: false },

        // ═══════════════ STATE (RUNTIME) ═══════════════
        { path: 'state',                                 label: 'Глобальный state игры',                    expectedType: 'object', critical: true },
        { path: 'state.player',                          label: 'state.player (профиль)',                   expectedType: 'object', critical: true },
        { path: 'state.garage',                          label: 'state.garage (гараж)',                     expectedType: 'array',  critical: true },
        { path: 'state.businesses',                      label: 'state.businesses (бизнесы)',               expectedType: 'array',  critical: true },
        { path: 'state.marketFeed',                      label: 'state.marketFeed (лента рынка)',           expectedType: 'array',  critical: true },
        { path: 'state.p2pMarketListings',               label: 'state.p2pMarketListings (P2P)',            expectedType: 'array',  critical: false },
        { path: 'state.player.phoneMessages',            label: 'Сообщения телефона',                       expectedType: 'array',  critical: false },
        { path: 'state.player.mailbox',                  label: 'Почтовый ящик',                            expectedType: 'array',  critical: false },
        { path: 'state.player.dailyQuests',              label: 'Ежедневные квесты игрока',                 expectedType: 'array',  critical: false },
        { path: 'state.player.unlockedApps',             label: 'Разблокированные приложения',              expectedType: 'array',  critical: false },
        { path: 'state.player.tools',                    label: 'Инструменты игрока',                       expectedType: 'object', critical: false },
        { path: 'state.player.ownedHouses',              label: 'Купленные дома',                           expectedType: 'array',  critical: false },

        // ═══════════════ APP-МОДУЛИ ═══════════════
        { path: 'PhoneManager',                          label: 'PhoneManager',                             expectedType: 'object', critical: true },
        { path: 'ModalManager',                          label: 'ModalManager',                             expectedType: 'object', critical: true },
        { path: 'PhoneBusiness',                         label: 'PhoneBusiness (бизнес)',                   expectedType: 'object', critical: true },
        { path: 'AppPort',                               label: 'AppPort (Порт)',                           expectedType: 'object', critical: false },
        { path: 'AppM',                                  label: 'AppM (Сеть M+)',                           expectedType: 'object', critical: false },
        { path: 'AppPost',                               label: 'AppPost (Почта)',                          expectedType: 'object', critical: false },
        { path: 'AppBarn',                               label: 'AppBarn (Сараи)',                          expectedType: 'object', critical: false },
        { path: 'PhoneHousing',                          label: 'PhoneHousing (Недвижимость)',              expectedType: 'object', critical: false },
        { path: 'AppBank',                               label: 'AppBank (Во-Банк)',                        expectedType: 'object', critical: false },
        { path: 'AppGosuslugi',                          label: 'AppGosuslugi (Госуслуги)',                 expectedType: 'object', critical: false },
        { path: 'AppRadar',                              label: 'AppRadar (Радар ДПС)',                     expectedType: 'object', critical: false },
        { path: 'AppDarknet',                            label: 'AppDarknet (Даркнет)',                     expectedType: 'object', critical: false },
        { path: 'AppSyndicate',                          label: 'AppSyndicate (Синдикат)',                  expectedType: 'object', critical: false },
        { path: 'PhoneMedia',                            label: 'PhoneMedia (Радио/Фортуна)',               expectedType: 'object', critical: false },
        { path: 'PhoneRacing',                           label: 'PhoneRacing (Стрит)',                      expectedType: 'object', critical: false },
        { path: 'AppDev',                                label: 'AppDev (DEV)',                             expectedType: 'object', critical: false },
        { path: 'DevStudio',                             label: 'DevStudio (Авто-студия)',                  expectedType: 'object', critical: false },
        { path: 'ThemeManager',                          label: 'ThemeManager (Скины)',                     expectedType: 'object', critical: false },
        { path: 'AudioFx',                               label: 'AudioFx (Звук)',                           expectedType: 'object', critical: false },
        { path: 'DevLogger',                             label: 'DevLogger (Лог событий)',                  expectedType: 'object', critical: false },

        // ═══════════════ КЛЮЧЕВЫЕ ФУНКЦИИ ═══════════════
        { path: 'getTotalGarageSlots',                   label: 'Функция: слоты гаража',                    expectedType: 'function', critical: true },
        { path: 'getPlayerHousingCapabilities',          label: 'Функция: возможности жилья',               expectedType: 'function', critical: true },
        { path: 'recalculateCarMarketValue',             label: 'Функция: пересчёт цены авто',              expectedType: 'function', critical: true },
        { path: 'saveState',                             label: 'Функция: сохранение',                      expectedType: 'function', critical: true },
        { path: 'updateHeaderUI',                        label: 'Функция: обновление HUD',                  expectedType: 'function', critical: true },
        { path: 'resetGameData',                         label: 'Функция: сброс прогресса',                 expectedType: 'function', critical: true }
    ],

    _getByPath(path) {
        if (!path) return undefined;
        const parts = path.split('.');
        let cur = window;
        for (let i = 0; i < parts.length; i++) {
            if (cur === undefined || cur === null) return undefined;
            cur = cur[parts[i]];
        }
        return cur;
    },

    _checkOne(entry) {
        const val = this._getByPath(entry.path);
        const exists = val !== undefined && val !== null;

        let status = 'ok';
        let actualType = exists ? (Array.isArray(val) ? 'array' : typeof val) : 'undefined';
        let lengthInfo = '';
        let note = '';

        if (!exists) {
            status = 'missing';
            note = 'не загружено';
        } else if (entry.expectedType === 'array') {
            if (actualType !== 'array') {
                status = 'wrong-type';
                note = `ожидался array, получен ${actualType}`;
            } else {
                lengthInfo = `[${val.length}]`;
                if (entry.minLength && val.length < entry.minLength) {
                    status = 'empty';
                    note = `мало элементов (${val.length} < ${entry.minLength})`;
                } else if (val.length === 0) {
                    status = 'empty';
                    note = 'пустой массив';
                }
            }
        } else if (entry.expectedType === 'object') {
            if (actualType !== 'object') {
                status = 'wrong-type';
                note = `ожидался object, получен ${actualType}`;
            } else {
                const keysCount = Object.keys(val).length;
                lengthInfo = `{${keysCount}}`;
                if (keysCount === 0) {
                    status = 'empty';
                    note = 'пустой объект';
                }
            }
        } else if (entry.expectedType === 'function') {
            if (actualType !== 'function') {
                status = 'wrong-type';
                note = `ожидалась function, получен ${actualType}`;
            }
        }

        return { entry, exists, actualType, lengthInfo, status, note, value: val };
    },

    // ⭐ РАСШИРЕННЫЕ ПРОВЕРКИ ЦЕЛОСТНОСТИ СЕЙВА
    runIntegrityChecks() {
        const issues = [];
        const s = window.state;
        if (!s) return issues;

        // 1. Мёртвые лоты на рынке (unavailable, но всё ещё в ленте)
        if (Array.isArray(s.marketFeed)) {
            const dead = s.marketFeed.filter(c => c && c.unavailable === true);
            if (dead.length > 0) {
                issues.push({
                    id: 'dead_market_lots',
                    severity: 'warn',
                    title: `Мёртвые лоты на рынке: ${dead.length}`,
                    desc: 'Лоты с флагом unavailable всё ещё висят в ленте.',
                    fix: () => {
                        s.marketFeed = s.marketFeed.filter(c => c && c.unavailable !== true);
                        if (typeof renderMarketFeed === 'function') renderMarketFeed();
                    }
                });
            }
        }

        // 2. Диалоги-сироты в телефоне
        if (Array.isArray(s.player?.phoneMessages) && Array.isArray(s.salesLot)) {
            const totalLots = s.salesLot.length;
            const orphans = s.player.phoneMessages.filter(m =>
                m && m.category === 'buyers' && typeof m.carIndex === 'number' && (m.carIndex < 0 || m.carIndex >= totalLots)
            );
            if (orphans.length > 0) {
                issues.push({
                    id: 'orphan_dialogs',
                    severity: 'warn',
                    title: `Диалоги-сироты: ${orphans.length}`,
                    desc: 'Сообщения с несуществующим индексом лота.',
                    fix: () => {
                        s.player.phoneMessages = s.player.phoneMessages.filter(m =>
                            !(m && m.category === 'buyers' && typeof m.carIndex === 'number' && (m.carIndex < 0 || m.carIndex >= totalLots))
                        );
                    }
                });
            }
        }

        // 3. Отрицательный износ инструментов
        if (s.player?.toolsWear && typeof s.player.toolsWear === 'object') {
            const badTools = [];
            Object.keys(s.player.toolsWear).forEach(k => {
                const v = s.player.toolsWear[k];
                if (typeof v !== 'number' || v < 0) badTools.push(k);
            });
            if (badTools.length > 0) {
                issues.push({
                    id: 'bad_tools_wear',
                    severity: 'warn',
                    title: `Некорректный износ приборов: ${badTools.length}`,
                    desc: `Ключи: ${badTools.join(', ')}`,
                    fix: () => {
                        badTools.forEach(k => { s.player.toolsWear[k] = 0; });
                    }
                });
            }
        }

        // 4. Дубликаты car.uid в гараже
        if (Array.isArray(s.garage)) {
            const seen = new Map();
            const dupes = [];
            s.garage.forEach(c => {
                if (!c || !c.uid) return;
                if (seen.has(c.uid)) dupes.push(c.uid);
                else seen.set(c.uid, true);
            });
            if (dupes.length > 0) {
                issues.push({
                    id: 'duplicate_car_uids',
                    severity: 'error',
                    title: `Дубликаты UID в гараже: ${dupes.length}`,
                    desc: 'У нескольких машин одинаковый uid — это ломает поиск.',
                    fix: () => {
                        const usedUids = new Set();
                        s.garage.forEach(c => {
                            if (!c) return;
                            if (!c.uid || usedUids.has(c.uid)) {
                                c.uid = 'car_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
                            }
                            usedUids.add(c.uid);
                        });
                    }
                });
            }
        }

        // 5. P2P-лоты без itemData
        if (Array.isArray(s.p2pMarketListings)) {
            const badLots = s.p2pMarketListings.filter(l => !l || !l.itemData);
            if (badLots.length > 0) {
                issues.push({
                    id: 'broken_p2p_lots',
                    severity: 'warn',
                    title: `Битые P2P-лоты: ${badLots.length}`,
                    desc: 'Лоты без объекта itemData.',
                    fix: () => {
                        s.p2pMarketListings = s.p2pMarketListings.filter(l => l && l.itemData);
                    }
                });
            }
        }

        // 6. Цена в объявлении <= 0
        if (Array.isArray(s.marketFeed)) {
            const badPrice = s.marketFeed.filter(c => c && (typeof c.price !== 'number' || c.price <= 0));
            if (badPrice.length > 0) {
                issues.push({
                    id: 'bad_prices',
                    severity: 'warn',
                    title: `Некорректные цены: ${badPrice.length}`,
                    desc: 'Лоты с ценой 0 или отрицательной.',
                    fix: () => {
                        s.marketFeed = s.marketFeed.filter(c => c && typeof c.price === 'number' && c.price > 0);
                    }
                });
            }
        }

        // 7. Отрицательные ресурсы игрока
        if (s.player) {
            const badRes = [];
            ['cash', 'stars', 'fuel', 'connections', 'expressTickets', 'karma', 'hunger', 'mood', 'level'].forEach(k => {
                const v = s.player[k];
                if (typeof v === 'number' && v < 0) badRes.push(k);
            });
            if (badRes.length > 0) {
                issues.push({
                    id: 'negative_resources',
                    severity: 'error',
                    title: `Отрицательные ресурсы: ${badRes.length}`,
                    desc: `Ключи: ${badRes.join(', ')}`,
                    fix: () => {
                        badRes.forEach(k => { s.player[k] = 0; });
                        if (typeof updateHeaderUI === 'function') updateHeaderUI();
                    }
                });
            }
        }

        // 8. Флаг сброса застрял
        if (window.__IS_RESETTING__ === true) {
            issues.push({
                id: 'stuck_reset_flag',
                severity: 'error',
                title: '__IS_RESETTING__ = true',
                desc: 'Флаг сброса не сбросился после перезагрузки. saveState заблокирован.',
                fix: () => { window.__IS_RESETTING__ = false; }
            });
        }

        return issues;
    },

    runAllChecks() {
        const results = this.checks.map(c => this._checkOne(c));
        const stats = {
            total: results.length,
            ok: results.filter(r => r.status === 'ok').length,
            empty: results.filter(r => r.status === 'empty').length,
            missing: results.filter(r => r.status === 'missing').length,
            wrongType: results.filter(r => r.status === 'wrong-type').length,
            criticalMissing: results.filter(r => r.entry.critical && (r.status === 'missing' || r.status === 'wrong-type')).length
        };
        return { results, stats };
    },

    render(container) {
        if (!container) return;

        const { results, stats } = this.runAllChecks();
        const integrityIssues = this.runIntegrityChecks();

        const order = { 'missing': 0, 'wrong-type': 1, 'empty': 2, 'ok': 3 };
        const sorted = [...results].sort((a, b) => {
            const so = (order[a.status] || 9) - (order[b.status] || 9);
            if (so !== 0) return so;
            if (a.entry.critical !== b.entry.critical) return a.entry.critical ? -1 : 1;
            return a.entry.label.localeCompare(b.entry.label);
        });

        const statusMeta = {
            'ok':         { color: 'var(--green)',  bg: 'rgba(0,230,118,0.10)',  border: 'rgba(0,230,118,0.35)', icon: '✓',  label: 'OK' },
            'empty':      { color: 'var(--amber)',  bg: 'rgba(255,179,0,0.10)',  border: 'rgba(255,179,0,0.35)', icon: '⚠', label: 'ПУСТО' },
            'missing':    { color: 'var(--red)',    bg: 'rgba(255,51,102,0.12)', border: 'rgba(255,51,102,0.4)', icon: '✗',  label: 'НЕТ' },
            'wrong-type': { color: '#f97316',       bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.4)', icon: '!',  label: 'ТИП' }
        };

        let overallText = 'Все данные загружены корректно';
        let overallColor = 'var(--green)';

        if (stats.criticalMissing > 0) {
            overallText = `⚠️ ${stats.criticalMissing} критичных данных отсутствует!`;
            overallColor = 'var(--red)';
        } else if (integrityIssues.length > 0) {
            overallText = `⚠️ Найдено проблем в сейве: ${integrityIssues.length}`;
            overallColor = 'var(--amber)';
        } else if (stats.missing > 0 || stats.wrongType > 0) {
            overallText = `${stats.missing + stats.wrongType} некритичных элементов не загружено`;
            overallColor = 'var(--amber)';
        } else if (stats.empty > 0) {
            overallText = `${stats.empty} пустых массивов/объектов`;
            overallColor = 'var(--amber)';
        }

        // Рендер проблем целостности
        let integrityHtml = '';
        if (integrityIssues.length > 0) {
            integrityHtml = `
                <div class="glass-card mb-2 p-2" style="background:rgba(255,179,0,0.06); border-color:rgba(255,179,0,0.35);">
                    <div class="flex-between mb-2">
                        <b class="text-xs color-amber">⚠️ Проблемы целостности сейва: ${integrityIssues.length}</b>
                        <button onclick="DevDataChecker.fixAllIntegrity()" class="btn btn-green btn-auto btn-sm" style="font-size:8.5px; padding:2px 8px;">
                            <i class="fa-solid fa-wrench"></i> Починить всё
                        </button>
                    </div>
                    <div class="space-y-1">
                        ${integrityIssues.map(issue => `
                            <div class="p-2" style="background:#050914; border-radius:6px; border-left:3px solid ${issue.severity === 'error' ? 'var(--red)' : 'var(--amber)'};">
                                <div class="flex-between mb-1">
                                    <b class="text-xs ${issue.severity === 'error' ? 'color-red' : 'color-amber'}">${issue.title}</b>
                                    <button onclick="DevDataChecker.fixIssue('${issue.id}')" class="btn btn-dark btn-auto btn-sm" style="font-size:8px; padding:1px 6px;">
                                        <i class="fa-solid fa-wrench"></i> Fix
                                    </button>
                                </div>
                                <div class="sub-label" style="font-size:8.5px;">${issue.desc}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            integrityHtml = `
                <div class="glass-card mb-2 p-2" style="background:rgba(0,230,118,0.06); border-color:rgba(0,230,118,0.3);">
                    <b class="text-xs color-green">✓ Проблем целостности сейва не найдено</b>
                </div>
            `;
        }

        let rowsHtml = sorted.map(r => {
            const meta = statusMeta[r.status] || statusMeta['ok'];
            const critBadge = r.entry.critical
                ? `<span class="tag-badge bg-tag-red" style="font-size:7px; padding:1px 5px;">CRIT</span>`
                : '';

            return `
                <div class="glass-card p-2 mb-1" style="background:${meta.bg}; border:1px solid ${meta.border};">
                    <div class="flex-between" style="align-items:flex-start;">
                        <div style="flex:1; min-width:0;">
                            <div class="flex-gap" style="align-items:center; gap:5px;">
                                <span style="color:${meta.color}; font-weight:900; font-size:12px; min-width:14px; text-align:center;">${meta.icon}</span>
                                <b class="text-xs" style="font-size:10.5px; color:#fff;">${r.entry.label}</b>
                                ${critBadge}
                            </div>
                            <div class="sub-label mt-1" style="font-size:8px; font-family:monospace; color:#94a3b8;">
                                window.${r.entry.path} ${r.lengthInfo}
                            </div>
                            ${r.note ? `<div class="sub-label mt-1" style="font-size:8.5px; color:${meta.color};">${r.note}</div>` : ''}
                        </div>
                        <span class="tag-badge" style="font-size:7.5px; background:${meta.bg}; color:${meta.color}; border:1px solid ${meta.border};">
                            ${meta.label}
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.12), #090e18); border-color: rgba(0,242,254,0.35);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan" style="font-size:12px;">
                        <i class="fa-solid fa-magnifying-glass-chart mr-1"></i> Проверка данных игры
                    </b>
                    <button onclick="DevDataChecker.refresh()" class="btn btn-dark btn-auto btn-sm" style="font-size:9px;">
                        <i class="fa-solid fa-rotate mr-1"></i> Обновить
                    </button>
                </div>
                <div class="sub-label" style="font-size:9px;">Проверяет глобальные массивы, объекты и целостность сейва.</div>
            </div>

            <div class="glass-card mb-2 p-3 text-center" style="background:#050914; border:1px solid ${overallColor};">
                <div style="color:${overallColor}; font-weight:900; font-size:13px;">${overallText}</div>
                <div class="grid-4 mt-2" style="gap:4px;">
                    <div class="p-1" style="background:rgba(0,230,118,0.1); border-radius:6px; border:1px solid rgba(0,230,118,0.3);">
                        <div class="sub-label" style="font-size:7px;">OK</div>
                        <div class="color-green font-bold" style="font-size:14px;">${stats.ok}</div>
                    </div>
                    <div class="p-1" style="background:rgba(255,179,0,0.1); border-radius:6px; border:1px solid rgba(255,179,0,0.3);">
                        <div class="sub-label" style="font-size:7px;">ПУСТО</div>
                        <div class="color-amber font-bold" style="font-size:14px;">${stats.empty}</div>
                    </div>
                    <div class="p-1" style="background:rgba(255,51,102,0.1); border-radius:6px; border:1px solid rgba(255,51,102,0.3);">
                        <div class="sub-label" style="font-size:7px;">НЕТ</div>
                        <div class="color-red font-bold" style="font-size:14px;">${stats.missing}</div>
                    </div>
                    <div class="p-1" style="background:rgba(249,115,22,0.1); border-radius:6px; border:1px solid rgba(249,115,22,0.3);">
                        <div class="sub-label" style="font-size:7px;">ТИП</div>
                        <div style="color:#f97316; font-weight:900; font-size:14px;">${stats.wrongType}</div>
                    </div>
                </div>
                <div class="sub-label mt-2" style="font-size:8px;">
                    Проверок: <b>${stats.total}</b> | Критичных провалов: <b class="${stats.criticalMissing > 0 ? 'color-red' : 'color-green'}">${stats.criticalMissing}</b>
                </div>
            </div>

            ${integrityHtml}

            <div class="grid-2 mb-2" style="gap:4px;">
                <button onclick="DevDataChecker.exportReportToConsole()" class="btn btn-dark btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-terminal mr-1"></i> Отчёт в консоль
                </button>
                <button onclick="DevDataChecker.exportReportToClipboard()" class="btn btn-cyan btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-copy mr-1"></i> Скопировать
                </button>
            </div>

            <div class="space-y-1">
                ${rowsHtml}
            </div>
        `;
    },

    // ⭐ Универсальный fix через перезапуск integrity-проверки
    fixIssue(issueId) {
        const issues = this.runIntegrityChecks();
        const issue = issues.find(i => i.id === issueId);
        if (!issue || typeof issue.fix !== 'function') {
            if (typeof showToast === 'function') showToast('Не удалось починить');
            return;
        }
        try {
            issue.fix();
            if (typeof saveState === 'function') saveState();
            if (typeof showToast === 'function') showToast('✓ Проблема устранена');
            if (typeof playSound === 'function') playSound('win');
            this.refresh();
        } catch (e) {
            console.error('[DevDataChecker] Ошибка fix:', e);
            if (typeof showToast === 'function') showToast('❌ Ошибка при починке');
        }
    },

    fixAllIntegrity() {
        const issues = this.runIntegrityChecks();
        if (issues.length === 0) {
            if (typeof showToast === 'function') showToast('Нечего чинить');
            return;
        }
        let fixedCount = 0;
        issues.forEach(issue => {
            try {
                if (typeof issue.fix === 'function') {
                    issue.fix();
                    fixedCount++;
                }
            } catch (e) {
                console.warn('[DevDataChecker] Ошибка fixAll:', e);
            }
        });
        if (typeof saveState === 'function') saveState();
        if (typeof showToast === 'function') showToast(`✓ Починено проблем: ${fixedCount}`);
        if (typeof playSound === 'function') playSound('win');
        this.refresh();
    },

    refresh() {
        const container = document.getElementById('devDataCheckContainer');
        if (container) this.render(container);
    },

    exportReportToConsole() {
        const { results, stats } = this.runAllChecks();
        const integrity = this.runIntegrityChecks();

        console.group('%c[DEV DATA CHECK] Отчёт', 'color:#00f2fe; font-weight:900;');
        console.log(`Всего проверок: ${stats.total} | OK: ${stats.ok} | Пусто: ${stats.empty} | Нет: ${stats.missing} | Тип: ${stats.wrongType} | Крит: ${stats.criticalMissing}`);
        console.log(`Проблем целостности: ${integrity.length}`);
        results.filter(r => r.status !== 'ok').forEach(r => {
            console.log(`  ${r.entry.critical ? '🔴' : '⚪'} ${r.entry.path} — ${r.entry.label} (${r.status}${r.note ? ': ' + r.note : ''})`);
        });
        integrity.forEach(i => console.log(`  [${i.severity}] ${i.title} — ${i.desc}`));
        console.groupEnd();
        if (typeof showToast === 'function') showToast('📋 Отчёт выведен в консоль');
    },

    exportReportToClipboard() {
        const { results, stats } = this.runAllChecks();
        const integrity = this.runIntegrityChecks();
        let text = `=== DEV DATA CHECK ===\n`;
        text += `Всего: ${stats.total} | OK: ${stats.ok} | Пусто: ${stats.empty} | Нет: ${stats.missing} | Тип: ${stats.wrongType} | Крит: ${stats.criticalMissing}\n`;
        text += `Проблем целостности: ${integrity.length}\n\n`;
        results.filter(r => r.status !== 'ok').forEach(r => {
            text += `${r.entry.critical ? '[CRIT]' : '[--]'} ${r.entry.path} — ${r.entry.label} (${r.status}${r.note ? ': ' + r.note : ''})\n`;
        });
        integrity.forEach(i => text += `[${i.severity}] ${i.title} — ${i.desc}\n`);

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                if (typeof showToast === 'function') showToast('📋 Отчёт скопирован');
            }).catch(() => this._fallbackCopy(text));
        } else {
            this._fallbackCopy(text);
        }
    },

    _fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); if (typeof showToast === 'function') showToast('📋 Скопировано'); }
        catch (e) { if (typeof showToast === 'function') showToast('❌ Не удалось'); }
        document.body.removeChild(ta);
    }
};

window.DevDataChecker = DevDataChecker;
console.log('[🔍 dev-data-checker v1.1.0] Расширенная проверка + починка ✓');
// ========================================================
// js/dev-data-checker.js — DEV ПРОВЕРКА ДАННЫХ (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ Утилита для диагностики: показывает статус всех
//   глобальных массивов и объектов игры, критичных для
//   работы приложения. Красным — отсутствующие, жёлтым —
//   пустые, зелёным — ок. Работает внутри DEV-терминала.
// ========================================================

const DevDataChecker = {

    // --------------------------------------------------------
    // РЕЕСТР ПРОВЕРЯЕМЫХ ДАННЫХ
    // Каждая запись: { path, label, expectedType, minLength, critical }
    //   path — путь в window (строка 'PORT_AUCTIONS_CATALOG' или 'state.businesses')
    //   label — человекочитаемое имя
    //   expectedType — 'array' | 'object' | 'function' | 'any'
    //   minLength — минимальная длина (для array), иначе undefined
    //   critical — true, если отсутствие ломает ключевой функционал
    // --------------------------------------------------------
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

        // ═══════════════ КЛЮЧЕВЫЕ ФУНКЦИИ ═══════════════
        { path: 'getTotalGarageSlots',                   label: 'Функция: слоты гаража',                    expectedType: 'function', critical: true },
        { path: 'getPlayerHousingCapabilities',          label: 'Функция: возможности жилья',               expectedType: 'function', critical: true },
        { path: 'recalculateCarMarketValue',             label: 'Функция: пересчёт цены авто',              expectedType: 'function', critical: true },
        { path: 'findCarTemplateByName',                 label: 'Функция: поиск шаблона по имени',          expectedType: 'function', critical: false },
        { path: 'getRandomCarImage',                     label: 'Функция: случайная картинка авто',         expectedType: 'function', critical: false },
        { path: 'buildCarImageAttrs',                    label: 'Функция: каскад картинок',                 expectedType: 'function', critical: false },
        { path: 'saveState',                             label: 'Функция: сохранение',                      expectedType: 'function', critical: true },
        { path: 'updateHeaderUI',                        label: 'Функция: обновление HUD',                  expectedType: 'function', critical: true },
        { path: 'showToast',                             label: 'Функция: тосты',                           expectedType: 'function', critical: false },
        { path: 'logBankTransaction',                    label: 'Функция: лог транзакций',                  expectedType: 'function', critical: false }
    ],

    // --------------------------------------------------------
    // УТИЛИТА: получение значения по пути 'state.player.name'
    // --------------------------------------------------------
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

    // --------------------------------------------------------
    // ПРОВЕРКА ОДНОЙ ЗАПИСИ
    // --------------------------------------------------------
    _checkOne(entry) {
        const val = this._getByPath(entry.path);
        const exists = val !== undefined && val !== null;

        let status = 'ok';      // 'ok' | 'empty' | 'missing' | 'wrong-type'
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

        return {
            entry,
            exists,
            actualType,
            lengthInfo,
            status,
            note,
            value: val
        };
    },

    // --------------------------------------------------------
    // ГЛАВНАЯ ПРОВЕРКА
    // --------------------------------------------------------
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

    // --------------------------------------------------------
    // РЕНДЕР ДЛЯ DEV (вызывается из phone-dev.js)
    // --------------------------------------------------------
    render(container) {
        if (!container) return;

        const { results, stats } = this.runAllChecks();

        // Сортируем: сначала проблемные, потом по критичности, потом по алфавиту
        const order = { 'missing': 0, 'wrong-type': 1, 'empty': 2, 'ok': 3 };
        const sorted = [...results].sort((a, b) => {
            const so = (order[a.status] || 9) - (order[b.status] || 9);
            if (so !== 0) return so;
            if (a.entry.critical !== b.entry.critical) return a.entry.critical ? -1 : 1;
            return a.entry.label.localeCompare(b.entry.label);
        });

        // Цвета статусов
        const statusMeta = {
            'ok':         { color: 'var(--green)',  bg: 'rgba(0,230,118,0.10)',  border: 'rgba(0,230,118,0.35)', icon: '✓',  label: 'OK' },
            'empty':      { color: 'var(--amber)',  bg: 'rgba(255,179,0,0.10)',  border: 'rgba(255,179,0,0.35)', icon: '⚠', label: 'ПУСТО' },
            'missing':    { color: 'var(--red)',    bg: 'rgba(255,51,102,0.12)', border: 'rgba(255,51,102,0.4)', icon: '✗',  label: 'НЕТ' },
            'wrong-type': { color: '#f97316',       bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.4)', icon: '!',  label: 'ТИП' }
        };

        // Общая оценка
        let overallStatus = 'ok';
        let overallText = 'Всё загружено корректно';
        let overallColor = 'var(--green)';

        if (stats.criticalMissing > 0) {
            overallStatus = 'error';
            overallText = `⚠️ ${stats.criticalMissing} критичных данных не загружено!`;
            overallColor = 'var(--red)';
        } else if (stats.missing > 0 || stats.wrongType > 0) {
            overallStatus = 'warning';
            overallText = `${stats.missing + stats.wrongType} некритичных элементов не загружено`;
            overallColor = 'var(--amber)';
        } else if (stats.empty > 0) {
            overallStatus = 'warning';
            overallText = `${stats.empty} пустых массивов/объектов`;
            overallColor = 'var(--amber)';
        }

        let rowsHtml = sorted.map((r, idx) => {
            const meta = statusMeta[r.status] || statusMeta['ok'];
            const critBadge = r.entry.critical
                ? `<span class="tag-badge bg-tag-red" style="font-size:7px; padding:1px 5px;">CRIT</span>`
                : '';

            let noteHtml = '';
            if (r.note) {
                noteHtml = `<div class="sub-label mt-1" style="font-size:8.5px; color:${meta.color};">${r.note}</div>`;
            }

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
                            ${noteHtml}
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
                        <i class="fa-solid fa-rotate mr-1"></i> Перепроверить
                    </button>
                </div>
                <div class="sub-label" style="font-size:9px;">Проверяет статус всех глобальных массивов и объектов, критичных для игры.</div>
            </div>

            <!-- СВОДКА -->
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
                <div class="sub-label mt-2" style="font-size:8px;">Всего проверок: <b>${stats.total}</b> | Критичных провалов: <b class="${stats.criticalMissing > 0 ? 'color-red' : 'color-green'}">${stats.criticalMissing}</b></div>
            </div>

            <!-- КНОПКИ ДЕЙСТВИЙ -->
            <div class="grid-2 mb-2" style="gap:4px;">
                <button onclick="DevDataChecker.exportReportToConsole()" class="btn btn-dark btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-terminal mr-1"></i> Отчёт в консоль
                </button>
                <button onclick="DevDataChecker.exportReportToClipboard()" class="btn btn-cyan btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-copy mr-1"></i> Скопировать
                </button>
            </div>

            <!-- ФИЛЬТР -->
            <div class="grid-4 mb-2" style="gap:3px;">
                <button onclick="DevDataChecker._setFilter('all')" class="btn ${this._filter === 'all' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Все</button>
                <button onclick="DevDataChecker._setFilter('problems')" class="btn ${this._filter === 'problems' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Проблемы</button>
                <button onclick="DevDataChecker._setFilter('critical')" class="btn ${this._filter === 'critical' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Критичные</button>
                <button onclick="DevDataChecker._setFilter('ok')" class="btn ${this._filter === 'ok' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">OK</button>
            </div>

            <!-- СПИСОК -->
            <div class="space-y-1">
                ${rowsHtml}
            </div>
        `;

        // Применяем фильтр если есть
        if (this._filter && this._filter !== 'all') {
            this._applyFilterToDOM(this._filter);
        }
    },

    _filter: 'all',

    _setFilter(filter) {
        this._filter = filter;
        if (typeof playSound === 'function') playSound('tick');
        this.refresh();
    },

    _applyFilterToDOM(filter) {
        // Уже отрендерено — скрываем/показываем
        const cards = document.querySelectorAll('#devDataCheckContainer .glass-card.p-2.mb-1');
        // (Это не критично — при перерендере всё встанет на место)
    },

    refresh() {
        const container = document.getElementById('devDataCheckContainer');
        if (container) this.render(container);
    },

    // --------------------------------------------------------
    // ЭКСПОРТ ОТЧЁТА
    // --------------------------------------------------------
    exportReportToConsole() {
        const { results, stats } = this.runAllChecks();

        console.group('%c[DEV DATA CHECK] Отчёт о данных игры', 'color:#00f2fe; font-weight:900; font-size:12px;');
        console.log('%cСводка:', 'color:#00e676; font-weight:bold;');
        console.log(`  Всего проверок: ${stats.total}`);
        console.log(`  OK: ${stats.ok}`);
        console.log(`  Пусто: ${stats.empty}`);
        console.log(`  Отсутствует: ${stats.missing}`);
        console.log(`  Неверный тип: ${stats.wrongType}`);
        console.log(`  Критичных провалов: ${stats.criticalMissing}`);

        const missing = results.filter(r => r.status === 'missing');
        const empty = results.filter(r => r.status === 'empty');
        const wrongType = results.filter(r => r.status === 'wrong-type');

        if (missing.length > 0) {
            console.group('%c✗ ОТСУТСТВУЮТ:', 'color:#ff3366; font-weight:bold;');
            missing.forEach(r => console.log(`  ${r.entry.critical ? '🔴' : '⚪'} window.${r.entry.path} — ${r.entry.label}`));
            console.groupEnd();
        }
        if (empty.length > 0) {
            console.group('%c⚠ ПУСТЫЕ:', 'color:#ffb300; font-weight:bold;');
            empty.forEach(r => console.log(`  ${r.entry.critical ? '🔴' : '⚪'} window.${r.entry.path} — ${r.entry.label} ${r.lengthInfo}`));
            console.groupEnd();
        }
        if (wrongType.length > 0) {
            console.group('%c! НЕВЕРНЫЙ ТИП:', 'color:#f97316; font-weight:bold;');
            wrongType.forEach(r => console.log(`  window.${r.entry.path} — ${r.entry.label} (${r.note})`));
            console.groupEnd();
        }

        console.groupEnd();

        if (typeof showToast === 'function') showToast('📋 Отчёт выведен в консоль (F12)');
        if (typeof playSound === 'function') playSound('win');
    },

    exportReportToClipboard() {
        const { results, stats } = this.runAllChecks();

        let text = `=== DEV DATA CHECK ===\n`;
        text += `Всего: ${stats.total} | OK: ${stats.ok} | Пусто: ${stats.empty} | Нет: ${stats.missing} | Тип: ${stats.wrongType} | Крит: ${stats.criticalMissing}\n\n`;

        const missing = results.filter(r => r.status === 'missing');
        if (missing.length > 0) {
            text += `--- ОТСУТСТВУЮТ ---\n`;
            missing.forEach(r => text += `${r.entry.critical ? '[CRIT]' : '[--]'} window.${r.entry.path} — ${r.entry.label}\n`);
            text += `\n`;
        }

        const empty = results.filter(r => r.status === 'empty');
        if (empty.length > 0) {
            text += `--- ПУСТЫЕ ---\n`;
            empty.forEach(r => text += `${r.entry.critical ? '[CRIT]' : '[--]'} window.${r.entry.path} — ${r.entry.label} ${r.lengthInfo}\n`);
            text += `\n`;
        }

        const wrongType = results.filter(r => r.status === 'wrong-type');
        if (wrongType.length > 0) {
            text += `--- НЕВЕРНЫЙ ТИП ---\n`;
            wrongType.forEach(r => text += `${r.entry.critical ? '[CRIT]' : '[--]'} window.${r.entry.path} — ${r.entry.label} (${r.note})\n`);
        }

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                if (typeof showToast === 'function') showToast('📋 Отчёт скопирован в буфер!');
                if (typeof playSound === 'function') playSound('win');
                if (typeof tgHaptic === 'function') tgHaptic('success');
            }).catch(() => {
                this._fallbackCopy(text);
            });
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
        try {
            document.execCommand('copy');
            if (typeof showToast === 'function') showToast('📋 Отчёт скопирован!');
        } catch (e) {
            if (typeof showToast === 'function') showToast('❌ Не удалось скопировать');
        }
        document.body.removeChild(ta);
    }
};

window.DevDataChecker = DevDataChecker;
console.log('[🔍 dev-data-checker v1.0.0] Утилита проверки данных загружена ✓');
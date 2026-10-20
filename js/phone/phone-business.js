// ========================================================
// js/phone/phone-business.js — БИЗНЕС-СЕТЬ ПЕРЕКУПА (v9.2.0 STABLE)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v9.2.0:
//   1. Полноценная система корпораций и отраслевых холдингов.
//   2. Интерактивная вкладка «Корпорации» с прогрессом и учреждением.
//   3. Устранена ошибка одинаковых id — синергия считается по отраслям.
// ========================================================

const PhoneBusiness = {
    currentTab: 'points',
    selectedBizId: null,
    cabinetSubTab: 'overview',
    _tickInterval: null,
    _activeBonus: null,
    _ensureStateInProgress: false,

    _collectAllPending: false,
    _collectPointPending: false,
    _tickPending: false,
    _upgradePending: false,
    _tenderPending: false,
    _individualUpgradePending: false,
    _corpActionPending: false,

    get ECONOMIC_CYCLES() { return window.BusinessDataModule?.ECONOMIC_CYCLES || {}; },
    get NETWORK_MILESTONES() {
        const raw = window.BusinessDataModule?.NETWORK_MILESTONES;
        return Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
    },
    get DNA_LOCATIONS() {
        const raw = window.BusinessDataModule?.DNA_LOCATIONS;
        return Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
    },
    get DNA_TRAFFIC() {
        const raw = window.BusinessDataModule?.DNA_TRAFFIC;
        return Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
    },
    get DNA_CONDITION() {
        const raw = window.BusinessDataModule?.DNA_CONDITION;
        return Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
    },
    get DNA_STAFF() {
        const raw = window.BusinessDataModule?.DNA_STAFF;
        return Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
    },
    get CRISIS_EVENTS() {
        if (window.BUSINESS_CRISIS_EVENTS && Array.isArray(window.BUSINESS_CRISIS_EVENTS)) {
            return window.BUSINESS_CRISIS_EVENTS;
        }
        const raw = window.BusinessDataModule?.CRISIS_EVENTS;
        return Array.isArray(raw) ? raw : [];
    },
    get DAILY_BIZ_CHALLENGES() {
        const raw = window.BusinessDataModule?.DAILY_BIZ_CHALLENGES;
        return Array.isArray(raw) ? raw : [];
    },
    get achievements() {
        const raw = window.BusinessDataModule?.achievements;
        return Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
    },

    // ========================================================
    // КАТАЛОГ ОТРАСЛЕВЫХ КОРПОРАЦИЙ И ХОЛДИНГОВ
    // ========================================================
    CORPORATE_SECTORS: [
        {
            id: 'corp_service',
            name: 'Холдинг «АвтоСервис Групп»',
            icon: 'fa-screwdriver-wrench',
            tag: 'СЕРВИС И ТЮНИНГ',
            desc: 'Синергия автосервисов, шиномонтажей, малярных и детейлинг-цехов. Единые оптовые закупки и перенаправление клиентов.',
            bizIds: ['wash', 'shina', 'sto', 'paint_shop', 'chip_tuning', 'detailing'],
            minPoints: 3,
            minLevel: 1,
            bonusPct: 25,
            charterCost: 500000
        },
        {
            id: 'corp_transport',
            name: 'Синдикат «Транс-Логистик»',
            icon: 'fa-truck-fast',
            tag: 'ПЕРЕВОЗКИ И ФЛОТ',
            desc: 'Единый диспетчерский центр таксопарка, курьерской доставки, службы эвакуации и дальнобойных тягачей.',
            bizIds: ['tow_truck', 'delivery', 'taxi', 'transport_company'],
            minPoints: 3,
            minLevel: 1,
            bonusPct: 30,
            charterCost: 800000
        },
        {
            id: 'corp_trade',
            name: 'Альянс «ВнешТорг & Импорт»',
            icon: 'fa-boxes-packing',
            tag: 'ДИЛЕРЫ И ТАМОЖНЯ',
            desc: 'Прямые поставки контрактных авто и распилов из Порта на авторазборку и в автоподбор в обход посредников.',
            bizIds: ['razborka', 'autopodbor', 'customs_hub'],
            minPoints: 2,
            minLevel: 1,
            bonusPct: 30,
            charterCost: 1200000
        },
        {
            id: 'corp_monopoly',
            name: 'Мега-Концерн «Perekup Global»',
            icon: 'fa-crown',
            tag: 'МОНОПОЛИЯ РЕГИОНА',
            desc: 'Генеральный монопольный синдикат. Полный контроль над автомобильным рынком, сервисами и логистикой.',
            bizIds: ['wash', 'shina', 'sto', 'tow_truck', 'delivery', 'paint_shop', 'chip_tuning', 'detailing', 'razborka', 'autopodbor', 'taxi', 'transport_company', 'customs_hub'],
            minPoints: 8,
            minLevel: 2,
            bonusPct: 40,
            charterCost: 3000000
        }
    ],

    _defaultIndividualUpgrades: {
        wash: [
            { id: 'w_pressure', name: 'Пеногенераторы Tornado', desc: '+15% к скорости обслуживания и чеку', baseCost: 35000, costMul: 1.7, maxLevel: 3, bonusPct: 15, icon: 'fa-shower' },
            { id: 'w_osmosis',  name: 'Осмотическая сушка',       desc: '+20% к кассе и защита ЛКП от разводов', baseCost: 55000, costMul: 1.8, maxLevel: 3, bonusPct: 20, icon: 'fa-wind' },
            { id: 'w_cafe',     name: 'Клиентский кофе-бар',      desc: '+25% пассивной выручки с посетителей',  baseCost: 75000, costMul: 1.9, maxLevel: 3, bonusPct: 25, icon: 'fa-mug-hot' }
        ],
        shina: [
            { id: 'sh_straight', name: 'Станок правки дисков',    desc: '+15% к среднему чеку шиномонтажа',       baseCost: 45000, costMul: 1.7, maxLevel: 3, bonusPct: 15, icon: 'fa-compact-disc' },
            { id: 'sh_auto',     name: 'Автостенд низкого профиля',desc: '+20% выручки с тюнинг-проектов',        baseCost: 70000, costMul: 1.8, maxLevel: 3, bonusPct: 20, icon: 'fa-gauge-high' },
            { id: 'sh_hotel',    name: 'Отель хранения шин',       desc: '+25% пассивной сезонной прибыли',       baseCost: 95000, costMul: 1.9, maxLevel: 3, bonusPct: 25, icon: 'fa-warehouse' }
        ],
        sto: [
            { id: 'sto_lifts',  name: 'Гидравлические подъёмники', desc: '+20% к пропускной способности авто',   baseCost: 85000, costMul: 1.75, maxLevel: 3, bonusPct: 20, icon: 'fa-elevator' },
            { id: 'sto_3d',     name: '3D Стенд сход-развала',    desc: '+25% к выручке со слесарных работ',      baseCost: 120000, costMul: 1.85, maxLevel: 3, bonusPct: 25, icon: 'fa-crosshairs' },
            { id: 'sto_parts',  name: 'Склад оригинальных узлов', desc: '+30% к доходу, дешевле ремонт авто парка',baseCost: 160000, costMul: 1.9, maxLevel: 3, bonusPct: 30, icon: 'fa-boxes-packing' }
        ],
        tow_truck: [
            { id: 'tow_winch',  name: 'Тяговая гидролебёдка 8т',  desc: '+18% к стоимости сложных эвакуаций',     baseCost: 90000, costMul: 1.75, maxLevel: 3, bonusPct: 18, icon: 'fa-anchor' },
            { id: 'tow_double', name: 'Сдвоенная кабина экипажа', desc: '+22% выручки за дальние рейсы по области',baseCost: 135000, costMul: 1.85, maxLevel: 3, bonusPct: 22, icon: 'fa-people-group' },
            { id: 'tow_contract',name: 'Контракт спецстоянки ГИБДД',desc: '+35% постоянного потока заказов',     baseCost: 190000, costMul: 1.95, maxLevel: 3, bonusPct: 35, icon: 'fa-shield-halved' }
        ],
        delivery: [
            { id: 'del_thermo', name: 'Изотермические термобоксы',desc: '+15% к доставкам ресторанных заказов',   baseCost: 75000, costMul: 1.7, maxLevel: 3, bonusPct: 15, icon: 'fa-box' },
            { id: 'del_gps',    name: 'GPS-маршрутизатор трафика',desc: '+25% скорости развоза и экономия бензина',baseCost: 110000, costMul: 1.8, maxLevel: 3, bonusPct: 25, icon: 'fa-map-location-dot' },
            { id: 'del_moto',   name: 'Экспресс-мотопарк доставки',desc: '+30% к общей кассе курьерской сети',    baseCost: 165000, costMul: 1.9, maxLevel: 3, bonusPct: 30, icon: 'fa-motorcycle' }
        ],
        paint_shop: [
            { id: 'pnt_infra',  name: 'Инфракрасная сушилка',     desc: '+20% к скорости окраса кузова',         baseCost: 110000, costMul: 1.75, maxLevel: 3, bonusPct: 20, icon: 'fa-fire' },
            { id: 'pnt_lab',    name: 'Спектрофотометр красок',   desc: '+25% к чеку за 100% попадание в цвет',   baseCost: 150000, costMul: 1.85, maxLevel: 3, bonusPct: 25, icon: 'fa-palette' },
            { id: 'pnt_booth',  name: 'Камера с очисткой «Антипыль»',desc: '+35% к стоимости премиальных обливов',baseCost: 220000, costMul: 1.95, maxLevel: 3, bonusPct: 35, icon: 'fa-spray-can' }
        ],
        chip_tuning: [
            { id: 'chp_dyno',   name: '4WD Диностенд нагрузок',   desc: '+25% к чеку за замеры мощности',         baseCost: 140000, costMul: 1.8, maxLevel: 3, bonusPct: 25, icon: 'fa-tachograph-digital' },
            { id: 'chp_flash',  name: 'Программатор ECU Master',  desc: '+30% к выручке со Stage 2 и Stage 3',    baseCost: 190000, costMul: 1.85, maxLevel: 3, bonusPct: 30, icon: 'fa-laptop-code' },
            { id: 'chp_maps',   name: 'Калибровки спортивных прошивок',desc: '+35% заказов от уличных гонщиков',   baseCost: 260000, costMul: 1.95, maxLevel: 3, bonusPct: 35, icon: 'fa-bolt' }
        ],
        detailing: [
            { id: 'dtl_ceramic',name: 'Керамика 9H Diamond Pro',  desc: '+20% к чеку защитных покрытий',          baseCost: 130000, costMul: 1.75, maxLevel: 3, bonusPct: 20, icon: 'fa-gem' },
            { id: 'dtl_tornad', name: 'Пневмохимчистка Tornador', desc: '+25% к скорости чистки интерьера',      baseCost: 175000, costMul: 1.85, maxLevel: 3, bonusPct: 25, icon: 'fa-soap' },
            { id: 'dtl_light',  name: 'Бестеневой диодный туннель',desc: '+35% к баллам на автошоу и кассе',      baseCost: 240000, costMul: 1.95, maxLevel: 3, bonusPct: 35, icon: 'fa-lightbulb' }
        ],
        razborka: [
            { id: 'rzb_plasma', name: 'Промышленный плазморез',   desc: '+20% к выходу контрактного металла',    baseCost: 150000, costMul: 1.75, maxLevel: 3, bonusPct: 20, icon: 'fa-scissors' },
            { id: 'rzb_racks',  name: 'Многоярусный склад агрегатов',desc: '+25% к вместимости и продаже моторов',baseCost: 210000, costMul: 1.85, maxLevel: 3, bonusPct: 25, icon: 'fa-cubes-stacked' },
            { id: 'rzb_online', name: 'Маркетплейс б/у запчастей',desc: '+35% оптовой выручки по регионам',       baseCost: 290000, costMul: 1.95, maxLevel: 3, bonusPct: 35, icon: 'fa-globe' }
        ],
        autopodbor: [
            { id: 'pod_launch', name: 'Планшеты Launch Pro для штата',desc: '+20% к точности выездных отчётов',  baseCost: 180000, costMul: 1.75, maxLevel: 3, bonusPct: 20, icon: 'fa-tablet-screen-button' },
            { id: 'pod_ultraz', name: 'Ультразвуковые толщиномеры',desc: '+25% доверия клиентов при проверке',  baseCost: 250000, costMul: 1.85, maxLevel: 3, bonusPct: 25, icon: 'fa-microchip' },
            { id: 'pod_crm',    name: 'CRM-система автоподбора',  desc: '+40% потока богатых заказчиков',         baseCost: 350000, costMul: 1.95, maxLevel: 3, bonusPct: 40, icon: 'fa-network-wired' }
        ],
        taxi: [
            { id: 'tx_priority',name: 'Золотой статус в агрегаторе',desc: '+25% потока заказов без простоя',     baseCost: 280000, costMul: 1.8, maxLevel: 3, bonusPct: 25, icon: 'fa-ranking-star' },
            { id: 'tx_service', name: 'Собственная ремзона парка', desc: '+30% к чистой прибыли, дешевле ТО',    baseCost: 420000, costMul: 1.85, maxLevel: 3, bonusPct: 30, icon: 'fa-wrench' },
            { id: 'tx_ads',     name: 'Светодиодные медиа-боксы', desc: '+40% пассивной выручки с рекламы',      baseCost: 650000, costMul: 1.95, maxLevel: 3, bonusPct: 40, icon: 'fa-tv' }
        ],
        transport_company: [
            { id: 'tc_glonass', name: 'Спутниковый конвой ГЛОНАСС',desc: '+25% к логистике дальних перевозок',   baseCost: 450000, costMul: 1.8, maxLevel: 3, bonusPct: 25, icon: 'fa-satellite' },
            { id: 'tc_cards',   name: 'Корпоративные топливные карты',desc: '+30% к чистой прибыли со скидкой на ДТ',baseCost: 650000, costMul: 1.85, maxLevel: 3, bonusPct: 30, icon: 'fa-gas-pump' },
            { id: 'tc_hub',     name: 'Кросс-докинг терминал 24/7',desc: '+45% к выручке магистральных тягачей', baseCost: 950000, costMul: 1.95, maxLevel: 3, bonusPct: 45, icon: 'fa-truck-moving' }
        ],
        customs_hub: [
            { id: 'hub_crane',  name: 'Козловой контейнерный кран',desc: '+30% к скорости перегрузки карго',      baseCost: 550000, costMul: 1.8, maxLevel: 3, bonusPct: 30, icon: 'fa-arrows-split-up-and-left' },
            { id: 'hub_green',  name: 'Зелёный таможенный коридор',desc: '+35% к пошлинам и легализации VIN',    baseCost: 800000, costMul: 1.85, maxLevel: 3, bonusPct: 35, icon: 'fa-passport' },
            { id: 'hub_bonded', name: 'Охраняемый таможенный СВХ',desc: '+50% к доходу с партий контейнеров',     baseCost: 1200000, costMul: 1.95, maxLevel: 3, bonusPct: 50, icon: 'fa-building-shield' }
        ]
    },

    pointStaffCatalog: [
        { id: 'manager',  name: 'Управляющий филиала',  salary: 15000, bonusPct: 15, desc: '+15% к выручке, контроль кассы и порядка', icon: 'fa-user-tie' },
        { id: 'master',   name: 'Старший мастер смены', salary: 10000, bonusPct: 10, desc: '+10% к кассе, экономит 25% сырья на складе', icon: 'fa-wrench' },
        { id: 'security', name: 'Охранный пост ЧОП',    salary: 6000,  bonusPct: 5,  desc: 'Защита объекта от ночных краж сырья и проверок', icon: 'fa-shield-halved' }
    ],

    _getIndividualUpgrades(bizId) {
        if (window.BUSINESS_INDIVIDUAL_UPGRADES && window.BUSINESS_INDIVIDUAL_UPGRADES[bizId]) {
            return window.BUSINESS_INDIVIDUAL_UPGRADES[bizId];
        }
        return this._defaultIndividualUpgrades[bizId] || [];
    },

    _n(val, fb = 0) {
        if (window.GameHelpers && window.GameHelpers.safeNum) return window.GameHelpers.safeNum(val, fb);
        const n = Number(val);
        return isNaN(n) || !isFinite(n) ? fb : n;
    },

    _bizIconsFA: {
        wash: 'fa-shower',
        shina: 'fa-circle-dot',
        sto: 'fa-screwdriver-wrench',
        tow_truck: 'fa-truck-pickup',
        delivery: 'fa-box-open',
        paint_shop: 'fa-paint-roller',
        chip_tuning: 'fa-microchip',
        detailing: 'fa-sparkles',
        razborka: 'fa-gears',
        autopodbor: 'fa-clipboard-check',
        taxi: 'fa-taxi',
        transport_company: 'fa-truck-moving',
        customs_hub: 'fa-landmark'
    },

    _getBaseBusinessData() {
        if (typeof window !== 'undefined' && window.BUSINESS_DATA && Array.isArray(window.BUSINESS_DATA) && window.BUSINESS_DATA.length > 0) {
            return window.BUSINESS_DATA;
        }
        return [
            { id: 'wash', name: 'Автомойка 24/7', minLevel: 4, income: 4000, level: 0, cost: 85000, desc: 'Круглосуточный комплекс бесконтактной мойки.', img: 'assets/business/wash.jpg' },
            { id: 'shina', name: 'Шиномонтаж «У Алика»', minLevel: 6, income: 6000, level: 0, cost: 140000, desc: 'Правка дисков, ошиповка и балансировка.', img: 'assets/business/shina.jpg' },
            { id: 'sto', name: 'СТО дяди Вани', minLevel: 9, income: 12000, level: 0, cost: 280000, desc: 'Капитальный ремонт ДВС и подвески.', img: 'assets/business/sto.jpg' },
            { id: 'tow_truck', name: 'Служба эвакуации «Шериф»', minLevel: 10, income: 16000, level: 0, cost: 390000, desc: 'Эвакуация авто по городу.', img: 'assets/business/tow.jpg', fleetType: 'tow_truck' },
            { id: 'delivery', name: 'Курьерская доставка «Экспресс»', minLevel: 11, income: 18000, level: 0, cost: 480000, desc: 'Городская сеть автокурьеров.', img: 'assets/business/delivery.jpg', fleetType: 'delivery' },
            { id: 'paint_shop', name: 'Малярный цех «Хамелеон»', minLevel: 13, income: 24000, level: 0, cost: 620000, desc: 'Окрасочная камера с сушкой.', img: 'assets/business/paint.jpg' },
            { id: 'chip_tuning', name: 'Лаборатория Stage Lab', minLevel: 16, income: 30000, level: 0, cost: 800000, desc: 'Калибровка прошивок ЭБУ.', img: 'assets/business/chip.jpg' },
            { id: 'detailing', name: 'Детейлинг Студия', minLevel: 19, income: 33000, level: 0, cost: 920000, desc: 'Полировка и керамика кузова.', img: 'assets/business/detailing.jpg' },
            { id: 'razborka', name: 'Авторазборка «Последний путь»', minLevel: 22, income: 40000, level: 0, cost: 1150000, desc: 'Скупка тотальных машин на детали.', img: 'assets/business/razborka.jpg', fleetType: 'razborka' },
            { id: 'autopodbor', name: 'Агентство «Автоподбор Pro»', minLevel: 25, income: 50000, level: 0, cost: 1450000, desc: 'Выездная диагностика экспертов.', img: 'assets/business/podbor.jpg' },
            { id: 'taxi', name: 'Таксопарк', minLevel: 30, income: 80000, level: 0, cost: 3600000, desc: 'Аренда лицензированных седанов.', img: 'assets/business/taxi.jpg', fleetType: 'taxi' },
            { id: 'transport_company', name: 'Транспортная компания «Магистраль»', minLevel: 34, income: 140000, level: 0, cost: 4800000, desc: 'Магистральные тягачи и фуры.', img: 'assets/business/cargo.jpg', fleetType: 'transport_company' },
            { id: 'customs_hub', name: 'Таможенный хаб Порта', minLevel: 38, income: 160000, level: 0, cost: 5200000, desc: 'Таможенная очистка контейнеров.', img: 'assets/business/hub.jpg' }
        ];
    },

    ensureState() {
        if (this._ensureStateInProgress) return;
        this._ensureStateInProgress = true;

        try {
            if (!window.state) window.state = {};
            if (!window.state.player) window.state.player = {};
            if (!Array.isArray(window.state.businesses)) window.state.businesses = [];
            if (!Array.isArray(window.state.player.activeTenders)) window.state.player.activeTenders = [];
            if (!Array.isArray(window.state.player.foundedCorporations)) window.state.player.foundedCorporations = [];

            const baseData = this._getBaseBusinessData();
            const existingIds = new Set(window.state.businesses.filter(b => b && b.id).map(b => b.id));
            const missing = baseData.filter(b => b && b.id && !existingIds.has(b.id));

            if (missing.length > 0) {
                const newBusinesses = missing.map(b => ({
                    id: b.id,
                    name: b.name,
                    customName: b.name,
                    slogan: '',
                    icon: b.icon || this._iconForBiz(b.id),
                    level: 0,
                    cost: b.cost,
                    reqStars: b.reqStars || 0,
                    income: b.income,
                    minLevel: b.minLevel || 1,
                    perk: b.perk || '',
                    desc: b.desc || '',
                    img: b.img || '',
                    fallback: b.fallback || '',
                    stored: 0,
                    stock: 100,
                    maxStock: 100,
                    incomeHistory: [],
                    workshop: {},
                    staff: {},
                    lastIncomeDay: 0,
                    lastStockDay: 0,
                    dna: null,
                    coverSkin: 'classic',
                    ownerSticker: 'none',
                    activeBuffs: [],
                    activeDebuffs: [],
                    reputation: 0,
                    totalEarned: 0,
                    createdAt: 0,
                    fleetType: b.fleetType || null,
                    lastTickTimestamp: Date.now()
                }));

                window.state.businesses = [...window.state.businesses, ...newBusinesses]
                    .sort((a, b) => (a.minLevel || 1) - (b.minLevel || 1));

                if (typeof saveState === 'function') saveState();
            }

            const now = Date.now();
            window.state.businesses.forEach(b => {
                if (!b) return;
                if (typeof b.stored !== 'number' || isNaN(b.stored)) b.stored = 0;
                if (typeof b.stock !== 'number' || isNaN(b.stock)) b.stock = 100;
                if (typeof b.maxStock !== 'number') b.maxStock = 100;
                if (!Array.isArray(b.incomeHistory)) b.incomeHistory = [];
                if (!b.workshop || typeof b.workshop !== 'object' || Array.isArray(b.workshop)) b.workshop = {};
                if (!b.staff || typeof b.staff !== 'object' || Array.isArray(b.staff)) b.staff = {};
                if (!b.icon) b.icon = this._iconForBiz(b.id);
                if (!b.customName) b.customName = b.name;
                if (b.level > 0 && !b.dna) b.dna = this._generateDNA(b.id);
                if (!b.lastTickTimestamp || isNaN(b.lastTickTimestamp)) b.lastTickTimestamp = now;
            });

            if (!Array.isArray(window.state.player.businessAchievements)) window.state.player.businessAchievements = [];

            let legalType = 'none';
            if (typeof window.state.player.legalEntity === 'string') {
                legalType = window.state.player.legalEntity;
            } else if (window.state.player.legalEntity && typeof window.state.player.legalEntity === 'object') {
                legalType = window.state.player.legalEntity.type || 'none';
            } else {
                const docs = window.state?.player?.documents || {};
                if (docs.oooRegistered || window.state?.player?.hasOOO) legalType = 'ooo';
                else if (docs.ipRegistered || window.state?.player?.hasIP || window.state?.player?.businessRegistered) legalType = 'ip';
            }

            window.state.player.legalEntity = {
                type: String(legalType || 'none').toLowerCase(),
                inn: window.state?.player?.inn || null,
                ogrn: null,
                companyName: null
            };

            if (!window.state.player.economicCycle) {
                window.state.player.economicCycle = this._generateEconomicCycle();
            }
            if (!Array.isArray(window.state.player.dailyBizChallenges) || window.state.player.dailyBizChallenges.length === 0) {
                this._generateDailyBizChallenges();
            }

            this._checkOfflineCapitalization();
            this._syncActiveBonus();
            this.startTickLoop();
        } finally {
            this._ensureStateInProgress = false;
        }
    },

    _generateEconomicCycle() {
        const roll = Math.random();
        let cycleId = 'stable';
        if (roll < 0.25) cycleId = 'boom';
        else if (roll < 0.55) cycleId = 'bust';

        const cycles = this.ECONOMIC_CYCLES || {};
        const cycle = { ...(cycles[cycleId] || { incomeMul: 1.0, name: 'Стабильный рынок' }) };
        cycle.daysLeft = Math.floor(2 + Math.random() * 4);
        cycle.startedDay = window.state?.player?.day || 1;
        return cycle;
    },

    _getEconomicCycleMultiplier() {
        const cycle = window.state?.player?.economicCycle;
        if (!cycle) return 1.0;
        const curDay = window.state?.player?.day || 1;
        const elapsed = curDay - (cycle.startedDay || curDay);
        if (elapsed >= (cycle.daysLeft || 3)) return 1.0;
        return cycle.incomeMul || 1.0;
    },

    _tickEconomicCycle() {
        const curDay = window.state?.player?.day || 1;
        const cycle = window.state?.player?.economicCycle;
        if (!cycle || (curDay - (cycle.startedDay || curDay)) >= (cycle.daysLeft || 3)) {
            window.state.player.economicCycle = this._generateEconomicCycle();
        }
    },

    _generateDailyBizChallenges() {
        const list = this.DAILY_BIZ_CHALLENGES;
        if (!Array.isArray(list) || list.length === 0) return;
        const shuffled = [...list].sort(() => 0.5 - Math.random());
        window.state.player.dailyBizChallenges = shuffled.slice(0, 3).map(ch => ({
            id: ch.id, text: ch.text, cur: 0, max: ch.target, action: ch.action, reward: ch.reward, xp: ch.xp, done: false
        }));
    },

    _trackBizChallenge(actionType, count = 1) {
        const challenges = window.state?.player?.dailyBizChallenges;
        if (!Array.isArray(challenges)) return;

        let updated = false;
        challenges.forEach(ch => {
            if (!ch.done && ch.action === actionType) {
                ch.cur = Math.min(ch.max, (ch.cur || 0) + count);
                updated = true;
                if (ch.cur >= ch.max) {
                    ch.done = true;
                    if (window.MoneyManager && typeof window.MoneyManager.earn === 'function') {
                        window.MoneyManager.earn(ch.reward, `Бизнес-челлендж: ${ch.text}`, { silent: true });
                    } else {
                        window.state.player.cash = (window.state.player.cash || 0) + ch.reward;
                    }
                    if (typeof addXp === 'function') addXp(ch.xp);
                    if (typeof showToast === 'function') showToast(`🏆 Челлендж выполнен: «${ch.text}» +${ch.reward.toLocaleString()} ₽`);
                    if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
                }
            }
        });
        if (updated && typeof saveState === 'function') saveState();
    },

    _checkOfflineCapitalization() {
        if (!window.state?.player) return;
        const lastVisit = window.state.player.lastBizVisitDay || 0;
        const curDay = window.state.player.day || 1;
        const daysAway = curDay - lastVisit;

        if (daysAway >= 3 && lastVisit > 0) {
            let bonus = 0;
            (window.state.businesses || []).forEach(b => {
                if (b && b.level > 0 && b.stored > 0) {
                    const bns = Math.round(b.stored * 0.05 * Math.min(daysAway, 7));
                    b.stored += bns;
                    bonus += bns;
                }
            });
            if (bonus > 0 && typeof showToast === 'function') {
                setTimeout(() => showToast(`💎 Оффлайн-бонус: +${bonus.toLocaleString()} ₽ к кассе!`), 2000);
            }
        }
        window.state.player.lastBizVisitDay = curDay;
        if (typeof saveState === 'function') saveState();
    },

    _getNetworkMilestoneBonus() {
        const owned = this.countOwned();
        let bonus = 0;
        const milestones = this.NETWORK_MILESTONES;
        if (Array.isArray(milestones)) {
            for (const m of milestones) {
                if (m && owned >= (m.count || 0)) bonus = m.incomeBonus || 0;
            }
        }
        return bonus;
    },

    _getDiversityBonus() {
        if (!Array.isArray(window.state?.businesses)) return 0;
        const ownedTypes = new Set(
            window.state.businesses.filter(b => b && b.level > 0).map(b => String(b.id).replace(/\d+/g, '').trim())
        );
        if (ownedTypes.size >= 5) return 0.15;
        if (ownedTypes.size >= 3) return 0.07;
        return 0;
    },

    _generateDNA(bizId) {
        const uid = String(window.state?.player?.uid || 'guest');
        const seed = (uid + '_' + bizId).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const pick = (arr, offset) => (Array.isArray(arr) && arr.length > 0) ? arr[(seed + offset) % arr.length] : { id: 'std', mult: 1.0 };
        return {
            location:  pick(this.DNA_LOCATIONS, 0).id,
            traffic:   pick(this.DNA_TRAFFIC, 7).id,
            condition: pick(this.DNA_CONDITION, 13).id,
            staff:     pick(this.DNA_STAFF, 21).id
        };
    },

    _getDNAObject(dna) {
        const defaultLoc = { id: 'city', name: 'Город', mult: 1.0 };
        const defaultTraf = { id: 'medium', name: 'Средний', mult: 1.0 };
        const defaultCond = { id: 'normal', name: 'Норма', mult: 1.0 };
        const defaultStaff = { id: 'standard', name: 'Штат', mult: 1.0 };

        if (!dna) return { location: defaultLoc, traffic: defaultTraf, condition: defaultCond, staff: defaultStaff };

        const locs = this.DNA_LOCATIONS;
        const trafs = this.DNA_TRAFFIC;
        const conds = this.DNA_CONDITION;
        const staffs = this.DNA_STAFF;

        return {
            location:  (Array.isArray(locs) && locs.find(x => x && x.id === dna.location)) || defaultLoc,
            traffic:   (Array.isArray(trafs) && trafs.find(x => x && x.id === dna.traffic)) || defaultTraf,
            condition: (Array.isArray(conds) && conds.find(x => x && x.id === dna.condition)) || defaultCond,
            staff:     (Array.isArray(staffs) && staffs.find(x => x && x.id === dna.staff)) || defaultStaff
        };
    },

    getDNAMultiplier(dna) {
        const obj = this._getDNAObject(dna);
        const mLoc = obj?.location?.mult || 1.0;
        const mTraf = obj?.traffic?.mult || 1.0;
        const mCond = obj?.condition?.mult || 1.0;
        const mStaff = obj?.staff?.mult || 1.0;
        return mLoc * mTraf * mCond * mStaff;
    },

    _iconForBiz(id) {
        const faClass = this._bizIconsFA[id] || 'fa-briefcase';
        return `<i class="fa-solid ${faClass}"></i>`;
    },

    _syncActiveBonus() {
        const curDay = window.state?.player?.day || 1;
        const storedBonus = window.state?.player?.businessAdBonus;
        if (!storedBonus || (storedBonus.expiresDay || 0) < curDay) {
            this._activeBonus = null;
            if (window.state?.player) window.state.player.businessAdBonus = null;
        } else {
            this._activeBonus = storedBonus;
        }
    },

    countOwned() {
        if (!Array.isArray(window.state?.businesses)) return 0;
        return window.state.businesses.filter(b => b && b.level > 0).length;
    },

    getPointWorkshopBonus(b) {
        if (!b || !b.workshop || typeof b.workshop !== 'object') return 1.0;
        const catalog = this._getIndividualUpgrades(b.id);
        let bonusSum = 0;

        catalog.forEach(upg => {
            const curLvl = Number(b.workshop[upg.id]) || 0;
            if (curLvl > 0) {
                bonusSum += (curLvl * (upg.bonusPct || 15));
            }
        });

        return 1 + (bonusSum / 100);
    },

    getPointStaffBonus(b) {
        if (!b || !b.staff || typeof b.staff !== 'object') return 1.0;
        let bonusSum = 0;

        this.pointStaffCatalog.forEach(st => {
            if (b.staff[st.id]) {
                bonusSum += (st.bonusPct || 10);
            }
        });

        return 1 + (bonusSum / 100);
    },

    getBizIncome(b) {
        if (!b || typeof b !== 'object' || b.level <= 0) return 0;

        let inc = this._n(b.income, 0) * Math.pow(1.55, Math.max(0, b.level - 1));
        inc *= this.getDNAMultiplier(b.dna);
        inc *= this.getPointWorkshopBonus(b);
        inc *= this.getPointStaffBonus(b);

        if (b.stock <= 0) inc *= 0.15;

        const curDay = window.state?.player?.day || 1;
        (b.activeBuffs || []).forEach(buff => {
            if (buff && (buff.expiresDay || 0) >= curDay) inc *= (1 + (buff.pct || 0) / 100);
        });
        (b.activeDebuffs || []).forEach(debuff => {
            if (debuff && (debuff.expiresDay || 0) >= curDay) inc *= (1 - (debuff.pct || 0) / 100);
        });

        const repBonus = Math.min(20, (b.reputation || 0) * 0.2);
        inc *= (1 + repBonus / 100);

        if (window.BusinessFleetModule && typeof window.BusinessFleetModule.calculateFleetIncomeForBiz === 'function') {
            try {
                const fleetIncome = window.BusinessFleetModule.calculateFleetIncomeForBiz(b.id);
                if (fleetIncome && typeof fleetIncome.net === 'number' && !isNaN(fleetIncome.net)) {
                    inc += fleetIncome.net;
                }
            } catch (e) {
                console.warn('[PhoneBusiness] Fleet income error:', e);
            }
        }

        return Math.round(inc);
    },

    getBizIncomeWithBonuses(b) {
        const base = this.getBizIncome(b);
        if (base <= 0) return 0;

        let total = base;

        this._syncActiveBonus();
        if (this._activeBonus && this._activeBonus.expiresDay >= (window.state?.player?.day || 1)) {
            total *= (1 + (this._activeBonus.bonusPct || 0) / 100);
        }

        if (Array.isArray(window.state?.player?.activeTenders)) {
            const curDay = window.state?.player?.day || 1;
            const activeTnd = window.state.player.activeTenders.find(t => t && t.targetBiz === b.id && t.expiresDay >= curDay);
            if (activeTnd && activeTnd.incomeMultiplier) {
                total *= activeTnd.incomeMultiplier;
            }
        }

        total *= (1 + this._getCorporationBonus(b.id));
        total *= this._getEconomicCycleMultiplier();
        total *= (1 + this._getNetworkMilestoneBonus());
        total *= (1 + this._getDiversityBonus());

        return Math.round(total);
    },

    getTotalDailyIncome() {
        if (!Array.isArray(window.state?.businesses)) return 0;
        let total = 0;
        window.state.businesses.forEach(b => {
            try {
                if (b && b.level > 0) {
                    const inc = this.getBizIncomeWithBonuses(b);
                    if (typeof inc === 'number' && !isNaN(inc)) total += inc;
                }
            } catch (e) {}
        });
        return Math.round(total);
    },

    // Расчет корпоративного бонуса (отраслевой + общехолдинговый)
    _getCorporationBonus(bizId = null) {
        const founded = window.state?.player?.foundedCorporations || [];
        if (!Array.isArray(founded) || founded.length === 0) return 0;

        let totalBonus = 0;
        this.CORPORATE_SECTORS.forEach(sec => {
            if (founded.includes(sec.id)) {
                // Если указан конкретный бизнес, проверяем его принадлежность к отрасли
                if (!bizId || sec.bizIds.includes(bizId) || sec.id === 'corp_monopoly') {
                    totalBonus += (sec.bonusPct / 100);
                }
            }
        });

        return Math.min(totalBonus, 1.50);
    },

    getAccumulatedCash() {
        if (!Array.isArray(window.state?.businesses)) return 0;
        let total = 0;
        window.state.businesses.forEach(b => {
            if (b && b.level > 0 && typeof b.stored === 'number' && !isNaN(b.stored)) {
                total += Math.floor(b.stored);
            }
        });
        return total;
    },

    // ========================================================
    // ГЛАВНЫЙ РЕНДЕР
    // ========================================================
    render(container) {
        if (!container) return;
        try {
            this.ensureState();

            const tab = this.currentTab;
            const dailyIncome = this.getTotalDailyIncome();
            const accumulated = this.getAccumulatedCash();

            const legal = window.state?.player?.legalEntity || { type: 'none' };
            const legalConfig = (window.LEGAL_ENTITIES && window.LEGAL_ENTITIES[legal.type]) || null;
            const isLegalActive = legal.type && legal.type !== 'none';
            const legalBadgeText = legalConfig?.tag || (isLegalActive ? String(legal.type).toUpperCase() : 'Физлицо');

            const foundedCount = (window.state?.player?.foundedCorporations || []).length;

            container.innerHTML = `
                <div class="phone-app-header">
                    <button onclick="${this.selectedBizId ? 'PhoneBusiness.closePointCabinet()' : 'PhoneManager.goHome()'}" class="phone-back-btn">
                        <i class="fa-solid fa-chevron-left"></i> ${this.selectedBizId ? 'К точкам' : 'Назад'}
                    </button>
                    <div class="phone-app-title color-green">
                        <i class="fa-solid fa-briefcase mr-1"></i> ${this.selectedBizId ? 'Кабинет точки' : 'Бизнес-Сеть'}
                    </div>
                    <div style="width:40px;"></div>
                </div>

                <div class="phone-app-body">
                    <div class="biz-summary-bar mb-2">
                        <div class="biz-summary-cell">
                            <div class="biz-summary-label">Форма</div>
                            <div class="biz-summary-value ${isLegalActive ? 'color-cyan' : 'color-amber'}" style="font-size:11px;">
                                ${legalBadgeText}
                            </div>
                        </div>
                        <div class="biz-summary-cell">
                            <div class="biz-summary-label">Доход</div>
                            <div class="biz-summary-value value-green">+${dailyIncome.toLocaleString()} ₽</div>
                        </div>
                        <div class="biz-summary-cell">
                            <div class="biz-summary-label">В кассах</div>
                            <div class="biz-summary-value value-cyan">${accumulated.toLocaleString()} ₽</div>
                        </div>
                        <button onclick="PhoneBusiness.collectAllCash()" class="biz-collect-btn" ${accumulated <= 0 ? 'disabled' : ''} title="Собрать всю кассу">
                            <i class="fa-solid fa-hand-holding-dollar"></i>
                        </button>
                    </div>

                    ${!isLegalActive ? `
                        <div class="glass-card mb-2 p-2 flex-between" style="background: rgba(255,179,0,0.08); border-left: 3px solid var(--amber);">
                            <div>
                                <b class="text-xs color-amber"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Регистрация бизнеса</b>
                                <div class="sub-label" style="font-size:8.5px;">Для покупки объектов оформите ИП или ООО.</div>
                            </div>
                            <button onclick="if(window.PhoneManager) PhoneManager.openApp('gosuslugi')" class="btn btn-amber btn-sm btn-auto" style="font-size:9.5px; padding:4px 8px;">
                                Госуслуги →
                            </button>
                        </div>
                    ` : ''}

                    <div class="biz-tabs-row mb-2" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px;">
                        <button onclick="PhoneBusiness.setTab('points')" class="biz-tab ${tab === 'points' ? 'active' : ''}">
                            <i class="fa-solid fa-store"></i><span>Точки</span>
                        </button>
                        <button onclick="PhoneBusiness.setTab('tenders')" class="biz-tab ${tab === 'tenders' ? 'active' : ''}">
                            <i class="fa-solid fa-file-contract"></i><span>Тендеры</span>
                        </button>
                        <button onclick="PhoneBusiness.setTab('corp')" class="biz-tab ${tab === 'corp' ? 'active' : ''}">
                            <i class="fa-solid fa-building"></i><span>Корпорации ${foundedCount > 0 ? `(${foundedCount})` : ''}</span>
                        </button>
                    </div>

                    <div id="bizTabContent"></div>
                </div>
            `;

            const content = document.getElementById('bizTabContent');
            if (!content) return;

            if (this.selectedBizId && tab === 'points') {
                this.renderPointCabinet(content, this.selectedBizId);
            } else if (tab === 'points') {
                this.renderPointsTab(content);
            } else if (tab === 'tenders') {
                this.renderTendersTab(content);
            } else if (tab === 'corp') {
                this.renderCorporationTab(content);
            }
        } catch (err) {
            console.error('[PhoneBusiness] Render error:', err);
            container.innerHTML = `
                <div class="phone-app-header">
                    <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                    <div class="phone-app-title color-green"><i class="fa-solid fa-briefcase mr-1"></i> Бизнес</div>
                    <div style="width:40px;"></div>
                </div>
                <div class="phone-app-body text-center p-4">
                    <div class="glass-card p-3">
                        <b class="text-xs color-red">Ошибка отображения бизнеса</b>
                        <div class="sub-label mt-2" style="font-size:10px; color:#fca5a5;">${err.message || String(err)}</div>
                        <button onclick="PhoneBusiness.render(document.getElementById('phoneAppContainer'))" class="btn btn-cyan btn-sm mt-3">Повторить</button>
                    </div>
                </div>
            `;
        }
    },

    setTab(tab) {
        this.selectedBizId = null;
        this.currentTab = tab;
        if (window.AudioFx) { window.AudioFx.play('tick'); window.AudioFx.haptic('light'); }
        this.render(document.getElementById('phoneAppContainer'));
    },

    openPointCabinet(bizId) {
        this.selectedBizId = bizId;
        this.cabinetSubTab = 'overview';
        this.currentTab = 'points';
        if (window.AudioFx) { window.AudioFx.play('tick'); window.AudioFx.haptic('light'); }
        this.render(document.getElementById('phoneAppContainer'));
    },

    setCabinetSubTab(subTab) {
        this.cabinetSubTab = subTab;
        if (window.AudioFx) { window.AudioFx.play('tick'); window.AudioFx.haptic('light'); }
        const content = document.getElementById('bizTabContent');
        if (content && this.selectedBizId) {
            this.renderPointCabinet(content, this.selectedBizId);
        } else {
            this.render(document.getElementById('phoneAppContainer'));
        }
    },

    closePointCabinet() {
        this.selectedBizId = null;
        if (window.AudioFx) { window.AudioFx.play('tick'); }
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 1. ДАШБОРД ТОЧЕК
    // ========================================================
    renderPointsTab(container) {
        const pLvl = window.state?.player?.level || 1;
        const businesses = window.state.businesses || [];
        const owned = businesses.filter(b => b && b.level > 0);
        const available = businesses.filter(b => b && b.level === 0);

        let ownedGridHtml = '';
        if (owned.length === 0) {
            ownedGridHtml = `
                <div class="glass-card text-center py-4 mb-3" style="background:#090e18;">
                    <div style="font-size:24px; margin-bottom:4px;">🏢</div>
                    <b class="text-xs color-cyan">У вас пока нет купленных объектов</b>
                    <div class="sub-label mt-1" style="font-size:9.5px;">Выберите подходящий бизнес из каталога ниже и выкупите его.</div>
                </div>
            `;
        } else {
            ownedGridHtml = `<div class="grid-2 mb-3" style="gap:8px;">`;
            owned.forEach(b => {
                const income = this.getBizIncomeWithBonuses(b);
                const cash = Math.floor(b.stored || 0);
                const stock = Math.round(b.stock || 0);
                const isLowStock = stock < 30;

                const supportsFleet = Boolean(window.BUSINESS_FLEET_REQUIREMENTS && window.BUSINESS_FLEET_REQUIREMENTS[b.id]);
                let fleetCount = 0;
                try {
                    fleetCount = supportsFleet && window.BusinessFleetModule && typeof window.BusinessFleetModule.getAssignedVehicles === 'function' ? (window.BusinessFleetModule.getAssignedVehicles(b.id) || []).length : 0;
                } catch (e) {
                    fleetCount = 0;
                }

                ownedGridHtml += `
                    <div onclick="PhoneBusiness.openPointCabinet('${b.id}')" class="glass-card p-2" style="background:#090e18; border-left:3px solid var(--green); cursor:pointer; transition:transform 0.15s ease;">
                        <div class="flex-between mb-1">
                            <div class="flex-gap" style="align-items:center; gap:5px;">
                                <div style="font-size:14px; color:var(--green);">${this._iconForBiz(b.id)}</div>
                                <b class="text-xs color-green" style="font-size:10.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:95px;">
                                    ${b.customName || b.name}
                                </b>
                            </div>
                            <span class="tag-badge bg-tag-green" style="font-size:7.5px;">УР. ${b.level}</span>
                        </div>

                        <div class="sub-label mb-1" style="font-size:9px;">
                            Доход: <b class="color-green">+${income.toLocaleString()} ₽/д</b>
                        </div>

                        <div class="flex-between" style="font-size:8.5px;">
                            <span>Касса: <b class="color-cyan">${cash > 0 ? (cash/1000).toFixed(1) + 'k' : '0'} ₽</b></span>
                            <span class="${isLowStock ? 'color-red font-bold' : 'sub-label'}">Сырьё: ${stock}%</span>
                        </div>

                        ${supportsFleet ? `
                            <div class="sub-label mt-1" style="font-size:8px; border-top:1px dashed rgba(255,255,255,0.08); padding-top:2px;">
                                <i class="fa-solid fa-car"></i> Во флоте: <b>${fleetCount} авто</b>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            ownedGridHtml += `</div>`;
        }

        let catalogHtml = `
            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-amber mb-2 block"><i class="fa-solid fa-cart-plus mr-1"></i> Каталог объектов под выкуп (${available.length}):</b>
        `;

        available.forEach(b => {
            const isLocked = pLvl < (b.minLevel || 1);
            const canAfford = (window.state?.player?.cash || 0) >= (b.cost || 0);

            catalogHtml += `
                <div class="p-2 mb-2 flex-between" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                    <div style="flex:1; min-width:0; margin-right:8px;">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-main" style="font-size:11px;">${this._iconForBiz(b.id)} ${b.name}</b>
                            <span class="tag-badge ${isLocked ? 'bg-tag-red' : 'bg-tag-cyan'}" style="font-size:7.5px;">
                                ${isLocked ? `С ${b.minLevel} УР.` : 'ДОСТУПНО'}
                            </span>
                        </div>
                        <div class="sub-label" style="font-size:9px; line-height:1.25;">${b.desc || ''}</div>
                        <div class="sub-label mt-1" style="font-size:8.5px; color:var(--green);">
                            Базовый доход: <b>+${(b.income || 0).toLocaleString()} ₽/день</b>
                        </div>
                    </div>

                    <div>
                        ${isLocked ? `
                            <button class="btn btn-dark btn-sm opacity-50" disabled style="font-size:9px; padding:4px 8px;">
                                <i class="fa-solid fa-lock"></i>
                            </button>
                        ` : `
                            <button onclick="PhoneBusiness.upgradePoint('${b.id}')" class="btn ${canAfford ? 'btn-green' : 'btn-dark opacity-50'} btn-sm btn-auto" style="font-size:9px; padding:6px 10px; font-weight:700;">
                                ${(b.cost || 0).toLocaleString()} ₽
                            </button>
                        `}
                    </div>
                </div>
            `;
        });
        catalogHtml += `</div>`;

        container.innerHTML = `
            <div class="sub-label mb-1 px-1 flex-between" style="font-size:10px;">
                <span><b>Ваши предприятия в строю:</b></span>
                <span class="color-green font-bold">${owned.length} шт.</span>
            </div>
            ${ownedGridHtml}
            ${catalogHtml}
            ${this.renderAchievementsBlock()}
        `;
    },

    // ========================================================
    // 2. ИНТЕРАКТИВНЫЙ КАБИНЕТ КОРПОРАЦИЙ (ВАРИАНТ А)
    // ========================================================
    renderCorporationTab(container) {
        const businesses = window.state?.businesses || [];
        const founded = window.state?.player?.foundedCorporations || [];
        const cash = Number(window.state?.player?.cash) || 0;

        let totalCorpSynergyPct = 0;
        this.CORPORATE_SECTORS.forEach(sec => {
            if (founded.includes(sec.id)) totalCorpSynergyPct += sec.bonusPct;
        });

        let sectorsHtml = '';
        this.CORPORATE_SECTORS.forEach(sec => {
            const isFounded = founded.includes(sec.id);

            // Считаем точки в этой отрасли
            const sectorBizList = businesses.filter(b => sec.bizIds.includes(b.id));
            const ownedInSector = sectorBizList.filter(b => b.level >= sec.minLevel);
            const count = ownedInSector.length;
            const target = sec.minPoints;
            const isProgressComplete = count >= target;
            const canAfford = cash >= sec.charterCost;
            const canFound = isProgressComplete && canAfford && !isFounded;

            sectorsHtml += `
                <div class="glass-card mb-3 p-3" style="background:#090e18; border-left: 3px solid ${isFounded ? 'var(--green)' : (isProgressComplete ? 'var(--cyan)' : 'rgba(255,255,255,0.15)')};">
                    <div class="flex-between mb-1">
                        <div class="flex-gap" style="align-items:center;">
                            <div style="font-size:18px; color:${isFounded ? 'var(--green)' : 'var(--cyan)'};">
                                <i class="fa-solid ${sec.icon}"></i>
                            </div>
                            <div>
                                <b class="text-xs color-main" style="font-size:12px;">${sec.name}</b>
                                <div class="sub-label" style="font-size:8px; color:#94a3b8;">${sec.tag}</div>
                            </div>
                        </div>
                        <span class="tag-badge ${isFounded ? 'bg-tag-green' : (isProgressComplete ? 'bg-tag-cyan' : 'bg-tag-dark')}" style="font-size:8px;">
                            ${isFounded ? 'УЧРЕЖДЕНА ✓' : (isProgressComplete ? 'ГОТОВА К ЗАПУСКУ' : 'В ПРОЦЕССЕ')}
                        </span>
                    </div>

                    <div class="sub-label my-2" style="font-size:9.5px; line-height:1.35; color:#cbd5e1;">
                        ${sec.desc}
                    </div>

                    <div class="p-2 mb-2" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.06); font-size:9px;">
                        <div class="flex-between mb-1">
                            <span>Готовых объектов:</span>
                            <b class="${isProgressComplete ? 'color-green' : 'color-amber'}">${count} из ${target} шт. (Ур. ${sec.minLevel}+)</b>
                        </div>
                        <div class="flex-between mb-1">
                            <span>Бонус к выручке:</span>
                            <b class="color-green font-bold">+${sec.bonusPct}%</b>
                        </div>
                        <div class="flex-between">
                            <span>Уставной капитал:</span>
                            <b class="${canAfford || isFounded ? 'color-cyan' : 'color-red'} font-bold">${sec.charterCost.toLocaleString()} ₽</b>
                        </div>
                    </div>

                    ${isFounded ? `
                        <button class="btn btn-dark btn-sm w-full opacity-70" disabled style="font-size:10px;">
                            <i class="fa-solid fa-circle-check color-green mr-1"></i> Синдикат действует (+${sec.bonusPct}% к кассе)
                        </button>
                    ` : `
                        <button onclick="PhoneBusiness.foundCorporationAction('${sec.id}')" class="btn ${canFound ? 'btn-green' : 'btn-dark opacity-50'} btn-sm w-full" ${canFound ? '' : 'disabled'} style="font-size:10px; font-weight:800;">
                            ${isProgressComplete 
                                ? (canAfford ? `Учредить корпорацию (${sec.charterCost.toLocaleString()} ₽)` : `Не хватает ${(sec.charterCost - cash).toLocaleString()} ₽`)
                                : `Требуется ещё ${target - count} объекта Ур. ${sec.minLevel}+`
                            }
                        </button>
                    `}
                </div>
            `;
        });

        container.innerHTML = `
            <div class="glass-card mb-3 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.15), #090e18); border-color:var(--cyan);">
                <div style="font-size:26px; margin-bottom:4px;">🏛️</div>
                <b class="text-xs color-cyan" style="font-size:13px;">КОРПОРАТИВНЫЙ ХОЛДИНГ ПЕРЕКУПА</b>
                <div class="sub-label mt-1 mb-2" style="font-size:9.5px;">
                    Объединяйте ваши предприятия в отраслевые союзы для получения колоссального бонуса к ежедневной прибыли.
                </div>
                <div class="flex-between p-2" style="background:#050914; border-radius:8px; border:1px solid rgba(0,242,254,0.25);">
                    <span class="text-xs">Активный бонус синергии:</span>
                    <b class="color-green" style="font-size:14px;">+${totalCorpSynergyPct}%</b>
                </div>
            </div>

            ${sectorsHtml}
        `;
    },

    foundCorporationAction(sectorId) {
        if (this._corpActionPending) return;
        this.ensureState();

        const sec = this.CORPORATE_SECTORS.find(s => s.id === sectorId);
        if (!sec) return;

        const founded = window.state?.player?.foundedCorporations || [];
        if (founded.includes(sec.id)) return showToast("Корпорация уже учреждена!");

        const businesses = window.state?.businesses || [];
        const sectorBizList = businesses.filter(b => sec.bizIds.includes(b.id));
        const ownedInSector = sectorBizList.filter(b => b.level >= sec.minLevel);

        if (ownedInSector.length < sec.minPoints) {
            return showToast(`Нужно минимум ${sec.minPoints} объекта Ур. ${sec.minLevel}+!`);
        }

        const cash = Number(window.state?.player?.cash) || 0;
        if (cash < sec.charterCost) {
            return showToast(`Не хватает ${sec.charterCost.toLocaleString()} ₽ на уставной капитал!`);
        }

        this._corpActionPending = true;
        try {
            window.state.player.cash -= sec.charterCost;
            window.state.player.foundedCorporations.push(sec.id);

            if (typeof logBankTransaction === 'function') {
                logBankTransaction(`Учреждение: ${sec.name}`, sec.charterCost, false);
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }

            if (typeof openVerdictModal === 'function') {
                openVerdictModal(
                    "КОРПОРАЦИЯ УЧРЕЖДЕНА! 🏛️",
                    `Поздравляем! Вы создали <b>«${sec.name}»</b>!\nСинергия предприятий активирована: <b>+${sec.bonusPct}%</b> постоянной надбавки к выручке!`,
                    true
                );
            } else {
                showToast(`🎉 «${sec.name}» успешно создана! +${sec.bonusPct}% к выручке!`);
            }

            this.render(document.getElementById('phoneAppContainer'));
        } finally {
            this._corpActionPending = false;
        }
    },

    // ========================================================
    // 3. КАБИНЕТ УПРАВЛЕНИЯ ТОЧКОЙ
    // ========================================================
    renderPointCabinet(container, bizId) {
        const b = (window.state.businesses || []).find(x => x && x.id === bizId);
        if (!b) return this.closePointCabinet();

        const curIncome = this.getBizIncomeWithBonuses(b);
        const cash = Math.floor(b.stored || 0);
        const stock = Math.round(b.stock || 0);
        const upgradeCost = Math.round((b.cost || 0) * Math.pow(1.65, b.level || 1));
        const isMaxed = b.level >= 5;

        const supportsFleet = Boolean(window.BUSINESS_FLEET_REQUIREMENTS && window.BUSINESS_FLEET_REQUIREMENTS[b.id]);
        let fleetVehicles = [];
        try {
            fleetVehicles = supportsFleet && window.BusinessFleetModule && typeof window.BusinessFleetModule.getAssignedVehicles === 'function' ? (window.BusinessFleetModule.getAssignedVehicles(b.id) || []) : [];
        } catch (e) {
            fleetVehicles = [];
        }

        const sub = this.cabinetSubTab || 'overview';

        let workshopHtml = '';
        if (sub === 'workshop') {
            const indUpgrades = this._getIndividualUpgrades(b.id);
            if (indUpgrades.length === 0) {
                workshopHtml = `<div class="sub-label text-center py-4">Для этого объекта модернизация оборудования не предусмотрена.</div>`;
            } else {
                indUpgrades.forEach(upg => {
                    const curLvl = Number(b.workshop?.[upg.id]) || 0;
                    const cost = Math.round(upg.baseCost * Math.pow(upg.costMul || 1.8, curLvl));
                    const isUpgMaxed = curLvl >= (upg.maxLevel || 3);
                    const canAfford = (window.state?.player?.cash || 0) >= cost;
                    const bonusPercent = Number(upg.bonusPct) || 15;

                    let actionBtn = '';
                    if (isUpgMaxed) {
                        actionBtn = '<button class="btn btn-dark btn-sm w-full opacity-60" disabled style="font-size:9px; padding:4px;">Максимальный уровень ✓</button>';
                    } else {
                        actionBtn = '<button onclick="PhoneBusiness.upgradeIndividualBranch(\'' + b.id + '\', \'' + upg.id + '\')" class="btn ' + (canAfford ? 'btn-cyan' : 'btn-dark opacity-50') + ' btn-sm w-full" ' + (canAfford ? '' : 'disabled') + ' style="font-size:9.5px; padding:6px 8px; font-weight:700;">Улучшить (+' + bonusPercent + '% к кассе) — ' + cost.toLocaleString() + ' ₽</button>';
                    }

                    workshopHtml += `
                        <div class="glass-card mb-2 p-2" style="background:#050914; border-left:3px solid var(--cyan);">
                            <div class="flex-between mb-1">
                                <b class="text-xs color-cyan" style="font-size:11px;">
                                    <i class="fa-solid ${upg.icon || 'fa-bolt'} mr-1"></i> ${upg.name}
                                </b>
                                <span class="tag-badge ${isUpgMaxed ? 'bg-tag-green' : 'bg-tag-cyan'}" style="font-size:7.5px;">
                                    ${curLvl}/${upg.maxLevel || 3} УР
                                </span>
                            </div>
                            <div class="sub-label mb-2" style="font-size:9px; line-height:1.3;">${upg.desc}</div>
                            ${actionBtn}
                        </div>
                    `;
                });
            }
        }

        let staffHtml = '';
        if (sub === 'staff') {
            this.pointStaffCatalog.forEach(st => {
                const isHired = Boolean(b.staff?.[st.id]);
                const canAfford = (window.state?.player?.cash || 0) >= st.salary;

                staffHtml += `
                    <div class="glass-card mb-2 p-2 flex-between" style="background:#050914; border-left:3px solid var(--purple);">
                        <div style="flex:1; min-width:0; margin-right:8px;">
                            <div class="flex-between mb-1">
                                <b class="text-xs color-purple" style="font-size:11px;">
                                    <i class="fa-solid ${st.icon} mr-1"></i> ${st.name}
                                </b>
                                <span class="tag-badge ${isHired ? 'bg-tag-green' : 'bg-tag-dark'}" style="font-size:7.5px;">
                                    ${isHired ? 'В ШТАТЕ ✓' : 'НЕ НАНЯТ'}
                                </span>
                            </div>
                            <div class="sub-label" style="font-size:9px; line-height:1.25;">${st.desc}</div>
                            <div class="sub-label mt-1" style="font-size:8.5px; color:#c084fc;">
                                Оклад: <b>${st.salary.toLocaleString()} ₽/мес</b>
                            </div>
                        </div>

                        <div>
                            ${isHired ? `
                                <button class="btn btn-dark btn-sm opacity-60" disabled style="font-size:9px; padding:5px 8px;">Работает</button>
                            ` : `
                                <button onclick="PhoneBusiness.hirePointStaff('${b.id}', '${st.id}')" class="btn ${canAfford ? 'btn-purple' : 'btn-dark opacity-50'} btn-sm btn-auto" ${canAfford ? '' : 'disabled'} style="font-size:9.5px; padding:6px 10px; font-weight:700;">
                                    Нанять
                                </button>
                            `}
                        </div>
                    </div>
                `;
            });
        }

        let fleetHtml = '';
        if (sub === 'fleet') {
            if (!supportsFleet) {
                fleetHtml = `<div class="sub-label text-center py-4">Этот вид бизнеса не использует коммерческий автопарк.</div>`;
            } else {
                fleetHtml = `
                    <div class="glass-card mb-2 p-2 text-center" style="background:#090e18;">
                        <b class="text-xs color-amber block mb-1">Автопарк точки: ${fleetVehicles.length} авто на балансе</b>
                        <div class="sub-label mb-2" style="font-size:9px;">Машины приносят ежедневную выручку и синергию марок.</div>
                        <button onclick="BusinessFleetModule.renderFleetManagerModal('${b.id}')" class="btn btn-amber btn-sm w-full font-bold">
                            <i class="fa-solid fa-truck-ramp-box mr-1"></i> Открыть диспетчерскую автопарка
                        </button>
                    </div>
                `;
            }
        }

        let overviewHtml = '';
        if (sub === 'overview') {
            overviewHtml = `
                <div class="grid-2 mb-2" style="gap:6px;">
                    <div class="glass-card p-2 text-center" style="background:#090e18;">
                        <div class="sub-label" style="font-size:9px;">Накоплено в кассе:</div>
                        <div class="price-val color-amber my-1" style="font-size:16px;">${cash.toLocaleString()} ₽</div>
                        <button onclick="PhoneBusiness.collectPointCash('${b.id}')" class="btn btn-green btn-sm w-full" ${cash <= 0 ? 'disabled' : ''} style="font-size:9px; padding:4px;">
                            Снять кассу
                        </button>
                    </div>

                    <div class="glass-card p-2 text-center" style="background:#090e18;">
                        <div class="sub-label" style="font-size:9px;">Склад сырья (${stock}%):</div>
                        <div class="rp-bar-bg my-1" style="height:6px;">
                            <div class="rp-bar-fill fill-hunger" style="width:${Math.min(100, stock)}%;"></div>
                        </div>
                        <button onclick="PhoneBusiness.buySupplies('${b.id}')" class="btn btn-cyan btn-sm w-full" style="font-size:9px; padding:4px;">
                            Заказ сырья (15k ₽)
                        </button>
                    </div>
                </div>

                <div class="glass-card mb-2 p-2">
                    ${this.renderSparkline(b)}
                </div>

                ${!isMaxed ? `
                    <button onclick="PhoneBusiness.upgradePoint('${b.id}')" class="btn btn-green btn-sm w-full mb-2" style="font-size:10px; font-weight:700;">
                        Повысить уровень объекта до ${b.level + 1} (${upgradeCost.toLocaleString()} ₽)
                    </button>
                ` : '<div class="glass-card p-2 text-center text-xs color-green mb-2">Объект развит до максимального 5 уровня ✓</div>'}
            `;
        }

        container.innerHTML = `
            <div class="glass-card mb-2 p-2 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0,230,118,0.15), #090e18); border-color:var(--green);">
                <div class="flex-between mb-1">
                    <div class="flex-gap" style="align-items:center;">
                        <div style="font-size:18px; color:var(--green);">${this._iconForBiz(b.id)}</div>
                        <div class="text-left">
                            <b class="text-xs color-green" style="font-size:12px;">${b.customName || b.name}</b>
                            <div class="sub-label" style="font-size:8.5px;">Доход: <b>+${curIncome.toLocaleString()} ₽/д</b> • Ур. ${b.level}/5</div>
                        </div>
                    </div>
                    <button onclick="PhoneBusiness.openCustomizeModal('${b.id}')" class="btn btn-dark btn-sm btn-auto" style="font-size:8.5px; padding:3px 7px;">
                        <i class="fa-solid fa-pen"></i> Бренд
                    </button>
                </div>
            </div>

            <div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap:3px;">
                <button onclick="PhoneBusiness.setCabinetSubTab('overview')" class="btn ${sub === 'overview' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:5px 1px;">
                    <i class="fa-solid fa-chart-pie"></i> Обзор
                </button>
                <button onclick="PhoneBusiness.setCabinetSubTab('workshop')" class="btn ${sub === 'workshop' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:5px 1px;">
                    <i class="fa-solid fa-screwdriver-wrench"></i> Цех точки
                </button>
                <button onclick="PhoneBusiness.setCabinetSubTab('staff')" class="btn ${sub === 'staff' ? 'btn-purple' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:5px 1px;">
                    <i class="fa-solid fa-users"></i> Штат
                </button>
                <button onclick="PhoneBusiness.setCabinetSubTab('fleet')" class="btn ${sub === 'fleet' ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:5px 1px;" ${!supportsFleet ? 'disabled' : ''}>
                    <i class="fa-solid fa-truck"></i> Парк
                </button>
            </div>

            ${overviewHtml}
            ${workshopHtml}
            ${staffHtml}
            ${fleetHtml}
        `;

        if (sub === 'overview') {
            requestAnimationFrame(() => {
                try { this.drawSparkline(b); } catch (e) {}
            });
        }
    },

    upgradeIndividualBranch(bizId, branchId) {
        if (this._individualUpgradePending) return;
        const b = (window.state.businesses || []).find(x => x && x.id === bizId);
        if (!b) return;

        const indUpgrades = this._getIndividualUpgrades(bizId);
        const upg = indUpgrades.find(u => u.id === branchId);
        if (!upg) return;

        if (!b.workshop || typeof b.workshop !== 'object' || Array.isArray(b.workshop)) b.workshop = {};
        const curLvl = Number(b.workshop[branchId]) || 0;
        if (curLvl >= (upg.maxLevel || 3)) return showToast("Достигнут максимум прокачки!");

        const cost = Math.round(upg.baseCost * Math.pow(upg.costMul || 1.8, curLvl));
        const cash = Number(window.state?.player?.cash) || 0;

        if (cash < cost) return showToast(`Не хватает ${cost.toLocaleString()} ₽!`);

        this._individualUpgradePending = true;
        try {
            window.state.player.cash -= cost;
            b.workshop[branchId] = curLvl + 1;

            if (typeof logBankTransaction === 'function') {
                logBankTransaction(`Цех точки ${b.customName || b.name}: ${upg.name}`, cost, false);
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
            showToast(`✓ Улучшено: «${upg.name}» (Ур. ${curLvl + 1})!`);

            const content = document.getElementById('bizTabContent');
            if (content && this.selectedBizId) {
                this.renderPointCabinet(content, this.selectedBizId);
            } else {
                this.render(document.getElementById('phoneAppContainer'));
            }
        } finally {
            this._individualUpgradePending = false;
        }
    },

    hirePointStaff(bizId, staffId) {
        const b = (window.state?.businesses || []).find(x => x && x.id === bizId);
        if (!b) return;

        const st = this.pointStaffCatalog.find(s => s.id === staffId);
        if (!st) return;

        if (!b.staff || typeof b.staff !== 'object' || Array.isArray(b.staff)) b.staff = {};
        if (b.staff[staffId]) return showToast("Специалист уже работает на этом объекте!");

        const cost = st.salary;
        const cash = Number(window.state?.player?.cash) || 0;
        if (cash < cost) return showToast(`Не хватает ${cost.toLocaleString()} ₽ на первый оклад!`);

        window.state.player.cash -= cost;
        b.staff[staffId] = true;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Найм: ${st.name} в «${b.customName || b.name}»`, cost, false);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
        showToast(`✅ ${st.name} принят на работу в «${b.customName || b.name}»!`);

        const content = document.getElementById('bizTabContent');
        if (content && this.selectedBizId) {
            this.renderPointCabinet(content, this.selectedBizId);
        } else {
            this.render(document.getElementById('phoneAppContainer'));
        }
    },

    renderTendersTab(container) {
        const tenders = window.BUSINESS_TENDERS_CATALOG || [];
        const curDay = window.state?.player?.day || 1;
        const activeTenders = window.state?.player?.activeTenders || [];

        let html = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.12), #090e18); border-color: var(--cyan);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-file-signature"></i> Корпоративные B2B Тендеры</b>
                    <span class="tag-badge bg-tag-cyan">Госзакупки</span>
                </div>
                <div class="sub-label" style="font-size:9.5px; line-height:1.35;">
                    Заключайте контракты на обслуживание автопарков! Получайте мгновенный аванс и фиксированный буст к выручке.
                </div>
            </div>
        `;

        if (tenders.length === 0) {
            html += `<div class="sub-label text-center py-4">Актуальных тендеров пока нет.</div>`;
            container.innerHTML = html;
            return;
        }

        tenders.forEach(tnd => {
            const activeContract = activeTenders.find(t => t && t.id === tnd.id && t.expiresDay >= curDay);
            const isSigned = !!activeContract;
            const daysLeft = isSigned ? Math.max(0, activeContract.expiresDay - curDay) : 0;

            const targetBiz = (window.state?.businesses || []).find(b => b && b.id === tnd.targetBiz);
            const isBizOwned = targetBiz && targetBiz.level > 0;

            let assignedVehicles = [];
            try {
                assignedVehicles = window.BusinessFleetModule && typeof window.BusinessFleetModule.getAssignedVehicles === 'function' ? (window.BusinessFleetModule.getAssignedVehicles(tnd.targetBiz) || []) : [];
            } catch (e) {
                assignedVehicles = [];
            }

            const req = tnd.requirements || {};
            let satisfiesCount = assignedVehicles.length >= (req.minFleetCount || 1);
            let satisfiesMreo = true;
            if (req.requireMreo) {
                satisfiesMreo = assignedVehicles.filter(c => c && c.commercialRegistered).length >= (req.minFleetCount || 1);
            }
            let satisfiesCondition = true;
            if (req.minCondition) {
                satisfiesCondition = assignedVehicles.every(c => (c.condition || 100) >= req.minCondition);
            }

            const canSign = isBizOwned && satisfiesCount && satisfiesMreo && satisfiesCondition && !isSigned;

            html += `
                <div class="glass-card mb-2 p-2" style="border-left: 3px solid ${isSigned ? 'var(--green)' : (canSign ? 'var(--cyan)' : 'rgba(255,255,255,0.15)')};">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-main" style="font-size:11.5px;">${tnd.title}</b>
                        <span class="tag-badge ${isSigned ? 'bg-tag-green' : 'bg-tag-amber'}">
                            ${isSigned ? `АКТИВЕН (${daysLeft} дн.)` : `+${Math.round((tnd.incomeMultiplier - 1) * 100)}% К КАССЕ`}
                        </span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9.5px; line-height:1.35;">${tnd.desc}</div>

                    <div class="p-2 mb-2" style="background:#050914; border-radius:6px; font-size:9px;">
                        <div class="flex-between mb-1">
                            <span>Требуемый бизнес:</span>
                            <b class="${isBizOwned ? 'color-green' : 'color-red'}">${targetBiz ? targetBiz.name : tnd.targetBiz} ${isBizOwned ? '✓' : '(Не куплен)'}</b>
                        </div>
                        <div class="flex-between mb-1">
                            <span>Машин во флоте:</span>
                            <b class="${satisfiesCount ? 'color-green' : 'color-amber'}">${assignedVehicles.length} из ${req.minFleetCount || 1} шт.</b>
                        </div>
                        ${req.requireMreo ? `
                            <div class="flex-between mb-1">
                                <span>Учёт МРЭО на юрлицо:</span>
                                <b class="${satisfiesMreo ? 'color-green' : 'color-red'}">${satisfiesMreo ? 'Выполнен ✓' : 'Требуется регистрация'}</b>
                            </div>
                        ` : ''}
                        <div class="flex-between">
                            <span>Аванс при подписании:</span>
                            <b class="color-green font-bold">+${tnd.advanceRewardCash.toLocaleString()} ₽ & ${tnd.rewardStars} ⭐</b>
                        </div>
                    </div>

                    ${isSigned ? `
                        <button class="btn btn-dark btn-sm w-full opacity-60" disabled>Контракт в исполнении</button>
                    ` : `
                        <button onclick="PhoneBusiness.signTenderContract('${tnd.id}')" class="btn ${canSign ? 'btn-green' : 'btn-dark opacity-50'} btn-sm w-full" ${canSign ? '' : 'disabled'}>
                            ${canSign ? 'Подписать госконтракт ✍️' : 'Условия тендера не выполнены'}
                        </button>
                    `}
                </div>
            `;
        });

        container.innerHTML = html;
    },

    signTenderContract(tenderId) {
        if (this._tenderPending) return;
        const tenders = window.BUSINESS_TENDERS_CATALOG || [];
        const tnd = tenders.find(t => t.id === tenderId);
        if (!tnd) return;

        this._tenderPending = true;
        try {
            const curDay = window.state?.player?.day || 1;
            if (!Array.isArray(window.state.player.activeTenders)) window.state.player.activeTenders = [];

            window.state.player.activeTenders.push({
                id: tnd.id,
                targetBiz: tnd.targetBiz,
                title: tnd.title,
                incomeMultiplier: tnd.incomeMultiplier,
                startedDay: curDay,
                expiresDay: curDay + (tnd.bonusDurationDays || 5)
            });

            window.state.player.cash = (window.state.player.cash || 0) + (tnd.advanceRewardCash || 0);
            window.state.player.stars = (window.state.player.stars || 0) + (tnd.rewardStars || 0);

            if (typeof logBankTransaction === 'function') {
                logBankTransaction(`Аванс по B2B тендеру: ${tnd.title}`, tnd.advanceRewardCash, true);
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }

            if (typeof openVerdictModal === 'function') {
                openVerdictModal(
                    "ГОСКОНТРАКТ ПОДПИСАН! ✍️",
                    `Вы выиграли тендер «<b>${tnd.title}</b>»!\nАванс: <b>+${tnd.advanceRewardCash.toLocaleString()} ₽</b> & <b>+${tnd.rewardStars} ⭐</b> зачислен на счёт.\nВыручка предприятия увеличена на <b>+${Math.round((tnd.incomeMultiplier - 1) * 100)}%</b> на ${tnd.bonusDurationDays} дней.`,
                    true,
                    tnd.advanceRewardCash
                );
            } else {
                showToast(`✓ Контракт подписан: +${tnd.advanceRewardCash.toLocaleString()} ₽!`);
            }

            this.render(document.getElementById('phoneAppContainer'));
        } finally {
            this._tenderPending = false;
        }
    },

    // ========================================================
    // ДЕЙСТВИЯ, КАССА И КРИЗИСЫ
    // ========================================================
    _maybeTriggerCrisisEvent() {
        const events = this.CRISIS_EVENTS;
        if (!Array.isArray(events) || events.length === 0) return false;

        const ownedBiz = (window.state?.businesses || []).filter(b => b && b.level > 0);
        if (ownedBiz.length === 0) return false;

        if (Math.random() > 0.12) return false;

        const rollEv = events[Math.floor(Math.random() * events.length)];
        this.openCrisisModal(rollEv);
        return true;
    },

    openCrisisModal(crisis) {
        let modal = document.getElementById('modalBizCrisis');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalBizCrisis';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        let optionsHtml = '';
        (crisis.options || []).forEach((opt, idx) => {
            optionsHtml += `
                <button onclick="PhoneBusiness.resolveCrisisAction(${idx}, '${crisis.id}')" class="btn btn-dark btn-sm w-full mb-2 text-left" style="padding: 8px 10px; font-size: 10px; line-height: 1.35;">
                    <i class="fa-solid fa-chevron-right color-cyan mr-1"></i> ${opt.text}
                </button>
            `;
        });

        modal.innerHTML = `
            <div class="modal-box text-center" style="max-width: 410px; border-color: var(--amber); background: radial-gradient(circle at 50% 0%, #1c1524 0%, #070a10 85%);">
                <div class="radar-spinner-ring mb-2" style="border-top-color: var(--amber); border-right-color: var(--red); margin: 0 auto 10px auto;">
                    <div class="radar-spinner-center" style="font-size:24px;">🚨</div>
                </div>

                <div class="modal-glow-badge mb-1" style="color:var(--amber); border-color:var(--amber); background:rgba(255,179,0,0.1); display:inline-block;">
                    ВНЕПЛАНОВАЯ СИТУАЦИЯ
                </div>

                <h3 class="font-bold mb-1 color-amber" style="font-size:15px;">${crisis.title}</h3>
                <p class="sub-label mb-3" style="font-size:10.5px; line-height:1.4; color:#cbd5e1; padding: 0 4px;">
                    ${crisis.desc}
                </p>

                <div class="space-y-1">
                    ${optionsHtml}
                </div>
            </div>
        `;

        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalBizCrisis', { closeOthers: true });
        } else {
            modal.classList.add('active');
        }
        if (window.AudioFx) { window.AudioFx.play('error'); window.AudioFx.haptic('warning'); }
    },

    resolveCrisisAction(optIdx, crisisId) {
        const events = this.CRISIS_EVENTS;
        const crisis = events.find(e => e.id === crisisId);
        if (!crisis || !crisis.options || !crisis.options[optIdx]) return;

        const opt = crisis.options[optIdx];
        const p = window.state?.player || {};

        if (opt.costCash && (p.cash || 0) < opt.costCash) {
            return showToast(`Не хватает ${opt.costCash.toLocaleString()} ₽!`);
        }
        if (opt.costConn && (p.connections || 0) < opt.costConn) {
            return showToast(`Не хватает связей 🤝 с Решалой!`);
        }
        if (opt.reqBiz) {
            const hasBiz = (window.state?.businesses || []).some(b => b.id === opt.reqBiz && b.level > 0);
            if (!hasBiz) return showToast("У вас нет службы эвакуации!");
        }

        if (opt.costCash) {
            p.cash -= opt.costCash;
            if (typeof logBankTransaction === 'function') logBankTransaction(`Инцидент: ${crisis.title}`, opt.costCash, false);
        }
        if (opt.costConn) p.connections -= opt.costConn;
        if (opt.penaltyMood) p.mood = Math.max(10, (p.mood || 85) - opt.penaltyMood);
        if (opt.bonusKarma) p.karma = Math.min(100, (p.karma || 50) + opt.bonusKarma);

        if (typeof ModalManager !== 'undefined') ModalManager.close('modalBizCrisis');
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
        showToast("Инцидент благополучно урегулирован!");
    },

    upgradePoint(bizId) {
        if (this._upgradePending) return;
        this.ensureState();

        const b = (window.state?.businesses || []).find(x => x && x.id === bizId);
        if (!b) return;

        const isNew = b.level === 0;

        if (isNew) {
            const legal = window.state?.player?.legalEntity || { type: 'none' };
            const docs = window.state?.player?.documents || {};
            const hasIP = legal.type === 'ip' || Boolean(docs.ipRegistered) || Boolean(window.state?.player?.hasIP);
            const hasOOO = legal.type === 'ooo' || Boolean(docs.oooRegistered) || Boolean(window.state?.player?.hasOOO);

            if (!hasIP && !hasOOO) {
                if (typeof showToast === 'function') {
                    showToast('⚠️ Для покупки бизнеса необходимо оформить ИП или ООО в Госуслугах!');
                }
                if (window.AudioFx) { window.AudioFx.play('error'); window.AudioFx.haptic('warning'); }
                if (window.PhoneManager && typeof window.PhoneManager.openApp === 'function') {
                    window.PhoneManager.openApp('gosuslugi');
                }
                return;
            }

            const currentType = hasOOO ? 'ooo' : 'ip';
            const legalConfig = (window.LEGAL_ENTITIES && window.LEGAL_ENTITIES[currentType]) || null;

            if (legalConfig && Array.isArray(legalConfig.allowedBusinesses) && !legalConfig.allowedBusinesses.includes(b.id)) {
                if (typeof showToast === 'function') {
                    showToast(`⚠️ Форма «${legalConfig.name || 'ИП'}» не дает права на владение этим объектом. Требуется ООО!`);
                }
                if (window.AudioFx) { window.AudioFx.play('error'); window.AudioFx.haptic('warning'); }
                return;
            }
        }

        const cost = isNew ? b.cost : Math.round(b.cost * Math.pow(1.65, b.level));
        const cash = window.state?.player?.cash || 0;

        if (cash < cost) return showToast(`Не хватает ${cost.toLocaleString()} ₽!`);

        this._upgradePending = true;
        try {
            window.state.player.cash -= cost;

            if (isNew) {
                b.level = 1;
                b.stock = 100;
                b.dna = this._generateDNA(b.id);
                b.lastTickTimestamp = Date.now();
                this._trackBizChallenge('new_biz', 1);
            } else {
                b.level += 1;
                this._trackBizChallenge('upgrade', 1);
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
            showToast(isNew ? `🎉 Открыт объект: «${b.name}»!` : `Уровень повышен до ${b.level}!`);

            this.checkAchievements();
            this.render(document.getElementById('phoneAppContainer'));
        } finally {
            this._upgradePending = false;
        }
    },

    collectAllCash() {
        if (this._collectAllPending) return;
        this._collectAllPending = true;
        try {
            this.ensureState();
            let total = 0;
            (window.state?.businesses || []).forEach(b => {
                if (b && b.level > 0 && b.stored > 0) {
                    total += Math.floor(b.stored);
                    b.stored = 0;
                    b.lastTickTimestamp = Date.now();
                }
            });
            if (total <= 0) return showToast('В кассах пусто!');

            window.state.player.cash = (window.state.player.cash || 0) + total;

            if (typeof trackQuestProgress === 'function') {
                trackQuestProgress('collect_biz', 1);
            }

            if (typeof logBankTransaction === 'function') {
                logBankTransaction('Инкассация бизнес-сети', total, true);
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
            showToast(`💰 Собрано: +${total.toLocaleString()} ₽!`);

            this._maybeTriggerCrisisEvent();
            this.render(document.getElementById('phoneAppContainer'));
        } finally {
            this._collectAllPending = false;
        }
    },

    collectPointCash(bizId) {
        if (this._collectPointPending) return;
        this._collectPointPending = true;
        try {
            const b = (window.state?.businesses || []).find(x => x && x.id === bizId);
            if (!b || b.stored <= 0) return;

            const amount = Math.floor(b.stored);
            b.stored = 0;
            b.lastTickTimestamp = Date.now();
            window.state.player.cash = (window.state.player.cash || 0) + amount;

            if (typeof trackQuestProgress === 'function') {
                trackQuestProgress('collect_biz', 1);
            }

            if (typeof logBankTransaction === 'function') {
                logBankTransaction(`Касса: ${b.customName || b.name}`, amount, true);
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
            showToast(`+${amount.toLocaleString()} ₽ из «${b.customName || b.name}»!`);

            this._maybeTriggerCrisisEvent();
            this.render(document.getElementById('phoneAppContainer'));
        } finally {
            this._collectPointPending = false;
        }
    },

    buySupplies(bizId) {
        const b = (window.state?.businesses || []).find(x => x && x.id === bizId);
        if (!b || b.level <= 0) return;
        const cost = 15000;
        if ((window.state?.player?.cash || 0) < cost) return showToast(`Нужно ${cost.toLocaleString()} ₽!`);

        window.state.player.cash -= cost;
        b.stock = b.maxStock || 100;

        if (typeof trackQuestProgress === 'function') {
            trackQuestProgress('supply_stock', 1);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('tick');
        showToast(`Сырьё пополнено до 100%`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    openCustomizeModal(bizId) {
        const b = (window.state?.businesses || []).find(x => x && x.id === bizId);
        if (!b) return;
        const newName = prompt("Введите новое название точки:", b.customName || b.name);
        if (newName && newName.trim().length >= 2) {
            b.customName = newName.trim();
            const newSlogan = prompt("Введите рекламный слоган (или оставьте пустым):", b.slogan || "");
            if (newSlogan !== null) b.slogan = newSlogan.trim();
            if (typeof saveState === 'function') saveState();
            showToast("Данные бренда обновлены");
            this.render(document.getElementById('phoneAppContainer'));
        }
    },

    renderSparkline(biz) {
        return `
            <div class="biz-spark-panel">
                <div class="biz-spark-header">
                    <span><i class="fa-solid fa-chart-line color-green"></i> Доход за 7 дней:</span>
                    <span id="sparkLabel_${biz.id}" class="biz-spark-label">—</span>
                </div>
                <canvas id="bizSpark_${biz.id}" width="360" height="45"></canvas>
            </div>
        `;
    },

    drawSparkline(biz) {
        if (!biz) return;
        const canvas = document.getElementById(`bizSpark_${biz.id}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const W = canvas.width, H = canvas.height;
        const history = (biz.incomeHistory || []).slice(-7);
        ctx.clearRect(0, 0, W, H);

        if (history.length < 2) {
            ctx.fillStyle = 'rgba(148,163,184,0.5)';
            ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('Накапливаем статистику...', W / 2, H / 2 + 3);
            return;
        }

        const maxVal = Math.max(...history, 1);
        const stepX = W / (history.length - 1);
        ctx.strokeStyle = '#00e676'; ctx.lineWidth = 2; ctx.beginPath();
        history.forEach((val, i) => {
            const x = i * stepX, y = H - 5 - (val / maxVal) * (H - 10);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
    },

    renderAchievementsBlock() {
        const unlocked = Array.isArray(window.state?.player?.businessAchievements) ? window.state.player.businessAchievements : [];
        const achRaw = this.achievements;
        const achList = Array.isArray(achRaw) ? achRaw : (achRaw && typeof achRaw === 'object' ? Object.values(achRaw) : []);
        const html = achList.map(a => {
            if (!a) return '';
            const isDone = unlocked.includes(a.id);
            return `
                <div class="p-2 mb-1 flex-between" style="background:#050914; border-radius:6px;">
                    <div>
                        <b class="text-xs ${isDone ? 'color-green' : 'color-main'}">${a.title || 'Достижение'}</b>
                        <div class="sub-label" style="font-size:8px;">${a.desc || ''}</div>
                    </div>
                    ${isDone ? '<span class="tag-badge bg-tag-green">✓</span>' : '<span class="tag-badge bg-tag-dark"><i class="fa-solid fa-lock"></i></span>'}
                </div>
            `;
        }).join('');

        return `
            <div class="glass-card mb-2 p-2">
                <b class="text-xs color-amber mb-2 block"><i class="fa-solid fa-trophy"></i> Достижения автобизнеса:</b>
                ${html}
            </div>
        `;
    },

    checkAchievements() {
        if (!window.state?.player) return;
        if (!Array.isArray(window.state.player.businessAchievements)) window.state.player.businessAchievements = [];
        const achList = this.achievements || [];
        achList.forEach(a => {
            if (!a || window.state.player.businessAchievements.includes(a.id)) return;
            try {
                if (a.cond && a.cond()) {
                    window.state.player.businessAchievements.push(a.id);
                    if (a.reward?.cash) window.state.player.cash = (window.state.player.cash || 0) + a.reward.cash;
                    if (typeof showToast === 'function') showToast(`🏆 Достижение: «${a.title}»!`);
                }
            } catch (e) {}
        });
        if (typeof saveState === 'function') saveState();
    },

    tickIncome() {
        if (!window.state?.businesses) return;
        const now = Date.now();
        let changed = false;

        window.state.businesses.forEach(b => {
            if (!b || b.level <= 0) return;

            if (!b.lastTickTimestamp || isNaN(b.lastTickTimestamp)) {
                b.lastTickTimestamp = now;
                return;
            }

            const elapsedSec = (now - b.lastTickTimestamp) / 1000;
            if (elapsedSec < 1) return;

            if (b.stock > 0) {
                b.stock = Math.max(0, b.stock - (0.005 * elapsedSec));
            }

            const dailyIncome = this.getBizIncomeWithBonuses(b);
            const incomePerSec = dailyIncome / 86400;
            const earned = elapsedSec * incomePerSec;

            if (earned > 0) {
                b.stored = (b.stored || 0) + earned;
                b.lastTickTimestamp = now;
                changed = true;
            }
        });

        const accumulated = this.getAccumulatedCash();
        const accEl = document.querySelector('.biz-summary-value.value-cyan');
        if (accEl) {
            accEl.textContent = `${accumulated.toLocaleString()} ₽`;
        }

        const collectBtn = document.querySelector('.biz-collect-btn');
        if (collectBtn) {
            collectBtn.disabled = accumulated <= 0;
        }

        if (changed && typeof saveState === 'function') {
            saveState();
        }
    },

    onNewDay() {
        if (!window.state?.player || !Array.isArray(window.state.businesses)) return;
        const curDay = window.state.player.day || 1;
        this._syncActiveBonus();
        this._tickEconomicCycle();

        if (Array.isArray(window.state.player.activeTenders)) {
            window.state.player.activeTenders = window.state.player.activeTenders.filter(t => t && t.expiresDay >= curDay);
        }

        window.state.businesses.forEach(b => {
            if (!b || b.level <= 0) return;
            const dayIncome = Math.round(this.getBizIncomeWithBonuses(b));
            if (!Array.isArray(b.incomeHistory)) b.incomeHistory = [];
            b.incomeHistory.push(dayIncome);
            if (b.incomeHistory.length > 7) b.incomeHistory = b.incomeHistory.slice(-7);
            b.lastIncomeDay = curDay;
            b.stock = Math.max(0, (b.stock || 0) - 25);
        });

        this.checkAchievements();
        if (typeof saveState === 'function') saveState();
    },

    startTickLoop() {
        if (this._tickInterval) return;
        this.tickIncome();
        this._tickInterval = setInterval(() => this.tickIncome(), 3000);
    }
};

window.PhoneBusiness = PhoneBusiness;
window.AppBusiness = PhoneBusiness;

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    PhoneBusiness.startTickLoop();
} else {
    document.addEventListener('DOMContentLoaded', () => PhoneBusiness.startTickLoop());
}
setTimeout(() => PhoneBusiness.startTickLoop(), 1000);

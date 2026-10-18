// ========================================================
// js/phone/phone-business-data.js — КОНФИГУРАЦИЯ И ДАННЫЕ БИЗНЕС-СЕТИ (v6.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ========================================================

const BusinessDataModule = {
    ECONOMIC_CYCLES: {
        boom:   { id: 'boom',   name: '📈 Экономический бум',   incomeMul: 1.30, daysLeft: 0, color: 'color-green',  desc: '+30% выручки у всех точек' },
        stable: { id: 'stable', name: '⚖️ Стабильный рынок',    incomeMul: 1.00, daysLeft: 0, color: 'color-cyan',   desc: 'Обычная выручка' },
        bust:   { id: 'bust',   name: '📉 Кризис рынка',        incomeMul: 0.70, daysLeft: 0, color: 'color-red',    desc: '-30% выручки у всех точек' }
    },

    NETWORK_MILESTONES: [
        { count: 5,  id: 'm5',  name: '🌱 Малая сеть',      bonus: '+5% к выручке',    incomeBonus: 0.05 },
        { count: 10, id: 'm10', name: '🏪 Средняя сеть',    bonus: '+10% к выручке',   incomeBonus: 0.10 },
        { count: 20, id: 'm20', name: '🏙 Мегаполис',       bonus: '+20% к выручке',   incomeBonus: 0.20 },
        { count: 30, id: 'm30', name: '🌐 Империя',         bonus: '+35% к выручке',   incomeBonus: 0.35 }
    ],

    fallbackCoverSkins: [
        { id: 'classic',   name: 'Классика',       cost: 0,      color: '#00f2fe', cssClass: '' },
        { id: 'neon_cyan', name: 'Неон Cyan',      cost: 50000,  color: '#00f2fe', cssClass: 'skin-neon-cyan' },
        { id: 'neon_pink', name: 'Neon Pink',      cost: 50000,  color: '#f43f5e', cssClass: 'skin-neon-pink' },
        { id: 'golden',    name: 'Золотая жила',   cost: 120000, color: '#ffd700', cssClass: 'skin-golden' },
        { id: 'matrix',    name: 'Matrix',         cost: 80000,  color: '#00e676', cssClass: 'skin-matrix' },
        { id: 'sunset',    name: 'Закат',          cost: 90000,  color: '#ff6b35', cssClass: 'skin-sunset' },
        { id: 'cyber',     name: 'Cyberpunk 2077', cost: 150000, color: '#fcee0a', cssClass: 'skin-cyber' },
        { id: 'royal',     name: 'Royal Purple',   cost: 200000, color: '#c084fc', cssClass: 'skin-royal' }
    ],

    fallbackStickers: [
        { id: 'none',    name: 'Без стикера', cost: 0,     icon: '' },
        { id: 'gold',    name: 'Золотой',     cost: 25000, icon: '👑' },
        { id: 'fire',    name: 'Огненный',    cost: 30000, icon: '🔥' },
        { id: 'diamond', name: 'Бриллиант',   cost: 60000, icon: '💎' },
        { id: 'skull',   name: 'Череп',       cost: 40000, icon: '💀' },
        { id: 'rocket',  name: 'Ракета',      cost: 50000, icon: '🚀' }
    ],

    DNA_LOCATIONS: [
        { id: 'center',     name: 'Центр города',    mult: 1.30, icon: '🏙',  desc: 'Премиум-локация' },
        { id: 'sleep',      name: 'Спальный район',  mult: 1.00, icon: '🏘',  desc: 'Средний поток' },
        { id: 'industrial', name: 'Промзона',        mult: 1.15, icon: '🏭',  desc: 'Рабочий контингент' },
        { id: 'highway',    name: 'Трасса М4',       mult: 0.90, icon: '🛣',  desc: 'Нестабильный график' },
        { id: 'elite',      name: 'Элитный поселок', mult: 1.45, icon: '🏰',  desc: 'VIP-клиенты' }
    ],
    DNA_TRAFFIC: [
        { id: 'high',   name: 'Высокий', mult: 1.20, icon: '🔥' },
        { id: 'medium', name: 'Средний', mult: 1.00, icon: '⚡' },
        { id: 'low',    name: 'Низкий',  mult: 0.80, icon: '🌙' }
    ],
    DNA_CONDITION: [
        { id: 'new', name: 'Новое',   mult: 1.25, icon: '✨' },
        { id: 'mid', name: 'Среднее', mult: 1.00, icon: '🔧' },
        { id: 'old', name: 'Убитое',  mult: 0.75, icon: '🏚' }
    ],
    DNA_STAFF: [
        { id: 'expert', name: 'Профи',         mult: 1.15, icon: '👨‍🔧' },
        { id: 'junior', name: 'Новички',       mult: 1.00, icon: '🧑' },
        { id: 'noname', name: 'Без персонала', mult: 0.85, icon: '👤' }
    ],

    CRISIS_EVENTS: [
        { id: 'rospotreb',  icon: '🚔', name: 'Роспотребнадзор',        desc: 'Внеплановая проверка. Взятка 80k ₽ или штраф 150k ₽ + -30% дохода на 2 дня.', bribeCost: 80000,  penalty: 150000, debuffPct: 30, debuffDays: 2 },
        { id: 'blackout',   icon: '🔌', name: 'Отключение электричества', desc: '-35% дохода на 2 дня.',                                                        bribeCost: 0,      penalty: 0,      debuffPct: 35, debuffDays: 2 },
        { id: 'hype',       icon: '📱', name: 'Хайп в соцсетях!',        desc: '+50% дохода на 3 дня!',                                                          buffPct: 50,       buffDays: 3 },
        { id: 'competitor', icon: '🏪', name: 'Открылся конкурент',       desc: '-25% дохода, пока не решите.',                                                   bribeCost: 120000, penalty: 0,      debuffPct: 25, debuffDays: 5 },
        { id: 'fire',       icon: '🔥', name: 'Пожар!',                  desc: 'Теряете всю кассу, восстановление 200k ₽.',                                     bribeCost: 200000, penalty: 'store_lost', debuffPct: 0, debuffDays: 0 },
        { id: 'inspection_pass', icon: '✅', name: 'Плановый осмотр пройден', desc: '+15% к репутации.',                                                          buffPct: 15,       buffDays: 5 }
    ],

    DAILY_BIZ_CHALLENGES: [
        { id: 'collect_5',   text: 'Собрать кассу с 5 точек',      target: 5, action: 'collect',   reward: 80000,  xp: 80 },
        { id: 'upgrade_2',   text: 'Улучшить 2 предприятия',       target: 2, action: 'upgrade',   reward: 100000, xp: 100 },
        { id: 'stock_5',     text: 'Пополнить сырьё 5 раз',        target: 5, action: 'stock',     reward: 60000,  xp: 60 },
        { id: 'no_crisis',   text: 'Избежать кризиса (решить через Решалу)', target: 1, action: 'bribe', reward: 90000, xp: 90 },
        { id: 'expand_1',    text: 'Купить новое предприятие',     target: 1, action: 'new_biz',   reward: 150000, xp: 150 }
    ],

    workshopUpgrades: [
        { id: 'equipment',   fa: 'fa-wrench',         name: 'Оснащение цеха',          desc: '+15% к выручке сети за уровень',        baseCost: 147000, costMul: 1.70, maxLevel: 3 },
        { id: 'storage',     fa: 'fa-boxes-stacked',  name: 'Склад и ёмкости',         desc: 'Вместимость сырья +50% за уровень',      baseCost: 105000, costMul: 1.60, maxLevel: 3 },
        { id: 'brand',       fa: 'fa-bullhorn',       name: 'Брендирование и реклама', desc: '+20% пассивного дохода за уровень',      baseCost: 220000, costMul: 1.80, maxLevel: 3 },
        { id: 'diagnostics', fa: 'fa-laptop-code',    name: 'Компьютерный стенд',      desc: '+10% к шансу выявить скрытые косяки',    baseCost: 310000, costMul: 1.90, maxLevel: 3 }
    ],

    staffList: [
        { id: 'mechanic',   fa: 'fa-screwdriver-wrench', name: 'Мастер-универсал',     role: 'Ремонт и слесарка',    salary: 45000, maxHired: 5, perk: '+10% к скорости ремонта' },
        { id: 'painter',    fa: 'fa-spray-can',           name: 'Колорист-маляр',       role: 'Покраска',              salary: 60000, maxHired: 3, perk: '-15% к расходу краски' },
        { id: 'manager',    fa: 'fa-user-tie',            name: 'Управляющий филиалом', role: 'Администрирование',    salary: 85000, maxHired: 2, perk: 'Автосбор кассы раз в день' },
        { id: 'accountant', fa: 'fa-calculator',          name: 'Главный бухгалтер',    role: 'Финансы и налоги',     salary: 75000, maxHired: 1, perk: '+8% к чистой выручке' }
    ],

    fleetVehicles: [
        { id: 'gazelle',     fa: 'fa-truck',          name: 'ГАЗель NEXT (Фургон)',           cost: 850000,  dailyCost: 1200, bonus: 'Доставка сырья дешевле на 30%' },
        { id: 'tow_truck',   fa: 'fa-truck-pickup',   name: 'Эвакуатор ГАЗон NEXT',           cost: 1650000, dailyCost: 2400, bonus: 'Бесплатный выезд за авто дальше 25 км' },
        { id: 'service_van', fa: 'fa-shuttle-van',    name: 'Mercedes Sprinter (Моб. сервис)', cost: 3200000, dailyCost: 4500, bonus: 'Осмотр авто на выезде без СТО' }
    ],

    achievements: [
        { id: 'first_point',  title: '🏪 Первый объект',      cond: () => window.PhoneBusiness?.countOwned() >= 1,   reward: { cash: 50000,  xp: 50 } },
        { id: 'five_points',  title: '🏙 Бизнес-империя',     cond: () => window.PhoneBusiness?.countOwned() >= 5,   reward: { cash: 250000, xp: 150 } },
        { id: 'ten_points',   title: '👑 Магнат автобизнеса', cond: () => window.PhoneBusiness?.countOwned() >= 10,  reward: { cash: 1000000, stars: 25, xp: 500 } },
        { id: 'cash_100k',    title: '💰 Первая сотня',       cond: () => window.PhoneBusiness?.getAccumulatedCash() >= 100000,   reward: { cash: 30000, xp: 40 } },
        { id: 'cash_1m',      title: '💎 Миллион в кассах',   cond: () => window.PhoneBusiness?.getAccumulatedCash() >= 1000000,  reward: { cash: 200000, xp: 200 } },
        { id: 'all_workshop', title: '🔧 Полное оснащение',   cond: () => window.PhoneBusiness?.isWorkshopMaxed(),                reward: { cash: 500000, stars: 15, xp: 300 } },
        { id: 'corporation',  title: '🏢 Корпорация',         cond: () => window.PhoneBusiness?._getCorporationBonus() >= 0.40,   reward: { cash: 750000, stars: 30, xp: 400 } },
        { id: 'first_p2p',    title: '💸 Первая продажа бизнеса', cond: () => (window.state?.player?.businessSalesCount || 0) >= 1, reward: { cash: 100000, xp: 100 } },

        {
            id: 'plate_collector',
            title: '🏷️ Коллекционер номеров',
            desc: 'Соберите 10 госномеров в инвентаре',
            targetCount: 10,
            progressFn: () => (window.PlatesManager ? window.PlatesManager.getAllPlates().length : 0),
            reward: { cash: 150000, stars: 10, xp: 150 }
        },
        {
            id: 'plate_legend',
            title: '🏆 Властелин спецсерий',
            desc: 'Имейте 3 номера из серий АМР, ЕКХ или 777',
            targetCount: 3,
            progressFn: () => {
                if (!window.PlatesManager) return 0;
                const plates = window.PlatesManager.getAllPlates();
                return plates.filter(p => {
                    const n = String(p.number || '').toUpperCase();
                    return n.includes('АМР') || n.includes('ЕКХ') || n.includes('777');
                }).length;
            },
            reward: { cash: 300000, stars: 25, xp: 300 }
        },
        {
            id: 'brand_bmw_lover',
            title: '🚗 Фанат BMW',
            desc: 'Продайте 5 машин BMW',
            targetCount: 5,
            progressFn: () => (window.state?.player?.brandSalesCount?.bmw || 0),
            reward: { cash: 200000, stars: 5, xp: 120 }
        },
        {
            id: 'brand_vaz_master',
            title: '🔧 Мастер ВАЗа',
            desc: 'Продайте 10 машин ВАЗ',
            targetCount: 10,
            progressFn: () => (window.state?.player?.brandSalesCount?.vaz || 0),
            reward: { cash: 180000, stars: 5, xp: 100 }
        },
        {
            id: 'brand_toyota_king',
            title: '👑 Король Toyota',
            desc: 'Продайте 5 машин Toyota',
            targetCount: 5,
            progressFn: () => (window.state?.player?.brandSalesCount?.toyota || 0),
            reward: { cash: 200000, stars: 5, xp: 120 }
        },
        {
            id: 'brand_collector',
            title: '🏆 Коллекционер брендов',
            desc: 'Продайте машины 5 разных брендов',
            targetCount: 5,
            progressFn: () => {
                const bsc = window.state?.player?.brandSalesCount || {};
                return Object.values(bsc).filter(v => v > 0).length;
            },
            reward: { cash: 400000, stars: 15, xp: 250 }
        },
        {
            id: 'vip_dealer',
            title: '💎 VIP-Дилер',
            desc: 'Продайте 3 машины VIP-покупателям',
            targetCount: 3,
            progressFn: () => (window.state?.player?.vipSalesCount || 0),
            reward: { cash: 350000, stars: 20, xp: 200 }
        },
        {
            id: 'clean_dealer',
            title: '✨ Честный делец',
            desc: 'Закройте 10 чистых сделок без юридических проблем',
            targetCount: 10,
            progressFn: () => (window.state?.player?.cleanSalesCount || 0),
            reward: { cash: 250000, stars: 10, xp: 200 }
        }
    ]
};

window.BusinessDataModule = BusinessDataModule;
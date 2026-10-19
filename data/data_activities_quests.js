// ========================================================
// data_activities_quests.js — КВЕСТЫ, НАГРАДЫ, ЦЕЛИ (v2.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Изолированный модуль: награды, квесты, цели, покупатели,
// контракты ПодКлюч, новости рынка, события-претензии,
// B2B тендеры для бизнеса, кризис-менеджмент и недельные испытания.
// ========================================================

(function() {
    'use strict';

    try {
        // --------------------------------------------------------
        // 1. ЕЖЕДНЕВНЫЕ НАГРАДЫ
        // --------------------------------------------------------
        const DAILY_REWARDS_CONFIG = [
            { day: 1, title: "+25k ₽ & 15 ⛽", reward: { cash: 25000, fuel: 15 } },
            { day: 2, title: "+50k ₽ & 1 🤝 & Талон Штрафстоянки", reward: { cash: 50000, connections: 1, freeImpoundPasses: 1 } },
            { day: 3, title: "+90k ₽ & 10 ⭐ & +100 XP", reward: { cash: 90000, stars: 10, xp: 100 } },
            { day: 4, title: "+150k ₽ & 2 🤝", reward: { cash: 150000, connections: 2 } },
            { day: 5, title: "+250k ₽ & 20 ⭐ & Сканер Launch", reward: { cash: 250000, stars: 20, tool: "obd_launch" } },
            { day: 6, title: "+400k ₽ & Полный Бак & +250 XP", reward: { cash: 400000, fuel: 100, xp: 250 } },
            { day: 7, title: "+750k ₽ & 30 ⭐ & Номер Х777ХХ 77", reward: { cash: 750000, stars: 30, specialPlate: "Х777ХХ 77" } }
        ];

        // --------------------------------------------------------
        // 2. ЕЖЕДНЕВНЫЕ КВЕСТЫ (РАСШИРЕННЫЙ ПУЛ)
        // --------------------------------------------------------
        const DAILY_QUESTS_POOL = [
            { id: "q_inspect",       text: "Осмотреть толщиномером 2 авто на рынке",      target: 2, actionType: "gauge_check",     reward: 45000,  rewardXp: 40 },
            { id: "q_race",          text: "Выиграть заезд 402м в Стрите",                target: 1, actionType: "win_drag",        reward: 65000,  rewardXp: 45 },
            { id: "q_biz",           text: "Собрать кассу с предприятий сети",           target: 1, actionType: "collect_biz",     reward: 35000,  rewardXp: 30 },
            { id: "q_buy",           text: "Выкупить 1 автомобиль на авторынке",          target: 1, actionType: "buy_car",         reward: 55000,  rewardXp: 50 },
            { id: "q_sell",          text: "Успешно продать 1 авто клиенту у капота",    target: 1, actionType: "sell_car",        reward: 85000,  rewardXp: 60 },
            { id: "q_obd",           text: "Просканировать ЭБУ автомобиля через OBD2",   target: 1, actionType: "obd_scan",        reward: 40000,  rewardXp: 35 },
            { id: "q_presale",       text: "Сделать предпродажный детейлинг или полировку", target: 1, actionType: "presale_mod", reward: 50000, rewardXp: 45 },
            { id: "q_drift",         text: "Завершить квалификационный заезд в Дрифте",  target: 1, actionType: "drift_run",       reward: 50000,  rewardXp: 45 },
            { id: "q_fleet_service", text: "Провести ТО коммерческого авто на линии",     target: 1, actionType: "fleet_service",   reward: 60000,  rewardXp: 40 },
            { id: "q_synergy",       text: "Активировать синергию марок в автопарке",     target: 1, actionType: "fleet_synergy",   reward: 90000,  rewardXp: 65 },
            { id: "q_stock_supply",  text: "Пополнить сырьевой склад предприятий",        target: 1, actionType: "supply_stock",    reward: 45000,  rewardXp: 35 },
            { id: "q_hot_deal",      text: "Перехватить срочный выкуп (Hot Deal)",        target: 1, actionType: "intercept_deal",  reward: 70000,  rewardXp: 55 },
            { id: "q_mreo_reg",      text: "Оформить автомобиль на компанию в МРЭО",      target: 1, actionType: "mreo_register",   reward: 75000,  rewardXp: 50 }
        ];

        // --------------------------------------------------------
        // 2.1. НЕДЕЛЬНЫЕ ИСПЫТАНИЯ (WEEKLY CHALLENGES)
        // --------------------------------------------------------
        const WEEKLY_CHALLENGES_POOL = [
            {
                id: "w_barn_restorer",
                title: "Перекуп-Реставратор",
                desc: "Найти раритет в заброшенном сарае, устранить дефекты мотора и кузова и продать с чистой прибылью от 300,000 ₽.",
                target: 1,
                actionType: "barn_restore_sale",
                rewardCash: 350000,
                rewardStars: 15,
                rewardXp: 250
            },
            {
                id: "w_fleet_synergy_boss",
                title: "Сетевой Автомагнат",
                desc: "Сформировать автопарк из 3+ автомобилей одного концерна (VAG, LADA, Корея или ГАЗ) и собрать полную кассу.",
                target: 3,
                actionType: "fleet_mono_brand",
                rewardCash: 500000,
                rewardStars: 20,
                rewardXp: 300
            },
            {
                id: "w_container_profit",
                title: "Морской Контрабандист",
                desc: "Выиграть морской контейнер в Порту и реализовать найденный автомобиль без нареканий покупателей.",
                target: 1,
                actionType: "port_container_deal",
                rewardCash: 450000,
                rewardStars: 18,
                rewardXp: 280
            }
        ];

        // --------------------------------------------------------
        // 2.2. B2B КОРПОРАТИВНЫЕ ТЕНДЕРЫ ДЛЯ БИЗНЕСА
        // --------------------------------------------------------
        const BUSINESS_TENDERS_CATALOG = [
            {
                id: "tnd_airport_taxi",
                targetBiz: "taxi",
                title: "Госконтракт: Трансфер Аэропорта Шереметьево",
                desc: "Требуется поставить на линию 3 комфортных седана не старше 2016 года с коммерческим учетом МРЭО.",
                requirements: { minFleetCount: 3, requiredClasses: ["comfort", "premium"], requireMreo: true },
                bonusDurationDays: 5,
                incomeMultiplier: 1.45,
                advanceRewardCash: 250000,
                rewardStars: 10
            },
            {
                id: "tnd_retail_delivery",
                targetBiz: "delivery",
                title: "Тендер ритейла: Сеть экспресс-гипермаркетов",
                desc: "Обеспечить логистику 4 легкими фургонами или каблучками в идеальном техническом состоянии (состояние от 75%).",
                requirements: { minFleetCount: 4, minCondition: 75 },
                bonusDurationDays: 4,
                incomeMultiplier: 1.50,
                advanceRewardCash: 180000,
                rewardStars: 8
            },
            {
                id: "tnd_cargo_highway",
                targetBiz: "transport_company",
                title: "Магистральный подряд: Межгород Москва — Казань",
                desc: "Контракт на перевозку крупногабаритных грузов. Требуются магистральные тягачи или фургоны грузоподъёмностью от 3.5 тонн.",
                requirements: { minFleetCount: 2, requiredClasses: ["truck"], requireMreo: true },
                bonusDurationDays: 7,
                incomeMultiplier: 1.65,
                advanceRewardCash: 600000,
                rewardStars: 25
            }
        ];

        // --------------------------------------------------------
        // 2.3. СЛУЧАЙНЫЕ СОБЫТИЯ-КРИЗИСЫ ПРИ СБОРЕ КАССЫ БИЗНЕСА
        // --------------------------------------------------------
        const BUSINESS_CRISIS_EVENTS = [
            {
                id: "cr_tax_audit",
                applicableBusinesses: ["taxi", "transport_company", "sto"],
                title: "Внеплановая налоговая ревизия",
                desc: "ФНС запросила путевые листы и кассовые чеки по коммерческому транспорту.",
                options: [
                    { text: "Предоставить отчет и уплатить аудит-сбор (-45,000 ₽)", costCash: 45000, penaltyMood: 5 },
                    { text: "Подключить Решалу через связи (-1 🤝)", costConn: 1, bonusKarma: 2 }
                ]
            },
            {
                id: "cr_blown_gasket",
                applicableBusinesses: ["taxi", "delivery"],
                title: "Пробита прокладка ГБЦ на рейсе",
                desc: "Автомобиль на линии закипел в пробке на МКАД. Водитель ждёт эвакуатор.",
                options: [
                    { text: "Оплатить срочный выезд эвакуатора (-25,000 ₽)", costCash: 25000 },
                    { text: "Эвакуировать собственной службой эвакуации (Бесплатно)", reqBiz: "tow_truck" }
                ]
            },
            {
                id: "cr_eco_check",
                applicableBusinesses: ["wash", "detailing"],
                title: "Проверка очистных сооружений мойки",
                desc: "Экологический надзор проверяет септики и сертификаты автошампуня.",
                options: [
                    { text: "Оплатить предписание (-30,000 ₽)", costCash: 30000 },
                    { text: "Показать сертифицированную бочку из Маркета", reqItem: "chem_pack" }
                ]
            }
        ];

        // --------------------------------------------------------
        // 3. ЦЕЛИ КАРЬЕРЫ (БЛОКНОТ)
        // --------------------------------------------------------
        const NOTEPAD_CAREER_GOALS = [
            {
                id: "goal_first_mil",
                category: "Капитал",
                title: "Первый Миллион Чистыми",
                desc: "Заработать суммарно более 1,000,000 ₽ чистой прибыли на сделках.",
                targetProfit: 1000000,
                reward: "Титул: «Делец со Стажем» (+5 ⭐)"
            },
            {
                id: "goal_ten_sales",
                category: "Оборот",
                title: "Мастер ДКП (10 Продаж)",
                desc: "Закрыть 10 успешных прибыльных сделок купли-продажи.",
                targetSales: 10,
                reward: "+100k ₽ бонус кэша"
            },
            {
                id: "goal_fleet_boss",
                category: "Автопарк",
                title: "Гаражный Магнат",
                desc: "Расширить гараж до 5 боксов и заполнить их проверенными авто.",
                targetSlots: 5,
                reward: "Скидка 15% на все детали тюнинга"
            },
            {
                id: "goal_syndicate_king",
                category: "ПодКлюч",
                title: "Поставщик ПодКлюч",
                desc: "Выполнить 5 эксклюзивных контрактов под ключ.",
                targetContracts: 5,
                reward: "+5 🤝 Теневых Связей"
            },
            {
                id: "goal_plate_collector",
                category: "Коллекция",
                title: "Властелин Спецсерий",
                desc: "Собрать в коллекции госномера серий 777, ЕКХ или АМР.",
                targetPlatesCount: 3,
                reward: "+25 ⭐ Stars"
            },
            {
                id: "goal_drift_legend",
                category: "Улица",
                title: "Легенда RDS GP",
                desc: "Построить корч мощностью свыше 450 л.с. с каркасом и победить в GP.",
                targetCred: 600,
                reward: "Особый статус на авторынке (-20% на выкуп)"
            },
            {
                id: "goal_island_owner",
                category: "Олигарх",
                title: "Абсолютная Вершина",
                desc: "Выкупить частный остров с виллой и причалом для супер-яхт.",
                targetHousing: "island",
                reward: "Золотой статус перекупа #1 в рейтинге"
            }
        ];

        // --------------------------------------------------------
        // 4. НОВОСТИ РЫНКА (влияют на цены)
        // --------------------------------------------------------
        const MARKET_NEWS_EVENTS = [
            { cat: 'economy', type: 'up',   mod: 1.25, sender: "📈 АвтоВестник", title: "Бум на дешёвые авто!",     text: "Из-за кризиса все скупают бюджетные машины. Цены на Эконом взлетели на 25%!" },
            { cat: 'economy', type: 'down', mod: 0.85, sender: "📉 АвтоВестник", title: "Льготное кредитование",    text: "Государство ввело льготы на новые авто. Старый Эконом на вторичке подешевел на 15%." },
            { cat: 'comfort', type: 'up',   mod: 1.20, sender: "📈 АвтоВестник", title: "Дефицит седанов",          text: "Таксопарки массово скупают класс Комфорт для работы. Цены выросли на 20%!" },
            { cat: 'premium', type: 'down', mod: 0.75, sender: "📉 АвтоВестник", title: "Налог на роскошь",         text: "Введен жесткий налог на премиальные авто. Владельцы массово сливают Премиум, цены рухнули на 25%!" },
            { cat: 'hyper',   type: 'up',   mod: 1.30, sender: "📈 АвтоВестник", title: "Мода на экзотику",          text: "Известный блогер купил гиперкар, спрос среди бизнесменов взлетел. Цены на Гиперкары +30%!" },
            { cat: 'moto',    type: 'up',   mod: 1.35, sender: "📈 АвтоВестник", title: "Мотосезон открыт!",         text: "С потеплением цены на Мотоциклы традиционно подскочили на 35%." },
            { cat: 'moto',    type: 'down', mod: 0.70, sender: "📉 АвтоВестник", title: "Конец мотосезона",          text: "Осень близко. Мотоциклы никому не нужны, цены упали на 30%." },
            { cat: 'truck',   type: 'up',   mod: 1.25, sender: "📈 АвтоВестник", title: "Логистический бум",         text: "Острая нехватка грузовиков на рынке логистики. Цены на тягачи выросли на 25%!" },
            { cat: 'all',     type: 'up',   mod: 1.10, sender: "📈 АвтоВестник", title: "Инфляция на авторынке",     text: "Ослабление курса рубля привело к общему подорожанию всех автомобилей на 10%!" },
            { cat: 'all',     type: 'down', mod: 0.90, sender: "📉 АвтоВестник", title: "Стагнация рынка",           text: "Ключевая ставка ЦБ повышена, автокредиты недоступны. Весь рынок просел на 10%." }
        ];

        // --------------------------------------------------------
        // 5. ПОКУПАТЕЛИ ПО КЛАССАМ
        // --------------------------------------------------------
        const BUYERS_CATALOG = {
            economy: [
                { name: "Студент Макс",         avatar: "🧑‍🎓", rate: 1.08, type: "economy", meticulous: 0.20 },
                { name: "Таксист Ашот",         avatar: "🧔",   rate: 1.12, type: "economy", meticulous: 0.45 },
                { name: "Дед Михалыч",          avatar: "👴",   rate: 1.18, type: "economy", meticulous: 0.15 },
                { name: "Перекуп Саня",         avatar: "😎",   rate: 1.04, type: "economy", meticulous: 0.85 },
                { name: "Дачник Петрович",      avatar: "👨‍🌾", rate: 1.15, type: "economy", meticulous: 0.25 },
                { name: "Курьер Руслан",        avatar: "🛵",   rate: 1.10, type: "economy", meticulous: 0.30 },
                { name: "Пацан с района Костян",avatar: "🧢",   rate: 1.06, type: "economy", meticulous: 0.18 },
                { name: "Новичок с правами Лера",avatar:"👩‍🦰", rate: 1.20, type: "economy", meticulous: 0.30 },
                { name: "Гаражный мастер Толя", avatar: "👨‍🔧", rate: 1.05, type: "economy", meticulous: 0.70 },
                { name: "Бригадир Валера",      avatar: "👷‍♂️", rate: 1.16, type: "economy", meticulous: 0.35 }
            ],
            comfort: [
                { name: "Менеджер Олег",              avatar: "👨‍💼", rate: 1.12, type: "comfort", meticulous: 0.40 },
                { name: "Семейный Илья",              avatar: "👨‍👩‍👦", rate: 1.18, type: "comfort", meticulous: 0.50 },
                { name: "Блогерша Аня",               avatar: "👩‍🎤", rate: 1.22, type: "comfort", meticulous: 0.25 },
                { name: "Автоподборщик со сканером",  avatar: "🕵️‍♂️", rate: 1.06, type: "comfort", meticulous: 0.90 },
                { name: "IT-тимлид Денис",            avatar: "👨‍💻", rate: 1.20, type: "comfort", meticulous: 0.60 },
                { name: "Риелтор Кристина",           avatar: "👩‍💼", rate: 1.15, type: "comfort", meticulous: 0.40 },
                { name: "Фитнес-тренер Влад",         avatar: "💪",   rate: 1.14, type: "comfort", meticulous: 0.30 },
                { name: "Врач-стоматолог Павел",      avatar: "👨‍⚕️", rate: 1.24, type: "comfort", meticulous: 0.55 },
                { name: "Торговый представитель Юра", avatar: "🚘",   rate: 1.10, type: "comfort", meticulous: 0.50 },
                { name: "Дизайнер интерьеров Соня",   avatar: "🎨",   rate: 1.19, type: "comfort", meticulous: 0.35 }
            ],
            premium: [
                { name: "Бизнесмен Игорь",           avatar: "🤵",       rate: 1.15, type: "premium", meticulous: 0.60 },
                { name: "Мажор Артур",               avatar: "🕺",       rate: 1.25, type: "premium", meticulous: 0.20 },
                { name: "Депутат Виталий",           avatar: "🕴️",       rate: 1.10, type: "premium", meticulous: 0.70 },
                { name: "Владелец таксопарка",       avatar: "🧔‍♂️",    rate: 1.08, type: "premium", meticulous: 0.80 },
                { name: "Застройщик Альберт",        avatar: "🏗️",       rate: 1.18, type: "premium", meticulous: 0.55 },
                { name: "Продюсер Марк",             avatar: "🎬",       rate: 1.24, type: "premium", meticulous: 0.35 },
                { name: "Ресторатор Карен",          avatar: "🍽️",       rate: 1.16, type: "premium", meticulous: 0.45 },
                { name: "Юрист международник Яна",   avatar: "⚖️",       rate: 1.18, type: "premium", meticulous: 0.85 },
                { name: "Владелец сети клиник Борис",avatar: "🩺",       rate: 1.22, type: "premium", meticulous: 0.65 },
                { name: "Инвестор Герман",           avatar: "📈",       rate: 1.14, type: "premium", meticulous: 0.75 }
            ],
            hyper: [
                { name: "Шейх Мансур",               avatar: "👳‍♂️", rate: 1.30, type: "hyper", meticulous: 0.35 },
                { name: "Олигарх Роман",             avatar: "🛥️",   rate: 1.15, type: "hyper", meticulous: 0.80 },
                { name: "Крипто-миллионер",          avatar: "🤑",   rate: 1.32, type: "hyper", meticulous: 0.25 },
                { name: "Стример-хайпожор",          avatar: "🎮",   rate: 1.25, type: "hyper", meticulous: 0.30 },
                { name: "Звезда футбола Алекс",      avatar: "⚽",   rate: 1.22, type: "hyper", meticulous: 0.40 },
                { name: "Коллекционер редких авто",  avatar: "🏛️",   rate: 1.35, type: "hyper", meticulous: 0.95 },
                { name: "IT-фаундер из Дубая",       avatar: "🚀",   rate: 1.24, type: "hyper", meticulous: 0.50 },
                { name: "Наследник синдиката Тариэл",avatar: "🕶️",   rate: 1.20, type: "hyper", meticulous: 0.70 }
            ]
        };

        // --------------------------------------------------------
        // 6. КОНТРАКТЫ ПОДКЛЮЧ (Синдикат)
        // --------------------------------------------------------
        const PODKLYUCH_CONTRACT_TEMPLATES = [
            {
                type: 'taxi_economy',
                categoryTag: 'fleet',
                categoryTitle: '🚕 Таксопарк',
                minPlayerLevel: 7,
                maxPlayerLevel: 14,
                requiredUnlockedCategory: 'economy',
                clientName: "Диспетчер такси «Везёт»",
                avatar: "🧔‍♂️",
                title: "Бюджетный седан под аренду такси",
                desc: "Ищем неприхотливый надёжный автомобиль класса Эконом. Без серьёзных скрытых дефектов и с родным кузовом.",
                reqs: { allowedClasses: ['economy'], minPower: 70, maxMileage: 190000, minCondition: 65, noCriminal: true, noDefects: true },
                rewardBonus: 125000, rewardConn: 1, rewardXp: 80
            },
            {
                type: 'comfort_corporate',
                categoryTag: 'fleet',
                categoryTitle: '💼 Корпоративный седан',
                minPlayerLevel: 15,
                maxPlayerLevel: 29,
                requiredUnlockedCategory: 'comfort',
                clientName: "Начальник автоколонны «Альянс»",
                avatar: "👨‍💼",
                title: "Седан бизнес-филиала для командировок",
                desc: "Требуется проверенный седан или хэтчбек класса Комфорт. Мотор от 110 сил, подтвержденный пробег, без криминала.",
                reqs: { allowedClasses: ['comfort'], minPower: 110, maxMileage: 160000, minCondition: 75, noCriminal: true, noDefects: true },
                rewardBonus: 290000, rewardConn: 2, rewardXp: 145
            },
            {
                type: 'winter_drift_init',
                categoryTag: 'sport',
                categoryTitle: '🏎️ Дрифт-проект',
                minPlayerLevel: 7,
                maxPlayerLevel: 14,
                requiredUnlockedCategory: 'economy',
                clientName: "Организатор Matsuri Drift",
                avatar: "🏎️",
                title: "Жигули под зимний дрифт-сезон",
                desc: "Срочно требуется заднеприводный кузов с заваркой редуктора и выворотом. Мелкие вмятины не важны.",
                reqs: { allowedClasses: ['economy'], minPower: 64, minCondition: 40, reqWeldedDiff: true, reqSteeringAngle: true, noCriminal: false, noDefects: false },
                rewardBonus: 170000, rewardConn: 1, rewardXp: 90
            },
            {
                type: 'drift_europe_spec',
                categoryTag: 'sport',
                categoryTitle: '🏁 Спортивный корч',
                minPlayerLevel: 16,
                maxPlayerLevel: 35,
                requiredUnlockedCategory: 'comfort',
                clientName: "Пилот RDS Europe",
                avatar: "🏁",
                title: "Боевой проект для сухого асфальта",
                desc: "Ищем мощную иномарку или подготовленный проект с гидроручником, выворотом и мощностью от 170 л.с.",
                reqs: { allowedClasses: ['economy', 'comfort'], minPower: 170, minCondition: 60, reqWeldedDiff: true, reqSteeringAngle: true, noCriminal: false, noDefects: false },
                rewardBonus: 340000, rewardConn: 2, rewardXp: 165
            },
            {
                type: 'drag_strip_monster',
                categoryTag: 'sport',
                categoryTitle: '🚀 Драг 402м',
                minPlayerLevel: 25,
                maxPlayerLevel: 55,
                requiredUnlockedCategory: 'comfort',
                clientName: "Капитан команды Drag Masters",
                avatar: "🔥",
                title: "Турбо-снаряд для соревнований на 402м",
                desc: "Требуется доработанный мощный авто с чип-тюнингом не ниже Stage 2 и отдачей от 240 сил без чека.",
                reqs: { allowedClasses: ['comfort', 'premium'], minPower: 240, minCondition: 70, reqPolishOrChip: true, noCriminal: true, noDefects: true },
                rewardBonus: 520000, rewardConn: 3, rewardXp: 220
            },
            {
                type: 'moto_courier',
                categoryTag: 'express',
                categoryTitle: '🛵 Экспресс-курьер',
                minPlayerLevel: 8,
                maxPlayerLevel: 14,
                requiredUnlockedCategory: 'moto',
                clientName: "Служба экспресс-доставки",
                avatar: "🛵",
                title: "Городской двухколесный транспорт",
                desc: "Заказ на бодрый скутер или легкий мотоцикл в хорошем состоянии для доставки документов.",
                reqs: { allowedClasses: ['scooter', 'moto'], minPower: 12, minCondition: 70, noCriminal: true, noDefects: true },
                rewardBonus: 115000, rewardConn: 1, rewardXp: 75
            },
            {
                type: 'vip_escort',
                categoryTag: 'vip',
                categoryTitle: '🤵 VIP Эскорт',
                minPlayerLevel: 30,
                maxPlayerLevel: 49,
                requiredUnlockedCategory: 'premium',
                clientName: "Помощник депутата Госдумы",
                avatar: "🤵",
                title: "Представительский авто в кортеж",
                desc: "Строгий немецкий седан или внедорожник класса Премиум. Идеальный отчет Автотеки, без окрасов и ДТП.",
                reqs: { allowedClasses: ['premium'], minPower: 240, minCondition: 88, noCriminal: true, noDefects: true },
                rewardBonus: 780000, rewardConn: 3, rewardXp: 290
            },
            {
                type: 'arab_export',
                categoryTag: 'vip',
                categoryTitle: '👑 Экспорт Дубай',
                minPlayerLevel: 50,
                maxPlayerLevel: 100,
                requiredUnlockedCategory: 'hyper',
                clientName: "Шейх Мансур (ОАЭ)",
                avatar: "👳‍♂️",
                title: "Экспорт суперкара в Дубай",
                desc: "Срочный заказ на мощный премиум или гиперкар. Требуется идеальный кузов после детейлинга или наличие чипа.",
                reqs: { allowedClasses: ['premium', 'hyper'], minPower: 500, minCondition: 92, reqPolishOrChip: true, noCriminal: true, noDefects: true },
                rewardBonus: 2100000, rewardConn: 5, rewardXp: 480
            },
            {
                type: 'collector_yacht',
                categoryTag: 'vip',
                categoryTitle: '🛥️ Регата Монако',
                minPlayerLevel: 100,
                maxPlayerLevel: 100,
                requiredUnlockedCategory: 'yacht',
                clientName: "Коллекционер из Монако",
                avatar: "🛥️",
                title: "Поставка элитной морской техники",
                desc: "Закрытый контракт на скоростной катер или премиальную яхту для закрытой регаты ПодКлюч.",
                reqs: { allowedClasses: ['yacht'], minPower: 250, minCondition: 85, noCriminal: true, noDefects: true },
                rewardBonus: 3800000, rewardConn: 6, rewardXp: 650
            }
        ];

        const SYNDICATE_CONTRACT_TEMPLATES = PODKLYUCH_CONTRACT_TEMPLATES;

        // --------------------------------------------------------
        // 7. СОБЫТИЯ-ПРЕТЕНЗИИ ПОКУПАТЕЛЕЙ
        // --------------------------------------------------------
        const BUYER_BACKFIRE_EVENTS = [
            {
                id: "ev_scam_lawyer",
                trigger: "rolledOdometer",
                title: "Досудебная претензия по одометру",
                desc: "Покупатель загнал авто к официальному дилеру и выявил факт скрутки пробега на 50%! Требует компенсацию или подаёт в суд.",
                penaltyCash: 65000,
                penaltyKarma: 15,
                reshalaCostConn: 1
            },
            {
                id: "ev_scam_motor_knock",
                trigger: "hasAdditive",
                title: "Разборка у капота: мотор застучал",
                desc: "Залитая в масло присадка выработалась через 80 км. Разгневанный покупатель приехал с друзьями требовать возврат денег.",
                penaltyCash: 90000,
                penaltyKarma: 20,
                reshalaCostConn: 2
            },
            {
                id: "ev_scam_defect_dtc",
                trigger: "hiddenDefect",
                title: "Скрытый дефект трансмиссии",
                desc: "Коробка ушла в аварийный режим. Клиент грозится слить негативные отзывы на Autodrot и вызвать полицию.",
                penaltyCash: 45000,
                penaltyKarma: 10,
                reshalaCostConn: 1
            }
        ];

        // --------------------------------------------------------
        // ЭКСПОРТ В WINDOW
        // --------------------------------------------------------
        window.DAILY_REWARDS_CONFIG = DAILY_REWARDS_CONFIG;
        window.DAILY_QUESTS_POOL = DAILY_QUESTS_POOL;
        window.WEEKLY_CHALLENGES_POOL = WEEKLY_CHALLENGES_POOL;
        window.BUSINESS_TENDERS_CATALOG = BUSINESS_TENDERS_CATALOG;
        window.BUSINESS_CRISIS_EVENTS = BUSINESS_CRISIS_EVENTS;
        window.NOTEPAD_CAREER_GOALS = NOTEPAD_CAREER_GOALS;
        window.MARKET_NEWS_EVENTS = MARKET_NEWS_EVENTS;
        window.BUYERS_CATALOG = BUYERS_CATALOG;
        window.PODKLYUCH_CONTRACT_TEMPLATES = PODKLYUCH_CONTRACT_TEMPLATES;
        window.SYNDICATE_CONTRACT_TEMPLATES = SYNDICATE_CONTRACT_TEMPLATES;
        window.BUYER_BACKFIRE_EVENTS = BUYER_BACKFIRE_EVENTS;

        console.log('[📋 data_activities_quests v2.0.0] Загружено: квесты дня, недельные испытания, B2B тендеры и кризисы бизнеса ✓');

    } catch (e) {
        console.error('[📋 data_activities_quests] ОШИБКА ЗАГРУЗКИ:', e);
        console.error(e.stack);
    }
})();

// ========================================================
// data_activities.js — АКТИВНОСТИ, ПОРТ, КВЕСТЫ И КЛИЕНТЫ
// ========================================================

// --------------------------------------------------------
// 1. ПОРТ, ТАМОЖНЯ, БРОКЕРЫ И STORAGE WARS
// --------------------------------------------------------
const PORT_BROKER_PROFILES = [
    {
        id: "broker_rashid",
        name: "Брокер Рашид",
        avatar: "🧔‍♂️",
        title: "Таможенный декларант порта",
        patience: 4,
        bluffChance: 0.35,
        greetings: [
            "«Контейнер только со стапеля разгрузки. Какое твоё предложение?»",
            "«Документы на подписи, судно уже в нейтральных водах. Забираешь или мне звать других покупателей?»"
        ],
        successHaggle: [
            "«Ладно, уступаю на пошлину. Но больше не торгуюсь!»",
            "«Уговорил, оформляю скидку на растаможку.»"
        ],
        failHaggle: [
            "«Меньше заявленного не отдам! У меня очередь из перекупов.»",
            "«Не морочь мне голову, это эксклюзивный карго!»"
        ]
    },
    {
        id: "broker_viktor",
        name: "Инспектор Виктор",
        avatar: "👮‍♂️",
        title: "Старший таможенный агент",
        patience: 5,
        bluffChance: 0.20,
        greetings: [
            "«Пломбы на месте, досмотр пройден формально. Ценник окончательный, но готов выслушать аргументы.»"
        ],
        successHaggle: [
            "«Аргумент принят, скорректировал декларацию в меньшую сторону.»",
            "«Сделаю скидку на повреждения внешнего каркаса тары.»"
        ],
        failHaggle: [
            "«По регламенту скидка не положена. Бери или опечатываю обратно.»"
        ]
    },
    {
        id: "broker_kenji",
        name: "Кэндзи Сато",
        avatar: "🎌",
        title: "Представитель аукциона USS Tokyo",
        patience: 3,
        bluffChance: 0.50,
        greetings: [
            "«Контейнер напрямую из Йокогамы. Внутри японская аукционная классика. Быстрый расчет — хорошая сделка.»"
        ],
        successHaggle: [
            "«Хорошо, согласен на дисконт ради долгого сотрудничества.»"
        ],
        failHaggle: [
            "«Японское качество не продаётся за копейки!»"
        ]
    }
];

const PORT_AUCTIONS_CATALOG = [
    { 
        id: 'japan', 
        name: 'Японский Контейнер (USS Tokyo)', 
        title: 'Японский Контейнер (USS Tokyo)',
        cost: 350000, 
        reqStars: 5, 
        reqLvl: 10,
        country: 'JAPAN',
        flagEmoji: '🇯🇵',
        auctionHouse: 'USS Tokyo / Kobe Port',
        auctionGrade: 'Grade 4.5B',
        desc: 'Опечатанный морской контейнер из порта Кобе. Дроп: JDM легенды, турбо-седаны, японские спортбайки и архивные знаки Токио.',
        possibleCars: ["Toyota Mark II (JZX90)", "Toyota Chaser (X100)", "Yamaha MT-07", "Honda CB400 Super Four", "Nissan Silvia S13"],
        lootPool: [
            { name: "Комплект кованых дисков Volk TE37 в багажнике", cashVal: 95000, emoji: "✨" },
            { name: "Японский номер префектуры Синагава", cashVal: 130000, plateStr: "品川 500 あ 77-77", emoji: "🏷️" },
            { name: "Турбо-кит GReddy T88 в деревянном ящике", cashVal: 110000, emoji: "🚀" }
        ],
        img: 'assets/containers/japan.jpg', 
        fallback: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'europe', 
        name: 'Европейский Контейнер (BCA Germany)', 
        title: 'Европейский Контейнер (BCA Germany)',
        cost: 650000, 
        reqStars: 8, 
        reqLvl: 14,
        country: 'GERMANY',
        flagEmoji: '🇩🇪',
        auctionHouse: 'BCA Autoauktionen Hamburg',
        auctionGrade: 'Euro Clean',
        desc: 'Прямая поставка из Гамбурга без пробега по СНГ. Дроп: горячие хэтчбеки GTI, турбо-вагоны RS, баварские седаны.',
        possibleCars: ["VW Golf VI GTI", "BMW 3 Series (G20)", "Audi A6 (C8)", "Skoda Octavia A7 1.8 TSI", "BMW E30 Coupe"],
        lootPool: [
            { name: "Диагностический планшет Launch в кейсе", cashVal: 85000, emoji: "📱" },
            { name: "Оригинальный обвес M-Performance в коробках", cashVal: 120000, emoji: "🌪️" },
            { name: "Пакет немецких дойчмарок из бардачка", cashVal: 65000, emoji: "💶" }
        ],
        img: 'assets/containers/europe.jpg', 
        fallback: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'usa_auction', 
        name: 'Американский Аукцион (Copart #502)', 
        title: 'Американский Аукцион (Copart #502)',
        cost: 850000, 
        reqStars: 12, 
        reqLvl: 18,
        country: 'USA',
        flagEmoji: '🇺🇸',
        auctionHouse: 'Copart Los Angeles Yard',
        auctionGrade: 'Salvage / Clean Title',
        desc: 'Контейнер со страхового аукциона США. Кот в мешке: от лёгкого удара по навеске до мощных маслкаров и заряженных багги.',
        possibleCars: ["Ford Focus III", "Chevrolet Cruze", "BRP Can-Am Maverick X3", "Ford Mustang GT"],
        lootPool: [
            { name: "Спортивные драговые слики Mickey Thompson", cashVal: 75000, emoji: "🛞" },
            { name: "Калифорнийский ретро-номер 1978", cashVal: 160000, plateStr: "CALIFORNIA 777", emoji: "🏷️" },
            { name: "Пачка долларов за обшивкой двери", cashVal: 140000, emoji: "💵" }
        ],
        img: 'assets/containers/usa.jpg', 
        fallback: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'dubai', 
        name: 'Эмиратский Контейнер (Dubai Al-Aweer)', 
        title: 'Эмиратский Контейнер (Dubai Al-Aweer)',
        cost: 1600000, 
        reqStars: 20, 
        reqLvl: 25,
        country: 'UAE',
        flagEmoji: '🇦🇪',
        auctionHouse: 'Al-Aweer Auto Market Dubai',
        auctionGrade: 'VIP Royal',
        desc: 'Аукционная роскошь Эмиратов: Гелики G63, Porsche Cayenne, катера или спорткары с минимальным пробегом.',
        possibleCars: ["BMW X5 (G05)", "Mercedes G63 AMG «Гелик»", "Porsche Cayenne (PO536)", "Катер Bayliner VR5"],
        lootPool: [
            { name: "Золотые часы Rolex из бардачка", cashVal: 320000, emoji: "⌚" },
            { name: "Дубайский блатной номер «7»", cashVal: 450000, plateStr: "DUBAI 7", emoji: "💎" },
            { name: "Кованые составные диски Mansory", cashVal: 220000, emoji: "✨" }
        ],
        img: 'assets/containers/dubai.jpg', 
        fallback: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'hangar', 
        name: 'Заброшенный Ангар Портового Хаба', 
        title: 'Заброшенный Ангар Портового Хаба',
        cost: 4500000, 
        reqStars: 35, 
        reqLvl: 35,
        country: 'GLOBAL',
        flagEmoji: '🌐',
        auctionHouse: 'Customs Seized Warehouse',
        auctionGrade: 'Ultra Seized',
        desc: 'Конфискованный таможней ангар! От коммерческих тягачей Scania и Volvo до Porsche 911 GT3 RS и Nissan GT-R Nismo!',
        possibleCars: ["Scania R500 V8", "Volvo FH16 750", "Porsche 911 GT3 RS (992)", "Nissan GT-R R35 Nismo", "Bugatti Chiron Sport"],
        lootPool: [
            { name: "Кейс с ценными бумагами и платиной", cashVal: 750000, emoji: "💼" },
            { name: "Карбоновый обвес Nismo в сборе", cashVal: 400000, emoji: "🏎️" },
            { name: "Таможенный пропуск высшего допуска", cashVal: 300000, emoji: "📜" }
        ],
        img: 'assets/containers/hangar.jpg', 
        fallback: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80' 
    }
];

const CONTAINER_ITEMS = PORT_AUCTIONS_CATALOG;

const STORAGE_WARS_CONTAINERS = [
    {
        id: "sw_copart_muscle",
        title: "Контейнер Copart #502 (США)",
        badge: "Маслкары & Джипы",
        country: "USA",
        baseBid: 320000,
        maxBotBudget: 850000,
        estValue: "500,000 — 1,300,000 ₽",
        riskLevel: "Средний",
        desc: "Закрытый 40-футовый контейнер из порта Лос-Анджелеса. Сквозь щели виден широкий бампер, резина на ковке и слой заокеанской пыли.",
        possibleCars: ["Ford Focus III", "Chevrolet Cruze", "BRP Can-Am Maverick X3", "Ford Mustang GT"],
        lootPool: [
            { name: "Комплект полусликов Toyo R888R", cashVal: 65000, emoji: "🛞" },
            { name: "Пачка долларов за козырьком", cashVal: 85000, emoji: "💵" }
        ],
        scrapChance: 0.15,
        img: "assets/containers/usa.jpg",
        fallback: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: "sw_kobe_jdm",
        title: "Контейнер Кобе #911 (Япония)",
        badge: "JDM & Турбо",
        country: "JAPAN",
        baseBid: 450000,
        maxBotBudget: 1250000,
        estValue: "700,000 — 2,200,000 ₽",
        riskLevel: "Умеренный",
        desc: "Прямой груз с аукциона USS Tokyo. Характерные золотые полки дисков Work, стикеры парковки и нетронутый интерьер.",
        possibleCars: ["Toyota Mark II (JZX90)", "Toyota Chaser (X100)", "Yamaha MT-07", "Nissan Silvia S13"],
        lootPool: [
            { name: "Кованые диски Work Meister S1", cashVal: 90000, emoji: "✨" },
            { name: "Японский номер Осака", cashVal: 110000, plateStr: "大阪 330 む 77-77", emoji: "🏷️" }
        ],
        scrapChance: 0.10,
        img: "assets/containers/japan.jpg",
        fallback: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: "sw_dubai_super",
        title: "Контейнер Дубай #777 (ОАЭ)",
        badge: "Суперкары & Люкс",
        country: "UAE",
        baseBid: 1200000,
        maxBotBudget: 2800000,
        estValue: "2,000,000 — 5,500,000 ₽",
        riskLevel: "Высокий",
        desc: "Опечатанный бокс таможенного терминала Аль-Авир. Карбоновые зеркала, диффузор и золотой ключ на приборке.",
        possibleCars: ["BMW X5 (G05)", "Mercedes G63 AMG «Гелик»", "Porsche Cayenne (PO536)", "Катер Bayliner VR5"],
        lootPool: [
            { name: "Золотые слитки в кейсе из багажника", cashVal: 280000, emoji: "🏆" },
            { name: "Дубайский VIP-номер «777»", cashVal: 350000, plateStr: "DUBAI 777", emoji: "💎" }
        ],
        scrapChance: 0.12,
        img: "assets/containers/dubai.jpg",
        fallback: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80"
    }
];

const STORAGE_WARS_BOTS = [
    { 
        name: "Барыга Алик", 
        avatar: "🧔", 
        maxBudgetMul: 1.55, 
        bluffChance: 0.35, 
        aggro: "moderate",
        shouts: [
            "«Этот контейнер точно мой, не лезьте под руку!»",
            "«Я чую японский турбо-мотор за версту, поднимаю!»",
            "«Эй, перекуп, у тебя денег не хватит со мной бодаться!»",
            "«Поднимаю планку, по рукам!»"
        ],
        passShouts: [
            "«Ценник в космос улетел, я пас...»",
            "«За такие бабки пусть забирает, там кот в мешке!»"
        ]
    },
    { 
        name: "Мажор Влад", 
        avatar: "🕺", 
        maxBudgetMul: 2.20, 
        bluffChance: 0.55, 
        aggro: "aggressive",
        shouts: [
            "«Мелочь не считаю, перебиваю ставку!»",
            "«Папа дал бюджет, контейнер едет ко мне на виллу!»",
            "«Кто готов перебить мою ставку? Слабо?!»",
            "«Давайте сразу по-взрослому играть, накидываю!»"
        ],
        passShouts: [
            "«Скучно с вами, пойду в ресторан...»",
            "«Ладно, забирайте этот хлам, найду себе получше.»"
        ]
    },
    { 
        name: "Дед Михалыч", 
        avatar: "👴", 
        maxBudgetMul: 1.30, 
        bluffChance: 0.15, 
        aggro: "calm",
        shouts: [
            "«Не спешите, хлопцы, я на пенсии, но порох в пороховницах есть!»",
            "«В моё время такие лоты за копейки брали. Ставлю!»",
            "«Прибавлю еще немного, на запчасти сгодится.»"
        ],
        passShouts: [
            "«Ох, пенсия не резиновая, выхожу из торгов.»",
            "«Слишком дорого стало, я умываю руки.»"
        ]
    },
    { 
        name: "Перекуп Семён", 
        avatar: "🕶️", 
        maxBudgetMul: 1.75, 
        bluffChance: 0.40, 
        aggro: "moderate",
        shouts: [
            "«Я уже посчитал маржу, здесь чистый профит. Повышаю!»",
            "«Перебиваю! Мой автосалон ждет этот лот!»",
            "«Контейнер уйдет влет на авторынке, забираю!»"
        ],
        passShouts: [
            "«Маржа ушла в минус, пас!»",
            "«Дальше торговаться бессмысленно, я выхожу.»"
        ]
    }
];

// --------------------------------------------------------
// 2. СОБЫТИЯ У КАПОТА, ДИАГНОСТИКА И ОБРАЗ ЖИЗНИ
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

const SELLER_ADS_PHRASES = [
    "«Дедушка ездил только летом на дачу!»", 
    "«Сел и поехал, мотор шепчет.»", 
    "«Перекупам и салонам не звонить!»",
    "«Прошита Stage 2, дует отлично, новый байпас.»",
    "«Машина в идеале, любые проверки за ваш счет.»",
    "«Продаю со слезами на глазах...»",
    "«Вложений не требует, только масло долить.»",
    "«Красилась только одна дверь (косметика).»",
    "«Ездила девушка, маршрут дом-работа-сад.»",
    "«Пробег родной 100%, можете проверять по базам.»",
    "«Не бита, не крашена, мамой клянусь!»",
    "«В салоне не курили, матом не ругались.»",
    "«Перекупы мимо, отдаю только в хорошие руки.»",
    "«Двигатель работает как швейцарские часы.»"
];

const DIETS = [
    { id: 'water', name: 'Вода из кулера', category: 'fast', cost: 0, hunger: 5, mood: -20, desc: 'Бесплатно в боксе, но силы тают на глазах' },
    { id: 'coffee', name: 'Двойной эспрессо с заправки', category: 'fast', cost: 180, hunger: 10, mood: 12, desc: 'Бодрит перед ночным выездом на сделку' },
    { id: 'doshik', name: 'Бич-пакет с сосиской', category: 'fast', cost: 220, hunger: 25, mood: -10, desc: 'Классика гаражного обеда' },
    { id: 'home_sandwich', name: 'Домашний бутер с сыром', category: 'home', cost: 350, hunger: 35, mood: 5, desc: 'Сытно, душевно и без изжоги' },
    { id: 'pelmeni', name: 'Пельмени с маслом и перцем', category: 'home', cost: 550, hunger: 50, mood: 10, desc: 'Горячий обед после холодной смотровой ямы' },
    { id: 'shaurma', name: 'Сытная шаурма на вокзале', category: 'street', cost: 850, hunger: 60, mood: 8, desc: 'Перекус у капота в ожидании покупателя' },
    { id: 'fastfood', name: 'Бургер-комбо 24/7', category: 'street', cost: 1400, hunger: 70, mood: 18, desc: 'Бургер, картошка и кола перед ночными гонками' },
    { id: 'stolovka', name: 'Комплексный обед перекупа', category: 'restaurant', cost: 2500, hunger: 85, mood: 25, desc: 'Борщ, котлета с пюре, компот и булочка' },
    { id: 'cafe', name: 'Стейк Рибай в ресторане', category: 'restaurant', cost: 7500, hunger: 100, mood: 40, desc: 'Празднование закрытия жирной сделки' }
];

const LIFE_ACTIVITIES = [
    { id: 'gym', name: 'Тренировка в спортзале', cost: 1500, energy: -20, mood: 25, karma: 2, desc: 'Держит в форме, снижает стресс от жестких торгов' },
    { id: 'sauna', name: 'Гаражная баня с мужиками', cost: 4500, energy: 30, mood: 35, karma: 5, desc: 'Обсуждение цен, слухов с рынка и полный релакс' },
    { id: 'karting', name: 'Заезд на прокатном картинге', cost: 3000, energy: -15, mood: 30, karma: 0, desc: 'Тренировка траекторий и разгрузка головы' },
    { id: 'charity_cats', name: 'Корм для гаражных котов', cost: 800, energy: -5, mood: 15, karma: 8, desc: 'Коты охраняют боксы от мышей, карма растет' }
];

const OBD_ERRORS = [
    { code: "P0101", system: "ДВС / Впуск", text: "Выход сигнала ДМРВ из допустимого диапазона", cost: 5000, severity: "Низкая", rpm: 820, temp: 92, boost: 0.0 },
    { code: "P0171", system: "Топливная система", text: "Слишком бедная смесь (Подсос воздуха)", cost: 4000, severity: "Средняя", rpm: 900, temp: 94, boost: 0.1 },
    { code: "P0299", system: "Турбонаддув", text: "Недодув турбокомпрессора (Утечка давления)", cost: 45000, severity: "Критическая", rpm: 2400, temp: 98, boost: 0.4 },
    { code: "P0300", system: "Зажигание", text: "Случайные/множественные пропуски зажигания", cost: 11000, severity: "Средняя", rpm: 1100, temp: 90, boost: 0.0 },
    { code: "P0420", system: "Выхлоп / Экология", text: "Эффективность катализатора ниже порога", cost: 25000, severity: "Средняя", rpm: 1800, temp: 95, boost: 0.2 },
    { code: "P0700", system: "АКПП / Гидроблок", text: "Неисправность системы управления АКПП", cost: 38000, severity: "Высокая", rpm: 2100, temp: 96, boost: 0.3 },
    { code: "P0016", system: "ГРМ / Фазорегулятор", text: "Рассинхронизация распредвала и коленвала (Растянута цепь)", cost: 85000, severity: "Критическая", rpm: 780, temp: 91, boost: 0.0 },
    { code: "P0404", system: "Клапан EGR", text: "Неисправность цепи управления клапаном рециркуляции", cost: 12000, severity: "Средняя", rpm: 1400, temp: 88, boost: 0.0 },
    { code: "P0340", system: "Датчик фаз", text: "Ошибка датчика положения распредвала", cost: 6500, severity: "Низкая", rpm: 850, temp: 90, boost: 0.0 }
];

// --------------------------------------------------------
// 3. НАГРАДЫ, КВЕСТЫ И ЦЕЛИ КАРЬЕРЫ
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

const DAILY_QUESTS_POOL = [
    { id: "q_inspect", text: "Осмотреть толщиномером 2 авто на рынке", target: 2, actionType: "gauge_check", reward: 40000, rewardXp: 40 },
    { id: "q_race", text: "Выиграть заезд 402м в Стрите", target: 1, actionType: "win_drag", reward: 60000, rewardXp: 45 },
    { id: "q_biz", text: "Собрать кассу с предприятий", target: 1, actionType: "collect_biz", reward: 30000, rewardXp: 30 },
    { id: "q_buy", text: "Выкупить 1 автомобиль на авторынке", target: 1, actionType: "buy_car", reward: 55000, rewardXp: 50 },
    { id: "q_sell", text: "Успешно продать 1 авто клиенту у капота", target: 1, actionType: "sell_car", reward: 75000, rewardXp: 55 },
    { id: "q_obd", text: "Просканировать ЭБУ автомобиля через OBD2", target: 1, actionType: "obd_scan", reward: 35000, rewardXp: 35 },
    { id: "q_presale", text: "Сделать предпродажный детейлинг авто", target: 1, actionType: "presale_mod", reward: 45000, rewardXp: 40 },
    { id: "q_drift", text: "Завершить квалификационный заезд в Дрифте", target: 1, actionType: "drift_run", reward: 50000, rewardXp: 45 }
];

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
// 4. НОВОСТИ РЫНКА, ПОКУПАТЕЛИ И КОНТРАКТЫ ПОДКЛЮЧ
// --------------------------------------------------------
const MARKET_NEWS_EVENTS = [
    { cat: 'economy', type: 'up', mod: 1.25, sender: "📈 АвтоВестник", title: "Бум на дешёвые авто!", text: "Из-за кризиса все скупают бюджетные машины. Цены на Эконом взлетели на 25%!" },
    { cat: 'economy', type: 'down', mod: 0.85, sender: "📉 АвтоВестник", title: "Льготное кредитование", text: "Государство ввело льготы на новые авто. Старый Эконом на вторичке подешевел на 15%." },
    { cat: 'comfort', type: 'up', mod: 1.20, sender: "📈 АвтоВестник", title: "Дефицит седанов", text: "Таксопарки массово скупают класс Комфорт для работы. Цены выросли на 20%!" },
    { cat: 'premium', type: 'down', mod: 0.75, sender: "📉 АвтоВестник", title: "Налог на роскошь", text: "Введен жесткий налог на премиальные авто. Владельцы массово сливают Премиум, цены рухнули на 25%!" },
    { cat: 'hyper', type: 'up', mod: 1.30, sender: "📈 АвтоВестник", title: "Мода на экзотику", text: "Известный блогер купил гиперкар, спрос среди бизнесменов взлетел. Цены на Гиперкары +30%!" },
    { cat: 'moto', type: 'up', mod: 1.35, sender: "📈 АвтоВестник", title: "Мотосезон открыт!", text: "С потеплением цены на Мотоциклы традиционно подскочили на 35%." },
    { cat: 'moto', type: 'down', mod: 0.70, sender: "📉 АвтоВестник", title: "Конец мотосезона", text: "Осень близко. Мотоциклы никому не нужны, цены упали на 30%." },
    { cat: 'truck', type: 'up', mod: 1.25, sender: "📈 АвтоВестник", title: "Логистический бум", text: "Острая нехватка грузовиков на рынке логистики. Цены на тягачи выросли на 25%!" },
    { cat: 'all', type: 'up', mod: 1.10, sender: "📈 АвтоВестник", title: "Инфляция на авторынке", text: "Ослабление курса рубля привело к общему подорожанию всех автомобилей на 10%!" },
    { cat: 'all', type: 'down', mod: 0.90, sender: "📉 АвтоВестник", title: "Стагнация рынка", text: "Ключевая ставка ЦБ повышена, автокредиты недоступны. Весь рынок просел на 10%." }
];

const BUYERS_CATALOG = {
    economy: [
        { name: "Студент Макс", avatar: "🧑‍🎓", rate: 1.08, type: "economy", meticulous: 0.20 },
        { name: "Таксист Ашот", avatar: "🧔", rate: 1.12, type: "economy", meticulous: 0.45 },
        { name: "Дед Михалыч", avatar: "👴", rate: 1.18, type: "economy", meticulous: 0.15 },
        { name: "Перекуп Саня", avatar: "😎", rate: 1.04, type: "economy", meticulous: 0.85 },
        { name: "Дачник Петрович", avatar: "👨‍🌾", rate: 1.15, type: "economy", meticulous: 0.25 },
        { name: "Курьер Руслан", avatar: "🛵", rate: 1.10, type: "economy", meticulous: 0.30 },
        { name: "Пацан с района Костян", avatar: "🧢", rate: 1.06, type: "economy", meticulous: 0.18 },
        { name: "Новичок с правами Лера", avatar: "👩‍🦰", rate: 1.20, type: "economy", meticulous: 0.30 },
        { name: "Гаражный мастер Толя", avatar: "👨‍🔧", rate: 1.05, type: "economy", meticulous: 0.70 },
        { name: "Бригадир Валера", avatar: "👷‍♂️", rate: 1.16, type: "economy", meticulous: 0.35 }
    ],
    comfort: [
        { name: "Менеджер Олег", avatar: "👨‍💼", rate: 1.12, type: "comfort", meticulous: 0.40 },
        { name: "Семейный Илья", avatar: "👨‍👩‍👦", rate: 1.18, type: "comfort", meticulous: 0.50 },
        { name: "Блогерша Аня", avatar: "👩‍🎤", rate: 1.22, type: "comfort", meticulous: 0.25 },
        { name: "Автоподборщик со сканером", avatar: "🕵️‍♂️", rate: 1.06, type: "comfort", meticulous: 0.90 },
        { name: "IT-тимлид Денис", avatar: "👨‍💻", rate: 1.20, type: "comfort", meticulous: 0.60 },
        { name: "Риелтор Кристина", avatar: "👩‍💼", rate: 1.15, type: "comfort", meticulous: 0.40 },
        { name: "Фитнес-тренер Влад", avatar: "💪", rate: 1.14, type: "comfort", meticulous: 0.30 },
        { name: "Врач-стоматолог Павел", avatar: "👨‍⚕️", rate: 1.24, type: "comfort", meticulous: 0.55 },
        { name: "Торговый представитель Юра", avatar: "🚘", rate: 1.10, type: "comfort", meticulous: 0.50 },
        { name: "Дизайнер интерьеров Соня", avatar: "🎨", rate: 1.19, type: "comfort", meticulous: 0.35 }
    ],
    premium: [
        { name: "Бизнесмен Игорь", avatar: "🤵", rate: 1.15, type: "premium", meticulous: 0.60 },
        { name: "Мажор Артур", avatar: "🕺", rate: 1.25, type: "premium", meticulous: 0.20 },
        { name: "Депутат Виталий", avatar: "🕴️", rate: 1.10, type: "premium", meticulous: 0.70 },
        { name: "Владелец таксопарка", avatar: "🧔‍♂️", rate: 1.08, type: "premium", meticulous: 0.80 },
        { name: "Застройщик Альберт", avatar: "🏗️", rate: 1.18, type: "premium", meticulous: 0.55 },
        { name: "Продюсер Марк", avatar: "🎬", rate: 1.24, type: "premium", meticulous: 0.35 },
        { name: "Ресторатор Карен", avatar: "🍽️", rate: 1.16, type: "premium", meticulous: 0.45 },
        { name: "Юрист международник Яна", avatar: "⚖️", rate: 1.18, type: "premium", meticulous: 0.85 },
        { name: "Владелец сети клиник Борис", avatar: "🩺", rate: 1.22, type: "premium", meticulous: 0.65 },
        { name: "Инвестор Герман", avatar: "📈", rate: 1.14, type: "premium", meticulous: 0.75 }
    ],
    hyper: [
        { name: "Шейх Мансур", avatar: "👳‍♂️", rate: 1.30, type: "hyper", meticulous: 0.35 },
        { name: "Олигарх Роман", avatar: "🛥️", rate: 1.15, type: "hyper", meticulous: 0.80 },
        { name: "Крипто-миллионер", avatar: "🤑", rate: 1.32, type: "hyper", meticulous: 0.25 },
        { name: "Стример-хайпожор", avatar: "🎮", rate: 1.25, type: "hyper", meticulous: 0.30 },
        { name: "Звезда футбола Алекс", avatar: "⚽", rate: 1.22, type: "hyper", meticulous: 0.40 },
        { name: "Коллекционер редких авто", avatar: "🏛️", rate: 1.35, type: "hyper", meticulous: 0.95 },
        { name: "IT-фаундер из Дубая", avatar: "🚀", rate: 1.24, type: "hyper", meticulous: 0.50 },
        { name: "Наследник синдиката Тариэл", avatar: "🕶️", rate: 1.20, type: "hyper", meticulous: 0.70 }
    ]
};

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
        reqs: {
            allowedClasses: ['economy'],
            minPower: 70,
            maxMileage: 190000,
            minCondition: 65,
            noCriminal: true,
            noDefects: true
        },
        rewardBonus: 125000,
        rewardConn: 1,
        rewardXp: 80
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
        reqs: {
            allowedClasses: ['comfort'],
            minPower: 110,
            maxMileage: 160000,
            minCondition: 75,
            noCriminal: true,
            noDefects: true
        },
        rewardBonus: 290000,
        rewardConn: 2,
        rewardXp: 145
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
        reqs: {
            allowedClasses: ['economy'],
            minPower: 64,
            minCondition: 40,
            reqWeldedDiff: true,
            reqSteeringAngle: true,
            noCriminal: false,
            noDefects: false
        },
        rewardBonus: 170000,
        rewardConn: 1,
        rewardXp: 90
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
        reqs: {
            allowedClasses: ['economy', 'comfort'],
            minPower: 170,
            minCondition: 60,
            reqWeldedDiff: true,
            reqSteeringAngle: true,
            noCriminal: false,
            noDefects: false
        },
        rewardBonus: 340000,
        rewardConn: 2,
        rewardXp: 165
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
        reqs: {
            allowedClasses: ['comfort', 'premium'],
            minPower: 240,
            minCondition: 70,
            reqPolishOrChip: true,
            noCriminal: true,
            noDefects: true
        },
        rewardBonus: 520000,
        rewardConn: 3,
        rewardXp: 220
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
        reqs: {
            allowedClasses: ['scooter', 'moto'],
            minPower: 12,
            minCondition: 70,
            noCriminal: true,
            noDefects: true
        },
        rewardBonus: 115000,
        rewardConn: 1,
        rewardXp: 75
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
        reqs: {
            allowedClasses: ['premium'],
            minPower: 240,
            minCondition: 88,
            noCriminal: true,
            noDefects: true
        },
        rewardBonus: 780000,
        rewardConn: 3,
        rewardXp: 290
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
        reqs: {
            allowedClasses: ['premium', 'hyper'],
            minPower: 500,
            minCondition: 92,
            reqPolishOrChip: true,
            noCriminal: true,
            noDefects: true
        },
        rewardBonus: 2100000,
        rewardConn: 5,
        rewardXp: 480
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
        reqs: {
            allowedClasses: ['yacht'],
            minPower: 250,
            minCondition: 85,
            noCriminal: true,
            noDefects: true
        },
        rewardBonus: 3800000,
        rewardConn: 6,
        rewardXp: 650
    }
];

const SYNDICATE_CONTRACT_TEMPLATES = PODKLYUCH_CONTRACT_TEMPLATES;

// --------------------------------------------------------
// 5. УЛИЧНЫЕ СХОДКИ И ЧАТ
// --------------------------------------------------------
const STREET_EVENTS_DATA = [
    {
        id: "ev_drift_meet",
        name: "Ночная дрифт-сходка у ТЦ",
        type: "drift",
        classBadge: "Дрифт",
        req: "Заварка редуктора + Выворот",
        reward: "60,000 ₽ + 25 Кармы",
        rewardCash: 60000,
        rewardKarma: 25,
        desc: "Парные проезды по мокрому асфальту под аплодисменты зрителей.",
        check: (car) => !!(car.tuning?.weldedDiff && car.tuning?.steeringAngle)
    },
    {
        id: "ev_stance_show",
        name: "Городской Стенс-Фестиваль",
        type: "show",
        classBadge: "Стенс / Шоу",
        req: "Пневма/Стенс + Диски + Обвес",
        reward: "120,000 ₽ + 2 🤝 Связи",
        rewardCash: 120000,
        rewardConn: 2,
        desc: "Выставка проектов. Оценивается фитмент, чистота полок и зазоры кузова.",
        check: (car) => !!(car.tuning?.stance && car.tuning?.customWheels && car.tuning?.bodykit)
    },
    {
        id: "ev_drag_cup",
        name: "Кубок Нелегала 402м",
        type: "drag",
        classBadge: "Драг",
        req: "Каркас + Слики + Stage 2+",
        reward: "250,000 ₽ + 50 ⭐ Stars",
        rewardCash: 250000,
        rewardStars: 50,
        desc: "Серьезная битва самых быстрых турбо-корчей города за крупный куш.",
        check: (car) => !!(car.tuning?.rollCage && car.tuning?.dragSlicks && (car.tuning?.chip || 0) >= 2)
    }
];

const STREET_CHAT_LOG = [
    { author: "🚨 ДПС_Инфо", text: "Внимание! На ул. Ленина рейд по 12.5.1, прячьте прямотоки!", warning: true },
    { author: "🚨 ДПС_Инфо", text: "Экипаж с люстрой стоит у ТЦ Галерея, тормозят всех тонированных.", warning: true },
    { author: "Vazovod_77", text: "Куплю кузов под корч ВАЗ 2107 или 2101, срочно в лс!", warning: false },
    { author: "Major_Vova", text: "Завтра сходка на парковке, вход только для немцев.", warning: false },
    { author: "JDM_King", text: "Кто может заварить редуктор по-братски за пиво?", warning: false },
    { author: "Perecup_Pro", text: "Продам Солярис, не бит не крашен (крашена только крыша).", warning: false },
    { author: "Sanya_Garage", text: "Делаю капиталку за 3 дня, гарантия до ворот. Цены в лс.", warning: false },
    { author: "Mark_2_Top", text: "Ищу столб... тьфу, задний бампер на марк 2.", warning: false },
    { author: "Maga_M5", text: "Встану на 402 метра с любым. Ставка 500к.", warning: false },
    { author: "Kislota_Drift", text: "Пацаны, у кого есть съёмник пружин? Срочно надо дропнуть тачку.", warning: false }
];

// Экспорт в глобальный контекст window
window.PORT_BROKER_PROFILES = PORT_BROKER_PROFILES;
window.PORT_AUCTIONS_CATALOG = PORT_AUCTIONS_CATALOG;
window.CONTAINER_ITEMS = CONTAINER_ITEMS;
window.STORAGE_WARS_CONTAINERS = STORAGE_WARS_CONTAINERS;
window.STORAGE_WARS_BOTS = STORAGE_WARS_BOTS;
window.BUYER_BACKFIRE_EVENTS = BUYER_BACKFIRE_EVENTS;
window.SELLER_ADS_PHRASES = SELLER_ADS_PHRASES;
window.DIETS = DIETS;
window.LIFE_ACTIVITIES = LIFE_ACTIVITIES;
window.OBD_ERRORS = OBD_ERRORS;
window.DAILY_REWARDS_CONFIG = DAILY_REWARDS_CONFIG;
window.DAILY_QUESTS_POOL = DAILY_QUESTS_POOL;
window.NOTEPAD_CAREER_GOALS = NOTEPAD_CAREER_GOALS;
window.MARKET_NEWS_EVENTS = MARKET_NEWS_EVENTS;
window.BUYERS_CATALOG = BUYERS_CATALOG;
window.PODKLYUCH_CONTRACT_TEMPLATES = PODKLYUCH_CONTRACT_TEMPLATES;
window.SYNDICATE_CONTRACT_TEMPLATES = SYNDICATE_CONTRACT_TEMPLATES;
window.STREET_EVENTS_DATA = STREET_EVENTS_DATA;
window.STREET_CHAT_LOG = STREET_CHAT_LOG;
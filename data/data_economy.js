// ========================================================
// data_economy.js — ЭКОНОМИКА, СЕЗОННЫЕ ЦИКЛЫ, ПЕРЕГОН И БИЗНЕСЫ (v3.6.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v3.6.0:
//   - ДИНАМИЧЕСКИЕ ВРЕМЕНА ГОДА: циклы спроса (зима: дрифт/RWD/4x4, лето: мото/кабриолеты).
//   - ИНСАЙДЕРСКИЙ ПЕРЕГОН: капсулы времени из регионов, эвакуаторы и риски на трассе.
//   - Полная сохранность индивидуальной прокачки 13 бизнесов, недвижимости и банковского скоринга.
// ========================================================

// --------------------------------------------------------
// 0. СИСТЕМНЫЕ НАСТРОЙКИ ДОСТУПА К ПРИЛОЖЕНИЯМ И МИНИ-ИГРАМ
// --------------------------------------------------------
const APP_ACCESS_CONFIG = {
    barn: {
        id: 'tabBarn',
        name: 'Сараи (Barn Find)',
        minLevel: 8,
        costStars: 0,
        costCash: 800000,
        costTickets: 0,
        desc: 'Экспедиции по заброшенным гаражам и деревням в поисках раритетов.',
        lockMessage: 'Доступно с 8 уровня (взнос 800,000 ₽ за карту сараев)'
    },
    containers: {
        id: 'tabContainers',
        name: 'Контейнеры (Морской Порт)',
        minLevel: 12,
        costStars: 10,
        costCash: 2500000,
        costTickets: 5,
        desc: 'Аукцион невостребованных контейнеров из Японии, Европы и США.',
        lockMessage: 'Требуется 12 уровень, лицензия брокера (2,500,000 ₽ + 10 ⭐) и 5 билетов 🎫'
    },
    autopodbor_order: {
        id: 'servicePodkluch',
        name: 'Автоподбор «Под ключ»',
        minLevel: 5,
        costStars: 5,
        costCash: 350000,
        costTickets: 0,
        reqTool: 'obd_launch',
        desc: 'Лицензия на выполнение официальных клиентских подборов авто с высокой маржой.',
        lockMessage: 'Требуется 5 уровень, сканер Launch Pro Pad и взнос 350,000 ₽ + 5 ⭐'
    },
    street: {
        id: 'tabStreet',
        name: 'Стритрейсинг (402м)',
        minLevel: 6,
        costStars: 15,
        costCash: 250000,
        costTickets: 0,
        desc: 'Ночные заезды на деньги и уважение автоклубов.',
        lockMessage: 'Доступно с 6 уровня (взнос 250,000 ₽ и 15 ⭐)'
    },
    darknet: {
        id: 'tabDarknet',
        name: 'Даркнет (Теневой рынок)',
        minLevel: 16,
        costStars: 25,
        costCash: 6000000,
        costTickets: 0,
        desc: 'Скупка проблемных документов, двойников и перебитых номеров.',
        lockMessage: 'Доступно с 16 уровня для опытных перекупов (6,000,000 ₽ и 25 ⭐)'
    },
    syndicate: {
        id: 'tabSyndicate',
        name: 'Синдикат Перекупов',
        minLevel: 20,
        costStars: 50,
        costCash: 20000000,
        costTickets: 0,
        desc: 'Элитный закрытый клуб для оптовой перепродажи автопарков.',
        lockMessage: 'Доступно с 20 уровня. Вступительный взнос: 20,000,000 ₽ и 50 ⭐'
    }
};

// --------------------------------------------------------
// 0.1. НАСТРОЙКИ ВИЛСПИНА И СУПЕРВИЛСПИНА
// --------------------------------------------------------
const WHEEL_CONFIG = {
    regular: {
        costStars: 10,
        costTickets: 1,
        canFreeDaily: true,
        dropTable: [
            { type: 'cash', value: 15000, label: '15,000 ₽', weight: 30 },
            { type: 'cash', value: 35000, label: '35,000 ₽', weight: 25 },
            { type: 'cash', value: 75000, label: '75,000 ₽', weight: 15 },
            { type: 'stars', value: 5, label: '5 ⭐ (12,500 ₽)', weight: 12 },
            { type: 'fuel', value: 50, label: '50 л бензина', weight: 10 },
            { type: 'tickets', value: 2, label: '2 🎫 Билета', weight: 6 },
            { type: 'car', tier: 'budget', label: 'ВАЗ-2107 (Сток)', weight: 2 }
        ]
    },
    superWheel: {
        costCash: 1500000,
        costStars: 50,
        costTickets: 5,
        canFreeDaily: false,
        dropTable: [
            { type: 'cash', value: 500000, label: '500,000 ₽', weight: 28 },
            { type: 'cash', value: 1200000, label: '1,200,000 ₽', weight: 20 },
            { type: 'cash', value: 3000000, label: '3,000,000 ₽', weight: 10 },
            { type: 'stars', value: 50, label: '50 ⭐ (125,000 ₽)', weight: 15 },
            { type: 'tickets', value: 10, label: '10 🎫 Билетов', weight: 12 },
            { type: 'tool', id: 'obd_launch', label: 'Планшет Launch Pro', weight: 8 },
            { type: 'car', tier: 'rare', label: 'BMW E34 525i (Идеал)', weight: 5 },
            { type: 'car', tier: 'exclusive', label: 'Toyota Mark II Tourer V', weight: 2 }
        ]
    }
};

// --------------------------------------------------------
// 0.2. ЭКОНОМИЧЕСКИЙ БАЛАНС МАРКЕТА И ТОРГА
// --------------------------------------------------------
const MARKET_ECONOMY_CONFIG = {
    cleanProfitMargin: 0.14,
    washedPolishedMargin: 0.22,
    fullRestoredMargin: 0.38,
    bargainMinPct: 0.05,
    bargainMaxPct: 0.24,
    urgentSaleChance: 0.08,
    hiddenDefectChance: 0.28
};

// --------------------------------------------------------
// 0.3. ОФИЦИАЛЬНЫЙ КУРС ОБМЕННИКА БАНКА
// --------------------------------------------------------
const BANK_EXCHANGE_RATES = {
    rub: { name: 'Рубли', emoji: '₽', buyRub: 1, sellRub: 1 },
    stars: { name: 'Stars', emoji: '⭐', buyRub: 2500, sellRub: 2400 },
    superSpinTicket: { name: 'Билет «Супер Вилспин»', emoji: '🎟️', buyRub: 1500000, sellRub: 1400000 },
    tickets: { name: 'Экспресс-талон', emoji: '🎫', buyRub: 25000, sellRub: 24000 }
};

// ========================================================
// 0.4. ДИНАМИЧЕСКИЕ ВРЕМЕНА ГОДА И СЕЗОННЫЙ СПРОС (v3.6.0)
// ========================================================
const SEASONS_ECONOMY_CONFIG = {
    winter: {
        id: "winter",
        name: "❄️ Зимний дрифт & Гололёд",
        desc: "Ажиотаж на заднеприводную классику под заварку и внедорожники 4x4. Спорткары и мото в упадке.",
        multipliers: {
            rwd: 1.35,      // +35% на задний привод
            awd: 1.25,      // +25% на 4x4
            moto: 0.70,     // -30% на мотоциклы
            scooter: 0.65,  // -35% на скутеры
            hyper: 0.75     // -25% на спорткары
        }
    },
    spring: {
        id: "spring",
        name: "🌱 Весеннее пробуждение",
        desc: "Начало мотосезона, рост спроса на свежие городские хэтчбеки и дачные универсалы.",
        multipliers: {
            moto: 1.25,
            scooter: 1.30,
            economy: 1.15,
            rwd: 1.0,
            hyper: 1.10
        }
    },
    summer: {
        id: "summer",
        name: "☀️ Летний ажиотаж & Спорт",
        desc: "Пик цен на спорткары, кабриолеты и байки. Город живёт ночными гонками.",
        multipliers: {
            hyper: 1.30,
            premium: 1.20,
            moto: 1.35,
            scooter: 1.25,
            truck: 0.90
        }
    },
    autumn: {
        id: "autumn",
        name: "🍂 Осенняя утилитарность",
        desc: "Сезон коммерческих перевозок, фургонов и рабочих авто перед первыми заморозками.",
        multipliers: {
            truck: 1.30,
            economy: 1.10,
            atv: 1.20,
            moto: 0.85,
            hyper: 0.85
        }
    }
};

// ========================================================
// 0.5. ИНСАЙДЕРСКИЕ НАВОДКИ И СРОЧНЫЙ ПЕРЕГОН (v3.6.0)
// ========================================================
const INTERCITY_HAUL_CONFIG = {
    minLevel: 4,
    leadGenerationChanceDaily: 0.35,
    regions: [
        {
            id: 'tver_barn',
            regionName: 'Тверская область (Глухая деревня)',
            distanceKm: 280,
            towTruckCost: 18000,
            riskBreakdownPct: 15,
            riskPoliceCheckPct: 10,
            desc: 'Дедушка продаёт законсервированный гаражный раритет за копейки.',
            discountFromMarket: 0.50 // За 50% от реального рынка
        },
        {
            id: 'karelia_drift',
            regionName: 'Карелия (Петрозаводск)',
            distanceKm: 950,
            towTruckCost: 45000,
            riskBreakdownPct: 25,
            riskPoliceCheckPct: 18,
            desc: 'Подготовленный корч на японском турбо-моторе со срочной продажей за долги.',
            discountFromMarket: 0.40 // -60% от рынка
        },
        {
            id: 'sochi_resort',
            regionName: 'Сочи (Красная Поляна)',
            distanceKm: 1650,
            towTruckCost: 75000,
            riskBreakdownPct: 30,
            riskPoliceCheckPct: 25,
            desc: 'Премиум-купе после курортного сезона с минимальным пробегом.',
            discountFromMarket: 0.35 // -65% от рынка
        }
    ]
};

// --------------------------------------------------------
// 1. НЕДВИЖИМОСТЬ, БОКСЫ И СУБАРЕНДА
// --------------------------------------------------------
const HOUSING_LIST = [
    {
        id: 'trailer',
        name: 'Бытовка на стройплощадке',
        category: 'street',
        typeLabel: 'Временная стоянка',
        rent: 600,
        buyPrice: 350000,
        reqStars: 0,
        slots: 0,
        slotsBonus: 0,
        moodBonus: -5,
        minLevel: 1,
        canTune: false,
        canDetail: false,
        canService: false,
        canOBDGarage: false,
        hasPersonalSlot: false,
        reshalaDiscountPct: 0,
        subletIncome: 350,
        perk: 'Только ночлег. Доработки и ремонт невозможны.',
        desc: 'Временный строительный вагончик у обочины. Сквозняки, верстака нет. Автомобили стоят под открытым небом.',
        img: 'assets/houses/trailer.jpg',
        fallback: 'https://images.unsplash.com/photo-1590725140246-201552a488c9?auto=format&fit=crop&w=600&q=80'
    },
    {
        id: 'shed_yard',
        name: 'Навес у частного дома',
        category: 'street',
        typeLabel: 'Уличный навес',
        rent: 1400,
        buyPrice: 750000,
        reqStars: 5,
        slots: 1,
        slotsBonus: 1,
        moodBonus: 0,
        minLevel: 2,
        canTune: false,
        canDetail: false,
        canService: true,
        canOBDGarage: false,
        hasPersonalSlot: false,
        reshalaDiscountPct: 0,
        subletIncome: 900,
        perk: '1 машиноместо под навесом. Доступна замена масел и свечей.',
        desc: 'Деревянный навес от дождя. Есть розетка 220V и базовый набор гаечных ключей.',
        img: 'assets/houses/room.jpg',
        fallback: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'
    },
    {
        id: 'room',
        name: 'Комната в общежитии + Двор',
        category: 'living',
        typeLabel: 'Жильё + Двор',
        rent: 2200,
        buyPrice: 1300000,
        reqStars: 8,
        slots: 1,
        slotsBonus: 1,
        moodBonus: 4,
        minLevel: 3,
        canTune: false,
        canDetail: false,
        canService: true,
        canOBDGarage: false,
        hasPersonalSlot: false,
        reshalaDiscountPct: 0,
        subletIncome: 1500,
        perk: 'Одно машиноместо во дворе. Разрешена замена расходников.',
        desc: 'Комната в спальном районе. Автомобиль стоит под окнами на асфальте.',
        img: 'assets/houses/room.jpg',
        fallback: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'
    },
    {
        id: 'gsk_box',
        name: 'Стандартный бокс в ГСК-7',
        category: 'box',
        typeLabel: 'Капитальный бокс ГСК',
        rent: 6500,
        buyPrice: 1500000,
        reqStars: 12,
        slots: 2,
        slotsBonus: 2,
        moodBonus: 8,
        minLevel: 4,
        canTune: true,
        canDetail: false,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 5,
        subletIncome: 4500,
        perk: 'Смотровая яма, электричество 220V, верстак со слесарными тисками.',
        desc: 'Настоящее логово перекупа! Сухая яма, верстак и диодное освещение. Открывает диагностику и тюнинг.',
        img: 'assets/houses/garage.jpg',
        fallback: 'https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?auto=format&fit=crop&w=600&q=80'
    },
    {
        id: 'khrusch',
        name: 'Квартира в "Хрущевке"',
        category: 'living',
        typeLabel: 'Городское жильё',
        rent: 12000,
        buyPrice: 3800000,
        reqStars: 15,
        slots: 1,
        slotsBonus: 1,
        moodBonus: 10,
        minLevel: 5,
        canTune: false,
        canDetail: false,
        canService: true,
        canOBDGarage: false,
        hasPersonalSlot: false,
        reshalaDiscountPct: 0,
        subletIncome: 8000,
        perk: 'Уютный сон, быстрое восстановление настроения (+10).',
        desc: 'Своя кухня, душ и спокойный сон. Машина паркуется во дворе под фонарём.',
        img: 'assets/houses/khrusch.jpg',
        fallback: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'
    },
    {
        id: 'garage',
        name: 'Двойной бокс с ямой и печкой',
        category: 'box',
        typeLabel: 'Слесарная мастерская',
        rent: 18000,
        buyPrice: 2900000,
        reqStars: 20,
        slots: 3,
        slotsBonus: 3,
        moodBonus: 14,
        minLevel: 7,
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 10,
        subletIncome: 12000,
        perk: 'Сварка, полировальный пост, печь на отработке и 3 свободных машиноместа.',
        desc: 'Широкий бокс с печью, верстаком, компрессором и мойкой. Позволяет готовить тачки под ключ.',
        img: 'assets/houses/garage.jpg',
        fallback: 'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?auto=format&fit=crop&w=600&q=80'
    },
    {
        id: 'workshop_pro',
        name: 'Тюнинг-Ангар с подъёмником',
        category: 'box',
        typeLabel: 'Профессиональный сервис',
        rent: 48000,
        buyPrice: 11000000,
        reqStars: 35,
        slots: 5,
        slotsBonus: 5,
        moodBonus: 22,
        minLevel: 15,
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 20,
        subletIncome: 32000,
        perk: 'Двухстоечный подъёмник, камера обдува, скидка 20% на услуги Решалы!',
        desc: 'Коммерческий цех в промзоне. Подъёмник, мощная приточка, возможность отмывать VIN дешевле.',
        img: 'assets/houses/workshop.jpg',
        fallback: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80'
    },
    {
        id: 'cottage',
        name: 'Коттедж за городом с гаражом',
        category: 'estate',
        typeLabel: 'Загородная усадьба',
        rent: 70000,
        buyPrice: 22000000,
        reqStars: 55,
        slots: 7,
        slotsBonus: 7,
        moodBonus: 35,
        minLevel: 28,
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 15,
        subletIncome: 48000,
        perk: 'Свой закрытый двор на 7 авто, тёплый гараж, зона отдыха и барбекю.',
        desc: 'Собственный участок, трёхфазная сеть 380V, смотровая яма и мойка высокого давления.',
        img: 'assets/houses/cottage.jpg',
        fallback: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80'
    },
    {
        id: 'villa',
        name: 'Особняк на Рублёвке',
        category: 'estate',
        typeLabel: 'Резиденция миллионера',
        rent: 600000,
        buyPrice: 420000000,
        reqStars: 160,
        slots: 18,
        slotsBonus: 18,
        moodBonus: 85,
        minLevel: 70,
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 35,
        subletIncome: 380000,
        perk: 'Свой автосервисный цех, малярная камера, охрана ЧОП, скидка 35% у Решалы!',
        desc: 'Гектар соснового бора, собственный автосервис на 4 поста, малярная камера и ангар для редких лотов.',
        img: 'assets/houses/villa.jpg',
        fallback: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80'
    }
];

// --------------------------------------------------------
// 2. БИЗНЕС-СЕТЬ (ПРЕДПРИЯТИЯ)
// --------------------------------------------------------
const BUSINESS_DATA = [
    {
        id: 'wash', name: 'Автомойка 24/7', minLevel: 4,
        income: 4000, level: 0, cost: 85000, reqStars: 5, stored: 0, stock: 100,
        perk: 'Скидка 50% на полировку и химчистку',
        desc: 'Круглосуточный комплекс бесконтактной мойки и сушки кузова.',
        img: 'assets/business/wash.jpg',
        fallback: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80',
        reqLegal: true, legalCategory: 'service'
    },
    {
        id: 'shina', name: 'Шиномонтаж «У Алика»', minLevel: 6,
        income: 6000, level: 0, cost: 140000, reqStars: 8, stored: 0, stock: 100,
        perk: '+10% к стоимости авто на правильных дисках',
        desc: 'Правка дисков, ошиповка, монтаж низкого профиля и полусликов.',
        img: 'assets/business/shina.jpg',
        fallback: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80',
        reqLegal: true, legalCategory: 'service'
    },
    {
        id: 'sto', name: 'СТО дяди Вани', minLevel: 9,
        income: 12000, level: 0, cost: 280000, reqStars: 12, stored: 0, stock: 100,
        perk: 'Скидка 40% на ремонт мотора',
        desc: 'Капитальный ремонт ДВС, замена цепей ГРМ, подвески и агрегатов.',
        img: 'assets/business/sto.jpg',
        fallback: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80',
        reqLegal: true, legalCategory: 'service'
    },
    {
        id: 'tow_truck', name: 'Служба эвакуации «Шериф»', minLevel: 10,
        income: 16000, level: 0, cost: 390000, reqStars: 10, stored: 0, stock: 100,
        perk: 'Бесплатный забор авто со спецстоянки ГИБДД',
        desc: 'Парк эвакуаторов для оперативной эвакуации и спасения задержанных машин.',
        img: 'assets/business/tow.jpg',
        fallback: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80',
        reqLegal: true, legalCategory: 'fleet', fleetType: 'tow_truck'
    },
    {
        id: 'delivery', name: 'Курьерская доставка «Экспресс»', minLevel: 11,
        income: 18000, level: 0, cost: 480000, reqStars: 12, stored: 0, stock: 100,
        perk: 'Высокая оборачиваемость малолитражек и фургонов',
        desc: 'Логистическая сеть доставки товаров по городу и пригороду.',
        img: 'assets/business/delivery.jpg',
        fallback: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
        reqLegal: true, legalCategory: 'fleet', fleetType: 'delivery'
    },
    {
        id: 'paint_shop', name: 'Малярный цех «Хамелеон»', minLevel: 13,
        income: 24000, level: 0, cost: 620000, reqStars: 15, stored: 0, stock: 100,
        perk: 'Облив в заводской микронный слой без следов шпаклёвки',
        desc: 'Покрасочная камера с инфракрасной сушкой. ЛКП ложится в заводской допуск.',
        img: 'assets/business/paint.jpg',
        fallback: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=600&q=80',
        reqLegal: true, legalCategory: 'service'
    },
    {
        id: 'chip_tuning', name: 'Лаборатория Stage Lab', minLevel: 16,
        income: 30000, level: 0, cost: 800000, reqStars: 20, stored: 0, stock: 100,
        perk: 'Скидка 30% на установку чип-тюнинга Stage 1-3',
        desc: 'Диностенд и калибровка прошивок ЭБУ под наддувные двигатели.',
        img: 'assets/business/chip.jpg',
        fallback: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80',
        reqLegal: true, legalCategory: 'service'
    },
    {
        id: 'detailing', name: 'Детейлинг Студия', minLevel: 19,
        income: 33000, level: 0, cost: 920000, reqStars: 25, stored: 0, stock: 100,
        perk: '+35% к баллам на Автошоу',
        desc: 'Нанесение керамики, бронеплёнка, полировка и глубокая химчистка салона.',
        img: 'assets/business/detailing.jpg',
        fallback: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=600&q=80',
        reqLegal: true, legalCategory: 'service'
    },
    {
        id: 'razborka', name: 'Авторазборка «Последний путь»', minLevel: 22,
        income: 40000, level: 0, cost: 1150000, reqStars: 30, stored: 0, stock: 100,
        perk: 'Детали на ремонт обходятся дешевле на 30%',
        desc: 'Скупка тотальных и аварийных авто на запчасти, продажа контрактных узлов.',
        img: 'assets/business/razborka.jpg',
        fallback: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=600&q=80',
        reqLegal: true, legalCategory: 'fleet', fleetType: 'razborka'
    },
    {
        id: 'autopodbor', name: 'Агентство «Автоподбор Pro»', minLevel: 25,
        income: 50000, level: 0, cost: 1450000, reqStars: 35, stored: 0, stock: 100,
        perk: '25% шанс найти эксклюзив со скидкой 35% на авторынке',
        desc: 'Штат выездных экспертов находит срочные варианты с огромным дисконтом.',
        img: 'assets/business/podbor.jpg',
        fallback: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80',
        reqLegal: true, legalCategory: 'service'
    },
    {
        id: 'taxi', name: 'Таксопарк', minLevel: 30,
        income: 80000, level: 0, cost: 3600000, reqStars: 50, stored: 0, stock: 100,
        perk: 'Доход масштабируется от класса и состояния машин в таксопарке',
        desc: 'Парк лицензированных седанов под аренду проверенным водителям.',
        img: 'assets/business/taxi.jpg',
        fallback: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80',
        reqLegal: true, legalCategory: 'fleet', fleetType: 'taxi'
    },
    {
        id: 'transport_company', name: 'Транспортная компания «Магистраль»', minLevel: 34,
        income: 140000, level: 0, cost: 4800000, reqStars: 55, stored: 0, stock: 100,
        perk: 'Огромный доход с магистральных фур и дальнобойных тягачей',
        desc: 'Крупнотоннажные грузоперевозки по междугородним маршрутам.',
        img: 'assets/business/cargo.jpg',
        fallback: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80',
        reqLegal: true, legalCategory: 'fleet', fleetType: 'transport_company'
    },
    {
        id: 'customs_hub', name: 'Таможенный хаб Порта', minLevel: 38,
        income: 160000, level: 0, cost: 5200000, reqStars: 60, stored: 0, stock: 100,
        perk: 'Прямые поставки контейнеров и +2 связи ПодКлюч',
        desc: 'Собственный терминал для таможенной очистки автовозов и контейнеров.',
        img: 'assets/business/hub.jpg',
        fallback: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=600&q=80',
        reqLegal: true, legalCategory: 'heavy'
    }
];

// --------------------------------------------------------
// 3. ИНДИВИДУАЛЬНАЯ ПРОКАЧКА КАЖДОГО БИЗНЕСА (13 ОБЪЕКТОВ)
// --------------------------------------------------------
const BUSINESS_INDIVIDUAL_UPGRADES = {
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
        { id: 'chp_dyno',   name: '4WD Диностенд нагрузок',   desc: '+25% к чеку за замеры до и после прошивки',baseCost: 140000, costMul: 1.8, maxLevel: 3, bonusPct: 25, icon: 'fa-tachograph-digital' },
        { id: 'chp_flash',  name: 'Программатор ECU Master',  desc: '+30% к выручке со Stage 2 и Stage 3',    baseCost: 190000, costMul: 1.85, maxLevel: 3, bonusPct: 30, icon: 'fa-laptop-code' },
        { id: 'chp_maps',   name: 'База прошивок под попкорн',desc: '+35% заказов от молодёжи и стритрейсеров',baseCost: 260000, costMul: 1.95, maxLevel: 3, bonusPct: 35, icon: 'fa-bolt' }
    ],
    detailing: [
        { id: 'dtl_ceramic',name: 'Керамика 9H Diamond Pro',  desc: '+20% к чеку защитных покрытий',          baseCost: 130000, costMul: 1.75, maxLevel: 3, bonusPct: 20, icon: 'fa-gem' },
        { id: 'dtl_tornad', name: 'Пневмохимчистка Tornador', desc: '+25% к скорости глубокой чистки салонов',baseCost: 175000, costMul: 1.85, maxLevel: 3, bonusPct: 25, icon: 'fa-soap' },
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
        { id: 'tx_ads',     name: 'Светодиодные медиа-боксы', desc: '+40% пассивной выручки с рекламы на крышах',baseCost: 650000, costMul: 1.95, maxLevel: 3, bonusPct: 40, icon: 'fa-tv' }
    ],
    transport_company: [
        { id: 'tc_glonass', name: 'Спутниковый конвой ГЛОНАСС',desc: '+25% к логистике дальних грузоперевозок',baseCost: 450000, costMul: 1.8, maxLevel: 3, bonusPct: 25, icon: 'fa-satellite' },
        { id: 'tc_cards',   name: 'Корпоративные топливные карты',desc: '+30% к чистой прибыли со скидкой на ДТ',baseCost: 650000, costMul: 1.85, maxLevel: 3, bonusPct: 30, icon: 'fa-gas-pump' },
        { id: 'tc_hub',     name: 'Кросс-докинг терминал 24/7',desc: '+45% к выручке от магистральных тягачей',baseCost: 950000, costMul: 1.95, maxLevel: 3, bonusPct: 45, icon: 'fa-truck-moving' }
    ],
    customs_hub: [
        { id: 'hub_crane',  name: 'Козловой контейнерный кран',desc: '+30% к скорости перегрузки карго',      baseCost: 550000, costMul: 1.8, maxLevel: 3, bonusPct: 30, icon: 'fa-arrows-split-up-and-left' },
        { id: 'hub_green',  name: 'Зелёный таможенный коридор',desc: '+35% к пошлинам и легализации VIN',    baseCost: 800000, costMul: 1.85, maxLevel: 3, bonusPct: 35, icon: 'fa-passport' },
        { id: 'hub_bonded', name: 'Охраняемый таможенный СВХ',desc: '+50% к доходу с оптовых партий контейнеров',baseCost: 1200000, costMul: 1.95, maxLevel: 3, bonusPct: 50, icon: 'fa-building-shield' }
    ]
};

// --------------------------------------------------------
// 4. КАТАЛОГ АВТО-МАРКЕТА
// --------------------------------------------------------
const SHOP_CATALOG = {
    tools: [
        {
            id: "gauge",
            name: "Магнитный толщиномер ЛКП (Базовый)",
            cost: 25000,
            reqStars: 0,
            maxUses: 60,
            serviceCost: 2500,
            desc: "Замеряет шпаклёвку и вторичные окрасы кузова. Ресурс: 60 замеров.",
            icon: "fa-ruler-combined"
        },
        {
            id: "gauge_pro",
            name: "Ультразвуковой толщиномер Pro (Цветмет)",
            cost: 65000,
            reqStars: 4,
            maxUses: 100,
            serviceCost: 6000,
            desc: "Высокая точность до 1 мкм. Различает алюминий и цинк. Ресурс: 100 замеров.",
            icon: "fa-microchip"
        },
        {
            id: "obd",
            name: "Автосканер ELM327 Bluetooth v1.5",
            cost: 45000,
            reqStars: 2,
            maxUses: 50,
            serviceCost: 4000,
            desc: "Базовый сканер для чтения и сброса кодов ошибок DTC в ЭБУ мотора. Ресурс: 50 сканов.",
            icon: "fa-laptop-code"
        },
        {
            id: "obd_launch",
            name: "Диагностический планшет Launch Pro Pad",
            cost: 160000,
            reqStars: 8,
            maxUses: 80,
            serviceCost: 12000,
            desc: "Профессиональный комбайн! Обязателен для сервиса «ПодКлюч» и глубокого анализа АКПП. Ресурс: 80 циклов.",
            icon: "fa-tablet-screen-button"
        },
        {
            id: "endoscope",
            name: "HD Видеоэндоскоп мотора с поворотной камерой",
            cost: 85000,
            reqStars: 4,
            maxUses: 40,
            serviceCost: 7500,
            desc: "Осмотр цилиндров на задиры и нагар. Обязателен для контрактов «ПодКлюч» и досмотра контейнеров. Ресурс: 40 осмотров.",
            icon: "fa-video"
        },
        {
            id: "compressor",
            name: "Профессиональный компрессометр с переходниками",
            cost: 38000,
            reqStars: 2,
            maxUses: 50,
            serviceCost: 3500,
            desc: "Замер компрессии цилиндров ДВС. Позволяет выявлять износ колец и клапанов. Ресурс: 50 замеров.",
            icon: "fa-gauge-high"
        }
    ],
    consumables: [
        {
            id: "oil_pack",
            name: "Партия синтетического масла 5W-40 и фильтров",
            cost: 25000,
            reqStars: 0,
            value: 30,
            targetBiz: "sto",
            desc: "+30% сырья на СТО дяди Вани. Обеспечивает бесперебойную работу подъемников."
        },
        {
            id: "chem_pack",
            name: "Бочка автошампуня и нано-керамики (200л)",
            cost: 45000,
            reqStars: 1,
            value: 50,
            targetBiz: "wash",
            desc: "+50% сырья для Автомойки и Детейлинг студии. Защищает кузов и придает зеркальный блеск."
        },
        {
            id: "full_stock",
            name: "Генеральный оптовый запас (100% на все точки)",
            cost: 140000,
            reqStars: 5,
            value: 100,
            targetBiz: "all",
            desc: "Мгновенно заполняет склады всех выкупленных предприятий до 100%!"
        }
    ],
    tuningParts: [
        {
            id: "raf_license",
            name: "Гоночная Лицензия пилота РАФ (Категория Д)",
            cost: 85000,
            reqStars: 15,
            desc: "Официальный регламентный допуск пилота к ночным заездам на 402м в Стрите.",
            icon: "fa-id-card"
        },
        {
            id: "insurance_osago",
            name: "Генеральный полис «КАСКО / Анти-Угон»",
            cost: 45000,
            reqStars: 5,
            desc: "100% защита от случайных повреждений на парковке, автоподстав и ночных угонов.",
            icon: "fa-shield-halved"
        }
    ],
    homeItems: []
};

// --------------------------------------------------------
// 5. ЕЖЕДНЕВНЫЕ НАГРАДЫ
// --------------------------------------------------------
const DAILY_REWARDS_CONFIG = [
    { day: 1, title: "+25k ₽ & 15 ⛽", reward: { cash: 25000, fuel: 15 } },
    { day: 2, title: "+50k ₽ & 1 🤝 & Талон Штрафстоянки", reward: { cash: 50000, connections: 1, freeImpoundPasses: 1 } },
    { day: 3, title: "+90k ₽ & 10 ⭐ (25k ₽) & +100 XP", reward: { cash: 90000, stars: 10, xp: 100 } },
    { day: 4, title: "+150k ₽ & 2 🤝", reward: { cash: 150000, connections: 2 } },
    { day: 5, title: "+250k ₽ & 20 ⭐ (50k ₽) & Сканер Launch", reward: { cash: 250000, stars: 20, tool: "obd_launch" } },
    { day: 6, title: "+400k ₽ & Полный Бак & +250 XP", reward: { cash: 400000, fuel: 100, xp: 250 } },
    { day: 7, title: "+750k ₽ & 30 ⭐ (75k ₽) & Номер Х777ХХ 77", reward: { cash: 750000, stars: 30, specialPlate: "Х777ХХ 77" } }
];

// --------------------------------------------------------
// 6. БАНКОВСКИЕ ДЕПОЗИТЫ И КРЕДИТЫ
// --------------------------------------------------------
const BANK_DEPOSIT_CONFIG = {
    autoCapital: {
        dailyRate: 0.015,
        compoundPeriodMs: 60000,
        maxOfflineDays: 30,
        minDeposit: 10000
    },
    safeDeposit: {
        annualRate: 0,
        isProtectedFromDebt: true,
        isProtectedFromRaids: true
    },
    creditScoring: {
        baseLimit: 150000,
        limitPerLevel: 150000,
        standardDailyRate: 0.02,
        overduePenaltyDailyRate: 0.03,
        gracePeriodHours: 72,
        maxRating: 5.0,
        ratingBonusOnRepay: 0.2,
        ratingPenaltyOnOverduePerDay: 0.15
    },
    minAmount: 100000,
    maxAmount: 500000000,
    dailyPercent: 0.3,
    terms: [
        { days: 7,   label: "1 неделя",   dailyPercent: 0.2, autoCompound: false },
        { days: 30,  label: "1 месяц",    dailyPercent: 0.3, autoCompound: false },
        { days: 90,  label: "3 месяца",   dailyPercent: 0.5, autoCompound: true },
        { days: 365, label: "1 год",      dailyPercent: 0.8, autoCompound: true }
    ],
    earlyWithdrawPenaltyPct: 30
};

// ========================================================
// 7. ЮРИДИЧЕСКИЕ ЛИЦА
// ========================================================
const LEGAL_ENTITIES = {
    none: {
        id: 'none',
        name: 'Физическое лицо',
        taxRate: 0,
        regFee: 0,
        reqStars: 0,
        maxFleetTotal: 0,
        allowedBusinesses: [],
        desc: 'Обычный гражданин. Покупка автобизнесов заблокирована.'
    },
    ip: {
        id: 'ip',
        name: 'Индивидуальный предприниматель (ИП)',
        tag: 'ИП',
        taxRate: 0.06,
        regFee: 15000,
        reqStars: 2,
        minLevel: 4,
        maxFleetPerBiz: 5,
        maxFleetTotal: 15,
        allowedBusinesses: ['wash', 'shina', 'sto', 'tow_truck', 'delivery', 'paint_shop', 'chip_tuning', 'detailing', 'razborka', 'taxi'],
        desc: 'Упрощёнка 6%. До 5 машин на бизнес.'
    },
    ooo: {
        id: 'ooo',
        name: 'Общество с огр. ответственностью (ООО)',
        tag: 'ООО',
        taxRate: 0.15,
        regFee: 80000,
        reqStars: 10,
        minLevel: 8,
        maxFleetPerBiz: 25,
        maxFleetTotal: 100,
        allowedBusinesses: ['wash', 'shina', 'sto', 'tow_truck', 'delivery', 'paint_shop', 'chip_tuning', 'detailing', 'razborka', 'taxi', 'transport_company', 'customs_hub', 'autopodbor'],
        desc: 'Налог 15%, автопарк до 25 машин на бизнес, доступ ко всем ТК.'
    }
};

// ========================================================
// 8. ТРЕБОВАНИЯ ДЛЯ АВТОПАРКОВ
// ========================================================
const BUSINESS_FLEET_REQUIREMENTS = {
    taxi: {
        bizId: 'taxi',
        name: 'Таксопарк',
        icon: 'fa-taxi',
        badgeColor: '#f1c40f',
        allowedCategories: ['economy', 'comfort', 'premium'],
        forbiddenCategories: ['truck', 'moto', 'scooter', 'atv', 'yacht', 'hyper'],
        minCondition: 45,
        allowAccidents: false,
        classIncomeMultipliers: { economy: 1.0, comfort: 1.45, premium: 2.2 },
        baseDailyIncomePercent: 0.045
    },
    delivery: {
        bizId: 'delivery',
        name: 'Курьерская доставка',
        icon: 'fa-box-open',
        badgeColor: '#3498db',
        allowedCategories: ['scooter', 'economy', 'truck'],
        forbiddenCategories: ['premium', 'hyper', 'yacht', 'atv'],
        minCondition: 30,
        allowAccidents: true,
        classIncomeMultipliers: { scooter: 0.8, economy: 1.15, truck: 1.85 },
        baseDailyIncomePercent: 0.05
    },
    transport_company: {
        bizId: 'transport_company',
        name: 'Транспортная компания',
        icon: 'fa-truck-moving',
        badgeColor: '#e67e22',
        allowedCategories: ['truck'],
        forbiddenCategories: ['economy', 'comfort', 'premium', 'hyper', 'moto', 'scooter', 'atv', 'yacht'],
        minCondition: 50,
        allowAccidents: false,
        classIncomeMultipliers: { truck: 1.6 },
        baseDailyIncomePercent: 0.065
    },
    tow_truck: {
        bizId: 'tow_truck',
        name: 'Служба эвакуации',
        icon: 'fa-truck-pickup',
        badgeColor: '#e74c3c',
        allowedCategories: ['truck'],
        forbiddenCategories: ['economy', 'comfort', 'premium', 'hyper', 'moto', 'scooter', 'atv', 'yacht'],
        minCondition: 40,
        allowAccidents: true,
        classIncomeMultipliers: { truck: 1.3 },
        baseDailyIncomePercent: 0.05
    },
    razborka: {
        bizId: 'razborka',
        name: 'Авторазборка',
        icon: 'fa-wrench',
        badgeColor: '#9b59b6',
        allowedCategories: ['economy', 'comfort', 'premium', 'truck'],
        forbiddenCategories: ['yacht', 'hyper'],
        maxCondition: 55,
        allowAccidents: true,
        classIncomeMultipliers: { economy: 0.9, comfort: 1.3, premium: 2.1, truck: 1.7 },
        baseDailyIncomePercent: 0.055
    }
};

// ========================================================
// 9. ПРАВИЛА И ТАРИФЫ МРЭО
// ========================================================
const MREO_CONFIG = {
    commercialRegFee: 8500,
    inspectionFee: 2500,
    unregisteredPenaltyPct: 0.50,
    allowedStatus: {
        UNREGISTERED: 'unregistered',
        REGISTERED: 'registered',
        IN_SERVICE: 'in_service'
    }
};

// ========================================================
// 10. КАЛЬКУЛЯТОР ДОХОДНОСТИ АВТОПАРКА И СОВМЕСТИМОСТИ
// ========================================================
const FLEET_CALCULATOR = {
    checkSuitability: function(car, ownedBusinesses = []) {
        if (!car) return { suitable: false, matches: [] };

        if (!Array.isArray(ownedBusinesses) || ownedBusinesses.length === 0) {
            return { suitable: false, matches: [] };
        }

        const carCategory = (car.category || car.type || 'economy').toLowerCase();
        const condition = Number(car.condition || 100);
        const hasAccidents = Boolean(car.accidentCount > 0 || (car.defects && car.defects.length > 2));
        const legalClean = !car.hasArrest && !car.hasPledge;

        const matches = [];

        Object.keys(BUSINESS_FLEET_REQUIREMENTS).forEach(bizKey => {
            const req = BUSINESS_FLEET_REQUIREMENTS[bizKey];

            if (!ownedBusinesses.includes(req.bizId)) return;

            const isCategoryAllowed = req.allowedCategories.includes(carCategory);
            const isCategoryForbidden = req.forbiddenCategories && req.forbiddenCategories.includes(carCategory);

            if (!isCategoryAllowed || isCategoryForbidden) return;

            if (req.minCondition && condition < req.minCondition) return;
            if (req.maxCondition && condition > req.maxCondition) return;

            if (req.allowAccidents === false && hasAccidents) return;

            matches.push({
                bizId: req.bizId,
                name: req.name,
                icon: req.icon,
                badgeColor: req.badgeColor,
                isOwned: true,
                legalClean: legalClean
            });
        });

        return {
            suitable: matches.length > 0,
            matches: matches
        };
    },

    calculateCarDailyIncome: function(car, bizType, legalType = 'ip', isRegisteredMREO = true) {
        const req = BUSINESS_FLEET_REQUIREMENTS[bizType];
        if (!req) return { grossIncome: 0, taxDeduction: 0, netIncome: 0 };

        const price = Number(car.basePrice || car.price || 300000);
        const carCategory = (car.category || car.type || 'economy').toLowerCase();
        const condition = Math.max(10, Math.min(100, Number(car.condition || 100))) / 100;

        const classMul = req.classIncomeMultipliers[carCategory] || 1.0;

        let gross = Math.round(price * req.baseDailyIncomePercent * classMul * condition);

        if (!isRegisteredMREO) {
            gross = Math.round(gross * (1 - MREO_CONFIG.unregisteredPenaltyPct));
        }

        const legal = LEGAL_ENTITIES[legalType] || LEGAL_ENTITIES.ip;
        const tax = Math.round(gross * legal.taxRate);
        const net = Math.max(0, gross - tax);

        return {
            grossIncome: gross,
            taxDeduction: tax,
            netIncome: net,
            taxRate: legal.taxRate
        };
    }
};

// Экспорт в глобальный контекст window
window.APP_ACCESS_CONFIG = APP_ACCESS_CONFIG;
window.WHEEL_CONFIG = WHEEL_CONFIG;
window.MARKET_ECONOMY_CONFIG = MARKET_ECONOMY_CONFIG;
window.BANK_EXCHANGE_RATES = BANK_EXCHANGE_RATES;
window.SEASONS_ECONOMY_CONFIG = SEASONS_ECONOMY_CONFIG;
window.INTERCITY_HAUL_CONFIG = INTERCITY_HAUL_CONFIG;
window.HOUSING_LIST = HOUSING_LIST;
window.BUSINESS_DATA = BUSINESS_DATA;
window.BUSINESS_INDIVIDUAL_UPGRADES = BUSINESS_INDIVIDUAL_UPGRADES;
window.SHOP_CATALOG = SHOP_CATALOG;
window.DAILY_REWARDS_CONFIG = DAILY_REWARDS_CONFIG;
window.BANK_DEPOSIT_CONFIG = BANK_DEPOSIT_CONFIG;
window.LEGAL_ENTITIES = LEGAL_ENTITIES;
window.BUSINESS_FLEET_REQUIREMENTS = BUSINESS_FLEET_REQUIREMENTS;
window.MREO_CONFIG = MREO_CONFIG;
window.FLEET_CALCULATOR = FLEET_CALCULATOR;

console.log('[📈 data_economy v3.6.0] Сезонные циклы (Зима/Лето) + Инсайдерский перегон авто ✓');

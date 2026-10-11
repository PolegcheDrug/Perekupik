// ========================================================
// data.js — БАЗА ДАННЫХ ИГРЫ «СИМУЛЯТОР ПЕРЕКУПА» (v0.4.7)
// Разработчики: Tak Toje, Max, Sergo, gemini
// Полный каталог автотехники, тюнинга, недвижимости,
// бизнеса, товаров маркета, износа оборудования и алгоритм оценки номеров.
// ========================================================

const GAME_METADATA = {
    version: "v0.4.7",
    build: 170,
    authors: "Tak Toje, Max, Sergo, gemini",
    releaseDate: "2026-10-11",
    patchNotes: [
        {
            title: "🏠 Новая система Жилья, Боксов и Мастерских",
            text: "Теперь недвижимость разделена по специализациям: уличные стоянки, капитальные боксы ГСК с ямой, детейлинг-боксы, квартиры и загородные комплексы. Каждое жильё открывает свой набор доработок."
        },
        {
            title: "🔧 Разделение прав на Тюнинг и Детейлинг",
            text: "Без смотровой ямы нельзя варить дифференциал и ставить выворот, а без закрытого чистого бокса с водой нельзя выполнять полировку и качественный облив."
        },
        {
            title: "📉 Расходники для гаража и мастерской",
            text: "В маркет добавлены расходные материалы: полировальные пасты, сварочная смесь и комплекты ключей для обслуживания автопарка."
        },
        {
            title: "🕵️‍♂️ Подпольный цех и скидки у Решалы",
            text: "Владение капитальным боксом или ангаром снижает стоимость услуг Решалы Артура по отмыву VIN и снятию отметок 12.5.1."
        },
        {
            title: "🎲 События недвижимости при смене суток",
            text: "Жалобы соседей на шум выхлопа, затопление ямы грунтовыми водами или предложения от соседей по гаражу выкупить авто из-под деда."
        }
    ]
};

// ========================================================
// 1. АВТОНОМНЫЙ АЛГОРИТМ ОЦЕНКИ БЛАТНЫХ ГОСНОМЕРОВ
// ========================================================
function calculatePlateValue(plateStr) {
    if (!plateStr || typeof plateStr !== 'string') return 0;
    const clean = plateStr.trim().toUpperCase();
    if (clean.includes('ТРАНЗИТ')) return 0;

    let value = 2500;

    const match = clean.match(/^([А-ЯA-Z])\s*(\d{3})\s*([А-ЯA-Z]{2})\s*(\d{2,3})$/);
    
    if (!match) {
        if (clean.includes('777')) value += 45000;
        if (clean.includes('ЕКХ') || clean.includes('АМР')) value += 250000;
        return value;
    }

    const firstLetter = match[1];
    const numStr = match[2];
    const tailLetters = match[3];
    const regStr = match[4];

    const letters = firstLetter + tailLetters;
    const d1 = numStr[0], d2 = numStr[1], d3 = numStr[2];

    if (numStr === '777') {
        value += 350000;
    } else if (numStr === '001') {
        value += 280000;
    } else if (numStr === '007') {
        value += 220000;
    } else if (d1 === d2 && d2 === d3) {
        value += 160000;
    } else if (numStr.startsWith('00')) {
        value += 95000;
    } else if (numStr.endsWith('00')) {
        value += 65000;
    } else if (d1 === d3 && d1 !== d2) {
        value += 28000;
    }

    const specSeries = {
        'АМР': 850000,
        'ЕКХ': 1200000,
        'СКР': 650000,
        'ВОР': 400000,
        'САС': 250000,
        'ХХХ': 300000,
        'ООО': 320000,
        'ААА': 280000,
        'МММ': 260000
    };

    if (specSeries[letters]) {
        value += specSeries[letters];
    } else if (letters[0] === letters[1] && letters[1] === letters[2]) {
        value += 180000;
    } else if (tailLetters[0] === tailLetters[1]) {
        value += 15000;
    }

    const eliteRegions = ['77', '99', '97', '777'];
    const prestigeRegions = ['177', '199', '799', '50', '90', '150', '190', '750'];

    if (eliteRegions.includes(regStr)) {
        value = Math.round(value * 1.5);
    } else if (prestigeRegions.includes(regStr)) {
        value = Math.round(value * 1.2);
    }

    if (numStr === '777' && regStr === '777' && letters[0] === letters[1] && letters[1] === letters[2]) {
        value = Math.max(value, 3500000);
    }

    return value;
}

// ========================================================
// 2. СЛОВАРЬ ЛОКАЛИЗАЦИИ (RU / EN)
// ========================================================
const I18N_TRANSLATIONS = {
    ru: {
        classes_title: "Классы автотехники",
        cat_economy: "Эконом",
        cat_scooter: "Скутеры",
        cat_moto: "Мото",
        cat_atv: "Квадро",
        cat_comfort: "Комфорт",
        cat_premium: "Премиум",
        cat_hyper: "Гиперкары",
        cat_truck: "Грузовики",
        cat_yacht: "Яхты",
        cat_available: "Доступен",
        btn_refresh_market: "Обновить ленту",
        garage_title: "Мой Автопарк",
        garage_capacity: "Вместимость",
        saleslot_title: "Площадка продаж",
        saleslot_desc: "Покупатели оценивают машины с учётом состояния, эксклюзивности госномеров и вашей репутации.",
        express_passes: "Экспресс-пропуски",
        express_desc: "Ускоряют поиск клиента до 0 сек.",
        waiting_client: "Ожидание клиента",
        busy_subscriber: "Абонент занят",
        paid_call: "Платный дозвон",
        call_seller: "Позвонить продавцу",
        market_estimate: "Оценка рынка",
        price: "ЦЕНА",
        thickness_gauge: "Толщиномер",
        autoteka: "Автотека",
        inspected: "Просмотрено",
        plate_bonus_tip: "🔥 Установлен блатной номер! Рыночная стоимость повышена."
    },
    en: {
        classes_title: "Vehicle Classes",
        cat_economy: "Economy",
        cat_scooter: "Scooters",
        cat_moto: "Motorcycles",
        cat_atv: "ATV / Quads",
        cat_comfort: "Comfort",
        cat_premium: "Premium",
        cat_hyper: "Hypercars",
        cat_truck: "Trucks",
        cat_yacht: "Yachts",
        cat_available: "Available",
        btn_refresh_market: "Refresh Feed",
        garage_title: "My Fleet / Garage",
        garage_capacity: "Capacity",
        saleslot_title: "Sales Lot",
        saleslot_desc: "Buyers evaluate cars considering condition, exclusive license plates, and your reputation.",
        express_passes: "Express Passes",
        express_desc: "Instant buyer search in 0 seconds.",
        waiting_client: "Waiting for buyer",
        busy_subscriber: "Subscriber busy",
        paid_call: "Priority Call",
        call_seller: "Call Seller",
        market_estimate: "Market estimate",
        price: "PRICE",
        thickness_gauge: "Paint Gauge",
        autoteka: "History Report",
        inspected: "Viewed",
        plate_bonus_tip: "🔥 Elite plate equipped! Vehicle value boosted."
    }
};

// ========================================================
// 3. ФОТО-ФОЛЛБЭКИ ПО ВСЕМ КАТЕГОРИЯМ
// ========================================================
const CAR_FALLBACKS_BY_CATEGORY = {
    economy: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80",
    scooter: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80",
    moto: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80",
    atv: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80",
    comfort: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80",
    premium: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80",
    hyper: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80",
    truck: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80",
    yacht: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=600&q=80"
};

// ========================================================
// 4. ПОЛНЫЙ КАТАЛОГ ТЕХНИКИ ПО ВСЕМ 9 КАТЕГОРИЯМ
// ========================================================
const CAR_DATABASE = {
    economy: [
        { name: "Ока (ВАЗ-1111)", power: 33, basePrice: 40000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/oka.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ЗАЗ-968М «Запорожец»", power: 40, basePrice: 35000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/zaz.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Москвич-412", power: 75, basePrice: 50000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/moskvich.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ИЖ-2126 «Ода»", power: 73, basePrice: 55000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/izh.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2101 «Копейка»", power: 64, basePrice: 65000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/vaz-2101.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2106 «Шестерка»", power: 75, basePrice: 75000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/vaz-2106.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2107 «Семёрка»", power: 74, basePrice: 95000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/vaz-2107.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2108 «Зубило»", power: 70, basePrice: 110000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/vaz-2108.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2109 «Девятка»", power: 72, basePrice: 125000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/vaz-2109.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2110 «Десятка»", power: 89, basePrice: 135000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/vaz-2110.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2114 «Четырка»", power: 81, basePrice: 140000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/vaz-2114.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ГАЗ-3110 «Волга»", power: 130, basePrice: 120000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/volga.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Lada Kalina I", power: 81, basePrice: 220000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/kalina.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Lada Priora", power: 98, basePrice: 280000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/priora.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Daewoo Matiz", power: 51, basePrice: 120000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/matiz.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Daewoo Nexia", power: 80, basePrice: 150000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/nexia.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Chevrolet Lanos", power: 86, basePrice: 170000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/lanos.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Renault Logan I", power: 75, basePrice: 350000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/logan.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Nissan Almera Classic", power: 107, basePrice: 400000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/almera.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Ford Focus I", power: 100, basePrice: 300000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/focus1.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Hyundai Solaris I", power: 123, basePrice: 620000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/solaris.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Kia Rio 3", power: 123, basePrice: 650000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/rio.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Toyota Mark II (JZX90)", power: 180, basePrice: 450000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/mark2.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Mitsubishi Lancer IX", power: 98, basePrice: 380000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/lancer9.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "BMW E34 520i", power: 150, basePrice: 250000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/e34.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Mercedes W210", power: 136, basePrice: 300000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/w210.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "BMW E38 740i", power: 286, basePrice: 450000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/e38.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Audi A6 C5", power: 165, basePrice: 350000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/a6c5.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Range Rover P38", power: 218, basePrice: 400000, drivetrain: "awd", type: "economy", img: "assets/cars/economy/p38.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Porsche Cayenne 955", power: 340, basePrice: 500000, drivetrain: "awd", type: "economy", img: "assets/cars/economy/cayenne_old.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Mercedes W140 S500", power: 320, basePrice: 600000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/w140.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy }
    ],
    scooter: [
        { name: "Honda Dio AF34", power: 7, basePrice: 45000, drivetrain: "rwd", type: "scooter", img: "assets/moto/dio.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.scooter },
        { name: "Yamaha Jog ZR", power: 8, basePrice: 55000, drivetrain: "rwd", type: "scooter", img: "assets/moto/jog.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.scooter },
        { name: "Suzuki Lets 2", power: 6, basePrice: 35000, drivetrain: "rwd", type: "scooter", img: "assets/moto/lets.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.scooter },
        { name: "Vespa LX 125", power: 10, basePrice: 120000, drivetrain: "rwd", type: "scooter", img: "assets/moto/vespa.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.scooter }
    ],
    moto: [
        { name: "Bajaj Pulsar NS200", power: 25, basePrice: 240000, drivetrain: "rwd", type: "moto", img: "assets/moto/pulsar.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Kawasaki Ninja 300", power: 39, basePrice: 450000, drivetrain: "rwd", type: "moto", img: "assets/moto/ninja.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Honda CB400 Super Four", power: 53, basePrice: 350000, drivetrain: "rwd", type: "moto", img: "assets/moto/cb400.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Yamaha MT-07", power: 74, basePrice: 890000, drivetrain: "rwd", type: "moto", img: "assets/moto/mt07.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "KTM 390 Duke", power: 44, basePrice: 550000, drivetrain: "rwd", type: "moto", img: "assets/moto/duke.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Harley-Davidson Iron 883", power: 51, basePrice: 1200000, drivetrain: "rwd", type: "moto", img: "assets/moto/iron883.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Triumph Bonneville T100", power: 55, basePrice: 1300000, drivetrain: "rwd", type: "moto", img: "assets/moto/bonneville.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Kawasaki Z900", power: 125, basePrice: 1100000, drivetrain: "rwd", type: "moto", img: "assets/moto/z900.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "BMW R1250GS", power: 136, basePrice: 2500000, drivetrain: "rwd", type: "moto", img: "assets/moto/gs1250.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Suzuki Hayabusa", power: 197, basePrice: 1800000, drivetrain: "rwd", type: "moto", img: "assets/moto/hayabusa.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Yamaha YZF-R1", power: 200, basePrice: 2200000, drivetrain: "rwd", type: "moto", img: "assets/moto/r1.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Ducati Panigale V4", power: 214, basePrice: 3200000, drivetrain: "rwd", type: "moto", img: "assets/moto/ducati.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.moto }
    ],
    atv: [
        { name: "CFMOTO CFORCE 500", power: 35, basePrice: 620000, drivetrain: "awd", type: "atv", img: "assets/moto/cforce.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.atv },
        { name: "Stels Guepard 850", power: 71, basePrice: 950000, drivetrain: "awd", type: "atv", img: "assets/moto/guepard.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.atv },
        { name: "Suzuki KingQuad 750", power: 50, basePrice: 1200000, drivetrain: "awd", type: "atv", img: "assets/moto/kingquad.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.atv },
        { name: "Polaris Sportsman 850", power: 78, basePrice: 1600000, drivetrain: "awd", type: "atv", img: "assets/moto/sportsman.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.atv },
        { name: "Yamaha Grizzly 700", power: 49, basePrice: 1400000, drivetrain: "awd", type: "atv", img: "assets/moto/grizzly.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.atv },
        { name: "BRP Can-Am Maverick", power: 195, basePrice: 3500000, drivetrain: "awd", type: "atv", img: "assets/moto/maverick.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.atv }
    ],
    comfort: [
        { name: "VW Polo Sedan", power: 110, basePrice: 850000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/polo.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Ford Focus III", power: 125, basePrice: 950000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/focus.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Chevrolet Cruze", power: 109, basePrice: 750000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/cruze.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Hyundai Elantra", power: 128, basePrice: 1100000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/elantra.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Kia Cerato", power: 130, basePrice: 1150000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/cerato.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Skoda Octavia A7 1.8", power: 180, basePrice: 1450000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/octavia.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "VW Jetta", power: 150, basePrice: 1300000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/jetta.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Opel Astra J", power: 140, basePrice: 850000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/astra.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Peugeot 408", power: 120, basePrice: 900000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/peugeot408.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Toyota Corolla E150", power: 124, basePrice: 1050000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/corolla.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Mazda 3 (BM)", power: 120, basePrice: 1250000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/mazda3.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Ford Mondeo V", power: 149, basePrice: 1600000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/mondeo.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Hyundai Sonata", power: 150, basePrice: 1900000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/sonata.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Kia Optima", power: 150, basePrice: 1850000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/optima.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Toyota Camry XV50", power: 181, basePrice: 1800000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/camry.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Kia K5", power: 194, basePrice: 2400000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/k5.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "VW Golf VI GTI", power: 260, basePrice: 1450000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/golf6.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Renault Duster", power: 143, basePrice: 1100000, drivetrain: "awd", type: "comfort", img: "assets/cars/comfort/duster.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Hyundai Creta", power: 123, basePrice: 1500000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/creta.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Nissan Qashqai", power: 144, basePrice: 1600000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/qashqai.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Skoda Karoq", power: 150, basePrice: 2100000, drivetrain: "awd", type: "comfort", img: "assets/cars/comfort/karoq.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Toyota RAV4", power: 149, basePrice: 2500000, drivetrain: "awd", type: "comfort", img: "assets/cars/comfort/rav4.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Mazda CX-5", power: 150, basePrice: 2300000, drivetrain: "awd", type: "comfort", img: "assets/cars/comfort/cx5.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Geely Coolray", power: 150, basePrice: 2100000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/coolray.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Haval Jolion", power: 150, basePrice: 2000000, drivetrain: "awd", type: "comfort", img: "assets/cars/comfort/jolion.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort }
    ],
    premium: [
        { name: "BMW 5 Series (G30)", power: 190, basePrice: 3500000, drivetrain: "rwd", type: "premium", img: "assets/cars/premium/g30.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Mercedes E-Class (W213)", power: 197, basePrice: 3800000, drivetrain: "rwd", type: "premium", img: "assets/cars/premium/w213.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Audi A6 (C8)", power: 245, basePrice: 4000000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/a6.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "BMW X7", power: 340, basePrice: 8800000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/bmwx7.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Mercedes C63s AMG", power: 510, basePrice: 5200000, drivetrain: "rwd", type: "premium", img: "assets/cars/premium/mercedes_c_c63_w205_sedan.jpeg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "BMW M340i", power: 387, basePrice: 4800000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/bmw_m_340i.jpeg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Lexus RX 350", power: 300, basePrice: 5500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/rx350.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Porsche Macan S", power: 354, basePrice: 6500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/macan.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Audi Q7", power: 249, basePrice: 7000000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/q7.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "BMW X5 (G05)", power: 340, basePrice: 8500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/x5.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "BMW X6 (G06)", power: 340, basePrice: 9000000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/x6.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Mercedes GLE 400d", power: 330, basePrice: 9500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/gle.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Porsche Cayenne (PO536)", power: 340, basePrice: 10500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/cayenne_new.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Audi Q8", power: 340, basePrice: 9800000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/q8.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Lexus LX 600", power: 415, basePrice: 14000000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/lx600.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Toyota Land Cruiser 300", power: 415, basePrice: 12000000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/lc300.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Range Rover Sport", power: 400, basePrice: 13500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/rr_sport.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Volvo XC90", power: 235, basePrice: 6800000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/xc90.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Genesis GV80", power: 249, basePrice: 7500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/gv80.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Cadillac Escalade", power: 416, basePrice: 11000000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/escalade.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Infiniti QX80", power: 405, basePrice: 8500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/qx80.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Maserati Levante", power: 350, basePrice: 9000000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/levante.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Mercedes S-Class (W223)", power: 367, basePrice: 16000000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/w223.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "BMW 7 Series (G70)", power: 381, basePrice: 15500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/g70.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Mercedes G63 AMG", power: 585, basePrice: 14500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/mercedes_g63amg.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Porsche Panamera Turbo S", power: 630, basePrice: 13500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/panamera.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Audi RS6 Avant", power: 600, basePrice: 12800000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/rs6.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium }
    ],
    hyper: [
        { name: "Nissan GT-R R35", power: 570, basePrice: 12000000, drivetrain: "awd", type: "hyper", img: "assets/cars/hyper/gtr.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "Porsche 911 GT3 RS", power: 525, basePrice: 29000000, drivetrain: "rwd", type: "hyper", img: "assets/cars/hyper/911.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "Lamborghini Huracan", power: 640, basePrice: 35000000, drivetrain: "awd", type: "hyper", img: "assets/cars/hyper/huracan.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "Ferrari SF90 Stradale", power: 1000, basePrice: 75000000, drivetrain: "awd", type: "hyper", img: "assets/cars/hyper/sf90.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "McLaren 720S", power: 720, basePrice: 32000000, drivetrain: "rwd", type: "hyper", img: "assets/cars/hyper/mclaren.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "Lamborghini Aventador SVJ", power: 770, basePrice: 65000000, drivetrain: "awd", type: "hyper", img: "assets/cars/hyper/aventador.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "Porsche 918 Spyder", power: 887, basePrice: 120000000, drivetrain: "awd", type: "hyper", img: "assets/cars/hyper/918.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "McLaren P1", power: 916, basePrice: 140000000, drivetrain: "rwd", type: "hyper", img: "assets/cars/hyper/p1.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "LaFerrari", power: 963, basePrice: 250000000, drivetrain: "rwd", type: "hyper", img: "assets/cars/hyper/laferrari.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "Bugatti Chiron", power: 1500, basePrice: 350000000, drivetrain: "awd", type: "hyper", img: "assets/cars/hyper/chiron.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "Koenigsegg Jesko", power: 1600, basePrice: 400000000, drivetrain: "rwd", type: "hyper", img: "assets/cars/hyper/jesko.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "Pagani Huayra", power: 730, basePrice: 280000000, drivetrain: "rwd", type: "hyper", img: "assets/cars/hyper/huayra.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "Aston Martin Valkyrie", power: 1160, basePrice: 380000000, drivetrain: "rwd", type: "hyper", img: "assets/cars/hyper/valkyrie.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.hyper }
    ],
    truck: [
        { name: "ЗИЛ-130 (С колхоза)", power: 150, basePrice: 250000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/zil.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "Урал NEXT", power: 312, basePrice: 4500000, drivetrain: "awd", type: "truck", img: "assets/cars/truck/ural.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "ГАЗель NEXT", power: 149, basePrice: 1800000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/gazel.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "КАМАЗ-54901 Continent", power: 460, basePrice: 7200000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/kamaz.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "DAF XF 105", power: 460, basePrice: 4500000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/daf.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "MAN TGX", power: 480, basePrice: 9500000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/man.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "Mercedes-Benz Actros", power: 510, basePrice: 12000000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/actros.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "Iveco Stralis", power: 460, basePrice: 3800000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/iveco.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "Renault T-High", power: 520, basePrice: 8500000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/renault_t.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "Freightliner Cascadia", power: 505, basePrice: 6500000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/freightliner.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "Peterbilt 389", power: 550, basePrice: 14000000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/peterbilt.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "Kenworth W900", power: 600, basePrice: 15500000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/kenworth.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "Volvo FH16", power: 750, basePrice: 15500000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/volvo.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.truck }
    ],
    yacht: [
        { name: "Гидроцикл Yamaha FX", power: 250, basePrice: 1800000, drivetrain: "jet", type: "yacht", img: "assets/cars/yacht/yamaha.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.yacht },
        { name: "Катер Bayliner VR5", power: 200, basePrice: 4500000, drivetrain: "prop", type: "yacht", img: "assets/cars/yacht/bayliner.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.yacht },
        { name: "Azimut Atlantis 45", power: 880, basePrice: 75000000, drivetrain: "prop", type: "yacht", img: "assets/cars/yacht/azimut.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.yacht },
        { name: "Sunseeker 95 Yacht", power: 3900, basePrice: 450000000, drivetrain: "prop", type: "yacht", img: "assets/cars/yacht/sunseeker.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.yacht }
    ]
};

// ========================================================
// 5. РАСШИРЕННЫЙ КАТАЛОГ НЕДВИЖИМОСТИ, БОКСОВ И МАСТЕРСКИХ
// С МАТРИЦЕЙ ТЕХНИЧЕСКИХ ВОЗМОЖНОСТЕЙ
// ========================================================
const HOUSING_LIST = [
    { 
        id: 'trailer', 
        name: 'Бытовка на стройплощадке', 
        category: 'street',
        typeLabel: 'Временная стоянка',
        rent: 800, 
        buyPrice: 450000, 
        reqStars: 5, 
        slots: 0, 
        moodBonus: -5, 
        minLevel: 1, 
        canTune: false,
        canDetail: false,
        canService: false,
        canOBDGarage: false,
        hasPersonalSlot: false,
        reshalaDiscountPct: 0,
        perk: 'Только ночлег. Доработки и тюнинг невозможны.',
        desc: 'Временный строительный вагончик у обочины. Сквозняки, запах мазута, верстака нет. Автомобили стоят под открытым небом.', 
        img: 'assets/houses/trailer.jpg',
        fallback: 'https://images.unsplash.com/photo-1590725140246-201552a488c9?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'room', 
        name: 'Комната в общежитии', 
        category: 'living',
        typeLabel: 'Жильё + Двор',
        rent: 2500, 
        buyPrice: 1800000, 
        reqStars: 10, 
        slots: 1, 
        moodBonus: 5, 
        minLevel: 2, 
        canTune: false,
        canDetail: false,
        canService: true,
        canOBDGarage: false,
        hasPersonalSlot: false,
        reshalaDiscountPct: 0,
        perk: 'Одно стихийное машиноместо во дворе. Разрешена быстрая замена масла/присадок.',
        desc: 'Комната в спальном районе. Автомобиль стоит под окнами у подъезда. Мелкий сервисный ремонт разрешён, но красить и варить соседи не дадут.', 
        img: 'assets/houses/room.jpg',
        fallback: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'gsk_box', 
        name: 'Стандартный бокс в ГСК-7', 
        category: 'box',
        typeLabel: 'Капитальный бокс ГСК',
        rent: 9000, 
        buyPrice: 1600000, 
        reqStars: 12, 
        slots: 2, 
        moodBonus: 8, 
        minLevel: 4, 
        canTune: true,
        canDetail: false,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 5,
        perk: 'Смотровая яма, электричество 220V, верстак со слесарными тисками.',
        desc: 'Настоящее логово перекупа! Сухая яма, верстак и диодное освещение. Открывает корчевание, заварку редукторов и диагностику ЭБУ.', 
        img: 'assets/houses/garage.jpg',
        fallback: 'https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'khrusch', 
        name: 'Убитая "Хрущевка"', 
        category: 'living',
        typeLabel: 'Квартира в хрущёвке',
        rent: 15000, 
        buyPrice: 4500000, 
        reqStars: 15, 
        slots: 1, 
        moodBonus: 10, 
        minLevel: 6, 
        canTune: false,
        canDetail: false,
        canService: true,
        canOBDGarage: false,
        hasPersonalSlot: false,
        reshalaDiscountPct: 0,
        perk: 'Уютный сон, быстрое восстановление настроения, парковка во дворе.',
        desc: 'Бабушкин ремонт, старый скрипучий паркет, зато своя горячая ванна и кухня. Машина паркуется на асфальте под фонарём.', 
        img: 'assets/houses/khrusch.jpg',
        fallback: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'garage', 
        name: 'Двойной бокс с ямой и печкой', 
        category: 'box',
        typeLabel: 'Слесарная мастерская',
        rent: 22000, 
        buyPrice: 3200000, 
        reqStars: 20, 
        slots: 3, 
        moodBonus: 14, 
        minLevel: 8, 
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 10,
        perk: 'Сварка, полировальный пост, печь на отработке и 3 свободных машиноместа.',
        desc: 'Широкий спаренный бокс с буржуйкой, верстаком, компрессором и мойкой высокого давления. Позволяет готовить тачки к продаже под ключ.', 
        img: 'assets/houses/garage.jpg',
        fallback: 'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'dvushka', 
        name: 'Двушка в спальном районе', 
        category: 'living',
        typeLabel: 'Городская квартира',
        rent: 28000, 
        buyPrice: 8500000, 
        reqStars: 25, 
        slots: 2, 
        moodBonus: 18, 
        minLevel: 14, 
        canTune: false,
        canDetail: false,
        canService: true,
        canOBDGarage: false,
        hasPersonalSlot: true,
        reshalaDiscountPct: 0,
        perk: 'Закреплённое парковочное место со шлагбаумом во дворе.',
        desc: 'Хороший кирпичный дом, стеклопакеты, видеонаблюдение за парковкой. Высокий комфорт проживания перекупа.', 
        img: 'assets/houses/dvushka.jpg',
        fallback: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'workshop_pro', 
        name: 'Тюнинг-Ангар с подъёмником', 
        category: 'box',
        typeLabel: 'Профессиональный сервис',
        rent: 55000, 
        buyPrice: 12000000, 
        reqStars: 35, 
        slots: 5, 
        moodBonus: 22, 
        minLevel: 20, 
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 20,
        perk: 'Двухстоечный подъёмник, камера обдува, скидка 20% на услуги Решалы!',
        desc: 'Полноценный коммерческий цех в промзоне. Подъёмник, мощная приточка, возможность перебивать и отмывать VIN своими силами.', 
        img: 'assets/houses/workshop.jpg',
        fallback: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'euro_treshka', 
        name: 'Евро-трешка (Новостройка)', 
        category: 'living',
        typeLabel: 'Бизнес-класс с паркингом',
        rent: 48000, 
        buyPrice: 16000000, 
        reqStars: 40, 
        slots: 3, 
        moodBonus: 28, 
        minLevel: 25, 
        canTune: false,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 0,
        perk: 'Подземный теплый паркинг с детейлинг-постом и зарядкой для электрокаров.',
        desc: 'ЖК комфорт-класса. Закрытый двор, охраняемый подземный паркинг, автомоечный комплекс прямо в цоколе здания.', 
        img: 'assets/houses/treshka.jpg',
        fallback: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'cottage', 
        name: 'Коттедж за городом с гаражом', 
        category: 'estate',
        typeLabel: 'Загородная усадьба',
        rent: 75000, 
        buyPrice: 24000000, 
        reqStars: 55, 
        slots: 7, 
        moodBonus: 35, 
        minLevel: 32, 
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 15,
        perk: 'Свой закрытый двор на 7 авто, тёплый гараж, зона отдыха и барбекю.',
        desc: 'Собственный участок, трёхфазная сеть 380V, смотровая яма и мойка высокого давления. Соседи далеко — газуй в отсечку хоть ночью.', 
        img: 'assets/houses/cottage.jpg',
        fallback: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'loft', 
        name: 'Дизайнерский Лофт в центре', 
        category: 'living',
        typeLabel: 'Премиум-апартаменты',
        rent: 95000, 
        buyPrice: 38000000, 
        reqStars: 75, 
        slots: 4, 
        moodBonus: 40, 
        minLevel: 45, 
        canTune: false,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 0,
        perk: '+40% настроения каждый день, персональные места на VIP-паркинге.',
        desc: 'Красный кирпич, панорамные окна с видом на набережную, стильный интерьер. Идеально для отдыха автоолигарха.', 
        img: 'assets/houses/loft.jpg',
        fallback: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'penthouse', 
        name: 'Пентхаус в Москва-Сити', 
        category: 'estate',
        typeLabel: 'Небоскрёб & VIP Паркинг',
        rent: 280000, 
        buyPrice: 150000000, 
        reqStars: 110, 
        slots: 8, 
        moodBonus: 55, 
        minLevel: 65, 
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 25,
        perk: 'Личный VIP-бокс на -3 этаже Башни с охраной, консьержем и мойкой.',
        desc: 'Панорамный вид с 65 этажа, консьерж-сервис, охраняемый подземный гаражный комплекс для коллекции спорткаров.', 
        img: 'assets/houses/penthouse.jpg',
        fallback: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'villa', 
        name: 'Особняк на Рублёвке', 
        category: 'estate',
        typeLabel: 'Резиденция миллионера',
        rent: 650000, 
        buyPrice: 480000000, 
        reqStars: 160, 
        slots: 18, 
        moodBonus: 85, 
        minLevel: 85, 
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 35,
        perk: 'Свой автосервисный цех, малярная камера, охрана ЧОП, скидка 35% у Решалы!',
        desc: 'Гектар соснового бора, собственный автосервис на 4 поста, профессиональная покрасочная камера и ангар для редких лотов.', 
        img: 'assets/houses/villa.jpg',
        fallback: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'island', 
        name: 'Частный остров с виллой', 
        category: 'estate',
        typeLabel: 'Личный Остров Олигарха',
        rent: 2200000, 
        buyPrice: 1500000000, 
        reqStars: 300, 
        slots: 35, 
        moodBonus: 100, 
        minLevel: 100, 
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 50,
        perk: 'Полный иммунитет от проверок ГИБДД, личный пирс для яхт и скидка 50% у Решалы!',
        desc: 'Абсолютная автономия в нейтральных водах. Свой порт, вертолётная площадка, музей для гиперкаров и полная свобода от любых ограничений.', 
        img: 'assets/houses/island.jpg',
        fallback: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
    }
];

// ========================================================
// СЛУЧАЙНЫЕ СОБЫТИЯ НЕДВИЖИМОСТИ ПРИ СМЕНЕ СУТОК
// ========================================================
const HOUSING_RANDOM_EVENTS = [
    {
        id: "ev_neighbor_complaint",
        applicableCategories: ["living"],
        title: "Жалоба жильцов на прямоток",
        desc: "Соседи по подъезду вызвали участкового из-за прогрева громкого выхлопа под окнами в 7 утра.",
        penaltyMood: 20,
        penaltyCash: 2500,
        resultMsg: "Вы заплатили штраф за нарушение тишины (-2,500 ₽, -20 настроения)."
    },
    {
        id: "ev_gsk_water_leak",
        applicableCategories: ["box"],
        title: "Грунтовые воды в смотровой яме",
        desc: "Весенняя оттепель подтопила нижний ярус гаражного бокса. Пришлось вызывать помпу.",
        penaltyCash: 6000,
        resultMsg: "Яма осушена и проветрена (-6,000 ₽ за насос)."
    },
    {
        id: "ev_grandpa_deal",
        applicableCategories: ["box", "estate"],
        title: "Предложение деда из соседнего бокса",
        desc: "Дедушка Михалыч продаёт советские запасы инструмента и старую резину по бросовой цене.",
        rewardDesc: "+15% сырья для предприятий и +5 к карме за помощь пожилому соседу.",
        bonusKarma: 5,
        bonusStock: 15
    },
    {
        id: "ev_tszh_praise",
        applicableCategories: ["estate", "living"],
        title: "Идеальный порядок на паркинге",
        desc: "Управляющая компания отметила аккуратность вашего парковочного бокса. Завистники кусают локти!",
        bonusMood: 15,
        resultMsg: "Приятно жить красиво! (+15 настроения)."
    }
];

// ========================================================
// 6. ПРЕДПРИЯТИЯ И БИЗНЕС С КОМБИНИРОВАННОЙ ОПЛАТОЙ (₽ + ⭐)
// ========================================================
const BUSINESS_DATA = [
    { 
        id: 'wash', name: 'Автомойка 24/7', minLevel: 5, income: 900, level: 0, cost: 90000, reqStars: 5, stored: 0, stock: 100, 
        perk: 'Скидка 50% на полировку и химчистку', 
        img: 'assets/business/wash.jpg',
        fallback: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'shina', name: 'Шиномонтаж «У Алика»', minLevel: 8, income: 1500, level: 0, cost: 150000, reqStars: 10, stored: 0, stock: 100, 
        perk: '+10% к стоимости авто на правильных дисках', 
        img: 'assets/business/shina.jpg',
        fallback: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'sto', name: 'СТО дяди Вани', minLevel: 12, income: 2200, level: 0, cost: 300000, reqStars: 15, stored: 0, stock: 100, 
        perk: 'Скидка 40% на ремонт мотора', 
        img: 'assets/business/sto.jpg',
        fallback: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'detailing', name: 'Детейлинг Студия', minLevel: 20, income: 6500, level: 0, cost: 950000, reqStars: 25, stored: 0, stock: 100, 
        perk: '+35% к баллам на Автошоу', 
        img: 'assets/business/detailing.jpg',
        fallback: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'razborka', name: 'Авторазборка «Последний путь»', minLevel: 22, income: 8000, level: 0, cost: 1200000, reqStars: 30, stored: 0, stock: 100, 
        perk: 'Детали на ремонт обходятся дешевле на 30%', 
        img: 'assets/business/razborka.jpg',
        fallback: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'taxi', name: 'Таксопарк (15 авто)', minLevel: 32, income: 18000, level: 0, cost: 3800000, reqStars: 50, stored: 0, stock: 100, 
        perk: 'Пассивный доход и +1 🤝 связь каждый день', 
        img: 'assets/business/taxi.jpg',
        fallback: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80'
    }
];

// ========================================================
// 7. САРАИ И РАРИТЕТЫ
// ========================================================
const BARN_TIERS_CONFIG = [
    { 
        tier: 1, reqLvl: 1, cost: 35000, reqStars: 2, title: "🏚️ Сарай в СНТ «Заря»", 
        desc: "Дачный кооператив. Старый деревянный сарай среди яблонь. Советская классика.", 
        classGrade: "barn-grade-1", rareIdx: 0,
        img: "assets/barns/barn_tier1.jpg",
        fallback: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80"
    },
    { 
        tier: 2, reqLvl: 7, cost: 120000, reqStars: 5, title: "🏢 Заброшенный бокс ГСК-4", 
        desc: "Кооператив возле промзоны. Ржавые ворота, но сухой бетон внутри.", 
        classGrade: "barn-grade-2", rareIdx: 1,
        img: "assets/barns/barn_tier2.jpg",
        fallback: "https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?auto=format&fit=crop&w=600&q=80"
    },
    { 
        tier: 3, reqLvl: 15, cost: 350000, reqStars: 10, title: "🏭 Ангар механического завода", 
        desc: "Закрытый цех советского завода. Высокие потолки, пыльные чехлы и JDM янгтаймеры.", 
        classGrade: "barn-grade-3", rareIdx: 2,
        img: "assets/barns/barn_tier3.jpg",
        fallback: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80"
    },
    { 
        tier: 4, reqLvl: 25, cost: 850000, reqStars: 20, title: "🏛️ Подземный коллекционный бункер", 
        desc: "Опечатанный подземный паркинг обанкротившегося банка. Настоящая сокровищница!", 
        classGrade: "barn-grade-4", rareIdx: 4,
        img: "assets/barns/barn_tier4.jpg",
        fallback: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80"
    }
];

const BARN_FINDS = [
    { name: "ВАЗ-2101 «Копейка» (Дрифт-Спек)", power: 160, type: 'economy', basePrice: 850000, marketValue: 1250000, img: "assets/cars/barn/vaz2101_drift.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
    { name: "BMW E30 Coupe", power: 170, type: 'comfort', basePrice: 650000, marketValue: 1300000, img: "assets/cars/barn/e30.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
    { name: "Nissan Silvia S13", power: 200, type: 'comfort', basePrice: 900000, marketValue: 1800000, img: "assets/cars/barn/silvia.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
    { name: "VW Golf VI GTI (Stage 2 Project)", power: 280, type: 'comfort', basePrice: 1100000, marketValue: 1900000, img: "assets/cars/comfort/golf6.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
    { name: "ГАЗ-24 «Волга» V8", power: 220, type: 'economy', basePrice: 700000, marketValue: 1500000, img: "assets/cars/barn/volga24.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
    { name: "Nissan Skyline GT-R R34 (В пыли)", power: 280, type: 'premium', basePrice: 4500000, marketValue: 9500000, img: "assets/cars/barn/r34.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
    { name: "Toyota Supra A80 (Без мотора)", power: 0, type: 'premium', basePrice: 3200000, marketValue: 7000000, img: "assets/cars/barn/supra.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium }
];

// ========================================================
// 8. СУПЕР ВИЛСПИН: ЛУТ-ПУЛ
// ========================================================
const SUPER_SPIN_TIERS = {
    reelCars: [
        { type: "empty", name: "Ничего (Промах)", emoji: "💨", desc: "Пустой лот слота" },
        { type: "part", name: "Спортивный фильтр нулевик", emoji: "🌪️", cashValue: 12000 },
        { type: "part", name: "Комплект тормозных колодок Brembo", emoji: "🛑", cashValue: 24000 },
        { type: "car", name: "Ока (ВАЗ-1111)", power: 33, category: "economy", basePrice: 40000 },
        { type: "car", name: "ВАЗ-2107 «Семёрка»", power: 74, category: "economy", basePrice: 95000 },
        { type: "car", name: "Daewoo Nexia", power: 80, category: "economy", basePrice: 150000 },
        { type: "car", name: "Lada Priora", power: 98, category: "economy", basePrice: 280000 },
        { type: "car", name: "VW Polo Sedan", power: 110, category: "comfort", basePrice: 850000 },
        { type: "car", name: "Skoda Octavia A7 1.8", power: 180, category: "comfort", basePrice: 1450000 },
        { type: "car", name: "BMW M340i", power: 387, category: "premium", basePrice: 4800000, rare: true },
        { type: "car", name: "Porsche 911 GT3 RS", power: 525, category: "hyper", basePrice: 29000000, superRare: true }
    ],
    reelResources: [
        { type: "cash", label: "25,000 ₽", amount: 25000 },
        { type: "cash", label: "60,000 ₽", amount: 60000 },
        { type: "cash", label: "150,000 ₽", amount: 150000 },
        { type: "cash", label: "400,000 ₽", amount: 400000 },
        { type: "fuel", label: "35 ⛽ Топлива", amount: 35 },
        { type: "fuel", label: "100 ⛽ Полный бак", amount: 100 },
        { type: "tickets", label: "10 🎟️ Талонов", amount: 10 },
        { type: "tickets", label: "25 🎟️ Талонов", amount: 25 },
        { type: "conn", label: "+1 🤝 Связь", amount: 1 },
        { type: "jackpot", label: "💰 1,000,000 ₽ ДЖЕКПОТ", amount: 1000000, rare: true }
    ],
    reelExclusives: [
        { type: "none", label: "Без спецприза", emoji: "⚪" },
        { type: "stars", label: "10 ⭐ Stars", amount: 10 },
        { type: "stars", label: "25 ⭐ Stars", amount: 25 },
        { type: "stars", label: "50 ⭐ Stars", amount: 50 },
        { type: "plate", label: "Госномер В777ВВ 77", plate: "В777ВВ 77" },
        { type: "plate", label: "Госномер А001МР 77", plate: "А001МР 77" },
        { type: "plate", label: "Госномер Е777КХ 777", plate: "Е777КХ 777", rare: true },
        { type: "mod_cert", label: "Сертификат на Stage 2 Чип", cashValue: 65000 },
        { type: "mod_cert", label: "Кованые диски Work Meister", cashValue: 60000 },
        { type: "fine", label: "Штраф ДПС за тонировку (-15,000 ₽)", penaltyCash: 15000 }
    ]
};

// ========================================================
// 9. КАТАЛОГ МАГАЗИНА: ИЗНОС ОБОРУДОВАНИЯ, РАСХОДНИКИ БОКСА И ДОКУМЕНТЫ
// ========================================================
const SHOP_CATALOG = {
    tools: [
        { id: "gauge", name: "Магнитный толщиномер ЛКП (Базовый)", cost: 35000, reqStars: 0, maxUses: 60, serviceCost: 3500, desc: "Проверяет шпаклёвку и вторичные окрасы. Ресурс калибровки: 60 замеров.", icon: "fa-ruler-combined" },
        { id: "gauge_pro", name: "Ультразвуковой толщиномер Pro (Цветмет)", cost: 75000, reqStars: 5, maxUses: 100, serviceCost: 7000, desc: "Точность до 1 мкм. Ресурс батареи и датчика: 100 замеров.", icon: "fa-microchip" },
        { id: "obd", name: "Диагностический автосканер ELM327 Bluetooth", cost: 65000, reqStars: 3, maxUses: 50, serviceCost: 5000, desc: "Считывает коды DTC в ЭБУ. Ресурс адаптера: 50 сканирований.", icon: "fa-laptop-code" },
        { id: "obd_launch", name: "Профессиональный сканер Launch Pro", cost: 180000, reqStars: 10, maxUses: 80, serviceCost: 15000, desc: "Обязателен для Синдиката! Адаптация и глубокий анализ. Ресурс: 80 циклов.", icon: "fa-tablet-screen-button" },
        { id: "endoscope", name: "HD Видеоэндоскоп мотора с поворотной камерой", cost: 95000, reqStars: 5, maxUses: 40, serviceCost: 9000, desc: "Обязателен для Синдиката! Осмотр цилиндров на задиры. Ресурс оптики: 40 проверок.", icon: "fa-video" },
        { id: "compressor", name: "Профессиональный компрессометр", cost: 45000, reqStars: 2, maxUses: 50, serviceCost: 4000, desc: "Замер компрессии цилиндров. Ресурс манометра: 50 замеров.", icon: "fa-gauge-high" },
        { id: "battery_tester", name: "Нагрузочная вилка аккумулятора", cost: 25000, reqStars: 0, maxUses: 60, serviceCost: 2000, desc: "Проверка емкости и пускового тока АКБ. Ресурс: 60 проверок.", icon: "fa-car-battery" }
    ],
    consumables: [
        { id: "detail_paste_pack", name: "Набор полировальных паст и микрофибры Koch", cost: 18000, reqStars: 0, value: 40, desc: "Профессиональный абразив. Снижает стоимость полировки в гараже до минимума." },
        { id: "weld_wire_pack", name: "Катушка омедненной проволоки и баллон смеси", cost: 22000, reqStars: 1, value: 50, desc: "Расходники для полуавтомата. Облегчают заварку дифференциалов и вварку каркасов." },
        { id: "oil_pack", name: "Партия синтетического масла и фильтров", cost: 25000, reqStars: 0, value: 30, desc: "+30% сырья на СТО дяди Вани. Обеспечивает бесперебойную работу подъемников." },
        { id: "chem_pack", name: "Бочка премиальной автохимии и шампуней", cost: 45000, reqStars: 1, value: 50, desc: "+50% сырья для Автомойки и Детейлинга. Поддерживает идеальный блеск." },
        { id: "tires_stock", name: "Комплект полусликов и жгутов для шиномонтажа", cost: 35000, reqStars: 1, value: 40, desc: "+40% сырья на Шиномонтаж «У Алика». Устраняет дефицит расходников." },
        { id: "brake_pack", name: "Оптовая партия тормозных колодок и дисков", cost: 55000, reqStars: 2, value: 50, desc: "+50% запаса деталей на Авторазборку. Увеличивает доходность контрактов." },
        { id: "full_stock", name: "Генеральный оптовый запас (100% на все точки)", cost: 140000, reqStars: 5, value: 100, desc: "Мгновенно заполняет склады всех имеющихся предприятий до 100%!" }
    ],
    tuningParts: [
        { id: "raf_license", name: "Гоночная Лицензия пилота РАФ", cost: 85000, reqStars: 15, desc: "Официальный регламентный допуск к ночным заездам на 402м (требуется 85k ₽ + 15 ⭐).", icon: "fa-id-card" },
        { id: "insurance_osago", name: "Годовой полис «КАСКО / Анти-Угон»", cost: 45000, reqStars: 5, desc: "100% защита от случайных повреждений на парковке, подстав и попыток угона.", icon: "fa-shield-halved" },
        { id: "gps_tracker", name: "Скрытый поисковый GPS/ГЛОНАСС маяк", cost: 30000, reqStars: 3, desc: "Позволяет моментально найти и вернуть угнанную машину без помощи полиции и Решалы.", icon: "fa-satellite-dish" }
    ]
};

const HOUSING_INTERIOR_CATALOG = [
    { id: "home_ps5", name: "🎮 Игровая консоль PlayStation 5", cost: 75000, reqStars: 5, perk: "+25% настроения и куража каждый день" },
    { id: "home_leather_sofa", name: "🛋️ Кожаный итальянский диван", cost: 120000, reqStars: 8, perk: "+15% к восстановлению сил и сытости" },
    { id: "home_cinema_audio", name: "🍿 Домашний кинотеатр 4K", cost: 250000, reqStars: 15, perk: "+35% настроения и статус перед гостями" },
    { id: "home_safe_valberg", name: "🔒 Огнеупорный сейф перекупа", cost: 180000, reqStars: 10, perk: "Защита заначки от проверок и облав" },
    { id: "home_garage_lift", name: "🏗️ Гидравлический автоподъёмник в гараж", cost: 320000, reqStars: 20, perk: "Ускоряет ремонт скрытых дефектов авто на 50% и повышает статус бокса" },
    { id: "home_cctv", name: "📹 Система видеонаблюдения периметра", cost: 140000, reqStars: 8, perk: "Снижает шанс ночного угона авто из гаража до 0%" }
];

const CONTAINER_ITEMS = [
    { id: 'japan', name: 'Японский Контейнер', cost: 150000, reqStars: 5, timer: 30, minLevel: 12, badge: 'JDM & Мото', desc: 'Прямые поставки из порта Кобе.', img: 'assets/containers/japan.jpg', fallback: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80' },
    { id: 'europe', name: 'Европейский Автовоз', cost: 450000, reqStars: 10, timer: 35, minLevel: 15, badge: 'Комфорт & Премиум', desc: 'Автомобили из Германии без пробега по РФ.', img: 'assets/containers/europe.jpg', fallback: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80' },
    { id: 'usa_auction', name: 'Американский Аукцион', cost: 750000, reqStars: 15, timer: 40, minLevel: 18, badge: 'Битые & Маслкары', desc: 'Контейнер с Copart. Кот в мешке.', img: 'assets/containers/usa.jpg', fallback: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80' },
    { id: 'china_ship', name: 'Китайский Сухогруз', cost: 950000, reqStars: 20, timer: 38, minLevel: 22, badge: 'Электрички & Новые', desc: 'Свежие Lixiang и Zeekr прямиком из Гуанчжоу.', img: 'assets/containers/china.jpg', fallback: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=600&q=80' },
    { id: 'dubai', name: 'Эмиратский Контейнер', cost: 1200000, reqStars: 25, timer: 45, minLevel: 25, badge: 'Катера & Суперкары', desc: 'Аукционная роскошь шейхов.', img: 'assets/containers/dubai.jpg', fallback: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80' },
    { id: 'hangar', name: 'Заброшенный Ангар', cost: 5000000, reqStars: 50, timer: 60, minLevel: 30, badge: 'Тягачи & Гиперкары', desc: 'Списанное имущество логистического хаба!', img: 'assets/containers/hangar.jpg', fallback: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80' }
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
    { id: 'water', name: 'Вода из-под крана', cost: 0, hunger: 5, mood: -30, desc: 'Живот крутит, жить не хочется' },
    { id: 'doshik', name: 'Бич-пакет и сухари', cost: 150, hunger: 20, mood: -15, desc: 'Желудок ноет, депрессия, тяжело торговаться' },
    { id: 'home_sandwich', name: 'Бутерброд из дома', cost: 250, hunger: 30, mood: -5, desc: 'Майонез, колбаса "Красная цена", терпимо' },
    { id: 'pelmeni', name: 'Пельмени по акции', cost: 400, hunger: 45, mood: 0, desc: 'Дешево и сердито, главное сварить' },
    { id: 'shaurma', name: 'Шаурма на вокзале', cost: 800, hunger: 50, mood: -5, desc: 'Сытно, но жирно и тоскливо' },
    { id: 'fastfood', name: 'Фастфуд комбо', cost: 1200, hunger: 60, mood: 10, desc: 'Бургер, картошка, кола. Классика.' },
    { id: 'stolovka', name: 'Обед в столовой', cost: 2200, hunger: 70, mood: 15, desc: 'Нормальное первое, второе и компот' },
    { id: 'cafe', name: 'Бизнес-ланч в ресторане', cost: 6500, hunger: 90, mood: 25, desc: 'Свежий стейк, кофе и уверенность в себе' }
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

const DAILY_REWARDS_CONFIG = [
    { day: 1, title: "+20k ₽ & 10 ⛽", reward: { cash: 20000, fuel: 10 } },
    { day: 2, title: "+40k ₽ & 1 🤝", reward: { cash: 40000, connections: 1 } },
    { day: 3, title: "+75k ₽ & 10 ⭐", reward: { cash: 75000, stars: 10 } },
    { day: 4, title: "+120k ₽ & 1 🤝", reward: { cash: 120000, connections: 1 } },
    { day: 5, title: "+200k ₽ & 15 ⭐", reward: { cash: 200000, stars: 15 } },
    { day: 6, title: "+350k ₽ & Бак", reward: { cash: 350000, fuel: 100 } },
    { day: 7, title: "+600k ₽ & 25 ⭐", reward: { cash: 600000, stars: 25, specialPlate: "Х777ХХ 77" } }
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

// ========================================================
// 10. РАСШИРЕННЫЙ ПУЛ ЕЖЕДНЕВНЫХ ЗАДАНИЙ
// ========================================================
const DAILY_QUESTS_POOL = [
    { id: "q_inspect", text: "Осмотреть толщиномером 2 авто на рынке", target: 2, actionType: "gauge_check", reward: 35000, rewardXp: 40 },
    { id: "q_race", text: "Выиграть заезд 402м в Стрите", target: 1, actionType: "win_drag", reward: 50000, rewardXp: 45 },
    { id: "q_biz", text: "Собрать кассу с предприятий", target: 1, actionType: "collect_biz", reward: 25000, rewardXp: 30 },
    { id: "q_buy", text: "Выкупить 1 автомобиль на авторынке", target: 1, actionType: "buy_car", reward: 45000, rewardXp: 50 },
    { id: "q_sell", text: "Успешно продать 1 авто клиенту у капота", target: 1, actionType: "sell_car", reward: 60000, rewardXp: 55 },
    { id: "q_obd", text: "Просканировать ЭБУ автомобиля через OBD2", target: 1, actionType: "obd_scan", reward: 30000, rewardXp: 35 },
    { id: "q_presale", text: "Сделать предпродажный детейлинг авто", target: 1, actionType: "presale_mod", reward: 40000, rewardXp: 40 },
    { id: "q_drift", text: "Завершить квалификационный заезд в Дрифте", target: 1, actionType: "drift_run", reward: 45000, rewardXp: 45 }
];

// ========================================================
// 11. РАСШИРЕННЫЕ ЦЕЛИ И КАРЬЕРНЫЕ ВЕХИ
// ========================================================
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
        category: "Синдикат",
        title: "Поставщик Синдиката",
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

// Экспорт базы в глобальный контекст
window.GAME_METADATA = GAME_METADATA;
window.calculatePlateValue = calculatePlateValue;
window.I18N_TRANSLATIONS = I18N_TRANSLATIONS;
window.CAR_FALLBACKS_BY_CATEGORY = CAR_FALLBACKS_BY_CATEGORY;
window.CAR_DATABASE = CAR_DATABASE;
window.HOUSING_LIST = HOUSING_LIST;
window.HOUSING_RANDOM_EVENTS = HOUSING_RANDOM_EVENTS;
window.BUSINESS_DATA = BUSINESS_DATA;
window.BARN_TIERS_CONFIG = BARN_TIERS_CONFIG;
window.BARN_FINDS = BARN_FINDS;
window.SUPER_SPIN_TIERS = SUPER_SPIN_TIERS;
window.SHOP_CATALOG = SHOP_CATALOG;
window.HOUSING_INTERIOR_CATALOG = HOUSING_INTERIOR_CATALOG;
window.CONTAINER_ITEMS = CONTAINER_ITEMS;
window.SELLER_ADS_PHRASES = SELLER_ADS_PHRASES;
window.DIETS = DIETS;
window.OBD_ERRORS = OBD_ERRORS;
window.DAILY_REWARDS_CONFIG = DAILY_REWARDS_CONFIG;
window.STREET_CHAT_LOG = STREET_CHAT_LOG;
window.DAILY_QUESTS_POOL = DAILY_QUESTS_POOL;
window.NOTEPAD_CAREER_GOALS = NOTEPAD_CAREER_GOALS;
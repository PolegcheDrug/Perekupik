// ========================================================
// data.js — БАЗА ДАННЫХ ИГРЫ «СИМУЛЯТОР ПЕРЕКУПА» (v0.6.7)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Спецзаказы «ПодКлюч», сектора Колеса Фортуны,
// расширенная аналитика профиля, база авто и предприятий.
// ========================================================

const GAME_METADATA = {
    version: "v0.6.7",
    build: 275,
    authors: "Tak Toje, Max, Sergo, gemini, Илья Чепиль",
    releaseDate: "2026-10-16",
    patchNotes: [
        {
            title: "📊 Аналитический дашборд профиля",
            text: "Полный редизайн экрана профиля: финансовые KPI, торговый винрейт, капитализация активов, индекс добросовестности и карьерные ачивки."
        },
        {
            title: "🔑 Сервис спецзаказов «ПодКлюч»",
            text: "Синдикат преобразован в сервис подбора «ПодКлюч». Удалены дубликаты биржи, добавлены вариативные контракты (Корчи, Корпоративные, Коллекционные, Срочные)."
        },
        {
            title: "⚡ Полный апгрейд Autodrot",
            text: "Autodrot стал единым маркетплейсом: P2P техника, редкие госномера, готовый бизнес, недвижимость, горячий выкуп и отзывы покупателей."
        },
        {
            title: "🎡 Фикс Колеса Фортуны",
            text: "Исправлена отрисовка секторов классического VIP-колеса, устранён пустой чёрный экран на мобильных устройствах."
        }
    ]
};

// ========================================================
// 0. СЕКТОРА КЛАССИЧЕСКОГО КОЛЕСА ФОРТУНЫ (ФИКС БАГА CANVAS)
// ========================================================
const WHEEL_SECTORS = [
    { label: "+100k ₽", type: "cash", amount: 100000, color: "#10b981", textColor: "#000000" },
    { label: "+15 ⭐", type: "stars", amount: 15, color: "#f59e0b", textColor: "#000000" },
    { label: "Бак 100 ⛽", type: "fuel", amount: 100, color: "#0284c7", textColor: "#ffffff" },
    { label: "+200k ₽", type: "cash", amount: 200000, color: "#059669", textColor: "#ffffff" },
    { label: "+1 🤝 Связь", type: "conn", amount: 1, color: "#9333ea", textColor: "#ffffff" },
    { label: "+25 🎟️ Талонов", type: "tickets", amount: 25, color: "#06b6d4", textColor: "#000000" },
    { label: "+300k ₽", type: "cash", amount: 300000, color: "#047857", textColor: "#ffffff" },
    { label: "+25 ⭐", type: "stars", amount: 25, color: "#d97706", textColor: "#000000" },
    { label: "Талон ГИБДД 🚔", type: "impound", amount: 1, color: "#e11d48", textColor: "#ffffff" },
    { label: "💰 ДЖЕКПОТ 1M", type: "jackpot", amount: 1000000, color: "#ffd700", textColor: "#000000" }
];

// ========================================================
// 1. ПАЛИТРЫ ЦВЕТА HUD, АНИМАЦИИ НИКНЕЙМА И АВАТАРОК
// ========================================================
const HUD_SOLID_COLORS = [
    { id: "lightning", name: "Грозовой неон (Молнии)", hex: "#00f2fe", secondaryHex: "#7928ca", glow: "rgba(0, 242, 254, 0.65)", isLightning: true },
    { id: "cyan", name: "Неоновый бирюзовый", hex: "#00f2fe", glow: "rgba(0, 242, 254, 0.45)" },
    { id: "green", name: "Кислотный лайм", hex: "#00e676", glow: "rgba(0, 230, 118, 0.45)" },
    { id: "gold", name: "Слиток золота", hex: "#ffd700", glow: "rgba(255, 215, 0, 0.5)" },
    { id: "purple", name: "Теневой фиолетовый", hex: "#c084fc", glow: "rgba(192, 132, 252, 0.45)" },
    { id: "red", name: "Дрифт-рубин", hex: "#ff3366", glow: "rgba(255, 51, 102, 0.45)" },
    { id: "amber", name: "Турбо-янтарь", hex: "#ffb300", glow: "rgba(255, 179, 0, 0.45)" },
    { id: "blue", name: "Лазурный кобальт", hex: "#38bdf8", glow: "rgba(56, 189, 248, 0.45)" },
    { id: "white", name: "Титановый хром", hex: "#f8fafc", glow: "rgba(248, 250, 252, 0.35)" }
];

const NICKNAME_EFFECTS_CATALOG = [
    { id: "none", name: "Статичный", desc: "Классический чистый белый текст без анимации.", cost: 0, reqStars: 0, className: "nick-fx-none" },
    { id: "lightning_spark", name: "Грозовой разряд (Молнии)", desc: "Электрические импульсы и неоновые разряды по буквам ника.", cost: 200000, reqStars: 12, className: "nick-fx-lightning" },
    { id: "shimmer", name: "Бегущий блик (Shimmer)", desc: "Переливающаяся световая волна по буквам ника.", cost: 75000, reqStars: 5, className: "nick-fx-shimmer" },
    { id: "neon_pulse", name: "Неоновое дыхание", desc: "Плавная мягкая пульсация яркости в цвет выбранного стиля.", cost: 120000, reqStars: 8, className: "nick-fx-neon-pulse" },
    { id: "gold_shine", name: "Золотой отлив Олигарха", desc: "Богатый металлический золотой блеск с мерцанием.", cost: 250000, reqStars: 15, className: "nick-fx-gold-shine" },
    { id: "cyber_glitch", name: "Кибер-глитч", desc: "Легкий киберпанк-сдвиг цветов и хроматическая аберрация.", cost: 350000, reqStars: 20, className: "nick-fx-glitch" }
];

const AVATAR_EFFECTS_CATALOG = [
    { id: "none", name: "Базовое кольцо", desc: "Аккуратная статичная рамка цвета интерфейса.", cost: 0, reqStars: 0, className: "avatar-fx-none" },
    { id: "lightning_shield", name: "Электро-щит Теслы", desc: "Сверкающие дуги молний вокруг аватара перекупа.", cost: 220000, reqStars: 15, className: "avatar-fx-lightning" },
    { id: "neon_breath", name: "Неоновый импульс", desc: "Плавное пульсирующее кольцо с мягким свечением.", cost: 85000, reqStars: 5, className: "avatar-fx-neon-breath" },
    { id: "fire_drift", name: "Огненная аура Дрифта", desc: "Вспышки языков пламени и раскаленный янтарный контур.", cost: 180000, reqStars: 10, className: "avatar-fx-fire" },
    { id: "gold_halo", name: "Золотой ореол ПодКлюч", desc: "Премиальное вращающееся кольцо из чистого золота.", cost: 300000, reqStars: 20, className: "avatar-fx-gold" },
    { id: "cyber_matrix", name: "Матричный щит", desc: "Вращающиеся шестеренки и цифровой защитный ореол.", cost: 450000, reqStars: 25, className: "avatar-fx-matrix" }
];

const HUD_THEMES_CATALOG = [
    { id: "lightning_storm", name: "Lightning Storm (Гроза)", desc: "Электрический сине-фиолетовый неон с искрами молний на HUD и телефоне.", colorId: "lightning", cost: 300000, reqStars: 15, reqLevel: 7, isLightning: true },
    { id: "cyber_neon", name: "Cyber Neon", desc: "Бирюзовый неоновый стиль с глубоким контрастным черным фоном.", colorId: "cyan", cost: 0, reqStars: 0, reqLevel: 1 },
    { id: "tokyo_drift", name: "Tokyo Drift", desc: "Агрессивный рубиновый акцент с янтарным свечением.", colorId: "red", cost: 150000, reqStars: 5, reqLevel: 5 },
    { id: "toxic_acid", name: "Toxic Acid", desc: "Ядовитый неоновый лайм уличных нелегальных гонок.", colorId: "green", cost: 250000, reqStars: 8, reqLevel: 8 },
    { id: "syndicate_gold", name: "Prestige Gold", desc: "Премиальное золото и рояльный лак высшего ранга.", colorId: "gold", cost: 500000, reqStars: 15, reqLevel: 15 },
    { id: "carbon_stealth", name: "Stealth Titanium", desc: "Сдержанный матовый титановый минимализм без кричащих тонов.", colorId: "white", cost: 350000, reqStars: 10, reqLevel: 12 }
];

const STREET_RACE_ANIM_CONFIG = {
    driftDurationMs: 6000,
    dragDurationMs: 6500,
    stanceDurationMs: 5500
};

// ========================================================
// 2. АЛГОРИТМ ОЦЕНКИ БЛАТНЫХ ГОСНОМЕРОВ
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

    if (numStr === '777') value += 350000;
    else if (numStr === '001') value += 280000;
    else if (numStr === '007') value += 220000;
    else if (d1 === d2 && d2 === d3) value += 160000;
    else if (numStr.startsWith('00')) value += 95000;
    else if (numStr.endsWith('00')) value += 65000;
    else if (d1 === d3 && d1 !== d2) value += 28000;

    const specSeries = {
        'АМР': 850000, 'ЕКХ': 1200000, 'СКР': 650000, 'ВОР': 400000,
        'САС': 250000, 'ХХХ': 300000, 'ООО': 320000, 'ААА': 280000, 'МММ': 260000
    };

    if (specSeries[letters]) value += specSeries[letters];
    else if (letters[0] === letters[1] && letters[1] === letters[2]) value += 180000;
    else if (tailLetters[0] === tailLetters[1]) value += 15000;

    const eliteRegions = ['77', '99', '97', '777'];
    const prestigeRegions = ['177', '199', '799', '50', '90', '150', '190', '750'];

    if (eliteRegions.includes(regStr)) value = Math.round(value * 1.5);
    else if (prestigeRegions.includes(regStr)) value = Math.round(value * 1.2);

    if (numStr === '777' && regStr === '777' && letters[0] === letters[1] && letters[1] === letters[2]) {
        value = Math.max(value, 3500000);
    }
    return value;
}

// ========================================================
// 3. СЛОВАРЬ ЛОКАЛИЗАЦИИ
// ========================================================
const I18N_TRANSLATIONS = {
    ru: {
        classes_title: "Классы автотехники",
        cat_all: "Все категории",
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
        cat_all: "All Categories",
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
// 4. БАЗА ДАННЫХ АВТОТЕХНИКИ
// ========================================================
const CAR_DATABASE = {
    economy: [
        { 
            name: "ВАЗ-2101 «Копейка»", 
            power: 64, 
            basePrice: 75000, 
            drivetrain: "rwd", 
            type: "economy", 
            img: "assets/cars/economy/2101/vaz-2101.jpg",
            images: [
                "assets/cars/economy/2101/vaz-2101.jpg",
                "assets/cars/economy/2101/vaz-2101_1.jpg",
                "assets/cars/economy/2101/vaz-2101_2.jpg",
                "assets/cars/economy/2101/vaz-2101_3.jpg",
                "assets/cars/economy/2101/vaz-2101_4.jpg",
                "assets/cars/economy/2101/vaz-2101_5.jpg",
                "assets/cars/economy/2101/vaz-2101_6.png",
                "assets/cars/economy/2101/vaz-2101_7.jpg",
                "assets/cars/economy/2101/vaz-2101_8.jpg",
                "assets/cars/economy/2101/vaz-2101_9.jpg",
                "assets/cars/economy/2101/vaz-2101_10.jpg"
            ],
            fallback: CAR_FALLBACKS_BY_CATEGORY.economy 
        },
        {   name: "Ока (ВАЗ-1111)", power: 33, basePrice: 45000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/oka/oka.jpg", images: [
            "assets/cars/economy/oka/oka.jpg",
            "assets/cars/economy/oka/oka_2.jpg",
            "assets/cars/economy/oka/oka_3.jpg",
            "assets/cars/economy/oka/oka_4.jpg",
            "assets/cars/economy/oka/oka_5.jpg",
            "assets/cars/economy/oka/oka_6.jpg",
            "assets/cars/economy/oka/oka_7.jpg"
            ], 
            fallback: CAR_FALLBACKS_BY_CATEGORY.economy 
        },
        { name: "ЗАЗ-968М «Запорожец»", power: 40, basePrice: 40000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/zaz/zaz.jpg", images: ["assets/cars/economy/zaz/zaz.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Москвич-412", power: 75, basePrice: 55000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/moskvich/moskvich.jpg", images: ["assets/cars/economy/moskvich/moskvich.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ИЖ-2126 «Ода»", power: 73, basePrice: 65000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/izh/izh.jpg", images: ["assets/cars/economy/izh/izh.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2105 «Пятерка»", power: 71, basePrice: 85000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/2105/vaz-2105.jpg", images: ["assets/cars/economy/2105/vaz-2105.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2106 «Шестерка»", power: 75, basePrice: 90000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/2106/vaz-2106.jpg", images: ["assets/cars/economy/2106/vaz-2106.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2107 «Семёрка»", power: 74, basePrice: 110000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/2107/vaz-2107.jpg", images: ["assets/cars/economy/2107/vaz-2107.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2108 «Зубило»", power: 70, basePrice: 120000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/2108/vaz-2108.jpg", images: ["assets/cars/economy/2108/vaz-2108.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2109 «Девятка»", power: 72, basePrice: 135000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/2109/vaz-2109.jpg", images: ["assets/cars/economy/2109/vaz-2109.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-21099 «Дуплет»", power: 78, basePrice: 145000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/21099/vaz-21099.jpg", images: ["assets/cars/economy/21099/vaz-21099.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2110 «Десятка»", power: 89, basePrice: 155000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/2110/vaz-2110.jpg", images: ["assets/cars/economy/2110/vaz-2110.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2112 «Двенашка»", power: 91, basePrice: 165000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/2112/vaz-2112.jpg", images: ["assets/cars/economy/2112/vaz-2112.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2114 «Четырка»", power: 81, basePrice: 160000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/2114/vaz-2114.jpg", images: ["assets/cars/economy/2114/vaz-2114.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ВАЗ-2115 «Пятнашка»", power: 81, basePrice: 165000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/2115/vaz-2115.jpg", images: ["assets/cars/economy/2115/vaz-2115.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Lada Kalina I", power: 81, basePrice: 240000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/kalina/kalina.jpg", images: ["assets/cars/economy/kalina/kalina.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Lada Priora", power: 98, basePrice: 310000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/priora/priora.jpg", images: ["assets/cars/economy/priora/priora.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Lada Granta I", power: 87, basePrice: 380000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/granta/granta.jpg", images: ["assets/cars/economy/granta/granta.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ГАЗ-3110 «Волга»", power: 130, basePrice: 140000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/volga/volga.jpg", images: ["assets/cars/economy/volga/volga.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "ГАЗ-31105 «Волга»", power: 137, basePrice: 210000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/volga105/volga105.jpg", images: ["assets/cars/economy/volga105/volga105.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "УАЗ 469 «Бобик»", power: 75, basePrice: 150000, drivetrain: "awd", type: "economy", img: "assets/cars/economy/uaz469/uaz469.jpg", images: ["assets/cars/economy/uaz469/uaz469.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Нива 2121 4x4", power: 83, basePrice: 280000, drivetrain: "awd", type: "economy", img: "assets/cars/economy/niva/niva.jpg", images: ["assets/cars/economy/niva/niva.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Chevrolet Niva", power: 80, basePrice: 340000, drivetrain: "awd", type: "economy", img: "assets/cars/economy/chevy_niva/chevy_niva.jpg", images: ["assets/cars/economy/chevy_niva/chevy_niva.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Daewoo Matiz", power: 51, basePrice: 130000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/matiz/matiz.jpg", images: ["assets/cars/economy/matiz/matiz.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Daewoo Nexia", power: 80, basePrice: 170000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/nexia/nexia.jpg", images: ["assets/cars/economy/nexia/nexia.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Chevrolet Lanos", power: 86, basePrice: 190000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/lanos/lanos.jpg", images: ["assets/cars/economy/lanos/lanos.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Renault Logan I", power: 75, basePrice: 370000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/logan/logan.jpg", images: ["assets/cars/economy/logan/logan.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Renault Sandero I", power: 84, basePrice: 420000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/sandero/sandero.jpg", images: ["assets/cars/economy/sandero/sandero.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Nissan Almera Classic", power: 107, basePrice: 440000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/almera/almera.jpg", images: ["assets/cars/economy/almera/almera.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Ford Focus I", power: 100, basePrice: 320000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/focus1/focus1.jpg", images: ["assets/cars/economy/focus1/focus1.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Mitsubishi Carisma", power: 103, basePrice: 280000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/carisma/carisma.jpg", images: ["assets/cars/economy/carisma/carisma.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Mitsubishi Lancer IX", power: 98, basePrice: 410000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/lancer9/lancer9.jpg", images: ["assets/cars/economy/lancer9/lancer9.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Toyota Mark II (JZX90)", power: 180, basePrice: 490000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/mark2/mark2.jpg", images: ["assets/cars/economy/mark2/mark2.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Toyota Chaser (X100)", power: 200, basePrice: 590000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/chaser/chaser.jpg", images: ["assets/cars/economy/chaser/chaser.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "BMW E34 520i", power: 150, basePrice: 290000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/e34/e34.jpg", images: ["assets/cars/economy/e34/e34.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "BMW E36 318i", power: 115, basePrice: 340000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/e36/e36.jpg", images: ["assets/cars/economy/e36/e36.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Mercedes W202 C180", power: 122, basePrice: 310000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/w202/w202.jpg", images: ["assets/cars/economy/w202/w202.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Mercedes W210 «Лупатый»", power: 136, basePrice: 350000, drivetrain: "rwd", type: "economy", img: "assets/cars/economy/w210/w210.jpg", images: ["assets/cars/economy/w210/w210.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Audi 80 B4 «Бочка»", power: 90, basePrice: 240000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/audi80/audi80.jpg", images: ["assets/cars/economy/audi80/audi80.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
        { name: "Audi A6 C5", power: 165, basePrice: 390000, drivetrain: "fwd", type: "economy", img: "assets/cars/economy/a6c5/a6c5.jpg", images: ["assets/cars/economy/a6c5/a6c5.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.economy }
    ],
    scooter: [
        { name: "Honda Dio AF34", power: 7, basePrice: 45000, drivetrain: "rwd", type: "scooter", img: "assets/moto/dio/dio.jpg", images: ["assets/moto/dio/dio.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.scooter },
        { name: "Yamaha Jog ZR", power: 8, basePrice: 55000, drivetrain: "rwd", type: "scooter", img: "assets/moto/jog/jog.jpg", images: ["assets/moto/jog/jog.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.scooter },
        { name: "Suzuki Lets 2", power: 6, basePrice: 38000, drivetrain: "rwd", type: "scooter", img: "assets/moto/lets/lets.jpg", images: ["assets/moto/lets/lets.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.scooter },
        { name: "Honda Tact AF24", power: 6, basePrice: 42000, drivetrain: "rwd", type: "scooter", img: "assets/moto/tact/tact.jpg", images: ["assets/moto/tact/tact.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.scooter },
        { name: "Vespa Primavera 150", power: 13, basePrice: 220000, drivetrain: "rwd", type: "scooter", img: "assets/moto/vespa/vespa.jpg", images: ["assets/moto/vespa/vespa.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.scooter }
    ],
    moto: [
        { name: "Иж Юпитер-5 с люлькой", power: 24, basePrice: 85000, drivetrain: "rwd", type: "moto", img: "assets/moto/jupiter/jupiter.jpg", images: ["assets/moto/jupiter/jupiter.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Ява-350 (638)", power: 26, basePrice: 120000, drivetrain: "rwd", type: "moto", img: "assets/moto/jawa/jawa.jpg", images: ["assets/moto/jawa/jawa.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Bajaj Pulsar NS200", power: 25, basePrice: 240000, drivetrain: "rwd", type: "moto", img: "assets/moto/pulsar/pulsar.jpg", images: ["assets/moto/pulsar/pulsar.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Kawasaki Ninja 300", power: 39, basePrice: 450000, drivetrain: "rwd", type: "moto", img: "assets/moto/ninja/ninja.jpg", images: ["assets/moto/ninja/ninja.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Honda CB400 Super Four", power: 53, basePrice: 370000, drivetrain: "rwd", type: "moto", img: "assets/moto/cb400/cb400.jpg", images: ["assets/moto/cb400/cb400.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Yamaha MT-07", power: 74, basePrice: 890000, drivetrain: "rwd", type: "moto", img: "assets/moto/mt07/mt07.jpg", images: ["assets/moto/mt07/mt07.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "KTM 390 Duke", power: 44, basePrice: 560000, drivetrain: "rwd", type: "moto", img: "assets/moto/duke/duke.jpg", images: ["assets/moto/duke/duke.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Harley-Davidson Iron 883", power: 51, basePrice: 1250000, drivetrain: "rwd", type: "moto", img: "assets/moto/iron883/iron883.jpg", images: ["assets/moto/iron883/iron883.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "BMW R1250GS Adventure", power: 136, basePrice: 2600000, drivetrain: "rwd", type: "moto", img: "assets/moto/gs1250/gs1250.jpg", images: ["assets/moto/gs1250/gs1250.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Yamaha YZF-R1", power: 200, basePrice: 2200000, drivetrain: "rwd", type: "moto", img: "assets/moto/r1/r1.jpg", images: ["assets/moto/r1/r1.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.moto },
        { name: "Ducati Panigale V4", power: 214, basePrice: 3400000, drivetrain: "rwd", type: "moto", img: "assets/moto/ducati/ducati.jpg", images: ["assets/moto/ducati/ducati.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.moto }
    ],
    atv: [
        { name: "CFMOTO CFORCE 500", power: 35, basePrice: 620000, drivetrain: "awd", type: "atv", img: "assets/moto/cforce/cforce.jpg", images: ["assets/moto/cforce/cforce.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.atv },
        { name: "Stels Guepard 850", power: 71, basePrice: 950000, drivetrain: "awd", type: "atv", img: "assets/moto/guepard/guepard.jpg", images: ["assets/moto/guepard/guepard.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.atv },
        { name: "Yamaha Grizzly 700", power: 49, basePrice: 1400000, drivetrain: "awd", type: "atv", img: "assets/moto/grizzly/grizzly.jpg", images: ["assets/moto/grizzly/grizzly.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.atv },
        { name: "BRP Can-Am Maverick X3", power: 195, basePrice: 3600000, drivetrain: "awd", type: "atv", img: "assets/moto/maverick/maverick.jpg", images: ["assets/moto/maverick/maverick.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.atv }
    ],
    comfort: [
        { name: "Hyundai Solaris I", power: 123, basePrice: 680000, drivetrain: "fwd", type: "comfort", img: "assets/cars/economy/solaris/solaris.jpg", images: ["assets/cars/economy/solaris/solaris.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Kia Rio 3", power: 123, basePrice: 710000, drivetrain: "fwd", type: "comfort", img: "assets/cars/economy/rio/rio.jpg", images: ["assets/cars/economy/rio/rio.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "VW Polo Sedan", power: 110, basePrice: 870000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/polo/polo.jpg", images: ["assets/cars/comfort/polo/polo.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Skoda Rapid", power: 110, basePrice: 920000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/rapid/rapid.jpg", images: ["assets/cars/comfort/rapid/rapid.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Ford Focus III", power: 125, basePrice: 970000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/focus/focus.jpg", images: ["assets/cars/comfort/focus/focus.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Chevrolet Cruze", power: 109, basePrice: 790000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/cruze/cruze.jpg", images: ["assets/cars/comfort/cruze/cruze.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Skoda Octavia A7 1.8 TSI", power: 180, basePrice: 1450000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/octavia/octavia.jpg", images: ["assets/cars/comfort/octavia/octavia.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "VW Golf VI GTI", power: 211, basePrice: 1550000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/golf6/golf6.jpg", images: ["assets/cars/comfort/golf6/golf6.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Toyota Camry XV50", power: 181, basePrice: 1950000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/camry/camry.jpg", images: ["assets/cars/comfort/camry/camry.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Kia Optima (JF)", power: 188, basePrice: 1900000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/optima/optima.jpg", images: ["assets/cars/comfort/optima/optima.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Kia K5", power: 194, basePrice: 2450000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/k5/k5.jpg", images: ["assets/cars/comfort/k5/k5.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Mazda 6 (GJ)", power: 192, basePrice: 2150000, drivetrain: "fwd", type: "comfort", img: "assets/cars/comfort/mazda6/mazda6.jpg", images: ["assets/cars/comfort/mazda6/mazda6.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Toyota RAV4 (XA40)", power: 150, basePrice: 2350000, drivetrain: "awd", type: "comfort", img: "assets/cars/comfort/rav4/rav4.jpg", images: ["assets/cars/comfort/rav4/rav4.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Mazda CX-5", power: 194, basePrice: 2400000, drivetrain: "awd", type: "comfort", img: "assets/cars/comfort/cx5/cx5.jpg", images: ["assets/cars/comfort/cx5/cx5.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
        { name: "Geely Monjaro", power: 238, basePrice: 3300000, drivetrain: "awd", type: "comfort", img: "assets/cars/comfort/monjaro/monjaro.jpg", images: ["assets/cars/comfort/monjaro/monjaro.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.comfort }
    ],
    premium: [
        { name: "BMW 3 Series (G20)", power: 190, basePrice: 3600000, drivetrain: "rwd", type: "premium", img: "assets/cars/premium/g20/g20.jpg", images: ["assets/cars/premium/g20/g20.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "BMW 5 Series (G30)", power: 249, basePrice: 4200000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/g30/g30.jpg", images: ["assets/cars/premium/g30/g30.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Mercedes E-Class (W213)", power: 249, basePrice: 4400000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/w213/w213.jpg", images: ["assets/cars/premium/w213/w213.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Audi A6 (C8)", power: 245, basePrice: 4300000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/a6/a6.jpg", images: ["assets/cars/premium/a6/a6.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "BMW M340i xDrive", power: 387, basePrice: 5100000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/bmw_m340i/bmw_m_340i.jpeg", images: ["assets/cars/premium/bmw_m340i/bmw_m_340i.jpeg"], fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Mercedes C63s AMG", power: 510, basePrice: 5600000, drivetrain: "rwd", type: "premium", img: "assets/cars/premium/c63/mercedes_c_c63_w205_sedan.jpeg", images: ["assets/cars/premium/c63/mercedes_c_c63_w205_sedan.jpeg"], fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Porsche Macan GTS", power: 440, basePrice: 7800000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/macan/macan.jpg", images: ["assets/cars/premium/macan/macan.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "BMW X5 (G05)", power: 340, basePrice: 8900000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/x5/x5.jpg", images: ["assets/cars/premium/x5/x5.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "BMW X6 (G06)", power: 340, basePrice: 9400000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/x6/x6.jpg", images: ["assets/cars/premium/x6/x6.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Porsche Cayenne (PO536)", power: 340, basePrice: 11000000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/cayenne/cayenne_new.jpg", images: ["assets/cars/premium/cayenne/cayenne_new.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Toyota Land Cruiser 300", power: 415, basePrice: 12500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/lc300/lc300.jpg", images: ["assets/cars/premium/lc300/lc300.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Mercedes S-Class (W223)", power: 367, basePrice: 16500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/w223/w223.jpg", images: ["assets/cars/premium/w223/w223.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Mercedes G63 AMG «Гелик»", power: 585, basePrice: 18500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/g63/mercedes_g63amg.jpg", images: ["assets/cars/premium/g63/mercedes_g63amg.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
        { name: "Audi RS6 Avant (C8)", power: 600, basePrice: 14500000, drivetrain: "awd", type: "premium", img: "assets/cars/premium/rs6/rs6.jpg", images: ["assets/cars/premium/rs6/rs6.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.premium }
    ],
    hyper: [
        { name: "Nissan GT-R R35 Nismo", power: 600, basePrice: 14000000, drivetrain: "awd", type: "hyper", img: "assets/cars/hyper/gtr/gtr.jpg", images: ["assets/cars/hyper/gtr/gtr.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "Porsche 911 GT3 RS (992)", power: 525, basePrice: 32000000, drivetrain: "rwd", type: "hyper", img: "assets/cars/hyper/911/911.jpg", images: ["assets/cars/hyper/911/911.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "Lamborghini Huracan EVO", power: 640, basePrice: 38000000, drivetrain: "awd", type: "hyper", img: "assets/cars/hyper/huracan/huracan.jpg", images: ["assets/cars/hyper/huracan/huracan.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "Ferrari SF90 Stradale", power: 1000, basePrice: 78000000, drivetrain: "awd", type: "hyper", img: "assets/cars/hyper/sf90/sf90.jpg", images: ["assets/cars/hyper/sf90/sf90.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "McLaren 720S", power: 720, basePrice: 34000000, drivetrain: "rwd", type: "hyper", img: "assets/cars/hyper/mclaren/mclaren.jpg", images: ["assets/cars/hyper/mclaren/mclaren.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.hyper },
        { name: "Bugatti Chiron Sport", power: 1500, basePrice: 380000000, drivetrain: "awd", type: "hyper", img: "assets/cars/hyper/chiron/chiron.jpg", images: ["assets/cars/hyper/chiron/chiron.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.hyper }
    ],
    truck: [
        { name: "ЗИЛ-130 Самосвал", power: 150, basePrice: 280000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/zil/zil.jpg", images: ["assets/cars/truck/zil/zil.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "ГАЗель NEXT Рефрижератор", power: 149, basePrice: 1950000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/gazel/gazel.jpg", images: ["assets/cars/truck/gazel/gazel.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "КАМАЗ-54901 Тягач", power: 460, basePrice: 7800000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/kamaz/kamaz.jpg", images: ["assets/cars/truck/kamaz/kamaz.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "Scania R500 V8", power: 500, basePrice: 11000000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/scania/scania.jpg", images: ["assets/cars/truck/scania/scania.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.truck },
        { name: "Volvo FH16 750", power: 750, basePrice: 16500000, drivetrain: "rwd", type: "truck", img: "assets/cars/truck/volvo/volvo.jpg", images: ["assets/cars/truck/volvo/volvo.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.truck }
    ],
    yacht: [
        { name: "Гидроцикл Yamaha FX SVHO", power: 250, basePrice: 1950000, drivetrain: "jet", type: "yacht", img: "assets/cars/yacht/yamaha/yamaha.jpg", images: ["assets/cars/yacht/yamaha/yamaha.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.yacht },
        { name: "Катер Bayliner VR5", power: 200, basePrice: 4800000, drivetrain: "prop", type: "yacht", img: "assets/cars/yacht/bayliner/bayliner.jpg", images: ["assets/cars/yacht/bayliner/bayliner.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.yacht },
        { name: "Azimut Atlantis 45", power: 880, basePrice: 78000000, drivetrain: "prop", type: "yacht", img: "assets/cars/yacht/azimut/azimut.jpg", images: ["assets/cars/yacht/azimut/azimut.jpg"], fallback: CAR_FALLBACKS_BY_CATEGORY.yacht }
    ]
};

async function loadExternalCarDatabase(jsonUrl) {
    try {
        const response = await fetch(jsonUrl);
        if (!response.ok) throw new Error("Network error loading car pack");
        const customData = await response.json();
        
        for (let cat in customData) {
            if (Array.isArray(customData[cat])) {
                if (!CAR_DATABASE[cat]) CAR_DATABASE[cat] = [];
                CAR_DATABASE[cat].push(...customData[cat]);
            }
        }
        if (typeof showToast === 'function') {
            showToast("📦 Внешний пак автотехники успешно загружен в игру!");
        }
        return true;
    } catch (e) {
        console.warn("[CarPackLoader] Ошибка загрузки внешнего пака:", e);
        return false;
    }
}

// ========================================================
// 5. НЕДВИЖИМОСТЬ, БОКСЫ И МАСТЕРСКИЕ
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
        desc: 'Временный строительный вагончик у обочины. Сквозняки, верстака нет. Автомобили стоят под открытым небом.', 
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
        perk: 'Одно машиноместо во дворе. Разрешена замена масла/присадок.',
        desc: 'Комната в спальном районе. Автомобиль стоит под окнами. Мелкий сервисный ремонт разрешён.', 
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
        desc: 'Настоящее логово перекупа! Сухая яма, верстак и диодное освещение. Открывает корчевание и диагностику ЭБУ.', 
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
        desc: 'Бабушкин ремонт, старый скрипучий паркет, зато своя ванна и кухня. Машина паркуется во дворе под фонарём.', 
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
        desc: 'Широкий бокс с печью, верстаком, компрессором и мойкой. Позволяет готовить тачки к продаже под ключ.', 
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
        desc: 'Кирпичный дом, стеклопакеты, видеонаблюдение за парковкой. Высокий комфорт проживания.', 
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
        desc: 'Коммерческий цех в промзоне. Подъёмник, мощная приточка, возможность отмывать VIN дешевле.', 
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
        perk: 'Подземный теплый паркинг с детейлинг-постом и зарядкой.',
        desc: 'ЖК комфорт-класса. Закрытый двор, охраняемый подземный паркинг, автомойка в цоколе.', 
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
        desc: 'Собственный участок, трёхфазная сеть 380V, смотровая яма и мойка высокого давления.', 
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
        desc: 'Красный кирпич, панорамные окна на набережную, стильный интерьер для отдыха автоолигарха.', 
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
        desc: 'Панорамный вид с 65 этажа, консьерж-сервис, охраняемый подземный гаражный комплекс.', 
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
        desc: 'Гектар соснового бора, собственный автосервис на 4 поста, малярная камера и ангар для редких лотов.', 
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
        desc: 'Абсолютная автономия в нейтральных водах. Свой порт, вертолётная площадка и музей для гиперкаров.', 
        img: 'assets/houses/island.jpg',
        fallback: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
    }
];

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
// 6. БИЗНЕС-СЕТЬ (11 НАПРАВЛЕНИЙ)
// ========================================================
const BUSINESS_DATA = [
    { 
        id: 'wash', name: 'Автомойка 24/7', minLevel: 5, income: 900, level: 0, cost: 90000, reqStars: 5, stored: 0, stock: 100, 
        perk: 'Скидка 50% на полировку и химчистку', 
        desc: 'Круглосуточный комплекс бесконтактной мойки и сушки кузова.',
        img: 'assets/business/wash.jpg',
        fallback: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'shina', name: 'Шиномонтаж «У Алика»', minLevel: 8, income: 1500, level: 0, cost: 150000, reqStars: 10, stored: 0, stock: 100, 
        perk: '+10% к стоимости авто на правильных дисках', 
        desc: 'Правка дисков, ошиповка, монтаж низкого профиля и полусликов.',
        img: 'assets/business/shina.jpg',
        fallback: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'sto', name: 'СТО дяди Вани', minLevel: 12, income: 2200, level: 0, cost: 300000, reqStars: 15, stored: 0, stock: 100, 
        perk: 'Скидка 40% на ремонт мотора', 
        desc: 'Капитальный ремонт ДВС, замена цепей ГРМ, подвески и агрегатов.',
        img: 'assets/business/sto.jpg',
        fallback: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'tow_truck', name: 'Служба эвакуации «Шериф»', minLevel: 10, income: 3200, level: 0, cost: 420000, reqStars: 10, stored: 0, stock: 100, 
        perk: 'Бесплатный забор авто со спецстоянки ГИБДД', 
        desc: 'Парк эвакуаторов для оперативной эвакуации и спасения задержанных машин.',
        img: 'assets/business/tow.jpg',
        fallback: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'paint_shop', name: 'Малярный цех «Хамелеон»', minLevel: 14, income: 4500, level: 0, cost: 650000, reqStars: 15, stored: 0, stock: 100, 
        perk: 'Облив в заводской микронный слой без следов шпаклёвки', 
        desc: 'Покрасочная камера с инфракрасной сушкой. ЛКП ложится в заводской допуск.',
        img: 'assets/business/paint.jpg',
        fallback: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'chip_tuning', name: 'Лаборатория Stage Lab', minLevel: 18, income: 5800, level: 0, cost: 820000, reqStars: 20, stored: 0, stock: 100, 
        perk: 'Скидка 70% на установку чип-тюнинга Stage 1-3', 
        desc: 'Диностенд и калибровка прошивок ЭБУ под наддувные двигатели.',
        img: 'assets/business/chip.jpg',
        fallback: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'detailing', name: 'Детейлинг Студия', minLevel: 20, income: 6500, level: 0, cost: 950000, reqStars: 25, stored: 0, stock: 100, 
        perk: '+35% к баллам на Автошоу', 
        desc: 'Нанесение керамики, бронеплёнка, полировка и глубокая химчистка салона.',
        img: 'assets/business/detailing.jpg',
        fallback: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'razborka', name: 'Авторазборка «Последний путь»', minLevel: 22, income: 8000, level: 0, cost: 1200000, reqStars: 30, stored: 0, stock: 100, 
        perk: 'Детали на ремонт обходятся дешевле на 30%', 
        desc: 'Скупка тотальных и аварийных авто на запчасти, продажа контрактных узлов.',
        img: 'assets/business/razborka.jpg',
        fallback: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'autopodbor', name: 'Агентство «Автоподбор Pro»', minLevel: 25, income: 9500, level: 0, cost: 1500000, reqStars: 35, stored: 0, stock: 100, 
        perk: '25% шанс найти эксклюзив со скидкой 35% на авторынке', 
        desc: 'Штат выездных экспертов находит срочные варианты с огромным дисконтом.',
        img: 'assets/business/podbor.jpg',
        fallback: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'taxi', name: 'Таксопарк (15 авто)', minLevel: 32, income: 18000, level: 0, cost: 3800000, reqStars: 50, stored: 0, stock: 100, 
        perk: 'Пассивный доход и +1 🤝 связь каждый день', 
        desc: 'Парк лицензированных седанов под аренду проверенным водителям.',
        img: 'assets/business/taxi.jpg',
        fallback: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'customs_hub', name: 'Таможенный хаб Порта', minLevel: 40, income: 25000, level: 0, cost: 5500000, reqStars: 60, stored: 0, stock: 100, 
        perk: 'Прямые поставки контейнеров и +2 связи ПодКлюч', 
        desc: 'Собственный терминал для таможенной очистки автовозов и контейнеров.',
        img: 'assets/business/hub.jpg',
        fallback: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=600&q=80'
    }
];

const BUSINESS_UPGRADES_BRANCHES = {
    equipment: [
        { name: "Базовый слесарный пост (+15% к выручке)", costMul: 0.35, bonusPct: 15 },
        { name: "Пневмолиния и специнструмент (+30% к выручке)", costMul: 0.65, bonusPct: 30 },
        { name: "Компьютерные 3D-стенды и стенд сход-развала (+45% к выручке)", costMul: 1.10, bonusPct: 45 }
    ],
    storage: [
        { name: "Стеллажная зона хранения (+135% к вместимости)", costMul: 0.25 },
        { name: "Автоматизированный складской модуль (+270% к вместимости)", costMul: 0.55 },
        { name: "Оптовый распределительный терминал (+405% к вместимости)", costMul: 0.90 }
    ],
    marketing: [
        { name: "Светодиодная вывеска и локальный таргетинг (+15% трафика)", costMul: 0.20, trafficBonusPct: 15 },
        { name: "Партнёрская программа с автоклубами (+25% трафика)", costMul: 0.50, trafficBonusPct: 25 },
        { name: "Генеральный спонсор соревнований (+40% трафика)", costMul: 0.85, trafficBonusPct: 40 }
    ]
};

const BUSINESS_STAFF_CATALOG = {
    managers: [
        { id: "mgr_junior", name: "Стажёр Денис", salary: 2500, hireCost: 35000, reqStars: 2, incomeBonusPct: 5, autoRestock: false, perkText: "+5% к выручке" },
        { id: "mgr_pro", name: "Управляющий Артём", salary: 7000, hireCost: 120000, reqStars: 8, incomeBonusPct: 15, autoRestock: true, restockDiscount: 0.1, perkText: "Автозакупка сырья со скидкой 10%, +15% к кассе" }
    ],
    masters: [
        { id: "mst_stepan", name: "Мастер Степаныч", salary: 3500, hireCost: 45000, reqStars: 3, incomeBonusPct: 10, stockSavePct: 15, perkText: "+10% к кассе, экономит 15% сырья" },
        { id: "mst_expert", name: "Шеф-механик Вольдемар", salary: 9000, hireCost: 160000, reqStars: 10, incomeBonusPct: 25, stockSavePct: 35, perkText: "+25% к кассе, экономит 35% сырья" }
    ],
    security: [
        { id: "sec_chop", name: "Пост ЧОП «Титан»", salary: 3000, hireCost: 40000, reqStars: 2, perkText: "Защита от ночных краж сырья и визитов полиции" }
    ]
};

const BUSINESS_FLEET_CATALOG = [
    { id: "fl_gazel", name: "ГАЗель NEXT Фургон", cost: 450000, reqStars: 5, suitableBusinesses: ["wash", "shina", "sto", "detailing", "razborka"], incomeBonusPct: 12, stockCapacityBonus: 50, desc: "Подвоз запчастей и сырья без задержек." },
    { id: "fl_tow", name: "Эвакуатор ГАЗон NEXT", cost: 1200000, reqStars: 12, suitableBusinesses: ["sto", "razborka", "tow_truck"], incomeBonusPct: 25, stockCapacityBonus: 100, desc: "Доставка аварийных машин на СТО и разборку." }
];

// ========================================================
// 7. САРАИ, ВИЛСПИНЫ И МАГАЗИН
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
    { name: "ВАЗ-2101 «Копейка» (Дрифт-Спек)", power: 160, type: 'economy', basePrice: 850000, marketValue: 1250000, img: "assets/cars/economy/2101/vaz-2101_drift.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
    { name: "BMW E30 Coupe", power: 170, type: 'comfort', basePrice: 650000, marketValue: 1300000, img: "assets/cars/barn/e30.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
    { name: "Nissan Silvia S13", power: 200, type: 'comfort', basePrice: 900000, marketValue: 1800000, img: "assets/cars/barn/silvia.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
    { name: "VW Golf VI GTI (Stage 2 Project)", power: 280, type: 'comfort', basePrice: 1100000, marketValue: 1900000, img: "assets/cars/comfort/golf6/golf6.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.comfort },
    { name: "ГАЗ-24 «Волга» V8", power: 220, type: 'economy', basePrice: 700000, marketValue: 1500000, img: "assets/cars/barn/volga24.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.economy },
    { name: "Nissan Skyline GT-R R34 (В пыли)", power: 280, type: 'premium', basePrice: 4500000, marketValue: 9500000, img: "assets/cars/barn/r34.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium },
    { name: "Toyota Supra A80 (Без мотора)", power: 0, type: 'premium', basePrice: 3200000, marketValue: 7000000, img: "assets/cars/barn/supra.jpg", fallback: CAR_FALLBACKS_BY_CATEGORY.premium }
];

const SUPER_SPIN_TIERS = {
    reelCars: [
        { type: "empty", name: "Ничего (Промах)", emoji: "💨", desc: "Пустой лот слота" },
        { type: "free_impound", name: "Талон забора со спецстоянки ГИБДД", emoji: "🚔", desc: "Бесплатная эвакуация авто" },
        { type: "xp_bundle", name: "Пакет опыта эксперта (+150 XP)", emoji: "🎖️", amount: 150 },
        { type: "tool", name: "HD Видеоэндоскоп мотора", emoji: "📹", toolId: "endoscope" },
        { type: "tool", name: "Профессиональный Launch Pro", emoji: "📱", toolId: "obd_launch" },
        { type: "car", name: "Ока (ВАЗ-1111)", power: 33, category: "economy", basePrice: 45000 },
        { type: "car", name: "ВАЗ-2101 «Копейка»", power: 64, category: "economy", basePrice: 75000 },
        { type: "car", name: "ВАЗ-2107 «Семёрка»", power: 74, category: "economy", basePrice: 110000 },
        { type: "car", name: "Daewoo Nexia", power: 80, category: "economy", basePrice: 170000 },
        { type: "car", name: "Lada Priora", power: 98, category: "economy", basePrice: 310000 },
        { type: "car", name: "VW Polo Sedan", power: 110, category: "comfort", basePrice: 870000 },
        { type: "car", name: "Skoda Octavia A7 1.8", power: 180, category: "comfort", basePrice: 1450000 },
        { type: "car", name: "BMW M340i", power: 387, category: "premium", basePrice: 5100000, rare: true },
        { type: "car", name: "Porsche 911 GT3 RS", power: 525, category: "hyper", basePrice: 32000000, superRare: true }
    ],
    reelResources: [
        { type: "cash", label: "25,000 ₽", amount: 25000 },
        { type: "cash", label: "60,000 ₽", amount: 60000 },
        { type: "cash", label: "150,000 ₽", amount: 150000 },
        { type: "cash", label: "400,000 ₽", amount: 400000 },
        { type: "xp", label: "+80 XP Опыта", amount: 80 },
        { type: "fuel", label: "35 ⛽ Топлива", amount: 35 },
        { type: "fuel", label: "100 ⛽ Полный бак", amount: 100 },
        { type: "tickets", label: "10 🎟️ Талонов", amount: 10 },
        { type: "tickets", label: "25 🎟️ Талонов", amount: 25 },
        { type: "conn", label: "+1 🤝 Связь", amount: 1 },
        { type: "jackpot", label: "💰 1,000,000 ₽ ДЖЕКПОТ", amount: 1000000, rare: true }
    ],
    reelExclusives: [
        { type: "none", label: "Без спецприза", emoji: "⚪" },
        { type: "free_impound", label: "Талон штрафстоянки 🚔", emoji: "🎫" },
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

const SHOP_CATALOG = {
    tools: [
        { id: "gauge", name: "Магнитный толщиномер ЛКП (Базовый)", cost: 35000, reqStars: 0, maxUses: 60, serviceCost: 3500, desc: "Проверяет шпаклёвку и вторичные окрасы. Ресурс: 60 замеров.", icon: "fa-ruler-combined" },
        { id: "gauge_pro", name: "Ультразвуковой толщиномер Pro (Цветмет)", cost: 75000, reqStars: 5, maxUses: 100, serviceCost: 7000, desc: "Точность до 1 мкм. Ресурс батареи и датчика: 100 замеров.", icon: "fa-microchip" },
        { id: "obd", name: "Диагностический автосканер ELM327 Bluetooth", cost: 65000, reqStars: 3, maxUses: 50, serviceCost: 5000, desc: "Считывает коды DTC в ЭБУ. Ресурс: 50 сканирований.", icon: "fa-laptop-code" },
        { id: "obd_launch", name: "Профессиональный сканер Launch Pro", cost: 180000, reqStars: 10, maxUses: 80, serviceCost: 15000, desc: "Обязателен для сервиса «ПодКлюч»! Адаптация и глубокий анализ. Ресурс: 80 циклов.", icon: "fa-tablet-screen-button" },
        { id: "endoscope", name: "HD Видеоэндоскоп мотора с поворотной камерой", cost: 95000, reqStars: 5, maxUses: 40, serviceCost: 9000, desc: "Обязателен для сервиса «ПодКлюч»! Осмотр цилиндров на задиры. Ресурс: 40 проверок.", icon: "fa-video" },
        { id: "compressor", name: "Профессиональный компрессометр", cost: 45000, reqStars: 2, maxUses: 50, serviceCost: 4000, desc: "Замер компрессии цилиндров. Ресурс манометра: 50 замеров.", icon: "fa-gauge-high" },
        { id: "battery_tester", name: "Нагрузочная вилка аккумулятора", cost: 25000, reqStars: 0, maxUses: 60, serviceCost: 2000, desc: "Проверка емкости и пускового тока АКБ. Ресурс: 60 проверок.", icon: "fa-car-battery" }
    ],
    consumables: [
        { id: "oil_pack", name: "Партия синтетического масла и фильтров", cost: 25000, reqStars: 0, value: 30, desc: "+30% сырья на СТО дяди Вани. Обеспечивает бесперебойную работу подъемников." },
        { id: "chem_pack", name: "Бочка премиальной автохимии и шампуней", cost: 45000, reqStars: 1, value: 50, desc: "+50% сырья для Автомойки и Детейлинга. Поддерживает идеальный блеск." },
        { id: "tires_stock", name: "Комплект полусликов и жгутов для шиномонтажа", cost: 35000, reqStars: 1, value: 40, desc: "+40% сырья на Шиномонтаж «У Алика». Устраняет дефицит расходников." },
        { id: "brake_pack", name: "Оптовая партия тормозных колодок и дисков", cost: 55000, reqStars: 2, value: 50, desc: "+50% запаса деталей на Авторазборку. Увеличивает доходность контрактов." },
        { id: "full_stock", name: "Генеральный оптовый запас (100% на все точки)", cost: 140000, reqStars: 5, value: 100, desc: "Мгновенно заполняет склады всех имеющихся предприятий до 100%!" }
    ],
    tuningParts: [
        { id: "raf_license", name: "Гоночная Лицензия пилота РАФ", cost: 85000, reqStars: 15, desc: "Официальный регламентный допуск к ночным заездам на 402м.", icon: "fa-id-card" },
        { id: "insurance_osago", name: "Годовой полис «КАСКО / Анти-Угон»", cost: 45000, reqStars: 5, desc: "100% защита от случайных повреждений на парковке, подстав и попыток угона.", icon: "fa-shield-halved" },
        { id: "gps_tracker", name: "Скрытый поисковый GPS/ГЛОНАСС маяк", cost: 30000, reqStars: 3, desc: "Позволяет моментально вернуть угнанную машину без помощи полиции и Решалы.", icon: "fa-satellite-dish" }
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
    { 
        id: 'japan', name: 'Японский Контейнер', cost: 150000, reqStars: 5, timer: 30, minLevel: 12, 
        badge: 'JDM & Мото', desc: 'Прямые поставки из порта Кобе. Шанс достать Silvia, Mark II или Yamaha MT-07.', 
        possibleCars: ["Toyota Mark II (JZX90)", "Toyota Chaser (X100)", "Yamaha MT-07", "Honda CB400 Super Four"],
        img: 'assets/containers/japan.jpg', fallback: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'europe', name: 'Европейский Автовоз', cost: 450000, reqStars: 10, timer: 35, minLevel: 15, 
        badge: 'Комфорт & Премиум', desc: 'Автомобили из Германии без пробега по РФ. Дроп: Golf GTI, BMW 3 Series, Audi A6.', 
        possibleCars: ["VW Golf VI GTI", "BMW 3 Series (G20)", "Audi A6 (C8)", "Skoda Octavia A7 1.8 TSI"],
        img: 'assets/containers/europe.jpg', fallback: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'usa_auction', name: 'Американский Аукцион', cost: 750000, reqStars: 15, timer: 40, minLevel: 18, 
        badge: 'Битые & Маслкары', desc: 'Контейнер с Copart. Кот в мешке: от восстановления до идеала.', 
        possibleCars: ["Ford Focus III", "Chevrolet Cruze", "BRP Can-Am Maverick X3"],
        img: 'assets/containers/usa.jpg', fallback: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'china_ship', name: 'Китайский Сухогруз', cost: 950000, reqStars: 20, timer: 38, minLevel: 22, 
        badge: 'Электрички & Новые', desc: 'Свежие Geely Monjaro, кроссоверы и квадроциклы прямиком из порта.', 
        possibleCars: ["Geely Monjaro", "CFMOTO CFORCE 500", "Stels Guepard 850"],
        img: 'assets/containers/china.jpg', fallback: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'dubai', name: 'Эмиратский Контейнер', cost: 1200000, reqStars: 25, timer: 45, minLevel: 25, 
        badge: 'Катера & Суперкары', desc: 'Аукционная роскошь Дубая: BMW X5, Гелик G63 или скоростной катер.', 
        possibleCars: ["BMW X5 (G05)", "Mercedes G63 AMG «Гелик»", "Porsche Cayenne (PO536)", "Катер Bayliner VR5"],
        img: 'assets/containers/dubai.jpg', fallback: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'hangar', name: 'Заброшенный Ангар', cost: 5000000, reqStars: 50, timer: 60, minLevel: 30, 
        badge: 'Тягачи & Гиперкары', desc: 'Списанное имущество хаба: от тягачей Scania до Porsche 911 GT3 RS!', 
        possibleCars: ["Scania R500 V8", "Volvo FH16 750", "Porsche 911 GT3 RS (992)", "Nissan GT-R R35 Nismo"],
        img: 'assets/containers/hangar.jpg', fallback: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80' 
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

// ========================================================
// 8. РАЦИОН И АКТИВНОСТИ ПЕРЕКУПА
// ========================================================
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

const DAILY_REWARDS_CONFIG = [
    { day: 1, title: "+25k ₽ & 15 ⛽", reward: { cash: 25000, fuel: 15 } },
    { day: 2, title: "+50k ₽ & 1 🤝 & Талон Штрафстоянки", reward: { cash: 50000, connections: 1, freeImpoundPasses: 1 } },
    { day: 3, title: "+90k ₽ & 10 ⭐ & +100 XP", reward: { cash: 90000, stars: 10, xp: 100 } },
    { day: 4, title: "+150k ₽ & 2 🤝", reward: { cash: 150000, connections: 2 } },
    { day: 5, title: "+250k ₽ & 20 ⭐ & Сканер Launch", reward: { cash: 250000, stars: 20, tool: "obd_launch" } },
    { day: 6, title: "+400k ₽ & Полный Бак & +250 XP", reward: { cash: 400000, fuel: 100, xp: 250 } },
    { day: 7, title: "+750k ₽ & 30 ⭐ & Номер Х777ХХ 77", reward: { cash: 750000, stars: 30, specialPlate: "Х777ХХ 77" } }
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

// ========================================================
// 9. КОНТРАКТЫ СЕРВИСА «ПОДКЛЮЧ» (РАСШИРЕННОЕ РАЗНООБРАЗИЕ)
// ========================================================
const PODKLYUCH_CONTRACT_TEMPLATES = [
    // --- 1. КОРПОРАТИВНЫЕ И ТАКСОПАРКИ ---
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

    // --- 2. СПОРТИВНЫЕ ПРОЕКТЫ И КОРЧИ ---
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

    // --- 3. СЛУЖБЫ ДОСТАВКИ И КУРЬЕРЫ ---
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

    // --- 4. ПРЕМИАЛЬНЫЙ ЭСКОРТ И ДЕПУТАТСКИЕ ГАРАЖИ ---
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

    // --- 5. ЭКСПОРТ И ЭЛИТНЫЕ КОЛЛЕКЦИИ ---
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

// ========================================================
// 10. АВТОМЕРОПРИЯТИЯ И ГОНОЧНЫЕ ТРЕКИ
// ========================================================
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

// Экспорт в глобальный контекст window
window.GAME_METADATA = GAME_METADATA;
window.WHEEL_SECTORS = WHEEL_SECTORS;
window.HUD_SOLID_COLORS = HUD_SOLID_COLORS;
window.NICKNAME_EFFECTS_CATALOG = NICKNAME_EFFECTS_CATALOG;
window.AVATAR_EFFECTS_CATALOG = AVATAR_EFFECTS_CATALOG;
window.HUD_THEMES_CATALOG = HUD_THEMES_CATALOG;
window.STREET_RACE_ANIM_CONFIG = STREET_RACE_ANIM_CONFIG;
window.calculatePlateValue = calculatePlateValue;
window.I18N_TRANSLATIONS = I18N_TRANSLATIONS;
window.CAR_FALLBACKS_BY_CATEGORY = CAR_FALLBACKS_BY_CATEGORY;
window.CAR_DATABASE = CAR_DATABASE;
window.loadExternalCarDatabase = loadExternalCarDatabase;
window.HOUSING_LIST = HOUSING_LIST;
window.HOUSING_RANDOM_EVENTS = HOUSING_RANDOM_EVENTS;
window.BUSINESS_DATA = BUSINESS_DATA;
window.BUSINESS_UPGRADES_BRANCHES = BUSINESS_UPGRADES_BRANCHES;
window.BUSINESS_STAFF_CATALOG = BUSINESS_STAFF_CATALOG;
window.BUSINESS_FLEET_CATALOG = BUSINESS_FLEET_CATALOG;
window.BARN_TIERS_CONFIG = BARN_TIERS_CONFIG;
window.BARN_FINDS = BARN_FINDS;
window.SUPER_SPIN_TIERS = SUPER_SPIN_TIERS;
window.SHOP_CATALOG = SHOP_CATALOG;
window.HOUSING_INTERIOR_CATALOG = HOUSING_INTERIOR_CATALOG;
window.CONTAINER_ITEMS = CONTAINER_ITEMS;
window.SELLER_ADS_PHRASES = SELLER_ADS_PHRASES;
window.DIETS = DIETS;
window.LIFE_ACTIVITIES = LIFE_ACTIVITIES;
window.OBD_ERRORS = OBD_ERRORS;
window.DAILY_REWARDS_CONFIG = DAILY_REWARDS_CONFIG;
window.STREET_CHAT_LOG = STREET_CHAT_LOG;
window.DAILY_QUESTS_POOL = DAILY_QUESTS_POOL;
window.NOTEPAD_CAREER_GOALS = NOTEPAD_CAREER_GOALS;
window.MARKET_NEWS_EVENTS = MARKET_NEWS_EVENTS;
window.BUYERS_CATALOG = BUYERS_CATALOG;
window.PODKLYUCH_CONTRACT_TEMPLATES = PODKLYUCH_CONTRACT_TEMPLATES;
window.SYNDICATE_CONTRACT_TEMPLATES = SYNDICATE_CONTRACT_TEMPLATES;
window.STREET_EVENTS_DATA = STREET_EVENTS_DATA;
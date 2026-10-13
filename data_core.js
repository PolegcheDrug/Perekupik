// ========================================================
// data_core.js — ЯДРО, СИСТЕМНЫЕ ДАННЫЕ И КАСТОМИЗАЦИЯ
// Базовые ссылки, валюты, банк, колесо удачи, темы и HUD
// ========================================================

const GITHUB_ASSETS_BASE = "https://raw.githubusercontent.com/PolegcheDrug/Perekupik/main/";

function resolveCarAssetUrl(path) {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
        return path;
    }
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return GITHUB_ASSETS_BASE + cleanPath;
}

window.GITHUB_ASSETS_BASE = GITHUB_ASSETS_BASE;
window.resolveCarAssetUrl = resolveCarAssetUrl;

const GAME_METADATA = {
    version: "v1.0.0",
    build: 305,
    authors: "Tak Toje, Max, Sergo, gemini, Илья Чепиль",
    releaseDate: "2026-10-20",
    patchNotes: [
        {
            title: "🌐 Cloud Firestore & GitHub Assets",
            text: "Все изображения подгружаются напрямую из репозитория GitHub, а карточки авто синхронизируются через Cloud Firestore."
        },
        {
            title: "🚢 Storage Wars & Порт 2.0",
            text: "Живой чат аукциона с репликами ботов и аукциониста, шкала доминирования ставки, 3 удара молотка, эндоскопия щелей."
        },
        {
            title: "💱 Мультивалютный обменник Во-Банка",
            text: "Полноценный двусторонний конвертер между всеми валютами: Рубли, Stars, Топливо, Талоны и Крипта."
        },
        {
            title: "🛒 Полный перезапуск Авто-Маркета",
            text: "Маркет разделен на 4 полноценные категории с сырьем для предприятий, приборами, лицензиями и мебелью боксов."
        }
    ]
};

// --------------------------------------------------------
// СЕКТОРА КОЛЕСА ФОРТУНЫ И СУПЕРВИЛСПИН
// --------------------------------------------------------
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

const SUPER_SPIN_TIERS = {
    reelCars: [
        { type: "car", name: "ВАЗ-2101 «Копейка»", category: "economy", basePrice: 180000, power: 85, emoji: "🏎️" },
        { type: "car", name: "BMW E30 Coupe", category: "comfort", basePrice: 650000, power: 170, emoji: "🏎️" },
        { type: "car", name: "VW Golf VI GTI", category: "comfort", basePrice: 1450000, power: 211, emoji: "🏎️" },
        { type: "car", name: "Toyota Mark II (JZX90)", category: "economy", basePrice: 590000, power: 200, emoji: "🏎️" },
        { type: "tool", toolId: "obd_launch", name: "Сканер Launch Pro", emoji: "📱" },
        { type: "tool", toolId: "endoscope", name: "HD Видеоэндоскоп", emoji: "📹" },
        { type: "free_impound", name: "Талон ГИБДД", emoji: "🚔" },
        { type: "xp_bundle", name: "Пакет Опыта (+350 XP)", amount: 350, emoji: "🎖️" }
    ],
    reelResources: [
        { type: "cash", label: "250,000 ₽", amount: 250000 },
        { type: "cash", label: "500,000 ₽", amount: 500000 },
        { type: "jackpot", label: "ДЖЕКПОТ 1.5M ₽", amount: 1500000 },
        { type: "fuel", label: "Полный бак 100 ⛽", amount: 100 },
        { type: "tickets", label: "+25 Талонов 🎟️", amount: 25 },
        { type: "conn", label: "+2 Связи 🤝", amount: 2 },
        { type: "xp", label: "+200 XP", amount: 200 }
    ],
    reelExclusives: [
        { type: "stars", label: "30 ⭐ Stars", amount: 30, emoji: "⭐" },
        { type: "stars", label: "75 ⭐ Stars", amount: 75, emoji: "⭐" },
        { type: "plate", label: "Номер А777АА 77", plate: "А777АА 77", emoji: "🏷️" },
        { type: "plate", label: "Номер В888ВВ 777", plate: "В888ВВ 777", emoji: "🏷️" },
        { type: "mod_cert", label: "Сертификат на Stage 2", cashValue: 120000, emoji: "🔧" },
        { type: "free_impound", label: "Амнистия ГИБДД", emoji: "👮" }
    ]
};

// --------------------------------------------------------
// КУРСЫ ВАЛЮТ БАНКА
// --------------------------------------------------------
const BANK_EXCHANGE_RATES = {
    rub: { buyRub: 1, sellRub: 1 },
    stars: { buyRub: 100000, sellRub: 100000, icon: "fa-star", emoji: "⭐", name: "Stars" },
    fuel: { buyRub: 2000, sellRub: 2000, icon: "fa-gas-pump", emoji: "⛽", name: "Топливо (л)" },
    tickets: { buyRub: 7500, sellRub: 7500, icon: "fa-ticket", emoji: "🎟️", name: "Талоны" },
    conn: { buyRub: 175000, sellRub: 175000, icon: "fa-handshake", emoji: "🤝", name: "Связи" },
    btc: { buyRub: 9500000, sellRub: 9500000, icon: "fa-bitcoin", emoji: "₿", name: "Bitcoin" },
    eth: { buyRub: 340000, sellRub: 340000, icon: "fa-ethereum", emoji: "Ξ", name: "Ethereum" }
};

// --------------------------------------------------------
// КАСТОМИЗАЦИЯ HUD, ЭФФЕКТЫ И СТИЛИ
// --------------------------------------------------------
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
    { id: "fire_flame", name: "Огненный шлейф форсажа", desc: "Языки пламени и раскаленный хвост выхлопа по буквам ника.", cost: 240000, reqStars: 14, className: "nick-fx-fire" },
    { id: "plasma_pulse", name: "Кибер-плазма", desc: "Плазменный перелив с динамической сменой неонового оттенка.", cost: 280000, reqStars: 16, className: "nick-fx-plasma" },
    { id: "matrix_glitch_pro", name: "Матричный RGB-глитч Pro", desc: "Глитч со смещением цветовых каналов и цифровыми артефактами.", cost: 350000, reqStars: 20, className: "nick-fx-matrix-glitch" },
    { id: "shimmer", name: "Бегущий блик (Shimmer)", desc: "Переливающаяся световая волна по буквам ника.", cost: 75000, reqStars: 5, className: "nick-fx-shimmer" },
    { id: "neon_pulse", name: "Неоновое дыхание", desc: "Плавная мягкая пульсация яркости в цвет выбранного стиля.", cost: 120000, reqStars: 8, className: "nick-fx-neon-pulse" },
    { id: "gold_shine", name: "Золотой отлив Олигарха", desc: "Богатый металлический золотой блеск с мерцанием.", cost: 250000, reqStars: 15, className: "nick-fx-gold-shine" },
    { id: "cyber_glitch", name: "Кибер-глитч", desc: "Легкий киберпанк-сдвиг цветов и хроматическая аберрация.", cost: 180000, reqStars: 10, className: "nick-fx-glitch" }
];

const AVATAR_EFFECTS_CATALOG = [
    { id: "none", name: "Базовое кольцо", desc: "Аккуратная статичная рамка цвета интерфейса.", cost: 0, reqStars: 0, className: "avatar-fx-none" },
    { id: "lightning_shield", name: "Электро-щит Теслы", desc: "Сверкающие дуги молний вокруг аватара перекупа.", cost: 220000, reqStars: 15, className: "avatar-fx-lightning" },
    { id: "fire_vortex", name: "Огненный смерч Дрифта", desc: "Вращающийся огненный вихрь с раскаленными частицами.", cost: 260000, reqStars: 16, className: "avatar-fx-fire-vortex" },
    { id: "plasma_shield", name: "Плазменное силовое поле", desc: "Мощная аура плазмы с адаптацией под текущий цвет HUD.", cost: 290000, reqStars: 18, className: "avatar-fx-plasma" },
    { id: "glitch_holo", name: "Голографический глитч-щит", desc: "Дрожащая цифровая голограмма со сдвигом кадров.", cost: 320000, reqStars: 20, className: "avatar-fx-glitch" },
    { id: "neon_breath", name: "Неоновый импульс", desc: "Плавное пульсирующее кольцо с мягким свечением.", cost: 85000, reqStars: 5, className: "avatar-fx-neon-breath" },
    { id: "fire_drift", name: "Огненная аура", desc: "Вспышки языков пламени и раскаленный янтарный контур.", cost: 180000, reqStars: 10, className: "avatar-fx-fire" },
    { id: "gold_halo", name: "Золотой ореол ПодКлюч", desc: "Премиальное вращающееся кольцо из чистого золота.", cost: 300000, reqStars: 20, className: "avatar-fx-gold" },
    { id: "cyber_matrix", name: "Матричный щит", desc: "Вращающиеся шестеренки и цифровой защитный ореол.", cost: 450000, reqStars: 25, className: "avatar-fx-matrix" }
];

const HUD_THEMES_CATALOG = [
    { id: "cyber_black_neo", name: "Cyber Black Neo (Матовый DEV)", desc: "Все иконки телефона и блоки получают черно-неоновый матовый стиль консоли DEV.", colorId: "green", cost: 380000, reqStars: 20, reqLevel: 10, isCyberIcons: true },
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

// --------------------------------------------------------
// АЛГОРИТМ ОЦЕНКИ ГОСНОМЕРОВ
// --------------------------------------------------------
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

// --------------------------------------------------------
// ЛОКАЛИЗАЦИЯ
// --------------------------------------------------------
const I18N_TRANSLATIONS = {
    ru: {
        classes_title: "Классы техники",
        cat_all: "Все",
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
        cat_all: "All",
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

// Экспорт в глобальный контекст window
window.GAME_METADATA = GAME_METADATA;
window.WHEEL_SECTORS = WHEEL_SECTORS;
window.SUPER_SPIN_TIERS = SUPER_SPIN_TIERS;
window.BANK_EXCHANGE_RATES = BANK_EXCHANGE_RATES;
window.HUD_SOLID_COLORS = HUD_SOLID_COLORS;
window.NICKNAME_EFFECTS_CATALOG = NICKNAME_EFFECTS_CATALOG;
window.AVATAR_EFFECTS_CATALOG = AVATAR_EFFECTS_CATALOG;
window.HUD_THEMES_CATALOG = HUD_THEMES_CATALOG;
window.STREET_RACE_ANIM_CONFIG = STREET_RACE_ANIM_CONFIG;
window.calculatePlateValue = calculatePlateValue;
window.I18N_TRANSLATIONS = I18N_TRANSLATIONS;
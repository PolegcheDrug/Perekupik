// ========================================================
// data_core.js — ЯДРО, СИСТЕМНЫЕ ДАННЫЕ И КАСТОМИЗАЦИЯ
// ⭐ v3.0.0: ПЛАТНАЯ КАСТОМИЗАЦИЯ ПРОФИЛЯ
//   - Все темы, ник-эффекты, ауры, титулы — платные
//   - Три валюты: ₽ (рубли), ⭐ (Stars), 🎟️ (билеты)
//   - SUPER_SPIN_TIERS расширены: может выдать ЛЮБУЮ косметику
//   - HUD_THEMES_CATALOG теперь полный источник тем (legacy)
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

// --------------------------------------------------------
// МЕТАДАННЫЕ ИГРЫ
// --------------------------------------------------------
const GAME_METADATA = {
    version: "v3.0.0",
    build: 403,
    authors: "Tak Toje, Max, Sergo, gemini, Илья Чепиль",
    releaseDate: "2026-10-20",
    patchNotes: [
        {
            title: "💰 ПЛАТНАЯ КАСТОМИЗАЦИЯ ПРОФИЛЯ",
            text: "Все темы HUD, ник-эффекты, ауры аватара и титулы теперь покупаются за рубли, Stars и Билеты. Эксклюзивные глитч-предметы — только за билеты!"
        },
        {
            title: "🎰 СУПЕРВИЛСПИН ВЫДАЁТ КОСМЕТИКУ",
            text: "Колесо Фортуны теперь может выдать любую тему, ник-эффект, ауру или титул, включая эксклюзивы за билеты. Повторно выпавшие предметы конвертируются в Stars."
        },
        {
            title: "🎟️ БИЛЕТ РАЗ В 7 ДНЕЙ",
            text: "Заходите раз в неделю — получайте 1 билет СуперВилспина бесплатно."
        },
        {
            title: "💰 РЕБАЛАНС ЭКОНОМИКИ",
            text: "Бизнесы окупаются за 20-40 дней. Курс Stars: 1 ⭐ = 2,500 ₽. Депозит: 0.3% в день."
        },
        {
            title: "🚢 Storage Wars & Порт 2.0",
            text: "Живой чат аукциона, шкала доминирования, 3 удара молотка, эндоскопия щелей."
        }
    ]
};

// --------------------------------------------------------
// СЕКТОРА КОЛЕСА ФОРТУНЫ (legacy, для совместимости)
// --------------------------------------------------------
const WHEEL_SECTORS = [
    { label: "+100k ₽",       type: "cash",    amount: 100000,  color: "#10b981", textColor: "#000000" },
    { label: "+15 ⭐",         type: "stars",   amount: 15,      color: "#f59e0b", textColor: "#000000" },
    { label: "Бак 100 ⛽",     type: "fuel",    amount: 100,     color: "#0284c7", textColor: "#ffffff" },
    { label: "+200k ₽",       type: "cash",    amount: 200000,  color: "#059669", textColor: "#ffffff" },
    { label: "+1 🤝 Связь",   type: "conn",    amount: 1,       color: "#9333ea", textColor: "#ffffff" },
    { label: "+25 🎟️ Талонов", type: "tickets", amount: 25,      color: "#06b6d4", textColor: "#000000" },
    { label: "+300k ₽",       type: "cash",    amount: 300000,  color: "#047857", textColor: "#ffffff" },
    { label: "+25 ⭐",         type: "stars",   amount: 25,      color: "#d97706", textColor: "#000000" },
    { label: "Талон ГИБДД 🚔", type: "impound", amount: 1,       color: "#e11d48", textColor: "#ffffff" },
    { label: "💰 ДЖЕКПОТ 1M",  type: "jackpot", amount: 1000000, color: "#ffd700", textColor: "#000000" }
];

// --------------------------------------------------------
// ⭐ v3.0.0: SUPER_SPIN_TIERS
// ПУЛ КОСМЕТИКИ: колесо может выдать любую тему,
// ник-эффект, ауру или титул из каталогов.
// --------------------------------------------------------
const SUPER_SPIN_TIERS = {
    reelCars: [
        { type: "car", barnId: "barn_vaz_2101",     name: "ВАЗ-2101 «Копейка»",              category: "economy", basePrice: 180000,   power: 85,  emoji: "🏎️" },
        { type: "car", barnId: "barn_golf6_gti",    name: "Volkswagen Golf VI GTI",          category: "comfort", basePrice: 1550000,  power: 211, emoji: "🏎️" },
        { type: "car", barnId: "barn_mark2",        name: "Toyota Mark II (JZX90 / JZX100)", category: "economy", basePrice: 750000,   power: 280, emoji: "🏎️" },
        { type: "car", barnId: "barn_silvia",       name: "Nissan Silvia (S15)",             category: "comfort", basePrice: 1900000,  power: 250, emoji: "🏎️" },
        { type: "car", barnId: "barn_supra_mk5",    name: "Toyota GR Supra (A90 Mk5)",       category: "comfort", basePrice: 5200000,  power: 340, emoji: "🏎️" },
        { type: "car", barnId: "barn_bmw_m340i",    name: "BMW M340i xDrive (G20)",          category: "premium", basePrice: 5100000,  power: 387, emoji: "🏎️" },
        { type: "car", barnId: "barn_c63_amg",      name: "Mercedes-Benz C63 AMG (W205)",    category: "premium", basePrice: 5800000,  power: 510, emoji: "🏎️" },
        { type: "car", barnId: "barn_charger_srt",  name: "Dodge Charger SRT Hellcat",       category: "premium", basePrice: 6900000,  power: 717, emoji: "🏎️" },
        { type: "car", barnId: "barn_corvette_c6",  name: "Chevrolet Corvette C6 Z06",       category: "premium", basePrice: 4600000,  power: 505, emoji: "🏎️" },
        { type: "car", barnId: "barn_mercedes_s63", name: "Mercedes-AMG S63 (W222)",         category: "premium", basePrice: 11500000, power: 612, emoji: "🏎️" },
        { type: "car", barnId: "barn_ghost",        name: "Rolls-Royce Ghost",               category: "premium", basePrice: 24000000, power: 571, emoji: "👑" },
        { type: "car", barnId: "barn_huracan",      name: "Lamborghini Huracán EVO",         category: "hyper",   basePrice: 38000000, power: 640, emoji: "⚡" },
        { type: "car", barnId: "barn_ferrari_458",  name: "Ferrari 458 Italia",              category: "hyper",   basePrice: 32000000, power: 570, emoji: "🐎" },
        { type: "tool", toolId: "obd_launch", name: "Сканер Launch Pro", emoji: "📱" },
        { type: "tool", toolId: "endoscope", name: "HD Видеоэндоскоп", emoji: "📹" },
        { type: "free_impound", name: "Талон ГИБДД", emoji: "🚔" },
        { type: "xp_bundle", name: "Пакет Опыта (+350 XP)", amount: 350, emoji: "🎖️" }
    ],
    reelResources: [
        { type: "cash",     label: "250,000 ₽",       amount: 250000 },
        { type: "cash",     label: "500,000 ₽",       amount: 500000 },
        { type: "jackpot",  label: "ДЖЕКПОТ 1.5M ₽",  amount: 1500000 },
        { type: "fuel",     label: "Полный бак 100 ⛽", amount: 100 },
        { type: "tickets",  label: "+25 Талонов 🎟️",  amount: 25 },
        { type: "conn",     label: "+2 Связи 🤝",      amount: 2 },
        { type: "xp",       label: "+200 XP",          amount: 200 }
    ],
    // ⭐ v3.0.0: reelExclusives теперь содержит косметические предметы.
    // Каждый элемент — указатель на каталог. При выпадении
    // phone-media.js найдёт предмет, проверит владение, выдаст или
    // конвертирует в Stars.
    reelExclusives: [
        // ─── Рубли ───
        { type: "stars",     label: "30 ⭐ (75,000 ₽)",      amount: 30,  emoji: "⭐" },
        { type: "stars",     label: "75 ⭐ (187,500 ₽)",     amount: 75,  emoji: "⭐" },
        { type: "plate",     label: "Номер А777АА 77",       plate: "А777АА 77",  emoji: "🏷️" },
        { type: "plate",     label: "Номер В888ВВ 777",      plate: "В888ВВ 777", emoji: "🏷️" },
        { type: "mod_cert",  label: "Сертификат на Stage 2", cashValue: 120000, emoji: "🔧" },
        { type: "free_impound", label: "Амнистия ГИБДД", emoji: "👮" },

        // ─── Косметика: темы ───
        { type: "cosmetic", category: "themes",       itemId: "midnight_purple", label: "Тема: Midnight Purple",   emoji: "🌌" },
        { type: "cosmetic", category: "themes",       itemId: "tokyo_night",     label: "Тема: Tokyo Night",       emoji: "🌸" },
        { type: "cosmetic", category: "themes",       itemId: "synthwave_86",    label: "Тема: Synthwave '86",     emoji: "🌆" },
        { type: "cosmetic", category: "themes",       itemId: "matrix_green",    label: "Тема: Matrix Green",      emoji: "🟢" },
        { type: "cosmetic", category: "themes",       itemId: "ruby_blood",      label: "Тема: Ruby Blood",        emoji: "🩸" },
        { type: "cosmetic", category: "themes",       itemId: "regal_gold",      label: "Тема: Regal Gold",        emoji: "👑" },
        { type: "cosmetic", category: "themes",       itemId: "neon_cyberpunk",  label: "🌃 Тема: NEON CYBERPUNK", emoji: "🌃", isExclusive: true },

        // ─── Косметика: ник-эффекты ───
        { type: "cosmetic", category: "nickEffects",  itemId: "holographic_shift", label: "Ник: Holographic",     emoji: "🔮" },
        { type: "cosmetic", category: "nickEffects",  itemId: "liquid_chrome",     label: "Ник: Liquid Chrome",   emoji: "🪞" },
        { type: "cosmetic", category: "nickEffects",  itemId: "cyber_glitch",      label: "👾 Ник: CYBER GLITCH", emoji: "👾", isExclusive: true },
        { type: "cosmetic", category: "nickEffects",  itemId: "aurora_flow",       label: "Ник: Aurora Flow",     emoji: "🌌" },
        { type: "cosmetic", category: "nickEffects",  itemId: "plasma_storm",      label: "Ник: Plasma Storm",    emoji: "⚡" },
        { type: "cosmetic", category: "nickEffects",  itemId: "ember_sparks",      label: "Ник: Ember Sparks",    emoji: "🔥" },
        { type: "cosmetic", category: "nickEffects",  itemId: "quantum_nick",      label: "🔮 Ник: QUANTUM",      emoji: "🔮", isExclusive: true },

        // ─── Косметика: ауры аватара ───
        { type: "cosmetic", category: "avatarEffects", itemId: "holographic_ring", label: "Аура: Holographic",   emoji: "🔮" },
        { type: "cosmetic", category: "avatarEffects", itemId: "plasma_core",      label: "Аура: Plasma Core",   emoji: "⚡" },
        { type: "cosmetic", category: "avatarEffects", itemId: "ember_orbit",      label: "Аура: Ember Orbit",   emoji: "🔥" },
        { type: "cosmetic", category: "avatarEffects", itemId: "aurora_halo",      label: "Аура: Aurora Halo",   emoji: "🌌" },
        { type: "cosmetic", category: "avatarEffects", itemId: "cyber_scan",       label: "Аура: Cyber Scan",    emoji: "👾" },
        { type: "cosmetic", category: "avatarEffects", itemId: "quantum_shield",   label: "💎 Аура: QUANTUM",    emoji: "💎", isExclusive: true },
        { type: "cosmetic", category: "avatarEffects", itemId: "supernova_aura",   label: "💫 Аура: SUPERNOVA",  emoji: "💫", isExclusive: true },

        // ─── Косметика: титулы ───
        { type: "cosmetic", category: "titles",       itemId: "classic_king",    label: "Титул: Король Классики",    emoji: "👑" },
        { type: "cosmetic", category: "titles",       itemId: "hood_master",     label: "Титул: Торг у капота",     emoji: "🤝" },
        { type: "cosmetic", category: "titles",       itemId: "pro_scanner",     label: "Титул: Автоподбор от Бога", emoji: "🔍" },
        { type: "cosmetic", category: "titles",       itemId: "syndicate_boss",  label: "Титул: Синдикат 777",      emoji: "⚡" },
        { type: "cosmetic", category: "titles",       itemId: "ghost_trader",    label: "🎭 Титул: GHOST TRADER",  emoji: "🎭", isExclusive: true },
        { type: "cosmetic", category: "titles",       itemId: "imperator",       label: "👑 Титул: ИМПЕРАТОР",     emoji: "👑", isExclusive: true },
        { type: "cosmetic", category: "titles",       itemId: "oligarch",        label: "💠 Титул: ОЛИГАРХ",       emoji: "💠", isExclusive: true }
    ]
};

// --------------------------------------------------------
// ⭐ v3.0.0: КУРСЫ ВАЛЮТ БАНКА
// --------------------------------------------------------
const BANK_EXCHANGE_RATES = {
    rub:     { buyRub: 1,       sellRub: 1,       name: "Рубли" },
    stars:   { buyRub: 2500,    sellRub: 2500,    icon: "fa-star",         emoji: "⭐",  name: "Stars" },
    fuel:    { buyRub: 2000,    sellRub: 2000,    icon: "fa-gas-pump",     emoji: "⛽",  name: "Топливо (л)" },
    tickets: { buyRub: 7500,    sellRub: 7500,    icon: "fa-ticket",       emoji: "🎟️", name: "Талоны" },
    conn:    { buyRub: 175000,  sellRub: 175000,  icon: "fa-handshake",    emoji: "🤝",  name: "Связи" },
    btc:     { buyRub: 9500000, sellRub: 9500000, icon: "fa-bitcoin",      emoji: "₿",   name: "Bitcoin" },
    eth:     { buyRub: 340000,  sellRub: 340000,  icon: "fa-ethereum",     emoji: "Ξ",   name: "Ethereum" }
};

// --------------------------------------------------------
// ⚠️ ЗАГЛУШКИ (активные каталоги живут в theme-manager.js)
// --------------------------------------------------------
const HUD_SOLID_COLORS = [];
const NICKNAME_EFFECTS_CATALOG = [];
const AVATAR_EFFECTS_CATALOG = [];

// --------------------------------------------------------
// ⭐ v3.0.0: HUD_THEMES_CATALOG — legacy
// Активный источник правды: theme-manager.js (11 тем).
// Каталог синхронизирован с theme-manager.js по cost/reqStars/reqTickets/reqLevel.
// --------------------------------------------------------
const HUD_THEMES_CATALOG = [
    { id: "cyber_neon",       name: "Cyber Neon",                    desc: "Бирюзовый неоновый стиль с глубоким контрастным черным фоном.",                colorId: "cyan",      cost: 0,      reqStars: 0,  reqTickets: 0, reqLevel: 1 },
    { id: "midnight_purple",  name: "Midnight Purple",               desc: "Глубокий фиолетовый неон с индиго. Атмосфера ночного мегаполиса и синдиката.",  colorId: "purple",    cost: 150000, reqStars: 0,  reqTickets: 0, reqLevel: 3 },
    { id: "tokyo_night",      name: "Tokyo Night",                   desc: "Ночные сходки Daikoku. Розово-фиолетовый неон, глубокий тёмный фон.",           colorId: "rose",      cost: 0,      reqStars: 25, reqTickets: 0, reqLevel: 5 },
    { id: "ruby_blood",       name: "Ruby Blood",                    desc: "Кроваво-красный агрессивный неон для тех, кто не привык проигрывать.",          colorId: "red",       cost: 250000, reqStars: 10, reqTickets: 0, reqLevel: 10 },
    { id: "matrix_green",     name: "Matrix Green",                  desc: "Классический хакерский зелёный с цифровым мерцанием.",                          colorId: "green",     cost: 300000, reqStars: 0,  reqTickets: 0, reqLevel: 12 },
    { id: "synthwave_86",     name: "Synthwave '86",                 desc: "Ретро-волна 80-х: малиновый и бирюзовый градиент с хромом.",                    colorId: "pink",      cost: 0,      reqStars: 30, reqTickets: 0, reqLevel: 15 },
    { id: "regal_gold",       name: "Regal Gold",                    desc: "Премиальное золото и рояльный лак высшего ранга.",                              colorId: "gold",      cost: 500000, reqStars: 20, reqTickets: 0, reqLevel: 25 },
    { id: "lightning_storm",  name: "Lightning Storm",               desc: "Электрический сине-фиолетовый неон с искрами молний на HUD.",                   colorId: "lightning", cost: 300000, reqStars: 15, reqTickets: 0, reqLevel: 7 },
    { id: "carbon_stealth",   name: "Stealth Titanium",              desc: "Сдержанный матовый титановый минимализм без кричащих тонов.",                  colorId: "white",     cost: 350000, reqStars: 10, reqTickets: 0, reqLevel: 12 },
    { id: "cyber_black_neo",  name: "Cyber Black Neo (Матовый DEV)", desc: "Все иконки телефона и блоки получают чёрно-неоновый матовый стиль консоли.",    colorId: "green",     cost: 380000, reqStars: 20, reqTickets: 1, reqLevel: 10, isCyberIcons: true },
    { id: "neon_cyberpunk",   name: "🌃 NEON CYBERPUNK",             desc: "ГЛИТЧ-ЭКСКЛЮЗИВ. Максимальный киберпанк: розово-жёлтый неон + RGB-глитч.",     colorId: "cyberpunk", cost: 0,      reqStars: 0,  reqTickets: 3, reqLevel: 20, isExclusive: true }
];

// --------------------------------------------------------
// КОНФИГ АНИМАЦИЙ СТРИТ-РЕЙСИНГА
// --------------------------------------------------------
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
        market_estimate: "Оценка рынка",
        price: "ЦЕНА",
        autoteka: "Автотека",
        inspected: "Просмотрено",
        thickness_gauge: "Толщиномер",
        garage_title: "Мой Автопарк",
        garage_capacity: "Вместимость",
        saleslot_title: "Площадка продаж",
        saleslot_desc: "Покупатели оценивают машины с учётом состояния, эксклюзивности госномеров и вашей репутации.",
        express_passes: "Экспресс-пропуска",
        express_desc: "Ускоряют поиск клиента до 0 сек.",
        waiting_client: "Ожидание клиента",
        busy_subscriber: "Абонент занят",
        paid_call: "Платный дозвон",
        call_seller: "Позвонить продавцу",
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
        market_estimate: "Market estimate",
        price: "PRICE",
        autoteka: "History Report",
        inspected: "Viewed",
        thickness_gauge: "Paint Gauge",
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
        plate_bonus_tip: "🔥 Elite plate equipped! Vehicle value boosted."
    }
};

// --------------------------------------------------------
// ЭКСПОРТ В ГЛОБАЛЬНЫЙ КОНТЕКСТ WINDOW
// --------------------------------------------------------
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

console.log('[💠 data_core v3.0.0] Платная кастомизация + SUPER_SPIN с косметикой + билетные эксклюзивы ✓');

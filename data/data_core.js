// ========================================================
// data_core.js — ЯДРО, СИСТЕМНЫЕ ДАННЫЕ И КАСТОМИЗАЦИЯ (v3.2.0 FULL)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v3.2.0:
//   - Полный состав SUPER_SPIN_TIERS сохранён (все 13 суперкаров + вся косметика).
//   - Для машин добавлены честные minLevel, чтобы рулетка не ломала баланс новичкам.
//   - Все темы, ник-эффекты, ауры и титулы сохранены в полном объёме.
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
    version: "v4.0.0",
    build: 406,
    authors: "Tak Toje, Max, Sergo, gemini, Илья Чепиль",
    releaseDate: "2026-10-21",
    patchNotes: [
        {
            title: "⚖️ СБАЛАНСИРОВАННЫЙ ВИЛСПИН",
            text: "Дроп колеса фортуны теперь динамический: на ранних уровнях дропаются авто начального класса, а экзотика и суперкары открываются по мере роста ранга авторитета."
        },
        {
            title: "💰 ПЛАТНАЯ КАСТОМИЗАЦИЯ ПРОФИЛЯ",
            text: "Все темы HUD, ник-эффекты, ауры аватара и титулы покупаются за рубли, Stars и Билеты."
        },
        {
            title: "👥 РЕАЛЬНЫЕ ИГРОКИ FIRESTORE",
            text: "Боты полностью удалены из лидерборда и поиска друзей — игра подключена к живой базе игроков."
        }
    ]
};

// --------------------------------------------------------
// СЕКТОРА КОЛЕСА ФОРТУНЫ (legacy)
// --------------------------------------------------------
const WHEEL_SECTORS = [
    { label: "+15k ₽",        type: "cash",    amount: 15000,   color: "#10b981", textColor: "#000000" },
    { label: "+3 ⭐",          type: "stars",   amount: 3,       color: "#f59e0b", textColor: "#000000" },
    { label: "Бак 50 ⛽",      type: "fuel",    amount: 50,      color: "#0284c7", textColor: "#ffffff" },
    { label: "+25k ₽",        type: "cash",    amount: 25000,   color: "#059669", textColor: "#ffffff" },
    { label: "+1 🤝 Связь",    type: "conn",    amount: 1,       color: "#9333ea", textColor: "#ffffff" },
    { label: "+3 🎟️ Талона",   type: "tickets", amount: 3,       color: "#06b6d4", textColor: "#000000" },
    { label: "+40k ₽",        type: "cash",    amount: 40000,   color: "#047857", textColor: "#ffffff" },
    { label: "+5 ⭐",          type: "stars",   amount: 5,       color: "#d97706", textColor: "#000000" },
    { label: "Талон ГИБДД 🚔",  type: "impound", amount: 1,       color: "#e11d48", textColor: "#ffffff" },
    { label: "💰 КУШ 60k",     type: "jackpot", amount: 60000,   color: "#ffd700", textColor: "#000000" }
];

// --------------------------------------------------------
// SUPER_SPIN_TIERS (ПОЛНЫЙ ПУЛ ТЕХНИКИ И КОСМЕТИКИ С MIN_LEVEL)
// --------------------------------------------------------
const SUPER_SPIN_TIERS = {
    reelCars: [
        { type: "car", barnId: "barn_vaz_2101",     name: "ВАЗ-2101 «Копейка»",              category: "economy", basePrice: 45000,    power: 85,  emoji: "🚗", minLevel: 1 },
        { type: "car", barnId: "barn_mark2",        name: "Toyota Mark II (JZX90 / JZX100)", category: "economy", basePrice: 350000,   power: 280, emoji: "🏎️", minLevel: 5 },
        { type: "car", barnId: "barn_golf6_gti",    name: "Volkswagen Golf VI GTI",          category: "comfort", basePrice: 1100000,  power: 211, emoji: "🏎️", minLevel: 10 },
        { type: "car", barnId: "barn_silvia",       name: "Nissan Silvia (S15)",             category: "comfort", basePrice: 1400000,  power: 250, emoji: "🏎️", minLevel: 12 },
        { type: "car", barnId: "barn_corvette_c6",  name: "Chevrolet Corvette C6 Z06",       category: "premium", basePrice: 3200000,  power: 505, emoji: "🏎️", minLevel: 15 },
        { type: "car", barnId: "barn_bmw_m340i",    name: "BMW M340i xDrive (G20)",          category: "premium", basePrice: 4200000,  power: 387, emoji: "🏎️", minLevel: 18 },
        { type: "car", barnId: "barn_c63_amg",      name: "Mercedes-Benz C63 AMG (W205)",    category: "premium", basePrice: 4800000,  power: 510, emoji: "🏎️", minLevel: 20 },
        { type: "car", barnId: "barn_supra_mk5",    name: "Toyota GR Supra (A90 Mk5)",       category: "comfort", basePrice: 4500000,  power: 340, emoji: "🏎️", minLevel: 22 },
        { type: "car", barnId: "barn_charger_srt",  name: "Dodge Charger SRT Hellcat",       category: "premium", basePrice: 5500000,  power: 717, emoji: "🏎️", minLevel: 25 },
        { type: "car", barnId: "barn_mercedes_s63", name: "Mercedes-AMG S63 (W222)",         category: "premium", basePrice: 8500000,  power: 612, emoji: "🏎️", minLevel: 30 },
        { type: "car", barnId: "barn_ghost",        name: "Rolls-Royce Ghost",               category: "premium", basePrice: 16000000, power: 571, emoji: "👑", minLevel: 40 },
        { type: "car", barnId: "barn_ferrari_458",  name: "Ferrari 458 Italia",              category: "hyper",   basePrice: 22000000, power: 570, emoji: "🐎", minLevel: 50 },
        { type: "car", barnId: "barn_huracan",      name: "Lamborghini Huracán EVO",         category: "hyper",   basePrice: 26000000, power: 640, emoji: "⚡", minLevel: 55 },
        { type: "tool", toolId: "obd", name: "Сканер ELM327 OBD2", emoji: "📱", minLevel: 1 },
        { type: "tool", toolId: "obd_launch", name: "Сканер Launch Pro", emoji: "📱", minLevel: 6 },
        { type: "tool", toolId: "endoscope", name: "HD Видеоэндоскоп", emoji: "📹", minLevel: 8 },
        { type: "free_impound", name: "Талон ГИБДД", emoji: "🚔", minLevel: 1 },
        { type: "xp_bundle", name: "Пакет Опыта (+100 XP)", amount: 100, emoji: "🎖️", minLevel: 1 }
    ],
    reelResources: [
        { type: "cash",     label: "25,000 ₽",        amount: 25000 },
        { type: "cash",     label: "50,000 ₽",        amount: 50000 },
        { type: "cash",     label: "100,000 ₽",       amount: 100000 },
        { type: "fuel",     label: "Полный бак 100 ⛽", amount: 100 },
        { type: "tickets",  label: "+5 Талонов 🎟️",    amount: 5 },
        { type: "conn",     label: "+1 Связь 🤝",      amount: 1 },
        { type: "xp",       label: "+100 XP",          amount: 100 }
    ],
    reelExclusives: [
        // ─── Валюта и документы ───
        { type: "stars",     label: "5 ⭐ (12,500 ₽)",       amount: 5,   emoji: "⭐" },
        { type: "stars",     label: "15 ⭐ (37,500 ₽)",      amount: 15,  emoji: "⭐" },
        { type: "plate",     label: "Номер А777АА 77",       plate: "А777АА 77",  emoji: "🏷️" },
        { type: "plate",     label: "Номер В888ВВ 777",      plate: "В888ВВ 777", emoji: "🏷️" },
        { type: "mod_cert",  label: "Сертификат на Stage 2", cashValue: 50000, emoji: "🔧" },
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
// КУРСЫ ВАЛЮТ БАНКА
// --------------------------------------------------------
const BANK_EXCHANGE_RATES = {
    rub:     { buyRub: 1,       sellRub: 1,       name: "Рубли" },
    stars:   { buyRub: 2500,    sellRub: 2350,    icon: "fa-star",         emoji: "⭐",  name: "Stars" },
    fuel:    { buyRub: 1500,    sellRub: 1500,    icon: "fa-gas-pump",     emoji: "⛽",  name: "Топливо (л)" },
    tickets: { buyRub: 15000,   sellRub: 13500,   icon: "fa-ticket",       emoji: "🎟️", name: "Талоны" },
    conn:    { buyRub: 80000,   sellRub: 70000,   icon: "fa-handshake",    emoji: "🤝",  name: "Связи" }
};

const HUD_SOLID_COLORS = [];
const NICKNAME_EFFECTS_CATALOG = [];
const AVATAR_EFFECTS_CATALOG = [];

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

const STREET_RACE_ANIM_CONFIG = {
    driftDurationMs: 6000,
    dragDurationMs: 6500,
    stanceDurationMs: 5500
};

function calculatePlateValue(plateStr) {
    if (!plateStr || typeof plateStr !== 'string') return 0;
    const clean = plateStr.trim().toUpperCase();
    if (clean.includes('ТРАНЗИТ')) return 0;

    let value = 2500;
    const match = clean.match(/^([А-ЯA-Z])\s*(\d{3})\s*([А-ЯA-Z]{2})\s*(\d{2,3})$/);

    if (!match) {
        if (clean.includes('777')) value += 35000;
        if (clean.includes('ЕКХ') || clean.includes('АМР')) value += 180000;
        return value;
    }

    const firstLetter = match[1];
    const numStr = match[2];
    const tailLetters = match[3];
    const regStr = match[4];

    const letters = firstLetter + tailLetters;
    const d1 = numStr[0], d2 = numStr[1], d3 = numStr[2];

    if (numStr === '777') value += 250000;
    else if (numStr === '001') value += 190000;
    else if (numStr === '007') value += 150000;
    else if (d1 === d2 && d2 === d3) value += 110000;
    else if (numStr.startsWith('00')) value += 65000;
    else if (numStr.endsWith('00')) value += 45000;
    else if (d1 === d3 && d1 !== d2) value += 20000;

    const specSeries = {
        'АМР': 550000, 'ЕКХ': 750000, 'СКР': 450000, 'ВОР': 300000,
        'САС': 180000, 'ХХХ': 220000, 'ООО': 240000, 'ААА': 200000, 'МММ': 190000
    };

    if (specSeries[letters]) value += specSeries[letters];
    else if (letters[0] === letters[1] && letters[1] === letters[2]) value += 120000;
    else if (tailLetters[0] === tailLetters[1]) value += 10000;

    const eliteRegions = ['77', '99', '97', '777'];
    const prestigeRegions = ['177', '199', '799', '50', '90', '150', '190', '750'];

    if (eliteRegions.includes(regStr)) value = Math.round(value * 1.4);
    else if (prestigeRegions.includes(regStr)) value = Math.round(value * 1.15);

    if (numStr === '777' && regStr === '777' && letters[0] === letters[1] && letters[1] === letters[2]) {
        value = Math.max(value, 2000000);
    }
    return value;
}

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

console.log('[💠 data_core v3.2.0 FULL] Полный пул суперкаров и косметики с уровневым доступом сохранён ✓');

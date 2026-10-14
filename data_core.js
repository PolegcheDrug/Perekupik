// ========================================================
// data_core.js — ЯДРО, СИСТЕМНЫЕ ДАННЫЕ И КАСТОМИЗАЦИЯ
// ⭐ v2.0.0: РЕБАЛАНС ЭКОНОМИКИ И ЦЕНТРАЛИЗАЦИЯ
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
    version: "v2.0.0",
    build: 350,
    authors: "Tak Toje, Max, Sergo, gemini, Илья Чепиль",
    releaseDate: "2026-10-20",
    patchNotes: [
        {
            title: "💰 РЕБАЛАНС ЭКОНОМИКИ",
            text: "Бизнесы теперь окупаются за 20-40 дней вместо 90-190. Курс Stars снижен в 40 раз (1 ⭐ = 2,500 ₽). Ставка депозита снижена с 3% до 0.3% в день."
        },
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
// СЕКТОРА КОЛЕСА ФОРТУНЫ
// ⚠️ v2.0.0: WHEEL_SECTORS — legacy, активно не используется.
// Активные данные выпадающих призов находятся в WHEEL_CONFIG
// (см. data_economy.js) и SUPER_SPIN_TIERS (ниже).
// Оставлено для обратной совместимости с phone-media.js.
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
// ⭐ v2.0.0: SUPER_SPIN_TIERS
// Цены в звёздах сопоставлены с новым курсом 1 ⭐ = 2,500 ₽.
// В комментариях указан рублёвый эквивалент для справки.
// --------------------------------------------------------
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
        { type: "cash",     label: "250,000 ₽",       amount: 250000 },
        { type: "cash",     label: "500,000 ₽",       amount: 500000 },
        { type: "jackpot",  label: "ДЖЕКПОТ 1.5M ₽",  amount: 1500000 },
        { type: "fuel",     label: "Полный бак 100 ⛽", amount: 100 },
        { type: "tickets",  label: "+25 Талонов 🎟️",  amount: 25 },
        { type: "conn",     label: "+2 Связи 🤝",      amount: 2 },
        { type: "xp",       label: "+200 XP",          amount: 200 }
    ],
    reelExclusives: [
        // ⭐ v2.0.0: 30 ⭐ = 75,000 ₽, 75 ⭐ = 187,500 ₽ (раньше "30 ⭐" было эквивалентно 3M ₽!)
        { type: "stars",     label: "30 ⭐ (75,000 ₽)",      amount: 30,  emoji: "⭐" },
        { type: "stars",     label: "75 ⭐ (187,500 ₽)",     amount: 75,  emoji: "⭐" },
        { type: "plate",     label: "Номер А777АА 77",       plate: "А777АА 77",  emoji: "🏷️" },
        { type: "plate",     label: "Номер В888ВВ 777",      plate: "В888ВВ 777", emoji: "🏷️" },
        { type: "mod_cert",  label: "Сертификат на Stage 2", cashValue: 120000, emoji: "🔧" },
        { type: "free_impound", label: "Амнистия ГИБДД", emoji: "👮" }
    ]
};

// --------------------------------------------------------
// ⭐ v2.0.0: КУРСЫ ВАЛЮТ БАНКА
// КРИТИЧЕСКИЙ ФИКС: stars.buyRub снижен со 100,000 ₽ до 2,500 ₽.
// Раньше: SuperSpin ticket за 60 ⭐ = 6,000,000 ₽ в рублёвом эквиваленте,
//         при цене альтернативы 150,000 ₽. Эксплойт в 40 раз.
// Теперь: 60 ⭐ = 150,000 ₽. Совпадает с рублёвой ценой.
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
// ⚠️ v2.0.0: КАТАЛОГИ HUD
// Активные версии живут в theme-manager.js:
//   • ThemeManager.themes         → HUD_SOLID_COLORS
//   • ThemeManager.nickEffects    → NICKNAME_EFFECTS_CATALOG
//   • ThemeManager.avatarEffects  → AVATAR_EFFECTS_CATALOG
// Здесь оставлены пустые заглушки для совместимости со старым кодом,
// который мог бы обратиться к ним ДО загрузки theme-manager.js.
// --------------------------------------------------------
const HUD_SOLID_COLORS = [];               // → перезаписывается theme-manager.js
const NICKNAME_EFFECTS_CATALOG = [];       // → перезаписывается theme-manager.js
const AVATAR_EFFECTS_CATALOG = [];         // → перезаписывается theme-manager.js

// ⚠️ HUD_THEMES_CATALOG — только здесь, нигде не дублируется.
// Используется в ThemeManager как источник готовых пресетов оформления.
const HUD_THEMES_CATALOG = [
    { id: "cyber_black_neo",  name: "Cyber Black Neo (Матовый DEV)", desc: "Все иконки телефона и блоки получают черно-неоновый матовый стиль консоли DEV.", colorId: "green",    cost: 380000, reqStars: 20, reqLevel: 10, isCyberIcons: true },
    { id: "lightning_storm",  name: "Lightning Storm (Гроза)",       desc: "Электрический сине-фиолетовый неон с искрами молний на HUD и телефоне.",       colorId: "lightning", cost: 300000, reqStars: 15, reqLevel: 7,  isLightning: true },
    { id: "cyber_neon",       name: "Cyber Neon",                    desc: "Бирюзовый неоновый стиль с глубоким контрастным черным фоном.",                colorId: "cyan",     cost: 0,      reqStars: 0,  reqLevel: 1 },
    { id: "tokyo_drift",      name: "Tokyo Drift",                   desc: "Агрессивный рубиновый акцент с янтарным свечением.",                          colorId: "red",      cost: 150000, reqStars: 5,  reqLevel: 5 },
    { id: "toxic_acid",       name: "Toxic Acid",                    desc: "Ядовитый неоновый лайм уличных нелегальных гонок.",                            colorId: "green",    cost: 250000, reqStars: 8,  reqLevel: 8 },
    { id: "syndicate_gold",   name: "Prestige Gold",                 desc: "Премиальное золото и рояльный лак высшего ранга.",                             colorId: "gold",     cost: 500000, reqStars: 15, reqLevel: 15 },
    { id: "carbon_stealth",   name: "Stealth Titanium",              desc: "Сдержанный матовый титановый минимализм без кричащих тонов.",                  colorId: "white",    cost: 350000, reqStars: 10, reqLevel: 12 }
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
// ⭐ v2.0.0: добавлены ключи для площадки продаж и классов техники.
// --------------------------------------------------------
const I18N_TRANSLATIONS = {
    ru: {
        // Классы техники
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

        // Рынок
        btn_refresh_market: "Обновить ленту",
        market_estimate: "Оценка рынка",
        price: "ЦЕНА",
        autoteka: "Автотека",
        inspected: "Просмотрено",
        thickness_gauge: "Толщиномер",

        // Гараж
        garage_title: "Мой Автопарк",
        garage_capacity: "Вместимость",

        // Площадка продаж
        saleslot_title: "Площадка продаж",
        saleslot_desc: "Покупатели оценивают машины с учётом состояния, эксклюзивности госномеров и вашей репутации.",
        express_passes: "Экспресс-пропуски",
        express_desc: "Ускоряют поиск клиента до 0 сек.",
        waiting_client: "Ожидание клиента",
        busy_subscriber: "Абонент занят",
        paid_call: "Платный дозвон",
        call_seller: "Позвонить продавцу",
        plate_bonus_tip: "🔥 Установлен блатной номер! Рыночная стоимость повышена."
    },
    en: {
        // Vehicle Classes
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

        // Market
        btn_refresh_market: "Refresh Feed",
        market_estimate: "Market estimate",
        price: "PRICE",
        autoteka: "History Report",
        inspected: "Viewed",
        thickness_gauge: "Paint Gauge",

        // Garage
        garage_title: "My Fleet / Garage",
        garage_capacity: "Capacity",

        // Sales Lot
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

console.log('[💠 data_core v2.0.0] Курс Stars = 2,500 ₽, курсы валют пересчитаны ✓');
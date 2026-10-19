// ========================================================
// js/market/market-generator.js — ГЕНЕРАТОР ЛОТОВ (v2.4.0 BALANCED)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v2.4.0:
//   - Синхронизация оценки: marketValue лота сразу рассчитывается через recalculateCarMarketValue,
//     устраняя падение цены после покупки при попадании в гараж.
//   - Исправлена логика ЛКП: толщина >180 мкм корректно выставляет флаг isRepainted.
//   - Скрученный пробег синхронизирован с autotekaMileageDiscrepancy.
//   - Расширен детектор брендов для репутации (Ока, ВАЗ-классика).
//   - Полная интеграция сезонных событий, Даркнета и P2P-лотов.
// ========================================================

const PLATE_LETTERS = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];
const REGIONS = ['77', '99', '97', '177', '199', '777', '799', '50', '90', '150', '190', '750'];

const CATEGORY_META = {
    all:      { name: "ВСЕ КАТЕГОРИИ", title: "Общий рынок техники",      capital: "от 25 000 ₽",   desc: "Все доступные по уровню классы транспорта с сортировкой по цене." },
    economy:  { name: "ЭКОНОМ",        title: "Сегмент Эконом",           capital: "от 40 000 ₽",   desc: "Быстрый оборот, легкий торг и моментальная ликвидность." },
    scooter:  { name: "СКУТЕРЫ",       title: "Городские Скутеры",        capital: "от 25 000 ₽",   desc: "Дешёвый вход, быстрые сделки и сезонный спрос молодёжи." },
    moto:     { name: "МОТО",          title: "Спортбайки & Классика",    capital: "от 120 000 ₽",  desc: "Высокая сезонная маржа, проверка геометрии рамы и вилки." },
    atv:      { name: "КВАДРО",        title: "Квадроциклы 4x4",          capital: "от 180 000 ₽",  desc: "Техника для бездорожья. Частые скрытые дефекты ходовой." },
    comfort:  { name: "КОМФОРТ",       title: "Сегмент Комфорт",          capital: "от 450 000 ₽",  desc: "Седаны и кроссоверы (с 10 ур.). Идеально под выкуп для семей." },
    premium:  { name: "ПРЕМИУМ",       title: "Премиум & Люкс",           capital: "от 1 200 000 ₽", desc: "Высокая чистая прибыль, статус и требовательные клиенты." },
    hyper:    { name: "ГИПЕРКАРЫ",     title: "Спорт & Экзотика",         capital: "от 5 000 000 ₽", desc: "Огромная маржа, эксклюзивные клиенты, дорогие комплектующие." },
    truck:    { name: "ГРУЗОВИКИ",     title: "Коммерческий транспорт",   capital: "от 2 500 000 ₽", desc: "Тягачи и фургоны для крупных заказов ПодКлюч." },
    yacht:    { name: "ЯХТЫ",          title: "Морской сегмент",          capital: "от 15 000 000 ₽", desc: "Элитная морская техника для настоящих автоолигархов." }
};

// ⭐ v2.3.0: БАЗОВАЯ РЕПУТАЦИЯ БРЕНДОВ (1.0 = нейтрально)
const BRAND_BASE_REPUTATION = {
    'bmw': 1.0, 'mercedes': 1.0, 'audi': 1.0, 'vw': 1.0, 'porsche': 1.0,
    'toyota': 1.0, 'nissan': 1.0, 'honda': 1.0, 'mazda': 1.0, 'subaru': 1.0,
    'vaz': 1.0, 'gaz': 1.0, 'uaz': 1.0, 'moskvich': 1.0, 'lada': 1.0,
    'kia': 1.0, 'hyundai': 1.0, 'ford': 1.0, 'chevrolet': 1.0, 'skoda': 1.0,
    'default': 1.0
};

// ⭐ v2.3.0: СЕЗОННЫЕ СОБЫТИЯ
const SEASONAL_EVENTS = [
    {
        id: 'new_year',
        name: '🎄 Новогодняя распродажа',
        categories: ['all'],
        multiplier: 1.15,
        durationDays: 7,
        desc: 'Все хотят купить машину перед праздниками — цены выросли на 15%.'
    },
    {
        id: 'march_8',
        name: '🌷 8 Марта',
        categories: ['comfort', 'premium'],
        multiplier: 1.20,
        durationDays: 5,
        desc: 'Мужчины скупают премиум-седаны в подарок. Цены на Комфорт и Премиум +20%.'
    },
    {
        id: 'drift_fest',
        name: '💨 Дрифт-фестиваль',
        categories: ['economy', 'moto'],
        multiplier: 1.30,
        durationDays: 4,
        desc: 'Сезон дрифта открыт! Заднеприводные тачки и мотоциклы в цене (+30%).'
    },
    {
        id: 'moto_season',
        name: '🏍 Открытие мотосезона',
        categories: ['moto', 'scooter'],
        multiplier: 1.25,
        durationDays: 6,
        desc: 'Мотобратва выкатывается на дороги. Цены на мото +25%.'
    }
];

// ========================================================
// 8 АРХЕТИПОВ ПРОДАВЦОВ
// ========================================================
const SELLER_ARCHETYPES = [
    { id: 'honest_grandpa', name: 'Честный дед', avatar: '👴', riskTolerance: 'low', hideDefectChance: 0.10, priceMultiplier: 0.92, patience: 6, revealDefects: true, desc: 'Ездил только летом, все косяки расскажет как есть.' },
    { id: 'cunning_perekup', name: 'Перекуп-хитрюга', avatar: '🧔', riskTolerance: 'high', hideDefectChance: 0.75, priceMultiplier: 1.08, patience: 3, revealDefects: false, desc: 'Скрывает 75% дефектов, торгуется жёстко.' },
    { id: 'panicker', name: 'Паникёр', avatar: '😰', riskTolerance: 'low', hideDefectChance: 0.55, priceMultiplier: 0.62, patience: 2, revealDefects: false, desc: 'Продаёт срочно за долги. Скидка огромная, но 1 скрытый косяк почти гарантирован.' },
    { id: 'collector', name: 'Коллекционер', avatar: '🤵', riskTolerance: 'low', hideDefectChance: 0.15, priceMultiplier: 1.35, patience: 5, revealDefects: true, desc: 'Эксклюзивные тачки, знает цену. Торг минимальный.' },
    { id: 'criminal', name: 'Уголовник', avatar: '🕶️', riskTolerance: 'high', hideDefectChance: 0.60, priceMultiplier: 0.75, patience: 4, revealDefects: false, desc: 'Каждый второй лот — криминал. Риск попасть в облаву.' },
    { id: 'blogger', name: 'Блогер', avatar: '📱', riskTolerance: 'mid', hideDefectChance: 0.40, priceMultiplier: 1.20, patience: 4, revealDefects: false, desc: 'Распиаренные тачки, +20% к цене, но можно сторговать.' },
    { id: 'pensioner', name: 'Пенсионер', avatar: '👵', riskTolerance: 'low', hideDefectChance: 0.35, priceMultiplier: 0.85, patience: 5, revealDefects: false, desc: 'Дешёво, но 100% скрутка пробега. Сканер обязателен.' },
    { id: 'autopodbor', name: 'Автоподборщик', avatar: '🕵️', riskTolerance: 'mid', hideDefectChance: 0.30, priceMultiplier: 1.12, patience: 5, revealDefects: false, desc: 'Продаёт как «проверенное», но 30% скрытых дефектов всё равно есть.' }
];

// ========================================================
// РАЙОНЫ ГОРОДА
// ========================================================
const MARKET_DISTRICTS = [
    { id: 'center',     name: 'Центральный р-н',           x: 50, y: 50, radius: 12, streets: ['ул. Ленина', 'пр. Мира', 'ул. Тверская'] },
    { id: 'sleep',      name: 'Спальные микрорайоны',      x: 28, y: 35, radius: 16, streets: ['ул. Космонавтов', 'пр. Победы', 'ул. Южная'] },
    { id: 'industrial', name: 'Промзона / Авторынок',      x: 75, y: 30, radius: 15, streets: ['Заводской проезд', 'ул. Промышленная', 'Авторынок "Северный"'] },
    { id: 'garages',    name: 'Гаражный массив "Север"',   x: 35, y: 80, radius: 14, streets: ['ГСК "Лада"', 'ГСК "Мотор-2"', 'Гаражный проезд 4'] },
    { id: 'suburb',     name: 'Пригород / Посёлок',        x: 80, y: 78, radius: 18, streets: ['п. Новые Зори', 'Дачный посёлок', 'Шоссейная ул.'] }
];

function generateCarGeoData() {
    const district = MARKET_DISTRICTS[Math.floor(Math.random() * MARKET_DISTRICTS.length)];
    const street = district.streets[Math.floor(Math.random() * district.streets.length)];
    const houseNum = Math.floor(Math.random() * 120) + 1;
    const address = `${district.name}, ${street}, д. ${houseNum}`;
    const angle = Math.random() * Math.PI * 2;
    const distanceOffset = Math.random() * district.radius;
    const mapX = Math.min(95, Math.max(5, Math.round(district.x + Math.cos(angle) * distanceOffset)));
    const mapY = Math.min(95, Math.max(5, Math.round(district.y + Math.sin(angle) * distanceOffset)));
    return { districtId: district.id, districtName: district.name, address, mapX, mapY };
}

function getCategoryFallback(type) {
    if (typeof CAR_FALLBACKS_BY_CATEGORY !== 'undefined' && CAR_FALLBACKS_BY_CATEGORY[type]) {
        return CAR_FALLBACKS_BY_CATEGORY[type];
    }
    return "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80";
}

// ========================================================
// ГЕНЕРАЦИЯ ГОСНОМЕРОВ
// ========================================================
function generateRawNormalPlate() {
    const l1 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
    const l2 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
    const l3 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
    const num = String(Math.floor(Math.random() * 899) + 100);
    const reg = REGIONS[Math.floor(Math.random() * REGIONS.length)];
    return l1 + num + l2 + l3 + " " + reg;
}

function generateRawCoolPlate() {
    let letters = "";
    if (Math.random() > 0.6) {
        const l = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
        letters = l + l + l;
    } else {
        const l1 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
        const l2 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
        letters = l1 + l2 + l2;
    }
    const coolNums = ['111', '222', '333', '444', '555', '666', '777', '888', '999', '007', '001', '100', '700'];
    const num = coolNums[Math.floor(Math.random() * coolNums.length)];
    const reg = ['77', '99', '97', '777', '50'][Math.floor(Math.random() * 5)];
    return letters.charAt(0) + num + letters.substring(1) + " " + reg;
}

function getUniquePlate(preferCool = false) {
    if (!state.registeredPlates) state.registeredPlates = [];
    let plateCandidate = "";
    let attempts = 0;
    do {
        attempts++;
        plateCandidate = preferCool ? generateRawCoolPlate() : generateRawNormalPlate();
    } while (state.registeredPlates.includes(plateCandidate) && attempts < 35);
    state.registeredPlates.push(plateCandidate);
    return plateCandidate;
}

function generateNormalPlate() { return getUniquePlate(false); }
function generateCoolPlate()   { return getUniquePlate(true); }

function evaluatePlate(plateStr) {
    if (typeof calculatePlateValue === 'function') return calculatePlateValue(plateStr);
    if (!plateStr) return 0;
    if (String(plateStr).startsWith('ТРАНЗИТ')) return 0;
    return 2500;
}

function refreshPlateCatalog() {
    state.plateCatalog = [];
    for (let i = 0; i < 6; i++) {
        const isCool = Math.random() < 0.25;
        let p = isCool ? generateCoolPlate() : generateNormalPlate();
        const cost = Math.round(evaluatePlate(p) * (1.05 + Math.random() * 0.20));
        state.plateCatalog.push({ plate: p, price: cost });
    }
}

// ========================================================
// РЕПУТАЦИЯ БРЕНДА
// ========================================================
function _ensureBrandReputation() {
    if (!window.state) window.state = {};
    if (!window.state.brandReputation) {
        window.state.brandReputation = {};
        for (const b in BRAND_BASE_REPUTATION) {
            window.state.brandReputation[b] = BRAND_BASE_REPUTATION[b];
        }
    }
}

/**
 * Определяет бренд по названию машины с улучшенным распознаванием отечественных авто.
 */
function _detectBrand(carName) {
    if (!carName) return 'default';
    const lower = String(carName).toLowerCase();
    if (lower.includes('bmw') || lower.includes('бмв')) return 'bmw';
    if (lower.includes('mercedes') || lower.includes('мерседес')) return 'mercedes';
    if (lower.includes('audi') || lower.includes('ауди')) return 'audi';
    if (lower.includes('vw') || lower.includes('volkswagen') || lower.includes('фольксваген') || lower.includes('golf')) return 'vw';
    if (lower.includes('porsche') || lower.includes('порше')) return 'porsche';
    if (lower.includes('toyota') || lower.includes('тойота')) return 'toyota';
    if (lower.includes('nissan') || lower.includes('ниссан')) return 'nissan';
    if (lower.includes('honda') || lower.includes('хонда')) return 'honda';
    if (lower.includes('mazda') || lower.includes('мазда')) return 'mazda';
    if (lower.includes('subaru') || lower.includes('субару')) return 'subaru';
    if (lower.includes('vaz') || lower.includes('ваз') || lower.includes('lada') || lower.includes('лада') || lower.includes('жигули') || lower.includes('ока') || lower.includes('oka') || lower.includes('1111') || lower.includes('210') || lower.includes('211')) return 'vaz';
    if (lower.includes('gaz') || lower.includes('газ') || lower.includes('волга')) return 'gaz';
    if (lower.includes('uaz') || lower.includes('уаз')) return 'uaz';
    if (lower.includes('moskvich') || lower.includes('москвич')) return 'moskvich';
    if (lower.includes('kia') || lower.includes('киа')) return 'kia';
    if (lower.includes('hyundai') || lower.includes('хендай')) return 'hyundai';
    if (lower.includes('ford') || lower.includes('форд')) return 'ford';
    if (lower.includes('chevrolet') || lower.includes('шевроле')) return 'chevrolet';
    if (lower.includes('skoda') || lower.includes('шкода')) return 'skoda';
    return 'default';
}

function getBrandReputation(carName) {
    _ensureBrandReputation();
    const brand = _detectBrand(carName);
    return window.state.brandReputation[brand] || 1.0;
}

function updateBrandReputationAfterSale(carName, isCleanSale) {
    _ensureBrandReputation();
    const brand = _detectBrand(carName);
    let current = window.state.brandReputation[brand] || 1.0;

    if (isCleanSale) {
        current = Math.min(1.5, current + 0.05);
    } else {
        current = Math.max(0.5, current - 0.10);
    }

    window.state.brandReputation[brand] = parseFloat(current.toFixed(2));
    console.log(`[Reputation] Бренд ${brand.toUpperCase()}: ${window.state.brandReputation[brand]}`);

    if (typeof saveState === 'function') saveState();
}

// ========================================================
// СЕЗОННЫЕ СОБЫТИЯ
// ========================================================
function _ensureGlobalEvent() {
    if (!window.state) window.state = {};
    if (window.state.globalEvent && window.state.globalEvent.isActive && window.state.globalEvent.daysLeft > 0) {
        return;
    }

    if (Math.random() > 0.25) {
        window.state.globalEvent = null;
        return;
    }

    const ev = SEASONAL_EVENTS[Math.floor(Math.random() * SEASONAL_EVENTS.length)];
    window.state.globalEvent = {
        ...ev,
        isActive: true,
        daysLeft: ev.durationDays,
        startedAt: Date.now()
    };
    console.log(`[Event] Активировано сезонное событие: ${ev.name}`);
}

function getSeasonMultiplier(carType) {
    const ev = window.state?.globalEvent;
    if (!ev || !ev.isActive || ev.daysLeft <= 0) return 1.0;
    if (!Array.isArray(ev.categories)) return ev.multiplier || 1.0;
    if (ev.categories.includes('all') || ev.categories.includes(carType)) {
        return ev.multiplier || 1.0;
    }
    return 1.0;
}

function formatCarBrandBadgeHtml(carName) {
    if (!carName) return "<span>Авто</span>";
    const brands = [
        { brand: "ВАЗ", badgeClass: "brand-vaz" },
        { brand: "Lada", badgeClass: "brand-vaz" },
        { brand: "Ока", badgeClass: "brand-vaz" },
        { brand: "ГАЗ", badgeClass: "brand-gaz" },
        { brand: "Москвич", badgeClass: "brand-gaz" },
        { brand: "BMW", badgeClass: "brand-bmw" },
        { brand: "Mercedes", badgeClass: "brand-mercedes" },
        { brand: "Audi", badgeClass: "brand-audi" },
        { brand: "VW", badgeClass: "brand-vw" },
        { brand: "Skoda", badgeClass: "brand-skoda" },
        { brand: "Toyota", badgeClass: "brand-toyota" },
        { brand: "Nissan", badgeClass: "brand-nissan" },
        { brand: "Porsche", badgeClass: "brand-porsche" },
        { brand: "Hyundai", badgeClass: "brand-korea" },
        { brand: "Kia", badgeClass: "brand-korea" },
        { brand: "Ford", badgeClass: "brand-usa" },
        { brand: "Chevrolet", badgeClass: "brand-usa" },
        { brand: "Scania", badgeClass: "brand-truck" },
        { brand: "Volvo", badgeClass: "brand-truck" }
    ];
    let matched = brands.find(b => carName.includes(b.brand));
    let brandText = matched ? matched.brand : carName.split(' ')[0];
    let modelText = matched ? carName.replace(matched.brand, '').trim() : carName;
    return `
        <div class="car-brand-title-wrap">
            <span class="car-brand-pill ${matched ? matched.badgeClass : 'brand-default'}">${brandText}</span>
            <span class="car-model-name">${modelText}</span>
        </div>
    `;
}

function getDynamicPrice(basePrice, type) {
    if (!state.marketModifiers) state.marketModifiers = { economy: 1, comfort: 1, premium: 1, hyper: 1, moto: 1, truck: 1, all: 1 };
    let mod = 1;
    if (state.marketModifiers && state.marketModifiers[type]) mod = state.marketModifiers[type];
    let globalMod = 1;
    if (state.marketModifiers && state.marketModifiers.all) globalMod = state.marketModifiers.all;
    let price = basePrice || 100000;
    return Math.floor(price * mod * globalMod);
}

function getUnlockedCategoriesForMarket() {
    if (typeof getUnlockedCategoriesForPlayer === 'function') {
        return getUnlockedCategoriesForPlayer(state.player?.level || 1);
    }
    const lvl = state.player?.level || 1;
    const list = ['economy', 'scooter'];
    if (lvl >= 4)  list.push('moto');
    if (lvl >= 7)  list.push('atv');
    if (lvl >= 10) list.push('comfort');
    if (lvl >= 25) list.push('premium');
    if (lvl >= 45) list.push('hyper', 'truck');
    if (lvl >= 85) list.push('yacht');
    return list;
}

// ========================================================
// ГЕНЕРАЦИЯ ДЕФЕКТОВ
// ========================================================
function generateCarDefects(car, seller, isBeaterProject) {
    const result = {
        hiddenDefect: null,
        mechanicalDefects: [],
        legalDefect: null,
        inspectionStatus: {
            visual: false, gauge: false, obd: false,
            endoscope: false, compression: false,
            autoteka: false, autotekaPro: false, expert: false
        }
    };

    if (typeof MECHANICAL_DEFECTS === 'undefined' || !Array.isArray(MECHANICAL_DEFECTS)) {
        console.warn('[Market] MECHANICAL_DEFECTS не найден — fallback на OBD_ERRORS');
        if (typeof OBD_ERRORS !== 'undefined' && Array.isArray(OBD_ERRORS) && OBD_ERRORS.length > 0) {
            const defectChance = isBeaterProject ? 0.85 : 0.28;
            if (Math.random() < defectChance) {
                const err = OBD_ERRORS[Math.floor(Math.random() * OBD_ERRORS.length)];
                result.hiddenDefect = {
                    code: err.code, system: err.system, text: err.text,
                    cost: err.cost, severity: err.severity,
                    rpm: err.rpm, temp: err.temp, boost: err.boost
                };
            }
        }
        return result;
    }

    try {
        const cond = car.condition || 80;
        let baseCount = 2;
        if (isBeaterProject) baseCount = 4;
        if (cond < 40) baseCount += 2;
        if (cond < 20) baseCount += 2;

        let visibleCount = 0;
        if (seller) {
            if (seller.revealDefects) visibleCount = Math.ceil(baseCount * 0.7);
            else visibleCount = Math.max(1, Math.ceil(baseCount * 0.25));
        } else {
            visibleCount = Math.max(1, Math.ceil(baseCount * 0.5));
        }

        let hiddenCount = baseCount - visibleCount;
        if (seller && seller.hideDefectChance > 0.5) {
            hiddenCount = Math.max(hiddenCount, 1);
        }

        const pool = MECHANICAL_DEFECTS.filter(d => {
            let prob = d.probability * (isBeaterProject ? 2 : 1);
            if (cond >= 80 && (d.severity === 'Критическая' || d.severity === 'Высокая')) prob *= 0.15;
            if (cond <= 40 && d.severity === 'Низкая') prob *= 0.5;
            return Math.random() < prob;
        });

        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, visibleCount + hiddenCount);

        const usedIds = new Set();
        const uniqueDefects = selected.filter(d => {
            if (usedIds.has(d.id)) return false;
            usedIds.add(d.id);
            return true;
        });

        uniqueDefects.forEach((defect, idx) => {
            const isHidden = idx >= visibleCount;
            const defectCopy = { ...defect, isHidden };
            result.mechanicalDefects.push(defectCopy);

            if (isHidden && !result.hiddenDefect &&
                (defect.severity === 'Критическая' || defect.severity === 'Высокая')) {
                if (typeof OBD_ERRORS !== 'undefined' && Array.isArray(OBD_ERRORS) && OBD_ERRORS.length > 0) {
                    let matched = OBD_ERRORS.find(o =>
                        o.system.includes(defect.category === 'ENGINE' ? 'ДВС' : 'АКПП')
                    );
                    if (!matched) matched = OBD_ERRORS[0];
                    if (matched) {
                        result.hiddenDefect = {
                            code: matched.code,
                            system: matched.system,
                            text: defect.name + ': ' + defect.desc,
                            cost: defect.cost,
                            severity: defect.severity,
                            rpm: matched.rpm || 850,
                            temp: matched.temp || 90,
                            boost: matched.boost || 0
                        };
                    }
                }
            }
        });

        if (typeof LEGAL_DEFECTS !== 'undefined' && Array.isArray(LEGAL_DEFECTS)) {
            let legalChance = 0.20;
            if (seller && seller.id === 'criminal') legalChance = 0.65;
            if (seller && seller.id === 'honest_grandpa') legalChance = 0.05;
            if (isBeaterProject) legalChance += 0.10;

            if (Math.random() < legalChance) {
                const legalPool = LEGAL_DEFECTS.filter(d => Math.random() < d.probability * 3);
                if (legalPool.length > 0) {
                    result.legalDefect = legalPool[Math.floor(Math.random() * legalPool.length)];
                }
            }
        }
    } catch (e) {
        console.error('[Market] Ошибка в generateCarDefects:', e);
    }

    return result;
}

// ========================================================
// ГЛАВНЫЙ ГЕНЕРАТОР ЛОТОВ ВИТРИНЫ
// ========================================================
async function populateMarketFeed() {
    console.log('[Market] populateMarketFeed → START');

    _ensureBrandReputation();
    _ensureGlobalEvent();

    const isDev = (typeof window.isPcDevMode === 'function') ? window.isPcDevMode() : false;
    if (isDev) console.log('[Market] DEV-режим: генерация локальная, без Firestore');

    if (!isDev) {
        try {
            if (window.FB_Bridge && window.FB_Bridge.CarsCatalog) {
                await window.FB_Bridge.CarsCatalog.fetchCloudCars();
            }
        } catch (e) {
            console.warn("[Market] Ошибка Cloud Cars (не критично):", e);
        }
    }

    if (typeof CAR_DATABASE === 'undefined' || !CAR_DATABASE || typeof CAR_DATABASE !== 'object') {
        console.error('[Market] ❌ CAR_DATABASE не загружен!');
        return;
    }

    const totalCars = Object.keys(CAR_DATABASE).reduce((sum, k) => sum + (Array.isArray(CAR_DATABASE[k]) ? CAR_DATABASE[k].length : 0), 0);
    if (totalCars === 0) {
        console.error('[Market] ❌ CAR_DATABASE пустой');
        return;
    }

    let cat = state.activeCategory ? state.activeCategory : 'economy';
    let pool = [];

    try {
        if (cat === 'all') {
            const allowedCategories = getUnlockedCategoriesForMarket();
            allowedCategories.forEach(cKey => {
                if (CAR_DATABASE[cKey] && Array.isArray(CAR_DATABASE[cKey])) pool.push(...CAR_DATABASE[cKey]);
            });
        } else {
            pool = (CAR_DATABASE[cat] && CAR_DATABASE[cat].length > 0) ? CAR_DATABASE[cat] : (CAR_DATABASE.economy || []);
        }
        if (!pool || pool.length === 0) {
            pool = CAR_DATABASE.economy || [];
        }
    } catch (e) {
        console.error('[Market] Ошибка выбора пула:', e);
        pool = CAR_DATABASE.economy || [];
    }

    let shuffledPool = [...pool];
    for (let i = shuffledPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
    }

    state.marketFeed = [];
    state.marketFeedVersion = (state.marketFeedVersion || 0) + 1;

    // Интеграция P2P-лотов игроков
    try {
        if (state.p2pMarketListings && state.p2pMarketListings.length > 0) {
            state.p2pMarketListings.forEach(p2pLot => {
                if (p2pLot.type === 'car' || p2pLot.type === 'cars') {
                    let p2pCarData = p2pLot.itemData || {};
                    let carType = p2pCarData.type || 'economy';
                    if (cat === 'all' || cat === carType) {
                        const p2pGeo = generateCarGeoData();
                        state.marketFeed.push({
                            id: p2pLot.id || ("p2p_feed_" + Date.now()),
                            isP2PUserListing: true,
                            sellerPlayerName: p2pLot.sellerName || "Игрок P2P",
                            sellerNickEffectClass: p2pLot.sellerNickEffect || "nick-fx-lightning",
                            name: p2pLot.name,
                            power: p2pCarData.power || 100,
                            type: carType,
                            drivetrain: p2pCarData.drivetrain || 'rwd',
                            basePrice: p2pLot.price,
                            purchaseCost: p2pLot.price,
                            mileage: p2pCarData.mileage || 65000,
                            price: p2pLot.price,
                            originalAskingPrice: p2pLot.price,
                            baseMarketValue: p2pLot.price,
                            marketValue: Math.round(p2pLot.price * 1.05),
                            img: p2pCarData.img || "assets/cars/economy/2101/vaz-2101.jpg",
                            images: Array.isArray(p2pCarData.images) && p2pCarData.images.length > 0 ? [...p2pCarData.images] : (p2pCarData.img ? [p2pCarData.img] : []),
                            fallback: getCategoryFallback(carType),
                            plate: p2pCarData.plate || "О777ОО 77",
                            isStolen: false, isMuseumStock: false, isTunedSpec: true, isBeaterProject: false,
                            autotekaChecked: true,
                            cooldownUntil: 0,
                            hagglePatience: 4, maxHagglePatience: 4,
                            sellerArchetype: "calm",
                            dealType: "p2p",
                            unavailable: false,
                            sellerNote: `«Автомобиль выставлен игроком ${p2pLot.sellerName || 'на P2P бирже'}.»`,
                            sellerMoodIcon: "💼",
                            condition: p2pCarData.condition || 85,
                            tuning: p2pCarData.tuning || { chip: 1, weldedDiff: false, steeringAngle: false, risk1251: 0 },
                            wear: p2pCarData.wear || { engine: 85, transmission: 85 },
                            bodyThickness: p2pCarData.bodyThickness || { hood: 110, roof: 100, doors: 115, wings: 110 },
                            districtId: p2pGeo.districtId, districtName: p2pGeo.districtName,
                            address: p2pGeo.address, mapX: p2pGeo.mapX, mapY: p2pGeo.mapY,
                            mechanicalDefects: [], legalDefect: null, inspectionStatus: {}
                        });
                    }
                }
            });
        }
    } catch (e) {
        console.warn('[Market] Ошибка P2P лотов:', e);
    }

    const feedCount = Math.min(12, Math.max(8, shuffledPool.length));

    let newsEvents = [];
    try {
        if (typeof MARKET_NEWS_EVENTS !== 'undefined' && Array.isArray(MARKET_NEWS_EVENTS)) {
            newsEvents = MARKET_NEWS_EVENTS;
        }
    } catch (e) {}

    let generatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < feedCount; i++) {
        try {
            const template = shuffledPool[i % shuffledPool.length];
            if (!template) continue;

            let archetypeRoll = Math.random();
            let dealType = 'normal';
            let priceMultiplier = 0.97;
            let isMuseumStock = false, isTunedSpec = false, isBeaterProject = false, isUrgentDeal = false;

            const hasAutopodbor = (state.businesses || []).some(b => b.id === 'autopodbor' && b.level > 0);
            const econConfig = window.MARKET_ECONOMY_CONFIG || { urgentSaleChance: 0.08, hiddenDefectChance: 0.28 };
            let urgentThreshold = hasAutopodbor ? 0.22 : (econConfig.urgentSaleChance || 0.08);

            if (Math.random() < urgentThreshold) {
                dealType = 'urgent'; isUrgentDeal = true;
                priceMultiplier = 0.68 + Math.random() * 0.07;
            } else if (archetypeRoll < 0.14) {
                isMuseumStock = true; dealType = 'museum';
                priceMultiplier = 0.95 + Math.random() * 0.10;
            } else if (archetypeRoll < 0.30) {
                isTunedSpec = true; dealType = 'tuned_drift';
                priceMultiplier = 1.05 + Math.random() * 0.15;
            } else if (archetypeRoll < 0.52) {
                isBeaterProject = true; dealType = 'beater_project';
                priceMultiplier = 0.42 + Math.random() * 0.13;
            } else {
                dealType = 'normal';
                priceMultiplier = 0.92 + Math.random() * 0.10;
            }

            let sellerPool = SELLER_ARCHETYPES;
            if (isMuseumStock) sellerPool = SELLER_ARCHETYPES.filter(s => s.id === 'collector' || s.id === 'honest_grandpa');
            else if (isBeaterProject) sellerPool = SELLER_ARCHETYPES.filter(s => s.id === 'panicker' || s.id === 'criminal' || s.id === 'cunning_perekup');
            else if (isTunedSpec) sellerPool = SELLER_ARCHETYPES.filter(s => s.id === 'blogger' || s.id === 'cunning_perekup');
            if (sellerPool.length === 0) sellerPool = SELLER_ARCHETYPES;
            const seller = sellerPool[Math.floor(Math.random() * sellerPool.length)];
            priceMultiplier *= seller.priceMultiplier;

            let baseP = template.basePrice ? template.basePrice : 100000;
            let tType = template.type ? template.type : cat;

            // Репутация бренда + сезонный ивент
            const brandReputation = getBrandReputation(template.name);
            const seasonMult = getSeasonMultiplier(tType);

            let newsMod = 1;
            newsEvents.forEach(ev => {
                if (ev.cat === tType || ev.cat === 'all') newsMod *= ev.mod;
            });

            baseP = Math.round(baseP * newsMod * brandReputation * seasonMult);

            const dynPrice = getDynamicPrice(baseP, tType);
            const baseVal = Math.round(dynPrice * 0.95);
            const isCoolNumber = Math.random() < 0.15;
            let genPlate = isCoolNumber ? generateCoolPlate() : generateNormalPlate();
            let sellerPrice = Math.round(dynPrice * priceMultiplier);

            let rawImg = "";
            let carGallery = [];
            if (Array.isArray(template.images) && template.images.length > 0) {
                const randImgIdx = Math.floor(Math.random() * template.images.length);
                rawImg = template.images[randImgIdx];
                carGallery = [...template.images];
            } else {
                rawImg = template.img || "assets/cars/economy/2101/vaz-2101.jpg";
                carGallery = [rawImg];
            }
            let cFallback = template.fallback || getCategoryFallback(tType);

            let cCond = isMuseumStock ? Math.floor(92 + Math.random() * 8) : (isBeaterProject ? Math.floor(35 + Math.random() * 20) : Math.floor(65 + Math.random() * 25));
            let isThickDoors = isBeaterProject ? 380 : (isMuseumStock ? 105 : (Math.random() > 0.4 ? 240 : 115));
            let isThickHood  = isBeaterProject ? 340 : (isMuseumStock ? 110 : (Math.random() > 0.5 ? 260 : 110));
            let engWear   = isMuseumStock ? 95 : (isBeaterProject ? Math.floor(25 + Math.random() * 25) : Math.floor(70 + Math.random() * 25));
            let transWear = isMuseumStock ? 95 : (isBeaterProject ? Math.floor(30 + Math.random() * 25) : Math.floor(75 + Math.random() * 20));
            let mileageVal = isMuseumStock ? Math.floor(18000 + Math.random() * 25000) : (isBeaterProject ? Math.floor(180000 + Math.random() * 70000) : Math.floor(65000 + Math.random() * 60000));

            const firstNames = ["Игорь", "Сергей", "Владимир", "Алексей", "Дмитрий", "Андрей", "Михаил", "Максим"];
            const lastNames  = ["Петров", "Кузнецов", "Смирнов", "Морозов", "Васильев", "Новиков", "Фёдоров"];
            const ownerAvatars = ["🧔", "👨‍💼", "👴", "🧑‍🦱", "👨‍🔧", "🧢", "🤵"];
            const ownerName = `${lastNames[Math.floor(Math.random() * lastNames.length)]} ${firstNames[Math.floor(Math.random() * firstNames.length)]}.`;
            const ownerAvatar = ownerAvatars[Math.floor(Math.random() * ownerAvatars.length)];

            let maxPatience = seller.patience || (isTunedSpec ? 3 : (isBeaterProject ? 6 : 4));
            const carGeo = generateCarGeoData();
            const carId = "m_" + Date.now() + "_" + i;

            let carTuning = {
                chip: 0, exhaust: false, stance: false, bodykit: false,
                rollCage: false, dragSlicks: false, hydroHandbrake: false,
                weldedDiff: false, steeringAngle: false, bucketSeats: false,
                customWheels: false, risk1251: 0
            };
            if (isTunedSpec) {
                carTuning.chip = Math.random() < 0.6 ? 2 : 1;
                carTuning.exhaust = true;
                carTuning.weldedDiff = template.drivetrain === 'rwd';
                carTuning.steeringAngle = template.drivetrain === 'rwd';
                carTuning.hydroHandbrake = true;
                carTuning.customWheels = true;
                carTuning.risk1251 = 35;
            }

            const carForDefects = { condition: cCond, type: tType };
            const defectsResult = generateCarDefects(carForDefects, seller, isBeaterProject);

            let cName = template.name ? template.name : "Техника";
            let cPower = template.power ? template.power : 100;

            let isBlackMarketCandidate = false;
            if (defectsResult.legalDefect) {
                isBlackMarketCandidate = true;
            } else if (isBeaterProject && Math.random() < 0.35) {
                isBlackMarketCandidate = true;
            }

            const isRolledOdo = seller.id === 'pensioner' || (isBeaterProject && Math.random() < 0.45);
            const isRepaintedCar = isBeaterProject || isThickDoors > 180 || isThickHood > 180;

            const lotObject = {
                id: carId, name: cName, power: cPower, type: tType,
                drivetrain: template.drivetrain || 'rwd',
                basePrice: baseP, mileage: mileageVal, price: sellerPrice,
                originalAskingPrice: sellerPrice,
                baseMarketValue: baseVal,
                marketValue: baseVal, // пересчитается ниже
                img: rawImg, images: carGallery, fallback: cFallback,
                plate: genPlate,
                isStolen: Math.random() < (isBeaterProject ? 0.16 : (isUrgentDeal ? 0.08 : 0.03)),
                isMuseumStock, isTunedSpec, isBeaterProject, isUrgentDeal,
                isBlackMarketCandidate,
                sellerArchetype: seller.id,
                sellerNote: seller.desc, sellerMoodIcon: seller.avatar,
                hagglePatience: maxPatience, maxHagglePatience: maxPatience,
                dealType, unavailable: false,
                hiddenDefect: defectsResult.hiddenDefect,
                mechanicalDefects: defectsResult.mechanicalDefects,
                legalDefect: defectsResult.legalDefect,
                inspectionStatus: defectsResult.inspectionStatus,
                condition: cCond, insurance: null, tuning: carTuning,
                wear: { engine: engWear, transmission: transWear },
                bodyThickness: { hood: isThickHood, roof: 100, doors: isThickDoors, wings: 110 },
                rolledOdometer: isRolledOdo,
                autotekaMileageDiscrepancy: isRolledOdo,
                hasAdditive: isBeaterProject && Math.random() < 0.35,
                isRepainted: isRepaintedCar,
                isPolished: isMuseumStock,
                isPersonal: false, isRegisteredOnPlayer: true,
                ownershipDays: 0, engineTemp: 90,
                tireWear: isBeaterProject ? 40 : 90,
                viewed: false,
                districtId: carGeo.districtId, districtName: carGeo.districtName,
                address: carGeo.address, mapX: carGeo.mapX, mapY: carGeo.mapY,
                ptsData: {
                    ownerName, ownerAvatar,
                    ownersCount: isMuseumStock ? 1 : (isBeaterProject ? 5 : 2),
                    ownershipYears: isMuseumStock ? 8 : 2,
                    vin: "XTA" + Math.floor(10000000000000 + Math.random() * 90000000000000),
                    ptsType: isBeaterProject ? "Дубликат ПТС ⚠️" : "Электронный (ЭПТС) ✓",
                    pledgeBank: "Залогов нет ✓",
                    fsspRestrictions: "Ограничений нет ✓",
                    taxiCheck: "В такси не использовалась ✓"
                }
            };

            if (defectsResult.legalDefect) {
                const ld = defectsResult.legalDefect;
                if (ld.id === 'legal_pledge') lotObject.ptsData.pledgeBank = "В залоге у банка ❌";
                if (ld.id === 'legal_fssp') lotObject.ptsData.fsspRestrictions = "Запрет ФССП ❌";
                if (ld.id === 'legal_arrest') lotObject.ptsData.fsspRestrictions = "Арест приставов ❌";
                if (ld.id === 'legal_taxi_former') lotObject.ptsData.taxiCheck = "Работала в такси ⚠️";
                if (ld.id === 'legal_pts_duplicate') lotObject.ptsData.ptsType = "Дубликат ПТС ⚠️";
            }

            if (typeof window.ensureCarIdentity === 'function') window.ensureCarIdentity(lotObject);

            // Синхронизируем честную рыночную оценку с функцией гаража
            if (typeof recalculateCarMarketValue === 'function') {
                lotObject.marketValue = recalculateCarMarketValue(lotObject);
            }

            state.marketFeed.push(lotObject);
            generatedCount++;

        } catch (lotError) {
            errorCount++;
            console.error('[Market] Ошибка генерации лота #' + i + ':', lotError);
        }
    }

    console.log('[Market] populateMarketFeed → generated ' + generatedCount + ' lots, errors: ' + errorCount);

    try {
        if (typeof sortCurrentMarketFeed === 'function') sortCurrentMarketFeed();
    } catch (e) {}

    try {
        if (typeof saveState === 'function') saveState();
    } catch (e) {}

    try {
        if (typeof renderMarketFeed === 'function') renderMarketFeed();
    } catch (e) {}

    console.log('[Market] populateMarketFeed → END');
}

// ========================================================
// ЭКСПОРТ
// ========================================================
Object.assign(window, {
    CATEGORY_META,
    MARKET_DISTRICTS,
    SELLER_ARCHETYPES,
    BRAND_BASE_REPUTATION,
    SEASONAL_EVENTS,
    generateCarGeoData,
    getCategoryFallback,
    generateNormalPlate,
    generateCoolPlate,
    evaluatePlate,
    refreshPlateCatalog,
    formatCarBrandBadgeHtml,
    getDynamicPrice,
    getUnlockedCategoriesForMarket,
    generateCarDefects,
    populateMarketFeed,
    _detectBrand,
    getBrandReputation,
    updateBrandReputationAfterSale,
    getSeasonMultiplier,
    _ensureBrandReputation,
    _ensureGlobalEvent
});

console.log('[🏪 market-generator v2.4.0] Синхронизация реальной оценки рынка + фикс ЛКП и Автотеки ✓');

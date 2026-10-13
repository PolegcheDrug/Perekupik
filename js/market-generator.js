// ========================================================
// js/market-generator.js — ГЕНЕРАТОР ЛОТОВ, ЦЕН И ГОСНОМЕРОВ
// ========================================================

const PLATE_LETTERS = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];
const REGIONS = ['77', '99', '97', '177', '199', '777', '799', '50', '90', '150', '190', '750'];

const CATEGORY_META = {
    all: { name: "ВСЕ КАТЕГОРИИ", title: "Общий рынок техники", capital: "от 25 000 ₽", desc: "Все доступные по вашему уровню классы транспорта с возможностью сортировки по цене." },
    economy: { name: "ЭКОНОМ", title: "Сегмент Эконом", capital: "от 40 000 ₽", desc: "Быстрый оборот, легкий торг и моментальная ликвидность." },
    scooter: { name: "СКУТЕРЫ", title: "Городские Скутеры", capital: "от 25 000 ₽", desc: "Дешёвый вход, быстрые сделки и сезонный спрос молодёжи." },
    moto: { name: "МОТО", title: "Спортбайки & Классика", capital: "от 120 000 ₽", desc: "Высокая сезонная маржа, проверка геометрии рамы и вилки." },
    atv: { name: "КВАДРО", title: "Квадроциклы 4x4", capital: "от 180 000 ₽", desc: "Техника для бездорожья. Частые скрытые дефекты ходовой." },
    comfort: { name: "КОМФОРТ", title: "Сегмент Комфорт", capital: "от 450 000 ₽", desc: "Седаны и кроссоверы (с 10 ур.). Идеально под выкуп для семей и таксопарков." },
    premium: { name: "ПРЕМИУМ", title: "Премиум & Люкс", capital: "от 1 200 000 ₽", desc: "Высокая чистая прибыль с одной сделки, статус и требовательные клиенты." },
    hyper: { name: "ГИПЕРКАРЫ", title: "Спорт & Экзотика", capital: "от 5 000 000 ₽", desc: "Огромная маржа, эксклюзивные клиенты и дорогие комплектующие." },
    truck: { name: "ГРУЗОВИКИ", title: "Коммерческий транспорт", capital: "от 2 500 000 ₽", desc: "Тягачи и фургоны для крупных заказов ПодКлюч." },
    yacht: { name: "ЯХТЫ", title: "Морской сегмент", capital: "от 15 000 000 ₽", desc: "Элитная морская техника для настоящих автомобильных олигархов." }
};

function getCategoryFallback(type) {
    if (typeof CAR_FALLBACKS_BY_CATEGORY !== 'undefined' && CAR_FALLBACKS_BY_CATEGORY[type]) {
        return CAR_FALLBACKS_BY_CATEGORY[type];
    }
    return "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80";
}

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
function generateCoolPlate() { return getUniquePlate(true); }

function evaluatePlate(plateStr) {
    if (typeof calculatePlateValue === 'function') {
        return calculatePlateValue(plateStr);
    }
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

function formatCarBrandBadgeHtml(carName) {
    if (!carName) return "<span>Авто</span>";

    const brands = [
        { brand: "ВАЗ", badgeClass: "brand-vaz" },
        { brand: "Lada", badgeClass: "brand-vaz" },
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
    let price = 100000;
    if (basePrice) price = basePrice;
    return Math.floor(price * mod * globalMod);
}

function getMarketRefreshCost() {
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    return 250 + (lvl * 450);
}

async function populateMarketFeed() {
    if (window.FB_Bridge && window.FB_Bridge.CarsCatalog) {
        try {
            await window.FB_Bridge.CarsCatalog.fetchCloudCars();
        } catch (e) {
            console.warn("[Market] Ошибка связи с Cloud Cars:", e);
        }
    }

    if (typeof CAR_DATABASE === 'undefined' || !CAR_DATABASE) return;
    
    let cat = state.activeCategory ? state.activeCategory : 'economy';
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    let pool = [];

    const hasAutopodbor = (state.businesses || []).some(b => b.id === 'autopodbor' && b.level > 0);
    const econConfig = window.MARKET_ECONOMY_CONFIG || { urgentSaleChance: 0.08, hiddenDefectChance: 0.28 };

    if (cat === 'all') {
        let allowedCategories = ['economy', 'scooter'];
        if (lvl >= 4) allowedCategories.push('moto');
        if (lvl >= 7) allowedCategories.push('atv');
        if (lvl >= 10) allowedCategories.push('comfort');
        if (lvl >= 25) allowedCategories.push('premium');
        if (lvl >= 45) allowedCategories.push('hyper', 'truck');
        if (lvl >= 85) allowedCategories.push('yacht');

        allowedCategories.forEach(cKey => {
            if (CAR_DATABASE[cKey] && Array.isArray(CAR_DATABASE[cKey])) {
                pool.push(...CAR_DATABASE[cKey]);
            }
        });
    } else {
        pool = (CAR_DATABASE[cat] && CAR_DATABASE[cat].length > 0) ? CAR_DATABASE[cat] : (CAR_DATABASE.economy || []);
    }

    if (!pool || pool.length === 0) {
        pool = CAR_DATABASE.economy || [];
    }

    let shuffledPool = [...pool];
    for (let i = shuffledPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
    }

    state.marketFeed = [];

    // Интеграция P2P лотов
    if (state.p2pMarketListings && state.p2pMarketListings.length > 0) {
        state.p2pMarketListings.forEach(p2pLot => {
            if (p2pLot.type === 'car' || p2pLot.type === 'cars') {
                let p2pCarData = p2pLot.itemData || {};
                let carType = p2pCarData.type || 'economy';
                
                if (cat === 'all' || cat === carType) {
                    state.marketFeed.push({
                        id: p2pLot.id || ("p2p_feed_" + Date.now()),
                        isP2PUserListing: true,
                        sellerPlayerName: p2pLot.sellerName || "Игрок P2P",
                        sellerNickEffectClass: p2pLot.sellerNickEffect || (state.player?.nickEffect ? `nick-fx-${state.player.nickEffect}` : "nick-fx-lightning"),
                        name: p2pLot.name,
                        power: p2pCarData.power || 100,
                        type: carType,
                        drivetrain: p2pCarData.drivetrain || 'rwd',
                        basePrice: p2pLot.price,
                        mileage: p2pCarData.mileage || 65000,
                        price: p2pLot.price,
                        originalAskingPrice: p2pLot.price,
                        baseMarketValue: p2pLot.price,
                        marketValue: Math.round(p2pLot.price * 1.15),
                        img: p2pCarData.img || "assets/cars/economy/2101/vaz-2101.jpg",
                        fallback: getCategoryFallback(carType),
                        plate: p2pCarData.plate || "О777ОО 77",
                        isStolen: false,
                        isMuseumStock: false,
                        isTunedSpec: true,
                        isBeaterProject: false,
                        autotekaChecked: true,
                        inspectedAtHood: false,
                        cooldownUntil: 0,
                        stoChecked: false,
                        gaugeChecked: false,
                        testDriven: false,
                        haggled: false,
                        hagglePatience: 4,
                        maxHagglePatience: 4,
                        sellerPersonality: "calm",
                        dealType: "p2p",
                        unavailable: false,
                        sellerNote: `«Автомобиль выставлен реальным перекупом ${p2pLot.sellerName || 'на P2P бирже'}. Состояние соответствует описанию.»`,
                        sellerMoodIcon: "💼",
                        condition: p2pCarData.condition || 85,
                        tuning: p2pCarData.tuning || { chip: 1, weldedDiff: false, steeringAngle: false, risk1251: 0 },
                        wear: p2pCarData.wear || { engine: 85, transmission: 85 },
                        bodyThickness: p2pCarData.bodyThickness || { hood: 110, roof: 100, doors: 115, wings: 110 }
                    });
                }
            }
        });
    }

    const feedCount = Math.min(10, Math.max(6, shuffledPool.length));

    for (let i = 0; i < feedCount; i++) {
        const template = shuffledPool[i % shuffledPool.length];
        if (!template) continue;

        let archetypeRoll = Math.random();
        let dealType = 'normal';
        let priceMultiplier = 0.82;

        let isMuseumStock = false;
        let isTunedSpec = false;
        let isBeaterProject = false;
        let isUrgentDeal = false;

        let urgentThreshold = hasAutopodbor ? 0.22 : (econConfig.urgentSaleChance || 0.08);

        if (Math.random() < urgentThreshold) {
            dealType = 'urgent';
            isUrgentDeal = true;
            priceMultiplier = 0.62 + Math.random() * 0.06;
        } else if (archetypeRoll < 0.14) {
            isMuseumStock = true;
            dealType = 'museum';
            priceMultiplier = 0.88 + Math.random() * 0.07;
        } else if (archetypeRoll < 0.30) {
            isTunedSpec = true;
            dealType = 'tuned_drift';
            priceMultiplier = 1.10 + Math.random() * 0.15;
        } else if (archetypeRoll < 0.52) {
            isBeaterProject = true;
            dealType = 'beater_project';
            priceMultiplier = 0.44 + Math.random() * 0.11;
        } else {
            dealType = 'normal';
            priceMultiplier = 0.78 + Math.random() * 0.10;
        }

        let defectChance = isBeaterProject ? 0.85 : (isMuseumStock ? 0.0 : (isUrgentDeal ? 0.45 : (econConfig.hiddenDefectChance || 0.28)));
        let hasHiddenDefect = (Math.random() < defectChance) && (typeof OBD_ERRORS !== 'undefined' && OBD_ERRORS.length > 0);

        let defectObj = null;
        if (hasHiddenDefect) {
            const errItem = OBD_ERRORS[Math.floor(Math.random() * OBD_ERRORS.length)];
            defectObj = { 
                code: errItem.code || "P0300",
                system: errItem.system || "ДВС",
                text: errItem.text, 
                cost: errItem.cost,
                severity: errItem.severity || "Средняя",
                rpm: errItem.rpm || 850,
                temp: errItem.temp || 92,
                boost: errItem.boost || 0.0
            };
        }

        let isStolen = Math.random() < (isBeaterProject ? 0.16 : (isUrgentDeal ? 0.08 : 0.03));
        const carId = "m_" + Date.now() + "_" + i;
        
        let isCoolNumber = Math.random() < 0.15;
        let genPlate = isCoolNumber ? generateCoolPlate() : generateNormalPlate();

        let baseP = template.basePrice ? template.basePrice : 100000;
        let tType = template.type ? template.type : cat;
        const dynPrice = getDynamicPrice(baseP, tType);

        const baseVal = Math.round(dynPrice * 1.15);
        const plateVal = evaluatePlate(genPlate);
        let sellerPrice = Math.round(dynPrice * priceMultiplier);

        let sNote = "«Машина на отличном ходу, любые проверки у капота.»";
        let sMoodIcon = "🚗";

        if (isMuseumStock) {
            sNote = "«Один хозяин с завода! Хранилась в тёплом сухом гараже, ни грамма шпаклёвки.»";
            sMoodIcon = "🏆";
        } else if (isTunedSpec) {
            sNote = "«Боевой проект! Спек под дрифт собран с душой: выворот, прямоток, отсечка. Газ в пол и полетели!»";
            sMoodIcon = "🔥";
        } else if (isBeaterProject) {
            sNote = "«Кузов требует внимания и сварки. Отдам за копейки с торгом под проект или разбор!»";
            sMoodIcon = "🛠️";
        } else if (isUrgentDeal) {
            sNote = "«Срочно нужны деньги на закрытие долга, отдам с хорошим дисконтом первому, кто приедет с кэшем!»";
            sMoodIcon = "⚡";
        }

        let cName = template.name ? template.name : "Техника";
        let cPower = template.power ? template.power : 100;
        
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
            cPower = Math.round(cPower * (carTuning.chip === 2 ? 1.35 : 1.18));
        }

        let rawImg = (Array.isArray(template.images) && template.images.length > 0)
            ? template.images[0]
            : (template.img || "assets/cars/economy/2101/vaz-2101.jpg");
            
        let cFallback = template.fallback || getCategoryFallback(tType);

        let cCond = isMuseumStock 
            ? Math.floor(92 + Math.random() * 8)
            : (isBeaterProject ? Math.floor(35 + Math.random() * 20) : Math.floor(65 + Math.random() * 25));

        let isThickDoors = isBeaterProject ? 380 : (isMuseumStock ? 105 : (Math.random() > 0.4 ? 240 : 115));
        let isThickHood = isBeaterProject ? 340 : (isMuseumStock ? 110 : (Math.random() > 0.5 ? 260 : 110));

        let engWear = isMuseumStock ? 95 : (isBeaterProject ? Math.floor(25 + Math.random() * 25) : Math.floor(70 + Math.random() * 25));
        let transWear = isMuseumStock ? 95 : (isBeaterProject ? Math.floor(30 + Math.random() * 25) : Math.floor(75 + Math.random() * 20));

        let mileageVal = isMuseumStock 
            ? Math.floor(18000 + Math.random() * 25000) 
            : (isBeaterProject ? Math.floor(180000 + Math.random() * 70000) : Math.floor(65000 + Math.random() * 60000));

        const firstNames = ["Игорь", "Сергей", "Владимир", "Алексей", "Дмитрий", "Андрей", "Михаил", "Максим"];
        const lastNames = ["Петров", "Кузнецов", "Смирнов", "Морозов", "Васильев", "Новиков", "Фёдоров"];
        const ownerAvatars = ["🧔", "👨‍💼", "👴", "🧑‍🦱", "👨‍🔧", "🧢", "🤵"];
        const ownerName = `${lastNames[Math.floor(Math.random() * lastNames.length)]} ${firstNames[Math.floor(Math.random() * firstNames.length)]}.`;
        const ownerAvatar = ownerAvatars[Math.floor(Math.random() * ownerAvatars.length)];

        let maxPatience = isTunedSpec ? 3 : (isBeaterProject ? 6 : (isMuseumStock ? 2 : 4));

        state.marketFeed.push({
            id: carId,
            name: cName,
            power: cPower,
            type: tType,
            drivetrain: template.drivetrain || 'rwd',
            basePrice: baseP,
            mileage: mileageVal,
            price: sellerPrice,
            originalAskingPrice: sellerPrice,
            baseMarketValue: baseVal,
            marketValue: baseVal + plateVal,
            img: rawImg,
            fallback: cFallback,
            plate: genPlate,
            isStolen: isStolen,
            isMuseumStock: isMuseumStock,
            isTunedSpec: isTunedSpec,
            isBeaterProject: isBeaterProject,
            autotekaChecked: false,
            inspectedAtHood: false,
            cooldownUntil: 0,
            stoChecked: false,
            gaugeChecked: false,
            testDriven: false,
            haggled: false,
            hagglePatience: maxPatience,
            maxHagglePatience: maxPatience,
            sellerPersonality: isTunedSpec ? "aggressive" : (isBeaterProject ? "hurried" : "calm"),
            dealType: dealType,
            unavailable: false,
            hiddenDefect: defectObj,
            sellerNote: sNote,
            sellerMoodIcon: sMoodIcon,
            condition: cCond,
            insurance: null,
            tuning: carTuning,
            wear: { engine: engWear, transmission: transWear },
            bodyThickness: { hood: isThickHood, roof: 100, doors: isThickDoors, wings: 110 },
            rolledOdometer: isBeaterProject && Math.random() < 0.45,
            hasAdditive: isBeaterProject && Math.random() < 0.35,
            isRepainted: isBeaterProject,
            isPolished: isMuseumStock,
            isPersonal: false,
            isRegisteredOnPlayer: true,
            ownershipDays: 0,
            engineTemp: 90,
            tireWear: isBeaterProject ? 40 : 90,
            viewed: false,
            ptsData: {
                ownerName: ownerName,
                ownerAvatar: ownerAvatar,
                ownersCount: isMuseumStock ? 1 : (isBeaterProject ? 5 : 2),
                ownershipYears: isMuseumStock ? 8 : 2,
                vin: "XTA" + Math.floor(10000000000000 + Math.random() * 90000000000000),
                ptsType: isBeaterProject ? "Дубликат ПТС ⚠️" : "Электронный (ЭПТС) ✓",
                pledgeBank: isStolen ? "В залоге у МФО ❌" : "Залогов нет ✓",
                fsspRestrictions: isStolen ? "Запрет на регдействия ФССП ❌" : "Ограничений нет ✓",
                taxiCheck: "В такси не использовалась ✓"
            }
        });
    }

    if (typeof sortCurrentMarketFeed === 'function') sortCurrentMarketFeed();
    if (typeof saveState === 'function') saveState();
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
}

Object.assign(window, {
    CATEGORY_META,
    getCategoryFallback,
    generateNormalPlate,
    generateCoolPlate,
    evaluatePlate,
    refreshPlateCatalog,
    formatCarBrandBadgeHtml,
    getDynamicPrice,
    getMarketRefreshCost,
    populateMarketFeed
});
// ========================================================
// js/market.js — АВТОРЫНОК, ЛОКАЛИЗАЦИЯ И УНИКАЛЬНЫЕ НОМЕРА (v0.5.1)
// Разработчики: Tak Toje, Max, Sergo, gemini
// Сбалансированная перекупская экономика (реальная маржа 30-50%),
// интерактивная диагностика у капота, отчёт Автотеки и обоснованный торг
// ========================================================

const PLATE_LETTERS = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];
const REGIONS = ['77', '99', '97', '177', '199', '777', '799', '50', '90', '150', '190', '750'];

function t(key) {
    let lang = state.lang || 'ru';
    if (typeof I18N_TRANSLATIONS !== 'undefined' && I18N_TRANSLATIONS[lang] && I18N_TRANSLATIONS[lang][key]) {
        return I18N_TRANSLATIONS[lang][key];
    }
    return key;
}

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

function generateNormalPlate() {
    return getUniquePlate(false);
}

function generateCoolPlate() {
    return getUniquePlate(true);
}

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

let activeInspectCarId = null;
let pendingMarketCar = null;
let activePendingDKPDeal = null;

function getDynamicPrice(basePrice, type) {
    if (!state.marketModifiers) state.marketModifiers = { economy: 1, comfort: 1, premium: 1, all: 1 };
    let mod = 1;
    if (state.marketModifiers && state.marketModifiers[type]) mod = state.marketModifiers[type];
    let globalMod = 1;
    if (state.marketModifiers && state.marketModifiers.all) globalMod = state.marketModifiers.all;
    let price = 100000;
    if (basePrice) price = basePrice;
    return Math.floor(price * mod * globalMod);
}

function getMarketRefreshCost() {
    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;
    return 150 + (lvl * 350);
}

const CATEGORY_META = {
    economy: { name: "ЭКОНОМ", title: "Сегмент Эконом", capital: "от 40 000 ₽", desc: "Быстрый оборот, легкий торг и моментальная ликвидность." },
    scooter: { name: "СКУТЕРЫ", title: "Городские Скутеры", capital: "от 25 000 ₽", desc: "Дешёвый вход, быстрые сделки и сезонный спрос молодёжи." },
    moto: { name: "МОТО", title: "Спортбайки & Классика", capital: "от 120 000 ₽", desc: "Высокая сезонная маржа, проверка геометрии рамы и вилки." },
    atv: { name: "КВАДРО", title: "Квадроциклы 4x4", capital: "от 180 000 ₽", desc: "Техника для бездорожья. Частые скрытые дефекты ходовой." },
    comfort: { name: "КОМФОРТ", title: "Сегмент Комфорт", capital: "от 450 000 ₽", desc: "Седаны и кроссоверы. Идеально под выкуп для семей и таксопарков." },
    premium: { name: "ПРЕМИУМ", title: "Премиум & Люкс", capital: "от 1 200 000 ₽", desc: "Высокая чистая прибыль с одной сделки, статус и требовательные клиенты." },
    hyper: { name: "ГИПЕРКАРЫ", title: "Спорт & Экзотика", capital: "от 5 000 000 ₽", desc: "Огромная маржа, эксклюзивные клиенты и дорогие комплектующие." },
    truck: { name: "ГРУЗОВИКИ", title: "Коммерческий транспорт", capital: "от 2 500 000 ₽", desc: "Тягачи и фургоны для крупных заказов Синдиката под ключ." },
    yacht: { name: "ЯХТЫ", title: "Морской сегмент", capital: "от 15 000 000 ₽", desc: "Элитная морская техника для настоящих автомобильных олигархов." }
};

function toggleMarketCategories() {
    const grid = document.getElementById('marketCatListContainer');
    const btnIcon = document.querySelector('#btnToggleMarketGrid i');
    if (!grid) return;
    grid.classList.toggle('collapsed');
    if (btnIcon) {
        btnIcon.className = grid.classList.contains('collapsed') ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-up";
    }
}

function setCategory(cat) {
    let lvl = state.player?.level ? state.player.level : 1;
    
    if (cat === 'moto' && lvl < 5) return showToast("🔒 Мотоциклы доступны с 5 уровня!");
    if (cat === 'atv' && lvl < 8) return showToast("🔒 Квадроциклы доступны с 8 уровня!");
    if (cat === 'comfort' && lvl < 30) return showToast("🔒 Нужен 30 ур!");
    if (cat === 'premium' && lvl < 30) return showToast("🔒 Нужен 30 ур!");
    if (cat === 'hyper' && lvl < 50) return showToast("🔒 Нужен 50 ур!");
    if (cat === 'truck' && lvl < 50) return showToast("🔒 Нужен 50 ур!");
    if (cat === 'yacht' && lvl < 100) return showToast("🔒 Нужен 100 ур!");
    
    state.activeCategory = cat;
    
    document.querySelectorAll('.cat-tile').forEach(c => c.classList.remove('active'));
    const btn = document.getElementById("catBtn-" + cat);
    if (btn) btn.classList.add('active');

    const meta = CATEGORY_META[cat] ? CATEGORY_META[cat] : CATEGORY_META.economy;
    setTxt("currentCatBadge", meta.name);
    setTxt("catInfoTitle", "<i class='fa-solid fa-chart-line'></i> " + meta.title + ":");
    setTxt("catInfoPrice", "Капитал: " + meta.capital);
    setTxt("catInfoDesc", meta.desc);

    playSound('tick');
    populateMarketFeed();
}

function refreshMarketFeedManual() {
    const cost = getMarketRefreshCost();
    let pCash = (state.player && state.player.cash) ? state.player.cash : 0;
    let pFuel = (state.player && state.player.fuel !== undefined) ? state.player.fuel : 0;

    if (pCash < cost) return showToast("Не хватает " + cost.toLocaleString() + " ₽!");
    if (pFuel < 5) return showToast("Закончился бензин ⛽! Заправьтесь на АЗС.");
    
    state.player.cash -= cost;
    state.player.fuel -= 5;
    
    const grid = document.getElementById('marketCatListContainer');
    const btnIcon = document.querySelector('#btnToggleMarketGrid i');
    if (grid && !grid.classList.contains('collapsed')) {
        grid.classList.add('collapsed');
        if (btnIcon) btnIcon.className = "fa-solid fa-chevron-down";
    }

    saveState();
    populateMarketFeed();
    renderMarketFeed();
    showToast("Лента предложений обновлена (-5 ⛽)!");
}

// ----------------------------------------------------
// ГЕНЕРАТОР ПРЕДЛОЖЕНИЙ (СБАЛАНСИРОВАННАЯ ЭКОНОМИКА)
// ----------------------------------------------------
function populateMarketFeed() {
    if (typeof CAR_DATABASE === 'undefined' || !CAR_DATABASE) return;
    
    let cat = state.activeCategory ? state.activeCategory : 'economy';
    let pool = CAR_DATABASE[cat] ? CAR_DATABASE[cat] : CAR_DATABASE.economy;
    if (!pool || pool.length === 0) return;

    let shuffledPool = [...pool];
    for (let i = shuffledPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
    }

    state.marketFeed = [];
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    const feedCount = Math.min(8, Math.max(6, shuffledPool.length));

    for (let i = 0; i < feedCount; i++) {
        const template = shuffledPool[i % shuffledPool.length];
        if (!template) continue;

        let dealRoll = Math.random();
        let dealType = 'normal';
        let priceMultiplier = 0.70;

        // ПЕРЕКУПСКАЯ ВИЛКА ЦЕН:
        // urgent: продавец сливает тачку за 50-65% от рынка
        // normal: продавец отдает за 65-78% от рынка (отличная точка входа)
        // overprice: продавец хочет почти полный рынок (90-102%), требуется торг
        if (dealRoll < 0.28) {
            dealType = 'urgent';
            priceMultiplier = 0.50 + Math.random() * 0.15;
        } else if (dealRoll < 0.80) {
            dealType = 'normal';
            priceMultiplier = 0.65 + Math.random() * 0.13;
        } else {
            dealType = 'overprice';
            priceMultiplier = 0.90 + Math.random() * 0.14;
        }

        let defectChance = 0.35;
        if (dealType === 'urgent') defectChance = 0.50;
        if (lvl <= 5) defectChance = 0.25;
        else if (lvl >= 20) defectChance = 0.45;
        if (cat === 'premium' || cat === 'hyper') defectChance -= 0.10;

        let hasHiddenDefect = false;
        if (typeof OBD_ERRORS !== 'undefined' && OBD_ERRORS.length > 0) {
            if (Math.random() < defectChance) hasHiddenDefect = true;
        }

        let isStolen = Math.random() < (dealType === 'urgent' ? 0.15 : 0.07);
        const carId = "m_" + Date.now() + "_" + i;
        
        let isCoolNumber = Math.random() < 0.10;
        let genPlate = isCoolNumber ? generateCoolPlate() : generateNormalPlate();

        let baseP = template.basePrice ? template.basePrice : 100000;
        let tType = template.type ? template.type : cat;
        const dynPrice = getDynamicPrice(baseP, tType);

        // Реальная рыночная стоимость авто (с запасом для маржи перекупа)
        const baseVal = Math.round(dynPrice * 1.15);
        const plateVal = evaluatePlate(genPlate);

        let carOnlyPrice = Math.round(dynPrice * priceMultiplier);
        let sellerPrice = carOnlyPrice;
        let isLuckyFind = false;

        // Шанс купить машину с дорогими номерами без наценки продавца («дедушка не знает цену»)
        if (plateVal > 5000) {
            if (Math.random() < 0.35) {
                isLuckyFind = true;
                sellerPrice = carOnlyPrice;
            } else {
                let plateMarkup = Math.round(plateVal * 0.40);
                sellerPrice = carOnlyPrice + plateMarkup;
            }
        }

        let defectObj = null;
        if (hasHiddenDefect && typeof OBD_ERRORS !== 'undefined') {
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

        let sNote = "Машина на бодром ходу, сел и поехал.";
        if (isLuckyFind) {
            sNote = "«Отдаю дедовский аппарат как есть, в этих ваших номерах ничего не понимаю.» (🔥 Продавец не знает цену номеров!)";
        } else if (dealType === 'overprice') {
            const overpriceNotes = [
                "«Цена окончательная, знаю рынок. Свои цены не предлагать!»",
                "«Вложено в два раза больше стоимости. Отдам только ценителю.»",
                "«Машина выходного дня, торга нет совсем.»"
            ];
            sNote = overpriceNotes[Math.floor(Math.random() * overpriceNotes.length)];
        } else if (dealType === 'urgent') {
            sNote = "«Срочно нужны деньги до вечера, отдам с хорошей скидкой первому, кто приедет!»";
        } else if (plateVal > 15000) {
            sNote = "«Продаю только вместе с красивым госномером " + genPlate + ".»";
        } else if (hasHiddenDefect) {
            const riskyPhrases = [
                "«Есть пара мелких нюансов, на езду вообще не влияет.»",
                "«Продаю как есть, перекупам просьба не беспокоить.»",
                "«Мотор шепчет, чек иногда загорается из-за бензина.»"
            ];
            sNote = riskyPhrases[Math.floor(Math.random() * riskyPhrases.length)];
        } else if (typeof SELLER_ADS_PHRASES !== 'undefined' && SELLER_ADS_PHRASES.length > 0) {
            sNote = SELLER_ADS_PHRASES[Math.floor(Math.random() * SELLER_ADS_PHRASES.length)];
        }

        let cName = template.name ? template.name : "Техника";
        let cPower = template.power ? template.power : 100;
        let cImg = template.img ? template.img : "";
        let cFallback = template.fallback || getCategoryFallback(tType);

        let cCond = hasHiddenDefect ? Math.floor(45 + Math.random() * 25) : Math.floor(75 + Math.random() * 20);
        if (cat === 'premium' || cat === 'hyper') cCond = Math.max(70, cCond);

        let isThick1 = (Math.random() > 0.55) ? Math.floor(220 + Math.random() * 300) : 110;
        let isThick2 = (Math.random() > 0.45) ? Math.floor(240 + Math.random() * 350) : 115;
        
        let engWear = hasHiddenDefect ? (40 + Math.random() * 30) : (78 + Math.random() * 18);
        let transWear = hasHiddenDefect ? (45 + Math.random() * 25) : (80 + Math.random() * 15);

        const sellerTypes = ['greedy', 'calm', 'hurried'];
        const currentSellerType = dealType === 'urgent' ? 'hurried' : (dealType === 'overprice' ? 'greedy' : sellerTypes[Math.floor(Math.random() * sellerTypes.length)]);

        const firstNames = ["Игорь", "Сергей", "Владимир", "Алексей", "Дмитрий", "Андрей", "Михаил", "Максим"];
        const lastNames = ["Петров", "Кузнецов", "Смирнов", "Морозов", "Васильев", "Новиков", "Фёдоров"];
        const ownerAvatars = ["🧔", "👨‍💼", "👴", "🧑‍🦱", "👨‍🔧", "🧢", "🤵"];
        const ownerName = `${lastNames[Math.floor(Math.random() * lastNames.length)]} ${firstNames[Math.floor(Math.random() * firstNames.length)]}.`;
        const ownerAvatar = ownerAvatars[Math.floor(Math.random() * ownerAvatars.length)];
        const ownersCount = Math.floor(Math.random() * 3) + 1;
        const ownershipYears = Math.floor(Math.random() * 4) + 1;
        const vinNumber = "XTA" + Math.floor(10000000000000 + Math.random() * 90000000000000);

        state.marketFeed.push({
            id: carId,
            name: cName,
            power: cPower,
            type: tType,
            drivetrain: template.drivetrain || 'rwd',
            basePrice: baseP,
            mileage: Math.floor(Math.random() * (tType === 'premium' ? 75000 : 160000)) + 20000,
            price: sellerPrice,
            originalAskingPrice: sellerPrice,
            baseMarketValue: baseVal,
            marketValue: baseVal + plateVal,
            img: cImg,
            fallback: cFallback,
            plate: genPlate,
            isStolen: isStolen,
            autotekaChecked: false,
            cooldownUntil: 0,
            stoChecked: false,
            gaugeChecked: false,
            haggled: false,
            hagglePatience: currentSellerType === 'greedy' ? 3 : (currentSellerType === 'hurried' ? 5 : 4),
            sellerPersonality: currentSellerType,
            dealType: dealType,
            unavailable: false,
            hiddenDefect: defectObj,
            sellerNote: sNote,
            condition: cCond,
            insurance: null,
            tuning: { 
                chip: 0, exhaust: false, stance: false, bodykit: false, 
                rollCage: false, dragSlicks: false, hydroHandbrake: false, 
                weldedDiff: false, steeringAngle: false, bucketSeats: false, 
                customWheels: false, risk1251: 0 
            },
            wear: { engine: engWear, transmission: transWear },
            bodyThickness: { hood: isThick1, roof: 100, doors: isThick2, wings: 110 },
            rolledOdometer: false,
            hasAdditive: false,
            isRepainted: false,
            isPolished: false,
            isPersonal: false,
            isRegisteredOnPlayer: true,
            ownershipDays: 0,
            engineTemp: 90,
            tireWear: 100,
            viewed: false,
            ptsData: {
                ownerName: ownerName,
                ownerAvatar: ownerAvatar,
                ownersCount: ownersCount,
                ownershipYears: ownershipYears,
                vin: vinNumber,
                ptsType: ownersCount <= 2 ? "Электронный (ЭПТС) ✓" : "Дубликат ПТС ⚠️",
                pledgeBank: isStolen ? "В залоге у МФО ❌" : "Залогов нет ✓",
                fsspRestrictions: isStolen ? "Запрет на регдействия ФССП ❌" : "Ограничений нет ✓",
                taxiCheck: ownersCount > 2 && Math.random() < 0.35 ? "Лицензия такси найдена (Жёлтый)" : "В такси не использовалась ✓"
            }
        });
    }
    saveState();
    renderMarketFeed();
}

function renderMarketFeed() {
    const container = document.getElementById('marketCardContainer');
    if (!container) return;
    
    const refreshText = document.getElementById('refreshCostText');
    if (refreshText) refreshText.innerText = getMarketRefreshCost().toLocaleString();
    
    const mainContent = document.querySelector('.main-content');
    const scrollPos = mainContent ? mainContent.scrollTop : 0;
    const now = Date.now();

    if (!state.marketFeed || state.marketFeed.length === 0) {
        container.innerHTML = `<div class='glass-card text-center py-6 sub-label'>${t('classes_title')}: нет активных лотов. Нажмите «${t('btn_refresh_market')}»!</div>`;
        return;
    }
    
    let htmlContent = "";
    
    state.marketFeed.forEach(car => {
        if (!car || car.unavailable) return;
        
        let isBusy = (car.cooldownUntil && car.cooldownUntil > now);
        let timeLeft = isBusy ? Math.ceil((car.cooldownUntil - now) / 1000) : 0;
        
        let carMileage = (typeof car.mileage === 'number') ? car.mileage.toLocaleString() : "85 000";
        let carPrice = (typeof car.price === 'number') ? car.price.toLocaleString() : "100 000";
        let carMarketVal = (typeof car.marketValue === 'number') ? car.marketValue.toLocaleString() : carPrice;
        let carType = car.type ? car.type.toUpperCase() : "CAR";
        
        let fallbackUrl = car.fallback || getCategoryFallback(car.type);
        let carImg = car.img ? car.img : fallbackUrl;
        
        let viewedBadge = car.viewed ? `<div class='viewed-badge'><i class='fa-solid fa-eye'></i> ${t('inspected')}</div>` : "";
        let busyClass = isBusy ? "busy" : "";
        let viewedClass = car.viewed ? "viewed-card" : "";
        let sellerNoteBlock = car.sellerNote ? "<div class='seller-note-card'>" + car.sellerNote + "</div>" : "";
        let autoIcon = car.autotekaChecked ? "Проверено ✓" : "5,000 ₽";

        let dealBadge = "";
        if (car.dealType === 'urgent') {
            dealBadge = "<span class='tag-badge bg-tag-green ml-1'>🔥 СРОЧНО (-35%)</span>";
        } else if (car.dealType === 'overprice') {
            dealBadge = "<span class='tag-badge bg-tag-red ml-1'>⚠️ ВЫСОКАЯ ЦЕНА</span>";
        }

        let pVal = evaluatePlate(car.plate);
        let coolPlateBadge = pVal > 15000
            ? "<span class='tag-badge bg-tag-purple ml-1'>🏷️ БЛАТНОЙ НОМЕР</span>"
            : "";

        let carName = car.name ? car.name : "Автомобиль";
        let carPower = car.power ? car.power : 100;
        let carPlate = car.plate ? car.plate : "ТРАНЗИТ";

        // Расчёт ориентировочной маржи прямо в карточке для удобства игрока
        let estimatedProfit = (car.marketValue || 0) - (car.price || 0);
        let profitBadge = estimatedProfit > 0 
            ? `<div class="sub-label text-right" style="font-size:9.5px; color:var(--green);">Потенциал: <b>+${estimatedProfit.toLocaleString()} ₽</b></div>` 
            : "";

        htmlContent += `
        <div class='glass-card mb-3 ${busyClass} ${viewedClass}' id='card_${car.id}'>
            ${viewedBadge}
            
            <div class='cooldown-timer notranslate' translate='no' style='${isBusy ? "display:flex !important;" : "display:none !important;"}'>
                <div class='timer-clock notranslate' translate='no' id='timer_num_${car.id}'>${timeLeft}с</div>
                <div class='timer-text'>${t('busy_subscriber')}</div>
                <button onclick="paidCallMarketCar('${car.id}')" class='btn btn-amber' style='width: 80%;'>${t('paid_call')} (1000 ₽)</button>
            </div>

            <div class='car-img-wrap'>
                <img src='${carImg}' class='car-img' onerror="this.onerror=null; this.src='${fallbackUrl}';">
                <div class='plate-corner'><div class='license-plate notranslate' translate='no'>${carPlate} <div class='license-flag'>RUS</div></div></div>
                <div class='badge-tag'>
                    <span class='tag-badge bg-tag-cyan'>${carType}</span>
                    ${dealBadge}
                    ${coolPlateBadge}
                </div>
            </div>

            <div class='flex-between mb-2'>
                <h4 class='font-bold text-xs color-cyan' style='font-size:14px;'>${carName}</h4>
            </div>

            <div class='car-spec-chips-row mb-2'>
                <div class='car-spec-chip'><i class='fa-solid fa-bolt color-amber'></i> <b>${carPower}</b> л.с.</div>
                <div class='car-spec-chip'><i class='fa-solid fa-road color-cyan'></i> <b>${carMileage}</b> км</div>
                <div class='car-spec-chip'><i class='fa-solid fa-shield color-green'></i> <b>${car.condition || 80}%</b> кузов</div>
            </div>

            ${sellerNoteBlock}

            <div class='price-box'>
                <div>
                    <span class='text-xs color-green font-bold'>${t('price')}:</span>
                    <div class='price-val notranslate' translate='no' id='price_txt_${car.id}'>${carPrice} ₽</div>
                </div>
                <div class='sub-label text-right'>
                    <span class='sub-label text-xs'>${t('market_estimate')}:</span>
                    <div class='font-bold color-cyan text-xs'>~${carMarketVal} ₽</div>
                    ${profitBadge}
                </div>
            </div>

            <div class='mb-2'>
                <button onclick="openAutotekaModal('${car.id}')" class='btn btn-dark btn-sm w-full'>
                    <i class='fa-solid fa-file-waveform color-green mr-1'></i> ${t('autoteka')} (${autoIcon})
                </button>
            </div>

            <button onclick="initiateBuyMarketCar('${car.id}')" class="btn btn-cyan w-full">
                <i class="fa-solid fa-phone mr-1"></i> Позвонить и назначить встречу
            </button>
        </div>`;
    });
    
    container.innerHTML = htmlContent;
    if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
}

// ----------------------------------------------------
// ДИАГНОСТИКА LAUNCH OBD2 У КАПОТА
// ----------------------------------------------------
let isOBDScanningInProgress = false;

function quickOBDScanMarketCar(carId) {
    if (isOBDScanningInProgress) return;
    const car = state.marketFeed.find(c => c && c.id === carId);
    if (!car) return;

    let hasScanner = !!(state.player && state.player.tools && (state.player.tools.obd || state.player.tools.obd_launch));

    if (!hasScanner) {
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;
        if (cash < 5000) return showToast("Нужно 5,000 ₽ на выезд автоподборщика со сканером!");
        state.player.cash -= 5000;
        showToast("Выездной диагност прибыл к автомобилю (-5,000 ₽)");
    } else {
        let toolKey = state.player?.tools?.obd_launch ? 'obd_launch' : 'obd';
        let wear = state.player?.toolsWear ? (state.player.toolsWear[toolKey] || 0) : 50;
        if (wear <= 0) {
            return showToast("⚠️ Сканер разряжен! Откалибруйте его в Маркете.");
        }
        state.player.toolsWear[toolKey] = Math.max(0, wear - 1);
    }

    car.stoChecked = true;
    isOBDScanningInProgress = true;
    saveState();

    const modal = document.getElementById("modalOBD2");
    const resBox = document.getElementById('obd2ResultBox');
    const actBox = document.getElementById('obd2ActionBox');
    setTxt('obd2CarTitle', `Диагностика CAN-шины: ${car.name}`);

    if (modal) modal.classList.add('active');
    playSound('tick');
    tgHaptic('medium');

    if (resBox) {
        resBox.innerHTML = `
            <div class="obd-cyber-display">
                <div class="flex-between text-xs mb-2">
                    <span class="color-cyan font-bold"><i class="fa-solid fa-satellite-dish"></i> ПОДКЛЮЧЕНИЕ К РАЗЪЕМУ OBD2...</span>
                    <span class="sub-label">ISO 15765-4</span>
                </div>
                <div class="obd-progress-track">
                    <div class="obd-progress-bar" id="obdScanProgressFill"></div>
                </div>
                <div class="obd-scan-matrix-screen" id="obdTerminalLines">
                    <div class="obd-terminal-line">> Чтение блоков управления ДВС, АКПП и SRS...</div>
                </div>
            </div>
        `;
    }

    if (actBox) {
        actBox.innerHTML = `<button class="btn btn-dark w-full opacity-50" disabled><i class="fa-solid fa-spinner fa-spin"></i> СКАНИРОВАНИЕ БЛОКОВ УПРАВЛЕНИЯ...</button>`;
    }

    const terminalEl = document.getElementById('obdTerminalLines');
    const progFill = document.getElementById('obdScanProgressFill');

    const scanSteps = [
        { pct: 25, msg: "> Опрос ЭБУ Двигателя (DME/ECU)... Связь 100%", type: "success" },
        { pct: 50, msg: "> Диагностика трансмиссии (EGS), соленоиды давления...", type: "" },
        { pct: 75, msg: "> Тормозная система ABS/ESP и подушки Airbag...", type: "" },
        { pct: 100, msg: "> Чтение сохранённых ошибок в памяти DTC...", type: car.hiddenDefect ? "error" : "success" }
    ];

    let currentStep = 0;
    const scanInterval = setInterval(() => {
        if (currentStep < scanSteps.length) {
            const step = scanSteps[currentStep];
            if (progFill) progFill.style.width = step.pct + "%";
            if (terminalEl) {
                terminalEl.innerHTML += `<div class="obd-terminal-line ${step.type}">${step.msg}</div>`;
                terminalEl.scrollTop = terminalEl.scrollHeight;
            }
            playSound('tick');
            currentStep++;
        } else {
            clearInterval(scanInterval);
            isOBDScanningInProgress = false;

            if (typeof trackQuestProgress === 'function') {
                trackQuestProgress('obd_scan', 1);
            }

            renderOBDFinalResults(car, resBox, actBox);
        }
    }, 500);
}

function renderOBDFinalResults(car, resBox, actBox) {
    let eng = car.wear?.engine ? Math.round(car.wear.engine) : 90;
    let trans = car.wear?.transmission ? Math.round(car.wear.transmission) : 90;

    if (car.hiddenDefect) {
        playSound('error');
        tgHaptic('error');
        let def = car.hiddenDefect;

        resBox.innerHTML = `
            <div class="obd-cyber-display" style="border-color: var(--red);">
                <div class="flex-between text-xs mb-2">
                    <span class="color-red font-bold"><i class="fa-solid fa-triangle-exclamation"></i> НАЙДЕН DTC КОД: ${def.code || 'P0300'}</span>
                    <span class="tag-badge bg-tag-red">${def.severity || 'Критическая'}</span>
                </div>
                <div class="obd-scan-matrix-screen mb-2" style="border-color: rgba(255, 51, 102, 0.4);">
                    <div class="obd-terminal-line error">> НЕИСПРАВНОСТЬ: ${def.text}</div>
                    <div class="obd-terminal-line warn">> БЛОК: ${def.system || 'ЭБУ ДВС DME'}</div>
                    <div class="obd-terminal-line">> ЦЕНА РЕМОНТА: ~${(def.cost || 15000).toLocaleString()} ₽</div>
                </div>
                <div class="grid-3 text-xs p-2" style="background: rgba(0,0,0,0.6); border-radius: 8px;">
                    <div>RPM: <b class="color-cyan">${def.rpm || 850}</b></div>
                    <div>ОЖ: <b class="${car.engineTemp > 100 ? 'color-red' : 'color-green'}">${car.engineTemp || 90}°C</b></div>
                    <div>Буст: <b class="color-amber">${def.boost || 0.0} bar</b></div>
                </div>
            </div>
        `;

        actBox.innerHTML = `
            <button onclick="closeOBD2Modal(); renderMarketHaggleControls();" class="btn btn-cyan w-full mt-2">
                Понятно (Ткнуть продавца носом в ошибку!)
            </button>
        `;
    } else {
        playSound('win');
        tgHaptic('success');

        resBox.innerHTML = `
            <div class="obd-cyber-display" style="border-color: var(--green);">
                <div class="flex-between text-xs mb-2">
                    <span class="color-green font-bold"><i class="fa-solid fa-circle-check"></i> ОШИБОК DTC НЕ НАЙДЕНО</span>
                    <span class="tag-badge bg-tag-green">CAN: OK</span>
                </div>
                <div class="obd-scan-matrix-screen mb-2" style="border-color: rgba(0, 230, 118, 0.4);">
                    <div class="obd-terminal-line success">> Блоки DME / EGS / ABS / SRS: Ошибки отсутствуют.</div>
                    <div class="obd-terminal-line">> Топливные коррекции в норме.</div>
                    <div class="obd-terminal-line">> Пропусков зажигания не зафиксировано.</div>
                </div>
                <div class="flex-between text-xs p-2" style="background: rgba(0,0,0,0.6); border-radius: 8px;">
                    <span>Ресурс ДВС: <b class="color-green">${eng}%</b></span>
                    <span>Ресурс КПП: <b class="color-green">${trans}%</b></span>
                </div>
            </div>
        `;

        actBox.innerHTML = `
            <button onclick="closeOBD2Modal(); renderMarketHaggleControls();" class="btn btn-green w-full mt-2">
                Завершить проверку ✓
            </button>
        `;
    }
}

function closeOBD2Modal() {
    closeModal("modalOBD2");
}

function initiateBuyMarketCar(carId) {
    const carIndex = state.marketFeed.findIndex(c => c && c.id === carId);
    if (carIndex === -1) return;
    const car = state.marketFeed[carIndex];
    car.viewed = true;
    renderMarketFeed();
    const now = Date.now();
    
    if (car.cooldownUntil && car.cooldownUntil > now) {
        return showToast("Абонент всё ещё занят! Подождите.");
    }
    
    setTxt("buyCallEmoji", "📞");
    setTxt("buyCallTitle", "Звонок продавцу...");
    setTxt("buyCallDesc", "Набираем номер продавца... Идут гудки в трубке...");
    const btnBox = document.getElementById("buyCallActionBtnBox");
    if (btnBox) btnBox.innerHTML = "<button class='btn btn-dark w-full' disabled>Гудки в трубке...</button>";
    
    const modal = document.getElementById("modalBuyCall");
    if (modal) modal.classList.add('active');
    tgHaptic('light');

    setTimeout(() => {
        let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
        let callSuccessChance = 75;
        if (karma > 65) callSuccessChance += 15;
        if (karma < 35) callSuccessChance -= 15;
        if (car.dealType === 'urgent') callSuccessChance += 20;
        
        const roll = Math.random() * 100;

        if (roll < callSuccessChance) {
            closeModal("modalBuyCall");
            showToast("🚗 Вы приехали по адресу и осматриваете машину у капота!");
            openMarketDeal(carId);
        } else if (roll < 92) {
            const waitSec = Math.floor(15 + Math.random() * 20);
            car.cooldownUntil = Date.now() + (waitSec * 1000);
            setTxt("buyCallEmoji", "📵");
            setTxt("buyCallTitle", "Продавец занят");
            setTxt("buyCallDesc", "«Сейчас на работе, перезвоните через " + waitSec + " сек, всё покажу!»");
            if (btnBox) btnBox.innerHTML = "<button onclick=\"closeModal('modalBuyCall')\" class='btn btn-dark w-full'>Понятно</button>";
            saveState();
            renderMarketFeed();
        } else { 
            setTxt("buyCallEmoji", "❌");
            setTxt("buyCallTitle", "Лот продан");
            setTxt("buyCallDesc", "«Только что приехали с задатком, машина ушла!»");
            car.unavailable = true;
            saveState();
            renderMarketFeed();
            if (btnBox) btnBox.innerHTML = "<button onclick=\"closeModal('modalBuyCall')\" class='btn btn-dark w-full'>Закрыть</button>";
        }
    }, 800);
}

function paidCallMarketCar(carId) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < 1000) return showToast("Не хватает 1,000 ₽ на приоритетный дозвон!");
    state.player.cash -= 1000;
    
    const carIndex = state.marketFeed.findIndex(c => c && c.id === carId);
    if (carIndex === -1) return;
    const car = state.marketFeed[carIndex];

    car.cooldownUntil = 0;
    saveState();
    renderMarketFeed();
    playSound('win');
    tgHaptic('success');
    showToast("Приоритетный вызов успешен! Встреча назначена.");
    openMarketDeal(carId);
}

// ----------------------------------------------------
// ВСТРЕЧА У КАПОТА: ПРОВЕРКИ И ТОРГ
// ----------------------------------------------------
function openMarketDeal(carId) {
    const carIndex = state.marketFeed.findIndex(c => c && c.id === carId);
    if (carIndex === -1) return;
    const car = state.marketFeed[carIndex];
    pendingMarketCar = { car: car, carIndex: carIndex };
    
    const imgEl = document.getElementById("dealCarImg");
    if (imgEl) {
        let fallbackUrl = car.fallback || getCategoryFallback(car.type);
        imgEl.src = car.img ? car.img : fallbackUrl;
        imgEl.onerror = () => { imgEl.src = fallbackUrl; };
        imgEl.style.width = "90px";
        imgEl.style.height = "62px";
        imgEl.style.objectFit = "cover";
    }
    
    let cName = car.name ? car.name : "Авто";
    setTxt("dealCarTitle", cName);
    
    let mileageStr = car.mileage ? car.mileage.toLocaleString() : "0";
    let plateStr = car.plate ? car.plate : "ТРАНЗИТ";
    setTxt("dealCarMileageInfo", "Пробег: " + mileageStr + " км / Госномер: " + plateStr);
    
    let priceStr = car.price ? car.price.toLocaleString() : "0";
    setTxt("dealCarPrice", priceStr + " ₽");
    
    const avatars = ["👨‍💼", "🧔", "😎", "👨‍🔧", "🧑‍💻", "👴"];
    const names = ["Сергей", "Алексей", "Дмитрий", "Артём", "Михаил", "Игорь"];
    let numSum = 0;
    for (let k = 0; k < carId.length; k++) numSum += carId.charCodeAt(k);
    const randIdx = numSum % avatars.length;
    
    const sellerTitle = names[randIdx];
    pendingMarketCar.sellerName = sellerTitle;
    setTxt("dealSellerAvatar", avatars[randIdx]);
    setTxt("dealSellerName", sellerTitle + " (Продавец у капота)");

    const thread = document.getElementById("dealChatThread");
    if (thread) {
        let greeting = "«Привет! Вот машина, осматривай кузов, проверяй сканером. Если всё устроит — оформим ДКП.»";
        if (car.dealType === 'urgent') greeting = "«Здорово! Мне срочно нужны деньги до вечера, готов хорошо уступить реальному покупателю!»";
        if (car.dealType === 'overprice') greeting = "«Добрый день. Машина ухоженная, состояние отличное. Сильно сбивать цену не позволю.»";
        thread.innerHTML = "<div class='chat-msg msg-seller'>" + greeting + "</div>";
    }

    renderMarketHaggleControls();
    const modal = document.getElementById("modalMarketDeal");
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function renderMarketHaggleControls() {
    const haggleArea = document.getElementById("dealHaggleArea");
    if (!haggleArea || !pendingMarketCar) return;

    const car = pendingMarketCar.car;
    let hasGauge = !!(state.player && state.player.tools && (state.player.tools.gauge || state.player.tools.gauge_pro));
    let hasScanner = !!(state.player && state.player.tools && (state.player.tools.obd || state.player.tools.obd_launch));

    let toolIcon = hasGauge ? "✓" : "(3k)";
    let obdIcon = hasScanner ? "Launch OBD2 ✓" : "Launch (5k)";

    if (car.hagglePatience <= 0) {
        haggleArea.innerHTML = "<div class='text-center sub-label color-red font-bold py-2'>🚫 Продавец устал от торга и зафиксировал цену!</div>";
        return;
    }

    let inspectionToolsBlock = `
        <div class="grid-2 mb-2">
            <button onclick="openGaugeModal('${car.id}')" class="btn btn-dark btn-sm">
                <i class="fa-solid fa-microchip color-cyan mr-1"></i> Толщиномер ${toolIcon}
            </button>
            <button onclick="quickOBDScanMarketCar('${car.id}')" class="btn btn-dark btn-sm">
                <i class="fa-solid fa-tablet-screen-button color-cyan mr-1"></i> ${obdIcon}
            </button>
        </div>
    `;

    let inspectionBonusBtn = "";
    if (car.stoChecked && car.hiddenDefect) {
        inspectionBonusBtn = `
        <button onclick="attemptDefectArgueHaggle()" class="btn btn-purple btn-sm w-full mb-2">
            🔍 Ткнуть в ошибку ${car.hiddenDefect.code || 'DTC'}: «${car.hiddenDefect.text.slice(0, 30)}...» (-15%)
        </button>`;
    } else if (car.gaugeChecked && (car.bodyThickness.doors > 200 || car.bodyThickness.hood > 200)) {
        inspectionBonusBtn = `
        <button onclick="attemptPaintArgueHaggle()" class="btn btn-amber btn-sm w-full mb-2">
            🎨 Показать слой шпаклёвки на приборе (>200 мкм) (-10%)
        </button>`;
    }

    haggleArea.innerHTML = `
        <div class="risk-meter-box mb-2">
            <div class="flex-between text-xs">
                <span>Терпение продавца:</span>
                <b class="${car.hagglePatience > 2 ? 'color-green' : 'color-red'}">${car.hagglePatience} попыток</b>
            </div>
        </div>
        ${inspectionToolsBlock}
        ${inspectionBonusBtn}
        <div class="grid-3">
            <button onclick="attemptMarketHaggle(5)" class="btn btn-dark btn-sm">
                -5%<br><span class="color-green text-xs">Мягко</span>
            </button>
            <button onclick="attemptMarketHaggle(10)" class="btn btn-dark btn-sm">
                -10%<br><span class="color-amber text-xs">По факту</span>
            </button>
            <button onclick="attemptMarketHaggle(18)" class="btn btn-dark btn-sm">
                -18%<br><span class="color-red text-xs">Жёстко</span>
            </button>
        </div>`;
}

function attemptDefectArgueHaggle() {
    if (!pendingMarketCar) return;
    const car = pendingMarketCar.car;
    const thread = document.getElementById("dealChatThread");

    let discount = Math.round(car.price * 0.15);
    car.price = Math.max(10000, car.price - discount);
    car.hagglePatience -= 1;
    car.stoChecked = false;

    setTxt("dealCarPrice", car.price.toLocaleString() + " ₽");

    if (thread) {
        thread.innerHTML += `
            <div class="chat-msg msg-player">«Я Launch подключил: в блоке висит ${car.hiddenDefect.text}. Тут работы на круглую сумму, скидывай!»</div>
            <div class="chat-msg msg-seller">«Да уж, спалил ты меня... Ладно, уступаю ${discount.toLocaleString()} ₽ на сервис!»</div>`;
        thread.scrollTop = thread.scrollHeight;
    }

    playSound('win');
    tgHaptic('success');
    renderMarketHaggleControls();
    saveState();
}

function attemptPaintArgueHaggle() {
    if (!pendingMarketCar) return;
    const car = pendingMarketCar.car;
    const thread = document.getElementById("dealChatThread");

    let discount = Math.round(car.price * 0.10);
    car.price = Math.max(10000, car.price - discount);
    car.hagglePatience -= 1;
    car.gaugeChecked = false;

    setTxt("dealCarPrice", car.price.toLocaleString() + " ₽");

    if (thread) {
        thread.innerHTML += `
            <div class="chat-msg msg-player">«Вот, смотри на толщиномер: здесь слой шпакли звенит за 300 мкм! Скидывай за неродной окрас.»</div>
            <div class="chat-msg msg-seller">«Ладно, твоя взяла. Скидываю ${discount.toLocaleString()} ₽ за вторичный окрас.»</div>`;
        thread.scrollTop = thread.scrollHeight;
    }

    playSound('win');
    tgHaptic('success');
    renderMarketHaggleControls();
    saveState();
}

function attemptMarketHaggle(percent) {
    if (!pendingMarketCar) return;
    const car = pendingMarketCar.car;
    if (car.hagglePatience <= 0) return showToast("Продавец больше не торгуется!");

    car.hagglePatience -= 1;

    let baseChance = percent === 5 ? 85 : (percent === 10 ? 60 : 35);
    if (car.sellerPersonality === 'hurried') baseChance += 25;
    if (car.sellerPersonality === 'greedy') baseChance -= 20;

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    
    let finalChance = baseChance + (lvl * 0.5) + ((karma - 50) * 0.3);
    const thread = document.getElementById("dealChatThread");

    if (Math.random() * 100 <= finalChance) {
        let disc = Math.round(car.price * (percent / 100));
        car.price = Math.max(10000, car.price - disc);
        setTxt("dealCarPrice", car.price.toLocaleString() + " ₽");

        if (thread) {
            thread.innerHTML += `
                <div class="chat-msg msg-player">«Скинь ${percent}%, забираю прямо сейчас за наличку без лишних вопросов.»</div>
                <div class="chat-msg msg-seller">«По рукам. Уступаю ${disc.toLocaleString()} ₽, оформляем ДКП.»</div>`;
            thread.scrollTop = thread.scrollHeight;
        }
        playSound('win');
        tgHaptic('success');
    } else {
        if (thread) {
            let failReplies = [
                "«Никаких скидок, цена и так по низу рынка!»",
                "«Не устраивает цена — ищи другой вариант на площадке.»",
                "«Ты надоел торговаться, больше ни копейки не скину!»"
            ];
            let reply = failReplies[Math.floor(Math.random() * failReplies.length)];
            thread.innerHTML += `
                <div class="chat-msg msg-player">«Скидывай ${percent}%, слишком много просишь!»</div>
                <div class="chat-msg msg-seller">${reply}</div>`;
            thread.scrollTop = thread.scrollHeight;
        }
        tgHaptic('error');
    }

    renderMarketHaggleControls();
    saveState();
}

// ----------------------------------------------------
// ВЫКУП АВТО ЧЕРЕЗ БЛАНК ДКП
// ----------------------------------------------------
function confirmMarketPurchaseSuccess() {
    if (!pendingMarketCar) return;
    const car = pendingMarketCar.car;
    
    const maxSlots = getTotalGarageSlots();
    let currentSlots = state.garage ? state.garage.length : 0;

    if (currentSlots >= maxSlots) return showToast("Гараж полон! Вместимость: " + maxSlots + " мест.");
    
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    let price = car.price ? car.price : 0;

    if (cash < price) return showToast("Недостаточно денег на выкуп!");
    
    closeModal("modalMarketDeal");

    activePendingDKPDeal = {
        type: 'buy',
        car: car,
        carIndex: pendingMarketCar.carIndex,
        seller: pendingMarketCar.sellerName || "Продавец",
        buyer: (state.player && state.player.name) ? state.player.name : "Перекуп #777",
        price: price
    };

    if (typeof openDKPModal === 'function') {
        openDKPModal(activePendingDKPDeal);
    } else {
        openRegistrationChoiceModal(activePendingDKPDeal);
    }
}

function openRegistrationChoiceModal(deal) {
    activePendingDKPDeal = deal;
    let modal = document.getElementById('modalRegistrationChoice');
    if (modal) {
        modal.classList.add('active');
        playSound('tick');
        tgHaptic('light');
    } else {
        confirmRegistrationChoice(false);
    }
}

function confirmRegistrationChoice(registerOnPlayer) {
    closeModal('modalRegistrationChoice');
    if (!activePendingDKPDeal) return;

    if (registerOnPlayer) {
        let duty = 2850;
        let cash = state.player?.cash || 0;
        if (cash < duty) {
            showToast("Не хватает 2,850 ₽ на госпошлину МРЭО! Оформлено по ДКП.");
            activePendingDKPDeal.isRegisteredOnPlayer = false;
        } else {
            state.player.cash -= duty;
            activePendingDKPDeal.isRegisteredOnPlayer = true;
            showToast("Машина зарегистрирована в МРЭО ГИБДД (-2,850 ₽ госпошлина) ✓");
        }
    } else {
        activePendingDKPDeal.isRegisteredOnPlayer = false;
        showToast("Автомобиль оставлен на ДКП без постановки на учёт (Лимит: 10 дней)!");
    }

    finishMarketCarBuyProcess(activePendingDKPDeal);
}

function finishMarketCarBuyProcess(deal) {
    const car = deal.car;
    const price = deal.price;
    const carIndex = deal.carIndex;

    state.player.cash -= price;
    
    if (!state.player.stats) state.player.stats = {};
    state.player.stats.bought = (state.player.stats.bought || 0) + 1;
    
    if (!state.garage) state.garage = [];
    
    const newCar = Object.assign({}, car);
    newCar.customPlate = car.plate;
    newCar.impounded = false;
    newCar.unregistered = false;
    newCar.insurance = null;
    newCar.purchaseCost = price;
    newCar.wear = car.wear ? car.wear : { engine: 85, transmission: 85 };
    newCar.preSaleVisited = false;
    newCar.isPersonal = false;
    newCar.isRegisteredOnPlayer = !!deal.isRegisteredOnPlayer;
    newCar.ownershipDays = 0;
    newCar.engineTemp = 90;
    newCar.tireWear = 100;
    
    newCar.tuning = { 
        chip: 0, exhaust: false, stance: false, bodykit: false, 
        rollCage: false, dragSlicks: false, hydroHandbrake: false, 
        weldedDiff: false, steeringAngle: false, bucketSeats: false, 
        customWheels: false, risk1251: 0 
    };

    if (typeof recalculateCarMarketValue === 'function') {
        recalculateCarMarketValue(newCar);
    }

    state.garage.push(newCar);
    
    if (state.marketFeed && state.marketFeed.length > carIndex) {
        state.marketFeed.splice(carIndex, 1);
    }
    
    pendingMarketCar = null;
    activePendingDKPDeal = null;
    addXp(40);

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('buy_car', 1);
    }
    
    let carName = car.name ? car.name : "Авто";
    showToast("✅ " + carName + " куплен за " + price.toLocaleString() + " ₽!");
    spawnFloatingReward("-" + price.toLocaleString() + " ₽");
    
    saveState();
    renderMarketFeed();
    if (typeof renderGarage === 'function') renderGarage();
    setTimeout(() => { switchTab("tabGarage"); }, 400);
}

// ----------------------------------------------------
// ТОЛЩИНОМЕР ЛКП
// ----------------------------------------------------
function openGaugeModal(carId) { 
    activeInspectCarId = carId;
    if (!state.marketFeed) return;
    const car = state.marketFeed.find(c => c && c.id === carId);
    if (car) car.gaugeChecked = true;

    let hasGauge = !!(state.player && state.player.tools && (state.player.tools.gauge || state.player.tools.gauge_pro));

    if (!hasGauge) {
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;
        if (cash < 3000) return showToast("Купите толщиномер в Маркете или заплатите 3,000 ₽ за замер!");
        state.player.cash -= 3000;
        showToast("Замер кузова толщиномером: -3,000 ₽");
    } else {
        let toolKey = state.player?.tools?.gauge_pro ? 'gauge_pro' : 'gauge';
        let wear = state.player?.toolsWear ? (state.player.toolsWear[toolKey] || 0) : 60;
        if (wear <= 0) {
            showToast("⚠️ Толщиномер разряжен! Откалибруйте в Маркете.");
        } else {
            state.player.toolsWear[toolKey] = Math.max(0, wear - 1);
        }
    }

    ['hood', 'roof', 'doors', 'wings'].forEach(part => {
        const el = document.getElementById("part-" + part);
        if (el) el.innerHTML = "Замерить";
    });

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('gauge_check', 1);
    }

    saveState();
    const modal = document.getElementById("modalGauge");
    if (modal) modal.classList.add('active');
}

function checkBodyPart(part) { 
    if (!activeInspectCarId || !state.marketFeed) return;
    const car = state.marketFeed.find(c => c && c.id === activeInspectCarId);
    if (!car || !car.bodyThickness) return;
    
    playSound('tick');
    tgHaptic('light');
    
    let val = car.bodyThickness[part] ? car.bodyThickness[part] : 110;
    const el = document.getElementById("part-" + part);
    if (el) {
        if (val > 200) {
            el.innerHTML = "<span class='color-red'>" + val + " мкм (Шпакля)</span>";
        } else {
            el.innerHTML = "<span class='color-green'>" + val + " мкм (Завод)</span>";
        }
    }
}

function closeGaugeModal() {
    closeModal("modalGauge");
    activeInspectCarId = null;
    playSound('tick');
    renderMarketHaggleControls();
}

// ----------------------------------------------------
// ОТЧЁТ АВТОТЕКИ
// ----------------------------------------------------
function openAutotekaModal(carId) {
    if (!state.marketFeed) return;
    const car = state.marketFeed.find(c => c && c.id === carId);
    if (!car) return;
    car.viewed = true;
    
    if (!car.autotekaChecked) {
        let isVip = !!(state.player && state.player.vipPro);
        const cost = isVip ? 0 : 5000;
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;
        
        if (cash < cost && !isVip) return showToast("Автотека стоит 5,000 ₽!");
        state.player.cash -= cost;
        car.autotekaChecked = true;
        saveState();
    }
    
    const rep = document.getElementById("autotekaReportContent");
    if (rep) {
        let cName = car.name ? car.name : "Автомобиль";
        let cPlate = car.plate ? car.plate : "ТРАНЗИТ";
        let dtpCount = car.hiddenDefect ? "2 ДТП (В расчётах СТО)" : "ДТП не зафиксированы";
        let dtpBadgeClass = car.hiddenDefect ? "bg-tag-red" : "bg-tag-green";
        
        let legalStatus = car.isStolen
            ? "<span class='tag-badge bg-tag-red'>🚨 В РОЗЫСКЕ / ПЕРЕБИТ VIN</span>"
            : "<span class='tag-badge bg-tag-green'>✓ ЮРИДИЧЕСКИ ЧИСТ</span>";

        let mVal = car.mileage ? car.mileage : 85000;
        let mileagePercent = Math.min(100, Math.round((mVal / 250000) * 100));
        let odoWarning = car.rolledOdometer
            ? "<span class='color-red text-xs font-bold'>⚠ Зафиксирована скрутка пробега!</span>"
            : "<span class='color-green text-xs font-bold'>✓ Пробег подтвержден станциями ТО</span>";

        let engWear = car.wear?.engine ? Math.round(car.wear.engine) : 85;
        let transWear = car.wear?.transmission ? Math.round(car.wear.transmission) : 85;
        let avgTech = Math.round((engWear + transWear) / 2);

        let pts = car.ptsData || {
            ownerName: "Иванов И.И.",
            ownerAvatar: "🧔",
            ownersCount: 2,
            ownershipYears: 3,
            vin: "XTA21070001234567",
            ptsType: "Электронный (ЭПТС) ✓",
            pledgeBank: "Залогов нет ✓",
            fsspRestrictions: "Ограничений нет ✓",
            taxiCheck: "В такси не использовалась ✓"
        };

        let overallScore = 10;
        if (car.hiddenDefect) overallScore -= 3;
        if (car.rolledOdometer) overallScore -= 3;
        if (car.isStolen) overallScore -= 4;
        overallScore = Math.max(1, overallScore);

        let scoreColor = overallScore >= 8 ? "color-green" : (overallScore >= 5 ? "color-amber" : "color-red");

        rep.innerHTML = `
            <div class='flex-between mb-2'>
                <div>
                    <b class='color-cyan' style='font-size:13.5px;'>${cName}</b>
                    <div class='sub-label mt-1'>Госномер: <span class='license-plate text-xs notranslate' translate='no' style='padding:2px 6px;'>${cPlate} <div class='license-flag'>RUS</div></span></div>
                </div>
                ${legalStatus}
            </div>

            <div class='autoteka-pts-card mb-2'>
                <div class='autoteka-owner-row'>
                    <div class='autoteka-owner-avatar'>${pts.ownerAvatar}</div>
                    <div style='flex:1;'>
                        <div class='flex-between'>
                            <b class='text-xs color-amber'>Владелец по ПТС: ${pts.ownerName}</b>
                            <span class='tag-badge bg-tag-cyan'>Физлицо</span>
                        </div>
                        <div class='sub-label mt-1' style='font-size:10px;'>Срок владения: <b>${pts.ownershipYears} г.</b> | Записей в ПТС: <b>${pts.ownersCount}</b></div>
                        <div class='sub-label' style='font-size:9.5px;'>VIN: <b class='color-cyan'>${pts.vin}</b></div>
                    </div>
                </div>

                <div class='grid-2 text-xs'>
                    <div class='autoteka-stat-tile'>
                        <span class='sub-label'>Тип документа:</span>
                        <div class='font-bold mt-1'>${pts.ptsType}</div>
                    </div>
                    <div class='autoteka-stat-tile'>
                        <span class='sub-label'>Залог в банках:</span>
                        <div class='font-bold mt-1 ${pts.pledgeBank.includes("нет") ? "color-green" : "color-red"}'>${pts.pledgeBank}</div>
                    </div>
                    <div class='autoteka-stat-tile'>
                        <span class='sub-label'>База ФССП:</span>
                        <div class='font-bold mt-1 ${pts.fsspRestrictions.includes("нет") ? "color-green" : "color-red"}'>${pts.fsspRestrictions}</div>
                    </div>
                    <div class='autoteka-stat-tile'>
                        <span class='sub-label'>Работа в такси:</span>
                        <div class='font-bold mt-1 ${pts.taxiCheck.includes("не") ? "color-green" : "color-amber"}'>${pts.taxiCheck}</div>
                    </div>
                </div>
            </div>

            <div class='p-2 mb-2' style='background:#0d1424; border-radius:10px; border:1px solid rgba(255,255,255,0.06);'>
                <div class='flex-between text-xs mb-1'>
                    <span>История показаний одометра:</span>
                    <b class='color-amber notranslate' translate='no'>${mVal.toLocaleString()} км</b>
                </div>
                <div class='biz-progress-track'><div class='biz-progress-fill fill-biz-stock' style='width:${mileagePercent}%;'></div></div>
                <div class='text-right'>${odoWarning}</div>
            </div>

            <div class='p-2 mb-2' style='background:#0d1424; border-radius:10px; border:1px solid rgba(255,255,255,0.06);'>
                <div class='flex-between text-xs mb-1'>
                    <span>Ресурс силовых агрегатов:</span>
                    <b class='color-green notranslate' translate='no'>${avgTech}%</b>
                </div>
                <div class='biz-progress-track'><div class='biz-progress-fill fill-biz-lvl' style='width:${avgTech}%;'></div></div>
                <div class='sub-label text-xs notranslate' translate='no'>Двигатель: ${engWear}% | Трансмиссия: ${transWear}%</div>
            </div>

            <div class='flex-between text-xs p-2 mb-2' style='background:#0d1424; border-radius:10px; border:1px solid rgba(255,255,255,0.06);'>
                <div>
                    <span>История аварий и выплат:</span>
                    <div class='sub-label mt-1'>${dtpCount}</div>
                </div>
                <span class='tag-badge ${dtpBadgeClass}'>${car.hiddenDefect ? "БЫЛО В ДТП" : "БЕЗ ДТП"}</span>
            </div>

            <div class='flex-between p-2' style='background:rgba(0,242,254,0.05); border:1px solid var(--border-glow); border-radius:10px;'>
                <div>
                    <b class='text-xs color-cyan'>Итоговый рейтинг Автотеки:</b>
                    <div class='sub-label' style='font-size:9.5px;'>Оценка на основе баз ГИБДД, ФССП и страховых компаний</div>
                </div>
                <div class='price-val ${scoreColor}' style='font-size:20px;'>${overallScore}/10</div>
            </div>
        `;
    }
    
    const modal = document.getElementById("modalAutoteka");
    if (modal) modal.classList.add('active');
    playSound('tick');
    renderMarketFeed();
}

function updateMarketTimers() {
    if (!state.marketFeed) return;
    const now = Date.now();
    let needFullReRender = false;

    state.marketFeed.forEach(car => {
        if (!car) return;
        const cardEl = document.getElementById("card_" + car.id);
        const timerNumEl = document.getElementById("timer_num_" + car.id);

        if (car.cooldownUntil && car.cooldownUntil > now) {
            const timeLeft = Math.ceil((car.cooldownUntil - now) / 1000);
            if (timerNumEl) timerNumEl.innerText = timeLeft + "с";
            if (cardEl && !cardEl.classList.contains('busy')) cardEl.classList.add('busy');
        } else if (car.cooldownUntil && car.cooldownUntil <= now) {
            car.cooldownUntil = 0;
            if (cardEl) cardEl.classList.remove('busy');
            needFullReRender = true;
        }
    });

    if (needFullReRender) renderMarketFeed();
}

// Экспорт функций в глобальный объект window
window.setCategory = setCategory;
window.toggleMarketCategories = toggleMarketCategories;
window.refreshMarketFeedManual = refreshMarketFeedManual;
window.populateMarketFeed = populateMarketFeed;
window.renderMarketFeed = renderMarketFeed;
window.openGaugeModal = openGaugeModal;
window.checkBodyPart = checkBodyPart;
window.closeGaugeModal = closeGaugeModal;
window.quickOBDScanMarketCar = quickOBDScanMarketCar;
window.renderOBDFinalResults = renderOBDFinalResults;
window.closeOBD2Modal = closeOBD2Modal;
window.openAutotekaModal = openAutotekaModal;
window.initiateBuyMarketCar = initiateBuyMarketCar;
window.paidCallMarketCar = paidCallMarketCar;
window.openMarketDeal = openMarketDeal;
window.renderMarketHaggleControls = renderMarketHaggleControls;
window.attemptMarketHaggle = attemptMarketHaggle;
window.attemptDefectArgueHaggle = attemptDefectArgueHaggle;
window.attemptPaintArgueHaggle = attemptPaintArgueHaggle;
window.confirmMarketPurchaseSuccess = confirmMarketPurchaseSuccess;
window.openRegistrationChoiceModal = openRegistrationChoiceModal;
window.confirmRegistrationChoice = confirmRegistrationChoice;
window.finishMarketCarBuyProcess = finishMarketCarBuyProcess;
window.updateMarketTimers = updateMarketTimers;
window.refreshPlateCatalog = refreshPlateCatalog;
window.generateNormalPlate = generateNormalPlate;
window.generateCoolPlate = generateCoolPlate;
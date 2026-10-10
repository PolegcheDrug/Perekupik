// ========================================================
// js/market.js — АВТОРЫНОК, ОБЪЯВЛЕНИЯ, ТОЛЩИНОМЕР, АВТОТЕКА И ДКП (v0.4.0)
// ========================================================

const PLATE_LETTERS = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];
const REGIONS = ['77', '99', '97', '177', '199', '777', '799', '50', '90', '150', '190', '750'];

function generateNormalPlate() {
    const l1 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
    const l2 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
    const l3 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
    const num = String(Math.floor(Math.random() * 899) + 100);
    const reg = REGIONS[Math.floor(Math.random() * REGIONS.length)];
    return l1 + num + l2 + l3 + " " + reg;
}

function generateCoolPlate() {
    let letters = "";
    if (Math.random() > 0.5) {
        const l = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
        letters = l + l + l;
    } else {
        const l1 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
        const l2 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
        letters = l1 + l2 + l2;
    }
    const coolNums = ['001', '007', '111', '222', '333', '444', '555', '666', '777', '888', '999'];
    const num = coolNums[Math.floor(Math.random() * coolNums.length)];
    const reg = ['77', '99', '97', '777'][Math.floor(Math.random() * 4)];
    return letters.charAt(0) + num + letters.substring(1) + " " + reg;
}

function evaluatePlate(plateStr) {
    if (typeof calculatePlateValue === 'function') {
        return calculatePlateValue(plateStr);
    }
    if (!plateStr) return 0;
    if (String(plateStr).startsWith('ТРАНЗИТ')) return 0;
    return 1500;
}

function refreshPlateCatalog() {
    state.plateCatalog = [];
    for (let i = 0; i < 6; i++) {
        const isCool = Math.random() > 0.45;
        let p = generateNormalPlate();
        if (isCool) p = generateCoolPlate();
        const cost = Math.round(evaluatePlate(p) * (1.1 + Math.random() * 0.25));
        state.plateCatalog.push({ plate: p, price: cost });
    }
}

let activeInspectCarId = null;
let pendingMarketCar = null;

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
    economy: { name: "ЭКОНОМ", title: "Сегмент Эконом", capital: "от 50 000 ₽", desc: "Быстрый оборот, минимальные риски на старте и высокий спрос перекупов." },
    scooter: { name: "СКУТЕРЫ", title: "Городские Скутеры", capital: "от 25 000 ₽", desc: "Дешёвый порог входа, моментальные сделки без заморочек с документами." },
    moto: { name: "МОТО", title: "Спортбайки & Классика", capital: "от 120 000 ₽", desc: "Высокая сезонная маржа, проверка состояния вилки и геометрии рамы." },
    atv: { name: "КВАДРО", title: "Квадроциклы 4x4", capital: "от 180 000 ₽", desc: "Техника для бездорожья. Частые скрытые дефекты ходовой и приводов." },
    comfort: { name: "КОМФОРТ", title: "Сегмент Комфорт", capital: "от 450 000 ₽", desc: "Городские седаны и кроссоверы. Идеально под выкуп для таксопарков." },
    premium: { name: "ПРЕМИУМ", title: "Премиум & Люкс", capital: "от 1 200 000 ₽", desc: "Высокая чистая прибыль с одной сделки, но капризные и дотошные клиенты." },
    hyper: { name: "ГИПЕРКАРЫ", title: "Спорт & Экзотика", capital: "от 5 000 000 ₽", desc: "Огромная маржа, эксклюзивные клиенты и дорогие комплектующие." },
    truck: { name: "ГРУЗОВИКИ", title: "Коммерческий транспорт", capital: "от 2 500 000 ₽", desc: "Тягачи и фургоны для крупных заказов Синдиката под ключ." },
    yacht: { name: "ЯХТЫ", title: "Морской сегмент", capital: "от 15 000 000 ₽", desc: "Элитная морская техника для настоящих автомобильных олигархов." }
};

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
    let pFuel = (state.player && state.player.fuel) ? state.player.fuel : 0;

    if (pCash < cost) return showToast("Не хватает " + cost.toLocaleString() + " ₽!");
    if (pFuel < 5) return showToast("Закончился бензин ⛽!");
    
    state.player.cash -= cost;
    state.player.fuel -= 5;
    
    // Авто-сворачивание сетки классов авто при обновлении ленты
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

function populateMarketFeed() {
    if (typeof CAR_DATABASE === 'undefined') return;
    if (!CAR_DATABASE) return;
    
    let cat = state.activeCategory ? state.activeCategory : 'economy';
    let pool = CAR_DATABASE[cat] ? CAR_DATABASE[cat] : CAR_DATABASE.economy;

    if (!pool || pool.length === 0) return;

    state.marketFeed = [];
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    
    for (let i = 0; i < 8; i++) {
        const template = pool[i % pool.length];
        if (!template) continue;

        let defectChance = 0.45;
        if (lvl <= 5) defectChance = 0.35;
        else if (lvl >= 20) defectChance = 0.60;
        
        if (cat === 'premium' || cat === 'hyper') defectChance -= 0.15;

        let stolenChance = 0.20;
        if (lvl <= 5) stolenChance = 0.12;
        else if (lvl >= 20) stolenChance = 0.28;

        let hasHiddenDefect = false;
        if (typeof OBD_ERRORS !== 'undefined' && OBD_ERRORS.length > 0) {
            if (Math.random() < defectChance) hasHiddenDefect = true;
        }
        
        let isStolen = Math.random() < stolenChance;
        const carId = "m_" + Date.now() + "_" + i;
        
        let genPlate = generateNormalPlate();
        if (Math.random() < 0.20) genPlate = generateCoolPlate();

        let baseP = template.basePrice ? template.basePrice : 100000;
        let tType = template.type ? template.type : 'economy';
        const dynPrice = getDynamicPrice(baseP, tType);

        let priceMultiplier = 0.8;
        if (lvl <= 10) priceMultiplier = 0.75 + Math.random() * 0.20;
        else if (lvl >= 20) priceMultiplier = 0.85 + Math.random() * 0.30;
        else priceMultiplier = 0.80 + Math.random() * 0.25;

        let carOnlyPrice = Math.round(dynPrice * priceMultiplier);
        const baseVal = Math.round(dynPrice * 1.15);
        const plateVal = evaluatePlate(genPlate);

        let sellerPrice = carOnlyPrice;
        let isLuckyFind = false;

        if (plateVal > 5000) {
            if (Math.random() < 0.04) {
                isLuckyFind = true;
                sellerPrice = carOnlyPrice;
            } else {
                let plateMarkup = Math.round(plateVal * (0.80 + Math.random() * 0.10));
                sellerPrice = carOnlyPrice + plateMarkup;
            }
        }
        
        let defectObj = null;
        if (hasHiddenDefect && typeof OBD_ERRORS !== 'undefined') {
            const errItem = OBD_ERRORS[Math.floor(Math.random() * OBD_ERRORS.length)];
            defectObj = { text: errItem.text, cost: errItem.cost };
        }

        let sNote = "Машина в порядке, сел и поехал.";
        if (isLuckyFind) {
            sNote = "«Отдаю дедовский аппарат как есть, в ценах на номера не разбираюсь.» (🔥 Продавец не знает цену номеров!)";
        } else if (plateVal > 5000) {
            sNote = "«Продаю только вместе с красивым госномером " + genPlate + ", торга нет!»";
        } else if (hasHiddenDefect) {
            const riskyPhrases = ["«Есть мелкие недочеты, на езду не влияет.»", "«Продаю срочно, перекупам не звонить.»", "«Двигатель работает ровно, но чек горит (датчик кислорода).»"];
            sNote = riskyPhrases[Math.floor(Math.random() * riskyPhrases.length)];
        } else if (typeof SELLER_ADS_PHRASES !== 'undefined' && SELLER_ADS_PHRASES.length > 0) {
            sNote = SELLER_ADS_PHRASES[Math.floor(Math.random() * SELLER_ADS_PHRASES.length)];
        }

        let cName = template.name ? template.name : "Автомобиль";
        let cPower = template.power ? template.power : 100;
        let cImg = template.img ? template.img : "assets/cars/economy/vaz-2107.jpg";

        let cCond = hasHiddenDefect ? Math.floor(45 + Math.random() * 25) : Math.floor(75 + Math.random() * 20);
        if (cat === 'premium' || cat === 'hyper') cCond = Math.max(65, cCond);

        let isThick1 = (Math.random() > 0.6) ? Math.floor(200 + Math.random() * 300) : 115;
        let isThick2 = (Math.random() > 0.5) ? Math.floor(250 + Math.random() * 400) : 110;
        
        let engWear = hasHiddenDefect ? (40 + Math.random() * 30) : (75 + Math.random() * 20);
        let transWear = hasHiddenDefect ? (45 + Math.random() * 25) : (80 + Math.random() * 15);

        state.marketFeed.push({
            id: carId,
            name: cName,
            power: cPower,
            type: tType,
            basePrice: baseP,
            mileage: Math.floor(Math.random() * (tType === 'premium' ? 80000 : 180000)) + 15000,
            price: sellerPrice,
            baseMarketValue: baseVal,
            marketValue: baseVal + plateVal,
            img: cImg,
            plate: genPlate,
            isStolen: isStolen,
            autotekaChecked: false,
            cooldownUntil: 0,
            stoChecked: false,
            haggled: false,
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
            viewed: false
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
        container.innerHTML = "<div class='glass-card text-center py-6 sub-label'>Нет предложений на рынке. Выберите класс и нажмите «Обновить ленту»!</div>";
        return;
    }
    
    let htmlContent = "";
    
    state.marketFeed.forEach(car => {
        if (!car || car.unavailable) return;
        
        let isBusy = (car.cooldownUntil && car.cooldownUntil > now);
        let timeLeft = isBusy ? Math.ceil((car.cooldownUntil - now) / 1000) : 0;
        let hasScanner = !!(state.player && state.player.tools && (state.player.tools.obd || state.player.tools.obd_elm || state.player.tools.obd_launch));
        
        let carMileage = (typeof car.mileage === 'number') ? car.mileage.toLocaleString() : "85 000";
        let carPrice = (typeof car.price === 'number') ? car.price.toLocaleString() : "100 000";
        let carMarketVal = (typeof car.marketValue === 'number') ? car.marketValue.toLocaleString() : carPrice;
        let carType = car.type ? car.type.toUpperCase() : "CAR";
        let carImg = car.img ? car.img : "assets/cars/economy/vaz-2107.jpg";
        
        let viewedBadge = car.viewed ? "<div class='viewed-badge'><i class='fa-solid fa-eye'></i> Просмотрено</div>" : "";
        let busyClass = isBusy ? "busy" : "";
        let viewedClass = car.viewed ? "viewed-card" : "";
        let sellerNoteBlock = car.sellerNote ? "<div class='seller-note-card'>" + car.sellerNote + "</div>" : "";
        
        let toolIcon = (state.player && state.player.tools && (state.player.tools.gauge || state.player.tools.gauge_basic || state.player.tools.gauge_pro)) ? "✓" : "(3k)";
        let obdIcon = hasScanner ? "OBD2 ✓" : "OBD2 (5k)";
        let autoIcon = car.autotekaChecked ? "0" : "5k";

        let carName = car.name ? car.name : "Автомобиль";
        let carPower = car.power ? car.power : 100;
        let carPlate = car.plate ? car.plate : "ТРАНЗИТ";

        htmlContent += 
        "<div class='glass-card mb-3 " + busyClass + " " + viewedClass + "' id='card_" + car.id + "'>" +
            viewedBadge +
            "<div class='cooldown-timer'>" +
                "<div class='timer-clock' id='timer_num_" + car.id + "'>" + timeLeft + "с</div>" +
                "<div class='timer-text'>Абонент занят</div>" +
                "<button onclick=\"paidCallMarketCar('" + car.id + "')\" class='btn btn-amber' style='width: 80%;'>Платный дозвон (1000 ₽)</button>" +
            "</div>" +
            "<div class='car-img-wrap'>" +
                "<img src='" + carImg + "' class='car-img' onerror=\"this.src='assets/cars/economy/vaz-2107.jpg'\">" +
                "<div class='badge-tag' style='bottom: 8px; right: 8px;'>" + carType + "</div>" +
                "<div class='plate-corner'><div class='license-plate'>" + carPlate + " <div class='license-flag'>RUS</div></div></div>" +
            "</div>" +
            "<div class='mb-2'>" +
                "<h4 class='font-bold'>" + carName + "</h4>" +
                "<div class='sub-label mb-2'>" + carPower + " л.с. / Пробег: " + carMileage + " км</div>" +
                sellerNoteBlock +
            "</div>" +
            "<div class='price-box'>" +
                "<div>" +
                    "<span class='text-xs color-green font-bold'>ЦЕНА:</span>" +
                    "<div class='price-val' id='price_txt_" + car.id + "'>" + carPrice + " ₽</div>" +
                "</div>" +
                "<div class='sub-label'>Рыночная: ~" + carMarketVal + " ₽</div>" +
            "</div>" +
            "<div class='grid-3 mb-2'>" +
                "<button onclick=\"openGaugeModal('" + car.id + "')\" class='btn btn-dark btn-sm'>Толщиномер " + toolIcon + "</button>" +
                "<button onclick=\"quickOBDScanMarketCar('" + car.id + "')\" class='btn btn-dark btn-sm'>" + obdIcon + "</button>" +
                "<button onclick=\"openAutotekaModal('" + car.id + "')\" class='btn btn-dark btn-sm'>Автотека (" + autoIcon + ")</button>" +
            "</div>" +
            "<button onclick=\"initiateBuyMarketCar('" + car.id + "')\" class='btn btn-cyan w-full'>" +
                "<i class='fa-solid fa-phone'></i> Позвонить продавцу" +
            "</button>" +
        "</div>";
    });
    
    container.innerHTML = htmlContent;
    if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
}

function quickOBDScanMarketCar(carId) {
    const car = state.marketFeed.find(c => c && c.id === carId);
    if (!car) return;
    car.viewed = true;

    let hasScanner = !!(state.player && state.player.tools && (state.player.tools.obd || state.player.tools.obd_elm || state.player.tools.obd_launch));

    if (!hasScanner) {
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;
        if (cash < 5000) return showToast("Нужно 5,000 ₽ на выездного диагноста или сканер из Маркета!");
        state.player.cash -= 5000;
        showToast("Выездной мастер подключил сканер (-5,000 ₽)");
    } else {
        showToast("Подключен ваш собственный диагностический сканер ✓");
    }

    car.stoChecked = true;
    saveState();
    renderMarketFeed();

    if (car.hiddenDefect) {
        let costStr = car.hiddenDefect.cost ? car.hiddenDefect.cost.toLocaleString() : "10 000";
        openVerdictModal("ОШИБКИ В ЭБУ! ⚠️", "Сканер считал неисправность: " + car.hiddenDefect.text + ". Затраты на ремонт: ~" + costStr + " ₽.", false);
    } else {
        let eng = car.wear?.engine ? Math.round(car.wear.engine) : 90;
        let trans = car.wear?.transmission ? Math.round(car.wear.transmission) : 90;
        openVerdictModal("ОШИБОК НЕТ ✓", "ЭБУ чист. Ресурс двигателя: " + eng + "%, трансмиссии: " + trans + "%.", true);
    }
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
    setTxt("buyCallDesc", "Соединение с абонентом... Идут гудки...");
    const btnBox = document.getElementById("buyCallActionBtnBox"); 
    if (btnBox) btnBox.innerHTML = "<button class='btn btn-dark w-full' disabled>Гудки в трубке...</button>";
    
    const modal = document.getElementById("modalBuyCall");
    if (modal) modal.classList.add('active'); 
    tgHaptic('light');

    setTimeout(() => {
        let karma = (state.player && state.player.karma) ? state.player.karma : 50;
        let callSuccessChance = 55;
        if (karma > 60) callSuccessChance += 10;
        if (car.type === 'premium' || car.type === 'hyper') callSuccessChance -= 15;
        
        const roll = Math.random() * 100;

        if (roll < callSuccessChance) { 
            closeModal("modalBuyCall"); 
            openMarketDeal(carId); 
        } else if (roll < 85) { 
            const waitSec = Math.floor(20 + Math.random() * 25);
            car.cooldownUntil = Date.now() + (waitSec * 1000); 
            setTxt("buyCallEmoji", "📵"); 
            setTxt("buyCallTitle", "Абонент сбросил"); 
            setTxt("buyCallDesc", "«Не могу говорить, перезвоните через " + waitSec + " сек!»"); 
            if (btnBox) btnBox.innerHTML = "<button onclick=\"closeModal('modalBuyCall')\" class='btn btn-dark w-full'>Понятно</button>";
            saveState(); 
            renderMarketFeed();
        } else { 
            setTxt("buyCallEmoji", "❌"); 
            setTxt("buyCallTitle", "Объявление снято"); 
            setTxt("buyCallDesc", "«Только что внесли задаток, машина ушла!»"); 
            car.unavailable = true; 
            saveState(); 
            renderMarketFeed(); 
            if (btnBox) btnBox.innerHTML = "<button onclick=\"closeModal('modalBuyCall')\" class='btn btn-dark w-full'>Закрыть</button>"; 
        }
    }, 1200);
}

function paidCallMarketCar(carId) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < 1000) return showToast("Не хватает 1000 ₽ на платный дозвон!");
    state.player.cash -= 1000;
    
    const carIndex = state.marketFeed.findIndex(c => c && c.id === carId); 
    if (carIndex === -1) return; 
    const car = state.marketFeed[carIndex];

    let successChance = 0.70;
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    if (lvl >= 10 || (state.player && state.player.policeImmunityDays > 0)) {
        successChance = 0.85;
    }

    if (Math.random() < successChance) {
        car.cooldownUntil = 0; 
        saveState(); 
        renderMarketFeed();
        playSound('win');
        tgHaptic('success');
        showToast("Успешный дозвон по приоритетной линии!");
        openMarketDeal(carId);
    } else {
        car.cooldownUntil = Date.now() + 8000;
        saveState();
        renderMarketFeed();
        tgHaptic('error');
        showToast("📵 Абонент отклонил второй вызов! Попробуйте позже.");
    }
}

function updateMarketRiskPreview(pct) {
    const text = document.getElementById("marketHaggleRiskText");
    const fill = document.getElementById("marketHaggleRiskFill");
    if (!text || !fill) return;

    if (pct === 3) {
        text.innerText = "Низкий (~15%)";
        text.className = "color-green";
        fill.className = "risk-fill risk-low";
        fill.style.width = "20%";
    } else if (pct === 7) {
        text.innerText = "Умеренный (~50%)";
        text.className = "color-amber";
        fill.className = "risk-fill risk-mid";
        fill.style.width = "55%";
    } else {
        text.innerText = "Критический (~85%)";
        text.className = "color-red";
        fill.className = "risk-fill risk-high";
        fill.style.width = "90%";
    }
}

function openMarketDeal(carId) {
    const carIndex = state.marketFeed.findIndex(c => c && c.id === carId); 
    if (carIndex === -1) return; 
    const car = state.marketFeed[carIndex];
    pendingMarketCar = { car: car, carIndex: carIndex };
    
    const imgEl = document.getElementById("dealCarImg");
    if (imgEl) {
        imgEl.src = car.img ? car.img : "";
    }
    
    let cName = car.name ? car.name : "Авто";
    setTxt("dealCarTitle", cName); 
    
    let mileageStr = car.mileage ? car.mileage.toLocaleString() : "0";
    let plateStr = car.plate ? car.plate : "ТРАНЗИТ";
    setTxt("dealCarMileageInfo", "Пробег: " + mileageStr + " км / Госномер: " + plateStr);
    
    let priceStr = car.price ? car.price.toLocaleString() : "0";
    setTxt("dealCarPrice", priceStr + " ₽");
    
    const avatars = ["👨‍💼", "🧔", "😎", "👨‍🔧", "🧑‍💻", "🕵️‍♂️"];
    const names = ["Сергей", "Алексей", "Дмитрий", "Артем", "Михаил", "Игорь"];
    let numSum = 0;
    for (let k = 0; k < carId.length; k++) {
        numSum += carId.charCodeAt(k);
    }
    const randIdx = numSum % avatars.length;
    
    const sellerTitle = names[randIdx];
    pendingMarketCar.sellerName = sellerTitle;
    setTxt("dealSellerAvatar", avatars[randIdx]);
    setTxt("dealSellerName", sellerTitle + " (Продавец)");

    const thread = document.getElementById("dealChatThread");
    if (thread) {
        thread.innerHTML = "<div class='chat-msg msg-seller'>«Алло, да, продаю. Машина в порядке, сел и поехал. Что интересует?»</div>";
    }

    const haggleArea = document.getElementById("dealHaggleArea");
    if (haggleArea) {
        if (car.haggled) {
            haggleArea.style.display = "none";
        } else {
            haggleArea.style.display = "block";
            haggleArea.innerHTML = 
                "<div class='risk-meter-box mb-2'>" +
                    "<div class='flex-between text-xs'>" +
                        "<span>Риск срыва переговоров:</span>" +
                        "<b id='marketHaggleRiskText' class='color-green'>Низкий (~15%)</b>" +
                    "</div>" +
                    "<div class='risk-track'>" +
                        "<div id='marketHaggleRiskFill' class='risk-fill risk-low' style='width: 20%;'></div>" +
                    "</div>" +
                "</div>" +
                "<div class='grid-3'>" +
                    "<button onmouseenter='updateMarketRiskPreview(3)' onclick='attemptMarketHaggle(3)' class='btn btn-dark btn-sm'>" +
                        "-3%<br><span class='color-green text-xs'>Мягко</span>" +
                    "</button>" +
                    "<button onmouseenter='updateMarketRiskPreview(7)' onclick='attemptMarketHaggle(7)' class='btn btn-dark btn-sm'>" +
                        "-7%<br><span class='color-amber text-xs'>Напор</span>" +
                    "</button>" +
                    "<button onmouseenter='updateMarketRiskPreview(12)' onclick='attemptMarketHaggle(12)' class='btn btn-dark btn-sm'>" +
                        "-12%<br><span class='color-red text-xs'>Нагло</span>" +
                    "</button>" +
                "</div>";
        }
    }
    const modal = document.getElementById("modalMarketDeal");
    if (modal) modal.classList.add('active'); 
    playSound('tick');
}

function attemptMarketHaggle(percent) {
    if (!pendingMarketCar) return; 
    const car = pendingMarketCar.car;
    if (car.haggled) return showToast("Продавец больше не пойдет на уступки!");
    
    let successChance = 15;
    if (percent === 3) successChance = 85;
    else if (percent === 7) successChance = 50;

    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    let karma = (state.player && state.player.karma) ? state.player.karma : 50;
    
    successChance += (lvl * 0.5);
    if (karma > 60) successChance += 10;
    if (car.type === 'premium' || car.type === 'hyper') successChance -= 15;

    car.haggled = true; 
    const hArea = document.getElementById("dealHaggleArea");
    if (hArea) hArea.style.display = "none";
    
    const thread = document.getElementById("dealChatThread");

    if (Math.random() * 100 <= successChance) {
        let carPriceNum = car.price ? car.price : 100000;
        const disc = Math.round(carPriceNum * (percent / 100)); 
        car.price = Math.max(10000, carPriceNum - disc); 
        setTxt("dealCarPrice", car.price.toLocaleString() + " ₽"); 
        
        if (thread) {
            thread.innerHTML += 
                "<div class='chat-msg msg-player'>«Скинь " + percent + "%, забираю прямо сейчас за наличку без лишних вопросов.»</div>" +
                "<div class='chat-msg msg-seller'>«Ладно, по рукам... Скину " + disc.toLocaleString() + " ₽. Оформляем ДКП!»</div>";
            thread.scrollTop = thread.scrollHeight;
        }
        playSound('win'); 
        tgHaptic('success');
    } else {
        if (thread) {
            thread.innerHTML += 
                "<div class='chat-msg msg-player'>«Скидывай цену, на ней шпакли в два пальца!»</div>" +
                "<div class='chat-msg msg-seller'>«Слышь, не нравится — иди пешком ходи! Торга нет, цена окончательная.»</div>";
            thread.scrollTop = thread.scrollHeight;
        }
        tgHaptic('error');
    }
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

    // Инициализация интерактивного бланка ДКП для покупки ТС
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
        finishMarketCarBuyProcess(activePendingDKPDeal);
    }
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
    newCar.insurance = null; // Новая машина пока без страховки
    newCar.purchaseCost = price;
    newCar.wear = car.wear ? car.wear : { engine: 85, transmission: 85 };
    newCar.preSaleVisited = false;
    
    // Чистый тюнинг для купленного автомобиля
    newCar.tuning = { 
        chip: 0, exhaust: false, stance: false, bodykit: false, 
        rollCage: false, dragSlicks: false, hydroHandbrake: false, 
        weldedDiff: false, steeringAngle: false, bucketSeats: false, 
        customWheels: false, risk1251: 0 
    };

    state.garage.push(newCar);
    
    if (state.marketFeed && state.marketFeed.length > carIndex) {
        state.marketFeed.splice(carIndex, 1);
    }
    
    pendingMarketCar = null; 
    activePendingDKPDeal = null;
    addXp(40);
    
    let carName = car.name ? car.name : "Авто";
    showToast("✅ " + carName + " куплен за " + price.toLocaleString() + " ₽!"); 
    spawnFloatingReward("-" + price.toLocaleString() + " ₽");
    
    saveState(); 
    renderMarketFeed(); 
    renderGarage(); 
    setTimeout(() => { switchTab("tabGarage"); }, 400);
}

function openGaugeModal(carId) { 
    activeInspectCarId = carId; 
    if (!state.marketFeed) return;
    const car = state.marketFeed.find(c => c && c.id === carId); 
    if (car) car.viewed = true;

    let hasGauge = !!(state.player && state.player.tools && (state.player.tools.gauge || state.player.tools.gauge_basic || state.player.tools.gauge_pro));

    if (!hasGauge) {
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;
        if (cash < 3000) return showToast("Купите толщиномер в Маркете или отдайте 3,000 ₽ за замер!"); 
        state.player.cash -= 3000; 
    }

    saveState(); 
    const modal = document.getElementById("modalGauge");
    if (modal) modal.classList.add('active'); 
    renderMarketFeed();
}

function checkBodyPart(part) { 
    if (!activeInspectCarId || !state.marketFeed) return; 
    const car = state.marketFeed.find(c => c && c.id === activeInspectCarId); 
    if (!car || !car.bodyThickness) return; 
    
    playSound('tick'); 
    tgHaptic('light'); 
    
    let val = car.bodyThickness[part] ? car.bodyThickness[part] : 100;

    const el = document.getElementById("part-" + part); 
    if (el) {
        if (val > 200) {
            el.innerHTML = "<span class='color-red'>" + val + " мкм (Шпакля)</span>";
        } else {
            el.innerHTML = "<span class='color-green'>" + val + " мкм (Завод)</span>";
        }
    }
}

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
        let dtpCount = car.hiddenDefect ? "2 ДТП (В расчётах)" : "ДТП не найдены";
        let dtpBadgeClass = car.hiddenDefect ? "bg-tag-red" : "bg-tag-green";
        
        let legalStatus = car.isStolen 
            ? "<span class='tag-badge bg-tag-red'>🚨 В РОЗЫСКЕ / ПЕРЕБИТ VIN</span>" 
            : "<span class='tag-badge bg-tag-green'>✓ ЮРИДИЧЕСКИ ЧИСТ</span>";

        let mVal = car.mileage ? car.mileage : 85000;
        let mileagePercent = Math.min(100, Math.round((mVal / 250000) * 100));
        let odoWarning = car.rolledOdometer 
            ? "<span class='color-red text-xs font-bold'>⚠ Зафиксирована скрутка пробега!</span>" 
            : "<span class='color-green text-xs'>✓ Пробег подтвержден станциями ТО</span>";

        let engWear = car.wear?.engine ? Math.round(car.wear.engine) : 85;
        let transWear = car.wear?.transmission ? Math.round(car.wear.transmission) : 85;
        let avgTech = Math.round((engWear + transWear) / 2);

        rep.innerHTML = 
            "<div class='flex-between mb-2'>" +
                "<div>" +
                    "<b class='color-cyan' style='font-size:13px;'>" + cName + "</b>" +
                    "<div class='sub-label'>Госномер: <span class='license-plate text-xs' style='padding:1px 4px;'>" + cPlate + "</span></div>" +
                "</div>" +
                legalStatus +
            "</div>" +

            "<div class='p-2 mb-2' style='background:#0d1424; border-radius:8px; border:1px solid rgba(255,255,255,0.06);'>" +
                "<div class='flex-between text-xs mb-1'>" +
                    "<span>Зафиксированный пробег:</span>" +
                    "<b class='color-amber'>" + mVal.toLocaleString() + " км</b>" +
                "</div>" +
                "<div class='biz-progress-track'><div class='biz-progress-fill fill-biz-stock' style='width:" + mileagePercent + "%;'></div></div>" +
                "<div class='text-right'>" + odoWarning + "</div>" +
            "</div>" +

            "<div class='p-2 mb-2' style='background:#0d1424; border-radius:8px; border:1px solid rgba(255,255,255,0.06);'>" +
                "<div class='flex-between text-xs mb-1'>" +
                    "<span>Ресурс силовых агрегатов:</span>" +
                    "<b class='color-green'>" + avgTech + "%</b>" +
                "</div>" +
                "<div class='biz-progress-track'><div class='biz-progress-fill fill-biz-lvl' style='width:" + avgTech + "%;'></div></div>" +
                "<div class='sub-label text-xs'>Мотор: " + engWear + "% | КПП: " + transWear + "%</div>" +
            "</div>" +

            "<div class='flex-between text-xs p-2' style='background:#0d1424; border-radius:8px; border:1px solid rgba(255,255,255,0.06);'>" +
                "<span>История ДТП и расчёты ремонтов:</span>" +
                "<span class='tag-badge " + dtpBadgeClass + "'>" + dtpCount + "</span>" +
            "</div>";
    }
    
    const modal = document.getElementById("modalAutoteka");
    if (modal) modal.classList.add('active'); 
    playSound('tick');
    renderMarketFeed();
}

function updateMarketTimers() {
    if (!state.marketFeed) return;
    const now = Date.now();
    let needRender = false;
    state.marketFeed.forEach(car => {
        if (!car) return;
        if (car.cooldownUntil && car.cooldownUntil > now) {
            const timeLeft = Math.ceil((car.cooldownUntil - now) / 1000);
            const el = document.getElementById("timer_num_" + car.id);
            if (el) el.innerText = timeLeft + "с";
        } else if (car.cooldownUntil && car.cooldownUntil <= now) {
            car.cooldownUntil = 0;
            needRender = true;
        }
    });
    if (needRender) renderMarketFeed();
}
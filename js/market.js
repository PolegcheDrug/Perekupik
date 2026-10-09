const PLATE_LETTERS = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];
const REGIONS = ['77', '99', '97', '177', '199', '777', '799', '50', '90', '150', '190', '750'];

function generateNormalPlate() {
    const l1 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
    const l2 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
    const l3 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
    let num = String(Math.floor(Math.random() * 899) + 100);
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
        const p = isCool ? generateCoolPlate() : generateNormalPlate();
        state.plateCatalog.push({ plate: p, price: Math.round(evaluatePlate(p) * (1.1 + Math.random() * 0.25)) });
    }
}

let activeInspectCarId = null;
let pendingMarketCar = null;

function getDynamicPrice(basePrice, type) {
    if (!state.marketModifiers) state.marketModifiers = { economy: 1, comfort: 1, premium: 1, all: 1 };
    const mod = (state.marketModifiers && state.marketModifiers[type]) ? state.marketModifiers[type] : 1;
    const globalMod = (state.marketModifiers && state.marketModifiers.all) ? state.marketModifiers.all : 1;
    const price = basePrice ? basePrice : 100000;
    return Math.floor(price * mod * globalMod);
}

function getMarketRefreshCost() {
    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;
    return 150 + (lvl * 350);
}

function setCategory(cat) {
    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;
    
    if (cat === 'moto' && lvl < 16) return showToast("🔒 Нужен 16 ур!");
    if (cat === 'atv' && lvl < 16) return showToast("🔒 Нужен 16 ур!");
    if (cat === 'comfort' && lvl < 30) return showToast("🔒 Нужен 30 ур!");
    if (cat === 'premium' && lvl < 30) return showToast("🔒 Нужен 30 ур!");
    if (cat === 'hyper' && lvl < 50) return showToast("🔒 Нужен 50 ур!");
    if (cat === 'truck' && lvl < 50) return showToast("🔒 Нужен 50 ур!");
    if (cat === 'yacht' && lvl < 100) return showToast("🔒 Нужен 100 ур!");
    
    state.activeCategory = cat;
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    const btn = document.getElementById("catBtn-" + cat);
    if (btn) btn.classList.add('active');
    populateMarketFeed();
}

function refreshMarketFeedManual() {
    const cost = getMarketRefreshCost();
    let pCash = 0;
    let pFuel = 0;
    if (state.player && state.player.cash) pCash = state.player.cash;
    if (state.player && state.player.fuel) pFuel = state.player.fuel;

    if (pCash < cost) return showToast("Не хватает " + cost.toLocaleString() + " ₽!");
    if (pFuel < 5) return showToast("Закончился бензин ⛽!");
    
    state.player.cash -= cost;
    state.player.fuel -= 5;
    saveState();
    populateMarketFeed();
    renderMarketFeed();
    showToast("Лента обновлена (-5 ⛽)!");
}

function populateMarketFeed() {
    if (typeof CAR_DATABASE === 'undefined') return;
    if (!CAR_DATABASE) return;
    
    const cat = state.activeCategory ? state.activeCategory : 'economy';
    const pool = CAR_DATABASE[cat] ? CAR_DATABASE[cat] : CAR_DATABASE.economy;
    if (!pool) return;
    if (pool.length === 0) return;

    state.marketFeed = [];
    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;
    
    for (let i = 0; i < 8; i++) {
        const template = pool[i % pool.length];
        if (!template) continue;

        let defectChance = 0.45;
        if (lvl <= 5) defectChance = 0.35;
        else if (lvl >= 20) defectChance = 0.60;

        let stolenChance = 0.20;
        if (lvl <= 5) stolenChance = 0.12;
        else if (lvl >= 20) stolenChance = 0.28;

        const hasHiddenDefect = (typeof OBD_ERRORS !== 'undefined' && OBD_ERRORS.length > 0) ? (Math.random() < defectChance) : false;
        const isStolen = Math.random() < stolenChance;
        const carId = "m_" + Date.now() + "_" + i;
        const isCool = Math.random() < 0.20;
        const genPlate = isCool ? generateCoolPlate() : generateNormalPlate();
        const baseP = template.basePrice ? template.basePrice : 100000;
        const tType = template.type ? template.type : 'economy';
        const dynPrice = getDynamicPrice(baseP, tType);

        let priceMultiplier = 0.8;
        if (lvl <= 10) priceMultiplier = 0.75 + Math.random() * 0.20;
        else if (lvl >= 20) priceMultiplier = 0.85 + Math.random() * 0.30;
        else priceMultiplier = 0.80 + Math.random() * 0.25;

        const sellerPrice = Math.round(dynPrice * priceMultiplier);
        const baseVal = Math.round(dynPrice * 1.15);
        let defectObj = null;
        if (hasHiddenDefect && typeof OBD_ERRORS !== 'undefined') {
            defectObj = OBD_ERRORS[Math.floor(Math.random() * OBD_ERRORS.length)];
        }

        let sNote = "Хорошая машина, сел и поехал.";
        if (typeof SELLER_ADS_PHRASES !== 'undefined' && SELLER_ADS_PHRASES.length > 0) {
            sNote = SELLER_ADS_PHRASES[Math.floor(Math.random() * SELLER_ADS_PHRASES.length)];
        }

        const plateVal = evaluatePlate(genPlate);
        const cName = template.name ? template.name : "Автомобиль";
        const cPower = template.power ? template.power : 100;
        const cImg = template.img ? template.img : "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";

        state.marketFeed.push({
            id: carId,
            name: cName,
            power: cPower,
            type: tType,
            basePrice: baseP,
            mileage: Math.floor(Math.random() * 120000) + 18000,
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
            condition: hasHiddenDefect ? 55 : 85,
            tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 },
            wear: { engine: 65 + Math.random() * 30, transmission: 65 + Math.random() * 30 },
            bodyThickness: { hood: Math.random() > 0.6 ? 250 : 115, roof: 100, doors: Math.random() > 0.5 ? 260 : 110, wings: 110 },
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

    if (!state.marketFeed) {
        container.innerHTML = "<div class='glass-card text-center py-6 sub-label'>Нет предложений на рынке. Нажмите «Обновить ленту»!</div>";
        return;
    }
    if (state.marketFeed.length === 0) {
        container.innerHTML = "<div class='glass-card text-center py-6 sub-label'>Нет предложений на рынке. Нажмите «Обновить ленту»!</div>";
        return;
    }
    
    let htmlContent = "";
    
    state.marketFeed.forEach(car => {
        if (!car) return;
        if (car.unavailable) return;
        
        let isBusy = false;
        if (car.cooldownUntil) {
            if (car.cooldownUntil > now) isBusy = true;
        }
        const timeLeft = isBusy ? Math.ceil((car.cooldownUntil - now) / 1000) : 0;
        
        let hasScanner = false;
        if (state.player && state.player.tools && state.player.tools.obd) {
            hasScanner = true;
        }
        
        const carMileage = car.mileage ? car.mileage.toLocaleString() : "85 000";
        const carPrice = car.price ? car.price.toLocaleString() : "100 000";
        let carMarketVal = "150 000";
        if (car.marketValue) carMarketVal = car.marketValue.toLocaleString();
        else if (car.price) carMarketVal = car.price.toLocaleString();
        
        const carType = car.type ? car.type.toUpperCase() : "CAR";
        const carImg = car.img ? car.img : "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
        
        const viewedBadge = car.viewed ? "<div class='viewed-badge'><i class='fa-solid fa-eye'></i> Просмотрено</div>" : "";
        const busyClass = isBusy ? "busy" : "";
        const viewedClass = car.viewed ? "viewed-card" : "";
        const sellerNoteBlock = car.sellerNote ? "<div class='seller-note-card'>" + car.sellerNote + "</div>" : "";
        
        let toolIcon = "(3k)";
        if (state.player && state.player.tools && state.player.tools.gauge) {
            toolIcon = "✓";
        }
        
        const obdIcon = hasScanner ? "OBD2 ✓" : "OBD2 (5k)";
        const autoIcon = car.autotekaChecked ? "0" : "5k";
        const carName = car.name ? car.name : "Автомобиль";
        const carPower = car.power ? car.power : 100;
        const carPlate = car.plate ? car.plate : "ТРАНЗИТ";

        htmlContent += "<div class='glass-card mb-3 " + busyClass + " " + viewedClass + "' id='card_" + car.id + "'>" +
            viewedBadge +
            "<div class='cooldown-timer'>" +
                "<div class='timer-clock' id='timer_num_" + car.id + "'>" + timeLeft + "с</div>" +
                "<div class='timer-text'>Абонент занят</div>" +
                "<button onclick=\"paidCallMarketCar('" + car.id + "')\" class='btn btn-amber' style='width: 80%;'>Платный дозвон (1000 ₽)</button>" +
            "</div>" +
            "<div class='car-img-wrap'>" +
                "<img src='" + carImg + "' class='car-img' onerror=\"this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'\">" +
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
    const car = state.marketFeed.find(c => c.id === carId);
    if (!car) return;
    car.viewed = true;

    let hasScanner = false;
    if (state.player && state.player.tools && state.player.tools.obd) {
        hasScanner = true;
    }

    if (!hasScanner) {
        const cash = state.player && state.player.cash ? state.player.cash : 0;
        if (cash < 5000) return showToast("Нужно 5,000 ₽ на выездного диагноста или сканер из Маркета!");
        state.player.cash -= 5000;
        showToast("Выездной мастер подключил сканер (-5,000 ₽)");
    } else {
        showToast("Подключен ваш собственный OBD2-сканер ✓");
    }

    car.stoChecked = true;
    saveState();
    renderMarketFeed();

    if (car.hiddenDefect) {
        const costStr = car.hiddenDefect.cost ? car.hiddenDefect.cost.toLocaleString() : "10 000";
        openVerdictModal("ОШИБКИ В ЭБУ! ⚠️", "Сканер считал неисправность: " + car.hiddenDefect.text + ". Затраты на ремонт: ~" + costStr + " ₽.", false);
    } else {
        let eng = 90;
        if (car.wear && car.wear.engine) eng = Math.round(car.wear.engine);
        let trans = 90;
        if (car.wear && car.wear.transmission) trans = Math.round(car.wear.transmission);
        openVerdictModal("ОШИБОК НЕТ ✓", "ЭБУ чист. Ресурс двигателя: " + eng + "%, трансмиссии: " + trans + "%.", true);
    }
}

function initiateBuyMarketCar(carId) {
    const carIndex = state.marketFeed.findIndex(c => c.id === carId); 
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
        let karma = 50;
        if (state.player && state.player.karma) karma = state.player.karma;
        let callSuccessChance = 55;
        if (karma > 60) callSuccessChance += 10;
        if (car.type === 'premium') callSuccessChance -= 10;
        
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
    const cash = state.player && state.player.cash ? state.player.cash : 0;
    if (cash < 1000) return showToast("Не хватает 1000 ₽ на платный дозвон!");
    state.player.cash -= 1000;
    const carIndex = state.marketFeed.findIndex(c => c.id === carId); 
    if (carIndex === -1) return; 
    const car = state.marketFeed[carIndex];
    car.cooldownUntil = 0; 
    saveState(); 
    renderMarketFeed();
    openMarketDeal(carId);
}

function updateMarketRiskPreview(pct) {
    const text = document.getElementById("marketHaggleRiskText");
    const fill = document.getElementById("marketHaggleRiskFill");
    if (!text) return;
    if (!fill) return;

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
    const carIndex = state.marketFeed.findIndex(c => c.id === carId); 
    if (carIndex === -1) return; 
    const car = state.marketFeed[carIndex];
    pendingMarketCar = { car: car, carIndex: carIndex };
    
    const imgEl = document.getElementById("dealCarImg");
    if (imgEl) imgEl.src = car.img ? car.img : ""; 
    
    setTxt("dealCarTitle", car.name ? car.name : "Авто"); 
    const mileageStr = car.mileage ? car.mileage.toLocaleString() : "0";
    const plateStr = car.plate ? car.plate : "ТРАНЗИТ";
    setTxt("dealCarMileageInfo", "Пробег: " + mileageStr + " км / Госномер: " + plateStr);
    
    const priceStr = car.price ? car.price.toLocaleString() : "0";
    setTxt("dealCarPrice", priceStr + " ₽");
    
    const avatars = ["👨‍💼", "🧔", "😎", "👨‍🔧", "🧑‍💻"];
    const names = ["Сергей", "Алексей", "Дмитрий", "Артем", "Михаил"];
    let numSum = 0;
    for(let k=0; k<carId.length; k++){
        numSum += carId.charCodeAt(k);
    }
    const randIdx = numSum % avatars.length;
    
    setTxt("dealSellerAvatar", avatars[randIdx]);
    setTxt("dealSellerName", names[randIdx] + " (Продавец)");

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
    if (percent === 3) successChance = 80;
    else if (percent === 7) successChance = 45;

    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;
    let karma = 50;
    if (state.player && state.player.karma) karma = state.player.karma;
    
    successChance += (lvl * 0.5);
    if (karma > 60) successChance += 10;

    car.haggled = true; 
    const hArea = document.getElementById("dealHaggleArea");
    if (hArea) hArea.style.display = "none";
    
    const thread = document.getElementById("dealChatThread");

    if (Math.random() * 100 <= successChance) {
        const carPriceNum = car.price ? car.price : 100000;
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

function confirmMarketPurchaseSuccess() {
    if (!pendingMarketCar) return; 
    const car = pendingMarketCar.car;
    const carIndex = pendingMarketCar.carIndex;
    
    const maxSlots = getTotalGarageSlots(); 
    let currentSlots = 0;
    if (state.garage && state.garage.length) currentSlots = state.garage.length;

    if (currentSlots >= maxSlots) return showToast("Гараж полон! Вместимость: " + maxSlots + " мест.");
    
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;
    let price = 0;
    if (car.price) price = car.price;

    if (cash < price) return showToast("Недостаточно денег на выкуп!");
    
    closeModal("modalMarketDeal");
    state.player.cash -= price; 
    
    if (!state.player.stats) state.player.stats = {};
    if (!state.player.stats.bought) state.player.stats.bought = 0;
    state.player.stats.bought += 1;
    
    if (!state.garage) state.garage = [];
    
    const newCar = Object.assign({}, car);
    newCar.customPlate = car.plate;
    newCar.impounded = false;
    newCar.purchaseCost = price;
    newCar.wear = car.wear ? car.wear : { engine: 85, transmission: 85 };
    newCar.preSaleVisited = false;
    
    state.garage.push(newCar);
    
    if (state.marketFeed && state.marketFeed.length > carIndex) {
        state.marketFeed.splice(carIndex, 1);
    }
    
    pendingMarketCar = null; 
    addXp(40);
    
    const carName = car.name ? car.name : "Авто";
    showToast("✅ " + carName + " куплен за " + price.toLocaleString() + " ₽!"); 
    playSound('win'); 
    tgHaptic('success'); 
    spawnFloatingReward("-" + price.toLocaleString() + " ₽");
    
    saveState(); 
    renderMarketFeed(); 
    renderGarage(); 
    setTimeout(() => switchTab("tabGarage"), 350);
}

function openGaugeModal(carId) { 
    activeInspectCarId = carId; 
    if (!state.marketFeed) return;
    const car = state.marketFeed.find(c => c && c.id === carId); 
    if (car) car.viewed = true;

    let hasGauge = false;
    if (state.player && state.player.tools && state.player.tools.gauge) {
        hasGauge = true;
    }

    if (!hasGauge) {
        let cash = 0;
        if (state.player && state.player.cash) cash = state.player.cash;
        if (cash < 3000) return showToast("Купите толщиномер в Маркете или отдайте 3,000 ₽ за замер!"); 
        state.player.cash -= 3000; 
    }

    saveState(); 
    const modal = document.getElementById("modalGauge");
    if (modal) modal.classList.add('active'); 
    renderMarketFeed();
}

function checkBodyPart(part) { 
    if (!activeInspectCarId) return; 
    if (!state.marketFeed) return;
    const car = state.marketFeed.find(c => c && c.id === activeInspectCarId); 
    if (!car) return;
    if (!car.bodyThickness) return; 
    playSound('tick'); 
    tgHaptic('light'); 
    let val = 100;
    if (car.bodyThickness[part]) val = car.bodyThickness[part];

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
        let isVip = false;
        if (state.player && state.player.vipPro) isVip = true;
        const cost = isVip ? 0 : 5000; 
        
        let cash = 0;
        if (state.player && state.player.cash) cash = state.player.cash;
        
        if (cash < cost && !isVip) return showToast("Автотека стоит 5,000 ₽!");
        state.player.cash -= cost; 
        car.autotekaChecked = true; 
        saveState();
    }
    
    let stat = "<b class='color-green'>Юридически чист</b>";
    if (car.isStolen) stat = "<b class='color-red'>В РОЗЫСКЕ (Перебиты номера кузова)</b>";
        
    const rep = document.getElementById("autotekaReportContent"); 
    if (rep) { 
        const cName = car.name ? car.name : "Авто";
        const cPlate = car.plate ? car.plate : "";
        const cDefects = car.hiddenDefect ? "2" : "0";
        
        rep.innerHTML = 
            "<div class='mb-1 font-bold'>" + cName + " (" + cPlate + ")</div>" +
            "<div>ДТП в базе: <b>" + cDefects + " шт.</b></div>" +
            "<div class='mt-1'>Юридический статус: " + stat + "</div>"; 
    }
    const modal = document.getElementById("modalAutoteka");
    if (modal) modal.classList.add('active'); 
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

// ========================================================
// js/garage.js — ГАРАЖ, ИНДИВИДУАЛЬНЫЙ ТЮНИНГ ТАЧЕК, OBD2 (v0.4.2)
// ========================================================

let selectedCarIndex = null; 
let activePreSaleCarIndex = null; 
let carToLotIndex = null;
let obdActiveCarIdx = null;
let pendingBarterCar = null;
let activeTuneTab = 'drag';

function calculatePlateValue(plateStr) {
    if (!plateStr) return 0;
    if (String(plateStr).startsWith('ТРАНЗИТ')) return 0;
    const parts = String(plateStr).split(' ');
    if (parts.length < 2) return 0;

    const main = parts[0];
    const reg = parts[1];
    const num = main.replace(/[^0-9]/g, '');
    const letters = main.replace(/[^А-Яа-я]/g, '');

    let value = 1500;

    if (num === '777' || num === '007' || num === '001') { value += 850000; }
    else if (num.length === 3 && num[0] === num[1] && num[1] === num[2]) { value += 380000; }
    else if (num.startsWith('00')) { value += 120000; }
    else if (num.endsWith('00')) { value += 65000; }
    else if (num.length === 3 && num[0] === num[2]) { value += 15000; }

    if (letters.length === 3 && letters[0] === letters[1] && letters[1] === letters[2]) { value += 450000; }
    if (letters === 'АМР' || letters === 'ЕКХ') { value += 1500000; }
    if (letters === 'СКР' || letters === 'САС' || letters === 'ВОР' || letters === 'МММ') { value += 700000; }

    if (reg === '77' || reg === '99' || reg === '97' || reg === '777') {
        value = Math.round(value * 1.3);
    }

    if (value <= 2000) {
        return Math.floor(Math.random() * 1000) + 500;
    }

    return value;
}

function toggleMarketCategories() {
    const grid = document.getElementById('marketCatListContainer');
    const btnIcon = document.querySelector('#btnToggleMarketGrid i');
    if (!grid) return;
    grid.classList.toggle('collapsed');
    if (btnIcon) {
        if (grid.classList.contains('collapsed')) {
            btnIcon.className = "fa-solid fa-chevron-down";
        } else {
            btnIcon.className = "fa-solid fa-chevron-up";
        }
    }
}

function renderGarage() {
    const list = document.getElementById('garageList'); 
    if (!list) return; 
    
    const totalSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2; 
    let currentCount = (state.garage && state.garage.length) ? state.garage.length : 0;
    
    setTxt('garageDetailedSlots', currentCount + " из " + totalSlots + " боксов занято");
    
    const mainContent = document.querySelector('.main-content'); 
    const scrollPos = mainContent ? mainContent.scrollTop : 0;
    
    if (!state.garage || state.garage.length === 0) { 
        list.innerHTML = "<div class='glass-card text-center sub-label py-8'><i class='fa-solid fa-warehouse color-cyan mb-2' style='font-size:32px;'></i><div>Гараж пуст. Подберите технику на авторынке!</div></div>"; 
        return; 
    }
    
    let htmlContent = "";

    state.garage.forEach((car, idx) => {
        if (!car) return;
        
        let cost = car.purchaseCost ? car.purchaseCost : (car.basePrice ? car.basePrice : 100000);
        let carImg = car.img ? car.img : "assets/cars/economy/vaz-2107.jpg";
        let carType = car.type ? car.type.toUpperCase() : "ECONOMY";
        let carPlate = car.customPlate ? car.customPlate : (car.plate ? car.plate : "ТРАНЗИТ");
        let carPower = car.power ? car.power : 100;
        let carMileageStr = typeof car.mileage === 'number' ? car.mileage.toLocaleString() : "85 000";
        let carCondition = typeof car.condition === 'number' ? car.condition : 85;
        
        const plateVal = calculatePlateValue(carPlate);
        let baseVal = car.baseMarketValue ? car.baseMarketValue : (car.price ? car.price : 150000);
        const marketVal = baseVal + plateVal;
        car.marketValue = marketVal;

        let defectBlock = "";
        if (car.hiddenDefect) {
            let defectText = car.hasAdditive ? "Присадка залита (Стук заглушен)" : (car.hiddenDefect.text ? car.hiddenDefect.text : "Неисправность узлов");
            let dCost = car.hiddenDefect.cost ? car.hiddenDefect.cost : 10000;

            defectBlock = 
            "<div class='legal-warning mb-2'>" +
                "<span>⚠ <b>" + defectText + "</b></span>" +
                "<button onclick='repairCarDefect(" + idx + ")' class='btn btn-amber btn-auto btn-sm'>Капиталка (" + dCost.toLocaleString() + " ₽)</button>" +
            "</div>";
        } else if (car.isOverhauled) {
            defectBlock = "<div class='mb-2 text-xs color-green font-bold'><i class='fa-solid fa-check-circle'></i> Мотор после честной капиталки (+Карма)</div>";
        }

        let impoundedBlock = "";
        if (car.impounded) {
            let daysAtLot = car.impoundedDays ? car.impoundedDays : 1;
            let baseDailyRate = car.type === 'premium' ? 12000 : (car.type === 'comfort' ? 6000 : 3500);
            let iFine = car.impoundFine ? car.impoundFine : 30000;
            const totalParkingDebt = iFine + (daysAtLot * baseDailyRate);
            
            impoundedBlock = 
            "<div class='impound-debt-badge mb-2' style='background:rgba(255,51,102,0.15); border:1px solid var(--red); border-radius:8px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;'>" +
                "<div>" +
                    "<div>🚨 <b>ШТРАФСТОЯНКА (" + daysAtLot + " дн.)</b></div>" +
                    "<div class='sub-label color-red'>Долг: <b>" + totalParkingDebt.toLocaleString() + " ₽</b></div>" +
                "</div>" +
                "<button onclick='unimpoundCar(" + idx + ")' class='btn btn-cyan btn-auto btn-sm'>Вызволить</button>" +
            "</div>";
        }

        let unregBlock = "";
        if (car.unregistered) {
            unregBlock = 
            "<div class='legal-warning mb-2' style='background:rgba(255,179,0,0.15); border-color:var(--amber); color:#fde68a;'>" +
                "<div>" +
                    "<div>🚫 <b>УЧЁТ АННУЛИРОВАН (12.5.1)</b></div>" +
                    "<div class='sub-label' style='color:#fde68a;'>Запрет на выезд и продажу</div>" +
                "</div>" +
                "<div class='flex-gap'>" +
                    "<button onclick='registerCarAction(" + idx + ", \"sto\")' class='btn btn-dark btn-auto btn-sm' title='Снять нелегал и вернуть учёт'>СТО (35k)</button>" +
                    "<button onclick='registerCarAction(" + idx + ", \"reshala\")' class='btn btn-purple btn-auto btn-sm' title='Поставить через связи без снятия'>Решала (2 🤝)</button>" +
                "</div>" +
            "</div>";
        }

        let insuranceBadge = "";
        if (car.insurance === 'casco') {
            insuranceBadge = "<span class='tag-badge bg-tag-green' style='margin-left:4px;'>🛡️ КАСКО</span>";
        } else if (car.insurance === 'osago') {
            insuranceBadge = "<span class='tag-badge bg-tag-cyan' style='margin-left:4px;'>📋 ОСАГО</span>";
        }

        let isBlocked = car.impounded || car.unregistered;
        let dangerClass = (car.hiddenDefect && !car.hasAdditive) ? "card-danger" : "";
        let bonusPlateBlock = plateVal > 5000 
            ? "<div class='text-xs color-cyan font-bold'>+" + plateVal.toLocaleString() + " ₽ за номер</div>" 
            : "";

        htmlContent += 
        "<div class='glass-card mb-3 " + dangerClass + "'>" +
            "<div class='car-img-wrap' style='height: 140px;'>" +
                "<img src='" + carImg + "' class='car-img' onerror=\"this.src='assets/cars/economy/vaz-2107.jpg'\">" +
                "<div class='badge-tag' style='bottom: 8px; right: 8px;'>" + carType + insuranceBadge + "</div>" +
                "<div class='plate-corner'><div class='license-plate'>" + carPlate + " <div class='license-flag'>RUS</div></div></div>" +
            "</div>" +
            "<div class='flex-between mb-2'>" +
                "<div>" +
                    "<h4 class='font-bold'>" + car.name + "</h4>" +
                    "<div class='sub-label'>" + carPower + " л.с. / Пробег: " + carMileageStr + " км / Сост: " + carCondition + "%</div>" +
                    "<div class='text-xs color-amber mt-1'>Куплена за: <b>" + cost.toLocaleString() + " ₽</b></div>" +
                "</div>" +
                "<div class='text-right'>" +
                    "<div class='sub-label'>Оценка:</div>" +
                    "<div class='price-val'>" + marketVal.toLocaleString() + " ₽</div>" +
                    bonusPlateBlock +
                "</div>" +
            "</div>" +
            defectBlock +
            impoundedBlock +
            unregBlock +
            "<div class='grid-2 mb-2'>" +
                "<button onclick='openPreviewModal(" + idx + ")' class='btn btn-dark'>🔍 Осмотр / Звук</button>" +
                "<button onclick='openPreSaleModal(" + idx + ")' class='btn btn-dark' " + (isBlocked ? "disabled" : "") + ">🪄 Предпродажка</button>" +
            "</div>" +
            "<div class='grid-2 mb-2'>" +
                "<button onclick='openTuningModal(" + idx + ")' class='btn btn-dark' " + (isBlocked ? "disabled" : "") + ">🛠 Тюнинг</button>" +
                "<button onclick='openPutOnLotModal(" + idx + ")' class='btn btn-green' " + (isBlocked ? "disabled" : "") + ">🏪 На площадку</button>" +
            "</div>" +
            "<button onclick='scrapCar(" + idx + ")' class='btn btn-dark btn-sm w-full'>Сдать на разборку (-35% стоимости)</button>" +
        "</div>";
    });

    list.innerHTML = htmlContent;
    if (mainContent) {
        requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
    }
}

function registerCarAction(idx, method) {
    const car = state.garage[idx];
    if (!car || !car.unregistered) return;

    if (method === 'sto') {
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;
        if (cash < 35000) return showToast("Нужно 35,000 ₽ на демонтаж тюнинга и техосмотр!");
        
        state.player.cash -= 35000;
        if (car.tuning) {
            car.tuning.exhaust = false;
            car.tuning.stance = false;
            car.tuning.bodykit = false;
            car.tuning.hydroHandbrake = false;
            car.tuning.weldedDiff = false;
            car.tuning.steeringAngle = false;
            car.tuning.risk1251 = 0;
        }
        car.unregistered = false;
        saveState();
        renderGarage();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("УЧЁТ ВОССТАНОВЛЕН! 📋", "Мастера СТО демонтировали тюнинг и прошли техосмотр. Машина снова чиста перед ДПС!", true);
    } else if (method === 'reshala') {
        let conn = (state.player && state.player.connections) ? state.player.connections : 0;
        if (conn < 2) return showToast("Нужно 2 Связи 🤝 для звонка Артуру!");

        state.player.connections -= 2;
        car.unregistered = false;
        saveState();
        renderGarage();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("ВОПРОС РЕШЁН! 🕵️‍♂️", "Решала уладил аннулирование в базе ГИБДД без снятия тюнинга. Учёт восстановлен за 2 Связи!", true);
    }
}

function buyGarageSlot() { 
    const cost = (typeof getGarageSlotCost === 'function') ? getGarageSlotCost() : 250000;
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;

    if (cash < cost) return showToast("Нужно " + cost.toLocaleString() + " ₽ на расширение!"); 
    state.player.cash -= cost; 

    let bSlots = (state.player && state.player.baseSlots) ? state.player.baseSlots : 2;
    state.player.baseSlots = bSlots + 1; 

    saveState(); 
    renderGarage(); 
    showToast("Гараж расширен! Добавлен +1 бокс."); 
}

function scrapCar(idx) {
    const car = state.garage[idx]; 
    if (!car) return;
    
    let baseVal = car.baseMarketValue ? car.baseMarketValue : (car.price ? car.price : 100000);
    const scrapPrice = Math.round(baseVal * 0.65);
    state.player.cash = (state.player.cash || 0) + scrapPrice; 
    
    let mood = (state.player && state.player.mood) ? state.player.mood : 85;
    state.player.mood = Math.max(0, mood - 10);
    
    if (!state.player.stats) state.player.stats = {};
    state.player.stats.sold = (state.player.stats.sold || 0) + 1;
    
    state.garage.splice(idx, 1); 
    saveState(); 
    renderGarage(); 
    showToast("Авто сдано на разбор за " + scrapPrice.toLocaleString() + " ₽");
}

function openPreviewModal(idx) {
    selectedCarIndex = idx; 
    const car = state.garage[idx]; 
    if (!car) return;

    let cPlate = car.customPlate ? car.customPlate : (car.plate ? car.plate : "ТРАНЗИТ");
    const plateVal = calculatePlateValue(cPlate);
    let baseVal = car.baseMarketValue ? car.baseMarketValue : (car.price ? car.price : 150000);
    const totalVal = baseVal + plateVal;

    const imgEl = document.getElementById("prevImg");
    if (imgEl) {
        imgEl.src = car.img ? car.img : "assets/cars/economy/vaz-2107.jpg";
    }
    
    let cType = car.type ? car.type : "car";
    setTxt("prevTypeBadge", cType.toUpperCase()); 
    
    const plateEl = document.getElementById("prevPlate");
    if (plateEl) {
        plateEl.innerHTML = cPlate + " <div class='license-flag'>RUS</div>";
    }
    
    let cName = car.name ? car.name : "Автомобиль";
    setTxt("prevTitle", cName); 
    
    let power = car.power ? car.power : 100;
    let cond = typeof car.condition === 'number' ? car.condition : 85;
    setTxt("prevSpecs", power + " л.с. / Состояние: " + cond + "%");
    setTxt("prevPrice", totalVal.toLocaleString() + " ₽"); 

    const obdBtn = document.getElementById("btnPreviewObdScan");
    if (obdBtn) {
        let hasScanner = !!(state.player && state.player.tools && (state.player.tools.obd || state.player.tools.obd_launch));
        if (hasScanner) {
            obdBtn.innerText = "OBD2 Сканер";
            obdBtn.className = "btn btn-cyan";
        } else {
            obdBtn.innerText = "🔒 Нужен OBD2";
            obdBtn.className = "btn btn-dark opacity-50";
        }
    }

    const modal = document.getElementById("modalPreview");
    if (modal) modal.classList.add('active');
}

function openTuningFromPreview() { 
    if (selectedCarIndex === null) return; 
    closeModal("modalPreview"); 
    openTuningModal(selectedCarIndex); 
}

// ----------------------------------------------------
// АВТОСТРАХОВАНИЕ (КАСКО / ОСАГО)
// ----------------------------------------------------
function openInsuranceModalFromPreview() {
    if (selectedCarIndex === null) return;
    const car = state.garage[selectedCarIndex];
    if (!car) return;

    setTxt('insureCarTitle', `${car.name} (${car.customPlate || car.plate || "ТРАНЗИТ"})`);
    closeModal('modalPreview');
    const modal = document.getElementById('modalInsurance');
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function confirmPurchaseInsurance(type) {
    if (selectedCarIndex === null) return;
    const car = state.garage[selectedCarIndex];
    if (!car) return;

    const cost = type === 'casco' ? 18000 : 7500;
    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Не хватает денег на оформление полиса!");

    state.player.cash -= cost;
    car.insurance = type;
    saveState();
    closeModal('modalInsurance');
    renderGarage();
    playSound('win');
    tgHaptic('success');
    openVerdictModal(
        "СТРАХОВКА ОФОРМЛЕНА! 🛡️", 
        `Полис ${type === 'casco' ? 'КАСКО' : 'ОСАГО'} успешно привязан к «${car.name}». Автомобиль защищён от потерь при ЧП!`, 
        true
    );
}

// ----------------------------------------------------
// ПРЕДПРОДАЖНАЯ ПОДГОТОВКА
// ----------------------------------------------------
function openPreSaleModal(idx) {
    const now = Date.now();
    if (state.player && state.player.preSaleCooldownUntil && state.player.preSaleCooldownUntil > now) {
        const mins = Math.ceil((state.player.preSaleCooldownUntil - now) / 60000);
        return showToast("Мастера на перерыве! Откроется через " + mins + " мин.");
    }
    
    activePreSaleCarIndex = idx; 
    const car = state.garage[idx]; 
    if (!car) return;

    let mVal = car.marketValue ? car.marketValue : 0;
    let cName = car.name ? car.name : "Авто";
    setTxt("preSaleCarTitle", cName + " (Оценка: " + mVal.toLocaleString() + " ₽)"); 
    
    let washLevel = 0;
    let stoLevel = 0;
    if (state.businesses) {
        const w = state.businesses.find(b => b.id === 'wash');
        if (w) washLevel = w.level;
        const s = state.businesses.find(b => b.id === 'sto');
        if (s) stoLevel = s.level;
    }
    
    let cleanCost = washLevel >= 3 ? 0 : (washLevel > 0 ? 2000 : 4000);
    let paintCost = stoLevel > 0 ? 6000 : 12000;
    
    const btnClean = document.getElementById("btnCleanPrice");
    const btnPaint = document.getElementById("btnPaintPrice");
    const btnAdditive = document.getElementById("btnAdditivePrice");
    const btnOdometer = document.getElementById("btnOdometerPrice");

    if (btnClean) { 
        if (car.isPolished) {
            btnClean.innerText = "Готово ✓";
            btnClean.disabled = true;
            btnClean.className = "btn btn-dark btn-sm opacity-50";
        } else {
            btnClean.innerText = cleanCost.toLocaleString() + " ₽";
            btnClean.disabled = false;
            btnClean.className = "btn btn-cyan btn-sm";
        }
    }
    if (btnPaint) { 
        if (car.isRepainted) {
            btnPaint.innerText = "Готово ✓";
            btnPaint.disabled = true;
            btnPaint.className = "btn btn-dark btn-sm opacity-50";
        } else {
            btnPaint.innerText = paintCost.toLocaleString() + " ₽";
            btnPaint.disabled = false;
            btnPaint.className = "btn btn-dark btn-sm";
        }
    }
    if (btnAdditive) { 
        if (car.hasAdditive) {
            btnAdditive.innerText = "Готово ✓";
            btnAdditive.disabled = true;
            btnAdditive.className = "btn btn-dark btn-sm opacity-50";
        } else {
            btnAdditive.innerText = "6,000 ₽";
            btnAdditive.disabled = false;
            btnAdditive.className = "btn btn-amber btn-sm";
        }
    }
    if (btnOdometer) { 
        if (car.rolledOdometer) {
            btnOdometer.innerText = "Скручен ✓";
            btnOdometer.disabled = true;
            btnOdometer.className = "btn btn-dark btn-sm opacity-50";
        } else {
            btnOdometer.innerText = "8,000 ₽";
            btnOdometer.disabled = false;
            btnOdometer.className = "btn btn-danger btn-sm";
        }
    }

    const modal = document.getElementById("modalPreSale");
    if (modal) modal.classList.add('active');
}

function applyPreSaleMod(type) {
    if (activePreSaleCarIndex === null) return; 
    const car = state.garage[activePreSaleCarIndex]; 
    if (!car) return;
    
    let washLevel = 0;
    let stoLevel = 0;
    if (state.businesses) {
        const w = state.businesses.find(b => b.id === 'wash');
        if (w) washLevel = w.level;
        const s = state.businesses.find(b => b.id === 'sto');
        if (s) stoLevel = s.level;
    }
    
    let cleanCost = washLevel >= 3 ? 0 : (washLevel > 0 ? 2000 : 4000);
    let paintCost = stoLevel > 0 ? 6000 : 12000;
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;

    if (type === 'clean') { 
        if (car.isPolished) return showToast("Уже отполировано!");
        if (cash < cleanCost) return showToast("Не хватает денег!"); 
        state.player.cash -= cleanCost; 
        car.isPolished = true; 
        
        let bmVal = car.baseMarketValue ? car.baseMarketValue : (car.price ? car.price : 100000);
        car.baseMarketValue = Math.round(bmVal * 1.05); 
        
        let cPlate = car.customPlate ? car.customPlate : (car.plate ? car.plate : "ТРАНЗИТ");
        car.marketValue = car.baseMarketValue + calculatePlateValue(cPlate); 
        showToast("✨ Фары сияют, салон как новый! +5% к цене."); 
    } else if (type === 'paint') { 
        if (car.isRepainted) return showToast("Уже окрашено!");
        if (cash < paintCost) return showToast("Не хватает денег!"); 
        state.player.cash -= paintCost; 
        
        let cCond = (car.condition !== undefined) ? car.condition : 85;
        car.condition = Math.min(100, cCond + 20); 
        car.isRepainted = true; 
        if (!car.bodyThickness) car.bodyThickness = { hood: 110, roof: 100, doors: 110, wings: 105 };
        car.bodyThickness.doors = 280; 
        showToast("🎨 Детали облиты! Слой краски увеличился."); 
    } else if (type === 'additive') { 
        if (car.hasAdditive) return showToast("Присадка уже залита!");
        if (cash < 6000) return showToast("Не хватает 6,000 ₽!"); 
        state.player.cash -= 6000; 
        car.hasAdditive = true; 
        showToast("🧪 «Медовая» присадка залита! Стук мотора заглушен. (Внимание: дотошный покупатель может раскрыть!)"); 
    } else if (type === 'odometer') { 
        if (car.rolledOdometer) return showToast("Пробег уже скручивался!"); 
        if (cash < 8000) return showToast("Не хватает 8,000 ₽!"); 
        state.player.cash -= 8000; 
        
        let m = typeof car.mileage === 'number' ? car.mileage : 85000;
        car.mileage = Math.round(m / 2); 
        
        let bmVal = car.baseMarketValue ? car.baseMarketValue : (car.price ? car.price : 100000);
        car.baseMarketValue = Math.round(bmVal * 1.15); 
        
        let cPlate = car.customPlate ? car.customPlate : (car.plate ? car.plate : "ТРАНЗИТ");
        car.marketValue = car.baseMarketValue + calculatePlateValue(cPlate); 
        car.rolledOdometer = true; 
        showToast("⏳ Пробег скручен вдвое! (Осторожно: сканер подборщика может раскрыть обман!)"); 
    } 
    
    saveState(); 
    renderGarage(); 
    openPreSaleModal(activePreSaleCarIndex);
}

// ----------------------------------------------------
// КАПИТАЛКА И ПОВЫШЕНИЕ КАРМЫ
// ----------------------------------------------------
function repairCarDefect(idx) {
    const car = state.garage[idx]; 
    if (!car) return; 
    
    let stoLevel = 0;
    if (state.businesses) {
        const s = state.businesses.find(b => b.id === 'sto');
        if (s) stoLevel = s.level;
    }
    
    let cost = car.hiddenDefect?.cost ? car.hiddenDefect.cost : 10000;
    if (stoLevel > 0) cost = Math.round(cost * 0.6);
    
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < cost) return showToast("Не хватает денег на капремонт!"); 
    
    state.player.cash -= cost; 
    car.hiddenDefect = null; 
    car.hasAdditive = false; 
    car.condition = 98; 
    car.isOverhauled = true; // Отметка честного капремонта

    // РОСТ КАРМЫ ЗА ЧЕСТНЫЙ РЕМОНТ
    state.player.karma = Math.min(100, (state.player.karma || 50) + 8);

    saveState(); 
    renderGarage(); 
    playSound('win');
    tgHaptic('success');
    showToast("🔧 Капремонт узлов завершён! Машина в идеале, Карма выросла (+8)!");
}

// ----------------------------------------------------
// ОБД-2 ДИАГНОСТИКА
// ----------------------------------------------------
function openOBD2Modal() {
    if (selectedCarIndex === null) return; 
    let hasScanner = !!(state.player && state.player.tools && (state.player.tools.obd || state.player.tools.obd_launch));
    if (!hasScanner) return showToast("🔒 Требуется OBD2-сканер! Купите его в Маркете.");

    obdActiveCarIdx = selectedCarIndex; 
    const car = state.garage[selectedCarIndex]; 
    if (!car) return;
    
    closeModal("modalPreview");
    car.stoChecked = true; 
    
    let cName = car.name ? car.name : "Авто";
    setTxt("obd2CarTitle", "Диагностика: " + cName); 
    
    const resBox = document.getElementById("obd2ResultBox"); 
    const actBox = document.getElementById("obd2ActionBox");
    if (resBox) resBox.innerHTML = "Подключение по протоколу CAN / ISO 14230...<br>"; 
    if (actBox) actBox.innerHTML = ""; 
    
    const modal = document.getElementById("modalOBD2");
    if (modal) modal.classList.add('active');
    
    setTimeout(() => {
        let engWear = Math.round(car.wear?.engine ? car.wear.engine : 100);
        let transWear = Math.round(car.wear?.transmission ? car.wear.transmission : 100);
        let issuesHtml = "<b>Отчет об узлах:</b><br>Двигатель: " + engWear + "% ресурса<br>Трансмиссия: " + transWear + "% ресурса<br>";
        
        if (car.hiddenDefect) { 
            let dText = car.hiddenDefect.text ? car.hiddenDefect.text : "Неизвестная ошибка";
            let dCost = car.hiddenDefect.cost ? car.hiddenDefect.cost : 10000;
            issuesHtml += "<br><span class='color-red'>ОШИБКИ В ЭБУ:</span><br>" + dText; 
            if (actBox) actBox.innerHTML = "<button onclick='repairOBDErrorFromScanner()' class='btn btn-amber w-full'>Устранить ошибку (" + dCost.toLocaleString() + " ₽)</button>"; 
        } else { 
            issuesHtml += "<br><span class='color-green'>Ошибок (DTC) не обнаружено. Агрегаты в норме.</span>"; 
        }
        if (resBox) resBox.innerHTML = issuesHtml;
    }, 800);
}

function closeOBD2Modal() { 
    closeModal("modalOBD2"); 
    if (obdActiveCarIdx !== null) openPreviewModal(obdActiveCarIdx); 
}

function repairOBDErrorFromScanner() { 
    if (obdActiveCarIdx === null) return; 
    const car = state.garage[obdActiveCarIdx]; 
    if (!car || !car.hiddenDefect) return; 
    
    let cost = car.hiddenDefect.cost ? car.hiddenDefect.cost : 10000;
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < cost) return showToast("Недостаточно денег на ремонт!"); 
    
    state.player.cash -= cost; 
    car.hiddenDefect = null; 
    car.hasAdditive = false;
    car.isOverhauled = true;

    if (!car.wear) car.wear = { engine: 90, transmission: 90 };
    car.wear.engine = Math.max(90, (car.wear.engine || 90) + 30); 
    car.wear.transmission = Math.max(90, (car.wear.transmission || 90) + 30); 
    
    let bmVal = car.baseMarketValue ? car.baseMarketValue : (car.price ? car.price : 100000);
    car.baseMarketValue = Math.round(bmVal * 1.08); 
    
    let cPlate = car.customPlate ? car.customPlate : (car.plate ? car.plate : "ТРАНЗИТ");
    car.marketValue = car.baseMarketValue + calculatePlateValue(cPlate); 
    
    // РОСТ КАРМЫ
    state.player.karma = Math.min(100, (state.player.karma || 50) + 6);

    saveState(); 
    closeOBD2Modal(); 
    renderGarage(); 
    showToast("Ремонт узлов выполнен! Карма перекупа выросла (+6)!"); 
}

// ----------------------------------------------------
// ГОСНОМЕРА: СНЯТИЕ И УСТАНОВКА
// ----------------------------------------------------
function openChangePlateModal() {
    if (selectedCarIndex === null) return; 
    const list = document.getElementById("changePlateList"); 
    if (!list) return;
    
    if (!state.ownedPlates || state.ownedPlates.length === 0) {
        list.innerHTML = "<div class='sub-label py-2'>У вас нет номеров в коллекции! Купите в Маркете.</div>"; 
    } else { 
        let html = "";
        state.ownedPlates.forEach((p, i) => {
            const pVal = calculatePlateValue(p);
            let extraClass = pVal > 5000 
                ? "<div class='text-xs color-green mt-1'>+" + pVal.toLocaleString() + " ₽ к цене</div>" 
                : "";
            html += 
            "<div class='glass-card flex-between w-full mb-1 p-2'>" +
                "<div>" +
                    "<div class='license-plate'>" + p + " <div class='license-flag'>RUS</div></div>" +
                    extraClass +
                "</div>" +
                "<button onclick=\"installPlateOnCar('" + p + "', " + i + ")\" class='btn btn-cyan btn-auto btn-sm'>Установить</button>" +
            "</div>";
        });
        list.innerHTML = html;
    }
    const modal = document.getElementById("modalChangePlate");
    if (modal) modal.classList.add('active');
}

function removePlateFromCar() {
    if (selectedCarIndex === null) return; 
    const car = state.garage[selectedCarIndex]; 
    if (!car) return;
    
    let oldPlate = car.customPlate ? car.customPlate : (car.plate ? car.plate : "ТРАНЗИТ");
    if (oldPlate && String(oldPlate).startsWith('ТРАНЗИТ')) {
        return showToast("На машине уже установлены транзиты!"); 
    }
    
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < 2000) return showToast("Нужно 2,000 ₽ на снятие!");
    
    state.player.cash -= 2000;
    if (oldPlate) {
        if (!state.ownedPlates) state.ownedPlates = [];
        state.ownedPlates.push(oldPlate);
    }
    const transitNum = Math.floor(Math.random() * 9000) + 1000; 
    car.customPlate = "ТРАНЗИТ " + transitNum; 
    
    let bmVal = car.baseMarketValue ? car.baseMarketValue : (car.price ? car.price : 100000);
    car.marketValue = bmVal;
    
    saveState(); 
    closeModal("modalChangePlate"); 
    openPreviewModal(selectedCarIndex); 
    renderGarage(); 
    showToast("Номер снят в инвентарь (-2,000 ₽). Выданы транзиты!");
}

function installPlateOnCar(plate, plateIdx) {
    if (selectedCarIndex === null) return; 
    const car = state.garage[selectedCarIndex]; 
    if (!car) return;
    
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < 2000) return showToast("Нужно 2,000 ₽ на установку!");
    
    state.player.cash -= 2000;
    car.customPlate = plate;
    state.ownedPlates.splice(plateIdx, 1); 
    
    const plateVal = calculatePlateValue(plate);
    let bmVal = car.baseMarketValue ? car.baseMarketValue : (car.price ? car.price : 100000);
    car.marketValue = bmVal + plateVal;
    
    saveState(); 
    closeModal("modalChangePlate"); 
    openPreviewModal(selectedCarIndex); 
    renderGarage(); 
    showToast("Госномер " + plate + " установлен! (+" + plateVal.toLocaleString() + " ₽ к оценке)");
}

// ----------------------------------------------------
// СПОРТИВНЫЙ ТЮНИНГ
// ----------------------------------------------------
function updateTuningRiskUI(car) { 
    let risk = (car && car.tuning && car.tuning.risk1251) ? car.tuning.risk1251 : 0;
    setTxt("tuneRiskValue", risk + "%"); 
    const fill = document.getElementById("tuneRiskFill"); 
    if (fill) fill.style.width = Math.min(100, risk) + "%"; 
}

function switchTuneTab(tab) {
    activeTuneTab = tab;
    ['drag', 'drift', 'style'].forEach(t => {
        const btn = document.getElementById('tuneTab-' + t);
        if (btn) {
            if (t === tab) {
                btn.classList.add('btn-cyan');
                btn.classList.remove('btn-dark');
            } else {
                btn.classList.remove('btn-cyan');
                btn.classList.add('btn-dark');
            }
        }
    });
    renderTuningOptions();
}

function openTuningModal(idx) { 
    selectedCarIndex = idx; 
    const car = state.garage[idx]; 
    if (!car) return;
    if (!car.tuning) {
        car.tuning = { 
            chip: 0, exhaust: false, stance: false, bodykit: false, 
            rollCage: false, dragSlicks: false, hydroHandbrake: false, 
            weldedDiff: false, steeringAngle: false, bucketSeats: false, 
            customWheels: false, risk1251: 0 
        };
    }
    
    let cName = car.name ? car.name : "Авто";
    let cPower = car.power ? car.power : 100;

    setTxt("tuneCarTitle", cName + " (" + cPower + " л.с.)"); 
    updateTuningRiskUI(car);
    switchTuneTab(activeTuneTab);

    const modal = document.getElementById("modalTuning");
    if (modal) modal.classList.add('active'); 
}

function renderTuningOptions() {
    if (selectedCarIndex === null) return;
    const car = state.garage[selectedCarIndex];
    if (!car) return;
    const c = document.getElementById("tuningItemsContainer");
    if (!c) return;

    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    let t = car.tuning ? car.tuning : {};
    let html = "";

    if (activeTuneTab === 'drag') {
        let chipBtn = (t.chip >= 3) ? "Stage 3 (MAX)" : (lvl < 5 ? "С 5 УР" : "50,000 ₽");
        let slicksBtn = t.dragSlicks ? "Установлено ✓" : (lvl < 8 ? "С 8 УР" : "40,000 ₽");
        let cageBtn = t.rollCage ? "Установлен ✓" : (lvl < 12 ? "С 12 УР" : "65,000 ₽");

        html += 
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><b class='text-xs color-cyan'>Чип-Тюнинг Stage</b><div class='sub-label'>+30 л.с. (Текущий: Stage " + (t.chip || 0) + ")</div></div>" +
            "<button onclick=\"applyTuningMod('chip')\" class='btn btn-dark btn-auto btn-sm' " + (t.chip >= 3 || lvl < 5 ? "disabled" : "") + ">" + chipBtn + "</button>" +
        "</div>" +
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><b class='text-xs color-cyan'>Драговые Слики</b><div class='sub-label'>Идеальный зацеп на 402м (+15% к ланчу)</div></div>" +
            "<button onclick=\"applyTuningMod('slicks')\" class='btn btn-dark btn-auto btn-sm' " + (t.dragSlicks || lvl < 8 ? "disabled" : "") + ">" + slicksBtn + "</button>" +
        "</div>" +
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><b class='text-xs color-cyan'>Болтовой Каркас Безопасности</b><div class='sub-label'>Регламент соревнований (+35% жесткости)</div></div>" +
            "<button onclick=\"applyTuningMod('cage')\" class='btn btn-dark btn-auto btn-sm' " + (t.rollCage || lvl < 12 ? "disabled" : "") + ">" + cageBtn + "</button>" +
        "</div>";
    } else if (activeTuneTab === 'drift') {
        let handbrakeBtn = t.hydroHandbrake ? "Установлен ✓" : (lvl < 6 ? "С 6 УР" : "30,000 ₽");
        let diffBtn = t.weldedDiff ? "Заварен ✓" : (lvl < 7 ? "С 7 УР" : "18,000 ₽");
        let angleBtn = t.steeringAngle ? "Установлен ✓" : (lvl < 10 ? "С 10 УР" : "35,000 ₽");
        let seatsBtn = t.bucketSeats ? "Установлены ✓" : (lvl < 12 ? "С 12 УР" : "45,000 ₽");

        html += 
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><b class='text-xs color-amber'>Гидравлический Ручник</b><div class='sub-label'>Мгновенный срыв задней оси в занос</div></div>" +
            "<button onclick=\"applyTuningMod('handbrake')\" class='btn btn-dark btn-auto btn-sm' " + (t.hydroHandbrake || lvl < 6 ? "disabled" : "") + ">" + handbrakeBtn + "</button>" +
        "</div>" +
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><b class='text-xs color-amber'>Заварка Редуктора</b><div class='sub-label'>100% блокировка обоих колес для дрифта</div></div>" +
            "<button onclick=\"applyTuningMod('diff')\" class='btn btn-dark btn-auto btn-sm' " + (t.weldedDiff || lvl < 7 ? "disabled" : "") + ">" + diffBtn + "</button>" +
        "</div>" +
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><b class='text-xs color-amber'>Красноярский Выворот Колес</b><div class='sub-label'>Дикий угол перекладки в заносе</div></div>" +
            "<button onclick=\"applyTuningMod('angle')\" class='btn btn-dark btn-auto btn-sm' " + (t.steeringAngle || lvl < 10 ? "disabled" : "") + ">" + angleBtn + "</button>" +
        "</div>" +
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><b class='text-xs color-amber'>Спортивные Ковши & Ремни</b><div class='sub-label'>Фиксация пилота и безопасность</div></div>" +
            "<button onclick=\"applyTuningMod('seats')\" class='btn btn-dark btn-auto btn-sm' " + (t.bucketSeats || lvl < 12 ? "disabled" : "") + ">" + seatsBtn + "</button>" +
        "</div>";
    } else if (activeTuneTab === 'style') {
        let stanceBtn = t.stance ? "Установлена ✓" : (lvl < 8 ? "С 8 УР" : "45,000 ₽");
        let exhaustBtn = t.exhaust ? "Установлен ✓" : (lvl < 10 ? "С 10 УР" : "35,000 ₽");
        let bodykitBtn = t.bodykit ? "Установлен ✓" : (lvl < 14 ? "С 14 УР" : "60,000 ₽");
        let wheelsBtn = t.customWheels ? "Установлены ✓" : (lvl < 15 ? "С 15 УР" : "55,000 ₽");

        html += 
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><b class='text-xs color-green'>Пневмоподвеска (Стенс)</b><div class='sub-label'>+40 баллов на автошоу (риск 12.5.1 +20%)</div></div>" +
            "<button onclick=\"applyTuningMod('stance')\" class='btn btn-dark btn-auto btn-sm' " + (t.stance || lvl < 8 ? "disabled" : "") + ">" + stanceBtn + "</button>" +
        "</div>" +
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><b class='text-xs color-green'>Прямоточный Выхлоп</b><div class='sub-label'>Громкий бас выхлопа (риск 12.5.1 +25%)</div></div>" +
            "<button onclick=\"applyTuningMod('exhaust')\" class='btn btn-dark btn-auto btn-sm' " + (t.exhaust || lvl < 10 ? "disabled" : "") + ">" + exhaustBtn + "</button>" +
        "</div>" +
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><b class='text-xs color-green'>Аэродинамический Обвес</b><div class='sub-label'>+30 баллов внешнего вида</div></div>" +
            "<button onclick=\"applyTuningMod('bodykit')\" class='btn btn-dark btn-auto btn-sm' " + (t.bodykit || lvl < 14 ? "disabled" : "") + ">" + bodykitBtn + "</button>" +
        "</div>" +
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><b class='text-xs color-green'>Кованые Кастомные Диски</b><div class='sub-label'>Эксклюзивный стиль и блеск полок</div></div>" +
            "<button onclick=\"applyTuningMod('wheels')\" class='btn btn-dark btn-auto btn-sm' " + (t.customWheels || lvl < 15 ? "disabled" : "") + ">" + wheelsBtn + "</button>" +
        "</div>";
    }

    c.innerHTML = html;
}

function applyTuningMod(type) {
    if (selectedCarIndex === null) return; 
    const car = state.garage[selectedCarIndex]; 
    if (!car) return;
    if (!car.tuning) {
        car.tuning = { 
            chip: 0, exhaust: false, stance: false, bodykit: false, 
            rollCage: false, dragSlicks: false, hydroHandbrake: false, 
            weldedDiff: false, steeringAngle: false, bucketSeats: false, 
            customWheels: false, risk1251: 0 
        };
    }
    
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    
    if (type === 'chip') { 
        if (car.tuning.chip >= 3) return showToast("Уже установлен Stage 3!");
        if (cash < 50000) return showToast("Не хватает 50,000 ₽!"); 
        state.player.cash -= 50000; 
        car.tuning.chip += 1; 
        car.power = (car.power || 100) + 30; 
        car.tuning.risk1251 = (car.tuning.risk1251 || 0) + 15; 
    } else if (type === 'slicks') {
        if (car.tuning.dragSlicks) return showToast("Слики уже установлены!");
        if (cash < 40000) return showToast("Не хватает 40,000 ₽!");
        state.player.cash -= 40000;
        car.tuning.dragSlicks = true;
    } else if (type === 'cage') {
        if (car.tuning.rollCage) return showToast("Каркас уже установлен!");
        if (cash < 65000) return showToast("Не хватает 65,000 ₽!");
        state.player.cash -= 65000;
        car.tuning.rollCage = true;
        car.tuning.risk1251 = (car.tuning.risk1251 || 0) + 20;
    } else if (type === 'handbrake') {
        if (car.tuning.hydroHandbrake) return showToast("Гидроручник уже установлен!");
        if (cash < 30000) return showToast("Не хватает 30,000 ₽!");
        state.player.cash -= 30000;
        car.tuning.hydroHandbrake = true;
        car.tuning.risk1251 = (car.tuning.risk1251 || 0) + 10;
    } else if (type === 'diff') {
        if (car.tuning.weldedDiff) return showToast("Редуктор уже заварен!");
        if (cash < 18000) return showToast("Не хватает 18,000 ₽!");
        state.player.cash -= 18000;
        car.tuning.weldedDiff = true;
    } else if (type === 'angle') {
        if (car.tuning.steeringAngle) return showToast("Выворот уже стоит!");
        if (cash < 35000) return showToast("Не хватает 35,000 ₽!");
        state.player.cash -= 35000;
        car.tuning.steeringAngle = true;
    } else if (type === 'seats') {
        if (car.tuning.bucketSeats) return showToast("Ковши уже установлены!");
        if (cash < 45000) return showToast("Не хватает 45,000 ₽!");
        state.player.cash -= 45000;
        car.tuning.bucketSeats = true;
    } else if (type === 'stance') { 
        if (car.tuning.stance) return showToast("Пневма уже настроена!"); 
        if (cash < 45000) return showToast("Не хватает 45,000 ₽!"); 
        state.player.cash -= 45000; 
        car.tuning.stance = true; 
        car.tuning.risk1251 = (car.tuning.risk1251 || 0) + 20; 
    } else if (type === 'exhaust') { 
        if (car.tuning.exhaust) return showToast("Прямоток уже стоит!"); 
        if (cash < 35000) return showToast("Не хватает 35,000 ₽!"); 
        state.player.cash -= 35000; 
        car.tuning.exhaust = true; 
        car.tuning.risk1251 = (car.tuning.risk1251 || 0) + 25; 
    } else if (type === 'bodykit') { 
        if (car.tuning.bodykit) return showToast("Обвес уже установлен!"); 
        if (cash < 60000) return showToast("Не хватает 60,000 ₽!"); 
        state.player.cash -= 60000; 
        car.tuning.bodykit = true; 
        car.tuning.risk1251 = (car.tuning.risk1251 || 0) + 15; 
    } else if (type === 'wheels') {
        if (car.tuning.customWheels) return showToast("Диски уже установлены!");
        if (cash < 55000) return showToast("Не хватает 55,000 ₽!");
        state.player.cash -= 55000;
        car.tuning.customWheels = true;
    }
    
    updateTuningRiskUI(car); 
    saveState(); 
    renderGarage(); 
    renderTuningOptions();
    playSound('win');
    showToast("Деталь установлена на автомобиль!");
}

// ----------------------------------------------------
// ВЫСТАВЛЕНИЕ НА ПЛОЩАДКУ ПРОДАЖ И БАРТЕР
// ----------------------------------------------------
function unimpoundCar(idx) {
    const car = state.garage[idx];
    if (!car || !car.impounded) return;

    let daysAtLot = car.impoundedDays ? car.impoundedDays : 1;
    let baseDailyRate = car.type === 'premium' ? 12000 : (car.type === 'comfort' ? 6000 : 3500);
    let fine = car.impoundFine ? car.impoundFine : 30000;
    const totalParkingDebt = fine + (daysAtLot * baseDailyRate);

    let stoLevel = 0;
    if (state.businesses) {
        const s = state.businesses.find(b => b.id === 'sto');
        if (s) stoLevel = s.level;
    }
    
    if (stoLevel >= 3 && Math.random() < 0.35) {
        car.impounded = false;
        car.impoundedDays = 0;
        saveState();
        renderGarage();
        return showToast("🔧 Дядя Ваня с СТО вытащил машину бесплатно!");
    }

    let conn = (state.player && state.player.connections) ? state.player.connections : 0;
    if (conn >= 2) {
        state.player.connections -= 2;
        car.impounded = false;
        car.impoundedDays = 0;
        saveState();
        renderGarage();
        return showToast("🤝 Машина забрана со штрафстоянки за 2 Связи!");
    }

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < totalParkingDebt) return showToast("Не хватает денег! Долг: " + totalParkingDebt.toLocaleString() + " ₽");

    state.player.cash -= totalParkingDebt;
    car.impounded = false;
    car.impoundedDays = 0;
    saveState();
    renderGarage();
    showToast("Штрафстоянка оплачена (-" + totalParkingDebt.toLocaleString() + " ₽)");
}

function openPutOnLotModal(idx) { 
    carToLotIndex = idx; 
    const car = state.garage[idx]; 
    if (!car) return;

    if (car.unregistered) return showToast("🚫 Автомобиль снят с учёта! Поставьте на учёт перед продажей.");
    
    let cost = car.purchaseCost ? car.purchaseCost : (car.basePrice ? car.basePrice : 100000);
    let mVal = car.marketValue ? car.marketValue : (car.price ? car.price : 100000);
    let cName = car.name ? car.name : "Авто";
    
    setTxt("lotPutCarTitle", cName + " (Оценка: " + mVal.toLocaleString() + " ₽)"); 
    setTxt("lotCostInfo", "Себестоимость выкупа: " + cost.toLocaleString() + " ₽"); 
    
    const input = document.getElementById("lotAskingPriceInput"); 
    if (input) input.value = mVal; 
    
    const modal = document.getElementById("modalPutOnLot");
    if (modal) modal.classList.add('active'); 
}

function confirmPutOnLot() { 
    if (carToLotIndex === null) return; 
    const car = state.garage[carToLotIndex]; 
    if (!car) return;
    
    const input = document.getElementById("lotAskingPriceInput"); 
    let askingPrice = input?.value ? parseInt(input.value) : 0; 
    
    if (isNaN(askingPrice) || askingPrice <= 0) return showToast("Введите корректную сумму продажи!");
    
    closeModal("modalPutOnLot"); 
    state.garage.splice(carToLotIndex, 1); 
    
    // Таймер поиска покупателя стартует строго с 0%
    const waitTime = Math.floor(60 + Math.random() * 180);
    if (!state.salesLot) state.salesLot = [];
    state.salesLot.push({ 
        id: "lot_" + Date.now(), 
        car: car, 
        askingPrice: askingPrice, 
        maxTimer: waitTime,
        timer: waitTime, 
        currentBuyer: null 
    }); 
    
    saveState(); 
    renderGarage(); 
    if (typeof renderSalesLot === 'function') renderSalesLot(); 
    tgHaptic('success'); 
    
    let cName = car.name ? car.name : "Авто";
    showToast("🚗 " + cName + " выставлен на площадку!"); 
    setTimeout(() => { if (typeof switchTab === 'function') switchTab("tabSalesLot"); }, 300); 
}

function checkBarterEvent() {
    if (typeof CAR_DATABASE === 'undefined' || !state.garage || state.garage.length === 0) return;
    if (Math.random() > 0.08) return; 

    const myCarIdx = Math.floor(Math.random() * state.garage.length); 
    const myCar = state.garage[myCarIdx]; 
    if (!myCar || myCar.impounded || myCar.unregistered) return;

    let currentClass = myCar.type ? myCar.type : 'economy';
    let pool = CAR_DATABASE[currentClass] ? CAR_DATABASE[currentClass] : CAR_DATABASE.economy;
    if (!pool || pool.length === 0) return;
    
    let myCarPrice = myCar.basePrice ? myCar.basePrice : (myCar.price ? myCar.price : 100000);
    const candidates = pool.filter(c => c && c.name !== myCar.name && c.basePrice >= myCarPrice * 0.8 && c.basePrice <= myCarPrice * 1.3);
    let npcTemplate = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : pool[0];
    if (!npcTemplate) return;

    let plate = (typeof generateNormalPlate === 'function') ? generateNormalPlate() : "В777ВВ 77";
    let nName = npcTemplate.name ? npcTemplate.name : "Автомобиль";
    let nType = npcTemplate.type ? npcTemplate.type : 'economy';
    let nPower = npcTemplate.power ? npcTemplate.power : 100;
    let nBaseP = npcTemplate.basePrice ? npcTemplate.basePrice : 100000;
    let nImg = npcTemplate.img ? npcTemplate.img : "assets/cars/economy/vaz-2107.jpg";

    pendingBarterCar = {
        myCarIdx: myCarIdx,
        myCar: myCar,
        npcCar: {
            id: "barter_" + Date.now(),
            name: nName,
            type: nType,
            power: nPower,
            basePrice: nBaseP,
            price: nBaseP,
            baseMarketValue: nBaseP,
            marketValue: nBaseP,
            img: nImg,
            plate: plate,
            customPlate: plate,
            condition: 85,
            wear: { engine: 85, transmission: 85 },
            tuning: { 
                chip: 0, exhaust: false, stance: false, bodykit: false, 
                rollCage: false, dragSlicks: false, hydroHandbrake: false, 
                weldedDiff: false, steeringAngle: false, bucketSeats: false, 
                customWheels: false, risk1251: 0 
            }
        }
    };

    setTxt("barterMyCarName", myCar.name ? myCar.name : "Авто");
    let mVal = myCar.marketValue ? myCar.marketValue : (myCar.price ? myCar.price : 0);
    setTxt("barterMyCarVal", mVal.toLocaleString() + " ₽");
    
    let npcVal = pendingBarterCar.npcCar.marketValue ? pendingBarterCar.npcCar.marketValue : 0;
    setTxt("barterNpcCarName", pendingBarterCar.npcCar.name);
    setTxt("barterNpcCarVal", npcVal.toLocaleString() + " ₽");

    const modal = document.getElementById("modalBarterDeal");
    if (modal) modal.classList.add('active');
}

function confirmBarterExchange() {
    if (!pendingBarterCar) return;
    const myCarIdx = pendingBarterCar.myCarIdx;
    const npcCar = pendingBarterCar.npcCar;

    state.garage.splice(myCarIdx, 1);
    state.garage.push(npcCar);
    pendingBarterCar = null;

    closeModal("modalBarterDeal");
    saveState();
    renderGarage();
    tgHaptic('success');
    playSound('win');
    showToast("Ключ в ключ! Вы обменяли авто на «" + npcCar.name + "»!");
}
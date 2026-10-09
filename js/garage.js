// ===================== Вкладка: ГАРАЖ (js/garage.js) =====================

let selectedCarIndex = null; 
let activePreSaleCarIndex = null; 
let carToLotIndex = null;
let obdActiveCarIdx = null;
let pendingBarterCar = null;

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

    if (num === '777') { value += 850000; }
    else if (num === '007') { value += 850000; }
    else if (num === '001') { value += 850000; }
    else if (num.length === 3 && num[0] === num[1] && num[1] === num[2]) { value += 380000; }
    else if (num.startsWith('00')) { value += 120000; }
    else if (num.endsWith('00')) { value += 65000; }
    else if (num.length === 3 && num[0] === num[2]) { value += 15000; }

    if (letters.length === 3 && letters[0] === letters[1] && letters[1] === letters[2]) { value += 450000; }
    if (letters === 'АМР') { value += 1500000; }
    if (letters === 'ЕКХ') { value += 1500000; }
    if (letters === 'СКР') { value += 700000; }
    if (letters === 'САС') { value += 700000; }
    if (letters === 'ВОР') { value += 700000; }
    if (letters === 'МММ') { value += 700000; }

    if (reg === '77') { value = Math.round(value * 1.3); }
    if (reg === '99') { value = Math.round(value * 1.3); }
    if (reg === '97') { value = Math.round(value * 1.3); }
    if (reg === '777') { value = Math.round(value * 1.3); }

    if (value <= 2000) {
        return Math.floor(Math.random() * 1000) + 500;
    }

    return value;
}

function renderGarage() {
    const list = document.getElementById('garageList'); 
    if (!list) return; 
    
    const totalSlots = getTotalGarageSlots(); 
    let currentCount = 0;
    if (state.garage && state.garage.length) currentCount = state.garage.length;
    
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
        
        let cost = car.purchaseCost || car.basePrice || car.price || 100000;
        let carImg = car.img || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
        let carType = car.type ? car.type.toUpperCase() : "ECONOMY";
        let carPlate = car.customPlate || car.plate || "ТРАНЗИТ";
        let carPower = car.power || 100;
        let carMileageStr = typeof car.mileage === 'number' ? car.mileage.toLocaleString() : "85 000";
        let carCondition = typeof car.condition === 'number' ? car.condition : 85;
        
        const plateVal = calculatePlateValue(carPlate);
        let baseVal = car.baseMarketValue || car.price || 150000;
        const marketVal = baseVal + plateVal;
        car.marketValue = marketVal;

        // Блок неисправностей
        let defectBlock = "";
        if (car.hiddenDefect) {
            let defectText = car.hasAdditive ? "Присадка залита (Стук заглушен)" : (car.hiddenDefect.text || "Неисправность узлов");
            let dCost = car.hiddenDefect.cost || 10000;

            defectBlock = 
            "<div class='legal-warning mb-2'>" +
                "<span>⚠ <b>" + defectText + "</b></span>" +
                "<button onclick='repairCarDefect(" + idx + ")' class='btn btn-amber btn-auto btn-sm'>Капиталка (" + dCost.toLocaleString() + " ₽)</button>" +
            "</div>";
        }

        // Блок штрафстоянки
        let impoundedBlock = "";
        if (car.impounded) {
            let daysAtLot = car.impoundedDays || 1;
            let baseDailyRate = car.type === 'premium' ? 12000 : (car.type === 'comfort' ? 6000 : 3500);
            let iFine = car.impoundFine || 30000;
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

        // Блок аннулированного учёта (снятие с регистрации за 12.5.1 / дрифт)
        let unregBlock = "";
        if (car.unregistered) {
            unregBlock = 
            "<div class='legal-warning mb-2' style='background:rgba(255,179,0,0.15); border-color:var(--amber); color:#fde68a;'>" +
                "<div>" +
                    "<div>🚫 <b>УЧЁТ АННУЛИРОВАН (12.5.1)</b></div>" +
                    "<div class='sub-label' style='color:#fde68a;'>Запрет на выезд и продажу</div>" +
                "</div>" +
                "<div class='flex-gap'>" +
                    "<button onclick='registerCarAction(" + idx + ", \"sto\")' class='btn btn-dark btn-auto btn-sm' title='Снять тюнинг и поставить на учёт'>СТО (35k ₽)</button>" +
                    "<button onclick='registerCarAction(" + idx + ", \"reshala\")' class='btn btn-purple btn-auto btn-sm' title='Поставить через Артура без снятия тюнинга'>Решала (2 🤝)</button>" +
                "</div>" +
            "</div>";
        }

        let isBlocked = car.impounded || car.unregistered;
        let preSaleDisabled = isBlocked ? "disabled" : "";
        let lotDisabled = isBlocked ? "disabled" : "";

        let dangerClass = (car.hiddenDefect && !car.hasAdditive) ? "card-danger" : "";
        let bonusPlateBlock = plateVal > 5000 
            ? "<div class='text-xs color-cyan font-bold'>+" + plateVal.toLocaleString() + " ₽ за номер</div>" 
            : "";

        let carName = car.name || "Автомобиль";

        htmlContent += 
        "<div class='glass-card mb-3 " + dangerClass + "'>" +
            "<div class='car-img-wrap' style='height: 140px;'>" +
                "<img src='" + carImg + "' class='car-img' onerror=\"this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'\">" +
                "<div class='badge-tag' style='bottom: 8px; right: 8px;'>" + carType + "</div>" +
                "<div class='plate-corner'><div class='license-plate'>" + carPlate + " <div class='license-flag'>RUS</div></div></div>" +
            "</div>" +
            "<div class='flex-between mb-2'>" +
                "<div>" +
                    "<h4 class='font-bold'>" + carName + "</h4>" +
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
                "<button onclick='openPreSaleModal(" + idx + ")' class='btn btn-dark' " + preSaleDisabled + ">🪄 Предпродажка</button>" +
            "</div>" +
            "<div class='grid-2 mb-2'>" +
                "<button onclick='openTuningModal(" + idx + ")' class='btn btn-dark' " + preSaleDisabled + ">🛠 Тюнинг</button>" +
                "<button onclick='openPutOnLotModal(" + idx + ")' class='btn btn-green' " + lotDisabled + ">🏪 На площадку</button>" +
            "</div>" +
            "<button onclick='scrapCar(" + idx + ")' class='btn btn-dark btn-sm w-full'>Сдать на разборку (-35% стоимости)</button>" +
        "</div>";
    });

    list.innerHTML = htmlContent;
    if (mainContent) {
        requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
    }
}

// Повторная постановка на учёт после аннулирования
function registerCarAction(idx, method) {
    const car = state.garage[idx];
    if (!car || !car.unregistered) return;

    if (method === 'sto') {
        let cash = state.player?.cash || 0;
        if (cash < 35000) return showToast("Нужно 35,000 ₽ на демонтаж тюнинга и техосмотр!");
        
        state.player.cash -= 35000;
        
        // Снятие опасного нелегального тюнинга
        if (car.tuning) {
            car.tuning.exhaust = false;
            car.tuning.stance = false;
            car.tuning.bodykit = false;
            car.tuning.risk1251 = 0;
        }
        car.unregistered = false;
        saveState();
        renderGarage();
        playSound('win');
        tgHaptic('success');
        openVerdictModal(
            "УЧЁТ ВОССТАНОВЛЕН! 📋", 
            "Мастера СТО демонтировали нелегальный тюнинг и прошли техосмотр в ГИБДД. «" + car.name + "» снова на номерах!", 
            true
        );
    } 
    else if (method === 'reshala') {
        let conn = state.player?.connections || 0;
        if (conn < 2) return showToast("Нужно 2 Связи 🤝 для звонка Артуру!");

        state.player.connections -= 2;
        car.unregistered = false;
        saveState();
        renderGarage();
        playSound('win');
        tgHaptic('success');
        openVerdictModal(
            "ВОПРОС РЕШЁН! 🕵️‍♂️", 
            "Решала Артур уладил аннулирование в базе ГИБДД без снятия тюнинга. Учёт восстановлен за 2 Связи!", 
            true
        );
    }
}

function buyGarageSlot() { 
    const cost = getGarageSlotCost();
    let cash = state.player?.cash || 0;

    if (cash < cost) return showToast("Нужно " + cost.toLocaleString() + " ₽ на расширение!"); 
    state.player.cash -= cost; 

    let bSlots = state.player?.baseSlots || 2;
    state.player.baseSlots = bSlots + 1; 

    saveState(); 
    renderGarage(); 
    showToast("Гараж расширен! Добавлен +1 бокс."); 
}

function scrapCar(idx) {
    const car = state.garage[idx]; 
    if (!car) return;
    
    let baseVal = car.baseMarketValue || car.price || 100000;
    const scrapPrice = Math.round(baseVal * 0.65);
    state.player.cash += scrapPrice; 
    
    let mood = state.player?.mood || 85;
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

    let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
    const plateVal = calculatePlateValue(cPlate);
    let baseVal = car.baseMarketValue || car.price || 150000;
    const totalVal = baseVal + plateVal;

    const imgEl = document.getElementById("prevImg");
    if (imgEl) {
        imgEl.src = car.img || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
    }
    
    let cType = car.type || "car";
    setTxt("prevTypeBadge", cType.toUpperCase()); 
    
    const plateEl = document.getElementById("prevPlate");
    if (plateEl) {
        plateEl.innerHTML = cPlate + " <div class='license-flag'>RUS</div>";
    }
    
    let cName = car.name || "Автомобиль";
    setTxt("prevTitle", cName); 
    
    let power = car.power || 100;
    let cond = typeof car.condition === 'number' ? car.condition : 85;
    setTxt("prevSpecs", power + " л.с. / Разгон: ~6.2с / Состояние: " + cond + "%");
    
    let pCost = car.purchaseCost || car.basePrice || 0;
    setTxt("prevCostDetails", "Себестоимость выкупа: " + pCost.toLocaleString() + " ₽"); 
    setTxt("prevPrice", totalVal.toLocaleString() + " ₽"); 

    const obdBtn = document.getElementById("btnPreviewObdScan");
    if (obdBtn) {
        let hasScanner = !!(state.player && state.player.tools && state.player.tools.obd);
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

function openPreSaleModal(idx) {
    const now = Date.now();
    if (state.player && state.player.preSaleCooldownUntil && state.player.preSaleCooldownUntil > now) {
        const mins = Math.ceil((state.player.preSaleCooldownUntil - now) / 60000);
        return showToast("Мастера на перерыве! Откроется через " + mins + " мин.");
    }
    
    activePreSaleCarIndex = idx; 
    const car = state.garage[idx]; 
    if (!car) return;

    let mVal = car.marketValue || 0;
    let cName = car.name || "Авто";
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
    let cash = state.player?.cash || 0;

    if (type === 'clean') { 
        if (car.isPolished) return showToast("Уже отполировано!");
        if (cash < cleanCost) return showToast("Не хватает денег!"); 
        state.player.cash -= cleanCost; 
        car.isPolished = true; 
        
        let bmVal = car.baseMarketValue || car.price || 100000;
        car.baseMarketValue = Math.round(bmVal * 1.05); 
        
        let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
        car.marketValue = car.baseMarketValue + calculatePlateValue(cPlate); 
        showToast("✨ Фары сияют, салон как новый! +5% к цене."); 
    } 
    else if (type === 'paint') { 
        if (car.isRepainted) return showToast("Уже окрашено!");
        if (cash < paintCost) return showToast("Не хватает денег!"); 
        state.player.cash -= paintCost; 
        
        let cCond = car.condition !== undefined ? car.condition : 85;
        car.condition = Math.min(100, cCond + 20); 
        car.isRepainted = true; 
        if (!car.bodyThickness) car.bodyThickness = { hood: 110, roof: 100, doors: 110, wings: 105 };
        car.bodyThickness.doors = 280; 
        showToast("🎨 Детали облиты! Слой краски увеличился."); 
    } 
    else if (type === 'additive') { 
        if (car.hasAdditive) return showToast("Присадка уже залита!");
        if (cash < 6000) return showToast("Не хватает 6,000 ₽!"); 
        state.player.cash -= 6000; 
        car.hasAdditive = true; 
        showToast("🧪 «Медовая» присадка залита! Стук гидрокомпенсаторов скрыт."); 
    } 
    else if (type === 'odometer') { 
        if (car.rolledOdometer) return showToast("Пробег уже скручивался!"); 
        if (cash < 8000) return showToast("Не хватает 8,000 ₽!"); 
        state.player.cash -= 8000; 
        
        let m = typeof car.mileage === 'number' ? car.mileage : 85000;
        car.mileage = Math.round(m / 2); 
        
        let bmVal = car.baseMarketValue || car.price || 100000;
        car.baseMarketValue = Math.round(bmVal * 1.15); 
        
        let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
        car.marketValue = car.baseMarketValue + calculatePlateValue(cPlate); 
        car.rolledOdometer = true; 
        showToast("⏳ Пробег скручен вдвое! Машина помолодела."); 
    } 
    
    saveState(); 
    renderGarage(); 
    openPreSaleModal(activePreSaleCarIndex);
}

function repairCarDefect(idx) {
    const car = state.garage[idx]; 
    if (!car) return;
    
    let stoLevel = 0;
    if (state.businesses) {
        const s = state.businesses.find(b => b.id === 'sto');
        if (s) stoLevel = s.level;
    }
    
    let cost = car.hiddenDefect?.cost || 10000;
    if (stoLevel > 0) cost = Math.round(cost * 0.6);
    
    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Не хватает денег на капремонт!"); 
    
    state.player.cash -= cost; 
    car.hiddenDefect = null; 
    car.hasAdditive = false; 
    car.condition = 95; 
    saveState(); 
    renderGarage(); 
    showToast("Дефект устранён!");
}

function openOBD2Modal() {
    if (selectedCarIndex === null) return; 
    
    let hasScanner = !!(state.player && state.player.tools && state.player.tools.obd);
    if (!hasScanner) {
        return showToast("🔒 Требуется OBD2-сканер! Купите его в Маркете Перекупа.");
    }

    obdActiveCarIdx = selectedCarIndex; 
    const car = state.garage[selectedCarIndex]; 
    if (!car) return;
    
    closeModal("modalPreview");
    car.stoChecked = true; 
    
    let cName = car.name || "Авто";
    setTxt("obd2CarTitle", "Диагностика: " + cName); 
    
    const resBox = document.getElementById("obd2ResultBox"); 
    const actBox = document.getElementById("obd2ActionBox");
    if (resBox) resBox.innerHTML = "Подключение по протоколу CAN / ISO 14230...<br>"; 
    if (actBox) actBox.innerHTML = ""; 
    
    const modal = document.getElementById("modalOBD2");
    if (modal) modal.classList.add('active');
    
    setTimeout(() => {
        let engWear = Math.round(car.wear?.engine || 100);
        let transWear = Math.round(car.wear?.transmission || 100);
        
        let issuesHtml = "<b>Отчет об узлах:</b><br>Двигатель: " + engWear + "% ресурса<br>Трансмиссия: " + transWear + "% ресурса<br>";
        
        if (car.hiddenDefect) { 
            let dText = car.hiddenDefect.text || "Неизвестная ошибка";
            let dCost = car.hiddenDefect.cost || 10000;

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
    
    let cost = car.hiddenDefect.cost || 10000;
    let cash = state.player?.cash || 0;
    
    if (cash < cost) return showToast("Недостаточно денег на ремонт!"); 
    
    state.player.cash -= cost; 
    car.hiddenDefect = null; 
    if (!car.wear) car.wear = { engine: 90, transmission: 90 };
    
    let eng = car.wear.engine || 90;
    car.wear.engine = Math.max(90, eng + 30); 
    
    let trans = car.wear.transmission || 90;
    car.wear.transmission = Math.max(90, trans + 30); 
    
    let bmVal = car.baseMarketValue || car.price || 100000;
    car.baseMarketValue = Math.round(bmVal * 1.08); 
    
    let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
    car.marketValue = car.baseMarketValue + calculatePlateValue(cPlate); 
    
    saveState(); 
    closeOBD2Modal(); 
    renderGarage(); 
    showToast("Ремонт узлов выполнен успешно!"); 
}

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
    
    let oldPlate = car.customPlate || car.plate || "ТРАНЗИТ";
    if (oldPlate && String(oldPlate).startsWith('ТРАНЗИТ')) {
        return showToast("На машине уже установлены транзиты!"); 
    }
    
    let cash = state.player?.cash || 0;
    if (cash < 2000) return showToast("Нужно 2,000 ₽ на снятие!");
    
    state.player.cash -= 2000;
    if (oldPlate) {
        if (!state.ownedPlates) state.ownedPlates = [];
        state.ownedPlates.push(oldPlate);
    }
    const transitNum = Math.floor(Math.random() * 9000) + 1000; 
    car.customPlate = "ТРАНЗИТ " + transitNum; 
    
    let bmVal = car.baseMarketValue || car.price || 100000;
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
    
    let cash = state.player?.cash || 0;
    if (cash < 2000) return showToast("Нужно 2,000 ₽ на установку!");
    
    state.player.cash -= 2000;
    car.customPlate = plate;
    state.ownedPlates.splice(plateIdx, 1); 
    
    const plateVal = calculatePlateValue(plate);
    let bmVal = car.baseMarketValue || car.price || 100000;
    car.marketValue = bmVal + plateVal;
    
    saveState(); 
    closeModal("modalChangePlate"); 
    openPreviewModal(selectedCarIndex); 
    renderGarage(); 
    showToast("Госномер " + plate + " установлен! (+" + plateVal.toLocaleString() + " ₽ к оценке)");
}

function updateTuningRiskUI(car) { 
    let risk = car?.tuning?.risk1251 || 0;
    setTxt("tuneRiskValue", risk + "%"); 
    const fill = document.getElementById("tuneRiskFill"); 
    if (fill) fill.style.width = Math.min(100, risk) + "%"; 
}

function openTuningModal(idx) { 
    selectedCarIndex = idx; 
    const car = state.garage[idx]; 
    if (!car) return;
    if (!car.tuning) car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }; 
    
    let cName = car.name || "Авто";
    let cPower = car.power || 100;

    setTxt("tuneCarTitle", cName + " (" + cPower + " л.с.)"); 
    updateTuningRiskUI(car);
    
    const c = document.getElementById("tuningItemsContainer");
    if (c) {
        let lvl = state.player?.level || 1;

        let btn1 = lvl < 5 ? "С 5 УР" : "50,000 ₽";
        let dis1 = lvl < 5 ? "disabled" : "";

        let btn2 = lvl < 10 ? "С 10 УР" : "35,000 ₽";
        let dis2 = lvl < 10 ? "disabled" : "";

        let btn3 = lvl < 15 ? "С 15 УР" : "45,000 ₽";
        let dis3 = lvl < 15 ? "disabled" : "";

        let btn4 = lvl < 20 ? "С 20 УР" : "60,000 ₽";
        let dis4 = lvl < 20 ? "disabled" : "";

        c.innerHTML = 
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><div class='font-bold text-xs'>Чип-Тюнинг Stage</div><div class='sub-label'>+30 л.с. / Лимит: Stage 3</div></div>" +
            "<button onclick=\"applyTuningMod('chip')\" class='btn btn-dark btn-auto btn-sm' " + dis1 + ">" + btn1 + "</button>" +
        "</div>" +
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><div class='font-bold text-xs'>Прямоточный Выхлоп</div><div class='sub-label'>+25% риск 12.5.1</div></div>" +
            "<button onclick=\"applyTuningMod('exhaust')\" class='btn btn-dark btn-auto btn-sm' " + dis2 + ">" + btn2 + "</button>" +
        "</div>" +
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><div class='font-bold text-xs'>Пневмоподвеска (Стенс)</div><div class='sub-label'>+40 баллов на шоу</div></div>" +
            "<button onclick=\"applyTuningMod('stance')\" class='btn btn-dark btn-auto btn-sm' " + dis3 + ">" + btn3 + "</button>" +
        "</div>" +
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div><div class='font-bold text-xs'>Спортивный Обвес</div><div class='sub-label'>+15% риск 12.5.1</div></div>" +
            "<button onclick=\"applyTuningMod('bodykit')\" class='btn btn-dark btn-auto btn-sm' " + dis4 + ">" + btn4 + "</button>" +
        "</div>";
    }

    const modal = document.getElementById("modalTuning");
    if (modal) modal.classList.add('active'); 
}

function applyTuningMod(type) {
    if (selectedCarIndex === null) return; 
    const car = state.garage[selectedCarIndex]; 
    if (!car) return;
    if (!car.tuning) car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }; 
    
    let lvl = state.player?.level || 1;
    let cash = state.player?.cash || 0;
    
    if (type === 'chip') { 
        if (lvl < 5) return showToast("Требуется 5 уровень!");
        if (car.tuning.chip >= 3) return showToast("Уже установлен Stage 3!");
        if (cash < 50000) return showToast("Не хватает 50,000 ₽!"); 
        state.player.cash -= 50000; 
        car.tuning.chip += 1; 
        
        let pwr = car.power || 100;
        car.power = pwr + 30; 
        car.tuning.risk1251 += 15; 
    } 
    else if (type === 'exhaust') { 
        if (lvl < 10) return showToast("Требуется 10 уровень!");
        if (car.tuning.exhaust) return showToast("Прямоток уже стоит!"); 
        if (cash < 35000) return showToast("Не хватает 35,000 ₽!"); 
        state.player.cash -= 35000; 
        car.tuning.exhaust = true; 
        car.tuning.risk1251 += 25; 
    } 
    else if (type === 'stance') { 
        if (lvl < 15) return showToast("Требуется 15 уровень!");
        if (car.tuning.stance) return showToast("Пневма уже настроена!"); 
        if (cash < 45000) return showToast("Не хватает 45,000 ₽!"); 
        state.player.cash -= 45000; 
        car.tuning.stance = true; 
        car.tuning.risk1251 += 20; 
    } 
    else if (type === 'bodykit') { 
        if (lvl < 20) return showToast("Требуется 20 уровень!");
        if (car.tuning.bodykit) return showToast("Обвес уже установлен!"); 
        if (cash < 60000) return showToast("Не хватает 60,000 ₽!"); 
        state.player.cash -= 60000; 
        car.tuning.bodykit = true; 
        car.tuning.risk1251 += 15; 
    } 
    
    updateTuningRiskUI(car); 
    saveState(); 
    renderGarage(); 
    showToast("Тюнинг установлен!");
}

function unimpoundCar(idx) {
    const car = state.garage[idx];
    if (!car || !car.impounded) return;

    let daysAtLot = car.impoundedDays || 1;
    let baseDailyRate = car.type === 'premium' ? 12000 : (car.type === 'comfort' ? 6000 : 3500);
    let fine = car.impoundFine || 30000;
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
        return showToast("🔧 Дядя Ваня с СТО вытащил машину со стоянки бесплатно!");
    }

    let conn = state.player?.connections || 0;
    if (conn >= 2) {
        state.player.connections -= 2;
        car.impounded = false;
        car.impoundedDays = 0;
        saveState();
        renderGarage();
        return showToast("🤝 Машина забрана со штрафстоянки за 2 Связи!");
    }

    let cash = state.player?.cash || 0;
    if (cash < totalParkingDebt) {
        return showToast("Не хватает денег! Долг за стоянку: " + totalParkingDebt.toLocaleString() + " ₽");
    }

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

    if (car.unregistered) {
        return showToast("🚫 Автомобиль снят с учёта! Поставьте на учёт перед продажей.");
    }
    
    let cost = car.purchaseCost || car.basePrice || car.price || 100000;
    let mVal = car.marketValue || car.price || 100000;
    let cName = car.name || "Авто";
    
    setTxt("lotPutCarTitle", cName + " (Оценка: " + mVal.toLocaleString() + " ₽)"); 
    setTxt("lotCostInfo", "Начальная себестоимость: " + cost.toLocaleString() + " ₽"); 
    
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
    
    if (!state.salesLot) state.salesLot = [];
    state.salesLot.push({ 
        id: "lot_" + Date.now(), 
        car: car, 
        askingPrice: askingPrice, 
        timer: 30, 
        currentBuyer: null 
    }); 
    
    saveState(); 
    renderGarage(); 
    if (typeof renderSalesLot === 'function') renderSalesLot(); 
    tgHaptic('success'); 
    
    let cName = car.name || "Авто";
    showToast("🚗 " + cName + " выставлен на площадку!"); 
    setTimeout(() => { if (typeof switchTab === 'function') switchTab("tabSalesLot"); }, 300); 
}

function checkBarterEvent() {
    if (typeof CAR_DATABASE === 'undefined' || !state.garage || state.garage.length === 0) return;
    if (Math.random() > 0.08) return; 

    const myCarIdx = Math.floor(Math.random() * state.garage.length); 
    const myCar = state.garage[myCarIdx]; 
    if (!myCar || myCar.impounded || myCar.unregistered) return;

    let currentClass = myCar.type || 'economy';
    let pool = CAR_DATABASE[currentClass] || CAR_DATABASE.economy;
    if (!pool || pool.length === 0) return;
    
    let myCarPrice = myCar.basePrice || myCar.price || 100000;
    const candidates = pool.filter(c => c && c.name !== myCar.name && c.basePrice >= myCarPrice * 0.8 && c.basePrice <= myCarPrice * 1.3);
    let npcTemplate = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : pool[0];
    if (!npcTemplate) return;

    let plate = (typeof generateNormalPlate === 'function') ? generateNormalPlate() : "В777ВВ 77";
    let nName = npcTemplate.name || "Автомобиль";
    let nType = npcTemplate.type || 'economy';
    let nPower = npcTemplate.power || 100;
    let nBaseP = npcTemplate.basePrice || 100000;
    let nImg = npcTemplate.img || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";

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
            tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }
        }
    };

    setTxt("barterMyCarName", myCar.name || "Авто");
    let mVal = myCar.marketValue || myCar.price || 0;
    setTxt("barterMyCarVal", mVal.toLocaleString() + " ₽");
    
    let npcVal = pendingBarterCar.npcCar.marketValue || 0;
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

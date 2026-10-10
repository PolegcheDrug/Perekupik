// ========================================================
// js/garage.js — АВТОПАРК, ЛИЧНЫЙ ТРАНСПОРТ, СПОРТИВНЫЙ ТЮНИНГ (v0.4.3)
// ========================================================

let previewCarIndex = null;
let activeTuningCarIndex = null;
let activePreSaleCarIndex = null;
let activeGarageEventCar = null;
let activeTuneTab = 'drift';

// ========================================================
// 1. ОСНОВНОЙ РЕНДЕР ГАРАЖА
// ========================================================
function renderGarage() {
    const list = document.getElementById('garageList');
    if (!list) return;

    const maxSlots = getTotalGarageSlots();
    const currentSlots = state.garage ? state.garage.length : 0;
    
    setTxt('garageDetailedSlots', `${currentSlots} из ${maxSlots}`);
    setTxt('garageHeaderSlots', `${currentSlots}/${maxSlots}`);

    if (!state.garage || state.garage.length === 0) {
        list.innerHTML = `
            <div class="glass-card text-center sub-label py-8">
                <i class="fa-solid fa-warehouse color-cyan mb-2" style="font-size:36px;"></i>
                <div class="font-bold text-xs color-cyan mb-1">Ваш гараж пуст</div>
                <div style="font-size:10px;">Отправляйтесь на авторынок или вытащите раритет из сарая!</div>
            </div>`;
        return;
    }

    let html = "";
    state.garage.forEach((car, idx) => {
        if (!car) return;

        let cName = car.name || "Автомобиль";
        let cPower = car.power || 100;
        let cImg = car.img || "assets/cars/economy/vaz-2107.jpg";
        let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
        let cPrice = car.marketValue ? car.marketValue.toLocaleString() : (car.basePrice || 100000).toLocaleString();

        let isPersonal = !!car.isPersonal;
        let personalBadge = isPersonal 
            ? "<span class='tag-badge bg-tag-amber' style='box-shadow:0 0 10px rgba(255,179,0,0.5);'><i class='fa-solid fa-crown'></i> ЛИЧНЫЙ АВТО</span>" 
            : "";

        let legalBadge = car.isStolen 
            ? "<span class='tag-badge bg-tag-red'>🚨 В РОЗЫСКЕ</span>" 
            : (car.unregistered ? "<span class='tag-badge bg-tag-amber'>12.5.1</span>" : "<span class='tag-badge bg-tag-green'>УЧЁТ РФ</span>");

        let insuranceBadge = car.insurance === 'casco'
            ? "<span class='tag-badge bg-tag-green ml-1'>🛡️ КАСКО</span>"
            : (car.insurance === 'osago' ? "<span class='tag-badge bg-tag-cyan ml-1'>📋 ОСАГО</span>" : "");

        // Иконки доработок и спек-листа без лишнего текста
        let modsIconsHtml = renderCarModsBadges(car);

        let personalBtn = isPersonal
            ? `<button onclick="togglePersonalCar(${idx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-crown color-amber"></i> Снять статус лички</button>`
            : `<button onclick="togglePersonalCar(${idx})" class="btn btn-amber btn-sm"><i class="fa-solid fa-crown"></i> Сделать личным</button>`;

        html += `
        <div class="glass-card mb-3 ${isPersonal ? 'personal-car-card' : ''}">
            <div class="car-img-wrap" style="height:145px;">
                <img src="${cImg}" class="car-img" onerror="this.src='assets/cars/economy/vaz-2107.jpg'">
                <div class="plate-corner">
                    <div class="license-plate">${cPlate} <div class="license-flag">RUS</div></div>
                </div>
                <div class="badge-tag" style="bottom:8px; right:8px; display:flex; gap:4px; align-items:center;">
                    ${personalBadge}
                    ${legalBadge}
                    ${insuranceBadge}
                </div>
            </div>
            
            <div class="flex-between mb-1">
                <div>
                    <h4 class="font-bold">${cName}</h4>
                    <div class="sub-label">${cPower} л.с. | Пробег: ${(car.mileage || 85000).toLocaleString()} км | Состояние: ${car.condition || 80}%</div>
                </div>
                <div class="text-right">
                    <span class="text-xs color-green font-bold">ОЦЕНКА:</span>
                    <div class="price-val text-xs">${cPrice} ₽</div>
                </div>
            </div>

            <!-- ИКОНКИ УСТАНОВЛЕННЫХ МОДИФИКАЦИЙ -->
            <div class="car-mods-badges-container mb-2">
                ${modsIconsHtml}
            </div>

            <div class="grid-3 mb-2">
                <button onclick="openCarPreviewModal(${idx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-circle-info"></i> Осмотр</button>
                <button onclick="openTuningModal(${idx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-screwdriver-wrench color-cyan"></i> Тюнинг</button>
                <button onclick="openPreSaleModal(${idx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-wand-magic-sparkles color-amber"></i> Детейлинг</button>
            </div>

            <div class="grid-2 mb-2">
                ${personalBtn}
                <button onclick="selectCarForStreetDirect(${idx})" class="btn btn-red btn-sm"><i class="fa-solid fa-flag-checkered"></i> В Стрит</button>
            </div>

            <div>
                <button onclick="openPutOnLotModal(${idx})" class="btn btn-green btn-sm w-full" ${isPersonal ? 'disabled title="Снимите статус личного авто для продажи"' : ''}>
                    ${isPersonal ? '🔒 Личный авто (Не продаётся)' : '🏪 Выставить на продажу'}
                </button>
            </div>
        </div>`;
    });

    list.innerHTML = html;
}

// 2. ИКОНКИ МОДИФИКАЦИЙ В КАРТОЧКЕ ГАРАЖА (БЕЗ ТЕКСТА)
function renderCarModsBadges(car) {
    if (!car) return "";
    let t = car.tuning || {};
    let badges = [];

    // Чип-тюнинг
    if (t.chip === 1) badges.push(`<span class="mod-pill color-cyan" title="Stage 1 Чип"><i class="fa-solid fa-bolt"></i> St1</span>`);
    else if (t.chip === 2) badges.push(`<span class="mod-pill color-amber" title="Stage 2 + Выхлоп"><i class="fa-solid fa-fire"></i> St2</span>`);
    else if (t.chip >= 3) badges.push(`<span class="mod-pill color-red" title="Stage 3 Big Turbo"><i class="fa-solid fa-rocket"></i> St3</span>`);

    // Дрифт компоненты
    if (t.weldedDiff) badges.push(`<span class="mod-pill color-cyan" title="Заварка дифференциала"><i class="fa-solid fa-gear"></i></span>`);
    if (t.steeringAngle) badges.push(`<span class="mod-pill color-green" title="Красноярский выворот"><i class="fa-solid fa-compass-drafting"></i></span>`);
    if (t.hydroHandbrake) badges.push(`<span class="mod-pill color-red" title="Гидравлический ручник"><i class="fa-solid fa-gamepad"></i></span>`);
    if (t.bucketSeats) badges.push(`<span class="mod-pill color-purple" title="Спортивные ковши"><i class="fa-solid fa-chair"></i></span>`);

    // Драг компоненты
    if (t.dragSlicks) badges.push(`<span class="mod-pill color-amber" title="Драговые полуслики"><i class="fa-solid fa-circle-notch"></i></span>`);
    if (t.rollCage) badges.push(`<span class="mod-pill color-cyan" title="Вварной каркас безопасности"><i class="fa-solid fa-shield"></i></span>`);
    if (t.exhaust) badges.push(`<span class="mod-pill color-amber" title="Прямоточный выхлоп"><i class="fa-solid fa-volume-high"></i></span>`);

    // Стенс & Стайлинг
    if (t.stance) badges.push(`<span class="mod-pill color-purple" title="Пневмоподвеска"><i class="fa-solid fa-arrows-down-to-line"></i></span>`);
    if (t.customWheels) badges.push(`<span class="mod-pill color-green" title="Кованые диски"><i class="fa-solid fa-compact-disc"></i></span>`);
    if (t.bodykit) badges.push(`<span class="mod-pill color-cyan" title="Кастомный обвес"><i class="fa-solid fa-car-side"></i></span>`);

    // Детейлинг
    if (car.isPolished) badges.push(`<span class="mod-pill color-cyan" title="Полировка кузова"><i class="fa-solid fa-sparkles"></i></span>`);
    if (car.isRepainted) badges.push(`<span class="mod-pill color-green" title="Свежий облив"><i class="fa-solid fa-paint-roller"></i></span>`);
    if (car.hasAdditive) badges.push(`<span class="mod-pill color-amber" title="Присадка в моторе"><i class="fa-solid fa-flask"></i></span>`);
    if (car.rolledOdometer) badges.push(`<span class="mod-pill color-red" title="Скрученный одометр"><i class="fa-solid fa-clock-rotate-left"></i></span>`);

    if (badges.length === 0) {
        return `<span class="sub-label" style="font-size:9px; opacity:0.6;"><i class="fa-solid fa-car"></i> Заводской сток</span>`;
    }

    return badges.join(' ');
}

// ========================================================
// 3. СТАТУС ЛИЧНОГО АВТОМОБИЛЯ
// ========================================================
function togglePersonalCar(idx) {
    const car = state.garage[idx];
    if (!car) return;

    if (car.isPersonal) {
        car.isPersonal = false;
        showToast(`«${car.name}» больше не является личным авто.`);
    } else {
        state.garage.forEach(c => { if (c) c.isPersonal = false; });
        car.isPersonal = true;
        state.player.selectedStreetCarIndex = idx;
        
        playSound('win');
        tgHaptic('success');
        showToast(`👑 «${car.name}» назначен вашим личным автомобилем!`);
    }

    saveState();
    renderGarage();
}

function selectCarForStreetDirect(idx) {
    state.player.selectedStreetCarIndex = idx;
    saveState();
    switchTab('tabPhone');
    setTimeout(() => {
        if (typeof PhoneManager !== 'undefined') {
            PhoneManager.openApp('street');
        }
    }, 150);
}

function buyGarageSlot() {
    const cost = getGarageSlotCost();
    const cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Не хватает денег на покупку бокса!");

    state.player.cash -= cost;
    state.player.baseSlots = (state.player.baseSlots || 2) + 1;
    saveState();
    updateHeaderUI();
    renderGarage();
    playSound('win');
    tgHaptic('success');
    showToast(`Гараж расширен! Новая вместимость: ${getTotalGarageSlots()} мест.`);
}

// ========================================================
// 4. ОДНОКРАТНАЯ ПРЕДПРОДАЖНАЯ ПОДГОТОВКА (ФИКС ПОВТОРОВ)
// ========================================================
function openPreSaleModal(idx) {
    activePreSaleCarIndex = idx;
    const car = state.garage[idx];
    if (!car) return;

    setTxt('preSaleCarTitle', `Детейлинг: <b>${car.name}</b> (${car.power || 100} л.с.)`);

    // Проверяем каждую процедуру и блокируем кнопку при повторе
    const btnClean = document.getElementById('btnCleanPrice');
    if (btnClean) {
        if (car.isPolished) {
            btnClean.disabled = true;
            btnClean.innerText = "Сделано ✓";
            btnClean.className = "btn btn-dark btn-sm opacity-50";
        } else {
            btnClean.disabled = false;
            btnClean.innerText = "4,000 ₽";
            btnClean.className = "btn btn-cyan btn-sm";
        }
    }

    const btnPaint = document.getElementById('btnPaintPrice');
    if (btnPaint) {
        if (car.isRepainted || car.condition >= 100) {
            btnPaint.disabled = true;
            btnPaint.innerText = car.condition >= 100 ? "Идеал (100%) ✓" : "Окрашено ✓";
            btnPaint.className = "btn btn-dark btn-sm opacity-50";
        } else {
            btnPaint.disabled = false;
            btnPaint.innerText = "12,000 ₽";
            btnPaint.className = "btn btn-dark btn-sm";
        }
    }

    const btnAdditive = document.getElementById('btnAdditivePrice');
    if (btnAdditive) {
        if (car.hasAdditive) {
            btnAdditive.disabled = true;
            btnAdditive.innerText = "Залита ✓";
            btnAdditive.className = "btn btn-dark btn-sm opacity-50";
        } else {
            btnAdditive.disabled = false;
            btnAdditive.innerText = "6,000 ₽";
            btnAdditive.className = "btn btn-amber btn-sm";
        }
    }

    const btnOdometer = document.getElementById('btnOdometerPrice');
    if (btnOdometer) {
        if (car.rolledOdometer) {
            btnOdometer.disabled = true;
            btnOdometer.innerText = "Уже скручен ✓";
            btnOdometer.className = "btn btn-dark btn-sm opacity-50";
        } else {
            btnOdometer.disabled = false;
            btnOdometer.innerText = "8,000 ₽";
            btnOdometer.className = "btn btn-danger btn-sm";
        }
    }

    const modal = document.getElementById('modalPreSale');
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function applyPreSaleMod(type) {
    if (activePreSaleCarIndex === null) return;
    const car = state.garage[activePreSaleCarIndex];
    if (!car) return;

    let cash = state.player?.cash || 0;

    if (type === 'clean') {
        if (car.isPolished) return showToast("Машина уже отполирована до блеска!");
        if (cash < 4000) return showToast("Нужно 4,000 ₽!");
        state.player.cash -= 4000;
        car.isPolished = true;
        car.marketValue = Math.round((car.marketValue || car.basePrice) * 1.05);
        showToast("Кузов отполирован (+5% к рыночной цене)!");
    } else if (type === 'paint') {
        if (car.isRepainted) return showToast("Кузов уже был повторно окрашен!");
        if (car.condition >= 100) return showToast("Состояние кузова и так 100%!");
        if (cash < 12000) return showToast("Нужно 12,000 ₽!");
        state.player.cash -= 12000;
        car.isRepainted = true;
        car.condition = Math.min(100, (car.condition || 60) + 20);
        showToast("Кузов полностью перекрашен (+20% состояния)!");
    } else if (type === 'additive') {
        if (car.hasAdditive) return showToast("В масло уже залита присадка!");
        if (cash < 6000) return showToast("Нужно 6,000 ₽!");
        state.player.cash -= 6000;
        car.hasAdditive = true;
        showToast("Присадка залита! Стуки мотора скрыты (Опасно в торгах!)");
    } else if (type === 'odometer') {
        if (car.rolledOdometer) return showToast("Пробег уже скручивался на этой машине!");
        if (cash < 8000) return showToast("Нужно 8,000 ₽!");
        state.player.cash -= 8000;
        car.mileage = Math.round((car.mileage || 120000) * 0.5);
        car.rolledOdometer = true;
        showToast("Пробег смотан на 50%! Риск скандала у капота.");
    }

    saveState();
    renderGarage();
    openPreSaleModal(activePreSaleCarIndex);
    playSound('win');
    tgHaptic('success');
}

// ========================================================
// 5. СПОРТИВНЫЙ ТЮНИНГ
// ========================================================
function openTuningModal(idx) {
    activeTuningCarIndex = idx;
    const car = state.garage[idx];
    if (!car) return;

    if (!car.tuning) {
        car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 };
    }

    setTxt('tuneCarTitle', `Корчевание: <b>${car.name}</b> (${car.power || 100} л.с.)`);
    switchTuneTab(activeTuneTab || 'drift');
    
    const modal = document.getElementById('modalTuning');
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function switchTuneTab(tab) {
    activeTuneTab = tab;
    ['drag', 'drift', 'style'].forEach(t => {
        const btn = document.getElementById('tuneTab-' + t);
        if (btn) btn.className = (t === tab) ? 'btn btn-cyan btn-sm' : 'btn btn-dark btn-sm';
    });
    renderTuningItems();
}

function renderTuningItems() {
    const container = document.getElementById('tuningItemsContainer');
    if (!container || activeTuningCarIndex === null) return;

    const car = state.garage[activeTuningCarIndex];
    if (!car) return;
    const t = car.tuning || {};

    let html = "";

    // 1. ДРИФТ
    if (activeTuneTab === 'drift') {
        const driftMods = [
            { id: 'weldedDiff', name: '🔩 Заварка редуктора', cost: 12000, desc: 'Блокировка задней оси. Базовый допуск в Matsuri/Зимний дрифт.', bought: !!t.weldedDiff, risk: 5 },
            { id: 'steeringAngle', name: '📐 Красноярский выворот', cost: 25000, desc: 'Сошки и рычаги. Увеличенный выворот для глубокого угла постановки.', bought: !!t.steeringAngle, risk: 10 },
            { id: 'hydroHandbrake', name: '🕹️ Гидроручник с цилиндром Wilwood', cost: 35000, desc: 'Мгновенный срыв задней оси в занос. Обязателен для регламента RDS Europe/GP.', bought: !!t.hydroHandbrake, risk: 15 },
            { id: 'bucketSeats', name: '💺 Спортивные ковши с омологацией', cost: 45000, desc: 'Жёсткая фиксация пилота в перегрузках. Обязателен в высшей лиге RDS GP.', bought: !!t.bucketSeats, risk: 5 }
        ];

        driftMods.forEach(m => {
            let btn = m.bought 
                ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Установлено ✓</button>"
                : `<button onclick="buyTuningMod('${m.id}', ${m.cost}, 0, ${m.risk})" class="btn btn-red btn-sm btn-auto">${m.cost.toLocaleString()} ₽</button>`;

            html += `
            <div class="glass-card p-2 flex-between mb-2">
                <div style="flex:1; margin-right:8px;">
                    <b class="text-xs color-red">${m.name}</b>
                    <div class="sub-label" style="font-size:10px;">${m.desc}</div>
                </div>
                ${btn}
            </div>`;
        });
    } 
    // 2. ДРАГ
    else if (activeTuneTab === 'drag') {
        const dragMods = [
            { id: 'chip_stage1', name: '⚡ Чип-тюнинг Stage 1', cost: 30000, desc: '+25 л.с., сдвиг отсечки и активация ланч-контроля.', bought: t.chip >= 1, power: 25, risk: 5, action: "buyChipStage(1, 30000, 25)" },
            { id: 'chip_stage2', name: '🔥 Чип-тюнинг Stage 2 + Даунпайп', cost: 65000, desc: '+60 л.с., прямоточный выхлоп, попкорн и буст-ап.', bought: t.chip >= 2, power: 60, risk: 15, action: "buyChipStage(2, 65000, 60)" },
            { id: 'chip_stage3', name: '🚀 Stage 3 Big Turbo / Турбо-кит', cost: 180000, desc: '+150 л.с. Входной билет в лигу гиперкаров на 402м.', bought: t.chip >= 3, power: 150, risk: 25, action: "buyChipStage(3, 180000, 150)" },
            { id: 'dragSlicks', name: '🛞 Драговые полуслики Toyo R888R', cost: 45000, desc: 'Максимальный зацеп на старте (-0.6с к времени квотера).', bought: !!t.dragSlicks, power: 0, risk: 5, action: "buyTuningMod('dragSlicks', 45000, 0, 5)" },
            { id: 'rollCage', name: '🛡️ Вварной каркас безопасности', cost: 85000, desc: 'Обязателен по регламенту для заездов быстрее 10с и высшей лиги RDS GP.', bought: !!t.rollCage, power: 0, risk: 20, action: "buyTuningMod('rollCage', 85000, 0, 20)" }
        ];

        dragMods.forEach(m => {
            let btn = m.bought 
                ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Установлено ✓</button>"
                : `<button onclick="${m.action}" class="btn btn-cyan btn-sm btn-auto">${m.cost.toLocaleString()} ₽</button>`;

            html += `
            <div class="glass-card p-2 flex-between mb-2">
                <div style="flex:1; margin-right:8px;">
                    <b class="text-xs color-cyan">${m.name}</b>
                    <div class="sub-label" style="font-size:10px;">${m.desc}</div>
                </div>
                ${btn}
            </div>`;
        });
    }
    // 3. СТЕНС И СТИЛЬ
    else if (activeTuneTab === 'style') {
        const styleMods = [
            { id: 'stance', name: '🏎️ 4-контурная пневмоподвеска', cost: 75000, desc: 'Экстремальный дроп кузова в пол на парковке ТЦ (+35 к стенсу).', bought: !!t.stance, risk: 15 },
            { id: 'customWheels', name: '✨ Кованые диски Work Meister с полкой', cost: 60000, desc: 'Широкий вылет и правильный натяг резины домиком (+25 к стилю).', bought: !!t.customWheels, risk: 5 },
            { id: 'bodykit', name: '🌪️ Кастомный обвес / Расширение Rocket Bunny', cost: 50000, desc: 'Агрессивные фендеры и дактейл на багажник (+15 к стилю).', bought: !!t.bodykit, risk: 10 },
            { id: 'exhaust', name: '💨 Спортивная выхлопная трасса 76мм', cost: 35000, desc: 'Басистый звук выхлопа и отстрелы пламенем при переключениях.', bought: !!t.exhaust, risk: 10 }
        ];

        styleMods.forEach(m => {
            let btn = m.bought 
                ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Установлено ✓</button>"
                : `<button onclick="buyTuningMod('${m.id}', ${m.cost}, 0, ${m.risk})" class="btn btn-amber btn-sm btn-auto">${m.cost.toLocaleString()} ₽</button>`;

            html += `
            <div class="glass-card p-2 flex-between mb-2">
                <div style="flex:1; margin-right:8px;">
                    <b class="text-xs color-amber">${m.name}</b>
                    <div class="sub-label" style="font-size:10px;">${m.desc}</div>
                </div>
                ${btn}
            </div>`;
        });
    }

    container.innerHTML = html;
    updateTuneRiskMeter(car);
}

function buyTuningMod(modId, cost, powerGain, riskGain) {
    if (activeTuningCarIndex === null) return;
    const car = state.garage[activeTuningCarIndex];
    if (!car) return;

    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Не хватает денег на деталь!");

    state.player.cash -= cost;
    if (!car.tuning) car.tuning = {};
    car.tuning[modId] = true;

    if (powerGain > 0) car.power = (car.power || 100) + powerGain;
    car.tuning.risk1251 = Math.min(100, (car.tuning.risk1251 || 0) + riskGain);

    saveState();
    renderGarage();
    renderTuningItems();
    playSound('win');
    tgHaptic('success');
    showToast("Деталь установлена на автомобиль!");
}

function buyChipStage(stage, cost, powerGain) {
    if (activeTuningCarIndex === null) return;
    const car = state.garage[activeTuningCarIndex];
    if (!car) return;

    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Не хватает денег на прошивку!");

    state.player.cash -= cost;
    if (!car.tuning) car.tuning = {};
    car.tuning.chip = stage;
    car.power = (car.power || 100) + powerGain;
    car.tuning.risk1251 = Math.min(100, (car.tuning.risk1251 || 0) + 10);

    saveState();
    renderGarage();
    renderTuningItems();
    playSound('win');
    tgHaptic('success');
    showToast(`Прошивка Stage ${stage} залита (+${powerGain} л.с.)!`);
}

function updateTuneRiskMeter(car) {
    const riskVal = document.getElementById('tuneRiskValue');
    const riskFill = document.getElementById('tuneRiskFill');
    if (!riskVal || !riskFill || !car) return;

    let r = car.tuning?.risk1251 || 0;
    riskVal.innerText = `${r}%`;
    riskFill.style.width = `${r}%`;
    riskFill.className = r > 50 ? "risk-fill risk-high" : (r > 25 ? "risk-fill risk-mid" : "risk-fill risk-low");
}

// ========================================================
// 6. ОСМОТР, ЗВУК МОТОРА И OBD2 СКАНЕР
// ========================================================
function openCarPreviewModal(idx) {
    previewCarIndex = idx;
    const car = state.garage[idx];
    if (!car) return;

    const img = document.getElementById('prevImg');
    if (img) img.src = car.img || "assets/cars/economy/vaz-2107.jpg";

    setTxt('prevTitle', car.name || "Автомобиль");
    setTxt('prevPlate', `${car.customPlate || car.plate || "ТРАНЗИТ"} <div class='license-flag'>RUS</div>`);
    setTxt('prevPrice', `${(car.marketValue || car.basePrice || 100000).toLocaleString()} ₽`);
    
    let specsText = `${car.power || 100} л.с. | Пробег: ${(car.mileage || 85000).toLocaleString()} км | Состояние: ${car.condition || 80}%`;
    setTxt('prevSpecs', specsText);

    const modal = document.getElementById('modalPreview');
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function openTuningFromPreview() {
    if (previewCarIndex === null) return;
    let idx = previewCarIndex;
    closeModal('modalPreview');
    openTuningModal(idx);
}

function openOBD2Modal() {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car) return;

    setTxt('obd2CarTitle', `Диагностика: ${car.name}`);
    const resBox = document.getElementById('obd2ResultBox');
    const actBox = document.getElementById('obd2ActionBox');
    if (!resBox || !actBox) return;

    resBox.innerHTML = "Подключение адаптера ELM327 / Launch...<br>Чтение протоколов CAN-шины...";
    actBox.innerHTML = "";

    const modal = document.getElementById('modalOBD2');
    if (modal) modal.classList.add('active');
    playSound('tick');

    setTimeout(() => {
        let eng = car.wear?.engine ? Math.round(car.wear.engine) : 85;
        let trans = car.wear?.transmission ? Math.round(car.wear.transmission) : 85;

        if (car.hiddenDefect) {
            resBox.innerHTML = `
                <div class="color-red font-bold mb-1">⚠ ОБНАРУЖЕНА КРИТИЧЕСКАЯ ОШИБКА:</div>
                <div>Код: P0300 / Неисправность: <b>${car.hiddenDefect.text}</b></div>
                <div class="sub-label mt-1">Ориентировочная стоимость устранения: ~${(car.hiddenDefect.cost || 15000).toLocaleString()} ₽</div>
                <div class="mt-2 text-xs">Ресурс ДВС: ${eng}% | Ресурс КПП: ${trans}%</div>
            `;
            actBox.innerHTML = `<button onclick="repairDefectInGarage()" class="btn btn-purple btn-sm w-full mt-2">Устранить неисправность (${(car.hiddenDefect.cost || 15000).toLocaleString()} ₽)</button>`;
        } else {
            resBox.innerHTML = `
                <div class="color-green font-bold mb-1">✓ ОШИБОК В ЭБУ НЕ ОБНАРУЖЕНО</div>
                <div>Все блоки управления (DME/EGS/ABS) работают штатно.</div>
                <div class="mt-2 text-xs">Ресурс ДВС: <b class="color-green">${eng}%</b> | Ресурс КПП: <b class="color-green">${trans}%</b></div>
            `;
            actBox.innerHTML = `<button onclick="closeOBD2Modal()" class="btn btn-green btn-sm w-full mt-2">Всё в порядке</button>`;
        }
    }, 600);
}

function repairDefectInGarage() {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car || !car.hiddenDefect) return;

    let cost = car.hiddenDefect.cost || 15000;
    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Не хватает денег на устранение дефекта!");

    state.player.cash -= cost;
    car.hiddenDefect = null;
    car.condition = Math.min(100, (car.condition || 70) + 15);
    car.marketValue = Math.round((car.marketValue || car.basePrice) * 1.15);

    saveState();
    renderGarage();
    playSound('win');
    tgHaptic('success');
    showToast("Неисправность устранена! Ошибки из памяти ЭБУ удалены.");
    openOBD2Modal();
}

function closeOBD2Modal() {
    closeModal('modalOBD2');
}

// ========================================================
// 7. ВЫСТАВЛЕНИЕ НА ПРОДАЖУ
// ========================================================
function openPutOnLotModal(idx) {
    const car = state.garage[idx];
    if (!car) return;

    if (car.isPersonal) {
        return showToast("🚫 Это ваш личный авто! Снимите статус лички перед продажей.");
    }

    let askInput = document.getElementById('lotAskingPriceInput');
    let titleEl = document.getElementById('lotPutCarTitle');
    let costEl = document.getElementById('lotCostInfo');

    if (titleEl) titleEl.innerText = `${car.name} (${car.power || 100} л.с.)`;
    if (costEl) costEl.innerText = `Себестоимость выкупа: ${(car.purchaseCost || car.basePrice || 100000).toLocaleString()} ₽`;
    if (askInput) askInput.value = Math.round((car.marketValue || car.basePrice || 100000) * 1.15);

    window.currentLotPutIndex = idx;
    const modal = document.getElementById('modalPutOnLot');
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function confirmPutOnLot() {
    let idx = window.currentLotPutIndex;
    if (idx === undefined || idx === null) return;
    const car = state.garage[idx];
    if (!car) return;

    let askInput = document.getElementById('lotAskingPriceInput');
    let price = parseInt(askInput?.value || 0);
    if (isNaN(price) || price <= 0) return showToast("Укажите корректную цену продажи!");

    state.garage.splice(idx, 1);
    if (!state.salesLot) state.salesLot = [];

    // Время ожидания с учётом Кармы!
    let waitTime = (typeof calculateLotWaitTime === 'function') ? calculateLotWaitTime() : Math.floor(60 + Math.random() * 180);

    state.salesLot.push({
        car: car,
        askingPrice: price,
        timer: waitTime,
        maxTimer: waitTime,
        currentBuyer: null,
        buyerTimerLeft: 0
    });

    closeModal('modalPutOnLot');
    saveState();
    renderGarage();
    renderSalesLot();
    updateHeaderUI();
    playSound('win');
    tgHaptic('success');
    showToast(`«${car.name}» выставлен на площадку продажи!`);
}

// ========================================================
// 8. ГОСНОМЕРА И СТРАХОВАНИЕ
// ========================================================
function openChangePlateModal() {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car) return;

    const list = document.getElementById('changePlateList');
    if (!list) return;

    let plates = state.ownedPlates || [];
    if (plates.length === 0) {
        list.innerHTML = "<div class='sub-label text-center py-4'>У вас нет свободных госномеров в инвентаре.</div>";
    } else {
        let html = "";
        plates.forEach(p => {
            html += `
            <div class="glass-card flex-between p-2 mb-1">
                <span class="license-plate">${p} <div class="license-flag">RUS</div></span>
                <button onclick="applyPlateToCar('${p}')" class="btn btn-cyan btn-auto btn-sm">Повесить</button>
            </div>`;
        });
        list.innerHTML = html;
    }

    const modal = document.getElementById('modalChangePlate');
    if (modal) modal.classList.add('active');
}

function applyPlateToCar(plateStr) {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car) return;

    let curPlate = car.customPlate || car.plate;
    if (curPlate && curPlate !== "ТРАНЗИТ") {
        if (!state.ownedPlates) state.ownedPlates = [];
        state.ownedPlates.push(curPlate);
    }

    car.customPlate = plateStr;
    car.plate = plateStr;
    state.ownedPlates = (state.ownedPlates || []).filter(p => p !== plateStr);

    closeModal('modalChangePlate');
    saveState();
    renderGarage();
    openCarPreviewModal(previewCarIndex);
    playSound('win');
    tgHaptic('success');
    showToast(`Номера ${plateStr} установлены на автомобиль!`);
}

function removePlateFromCar() {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car) return;

    let curPlate = car.customPlate || car.plate;
    if (!curPlate || curPlate === "ТРАНЗИТ") return showToast("На машине уже висят транзиты!");

    let cash = state.player?.cash || 0;
    if (cash < 2000) return showToast("Нужно 2,000 ₽ на госпошлину снятия номеров!");

    state.player.cash -= 2000;
    if (!state.ownedPlates) state.ownedPlates = [];
    state.ownedPlates.push(curPlate);

    car.customPlate = "ТРАНЗИТ";
    car.plate = "ТРАНЗИТ";

    closeModal('modalChangePlate');
    saveState();
    renderGarage();
    openCarPreviewModal(previewCarIndex);
    playSound('win');
    tgHaptic('success');
    showToast(`Госномер ${curPlate} снят и убран в инвентарь!`);
}

function openInsuranceModalFromPreview() {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car) return;

    setTxt('insureCarTitle', `${car.name} (${car.customPlate || car.plate || "ТРАНЗИТ"})`);
    const modal = document.getElementById('modalInsurance');
    if (modal) modal.classList.add('active');
}

function confirmPurchaseInsurance(type) {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car) return;

    let cost = type === 'casco' ? 18000 : 7500;
    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Не хватает денег на полис страхования!");

    state.player.cash -= cost;
    car.insurance = type;

    closeModal('modalInsurance');
    saveState();
    renderGarage();
    openCarPreviewModal(previewCarIndex);
    playSound('win');
    tgHaptic('success');
    showToast(`Полис ${type === 'casco' ? 'КАСКО' : 'ОСАГО'} оформлен!`);
}

// ========================================================
// 9. СЛУЧАЙНЫЕ СОБЫТИЯ В ГАРАЖЕ ПРИ СМЕНЕ ДНЯ
// ========================================================
function triggerGarageRandomEvent() {
    if (!state.garage || state.garage.length === 0) return;
    if (Math.random() > 0.22) return;

    const randIdx = Math.floor(Math.random() * state.garage.length);
    const car = state.garage[randIdx];
    if (!car) return;

    activeGarageEventCar = { car: car, index: randIdx };

    const events = [
        {
            title: "Кошка поцарапала капот",
            desc: "Соседский кот прыгнул на капот и оставил следы когтей на лаке.",
            emoji: "🐱",
            badge: "ЛКП",
            actionText: "Заполировать (3,000 ₽)",
            cost: 3000,
            onIgnore: () => { car.condition = Math.max(10, (car.condition || 80) - 5); }
        },
        {
            title: "Попытка скрутить зеркала",
            desc: "Ночью во дворе хулиганы пытались снять зеркальные элементы.",
            emoji: "🪞",
            badge: "ВАНДАЛИЗМ",
            actionText: "Поставить защиту (5,000 ₽)",
            cost: 5000,
            onIgnore: () => { 
                if (car.insurance === 'casco') showToast("КАСКО полностью возместило ущерб!");
                else car.condition = Math.max(10, (car.condition || 80) - 10); 
            }
        },
        {
            title: "Сел аккумулятор на морозе",
            desc: "Из-за минусовой температуры батарея ушла в глубокий разряд.",
            emoji: "🔋",
            badge: "ЭЛЕКТРИКА",
            actionText: "Зарядить пусковым (1,500 ₽)",
            cost: 1500,
            onIgnore: () => { if (car.wear) car.wear.engine = Math.max(10, (car.wear.engine || 80) - 8); }
        }
    ];

    const ev = events[Math.floor(Math.random() * events.length)];
    activeGarageEventCar.event = ev;

    setTxt('garageEventEmoji', ev.emoji);
    setTxt('garageEventBadge', ev.badge);
    setTxt('garageEventTitle', ev.title);
    setTxt('garageEventDesc', ev.desc);
    setTxt('garageEventCarName', `${car.name} (${car.customPlate || car.plate || "ТРАНЗИТ"})`);

    const actBox = document.getElementById('garageEventActions');
    if (actBox) {
        actBox.innerHTML = `
            <button onclick="resolveGarageEvent('fix')" class="btn btn-cyan btn-sm w-full mb-1">${ev.actionText}</button>
            <button onclick="resolveGarageEvent('ignore')" class="btn btn-dark btn-sm w-full">Оставить как есть</button>
        `;
    }

    const modal = document.getElementById('modalGarageEvent');
    if (modal) modal.classList.add('active');
    playSound('error');
    tgHaptic('warning');
}

function resolveGarageEvent(type) {
    if (!activeGarageEventCar) return;
    const { car, event } = activeGarageEventCar;

    if (type === 'fix') {
        let cash = state.player?.cash || 0;
        if (cash < event.cost) return showToast("Не хватает денег на устранение!");
        state.player.cash -= event.cost;
        showToast("Проблема успешно устранена!");
        playSound('win');
        tgHaptic('success');
    } else {
        if (event.onIgnore) event.onIgnore();
        showToast("Вы проигнорировали инцидент. Состояние авто снизилось.");
        tgHaptic('error');
    }

    closeModal('modalGarageEvent');
    activeGarageEventCar = null;
    saveState();
    renderGarage();
    updateHeaderUI();
}
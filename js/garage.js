// ========================================================
// js/garage.js — АВТОПАРК, ЛИЧНЫЙ ТРАНСПОРТ, СПОРТИВНЫЙ ТЮНИНГ (v0.4.5)
// Разработчики: Илья Чепиль (DXF) & Perekup Dev Team
// Динамическая переоценка стоимости при установке госномеров,
// учет статуса регистрации (Учёт РФ vs ДКП), износ агрегатов и шин
// ========================================================

let previewCarIndex = null;[span_0](start_span)[span_0](end_span)
let activeTuningCarIndex = null;[span_1](start_span)[span_1](end_span)
let activePreSaleCarIndex = null;[span_2](start_span)[span_2](end_span)
let activeGarageEventCar = null;[span_3](start_span)[span_3](end_span)
let activeTuneTab = 'drift';[span_4](start_span)[span_4](end_span)

// ========================================================
// 0. ФОРМУЛА ДИНАМИЧЕСКОГО ПЕРЕРАСЧЕТА РЫНОЧНОЙ СТОИМОСТИ
// ========================================================
function recalculateCarMarketValue(car) {
    if (!car) return 0;[span_5](start_span)[span_5](end_span)

    // 1. Базовая стоимость кузова
    let base = car.baseMarketValue || car.basePrice || 100000;[span_6](start_span)[span_6](end_span)

    // 2. Влияние состояния кузова (от 50% до 105%)
    let cond = (car.condition !== undefined) ? car.condition : 80;[span_7](start_span)[span_7](end_span)
    let condMultiplier = 0.55 + (cond / 100) * 0.50; // 100% сост = 1.05x, 50% = 0.80x[span_8](start_span)[span_8](end_span)
    let currentVal = Math.round(base * condMultiplier);[span_9](start_span)[span_9](end_span)

    // 3. Установленный тюнинг (прибавка к стоимости проекта)
    let t = car.tuning || {};[span_10](start_span)[span_10](end_span)
    if (t.chip === 1) currentVal += 35000;[span_11](start_span)[span_11](end_span)
    else if (t.chip === 2) currentVal += 85000;[span_12](start_span)[span_12](end_span)
    else if (t.chip >= 3) currentVal += 220000;[span_13](start_span)[span_13](end_span)

    if (t.weldedDiff) currentVal += 15000;[span_14](start_span)[span_14](end_span)
    if (t.steeringAngle) currentVal += 30000;[span_15](start_span)[span_15](end_span)
    if (t.hydroHandbrake) currentVal += 40000;[span_16](start_span)[span_16](end_span)
    if (t.bucketSeats) currentVal += 50000;[span_17](start_span)[span_17](end_span)
    if (t.dragSlicks) currentVal += 50000;[span_18](start_span)[span_18](end_span)
    if (t.rollCage) currentVal += 95000;[span_19](start_span)[span_19](end_span)
    if (t.exhaust) currentVal += 40000;[span_20](start_span)[span_20](end_span)
    if (t.stance) currentVal += 85000;[span_21](start_span)[span_21](end_span)
    if (t.customWheels) currentVal += 70000;[span_22](start_span)[span_22](end_span)
    if (t.bodykit) currentVal += 60000;[span_23](start_span)[span_23](end_span)

    // 4. Предпродажный детейлинг
    if (car.isPolished) currentVal = Math.round(currentVal * 1.05);[span_24](start_span)[span_24](end_span)
    if (car.isRepainted) currentVal += 15000;[span_25](start_span)[span_25](end_span)

    // 5. Износ агрегатов и шин
    let engWear = car.wear?.engine !== undefined ? car.wear.engine : 85;
    let transWear = car.wear?.transmission !== undefined ? car.wear.transmission : 85;
    if (engWear < 50) currentVal = Math.round(currentVal * 0.85);
    if (transWear < 50) currentVal = Math.round(currentVal * 0.90);
    
    let tires = car.tireWear !== undefined ? car.tireWear : 100;
    if (tires < 30) currentVal = Math.max(10000, currentVal - 15000);

    // 6. Скрытый дефект (если не залит загуститель)
    if (car.hiddenDefect && !car.hasAdditive) {
        currentVal = Math.max(10000, currentVal - Math.round((car.hiddenDefect.cost || 15000) * 1.15));[span_26](start_span)[span_26](end_span)
    }

    // 7. ЦЕННОСТЬ ГОСНОМЕРА (БЛАТНЫЕ ЗНАКИ УВЕЛИЧИВАЮТ СТОИМОСТЬ МАШИНЫ)
    let plateStr = car.customPlate || car.plate || "ТРАНЗИТ";[span_27](start_span)[span_27](end_span)
    let plateBonus = 0;[span_28](start_span)[span_28](end_span)
    if (typeof calculatePlateValue === 'function') {
        plateBonus = calculatePlateValue(plateStr);[span_29](start_span)[span_29](end_span)
    }
    currentVal += plateBonus;[span_30](start_span)[span_30](end_span)

    car.marketValue = Math.round(currentVal);[span_31](start_span)[span_31](end_span)
    return car.marketValue;[span_32](start_span)[span_32](end_span)
}

// ========================================================
// 1. ОСНОВНОЙ РЕНДЕР ГАРАЖА
// ========================================================
function renderGarage() {
    const list = document.getElementById('garageList');[span_33](start_span)[span_33](end_span)
    if (!list) return;[span_34](start_span)[span_34](end_span)

    const maxSlots = getTotalGarageSlots();[span_35](start_span)[span_35](end_span)
    const currentSlots = state.garage ? state.garage.length : 0;[span_36](start_span)[span_36](end_span)
    
    setTxt('garageDetailedSlots', `${currentSlots} из ${maxSlots}`);[span_37](start_span)[span_37](end_span)
    setTxt('garageHeaderSlots', `${currentSlots}/${maxSlots}`);[span_38](start_span)[span_38](end_span)

    if (!state.garage || state.garage.length === 0) {[span_39](start_span)[span_39](end_span)
        list.innerHTML = `
            <div class="glass-card text-center sub-label py-8">
                <i class="fa-solid fa-warehouse color-cyan mb-2" style="font-size:36px;"></i>
                <div class="font-bold text-xs color-cyan mb-1">Ваш гараж пуст</div>
                <div style="font-size:10px;">Отправляйтесь на авторынок, вскройте сарай или выкупите лот на P2P бирже!</div>
            </div>`;[span_40](start_span)[span_40](end_span)
        return;[span_41](start_span)[span_41](end_span)
    }

    let html = "";[span_42](start_span)[span_42](end_span)
    state.garage.forEach((car, idx) => {[span_43](start_span)[span_43](end_span)
        if (!car) return;[span_44](start_span)[span_44](end_span)

        // Актуализируем рыночную стоимость машины перед показом
        recalculateCarMarketValue(car);[span_45](start_span)[span_45](end_span)

        let cName = car.name || "Автомобиль";[span_46](start_span)[span_46](end_span)
        let cPower = car.power || 100;[span_47](start_span)[span_47](end_span)
        let cImg = car.img || "assets/cars/economy/vaz-2107.jpg";[span_48](start_span)[span_48](end_span)
        let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";[span_49](start_span)[span_49](end_span)
        let cPrice = car.marketValue ? car.marketValue.toLocaleString() : (car.basePrice || 100000).toLocaleString();[span_50](start_span)[span_50](end_span)

        let isPersonal = !!car.isPersonal;[span_51](start_span)[span_51](end_span)
        let personalBadge = isPersonal 
            ? "<span class='tag-badge bg-tag-amber' style='box-shadow:0 0 10px rgba(255,179,0,0.5);'><i class='fa-solid fa-crown'></i> ЛИЧНЫЙ АВТО</span>[span_52](start_span)"[span_52](end_span)
            : "";

        let legalBadge = "";
        if (car.isStolen) {
            legalBadge = "<span class='tag-badge bg-tag-red'>🚨 В РОЗЫСКЕ</span>";[span_53](start_span)[span_53](end_span)
        } else if (car.unregistered) {
            legalBadge = "<span class='tag-badge bg-tag-red'>12.5.1 АННУЛИРОВАН</span>";
        } else if (car.isRegisteredOnPlayer) {
            legalBadge = "<span class='tag-badge bg-tag-green'>✓ УЧЁТ РФ (МРЭО)</span>";
        } else {
            let daysLeft = Math.max(0, 10 - (car.ownershipDays || 0));
            let dkpClass = daysLeft === 0 ? "bg-tag-red" : "bg-tag-amber";
            legalBadge = `<span class='tag-badge ${dkpClass}' title='Без постановки на учёт'>📄 НА ДКП (${daysLeft} дн. лимит)</span>`;
        }

        let insuranceBadge = car.insurance === 'casco'
            ? "<span class='tag-badge bg-tag-green ml-1'>🛡️ КАСКО</span>[span_54](start_span)"[span_54](end_span)
            : (car.insurance === 'osago' ? "<span class='tag-badge bg-tag-cyan ml-1'>📋 ОСАГО</span>" : "");[span_55](start_span)[span_55](end_span)

        let pVal = (typeof calculatePlateValue === 'function') ? calculatePlateValue(cPlate) : 0;[span_56](start_span)[span_56](end_span)
        let coolPlateBadge = pVal > 15000 
            ? `<span class='tag-badge bg-tag-purple ml-1' title='Блатной госномер (+${pVal.toLocaleString()} ₽ к стоимости)'><i class='fa-solid fa-gem'></i> БЛАТНОЙ</span>`[span_57](start_span)[span_57](end_span)
            : "";

        let tempVal = car.engineTemp || 90;
        let tempBadge = tempVal > 105 
            ? `<span class='tag-badge bg-tag-red ml-1'><i class='fa-solid fa-temperature-high'></i> ПЕРЕГРЕВ ${tempVal}°C</span>`
            : "";

        let tireVal = car.tireWear !== undefined ? car.tireWear : 100;
        let tireBadge = tireVal < 35 
            ? `<span class='tag-badge bg-tag-red ml-1'><i class='fa-solid fa-circle-notch'></i> СЛИК ИЗНОШЕН (${tireVal}%)</span>`
            : "";

        let modsIconsHtml = renderCarModsBadges(car);[span_58](start_span)[span_58](end_span)

        let personalBtn = isPersonal
            ? `<button onclick="togglePersonalCar(${idx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-crown color-amber"></i> Снять статус лички</button>`[span_59](start_span)[span_59](end_span)
            : `<button onclick="togglePersonalCar(${idx})" class="btn btn-amber btn-sm"><i class="fa-solid fa-crown"></i> Сделать личным</button>`;[span_60](start_span)[span_60](end_span)

        html += `
        <div class="glass-card mb-3 ${isPersonal ? 'personal-car-card' : ''}">
            <div class="car-img-wrap" style="height:145px;">
                <img src="${cImg}" class="car-img" onerror="this.src='assets/cars/economy/vaz-2107.jpg'">
                <div class="plate-corner">
                    <div class="license-plate">${cPlate} <div class="license-flag">RUS</div></div>
                </div>
                <div class="badge-tag" style="bottom:8px; right:8px; display:flex; gap:4px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
                    ${personalBadge}
                    ${legalBadge}
                    ${insuranceBadge}
                    ${coolPlateBadge}
                    ${tempBadge}
                    ${tireBadge}
                </div>
            </div>
            
            <div class="flex-between mb-1">
                <div>
                    <h4 class="font-bold">${cName}</h4>
                    <div class="sub-label">${cPower} л.с. | Пробег: ${(car.mileage || 85000).toLocaleString()} км | Кузов: ${car.condition || 80}%</div>
                </div>
                <div class="text-right">
                    <span class="text-xs color-green font-bold">ОЦЕНКА:</span>
                    <div class="price-val text-xs">${cPrice} ₽</div>
                </div>
            </div>

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
                <button onclick="selectCarForStreetDirect(${idx})" class="btn btn-red btn-sm"><i class="fa-solid fa-flag-checkered"></i> В Стрит / Дрифт</button>
            </div>

            <div>
                <button onclick="openPutOnLotModal(${idx})" class="btn btn-green btn-sm w-full" ${isPersonal ? 'disabled title="Снимите статус личного авто для продажи"' : ''}>
                    ${isPersonal ? '🔒 Личный авто (Не продаётся)' : '🏪 Выставить на продажу'}
                </button>
            </div>
        </div>`;[span_61](start_span)[span_61](end_span)
    });

    list.innerHTML = html;[span_62](start_span)[span_62](end_span)
}

// ========================================================
// 2. ИКОНКИ МОДИФИКАЦИЙ В КАРТОЧКЕ ГАРАЖА
// ========================================================
function renderCarModsBadges(car) {
    if (!car) return "";[span_63](start_span)[span_63](end_span)
    let t = car.tuning || {};[span_64](start_span)[span_64](end_span)
    let badges = [];[span_65](start_span)[span_65](end_span)

    if (t.chip === 1) badges.push(`<span class="mod-pill color-cyan" title="Stage 1 Чип"><i class="fa-solid fa-bolt"></i> St1</span>`);[span_66](start_span)[span_66](end_span)
    else if (t.chip === 2) badges.push(`<span class="mod-pill color-amber" title="Stage 2 + Выхлоп"><i class="fa-solid fa-fire"></i> St2</span>`);[span_67](start_span)[span_67](end_span)
    else if (t.chip >= 3) badges.push(`<span class="mod-pill color-red" title="Stage 3 Big Turbo"><i class="fa-solid fa-rocket"></i> St3</span>`);[span_68](start_span)[span_68](end_span)

    if (t.weldedDiff) badges.push(`<span class="mod-pill color-cyan" title="Заварка дифференциала"><i class="fa-solid fa-gear"></i> Заварка</span>`);[span_69](start_span)[span_69](end_span)
    if (t.steeringAngle) badges.push(`<span class="mod-pill color-green" title="Красноярский выворот"><i class="fa-solid fa-compass-drafting"></i> Выворот</span>`);[span_70](start_span)[span_70](end_span)
    if (t.hydroHandbrake) badges.push(`<span class="mod-pill color-red" title="Гидравлический ручник"><i class="fa-solid fa-gamepad"></i> Гидроручник</span>`);[span_71](start_span)[span_71](end_span)
    if (t.bucketSeats) badges.push(`<span class="mod-pill color-purple" title="Спортивные ковши"><i class="fa-solid fa-chair"></i> Ковши</span>`);[span_72](start_span)[span_72](end_span)

    if (t.dragSlicks) badges.push(`<span class="mod-pill color-amber" title="Драговые полуслики"><i class="fa-solid fa-circle-notch"></i> Слики</span>`);[span_73](start_span)[span_73](end_span)
    if (t.rollCage) badges.push(`<span class="mod-pill color-cyan" title="Вварной каркас безопасности"><i class="fa-solid fa-shield"></i> Каркас</span>`);[span_74](start_span)[span_74](end_span)
    if (t.exhaust) badges.push(`<span class="mod-pill color-amber" title="Прямоточный выхлоп"><i class="fa-solid fa-volume-high"></i> Выхлоп</span>`);[span_75](start_span)[span_75](end_span)

    if (t.stance) badges.push(`<span class="mod-pill color-purple" title="Пневмоподвеска"><i class="fa-solid fa-arrows-down-to-line"></i> Пневма</span>`);[span_76](start_span)[span_76](end_span)
    if (t.customWheels) badges.push(`<span class="mod-pill color-green" title="Кованые диски"><i class="fa-solid fa-compact-disc"></i> Ковка</span>`);[span_77](start_span)[span_77](end_span)
    if (t.bodykit) badges.push(`<span class="mod-pill color-cyan" title="Кастомный обвес"><i class="fa-solid fa-car-side"></i> Обвес</span>`);[span_78](start_span)[span_78](end_span)

    if (car.isPolished) badges.push(`<span class="mod-pill color-cyan" title="Полировка кузова"><i class="fa-solid fa-sparkles"></i> Блеск</span>`);[span_79](start_span)[span_79](end_span)
    if (car.isRepainted) badges.push(`<span class="mod-pill color-green" title="Свежий облив"><i class="fa-solid fa-paint-roller"></i> Облив</span>`);[span_80](start_span)[span_80](end_span)
    if (car.hasAdditive) badges.push(`<span class="mod-pill color-amber" title="Присадка в моторе"><i class="fa-solid fa-flask"></i> Присадка</span>`);[span_81](start_span)[span_81](end_span)
    if (car.rolledOdometer) badges.push(`<span class="mod-pill color-red" title="Скрученный одометр"><i class="fa-solid fa-clock-rotate-left"></i> Скручен</span>`);[span_82](start_span)[span_82](end_span)

    if (badges.length === 0) {
        return `<span class="sub-label" style="font-size:9px; opacity:0.6;"><i class="fa-solid fa-car"></i> Заводской сток</span>`;[span_83](start_span)[span_83](end_span)
    }

    return badges.join(' ');[span_84](start_span)[span_84](end_span)
}

// ========================================================
// 3. СТАТУС ЛИЧНОГО АВТОМОБИЛЯ
// ========================================================
function togglePersonalCar(idx) {
    const car = state.garage[idx];[span_85](start_span)[span_85](end_span)
    if (!car) return;[span_86](start_span)[span_86](end_span)

    if (car.isPersonal) {
        car.isPersonal = false;[span_87](start_span)[span_87](end_span)
        showToast(`«${car.name}» больше не является личным авто.`);[span_88](start_span)[span_88](end_span)
    } else {
        state.garage.forEach(c => { if (c) c.isPersonal = false; });[span_89](start_span)[span_89](end_span)
        car.isPersonal = true;[span_90](start_span)[span_90](end_span)
        state.player.selectedStreetCarIndex = idx;[span_91](start_span)[span_91](end_span)
        
        playSound('win');[span_92](start_span)[span_92](end_span)
        tgHaptic('success');[span_93](start_span)[span_93](end_span)
        showToast(`👑 «${car.name}» назначен вашим личным автомобилем!`);[span_94](start_span)[span_94](end_span)
    }

    saveState();[span_95](start_span)[span_95](end_span)
    renderGarage();[span_96](start_span)[span_96](end_span)
}

function selectCarForStreetDirect(idx) {
    state.player.selectedStreetCarIndex = idx;[span_97](start_span)[span_97](end_span)
    saveState();[span_98](start_span)[span_98](end_span)
    switchTab('tabPhone');[span_99](start_span)[span_99](end_span)
    setTimeout(() => {
        if (typeof PhoneManager !== 'undefined') {
            PhoneManager.openApp('street');[span_100](start_span)[span_100](end_span)
        }
    }, 150);[span_101](start_span)[span_101](end_span)
}

function buyGarageSlot() {
    const cost = getGarageSlotCost();[span_102](start_span)[span_102](end_span)
    const cash = state.player?.cash || 0;[span_103](start_span)[span_103](end_span)
    if (cash < cost) return showToast("Не хватает денег на покупку бокса!");[span_104](start_span)[span_104](end_span)

    state.player.cash -= cost;[span_105](start_span)[span_105](end_span)
    state.player.baseSlots = (state.player.baseSlots || 2) + 1;[span_106](start_span)[span_106](end_span)
    saveState();[span_107](start_span)[span_107](end_span)
    updateHeaderUI();[span_108](start_span)[span_108](end_span)
    renderGarage();[span_109](start_span)[span_109](end_span)
    playSound('win');[span_110](start_span)[span_110](end_span)
    tgHaptic('success');[span_111](start_span)[span_111](end_span)
    showToast(`Гараж расширен! Новая вместимость: ${getTotalGarageSlots()} мест.`);[span_112](start_span)[span_112](end_span)
}

// ========================================================
// 4. ДЕТЕЙЛИНГ И ПРЕДПРОДАЖНАЯ ПОДГОТОВКА
// ========================================================
function openPreSaleModal(idx) {
    activePreSaleCarIndex = idx;[span_113](start_span)[span_113](end_span)
    const car = state.garage[idx];[span_114](start_span)[span_114](end_span)
    if (!car) return;[span_115](start_span)[span_115](end_span)

    setTxt('preSaleCarTitle', `Детейлинг: <b>${car.name}</b> (${car.power || 100} л.с.)`);[span_116](start_span)[span_116](end_span)

    const btnClean = document.getElementById('btnCleanPrice');[span_117](start_span)[span_117](end_span)
    if (btnClean) {[span_118](start_span)[span_118](end_span)
        if (car.isPolished) {[span_119](start_span)[span_119](end_span)
            btnClean.disabled = true;[span_120](start_span)[span_120](end_span)
            btnClean.innerText = "Сделано ✓";[span_121](start_span)[span_121](end_span)
            btnClean.className = "btn btn-dark btn-sm opacity-50";[span_122](start_span)[span_122](end_span)
        } else {
            btnClean.disabled = false;[span_123](start_span)[span_123](end_span)
            btnClean.innerText = "4,000 ₽";[span_124](start_span)[span_124](end_span)
            btnClean.className = "btn btn-cyan btn-sm";[span_125](start_span)[span_125](end_span)
        }
    }

    const btnPaint = document.getElementById('btnPaintPrice');[span_126](start_span)[span_126](end_span)
    if (btnPaint) {[span_127](start_span)[span_127](end_span)
        if (car.isRepainted || car.condition >= 100) {[span_128](start_span)[span_128](end_span)
            btnPaint.disabled = true;[span_129](start_span)[span_129](end_span)
            btnPaint.innerText = car.condition >= 100 ? "Идеал (100%) ✓" : "Окрашено ✓";[span_130](start_span)[span_130](end_span)
            btnPaint.className = "btn btn-dark btn-sm opacity-50";[span_131](start_span)[span_131](end_span)
        } else {
            btnPaint.disabled = false;[span_132](start_span)[span_132](end_span)
            btnPaint.innerText = "12,000 ₽";[span_133](start_span)[span_133](end_span)
            btnPaint.className = "btn btn-dark btn-sm";[span_134](start_span)[span_134](end_span)
        }
    }

    const btnAdditive = document.getElementById('btnAdditivePrice');[span_135](start_span)[span_135](end_span)
    if (btnAdditive) {[span_136](start_span)[span_136](end_span)
        if (car.hasAdditive) {[span_137](start_span)[span_137](end_span)
            btnAdditive.disabled = true;[span_138](start_span)[span_138](end_span)
            btnAdditive.innerText = "Залита ✓";[span_139](start_span)[span_139](end_span)
            btnAdditive.className = "btn btn-dark btn-sm opacity-50";[span_140](start_span)[span_140](end_span)
        } else {
            btnAdditive.disabled = false;[span_141](start_span)[span_141](end_span)
            btnAdditive.innerText = "6,000 ₽";[span_142](start_span)[span_142](end_span)
            btnAdditive.className = "btn btn-amber btn-sm";[span_143](start_span)[span_143](end_span)
        }
    }

    const btnOdometer = document.getElementById('btnOdometerPrice');[span_144](start_span)[span_144](end_span)
    if (btnOdometer) {[span_145](start_span)[span_145](end_span)
        if (car.rolledOdometer) {[span_146](start_span)[span_146](end_span)
            btnOdometer.disabled = true;[span_147](start_span)[span_147](end_span)
            btnOdometer.innerText = "Уже скручен ✓";[span_148](start_span)[span_148](end_span)
            btnOdometer.className = "btn btn-dark btn-sm opacity-50";[span_149](start_span)[span_149](end_span)
        } else {
            btnOdometer.disabled = false;[span_150](start_span)[span_150](end_span)
            btnOdometer.innerText = "8,000 ₽";[span_151](start_span)[span_151](end_span)
            btnOdometer.className = "btn btn-danger btn-sm";[span_152](start_span)[span_152](end_span)
        }
    }

    const modal = document.getElementById('modalPreSale');[span_153](start_span)[span_153](end_span)
    if (modal) modal.classList.add('active');[span_154](start_span)[span_154](end_span)
    playSound('tick');[span_155](start_span)[span_155](end_span)
}

function applyPreSaleMod(type) {
    if (activePreSaleCarIndex === null) return;[span_156](start_span)[span_156](end_span)
    const car = state.garage[activePreSaleCarIndex];[span_157](start_span)[span_157](end_span)
    if (!car) return;[span_158](start_span)[span_158](end_span)

    let cash = state.player?.cash || 0;[span_159](start_span)[span_159](end_span)

    if (type === 'clean') {[span_160](start_span)[span_160](end_span)
        if (car.isPolished) return showToast("Машина уже отполирована до блеска!");[span_161](start_span)[span_161](end_span)
        if (cash < 4000) return showToast("Нужно 4,000 ₽!");[span_162](start_span)[span_162](end_span)
        state.player.cash -= 4000;[span_163](start_span)[span_163](end_span)
        car.isPolished = true;[span_164](start_span)[span_164](end_span)
        recalculateCarMarketValue(car);[span_165](start_span)[span_165](end_span)
        showToast("Кузов отполирован (+5% к рыночной цене)!");[span_166](start_span)[span_166](end_span)
    } else if (type === 'paint') {[span_167](start_span)[span_167](end_span)
        if (car.isRepainted) return showToast("Кузов уже был повторно окрашен!");[span_168](start_span)[span_168](end_span)
        if (car.condition >= 100) return showToast("Состояние кузова и так 100%!");[span_169](start_span)[span_169](end_span)
        if (cash < 12000) return showToast("Нужно 12,000 ₽!");[span_170](start_span)[span_170](end_span)
        state.player.cash -= 12000;[span_171](start_span)[span_171](end_span)
        car.isRepainted = true;[span_172](start_span)[span_172](end_span)
        car.condition = Math.min(100, (car.condition || 60) + 20);[span_173](start_span)[span_173](end_span)
        recalculateCarMarketValue(car);[span_174](start_span)[span_174](end_span)
        showToast("Кузов полностью перекрашен (+20% состояния)!");[span_175](start_span)[span_175](end_span)
    } else if (type === 'additive') {[span_176](start_span)[span_176](end_span)
        if (car.hasAdditive) return showToast("В масло уже залита присадка!");[span_177](start_span)[span_177](end_span)
        if (cash < 6000) return showToast("Нужно 6,000 ₽!");[span_178](start_span)[span_178](end_span)
        state.player.cash -= 6000;[span_179](start_span)[span_179](end_span)
        car.hasAdditive = true;[span_180](start_span)[span_180](end_span)
        recalculateCarMarketValue(car);[span_181](start_span)[span_181](end_span)
        showToast("Присадка залита! Стуки мотора скрыты (Опасно в торгах!)");[span_182](start_span)[span_182](end_span)
    } else if (type === 'odometer') {[span_183](start_span)[span_183](end_span)
        if (car.rolledOdometer) return showToast("Пробег уже скручивался на этой машине!");[span_184](start_span)[span_184](end_span)
        if (cash < 8000) return showToast("Нужно 8,000 ₽!");[span_185](start_span)[span_185](end_span)
        state.player.cash -= 8000;[span_186](start_span)[span_186](end_span)
        car.mileage = Math.round((car.mileage || 120000) * 0.5);[span_187](start_span)[span_187](end_span)
        car.rolledOdometer = true;[span_188](start_span)[span_188](end_span)
        showToast("Пробег смотан на 50%! Риск скандала у капота.");[span_189](start_span)[span_189](end_span)
    }

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('presale_mod', 1);
    }

    saveState();[span_190](start_span)[span_190](end_span)
    renderGarage();[span_191](start_span)[span_191](end_span)
    openPreSaleModal(activePreSaleCarIndex);[span_192](start_span)[span_192](end_span)
    playSound('win');[span_193](start_span)[span_193](end_span)
    tgHaptic('success');[span_194](start_span)[span_194](end_span)
}

// ========================================================
// 5. СПОРТИВНЫЙ ТЮНИНГ
// ========================================================
function openTuningModal(idx) {
    activeTuningCarIndex = idx;[span_195](start_span)[span_195](end_span)
    const car = state.garage[idx];[span_196](start_span)[span_196](end_span)
    if (!car) return;[span_197](start_span)[span_197](end_span)

    if (!car.tuning) {[span_198](start_span)[span_198](end_span)
        car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 };[span_199](start_span)[span_199](end_span)
    }

    setTxt('tuneCarTitle', `Корчевание: <b>${car.name}</b> (${car.power || 100} л.с.)`);[span_200](start_span)[span_200](end_span)
    switchTuneTab(activeTuneTab || 'drift');[span_201](start_span)[span_201](end_span)
    
    const modal = document.getElementById('modalTuning');[span_202](start_span)[span_202](end_span)
    if (modal) modal.classList.add('active');[span_203](start_span)[span_203](end_span)
    playSound('tick');[span_204](start_span)[span_204](end_span)
}

function switchTuneTab(tab) {
    activeTuneTab = tab;[span_205](start_span)[span_205](end_span)
    ['drag', 'drift', 'style'].forEach(t => {[span_206](start_span)[span_206](end_span)
        const btn = document.getElementById('tuneTab-' + t);[span_207](start_span)[span_207](end_span)
        if (btn) btn.className = (t === tab) ? 'btn btn-cyan btn-sm' : 'btn btn-dark btn-sm';[span_208](start_span)[span_208](end_span)
    });
    renderTuningItems();[span_209](start_span)[span_209](end_span)
}

function renderTuningItems() {
    const container = document.getElementById('tuningItemsContainer');[span_210](start_span)[span_210](end_span)
    if (!container || activeTuningCarIndex === null) return;[span_211](start_span)[span_211](end_span)

    const car = state.garage[activeTuningCarIndex];[span_212](start_span)[span_212](end_span)
    if (!car) return;[span_213](start_span)[span_213](end_span)
    const t = car.tuning || {};[span_214](start_span)[span_214](end_span)

    let html = "";[span_215](start_span)[span_215](end_span)

    // 1. ДРИФТ
    if (activeTuneTab === 'drift') {[span_216](start_span)[span_216](end_span)
        const driftMods = [
            { id: 'weldedDiff', name: '🔩 Заварка редуктора', cost: 12000, desc: 'Блокировка задней оси. Базовый допуск в Matsuri/Зимний дрифт.', bought: !!t.weldedDiff, risk: 5 },[span_217](start_span)[span_217](end_span)
            { id: 'steeringAngle', name: '📐 Красноярский выворот', cost: 25000, desc: 'Сошки и рычаги. Увеличенный выворот для глубокого угла постановки.', bought: !!t.steeringAngle, risk: 10 },[span_218](start_span)[span_218](end_span)
            { id: 'hydroHandbrake', name: '🕹️ Гидроручник с цилиндром Wilwood', cost: 35000, desc: 'Мгновенный срыв задней оси в занос. Обязателен для регламента RDS Europe/GP.', bought: !!t.hydroHandbrake, risk: 15 },[span_219](start_span)[span_219](end_span)
            { id: 'bucketSeats', name: '💺 Спортивные ковши с омологацией', cost: 45000, desc: 'Жёсткая фиксация пилота в перегрузках. Обязателен в высшей лиге RDS GP.', bought: !!t.bucketSeats, risk: 5 }[span_220](start_span)[span_220](end_span)
        ];

        driftMods.forEach(m => {[span_221](start_span)[span_221](end_span)
            let btn = m.bought 
                ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Установлено ✓</button>[span_222](start_span)"[span_222](end_span)
                : `<button onclick="buyTuningMod('${m.id}', ${m.cost}, 0, ${m.risk})" class="btn btn-red btn-sm btn-auto">${m.cost.toLocaleString()} ₽</button>`;[span_223](start_span)[span_223](end_span)

            html += `
            <div class="glass-card p-2 flex-between mb-2">
                <div style="flex:1; margin-right:8px;">
                    <b class="text-xs color-red">${m.name}</b>
                    <div class="sub-label" style="font-size:10px;">${m.desc}</div>
                </div>
                ${btn}
            </div>`;[span_224](start_span)[span_224](end_span)
        });
    } 
    // 2. ДРАГ
    else if (activeTuneTab === 'drag') {[span_225](start_span)[span_225](end_span)
        const dragMods = [
            { id: 'chip_stage1', name: '⚡ Чип-тюнинг Stage 1', cost: 30000, desc: '+25 л.с., сдвиг отсечки и активация ланч-контроля.', bought: t.chip >= 1, power: 25, risk: 5, action: "buyChipStage(1, 30000, 25)" },[span_226](start_span)[span_226](end_span)
            { id: 'chip_stage2', name: '🔥 Чип-тюнинг Stage 2 + Даунпайп', cost: 65000, desc: '+60 л.с., прямоточный выхлоп, попкорн и буст-ап.', bought: t.chip >= 2, power: 60, risk: 15, action: "buyChipStage(2, 65000, 60)" },[span_227](start_span)[span_227](end_span)
            { id: 'chip_stage3', name: '🚀 Stage 3 Big Turbo / Турбо-кит', cost: 180000, desc: '+150 л.с. Входной билет в лигу гиперкаров на 402м.', bought: t.chip >= 3, power: 150, risk: 25, action: "buyChipStage(3, 180000, 150)" },[span_228](start_span)[span_228](end_span)
            { id: 'dragSlicks', name: '🛞 Драговые полуслики Toyo R888R', cost: 45000, desc: 'Максимальный зацеп на старте (-0.6с к времени квотера).', bought: !!t.dragSlicks, power: 0, risk: 5, action: "buyTuningMod('dragSlicks', 45000, 0, 5)" },[span_229](start_span)[span_229](end_span)
            { id: 'rollCage', name: '🛡️ Вварной каркас безопасности', cost: 85000, desc: 'Обязателен по регламенту для заездов быстрее 10с и высшей лиги RDS GP.', bought: !!t.rollCage, power: 0, risk: 20, action: "buyTuningMod('rollCage', 85000, 0, 20)" }[span_230](start_span)[span_230](end_span)
        ];

        dragMods.forEach(m => {[span_231](start_span)[span_231](end_span)
            let btn = m.bought 
                ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Установлено ✓</button>[span_232](start_span)"[span_232](end_span)
                : `<button onclick="${m.action}" class="btn btn-cyan btn-sm btn-auto">${m.cost.toLocaleString()} ₽</button>`;[span_233](start_span)[span_233](end_span)

            html += `
            <div class="glass-card p-2 flex-between mb-2">
                <div style="flex:1; margin-right:8px;">
                    <b class="text-xs color-cyan">${m.name}</b>
                    <div class="sub-label" style="font-size:10px;">${m.desc}</div>
                </div>
                ${btn}
            </div>`;[span_234](start_span)[span_234](end_span)
        });
    }
    // 3. СТЕНС И СТИЛЬ
    else if (activeTuneTab === 'style') {[span_235](start_span)[span_235](end_span)
        const styleMods = [
            { id: 'stance', name: '🏎️ 4-контурная пневмоподвеска', cost: 75000, desc: 'Экстремальный дроп кузова в пол на парковке ТЦ (+35 к стенсу).', bought: !!t.stance, risk: 15 },[span_236](start_span)[span_236](end_span)
            { id: 'customWheels', name: '✨ Кованые диски Work Meister с полкой', cost: 60000, desc: 'Широкий вылет и правильный натяг резины домиком (+25 к стилю).', bought: !!t.customWheels, risk: 5 },[span_237](start_span)[span_237](end_span)
            { id: 'bodykit', name: '🌪️ Кастомный обвес / Расширение Rocket Bunny', cost: 50000, desc: 'Агрессивные фендеры и дактейл на багажник (+15 к стилю).', bought: !!t.bodykit, risk: 10 },[span_238](start_span)[span_238](end_span)
            { id: 'exhaust', name: '💨 Спортивная выхлопная трасса 76мм', cost: 35000, desc: 'Басистый звук выхлопа и отстрелы пламенем при переключениях.', bought: !!t.exhaust, risk: 10 }[span_239](start_span)[span_239](end_span)
        ];

        styleMods.forEach(m => {[span_240](start_span)[span_240](end_span)
            let btn = m.bought 
                ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Установлено ✓</button>[span_241](start_span)"[span_241](end_span)
                : `<button onclick="buyTuningMod('${m.id}', ${m.cost}, 0, ${m.risk})" class="btn btn-amber btn-sm btn-auto">${m.cost.toLocaleString()} ₽</button>`;[span_242](start_span)[span_242](end_span)

            html += `
            <div class="glass-card p-2 flex-between mb-2">
                <div style="flex:1; margin-right:8px;">
                    <b class="text-xs color-amber">${m.name}</b>
                    <div class="sub-label" style="font-size:10px;">${m.desc}</div>
                </div>
                ${btn}
            </div>`;[span_243](start_span)[span_243](end_span)
        });
    }

    container.innerHTML = html;[span_244](start_span)[span_244](end_span)
    updateTuneRiskMeter(car);[span_245](start_span)[span_245](end_span)
}

function buyTuningMod(modId, cost, powerGain, riskGain) {
    if (activeTuningCarIndex === null) return;[span_246](start_span)[span_246](end_span)
    const car = state.garage[activeTuningCarIndex];[span_247](start_span)[span_247](end_span)
    if (!car) return;[span_248](start_span)[span_248](end_span)

    let cash = state.player?.cash || 0;[span_249](start_span)[span_249](end_span)
    if (cash < cost) return showToast("Не хватает денег на деталь!");[span_250](start_span)[span_250](end_span)

    state.player.cash -= cost;[span_251](start_span)[span_251](end_span)
    if (!car.tuning) car.tuning = {};[span_252](start_span)[span_252](end_span)
    car.tuning[modId] = true;[span_253](start_span)[span_253](end_span)

    if (powerGain > 0) car.power = (car.power || 100) + powerGain;[span_254](start_span)[span_254](end_span)
    car.tuning.risk1251 = Math.min(100, (car.tuning.risk1251 || 0) + riskGain);[span_255](start_span)[span_255](end_span)

    recalculateCarMarketValue(car);[span_256](start_span)[span_256](end_span)

    saveState();[span_257](start_span)[span_257](end_span)
    renderGarage();[span_258](start_span)[span_258](end_span)
    renderTuningItems();[span_259](start_span)[span_259](end_span)
    playSound('win');[span_260](start_span)[span_260](end_span)
    tgHaptic('success');[span_261](start_span)[span_261](end_span)
    showToast("Деталь установлена на автомобиль!");[span_262](start_span)[span_262](end_span)
}

function buyChipStage(stage, cost, powerGain) {
    if (activeTuningCarIndex === null) return;[span_263](start_span)[span_263](end_span)
    const car = state.garage[activeTuningCarIndex];[span_264](start_span)[span_264](end_span)
    if (!car) return;[span_265](start_span)[span_265](end_span)

    let cash = state.player?.cash || 0;[span_266](start_span)[span_266](end_span)
    if (cash < cost) return showToast("Не хватает денег на прошивку!");[span_267](start_span)[span_267](end_span)

    state.player.cash -= cost;[span_268](start_span)[span_268](end_span)
    if (!car.tuning) car.tuning = {};[span_269](start_span)[span_269](end_span)
    car.tuning.chip = stage;[span_270](start_span)[span_270](end_span)
    car.power = (car.power || 100) + powerGain;[span_271](start_span)[span_271](end_span)
    car.tuning.risk1251 = Math.min(100, (car.tuning.risk1251 || 0) + 10);[span_272](start_span)[span_272](end_span)

    recalculateCarMarketValue(car);[span_273](start_span)[span_273](end_span)

    saveState();[span_274](start_span)[span_274](end_span)
    renderGarage();[span_275](start_span)[span_275](end_span)
    renderTuningItems();[span_276](start_span)[span_276](end_span)
    playSound('win');[span_277](start_span)[span_277](end_span)
    tgHaptic('success');[span_278](start_span)[span_278](end_span)
    showToast(`Прошивка Stage ${stage} залита (+${powerGain} л.с.)!`);[span_279](start_span)[span_279](end_span)
}

function updateTuneRiskMeter(car) {
    const riskVal = document.getElementById('tuneRiskValue');[span_280](start_span)[span_280](end_span)
    const riskFill = document.getElementById('tuneRiskFill');[span_281](start_span)[span_281](end_span)
    if (!riskVal || !riskFill || !car) return;[span_282](start_span)[span_282](end_span)

    let r = car.tuning?.risk1251 || 0;[span_283](start_span)[span_283](end_span)
    riskVal.innerText = `${r}%`;[span_284](start_span)[span_284](end_span)
    riskFill.style.width = `${r}%`;[span_285](start_span)[span_285](end_span)
    riskFill.className = r > 50 ? "risk-fill risk-high" : (r > 25 ? "risk-fill risk-mid" : "risk-fill risk-low");[span_286](start_span)[span_286](end_span)
}

// ========================================================
// 6. ОСМОТР, ЗВУК МОТОРА, СЕРВИС ШИН И OBD2 СКАНЕР
// ========================================================
function openCarPreviewModal(idx) {
    previewCarIndex = idx;[span_287](start_span)[span_287](end_span)
    const car = state.garage[idx];[span_288](start_span)[span_288](end_span)
    if (!car) return;[span_289](start_span)[span_289](end_span)

    recalculateCarMarketValue(car);[span_290](start_span)[span_290](end_span)

    const img = document.getElementById('prevImg');[span_291](start_span)[span_291](end_span)
    if (img) img.src = car.img || "assets/cars/economy/vaz-2107.jpg";[span_292](start_span)[span_292](end_span)

    setTxt('prevTitle', car.name || "Автомобиль");[span_293](start_span)[span_293](end_span)
    setTxt('prevPlate', `${car.customPlate || car.plate || "ТРАНЗИТ"} <div class='license-flag'>RUS</div>`);[span_294](start_span)[span_294](end_span)
    setTxt('prevPrice', `${(car.marketValue || car.basePrice || 100000).toLocaleString()} ₽`);[span_295](start_span)[span_295](end_span)
    
    let specsText = `${car.power || 100} л.с. | Пробег: ${(car.mileage || 85000).toLocaleString()} км | Состояние: ${car.condition || 80}%`;[span_296](start_span)[span_296](end_span)
    setTxt('prevSpecs', specsText);[span_297](start_span)[span_297](end_span)

    const modal = document.getElementById('modalPreview');[span_298](start_span)[span_298](end_span)
    if (modal) modal.classList.add('active');[span_299](start_span)[span_299](end_span)
    playSound('tick');[span_300](start_span)[span_300](end_span)
}

function openTuningFromPreview() {
    if (previewCarIndex === null) return;[span_301](start_span)[span_301](end_span)
    let idx = previewCarIndex;[span_302](start_span)[span_302](end_span)
    closeModal('modalPreview');[span_303](start_span)[span_303](end_span)
    openTuningModal(idx);[span_304](start_span)[span_304](end_span)
}

function openOBD2Modal() {
    if (previewCarIndex === null) return;[span_305](start_span)[span_305](end_span)
    const car = state.garage[previewCarIndex];[span_306](start_span)[span_306](end_span)
    if (!car) return;[span_307](start_span)[span_307](end_span)

    setTxt('obd2CarTitle', `Диагностика: ${car.name}`);[span_308](start_span)[span_308](end_span)
    const resBox = document.getElementById('obd2ResultBox');[span_309](start_span)[span_309](end_span)
    const actBox = document.getElementById('obd2ActionBox');[span_310](start_span)[span_310](end_span)
    if (!resBox || !actBox) return;[span_311](start_span)[span_311](end_span)

    resBox.innerHTML = "Подключение адаптера ELM327 / Launch...<br>Чтение протоколов CAN-шины...";[span_312](start_span)[span_312](end_span)
    actBox.innerHTML = "";[span_313](start_span)[span_313](end_span)

    const modal = document.getElementById('modalOBD2');[span_314](start_span)[span_314](end_span)
    if (modal) modal.classList.add('active');[span_315](start_span)[span_315](end_span)
    playSound('tick');[span_316](start_span)[span_316](end_span)

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('obd_scan', 1);
    }

    setTimeout(() => {
        let eng = car.wear?.engine ? Math.round(car.wear.engine) : 85;[span_317](start_span)[span_317](end_span)
        let trans = car.wear?.transmission ? Math.round(car.wear.transmission) : 85;[span_318](start_span)[span_318](end_span)

        if (car.hiddenDefect) {[span_319](start_span)[span_319](end_span)
            resBox.innerHTML = `
                <div class="color-red font-bold mb-1">⚠ ОБНАРУЖЕНА КРИТИЧЕСКАЯ ОШИБКА:</div>
                <div>Код: P0300 / Неисправность: <b>${car.hiddenDefect.text}</b></div>
                <div class="sub-label mt-1">Ориентировочная стоимость устранения: ~${(car.hiddenDefect.cost || 15000).toLocaleString()} ₽</div>
                <div class="mt-2 text-xs">Ресурс ДВС: ${eng}% | Ресурс КПП: ${trans}%</div>
            `;[span_320](start_span)[span_320](end_span)
            actBox.innerHTML = `<button onclick="repairDefectInGarage()" class="btn btn-purple btn-sm w-full mt-2">Устранить неисправность (${(car.hiddenDefect.cost || 15000).toLocaleString()} ₽)</button>`;[span_321](start_span)[span_321](end_span)
        } else {
            resBox.innerHTML = `
                <div class="color-green font-bold mb-1">✓ ОШИБОК В ЭБУ НЕ ОБНАРУЖЕНО</div>
                <div>Все блоки управления (DME/EGS/ABS) работают штатно.</div>
                <div class="mt-2 text-xs">Ресурс ДВС: <b class="color-green">${eng}%</b> | Ресурс КПП: <b class="color-green">${trans}%</b></div>
            `;[span_322](start_span)[span_322](end_span)
            actBox.innerHTML = `<button onclick="closeOBD2Modal()" class="btn btn-green btn-sm w-full mt-2">Всё в порядке</button>`;[span_323](start_span)[span_323](end_span)
        }
    }, 600);[span_324](start_span)[span_324](end_span)
}

function repairDefectInGarage() {
    if (previewCarIndex === null) return;[span_325](start_span)[span_325](end_span)
    const car = state.garage[previewCarIndex];[span_326](start_span)[span_326](end_span)
    if (!car || !car.hiddenDefect) return;[span_327](start_span)[span_327](end_span)

    let cost = car.hiddenDefect.cost || 15000;[span_328](start_span)[span_328](end_span)
    let cash = state.player?.cash || 0;[span_329](start_span)[span_329](end_span)
    if (cash < cost) return showToast("Не хватает денег на устранение дефекта!");[span_330](start_span)[span_330](end_span)

    state.player.cash -= cost;[span_331](start_span)[span_331](end_span)
    car.hiddenDefect = null;[span_332](start_span)[span_332](end_span)
    car.condition = Math.min(100, (car.condition || 70) + 15);[span_333](start_span)[span_333](end_span)
    recalculateCarMarketValue(car);[span_334](start_span)[span_334](end_span)

    saveState();[span_335](start_span)[span_335](end_span)
    renderGarage();[span_336](start_span)[span_336](end_span)
    playSound('win');[span_337](start_span)[span_337](end_span)
    tgHaptic('success');[span_338](start_span)[span_338](end_span)
    showToast("Неисправность устранена! Ошибки из памяти ЭБУ удалены.");[span_339](start_span)[span_339](end_span)
    openOBD2Modal();[span_340](start_span)[span_340](end_span)
}

function closeOBD2Modal() {
    closeModal('modalOBD2');[span_341](start_span)[span_341](end_span)
}

// ========================================================
// 7. ВЫСТАВЛЕНИЕ НА ПРОДАЖУ
// ========================================================
function openPutOnLotModal(idx) {
    const car = state.garage[idx];[span_342](start_span)[span_342](end_span)
    if (!car) return;[span_343](start_span)[span_343](end_span)

    if (car.isPersonal) {[span_344](start_span)[span_344](end_span)
        return showToast("🚫 Это ваш личный авто! Снимите статус лички перед продажей.");[span_345](start_span)[span_345](end_span)
    }

    recalculateCarMarketValue(car);[span_346](start_span)[span_346](end_span)

    let askInput = document.getElementById('lotAskingPriceInput');[span_347](start_span)[span_347](end_span)
    let titleEl = document.getElementById('lotPutCarTitle');[span_348](start_span)[span_348](end_span)
    let costEl = document.getElementById('lotCostInfo');[span_349](start_span)[span_349](end_span)

    if (titleEl) titleEl.innerText = `${car.name} (${car.power || 100} л.с.)`;[span_350](start_span)[span_350](end_span)
    if (costEl) costEl.innerText = `Себестоимость выкупа: ${(car.purchaseCost || car.basePrice || 100000).toLocaleString()} ₽`;[span_351](start_span)[span_351](end_span)
    if (askInput) askInput.value = Math.round((car.marketValue || car.basePrice || 100000) * 1.15);[span_352](start_span)[span_352](end_span)

    window.currentLotPutIndex = idx;[span_353](start_span)[span_353](end_span)
    const modal = document.getElementById('modalPutOnLot');[span_354](start_span)[span_354](end_span)
    if (modal) modal.classList.add('active');[span_355](start_span)[span_355](end_span)
    playSound('tick');[span_356](start_span)[span_356](end_span)
}

function confirmPutOnLot() {
    let idx = window.currentLotPutIndex;[span_357](start_span)[span_357](end_span)
    if (idx === undefined || idx === null) return;[span_358](start_span)[span_358](end_span)
    const car = state.garage[idx];[span_359](start_span)[span_359](end_span)
    if (!car) return;[span_360](start_span)[span_360](end_span)

    let askInput = document.getElementById('lotAskingPriceInput');[span_361](start_span)[span_361](end_span)
    let price = parseInt(askInput?.value || 0);[span_362](start_span)[span_362](end_span)
    if (isNaN(price) || price <= 0) return showToast("Укажите корректную цену продажи!");[span_363](start_span)[span_363](end_span)

    state.garage.splice(idx, 1);[span_364](start_span)[span_364](end_span)
    if (!state.salesLot) state.salesLot = [];[span_365](start_span)[span_365](end_span)

    let waitTime = (typeof calculateLotWaitTime === 'function') ? calculateLotWaitTime() : Math.floor(60 + Math.random() * 180);[span_366](start_span)[span_366](end_span)

    state.salesLot.push({
        car: car,[span_367](start_span)[span_367](end_span)
        askingPrice: price,[span_368](start_span)[span_368](end_span)
        timer: waitTime,[span_369](start_span)[span_369](end_span)
        maxTimer: waitTime,[span_370](start_span)[span_370](end_span)
        currentBuyer: null,[span_371](start_span)[span_371](end_span)
        buyerTimerLeft: 0[span_372](start_span)[span_372](end_span)
    });

    closeModal('modalPutOnLot');[span_373](start_span)[span_373](end_span)
    saveState();[span_374](start_span)[span_374](end_span)
    renderGarage();[span_375](start_span)[span_375](end_span)
    renderSalesLot();[span_376](start_span)[span_376](end_span)
    updateHeaderUI();[span_377](start_span)[span_377](end_span)
    playSound('win');[span_378](start_span)[span_378](end_span)
    tgHaptic('success');[span_379](start_span)[span_379](end_span)
    showToast(`«${car.name}» выставлен на площадку продажи!`);[span_380](start_span)[span_380](end_span)
}

// ========================================================
// 8. ГОСНОМЕРА (ДИНАМИЧЕСКИЙ РАСЧЕТ И ПЕРЕОЦЕНКА)
// ========================================================
function openChangePlateModal() {
    if (previewCarIndex === null) return;[span_381](start_span)[span_381](end_span)
    const car = state.garage[previewCarIndex];[span_382](start_span)[span_382](end_span)
    if (!car) return;[span_383](start_span)[span_383](end_span)

    const list = document.getElementById('changePlateList');[span_384](start_span)[span_384](end_span)
    if (!list) return;[span_385](start_span)[span_385](end_span)

    let plates = state.ownedPlates || [];[span_386](start_span)[span_386](end_span)
    if (plates.length === 0) {[span_387](start_span)[span_387](end_span)
        list.innerHTML = "<div class='sub-label text-center py-4'>У вас нет свободных госномеров в инвентаре.</div>";[span_388](start_span)[span_388](end_span)
    } else {
        let html = "";[span_389](start_span)[span_389](end_span)
        plates.forEach(p => {[span_390](start_span)[span_390](end_span)
            let pCost = (typeof calculatePlateValue === 'function') ? calculatePlateValue(p) : 0;[span_391](start_span)[span_391](end_span)
            html += `
            <div class="glass-card flex-between p-2 mb-1">
                <div>
                    <span class="license-plate">${p} <div class="license-flag">RUS</div></span>
                    <div class="sub-label mt-1" style="font-size:9.5px;">Оценка знака: <b class="color-amber">+${pCost.toLocaleString()} ₽</b></div>
                </div>
                <button onclick="applyPlateToCar('${p}')" class="btn btn-cyan btn-auto btn-sm">Повесить</button>
            </div>`;[span_392](start_span)[span_392](end_span)
        });
        list.innerHTML = html;[span_393](start_span)[span_393](end_span)
    }

    const modal = document.getElementById('modalChangePlate');[span_394](start_span)[span_394](end_span)
    if (modal) modal.classList.add('active');[span_395](start_span)[span_395](end_span)
}

function applyPlateToCar(plateStr) {
    if (previewCarIndex === null) return;[span_396](start_span)[span_396](end_span)
    const car = state.garage[previewCarIndex];[span_397](start_span)[span_397](end_span)
    if (!car) return;[span_398](start_span)[span_398](end_span)

    let oldVal = car.marketValue || car.basePrice || 100000;[span_399](start_span)[span_399](end_span)
    let curPlate = car.customPlate || car.plate;[span_400](start_span)[span_400](end_span)
    if (curPlate && curPlate !== "ТРАНЗИТ") {[span_401](start_span)[span_401](end_span)
        if (!state.ownedPlates) state.ownedPlates = [];[span_402](start_span)[span_402](end_span)
        state.ownedPlates.push(curPlate);[span_403](start_span)[span_403](end_span)
    }

    car.customPlate = plateStr;[span_404](start_span)[span_404](end_span)
    car.plate = plateStr;[span_405](start_span)[span_405](end_span)
    state.ownedPlates = (state.ownedPlates || []).filter(p => p !== plateStr);[span_406](start_span)[span_406](end_span)

    let newVal = recalculateCarMarketValue(car);[span_407](start_span)[span_407](end_span)
    let diff = newVal - oldVal;[span_408](start_span)[span_408](end_span)

    closeModal('modalChangePlate');[span_409](start_span)[span_409](end_span)
    saveState();[span_410](start_span)[span_410](end_span)
    renderGarage();[span_411](start_span)[span_411](end_span)
    openCarPreviewModal(previewCarIndex);[span_412](start_span)[span_412](end_span)
    playSound('win');[span_413](start_span)[span_413](end_span)
    tgHaptic('success');[span_414](start_span)[span_414](end_span)

    if (diff > 0) {[span_415](start_span)[span_415](end_span)
        spawnFloatingReward(`+${diff.toLocaleString()} ₽ к цене авто!`);[span_416](start_span)[span_416](end_span)
        showToast(`Блатные номера ${plateStr} установлены! Оценка авто выросла на +${diff.toLocaleString()} ₽ 🔥`);[span_417](start_span)[span_417](end_span)
    } else {
        showToast(`Номера ${plateStr} успешно установлены на автомобиль!`);[span_418](start_span)[span_418](end_span)
    }
}

function removePlateFromCar() {
    if (previewCarIndex === null) return;[span_419](start_span)[span_419](end_span)
    const car = state.garage[previewCarIndex];[span_420](start_span)[span_420](end_span)
    if (!car) return;[span_421](start_span)[span_421](end_span)

    let curPlate = car.customPlate || car.plate;[span_422](start_span)[span_422](end_span)
    if (!curPlate || curPlate === "ТРАНЗИТ") return showToast("На машине уже висят транзиты!");[span_423](start_span)[span_423](end_span)

    let cash = state.player?.cash || 0;[span_424](start_span)[span_424](end_span)
    if (cash < 2000) return showToast("Нужно 2,000 ₽ на госпошлину снятия номеров!");[span_425](start_span)[span_425](end_span)

    state.player.cash -= 2000;[span_426](start_span)[span_426](end_span)
    if (!state.ownedPlates) state.ownedPlates = [];[span_427](start_span)[span_427](end_span)
    state.ownedPlates.push(curPlate);[span_428](start_span)[span_428](end_span)

    let oldVal = car.marketValue || car.basePrice || 100000;[span_429](start_span)[span_429](end_span)
    car.customPlate = "ТРАНЗИТ";[span_430](start_span)[span_430](end_span)
    car.plate = "ТРАНЗИТ";[span_431](start_span)[span_431](end_span)

    let newVal = recalculateCarMarketValue(car);[span_432](start_span)[span_432](end_span)
    let diff = oldVal - newVal;[span_433](start_span)[span_433](end_span)

    closeModal('modalChangePlate');[span_434](start_span)[span_434](end_span)
    saveState();[span_435](start_span)[span_435](end_span)
    updateHeaderUI();[span_436](start_span)[span_436](end_span)
    renderGarage();[span_437](start_span)[span_437](end_span)
    openCarPreviewModal(previewCarIndex);[span_438](start_span)[span_438](end_span)
    playSound('tick');[span_439](start_span)[span_439](end_span)
    tgHaptic('light');[span_440](start_span)[span_440](end_span)

    if (diff > 0) {[span_441](start_span)[span_441](end_span)
        spawnFloatingReward(`-${diff.toLocaleString()} ₽`);[span_442](start_span)[span_442](end_span)
    }
    showToast(`Госномер ${curPlate} снят и убран в инвентарь! Оценка машины вернулась к базе.`);[span_443](start_span)[span_443](end_span)
}

function openInsuranceModalFromPreview() {
    if (previewCarIndex === null) return;[span_444](start_span)[span_444](end_span)
    const car = state.garage[previewCarIndex];[span_445](start_span)[span_445](end_span)
    if (!car) return;[span_446](start_span)[span_446](end_span)

    setTxt('insureCarTitle', `${car.name} (${car.customPlate || car.plate || "ТРАНЗИТ"})`);[span_447](start_span)[span_447](end_span)
    const modal = document.getElementById('modalInsurance');[span_448](start_span)[span_448](end_span)
    if (modal) modal.classList.add('active');[span_449](start_span)[span_449](end_span)
}

function confirmPurchaseInsurance(type) {
    if (previewCarIndex === null) return;[span_450](start_span)[span_450](end_span)
    const car = state.garage[previewCarIndex];[span_451](start_span)[span_451](end_span)
    if (!car) return;[span_452](start_span)[span_452](end_span)

    let cost = type === 'casco' ? 18000 : 7500;[span_453](start_span)[span_453](end_span)
    let cash = state.player?.cash || 0;[span_454](start_span)[span_454](end_span)
    if (cash < cost) return showToast("Не хватает денег на полис страхования!");[span_455](start_span)[span_455](end_span)

    state.player.cash -= cost;[span_456](start_span)[span_456](end_span)
    car.insurance = type;[span_457](start_span)[span_457](end_span)

    closeModal('modalInsurance');[span_458](start_span)[span_458](end_span)
    saveState();[span_459](start_span)[span_459](end_span)
    renderGarage();[span_460](start_span)[span_460](end_span)
    openCarPreviewModal(previewCarIndex);[span_461](start_span)[span_461](end_span)
    playSound('win');[span_462](start_span)[span_462](end_span)
    tgHaptic('success');[span_463](start_span)[span_463](end_span)
    showToast(`Полис ${type === 'casco' ? 'КАСКО' : 'ОСАГО'} оформлен!`);[span_464](start_span)[span_464](end_span)
}

// ========================================================
// 9. СОБЫТИЯ В ГАРАЖЕ ПРИ СМЕНЕ СУТОК
// ========================================================
function triggerGarageRandomEvent() {
    if (!state.garage || state.garage.length === 0) return;[span_465](start_span)[span_465](end_span)
    if (Math.random() > 0.22) return;[span_466](start_span)[span_466](end_span)

    const randIdx = Math.floor(Math.random() * state.garage.length);[span_467](start_span)[span_467](end_span)
    const car = state.garage[randIdx];[span_468](start_span)[span_468](end_span)
    if (!car) return;[span_469](start_span)[span_469](end_span)

    activeGarageEventCar = { car: car, index: randIdx };[span_470](start_span)[span_470](end_span)

    const events = [
        {
            title: "Кошка поцарапала капот",[span_471](start_span)[span_471](end_span)
            desc: "Соседский кот прыгнул на капот и оставил следы когтей на лаке.",[span_472](start_span)[span_472](end_span)
            emoji: "🐱",[span_473](start_span)[span_473](end_span)
            badge: "ЛКП",[span_474](start_span)[span_474](end_span)
            actionText: "Заполировать (3,000 ₽)",[span_475](start_span)[span_475](end_span)
            cost: 3000,[span_476](start_span)[span_476](end_span)
            onIgnore: () => { 
                car.condition = Math.max(10, (car.condition || 80) - 5);[span_477](start_span)[span_477](end_span)
                recalculateCarMarketValue(car);[span_478](start_span)[span_478](end_span)
            }
        },
        {
            title: "Попытка скрутить зеркала",[span_479](start_span)[span_479](end_span)
            desc: "Ночью во дворе хулиганы пытались снять зеркальные элементы.",[span_480](start_span)[span_480](end_span)
            emoji: "🪞",[span_481](start_span)[span_481](end_span)
            badge: "ВАНДАЛИЗМ",[span_482](start_span)[span_482](end_span)
            actionText: "Поставить защиту (5,000 ₽)",[span_483](start_span)[span_483](end_span)
            cost: 5000,[span_484](start_span)[span_484](end_span)
            onIgnore: () => { 
                if (car.insurance === 'casco') showToast("КАСКО полностью возместило ущерб!");[span_485](start_span)[span_485](end_span)
                else {
                    car.condition = Math.max(10, (car.condition || 80) - 10);[span_486](start_span)[span_486](end_span)
                    recalculateCarMarketValue(car);[span_487](start_span)[span_487](end_span)
                }
            }
        },
        {
            title: "Сел аккумулятор на морозе",[span_488](start_span)[span_488](end_span)
            desc: "Из-за минусовой температуры батарея ушла в глубокий разряд.",[span_489](start_span)[span_489](end_span)
            emoji: "🔋",[span_490](start_span)[span_490](end_span)
            badge: "ЭЛЕКТРИКА",[span_491](start_span)[span_491](end_span)
            actionText: "Зарядить пусковым (1,500 ₽)",[span_492](start_span)[span_492](end_span)
            cost: 1500,[span_493](start_span)[span_493](end_span)
            onIgnore: () => { 
                if (car.wear) car.wear.engine = Math.max(10, (car.wear.engine || 80) - 8);[span_494](start_span)[span_494](end_span)
                recalculateCarMarketValue(car);[span_495](start_span)[span_495](end_span)
            }
        }
    ];

    const ev = events[Math.floor(Math.random() * events.length)];[span_496](start_span)[span_496](end_span)
    activeGarageEventCar.event = ev;[span_497](start_span)[span_497](end_span)

    setTxt('garageEventEmoji', ev.emoji);[span_498](start_span)[span_498](end_span)
    setTxt('garageEventBadge', ev.badge);[span_499](start_span)[span_499](end_span)
    setTxt('garageEventTitle', ev.title);[span_500](start_span)[span_500](end_span)
    setTxt('garageEventDesc', ev.desc);[span_501](start_span)[span_501](end_span)
    setTxt('garageEventCarName', `${car.name} (${car.customPlate || car.plate || "ТРАНЗИТ"})`);[span_502](start_span)[span_502](end_span)

    const actBox = document.getElementById('garageEventActions');[span_503](start_span)[span_503](end_span)
    if (actBox) {
        actBox.innerHTML = `
            <button onclick="resolveGarageEvent('fix')" class="btn btn-cyan btn-sm w-full mb-1">${ev.actionText}</button>
            <button onclick="resolveGarageEvent('ignore')" class="btn btn-dark btn-sm w-full">Оставить как есть</button>
        `;[span_504](start_span)[span_504](end_span)
    }

    const modal = document.getElementById('modalGarageEvent');[span_505](start_span)[span_505](end_span)
    if (modal) modal.classList.add('active');[span_506](start_span)[span_506](end_span)
    playSound('error');[span_507](start_span)[span_507](end_span)
    tgHaptic('warning');[span_508](start_span)[span_508](end_span)
}

function resolveGarageEvent(type) {
    if (!activeGarageEventCar) return;[span_509](start_span)[span_509](end_span)
    const { car, event } = activeGarageEventCar;[span_510](start_span)[span_510](end_span)

    if (type === 'fix') {[span_511](start_span)[span_511](end_span)
        let cash = state.player?.cash || 0;[span_512](start_span)[span_512](end_span)
        if (cash < event.cost) return showToast("Не хватает денег на устранение!");[span_513](start_span)[span_513](end_span)
        state.player.cash -= event.cost;[span_514](start_span)[span_514](end_span)
        showToast("Проблема успешно устранена!");[span_515](start_span)[span_515](end_span)
        playSound('win');[span_516](start_span)[span_516](end_span)
        tgHaptic('success');[span_517](start_span)[span_517](end_span)
    } else {
        if (event.onIgnore) event.onIgnore();[span_518](start_span)[span_518](end_span)
        showToast("Вы проигнорировали инцидент. Состояние авто снизилось.");[span_519](start_span)[span_519](end_span)
        tgHaptic('error');[span_520](start_span)[span_520](end_span)
    }

    closeModal('modalGarageEvent');[span_521](start_span)[span_521](end_span)
    activeGarageEventCar = null;[span_522](start_span)[span_522](end_span)
    saveState();[span_523](start_span)[span_523](end_span)
    renderGarage();[span_524](start_span)[span_524](end_span)
    updateHeaderUI();[span_525](start_span)[span_525](end_span)
}

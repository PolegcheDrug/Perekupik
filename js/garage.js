// ========================================================
// js/garage.js — АВТОПАРК, ЛИЧНЫЙ ТРАНСПОРТ, СПОРТИВНЫЙ ТЮНИНГ (v0.4.7)
// Разработчики: Tak Toje, Max, Sergo, gemini
// Условие гаража для тюнинга/детейлинга, интерактивный Launch OBD2,
// конструктор страхового полиса, штрафстоянка ГИБДД
// ========================================================

let previewCarIndex = null;
let activeTuningCarIndex = null;
let activePreSaleCarIndex = null;
let activeGarageEventCar = null;
let activeTuneTab = 'drift';
let activeImpoundCarIndex = null;

// Настройки конструктора страхового полиса
let insuranceOptions = {
    osago: true,
    totalLoss: false,
    theft: false,
    roadside: false
};

// ========================================================
// ПРОВЕРКА ВОЗМОЖНОСТЕЙ НЕДВИЖИМОСТИ И БОКСОВ
// ========================================================

/**
 * Получить суммарные технические возможности игрока по всем активным и выкупленным объектам.
 */
function getPlayerHousingCapabilities() {
    let caps = {
        canTune: false,
        canDetail: false,
        canService: false,
        canOBDGarage: false,
        hasPersonalSlot: false,
        reshalaDiscountPct: 0,
        activeHouseTitle: "Уличная стоянка",
        category: "street"
    };

    if (typeof HOUSING_LIST === 'undefined' || !Array.isArray(HOUSING_LIST)) {
        return {
            canTune: true, canDetail: true, canService: true, canOBDGarage: true,
            hasPersonalSlot: true, reshalaDiscountPct: 0, activeHouseTitle: "Гараж", category: "box"
        };
    }

    // Если игрок докупил базовые слоты расширением бокса
    if (state.player && state.player.baseSlots && state.player.baseSlots > 2) {
        caps.canTune = true;
        caps.canDetail = true;
        caps.canService = true;
        caps.canOBDGarage = true;
        caps.hasPersonalSlot = true;
        caps.reshalaDiscountPct = Math.max(caps.reshalaDiscountPct, 10);
    }

    const curHousingId = state.player?.housingId || 'trailer';
    const activeHouse = HOUSING_LIST.find(h => h.id === curHousingId);
    if (activeHouse) {
        caps.activeHouseTitle = activeHouse.name;
        caps.category = activeHouse.category || 'street';
        if (activeHouse.canTune) caps.canTune = true;
        if (activeHouse.canDetail) caps.canDetail = true;
        if (activeHouse.canService) caps.canService = true;
        if (activeHouse.canOBDGarage) caps.canOBDGarage = true;
        if (activeHouse.hasPersonalSlot) caps.hasPersonalSlot = true;
        if (activeHouse.reshalaDiscountPct) caps.reshalaDiscountPct = Math.max(caps.reshalaDiscountPct, activeHouse.reshalaDiscountPct);
    }

    // Добавляем возможности всех находящихся в собственности объектов
    const ownedHouses = state.player?.ownedHouses || [];
    ownedHouses.forEach(hId => {
        const h = HOUSING_LIST.find(item => item.id === hId);
        if (h) {
            if (h.canTune) caps.canTune = true;
            if (h.canDetail) caps.canDetail = true;
            if (h.canService) caps.canService = true;
            if (h.canOBDGarage) caps.canOBDGarage = true;
            if (h.hasPersonalSlot) caps.hasPersonalSlot = true;
            if (h.reshalaDiscountPct) caps.reshalaDiscountPct = Math.max(caps.reshalaDiscountPct, h.reshalaDiscountPct);
        }
    });

    return caps;
}

/**
 * Проверка конкретной возможности (tune, detail, service, obd, personal)
 */
function checkPlayerCapability(featureKey) {
    const caps = getPlayerHousingCapabilities();
    if (featureKey === 'tune') return caps.canTune;
    if (featureKey === 'detail') return caps.canDetail;
    if (featureKey === 'service') return caps.canService;
    if (featureKey === 'obd') return caps.canOBDGarage;
    if (featureKey === 'personal') return caps.hasPersonalSlot;
    return caps.canTune;
}

// Обратная совместимость с вызовами в других скриптах
function playerHasGarageOrWorkshop() {
    return checkPlayerCapability('tune');
}

/**
 * Универсальное модальное окно с объяснением причины отказа
 */
function openNeedCapabilityModal(type = 'tune', customTitle = null) {
    playSound('error');
    tgHaptic('warning');

    let modal = document.getElementById('modalNeedGarage');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalNeedGarage';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    let title = "ТРЕБУЕТСЯ СПЕЦИАЛИЗИРОВАННЫЙ БОКС";
    let heading = "Действие недоступно!";
    let desc = "Вы находитесь на уличной парковке. Здесь нет условий для выполнения этих работ.";
    let icon = "🔒";

    if (type === 'tune') {
        title = "ТРЕБУЕТСЯ СМОТРОВАЯ ЯМА И ВЕРСТАК";
        heading = (customTitle || "Слесарные работы и тюнинг") + " заблокированы!";
        desc = `Вы работаете на <b>уличной парковке</b> без смотровой ямы, верстака и сварочного аппарата.<br><br>
                🔩 Для заварки редуктора, установки спортивных рычагов выворота, гидроручника и Big Turbo требуется <b>капитальный гаражный бокс (ГСК)</b> или мастерская с подъёмником.<br><br>
                💡 Арендуйте или купите бокс в приложении <b>«Жильё & Боксы»</b>!`;
        icon = "🔩";
    } else if (type === 'detail') {
        title = "ТРЕБУЕТСЯ ЧИСТЫЙ БОКС С ВОДОЙ И СВЕТОМ";
        heading = (customTitle || "Детейлинг и покраска") + " недоступны!";
        desc = `Полировка и покраска кузова <b>под открытым небом испортят ЛКП дорожной пылью</b>!<br><br>
                ✨ Для качественного облива и нанесения защитных составов требуется закрытый сухой бокс с водопроводом и ярким светом (Двойной бокс, Новостройка с детейлингом, Коттедж или Вилла).`;
        icon = "✨";
    } else if (type === 'service') {
        title = "ТРЕБУЕТСЯ МЕСТО ДЛЯ ОБСЛУЖИВАНИЯ";
        heading = (customTitle || "Сервисные манипуляции") + " заблокированы!";
        desc = `Управляющая компания стройплощадки запрещает сливать технические жидкости на открытом грунте.<br><br>
                🧪 Снимите хотя бы комнату с парковочным местом во дворе или бокс в ГСК.`;
        icon = "🧪";
    } else if (type === 'obd') {
        title = "ТРЕБУЕТСЯ ЗАКРЫТЫЙ БОКС ДЛЯ ДИАГНОСТИКИ";
        heading = "Стационарная диагностика ЭБУ недоступна!";
        desc = `Глубокая адаптация блоков управления требует стабильного бортового питания и защиты разъёмов от сырости.<br><br>
                💻 Для работы с Launch в гараже арендуйте капитальный бокс с подключением к сети 220V.`;
        icon = "💻";
    } else if (type === 'personal') {
        title = "ТРЕБУЕТСЯ ОХРАНЯЕМОЕ МАШИНОМЕСТО";
        heading = "Назначение личного авто недоступно!";
        desc = `Личный автомобиль нельзя бросать без присмотра на неохраняемой стройплощадке — высок риск кражи зеркал и вандализма.<br><br>
                👑 Арендуйте жилье с закрепленным парковочным местом, бокс в ГСК или подземный паркинг.`;
        icon = "👑";
    }

    modal.innerHTML = `
        <div class="modal-box text-center" style="max-width: 410px; border-color: var(--amber);">
            <div class="radar-spinner-ring mb-2" style="border-top-color: var(--amber); border-right-color: var(--cyan);">
                <div class="radar-spinner-center">${icon}</div>
            </div>
            <div class="modal-glow-badge mb-1" style="color:var(--amber); border-color:rgba(255,179,0,0.4); background:rgba(255,179,0,0.1);">
                ${title}
            </div>
            <h3 class="font-bold mb-1 color-amber">${heading}</h3>
            <p class="sub-label mb-3" style="font-size:10.5px; line-height:1.45;">
                ${desc}
            </p>

            <div class="space-y-2 mb-3">
                <button onclick="closeModal('modalNeedGarage'); switchTab('tabPhone'); setTimeout(() => { if (typeof PhoneManager !== 'undefined') PhoneManager.openApp('housing'); }, 150);" class="btn btn-cyan btn-sm w-full">
                    🏠 Открыть каталог «Жильё & Боксы»
                </button>
                <button onclick="closeModal('modalNeedGarage')" class="btn btn-dark btn-sm w-full">
                    Понятно, буду копить кэш
                </button>
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function openNeedGarageModal(actionTitle = "Тюнинг и доработки") {
    openNeedCapabilityModal('tune', actionTitle);
}

// ========================================================
// 0. ФОРМУЛА ДИНАМИЧЕСКОГО ПЕРЕРАСЧЕТА РЫНОЧНОЙ СТОИМОСТИ
// ========================================================
function recalculateCarMarketValue(car) {
    if (!car) return 0;

    let base = car.baseMarketValue || car.basePrice || 100000;
    let cond = (car.condition !== undefined) ? car.condition : 80;
    let condMultiplier = 0.55 + (cond / 100) * 0.50;
    let currentVal = Math.round(base * condMultiplier);

    let t = car.tuning || {};
    if (t.chip === 1) currentVal += 35000;
    else if (t.chip === 2) currentVal += 85000;
    else if (t.chip >= 3) currentVal += 220000;

    if (t.weldedDiff) currentVal += 15000;
    if (t.steeringAngle) currentVal += 30000;
    if (t.hydroHandbrake) currentVal += 40000;
    if (t.bucketSeats) currentVal += 50000;
    if (t.dragSlicks) currentVal += 50000;
    if (t.rollCage) currentVal += 95000;
    if (t.exhaust) currentVal += 40000;
    if (t.stance) currentVal += 85000;
    if (t.customWheels) currentVal += 70000;
    if (t.bodykit) currentVal += 60000;

    if (car.isPolished) currentVal = Math.round(currentVal * 1.05);
    if (car.isRepainted) currentVal += 15000;

    let engWear = car.wear?.engine !== undefined ? car.wear.engine : 85;
    let transWear = car.wear?.transmission !== undefined ? car.wear.transmission : 85;
    if (engWear < 50) currentVal = Math.round(currentVal * 0.85);
    if (transWear < 50) currentVal = Math.round(currentVal * 0.90);
    
    let tires = car.tireWear !== undefined ? car.tireWear : 100;
    if (tires < 30) currentVal = Math.max(10000, currentVal - 15000);

    if (car.hiddenDefect && !car.hasAdditive) {
        currentVal = Math.max(10000, currentVal - Math.round((car.hiddenDefect.cost || 15000) * 1.15));
    }

    let plateStr = car.customPlate || car.plate || "ТРАНЗИТ";
    let plateBonus = 0;
    if (typeof calculatePlateValue === 'function') {
        plateBonus = calculatePlateValue(plateStr);
    }
    currentVal += plateBonus;

    car.marketValue = Math.round(currentVal);
    return car.marketValue;
}

// ========================================================
// 1. ОСНОВНОЙ РЕНДЕР ГАРАЖА
// ========================================================
function renderGarage() {
    const list = document.getElementById('garageList');
    if (!list) return;

    const maxSlots = getTotalGarageSlots();
    const currentSlots = state.garage ? state.garage.length : 0;
    const caps = getPlayerHousingCapabilities();
    
    let statusPillClass = caps.canTune ? "color-green" : (caps.category === 'street' ? "color-red" : "color-amber");
    let statusPillText = caps.canTune 
        ? `<b class="${statusPillClass}">${currentSlots} из ${maxSlots} (Мастерская активна ✓)</b>`
        : `<b class="${statusPillClass}">${currentSlots} из ${maxSlots} (${caps.activeHouseTitle})</b>`;

    setTxt('garageDetailedSlots', statusPillText);
    setTxt('garageHeaderSlots', `${currentSlots}/${maxSlots}`);

    if (!state.garage || state.garage.length === 0) {
        list.innerHTML = `
            <div class="glass-card text-center sub-label py-8">
                <i class="fa-solid fa-warehouse color-cyan mb-2" style="font-size:36px;"></i>
                <div class="font-bold text-xs color-cyan mb-1">Ваш автопарк пуст</div>
                <div style="font-size:10px;">Отправляйтесь на авторынок, вскройте сарай или выкупите лот на P2P бирже!</div>
            </div>`;
        return;
    }

    let html = "";
    state.garage.forEach((car, idx) => {
        if (!car) return;

        recalculateCarMarketValue(car);

        let cName = car.name || "Автомобиль";
        let cPower = car.power || 100;
        let cImg = car.img || "assets/cars/economy/vaz-2107.jpg";
        let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
        let cPrice = car.marketValue ? car.marketValue.toLocaleString() : (car.basePrice || 100000).toLocaleString();

        let isPersonal = !!car.isPersonal;
        let isImpounded = !!car.impounded;

        let personalBadge = isPersonal 
            ? "<span class='tag-badge bg-tag-amber' style='box-shadow:0 0 10px rgba(255,179,0,0.5);'><i class='fa-solid fa-crown'></i> ЛИЧНЫЙ АВТО</span>"
            : "";

        let legalBadge = "";
        if (isImpounded) {
            legalBadge = "<span class='tag-badge bg-red'>🚔 НА ШТРАФСТОЯНКЕ</span>";
        } else if (car.isStolen) {
            legalBadge = "<span class='tag-badge bg-tag-red'>🚨 В РОЗЫСКЕ</span>";
        } else if (car.unregistered) {
            legalBadge = "<span class='tag-badge bg-tag-red'>12.5.1 АННУЛИРОВАН</span>";
        } else if (car.isRegisteredOnPlayer) {
            legalBadge = "<span class='tag-badge bg-tag-green'>✓ УЧЁТ РФ (МРЭО)</span>";
        } else {
            let daysLeft = Math.max(0, 10 - (car.ownershipDays || 0));
            let dkpClass = daysLeft === 0 ? "bg-tag-red" : "bg-tag-amber";
            legalBadge = `<span class='tag-badge ${dkpClass}' title='Без постановки на учёт'>📄 НА ДКП (${daysLeft} дн. лимит)</span>`;
        }

        let insuranceBadge = "";
        if (car.insurance) {
            if (car.insurance.type === 'comprehensive' || car.insurance === 'casco') {
                insuranceBadge = "<span class='tag-badge bg-tag-green ml-1'>🛡️ КАСКО</span>";
            } else {
                insuranceBadge = "<span class='tag-badge bg-tag-cyan ml-1'>📋 ОСАГО</span>";
            }
        }

        let pVal = (typeof calculatePlateValue === 'function') ? calculatePlateValue(cPlate) : 0;
        let coolPlateBadge = pVal > 15000 
            ? `<span class='tag-badge bg-tag-purple ml-1' title='Блатной госномер (+${pVal.toLocaleString()} ₽ к стоимости)'><i class='fa-solid fa-gem'></i> БЛАТНОЙ</span>`
            : "";

        let tempVal = car.engineTemp || 90;
        let tempBadge = tempVal > 105 
            ? `<span class='tag-badge bg-tag-red ml-1'><i class='fa-solid fa-temperature-high'></i> ПЕРЕГРЕВ ${tempVal}°C</span>`
            : "";

        let tireVal = car.tireWear !== undefined ? car.tireWear : 100;
        let tireBadge = tireVal < 35 
            ? `<span class='tag-badge bg-tag-red ml-1'><i class='fa-solid fa-circle-notch'></i> СЛИК ИЗНОШЕН (${tireVal}%)</span>`
            : "";

        let modsIconsHtml = renderCarModsBadges(car);

        let actionControlBlock = "";
        if (isImpounded) {
            actionControlBlock = `
                <div class="p-2 mb-2" style="background:rgba(220,38,38,0.15); border:1px solid var(--red); border-radius:10px;">
                    <div class="text-xs color-red font-bold mb-1">Машина арестована инспектором ГИБДД!</div>
                    <button onclick="openImpoundLotModal(${idx})" class="btn btn-danger btn-sm w-full">
                        🚔 Штрафстоянка: Забрать / Утиль
                    </button>
                </div>
            `;
        } else {
            let personalBtn = isPersonal
                ? `<button onclick="togglePersonalCar(${idx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-crown color-amber"></i> Снять статус лички</button>`
                : `<button onclick="togglePersonalCar(${idx})" class="btn btn-amber btn-sm"><i class="fa-solid fa-crown"></i> Сделать личным</button>`;

            actionControlBlock = `
                <div class="grid-3 mb-2">
                    <button onclick="openCarPreviewModal(${idx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-circle-info"></i> Осмотр</button>
                    <button onclick="openTuningModal(${idx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-screwdriver-wrench ${caps.canTune ? 'color-cyan' : ''}"></i> Тюнинг</button>
                    <button onclick="openPreSaleModal(${idx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-wand-magic-sparkles ${caps.canDetail ? 'color-amber' : ''}"></i> Детейлинг</button>
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
            `;
        }

        html += `
        <div class="glass-card mb-3 ${isPersonal ? 'personal-car-card' : ''}">
            <div class="car-img-wrap" style="height:145px;">
                <img src="${cImg}" class="car-img" onerror="this.src='${car.fallback || 'assets/cars/economy/vaz-2107.jpg'}';">
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

            ${actionControlBlock}
        </div>`;
    });

    list.innerHTML = html;
}

// ========================================================
// 2. ИКОНКИ МОДИФИКАЦИЙ
// ========================================================
function renderCarModsBadges(car) {
    if (!car) return "";
    let t = car.tuning || {};
    let badges = [];

    if (t.chip === 1) badges.push(`<span class="mod-pill color-cyan" title="Stage 1 Чип"><i class="fa-solid fa-bolt"></i> St1</span>`);
    else if (t.chip === 2) badges.push(`<span class="mod-pill color-amber" title="Stage 2 + Выхлоп"><i class="fa-solid fa-fire"></i> St2</span>`);
    else if (t.chip >= 3) badges.push(`<span class="mod-pill color-red" title="Stage 3 Big Turbo"><i class="fa-solid fa-rocket"></i> St3</span>`);

    if (t.weldedDiff) badges.push(`<span class="mod-pill color-cyan" title="Заварка дифференциала"><i class="fa-solid fa-gear"></i> Заварка</span>`);
    if (t.steeringAngle) badges.push(`<span class="mod-pill color-green" title="Красноярский выворот"><i class="fa-solid fa-compass-drafting"></i> Выворот</span>`);
    if (t.hydroHandbrake) badges.push(`<span class="mod-pill color-red" title="Гидравлический ручник"><i class="fa-solid fa-gamepad"></i> Гидроручник</span>`);
    if (t.bucketSeats) badges.push(`<span class="mod-pill color-purple" title="Спортивные ковши"><i class="fa-solid fa-chair"></i> Ковши</span>`);

    if (t.dragSlicks) badges.push(`<span class="mod-pill color-amber" title="Драговые полуслики"><i class="fa-solid fa-circle-notch"></i> Слики</span>`);
    if (t.rollCage) badges.push(`<span class="mod-pill color-cyan" title="Вварной каркас безопасности"><i class="fa-solid fa-shield"></i> Каркас</span>`);
    if (t.exhaust) badges.push(`<span class="mod-pill color-amber" title="Прямоточный выхлоп"><i class="fa-solid fa-volume-high"></i> Выхлоп</span>`);

    if (t.stance) badges.push(`<span class="mod-pill color-purple" title="Пневмоподвеска"><i class="fa-solid fa-arrows-down-to-line"></i> Пневма</span>`);
    if (t.customWheels) badges.push(`<span class="mod-pill color-green" title="Кованые диски"><i class="fa-solid fa-compact-disc"></i> Ковка</span>`);
    if (t.bodykit) badges.push(`<span class="mod-pill color-cyan" title="Кастомный обвес"><i class="fa-solid fa-car-side"></i> Обвес</span>`);

    if (car.isPolished) badges.push(`<span class="mod-pill color-cyan" title="Полировка кузова"><i class="fa-solid fa-sparkles"></i> Блеск</span>`);
    if (car.isRepainted) badges.push(`<span class="mod-pill color-green" title="Свежий облив"><i class="fa-solid fa-paint-roller"></i> Облив</span>`);
    if (car.hasAdditive) badges.push(`<span class="mod-pill color-amber" title="Присадка в моторе"><i class="fa-solid fa-flask"></i> Присадка</span>`);
    if (car.rolledOdometer) badges.push(`<span class="mod-pill color-red" title="Скрученный одометр"><i class="fa-solid fa-clock-rotate-left"></i> Скручен</span>`);

    if (badges.length === 0) {
        return `<span class="sub-label" style="font-size:9px; opacity:0.6;"><i class="fa-solid fa-car"></i> Заводской сток</span>`;
    }

    return badges.join(' ');
}

// ========================================================
// 3. СТАТУС ЛИЧНОГО АВТОМОБИЛЯ И СВЯЗКА СО СТРИТОМ
// ========================================================
function togglePersonalCar(idx) {
    const car = state.garage[idx];
    if (!car) return;

    if (!car.isPersonal && !checkPlayerCapability('personal')) {
        return openNeedCapabilityModal('personal', "Назначение личного автомобиля");
    }

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
    if (!state.garage[idx]) return;
    state.player.selectedStreetCarIndex = idx;
    saveState();
    switchTab('tabPhone');
    setTimeout(() => {
        if (typeof PhoneManager !== 'undefined') {
            PhoneManager.openApp('street');
        }
    }, 120);
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
// 4. ДЕТЕЙЛИНГ И ПРЕДПРОДАЖНАЯ ПОДГОТОВКА
// ========================================================
function openPreSaleModal(idx) {
    const caps = getPlayerHousingCapabilities();
    if (!caps.canDetail && !caps.canService) {
        return openNeedCapabilityModal('detail', "Предпродажная подготовка и детейлинг");
    }

    activePreSaleCarIndex = idx;
    const car = state.garage[idx];
    if (!car) return;

    setTxt('preSaleCarTitle', `Детейлинг-зона: <b>${car.name}</b> (${car.power || 100} л.с.)`);

    const btnClean = document.getElementById('btnCleanPrice');
    if (btnClean) {
        if (!caps.canDetail) {
            btnClean.disabled = true;
            btnClean.innerText = "Нужен бокс 🔒";
            btnClean.className = "btn btn-dark btn-sm opacity-50";
        } else if (car.isPolished) {
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
        if (!caps.canDetail) {
            btnPaint.disabled = true;
            btnPaint.innerText = "Нужен бокс 🔒";
            btnPaint.className = "btn btn-dark btn-sm opacity-50";
        } else if (car.isRepainted || car.condition >= 100) {
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
        if (!caps.canService) {
            btnAdditive.disabled = true;
            btnAdditive.innerText = "Запрещено УК 🔒";
            btnAdditive.className = "btn btn-dark btn-sm opacity-50";
        } else if (car.hasAdditive) {
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
        if (!caps.canService) {
            btnOdometer.disabled = true;
            btnOdometer.innerText = "Нет условий 🔒";
            btnOdometer.className = "btn btn-dark btn-sm opacity-50";
        } else if (car.rolledOdometer) {
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

    if ((type === 'clean' || type === 'paint') && !checkPlayerCapability('detail')) {
        return openNeedCapabilityModal('detail', "Полировка и покраска кузова");
    }

    if ((type === 'additive' || type === 'odometer') && !checkPlayerCapability('service')) {
        return openNeedCapabilityModal('service', "Сервисные доработки");
    }

    let cash = state.player?.cash || 0;

    if (type === 'clean') {
        if (car.isPolished) return showToast("Машина уже отполирована до блеска!");
        if (cash < 4000) return showToast("Нужно 4,000 ₽!");
        state.player.cash -= 4000;
        car.isPolished = true;
        recalculateCarMarketValue(car);
        showToast("Кузов отполирован (+5% к рыночной цене)!");
    } else if (type === 'paint') {
        if (car.isRepainted) return showToast("Кузов уже был повторно окрашен!");
        if (car.condition >= 100) return showToast("Состояние кузова и так 100%!");
        if (cash < 12000) return showToast("Нужно 12,000 ₽!");
        state.player.cash -= 12000;
        car.isRepainted = true;
        car.condition = Math.min(100, (car.condition || 60) + 20);
        recalculateCarMarketValue(car);
        showToast("Кузов полностью перекрашен (+20% состояния)!");
    } else if (type === 'additive') {
        if (car.hasAdditive) return showToast("В масло уже залита присадка!");
        if (cash < 6000) return showToast("Нужно 6,000 ₽!");
        state.player.cash -= 6000;
        car.hasAdditive = true;
        recalculateCarMarketValue(car);
        showToast("Присадка залита! Стуки мотора скрыты (Опасно в торгах!)");
    } else if (type === 'odometer') {
        if (car.rolledOdometer) return showToast("Пробег уже скручивался на этой машине!");
        if (cash < 8000) return showToast("Нужно 8,000 ₽!");
        state.player.cash -= 8000;
        car.mileage = Math.round((car.mileage || 120000) * 0.5);
        car.rolledOdometer = true;
        showToast("Пробег смотан на 50%! Риск скандала у капота.");
    }

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('presale_mod', 1);
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
    if (!checkPlayerCapability('tune')) {
        return openNeedCapabilityModal('tune', "Спортивный тюнинг и корчевание");
    }

    activeTuningCarIndex = idx;
    const car = state.garage[idx];
    if (!car) return;

    if (!car.tuning) {
        car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 };
    }

    setTxt('tuneCarTitle', `Мастерская: <b>${car.name}</b> (${car.power || 100} л.с.)`);
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
    } else if (activeTuneTab === 'drag') {
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
    } else if (activeTuneTab === 'style') {
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
    if (!checkPlayerCapability('tune')) {
        return openNeedCapabilityModal('tune', "Установка компонентов тюнинга");
    }

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

    recalculateCarMarketValue(car);

    saveState();
    renderGarage();
    renderTuningItems();
    playSound('win');
    tgHaptic('success');
    showToast("Деталь установлена на автомобиль!");
}

function buyChipStage(stage, cost, powerGain) {
    if (!checkPlayerCapability('tune')) {
        return openNeedCapabilityModal('tune', "Прошивка блока управления ЭБУ");
    }

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

    recalculateCarMarketValue(car);

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
// 6. ОСМОТР, ИНТЕРАКТИВНЫЙ OBD2 И СТРАХОВОЙ ПОЛИС
// ========================================================
function openCarPreviewModal(idx) {
    previewCarIndex = idx;
    const car = state.garage[idx];
    if (!car) return;

    recalculateCarMarketValue(car);

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

// Запуск OBD2: строгая проверка оборудования, бокса и скрытие окна осмотра
function openOBD2Modal() {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car) return;

    // 1. Проверка наличия диагностического оборудования
    const hasScanner = !!(state.player?.tools && (state.player.tools.obd || state.player.tools.obd_launch));
    if (!hasScanner) {
        playSound('error');
        tgHaptic('warning');
        return showToast("⚠️ У вас нет сканера OBD2! Купите ELM327 или Launch Pro в Маркете.");
    }

    // 2. Проверка условий бокса для стационарной работы
    if (!checkPlayerCapability('obd')) {
        return openNeedCapabilityModal('obd', "Стационарная диагностика ЭБУ");
    }

    let isLaunch = !!state.player?.tools?.obd_launch;
    let toolKey = isLaunch ? 'obd_launch' : 'obd';
    let wear = state.player?.toolsWear ? (state.player.toolsWear[toolKey] || 0) : 50;

    if (wear <= 0) {
        playSound('error');
        tgHaptic('warning');
        return showToast("⚠️ Диагностический сканер разряжен! Откалибруйте его в Маркете.");
    }

    state.player.toolsWear[toolKey] = Math.max(0, wear - 1);
    saveState();

    // Скрываем окно осмотра, чтобы не было наложения
    closeModal('modalPreview');

    setTxt('obd2CarTitle', `Диагностика CAN-шины: ${car.name}`);
    const resBox = document.getElementById('obd2ResultBox');
    const actBox = document.getElementById('obd2ActionBox');
    if (!resBox || !actBox) return;

    resBox.innerHTML = `
        <div class="obd-cyber-display">
            <div class="flex-between text-xs mb-2">
                <span class="color-cyan font-bold"><i class="fa-solid fa-satellite-dish"></i> CAN-BUS LINK: CONNECTING...</span>
                <span class="sub-label">ISO 15765-4</span>
            </div>
            <div class="obd-progress-track">
                <div class="obd-progress-bar" id="garageObdProgressFill"></div>
            </div>
            <div class="obd-scan-matrix-screen" id="garageObdTerminalLines">
                <div class="obd-terminal-line">> Инициализация протокола K-Line / CAN 500kbps...</div>
            </div>
        </div>
    `;
    actBox.innerHTML = `<button class="btn btn-dark w-full opacity-50" disabled><i class="fa-solid fa-spinner fa-spin"></i> СКАНИРОВАНИЕ БЛОКОВ УПРАВЛЕНИЯ...</button>`;

    const modal = document.getElementById('modalOBD2');
    if (modal) modal.classList.add('active');
    playSound('tick');

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('obd_scan', 1);
    }

    const terminalEl = document.getElementById('garageObdTerminalLines');
    const progFill = document.getElementById('garageObdProgressFill');

    const scanSteps = [
        { pct: 25, msg: "> Подключение к ЭБУ Двигателя (DME/ECU)... Связь 100%", type: "success" },
        { pct: 50, msg: "> Опрос трансмиссии (EGS), проверка адаптации соленоидов...", type: "" },
        { pct: 75, msg: "> Сканирование тормозной системы ABS / ESP и SRS Airbag...", type: "" },
        { pct: 100, msg: "> Чтение сохранённых и текущих кодов неисправностей DTC...", type: car.hiddenDefect ? "error" : "success" }
    ];

    let stepIdx = 0;
    const scanInterval = setInterval(() => {
        if (stepIdx < scanSteps.length) {
            const step = scanSteps[stepIdx];
            if (progFill) progFill.style.width = step.pct + "%";
            if (terminalEl) {
                terminalEl.innerHTML += `<div class="obd-terminal-line ${step.type}">${step.msg}</div>`;
                terminalEl.scrollTop = terminalEl.scrollHeight;
            }
            playSound('tick');
            stepIdx++;
        } else {
            clearInterval(scanInterval);
            renderGarageOBDFinal(car, resBox, actBox);
        }
    }, 600);
}

function renderGarageOBDFinal(car, resBox, actBox) {
    let eng = car.wear?.engine ? Math.round(car.wear.engine) : 85;
    let trans = car.wear?.transmission ? Math.round(car.wear.transmission) : 85;

    if (car.hiddenDefect) {
        playSound('error');
        tgHaptic('error');
        let def = car.hiddenDefect;

        resBox.innerHTML = `
            <div class="obd-cyber-display" style="border-color: var(--red);">
                <div class="flex-between text-xs mb-2">
                    <span class="color-red font-bold"><i class="fa-solid fa-triangle-exclamation"></i> ОБНАРУЖЕН DTC КОД: ${def.code || 'P0300'}</span>
                    <span class="tag-badge bg-tag-red">${def.severity || 'Критическая'}</span>
                </div>
                <div class="obd-scan-matrix-screen mb-2" style="border-color: rgba(255, 51, 102, 0.4);">
                    <div class="obd-terminal-line error">> НЕИСПРАВНОСТЬ: ${def.text}</div>
                    <div class="obd-terminal-line warn">> БЛОК: ${def.system || 'ЭБУ ДВС DME'}</div>
                    <div class="obd-terminal-line">> ОРИЕНТИРОВОЧНЫЙ РЕМОНТ: ~${(def.cost || 15000).toLocaleString()} ₽</div>
                </div>
                <div class="grid-3 text-xs p-2" style="background: rgba(0,0,0,0.6); border-radius: 8px;">
                    <div>RPM: <b class="color-cyan">${def.rpm || 850}</b></div>
                    <div>ОЖ: <b class="${car.engineTemp > 100 ? 'color-red' : 'color-green'}">${car.engineTemp || 90}°C</b></div>
                    <div>Буст: <b class="color-amber">${def.boost || 0.0} bar</b></div>
                </div>
                <div class="flex-between text-xs mt-2">
                    <span>Ресурс ДВС: <b class="${eng < 50 ? 'color-red' : 'color-green'}">${eng}%</b></span>
                    <span>Ресурс КПП: <b class="${trans < 50 ? 'color-red' : 'color-green'}">${trans}%</b></span>
                </div>
            </div>
        `;
        actBox.innerHTML = `
            <div class="grid-2 mt-2">
                <button onclick="clearOBDCodesQuick()" class="btn btn-dark btn-sm">Стереть ошибки DTC ⚠️</button>
                <button onclick="repairDefectInGarage()" class="btn btn-purple btn-sm">Капитальный ремонт (${(def.cost || 15000).toLocaleString()} ₽)</button>
            </div>
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
                    <div class="obd-terminal-line">> Топливные коррекции в допуске (LTFT 0.8%).</div>
                    <div class="obd-terminal-line">> Пропусков зажигания не зафиксировано.</div>
                </div>
                <div class="flex-between text-xs p-2" style="background: rgba(0,0,0,0.6); border-radius: 8px;">
                    <span>Ресурс ДВС: <b class="color-green">${eng}%</b></span>
                    <span>Ресурс КПП: <b class="color-green">${trans}%</b></span>
                </div>
            </div>
        `;
        actBox.innerHTML = `<button onclick="closeOBD2Modal()" class="btn btn-green w-full mt-2">Завершить диагностику ✓</button>`;
    }
}

function clearOBDCodesQuick() {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car || !car.hiddenDefect) return;

    playSound('tick');
    tgHaptic('medium');
    showToast("Память ошибок DTC очищена! Лампа Check Engine временно погасла.");
    
    if (Math.random() < 0.5) {
        car.hasAdditive = true;
    }
    saveState();
    openOBD2Modal();
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
    car.hasAdditive = false;
    car.condition = Math.min(100, (car.condition || 70) + 15);
    recalculateCarMarketValue(car);

    saveState();
    renderGarage();
    playSound('win');
    tgHaptic('success');
    showToast("Неисправность полностью устранена! Ошибки из памяти ЭБУ удалены.");
    openOBD2Modal();
}

function closeOBD2Modal() {
    closeModal('modalOBD2');
    if (previewCarIndex !== null) {
        openCarPreviewModal(previewCarIndex);
    }
}

// ========================================================
// ДЕТАЛЬНЫЙ СТРАХОВОЙ ДОГОВОР-КОНСТРУКТОР
// ========================================================
function openInsuranceModalFromPreview() {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car) return;

    closeModal('modalPreview');
    renderInsuranceContractUI(car);

    const modal = document.getElementById('modalInsurance');
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function renderInsuranceContractUI(car) {
    setTxt('insureCarTitle', `${car.name} (${car.customPlate || car.plate || "ТРАНЗИТ"})`);
    
    let totalCash = 0;
    let totalStars = 0;

    if (insuranceOptions.osago) { totalCash += 8500; totalStars += 2; }
    if (insuranceOptions.theft) { totalCash += 14000; totalStars += 4; }
    if (insuranceOptions.totalLoss) { totalCash += 18000; totalStars += 5; }
    if (insuranceOptions.roadside) { totalCash += 4500; totalStars += 1; }

    setTxt('insuranceTotalCostText', `${totalCash.toLocaleString()} ₽ + ${totalStars} ⭐`);

    ['osago', 'theft', 'totalLoss', 'roadside'].forEach(opt => {
        const card = document.getElementById(`insCard_${opt}`);
        if (card) {
            if (insuranceOptions[opt]) card.classList.add('selected');
            else card.classList.remove('selected');
        }
    });

    window.currentInsuranceCalculated = { totalCash, totalStars };
}

function toggleInsuranceOption(optionKey) {
    if (optionKey === 'osago') {
        insuranceOptions.osago = true;
        showToast("ОСАГО является базовой обязательной частью полиса!");
    } else {
        insuranceOptions[optionKey] = !insuranceOptions[optionKey];
        playSound('tick');
        tgHaptic('light');
    }

    if (previewCarIndex !== null) {
        renderInsuranceContractUI(state.garage[previewCarIndex]);
    }
}

function confirmSignInsurancePolicy() {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car) return;

    const calc = window.currentInsuranceCalculated || { totalCash: 8500, totalStars: 2 };
    let cash = state.player?.cash || 0;
    let stars = state.player?.stars || 0;

    if (cash < calc.totalCash) return showToast("Не хватает рублей на оплату страховой премии!");
    if (stars < calc.totalStars) return showToast(`Не хватает ${calc.totalStars} Stars ⭐!`);

    state.player.cash -= calc.totalCash;
    state.player.stars -= calc.totalStars;

    let isCasco = insuranceOptions.totalLoss || insuranceOptions.theft;
    car.insurance = {
        type: isCasco ? 'comprehensive' : 'osago',
        options: { ...insuranceOptions },
        cost: calc.totalCash,
        date: Date.now()
    };

    closeModal('modalInsurance');
    saveState();
    renderGarage();
    playSound('win');
    tgHaptic('success');
    showToast("Договор страхования зарегистрирован в РСА ✓");
    openCarPreviewModal(previewCarIndex);
}

function closeInsuranceModal() {
    closeModal('modalInsurance');
    if (previewCarIndex !== null) {
        openCarPreviewModal(previewCarIndex);
    }
}

// ========================================================
// 7. МЕХАНИКА ШТРАФСТОЯНКИ ГИБДД
// ========================================================
function openImpoundLotModal(idx) {
    activeImpoundCarIndex = idx;
    const car = state.garage[idx];
    if (!car) return;

    let modal = document.getElementById('modalImpoundLot');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalImpoundLot';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    let isRegistered = !!car.isRegisteredOnPlayer;
    let scrapReward = Math.round((car.basePrice || 100000) * 0.35);

    modal.innerHTML = `
        <div class="modal-box text-center" style="max-width: 420px;">
            <div class="radar-spinner-ring mb-2" style="border-top-color: var(--red); border-right-color: var(--amber);">
                <div class="radar-spinner-center">🚔</div>
            </div>
            <div class="modal-glow-badge mb-1" style="color:var(--red); border-color:rgba(255,51,102,0.4);"><i class="fa-solid fa-lock"></i> СПЕЦСТОЯНКА ГИБДД</div>
            <h3 class="font-bold mb-1 color-cyan">${car.name}</h3>
            <div class="sub-label mb-3">Госномер: <span class="license-plate" style="font-size:10px; padding:2px 6px;">${car.customPlate || car.plate || "ТРАНЗИТ"}</span></div>

            <div class="space-y-2 mb-3 text-left">
                <div class="glass-card p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber"><i class="fa-solid fa-handshake"></i> 1. Договориться на месте</b>
                        <span class="tag-badge bg-tag-amber">ВЗЯТКА / СВЯЗИ</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">Решить вопрос через связи Решалы или наличные инспектору спецстоянки.</div>
                    <div class="grid-2">
                        <button onclick="resolveImpoundBribe('cash')" class="btn btn-dark btn-sm">Наличные (35k ₽)</button>
                        <button onclick="resolveImpoundBribe('conn')" class="btn btn-purple btn-sm">Решала (1 🤝)</button>
                    </div>
                </div>

                <div class="glass-card p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-green"><i class="fa-solid fa-receipt"></i> 2. Официальный выкуп</b>
                        <span class="tag-badge bg-tag-green">МРЭО</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">Оплата штрафа за нарушение и услуг городского эвакуатора.</div>
                    <button onclick="resolveImpoundOfficialPay()" class="btn btn-green btn-sm w-full">Оплатить протокол (25,000 ₽)</button>
                </div>

                <div class="glass-card p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-red"><i class="fa-solid fa-recycle"></i> 3. Сдать в утиль</b>
                        <span class="tag-badge ${isRegistered ? 'bg-tag-green' : 'bg-tag-red'}">${isRegistered ? 'УЧЁТ РФ ✓' : 'БЕЗ УЧЁТА ✗'}</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">
                        ${isRegistered 
                            ? `Машина на учёте в МРЭО. Можно снять с учёта и сдать на металлолом (+${scrapReward.toLocaleString()} ₽).` 
                            : 'Сдать в утиль нельзя: авто не зарегистрировано на вас в МРЭО!'}
                    </div>
                    <button onclick="resolveImpoundScrap(${scrapReward})" class="btn btn-danger btn-sm w-full" ${!isRegistered ? 'disabled' : ''}>
                        Утилизировать кузов (+${scrapReward.toLocaleString()} ₽)
                    </button>
                </div>
            </div>

            <button onclick="closeModal('modalImpoundLot')" class="btn btn-dark w-full">Закрыть</button>
        </div>
    `;

    modal.classList.add('active');
    playSound('tick');
}

function resolveImpoundBribe(type) {
    if (activeImpoundCarIndex === null) return;
    const car = state.garage[activeImpoundCarIndex];
    if (!car) return;

    if (type === 'cash') {
        let cost = 35000;
        if ((state.player?.cash || 0) < cost) return showToast("Не хватает денег на взятку!");
        state.player.cash -= cost;
        showToast("Вопрос урегулирован наличными (-35,000 ₽)!");
    } else {
        if ((state.player?.connections || 0) < 1) return showToast("У вас нет теневых связей 🤝!");
        state.player.connections -= 1;
        showToast("Решала Артур забрал ключи со спецстоянки (-1 🤝)!");
    }

    car.impounded = false;
    closeModal('modalImpoundLot');
    saveState();
    updateHeaderUI();
    renderGarage();
    playSound('win');
    tgHaptic('success');
}

function resolveImpoundOfficialPay() {
    if (activeImpoundCarIndex === null) return;
    const car = state.garage[activeImpoundCarIndex];
    if (!car) return;

    let cost = 25000;
    if ((state.player?.cash || 0) < cost) return showToast("Не хватает денег для оплаты квитанции!");

    state.player.cash -= cost;
    car.impounded = false;
    closeModal('modalImpoundLot');
    saveState();
    updateHeaderUI();
    renderGarage();
    playSound('win');
    tgHaptic('success');
    showToast("Штраф и эвакуация оплачены! Автомобиль возвращён в гараж.");
}

function resolveImpoundScrap(reward) {
    if (activeImpoundCarIndex === null) return;
    const car = state.garage[activeImpoundCarIndex];
    if (!car || !car.isRegisteredOnPlayer) return;

    if (!confirm(`Вы действительно хотите сдать «${car.name}» в утиль? Автомобиль будет списан из гаража.`)) return;

    state.player.cash = (state.player.cash || 0) + reward;
    state.garage.splice(activeImpoundCarIndex, 1);
    closeModal('modalImpoundLot');
    saveState();
    updateHeaderUI();
    renderGarage();
    playSound('win');
    tgHaptic('success');
    openVerdictModal("УТИЛИЗАЦИЯ ЗАВЕРШЕНА ♻️", `Автомобиль снят с государственного учёта и сдан в металлолом.\nВыплачено: +${reward.toLocaleString()} ₽`, true);
}

// ========================================================
// 8. ВЫСТАВЛЕНИЕ НА ПРОДАЖУ
// ========================================================
function openPutOnLotModal(idx) {
    const car = state.garage[idx];
    if (!car) return;

    if (car.isPersonal) {
        return showToast("🚫 Это ваш личный авто! Снимите статус лички перед продажей.");
    }

    recalculateCarMarketValue(car);

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
// 9. ГОСНОМЕРА
// ========================================================
function openChangePlateModal() {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car) return;

    closeModal('modalPreview');

    const list = document.getElementById('changePlateList');
    if (!list) return;

    let plates = state.ownedPlates || [];
    if (plates.length === 0) {
        list.innerHTML = "<div class='sub-label text-center py-4'>У вас нет свободных госномеров в инвентаре.</div>";
    } else {
        let html = "";
        plates.forEach(p => {
            let pCost = (typeof calculatePlateValue === 'function') ? calculatePlateValue(p) : 0;
            html += `
            <div class="glass-card flex-between p-2 mb-1">
                <div>
                    <span class="license-plate">${p} <div class="license-flag">RUS</div></span>
                    <div class="sub-label mt-1" style="font-size:9.5px;">Оценка знака: <b class="color-amber">+${pCost.toLocaleString()} ₽</b></div>
                </div>
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

    let oldVal = car.marketValue || car.basePrice || 100000;
    let curPlate = car.customPlate || car.plate;
    if (curPlate && curPlate !== "ТРАНЗИТ") {
        if (!state.ownedPlates) state.ownedPlates = [];
        state.ownedPlates.push(curPlate);
    }

    car.customPlate = plateStr;
    car.plate = plateStr;
    state.ownedPlates = (state.ownedPlates || []).filter(p => p !== plateStr);

    let newVal = recalculateCarMarketValue(car);
    let diff = newVal - oldVal;

    closeModal('modalChangePlate');
    saveState();
    renderGarage();
    openCarPreviewModal(previewCarIndex);
    playSound('win');
    tgHaptic('success');

    if (diff > 0) {
        spawnFloatingReward(`+${diff.toLocaleString()} ₽ к цене авто!`);
        showToast(`Блатные номера ${plateStr} установлены! Оценка авто выросла на +${diff.toLocaleString()} ₽ 🔥`);
    } else {
        showToast(`Номера ${plateStr} успешно установлены на автомобиль!`);
    }
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

    let oldVal = car.marketValue || car.basePrice || 100000;
    car.customPlate = "ТРАНЗИТ";
    car.plate = "ТРАНЗИТ";

    let newVal = recalculateCarMarketValue(car);
    let diff = oldVal - newVal;

    closeModal('modalChangePlate');
    saveState();
    updateHeaderUI();
    renderGarage();
    openCarPreviewModal(previewCarIndex);
    playSound('tick');
    tgHaptic('light');

    if (diff > 0) {
        spawnFloatingReward(`-${diff.toLocaleString()} ₽`);
    }
    showToast(`Госномер ${curPlate} снят и убран в инвентарь! Оценка машины вернулась к базе.`);
}

// ========================================================
// 10. СОБЫТИЯ В ГАРАЖЕ ПРИ СМЕНЕ СУТОК
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
            onIgnore: () => { 
                car.condition = Math.max(10, (car.condition || 80) - 5);
                recalculateCarMarketValue(car);
            }
        },
        {
            title: "Попытка скрутить зеркала",
            desc: "Ночью во дворе хулиганы пытались снять зеркальные элементы.",
            emoji: "🪞",
            badge: "ВАНДАЛИЗМ",
            actionText: "Поставить защиту (5,000 ₽)",
            cost: 5000,
            onIgnore: () => { 
                if (car.insurance && (car.insurance.type === 'comprehensive' || car.insurance === 'casco')) {
                    showToast("КАСКО полностью возместило ущерб!");
                } else {
                    car.condition = Math.max(10, (car.condition || 80) - 10);
                    recalculateCarMarketValue(car);
                }
            }
        },
        {
            title: "Сел аккумулятор на морозе",
            desc: "Из-за минусовой температуры батарея ушла в глубокий разряд.",
            emoji: "🔋",
            badge: "ЭЛЕКТРИКА",
            actionText: "Зарядить пусковым (1,500 ₽)",
            cost: 1500,
            onIgnore: () => { 
                if (car.wear) car.wear.engine = Math.max(10, (car.wear.engine || 80) - 8);
                recalculateCarMarketValue(car);
            }
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

// Экспорт всех методов в window
window.getPlayerHousingCapabilities = getPlayerHousingCapabilities;
window.checkPlayerCapability = checkPlayerCapability;
window.openNeedCapabilityModal = openNeedCapabilityModal;
window.playerHasGarageOrWorkshop = playerHasGarageOrWorkshop;
window.openNeedGarageModal = openNeedGarageModal;
window.recalculateCarMarketValue = recalculateCarMarketValue;
window.renderGarage = renderGarage;
window.renderCarModsBadges = renderCarModsBadges;
window.togglePersonalCar = togglePersonalCar;
window.selectCarForStreetDirect = selectCarForStreetDirect;
window.buyGarageSlot = buyGarageSlot;
window.openPreSaleModal = openPreSaleModal;
window.applyPreSaleMod = applyPreSaleMod;
window.openTuningModal = openTuningModal;
window.switchTuneTab = switchTuneTab;
window.renderTuningItems = renderTuningItems;
window.buyTuningMod = buyTuningMod;
window.buyChipStage = buyChipStage;
window.openCarPreviewModal = openCarPreviewModal;
window.openTuningFromPreview = openTuningFromPreview;
window.openOBD2Modal = openOBD2Modal;
window.renderGarageOBDFinal = renderGarageOBDFinal;
window.clearOBDCodesQuick = clearOBDCodesQuick;
window.repairDefectInGarage = repairDefectInGarage;
window.closeOBD2Modal = closeOBD2Modal;
window.openInsuranceModalFromPreview = openInsuranceModalFromPreview;
window.toggleInsuranceOption = toggleInsuranceOption;
window.confirmSignInsurancePolicy = confirmSignInsurancePolicy;
window.closeInsuranceModal = closeInsuranceModal;
window.openImpoundLotModal = openImpoundLotModal;
window.resolveImpoundBribe = resolveImpoundBribe;
window.resolveImpoundOfficialPay = resolveImpoundOfficialPay;
window.resolveImpoundScrap = resolveImpoundScrap;
window.openPutOnLotModal = openPutOnLotModal;
window.confirmPutOnLot = confirmPutOnLot;
window.openChangePlateModal = openChangePlateModal;
window.applyPlateToCar = applyPlateToCar;
window.removePlateFromCar = removePlateFromCar;
window.triggerGarageRandomEvent = triggerGarageRandomEvent;
window.resolveGarageEvent = resolveGarageEvent;
// ========================================================
// js/garage.js — АВТОПАРК, ИНСПЕКЦИЯ, СТРАХОВКА И ТЮНИНГ (v0.8.5)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Характеристики в 3 колонки слева направо (.spec-tile-3d-col),
// интерактивный лист осмотра 4-х узлов, риски езды без ОСАГО,
// расширенный детейлинг и легализация тюнинга по ст. 12.5.1.
// ========================================================

let previewCarIndex = null;
let activeTuningCarIndex = null;
let activePreSaleCarIndex = null;
let activeGarageEventCar = null;
let activeTuneTab = 'engine'; // 'engine', 'drift', 'drag', 'style'
let activeImpoundCarIndex = null;

// Настройки конструктора страхового полиса
let insuranceOptions = {
    osago: true,
    totalLoss: false,
    theft: false,
    roadside: false
};

// ========================================================
// 1. ПРОВЕРКА ВОЗМОЖНОСТЕЙ НЕДВИЖИМОСТИ И БОКСОВ
// ========================================================
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

function checkPlayerCapability(featureKey) {
    const caps = getPlayerHousingCapabilities();
    if (featureKey === 'tune') return caps.canTune;
    if (featureKey === 'detail') return caps.canDetail;
    if (featureKey === 'service') return caps.canService;
    if (featureKey === 'obd') return caps.canOBDGarage;
    if (featureKey === 'personal') return caps.hasPersonalSlot;
    return caps.canTune;
}

function playerHasGarageOrWorkshop() {
    return checkPlayerCapability('tune');
}

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
                🔩 Для заварки редуктора, установки выворота, гидроручника и Big Turbo требуется <b>капитальный гаражный бокс (ГСК)</b> или мастерская с подъёмником.<br><br>
                💡 Арендуйте или купите бокс в приложении <b>«Жильё & Боксы»</b>!`;
        icon = "🔩";
    } else if (type === 'detail') {
        title = "ТРЕБУЕТСЯ ЧИСТЫЙ БОКС С ВОДОЙ И СВЕТОМ";
        heading = (customTitle || "Детейлинг и покраска") + " недоступны!";
        desc = `Полировка и покраска кузова <b>под открытым небом испортят ЛКП дорожной пылью</b>!<br><br>
                ✨ Для качественного облива и химчистки требуется закрытый сухой бокс с водопроводом и ярким светом.`;
        icon = "✨";
    } else if (type === 'service') {
        title = "ТРЕБУЕТСЯ МЕСТО ДЛЯ ОБСЛУЖИВАНИЯ";
        heading = (customTitle || "Сервисные манипуляции") + " заблокированы!";
        desc = `Управляющая компания стройплощадки запрещает сливать технические жидкости на открытом грунте.<br><br>
                🧪 Снимите комнату с парковочным местом во дворе или бокс в ГСК.`;
        icon = "🧪";
    } else if (type === 'obd') {
        title = "ТРЕБУЕТСЯ ЗАКРЫТЫЙ БОКС ДЛЯ ДИАГНОСТИКИ";
        heading = "Стационарная диагностика ЭБУ недоступна!";
        desc = `Глубокая адаптация блоков управления требует стабильного бортового питания и защиты разъёмов от сырости.<br><br>
                💻 Для работы со стационарным Launch в гараже арендуйте капитальный бокс с подключением к сети 220V.`;
        icon = "💻";
    } else if (type === 'personal') {
        title = "ТРЕБУЕТСЯ ОХРАНЯЕМОЕ МАШИНОМЕСТО";
        heading = "Назначение личного авто недоступно!";
        desc = `Личный автомобиль нельзя бросать без присмотра на неохраняемой стройплощадке — высок риск кражи деталей и вандализма.<br><br>
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
                <button onclick="ModalManager.close('modalNeedGarage'); switchTab('tabPhone'); setTimeout(() => { if (typeof PhoneManager !== 'undefined') PhoneManager.openApp('housing'); }, 150);" class="btn btn-cyan btn-sm w-full">
                    🏠 Открыть каталог «Жильё & Боксы»
                </button>
                <button onclick="ModalManager.close('modalNeedGarage')" class="btn btn-dark btn-sm w-full">
                    Понятно
                </button>
            </div>
        </div>
    `;

    ModalManager.open('modalNeedGarage');
}

function openNeedGarageModal(actionTitle = "Тюнинг и доработки") {
    openNeedCapabilityModal('tune', actionTitle);
}

// ========================================================
// 2. ДИНАМИЧЕСКИЙ ПЕРЕРАСЧЕТ СТОИМОСТИ (ОКУПАЕМЫЙ ТЮНИНГ)
// ========================================================
function recalculateCarMarketValue(car) {
    if (!car) return 0;

    let base = car.baseMarketValue || car.basePrice || 100000;
    let cond = (car.condition !== undefined) ? car.condition : 80;
    
    let condMultiplier = 0.70 + (cond / 100) * 0.45;
    let currentVal = Math.round(base * condMultiplier);

    let t = car.tuning || {};
    if (t.chip === 1) currentVal += 50000;
    else if (t.chip === 2) currentVal += 115000;
    else if (t.chip >= 3) currentVal += 290000;

    if (t.coldIntake) currentVal += 32000;
    if (t.intercooler) currentVal += 48000;
    if (t.weldedDiff) currentVal += 22000;
    if (t.steeringAngle) currentVal += 45000;
    if (t.hydroHandbrake) currentVal += 60000;
    if (t.bucketSeats) currentVal += 75000;
    if (t.dragSlicks) currentVal += 70000;
    if (t.rollCage) currentVal += 140000;
    if (t.exhaust) currentVal += 55000;
    if (t.stance) currentVal += 120000;
    if (t.customWheels) currentVal += 95000;
    if (t.bodykit) currentVal += 85000;
    if (t.tinted) currentVal += 18000;

    if (car.isPolished) currentVal = Math.round(currentVal * 1.12);
    if (car.isRepainted) currentVal += 45000;
    if (car.cleanInterior) currentVal += 25000;

    let engWear = car.wear?.engine !== undefined ? car.wear.engine : 85;
    let transWear = car.wear?.transmission !== undefined ? car.wear.transmission : 85;
    if (engWear < 40) currentVal = Math.round(currentVal * 0.88);
    if (transWear < 40) currentVal = Math.round(currentVal * 0.92);
    
    let tires = car.tireWear !== undefined ? car.tireWear : 100;
    if (tires < 25) currentVal = Math.max(10000, currentVal - 15000);

    if (car.hiddenDefect && !car.hasAdditive) {
        currentVal = Math.max(10000, currentVal - Math.round((car.hiddenDefect.cost || 15000) * 0.8));
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
// 3. ОСНОВНОЙ РЕНДЕР ГАРАЖА
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
        let cImg = car.img || "assets/cars/economy/2101/vaz-2101.jpg";
        let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
        let cPrice = car.marketValue ? car.marketValue.toLocaleString() : (car.basePrice || 100000).toLocaleString();

        let isPersonal = !!car.isPersonal;
        let isImpounded = !!car.impounded;

        let personalBadge = isPersonal 
            ? "<span class='tag-badge bg-tag-amber'><i class='fa-solid fa-crown'></i> ЛИЧНЫЙ АВТО</span>"
            : "";

        let legalBadge = "";
        if (isImpounded) {
            legalBadge = "<span class='tag-badge bg-tag-red'>🚔 ШТРАФСТОЯНКА</span>";
        } else if (car.isStolen) {
            legalBadge = "<span class='tag-badge badge-police-strobe'>🚨 РОЗЫСК</span>";
        } else if (car.unregistered) {
            legalBadge = "<span class='tag-badge badge-police-strobe'>12.5.1 СНЯТ</span>";
        } else if (car.isRegisteredOnPlayer) {
            legalBadge = "<span class='tag-badge bg-tag-green'><span class='led-dot led-green'></span> УЧЁТ РФ</span>";
        } else {
            let daysLeft = Math.max(0, 10 - (car.ownershipDays || 0));
            let dkpClass = daysLeft === 0 ? "bg-tag-red" : "bg-tag-amber";
            let ledClass = daysLeft === 0 ? "led-amber" : "led-green";
            legalBadge = `<span class='tag-badge ${dkpClass}'><span class='led-dot ${ledClass}'></span> ДКП (${daysLeft}д)</span>`;
        }

        let insuranceBadge = "";
        if (car.insurance) {
            if (car.insurance.type === 'comprehensive' || car.insurance === 'casco') {
                insuranceBadge = "<span class='tag-badge bg-tag-green' title='Защита от тотала и вандализма'>🛡️ КАСКО</span>";
            } else {
                insuranceBadge = "<span class='tag-badge bg-tag-cyan' title='Полис ОСАГО активен'>📋 ОСАГО</span>";
            }
        } else {
            insuranceBadge = "<span class='tag-badge bg-tag-red' title='Езда без страховки: риск штрафа 800 ₽ и регресса при ДТП'>⚠️ БЕЗ ОСАГО</span>";
        }

        let pVal = (typeof calculatePlateValue === 'function') ? calculatePlateValue(cPlate) : 0;
        let coolPlateBadge = pVal > 15000 
            ? `<span class='tag-badge badge-shimmer-gold'>🏷️ БЛАТНОЙ</span>`
            : "";

        let tempVal = car.engineTemp || 90;
        let tempBadge = tempVal > 105 
            ? `<span class='tag-badge bg-tag-red'>🔥 ${tempVal}°C</span>`
            : "";

        let tireVal = car.tireWear !== undefined ? car.tireWear : 100;
        let tireBadge = tireVal < 35 
            ? `<span class='tag-badge bg-tag-red'>🛞 ${tireVal}%</span>`
            : "";

        let condVal = car.condition !== undefined ? car.condition : 80;
        let shieldIconClass = condVal >= 80 
            ? 'spec-tile-icon-shield' 
            : (condVal >= 50 ? 'spec-tile-icon-shield-mid' : 'spec-tile-icon-shield-low');
        let condColorClass = condVal >= 80 
            ? 'color-green' 
            : (condVal >= 50 ? 'color-amber' : 'color-red');

        let modsIconsHtml = renderCarModsBadges(car);

        let brandHeaderHtml = (typeof formatCarBrandBadgeHtml === 'function') 
            ? formatCarBrandBadgeHtml(cName) 
            : `<div class="car-title-plate">${cName}</div>`;

        let actionControlBlock = "";
        if (isImpounded) {
            actionControlBlock = `
                <div class="p-2 mb-2" style="background:rgba(220,38,38,0.15); border:1px solid var(--red); border-radius:10px;">
                    <div class="text-xs color-red font-bold mb-1">Машина арестована инспектором ГИБДД!</div>
                    <button onclick="openImpoundLotModal(${idx})" class="btn btn-danger btn-sm w-full">
                        🚔 Штрафстоянка: Эвакуатор / Талон / МРЭО
                    </button>
                </div>
            `;
        } else {
            let personalBtn = isPersonal
                ? `<button onclick="togglePersonalCar(${idx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-crown color-amber"></i> Снять личку</button>`
                : `<button onclick="togglePersonalCar(${idx})" class="btn btn-amber btn-sm"><i class="fa-solid fa-crown"></i> Сделать личным</button>`;

            actionControlBlock = `
                <div class="grid-3 mb-2">
                    <button onclick="openCarPreviewModal(${idx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-clipboard-check color-cyan"></i> Инспекция</button>
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
            <div class="car-img-wrap" style="height:155px;">
                <img src="${cImg}" class="car-img" onerror="this.src='${car.fallback || 'assets/cars/economy/2101/vaz-2101.jpg'}';">
            </div>
            
            <div class="car-header-row-volumetric">
                <div style="flex:1; min-width:0; margin-right:8px;">
                    ${brandHeaderHtml}
                    <div class="car-status-badges-row mt-1">
                        <div class="plate-mini-capsule notranslate" translate="no">
                            ${cPlate} <span class="plate-flag-mini">RUS</span>
                        </div>
                        ${personalBadge}
                        ${legalBadge}
                        ${insuranceBadge}
                        ${coolPlateBadge}
                        ${tempBadge}
                        ${tireBadge}
                    </div>
                </div>

                <div class="car-price-badge-3d">
                    <span class="car-price-label-sub">Оценка рынка</span>
                    <span class="car-price-value-3d">${cPrice} ₽</span>
                </div>
            </div>

            <div class="car-specs-grid-volumetric">
                <div class="spec-tile-3d-col">
                    <div class="spec-tile-icon-wrap spec-tile-icon-power">
                        <i class="fa-solid fa-bolt"></i>
                    </div>
                    <div class="spec-tile-col-data">
                        <span class="spec-tile-col-label">Мощность</span>
                        <b class="color-amber">${cPower} л.с.</b>
                    </div>
                </div>

                <div class="spec-tile-3d-col">
                    <div class="spec-tile-icon-wrap spec-tile-icon-road">
                        <i class="fa-solid fa-road"></i>
                    </div>
                    <div class="spec-tile-col-data">
                        <span class="spec-tile-col-label">Пробег</span>
                        <b class="color-cyan">${(car.mileage || 85000).toLocaleString()} км</b>
                    </div>
                </div>

                <div class="spec-tile-3d-col">
                    <div class="spec-tile-icon-wrap ${shieldIconClass}">
                        <i class="fa-solid fa-shield"></i>
                    </div>
                    <div class="spec-tile-col-data">
                        <span class="spec-tile-col-label">Кузов</span>
                        <b class="${condColorClass}">${condVal}%</b>
                    </div>
                </div>
            </div>

            <div class="car-tuning-status-capsule">
                <div class="tuning-status-left">
                    <i class="fa-solid fa-gear color-cyan" style="font-size:12px;"></i>
                    <span class="sub-label font-bold" style="font-size:9.5px;">Конфигурация:</span>
                </div>
                <div class="car-mods-badges-container">
                    ${modsIconsHtml}
                </div>
            </div>

            ${actionControlBlock}
        </div>`;
    });

    list.innerHTML = html;
}

// ========================================================
// 4. ИКОНКИ МОДИФИКАЦИЙ
// ========================================================
function renderCarModsBadges(car) {
    if (!car) return "";
    let t = car.tuning || {};
    let badges = [];

    if (t.chip === 1) badges.push(`<span class="mod-pill color-cyan" title="Stage 1 Чип"><i class="fa-solid fa-bolt"></i> St1</span>`);
    else if (t.chip === 2) badges.push(`<span class="mod-pill color-amber" title="Stage 2 + Выхлоп"><i class="fa-solid fa-fire"></i> St2</span>`);
    else if (t.chip >= 3) badges.push(`<span class="mod-pill color-red" title="Stage 3 Big Turbo"><i class="fa-solid fa-rocket"></i> St3</span>`);

    if (t.coldIntake) badges.push(`<span class="mod-pill color-cyan" title="Холодный впуск"><i class="fa-solid fa-wind"></i> Впуск</span>`);
    if (t.intercooler) badges.push(`<span class="mod-pill color-cyan" title="Спортивный кулер"><i class="fa-solid fa-snowflake"></i> Кулер</span>`);
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
    if (t.tinted) badges.push(`<span class="mod-pill color-dark" title="Тонировка в круг"><i class="fa-solid fa-circle"></i> Тонировка</span>`);

    if (car.isPolished) badges.push(`<span class="mod-pill color-cyan" title="Полировка кузова"><i class="fa-solid fa-sparkles"></i> Блеск</span>`);
    if (car.cleanInterior) badges.push(`<span class="mod-pill color-green" title="Химчистка салона"><i class="fa-solid fa-spray-can"></i> Химчистка</span>`);
    if (car.isRepainted) badges.push(`<span class="mod-pill color-green" title="Свежий облив"><i class="fa-solid fa-paint-roller"></i> Облив</span>`);
    if (car.hasAdditive) badges.push(`<span class="mod-pill color-amber" title="Присадка в моторе"><i class="fa-solid fa-flask"></i> Присадка</span>`);
    if (car.rolledOdometer) badges.push(`<span class="mod-pill color-red" title="Скрученный одометр"><i class="fa-solid fa-clock-rotate-left"></i> Скручен</span>`);

    if (badges.length === 0) {
        return `<span class="stock-badge-pill"><i class="fa-solid fa-car"></i> Заводской сток</span>`;
    }

    return badges.join(' ');
}

// ========================================================
// 5. ИНТЕРАКТИВНЫЙ ЛИСТ ТЕХНИЧЕСКОГО ОСМОТРА (ИНСПЕКЦИЯ)
// ========================================================
function openCarPreviewModal(idx) {
    previewCarIndex = idx;
    const car = state.garage[idx];
    if (!car) return;

    recalculateCarMarketValue(car);

    let modal = document.getElementById('modalPreview');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalPreview';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
    let engWear = car.wear?.engine ? Math.round(car.wear.engine) : 85;
    let transWear = car.wear?.transmission ? Math.round(car.wear.transmission) : 85;
    let tires = car.tireWear !== undefined ? car.tireWear : 100;
    let cond = car.condition !== undefined ? car.condition : 80;

    let bodyDesc = car.isRepainted 
        ? "Вторичный окрас кузова (шпаклёвка на арках)" 
        : (car.isPolished ? "Заводской окрас, зеркальный глянец ✓" : "Заводское ЛКП со следами эксплуатации");

    let engDesc = car.hasAdditive
        ? "Залита демпферная присадка (стуки мотора замаскированы)"
        : (engWear < 50 ? "Требуется капитальный ремонт поршневой группы" : "Масло в норме, компрессия ровная");

    let transDesc = transWear < 50
        ? "Износ фрикционов/синхронизаторов, люфт приводов"
        : "Передачи включаются чётко, сцепление держит зацеп";

    let salonDesc = car.cleanInterior
        ? "Глубокая химчистка с озонацией, запах свежести ✓"
        : (car.isBeaterProject ? "Салон прокурен, потёртости на руле и сиденьях" : "Штатный ухоженный салон");

    let legalStatus = car.isRegisteredOnPlayer
        ? "<b class='color-green'>Учёт в МРЭО РФ оформлен ✓</b>"
        : "<b class='color-amber'>Договор ДКП (Без постановки на учёт)</b>";

    let insStatus = car.insurance
        ? (car.insurance.type === 'comprehensive' ? "<b class='color-green'>КАСКО (Полное покрытие)</b>" : "<b class='color-cyan'>ОСАГО (Действует)</b>")
        : "<b class='color-red'>Отсутствует (Езда на свой страх и риск!)</b>";

    modal.innerHTML = `
        <div class="modal-box text-left" style="max-width: 440px;">
            <div class="flex-between mb-2 pb-2" style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <div>
                    <h3 class="font-bold color-cyan mb-1">${car.name}</h3>
                    <div class="license-plate" style="font-size:10px; padding:2px 6px;">${cPlate} <div class="license-flag">RUS</div></div>
                </div>
                <div class="text-right">
                    <span class="sub-label text-xs">Оценка:</span>
                    <div class="price-val color-green" style="font-size:16px;">${(car.marketValue || 100000).toLocaleString()} ₽</div>
                </div>
            </div>

            <div class="sub-label font-bold mb-1" style="font-size:9.5px;">📋 ТЕХНИЧЕСКИЙ ЛИСТ СОСТОЯНИЯ:</div>
            
            <div class="space-y-1 mb-3">
                <div class="p-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                    <div class="flex-between text-xs mb-1">
                        <span><i class="fa-solid fa-shield color-green mr-1"></i> 1. Кузов & ЛКП:</span>
                        <b class="${cond < 50 ? 'color-red' : 'color-green'}">${cond}% HP</b>
                    </div>
                    <div class="sub-label" style="font-size:9px;">${bodyDesc}</div>
                </div>

                <div class="p-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                    <div class="flex-between text-xs mb-1">
                        <span><i class="fa-solid fa-bolt color-amber mr-1"></i> 2. Силовой агрегат (ДВС):</span>
                        <b class="${engWear < 50 ? 'color-red' : 'color-green'}">${engWear}% ресурс</b>
                    </div>
                    <div class="sub-label" style="font-size:9px;">${engDesc} • Т-ра: ${car.engineTemp || 90}°C</div>
                </div>

                <div class="p-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                    <div class="flex-between text-xs mb-1">
                        <span><i class="fa-solid fa-gear color-cyan mr-1"></i> 3. КПП и ходовая часть:</span>
                        <b class="${transWear < 50 ? 'color-red' : 'color-green'}">${transWear}% ресурс</b>
                    </div>
                    <div class="sub-label" style="font-size:9px;">${transDesc} • Шины: ${tires}% остаток</div>
                </div>

                <div class="p-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                    <div class="flex-between text-xs mb-1">
                        <span><i class="fa-solid fa-chair color-purple mr-1"></i> 4. Салон и комфорт:</span>
                        <b class="${car.cleanInterior ? 'color-green' : 'color-amber'}">${car.cleanInterior ? 'Идеал' : 'Стандарт'}</b>
                    </div>
                    <div class="sub-label" style="font-size:9px;">${salonDesc}</div>
                </div>
            </div>

            <div class="p-2 mb-3" style="background:rgba(0,242,254,0.06); border-radius:8px; border:1px solid var(--border-glow);">
                <div class="flex-between text-xs mb-1">
                    <span class="sub-label">Госучёт:</span>
                    ${legalStatus}
                </div>
                <div class="flex-between text-xs">
                    <span class="sub-label">Страховой полис:</span>
                    ${insStatus}
                </div>
            </div>

            <div class="grid-2 mb-2">
                <button onclick="openInsuranceModalFromPreview()" class="btn btn-cyan btn-sm">
                    <i class="fa-solid fa-file-shield mr-1"></i> Оформить страховку
                </button>
                <button onclick="openOBD2Modal()" class="btn btn-dark btn-sm">
                    <i class="fa-solid fa-tablet-screen-button color-cyan mr-1"></i> Launch OBD2
                </button>
            </div>
            <div class="grid-2 mb-3">
                <button onclick="openTuningFromPreview()" class="btn btn-dark btn-sm">
                    <i class="fa-solid fa-screwdriver-wrench color-amber mr-1"></i> В мастерскую тюнинга
                </button>
                <button onclick="openChangePlateModal()" class="btn btn-dark btn-sm">
                    <i class="fa-solid fa-id-card color-purple mr-1"></i> Сменить госномер
                </button>
            </div>

            <button onclick="ModalManager.close('modalPreview')" class="btn btn-dark w-full">Закрыть инспекцию</button>
        </div>
    `;

    ModalManager.open('modalPreview');
    playSound('tick');
}

function openTuningFromPreview() {
    if (previewCarIndex === null) return;
    let idx = previewCarIndex;
    ModalManager.close('modalPreview');
    openTuningModal(idx);
}

// ========================================================
// 6. СТРАХОВОЙ ДОГОВОР
// ========================================================
function openInsuranceModalFromPreview() {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car) return;

    ModalManager.close('modalPreview');
    renderInsuranceContractUI(car);

    ModalManager.open('modalInsurance');
    playSound('tick');
}

function renderInsuranceContractUI(car) {
    let modal = document.getElementById('modalInsurance');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalInsurance';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
    let baseOsagoCost = 8500;
    let totalCash = baseOsagoCost;
    let totalStars = 2;

    if (insuranceOptions.theft) { totalCash += 14000; totalStars += 4; }
    if (insuranceOptions.totalLoss) { totalCash += 22000; totalStars += 5; }
    if (insuranceOptions.roadside) { totalCash += 4500; totalStars += 1; }

    modal.innerHTML = `
        <div class="modal-box text-left" style="max-width: 420px;">
            <div class="modal-glow-badge mb-1" style="color:var(--cyan); border-color:rgba(0,242,254,0.4);">
                📋 СТРАХОВАНИЕ АВТОМОБИЛЯ (РСА)
            </div>
            <h3 class="font-bold color-cyan mb-1">${car.name}</h3>
            <div class="sub-label mb-3">Госномер: <b>${cPlate}</b></div>

            <div class="space-y-2 mb-3">
                <div class="p-2 glass-card selected" style="border-color:var(--green);">
                    <div class="flex-between text-xs mb-1">
                        <b class="color-green">1. Полис ОСАГО (Обязательный)</b>
                        <span class="tag-badge bg-tag-green">${baseOsagoCost.toLocaleString()} ₽</span>
                    </div>
                    <div class="sub-label" style="font-size:9px;">Защита от штрафов ДПС (ст. 12.37) и покрытие ущерба чужим авто до 400,000 ₽.</div>
                </div>

                <div class="p-2 glass-card ${insuranceOptions.totalLoss ? 'selected' : ''}" onclick="toggleInsuranceOption('totalLoss')" style="cursor:pointer;">
                    <div class="flex-between text-xs mb-1">
                        <b class="color-amber">2. Пакет КАСКО «Тотал & Угон»</b>
                        <span class="tag-badge ${insuranceOptions.totalLoss ? 'bg-tag-amber' : 'bg-tag-dark'}">+22,000 ₽</span>
                    </div>
                    <div class="sub-label" style="font-size:9px;">Выплата 85% рыночной стоимости машины даже при полном уничтожении кузова.</div>
                </div>

                <div class="p-2 glass-card ${insuranceOptions.roadside ? 'selected' : ''}" onclick="toggleInsuranceOption('roadside')" style="cursor:pointer;">
                    <div class="flex-between text-xs mb-1">
                        <b class="color-purple">3. Служба «Эвакуация 24/7»</b>
                        <span class="tag-badge ${insuranceOptions.roadside ? 'bg-tag-purple' : 'bg-tag-dark'}">+4,500 ₽</span>
                    </div>
                    <div class="sub-label" style="font-size:9px;">Бесплатный эвакуатор при поломке мотора или ДТП.</div>
                </div>
            </div>

            <div class="p-2 mb-3 flex-between" style="background:#090e18; border-radius:8px;">
                <span class="sub-label text-xs">Итого к оплате:</span>
                <b class="color-green text-xs" style="font-size:14px;">${totalCash.toLocaleString()} ₽ + ${totalStars} ⭐</b>
            </div>

            <div class="grid-2 mb-2">
                <button onclick="confirmSignInsurancePolicy(${totalCash}, ${totalStars})" class="btn btn-green btn-sm">
                    Оформить полис ✓
                </button>
                <button onclick="driveWithoutInsuranceWarning()" class="btn btn-red btn-sm">
                    Ездить без страховки ⚠️
                </button>
            </div>

            <button onclick="ModalManager.close('modalInsurance')" class="btn btn-dark w-full">Отмена</button>
        </div>
    `;
}

function toggleInsuranceOption(optionKey) {
    insuranceOptions[optionKey] = !insuranceOptions[optionKey];
    playSound('tick');
    tgHaptic('light');

    if (previewCarIndex !== null) {
        renderInsuranceContractUI(state.garage[previewCarIndex]);
    }
}

function confirmSignInsurancePolicy(totalCash, totalStars) {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car) return;

    let cash = state.player?.cash || 0;
    let stars = state.player?.stars || 0;

    if (cash < totalCash) return showToast("Не хватает рублей на оплату полиса!");
    if (stars < totalStars) return showToast(`Не хватает ${totalStars} Stars ⭐!`);

    state.player.cash -= totalCash;
    state.player.stars -= totalStars;

    let isCasco = insuranceOptions.totalLoss;
    car.insurance = {
        type: isCasco ? 'comprehensive' : 'osago',
        options: { ...insuranceOptions },
        cost: totalCash,
        date: Date.now()
    };

    ModalManager.close('modalInsurance');
    saveState();
    renderGarage();
    playSound('win');
    tgHaptic('success');
    showToast("Полис страхования зарегистрирован в базе РСА ✓");
    openCarPreviewModal(previewCarIndex);
}

function driveWithoutInsuranceWarning() {
    ModalManager.close('modalInsurance');
    showToast("⚠️ Режим риска: выезды без полиса могут привести к штрафам ДПС и судам!");
    if (previewCarIndex !== null) {
        openCarPreviewModal(previewCarIndex);
    }
}

function checkUninsuredDriveRisk(car) {
    if (!car || car.insurance) return true;

    let roll = Math.random();

    if (roll < 0.20) {
        let fine = 800;
        state.player.cash = Math.max(0, (state.player.cash || 0) - fine);
        showToast(`🚔 Рейд ДПС! Штраф за езду без ОСАГО: -${fine} ₽.`);
        playSound('error');
        tgHaptic('error');
        saveState();
        updateHeaderUI();
        return false;
    } else if (roll < 0.28) {
        let damageCost = Math.round(75000 + Math.random() * 180000);
        state.player.cash = Math.max(0, (state.player.cash || 0) - damageCost);
        car.condition = Math.max(15, (car.condition || 80) - 25);
        recalculateCarMarketValue(car);

        showToast(`💥 ДТП на перекрёстке! Из-за отсутствия ОСАГО вам выставлен регресс на ремонт чужого авто (-${damageCost.toLocaleString()} ₽)!`);
        playSound('error');
        tgHaptic('error');
        saveState();
        updateHeaderUI();
        renderGarage();
        return false;
    }

    return true;
}

// ========================================================
// 7. РАСШИРЕННЫЙ ДЕТЕЙЛИНГ И ПРЕДПРОДАЖНАЯ ПОДГОТОВКА
// ========================================================
function openPreSaleModal(idx) {
    const caps = getPlayerHousingCapabilities();
    if (!caps.canDetail && !caps.canService) {
        return openNeedCapabilityModal('detail', "Предпродажная подготовка и детейлинг");
    }

    activePreSaleCarIndex = idx;
    const car = state.garage[idx];
    if (!car) return;

    let modal = document.getElementById('modalPreSale');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalPreSale';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const hasPaintShop = (state.businesses || []).some(b => b.id === 'paint_shop' && b.level > 0);

    modal.innerHTML = `
        <div class="modal-box text-left" style="max-width: 440px;">
            <div class="modal-glow-badge mb-1" style="color:var(--amber); border-color:rgba(255,179,0,0.4);">
                ✨ ЦЕНТР ДЕТЕЙЛИНГА & ПРЕДПРОДАЖКИ
            </div>
            <h3 class="font-bold color-cyan mb-1">${car.name}</h3>
            <div class="sub-label mb-3">Повышайте маржинальность и привлекательность для покупателей:</div>

            <div class="space-y-2 mb-3">
                <div class="glass-card p-2 flex-between">
                    <div>
                        <b class="text-xs color-cyan">1. Абразивная полировка кузова</b>
                        <div class="sub-label" style="font-size:8.5px;">Глубокий глянец, удаление паутинки (+12% к цене авто).</div>
                    </div>
                    <button onclick="applyPreSaleMod('clean')" class="btn ${car.isPolished ? 'btn-dark opacity-50' : 'btn-cyan'} btn-sm btn-auto" ${car.isPolished ? 'disabled' : ''}>
                        ${car.isPolished ? 'Сделано ✓' : '7,000 ₽'}
                    </button>
                </div>

                <div class="glass-card p-2 flex-between">
                    <div>
                        <b class="text-xs color-green">2. Химчистка салона с озонацией</b>
                        <div class="sub-label" style="font-size:8.5px;">Удаление запаха табака, чистка кресел (+25k к цене).</div>
                    </div>
                    <button onclick="applyPreSaleMod('interior')" class="btn ${car.cleanInterior ? 'btn-dark opacity-50' : 'btn-green'} btn-sm btn-auto" ${car.cleanInterior ? 'disabled' : ''}>
                        ${car.cleanInterior ? 'Сделано ✓' : '8,500 ₽'}
                    </button>
                </div>

                <div class="glass-card p-2 flex-between">
                    <div>
                        <b class="text-xs color-amber">3. Полный облив кузова</b>
                        <div class="sub-label" style="font-size:8.5px;">${hasPaintShop ? 'Цех «Хамелеон»: заводской микрослой 115 мкм' : 'Окрас в боксе (+30% к HP кузова)'}</div>
                    </div>
                    <button onclick="applyPreSaleMod('paint')" class="btn ${car.isRepainted ? 'btn-dark opacity-50' : 'btn-amber'} btn-sm btn-auto" ${car.isRepainted ? 'disabled' : ''}>
                        ${car.isRepainted ? 'Окрашено ✓' : (hasPaintShop ? '14k ₽ (Цех)' : '25k ₽')}
                    </button>
                </div>

                <div class="glass-card p-2 flex-between">
                    <div>
                        <b class="text-xs color-purple">4. Точечный подкрас сколов</b>
                        <div class="sub-label" style="font-size:8.5px;">Удаляет жучки, не увеличивая показания толщиномера!</div>
                    </div>
                    <button onclick="applyPreSaleMod('chips')" class="btn btn-purple btn-sm btn-auto">
                        6,000 ₽
                    </button>
                </div>

                <div class="glass-card p-2 flex-between">
                    <div>
                        <b class="text-xs color-red">5. Демпферная присадка в мотор</b>
                        <div class="sub-label" style="font-size:8.5px;">Маскирует стуки гидрокомпенсаторов и износ поршневой.</div>
                    </div>
                    <button onclick="applyPreSaleMod('additive')" class="btn ${car.hasAdditive ? 'btn-dark opacity-50' : 'btn-red'} btn-sm btn-auto" ${car.hasAdditive ? 'disabled' : ''}>
                        ${car.hasAdditive ? 'Залито ✓' : '12,000 ₽'}
                    </button>
                </div>

                <div class="glass-card p-2 flex-between">
                    <div>
                        <b class="text-xs color-red">6. Смотка одометра (-50% км)</b>
                        <div class="sub-label" style="font-size:8.5px;">Внимание: Автотека выявит скрутку в отчёте!</div>
                    </div>
                    <button onclick="applyPreSaleMod('odometer')" class="btn ${car.rolledOdometer ? 'btn-dark opacity-50' : 'btn-red'} btn-sm btn-auto" ${car.rolledOdometer ? 'disabled' : ''}>
                        ${car.rolledOdometer ? 'Скручен ✓' : '15,000 ₽'}
                    </button>
                </div>
            </div>

            <button onclick="ModalManager.close('modalPreSale')" class="btn btn-dark w-full">Закрыть детейлинг</button>
        </div>
    `;

    ModalManager.open('modalPreSale');
    playSound('tick');
}

function applyPreSaleMod(type) {
    if (activePreSaleCarIndex === null) return;
    const car = state.garage[activePreSaleCarIndex];
    if (!car) return;

    let cash = state.player?.cash || 0;
    const hasPaintShop = (state.businesses || []).some(b => b.id === 'paint_shop' && b.level > 0);

    if (type === 'clean') {
        if (car.isPolished) return showToast("Кузов уже отполирован до блеска!");
        if (cash < 7000) return showToast("Нужно 7,000 ₽!");
        state.player.cash -= 7000;
        car.isPolished = true;
        recalculateCarMarketValue(car);
        showToast("Кузов отполирован (+12% к рыночной цене)!");
    } else if (type === 'interior') {
        if (car.cleanInterior) return showToast("Салон уже прошёл озонацию!");
        if (cash < 8500) return showToast("Нужно 8,500 ₽!");
        state.player.cash -= 8500;
        car.cleanInterior = true;
        recalculateCarMarketValue(car);
        showToast("Химчистка завершена! Запах табака и грязь удалены.");
    } else if (type === 'paint') {
        if (car.isRepainted) return showToast("Кузов уже был повторно окрашен!");
        let cost = hasPaintShop ? 14000 : 25000;
        if (cash < cost) return showToast(`Нужно ${cost.toLocaleString()} ₽ на покраску!`);

        state.player.cash -= cost;
        car.isRepainted = true;
        car.condition = Math.min(100, (car.condition || 60) + 30);

        if (hasPaintShop) {
            car.bodyThickness = { hood: 115, roof: 110, doors: 120, wings: 115 };
            showToast("🎨 Цех «Хамелеон»: окрашено заводским микрослоем!");
        } else {
            car.bodyThickness = { hood: 240, roof: 110, doors: 260, wings: 230 };
            showToast("Кузов перекрашен (+30% к состоянию HP)!");
        }
        recalculateCarMarketValue(car);
    } else if (type === 'chips') {
        if (cash < 6000) return showToast("Нужно 6,000 ₽!");
        state.player.cash -= 6000;
        car.condition = Math.min(100, (car.condition || 70) + 10);
        showToast("Сколы точечно закрашены без изменения толщины ЛКП!");
        recalculateCarMarketValue(car);
    } else if (type === 'additive') {
        if (car.hasAdditive) return showToast("Присадка уже залита!");
        if (cash < 12000) return showToast("Нужно 12,000 ₽!");
        state.player.cash -= 12000;
        car.hasAdditive = true;
        showToast("Присадка залита! Стуки мотора скрыты.");
    } else if (type === 'odometer') {
        if (car.rolledOdometer) return showToast("Пробег уже скручивался!");
        if (cash < 15000) return showToast("Нужно 15,000 ₽!");
        state.player.cash -= 15000;
        car.mileage = Math.round((car.mileage || 120000) * 0.5);
        car.rolledOdometer = true;
        showToast("Пробег смотан на 50%!");
    }

    saveState();
    renderGarage();
    openPreSaleModal(activePreSaleCarIndex);
    playSound('win');
    tgHaptic('success');
}

// ========================================================
// 8. СПОРТИВНЫЙ ТЮНИНГ И ЛЕГАЛИЗАЦИЯ ПО СТ. 12.5.1
// ========================================================
function openTuningModal(idx) {
    if (!checkPlayerCapability('tune')) {
        return openNeedCapabilityModal('tune', "Спортивный тюнинг и корчевание");
    }

    activeTuningCarIndex = idx;
    const car = state.garage[idx];
    if (!car) return;

    if (!car.tuning) {
        car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, coldIntake: false, intercooler: false, tinted: false, risk1251: 0 };
    }

    setTxt('tuneCarTitle', `Мастерская: <b>${car.name}</b> (${car.power || 100} л.с.)`);
    switchTuneTab(activeTuneTab || 'engine');
    
    ModalManager.open('modalTuning');
    playSound('tick');
}

function switchTuneTab(tab) {
    activeTuneTab = tab;
    ['engine', 'drift', 'drag', 'style'].forEach(t => {
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

    const hasChipLab = (state.businesses || []).some(b => b.id === 'chip_tuning' && b.level > 0);
    let html = "";

    if (activeTuneTab === 'engine') {
        let chipDiscount = hasChipLab ? 0.30 : 1.0;
        let cCost1 = Math.round(30000 * chipDiscount);
        let cCost2 = Math.round(65000 * chipDiscount);
        let cCost3 = Math.round(180000 * chipDiscount);

        const engMods = [
            { id: 'chip_stage1', name: `⚡ Чип Stage 1 ${hasChipLab ? '(-70%)' : ''}`, cost: cCost1, desc: '+25 л.с., сдвиг отсечки (+50k ₽ к цене).', bought: t.chip >= 1, action: `buyChipStage(1, ${cCost1}, 25)` },
            { id: 'chip_stage2', name: `🔥 Stage 2 + Попкорн ${hasChipLab ? '(-70%)' : ''}`, cost: cCost2, desc: '+60 л.с., отстрелы (+115k ₽ к цене).', bought: t.chip >= 2, action: `buyChipStage(2, ${cCost2}, 60)` },
            { id: 'chip_stage3', name: `🚀 Stage 3 Big Turbo Kit`, cost: cCost3, desc: '+150 л.с., высшая лига скорости (+290k ₽ к цене).', bought: t.chip >= 3, action: `buyChipStage(3, ${cCost3}, 150)` },
            { id: 'coldIntake', name: '🌪️ Холодный впуск K&N', cost: 28000, desc: '+12 л.с., сочный звук впуска (+32k ₽ к цене).', bought: !!t.coldIntake, action: "buyTuningMod('coldIntake', 28000, 12, 5)" },
            { id: 'intercooler', name: '❄️ Фронтальный интеркулер', cost: 42000, desc: 'Стабильный буст в жару (+48k ₽ к цене).', bought: !!t.intercooler, action: "buyTuningMod('intercooler', 42000, 15, 5)" }
        ];

        engMods.forEach(m => {
            let btn = m.bought 
                ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Установлено ✓</button>"
                : `<button onclick="${m.action}" class="btn btn-cyan btn-sm btn-auto">${m.cost.toLocaleString()} ₽</button>`;

            html += `
            <div class="glass-card p-2 flex-between mb-2">
                <div style="flex:1; margin-right:8px;">
                    <b class="text-xs color-cyan">${m.name}</b>
                    <div class="sub-label" style="font-size:9.5px;">${m.desc}</div>
                </div>
                ${btn}
            </div>`;
        });
    } else if (activeTuneTab === 'drift') {
        const driftMods = [
            { id: 'weldedDiff', name: '🔩 Заварка редуктора', cost: 12000, desc: 'Блокировка задней оси для дрифта (+22k ₽ к цене).', bought: !!t.weldedDiff, risk: 5 },
            { id: 'steeringAngle', name: '📐 Красноярский выворот', cost: 25000, desc: 'Сошки и рычаги для глубокого угла (+45k ₽ к цене).', bought: !!t.steeringAngle, risk: 10 },
            { id: 'hydroHandbrake', name: '🕹️ Гидроручник с цилиндром Wilwood', cost: 35000, desc: 'Мгновенный срыв задней оси в занос (+60k ₽ к цене).', bought: !!t.hydroHandbrake, risk: 15 },
            { id: 'bucketSeats', name: '💺 Спортивные ковши с омологацией', cost: 45000, desc: 'Жёсткая фиксация в перегрузках (+75k ₽ к цене).', bought: !!t.bucketSeats, risk: 5 }
        ];

        driftMods.forEach(m => {
            let btn = m.bought 
                ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Установлено ✓</button>"
                : `<button onclick="buyTuningMod('${m.id}', ${m.cost}, 0, ${m.risk})" class="btn btn-red btn-sm btn-auto">${m.cost.toLocaleString()} ₽</button>`;

            html += `
            <div class="glass-card p-2 flex-between mb-2">
                <div style="flex:1; margin-right:8px;">
                    <b class="text-xs color-red">${m.name}</b>
                    <div class="sub-label" style="font-size:9.5px;">${m.desc}</div>
                </div>
                ${btn}
            </div>`;
        });
    } else if (activeTuneTab === 'drag') {
        const dragMods = [
            { id: 'dragSlicks', name: '🛞 Полуслики Toyo R888R', cost: 45000, desc: 'Максимальный зацеп на старте (+70k ₽ к цене).', bought: !!t.dragSlicks, risk: 5 },
            { id: 'rollCage', name: '🛡️ Вварной каркас безопасности', cost: 85000, desc: 'Жёсткость кузова и безопасность (+140k ₽ к цене).', bought: !!t.rollCage, risk: 25 }
        ];

        dragMods.forEach(m => {
            let btn = m.bought 
                ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Установлено ✓</button>"
                : `<button onclick="buyTuningMod('${m.id}', ${m.cost}, 0, ${m.risk})" class="btn btn-amber btn-sm btn-auto">${m.cost.toLocaleString()} ₽</button>`;

            html += `
            <div class="glass-card p-2 flex-between mb-2">
                <div style="flex:1; margin-right:8px;">
                    <b class="text-xs color-amber">${m.name}</b>
                    <div class="sub-label" style="font-size:9.5px;">${m.desc}</div>
                </div>
                ${btn}
            </div>`;
        });
    } else if (activeTuneTab === 'style') {
        const styleMods = [
            { id: 'stance', name: '🏎️ 4-контурная пневмоподвеска', cost: 75000, desc: 'Дроп кузова в пол на сходках (+120k ₽ к цене).', bought: !!t.stance, risk: 15 },
            { id: 'customWheels', name: '✨ Кованые диски Work Meister', cost: 60000, desc: 'Широкая полка и правильный натяг (+95k ₽ к цене).', bought: !!t.customWheels, risk: 5 },
            { id: 'bodykit', name: '🌪️ Обвес Rocket Bunny', cost: 50000, desc: 'Фендеры и дактейл (+85k ₽ к цене).', bought: !!t.bodykit, risk: 10 },
            { id: 'tinted', name: '🕶️ Тонировка «в круг» 5%', cost: 12000, desc: 'Дерзкий вид, внимание молодёжи (+18k ₽ к цене).', bought: !!t.tinted, risk: 20 },
            { id: 'exhaust', name: '💨 Спортивная трасса 76мм', cost: 35000, desc: 'Басистый выхлоп и отстрелы (+55k ₽ к цене).', bought: !!t.exhaust, risk: 15 }
        ];

        styleMods.forEach(m => {
            let btn = m.bought 
                ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Установлено ✓</button>"
                : `<button onclick="buyTuningMod('${m.id}', ${m.cost}, 0, ${m.risk})" class="btn btn-purple btn-sm btn-auto">${m.cost.toLocaleString()} ₽</button>`;

            html += `
            <div class="glass-card p-2 flex-between mb-2">
                <div style="flex:1; margin-right:8px;">
                    <b class="text-xs color-purple">${m.name}</b>
                    <div class="sub-label" style="font-size:9.5px;">${m.desc}</div>
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
    showToast("Деталь установлена! Оценка авто выросла.");
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

function legalizeTuningModifications() {
    if (activeTuningCarIndex === null) return;
    const car = state.garage[activeTuningCarIndex];
    if (!car) return;

    let r = car.tuning?.risk1251 || 0;
    if (r <= 0) return showToast("На автомобиле нет незарегистрированных переделок!");

    let certCost = Math.round(r * 900);
    let cash = state.player?.cash || 0;
    if (cash < certCost) return showToast(`Нужно ${certCost.toLocaleString()} ₽ на экспертизу НАМИ!`);

    state.player.cash -= certCost;
    car.tuning.risk1251 = 0;

    saveState();
    updateHeaderUI();
    renderTuningItems();
    playSound('win');
    tgHaptic('success');
    showToast("Отметки о тюнинге внесены в ПТС/СТС! Риск по ст. 12.5.1 аннулирован.");
}

// ========================================================
// 9. СТАТУС ЛИЧНОГО АВТОМОБИЛЯ И СВЯЗКА СО СТРИТОМ
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
    const car = state.garage[idx];
    if (!car) return;

    checkUninsuredDriveRisk(car);

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
// 10. СТАЦИОНАРНЫЙ OBD2 СКАНЕР
// ========================================================
function openOBD2Modal() {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car) return;

    const hasScanner = !!(state.player?.tools && (state.player.tools.obd || state.player.tools.obd_launch));
    if (!hasScanner) {
        playSound('error');
        tgHaptic('warning');
        return showToast("⚠️ У вас нет сканера OBD2! Купите ELM327 или Launch Pro в Авто-Маркете.");
    }

    if (!checkPlayerCapability('obd')) {
        return openNeedCapabilityModal('obd', "Стационарная диагностика ЭБУ");
    }

    let isLaunch = !!state.player?.tools?.obd_launch;
    let toolKey = isLaunch ? 'obd_launch' : 'obd';
    let wear = state.player?.toolsWear ? (state.player.toolsWear[toolKey] || 0) : 0;

    if (wear <= 0) {
        playSound('error');
        tgHaptic('warning');
        return showToast("⚠️ Диагностический сканер разряжен! Откалибруйте его в Авто-Маркете.");
    }

    state.player.toolsWear[toolKey] = Math.max(0, wear - 1);
    saveState();

    ModalManager.close('modalPreview');

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

    ModalManager.open('modalOBD2');
    playSound('tick');

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('obd_scan', 1);
    }

    const terminalEl = document.getElementById('garageObdTerminalLines');
    const progFill = document.getElementById('garageObdProgressFill');

    const scanSteps = [
        { pct: 25, msg: "> Подключение к ЭБУ ДВС (DME/ECU)... Связь 100%", type: "success" },
        { pct: 50, msg: "> Опрос трансмиссии (EGS), соленоиды давления...", type: "" },
        { pct: 75, msg: "> Сканирование ABS/ESP и подушек SRS...", type: "" },
        { pct: 100, msg: "> Чтение сохранённых ошибок в памяти DTC...", type: car.hiddenDefect ? "error" : "success" }
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
    }, 450);
}

function renderGarageOBDFinal(car, resBox, actBox) {
    let eng = car.wear?.engine ? Math.round(car.wear.engine) : 85;
    let trans = car.wear?.transmission ? Math.round(car.wear.transmission) : 85;

    const hasOwnSTO = (state.businesses || []).some(b => b.id === 'sto' && b.level > 0);

    if (car.hiddenDefect) {
        playSound('error');
        tgHaptic('error');
        let def = car.hiddenDefect;
        let baseCost = def.cost || 15000;
        let actualRepairCost = hasOwnSTO ? Math.round(baseCost * 0.60) : baseCost;

        resBox.innerHTML = `
            <div class="obd-cyber-display" style="border-color: var(--red);">
                <div class="flex-between text-xs mb-2">
                    <span class="color-red font-bold"><i class="fa-solid fa-triangle-exclamation"></i> ОБНАРУЖЕН DTC КОД: ${def.code || 'P0300'}</span>
                    <span class="tag-badge bg-tag-red">${def.severity || 'Критическая'}</span>
                </div>
                <div class="obd-scan-matrix-screen mb-2" style="border-color: rgba(255, 51, 102, 0.4);">
                    <div class="obd-terminal-line error">> НЕИСПРАВНОСТЬ: ${def.text}</div>
                    <div class="obd-terminal-line warn">> БЛОК: ${def.system || 'ЭБУ ДВС DME'}</div>
                    <div class="obd-terminal-line">> СТОИМОСТЬ РЕМОНТА: ~${actualRepairCost.toLocaleString()} ₽ ${hasOwnSTO ? '(Скидка СТО 40%)' : ''}</div>
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
                <button onclick="repairDefectInGarage(${actualRepairCost})" class="btn btn-purple btn-sm">Ремонт (${actualRepairCost.toLocaleString()} ₽)</button>
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
                    <div class="obd-terminal-line">> Топливные коррекции в норме.</div>
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
    showToast("Память ошибок DTC очищена! Check Engine временно погас.");
    
    if (Math.random() < 0.5) {
        car.hasAdditive = true;
    }
    saveState();
    openOBD2Modal();
}

function repairDefectInGarage(overrideCost) {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car || !car.hiddenDefect) return;

    let cost = overrideCost || car.hiddenDefect.cost || 15000;
    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Не хватает денег на устранение дефекта!");

    state.player.cash -= cost;
    car.hiddenDefect = null;
    car.hasAdditive = false;
    car.condition = Math.min(100, (car.condition || 70) + 20);
    recalculateCarMarketValue(car);

    saveState();
    renderGarage();
    playSound('win');
    tgHaptic('success');
    showToast("Неисправность устранена! Оценка машины выросла.");
    openOBD2Modal();
}

function closeOBD2Modal() {
    ModalManager.close('modalOBD2');
    if (previewCarIndex !== null) {
        openCarPreviewModal(previewCarIndex);
    }
}

// ========================================================
// 11. ШТРАФСТОЯНКА ГИБДД
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
    let scrapReward = Math.round((car.basePrice || 100000) * 0.45);
    let passes = state.player?.freeImpoundPasses || 0;

    const hasTowService = (state.businesses || []).some(b => b.id === 'tow_truck' && b.level > 0);

    let towServiceBlock = hasTowService ? `
        <div class="glass-card p-2 mb-2" style="border: 1px solid var(--green); background: rgba(0,230,118,0.12);">
            <div class="flex-between mb-1">
                <b class="text-xs color-green"><i class="fa-solid fa-truck-pickup"></i> Служба эвакуации «Шериф»</b>
                <span class="tag-badge bg-tag-green">ВАШ БИЗНЕС</span>
            </div>
            <div class="sub-label mb-2" style="font-size:10px;">Диспетчер выслал корпоративный эвакуатор для забора машины без взяток и штрафа.</div>
            <button onclick="resolveImpoundTowTruck()" class="btn btn-green btn-sm w-full">Забрать своим эвакуатором (0 ₽) 🚛</button>
        </div>
    ` : "";

    let freePassBlock = (passes > 0 && !hasTowService) ? `
        <div class="glass-card p-2 mb-2" style="border: 1px solid var(--purple); background: rgba(192,132,252,0.1);">
            <div class="flex-between mb-1">
                <b class="text-xs color-purple"><i class="fa-solid fa-ticket"></i> Талон бесплатного забора</b>
                <span class="tag-badge bg-tag-purple">В наличии: ${passes} шт</span>
            </div>
            <div class="sub-label mb-2" style="font-size:10px;">Забрать автомобиль мгновенно по федеральному пропуску.</div>
            <button onclick="resolveImpoundFreePass()" class="btn btn-purple btn-sm w-full">Использовать талон (0 ₽)</button>
        </div>
    ` : "";

    modal.innerHTML = `
        <div class="modal-box text-center" style="max-width: 420px;">
            <div class="radar-spinner-ring mb-2" style="border-top-color: var(--red); border-right-color: var(--amber);">
                <div class="radar-spinner-center">🚔</div>
            </div>
            <div class="modal-glow-badge mb-1" style="color:var(--red); border-color:rgba(255,51,102,0.4);"><i class="fa-solid fa-lock"></i> СПЕЦСТОЯНКА ГИБДД</div>
            <h3 class="font-bold mb-1 color-cyan">${car.name}</h3>
            <div class="sub-label mb-3">Госномер: <span class="license-plate" style="font-size:10px; padding:2px 6px;">${car.customPlate || car.plate || "ТРАНЗИТ"}</span></div>

            <div class="space-y-2 mb-3 text-left">
                ${towServiceBlock}
                ${freePassBlock}

                <div class="glass-card p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber"><i class="fa-solid fa-handshake"></i> Договориться на месте</b>
                        <span class="tag-badge bg-tag-amber">СВЯЗИ</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">Решить вопрос через теневые связи Решалы или наличными инспектору.</div>
                    <div class="grid-2">
                        <button onclick="resolveImpoundBribe('cash')" class="btn btn-dark btn-sm">Наличные (45k ₽)</button>
                        <button onclick="resolveImpoundBribe('conn')" class="btn btn-purple btn-sm">Решала (1 🤝)</button>
                    </div>
                </div>

                <div class="glass-card p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-green"><i class="fa-solid fa-receipt"></i> Официальный выкуп</b>
                        <span class="tag-badge bg-tag-green">МРЭО</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">Оплата протокола за нарушение и услуг городского эвакуатора.</div>
                    <button onclick="resolveImpoundOfficialPay()" class="btn btn-green btn-sm w-full">Оплатить протокол (30,000 ₽)</button>
                </div>

                <div class="glass-card p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-red"><i class="fa-solid fa-recycle"></i> Сдать в утиль</b>
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

            <button onclick="ModalManager.close('modalImpoundLot')" class="btn btn-dark w-full">Закрыть</button>
        </div>
    `;

    ModalManager.open('modalImpoundLot');
    playSound('tick');
}

function resolveImpoundTowTruck() {
    if (activeImpoundCarIndex === null) return;
    const car = state.garage[activeImpoundCarIndex];
    if (!car) return;

    car.impounded = false;
    ModalManager.close('modalImpoundLot');
    saveState();
    updateHeaderUI();
    renderGarage();
    playSound('win');
    tgHaptic('success');
    showToast("Эвакуатор службы «Шериф» забрал машину обратно в гараж (0 ₽)!");
}

function resolveImpoundFreePass() {
    if (activeImpoundCarIndex === null) return;
    const car = state.garage[activeImpoundCarIndex];
    if (!car) return;

    let passes = state.player?.freeImpoundPasses || 0;
    if (passes <= 0) return showToast("У вас нет талонов бесплатного забора!");

    state.player.freeImpoundPasses -= 1;
    car.impounded = false;

    ModalManager.close('modalImpoundLot');
    saveState();
    updateHeaderUI();
    renderGarage();
    playSound('win');
    tgHaptic('success');
    showToast("Автомобиль бесплатно освобожден по талону спецстоянки!");
}

function resolveImpoundBribe(type) {
    if (activeImpoundCarIndex === null) return;
    const car = state.garage[activeImpoundCarIndex];
    if (!car) return;

    if (type === 'cash') {
        let cost = 45000;
        if ((state.player?.cash || 0) < cost) return showToast("Не хватает денег на взятку!");
        state.player.cash -= cost;
        showToast("Вопрос урегулирован наличными (-45,000 ₽)!");
    } else {
        if ((state.player?.connections || 0) < 1) return showToast("У вас нет теневых связей 🤝!");
        state.player.connections -= 1;
        showToast("Решала забрал ключи со спецстоянки (-1 🤝)!");
    }

    car.impounded = false;
    ModalManager.close('modalImpoundLot');
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

    let cost = 30000;
    if ((state.player?.cash || 0) < cost) return showToast("Не хватает денег для оплаты квитанции!");

    state.player.cash -= cost;
    car.impounded = false;
    ModalManager.close('modalImpoundLot');
    saveState();
    updateHeaderUI();
    renderGarage();
    playSound('win');
    tgHaptic('success');
    showToast("Штраф и эвакуация оплачены! Автомобиль возвращён.");
}

function resolveImpoundScrap(reward) {
    if (activeImpoundCarIndex === null) return;
    const car = state.garage[activeImpoundCarIndex];
    if (!car || !car.isRegisteredOnPlayer) return;

    if (!confirm(`Сдать «${car.name}» в утиль? Автомобиль будет списан из гаража.`)) return;

    state.player.cash = (state.player.cash || 0) + reward;
    state.garage.splice(activeImpoundCarIndex, 1);
    ModalManager.close('modalImpoundLot');
    saveState();
    updateHeaderUI();
    renderGarage();
    playSound('win');
    tgHaptic('success');
    openVerdictModal("УТИЛИЗАЦИЯ ЗАВЕРШЕНА ♻️", `Автомобиль снят с государственного учёта.\nВыплачено: +${reward.toLocaleString()} ₽`, true);
}

// ========================================================
// 12. ВЫСТАВЛЕНИЕ НА ПРОДАЖУ
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
    if (askInput) askInput.value = Math.round((car.marketValue || car.basePrice || 100000) * 1.25);

    window.currentLotPutIndex = idx;
    ModalManager.open('modalPutOnLot');
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

    let waitTime = (typeof calculateLotWaitTime === 'function') ? calculateLotWaitTime(car) : Math.floor(40 + Math.random() * 80);

    state.salesLot.push({
        car: car,
        askingPrice: price,
        timer: waitTime,
        maxTimer: waitTime,
        currentBuyer: null,
        buyerTimerLeft: 0
    });

    ModalManager.close('modalPutOnLot');
    saveState();
    renderGarage();
    if (typeof renderSalesLot === 'function') renderSalesLot();
    updateHeaderUI();
    playSound('win');
    tgHaptic('success');
    showToast(`«${car.name}» выставлен на площадку продажи!`);
}

// ========================================================
// 13. ГОСНОМЕРА
// ========================================================
function openChangePlateModal() {
    if (previewCarIndex === null) return;
    const car = state.garage[previewCarIndex];
    if (!car) return;

    ModalManager.close('modalPreview');

    let modal = document.getElementById('modalChangePlate');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalChangePlate';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    let plates = state.ownedPlates || [];
    let platesListHtml = "";

    if (plates.length === 0) {
        platesListHtml = "<div class='sub-label text-center py-4'>У вас нет свободных госномеров в инвентаре.</div>";
    } else {
        plates.forEach(p => {
            let pCost = (typeof calculatePlateValue === 'function') ? calculatePlateValue(p) : 0;
            platesListHtml += `
            <div class="glass-card flex-between p-2 mb-1">
                <div>
                    <span class="license-plate">${p} <div class="license-flag">RUS</div></span>
                    <div class="sub-label mt-1" style="font-size:9.5px;">Оценка знака: <b class="color-amber">+${pCost.toLocaleString()} ₽</b></div>
                </div>
                <button onclick="applyPlateToCar('${p}')" class="btn btn-cyan btn-auto btn-sm">Повесить</button>
            </div>`;
        });
    }

    modal.innerHTML = `
        <div class="modal-box">
            <div class="flex-between mb-2">
                <div class="modal-glow-badge"><i class="fa-solid fa-id-card"></i> РЕГИСТРАЦИОННЫЕ ЗНАКИ</div>
                <button onclick="ModalManager.close('modalChangePlate')" class="btn btn-dark btn-auto btn-sm">✕</button>
            </div>
            <button onclick="removePlateFromCar()" class="btn btn-amber mb-2 w-full">Снять номер на транзиты (-2,000 ₽)</button>
            <div id="changePlateList" class="space-y-2 mb-2" style="max-height: 240px; overflow-y: auto;">
                ${platesListHtml}
            </div>
            <button onclick="ModalManager.close('modalChangePlate')" class="btn btn-dark w-full">Отмена</button>
        </div>
    `;

    ModalManager.open('modalChangePlate');
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

    ModalManager.close('modalChangePlate');
    saveState();
    renderGarage();
    openCarPreviewModal(previewCarIndex);
    playSound('win');
    tgHaptic('success');

    if (diff > 0) {
        spawnFloatingReward(`+${diff.toLocaleString()} ₽ к оценке авто!`);
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

    ModalManager.close('modalChangePlate');
    saveState();
    updateHeaderUI();
    renderGarage();
    openCarPreviewModal(previewCarIndex);
    playSound('tick');
    tgHaptic('light');

    if (diff > 0) {
        spawnFloatingReward(`-${diff.toLocaleString()} ₽`);
    }
    showToast(`Госномер ${curPlate} снят и убран в инвентарь!`);
}

// ========================================================
// 14. СОБЫТИЯ В ГАРАЖЕ ПРИ СМЕНЕ СУТОК
// ========================================================
function triggerGarageRandomEvent() {
    if (!state.garage || state.garage.length === 0) return;
    if (Math.random() > 0.20) return;

    const randIdx = Math.floor(Math.random() * state.garage.length);
    const car = state.garage[randIdx];
    if (!car) return;

    activeGarageEventCar = { car: car, index: randIdx };

    const events = [
        {
            title: "Кошка поцарапала капот",
            desc: "Соседский кот запрыгнул на капот и оставил следы когтей на лаке.",
            emoji: "🐱",
            badge: "ЛКП",
            actionText: "Заполировать (4,000 ₽)",
            cost: 4000,
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
            actionText: "Поставить защиту (7,000 ₽)",
            cost: 7000,
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
            actionText: "Зарядить пусковым (2,500 ₽)",
            cost: 2500,
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

    ModalManager.open('modalGarageEvent');
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

    ModalManager.close('modalGarageEvent');
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
window.openCarPreviewModal = openCarPreviewModal;
window.openTuningFromPreview = openTuningFromPreview;
window.openInsuranceModalFromPreview = openInsuranceModalFromPreview;
window.toggleInsuranceOption = toggleInsuranceOption;
window.confirmSignInsurancePolicy = confirmSignInsurancePolicy;
window.driveWithoutInsuranceWarning = driveWithoutInsuranceWarning;
window.checkUninsuredDriveRisk = checkUninsuredDriveRisk;
window.openPreSaleModal = openPreSaleModal;
window.applyPreSaleMod = applyPreSaleMod;
window.openTuningModal = openTuningModal;
window.switchTuneTab = switchTuneTab;
window.renderTuningItems = renderTuningItems;
window.buyTuningMod = buyTuningMod;
window.buyChipStage = buyChipStage;
window.legalizeTuningModifications = legalizeTuningModifications;
window.openOBD2Modal = openOBD2Modal;
window.renderGarageOBDFinal = renderGarageOBDFinal;
window.clearOBDCodesQuick = clearOBDCodesQuick;
window.repairDefectInGarage = repairDefectInGarage;
window.closeOBD2Modal = closeOBD2Modal;
window.openImpoundLotModal = openImpoundLotModal;
window.resolveImpoundTowTruck = resolveImpoundTowTruck;
window.resolveImpoundFreePass = resolveImpoundFreePass;
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
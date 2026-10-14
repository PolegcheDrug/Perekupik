// ========================================================
// js/garage-calc.js — РАСЧЁТЫ, КОНФИГУРАЦИИ И БЕЙДЖИ ГАРАЖА (v1.1.0)
// ========================================================

const INSURANCE_CONFIG = {
    baseOsagoCost: 8500,
    baseStars: 2,
    theft: { cash: 14000, stars: 4 },
    totalLoss: { cash: 22000, stars: 5 },
    roadside: { cash: 4500, stars: 1 }
};

const TUNING_CONFIG = {
    engine: [
        { id: 'coldIntake', name: '🌪️ Холодный впуск K&N', baseCost: 26000, power: 12, risk: 5, desc: '+12 л.с., сочный звук впуска (+32k ₽ к цене).' },
        { id: 'intercooler', name: '❄️ Фронтальный интеркулер', baseCost: 38000, power: 15, risk: 5, desc: 'Стабильный буст в жару (+48k ₽ к цене).' }
    ],
    drift: [
        { id: 'weldedDiff', name: '🔩 Заварка редуктора', baseCost: 10000, power: 0, risk: 5, desc: 'Блокировка задней оси для дрифта (+22k ₽ к цене).' },
        { id: 'steeringAngle', name: '📐 Красноярский выворот', baseCost: 22000, power: 0, risk: 10, desc: 'Сошки и рычаги для глубокого угла (+45k ₽ к цене).' },
        { id: 'hydroHandbrake', name: '🕹️ Гидроручник с цилиндром Wilwood', baseCost: 32000, power: 0, risk: 15, desc: 'Мгновенный срыв задней оси в занос (+58k ₽ к цене).' },
        { id: 'bucketSeats', name: '💺 Спортивные ковши с омологацией', baseCost: 40000, power: 0, risk: 5, desc: 'Жёсткая фиксация в перегрузках (+70k ₽ к цене).' }
    ],
    drag: [
        { id: 'dragSlicks', name: '🛞 Полуслики Toyo R888R', baseCost: 42000, power: 0, risk: 5, desc: 'Максимальный зацеп на старте (+65k ₽ к цене).' },
        { id: 'rollCage', name: '🛡️ Вварной каркас безопасности', baseCost: 78000, power: 0, risk: 25, desc: 'Жёсткость кузова и безопасность (+130k ₽ к цене).' }
    ],
    style: [
        { id: 'stance', name: '🏎️ 4-контурная пневмоподвеска', baseCost: 70000, power: 0, risk: 15, desc: 'Дроп кузова в пол на сходках (+115k ₽ к цене).' },
        { id: 'customWheels', name: '✨ Кованые диски Work Meister', baseCost: 55000, power: 0, risk: 5, desc: 'Широкая полка и правильный натяг (+90k ₽ к цене).' },
        { id: 'bodykit', name: '🌪️ Обвес Rocket Bunny', baseCost: 48000, power: 0, risk: 10, desc: 'Фендеры и дактейл (+80k ₽ к цене).' },
        { id: 'tinted', name: '🕶️ Тонировка «в круг» 5%', baseCost: 10000, power: 0, risk: 20, desc: 'Дерзкий вид, внимание молодёжи (+18k ₽ к цене).' },
        { id: 'exhaust', name: '💨 Спортивная трасса 76мм', baseCost: 32000, power: 0, risk: 15, desc: 'Басистый выхлоп и отстрелы (+52k ₽ к цене).' }
    ]
};

function getPlayerHousingCapabilities() {
    const caps = {
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

    if (state.player?.baseSlots && state.player.baseSlots > 2) {
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
        caps.activeHouseTitle = activeHouse.name || caps.activeHouseTitle;
        caps.category = activeHouse.category || 'street';
        if (activeHouse.canTune) caps.canTune = true;
        if (activeHouse.canDetail) caps.canDetail = true;
        if (activeHouse.canService) caps.canService = true;
        if (activeHouse.canOBDGarage) caps.canOBDGarage = true;
        if (activeHouse.hasPersonalSlot) caps.hasPersonalSlot = true;
        if (activeHouse.reshalaDiscountPct) {
            caps.reshalaDiscountPct = Math.max(caps.reshalaDiscountPct, activeHouse.reshalaDiscountPct);
        }
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
            if (h.reshalaDiscountPct) {
                caps.reshalaDiscountPct = Math.max(caps.reshalaDiscountPct, h.reshalaDiscountPct);
            }
        }
    });

    return caps;
}

function checkPlayerCapability(featureKey) {
    const caps = getPlayerHousingCapabilities();
    switch (featureKey) {
        case 'tune': return caps.canTune;
        case 'detail': return caps.canDetail;
        case 'service': return caps.canService;
        case 'obd': return caps.canOBDGarage;
        case 'personal': return caps.hasPersonalSlot;
        default: return caps.canTune;
    }
}

function playerHasGarageOrWorkshop() {
    return checkPlayerCapability('tune');
}

function recalculateCarMarketValue(car) {
    if (!car) return 0;

    const base = Number(car.baseMarketValue || car.basePrice || 100000);
    const cond = (car.condition !== undefined) ? Number(car.condition) : 80;
    
    // Плавный расчет цены: убитый кузов дешевле, идеальный дает справедливую надбавку
    const condMultiplier = 0.68 + (cond / 100) * 0.46;
    let currentVal = Math.round(base * condMultiplier);

    const t = car.tuning || {};
    if (t.chip === 1) currentVal += 45000;
    else if (t.chip === 2) currentVal += 105000;
    else if (t.chip >= 3) currentVal += 260000;

    const tuningBonusMap = {
        coldIntake: 32000, intercooler: 48000, weldedDiff: 22000,
        steeringAngle: 45000, hydroHandbrake: 58000, bucketSeats: 70000,
        dragSlicks: 65000, rollCage: 130000, exhaust: 52000,
        stance: 115000, customWheels: 90000, bodykit: 80000, tinted: 18000
    };

    Object.keys(tuningBonusMap).forEach(key => {
        if (t[key]) currentVal += tuningBonusMap[key];
    });

    // Надбавки за предпродажную подготовку
    if (car.isPolished) currentVal = Math.round(currentVal * 1.12);
    if (car.isRepainted) currentVal += 45000;
    if (car.cleanInterior) currentVal += 25000;

    // Штрафы за износ основных агрегатов
    const engWear = car.wear?.engine !== undefined ? Number(car.wear.engine) : 85;
    const transWear = car.wear?.transmission !== undefined ? Number(car.wear.transmission) : 85;
    if (engWear < 40) currentVal = Math.round(currentVal * 0.86);
    if (transWear < 40) currentVal = Math.round(currentVal * 0.90);
    
    const tires = car.tireWear !== undefined ? Number(car.tireWear) : 100;
    if (tires < 25) currentVal = Math.max(10000, currentVal - 15000);

    // Скрытые дефекты снижают рыночную стоимость
    if (car.hiddenDefect && !car.hasAdditive) {
        currentVal = Math.max(10000, currentVal - Math.round((car.hiddenDefect.cost || 15000) * 0.85));
    }

    // Бонус за красивый или архивный госномер
    const plateStr = car.customPlate || car.plate || "ТРАНЗИТ";
    if (typeof calculatePlateValue === 'function') {
        currentVal += calculatePlateValue(plateStr);
    }

    car.marketValue = Math.round(currentVal);
    return car.marketValue;
}

function renderCarModsBadges(car) {
    if (!car) return "";
    const t = car.tuning || {};
    const badges = [];

    if (t.chip === 1) badges.push(`<span class="mod-pill color-cyan" title="Stage 1 Чип"><i class="fa-solid fa-bolt"></i> St1</span>`);
    else if (t.chip === 2) badges.push(`<span class="mod-pill color-amber" title="Stage 2 + Выхлоп"><i class="fa-solid fa-fire"></i> St2</span>`);
    else if (t.chip >= 3) badges.push(`<span class="mod-pill color-red" title="Stage 3 Big Turbo"><i class="fa-solid fa-rocket"></i> St3</span>`);

    const simpleModsMap = [
        { key: 'coldIntake', cls: 'color-cyan', icon: 'fa-wind', label: 'Впуск', desc: 'Холодный впуск' },
        { key: 'intercooler', cls: 'color-cyan', icon: 'fa-snowflake', label: 'Кулер', desc: 'Спортивный кулер' },
        { key: 'weldedDiff', cls: 'color-cyan', icon: 'fa-gear', label: 'Заварка', desc: 'Заварка дифференциала' },
        { key: 'steeringAngle', cls: 'color-green', icon: 'fa-compass-drafting', label: 'Выворот', desc: 'Красноярский выворот' },
        { key: 'hydroHandbrake', cls: 'color-red', icon: 'fa-gamepad', label: 'Гидроручник', desc: 'Гидравлический ручник' },
        { key: 'bucketSeats', cls: 'color-purple', icon: 'fa-chair', label: 'Ковши', desc: 'Спортивные ковши' },
        { key: 'dragSlicks', cls: 'color-amber', icon: 'fa-circle-notch', label: 'Слики', desc: 'Драговые полуслики' },
        { key: 'rollCage', cls: 'color-cyan', icon: 'fa-shield', label: 'Каркас', desc: 'Вварной каркас безопасности' },
        { key: 'exhaust', cls: 'color-amber', icon: 'fa-volume-high', label: 'Выхлоп', desc: 'Прямоточный выхлоп' },
        { key: 'stance', cls: 'color-purple', icon: 'fa-arrows-down-to-line', label: 'Пневма', desc: 'Пневмоподвеска' },
        { key: 'customWheels', cls: 'color-green', icon: 'fa-compact-disc', label: 'Ковка', desc: 'Кованые диски' },
        { key: 'bodykit', cls: 'color-cyan', icon: 'fa-car-side', label: 'Обвес', desc: 'Кастомный обвес' },
        { key: 'tinted', cls: 'color-dark', icon: 'fa-circle', label: 'Тонировка', desc: 'Тонировка в круг' }
    ];

    simpleModsMap.forEach(m => {
        if (t[m.key]) {
            badges.push(`<span class="mod-pill ${m.cls}" title="${m.desc}"><i class="fa-solid ${m.icon}"></i> ${m.label}</span>`);
        }
    });

    if (car.isPolished) badges.push(`<span class="mod-pill color-cyan" title="Полировка кузова"><i class="fa-solid fa-sparkles"></i> Блеск</span>`);
    if (car.cleanInterior) badges.push(`<span class="mod-pill color-green" title="Химчистка салона"><i class="fa-solid fa-spray-can"></i> Химчистка</span>`);
    if (car.isRepainted) badges.push(`<span class="mod-pill color-green" title="Свежий облив"><i class="fa-solid fa-paint-roller"></i> Облив</span>`);
    if (car.hasAdditive) badges.push(`<span class="mod-pill color-amber" title="Присадка в моторе"><i class="fa-solid fa-flask"></i> Присадка</span>`);
    if (car.rolledOdometer) badges.push(`<span class="mod-pill color-red" title="Скрученный одометр"><i class="fa-solid fa-clock-rotate-left"></i> Скручен</span>`);

    return badges.length > 0 ? badges.join(' ') : `<span class="stock-badge-pill"><i class="fa-solid fa-car"></i> Заводской сток</span>`;
}

Object.assign(window, {
    INSURANCE_CONFIG,
    TUNING_CONFIG,
    getPlayerHousingCapabilities,
    checkPlayerCapability,
    playerHasGarageOrWorkshop,
    recalculateCarMarketValue,
    renderCarModsBadges
});
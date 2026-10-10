// ========================================================
// js/syndicate.js — ЗАКАЗЫ СИНДИКАТА, P2P БИРЖА, НОМЕРА, ТОП (v0.4.5)
// Полная связка с динамической оценкой авто и блатными номерами
// ========================================================

let p2pActiveFilter = 'cars';
let p2pNewListingType = 'car';
let activeContractForCarSelect = null;

function renderSyndicateHub() {
    let subTab = state.syndicateSubTab ? state.syndicateSubTab : 'contracts';
    switchSyndicateTab(subTab);
}

function switchSyndicateTab(sub) {
    state.syndicateSubTab = sub;
    ['contracts', 'p2p', 'blackmarket', 'clubs', 'leaderboard', 'friends'].forEach(s => {
        const scr = document.getElementById('synScreen-' + s);
        const btn = document.getElementById('synTabBtn-' + s);
        if (scr) scr.style.display = (s === sub) ? 'block' : 'none';
        if (btn) {
            if (s === sub) {
                btn.classList.add('active');
                btn.classList.add('btn-cyan');
                btn.classList.remove('btn-dark');
            } else {
                btn.classList.remove('active');
                btn.classList.remove('btn-cyan');
                btn.classList.add('btn-dark');
            }
        }
    });

    if (sub === 'contracts') renderContracts();
    if (sub === 'p2p') renderP2PListings();
    if (sub === 'blackmarket') renderBlackMarketPlates();
    if (sub === 'clubs') renderClubsList();
    if (sub === 'leaderboard') renderLeaderboard();
    if (sub === 'friends') renderFriendsList();
}

// ========================================================
// 1. ЗАКАЗЫ И КОНТРАКТЫ СИНДИКАТА ПОД КЛЮЧ
// ========================================================
const CONTRACT_TEMPLATES = [
    {
        type: 'vip_escort',
        clientName: "Помощник депутата",
        avatar: "🤵",
        title: "VIP Кортеж / Сопровождение",
        desc: "Требуется строгий представительский авто в идеальном состоянии. Без ДТП, ошибок по ЭБУ и проблем с законом.",
        reqs: {
            allowedClasses: ['comfort', 'premium'],
            minPower: 160,
            minCondition: 80,
            noCriminal: true,
            noDefects: true
        },
        rewardBonus: 280000,
        rewardConn: 1,
        rewardXp: 90
    },
    {
        type: 'drift_spec',
        clientName: "Организатор ночных гонок",
        avatar: "🏎️",
        title: "Боевой корч под зимний сезон",
        desc: "Ищем подготовленный заднеприводный кузов с заваркой и выворотом. Мелкие косяки по ЛКП значения не имеют.",
        reqs: {
            allowedClasses: ['economy', 'comfort'],
            minPower: 75,
            minCondition: 40,
            reqWeldedDiff: true,
            reqSteeringAngle: true,
            noCriminal: false,
            noDefects: false
        },
        rewardBonus: 160000,
        rewardConn: 0,
        rewardXp: 70
    },
    {
        type: 'taxi_fleet',
        clientName: "Шеф таксомоторного парка",
        avatar: "🧔‍♂️",
        title: "Срочный выкуп в городской таксопарк",
        desc: "Нужен надёжный городской седан с подтверждённым пробегом до 170k км и живыми агрегатами. Учёт РФ обязателен.",
        reqs: {
            allowedClasses: ['economy', 'comfort'],
            minPower: 85,
            maxMileage: 170000,
            minCondition: 70,
            noCriminal: true,
            noDefects: true
        },
        rewardBonus: 120000,
        rewardConn: 0,
        rewardXp: 55
    },
    {
        type: 'arab_export',
        clientName: "Шейх Мансур (ОАЭ)",
        avatar: "👳‍♂️",
        title: "Экспорт суперкара в Дубай",
        desc: "Срочный заказ на мощный премиум или гиперкар. Требуется идеальный кузов после детейлинга или наличие чипа.",
        reqs: {
            allowedClasses: ['premium', 'hyper'],
            minPower: 300,
            minCondition: 90,
            reqPolishOrChip: true,
            noCriminal: true,
            noDefects: true
        },
        rewardBonus: 950000,
        rewardConn: 2,
        rewardXp: 180
    },
    {
        type: 'chop_guard',
        clientName: "Начальник службы безопасности",
        avatar: "🕶️",
        title: "Машина прикрытия ЧОП",
        desc: "Ищем мощный внедорожник или универсал для группы быстрого реагирования. Мотор от 180 л.с.",
        reqs: {
            allowedClasses: ['comfort', 'premium', 'truck'],
            minPower: 180,
            minCondition: 65,
            noCriminal: true,
            noDefects: false
        },
        rewardBonus: 240000,
        rewardConn: 1,
        rewardXp: 80
    }
];

function generateContracts() {
    state.contracts = [];
    const shuffled = [...CONTRACT_TEMPLATES].sort(() => 0.5 - Math.random());
    const count = Math.min(3, shuffled.length);

    for (let i = 0; i < count; i++) {
        const t = shuffled[i];
        state.contracts.push({
            id: "contract_" + Date.now() + "_" + i,
            ...JSON.parse(JSON.stringify(t)),
            expiresInDays: 3
        });
    }
}

function refreshContractsManual() {
    let cash = state.player?.cash || 0;
    if (cash < 15000) return showToast("Нужно 15,000 ₽ на обновление базы контрактов!");

    state.player.cash -= 15000;
    generateContracts();
    saveState();
    updateHeaderUI();
    renderContracts();
    playSound('tick');
    tgHaptic('success');
    showToast("База заказов Синдиката обновлена (-15,000 ₽)");
}

function renderContracts() {
    const list = document.getElementById('contractsList');
    const lock = document.getElementById('contractsLockCover');
    if (!list) return;

    let lvl = state.player?.level || 1;
    if (lvl < 5) {
        if (lock) lock.style.display = 'block';
        list.innerHTML = '';
        return;
    }
    if (lock) lock.style.display = 'none';

    if (!state.contracts || state.contracts.length === 0) {
        generateContracts();
        saveState();
    }

    let html = "";
    state.contracts.forEach((c) => {
        let reqs = c.reqs;
        let classesText = reqs.allowedClasses.map(cl => cl.toUpperCase()).join(' / ');
        
        let extraReqs = [];
        extraReqs.push(`Класс: <b>${classesText}</b>`);
        extraReqs.push(`Мин. мощность: <b>${reqs.minPower} л.с.</b>`);
        extraReqs.push(`Состояние кузова: <b>≥${reqs.minCondition}%</b>`);
        if (reqs.maxMileage) extraReqs.push(`Пробег: <b>до ${reqs.maxMileage.toLocaleString()} км</b>`);
        if (reqs.reqWeldedDiff) extraReqs.push(`Заварка: <b>Обязательна</b>`);
        if (reqs.reqSteeringAngle) extraReqs.push(`Выворот: <b>Обязателен</b>`);
        if (reqs.reqPolishOrChip) extraReqs.push(`Полировка или Chip: <b>Да</b>`);
        if (reqs.noCriminal) extraReqs.push(`Юр. чистота: <b>Без розыска и 12.5.1</b>`);
        if (reqs.noDefects) extraReqs.push(`ЭБУ: <b>Без скрытых дефектов</b>`);

        let bonusBadges = `<span class='tag-badge bg-tag-green font-bold'>+${c.rewardBonus.toLocaleString()} ₽ премия</span>`;
        if (c.rewardConn > 0) bonusBadges += ` <span class='tag-badge bg-tag-purple font-bold'>+${c.rewardConn} 🤝</span>`;
        bonusBadges += ` <span class='tag-badge bg-tag-cyan font-bold'>+${c.rewardXp} XP</span>`;

        html += `
        <div class="glass-card mb-3 p-3">
            <div class="flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <div class="chat-avatar-circle" style="font-size:22px;">${c.avatar}</div>
                    <div>
                        <b class="text-xs color-cyan">${c.clientName}</b>
                        <div class="sub-label" style="font-size:9px;">Заказчик Синдиката</div>
                    </div>
                </div>
                <span class="tag-badge bg-tag-amber">АКТИВЕН</span>
            </div>

            <h4 class="font-bold mb-1" style="font-size:13px;">${c.title}</h4>
            <p class="sub-label mb-2" style="font-size:10px; line-height:1.4;">${c.desc}</p>

            <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                <div class="text-xs color-amber font-bold mb-1">Требования к автомобилю:</div>
                <div class="sub-label" style="font-size:10px; line-height:1.5;">
                    ${extraReqs.join(' • ')}
                </div>
            </div>

            <div class="flex-between mb-2">
                <div class="text-xs sub-label">Награда за сдачу:</div>
                <div style="text-align:right;">${bonusBadges}</div>
            </div>

            <button onclick="openSelectContractCarModal('${c.id}')" class="btn btn-cyan btn-sm w-full">
                <i class="fa-solid fa-car-side"></i> Подобрать авто из гаража
            </button>
        </div>`;
    });

    list.innerHTML = html;
}

// ----------------------------------------------------
// ВЫБОР И СДАЧА АВТОМОБИЛЯ ПОД КОНТРАКТ
// ----------------------------------------------------
function checkCarMeetsContract(car, c) {
    if (!car || !c) return { passed: false, errors: ["Ошибка данных"] };
    let reqs = c.reqs;
    let errors = [];

    let carType = car.type || 'economy';
    if (!reqs.allowedClasses.includes(carType)) {
        errors.push(`Не тот класс (${carType.toUpperCase()} вместо ${reqs.allowedClasses.join('/')})`);
    }

    let power = car.power || 100;
    if (power < reqs.minPower) {
        errors.push(`Слабый мотор (${power}/${reqs.minPower} л.с.)`);
    }

    let cond = car.condition || 50;
    if (cond < reqs.minCondition) {
        errors.push(`Плохое состояние кузова (${cond}/${reqs.minCondition}%)`);
    }

    if (reqs.maxMileage && (car.mileage || 0) > reqs.maxMileage) {
        errors.push(`Слишком большой пробег (${(car.mileage || 0).toLocaleString()} км)`);
    }

    if (reqs.reqWeldedDiff && !car.tuning?.weldedDiff) {
        errors.push(`Нет заварки редуктора`);
    }

    if (reqs.reqSteeringAngle && !car.tuning?.steeringAngle) {
        errors.push(`Нет выворота колёс`);
    }

    if (reqs.reqPolishOrChip) {
        let hasPolish = !!car.isPolished;
        let hasChip = !!(car.tuning && car.tuning.chip >= 1);
        if (!hasPolish && !hasChip) {
            errors.push(`Требуется полировка или Chip Stage 1+`);
        }
    }

    if (reqs.noCriminal) {
        if (car.isStolen) errors.push(`Авто числится в розыске`);
        if (car.unregistered) errors.push(`Учёт аннулирован по 12.5.1`);
    }

    if (reqs.noDefects && car.hiddenDefect) {
        errors.push(`Горит чек: ${car.hiddenDefect.text}`);
    }

    if (car.isPersonal) {
        errors.push(`Это ваш личный автомобиль (снимите статус в гараже)`);
    }

    return {
        passed: errors.length === 0,
        errors: errors
    };
}

function openSelectContractCarModal(contractId) {
    activeContractForCarSelect = contractId;
    const contract = (state.contracts || []).find(c => c.id === contractId);
    if (!contract) return;

    const infoEl = document.getElementById('contractTargetInfo');
    const listEl = document.getElementById('contractCarsSelectList');
    if (!infoEl || !listEl) return;

    infoEl.innerHTML = `Контракт: <b>${contract.title}</b> (${contract.clientName})`;

    if (!state.garage || state.garage.length === 0) {
        listEl.innerHTML = `<div class="glass-card text-center sub-label py-6">В гараже нет ни одного автомобиля!</div>`;
    } else {
        let html = "";
        state.garage.forEach((car, idx) => {
            if (typeof recalculateCarMarketValue === 'function') {
                recalculateCarMarketValue(car);
            }

            const check = checkCarMeetsContract(car, contract);
            let cImg = car.img || "assets/cars/economy/vaz-2107.jpg";
            let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
            let basePayout = (car.marketValue || car.basePrice || 100000) + contract.rewardBonus;

            let statusBlock = check.passed
                ? `<div class="color-green text-xs font-bold mb-1">✓ Полностью соответствует всем требованиям!</div>
                   <div class="sub-label mb-2" style="font-size:10px;">Итоговая выплата с учётом авто и номеров: <b class="color-green">+${basePayout.toLocaleString()} ₽</b></div>
                   <button onclick="fulfillContract('${contract.id}', ${idx})" class="btn btn-green btn-sm w-full">Сдать автомобиль под контракт 🤝</button>`
                : `<div class="color-red text-xs font-bold mb-1">✗ Не подходит:</div>
                   <div class="sub-label color-red mb-2" style="font-size:9.5px; line-height:1.3;">${check.errors.join('<br>')}</div>
                   <button class="btn btn-dark btn-sm w-full opacity-50" disabled>Не соответствует условиям</button>`;

            html += `
            <div class="glass-card p-2 mb-2" style="border-color:${check.passed ? 'var(--green)' : 'var(--border-glass)'};">
                <div class="deal-car-preview-card mb-2">
                    <img src="${cImg}" class="deal-car-thumb" onerror="this.src='assets/cars/economy/vaz-2107.jpg'">
                    <div style="flex:1;">
                        <b class="text-xs">${car.name}</b>
                        <div class="sub-label" style="font-size:9.5px;">${car.power || 100} л.с. | ${car.condition || 80}% | ${(car.mileage || 85000).toLocaleString()} км</div>
                        <div class="license-plate text-xs mt-1" style="padding:1px 4px;">${cPlate}</div>
                    </div>
                </div>
                ${statusBlock}
            </div>`;
        });
        listEl.innerHTML = html;
    }

    const modal = document.getElementById('modalSelectContractCar');
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function fulfillContract(contractId, carIndex) {
    const cIdx = (state.contracts || []).findIndex(c => c.id === contractId);
    if (cIdx === -1) return;
    const contract = state.contracts[cIdx];
    const car = state.garage ? state.garage[carIndex] : null;
    if (!car) return;

    if (typeof recalculateCarMarketValue === 'function') {
        recalculateCarMarketValue(car);
    }

    let carPrice = car.marketValue || car.basePrice || 100000;
    let totalPayout = carPrice + contract.rewardBonus;

    state.garage.splice(carIndex, 1);

    state.player.cash = (state.player.cash || 0) + totalPayout;
    if (contract.rewardConn > 0) {
        state.player.connections = (state.player.connections || 0) + contract.rewardConn;
    }
    addXp(contract.rewardXp || 60);

    if (!state.player.stats) state.player.stats = {};
    state.player.stats.sold = (state.player.stats.sold || 0) + 1;
    let netGain = contract.rewardBonus;
    state.player.stats.totalNetProfit = (state.player.stats.totalNetProfit || 0) + netGain;

    state.contracts.splice(cIdx, 1);

    closeModal('modalSelectContractCar');
    saveState();
    updateHeaderUI();
    renderContracts();
    if (typeof renderGarage === 'function') renderGarage();

    playSound('win');
    tgHaptic('success');
    spawnFloatingReward(`+${totalPayout.toLocaleString()} ₽`);
    openVerdictModal(
        "КОНТРАКТ СИНДИКАТА ЗАКРЫТ! 🤝",
        `Клиент «${contract.clientName}» остался крайне доволен поставкой «${car.name}».\nВыплата: +${totalPayout.toLocaleString()} ₽ (Премия: +${contract.rewardBonus.toLocaleString()} ₽)\nПолучено: +${contract.rewardXp} XP ${contract.rewardConn ? `и +${contract.rewardConn} 🤝` : ''}`,
        true,
        totalPayout,
        netGain
    );
}

// ----------------------------------------------------
// 2. P2P БИРЖА ТЕХНИКИ И НОМЕРОВ
// ----------------------------------------------------
function filterP2P(type) {
    p2pActiveFilter = type;
    ['cars', 'plates', 'business', 'housing'].forEach(t => {
        const btn = document.getElementById('p2pFilter-' + t);
        if (btn) {
            btn.className = (t === type) ? 'btn btn-cyan btn-sm' : 'btn btn-dark btn-sm';
        }
    });
    renderP2PListings();
}

function renderP2PListings() {
    const list = document.getElementById('p2pItemsList');
    if (!list) return;

    if (!state.p2pMarketListings || state.p2pMarketListings.length === 0) {
        state.p2pMarketListings = [
            { 
                id: "p2p_1", seller: "Maga_GTI", type: "car", name: "VW Golf VI GTI (Stage 2)", 
                price: 1850000, plate: "О777ОО 77", power: 260, img: "assets/cars/comfort/golf6.jpg",
                originalCarObj: { condition: 85, wear: {engine: 80, transmission: 75}, tuning: {chip: 2, exhaust: true, stance: false, bodykit: false} }
            },
            { id: "p2p_2", seller: "Major_Vova", type: "plate", name: "Госномер А777АА 77", price: 1500000, plate: "А777АА 77" },
            { 
                id: "p2p_3", seller: "Serega_Drift", type: "car", name: "ВАЗ-2107 (Корч)", 
                price: 250000, plate: "В123ВВ 77", power: 85, img: "assets/cars/economy/vaz-2107.jpg",
                originalCarObj: { condition: 60, wear: {engine: 50, transmission: 40}, tuning: {chip: 0, exhaust: true, stance: false, bodykit: false, weldedDiff: true, steeringAngle: true, hydroHandbrake: true} }
            },
            { id: "p2p_4", seller: "Bumer_Boy", type: "plate", name: "Госномер В001ОР 777", price: 950000, plate: "В001ОР 777" },
            {
                id: "p2p_5", seller: "Oligarch_Vova", type: "business", name: "Автомойка 24/7 (Ур. 3)",
                bizId: "wash", bizLevel: 3, price: 320000, desc: "Готовая точка с доходностью 2,700 ₽/д."
            },
            {
                id: "p2p_6", seller: "Maksim_Realtor", type: "housing", name: "Кирпичный гараж с ямой",
                houseId: "garage", price: 2600000, desc: "В собственности, вместимость +3 машиноместа."
            }
        ];
    }

    let filtered = state.p2pMarketListings.filter(item => item.type === p2pActiveFilter);

    if (filtered.length === 0) {
        list.innerHTML = "<div class='glass-card text-center sub-label py-6'>В этой категории биржи пока нет активных лотов.</div>";
        return;
    }

    let html = "";
    filtered.forEach(item => {
        let isMyListing = (state.myP2PListings && state.myP2PListings.includes(item.id));
        let btnAction = isMyListing 
            ? "<button onclick=\"cancelP2PListing('" + item.id + "')\" class='btn btn-danger btn-auto btn-sm'>Снять с биржи</button>"
            : "<button onclick=\"buyP2PListing('" + item.id + "')\" class='btn btn-green btn-auto btn-sm'>Купить (" + item.price.toLocaleString() + " ₽)</button>";

        if (item.type === 'car') {
            let carImg = item.img ? item.img : "assets/cars/economy/vaz-2107.jpg";
            let tuneBadges = "";
            let t = item.originalCarObj?.tuning;
            if (t) {
                if (t.chip > 0) tuneBadges += "<span class='tag-badge bg-tag-purple mx-1'>STG " + t.chip + "</span>";
                if (t.stance) tuneBadges += "<span class='tag-badge bg-tag-amber mx-1'>ПНЕВМА</span>";
                if (t.weldedDiff) tuneBadges += "<span class='tag-badge bg-tag-red mx-1'>ДРИФТ</span>";
            }

            html += 
            "<div class='glass-card mb-2'>" +
                "<div class='flex-between mb-2'>" +
                    "<div class='flex-gap' style='align-items:center;'>" +
                        "<div class='chat-avatar-circle' style='width:28px; height:28px; font-size:14px;'>👤</div>" +
                        "<div><b class='text-xs color-cyan'>" + item.seller + "</b><div class='sub-label' style='font-size:9px;'>Продавец авто</div></div>" +
                    "</div>" +
                    "<span class='tag-badge bg-tag-cyan'>АВТО P2P</span>" +
                "</div>" +
                "<div class='deal-car-preview-card mb-2'>" +
                    "<img src='" + carImg + "' class='deal-car-thumb' onerror=\"this.src='assets/cars/economy/vaz-2107.jpg'\">" +
                    "<div style='flex:1;'>" +
                        "<div class='font-bold text-xs'>" + item.name + "</div>" +
                        "<div class='license-plate text-xs' style='padding:1px 4px; margin:4px 0;'>" + item.plate + "</div>" +
                        "<div class='price-val text-xs color-green'>" + item.price.toLocaleString() + " ₽</div>" +
                    "</div>" +
                "</div>" +
                "<div class='flex-between'>" +
                    "<div>" +
                        "<div class='sub-label text-xs'>Мощность: " + (item.power || 100) + " л.с.</div>" +
                        "<div class='mt-1'>" + tuneBadges + "</div>" +
                    "</div>" +
                    btnAction +
                "</div>" +
            "</div>";
        } else if (item.type === 'plate') {
            html += 
            "<div class='glass-card p-2 flex-between mb-2'>" +
                "<div>" +
                    "<div class='license-plate mb-1' style='font-size:14px;'>" + item.plate + " <div class='license-flag'>RUS</div></div>" +
                    "<div class='sub-label text-xs'>Продавец: <b class='color-cyan'>" + item.seller + "</b></div>" +
                "</div>" +
                "<div class='text-right'>" +
                    "<div class='price-val text-xs color-green mb-1'>" + item.price.toLocaleString() + " ₽</div>" +
                    btnAction +
                "</div>" +
            "</div>";
        } else if (item.type === 'business') {
            html += 
            "<div class='glass-card p-2 flex-between mb-2'>" +
                "<div>" +
                    "<b class='text-xs color-green'><i class='fa-solid fa-briefcase'></i> " + item.name + "</b>" +
                    "<div class='sub-label' style='font-size:10px;'>Продавец: <b>" + item.seller + "</b> | " + (item.desc || '') + "</div>" +
                "</div>" +
                "<div class='text-right'>" +
                    "<div class='price-val text-xs color-green mb-1'>" + item.price.toLocaleString() + " ₽</div>" +
                    btnAction +
                "</div>" +
            "</div>";
        } else if (item.type === 'housing') {
            html += 
            "<div class='glass-card p-2 flex-between mb-2'>" +
                "<div>" +
                    "<b class='text-xs color-cyan'><i class='fa-solid fa-house'></i> " + item.name + "</b>" +
                    "<div class='sub-label' style='font-size:10px;'>Продавец: <b>" + item.seller + "</b> | " + (item.desc || '') + "</div>" +
                "</div>" +
                "<div class='text-right'>" +
                    "<div class='price-val text-xs color-green mb-1'>" + item.price.toLocaleString() + " ₽</div>" +
                    btnAction +
                "</div>" +
            "</div>";
        }
    });

    list.innerHTML = html;
}

function openCreateListingModal() {
    selectP2PListingType('car');
    const modal = document.getElementById('modalCreateP2P');
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function selectP2PListingType(type) {
    p2pNewListingType = type;
    const btnCar = document.getElementById('btnP2PTypeCar');
    const btnPlate = document.getElementById('btnP2PTypePlate');
    const btnBiz = document.getElementById('btnP2PTypeBiz');
    const btnHouse = document.getElementById('btnP2PTypeHouse');
    const select = document.getElementById('p2pItemSelect');

    [
        { id: 'car', el: btnCar },
        { id: 'plate', el: btnPlate },
        { id: 'business', el: btnBiz },
        { id: 'housing', el: btnHouse }
    ].forEach(b => {
        if (b.el) b.el.className = (b.id === type) ? 'btn btn-cyan btn-sm' : 'btn btn-dark btn-sm';
    });

    let opts = "";

    if (type === 'car') {
        if (state.garage && state.garage.length > 0) {
            state.garage.forEach((c, i) => {
                let isBlocked = c.impounded || c.unregistered || c.isStolen || c.isPersonal;
                let cPlate = c.customPlate || c.plate || "ТРАНЗИТ";
                if (!isBlocked) {
                    opts += "<option value='car_" + i + "'>" + c.name + " (" + cPlate + ")</option>";
                }
            });
        }
        if (!opts) opts = "<option value=''>Нет чистых авто в гараже (или они личные)</option>";
    } else if (type === 'plate') {
        if (state.ownedPlates && state.ownedPlates.length > 0) {
            state.ownedPlates.forEach((p, i) => {
                opts += "<option value='plate_" + i + "'>" + p + "</option>";
            });
        }
        if (!opts) opts = "<option value=''>Нет свободных номеров в инвентаре</option>";
    } else if (type === 'business') {
        if (state.businesses && state.businesses.length > 0) {
            state.businesses.forEach((b) => {
                if (b.level > 0) {
                    opts += "<option value='biz_" + b.id + "'>" + b.name + " (Ур. " + b.level + ")</option>";
                }
            });
        }
        if (!opts) opts = "<option value=''>Нет выкупленных предприятий</option>";
    } else if (type === 'housing') {
        let owned = state.player?.ownedHouses || [];
        if (owned.length > 0 && typeof HOUSING_LIST !== 'undefined') {
            owned.forEach(hId => {
                const h = HOUSING_LIST.find(item => item.id === hId);
                if (h) opts += "<option value='house_" + h.id + "'>" + h.name + "</option>";
            });
        }
        if (!opts) opts = "<option value=''>Нет жилья в собственности</option>";
    }

    if (select) select.innerHTML = opts;
    onP2PItemSelected(select ? select.value : '');
}

function onP2PItemSelected(val) {
    const input = document.getElementById('p2pPriceInput');
    if (!input || !val) return;

    if (val.startsWith('car_')) {
        let idx = parseInt(val.replace('car_', ''));
        let car = state.garage[idx];
        if (car) {
            if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);
            input.value = car.marketValue || car.price || 150000;
        }
    } else if (val.startsWith('plate_')) {
        let idx = parseInt(val.replace('plate_', ''));
        let plate = state.ownedPlates[idx];
        if (plate && typeof calculatePlateValue === 'function') {
            input.value = calculatePlateValue(plate);
        }
    } else if (val.startsWith('biz_')) {
        let bId = val.replace('biz_', '');
        let biz = (state.businesses || []).find(b => b.id === bId);
        if (biz) input.value = Math.round(biz.cost * (biz.level || 1));
    } else if (val.startsWith('house_')) {
        let hId = val.replace('house_', '');
        let h = (typeof HOUSING_LIST !== 'undefined') ? HOUSING_LIST.find(item => item.id === hId) : null;
        if (h) input.value = h.buyPrice || 1000000;
    }
}

function confirmCreateP2PListing() {
    const select = document.getElementById('p2pItemSelect');
    const input = document.getElementById('p2pPriceInput');
    if (!select || !input) return;

    const val = select.value;
    const price = parseInt(input.value);

    if (!val) return showToast("Выберите предмет для продажи!");
    if (isNaN(price) || price <= 0) return showToast("Укажите корректную стоимость в рублях!");

    let sellerName = (state.player && state.player.name) ? state.player.name : "Вы";

    if (val.startsWith('car_')) {
        let idx = parseInt(val.replace('car_', ''));
        let car = state.garage[idx];
        if (!car) return;

        state.garage.splice(idx, 1);
        let listingId = "p2p_lot_" + Date.now();

        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        state.p2pMarketListings.unshift({
            id: listingId,
            seller: sellerName,
            type: "car",
            name: car.name,
            price: price,
            plate: car.customPlate || car.plate || "ТРАНЗИТ",
            power: car.power || 100,
            img: car.img,
            originalCarObj: car
        });

        if (!state.myP2PListings) state.myP2PListings = [];
        state.myP2PListings.push(listingId);
    } else if (val.startsWith('plate_')) {
        let idx = parseInt(val.replace('plate_', ''));
        let plate = state.ownedPlates[idx];
        if (!plate) return;

        state.ownedPlates.splice(idx, 1);
        let listingId = "p2p_lot_" + Date.now();

        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        state.p2pMarketListings.unshift({
            id: listingId,
            seller: sellerName,
            type: "plate",
            name: "Госномер " + plate,
            price: price,
            plate: plate
        });

        if (!state.myP2PListings) state.myP2PListings = [];
        state.myP2PListings.push(listingId);
    } else if (val.startsWith('biz_')) {
        let bId = val.replace('biz_', '');
        let biz = (state.businesses || []).find(b => b.id === bId);
        if (!biz || biz.level <= 0) return;

        let listingId = "p2p_lot_" + Date.now();
        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        state.p2pMarketListings.unshift({
            id: listingId,
            seller: sellerName,
            type: "business",
            name: `${biz.name} (Ур. ${biz.level})`,
            bizId: biz.id,
            bizLevel: biz.level,
            price: price,
            desc: `Готовая точка с доходностью ${((biz.income || 0) * biz.level).toLocaleString()} ₽/д.`
        });

        if (!state.myP2PListings) state.myP2PListings = [];
        state.myP2PListings.push(listingId);

        biz.level = 0;
        biz.stock = 0;
        biz.stored = 0;
    } else if (val.startsWith('house_')) {
        let hId = val.replace('house_', '');
        let h = (typeof HOUSING_LIST !== 'undefined') ? HOUSING_LIST.find(item => item.id === hId) : null;
        if (!h) return;

        let listingId = "p2p_lot_" + Date.now();
        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        state.p2pMarketListings.unshift({
            id: listingId,
            seller: sellerName,
            type: "housing",
            name: h.name,
            houseId: h.id,
            price: price,
            desc: `Недвижимость в собственности. Гараж на +${h.slots} мест.`
        });

        if (!state.myP2PListings) state.myP2PListings = [];
        state.myP2PListings.push(listingId);

        state.player.ownedHouses = (state.player.ownedHouses || []).filter(id => id !== hId);
        if (state.player.housingId === hId) {
            state.player.housingId = 'room';
            state.player.housingType = 'rent';
        }
    }

    saveState();
    closeModal('modalCreateP2P');
    if (typeof renderGarage === 'function') renderGarage();
    renderP2PListings();
    playSound('win');
    tgHaptic('success');
    showToast("Лот успешно выставлен на онлайн P2P биржу!");
}

function buyP2PListing(listingId) {
    if (!state.p2pMarketListings) return;
    const idx = state.p2pMarketListings.findIndex(l => l.id === listingId);
    if (idx === -1) return;
    const lot = state.p2pMarketListings[idx];

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < lot.price) return showToast("Не хватает денег для выкупа лота с биржи!");

    if (lot.type === 'car') {
        let maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
        let curSlots = (state.garage && state.garage.length) ? state.garage.length : 0;
        if (curSlots >= maxSlots) return showToast("В гараже нет свободного места!");

        state.player.cash -= lot.price;
        
        let carObj = lot.originalCarObj ? Object.assign({}, lot.originalCarObj) : {
            id: "car_p2p_" + Date.now(),
            name: lot.name,
            power: lot.power || 100,
            type: "comfort",
            price: lot.price,
            img: lot.img,
            plate: lot.plate,
            customPlate: lot.plate,
            condition: 90,
            wear: { engine: 90, transmission: 90 },
            tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }
        };
        
        carObj.purchaseCost = lot.price;
        if (typeof recalculateCarMarketValue === 'function') {
            recalculateCarMarketValue(carObj);
        }

        if (!state.garage) state.garage = [];
        state.garage.push(carObj);
    } else if (lot.type === 'plate') {
        state.player.cash -= lot.price;
        if (!state.ownedPlates) state.ownedPlates = [];
        state.ownedPlates.push(lot.plate);
    } else if (lot.type === 'business') {
        state.player.cash -= lot.price;
        let targetBiz = (state.businesses || []).find(b => b.id === lot.bizId);
        if (targetBiz) {
            targetBiz.level = Math.max(targetBiz.level || 0, lot.bizLevel || 1);
            targetBiz.stock = 100;
        }
    } else if (lot.type === 'housing') {
        state.player.cash -= lot.price;
        if (!state.player.ownedHouses) state.player.ownedHouses = [];
        if (!state.player.ownedHouses.includes(lot.houseId)) state.player.ownedHouses.push(lot.houseId);
        state.player.housingId = lot.houseId;
        state.player.housingType = 'own';
    }

    state.p2pMarketListings.splice(idx, 1);
    saveState();
    updateHeaderUI();
    renderP2PListings();
    if (typeof renderGarage === 'function') renderGarage();
    playSound('win');
    tgHaptic('success');
    showToast("Лот успешно выкуплен с P2P биржи!");
}

function cancelP2PListing(listingId) {
    if (!state.p2pMarketListings) return;
    const idx = state.p2pMarketListings.findIndex(l => l.id === listingId);
    if (idx === -1) return;
    const lot = state.p2pMarketListings[idx];

    if (lot.type === 'car') {
        let maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
        let curSlots = (state.garage && state.garage.length) ? state.garage.length : 0;
        if (curSlots >= maxSlots) return showToast("В гараже нет свободного места под возврат авто!");

        let carObj = lot.originalCarObj ? Object.assign({}, lot.originalCarObj) : {
            id: "car_p2p_" + Date.now(),
            name: lot.name,
            power: lot.power || 100,
            type: "comfort",
            price: lot.price,
            img: lot.img,
            plate: lot.plate,
            customPlate: lot.plate,
            condition: 85,
            tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }
        };

        if (typeof recalculateCarMarketValue === 'function') {
            recalculateCarMarketValue(carObj);
        }

        if (!state.garage) state.garage = [];
        state.garage.push(carObj);
    } else if (lot.type === 'plate') {
        if (!state.ownedPlates) state.ownedPlates = [];
        state.ownedPlates.push(lot.plate);
    } else if (lot.type === 'business') {
        let targetBiz = (state.businesses || []).find(b => b.id === lot.bizId);
        if (targetBiz) {
            targetBiz.level = lot.bizLevel || 1;
            targetBiz.stock = 100;
        }
    } else if (lot.type === 'housing') {
        if (!state.player.ownedHouses) state.player.ownedHouses = [];
        if (!state.player.ownedHouses.includes(lot.houseId)) state.player.ownedHouses.push(lot.houseId);
    }

    state.p2pMarketListings.splice(idx, 1);
    if (state.myP2PListings) {
        state.myP2PListings = state.myP2PListings.filter(id => id !== listingId);
    }

    saveState();
    renderP2PListings();
    if (typeof renderGarage === 'function') renderGarage();
    showToast("Лот снят с продажи и возвращён в инвентарь.");
}

// ----------------------------------------------------
// 3. ТЕНЕВОЙ РЫНОК НОМЕРОВ (BLACK MARKET)
// ----------------------------------------------------
function generateBlackMarketPlates() {
    const rareRegions = ['77', '99', '97', '777', '199', '177'];
    const rareLetters = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];
    
    let generated = [];
    
    for (let i = 0; i < 4; i++) {
        let l1 = rareLetters[Math.floor(Math.random() * rareLetters.length)];
        let l2 = rareLetters[Math.floor(Math.random() * rareLetters.length)];
        let l3 = rareLetters[Math.floor(Math.random() * rareLetters.length)];
        let reg = rareRegions[Math.floor(Math.random() * rareRegions.length)];
        
        let plateType = Math.random();
        let plateStr = "";

        if (plateType < 0.25) {
            plateStr = l1 + l1 + l1 + " " + (Math.floor(Math.random()*899)+100) + " " + reg;
        } else if (plateType < 0.50) {
            const nums = ['111', '222', '333', '444', '555', '666', '888', '999'];
            let n = nums[Math.floor(Math.random() * nums.length)];
            plateStr = l1 + n + l2 + l3 + " " + reg;
        } else if (plateType < 0.75) {
            const eliteNums = ['777', '001', '007'];
            let n = eliteNums[Math.floor(Math.random() * eliteNums.length)];
            plateStr = l1 + n + l1 + l1 + " " + reg;
        } else {
            const specList = ["АМР", "ЕКХ", "СКР", "ВОР"];
            let spec = specList[Math.floor(Math.random() * specList.length)];
            plateStr = spec[0] + (Math.floor(Math.random()*899)+100) + spec[1] + spec[2] + " " + reg;
        }

        let calculatedValue = (typeof calculatePlateValue === 'function') 
            ? calculatePlateValue(plateStr) 
            : 450000;

        let marketPrice = Math.round(calculatedValue * (1.10 + Math.random() * 0.15));

        generated.push({
            id: "bm_plate_" + Date.now() + "_" + i,
            plate: plateStr,
            price: marketPrice
        });
    }

    state.blackMarketPlates = generated;
}

function refreshBlackMarketPlates() {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < 25000) return showToast("Нужно 25,000 ₽ за услуги связи с барыгой!");
    
    state.player.cash -= 25000;
    generateBlackMarketPlates();
    saveState();
    updateHeaderUI();
    renderBlackMarketPlates();
    playSound('tick');
    tgHaptic('success');
    showToast("Список теневых госзнаков обновлен!");
}

function renderBlackMarketPlates() {
    const list = document.getElementById('blackMarketPlatesList');
    if (!list) return;

    if (!state.blackMarketPlates || state.blackMarketPlates.length === 0) {
        generateBlackMarketPlates();
        saveState();
    }

    let html = "";
    state.blackMarketPlates.forEach((item, idx) => {
        let isSuperRare = item.price > 1000000;
        let borderGlow = isSuperRare ? "border: 1px solid var(--purple); box-shadow: 0 0 15px rgba(192, 132, 252, 0.25);" : "";
        let rarityText = isSuperRare ? "<span class='color-purple text-xs font-bold'>ЭКСКЛЮЗИВ</span>" : "<span class='color-amber text-xs'>БЛАТНОЙ</span>";

        html += 
        "<div class='glass-card flex-between p-2 mb-2' style='" + borderGlow + "'>" +
            "<div>" +
                "<div class='license-plate mb-1' style='font-size:15px; padding:4px 8px;'>" + item.plate + " <div class='license-flag'>RUS</div></div>" +
                rarityText +
            "</div>" +
            "<div class='text-right'>" +
                "<div class='price-val text-xs color-green mb-1'>" + item.price.toLocaleString() + " ₽</div>" +
                "<button onclick=\"buyBlackMarketPlate(" + idx + ")\" class='btn " + (isSuperRare ? "btn-purple" : "btn-amber") + " btn-sm btn-auto'>Выкупить</button>" +
            "</div>" +
        "</div>";
    });

    list.innerHTML = html;
}

function buyBlackMarketPlate(idx) {
    const lot = state.blackMarketPlates[idx];
    if (!lot) return;

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < lot.price) return showToast("Не хватает денег на покупку номера!");

    state.player.cash -= lot.price;
    if (!state.ownedPlates) state.ownedPlates = [];
    state.ownedPlates.push(lot.plate);

    state.blackMarketPlates.splice(idx, 1);
    saveState();
    updateHeaderUI();
    renderBlackMarketPlates();
    playSound('win');
    tgHaptic('success');
    openVerdictModal("НОМЕР ПРИОБРЕТЕН! 🏷️", "Госзнак «" + lot.plate + "» добавлен в ваш инвентарь. Можете установить его в Гараже, чтобы повысить стоимость любого автомобиля!", true);
}

// ----------------------------------------------------
// 4. АВТОКЛУБЫ СИНДИКАТА
// ----------------------------------------------------
function renderClubsList() {
    const container = document.getElementById('synClubsContainer');
    const myClubNameEl = document.getElementById('synMyClubName');
    if (!container) return;

    let myClub = (state.player && state.player.club) ? state.player.club : null;
    if (myClubNameEl) {
        myClubNameEl.innerText = myClub ? myClub.name : "Без автоклуба";
    }

    const clubsPool = [
        { id: "club_jdm", name: "JDM Legends Moscow", members: 42, perk: "+10% к оценке японских авто", fee: 100000 },
        { id: "club_vaz", name: "Боевая Классика Клуб", members: 89, perk: "Бесплатный ремонт подвески на сходках", fee: 40000 },
        { id: "club_m", name: "Bavarian Power M", members: 31, perk: "+15% к победе в заездах на 402м", fee: 250000 },
        { id: "club_elite", name: "Синдикат Олигархов", members: 12, perk: "-25% ко всем налогам и проверкам ГИБДД", fee: 1000000 }
    ];

    let html = "";
    clubsPool.forEach(club => {
        let isMember = myClub && myClub.id === club.id;
        let btnContent = isMember 
            ? "<button onclick='leaveClubAction()' class='btn btn-danger btn-auto btn-sm'>Покинуть</button>"
            : "<button onclick=\"joinClubAction('" + club.id + "', '" + club.name + "', " + club.fee + ")\" class='btn btn-cyan btn-auto btn-sm'>Вступить (" + (club.fee / 1000).toFixed(0) + "k ₽)</button>";

        html += 
        "<div class='glass-card p-2 flex-between mb-2'>" +
            "<div>" +
                "<b class='color-cyan text-xs'>" + club.name + "</b>" +
                "<div class='sub-label' style='font-size:10px;'>👥 Участников: " + club.members + " | " + club.perk + "</div>" +
            "</div>" +
            btnContent +
        "</div>";
    });

    container.innerHTML = html;
}

function joinClubAction(clubId, clubName, fee) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < fee) return showToast("Не хватает денег на вступительный взнос!");

    state.player.cash -= fee;
    state.player.club = { id: clubId, name: clubName };
    saveState();
    updateHeaderUI();
    renderClubsList();
    playSound('win');
    tgHaptic('success');
    showToast("Вы вступили в автоклуб «" + clubName + "»!");
}

function leaveClubAction() {
    state.player.club = null;
    saveState();
    updateHeaderUI();
    renderClubsList();
    showToast("Вы покинули автоклуб.");
}

function createClubPrompt() {
    let name = prompt("Введите название нового автоклуба:");
    if (!name || !name.trim()) return;

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < 500000) return showToast("Нужно 500,000 ₽ на регистрацию клуба!");

    state.player.cash -= 500000;
    state.player.club = { id: "club_custom_" + Date.now(), name: name.trim() };
    saveState();
    updateHeaderUI();
    renderClubsList();
    playSound('win');
    tgHaptic('success');
    showToast("Автоклуб «" + name.trim() + "» успешно создан!");
}

// ----------------------------------------------------
// 5. ТОП ПЕРЕКУПОВ (ЛИДЕРБОРД)
// ----------------------------------------------------
function renderLeaderboard() {
    const container = document.getElementById('leaderboardListContainer');
    if (!container) return;

    const leaders = [
        { rank: 1, name: "Илюха DXF", profit: 142500000, lvl: 85, badge: "👑 ОЛИГАРХ" },
        { rank: 2, name: "Святой Максиман", profit: 98400000, lvl: 64, badge: "⚡ ХОЗЯИН РЫНКА" },
        { rank: 3, name: "Серёга Техно", profit: 76100000, lvl: 52, badge: "🔧 ТОП ДЕЛЕЦ" },
        { rank: 4, name: "Жиминка Пендосовская", profit: 54000000, lvl: 41, badge: "🤖 AI ПЕРЕКУП" },
        { 
            rank: 5, 
            name: (state.player && state.player.name) ? state.player.name : "Вы", 
            profit: (state.player && state.player.stats && state.player.stats.totalNetProfit) ? state.player.stats.totalNetProfit : 0, 
            lvl: (state.player && state.player.level) ? state.player.level : 1, 
            badge: "🎯 ВЫ" 
        }
    ];

    let html = "";
    leaders.forEach(lead => {
        let isMe = lead.rank === 5;
        let rankColor = lead.rank === 1 ? "color-amber" : (lead.rank === 2 ? "color-cyan" : (lead.rank === 3 ? "color-purple" : ""));

        html += 
        "<div class='glass-card p-2 flex-between mb-2 " + (isMe ? "border-cyan" : "") + "'>" +
            "<div class='flex-gap' style='align-items:center;'>" +
                "<b class='font-bold " + rankColor + "' style='font-size:14px; min-width:20px;'>#" + lead.rank + "</b>" +
                "<div>" +
                    "<b class='text-xs'>" + lead.name + "</b>" +
                    "<div class='sub-label' style='font-size:10px;'>Ур. " + lead.lvl + " | Чистая прибыль: <span class='color-green font-bold'>" + lead.profit.toLocaleString() + " ₽</span></div>" +
                "</div>" +
            "</div>" +
            "<span class='tag-badge " + (isMe ? "bg-tag-cyan" : "bg-tag-amber") + "'>" + lead.badge + "</span>" +
        "</div>";
    });

    container.innerHTML = html;
}

// ----------------------------------------------------
// 6. РЕФЕРАЛЬНАЯ СЕТЬ (ДРУЗЬЯ В TELEGRAM)
// ----------------------------------------------------
function getReferralLink() {
    let userId = "777";
    try {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
            userId = window.Telegram.WebApp.initDataUnsafe.user.id;
        }
    } catch(e) {}
    return "https://t.me/PerekupSimBot?start=ref_" + userId;
}

function shareReferralLink() {
    const link = getReferralLink();
    const text = "Залетай со мной в «Симулятор Перекупа»! Поднимай кэш на авторынке и собирай гараж мечты.";
    const shareUrl = "https://t.me/share/url?url=" + encodeURIComponent(link) + "&text=" + encodeURIComponent(text);

    try {
        if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(shareUrl);
        } else {
            window.open(shareUrl, '_blank');
        }
    } catch(e) {
        window.open(shareUrl, '_blank');
    }
}

function copyReferralLink() {
    const link = getReferralLink();
    if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
            showToast("Ссылка скопирована в буфер обмена!");
        }).catch(() => {
            fallbackCopyText(link);
        });
    } else {
        fallbackCopyText(link);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.executeCommand('copy');
        showToast("Ссылка скопирована!");
    } catch(err) {
        showToast("Не удалось скопировать.");
    }
    document.body.removeChild(textArea);
}

function renderFriendsList() {
    const container = document.getElementById('friendsListContainer');
    const badge = document.getElementById('friendsCountBadge');
    if (!container) return;

    if (!state.friendsList || state.friendsList.length === 0) {
        state.friendsList = [
            { name: "Артем_BMW", earned: 50000, lvl: 14, date: "Сегодня" },
            { name: "Денис_Vaz", earned: 50000, lvl: 8, date: "Вчера" }
        ];
    }

    if (badge) badge.innerText = state.friendsList.length + " друзей";

    let html = "";
    state.friendsList.forEach(f => {
        html += 
        "<div class='glass-card p-2 flex-between mb-2'>" +
            "<div>" +
                "<b class='text-xs color-cyan'>" + f.name + "</b>" +
                "<div class='sub-label' style='font-size:10px;'>Уровень: " + f.lvl + " | Приглашён: " + f.date + "</div>" +
            "</div>" +
            "<span class='tag-badge bg-tag-green'>+50,000 ₽ получено</span>" +
        "</div>";
    });

    container.innerHTML = html;
}
// ========================================================
// js/syndicate.js — СЕРВИС «ПОДКЛЮЧ», ЗАКАЗЫ И КОНТРАКТЫ (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.0.0 (УБРАНЫ ДУБЛИРУЮЩИЕСЯ ВКЛАДКИ):
//   - В приложении «ПодКлюч» оставлена ТОЛЬКО вкладка «Заказы».
//   - Вкладки Клубы, Топ и Партнёры удалены из UI (код сохранён для M+).
//   - Принудительный state.syndicateSubTab = 'contracts'.
// ⭐ v0.9.0:
//   - checkSyndicateAccessDetails инициализирует unlockedApps.
//   - fulfillContract защищён от двойного клика + ищет машину по uid.
//   - Все close-хендлеры сбрасывают активное состояние.
//   - trackQuestProgress для контрактов ПодКлюч.
// ========================================================

let activeContractForCarSelect = null;
let podklyuchCategoryFilter = 'all'; // 'all', 'sport', 'fleet', 'vip'
let _contractFulfilling = false;

// ========================================================
// ЭКРАН ПРИЛОЖЕНИЯ «ПОДКЛЮЧ» ДЛЯ PEREKUP OS
// ========================================================
const AppSyndicate = {
    render(container) {
        // ⭐ v1.0.0: Принудительно открываем вкладку заказов (других больше нет)
        state.syndicateSubTab = 'contracts';

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-purple"><i class="fa-solid fa-key mr-1"></i> СЕРВИС «ПОДКЛЮЧ»</div>
                <div style="width:40px;"></div>
            </div>
            
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(192,132,252,0.15), #090e18); border-color: var(--purple);">
                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs color-purple"><i class="fa-solid fa-briefcase"></i> Эксклюзивный Подбор «ПодКлюч»</b>
                            <div class="sub-label" style="font-size:9px;">Поставка проверенных авто корпоративным и частным клиентам</div>
                        </div>
                        <button onclick="refreshContractsManual()" class="btn btn-purple btn-auto btn-sm" style="font-size:9px;">Обновить (25k)</button>
                    </div>

                    <!-- ФИЛЬТРЫ РАЗНООБРАЗИЯ КОНТРАКТОВ -->
                    <div class="grid-4 mt-2" style="gap:4px;">
                        <button onclick="filterPodklyuchContracts('all')" id="podFilterBtn-all" class="btn ${podklyuchCategoryFilter === 'all' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">Все</button>
                        <button onclick="filterPodklyuchContracts('sport')" id="podFilterBtn-sport" class="btn ${podklyuchCategoryFilter === 'sport' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">🏎️ Спорт</button>
                        <button onclick="filterPodklyuchContracts('fleet')" id="podFilterBtn-fleet" class="btn ${podklyuchCategoryFilter === 'fleet' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">🚕 Парк</button>
                        <button onclick="filterPodklyuchContracts('vip')" id="podFilterBtn-vip" class="btn ${podklyuchCategoryFilter === 'vip' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">👑 VIP</button>
                    </div>
                </div>

                <!-- КОНТЕЙНЕР ЗАКАЗОВ -->
                <div id="contractsLockCover" style="display:none;"></div>
                <div id="contractsList"></div>
            </div>
        `;

        // Сразу рендерим контракты
        renderContracts();
    }
};

window.AppPodklyuch = AppSyndicate;
window.AppSyndicate = AppSyndicate;

// Оставили функцию для совместимости, но она больше не переключает невидимые вкладки
function renderSyndicateHub() {
    renderContracts();
}

// Оставили функцию для совместимости, но она больше не переключает невидимые вкладки
function switchSyndicateTab(sub) {
    if (sub !== 'contracts') return;
    renderContracts();
}

function filterPodklyuchContracts(filter) {
    podklyuchCategoryFilter = filter;
    ['all', 'sport', 'fleet', 'vip'].forEach(f => {
        const btn = document.getElementById('podFilterBtn-' + f);
        if (btn) btn.className = (f === filter) ? 'btn btn-cyan btn-sm' : 'btn btn-dark btn-sm';
    });
    renderContracts();
    if (typeof playSound === 'function') playSound('tick');
}

// ========================================================
// 1. ПОДБОР КОНТРАКТОВ ПОД УРОВНИ И КЛАССЫ
// ========================================================
function getUnlockedCategoriesForPlayer(lvl) {
    let list = ['economy', 'scooter'];
    if (lvl >= 4) list.push('moto');
    if (lvl >= 7) list.push('atv');
    if (lvl >= 10) list.push('comfort');
    if (lvl >= 25) list.push('premium');
    if (lvl >= 45) list.push('hyper', 'truck');
    if (lvl >= 85) list.push('yacht');
    return list;
}

function checkSyndicateAccessDetails() {
    // safe-init
    if (!state.player) state.player = {};
    if (!Array.isArray(state.player.unlockedApps)) state.player.unlockedApps = [];

    let playerLvl = state.player?.level || 1;
    let cash = state.player?.cash || 0;
    let tools = state.player?.tools || {};
    let unlocked = state.player.unlockedApps;

    const cfg = window.APP_ACCESS_CONFIG?.autopodbor_order || {
        minLevel: 6,
        costCash: 500000
    };

    let hasLvl = playerLvl >= cfg.minLevel;
    let hasLicense = unlocked.includes('autopodbor_order');
    let hasLaunch = !!(tools.obd_launch);
    let hasGauge = !!(tools.gauge || tools.gauge_pro);
    let hasEndoscope = !!(tools.endoscope);
    let canAfford = cash >= cfg.costCash;

    let isFullAccess = hasLvl && hasLicense && hasLaunch;

    return {
        isFullAccess,
        hasLvl,
        hasLicense,
        hasLaunch,
        hasGauge,
        hasEndoscope,
        canAfford,
        lvl: playerLvl,
        reqLvl: cfg.minLevel,
        costCash: cfg.costCash
    };
}

function unlockPodklyuchLicenseAction() {
    const access = checkSyndicateAccessDetails();
    if (!access.hasLvl) {
        return showToast(`Лицензия доступна только с ${access.reqLvl} уровня авторитета!`);
    }
    if (!access.canAfford) {
        return showToast(`Не хватает денег на лицензию! Нужно: ${access.costCash.toLocaleString()} ₽`);
    }

    state.player.cash -= access.costCash;
    if (!state.player.unlockedApps) state.player.unlockedApps = [];
    if (!state.player.unlockedApps.includes('autopodbor_order')) {
        state.player.unlockedApps.push('autopodbor_order');
    }

    if (typeof logBankTransaction === 'function') {
        logBankTransaction("Лицензия «ПодКлюч»", access.costCash, false);
    }

    saveState();
    updateHeaderUI();
    renderContracts();
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    showToast("Лицензия «ПодКлюч» оформлена! Доступ к заказам открыт.");
}

function generateContracts() {
    state.contracts = [];
    const pool = (typeof PODKLYUCH_CONTRACT_TEMPLATES !== 'undefined')
        ? PODKLYUCH_CONTRACT_TEMPLATES
        : ((typeof SYNDICATE_CONTRACT_TEMPLATES !== 'undefined') ? SYNDICATE_CONTRACT_TEMPLATES : []);

    if (!Array.isArray(pool) || pool.length === 0) {
        console.warn("[Syndicate] Нет шаблонов контрактов");
        return;
    }

    let playerLvl = state.player?.level || 1;
    let unlockedCats = getUnlockedCategoriesForPlayer(playerLvl);

    let matchedPool = pool.filter(t => {
        if (!t || !t.reqs || !Array.isArray(t.reqs.allowedClasses)) return false;
        let minLvl = t.minPlayerLevel || 6;
        let maxLvl = t.maxPlayerLevel || 100;
        let lvlOk = playerLvl >= minLvl && playerLvl <= maxLvl;
        let hasUnlockedClass = t.reqs.allowedClasses.some(c => unlockedCats.includes(c));
        return lvlOk && hasUnlockedClass;
    });

    if (matchedPool.length === 0) {
        matchedPool = pool.filter(t => t && (t.minPlayerLevel || 6) <= playerLvl);
    }
    if (matchedPool.length === 0) {
        matchedPool = pool.slice(0, 4);
    }

    const shuffled = [...matchedPool].sort(() => 0.5 - Math.random());
    const count = Math.min(4, shuffled.length);

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
    const access = checkSyndicateAccessDetails();
    if (!access.hasLicense) {
        return showToast("Сначала оформите лицензию «ПодКлюч»!");
    }

    let cash = state.player?.cash || 0;
    let cost = 25000;
    if (cash < cost) return showToast(`Нужно ${cost.toLocaleString()} ₽ на обновление базы контрактов!`);

    state.player.cash -= cost;
    generateContracts();
    saveState();
    updateHeaderUI();
    renderContracts();
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    showToast(`Заказы «ПодКлюч» обновлены под ваши возможности (${state.player?.level || 1} ур.)!`);
}

function renderContracts() {
    const list = document.getElementById('contractsList');
    const lock = document.getElementById('contractsLockCover');
    if (!list) return;

    const access = checkSyndicateAccessDetails();

    if (!access.isFullAccess) {
        if (lock) {
            lock.style.display = 'block';

            let licenseBtn = "";
            if (!access.hasLicense) {
                licenseBtn = access.hasLvl
                    ? `<button onclick="unlockPodklyuchLicenseAction()" class="btn btn-green btn-sm w-full mb-2">Оформить лицензию (${access.costCash.toLocaleString()} ₽)</button>`
                    : `<button class="btn btn-dark btn-sm w-full opacity-50 mb-2" disabled>Требуется ${access.reqLvl} уровень</button>`;
            }

            lock.innerHTML = `
                <div class="glass-card text-center p-3 mb-2" style="border: 1px solid var(--purple);">
                    <div style="font-size:32px; margin-bottom:6px;">🔑</div>
                    <h4 class="font-bold color-purple mb-1">Сервис «ПодКлюч» заблокирован</h4>
                    <p class="sub-label mb-2" style="font-size:9.5px;">Для выполнения официальных заказов клиентов требуется подтвердить лицензию эксперта и приборы:</p>
                    <div class="space-y-1 text-left p-2 mb-2" style="background:#090e18; border-radius:8px; font-size:9.5px;">
                        <div class="flex-between"><span>• Авторитет: <b>${access.reqLvl}+ ур</b></span> <b class="${access.hasLvl ? 'color-green' : 'color-red'}">${access.hasLvl ? '✓ Да' : '✗ Нет (' + access.lvl + '/' + access.reqLvl + ')'}</b></div>
                        <div class="flex-between"><span>• Лицензия сервиса (500,000 ₽)</span> <b class="${access.hasLicense ? 'color-green' : 'color-red'}">${access.hasLicense ? '✓ Оплачена' : '✗ Требуется'}</b></div>
                        <div class="flex-between"><span>• Сканер Launch Pro Pad</span> <b class="${access.hasLaunch ? 'color-green' : 'color-red'}">${access.hasLaunch ? '✓ В наличии' : '✗ Купить в Маркете'}</b></div>
                        <div class="flex-between"><span>• Толщиномер ЛКП</span> <b class="${access.hasGauge ? 'color-green' : 'color-amber'}">${access.hasGauge ? '✓ В наличии' : '⚠️ Желателен'}</b></div>
                        <div class="flex-between"><span>• HD Видеоэндоскоп</span> <b class="${access.hasEndoscope ? 'color-green' : 'color-amber'}">${access.hasEndoscope ? '✓ В наличии' : '⚠️ Желателен'}</b></div>
                    </div>
                    ${licenseBtn}
                    <button onclick="PhoneManager.openApp('shop')" class="btn btn-cyan btn-sm w-full">Купить приборы в Маркете</button>
                </div>
            `;
        }
        list.innerHTML = '';
        return;
    }
    if (lock) lock.style.display = 'none';

    // Инициализируем или валидируем контракты
    if (!state.contracts || state.contracts.length === 0) {
        generateContracts();
        saveState();
    } else {
        state.contracts = state.contracts.filter(c => c && c.reqs && Array.isArray(c.reqs.allowedClasses));
        if (state.contracts.length === 0) {
            generateContracts();
            saveState();
        }
    }

    let displayedContracts = state.contracts;
    if (podklyuchCategoryFilter !== 'all') {
        displayedContracts = state.contracts.filter(c =>
            c.categoryTag === podklyuchCategoryFilter ||
            (podklyuchCategoryFilter === 'sport' && c.reqs?.reqWeldedDiff)
        );
    }

    if (displayedContracts.length === 0) {
        list.innerHTML = `<div class="glass-card text-center sub-label py-6">В категории «${podklyuchCategoryFilter.toUpperCase()}» нет открытых заказов. Нажмите «Обновить»!</div>`;
        return;
    }

    let html = "";
    displayedContracts.forEach((c) => {
        let reqs = c.reqs;
        let classesText = reqs.allowedClasses.map(cl => cl.toUpperCase()).join(' / ');

        let extraReqs = [];
        extraReqs.push(`Класс: <b>${classesText}</b>`);
        extraReqs.push(`Мин. мощность: <b>${reqs.minPower} л.с.</b>`);
        extraReqs.push(`Состояние: <b>≥${reqs.minCondition}%</b>`);
        if (reqs.maxMileage) extraReqs.push(`Пробег: <b>до ${reqs.maxMileage.toLocaleString()} км</b>`);
        if (reqs.reqWeldedDiff) extraReqs.push(`Заварка: <b>Да</b>`);
        if (reqs.reqSteeringAngle) extraReqs.push(`Выворот: <b>Да</b>`);
        if (reqs.reqPolishOrChip) extraReqs.push(`Полировка/Stage: <b>Да</b>`);
        if (reqs.noCriminal) extraReqs.push(`Юр. чистота: <b>Чист</b>`);
        if (reqs.noDefects) extraReqs.push(`ЭБУ: <b>Без ошибок</b>`);

        let tagClass = c.categoryTag === 'sport' ? 'bg-tag-red' : (c.categoryTag === 'vip' ? 'bg-tag-purple' : 'bg-tag-cyan');

        let bonusBadges = `<span class='tag-badge bg-tag-green font-bold'>+${c.rewardBonus.toLocaleString()} ₽</span>`;
        if (c.rewardConn > 0) bonusBadges += ` <span class='tag-badge bg-tag-purple font-bold'>+${c.rewardConn} 🤝</span>`;
        bonusBadges += ` <span class='tag-badge bg-tag-cyan font-bold'>+${c.rewardXp} XP</span>`;

        html += `
        <div class="glass-card mb-2 p-2">
            <div class="flex-between mb-1">
                <div class="flex-gap" style="align-items:center;">
                    <div class="chat-avatar-circle" style="font-size:20px; width:30px; height:30px;">${c.avatar}</div>
                    <div>
                        <b class="text-xs color-cyan">${c.clientName}</b>
                        <div class="sub-label" style="font-size:8.5px;">Допуск: ${c.minPlayerLevel || 6}+ ур.</div>
                    </div>
                </div>
                <span class="tag-badge ${tagClass}">${c.categoryTitle || 'Спецзаказ'}</span>
            </div>

            <h4 class="font-bold mb-1 text-xs" style="font-size:12px;">${c.title}</h4>
            <p class="sub-label mb-2" style="font-size:9.5px; line-height:1.35;">${c.desc}</p>

            <div class="p-2 mb-2" style="background:#090e18; border-radius:6px; font-size:9.5px; line-height:1.4;">
                <div class="color-amber font-bold mb-1">Техническое задание:</div>
                ${extraReqs.join(' • ')}
            </div>

            <div class="flex-between mb-2">
                <span class="text-xs sub-label">Премия сервиса:</span>
                <div>${bonusBadges}</div>
            </div>

            <button onclick="openSelectContractCarModal('${c.id}')" class="btn btn-cyan btn-sm w-full">
                <i class="fa-solid fa-car-side"></i> Сдать подготовленный авто
            </button>
        </div>`;
    });

    list.innerHTML = html;
}

// ========================================================
// 2. ВЫБОР И ПЕРЕДАЧА АВТО КЛИЕНТУ
// ========================================================
function checkCarMeetsContract(car, c) {
    if (!car || !c || !c.reqs) return { passed: false, errors: ["Ошибка данных"] };
    let reqs = c.reqs;
    let errors = [];

    let carType = car.type || 'economy';
    if (!Array.isArray(reqs.allowedClasses) || !reqs.allowedClasses.includes(carType)) {
        errors.push(`Не тот класс (${carType.toUpperCase()} вместо ${(reqs.allowedClasses || []).join('/')})`);
    }

    let power = car.power || 100;
    if (power < (reqs.minPower || 0)) {
        errors.push(`Слабый мотор (${power}/${reqs.minPower} л.с.)`);
    }

    let cond = car.condition || 50;
    if (cond < (reqs.minCondition || 0)) {
        errors.push(`Плохое состояние (${cond}/${reqs.minCondition}%)`);
    }

    if (reqs.maxMileage && (car.mileage || 0) > reqs.maxMileage) {
        errors.push(`Большой пробег (${(car.mileage || 0).toLocaleString()} км)`);
    }

    if (reqs.reqWeldedDiff && !car.tuning?.weldedDiff) {
        errors.push(`Отсутствует заварка редуктора`);
    }

    if (reqs.reqSteeringAngle && !car.tuning?.steeringAngle) {
        errors.push(`Отсутствует выворот колёс`);
    }

    if (reqs.reqPolishOrChip) {
        let hasPolish = !!car.isPolished;
        let hasChip = !!(car.tuning && car.tuning.chip >= 1);
        if (!hasPolish && !hasChip) {
            errors.push(`Требуется предпродажная полировка или чип Stage 1+`);
        }
    }

    if (reqs.noCriminal) {
        if (car.isStolen) errors.push(`Авто числится в розыске`);
        if (car.unregistered) errors.push(`Учёт аннулирован по 12.5.1`);
    }

    if (reqs.noDefects && car.hiddenDefect) {
        errors.push(`Чек двигателя: ${car.hiddenDefect.text}`);
    }

    if (car.isPersonal) {
        errors.push(`Автомобиль назначен личным (снимите статус в гараже)`);
    }

    return {
        passed: errors.length === 0,
        errors: errors
    };
}

function openSelectContractCarModal(contractId) {
    activeContractForCarSelect = contractId;
    const contract = (state.contracts || []).find(c => c.id === contractId);
    if (!contract) {
        return showToast("Контракт не найден!");
    }

    const infoEl = document.getElementById('contractTargetInfo');
    const listEl = document.getElementById('contractCarsSelectList');
    if (!infoEl || !listEl) return;

    infoEl.innerHTML = `Спецзаказ «ПодКлюч»: <b>${contract.title}</b> (${contract.clientName})`;

    if (!state.garage || state.garage.length === 0) {
        listEl.innerHTML = `<div class="glass-card text-center sub-label py-6">В гараже нет ни одного автомобиля!</div>`;
    } else {
        let html = "";
        state.garage.forEach((car, idx) => {
            if (!car) return;
            if (typeof recalculateCarMarketValue === 'function') {
                recalculateCarMarketValue(car);
            }

            const check = checkCarMeetsContract(car, contract);
            let cImg = car.img || "assets/cars/economy/2101/vaz-2101.jpg";
            let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
            let basePayout = (car.marketValue || car.basePrice || 100000) + contract.rewardBonus;

            // Передаём carUid вместо carIndex
            const carUid = car.uid || car.id || String(idx);

            let statusBlock = check.passed
                ? `<div class="color-green text-xs font-bold mb-1">✓ Полностью соответствует ТЗ заказчика!</div>
                   <div class="sub-label mb-2" style="font-size:10px;">Итоговая выплата: <b class="color-green">+${basePayout.toLocaleString()} ₽</b></div>
                   <button onclick="fulfillContract('${contract.id}', '${carUid}')" class="btn btn-green btn-sm w-full">Сдать автомобиль клиенту 🤝</button>`
                : `<div class="color-red text-xs font-bold mb-1">✗ Не подходит под требования:</div>
                   <div class="sub-label color-red mb-2" style="font-size:9.5px; line-height:1.3;">${check.errors.join('<br>')}</div>
                   <button class="btn btn-dark btn-sm w-full opacity-50" disabled>Не соответствует ТЗ</button>`;

            html += `
            <div class="glass-card p-2 mb-2" style="border-color:${check.passed ? 'var(--green)' : 'var(--border-glass)'};">
                <div class="deal-car-preview-card mb-2">
                    <img src="${cImg}" class="deal-car-thumb" onerror="this.src='assets/cars/economy/2101/vaz-2101.jpg'">
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

    ModalManager.open('modalSelectContractCar');
    if (typeof playSound === 'function') playSound('tick');
}

function closeSelectContractCarModal() {
    ModalManager.close('modalSelectContractCar');
    activeContractForCarSelect = null;
    _contractFulfilling = false;
}

async function fulfillContract(contractId, carUid) {
    if (_contractFulfilling) return;

    const cIdx = (state.contracts || []).findIndex(c => c.id === contractId);
    if (cIdx === -1) return showToast("Контракт не найден или уже выполнен!");

    const contract = state.contracts[cIdx];
    if (!contract) return;

    // Поиск машины по uid, не по индексу
    const carIdx = (state.garage || []).findIndex(c => c && (c.uid === carUid || c.id === carUid));
    if (carIdx === -1) {
        return showToast("Автомобиль не найден в гараже!");
    }
    const car = state.garage[carIdx];

    // Двойная проверка соответствия
    const check = checkCarMeetsContract(car, contract);
    if (!check.passed) {
        return showToast("Автомобиль перестал соответствовать ТЗ! Возможно, что-то изменилось.");
    }

    _contractFulfilling = true;

    try {
        if (typeof recalculateCarMarketValue === 'function') {
            recalculateCarMarketValue(car);
        }

        let carPrice = car.marketValue || car.basePrice || 100000;
        let totalPayout = carPrice + contract.rewardBonus;

        state.garage.splice(carIdx, 1);

        state.player.cash = (state.player.cash || 0) + totalPayout;
        if (contract.rewardConn > 0) {
            state.player.connections = (state.player.connections || 0) + contract.rewardConn;
        }
        if (typeof addXp === 'function') addXp(contract.rewardXp || 60);

        if (!state.player.stats) state.player.stats = {};
        state.player.stats.sold = (state.player.stats.sold || 0) + 1;
        let netGain = contract.rewardBonus;
        state.player.stats.totalNetProfit = (state.player.stats.totalNetProfit || 0) + netGain;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Заказ «ПодКлюч»: ${contract.title}`, totalPayout, true);
        }

        if (typeof trackQuestProgress === 'function') {
            trackQuestProgress('sell_car', 1);
            trackQuestProgress('podklyuch_contract', 1);
        }

        state.contracts.splice(cIdx, 1);

        ModalManager.close('modalSelectContractCar');
        activeContractForCarSelect = null;

        saveState();
        updateHeaderUI();
        renderContracts();
        if (typeof renderGarage === 'function') renderGarage();

        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof spawnFloatingReward === 'function') spawnFloatingReward(`+${totalPayout.toLocaleString()} ₽`);

        if (typeof openVerdictModal === 'function') {
            openVerdictModal(
                "СПЕЦЗАКАЗ ВЫПОЛНЕН! 🔑",
                `Клиент «${contract.clientName}» принял автомобиль «${car.name}» под ключ!\nВыплата: +${totalPayout.toLocaleString()} ₽ (Премия подбора: +${contract.rewardBonus.toLocaleString()} ₽)\nОпыт: +${contract.rewardXp} XP ${contract.rewardConn ? `и +${contract.rewardConn} 🤝` : ''}`,
                true,
                totalPayout,
                netGain
            );
        }
    } finally {
        _contractFulfilling = false;
    }
}

// ========================================================
// 3. ЭКСПОРТ В WINDOW
// ========================================================
window.checkSyndicateAccessDetails = checkSyndicateAccessDetails;
window.unlockPodklyuchLicenseAction = unlockPodklyuchLicenseAction;
window.renderSyndicateHub = renderSyndicateHub;
window.switchSyndicateTab = switchSyndicateTab;
window.filterPodklyuchContracts = filterPodklyuchContracts;
window.generateContracts = generateContracts;
window.refreshContractsManual = refreshContractsManual;
window.renderContracts = renderContracts;
window.checkCarMeetsContract = checkCarMeetsContract;
window.openSelectContractCarModal = openSelectContractCarModal;
window.closeSelectContractCarModal = closeSelectContractCarModal;
window.fulfillContract = fulfillContract;
// ========================================================
// js/syndicate.js — СЕРВИС «ПОДКЛЮЧ», АВТОКЛУБЫ, ТОП И РЕФЕРАЛЫ (v0.8.6)
// Разработчики: Илья Чепиль (DXF) & Perekup Dev Team
// Реальная интеграция с Cloud Firestore:
// Онлайн автоклубы с общаком, живой глобальный лидерборд,
// Telegram рефералы и спецзаказы ПодКлюч по уровням.
// ========================================================

let activeContractForCarSelect = null;
let podklyuchCategoryFilter = 'all'; // 'all', 'sport', 'fleet', 'vip'

// ========================================================
// ЭКРАН ПРИЛОЖЕНИЯ «ПОДКЛЮЧ» ДЛЯ PEREKUP OS
// ========================================================
const AppSyndicate = {
    render(container) {
        let sub = state.syndicateSubTab || 'contracts';

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-purple"><i class="fa-solid fa-key mr-1"></i> СЕРВИС «ПОДКЛЮЧ»</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <!-- НАВИГАЦИОННЫЕ ВКЛАДКИ -->
                <div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 4px;">
                    <button onclick="switchSyndicateTab('contracts')" id="synTabBtn-contracts" class="btn ${sub === 'contracts' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        <i class="fa-solid fa-file-contract"></i> Заказы
                    </button>
                    <button onclick="switchSyndicateTab('clubs')" id="synTabBtn-clubs" class="btn ${sub === 'clubs' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        <i class="fa-solid fa-users"></i> Клубы
                    </button>
                    <button onclick="switchSyndicateTab('leaderboard')" id="synTabBtn-leaderboard" class="btn ${sub === 'leaderboard' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        <i class="fa-solid fa-trophy"></i> Топ
                    </button>
                    <button onclick="switchSyndicateTab('friends')" id="synTabBtn-friends" class="btn ${sub === 'friends' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        <i class="fa-solid fa-handshake"></i> Партнёры
                    </button>
                </div>

                <!-- 1. ЭКРАН СПЕЦЗАКАЗОВ ПОДКЛЮЧ -->
                <div id="synScreen-contracts" style="${sub === 'contracts' ? 'display:block;' : 'display:none;'}">
                    <div id="contractsLockCover" style="display:none;"></div>
                    
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

                    <div id="contractsList"></div>
                </div>

                <!-- 2. ЭКРАН ОНЛАЙН АВТОКЛУБОВ -->
                <div id="synScreen-clubs" style="${sub === 'clubs' ? 'display:block;' : 'display:none;'}">
                    <div class="glass-card mb-2 p-2 flex-between" style="border-color: var(--purple);">
                        <div>
                            <b class="text-xs color-purple"><i class="fa-solid fa-users"></i> Ваш автоклуб:</b>
                            <div class="font-bold text-xs color-green" id="synMyClubName">Без автоклуба</div>
                        </div>
                        <button onclick="createClubPrompt()" class="btn btn-purple btn-auto btn-sm" style="font-size:9px;">Создать клуб</button>
                    </div>
                    <div id="synClubsContainer"></div>
                </div>

                <!-- 3. ЭКРАН ЖИВОГО ЛИДЕРБОРДА -->
                <div id="synScreen-leaderboard" style="${sub === 'leaderboard' ? 'display:block;' : 'display:none;'}">
                    <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(255,215,0,0.15), #090e18); border-color:var(--amber);">
                        <div>
                            <b class="text-xs color-amber"><i class="fa-solid fa-trophy"></i> Топ Олигархов Авторынка (Firestore)</b>
                            <div class="sub-label" style="font-size:9.5px;">Глобальный онлайн-рейтинг перекупов</div>
                        </div>
                        <button onclick="renderLeaderboard(true)" class="btn btn-dark btn-auto btn-sm" style="font-size:9px;">
                            <i class="fa-solid fa-arrows-rotate"></i>
                        </button>
                    </div>
                    <div id="leaderboardListContainer"></div>
                </div>

                <!-- 4. ЭКРАН ПАРТНЁРОВ И TELEGRAM-ШЕРИНГА -->
                <div id="synScreen-friends" style="${sub === 'friends' ? 'display:block;' : 'display:none;'}">
                    <div class="glass-card mb-2 p-2" style="border-color: var(--green);">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-green"><i class="fa-solid fa-user-plus"></i> Пригласить напарника (+75,000 ₽)</b>
                            <span class="tag-badge bg-tag-green" id="friendsCountBadge">0 напарников</span>
                        </div>
                        <div class="sub-label mb-2" style="font-size:9.5px;">
                            Отправьте приглашение другу в Telegram. Как только он зайдёт в игру, оба получат по <b>+75,000 ₽</b> и <b>+1 🤝 Связь</b>!
                        </div>
                        <div class="grid-2">
                            <button onclick="shareReferralLink()" class="btn btn-green btn-sm">
                                <i class="fa-brands fa-telegram mr-1"></i> Поделиться в Telegram
                            </button>
                            <button onclick="copyReferralLink()" class="btn btn-cyan btn-sm">
                                <i class="fa-solid fa-copy mr-1"></i> Скопировать ссылку
                            </button>
                        </div>
                    </div>
                    <div id="friendsListContainer"></div>
                </div>
            </div>
        `;

        switchSyndicateTab(sub);
    }
};

window.AppPodklyuch = AppSyndicate;
window.AppSyndicate = AppSyndicate;

function renderSyndicateHub() {
    let subTab = state.syndicateSubTab ? state.syndicateSubTab : 'contracts';
    switchSyndicateTab(subTab);
}

function switchSyndicateTab(sub) {
    state.syndicateSubTab = sub;
    ['contracts', 'clubs', 'leaderboard', 'friends'].forEach(s => {
        const scr = document.getElementById('synScreen-' + s);
        const btn = document.getElementById('synTabBtn-' + s);
        if (scr) scr.style.display = (s === sub) ? 'block' : 'none';
        if (btn) {
            btn.className = (s === sub) ? 'btn btn-cyan btn-sm' : 'btn btn-dark btn-sm';
        }
    });

    if (sub === 'contracts') renderContracts();
    if (sub === 'clubs') renderClubsList();
    if (sub === 'leaderboard') renderLeaderboard();
    if (sub === 'friends') renderFriendsList();
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
    if (lvl >= 5) list.push('moto');
    if (lvl >= 8) list.push('atv');
    if (lvl >= 15) list.push('comfort');
    if (lvl >= 30) list.push('premium');
    if (lvl >= 50) list.push('hyper', 'truck');
    if (lvl >= 100) list.push('yacht');
    return list;
}

function generateContracts() {
    state.contracts = [];
    const pool = (typeof PODKLYUCH_CONTRACT_TEMPLATES !== 'undefined')
        ? PODKLYUCH_CONTRACT_TEMPLATES
        : ((typeof SYNDICATE_CONTRACT_TEMPLATES !== 'undefined') ? SYNDICATE_CONTRACT_TEMPLATES : []);

    let playerLvl = state.player?.level || 1;
    let unlockedCats = getUnlockedCategoriesForPlayer(playerLvl);

    let matchedPool = pool.filter(t => {
        let minLvl = t.minPlayerLevel || 7;
        let maxLvl = t.maxPlayerLevel || 100;
        let lvlOk = playerLvl >= minLvl && playerLvl <= maxLvl;
        let hasUnlockedClass = t.reqs.allowedClasses.some(c => unlockedCats.includes(c));
        return lvlOk && hasUnlockedClass;
    });

    if (matchedPool.length === 0) {
        matchedPool = pool.filter(t => (t.minPlayerLevel || 7) <= playerLvl);
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

    const access = (typeof checkSyndicateAccessDetails === 'function') 
        ? checkSyndicateAccessDetails() 
        : { isFullAccess: ((state.player?.level || 1) >= 7), hasLvl: ((state.player?.level || 1) >= 7), hasEndoscope: true, hasGauge: true, hasLaunch: true, hasStars: true, lvl: state.player?.level || 1, stars: state.player?.stars || 0 };

    if (!access.isFullAccess) {
        if (lock) {
            lock.style.display = 'block';
            lock.innerHTML = `
                <div class="glass-card text-center p-3 mb-2" style="border: 1px solid var(--purple);">
                    <div style="font-size:32px; margin-bottom:6px;">🔒</div>
                    <h4 class="font-bold color-purple mb-1">Сервис «ПодКлюч» опечатан</h4>
                    <p class="sub-label mb-2" style="font-size:9.5px;">Для выполнения заказов VIP-клиентов требуется подтвердить статус эксперта и оборудование:</p>
                    <div class="space-y-1 text-left p-2 mb-2" style="background:#090e18; border-radius:8px; font-size:9.5px;">
                        <div class="flex-between"><span>• Авторитет: <b>7+ ур</b></span> <b class="${access.hasLvl ? 'color-green' : 'color-red'}">${access.hasLvl ? '✓ Да' : '✗ Нет (' + access.lvl + '/7)'}</b></div>
                        <div class="flex-between"><span>• HD Видеоэндоскоп</span> <b class="${access.hasEndoscope ? 'color-green' : 'color-red'}">${access.hasEndoscope ? '✓ В наличии' : '✗ Купить'}</b></div>
                        <div class="flex-between"><span>• Толщиномер ЛКП</span> <b class="${access.hasGauge ? 'color-green' : 'color-red'}">${access.hasGauge ? '✓ В наличии' : '✗ Купить'}</b></div>
                        <div class="flex-between"><span>• Сканер Launch Pro</span> <b class="${access.hasLaunch ? 'color-green' : 'color-red'}">${access.hasLaunch ? '✓ В наличии' : '✗ Купить'}</b></div>
                        <div class="flex-between"><span>• Депозит: <b>5+ Stars ⭐</b></span> <b class="${access.hasStars ? 'color-green' : 'color-red'}">${access.hasStars ? '✓ Да' : '✗ Нет (' + access.stars + '/5)'}</b></div>
                    </div>
                    <button onclick="PhoneManager.openApp('shop')" class="btn btn-cyan btn-sm w-full">Купить приборы в Маркете</button>
                </div>
            `;
        }
        list.innerHTML = '';
        return;
    }
    if (lock) lock.style.display = 'none';

    if (!state.contracts || state.contracts.length === 0) {
        generateContracts();
        saveState();
    }

    let displayedContracts = state.contracts;
    if (podklyuchCategoryFilter !== 'all') {
        displayedContracts = state.contracts.filter(c => c.categoryTag === podklyuchCategoryFilter || (podklyuchCategoryFilter === 'sport' && c.reqs.reqWeldedDiff));
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
                        <div class="sub-label" style="font-size:8.5px;">Допуск: ${c.minPlayerLevel || 7}+ ур.</div>
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
    if (!contract) return;

    const infoEl = document.getElementById('contractTargetInfo');
    const listEl = document.getElementById('contractCarsSelectList');
    if (!infoEl || !listEl) return;

    infoEl.innerHTML = `Спецзаказ «ПодКлюч»: <b>${contract.title}</b> (${contract.clientName})`;

    if (!state.garage || state.garage.length === 0) {
        listEl.innerHTML = `<div class="glass-card text-center sub-label py-6">В гараже нет ни одного автомобиля!</div>`;
    } else {
        let html = "";
        state.garage.forEach((car, idx) => {
            if (typeof recalculateCarMarketValue === 'function') {
                recalculateCarMarketValue(car);
            }

            const check = checkCarMeetsContract(car, contract);
            let cImg = car.img || "assets/cars/economy/2101/vaz-2101.jpg";
            let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
            let basePayout = (car.marketValue || car.basePrice || 100000) + contract.rewardBonus;

            let statusBlock = check.passed
                ? `<div class="color-green text-xs font-bold mb-1">✓ Полностью соответствует ТЗ заказчика!</div>
                   <div class="sub-label mb-2" style="font-size:10px;">Итоговая выплата: <b class="color-green">+${basePayout.toLocaleString()} ₽</b></div>
                   <button onclick="fulfillContract('${contract.id}', ${idx})" class="btn btn-green btn-sm w-full">Сдать автомобиль клиенту 🤝</button>`
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
    }

    state.contracts.splice(cIdx, 1);

    ModalManager.close('modalSelectContractCar');
    saveState();
    updateHeaderUI();
    renderContracts();
    if (typeof renderGarage === 'function') renderGarage();

    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    if (typeof spawnFloatingReward === 'function') spawnFloatingReward(`+${totalPayout.toLocaleString()} ₽`);
    
    openVerdictModal(
        "СПЕЦЗАКАЗ ВЫПОЛНЕН! 🔑",
        `Клиент «${contract.clientName}» принял автомобиль «${car.name}» под ключ!\nВыплата: +${totalPayout.toLocaleString()} ₽ (Премия подбора: +${contract.rewardBonus.toLocaleString()} ₽)\nОпыт: +${contract.rewardXp} XP ${contract.rewardConn ? `и +${contract.rewardConn} 🤝` : ''}`,
        true,
        totalPayout,
        netGain
    );
}

// ========================================================
// 3. ОНЛАЙН АВТОКЛУБЫ С FIRESTORE
// ========================================================
async function renderClubsList() {
    const container = document.getElementById('synClubsContainer');
    const myClubNameEl = document.getElementById('synMyClubName');
    if (!container) return;

    let myClub = state.player?.club || null;
    if (myClubNameEl) {
        myClubNameEl.innerText = myClub ? `${myClub.name}` : "Без автоклуба";
    }

    let clubs = [];
    if (window.FB_Bridge && window.FB_Bridge.Clubs) {
        clubs = await window.FB_Bridge.Clubs.fetchClubs();
    }

    if (!clubs || clubs.length === 0) {
        clubs = [
            { id: "club_jdm", name: "JDM Legends Moscow", membersCount: 14, bank: 350000, fee: 100000, perk: "+10% к оценке японских авто" },
            { id: "club_vaz", name: "Боевая Классика РФ", membersCount: 28, bank: 180000, fee: 50000, perk: "Бесплатный ремонт подвески на сходках" },
            { id: "club_m", name: "Bavarian Power M", membersCount: 9, bank: 1250000, fee: 250000, perk: "+15% к победе на 402м" },
            { id: "club_elite", name: "Синдикат Олигархов", membersCount: 5, bank: 4500000, fee: 750000, perk: "-25% ко всем налогам и проверкам" }
        ];
    }

    let html = "";
    clubs.forEach(club => {
        let isMember = myClub && String(myClub.id) === String(club.id);
        let btnContent = isMember 
            ? "<button onclick='leaveClubAction()' class='btn btn-danger btn-auto btn-sm'>Покинуть</button>"
            : `<button onclick="joinClubAction('${club.id}', '${club.name}', ${club.fee || 100000})" class='btn btn-cyan btn-auto btn-sm'>Вступить (${((club.fee || 100000) / 1000).toFixed(0)}k ₽)</button>`;

        html += `
        <div class='glass-card p-2 flex-between mb-2' style='${isMember ? "border-color:var(--green); background:rgba(0,230,118,0.06);" : ""}'>
            <div>
                <b class='color-cyan text-xs'>${club.name}</b>
                <div class='sub-label' style='font-size:9.5px;'>👥 Участников: <b>${club.membersCount || 1}</b> • Сейф: <b class="color-green">${(club.bank || 0).toLocaleString()} ₽</b></div>
                <div class='sub-label mt-1' style='font-size:8.5px; color:#cbd5e1;'>⭐ ${club.perk || 'Стандарт'}</div>
            </div>
            ${btnContent}
        </div>`;
    });

    container.innerHTML = html;
}

async function joinClubAction(clubId, clubName, fee) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < fee) return showToast(`Не хватает денег на вступительный взнос (${fee.toLocaleString()} ₽)!`);

    state.player.cash -= fee;
    state.player.club = { id: clubId, name: clubName };

    if (window.FB_Bridge && window.FB_Bridge.Clubs) {
        await window.FB_Bridge.Clubs.joinClub(clubId, window.FB_Bridge.getProfile());
    }

    saveState();
    updateHeaderUI();
    renderClubsList();
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    showToast(`Вы вступили в автоклуб «${clubName}»! Открыт командный чат в Мессенджере.`);
}

function leaveClubAction() {
    state.player.club = null;
    saveState();
    updateHeaderUI();
    renderClubsList();
    showToast("Вы покинули автоклуб.");
}

async function createClubPrompt() {
    let name = prompt("Введите название нового автоклуба:");
    if (!name || !name.trim()) return;

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    let cost = 500000;
    if (cash < cost) return showToast(`Нужно ${cost.toLocaleString()} ₽ на регистрацию клуба в Firestore!`);

    state.player.cash -= cost;

    if (window.FB_Bridge && window.FB_Bridge.Clubs) {
        showToast("Создание клуба в сети...");
        let res = await window.FB_Bridge.Clubs.createClub(name, window.FB_Bridge.getProfile(), 100000);
        if (res.success) {
            state.player.club = { id: res.club.id, name: res.club.name };
        } else {
            state.player.club = { id: "club_" + Date.now(), name: name.trim() };
        }
    } else {
        state.player.club = { id: "club_" + Date.now(), name: name.trim() };
    }

    saveState();
    updateHeaderUI();
    renderClubsList();
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    showToast(`Автоклуб «${name.trim()}» зарегистрирован! Вы назначены лидером синдиката.`);
}

// ========================================================
// 4. ОНЛАЙН ЛИДЕРБОРД ПЕРЕКУПОВ
// ========================================================
async function renderLeaderboard(force = false) {
    const container = document.getElementById('leaderboardListContainer');
    if (!container) return;

    container.innerHTML = `<div class="sub-label text-center py-4"><i class="fa-solid fa-spinner fa-spin color-amber"></i> Загрузка таблицы лидеров Firestore...</div>`;

    let leaders = [];
    if (window.FB_Bridge && window.FB_Bridge.Leaderboard) {
        leaders = await window.FB_Bridge.Leaderboard.fetchTop(force);
    }

    if (!leaders || leaders.length === 0) {
        leaders = [
            { id: "lead_1", name: "Илюха DXF", profit: 142500000, level: 85 },
            { id: "lead_2", name: "Святой Максиман", profit: 98400000, level: 64 },
            { id: "lead_3", name: "Серёга Техно", profit: 76100000, level: 52 },
            { id: "lead_4", name: "Жиминка Пендосовская", profit: 54000000, level: 41 }
        ];
    }

    // Добавляем текущего игрока, если его нет в топе
    let myId = window.FB_Bridge ? window.FB_Bridge.getProfile().id : "me";
    let myProfit = state.player?.stats?.totalNetProfit || 0;
    let myLvl = state.player?.level || 1;
    let foundMe = leaders.some(l => String(l.id) === String(myId));

    if (!foundMe && myProfit > 0) {
        leaders.push({
            id: myId,
            name: state.player?.name || "Вы",
            profit: myProfit,
            level: myLvl,
            isMe: true
        });
        leaders.sort((a, b) => b.profit - a.profit);
    }

    let html = "";
    leaders.slice(0, 30).forEach((lead, idx) => {
        let rank = idx + 1;
        let isMe = String(lead.id) === String(myId) || lead.isMe;
        let rankColor = rank === 1 ? "color-amber" : (rank === 2 ? "color-cyan" : (rank === 3 ? "color-purple" : ""));

        let badgeText = rank === 1 ? "👑 ТОП-1" : (rank === 2 ? "⚡ ТОП-2" : (rank === 3 ? "🔥 ТОП-3" : `Ур. ${lead.level || 1}`));
        let badgeClass = rank <= 3 ? "bg-tag-amber" : "bg-tag-dark";

        html += `
        <div class='glass-card p-2 flex-between mb-2 ${isMe ? "personal-car-card" : ""}'>
            <div class='flex-gap' style='align-items:center;'>
                <b class='font-bold ${rankColor}' style='font-size:15px; min-width:24px;'>#${rank}</b>
                <div>
                    <b class='text-xs ${isMe ? "color-green" : ""}'>${lead.name} ${isMe ? " (Вы)" : ""}</b>
                    <div class='sub-label' style='font-size:9.5px;'>Чистая прибыль: <span class='color-green font-bold'>${(lead.profit || 0).toLocaleString()} ₽</span></div>
                </div>
            </div>
            <span class='tag-badge ${badgeClass}'>${badgeText}</span>
        </div>`;
    });

    container.innerHTML = html;
}

// ========================================================
// 5. ДРУЗЬЯ И РЕФЕРАЛЬНАЯ СИСТЕМА TELEGRAM
// ========================================================
function getReferralLink() {
    let profile = window.FB_Bridge ? window.FB_Bridge.getProfile() : { id: "777" };
    return "https://t.me/PerekupSimBot?start=ref_" + profile.id;
}

function shareReferralLink() {
    const link = getReferralLink();
    const text = "Залетай со мной в «Симулятор Перекупа»! Выкупай тачки у реальных игроков, вступай в мой автоклуб и забирай стартовые +75,000 ₽!";
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
            showToast("Реферальная ссылка скопирована в буфер обмена!");
            if (typeof playSound === 'function') playSound('win');
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
        document.execCommand('copy');
        showToast("Ссылка скопирована!");
    } catch(err) {
        showToast("Не удалось скопировать.");
    }
    document.body.removeChild(textArea);
}

async function renderFriendsList() {
    const container = document.getElementById('friendsListContainer');
    const badge = document.getElementById('friendsCountBadge');
    if (!container) return;

    let myId = window.FB_Bridge ? window.FB_Bridge.getProfile().id : null;
    let friends = [];

    // ИСПРАВЛЕНО: корректный вызов существующего метода FB_Bridge.M.fetchFriends
    if (myId && window.FB_Bridge && window.FB_Bridge.M) {
        friends = await window.FB_Bridge.M.fetchFriends(myId);
    }

    if (!friends || friends.length === 0) {
        friends = [
            { name: "Артем_BMW", reward: 75000, date: "Сегодня" },
            { name: "Денис_Vaz", reward: 75000, date: "Вчера" }
        ];
    }

    if (badge) badge.innerText = `${friends.length} напарников`;

    let html = "";
    friends.forEach(f => {
        html += `
        <div class='glass-card p-2 flex-between mb-2'>
            <div>
                <b class='color-cyan text-xs'>${f.name}</b>
                <div class='sub-label' style='font-size:9.5px;'>Приглашён: ${f.date || 'Недавно'}</div>
            </div>
            <span class='tag-badge bg-tag-green'>+${(f.reward || 75000).toLocaleString()} ₽ бонус</span>
        </div>`;
    });

    container.innerHTML = html;
}

// Экспорт функций в window
window.renderSyndicateHub = renderSyndicateHub;
window.switchSyndicateTab = switchSyndicateTab;
window.filterPodklyuchContracts = filterPodklyuchContracts;
window.generateContracts = generateContracts;
window.refreshContractsManual = refreshContractsManual;
window.renderContracts = renderContracts;
window.checkCarMeetsContract = checkCarMeetsContract;
window.openSelectContractCarModal = openSelectContractCarModal;
window.fulfillContract = fulfillContract;
window.renderClubsList = renderClubsList;
window.joinClubAction = joinClubAction;
window.leaveClubAction = leaveClubAction;
window.createClubPrompt = createClubPrompt;
window.renderLeaderboard = renderLeaderboard;
window.getReferralLink = getReferralLink;
window.shareReferralLink = shareReferralLink;
window.copyReferralLink = copyReferralLink;
window.renderFriendsList = renderFriendsList;
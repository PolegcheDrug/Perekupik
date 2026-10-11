// ========================================================
// js/syndicate.js — ЗАКАЗЫ СИНДИКАТА, P2P БИРЖА, НОМЕРА, ТОП (v0.4.5)
// Разработчики: Илья Чепиль (DXF) & Perekup Dev Team
// Доступ к Синдикату с 7 уровня при наличии эндоскопа, толщиномера,
// Launch сканера и 5 Stars ⭐. Динамическая оценка авто и номеров.
// ========================================================

let p2pActiveFilter = 'cars';[span_0](start_span)[span_0](end_span)
let p2pNewListingType = 'car';[span_1](start_span)[span_1](end_span)
let activeContractForCarSelect = null;[span_2](start_span)[span_2](end_span)

function renderSyndicateHub() {
    let subTab = state.syndicateSubTab ? state.syndicateSubTab : 'contracts';[span_3](start_span)[span_3](end_span)
    switchSyndicateTab(subTab);[span_4](start_span)[span_4](end_span)
}

function switchSyndicateTab(sub) {
    state.syndicateSubTab = sub;[span_5](start_span)[span_5](end_span)
    ['contracts', 'p2p', 'blackmarket', 'clubs', 'leaderboard', 'friends'].forEach(s => {[span_6](start_span)[span_6](end_span)
        const scr = document.getElementById('synScreen-' + s);[span_7](start_span)[span_7](end_span)
        const btn = document.getElementById('synTabBtn-' + s);[span_8](start_span)[span_8](end_span)
        if (scr) scr.style.display = (s === sub) ? 'block' : 'none';[span_9](start_span)[span_9](end_span)
        if (btn) {[span_10](start_span)[span_10](end_span)
            if (s === sub) {[span_11](start_span)[span_11](end_span)
                btn.classList.add('active');[span_12](start_span)[span_12](end_span)
                btn.classList.add('btn-cyan');[span_13](start_span)[span_13](end_span)
                btn.classList.remove('btn-dark');[span_14](start_span)[span_14](end_span)
            } else {
                btn.classList.remove('active');[span_15](start_span)[span_15](end_span)
                btn.classList.remove('btn-cyan');[span_16](start_span)[span_16](end_span)
                btn.classList.add('btn-dark');[span_17](start_span)[span_17](end_span)
            }
        }
    });

    if (sub === 'contracts') renderContracts();[span_18](start_span)[span_18](end_span)
    if (sub === 'p2p') renderP2PListings();[span_19](start_span)[span_19](end_span)
    if (sub === 'blackmarket') renderBlackMarketPlates();[span_20](start_span)[span_20](end_span)
    if (sub === 'clubs') renderClubsList();[span_21](start_span)[span_21](end_span)
    if (sub === 'leaderboard') renderLeaderboard();[span_22](start_span)[span_22](end_span)
    if (sub === 'friends') renderFriendsList();[span_23](start_span)[span_23](end_span)
}

// ========================================================
// 1. ЗАКАЗЫ И КОНТРАКТЫ СИНДИКАТА ПОД КЛЮЧ
// ========================================================
const CONTRACT_TEMPLATES = [
    {
        type: 'vip_escort',[span_24](start_span)[span_24](end_span)
        clientName: "Помощник депутата",[span_25](start_span)[span_25](end_span)
        avatar: "🤵",[span_26](start_span)[span_26](end_span)
        title: "VIP Кортеж / Сопровождение",[span_27](start_span)[span_27](end_span)
        desc: "Требуется строгий представительский авто в идеальном состоянии. Без ДТП, ошибок по ЭБУ и проблем с законом.",[span_28](start_span)[span_28](end_span)
        reqs: {
            allowedClasses: ['comfort', 'premium'],[span_29](start_span)[span_29](end_span)
            minPower: 160,[span_30](start_span)[span_30](end_span)
            minCondition: 80,[span_31](start_span)[span_31](end_span)
            noCriminal: true,[span_32](start_span)[span_32](end_span)
            noDefects: true[span_33](start_span)[span_33](end_span)
        },
        rewardBonus: 280000,[span_34](start_span)[span_34](end_span)
        rewardConn: 1,[span_35](start_span)[span_35](end_span)
        rewardXp: 90[span_36](start_span)[span_36](end_span)
    },
    {
        type: 'drift_spec',[span_37](start_span)[span_37](end_span)
        clientName: "Организатор ночных гонок",[span_38](start_span)[span_38](end_span)
        avatar: "🏎️",[span_39](start_span)[span_39](end_span)
        title: "Боевой корч под зимний сезон",[span_40](start_span)[span_40](end_span)
        desc: "Ищем подготовленный заднеприводный кузов с заваркой и выворотом. Мелкие косяки по ЛКП значения не имеют.",[span_41](start_span)[span_41](end_span)
        reqs: {
            allowedClasses: ['economy', 'comfort'],[span_42](start_span)[span_42](end_span)
            minPower: 75,[span_43](start_span)[span_43](end_span)
            minCondition: 40,[span_44](start_span)[span_44](end_span)
            reqWeldedDiff: true,[span_45](start_span)[span_45](end_span)
            reqSteeringAngle: true,[span_46](start_span)[span_46](end_span)
            noCriminal: false,[span_47](start_span)[span_47](end_span)
            noDefects: false[span_48](start_span)[span_48](end_span)
        },
        rewardBonus: 160000,[span_49](start_span)[span_49](end_span)
        rewardConn: 0,[span_50](start_span)[span_50](end_span)
        rewardXp: 70[span_51](start_span)[span_51](end_span)
    },
    {
        type: 'taxi_fleet',[span_52](start_span)[span_52](end_span)
        clientName: "Шеф таксомоторного парка",[span_53](start_span)[span_53](end_span)
        avatar: "🧔‍♂️",[span_54](start_span)[span_54](end_span)
        title: "Срочный выкуп в городской таксопарк",[span_55](start_span)[span_55](end_span)
        desc: "Нужен надёжный городской седан с подтверждённым пробегом до 170k км и живыми агрегатами. Учёт РФ обязателен.",[span_56](start_span)[span_56](end_span)
        reqs: {
            allowedClasses: ['economy', 'comfort'],[span_57](start_span)[span_57](end_span)
            minPower: 85,[span_58](start_span)[span_58](end_span)
            maxMileage: 170000,[span_59](start_span)[span_59](end_span)
            minCondition: 70,[span_60](start_span)[span_60](end_span)
            noCriminal: true,[span_61](start_span)[span_61](end_span)
            noDefects: true[span_62](start_span)[span_62](end_span)
        },
        rewardBonus: 120000,[span_63](start_span)[span_63](end_span)
        rewardConn: 0,[span_64](start_span)[span_64](end_span)
        rewardXp: 55[span_65](start_span)[span_65](end_span)
    },
    {
        type: 'arab_export',[span_66](start_span)[span_66](end_span)
        clientName: "Шейх Мансур (ОАЭ)",[span_67](start_span)[span_67](end_span)
        avatar: "👳‍♂️",[span_68](start_span)[span_68](end_span)
        title: "Экспорт суперкара в Дубай",[span_69](start_span)[span_69](end_span)
        desc: "Срочный заказ на мощный премиум или гиперкар. Требуется идеальный кузов после детейлинга или наличие чипа.",[span_70](start_span)[span_70](end_span)
        reqs: {
            allowedClasses: ['premium', 'hyper'],[span_71](start_span)[span_71](end_span)
            minPower: 300,[span_72](start_span)[span_72](end_span)
            minCondition: 90,[span_73](start_span)[span_73](end_span)
            reqPolishOrChip: true,[span_74](start_span)[span_74](end_span)
            noCriminal: true,[span_75](start_span)[span_75](end_span)
            noDefects: true[span_76](start_span)[span_76](end_span)
        },
        rewardBonus: 950000,[span_77](start_span)[span_77](end_span)
        rewardConn: 2,[span_78](start_span)[span_78](end_span)
        rewardXp: 180[span_79](start_span)[span_79](end_span)
    },
    {
        type: 'chop_guard',[span_80](start_span)[span_80](end_span)
        clientName: "Начальник службы безопасности",[span_81](start_span)[span_81](end_span)
        avatar: "🕶️",[span_82](start_span)[span_82](end_span)
        title: "Машина прикрытия ЧОП",[span_83](start_span)[span_83](end_span)
        desc: "Ищем мощный внедорожник или универсал для группы быстрого реагирования. Мотор от 180 л.с.",[span_84](start_span)[span_84](end_span)
        reqs: {
            allowedClasses: ['comfort', 'premium', 'truck'],[span_85](start_span)[span_85](end_span)
            minPower: 180,[span_86](start_span)[span_86](end_span)
            minCondition: 65,[span_87](start_span)[span_87](end_span)
            noCriminal: true,[span_88](start_span)[span_88](end_span)
            noDefects: false[span_89](start_span)[span_89](end_span)
        },
        rewardBonus: 240000,[span_90](start_span)[span_90](end_span)
        rewardConn: 1,[span_91](start_span)[span_91](end_span)
        rewardXp: 80[span_92](start_span)[span_92](end_span)
    }
];

function generateContracts() {
    state.contracts = [];[span_93](start_span)[span_93](end_span)
    const shuffled = [...CONTRACT_TEMPLATES].sort(() => 0.5 - Math.random());[span_94](start_span)[span_94](end_span)
    const count = Math.min(3, shuffled.length);[span_95](start_span)[span_95](end_span)

    for (let i = 0; i < count; i++) {[span_96](start_span)[span_96](end_span)
        const t = shuffled[i];[span_97](start_span)[span_97](end_span)
        state.contracts.push({
            id: "contract_" + Date.now() + "_" + i,[span_98](start_span)[span_98](end_span)
            ...JSON.parse(JSON.stringify(t)),[span_99](start_span)[span_99](end_span)
            expiresInDays: 3[span_100](start_span)[span_100](end_span)
        });
    }
}

function refreshContractsManual() {
    let cash = state.player?.cash || 0;[span_101](start_span)[span_101](end_span)
    if (cash < 15000) return showToast("Нужно 15,000 ₽ на обновление базы контрактов!");[span_102](start_span)[span_102](end_span)

    state.player.cash -= 15000;[span_103](start_span)[span_103](end_span)
    generateContracts();[span_104](start_span)[span_104](end_span)
    saveState();[span_105](start_span)[span_105](end_span)
    updateHeaderUI();[span_106](start_span)[span_106](end_span)
    renderContracts();[span_107](start_span)[span_107](end_span)
    playSound('tick');[span_108](start_span)[span_108](end_span)
    tgHaptic('success');[span_109](start_span)[span_109](end_span)
    showToast("База заказов Синдиката обновлена (-15,000 ₽)");[span_110](start_span)[span_110](end_span)
}

function renderContracts() {
    const list = document.getElementById('contractsList');[span_111](start_span)[span_111](end_span)
    const lock = document.getElementById('contractsLockCover');[span_112](start_span)[span_112](end_span)
    if (!list) return;[span_113](start_span)[span_113](end_span)

    // ПРОВЕРКА МНОГОФАКТОРНОГО ДОСТУПА К СИНДИКАТУ (7 УРОВЕНЬ + ПРИБОРЫ + 5 ЗВЕЗД)
    const access = (typeof checkSyndicateAccessDetails === 'function') 
        ? checkSyndicateAccessDetails() 
        : { isFullAccess: ((state.player?.level || 1) >= 7), hasLvl: ((state.player?.level || 1) >= 7), hasEndoscope: true, hasGauge: true, hasLaunch: true, hasStars: true, lvl: state.player?.level || 1, stars: state.player?.stars || 0 };

    if (!access.isFullAccess) {
        if (lock) {
            lock.style.display = 'block';[span_114](start_span)[span_114](end_span)
            lock.innerHTML = `
                <div class="glass-card text-center p-3" style="border: 1px solid var(--purple);">
                    <div style="font-size:36px; margin-bottom:8px;">🔒</div>
                    <h4 class="font-bold color-purple mb-1">Синдикат закрыт</h4>
                    <p class="sub-label mb-3" style="font-size:10px;">Для допуска к контрактам Синдиката требуется подтвердить статус эксперта и профессиональное диагностическое оборудование:</p>
                    <div class="space-y-1 text-left p-2 mb-3" style="background:#090e18; border-radius:8px; font-size:10px;">
                        <div class="flex-between"><span>• Уровень авторитета: <b>7+ ур</b></span> <b class="${access.hasLvl ? 'color-green' : 'color-red'}">${access.hasLvl ? '✓ Да (' + access.lvl + ')' : '✗ Нет (' + access.lvl + '/7)'}</b></div>
                        <div class="flex-between"><span>• HD Видеоэндоскоп мотора</span> <b class="${access.hasEndoscope ? 'color-green' : 'color-red'}">${access.hasEndoscope ? '✓ В наличии' : '✗ Купить в Маркете'}</b></div>
                        <div class="flex-between"><span>• Толщиномер ЛКП (любой)</span> <b class="${access.hasGauge ? 'color-green' : 'color-red'}">${access.hasGauge ? '✓ В наличии' : '✗ Купить в Маркете'}</b></div>
                        <div class="flex-between"><span>• Сканер Launch Pro</span> <b class="${access.hasLaunch ? 'color-green' : 'color-red'}">${access.hasLaunch ? '✓ В наличии' : '✗ Купить в Маркете'}</b></div>
                        <div class="flex-between"><span>• Баланс Синдиката: <b>5+ Stars ⭐</b></span> <b class="${access.hasStars ? 'color-green' : 'color-red'}">${access.hasStars ? '✓ Да (' + access.stars + ')' : '✗ Нет (' + access.stars + '/5)'}</b></div>
                    </div>
                    <button onclick="PhoneManager.openApp('shop')" class="btn btn-cyan btn-sm w-full">Перейти в Маркет за приборами</button>
                </div>
            `;
        }
        list.innerHTML = '';[span_115](start_span)[span_115](end_span)
        return;[span_116](start_span)[span_116](end_span)
    }
    if (lock) lock.style.display = 'none';[span_117](start_span)[span_117](end_span)

    if (!state.contracts || state.contracts.length === 0) {[span_118](start_span)[span_118](end_span)
        generateContracts();[span_119](start_span)[span_119](end_span)
        saveState();[span_120](start_span)[span_120](end_span)
    }

    let html = "";[span_121](start_span)[span_121](end_span)
    state.contracts.forEach((c) => {[span_122](start_span)[span_122](end_span)
        let reqs = c.reqs;[span_123](start_span)[span_123](end_span)
        let classesText = reqs.allowedClasses.map(cl => cl.toUpperCase()).join(' / ');[span_124](start_span)[span_124](end_span)
        
        let extraReqs = [];[span_125](start_span)[span_125](end_span)
        extraReqs.push(`Класс: <b>${classesText}</b>`);[span_126](start_span)[span_126](end_span)
        extraReqs.push(`Мин. мощность: <b>${reqs.minPower} л.с.</b>`);[span_127](start_span)[span_127](end_span)
        extraReqs.push(`Состояние кузова: <b>≥${reqs.minCondition}%</b>`);[span_128](start_span)[span_128](end_span)
        if (reqs.maxMileage) extraReqs.push(`Пробег: <b>до ${reqs.maxMileage.toLocaleString()} км</b>`);[span_129](start_span)[span_129](end_span)
        if (reqs.reqWeldedDiff) extraReqs.push(`Заварка: <b>Обязательна</b>`);[span_130](start_span)[span_130](end_span)
        if (reqs.reqSteeringAngle) extraReqs.push(`Выворот: <b>Обязателен</b>`);[span_131](start_span)[span_131](end_span)
        if (reqs.reqPolishOrChip) extraReqs.push(`Полировка или Chip: <b>Да</b>`);[span_132](start_span)[span_132](end_span)
        if (reqs.noCriminal) extraReqs.push(`Юр. чистота: <b>Без розыска и 12.5.1</b>`);[span_133](start_span)[span_133](end_span)
        if (reqs.noDefects) extraReqs.push(`ЭБУ: <b>Без скрытых дефектов</b>`);[span_134](start_span)[span_134](end_span)

        let bonusBadges = `<span class='tag-badge bg-tag-green font-bold'>+${c.rewardBonus.toLocaleString()} ₽ премия</span>`;[span_135](start_span)[span_135](end_span)
        if (c.rewardConn > 0) bonusBadges += ` <span class='tag-badge bg-tag-purple font-bold'>+${c.rewardConn} 🤝</span>`;[span_136](start_span)[span_136](end_span)
        bonusBadges += ` <span class='tag-badge bg-tag-cyan font-bold'>+${c.rewardXp} XP</span>`;[span_137](start_span)[span_137](end_span)

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
        </div>`;[span_138](start_span)[span_138](end_span)
    });

    list.innerHTML = html;[span_139](start_span)[span_139](end_span)
}

// ----------------------------------------------------
// ВЫБОР И СДАЧА АВТОМОБИЛЯ ПОД КОНТРАКТ
// ----------------------------------------------------
function checkCarMeetsContract(car, c) {
    if (!car || !c) return { passed: false, errors: ["Ошибка данных"] };[span_140](start_span)[span_140](end_span)
    let reqs = c.reqs;[span_141](start_span)[span_141](end_span)
    let errors = [];[span_142](start_span)[span_142](end_span)

    let carType = car.type || 'economy';[span_143](start_span)[span_143](end_span)
    if (!reqs.allowedClasses.includes(carType)) {[span_144](start_span)[span_144](end_span)
        errors.push(`Не тот класс (${carType.toUpperCase()} вместо ${reqs.allowedClasses.join('/')})`);[span_145](start_span)[span_145](end_span)
    }

    let power = car.power || 100;[span_146](start_span)[span_146](end_span)
    if (power < reqs.minPower) {[span_147](start_span)[span_147](end_span)
        errors.push(`Слабый мотор (${power}/${reqs.minPower} л.с.)`);[span_148](start_span)[span_148](end_span)
    }

    let cond = car.condition || 50;[span_149](start_span)[span_149](end_span)
    if (cond < reqs.minCondition) {[span_150](start_span)[span_150](end_span)
        errors.push(`Плохое состояние кузова (${cond}/${reqs.minCondition}%)`);[span_151](start_span)[span_151](end_span)
    }

    if (reqs.maxMileage && (car.mileage || 0) > reqs.maxMileage) {[span_152](start_span)[span_152](end_span)
        errors.push(`Слишком большой пробег (${(car.mileage || 0).toLocaleString()} км)`);[span_153](start_span)[span_153](end_span)
    }

    if (reqs.reqWeldedDiff && !car.tuning?.weldedDiff) {[span_154](start_span)[span_154](end_span)
        errors.push(`Нет заварки редуктора`);[span_155](start_span)[span_155](end_span)
    }

    if (reqs.reqSteeringAngle && !car.tuning?.steeringAngle) {[span_156](start_span)[span_156](end_span)
        errors.push(`Нет выворота колёс`);[span_157](start_span)[span_157](end_span)
    }

    if (reqs.reqPolishOrChip) {[span_158](start_span)[span_158](end_span)
        let hasPolish = !!car.isPolished;[span_159](start_span)[span_159](end_span)
        let hasChip = !!(car.tuning && car.tuning.chip >= 1);[span_160](start_span)[span_160](end_span)
        if (!hasPolish && !hasChip) {[span_161](start_span)[span_161](end_span)
            errors.push(`Требуется полировка или Chip Stage 1+`);[span_162](start_span)[span_162](end_span)
        }
    }

    if (reqs.noCriminal) {[span_163](start_span)[span_163](end_span)
        if (car.isStolen) errors.push(`Авто числится в розыске`);[span_164](start_span)[span_164](end_span)
        if (car.unregistered) errors.push(`Учёт аннулирован по 12.5.1`);[span_165](start_span)[span_165](end_span)
    }

    if (reqs.noDefects && car.hiddenDefect) {[span_166](start_span)[span_166](end_span)
        errors.push(`Горит чек: ${car.hiddenDefect.text}`);[span_167](start_span)[span_167](end_span)
    }

    if (car.isPersonal) {[span_168](start_span)[span_168](end_span)
        errors.push(`Это ваш личный автомобиль (снимите статус в гараже)`);[span_169](start_span)[span_169](end_span)
    }

    return {
        passed: errors.length === 0,[span_170](start_span)[span_170](end_span)
        errors: errors[span_171](start_span)[span_171](end_span)
    };
}

function openSelectContractCarModal(contractId) {
    activeContractForCarSelect = contractId;[span_172](start_span)[span_172](end_span)
    const contract = (state.contracts || []).find(c => c.id === contractId);[span_173](start_span)[span_173](end_span)
    if (!contract) return;[span_174](start_span)[span_174](end_span)

    const infoEl = document.getElementById('contractTargetInfo');[span_175](start_span)[span_175](end_span)
    const listEl = document.getElementById('contractCarsSelectList');[span_176](start_span)[span_176](end_span)
    if (!infoEl || !listEl) return;[span_177](start_span)[span_177](end_span)

    infoEl.innerHTML = `Контракт: <b>${contract.title}</b> (${contract.clientName})`;[span_178](start_span)[span_178](end_span)

    if (!state.garage || state.garage.length === 0) {[span_179](start_span)[span_179](end_span)
        listEl.innerHTML = `<div class="glass-card text-center sub-label py-6">В гараже нет ни одного автомобиля!</div>`;[span_180](start_span)[span_180](end_span)
    } else {
        let html = "";[span_181](start_span)[span_181](end_span)
        state.garage.forEach((car, idx) => {[span_182](start_span)[span_182](end_span)
            if (typeof recalculateCarMarketValue === 'function') {[span_183](start_span)[span_183](end_span)
                recalculateCarMarketValue(car);[span_184](start_span)[span_184](end_span)
            }

            const check = checkCarMeetsContract(car, contract);[span_185](start_span)[span_185](end_span)
            let cImg = car.img || "assets/cars/economy/vaz-2107.jpg";[span_186](start_span)[span_186](end_span)
            let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";[span_187](start_span)[span_187](end_span)
            let basePayout = (car.marketValue || car.basePrice || 100000) + contract.rewardBonus;[span_188](start_span)[span_188](end_span)

            let statusBlock = check.passed[span_189](start_span)[span_189](end_span)
                ? `<div class="color-green text-xs font-bold mb-1">✓ Полностью соответствует всем требованиям!</div>
                   <div class="sub-label mb-2" style="font-size:10px;">Итоговая выплата с учётом авто и номеров: <b class="color-green">+${basePayout.toLocaleString()} ₽</b></div>
                   <button onclick="fulfillContract('${contract.id}', ${idx})" class="btn btn-green btn-sm w-full">Сдать автомобиль под контракт 🤝</button>`[span_190](start_span)[span_190](end_span)
                : `<div class="color-red text-xs font-bold mb-1">✗ Не подходит:</div>
                   <div class="sub-label color-red mb-2" style="font-size:9.5px; line-height:1.3;">${check.errors.join('<br>')}</div>
                   <button class="btn btn-dark btn-sm w-full opacity-50" disabled>Не соответствует условиям</button>`;[span_191](start_span)[span_191](end_span)

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
            </div>`;[span_192](start_span)[span_192](end_span)
        });
        listEl.innerHTML = html;[span_193](start_span)[span_193](end_span)
    }

    const modal = document.getElementById('modalSelectContractCar');[span_194](start_span)[span_194](end_span)
    if (modal) modal.classList.add('active');[span_195](start_span)[span_195](end_span)
    playSound('tick');[span_196](start_span)[span_196](end_span)
}

function fulfillContract(contractId, carIndex) {
    const cIdx = (state.contracts || []).findIndex(c => c.id === contractId);[span_197](start_span)[span_197](end_span)
    if (cIdx === -1) return;[span_198](start_span)[span_198](end_span)
    const contract = state.contracts[cIdx];[span_199](start_span)[span_199](end_span)
    const car = state.garage ? state.garage[carIndex] : null;[span_200](start_span)[span_200](end_span)
    if (!car) return;[span_201](start_span)[span_201](end_span)

    if (typeof recalculateCarMarketValue === 'function') {[span_202](start_span)[span_202](end_span)
        recalculateCarMarketValue(car);[span_203](start_span)[span_203](end_span)
    }

    let carPrice = car.marketValue || car.basePrice || 100000;[span_204](start_span)[span_204](end_span)
    let totalPayout = carPrice + contract.rewardBonus;[span_205](start_span)[span_205](end_span)

    state.garage.splice(carIndex, 1);[span_206](start_span)[span_206](end_span)

    state.player.cash = (state.player.cash || 0) + totalPayout;[span_207](start_span)[span_207](end_span)
    if (contract.rewardConn > 0) {[span_208](start_span)[span_208](end_span)
        state.player.connections = (state.player.connections || 0) + contract.rewardConn;[span_209](start_span)[span_209](end_span)
    }
    addXp(contract.rewardXp || 60);[span_210](start_span)[span_210](end_span)

    if (!state.player.stats) state.player.stats = {};[span_211](start_span)[span_211](end_span)
    state.player.stats.sold = (state.player.stats.sold || 0) + 1;[span_212](start_span)[span_212](end_span)
    let netGain = contract.rewardBonus;[span_213](start_span)[span_213](end_span)
    state.player.stats.totalNetProfit = (state.player.stats.totalNetProfit || 0) + netGain;[span_214](start_span)[span_214](end_span)

    if (typeof logBankTransaction === 'function') {
        logBankTransaction(`Контракт: ${contract.title}`, totalPayout, true);
    }

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('sell_car', 1);
    }

    state.contracts.splice(cIdx, 1);[span_215](start_span)[span_215](end_span)

    closeModal('modalSelectContractCar');[span_216](start_span)[span_216](end_span)
    saveState();[span_217](start_span)[span_217](end_span)
    updateHeaderUI();[span_218](start_span)[span_218](end_span)
    renderContracts();[span_219](start_span)[span_219](end_span)
    if (typeof renderGarage === 'function') renderGarage();[span_220](start_span)[span_220](end_span)

    playSound('win');[span_221](start_span)[span_221](end_span)
    tgHaptic('success');[span_222](start_span)[span_222](end_span)
    spawnFloatingReward(`+${totalPayout.toLocaleString()} ₽`);[span_223](start_span)[span_223](end_span)
    openVerdictModal(
        "КОНТРАКТ СИНДИКАТА ЗАКРЫТ! 🤝",[span_224](start_span)[span_224](end_span)
        `Клиент «${contract.clientName}» остался крайне доволен поставкой «${car.name}».\nВыплата: +${totalPayout.toLocaleString()} ₽ (Премия: +${contract.rewardBonus.toLocaleString()} ₽)\nПолучено: +${contract.rewardXp} XP ${contract.rewardConn ? `и +${contract.rewardConn} 🤝` : ''}`,[span_225](start_span)[span_225](end_span)
        true,[span_226](start_span)[span_226](end_span)
        totalPayout,[span_227](start_span)[span_227](end_span)
        netGain[span_228](start_span)[span_228](end_span)
    );
}

// ----------------------------------------------------
// 2. P2P БИРЖА ТЕХНИКИ И НОМЕРОВ
// ----------------------------------------------------
function filterP2P(type) {
    p2pActiveFilter = type;[span_229](start_span)[span_229](end_span)
    ['cars', 'plates', 'business', 'housing'].forEach(t => {[span_230](start_span)[span_230](end_span)
        const btn = document.getElementById('p2pFilter-' + t);[span_231](start_span)[span_231](end_span)
        if (btn) {[span_232](start_span)[span_232](end_span)
            btn.className = (t === type) ? 'btn btn-cyan btn-sm' : 'btn btn-dark btn-sm';[span_233](start_span)[span_233](end_span)
        }
    });
    renderP2PListings();[span_234](start_span)[span_234](end_span)
}

function renderP2PListings() {
    const list = document.getElementById('p2pItemsList');[span_235](start_span)[span_235](end_span)
    if (!list) return;[span_236](start_span)[span_236](end_span)

    if (!state.p2pMarketListings || state.p2pMarketListings.length === 0) {[span_237](start_span)[span_237](end_span)
        state.p2pMarketListings = [
            { 
                id: "p2p_1", seller: "Maga_GTI", type: "car", name: "VW Golf VI GTI (Stage 2)",[span_238](start_span)[span_238](end_span)
                price: 1850000, plate: "О777ОО 77", power: 260, img: "assets/cars/comfort/golf6.jpg",[span_239](start_span)[span_239](end_span)
                originalCarObj: { condition: 85, wear: {engine: 80, transmission: 75}, tuning: {chip: 2, exhaust: true, stance: false, bodykit: false} }[span_240](start_span)[span_240](end_span)
            },
            { id: "p2p_2", seller: "Major_Vova", type: "plate", name: "Госномер А777АА 77", price: 1500000, plate: "А777АА 77" },[span_241](start_span)[span_241](end_span)
            { 
                id: "p2p_3", seller: "Serega_Drift", type: "car", name: "ВАЗ-2107 (Корч)",[span_242](start_span)[span_242](end_span)
                price: 250000, plate: "В123ВВ 77", power: 85, img: "assets/cars/economy/vaz-2107.jpg",[span_243](start_span)[span_243](end_span)
                originalCarObj: { condition: 60, wear: {engine: 50, transmission: 40}, tuning: {chip: 0, exhaust: true, stance: false, bodykit: false, weldedDiff: true, steeringAngle: true, hydroHandbrake: true} }[span_244](start_span)[span_244](end_span)
            },
            { id: "p2p_4", seller: "Bumer_Boy", type: "plate", name: "Госномер В001ОР 777", price: 950000, plate: "В001ОР 777" },[span_245](start_span)[span_245](end_span)
            {
                id: "p2p_5", seller: "Oligarch_Vova", type: "business", name: "Автомойка 24/7 (Ур. 3)",[span_246](start_span)[span_246](end_span)
                bizId: "wash", bizLevel: 3, price: 320000, desc: "Готовая точка с доходностью 2,700 ₽/д.[span_247](start_span)"[span_247](end_span)
            },
            {
                id: "p2p_6", seller: "Maksim_Realtor", type: "housing", name: "Кирпичный гараж с ямой",[span_248](start_span)[span_248](end_span)
                houseId: "garage", price: 2600000, desc: "В собственности, вместимость +3 машиноместа.[span_249](start_span)"[span_249](end_span)
            }
        ];
    }

    let filtered = state.p2pMarketListings.filter(item => item.type === p2pActiveFilter);[span_250](start_span)[span_250](end_span)

    if (filtered.length === 0) {[span_251](start_span)[span_251](end_span)
        list.innerHTML = "<div class='glass-card text-center sub-label py-6'>В этой категории биржи пока нет активных лотов.</div>";[span_252](start_span)[span_252](end_span)
        return;[span_253](start_span)[span_253](end_span)
    }

    let html = "";[span_254](start_span)[span_254](end_span)
    filtered.forEach(item => {[span_255](start_span)[span_255](end_span)
        let isMyListing = (state.myP2PListings && state.myP2PListings.includes(item.id));[span_256](start_span)[span_256](end_span)
        let btnAction = isMyListing[span_257](start_span)[span_257](end_span)
            ? "<button onclick=\"cancelP2PListing('" + item.id + "')\" class='btn btn-danger btn-auto btn-sm'>Снять с биржи</button>[span_258](start_span)"[span_258](end_span)
            : "<button onclick=\"buyP2PListing('" + item.id + "')\" class='btn btn-green btn-auto btn-sm'>Купить (" + item.price.toLocaleString() + " ₽)</button>";[span_259](start_span)[span_259](end_span)

        if (item.type === 'car') {[span_260](start_span)[span_260](end_span)
            let carImg = item.img ? item.img : "assets/cars/economy/vaz-2107.jpg";[span_261](start_span)[span_261](end_span)
            let tuneBadges = "";[span_262](start_span)[span_262](end_span)
            let t = item.originalCarObj?.tuning;[span_263](start_span)[span_263](end_span)
            if (t) {[span_264](start_span)[span_264](end_span)
                if (t.chip > 0) tuneBadges += "<span class='tag-badge bg-tag-purple mx-1'>STG " + t.chip + "</span>";[span_265](start_span)[span_265](end_span)
                if (t.stance) tuneBadges += "<span class='tag-badge bg-tag-amber mx-1'>ПНЕВМА</span>";[span_266](start_span)[span_266](end_span)
                if (t.weldedDiff) tuneBadges += "<span class='tag-badge bg-tag-red mx-1'>ДРИФТ</span>";[span_267](start_span)[span_267](end_span)
            }

            html +=[span_268](start_span)[span_268](end_span)
            "<div class='glass-card mb-2'>" +[span_269](start_span)[span_269](end_span)
                "<div class='flex-between mb-2'>" +[span_270](start_span)[span_270](end_span)
                    "<div class='flex-gap' style='align-items:center;'>" +[span_271](start_span)[span_271](end_span)
                        "<div class='chat-avatar-circle' style='width:28px; height:28px; font-size:14px;'>👤</div>" +[span_272](start_span)[span_272](end_span)
                        "<div><b class='text-xs color-cyan'>" + item.seller + "</b><div class='sub-label' style='font-size:9px;'>Продавец авто</div></div>" +[span_273](start_span)[span_273](end_span)
                    "</div>" +[span_274](start_span)[span_274](end_span)
                    "<span class='tag-badge bg-tag-cyan'>АВТО P2P</span>" +[span_275](start_span)[span_275](end_span)
                "</div>" +[span_276](start_span)[span_276](end_span)
                "<div class='deal-car-preview-card mb-2'>" +[span_277](start_span)[span_277](end_span)
                    "<img src='" + carImg + "' class='deal-car-thumb' onerror=\"this.src='assets/cars/economy/vaz-2107.jpg'\">" +[span_278](start_span)[span_278](end_span)
                    "<div style='flex:1;'>" +[span_279](start_span)[span_279](end_span)
                        "<div class='font-bold text-xs'>" + item.name + "</div>" +[span_280](start_span)[span_280](end_span)
                        "<div class='license-plate text-xs' style='padding:1px 4px; margin:4px 0;'>" + item.plate + "</div>" +[span_281](start_span)[span_281](end_span)
                        "<div class='price-val text-xs color-green'>" + item.price.toLocaleString() + " ₽</div>" +[span_282](start_span)[span_282](end_span)
                    "</div>" +[span_283](start_span)[span_283](end_span)
                "</div>" +[span_284](start_span)[span_284](end_span)
                "<div class='flex-between'>" +[span_285](start_span)[span_285](end_span)
                    "<div>" +[span_286](start_span)[span_286](end_span)
                        "<div class='sub-label text-xs'>Мощность: " + (item.power || 100) + " л.с.</div>" +[span_287](start_span)[span_287](end_span)
                        "<div class='mt-1'>" + tuneBadges + "</div>" +[span_288](start_span)[span_288](end_span)
                    "</div>" +[span_289](start_span)[span_289](end_span)
                    btnAction +[span_290](start_span)[span_290](end_span)
                "</div>" +[span_291](start_span)[span_291](end_span)
            "</div>";[span_292](start_span)[span_292](end_span)
        } else if (item.type === 'plate') {[span_293](start_span)[span_293](end_span)
            html +=[span_294](start_span)[span_294](end_span)
            "<div class='glass-card p-2 flex-between mb-2'>" +[span_295](start_span)[span_295](end_span)
                "<div>" +[span_296](start_span)[span_296](end_span)
                    "<div class='license-plate mb-1' style='font-size:14px;'>" + item.plate + " <div class='license-flag'>RUS</div></div>" +[span_297](start_span)[span_297](end_span)
                    "<div class='sub-label text-xs'>Продавец: <b class='color-cyan'>" + item.seller + "</b></div>" +[span_298](start_span)[span_298](end_span)
                "</div>" +[span_299](start_span)[span_299](end_span)
                "<div class='text-right'>" +[span_300](start_span)[span_300](end_span)
                    "<div class='price-val text-xs color-green mb-1'>" + item.price.toLocaleString() + " ₽</div>" +[span_301](start_span)[span_301](end_span)
                    btnAction +[span_302](start_span)[span_302](end_span)
                "</div>" +[span_303](start_span)[span_303](end_span)
            "</div>";[span_304](start_span)[span_304](end_span)
        } else if (item.type === 'business') {[span_305](start_span)[span_305](end_span)
            html +=[span_306](start_span)[span_306](end_span)
            "<div class='glass-card p-2 flex-between mb-2'>" +[span_307](start_span)[span_307](end_span)
                "<div>" +[span_308](start_span)[span_308](end_span)
                    "<b class='text-xs color-green'><i class='fa-solid fa-briefcase'></i> " + item.name + "</b>" +[span_309](start_span)[span_309](end_span)
                    "<div class='sub-label' style='font-size:10px;'>Продавец: <b>" + item.seller + "</b> | " + (item.desc || '') + "</div>" +[span_310](start_span)[span_310](end_span)
                "</div>" +[span_311](start_span)[span_311](end_span)
                "<div class='text-right'>" +[span_312](start_span)[span_312](end_span)
                    "<div class='price-val text-xs color-green mb-1'>" + item.price.toLocaleString() + " ₽</div>" +[span_313](start_span)[span_313](end_span)
                    btnAction +[span_314](start_span)[span_314](end_span)
                "</div>" +[span_315](start_span)[span_315](end_span)
            "</div>";[span_316](start_span)[span_316](end_span)
        } else if (item.type === 'housing') {[span_317](start_span)[span_317](end_span)
            html +=[span_318](start_span)[span_318](end_span)
            "<div class='glass-card p-2 flex-between mb-2'>" +[span_319](start_span)[span_319](end_span)
                "<div>" +[span_320](start_span)[span_320](end_span)
                    "<b class='text-xs color-cyan'><i class='fa-solid fa-house'></i> " + item.name + "</b>" +[span_321](start_span)[span_321](end_span)
                    "<div class='sub-label' style='font-size:10px;'>Продавец: <b>" + item.seller + "</b> | " + (item.desc || '') + "</div>" +[span_322](start_span)[span_322](end_span)
                "</div>" +[span_323](start_span)[span_323](end_span)
                "<div class='text-right'>" +[span_324](start_span)[span_324](end_span)
                    "<div class='price-val text-xs color-green mb-1'>" + item.price.toLocaleString() + " ₽</div>" +[span_325](start_span)[span_325](end_span)
                    btnAction +[span_326](start_span)[span_326](end_span)
                "</div>" +[span_327](start_span)[span_327](end_span)
            "</div>";[span_328](start_span)[span_328](end_span)
        }
    });

    list.innerHTML = html;[span_329](start_span)[span_329](end_span)
}

function openCreateListingModal() {
    selectP2PListingType('car');[span_330](start_span)[span_330](end_span)
    const modal = document.getElementById('modalCreateP2P');[span_331](start_span)[span_331](end_span)
    if (modal) modal.classList.add('active');[span_332](start_span)[span_332](end_span)
    playSound('tick');[span_333](start_span)[span_333](end_span)
}

function selectP2PListingType(type) {
    p2pNewListingType = type;[span_334](start_span)[span_334](end_span)
    const btnCar = document.getElementById('btnP2PTypeCar');[span_335](start_span)[span_335](end_span)
    const btnPlate = document.getElementById('btnP2PTypePlate');[span_336](start_span)[span_336](end_span)
    const btnBiz = document.getElementById('btnP2PTypeBiz');[span_337](start_span)[span_337](end_span)
    const btnHouse = document.getElementById('btnP2PTypeHouse');[span_338](start_span)[span_338](end_span)
    const select = document.getElementById('p2pItemSelect');[span_339](start_span)[span_339](end_span)

    [
        { id: 'car', el: btnCar },
        { id: 'plate', el: btnPlate },
        { id: 'business', el: btnBiz },
        { id: 'housing', el: btnHouse }
    ].forEach(b => {
        if (b.el) b.el.className = (b.id === type) ? 'btn btn-cyan btn-sm' : 'btn btn-dark btn-sm';[span_340](start_span)[span_340](end_span)
    });

    let opts = "";[span_341](start_span)[span_341](end_span)

    if (type === 'car') {[span_342](start_span)[span_342](end_span)
        if (state.garage && state.garage.length > 0) {[span_343](start_span)[span_343](end_span)
            state.garage.forEach((c, i) => {[span_344](start_span)[span_344](end_span)
                let isBlocked = c.impounded || c.unregistered || c.isStolen || c.isPersonal;[span_345](start_span)[span_345](end_span)
                let cPlate = c.customPlate || c.plate || "ТРАНЗИТ";[span_346](start_span)[span_346](end_span)
                if (!isBlocked) {[span_347](start_span)[span_347](end_span)
                    opts += "<option value='car_" + i + "'>" + c.name + " (" + cPlate + ")</option>";[span_348](start_span)[span_348](end_span)
                }
            });
        }
        if (!opts) opts = "<option value=''>Нет чистых авто в гараже (или они личные)</option>";[span_349](start_span)[span_349](end_span)
    } else if (type === 'plate') {[span_350](start_span)[span_350](end_span)
        if (state.ownedPlates && state.ownedPlates.length > 0) {[span_351](start_span)[span_351](end_span)
            state.ownedPlates.forEach((p, i) => {[span_352](start_span)[span_352](end_span)
                opts += "<option value='plate_" + i + "'>" + p + "</option>";[span_353](start_span)[span_353](end_span)
            });
        }
        if (!opts) opts = "<option value=''>Нет свободных номеров в инвентаре</option>";[span_354](start_span)[span_354](end_span)
    } else if (type === 'business') {[span_355](start_span)[span_355](end_span)
        if (state.businesses && state.businesses.length > 0) {[span_356](start_span)[span_356](end_span)
            state.businesses.forEach((b) => {[span_357](start_span)[span_357](end_span)
                if (b.level > 0) {[span_358](start_span)[span_358](end_span)
                    opts += "<option value='biz_" + b.id + "'>" + b.name + " (Ур. " + b.level + ")</option>";[span_359](start_span)[span_359](end_span)
                }
            });
        }
        if (!opts) opts = "<option value=''>Нет выкупленных предприятий</option>";[span_360](start_span)[span_360](end_span)
    } else if (type === 'housing') {[span_361](start_span)[span_361](end_span)
        let owned = state.player?.ownedHouses || [];[span_362](start_span)[span_362](end_span)
        if (owned.length > 0 && typeof HOUSING_LIST !== 'undefined') {[span_363](start_span)[span_363](end_span)
            owned.forEach(hId => {[span_364](start_span)[span_364](end_span)
                const h = HOUSING_LIST.find(item => item.id === hId);[span_365](start_span)[span_365](end_span)
                if (h) opts += "<option value='house_" + h.id + "'>" + h.name + "</option>";[span_366](start_span)[span_366](end_span)
            });
        }
        if (!opts) opts = "<option value=''>Нет жилья в собственности</option>";[span_367](start_span)[span_367](end_span)
    }

    if (select) select.innerHTML = opts;[span_368](start_span)[span_368](end_span)
    onP2PItemSelected(select ? select.value : '');[span_369](start_span)[span_369](end_span)
}

function onP2PItemSelected(val) {
    const input = document.getElementById('p2pPriceInput');[span_370](start_span)[span_370](end_span)
    if (!input || !val) return;[span_371](start_span)[span_371](end_span)

    if (val.startsWith('car_')) {[span_372](start_span)[span_372](end_span)
        let idx = parseInt(val.replace('car_', ''));[span_373](start_span)[span_373](end_span)
        let car = state.garage[idx];[span_374](start_span)[span_374](end_span)
        if (car) {[span_375](start_span)[span_375](end_span)
            if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);[span_376](start_span)[span_376](end_span)
            input.value = car.marketValue || car.price || 150000;[span_377](start_span)[span_377](end_span)
        }
    } else if (val.startsWith('plate_')) {[span_378](start_span)[span_378](end_span)
        let idx = parseInt(val.replace('plate_', ''));[span_379](start_span)[span_379](end_span)
        let plate = state.ownedPlates[idx];[span_380](start_span)[span_380](end_span)
        if (plate && typeof calculatePlateValue === 'function') {[span_381](start_span)[span_381](end_span)
            input.value = calculatePlateValue(plate);[span_382](start_span)[span_382](end_span)
        }
    } else if (val.startsWith('biz_')) {[span_383](start_span)[span_383](end_span)
        let bId = val.replace('biz_', '');[span_384](start_span)[span_384](end_span)
        let biz = (state.businesses || []).find(b => b.id === bId);[span_385](start_span)[span_385](end_span)
        if (biz) input.value = Math.round(biz.cost * (biz.level || 1));[span_386](start_span)[span_386](end_span)
    } else if (val.startsWith('house_')) {[span_387](start_span)[span_387](end_span)
        let hId = val.replace('house_', '');[span_388](start_span)[span_388](end_span)
        let h = (typeof HOUSING_LIST !== 'undefined') ? HOUSING_LIST.find(item => item.id === hId) : null;[span_389](start_span)[span_389](end_span)
        if (h) input.value = h.buyPrice || 1000000;[span_390](start_span)[span_390](end_span)
    }
}

function confirmCreateP2PListing() {
    const select = document.getElementById('p2pItemSelect');[span_391](start_span)[span_391](end_span)
    const input = document.getElementById('p2pPriceInput');[span_392](start_span)[span_392](end_span)
    if (!select || !input) return;[span_393](start_span)[span_393](end_span)

    const val = select.value;[span_394](start_span)[span_394](end_span)
    const price = parseInt(input.value);[span_395](start_span)[span_395](end_span)

    if (!val) return showToast("Выберите предмет для продажи!");[span_396](start_span)[span_396](end_span)
    if (isNaN(price) || price <= 0) return showToast("Укажите корректную стоимость в рублях!");[span_397](start_span)[span_397](end_span)

    let sellerName = (state.player && state.player.name) ? state.player.name : "Вы";[span_398](start_span)[span_398](end_span)

    if (val.startsWith('car_')) {[span_399](start_span)[span_399](end_span)
        let idx = parseInt(val.replace('car_', ''));[span_400](start_span)[span_400](end_span)
        let car = state.garage[idx];[span_401](start_span)[span_401](end_span)
        if (!car) return;[span_402](start_span)[span_402](end_span)

        state.garage.splice(idx, 1);[span_403](start_span)[span_403](end_span)
        let listingId = "p2p_lot_" + Date.now();[span_404](start_span)[span_404](end_span)

        if (!state.p2pMarketListings) state.p2pMarketListings = [];[span_405](start_span)[span_405](end_span)
        state.p2pMarketListings.unshift({
            id: listingId,[span_406](start_span)[span_406](end_span)
            seller: sellerName,[span_407](start_span)[span_407](end_span)
            type: "car",[span_408](start_span)[span_408](end_span)
            name: car.name,[span_409](start_span)[span_409](end_span)
            price: price,[span_410](start_span)[span_410](end_span)
            plate: car.customPlate || car.plate || "ТРАНЗИТ",[span_411](start_span)[span_411](end_span)
            power: car.power || 100,[span_412](start_span)[span_412](end_span)
            img: car.img,[span_413](start_span)[span_413](end_span)
            originalCarObj: car[span_414](start_span)[span_414](end_span)
        });

        if (!state.myP2PListings) state.myP2PListings = [];[span_415](start_span)[span_415](end_span)
        state.myP2PListings.push(listingId);[span_416](start_span)[span_416](end_span)
    } else if (val.startsWith('plate_')) {[span_417](start_span)[span_417](end_span)
        let idx = parseInt(val.replace('plate_', ''));[span_418](start_span)[span_418](end_span)
        let plate = state.ownedPlates[idx];[span_419](start_span)[span_419](end_span)
        if (!plate) return;[span_420](start_span)[span_420](end_span)

        state.ownedPlates.splice(idx, 1);[span_421](start_span)[span_421](end_span)
        let listingId = "p2p_lot_" + Date.now();[span_422](start_span)[span_422](end_span)

        if (!state.p2pMarketListings) state.p2pMarketListings = [];[span_423](start_span)[span_423](end_span)
        state.p2pMarketListings.unshift({
            id: listingId,[span_424](start_span)[span_424](end_span)
            seller: sellerName,[span_425](start_span)[span_425](end_span)
            type: "plate",[span_426](start_span)[span_426](end_span)
            name: "Госномер " + plate,[span_427](start_span)[span_427](end_span)
            price: price,[span_428](start_span)[span_428](end_span)
            plate: plate[span_429](start_span)[span_429](end_span)
        });

        if (!state.myP2PListings) state.myP2PListings = [];[span_430](start_span)[span_430](end_span)
        state.myP2PListings.push(listingId);[span_431](start_span)[span_431](end_span)
    } else if (val.startsWith('biz_')) {[span_432](start_span)[span_432](end_span)
        let bId = val.replace('biz_', '');[span_433](start_span)[span_433](end_span)
        let biz = (state.businesses || []).find(b => b.id === bId);[span_434](start_span)[span_434](end_span)
        if (!biz || biz.level <= 0) return;[span_435](start_span)[span_435](end_span)

        let listingId = "p2p_lot_" + Date.now();[span_436](start_span)[span_436](end_span)
        if (!state.p2pMarketListings) state.p2pMarketListings = [];[span_437](start_span)[span_437](end_span)
        state.p2pMarketListings.unshift({
            id: listingId,[span_438](start_span)[span_438](end_span)
            seller: sellerName,[span_439](start_span)[span_439](end_span)
            type: "business",[span_440](start_span)[span_440](end_span)
            name: `${biz.name} (Ур. ${biz.level})`,[span_441](start_span)[span_441](end_span)
            bizId: biz.id,[span_442](start_span)[span_442](end_span)
            bizLevel: biz.level,[span_443](start_span)[span_443](end_span)
            price: price,[span_444](start_span)[span_444](end_span)
            desc: `Готовая точка с доходностью ${((biz.income || 0) * biz.level).toLocaleString()} ₽/д.`[span_445](start_span)[span_445](end_span)
        });

        if (!state.myP2PListings) state.myP2PListings = [];[span_446](start_span)[span_446](end_span)
        state.myP2PListings.push(listingId);[span_447](start_span)[span_447](end_span)

        biz.level = 0;[span_448](start_span)[span_448](end_span)
        biz.stock = 0;[span_449](start_span)[span_449](end_span)
        biz.stored = 0;[span_450](start_span)[span_450](end_span)
    } else if (val.startsWith('house_')) {[span_451](start_span)[span_451](end_span)
        let hId = val.replace('house_', '');[span_452](start_span)[span_452](end_span)
        let h = (typeof HOUSING_LIST !== 'undefined') ? HOUSING_LIST.find(item => item.id === hId) : null;[span_453](start_span)[span_453](end_span)
        if (!h) return;[span_454](start_span)[span_454](end_span)

        let listingId = "p2p_lot_" + Date.now();[span_455](start_span)[span_455](end_span)
        if (!state.p2pMarketListings) state.p2pMarketListings = [];[span_456](start_span)[span_456](end_span)
        state.p2pMarketListings.unshift({
            id: listingId,[span_457](start_span)[span_457](end_span)
            seller: sellerName,[span_458](start_span)[span_458](end_span)
            type: "housing",[span_459](start_span)[span_459](end_span)
            name: h.name,[span_460](start_span)[span_460](end_span)
            houseId: h.id,[span_461](start_span)[span_461](end_span)
            price: price,[span_462](start_span)[span_462](end_span)
            desc: `Недвижимость в собственности. Гараж на +${h.slots} мест.`[span_463](start_span)[span_463](end_span)
        });

        if (!state.myP2PListings) state.myP2PListings = [];[span_464](start_span)[span_464](end_span)
        state.myP2PListings.push(listingId);[span_465](start_span)[span_465](end_span)

        state.player.ownedHouses = (state.player.ownedHouses || []).filter(id => id !== hId);[span_466](start_span)[span_466](end_span)
        if (state.player.housingId === hId) {[span_467](start_span)[span_467](end_span)
            state.player.housingId = 'room';[span_468](start_span)[span_468](end_span)
            state.player.housingType = 'rent';[span_469](start_span)[span_469](end_span)
        }
    }

    saveState();[span_470](start_span)[span_470](end_span)
    closeModal('modalCreateP2P');[span_471](start_span)[span_471](end_span)
    if (typeof renderGarage === 'function') renderGarage();[span_472](start_span)[span_472](end_span)
    renderP2PListings();[span_473](start_span)[span_473](end_span)
    playSound('win');[span_474](start_span)[span_474](end_span)
    tgHaptic('success');[span_475](start_span)[span_475](end_span)
    showToast("Лот успешно выставлен на онлайн P2P биржу!");[span_476](start_span)[span_476](end_span)
}

function buyP2PListing(listingId) {
    if (!state.p2pMarketListings) return;[span_477](start_span)[span_477](end_span)
    const idx = state.p2pMarketListings.findIndex(l => l.id === listingId);[span_478](start_span)[span_478](end_span)
    if (idx === -1) return;[span_479](start_span)[span_479](end_span)
    const lot = state.p2pMarketListings[idx];[span_480](start_span)[span_480](end_span)

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_481](start_span)[span_481](end_span)
    if (cash < lot.price) return showToast("Не хватает денег для выкупа лота с биржи!");[span_482](start_span)[span_482](end_span)

    if (lot.type === 'car') {[span_483](start_span)[span_483](end_span)
        let maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;[span_484](start_span)[span_484](end_span)
        let curSlots = (state.garage && state.garage.length) ? state.garage.length : 0;[span_485](start_span)[span_485](end_span)
        if (curSlots >= maxSlots) return showToast("В гараже нет свободного места!");[span_486](start_span)[span_486](end_span)

        state.player.cash -= lot.price;[span_487](start_span)[span_487](end_span)
        
        let carObj = lot.originalCarObj ? Object.assign({}, lot.originalCarObj) : {[span_488](start_span)[span_488](end_span)
            id: "car_p2p_" + Date.now(),[span_489](start_span)[span_489](end_span)
            name: lot.name,[span_490](start_span)[span_490](end_span)
            power: lot.power || 100,[span_491](start_span)[span_491](end_span)
            type: "comfort",[span_492](start_span)[span_492](end_span)
            price: lot.price,[span_493](start_span)[span_493](end_span)
            img: lot.img,[span_494](start_span)[span_494](end_span)
            plate: lot.plate,[span_495](start_span)[span_495](end_span)
            customPlate: lot.plate,[span_496](start_span)[span_496](end_span)
            condition: 90,[span_497](start_span)[span_497](end_span)
            wear: { engine: 90, transmission: 90 },[span_498](start_span)[span_498](end_span)
            isRegisteredOnPlayer: false,
            ownershipDays: 0,
            engineTemp: 90,
            tireWear: 95,
            tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }[span_499](start_span)[span_499](end_span)
        };
        
        carObj.purchaseCost = lot.price;[span_500](start_span)[span_500](end_span)
        if (typeof recalculateCarMarketValue === 'function') {[span_501](start_span)[span_501](end_span)
            recalculateCarMarketValue(carObj);[span_502](start_span)[span_502](end_span)
        }

        if (!state.garage) state.garage = [];[span_503](start_span)[span_503](end_span)
        state.garage.push(carObj);[span_504](start_span)[span_504](end_span)
    } else if (lot.type === 'plate') {[span_505](start_span)[span_505](end_span)
        state.player.cash -= lot.price;[span_506](start_span)[span_506](end_span)
        if (!state.ownedPlates) state.ownedPlates = [];[span_507](start_span)[span_507](end_span)
        state.ownedPlates.push(lot.plate);[span_508](start_span)[span_508](end_span)
    } else if (lot.type === 'business') {[span_509](start_span)[span_509](end_span)
        state.player.cash -= lot.price;[span_510](start_span)[span_510](end_span)
        let targetBiz = (state.businesses || []).find(b => b.id === lot.bizId);[span_511](start_span)[span_511](end_span)
        if (targetBiz) {[span_512](start_span)[span_512](end_span)
            targetBiz.level = Math.max(targetBiz.level || 0, lot.bizLevel || 1);[span_513](start_span)[span_513](end_span)
            targetBiz.stock = 100;[span_514](start_span)[span_514](end_span)
        }
    } else if (lot.type === 'housing') {[span_515](start_span)[span_515](end_span)
        state.player.cash -= lot.price;[span_516](start_span)[span_516](end_span)
        if (!state.player.ownedHouses) state.player.ownedHouses = [];[span_517](start_span)[span_517](end_span)
        if (!state.player.ownedHouses.includes(lot.houseId)) state.player.ownedHouses.push(lot.houseId);[span_518](start_span)[span_518](end_span)
        state.player.housingId = lot.houseId;[span_519](start_span)[span_519](end_span)
        state.player.housingType = 'own';[span_520](start_span)[span_520](end_span)
    }

    state.p2pMarketListings.splice(idx, 1);[span_521](start_span)[span_521](end_span)
    saveState();[span_522](start_span)[span_522](end_span)
    updateHeaderUI();[span_523](start_span)[span_523](end_span)
    renderP2PListings();[span_524](start_span)[span_524](end_span)
    if (typeof renderGarage === 'function') renderGarage();[span_525](start_span)[span_525](end_span)
    playSound('win');[span_526](start_span)[span_526](end_span)
    tgHaptic('success');[span_527](start_span)[span_527](end_span)
    showToast("Лот успешно выкуплен с P2P биржи!");[span_528](start_span)[span_528](end_span)
}

function cancelP2PListing(listingId) {
    if (!state.p2pMarketListings) return;[span_529](start_span)[span_529](end_span)
    const idx = state.p2pMarketListings.findIndex(l => l.id === listingId);[span_530](start_span)[span_530](end_span)
    if (idx === -1) return;[span_531](start_span)[span_531](end_span)
    const lot = state.p2pMarketListings[idx];[span_532](start_span)[span_532](end_span)

    if (lot.type === 'car') {[span_533](start_span)[span_533](end_span)
        let maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;[span_534](start_span)[span_534](end_span)
        let curSlots = (state.garage && state.garage.length) ? state.garage.length : 0;[span_535](start_span)[span_535](end_span)
        if (curSlots >= maxSlots) return showToast("В гараже нет свободного места под возврат авто!");[span_536](start_span)[span_536](end_span)

        let carObj = lot.originalCarObj ? Object.assign({}, lot.originalCarObj) : {[span_537](start_span)[span_537](end_span)
            id: "car_p2p_" + Date.now(),[span_538](start_span)[span_538](end_span)
            name: lot.name,[span_539](start_span)[span_539](end_span)
            power: lot.power || 100,[span_540](start_span)[span_540](end_span)
            type: "comfort",[span_541](start_span)[span_541](end_span)
            price: lot.price,[span_542](start_span)[span_542](end_span)
            img: lot.img,[span_543](start_span)[span_543](end_span)
            plate: lot.plate,[span_544](start_span)[span_544](end_span)
            customPlate: lot.plate,[span_545](start_span)[span_545](end_span)
            condition: 85,[span_546](start_span)[span_546](end_span)
            isRegisteredOnPlayer: false,
            ownershipDays: 0,
            engineTemp: 90,
            tireWear: 90,
            tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }[span_547](start_span)[span_547](end_span)
        };

        if (typeof recalculateCarMarketValue === 'function') {[span_548](start_span)[span_548](end_span)
            recalculateCarMarketValue(carObj);[span_549](start_span)[span_549](end_span)
        }

        if (!state.garage) state.garage = [];[span_550](start_span)[span_550](end_span)
        state.garage.push(carObj);[span_551](start_span)[span_551](end_span)
    } else if (lot.type === 'plate') {[span_552](start_span)[span_552](end_span)
        if (!state.ownedPlates) state.ownedPlates = [];[span_553](start_span)[span_553](end_span)
        state.ownedPlates.push(lot.plate);[span_554](start_span)[span_554](end_span)
    } else if (lot.type === 'business') {[span_555](start_span)[span_555](end_span)
        let targetBiz = (state.businesses || []).find(b => b.id === lot.bizId);[span_556](start_span)[span_556](end_span)
        if (targetBiz) {[span_557](start_span)[span_557](end_span)
            targetBiz.level = lot.bizLevel || 1;[span_558](start_span)[span_558](end_span)
            targetBiz.stock = 100;[span_559](start_span)[span_559](end_span)
        }
    } else if (lot.type === 'housing') {[span_560](start_span)[span_560](end_span)
        if (!state.player.ownedHouses) state.player.ownedHouses = [];[span_561](start_span)[span_561](end_span)
        if (!state.player.ownedHouses.includes(lot.houseId)) state.player.ownedHouses.push(lot.houseId);[span_562](start_span)[span_562](end_span)
    }

    state.p2pMarketListings.splice(idx, 1);[span_563](start_span)[span_563](end_span)
    if (state.myP2PListings) {[span_564](start_span)[span_564](end_span)
        state.myP2PListings = state.myP2PListings.filter(id => id !== listingId);[span_565](start_span)[span_565](end_span)
    }

    saveState();[span_566](start_span)[span_566](end_span)
    renderP2PListings();[span_567](start_span)[span_567](end_span)
    if (typeof renderGarage === 'function') renderGarage();[span_568](start_span)[span_568](end_span)
    showToast("Лот снят с продажи и возвращён в инвентарь.");[span_569](start_span)[span_569](end_span)
}

// ----------------------------------------------------
// 3. ТЕНЕВОЙ РЫНОК НОМЕРОВ (BLACK MARKET)
// ----------------------------------------------------
function generateBlackMarketPlates() {
    const rareRegions = ['77', '99', '97', '777', '199', '177'];[span_570](start_span)[span_570](end_span)
    const rareLetters = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];[span_571](start_span)[span_571](end_span)
    
    let generated = [];[span_572](start_span)[span_572](end_span)
    
    for (let i = 0; i < 4; i++) {[span_573](start_span)[span_573](end_span)
        let l1 = rareLetters[Math.floor(Math.random() * rareLetters.length)];[span_574](start_span)[span_574](end_span)
        let l2 = rareLetters[Math.floor(Math.random() * rareLetters.length)];[span_575](start_span)[span_575](end_span)
        let l3 = rareLetters[Math.floor(Math.random() * rareLetters.length)];[span_576](start_span)[span_576](end_span)
        let reg = rareRegions[Math.floor(Math.random() * rareRegions.length)];[span_577](start_span)[span_577](end_span)
        
        let plateType = Math.random();[span_578](start_span)[span_578](end_span)
        let plateStr = "";[span_579](start_span)[span_579](end_span)

        if (plateType < 0.25) {[span_580](start_span)[span_580](end_span)
            plateStr = l1 + l1 + l1 + " " + (Math.floor(Math.random()*899)+100) + " " + reg;[span_581](start_span)[span_581](end_span)
        } else if (plateType < 0.50) {[span_582](start_span)[span_582](end_span)
            const nums = ['111', '222', '333', '444', '555', '666', '888', '999'];[span_583](start_span)[span_583](end_span)
            let n = nums[Math.floor(Math.random() * nums.length)];[span_584](start_span)[span_584](end_span)
            plateStr = l1 + n + l2 + l3 + " " + reg;[span_585](start_span)[span_585](end_span)
        } else if (plateType < 0.75) {[span_586](start_span)[span_586](end_span)
            const eliteNums = ['777', '001', '007'];[span_587](start_span)[span_587](end_span)
            let n = eliteNums[Math.floor(Math.random() * eliteNums.length)];[span_588](start_span)[span_588](end_span)
            plateStr = l1 + n + l1 + l1 + " " + reg;[span_589](start_span)[span_589](end_span)
        } else {
            const specList = ["АМР", "ЕКХ", "СКР", "ВОР"];[span_590](start_span)[span_590](end_span)
            let spec = specList[Math.floor(Math.random() * specList.length)];[span_591](start_span)[span_591](end_span)
            plateStr = spec[0] + (Math.floor(Math.random()*899)+100) + spec[1] + spec[2] + " " + reg;[span_592](start_span)[span_592](end_span)
        }

        let calculatedValue = (typeof calculatePlateValue === 'function')[span_593](start_span)[span_593](end_span)
            ? calculatePlateValue(plateStr)[span_594](start_span)[span_594](end_span)
            : 450000;[span_595](start_span)[span_595](end_span)

        let marketPrice = Math.round(calculatedValue * (1.10 + Math.random() * 0.15));[span_596](start_span)[span_596](end_span)

        generated.push({
            id: "bm_plate_" + Date.now() + "_" + i,[span_597](start_span)[span_597](end_span)
            plate: plateStr,[span_598](start_span)[span_598](end_span)
            price: marketPrice[span_599](start_span)[span_599](end_span)
        });
    }

    state.blackMarketPlates = generated;[span_600](start_span)[span_600](end_span)
}

function refreshBlackMarketPlates() {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_601](start_span)[span_601](end_span)
    if (cash < 25000) return showToast("Нужно 25,000 ₽ за услуги связи с барыгой!");[span_602](start_span)[span_602](end_span)
    
    state.player.cash -= 25000;[span_603](start_span)[span_603](end_span)
    generateBlackMarketPlates();[span_604](start_span)[span_604](end_span)
    saveState();[span_605](start_span)[span_605](end_span)
    updateHeaderUI();[span_606](start_span)[span_606](end_span)
    renderBlackMarketPlates();[span_607](start_span)[span_607](end_span)
    playSound('tick');[span_608](start_span)[span_608](end_span)
    tgHaptic('success');[span_609](start_span)[span_609](end_span)
    showToast("Список теневых госзнаков обновлен!");[span_610](start_span)[span_610](end_span)
}

function renderBlackMarketPlates() {
    const list = document.getElementById('blackMarketPlatesList');[span_611](start_span)[span_611](end_span)
    if (!list) return;[span_612](start_span)[span_612](end_span)

    if (!state.blackMarketPlates || state.blackMarketPlates.length === 0) {[span_613](start_span)[span_613](end_span)
        generateBlackMarketPlates();[span_614](start_span)[span_614](end_span)
        saveState();[span_615](start_span)[span_615](end_span)
    }

    let html = "";[span_616](start_span)[span_616](end_span)
    state.blackMarketPlates.forEach((item, idx) => {[span_617](start_span)[span_617](end_span)
        let isSuperRare = item.price > 1000000;[span_618](start_span)[span_618](end_span)
        let borderGlow = isSuperRare ? "border: 1px solid var(--purple); box-shadow: 0 0 15px rgba(192, 132, 252, 0.25);" : "";[span_619](start_span)[span_619](end_span)
        let rarityText = isSuperRare ? "<span class='color-purple text-xs font-bold'>ЭКСКЛЮЗИВ</span>" : "<span class='color-amber text-xs'>БЛАТНОЙ</span>";[span_620](start_span)[span_620](end_span)

        html +=[span_621](start_span)[span_621](end_span)
        "<div class='glass-card flex-between p-2 mb-2' style='" + borderGlow + "'>" +[span_622](start_span)[span_622](end_span)
            "<div>" +[span_623](start_span)[span_623](end_span)
                "<div class='license-plate mb-1' style='font-size:15px; padding:4px 8px;'>" + item.plate + " <div class='license-flag'>RUS</div></div>" +[span_624](start_span)[span_624](end_span)
                rarityText +[span_625](start_span)[span_625](end_span)
            "</div>" +[span_626](start_span)[span_626](end_span)
            "<div class='text-right'>" +[span_627](start_span)[span_627](end_span)
                "<div class='price-val text-xs color-green mb-1'>" + item.price.toLocaleString() + " ₽</div>" +[span_628](start_span)[span_628](end_span)
                "<button onclick=\"buyBlackMarketPlate(" + idx + ")\" class='btn " + (isSuperRare ? "btn-purple" : "btn-amber") + " btn-sm btn-auto'>Выкупить</button>" +[span_629](start_span)[span_629](end_span)
            "</div>" +[span_630](start_span)[span_630](end_span)
        "</div>";[span_631](start_span)[span_631](end_span)
    });

    list.innerHTML = html;[span_632](start_span)[span_632](end_span)
}

function buyBlackMarketPlate(idx) {
    const lot = state.blackMarketPlates[idx];[span_633](start_span)[span_633](end_span)
    if (!lot) return;[span_634](start_span)[span_634](end_span)

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_635](start_span)[span_635](end_span)
    if (cash < lot.price) return showToast("Не хватает денег на покупку номера!");[span_636](start_span)[span_636](end_span)

    state.player.cash -= lot.price;[span_637](start_span)[span_637](end_span)
    if (!state.ownedPlates) state.ownedPlates = [];[span_638](start_span)[span_638](end_span)
    state.ownedPlates.push(lot.plate);[span_639](start_span)[span_639](end_span)

    state.blackMarketPlates.splice(idx, 1);[span_640](start_span)[span_640](end_span)
    saveState();[span_641](start_span)[span_641](end_span)
    updateHeaderUI();[span_642](start_span)[span_642](end_span)
    renderBlackMarketPlates();[span_643](start_span)[span_643](end_span)
    playSound('win');[span_644](start_span)[span_644](end_span)
    tgHaptic('success');[span_645](start_span)[span_645](end_span)
    openVerdictModal("НОМЕР ПРИОБРЕТЕН! 🏷️", "Госзнак «" + lot.plate + "» добавлен в ваш инвентарь. Можете установить его в Гараже, чтобы повысить стоимость любого автомобиля!", true);[span_646](start_span)[span_646](end_span)
}

// ----------------------------------------------------
// 4. АВТОКЛУБЫ СИНДИКАТА
// ----------------------------------------------------
function renderClubsList() {
    const container = document.getElementById('synClubsContainer');[span_647](start_span)[span_647](end_span)
    const myClubNameEl = document.getElementById('synMyClubName');[span_648](start_span)[span_648](end_span)
    if (!container) return;[span_649](start_span)[span_649](end_span)

    let myClub = (state.player && state.player.club) ? state.player.club : null;[span_650](start_span)[span_650](end_span)
    if (myClubNameEl) {[span_651](start_span)[span_651](end_span)
        myClubNameEl.innerText = myClub ? myClub.name : "Без автоклуба";[span_652](start_span)[span_652](end_span)
    }

    const clubsPool = [
        { id: "club_jdm", name: "JDM Legends Moscow", members: 42, perk: "+10% к оценке японских авто", fee: 100000 },[span_653](start_span)[span_653](end_span)
        { id: "club_vaz", name: "Боевая Классика Клуб", members: 89, perk: "Бесплатный ремонт подвески на сходках", fee: 40000 },[span_654](start_span)[span_654](end_span)
        { id: "club_m", name: "Bavarian Power M", members: 31, perk: "+15% к победе в заездах на 402м", fee: 250000 },[span_655](start_span)[span_655](end_span)
        { id: "club_elite", name: "Синдикат Олигархов", members: 12, perk: "-25% ко всем налогам и проверкам ГИБДД", fee: 1000000 }[span_656](start_span)[span_656](end_span)
    ];

    let html = "";[span_657](start_span)[span_657](end_span)
    clubsPool.forEach(club => {[span_658](start_span)[span_658](end_span)
        let isMember = myClub && myClub.id === club.id;[span_659](start_span)[span_659](end_span)
        let btnContent = isMember[span_660](start_span)[span_660](end_span)
            ? "<button onclick='leaveClubAction()' class='btn btn-danger btn-auto btn-sm'>Покинуть</button>[span_661](start_span)"[span_661](end_span)
            : "<button onclick=\"joinClubAction('" + club.id + "', '" + club.name + "', " + club.fee + ")\" class='btn btn-cyan btn-auto btn-sm'>Вступить (" + (club.fee / 1000).toFixed(0) + "k ₽)</button>";[span_662](start_span)[span_662](end_span)

        html +=[span_663](start_span)[span_663](end_span)
        "<div class='glass-card p-2 flex-between mb-2'>" +[span_664](start_span)[span_664](end_span)
            "<div>" +[span_665](start_span)[span_665](end_span)
                "<b class='color-cyan text-xs'>" + club.name + "</b>" +[span_666](start_span)[span_666](end_span)
                "<div class='sub-label' style='font-size:10px;'>👥 Участников: " + club.members + " | " + club.perk + "</div>" +[span_667](start_span)[span_667](end_span)
            "</div>" +[span_668](start_span)[span_668](end_span)
            btnContent +[span_669](start_span)[span_669](end_span)
        "</div>";[span_670](start_span)[span_670](end_span)
    });

    container.innerHTML = html;[span_671](start_span)[span_671](end_span)
}

function joinClubAction(clubId, clubName, fee) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_672](start_span)[span_672](end_span)
    if (cash < fee) return showToast("Не хватает денег на вступительный взнос!");[span_673](start_span)[span_673](end_span)

    state.player.cash -= fee;[span_674](start_span)[span_674](end_span)
    state.player.club = { id: clubId, name: clubName };[span_675](start_span)[span_675](end_span)
    saveState();[span_676](start_span)[span_676](end_span)
    updateHeaderUI();[span_677](start_span)[span_677](end_span)
    renderClubsList();[span_678](start_span)[span_678](end_span)
    playSound('win');[span_679](start_span)[span_679](end_span)
    tgHaptic('success');[span_680](start_span)[span_680](end_span)
    showToast("Вы вступили в автоклуб «" + clubName + "»!");[span_681](start_span)[span_681](end_span)
}

function leaveClubAction() {
    state.player.club = null;[span_682](start_span)[span_682](end_span)
    saveState();[span_683](start_span)[span_683](end_span)
    updateHeaderUI();[span_684](start_span)[span_684](end_span)
    renderClubsList();[span_685](start_span)[span_685](end_span)
    showToast("Вы покинули автоклуб.");[span_686](start_span)[span_686](end_span)
}

function createClubPrompt() {
    let name = prompt("Введите название нового автоклуба:");[span_687](start_span)[span_687](end_span)
    if (!name || !name.trim()) return;[span_688](start_span)[span_688](end_span)

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_689](start_span)[span_689](end_span)
    if (cash < 500000) return showToast("Нужно 500,000 ₽ на регистрацию клуба!");[span_690](start_span)[span_690](end_span)

    state.player.cash -= 500000;[span_691](start_span)[span_691](end_span)
    state.player.club = { id: "club_custom_" + Date.now(), name: name.trim() };[span_692](start_span)[span_692](end_span)
    saveState();[span_693](start_span)[span_693](end_span)
    updateHeaderUI();[span_694](start_span)[span_694](end_span)
    renderClubsList();[span_695](start_span)[span_695](end_span)
    playSound('win');[span_696](start_span)[span_696](end_span)
    tgHaptic('success');[span_697](start_span)[span_697](end_span)
    showToast("Автоклуб «" + name.trim() + "» успешно создан!");[span_698](start_span)[span_698](end_span)
}

// ----------------------------------------------------
// 5. ТОП ПЕРЕКУПОВ (ЛИДЕРБОРД)
// ----------------------------------------------------
function renderLeaderboard() {
    const container = document.getElementById('leaderboardListContainer');[span_699](start_span)[span_699](end_span)
    if (!container) return;[span_700](start_span)[span_700](end_span)

    const leaders = [
        { rank: 1, name: "Илюха DXF", profit: 142500000, lvl: 85, badge: "👑 ОЛИГАРХ" },[span_701](start_span)[span_701](end_span)
        { rank: 2, name: "Святой Максиман", profit: 98400000, lvl: 64, badge: "⚡ ХОЗЯИН РЫНКА" },[span_702](start_span)[span_702](end_span)
        { rank: 3, name: "Серёга Техно", profit: 76100000, lvl: 52, badge: "🔧 ТОП ДЕЛЕЦ" },[span_703](start_span)[span_703](end_span)
        { rank: 4, name: "Жиминка Пендосовская", profit: 54000000, lvl: 41, badge: "🤖 AI ПЕРЕКУП" },[span_704](start_span)[span_704](end_span)
        { 
            rank: 5, 
            name: (state.player && state.player.name) ? state.player.name : "Вы",[span_705](start_span)[span_705](end_span)
            profit: (state.player && state.player.stats && state.player.stats.totalNetProfit) ? state.player.stats.totalNetProfit : 0,[span_706](start_span)[span_706](end_span)
            lvl: (state.player && state.player.level) ? state.player.level : 1,[span_707](start_span)[span_707](end_span)
            badge: "🎯 ВЫ[span_708](start_span)"[span_708](end_span)
        }
    ];

    let html = "";[span_709](start_span)[span_709](end_span)
    leaders.forEach(lead => {[span_710](start_span)[span_710](end_span)
        let isMe = lead.rank === 5;[span_711](start_span)[span_711](end_span)
        let rankColor = lead.rank === 1 ? "color-amber" : (lead.rank === 2 ? "color-cyan" : (lead.rank === 3 ? "color-purple" : ""));[span_712](start_span)[span_712](end_span)

        html +=[span_713](start_span)[span_713](end_span)
        "<div class='glass-card p-2 flex-between mb-2 " + (isMe ? "border-cyan" : "") + "'>" +[span_714](start_span)[span_714](end_span)
            "<div class='flex-gap' style='align-items:center;'>" +[span_715](start_span)[span_715](end_span)
                "<b class='font-bold " + rankColor + "' style='font-size:14px; min-width:20px;'>#" + lead.rank + "</b>" +[span_716](start_span)[span_716](end_span)
                "<div>" +[span_717](start_span)[span_717](end_span)
                    "<b class='text-xs'>" + lead.name + "</b>" +[span_718](start_span)[span_718](end_span)
                    "<div class='sub-label' style='font-size:10px;'>Ур. " + lead.lvl + " | Чистая прибыль: <span class='color-green font-bold'>" + lead.profit.toLocaleString() + " ₽</span></div>" +[span_719](start_span)[span_719](end_span)
                "</div>" +[span_720](start_span)[span_720](end_span)
            "</div>" +[span_721](start_span)[span_721](end_span)
            "<span class='tag-badge " + (isMe ? "bg-tag-cyan" : "bg-tag-amber") + "'>" + lead.badge + "</span>" +[span_722](start_span)[span_722](end_span)
        "</div>";[span_723](start_span)[span_723](end_span)
    });

    container.innerHTML = html;[span_724](start_span)[span_724](end_span)
}

// ----------------------------------------------------
// 6. РЕФЕРАЛЬНАЯ СЕТЬ (ДРУЗЬЯ В TELEGRAM)
// ----------------------------------------------------
function getReferralLink() {
    let userId = "777";[span_725](start_span)[span_725](end_span)
    try {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {[span_726](start_span)[span_726](end_span)
            userId = window.Telegram.WebApp.initDataUnsafe.user.id;[span_727](start_span)[span_727](end_span)
        }
    } catch(e) {}
    return "https://t.me/PerekupSimBot?start=ref_" + userId;[span_728](start_span)[span_728](end_span)
}

function shareReferralLink() {
    const link = getReferralLink();[span_729](start_span)[span_729](end_span)
    const text = "Залетай со мной в «Симулятор Перекупа»! Поднимай кэш на авторынке и собирай гараж мечты.";[span_730](start_span)[span_730](end_span)
    const shareUrl = "https://t.me/share/url?url=" + encodeURIComponent(link) + "&text=" + encodeURIComponent(text);[span_731](start_span)[span_731](end_span)

    try {
        if (window.Telegram?.WebApp?.openTelegramLink) {[span_732](start_span)[span_732](end_span)
            window.Telegram.WebApp.openTelegramLink(shareUrl);[span_733](start_span)[span_733](end_span)
        } else {
            window.open(shareUrl, '_blank');[span_734](start_span)[span_734](end_span)
        }
    } catch(e) {
        window.open(shareUrl, '_blank');[span_735](start_span)[span_735](end_span)
    }
}

function copyReferralLink() {
    const link = getReferralLink();[span_736](start_span)[span_736](end_span)
    if (navigator.clipboard) {[span_737](start_span)[span_737](end_span)
        navigator.clipboard.writeText(link).then(() => {[span_738](start_span)[span_738](end_span)
            showToast("Ссылка скопирована в буфер обмена!");[span_739](start_span)[span_739](end_span)
        }).catch(() => {
            fallbackCopyText(link);[span_740](start_span)[span_740](end_span)
        });
    } else {
        fallbackCopyText(link);[span_741](start_span)[span_741](end_span)
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");[span_742](start_span)[span_742](end_span)
    textArea.value = text;[span_743](start_span)[span_743](end_span)
    document.body.appendChild(textArea);[span_744](start_span)[span_744](end_span)
    textArea.select();[span_745](start_span)[span_745](end_span)
    try {
        document.executeCommand('copy');[span_746](start_span)[span_746](end_span)
        showToast("Ссылка скопирована!");[span_747](start_span)[span_747](end_span)
    } catch(err) {
        showToast("Не удалось скопировать.");[span_748](start_span)[span_748](end_span)
    }
    document.body.removeChild(textArea);[span_749](start_span)[span_749](end_span)
}

function renderFriendsList() {
    const container = document.getElementById('friendsListContainer');[span_750](start_span)[span_750](end_span)
    const badge = document.getElementById('friendsCountBadge');[span_751](start_span)[span_751](end_span)
    if (!container) return;[span_752](start_span)[span_752](end_span)

    if (!state.friendsList || state.friendsList.length === 0) {[span_753](start_span)[span_753](end_span)
        state.friendsList = [
            { name: "Артем_BMW", earned: 50000, lvl: 14, date: "Сегодня" },[span_754](start_span)[span_754](end_span)
            { name: "Денис_Vaz", earned: 50000, lvl: 8, date: "Вчера" }[span_755](start_span)[span_755](end_span)
        ];
    }

    if (badge) badge.innerText = state.friendsList.length + " друзей";[span_756](start_span)[span_756](end_span)

    let html = "";[span_757](start_span)[span_757](end_span)
    state.friendsList.forEach(f => {[span_758](start_span)[span_758](end_span)
        html +=[span_759](start_span)[span_759](end_span)
        "<div class='glass-card p-2 flex-between mb-2'>" +[span_760](start_span)[span_760](end_span)
            "<div>" +[span_761](start_span)[span_761](end_span)
                "<b class='color-cyan text-xs'>" + f.name + "</b>" +[span_762](start_span)[span_762](end_span)
                "<div class='sub-label' style='font-size:10px;'>Уровень: " + f.lvl + " | Приглашён: " + f.date + "</div>" +[span_763](start_span)[span_763](end_span)
            "</div>" +[span_764](start_span)[span_764](end_span)
            "<span class='tag-badge bg-tag-green'>+50,000 ₽ получено</span>" +[span_765](start_span)[span_765](end_span)
        "</div>";[span_766](start_span)[span_766](end_span)
    });

    container.innerHTML = html;[span_767](start_span)[span_767](end_span)
}

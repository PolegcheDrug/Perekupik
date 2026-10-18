// ========================================================
// js/garage/garage.js — ГЛАВНЫЙ КОНТРОЛЛЕР ГАРАЖА (v1.7.3)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ========================================================

window.previewCarIndex = null;
window.garageFilter = window.garageFilter || 'all';

const safePlaySound = (snd) => { if (typeof playSound === 'function') playSound(snd); };
const safeTgHaptic = (type) => { if (typeof tgHaptic === 'function') tgHaptic(type); };
const safeShowToast = (msg) => { if (typeof showToast === 'function') showToast(msg); };
const safeSaveState = () => { if (typeof saveState === 'function') saveState(); };
const safeUpdateHeaderUI = () => { if (typeof updateHeaderUI === 'function') updateHeaderUI(); };

const safeSetTxt = (id, val) => {
    if (typeof setTxt === 'function') {
        setTxt(id, val);
    } else {
        const el = document.getElementById(id);
        if (el) el.innerHTML = val;
    }
};

const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

function ensureModal(id) {
    let modal = document.getElementById(id);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }
    return modal;
}

function safeGetCar(idx) {
    if (idx === null || idx === undefined || !state?.garage) return null;
    if (idx < 0 || idx >= state.garage.length) return null;
    return state.garage[idx] || null;
}

function _getFixedCarImage(car) {
    if (!car) return "assets/cars/economy/2101/vaz-2101.jpg";
    if (car.img) return car.img;
    if (Array.isArray(car.images) && car.images.length > 0) {
        return car.images[0];
    }
    return "assets/cars/economy/2101/vaz-2101.jpg";
}

function setGarageFilter(filter) {
    window.garageFilter = filter;
    safePlaySound('tick');
    safeTgHaptic('light');
    renderGarage();
}

function unassignCarFromGarage(idx) {
    const car = safeGetCar(idx);
    if (!car) return safeShowToast("❌ Машина не найдена");

    const bizId = car.assignedBusinessId;
    if (window.BusinessFleetModule && typeof window.BusinessFleetModule.unassignVehicle === 'function') {
        window.BusinessFleetModule.unassignVehicle(car.id || car.vin, bizId);
    } else {
        car.assignedBusinessId = null;
        car.assignedBusinessName = null;
        car.commercialRegistered = false;
        safeSaveState();
        safeShowToast("Машина возвращена в личный гараж");
        renderGarage();
    }
}

function openNeedCapabilityModal(type = 'tune', customTitle = null) {
    safePlaySound('error');
    safeTgHaptic('warning');

    const modal = ensureModal('modalNeedGarage');

    let title = "ТРЕБУЕТСЯ СПЕЦИАЛИЗИРОВАННЫЙ БОКС";
    let heading = (customTitle || "Действие") + " недоступно!";
    let desc = "Вы находитесь на уличной парковке. Здесь нет условий для выполнения этих работ.";
    let icon = "🔒";

    if (type === 'tune') {
        title = "ТРЕБУЕТСЯ СМОТРОВАЯ ЯМА И ВЕРСТАК";
        heading = (customTitle || "Слесарные работы и тюнинг") + " заблокированы!";
        desc = `Вы работаете на <b>уличной парковке</b> без смотровой ямы и оборудования.<br><br>
                🔩 Для тюнинга требуется <b>капитальный гаражный бокс (ГСК)</b>.<br><br>
                💡 Арендуйте бокс в приложении <b>«Жильё & Боксы»</b>!`;
        icon = "🔩";
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
            <p class="sub-label mb-3" style="font-size:10.5px; line-height:1.45;">${desc}</p>
            <div class="space-y-2 mb-3">
                <button onclick="ModalManager.close('modalNeedGarage'); switchTab('tabPhone'); setTimeout(() => { if (typeof PhoneManager !== 'undefined') PhoneManager.openApp('housing'); }, 150);" class="btn btn-cyan btn-sm w-full">
                    🏠 Открыть каталог «Жильё & Боксы»
                </button>
                <button onclick="ModalManager.close('modalNeedGarage')" class="btn btn-dark btn-sm w-full">Понятно</button>
            </div>
        </div>
    `;

    if (typeof ModalManager !== 'undefined' && typeof ModalManager.open === 'function') {
        ModalManager.open('modalNeedGarage');
    } else {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function openNeedGarageModal(actionTitle = "Тюнинг и доработки") {
    openNeedCapabilityModal('tune', actionTitle);
}

function _sortGarageCars(filter = 'all') {
    if (!state || !Array.isArray(state.garage)) return [];

    let indexed = state.garage.map((car, idx) => ({ car, originalIdx: idx }));

    if (filter === 'personal') {
        indexed = indexed.filter(item => {
            const c = item.car;
            return !c?.commercialRegistered && !c?.assignedBusinessId;
        });
    } else if (filter === 'commercial') {
        indexed = indexed.filter(item => {
            const c = item.car;
            return Boolean(c?.commercialRegistered || c?.assignedBusinessId);
        });
    }

    indexed.sort((a, b) => {
        const aPers = a.car?.isPersonal ? 1 : 0;
        const bPers = b.car?.isPersonal ? 1 : 0;
        if (aPers !== bPers) return bPers - aPers;

        const aBiz = a.car?.assignedBusinessId ? 1 : 0;
        const bBiz = b.car?.assignedBusinessId ? 1 : 0;
        if (aBiz !== bBiz) return bBiz - aBiz;

        const aVal = a.car?.marketValue || a.car?.basePrice || 0;
        const bVal = b.car?.marketValue || b.car?.basePrice || 0;
        return bVal - aVal;
    });

    return indexed;
}

function renderGarage() {
    const list = document.getElementById('garageList');
    if (!list) return;

    try {
        const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : (state.player?.baseSlots || 2);
        const currentSlots = Array.isArray(state.garage) ? state.garage.length : 0;

        let caps = { canTune: true, canDetail: true, category: 'garage', activeHouseTitle: 'Гаражный бокс' };
        try {
            if (typeof getPlayerHousingCapabilities === 'function') {
                caps = getPlayerHousingCapabilities() || caps;
            } else if (window.PhoneHousing && typeof window.PhoneHousing.getCapabilities === 'function') {
                caps = window.PhoneHousing.getCapabilities() || caps;
            }
        } catch (e) {
            console.warn('[Garage] getPlayerHousingCapabilities fallback:', e);
        }

        const canTune = Boolean(caps?.canTune);
        const activeHouseTitle = caps?.activeHouseTitle || 'Гаражный бокс';
        const statusPillClass = canTune ? "color-green" : (caps?.category === 'street' ? "color-red" : "color-amber");
        const statusPillText = canTune
            ? `<b class="${statusPillClass}">${currentSlots} из ${maxSlots} (Мастерская активна ✓)</b>`
            : `<b class="${statusPillClass}">${currentSlots} из ${maxSlots} (${escapeHtml(activeHouseTitle)})</b>`;

        safeSetTxt('garageDetailedSlots', statusPillText);
        safeSetTxt('garageHeaderSlots', `${currentSlots}/${maxSlots}`);

        if (!Array.isArray(state.garage) || state.garage.length === 0) {
            list.innerHTML = `
                <div class="glass-card text-center sub-label py-8">
                    <i class="fa-solid fa-warehouse color-cyan mb-2" style="font-size:36px;"></i>
                    <div class="font-bold text-xs color-cyan mb-1">Ваш автопарк пуст</div>
                    <div style="font-size:10px;">Отправляйтесь на авторынок, вскройте сарай или выкупите лот на P2P бирже!</div>
                </div>`;
            return;
        }

        const currentFilter = window.garageFilter || 'all';
        const totalCount = state.garage.length;
        const commCount = state.garage.filter(c => c && (c.commercialRegistered || c.assignedBusinessId)).length;
        const persCount = totalCount - commCount;

        let filterBarHtml = `
            <div class="glass-card mb-2 p-1" style="background:#090e18; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
                <div class="grid-3" style="gap:4px;">
                    <button onclick="setGarageFilter('all')" class="btn ${currentFilter === 'all' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9.5px; padding:6px 2px;">
                        Все (${totalCount})
                    </button>
                    <button onclick="setGarageFilter('personal')" class="btn ${currentFilter === 'personal' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9.5px; padding:6px 2px;">
                        🚗 Личные (${persCount})
                    </button>
                    <button onclick="setGarageFilter('commercial')" class="btn ${currentFilter === 'commercial' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9.5px; padding:6px 2px;">
                        💼 Бизнес (${commCount})
                    </button>
                </div>
            </div>
        `;

        const sortedPairs = _sortGarageCars(currentFilter);

        if (sortedPairs.length === 0) {
            let emptyDesc = "Нет машин в данной категории.";
            if (currentFilter === 'commercial') {
                emptyDesc = "У вас нет машин на балансе бизнеса. Оформите ТС на компанию в МРЭО или отправьте машину на линию в «Бизнес-Сети».";
            } else if (currentFilter === 'personal') {
                emptyDesc = "Все ваши автомобили распределены по коммерческим автопаркам.";
            }

            list.innerHTML = filterBarHtml + `
                <div class="glass-card text-center sub-label py-6">
                    <i class="fa-solid fa-car-side color-cyan mb-2" style="font-size:28px;"></i>
                    <div class="font-bold text-xs color-cyan mb-1">Список пуст</div>
                    <div style="font-size:9.5px;">${emptyDesc}</div>
                </div>`;
            return;
        }

        let html = filterBarHtml;

        sortedPairs.forEach((pair) => {
            const car = pair.car;
            const originalIdx = pair.originalIdx;
            if (!car) return;

            try {
                if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);
            } catch (e) {}

            const cName = escapeHtml(car.name || "Автомобиль");
            const cPower = car.power || 100;
            const rawImg = _getFixedCarImage(car);
            const cPlate = escapeHtml(car.customPlate || car.plate || "ТРАНЗИТ");
            const cPrice = (car.marketValue || car.basePrice || 100000).toLocaleString();

            let grade = { grade: 'A', label: 'Отличное', color: 'color-green' };
            try {
                if (typeof getCarConditionGrade === 'function') grade = getCarConditionGrade(car) || grade;
            } catch (e) {}

            const carImgAttrs = (typeof buildCarImageAttrs === 'function')
                ? buildCarImageAttrs(rawImg, car)
                : `src="${rawImg}" onerror="this.onerror=null; this.src='${car.fallback || 'assets/cars/economy/2101/vaz-2101.jpg'}'"`;

            const isPersonal = !!car.isPersonal;
            const isImpounded = !!car.impounded;
            const isAssignedToBiz = Boolean(car.assignedBusinessId);
            const isComRegistered = Boolean(car.commercialRegistered);

            const personalBadge = isPersonal
                ? "<span class='tag-badge bg-tag-amber'><i class='fa-solid fa-crown'></i> ЛИЧНЫЙ АВТО</span>"
                : "";

            let commercialBadge = "";
            if (isAssignedToBiz) {
                commercialBadge = `<span class='tag-badge bg-tag-green' title='Машина приносит доход на линии'><i class='fa-solid fa-briefcase'></i> ${escapeHtml(car.assignedBusinessName || 'БИЗНЕС')}</span>`;
            } else if (isComRegistered) {
                commercialBadge = `<span class='tag-badge bg-tag-cyan' title='ТС на балансе юрлица'><i class='fa-solid fa-building'></i> НА БАЛАНСЕ</span>`;
            }

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
                const daysLeft = Math.max(0, 10 - (car.ownershipDays || 0));
                const dkpClass = daysLeft === 0 ? "bg-tag-red" : "bg-tag-amber";
                legalBadge = `<span class='tag-badge ${dkpClass}'>ДКП (${daysLeft}д)</span>`;
            }

            let insuranceBadge = car.insurance
                ? "<span class='tag-badge bg-tag-green'>🛡️ СТРАХОВКА</span>"
                : "<span class='tag-badge bg-tag-red'>⚠️ БЕЗ ОСАГО</span>";

            const condVal = car.condition !== undefined ? car.condition : 80;
            const shieldIconClass = condVal >= 80 ? 'spec-tile-icon-shield' : (condVal >= 50 ? 'spec-tile-icon-shield-mid' : 'spec-tile-icon-shield-low');
            const condColorClass = condVal >= 80 ? 'color-green' : (condVal >= 50 ? 'color-amber' : 'color-red');

            let modsIconsHtml = '';
            try {
                if (typeof renderCarModsBadges === 'function') modsIconsHtml = renderCarModsBadges(car) || '';
            } catch (e) {}

            const brandHeaderHtml = (typeof formatCarBrandBadgeHtml === 'function')
                ? formatCarBrandBadgeHtml(car.name || "Автомобиль")
                : `<div class="car-title-plate">${cName}</div>`;

            let actionControlBlock = "";
            if (isImpounded) {
                actionControlBlock = `
                    <div class="p-2 mb-2" style="background:rgba(220,38,38,0.15); border:1px solid var(--red); border-radius:10px;">
                        <button onclick="openImpoundLotModal(${originalIdx})" class="btn btn-danger btn-sm w-full">
                            🚔 Штрафстоянка: Забрать автомобиль
                        </button>
                    </div>
                `;
            } else {
                const personalBtn = isPersonal
                    ? `<button onclick="togglePersonalCar(${originalIdx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-crown color-amber"></i> Снять личку</button>`
                    : `<button onclick="togglePersonalCar(${originalIdx})" class="btn btn-amber btn-sm" ${isAssignedToBiz ? 'disabled title="Сначала снимите авто с линии"' : ''}><i class="fa-solid fa-crown"></i> Сделать личным</button>`;

                let fleetActionBtn = "";
                if (isAssignedToBiz) {
                    fleetActionBtn = `
                        <div class="grid-2 mb-2">
                            <button onclick="if(window.BusinessFleetModule) BusinessFleetModule.renderFleetManagerModal('${car.assignedBusinessId}')" class="btn btn-amber btn-sm">
                                <i class="fa-solid fa-truck-ramp-box"></i> Автопарк точки
                            </button>
                            <button onclick="unassignCarFromGarage(${originalIdx})" class="btn btn-dark btn-sm">
                                <i class="fa-solid fa-arrow-right-from-bracket"></i> Снять с линии
                            </button>
                        </div>
                    `;
                }

                actionControlBlock = `
                    <div class="grid-3 mb-2">
                        <button onclick="openCarPreviewModal(${originalIdx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-clipboard-check color-cyan"></i> Инспекция</button>
                        <button onclick="openTuningModal(${originalIdx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-screwdriver-wrench ${canTune ? 'color-cyan' : ''}"></i> Тюнинг</button>
                        <button onclick="openPreSaleModal(${originalIdx})" class="btn btn-dark btn-sm"><i class="fa-solid fa-wand-magic-sparkles"></i> Детейлинг</button>
                    </div>

                    ${fleetActionBtn}

                    <div class="grid-2 mb-2">
                        ${personalBtn}
                        <button onclick="selectCarForStreetDirect(${originalIdx})" class="btn btn-red btn-sm"><i class="fa-solid fa-flag-checkered"></i> В Стрит / Дрифт</button>
                    </div>

                    <div>
                        <button onclick="openPutOnLotModal(${originalIdx})" class="btn btn-green btn-sm w-full" ${(isPersonal || isAssignedToBiz) ? 'disabled title="Снимите статус личного авто или снимите с линии бизнеса"' : ''}>
                            ${isPersonal ? '🔒 Личный авто (Не продаётся)' : (isAssignedToBiz ? '💼 На линии бизнеса (Не продаётся)' : '🏪 Выставить на продажу')}
                        </button>
                    </div>
                `;
            }

            const carUid = car.uid || car.id || ('car_idx_' + originalIdx);

            html += `
            <div class="glass-card mb-3 ${isPersonal ? 'personal-car-card' : ''}" data-car-idx="${originalIdx}" data-car-uid="${escapeHtml(carUid)}">
                <div class="car-img-wrap" style="height:190px;">
                    <img ${carImgAttrs} class="car-img">
                </div>

                <div class="car-header-row-volumetric">
                    <div style="flex:1; min-width:0; margin-right:8px;">
                        ${brandHeaderHtml}
                        <div class="car-status-badges-row mt-1">
                            <div class="plate-mini-capsule notranslate" translate="no">
                                ${cPlate} <span class="plate-flag-mini">RUS</span>
                            </div>
                            ${commercialBadge}
                            ${personalBadge}
                            ${legalBadge}
                            ${insuranceBadge}
                        </div>
                    </div>

                    <div class="car-price-badge-3d">
                        <span class="car-price-label-sub">Оценка рынка</span>
                        <span class="car-price-value-3d">${cPrice} ₽</span>
                    </div>
                </div>

                <div class="car-specs-grid-volumetric" style="margin-bottom: 6px !important;">
                    <div class="spec-tile-3d-col" style="min-height: 38px; padding: 4px 6px;">
                        <div class="spec-tile-icon-wrap spec-tile-icon-power" style="width: 18px; height: 18px; font-size: 9px;"><i class="fa-solid fa-bolt"></i></div>
                        <div class="spec-tile-col-data">
                            <span class="spec-tile-col-label" style="font-size: 7.5px;">Мощность</span>
                            <b class="color-amber" style="font-size: 10px;">${cPower} л.с.</b>
                        </div>
                    </div>
                    <div class="spec-tile-3d-col" style="min-height: 38px; padding: 4px 6px;">
                        <div class="spec-tile-icon-wrap spec-tile-icon-road" style="width: 18px; height: 18px; font-size: 9px;"><i class="fa-solid fa-road"></i></div>
                        <div class="spec-tile-col-data">
                            <span class="spec-tile-col-label" style="font-size: 7.5px;">Пробег</span>
                            <b class="color-cyan" style="font-size: 10px;">${(car.mileage || 85000).toLocaleString()} км</b>
                        </div>
                    </div>
                    <div class="spec-tile-3d-col" style="min-height: 38px; padding: 4px 6px;">
                        <div class="spec-tile-icon-wrap ${shieldIconClass}" style="width: 18px; height: 18px; font-size: 9px;"><i class="fa-solid fa-shield"></i></div>
                        <div class="spec-tile-col-data">
                            <span class="spec-tile-col-label" style="font-size: 7.5px;">Кузов</span>
                            <b class="${condColorClass}" style="font-size: 10px;">${condVal}%</b>
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
    } catch (err) {
        console.error('[Garage] Ошибка renderGarage:', err);
    }
}

function openCarPreviewModal(idx) {
    const car = safeGetCar(idx);
    if (!car) return safeShowToast("❌ Машина не найдена");

    window.previewCarIndex = idx;
    try {
        if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);
    } catch (e) {}

    const modal = ensureModal('modalPreview');
    const cPlate = escapeHtml(car.customPlate || car.plate || "ТРАНЗИТ");
    const engWear = car.wear?.engine !== undefined ? Math.round(car.wear.engine) : 85;
    const transWear = car.wear?.transmission !== undefined ? Math.round(car.wear.transmission) : 85;
    const tires = car.tireWear !== undefined ? Number(car.tireWear) : 100;
    const cond = car.condition !== undefined ? Number(car.condition) : 80;

    let grade = { grade: 'B', label: 'Хорошее', color: 'color-cyan' };
    try {
        if (typeof getCarConditionGrade === 'function') grade = getCarConditionGrade(car) || grade;
    } catch (e) {}

    const bodyDesc = car.isRepainted ? "Вторичный окрас кузова" : "Заводское ЛКП со следами эксплуатации";
    const engDesc = engWear < 50 ? "Требуется ремонт поршневой группы" : "Масло в норме, компрессия ровная";
    const transDesc = transWear < 50 ? "Износ синхронизаторов" : "Переключения чёткие";
    const salonDesc = car.cleanInterior ? "Химчистка выполнена ✓" : "Стандартный салон";

    let legalStatus = "<b class='color-amber'>ДКП (Без учёта)</b>";
    if (car.assignedBusinessId) legalStatus = `<b class='color-green'>Баланс предприятия (${escapeHtml(car.assignedBusinessName)})</b>`;
    else if (car.commercialRegistered) legalStatus = "<b class='color-cyan'>На балансе юрлица</b>";
    else if (car.isRegisteredOnPlayer) legalStatus = "<b class='color-green'>Учёт в МРЭО РФ</b>";

    modal.innerHTML = `
        <div class="modal-box text-left" style="max-width: 440px; max-height: 90vh; overflow-y: auto;">
            <div class="flex-between mb-2 pb-2" style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <div>
                    <h3 class="font-bold color-cyan mb-1">${escapeHtml(car.name)}</h3>
                    <div class="license-plate" style="font-size:10px; padding:2px 6px;">${cPlate} <div class="license-flag">RUS</div></div>
                </div>
                <div class="text-right">
                    <span class="sub-label text-xs">Оценка:</span>
                    <div class="price-val color-green" style="font-size:16px;">${(car.marketValue || 100000).toLocaleString()} ₽</div>
                </div>
            </div>

            <div class="space-y-1 mb-3">
                <div class="p-2" style="background:#090e18; border-radius:8px;">
                    <div class="flex-between text-xs mb-1">
                        <span>Кузов:</span> <b class="${cond < 50 ? 'color-red' : 'color-green'}">${cond}% HP</b>
                    </div>
                    <div class="sub-label" style="font-size:9px;">${bodyDesc}</div>
                </div>
                <div class="p-2" style="background:#090e18; border-radius:8px;">
                    <div class="flex-between text-xs mb-1">
                        <span>ДВС:</span> <b class="${engWear < 50 ? 'color-red' : 'color-green'}">${engWear}% ресурс</b>
                    </div>
                    <div class="sub-label" style="font-size:9px;">${engDesc}</div>
                </div>
                <div class="p-2" style="background:#090e18; border-radius:8px;">
                    <div class="flex-between text-xs mb-1">
                        <span>КПП:</span> <b class="${transWear < 50 ? 'color-red' : 'color-green'}">${transWear}% ресурс</b>
                    </div>
                    <div class="sub-label" style="font-size:9px;">${transDesc}</div>
                </div>
            </div>

            <div class="grid-2 mb-2">
                <button onclick="openGaugeModalFromPreview()" class="btn btn-dark btn-sm"><i class="fa-solid fa-microchip color-cyan mr-1"></i> Толщиномер</button>
                <button onclick="openOBD2ModalFromPreview()" class="btn btn-dark btn-sm"><i class="fa-solid fa-tablet-screen-button color-cyan mr-1"></i> Launch OBD2</button>
            </div>
            <div class="grid-2 mb-3">
                <button onclick="openTuningFromPreview()" class="btn btn-dark btn-sm"><i class="fa-solid fa-screwdriver-wrench color-amber mr-1"></i> Тюнинг</button>
                <button onclick="ModalManager.close('modalPreview')" class="btn btn-dark btn-sm">Закрыть</button>
            </div>
        </div>
    `;

    if (typeof ModalManager !== 'undefined' && typeof ModalManager.open === 'function') {
        ModalManager.open('modalPreview');
    } else {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
    safePlaySound('tick');
}

function openGaugeModalFromPreview() {
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) return;
    const car = safeGetCar(window.previewCarIndex);
    if (!car) return;
    if (typeof openGaugeModal === 'function') openGaugeModal(car.id);
}

function openOBD2ModalFromPreview() {
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) return;
    const car = safeGetCar(window.previewCarIndex);
    if (!car) return;
    if (typeof quickOBDScanMarketCar === 'function') quickOBDScanMarketCar(car.id);
}

function openTuningFromPreview() {
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) return;
    const idx = window.previewCarIndex;
    if (typeof ModalManager !== 'undefined' && typeof ModalManager.close === 'function') {
        ModalManager.close('modalPreview');
    }
    openTuningModal(idx);
}

function togglePersonalCar(idx) {
    const car = safeGetCar(idx);
    if (!car) return safeShowToast("❌ Машина не найдена");
    if (car.assignedBusinessId) return safeShowToast("🚫 Машина на линии бизнеса!");

    car.isPersonal = !car.isPersonal;
    if (car.isPersonal) {
        state.garage.forEach((c, i) => { if (i !== idx && c) c.isPersonal = false; });
        safeShowToast(`👑 «${car.name}» назначен личным авто!`);
    } else {
        safeShowToast(`Снят статус личного авто.`);
    }
    safeSaveState();
    renderGarage();
}

function selectCarForStreetDirect(idx) {
    const car = safeGetCar(idx);
    if (!car) return safeShowToast("❌ Машина не найдена");
    if (state.player) state.player.selectedStreetCarIndex = idx;
    safeSaveState();
    if (typeof switchTab === 'function') switchTab('tabPhone');
    setTimeout(() => {
        if (typeof PhoneManager !== 'undefined') PhoneManager.openApp('street');
    }, 120);
}

function buyGarageSlot() {
    const cost = (typeof getGarageSlotCost === 'function') ? getGarageSlotCost() : 100000;
    const cash = state.player?.cash || 0;
    if (cash < cost) return safeShowToast("Не хватает денег!");
    state.player.cash -= cost;
    state.player.baseSlots = (state.player.baseSlots || 2) + 1;
    safeSaveState();
    safeUpdateHeaderUI();
    renderGarage();
    safeShowToast("Гараж расширен!");
}

function openPutOnLotModal(idx) {
    const car = safeGetCar(idx);
    if (!car) return safeShowToast("❌ Машина не найдена");
    if (car.isPersonal) return safeShowToast("🚫 Это личный авто!");
    if (car.assignedBusinessId) return safeShowToast("🚫 Машина на линии бизнеса!");

    window.currentLotPutIndex = idx;
    window.currentLotPutUid = car.uid || car.id || null;
    if (typeof ModalManager !== 'undefined') ModalManager.open('modalPutOnLot');
}

function confirmPutOnLot() {
    const idx = window.currentLotPutIndex;
    if (idx === undefined || idx === null) return;
    const car = safeGetCar(idx);
    if (!car) return;

    const askInput = document.getElementById('lotAskingPriceInput');
    const price = parseInt(askInput?.value || 0, 10);
    if (isNaN(price) || price <= 0) return safeShowToast("Укажите цену!");

    state.garage.splice(idx, 1);
    if (!Array.isArray(state.salesLot)) state.salesLot = [];
    state.salesLot.push({ car: car, askingPrice: price, timer: 60, maxTimer: 60 });

    if (typeof ModalManager !== 'undefined') ModalManager.close('modalPutOnLot');
    safeSaveState();
    renderGarage();
    if (typeof renderSalesLot === 'function') renderSalesLot();
    safeUpdateHeaderUI();
    safeShowToast(`Выставлено на продажу!`);
}

Object.assign(window, {
    safeGetCar, ensureModal, openNeedCapabilityModal, openNeedGarageModal,
    renderGarage, openCarPreviewModal, openGaugeModalFromPreview, openOBD2ModalFromPreview,
    openTuningFromPreview, togglePersonalCar, selectCarForStreetDirect, buyGarageSlot,
    openPutOnLotModal, confirmPutOnLot, _sortGarageCars, _getFixedCarImage,
    setGarageFilter, unassignCarFromGarage
});

console.log('[🏠 garage v1.7.3] Стабильный рендер гаража ✓');

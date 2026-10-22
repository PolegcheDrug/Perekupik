// ========================================================
// js/garage/garage.js — ГЛАВНЫЙ КОНТРОЛЛЕР ГАРАЖА (v1.9.0-hybrid)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.9.0-hybrid (ПОЛКА ЗАПАСОВ И КАНИСТР + ИНТЕГРАЦИЯ С ПОЧТОЙ):
//   1. ПОЛКА ЗАПАСОВ В ГАРАЖЕ: отображение сохранённых канистр АИ-95, талонов и приборов.
//   2. БЫСТРАЯ ДОЗАПРАВКА: заправка бака прямо из гаражной канистры в 1 клик.
//   3. ВЫСТАВЛЕНИЕ РАСХОДНИКОВ НА P2P: возможность продать канистру или талон на бирже.
//   4. СОХРАНЕНО: управление номерами ГРЗ, перки синдиката [STS], торг продажи +-15%.
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

function _hasClubPerk(perkKey) {
    if (typeof window.hasClubPerk === 'function') {
        return window.hasClubPerk(perkKey);
    }
    const club = state?.player?.club;
    const clubId = typeof club === 'string' ? club : club?.id;
    if (clubId === 'sts') return true;
    if (Array.isArray(club?.perks) && club.perks.some(p => (p.id === perkKey || String(p.title || '').includes('братство')))) {
        return true;
    }
    return false;
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

// ========================================================
// ПОЛКА РАСХОДНИКОВ И КАНИСТР В ГАРАЖЕ
// ========================================================
function renderGarageSuppliesShelfHtml() {
    const items = state.player?.warehouse?.items || [];
    if (!Array.isArray(items) || items.length === 0) return '';

    const curFuel = state.player?.fuel || 0;

    let itemsHtml = items.map((it, idx) => {
        let actionBtn = '';
        if (it.type === 'canister') {
            actionBtn = `<button onclick="useGarageCanister(${idx})" class="btn btn-green btn-sm btn-auto" style="padding:3px 7px; font-size:8px;">Заправить (+${it.amount} ⛽)</button>`;
        } else if (it.type === 'tickets_bundle') {
            actionBtn = `<button onclick="useGarageTickets(${idx})" class="btn btn-purple btn-sm btn-auto" style="padding:3px 7px; font-size:8px;">Использовать</button>`;
        }

        return `
            <div class="p-1 flex-between mb-1" style="background:#050914; border-radius:6px; border:1px solid rgba(255,255,255,0.06);">
                <div class="flex-gap" style="align-items:center;">
                    <span style="font-size:15px;">${it.icon || '📦'}</span>
                    <div>
                        <b class="text-xs color-main" style="font-size:10px;">${escapeHtml(it.name)}</b>
                        <div class="sub-label" style="font-size:7.5px; color:#94a3b8;">${escapeHtml(it.desc || '')}</div>
                    </div>
                </div>
                <div class="flex-gap" style="gap:4px;">
                    ${actionBtn}
                    <button onclick="sellGarageSupplyItem(${idx})" class="btn btn-dark btn-sm btn-auto" style="padding:3px 6px; font-size:8px;">💰 Сдать</button>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="glass-card mb-2 p-2" style="background:#090e18; border:1px solid rgba(0,242,254,0.3); border-radius:12px;">
            <div class="flex-between mb-1">
                <div class="flex-gap" style="align-items:center;">
                    <i class="fa-solid fa-boxes-packing color-cyan"></i>
                    <b class="text-xs color-cyan" style="font-size:11px;">Полка запасов и канистр (${items.length} поз.)</b>
                </div>
                <span class="sub-label" style="font-size:8.5px;">В баке: <b class="${curFuel < 40 ? 'color-red' : 'color-green'}">${curFuel}/100 ⛽</b></span>
            </div>
            ${itemsHtml}
        </div>
    `;
}

function useGarageCanister(idx) {
    const items = state.player?.warehouse?.items || [];
    const it = items[idx];
    if (!it || it.type !== 'canister') return;

    let cur = state.player?.fuel || 0;
    if (cur >= 100) return safeShowToast("Бак уже полон на 100%!");

    let needed = 100 - cur;
    let take = Math.min(needed, it.amount || 0);

    state.player.fuel = cur + take;
    it.amount -= take;

    if (it.amount <= 0) {
        items.splice(idx, 1);
    } else {
        it.name = `Канистра АИ-95 (${it.amount} л)`;
    }

    safeSaveState();
    safeUpdateHeaderUI();
    safePlaySound('win');
    safeTgHaptic('success');
    safeShowToast(`⛽ Залито +${take} л в бак из канистры!`);
    renderGarage();
}

function useGarageTickets(idx) {
    const items = state.player?.warehouse?.items || [];
    const it = items[idx];
    if (!it || it.type !== 'tickets_bundle') return;

    let cur = state.player?.expressTickets || 0;
    let max = state.player?.maxExpressTickets || 25;
    if (cur >= max) return safeShowToast(`Лимит талонов полон (${max})!`);

    let needed = max - cur;
    let take = Math.min(needed, it.amount || 0);

    state.player.expressTickets = cur + take;
    it.amount -= take;

    if (it.amount <= 0) {
        items.splice(idx, 1);
    } else {
        it.name = `Пачка талонов (${it.amount} шт)`;
    }

    safeSaveState();
    safeUpdateHeaderUI();
    safePlaySound('win');
    safeTgHaptic('success');
    safeShowToast(`🎟️ Активировано +${take} талонов!`);
    renderGarage();
}

function sellGarageSupplyItem(idx) {
    const items = state.player?.warehouse?.items || [];
    const it = items[idx];
    if (!it) return;

    let payout = 0;
    if (it.type === 'canister') payout = Math.round((it.amount || 0) * 55);
    else if (it.type === 'tickets_bundle') payout = Math.round((it.amount || 0) * 8000);
    else payout = 10000;

    if (!confirm(`Продать «${it.name}» скупщикам за ${payout.toLocaleString()} ₽?`)) return;

    state.player.cash = (state.player.cash || 0) + payout;
    if (typeof logBankTransaction === 'function') {
        logBankTransaction(`Продажа запасов из гаража: ${it.name}`, payout, true);
    }

    items.splice(idx, 1);
    safeSaveState();
    safeUpdateHeaderUI();
    safePlaySound('win');
    safeTgHaptic('success');
    safeShowToast(`Продано: +${payout.toLocaleString()} ₽`);
    renderGarage();
}

// ========================================================
// ОСНОВНОЙ РЕНДЕР ГАРАЖА
// ========================================================
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
        const hasBrotherhood = _hasClubPerk('garage_brotherhood');
        const activeHouseTitle = caps?.activeHouseTitle || 'Гаражный бокс';
        const statusPillClass = canTune ? "color-green" : (caps?.category === 'street' ? "color-red" : "color-amber");
        const statusPillText = canTune
            ? `<b class="${statusPillClass}">${currentSlots} из ${maxSlots} (Мастерская активна ✓)</b>`
            : `<b class="${statusPillClass}">${currentSlots} из ${maxSlots} (${escapeHtml(activeHouseTitle)})</b>`;

        safeSetTxt('garageDetailedSlots', statusPillText);
        safeSetTxt('garageHeaderSlots', `${currentSlots}/${maxSlots}`);

        const shelfHtml = renderGarageSuppliesShelfHtml();

        if (!Array.isArray(state.garage) || state.garage.length === 0) {
            list.innerHTML = shelfHtml + `
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

            list.innerHTML = shelfHtml + filterBarHtml + `
                <div class="glass-card text-center sub-label py-6">
                    <i class="fa-solid fa-car-side color-cyan mb-2" style="font-size:28px;"></i>
                    <div class="font-bold text-xs color-cyan mb-1">Список пуст</div>
                    <div style="font-size:9.5px;">${emptyDesc}</div>
                </div>`;
            return;
        }

        let html = shelfHtml + filterBarHtml;

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
                        <button onclick="openImpoundLotModal(${originalIdx})" class="btn btn-danger btn-sm w-full font-bold">
                            🚔 Штрафстоянка: Забрать автомобиль
                        </button>
                    </div>
                `;
            } else {
                const personalBtn = isPersonal
                    ? `<button onclick="togglePersonalCar(${originalIdx})" class="btn btn-dark btn-sm" style="font-size:9.5px; padding:6px 4px;"><i class="fa-solid fa-crown color-amber mr-1"></i> Снять личку</button>`
                    : `<button onclick="togglePersonalCar(${originalIdx})" class="btn btn-amber btn-sm" style="font-size:9.5px; padding:6px 4px;" ${isAssignedToBiz ? 'disabled title="Сначала снимите авто с линии"' : ''}><i class="fa-solid fa-crown mr-1"></i> Сделать личным</button>`;

                let fleetActionBtn = "";
                if (isAssignedToBiz) {
                    fleetActionBtn = `
                        <div class="grid-2 mb-2" style="gap:6px;">
                            <button onclick="if(window.BusinessFleetModule) BusinessFleetModule.renderFleetManagerModal('${car.assignedBusinessId}')" class="btn btn-amber btn-sm font-bold" style="font-size:9.5px; padding:6px 0;">
                                <i class="fa-solid fa-truck-ramp-box mr-1"></i> Автопарк точки
                            </button>
                            <button onclick="unassignCarFromGarage(${originalIdx})" class="btn btn-dark btn-sm font-bold" style="font-size:9.5px; padding:6px 0;">
                                <i class="fa-solid fa-arrow-right-from-bracket mr-1"></i> Снять с линии
                            </button>
                        </div>
                    `;
                }

                actionControlBlock = `
                    <div class="grid-3 mb-2" style="gap:5px;">
                        <button onclick="openCarPreviewModal(${originalIdx})" class="btn btn-dark btn-sm font-bold" style="font-size:9.5px; padding:6px 2px;">
                            <i class="fa-solid fa-clipboard-check color-cyan mr-1"></i> Инспекция
                        </button>
                        <button onclick="openTuningModal(${originalIdx})" class="btn btn-dark btn-sm font-bold" style="font-size:9.5px; padding:6px 2px;">
                            <i class="fa-solid fa-screwdriver-wrench ${canTune ? 'color-cyan' : ''} mr-1"></i> Тюнинг
                        </button>
                        <button onclick="openPreSaleModal(${originalIdx})" class="btn btn-dark btn-sm font-bold" style="font-size:9.5px; padding:6px 2px;">
                            <i class="fa-solid fa-wand-magic-sparkles mr-1 color-amber"></i> Детейлинг
                        </button>
                    </div>

                    ${fleetActionBtn}

                    <div class="grid-2 mb-2" style="gap:6px;">
                        ${personalBtn}
                        <button onclick="selectCarForStreetDirect(${originalIdx})" class="btn btn-red btn-sm font-bold" style="font-size:9.5px; padding:6px 4px;">
                            <i class="fa-solid fa-flag-checkered mr-1"></i> В Стрит / Дрифт
                        </button>
                    </div>

                    <div>
                        <button onclick="openPutOnLotModal(${originalIdx})" class="btn btn-green btn-sm w-full font-bold" style="font-size:10.5px; padding:8px 0;" ${(isPersonal || isAssignedToBiz) ? 'disabled title="Снимите статус личного авто или снимите с линии бизнеса"' : ''}>
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
                        <div class="car-status-badges-row mt-1" style="flex-wrap:wrap; gap:4px;">
                            <div class="plate-mini-capsule notranslate" translate="no">
                                ${cPlate} <span class="plate-flag-mini">RUS</span>
                            </div>
                            ${hasBrotherhood ? `<span class='tag-badge bg-tag-purple' style="font-size:7.5px;">🛠️ [STS] -15% КЛУБ</span>` : ''}
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

// ========================================================
// ИНСПЕКЦИЯ АВТОМОБИЛЯ (С УПРАВЛЕНИЕМ НОМЕРАМИ)
// ========================================================
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
    const cond = car.condition !== undefined ? Number(car.condition) : 80;

    const bodyDesc = car.isRepainted ? "Вторичный окрас кузова" : "Заводское ЛКП со следами эксплуатации";
    const engDesc = engWear < 50 ? "Требуется ремонт поршневой группы" : "Масло в норме, компрессия ровная";
    const transDesc = transWear < 50 ? "Износ синхронизаторов" : "Переключения чёткие";

    modal.innerHTML = `
        <div class="modal-box text-left" style="max-width: 440px; max-height: 90vh; overflow-y: auto;">
            <div class="flex-between mb-2 pb-2" style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <div>
                    <h3 class="font-bold color-cyan mb-1" style="font-size:14px;">${escapeHtml(car.name)}</h3>
                    <div class="license-plate" onclick="openChangePlateModal()" style="font-size:10px; padding:2px 6px; cursor:pointer;" title="Нажмите, чтобы сменить или снять номера">
                        ${cPlate} <div class="license-flag">RUS</div>
                    </div>
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

            <div class="grid-2 mb-2" style="gap:6px;">
                <button onclick="openGaugeModalFromPreview()" class="btn btn-dark btn-sm font-bold" style="font-size:9.5px;"><i class="fa-solid fa-microchip color-cyan mr-1"></i> Толщиномер</button>
                <button onclick="openOBD2ModalFromPreview()" class="btn btn-dark btn-sm font-bold" style="font-size:9.5px;"><i class="fa-solid fa-tablet-screen-button color-cyan mr-1"></i> Launch OBD2</button>
            </div>
            <div class="grid-3 mb-2" style="gap:5px;">
                <button onclick="openTuningFromPreview()" class="btn btn-dark btn-sm font-bold" style="font-size:9px;"><i class="fa-solid fa-screwdriver-wrench color-amber mr-1"></i> Тюнинг</button>
                <button onclick="openChangePlateModal()" class="btn btn-dark btn-sm font-bold" style="font-size:9px;"><i class="fa-solid fa-id-card color-green mr-1"></i> Номера</button>
                <button onclick="ModalManager.close('modalPreview')" class="btn btn-dark btn-sm font-bold" style="font-size:9px;">Закрыть</button>
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
    if (typeof openOBD2Modal === 'function') {
        openOBD2Modal();
    } else if (typeof quickOBDScanMarketCar === 'function') {
        quickOBDScanMarketCar(car.id);
    }
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

// ========================================================
// МОДАЛЬНОЕ ОКНО ВЫСТАВЛЕНИЯ НА ПРОДАЖУ (БЫСТРЫЙ ВЫБОР ЦЕН +-15%)
// ========================================================
function openPutOnLotModal(idx) {
    const car = safeGetCar(idx);
    if (!car) return safeShowToast("❌ Машина не найдена");
    if (car.isPersonal) return safeShowToast("🚫 Это личный авто!");
    if (car.assignedBusinessId) return safeShowToast("🚫 Машина на линии бизнеса!");

    window.currentLotPutIndex = idx;
    window.currentLotPutUid = car.uid || car.id || null;

    const modal = ensureModal('modalPutOnLot');
    const marketValue = car.marketValue || car.basePrice || 100000;
    const cName = escapeHtml(car.name || "Автомобиль");
    const cPlate = escapeHtml(car.customPlate || car.plate || "ТРАНЗИТ");

    modal.innerHTML = `
        <div class="modal-box text-left" style="max-width: 400px;">
            <div class="flex-between mb-2 pb-2" style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <div class="modal-glow-badge"><i class="fa-solid fa-store"></i> ВЫСТАВЛЕНИЕ НА ПЛОЩАДКУ</div>
                <button onclick="ModalManager.close('modalPutOnLot')" class="btn btn-dark btn-auto btn-sm">✕</button>
            </div>

            <div class="p-3 mb-3" style="background: #090e18; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
                <div class="font-bold text-sm color-cyan mb-1 text-center" style="font-size:13px;">${cName}</div>
                <div class="text-xs sub-label mb-2 text-center">Госномер: <span class="license-plate" style="font-size: 10px; padding: 2px 6px;">${cPlate}</span></div>
                <div class="flex-between text-xs px-2 py-1" style="background: rgba(0, 230, 118, 0.1); border-radius: 6px;">
                    <span class="sub-label">Оценка рынка:</span>
                    <b class="color-green">${marketValue.toLocaleString()} ₽</b>
                </div>
            </div>

            <div class="sub-label text-xs mb-1.5 font-bold">Быстрый выбор цены:</div>
            <div class="grid-4 mb-2" style="gap: 4px;">
                <button onclick="setLotPrice(${marketValue * 0.85})" class="btn btn-dark btn-sm" style="padding: 6px 2px; font-size: 9.5px; display: flex; flex-direction: column; align-items: center; line-height:1.2;">
                    <span class="color-red font-bold">-15%</span>
                    <span style="font-size:8px; color:var(--amber);">${Math.round(marketValue * 0.85).toLocaleString()} ₽</span>
                </button>
                <button onclick="setLotPrice(${marketValue * 0.9})" class="btn btn-dark btn-sm" style="padding: 6px 2px; font-size: 9.5px; display: flex; flex-direction: column; align-items: center; line-height:1.2;">
                    <span class="color-amber font-bold">-10%</span>
                    <span style="font-size:8px; color:var(--amber);">${Math.round(marketValue * 0.9).toLocaleString()} ₽</span>
                </button>
                <button onclick="setLotPrice(${marketValue * 0.95})" class="btn btn-dark btn-sm" style="padding: 6px 2px; font-size: 9.5px; display: flex; flex-direction: column; align-items: center; line-height:1.2;">
                    <span class="color-amber font-bold">-5%</span>
                    <span style="font-size:8px; color:var(--amber);">${Math.round(marketValue * 0.95).toLocaleString()} ₽</span>
                </button>
                <button onclick="setLotPrice(${marketValue})" class="btn btn-cyan btn-sm" style="padding: 6px 2px; font-size: 9.5px; display: flex; flex-direction: column; align-items: center; line-height:1.2;">
                    <span class="font-bold">Рынок</span>
                    <span style="font-size:8px;">${Math.round(marketValue).toLocaleString()} ₽</span>
                </button>
            </div>
            <div class="grid-3 mb-3" style="gap: 4px;">
                <button onclick="setLotPrice(${marketValue * 1.05})" class="btn btn-dark btn-sm" style="padding: 6px 2px; font-size: 9.5px; display: flex; flex-direction: column; align-items: center; line-height:1.2;">
                    <span class="color-amber font-bold">+5%</span>
                    <span style="font-size:8px; color:var(--amber);">${Math.round(marketValue * 1.05).toLocaleString()} ₽</span>
                </button>
                <button onclick="setLotPrice(${marketValue * 1.1})" class="btn btn-dark btn-sm" style="padding: 6px 2px; font-size: 9.5px; display: flex; flex-direction: column; align-items: center; line-height:1.2;">
                    <span class="color-amber font-bold">+10%</span>
                    <span style="font-size:8px; color:var(--amber);">${Math.round(marketValue * 1.1).toLocaleString()} ₽</span>
                </button>
                <button onclick="setLotPrice(${marketValue * 1.15})" class="btn btn-dark btn-sm" style="padding: 6px 2px; font-size: 9.5px; display: flex; flex-direction: column; align-items: center; line-height:1.2;">
                    <span class="color-green font-bold">+15%</span>
                    <span style="font-size:8px; color:var(--amber);">${Math.round(marketValue * 1.15).toLocaleString()} ₽</span>
                </button>
            </div>

            <div class="sub-label text-xs mb-1 font-bold">Ваша цена (₽):</div>
            <input type="number" id="lotAskingPriceInput" value="${marketValue}" oninput="updateLotPricePreview()" style="width:100%; background:#090e18; border:1px solid var(--border-glow); border-radius:8px; padding:10px; color:#fff; font-size:16px; margin-bottom:12px; text-align:center; font-weight:bold; color:var(--cyan);" min="1">

            <div id="lotPricePreview" class="p-2 mb-3 text-xs" style="background: rgba(0, 242, 254, 0.05); border-radius: 8px; border: 1px solid rgba(0, 242, 254, 0.2);"></div>

            <div class="grid-2" style="gap:6px;">
                <button onclick="confirmPutOnLot()" class="btn btn-green font-bold">Выставить</button>
                <button onclick="ModalManager.close('modalPutOnLot')" class="btn btn-dark font-bold">Отмена</button>
            </div>
        </div>
    `;

    setTimeout(() => {
        if (typeof updateLotPricePreview === 'function') updateLotPricePreview();
    }, 10);

    if (typeof ModalManager !== 'undefined' && typeof ModalManager.open === 'function') {
        ModalManager.open('modalPutOnLot');
    } else {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function setLotPrice(price) {
    const input = document.getElementById('lotAskingPriceInput');
    if (input) {
        input.value = Math.round(price);
        updateLotPricePreview();
        safePlaySound('tick');
        safeTgHaptic('light');
    }
}

function updateLotPricePreview() {
    const input = document.getElementById('lotAskingPriceInput');
    const preview = document.getElementById('lotPricePreview');
    if (!input || !preview) return;

    const price = parseInt(input.value, 10) || 0;
    const car = safeGetCar(window.currentLotPutIndex);
    if (!car) return;

    const marketValue = car.marketValue || car.basePrice || 100000;
    const diff = price - marketValue;
    const percent = ((price / marketValue) * 100 - 100).toFixed(1);

    let color = 'color-cyan';
    let hint = 'Цена соответствует рынку.';
    let speed = 'Средний спрос (ожидание ~30 сек)';
    let speedColor = 'color-cyan';

    if (price < marketValue * 0.85) {
        color = 'color-red';
        hint = 'Слишком низкая цена! Вы теряете потенциальную выгоду.';
        speed = 'Мгновенная продажа (ожидание ~10 сек)';
        speedColor = 'color-green';
    } else if (price < marketValue * 0.95) {
        color = 'color-green';
        hint = 'Выгодное предложение для покупателя.';
        speed = 'Быстрая продажа (ожидание ~20 сек)';
        speedColor = 'color-green';
    } else if (price > marketValue * 1.15) {
        color = 'color-red';
        hint = 'Завышенная цена. Покупатели пройдут мимо.';
        speed = 'Очень долгая продажа (ожидание 2+ мин)';
        speedColor = 'color-red';
    } else if (price > marketValue * 1.05) {
        color = 'color-amber';
        hint = 'Цена выше рынка. Придется ждать своего покупателя.';
        speed = 'Затяжная продажа (ожидание ~90 сек)';
        speedColor = 'color-amber';
    }

    preview.innerHTML = `
        <div class="flex-between mb-1">
            <span class="sub-label">Отклонение от рынка:</span>
            <b class="${color}">${diff > 0 ? '+' : ''}${percent}%</b>
        </div>
        <div class="flex-between mb-1">
            <span class="sub-label">Ожидаемый спрос:</span>
            <b class="${speedColor}" style="font-size: 10px;">${speed}</b>
        </div>
        <div class="text-center mt-2 font-bold" style="font-size: 9.5px; color: #94a3b8;">${hint}</div>
    `;

    const btn = document.querySelector('#modalPutOnLot .btn-green');
    if (btn) {
        if (price <= 0) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }
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
    setGarageFilter, unassignCarFromGarage, setLotPrice, updateLotPricePreview,
    renderGarageSuppliesShelfHtml, useGarageCanister, useGarageTickets, sellGarageSupplyItem
});

console.log('[🏠 garage v1.9.0-hybrid] Полка запасов канистр и талонов в Гараже активирована ✓');

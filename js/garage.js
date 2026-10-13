// ========================================================
// js/garage.js — ГЛАВНЫЙ КОНТРОЛЛЕР ГАРАЖА
// ========================================================

window.previewCarIndex = null;

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
    return state.garage[idx] || null;
}

function openNeedCapabilityModal(type = 'tune', customTitle = null) {
    safePlaySound('error');
    safeTgHaptic('warning');

    const modal = ensureModal('modalNeedGarage');

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

function renderGarage() {
    const list = document.getElementById('garageList');
    if (!list) return;

    const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : (state.player?.baseSlots || 2);
    const currentSlots = Array.isArray(state.garage) ? state.garage.length : 0;
    const caps = getPlayerHousingCapabilities();
    
    const statusPillClass = caps.canTune ? "color-green" : (caps.category === 'street' ? "color-red" : "color-amber");
    const statusPillText = caps.canTune 
        ? `<b class="${statusPillClass}">${currentSlots} из ${maxSlots} (Мастерская активна ✓)</b>`
        : `<b class="${statusPillClass}">${currentSlots} из ${maxSlots} (${escapeHtml(caps.activeHouseTitle)})</b>`;

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

    let html = "";
    state.garage.forEach((car, idx) => {
        if (!car) return;

        recalculateCarMarketValue(car);

        const cName = escapeHtml(car.name || "Автомобиль");
        const cPower = car.power || 100;
        const rawImg = car.img || "assets/cars/economy/2101/vaz-2101.jpg";
        const cImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
        const cPlate = escapeHtml(car.customPlate || car.plate || "ТРАНЗИТ");
        const cPrice = (car.marketValue || car.basePrice || 100000).toLocaleString();

        const isPersonal = !!car.isPersonal;
        const isImpounded = !!car.impounded;

        const personalBadge = isPersonal 
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
            const daysLeft = Math.max(0, 10 - (car.ownershipDays || 0));
            const dkpClass = daysLeft === 0 ? "bg-tag-red" : "bg-tag-amber";
            const ledClass = daysLeft === 0 ? "led-amber" : "led-green";
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

        const pVal = (typeof calculatePlateValue === 'function') ? calculatePlateValue(car.customPlate || car.plate || "") : 0;
        const coolPlateBadge = pVal > 15000 
            ? `<span class='tag-badge badge-shimmer-gold'>🏷️ БЛАТНОЙ</span>`
            : "";

        const tempVal = car.engineTemp || 90;
        const tempBadge = tempVal > 105 ? `<span class='tag-badge bg-tag-red'>🔥 ${tempVal}°C</span>` : "";

        const tireVal = car.tireWear !== undefined ? car.tireWear : 100;
        const tireBadge = tireVal < 35 ? `<span class='tag-badge bg-tag-red'>🛞 ${tireVal}%</span>` : "";

        const condVal = car.condition !== undefined ? car.condition : 80;
        const shieldIconClass = condVal >= 80 
            ? 'spec-tile-icon-shield' 
            : (condVal >= 50 ? 'spec-tile-icon-shield-mid' : 'spec-tile-icon-shield-low');
        const condColorClass = condVal >= 80 
            ? 'color-green' 
            : (condVal >= 50 ? 'color-amber' : 'color-red');

        const modsIconsHtml = renderCarModsBadges(car);

        const brandHeaderHtml = (typeof formatCarBrandBadgeHtml === 'function') 
            ? formatCarBrandBadgeHtml(car.name || "Автомобиль") 
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
            const personalBtn = isPersonal
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
                <img src="${cImg}" class="car-img" onerror="this.onerror=null; this.src='${car.fallback || 'assets/cars/economy/2101/vaz-2101.jpg'}';">
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

function openCarPreviewModal(idx) {
    window.previewCarIndex = idx;
    const car = safeGetCar(idx);
    if (!car) return;

    recalculateCarMarketValue(car);
    const modal = ensureModal('modalPreview');

    const cPlate = escapeHtml(car.customPlate || car.plate || "ТРАНЗИТ");
    const engWear = car.wear?.engine ? Math.round(car.wear.engine) : 85;
    const transWear = car.wear?.transmission ? Math.round(car.wear.transmission) : 85;
    const tires = car.tireWear !== undefined ? Number(car.tireWear) : 100;
    const cond = car.condition !== undefined ? Number(car.condition) : 80;

    const bodyDesc = car.isRepainted 
        ? "Вторичный окрас кузова (шпаклёвка на арках)" 
        : (car.isPolished ? "Заводской окрас, зеркальный глянец ✓" : "Заводское ЛКП со следами эксплуатации");

    const engDesc = car.hasAdditive
        ? "Залита демпферная присадка (стуки мотора замаскированы)"
        : (engWear < 50 ? "Требуется капитальный ремонт поршневой группы" : "Масло в норме, компрессия ровная");

    const transDesc = transWear < 50
        ? "Износ фрикционов/синхронизаторов, люфт приводов"
        : "Передачи включаются чётко, сцепление держит зацеп";

    const salonDesc = car.cleanInterior
        ? "Глубокая химчистка с озонацией, запах свежести ✓"
        : (car.isBeaterProject ? "Салон прокурен, потёртости на руле и сиденьях" : "Штатный ухоженный салон");

    const legalStatus = car.isRegisteredOnPlayer
        ? "<b class='color-green'>Учёт в МРЭО РФ оформлен ✓</b>"
        : "<b class='color-amber'>Договор ДКП (Без постановки на учёт)</b>";

    const insStatus = car.insurance
        ? (car.insurance.type === 'comprehensive' ? "<b class='color-green'>КАСКО (Полное покрытие)</b>" : "<b class='color-cyan'>ОСАГО (Действует)</b>")
        : "<b class='color-red'>Отсутствует (Езда на свой страх и риск!)</b>";

    modal.innerHTML = `
        <div class="modal-box text-left" style="max-width: 440px;">
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
    safePlaySound('tick');
}

function openTuningFromPreview() {
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) return;
    const idx = window.previewCarIndex;
    ModalManager.close('modalPreview');
    openTuningModal(idx);
}

function togglePersonalCar(idx) {
    const car = safeGetCar(idx);
    if (!car) return;

    if (!car.isPersonal && !checkPlayerCapability('personal')) {
        return openNeedCapabilityModal('personal', "Назначение личного автомобиля");
    }

    if (car.isPersonal) {
        car.isPersonal = false;
        safeShowToast(`«${car.name}» больше не является личным авто.`);
    } else {
        state.garage.forEach(c => { if (c) c.isPersonal = false; });
        car.isPersonal = true;
        if (state.player) state.player.selectedStreetCarIndex = idx;
        
        safePlaySound('win');
        safeTgHaptic('success');
        safeShowToast(`👑 «${car.name}» назначен вашим личным автомобилем!`);
    }

    safeSaveState();
    renderGarage();
}

function selectCarForStreetDirect(idx) {
    const car = safeGetCar(idx);
    if (!car) return;

    checkUninsuredDriveRisk(car);

    if (state.player) state.player.selectedStreetCarIndex = idx;
    safeSaveState();
    if (typeof switchTab === 'function') switchTab('tabPhone');
    setTimeout(() => {
        if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.openApp === 'function') {
            PhoneManager.openApp('street');
        }
    }, 120);
}

function buyGarageSlot() {
    const cost = (typeof getGarageSlotCost === 'function') ? getGarageSlotCost() : 100000;
    const cash = state.player?.cash || 0;
    if (cash < cost) return safeShowToast("Не хватает денег на покупку бокса!");

    state.player.cash -= cost;
    state.player.baseSlots = (state.player.baseSlots || 2) + 1;
    safeSaveState();
    safeUpdateHeaderUI();
    renderGarage();
    safePlaySound('win');
    safeTgHaptic('success');
    safeShowToast(`Гараж расширен! Новая вместимость: ${(typeof getTotalGarageSlots === 'function' ? getTotalGarageSlots() : state.player.baseSlots)} мест.`);
}

function openPutOnLotModal(idx) {
    const car = safeGetCar(idx);
    if (!car) return;

    if (car.isPersonal) {
        return safeShowToast("🚫 Это ваш личный авто! Снимите статус лички перед продажей.");
    }

    recalculateCarMarketValue(car);

    const askInput = document.getElementById('lotAskingPriceInput');
    const titleEl = document.getElementById('lotPutCarTitle');
    const costEl = document.getElementById('lotCostInfo');

    if (titleEl) titleEl.innerText = `${car.name} (${car.power || 100} л.с.)`;
    if (costEl) costEl.innerText = `Себестоимость выкупа: ${(car.purchaseCost || car.basePrice || 100000).toLocaleString()} ₽`;
    if (askInput) askInput.value = Math.round((car.marketValue || car.basePrice || 100000) * 1.25);

    window.currentLotPutIndex = idx;
    ModalManager.open('modalPutOnLot');
    safePlaySound('tick');
}

function confirmPutOnLot() {
    const idx = window.currentLotPutIndex;
    if (idx === undefined || idx === null) return;
    const car = safeGetCar(idx);
    if (!car) return;

    const askInput = document.getElementById('lotAskingPriceInput');
    const price = parseInt(askInput?.value || 0, 10);
    if (isNaN(price) || price <= 0) return safeShowToast("Укажите корректную цену продажи!");

    state.garage.splice(idx, 1);
    if (!Array.isArray(state.salesLot)) state.salesLot = [];

    const waitTime = (typeof calculateLotWaitTime === 'function') 
        ? calculateLotWaitTime(car) 
        : Math.floor(40 + Math.random() * 80);

    state.salesLot.push({
        car: car,
        askingPrice: price,
        timer: waitTime,
        maxTimer: waitTime,
        currentBuyer: null,
        buyerTimerLeft: 0
    });

    ModalManager.close('modalPutOnLot');
    safeSaveState();
    renderGarage();
    if (typeof renderSalesLot === 'function') renderSalesLot();
    safeUpdateHeaderUI();
    safePlaySound('win');
    safeTgHaptic('success');
    safeShowToast(`«${car.name}» выставлен на площадку продажи!`);
}

Object.assign(window, {
    safeGetCar,
    ensureModal,
    openNeedCapabilityModal,
    openNeedGarageModal,
    renderGarage,
    openCarPreviewModal,
    openTuningFromPreview,
    togglePersonalCar,
    selectCarForStreetDirect,
    buyGarageSlot,
    openPutOnLotModal,
    confirmPutOnLot
});
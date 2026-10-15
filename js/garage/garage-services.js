// ========================================================
// js/garage-services.js — ТЮНИНГ, ДЕТЕЙЛИНГ И СТРАХОВАНИЕ (v1.3.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.3.0:
//   - insuranceOptions корректно сбрасывается при каждом открытии.
//   - Ваучер КАСКО из Авто-Маркета бесплатно оформляет полис.
//   - activeTuningCarIndex / activePreSaleCarIndex сброс в close.
//   - Защита от двойного клика по покупкам.
//   - Проверка уже наложенного полиса.
//   - buyChipStage: не даёт поставить младший Stage после старшего.
// ========================================================

let activeTuningCarIndex = null;
let activePreSaleCarIndex = null;
let activeTuneTab = 'engine';

// ⭐ v1.3.0: флаги защиты от двойного клика
let _tuneBuyPending = false;
let _insuranceBuyPending = false;

// ⭐ v1.3.0: дефолт для страховки, сбрасывается при каждом открытии
const DEFAULT_INSURANCE_OPTIONS = {
    osago: true,
    totalLoss: false,
    theft: false,
    roadside: false
};

let insuranceOptions = { ...DEFAULT_INSURANCE_OPTIONS };

// ========================================================
// --- СТРАХОВАНИЕ ---
// ========================================================
function openInsuranceModalFromPreview() {
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) {
        return showToast("Сначала выберите автомобиль для инспекции!");
    }
    const car = safeGetCar(window.previewCarIndex);
    if (!car) return;

    // ⭐ v1.3.0: КРИТИЧЕСКИЙ ФИКС — сброс опций между авто
    insuranceOptions = { ...DEFAULT_INSURANCE_OPTIONS };

    // ⭐ v1.3.0: если уже есть полис — предложить продление
    if (car.insurance) {
        const existingType = car.insurance.type === 'comprehensive' ? 'КАСКО' : 'ОСАГО';
        if (!confirm(`На это авто уже оформлен полис ${existingType}.\nОформить новый полис взамен старого?`)) {
            return;
        }
        car.insurance = null;
    }

    ModalManager.close('modalPreview');
    renderInsuranceContractUI(car);
    ModalManager.open('modalInsurance');
    if (typeof playSound === 'function') playSound('tick');
}

function renderInsuranceContractUI(car) {
    const modal = ensureModal('modalInsurance');
    const cPlate = escapeHtml(car.customPlate || car.plate || "ТРАНЗИТ");

    let totalCash = INSURANCE_CONFIG.baseOsagoCost;
    let totalStars = INSURANCE_CONFIG.baseStars;

    if (insuranceOptions.theft) {
        totalCash += INSURANCE_CONFIG.theft.cash;
        totalStars += INSURANCE_CONFIG.theft.stars;
    }
    if (insuranceOptions.totalLoss) {
        totalCash += INSURANCE_CONFIG.totalLoss.cash;
        totalStars += INSURANCE_CONFIG.totalLoss.stars;
    }
    if (insuranceOptions.roadside) {
        totalCash += INSURANCE_CONFIG.roadside.cash;
        totalStars += INSURANCE_CONFIG.roadside.stars;
    }

    // ⭐ v1.3.0: ваучер КАСКО из маркета
    const hasVoucher = !!state.player.hasKasKoVoucher;
    if (hasVoucher) {
        totalCash = 0;
        totalStars = 0;
    }

    const starRate = window.BANK_EXCHANGE_RATES?.stars?.buyRub || 2500;
    const starsRubEquiv = totalStars > 0 ? ` (${(totalStars * starRate).toLocaleString()} ₽)` : "";

    modal.innerHTML = `
        <div class="modal-box text-left" style="max-width: 420px;">
            <div class="modal-glow-badge mb-1" style="color:var(--cyan); border-color:rgba(0,242,254,0.4);">
                📋 СТРАХОВАНИЕ АВТОМОБИЛЯ (РСА)
            </div>
            <h3 class="font-bold color-cyan mb-1">${escapeHtml(car.name)}</h3>
            <div class="sub-label mb-3">Госномер: <b>${cPlate}</b></div>

            ${hasVoucher ? `
                <div class="p-2 mb-2 text-center" style="background:rgba(255,215,0,0.15); border-radius:8px; border:1px solid #ffd700;">
                    <b class="color-amber text-xs">🎫 У ВАС ЕСТЬ ВАУЧЕР КАСКО!</b>
                    <div class="sub-label" style="font-size:9px;">Полис будет оформлен бесплатно. Ваучер сгорит после подписи.</div>
                </div>
            ` : ''}

            <div class="space-y-2 mb-3">
                <div class="p-2 glass-card selected" style="border-color:var(--green);">
                    <div class="flex-between text-xs mb-1">
                        <b class="color-green">1. Полис ОСАГО (Обязательный)</b>
                        <span class="tag-badge bg-tag-green">${hasVoucher ? 'БЕСПЛАТНО' : INSURANCE_CONFIG.baseOsagoCost.toLocaleString() + ' ₽'}</span>
                    </div>
                    <div class="sub-label" style="font-size:9px;">Защита от штрафов ДПС (ст. 12.37) и покрытие ущерба чужим авто до 400,000 ₽.</div>
                </div>

                <div class="p-2 glass-card ${insuranceOptions.totalLoss ? 'selected' : ''}" onclick="toggleInsuranceOption('totalLoss')" style="cursor:pointer;">
                    <div class="flex-between text-xs mb-1">
                        <b class="color-amber">2. Пакет КАСКО «Тотал & Угон»</b>
                        <span class="tag-badge ${insuranceOptions.totalLoss ? 'bg-tag-amber' : 'bg-tag-dark'}">${hasVoucher ? 'ВХОДИТ' : '+22,000 ₽'}</span>
                    </div>
                    <div class="sub-label" style="font-size:9px;">Выплата 85% рыночной стоимости машины даже при полном уничтожении кузова.</div>
                </div>

                <div class="p-2 glass-card ${insuranceOptions.roadside ? 'selected' : ''}" onclick="toggleInsuranceOption('roadside')" style="cursor:pointer;">
                    <div class="flex-between text-xs mb-1">
                        <b class="color-purple">3. Служба «Эвакуация 24/7»</b>
                        <span class="tag-badge ${insuranceOptions.roadside ? 'bg-tag-purple' : 'bg-tag-dark'}">${hasVoucher ? 'ВХОДИТ' : '+4,500 ₽'}</span>
                    </div>
                    <div class="sub-label" style="font-size:9px;">Бесплатный эвакуатор при поломке мотора или ДТП.</div>
                </div>
            </div>

            <div class="p-2 mb-3 flex-between" style="background:#090e18; border-radius:8px;">
                <span class="sub-label text-xs">Итого к оплате:</span>
                <b class="color-green text-xs" style="font-size:14px;">
                    ${hasVoucher ? '🎫 БЕСПЛАТНО' : `${totalCash.toLocaleString()} ₽${totalStars > 0 ? ` + ${totalStars} ⭐${starsRubEquiv}` : ''}`}
                </b>
            </div>

            <div class="grid-2 mb-2">
                <button onclick="confirmSignInsurancePolicy(${totalCash}, ${totalStars})" class="btn btn-green btn-sm" ${_insuranceBuyPending ? 'disabled' : ''}>
                    ${hasVoucher ? 'Активировать ваучер ✓' : 'Оформить полис ✓'}
                </button>
                <button onclick="driveWithoutInsuranceWarning()" class="btn btn-red btn-sm">
                    Ездить без страховки ⚠️
                </button>
            </div>

            <button onclick="closeInsuranceModal()" class="btn btn-dark w-full">Отмена</button>
        </div>
    `;
}

function closeInsuranceModal() {
    // ⭐ v1.3.0: сброс опций при закрытии
    insuranceOptions = { ...DEFAULT_INSURANCE_OPTIONS };
    _insuranceBuyPending = false;

    ModalManager.close('modalInsurance');

    if (window.previewCarIndex !== null && window.previewCarIndex !== undefined) {
        openCarPreviewModal(window.previewCarIndex);
    }
}

function toggleInsuranceOption(optionKey) {
    insuranceOptions[optionKey] = !insuranceOptions[optionKey];
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');

    if (window.previewCarIndex !== null && window.previewCarIndex !== undefined) {
        const car = safeGetCar(window.previewCarIndex);
        if (car) renderInsuranceContractUI(car);
    }
}

function confirmSignInsurancePolicy(totalCash, totalStars) {
    if (_insuranceBuyPending) return;

    if (window.previewCarIndex === null || window.previewCarIndex === undefined) return;
    const car = safeGetCar(window.previewCarIndex);
    if (!car) return;

    // ⭐ v1.3.0: ваучер обнуляет цену
    const hasVoucher = !!state.player.hasKasKoVoucher;
    if (hasVoucher) {
        totalCash = 0;
        totalStars = 0;
    }

    const cash = state.player?.cash || 0;
    const stars = state.player?.stars || 0;

    if (cash < totalCash) return showToast("Не хватает рублей на оплату полиса!");
    if (stars < totalStars) return showToast(`Не хватает ${totalStars} Stars ⭐!`);

    _insuranceBuyPending = true;

    try {
        if (totalCash > 0) state.player.cash -= totalCash;
        if (totalStars > 0) state.player.stars -= totalStars;

        const isCasco = insuranceOptions.totalLoss;
        car.insurance = {
            type: isCasco ? 'comprehensive' : 'osago',
            options: { ...insuranceOptions },
            cost: totalCash,
            starsCost: totalStars,
            date: Date.now(),
            usedVoucher: hasVoucher
        };

        if (hasVoucher) {
            state.player.hasKasKoVoucher = false;
        }

        // Логируем транзакцию
        if (typeof logBankTransaction === 'function' && totalCash > 0) {
            logBankTransaction(`Полис страхования: ${car.name}`, totalCash, false);
        }

        ModalManager.close('modalInsurance');
        if (typeof saveState === 'function') saveState();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        if (hasVoucher) {
            showToast("🎫 Ваучер активирован! Полис оформлен бесплатно.");
        } else {
            showToast("Полис страхования зарегистрирован в базе РСА ✓");
        }

        openCarPreviewModal(window.previewCarIndex);
    } finally {
        _insuranceBuyPending = false;
    }
}

function driveWithoutInsuranceWarning() {
    ModalManager.close('modalInsurance');
    insuranceOptions = { ...DEFAULT_INSURANCE_OPTIONS };
    _insuranceBuyPending = false;

    showToast("⚠️ Режим риска: выезды без полиса могут привести к штрафам ДПС и судам!");

    if (window.previewCarIndex !== null && window.previewCarIndex !== undefined) {
        openCarPreviewModal(window.previewCarIndex);
    }
}

function checkUninsuredDriveRisk(car) {
    if (!car || car.insurance) return true;

    const roll = Math.random();
    if (roll < 0.20) {
        const fine = 800;
        state.player.cash = Math.max(0, (state.player.cash || 0) - fine);
        showToast(`🚔 Рейд ДПС! Штраф за езду без ОСАГО: -${fine} ₽.`);
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        return false;
    } else if (roll < 0.28) {
        const damageCost = Math.round(75000 + Math.random() * 180000);
        state.player.cash = Math.max(0, (state.player.cash || 0) - damageCost);
        car.condition = Math.max(15, (car.condition || 80) - 25);
        if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);

        showToast(`💥 ДТП на перекрёстке! Из-за отсутствия ОСАГО вам выставлен регресс на ремонт чужого авто (-${damageCost.toLocaleString()} ₽)!`);
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        return false;
    }

    return true;
}

// ========================================================
// --- ДЕТЕЙЛИНГ И ПРЕДПРОДАЖНАЯ ПОДГОТОВКА ---
// ========================================================
function openPreSaleModal(idx) {
    if (idx === undefined || idx === null) {
        console.warn("[PreSale] openPreSaleModal без idx");
        return;
    }

    const caps = getPlayerHousingCapabilities();
    if (!caps.canDetail && !caps.canService) {
        return openNeedCapabilityModal('detail', "Предпродажная подготовка и детейлинг");
    }

    activePreSaleCarIndex = idx;
    const car = safeGetCar(idx);
    if (!car) {
        activePreSaleCarIndex = null;
        return;
    }

    const modal = ensureModal('modalPreSale');
    const hasPaintShop = (state.businesses || []).some(b => b.id === 'paint_shop' && b.level > 0);

    modal.innerHTML = `
        <div class="modal-box text-left" style="max-width: 440px;">
            <div class="modal-glow-badge mb-1" style="color:var(--amber); border-color:rgba(255,179,0,0.4);">
                ✨ ЦЕНТР ДЕТЕЙЛИНГА & ПРЕДПРОДАЖКИ
            </div>
            <h3 class="font-bold color-cyan mb-1">${escapeHtml(car.name)}</h3>
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

            <button onclick="closePreSaleModal()" class="btn btn-dark w-full">Закрыть детейлинг</button>
        </div>
    `;

    ModalManager.open('modalPreSale');
    if (typeof playSound === 'function') playSound('tick');
}

// ⭐ v1.3.0: консистентный close
function closePreSaleModal() {
    ModalManager.close('modalPreSale');
    activePreSaleCarIndex = null;
    if (typeof renderGarage === 'function') renderGarage();
}

function applyPreSaleMod(type) {
    if (activePreSaleCarIndex === null) return;
    const car = safeGetCar(activePreSaleCarIndex);
    if (!car) return;

    const cash = state.player?.cash || 0;
    const hasPaintShop = (state.businesses || []).some(b => b.id === 'paint_shop' && b.level > 0);

    const chargePlayer = (amount) => {
        if (cash < amount) {
            showToast(`Нужно ${amount.toLocaleString()} ₽!`);
            return false;
        }
        state.player.cash -= amount;
        return true;
    };

    switch (type) {
        case 'clean':
            if (car.isPolished) return showToast("Кузов уже отполирован до блеска!");
            if (!chargePlayer(7000)) return;
            car.isPolished = true;
            if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);
            showToast("Кузов отполирован (+12% к рыночной цене)!");
            break;

        case 'interior':
            if (car.cleanInterior) return showToast("Салон уже прошёл озонацию!");
            if (!chargePlayer(8500)) return;
            car.cleanInterior = true;
            if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);
            showToast("Химчистка завершена! Запах табака и грязь удалены.");
            break;

        case 'paint':
            if (car.isRepainted) return showToast("Кузов уже был повторно окрашен!");
            const paintCost = hasPaintShop ? 14000 : 25000;
            if (!chargePlayer(paintCost)) return;
            car.isRepainted = true;
            car.condition = Math.min(100, (car.condition || 60) + 30);
            if (hasPaintShop) {
                car.bodyThickness = { hood: 115, roof: 110, doors: 120, wings: 115 };
                showToast("🎨 Цех «Хамелеон»: окрашено заводским микрослоем!");
            } else {
                car.bodyThickness = { hood: 240, roof: 110, doors: 260, wings: 230 };
                showToast("Кузов перекрашен (+30% к состоянию HP)!");
            }
            if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);
            break;

        case 'chips':
            if (!chargePlayer(6000)) return;
            car.condition = Math.min(100, (car.condition || 70) + 10);
            showToast("Сколы точечно закрашены без изменения толщины ЛКП!");
            if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);
            break;

        case 'additive':
            if (car.hasAdditive) return showToast("Присадка уже залита!");
            if (!chargePlayer(12000)) return;
            car.hasAdditive = true;
            showToast("Присадка залита! Стуки мотора скрыты.");
            break;

        case 'odometer':
            if (car.rolledOdometer) return showToast("Пробег уже скручивался!");
            if (!chargePlayer(15000)) return;
            car.mileage = Math.round((car.mileage || 120000) * 0.5);
            car.rolledOdometer = true;
            showToast("Пробег смотан на 50%!");
            break;

        default:
            return;
    }

    if (typeof saveState === 'function') saveState();
    if (typeof renderGarage === 'function') renderGarage();
    openPreSaleModal(activePreSaleCarIndex);
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
}

// ========================================================
// --- СПОРТИВНЫЙ ТЮНИНГ ---
// ========================================================
function openTuningModal(idx) {
    if (idx === undefined || idx === null) {
        console.warn("[Tuning] openTuningModal без idx");
        return;
    }

    if (!checkPlayerCapability('tune')) {
        return openNeedCapabilityModal('tune', "Спортивный тюнинг и корчевание");
    }

    activeTuningCarIndex = idx;
    const car = safeGetCar(idx);
    if (!car) {
        activeTuningCarIndex = null;
        return;
    }

    if (!car.tuning) {
        car.tuning = {
            chip: 0, exhaust: false, stance: false, bodykit: false,
            rollCage: false, dragSlicks: false, hydroHandbrake: false,
            weldedDiff: false, steeringAngle: false, bucketSeats: false,
            customWheels: false, coldIntake: false, intercooler: false,
            tinted: false, risk1251: 0
        };
    }

    if (typeof setTxt === 'function') {
        setTxt('tuneCarTitle', `Мастерская: <b>${escapeHtml(car.name)}</b> (${car.power || 100} л.с.)`);
    }
    switchTuneTab(activeTuneTab || 'engine');

    ModalManager.open('modalTuning');
    if (typeof playSound === 'function') playSound('tick');
}

// ⭐ v1.3.0: консистентный close
function closeTuningModal() {
    ModalManager.close('modalTuning');
    activeTuningCarIndex = null;
    _tuneBuyPending = false;
    if (typeof renderGarage === 'function') renderGarage();
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

    const car = safeGetCar(activeTuningCarIndex);
    if (!car) return;
    const t = car.tuning || {};

    const hasChipLab = (state.businesses || []).some(b => b.id === 'chip_tuning' && b.level > 0);
    let html = "";

    if (activeTuneTab === 'engine') {
        // ⭐ v1.3.0: скидка чип-лаборатории снижена с 70% до 30%
        const chipDiscount = hasChipLab ? 0.70 : 1.0;
        const cCost1 = Math.round(30000 * chipDiscount);
        const cCost2 = Math.round(65000 * chipDiscount);
        const cCost3 = Math.round(180000 * chipDiscount);

        const currentChip = t.chip || 0;

        const engChips = [
            { id: 'chip_stage1', stage: 1, name: `⚡ Чип Stage 1${hasChipLab ? ' (-30%)' : ''}`, cost: cCost1, desc: '+25 л.с., сдвиг отсечки (+50k ₽ к цене).', bought: currentChip >= 1, action: `buyChipStage(1, ${cCost1}, 25)` },
            { id: 'chip_stage2', stage: 2, name: `🔥 Stage 2 + Попкорн${hasChipLab ? ' (-30%)' : ''}`, cost: cCost2, desc: '+60 л.с., отстрелы (+115k ₽ к цене).', bought: currentChip >= 2, action: `buyChipStage(2, ${cCost2}, 60)` },
            { id: 'chip_stage3', stage: 3, name: `🚀 Stage 3 Big Turbo Kit`, cost: cCost3, desc: '+150 л.с., высшая лига скорости (+290k ₽ к цене).', bought: currentChip >= 3, action: `buyChipStage(3, ${cCost3}, 150)` }
        ];

        engChips.forEach(m => {
            const btn = m.bought
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

        TUNING_CONFIG.engine.forEach(m => {
            const bought = !!t[m.id];
            const btn = bought
                ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Установлено ✓</button>"
                : `<button onclick="buyTuningMod('${m.id}', ${m.baseCost}, ${m.power}, ${m.risk})" class="btn btn-cyan btn-sm btn-auto">${m.baseCost.toLocaleString()} ₽</button>`;

            html += `
            <div class="glass-card p-2 flex-between mb-2">
                <div style="flex:1; margin-right:8px;">
                    <b class="text-xs color-cyan">${m.name}</b>
                    <div class="sub-label" style="font-size:9.5px;">${m.desc}</div>
                </div>
                ${btn}
            </div>`;
        });
    } else {
        const modsList = TUNING_CONFIG[activeTuneTab] || [];
        const btnColorClass = activeTuneTab === 'drift' ? 'btn-red' : (activeTuneTab === 'drag' ? 'btn-amber' : 'btn-purple');
        const textColorClass = activeTuneTab === 'drift' ? 'color-red' : (activeTuneTab === 'drag' ? 'color-amber' : 'color-purple');

        modsList.forEach(m => {
            const bought = !!t[m.id];
            const btn = bought
                ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Установлено ✓</button>"
                : `<button onclick="buyTuningMod('${m.id}', ${m.baseCost}, ${m.power}, ${m.risk})" class="btn ${btnColorClass} btn-sm btn-auto">${m.baseCost.toLocaleString()} ₽</button>`;

            html += `
            <div class="glass-card p-2 flex-between mb-2">
                <div style="flex:1; margin-right:8px;">
                    <b class="text-xs ${textColorClass}">${m.name}</b>
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
    if (_tuneBuyPending) return;

    if (!checkPlayerCapability('tune')) {
        return openNeedCapabilityModal('tune', "Установка компонентов тюнинга");
    }

    if (activeTuningCarIndex === null) return;
    const car = safeGetCar(activeTuningCarIndex);
    if (!car) return;

    const cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Не хватает денег на деталь!");

    _tuneBuyPending = true;
    try {
        state.player.cash -= cost;
        if (!car.tuning) car.tuning = {};
        car.tuning[modId] = true;

        if (powerGain > 0) car.power = (car.power || 100) + powerGain;
        car.tuning.risk1251 = Math.min(100, (car.tuning.risk1251 || 0) + (riskGain || 0));

        if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);
        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Тюнинг: ${modId}`, cost, false);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof renderGarage === 'function') renderGarage();
        renderTuningItems();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Деталь установлена! Оценка авто выросла.");
    } finally {
        _tuneBuyPending = false;
    }
}

function buyChipStage(stage, cost, powerGain) {
    if (_tuneBuyPending) return;

    if (!checkPlayerCapability('tune')) {
        return openNeedCapabilityModal('tune', "Прошивка блока управления ЭБУ");
    }

    if (activeTuningCarIndex === null) return;
    const car = safeGetCar(activeTuningCarIndex);
    if (!car) return;

    if (!car.tuning) car.tuning = {};
    const currentChip = car.tuning.chip || 0;

    // ⭐ v1.3.0: нельзя поставить младший Stage после старшего
    if (stage <= currentChip) {
        return showToast(`У вас уже установлен Stage ${currentChip}!`);
    }

    // ⭐ v1.3.0: можно перескакивать, но с доплатой полной стоимости
    const cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Не хватает денег на прошивку!");

    _tuneBuyPending = true;
    try {
        state.player.cash -= cost;

        // Разница в мощности от предыдущего stage
        const stagesPower = { 0: 0, 1: 25, 2: 60, 3: 150 };
        const actualPowerGain = powerGain;

        car.tuning.chip = stage;
        car.power = (car.power || 100) + actualPowerGain;
        car.tuning.risk1251 = Math.min(100, (car.tuning.risk1251 || 0) + 10);

        if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);
        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Чип-тюнинг Stage ${stage}`, cost, false);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof renderGarage === 'function') renderGarage();
        renderTuningItems();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`Прошивка Stage ${stage} залита (+${powerGain} л.с.)!`);
    } finally {
        _tuneBuyPending = false;
    }
}

function updateTuneRiskMeter(car) {
    const riskVal = document.getElementById('tuneRiskValue');
    const riskFill = document.getElementById('tuneRiskFill');
    if (!riskVal || !riskFill || !car) return;

    const r = car.tuning?.risk1251 || 0;
    riskVal.innerText = `${r}%`;
    riskFill.style.width = `${r}%`;
    riskFill.className = r > 50 ? "risk-fill risk-high" : (r > 25 ? "risk-fill risk-mid" : "risk-fill risk-low");
}

function legalizeTuningModifications() {
    if (activeTuningCarIndex === null) return;
    const car = safeGetCar(activeTuningCarIndex);
    if (!car) return;

    const r = car.tuning?.risk1251 || 0;
    if (r <= 0) return showToast("На автомобиле нет незарегистрированных переделок!");

    const certCost = Math.round(r * 900);
    const cash = state.player?.cash || 0;
    if (cash < certCost) return showToast(`Нужно ${certCost.toLocaleString()} ₽ на экспертизу НАМИ!`);

    state.player.cash -= certCost;
    car.tuning.risk1251 = 0;

    if (typeof saveState === 'function') saveState();
    if (typeof updateHeaderUI === 'function') updateHeaderUI();
    renderTuningItems();
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    showToast("Отметки о тюнинге внесены в ПТС/СТС! Риск по ст. 12.5.1 аннулирован.");
}

// ========================================================
// ЭКСПОРТ В WINDOW
// ========================================================
Object.assign(window, {
    openInsuranceModalFromPreview,
    renderInsuranceContractUI,
    closeInsuranceModal,
    toggleInsuranceOption,
    confirmSignInsurancePolicy,
    driveWithoutInsuranceWarning,
    checkUninsuredDriveRisk,
    openPreSaleModal,
    closePreSaleModal,
    applyPreSaleMod,
    openTuningModal,
    closeTuningModal,
    switchTuneTab,
    renderTuningItems,
    buyTuningMod,
    buyChipStage,
    legalizeTuningModifications
});
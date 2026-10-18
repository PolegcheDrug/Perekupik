// ========================================================
// js/garage-dialogs.js — OBD2, ШТРАФСТОЯНКА, НОМЕРА И ИТОГИ СДЕЛКИ (v2.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v2.1.0 (ИНТЕРАКТИВНЫЕ ИТОГИ ПРОДАЖИ):
//   - ДОБАВЛЕНО: openCarSoldSuccessModal — раздельный двухцветный рендер
//     выручки (неоновый циан) и чистой маржи (золотой янтарь / красный убыток).
//   - Устранено дублирование одинаковых плашек «ДЕНЕЖНЫЕ СРЕДСТВА».
//   - Отображение точного ROI (%) окупаемости вложений.
//   - Перехватчик openVerdictModal для экранов продажи автомобилей.
// ⭐ v2.0.0 (ЕДИНЫЙ PLATESMANAGER v2.0.0):
//   - applyPlateToCar → PlatesManager.attachPlateToCar (полностью)
//   - removePlateFromCar → PlatesManager.detachPlateFromCar
//   - openChangePlateModal → PlatesManager.getFreePlates()
//   - resolveImpoundScrap → архив номера через PlatesManager
//   - УБРАНЫ все прямые записи в state.ownedPlates
// ⭐ v1.4.0:
//   - activeImpoundCarIndex корректно сбрасывается
//   - _impoundActionPending / _garageEventActive против двойных кликов
// ========================================================

let activeImpoundCarIndex = null;
let activeGarageEventCar = null;
let _impoundActionPending = false;
let _garageEventActive = false;

// ========================================================
// --- OBD2 ДИАГНОСТИКА (В ГАРАЖЕ) ---
// ========================================================
function openOBD2Modal() {
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) {
        return showToast("Сначала выберите автомобиль в инспекции.");
    }
    const car = safeGetCar(window.previewCarIndex);
    if (!car) return;

    const hasScanner = !!(state.player?.tools && (state.player.tools.obd || state.player.tools.obd_launch));
    if (!hasScanner) {
        safePlaySound('error');
        safeTgHaptic('warning');
        return safeShowToast("⚠️ У вас нет сканера OBD2! Купите ELM327 или Launch Pro в Авто-Маркете.");
    }

    if (!checkPlayerCapability('obd')) {
        return openNeedCapabilityModal('obd', "Стационарная диагностика ЭБУ");
    }

    const isLaunch = !!state.player?.tools?.obd_launch;
    const toolKey = isLaunch ? 'obd_launch' : 'obd';
    const wear = state.player?.toolsWear ? (state.player.toolsWear[toolKey] || 0) : 0;

    if (wear <= 0) {
        safePlaySound('error');
        safeTgHaptic('warning');
        return safeShowToast("⚠️ Диагностический сканер разряжен! Откалибруйте его в Авто-Маркете.");
    }

    if (state.player?.toolsWear) {
        state.player.toolsWear[toolKey] = Math.max(0, wear - 1);
    }
    safeSaveState();

    ModalManager.close('modalPreview');

    safeSetTxt('obd2CarTitle', `Диагностика CAN-шины: ${escapeHtml(car.name)}`);
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
    safePlaySound('tick');

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('obd_scan', 1);
    }

    const terminalEl = document.getElementById('garageObdTerminalLines');
    const progFill = document.getElementById('garageObdProgressFill');

    const scanSteps = [
        { pct: 25,  msg: "> Подключение к ЭБУ ДВС (DME/ECU)... Связь 100%",  type: "success" },
        { pct: 50,  msg: "> Опрос трансмиссии (EGS), соленоиды давления...", type: "" },
        { pct: 75,  msg: "> Сканирование ABS/ESP и подушек SRS...",         type: "" },
        { pct: 100, msg: "> Чтение сохранённых ошибок в памяти DTC...",      type: car.hiddenDefect ? "error" : "success" }
    ];

    let stepIdx = 0;
    const scanInterval = setInterval(() => {
        try {
            if (stepIdx < scanSteps.length) {
                const step = scanSteps[stepIdx];
                if (progFill) progFill.style.width = step.pct + "%";
                if (terminalEl) {
                    terminalEl.innerHTML += `<div class="obd-terminal-line ${step.type}">${step.msg}</div>`;
                    terminalEl.scrollTop = terminalEl.scrollHeight;
                }
                safePlaySound('tick');
                stepIdx++;
            } else {
                clearInterval(scanInterval);
                renderGarageOBDFinal(car, resBox, actBox);
            }
        } catch (e) {
            clearInterval(scanInterval);
            console.warn("[GarageOBD] Ошибка:", e);
        }
    }, 450);
}

function renderGarageOBDFinal(car, resBox, actBox) {
    if (!resBox || !actBox || !car) return;

    const eng = car.wear?.engine ? Math.round(car.wear.engine) : 85;
    const trans = car.wear?.transmission ? Math.round(car.wear.transmission) : 85;
    const hasOwnSTO = (state.businesses || []).some(b => b.id === 'sto' && b.level > 0);

    if (car.hiddenDefect) {
        safePlaySound('error');
        safeTgHaptic('error');
        const def = car.hiddenDefect;
        const baseCost = def.cost || 15000;
        const actualRepairCost = hasOwnSTO ? Math.round(baseCost * 0.60) : baseCost;

        resBox.innerHTML = `
            <div class="obd-cyber-display" style="border-color: var(--red);">
                <div class="flex-between text-xs mb-2">
                    <span class="color-red font-bold"><i class="fa-solid fa-triangle-exclamation"></i> ОБНАРУЖЕН DTC КОД: ${escapeHtml(def.code || 'P0300')}</span>
                    <span class="tag-badge bg-tag-red">${escapeHtml(def.severity || 'Критическая')}</span>
                </div>
                <div class="obd-scan-matrix-screen mb-2" style="border-color: rgba(255, 51, 102, 0.4);">
                    <div class="obd-terminal-line error">> НЕИСПРАВНОСТЬ: ${escapeHtml(def.text)}</div>
                    <div class="obd-terminal-line warn">> БЛОК: ${escapeHtml(def.system || 'ЭБУ ДВС DME')}</div>
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
        safePlaySound('win');
        safeTgHaptic('success');

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
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) return;
    const car = safeGetCar(window.previewCarIndex);

    if (!car || !car.hiddenDefect) {
        safeShowToast("В памяти ЭБУ нет ошибок для стирания.");
        return;
    }

    safePlaySound('tick');
    safeTgHaptic('medium');
    safeShowToast("Память ошибок DTC очищена! Check Engine временно погас.");

    if (Math.random() < 0.5) {
        car.hasAdditive = true;
    }
    safeSaveState();
    openOBD2Modal();
}

function repairDefectInGarage(overrideCost) {
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) return;
    const car = safeGetCar(window.previewCarIndex);
    if (!car || !car.hiddenDefect) return;

    const cost = overrideCost || car.hiddenDefect.cost || 15000;
    const cash = state.player?.cash || 0;
    if (cash < cost) return safeShowToast("Не хватает денег на устранение дефекта!");

    state.player.cash -= cost;
    car.hiddenDefect = null;
    car.hasAdditive = false;
    car.condition = Math.min(100, (car.condition || 70) + 20);
    if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);

    safeSaveState();
    renderGarage();
    safePlaySound('win');
    safeTgHaptic('success');
    safeShowToast("Неисправность устранена! Оценка машины выросла.");
    openOBD2Modal();
}

function closeOBD2Modal() {
    ModalManager.close('modalOBD2');
    if (window.previewCarIndex !== null && window.previewCarIndex !== undefined) {
        openCarPreviewModal(window.previewCarIndex);
    }
}

// ========================================================
// --- СПЕЦСТОЯНКА ГИБДД ---
// ========================================================
function openImpoundLotModal(idx) {
    if (idx === undefined || idx === null) {
        console.warn("[Impound] openImpoundLotModal без idx");
        return;
    }

    if (activeImpoundCarIndex !== null && activeImpoundCarIndex !== idx) {
        activeImpoundCarIndex = null;
    }

    activeImpoundCarIndex = idx;
    const car = safeGetCar(idx);
    if (!car) {
        activeImpoundCarIndex = null;
        return;
    }

    const modal = ensureModal('modalImpoundLot');
    const isRegistered = !!car.isRegisteredOnPlayer;
    const scrapReward = Math.round((car.basePrice || 100000) * 0.45);
    const passes = state.player?.freeImpoundPasses || 0;
    const hasTowService = (state.businesses || []).some(b => b.id === 'tow_truck' && b.level > 0);

    const towServiceBlock = hasTowService ? `
        <div class="glass-card p-2 mb-2" style="border: 1px solid var(--green); background: rgba(0,230,118,0.12);">
            <div class="flex-between mb-1">
                <b class="text-xs color-green"><i class="fa-solid fa-truck-pickup"></i> Служба эвакуации «Шериф»</b>
                <span class="tag-badge bg-tag-green">ВАШ БИЗНЕС</span>
            </div>
            <div class="sub-label mb-2" style="font-size:10px;">Диспетчер выслал корпоративный эвакуатор для забора машины без взяток и штрафа.</div>
            <button onclick="resolveImpoundTowTruck()" class="btn btn-green btn-sm w-full">Забрать своим эвакуатором (0 ₽) 🚛</button>
        </div>
    ` : "";

    const freePassBlock = (passes > 0 && !hasTowService) ? `
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
            <h3 class="font-bold mb-1 color-cyan">${escapeHtml(car.name)}</h3>
            <div class="sub-label mb-3">Госномер: <span class="license-plate" style="font-size:10px; padding:2px 6px;">${escapeHtml(car.customPlate || car.plate || "ТРАНЗИТ")}</span></div>

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

            <button onclick="closeImpoundModal()" class="btn btn-dark w-full">Закрыть</button>
        </div>
    `;

    ModalManager.open('modalImpoundLot');
    safePlaySound('tick');
}

function closeImpoundModal() {
    ModalManager.close('modalImpoundLot');
    activeImpoundCarIndex = null;
    _impoundActionPending = false;
    if (typeof renderGarage === 'function') renderGarage();
}

function resolveImpoundTowTruck() {
    if (activeImpoundCarIndex === null || _impoundActionPending) return;
    const car = safeGetCar(activeImpoundCarIndex);
    if (!car) return;

    _impoundActionPending = true;
    try {
        car.impounded = false;
        safeSaveState();
        safeUpdateHeaderUI();
        renderGarage();
        safePlaySound('win');
        safeTgHaptic('success');
        safeShowToast("Эвакуатор службы «Шериф» забрал машину обратно в гараж (0 ₽)!");
    } finally {
        closeImpoundModal();
    }
}

function resolveImpoundFreePass() {
    if (activeImpoundCarIndex === null || _impoundActionPending) return;
    const car = safeGetCar(activeImpoundCarIndex);
    if (!car) return;

    const passes = state.player?.freeImpoundPasses || 0;
    if (passes <= 0) {
        safeShowToast("У вас нет талонов бесплатного забора!");
        return;
    }

    _impoundActionPending = true;
    try {
        state.player.freeImpoundPasses -= 1;
        car.impounded = false;

        safeSaveState();
        safeUpdateHeaderUI();
        renderGarage();
        safePlaySound('win');
        safeTgHaptic('success');
        safeShowToast("Автомобиль бесплатно освобожден по талону спецстоянки!");
    } finally {
        closeImpoundModal();
    }
}

function resolveImpoundBribe(type) {
    if (activeImpoundCarIndex === null || _impoundActionPending) return;
    const car = safeGetCar(activeImpoundCarIndex);
    if (!car) return;

    _impoundActionPending = true;
    try {
        if (type === 'cash') {
            const cost = 45000;
            if ((state.player?.cash || 0) < cost) {
                _impoundActionPending = false;
                return safeShowToast("Не хватает денег на взятку!");
            }
            state.player.cash -= cost;
            safeShowToast("Вопрос урегулирован наличными (-45,000 ₽)!");
        } else {
            if ((state.player?.connections || 0) < 1) {
                _impoundActionPending = false;
                return safeShowToast("У вас нет теневых связей 🤝!");
            }
            state.player.connections -= 1;
            safeShowToast("Решала забрал ключи со спецстоянки (-1 🤝)!");
        }

        car.impounded = false;
        safeSaveState();
        safeUpdateHeaderUI();
        renderGarage();
        safePlaySound('win');
        safeTgHaptic('success');
    } finally {
        closeImpoundModal();
    }
}

function resolveImpoundOfficialPay() {
    if (activeImpoundCarIndex === null || _impoundActionPending) return;
    const car = safeGetCar(activeImpoundCarIndex);
    if (!car) return;

    const cost = 30000;
    if ((state.player?.cash || 0) < cost) return safeShowToast("Не хватает денег для оплаты квитанции!");

    _impoundActionPending = true;
    try {
        state.player.cash -= cost;
        car.impounded = false;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Оплата протокола ГИБДД", cost, false);
        }

        safeSaveState();
        safeUpdateHeaderUI();
        renderGarage();
        safePlaySound('win');
        safeTgHaptic('success');
        safeShowToast("Штраф и эвакуация оплачены! Автомобиль возвращён.");
    } finally {
        closeImpoundModal();
    }
}

async function resolveImpoundScrap(reward) {
    if (activeImpoundCarIndex === null || _impoundActionPending) return;
    const car = safeGetCar(activeImpoundCarIndex);
    if (!car || !car.isRegisteredOnPlayer) return;

    if (!confirm(`Сдать «${car.name}» в утиль? Автомобиль будет списан из гаража.`)) return;

    if (window.PlatesManager && (car.customPlate || car.plate)) {
        try {
            window.PlatesManager.detachPlateFromCar(car, { silent: true, archive: true, skipFirestore: true });
        } catch (e) {
            console.warn('[Garage] Ошибка снятия номера при утилизации:', e);
        }
    }

    const carPlate = car.customPlate || car.plate;
    const carUid = car.uid || car.id;
    _impoundActionPending = true;
    try {
        if (window.FB_Bridge?.Plates && carPlate && carPlate !== 'ТРАНЗИТ') {
            try {
                await window.FB_Bridge.Plates.releasePlate(carPlate, null, true);
            } catch (e) {
                console.warn("[Garage] Ошибка архивации номера:", e);
            }
        }

        state.player.cash = (state.player.cash || 0) + reward;

        if (Array.isArray(state.garage)) {
            const liveIdx = state.garage.findIndex(c => c && (c.uid === carUid || c.id === carUid));
            if (liveIdx !== -1) {
                state.garage.splice(liveIdx, 1);
            }
        }

        safeSaveState();
        safeUpdateHeaderUI();
        renderGarage();
        safePlaySound('win');
        safeTgHaptic('success');

        if (typeof openVerdictModal === 'function') {
            openVerdictModal("УТИЛИЗАЦИЯ ЗАВЕРШЕНА ♻️", `Автомобиль снят с государственного учёта.\nВыплачено: +${reward.toLocaleString()} ₽`, true);
        }
    } finally {
        closeImpoundModal();
    }
}

// ========================================================
// --- НОМЕРНЫЕ ЗНАКИ (через PlatesManager v2.0.0) ---
// ========================================================
function openChangePlateModal() {
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) {
        return safeShowToast("Сначала выберите автомобиль в инспекции.");
    }
    const car = safeGetCar(window.previewCarIndex);
    if (!car) return;

    if (!window.PlatesManager) {
        return safeShowToast("⚠️ Модуль номеров не загружен");
    }

    ModalManager.close('modalPreview');
    const modal = ensureModal('modalChangePlate');

    const plates = window.PlatesManager.getFreePlates();
    let platesListHtml = "";

    if (plates.length === 0) {
        platesListHtml = "<div class='sub-label text-center py-4'>У вас нет свободных госномеров в инвентаре.</div>";
    } else {
        plates.forEach(p => {
            const plateNumber = p.number;
            const pCost = (typeof calculatePlateValue === 'function') ? calculatePlateValue(plateNumber) : 0;
            platesListHtml += `
            <div class="glass-card flex-between p-2 mb-1">
                <div>
                    <span class="license-plate">${escapeHtml(plateNumber)} <div class="license-flag">RUS</div></span>
                    <div class="sub-label mt-1" style="font-size:9.5px;">Оценка знака: <b class="color-amber">+${pCost.toLocaleString()} ₽</b></div>
                </div>
                <button onclick="applyPlateToCar('${plateNumber.replace(/'/g, "\\'")}')" class="btn btn-cyan btn-auto btn-sm">Повесить</button>
            </div>`;
        });
    }

    const curPlate = car.customPlate || car.plate || 'ТРАНЗИТ';

    modal.innerHTML = `
        <div class="modal-box">
            <div class="flex-between mb-2">
                <div class="modal-glow-badge"><i class="fa-solid fa-id-card"></i> РЕГИСТРАЦИОННЫЕ ЗНАКИ</div>
                <button onclick="closeChangePlateModal()" class="btn btn-dark btn-auto btn-sm">✕</button>
            </div>
            <div class="p-2 mb-2 text-center" style="background:#090e18; border-radius:8px;">
                <span class="sub-label" style="font-size:9px;">Текущий номер на авто:</span>
                <div class="license-plate mt-1" style="display:inline-flex; font-size:11px;">${escapeHtml(curPlate)}</div>
            </div>
            <button onclick="removePlateFromCar()" class="btn btn-amber mb-2 w-full">Снять номер на транзиты (-2,000 ₽)</button>
            <div id="changePlateList" class="space-y-2 mb-2" style="max-height: 240px; overflow-y: auto;">
                ${platesListHtml}
            </div>
            <button onclick="closeChangePlateModal()" class="btn btn-dark w-full">Отмена</button>
        </div>
    `;

    ModalManager.open('modalChangePlate');
}

function closeChangePlateModal() {
    ModalManager.close('modalChangePlate');
    if (window.previewCarIndex !== null && window.previewCarIndex !== undefined) {
        openCarPreviewModal(window.previewCarIndex);
    }
}

async function applyPlateToCar(plateStr) {
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) return;
    const car = safeGetCar(window.previewCarIndex);
    if (!car) return;

    if (!window.PlatesManager) {
        return safeShowToast("⚠️ PlatesManager не загружен");
    }

    const oldVal = car.marketValue || car.basePrice || 100000;
    const result = window.PlatesManager.attachPlateToCar(car, plateStr, { silent: true });

    if (!result.success) {
        return safeShowToast(`Ошибка: ${result.error}`);
    }

    const newVal = typeof recalculateCarMarketValue === 'function'
        ? recalculateCarMarketValue(car)
        : (car.marketValue || oldVal);
    const diff = newVal - oldVal;

    closeChangePlateModal();
    safeSaveState();
    renderGarage();

    if (typeof openCarPreviewModal === 'function') {
        openCarPreviewModal(window.previewCarIndex);
    }

    safePlaySound('win');
    safeTgHaptic('success');

    if (diff > 0) {
        if (typeof spawnFloatingReward === 'function') {
            spawnFloatingReward(`+${diff.toLocaleString()} ₽ к оценке авто!`);
        }
        safeShowToast(`Блатные номера ${result.newPlate} установлены! Оценка авто выросла на +${diff.toLocaleString()} ₽ 🔥`);
    } else {
        safeShowToast(`Номера ${result.newPlate} успешно установлены на автомобиль!`);
    }
}

async function removePlateFromCar() {
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) return;
    const car = safeGetCar(window.previewCarIndex);
    if (!car) return;

    if (!window.PlatesManager) {
        return safeShowToast("⚠️ PlatesManager не загружен");
    }

    const curPlate = car.customPlate || car.plate;
    if (!curPlate || curPlate === "ТРАНЗИТ") return safeShowToast("На машине уже висят транзиты!");

    const cash = state.player?.cash || 0;
    if (cash < 2000) return safeShowToast("Нужно 2,000 ₽ на госпошлину снятия номеров!");

    state.player.cash -= 2000;

    const oldVal = car.marketValue || car.basePrice || 100000;
    const result = window.PlatesManager.detachPlateFromCar(car, { silent: true, archive: false });

    if (!result.success) {
        state.player.cash += 2000;
        return safeShowToast(`Ошибка снятия: ${result.error}`);
    }

    const newVal = typeof recalculateCarMarketValue === 'function'
        ? recalculateCarMarketValue(car)
        : oldVal;
    const diff = oldVal - newVal;

    closeChangePlateModal();
    safeSaveState();
    safeUpdateHeaderUI();
    renderGarage();

    if (typeof openCarPreviewModal === 'function') {
        openCarPreviewModal(window.previewCarIndex);
    }

    safePlaySound('tick');
    safeTgHaptic('light');

    if (diff > 0 && typeof spawnFloatingReward === 'function') {
        spawnFloatingReward(`-${diff.toLocaleString()} ₽`);
    }
    safeShowToast(`Госномер ${result.removedPlate} снят и убран в инвентарь!`);
}

// ========================================================
// --- СУТОЧНЫЕ ИВЕНТЫ В ГАРАЖЕ ---
// ========================================================
function triggerGarageRandomEvent() {
    if (!Array.isArray(state.garage) || state.garage.length === 0) return;
    if (_garageEventActive) return;
    if (Math.random() > 0.20) return;

    const randIdx = Math.floor(Math.random() * state.garage.length);
    const car = state.garage[randIdx];
    if (!car) return;

    _garageEventActive = true;
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
                if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);
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
                    safeShowToast("КАСКО полностью возместило ущерб!");
                } else {
                    car.condition = Math.max(10, (car.condition || 80) - 10);
                    if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);
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
                if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);
            }
        }
    ];

    const ev = events[Math.floor(Math.random() * events.length)];
    activeGarageEventCar.event = ev;

    safeSetTxt('garageEventEmoji', ev.emoji);
    safeSetTxt('garageEventBadge', ev.badge);
    safeSetTxt('garageEventTitle', ev.title);
    safeSetTxt('garageEventDesc', ev.desc);
    safeSetTxt('garageEventCarName', `${escapeHtml(car.name)} (${escapeHtml(car.customPlate || car.plate || "ТРАНЗИТ")})`);

    const actBox = document.getElementById('garageEventActions');
    if (actBox) {
        actBox.innerHTML = `
            <button onclick="resolveGarageEvent('fix')" class="btn btn-cyan btn-sm w-full mb-1">${ev.actionText}</button>
            <button onclick="resolveGarageEvent('ignore')" class="btn btn-dark btn-sm w-full">Оставить как есть</button>
        `;
    }

    ModalManager.open('modalGarageEvent');
    safePlaySound('error');
    safeTgHaptic('warning');
}

function resolveGarageEvent(type) {
    if (!activeGarageEventCar) {
        ModalManager.close('modalGarageEvent');
        _garageEventActive = false;
        return;
    }

    const { car, event } = activeGarageEventCar;

    try {
        if (type === 'fix') {
            const cash = state.player?.cash || 0;
            if (cash < event.cost) {
                return safeShowToast("Не хватает денег на устранение!");
            }
            state.player.cash -= event.cost;
            safeShowToast("Проблема успешно устранена!");
            safePlaySound('win');
            safeTgHaptic('success');
        } else {
            if (typeof event.onIgnore === 'function') event.onIgnore();
            safeShowToast("Вы проигнорировали инцидент. Состояние авто снизилось.");
            safeTgHaptic('error');
        }
    } finally {
        ModalManager.close('modalGarageEvent');
        activeGarageEventCar = null;
        _garageEventActive = false;
        safeSaveState();
        renderGarage();
        safeUpdateHeaderUI();
    }
}

function closeGarageEventModal() {
    ModalManager.close('modalGarageEvent');
    activeGarageEventCar = null;
    _garageEventActive = false;
}

// ========================================================
// --- ИНТЕРАКТИВНОЕ МОДАЛЬНОЕ ОКНО ИТОГОВ СДЕЛКИ (ВЫРУЧКА + МАРЖА) ---
// ========================================================
function openCarSoldSuccessModal(carName, salePrice, profit, costPrice = 0) {
    const modal = ensureModal('modalCarSoldSuccess');
    const isProfitPositive = profit >= 0;
    const baseCost = costPrice > 0 ? costPrice : Math.max(1000, salePrice - profit);
    const roi = Math.round((profit / baseCost) * 100);

    modal.innerHTML = `
        <div class="modal-box text-center" style="max-width: 400px; border-color: rgba(0, 242, 254, 0.4);">
            <div class="radar-spinner-ring mb-2" style="border-top-color: #00f2fe; border-right-color: #ffb800; width: 60px; height: 60px; margin: 0 auto;">
                <div class="radar-spinner-center" style="font-size: 26px;">🎉</div>
            </div>

            <div class="modal-glow-badge mb-1" style="color: #00f2fe; border-color: rgba(0, 242, 254, 0.4);">
                ИТОГИ ПРОДАЖИ
            </div>

            <h3 class="font-bold mb-1 color-cyan" style="font-size: 18px;">АВТОМОБИЛЬ ПРОДАН! 🤝</h3>
            <div class="sub-label mb-3" style="font-size: 11px;">
                Машина «<b>${escapeHtml(carName)}</b>» успешно передана новому владельцу!
            </div>

            <!-- КАРТОЧКА 1: ОБЩАЯ ВЫРУЧКА (НЕОНОВЫЙ ЦИАН) -->
            <div class="deal-reward-card reward-revenue" style="display:flex; align-items:center; gap:12px; padding:12px 14px; margin-bottom:10px; border-radius:12px; background:#0b1320; border:1px solid rgba(0,242,254,0.4); text-align:left;">
                <div style="width:40px; height:40px; border-radius:10px; background:rgba(0,242,254,0.12); color:#00f2fe; display:flex; align-items:center; justify-content:center; font-size:20px; border:1px solid rgba(0,242,254,0.3);">
                    <i class="fa-solid fa-sack-dollar"></i>
                </div>
                <div style="flex:1;">
                    <div style="font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">ВЫРУЧКА С ПРОДАЖИ</div>
                    <div style="font-size:18px; font-weight:800; color:#00f2fe; text-shadow:0 0 10px rgba(0,242,254,0.4);">+${Number(salePrice).toLocaleString()} ₽</div>
                    <div style="font-size:10.5px; color:#64748b;">Зачислено на баланс игрока</div>
                </div>
            </div>

            <!-- КАРТОЧКА 2: ЧИСТАЯ МАРЖА (ЗОЛОТОЙ ЯНТАРЬ / КРАСНЫЙ) -->
            <div class="deal-reward-card reward-profit" style="display:flex; align-items:center; gap:12px; padding:12px 14px; margin-bottom:14px; border-radius:12px; background:#0b1320; border:1px solid ${isProfitPositive ? 'rgba(255,184,0,0.45)' : 'rgba(255,75,75,0.45)'}; text-align:left;">
                <div style="width:40px; height:40px; border-radius:10px; background:${isProfitPositive ? 'rgba(255,184,0,0.12)' : 'rgba(255,75,75,0.12)'}; color:${isProfitPositive ? '#ffb800' : '#ff4b4b'}; display:flex; align-items:center; justify-content:center; font-size:20px; border:1px solid ${isProfitPositive ? 'rgba(255,184,0,0.3)' : 'rgba(255,75,75,0.3)'};">
                    <i class="fa-solid ${isProfitPositive ? 'fa-chart-line-up' : 'fa-chart-line-down'}"></i>
                </div>
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">
                            ${isProfitPositive ? 'ЧИСТАЯ ПРИБЫЛЬ' : 'ФИКСИРОВАННЫЙ УБЫТОК'}
                        </span>
                        <span class="tag-badge" style="background:${isProfitPositive ? 'rgba(255,184,0,0.15)' : 'rgba(255,75,75,0.15)'}; color:${isProfitPositive ? '#ffb800' : '#ff4b4b'}; border:1px solid ${isProfitPositive ? 'rgba(255,184,0,0.3)' : 'rgba(255,75,75,0.3)'}; font-size:9.5px; padding:1px 5px; border-radius:4px;">
                            ${isProfitPositive ? '+' : ''}${roi}% ROI
                        </span>
                    </div>
                    <div style="font-size:18px; font-weight:800; color:${isProfitPositive ? '#ffb800' : '#ff4b4b'}; text-shadow:0 0 10px ${isProfitPositive ? 'rgba(255,184,0,0.4)' : 'rgba(255,75,75,0.4)'};">
                        ${isProfitPositive ? '+' : ''}${Number(profit).toLocaleString()} ₽
                    </div>
                    <div style="font-size:10.5px; color:#64748b;">
                        ${isProfitPositive ? 'Маржа с учётом расходов на покупку' : 'Продажа ниже себестоимости'}
                    </div>
                </div>
            </div>

            <button onclick="ModalManager.close('modalCarSoldSuccess')" class="btn btn-green w-full" style="font-weight:700; padding:12px; font-size:14px; border-radius:10px;">
                ЗАБРАТЬ ✓
            </button>
        </div>
    `;

    ModalManager.open('modalCarSoldSuccess');
    safePlaySound('win');
    safeTgHaptic('success');
}

// --------------------------------------------------------
// ПЕРЕХВАТЧИК СТАРОГО openVerdictModal (ДЛЯ ИСКЛЮЧЕНИЯ ДУБЛИРОВАНИЯ СУММ)
// --------------------------------------------------------
if (typeof window !== 'undefined') {
    const originalOpenVerdictModal = window.openVerdictModal;
    window.openVerdictModal = function(title, desc, isGood, reward = null) {
        // Если это окно продажи автомобиля с двумя суммами в тексте или наградах
        if (title && (title.includes('ПРОДАН') || title.includes('СДЕЛКА')) && desc && desc.includes('успешно передана')) {
            const matches = desc.match(/\d[\d\s]*\d/g);
            if (matches && matches.length >= 2) {
                const salePrice = parseInt(matches[0].replace(/\s/g, ''), 10) || 0;
                const profit = parseInt(matches[1].replace(/\s/g, ''), 10) || 0;
                const carNameMatch = desc.match(/«([^»]+)»/);
                const carName = carNameMatch ? carNameMatch[1] : 'Автомобиль';
                return openCarSoldSuccessModal(carName, salePrice, profit);
            }
        }
        if (typeof originalOpenVerdictModal === 'function') {
            return originalOpenVerdictModal.apply(this, arguments);
        }
    };
}

// ========================================================
// ЭКСПОРТ В WINDOW
// ========================================================
Object.assign(window, {
    openOBD2Modal,
    renderGarageOBDFinal,
    clearOBDCodesQuick,
    repairDefectInGarage,
    closeOBD2Modal,
    openImpoundLotModal,
    closeImpoundModal,
    resolveImpoundTowTruck,
    resolveImpoundFreePass,
    resolveImpoundBribe,
    resolveImpoundOfficialPay,
    resolveImpoundScrap,
    openChangePlateModal,
    closeChangePlateModal,
    applyPlateToCar,
    removePlateFromCar,
    triggerGarageRandomEvent,
    resolveGarageEvent,
    closeGarageEventModal,
    openCarSoldSuccessModal
});

console.log('[🏠 garage-dialogs v2.1.0] Интерактивные итоги сделки (Выручка + Маржа ROI) и PlatesManager v2.0.0 ✓');
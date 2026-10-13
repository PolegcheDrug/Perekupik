// ========================================================
// js/garage-dialogs.js — OBD2, ШТРАФСТОЯНКА, НОМЕРА И ИВЕНТЫ
// ========================================================

let activeImpoundCarIndex = null;
let activeGarageEventCar = null;

// --- OBD2 ДИАГНОСТИКА ---
function openOBD2Modal() {
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) return;
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
        { pct: 25, msg: "> Подключение к ЭБУ ДВС (DME/ECU)... Связь 100%", type: "success" },
        { pct: 50, msg: "> Опрос трансмиссии (EGS), соленоиды давления...", type: "" },
        { pct: 75, msg: "> Сканирование ABS/ESP и подушек SRS...", type: "" },
        { pct: 100, msg: "> Чтение сохранённых ошибок в памяти DTC...", type: car.hiddenDefect ? "error" : "success" }
    ];

    let stepIdx = 0;
    const scanInterval = setInterval(() => {
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
    }, 450);
}

function renderGarageOBDFinal(car, resBox, actBox) {
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
    if (!car || !car.hiddenDefect) return;

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
    recalculateCarMarketValue(car);

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

// --- СПЕЦСТОЯНКА ГИБДД ---
function openImpoundLotModal(idx) {
    activeImpoundCarIndex = idx;
    const car = safeGetCar(idx);
    if (!car) return;

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

            <button onclick="ModalManager.close('modalImpoundLot')" class="btn btn-dark w-full">Закрыть</button>
        </div>
    `;

    ModalManager.open('modalImpoundLot');
    safePlaySound('tick');
}

function resolveImpoundTowTruck() {
    if (activeImpoundCarIndex === null) return;
    const car = safeGetCar(activeImpoundCarIndex);
    if (!car) return;

    car.impounded = false;
    ModalManager.close('modalImpoundLot');
    safeSaveState();
    safeUpdateHeaderUI();
    renderGarage();
    safePlaySound('win');
    safeTgHaptic('success');
    safeShowToast("Эвакуатор службы «Шериф» забрал машину обратно в гараж (0 ₽)!");
}

function resolveImpoundFreePass() {
    if (activeImpoundCarIndex === null) return;
    const car = safeGetCar(activeImpoundCarIndex);
    if (!car) return;

    const passes = state.player?.freeImpoundPasses || 0;
    if (passes <= 0) return safeShowToast("У вас нет талонов бесплатного забора!");

    state.player.freeImpoundPasses -= 1;
    car.impounded = false;

    ModalManager.close('modalImpoundLot');
    safeSaveState();
    safeUpdateHeaderUI();
    renderGarage();
    safePlaySound('win');
    safeTgHaptic('success');
    safeShowToast("Автомобиль бесплатно освобожден по талону спецстоянки!");
}

function resolveImpoundBribe(type) {
    if (activeImpoundCarIndex === null) return;
    const car = safeGetCar(activeImpoundCarIndex);
    if (!car) return;

    if (type === 'cash') {
        const cost = 45000;
        if ((state.player?.cash || 0) < cost) return safeShowToast("Не хватает денег на взятку!");
        state.player.cash -= cost;
        safeShowToast("Вопрос урегулирован наличными (-45,000 ₽)!");
    } else {
        if ((state.player?.connections || 0) < 1) return safeShowToast("У вас нет теневых связей 🤝!");
        state.player.connections -= 1;
        safeShowToast("Решала забрал ключи со спецстоянки (-1 🤝)!");
    }

    car.impounded = false;
    ModalManager.close('modalImpoundLot');
    safeSaveState();
    safeUpdateHeaderUI();
    renderGarage();
    safePlaySound('win');
    safeTgHaptic('success');
}

function resolveImpoundOfficialPay() {
    if (activeImpoundCarIndex === null) return;
    const car = safeGetCar(activeImpoundCarIndex);
    if (!car) return;

    const cost = 30000;
    if ((state.player?.cash || 0) < cost) return safeShowToast("Не хватает денег для оплаты квитанции!");

    state.player.cash -= cost;
    car.impounded = false;
    ModalManager.close('modalImpoundLot');
    safeSaveState();
    safeUpdateHeaderUI();
    renderGarage();
    safePlaySound('win');
    safeTgHaptic('success');
    safeShowToast("Штраф и эвакуация оплачены! Автомобиль возвращён.");
}

async function resolveImpoundScrap(reward) {
    if (activeImpoundCarIndex === null) return;
    const car = safeGetCar(activeImpoundCarIndex);
    if (!car || !car.isRegisteredOnPlayer) return;

    if (!confirm(`Сдать «${car.name}» в утиль? Автомобиль будет списан из гаража.`)) return;

    if (window.FB_Bridge?.Plates && car.plate && !car.plate.includes("ТРАНЗИТ")) {
        try {
            await window.FB_Bridge.Plates.releasePlate(car.plate, null, true);
        } catch (e) {
            console.warn("[Garage] Ошибка архивации номера при списании:", e);
        }
    }

    state.player.cash = (state.player.cash || 0) + reward;
    state.garage.splice(activeImpoundCarIndex, 1);
    ModalManager.close('modalImpoundLot');
    safeSaveState();
    safeUpdateHeaderUI();
    renderGarage();
    safePlaySound('win');
    safeTgHaptic('success');

    if (typeof openVerdictModal === 'function') {
        openVerdictModal("УТИЛИЗАЦИЯ ЗАВЕРШЕНА ♻️", `Автомобиль снят с государственного учёта.\nВыплачено: +${reward.toLocaleString()} ₽`, true);
    }
}

// --- НОМЕРНЫЕ ЗНАКИ ---
function openChangePlateModal() {
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) return;
    const car = safeGetCar(window.previewCarIndex);
    if (!car) return;

    ModalManager.close('modalPreview');
    const modal = ensureModal('modalChangePlate');

    const plates = state.ownedPlates || [];
    let platesListHtml = "";

    if (plates.length === 0) {
        platesListHtml = "<div class='sub-label text-center py-4'>У вас нет свободных госномеров в инвентаре.</div>";
    } else {
        plates.forEach(p => {
            const pCost = (typeof calculatePlateValue === 'function') ? calculatePlateValue(p) : 0;
            platesListHtml += `
            <div class="glass-card flex-between p-2 mb-1">
                <div>
                    <span class="license-plate">${escapeHtml(p)} <div class="license-flag">RUS</div></span>
                    <div class="sub-label mt-1" style="font-size:9.5px;">Оценка знака: <b class="color-amber">+${pCost.toLocaleString()} ₽</b></div>
                </div>
                <button onclick="applyPlateToCar('${p}')" class="btn btn-cyan btn-auto btn-sm">Повесить</button>
            </div>`;
        });
    }

    modal.innerHTML = `
        <div class="modal-box">
            <div class="flex-between mb-2">
                <div class="modal-glow-badge"><i class="fa-solid fa-id-card"></i> РЕГИСТРАЦИОННЫЕ ЗНАКИ</div>
                <button onclick="ModalManager.close('modalChangePlate')" class="btn btn-dark btn-auto btn-sm">✕</button>
            </div>
            <button onclick="removePlateFromCar()" class="btn btn-amber mb-2 w-full">Снять номер на транзиты (-2,000 ₽)</button>
            <div id="changePlateList" class="space-y-2 mb-2" style="max-height: 240px; overflow-y: auto;">
                ${platesListHtml}
            </div>
            <button onclick="ModalManager.close('modalChangePlate')" class="btn btn-dark w-full">Отмена</button>
        </div>
    `;

    ModalManager.open('modalChangePlate');
}

async function applyPlateToCar(plateStr) {
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) return;
    const car = safeGetCar(window.previewCarIndex);
    if (!car) return;

    const oldVal = car.marketValue || car.basePrice || 100000;
    const curPlate = car.customPlate || car.plate;
    
    if (curPlate && curPlate !== "ТРАНЗИТ" && window.FB_Bridge?.Plates) {
        try {
            await window.FB_Bridge.Plates.releasePlate(curPlate, null, false);
            if (!state.ownedPlates) state.ownedPlates = [];
            state.ownedPlates.push(curPlate);
        } catch (e) {
            console.warn("[Garage] Ошибка освобождения номера:", e);
        }
    }

    if (window.FB_Bridge?.Plates) {
        try {
            const claimRes = await window.FB_Bridge.Plates.claimPlateAtomic(plateStr, null, car.id);
            if (claimRes && !claimRes.success) {
                return safeShowToast(`Ошибка закрепления номера: ${claimRes.error}`);
            }
        } catch (e) {
            console.warn("[Garage] Ошибка закрепления номера:", e);
        }
    }

    car.customPlate = plateStr;
    car.plate = plateStr;
    state.ownedPlates = (state.ownedPlates || []).filter(p => p !== plateStr);

    const newVal = recalculateCarMarketValue(car);
    const diff = newVal - oldVal;

    ModalManager.close('modalChangePlate');
    safeSaveState();
    renderGarage();
    openCarPreviewModal(window.previewCarIndex);
    safePlaySound('win');
    safeTgHaptic('success');

    if (diff > 0) {
        if (typeof spawnFloatingReward === 'function') spawnFloatingReward(`+${diff.toLocaleString()} ₽ к оценке авто!`);
        safeShowToast(`Блатные номера ${plateStr} установлены! Оценка авто выросла на +${diff.toLocaleString()} ₽ 🔥`);
    } else {
        safeShowToast(`Номера ${plateStr} успешно установлены на автомобиль!`);
    }
}

async function removePlateFromCar() {
    if (window.previewCarIndex === null || window.previewCarIndex === undefined) return;
    const car = safeGetCar(window.previewCarIndex);
    if (!car) return;

    const curPlate = car.customPlate || car.plate;
    if (!curPlate || curPlate === "ТРАНЗИТ") return safeShowToast("На машине уже висят транзиты!");

    const cash = state.player?.cash || 0;
    if (cash < 2000) return safeShowToast("Нужно 2,000 ₽ на госпошлину снятия номеров!");

    state.player.cash -= 2000;

    if (window.FB_Bridge?.Plates) {
        try {
            await window.FB_Bridge.Plates.releasePlate(curPlate, null, false);
        } catch (e) {
            console.warn("[Garage] Ошибка снятия номера:", e);
        }
    }

    if (!state.ownedPlates) state.ownedPlates = [];
    state.ownedPlates.push(curPlate);

    const oldVal = car.marketValue || car.basePrice || 100000;
    car.customPlate = "ТРАНЗИТ";
    car.plate = "ТРАНЗИТ";

    const newVal = recalculateCarMarketValue(car);
    const diff = oldVal - newVal;

    ModalManager.close('modalChangePlate');
    safeSaveState();
    safeUpdateHeaderUI();
    renderGarage();
    openCarPreviewModal(window.previewCarIndex);
    safePlaySound('tick');
    safeTgHaptic('light');

    if (diff > 0 && typeof spawnFloatingReward === 'function') {
        spawnFloatingReward(`-${diff.toLocaleString()} ₽`);
    }
    safeShowToast(`Госномер ${curPlate} снят и убран в инвентарь!`);
}

// --- СУТОЧНЫЕ ИВЕНТЫ ---
function triggerGarageRandomEvent() {
    if (!Array.isArray(state.garage) || state.garage.length === 0) return;
    if (Math.random() > 0.20) return;

    const randIdx = Math.floor(Math.random() * state.garage.length);
    const car = state.garage[randIdx];
    if (!car) return;

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
                recalculateCarMarketValue(car);
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
                    recalculateCarMarketValue(car);
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
                recalculateCarMarketValue(car);
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
    if (!activeGarageEventCar) return;
    const { car, event } = activeGarageEventCar;

    if (type === 'fix') {
        const cash = state.player?.cash || 0;
        if (cash < event.cost) return safeShowToast("Не хватает денег на устранение!");
        state.player.cash -= event.cost;
        safeShowToast("Проблема успешно устранена!");
        safePlaySound('win');
        safeTgHaptic('success');
    } else {
        if (typeof event.onIgnore === 'function') event.onIgnore();
        safeShowToast("Вы проигнорировали инцидент. Состояние авто снизилось.");
        safeTgHaptic('error');
    }

    ModalManager.close('modalGarageEvent');
    activeGarageEventCar = null;
    safeSaveState();
    renderGarage();
    safeUpdateHeaderUI();
}

Object.assign(window, {
    openOBD2Modal,
    renderGarageOBDFinal,
    clearOBDCodesQuick,
    repairDefectInGarage,
    closeOBD2Modal,
    openImpoundLotModal,
    resolveImpoundTowTruck,
    resolveImpoundFreePass,
    resolveImpoundBribe,
    resolveImpoundOfficialPay,
    resolveImpoundScrap,
    openChangePlateModal,
    applyPlateToCar,
    removePlateFromCar,
    triggerGarageRandomEvent,
    resolveGarageEvent
});
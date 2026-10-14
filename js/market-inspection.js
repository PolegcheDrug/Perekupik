// ========================================================
// js/market-inspection.js — ТОЛЩИНОМЕР, OBD2 И АВТОТЕКА
// ========================================================

let activeInspectCarId = null;
let isOBDScanningInProgress = false;

// --- ТОЛЩИНОМЕР ЛКП ---
function openGaugeModal(carId) { 
    activeInspectCarId = carId;
    if (!state.marketFeed) return;
    const car = state.marketFeed.find(c => c && c.id === carId);
    if (!car) return;

    let hasGauge = !!(state.player && state.player.tools && (state.player.tools.gauge || state.player.tools.gauge_pro));

    if (!hasGauge) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('warning');
        return showToast("⚠️ У вас нет толщиномера! Купите его в Авто-Маркете.");
    }

    let toolKey = state.player?.tools?.gauge_pro ? 'gauge_pro' : 'gauge';
    let wear = state.player?.toolsWear ? (state.player.toolsWear[toolKey] || 0) : 0;
    
    if (wear <= 0) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('warning');
        return showToast("⚠️ Батарея толщиномера села! Откалибруйте его в Авто-Маркете.");
    }

    state.player.toolsWear[toolKey] = Math.max(0, wear - 1);
    car.gaugeChecked = true;

    ['hood', 'roof', 'doors', 'wings'].forEach(part => {
        const el = document.getElementById("part-" + part);
        if (el) el.innerHTML = "Замерить";
    });

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('gauge_check', 1);
    }

    if (typeof saveState === 'function') saveState();
    ModalManager.open("modalGauge");
}

function checkBodyPart(part) { 
    if (!activeInspectCarId || !state.marketFeed) return;
    const car = state.marketFeed.find(c => c && c.id === activeInspectCarId);
    if (!car || !car.bodyThickness) return;
    
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');
    
    let val = car.bodyThickness[part] ? car.bodyThickness[part] : 110;
    const el = document.getElementById("part-" + part);
    if (el) {
        if (val > 200) {
            el.innerHTML = "<span class='color-red'>" + val + " мкм (Шпакля)</span>";
        } else {
            el.innerHTML = "<span class='color-green'>" + val + " мкм (Завод)</span>";
        }
    }
}

function closeGaugeModal() {
    ModalManager.close("modalGauge");
    activeInspectCarId = null;
    if (typeof playSound === 'function') playSound('tick');
    if (typeof renderMarketHaggleControls === 'function') renderMarketHaggleControls();
}

// --- LAUNCH OBD2 У КАПОТА ---
function quickOBDScanMarketCar(carId) {
    if (isOBDScanningInProgress) return;
    const car = state.marketFeed.find(c => c && c.id === carId);
    if (!car) return;

    let hasScanner = !!(state.player && state.player.tools && (state.player.tools.obd || state.player.tools.obd_launch));

    if (!hasScanner) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('warning');
        return showToast("⚠️ У вас нет сканера OBD2! Купите ELM327 или Launch в Авто-Маркете.");
    }

    let toolKey = state.player?.tools?.obd_launch ? 'obd_launch' : 'obd';
    let wear = state.player?.toolsWear ? (state.player.toolsWear[toolKey] || 0) : 0;
    
    if (wear <= 0) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('warning');
        return showToast("⚠️ Сканер полностью разряжен! Откалибруйте его в Авто-Маркете.");
    }

    state.player.toolsWear[toolKey] = Math.max(0, wear - 1);
    car.stoChecked = true;
    isOBDScanningInProgress = true;
    if (typeof saveState === 'function') saveState();

    const resBox = document.getElementById('obd2ResultBox');
    const actBox = document.getElementById('obd2ActionBox');
    if (typeof setTxt === 'function') setTxt('obd2CarTitle', `Диагностика CAN-шины: ${car.name}`);

    ModalManager.open("modalOBD2");
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('medium');

    if (resBox) {
        resBox.innerHTML = `
            <div class="obd-cyber-display">
                <div class="flex-between text-xs mb-2">
                    <span class="color-cyan font-bold"><i class="fa-solid fa-satellite-dish"></i> ПОДКЛЮЧЕНИЕ К РАЗЪЕМУ OBD2...</span>
                    <span class="sub-label">ISO 15765-4</span>
                </div>
                <div class="obd-progress-track">
                    <div class="obd-progress-bar" id="obdScanProgressFill"></div>
                </div>
                <div class="obd-scan-matrix-screen" id="obdTerminalLines">
                    <div class="obd-terminal-line">> Чтение блоков управления ДВС, АКПП и SRS...</div>
                </div>
            </div>
        `;
    }

    if (actBox) {
        actBox.innerHTML = `<button class="btn btn-dark w-full opacity-50" disabled><i class="fa-solid fa-spinner fa-spin"></i> СКАНИРОВАНИЕ БЛОКОВ УПРАВЛЕНИЯ...</button>`;
    }

    const terminalEl = document.getElementById('obdTerminalLines');
    const progFill = document.getElementById('obdScanProgressFill');

    const scanSteps = [
        { pct: 25, msg: "> Опрос ЭБУ Двигателя (DME/ECU)... Связь 100%", type: "success" },
        { pct: 50, msg: "> Диагностика трансмиссии (EGS), соленоиды давления...", type: "" },
        { pct: 75, msg: "> Тормозная система ABS/ESP и подушки Airbag...", type: "" },
        { pct: 100, msg: "> Чтение сохранённых ошибок в памяти DTC...", type: car.hiddenDefect ? "error" : "success" }
    ];

    let currentStep = 0;
    const scanInterval = setInterval(() => {
        if (currentStep < scanSteps.length) {
            const step = scanSteps[currentStep];
            if (progFill) progFill.style.width = step.pct + "%";
            if (terminalEl) {
                terminalEl.innerHTML += `<div class="obd-terminal-line ${step.type}">${step.msg}</div>`;
                terminalEl.scrollTop = terminalEl.scrollHeight;
            }
            if (typeof playSound === 'function') playSound('tick');
            currentStep++;
        } else {
            clearInterval(scanInterval);
            isOBDScanningInProgress = false;

            if (typeof trackQuestProgress === 'function') {
                trackQuestProgress('obd_scan', 1);
            }

            renderOBDFinalResults(car, resBox, actBox);
        }
    }, 450);
}

function renderOBDFinalResults(car, resBox, actBox) {
    let eng = car.wear?.engine ? Math.round(car.wear.engine) : 90;
    let trans = car.wear?.transmission ? Math.round(car.wear.transmission) : 90;

    if (car.hiddenDefect) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');
        let def = car.hiddenDefect;

        resBox.innerHTML = `
            <div class="obd-cyber-display" style="border-color: var(--red);">
                <div class="flex-between text-xs mb-2">
                    <span class="color-red font-bold"><i class="fa-solid fa-triangle-exclamation"></i> НАЙДЕН DTC КОД: ${def.code || 'P0300'}</span>
                    <span class="tag-badge bg-tag-red">${def.severity || 'Критическая'}</span>
                </div>
                <div class="obd-scan-matrix-screen mb-2" style="border-color: rgba(255, 51, 102, 0.4);">
                    <div class="obd-terminal-line error">> НЕИСПРАВНОСТЬ: ${def.text}</div>
                    <div class="obd-terminal-line warn">> БЛОК: ${def.system || 'ЭБУ ДВС DME'}</div>
                    <div class="obd-terminal-line">> ЦЕНА РЕМОНТА: ~${(def.cost || 15000).toLocaleString()} ₽</div>
                </div>
                <div class="grid-3 text-xs p-2" style="background: rgba(0,0,0,0.6); border-radius: 8px;">
                    <div>RPM: <b class="color-cyan">${def.rpm || 850}</b></div>
                    <div>ОЖ: <b class="${car.engineTemp > 100 ? 'color-red' : 'color-green'}">${car.engineTemp || 90}°C</b></div>
                    <div>Буст: <b class="color-amber">${def.boost || 0.0} bar</b></div>
                </div>
            </div>
        `;

        actBox.innerHTML = `
            <button onclick="closeOBD2Modal(); renderMarketHaggleControls();" class="btn btn-cyan w-full mt-2">
                Понятно (Ткнуть продавца носом в ошибку!)
            </button>
        `;
    } else {
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

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

        actBox.innerHTML = `
            <button onclick="closeOBD2Modal(); renderMarketHaggleControls();" class="btn btn-green w-full mt-2">
                Завершить проверку ✓
            </button>
        `;
    }
}

function closeOBD2Modal() {
    ModalManager.close("modalOBD2");
}

// --- ОТЧЁТ АВТОТЕКИ ---
function openAutotekaModal(carId) {
    if (!state.marketFeed) return;
    const car = state.marketFeed.find(c => c && c.id === carId);
    if (!car) return;
    car.viewed = true;
    
    if (!car.autotekaChecked) {
        let isVip = !!(state.player && state.player.vipPro);
        const cost = isVip ? 0 : 5000;
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;
        
        if (cash < cost && !isVip) return showToast("Автотека стоит 5,000 ₽!");
        state.player.cash -= cost;
        car.autotekaChecked = true;
        showToast("🔍 Базы ГИБДД проверены! Госномер официально подтверждён.");
        if (typeof saveState === 'function') saveState();
    }
    
    const rep = document.getElementById("autotekaReportContent");
    if (rep) {
        let cName = car.name ? car.name : "Автомобиль";
        let cPlate = car.plate ? car.plate : "ТРАНЗИТ";
        let dtpCount = car.hiddenDefect ? "2 ДТП (В расчётах СТО)" : "ДТП не зафиксированы";
        let dtpBadgeClass = car.hiddenDefect ? "bg-tag-red" : "bg-tag-green";
        
        let legalStatus = car.isStolen
            ? "<span class='tag-badge bg-tag-red'>🚨 В РОЗЫСКЕ / ПЕРЕБИТ VIN</span>"
            : "<span class='tag-badge bg-tag-green'>✓ ЮРИДИЧЕСКИ ЧИСТ</span>";

        let mVal = car.mileage ? car.mileage : 85000;
        let mileagePercent = Math.min(100, Math.round((mVal / 250000) * 100));
        let odoWarning = car.rolledOdometer
            ? "<span class='color-red text-xs font-bold'>⚠ Зафиксирована скрутка пробега!</span>"
            : "<span class='color-green text-xs font-bold'>✓ Пробег подтвержден станциями ТО</span>";

        let engWear = car.wear?.engine ? Math.round(car.wear.engine) : 85;
        let transWear = car.wear?.transmission ? Math.round(car.wear.transmission) : 85;
        let avgTech = Math.round((engWear + transWear) / 2);

        let pts = car.ptsData || {
            ownerName: "Иванов И.И.",
            ownerAvatar: "🧔",
            ownersCount: 2,
            ownershipYears: 3,
            vin: "XTA21070001234567",
            ptsType: "Электронный (ЭПТС) ✓",
            pledgeBank: "Залогов нет ✓",
            fsspRestrictions: "Ограничений нет ✓",
            taxiCheck: "В такси не использовалась ✓"
        };

        let overallScore = 10;
        if (car.hiddenDefect) overallScore -= 3;
        if (car.rolledOdometer) overallScore -= 3;
        if (car.isStolen) overallScore -= 4;
        if (car.isBeaterProject) overallScore -= 3;
        overallScore = Math.max(1, overallScore);

        let scoreColor = overallScore >= 8 ? "color-green" : (overallScore >= 5 ? "color-amber" : "color-red");

        rep.innerHTML = `
            <div class='flex-between mb-2'>
                <div>
                    <b class='color-cyan' style='font-size:13.5px;'>${cName}</b>
                    <div class='sub-label mt-1'>Подтверждённый госномер: <span class='license-plate text-xs notranslate' translate='no' style='padding:2px 6px;'>${cPlate} <div class='license-flag'>RUS</div></span></div>
                </div>
                ${legalStatus}
            </div>

            <div class='autoteka-pts-card mb-2'>
                <div class='autoteka-owner-row'>
                    <div class='autoteka-owner-avatar'>${pts.ownerAvatar}</div>
                    <div style='flex:1;'>
                        <div class='flex-between'>
                            <b class='text-xs color-amber'>Владелец по ПТС: ${pts.ownerName}</b>
                            <span class='tag-badge bg-tag-cyan'>Физлицо</span>
                        </div>
                        <div class='sub-label mt-1' style='font-size:10px;'>Срок владения: <b>${pts.ownershipYears} г.</b> | Записей в ПТС: <b>${pts.ownersCount}</b></div>
                        <div class='sub-label' style='font-size:9.5px;'>VIN: <b class='color-cyan'>${pts.vin}</b></div>
                    </div>
                </div>

                <div class='grid-2 text-xs'>
                    <div class='autoteka-stat-tile'>
                        <span class='sub-label'>Тип документа:</span>
                        <div class='font-bold mt-1'>${pts.ptsType}</div>
                    </div>
                    <div class='autoteka-stat-tile'>
                        <span class='sub-label'>Залог в банках:</span>
                        <div class='font-bold mt-1 ${pts.pledgeBank.includes("нет") ? "color-green" : "color-red"}'>${pts.pledgeBank}</div>
                    </div>
                    <div class='autoteka-stat-tile'>
                        <span class='sub-label'>База ФССП:</span>
                        <div class='font-bold mt-1 ${pts.fsspRestrictions.includes("нет") ? "color-green" : "color-red"}'>${pts.fsspRestrictions}</div>
                    </div>
                    <div class='autoteka-stat-tile'>
                        <span class='sub-label'>Работа в такси:</span>
                        <div class='font-bold mt-1 ${pts.taxiCheck.includes("не") ? "color-green" : "color-amber"}'>${pts.taxiCheck}</div>
                    </div>
                </div>
            </div>

            <div class='p-2 mb-2' style='background:#0d1424; border-radius:10px; border:1px solid rgba(255,255,255,0.06);'>
                <div class='flex-between text-xs mb-1'>
                    <span>История показаний одометра:</span>
                    <b class='color-amber notranslate' translate='no'>${mVal.toLocaleString()} км</b>
                </div>
                <div class='biz-progress-track'><div class='biz-progress-fill fill-biz-stock' style='width:${mileagePercent}%;'></div></div>
                <div class='text-right'>${odoWarning}</div>
            </div>

            <div class='p-2 mb-2' style='background:#0d1424; border-radius:10px; border:1px solid rgba(255,255,255,0.06);'>
                <div class='flex-between text-xs mb-1'>
                    <span>Ресурс силовых агрегатов:</span>
                    <b class='color-green notranslate' translate='no'>${avgTech}%</b>
                </div>
                <div class='biz-progress-track'><div class='biz-progress-fill fill-biz-lvl' style='width:${avgTech}%;'></div></div>
                <div class='sub-label text-xs notranslate' translate='no'>Двигатель: ${engWear}% | Трансмиссия: ${transWear}%</div>
            </div>

            <div class='flex-between text-xs p-2 mb-2' style='background:#0d1424; border-radius:10px; border:1px solid rgba(255,255,255,0.06);'>
                <div>
                    <span>История аварий и выплат:</span>
                    <div class='sub-label mt-1'>${dtpCount}</div>
                </div>
                <span class='tag-badge ${dtpBadgeClass}'>${car.hiddenDefect ? "БЫЛО В ДТП" : "БЕЗ ДТП"}</span>
            </div>

            <div class='flex-between p-2' style='background:rgba(0,242,254,0.05); border:1px solid var(--border-glow); border-radius:10px;'>
                <div>
                    <b class='text-xs color-cyan'>Итоговый рейтинг Автотеки:</b>
                    <div class='sub-label' style='font-size:9.5px;'>Оценка на основе баз ГИБДД, ФССП и страховых компаний</div>
                </div>
                <div class='price-val ${scoreColor}' style='font-size:20px;'>${overallScore}/10</div>
            </div>
        `;
    }
    
    ModalManager.open("modalAutoteka");
    if (typeof playSound === 'function') playSound('tick');
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
}

Object.assign(window, {
    openGaugeModal,
    checkBodyPart,
    closeGaugeModal,
    quickOBDScanMarketCar,
    renderOBDFinalResults,
    closeOBD2Modal,
    openAutotekaModal
});
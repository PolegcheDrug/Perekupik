// ========================================================
// js/market/market-inspection.js — СИСТЕМА ПРОВЕРОК, ТЕСТ-ДРАЙВА И АВТОТЕКИ PRO (v2.6.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v2.6.0:
//   - ДОБАВЛЕН ИНТЕРАКТИВНЫЙ ТЕСТ-ДРАЙВ: холодный запуск ДВС (дымность выхлопа, шумы гидриков/цепи/вкладышей),
//     проверка поведения КПП (пинки автомата, хруст синхронизатора, пробуксовка сцепления).
//   - РАСШИРЕННАЯ АВТОТЕКА PRO: хронология фиксаций техосмотра ЕАИСТО со скруткой,
//     страховые расчеты ремонтов и ДТП, запреты ФССП с суммами и залоги МФО.
//   - Сохранена полная совместимость с контекстным возвратом в окна и расходом заряда приборов.
// ========================================================

let activeInspectCarId = null;
let isOBDScanningInProgress = false;
let isInspectionInProgress = false;
let _inspectionPending = false;

// --------------------------------------------------------
// ВСПОМОГАТЕЛЬНЫЕ ГЕТТЕРЫ И ПРОВЕРКИ ИНСТРУМЕНТОВ
// --------------------------------------------------------
function _getInspectCar() {
    if (!activeInspectCarId) {
        if (window.pendingMarketCar?.car) return window.pendingMarketCar.car;
        if (window.previewCarIndex !== null && window.previewCarIndex !== undefined && state.garage?.[window.previewCarIndex]) {
            return state.garage[window.previewCarIndex];
        }
        return null;
    }
    if (state.marketFeed) {
        const found = state.marketFeed.find(c => c && (String(c.id) === String(activeInspectCarId) || c.id == activeInspectCarId));
        if (found) return found;
    }
    if (state.garage) {
        const found = state.garage.find(c => c && (String(c.id) === String(activeInspectCarId) || c.id == activeInspectCarId));
        if (found) return found;
    }
    return null;
}

function _hasTool(toolId) {
    const p = state?.player;
    if (!p) return false;

    if (p.tools && Boolean(p.tools[toolId])) return true;
    if (Array.isArray(p.inventory) && p.inventory.includes(toolId)) return true;

    if (toolId === 'gauge' && (p.hasGauge || p.tools?.gauge_pro || p.hasGaugePro)) return true;
    if (toolId === 'gauge_pro' && (p.tools?.gauge_pro || p.hasGaugePro)) return true;
    if (toolId === 'obd' && (p.hasOBD || p.tools?.obd_launch || p.hasLaunchOBD)) return true;
    if (toolId === 'obd_launch' && (p.tools?.obd_launch || p.hasLaunchOBD)) return true;

    return false;
}

function _getToolWear(toolId) {
    if (!state.player?.toolsWear) return 100;
    return state.player.toolsWear[toolId] !== undefined ? state.player.toolsWear[toolId] : 100;
}

function _consumeToolWear(toolId) {
    if (!state.player) return;
    if (!state.player.toolsWear) state.player.toolsWear = {};
    const cur = state.player.toolsWear[toolId] !== undefined ? state.player.toolsWear[toolId] : 100;
    state.player.toolsWear[toolId] = Math.max(0, cur - 1);
    if (typeof saveState === 'function') saveState();
}

function _getInspectionTiers() {
    if (typeof INSPECTION_TIERS !== 'undefined' && Array.isArray(INSPECTION_TIERS) && INSPECTION_TIERS.length > 0) {
        return INSPECTION_TIERS;
    }
    return [
        { id: 'quick',      name: 'Экспресс',    cost: 0,     desc: 'Визуально у капота',        icon: '👁', detects: ['visual'] },
        { id: 'test_drive', name: 'Тест-драйв',  cost: 0,     desc: 'Холодный пуск и прогон КПП', icon: '🚦', detects: ['cold_start', 'gearbox'] },
        { id: 'standard',   name: 'Стандарт',    cost: 5000,  desc: '+ Толщиномер + OBD2',        icon: '🔍', detects: ['visual', 'gauge', 'obd'] },
        { id: 'expert',     name: 'Экспертиза',  cost: 25000, desc: '+ Эндоскоп + компрессометр',   icon: '🔬', detects: ['visual', 'gauge', 'obd', 'endoscope', 'compression'] },
        { id: 'full',       name: 'Полная',      cost: 60000, desc: 'Всё + Автотека + подъёмник',   icon: '🏛', detects: ['visual', 'gauge', 'obd', 'endoscope', 'compression', 'autoteka', 'expert', 'cold_start'] },
        { id: 'vin_report', name: 'VIN-отчёт',   cost: 5000,  desc: 'Автотека PRO + Базы ГИБДД/ФССП', icon: '📜', detects: ['autoteka', 'autoteka_pro'] }
    ];
}

// --------------------------------------------------------
// 1. ИНТЕРАКТИВНЫЙ ТОЛЩИНОМЕР ЛКП
// --------------------------------------------------------
const BODY_SECTIONS = [
    { id: 'hood',          name: 'Капот',             side: 'Перед' },
    { id: 'roof',          name: 'Крыша',             side: 'Верх' },
    { id: 'trunk',         name: 'Крышка багажника',  side: 'Зад' },
    { id: 'front_bumper',  name: 'Передний бампер',   side: 'Перед' },
    { id: 'rear_bumper',   name: 'Задний бампер',     side: 'Зад' },
    { id: 'wing_fl',       name: 'Крыло переднее L',  side: 'Левый борт' },
    { id: 'wing_fr',       name: 'Крыло переднее R',  side: 'Правый борт' },
    { id: 'door_fl',       name: 'Дверь передняя L',  side: 'Левый борт' },
    { id: 'door_fr',       name: 'Дверь передняя R',  side: 'Правый борт' },
    { id: 'door_rl',       name: 'Дверь задняя L',    side: 'Левый борт' },
    { id: 'door_rr',       name: 'Дверь задняя R',    side: 'Правый борт' },
    { id: 'wing_rl',       name: 'Крыло заднее L',    side: 'Левый борт' },
    { id: 'wing_rr',       name: 'Крыло заднее R',    side: 'Правый борт' },
    { id: 'sill_l',        name: 'Порог и стойка L',  side: 'Проёмы L' },
    { id: 'sill_r',        name: 'Порог и стойка R',  side: 'Проёмы R' }
];

function openGaugeModal(carId) {
    activeInspectCarId = carId;
    const car = _getInspectCar();
    if (!car) return;

    const hasGauge = _hasTool('gauge') || _hasTool('gauge_pro');
    if (!hasGauge) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('warning');
        if (typeof showToast === 'function') {
            showToast("🔒 Требуется толщиномер ЛКП! Купите прибор в Авто-Маркете.");
        }
        return;
    }

    const toolKey = _hasTool('gauge_pro') ? 'gauge_pro' : 'gauge';
    const wear = _getToolWear(toolKey);
    if (wear <= 0) {
        if (typeof playSound === 'function') playSound('error');
        return showToast("⚠️ Батарея толщиномера села! Замените питание в Маркете.");
    }

    _consumeToolWear(toolKey);
    car.gaugeChecked = true;
    if (!car.inspectionStatus) car.inspectionStatus = {};
    car.inspectionStatus.gauge = true;

    if (!car.bodyThicknessMap) {
        car.bodyThicknessMap = {};
        const base = car.isRepainted ? 190 : 110;
        BODY_SECTIONS.forEach(sec => {
            let variance = Math.floor((Math.random() * 30) - 15);
            let val = base + variance;

            if (car.bodyThickness && car.bodyThickness[sec.id] !== undefined) {
                val = car.bodyThickness[sec.id];
            } else if (car.condition < 70 && (sec.id.includes('wing') || sec.id.includes('door'))) {
                if (Math.random() < 0.35) val = Math.floor(350 + Math.random() * 650);
                else if (Math.random() < 0.4) val = Math.floor(180 + Math.random() * 80);
            }
            car.bodyThicknessMap[sec.id] = {
                val: Math.max(75, val),
                checked: false
            };
        });
    }

    _renderGaugeInspectionModal(car);
    if (typeof trackQuestProgress === 'function') trackQuestProgress('gauge_check', 1);
    if (typeof saveState === 'function') saveState();
}

function _renderGaugeInspectionModal(car) {
    let modal = document.getElementById("modalGauge");
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalGauge';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const map = car.bodyThicknessMap || {};
    let cardsHtml = '';

    const groups = {};
    BODY_SECTIONS.forEach(sec => {
        if (!groups[sec.side]) groups[sec.side] = [];
        groups[sec.side].push(sec);
    });

    Object.keys(groups).forEach(sideName => {
        const items = groups[sideName];
        let itemsHtml = items.map(item => {
            const data = map[item.id] || { val: 110, checked: false };
            let statusBadge = `<button onclick="checkBodyPartInteractive('${item.id}')" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:3px 8px;">Замерить</button>`;

            if (data.checked) {
                const val = data.val;
                if (val > 260) {
                    statusBadge = `<b class="color-red" style="font-size:10px;">${val} мкм <span class="tag-badge bg-tag-red" style="font-size:7px; padding:1px 4px;">Шпакля</span></b>`;
                } else if (val > 155) {
                    statusBadge = `<b class="color-amber" style="font-size:10px;">${val} мкм <span class="tag-badge bg-tag-amber" style="font-size:7px; padding:1px 4px;">Второй слой</span></b>`;
                } else {
                    statusBadge = `<b class="color-green" style="font-size:10px;">${val} мкм <span class="tag-badge bg-tag-green" style="font-size:7px; padding:1px 4px;">Завод</span></b>`;
                }
            }

            return `
                <div class="flex-between p-2 mb-1" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                    <div style="font-size:9.5px; color:#f1f5f9; display:flex; align-items:center; gap:5px;">
                        <i class="fa-solid fa-car-side color-cyan" style="font-size:8.5px;"></i>
                        <span>${item.name}</span>
                    </div>
                    <div>${statusBadge}</div>
                </div>
            `;
        }).join('');

        cardsHtml += `
            <div class="mb-2 p-2" style="background:#090e18; border-radius:10px; border:1px solid rgba(0,242,254,0.15);">
                <div class="flex-between mb-1" style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:3px;">
                    <b class="text-xs color-cyan" style="font-size:9.5px;"><i class="fa-solid fa-layer-group mr-1"></i> ${sideName}</b>
                    <span class="sub-label" style="font-size:8px;">${items.length} зон</span>
                </div>
                ${itemsHtml}
            </div>
        `;
    });

    modal.innerHTML = `
        <div class="modal-box text-left" style="max-width:440px; max-height:88vh; display:flex; flex-direction:column;">
            <div class="flex-between mb-2">
                <div class="modal-glow-badge" style="color:var(--cyan); border-color:var(--cyan);">
                    <i class="fa-solid fa-microchip"></i> ТОЛЩИНОМЕР ЛКП
                </div>
                <button onclick="closeGaugeModal()" class="btn btn-dark btn-auto btn-sm" style="width:28px; height:28px; padding:0; display:flex; align-items:center; justify-content:center;">✕</button>
            </div>

            <div class="p-2 mb-2" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                <div class="flex-between">
                    <div>
                        <b class="text-xs color-cyan">${car.name}</b>
                        <div class="sub-label" style="font-size:8.5px;">Заводской норматив: 90–140 мкм</div>
                    </div>
                    <button onclick="checkAllBodyParts()" class="btn btn-cyan btn-sm btn-auto" style="font-size:9px; padding:4px 8px;">
                        Замерить всё в круг
                    </button>
                </div>
            </div>

            <div style="flex:1; overflow-y:auto; overflow-x:hidden; padding-right:2px; margin-bottom:10px;">
                ${cardsHtml}
            </div>

            <button onclick="closeGaugeModal()" class="btn btn-cyan w-full font-bold">
                Готово ✓
            </button>
        </div>
    `;

    if (typeof ModalManager !== 'undefined' && typeof ModalManager.open === 'function') {
        ModalManager.open("modalGauge", { closeOthers: true });
    } else {
        modal.classList.add("active");
        modal.style.display = "flex";
    }
}

function checkBodyPartInteractive(partId) {
    const car = _getInspectCar();
    if (!car || !car.bodyThicknessMap) return;

    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');

    if (car.bodyThicknessMap[partId]) {
        car.bodyThicknessMap[partId].checked = true;
    }

    _renderGaugeInspectionModal(car);
    if (typeof saveState === 'function') saveState();
}

function checkAllBodyParts() {
    const car = _getInspectCar();
    if (!car || !car.bodyThicknessMap) return;

    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('medium');

    BODY_SECTIONS.forEach(sec => {
        if (car.bodyThicknessMap[sec.id]) {
            car.bodyThicknessMap[sec.id].checked = true;
        }
    });

    _renderGaugeInspectionModal(car);
    if (typeof saveState === 'function') saveState();
    if (typeof showToast === 'function') showToast("✅ Замер всех сторон кузова завершён!");
}

function checkBodyPart(part) {
    checkBodyPartInteractive(part);
}

function _applyGaugeResultsToDeal(car) {
    if (!car || !car.bodyThicknessMap) return;

    let puttyCount = 0;
    let secondLayerCount = 0;
    let maxVal = 0;

    Object.keys(car.bodyThicknessMap).forEach(key => {
        const item = car.bodyThicknessMap[key];
        if (item && item.checked) {
            if (item.val > maxVal) maxVal = item.val;
            if (item.val > 260) {
                puttyCount++;
            } else if (item.val > 155) {
                secondLayerCount++;
            }
        }
    });

    if (!car.mechanicalDefects) car.mechanicalDefects = [];
    if (!car._revealedDefects) car._revealedDefects = [];

    if (puttyCount > 0 || secondLayerCount > 0) {
        car.isRepainted = true;
    }

    if (puttyCount > 0) {
        const defectId = 'body_putty_' + puttyCount;
        car.mechanicalDefects = car.mechanicalDefects.filter(d => !d.id.startsWith('body_putty'));
        car._revealedDefects = car._revealedDefects.filter(id => !id.startsWith('body_putty'));

        const discountPct = Math.min(25, Math.max(5, puttyCount * 4));
        car.mechanicalDefects.push({
            id: defectId,
            name: `Шпатлёвка кузова (${puttyCount} зон)`,
            desc: `Зафиксирован слой шпатлёвки до ${maxVal} мкм на ${puttyCount} деталях.`,
            severity: puttyCount >= 3 ? 'Критическая' : 'Высокая',
            cost: puttyCount * 18000,
            pricePenaltyPct: discountPct,
            detectMethod: 'gauge'
        });
        car._revealedDefects.push(defectId);
    } else if (secondLayerCount > 0) {
        const defectId = 'body_second_layer_' + secondLayerCount;
        car.mechanicalDefects = car.mechanicalDefects.filter(d => !d.id.startsWith('body_second_layer'));
        car._revealedDefects = car._revealedDefects.filter(id => !id.startsWith('body_second_layer'));

        const discountPct = Math.min(15, Math.max(3, secondLayerCount * 2));
        car.mechanicalDefects.push({
            id: defectId,
            name: `Вторичный окрас (${secondLayerCount} зон)`,
            desc: `Кузов перекрашивался вторичным слоем (160–250 мкм).`,
            severity: 'Средняя',
            cost: secondLayerCount * 7000,
            pricePenaltyPct: discountPct,
            detectMethod: 'gauge'
        });
        car._revealedDefects.push(defectId);
    }

    const thread = document.getElementById("dealChatThread");
    if (thread && !car._gaugeChatNotified) {
        const anyChecked = Object.values(car.bodyThicknessMap).some(x => x.checked);
        if (anyChecked) {
            car._gaugeChatNotified = true;
            if (puttyCount > 0) {
                thread.innerHTML += `
                    <div class="chat-msg msg-player">«Я прошёлся толщиномером: на кузове шпатлёвка в ${puttyCount} зонах (до ${maxVal} мкм)! Скрываешь кузовной ремонт?»</div>
                    <div class="chat-msg msg-seller" style="border-left-color: var(--amber);">
                        <b>🔍 Замер ЛКП:</b><br>
                        «Ладно, скрывать бессмысленно... Были притёртости. Готов подвинуться в цене у капота!»
                    </div>
                `;
            } else if (secondLayerCount > 0) {
                thread.innerHTML += `
                    <div class="chat-msg msg-player">«Толщиномер показал вторичный окрас на ${secondLayerCount} деталях. Машина крашеная.»</div>
                    <div class="chat-msg msg-seller" style="border-left-color: var(--cyan);">
                        <b>🔍 Замер ЛКП:</b><br>
                        «Красили от сколов, криминала нет! Но скидку сделаю.»
                    </div>
                `;
            } else {
                thread.innerHTML += `
                    <div class="chat-msg msg-player">«Замерил кузов толщиномером: все детали в заводских 100–140 мкм.»</div>
                    <div class="chat-msg msg-seller" style="border-left-color: var(--green);">
                        <b>🔍 Замер ЛКП:</b><br>
                        «А я говорил! Кузов полностью в родной краске!»
                    </div>
                `;
            }
            thread.scrollTop = thread.scrollHeight;
        }
    }

    if (typeof recalculateCarMarketValue === 'function') {
        recalculateCarMarketValue(car);
    }

    if (typeof saveState === 'function') saveState();
}

function closeGaugeModal() {
    const car = _getInspectCar() || window.pendingMarketCar?.car;

    if (typeof ModalManager !== 'undefined' && typeof ModalManager.close === 'function') {
        ModalManager.close("modalGauge");
    } else {
        const m = document.getElementById("modalGauge");
        if (m) { m.classList.remove('active'); m.style.display = 'none'; }
    }

    if (car) {
        _applyGaugeResultsToDeal(car);
    }

    const wasFromGarage = window.previewCarIndex !== null && window.previewCarIndex !== undefined && !window.pendingMarketCar;
    activeInspectCarId = null;
    if (typeof playSound === 'function') playSound('tick');

    if (wasFromGarage) {
        if (typeof openCarPreviewModal === 'function') {
            openCarPreviewModal(window.previewCarIndex);
        }
    } else {
        const dealModal = document.getElementById("modalMarketDeal");
        if (dealModal && (window.pendingMarketCar?.car || car)) {
            if (typeof ModalManager !== 'undefined' && typeof ModalManager.open === 'function') {
                ModalManager.open("modalMarketDeal");
            } else {
                dealModal.classList.add("active");
                dealModal.style.display = "flex";
            }
        }
        if (typeof renderMarketHaggleControls === 'function') renderMarketHaggleControls();
    }
}

// --------------------------------------------------------
// 2. ДИАГНОСТИЧЕСКИЙ СКАНЕР LAUNCH OBD2
// --------------------------------------------------------
function quickOBDScanMarketCar(carId) {
    if (isOBDScanningInProgress) return;
    const car = state.marketFeed?.find(c => c && (String(c.id) === String(carId) || c.id == carId))
        || state.garage?.find(c => c && (String(c.id) === String(carId) || c.id == carId))
        || window.pendingMarketCar?.car;
    if (!car) return;

    const hasScanner = _hasTool('obd') || _hasTool('obd_launch');
    if (!hasScanner) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('warning');
        if (typeof showToast === 'function') {
            showToast("🔒 Сканер OBD2 не найден! Купите ELM327 или Launch в Авто-Маркете.");
        }
        return;
    }

    const toolKey = _hasTool('obd_launch') ? 'obd_launch' : 'obd';
    const wear = _getToolWear(toolKey);
    if (wear <= 0) {
        if (typeof playSound === 'function') playSound('error');
        return showToast("⚠️ Сканер разряжен! Откалибруйте его в Авто-Маркете.");
    }

    _consumeToolWear(toolKey);
    car.stoChecked = true;
    if (!car.inspectionStatus) car.inspectionStatus = {};
    car.inspectionStatus.obd = true;
    isOBDScanningInProgress = true;
    if (typeof saveState === 'function') saveState();

    let modal = document.getElementById("modalOBD2");
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalOBD2';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-box text-left" style="max-width:420px;">
            <div class="flex-between mb-2">
                <div class="modal-glow-badge" style="color:var(--cyan); border-color:var(--cyan);">
                    <i class="fa-solid fa-tablet-screen-button"></i> ДИАГНОСТИКА OBD2
                </div>
                <button onclick="closeOBD2Modal()" class="btn btn-dark btn-auto btn-sm" style="width:28px; height:28px; padding:0; display:flex; align-items:center; justify-content:center;">✕</button>
            </div>
            <div class="p-2 mb-2" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                <b class="text-xs color-cyan" id="obd2CarTitle">Launch — ${car.name}</b>
            </div>
            <div id="obd2ResultBox"></div>
            <div id="obd2ActionBox" class="mt-2"></div>
        </div>
    `;

    const resBox = document.getElementById('obd2ResultBox');
    const actBox = document.getElementById('obd2ActionBox');

    if (typeof ModalManager !== 'undefined' && typeof ModalManager.open === 'function') {
        ModalManager.open("modalOBD2", { closeOthers: true });
    } else {
        modal.classList.add("active");
        modal.style.display = "flex";
    }

    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('medium');

    if (resBox) {
        resBox.innerHTML = `
            <div class="obd-cyber-display" style="background:#060a12; border:1px solid rgba(0,242,254,0.3); border-radius:10px; padding:10px;">
                <div class="flex-between text-xs mb-2">
                    <span class="color-cyan font-bold"><i class="fa-solid fa-satellite-dish"></i> ПОДКЛЮЧЕНИЕ К ЭБУ...</span>
                    <span class="sub-label">ISO 15765-4 CAN</span>
                </div>
                <div class="obd-progress-track" style="height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden; margin-bottom:8px;">
                    <div class="obd-progress-bar" id="obdScanProgressFill" style="height:100%; width:0%; background:var(--cyan); transition:width 0.3s ease;"></div>
                </div>
                <div class="obd-scan-matrix-screen" id="obdTerminalLines" style="height:110px; overflow-y:auto; font-family:monospace; font-size:9px; color:#a5f3fc; line-height:1.4;">
                    <div class="obd-terminal-line">> Инициализация Launch X431 Pro...</div>
                </div>
            </div>
        `;
    }
    if (actBox) {
        actBox.innerHTML = `<button class="btn btn-dark w-full opacity-50 btn-sm" disabled><i class="fa-solid fa-spinner fa-spin"></i> СКАНИРОВАНИЕ БЛОКОВ...</button>`;
    }

    const terminalEl = document.getElementById('obdTerminalLines');
    const progFill = document.getElementById('obdScanProgressFill');

    const mechDefects = car.mechanicalDefects || [];
    const engineDefects = mechDefects.filter(d => d.category === 'ENGINE' || d.category === 'TRANSMISSION');
    const hasEngineIssue = engineDefects.length > 0;

    const scanSteps = [
        { pct: 25, msg: "> Опрос DME/ECU двигателя... Связь 100%", type: "color-cyan" },
        { pct: 50, msg: "> Сканирование АКПП/сцепления (TCM)...", type: "" },
        { pct: 75, msg: "> Опрос блоков тормозов и безопасности (ABS/ESP/SRS)...", type: "" },
        { pct: 100, msg: "> Чтение памяти кодов DTC...", type: hasEngineIssue ? "color-red font-bold" : "color-green font-bold" }
    ];

    let step = 0;
    const interval = setInterval(() => {
        if (step < scanSteps.length) {
            const s = scanSteps[step];
            if (progFill) progFill.style.width = s.pct + "%";
            if (terminalEl) {
                terminalEl.innerHTML += `<div class="obd-terminal-line ${s.type}">${s.msg}</div>`;
                terminalEl.scrollTop = terminalEl.scrollHeight;
            }
            if (typeof playSound === 'function') playSound('tick');
            step++;
        } else {
            clearInterval(interval);
            isOBDScanningInProgress = false;
            if (typeof trackQuestProgress === 'function') trackQuestProgress('obd_scan', 1);
            _renderNewOBDResults(car, resBox, actBox, engineDefects);
        }
    }, 400);
}

function _renderNewOBDResults(car, resBox, actBox, engineDefects) {
    const engWear = car.wear?.engine ? Math.round(car.wear.engine) : 90;
    const transWear = car.wear?.transmission ? Math.round(car.wear.transmission) : 90;

    if (!car._revealedDefects) car._revealedDefects = [];
    engineDefects.forEach(d => {
        if (!car._revealedDefects.includes(d.id)) {
            car._revealedDefects.push(d.id);
        }
    });
    if (typeof saveState === 'function') saveState();

    if (engineDefects.length > 0) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');

        const defectsHtml = engineDefects.map(d => `
            <div style="background:rgba(220,38,38,0.1); border-left:3px solid var(--red); padding:6px; border-radius:4px; margin-bottom:4px;">
                <b class="color-red" style="font-size:10px;">❌ DTC: ${d.name}</b>
                <div style="font-size:8.5px; color:#fca5a5; margin-top:1px;">${d.desc}</div>
                <div style="font-size:8px; color:#ffb300; margin-top:2px;">
                    Серьёзность: <b>${d.severity}</b> | Ремонт: <b>~${(d.cost || 0).toLocaleString()} ₽</b>
                </div>
            </div>
        `).join('');

        resBox.innerHTML = `
            <div style="background:#090e18; border:1px solid var(--red); border-radius:10px; padding:10px;">
                <div class="flex-between text-xs mb-2">
                    <span class="color-red font-bold"><i class="fa-solid fa-triangle-exclamation"></i> НАЙДЕНЫ ОШИБКИ: ${engineDefects.length}</span>
                    <span class="tag-badge bg-tag-red">DTC FAULT</span>
                </div>
                <div style="max-height:140px; overflow-y:auto; margin-bottom:8px;">
                    ${defectsHtml}
                </div>
                <div class="flex-between text-xs p-2" style="background:rgba(0,0,0,0.6); border-radius:8px;">
                    <span>Ресурс ДВС: <b class="${engWear < 50 ? 'color-red' : 'color-amber'}">${engWear}%</b></span>
                    <span>Ресурс КПП: <b class="${transWear < 50 ? 'color-red' : 'color-amber'}">${transWear}%</b></span>
                </div>
            </div>
        `;
        actBox.innerHTML = `
            <button onclick="closeOBD2Modal(); if(typeof renderMarketHaggleControls==='function') renderMarketHaggleControls();" class="btn btn-cyan w-full font-bold btn-sm">
                Понятно — сбить цену у капота!
            </button>
        `;
    } else {
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        resBox.innerHTML = `
            <div style="background:#090e18; border:1px solid var(--green); border-radius:10px; padding:10px;">
                <div class="flex-between text-xs mb-2">
                    <span class="color-green font-bold"><i class="fa-solid fa-circle-check"></i> ОШИБОК DTC НЕ НАЙДЕНО</span>
                    <span class="tag-badge bg-tag-green">CAN: OK</span>
                </div>
                <div class="p-2 mb-2" style="background:rgba(0,230,118,0.06); border-radius:6px; font-family:monospace; font-size:8.5px; line-height:1.4;">
                    <div class="color-green">> Блоки DME / EGS / ABS / SRS: Ошибок нет.</div>
                    <div>> Топливные коррекции в допуске.</div>
                    <div>> Пропусков зажигания не зафиксировано.</div>
                </div>
                <div class="flex-between text-xs p-2" style="background:rgba(0,0,0,0.6); border-radius:8px;">
                    <span>Ресурс ДВС: <b class="color-green">${engWear}%</b></span>
                    <span>Ресурс КПП: <b class="color-green">${transWear}%</b></span>
                </div>
            </div>
        `;
        actBox.innerHTML = `
            <button onclick="closeOBD2Modal(); if(typeof renderMarketHaggleControls==='function') renderMarketHaggleControls();" class="btn btn-green w-full font-bold btn-sm">
                Завершить диагностику ✓
            </button>
        `;
    }
}

function _applyOBDResultsToDeal(car) {
    if (!car) return;

    const mechDefects = car.mechanicalDefects || [];
    const engineDefects = mechDefects.filter(d => d.category === 'ENGINE' || d.category === 'TRANSMISSION');

    if (!car._revealedDefects) car._revealedDefects = [];
    engineDefects.forEach(d => {
        if (!car._revealedDefects.includes(d.id)) {
            car._revealedDefects.push(d.id);
        }
    });

    const thread = document.getElementById("dealChatThread");
    if (thread && !car._obdChatNotified) {
        car._obdChatNotified = true;
        if (engineDefects.length > 0) {
            const listNames = engineDefects.map(d => d.name).join(', ');
            thread.innerHTML += `
                <div class="chat-msg msg-player">«Подключил Launch OBD2. Сканер выявил ошибки DTC: ${listNames}! ДВС/трансмиссия требуют внимания.»</div>
                <div class="chat-msg msg-seller" style="border-left-color: var(--red);">
                    <b>💻 Диагностика OBD2:</b><br>
                    «Чёрт... Не думал, что ошибки прочитаются. Готов скинуть на сервис!»
                </div>
            `;
        } else {
            thread.innerHTML += `
                <div class="chat-msg msg-player">«Подключил сканер к OBD2: блок ЭБУ чистый, критических кодов DTC нет.»</div>
                <div class="chat-msg msg-seller" style="border-left-color: var(--green);">
                    <b>💻 Диагностика OBD2:</b><br>
                    «Я же говорил, мотор и коробка работают идеально!»
                </div>
            `;
        }
        thread.scrollTop = thread.scrollHeight;
    }

    if (typeof recalculateCarMarketValue === 'function') {
        recalculateCarMarketValue(car);
    }

    if (typeof saveState === 'function') saveState();
}

function closeOBD2Modal() {
    const car = _getInspectCar() || window.pendingMarketCar?.car;

    if (typeof ModalManager !== 'undefined' && typeof ModalManager.close === 'function') {
        ModalManager.close("modalOBD2");
    } else {
        const m = document.getElementById("modalOBD2");
        if (m) { m.classList.remove('active'); m.style.display = 'none'; }
    }
    isOBDScanningInProgress = false;

    if (car) {
        _applyOBDResultsToDeal(car);
    }

    const wasFromGarage = window.previewCarIndex !== null && window.previewCarIndex !== undefined && !window.pendingMarketCar;
    if (typeof playSound === 'function') playSound('tick');

    if (wasFromGarage) {
        if (typeof openCarPreviewModal === 'function') {
            openCarPreviewModal(window.previewCarIndex);
        }
    } else {
        const dealModal = document.getElementById("modalMarketDeal");
        if (dealModal && (window.pendingMarketCar?.car || car)) {
            if (typeof ModalManager !== 'undefined' && typeof ModalManager.open === 'function') {
                ModalManager.open("modalMarketDeal");
            } else {
                dealModal.classList.add("active");
                dealModal.style.display = "flex";
            }
        }
        if (typeof renderMarketHaggleControls === 'function') renderMarketHaggleControls();
    }
}

// --------------------------------------------------------
// 3. ИНТЕРАКТИВНЫЙ ТЕСТ-ДРАЙВ И ХОЛОДНЫЙ ПУСК (v2.6.0)
// --------------------------------------------------------
function openTestDriveModal(carId) {
    activeInspectCarId = carId;
    const car = _getInspectCar();
    if (!car) return;

    let modal = document.getElementById('modalTestDrive');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalTestDrive';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    if (!car.testDriveState) {
        car.testDriveState = {
            engineStarted: false,
            gearboxTested: false,
            smokeObserved: false,
            noiseDiagnosed: false
        };
    }

    modal.innerHTML = `
        <div class="modal-box text-left" style="max-width:440px; max-height:88vh; display:flex; flex-direction:column;">
            <div class="flex-between mb-2">
                <div class="modal-glow-badge" style="color:var(--amber); border-color:var(--amber);">
                    <i class="fa-solid fa-gauge-high"></i> ТЕСТ-ДРАЙВ У КАПОТА
                </div>
                <button onclick="closeTestDriveModal()" class="btn btn-dark btn-auto btn-sm" style="width:28px; height:28px; padding:0; display:flex; align-items:center; justify-content:center;">✕</button>
            </div>

            <div class="p-2 mb-2" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                <b class="text-xs color-cyan">${car.name}</b>
                <div class="sub-label" style="font-size:8.5px;">Продавец: ${car.sellerMoodIcon || '👤'} ${car.sellerArchetype || 'Владелец'}</div>
            </div>

            <div style="flex:1; overflow-y:auto; padding-right:2px; margin-bottom:10px;">
                <!-- ЭТАП 1: ХОЛОДНЫЙ ПУСК -->
                <div class="p-2 mb-2" style="background:#090e18; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber"><i class="fa-solid fa-key mr-1"></i> 1. Холодный пуск ДВС</b>
                        <span id="tdEngineBadge" class="tag-badge ${car.testDriveState.engineStarted ? 'bg-tag-green' : 'bg-tag-dark'}">${car.testDriveState.engineStarted ? 'ЗАВЕДЕН' : 'ЗАГЛУШЕН'}</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:8.5px;">Проверка звуков под капотом (гидрики, цепь, вкладыши) и цвета дыма из глушителя.</div>
                    
                    <button onclick="startEngineColdTest()" id="btnStartColdEngine" class="btn ${car.testDriveState.engineStarted ? 'btn-dark' : 'btn-amber'} btn-sm w-full mb-2" ${car.testDriveState.engineStarted ? 'disabled' : ''}>
                        <i class="fa-solid fa-power-off mr-1"></i> Запустить на холодную
                    </button>

                    <div id="coldStartDiagnosticsBox" style="${car.testDriveState.engineStarted ? 'display:block;' : 'display:none;'}">
                        <!-- Результаты пуска -->
                    </div>
                </div>

                <!-- ЭТАП 2: ПРОГОН КОРОБКИ ПЕРЕДАЧ -->
                <div class="p-2 mb-2" style="background:#090e18; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-road mr-1"></i> 2. Проверка коробки передач</b>
                        <span id="tdGearboxBadge" class="tag-badge ${car.testDriveState.gearboxTested ? 'bg-tag-green' : 'bg-tag-dark'}">${car.testDriveState.gearboxTested ? 'ПРОВЕРЕНО' : 'НЕ ПРОВЕРЕНО'}</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:8.5px;">Переключение 1-я ➔ 2-я ➔ R под нагрузкой. Поиск пинков автомата и пробуксовки сцепления.</div>

                    <button onclick="shiftGearboxTest()" id="btnShiftGearbox" class="btn ${!car.testDriveState.engineStarted || car.testDriveState.gearboxTested ? 'btn-dark' : 'btn-cyan'} btn-sm w-full mb-2" ${!car.testDriveState.engineStarted || car.testDriveState.gearboxTested ? 'disabled' : ''}>
                        <i class="fa-solid fa-car-burst mr-1"></i> Дать газу и переключить передачи
                    </button>

                    <div id="gearboxDiagnosticsBox" style="${car.testDriveState.gearboxTested ? 'display:block;' : 'display:none;'}">
                        <!-- Результаты КПП -->
                    </div>
                </div>
            </div>

            <button onclick="closeTestDriveModal()" class="btn btn-green w-full font-bold">
                Завершить осмотр ✓
            </button>
        </div>
    `;

    if (car.testDriveState.engineStarted) _renderColdStartResults(car);
    if (car.testDriveState.gearboxTested) _renderGearboxResults(car);

    if (typeof ModalManager !== 'undefined' && typeof ModalManager.open === 'function') {
        ModalManager.open("modalTestDrive", { closeOthers: true });
    } else {
        modal.classList.add("active");
        modal.style.display = "flex";
    }
}

function startEngineColdTest() {
    const car = _getInspectCar();
    if (!car) return;

    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('medium');

    const btn = document.getElementById('btnStartColdEngine');
    if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Стартер крутит...`;
        btn.disabled = true;
    }

    setTimeout(() => {
        car.testDriveState.engineStarted = true;
        car.testDriveState.smokeObserved = true;
        car.testDriveState.noiseDiagnosed = true;

        if (!car.inspectionStatus) car.inspectionStatus = {};
        car.inspectionStatus.coldStart = true;

        _renderColdStartResults(car);

        const badge = document.getElementById('tdEngineBadge');
        if (badge) {
            badge.className = "tag-badge bg-tag-green";
            badge.textContent = "ЗАВЕДЕН";
        }

        const shiftBtn = document.getElementById('btnShiftGearbox');
        if (shiftBtn && !car.testDriveState.gearboxTested) {
            shiftBtn.disabled = false;
            shiftBtn.className = "btn btn-cyan btn-sm w-full mb-2";
        }

        if (typeof saveState === 'function') saveState();
    }, 1200);
}

function _renderColdStartResults(car) {
    const box = document.getElementById('coldStartDiagnosticsBox');
    if (!box) return;
    box.style.display = 'block';

    const smoke = car.exhaustSmoke || 'clean';
    const noise = car.engineNoise || 'quiet';

    let smokeInfo = { text: "Выхлоп прозрачный, без дыма", badge: "bg-tag-green", color: "color-green", status: "НОРМА" };
    if (smoke === 'blue') {
        smokeInfo = { text: "Сизый густой дым! Залегли кольца или износ маслосъемных колпачков.", badge: "bg-tag-red", color: "color-red", status: "МАСЛОЖОР" };
    } else if (smoke === 'white') {
        smokeInfo = { text: "Густой сладковатый белый пар! Пробита прокладка ГБЦ / антифриз в цилиндрах.", badge: "bg-tag-red", color: "color-red", status: "ПРОБИТА ГБЦ" };
    } else if (smoke === 'black') {
        smokeInfo = { text: "Чёрная копоть на перегазовке! Богатит смесь, перелив форсунок.", badge: "bg-tag-amber", color: "color-amber", status: "ПЕРЕЛИВ" };
    }

    let noiseInfo = { text: "Мотор работает ровно, посторонних звуков нет.", badge: "bg-tag-green", color: "color-green", status: "ШЕПЧЕТ" };
    if (noise === 'lifters') {
        noiseInfo = { text: "Цоканье гидрокомпенсаторов на холодную. Голодание масла.", badge: "bg-tag-amber", color: "color-amber", status: "ГИДРИКИ" };
    } else if (noise === 'timing_chain') {
        noiseInfo = { text: "Громкий звон и шелест растянутой цепи ГРМ! Требуется замена.", badge: "bg-tag-amber", color: "color-amber", status: "ЦЕПЬ ГРМ" };
    } else if (noise === 'rod_knock') {
        noiseInfo = { text: "Глухой металлический стук в нижней части блока! Провернуло вкладыши коленвала.", badge: "bg-tag-red", color: "color-red", status: "СТУК ВКЛАДЫШЕЙ" };
    }

    box.innerHTML = `
        <div class="p-2 mb-1" style="background:#050914; border-radius:6px; border:1px solid rgba(255,255,255,0.06);">
            <div class="flex-between mb-1">
                <span style="font-size:9px;">Дымность выхлопа:</span>
                <span class="tag-badge ${smokeInfo.badge}" style="font-size:7.5px;">${smokeInfo.status}</span>
            </div>
            <div class="${smokeInfo.color}" style="font-size:8.5px; line-height:1.3;">${smokeInfo.text}</div>
        </div>
        <div class="p-2" style="background:#050914; border-radius:6px; border:1px solid rgba(255,255,255,0.06);">
            <div class="flex-between mb-1">
                <span style="font-size:9px;">Акустика мотора:</span>
                <span class="tag-badge ${noiseInfo.badge}" style="font-size:7.5px;">${noiseInfo.status}</span>
            </div>
            <div class="${noiseInfo.color}" style="font-size:8.5px; line-height:1.3;">${noiseInfo.text}</div>
        </div>
    `;

    if (smoke !== 'clean' || noise !== 'quiet') {
        if (typeof playSound === 'function') playSound('error');
    } else {
        if (typeof playSound === 'function') playSound('win');
    }
}

function shiftGearboxTest() {
    const car = _getInspectCar();
    if (!car) return;

    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('medium');

    const btn = document.getElementById('btnShiftGearbox');
    if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Прогон передач...`;
        btn.disabled = true;
    }

    setTimeout(() => {
        car.testDriveState.gearboxTested = true;
        if (!car.inspectionStatus) car.inspectionStatus = {};
        car.inspectionStatus.testDrive = true;

        _renderGearboxResults(car);

        const badge = document.getElementById('tdGearboxBadge');
        if (badge) {
            badge.className = "tag-badge bg-tag-green";
            badge.textContent = "ПРОВЕРЕНО";
        }

        if (typeof saveState === 'function') saveState();
    }, 1000);
}

function _renderGearboxResults(car) {
    const box = document.getElementById('gearboxDiagnosticsBox');
    if (!box) return;
    box.style.display = 'block';

    const behavior = car.gearboxBehavior || 'smooth';

    let gbInfo = { text: "Передачи включаются чётко, автомат без пинков, сцепление схватывает в середине.", badge: "bg-tag-green", color: "color-green", status: "ИДЕАЛ" };
    if (behavior === 'kick_2nd') {
        gbInfo = { text: "Ощутимый пинок при переключении со 2-й на 3-ю передачу! Гидроблок на подходе.", badge: "bg-tag-red", color: "color-red", status: "ПИНКИ АКПП" };
    } else if (behavior === 'sync_crunch') {
        gbInfo = { text: "Хруст синхронизатора 2-й передачи при быстром переключении. Коробка изношена.", badge: "bg-tag-amber", color: "color-amber", status: "ХРУСТ МКПП" };
    } else if (behavior === 'clutch_slip') {
        gbInfo = { text: "Обороты растут быстрее скорости — сцепление буксует под нагрузкой!", badge: "bg-tag-amber", color: "color-amber", status: "БУКС СЦЕПЛЕНИЯ" };
    }

    box.innerHTML = `
        <div class="p-2" style="background:#050914; border-radius:6px; border:1px solid rgba(255,255,255,0.06);">
            <div class="flex-between mb-1">
                <span style="font-size:9px;">Поведение трансмиссии:</span>
                <span class="tag-badge ${gbInfo.badge}" style="font-size:7.5px;">${gbInfo.status}</span>
            </div>
            <div class="${gbInfo.color}" style="font-size:8.5px; line-height:1.3;">${gbInfo.text}</div>
        </div>
    `;

    if (behavior !== 'smooth') {
        if (typeof playSound === 'function') playSound('error');
    } else {
        if (typeof playSound === 'function') playSound('win');
    }
}

function closeTestDriveModal() {
    const car = _getInspectCar() || window.pendingMarketCar?.car;

    if (typeof ModalManager !== 'undefined' && typeof ModalManager.close === 'function') {
        ModalManager.close("modalTestDrive");
    } else {
        const m = document.getElementById("modalTestDrive");
        if (m) { m.classList.remove('active'); m.style.display = 'none'; }
    }

    if (car && car.testDriveState?.engineStarted) {
        _applyTestDriveResultsToDeal(car);
    }

    const wasFromGarage = window.previewCarIndex !== null && window.previewCarIndex !== undefined && !window.pendingMarketCar;
    activeInspectCarId = null;

    if (wasFromGarage) {
        if (typeof openCarPreviewModal === 'function') openCarPreviewModal(window.previewCarIndex);
    } else {
        const dealModal = document.getElementById("modalMarketDeal");
        if (dealModal && (window.pendingMarketCar?.car || car)) {
            if (typeof ModalManager !== 'undefined' && typeof ModalManager.open === 'function') {
                ModalManager.open("modalMarketDeal");
            } else {
                dealModal.classList.add("active");
                dealModal.style.display = "flex";
            }
        }
        if (typeof renderMarketHaggleControls === 'function') renderMarketHaggleControls();
    }
}

function _applyTestDriveResultsToDeal(car) {
    if (!car) return;
    const thread = document.getElementById("dealChatThread");
    if (!thread || car._testDriveChatNotified) return;

    car._testDriveChatNotified = true;

    const smoke = car.exhaustSmoke || 'clean';
    const noise = car.engineNoise || 'quiet';
    const gb = car.gearboxBehavior || 'smooth';

    const hasIssue = (smoke !== 'clean') || (noise !== 'quiet') || (gb !== 'smooth');

    if (hasIssue) {
        let issues = [];
        if (smoke === 'blue') issues.push("мотор дымит сизым");
        if (smoke === 'white') issues.push("парит антифризом");
        if (noise === 'rod_knock') issues.push("стучат вкладыши");
        if (noise === 'lifters') issues.push("цокают гидрики");
        if (gb === 'kick_2nd') issues.push("коробка пинается");

        thread.innerHTML += `
            <div class="chat-msg msg-player">«Я завёл машину и прокатился. Симптомы налицо: ${issues.join(', ')}! Скидывай на ремонт, иначе ухожу.»</div>
            <div class="chat-msg msg-seller" style="border-left-color: var(--amber);">
                <b>🚦 Тест-драйв у капота:</b><br>
                «Да ладно тебе, это ж рабочая машина... Ладно, на сервис уступлю пару десятков тысяч!»
            </div>
        `;
    } else {
        thread.innerHTML += `
            <div class="chat-msg msg-player">«Запустил на холодную, проехался — мотор работает ровно, коробка листает плавно.»</div>
            <div class="chat-msg msg-seller" style="border-left-color: var(--green);">
                <b>🚦 Тест-драйв у капота:</b><br>
                «Вот видишь! Сам лично следил за машиной, сел и поехал!»
            </div>
        `;
    }
    thread.scrollTop = thread.scrollHeight;
}

// --------------------------------------------------------
// 4. ВЫБОР УРОВНЯ ПРОВЕРКИ
// --------------------------------------------------------
function openInspectionChoiceModal(carId) {
    activeInspectCarId = carId;
    const car = _getInspectCar();
    if (!car) return;

    const tiers = _getInspectionTiers();
    const status = car.inspectionStatus || {};

    let modal = document.getElementById('modalInspectionChoice');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalInspectionChoice';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const tiersHtml = tiers.map(t => {
        const isDone = status[t.id] === true;
        const canAfford = (state.player?.cash || 0) >= t.cost;
        const disabled = isDone || (!canAfford && t.cost > 0);

        const clickHandler = disabled ? '' : `data-inspection-tier="${t.id}" data-inspection-action="run"`;
        const cursorStyle = disabled ? 'not-allowed' : 'pointer';
        const opacity = (disabled && !isDone) ? 0.55 : 1;

        return `
            <div class="inspection-tier-card" 
                 ${clickHandler}
                 data-inspection-disabled="${disabled}"
                 style="background:${isDone ? 'rgba(0,230,118,0.08)' : '#050914'};
                 border:1px solid ${isDone ? 'rgba(0,230,118,0.4)' : (disabled ? 'rgba(255,255,255,0.05)' : 'rgba(0,242,254,0.3)')};
                 border-radius:10px; cursor:${cursorStyle}; opacity:${opacity};
                 padding:10px 12px; margin-bottom:8px; transition:all 0.15s ease;">
                <div class="flex-between mb-1">
                    <div class="flex-gap" style="align-items:center;">
                        <span style="font-size:20px;">${t.icon}</span>
                        <div>
                            <b class="text-xs color-cyan">${t.name}</b>
                            <div class="sub-label" style="font-size:8.5px;">${t.desc}</div>
                        </div>
                    </div>
                    ${isDone
                        ? `<span class="tag-badge bg-tag-green">✓ ПРОВЕРЕНО</span>`
                        : `<b class="text-xs ${canAfford ? 'color-green' : 'color-red'}">${t.cost > 0 ? `${t.cost.toLocaleString()} ₽` : 'Бесплатно'}</b>`}
                </div>
            </div>
        `;
    }).join('');

    modal.innerHTML = `
        <div class="modal-box" style="max-width:420px;">
            <div class="flex-between mb-2">
                <div class="modal-glow-badge"><i class="fa-solid fa-magnifying-glass-chart"></i> ПРОВЕРКА АВТО</div>
                <button onclick="ModalManager.close('modalInspectionChoice')" class="btn btn-dark btn-auto btn-sm">✕</button>
            </div>

            <div class="p-2 mb-3" style="background:#050914; border-radius:8px;">
                <b class="text-xs color-cyan">${car.name}</b>
                <div class="sub-label" style="font-size:9px;">Продавец: ${car.sellerMoodIcon || '👤'} ${car.sellerArchetype || 'обычный'}</div>
            </div>

            <div class="sub-label mb-2" style="font-size:9.5px;">Выберите процедуру диагностики:</div>

            ${tiersHtml}

            <button onclick="ModalManager.close('modalInspectionChoice')" class="btn btn-dark w-full mt-1">Закрыть</button>
        </div>
    `;

    modal.querySelectorAll('[data-inspection-tier][data-inspection-action="run"]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const tierId = el.getAttribute('data-inspection-tier');
            runInspection(tierId);
        });
    });

    ModalManager.open('modalInspectionChoice', { closeOthers: true });
    if (typeof playSound === 'function') playSound('tick');
}

function runInspection(tierId) {
    if (_inspectionPending) return;

    if (tierId === 'test_drive') {
        ModalManager.close('modalInspectionChoice');
        openTestDriveModal(activeInspectCarId);
        return;
    }

    if (tierId === 'vin_report') {
        ModalManager.close('modalInspectionChoice');
        openAutotekaModal(activeInspectCarId);
        return;
    }

    const car = _getInspectCar();
    if (!car) return showToast("⚠️ Машина не найдена");

    const tier = _getInspectionTiers().find(t => t.id === tierId);
    if (!tier) return showToast("⚠️ Уровень проверки не найден");

    const status = car.inspectionStatus || {};
    if (status[tierId] === true) return showToast("✓ Этот уровень уже пройден");

    const detects = tier.detects || [];
    if (detects.includes('gauge') && !(_hasTool('gauge') || _hasTool('gauge_pro'))) {
        return showToast("⚠️ Нужен толщиномер ЛКП! Купите в Авто-Маркете.");
    }
    if (detects.includes('obd') && !(_hasTool('obd') || _hasTool('obd_launch'))) {
        return showToast("⚠️ Нужен сканер OBD2! Купите в Авто-Маркете.");
    }
    if (detects.includes('endoscope') && !_hasTool('endoscope')) {
        return showToast("⚠️ Нужен видеоэндоскоп!");
    }
    if (detects.includes('compression') && !_hasTool('compressor')) {
        return showToast("⚠️ Нужен компрессометр!");
    }

    if (tier.cost > 0) {
        if ((state.player?.cash || 0) < tier.cost) {
            return showToast(`Нужно ${tier.cost.toLocaleString()} ₽!`);
        }
        state.player.cash -= tier.cost;
        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Проверка авто: ${tier.name}`, tier.cost, false);
        }
    }

    if (detects.includes('gauge')) _consumeToolWear(_hasTool('gauge_pro') ? 'gauge_pro' : 'gauge');
    if (detects.includes('obd')) _consumeToolWear(_hasTool('obd_launch') ? 'obd_launch' : 'obd');
    if (detects.includes('endoscope')) _consumeToolWear('endoscope');
    if (detects.includes('compression')) _consumeToolWear('compressor');

    if (!car.inspectionStatus) car.inspectionStatus = {};
    car.inspectionStatus[tierId] = true;

    _inspectionPending = true;
    isInspectionInProgress = true;

    if (typeof saveState === 'function') saveState();
    if (typeof updateHeaderUI === 'function') updateHeaderUI();
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('medium');

    const modal = document.getElementById('modalInspectionChoice');
    if (modal) {
        modal.innerHTML = `
            <div class="modal-box text-center" style="max-width:400px;">
                <div class="radar-spinner-ring mb-3" style="margin:0 auto;">
                    <div class="radar-spinner-center" style="font-size:22px;">${tier.icon}</div>
                </div>
                <div class="modal-glow-badge mb-2"><i class="fa-solid fa-spinner fa-spin"></i> ИДЁТ ПРОВЕРКА</div>
                <b class="text-xs color-cyan">${tier.name}</b>
                <div class="sub-label mt-2" style="font-size:10px;">${tier.desc}</div>
                <div class="p-2 mt-3" style="background:#050914; border-radius:8px;">
                    <div class="obd-progress-track" style="height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
                        <div class="obd-progress-bar" id="inspectionProgressBar" style="width:0%; height:100%; background:var(--cyan); transition:width 0.25s ease;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    let pct = 0;
    const progressInterval = setInterval(() => {
        pct += 20;
        const bar = document.getElementById('inspectionProgressBar');
        if (bar) bar.style.width = Math.min(100, pct) + '%';
        if (typeof playSound === 'function') playSound('tick');
        if (pct >= 100) {
            clearInterval(progressInterval);
            setTimeout(() => {
                _inspectionPending = false;
                isInspectionInProgress = false;
                _showInspectionResults(car, tier);
            }, 300);
        }
    }, 250);
}

function _showInspectionResults(car, tier) {
    const detects = tier.detects || [];
    const foundDefects = [];
    let hiddenDefectsFound = 0;

    const mechDefects = car.mechanicalDefects || [];
    mechDefects.forEach(d => {
        if (detects.includes(d.detectMethod)) {
            foundDefects.push({ kind: 'mech', defect: d });
            if (d.isHidden) hiddenDefectsFound++;
        }
    });

    let legalFound = null;
    if (car.legalDefect && detects.includes(car.legalDefect.detectMethod)) {
        legalFound = car.legalDefect;
    }

    if (!car._revealedDefects) car._revealedDefects = [];
    foundDefects.forEach(fd => {
        const key = fd.defect.id;
        if (!car._revealedDefects.includes(key)) {
            car._revealedDefects.push(key);
        }
    });
    if (legalFound && !car._revealedLegal) {
        car._revealedLegal = legalFound.id;
    }

    if (typeof saveState === 'function') saveState();

    let defectsHtml = '';
    let totalRepairCost = 0;
    let totalPenaltyPct = 0;

    if (foundDefects.length === 0 && !legalFound) {
        defectsHtml = `
            <div class="p-3 text-center" style="background:rgba(0,230,118,0.08); border-radius:10px; border:1px solid rgba(0,230,118,0.3);">
                <div style="font-size:28px;">✅</div>
                <b class="text-xs color-green" style="font-size:12px;">Дефектов не найдено!</b>
                <div class="sub-label mt-1" style="font-size:9.5px;">Проверка на уровне «${tier.name}» не выявила проблем.</div>
            </div>
        `;
    } else {
        foundDefects.forEach(fd => {
            const d = fd.defect;
            totalRepairCost += d.cost || 0;
            totalPenaltyPct += d.pricePenaltyPct || 0;

            const severityClass = d.severity === 'Критическая' ? 'color-red'
                : (d.severity === 'Высокая' ? 'color-amber' : 'color-cyan');

            defectsHtml += `
                <div class="p-2 mb-1" style="background:rgba(255,51,102,0.08); border-radius:8px; border-left:3px solid var(--red);">
                    <div class="flex-between mb-1">
                        <b class="text-xs ${severityClass}">${d.name}</b>
                        <span class="tag-badge bg-tag-red" style="font-size:7.5px;">${d.severity}</span>
                    </div>
                    <div class="sub-label" style="font-size:9px; line-height:1.3;">${d.desc}</div>
                    <div class="flex-between mt-1" style="font-size:8.5px;">
                        <span class="color-amber">Ремонт: ~${(d.cost || 0).toLocaleString()} ₽</span>
                        <span class="color-red">-${d.pricePenaltyPct}% к цене</span>
                    </div>
                    ${d.isHidden ? `<div class="sub-label mt-1 color-purple" style="font-size:8px;">🔒 Скрытый дефект — продавец о нём умолчал!</div>` : ''}
                </div>
            `;
        });

        if (legalFound) {
            totalPenaltyPct += legalFound.pricePenaltyPct || 0;

            defectsHtml += `
                <div class="p-2 mb-1 mt-2" style="background:rgba(220,38,38,0.15); border-radius:8px; border:1.5px solid var(--red);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-red">⚖️ ${legalFound.name}</b>
                        <span class="tag-badge bg-tag-red" style="font-size:7.5px;">ЮРИД.</span>
                    </div>
                    <div class="sub-label" style="font-size:9px; line-height:1.3;">${legalFound.desc}</div>
                    <div class="sub-label mt-1 color-red font-bold" style="font-size:8.5px;">
                        ⚠️ Последствие: ${legalFound.consequence}
                    </div>
                    <div class="sub-label mt-1 color-amber" style="font-size:8.5px;">
                        -${legalFound.pricePenaltyPct}% к цене
                    </div>
                </div>
            `;
        }
    }

    const modal = document.getElementById('modalInspectionChoice');
    if (modal) {
        modal.innerHTML = `
            <div class="modal-box" style="max-width:420px; max-height:85vh; overflow-y:auto;">
                <div class="flex-between mb-2">
                    <div class="modal-glow-badge" style="color:${foundDefects.length > 0 || legalFound ? 'var(--red)' : 'var(--green)'}; border-color:${foundDefects.length > 0 || legalFound ? 'var(--red)' : 'var(--green)'};">
                        <i class="fa-solid fa-clipboard-check"></i> РЕЗУЛЬТАТЫ ПРОВЕРКИ
                    </div>
                    <button onclick="closeInspectionResults()" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                <div class="p-2 mb-2" style="background:#050914; border-radius:8px;">
                    <b class="text-xs color-cyan">${car.name}</b>
                    <div class="sub-label" style="font-size:9px;">Уровень проверки: <b>${tier.name}</b></div>
                </div>

                ${defectsHtml}

                ${foundDefects.length > 0 || legalFound ? `
                    <div class="p-2 mt-2 mb-2" style="background:rgba(255,179,0,0.1); border-radius:8px; border:1px solid rgba(255,179,0,0.4);">
                        <div class="flex-between text-xs mb-1">
                            <span>Найдено проблем:</span>
                            <b class="color-amber">${foundDefects.length + (legalFound ? 1 : 0)}</b>
                        </div>
                        <div class="flex-between text-xs mb-1">
                            <span>Стоимость ремонта:</span>
                            <b class="color-amber">~${totalRepairCost.toLocaleString()} ₽</b>
                        </div>
                        <div class="flex-between text-xs">
                            <span>Итоговое снижение цены:</span>
                            <b class="color-red">-${totalPenaltyPct}%</b>
                        </div>
                    </div>
                ` : ''}

                <div class="grid-2" style="gap:6px;">
                    <button onclick="closeInspectionResults()" class="btn btn-cyan w-full">К машине</button>
                    <button onclick="ModalManager.close('modalInspectionChoice'); if(typeof renderMarketHaggleControls==='function') renderMarketHaggleControls();" class="btn btn-green w-full">К торгу</button>
                </div>
            </div>
        `;
    }

    if (typeof playSound === 'function') playSound(foundDefects.length > 0 || legalFound ? 'error' : 'win');
    if (typeof tgHaptic === 'function') tgHaptic(foundDefects.length > 0 || legalFound ? 'warning' : 'success');
    if (typeof trackQuestProgress === 'function') trackQuestProgress('inspect_car', 1);
}

function closeInspectionResults() {
    ModalManager.close('modalInspectionChoice');
    activeInspectCarId = null;
    _inspectionPending = false;
    if (typeof renderMarketHaggleControls === 'function') renderMarketHaggleControls();
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
}

// --------------------------------------------------------
// 5. РАСШИРЕННАЯ АВТОТЕКА PRO (v2.6.0)
// --------------------------------------------------------
function openAutotekaModal(carId) {
    let car = null;
    if (state.marketFeed) car = state.marketFeed.find(c => c && (String(c.id) === String(carId) || c.id == carId));
    if (!car && state.garage) car = state.garage.find(c => c && (String(c.id) === String(carId) || c.id == carId));
    if (!car && window.pendingMarketCar?.car) car = window.pendingMarketCar.car;
    if (!car) return;

    car.viewed = true;

    if (!car.autotekaChecked) {
        const isVip = !!(state.player && state.player.vipPro);
        const cost = isVip ? 0 : 5000;
        const cash = (state.player && state.player.cash) ? state.player.cash : 0;

        if (cash < cost && !isVip) return showToast("Автотека стоит 5,000 ₽!");
        if (!isVip) {
            state.player.cash -= cost;
            if (typeof logBankTransaction === 'function') {
                logBankTransaction("Заказ отчёта Автотеки PRO", cost, false);
            }
        }
        car.autotekaChecked = true;
        if (!car.inspectionStatus) car.inspectionStatus = {};
        car.inspectionStatus.autoteka = true;
        showToast("🔍 Запрос в базы ГИБДД, ФНП, ЕАИСТО и ФССП отправлен...");
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
    }

    const legal = car.legalDefect;
    const cName = car.name || "Автомобиль";
    const cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
    const mVal = car.mileage || 85000;
    const actualMileage = car.actualMileage || (car.rolledOdometer ? Math.round(mVal * 1.8) : mVal);
    const engWear = car.wear?.engine ? Math.round(car.wear.engine) : 85;
    const transWear = car.wear?.transmission ? Math.round(car.wear.transmission) : 85;

    const pts = car.ptsData || {
        ownerName: "Иванов И.И.", ownerAvatar: "🧔",
        ownersCount: 2, ownershipYears: 3,
        vin: "XTA21070001234567",
        ptsType: "Электронный (ЭПТС) ✓",
        pledgeBank: "Залогов нет ✓",
        fsspRestrictions: "Ограничений нет ✓",
        taxiCheck: "В такси не использовалась ✓"
    };

    const autoReport = car.autotekaReport || {};

    let pledgeStatus = pts.pledgeBank || (autoReport.isPledged ? "🔴 В ЗАЛОГЕ У МФО" : "Залогов нет ✓");
    let fsspStatus = pts.fsspRestrictions || (autoReport.hasFsspRestrictions ? `🔴 ЗАПРЕТ ФССП (${(autoReport.fsspSum || 50000).toLocaleString()} ₽)` : "Ограничений нет ✓");
    let taxiStatus = pts.taxiCheck || (autoReport.isTaxi ? "⚠️ Работала в такси" : "В такси не использовалась ✓");
    let ptsTypeStatus = pts.ptsType || "Электронный (ЭПТС) ✓";

    if (legal) {
        if (legal.id === 'legal_pledge' || legal.id === 'legal_pledge_partial') pledgeStatus = "🔴 В ЗАЛОГЕ У БАНКА";
        if (legal.id === 'legal_fssp') fsspStatus = "🔴 ЗАПРЕТ ФССП";
        if (legal.id === 'legal_arrest') fsspStatus = "🔴 АРЕСТ ПРИСТАВОВ";
        if (legal.id === 'legal_taxi_former') taxiStatus = "⚠️ Работала в такси";
        if (legal.id === 'legal_pts_duplicate') ptsTypeStatus = "⚠️ Дубликат ПТС";
    }

    const isOdometerTampered = Boolean(car.rolledOdometer || car.autotekaMileageDiscrepancy || autoReport.isRolledOdo);

    // Хронология техосмотров
    let inspectionsHtml = '';
    const inspections = autoReport.inspections || [
        { date: "12.05.2021", mileage: Math.round(actualMileage * 0.35) },
        { date: "20.06.2023", mileage: Math.round(actualMileage * 0.70) },
        { date: "15.01.2025", mileage: actualMileage }
    ];

    inspectionsHtml = inspections.map((ins, i) => `
        <div class="flex-between p-1 mb-1" style="background:#050914; border-radius:4px; font-size:8.5px;">
            <span><i class="fa-solid fa-wrench color-cyan mr-1"></i> ТО от ${ins.date}:</span>
            <b class="${isOdometerTampered && ins.mileage > mVal ? 'color-red' : 'color-green'}">${ins.mileage.toLocaleString()} км</b>
        </div>
    `).join('');

    // Страховые расчеты и ДТП
    let accidentsHtml = '';
    const accidents = autoReport.accidents || [];
    const repairs = autoReport.repairCalculations || [];

    if (accidents.length > 0 || repairs.length > 0) {
        accidentsHtml = `
            <div class="autoteka-section-compact" style="border-left:3px solid var(--red); background:rgba(220,38,38,0.06);">
                <div class="autoteka-section-title">
                    <span class="color-red"><i class="fa-solid fa-car-burst mr-1"></i> ДТП И РАСЧЁТЫ СТРАХОВЫХ</span>
                    <span class="tag-badge bg-tag-red">ЕАИСТО</span>
                </div>
                ${accidents.map(a => `
                    <div class="mb-1" style="font-size:8.5px;">
                        <b>💥 ДТП от ${a.date} (${a.type}):</b>
                        <div class="sub-label" style="font-size:8px;">Повреждения: ${a.damageZone}${a.isTotalLoss ? '<b class="color-red">[ТОТАЛ / РАСПИЛ]</b>' : ''}</div>
                    </div>
                `).join('')}
                ${repairs.map(r => `
                    <div class="p-1 mb-1" style="background:#050914; border-radius:4px; font-size:8px;">
                        <div class="flex-between">
                            <span>Расчёт от ${r.date}:</span>
                            <b class="color-amber">${r.sum.toLocaleString()} ₽</b>
                        </div>
                        <div class="sub-label" style="font-size:7.5px;">Работы: ${r.works}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    let overallScore = 10;
    if (car.hiddenDefect && !car.hasAdditive) overallScore -= 2;
    if (isOdometerTampered) overallScore -= 3;
    if (car.isStolen) overallScore -= 4;
    if (legal || autoReport.isPledged || autoReport.hasFsspRestrictions) overallScore -= 3;
    if (car.isRepainted) overallScore -= 1;
    if (autoReport.isCutFrame) overallScore -= 4;
    overallScore = Math.max(1, overallScore);

    let scoreColor = overallScore >= 8 ? "color-green" : (overallScore >= 5 ? "color-amber" : "color-red");
    let scoreLabel = overallScore >= 9 ? "ИДЕАЛЬНО" : (overallScore >= 7 ? "ХОРОШО" : (overallScore >= 5 ? "ЕСТЬ РИСКИ" : "ОПАСНО"));

    const reportNum = `AT-${String(Date.now()).slice(-8)}`;
    const reportDate = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const carVIN = car.vin || pts.vin || `XTA${String(car.id || '2107000').slice(-13).padEnd(13, '0')}`;

    const rep = document.getElementById("autotekaReportContent");
    if (!rep) return;

    rep.innerHTML = `
        <div class="autoteka-official-blank">
            <div class="autoteka-watermark">АВТОТЕКА PRO</div>

            <div class="autoteka-blank-border">
                <div class="autoteka-header text-center mb-2">
                    <div class="autoteka-logo-row mb-1">
                        <span class="autoteka-logo-icon">📋</span>
                    </div>
                    <div class="autoteka-title-small">ОФИЦИАЛЬНЫЙ ОТЧЁТ СИСТЕМЫ МЕЖВЕДОМСТВЕННОГО КОНТРОЛЯ</div>
                    <h3 class="autoteka-title-main mb-1">АВТОТЕКА PRO · ИСТОРИЯ ЭКСПЛУАТАЦИИ</h3>
                    <div class="autoteka-report-num">Отчёт № <b>${reportNum}</b> от <b>${reportDate}</b></div>
                </div>

                <div class="autoteka-section-compact">
                    <div class="autoteka-section-title">
                        <span>1. ТРАНСПОРТНОЕ СРЕДСТВО</span>
                        <span class="tag-badge ${overallScore >= 7 ? 'bg-tag-green' : 'bg-tag-red'}">${overallScore >= 7 ? 'ДОПУЩЕНО' : 'ВНИМАНИЕ'}</span>
                    </div>
                    <div class="autoteka-row-compact">
                        <span class="autoteka-label">Модель:</span>
                        <b class="autoteka-value color-cyan">${cName}</b>
                    </div>
                    <div class="autoteka-row-compact">
                        <span class="autoteka-label">VIN:</span>
                        <span class="autoteka-value-mono color-cyan">${carVIN}</span>
                    </div>
                    <div class="autoteka-row-compact">
                        <span class="autoteka-label">Госномер:</span>
                        <span class="license-plate" style="font-size:10px; padding:1px 6px;">${cPlate} <span class="license-flag">RUS</span></span>
                    </div>
                </div>

                <div class="autoteka-section-compact">
                    <div class="autoteka-section-title"><span>2. ИСТОРИЯ ПРОБЕГА (ЕАИСТО / ТО)</span></div>
                    <div class="autoteka-row-compact">
                        <span class="autoteka-label">На одометре:</span>
                        <b class="autoteka-value ${isOdometerTampered ? 'color-red' : 'color-green'}">${mVal.toLocaleString()} км</b>
                    </div>
                    ${isOdometerTampered ? `
                        <div class="p-1 mb-1" style="background:rgba(220,38,38,0.15); border-radius:4px; font-size:8px; color:var(--red);">
                            <b>⚠️ СКРУТКА ПРОБЕГА!</b> В базах зафиксирован реальный пробег: <b>${actualMileage.toLocaleString()} км</b>.
                        </div>
                    ` : ''}
                    <div class="sub-label mb-1" style="font-size:8px;">Записи диагностических карт техосмотра:</div>
                    ${inspectionsHtml}
                </div>

                ${accidentsHtml}

                <div class="autoteka-section-compact">
                    <div class="autoteka-section-title"><span>3. РЕЕСТР ЗАЛОГОВ И ОГРАНИЧЕНИЙ (ФССП / ФНП)</span></div>
                    <div class="autoteka-row-compact">
                        <span class="autoteka-label">Реестр залогов:</span>
                        <b class="autoteka-value ${pledgeStatus.includes('🔴') ? 'color-red' : 'color-green'}">${pledgeStatus}</b>
                    </div>
                    <div class="autoteka-row-compact">
                        <span class="autoteka-label">Запреты приставов:</span>
                        <b class="autoteka-value ${fsspStatus.includes('🔴') ? 'color-red' : 'color-green'}">${fsspStatus}</b>
                    </div>
                    <div class="autoteka-row-compact">
                        <span class="autoteka-label">База такси / каршеринга:</span>
                        <b class="autoteka-value ${taxiStatus.includes('⚠️') ? 'color-amber' : 'color-green'}">${taxiStatus}</b>
                    </div>
                    <div class="autoteka-row-compact">
                        <span class="autoteka-label">Тип бланка ПТС:</span>
                        <b class="autoteka-value ${ptsTypeStatus.includes('Дубликат') ? 'color-amber' : 'color-green'}">${ptsTypeStatus}</b>
                    </div>
                </div>

                <div class="autoteka-score-block mt-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan">ИНДЕКС БЕЗОПАСНОСТИ СДЕЛКИ:</b>
                        <span class="tag-badge ${overallScore >= 8 ? 'bg-tag-green' : (overallScore >= 5 ? 'bg-tag-amber' : 'bg-tag-red')}" style="font-size:8px;">${scoreLabel}</span>
                    </div>
                    <div class="flex-between">
                        <div class="autoteka-score-bar" style="flex:1; height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                            <div class="autoteka-score-fill" style="width:${overallScore * 10}%; height:100%; background:${overallScore >= 8 ? 'var(--green)' : (overallScore >= 5 ? 'var(--amber)' : 'var(--red)')};"></div>
                        </div>
                        <b class="${scoreColor}" style="font-size:18px; margin-left:10px;">${overallScore}/10</b>
                    </div>
                </div>
            </div>
        </div>
    `;

    ModalManager.open("modalAutoteka");
    if (typeof playSound === 'function') playSound('tick');
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
}

// --------------------------------------------------------
// 6. ЭКСПОРТ
// --------------------------------------------------------
window.PhoneMarketInspection = {
    openInspectionChoiceModal,
    runInspection,
    openGaugeModal,
    checkBodyPart,
    checkBodyPartInteractive,
    checkAllBodyParts,
    closeGaugeModal,
    quickOBDScanMarketCar,
    closeOBD2Modal,
    openAutotekaModal,
    openTestDriveModal,
    startEngineColdTest,
    shiftGearboxTest,
    closeTestDriveModal
};

Object.assign(window, {
    openGaugeModal,
    checkBodyPart,
    checkBodyPartInteractive,
    checkAllBodyParts,
    closeGaugeModal,
    quickOBDScanMarketCar,
    closeOBD2Modal,
    openAutotekaModal,
    openInspectionChoiceModal,
    runInspection,
    closeInspectionResults,
    _showInspectionResults,
    openTestDriveModal,
    startEngineColdTest,
    shiftGearboxTest,
    closeTestDriveModal
});

console.log('[🔬 market-inspection v2.6.0] Тест-драйв у капота + Автотека PRO + ЕАИСТО ТО ✓');

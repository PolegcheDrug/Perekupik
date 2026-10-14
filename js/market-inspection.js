// ========================================================
// js/market-inspection.js — СИСТЕМА ПРОВЕРОК 2.0 (v2.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v2.0.0:
//   - 5 уровней проверки: Экспресс / Стандарт / Экспертиза / Полная / VIN
//   - Обнаружение MECHANICAL_DEFECTS и LEGAL_DEFECTS
//   - Отображение найденных дефектов с severity и стоимостью ремонта
//   - Автотека показывает юр. проблемы + PTS
//   - Совместимость со старой системой hiddenDefect
// ========================================================

let activeInspectCarId = null;
let isOBDScanningInProgress = false;
let isInspectionInProgress = false;

// --------------------------------------------------------
// ВСПОМОГАТЕЛЬНЫЕ ГЕТТЕРЫ
// --------------------------------------------------------
function _getInspectCar() {
    if (!activeInspectCarId || !state.marketFeed) return null;
    return state.marketFeed.find(c => c && c.id === activeInspectCarId) || null;
}

function _hasTool(toolId) {
    if (!state.player?.tools) return false;
    return !!state.player.tools[toolId];
}

function _getToolWear(toolId) {
    if (!state.player?.toolsWear) return 0;
    return state.player.toolsWear[toolId] || 0;
}

function _consumeToolWear(toolId) {
    if (!state.player?.toolsWear) return;
    state.player.toolsWear[toolId] = Math.max(0, (state.player.toolsWear[toolId] || 0) - 1);
    if (typeof saveState === 'function') saveState();
}

// --------------------------------------------------------
// 1. ТОЛЩИНОМЕР ЛКП (существующая)
// --------------------------------------------------------
function openGaugeModal(carId) {
    activeInspectCarId = carId;
    const car = _getInspectCar();
    if (!car) return;

    let hasGauge = _hasTool('gauge') || _hasTool('gauge_pro');
    if (!hasGauge) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('warning');
        return showToast("⚠️ У вас нет толщиномера! Купите в Авто-Маркете.");
    }

    let toolKey = _hasTool('gauge_pro') ? 'gauge_pro' : 'gauge';
    let wear = _getToolWear(toolKey);
    if (wear <= 0) {
        if (typeof playSound === 'function') playSound('error');
        return showToast("⚠️ Батарея толщиномера села! Откалибруйте в Авто-Маркете.");
    }

    _consumeToolWear(toolKey);
    car.gaugeChecked = true;
    if (car.inspectionStatus) car.inspectionStatus.gauge = true;

    ['hood', 'roof', 'doors', 'wings'].forEach(part => {
        const el = document.getElementById("part-" + part);
        if (el) el.innerHTML = "Замерить";
    });

    if (typeof trackQuestProgress === 'function') trackQuestProgress('gauge_check', 1);
    if (typeof saveState === 'function') saveState();
    ModalManager.open("modalGauge");
}

function checkBodyPart(part) {
    const car = _getInspectCar();
    if (!car || !car.bodyThickness) return;

    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');

    let val = car.bodyThickness[part] || 110;
    const el = document.getElementById("part-" + part);
    if (el) {
        if (val > 200) el.innerHTML = `<span class='color-red'>${val} мкм (Шпакля)</span>`;
        else el.innerHTML = `<span class='color-green'>${val} мкм (Завод)</span>`;
    }
}

function closeGaugeModal() {
    ModalManager.close("modalGauge");
    activeInspectCarId = null;
    if (typeof playSound === 'function') playSound('tick');
    if (typeof renderMarketHaggleControls === 'function') renderMarketHaggleControls();
}

// --------------------------------------------------------
// 2. LAUNCH OBD2 (существующая, с учётом новых дефектов)
// --------------------------------------------------------
function quickOBDScanMarketCar(carId) {
    if (isOBDScanningInProgress) return;
    const car = state.marketFeed?.find(c => c && c.id === carId);
    if (!car) return;

    let hasScanner = _hasTool('obd') || _hasTool('obd_launch');
    if (!hasScanner) {
        if (typeof playSound === 'function') playSound('error');
        return showToast("⚠️ У вас нет сканера OBD2! Купите ELM327 или Launch.");
    }

    let toolKey = _hasTool('obd_launch') ? 'obd_launch' : 'obd';
    let wear = _getToolWear(toolKey);
    if (wear <= 0) {
        if (typeof playSound === 'function') playSound('error');
        return showToast("⚠️ Сканер разряжен! Откалибруйте его в Авто-Маркете.");
    }

    _consumeToolWear(toolKey);
    car.stoChecked = true;
    if (car.inspectionStatus) car.inspectionStatus.obd = true;
    isOBDScanningInProgress = true;
    if (typeof saveState === 'function') saveState();

    const resBox = document.getElementById('obd2ResultBox');
    const actBox = document.getElementById('obd2ActionBox');
    if (typeof setTxt === 'function') setTxt('obd2CarTitle', `Launch — ${car.name}`);

    ModalManager.open("modalOBD2");
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('medium');

    if (resBox) {
        resBox.innerHTML = `
            <div class="obd-cyber-display">
                <div class="flex-between text-xs mb-2">
                    <span class="color-cyan font-bold"><i class="fa-solid fa-satellite-dish"></i> ПОДКЛЮЧЕНИЕ К OBD2...</span>
                    <span class="sub-label">ISO 15765-4</span>
                </div>
                <div class="obd-progress-track">
                    <div class="obd-progress-bar" id="obdScanProgressFill"></div>
                </div>
                <div class="obd-scan-matrix-screen" id="obdTerminalLines">
                    <div class="obd-terminal-line">> Инициализация протокола...</div>
                </div>
            </div>
        `;
    }
    if (actBox) {
        actBox.innerHTML = `<button class="btn btn-dark w-full opacity-50" disabled><i class="fa-solid fa-spinner fa-spin"></i> СКАНИРОВАНИЕ...</button>`;
    }

    const terminalEl = document.getElementById('obdTerminalLines');
    const progFill = document.getElementById('obdScanProgressFill');

    // Определяем, есть ли ошибки в моторе/АКПП
    const mechDefects = car.mechanicalDefects || [];
    const engineDefects = mechDefects.filter(d => d.category === 'ENGINE' || d.category === 'TRANSMISSION');
    const hasEngineIssue = engineDefects.length > 0;

    const scanSteps = [
        { pct: 25, msg: "> Опрос ЭБУ ДВС (DME/ECU)... Связь 100%", type: "success" },
        { pct: 50, msg: "> Диагностика АКПП / соленоидов...", type: "" },
        { pct: 75, msg: "> Сканирование ABS/ESP/SRS...", type: "" },
        { pct: 100, msg: "> Чтение ошибок в памяти DTC...", type: hasEngineIssue ? "error" : "success" }
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
    }, 450);
}

/**
 * Новая версия рендера OBD — показывает ВСЕ найденные дефекты мотора/АКПП
 */
function _renderNewOBDResults(car, resBox, actBox, engineDefects) {
    const engWear = car.wear?.engine ? Math.round(car.wear.engine) : 90;
    const transWear = car.wear?.transmission ? Math.round(car.wear.transmission) : 90;

    // Показываем все дефекты мотора/АКПП (независимо от isHidden — OBD их видит)
    if (engineDefects.length > 0) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');

        const defectsHtml = engineDefects.map(d => `
            <div class="obd-terminal-line error" style="margin-bottom:4px;">
                <b>❌ ${d.name}</b>
                <div style="font-size:9.5px; color:#fca5a5; margin-top:2px;">${d.desc}</div>
                <div style="font-size:8.5px; color:#ffb300; margin-top:2px;">
                    Серьёзность: <b>${d.severity}</b> | Ремонт: <b>~${(d.cost || 0).toLocaleString()} ₽</b>
                </div>
            </div>
        `).join('');

        resBox.innerHTML = `
            <div class="obd-cyber-display" style="border-color: var(--red);">
                <div class="flex-between text-xs mb-2">
                    <span class="color-red font-bold"><i class="fa-solid fa-triangle-exclamation"></i> НАЙДЕНО ДЕФЕКТОВ: ${engineDefects.length}</span>
                    <span class="tag-badge bg-tag-red">ОШИБКИ</span>
                </div>
                <div class="obd-scan-matrix-screen mb-2" style="border-color: rgba(255, 51, 102, 0.4);">
                    ${defectsHtml}
                </div>
                <div class="flex-between text-xs p-2" style="background: rgba(0,0,0,0.6); border-radius: 8px;">
                    <span>Ресурс ДВС: <b class="${engWear < 50 ? 'color-red' : 'color-amber'}">${engWear}%</b></span>
                    <span>Ресурс КПП: <b class="${transWear < 50 ? 'color-red' : 'color-amber'}">${transWear}%</b></span>
                </div>
            </div>
        `;
        actBox.innerHTML = `
            <button onclick="closeOBD2Modal(); if(typeof renderMarketHaggleControls==='function') renderMarketHaggleControls();" class="btn btn-cyan w-full mt-2">
                Понятно — использовать при торге!
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
                    <span>Ресурс ДВС: <b class="color-green">${engWear}%</b></span>
                    <span>Ресурс КПП: <b class="color-green">${transWear}%</b></span>
                </div>
            </div>
        `;
        actBox.innerHTML = `
            <button onclick="closeOBD2Modal(); if(typeof renderMarketHaggleControls==='function') renderMarketHaggleControls();" class="btn btn-green w-full mt-2">
                Завершить диагностику ✓
            </button>
        `;
    }
}

function closeOBD2Modal() {
    ModalManager.close("modalOBD2");
}

// --------------------------------------------------------
// 3. ⭐ НОВОЕ: ВЫБОР УРОВНЯ ПРОВЕРКИ
// --------------------------------------------------------
function openInspectionChoiceModal(carId) {
    activeInspectCarId = carId;
    const car = _getInspectCar();
    if (!car) return;

    const tiers = (typeof INSPECTION_TIERS !== 'undefined' && Array.isArray(INSPECTION_TIERS))
        ? INSPECTION_TIERS
        : [
            { id: 'quick',    name: 'Экспресс',    cost: 0,     desc: 'Визуально у капота', icon: '👁' },
            { id: 'standard', name: 'Стандарт',    cost: 5000,  desc: '+ Толщиномер + OBD2', icon: '🔍' },
            { id: 'expert',   name: 'Экспертиза',  cost: 25000, desc: '+ Эндоскоп + компрессометр', icon: '🔬' },
            { id: 'full',     name: 'Полная',      cost: 60000, desc: 'Всё + Автотека + подъёмник', icon: '🏛' },
            { id: 'vin_report', name: 'VIN-отчёт', cost: 15000, desc: 'Только Автотека Pro', icon: '📜' }
        ];

    // Уже проверено?
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

        return `
            <div onclick="${disabled ? '' : `PhoneMarketInspection.runInspection('${t.id}')`}"
                 class="p-2 mb-2" style="background:${isDone ? 'rgba(0,230,118,0.08)' : '#050914'};
                 border:1px solid ${isDone ? 'rgba(0,230,118,0.4)' : (disabled ? 'rgba(255,255,255,0.05)' : 'rgba(0,242,254,0.3)')};
                 border-radius:10px; cursor:${disabled ? 'not-allowed' : 'pointer'}; opacity:${disabled && !isDone ? 0.55 : 1};">
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

            <div class="sub-label mb-2" style="font-size:9.5px;">Выберите уровень проверки (каждый запускается 1 раз):</div>

            ${tiersHtml}

            <button onclick="ModalManager.close('modalInspectionChoice')" class="btn btn-dark w-full mt-1">Закрыть</button>
        </div>
    `;

    ModalManager.open('modalInspectionChoice', { closeOthers: true });
    if (typeof playSound === 'function') playSound('tick');
}

// --------------------------------------------------------
// 4. ⭐ ЗАПУСК ПРОВЕРКИ
// --------------------------------------------------------
function runInspection(tierId) {
    const car = _getInspectCar();
    if (!car || isInspectionInProgress) return;

    const tier = (typeof INSPECTION_TIERS !== 'undefined' ? INSPECTION_TIERS : []).find(t => t.id === tierId);
    if (!tier) return;

    // Проверка инструментов для tier'ов, требующих их
    const detects = tier.detects || [];
    if (detects.includes('gauge') && !(_hasTool('gauge') || _hasTool('gauge_pro'))) {
        return showToast("⚠️ Нужен толщиномер ЛКП!");
    }
    if (detects.includes('obd') && !(_hasTool('obd') || _hasTool('obd_launch'))) {
        return showToast("⚠️ Нужен сканер OBD2!");
    }
    if (detects.includes('endoscope') && !_hasTool('endoscope')) {
        return showToast("⚠️ Нужен видеоэндоскоп!");
    }
    if (detects.includes('compression') && !_hasTool('compressor')) {
        return showToast("⚠️ Нужен компрессометр!");
    }

    // Стоимость
    if (tier.cost > 0) {
        if ((state.player?.cash || 0) < tier.cost) {
            return showToast(`Нужно ${tier.cost.toLocaleString()} ₽!`);
        }
        state.player.cash -= tier.cost;
        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Проверка авто: ${tier.name}`, tier.cost, false);
        }
    }

    // Списываем износ инструментов
    if (detects.includes('gauge')) _consumeToolWear(_hasTool('gauge_pro') ? 'gauge_pro' : 'gauge');
    if (detects.includes('obd')) _consumeToolWear(_hasTool('obd_launch') ? 'obd_launch' : 'obd');
    if (detects.includes('endoscope')) _consumeToolWear('endoscope');
    if (detects.includes('compression')) _consumeToolWear('compressor');

    // Обновляем статус
    if (!car.inspectionStatus) car.inspectionStatus = {};
    car.inspectionStatus[tierId] = true;

    if (typeof saveState === 'function') saveState();
    if (typeof updateHeaderUI === 'function') updateHeaderUI();
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('medium');

    isInspectionInProgress = true;

    // Анимация сканирования
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
                    <div class="obd-progress-track">
                        <div class="obd-progress-bar" id="inspectionProgressBar" style="width:0%;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // Прогресс
    let pct = 0;
    const progressInterval = setInterval(() => {
        pct += 20;
        const bar = document.getElementById('inspectionProgressBar');
        if (bar) bar.style.width = Math.min(100, pct) + '%';
        if (typeof playSound === 'function') playSound('tick');
        if (pct >= 100) {
            clearInterval(progressInterval);
            setTimeout(() => {
                isInspectionInProgress = false;
                _showInspectionResults(car, tier);
            }, 300);
        }
    }, 250);
}

// --------------------------------------------------------
// 5. ⭐ ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ
// --------------------------------------------------------
function _showInspectionResults(car, tier) {
    const detects = tier.detects || [];
    const foundDefects = [];
    let hiddenDefectsFound = 0;

    // Собираем механические дефекты
    const mechDefects = car.mechanicalDefects || [];
    mechDefects.forEach(d => {
        if (detects.includes(d.detectMethod)) {
            foundDefects.push({ kind: 'mech', defect: d });
            if (d.isHidden) hiddenDefectsFound++;
        }
    });

    // Юридические (только Автотека)
    let legalFound = null;
    if (car.legalDefect && detects.includes(car.legalDefect.detectMethod)) {
        legalFound = car.legalDefect;
    }

    // ОБНОВЛЯЕМ флаги видимости дефектов (для дальнейшего отображения в карточке)
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

    // Формируем HTML результата
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
        // Механические
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

        // Юридическая проблема
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
                    ${legalFound.canResolveViaReshala ? `
                        <div class="sub-label mt-1 color-purple" style="font-size:8px;">
                            💡 Можно решить через Решалу (${legalFound.reshalaCostConn} 🤝)
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }

    // Формируем модалку
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

                <button onclick="closeInspectionResults()" class="btn btn-cyan w-full">Понятно</button>
            </div>
        `;
    }

    if (typeof playSound === 'function') playSound(foundDefects.length > 0 || legalFound ? 'error' : 'win');
    if (typeof tgHaptic === 'function') tgHaptic(foundDefects.length > 0 || legalFound ? 'warning' : 'success');
}

function closeInspectionResults() {
    ModalManager.close('modalInspectionChoice');
    activeInspectCarId = null;
    if (typeof renderMarketHaggleControls === 'function') renderMarketHaggleControls();
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
}

// --------------------------------------------------------
// 6. АВТОТЕКА (обновлённая — показывает LEGAL_DEFECTS)
// --------------------------------------------------------
function openAutotekaModal(carId) {
    if (!state.marketFeed) return;
    const car = state.marketFeed.find(c => c && c.id === carId);
    if (!car) return;
    car.viewed = true;

    if (!car.autotekaChecked) {
        const isVip = !!(state.player && state.player.vipPro);
        const cost = isVip ? 0 : 5000;
        const cash = (state.player && state.player.cash) ? state.player.cash : 0;

        if (cash < cost && !isVip) return showToast("Автотека стоит 5,000 ₽!");
        state.player.cash -= cost;
        car.autotekaChecked = true;
        if (!car.inspectionStatus) car.inspectionStatus = {};
        car.inspectionStatus.autoteka = true;
        showToast("🔍 Базы ГИБДД проверены!");
        if (typeof saveState === 'function') saveState();
    }

    // Открываем результаты
    const rep = document.getElementById("autotekaReportContent");
    if (rep) {
        let cName = car.name || "Автомобиль";
        let cPlate = car.plate || "ТРАНЗИТ";

        // Юридическая проблема?
        const legal = car.legalDefect;
        let legalStatus = legal
            ? `<span class='tag-badge bg-tag-red'>⚠️ ${legal.name}</span>`
            : (car.isStolen
                ? `<span class='tag-badge bg-tag-red'>🚨 В РОЗЫСКЕ</span>`
                : `<span class='tag-badge bg-tag-green'>✓ ЮРИДИЧЕСКИ ЧИСТ</span>`);

        let mVal = car.mileage ? car.mileage : 85000;
        let mileagePercent = Math.min(100, Math.round((mVal / 250000) * 100));
        let odoWarning = car.rolledOdometer || (legal && legal.id === 'legal_odometer_rollback')
            ? "<span class='color-red text-xs font-bold'>⚠ Зафиксирована скрутка пробега!</span>"
            : "<span class='color-green text-xs font-bold'>✓ Пробег подтвержден</span>";

        let engWear = car.wear?.engine ? Math.round(car.wear.engine) : 85;
        let transWear = car.wear?.transmission ? Math.round(car.wear.transmission) : 85;
        let avgTech = Math.round((engWear + transWear) / 2);

        let pts = car.ptsData || {
            ownerName: "Иванов И.И.", ownerAvatar: "🧔",
            ownersCount: 2, ownershipYears: 3,
            vin: "XTA21070001234567",
            ptsType: "Электронный (ЭПТС) ✓",
            pledgeBank: "Залогов нет ✓",
            fsspRestrictions: "Ограничений нет ✓",
            taxiCheck: "В такси не использовалась ✓"
        };

        // Переопределяем PTS данными юр. проблемы
        if (legal) {
            if (legal.id === 'legal_pledge' || legal.id === 'legal_pledge_partial') pts.pledgeBank = "🔴 В ЗАЛОГЕ У БАНКА";
            if (legal.id === 'legal_fssp') pts.fsspRestrictions = "🔴 ЗАПРЕТ ФССП";
            if (legal.id === 'legal_arrest') pts.fsspRestrictions = "🔴 АРЕСТ ПРИСТАВОВ";
            if (legal.id === 'legal_taxi_former') pts.taxiCheck = "⚠️ Работала в такси";
            if (legal.id === 'legal_pts_duplicate') pts.ptsType = "⚠️ Дубликат ПТС";
        }

        // Считаем score
        let overallScore = 10;
        if (car.hiddenDefect || (car.mechanicalDefects || []).some(d => d.severity === 'Критическая')) overallScore -= 2;
        if (car.rolledOdometer || (legal && legal.id === 'legal_odometer_rollback')) overallScore -= 2;
        if (car.isStolen) overallScore -= 4;
        if (car.isBeaterProject) overallScore -= 2;
        if (legal) overallScore -= 2;
        if (legal && legal.severity === 'Критическая') overallScore -= 2;
        overallScore = Math.max(1, overallScore);

        let scoreColor = overallScore >= 8 ? "color-green" : (overallScore >= 5 ? "color-amber" : "color-red");

        // Юридические подробности
        let legalDetailsHtml = '';
        if (legal) {
            legalDetailsHtml = `
                <div class='p-2 mb-2' style='background:rgba(220,38,38,0.15); border-radius:10px; border:1.5px solid var(--red);'>
                    <div class='flex-between mb-1'>
                        <b class='text-xs color-red'>⚖️ ЮРИДИЧЕСКАЯ ПРОБЛЕМА</b>
                        <span class='tag-badge bg-tag-red'>${legal.severity}</span>
                    </div>
                    <div class='text-xs color-amber font-bold mb-1'>${legal.name}</div>
                    <div class='sub-label mb-1' style='font-size:9.5px;'>${legal.desc}</div>
                    <div class='sub-label color-red font-bold' style='font-size:9px;'>Последствие: ${legal.consequence}</div>
                    ${legal.canResolveViaReshala ? `
                        <div class='sub-label mt-1 color-purple' style='font-size:8.5px;'>
                            💡 Решается через Решалу (${legal.reshalaCostConn} 🤝)
                        </div>
                    ` : ''}
                </div>
            `;
        }

        rep.innerHTML = `
            <div class='flex-between mb-2'>
                <div>
                    <b class='color-cyan' style='font-size:13.5px;'>${cName}</b>
                    <div class='sub-label mt-1'>Госномер: <span class='license-plate text-xs' style='padding:2px 6px;'>${cPlate}</span></div>
                </div>
                ${legalStatus}
            </div>

            ${legalDetailsHtml}

            <div class='autoteka-pts-card mb-2'>
                <div class='autoteka-owner-row'>
                    <div class='autoteka-owner-avatar'>${pts.ownerAvatar}</div>
                    <div style='flex:1;'>
                        <div class='flex-between'>
                            <b class='text-xs color-amber'>Владелец: ${pts.ownerName}</b>
                            <span class='tag-badge bg-tag-cyan'>Физлицо</span>
                        </div>
                        <div class='sub-label mt-1' style='font-size:10px;'>Срок владения: <b>${pts.ownershipYears} г.</b> | Записей в ПТС: <b>${pts.ownersCount}</b></div>
                        <div class='sub-label' style='font-size:9.5px;'>VIN: <b class='color-cyan'>${pts.vin}</b></div>
                    </div>
                </div>

                <div class='grid-2 text-xs' style='gap:4px;'>
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
                        <div class='font-bold mt-1 ${pts.taxiCheck.includes("не") ? "color-green" : "color-red"}'>${pts.taxiCheck}</div>
                    </div>
                </div>
            </div>

            <div class='p-2 mb-2' style='background:#0d1424; border-radius:10px; border:1px solid rgba(255,255,255,0.06);'>
                <div class='flex-between text-xs mb-1'>
                    <span>История одометра:</span>
                    <b class='color-amber'>${mVal.toLocaleString()} км</b>
                </div>
                <div class='biz-progress-track'><div class='biz-progress-fill fill-biz-stock' style='width:${mileagePercent}%;'></div></div>
                <div class='text-right mt-1'>${odoWarning}</div>
            </div>

            <div class='p-2 mb-2' style='background:#0d1424; border-radius:10px; border:1px solid rgba(255,255,255,0.06);'>
                <div class='flex-between text-xs mb-1'>
                    <span>Ресурс агрегатов:</span>
                    <b class='color-green'>${avgTech}%</b>
                </div>
                <div class='biz-progress-track'><div class='biz-progress-fill fill-biz-lvl' style='width:${avgTech}%;'></div></div>
                <div class='sub-label text-xs'>ДВС: ${engWear}% | КПП: ${transWear}%</div>
            </div>

            <div class='flex-between p-2' style='background:rgba(0,242,254,0.05); border:1px solid var(--border-glow); border-radius:10px;'>
                <div>
                    <b class='text-xs color-cyan'>Итоговый рейтинг:</b>
                </div>
                <div class='price-val ${scoreColor}' style='font-size:20px;'>${overallScore}/10</div>
            </div>
        `;
    }

    ModalManager.open("modalAutoteka");
    if (typeof playSound === 'function') playSound('tick');
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
}

// --------------------------------------------------------
// 7. ЭКСПОРТ
// --------------------------------------------------------
window.PhoneMarketInspection = {
    openInspectionChoiceModal,
    runInspection,
    openGaugeModal,
    checkBodyPart,
    closeGaugeModal,
    quickOBDScanMarketCar,
    closeOBD2Modal,
    openAutotekaModal
};

Object.assign(window, {
    openGaugeModal,
    checkBodyPart,
    closeGaugeModal,
    quickOBDScanMarketCar,
    closeOBD2Modal,
    openAutotekaModal,
    openInspectionChoiceModal,
    runInspection,
    closeInspectionResults,
    _showInspectionResults
});

console.log('[🔬 market-inspection v2.0.0] 5 уровней проверки + дефекты + Автотека ✓');
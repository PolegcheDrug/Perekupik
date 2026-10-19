// ========================================================
// js/street.js — СТРИТ-РЕЙСИНГ, 402М И АВТОМЕРОПРИЯТИЯ (v0.8.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v0.8.0 (БАЛАНС РЕСУРСА МОТОРА, ШИН И ИЗНОСА):
//   - СБАЛАНСИРОВАН ИЗНОС ШИН: Городские шины расходуют 4-6% за заезд,
//     драг-слики — 7-9% (с учетом зацепа). Букс на отсечке добавляет износ резины.
//   - СБАЛАНСИРОВАН РЕСУРС МОТОРА: Плавный нагрев (+6..10°C), учет перегрева
//     (>98°C дает повышенный износ поршневой), расчет урона трансмиссии при ланче.
//   - ДИФФЕРЕНЦИАЦИЯ МЕРОПРИЯТИЙ: Стенс-выставка больше не сжигает 15% резины
//     вхолостую; на дрифте горит резина, на 402м греется мотор.
//   - ИНТЕГРАЦИЯ: Прямая связка с модулем «Теневой Контур» (облавы 12.5.1 и крыша).
// ========================================================

let currentRaceBet = 25000;
let isGasPedalHeld = false;
let currentRpm = 800;
let gasRpmInterval = null;
let raceAnimationTimer = null;

window.currentRaceBet = currentRaceBet;
window.streetRaceBet = currentRaceBet;
window.currentRpm = currentRpm;
window.tachoRpm = currentRpm;

function getActiveStreetCarIndex() {
    if (!state.garage || state.garage.length === 0) return -1;
    
    // 1. Приоритет личного авто
    let personalIdx = state.garage.findIndex(c => c && c.isPersonal && !c.impounded);
    if (personalIdx !== -1) {
        state.player.selectedStreetCarIndex = personalIdx;
        return personalIdx;
    }

    // 2. Текущий выбранный индекс
    let selIdx = state.player.selectedStreetCarIndex || 0;
    if (selIdx >= state.garage.length || !state.garage[selIdx] || state.garage[selIdx].impounded) {
        let firstAvailable = state.garage.findIndex(c => c && !c.impounded);
        selIdx = firstAvailable !== -1 ? firstAvailable : 0;
        state.player.selectedStreetCarIndex = selIdx;
    }
    return selIdx;
}

function renderStreetScreen() {
    const picker = document.getElementById('streetCarPickerBox');
    const hpBadge = document.getElementById('streetSelectedCarHp');
    if (!picker) return;

    if (!state.garage || state.garage.length === 0) {
        picker.innerHTML = "<div class='text-xs color-red text-center py-2'>В гараже нет машин! Купите авто для участия в заездах.</div>";
        if (hpBadge) hpBadge.innerText = "0 л.с.";
        return;
    }

    let selIdx = getActiveStreetCarIndex();
    if (selIdx === -1) {
        picker.innerHTML = "<div class='text-xs color-red text-center py-2'>Все авто арестованы на штрафстоянке!</div>";
        if (hpBadge) hpBadge.innerText = "0 л.с.";
        return;
    }

    let car = state.garage[selIdx];
    let carHp = car.power || 100;
    let temp = car.engineTemp || 90;
    let tires = car.tireWear !== undefined ? car.tireWear : 100;

    if (hpBadge) {
        hpBadge.innerHTML = `${carHp} л.с. | <span class="${temp > 102 ? 'color-red' : 'color-green'}">${temp}°C</span> | <span class="${tires < 30 ? 'color-red' : 'color-cyan'}">${tires}% шины</span>`;
    }

    let opts = "";
    state.garage.forEach((c, idx) => {
        if (!c) return;
        let isSel = idx === selIdx ? "selected" : "";
        let tVal = c.engineTemp || 90;
        let impText = c.impounded ? " [Штрафстоянка]" : "";
        let personalText = c.isPersonal ? " 👑" : "";
        let stolenText = c.hasStolenParts ? " ⚠️" : "";
        opts += `<option value="${idx}" ${isSel} ${c.impounded ? 'disabled' : ''}>${c.name}${personalText}${stolenText} (${c.power || 100} л.с., ${tVal}°C)${impText}</option>`;
    });

    picker.innerHTML = `
        <div class="flex-between">
            <span class="text-xs sub-label">Боевой болид:</span>
            <select onchange="selectStreetCar(this.value)" style="background:#111a2a; color:#fff; border:1px solid var(--border-glass); border-radius:6px; padding:6px 10px; font-size:11px; outline:none; max-width:65%;">
                ${opts}
            </select>
        </div>
    `;
}

function selectStreetCar(idx) {
    let parsedIdx = parseInt(idx, 10);
    if (!state.garage[parsedIdx] || state.garage[parsedIdx].impounded) {
        return showToast("Этот автомобиль арестован на спецстоянке!");
    }
    state.player.selectedStreetCarIndex = parsedIdx;
    saveState();
    renderStreetScreen();
    if (typeof playSound === 'function') playSound('tick');
}

function setRaceBet(amount) {
    currentRaceBet = amount;
    window.currentRaceBet = amount;
    window.streetRaceBet = amount;
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');
    showToast("Ставка на 402м: " + amount.toLocaleString() + " ₽");
}

function holdGasPedal() {
    if (typeof initAudio === 'function') initAudio();
    isGasPedalHeld = true;
    if (gasRpmInterval) clearInterval(gasRpmInterval);

    gasRpmInterval = setInterval(() => {
        if (isGasPedalHeld) {
            currentRpm = Math.min(8000, currentRpm + 350);
        } else {
            currentRpm = Math.max(800, currentRpm - 250);
        }
        window.currentRpm = currentRpm;
        window.tachoRpm = currentRpm;
        updateTachometerUI();
    }, 50);
}

function releaseGasPedal() {
    isGasPedalHeld = false;
    if (gasRpmInterval) clearInterval(gasRpmInterval);

    gasRpmInterval = setInterval(() => {
        currentRpm = Math.max(800, currentRpm - 300);
        window.currentRpm = currentRpm;
        window.tachoRpm = currentRpm;
        updateTachometerUI();
        if (currentRpm <= 800) {
            clearInterval(gasRpmInterval);
        }
    }, 50);
}

function updateTachometerUI() {
    const needle = document.getElementById('tachoNeedle');
    if (!needle) return;
    let pct = Math.max(0, Math.min(100, ((currentRpm - 800) / (8000 - 800)) * 100));
    needle.style.left = pct + "%";
}

// ========================================================
// ДРАГ-РЕЙСИНГ НА 402 МЕТРА (СБАЛАНСИРОВАННЫЙ ИЗНОС)
// ========================================================
function launchDragRace() {
    if (!state.player.hasRacingLicense) {
        return showToast("Нужна Гоночная Лицензия РАФ! Оформите у Решалы в Даркнете.");
    }

    let cash = state.player.cash || 0;
    if (cash < currentRaceBet) {
        return showToast("Не хватает денег на ставку " + currentRaceBet.toLocaleString() + " ₽!");
    }

    if (!state.garage || state.garage.length === 0) {
        return showToast("В гараже нет машин для гонки!");
    }

    let carIdx = getActiveStreetCarIndex();
    if (carIdx === -1) {
        return showToast("Все автомобили арестованы! Заберите транспорт со штрафстоянки.");
    }

    let car = state.garage[carIdx];
    if (!car || car.impounded) {
        return showToast("Автомобиль на штрафстоянке ГИБДД!");
    }

    // 1. Проверка перегрева двигателя
    let temp = car.engineTemp || 90;
    if (temp > 105) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');
        return showToast("⚠️ Перегрев мотора (" + temp + "°C)! Остудите болид перед стартом.");
    }

    // 2. Проверка состояния шин
    let tires = car.tireWear !== undefined ? car.tireWear : 100;
    if (tires < 15) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');
        return showToast("🚫 Корд наружу! Резина стёрта до предела, замените комплект на СТО.");
    }

    // Списание ставки
    state.player.cash -= currentRaceBet;

    // Внимание ДПС: если активна «Крыша», внимание не растёт
    const hasRoof = (state.player.policeImmunityDays || 0) > 0;
    if (hasRoof) {
        state.player.consecutiveRaces = 0;
    } else {
        state.player.consecutiveRaces = (state.player.consecutiveRaces || 0) + 1;
    }

    // Определение качества старта по тахометру
    let idealStart = currentRpm >= 5500 && currentRpm <= 6800;
    let cutOff = currentRpm > 7500;
    let bogged = currentRpm < 4200;

    // --- СБАЛАНСИРОВАННЫЙ РАСЧЕТ ИЗНОСА И ТЕМПЕРАТУРЫ ---
    // Плавный нагрев мотора: +6..10°C за квотер
    const heatDelta = Math.floor(6 + Math.random() * 5);
    car.engineTemp = (car.engineTemp || 90) + heatDelta;

    // Расход шин: базовый 4-6%, драг-слики 7-9% (мягкий компаунд), букс на отсечке +3%
    let baseTireWear = car.tuning?.dragSlicks ? (7 + Math.floor(Math.random() * 3)) : (4 + Math.floor(Math.random() * 3));
    if (cutOff) baseTireWear += 3;
    car.tireWear = Math.max(0, tires - baseTireWear);

    // Износ агрегатов
    if (!car.wear) {
        car.wear = { engine: 85, transmission: 85, body: 90 };
    }

    // Мотор страдает сильнее при перегреве (>98°C) и при отсечке
    let engineWearDelta = 0.5 + Math.random() * 0.4;
    if (temp > 98) engineWearDelta *= 1.5;
    if (cutOff) engineWearDelta += 0.8;
    car.wear.engine = Math.max(10, Number(((car.wear.engine || 85) - engineWearDelta).toFixed(1)));

    // Трансмиссия страдает при резком ланче и особенно при провале оборотов (удар по сцеплению)
    let transWearDelta = 0.4 + Math.random() * 0.4;
    if (bogged) transWearDelta += 0.9;
    car.wear.transmission = Math.max(10, Number(((car.wear.transmission || 85) - transWearDelta).toFixed(1)));

    let playerCarEl = document.getElementById('playerRaceCarRunner');
    let rivalCarEl = document.getElementById('rivalRaceCarRunner');
    let statusText = document.getElementById('raceStatusText');

    let playerPower = car.power || 100;
    
    let drive = car.drivetrain || 'rwd';
    if (drive === 'awd') playerPower *= 1.15;
    else if (drive === 'fwd') playerPower *= 0.92;

    if (car.tuning?.dragSlicks) playerPower += 35;
    if (car.tuning?.chip > 0) playerPower *= (1 + car.tuning.chip * 0.08);

    // Влияние износа резины на динамику
    if (car.tireWear < 35) {
        playerPower *= 0.88; // Потеря зацепа на лысой резине
    }
    
    if (idealStart) playerPower += 45;
    else if (cutOff) playerPower -= 35;
    else if (bogged) playerPower -= 25;

    let rivalPower = Math.floor(playerPower * (0.84 + Math.random() * 0.32));

    if (statusText) {
        if (idealStart) statusText.innerText = "🔥 ИДЕАЛЬНЫЙ ЛАНЧ-СТАРТ! 100% ЗАЦЕП!";
        else if (cutOff) statusText.innerText = "❌ ОТСЕЧКА И БУКС! ПЕРЕГРЕВ РЕЗИНЫ!";
        else if (bogged) statusText.innerText = "⚠️ ПРОВАЛ ОБОРОТОВ! УДАР ПО СЦЕПЛЕНИЮ!";
        else statusText.innerText = "🚦 Заезд 402 метра начался...";
    }

    let pPos = 0;
    let rPos = 0;
    let pSpeed = playerPower / 48;
    let rSpeed = rivalPower / 48;

    if (raceAnimationTimer) clearInterval(raceAnimationTimer);
    if (typeof playEngineSound === 'function') playEngineSound();

    raceAnimationTimer = setInterval(() => {
        pPos += pSpeed;
        rPos += rSpeed;

        if (playerCarEl) playerCarEl.style.left = Math.min(88, pPos) + "%";
        if (rivalCarEl) rivalCarEl.style.left = Math.min(88, rPos) + "%";

        if (pPos >= 88 || rPos >= 88) {
            clearInterval(raceAnimationTimer);
            let isWin = pPos >= rPos;

            let myTime = (15.5 - Math.log(playerPower / 65) * 2.8).toFixed(2);
            let rivalTime = (15.5 - Math.log(rivalPower / 65) * 2.8).toFixed(2);

            setTimeout(() => {
                if (playerCarEl) playerCarEl.style.left = "0%";
                if (rivalCarEl) rivalCarEl.style.left = "0%";

                if (isWin) {
                    let winSum = currentRaceBet * 2;
                    state.player.cash += winSum;
                    if (typeof addXp === 'function') addXp(35);
                    state.player.mood = Math.min(100, (state.player.mood || 80) + 15);
                    state.player.streetCred = (state.player.streetCred || 100) + 20;

                    if (typeof trackQuestProgress === 'function') {
                        trackQuestProgress('win_drag', 1);
                    }

                    if (typeof logBankTransaction === 'function') {
                        logBankTransaction("Победа в заезде 402м", winSum, true);
                    }

                    saveState();
                    updateHeaderUI();
                    renderStreetScreen();
                    openVerdictModal("ПОБЕДА НА 402М! 🏁", `Вы обошли соперника на квотере!\nВаше время: ${myTime}с | Соперник: ${rivalTime}с\nВыигрыш: +${winSum.toLocaleString()} ₽ (+20 Респекта)\nШины: -${baseTireWear}% (остаток: ${car.tireWear}%)`, true, winSum);
                } else {
                    state.player.mood = Math.max(0, (state.player.mood || 80) - 20);
                    state.player.streetCred = Math.max(10, (state.player.streetCred || 100) - 10);
                    
                    if (typeof logBankTransaction === 'function') {
                        logBankTransaction("Проигрыш ставки на 402м", currentRaceBet, false);
                    }

                    saveState();
                    updateHeaderUI();
                    renderStreetScreen();
                    openVerdictModal("ПОРАЖЕНИЕ НА 402М 💨", `Соперник оказался быстрее на финише!\nВаше время: ${myTime}с | Соперник: ${rivalTime}с\nСтавка -${currentRaceBet.toLocaleString()} ₽ потеряна.\nШины: -${baseTireWear}% (остаток: ${car.tireWear}%)`, false);
                }

                // Проверка внимания ДПС и угрозы облавы
                checkPoliceRaid(carIdx);
            }, 600);
        }
    }, 60);
}

// ────────────────────────────────────────────────────────
// ЛОГИКА ОБЛАВЫ И ВНИМАНИЯ ДПС
// ────────────────────────────────────────────────────────
function checkPoliceRaid(carIdx) {
    let raids = state.player.consecutiveRaces || 0;
    let maxRaids = state.player.maxRacesBeforeRaid || 12;

    // Крыша активна — облавы нет
    if ((state.player.policeImmunityDays || 0) > 0) {
        if (raids > 0) state.player.consecutiveRaces = 0;
        return;
    }

    // 1. Предупреждение о критической угрозе
    if (raids === maxRaids - 2 || raids === maxRaids - 1) {
        if (typeof playSound === 'function') playSound('warn');
        if (typeof tgHaptic === 'function') tgHaptic('warning');
        showToast(`🚨 ВНИМАНИЕ ДПС: ${raids}/${maxRaids}! Спецрота на споте. Слейте ориентировку в Радаре!`);
        return;
    }

    // 2. Срабатывание облавы при 12/12
    if (raids >= maxRaids) {
        state.player.consecutiveRaces = 0;
        let car = state.garage[carIdx];
        if (car) {
            car.impounded = true;
        }

        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');
        
        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        renderStreetScreen();
        
        // Открытие модалки штрафстоянки или системный алерт
        if (typeof openImpoundLotModal === 'function') {
            openImpoundLotModal(carIdx);
        } else if (typeof openModal === 'function' && document.getElementById('modalImpoundLot')) {
            openModal('modalImpoundLot');
        } else {
            openVerdictModal("🚨 ОБЛАВА ДПС НА СПОТЕ!", `Спецбатальон перекрыл выезды с промзоны!\nАвтомобиль «${car ? car.name : 'Болид'}» конфискован и отправлен на штрафстоянку.\nВыкупите авто у Решалы или в Госуслугах!`, false);
        }
    }
}

// ========================================================
// УЛИЧНЫЕ МЕРОПРИЯТИЯ И ТЕХКОМИССИЯ
// ========================================================
const STREET_EVENTS_DATA = [
    {
        id: "ev_drift_meet",
        name: "Ночная дрифт-сходка у ТЦ",
        type: "drift",
        classBadge: "Дрифт",
        req: "Заварка редуктора + Выворот",
        reward: "60,000 ₽ + 25 Кармы",
        rewardCash: 60000,
        rewardKarma: 25,
        desc: "Парные проезды по мокрому асфальту под аплодисменты зрителей.",
        check: (car) => !!(car.tuning?.weldedDiff && car.tuning?.steeringAngle)
    },
    {
        id: "ev_stance_show",
        name: "Городской Стенс-Фестиваль",
        type: "show",
        classBadge: "Стенс / Шоу",
        req: "Пневма/Стенс + Диски + Обвес",
        reward: "120,000 ₽ + 2 🤝 Связи",
        rewardCash: 120000,
        rewardConn: 2,
        desc: "Выставка проектов. Оценивается фитмент, чистота полок и зазоры кузова.",
        check: (car) => !!(car.tuning?.stance && car.tuning?.customWheels && car.tuning?.bodykit)
    },
    {
        id: "ev_drag_cup",
        name: "Кубок Нелегала 402м",
        type: "drag",
        classBadge: "Драг",
        req: "Каркас + Слики + Stage 2+",
        reward: "250,000 ₽ + 50 ⭐ Stars",
        rewardCash: 250000,
        rewardStars: 50,
        desc: "Серьезная битва самых быстрых турбо-корчей города за крупный куш.",
        check: (car) => !!(car.tuning?.rollCage && car.tuning?.dragSlicks && (car.tuning?.chip || 0) >= 2)
    }
];

function renderStreetEvents() {
    const container = document.getElementById('streetEventsContainer');
    if (!container) return;

    if (!state.garage || state.garage.length === 0) {
        container.innerHTML = "<div class='text-xs sub-label text-center py-2'>Сначала добавьте автомобиль в гараж.</div>";
        return;
    }

    let carIdx = getActiveStreetCarIndex();
    if (carIdx === -1) {
        container.innerHTML = "<div class='text-xs color-red text-center py-2'>Автомобиль на штрафстоянке.</div>";
        return;
    }

    let car = state.garage[carIdx];
    let html = "";
    STREET_EVENTS_DATA.forEach(ev => {
        let isFit = ev.check(car);
        let btnHtml = isFit
            ? `<button onclick="participateStreetEvent('${ev.id}')" class="btn btn-green btn-sm w-full mt-2">Участвовать 🏆</button>`
            : `<button class="btn btn-dark btn-sm w-full mt-2 opacity-50" disabled>Не соответствует регламенту</button>`;

        let cardClass = ev.type === 'drift' ? 'card-drift' : (ev.type === 'show' ? 'card-show' : '');

        html += `
            <div class="street-event-card ${cardClass}">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan">${ev.name}</b>
                    <span class="tag-badge bg-tag-amber">${ev.classBadge}</span>
                </div>
                <div class="sub-label mb-1">${ev.desc}</div>
                <div class="text-xs color-red mb-1"><b>Регламент:</b> ${ev.req}</div>
                <div class="text-xs color-green mb-1"><b>Награда:</b> ${ev.reward}</div>
                ${btnHtml}
            </div>
        `;
    });

    container.innerHTML = html;
}

function participateStreetEvent(eventId) {
    const ev = STREET_EVENTS_DATA.find(e => e.id === eventId);
    if (!ev) return;

    let carIdx = getActiveStreetCarIndex();
    if (carIdx === -1) return showToast("Автомобиль арестован на спецстоянке!");

    let car = state.garage[carIdx];
    if (!car || !ev.check(car)) {
        return showToast("Автомобиль не прошел техкомиссию регламента!");
    }

    // Проверка риска контрабанды/краденых деталей Даркнета на техкоме
    if (car.hasStolenParts && Math.random() * 100 < (car.stolenPartsRisk || 20)) {
        car.impounded = true;
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');
        saveState();
        updateHeaderUI();
        renderStreetScreen();
        return openVerdictModal("❌ ПРОВАЛ ТЕХКОМИССИИ!", `Инспектор техкома выявил спиленные номера агрегатов на «${car.name}»!\nАвтомобиль задержан по 12.5.1 и отправлен на спецстоянку. Потребуется помощь Решалы!`, false);
    }

    // Дифференцированный износ в зависимости от типа мероприятия:
    if (ev.type === 'drift') {
        // На дрифте горит резина и греется мотор
        car.engineTemp = (car.engineTemp || 90) + 12;
        car.tireWear = Math.max(0, (car.tireWear !== undefined ? car.tireWear : 100) - 12);
        if (car.wear) {
            car.wear.engine = Math.max(10, (car.wear.engine || 85) - 0.8);
            car.wear.transmission = Math.max(10, (car.wear.transmission || 85) - 1.2);
        }
    } else if (ev.type === 'drag') {
        // На драг-кубке боевой старт
        car.engineTemp = (car.engineTemp || 90) + 9;
        car.tireWear = Math.max(0, (car.tireWear !== undefined ? car.tireWear : 100) - 8);
        if (car.wear) {
            car.wear.engine = Math.max(10, (car.wear.engine || 85) - 1.0);
            car.wear.transmission = Math.max(10, (car.wear.transmission || 85) - 1.0);
        }
    } else if (ev.type === 'show') {
        // На стенс-выставке машина стоит на стенде — износ 0%
        car.engineTemp = Math.max(85, (car.engineTemp || 90) - 5);
    }

    if (ev.rewardCash) state.player.cash = (state.player.cash || 0) + ev.rewardCash;
    if (ev.rewardKarma) state.player.karma = Math.min(100, (state.player.karma || 50) + ev.rewardKarma);
    if (ev.rewardConn) state.player.connections = (state.player.connections || 0) + ev.rewardConn;
    if (ev.rewardStars) state.player.stars = (state.player.stars || 0) + ev.rewardStars;

    if (typeof addXp === 'function') addXp(75);
    state.player.mood = 100;
    saveState();
    updateHeaderUI();
    renderStreetScreen();

    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    openVerdictModal("ПОБЕДА В МЕРОПРИЯТИИ! 🏆", `Вы взяли 1-е место в «${ev.name}»! Награда получена.`, true, ev.rewardCash);
}

// Экспорт функций в глобальный объект window
window.getActiveStreetCarIndex = getActiveStreetCarIndex;
window.renderStreetScreen = renderStreetScreen;
window.selectStreetCar = selectStreetCar;
window.setRaceBet = setRaceBet;
window.holdGasPedal = holdGasPedal;
window.releaseGasPedal = releaseGasPedal;
window.updateTachometerUI = updateTachometerUI;
window.launchDragRace = launchDragRace;
window.checkPoliceRaid = checkPoliceRaid;
window.renderStreetEvents = renderStreetEvents;
window.participateStreetEvent = participateStreetEvent;

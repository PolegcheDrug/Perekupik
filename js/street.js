// ========================================================
// js/street.js — СТРИТ-РЕЙСИНГ, 402М И АВТОМЕРОПРИЯТИЯ (v0.4.5)
// Разработчики: Илья Чепиль (DXF) & Perekup Dev Team
// Реалистичный ланч-контроль, антифарм, перегрев ДВС,
// износ шин/агрегатов и учет регламентов техкома РАФ
// ========================================================

let currentRaceBet = 25000;[span_0](start_span)[span_0](end_span)
let isGasPedalHeld = false;[span_1](start_span)[span_1](end_span)
let currentRpm = 800;[span_2](start_span)[span_2](end_span)
let gasRpmInterval = null;[span_3](start_span)[span_3](end_span)
let raceAnimationTimer = null;[span_4](start_span)[span_4](end_span)

// Глобальные алиасы для совместимости с виджетами телефона
window.currentRaceBet = currentRaceBet;
window.currentRpm = currentRpm;
window.tachoRpm = currentRpm;

function renderStreetScreen() {
    const picker = document.getElementById('streetCarPickerBox');[span_5](start_span)[span_5](end_span)
    const hpBadge = document.getElementById('streetSelectedCarHp');[span_6](start_span)[span_6](end_span)
    if (!picker) return;[span_7](start_span)[span_7](end_span)

    if (!state.garage || state.garage.length === 0) {[span_8](start_span)[span_8](end_span)
        picker.innerHTML = "<div class='text-xs color-red text-center py-2'>В гараже нет машин! Купите авто для участия в заездах.</div>";[span_9](start_span)[span_9](end_span)
        if (hpBadge) hpBadge.innerText = "0 л.с.";[span_10](start_span)[span_10](end_span)
        return;[span_11](start_span)[span_11](end_span)
    }

    let selIdx = state.player.selectedStreetCarIndex || 0;[span_12](start_span)[span_12](end_span)
    if (selIdx >= state.garage.length) selIdx = 0;[span_13](start_span)[span_13](end_span)
    state.player.selectedStreetCarIndex = selIdx;[span_14](start_span)[span_14](end_span)

    let car = state.garage[selIdx];[span_15](start_span)[span_15](end_span)
    let carHp = car.power || 100;[span_16](start_span)[span_16](end_span)
    let temp = car.engineTemp || 90;
    let tires = car.tireWear !== undefined ? car.tireWear : 100;

    if (hpBadge) {
        hpBadge.innerHTML = `${carHp} л.с. | <span class="${temp > 105 ? 'color-red' : 'color-green'}">${temp}°C</span> | <span class="${tires < 30 ? 'color-red' : 'color-cyan'}">${tires}% шины</span>`;
    }

    let opts = "";[span_17](start_span)[span_17](end_span)
    state.garage.forEach((c, idx) => {[span_18](start_span)[span_18](end_span)
        let isSel = idx === selIdx ? "selected" : "";[span_19](start_span)[span_19](end_span)
        let tVal = c.engineTemp || 90;
        opts += `<option value="${idx}" ${isSel}>${c.name} (${c.power || 100} л.с., ${tVal}°C)</option>`;
    });

    picker.innerHTML = `
        <div class="flex-between">
            <span class="text-xs sub-label">Боевой корч:</span>
            <select onchange="selectStreetCar(this.value)" style="background:#111a2a; color:#fff; border:1px solid var(--border-glass); border-radius:6px; padding:4px 8px; font-size:11px; outline:none;">
                ${opts}
            </select>
        </div>
    `;[span_20](start_span)[span_20](end_span)
}

function selectStreetCar(idx) {
    state.player.selectedStreetCarIndex = parseInt(idx);[span_21](start_span)[span_21](end_span)
    saveState();[span_22](start_span)[span_22](end_span)
    renderStreetScreen();[span_23](start_span)[span_23](end_span)
    playSound('tick');[span_24](start_span)[span_24](end_span)
}

function setRaceBet(amount) {
    currentRaceBet = amount;[span_25](start_span)[span_25](end_span)
    window.currentRaceBet = amount;
    playSound('tick');[span_26](start_span)[span_26](end_span)
    tgHaptic('light');[span_27](start_span)[span_27](end_span)
    showToast("Ставка на 402м: " + amount.toLocaleString() + " ₽");[span_28](start_span)[span_28](end_span)
}

function holdGasPedal() {
    initAudio();[span_29](start_span)[span_29](end_span)
    isGasPedalHeld = true;[span_30](start_span)[span_30](end_span)
    if (gasRpmInterval) clearInterval(gasRpmInterval);[span_31](start_span)[span_31](end_span)

    gasRpmInterval = setInterval(() => {[span_32](start_span)[span_32](end_span)
        if (isGasPedalHeld) {[span_33](start_span)[span_33](end_span)
            currentRpm = Math.min(8000, currentRpm + 350);[span_34](start_span)[span_34](end_span)
        } else {
            currentRpm = Math.max(800, currentRpm - 250);[span_35](start_span)[span_35](end_span)
        }
        window.currentRpm = currentRpm;
        window.tachoRpm = currentRpm;
        updateTachometerUI();[span_36](start_span)[span_36](end_span)
    }, 50);[span_37](start_span)[span_37](end_span)
}

function releaseGasPedal() {
    isGasPedalHeld = false;[span_38](start_span)[span_38](end_span)
    if (gasRpmInterval) clearInterval(gasRpmInterval);[span_39](start_span)[span_39](end_span)

    gasRpmInterval = setInterval(() => {[span_40](start_span)[span_40](end_span)
        currentRpm = Math.max(800, currentRpm - 300);[span_41](start_span)[span_41](end_span)
        window.currentRpm = currentRpm;
        window.tachoRpm = currentRpm;
        updateTachometerUI();[span_42](start_span)[span_42](end_span)
        if (currentRpm <= 800) {[span_43](start_span)[span_43](end_span)
            clearInterval(gasRpmInterval);[span_44](start_span)[span_44](end_span)
        }
    }, 50);[span_45](start_span)[span_45](end_span)
}

function updateTachometerUI() {
    const needle = document.getElementById('tachoNeedle');[span_46](start_span)[span_46](end_span)
    if (!needle) return;[span_47](start_span)[span_47](end_span)
    let pct = Math.max(0, Math.min(100, ((currentRpm - 800) / (8000 - 800)) * 100));[span_48](start_span)[span_48](end_span)
    needle.style.left = pct + "%";[span_49](start_span)[span_49](end_span)
}

// ========================================================
// ДРАГ-РЕЙСИНГ НА 402 МЕТРА (С АНТИФАРМОМ И ИЗНОСОМ)
// ========================================================
function launchDragRace() {
    if (!state.player.hasRacingLicense) {[span_50](start_span)[span_50](end_span)
        return showToast("Нужна Гоночная Лицензия РАФ! Оформите в Маркете или у Решалы.");
    }

    let cash = state.player.cash || 0;[span_51](start_span)[span_51](end_span)
    if (cash < currentRaceBet) {[span_52](start_span)[span_52](end_span)
        return showToast("Не хватает денег на ставку " + currentRaceBet.toLocaleString() + " ₽!");[span_53](start_span)[span_53](end_span)
    }

    if (!state.garage || state.garage.length === 0) {[span_54](start_span)[span_54](end_span)
        return showToast("В гараже нет машин для гонки!");[span_55](start_span)[span_55](end_span)
    }

    let car = state.garage[state.player.selectedStreetCarIndex || 0];[span_56](start_span)[span_56](end_span)
    if (!car) return showToast("Выберите авто в гараже!");[span_57](start_span)[span_57](end_span)

    // 1. Проверка перегрева двигателя (антифарм)
    let temp = car.engineTemp || 90;
    if (temp > 105) {
        playSound('error');
        tgHaptic('error');
        return showToast("⚠️ Перегрев мотора (" + temp + "°C)! Дайте остыть или остудите в гараже.");
    }

    // 2. Проверка состояния шин
    let tires = car.tireWear !== undefined ? car.tireWear : 100;
    if (tires < 20) {
        playSound('error');
        tgHaptic('error');
        return showToast("🚫 Резина стёрта до корда! Замените комплект на СТО перед стартом.");
    }

    // Списание ставки[span_58](start_span)[span_58](end_span)
    state.player.cash -= currentRaceBet;[span_59](start_span)[span_59](end_span)
    state.player.consecutiveRaces = (state.player.consecutiveRaces || 0) + 1;[span_60](start_span)[span_60](end_span)

    // Нанесение механического износа и нагрева за заезд
    car.engineTemp = (car.engineTemp || 90) + Math.floor(10 + Math.random() * 8);
    car.tireWear = Math.max(0, tires - (car.tuning?.dragSlicks ? 12 : 8));
    if (car.wear) {
        car.wear.engine = Math.max(10, (car.wear.engine || 85) - 1.5);
        car.wear.transmission = Math.max(10, (car.wear.transmission || 85) - 2);
    }

    let playerCarEl = document.getElementById('playerRaceCarRunner');[span_61](start_span)[span_61](end_span)
    let rivalCarEl = document.getElementById('rivalRaceCarRunner');[span_62](start_span)[span_62](end_span)
    let statusText = document.getElementById('raceStatusText');[span_63](start_span)[span_63](end_span)

    let idealStart = currentRpm >= 5500 && currentRpm <= 6800;[span_64](start_span)[span_64](end_span)
    let cutOff = currentRpm > 7500;[span_65](start_span)[span_65](end_span)
    let bogged = currentRpm < 4200;

    let playerPower = car.power || 100;[span_66](start_span)[span_66](end_span)
    
    // Влияние привода на разгон с места
    let drive = car.drivetrain || 'rwd';
    if (drive === 'awd') playerPower *= 1.15; // Полный привод на старте
    else if (drive === 'fwd') playerPower *= 0.92; // Пробуксовка переднего привода

    if (car.tuning?.dragSlicks) playerPower += 35;[span_67](start_span)[span_67](end_span)
    if (car.tuning?.chip > 0) playerPower *= (1 + car.tuning.chip * 0.08);
    
    if (idealStart) playerPower += 45;[span_68](start_span)[span_68](end_span)
    else if (cutOff) playerPower -= 35;[span_69](start_span)[span_69](end_span)
    else if (bogged) playerPower -= 25;

    let rivalPower = Math.floor(playerPower * (0.82 + Math.random() * 0.34));[span_70](start_span)[span_70](end_span)

    if (statusText) {
        if (idealStart) statusText.innerText = "🔥 ИДЕАЛЬНЫЙ ЛАНЧ-СТАРТ! ЗАЦЕП НА СТАРТЕ!";
        else if (cutOff) statusText.innerText = "❌ ОТСЕЧКА И БУКС НА МЕСТЕ!";
        else if (bogged) statusText.innerText = "⚠️ ПРОВАЛ ОБОРОТОВ НА СТАРТЕ!";
        else statusText.innerText = "🚦 Заезд начался...";
    }

    let pPos = 0;[span_71](start_span)[span_71](end_span)
    let rPos = 0;[span_72](start_span)[span_72](end_span)
    let pSpeed = playerPower / 48;
    let rSpeed = rivalPower / 48;

    if (raceAnimationTimer) clearInterval(raceAnimationTimer);[span_73](start_span)[span_73](end_span)
    playEngineSound();[span_74](start_span)[span_74](end_span)

    raceAnimationTimer = setInterval(() => {[span_75](start_span)[span_75](end_span)
        pPos += pSpeed;[span_76](start_span)[span_76](end_span)
        rPos += rSpeed;[span_77](start_span)[span_77](end_span)

        if (playerCarEl) playerCarEl.style.left = Math.min(88, pPos) + "%";[span_78](start_span)[span_78](end_span)
        if (rivalCarEl) rivalCarEl.style.left = Math.min(88, rPos) + "%";[span_79](start_span)[span_79](end_span)

        if (pPos >= 88 || rPos >= 88) {[span_80](start_span)[span_80](end_span)
            clearInterval(raceAnimationTimer);[span_81](start_span)[span_81](end_span)
            let isWin = pPos >= rPos;[span_82](start_span)[span_82](end_span)

            let myTime = (15.5 - Math.log(playerPower / 65) * 2.8).toFixed(2);
            let rivalTime = (15.5 - Math.log(rivalPower / 65) * 2.8).toFixed(2);

            setTimeout(() => {[span_83](start_span)[span_83](end_span)
                if (playerCarEl) playerCarEl.style.left = "0%";[span_84](start_span)[span_84](end_span)
                if (rivalCarEl) rivalCarEl.style.left = "0%";[span_85](start_span)[span_85](end_span)

                if (isWin) {[span_86](start_span)[span_86](end_span)
                    let winSum = currentRaceBet * 2;[span_87](start_span)[span_87](end_span)
                    state.player.cash += winSum;[span_88](start_span)[span_88](end_span)
                    addXp(35);[span_89](start_span)[span_89](end_span)
                    state.player.mood = Math.min(100, (state.player.mood || 80) + 15);[span_90](start_span)[span_90](end_span)
                    state.player.streetCred = (state.player.streetCred || 100) + 20;

                    if (typeof trackQuestProgress === 'function') {
                        trackQuestProgress('win_drag', 1);
                    }

                    if (typeof logBankTransaction === 'function') {
                        logBankTransaction("Победа в заезде 402м", winSum, true);
                    }

                    saveState();[span_91](start_span)[span_91](end_span)
                    updateHeaderUI();[span_92](start_span)[span_92](end_span)
                    openVerdictModal("ПОБЕДА НА 402М! 🏁", `Вы обошли соперника на квотере!\nВаше время: ${myTime}с | Соперник: ${rivalTime}с\nВыигрыш: +${winSum.toLocaleString()} ₽ (+20 Респекта)`, true, winSum);
                } else {
                    state.player.mood = Math.max(0, (state.player.mood || 80) - 20);[span_93](start_span)[span_93](end_span)
                    state.player.streetCred = Math.max(10, (state.player.streetCred || 100) - 10);
                    
                    if (typeof logBankTransaction === 'function') {
                        logBankTransaction("Проигрыш ставки на 402м", currentRaceBet, false);
                    }

                    saveState();[span_94](start_span)[span_94](end_span)
                    updateHeaderUI();[span_95](start_span)[span_95](end_span)
                    openVerdictModal("ПОРАЖЕНИЕ НА 402М 💨", `Соперник оказался быстрее на финише!\nВаше время: ${myTime}с | Соперник: ${rivalTime}с\nСтавка -${currentRaceBet.toLocaleString()} ₽ потеряна.`, false);
                }

                // Проверка внимания и облав ДПС[span_96](start_span)[span_96](end_span)
                checkPoliceRaid();[span_97](start_span)[span_97](end_span)
            }, 600);[span_98](start_span)[span_98](end_span)
        }
    }, 60);[span_99](start_span)[span_99](end_span)
}

function checkPoliceRaid() {
    let raids = state.player.consecutiveRaces || 0;[span_100](start_span)[span_100](end_span)
    let maxRaids = state.player.maxRacesBeforeRaid || 12;[span_101](start_span)[span_101](end_span)

    if (state.player.policeImmunityDays > 0) return; // Крыша защищает[span_102](start_span)[span_102](end_span)

    if (raids >= maxRaids) {[span_103](start_span)[span_103](end_span)
        state.player.consecutiveRaces = 0;[span_104](start_span)[span_104](end_span)
        let fine = 45000;[span_105](start_span)[span_105](end_span)
        state.player.cash = Math.max(0, (state.player.cash || 0) - fine);[span_106](start_span)[span_106](end_span)
        state.player.trafficFines = (state.player.trafficFines || 0) + fine;
        
        playSound('error');
        tgHaptic('error');
        showToast("🚨 ОБЛАВА ДПС НА ГОНКАХ! Выписан штраф 45,000 ₽.");[span_107](start_span)[span_107](end_span)
        saveState();[span_108](start_span)[span_108](end_span)
        updateHeaderUI();[span_109](start_span)[span_109](end_span)
    }
}

// ========================================================
// СТРИТ-МЕРОПРИЯТИЯ И ФЕСТИВАЛИ
// ========================================================
const STREET_EVENTS_DATA = [
    {
        id: "ev_drift_meet",[span_110](start_span)[span_110](end_span)
        name: "Ночная дрифт-сходка у ТЦ",[span_111](start_span)[span_111](end_span)
        type: "drift",[span_112](start_span)[span_112](end_span)
        classBadge: "Дрифт",[span_113](start_span)[span_113](end_span)
        req: "Заварка редуктора + Выворот",[span_114](start_span)[span_114](end_span)
        reward: "75,000 ₽ + 25 Кармы",[span_115](start_span)[span_115](end_span)
        rewardCash: 75000,[span_116](start_span)[span_116](end_span)
        rewardKarma: 25,[span_117](start_span)[span_117](end_span)
        desc: "Парные проезды по мокрому асфальту под аплодисменты зрителей.",[span_118](start_span)[span_118](end_span)
        check: (car) => !!(car.tuning?.weldedDiff && car.tuning?.steeringAngle)[span_119](start_span)[span_119](end_span)
    },
    {
        id: "ev_stance_show",[span_120](start_span)[span_120](end_span)
        name: "Городской Стенс-Фестиваль",[span_121](start_span)[span_121](end_span)
        type: "show",[span_122](start_span)[span_122](end_span)
        classBadge: "Стенс / Шоу",[span_123](start_span)[span_123](end_span)
        req: "Пневма/Стенс + Диски + Обвес",[span_124](start_span)[span_124](end_span)
        reward: "150,000 ₽ + 2 🤝 Связи",[span_125](start_span)[span_125](end_span)
        rewardCash: 150000,[span_126](start_span)[span_126](end_span)
        rewardConn: 2,[span_127](start_span)[span_127](end_span)
        desc: "Выставка проектов. Оценивается фитмент, чистота полок и зазоры кузова.",[span_128](start_span)[span_128](end_span)
        check: (car) => !!(car.tuning?.stance && car.tuning?.customWheels && car.tuning?.bodykit)[span_129](start_span)[span_129](end_span)
    },
    {
        id: "ev_drag_cup",[span_130](start_span)[span_130](end_span)
        name: "Кубок Нелегала 402м",[span_131](start_span)[span_131](end_span)
        type: "drag",[span_132](start_span)[span_132](end_span)
        classBadge: "Драг",[span_133](start_span)[span_133](end_span)
        req: "Каркас + Слики + Stage 2+",[span_134](start_span)[span_134](end_span)
        reward: "300,000 ₽ + 50 ⭐ Stars",[span_135](start_span)[span_135](end_span)
        rewardCash: 300000,[span_136](start_span)[span_136](end_span)
        rewardStars: 50,[span_137](start_span)[span_137](end_span)
        desc: "Серьезная битва самых быстрых турбо-корчей города за крупный куш.",[span_138](start_span)[span_138](end_span)
        check: (car) => !!(car.tuning?.rollCage && car.tuning?.dragSlicks && (car.tuning?.chip || 0) >= 2)[span_139](start_span)[span_139](end_span)
    }
];

function renderStreetEvents() {
    const container = document.getElementById('streetEventsContainer');[span_140](start_span)[span_140](end_span)
    if (!container) return;[span_141](start_span)[span_141](end_span)

    if (!state.garage || state.garage.length === 0) {[span_142](start_span)[span_142](end_span)
        container.innerHTML = "<div class='text-xs sub-label text-center py-2'>Сначала добавьте автомобиль в гараж.</div>";[span_143](start_span)[span_143](end_span)
        return;[span_144](start_span)[span_144](end_span)
    }

    let car = state.garage[state.player.selectedStreetCarIndex || 0];[span_145](start_span)[span_145](end_span)
    if (!car) {[span_146](start_span)[span_146](end_span)
        container.innerHTML = "<div class='text-xs sub-label text-center py-2'>Автомобиль не выбран.</div>";[span_147](start_span)[span_147](end_span)
        return;[span_148](start_span)[span_148](end_span)
    }

    let html = "";[span_149](start_span)[span_149](end_span)
    STREET_EVENTS_DATA.forEach(ev => {[span_150](start_span)[span_150](end_span)
        let isFit = ev.check(car);[span_151](start_span)[span_151](end_span)
        let btnHtml = isFit[span_152](start_span)[span_152](end_span)
            ? `<button onclick="participateStreetEvent('${ev.id}')" class="btn btn-green btn-sm w-full mt-2">Участвовать 🏆</button>`[span_153](start_span)[span_153](end_span)
            : `<button class="btn btn-dark btn-sm w-full mt-2 opacity-50" disabled>Не соответствует регламенту</button>`;[span_154](start_span)[span_154](end_span)

        let cardClass = ev.type === 'drift' ? 'card-drift' : (ev.type === 'show' ? 'card-show' : '');[span_155](start_span)[span_155](end_span)

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
        `;[span_156](start_span)[span_156](end_span)
    });

    container.innerHTML = html;[span_157](start_span)[span_157](end_span)
}

function participateStreetEvent(eventId) {
    const ev = STREET_EVENTS_DATA.find(e => e.id === eventId);[span_158](start_span)[span_158](end_span)
    if (!ev) return;[span_159](start_span)[span_159](end_span)

    let car = state.garage[state.player.selectedStreetCarIndex || 0];[span_160](start_span)[span_160](end_span)
    if (!car || !ev.check(car)) {[span_161](start_span)[span_161](end_span)
        return showToast("Автомобиль не прошел техкомиссию регламента!");[span_162](start_span)[span_162](end_span)
    }

    // Износ агрегатов
    car.engineTemp = (car.engineTemp || 90) + 15;
    car.tireWear = Math.max(0, (car.tireWear !== undefined ? car.tireWear : 100) - 15);

    if (ev.rewardCash) state.player.cash = (state.player.cash || 0) + ev.rewardCash;[span_163](start_span)[span_163](end_span)
    if (ev.rewardKarma) state.player.karma = Math.min(100, (state.player.karma || 50) + ev.rewardKarma);[span_164](start_span)[span_164](end_span)
    if (ev.rewardConn) state.player.connections = (state.player.connections || 0) + ev.rewardConn;[span_165](start_span)[span_165](end_span)
    if (ev.rewardStars) state.player.stars = (state.player.stars || 0) + ev.rewardStars;[span_166](start_span)[span_166](end_span)

    addXp(75);[span_167](start_span)[span_167](end_span)
    state.player.mood = 100;[span_168](start_span)[span_168](end_span)
    saveState();[span_169](start_span)[span_169](end_span)
    updateHeaderUI();[span_170](start_span)[span_170](end_span)
    playSound('win');[span_171](start_span)[span_171](end_span)
    tgHaptic('success');[span_172](start_span)[span_172](end_span)
    openVerdictModal("ПОБЕДА В МЕРОПРИЯТИИ! 🏆", `Вы взяли 1-е место в «${ev.name}»! Награда получена.`, true, ev.rewardCash);[span_173](start_span)[span_173](end_span)
}

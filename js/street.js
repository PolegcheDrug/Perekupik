// ========================================================
// js/street.js — СТРИТ-РЕЙСИНГ, 402М И АВТОМЕРОПРИЯТИЯ (v0.4.0)
// ========================================================

let currentRaceBet = 25000;
let isGasPedalHeld = false;
let currentRpm = 800;
let gasRpmInterval = null;
let raceAnimationTimer = null;

function renderStreetScreen() {
    const picker = document.getElementById('streetCarPickerBox');
    const hpBadge = document.getElementById('streetSelectedCarHp');
    if (!picker) return;

    if (!state.garage || state.garage.length === 0) {
        picker.innerHTML = "<div class='text-xs color-red text-center py-2'>В гараже нет машин! Купите авто для участия в заездах.</div>";
        if (hpBadge) hpBadge.innerText = "0 л.с.";
        return;
    }

    let selIdx = state.player.selectedStreetCarIndex || 0;
    if (selIdx >= state.garage.length) selIdx = 0;
    state.player.selectedStreetCarIndex = selIdx;

    let car = state.garage[selIdx];
    let carHp = car.power || 100;
    if (hpBadge) hpBadge.innerText = carHp + " л.с.";

    let opts = "";
    state.garage.forEach((c, idx) => {
        let isSel = idx === selIdx ? "selected" : "";
        opts += `<option value="${idx}" ${isSel}>${c.name} (${c.power || 100} л.с.)</option>`;
    });

    picker.innerHTML = `
        <div class="flex-between">
            <span class="text-xs sub-label">Боевой корч:</span>
            <select onchange="selectStreetCar(this.value)" style="background:#111a2a; color:#fff; border:1px solid var(--border-glass); border-radius:6px; padding:4px 8px; font-size:11px; outline:none;">
                ${opts}
            </select>
        </div>
    `;
}

function selectStreetCar(idx) {
    state.player.selectedStreetCarIndex = parseInt(idx);
    saveState();
    renderStreetScreen();
    playSound('tick');
}

function setRaceBet(amount) {
    currentRaceBet = amount;
    playSound('tick');
    tgHaptic('light');
    showToast("Ставка на 402м: " + amount.toLocaleString() + " ₽");
}

function holdGasPedal() {
    initAudio();
    isGasPedalHeld = true;
    if (gasRpmInterval) clearInterval(gasRpmInterval);

    gasRpmInterval = setInterval(() => {
        if (isGasPedalHeld) {
            currentRpm = Math.min(8000, currentRpm + 350);
        } else {
            currentRpm = Math.max(800, currentRpm - 250);
        }
        updateTachometerUI();
    }, 50);
}

function releaseGasPedal() {
    isGasPedalHeld = false;
    if (gasRpmInterval) clearInterval(gasRpmInterval);

    gasRpmInterval = setInterval(() => {
        currentRpm = Math.max(800, currentRpm - 300);
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

function launchDragRace() {
    if (!state.player.hasRacingLicense) {
        return showToast("Нужна Гоночная Лицензия РАФ! Оформите у Решалы.");
    }

    let cash = state.player.cash || 0;
    if (cash < currentRaceBet) {
        return showToast("Не хватает денег на ставку " + currentRaceBet.toLocaleString() + " ₽!");
    }

    if (!state.garage || state.garage.length === 0) {
        return showToast("В гараже нет машин для гонки!");
    }

    let car = state.garage[state.player.selectedStreetCarIndex || 0];
    if (!car) return showToast("Выберите авто в гараже!");

    // Списание ставки
    state.player.cash -= currentRaceBet;
    state.player.consecutiveRaces = (state.player.consecutiveRaces || 0) + 1;

    let playerCarEl = document.getElementById('playerRaceCarRunner');
    let rivalCarEl = document.getElementById('rivalRaceCarRunner');
    let statusText = document.getElementById('raceStatusText');

    let idealStart = currentRpm >= 5500 && currentRpm <= 6800;
    let cutOff = currentRpm > 7500;

    let playerPower = car.power || 100;
    if (car.tuning?.dragSlicks) playerPower += 30;
    if (idealStart) playerPower += 40;
    if (cutOff) playerPower -= 35;

    let rivalPower = Math.floor(playerPower * (0.8 + Math.random() * 0.35));

    if (statusText) statusText.innerText = idealStart ? "🔥 ИДЕАЛЬНЫЙ ЛАНЧ-СТАРТ!" : (cutOff ? "❌ ОТСЕЧКА И БУКС!" : "🚦 Заезд начался!");

    let pPos = 0;
    let rPos = 0;
    let pSpeed = playerPower / 45;
    let rSpeed = rivalPower / 45;

    if (raceAnimationTimer) clearInterval(raceAnimationTimer);
    playEngineSound();

    raceAnimationTimer = setInterval(() => {
        pPos += pSpeed;
        rPos += rSpeed;

        if (playerCarEl) playerCarEl.style.left = Math.min(88, pPos) + "%";
        if (rivalCarEl) rivalCarEl.style.left = Math.min(88, rPos) + "%";

        if (pPos >= 88 || rPos >= 88) {
            clearInterval(raceAnimationTimer);
            let isWin = pPos >= rPos;

            setTimeout(() => {
                if (playerCarEl) playerCarEl.style.left = "0%";
                if (rivalCarEl) rivalCarEl.style.left = "0%";

                if (isWin) {
                    let winSum = currentRaceBet * 2;
                    state.player.cash += winSum;
                    addXp(35);
                    state.player.mood = Math.min(100, (state.player.mood || 80) + 15);
                    saveState();
                    updateHeaderUI();
                    openVerdictModal("ПОБЕДА НА 402М! 🏁", `Вы обошли соперника на финише! Выигрыш: +${winSum.toLocaleString()} ₽`, true, winSum);
                } else {
                    state.player.mood = Math.max(0, (state.player.mood || 80) - 20);
                    saveState();
                    updateHeaderUI();
                    openVerdictModal("ПОРАЖЕНИЕ НА 402М 💨", `Соперник оказался быстрее на финишной черте. Ставка -${currentRaceBet.toLocaleString()} ₽ потеряна.`, false);
                }

                // Проверка внимания ДПС
                checkPoliceRaid();
            }, 600);
        }
    }, 60);
}

function checkPoliceRaid() {
    let raids = state.player.consecutiveRaces || 0;
    let maxRaids = state.player.maxRacesBeforeRaid || 12;

    if (state.player.policeImmunityDays > 0) return; // Крыша защищает

    if (raids >= maxRaids) {
        state.player.consecutiveRaces = 0;
        let fine = 45000;
        state.player.cash = Math.max(0, (state.player.cash || 0) - fine);
        showToast("🚨 ОБЛАВА ДПС НА ГОНКАХ! Выписан штраф 45,000 ₽.");
        saveState();
        updateHeaderUI();
    }
}

// ========================================================
// СТРИТ-МЕРОПРИЯТИЯ И ФЕСТИВАЛИ
// ========================================================
const STREET_EVENTS_DATA = [
    {
        id: "ev_drift_meet",
        name: "Ночная дрифт-сходка у ТЦ",
        type: "drift",
        classBadge: "Дрифт",
        req: "Заварка редуктора + Выворот",
        reward: "75,000 ₽ + 25 Кармы",
        rewardCash: 75000,
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
        reward: "150,000 ₽ + 2 🤝 Связи",
        rewardCash: 150000,
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
        reward: "300,000 ₽ + 50 ⭐ Stars",
        rewardCash: 300000,
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

    let car = state.garage[state.player.selectedStreetCarIndex || 0];
    if (!car) {
        container.innerHTML = "<div class='text-xs sub-label text-center py-2'>Автомобиль не выбран.</div>";
        return;
    }

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

    let car = state.garage[state.player.selectedStreetCarIndex || 0];
    if (!car || !ev.check(car)) {
        return showToast("Автомобиль не прошел техкомиссию регламента!");
    }

    if (ev.rewardCash) state.player.cash = (state.player.cash || 0) + ev.rewardCash;
    if (ev.rewardKarma) state.player.karma = Math.min(100, (state.player.karma || 50) + ev.rewardKarma);
    if (ev.rewardConn) state.player.connections = (state.player.connections || 0) + ev.rewardConn;
    if (ev.rewardStars) state.player.stars = (state.player.stars || 0) + ev.rewardStars;

    addXp(75);
    state.player.mood = 100;
    saveState();
    updateHeaderUI();
    playSound('win');
    tgHaptic('success');
    openVerdictModal("ПОБЕДА В МЕРОПРИЯТИИ! 🏆", `Вы взяли 1-е место в «${ev.name}»! Награда получена.`, true, ev.rewardCash);
}

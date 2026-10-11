// ========================================================
// js/street.js — СТРИТ-РЕЙСИНГ, 402М И АВТОМЕРОПРИЯТИЯ (v0.5.2)
// Разработчики: Tak Toje, Max, Sergo, gemini
// Интерактивные зрелищные заезды (6 секунд):
// Арена дрифта (восьмёрка с дымом), Драг 402м с ёлкой старта,
// Стенс-шоу со стравливанием пневмы кузова в пол, шашки по МКАД.
// Экономика усложнена: взносы выше, штрафы ДПС стали жестче.
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
        hpBadge.innerHTML = `${carHp} л.с. | <span class="${temp > 105 ? 'color-red' : 'color-green'}">${temp}°C</span> | <span class="${tires < 30 ? 'color-red' : 'color-cyan'}">${tires}% шины</span>`;
    }

    let opts = "";
    state.garage.forEach((c, idx) => {
        if (!c) return;
        let isSel = idx === selIdx ? "selected" : "";
        let tVal = c.engineTemp || 90;
        let impText = c.impounded ? " [Штрафстоянка]" : "";
        let personalText = c.isPersonal ? " 👑" : "";
        opts += `<option value="${idx}" ${isSel} ${c.impounded ? 'disabled' : ''}>${c.name}${personalText} (${c.power || 100} л.с., ${tVal}°C)${impText}</option>`;
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
    let parsedIdx = parseInt(idx);
    if (!state.garage[parsedIdx] || state.garage[parsedIdx].impounded) {
        return showToast("Этот автомобиль арестован на спецстоянке!");
    }
    state.player.selectedStreetCarIndex = parsedIdx;
    saveState();
    renderStreetScreen();
    playSound('tick');
}

function setRaceBet(amount) {
    currentRaceBet = amount;
    window.currentRaceBet = amount;
    window.streetRaceBet = amount;
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
// ДРАГ-РЕЙСИНГ НА 402 МЕТРА (С АНТИФАРМОМ И ШТРАФСТОЯНКОЙ)
// ========================================================
function launchDragRace() {
    if (!state.player.hasRacingLicense) {
        return showToast("Нужна Гоночная Лицензия РАФ! Оформите в Маркете или у Решалы.");
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
        playSound('error');
        tgHaptic('error');
        return showToast("⚠️ Перегрев мотора (" + temp + "°C)! Остудите болид перед стартом.");
    }

    // 2. Проверка состояния шин
    let tires = car.tireWear !== undefined ? car.tireWear : 100;
    if (tires < 20) {
        playSound('error');
        tgHaptic('error');
        return showToast("🚫 Резина стёрта в ноль! Замените комплект на СТО перед заездом.");
    }

    // Списание ставки
    state.player.cash -= currentRaceBet;
    state.player.consecutiveRaces = (state.player.consecutiveRaces || 0) + 1;

    // Износ и нагрев за боевой заезд
    car.engineTemp = (car.engineTemp || 90) + Math.floor(10 + Math.random() * 8);
    car.tireWear = Math.max(0, tires - (car.tuning?.dragSlicks ? 12 : 8));
    if (car.wear) {
        car.wear.engine = Math.max(10, (car.wear.engine || 85) - 1.5);
        car.wear.transmission = Math.max(10, (car.wear.transmission || 85) - 2);
    }

    let playerCarEl = document.getElementById('playerRaceCarRunner');
    let rivalCarEl = document.getElementById('rivalRaceCarRunner');
    let statusText = document.getElementById('raceStatusText');

    let idealStart = currentRpm >= 5500 && currentRpm <= 6800;
    let cutOff = currentRpm > 7500;
    let bogged = currentRpm < 4200;

    let playerPower = car.power || 100;
    
    let drive = car.drivetrain || 'rwd';
    if (drive === 'awd') playerPower *= 1.15;
    else if (drive === 'fwd') playerPower *= 0.92;

    if (car.tuning?.dragSlicks) playerPower += 35;
    if (car.tuning?.chip > 0) playerPower *= (1 + car.tuning.chip * 0.08);
    
    if (idealStart) playerPower += 45;
    else if (cutOff) playerPower -= 35;
    else if (bogged) playerPower -= 25;

    let rivalPower = Math.floor(playerPower * (0.82 + Math.random() * 0.34));

    if (statusText) {
        if (idealStart) statusText.innerText = "🔥 ИДЕАЛЬНЫЙ ЛАНЧ-СТАРТ! 100% ЗАЦЕП!";
        else if (cutOff) statusText.innerText = "❌ ОТСЕЧКА И БУКС НА СТАРТЕ!";
        else if (bogged) statusText.innerText = "⚠️ ПРОВАЛ ОБОРОТОВ ДВИГАТЕЛЯ!";
        else statusText.innerText = "🚦 Заезд 402 метра начался...";
    }

    let pPos = 0;
    let rPos = 0;
    let pSpeed = playerPower / 48;
    let rSpeed = rivalPower / 48;

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

            let myTime = (15.5 - Math.log(playerPower / 65) * 2.8).toFixed(2);
            let rivalTime = (15.5 - Math.log(rivalPower / 65) * 2.8).toFixed(2);

            setTimeout(() => {
                if (playerCarEl) playerCarEl.style.left = "0%";
                if (rivalCarEl) rivalCarEl.style.left = "0%";

                if (isWin) {
                    let winSum = currentRaceBet * 2;
                    state.player.cash += winSum;
                    addXp(35);
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
                    openVerdictModal("ПОБЕДА НА 402М! 🏁", `Вы обошли соперника на квотере!\nВаше время: ${myTime}с | Соперник: ${rivalTime}с\nВыигрыш: +${winSum.toLocaleString()} ₽ (+20 Респекта)`, true, winSum);
                } else {
                    state.player.mood = Math.max(0, (state.player.mood || 80) - 20);
                    state.player.streetCred = Math.max(10, (state.player.streetCred || 100) - 10);
                    
                    if (typeof logBankTransaction === 'function') {
                        logBankTransaction("Проигрыш ставки на 402м", currentRaceBet, false);
                    }

                    saveState();
                    updateHeaderUI();
                    openVerdictModal("ПОРАЖЕНИЕ НА 402М 💨", `Соперник оказался быстрее на финише!\nВаше время: ${myTime}с | Соперник: ${rivalTime}с\nСтавка -${currentRaceBet.toLocaleString()} ₽ потеряна.`, false);
                }

                // Проверка внимания и эвакуации на штрафстоянку
                checkPoliceRaid(carIdx);
            }, 600);
        }
    }, 60);
}

function checkPoliceRaid(carIdx) {
    let raids = state.player.consecutiveRaces || 0;
    let maxRaids = state.player.maxRacesBeforeRaid || 12;

    if (state.player.policeImmunityDays > 0) return; // Крыша ГИБДД защищает

    if (raids >= maxRaids) {
        state.player.consecutiveRaces = 0;
        let car = state.garage[carIdx];
        if (car) {
            car.impounded = true;
        }

        playSound('error');
        tgHaptic('error');
        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        
        // Открытие интерфейса Штрафстоянки
        if (typeof openImpoundLotModal === 'function') {
            openImpoundLotModal(carIdx);
        } else {
            showToast("🚨 ОБЛАВА ДПС! Автомобиль арестован и отправлен на штрафстоянку!");
        }
    }
}

// ========================================================
// 1. ДРИФТ-АРЕНА (6 СЕКУНД: ВОСЬМЕРКА С ДЫМОМ)
// ========================================================
const PhoneRacing = {
    streetSubTab: 'drift',
    activeAnimTimer: null,

    renderStreetApp(container) {
        let sub = this.streetSubTab || 'drift';
        let streetCred = state.player?.streetCred || 100;
        let credRank = streetCred >= 1200 ? "👑 Легенда RDS & Нелегала" : (streetCred >= 600 ? "⚡ Король Трассы" : (streetCred >= 250 ? "🏎️ Опытный Пилот" : "🔰 Новичок Спота"));

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-flag-checkered color-red mr-1"></i> Street Underground</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(255, 51, 102, 0.2) 0%, #090e18 100%); border-color: rgba(255, 51, 102, 0.4);">
                    <div class="flex-between mb-1">
                        <div>
                            <span class="sub-label" style="font-size:9px;">Авторитет пилота:</span>
                            <div class="font-bold text-xs color-red">${credRank}</div>
                        </div>
                        <span class="tag-badge bg-tag-red">⚡ ${streetCred} Респекта</span>
                    </div>
                </div>

                <div class="grid-4 mb-2">
                    <button onclick="PhoneRacing.switchStreetSubTab('drift')" class="btn ${sub === 'drift' ? 'btn-red' : 'btn-dark'} btn-sm">💨 Дрифт</button>
                    <button onclick="PhoneRacing.switchStreetSubTab('drag')" class="btn ${sub === 'drag' ? 'btn-red' : 'btn-dark'} btn-sm">🏁 402м</button>
                    <button onclick="PhoneRacing.switchStreetSubTab('stance')" class="btn ${sub === 'stance' ? 'btn-red' : 'btn-dark'} btn-sm">✨ Стенс</button>
                    <button onclick="PhoneRacing.switchStreetSubTab('sprint')" class="btn ${sub === 'sprint' ? 'btn-red' : 'btn-dark'} btn-sm">🌃 Шашки</button>
                </div>

                <div id="streetSubScreenContent"></div>
            </div>
        `;

        this.renderStreetSubScreen();
    },

    switchStreetSubTab(tab) {
        if (this.activeAnimTimer) clearInterval(this.activeAnimTimer);
        playSound('tick');
        tgHaptic('light');
        this.streetSubTab = tab;
        this.renderStreetApp(document.getElementById('phoneAppContainer'));
    },

    renderStreetSubScreen() {
        const content = document.getElementById('streetSubScreenContent');
        if (!content) return;

        if (this.streetSubTab === 'drift') {
            this.renderDriftDiscipline(content);
        } else if (this.streetSubTab === 'drag') {
            this.renderDragDiscipline(content);
        } else if (this.streetSubTab === 'stance') {
            this.renderStanceDiscipline(content);
        } else if (this.streetSubTab === 'sprint') {
            this.renderSprintDiscipline(content);
        }
    },

    getDriftSpecInfo(car) {
        if (!car) return { ready: false, reason: "Машина не выбрана" };
        let power = car.power || 100;
        let t = car.tuning || {};
        
        let hasDiff = !!t.weldedDiff;
        let hasAngle = !!t.steeringAngle;
        let hasHydro = !!t.hydroHandbrake;
        let hasCage = !!t.rollCage;
        let hasSeats = !!t.bucketSeats;
        let isOverheated = (car.engineTemp || 90) > 105;
        let isTiresDead = (car.tireWear !== undefined ? car.tireWear : 100) < 20;

        return {
            power,
            hasDiff,
            hasAngle,
            hasHydro,
            hasCage,
            hasSeats,
            isOverheated,
            isTiresDead,
            matsuriReady: hasDiff && hasAngle && power >= 75 && !isOverheated && !isTiresDead,
            matsuriReason: isOverheated ? "Двигатель перегрет (>105°C)!" : (isTiresDead ? "Резина стёрта в ноль!" : (!hasDiff ? "Нужна заварка редуктора" : (!hasAngle ? "Нужен Красноярский выворот" : (power < 75 ? "Нужно минимум 75 л.с." : "Готов")))),
            europeReady: hasDiff && hasAngle && hasHydro && power >= 200 && !isOverheated && !isTiresDead,
            europeReason: isOverheated ? "Перегрев мотора!" : (isTiresDead ? "Требуется замена резины на СТО!" : (power < 200 ? `Нехватка мощности: ${power}/200 л.с.` : (!hasHydro ? "Нужен гидроручник" : "Готов"))),
            gpReady: hasDiff && hasAngle && hasHydro && hasCage && hasSeats && power >= 420 && !isOverheated && !isTiresDead,
            gpReason: isOverheated ? "Остудите болид!" : (isTiresDead ? "Слики взорвутся на разгоне!" : (power < 420 ? `Слабый мотор: ${power}/420 л.с.` : (!hasCage ? "Нужен вварной каркас" : (!hasSeats ? "Нужны ковши" : "Готов"))))
        };
    },

    renderDriftDiscipline(container) {
        if (!state.garage || state.garage.length === 0) {
            container.innerHTML = `<div class="glass-card text-center sub-label py-6">В гараже нет машин! Приобретите автомобиль на рынке.</div>`;
            return;
        }

        let carIdx = getActiveStreetCarIndex();
        let car = state.garage[carIdx];
        const spec = this.getDriftSpecInfo(car);

        let selectorOptions = state.garage.map((c, i) => `<option value="${i}" ${i === carIdx ? 'selected' : ''}>${c.name} (${c.power || 100} л.с.)</option>`).join('');

        let tiresPct = car.tireWear !== undefined ? car.tireWear : 100;
        let tempVal = car.engineTemp || 90;

        container.innerHTML = `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <span class="text-xs sub-label">Боевой кузов:</span>
                    <select onchange="selectStreetCar(this.value)" style="background:#090e18; color:#fff; border:1px solid var(--border-glass); border-radius:6px; padding:3px 8px; font-size:11px; outline:none;">
                        ${selectorOptions}
                    </select>
                </div>
                <div class="car-spec-chips-row mb-1">
                    <div class="car-spec-chip"><i class="fa-solid fa-temperature-half ${tempVal > 105 ? 'color-red' : 'color-green'}"></i> <b>${tempVal}°C</b></div>
                    <div class="car-spec-chip"><i class="fa-solid fa-circle-notch ${tiresPct < 30 ? 'color-red' : 'color-green'}"></i> <b>${tiresPct}%</b> шины</div>
                    <div class="car-spec-chip"><i class="fa-solid fa-bolt color-amber"></i> <b>${car.power || 100}</b> л.с.</div>
                </div>
                <div class="grid-2 mt-2">
                    <button onclick="PhoneRacing.serviceTiresAndCooling(${carIdx})" class="btn btn-dark btn-sm">🛞 Замена шин & СТО (15k)</button>
                    <button onclick="PhoneRacing.coolDownEngine(${carIdx})" class="btn btn-cyan btn-sm">❄️ Остудить мотор</button>
                </div>
            </div>

            <div class="space-y-2" id="driftEventsCardsBox">
                <div class="glass-card p-2" style="border-left: 3px solid var(--cyan);">
                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs color-cyan">1. Зимний Дрифт / Паркинг ТЦ</b>
                            <div class="sub-label" style="font-size:9px;">Скользкое покрытие, заезды вокруг столбов</div>
                        </div>
                        <span class="tag-badge ${spec.matsuriReady ? 'bg-tag-green' : 'bg-tag-red'}">${spec.matsuriReady ? 'ДОПУЩЕН' : 'ОТКАЗ'}</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">
                        Регламент: Мин. 75 л.с., заварка и выворот.<br>
                        ${!spec.matsuriReady ? `<b class="color-red">${spec.matsuriReason}</b>` : `<span class="color-green">Допуск открыт!</span>`}
                    </div>
                    <button onclick="PhoneRacing.runDriftChallenge('matsuri', 25000)" class="btn btn-cyan btn-sm w-full" ${!spec.matsuriReady ? 'disabled' : ''}>
                        Выехать на спот (Взнос 25k ₽)
                    </button>
                </div>

                <div class="glass-card p-2" style="border-left: 3px solid var(--amber);">
                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs color-amber">2. RDS Europe (Сухой трек)</b>
                            <div class="sub-label" style="font-size:9px;">Асфальтовый овал, разгон фуридаши</div>
                        </div>
                        <span class="tag-badge ${spec.europeReady ? 'bg-tag-green' : 'bg-tag-red'}">${spec.europeReady ? 'ДОПУЩЕН' : 'ОТКАЗ'}</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">
                        Регламент: Мин. 200 л.с., гидроручник, заварка, выворот.<br>
                        ${!spec.europeReady ? `<b class="color-red">${spec.europeReason}</b>` : `<span class="color-green">Техком пройден!</span>`}
                    </div>
                    <button onclick="PhoneRacing.runDriftChallenge('europe', 80000)" class="btn btn-amber btn-sm w-full" ${!spec.europeReady ? 'disabled' : ''}>
                        Квалификация RDS Europe (Взнос 80k ₽)
                    </button>
                </div>

                <div class="glass-card p-2" style="border-left: 3px solid var(--red);">
                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs color-red">3. RDS GP (Высшая Лига)</b>
                            <div class="sub-label" style="font-size:9px;">Скорости 140+ км/ч, бэкварды в стену</div>
                        </div>
                        <span class="tag-badge ${spec.gpReady ? 'bg-tag-green' : 'bg-tag-red'}">${spec.gpReady ? 'ДОПУЩЕН' : 'ОТКАЗ'}</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">
                        Регламент: Мин. 420 л.с., вварной каркас, ковши, гидроручник.<br>
                        ${!spec.gpReady ? `<b class="color-red">${spec.gpReason}</b>` : `<span class="color-green">Болид готов к ТОП-32!</span>`}
                    </div>
                    <button onclick="PhoneRacing.runDriftChallenge('gp', 250000)" class="btn btn-red btn-sm w-full" ${!spec.gpReady ? 'disabled' : ''}>
                        ТОП-32 RDS GP (Взнос 250k ₽)
                    </button>
                </div>
            </div>

            <div id="driftRunResultsArea" class="mt-2"></div>
        `;
    },

    serviceTiresAndCooling(carIdx) {
        const car = state.garage[carIdx];
        if (!car) return;
        let cost = 15000;
        let cash = state.player?.cash || 0;
        if (cash < cost) return showToast("Не хватает денег на замену шин!");

        state.player.cash -= cost;
        car.tireWear = 100;
        car.engineTemp = 90;
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast("Установлен новый боевой комплект шин! Мотор остужен.");
        this.renderStreetSubScreen();
    },

    coolDownEngine(carIdx) {
        const car = state.garage[carIdx];
        if (!car) return;
        car.engineTemp = 90;
        saveState();
        playSound('tick');
        showToast("Двигатель заглушен и остыл до 90°C.");
        this.renderStreetSubScreen();
    },

    runDriftChallenge(league, cost) {
        let cash = state.player?.cash || 0;
        if (cash < cost) return showToast("Не хватает денег на стартовый взнос!");

        const carIdx = state.player.selectedStreetCarIndex || 0;
        const car = state.garage[carIdx];
        if (!car) return;

        state.player.cash -= cost;
        car.engineTemp = (car.engineTemp || 90) + Math.floor(12 + Math.random() * 8);
        car.tireWear = Math.max(0, (car.tireWear !== undefined ? car.tireWear : 100) - Math.floor(16 + Math.random() * 10));
        if (car.wear) {
            car.wear.transmission = Math.max(10, (car.wear.transmission || 85) - 2.5);
        }

        playSound('tick');
        tgHaptic('medium');

        const resultsArea = document.getElementById('driftRunResultsArea');
        const cardsBox = document.getElementById('driftEventsCardsBox');
        if (!resultsArea) return;
        if (cardsBox) cardsBox.style.display = 'none';

        resultsArea.innerHTML = `
            <div class="interactive-arena-card mb-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-compass-drafting"></i> Дрифт-Арена: Восьмёрка</b>
                    <span class="tag-badge bg-tag-red" id="driftLiveTimerBadge">6.0с</span>
                </div>
                
                <div class="drift-track-canvas-wrap">
                    <canvas id="driftFigureEightCanvas" width="400" height="220" class="drift-canvas-stage"></canvas>
                    <div class="drift-telemetry-hud">
                        <div>УГОЛ: <b class="color-red" id="driftAngleTxt">62°</b></div>
                        <div>СКОРОСТЬ: <b class="color-cyan" id="driftSpeedTxt">84 км/ч</b></div>
                        <div>БАЛЛЫ: <b class="color-green" id="driftLiveScoreTxt">0</b></div>
                    </div>
                </div>

                <div class="sub-label text-center mt-1" id="driftPhaseHint">Постановка фуридаши в первую дугу...</div>
            </div>
        `;

        this.startDriftEightAnimation(league, cost, car);
    },

    startDriftEightAnimation(league, cost, car) {
        const cvs = document.getElementById('driftFigureEightCanvas');
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
        const W = cvs.width;
        const H = cvs.height;

        let startTime = Date.now();
        let duration = 6000;
        let tireMarks = [];
        let smokeParticles = [];

        let power = car.power || 100;

        let angleBase = league === 'gp' ? 78 : (league === 'europe' ? 68 : 58);
        let speedBase = league === 'gp' ? 125 : (league === 'europe' ? 95 : 65);

        playEngineSound();

        if (this.activeAnimTimer) clearInterval(this.activeAnimTimer);

        this.activeAnimTimer = setInterval(() => {
            let elapsed = Date.now() - startTime;
            let progress = Math.min(1, elapsed / duration);
            let timeLeft = Math.max(0, (duration - elapsed) / 1000).toFixed(1);

            const timerBadge = document.getElementById('driftLiveTimerBadge');
            const angleEl = document.getElementById('driftAngleTxt');
            const speedEl = document.getElementById('driftSpeedTxt');
            const scoreEl = document.getElementById('driftLiveScoreTxt');
            const hintEl = document.getElementById('driftPhaseHint');

            if (timerBadge) timerBadge.innerText = `${timeLeft}с`;

            let tParam = progress * 4 * Math.PI;
            let scaleX = 140;
            let scaleY = 70;
            let cx = W / 2;
            let cy = H / 2;

            let carX = cx + (scaleX * Math.cos(tParam)) / (1 + Math.sin(tParam) * Math.sin(tParam));
            let carY = cy + (scaleY * Math.sin(tParam) * Math.cos(tParam)) / (1 + Math.sin(tParam) * Math.sin(tParam));

            let currentAngle = Math.round(angleBase + Math.sin(tParam * 2) * 14);
            let currentSpeed = Math.round(speedBase + Math.cos(tParam) * 12);
            let currentScore = Math.round(progress * (league === 'gp' ? 96 : (league === 'europe' ? 90 : 84)));

            if (angleEl) angleEl.innerText = `${currentAngle}°`;
            if (speedEl) speedEl.innerText = `${currentSpeed} км/ч`;
            if (scoreEl) scoreEl.innerText = `${currentScore}`;

            if (hintEl) {
                if (progress < 0.25) hintEl.innerText = "Инициализация заноса фуридаши! Клиппинг #1...";
                else if (progress < 0.5) hintEl.innerText = "Глубокая перекладка через центр парковки!";
                else if (progress < 0.75) hintEl.innerText = "Вход во вторую дугу! Газ в отсечку!";
                else hintEl.innerText = "Финишный выход в базу под овации зрителей!";
            }

            tireMarks.push({ x: carX, y: carY, alpha: 0.7 });
            if (tireMarks.length > 90) tireMarks.shift();

            smokeParticles.push({
                x: carX + (Math.random() * 8 - 4),
                y: carY + (Math.random() * 8 - 4),
                radius: 4 + Math.random() * 6,
                alpha: 0.6
            });
            if (smokeParticles.length > 40) smokeParticles.shift();

            ctx.clearRect(0, 0, W, H);

            ctx.fillStyle = "#070c14";
            ctx.fillRect(0, 0, W, H);
            
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.lineWidth = 1;
            for (let x = 0; x < W; x += 30) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
            }
            for (let y = 0; y < H; y += 30) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
            }

            ctx.fillStyle = "#ffb300";
            ctx.beginPath(); ctx.arc(cx - 70, cy, 7, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 70, cy, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#000";
            ctx.beginPath(); ctx.arc(cx - 70, cy, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 70, cy, 3, 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = "rgba(20, 20, 20, 0.85)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            for (let i = 0; i < tireMarks.length; i++) {
                let p = tireMarks[i];
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();

            for (let i = 0; i < smokeParticles.length; i++) {
                let sp = smokeParticles[i];
                ctx.fillStyle = `rgba(220, 230, 242, ${sp.alpha})`;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
                ctx.fill();
                sp.radius += 0.3;
                sp.alpha = Math.max(0, sp.alpha - 0.02);
            }

            ctx.save();
            ctx.translate(carX, carY);
            let headingAngle = Math.atan2(scaleY * Math.cos(tParam * 2), -scaleX * Math.sin(tParam)) + (currentAngle * Math.PI / 180 * 0.45);
            ctx.rotate(headingAngle);

            ctx.fillStyle = "#ff3366";
            ctx.shadowColor = "#ff3366";
            ctx.shadowBlur = 8;
            ctx.fillRect(-12, -7, 24, 14);

            ctx.fillStyle = "#0b101a";
            ctx.fillRect(-5, -5, 11, 10);

            ctx.fillStyle = "#00f2fe";
            ctx.fillRect(10, -6, 3, 3);
            ctx.fillRect(10, 3, 3, 3);

            ctx.restore();

            if (progress >= 1) {
                clearInterval(this.activeAnimTimer);
                this.finishDriftChallenge(league, cost, currentScore, car);
            }
        }, 33);
    },

    finishDriftChallenge(league, cost, score, car) {
        let isWin = score >= 75;
        let reward = Math.round(cost * (league === 'gp' ? 2.6 : (league === 'europe' ? 2.3 : 2.0)));
        let repBonus = league === 'gp' ? 75 : (league === 'europe' ? 40 : 20);

        if (typeof trackQuestProgress === 'function') {
            trackQuestProgress('drift_run', 1);
        }

        const resultsArea = document.getElementById('driftRunResultsArea');
        if (!resultsArea) return;

        if (isWin) {
            state.player.cash += reward;
            state.player.streetCred = (state.player.streetCred || 100) + repBonus;
            playSound('win');
            tgHaptic('success');

            resultsArea.innerHTML = `
                <div class="glass-card p-2 text-center" style="border-color:var(--green);">
                    <div class="font-bold text-xs color-green mb-1">🏁 ЗАЕЗД ЗАВЕРШЁН: ${score} ИЗ 100 БАЛЛОВ!</div>
                    <div class="sub-label mb-2" style="font-size:10px;">
                        Чистая восьмёрка без распрямлений! Судьи зафиксировали отличный угол.<br>
                        Выигрыш: <b class="color-green">+${reward.toLocaleString()} ₽</b> (+${repBonus} Респекта)
                    </div>
                    <button onclick="PhoneRacing.renderStreetSubScreen()" class="btn btn-green btn-sm w-full">Отлично, к выбору заездов ✓</button>
                </div>
            `;
        } else {
            state.player.streetCred = Math.max(10, (state.player.streetCred || 100) - 10);
            playSound('error');
            tgHaptic('error');

            resultsArea.innerHTML = `
                <div class="glass-card p-2 text-center" style="border-color:var(--red);">
                    <div class="font-bold text-xs color-red mb-1">💥 НЕ КВАЛИФИЦИРОВАН: ${score} БАЛЛОВ</div>
                    <div class="sub-label mb-2" style="font-size:10px;">
                        Разворот в центре перекладки или потеря дыма. Стартовый взнос -${cost.toLocaleString()} ₽ потерян.
                    </div>
                    <button onclick="PhoneRacing.renderStreetSubScreen()" class="btn btn-dark btn-sm w-full">Попробовать снова</button>
                </div>
            `;
        }

        saveState();
        updateHeaderUI();
    },

    renderDragDiscipline(container) {
        if (!state.garage || state.garage.length === 0) {
            container.innerHTML = `<div class="glass-card text-center sub-label py-6">В гараже нет машин!</div>`;
            return;
        }

        let carIdx = getActiveStreetCarIndex();
        let car = state.garage[carIdx];
        let myPower = car.power || 100;

        let selectorOptions = state.garage.map((c, i) => `<option value="${i}" ${i === carIdx ? 'selected' : ''}>${c.name} (${c.power || 100} л.с.)</option>`).join('');

        container.innerHTML = `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <span class="text-xs sub-label">Болид на прямой:</span>
                    <select onchange="selectStreetCar(this.value)" style="background:#090e18; color:#fff; border:1px solid var(--border-glass); border-radius:6px; padding:3px 8px; font-size:11px; outline:none;">
                        ${selectorOptions}
                    </select>
                </div>
                <div class="car-spec-chips-row mb-1">
                    <div class="car-spec-chip"><i class="fa-solid fa-bolt color-red"></i> <b>${myPower}</b> л.с.</div>
                    <div class="car-spec-chip"><i class="fa-solid fa-circle-notch color-amber"></i> <b>${car.tuning?.dragSlicks ? 'Слики (-0.6с)' : 'Сток шины'}</b></div>
                </div>
            </div>

            <div class="race-panel mb-2 p-2" id="dragRaceMainPanel">
                <div class="flex-between mb-1">
                    <div class="race-status" id="raceStatusText" style="font-size:11px; margin-bottom:0;">Держите газ в зелёной зоне (5500-6500 RPM)!</div>
                    <span class="tag-badge bg-tag-amber" id="raceHeatBadge">Внимание ДПС: ${state.player?.consecutiveRaces || 0}/12</span>
                </div>
                
                <div class="drag-christmas-tree-box my-2">
                    <div class="tree-light" id="treePreStage">⚪</div>
                    <div class="tree-light" id="treeStage">⚪</div>
                    <div class="tree-light tree-amber" id="treeAmber1">🟡</div>
                    <div class="tree-light tree-amber" id="treeAmber2">🟡</div>
                    <div class="tree-light tree-amber" id="treeAmber3">🟡</div>
                    <div class="tree-light tree-green" id="treeGreen">🟢</div>
                </div>

                <div class="race-track-box my-2">
                    <div class="race-lane"><span class="sub-label" style="position:absolute; left:6px;">ВЫ</span><div class="race-car-runner" id="playerRaceCarRunner" style="left:0%;">🏎️</div></div>
                    <div class="race-lane"><span class="sub-label" style="position:absolute; left:6px;">СОПЕРНИК</span><div class="race-car-runner" id="rivalRaceCarRunner" style="left:0%;">🚙</div></div>
                </div>

                <div class="tachometer-wrap mb-2">
                    <div class="tachometer-zone"></div>
                    <div class="tachometer-needle" id="tachoNeedle"></div>
                </div>

                <div class="grid-3 mb-2">
                    <button onclick="setRaceBet(25000)" class="btn btn-dark btn-sm">25k ₽</button>
                    <button onclick="setRaceBet(100000)" class="btn btn-dark btn-sm">100k ₽</button>
                    <button onclick="setRaceBet(500000)" class="btn btn-amber btn-sm">500k ₽</button>
                </div>

                <div class="grid-2">
                    <button id="btnGasPedal" onmousedown="holdGasPedal()" onmouseup="releaseGasPedal()" ontouchstart="holdGasPedal()" ontouchend="releaseGasPedal()" class="btn btn-amber btn-sm">
                        🔥 ГАЗ / ТАХОМЕТР
                    </button>
                    <button id="btnStartRaceLaunch" onclick="launchDragRace()" class="btn btn-green btn-sm">
                        🚦 СТАРТ НА 402М
                    </button>
                </div>
            </div>
        `;
    },

    renderStanceDiscipline(container) {
        if (!state.garage || state.garage.length === 0) {
            container.innerHTML = `<div class="glass-card text-center sub-label py-6">В гараже нет машин для выставки!</div>`;
            return;
        }

        let carIdx = getActiveStreetCarIndex();
        const car = state.garage[carIdx];
        const t = car.tuning || {};

        let score = 20;
        let penaltyText = "";

        if (t.stance) score += 35;
        if (t.customWheels) score += 25;
        if (t.bodykit) score += 15;
        if (car.isPolished) score += 12;

        let cond = car.condition || 100;
        if (cond < 60) {
            score -= 20;
            penaltyText += "• Вмятины и сколы на кузове (-20 баллов)<br>";
        }
        if (car.bodyThickness?.doors > 250 || car.bodyThickness?.wings > 250) {
            score -= 15;
            penaltyText += "• Шпаклёвка на кузове (-15 баллов)<br>";
        }

        score = Math.max(5, Math.min(100, score));
        let rankName = score >= 85 ? "🔥 Топ-1 Фестиваля / Король Стиля" : (score >= 60 ? "✨ Достойный Стенс-Проект" : "🛠️ Сток / Корч не для выставки");

        container.innerHTML = `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-sparkles"></i> Стенс-Сходка на парковке ТЦ</b>
                    <span class="tag-badge bg-tag-amber">${score} / 100 Очков Стиля</span>
                </div>
                <div class="sub-label mb-2" style="font-size:10px;">Проект: <b>${car.name}</b> (${rankName})</div>

                <div class="stance-stage-podium mb-2" id="stancePodiumBox">
                    <div class="stance-camera-flashes" id="cameraFlashOverlay"></div>
                    <div class="stance-car-chassis" id="stanceCarChassis">
                        <img src="${car.img || 'assets/cars/economy/vaz-2107.jpg'}" class="stance-car-model-img" onerror="this.src='assets/cars/economy/vaz-2107.jpg';">
                    </div>
                    <div class="stance-air-hiss-text" id="airHissSoundText">💨 ПШ-Ш-Ш...</div>
                </div>

                <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                    <div class="text-xs mb-1 font-bold">Оценка судейского жюри:</div>
                    <div class="flex-between text-xs mb-1">
                        <span>Пневма / Винты (Дроп):</span>
                        <b class="${t.stance ? 'color-green' : 'color-red'}">${t.stance ? '+35 баллов ✓' : '0 (Джип)'}</b>
                    </div>
                    <div class="flex-between text-xs mb-1">
                        <span>Кованые диски:</span>
                        <b class="${t.customWheels ? 'color-green' : 'color-red'}">${t.customWheels ? '+25 баллов ✓' : '0 (Штампы)'}</b>
                    </div>
                    <div class="flex-between text-xs mb-1">
                        <span>Обвес и расширение:</span>
                        <b class="${t.bodykit ? 'color-green' : 'color-red'}">${t.bodykit ? '+15 баллов ✓' : '0 (Сток)'}</b>
                    </div>
                    <div class="flex-between text-xs">
                        <span>Полировка кузова:</span>
                        <b class="${car.isPolished ? 'color-green' : 'color-amber'}">${car.isPolished ? '+12 баллов ✓' : '0'}</b>
                    </div>
                    ${penaltyText ? `<div class="sub-label color-red mt-1" style="font-size:9px;">Штрафы жюри:<br>${penaltyText}</div>` : ''}
                </div>

                <button onclick="PhoneRacing.enterStanceContest(${score})" class="btn btn-amber btn-sm w-full" id="btnEnterStance">
                    🏆 Заехать на подиум и стравить пневму (Взнос 25k ₽)
                </button>
            </div>
            <div id="stanceContestResult"></div>
        `;
    },

    enterStanceContest(score) {
        let cost = 25000;
        let cash = state.player?.cash || 0;
        if (cash < cost) return showToast("Не хватает денег на взнос участника фестиваля!");

        state.player.cash -= cost;
        playSound('tick');
        tgHaptic('light');

        const btn = document.getElementById('btnEnterStance');
        const chassis = document.getElementById('stanceCarChassis');
        const hissText = document.getElementById('airHissSoundText');
        const flashes = document.getElementById('cameraFlashOverlay');
        const resBox = document.getElementById('stanceContestResult');

        if (btn) btn.disabled = true;

        if (chassis) chassis.classList.add('entering-podium');

        setTimeout(() => {
            if (chassis) chassis.classList.add('slammed-drop');
            if (hissText) hissText.classList.add('show-hiss');
            playSound('tick');
            tgHaptic('medium');
        }, 1800);

        setTimeout(() => {
            if (flashes) flashes.classList.add('flashing-active');
            playSound('win');
        }, 3400);

        setTimeout(() => {
            if (score >= 70) {
                let prize = Math.round(cost * (score / 32));
                state.player.cash += prize;
                state.player.streetCred = (state.player.streetCred || 100) + 40;
                playSound('win');
                tgHaptic('success');

                if (resBox) {
                    resBox.innerHTML = `
                        <div class="glass-card p-2 text-center" style="border-color:var(--amber);">
                            <div class="font-bold text-xs color-amber mb-1">🥇 ПОБЕДИТЕЛЬ НОМИНАЦИИ «BEST FITMENT»!</div>
                            <div class="sub-label mb-2" style="font-size:10px;">Кубок ваш! Судьи в восторге от посадки дисков в арки.<br>Награда: <b class="color-green">+${prize.toLocaleString()} ₽</b> (+40 Респекта)</div>
                            <button onclick="PhoneRacing.renderStreetSubScreen()" class="btn btn-amber btn-sm w-full">Забрать кубок 🏆</button>
                        </div>
                    `;
                }
            } else {
                playSound('error');
                if (resBox) {
                    resBox.innerHTML = `
                        <div class="glass-card p-2 text-center" style="border-color:var(--red);">
                            <div class="font-bold text-xs color-red mb-1">🥉 ВНЕ ПРИЗОВОЙ ТРОЙКИ (${score} баллов)</div>
                            <div class="sub-label mb-2" style="font-size:10px;">Проект выглядит сырым: не хватает занижения пневмы или арки пустые!</div>
                            <button onclick="PhoneRacing.renderStreetSubScreen()" class="btn btn-dark btn-sm w-full">Понятно</button>
                        </div>
                    `;
                }
            }

            saveState();
            updateHeaderUI();
        }, 5500);
    },

    // ----------------------------------------------------
    // 4. ШАШКИ В ПОТОКЕ ПО МКАД
    // ----------------------------------------------------
    renderSprintDiscipline(container) {
        let carIdx = getActiveStreetCarIndex();
        const car = state.garage ? state.garage[carIdx] : null;
        let power = car?.power || 100;
        let maxSpeed = Math.round(Math.min(320, 120 + Math.sqrt(power) * 8.5));

        container.innerHTML = `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-red"><i class="fa-solid fa-car-burst"></i> Шашки в потоке по МКАД</b>
                    <span class="tag-badge bg-tag-red">Макс: ${maxSpeed} км/ч</span>
                </div>
                <p class="sub-label mb-2" style="font-size:10px;">Агрессивный прострел в ночном трафике. Чем мощнее двигатель, тем выше шанс оторваться от потока и сорвать банк!</p>

                <div class="grid-2 mb-2">
                    <button onclick="PhoneRacing.startCitySprint('normal', ${maxSpeed})" class="btn btn-dark btn-sm">Поток 140 км/ч (Ставка 50k)</button>
                    <button onclick="PhoneRacing.startCitySprint('insane', ${maxSpeed})" class="btn btn-danger btn-sm" ${maxSpeed < 200 ? 'disabled' : ''}>
                        Прострел 220+ км/ч ${maxSpeed < 200 ? '(Нужно 180+ л.с.)' : '(Ставка 200k)'}
                    </button>
                </div>
            </div>
            <div id="sprintRunResultArea"></div>
        `;
    },

    startCitySprint(mode, maxSpeed) {
        let bet = mode === 'insane' ? 200000 : 50000;
        let cash = state.player?.cash || 0;
        if (cash < bet) return showToast("Не хватает денег на заезд!");

        state.player.cash -= bet;
        state.player.consecutiveRaces = (state.player.consecutiveRaces || 0) + 2;

        playSound('tick');
        tgHaptic('medium');

        const resBox = document.getElementById('sprintRunResultArea');
        if (!resBox) return;

        resBox.innerHTML = `
            <div class="interactive-arena-card mb-2 text-center p-3">
                <div style="font-size:26px;">🏎️ 💨 🚙 🚛</div>
                <div class="font-bold text-xs color-red my-1" id="sprintLiveSpeedTxt">ПЕРЕСТРОЕНИЕ... СКОРОСТЬ ${Math.round(maxSpeed * 0.5)} КМ/Ч</div>
                <div class="sub-label" style="font-size:10px;">Обгон справа по обочине, зазор 15 см между фурами!</div>
            </div>
        `;

        let currentS = Math.round(maxSpeed * 0.5);
        let speedTimer = setInterval(() => {
            currentS = Math.min(maxSpeed, currentS + 20);
            const txt = document.getElementById('sprintLiveSpeedTxt');
            if (txt) txt.innerText = `ПЕРЕСТРОЕНИЕ... СКОРОСТЬ ${currentS} КМ/Ч`;
        }, 400);

        setTimeout(() => {
            clearInterval(speedTimer);
            let immunity = state.player?.policeImmunityDays || 0;
            let policeRaidChance = immunity > 0 ? 0 : (mode === 'insane' ? 0.35 : 0.18);

            if (Math.random() < policeRaidChance) {
                // Штраф увеличен до х2
                let fine = Math.round(bet * 2.0);
                state.player.cash = Math.max(0, state.player.cash - fine);
                playSound('error');
                tgHaptic('error');

                resBox.innerHTML = `
                    <div class="glass-card p-2 text-center" style="border-color:var(--red);">
                        <div class="font-bold text-xs color-red mb-1">🚨 ПЕРЕХВАТ СПЕЦРОТЫ ДПС!</div>
                        <div class="sub-label mb-2" style="font-size:10px;">Спецбатальон с люстрами заблокировал съезд.<br>Штраф за опасное вождение: -${fine.toLocaleString()} ₽!</div>
                        <button onclick="PhoneRacing.renderStreetSubScreen()" class="btn btn-danger btn-sm w-full">Оплатить штраф</button>
                    </div>
                `;
            } else {
                let win = Math.round(bet * (mode === 'insane' ? 2.5 : 2.0));
                state.player.cash += win;
                state.player.streetCred = (state.player.streetCred || 100) + (mode === 'insane' ? 55 : 25);
                playSound('win');
                tgHaptic('success');

                resBox.innerHTML = `
                    <div class="glass-card p-2 text-center" style="border-color:var(--green);">
                        <div class="font-bold text-xs color-green mb-1">⚡ ЧИСТЫЙ ПРОСТРЕЛ БЕЗ КАМЕР!</div>
                        <div class="sub-label mb-2" style="font-size:10px;">Вы оторвались от преследователей на скорости ${maxSpeed} км/ч!<br>Выигрыш: <b class="color-green">+${win.toLocaleString()} ₽</b> (+${mode === 'insane' ? 55 : 25} Респекта)</div>
                        <button onclick="PhoneRacing.renderStreetSubScreen()" class="btn btn-green btn-sm w-full">Забрать кэш</button>
                    </div>
                `;
            }

            saveState();
            updateHeaderUI();
        }, 4500);
    }
};

window.PhoneRacing = PhoneRacing;

// ========================================================
// ОБНОВЛЕННЫЕ ДАННЫЕ УЛИЧНЫХ МЕРОПРИЯТИЙ
// ========================================================
const STREET_EVENTS_DATA = [
    {
        id: "ev_drift_meet",
        name: "Ночная дрифт-сходка у ТЦ",
        type: "drift",
        classBadge: "Дрифт",
        req: "Заварка редуктора + Выворот",
        reward: "60,000 ₽ + 25 Кармы",
        rewardCash: 60000, // Снижено с 75к
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
        rewardCash: 120000, // Снижено с 150к
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
        rewardCash: 250000, // Снижено с 300к
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

    car.engineTemp = (car.engineTemp || 90) + 15;
    car.tireWear = Math.max(0, (car.tireWear !== undefined ? car.tireWear : 100) - 15);

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
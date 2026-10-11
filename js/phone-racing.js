// ========================================================
// js/phone-racing.js — STREET UNDERGROUND В PEREKUP OS (v0.4.6)
// Разработчики: Tak Toje, Max, Sergo, gemini
// Дрифт (Matsuri, RDS Europe, RDS GP), Драг 402м с ланчем,
// Стенс-выставка на парковке ТЦ, шашки на МКАД и авторитет
// ========================================================

const PhoneRacing = {
    streetSubTab: 'drift',

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
            europeReady: hasDiff && hasAngle && hasHydro && power >= 220 && !isOverheated && !isTiresDead,
            europeReason: isOverheated ? "Перегрев мотора!" : (isTiresDead ? "Требуется замена резины на СТО!" : (power < 220 ? `Нехватка мощности: ${power}/220 л.с.` : (!hasHydro ? "Нужен гидроручник" : "Готов"))),
            gpReady: hasDiff && hasAngle && hasHydro && hasCage && hasSeats && power >= 450 && !isOverheated && !isTiresDead,
            gpReason: isOverheated ? "Остудите болид!" : (isTiresDead ? "Слики взорвутся на разгоне!" : (power < 450 ? `Слабый мотор: ${power}/450 л.с.` : (!hasCage ? "Нужен вварной каркас" : (!hasSeats ? "Нужны ковши" : "Готов"))))
        };
    },

    // ----------------------------------------------------
    // 1. ДРИФТ
    // ----------------------------------------------------
    renderDriftDiscipline(container) {
        if (!state.garage || state.garage.length === 0) {
            container.innerHTML = `<div class="glass-card text-center sub-label py-6">В гараже нет машин! Приобретите автомобиль на рынке.</div>`;
            return;
        }

        let carIdx = state.player.selectedStreetCarIndex || 0;
        if (carIdx >= state.garage.length) carIdx = 0;
        const car = state.garage[carIdx];
        const spec = this.getDriftSpecInfo(car);

        let selectorOptions = state.garage.map((c, i) => `<option value="${i}" ${i === carIdx ? 'selected' : ''}>${c.name} (${c.power || 100} л.с.)</option>`).join('');

        let tiresPct = car.tireWear !== undefined ? car.tireWear : 100;
        let tempVal = car.engineTemp || 90;

        container.innerHTML = `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <span class="text-xs sub-label">Боевой кузов:</span>
                    <select onchange="PhoneRacing.selectStreetCar(this.value)" style="background:#090e18; color:#fff; border:1px solid var(--border-glass); border-radius:6px; padding:3px 8px; font-size:11px; outline:none;">
                        ${selectorOptions}
                    </select>
                </div>
                <div class="flex-between text-xs mt-1">
                    <span>Температура: <b class="${tempVal > 105 ? 'color-red' : 'color-green'}">${tempVal}°C</b></span>
                    <span>Остаток шин: <b class="${tiresPct < 30 ? 'color-red' : 'color-green'}">${tiresPct}%</b></span>
                </div>
                <div class="grid-2 mt-2">
                    <button onclick="PhoneRacing.serviceTiresAndCooling(${carIdx})" class="btn btn-dark btn-sm">🛞 Новая резина & Остудить (15k)</button>
                    <button onclick="PhoneRacing.coolDownEngine(${carIdx})" class="btn btn-cyan btn-sm">❄️ Остудить мотор (Бесплатно)</button>
                </div>
            </div>

            <div class="space-y-2">
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
                    <button onclick="PhoneRacing.runDriftChallenge('matsuri', 15000)" class="btn btn-cyan btn-sm w-full" ${!spec.matsuriReady ? 'disabled' : ''}>
                        Выехать на спот (Взнос 15k ₽)
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
                        Регламент: Мин. 220 л.с., гидроручник, заварка, выворот.<br>
                        ${!spec.europeReady ? `<b class="color-red">${spec.europeReason}</b>` : `<span class="color-green">Техком пройден!</span>`}
                    </div>
                    <button onclick="PhoneRacing.runDriftChallenge('europe', 60000)" class="btn btn-amber btn-sm w-full" ${!spec.europeReady ? 'disabled' : ''}>
                        Квалификация RDS Europe (Взнос 60k ₽)
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
                        Регламент: Мин. 450 л.с., вварной каркас, ковши, гидроручник.<br>
                        ${!spec.gpReady ? `<b class="color-red">${spec.gpReason}</b>` : `<span class="color-green">Болид готов к ТОП-32!</span>`}
                    </div>
                    <button onclick="PhoneRacing.runDriftChallenge('gp', 200000)" class="btn btn-red btn-sm w-full" ${!spec.gpReady ? 'disabled' : ''}>
                        ТОП-32 RDS GP (Взнос 200k ₽)
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

    selectStreetCar(index) {
        state.player.selectedStreetCarIndex = parseInt(index);
        saveState();
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
        car.tireWear = Math.max(0, (car.tireWear !== undefined ? car.tireWear : 100) - Math.floor(18 + Math.random() * 12));
        if (car.wear) {
            car.wear.transmission = Math.max(10, (car.wear.transmission || 85) - 3);
        }

        playSound('tick');
        tgHaptic('medium');

        const resultsArea = document.getElementById('driftRunResultsArea');
        if (!resultsArea) return;

        resultsArea.innerHTML = `
            <div class="glass-card text-center p-3">
                <div style="font-size:24px;">💨 🔥 🏎️</div>
                <div class="font-bold text-xs color-amber my-1">РАЗГОН... ИНИЦИАЦИЯ ЗАНОСА...</div>
            </div>
        `;

        setTimeout(() => {
            let power = car.power || 100;
            let t = car.tuning || {};

            let score = 0;
            let comment = "";

            if (league === 'matsuri') {
                score = Math.floor(65 + Math.random() * 25);
                if (t.hydroHandbrake) score += 8;
                if (power > 120) score += 5;
                score = Math.min(100, score);
                comment = score >= 80 ? "Чистый проезд по снежной дуге, публика в восторге!" : "Небольшая коррекция рулём, но траектория удержана.";
            } else if (league === 'europe') {
                let powerRatio = power / 300;
                score = Math.floor(55 * powerRatio + Math.random() * 30);
                if (t.hydroHandbrake) score += 10;
                if (t.dragSlicks) score += 5;
                score = Math.min(100, score);
                comment = score >= 85 ? "Шикарная перекладка без распрямлений, зачёт на 85+ баллов!" : "Не хватило угла во второй дуге, потеря темпа.";
            } else if (league === 'gp') {
                let powerRatio = power / 550;
                score = Math.floor(60 * powerRatio + Math.random() * 30);
                if (t.rollCage) score += 5;
                if (t.dragSlicks) score += 10;
                score = Math.min(100, score);
                comment = score >= 90 ? "Дым стеной, глубочайший бэквард и постановка впритирку со стеной!" : "Слабая скорость в базе дуги, судьи сняли баллы за клиппинг.";
            }

            let isWin = score >= 75;
            let reward = Math.round(cost * (league === 'gp' ? 2.5 : (league === 'europe' ? 2.3 : 2.0)));
            let repBonus = league === 'gp' ? 70 : (league === 'europe' ? 35 : 15);

            if (typeof trackQuestProgress === 'function') {
                trackQuestProgress('drift_run', 1);
            }

            if (isWin) {
                state.player.cash += reward;
                state.player.streetCred = (state.player.streetCred || 100) + repBonus;
                playSound('win');
                tgHaptic('success');

                resultsArea.innerHTML = `
                    <div class="glass-card p-2 text-center" style="border-color:var(--green);">
                        <div class="font-bold text-xs color-green mb-1">🏁 ЗАЕЗД ЗАВЕРШЁН: ${score} ИЗ 100 БАЛЛОВ!</div>
                        <div class="sub-label mb-2" style="font-size:10px;">${comment}<br>Выигрыш: <b class="color-green">+${reward.toLocaleString()} ₽</b> (+${repBonus} Респекта)</div>
                        <button onclick="PhoneRacing.renderStreetSubScreen()" class="btn btn-green btn-sm w-full">Отлично!</button>
                    </div>
                `;
            } else {
                state.player.streetCred = Math.max(10, (state.player.streetCred || 100) - 10);
                playSound('error');
                tgHaptic('error');

                resultsArea.innerHTML = `
                    <div class="glass-card p-2 text-center" style="border-color:var(--red);">
                        <div class="font-bold text-xs color-red mb-1">💥 НЕ КВАЛИФИЦИРОВАН: ${score} БАЛЛОВ</div>
                        <div class="sub-label mb-2" style="font-size:10px;">${comment}<br>Потерян стартовый взнос: -${cost.toLocaleString()} ₽</div>
                        <button onclick="PhoneRacing.renderStreetSubScreen()" class="btn btn-dark btn-sm w-full">Попробовать снова</button>
                    </div>
                `;
            }

            saveState();
            updateHeaderUI();
        }, 1600);
    },

    // ----------------------------------------------------
    // 2. ДРАГ 402М
    // ----------------------------------------------------
    renderDragDiscipline(container) {
        if (!state.garage || state.garage.length === 0) {
            container.innerHTML = `<div class="glass-card text-center sub-label py-6">В гараже нет машин!</div>`;
            return;
        }

        let carIdx = state.player.selectedStreetCarIndex || 0;
        if (carIdx >= state.garage.length) carIdx = 0;
        const car = state.garage[carIdx];
        let myPower = car.power || 100;

        let selectorOptions = state.garage.map((c, i) => `<option value="${i}" ${i === carIdx ? 'selected' : ''}>${c.name} (${c.power || 100} л.с.)</option>`).join('');

        container.innerHTML = `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <span class="text-xs sub-label">Болид на прямой:</span>
                    <select onchange="PhoneRacing.selectStreetCar(this.value)" style="background:#090e18; color:#fff; border:1px solid var(--border-glass); border-radius:6px; padding:3px 8px; font-size:11px; outline:none;">
                        ${selectorOptions}
                    </select>
                </div>
                <div class="flex-between text-xs mt-1">
                    <span>Мощность: <b class="color-red">${myPower} л.с.</b></span>
                    <span>Слики: <b>${car.tuning?.dragSlicks ? 'Установлены (-0.6с)' : 'Обычная резина'}</b></span>
                </div>
            </div>

            <div class="race-panel mb-2 p-2">
                <div class="flex-between mb-1">
                    <div class="race-status" id="raceStatusText" style="font-size:11px; margin-bottom:0;">Держите газ в зелёной зоне (5500-6500 RPM)!</div>
                    <span class="tag-badge bg-tag-amber" id="raceHeatBadge">Внимание ДПС: ${state.player?.consecutiveRaces || 0}/12</span>
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

    // ----------------------------------------------------
    // 3. СТЕНС-СХОДКА
    // ----------------------------------------------------
    renderStanceDiscipline(container) {
        if (!state.garage || state.garage.length === 0) {
            container.innerHTML = `<div class="glass-card text-center sub-label py-6">В гараже нет машин для выставки!</div>`;
            return;
        }

        let carIdx = state.player.selectedStreetCarIndex || 0;
        if (carIdx >= state.garage.length) carIdx = 0;
        const car = state.garage[carIdx];
        const t = car.tuning || {};

        let score = 15;
        let penaltyText = "";

        if (t.stance) score += 35;
        if (t.customWheels) score += 25;
        if (t.bodykit) score += 15;
        if (car.isPolished) score += 10;

        let cond = car.condition || 100;
        if (cond < 60) {
            score -= 25;
            penaltyText += "• Вмятины и сколы на кузове (-25 баллов)<br>";
        }
        if (car.bodyThickness?.doors > 250 || car.bodyThickness?.wings > 250) {
            score -= 15;
            penaltyText += "• Шпаклёвка видна невооружённым глазом (-15 баллов)<br>";
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
                        <b class="${car.isPolished ? 'color-green' : 'color-amber'}">${car.isPolished ? '+10 баллов ✓' : '0'}</b>
                    </div>
                    ${penaltyText ? `<div class="sub-label color-red mt-1" style="font-size:9px;">Штрафы жюри:<br>${penaltyText}</div>` : ''}
                </div>

                <button onclick="PhoneRacing.enterStanceContest(${score})" class="btn btn-amber btn-sm w-full">
                    🏆 Заехать на подиум участников (Взнос 15,000 ₽)
                </button>
            </div>
            <div id="stanceContestResult"></div>
        `;
    },

    enterStanceContest(score) {
        let cost = 15000;
        let cash = state.player?.cash || 0;
        if (cash < cost) return showToast("Не хватает денег на взнос участника фестиваля!");

        state.player.cash -= cost;
        playSound('tick');
        tgHaptic('light');

        const resBox = document.getElementById('stanceContestResult');
        if (!resBox) return;

        resBox.innerHTML = `
            <div class="glass-card text-center p-3">
                <div style="font-size:24px;">📸 🎙️ ✨</div>
                <div class="font-bold text-xs color-cyan my-1">ЗАМЕР КЛИРЕНСА И ОЦЕНКА ФИТМЕНТА...</div>
            </div>
        `;

        setTimeout(() => {
            if (score >= 75) {
                let prize = Math.round(cost * (score / 35));
                state.player.cash += prize;
                state.player.streetCred = (state.player.streetCred || 100) + 35;
                playSound('win');
                tgHaptic('success');

                resBox.innerHTML = `
                    <div class="glass-card p-2 text-center" style="border-color:var(--amber);">
                        <div class="font-bold text-xs color-amber mb-1">🥇 ПОБЕДИТЕЛЬ НОМИНАЦИИ «BEST FITMENT»!</div>
                        <div class="sub-label mb-2" style="font-size:10px;">Кубок ваш! Судьи в восторге от посадки дисков в арки.<br>Награда: <b class="color-green">+${prize.toLocaleString()} ₽</b> (+35 Респекта)</div>
                        <button onclick="PhoneRacing.renderStreetSubScreen()" class="btn btn-amber btn-sm w-full">Забрать кубок 🏆</button>
                    </div>
                `;
            } else {
                playSound('error');
                resBox.innerHTML = `
                    <div class="glass-card p-2 text-center" style="border-color:var(--red);">
                        <div class="font-bold text-xs color-red mb-1">🥉 ВНЕ ПРИЗОВОЙ ТРОЙКИ (${score} баллов)</div>
                        <div class="sub-label mb-2" style="font-size:10px;">Проект выглядит сырым: не хватает занижения или кузов требует покраски!</div>
                        <button onclick="PhoneRacing.renderStreetSubScreen()" class="btn btn-dark btn-sm w-full">Понятно</button>
                    </div>
                `;
            }

            saveState();
            updateHeaderUI();
        }, 1500);
    },

    // ----------------------------------------------------
    // 4. ШАШКИ В ПОТОКЕ ПО МКАД
    // ----------------------------------------------------
    renderSprintDiscipline(container) {
        let carIdx = state.player.selectedStreetCarIndex || 0;
        const car = state.garage ? state.garage[carIdx] : null;
        let power = car?.power || 100;
        let maxSpeed = Math.round(Math.min(320, 120 + Math.sqrt(power) * 8.5));

        container.innerHTML = `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-red"><i class="fa-solid fa-car-burst"></i> Шашки в потоке по МКАД</b>
                    <span class="tag-badge bg-tag-red">Макс: ${maxSpeed} км/ч</span>
                </div>
                <p class="sub-label mb-2" style="font-size:10px;">Агрессивный прострел в ночном трафике. Чем мощнее двигатель, тем выше шанс оторваться от потока и заработать куш!</p>

                <div class="grid-2 mb-2">
                    <button onclick="PhoneRacing.startCitySprint('normal', ${maxSpeed})" class="btn btn-dark btn-sm">Поток 140 км/ч (Ставка 40k)</button>
                    <button onclick="PhoneRacing.startCitySprint('insane', ${maxSpeed})" class="btn btn-danger btn-sm" ${maxSpeed < 200 ? 'disabled' : ''}>
                        Прострел 220+ км/ч ${maxSpeed < 200 ? '(Нужно 180+ л.с.)' : '(Ставка 150k)'}
                    </button>
                </div>
            </div>
            <div id="sprintRunResultArea"></div>
        `;
    },

    startCitySprint(mode, maxSpeed) {
        let bet = mode === 'insane' ? 150000 : 40000;
        let cash = state.player?.cash || 0;
        if (cash < bet) return showToast("Не хватает денег на заезд!");

        state.player.cash -= bet;
        state.player.consecutiveRaces = (state.player.consecutiveRaces || 0) + 2;

        playSound('tick');
        tgHaptic('medium');

        const resBox = document.getElementById('sprintRunResultArea');
        if (!resBox) return;

        resBox.innerHTML = `
            <div class="glass-card text-center p-3">
                <div style="font-size:24px;">🏎️ 💨 🚨</div>
                <div class="font-bold text-xs color-red my-1">ОБГОН СПРАВА! СКОРОСТЬ ${maxSpeed} КМ/Ч...</div>
            </div>
        `;

        setTimeout(() => {
            let immunity = state.player?.policeImmunityDays || 0;
            let policeRaidChance = immunity > 0 ? 0 : (mode === 'insane' ? 0.35 : 0.18);

            if (Math.random() < policeRaidChance) {
                let fine = Math.round(bet * 1.5);
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
                let win = Math.round(bet * (mode === 'insane' ? 2.6 : 2.1));
                state.player.cash += win;
                state.player.streetCred = (state.player.streetCred || 100) + (mode === 'insane' ? 50 : 20);
                playSound('win');
                tgHaptic('success');

                resBox.innerHTML = `
                    <div class="glass-card p-2 text-center" style="border-color:var(--green);">
                        <div class="font-bold text-xs color-green mb-1">⚡ ЧИСТЫЙ ПРОСТРЕЛ БЕЗ КАМЕР!</div>
                        <div class="sub-label mb-2" style="font-size:10px;">Вы оторвались от преследователей на скорости ${maxSpeed} км/ч!<br>Выигрыш: <b class="color-green">+${win.toLocaleString()} ₽</b> (+${mode === 'insane' ? 50 : 20} Респекта)</div>
                        <button onclick="PhoneRacing.renderStreetSubScreen()" class="btn btn-green btn-sm w-full">Забрать кэш</button>
                    </div>
                `;
            }

            saveState();
            updateHeaderUI();
        }, 1700);
    }
};

window.PhoneRacing = PhoneRacing;
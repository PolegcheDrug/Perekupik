// ========================================================
// js/phone-media.js — МЕДИА, РАДИО, НАПЁРСТКИ И СУПЕРВИЛСПИН (v0.7.6)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Уличные азартные «Напёрстки» с живым перемешиванием вместо Колеса,
// полноформатный Супервилспин (3 приза сразу) и магнитола с эквалайзером.
// ========================================================

const PhoneMedia = {
    // ----------------------------------------------------
    // 1. АВТО-МАГНИТОЛА И КАССЕТНЫЙ ПЛЕЕР
    // ----------------------------------------------------
    radioPlaying: false,
    activeStationIndex: 0,
    stations: [
        { name: "Perekup FM", genre: "Phonk / Drift", freq: "104.2 FM", icon: "fa-bolt" },
        { name: "Retro Wave Radio", genre: "Synthwave 80s", freq: "98.7 FM", icon: "fa-compact-disc" },
        { name: "Garage Deep Bass", genre: "House & Bass", freq: "101.5 FM", icon: "fa-headphones" },
        { name: "Дорожный Патруль", genre: "Авторадио / Новости", freq: "107.0 FM", icon: "fa-radio" }
    ],

    renderRadioApp(container) {
        if (!container) return;
        const cur = this.stations[this.activeStationIndex];
        const isPlay = this.radioPlaying;

        let stationsHtml = this.stations.map((st, i) => `
            <div onclick="PhoneMedia.selectRadioStation(${i})" class="glass-card p-2 flex-between mb-1 station-row ${i === this.activeStationIndex ? 'active-station' : ''}" style="cursor:pointer;">
                <div class="flex-gap" style="align-items:center;">
                    <i class="fa-solid ${st.icon} ${i === this.activeStationIndex ? 'color-cyan' : 'sub-label'}"></i>
                    <div>
                        <b class="text-xs ${i === this.activeStationIndex ? 'color-cyan' : ''}">${st.name}</b>
                        <div class="sub-label" style="font-size:9px;">${st.genre}</div>
                    </div>
                </div>
                <span class="tag-badge ${i === this.activeStationIndex ? 'bg-tag-cyan' : 'bg-tag-dark'}">${st.freq}</span>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-purple"><i class="fa-solid fa-radio mr-1"></i> Магнитола</div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body">
                <div class="glass-card p-3 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(192, 132, 252, 0.18), #090e18); border-color: var(--purple);">
                    <div class="radio-cassette-glow mb-2">
                        <span class="radio-brand-badge">PIONEER CYBER-100</span>
                        <div class="radio-equalizer-bars ${isPlay ? 'playing' : ''}">
                            <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                        </div>
                    </div>

                    <div class="text-center my-2">
                        <div class="sub-label" style="font-size:10px;">ВОСПРОИЗВЕДЕНИЕ:</div>
                        <h3 class="font-bold text-xs color-cyan" style="font-size:16px;">${cur.name}</h3>
                        <div class="sub-label color-amber font-bold" style="font-size:11px;">${cur.freq} • ${cur.genre}</div>
                    </div>

                    <div class="flex-between mt-3 pt-2" style="border-top:1px dashed rgba(255,255,255,0.08);">
                        <button onclick="PhoneMedia.prevStation()" class="btn btn-dark btn-sm btn-auto"><i class="fa-solid fa-backward-step"></i></button>
                        <button onclick="PhoneMedia.toggleRadioPlay()" class="btn ${isPlay ? 'btn-red' : 'btn-purple'} btn-sm" style="max-width:140px;">
                            <i class="fa-solid ${isPlay ? 'fa-pause' : 'fa-play'}"></i> ${isPlay ? 'Пауза' : 'В эфир'}
                        </button>
                        <button onclick="PhoneMedia.nextStation()" class="btn btn-dark btn-sm btn-auto"><i class="fa-solid fa-forward-step"></i></button>
                    </div>
                </div>

                <div class="sub-label mb-1" style="font-size:10px;">Доступные радиостанции:</div>
                <div class="space-y-1">
                    ${stationsHtml}
                </div>
            </div>
        `;
    },

    toggleRadioPlay() {
        this.radioPlaying = !this.radioPlaying;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('medium');
        showToast(this.radioPlaying ? "Радио запущено в фоновом режиме 📻" : "Радио приостановлено.");
        this.renderRadioApp(document.getElementById('phoneAppContainer'));
    },

    selectRadioStation(idx) {
        this.activeStationIndex = idx;
        this.radioPlaying = true;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.renderRadioApp(document.getElementById('phoneAppContainer'));
    },

    prevStation() {
        this.activeStationIndex = (this.activeStationIndex - 1 + this.stations.length) % this.stations.length;
        this.radioPlaying = true;
        if (typeof playSound === 'function') playSound('tick');
        this.renderRadioApp(document.getElementById('phoneAppContainer'));
    },

    nextStation() {
        this.activeStationIndex = (this.activeStationIndex + 1) % this.stations.length;
        this.radioPlaying = true;
        if (typeof playSound === 'function') playSound('tick');
        this.renderRadioApp(document.getElementById('phoneAppContainer'));
    },

    // ----------------------------------------------------
    // 2. КЛУБ ФОРТУНЫ: СУПЕРВИЛСПИН И НАПЁРСТКИ
    // ----------------------------------------------------
    activeFortuneTab: 'superspin', // 'superspin' | 'thimbles'
    isSuperSpinning: false,

    // Текущие слоты 3 барабанов Супервилспина
    reelDisplay: {
        reel1: { emoji: "🚗", name: "Автопарк", desc: "Слот 1" },
        reel2: { emoji: "💰", name: "Деньги", desc: "Слот 2" },
        reel3: { emoji: "🎁", name: "Эксклюзив", desc: "Слот 3" }
    },

    // Состояние игры «Напёрстки»
    thimblesState: {
        phase: 'bet', // 'bet' | 'showing' | 'shuffling' | 'guess' | 'revealed'
        winningIndex: 1, // 0, 1, 2
        selectedIndex: null,
        currentBet: 50000,
        isFreeGame: false,
        shuffleStep: 0,
        shuffleTimer: null,
        message: "«Кручу-верчу, запутать хочу! Ставь кэш и следи за шариком!»"
    },

    renderFortuneApp(container) {
        if (!container) return;
        const sub = this.activeFortuneTab;
        const tickets = state.player?.superSpinTickets || 0;
        const curDay = state.player?.day || 1;
        const lastFreeDay = state.player?.lastFreeSuperSpinDay || 0;
        const canFreeSuperSpin = lastFreeDay < curDay;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-amber"><i class="fa-solid fa-clover mr-1"></i> Клуб Фортуны</div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body">
                <div class="grid-2 mb-2">
                    <button onclick="PhoneMedia.switchFortuneTab('superspin')" class="btn ${sub === 'superspin' ? 'btn-amber' : 'btn-dark'} btn-sm">
                        <i class="fa-solid fa-dice"></i> СуперВилспин 🎰
                    </button>
                    <button onclick="PhoneMedia.switchFortuneTab('thimbles')" class="btn ${sub === 'thimbles' ? 'btn-cyan' : 'btn-dark'} btn-sm">
                        <i class="fa-solid fa-hat-wizard"></i> Напёрстки 🥤
                    </button>
                </div>

                <div id="fortuneTabContentBox"></div>
            </div>
        `;

        if (sub === 'superspin') {
            this.renderSuperSpinContent(document.getElementById('fortuneTabContentBox'), tickets, canFreeSuperSpin);
        } else {
            this.renderThimblesContent(document.getElementById('fortuneTabContentBox'));
        }
    },

    switchFortuneTab(tab) {
        if (this.isSuperSpinning || this.thimblesState.phase === 'shuffling') return;
        this.activeFortuneTab = tab;
        if (typeof playSound === 'function') playSound('tick');
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 2.1. РЕНДЕР СУПЕРВИЛСПИНА (3 ПРИЗА СРАЗУ)
    // ========================================================
    renderSuperSpinContent(box, tickets, canFreeSuperSpin) {
        if (!box) return;

        let spinBtnText = "";
        let spinBtnClass = "btn btn-amber w-full";
        let isBtnDisabled = false;

        if (this.isSuperSpinning) {
            spinBtnText = "КРУТИМ БАРАБАНЫ... 🎰";
            spinBtnClass = "btn btn-dark w-full opacity-50";
            isBtnDisabled = true;
        } else if (canFreeSuperSpin) {
            spinBtnText = "БЕСПЛАТНЫЙ СУПЕРСПИН (1 РАЗ В СУТКИ) ★";
            spinBtnClass = "btn btn-green w-full";
        } else if (tickets > 0) {
            spinBtnText = `КРУТИТЬ (Осталось билетов: ${tickets} 🎟️)`;
            spinBtnClass = "btn btn-amber w-full";
        } else {
            spinBtnText = "КУПИТЬ БИЛЕТ (150,000 ₽ или 10 ⭐)";
            spinBtnClass = "btn btn-purple w-full";
        }

        box.innerHTML = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(255, 215, 0, 0.18), #090e18); border-color: #ffd700;">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-crown"></i> SUPER WHEELSPIN</b>
                    <span class="tag-badge bg-tag-amber">ВЫДАЁТ 3 ПРИЗА СРАЗУ</span>
                </div>
                <div class="sub-label" style="font-size:9.5px;">
                    Каждое вращение активирует <b>все 3 слота одновременно</b>. Вы гарантированно забираете по одной награде из каждого барабана!
                </div>
            </div>

            <!-- БЛОК 3 БАРАБАНОВ -->
            <div class="grid-3 mb-2" style="gap:6px;">
                <div class="fortune-reel-card ${this.isSuperSpinning ? 'reel-spinning-anim' : ''}" id="fortuneReelCard1">
                    <span class="sub-label" style="font-size:8px; text-transform:uppercase;">БАРАБАН 1: ТЕХНИКА</span>
                    <div class="my-1" style="font-size:26px;" id="reelEmoji1">${this.reelDisplay.reel1.emoji}</div>
                    <b class="text-xs color-cyan text-center block" style="font-size:9.5px;" id="reelName1">${this.reelDisplay.reel1.name}</b>
                </div>

                <div class="fortune-reel-card ${this.isSuperSpinning ? 'reel-spinning-anim' : ''}" id="fortuneReelCard2">
                    <span class="sub-label" style="font-size:8px; text-transform:uppercase;">БАРАБАН 2: ВАЛЮТА</span>
                    <div class="my-1" style="font-size:26px;" id="reelEmoji2">${this.reelDisplay.reel2.emoji}</div>
                    <b class="text-xs color-green text-center block" style="font-size:9.5px;" id="reelName2">${this.reelDisplay.reel2.name}</b>
                </div>

                <div class="fortune-reel-card ${this.isSuperSpinning ? 'reel-spinning-anim' : ''}" id="fortuneReelCard3">
                    <span class="sub-label" style="font-size:8px; text-transform:uppercase;">БАРАБАН 3: ЭКСКЛЮЗИВ</span>
                    <div class="my-1" style="font-size:26px;" id="reelEmoji3">${this.reelDisplay.reel3.emoji}</div>
                    <b class="text-xs color-purple text-center block" style="font-size:9.5px;" id="reelName3">${this.reelDisplay.reel3.name}</b>
                </div>
            </div>

            <button onclick="PhoneMedia.startTripleSuperSpin()" class="${spinBtnClass} mb-2" ${isBtnDisabled ? 'disabled' : ''}>
                ${spinBtnText}
            </button>

            <div class="glass-card p-2 flex-between">
                <div>
                    <b class="text-xs color-cyan">Запас билетов:</b>
                    <div class="sub-label" style="font-size:9px;">На балансе: <b>${tickets} шт</b></div>
                </div>
                <button onclick="PhoneMedia.buySuperSpinTicket()" class="btn btn-dark btn-sm btn-auto" ${this.isSuperSpinning ? 'disabled' : ''}>
                    +1 Билет (150k ₽)
                </button>
            </div>
        `;
    },

    buySuperSpinTicket() {
        let cash = state.player?.cash || 0;
        if (cash < 150000) return showToast("Нужно 150,000 ₽ на покупку билета!");

        state.player.cash -= 150000;
        state.player.superSpinTickets = (state.player.superSpinTickets || 0) + 1;

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Билет СуперВилспина куплен! (+1 🎟️)");
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));
    },

    startTripleSuperSpin() {
        if (this.isSuperSpinning) return;

        const curDay = state.player?.day || 1;
        const lastFreeDay = state.player?.lastFreeSuperSpinDay || 0;
        const canFree = lastFreeDay < curDay;
        let tickets = state.player?.superSpinTickets || 0;

        if (canFree) {
            state.player.lastFreeSuperSpinDay = curDay;
        } else if (tickets > 0) {
            state.player.superSpinTickets = tickets - 1;
        } else {
            let cash = state.player?.cash || 0;
            let stars = state.player?.stars || 0;

            if (cash >= 150000) {
                state.player.cash -= 150000;
            } else if (stars >= 10) {
                state.player.stars -= 10;
            } else {
                return showToast("Не хватает 150,000 ₽ или 10 Stars ⭐ для запуска!");
            }
        }

        saveState();
        updateHeaderUI();

        this.isSuperSpinning = true;
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));

        const tiers = (typeof SUPER_SPIN_TIERS !== 'undefined') ? SUPER_SPIN_TIERS : {
            reelCars: [{ type: "cash", name: "100k ₽", emoji: "💰", amount: 100000 }],
            reelResources: [{ type: "cash", label: "150k ₽", amount: 150000 }],
            reelExclusives: [{ type: "stars", label: "25 ⭐ Stars", amount: 25 }]
        };

        const pool1 = tiers.reelCars;
        const pool2 = tiers.reelResources;
        const pool3 = tiers.reelExclusives;

        const prize1 = pool1[Math.floor(Math.random() * pool1.length)];
        const prize2 = pool2[Math.floor(Math.random() * pool2.length)];
        const prize3 = pool3[Math.floor(Math.random() * pool3.length)];

        let spinCount = 0;
        const spinInterval = setInterval(() => {
            spinCount++;
            if (typeof playSound === 'function') playSound('tick');

            const r1 = pool1[Math.floor(Math.random() * pool1.length)];
            const r2 = pool2[Math.floor(Math.random() * pool2.length)];
            const r3 = pool3[Math.floor(Math.random() * pool3.length)];

            if (spinCount <= 12) {
                setTxt('reelEmoji1', r1.emoji || "🏎️");
                setTxt('reelName1', r1.name || "Авто");
            }
            if (spinCount <= 18) {
                setTxt('reelEmoji2', "💰");
                setTxt('reelName2', r2.label || "Валюта");
            }
            if (spinCount <= 24) {
                setTxt('reelEmoji3', r3.emoji || "⭐");
                setTxt('reelName3', r3.label || "Эксклюзив");
            }

            if (spinCount === 13) {
                setTxt('reelEmoji1', prize1.emoji || "🏎️");
                setTxt('reelName1', prize1.name || "Авто");
                const c1 = document.getElementById('fortuneReelCard1');
                if (c1) {
                    c1.classList.remove('reel-spinning-anim');
                    c1.style.borderColor = "var(--cyan)";
                    c1.style.boxShadow = "0 0 16px var(--cyan-glow)";
                }
                if (typeof tgHaptic === 'function') tgHaptic('medium');
            }

            if (spinCount === 19) {
                setTxt('reelEmoji2', "💰");
                setTxt('reelName2', prize2.label || "Валюта");
                const c2 = document.getElementById('fortuneReelCard2');
                if (c2) {
                    c2.classList.remove('reel-spinning-anim');
                    c2.style.borderColor = "var(--green)";
                    c2.style.boxShadow = "0 0 16px var(--green-glow)";
                }
                if (typeof tgHaptic === 'function') tgHaptic('medium');
            }

            if (spinCount >= 25) {
                clearInterval(spinInterval);
                setTxt('reelEmoji3', prize3.emoji || "⭐");
                setTxt('reelName3', prize3.label || "Эксклюзив");
                const c3 = document.getElementById('fortuneReelCard3');
                if (c3) {
                    c3.classList.remove('reel-spinning-anim');
                    c3.style.borderColor = "var(--purple)";
                    c3.style.boxShadow = "0 0 16px var(--purple-glow)";
                }

                this.isSuperSpinning = false;
                this.claimAllThreePrizes(prize1, prize2, prize3);
            }
        }, 110);
    },

    claimAllThreePrizes(p1, p2, p3) {
        let rewardTokens = [];

        // 1. Барабан 1: Техника / Приборы
        if (p1.type === 'car') {
            let maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
            let curSlots = state.garage ? state.garage.length : 0;
            let wonPlate = (typeof generateCoolPlate === 'function') ? generateCoolPlate() : "А777АА 77";

            let wonCar = {
                id: "spin_car_" + Date.now(),
                name: p1.name,
                type: p1.category || 'economy',
                power: p1.power || 100,
                basePrice: p1.basePrice || 150000,
                price: p1.basePrice || 150000,
                marketValue: Math.round((p1.basePrice || 150000) * 1.3),
                img: "assets/cars/economy/2101/vaz-2101.jpg",
                fallback: (typeof getCategoryFallback === 'function') ? getCategoryFallback(p1.category) : "assets/cars/economy/2101/vaz-2101.jpg",
                plate: wonPlate,
                customPlate: wonPlate,
                condition: 85,
                wear: { engine: 90, transmission: 90 },
                isRegisteredOnPlayer: false,
                ownershipDays: 0,
                engineTemp: 90,
                tireWear: 95,
                purchaseCost: 0,
                tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 }
            };

            if (curSlots < maxSlots) {
                if (!state.garage) state.garage = [];
                state.garage.push(wonCar);
                rewardTokens.push({
                    icon: "🏎️",
                    title: "Автомобиль в гараж",
                    value: wonCar.name,
                    desc: `Госномер ${wonPlate}`,
                    rarity: "token-cyan"
                });
            } else {
                let comp = Math.round(wonCar.marketValue * 0.85);
                state.player.cash = (state.player.cash || 0) + comp;
                rewardTokens.push({
                    icon: "💰",
                    title: "Компенсация за авто",
                    value: `+${comp.toLocaleString()} ₽`,
                    desc: `Гараж полон: выкуплен ${wonCar.name}`,
                    rarity: "token-green"
                });
            }
        } else if (p1.type === 'tool') {
            if (!state.player.tools) state.player.tools = {};
            if (!state.player.toolsWear) state.player.toolsWear = {};
            state.player.tools[p1.toolId] = true;
            state.player.toolsWear[p1.toolId] = 80;
            rewardTokens.push({
                icon: p1.emoji || "📱",
                title: "Диагностический прибор",
                value: p1.name,
                desc: "Зачислен в ваш инвентарь",
                rarity: "token-purple"
            });
        } else if (p1.type === 'free_impound') {
            state.player.freeImpoundPasses = (state.player.freeImpoundPasses || 0) + 1;
            rewardTokens.push({
                icon: "🚔",
                title: "Талон штрафстоянки",
                value: "+1 Талон ГИБДД",
                desc: "Бесплатный забор автомобиля",
                rarity: "token-purple"
            });
        } else if (p1.type === 'xp_bundle') {
            if (typeof addXp === 'function') addXp(p1.amount || 150);
            rewardTokens.push({
                icon: "🎖️",
                title: "Пакет опыта",
                value: `+${p1.amount || 150} XP`,
                desc: "Повышение уровня авторитета",
                rarity: "token-cyan"
            });
        }

        // 2. Барабан 2: Валюта и ресурсы
        if (p2.type === 'cash' || p2.type === 'jackpot') {
            state.player.cash = (state.player.cash || 0) + p2.amount;
            rewardTokens.push({
                icon: "💰",
                title: p2.type === 'jackpot' ? "ДЖЕКПОТ" : "Денежный приз",
                value: `+${p2.amount.toLocaleString()} ₽`,
                desc: "Зачислено на баланс игрока",
                rarity: "token-green"
            });
        } else if (p2.type === 'fuel') {
            state.player.fuel = Math.min(100, (state.player.fuel || 0) + p2.amount);
            rewardTokens.push({
                icon: "⛽",
                title: "Топливный бак",
                value: `+${p2.amount} Топлива`,
                desc: "Заправлено в бензобак",
                rarity: "token-cyan"
            });
        } else if (p2.type === 'tickets') {
            let maxT = state.player?.maxExpressTickets || 25;
            state.player.expressTickets = Math.min(maxT, (state.player.expressTickets || 0) + p2.amount);
            rewardTokens.push({
                icon: "🎟️",
                title: "Экспресс-пропуски",
                value: `+${p2.amount} Талонов`,
                desc: "Мгновенный поиск покупателей",
                rarity: "token-purple"
            });
        } else if (p2.type === 'conn') {
            state.player.connections = (state.player.connections || 0) + p2.amount;
            rewardTokens.push({
                icon: "🤝",
                title: "Теневые связи",
                value: `+${p2.amount} Связь ПодКлюч`,
                desc: "Услуги Решалы Артура",
                rarity: "token-purple"
            });
        } else if (p2.type === 'xp') {
            if (typeof addXp === 'function') addXp(p2.amount);
            rewardTokens.push({
                icon: "🎖️",
                title: "Опыт авторитета",
                value: `+${p2.amount} XP`,
                desc: "Ранг перекупа повышен",
                rarity: "token-cyan"
            });
        }

        // 3. Барабан 3: Эксклюзивы
        if (p3.type === 'stars') {
            state.player.stars = (state.player.stars || 0) + p3.amount;
            rewardTokens.push({
                icon: "⭐",
                title: "Премиальные Stars",
                value: `+${p3.amount} ⭐`,
                desc: "Звёзды перекупа",
                rarity: "token-amber"
            });
        } else if (p3.type === 'plate') {
            if (!state.ownedPlates) state.ownedPlates = [];
            state.ownedPlates.push(p3.plate);
            rewardTokens.push({
                icon: "🏷️",
                title: "Блатной госномер",
                value: p3.plate,
                desc: "Добавлен в ваш инвентарь",
                rarity: "token-purple"
            });
        } else if (p3.type === 'mod_cert') {
            state.player.cash = (state.player.cash || 0) + p3.cashValue;
            rewardTokens.push({
                icon: "🔧",
                title: "Сертификат на тюнинг",
                value: p3.label,
                desc: `Компенсировано +${p3.cashValue.toLocaleString()} ₽`,
                rarity: "token-green"
            });
        }

        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        openVerdictModal(
            "ТРОЙНОЙ КУШ СУПЕРВИЛСПИНА! 🎰",
            "Вы выиграли сразу 3 приза со всех барабанов:",
            true,
            null,
            null,
            rewardTokens
        );

        this.renderFortuneApp(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 2.2. УЛИЧНАЯ ИГРА «НАПЁРСТКИ» ВМЕСТО КОЛЕСА УДАЧИ
    // ========================================================
    renderThimblesContent(box) {
        if (!box) return;

        let curDay = state.player?.day || 1;
        let lastDay = state.player?.lastFreeSpinDay || 0;
        let canFree = lastDay < curDay;

        const st = this.thimblesState;
        let bet = st.currentBet;

        let cupsHtml = "";
        for (let i = 0; i < 3; i++) {
            let isWinner = (i === st.winningIndex);
            let isSelected = (i === st.selectedIndex);

            let cupVisualClass = "thimble-cup";
            let contentUnderneath = "";

            if (st.phase === 'showing') {
                if (isWinner) {
                    cupVisualClass += " thimble-lifted";
                    contentUnderneath = `<div class="thimble-ball-item">⚽</div>`;
                }
            } else if (st.phase === 'shuffling') {
                cupVisualClass += " thimble-shuffling";
            } else if (st.phase === 'guess') {
                cupVisualClass += " thimble-clickable";
            } else if (st.phase === 'revealed') {
                cupVisualClass += " thimble-lifted";
                if (isWinner) {
                    contentUnderneath = `<div class="thimble-ball-item thimble-ball-win">⚽</div>`;
                } else {
                    contentUnderneath = `<div class="thimble-empty-item">💨</div>`;
                }
            }

            cupsHtml += `
                <div class="thimble-slot-wrap" onclick="PhoneMedia.selectThimbleCup(${i})">
                    <div class="${cupVisualClass}" id="thimbleCup_${i}">
                        <div class="thimble-cap-top"></div>
                        <div class="thimble-cap-body">
                            <span style="font-size:26px;">🥤</span>
                        </div>
                    </div>
                    <div class="thimble-content-base">
                        ${contentUnderneath}
                    </div>
                    <div class="sub-label mt-1" style="font-size:9px;">Напёрсток #${i + 1}</div>
                </div>
            `;
        }

        let controlArea = "";
        if (st.phase === 'bet' || st.phase === 'revealed') {
            controlArea = `
                <div class="glass-card p-2 mb-2">
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label font-bold">Выберите ставку на кон:</span>
                        <span class="color-amber font-bold">Коэффициент: x2.5 💰</span>
                    </div>
                    <div class="grid-4 mb-2">
                        <button onclick="PhoneMedia.setThimbleBet(25000)" class="btn ${bet === 25000 && !canFree ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">25k ₽</button>
                        <button onclick="PhoneMedia.setThimbleBet(50000)" class="btn ${bet === 50000 && !canFree ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">50k ₽</button>
                        <button onclick="PhoneMedia.setThimbleBet(100000)" class="btn ${bet === 100000 && !canFree ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">100k ₽</button>
                        <button onclick="PhoneMedia.setThimbleBet(250000)" class="btn ${bet === 250000 && !canFree ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">250k ₽</button>
                    </div>

                    <button onclick="PhoneMedia.startThimblesGame()" class="btn ${canFree ? 'btn-green' : 'btn-amber'} w-full">
                        ${canFree ? 'Бесплатная игра дня (1 раз в сутки) ★' : `Крутить напёрстки (${bet.toLocaleString()} ₽)`}
                    </button>
                </div>
            `;
        } else if (st.phase === 'shuffling') {
            controlArea = `
                <div class="p-2 mb-2 text-center" style="background:#090e18; border-radius:10px; border:1px solid var(--amber);">
                    <div class="price-val color-amber mb-1" style="font-size:16px;"><i class="fa-solid fa-arrows-rotate fa-spin"></i> Алик перемешивает напёрстки...</div>
                    <div class="sub-label" style="font-size:9.5px;">Следите за стаканом внимательно!</div>
                </div>
            `;
        } else if (st.phase === 'guess') {
            controlArea = `
                <div class="p-2 mb-2 text-center" style="background:rgba(0, 242, 254, 0.12); border-radius:10px; border:1px solid var(--cyan);">
                    <b class="text-xs color-cyan block mb-1">🎯 НАЖМИТЕ НА НАПЁРСТОК, ГДЕ СПРЯТАН ШАРИК!</b>
                    <div class="sub-label" style="font-size:9px;">Один клик решает всё. Выигрыш составит +${Math.round(bet * 2.5).toLocaleString()} ₽</div>
                </div>
            `;
        }

        box.innerHTML = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.16), #090e18); border-color: var(--cyan);">
                <div class="flex-between mb-1">
                    <div class="flex-gap" style="align-items:center;">
                        <span style="font-size:20px;">🧢</span>
                        <div>
                            <b class="text-xs color-cyan">Уличные Напёрстки у вокзала</b>
                            <div class="sub-label" style="font-size:8.5px;">Мастер стаканчиков Ашот</div>
                        </div>
                    </div>
                    <span class="tag-badge bg-tag-amber">x2.5 КУШ</span>
                </div>
                <div class="seller-dialog-bubble my-1" style="margin:4px 0;">
                    <span class="seller-mood-icon">🧔</span>
                    <span class="seller-bubble-text" id="thimblesDialogueText">${st.message}</span>
                </div>
            </div>

            <!-- ИГРОВОЙ СТОЛ С 3 НАПЁРСТКАМИ -->
            <div class="thimbles-stage-board mb-2">
                <div class="grid-3" style="gap:10px;">
                    ${cupsHtml}
                </div>
            </div>

            ${controlArea}
        `;
    },

    setThimbleBet(amount) {
        if (this.thimblesState.phase !== 'bet' && this.thimblesState.phase !== 'revealed') return;
        this.thimblesState.currentBet = amount;
        if (typeof playSound === 'function') playSound('tick');
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));
    },

    startThimblesGame() {
        if (this.thimblesState.phase === 'shuffling' || this.thimblesState.phase === 'showing') return;

        let curDay = state.player?.day || 1;
        let lastDay = state.player?.lastFreeSpinDay || 0;
        let canFree = lastDay < curDay;

        let bet = this.thimblesState.currentBet;

        if (canFree) {
            this.thimblesState.isFreeGame = true;
            state.player.lastFreeSpinDay = curDay;
        } else {
            this.thimblesState.isFreeGame = false;
            let cash = state.player?.cash || 0;
            if (cash < bet) return showToast(`Не хватает денег на ставку ${bet.toLocaleString()} ₽!`);
            state.player.cash -= bet;
        }

        saveState();
        updateHeaderUI();

        // 1. Показываем шарик под случайным напёрстком
        const winIdx = Math.floor(Math.random() * 3);
        this.thimblesState.winningIndex = winIdx;
        this.thimblesState.selectedIndex = null;
        this.thimblesState.phase = 'showing';
        this.thimblesState.message = `«Вот он, родной, под напёрстком #${winIdx + 1}! Глаз не спускай!»`;

        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('medium');
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));

        // 2. Через 1 секунду опускаем напёрстки и начинаем перемешивание
        setTimeout(() => {
            this.runThimblesShuffle();
        }, 1100);
    },

    runThimblesShuffle() {
        this.thimblesState.phase = 'shuffling';
        this.thimblesState.message = "«Кручу-верчу, шарик спрятать хочу! Следи за руками!»";
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));

        let step = 0;
        const totalSteps = 8;

        if (this.thimblesState.shuffleTimer) clearInterval(this.thimblesState.shuffleTimer);

        this.thimblesState.shuffleTimer = setInterval(() => {
            step++;
            if (typeof playSound === 'function') playSound('tick');

            // Случайно меняем визуальное положение
            for (let i = 0; i < 3; i++) {
                const cupEl = document.getElementById(`thimbleCup_${i}`);
                if (cupEl) {
                    let offset = (Math.random() * 16 - 8).toFixed(0);
                    cupEl.style.transform = `translateX(${offset}px)`;
                }
            }

            if (step >= totalSteps) {
                clearInterval(this.thimblesState.shuffleTimer);
                this.thimblesState.shuffleTimer = null;

                // Сброс трансформаций
                for (let i = 0; i < 3; i++) {
                    const cupEl = document.getElementById(`thimbleCup_${i}`);
                    if (cupEl) cupEl.style.transform = 'none';
                }

                // 3. Переход в фазу угадывания
                this.thimblesState.phase = 'guess';
                this.thimblesState.message = "«Всё, стоп игра! Укажи пальцем, где лежит шарик!»";
                if (typeof tgHaptic === 'function') tgHaptic('warning');
                this.renderFortuneApp(document.getElementById('phoneAppContainer'));
            }
        }, 170);
    },

    selectThimbleCup(chosenIdx) {
        if (this.thimblesState.phase !== 'guess') return;

        this.thimblesState.selectedIndex = chosenIdx;
        this.thimblesState.phase = 'revealed';

        const isWin = (chosenIdx === this.thimblesState.winningIndex);
        const bet = this.thimblesState.currentBet;
        const isFree = this.thimblesState.isFreeGame;

        if (isWin) {
            let winCash = isFree ? 120000 : Math.round(bet * 2.5);
            state.player.cash = (state.player.cash || 0) + winCash;
            if (typeof addXp === 'function') addXp(45);

            saveState();
            updateHeaderUI();

            this.thimblesState.message = `«Ай, красава! Глаз-алмаз! Забирай свои +${winCash.toLocaleString()} ₽!»`;
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

            openVerdictModal(
                "ПОБЕДА В НАПЁРСТКАХ! 🥤",
                `Вы раскусили фокус Алика и нашли шарик под напёрстком #${chosenIdx + 1}!\nВыигрыш: +${winCash.toLocaleString()} ₽ (+45 XP)`,
                true,
                winCash
            );
        } else {
            this.thimblesState.message = `«Мимо, перекуп! Шарик-то был под #${this.thimblesState.winningIndex + 1}! В следующий раз повезёт.»`;
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('error');

            let lossDesc = isFree ? "Бесплатная попытка сгорела." : `Ставка -${bet.toLocaleString()} ₽ досталась напёрсточнику.`;
            showToast(`Мимо! Шарик был под #${this.thimblesState.winningIndex + 1}.`);
        }

        this.renderFortuneApp(document.getElementById('phoneAppContainer'));
    }
};

window.PhoneMedia = PhoneMedia;
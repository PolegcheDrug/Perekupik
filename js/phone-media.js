// ========================================================
// js/phone-media.js — МЕДИА, РАДИО И СУПЕРВИЛСПИН (v0.7.3)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Полноценный Супервилспин: одновременное вращение 3 барабанов,
// гарантированная выдача СРАЗУ 3 ПРИЗОВ за 1 билет с анимацией токенов,
// классическое Колесо Фортуны и авто-магнитола с эквалайзером.
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
        playSound('tick');
        this.renderRadioApp(document.getElementById('phoneAppContainer'));
    },

    nextStation() {
        this.activeStationIndex = (this.activeStationIndex + 1) % this.stations.length;
        this.radioPlaying = true;
        playSound('tick');
        this.renderRadioApp(document.getElementById('phoneAppContainer'));
    },

    // ----------------------------------------------------
    // 2. КЛУБ ФОРТУНЫ & СУПЕРВИЛСПИН (3 ПРИЗА ЗА РАЗ)
    // ----------------------------------------------------
    activeFortuneTab: 'superspin', // 'superspin' | 'wheel'
    isSuperSpinning: false,

    // Текущие отображаемые слоты на 3 барабанах
    reelDisplay: {
        reel1: { emoji: "🚗", name: "Автопарк", desc: "Слот 1" },
        reel2: { emoji: "💰", name: "Деньги", desc: "Слот 2" },
        reel3: { emoji: "🎁", name: "Эксклюзив", desc: "Слот 3" }
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
                    <button onclick="PhoneMedia.switchFortuneTab('wheel')" class="btn ${sub === 'wheel' ? 'btn-cyan' : 'btn-dark'} btn-sm">
                        <i class="fa-solid fa-dharmachakra"></i> Колесо Удачи
                    </button>
                </div>

                <div id="fortuneTabContentBox"></div>
            </div>
        `;

        if (sub === 'superspin') {
            this.renderSuperSpinContent(document.getElementById('fortuneTabContentBox'), tickets, canFreeSuperSpin);
        } else {
            this.renderClassicWheelContent(document.getElementById('fortuneTabContentBox'));
        }
    },

    switchFortuneTab(tab) {
        if (this.isSuperSpinning) return;
        this.activeFortuneTab = tab;
        playSound('tick');
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));
    },

    // ----------------------------------------------------
    // РЕНДЕР СУПЕРВИЛСПИНА С 3 ОДНОВРЕМЕННЫМИ БАРАБАНАМИ
    // ----------------------------------------------------
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
        playSound('win');
        tgHaptic('success');
        showToast("Билет СуперВилспина куплен! (+1 🎟️)");
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));
    },

    // ----------------------------------------------------
    // ОДНОВРЕМЕННОЕ ВРАЩЕНИЕ 3 БАРАБАНОВ С ВЫДАЧЕЙ ВСЕХ 3 ПРИЗОВ
    // ----------------------------------------------------
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

        // Финальные победители в каждом барабане
        const prize1 = pool1[Math.floor(Math.random() * pool1.length)];
        const prize2 = pool2[Math.floor(Math.random() * pool2.length)];
        const prize3 = pool3[Math.floor(Math.random() * pool3.length)];

        let spinCount = 0;
        const spinInterval = setInterval(() => {
            spinCount++;
            playSound('tick');

            // Мерцание промежуточными случайными элементами
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

            // Остановка Барабана 1
            if (spinCount === 13) {
                setTxt('reelEmoji1', prize1.emoji || "🏎️");
                setTxt('reelName1', prize1.name || "Авто");
                const c1 = document.getElementById('fortuneReelCard1');
                if (c1) {
                    c1.classList.remove('reel-spinning-anim');
                    c1.style.borderColor = "var(--cyan)";
                    c1.style.boxShadow = "0 0 16px var(--cyan-glow)";
                }
                tgHaptic('medium');
            }

            // Остановка Барабана 2
            if (spinCount === 19) {
                setTxt('reelEmoji2', "💰");
                setTxt('reelName2', prize2.label || "Валюта");
                const c2 = document.getElementById('fortuneReelCard2');
                if (c2) {
                    c2.classList.remove('reel-spinning-anim');
                    c2.style.borderColor = "var(--green)";
                    c2.style.boxShadow = "0 0 16px var(--green-glow)";
                }
                tgHaptic('medium');
            }

            // Остановка Барабана 3 и финал
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

    // ----------------------------------------------------
    // НАЧИСЛЕНИЕ ВСЕХ 3 ПРИЗОВ СРАЗУ В ИНВЕНТАРЬ
    // ----------------------------------------------------
    claimAllThreePrizes(p1, p2, p3) {
        let rewardTokens = [];

        // 1. Обработка Барабана 1 (Техника / Приборы)
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

        // 2. Обработка Барабана 2 (Валюта и ресурсы)
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

        // 3. Обработка Барабана 3 (Эксклюзивы)
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
        } else if (p3.type === 'free_impound') {
            state.player.freeImpoundPasses = (state.player.freeImpoundPasses || 0) + 1;
            rewardTokens.push({
                icon: "🚔",
                title: "Талон штрафстоянки",
                value: "+1 Талон ГИБДД",
                desc: "Бесплатный забор автомобиля",
                rarity: "token-purple"
            });
        } else if (p3.type === 'fine') {
            state.player.cash = Math.max(0, (state.player.cash || 0) - p3.penaltyCash);
            rewardTokens.push({
                icon: "👮",
                title: "Штраф за тонировку",
                value: `-${p3.penaltyCash.toLocaleString()} ₽`,
                desc: "Протокол ДПС у капота",
                rarity: "token-red"
            });
        }

        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        playSound('win');
        tgHaptic('success');

        // Открытие единого окна со всеми 3 наградами
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

    // ----------------------------------------------------
    // РЕНДЕР КЛАССИЧЕСКОГО КОЛЕСА УДАЧИ
    // ----------------------------------------------------
    renderClassicWheelContent(box) {
        if (!box) return;

        let curDay = state.player?.day || 1;
        let lastDay = state.player?.lastFreeSpinDay || 0;
        let canFree = lastDay < curDay;

        box.innerHTML = `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.16), #090e18);">
                <div class="radar-spinner-ring mb-2" style="width:72px; height:72px; border-width:3px; border-top-color:var(--cyan); border-right-color:var(--green);">
                    <div class="radar-spinner-center" style="font-size:24px;">🎡</div>
                </div>
                <h3 class="font-bold text-xs color-cyan" style="font-size:15px;">Колесо Фортуны</h3>
                <div class="sub-label mb-3" style="font-size:9.5px;">Классический спин с денежными призами, полным баком топлива и джекпотом 1,000,000 ₽!</div>

                <button onclick="PhoneMedia.spinClassicWheel()" class="btn ${canFree ? 'btn-green' : 'btn-cyan'} w-full mb-2">
                    ${canFree ? 'Бесплатный спин дня ★' : 'Крутить за 50,000 ₽'}
                </button>
            </div>
        `;
    },

    spinClassicWheel() {
        let curDay = state.player?.day || 1;
        let lastDay = state.player?.lastFreeSpinDay || 0;
        let canFree = lastDay < curDay;

        if (!canFree) {
            let cash = state.player?.cash || 0;
            if (cash < 50000) return showToast("Нужно 50,000 ₽ для вращения колеса!");
            state.player.cash -= 50000;
        } else {
            state.player.lastFreeSpinDay = curDay;
        }

        const sectors = (typeof WHEEL_SECTORS !== 'undefined') ? WHEEL_SECTORS : [
            { label: "+100k ₽", type: "cash", amount: 100000 }
        ];

        const won = sectors[Math.floor(Math.random() * sectors.length)];

        if (won.type === 'cash' || won.type === 'jackpot') {
            state.player.cash = (state.player.cash || 0) + won.amount;
        } else if (won.type === 'stars') {
            state.player.stars = (state.player.stars || 0) + won.amount;
        } else if (won.type === 'fuel') {
            state.player.fuel = 100;
        } else if (won.type === 'conn') {
            state.player.connections = (state.player.connections || 0) + won.amount;
        } else if (won.type === 'tickets') {
            let maxT = state.player?.maxExpressTickets || 25;
            state.player.expressTickets = Math.min(maxT, (state.player.expressTickets || 0) + won.amount);
        } else if (won.type === 'impound') {
            state.player.freeImpoundPasses = (state.player.freeImpoundPasses || 0) + 1;
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');

        openVerdictModal("ПРИЗ КОЛЕСА ФОРТУНЫ! 🎡", `Вам выпал сектор:\n${won.label}!`, true);
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));
    }
};

window.PhoneMedia = PhoneMedia;

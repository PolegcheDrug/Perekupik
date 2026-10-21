// ========================================================
// js/phone/phone-media.js — МЕДИА, РАДИО, НАПЁРСТКИ И СУПЕРВИЛСПИН (v3.4.0 PRO-BALANCE)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v3.4.0 (СТРОГИЙ БАЛАНС ЭКОНОМИКИ СУПЕРВИЛСПИНА):
//   1. УРОВНЕВЫЙ ДРОП АВТОМОБИЛЕЙ: на 1-5 уровнях выпадает только стартовая классика под ремонт.
//      Легендарные иномарки (Golf GTI, Mark II, BMW E39) открываются строго с 10-15+ уровней.
//   2. ДИНАМИЧЕСКИЕ ДЕНЕЖНЫЕ КУШИ: вместо мгновенных 250k-1.5M ₽ суммы масштабируются по уровню (15k-60k ₽).
//   3. РЕБАЛАНС НАПЁРСТОК: адекватный выигрыш дня без поломки экономики (до 25 000 ₽).
//   4. СОХРАНЕНО: живое радио, анимация 3 барабанов, косметика, компенсации Stars и Почта.
// ========================================================

const PhoneMedia = {
    // ====================================================
    // 1. АВТО-МАГНИТОЛА И ЖИВОЕ ОНЛАЙН-РАДИО
    // ====================================================
    radioPlaying: false,
    radioLoading: false,
    activeStationIndex: 0,
    volume: 0.75,
    audioElement: null,

    _radioPending: false,

    stations: [
        {
            name: "Радио Рекорд",
            genre: "EDM / Club Dance",
            freq: "106.3 FM",
            icon: "fa-bolt",
            color: "#ff0055",
            streamUrl: "https://record2.radiorecord.ru/rr_320",
            backupUrl: "https://hls-01-radiorecord.hostingradio.ru/record/playlist.m3u8"
        },
        {
            name: "Record Rock",
            genre: "Rock & Alternative",
            freq: "102.8 FM",
            icon: "fa-guitar",
            color: "#ff4400",
            streamUrl: "https://record2.radiorecord.ru/rock_320",
            backupUrl: "https://radiorecord.hostingradio.ru/rock96.aacp"
        },
        {
            name: "Pirate Station",
            genre: "Drum & Bass / Jungle",
            freq: "104.2 FM",
            icon: "fa-skull",
            color: "#00f2fe",
            streamUrl: "https://record2.radiorecord.ru/ps_320",
            backupUrl: "https://radiorecord.hostingradio.ru/ps96.aacp"
        },
        {
            name: "Record Black Rap",
            genre: "Hip-Hop / Trap",
            freq: "98.7 FM",
            icon: "fa-fire",
            color: "#ffd700",
            streamUrl: "https://record2.radiorecord.ru/rap_320",
            backupUrl: "https://radiorecord.hostingradio.ru/rap96.aacp"
        },
        {
            name: "DFM",
            genre: "Dance Pop / Club",
            freq: "107.0 FM",
            icon: "fa-headphones",
            color: "#9333ea",
            streamUrl: "https://dfm.hostingradio.ru/dfm96.aacp",
            backupUrl: "https://icecast-dfm.cdnvideo.ru/dfm"
        },
        {
            name: "Европа Плюс",
            genre: "Top 40 / Pop",
            freq: "100.5 FM",
            icon: "fa-compact-disc",
            color: "#00e676",
            streamUrl: "https://emg01.hostingradio.ru/europaplus128.mp3",
            backupUrl: "https://ep128.hostingradio.ru:8030/ep128"
        }
    ],

    initAudioEngine() {
        if (!this.audioElement) {
            try {
                this.audioElement = new Audio();
                this.audioElement.preload = "none";
                this.audioElement.volume = this.volume;

                this.audioElement.addEventListener("waiting", () => {
                    this.radioLoading = true;
                    this.syncRadioUI();
                });

                this.audioElement.addEventListener("playing", () => {
                    this.radioLoading = false;
                    this.radioPlaying = true;
                    this.syncRadioUI();
                });

                this.audioElement.addEventListener("pause", () => {
                    this.radioLoading = false;
                    this.radioPlaying = false;
                    this.syncRadioUI();
                });

                this.audioElement.addEventListener("error", (e) => {
                    if (!this.audioElement || !this.audioElement.src || this.audioElement.src === "" || this.audioElement.src === window.location.href) {
                        return;
                    }
                    console.warn("[Radio Engine] Ошибка воспроизведения, пробуем переподключиться...", e);
                    const st = this.stations[this.activeStationIndex];
                    if (st && st.backupUrl && this.audioElement.src !== st.backupUrl) {
                        this.audioElement.src = st.backupUrl;
                        this.audioElement.play().catch(err => {
                            console.error("[Radio Engine] Резервный поток также недоступен:", err);
                            this.resetRadioState("Поток временно недоступен");
                        });
                    } else {
                        this.resetRadioState("Не удалось подключиться к радиостанции");
                    }
                });
            } catch (e) {
                console.warn('[PhoneMedia] Ошибка initAudioEngine:', e);
            }
        }
    },

    resetRadioState(msg) {
        this.radioLoading = false;
        this.radioPlaying = false;
        if (this.audioElement) {
            try {
                this.audioElement.pause();
            } catch (err) {}
        }
        this.syncRadioUI();
        if (msg && typeof showToast === 'function') {
            showToast(msg);
        }
    },

    syncRadioUI() {
        const btn = document.getElementById('radioMainPlayBtn');
        const eq = document.querySelector('.radio-equalizer-bars');
        const statusLabel = document.getElementById('radioStatusSubLabel');

        if (statusLabel) {
            if (this.radioLoading) {
                statusLabel.innerHTML = '<span class="color-amber"><i class="fa-solid fa-spinner fa-spin"></i> ПОДКЛЮЧЕНИЕ К ЭФИРУ...</span>';
            } else if (this.radioPlaying) {
                statusLabel.innerHTML = '<span class="color-green font-bold"><i class="fa-solid fa-signal"></i> В ПРЯМОМ ЭФИРЕ</span>';
            } else {
                statusLabel.textContent = 'ЭФИР ПРИОСТАНОВЛЕН';
            }
        }

        if (btn) {
            if (this.radioLoading) {
                btn.className = `btn btn-dark btn-sm opacity-60`;
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Загрузка...`;
            } else {
                btn.className = `btn ${this.radioPlaying ? 'btn-red' : 'btn-purple'} btn-sm`;
                btn.innerHTML = `<i class="fa-solid ${this.radioPlaying ? 'fa-pause' : 'fa-play'}"></i> ${this.radioPlaying ? 'Пауза' : 'В эфир'}`;
            }
        }

        if (eq) {
            if (this.radioPlaying && !this.radioLoading) {
                eq.classList.add('playing');
            } else {
                eq.classList.remove('playing');
            }
        }
    },

    renderRadioApp(container) {
        if (!container) return;
        this.initAudioEngine();

        const cur = this.stations[this.activeStationIndex] || this.stations[0];
        const isPlay = this.radioPlaying;

        let stationsHtml = this.stations.map((st, i) => `
            <div onclick="PhoneMedia.selectRadioStation(${i})" class="glass-card p-2 flex-between mb-1 station-row ${i === this.activeStationIndex ? 'active-station' : ''}" style="cursor:pointer; border-left: 3px solid ${st.color || 'var(--cyan)'};">
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
                        <div class="sub-label" id="radioStatusSubLabel" style="font-size:10px;">
                            ${isPlay ? '<span class="color-green font-bold"><i class="fa-solid fa-signal"></i> В ПРЯМОМ ЭФИРЕ</span>' : 'ЭФИР ПРИОСТАНОВЛЕН'}
                        </div>
                        <h3 class="font-bold text-xs color-cyan" style="font-size:16px;">${cur.name}</h3>
                        <div class="sub-label color-amber font-bold" style="font-size:11px;">${cur.freq} • ${cur.genre}</div>
                    </div>

                    <div class="flex-between text-xs my-2 px-2" style="align-items:center; gap:8px;">
                        <i class="fa-solid fa-volume-low sub-label"></i>
                        <input type="range" min="0" max="1" step="0.05" value="${this.volume}"
                               oninput="PhoneMedia.setRadioVolume(this.value)"
                               style="flex:1; accent-color: var(--cyan); height: 4px; cursor:pointer;">
                        <i class="fa-solid fa-volume-high color-cyan"></i>
                    </div>

                    <div class="flex-between mt-3 pt-2" style="border-top:1px dashed rgba(255,255,255,0.08);">
                        <button onclick="PhoneMedia.prevStation()" class="btn btn-dark btn-sm btn-auto"><i class="fa-solid fa-backward-step"></i></button>
                        <button id="radioMainPlayBtn" onclick="PhoneMedia.toggleRadioPlay()" class="btn ${isPlay ? 'btn-red' : 'btn-purple'} btn-sm" style="max-width:140px;">
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

    setRadioVolume(val) {
        this.volume = parseFloat(val);
        if (this.audioElement) {
            this.audioElement.volume = this.volume;
        }
    },

    toggleRadioPlay() {
        if (this._radioPending) return;
        this._radioPending = true;

        try {
            this.initAudioEngine();
            const st = this.stations[this.activeStationIndex];

            if (this.radioPlaying || this.radioLoading) {
                this.radioPlaying = false;
                this.radioLoading = false;

                try {
                    this.audioElement.pause();
                } catch (e) {
                    console.warn('[Radio Engine] Ошибка pause():', e);
                }

                this.syncRadioUI();
                if (typeof showToast === 'function') showToast("Радио приостановлено");

                if (window.EventBus) {
                    window.EventBus.emit('media:radio_paused', { station: st.name });
                }
            } else {
                this.radioLoading = true;
                this.syncRadioUI();

                this.audioElement.src = st.streamUrl;

                const playPromise = this.audioElement.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        this.radioLoading = false;
                        this.radioPlaying = true;
                        this.syncRadioUI();
                        if (typeof showToast === 'function') showToast(`В эфире: «${st.name}» 📻`);

                        if (window.EventBus) {
                            window.EventBus.emit('media:radio_changed', { station: st.name, freq: st.freq });
                        }
                    }).catch(err => {
                        console.warn("[Radio] Ошибка запуска:", err);
                        this.radioLoading = false;
                        this.radioPlaying = false;
                        this.syncRadioUI();
                        if (typeof showToast === 'function') {
                            showToast("Нажмите ещё раз для запуска звука!");
                        }
                    });
                }
            }

            if (window.AudioFx) window.AudioFx.play('tick');
            if (window.AudioFx) window.AudioFx.haptic('medium');
        } finally {
            this._radioPending = false;
        }
    },

    selectRadioStation(idx) {
        this.activeStationIndex = idx;
        this.initAudioEngine();

        const st = this.stations[idx];
        this.radioLoading = true;
        this.syncRadioUI();

        try {
            this.audioElement.pause();
        } catch (e) {}

        this.audioElement.src = st.streamUrl;

        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.radioLoading = false;
                this.radioPlaying = true;
                this.syncRadioUI();
                if (typeof showToast === 'function') showToast(`В эфире: «${st.name}»!`);

                if (window.EventBus) {
                    window.EventBus.emit('media:radio_changed', { station: st.name, freq: st.freq, index: idx });
                }
            }).catch(err => {
                console.warn("[Radio] Ошибка переключения станции:", err);
                this.radioLoading = false;
                this.radioPlaying = false;
                this.syncRadioUI();
            });
        }

        if (window.AudioFx) window.AudioFx.play('tick');
        if (window.AudioFx) window.AudioFx.haptic('light');
        this.renderRadioApp(document.getElementById('phoneAppContainer'));
    },

    prevStation() {
        this.activeStationIndex = (this.activeStationIndex - 1 + this.stations.length) % this.stations.length;
        this.selectRadioStation(this.activeStationIndex);
    },

    nextStation() {
        this.activeStationIndex = (this.activeStationIndex + 1) % this.stations.length;
        this.selectRadioStation(this.activeStationIndex);
    },

    // ====================================================
    // 2. КЛУБ ФОРТУНЫ: СУПЕРВИЛСПИН И НАПЁРСТКИ
    // ====================================================
    activeFortuneTab: 'superspin',
    isSuperSpinning: false,

    _spinPending: false,
    _thimbleBetPending: false,

    reelDisplay: {
        reel1: { emoji: "🚗", name: "Автопарк", desc: "Слот 1" },
        reel2: { emoji: "💰", name: "Деньги", desc: "Слот 2" },
        reel3: { emoji: "🎁", name: "Эксклюзив", desc: "Слот 3" }
    },

    thimblesState: {
        phase: 'bet',
        winningIndex: 1,
        selectedIndex: null,
        currentBet: 25000,
        isFreeGame: false,
        shuffleStep: 0,
        shuffleTimer: null,
        message: "«Кручу-верчу, запутать хочу! Ставь кэш и следи за шариком!»"
    },

    _getSuperSpinConfig() {
        const cfg = (window.WHEEL_CONFIG && window.WHEEL_CONFIG.superWheel) ? window.WHEEL_CONFIG.superWheel : null;
        const starRate = window.BANK_EXCHANGE_RATES?.stars?.buyRub || 2500;

        if (!cfg) {
            return {
                costCash: 120000,
                costStars: 20,
                costTickets: 3,
                canFreeDaily: false,
                starRate
            };
        }

        return {
            costCash: Number(cfg.costCash) || 120000,
            costStars: Number(cfg.costStars) || 20,
            costTickets: Number(cfg.costTickets) || 3,
            canFreeDaily: !!cfg.canFreeDaily,
            starRate
        };
    },

    renderFortuneApp(container) {
        if (!container) return;
        const sub = this.activeFortuneTab;
        const cfg = this._getSuperSpinConfig();

        const tickets = window.state.player?.superSpinTickets || 0;
        const curDay = window.state.player?.day || 1;
        const lastFreeDay = window.state.player?.lastFreeSuperSpinDay || 0;

        const canFreeSuperSpin = cfg.canFreeDaily && lastFreeDay < curDay;

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
        if (window.AudioFx) window.AudioFx.play('tick');
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));
    },

    renderSuperSpinContent(box, tickets, canFreeSuperSpin) {
        if (!box) return;

        const cfg = this._getSuperSpinConfig();
        const starRate = cfg.starRate;
        const starsRubValue = (cfg.costStars * starRate).toLocaleString();

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
            spinBtnText = `КУПИТЬ СПИН (${cfg.costCash.toLocaleString()} ₽ или ${cfg.costStars} ⭐)`;
            spinBtnClass = "btn btn-purple w-full";
        }

        box.innerHTML = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(255, 215, 0, 0.18), #090e18); border-color: #ffd700;">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-crown"></i> SUPER WHEELSPIN</b>
                    <span class="tag-badge bg-tag-amber">ВЫДАЁТ 3 ПРИЗА СРАЗУ</span>
                </div>
                <div class="sub-label" style="font-size:9.5px;">
                    Каждое вращение активирует <b>все 3 слота одновременно</b>. Все выигранные призы, машины и косметика доставляются на вашу <b>Почту</b> или активируются сразу!
                </div>
            </div>

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
                    +1 Билет (${cfg.costCash.toLocaleString()} ₽ / ${cfg.costStars} ⭐)
                </button>
            </div>

            <div class="glass-card p-2 mt-2 text-center" style="background:#090e18;">
                <div class="sub-label" style="font-size:8.5px;">
                    Курс: 1 ⭐ = ${starRate.toLocaleString()} ₽ • ${cfg.costStars} ⭐ = ${starsRubValue} ₽
                </div>
                <div class="sub-label" style="font-size:8px; color:#ffd700; margin-top:3px;">
                    Дроп адаптируется под ранг перекупа: легендарные иномарки открываются с 10+ уровня!
                </div>
            </div>
        `;
    },

    purchaseSuperSpinTicket() {
        const cfg = this._getSuperSpinConfig();
        let success = false;

        try {
            if (window.MoneyManager) {
                const cashBalance = window.MoneyManager.getBalance();
                const starsBalance = window.MoneyManager.getStars();

                if (cashBalance >= cfg.costCash) {
                    if (window.MoneyManager.spend(cfg.costCash, 'Покупка билета СуперВилспина')) {
                        success = true;
                    }
                } else if (starsBalance >= cfg.costStars) {
                    if (window.MoneyManager.spend(cfg.costStars, 'Покупка билета СуперВилспина', { currency: 'stars' })) {
                        success = true;
                    }
                } else {
                    if (typeof showToast === 'function') {
                        showToast(`Нужно ${cfg.costCash.toLocaleString()} ₽ или ${cfg.costStars} ⭐!`);
                    }
                    return false;
                }
            } else {
                const cash = window.state.player?.cash || 0;
                const stars = window.state.player?.stars || 0;

                if (cash >= cfg.costCash) {
                    window.state.player.cash -= cfg.costCash;
                    if (typeof logBankTransaction === 'function') {
                        logBankTransaction('Покупка билета СуперВилспина', cfg.costCash, false);
                    }
                    success = true;
                } else if (stars >= cfg.costStars) {
                    window.state.player.stars -= cfg.costStars;
                    if (typeof logBankTransaction === 'function') {
                        logBankTransaction('Покупка билета СуперВилспина', cfg.costStars * cfg.starRate, false);
                    }
                    success = true;
                } else {
                    if (typeof showToast === 'function') {
                        showToast(`Нужно ${cfg.costCash.toLocaleString()} ₽ или ${cfg.costStars} ⭐!`);
                    }
                    return false;
                }
            }

            if (success) {
                window.state.player.superSpinTickets = (window.state.player.superSpinTickets || 0) + 1;

                if (typeof saveState === 'function') saveState();
                if (typeof updateHeaderUI === 'function') updateHeaderUI();
                if (window.AudioFx) window.AudioFx.play('win');
                if (window.AudioFx) window.AudioFx.haptic('success');
                if (typeof showToast === 'function') showToast("Билет СуперВилспина куплен! (+1 🎟️)");

                if (window.EventBus) {
                    window.EventBus.emit('media:super_spin_ticket_bought', { ticketCount: window.state.player.superSpinTickets });
                }
            }
        } catch (e) {
            console.warn('[PhoneMedia] purchaseSuperSpinTicket error:', e);
            return false;
        }

        return success;
    },

    buySuperSpinTicket() {
        const ok = this.purchaseSuperSpinTicket();
        if (ok) {
            this.renderFortuneApp(document.getElementById('phoneAppContainer'));
        }
    },

    startTripleSuperSpin() {
        if (this._spinPending || this.isSuperSpinning) return;
        this._spinPending = true;

        try {
            const cfg = this._getSuperSpinConfig();
            const curDay = window.state.player?.day || 1;
            const lastFreeDay = window.state.player?.lastFreeSuperSpinDay || 0;

            const canFree = cfg.canFreeDaily && lastFreeDay < curDay;
            let tickets = window.state.player?.superSpinTickets || 0;

            if (canFree) {
                window.state.player.lastFreeSuperSpinDay = curDay;
            } else if (tickets > 0) {
                window.state.player.superSpinTickets = tickets - 1;
            } else {
                let paid = false;

                if (window.MoneyManager) {
                    const cashBalance = window.MoneyManager.getBalance();
                    const starsBalance = window.MoneyManager.getStars();

                    if (cashBalance >= cfg.costCash) {
                        paid = window.MoneyManager.spend(cfg.costCash, 'Оплата спина Супер Вилспина');
                    } else if (starsBalance >= cfg.costStars) {
                        paid = window.MoneyManager.spend(cfg.costStars, 'Оплата спина Супер Вилспина', { currency: 'stars' });
                    }
                } else {
                    const cash = window.state.player?.cash || 0;
                    const stars = window.state.player?.stars || 0;
                    if (cash >= cfg.costCash) {
                        window.state.player.cash -= cfg.costCash;
                        if (typeof logBankTransaction === 'function') logBankTransaction('Оплата спина Супер Вилспина', cfg.costCash, false);
                        paid = true;
                    } else if (stars >= cfg.costStars) {
                        window.state.player.stars -= cfg.costStars;
                        if (typeof logBankTransaction === 'function') logBankTransaction('Оплата спина Супер Вилспина', cfg.costStars * cfg.starRate, false);
                        paid = true;
                    }
                }

                if (!paid) {
                    if (typeof showToast === 'function') {
                        showToast(`Не хватает ${cfg.costCash.toLocaleString()} ₽ или ${cfg.costStars} ⭐ для запуска!`);
                    }
                    return;
                }
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();

            this.isSuperSpinning = true;
            this.renderFortuneApp(document.getElementById('phoneAppContainer'));

            if (window.EventBus) {
                window.EventBus.emit('media:super_spin_started', { usedFree: canFree, ticketsLeft: window.state.player.superSpinTickets });
            }

            // ⭐ УРОВНЕВЫЙ ДРОП: НАГРАДЫ ПРИВЯЗАНЫ К РАНГУ ИГРОКА БЕЗ ГИПЕРИНФЛЯЦИИ
            const playerLevel = window.state?.player?.level || 1;

            // Барабан 1: строго по тиру уровня
            let pool1 = [];
            if (playerLevel <= 3) {
                pool1 = [
                    { type: "car", name: "ВАЗ-2101", emoji: "🚗", basePrice: 42000, category: "economy" },
                    { type: "car", name: "ВАЗ-2106", emoji: "🚗", basePrice: 58000, category: "economy" },
                    { type: "car", name: "ИЖ-2126 «Ода»", emoji: "🚗", basePrice: 48000, category: "economy" },
                    { type: "free_impound", label: "Талон ГИБДД", emoji: "👮" }
                ];
            } else if (playerLevel <= 6) {
                pool1 = [
                    { type: "car", name: "ВАЗ-2107", emoji: "🚗", basePrice: 75000, category: "economy" },
                    { type: "car", name: "Lada Samara 2109", emoji: "🚗", basePrice: 88000, category: "economy" },
                    { type: "car", name: "Daewoo Nexia", emoji: "🚗", basePrice: 95000, category: "economy" },
                    { type: "tool", name: "Толщиномер ЛКП", toolId: "gauge", emoji: "📱" }
                ];
            } else if (playerLevel <= 11) {
                pool1 = [
                    { type: "car", name: "VW Passat B3", emoji: "🚗", basePrice: 160000, category: "comfort" },
                    { type: "car", name: "Ford Focus II", emoji: "🚗", basePrice: 280000, category: "comfort" },
                    { type: "car", name: "Toyota Chaser (Сток)", emoji: "🏎️", basePrice: 350000, category: "comfort" },
                    { type: "tool", name: "Сканер Launch", toolId: "obd_launch", emoji: "📱" }
                ];
            } else {
                pool1 = [
                    { type: "car", name: "VW Golf VI GTI", emoji: "🏎️", basePrice: 1100000, category: "comfort" },
                    { type: "car", name: "BMW E39 525i", emoji: "🏎️", basePrice: 850000, category: "comfort" },
                    { type: "car", name: "Toyota Mark II Tourer V", emoji: "🏎️", basePrice: 1250000, category: "comfort" }
                ];
            }

            // Барабан 2: адекватные суммы валюты
            let pool2 = [];
            if (playerLevel <= 4) {
                pool2 = [
                    { type: "cash", label: "15k ₽", amount: 15000 },
                    { type: "cash", label: "25k ₽", amount: 25000 },
                    { type: "fuel", label: "+35 ⛽", amount: 35 },
                    { type: "tickets", label: "+2 🎟️", amount: 2 }
                ];
            } else if (playerLevel <= 9) {
                pool2 = [
                    { type: "cash", label: "35k ₽", amount: 35000 },
                    { type: "cash", label: "50k ₽", amount: 50000 },
                    { type: "fuel", label: "+50 ⛽", amount: 50 },
                    { type: "tickets", label: "+3 🎟️", amount: 3 }
                ];
            } else {
                pool2 = [
                    { type: "cash", label: "60k ₽", amount: 60000 },
                    { type: "cash", label: "90k ₽", amount: 90000 },
                    { type: "fuel", label: "+100 ⛽", amount: 100 },
                    { type: "tickets", label: "+5 🎟️", amount: 5 }
                ];
            }

            // Барабан 3: эксклюзивы и косметика
            const pool3 = [
                { type: "stars", label: "3 ⭐", amount: 3 },
                { type: "stars", label: "5 ⭐", amount: 5 },
                { type: "cosmetic", label: "Cyber Scan", category: "scanner", itemId: "cyber_scan", emoji: "👾", isExclusive: true },
                { type: "conn", label: "+1 🤝 Связь", amount: 1 }
            ];

            const prize1 = pool1[Math.floor(Math.random() * pool1.length)];
            const prize2 = pool2[Math.floor(Math.random() * pool2.length)];
            const prize3 = pool3[Math.floor(Math.random() * pool3.length)];

            const setTxt = (id, txt) => {
                const el = document.getElementById(id);
                if (el) el.textContent = txt;
            };

            let spinCount = 0;
            const spinInterval = setInterval(() => {
                spinCount++;
                if (window.AudioFx) window.AudioFx.play('tick');

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
                    if (r3.type === 'cosmetic') {
                        setTxt('reelEmoji3', r3.emoji || "🎨");
                        setTxt('reelName3', r3.label || "Косметика");
                    } else {
                        setTxt('reelEmoji3', r3.emoji || "⭐");
                        setTxt('reelName3', r3.label || "Эксклюзив");
                    }
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
                    if (window.AudioFx) window.AudioFx.haptic('medium');
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
                    if (window.AudioFx) window.AudioFx.haptic('medium');
                }

                if (spinCount >= 25) {
                    clearInterval(spinInterval);
                    if (prize3.type === 'cosmetic') {
                        setTxt('reelEmoji3', prize3.emoji || "🎨");
                        setTxt('reelName3', prize3.label || "Косметика");
                    } else {
                        setTxt('reelEmoji3', prize3.emoji || "⭐");
                        setTxt('reelName3', prize3.label || "Эксклюзив");
                    }
                    const c3 = document.getElementById('fortuneReelCard3');
                    if (c3) {
                        c3.classList.remove('reel-spinning-anim');
                        c3.style.borderColor = prize3.isExclusive ? "#ffd700" : "var(--purple)";
                        c3.style.boxShadow = prize3.isExclusive
                            ? "0 0 20px rgba(255,215,0,0.7)"
                            : "0 0 16px var(--purple-glow)";
                    }

                    this.isSuperSpinning = false;
                    this.claimAllThreePrizes(prize1, prize2, prize3);
                }
            }, 110);
        } finally {
            this._spinPending = false;
        }
    },

    claimAllThreePrizes(p1, p2, p3) {
        let rewardTokens = [];

        try {
            // 1. БАРАБАН 1: ТЕХНИКА
            if (p1.type === 'car') {
                let matchedTemplate = null;

                if (p1.barnId && typeof BARN_CARS_DATABASE !== 'undefined' && Array.isArray(BARN_CARS_DATABASE)) {
                    matchedTemplate = BARN_CARS_DATABASE.find(c => c && c.id === p1.barnId) || null;
                }

                if (!matchedTemplate && typeof BARN_CARS_DATABASE !== 'undefined' && Array.isArray(BARN_CARS_DATABASE)) {
                    const cleanName = String(p1.name || '').trim().toLowerCase();
                    matchedTemplate = BARN_CARS_DATABASE.find(c => c && c.name && c.name.toLowerCase() === cleanName) || null;
                }

                if (!matchedTemplate && typeof findCarTemplateByName === 'function') {
                    matchedTemplate = findCarTemplateByName(p1.name);
                }

                let carGallery = [];
                if (matchedTemplate && typeof getCarImageList === 'function') {
                    carGallery = getCarImageList(matchedTemplate);
                }
                if (carGallery.length === 0 && matchedTemplate && Array.isArray(matchedTemplate.images) && matchedTemplate.images.length > 0) {
                    carGallery = [...matchedTemplate.images];
                }

                let mainImg = '';
                if (carGallery.length > 0) {
                    const randIdx = Math.floor(Math.random() * carGallery.length);
                    mainImg = carGallery[randIdx];
                } else if (matchedTemplate && matchedTemplate.img) {
                    mainImg = matchedTemplate.img;
                } else {
                    mainImg = "assets/cars/economy/2101/vaz-2101.jpg";
                }

                const fallbackImg = (typeof getCategoryFallback === 'function')
                    ? getCategoryFallback(p1.category || 'economy')
                    : (matchedTemplate?.fallback || "assets/cars/economy/2101/vaz-2101.jpg");

                if (carGallery.length === 0) {
                    carGallery = [mainImg];
                }

                let wonPlate = (typeof generateCoolPlate === 'function') ? generateCoolPlate() : "А777АА 77";

                let wonCar = {
                    id: "spin_car_" + Date.now(),
                    name: p1.name,
                    type: p1.category || 'economy',
                    power: p1.power || 75,
                    basePrice: p1.basePrice || 50000,
                    price: p1.basePrice || 50000,
                    marketValue: Math.round((p1.basePrice || 50000) * 1.05),
                    img: mainImg,
                    images: carGallery,
                    fallback: fallbackImg,
                    plate: wonPlate,
                    customPlate: wonPlate,
                    condition: 65,
                    wear: { engine: 70, transmission: 75 },
                    isRegisteredOnPlayer: false,
                    ownershipDays: 0,
                    engineTemp: 90,
                    tireWear: 80,
                    purchaseCost: 0,
                    tuning: {
                        chip: 0, exhaust: false, stance: false, bodykit: false,
                        rollCage: false, dragSlicks: false, hydroHandbrake: false,
                        weldedDiff: false, steeringAngle: false, bucketSeats: false,
                        customWheels: false, risk1251: 0
                    }
                };

                if (typeof recalculateCarMarketValue === 'function') {
                    recalculateCarMarketValue(wonCar);
                }

                if (typeof window.ensureCarIdentity === 'function') {
                    window.ensureCarIdentity(wonCar);
                }

                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "car",
                        title: `СуперВилспин: ${wonCar.name}`,
                        sender: "Клуб Фортуны",
                        desc: `Автомобиль выигран в барабане СуперВилспина! Госномер: ${wonPlate}. Распакуйте в гараж или законсервируйте на складе.`,
                        badge: "ВИЛСПИН",
                        carData: wonCar
                    });
                }

                rewardTokens.push({
                    icon: "🏎️",
                    title: "Автомобиль в Почту",
                    value: wonCar.name,
                    desc: `Доставлен в Почтовый ящик (Госномер ${wonPlate})`,
                    rarity: "token-cyan"
                });
            } else if (p1.type === 'tool') {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "tool",
                        toolId: p1.toolId,
                        title: `Диагностика: ${p1.name}`,
                        sender: "Клуб Фортуны",
                        desc: "Профессиональный прибор из СуперВилспина. Распакуйте для добавления в арсенал.",
                        badge: "ПРИБОР"
                    });
                }
                rewardTokens.push({
                    icon: p1.emoji || "📱",
                    title: "Прибор в Почту",
                    value: p1.name,
                    desc: "Отправлен посылкой в Почтовый ящик",
                    rarity: "token-purple"
                });
            } else if (p1.type === 'free_impound') {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "free_impound",
                        amount: 1,
                        title: "Талон ГИБДД (Штрафстоянка)",
                        sender: "Клуб Фортуны",
                        desc: "Официальный талон на бесплатную выдачу задержанного авто без протокола.",
                        badge: "ГИБДД"
                    });
                }
                rewardTokens.push({
                    icon: "🚔",
                    title: "Талон в Почту",
                    value: "+1 Талон ГИБДД",
                    desc: "Посылка в Почтовом ящике",
                    rarity: "token-purple"
                });
            }

            // 2. БАРАБАН 2: ВАЛЮТА И РЕСУРСЫ
            if (p2.type === 'cash') {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "cash",
                        amount: p2.amount,
                        title: `Денежный перевод: +${p2.amount.toLocaleString()} ₽`,
                        sender: "Клуб Фортуны",
                        desc: "Денежный приз из барабана СуперВилспина. Распакуйте для зачисления на баланс.",
                        badge: "ВАЛЮТА"
                    });
                }
                rewardTokens.push({
                    icon: "💰",
                    title: "Деньги в Почту",
                    value: `+${p2.amount.toLocaleString()} ₽`,
                    desc: "Посылка ожидает распаковки в Почте",
                    rarity: "token-green"
                });
            } else if (p2.type === 'fuel') {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "fuel",
                        amount: p2.amount,
                        title: `Канистра топлива: +${p2.amount} ⛽`,
                        sender: "Клуб Фортуны",
                        desc: "Топливный талон из СуперВилспина. Распакуйте для заправки бака.",
                        badge: "ТОПЛИВО"
                    });
                }
                rewardTokens.push({
                    icon: "⛽",
                    title: "Топливо в Почту",
                    value: `+${p2.amount} Топлива`,
                    desc: "Посылка в Почтовом ящике",
                    rarity: "token-cyan"
                });
            } else if (p2.type === 'tickets') {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "tickets",
                        amount: p2.amount,
                        title: `Экспресс-пропуски: +${p2.amount} 🎟️`,
                        sender: "Клуб Фортуны",
                        desc: "Талоны ускорения клиентов на площадке. Распакуйте в инвентарь.",
                        badge: "ТАЛОНЫ"
                    });
                }
                rewardTokens.push({
                    icon: "🎟️",
                    title: "Талоны в Почту",
                    value: `+${p2.amount} Талонов`,
                    desc: "Посылка в Почтовом ящике",
                    rarity: "token-purple"
                });
            }

            // 3. БАРАБАН 3: ЭКСКЛЮЗИВЫ И КОСМЕТИКА
            if (p3.type === 'stars') {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "stars",
                        amount: p3.amount,
                        title: `Премиальные Stars: +${p3.amount} ⭐`,
                        sender: "Клуб Фортуны",
                        desc: "Звёзды из барабана СуперВилспина. Распакуйте для зачисления на счёт.",
                        badge: "STARS"
                    });
                }
                rewardTokens.push({
                    icon: "⭐",
                    title: "Stars в Почту",
                    value: `+${p3.amount} ⭐`,
                    desc: "Посылка в Почтовом ящике",
                    rarity: "token-amber"
                });
            } else if (p3.type === 'conn') {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "connections",
                        amount: p3.amount,
                        title: `Теневые связи: +${p3.amount} 🤝`,
                        sender: "Клуб Фортуны",
                        desc: "Контакты от Решалы. Распакуйте для получения связей ПодКлюч.",
                        badge: "СВЯЗИ"
                    });
                }
                rewardTokens.push({
                    icon: "🤝",
                    title: "Связи в Почту",
                    value: `+${p3.amount} Связь ПодКлюч`,
                    desc: "Посылка в Почтовом ящике",
                    rarity: "token-purple"
                });
            } else if (p3.type === 'cosmetic') {
                this._handleCosmeticPrize(p3, rewardTokens);
            }

            // ФИНАЛИЗАЦИЯ
            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (window.AudioFx) window.AudioFx.play('win');
            if (window.AudioFx) window.AudioFx.haptic('success');

            if (window.EventBus) {
                window.EventBus.emit('media:super_spin_prize', {
                    prize1: p1.type,
                    prize2: p2.type,
                    prize3: p3.type,
                    tokensCount: rewardTokens.length
                });
            }

            if (typeof openVerdictModal === 'function') {
                openVerdictModal(
                    "ТРОЙНОЙ КУШ СУПЕРВИЛСПИНА! 🎰",
                    "Все 3 награды успешно выданы: машины, ресурсы и деньги — в Почте, косметика активирована в профиле!",
                    true,
                    null,
                    null,
                    rewardTokens
                );
            }

            this.renderFortuneApp(document.getElementById('phoneAppContainer'));
        } catch (e) {
            console.error('[PhoneMedia] claimAllThreePrizes error:', e);
            if (typeof showToast === 'function') showToast(`❌ Ошибка выдачи призов: ${e.message}`);
            if (typeof saveState === 'function') saveState();
        }
    },

    _handleCosmeticPrize(p3, rewardTokens) {
        const category = p3.category;
        const itemId = p3.itemId;
        const emoji = p3.emoji || '🎨';
        const isExclusive = !!p3.isExclusive;

        if (typeof ThemeManager !== 'undefined' && typeof ThemeManager.grantCosmeticFromSpin === 'function') {
            let res = null;
            try {
                res = ThemeManager.grantCosmeticFromSpin(category, itemId);
            } catch (grantErr) {
                res = { success: false };
            }

            if (res && res.success && (!res.convertedToStars || res.convertedToStars === 0)) {
                const itemName = res.item?.name || p3.label || 'Косметика';

                rewardTokens.push({
                    icon: emoji,
                    title: isExclusive ? "🎰 ЭКСКЛЮЗИВ РАЗБЛОКИРОВАН!" : "Косметика разблокирована!",
                    value: itemName,
                    desc: "Открывается в «Стиле Перекупа» (телефон → Скин)",
                    rarity: isExclusive ? "token-amber" : "token-purple"
                });

                if (typeof showToast === 'function') {
                    showToast(`🎨 ${itemName} разблокирован!`);
                }

                if (window.EventBus) {
                    window.EventBus.emit('media:super_spin_cosmetic_granted', {
                        category, itemId, itemName, isExclusive
                    });
                }
                return;
            }

            if (res && res.success && res.convertedToStars > 0) {
                const starsAmount = res.convertedToStars;
                const itemName = res.item?.name || p3.label || 'Косметика';

                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "stars",
                        amount: starsAmount,
                        title: `Дубликат: ${itemName}`,
                        sender: "Клуб Фортуны",
                        desc: `Этот предмет у вас уже был в коллекции. Мы конвертировали награду в Stars — распакуйте в Почте.`,
                        badge: "STARS"
                    });
                } else {
                    if (!window.state.player) window.state.player = {};
                    window.state.player.stars = (window.state.player.stars || 0) + starsAmount;
                    if (typeof saveState === 'function') saveState();
                    if (typeof updateHeaderUI === 'function') updateHeaderUI();
                }

                rewardTokens.push({
                    icon: "💵",
                    title: "Дубликат → Stars",
                    value: `+${starsAmount} ⭐`,
                    desc: `${itemName} уже был в коллекции`,
                    rarity: "token-amber"
                });

                if (window.EventBus) {
                    window.EventBus.emit('media:super_spin_cosmetic_compensated', {
                        category, itemId, itemName, stars: starsAmount
                    });
                }
                return;
            }
        }

        const comp = 8;
        const itemName = p3.label || p3.name || 'Косметика';

        if (window.MoneyManager && typeof window.MoneyManager.earn === 'function') {
            try {
                window.MoneyManager.earn(comp, 'Компенсация за косметику', { currency: 'stars', silent: true });
            } catch (e) {
                if (!window.state.player) window.state.player = {};
                window.state.player.stars = (window.state.player.stars || 0) + comp;
            }
        } else {
            if (!window.state.player) window.state.player = {};
            window.state.player.stars = (window.state.player.stars || 0) + comp;
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();

        rewardTokens.push({
            icon: "⭐",
            title: "Компенсация в Stars",
            value: `+${comp} ⭐`,
            desc: `${itemName} — отправлена компенсация`,
            rarity: "token-amber"
        });

        if (window.EventBus) {
            window.EventBus.emit('media:super_spin_cosmetic_compensated', {
                category: p3.category,
                itemId: p3.itemId,
                itemName: itemName,
                stars: comp,
                isFallback: true
            });
        }
    },

    // 2.2. УЛИЧНАЯ ИГРА «НАПЁРСТКИ»
    renderThimblesContent(box) {
        if (!box) return;

        let curDay = window.state.player?.day || 1;
        let lastDay = window.state.player?.lastFreeSpinDay || 0;
        let canFree = lastDay < curDay;

        const st = this.thimblesState;
        let bet = st.currentBet;

        let cupsHtml = "";
        for (let i = 0; i < 3; i++) {
            let isWinner = (i === st.winningIndex);

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
                        <span class="color-amber font-bold">Коэффициент: x2.2 💰</span>
                    </div>
                    <div class="grid-4 mb-2">
                        <button onclick="PhoneMedia.setThimbleBet(10000)" class="btn ${bet === 10000 && !canFree ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">10k ₽</button>
                        <button onclick="PhoneMedia.setThimbleBet(25000)" class="btn ${bet === 25000 && !canFree ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">25k ₽</button>
                        <button onclick="PhoneMedia.setThimbleBet(50000)" class="btn ${bet === 50000 && !canFree ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">50k ₽</button>
                        <button onclick="PhoneMedia.setThimbleBet(100000)" class="btn ${bet === 100000 && !canFree ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">100k ₽</button>
                    </div>

                    <button onclick="PhoneMedia.startThimblesGame()" class="${canFree ? 'btn-green' : 'btn-amber'} w-full">
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
                    <div class="sub-label" style="font-size:9px;">Один клик решает всё. Выигрыш составит +${Math.round(bet * 2.2).toLocaleString()} ₽</div>
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
                    <span class="tag-badge bg-tag-amber">x2.2 КУШ</span>
                </div>
                <div class="seller-dialog-bubble my-1" style="margin:4px 0;">
                    <span class="seller-mood-icon">🧔</span>
                    <span class="seller-bubble-text" id="thimblesDialogueText">${st.message}</span>
                </div>
            </div>

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
        if (window.AudioFx) window.AudioFx.play('tick');
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));
    },

    startThimblesGame() {
        if (this._thimbleBetPending || this.thimblesState.phase === 'shuffling' || this.thimblesState.phase === 'showing') return;
        this._thimbleBetPending = true;

        try {
            let curDay = window.state.player?.day || 1;
            let lastDay = window.state.player?.lastFreeSpinDay || 0;
            let canFree = lastDay < curDay;

            let bet = this.thimblesState.currentBet;

            if (canFree) {
                this.thimblesState.isFreeGame = true;
                window.state.player.lastFreeSpinDay = curDay;
            } else {
                this.thimblesState.isFreeGame = false;

                if (window.MoneyManager) {
                    const ok = window.MoneyManager.spend(bet, 'Ставка в напёрстках');
                    if (!ok) {
                        if (typeof showToast === 'function') showToast(`Не хватает денег на ставку ${bet.toLocaleString()} ₽!`);
                        return;
                    }
                } else {
                    const cash = window.state.player?.cash || 0;
                    if (cash < bet) {
                        if (typeof showToast === 'function') showToast(`Не хватает денег на ставку ${bet.toLocaleString()} ₽!`);
                        return;
                    }
                    window.state.player.cash -= bet;
                    if (typeof logBankTransaction === 'function') logBankTransaction("Ставка в напёрстках", bet, false);
                }
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();

            const winIdx = Math.floor(Math.random() * 3);
            this.thimblesState.winningIndex = winIdx;
            this.thimblesState.selectedIndex = null;
            this.thimblesState.phase = 'showing';
            this.thimblesState.message = `«Вот он, родной, под напёрстком #${winIdx + 1}! Глаз не спускай!»`;

            if (window.AudioFx) window.AudioFx.play('tick');
            if (window.AudioFx) window.AudioFx.haptic('medium');
            this.renderFortuneApp(document.getElementById('phoneAppContainer'));

            if (window.EventBus) {
                window.EventBus.emit('media:thimbles_started', { bet, isFree: canFree, winningIndex: winIdx });
            }

            setTimeout(() => {
                this.runThimblesShuffle();
            }, 1100);
        } finally {
            this._thimbleBetPending = false;
        }
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
            if (window.AudioFx) window.AudioFx.play('tick');

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

                for (let i = 0; i < 3; i++) {
                    const cupEl = document.getElementById(`thimbleCup_${i}`);
                    if (cupEl) cupEl.style.transform = 'none';
                }

                this.thimblesState.phase = 'guess';
                this.thimblesState.message = "«Всё, стоп игра! Укажи пальцем, где лежит шарик!»";
                if (window.AudioFx) window.AudioFx.haptic('warning');
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
            let winCash = isFree ? 25000 : Math.round(bet * 2.2);

            if (typeof window.pushToMailbox === 'function') {
                window.pushToMailbox({
                    type: "cash",
                    amount: winCash,
                    title: `Выигрыш в напёрстках: +${winCash.toLocaleString()} ₽`,
                    sender: "Мастер Ашот (Вокзал)",
                    desc: `Чистый куш за победу в напёрстках! Распакуйте посылку в Почте для зачисления на счёт.`,
                    badge: "КУШ"
                });
            } else {
                if (window.MoneyManager) {
                    window.MoneyManager.earn(winCash, 'Выигрыш в напёрстках');
                } else {
                    window.state.player.cash = (window.state.player.cash || 0) + winCash;
                }
            }

            if (typeof addXp === 'function') addXp(25);

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();

            this.thimblesState.message = `«Ай, красава! Глаз-алмаз! Забирай свои +${winCash.toLocaleString()} ₽ в Почте!»`;
            if (window.AudioFx) window.AudioFx.play('win');
            if (window.AudioFx) window.AudioFx.haptic('success');

            if (window.EventBus) {
                window.EventBus.emit('media:thimbles_win', { winCash, bet, isFree, chosenIdx });
            }

            if (typeof openVerdictModal === 'function') {
                openVerdictModal(
                    "ПОБЕДА В НАПЁРСТКАХ! 🥤",
                    `Вы раскусили фокус Алика и нашли шарик под напёрстком #${chosenIdx + 1}!\nВыигрыш (+${winCash.toLocaleString()} ₽) отправлен в вашу Почту!`,
                    true,
                    winCash
                );
            }
        } else {
            this.thimblesState.message = `«Мимо, перекуп! Шарик-то был под #${this.thimblesState.winningIndex + 1}! В следующий раз повезёт.»`;
            if (window.AudioFx) window.AudioFx.play('error');
            if (window.AudioFx) window.AudioFx.haptic('error');

            if (typeof showToast === 'function') {
                showToast(`Мимо! Шарик был под #${this.thimblesState.winningIndex + 1}.`);
            }

            if (window.EventBus) {
                window.EventBus.emit('media:thimbles_lose', { bet, isFree, chosenIdx, actualIdx: this.thimblesState.winningIndex });
            }
        }

        this.renderFortuneApp(document.getElementById('phoneAppContainer'));
    }
};

window.PhoneMedia = PhoneMedia;

console.log('[📻 phone-media v3.4.0 PRO-BALANCE] Уровневый дроп СуперВилспина и реалистичные куши активированы ✓');

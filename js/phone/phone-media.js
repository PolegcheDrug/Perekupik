// ========================================================
// js/phone/phone-media.js — МЕДИА, РАДИО, НАПЁРСТКИ И СУПЕРВИЛСПИН (v3.1.2)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v3.1.2 (ФИКС ПОВТОРНОГО ВКЛЮЧЕНИЯ И ПАУЗЫ):
//   - Убрано разрушительное removeAttribute('src'), ломавшее аудиотракт браузера
//   - Корректная пауза через стандартный pause() с сохранением User Gesture Context
//   - При повторном старте поток обновляется на актуальный Live-стрим без задержек
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
                // ПАУЗА: просто останавливаем воспроизведение, не ломая источник
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
                // В ЭФИР: подключаемся к прямому эфиру
                this.radioLoading = true;
                this.syncRadioUI();

                // Обновляем ссылку на поток для перехода к текущему моменту прямого эфира
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
        currentBet: 50000,
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
                costCash: 150000,
                costStars: 60,
                costTickets: 5,
                canFreeDaily: false,
                starRate
            };
        }

        return {
            costCash: Number(cfg.costCash) || 150000,
            costStars: Number(cfg.costStars) || 60,
            costTickets: Number(cfg.costTickets) || 5,
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
                    Каждое вращение активирует <b>все 3 слота одновременно</b>. Все выигранные призы, машины и <b>косметика профиля</b> доставляются на вашу <b>Почту</b> или активируются сразу!
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
                    🎰 = глитч-эксклюзив (только за билеты в каталоге стиля)
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

            const tiers = (typeof SUPER_SPIN_TIERS !== 'undefined') ? SUPER_SPIN_TIERS : {
                reelCars: [{ type: "cash", name: "100k ₽", emoji: "💰", amount: 100000 }],
                reelResources: [{ type: "cash", label: "150k ₽", amount: 150000 }],
                reelExclusives: [{ type: "stars", label: "25 ⭐", amount: 25 }]
            };

            const pool1 = tiers.reelCars || [];
            const pool2 = tiers.reelResources || [];
            const pool3 = tiers.reelExclusives || [];

            if (pool1.length === 0 || pool2.length === 0 || pool3.length === 0) {
                console.error('[PhoneMedia] Пустые пулы призов');
                this.isSuperSpinning = false;
                if (typeof showToast === 'function') showToast("❌ Ошибка конфигурации призов");
                return;
            }

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
                    power: p1.power || 100,
                    basePrice: p1.basePrice || 150000,
                    price: p1.basePrice || 150000,
                    marketValue: Math.round((p1.basePrice || 150000) * 1.15),
                    img: mainImg,
                    images: carGallery,
                    fallback: fallbackImg,
                    plate: wonPlate,
                    customPlate: wonPlate,
                    condition: 85,
                    wear: { engine: 90, transmission: 90 },
                    isRegisteredOnPlayer: false,
                    ownershipDays: 0,
                    engineTemp: 90,
                    tireWear: 95,
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
            } else if (p1.type === 'xp_bundle') {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "xp",
                        amount: p1.amount || 150,
                        title: `Пакет Опыта (+${p1.amount || 150} XP)`,
                        sender: "Клуб Фортуны",
                        desc: "Грамота и авторитет перекупа. Распакуйте для получения уровня.",
                        badge: "ОПЫТ"
                    });
                }
                rewardTokens.push({
                    icon: "🎖️",
                    title: "Опыт в Почту",
                    value: `+${p1.amount || 150} XP`,
                    desc: "Посылка в Почтовом ящике",
                    rarity: "token-cyan"
                });
            }

            // 2. БАРАБАН 2: ВАЛЮТА И РЕСУРСЫ
            if (p2.type === 'cash' || p2.type === 'jackpot') {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "cash",
                        amount: p2.amount,
                        title: p2.type === 'jackpot' ? `💰 ДЖЕКПОТ ${p2.amount.toLocaleString()} ₽` : `Денежный перевод: +${p2.amount.toLocaleString()} ₽`,
                        sender: "Клуб Фортуны",
                        desc: "Денежный приз из барабана СуперВилспина. Распакуйте для зачисления на баланс.",
                        badge: p2.type === 'jackpot' ? "ДЖЕКПОТ" : "ВАЛЮТА"
                    });
                }
                rewardTokens.push({
                    icon: "💰",
                    title: p2.type === 'jackpot' ? "ДЖЕКПОТ в Почту" : "Деньги в Почту",
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
            } else if (p2.type === 'conn') {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "connections",
                        amount: p2.amount,
                        title: `Теневые связи: +${p2.amount} 🤝`,
                        sender: "Клуб Фортуны",
                        desc: "Контакты от Решалы. Распакуйте для получения связей ПодКлюч.",
                        badge: "СВЯЗИ"
                    });
                }
                rewardTokens.push({
                    icon: "🤝",
                    title: "Связи в Почту",
                    value: `+${p2.amount} Связь ПодКлюч`,
                    desc: "Посылка в Почтовом ящике",
                    rarity: "token-purple"
                });
            } else if (p2.type === 'xp') {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "xp",
                        amount: p2.amount,
                        title: `Пакет опыта: +${p2.amount} XP`,
                        sender: "Клуб Фортуны",
                        desc: "Распакуйте для зачисления опыта в авторитет.",
                        badge: "ОПЫТ"
                    });
                }
                rewardTokens.push({
                    icon: "🎖️",
                    title: "Опыт в Почту",
                    value: `+${p2.amount} XP`,
                    desc: "Посылка в Почтовом ящике",
                    rarity: "token-cyan"
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
            } else if (p3.type === 'plate') {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "plate",
                        plate: p3.plate,
                        title: `Госномер: ${p3.plate}`,
                        sender: "Клуб Фортуны",
                        desc: "Редкий архивный госномер РФ. Распакуйте для добавления в гараж.",
                        badge: "НОМЕР"
                    });
                }
                rewardTokens.push({
                    icon: "🏷️",
                    title: "Госномер в Почту",
                    value: p3.plate,
                    desc: "Посылка в Почтовом ящике",
                    rarity: "token-purple"
                });
            } else if (p3.type === 'mod_cert') {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "cash",
                        amount: p3.cashValue,
                        title: `Сертификат тюнинга: +${p3.cashValue.toLocaleString()} ₽`,
                        sender: "Клуб Фортуны",
                        desc: "Денежная выплата за сертификат Stage 2.",
                        badge: "ТЮНИНГ"
                    });
                }
                rewardTokens.push({
                    icon: "🔧",
                    title: "Сертификат в Почту",
                    value: `+${p3.cashValue.toLocaleString()} ₽`,
                    desc: "Посылка в Почтовом ящике",
                    rarity: "token-green"
                });
            } else if (p3.type === 'free_impound') {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "free_impound",
                        amount: 1,
                        title: "Амнистия ГИБДД",
                        sender: "Клуб Фортуны",
                        desc: "Официальный талон на бесплатную выдачу задержанного авто.",
                        badge: "ГИБДД"
                    });
                }
                rewardTokens.push({
                    icon: "👮",
                    title: "Амнистия в Почту",
                    value: "+1 Талон ГИБДД",
                    desc: "Посылка в Почтовом ящике",
                    rarity: "token-purple"
                });
            } else if (p3.type === 'cosmetic') {
                const category = p3.category;
                const itemId = p3.itemId;
                const emoji = p3.emoji || '🎨';
                const isExclusive = !!p3.isExclusive;

                if (typeof ThemeManager !== 'undefined' && typeof ThemeManager.grantCosmeticFromSpin === 'function') {
                    const res = ThemeManager.grantCosmeticFromSpin(category, itemId);

                    if (res && res.success) {
                        if (res.convertedToStars > 0) {
                            if (typeof window.pushToMailbox === 'function') {
                                window.pushToMailbox({
                                    type: "stars",
                                    amount: res.convertedToStars,
                                    title: `Дубликат: ${res.item.name}`,
                                    sender: "Клуб Фортуны",
                                    desc: `Этот предмет у вас уже был в коллекции. Мы конвертировали награду в Stars.`,
                                    badge: "STARS"
                                });
                            }
                            rewardTokens.push({
                                icon: "💵",
                                title: "Дубликат → Stars",
                                value: `+${res.convertedToStars} ⭐`,
                                desc: `${res.item.name} уже был в коллекции`,
                                rarity: "token-amber"
                            });
                        } else {
                            rewardTokens.push({
                                icon: emoji,
                                title: isExclusive ? "🎰 ГЛИТЧ РАЗБЛОКИРОВАН!" : "Косметика разблокирована!",
                                value: res.item.name,
                                desc: "Открывается в «Стиле Перекупа» (телефон → Скин)",
                                rarity: isExclusive ? "token-amber" : "token-purple"
                            });

                            if (typeof showToast === 'function') {
                                showToast(`🎨 ${res.item.name} разблокирован!`);
                            }
                        }
                    } else {
                        const comp = 15;
                        if (window.MoneyManager) {
                            window.MoneyManager.earn(comp, 'Компенсация за косметику', { currency: 'stars', silent: true });
                        } else {
                            window.state.player.stars = (window.state.player.stars || 0) + comp;
                        }
                        rewardTokens.push({
                            icon: "⭐",
                            title: "Компенсация",
                            value: `+${comp} ⭐`,
                            desc: "Косметика не найдена, выдана компенсация",
                            rarity: "token-amber"
                        });
                    }
                } else {
                    const comp = 15;
                    if (window.MoneyManager) {
                        window.MoneyManager.earn(comp, 'Компенсация (нет ThemeManager)', { currency: 'stars', silent: true });
                    } else {
                        window.state.player.stars = (window.state.player.stars || 0) + comp;
                    }
                    rewardTokens.push({
                        icon: "⭐",
                        title: "Компенсация (нет ThemeManager)",
                        value: `+${comp} ⭐`,
                        desc: "Косметика недоступна, выдана компенсация",
                        rarity: "token-amber"
                    });
                }
            }

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
        }
    },

    // ====================================================
    // 2.2. УЛИЧНАЯ ИГРА «НАПЁРСТКИ»
    // ====================================================
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
                        <span class="color-amber font-bold">Коэффициент: x2.5 💰</span>
                    </div>
                    <div class="grid-4 mb-2">
                        <button onclick="PhoneMedia.setThimbleBet(25000)" class="btn ${bet === 25000 && !canFree ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">25k ₽</button>
                        <button onclick="PhoneMedia.setThimbleBet(50000)" class="btn ${bet === 50000 && !canFree ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">50k ₽</button>
                        <button onclick="PhoneMedia.setThimbleBet(100000)" class="btn ${bet === 100000 && !canFree ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">100k ₽</button>
                        <button onclick="PhoneMedia.setThimbleBet(250000)" class="btn ${bet === 250000 && !canFree ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 2px;">250k ₽</button>
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
            let winCash = isFree ? 120000 : Math.round(bet * 2.5);

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

            if (typeof addXp === 'function') addXp(45);

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

console.log('[📻 phone-media v3.1.2] Корректная пауза и повторный запуск потока ✓');
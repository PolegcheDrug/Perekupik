// ========================================================
// js/phone-media.js — МЕДИА, РАДИО И ВИЛСПИНЫ PEREKUP OS (v0.4.6)
// Разработчики: Tak Toje, Max, Sergo, gemini
// Live-автомагнитола (17 потоков), VIP Колесо Фортуны,
// Супер Вилспин с комбинированной оплатой (₽ + ⭐) и лавка обмена
// ========================================================

const ELECTRONIC_RADIO_STATIONS = [
    // --- Сеть Radio Record ---
    { id: 'rec_main', name: 'Radio Record (Main)', network: 'Record', genre: 'EDM / Club Dance', stream: 'https://radiorecord.hostingradio.ru/rr_main96.aacp' },
    { id: 'rec_phonk', name: 'Record Phonk', network: 'Record', genre: 'Drift Phonk / Memphis', stream: 'https://radiorecord.hostingradio.ru/phonk96.aacp' },
    { id: 'rec_ps', name: 'Пиратская Станция', network: 'Record', genre: 'Drum & Bass / Jungle', stream: 'https://radiorecord.hostingradio.ru/ps96.aacp' },
    { id: 'rec_trap', name: 'Record Trap & Bass', network: 'Record', genre: 'Trap / Heavy Bass', stream: 'https://radiorecord.hostingradio.ru/trap96.aacp' },
    { id: 'rec_techno', name: 'Record Techno', network: 'Record', genre: 'Peak-Time Techno / Rave', stream: 'https://radiorecord.hostingradio.ru/techno96.aacp' },
    { id: 'rec_dub', name: 'Record Dubstep', network: 'Record', genre: 'Dubstep / Brostep', stream: 'https://radiorecord.hostingradio.ru/dub96.aacp' },
    { id: 'rec_synth', name: 'Record Synthwave', network: 'Record', genre: 'Retrowave / 80s Electro', stream: 'https://radiorecord.hostingradio.ru/synth96.aacp' },
    { id: 'rec_rus', name: 'Record Russian Mix', network: 'Record', genre: 'Русский Дэнс', stream: 'https://radiorecord.hostingradio.ru/rus96.aacp' },
    { id: 'rec_chill', name: 'Record Chill-Out', network: 'Record', genre: 'Lounge / Atmospheric', stream: 'https://radiorecord.hostingradio.ru/chil96.aacp' },

    // --- Альтернативные независимые электронные стримы ---
    { id: 'soma_defcon', name: 'DEF CON Radio (SomaFM)', network: 'SomaFM', genre: 'Cyberpunk / Dark Electronic', stream: 'https://ice1.somafm.com/defcon-128-mp3' },
    { id: 'soma_groove', name: 'Groove Salad (SomaFM)', network: 'SomaFM', genre: 'Downtempo / Ambient Electronic', stream: 'https://ice1.somafm.com/groovesalad-128-mp3' },
    { id: 'soma_trip', name: 'The Trip (SomaFM)', network: 'SomaFM', genre: 'Progressive House & Trance', stream: 'https://ice1.somafm.com/thetrip-128-mp3' },
    { id: 'soma_beat', name: 'Beat Blender (SomaFM)', network: 'SomaFM', genre: 'Deep House / Smooth Tech', stream: 'https://ice1.somafm.com/beatblender-128-mp3' },
    { id: 'soma_dub', name: 'Dub Step Beyond (SomaFM)', network: 'SomaFM', genre: 'Deep Dubstep / Sub-Bass', stream: 'https://ice1.somafm.com/dubstep-128-mp3' },
    { id: 'soma_space', name: 'Space Station (SomaFM)', network: 'SomaFM', genre: 'Midtempo Space Electronica', stream: 'https://ice1.somafm.com/spacestation-128-mp3' },
    { id: 'nightwave', name: 'Nightwave Plaza', network: 'Plaza.one', genre: 'Vaporwave / Future Funk', stream: 'https://radio.plaza.one/mp3' },
    { id: 'dfm_club', name: 'DFM Club Dance', network: 'DFM', genre: 'Club Electronic / House', stream: 'https://dfm.hostingradio.ru/dfm128.mp3' }
];

let recordAudioElement = null;
let currentStationIdx = 0;
let isRadioPlaying = false;
let isRadioLoading = false;
let radioVolume = 0.8;
let radioNetworkFilter = 'all';

function getRecordAudio() {
    if (!recordAudioElement) {
        recordAudioElement = new Audio();
        recordAudioElement.preload = "none";
        recordAudioElement.volume = radioVolume;

        recordAudioElement.addEventListener('playing', () => {
            isRadioPlaying = true;
            isRadioLoading = false;
            updateRadioPlaybackUI();
        });

        recordAudioElement.addEventListener('pause', () => {
            isRadioPlaying = false;
            isRadioLoading = false;
            updateRadioPlaybackUI();
        });

        recordAudioElement.addEventListener('waiting', () => {
            isRadioLoading = true;
            updateRadioPlaybackUI();
        });

        recordAudioElement.addEventListener('error', (e) => {
            console.warn("[Radio Audio Error]:", e);
            isRadioPlaying = false;
            isRadioLoading = false;
            updateRadioPlaybackUI();
            showToast("⚠️ Ошибка соединения с аудиопотоком станции");
        });
    }
    return recordAudioElement;
}

function updateRadioPlaybackUI() {
    const playBtn = document.getElementById('radioPlayPauseBtn');
    const statusText = document.getElementById('radioLiveStatus');
    const visualizer = document.getElementById('radioWaveVisualizer');
    const curStation = ELECTRONIC_RADIO_STATIONS[currentStationIdx];
    if (!curStation) return;

    if (playBtn) {
        if (isRadioLoading) {
            playBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> ЗАГРУЗКА...";
            playBtn.className = "btn btn-dark btn-sm";
        } else if (isRadioPlaying) {
            playBtn.innerHTML = "<i class='fa-solid fa-pause'></i> ПАУЗА";
            playBtn.className = "btn btn-amber btn-sm";
        } else {
            playBtn.innerHTML = "<i class='fa-solid fa-play'></i> СЛУШАТЬ";
            playBtn.className = "btn btn-green btn-sm";
        }
    }

    if (statusText) {
        if (isRadioLoading) {
            statusText.innerHTML = `<span class="color-amber font-bold"><i class="fa-solid fa-rotate fa-spin"></i> ПОДКЛЮЧЕНИЕ К ПОТОКУ...</span>`;
        } else if (isRadioPlaying) {
            statusText.innerHTML = `<span class="color-green font-bold"><i class="fa-solid fa-satellite-dish"></i> В ЭФИРЕ • Live Stream [${curStation.network}]</span>`;
        } else {
            statusText.innerHTML = `<span class="sub-label">ОСТАНОВЛЕНО</span>`;
        }
    }

    if (visualizer) {
        if (isRadioPlaying) visualizer.classList.add('playing');
        else visualizer.classList.remove('playing');
    }

    setTxt('radioCurrentTrackName', curStation.name);
    setTxt('radioCurrentGenre', `${curStation.genre} • ${curStation.network}`);
    setTxt('radioNetworkBadgeText', curStation.network.toUpperCase());
}

const PhoneMedia = {
    isSuperSpinning: false,

    renderRadioApp(container) {
        const curStation = ELECTRONIC_RADIO_STATIONS[currentStationIdx] || ELECTRONIC_RADIO_STATIONS[0];

        let visibleStations = ELECTRONIC_RADIO_STATIONS;
        if (radioNetworkFilter === 'Record') {
            visibleStations = ELECTRONIC_RADIO_STATIONS.filter(s => s.network === 'Record');
        } else if (radioNetworkFilter === 'SomaFM') {
            visibleStations = ELECTRONIC_RADIO_STATIONS.filter(s => s.network === 'SomaFM');
        } else if (radioNetworkFilter === 'Plaza_DFM') {
            visibleStations = ELECTRONIC_RADIO_STATIONS.filter(s => s.network === 'Plaza.one' || s.network === 'DFM');
        }

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-radio color-purple mr-1"></i> Авто-Магнитола Live</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body text-center">
                
                <div class="glass-card p-3 mb-2" style="background: radial-gradient(circle at 50% 0%, #1e1035 0%, #080d16 100%); border-color: rgba(192, 132, 252, 0.4); box-shadow: 0 0 20px rgba(192, 132, 252, 0.15);">
                    <div class="radio-cassette-glow mb-2">
                        <div class="radio-brand-badge" id="radioNetworkBadgeText">${curStation.network.toUpperCase()}</div>
                        <div id="radioWaveVisualizer" class="radio-equalizer-bars ${isRadioPlaying ? 'playing' : ''}">
                            <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                        </div>
                    </div>

                    <b class="color-cyan text-xs" style="font-size:14px;" id="radioCurrentTrackName">${curStation.name}</b>
                    <div class="sub-label mt-1 mb-2" id="radioCurrentGenre">${curStation.genre} • ${curStation.network}</div>
                    <div id="radioLiveStatus" class="mb-3">
                        ${isRadioPlaying ? `<span class="color-green font-bold"><i class="fa-solid fa-satellite-dish"></i> В ЭФИРЕ • Live Stream [${curStation.network}]</span>` : '<span class="sub-label">ОСТАНОВЛЕНО</span>'}
                    </div>

                    <div class="grid-3 mb-3" style="align-items:center;">
                        <button onclick="PhoneMedia.changeRadioStation(-1)" class="btn btn-dark btn-sm">
                            <i class="fa-solid fa-backward-step"></i> Назад
                        </button>
                        <button id="radioPlayPauseBtn" onclick="PhoneMedia.toggleRadioPlay()" class="btn ${isRadioPlaying ? 'btn-amber' : 'btn-green'} btn-sm">
                            <i class="fa-solid ${isRadioPlaying ? 'fa-pause' : 'fa-play'}"></i> ${isRadioPlaying ? 'ПАУЗА' : 'СЛУШАТЬ'}
                        </button>
                        <button onclick="PhoneMedia.changeRadioStation(1)" class="btn btn-dark btn-sm">
                            Вперёд <i class="fa-solid fa-forward-step"></i>
                        </button>
                    </div>

                    <div class="p-2" style="background: #090e18; border-radius: 10px; border: 1px solid var(--border-glass);">
                        <div class="flex-between text-xs mb-1">
                            <span class="sub-label"><i class="fa-solid fa-volume-high color-cyan"></i> Громкость:</span>
                            <b id="radioVolumeDisplay" class="color-cyan">${Math.round(radioVolume * 100)}%</b>
                        </div>
                        <input type="range" id="radioVolumeSlider" min="0" max="1" step="0.05" value="${radioVolume}" oninput="PhoneMedia.setRadioVolume(this.value)" style="width: 100%; accent-color: var(--cyan); cursor: pointer;">
                    </div>
                </div>

                <div class="grid-4 mb-2">
                    <button onclick="PhoneMedia.setRadioFilter('all')" class="btn ${radioNetworkFilter === 'all' ? 'btn-cyan' : 'btn-dark'} btn-sm">Все (17)</button>
                    <button onclick="PhoneMedia.setRadioFilter('Record')" class="btn ${radioNetworkFilter === 'Record' ? 'btn-cyan' : 'btn-dark'} btn-sm">Record</button>
                    <button onclick="PhoneMedia.setRadioFilter('SomaFM')" class="btn ${radioNetworkFilter === 'SomaFM' ? 'btn-cyan' : 'btn-dark'} btn-sm">SomaFM</button>
                    <button onclick="PhoneMedia.setRadioFilter('Plaza_DFM')" class="btn ${radioNetworkFilter === 'Plaza_DFM' ? 'btn-cyan' : 'btn-dark'} btn-sm">Plaza/DFM</button>
                </div>

                <div class="glass-card p-2 text-left" style="text-align: left;">
                    <div class="text-xs font-bold color-purple mb-2"><i class="fa-solid fa-list-music"></i> Каталог потоков:</div>
                    <div class="space-y-2" style="max-height: 190px; overflow-y: auto;">
                        ${visibleStations.map(s => {
                            const originalIdx = ELECTRONIC_RADIO_STATIONS.findIndex(orig => orig.id === s.id);
                            const isCurrent = originalIdx === currentStationIdx;
                            return `
                            <div onclick="PhoneMedia.selectExactStation(${originalIdx})" class="p-2 flex-between cursor-pointer station-row ${isCurrent ? 'active-station' : ''}" style="background: #090d16; border-radius: 8px; border: 1px solid ${isCurrent ? 'var(--cyan)' : 'var(--border-glass)'};">
                                <div>
                                    <div class="flex-gap" style="align-items:center;">
                                        <b class="text-xs ${isCurrent ? 'color-cyan' : ''}">${s.name}</b>
                                        <span class="tag-badge ${s.network === 'Record' ? 'bg-tag-red' : (s.network === 'SomaFM' ? 'bg-tag-amber' : 'bg-tag-purple')}" style="font-size:8px; padding:1px 4px;">${s.network}</span>
                                    </div>
                                    <div class="sub-label" style="font-size:9.5px;">${s.genre}</div>
                                </div>
                                ${isCurrent && isRadioPlaying ? '<span class="tag-badge bg-tag-green">ON AIR</span>' : '<i class="fa-solid fa-play text-xs color-sub"></i>'}
                            </div>`;
                        }).join('')}
                    </div>
                </div>

            </div>
        `;
    },

    setRadioFilter(filter) {
        radioNetworkFilter = filter;
        this.renderRadioApp(document.getElementById('phoneAppContainer'));
    },

    toggleRadioPlay() {
        const audio = getRecordAudio();
        const curStation = ELECTRONIC_RADIO_STATIONS[currentStationIdx];

        if (isRadioPlaying) {
            audio.pause();
            isRadioPlaying = false;
            isRadioLoading = false;
            tgHaptic('light');
            updateRadioPlaybackUI();
        } else {
            isRadioLoading = true;
            updateRadioPlaybackUI();

            if (audio.src !== curStation.stream) {
                audio.src = curStation.stream;
                audio.load();
            }

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    isRadioPlaying = true;
                    isRadioLoading = false;
                    tgHaptic('success');
                    showToast(`📻 В эфире: ${curStation.name}!`);
                    updateRadioPlaybackUI();
                }).catch(() => {
                    isRadioPlaying = false;
                    isRadioLoading = false;
                    updateRadioPlaybackUI();
                    showToast("Нажмите «СЛУШАТЬ» ещё раз");
                });
            }
        }
    },

    changeRadioStation(delta) {
        currentStationIdx = (currentStationIdx + delta + ELECTRONIC_RADIO_STATIONS.length) % ELECTRONIC_RADIO_STATIONS.length;
        const curStation = ELECTRONIC_RADIO_STATIONS[currentStationIdx];
        const audio = getRecordAudio();

        audio.src = curStation.stream;
        audio.load();

        if (isRadioPlaying) {
            isRadioLoading = true;
            updateRadioPlaybackUI();
            audio.play().then(() => {
                isRadioPlaying = true;
                isRadioLoading = false;
                updateRadioPlaybackUI();
            }).catch(() => {
                isRadioLoading = false;
                updateRadioPlaybackUI();
            });
        }

        tgHaptic('light');
        playSound('tick');
        showToast(`Переключено: ${curStation.name}`);
        this.renderRadioApp(document.getElementById('phoneAppContainer'));
    },

    selectExactStation(idx) {
        if (idx < 0 || idx >= ELECTRONIC_RADIO_STATIONS.length) return;
        currentStationIdx = idx;
        const curStation = ELECTRONIC_RADIO_STATIONS[currentStationIdx];
        const audio = getRecordAudio();

        audio.src = curStation.stream;
        audio.load();

        isRadioLoading = true;
        updateRadioPlaybackUI();

        audio.play().then(() => {
            isRadioPlaying = true;
            isRadioLoading = false;
            tgHaptic('success');
            showToast(`Включено: ${curStation.name}`);
            updateRadioPlaybackUI();
        }).catch(() => {
            isRadioPlaying = false;
            isRadioLoading = false;
            updateRadioPlaybackUI();
        });

        this.renderRadioApp(document.getElementById('phoneAppContainer'));
    },

    setRadioVolume(val) {
        radioVolume = parseFloat(val);
        const audio = getRecordAudio();
        audio.volume = radioVolume;
        const disp = document.getElementById('radioVolumeDisplay');
        if (disp) disp.innerText = `${Math.round(radioVolume * 100)}%`;
    },

    // ----------------------------------------------------
    // ФОРТУНА & СУПЕР ВИЛСПИН
    // ----------------------------------------------------
    renderFortuneApp(container) {
        let tickets = state.player?.superSpinTickets || 0;
        let stars = state.player?.stars || 0;
        let pDay = state.player?.day || 1;
        let lastSuperDay = state.player?.lastFreeSuperSpinDay || 0;
        let canFreeSuperSpin = lastSuperDay < pDay;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-clover color-amber mr-1"></i> Клуб Фортуны</div>
                <div class="text-xs color-amber font-bold">${stars} ⭐</div>
            </div>
            <div class="phone-app-body">
                
                <div class="glass-card mb-3 p-3" style="background: radial-gradient(circle at 50% 0%, #1e1338 0%, #090e18 100%); border: 1.5px solid var(--purple); box-shadow: 0 0 20px rgba(192,132,252,0.3);">
                    <div class="flex-between mb-2">
                        <div>
                            <b class="text-xs color-purple" style="font-size:13px;">🎰 СУПЕР ВИЛСПИН</b>
                            <div class="sub-label" style="font-size:9.5px;">Авто/Дроп + Ресурсы + Эксклюзивы!</div>
                        </div>
                        <span class="tag-badge ${canFreeSuperSpin ? 'bg-tag-green' : 'bg-tag-purple'}">
                            ${canFreeSuperSpin ? '🎁 1 БЕСПЛАТНЫЙ СПИН' : `Билетов: ${tickets} 🎟️`}
                        </span>
                    </div>

                    <div class="grid-3 my-2" style="gap:6px;">
                        <div class="p-2 text-center" id="superReel1" style="background:#090d16; border-radius:10px; border:1px solid rgba(0,242,254,0.3); min-height:85px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                            <div style="font-size:26px;">🚗</div>
                            <b class="text-xs color-cyan mt-1" id="reelTxt1">ТЕХНИКА / ДРОП</b>
                            <div class="sub-label" style="font-size:8px;">(Авто / Запчасти / Пусто)</div>
                        </div>

                        <div class="p-2 text-center" id="superReel2" style="background:#090d16; border-radius:10px; border:1px solid rgba(0,230,118,0.3); min-height:85px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                            <div style="font-size:26px;">⛽</div>
                            <b class="text-xs color-green mt-1" id="reelTxt2">РЕСУРСЫ</b>
                            <div class="sub-label" style="font-size:8px;">(Кэш / Бак / Талоны)</div>
                        </div>

                        <div class="p-2 text-center" id="superReel3" style="background:#090e18; border-radius:10px; border:1px solid rgba(255,179,0,0.3); min-height:85px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                            <div style="font-size:26px;">💎</div>
                            <b class="text-xs color-amber mt-1" id="reelTxt3">ЭКСКЛЮЗИВ</b>
                            <div class="sub-label" style="font-size:8px;">(Номера / Тюнинг / Штраф)</div>
                        </div>
                    </div>

                    <button id="btnLaunchSuperSpin" onclick="PhoneMedia.spinSuperWheelAction()" class="btn ${canFreeSuperSpin ? 'btn-green' : 'btn-purple'} btn-sm w-full mt-2">
                        🎰 ${canFreeSuperSpin ? 'КРУТИТЬ БЕСПЛАТНО (Суточный бонус 🎁)' : (tickets > 0 ? 'КРУТИТЬ (1 Билет 🎟️)' : 'КРУТИТЬ (250,000 ₽ + 25 ⭐)')}
                    </button>
                </div>

                <div class="glass-card text-center mb-3 p-2">
                    <b class="text-xs color-amber">🎡 VIP Колесо Фортуны (1 Сектор)</b>
                    <div class="wheel-stage-container my-1" style="transform: scale(0.82); margin: 0 auto;">
                        <div class="wheel-outer-ring">
                            <canvas id="wheelCanvas" width="560" height="560" class="neon-wheel-canvas"></canvas>
                            <div class="wheel-center-hub">⭐</div>
                        </div>
                        <div class="wheel-arrow-ticker">▼</div>
                    </div>
                    <div class="grid-2 mt-1">
                        <button id="btnWheelFree" onclick="spinWheelAction(true)" class="btn btn-green btn-sm">🎁 Бесплатно (00:00)</button>
                        <button id="btnWheelPaid" onclick="spinWheelAction(false)" class="btn btn-amber btn-sm">⭐ 25 Stars</button>
                    </div>
                </div>

                <div class="glass-card mb-3 p-2">
                    <div class="flex-between mb-2">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-store"></i> Лавка Фортуны & Обмен Валют</b>
                        <span class="sub-label" style="font-size:10px;">Конвертация топлива, денег и талонов</span>
                    </div>

                    <div class="space-y-2">
                        <div class="p-2 flex-between" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                            <div>
                                <b class="text-xs color-amber">⭐ Пак 25 Stars за Деньги</b>
                                <div class="sub-label" style="font-size:9.5px;">Конвертация оборотки в звезды</div>
                            </div>
                            <button onclick="PhoneMedia.exchangeForStars('cash', 250000, 25)" class="btn btn-amber btn-sm btn-auto">250,000 ₽</button>
                        </div>

                        <div class="p-2 flex-between" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                            <div>
                                <b class="text-xs color-cyan">⛽ Обмен 60 Бензина на 10 Stars</b>
                                <div class="sub-label" style="font-size:9.5px;">Слив топлива перекупа в валюту</div>
                            </div>
                            <button onclick="PhoneMedia.exchangeForStars('fuel', 60, 10)" class="btn btn-cyan btn-sm btn-auto">-60 ⛽</button>
                        </div>

                        <div class="p-2 flex-between" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                            <div>
                                <b class="text-xs color-purple">🎟️ Обмен 20 Талонов на 15 Stars</b>
                                <div class="sub-label" style="font-size:9.5px;">Обмен неиспользованных пропусков</div>
                            </div>
                            <button onclick="PhoneMedia.exchangeForStars('tickets', 20, 15)" class="btn btn-purple btn-sm btn-auto">-20 🎟️</button>
                        </div>

                        <!-- ЕДИНАЯ КОМБИНИРОВАННАЯ ПОКУПКА БИЛЕТА (РУБЛИ + ЗВЁЗДЫ) -->
                        <div class="p-2 flex-between" style="background:#090e18; border-radius:8px; border:1px solid rgba(0, 230, 118, 0.25);">
                            <div>
                                <b class="text-xs color-green"><i class="fa-solid fa-ticket"></i> 1х Билет Супер Вилспина</b>
                                <div class="sub-label" style="font-size:9.5px;">Комбинированная стоимость: <b>250k ₽ + 25 ⭐</b></div>
                            </div>
                            <button onclick="PhoneMedia.buySuperSpinTicket()" class="btn btn-green btn-sm btn-auto">
                                Купить (250k ₽ + 25 ⭐)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (typeof initWheelModule === 'function') initWheelModule();
    },

    exchangeForStars(type, cost, gainStars) {
        if (type === 'cash') {
            let cash = state.player?.cash || 0;
            if (cash < cost) return showToast("Не хватает денег для обмена!");
            state.player.cash -= cost;
        } else if (type === 'fuel') {
            let fuel = state.player?.fuel || 0;
            if (fuel < cost) return showToast("Не хватает топлива в баке!");
            state.player.fuel -= cost;
        } else if (type === 'tickets') {
            let tck = state.player?.expressTickets || 0;
            if (tck < cost) return showToast("Не хватает талонов для обмена!");
            state.player.expressTickets -= cost;
        }

        state.player.stars = (state.player.stars || 0) + gainStars;
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Обмен успешен! Получено +${gainStars} Stars ⭐!`);
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));
    },

    // КОМБИНИРОВАННАЯ ПОКУПКА БИЛЕТА (250,000 ₽ + 25 ⭐)
    buySuperSpinTicket() {
        const costCash = 250000;
        const costStars = 25;

        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;

        if (cash < costCash) {
            return showToast(`Не хватает рублей! Нужно ${costCash.toLocaleString()} ₽.`);
        }
        if (stars < costStars) {
            return showToast(`Не хватает звёзд! Нужно ${costStars} ⭐ Stars.`);
        }

        state.player.cash -= costCash;
        state.player.stars -= costStars;
        state.player.superSpinTickets = (state.player.superSpinTickets || 0) + 1;

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast("Билет «Супер Вилспин» успешно приобретён за 250,000 ₽ + 25 ⭐!");
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));
    },

    spinSuperWheelAction() {
        if (this.isSuperSpinning) return;

        let tickets = state.player?.superSpinTickets || 0;
        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;
        let pDay = state.player?.day || 1;
        let lastSuperDay = state.player?.lastFreeSuperSpinDay || 0;
        let isFree = lastSuperDay < pDay;

        if (isFree) {
            state.player.lastFreeSuperSpinDay = pDay;
        } else if (tickets > 0) {
            state.player.superSpinTickets -= 1;
        } else if (cash >= 250000 && stars >= 25) {
            state.player.cash -= 250000;
            state.player.stars -= 25;
        } else {
            return showToast("Нужен 1 Билет или (250,000 ₽ + 25 ⭐ Stars)!");
        }

        this.isSuperSpinning = true;
        playSound('tick');
        tgHaptic('medium');

        const r1 = document.getElementById('reelTxt1');
        const r2 = document.getElementById('reelTxt2');
        const r3 = document.getElementById('reelTxt3');
        const btn = document.getElementById('btnLaunchSuperSpin');
        if (btn) btn.disabled = true;

        let spinAnim = setInterval(() => {
            if (r1) r1.innerText = ["Пусто", "ВАЗ-2107", "Колодки", "Nexia", "Polo Sedan"][Math.floor(Math.random() * 5)];
            if (r2) r2.innerText = ["25,000 ₽", "35 ⛽ Бак", "60,000 ₽", "10 🎟️ Талонов", "150,000 ₽"][Math.floor(Math.random() * 5)];
            if (r3) r3.innerText = ["В777ВВ 77", "10 ⭐ Stars", "Stage 2 Чип", "Без спецприза", "Штраф"][Math.floor(Math.random() * 5)];
            playSound('tick');
        }, 100);

        setTimeout(() => {
            clearInterval(spinAnim);
            this.isSuperSpinning = false;
            if (btn) btn.disabled = false;

            const tiers = typeof SUPER_SPIN_TIERS !== 'undefined' ? SUPER_SPIN_TIERS : {
                reelCars: [{ type: "empty", name: "Ничего" }],
                reelResources: [{ type: "cash", label: "25,000 ₽", amount: 25000 }],
                reelExclusives: [{ type: "none", label: "Без спецприза" }]
            };

            const drop1 = tiers.reelCars[Math.floor(Math.random() * tiers.reelCars.length)];
            const drop2 = tiers.reelResources[Math.floor(Math.random() * tiers.reelResources.length)];
            const drop3 = tiers.reelExclusives[Math.floor(Math.random() * tiers.reelExclusives.length)];

            let resText1 = "";
            if (drop1.type === 'car') {
                let maxSlots = getTotalGarageSlots();
                let curSlots = state.garage ? state.garage.length : 0;
                let wonPlate = (typeof generateCoolPlate === 'function') ? generateCoolPlate() : "ТРАНЗИТ";
                let wonCar = {
                    id: "super_car_" + Date.now(),
                    name: drop1.name,
                    type: drop1.category || 'economy',
                    power: drop1.power || 75,
                    basePrice: drop1.basePrice || 100000,
                    price: drop1.basePrice || 100000,
                    marketValue: Math.round((drop1.basePrice || 100000) * 1.1),
                    img: `assets/cars/${drop1.category || 'economy'}/car.jpg`,
                    plate: wonPlate,
                    customPlate: wonPlate,
                    condition: 85,
                    wear: { engine: 85, transmission: 85 },
                    isRegisteredOnPlayer: false,
                    ownershipDays: 0,
                    engineTemp: 90,
                    tireWear: 90,
                    tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 }
                };

                if (curSlots < maxSlots) {
                    if (!state.garage) state.garage = [];
                    state.garage.push(wonCar);
                    resText1 = `🚗 ${wonCar.name} получен в гараж!`;
                } else {
                    state.player.cash = (state.player.cash || 0) + wonCar.basePrice;
                    resText1 = `🚗 ${wonCar.name} (Гараж полон: компенсация +${wonCar.basePrice.toLocaleString()} ₽)`;
                }
            } else if (drop1.type === 'part') {
                state.player.cash = (state.player.cash || 0) + drop1.cashValue;
                resText1 = `📦 ${drop1.name} (Сдано за +${drop1.cashValue.toLocaleString()} ₽)`;
            } else {
                resText1 = `💨 Барабан 1: Пустой сектор`;
            }

            let resText2 = "";
            if (drop2.type === 'cash' || drop2.type === 'jackpot') {
                state.player.cash = (state.player.cash || 0) + drop2.amount;
                resText2 = `💰 +${drop2.amount.toLocaleString()} ₽`;
            } else if (drop2.type === 'fuel') {
                state.player.fuel = Math.min(100, (state.player.fuel || 0) + drop2.amount);
                resText2 = `⛽ +${drop2.amount} Топлива`;
            } else if (drop2.type === 'tickets') {
                state.player.expressTickets = (state.player.expressTickets || 0) + drop2.amount;
                resText2 = `🎟️ +${drop2.amount} Талонов`;
            } else if (drop2.type === 'conn') {
                state.player.connections = (state.player.connections || 0) + drop2.amount;
                resText2 = `🤝 +${drop2.amount} Связь`;
            }

            let resText3 = "";
            if (drop3.type === 'stars') {
                state.player.stars = (state.player.stars || 0) + drop3.amount;
                resText3 = `⭐ +${drop3.amount} Stars`;
            } else if (drop3.type === 'plate') {
                if (!state.ownedPlates) state.ownedPlates = [];
                state.ownedPlates.push(drop3.plate);
                resText3 = `🏷️ Номер «${drop3.plate}»`;
            } else if (drop3.type === 'mod_cert') {
                state.player.cash = (state.player.cash || 0) + drop3.cashValue;
                resText3 = `🚀 ${drop3.label} (+${drop3.cashValue.toLocaleString()} ₽)`;
            } else if (drop3.type === 'fine') {
                state.player.cash = Math.max(0, (state.player.cash || 0) - drop3.penaltyCash);
                resText3 = `🚨 Штраф ДПС (-${drop3.penaltyCash.toLocaleString()} ₽)`;
            } else {
                resText3 = `⚪ Без спецприза`;
            }

            if (r1) r1.innerText = drop1.name;
            if (r2) r2.innerText = drop2.label;
            if (r3) r3.innerText = drop3.label;

            saveState();
            updateHeaderUI();
            playSound('win');
            tgHaptic('success');

            openVerdictModal(
                "СУПЕР ВИЛСПИН! 🎉",
                `Результат вращения барабанов:\n\n1. ${resText1}\n2. ${resText2}\n3. ${resText3}`,
                true
            );

            PhoneMedia.renderFortuneApp(document.getElementById('phoneAppContainer'));
        }, 2600);
    }
};

window.PhoneMedia = PhoneMedia;
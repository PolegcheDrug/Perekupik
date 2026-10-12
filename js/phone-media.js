// ========================================================
// js/phone-media.js — МЕДИА, РАДИО И ФОРТУНА PEREKUP OS (v0.6.7)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Live-автомагнитола (17 электронных потоков), VIP Колесо Фортуны,
// неоновый Супер Вилспин с электрическими эффектами барабанов.
// Исправлен баг Canvas-отрисовки: больше никакого черного экрана!
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

// Состояние вращения Колеса Фортуны
let wheelRotationAngle = 0;
let isClassicWheelSpinning = false;

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
            if (typeof showToast === 'function') showToast("⚠️ Ошибка соединения с аудиопотоком станции");
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

    const tName = document.getElementById('radioCurrentTrackName');
    const tGenre = document.getElementById('radioCurrentGenre');
    const tBadge = document.getElementById('radioNetworkBadgeText');

    if (tName) tName.innerText = curStation.name;
    if (tGenre) tGenre.innerText = `${curStation.genre} • ${curStation.network}`;
    if (tBadge) tBadge.innerText = curStation.network.toUpperCase();
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
            if (typeof tgHaptic === 'function') tgHaptic('light');
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
                    if (typeof tgHaptic === 'function') tgHaptic('success');
                    if (typeof showToast === 'function') showToast(`📻 В эфире: ${curStation.name}!`);
                    updateRadioPlaybackUI();
                }).catch(() => {
                    isRadioPlaying = false;
                    isRadioLoading = false;
                    updateRadioPlaybackUI();
                    if (typeof showToast === 'function') showToast("Нажмите «СЛУШАТЬ» ещё раз");
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

        if (typeof tgHaptic === 'function') tgHaptic('light');
        if (typeof playSound === 'function') playSound('tick');
        if (typeof showToast === 'function') showToast(`Переключено: ${curStation.name}`);
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
            if (typeof tgHaptic === 'function') tgHaptic('success');
            if (typeof showToast === 'function') showToast(`Включено: ${curStation.name}`);
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
    // КЛУБ ФОРТУНЫ & ИСПРАВЛЕННОЕ КОЛЕСО
    // ----------------------------------------------------
    renderFortuneApp(container) {
        let tickets = state.player?.superSpinTickets || 0;
        let stars = state.player?.stars || 0;
        let pDay = state.player?.day || 1;
        let lastSuperDay = state.player?.lastFreeSuperSpinDay || 0;
        let canFreeSuperSpin = lastSuperDay < pDay;
        let lastClassicDay = state.player?.lastFreeSpinDay || 0;
        let canFreeClassic = lastClassicDay < pDay;
        let freeImpound = state.player?.freeImpoundPasses || 0;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-clover color-amber mr-1"></i> Клуб Фортуны VIP</div>
                <div class="text-xs color-amber font-bold">${stars} ⭐</div>
            </div>
            <div class="phone-app-body">
                
                <!-- БАННЕР ДЖЕКПОТОВ -->
                <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(255,179,0,0.14), #090e18); border-color: rgba(255,179,0,0.35);">
                    <div>
                        <div class="text-xs font-bold color-amber"><i class="fa-solid fa-sparkles"></i> Джекпоты сезона:</div>
                        <div class="sub-label" style="font-size:9.5px;">Porsche 911 GT3 RS • Номера 777 • Талоны ГИБДД</div>
                    </div>
                    ${freeImpound > 0 ? `<span class="tag-badge bg-tag-purple"><i class="fa-solid fa-ticket"></i> ${freeImpound} талонов штрафстоянки</span>` : `<span class="tag-badge bg-tag-amber">Шанс х3</span>`}
                </div>

                <!-- 1. СУПЕР ВИЛСПИН -->
                <div class="glass-card mb-3 p-3 super-spin-showcase-box" style="background: radial-gradient(circle at 50% 0%, #1e1338 0%, #090e18 100%); border: 1.5px solid var(--purple); box-shadow: 0 0 25px rgba(192,132,252,0.35);">
                    <div class="flex-between mb-2">
                        <div>
                            <b class="text-xs color-purple" style="font-size:13px;"><i class="fa-solid fa-bolt-lightning mr-1"></i> СУПЕР ВИЛСПИН</b>
                            <div class="sub-label" style="font-size:9.5px;">Авто/Дроп + Ресурсы/XP + Эксклюзивы</div>
                        </div>
                        <span class="tag-badge ${canFreeSuperSpin ? 'bg-tag-green' : 'bg-tag-purple'}">
                            ${canFreeSuperSpin ? '🎁 1 БЕСПЛАТНЫЙ СПИН' : `Билетов: ${tickets} 🎟️`}
                        </span>
                    </div>

                    <div class="grid-3 my-2" style="gap:6px;">
                        <div class="p-2 text-center fortune-reel-card" id="superReel1">
                            <div style="font-size:26px;">🏎️</div>
                            <b class="text-xs color-cyan mt-1" id="reelTxt1">ТЕХНИКА & ДРОП</b>
                            <div class="sub-label" style="font-size:8px;">(Авто / Запчасти / Талоны)</div>
                        </div>

                        <div class="p-2 text-center fortune-reel-card" id="superReel2">
                            <div style="font-size:26px;">💰</div>
                            <b class="text-xs color-green mt-1" id="reelTxt2">РЕСУРСЫ & ОПЫТ</b>
                            <div class="sub-label" style="font-size:8px;">(Кэш / XP / Полный Бак)</div>
                        </div>

                        <div class="p-2 text-center fortune-reel-card" id="superReel3">
                            <div style="font-size:26px;">💎</div>
                            <b class="text-xs color-amber mt-1" id="reelTxt3">ЭКСКЛЮЗИВ</b>
                            <div class="sub-label" style="font-size:8px;">(Блатные 777 / Чип Stage)</div>
                        </div>
                    </div>

                    <button id="btnLaunchSuperSpin" onclick="PhoneMedia.spinSuperWheelAction()" class="btn ${canFreeSuperSpin ? 'btn-green' : 'btn-purple'} btn-sm w-full mt-2" style="box-shadow: 0 0 16px rgba(192,132,252,0.4);">
                        🎰 ${canFreeSuperSpin ? 'КРУТИТЬ БЕСПЛАТНО (Суточный бонус 🎁)' : (tickets > 0 ? 'КРУТИТЬ (1 Билет 🎟️)' : 'КРУТИТЬ (300,000 ₽ + 30 ⭐)')}
                    </button>
                    
                    <div class="flex-between mt-2 pt-1 text-xs" style="border-top: 1px dashed rgba(255,255,255,0.08);">
                        <span class="sub-label" style="font-size:9px;">Билеты можно купить в Во-Банке</span>
                        <a href="javascript:void(0)" onclick="PhoneManager.openApp('bank'); setTimeout(() => AppBank.switchTab('exchange'), 100);" class="color-cyan font-bold" style="font-size:9.5px; text-decoration:none;">
                            Купить билеты в Банке →
                        </a>
                    </div>
                </div>

                <!-- 2. КЛАССИЧЕСКОЕ VIP КОЛЕСО ФОРТУНЫ (С ГАРАНТИРОВАННОЙ ОТРИСОВКОЙ ХОЛСТА) -->
                <div class="glass-card text-center mb-3 p-3" style="background:#090e18; border-color: rgba(255,179,0,0.35);">
                    <div class="flex-between mb-2">
                        <b class="text-xs color-amber" style="font-size:13px;"><i class="fa-solid fa-dharmachakra"></i> Классическое VIP Колесо</b>
                        <span class="tag-badge bg-tag-amber">1 Сектор</span>
                    </div>

                    <div style="position:relative; width: 260px; height: 260px; margin: 0 auto; display:flex; align-items:center; justify-content:center;">
                        <!-- Стрелка-указатель сверху -->
                        <div id="wheelPointerTicker" style="position:absolute; top:-8px; left:50%; transform:translateX(-50%); z-index:10; font-size:22px; color:#ffd700; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.8));">
                            ▼
                        </div>

                        <!-- Сам холст колеса -->
                        <canvas id="wheelCanvas" width="520" height="520" style="width:250px; height:250px; border-radius:50%; box-shadow: 0 0 25px rgba(255,215,0,0.25); border: 3px solid #ffd700; background:#070b14;"></canvas>

                        <!-- Центральная втулка -->
                        <div style="position:absolute; width:44px; height:44px; border-radius:50%; background:radial-gradient(circle, #ffd700, #b45309); border:2px solid #fff; box-shadow: 0 0 10px rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; color:#000; font-size:18px; z-index:5;">
                            ⭐
                        </div>
                    </div>

                    <div class="grid-2 mt-3">
                        <button id="btnWheelFree" onclick="PhoneMedia.spinClassicWheel(true)" class="btn btn-green btn-sm" ${!canFreeClassic ? 'disabled' : ''}>
                            🎁 ${canFreeClassic ? 'Бесплатно (Готово)' : 'Бесплатно (в 00:00)'}
                        </button>
                        <button id="btnWheelPaid" onclick="PhoneMedia.spinClassicWheel(false)" class="btn btn-amber btn-sm" ${stars < 30 ? 'disabled' : ''}>
                            ⭐ 30 Stars
                        </button>
                    </div>
                </div>

            </div>
        `;

        requestAnimationFrame(() => {
            initWheelModule();
        });
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
        } else if (cash >= 300000 && stars >= 30) {
            state.player.cash -= 300000;
            state.player.stars -= 30;
        } else {
            return showToast("Нужен 1 Билет или (300,000 ₽ + 30 ⭐ Stars)!");
        }

        this.isSuperSpinning = true;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('medium');

        const r1 = document.getElementById('reelTxt1');
        const r2 = document.getElementById('reelTxt2');
        const r3 = document.getElementById('reelTxt3');
        const box1 = document.getElementById('superReel1');
        const box2 = document.getElementById('superReel2');
        const box3 = document.getElementById('superReel3');
        const btn = document.getElementById('btnLaunchSuperSpin');
        if (btn) btn.disabled = true;

        if (box1) box1.classList.add('reel-spinning-anim');
        if (box2) box2.classList.add('reel-spinning-anim');
        if (box3) box3.classList.add('reel-spinning-anim');

        let spinAnim = setInterval(() => {
            if (r1) r1.innerText = ["ВАЗ-2107", "Талон ГИБДД", "Polo Sedan", "Launch Pro", "+150 XP"][Math.floor(Math.random() * 5)];
            if (r2) r2.innerText = ["150,000 ₽", "Полный Бак", "400,000 ₽", "+80 XP", "25 Талонов"][Math.floor(Math.random() * 5)];
            if (r3) r3.innerText = ["В777ВВ 77", "50 ⭐ Stars", "Stage 2 Чип", "Е777КХ 777", "Штраф"][Math.floor(Math.random() * 5)];
            if (typeof playSound === 'function') playSound('tick');
        }, 90);

        setTimeout(() => {
            clearInterval(spinAnim);
            this.isSuperSpinning = false;
            if (btn) btn.disabled = false;

            if (box1) box1.classList.remove('reel-spinning-anim');
            if (box2) box2.classList.remove('reel-spinning-anim');
            if (box3) box3.classList.remove('reel-spinning-anim');

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
                let maxSlots = typeof getTotalGarageSlots === 'function' ? getTotalGarageSlots() : 2;
                let curSlots = state.garage ? state.garage.length : 0;
                let wonPlate = (typeof generateCoolPlate === 'function') ? generateCoolPlate() : "ТРАНЗИТ";
                let baseP = drop1.basePrice || 100000;
                let marketP = Math.round(baseP * 1.35);

                let wonCar = {
                    id: "super_car_" + Date.now(),
                    name: drop1.name,
                    type: drop1.category || 'economy',
                    power: drop1.power || 75,
                    basePrice: baseP,
                    price: baseP,
                    baseMarketValue: marketP,
                    marketValue: marketP,
                    img: `assets/cars/${drop1.category || 'economy'}/car.jpg`,
                    plate: wonPlate,
                    customPlate: wonPlate,
                    condition: 90,
                    wear: { engine: 90, transmission: 90 },
                    isRegisteredOnPlayer: false,
                    ownershipDays: 0,
                    engineTemp: 90,
                    tireWear: 95,
                    tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 }
                };

                if (typeof recalculateCarMarketValue === 'function') {
                    recalculateCarMarketValue(wonCar);
                }

                if (curSlots < maxSlots) {
                    if (!state.garage) state.garage = [];
                    state.garage.push(wonCar);
                    resText1 = `🚗 ${wonCar.name} получен в гараж!`;
                } else {
                    let compensation = Math.round(wonCar.marketValue * 0.9);
                    state.player.cash = (state.player.cash || 0) + compensation;
                    resText1 = `🚗 ${wonCar.name} (Гараж полон: компенсация +${compensation.toLocaleString()} ₽)`;
                }
            } else if (drop1.type === 'free_impound') {
                state.player.freeImpoundPasses = (state.player.freeImpoundPasses || 0) + 1;
                resText1 = `🚔 Талон бесплатного забора со штрафстоянки получен!`;
            } else if (drop1.type === 'xp_bundle') {
                if (typeof addXp === 'function') addXp(drop1.amount || 150);
                resText1 = `🎖️ Пакет опыта перекупа (+${drop1.amount || 150} XP)!`;
            } else if (drop1.type === 'tool') {
                if (!state.player.tools) state.player.tools = {};
                state.player.tools[drop1.toolId] = true;
                resText1 = `📱 ${drop1.name} добавлен в арсенал!`;
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
            } else if (drop2.type === 'xp') {
                if (typeof addXp === 'function') addXp(drop2.amount || 80);
                resText2 = `🎖️ +${drop2.amount || 80} XP Опыта`;
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
            } else if (drop3.type === 'free_impound') {
                state.player.freeImpoundPasses = (state.player.freeImpoundPasses || 0) + 1;
                resText3 = `🎫 Талон забора со спецстоянки 🚔!`;
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

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

            if (typeof openVerdictModal === 'function') {
                openVerdictModal(
                    "СУПЕР ВИЛСПИН! 🎉",
                    `Результат вращения барабанов:\n\n1. ${resText1}\n2. ${resText2}\n3. ${resText3}`,
                    true
                );
            }

            this.renderFortuneApp(document.getElementById('phoneAppContainer'));
        }, 2200);
    },

    spinClassicWheel(isFree) {
        if (isClassicWheelSpinning) return;

        let stars = state.player?.stars || 0;
        let pDay = state.player?.day || 1;
        let lastClassicDay = state.player?.lastFreeSpinDay || 0;

        if (isFree) {
            if (lastClassicDay >= pDay) return showToast("Бесплатный спин уже использован! Ждите 00:00 🌙");
            state.player.lastFreeSpinDay = pDay;
        } else {
            if (stars < 30) return showToast("Нужно 30 Stars ⭐ для прокрута!");
            state.player.stars -= 30;
        }

        isClassicWheelSpinning = true;
        const btnFree = document.getElementById('btnWheelFree');
        const btnPaid = document.getElementById('btnWheelPaid');
        if (btnFree) btnFree.disabled = true;
        if (btnPaid) btnPaid.disabled = true;

        const sectors = (typeof WHEEL_SECTORS !== 'undefined' && Array.isArray(WHEEL_SECTORS))
            ? WHEEL_SECTORS
            : [
                { label: "+100k ₽", type: "cash", amount: 100000 },
                { label: "+15 ⭐", type: "stars", amount: 15 },
                { label: "Бак 100 ⛽", type: "fuel", amount: 100 },
                { label: "+200k ₽", type: "cash", amount: 200000 },
                { label: "+1 🤝", type: "conn", amount: 1 },
                { label: "ДЖЕКПОТ 1M", type: "jackpot", amount: 1000000 }
            ];

        const targetSectorIndex = Math.floor(Math.random() * sectors.length);
        const winningSector = sectors[targetSectorIndex];

        const sectorArc = (2 * Math.PI) / sectors.length;
        // Стрелка находится наверху: 3 * PI / 2 (270 градусов)
        const targetAngleAtTop = (3 * Math.PI / 2) - (targetSectorIndex * sectorArc + sectorArc / 2);
        const extraFullSpins = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
        const finalTargetRotation = wheelRotationAngle + extraFullSpins + ((targetAngleAtTop - (wheelRotationAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));

        let startTime = Date.now();
        let spinDuration = 4500;
        let startRotation = wheelRotationAngle;

        let spinInterval = setInterval(() => {
            let elapsed = Date.now() - startTime;
            let progress = Math.min(1, elapsed / spinDuration);
            // Плавное торможение кубической кривой
            let easeOut = 1 - Math.pow(1 - progress, 3);

            wheelRotationAngle = startRotation + (finalTargetRotation - startRotation) * easeOut;
            drawWheelAtAngle(wheelRotationAngle);

            if (Math.random() < 0.25 && typeof playSound === 'function') {
                playSound('tick');
            }

            if (progress >= 1) {
                clearInterval(spinInterval);
                isClassicWheelSpinning = false;
                wheelRotationAngle = finalTargetRotation % (2 * Math.PI);

                if (winningSector.type === 'cash' || winningSector.type === 'jackpot') {
                    state.player.cash = (state.player.cash || 0) + winningSector.amount;
                } else if (winningSector.type === 'stars') {
                    state.player.stars = (state.player.stars || 0) + winningSector.amount;
                } else if (winningSector.type === 'fuel') {
                    state.player.fuel = 100;
                } else if (winningSector.type === 'conn') {
                    state.player.connections = (state.player.connections || 0) + winningSector.amount;
                } else if (winningSector.type === 'tickets') {
                    state.player.expressTickets = (state.player.expressTickets || 0) + winningSector.amount;
                } else if (winningSector.type === 'impound') {
                    state.player.freeImpoundPasses = (state.player.freeImpoundPasses || 0) + 1;
                }

                if (typeof saveState === 'function') saveState();
                if (typeof updateHeaderUI === 'function') updateHeaderUI();
                if (typeof playSound === 'function') playSound('win');
                if (typeof tgHaptic === 'function') tgHaptic('success');

                if (typeof openVerdictModal === 'function') {
                    openVerdictModal("КОЛЕСО ФОРТУНЫ 🎡", `Стрелка остановилась на секторе:\n${winningSector.label}! Приз начислен.`, true);
                }

                this.renderFortuneApp(document.getElementById('phoneAppContainer'));
            }
        }, 16);
    }
};

// ========================================================
// НАДЕЖНЫЙ ОТРИСОВЩИК КОЛЕСА ФОРТУНЫ
// ========================================================
function initWheelModule() {
    drawWheelAtAngle(wheelRotationAngle);
}

function drawWheelAtAngle(rotationAngle) {
    const cvs = document.getElementById('wheelCanvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const sectors = (typeof WHEEL_SECTORS !== 'undefined' && Array.isArray(WHEEL_SECTORS) && WHEEL_SECTORS.length > 0)
        ? WHEEL_SECTORS
        : [
            { label: "+100k ₽", color: "#10b981", textColor: "#000" },
            { label: "+15 ⭐", color: "#f59e0b", textColor: "#000" },
            { label: "Бак 100 ⛽", color: "#0284c7", textColor: "#fff" },
            { label: "+200k ₽", color: "#059669", textColor: "#fff" },
            { label: "+1 🤝", color: "#9333ea", textColor: "#fff" },
            { label: "+25 🎟️", color: "#06b6d4", textColor: "#000" },
            { label: "+300k ₽", color: "#047857", textColor: "#fff" },
            { label: "+25 ⭐", color: "#d97706", textColor: "#000" },
            { label: "Талон ГИБДД 🚔", color: "#e11d48", textColor: "#fff" },
            { label: "ДЖЕКПОТ 1M", color: "#ffd700", textColor: "#000" }
        ];

    const totalSectors = sectors.length;
    const arc = (2 * Math.PI) / totalSectors;
    const cx = cvs.width / 2;
    const cy = cvs.height / 2;
    const radius = cx - 12;

    ctx.clearRect(0, 0, cvs.width, cvs.height);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationAngle);

    for (let i = 0; i < totalSectors; i++) {
        const startAngle = i * arc;
        const endAngle = startAngle + arc;
        const sec = sectors[i];

        // Сектор
        ctx.beginPath();
        ctx.fillStyle = sec.color || (i % 2 === 0 ? "#1e293b" : "#0f172a");
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.lineTo(0, 0);
        ctx.fill();

        // Неоновая разделительная линия
        ctx.strokeStyle = "rgba(255, 215, 0, 0.45)";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Отрисовка текста сектора
        const midAngle = startAngle + arc / 2;
        ctx.save();
        ctx.rotate(midAngle);

        ctx.font = "900 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillStyle = sec.textColor || "#ffffff";
        ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx.shadowBlur = 4;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(sec.label, radius - 24, 0);

        ctx.restore();
    }

    ctx.restore();
}

window.PhoneMedia = PhoneMedia;
window.initWheelModule = initWheelModule;
window.drawWheelAtAngle = drawWheelAtAngle;
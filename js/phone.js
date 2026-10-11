// ========================================================
// js/phone.js — ИНТЕРАКТИВНЫЙ СМАРТФОН «PerekupOS» (v0.4.6)
// Разработчики: Tak Toje, Max, Sergo, gemini
// Виджет бизнеса (по условию), изолированный План перекупа,
// карьерный Блокнот, онлайн радио, чаты и P2P биржа
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

const PhoneManager = {
    currentApp: null,
    unreadCount: 0,
    activeChatId: null,
    autodrotSubTab: 'market',
    autodrotP2PFilter: 'cars',
    streetSubTab: 'drift',
    bankSubTab: 'accounts',
    isSuperSpinning: false,

    defaultMessages: [
        {
            id: "sms_bank_welcome",
            sender: "💳 Во-Банк Онлайн",
            avatar: "🏦",
            preview: "Добро пожаловать в Во-Банк! Сейф активен (+3% в день).",
            time: "10:00",
            unread: true,
            chatHistory: [
                { from: "them", text: "Здравствуйте! Ваш сейф перекупа готов к приёму депозитов в приложении «Во-Банк». Каждый день вам начисляется +3% на остаток средств." },
                { from: "them", text: "Деньги в сейфе застрахованы от рэкета и уличных нападений на трассе." }
            ]
        },
        {
            id: "sms_street_boss",
            sender: "🏎️ Влад Стрит-Орг",
            avatar: "🏁",
            preview: "Техком RDS ужесточил правила. Проверь свой спек перед выездом!",
            time: "11:20",
            unread: true,
            chatHistory: [
                { from: "them", text: "Здорово! В RDS GP со 105 силами больше не суйся — судьи ставят баранку за распрямление в первой же дуге." },
                { from: "them", text: "Для слабых тачек открыт зимний паркинг ТЦ. В Европу и GP копи на турбо-мотор, каркас и слик!" }
            ]
        },
        {
            id: "sms_reshala_intro",
            sender: "🕵️‍♂️ Артур Решала",
            avatar: "🕶️",
            preview: "Связи наготове. Будут проблемы со штрафстоянкой или 12.5.1 — открывай приложение.",
            time: "09:45",
            unread: true,
            chatHistory: [
                { from: "them", text: "Привет. Номер мой в приложении есть. Любые вопросы с аннулированием учёта, крышей ГИБДД и лицензиями РАФ решаю за связи." },
                { from: "them", text: "Если попадется угнанная тачка — сделаем чистый VIN, не переживай." }
            ]
        },
        {
            id: "sms_scam_1",
            sender: "⚠️ Служба Безопасности",
            avatar: "🤖",
            preview: "С вашей карты зафиксирована попытка перевода 150,000 ₽!",
            time: "08:15",
            unread: true,
            isScam: true,
            scamCost: 50000,
            chatHistory: [
                { from: "them", text: "ВНИМАНИЕ! Подозрительная операция. Чтобы отменить перевод 150,000 ₽ на неизвестный счет, переведите 50,000 ₽ на безопасный резервный счет прямо сейчас!" }
            ]
        }
    ],

    init() {
        if (!state.player.phoneMessages || state.player.phoneMessages.length === 0) {
            state.player.phoneMessages = JSON.parse(JSON.stringify(this.defaultMessages));
        }
        if (state.player.streetCred === undefined) {
            state.player.streetCred = 100;
        }
        if (state.player.superSpinTickets === undefined) {
            state.player.superSpinTickets = 1;
        }
        if (!state.player.dailyQuests || state.player.dailyQuests.length === 0) {
            if (typeof refreshDailyQuestsList === 'function') {
                refreshDailyQuestsList();
            }
        }
        this.updateUnreadBadge();
        this.updatePhoneClock();
        setInterval(() => this.updatePhoneClock(), 1000);
    },

    updatePhoneClock() {
        const clockEl = document.getElementById('phoneStatusBarClock');
        if (!clockEl) return;
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        clockEl.innerText = `${hrs}:${mins}`;
    },

    updateUnreadBadge() {
        const messages = state.player?.phoneMessages || [];
        this.unreadCount = messages.filter(m => m.unread).length;

        const navBadge = document.getElementById('phoneNavBadge');
        if (navBadge) {
            if (this.unreadCount > 0) {
                navBadge.style.display = 'inline-flex';
                navBadge.innerText = this.unreadCount;
            } else {
                navBadge.style.display = 'none';
            }
        }

        const appSmsBadge = document.getElementById('phoneAppSmsBadge');
        if (appSmsBadge) {
            if (this.unreadCount > 0) {
                appSmsBadge.style.display = 'block';
                appSmsBadge.innerText = this.unreadCount;
            } else {
                appSmsBadge.style.display = 'none';
            }
        }
    },

    markAllMessagesAsRead() {
        if (!state.player?.phoneMessages) return;
        let hadUnread = false;
        state.player.phoneMessages.forEach(m => {
            if (m && m.unread) {
                m.unread = false;
                hadUnread = true;
            }
        });
        if (hadUnread) {
            this.updateUnreadBadge();
            saveState();
        }
    },

    getBusinessStats() {
        let totalIncomePerDay = 0;
        let totalStoredCash = 0;
        let activePoints = 0;
        let minStock = 100;

        if (state.businesses && Array.isArray(state.businesses)) {
            state.businesses.forEach(b => {
                if (b && b.level > 0) {
                    activePoints++;
                    totalStoredCash += (b.stored || 0);
                    if (b.stock > 0) {
                        totalIncomePerDay += ((b.income || 0) * b.level);
                    }
                    if (b.stock !== undefined && b.stock < minStock) {
                        minStock = b.stock;
                    }
                }
            });
        }
        if (activePoints === 0) minStock = 0;
        return { totalIncomePerDay, totalStoredCash, activePoints, minStock };
    },

    // ========================================================
    // 1. ВИДЖЕТ СЕТИ ПРЕДПРИЯТИЙ (ТОЛЬКО ЕСЛИ КУПЛЕН ХОТЯ БЫ 1 БИЗНЕС)
    // ========================================================
    renderBusinessWidget() {
        const widgetContainer = document.getElementById('phoneBizWidgetContainer');
        if (!widgetContainer) return;

        const hasAnyBusiness = state.businesses && state.businesses.some(b => b && b.level > 0);

        if (!hasAnyBusiness) {
            widgetContainer.innerHTML = '';
            widgetContainer.style.display = 'none';
            return;
        }

        widgetContainer.style.display = 'block';
        const stats = this.getBusinessStats();
        let statusBadge = stats.minStock <= 15 
            ? "<span class='tag-badge bg-tag-red'>Мало сырья!</span>" 
            : "<span class='tag-badge bg-tag-green'>Работает</span>";

        widgetContainer.innerHTML = `
            <div class="phone-biz-widget">
                <div class="flex-between mb-1">
                    <div class="flex-gap" style="align-items:center;">
                        <div class="widget-icon-bubble"><i class="fa-solid fa-briefcase color-green"></i></div>
                        <div>
                            <div class="widget-title">Сеть предприятий</div>
                            <div class="sub-label" style="font-size:9.5px;">Активно: <b class="color-green">${stats.activePoints}</b> точек</div>
                        </div>
                    </div>
                    ${statusBadge}
                </div>
                
                <div class="widget-metrics-row mb-2">
                    <div>
                        <div class="sub-label" style="font-size:9px;">Накоплено в кассах:</div>
                        <div class="price-val text-xs color-green">${stats.totalStoredCash.toLocaleString()} ₽</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="sub-label" style="font-size:9px;">Прибыль сети:</div>
                        <b class="text-xs color-cyan">+${stats.totalIncomePerDay.toLocaleString()} ₽/д</b>
                    </div>
                </div>

                <div class="grid-2">
                    <button onclick="collectAllBusinessCash(); PhoneManager.renderBusinessWidget();" class="btn btn-green btn-sm" ${stats.totalStoredCash <= 0 ? 'disabled' : ''}>
                        Снять кассу
                    </button>
                    <button onclick="PhoneManager.openApp('business')" class="btn btn-dark btn-sm">
                        Управление
                    </button>
                </div>
            </div>
        `;
    },

    // ========================================================
    // 2. ИЗОЛИРОВАННЫЙ ВИДЖЕТ «ПЛАН ПЕРЕКУПА НА ДЕНЬ»
    // ========================================================
    renderDailyQuestsWidget() {
        const widget = document.getElementById('phoneDailyQuestsWidget');
        if (!widget) return;

        if (!state.player.dailyQuests || state.player.dailyQuests.length === 0) {
            if (typeof refreshDailyQuestsList === 'function') refreshDailyQuestsList();
        }

        let quests = state.player.dailyQuests || [];
        let completedCount = 0;
        let htmlQuests = "";

        const iconsMap = {
            gauge_check: 'fa-ruler-combined color-cyan',
            win_drag: 'fa-flag-checkered color-red',
            collect_biz: 'fa-briefcase color-green',
            buy_car: 'fa-cart-shopping color-amber',
            sell_car: 'fa-handshake color-green',
            obd_scan: 'fa-tablet-screen-button color-cyan',
            presale_mod: 'fa-wand-magic-sparkles color-purple',
            drift_run: 'fa-compass-drafting color-red'
        };

        quests.forEach((q, idx) => {
            let cur = q.cur || 0;
            let max = q.max || q.target || 1;
            let isDone = q.done || cur >= max;
            let isClaimed = !!q.done;
            if (isDone) completedCount++;

            let pct = Math.min(100, Math.round((cur / max) * 100));
            let iconClass = iconsMap[q.actionType] || 'fa-list-check color-cyan';

            let actionBtn = "";
            if (isClaimed) {
                actionBtn = `<span class="quest-done-badge"><i class="fa-solid fa-check"></i> Получено</span>`;
            } else if (cur >= max) {
                actionBtn = `
                    <button onclick="PhoneManager.claimQuestReward(${idx})" class="quest-claim-btn">
                        <i class="fa-solid fa-gift"></i> Забрать +${(q.reward / 1000).toFixed(0)}k
                    </button>`;
            } else {
                actionBtn = `<span class="sub-label font-bold" style="font-size:10px;">${cur}/${max}</span>`;
            }

            htmlQuests += `
                <div class="quest-card-item ${isClaimed ? 'quest-completed' : ''}">
                    <div style="font-size:16px; min-width:22px; text-align:center;">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="quest-card-info">
                        <div class="quest-card-title">${q.text}</div>
                        <div class="quest-card-sub">
                            <span class="sub-label">Награда: <b class="color-amber">+${q.reward.toLocaleString()} ₽</b></span>
                            <div class="quest-progress-track">
                                <div class="quest-progress-bar" style="width:${pct}%;"></div>
                            </div>
                        </div>
                    </div>
                    <div class="quest-action-btn-wrap">
                        ${actionBtn}
                    </div>
                </div>
            `;
        });

        let superRewardBlock = "";
        let allDone = completedCount >= quests.length;
        if (allDone && !state.player.dailyQuestsSuperClaimed) {
            superRewardBlock = `
                <div class="quest-super-reward-banner">
                    <div>
                        <div class="font-bold text-xs color-amber"><i class="fa-solid fa-crown"></i> План дня перевыполнен 3/3!</div>
                        <div class="sub-label" style="font-size:9.5px;">+50,000 ₽, +10 ⭐ Stars, +1 🤝 Связь</div>
                    </div>
                    <button onclick="PhoneManager.claimSuperDailyReward()" class="btn btn-amber btn-sm btn-auto" style="min-height:30px; padding:4px 10px;">
                        Забрать Супербонус!
                    </button>
                </div>
            `;
        }

        widget.innerHTML = `
            <div class="quest-widget-header">
                <div class="flex-gap" style="align-items:center;">
                    <i class="fa-solid fa-list-check color-cyan"></i>
                    <b class="text-xs color-cyan">План перекупа на день:</b>
                </div>
                <span class="sub-label" style="font-size:9.5px;">Сброс в 00:00 🌙</span>
            </div>
            ${htmlQuests}
            ${superRewardBlock}
        `;
    },

    claimQuestReward(idx) {
        let q = state.player.dailyQuests[idx];
        let max = q?.max || q?.target || 1;
        if (!q || q.done || (q.cur || 0) < max) return;

        q.done = true;
        state.player.cash = (state.player.cash || 0) + q.reward;
        addXp(q.rewardXp || 35);
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Цель выполнена! Получено +${q.reward.toLocaleString()} ₽!`);
        this.renderDailyQuestsWidget();
    },

    claimSuperDailyReward() {
        if (state.player.dailyQuestsSuperClaimed) return;
        state.player.dailyQuestsSuperClaimed = true;

        state.player.cash = (state.player.cash || 0) + 50000;
        state.player.stars = (state.player.stars || 0) + 10;
        state.player.connections = (state.player.connections || 0) + 1;
        state.player.mood = 100;

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("СУПЕРБОНУС ДНЯ! 🌟", "Вы закрыли весь ежедневный план перекупа!\nНачислено: +50,000 ₽, +10 ⭐ Stars, +1 🤝 Связь и статус «Ударник Авторынка»!", true);
        this.renderDailyQuestsWidget();
    },

    renderPhoneScreen() {
        const homeScreen = document.getElementById('phoneHomeScreen');
        const appContainer = document.getElementById('phoneAppContainer');
        if (!homeScreen || !appContainer) return;

        this.updateUnreadBadge();
        this.updatePhoneClock();

        if (this.currentApp === null) {
            homeScreen.style.display = 'block';
            appContainer.style.display = 'none';
            appContainer.innerHTML = '';
            this.renderBusinessWidget();
            this.renderDailyQuestsWidget();
        } else {
            homeScreen.style.display = 'none';
            appContainer.style.display = 'block';
            this.renderOpenApp();
        }
    },

    openApp(appName) {
        playSound('tick');
        tgHaptic('light');
        this.currentApp = appName;
        if (appName === 'messages') {
            this.markAllMessagesAsRead();
        }
        this.renderPhoneScreen();
    },

    goHome() {
        playSound('tick');
        tgHaptic('light');
        this.currentApp = null;
        this.activeChatId = null;
        this.renderPhoneScreen();
    },

    renderOpenApp() {
        const container = document.getElementById('phoneAppContainer');
        if (!container) return;

        if (this.currentApp === 'street') {
            this.renderStreetApp(container);
        } else if (this.currentApp === 'autodrot') {
            this.renderAutodrotApp(container);
        } else if (this.currentApp === 'bank') {
            this.renderBankApp(container);
        } else if (this.currentApp === 'business') {
            this.renderBusinessApp(container);
        } else if (this.currentApp === 'housing') {
            this.renderHousingApp(container);
        } else if (this.currentApp === 'reshala') {
            this.renderReshalaApp(container);
        } else if (this.currentApp === 'syndicate') {
            this.renderSyndicateApp(container);
        } else if (this.currentApp === 'barn') {
            this.renderBarnApp(container);
        } else if (this.currentApp === 'containers') {
            this.renderContainersApp(container);
        } else if (this.currentApp === 'shop') {
            this.renderShopApp(container);
        } else if (this.currentApp === 'fortune') {
            this.renderFortuneApp(container);
        } else if (this.currentApp === 'radar') {
            this.renderRadarApp(container);
        } else if (this.currentApp === 'gosuslugi') {
            this.renderGosuslugiApp(container);
        } else if (this.currentApp === 'radio') {
            this.renderRadioApp(container);
        } else if (this.currentApp === 'notepad') {
            this.renderNotepadApp(container);
        } else if (this.currentApp === 'messages') {
            this.markAllMessagesAsRead();
            if (this.activeChatId) {
                this.renderChatConversation(container, this.activeChatId);
            } else {
                this.renderMessagesList(container);
            }
        }
    },

    // ========================================================
    // 1. БИЗНЕС
    // ========================================================
    renderBusinessApp(container) {
        if (!state.businesses || state.businesses.length === 0) {
            if (typeof BUSINESS_DATA !== 'undefined') state.businesses = JSON.parse(JSON.stringify(BUSINESS_DATA));
        }

        let lvl = state.player?.level || 1;
        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-briefcase color-green"></i> Мой Бизнес</div>
                <button onclick="collectAllBusinessCash(); PhoneManager.renderBusinessApp(document.getElementById('phoneAppContainer'));" class="btn btn-green btn-auto btn-sm">Касса</button>
            </div>
            <div class="phone-app-body">
        `;

        state.businesses.forEach((biz, idx) => {
            if (!biz) return;
            let isLocked = lvl < biz.minLevel;
            let isOwned = biz.level > 0;
            let cost = isOwned ? biz.cost * (biz.level + 1) : biz.cost;
            let saleToNpcPrice = isOwned ? Math.round(biz.cost * biz.level * 0.75) : 0;
            let imgSrc = biz.img || `assets/business/${biz.id}.jpg`;
            let fallbackSrc = biz.fallback || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80';

            let actionBlock = "";
            if (isLocked) {
                actionBlock = `<button class="btn btn-dark btn-sm w-full opacity-50" disabled>С ${biz.minLevel} уровня</button>`;
            } else if (!isOwned) {
                actionBlock = `<button onclick="upgradeBusiness(${idx}); PhoneManager.renderBusinessApp(document.getElementById('phoneAppContainer'));" class="btn btn-cyan btn-sm w-full">Купить (${cost.toLocaleString()} ₽)</button>`;
            } else {
                actionBlock = `
                    <div class="grid-2 mb-1">
                        <button onclick="upgradeBusiness(${idx}); PhoneManager.renderBusinessApp(document.getElementById('phoneAppContainer'));" class="btn btn-cyan btn-sm">Апгрейд (${cost.toLocaleString()} ₽)</button>
                        <button onclick="restockBusiness(${idx}); PhoneManager.renderBusinessApp(document.getElementById('phoneAppContainer'));" class="btn btn-amber btn-sm">Сырьё (15k)</button>
                    </div>
                    <div class="grid-2">
                        <button onclick="PhoneManager.sellBusinessToNPC('${biz.id}', ${saleToNpcPrice})" class="btn btn-dark btn-sm">Продать (${saleToNpcPrice.toLocaleString()} ₽)</button>
                        <button onclick="PhoneManager.listBusinessOnP2P('${biz.id}')" class="btn btn-purple btn-sm">На P2P биржу</button>
                    </div>
                `;
            }

            html += `
                <div class="glass-card mb-3 p-2">
                    <div class="car-img-wrap mb-2" style="height:115px; position:relative;">
                        <img src="${imgSrc}" class="car-img" onerror="this.onerror=null; this.src='${fallbackSrc}';">
                        <div class="badge-tag" style="bottom:6px; right:6px;">
                            <span class="tag-badge ${isOwned ? 'bg-tag-green' : 'bg-tag-amber'}">${isOwned ? 'Ур. ' + biz.level : 'С ' + biz.minLevel + ' ур'}</span>
                        </div>
                    </div>
                    <div class="flex-between mb-1">
                        <b class="text-xs color-green">${biz.name}</b>
                        <span class="price-val text-xs">${((biz.income || 0) * (biz.level || 0)).toLocaleString()} ₽/д</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">⭐ Перк: ${biz.perk || 'Пассивный доход'} | Сырьё: <b>${biz.stock || 0}%</b></div>
                    ${actionBlock}
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    sellBusinessToNPC(bizId, refundAmount) {
        const biz = (state.businesses || []).find(b => b.id === bizId);
        if (!biz || biz.level <= 0) return;

        if (!confirm(`Продать «${biz.name}» городскому инвестору за ${refundAmount.toLocaleString()} ₽? Точка будет ликвидирована.`)) return;

        state.player.cash = (state.player.cash || 0) + refundAmount;
        biz.level = 0;
        biz.stock = 0;
        biz.stored = 0;
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Бизнес продан инвестору (+${refundAmount.toLocaleString()} ₽)!`);
        this.renderBusinessApp(document.getElementById('phoneAppContainer'));
        this.renderBusinessWidget();
    },

    listBusinessOnP2P(bizId) {
        const biz = (state.businesses || []).find(b => b.id === bizId);
        if (!biz || biz.level <= 0) return;

        let priceStr = prompt(`Введите цену продажи «${biz.name} (Ур. ${biz.level})» на P2P бирже:`, String(biz.cost * biz.level));
        if (!priceStr) return;
        let price = parseInt(priceStr);
        if (isNaN(price) || price <= 0) return showToast("Некорректная цена!");

        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        let lotId = "p2p_biz_" + Date.now();
        state.p2pMarketListings.unshift({
            id: lotId,
            seller: state.player?.name || "Перекуп",
            type: "business",
            name: `${biz.name} (Ур. ${biz.level})`,
            bizId: biz.id,
            bizLevel: biz.level,
            price: price,
            desc: `Готовая точка с доходностью ${((biz.income || 0) * biz.level).toLocaleString()} ₽/д.`
        });

        if (!state.myP2PListings) state.myP2PListings = [];
        state.myP2PListings.push(lotId);

        biz.level = 0;
        biz.stock = 0;
        saveState();
        showToast("Бизнес выставлен на онлайн P2P биржу Autodrot!");
        this.renderBusinessApp(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 2. ЖИЛЬЁ
    // ========================================================
    renderHousingApp(container) {
        let curId = state.player?.housingId || 'room';
        let owned = state.player?.ownedHouses || [];
        let lvl = state.player?.level || 1;

        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-house color-cyan"></i> Моя Недвижимость</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
        `;

        (typeof HOUSING_LIST !== 'undefined' ? HOUSING_LIST : []).forEach(h => {
            let isCur = curId === h.id;
            let isPurchased = owned.includes(h.id);
            let isLvlLocked = lvl < (h.minLevel || 1);
            let refundPrice = Math.round((h.buyPrice || 1000000) * 0.8);
            let imgSrc = h.img || `assets/houses/${h.id}.jpg`;
            let fallbackSrc = h.fallback || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80';

            let actionBtns = "";
            if (isLvlLocked) {
                actionBtns = `<button class="btn btn-dark btn-sm w-full opacity-50" disabled>С ${h.minLevel} уровня</button>`;
            } else if (isPurchased) {
                actionBtns = `
                    <div class="grid-2 mb-1">
                        <button onclick="openHomeInteriorModal('${h.id}')" class="btn btn-cyan btn-sm">🛋️ Интерьер</button>
                        ${isCur ? '<button class="btn btn-dark btn-sm opacity-50" disabled>Живёте здесь</button>' : `<button onclick="moveIntoHousing('${h.id}'); PhoneManager.renderHousingApp(document.getElementById('phoneAppContainer'));" class="btn btn-green btn-sm">Переехать</button>`}
                    </div>
                    <div class="grid-2">
                        <button onclick="PhoneManager.sellHousingToNPC('${h.id}', ${refundPrice})" class="btn btn-dark btn-sm">Продать (${(refundPrice / 1000000).toFixed(1)}M)</button>
                        <button onclick="PhoneManager.listHousingOnP2P('${h.id}')" class="btn btn-purple btn-sm">На P2P биржу</button>
                    </div>
                `;
            } else {
                actionBtns = `
                    <div class="grid-2">
                        <button onclick="rentHousing('${h.id}'); PhoneManager.renderHousingApp(document.getElementById('phoneAppContainer'));" class="btn btn-cyan btn-sm">Аренда (${(h.rent || 2000).toLocaleString()} ₽/д)</button>
                        <button onclick="buyHousingProperty('${h.id}'); PhoneManager.renderHousingApp(document.getElementById('phoneAppContainer'));" class="btn btn-amber btn-sm">Купить (${(h.buyPrice / 1000000).toFixed(1)}M)</button>
                    </div>
                `;
            }

            html += `
                <div class="glass-card mb-3 p-2">
                    <div class="car-img-wrap mb-2" style="height:120px; position:relative;">
                        <img src="${imgSrc}" class="car-img" onerror="this.onerror=null; this.src='${fallbackSrc}';">
                        <div class="badge-tag" style="bottom:6px; right:6px;">
                            <span class="tag-badge ${isPurchased ? 'bg-tag-green' : 'bg-tag-amber'}">${isPurchased ? 'Собственность' : 'Аренда'}</span>
                        </div>
                    </div>
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan">${h.name}</b>
                        <span class="color-green font-bold text-xs">+${h.slots} мест гаража</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">${h.desc || ''}</div>
                    ${actionBtns}
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    sellHousingToNPC(hId, refundAmount) {
        if (!confirm(`Продать недвижимость агентству за ${refundAmount.toLocaleString()} ₽? Право собственности будет аннулировано.`)) return;

        state.player.cash = (state.player.cash || 0) + refundAmount;
        state.player.ownedHouses = (state.player.ownedHouses || []).filter(id => id !== hId);

        if (state.player.housingId === hId) {
            state.player.housingId = 'room';
            state.player.housingType = 'rent';
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Недвижимость продана риелторам (+${refundAmount.toLocaleString()} ₽)!`);
        this.renderHousingApp(document.getElementById('phoneAppContainer'));
    },

    listHousingOnP2P(hId) {
        const h = (typeof HOUSING_LIST !== 'undefined' ? HOUSING_LIST : []).find(item => item.id === hId);
        if (!h) return;

        let priceStr = prompt(`Введите цену продажи «${h.name}» на P2P бирже:`, String(h.buyPrice));
        if (!priceStr) return;
        let price = parseInt(priceStr);
        if (isNaN(price) || price <= 0) return showToast("Некорректная цена!");

        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        let lotId = "p2p_house_" + Date.now();
        state.p2pMarketListings.unshift({
            id: lotId,
            seller: state.player?.name || "Перекуп",
            type: "housing",
            name: h.name,
            houseId: h.id,
            price: price,
            desc: `Недвижимость в собственности. Гараж на +${h.slots} мест.`
        });

        if (!state.myP2PListings) state.myP2PListings = [];
        state.myP2PListings.push(lotId);

        state.player.ownedHouses = (state.player.ownedHouses || []).filter(id => id !== hId);
        if (state.player.housingId === hId) {
            state.player.housingId = 'room';
            state.player.housingType = 'rent';
        }

        saveState();
        showToast("Недвижимость выставлена на онлайн P2P биржу Autodrot!");
        this.renderHousingApp(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 3. САРАИ
    // ========================================================
    renderBarnApp(container) {
        const pDay = state.player?.day || 1;
        const lastDay = state.player?.lastBarnDay || 0;
        const canScoutToday = lastDay < pDay;
        const lvl = state.player?.level || 1;

        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-screwdriver-wrench color-amber"></i> Находки в сараях</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2 flex-between">
                    <div>
                        <b class="text-xs color-amber">Разведка заброшек</b>
                        <div class="sub-label" style="font-size:10px;">Шанс найти ретро-классику и архивные номера!</div>
                    </div>
                    <span class="tag-badge bg-tag-amber">1 раз/сутки</span>
                </div>
        `;

        (typeof BARN_TIERS_CONFIG !== 'undefined' ? BARN_TIERS_CONFIG : []).forEach(b => {
            let isLvlLocked = lvl < b.reqLvl;
            let isDoneToday = !canScoutToday;
            let rareCar = (typeof BARN_FINDS !== 'undefined' && BARN_FINDS[b.rareIdx]) ? BARN_FINDS[b.rareIdx] : { name: "Раритет" };
            let imgSrc = b.img || `assets/barns/barn_tier${b.tier}.jpg`;
            let fallbackSrc = b.fallback || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80';

            let statusBadge = isLvlLocked 
                ? `<span class='tag-badge bg-tag-red'><i class='fa-solid fa-lock'></i> С ${b.reqLvl} УР</span>`
                : (isDoneToday ? "<span class='tag-badge bg-tag-amber'>Осмотрено</span>" : "<span class='tag-badge bg-tag-green'>Доступно</span>");

            let btnDisabled = (isLvlLocked || isDoneToday) ? "disabled" : "";
            let btnText = isLvlLocked ? `Требуется ${b.reqLvl} уровень` : (isDoneToday ? "Осмотрено (Сброс в 00:00 🌙)" : `Вскрыть ангар (${(b.cost / 1000).toFixed(0)}k ₽)`);

            html += `
                <div class="glass-card mb-3 p-2 ${b.classGrade}">
                    <div class="car-img-wrap mb-2" style="height:120px; position:relative;">
                        <img src="${imgSrc}" class="car-img" onerror="this.onerror=null; this.src='${fallbackSrc}';">
                        <div class="badge-tag" style="bottom:6px; right:6px;">${statusBadge}</div>
                    </div>
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan">${b.title}</b>
                        <span class="price-val text-xs color-amber">${b.cost.toLocaleString()} ₽</span>
                    </div>
                    <p class="sub-label mb-2" style="font-size:10px;">${b.desc}</p>
                    <div class="text-xs mb-1 color-amber">⭐ Редкий дроп (5%): <b>${rareCar.name}</b></div>
                    <div class="text-xs mb-2 color-purple">🏷️ Архивные номера: <b>15% шанс</b></div>
                    <button onclick="scoutBarnTier(${b.tier})" class="btn btn-cyan btn-sm w-full" ${btnDisabled}>${btnText}</button>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    // ========================================================
    // 4. ФОРТУНА: СУПЕР ВИЛСПИН & ОБМЕН
    // ========================================================
    renderFortuneApp(container) {
        let tickets = state.player?.superSpinTickets || 0;
        let stars = state.player?.stars || 0;
        let pDay = state.player?.day || 1;
        let lastSuperDay = state.player?.lastFreeSuperSpinDay || 0;
        let canFreeSuperSpin = lastSuperDay < pDay;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-clover color-amber"></i> Клуб Фортуны</div>
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

                    <button id="btnLaunchSuperSpin" onclick="PhoneManager.spinSuperWheelAction()" class="btn ${canFreeSuperSpin ? 'btn-green' : 'btn-purple'} btn-sm w-full mt-2">
                        🎰 ${canFreeSuperSpin ? 'КРУТИТЬ БЕСПЛАТНО (Суточный бонус 🎁)' : (tickets > 0 ? 'КРУТИТЬ (1 Билет 🎟️)' : 'КРУТИТЬ (30 ⭐ Stars)')}
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
                            <button onclick="PhoneManager.exchangeForStars('cash', 250000, 25)" class="btn btn-amber btn-sm btn-auto">250,000 ₽</button>
                        </div>

                        <div class="p-2 flex-between" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                            <div>
                                <b class="text-xs color-cyan">⛽ Обмен 60 Бензина на 10 Stars</b>
                                <div class="sub-label" style="font-size:9.5px;">Слив топлива перекупа в валюту</div>
                            </div>
                            <button onclick="PhoneManager.exchangeForStars('fuel', 60, 10)" class="btn btn-cyan btn-sm btn-auto">-60 ⛽</button>
                        </div>

                        <div class="p-2 flex-between" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                            <div>
                                <b class="text-xs color-purple">🎟️ Обмен 20 Талонов на 15 Stars</b>
                                <div class="sub-label" style="font-size:9.5px;">Обмен неиспользованных пропусков</div>
                            </div>
                            <button onclick="PhoneManager.exchangeForStars('tickets', 20, 15)" class="btn btn-purple btn-sm btn-auto">-20 🎟️</button>
                        </div>

                        <div class="p-2 flex-between" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                            <div>
                                <b class="text-xs color-green">🎫 1х Билет Супер Вилспина</b>
                                <div class="sub-label" style="font-size:9.5px;">Запуск барабана Forza</div>
                            </div>
                            <div class="flex-gap">
                                <button onclick="PhoneManager.buySuperSpinTicket('cash')" class="btn btn-dark btn-sm btn-auto">300k ₽</button>
                                <button onclick="PhoneManager.buySuperSpinTicket('stars')" class="btn btn-green btn-sm btn-auto">30 ⭐</button>
                            </div>
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

    buySuperSpinTicket(currency) {
        if (currency === 'stars') {
            let s = state.player?.stars || 0;
            if (s < 30) return showToast("Нужно 30 Stars ⭐!");
            state.player.stars -= 30;
        } else {
            let c = state.player?.cash || 0;
            if (c < 300000) return showToast("Нужно 300,000 ₽!");
            state.player.cash -= 300000;
        }

        state.player.superSpinTickets = (state.player.superSpinTickets || 0) + 1;
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast("Билет «Супер Вилспин» приобретён!");
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));
    },

    spinSuperWheelAction() {
        if (this.isSuperSpinning) return;

        let tickets = state.player?.superSpinTickets || 0;
        let stars = state.player?.stars || 0;
        let pDay = state.player?.day || 1;
        let lastSuperDay = state.player?.lastFreeSuperSpinDay || 0;
        let isFree = lastSuperDay < pDay;

        if (isFree) {
            state.player.lastFreeSuperSpinDay = pDay;
        } else if (tickets > 0) {
            state.player.superSpinTickets -= 1;
        } else if (stars >= 30) {
            state.player.stars -= 30;
        } else {
            return showToast("Нужен 1 Билет или 30 ⭐ Stars!");
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

            this.renderFortuneApp(document.getElementById('phoneAppContainer'));
        }, 2600);
    },

    // ========================================================
    // 5. ГОСУСЛУГИ, МАГНИТОЛА, БЛОКНОТ КАРЬЕРЫ
    // ========================================================
    renderGosuslugiApp(container) {
        let fines = state.player.trafficFines || 0;
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-building-columns color-cyan"></i> Госуслуги Авто</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs">Штрафы ГИБДД (со скидкой 50%)</b>
                        <span class="tag-badge ${fines > 0 ? 'bg-tag-red' : 'bg-tag-green'}">${fines > 0 ? fines.toLocaleString() + ' ₽' : 'Штрафов нет'}</span>
                    </div>
                    <p class="sub-label mb-2" style="font-size:10px;">Проверка камер и просроченных ДКП на дорогах.</p>
                    <button onclick="PhoneManager.payTrafficFines()" class="btn btn-cyan btn-sm w-full" ${fines <= 0 ? 'disabled' : ''}>Оплатить штрафы со скидкой 50%</button>
                </div>
                <div class="glass-card p-2">
                    <b class="text-xs color-green mb-1 block">✓ Проверка запретов на рег. действия</b>
                    <p class="sub-label" style="font-size:10px;">Все машины в гараже проверены по базам ФССП и реестру залогов.</p>
                </div>
            </div>
        `;
    },

    payTrafficFines() {
        let fines = state.player.trafficFines || 0;
        let discountCost = Math.round(fines * 0.5);
        if (state.player.cash < discountCost) return showToast("Не хватает денег!");
        state.player.cash -= discountCost;
        state.player.trafficFines = 0;
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast("Штрафы ГИБДД успешно оплачены!");
        this.renderGosuslugiApp(document.getElementById('phoneAppContainer'));
    },

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
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-radio color-purple"></i> Авто-Магнитола Live</div>
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
                        <button onclick="PhoneManager.changeRadioStation(-1)" class="btn btn-dark btn-sm">
                            <i class="fa-solid fa-backward-step"></i> Назад
                        </button>
                        <button id="radioPlayPauseBtn" onclick="PhoneManager.toggleRadioPlay()" class="btn ${isRadioPlaying ? 'btn-amber' : 'btn-green'} btn-sm">
                            <i class="fa-solid ${isRadioPlaying ? 'fa-pause' : 'fa-play'}"></i> ${isRadioPlaying ? 'ПАУЗА' : 'СЛУШАТЬ'}
                        </button>
                        <button onclick="PhoneManager.changeRadioStation(1)" class="btn btn-dark btn-sm">
                            Вперёд <i class="fa-solid fa-forward-step"></i>
                        </button>
                    </div>

                    <div class="p-2" style="background: #090e18; border-radius: 10px; border: 1px solid var(--border-glass);">
                        <div class="flex-between text-xs mb-1">
                            <span class="sub-label"><i class="fa-solid fa-volume-high color-cyan"></i> Громкость:</span>
                            <b id="radioVolumeDisplay" class="color-cyan">${Math.round(radioVolume * 100)}%</b>
                        </div>
                        <input type="range" id="radioVolumeSlider" min="0" max="1" step="0.05" value="${radioVolume}" oninput="PhoneManager.setRadioVolume(this.value)" style="width: 100%; accent-color: var(--cyan); cursor: pointer;">
                    </div>
                </div>

                <div class="grid-4 mb-2">
                    <button onclick="PhoneManager.setRadioFilter('all')" class="btn ${radioNetworkFilter === 'all' ? 'btn-cyan' : 'btn-dark'} btn-sm">Все (17)</button>
                    <button onclick="PhoneManager.setRadioFilter('Record')" class="btn ${radioNetworkFilter === 'Record' ? 'btn-cyan' : 'btn-dark'} btn-sm">Record</button>
                    <button onclick="PhoneManager.setRadioFilter('SomaFM')" class="btn ${radioNetworkFilter === 'SomaFM' ? 'btn-cyan' : 'btn-dark'} btn-sm">SomaFM</button>
                    <button onclick="PhoneManager.setRadioFilter('Plaza_DFM')" class="btn ${radioNetworkFilter === 'Plaza_DFM' ? 'btn-cyan' : 'btn-dark'} btn-sm">Plaza/DFM</button>
                </div>

                <div class="glass-card p-2 text-left" style="text-align: left;">
                    <div class="text-xs font-bold color-purple mb-2"><i class="fa-solid fa-list-music"></i> Каталог потоков:</div>
                    <div class="space-y-2" style="max-height: 190px; overflow-y: auto;">
                        ${visibleStations.map(s => {
                            const originalIdx = ELECTRONIC_RADIO_STATIONS.findIndex(orig => orig.id === s.id);
                            const isCurrent = originalIdx === currentStationIdx;
                            return `
                            <div onclick="PhoneManager.selectExactStation(${originalIdx})" class="p-2 flex-between cursor-pointer station-row ${isCurrent ? 'active-station' : ''}" style="background: #090d16; border-radius: 8px; border: 1px solid ${isCurrent ? 'var(--cyan)' : 'var(--border-glass)'};">
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
                }).catch((err) => {
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
        }).catch((err) => {
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
    // БЛОКНОТ КАРЬЕРЫ ПЕРЕКУПА (СЮЖЕТНЫЕ ВЕХИ И ПРОГРЕСС)
    // ----------------------------------------------------
    renderNotepadApp(container) {
        let s = state.player?.stats || {};
        let goals = typeof NOTEPAD_CAREER_GOALS !== 'undefined' ? NOTEPAD_CAREER_GOALS : [];
        let netProfit = s.totalNetProfit || 0;
        let soldCount = s.sold || 0;
        let totalSlots = typeof getTotalGarageSlots === 'function' ? getTotalGarageSlots() : 2;
        let ownedHouses = state.player?.ownedHouses || [];

        let completedGoals = 0;
        let goalsHtml = goals.map(g => {
            let isDone = false;
            let currentVal = 0;
            let targetVal = 1;

            if (g.targetProfit) {
                currentVal = netProfit;
                targetVal = g.targetProfit;
                isDone = currentVal >= targetVal;
            } else if (g.targetSales) {
                currentVal = soldCount;
                targetVal = g.targetSales;
                isDone = currentVal >= targetVal;
            } else if (g.targetSlots) {
                currentVal = totalSlots;
                targetVal = g.targetSlots;
                isDone = currentVal >= targetVal;
            } else if (g.targetCred) {
                currentVal = state.player?.streetCred || 0;
                targetVal = g.targetCred;
                isDone = currentVal >= targetVal;
            } else if (g.targetHousing) {
                isDone = ownedHouses.includes(g.targetHousing);
                currentVal = isDone ? 1 : 0;
                targetVal = 1;
            }

            if (isDone) completedGoals++;
            let progressPct = Math.min(100, Math.round((currentVal / targetVal) * 100));

            return `
            <div class="glass-card p-2 mb-2" style="border-left: 3px solid ${isDone ? 'var(--green)' : 'var(--amber)'};">
                <div class="flex-between mb-1">
                    <b class="text-xs ${isDone ? 'color-green' : 'color-cyan'}">${g.title}</b>
                    <span class="tag-badge ${isDone ? 'bg-tag-green' : 'bg-tag-amber'}">${isDone ? 'ДОСТИГНУТО ✓' : g.category}</span>
                </div>
                <div class="sub-label mb-2" style="font-size:10px;">${g.desc}</div>
                <div class="flex-between text-xs mb-1">
                    <span>Прогресс:</span>
                    <b class="${isDone ? 'color-green' : 'color-amber'}">${currentVal.toLocaleString()} / ${targetVal.toLocaleString()}</b>
                </div>
                <div class="biz-progress-track mb-2">
                    <div class="biz-progress-fill ${isDone ? 'fill-biz-stock' : 'fill-biz-lvl'}" style="width:${progressPct}%;"></div>
                </div>
                <div class="text-xs color-amber" style="font-size:9.5px;">⭐ Награда: <b>${g.reward}</b></div>
            </div>`;
        }).join('');

        let totalProgressPct = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-note-sticky color-amber"></i> Блокнот Карьеры</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2" style="background:radial-gradient(circle at 50% 0%, rgba(0,242,254,0.15), rgba(9,14,24,0.98));">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-route"></i> Карьерный путь перекупа</b>
                        <span class="price-val text-xs color-green">${totalProgressPct}%</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9.5px;">Закрыто этапов: <b>${completedGoals} из ${goals.length}</b>. Выполняйте цели для получения постоянных бонусов.</div>
                    <div class="biz-progress-track">
                        <div class="biz-progress-fill fill-biz-stock" style="width:${totalProgressPct}%;"></div>
                    </div>
                </div>

                <div class="glass-card p-2 mb-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-green"><i class="fa-solid fa-chart-line"></i> Сводка эффективности:</b>
                        <span class="sub-label text-xs">Уровень: <b>${state.player?.level || 1}</b></span>
                    </div>
                    <div class="sub-label" style="font-size:10px;">
                        • Куплено ТС: <b>${s.bought || 0}</b> шт.<br>
                        • Продано в плюс: <b class="color-green">${s.profitableSales || 0}</b> сделок<br>
                        • Чистая прибыль: <b class="color-green">${(s.totalNetProfit || 0).toLocaleString()} ₽</b>
                    </div>
                </div>
                
                <h4 class="font-bold text-xs color-cyan mb-2">🎯 Долгосрочные карьерные цели:</h4>
                <div class="space-y-2 mb-3">
                    ${goalsHtml}
                </div>
            </div>
        `;
    },

    // ========================================================
    // 6. STREET UNDERGROUND
    // ========================================================
    renderStreetApp(container) {
        let sub = this.streetSubTab || 'drift';
        let streetCred = state.player?.streetCred || 100;
        let credRank = streetCred >= 1200 ? "👑 Легенда RDS & Нелегала" : (streetCred >= 600 ? "⚡ Король Трассы" : (streetCred >= 250 ? "🏎️ Опытный Пилот" : "🔰 Новичок Спота"));

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-flag-checkered color-red"></i> Street Underground</div>
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
                    <button onclick="PhoneManager.switchStreetSubTab('drift')" class="btn ${sub === 'drift' ? 'btn-red' : 'btn-dark'} btn-sm">💨 Дрифт</button>
                    <button onclick="PhoneManager.switchStreetSubTab('drag')" class="btn ${sub === 'drag' ? 'btn-red' : 'btn-dark'} btn-sm">🏁 402м</button>
                    <button onclick="PhoneManager.switchStreetSubTab('stance')" class="btn ${sub === 'stance' ? 'btn-red' : 'btn-dark'} btn-sm">✨ Стенс</button>
                    <button onclick="PhoneManager.switchStreetSubTab('sprint')" class="btn ${sub === 'sprint' ? 'btn-red' : 'btn-dark'} btn-sm">🌃 Шашки</button>
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
                    <select onchange="PhoneManager.selectStreetCar(this.value)" style="background:#090e18; color:#fff; border:1px solid var(--border-glass); border-radius:6px; padding:3px 8px; font-size:11px; outline:none;">
                        ${selectorOptions}
                    </select>
                </div>
                <div class="flex-between text-xs mt-1">
                    <span>Температура: <b class="${tempVal > 105 ? 'color-red' : 'color-green'}">${tempVal}°C</b></span>
                    <span>Остаток шин: <b class="${tiresPct < 30 ? 'color-red' : 'color-green'}">${tiresPct}%</b></span>
                </div>
                <div class="grid-2 mt-2">
                    <button onclick="PhoneManager.serviceTiresAndCooling(${carIdx})" class="btn btn-dark btn-sm">🛞 Новая резина & Остудить (15k)</button>
                    <button onclick="PhoneManager.coolDownEngine(${carIdx})" class="btn btn-cyan btn-sm">❄️ Остудить мотор (Бесплатно)</button>
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
                    <button onclick="PhoneManager.runDriftChallenge('matsuri', 15000)" class="btn btn-cyan btn-sm w-full" ${!spec.matsuriReady ? 'disabled' : ''}>
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
                    <button onclick="PhoneManager.runDriftChallenge('europe', 60000)" class="btn btn-amber btn-sm w-full" ${!spec.europeReady ? 'disabled' : ''}>
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
                    <button onclick="PhoneManager.runDriftChallenge('gp', 200000)" class="btn btn-red btn-sm w-full" ${!spec.gpReady ? 'disabled' : ''}>
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
                        <button onclick="PhoneManager.renderStreetSubScreen()" class="btn btn-green btn-sm w-full">Отлично!</button>
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
                        <button onclick="PhoneManager.renderStreetSubScreen()" class="btn btn-dark btn-sm w-full">Попробовать снова</button>
                    </div>
                `;
            }

            saveState();
            updateHeaderUI();
        }, 1600);
    },

    // ----------------------------------------------------
    // ДРАГ 402М
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
                    <select onchange="PhoneManager.selectStreetCar(this.value)" style="background:#090e18; color:#fff; border:1px solid var(--border-glass); border-radius:6px; padding:3px 8px; font-size:11px; outline:none;">
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
    // СТЕНС
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

                <button onclick="PhoneManager.enterStanceContest(${score})" class="btn btn-amber btn-sm w-full">
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
                        <button onclick="PhoneManager.renderStreetSubScreen()" class="btn btn-amber btn-sm w-full">Забрать кубок 🏆</button>
                    </div>
                `;
            } else {
                playSound('error');
                resBox.innerHTML = `
                    <div class="glass-card p-2 text-center" style="border-color:var(--red);">
                        <div class="font-bold text-xs color-red mb-1">🥉 ВНЕ ПРИЗОВОЙ ТРОЙКИ (${score} баллов)</div>
                        <div class="sub-label mb-2" style="font-size:10px;">Проект выглядит сырым: не хватает занижения или кузов требует покраски!</div>
                        <button onclick="PhoneManager.renderStreetSubScreen()" class="btn btn-dark btn-sm w-full">Понятно</button>
                    </div>
                `;
            }

            saveState();
            updateHeaderUI();
        }, 1500);
    },

    // ----------------------------------------------------
    // ШАШКИ В ПОТОКЕ
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
                    <button onclick="PhoneManager.startCitySprint('normal', ${maxSpeed})" class="btn btn-dark btn-sm">Поток 140 км/ч (Ставка 40k)</button>
                    <button onclick="PhoneManager.startCitySprint('insane', ${maxSpeed})" class="btn btn-danger btn-sm" ${maxSpeed < 200 ? 'disabled' : ''}>
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
                        <button onclick="PhoneManager.renderStreetSubScreen()" class="btn btn-danger btn-sm w-full">Оплатить штраф</button>
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
                        <button onclick="PhoneManager.renderStreetSubScreen()" class="btn btn-green btn-sm w-full">Забрать кэш</button>
                    </div>
                `;
            }

            saveState();
            updateHeaderUI();
        }, 1700);
    },

    // ========================================================
    // 7. СЕРВИСНЫЕ ПРИЛОЖЕНИЯ
    // ========================================================
    renderAutodrotApp(container) {
        let sub = this.autodrotSubTab || 'market';
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-bolt color-cyan"></i> Autodrot</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="grid-3 mb-2">
                    <button onclick="PhoneManager.switchAutodrotSubTab('market')" class="btn ${sub === 'market' ? 'btn-cyan' : 'btn-dark'} btn-sm">Биржа P2P</button>
                    <button onclick="PhoneManager.switchAutodrotSubTab('chat')" class="btn ${sub === 'chat' ? 'btn-cyan' : 'btn-dark'} btn-sm">Стрит-Чат</button>
                    <button onclick="PhoneManager.switchAutodrotSubTab('hotdeals')" class="btn ${sub === 'hotdeals' ? 'btn-cyan' : 'btn-dark'} btn-sm">🔥 Выкуп</button>
                </div>
                <div id="autodrotScreenContent"></div>
            </div>
        `;
        this.renderAutodrotSubScreen();
    },

    switchAutodrotSubTab(tab) {
        playSound('tick');
        tgHaptic('light');
        this.autodrotSubTab = tab;
        this.renderAutodrotApp(document.getElementById('phoneAppContainer'));
    },

    setAutodrotP2PFilter(filter) {
        this.autodrotP2PFilter = filter;
        this.renderAutodrotSubScreen();
    },

    renderAutodrotSubScreen() {
        const content = document.getElementById('autodrotScreenContent');
        if (!content) return;

        if (this.autodrotSubTab === 'market') {
            let f = this.autodrotP2PFilter || 'cars';
            content.innerHTML = `
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-green"><i class="fa-solid fa-handshake"></i> Онлайн P2P торговля</b>
                        <button onclick="openCreateListingModal()" class="btn btn-green btn-auto btn-sm">+ Продать лот</button>
                    </div>
                    <div class="sub-label" style="font-size:10px;">Продавайте свои авто, номера, бизнес и недвижимость.</div>
                </div>
                <div class="grid-4 mb-2">
                    <button onclick="PhoneManager.setAutodrotP2PFilter('cars')" class="btn ${f === 'cars' ? 'btn-cyan' : 'btn-dark'} btn-sm">🚗 Авто</button>
                    <button onclick="PhoneManager.setAutodrotP2PFilter('plates')" class="btn ${f === 'plates' ? 'btn-cyan' : 'btn-dark'} btn-sm">🏷 Номера</button>
                    <button onclick="PhoneManager.setAutodrotP2PFilter('business')" class="btn ${f === 'business' ? 'btn-cyan' : 'btn-dark'} btn-sm">💼 Бизнес</button>
                    <button onclick="PhoneManager.setAutodrotP2PFilter('housing')" class="btn ${f === 'housing' ? 'btn-cyan' : 'btn-dark'} btn-sm">🏠 Жильё</button>
                </div>
                <div id="p2pItemsList"></div>
            `;
            this.renderP2PListingsFiltered();
        } else if (this.autodrotSubTab === 'chat') {
            content.innerHTML = `
                <div class="live-chat-card mb-2 p-2">
                    <div class="flex-between mb-2">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-satellite-dish"></i> Эфир перекупов города</b>
                        <span class="tag-badge bg-tag-cyan">Live</span>
                    </div>
                    <div id="lifeChatFeed" class="chat-messages-container" style="max-height: 230px;"></div>
                    <div class="chat-compose-box mt-2">
                        <input type="text" id="feedMessageInput" class="chat-input" placeholder="Написать в Autodrot..." maxlength="100">
                        <button onclick="sendChatMessageFromInput()" class="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
                    </div>
                </div>
            `;
            if (typeof renderLifeChat === 'function') renderLifeChat();
        } else if (this.autodrotSubTab === 'hotdeals') {
            content.innerHTML = `
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber"><i class="fa-solid fa-fire"></i> Срочный выкуп с рук</b>
                        <span class="tag-badge bg-tag-amber">Дисконт -35%</span>
                    </div>
                    <p class="sub-label mb-2" style="font-size:10px;">Владельцам срочно нужны наличные! Успейте забрать лот до истечения таймера.</p>
                </div>
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs">Toyota Mark II JZX90 (Срочно)</b>
                        <span class="tag-badge bg-tag-red">Осталось: 55с</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">Цена продавца: <b class="color-green">290,000 ₽</b> (Рынок: 450,000 ₽)</div>
                    <button onclick="showToast('Лот выкуплен другим игроком в сети!');" class="btn btn-amber btn-sm w-full">Перехватить сделку ⚡</button>
                </div>
            `;
        }
    },

    renderP2PListingsFiltered() {
        const list = document.getElementById('p2pItemsList');
        if (!list) return;

        let filter = this.autodrotP2PFilter || 'cars';
        if (!state.p2pMarketListings) state.p2pMarketListings = [];

        let filtered = state.p2pMarketListings.filter(item => item.type === filter);

        if (filtered.length === 0) {
            list.innerHTML = "<div class='glass-card text-center sub-label py-6'>В этой категории биржи пока нет лотов.</div>";
            return;
        }

        let html = "";
        filtered.forEach(item => {
            let isMy = (state.myP2PListings && state.myP2PListings.includes(item.id));
            let btnAction = isMy 
                ? `<button onclick="cancelP2PListing('${item.id}')" class="btn btn-danger btn-auto btn-sm">Снять с продажи</button>`
                : `<button onclick="PhoneManager.buyP2PAnyListing('${item.id}')" class="btn btn-green btn-auto btn-sm">Купить (${item.price.toLocaleString()} ₽)</button>`;

            html += `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan">${item.name}</b>
                    <span class="price-val text-xs color-green">${item.price.toLocaleString()} ₽</span>
                </div>
                <div class="sub-label mb-2" style="font-size:10px;">Продавец: <b>${item.seller}</b> ${item.desc ? '• ' + item.desc : ''}</div>
                <div class="text-right">${btnAction}</div>
            </div>`;
        });
        list.innerHTML = html;
    },

    buyP2PAnyListing(listingId) {
        const idx = (state.p2pMarketListings || []).findIndex(l => l.id === listingId);
        if (idx === -1) return;
        const lot = state.p2pMarketListings[idx];

        let cash = state.player?.cash || 0;
        if (cash < lot.price) return showToast("Не хватает денег для выкупа лота!");

        if (lot.type === 'business') {
            state.player.cash -= lot.price;
            let targetBiz = (state.businesses || []).find(b => b.id === lot.bizId);
            if (targetBiz) {
                targetBiz.level = Math.max(targetBiz.level || 0, lot.bizLevel || 1);
                targetBiz.stock = 100;
            }
            showToast(`Вы выкупили готовый бизнес «${lot.name}» с P2P биржи!`);
        } else if (lot.type === 'housing') {
            state.player.cash -= lot.price;
            if (!state.player.ownedHouses) state.player.ownedHouses = [];
            if (!state.player.ownedHouses.includes(lot.houseId)) state.player.ownedHouses.push(lot.houseId);
            state.player.housingId = lot.houseId;
            state.player.housingType = 'own';
            showToast(`Вы выкупили недвижимость «${lot.name}» с P2P биржи!`);
        } else if (lot.type === 'cars' || lot.type === 'car' || lot.type === 'plates' || lot.type === 'plate') {
            buyP2PListing(listingId);
            return;
        }

        state.p2pMarketListings.splice(idx, 1);
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        this.renderAutodrotSubScreen();
    },

    // ========================================================
    // 8. ВО-БАНК ОНЛАЙН (РАСШИРЕННЫЙ ФУНКЦИОНАЛ)
    // ========================================================
    renderBankApp(container) {
        let cash = state.player?.cash || 0;
        let safe = state.player?.safeDeposit || 0;
        let debt = state.player?.loanDebt || 0;
        let sub = this.bankSubTab || 'accounts';

        let depositsListHtml = "";
        let deposits = state.player?.bankDeposits || [];
        if (deposits.length === 0) {
            depositsListHtml = "<div class='sub-label text-center py-2'>У вас нет активных вкладов.</div>";
        } else {
            deposits.forEach((dep, dIdx) => {
                depositsListHtml += `
                <div class="glass-card p-2 flex-between mb-2">
                    <div>
                        <b class="text-xs color-green">${dep.name}</b>
                        <div class="sub-label" style="font-size:9.5px;">Сумма с процентами: <b class="color-green">${dep.amount.toLocaleString()} ₽</b> (+${(dep.dailyRate * 100).toFixed(0)}%/день)</div>
                    </div>
                    <button onclick="closeBankDepositAction(${dIdx}); PhoneManager.renderBankApp(document.getElementById('phoneAppContainer'));" class="btn btn-green btn-auto btn-sm">Забрать</button>
                </div>`;
            });
        }

        let historyHtml = "";
        let history = state.player?.bankHistory || [];
        if (history.length === 0) {
            historyHtml = "<div class='sub-label text-center py-2'>История операций пуста.</div>";
        } else {
            history.forEach(tx => {
                historyHtml += `
                <div class="p-2 flex-between mb-1" style="background:#090e18; border-radius:6px; border:1px solid rgba(255,255,255,0.04);">
                    <div>
                        <div class="text-xs">${tx.title}</div>
                        <div class="sub-label" style="font-size:8.5px;">${tx.time}</div>
                    </div>
                    <b class="text-xs ${tx.isIncome ? 'color-green' : 'color-red'}">${tx.isIncome ? '+' : '-'}${tx.amount.toLocaleString()} ₽</b>
                </div>`;
            });
        }

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-vault color-green"></i> Во-Банк Онлайн</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                
                <div class="grid-4 mb-2">
                    <button onclick="PhoneManager.switchBankSubTab('accounts')" class="btn ${sub === 'accounts' ? 'btn-green' : 'btn-dark'} btn-sm">Счета</button>
                    <button onclick="PhoneManager.switchBankSubTab('deposits')" class="btn ${sub === 'deposits' ? 'btn-green' : 'btn-dark'} btn-sm">Вклады</button>
                    <button onclick="PhoneManager.switchBankSubTab('credit')" class="btn ${sub === 'credit' ? 'btn-green' : 'btn-dark'} btn-sm">Кредит</button>
                    <button onclick="PhoneManager.switchBankSubTab('history')" class="btn ${sub === 'history' ? 'btn-green' : 'btn-dark'} btn-sm">Выписка</button>
                </div>

                ${sub === 'accounts' ? `
                    <div class="glass-card mb-2 p-2">
                        <div class="flex-between mb-1">
                            <span class="sub-label text-xs">Текущий счет перекупа:</span>
                            <span class="tag-badge bg-tag-green">Основной</span>
                        </div>
                        <div class="price-val color-green mb-2">${cash.toLocaleString()} ₽</div>
                        
                        <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                            <div class="flex-between">
                                <div>
                                    <div class="text-xs font-bold color-amber"><i class="fa-solid fa-lock"></i> Неприкосновенный Сейф</div>
                                    <div class="sub-label" style="font-size:9px;">Начисление +3% в полночь | Защита от рэкета</div>
                                </div>
                                <b class="color-amber text-xs">${safe.toLocaleString()} ₽</b>
                            </div>
                        </div>

                        <div class="grid-2 mb-2">
                            <button onclick="depositToSafeAction(50000); PhoneManager.renderBankApp(document.getElementById('phoneAppContainer'));" class="btn btn-dark btn-sm">+50k в сейф</button>
                            <button onclick="depositToSafeAction(200000); PhoneManager.renderBankApp(document.getElementById('phoneAppContainer'));" class="btn btn-dark btn-sm">+200k в сейф</button>
                        </div>
                        <button onclick="withdrawFromSafeAction(); PhoneManager.renderBankApp(document.getElementById('phoneAppContainer'));" class="btn btn-green btn-sm w-full">Забрать всё из сейфа</button>
                    </div>
                ` : ''}

                ${sub === 'deposits' ? `
                    <div class="glass-card mb-2 p-2">
                        <b class="text-xs color-green mb-1 block">📈 Срочные депозиты с повышенной ставкой:</b>
                        <div class="grid-2 mb-2">
                            <button onclick="openBankDepositAction(100000, 7, 0.025); PhoneManager.renderBankApp(document.getElementById('phoneAppContainer'));" class="btn btn-cyan btn-sm">100k под 2.5%/д</button>
                            <button onclick="openBankDepositAction(500000, 14, 0.035); PhoneManager.renderBankApp(document.getElementById('phoneAppContainer'));" class="btn btn-green btn-sm">500k под 3.5%/д</button>
                        </div>
                        <div class="text-xs font-bold mb-1">Активные депозиты:</div>
                        ${depositsListHtml}
                    </div>
                ` : ''}

                ${sub === 'credit' ? `
                    <div class="glass-card mb-2 p-2">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-red"><i class="fa-solid fa-handholding-dollar"></i> Кредитная линия перекупа</b>
                            <span class="sub-label text-xs">Долг: <b class="color-amber">${debt.toLocaleString()} ₽</b></span>
                        </div>
                        <div class="grid-2 mb-2">
                            <button onclick="takeLoan(100000); PhoneManager.renderBankApp(document.getElementById('phoneAppContainer'));" class="btn btn-dark btn-sm">Взять 100k</button>
                            <button onclick="takeLoan(500000); PhoneManager.renderBankApp(document.getElementById('phoneAppContainer'));" class="btn btn-dark btn-sm">Взять 500k</button>
                        </div>
                        <div class="grid-3">
                            <button onclick="repayLoan(25); PhoneManager.renderBankApp(document.getElementById('phoneAppContainer'));" class="btn btn-cyan btn-sm">25%</button>
                            <button onclick="repayLoan(50); PhoneManager.renderBankApp(document.getElementById('phoneAppContainer'));" class="btn btn-cyan btn-sm">50%</button>
                            <button onclick="repayLoan(100); PhoneManager.renderBankApp(document.getElementById('phoneAppContainer'));" class="btn btn-green btn-sm">Всё</button>
                        </div>
                    </div>
                ` : ''}

                ${sub === 'history' ? `
                    <div class="glass-card mb-2 p-2">
                        <b class="text-xs color-cyan mb-2 block">📋 Последние транзакции по счетам:</b>
                        <div class="space-y-1" style="max-height: 220px; overflow-y: auto;">
                            ${historyHtml}
                        </div>
                    </div>
                ` : ''}

            </div>
        `;
    },

    switchBankSubTab(tab) {
        playSound('tick');
        tgHaptic('light');
        this.bankSubTab = tab;
        this.renderBankApp(document.getElementById('phoneAppContainer'));
    },

    renderReshalaApp(container) {
        let conn = state.player?.connections || 0;
        let immunity = state.player?.policeImmunityDays || 0;
        let hasLic = !!state.player?.hasRacingLicense;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-user-secret color-purple"></i> Решала Артур</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="reshala-banner mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-purple">Теневые Связи: ${conn} 🤝</b>
                        <span class="tag-badge bg-tag-purple">Штаб</span>
                    </div>
                    <div class="sub-label" style="font-size:10px;">Отмена 12.5.1, снятие розыска с VIN и крыша ГИБДД.</div>
                </div>

                <div class="grid-2 mb-2">
                    <button onclick="buyReshalaPack('pack1'); PhoneManager.renderReshalaApp(document.getElementById('phoneAppContainer'));" class="btn btn-purple btn-sm">1 Связь (150k)</button>
                    <button onclick="buyReshalaPack('pack5'); PhoneManager.renderReshalaApp(document.getElementById('phoneAppContainer'));" class="btn btn-purple btn-sm">5 Связей (650k)</button>
                </div>

                <div class="reshala-deal-card mb-2 p-2">
                    <div class="flex-between">
                        <b class="text-xs">🚨 Крыша ГИБДД (3 дня)</b>
                        <span class="tag-badge bg-tag-amber">${immunity > 0 ? immunity + ' дн.' : 'Иммунитет'}</span>
                    </div>
                    <p class="sub-label my-1" style="font-size:10px;">Защита от облав на заездах и штрафов за просроченный ДКП.</p>
                    <button onclick="buyReshalaService('roof'); PhoneManager.renderReshalaApp(document.getElementById('phoneAppContainer'));" class="btn btn-amber btn-sm w-full" ${immunity > 0 ? 'disabled' : ''}>
                        ${immunity > 0 ? 'Крыша активна' : 'Оформить (350k ₽ / 45 ⭐)'}
                    </button>
                </div>

                <div class="reshala-deal-card mb-2 p-2">
                    <div class="flex-between">
                        <b class="text-xs">🏎️ Гоночная Лицензия РАФ</b>
                        <span class="tag-badge bg-tag-cyan">402 метра</span>
                    </div>
                    <p class="sub-label my-1" style="font-size:10px;">Официальный регламентный допуск пилота к заездам.</p>
                    <button onclick="buyReshalaService('license'); PhoneManager.renderReshalaApp(document.getElementById('phoneAppContainer'));" class="btn btn-cyan btn-sm w-full" ${hasLic ? 'disabled' : ''}>
                        ${hasLic ? 'Оформлено ✓' : 'Оформить (85k ₽ / 1 🤝)'}
                    </button>
                </div>

                <div class="reshala-deal-card p-2">
                    <div class="flex-between">
                        <b class="text-xs">🔏 Легализация криминала</b>
                        <span class="tag-badge bg-tag-cyan">Чистый VIN</span>
                    </div>
                    <p class="sub-label my-1" style="font-size:10px;">Снимает статус «В розыске» с проблемного авто.</p>
                    <button onclick="openLegalizeCarModal()" class="btn btn-dark btn-sm w-full">Выбрать авто (200k + 1 🤝)</button>
                </div>
            </div>
        `;
    },

    renderSyndicateApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-globe color-purple"></i> Синдикат & Контракты</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="grid-4 mb-2">
                    <button onclick="switchSyndicateTab('contracts')" id="synTabBtn-contracts" class="btn btn-cyan btn-sm">Заказы</button>
                    <button onclick="switchSyndicateTab('blackmarket')" id="synTabBtn-blackmarket" class="btn btn-dark btn-sm">Тень</button>
                    <button onclick="switchSyndicateTab('clubs')" id="synTabBtn-clubs" class="btn btn-dark btn-sm">Клубы</button>
                    <button onclick="switchSyndicateTab('leaderboard')" id="synTabBtn-leaderboard" class="btn btn-dark btn-sm">Топ</button>
                </div>

                <div id="synScreen-contracts">
                    <div class="glass-card mb-2 p-2">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-cyan"><i class="fa-solid fa-file-contract"></i> Заказы Синдиката</b>
                            <button onclick="refreshContractsManual()" class="btn btn-dark btn-auto btn-sm">Обновить (15k)</button>
                        </div>
                        <div class="sub-label" style="font-size:10px;">Поставка проверенных автомобилей клиентам под ключ.</div>
                    </div>
                    <div id="contractsList"></div>
                    <div id="contractsLockCover" class="level-lock-cover" style="display:none;"></div>
                </div>

                <div id="synScreen-blackmarket" style="display:none;">
                    <div class="glass-card mb-2 p-2">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-purple"><i class="fa-solid fa-mask"></i> Теневой рынок номеров</b>
                            <span class="tag-badge bg-tag-purple">VIP</span>
                        </div>
                        <p class="sub-label mb-2" style="font-size:10px;">Биржа редких госномеров (777, ЕКХ, АМР).</p>
                        <button onclick="refreshBlackMarketPlates()" class="btn btn-dark btn-sm w-full mb-2">Обновить (25k ₽)</button>
                        <div id="blackMarketPlatesList"></div>
                    </div>
                </div>

                <div id="synScreen-clubs" style="display:none;">
                    <div class="glass-card mb-2 p-2">
                        <div class="flex-between mb-1">
                            <div>
                                <div class="sub-label" style="font-size:9px;">Ваш автоклуб:</div>
                                <b class="color-cyan text-xs" id="synMyClubName">Без автоклуба</b>
                            </div>
                            <button onclick="createClubPrompt()" class="btn btn-amber btn-auto btn-sm">+ Создать</button>
                        </div>
                    </div>
                    <div id="synClubsContainer"></div>
                </div>

                <div id="synScreen-leaderboard" style="display:none;">
                    <div class="glass-card mb-2 p-2 flex-between">
                        <b class="text-xs color-amber"><i class="fa-solid fa-trophy"></i> Топ Перекупов</b>
                        <span class="sub-label" style="font-size:10px;">Топ-50</span>
                    </div>
                    <div id="leaderboardListContainer"></div>
                </div>
            </div>
        `;
        if (typeof renderContracts === 'function') renderContracts();
    },

    renderContainersApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-box-open color-purple"></i> Порт & Контейнеры</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle, rgba(220, 38, 38, 0.2) 0%, #0b101a 100%); border-color: rgba(220, 38, 38, 0.4);">
                    <div class="flex-between mb-1">
                        <b class="color-red text-xs"><i class="fa-solid fa-gavel"></i> Слепой аукцион ФССП</b>
                        <span class="tag-badge bg-tag-red">Слепой лот</span>
                    </div>
                    <p class="sub-label mb-2" style="font-size:10px;">Машина под чехлом. Неизвестен пробег и проблемы.</p>
                    <button onclick="openBlindAuctionModal()" class="btn btn-danger btn-sm w-full">Перейти к торгам</button>
                </div>

                <div class="glass-card p-2">
                    <div class="flex-between mb-2">
                        <b class="text-xs color-purple"><i class="fa-solid fa-ship"></i> Портовые Контейнеры</b>
                        <span class="sub-label" style="font-size:10px;">Таможня Кобе / Copart</span>
                    </div>
                    <div id="containersListRender"></div>
                    <div id="containersLockCover" class="level-lock-cover" style="display:none;">
                        <h4 class="font-bold">Таможня закрыта</h4>
                        <p class="sub-label">С 12 уровня!</p>
                    </div>
                </div>
            </div>
        `;
        if (typeof renderContainersList === 'function') renderContainersList();
    },

    renderShopApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-cart-shopping color-amber"></i> Авто-Маркет</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="grid-4 mb-2">
                    <button onclick="switchShopSection('tools')" id="shopTab-tools" class="btn btn-cyan btn-sm">Приборы</button>
                    <button onclick="switchShopSection('consumables')" id="shopTab-consumables" class="btn btn-dark btn-sm">Сырьё</button>
                    <button onclick="switchShopSection('tuningParts')" id="shopTab-tuningParts" class="btn btn-dark btn-sm">Тюнинг</button>
                    <button onclick="switchShopSection('homeItems')" id="shopTab-homeItems" class="btn btn-dark btn-sm">Дом</button>
                </div>
                <div id="shopSec-tools"><div id="shopToolsList" class="space-y-2 mb-2"></div></div>
                <div id="shopSec-consumables" style="display:none;"><div id="shopConsumablesList" class="space-y-2 mb-2"></div></div>
                <div id="shopSec-tuningParts" style="display:none;"><div id="shopTuningPartsList" class="space-y-2 mb-2"></div></div>
                <div id="shopSec-homeItems" style="display:none;"><div id="shopHomeItemsList" class="space-y-2 mb-2"></div></div>
            </div>
        `;
        if (typeof switchShopSection === 'function') switchShopSection('tools');
    },

    renderRadarApp(container) {
        let immunity = state.player?.policeImmunityDays || 0;
        let races = state.player?.consecutiveRaces || 0;
        let maxRaces = state.player?.maxRacesBeforeRaid || 12;

        let statusText = immunity > 0 
            ? `<span class="color-green font-bold">Иммунитет (${immunity} дн.)</span>` 
            : `<span class="color-amber font-bold">Рейды активны</span>`;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-tower-broadcast color-red"></i> ДПС Радар</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-2">
                        <b class="text-xs">Статус рейдов:</b>
                        ${statusText}
                    </div>
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label">Внимание ДПС на 402м:</span>
                        <b class="${races > 8 ? 'color-red' : 'color-green'}">${races} / ${maxRaces} заездов</b>
                    </div>
                    <div class="biz-progress-track mb-2">
                        <div class="biz-progress-fill ${races > 8 ? 'risk-high' : 'fill-biz-stock'}" style="width:${Math.min(100, (races / maxRaces) * 100)}%;"></div>
                    </div>
                    <p class="sub-label mb-2" style="font-size:10px;">При превышении лимита экипаж ДПС устраивает облаву и конфискует корч на штрафстоянку!</p>
                    <button onclick="PhoneManager.openApp('reshala')" class="btn btn-purple btn-sm w-full">Купить крышу у Решалы</button>
                </div>
            </div>
        `;
    },

    renderMessagesList(container) {
        const messages = state.player?.phoneMessages || [];
        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-comment-dots color-cyan"></i> Сообщения</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="phone-messages-list">
        `;

        if (messages.length === 0) {
            html += `<div class="sub-label text-center py-6">Нет входящих сообщений</div>`;
        } else {
            messages.forEach(msg => {
                let unreadClass = msg.unread ? 'unread-msg' : '';
                let unreadDot = msg.unread ? '<span class="phone-unread-dot"></span>' : '';
                html += `
                    <div class="phone-msg-item ${unreadClass}" onclick="PhoneManager.openChat('${msg.id}')">
                        <div class="phone-msg-avatar">${msg.avatar || '👤'}</div>
                        <div class="phone-msg-content">
                            <div class="flex-between">
                                <b class="text-xs">${msg.sender}</b>
                                <span class="sub-label" style="font-size:9px;">${msg.time || 'Сейчас'}</span>
                            </div>
                            <div class="phone-msg-preview">${msg.preview}</div>
                        </div>
                        ${unreadDot}
                    </div>
                `;
            });
        }

        html += `</div></div>`;
        container.innerHTML = html;
    },

    openChat(msgId) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (msg) {
            msg.unread = false;
            this.updateUnreadBadge();
            saveState();
        }
        this.activeChatId = msgId;
        this.renderPhoneScreen();
    },

    renderChatConversation(container, msgId) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (!msg) return this.goHome();

        let historyHtml = '';
        (msg.chatHistory || []).forEach(chat => {
            let isMine = chat.from === 'me';
            historyHtml += `
                <div class="chat-msg ${isMine ? 'msg-player' : 'msg-seller'}">
                    ${chat.text}
                </div>
            `;
        });

        let actionButtons = '';
        if (msg.isScam) {
            actionButtons = `
                <div class="p-2 mb-2" style="background:rgba(255,51,102,0.1); border:1px solid var(--red); border-radius:8px;">
                    <div class="text-xs color-red font-bold mb-1">Подозрение на мошенничество!</div>
                    <div class="grid-2">
                        <button onclick="PhoneManager.resolveScamMessage('${msg.id}', false)" class="btn btn-green btn-sm">Заблокировать 🛡️</button>
                        <button onclick="PhoneManager.resolveScamMessage('${msg.id}', true)" class="btn btn-danger btn-sm">Перевести 50k 💸</button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.activeChatId = null; PhoneManager.renderPhoneScreen();" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title">${msg.avatar || '👤'} ${msg.sender}</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body" style="display:flex; flex-direction:column; justify-content:space-between;">
                <div class="chat-thread-container" style="flex:1; max-height:none; margin-bottom:10px;">
                    ${historyHtml}
                </div>
                ${actionButtons}
                <div class="chat-compose-box">
                    <input type="text" id="phoneReplyInput" class="chat-input" placeholder="Ответить...">
                    <button onclick="PhoneManager.sendReplyMessage('${msg.id}')" class="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>
        `;
    },

    sendReplyMessage(msgId) {
        const input = document.getElementById('phoneReplyInput');
        if (!input || !input.value.trim()) return;
        const text = input.value.trim();

        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (!msg) return;

        if (!msg.chatHistory) msg.chatHistory = [];
        msg.chatHistory.push({ from: 'me', text: text });
        msg.preview = "Вы: " + text;
        input.value = '';

        setTimeout(() => {
            let replyText = "Сообщение принято.";
            if (msg.sender.includes("Во-Банк")) replyText = "Запрос зарегистрирован банковским сервисом.";
            else if (msg.sender.includes("Артур")) replyText = "Добро. Будут вопросы — пиши.";
            else if (msg.sender.includes("Влад")) replyText = "Красава, ждём твоих заездов на треке!";
            else if (msg.isScam) replyText = "Оператор безопасности требует срочного перевода средств!";
            else replyText = "Понял тебя. На связи!";

            msg.chatHistory.push({ from: 'them', text: replyText });
            msg.preview = replyText;
            saveState();
            if (PhoneManager.currentApp === 'messages' && PhoneManager.activeChatId === msgId) {
                PhoneManager.renderPhoneScreen();
            }
            playSound('tick');
            tgHaptic('light');
        }, 1000);

        saveState();
        this.renderPhoneScreen();
    },

    resolveScamMessage(msgId, fellForScam) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (!msg) return;

        if (fellForScam) {
            let loss = 50000;
            state.player.cash = Math.max(0, (state.player.cash || 0) - loss);
            state.player.mood = Math.max(0, (state.player.mood || 80) - 25);
            msg.chatHistory.push({ from: 'them', text: "Спасибо за перевод, наивный перекуп!" });
            msg.isScam = false;
            openVerdictModal("РАЗВОД МОШЕННИКОВ! 💸", `Вы поддались на спам и перевели мошенникам ${loss.toLocaleString()} ₽!`, false);
        } else {
            msg.chatHistory.push({ from: 'them', text: "Номер добавлен в спам-фильтр." });
            msg.isScam = false;
            state.player.karma = Math.min(100, (state.player.karma || 50) + 3);
            showToast("🛡️ Мошенник заблокирован! Карма (+3)");
        }

        saveState();
        this.renderPhoneScreen();
    },

    pushBuyerFollowupSMS(carName, isScamDetected, buyerName) {
        if (!state.player.phoneMessages) state.player.phoneMessages = [];

        let msgId = "sms_buyer_" + Date.now();
        let newSMS = null;

        if (isScamDetected) {
            newSMS = {
                id: msgId,
                sender: `😡 ${buyerName}`,
                avatar: "🤬",
                preview: `Ты что мне впарил?! На ${carName} скрытый дефект!`,
                time: "Только что",
                unread: true,
                chatHistory: [
                    { from: "them", text: `Слышь, перекуп! Я доехал до дома на «${carName}», а мотор застучал! Сервис сказал, была залита загущающая присадка!` },
                    { from: "them", text: `Жди гостей, я знаю твой гараж! Либо возвращай часть суммы, либо будут проблемы!` }
                ]
            };
        } else {
            newSMS = {
                id: msgId,
                sender: `🤝 ${buyerName}`,
                avatar: "🙂",
                preview: `Спасибо за ${carName}! Машина огонь, мотор шепчет.`,
                time: "Только что",
                unread: true,
                chatHistory: [
                    { from: "them", text: `Привет! Добрался отлично на «${carName}». Всё как ты и говорил — честный ухоженный аппарат.` },
                    { from: "them", text: `Оставил отличный отзыв среди знакомых водителей. Респект!` }
                ]
            };
        }

        state.player.phoneMessages.unshift(newSMS);
        this.updateUnreadBadge();
        saveState();
        showToast(`📲 Новое SMS от ${buyerName}!`);
        playSound('win');
        tgHaptic('success');
    }
};

window.PhoneManager = PhoneManager;
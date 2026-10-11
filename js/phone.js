// ========================================================
// js/phone.js — ИНТЕРАКТИВНЫЙ СМАРТФОН «PerekupOS» (v0.4.5)
// Разработчики: Илья Чепиль (DXF) & Perekup Dev Team
// Автопрочтение сообщений при входе, ребаланс Супер Вилспина,
// антифарм/износ в Дрифте и 402м, развитый Во-Банк, Блокнот
// ========================================================

const ELECTRONIC_RADIO_STATIONS = [
    // --- Сеть Radio Record ---
    { id: 'rec_main', name: 'Radio Record (Main)', network: 'Record', genre: 'EDM / Club Dance', stream: 'https://radiorecord.hostingradio.ru/rr_main96.aacp' },[span_0](start_span)[span_0](end_span)
    { id: 'rec_phonk', name: 'Record Phonk', network: 'Record', genre: 'Drift Phonk / Memphis', stream: 'https://radiorecord.hostingradio.ru/phonk96.aacp' },[span_1](start_span)[span_1](end_span)
    { id: 'rec_ps', name: 'Пиратская Станция', network: 'Record', genre: 'Drum & Bass / Jungle', stream: 'https://radiorecord.hostingradio.ru/ps96.aacp' },[span_2](start_span)[span_2](end_span)
    { id: 'rec_trap', name: 'Record Trap & Bass', network: 'Record', genre: 'Trap / Heavy Bass', stream: 'https://radiorecord.hostingradio.ru/trap96.aacp' },[span_3](start_span)[span_3](end_span)
    { id: 'rec_techno', name: 'Record Techno', network: 'Record', genre: 'Peak-Time Techno / Rave', stream: 'https://radiorecord.hostingradio.ru/techno96.aacp' },[span_4](start_span)[span_4](end_span)
    { id: 'rec_dub', name: 'Record Dubstep', network: 'Record', genre: 'Dubstep / Brostep', stream: 'https://radiorecord.hostingradio.ru/dub96.aacp' },[span_5](start_span)[span_5](end_span)
    { id: 'rec_synth', name: 'Record Synthwave', network: 'Record', genre: 'Retrowave / 80s Electro', stream: 'https://radiorecord.hostingradio.ru/synth96.aacp' },[span_6](start_span)[span_6](end_span)
    { id: 'rec_rus', name: 'Record Russian Mix', network: 'Record', genre: 'Русский Дэнс', stream: 'https://radiorecord.hostingradio.ru/rus96.aacp' },[span_7](start_span)[span_7](end_span)
    { id: 'rec_chill', name: 'Record Chill-Out', network: 'Record', genre: 'Lounge / Atmospheric', stream: 'https://radiorecord.hostingradio.ru/chil96.aacp' },[span_8](start_span)[span_8](end_span)

    // --- Альтернативные независимые электронные стримы ---
    { id: 'soma_defcon', name: 'DEF CON Radio (SomaFM)', network: 'SomaFM', genre: 'Cyberpunk / Dark Electronic', stream: 'https://ice1.somafm.com/defcon-128-mp3' },[span_9](start_span)[span_9](end_span)
    { id: 'soma_groove', name: 'Groove Salad (SomaFM)', network: 'SomaFM', genre: 'Downtempo / Ambient Electronic', stream: 'https://ice1.somafm.com/groovesalad-128-mp3' },[span_10](start_span)[span_10](end_span)
    { id: 'soma_trip', name: 'The Trip (SomaFM)', network: 'SomaFM', genre: 'Progressive House & Trance', stream: 'https://ice1.somafm.com/thetrip-128-mp3' },[span_11](start_span)[span_11](end_span)
    { id: 'soma_beat', name: 'Beat Blender (SomaFM)', network: 'SomaFM', genre: 'Deep House / Smooth Tech', stream: 'https://ice1.somafm.com/beatblender-128-mp3' },[span_12](start_span)[span_12](end_span)
    { id: 'soma_dub', name: 'Dub Step Beyond (SomaFM)', network: 'SomaFM', genre: 'Deep Dubstep / Sub-Bass', stream: 'https://ice1.somafm.com/dubstep-128-mp3' },[span_13](start_span)[span_13](end_span)
    { id: 'soma_space', name: 'Space Station (SomaFM)', network: 'SomaFM', genre: 'Midtempo Space Electronica', stream: 'https://ice1.somafm.com/spacestation-128-mp3' },[span_14](start_span)[span_14](end_span)
    { id: 'nightwave', name: 'Nightwave Plaza', network: 'Plaza.one', genre: 'Vaporwave / Future Funk', stream: 'https://radio.plaza.one/mp3' },[span_15](start_span)[span_15](end_span)
    { id: 'dfm_club', name: 'DFM Club Dance', network: 'DFM', genre: 'Club Electronic / House', stream: 'https://dfm.hostingradio.ru/dfm128.mp3' }[span_16](start_span)[span_16](end_span)
];

let recordAudioElement = null;[span_17](start_span)[span_17](end_span)
let currentStationIdx = 0;[span_18](start_span)[span_18](end_span)
let isRadioPlaying = false;[span_19](start_span)[span_19](end_span)
let isRadioLoading = false;[span_20](start_span)[span_20](end_span)
let radioVolume = 0.8;[span_21](start_span)[span_21](end_span)
let radioNetworkFilter = 'all';[span_22](start_span)[span_22](end_span)

function getRecordAudio() {
    if (!recordAudioElement) {[span_23](start_span)[span_23](end_span)
        recordAudioElement = new Audio();[span_24](start_span)[span_24](end_span)
        recordAudioElement.preload = "none";[span_25](start_span)[span_25](end_span)
        recordAudioElement.volume = radioVolume;[span_26](start_span)[span_26](end_span)

        recordAudioElement.addEventListener('playing', () => {[span_27](start_span)[span_27](end_span)
            isRadioPlaying = true;[span_28](start_span)[span_28](end_span)
            isRadioLoading = false;[span_29](start_span)[span_29](end_span)
            updateRadioPlaybackUI();[span_30](start_span)[span_30](end_span)
        });

        recordAudioElement.addEventListener('pause', () => {[span_31](start_span)[span_31](end_span)
            isRadioPlaying = false;[span_32](start_span)[span_32](end_span)
            isRadioLoading = false;[span_33](start_span)[span_33](end_span)
            updateRadioPlaybackUI();[span_34](start_span)[span_34](end_span)
        });

        recordAudioElement.addEventListener('waiting', () => {[span_35](start_span)[span_35](end_span)
            isRadioLoading = true;[span_36](start_span)[span_36](end_span)
            updateRadioPlaybackUI();[span_37](start_span)[span_37](end_span)
        });

        recordAudioElement.addEventListener('error', (e) => {[span_38](start_span)[span_38](end_span)
            console.warn("[Radio Audio Error]:", e);[span_39](start_span)[span_39](end_span)
            isRadioPlaying = false;[span_40](start_span)[span_40](end_span)
            isRadioLoading = false;[span_41](start_span)[span_41](end_span)
            updateRadioPlaybackUI();[span_42](start_span)[span_42](end_span)
            showToast("⚠️ Ошибка соединения с аудиопотоком станции");[span_43](start_span)[span_43](end_span)
        });
    }
    return recordAudioElement;[span_44](start_span)[span_44](end_span)
}

function updateRadioPlaybackUI() {
    const playBtn = document.getElementById('radioPlayPauseBtn');[span_45](start_span)[span_45](end_span)
    const statusText = document.getElementById('radioLiveStatus');[span_46](start_span)[span_46](end_span)
    const visualizer = document.getElementById('radioWaveVisualizer');[span_47](start_span)[span_47](end_span)
    const curStation = ELECTRONIC_RADIO_STATIONS[currentStationIdx];[span_48](start_span)[span_48](end_span)
    if (!curStation) return;[span_49](start_span)[span_49](end_span)

    if (playBtn) {[span_50](start_span)[span_50](end_span)
        if (isRadioLoading) {[span_51](start_span)[span_51](end_span)
            playBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> ЗАГРУЗКА...";[span_52](start_span)[span_52](end_span)
            playBtn.className = "btn btn-dark btn-sm";[span_53](start_span)[span_53](end_span)
        } else if (isRadioPlaying) {[span_54](start_span)[span_54](end_span)
            playBtn.innerHTML = "<i class='fa-solid fa-pause'></i> ПАУЗА";[span_55](start_span)[span_55](end_span)
            playBtn.className = "btn btn-amber btn-sm";[span_56](start_span)[span_56](end_span)
        } else {
            playBtn.innerHTML = "<i class='fa-solid fa-play'></i> СЛУШАТЬ";[span_57](start_span)[span_57](end_span)
            playBtn.className = "btn btn-green btn-sm";[span_58](start_span)[span_58](end_span)
        }
    }

    if (statusText) {[span_59](start_span)[span_59](end_span)
        if (isRadioLoading) {[span_60](start_span)[span_60](end_span)
            statusText.innerHTML = `<span class="color-amber font-bold"><i class="fa-solid fa-rotate fa-spin"></i> ПОДКЛЮЧЕНИЕ К ПОТОКУ...</span>`;[span_61](start_span)[span_61](end_span)
        } else if (isRadioPlaying) {[span_62](start_span)[span_62](end_span)
            statusText.innerHTML = `<span class="color-green font-bold"><i class="fa-solid fa-satellite-dish"></i> В ЭФИРЕ • Live Stream [${curStation.network}]</span>`;[span_63](start_span)[span_63](end_span)
        } else {
            statusText.innerHTML = `<span class="sub-label">ОСТАНОВЛЕНО</span>`;[span_64](start_span)[span_64](end_span)
        }
    }

    if (visualizer) {[span_65](start_span)[span_65](end_span)
        if (isRadioPlaying) visualizer.classList.add('playing');[span_66](start_span)[span_66](end_span)
        else visualizer.classList.remove('playing');[span_67](start_span)[span_67](end_span)
    }

    setTxt('radioCurrentTrackName', curStation.name);[span_68](start_span)[span_68](end_span)
    setTxt('radioCurrentGenre', `${curStation.genre} • ${curStation.network}`);[span_69](start_span)[span_69](end_span)
    setTxt('radioNetworkBadgeText', curStation.network.toUpperCase());[span_70](start_span)[span_70](end_span)
}

const PhoneManager = {
    currentApp: null,[span_71](start_span)[span_71](end_span)
    unreadCount: 0,[span_72](start_span)[span_72](end_span)
    activeChatId: null,[span_73](start_span)[span_73](end_span)
    autodrotSubTab: 'market',[span_74](start_span)[span_74](end_span)
    autodrotP2PFilter: 'cars',[span_75](start_span)[span_75](end_span)
    streetSubTab: 'drift',[span_76](start_span)[span_76](end_span)
    bankSubTab: 'accounts', // 'accounts' | 'deposits' | 'credit' | 'history'
    isSuperSpinning: false,[span_77](start_span)[span_77](end_span)

    defaultMessages: [
        {
            id: "sms_bank_welcome",[span_78](start_span)[span_78](end_span)
            sender: "💳 Во-Банк Онлайн",[span_79](start_span)[span_79](end_span)
            avatar: "🏦",[span_80](start_span)[span_80](end_span)
            preview: "Добро пожаловать в Во-Банк! Сейф активен (+3% в день).",[span_81](start_span)[span_81](end_span)
            time: "10:00",[span_82](start_span)[span_82](end_span)
            unread: true,[span_83](start_span)[span_83](end_span)
            chatHistory: [
                { from: "them", text: "Здравствуйте! Ваш сейф перекупа готов к приёму депозитов в приложении «Во-Банк». Каждый день вам начисляется +3% на остаток средств." },[span_84](start_span)[span_84](end_span)
                { from: "them", text: "Деньги в сейфе застрахованы от рэкета и уличных нападений на трассе." }[span_85](start_span)[span_85](end_span)
            ]
        },
        {
            id: "sms_street_boss",[span_86](start_span)[span_86](end_span)
            sender: "🏎️ Влад Стрит-Орг",[span_87](start_span)[span_87](end_span)
            avatar: "🏁",[span_88](start_span)[span_88](end_span)
            preview: "Техком RDS ужесточил правила. Проверь свой спек перед выездом!",[span_89](start_span)[span_89](end_span)
            time: "11:20",[span_90](start_span)[span_90](end_span)
            unread: true,[span_91](start_span)[span_91](end_span)
            chatHistory: [
                { from: "them", text: "Здорово! В RDS GP со 105 силами больше не суйся — судьи ставят баранку за распрямление в первой же дуге." },[span_92](start_span)[span_92](end_span)
                { from: "them", text: "Для слабых тачек открыт зимний паркинг ТЦ. В Европу и GP копи на турбо-мотор, каркас и слик!" }[span_93](start_span)[span_93](end_span)
            ]
        },
        {
            id: "sms_reshala_intro",[span_94](start_span)[span_94](end_span)
            sender: "🕵️‍♂️ Артур Решала",[span_95](start_span)[span_95](end_span)
            avatar: "🕶️",[span_96](start_span)[span_96](end_span)
            preview: "Связи наготове. Будут проблемы со штрафстоянкой или 12.5.1 — открывай приложение.",[span_97](start_span)[span_97](end_span)
            time: "09:45",[span_98](start_span)[span_98](end_span)
            unread: true,[span_99](start_span)[span_99](end_span)
            chatHistory: [
                { from: "them", text: "Привет. Номер мой в приложении есть. Любые вопросы с аннулированием учёта, крышей ГИБДД и лицензиями РАФ решаю за связи." },[span_100](start_span)[span_100](end_span)
                { from: "them", text: "Если попадется угнанная тачка — сделаем чистый VIN, не переживай." }[span_101](start_span)[span_101](end_span)
            ]
        },
        {
            id: "sms_scam_1",[span_102](start_span)[span_102](end_span)
            sender: "⚠️ Служба Безопасности",[span_103](start_span)[span_103](end_span)
            avatar: "🤖",[span_104](start_span)[span_104](end_span)
            preview: "С вашей карты зафиксирована попытка перевода 150,000 ₽!",[span_105](start_span)[span_105](end_span)
            time: "08:15",[span_106](start_span)[span_106](end_span)
            unread: true,[span_107](start_span)[span_107](end_span)
            isScam: true,[span_108](start_span)[span_108](end_span)
            scamCost: 50000,[span_109](start_span)[span_109](end_span)
            chatHistory: [
                { from: "them", text: "ВНИМАНИЕ! Подозрительная операция. Чтобы отменить перевод 150,000 ₽ на неизвестный счет, переведите 50,000 ₽ на безопасный резервный счет прямо сейчас!" }[span_110](start_span)[span_110](end_span)
            ]
        }
    ],

    init() {
        if (!state.player.phoneMessages || state.player.phoneMessages.length === 0) {[span_111](start_span)[span_111](end_span)
            state.player.phoneMessages = JSON.parse(JSON.stringify(this.defaultMessages));[span_112](start_span)[span_112](end_span)
        }
        if (state.player.streetCred === undefined) {[span_113](start_span)[span_113](end_span)
            state.player.streetCred = 100;[span_114](start_span)[span_114](end_span)
        }
        if (state.player.superSpinTickets === undefined) {[span_115](start_span)[span_115](end_span)
            state.player.superSpinTickets = 1;[span_116](start_span)[span_116](end_span)
        }
        if (!state.player.dailyQuests || state.player.dailyQuests.length === 0) {[span_117](start_span)[span_117](end_span)
            if (typeof refreshDailyQuestsList === 'function') {
                refreshDailyQuestsList();
            }
        }
        this.updateUnreadBadge();[span_118](start_span)[span_118](end_span)
        this.updatePhoneClock();[span_119](start_span)[span_119](end_span)
        setInterval(() => this.updatePhoneClock(), 1000);[span_120](start_span)[span_120](end_span)
    },

    updatePhoneClock() {
        const clockEl = document.getElementById('phoneStatusBarClock');[span_121](start_span)[span_121](end_span)
        if (!clockEl) return;[span_122](start_span)[span_122](end_span)
        const now = new Date();[span_123](start_span)[span_123](end_span)
        const hrs = String(now.getHours()).padStart(2, '0');[span_124](start_span)[span_124](end_span)
        const mins = String(now.getMinutes()).padStart(2, '0');[span_125](start_span)[span_125](end_span)
        clockEl.innerText = `${hrs}:${mins}`;[span_126](start_span)[span_126](end_span)
    },

    updateUnreadBadge() {
        const messages = state.player?.phoneMessages || [];[span_127](start_span)[span_127](end_span)
        this.unreadCount = messages.filter(m => m.unread).length;[span_128](start_span)[span_128](end_span)

        const navBadge = document.getElementById('phoneNavBadge');[span_129](start_span)[span_129](end_span)
        if (navBadge) {[span_130](start_span)[span_130](end_span)
            if (this.unreadCount > 0) {[span_131](start_span)[span_131](end_span)
                navBadge.style.display = 'inline-flex';[span_132](start_span)[span_132](end_span)
                navBadge.innerText = this.unreadCount;[span_133](start_span)[span_133](end_span)
            } else {
                navBadge.style.display = 'none';[span_134](start_span)[span_134](end_span)
            }
        }

        const appSmsBadge = document.getElementById('phoneAppSmsBadge');[span_135](start_span)[span_135](end_span)
        if (appSmsBadge) {[span_136](start_span)[span_136](end_span)
            if (this.unreadCount > 0) {[span_137](start_span)[span_137](end_span)
                appSmsBadge.style.display = 'block';[span_138](start_span)[span_138](end_span)
                appSmsBadge.innerText = this.unreadCount;[span_139](start_span)[span_139](end_span)
            } else {
                appSmsBadge.style.display = 'none';[span_140](start_span)[span_140](end_span)
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
        let totalIncomePerDay = 0;[span_141](start_span)[span_141](end_span)
        let totalStoredCash = 0;[span_142](start_span)[span_142](end_span)
        let activePoints = 0;[span_143](start_span)[span_143](end_span)
        let minStock = 100;[span_144](start_span)[span_144](end_span)

        if (state.businesses && Array.isArray(state.businesses)) {[span_145](start_span)[span_145](end_span)
            state.businesses.forEach(b => {[span_146](start_span)[span_146](end_span)
                if (b && b.level > 0) {[span_147](start_span)[span_147](end_span)
                    activePoints++;[span_148](start_span)[span_148](end_span)
                    totalStoredCash += (b.stored || 0);[span_149](start_span)[span_149](end_span)
                    if (b.stock > 0) {[span_150](start_span)[span_150](end_span)
                        totalIncomePerDay += ((b.income || 0) * b.level);[span_151](start_span)[span_151](end_span)
                    }
                    if (b.stock !== undefined && b.stock < minStock) {[span_152](start_span)[span_152](end_span)
                        minStock = b.stock;[span_153](start_span)[span_153](end_span)
                    }
                }
            });
        }
        if (activePoints === 0) minStock = 0;[span_154](start_span)[span_154](end_span)
        return { totalIncomePerDay, totalStoredCash, activePoints, minStock };[span_155](start_span)[span_155](end_span)
    },

    renderBusinessWidget() {
        const widgetContainer = document.getElementById('phoneBizWidgetContainer');[span_156](start_span)[span_156](end_span)
        if (!widgetContainer) return;[span_157](start_span)[span_157](end_span)

        const stats = this.getBusinessStats();[span_158](start_span)[span_158](end_span)
        let statusBadge = stats.activePoints === 0[span_159](start_span)[span_159](end_span)
            ? "<span class='tag-badge bg-tag-amber'>Нет точек</span>[span_160](start_span)"[span_160](end_span)
            : (stats.minStock <= 15 ? "<span class='tag-badge bg-tag-red'>Мало сырья!</span>" : "<span class='tag-badge bg-tag-green'>Работает</span>");[span_161](start_span)[span_161](end_span)

        widgetContainer.innerHTML = `
            <div class="phone-biz-widget">
                <div class="flex-between mb-1">
                    <div class="flex-gap" style="align-items:center;">
                        <div class="widget-icon-bubble"><i class="fa-solid fa-chart-pie color-green"></i></div>
                        <div>
                            <div class="widget-title">Сеть предприятий</div>
                            <div class="sub-label" style="font-size:9px;">Активно: <b>${stats.activePoints}</b> точек</div>
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
        `;[span_162](start_span)[span_162](end_span)
    },

    renderDailyQuestsWidget() {
        const widget = document.getElementById('phoneDailyQuestsWidget');[span_163](start_span)[span_163](end_span)
        if (!widget) return;[span_164](start_span)[span_164](end_span)

        if (!state.player.dailyQuests || state.player.dailyQuests.length === 0) {[span_165](start_span)[span_165](end_span)
            if (typeof refreshDailyQuestsList === 'function') refreshDailyQuestsList();
        }

        let quests = state.player.dailyQuests;[span_166](start_span)[span_166](end_span)
        let html = `
            <div class="flex-between mb-1">
                <div class="flex-gap" style="align-items:center;">
                    <i class="fa-solid fa-list-check color-cyan" style="font-size:12px;"></i>
                    <b class="text-xs" style="font-size:11px;">План перекупа на день</b>
                </div>
                <span class="sub-label" style="font-size:9px; color:var(--cyan);">Сброс в 00:00 🌙</span>
            </div>
        `;[span_167](start_span)[span_167](end_span)

        quests.forEach((q, idx) => {[span_168](start_span)[span_168](end_span)
            let cur = q.cur || 0;
            let max = q.max || q.target || 1;
            let pct = Math.min(100, Math.round((cur / max) * 100));[span_169](start_span)[span_169](end_span)
            let btn = q.done[span_170](start_span)[span_170](end_span)
                ? `<span class="tag-badge bg-tag-green">Выполнено ✓</span>`[span_171](start_span)[span_171](end_span)
                : (cur >= max[span_172](start_span)[span_172](end_span)
                    ? `<button onclick="PhoneManager.claimQuestReward(${idx})" class="btn btn-green btn-auto btn-sm" style="padding:3px 8px; font-size:9px;">Забрать +${(q.reward/1000).toFixed(0)}k</button>`[span_173](start_span)[span_173](end_span)
                    : `<span class="sub-label" style="font-size:9px;">${cur}/${max}</span>`);[span_174](start_span)[span_174](end_span)

            html += `
            <div class="quest-item-row">
                <div style="flex:1; margin-right:8px;">
                    <div style="font-size:10px; color:#e2e8f0;">${q.text}</div>
                    <div class="quest-progress-mini"><div class="quest-progress-fill" style="width:${pct}%;"></div></div>
                </div>
                ${btn}
            </div>`;[span_175](start_span)[span_175](end_span)
        });

        widget.innerHTML = html;[span_176](start_span)[span_176](end_span)
    },

    claimQuestReward(idx) {
        let q = state.player.dailyQuests[idx];[span_177](start_span)[span_177](end_span)
        let max = q?.max || q?.target || 1;
        if (!q || q.done || (q.cur || 0) < max) return;[span_178](start_span)[span_178](end_span)

        q.done = true;[span_179](start_span)[span_179](end_span)
        state.player.cash = (state.player.cash || 0) + q.reward;[span_180](start_span)[span_180](end_span)
        addXp(q.rewardXp || 35);[span_181](start_span)[span_181](end_span)
        saveState();[span_182](start_span)[span_182](end_span)
        updateHeaderUI();[span_183](start_span)[span_183](end_span)
        playSound('win');[span_184](start_span)[span_184](end_span)
        tgHaptic('success');[span_185](start_span)[span_185](end_span)
        showToast(`Цель выполнена! Получено +${q.reward.toLocaleString()} ₽!`);[span_186](start_span)[span_186](end_span)
        this.renderDailyQuestsWidget();[span_187](start_span)[span_187](end_span)
    },

    renderPhoneScreen() {
        const homeScreen = document.getElementById('phoneHomeScreen');[span_188](start_span)[span_188](end_span)
        const appContainer = document.getElementById('phoneAppContainer');[span_189](start_span)[span_189](end_span)
        if (!homeScreen || !appContainer) return;[span_190](start_span)[span_190](end_span)

        this.updateUnreadBadge();[span_191](start_span)[span_191](end_span)
        this.updatePhoneClock();[span_192](start_span)[span_192](end_span)

        if (this.currentApp === null) {[span_193](start_span)[span_193](end_span)
            homeScreen.style.display = 'block';[span_194](start_span)[span_194](end_span)
            appContainer.style.display = 'none';[span_195](start_span)[span_195](end_span)
            appContainer.innerHTML = '';[span_196](start_span)[span_196](end_span)
            this.renderBusinessWidget();[span_197](start_span)[span_197](end_span)
            this.renderDailyQuestsWidget();[span_198](start_span)[span_198](end_span)
        } else {
            homeScreen.style.display = 'none';[span_199](start_span)[span_199](end_span)
            appContainer.style.display = 'block';[span_200](start_span)[span_200](end_span)
            this.renderOpenApp();[span_201](start_span)[span_201](end_span)
        }
    },

    openApp(appName) {
        playSound('tick');[span_202](start_span)[span_202](end_span)
        tgHaptic('light');[span_203](start_span)[span_203](end_span)
        this.currentApp = appName;[span_204](start_span)[span_204](end_span)
        if (appName === 'messages') {
            this.markAllMessagesAsRead();
        }
        this.renderPhoneScreen();[span_205](start_span)[span_205](end_span)
    },

    goHome() {
        playSound('tick');[span_206](start_span)[span_206](end_span)
        tgHaptic('light');[span_207](start_span)[span_207](end_span)
        this.currentApp = null;[span_208](start_span)[span_208](end_span)
        this.activeChatId = null;[span_209](start_span)[span_209](end_span)
        this.renderPhoneScreen();[span_210](start_span)[span_210](end_span)
    },

    renderOpenApp() {
        const container = document.getElementById('phoneAppContainer');[span_211](start_span)[span_211](end_span)
        if (!container) return;[span_212](start_span)[span_212](end_span)

        if (this.currentApp === 'street') {[span_213](start_span)[span_213](end_span)
            this.renderStreetApp(container);[span_214](start_span)[span_214](end_span)
        } else if (this.currentApp === 'autodrot') {[span_215](start_span)[span_215](end_span)
            this.renderAutodrotApp(container);[span_216](start_span)[span_216](end_span)
        } else if (this.currentApp === 'bank') {[span_217](start_span)[span_217](end_span)
            this.renderBankApp(container);[span_218](start_span)[span_218](end_span)
        } else if (this.currentApp === 'business') {[span_219](start_span)[span_219](end_span)
            this.renderBusinessApp(container);[span_220](start_span)[span_220](end_span)
        } else if (this.currentApp === 'housing') {[span_221](start_span)[span_221](end_span)
            this.renderHousingApp(container);[span_222](start_span)[span_222](end_span)
        } else if (this.currentApp === 'reshala') {[span_223](start_span)[span_223](end_span)
            this.renderReshalaApp(container);[span_224](start_span)[span_224](end_span)
        } else if (this.currentApp === 'syndicate') {[span_225](start_span)[span_225](end_span)
            this.renderSyndicateApp(container);[span_226](start_span)[span_226](end_span)
        } else if (this.currentApp === 'barn') {[span_227](start_span)[span_227](end_span)
            this.renderBarnApp(container);[span_228](start_span)[span_228](end_span)
        } else if (this.currentApp === 'containers') {[span_229](start_span)[span_229](end_span)
            this.renderContainersApp(container);[span_230](start_span)[span_230](end_span)
        } else if (this.currentApp === 'shop') {[span_231](start_span)[span_231](end_span)
            this.renderShopApp(container);[span_232](start_span)[span_232](end_span)
        } else if (this.currentApp === 'fortune') {[span_233](start_span)[span_233](end_span)
            this.renderFortuneApp(container);[span_234](start_span)[span_234](end_span)
        } else if (this.currentApp === 'radar') {[span_235](start_span)[span_235](end_span)
            this.renderRadarApp(container);[span_236](start_span)[span_236](end_span)
        } else if (this.currentApp === 'gosuslugi') {[span_237](start_span)[span_237](end_span)
            this.renderGosuslugiApp(container);[span_238](start_span)[span_238](end_span)
        } else if (this.currentApp === 'radio') {[span_239](start_span)[span_239](end_span)
            this.renderRadioApp(container);[span_240](start_span)[span_240](end_span)
        } else if (this.currentApp === 'notepad') {[span_241](start_span)[span_241](end_span)
            this.renderNotepadApp(container);[span_242](start_span)[span_242](end_span)
        } else if (this.currentApp === 'messages') {[span_243](start_span)[span_243](end_span)
            this.markAllMessagesAsRead();
            if (this.activeChatId) {[span_244](start_span)[span_244](end_span)
                this.renderChatConversation(container, this.activeChatId);[span_245](start_span)[span_245](end_span)
            } else {
                this.renderMessagesList(container);[span_246](start_span)[span_246](end_span)
            }
        }
    },

    // ========================================================
    // 1. БИЗНЕС
    // ========================================================
    renderBusinessApp(container) {
        if (!state.businesses || state.businesses.length === 0) {[span_247](start_span)[span_247](end_span)
            if (typeof BUSINESS_DATA !== 'undefined') state.businesses = JSON.parse(JSON.stringify(BUSINESS_DATA));[span_248](start_span)[span_248](end_span)
        }

        let lvl = state.player?.level || 1;[span_249](start_span)[span_249](end_span)
        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-briefcase color-green"></i> Мой Бизнес</div>
                <button onclick="collectAllBusinessCash(); PhoneManager.renderBusinessApp(document.getElementById('phoneAppContainer'));" class="btn btn-green btn-auto btn-sm">Касса</button>
            </div>
            <div class="phone-app-body">
        `;[span_250](start_span)[span_250](end_span)

        state.businesses.forEach((biz, idx) => {[span_251](start_span)[span_251](end_span)
            if (!biz) return;[span_252](start_span)[span_252](end_span)
            let isLocked = lvl < biz.minLevel;[span_253](start_span)[span_253](end_span)
            let isOwned = biz.level > 0;[span_254](start_span)[span_254](end_span)
            let cost = isOwned ? biz.cost * (biz.level + 1) : biz.cost;[span_255](start_span)[span_255](end_span)
            let saleToNpcPrice = isOwned ? Math.round(biz.cost * biz.level * 0.75) : 0;[span_256](start_span)[span_256](end_span)
            let imgSrc = biz.img || `assets/business/${biz.id}.jpg`;[span_257](start_span)[span_257](end_span)
            let fallbackSrc = biz.fallback || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80';[span_258](start_span)[span_258](end_span)

            let actionBlock = "";[span_259](start_span)[span_259](end_span)
            if (isLocked) {[span_260](start_span)[span_260](end_span)
                actionBlock = `<button class="btn btn-dark btn-sm w-full opacity-50" disabled>С ${biz.minLevel} уровня</button>`;[span_261](start_span)[span_261](end_span)
            } else if (!isOwned) {[span_262](start_span)[span_262](end_span)
                actionBlock = `<button onclick="upgradeBusiness(${idx}); PhoneManager.renderBusinessApp(document.getElementById('phoneAppContainer'));" class="btn btn-cyan btn-sm w-full">Купить (${cost.toLocaleString()} ₽)</button>`;[span_263](start_span)[span_263](end_span)
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
                `;[span_264](start_span)[span_264](end_span)
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
            `;[span_265](start_span)[span_265](end_span)
        });

        html += `</div>`;[span_266](start_span)[span_266](end_span)
        container.innerHTML = html;[span_267](start_span)[span_267](end_span)
    },

    sellBusinessToNPC(bizId, refundAmount) {
        const biz = (state.businesses || []).find(b => b.id === bizId);[span_268](start_span)[span_268](end_span)
        if (!biz || biz.level <= 0) return;[span_269](start_span)[span_269](end_span)

        if (!confirm(`Продать «${biz.name}» городскому инвестору за ${refundAmount.toLocaleString()} ₽? Точка будет ликвидирована.`)) return;[span_270](start_span)[span_270](end_span)

        state.player.cash = (state.player.cash || 0) + refundAmount;[span_271](start_span)[span_271](end_span)
        biz.level = 0;[span_272](start_span)[span_272](end_span)
        biz.stock = 0;[span_273](start_span)[span_273](end_span)
        biz.stored = 0;[span_274](start_span)[span_274](end_span)
        saveState();[span_275](start_span)[span_275](end_span)
        updateHeaderUI();[span_276](start_span)[span_276](end_span)
        playSound('win');[span_277](start_span)[span_277](end_span)
        tgHaptic('success');[span_278](start_span)[span_278](end_span)
        showToast(`Бизнес продан инвестору (+${refundAmount.toLocaleString()} ₽)!`);[span_279](start_span)[span_279](end_span)
        this.renderBusinessApp(document.getElementById('phoneAppContainer'));[span_280](start_span)[span_280](end_span)
        this.renderBusinessWidget();[span_281](start_span)[span_281](end_span)
    },

    listBusinessOnP2P(bizId) {
        const biz = (state.businesses || []).find(b => b.id === bizId);[span_282](start_span)[span_282](end_span)
        if (!biz || biz.level <= 0) return;[span_283](start_span)[span_283](end_span)

        let priceStr = prompt(`Введите цену продажи «${biz.name} (Ур. ${biz.level})» на P2P бирже:`, String(biz.cost * biz.level));[span_284](start_span)[span_284](end_span)
        if (!priceStr) return;[span_285](start_span)[span_285](end_span)
        let price = parseInt(priceStr);[span_286](start_span)[span_286](end_span)
        if (isNaN(price) || price <= 0) return showToast("Некорректная цена!");[span_287](start_span)[span_287](end_span)

        if (!state.p2pMarketListings) state.p2pMarketListings = [];[span_288](start_span)[span_288](end_span)
        let lotId = "p2p_biz_" + Date.now();[span_289](start_span)[span_289](end_span)
        state.p2pMarketListings.unshift({
            id: lotId,[span_290](start_span)[span_290](end_span)
            seller: state.player?.name || "Перекуп",[span_291](start_span)[span_291](end_span)
            type: "business",[span_292](start_span)[span_292](end_span)
            name: `${biz.name} (Ур. ${biz.level})`,[span_293](start_span)[span_293](end_span)
            bizId: biz.id,[span_294](start_span)[span_294](end_span)
            bizLevel: biz.level,[span_295](start_span)[span_295](end_span)
            price: price,[span_296](start_span)[span_296](end_span)
            desc: `Готовая точка с доходностью ${((biz.income || 0) * biz.level).toLocaleString()} ₽/д.`[span_297](start_span)[span_297](end_span)
        });

        if (!state.myP2PListings) state.myP2PListings = [];[span_298](start_span)[span_298](end_span)
        state.myP2PListings.push(lotId);[span_299](start_span)[span_299](end_span)

        biz.level = 0;[span_300](start_span)[span_300](end_span)
        biz.stock = 0;[span_301](start_span)[span_301](end_span)
        saveState();[span_302](start_span)[span_302](end_span)
        showToast("Бизнес выставлен на онлайн P2P биржу Autodrot!");[span_303](start_span)[span_303](end_span)
        this.renderBusinessApp(document.getElementById('phoneAppContainer'));[span_304](start_span)[span_304](end_span)
    },

    // ========================================================
    // 2. ЖИЛЬЁ
    // ========================================================
    renderHousingApp(container) {
        let curId = state.player?.housingId || 'room';[span_305](start_span)[span_305](end_span)
        let owned = state.player?.ownedHouses || [];[span_306](start_span)[span_306](end_span)
        let lvl = state.player?.level || 1;[span_307](start_span)[span_307](end_span)

        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-house color-cyan"></i> Моя Недвижимость</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
        `;[span_308](start_span)[span_308](end_span)

        (typeof HOUSING_LIST !== 'undefined' ? HOUSING_LIST : []).forEach(h => {[span_309](start_span)[span_309](end_span)
            let isCur = curId === h.id;[span_310](start_span)[span_310](end_span)
            let isPurchased = owned.includes(h.id);[span_311](start_span)[span_311](end_span)
            let isLvlLocked = lvl < (h.minLevel || 1);[span_312](start_span)[span_312](end_span)
            let refundPrice = Math.round((h.buyPrice || 1000000) * 0.8);[span_313](start_span)[span_313](end_span)
            let imgSrc = h.img || `assets/houses/${h.id}.jpg`;[span_314](start_span)[span_314](end_span)
            let fallbackSrc = h.fallback || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80';[span_315](start_span)[span_315](end_span)

            let actionBtns = "";[span_316](start_span)[span_316](end_span)
            if (isLvlLocked) {[span_317](start_span)[span_317](end_span)
                actionBtns = `<button class="btn btn-dark btn-sm w-full opacity-50" disabled>С ${h.minLevel} уровня</button>`;[span_318](start_span)[span_318](end_span)
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
                `;[span_319](start_span)[span_319](end_span)
            } else {
                actionBtns = `
                    <div class="grid-2">
                        <button onclick="rentHousing('${h.id}'); PhoneManager.renderHousingApp(document.getElementById('phoneAppContainer'));" class="btn btn-cyan btn-sm">Аренда (${(h.rent || 2000).toLocaleString()} ₽/д)</button>
                        <button onclick="buyHousingProperty('${h.id}'); PhoneManager.renderHousingApp(document.getElementById('phoneAppContainer'));" class="btn btn-amber btn-sm">Купить (${(h.buyPrice / 1000000).toFixed(1)}M)</button>
                    </div>
                `;[span_320](start_span)[span_320](end_span)
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
            `;[span_321](start_span)[span_321](end_span)
        });

        html += `</div>`;[span_322](start_span)[span_322](end_span)
        container.innerHTML = html;[span_323](start_span)[span_323](end_span)
    },

    sellHousingToNPC(hId, refundAmount) {
        if (!confirm(`Продать недвижимость агентству за ${refundAmount.toLocaleString()} ₽? Право собственности будет аннулировано.`)) return;[span_324](start_span)[span_324](end_span)

        state.player.cash = (state.player.cash || 0) + refundAmount;[span_325](start_span)[span_325](end_span)
        state.player.ownedHouses = (state.player.ownedHouses || []).filter(id => id !== hId);[span_326](start_span)[span_326](end_span)

        if (state.player.housingId === hId) {[span_327](start_span)[span_327](end_span)
            state.player.housingId = 'room';[span_328](start_span)[span_328](end_span)
            state.player.housingType = 'rent';[span_329](start_span)[span_329](end_span)
        }

        saveState();[span_330](start_span)[span_330](end_span)
        updateHeaderUI();[span_331](start_span)[span_331](end_span)
        playSound('win');[span_332](start_span)[span_332](end_span)
        tgHaptic('success');[span_333](start_span)[span_333](end_span)
        showToast(`Недвижимость продана риелторам (+${refundAmount.toLocaleString()} ₽)!`);[span_334](start_span)[span_334](end_span)
        this.renderHousingApp(document.getElementById('phoneAppContainer'));[span_335](start_span)[span_335](end_span)
    },

    listHousingOnP2P(hId) {
        const h = (typeof HOUSING_LIST !== 'undefined' ? HOUSING_LIST : []).find(item => item.id === hId);[span_336](start_span)[span_336](end_span)
        if (!h) return;[span_337](start_span)[span_337](end_span)

        let priceStr = prompt(`Введите цену продажи «${h.name}» на P2P бирже:`, String(h.buyPrice));[span_338](start_span)[span_338](end_span)
        if (!priceStr) return;[span_339](start_span)[span_339](end_span)
        let price = parseInt(priceStr);[span_340](start_span)[span_340](end_span)
        if (isNaN(price) || price <= 0) return showToast("Некорректная цена!");[span_341](start_span)[span_341](end_span)

        if (!state.p2pMarketListings) state.p2pMarketListings = [];[span_342](start_span)[span_342](end_span)
        let lotId = "p2p_house_" + Date.now();[span_343](start_span)[span_343](end_span)
        state.p2pMarketListings.unshift({
            id: lotId,[span_344](start_span)[span_344](end_span)
            seller: state.player?.name || "Перекуп",[span_345](start_span)[span_345](end_span)
            type: "housing",[span_346](start_span)[span_346](end_span)
            name: h.name,[span_347](start_span)[span_347](end_span)
            houseId: h.id,[span_348](start_span)[span_348](end_span)
            price: price,[span_349](start_span)[span_349](end_span)
            desc: `Недвижимость в собственности. Гараж на +${h.slots} мест.`[span_350](start_span)[span_350](end_span)
        });

        if (!state.myP2PListings) state.myP2PListings = [];[span_351](start_span)[span_351](end_span)
        state.myP2PListings.push(lotId);[span_352](start_span)[span_352](end_span)

        state.player.ownedHouses = (state.player.ownedHouses || []).filter(id => id !== hId);[span_353](start_span)[span_353](end_span)
        if (state.player.housingId === hId) {[span_354](start_span)[span_354](end_span)
            state.player.housingId = 'room';[span_355](start_span)[span_355](end_span)
            state.player.housingType = 'rent';[span_356](start_span)[span_356](end_span)
        }

        saveState();[span_357](start_span)[span_357](end_span)
        showToast("Недвижимость выставлена на онлайн P2P биржу Autodrot!");[span_358](start_span)[span_358](end_span)
        this.renderHousingApp(document.getElementById('phoneAppContainer'));[span_359](start_span)[span_359](end_span)
    },

    // ========================================================
    // 3. САРАИ
    // ========================================================
    renderBarnApp(container) {
        const pDay = state.player?.day || 1;[span_360](start_span)[span_360](end_span)
        const lastDay = state.player?.lastBarnDay || 0;[span_361](start_span)[span_361](end_span)
        const canScoutToday = lastDay < pDay;[span_362](start_span)[span_362](end_span)
        const lvl = state.player?.level || 1;[span_363](start_span)[span_363](end_span)

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
        `;[span_364](start_span)[span_364](end_span)

        (typeof BARN_TIERS_CONFIG !== 'undefined' ? BARN_TIERS_CONFIG : []).forEach(b => {[span_365](start_span)[span_365](end_span)
            let isLvlLocked = lvl < b.reqLvl;[span_366](start_span)[span_366](end_span)
            let isDoneToday = !canScoutToday;[span_367](start_span)[span_367](end_span)
            let rareCar = (typeof BARN_FINDS !== 'undefined' && BARN_FINDS[b.rareIdx]) ? BARN_FINDS[b.rareIdx] : { name: "Раритет" };[span_368](start_span)[span_368](end_span)
            let imgSrc = b.img || `assets/barns/barn_tier${b.tier}.jpg`;[span_369](start_span)[span_369](end_span)
            let fallbackSrc = b.fallback || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80';[span_370](start_span)[span_370](end_span)

            let statusBadge = isLvlLocked 
                ? `<span class='tag-badge bg-tag-red'><i class='fa-solid fa-lock'></i> С ${b.reqLvl} УР</span>`[span_371](start_span)[span_371](end_span)
                : (isDoneToday ? "<span class='tag-badge bg-tag-amber'>Осмотрено</span>" : "<span class='tag-badge bg-tag-green'>Доступно</span>");[span_372](start_span)[span_372](end_span)

            let btnDisabled = (isLvlLocked || isDoneToday) ? "disabled" : "";[span_373](start_span)[span_373](end_span)
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
            `;[span_374](start_span)[span_374](end_span)
        });

        html += `</div>`;[span_375](start_span)[span_375](end_span)
        container.innerHTML = html;[span_376](start_span)[span_376](end_span)
    },

    // ========================================================
    // 4. ФОРТУНА: СУПЕР ВИЛСПИН (БЕСПЛАТНЫЙ 1 РАЗ/СУТКИ) & ОБМЕН
    // ========================================================
    renderFortuneApp(container) {
        let tickets = state.player?.superSpinTickets || 0;[span_377](start_span)[span_377](end_span)
        let stars = state.player?.stars || 0;[span_378](start_span)[span_378](end_span)
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

                        <div class="p-2 text-center" id="superReel3" style="background:#090d16; border-radius:10px; border:1px solid rgba(255,179,0,0.3); min-height:85px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
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
                        <!-- Покупка звезд за наличку -->
                        <div class="p-2 flex-between" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                            <div>
                                <b class="text-xs color-amber">⭐ Пак 25 Stars за Деньги</b>
                                <div class="sub-label" style="font-size:9.5px;">Конвертация оборотки в звезды</div>
                            </div>
                            <button onclick="PhoneManager.exchangeForStars('cash', 250000, 25)" class="btn btn-amber btn-sm btn-auto">250,000 ₽</button>
                        </div>

                        <!-- Покупка звезд за бензин -->
                        <div class="p-2 flex-between" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                            <div>
                                <b class="text-xs color-cyan">⛽ Обмен 60 Бензина на 10 Stars</b>
                                <div class="sub-label" style="font-size:9.5px;">Слив топлива перекупа в валюту</div>
                            </div>
                            <button onclick="PhoneManager.exchangeForStars('fuel', 60, 10)" class="btn btn-cyan btn-sm btn-auto">-60 ⛽</button>
                        </div>

                        <!-- Покупка звезд за экспресс-талоны -->
                        <div class="p-2 flex-between" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                            <div>
                                <b class="text-xs color-purple">🎟️ Обмен 20 Талонов на 15 Stars</b>
                                <div class="sub-label" style="font-size:9.5px;">Обмен неиспользованных пропусков</div>
                            </div>
                            <button onclick="PhoneManager.exchangeForStars('tickets', 20, 15)" class="btn btn-purple btn-sm btn-auto">-20 🎟️</button>
                        </div>

                        <!-- Покупка билетов супер вилспина -->
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

        if (typeof initWheelModule === 'function') initWheelModule();[span_379](start_span)[span_379](end_span)
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
        if (currency === 'stars') {[span_380](start_span)[span_380](end_span)
            let s = state.player?.stars || 0;[span_381](start_span)[span_381](end_span)
            if (s < 30) return showToast("Нужно 30 Stars ⭐!");
            state.player.stars -= 30;
        } else {
            let c = state.player?.cash || 0;[span_382](start_span)[span_382](end_span)
            if (c < 300000) return showToast("Нужно 300,000 ₽!");
            state.player.cash -= 300000;
        }

        state.player.superSpinTickets = (state.player.superSpinTickets || 0) + 1;[span_383](start_span)[span_383](end_span)
        saveState();[span_384](start_span)[span_384](end_span)
        updateHeaderUI();[span_385](start_span)[span_385](end_span)
        playSound('win');[span_386](start_span)[span_386](end_span)
        tgHaptic('success');[span_387](start_span)[span_387](end_span)
        showToast("Билет «Супер Вилспин» приобретён!");[span_388](start_span)[span_388](end_span)
        this.renderFortuneApp(document.getElementById('phoneAppContainer'));[span_389](start_span)[span_389](end_span)
    },

    spinSuperWheelAction() {
        if (this.isSuperSpinning) return;[span_390](start_span)[span_390](end_span)

        let tickets = state.player?.superSpinTickets || 0;[span_391](start_span)[span_391](end_span)
        let stars = state.player?.stars || 0;[span_392](start_span)[span_392](end_span)
        let pDay = state.player?.day || 1;
        let lastSuperDay = state.player?.lastFreeSuperSpinDay || 0;
        let isFree = lastSuperDay < pDay;

        if (isFree) {
            state.player.lastFreeSuperSpinDay = pDay;
        } else if (tickets > 0) {
            state.player.superSpinTickets -= 1;[span_393](start_span)[span_393](end_span)
        } else if (stars >= 30) {
            state.player.stars -= 30;
        } else {
            return showToast("Нужен 1 Билет или 30 ⭐ Stars!");
        }

        this.isSuperSpinning = true;[span_394](start_span)[span_394](end_span)
        playSound('tick');[span_395](start_span)[span_395](end_span)
        tgHaptic('medium');[span_396](start_span)[span_396](end_span)

        const r1 = document.getElementById('reelTxt1');[span_397](start_span)[span_397](end_span)
        const r2 = document.getElementById('reelTxt2');[span_398](start_span)[span_398](end_span)
        const r3 = document.getElementById('reelTxt3');[span_399](start_span)[span_399](end_span)
        const btn = document.getElementById('btnLaunchSuperSpin');[span_400](start_span)[span_400](end_span)
        if (btn) btn.disabled = true;[span_401](start_span)[span_401](end_span)

        let spinAnim = setInterval(() => {[span_402](start_span)[span_402](end_span)
            if (r1) r1.innerText = ["Пусто", "ВАЗ-2107", "Колодки", "Nexia", "Polo Sedan"][Math.floor(Math.random() * 5)];
            if (r2) r2.innerText = ["25,000 ₽", "35 ⛽ Бак", "60,000 ₽", "10 🎟️ Талонов", "150,000 ₽"][Math.floor(Math.random() * 5)];
            if (r3) r3.innerText = ["В777ВВ 77", "10 ⭐ Stars", "Stage 2 Чип", "Без спецприза", "Штраф"][Math.floor(Math.random() * 5)];
            playSound('tick');[span_403](start_span)[span_403](end_span)
        }, 100);[span_404](start_span)[span_404](end_span)

        setTimeout(() => {[span_405](start_span)[span_405](end_span)
            clearInterval(spinAnim);[span_406](start_span)[span_406](end_span)
            this.isSuperSpinning = false;[span_407](start_span)[span_407](end_span)
            if (btn) btn.disabled = false;[span_408](start_span)[span_408](end_span)

            const tiers = typeof SUPER_SPIN_TIERS !== 'undefined' ? SUPER_SPIN_TIERS : {
                reelCars: [{ type: "empty", name: "Ничего" }],
                reelResources: [{ type: "cash", label: "25,000 ₽", amount: 25000 }],
                reelExclusives: [{ type: "none", label: "Без спецприза" }]
            };

            const drop1 = tiers.reelCars[Math.floor(Math.random() * tiers.reelCars.length)];
            const drop2 = tiers.reelResources[Math.floor(Math.random() * tiers.reelResources.length)];
            const drop3 = tiers.reelExclusives[Math.floor(Math.random() * tiers.reelExclusives.length)];

            // Применение Барабана 1 (Авто/Дроп)
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

            // Применение Барабана 2 (Ресурсы)
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

            // Применение Барабана 3 (Эксклюзивы)
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

            saveState();[span_409](start_span)[span_409](end_span)
            updateHeaderUI();[span_410](start_span)[span_410](end_span)
            playSound('win');[span_411](start_span)[span_411](end_span)
            tgHaptic('success');[span_412](start_span)[span_412](end_span)

            openVerdictModal(
                "СУПЕР ВИЛСПИН! 🎉",[span_413](start_span)[span_413](end_span)
                `Результат вращения барабанов:\n\n1. ${resText1}\n2. ${resText2}\n3. ${resText3}`,
                true[span_414](start_span)[span_414](end_span)
            );

            this.renderFortuneApp(document.getElementById('phoneAppContainer'));[span_415](start_span)[span_415](end_span)
        }, 2600);
    },

    // ========================================================
    // 5. ГОСУСЛУГИ, МАГНИТОЛА, БЛОКНОТ ДЕЛЬЦА
    // ========================================================
    renderGosuslugiApp(container) {
        let fines = state.player.trafficFines || 0;[span_416](start_span)[span_416](end_span)
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
        `;[span_417](start_span)[span_417](end_span)
    },

    payTrafficFines() {
        let fines = state.player.trafficFines || 0;[span_418](start_span)[span_418](end_span)
        let discountCost = Math.round(fines * 0.5);[span_419](start_span)[span_419](end_span)
        if (state.player.cash < discountCost) return showToast("Не хватает денег!");[span_420](start_span)[span_420](end_span)
        state.player.cash -= discountCost;[span_421](start_span)[span_421](end_span)
        state.player.trafficFines = 0;[span_422](start_span)[span_422](end_span)
        saveState();[span_423](start_span)[span_423](end_span)
        updateHeaderUI();[span_424](start_span)[span_424](end_span)
        playSound('win');[span_425](start_span)[span_425](end_span)
        tgHaptic('success');[span_426](start_span)[span_426](end_span)
        showToast("Штрафы ГИБДД успешно оплачены!");[span_427](start_span)[span_427](end_span)
        this.renderGosuslugiApp(document.getElementById('phoneAppContainer'));[span_428](start_span)[span_428](end_span)
    },

    renderRadioApp(container) {
        const curStation = ELECTRONIC_RADIO_STATIONS[currentStationIdx] || ELECTRONIC_RADIO_STATIONS[0];[span_429](start_span)[span_429](end_span)

        let visibleStations = ELECTRONIC_RADIO_STATIONS;[span_430](start_span)[span_430](end_span)
        if (radioNetworkFilter === 'Record') {[span_431](start_span)[span_431](end_span)
            visibleStations = ELECTRONIC_RADIO_STATIONS.filter(s => s.network === 'Record');[span_432](start_span)[span_432](end_span)
        } else if (radioNetworkFilter === 'SomaFM') {[span_433](start_span)[span_433](end_span)
            visibleStations = ELECTRONIC_RADIO_STATIONS.filter(s => s.network === 'SomaFM');[span_434](start_span)[span_434](end_span)
        } else if (radioNetworkFilter === 'Plaza_DFM') {[span_435](start_span)[span_435](end_span)
            visibleStations = ELECTRONIC_RADIO_STATIONS.filter(s => s.network === 'Plaza.one' || s.network === 'DFM');[span_436](start_span)[span_436](end_span)
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
        `;[span_437](start_span)[span_437](end_span)
    },

    setRadioFilter(filter) {
        radioNetworkFilter = filter;[span_438](start_span)[span_438](end_span)
        this.renderRadioApp(document.getElementById('phoneAppContainer'));[span_439](start_span)[span_439](end_span)
    },

    toggleRadioPlay() {
        const audio = getRecordAudio();[span_440](start_span)[span_440](end_span)
        const curStation = ELECTRONIC_RADIO_STATIONS[currentStationIdx];[span_441](start_span)[span_441](end_span)

        if (isRadioPlaying) {[span_442](start_span)[span_442](end_span)
            audio.pause();[span_443](start_span)[span_443](end_span)
            isRadioPlaying = false;[span_444](start_span)[span_444](end_span)
            isRadioLoading = false;[span_445](start_span)[span_445](end_span)
            tgHaptic('light');[span_446](start_span)[span_446](end_span)
            updateRadioPlaybackUI();[span_447](start_span)[span_447](end_span)
        } else {
            isRadioLoading = true;[span_448](start_span)[span_448](end_span)
            updateRadioPlaybackUI();[span_449](start_span)[span_449](end_span)

            if (audio.src !== curStation.stream) {[span_450](start_span)[span_450](end_span)
                audio.src = curStation.stream;[span_451](start_span)[span_451](end_span)
                audio.load();[span_452](start_span)[span_452](end_span)
            }

            const playPromise = audio.play();[span_453](start_span)[span_453](end_span)
            if (playPromise !== undefined) {[span_454](start_span)[span_454](end_span)
                playPromise.then(() => {[span_455](start_span)[span_455](end_span)
                    isRadioPlaying = true;[span_456](start_span)[span_456](end_span)
                    isRadioLoading = false;[span_457](start_span)[span_457](end_span)
                    tgHaptic('success');[span_458](start_span)[span_458](end_span)
                    showToast(`📻 В эфире: ${curStation.name}!`);[span_459](start_span)[span_459](end_span)
                    updateRadioPlaybackUI();[span_460](start_span)[span_460](end_span)
                }).catch((err) => {[span_461](start_span)[span_461](end_span)
                    isRadioPlaying = false;[span_462](start_span)[span_462](end_span)
                    isRadioLoading = false;[span_463](start_span)[span_463](end_span)
                    updateRadioPlaybackUI();[span_464](start_span)[span_464](end_span)
                    showToast("Нажмите «СЛУШАТЬ» ещё раз");[span_465](start_span)[span_465](end_span)
                });
            }
        }
    },

    changeRadioStation(delta) {
        currentStationIdx = (currentStationIdx + delta + ELECTRONIC_RADIO_STATIONS.length) % ELECTRONIC_RADIO_STATIONS.length;[span_466](start_span)[span_466](end_span)
        const curStation = ELECTRONIC_RADIO_STATIONS[currentStationIdx];[span_467](start_span)[span_467](end_span)
        const audio = getRecordAudio();[span_468](start_span)[span_468](end_span)

        audio.src = curStation.stream;[span_469](start_span)[span_469](end_span)
        audio.load();[span_470](start_span)[span_470](end_span)

        if (isRadioPlaying) {[span_471](start_span)[span_471](end_span)
            isRadioLoading = true;[span_472](start_span)[span_472](end_span)
            updateRadioPlaybackUI();[span_473](start_span)[span_473](end_span)
            audio.play().then(() => {[span_474](start_span)[span_474](end_span)
                isRadioPlaying = true;[span_475](start_span)[span_475](end_span)
                isRadioLoading = false;[span_476](start_span)[span_476](end_span)
                updateRadioPlaybackUI();[span_477](start_span)[span_477](end_span)
            }).catch(() => {[span_478](start_span)[span_478](end_span)
                isRadioLoading = false;[span_479](start_span)[span_479](end_span)
                updateRadioPlaybackUI();[span_480](start_span)[span_480](end_span)
            });
        }

        tgHaptic('light');[span_481](start_span)[span_481](end_span)
        playSound('tick');[span_482](start_span)[span_482](end_span)
        showToast(`Переключено: ${curStation.name}`);[span_483](start_span)[span_483](end_span)
        this.renderRadioApp(document.getElementById('phoneAppContainer'));[span_484](start_span)[span_484](end_span)
    },

    selectExactStation(idx) {
        if (idx < 0 || idx >= ELECTRONIC_RADIO_STATIONS.length) return;[span_485](start_span)[span_485](end_span)
        currentStationIdx = idx;[span_486](start_span)[span_486](end_span)
        const curStation = ELECTRONIC_RADIO_STATIONS[currentStationIdx];[span_487](start_span)[span_487](end_span)
        const audio = getRecordAudio();[span_488](start_span)[span_488](end_span)

        audio.src = curStation.stream;[span_489](start_span)[span_489](end_span)
        audio.load();[span_490](start_span)[span_490](end_span)

        isRadioLoading = true;[span_491](start_span)[span_491](end_span)
        updateRadioPlaybackUI();[span_492](start_span)[span_492](end_span)

        audio.play().then(() => {[span_493](start_span)[span_493](end_span)
            isRadioPlaying = true;[span_494](start_span)[span_494](end_span)
            isRadioLoading = false;[span_495](start_span)[span_495](end_span)
            tgHaptic('success');[span_496](start_span)[span_496](end_span)
            showToast(`Включено: ${curStation.name}`);[span_497](start_span)[span_497](end_span)
            updateRadioPlaybackUI();[span_498](start_span)[span_498](end_span)
        }).catch((err) => {[span_499](start_span)[span_499](end_span)
            isRadioPlaying = false;[span_500](start_span)[span_500](end_span)
            isRadioLoading = false;[span_501](start_span)[span_501](end_span)
            updateRadioPlaybackUI();[span_502](start_span)[span_502](end_span)
        });

        this.renderRadioApp(document.getElementById('phoneAppContainer'));[span_503](start_span)[span_503](end_span)
    },

    setRadioVolume(val) {
        radioVolume = parseFloat(val);[span_504](start_span)[span_504](end_span)
        const audio = getRecordAudio();[span_505](start_span)[span_505](end_span)
        audio.volume = radioVolume;[span_506](start_span)[span_506](end_span)
        const disp = document.getElementById('radioVolumeDisplay');[span_507](start_span)[span_507](end_span)
        if (disp) disp.innerText = `${Math.round(radioVolume * 100)}%`;[span_508](start_span)[span_508](end_span)
    },

    renderNotepadApp(container) {
        let s = state.player?.stats || {};[span_509](start_span)[span_509](end_span)
        let goals = typeof NOTEPAD_CAREER_GOALS !== 'undefined' ? NOTEPAD_CAREER_GOALS : [];

        let goalsHtml = goals.map(g => {
            let isDone = false;
            if (g.targetProfit && (s.totalNetProfit || 0) >= g.targetProfit) isDone = true;
            if (g.targetSales && (s.profitableSales || 0) >= g.targetSales) isDone = true;
            if (g.targetSlots && getTotalGarageSlots() >= g.targetSlots) isDone = true;
            if (g.targetCred && (state.player?.streetCred || 0) >= g.targetCred) isDone = true;
            if (g.targetHousing && (state.player?.ownedHouses || []).includes(g.targetHousing)) isDone = true;

            return `
            <div class="glass-card p-2 mb-2" style="border-left: 3px solid ${isDone ? 'var(--green)' : 'var(--amber)'};">
                <div class="flex-between mb-1">
                    <b class="text-xs ${isDone ? 'color-green' : 'color-cyan'}">${g.title}</b>
                    <span class="tag-badge ${isDone ? 'bg-tag-green' : 'bg-tag-amber'}">${isDone ? 'ДОСТИГНУТО ✓' : g.category}</span>
                </div>
                <div class="sub-label mb-1" style="font-size:10px;">${g.desc}</div>
                <div class="text-xs color-amber" style="font-size:9.5px;">⭐ Награда: <b>${g.reward}</b></div>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-note-sticky color-amber"></i> Блокнот Дельца</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
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
    // 6. STREET UNDERGROUND (АНТИФАРМ, ИЗНОС ШИН И ПЕРЕГРЕВ)
    // ========================================================
    renderStreetApp(container) {
        let sub = this.streetSubTab || 'drift';[span_510](start_span)[span_510](end_span)
        let streetCred = state.player?.streetCred || 100;[span_511](start_span)[span_511](end_span)
        let credRank = streetCred >= 1200 ? "👑 Легенда RDS & Нелегала" : (streetCred >= 600 ? "⚡ Король Трассы" : (streetCred >= 250 ? "🏎️ Опытный Пилот" : "🔰 Новичок Спота"));[span_512](start_span)[span_512](end_span)

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
        `;[span_513](start_span)[span_513](end_span)

        this.renderStreetSubScreen();[span_514](start_span)[span_514](end_span)
    },

    switchStreetSubTab(tab) {
        playSound('tick');[span_515](start_span)[span_515](end_span)
        tgHaptic('light');[span_516](start_span)[span_516](end_span)
        this.streetSubTab = tab;[span_517](start_span)[span_517](end_span)
        this.renderStreetApp(document.getElementById('phoneAppContainer'));[span_518](start_span)[span_518](end_span)
    },

    renderStreetSubScreen() {
        const content = document.getElementById('streetSubScreenContent');[span_519](start_span)[span_519](end_span)
        if (!content) return;[span_520](start_span)[span_520](end_span)

        if (this.streetSubTab === 'drift') {[span_521](start_span)[span_521](end_span)
            this.renderDriftDiscipline(content);[span_522](start_span)[span_522](end_span)
        } else if (this.streetSubTab === 'drag') {[span_523](start_span)[span_523](end_span)
            this.renderDragDiscipline(content);[span_524](start_span)[span_524](end_span)
        } else if (this.streetSubTab === 'stance') {[span_525](start_span)[span_525](end_span)
            this.renderStanceDiscipline(content);[span_526](start_span)[span_526](end_span)
        } else if (this.streetSubTab === 'sprint') {[span_527](start_span)[span_527](end_span)
            this.renderSprintDiscipline(content);[span_528](start_span)[span_528](end_span)
        }
    },

    getDriftSpecInfo(car) {
        if (!car) return { ready: false, reason: "Машина не выбрана" };[span_529](start_span)[span_529](end_span)
        let power = car.power || 100;[span_530](start_span)[span_530](end_span)
        let t = car.tuning || {};[span_531](start_span)[span_531](end_span)
        
        let hasDiff = !!t.weldedDiff;[span_532](start_span)[span_532](end_span)
        let hasAngle = !!t.steeringAngle;[span_533](start_span)[span_533](end_span)
        let hasHydro = !!t.hydroHandbrake;[span_534](start_span)[span_534](end_span)
        let hasCage = !!t.rollCage;[span_535](start_span)[span_535](end_span)
        let hasSeats = !!t.bucketSeats;[span_536](start_span)[span_536](end_span)
        let isOverheated = (car.engineTemp || 90) > 105;
        let isTiresDead = (car.tireWear !== undefined ? car.tireWear : 100) < 20;

        return {
            power,[span_537](start_span)[span_537](end_span)
            hasDiff,[span_538](start_span)[span_538](end_span)
            hasAngle,[span_539](start_span)[span_539](end_span)
            hasHydro,[span_540](start_span)[span_540](end_span)
            hasCage,[span_541](start_span)[span_541](end_span)
            hasSeats,[span_542](start_span)[span_542](end_span)
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
        if (!state.garage || state.garage.length === 0) {[span_543](start_span)[span_543](end_span)
            container.innerHTML = `<div class="glass-card text-center sub-label py-6">В гараже нет машин! Приобретите автомобиль на рынке.</div>`;[span_544](start_span)[span_544](end_span)
            return;[span_545](start_span)[span_545](end_span)
        }

        let carIdx = state.player.selectedStreetCarIndex || 0;[span_546](start_span)[span_546](end_span)
        if (carIdx >= state.garage.length) carIdx = 0;[span_547](start_span)[span_547](end_span)
        const car = state.garage[carIdx];[span_548](start_span)[span_548](end_span)
        const spec = this.getDriftSpecInfo(car);[span_549](start_span)[span_549](end_span)

        let selectorOptions = state.garage.map((c, i) => `<option value="${i}" ${i === carIdx ? 'selected' : ''}>${c.name} (${c.power || 100} л.с.)</option>`).join('');[span_550](start_span)[span_550](end_span)

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
        state.player.selectedStreetCarIndex = parseInt(index);[span_551](start_span)[span_551](end_span)
        saveState();[span_552](start_span)[span_552](end_span)
        this.renderStreetSubScreen();[span_553](start_span)[span_553](end_span)
    },

    runDriftChallenge(league, cost) {
        let cash = state.player?.cash || 0;[span_554](start_span)[span_554](end_span)
        if (cash < cost) return showToast("Не хватает денег на стартовый взнос!");[span_555](start_span)[span_555](end_span)

        const carIdx = state.player.selectedStreetCarIndex || 0;[span_556](start_span)[span_556](end_span)
        const car = state.garage[carIdx];[span_557](start_span)[span_557](end_span)
        if (!car) return;[span_558](start_span)[span_558](end_span)

        state.player.cash -= cost;[span_559](start_span)[span_559](end_span)
        
        // Механический износ от дрифта
        car.engineTemp = (car.engineTemp || 90) + Math.floor(12 + Math.random() * 8);
        car.tireWear = Math.max(0, (car.tireWear !== undefined ? car.tireWear : 100) - Math.floor(18 + Math.random() * 12));
        if (car.wear) {
            car.wear.transmission = Math.max(10, (car.wear.transmission || 85) - 3);
        }

        playSound('tick');[span_560](start_span)[span_560](end_span)
        tgHaptic('medium');[span_561](start_span)[span_561](end_span)

        const resultsArea = document.getElementById('driftRunResultsArea');[span_562](start_span)[span_562](end_span)
        if (!resultsArea) return;[span_563](start_span)[span_563](end_span)

        resultsArea.innerHTML = `
            <div class="glass-card text-center p-3">
                <div style="font-size:24px;">💨 🔥 🏎️</div>
                <div class="font-bold text-xs color-amber my-1">РАЗГОН... ИНИЦИАЦИЯ ЗАНОСА...</div>
            </div>
        `;[span_564](start_span)[span_564](end_span)

        setTimeout(() => {
            let power = car.power || 100;[span_565](start_span)[span_565](end_span)
            let t = car.tuning || {};[span_566](start_span)[span_566](end_span)

            let score = 0;[span_567](start_span)[span_567](end_span)
            let comment = "";[span_568](start_span)[span_568](end_span)

            if (league === 'matsuri') {[span_569](start_span)[span_569](end_span)
                score = Math.floor(65 + Math.random() * 25);[span_570](start_span)[span_570](end_span)
                if (t.hydroHandbrake) score += 8;[span_571](start_span)[span_571](end_span)
                if (power > 120) score += 5;[span_572](start_span)[span_572](end_span)
                score = Math.min(100, score);[span_573](start_span)[span_573](end_span)
                comment = score >= 80 ? "Чистый проезд по снежной дуге, публика в восторге!" : "Небольшая коррекция рулём, но траектория удержана.";[span_574](start_span)[span_574](end_span)
            } else if (league === 'europe') {[span_575](start_span)[span_575](end_span)
                let powerRatio = power / 300;[span_576](start_span)[span_576](end_span)
                score = Math.floor(55 * powerRatio + Math.random() * 30);[span_577](start_span)[span_577](end_span)
                if (t.hydroHandbrake) score += 10;[span_578](start_span)[span_578](end_span)
                if (t.dragSlicks) score += 5;[span_579](start_span)[span_579](end_span)
                score = Math.min(100, score);[span_580](start_span)[span_580](end_span)
                comment = score >= 85 ? "Шикарная перекладка без распрямлений, зачёт на 85+ баллов!" : "Не хватило угла во второй дуге, потеря темпа.";[span_581](start_span)[span_581](end_span)
            } else if (league === 'gp') {[span_582](start_span)[span_582](end_span)
                let powerRatio = power / 550;[span_583](start_span)[span_583](end_span)
                score = Math.floor(60 * powerRatio + Math.random() * 30);[span_584](start_span)[span_584](end_span)
                if (t.rollCage) score += 5;[span_585](start_span)[span_585](end_span)
                if (t.dragSlicks) score += 10;[span_586](start_span)[span_586](end_span)
                score = Math.min(100, score);[span_587](start_span)[span_587](end_span)
                comment = score >= 90 ? "Дым стеной, глубочайший бэквард и постановка впритирку со стеной!" : "Слабая скорость в базе дуги, судьи сняли баллы за клиппинг.";[span_588](start_span)[span_588](end_span)
            }

            let isWin = score >= 75;[span_589](start_span)[span_589](end_span)
            let reward = Math.round(cost * (league === 'gp' ? 2.5 : (league === 'europe' ? 2.3 : 2.0)));
            let repBonus = league === 'gp' ? 70 : (league === 'europe' ? 35 : 15);[span_590](start_span)[span_590](end_span)

            if (typeof trackQuestProgress === 'function') {
                trackQuestProgress('drift_run', 1);
            }

            if (isWin) {[span_591](start_span)[span_591](end_span)
                state.player.cash += reward;[span_592](start_span)[span_592](end_span)
                state.player.streetCred = (state.player.streetCred || 100) + repBonus;[span_593](start_span)[span_593](end_span)
                playSound('win');[span_594](start_span)[span_594](end_span)
                tgHaptic('success');[span_595](start_span)[span_595](end_span)

                resultsArea.innerHTML = `
                    <div class="glass-card p-2 text-center" style="border-color:var(--green);">
                        <div class="font-bold text-xs color-green mb-1">🏁 ЗАЕЗД ЗАВЕРШЁН: ${score} ИЗ 100 БАЛЛОВ!</div>
                        <div class="sub-label mb-2" style="font-size:10px;">${comment}<br>Выигрыш: <b class="color-green">+${reward.toLocaleString()} ₽</b> (+${repBonus} Респекта)</div>
                        <button onclick="PhoneManager.renderStreetSubScreen()" class="btn btn-green btn-sm w-full">Отлично!</button>
                    </div>
                `;[span_596](start_span)[span_596](end_span)
            } else {
                state.player.streetCred = Math.max(10, (state.player.streetCred || 100) - 10);[span_597](start_span)[span_597](end_span)
                playSound('error');[span_598](start_span)[span_598](end_span)
                tgHaptic('error');[span_599](start_span)[span_599](end_span)

                resultsArea.innerHTML = `
                    <div class="glass-card p-2 text-center" style="border-color:var(--red);">
                        <div class="font-bold text-xs color-red mb-1">💥 НЕ КВАЛИФИЦИРОВАН: ${score} БАЛЛОВ</div>
                        <div class="sub-label mb-2" style="font-size:10px;">${comment}<br>Потерян стартовый взнос: -${cost.toLocaleString()} ₽</div>
                        <button onclick="PhoneManager.renderStreetSubScreen()" class="btn btn-dark btn-sm w-full">Попробовать снова</button>
                    </div>
                `;[span_600](start_span)[span_600](end_span)
            }

            saveState();[span_601](start_span)[span_601](end_span)
            updateHeaderUI();[span_602](start_span)[span_602](end_span)
        }, 1600);[span_603](start_span)[span_603](end_span)
    },

    // ----------------------------------------------------
    // ДРАГ 402М (СОГЛАСОВАН С ТАХОМЕТРОМ И СТАВКАМИ)
    // ----------------------------------------------------
    renderDragDiscipline(container) {
        if (!state.garage || state.garage.length === 0) {[span_604](start_span)[span_604](end_span)
            container.innerHTML = `<div class="glass-card text-center sub-label py-6">В гараже нет машин!</div>`;[span_605](start_span)[span_605](end_span)
            return;[span_606](start_span)[span_606](end_span)
        }

        let carIdx = state.player.selectedStreetCarIndex || 0;[span_607](start_span)[span_607](end_span)
        if (carIdx >= state.garage.length) carIdx = 0;[span_608](start_span)[span_608](end_span)
        const car = state.garage[carIdx];[span_609](start_span)[span_609](end_span)
        let myPower = car.power || 100;[span_610](start_span)[span_610](end_span)

        let selectorOptions = state.garage.map((c, i) => `<option value="${i}" ${i === carIdx ? 'selected' : ''}>${c.name} (${c.power || 100} л.с.)</option>`).join('');[span_611](start_span)[span_611](end_span)

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
        `;[span_612](start_span)[span_612](end_span)
    },

    // ----------------------------------------------------
    // СТЕНС
    // ----------------------------------------------------
    renderStanceDiscipline(container) {
        if (!state.garage || state.garage.length === 0) {[span_613](start_span)[span_613](end_span)
            container.innerHTML = `<div class="glass-card text-center sub-label py-6">В гараже нет машин для выставки!</div>`;[span_614](start_span)[span_614](end_span)
            return;[span_615](start_span)[span_615](end_span)
        }

        let carIdx = state.player.selectedStreetCarIndex || 0;[span_616](start_span)[span_616](end_span)
        if (carIdx >= state.garage.length) carIdx = 0;[span_617](start_span)[span_617](end_span)
        const car = state.garage[carIdx];[span_618](start_span)[span_618](end_span)
        const t = car.tuning || {};[span_619](start_span)[span_619](end_span)

        let score = 15;[span_620](start_span)[span_620](end_span)
        let penaltyText = "";[span_621](start_span)[span_621](end_span)

        if (t.stance) score += 35;[span_622](start_span)[span_622](end_span)
        if (t.customWheels) score += 25;[span_623](start_span)[span_623](end_span)
        if (t.bodykit) score += 15;[span_624](start_span)[span_624](end_span)
        if (car.isPolished) score += 10;[span_625](start_span)[span_625](end_span)

        let cond = car.condition || 100;[span_626](start_span)[span_626](end_span)
        if (cond < 60) {[span_627](start_span)[span_627](end_span)
            score -= 25;[span_628](start_span)[span_628](end_span)
            penaltyText += "• Вмятины и сколы на кузове (-25 баллов)<br>";[span_629](start_span)[span_629](end_span)
        }
        if (car.bodyThickness?.doors > 250 || car.bodyThickness?.wings > 250) {[span_630](start_span)[span_630](end_span)
            score -= 15;[span_631](start_span)[span_631](end_span)
            penaltyText += "• Шпаклёвка видна невооружённым глазом (-15 баллов)<br>";[span_632](start_span)[span_632](end_span)
        }

        score = Math.max(5, Math.min(100, score));[span_633](start_span)[span_633](end_span)
        let rankName = score >= 85 ? "🔥 Топ-1 Фестиваля / Король Стиля" : (score >= 60 ? "✨ Достойный Стенс-Проект" : "🛠️ Сток / Корч не для выставки");[span_634](start_span)[span_634](end_span)

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
        `;[span_635](start_span)[span_635](end_span)
    },

    enterStanceContest(score) {
        let cost = 15000;[span_636](start_span)[span_636](end_span)
        let cash = state.player?.cash || 0;[span_637](start_span)[span_637](end_span)
        if (cash < cost) return showToast("Не хватает денег на взнос участника фестиваля!");[span_638](start_span)[span_638](end_span)

        state.player.cash -= cost;[span_639](start_span)[span_639](end_span)
        playSound('tick');[span_640](start_span)[span_640](end_span)
        tgHaptic('light');[span_641](start_span)[span_641](end_span)

        const resBox = document.getElementById('stanceContestResult');[span_642](start_span)[span_642](end_span)
        if (!resBox) return;[span_643](start_span)[span_643](end_span)

        resBox.innerHTML = `
            <div class="glass-card text-center p-3">
                <div style="font-size:24px;">📸 🎙️ ✨</div>
                <div class="font-bold text-xs color-cyan my-1">ЗАМЕР КЛИРЕНСА И ОЦЕНКА ФИТМЕНТА...</div>
            </div>
        `;[span_644](start_span)[span_644](end_span)

        setTimeout(() => {
            if (score >= 75) {[span_645](start_span)[span_645](end_span)
                let prize = Math.round(cost * (score / 35));[span_646](start_span)[span_646](end_span)
                state.player.cash += prize;[span_647](start_span)[span_647](end_span)
                state.player.streetCred = (state.player.streetCred || 100) + 35;[span_648](start_span)[span_648](end_span)
                playSound('win');[span_649](start_span)[span_649](end_span)
                tgHaptic('success');[span_650](start_span)[span_650](end_span)

                resBox.innerHTML = `
                    <div class="glass-card p-2 text-center" style="border-color:var(--amber);">
                        <div class="font-bold text-xs color-amber mb-1">🥇 ПОБЕДИТЕЛЬ НОМИНАЦИИ «BEST FITMENT»!</div>
                        <div class="sub-label mb-2" style="font-size:10px;">Кубок ваш! Судьи в восторге от посадки дисков в арки.<br>Награда: <b class="color-green">+${prize.toLocaleString()} ₽</b> (+35 Респекта)</div>
                        <button onclick="PhoneManager.renderStreetSubScreen()" class="btn btn-amber btn-sm w-full">Забрать кубок 🏆</button>
                    </div>
                `;[span_651](start_span)[span_651](end_span)
            } else {
                playSound('error');[span_652](start_span)[span_652](end_span)
                resBox.innerHTML = `
                    <div class="glass-card p-2 text-center" style="border-color:var(--red);">
                        <div class="font-bold text-xs color-red mb-1">🥉 ВНЕ ПРИЗОВОЙ ТРОЙКИ (${score} баллов)</div>
                        <div class="sub-label mb-2" style="font-size:10px;">Проект выглядит сырым: не хватает занижения или кузов требует покраски!</div>
                        <button onclick="PhoneManager.renderStreetSubScreen()" class="btn btn-dark btn-sm w-full">Понятно</button>
                    </div>
                `;[span_653](start_span)[span_653](end_span)
            }

            saveState();[span_654](start_span)[span_654](end_span)
            updateHeaderUI();[span_655](start_span)[span_655](end_span)
        }, 1500);[span_656](start_span)[span_656](end_span)
    },

    // ----------------------------------------------------
    // ШАШКИ В ПОТОКЕ
    // ----------------------------------------------------
    renderSprintDiscipline(container) {
        let carIdx = state.player.selectedStreetCarIndex || 0;[span_657](start_span)[span_657](end_span)
        const car = state.garage ? state.garage[carIdx] : null;[span_658](start_span)[span_658](end_span)
        let power = car?.power || 100;[span_659](start_span)[span_659](end_span)
        let maxSpeed = Math.round(Math.min(320, 120 + Math.sqrt(power) * 8.5));[span_660](start_span)[span_660](end_span)

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
        `;[span_661](start_span)[span_661](end_span)
    },

    startCitySprint(mode, maxSpeed) {
        let bet = mode === 'insane' ? 150000 : 40000;[span_662](start_span)[span_662](end_span)
        let cash = state.player?.cash || 0;[span_663](start_span)[span_663](end_span)
        if (cash < bet) return showToast("Не хватает денег на заезд!");[span_664](start_span)[span_664](end_span)

        state.player.cash -= bet;[span_665](start_span)[span_665](end_span)
        state.player.consecutiveRaces = (state.player.consecutiveRaces || 0) + 2;[span_666](start_span)[span_666](end_span)

        playSound('tick');[span_667](start_span)[span_667](end_span)
        tgHaptic('medium');[span_668](start_span)[span_668](end_span)

        const resBox = document.getElementById('sprintRunResultArea');[span_669](start_span)[span_669](end_span)
        if (!resBox) return;[span_670](start_span)[span_670](end_span)

        resBox.innerHTML = `
            <div class="glass-card text-center p-3">
                <div style="font-size:24px;">🏎️ 💨 🚨</div>
                <div class="font-bold text-xs color-red my-1">ОБГОН СПРАВА! СКОРОСТЬ ${maxSpeed} КМ/Ч...</div>
            </div>
        `;[span_671](start_span)[span_671](end_span)

        setTimeout(() => {
            let immunity = state.player?.policeImmunityDays || 0;[span_672](start_span)[span_672](end_span)
            let policeRaidChance = immunity > 0 ? 0 : (mode === 'insane' ? 0.35 : 0.18);[span_673](start_span)[span_673](end_span)

            if (Math.random() < policeRaidChance) {[span_674](start_span)[span_674](end_span)
                let fine = Math.round(bet * 1.5);[span_675](start_span)[span_675](end_span)
                state.player.cash = Math.max(0, state.player.cash - fine);[span_676](start_span)[span_676](end_span)
                playSound('error');[span_677](start_span)[span_677](end_span)
                tgHaptic('error');[span_678](start_span)[span_678](end_span)

                resBox.innerHTML = `
                    <div class="glass-card p-2 text-center" style="border-color:var(--red);">
                        <div class="font-bold text-xs color-red mb-1">🚨 ПЕРЕХВАТ СПЕЦРОТЫ ДПС!</div>
                        <div class="sub-label mb-2" style="font-size:10px;">Спецбатальон с люстрами заблокировал съезд.<br>Штраф за опасное вождение: -${fine.toLocaleString()} ₽!</div>
                        <button onclick="PhoneManager.renderStreetSubScreen()" class="btn btn-danger btn-sm w-full">Оплатить штраф</button>
                    </div>
                `;[span_679](start_span)[span_679](end_span)
            } else {
                let win = Math.round(bet * (mode === 'insane' ? 2.6 : 2.1));[span_680](start_span)[span_680](end_span)
                state.player.cash += win;[span_681](start_span)[span_681](end_span)
                state.player.streetCred = (state.player.streetCred || 100) + (mode === 'insane' ? 50 : 20);[span_682](start_span)[span_682](end_span)
                playSound('win');[span_683](start_span)[span_683](end_span)
                tgHaptic('success');[span_684](start_span)[span_684](end_span)

                resBox.innerHTML = `
                    <div class="glass-card p-2 text-center" style="border-color:var(--green);">
                        <div class="font-bold text-xs color-green mb-1">⚡ ЧИСТЫЙ ПРОСТРЕЛ БЕЗ КАМЕР!</div>
                        <div class="sub-label mb-2" style="font-size:10px;">Вы оторвались от преследователей на скорости ${maxSpeed} км/ч!<br>Выигрыш: <b class="color-green">+${win.toLocaleString()} ₽</b> (+${mode === 'insane' ? 50 : 20} Респекта)</div>
                        <button onclick="PhoneManager.renderStreetSubScreen()" class="btn btn-green btn-sm w-full">Забрать кэш</button>
                    </div>
                `;[span_685](start_span)[span_685](end_span)
            }

            saveState();[span_686](start_span)[span_686](end_span)
            updateHeaderUI();[span_687](start_span)[span_687](end_span)
        }, 1700);[span_688](start_span)[span_688](end_span)
    },

    // ========================================================
    // 7. СЕРВИСНЫЕ ПРИЛОЖЕНИЯ
    // ========================================================
    renderAutodrotApp(container) {
        let sub = this.autodrotSubTab || 'market';[span_689](start_span)[span_689](end_span)
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
        `;[span_690](start_span)[span_690](end_span)
        this.renderAutodrotSubScreen();[span_691](start_span)[span_691](end_span)
    },

    switchAutodrotSubTab(tab) {
        playSound('tick');[span_692](start_span)[span_692](end_span)
        tgHaptic('light');[span_693](start_span)[span_693](end_span)
        this.autodrotSubTab = tab;[span_694](start_span)[span_694](end_span)
        this.renderAutodrotApp(document.getElementById('phoneAppContainer'));[span_695](start_span)[span_695](end_span)
    },

    setAutodrotP2PFilter(filter) {
        this.autodrotP2PFilter = filter;[span_696](start_span)[span_696](end_span)
        this.renderAutodrotSubScreen();[span_697](start_span)[span_697](end_span)
    },

    renderAutodrotSubScreen() {
        const content = document.getElementById('autodrotScreenContent');[span_698](start_span)[span_698](end_span)
        if (!content) return;[span_699](start_span)[span_699](end_span)

        if (this.autodrotSubTab === 'market') {[span_700](start_span)[span_700](end_span)
            let f = this.autodrotP2PFilter || 'cars';[span_701](start_span)[span_701](end_span)
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
            `;[span_702](start_span)[span_702](end_span)
            this.renderP2PListingsFiltered();[span_703](start_span)[span_703](end_span)
        } else if (this.autodrotSubTab === 'chat') {[span_704](start_span)[span_704](end_span)
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
            `;[span_705](start_span)[span_705](end_span)
            if (typeof renderLifeChat === 'function') renderLifeChat();[span_706](start_span)[span_706](end_span)
        } else if (this.autodrotSubTab === 'hotdeals') {[span_707](start_span)[span_707](end_span)
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
            `;[span_708](start_span)[span_708](end_span)
        }
    },

    renderP2PListingsFiltered() {
        const list = document.getElementById('p2pItemsList');[span_709](start_span)[span_709](end_span)
        if (!list) return;[span_710](start_span)[span_710](end_span)

        let filter = this.autodrotP2PFilter || 'cars';[span_711](start_span)[span_711](end_span)
        if (!state.p2pMarketListings) state.p2pMarketListings = [];[span_712](start_span)[span_712](end_span)

        let filtered = state.p2pMarketListings.filter(item => item.type === filter);[span_713](start_span)[span_713](end_span)

        if (filtered.length === 0) {[span_714](start_span)[span_714](end_span)
            list.innerHTML = "<div class='glass-card text-center sub-label py-6'>В этой категории биржи пока нет лотов.</div>";[span_715](start_span)[span_715](end_span)
            return;[span_716](start_span)[span_716](end_span)
        }

        let html = "";[span_717](start_span)[span_717](end_span)
        filtered.forEach(item => {[span_718](start_span)[span_718](end_span)
            let isMy = (state.myP2PListings && state.myP2PListings.includes(item.id));[span_719](start_span)[span_719](end_span)
            let btnAction = isMy[span_720](start_span)[span_720](end_span)
                ? `<button onclick="cancelP2PListing('${item.id}')" class="btn btn-danger btn-auto btn-sm">Снять с продажи</button>`[span_721](start_span)[span_721](end_span)
                : `<button onclick="PhoneManager.buyP2PAnyListing('${item.id}')" class="btn btn-green btn-auto btn-sm">Купить (${item.price.toLocaleString()} ₽)</button>`;[span_722](start_span)[span_722](end_span)

            html += `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan">${item.name}</b>
                    <span class="price-val text-xs color-green">${item.price.toLocaleString()} ₽</span>
                </div>
                <div class="sub-label mb-2" style="font-size:10px;">Продавец: <b>${item.seller}</b> ${item.desc ? '• ' + item.desc : ''}</div>
                <div class="text-right">${btnAction}</div>
            </div>`;[span_723](start_span)[span_723](end_span)
        });
        list.innerHTML = html;[span_724](start_span)[span_724](end_span)
    },

    buyP2PAnyListing(listingId) {
        const idx = (state.p2pMarketListings || []).findIndex(l => l.id === listingId);[span_725](start_span)[span_725](end_span)
        if (idx === -1) return;[span_726](start_span)[span_726](end_span)
        const lot = state.p2pMarketListings[idx];[span_727](start_span)[span_727](end_span)

        let cash = state.player?.cash || 0;[span_728](start_span)[span_728](end_span)
        if (cash < lot.price) return showToast("Не хватает денег для выкупа лота!");[span_729](start_span)[span_729](end_span)

        if (lot.type === 'business') {[span_730](start_span)[span_730](end_span)
            state.player.cash -= lot.price;[span_731](start_span)[span_731](end_span)
            let targetBiz = (state.businesses || []).find(b => b.id === lot.bizId);[span_732](start_span)[span_732](end_span)
            if (targetBiz) {[span_733](start_span)[span_733](end_span)
                targetBiz.level = Math.max(targetBiz.level || 0, lot.bizLevel || 1);[span_734](start_span)[span_734](end_span)
                targetBiz.stock = 100;[span_735](start_span)[span_735](end_span)
            }
            showToast(`Вы выкупили готовый бизнес «${lot.name}» с P2P биржи!`);[span_736](start_span)[span_736](end_span)
        } else if (lot.type === 'housing') {[span_737](start_span)[span_737](end_span)
            state.player.cash -= lot.price;[span_738](start_span)[span_738](end_span)
            if (!state.player.ownedHouses) state.player.ownedHouses = [];[span_739](start_span)[span_739](end_span)
            if (!state.player.ownedHouses.includes(lot.houseId)) state.player.ownedHouses.push(lot.houseId);[span_740](start_span)[span_740](end_span)
            state.player.housingId = lot.houseId;[span_741](start_span)[span_741](end_span)
            state.player.housingType = 'own';[span_742](start_span)[span_742](end_span)
            showToast(`Вы выкупили недвижимость «${lot.name}» с P2P биржи!`);[span_743](start_span)[span_743](end_span)
        } else if (lot.type === 'cars' || lot.type === 'car' || lot.type === 'plates' || lot.type === 'plate') {
            buyP2PListing(listingId);[span_744](start_span)[span_744](end_span)
            return;[span_745](start_span)[span_745](end_span)
        }

        state.p2pMarketListings.splice(idx, 1);[span_746](start_span)[span_746](end_span)
        saveState();[span_747](start_span)[span_747](end_span)
        updateHeaderUI();[span_748](start_span)[span_748](end_span)
        playSound('win');[span_749](start_span)[span_749](end_span)
        tgHaptic('success');[span_750](start_span)[span_750](end_span)
        this.renderAutodrotSubScreen();[span_751](start_span)[span_751](end_span)
    },

    // ========================================================
    // 8. ВО-БАНК ОНЛАЙН (РАСШИРЕННЫЙ ФУНКЦИОНАЛ)
    // ========================================================
    renderBankApp(container) {
        let cash = state.player?.cash || 0;[span_752](start_span)[span_752](end_span)
        let safe = state.player?.safeDeposit || 0;[span_753](start_span)[span_753](end_span)
        let debt = state.player?.loanDebt || 0;[span_754](start_span)[span_754](end_span)
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
        let conn = state.player?.connections || 0;[span_755](start_span)[span_755](end_span)
        let immunity = state.player?.policeImmunityDays || 0;[span_756](start_span)[span_756](end_span)
        let hasLic = !!state.player?.hasRacingLicense;[span_757](start_span)[span_757](end_span)

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
        `;[span_758](start_span)[span_758](end_span)
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
        `;[span_759](start_span)[span_759](end_span)
        if (typeof renderContracts === 'function') renderContracts();[span_760](start_span)[span_760](end_span)
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
        `;[span_761](start_span)[span_761](end_span)
        if (typeof renderContainersList === 'function') renderContainersList();[span_762](start_span)[span_762](end_span)
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
        `;[span_763](start_span)[span_763](end_span)
        if (typeof switchShopSection === 'function') switchShopSection('tools');[span_764](start_span)[span_764](end_span)
    },

    renderRadarApp(container) {
        let immunity = state.player?.policeImmunityDays || 0;[span_765](start_span)[span_765](end_span)
        let races = state.player?.consecutiveRaces || 0;[span_766](start_span)[span_766](end_span)
        let maxRaces = state.player?.maxRacesBeforeRaid || 12;[span_767](start_span)[span_767](end_span)

        let statusText = immunity > 0[span_768](start_span)[span_768](end_span)
            ? `<span class="color-green font-bold">Иммунитет (${immunity} дн.)</span>`[span_769](start_span)[span_769](end_span)
            : `<span class="color-amber font-bold">Рейды активны</span>`;[span_770](start_span)[span_770](end_span)

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
        `;[span_771](start_span)[span_771](end_span)
    },

    renderMessagesList(container) {
        const messages = state.player?.phoneMessages || [];[span_772](start_span)[span_772](end_span)
        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-comment-dots color-cyan"></i> Сообщения</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="phone-messages-list">
        `;[span_773](start_span)[span_773](end_span)

        if (messages.length === 0) {[span_774](start_span)[span_774](end_span)
            html += `<div class="sub-label text-center py-6">Нет входящих сообщений</div>`;[span_775](start_span)[span_775](end_span)
        } else {
            messages.forEach(msg => {[span_776](start_span)[span_776](end_span)
                let unreadClass = msg.unread ? 'unread-msg' : '';[span_777](start_span)[span_777](end_span)
                let unreadDot = msg.unread ? '<span class="phone-unread-dot"></span>' : '';[span_778](start_span)[span_778](end_span)
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
                `;[span_779](start_span)[span_779](end_span)
            });
        }

        html += `</div></div>`;[span_780](start_span)[span_780](end_span)
        container.innerHTML = html;[span_781](start_span)[span_781](end_span)
    },

    openChat(msgId) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);[span_782](start_span)[span_782](end_span)
        if (msg) {[span_783](start_span)[span_783](end_span)
            msg.unread = false;[span_784](start_span)[span_784](end_span)
            this.updateUnreadBadge();[span_785](start_span)[span_785](end_span)
            saveState();[span_786](start_span)[span_786](end_span)
        }
        this.activeChatId = msgId;[span_787](start_span)[span_787](end_span)
        this.renderPhoneScreen();[span_788](start_span)[span_788](end_span)
    },

    renderChatConversation(container, msgId) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);[span_789](start_span)[span_789](end_span)
        if (!msg) return this.goHome();[span_790](start_span)[span_790](end_span)

        let historyHtml = '';[span_791](start_span)[span_791](end_span)
        (msg.chatHistory || []).forEach(chat => {[span_792](start_span)[span_792](end_span)
            let isMine = chat.from === 'me';[span_793](start_span)[span_793](end_span)
            historyHtml += `
                <div class="chat-msg ${isMine ? 'msg-player' : 'msg-seller'}">
                    ${chat.text}
                </div>
            `;[span_794](start_span)[span_794](end_span)
        });

        let actionButtons = '';[span_795](start_span)[span_795](end_span)
        if (msg.isScam) {[span_796](start_span)[span_796](end_span)
            actionButtons = `
                <div class="p-2 mb-2" style="background:rgba(255,51,102,0.1); border:1px solid var(--red); border-radius:8px;">
                    <div class="text-xs color-red font-bold mb-1">Подозрение на мошенничество!</div>
                    <div class="grid-2">
                        <button onclick="PhoneManager.resolveScamMessage('${msg.id}', false)" class="btn btn-green btn-sm">Заблокировать 🛡️</button>
                        <button onclick="PhoneManager.resolveScamMessage('${msg.id}', true)" class="btn btn-danger btn-sm">Перевести 50k 💸</button>
                    </div>
                </div>
            `;[span_797](start_span)[span_797](end_span)
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
        `;[span_798](start_span)[span_798](end_span)
    },

    sendReplyMessage(msgId) {
        const input = document.getElementById('phoneReplyInput');[span_799](start_span)[span_799](end_span)
        if (!input || !input.value.trim()) return;[span_800](start_span)[span_800](end_span)
        const text = input.value.trim();[span_801](start_span)[span_801](end_span)

        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);[span_802](start_span)[span_802](end_span)
        if (!msg) return;[span_803](start_span)[span_803](end_span)

        if (!msg.chatHistory) msg.chatHistory = [];[span_804](start_span)[span_804](end_span)
        msg.chatHistory.push({ from: 'me', text: text });[span_805](start_span)[span_805](end_span)
        msg.preview = "Вы: " + text;[span_806](start_span)[span_806](end_span)
        input.value = '';[span_807](start_span)[span_807](end_span)

        setTimeout(() => {
            let replyText = "Сообщение принято.";[span_808](start_span)[span_808](end_span)
            if (msg.sender.includes("Во-Банк")) replyText = "Запрос зарегистрирован банковским сервисом.";[span_809](start_span)[span_809](end_span)
            else if (msg.sender.includes("Артур")) replyText = "Добро. Будут вопросы — пиши.";[span_810](start_span)[span_810](end_span)
            else if (msg.sender.includes("Влад")) replyText = "Красава, ждём твоих заездов на треке!";[span_811](start_span)[span_811](end_span)
            else if (msg.isScam) replyText = "Оператор безопасности требует срочного перевода средств!";[span_812](start_span)[span_812](end_span)
            else replyText = "Понял тебя. На связи!";[span_813](start_span)[span_813](end_span)

            msg.chatHistory.push({ from: 'them', text: replyText });[span_814](start_span)[span_814](end_span)
            msg.preview = replyText;[span_815](start_span)[span_815](end_span)
            saveState();[span_816](start_span)[span_816](end_span)
            if (PhoneManager.currentApp === 'messages' && PhoneManager.activeChatId === msgId) {[span_817](start_span)[span_817](end_span)
                PhoneManager.renderPhoneScreen();[span_818](start_span)[span_818](end_span)
            }
            playSound('tick');[span_819](start_span)[span_819](end_span)
            tgHaptic('light');[span_820](start_span)[span_820](end_span)
        }, 1000);[span_821](start_span)[span_821](end_span)

        saveState();[span_822](start_span)[span_822](end_span)
        this.renderPhoneScreen();[span_823](start_span)[span_823](end_span)
    },

    resolveScamMessage(msgId, fellForScam) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);[span_824](start_span)[span_824](end_span)
        if (!msg) return;[span_825](start_span)[span_825](end_span)

        if (fellForScam) {[span_826](start_span)[span_826](end_span)
            let loss = 50000;[span_827](start_span)[span_827](end_span)
            state.player.cash = Math.max(0, (state.player.cash || 0) - loss);[span_828](start_span)[span_828](end_span)
            state.player.mood = Math.max(0, (state.player.mood || 80) - 25);[span_829](start_span)[span_829](end_span)
            msg.chatHistory.push({ from: 'them', text: "Спасибо за перевод, наивный перекуп!" });[span_830](start_span)[span_830](end_span)
            msg.isScam = false;[span_831](start_span)[span_831](end_span)
            openVerdictModal("РАЗВОД МОШЕННИКОВ! 💸", `Вы поддались на спам и перевели мошенникам ${loss.toLocaleString()} ₽!`, false);[span_832](start_span)[span_832](end_span)
        } else {
            msg.chatHistory.push({ from: 'them', text: "Номер добавлен в спам-фильтр." });[span_833](start_span)[span_833](end_span)
            msg.isScam = false;[span_834](start_span)[span_834](end_span)
            state.player.karma = Math.min(100, (state.player.karma || 50) + 3);[span_835](start_span)[span_835](end_span)
            showToast("🛡️ Мошенник заблокирован! Карма (+3)");[span_836](start_span)[span_836](end_span)
        }

        saveState();[span_837](start_span)[span_837](end_span)
        this.renderPhoneScreen();[span_838](start_span)[span_838](end_span)
    },

    pushBuyerFollowupSMS(carName, isScamDetected, buyerName) {
        if (!state.player.phoneMessages) state.player.phoneMessages = [];[span_839](start_span)[span_839](end_span)

        let msgId = "sms_buyer_" + Date.now();[span_840](start_span)[span_840](end_span)
        let newSMS = null;[span_841](start_span)[span_841](end_span)

        if (isScamDetected) {[span_842](start_span)[span_842](end_span)
            newSMS = {
                id: msgId,[span_843](start_span)[span_843](end_span)
                sender: `😡 ${buyerName}`,[span_844](start_span)[span_844](end_span)
                avatar: "🤬",[span_845](start_span)[span_845](end_span)
                preview: `Ты что мне впарил?! На ${carName} скрытый дефект!`,[span_846](start_span)[span_846](end_span)
                time: "Только что",[span_847](start_span)[span_847](end_span)
                unread: true,[span_848](start_span)[span_848](end_span)
                chatHistory: [
                    { from: "them", text: `Слышь, перекуп! Я доехал до дома на «${carName}», а мотор застучал! Сервис сказал, была залита загущающая присадка!` },
                    { from: "them", text: `Жди гостей, я знаю твой гараж! Либо возвращай часть суммы, либо будут проблемы!` }[span_849](start_span)[span_849](end_span)
                ]
            };
        } else {
            newSMS = {
                id: msgId,[span_850](start_span)[span_850](end_span)
                sender: `🤝 ${buyerName}`,[span_851](start_span)[span_851](end_span)
                avatar: "🙂",[span_852](start_span)[span_852](end_span)
                preview: `Спасибо за ${carName}! Машина огонь, мотор шепчет.`,[span_853](start_span)[span_853](end_span)
                time: "Только что",[span_854](start_span)[span_854](end_span)
                unread: true,[span_855](start_span)[span_855](end_span)
                chatHistory: [
                    { from: "them", text: `Привет! Добрался отлично на «${carName}». Всё как ты и говорил — честный ухоженный аппарат.` },[span_856](start_span)[span_856](end_span)
                    { from: "them", text: `Оставил отличный отзыв среди знакомых водителей. Респект!` }[span_857](start_span)[span_857](end_span)
                ]
            };
        }

        state.player.phoneMessages.unshift(newSMS);[span_858](start_span)[span_858](end_span)
        this.updateUnreadBadge();[span_859](start_span)[span_859](end_span)
        saveState();[span_860](start_span)[span_860](end_span)
        showToast(`📲 Новое SMS от ${buyerName}!`);[span_861](start_span)[span_861](end_span)
        playSound('win');[span_862](start_span)[span_862](end_span)
        tgHaptic('success');[span_863](start_span)[span_863](end_span)
    }
};

window.PhoneManager = PhoneManager;[span_864](start_span)[span_864](end_span)

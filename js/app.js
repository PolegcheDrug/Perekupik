// ========================================================
// js/app.js — ЯДРО, TELEGRAM CLOUD STORAGE & СИНХРОНИЗАЦИЯ (v0.4.5)
// Разработчики: Илья Чепиль (DXF) & Perekup Dev Team
// Реальное время (00:00), квесты, синдикат-гейт, мультиязычность,
// надежный запуск всех модулей PerekupOS без зависаний
// ========================================================

const CURRENT_GAME_VERSION = "v0.4.5";[span_0](start_span)[span_0](end_span)

let ACtx = window.AudioContext || window.webkitAudioContext;[span_1](start_span)[span_1](end_span)
let audioCtx = null;[span_2](start_span)[span_2](end_span)

let tgUserId = "guest_777";[span_3](start_span)[span_3](end_span)
let tgUserData = null;[span_4](start_span)[span_4](end_span)
let SAVE_KEY_PREFIX = "perekup_v4_";[span_5](start_span)[span_5](end_span)
let cloudSaveDebounceTimer = null;[span_6](start_span)[span_6](end_span)
let isCloudStorageAvailable = false;[span_7](start_span)[span_7](end_span)

// ========================================================
// 1. ЗВУК И ТАКТИЛЬНЫЙ ОТКЛИК (HAPTICS)
// ========================================================
function tgHaptic(type = 'light') {[span_8](start_span)[span_8](end_span)
    try { 
        if (window.Telegram?.WebApp?.HapticFeedback) { 
            let isNotif = ['success', 'warning', 'error'].includes(type);[span_9](start_span)[span_9](end_span)
            if (isNotif) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);[span_10](start_span)[span_10](end_span)
            } else {
                window.Telegram.WebApp.HapticFeedback.impactOccurred(type);[span_11](start_span)[span_11](end_span)
            }
        } 
    } catch(e) {}
}

function initAudio() {[span_12](start_span)[span_12](end_span)
    try {
        if (!audioCtx && ACtx) audioCtx = new ACtx();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch(e) {}
}

function playSound(type) {[span_13](start_span)[span_13](end_span)
    try {
        initAudio();[span_14](start_span)[span_14](end_span)
        if (!audioCtx) return;
        const now = audioCtx.currentTime;[span_15](start_span)[span_15](end_span)
        if (type === 'tick') {[span_16](start_span)[span_16](end_span)
            const osc = audioCtx.createOscillator();[span_17](start_span)[span_17](end_span)
            const g = audioCtx.createGain();[span_18](start_span)[span_18](end_span)
            osc.connect(g); g.connect(audioCtx.destination);[span_19](start_span)[span_19](end_span)
            osc.frequency.setValueAtTime(800, now);[span_20](start_span)[span_20](end_span)
            g.gain.setValueAtTime(0.05, now);[span_21](start_span)[span_21](end_span)
            g.gain.linearRampToValueAtTime(0, now + 0.03);[span_22](start_span)[span_22](end_span)
            osc.start(now); osc.stop(now + 0.03);[span_23](start_span)[span_23](end_span)
        } else if (type === 'win') {[span_24](start_span)[span_24](end_span)
            const osc = audioCtx.createOscillator();[span_25](start_span)[span_25](end_span)
            const g = audioCtx.createGain();[span_26](start_span)[span_26](end_span)
            osc.connect(g); g.connect(audioCtx.destination);[span_27](start_span)[span_27](end_span)
            osc.frequency.setValueAtTime(440, now);[span_28](start_span)[span_28](end_span)
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);[span_29](start_span)[span_29](end_span)
            g.gain.setValueAtTime(0.2, now);[span_30](start_span)[span_30](end_span)
            g.gain.linearRampToValueAtTime(0, now + 0.25);[span_31](start_span)[span_31](end_span)
            osc.start(now); osc.stop(now + 0.25);[span_32](start_span)[span_32](end_span)
        } else if (type === 'error') {[span_33](start_span)[span_33](end_span)
            const osc = audioCtx.createOscillator();[span_34](start_span)[span_34](end_span)
            const g = audioCtx.createGain();[span_35](start_span)[span_35](end_span)
            osc.connect(g); g.connect(audioCtx.destination);[span_36](start_span)[span_36](end_span)
            osc.type = 'square';[span_37](start_span)[span_37](end_span)
            osc.frequency.setValueAtTime(160, now);[span_38](start_span)[span_38](end_span)
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);[span_39](start_span)[span_39](end_span)
            g.gain.setValueAtTime(0.15, now);[span_40](start_span)[span_40](end_span)
            g.gain.linearRampToValueAtTime(0, now + 0.3);[span_41](start_span)[span_41](end_span)
            osc.start(now); osc.stop(now + 0.3);[span_42](start_span)[span_42](end_span)
        }
    } catch(e) {}
}

function playEngineSound() {[span_43](start_span)[span_43](end_span)
    try {
        initAudio();[span_44](start_span)[span_44](end_span)
        if (!audioCtx) return;
        const now = audioCtx.currentTime;[span_45](start_span)[span_45](end_span)
        const osc = audioCtx.createOscillator();[span_46](start_span)[span_46](end_span)
        osc.type = 'sawtooth';[span_47](start_span)[span_47](end_span)
        osc.connect(g); g.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(110, now);[span_48](start_span)[span_48](end_span)
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.45);[span_49](start_span)[span_49](end_span)
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.9);[span_50](start_span)[span_50](end_span)
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.25, now);[span_51](start_span)[span_51](end_span)
        g.gain.linearRampToValueAtTime(0, now + 0.95);[span_52](start_span)[span_52](end_span)
        osc.start(now); osc.stop(now + 0.95);[span_53](start_span)[span_53](end_span)
        tgHaptic('medium');[span_54](start_span)[span_54](end_span)
    } catch(e) {}
}

function spawnFloatingReward(text) {[span_55](start_span)[span_55](end_span)
    try {
        const el = document.createElement('div');[span_56](start_span)[span_56](end_span)
        el.className = 'floating-reward';[span_57](start_span)[span_57](end_span)
        el.innerText = text;[span_58](start_span)[span_58](end_span)
        el.style.left = '50%';[span_59](start_span)[span_59](end_span)
        el.style.top = '45%';[span_60](start_span)[span_60](end_span)
        document.body.appendChild(el);[span_61](start_span)[span_61](end_span)
        setTimeout(() => { el.remove(); }, 1200);[span_62](start_span)[span_62](end_span)
    } catch(e) {}
}

function setTxt(id, val) {[span_63](start_span)[span_63](end_span)
    const el = document.getElementById(id);[span_64](start_span)[span_64](end_span)
    if (el) el.innerHTML = val;[span_65](start_span)[span_65](end_span)
}

function showToast(msg) {[span_66](start_span)[span_66](end_span)
    const t = document.getElementById('toastNotification');[span_67](start_span)[span_67](end_span)
    if (!t) return;[span_68](start_span)[span_68](end_span)
    t.innerText = msg;[span_69](start_span)[span_69](end_span)
    t.classList.add('show');[span_70](start_span)[span_70](end_span)
    setTimeout(() => { t.classList.remove('show'); }, 2500);[span_71](start_span)[span_71](end_span)
}

function closeModal(id) {[span_72](start_span)[span_72](end_span)
    const el = document.getElementById(id);[span_73](start_span)[span_73](end_span)
    if (el) el.classList.remove('active');[span_74](start_span)[span_74](end_span)
}

function openVerdictModal(title, text, isSuccess, amount, profit) {[span_75](start_span)[span_75](end_span)
    tgHaptic(isSuccess ? 'success' : 'error');[span_76](start_span)[span_76](end_span)
    if (isSuccess) playSound('win');[span_77](start_span)[span_77](end_span)
    else playSound('error');[span_78](start_span)[span_78](end_span)

    setTxt('verdictEmoji', isSuccess ? '🎉' : '❌');[span_79](start_span)[span_79](end_span)
    setTxt('verdictTitle', title);[span_80](start_span)[span_80](end_span)
    setTxt('verdictText', text);[span_81](start_span)[span_81](end_span)

    const amtEl = document.getElementById('verdictAmount');[span_82](start_span)[span_82](end_span)
    if (amtEl) {[span_83](start_span)[span_83](end_span)
        if (amount) {[span_84](start_span)[span_84](end_span)
            amtEl.style.display = 'block';[span_85](start_span)[span_85](end_span)
            amtEl.innerText = (amount > 0 ? "+" : "") + amount.toLocaleString() + " ₽";
        } else {
            amtEl.style.display = 'none';[span_86](start_span)[span_86](end_span)
        }
    }

    const profitEl = document.getElementById('verdictProfitBadge');[span_87](start_span)[span_87](end_span)
    if (profitEl) {[span_88](start_span)[span_88](end_span)
        if (profit !== undefined && profit !== null) {[span_89](start_span)[span_89](end_span)
            profitEl.style.display = 'block';[span_90](start_span)[span_90](end_span)
            if (profit > 0) {[span_91](start_span)[span_91](end_span)
                profitEl.className = 'text-xs font-bold mb-3 color-green';[span_92](start_span)[span_92](end_span)
                profitEl.innerText = "Чистая прибыль: +" + profit.toLocaleString() + " ₽ 📈";[span_93](start_span)[span_93](end_span)
            } else if (profit < 0) {[span_94](start_span)[span_94](end_span)
                profitEl.className = 'text-xs font-bold mb-3 color-red';[span_95](start_span)[span_95](end_span)
                profitEl.innerText = "Убыток: " + profit.toLocaleString() + " ₽ 📉";[span_96](start_span)[span_96](end_span)
            } else {
                profitEl.className = 'text-xs font-bold mb-3 color-amber';[span_97](start_span)[span_97](end_span)
                profitEl.innerText = "Сделка закрыта в ноль (0 ₽)";[span_98](start_span)[span_98](end_span)
            }
        } else {
            profitEl.style.display = 'none';[span_99](start_span)[span_99](end_span)
        }
    }
    const mod = document.getElementById('modalDealVerdict');[span_100](start_span)[span_100](end_span)
    if (mod) mod.classList.add('active');[span_101](start_span)[span_101](end_span)
}

function openPatchNotesModal() {[span_102](start_span)[span_102](end_span)
    const modal = document.getElementById('modalPatchNotes');[span_103](start_span)[span_103](end_span)
    if (modal) modal.classList.add('active');[span_104](start_span)[span_104](end_span)
    playSound('tick');[span_105](start_span)[span_105](end_span)
}

function dismissPatchNotesModal() {[span_106](start_span)[span_106](end_span)
    closeModal('modalPatchNotes');[span_107](start_span)[span_107](end_span)
    try {
        localStorage.setItem('perekup_last_seen_version', CURRENT_GAME_VERSION);[span_108](start_span)[span_108](end_span)
    } catch(e) {}
}

// ========================================================
// 2. ИГРОВОЙ STATE & ДЕФОЛТНЫЕ ДАННЫЕ
// ========================================================
const DEFAULT_STATE = {
    lang: 'ru',
    player: { 
        name: "Перекуп #777", avatarUrl: null, cash: 150000, stars: 15, connections: 1,[span_109](start_span)[span_109](end_span)
        expressTickets: 25, maxExpressTickets: 25, fuel: 100, level: 1, xp: 0, maxXp: 120,[span_110](start_span)[span_110](end_span)
        baseSlots: 2, vip: false, vipPro: false, lastFreeSpinDay: 0, lastFreeSuperSpinDay: 0,[span_111](start_span)[span_111](end_span)
        club: null, karma: 50, streetCred: 100, superSpinTickets: 1,[span_112](start_span)[span_112](end_span)
        stats: { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0, scandalsAvoided: 0 },[span_113](start_span)[span_113](end_span)
        hunger: 80, mood: 85, loanDebt: 0, day: 1, streakDay: 1, lastClaimedDay: 0,[span_114](start_span)[span_114](end_span)
        lastRealDayTimestamp: Date.now(),
        diet: 'shaurma', housingId: 'room', housingType: 'rent', ownedHouses: [], selectedStreetCarIndex: 0,[span_115](start_span)[span_115](end_span)
        lastBarnDay: 0, preSalesCount: 0, preSaleCooldownUntil: 0, policeImmunityDays: 0,[span_116](start_span)[span_116](end_span)
        hasRacingLicense: false, consecutiveRaces: 0, maxRacesBeforeRaid: 12,[span_117](start_span)[span_117](end_span)
        safeDeposit: 0, trafficFines: 0,[span_118](start_span)[span_118](end_span)
        tools: { gauge: false, gauge_pro: false, obd: false, obd_launch: false, endoscope: false, compressor: false, battery_tester: false },[span_119](start_span)[span_119](end_span)
        furniture: [],[span_120](start_span)[span_120](end_span)
        phoneMessages: [],[span_121](start_span)[span_121](end_span)
        dailyQuests: [],
        bankHistory: [],
        bankDeposits: []
    },
    garage: [], salesLot: [], contracts: [], plateCatalog: [],[span_122](start_span)[span_122](end_span)
    ownedPlates: ["В777ВВ 77"], registeredPlates: ["В777ВВ 77"],[span_123](start_span)[span_123](end_span)
    activeCategory: 'economy', marketFeed: [], p2pMode: 'cars', syndicateSubTab: 'contracts',[span_124](start_span)[span_124](end_span)
    myP2PListings: [], p2pMarketListings: [], businesses: [], confiscatedLot: null, blackMarketPlates: [],[span_125](start_span)[span_125](end_span)
    marketModifiers: { economy: 1, comfort: 1, premium: 1, all: 1 },[span_126](start_span)[span_126](end_span)
    lifeChatMessages: [], friendsList: [][span_127](start_span)[span_127](end_span)
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));[span_128](start_span)[span_128](end_span)
window.state = state;

function t(key) {
    let lang = state.lang || 'ru';
    if (typeof I18N_TRANSLATIONS !== 'undefined' && I18N_TRANSLATIONS[lang] && I18N_TRANSLATIONS[lang][key]) {
        return I18N_TRANSLATIONS[lang][key];
    }
    return key;
}
window.t = t;

// ========================================================
// 3. МУЛЬТИЯЗЫЧНОСТЬ (I18N)
// ========================================================
function toggleGameLanguage() {
    let nextLang = state.lang === 'ru' ? 'en' : 'ru';
    setGameLanguage(nextLang);
}

function setGameLanguage(lang) {
    state.lang = lang;
    applyLanguageToDOM();
    saveState();
    playSound('tick');
    tgHaptic('light');
    showToast(lang === 'ru' ? "Язык: Русский 🇷🇺" : "Language: English 🇬🇧");
}

function applyLanguageToDOM() {
    const lang = state.lang || 'ru';
    const dict = (typeof I18N_TRANSLATIONS !== 'undefined' && I18N_TRANSLATIONS[lang]) ? I18N_TRANSLATIONS[lang] : {};

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.innerHTML = dict[key];
    });

    const btnToggle = document.getElementById('btnLangToggle');
    if (btnToggle) btnToggle.innerText = lang === 'ru' ? "🌐 RU" : "🌐 EN";

    const btnRu = document.getElementById('btnLangRu');
    const btnEn = document.getElementById('btnLangEn');
    if (btnRu && btnEn) {
        btnRu.className = lang === 'ru' ? 'btn btn-cyan btn-auto btn-sm' : 'btn btn-dark btn-auto btn-sm';
        btnEn.className = lang === 'en' ? 'btn btn-cyan btn-auto btn-sm' : 'btn btn-dark btn-auto btn-sm';
    }
}

// ========================================================
// 4. ТРЕКЕР ЕЖЕДНЕВНЫХ ЗАДАНИЙ (ПЛАН ПЕРЕКУПА)
// ========================================================
function trackQuestProgress(actionType, count = 1) {
    if (!state.player || !Array.isArray(state.player.dailyQuests)) return;
    let questsUpdated = false;

    state.player.dailyQuests.forEach(q => {
        if (!q.done && (q.actionType === actionType || q.id === actionType)) {
            q.cur = Math.min(q.max || q.target || 1, (q.cur || 0) + count);
            questsUpdated = true;
            if (q.cur >= (q.max || q.target || 1)) {
                showToast(`🎯 Задание выполнено: «${q.text}»! Заберите награду в телефоне.`);
                tgHaptic('success');
            }
        }
    });

    if (questsUpdated) {
        saveState();
        if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.renderDailyQuestsWidget === 'function') {
            PhoneManager.renderDailyQuestsWidget();
        }
    }
}

function refreshDailyQuestsList() {
    if (typeof DAILY_QUESTS_POOL === 'undefined' || !Array.isArray(DAILY_QUESTS_POOL)) {
        state.player.dailyQuests = [
            { id: "q_inspect", text: "Осмотреть толщиномером 2 авто на рынке", cur: 0, max: 2, actionType: "gauge_check", reward: 35000, rewardXp: 40, done: false },
            { id: "q_race", text: "Выиграть заезд 402м в Стрите", cur: 0, max: 1, actionType: "win_drag", reward: 50000, rewardXp: 45, done: false },
            { id: "q_biz", text: "Собрать кассу с предприятий", cur: 0, max: 1, actionType: "collect_biz", reward: 25000, rewardXp: 30, done: false }
        ];
        return;
    }

    const shuffled = [...DAILY_QUESTS_POOL].sort(() => 0.5 - Math.random());
    state.player.dailyQuests = shuffled.slice(0, 3).map(q => ({
        id: q.id,
        text: q.text,
        cur: 0,
        max: q.target || 1,
        actionType: q.actionType,
        reward: q.reward,
        rewardXp: q.rewardXp || 35,
        done: false
    }));
}

// ========================================================
// 5. РАСЧЕТ ЗАТРАТ И СЛОТОВ
// ========================================================
function getMarketRefreshCost() {
    let lvl = state.player?.level || 1;
    return 150 + (lvl * 350);
}

function getGarageSlotCost() {
    let bs = state.player?.baseSlots || 2;[span_129](start_span)[span_129](end_span)
    let extraSlots = Math.max(0, bs - 2);[span_130](start_span)[span_130](end_span)
    return Math.round(250000 * Math.pow(1.65, extraSlots));[span_131](start_span)[span_131](end_span)
}

function getExpressTicketUpgradeCost() {
    let m = state.player?.maxExpressTickets || 25;[span_132](start_span)[span_132](end_span)
    let extra = Math.max(0, m - 25);[span_133](start_span)[span_133](end_span)
    const steps = Math.floor(extra / 25);[span_134](start_span)[span_134](end_span)
    return Math.round(50000 * Math.pow(1.5, steps));[span_135](start_span)[span_135](end_span)
}

function getTotalGarageSlots() {
    let slots = state.player?.baseSlots || 2;[span_136](start_span)[span_136](end_span)
    if (typeof HOUSING_LIST !== 'undefined' && Array.isArray(HOUSING_LIST)) {[span_137](start_span)[span_137](end_span)
        if (state.player?.housingId) {[span_138](start_span)[span_138](end_span)
            const house = HOUSING_LIST.find(h => h.id === state.player.housingId);[span_139](start_span)[span_139](end_span)
            if (house) slots += (house.slots || 0);[span_140](start_span)[span_140](end_span)
        }
        if (state.player?.ownedHouses && Array.isArray(state.player.ownedHouses)) {[span_141](start_span)[span_141](end_span)
            state.player.ownedHouses.forEach(hId => {[span_142](start_span)[span_142](end_span)
                const oh = HOUSING_LIST.find(h => h.id === hId);[span_143](start_span)[span_143](end_span)
                if (oh) slots += (oh.slots || 0);[span_144](start_span)[span_144](end_span)
            }); 
        }
    }
    return slots;[span_145](start_span)[span_145](end_span)
}

// ========================================================
// 6. ПРОВЕРКА ДОСТУПА К СИНДИКАТУ (7 УРОВЕНЬ + ЭКИПИРОВКА + 5 ЗВЕЗД)
// ========================================================
function checkSyndicateAccessDetails() {
    const lvl = state.player?.level || 1;
    const tools = state.player?.tools || {};
    const stars = state.player?.stars || 0;

    const hasLvl = lvl >= 7;
    const hasEndoscope = !!tools.endoscope;
    const hasGauge = !!(tools.gauge || tools.gauge_pro);
    const hasLaunch = !!tools.obd_launch;
    const hasStars = stars >= 5;

    const isFullAccess = hasLvl && hasEndoscope && hasGauge && hasLaunch && hasStars;

    return {
        isFullAccess,
        hasLvl,
        hasEndoscope,
        hasGauge,
        hasLaunch,
        hasStars,
        lvl,
        stars
    };
}

// ========================================================
// 7. TELEGRAM CLOUD STORAGE ЧАНКИНГ
// ========================================================
const CHUNK_SIZE = 2048;

function prepareStateForCloud() {
    const copy = JSON.parse(JSON.stringify(state));[span_146](start_span)[span_146](end_span)
    return JSON.stringify(copy);[span_147](start_span)[span_147](end_span)
}

function saveToTelegramCloud(jsonString, callback) {
    if (!window.Telegram?.WebApp?.CloudStorage) return;[span_148](start_span)[span_148](end_span)
    const tgCloud = window.Telegram.WebApp.CloudStorage;[span_149](start_span)[span_149](end_span)
    const totalChunks = Math.ceil(jsonString.length / CHUNK_SIZE);[span_150](start_span)[span_150](end_span)
    
    tgCloud.setItem(SAVE_KEY_PREFIX + tgUserId + "_meta", String(totalChunks), (err) => {[span_151](start_span)[span_151](end_span)
        if (err) {[span_152](start_span)[span_152](end_span)
            if (callback) callback(false);[span_153](start_span)[span_153](end_span)
            return;[span_154](start_span)[span_154](end_span)
        }
        let completed = 0;[span_155](start_span)[span_155](end_span)
        for (let i = 0; i < totalChunks; i++) {[span_156](start_span)[span_156](end_span)
            const chunk = jsonString.substr(i * CHUNK_SIZE, CHUNK_SIZE);[span_157](start_span)[span_157](end_span)
            tgCloud.setItem(SAVE_KEY_PREFIX + tgUserId + "_c" + i, chunk, (cErr) => {[span_158](start_span)[span_158](end_span)
                if (!cErr) completed++;[span_159](start_span)[span_159](end_span)
                if (completed === totalChunks && callback) {[span_160](start_span)[span_160](end_span)
                    callback(true);[span_161](start_span)[span_161](end_span)
                }
            });
        }
    });
}

function loadFromTelegramCloud(callback) {
    if (!window.Telegram?.WebApp?.CloudStorage) {[span_162](start_span)[span_162](end_span)
        callback(null);[span_163](start_span)[span_163](end_span)
        return;[span_164](start_span)[span_164](end_span)
    }
    const tgCloud = window.Telegram.WebApp.CloudStorage;[span_165](start_span)[span_165](end_span)
    tgCloud.getItem(SAVE_KEY_PREFIX + tgUserId + "_meta", (err, metaVal) => {[span_166](start_span)[span_166](end_span)
        if (err || !metaVal) {[span_167](start_span)[span_167](end_span)
            callback(null);[span_168](start_span)[span_168](end_span)
            return;[span_169](start_span)[span_169](end_span)
        }
        const totalChunks = parseInt(metaVal);[span_170](start_span)[span_170](end_span)
        if (isNaN(totalChunks) || totalChunks <= 0) {[span_171](start_span)[span_171](end_span)
            callback(null);[span_172](start_span)[span_172](end_span)
            return;[span_173](start_span)[span_173](end_span)
        }

        const keys = [];[span_174](start_span)[span_174](end_span)
        for (let i = 0; i < totalChunks; i++) {[span_175](start_span)[span_175](end_span)
            keys.push(SAVE_KEY_PREFIX + tgUserId + "_c" + i);[span_176](start_span)[span_176](end_span)
        }

        tgCloud.getItems(keys, (gErr, values) => {[span_177](start_span)[span_177](end_span)
            if (gErr || !values) {[span_178](start_span)[span_178](end_span)
                callback(null);[span_179](start_span)[span_179](end_span)
                return;[span_180](start_span)[span_180](end_span)
            }
            let fullStr = "";[span_181](start_span)[span_181](end_span)
            for (let i = 0; i < totalChunks; i++) {[span_182](start_span)[span_182](end_span)
                const k = SAVE_KEY_PREFIX + tgUserId + "_c" + i;[span_183](start_span)[span_183](end_span)
                if (!values[k]) {[span_184](start_span)[span_184](end_span)
                    callback(null);[span_185](start_span)[span_185](end_span)
                    return;[span_186](start_span)[span_186](end_span)
                }
                fullStr += values[k];[span_187](start_span)[span_187](end_span)
            }
            try {
                const parsed = JSON.parse(fullStr);[span_188](start_span)[span_188](end_span)
                callback(parsed);[span_189](start_span)[span_189](end_span)
            } catch(e) {
                callback(null);[span_190](start_span)[span_190](end_span)
            }
        });
    });
}

function initTelegramAuthAndStorage(callback) {
    let callbackCalled = false;[span_191](start_span)[span_191](end_span)
    const safeCallback = () => {[span_192](start_span)[span_192](end_span)
        if (!callbackCalled) {[span_193](start_span)[span_193](end_span)
            callbackCalled = true;[span_194](start_span)[span_194](end_span)
            if (callback) callback();[span_195](start_span)[span_195](end_span)
        }
    };

    const fallbackTimer = setTimeout(() => {[span_196](start_span)[span_196](end_span)
        if (!callbackCalled) {[span_197](start_span)[span_197](end_span)
            loadFromLocalStorage();[span_198](start_span)[span_198](end_span)
            safeCallback();[span_199](start_span)[span_199](end_span)
        }
    }, 800);

    try {
        if (window.Telegram?.WebApp) {[span_200](start_span)[span_200](end_span)
            const tg = window.Telegram.WebApp;[span_201](start_span)[span_201](end_span)
            tg.ready();[span_202](start_span)[span_202](end_span)
            tg.expand();[span_203](start_span)[span_203](end_span)

            if (tg.initDataUnsafe?.user) {[span_204](start_span)[span_204](end_span)
                tgUserData = tg.initDataUnsafe.user;[span_205](start_span)[span_205](end_span)
                tgUserId = String(tgUserData.id);[span_206](start_span)[span_206](end_span)
            }

            if (tg.CloudStorage && typeof tg.CloudStorage.getItem === 'function') {[span_207](start_span)[span_207](end_span)
                isCloudStorageAvailable = true;[span_208](start_span)[span_208](end_span)
                const statusEl = document.getElementById('cloudStorageStatus');[span_209](start_span)[span_209](end_span)
                if (statusEl) {[span_210](start_span)[span_210](end_span)
                    statusEl.innerText = "TG Cloud: Загрузка...";[span_211](start_span)[span_211](end_span)
                    statusEl.className = "tag-badge bg-tag-cyan";[span_212](start_span)[span_212](end_span)
                }

                loadFromTelegramCloud((cloudData) => {[span_213](start_span)[span_213](end_span)
                    clearTimeout(fallbackTimer);[span_214](start_span)[span_214](end_span)
                    if (cloudData) {[span_215](start_span)[span_215](end_span)
                        applyLoadedState(cloudData);[span_216](start_span)[span_216](end_span)
                        if (statusEl) {[span_217](start_span)[span_217](end_span)
                            statusEl.innerText = "TG Cloud: Синхронно";[span_218](start_span)[span_218](end_span)
                            statusEl.className = "tag-badge bg-tag-green";[span_219](start_span)[span_219](end_span)
                        }
                    } else {
                        loadFromLocalStorage();[span_220](start_span)[span_220](end_span)
                    }
                    safeCallback();[span_221](start_span)[span_221](end_span)
                });
                return;[span_222](start_span)[span_222](end_span)
            }
        }
    } catch(e) {
        console.error("TG Init error:", e);[span_223](start_span)[span_223](end_span)
    }

    clearTimeout(fallbackTimer);[span_224](start_span)[span_224](end_span)
    loadFromLocalStorage();[span_225](start_span)[span_225](end_span)
    safeCallback();[span_226](start_span)[span_226](end_span)
}

function loadFromLocalStorage() {
    try {
        let saved = localStorage.getItem("perekup_save_" + tgUserId);[span_227](start_span)[span_227](end_span)
        if (!saved) saved = localStorage.getItem('perekoop_sim_save_v105_release');[span_228](start_span)[span_228](end_span)
        if (saved) applyLoadedState(JSON.parse(saved));[span_229](start_span)[span_229](end_span)
        else applyLoadedState({});[span_230](start_span)[span_230](end_span)
    } catch(e) {}
}

function applyLoadedState(parsed) {
    if (!parsed) parsed = {};[span_231](start_span)[span_231](end_span)
    if (parsed.lang) state.lang = parsed.lang;
    if (parsed.player) {[span_232](start_span)[span_232](end_span)
        state.player = { ...DEFAULT_STATE.player, ...parsed.player };[span_233](start_span)[span_233](end_span)
        if (parsed.player.stats) state.player.stats = { ...DEFAULT_STATE.player.stats, ...parsed.player.stats };[span_234](start_span)[span_234](end_span)
        if (parsed.player.tools) state.player.tools = { ...DEFAULT_STATE.player.tools, ...parsed.player.tools };[span_235](start_span)[span_235](end_span)
        if (Array.isArray(parsed.player.phoneMessages)) state.player.phoneMessages = parsed.player.phoneMessages;[span_236](start_span)[span_236](end_span)
        if (Array.isArray(parsed.player.dailyQuests)) state.player.dailyQuests = parsed.player.dailyQuests;
        if (Array.isArray(parsed.player.bankHistory)) state.player.bankHistory = parsed.player.bankHistory;
        if (Array.isArray(parsed.player.bankDeposits)) state.player.bankDeposits = parsed.player.bankDeposits;
    }
    if (Array.isArray(parsed.garage)) state.garage = parsed.garage;[span_237](start_span)[span_237](end_span)
    if (Array.isArray(parsed.salesLot)) state.salesLot = parsed.salesLot;[span_238](start_span)[span_238](end_span)
    if (Array.isArray(parsed.contracts)) state.contracts = parsed.contracts;[span_239](start_span)[span_239](end_span)
    if (Array.isArray(parsed.ownedPlates)) state.ownedPlates = parsed.ownedPlates;[span_240](start_span)[span_240](end_span)
    if (Array.isArray(parsed.registeredPlates)) state.registeredPlates = parsed.registeredPlates;[span_241](start_span)[span_241](end_span)
    if (Array.isArray(parsed.businesses)) state.businesses = parsed.businesses;[span_242](start_span)[span_242](end_span)
    if (parsed.marketModifiers) state.marketModifiers = parsed.marketModifiers;[span_243](start_span)[span_243](end_span)
    if (Array.isArray(parsed.myP2PListings)) state.myP2PListings = parsed.myP2PListings;[span_244](start_span)[span_244](end_span)
    if (Array.isArray(parsed.p2pMarketListings)) state.p2pMarketListings = parsed.p2pMarketListings;[span_245](start_span)[span_245](end_span)
    if (parsed.confiscatedLot) state.confiscatedLot = parsed.confiscatedLot;[span_246](start_span)[span_246](end_span)
    if (Array.isArray(parsed.marketFeed)) state.marketFeed = parsed.marketFeed;[span_247](start_span)[span_247](end_span)
    if (Array.isArray(parsed.blackMarketPlates)) state.blackMarketPlates = parsed.blackMarketPlates;[span_248](start_span)[span_248](end_span)
    
    if (tgUserData) {[span_249](start_span)[span_249](end_span)
        let names = [];[span_250](start_span)[span_250](end_span)
        if (tgUserData.first_name) names.push(tgUserData.first_name);[span_251](start_span)[span_251](end_span)
        if (tgUserData.last_name) names.push(tgUserData.last_name);[span_252](start_span)[span_252](end_span)
        const fullName = names.join(' ').trim();[span_253](start_span)[span_253](end_span)

        if (fullName) state.player.name = fullName;[span_254](start_span)[span_254](end_span)
        else if (tgUserData.username) state.player.name = "@" + tgUserData.username;[span_255](start_span)[span_255](end_span)
        if (tgUserData.photo_url) state.player.avatarUrl = tgUserData.photo_url;[span_256](start_span)[span_256](end_span)
    }

    sanitizeState();[span_257](start_span)[span_257](end_span)
}

function sanitizeState() {
    if (!state.player) state.player = JSON.parse(JSON.stringify(DEFAULT_STATE.player));
    if (!state.player.baseSlots || state.player.baseSlots < 2) state.player.baseSlots = 2;[span_258](start_span)[span_258](end_span)
    if (!state.player.maxExpressTickets) state.player.maxExpressTickets = 25;[span_259](start_span)[span_259](end_span)
    if (typeof state.player.expressTickets !== 'number') state.player.expressTickets = state.player.maxExpressTickets;[span_260](start_span)[span_260](end_span)
    if (typeof state.player.policeImmunityDays !== 'number') state.player.policeImmunityDays = 0;[span_261](start_span)[span_261](end_span)
    if (typeof state.player.consecutiveRaces !== 'number') state.player.consecutiveRaces = 0;[span_262](start_span)[span_262](end_span)
    if (typeof state.player.maxRacesBeforeRaid !== 'number') state.player.maxRacesBeforeRaid = Math.floor(10 + Math.random() * 5);[span_263](start_span)[span_263](end_span)
    if (typeof state.player.streetCred !== 'number') state.player.streetCred = 100;[span_264](start_span)[span_264](end_span)
    if (typeof state.player.superSpinTickets !== 'number') state.player.superSpinTickets = 1;
    if (typeof state.player.lastFreeSuperSpinDay !== 'number') state.player.lastFreeSuperSpinDay = 0;
    if (!Array.isArray(state.player.ownedHouses)) state.player.ownedHouses = [];[span_265](start_span)[span_265](end_span)
    if (!Array.isArray(state.player.furniture)) state.player.furniture = [];[span_266](start_span)[span_266](end_span)
    if (!Array.isArray(state.player.phoneMessages)) state.player.phoneMessages = [];[span_267](start_span)[span_267](end_span)
    if (!Array.isArray(state.player.bankHistory)) state.player.bankHistory = [];
    if (!Array.isArray(state.player.bankDeposits)) state.player.bankDeposits = [];
    if (!Array.isArray(state.registeredPlates)) state.registeredPlates = ["В777ВВ 77"];[span_268](start_span)[span_268](end_span)
    if (!Array.isArray(state.p2pMarketListings)) state.p2pMarketListings = [];[span_269](start_span)[span_269](end_span)
    if (typeof state.player.cash !== 'number' || state.player.cash < 0) state.player.cash = 150000;[span_270](start_span)[span_270](end_span)
    if (typeof state.player.loanDebt !== 'number' || state.player.loanDebt < 0) state.player.loanDebt = 0;[span_271](start_span)[span_271](end_span)
    if (typeof state.player.safeDeposit !== 'number') state.player.safeDeposit = 0;[span_272](start_span)[span_272](end_span)
    if (typeof state.player.fuel !== 'number') state.player.fuel = 100;[span_273](start_span)[span_273](end_span)
    if (typeof state.player.karma !== 'number') state.player.karma = 50;[span_274](start_span)[span_274](end_span)
    if (typeof state.player.lastRealDayTimestamp !== 'number') state.player.lastRealDayTimestamp = Date.now();
    
    if (!state.player.dailyQuests || state.player.dailyQuests.length === 0) {
        refreshDailyQuestsList();
    }

    if (!state.player.tools) {[span_275](start_span)[span_275](end_span)
        state.player.tools = { gauge: false, gauge_pro: false, obd: false, obd_launch: false, endoscope: false, compressor: false, battery_tester: false };[span_276](start_span)[span_276](end_span)
    }
    
    if (state.businesses && typeof BUSINESS_DATA !== 'undefined') {[span_277](start_span)[span_277](end_span)
        state.businesses.forEach(b => {[span_278](start_span)[span_278](end_span)
            const template = BUSINESS_DATA.find(d => d.id === b.id);[span_279](start_span)[span_279](end_span)
            if (template) {[span_280](start_span)[span_280](end_span)
                b.img = template.img;[span_281](start_span)[span_281](end_span)
                if (!b.perk) b.perk = template.perk;[span_282](start_span)[span_282](end_span)
            }
        });
    }

    if (state.garage && Array.isArray(state.garage)) {[span_283](start_span)[span_283](end_span)
        state.garage.forEach(car => {[span_284](start_span)[span_284](end_span)
            if (car && !car.tuning) {[span_285](start_span)[span_285](end_span)
                car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 };[span_286](start_span)[span_286](end_span)
            }
            if (car && car.insurance === undefined) car.insurance = null;[span_287](start_span)[span_287](end_span)
            if (car && car.isPersonal === undefined) car.isPersonal = false;[span_288](start_span)[span_288](end_span)
            if (car && car.isRegisteredOnPlayer === undefined) car.isRegisteredOnPlayer = true;
            if (car && car.ownershipDays === undefined) car.ownershipDays = 0;
            if (car && car.engineTemp === undefined) car.engineTemp = 90;
            if (car && car.tireWear === undefined) car.tireWear = 100;

            if (typeof recalculateCarMarketValue === 'function') {[span_289](start_span)[span_289](end_span)
                recalculateCarMarketValue(car);[span_290](start_span)[span_290](end_span)
            }
        });
    }

    if (!state.businesses || state.businesses.length === 0) {[span_291](start_span)[span_291](end_span)
        if (typeof BUSINESS_DATA !== 'undefined') {[span_292](start_span)[span_292](end_span)
            state.businesses = JSON.parse(JSON.stringify(BUSINESS_DATA));[span_293](start_span)[span_293](end_span)
        }
    }

    // Если в ленте нет ни одного доступного лота — принудительно очищаем для перезапуска генератора
    if (!Array.isArray(state.marketFeed) || state.marketFeed.length === 0 || !state.marketFeed.some(c => c && !c.unavailable)) {
        state.marketFeed = [];
    }
}

function saveState() {
    try {
        const fullJson = JSON.stringify(state);[span_294](start_span)[span_294](end_span)
        localStorage.setItem("perekup_save_" + tgUserId, fullJson);[span_295](start_span)[span_295](end_span)

        if (isCloudStorageAvailable) {[span_296](start_span)[span_296](end_span)
            if (cloudSaveDebounceTimer) clearTimeout(cloudSaveDebounceTimer);[span_297](start_span)[span_297](end_span)
            cloudSaveDebounceTimer = setTimeout(() => {[span_298](start_span)[span_298](end_span)
                const cloudJson = prepareStateForCloud();[span_299](start_span)[span_299](end_span)
                saveToTelegramCloud(cloudJson, (success) => {[span_300](start_span)[span_300](end_span)
                    const statusEl = document.getElementById('cloudStorageStatus');[span_301](start_span)[span_301](end_span)
                    if (statusEl) {[span_302](start_span)[span_302](end_span)
                        statusEl.innerText = success ? "TG Cloud: Синхронно" : "TG Cloud: Ошибка";[span_303](start_span)[span_303](end_span)
                        statusEl.className = success ? "tag-badge bg-tag-green" : "tag-badge bg-tag-red";[span_304](start_span)[span_304](end_span)
                    }
                });
            }, 1800);[span_305](start_span)[span_305](end_span)
        }

        if (window.FB_Bridge && typeof window.FB_Bridge.CloudSave?.pushSave === 'function') {[span_306](start_span)[span_306](end_span)
            window.FB_Bridge.CloudSave.pushSave(tgUserId, state);[span_307](start_span)[span_307](end_span)
            if (state.player.stats?.totalNetProfit > 0) {[span_308](start_span)[span_308](end_span)
                window.FB_Bridge.Leaderboard.updateMyRank(tgUserId, state.player.name, state.player.stats.totalNetProfit, state.player.level);[span_309](start_span)[span_309](end_span)
            }
        }
    } catch(e) {}
    updateHeaderUI();[span_310](start_span)[span_310](end_span)
}

function resetGameData() {
    if (!confirm("Внимание! Вы уверены, что хотите полностью стереть весь прогресс, гараж, бизнес и начать заново? Это действие необратимо!")) {[span_311](start_span)[span_311](end_span)
        return;[span_312](start_span)[span_312](end_span)
    }

    try {
        localStorage.removeItem("perekup_save_" + tgUserId);[span_313](start_span)[span_313](end_span)
        localStorage.removeItem('perekoop_sim_save_v105_release');[span_314](start_span)[span_314](end_span)
        localStorage.removeItem('perekup_last_seen_version');[span_315](start_span)[span_315](end_span)

        const cleanState = JSON.parse(JSON.stringify(DEFAULT_STATE));[span_316](start_span)[span_316](end_span)
        const cleanJson = JSON.stringify(cleanState);[span_317](start_span)[span_317](end_span)

        if (isCloudStorageAvailable && window.Telegram?.WebApp?.CloudStorage) {[span_318](start_span)[span_318](end_span)
            saveToTelegramCloud(cleanJson, () => {[span_319](start_span)[span_319](end_span)
                console.log("TG Cloud очищен.");[span_320](start_span)[span_320](end_span)
            });
        }

        if (window.FB_Bridge && typeof window.FB_Bridge.CloudSave?.pushSave === 'function') {[span_321](start_span)[span_321](end_span)
            window.FB_Bridge.CloudSave.pushSave(tgUserId, cleanState);[span_322](start_span)[span_322](end_span)
        }

        tgHaptic('warning');[span_323](start_span)[span_323](end_span)
        showToast("Прогресс сброшен. Перезагрузка...");[span_324](start_span)[span_324](end_span)
        setTimeout(() => {[span_325](start_span)[span_325](end_span)
            location.reload();[span_326](start_span)[span_326](end_span)
        }, 600);[span_327](start_span)[span_327](end_span)
    } catch(e) {
        location.reload();[span_328](start_span)[span_328](end_span)
    }
}

function syncCloudStorageManual() {
    if (!isCloudStorageAvailable) return showToast("Telegram Cloud недоступен в браузере!");[span_329](start_span)[span_329](end_span)
    const cloudJson = prepareStateForCloud();[span_330](start_span)[span_330](end_span)
    saveToTelegramCloud(cloudJson, (success) => {[span_331](start_span)[span_331](end_span)
        if (success) {[span_332](start_span)[span_332](end_span)
            playSound('win'); tgHaptic('success');[span_333](start_span)[span_333](end_span)
            showToast("Облако Telegram успешно синхронизировано!");[span_334](start_span)[span_334](end_span)
        } else {
            tgHaptic('error');[span_335](start_span)[span_335](end_span)
            showToast("Ошибка сохранения в облако Telegram.");[span_336](start_span)[span_336](end_span)
        }
    });
}

function openSaveManagerModal() {[span_337](start_span)[span_337](end_span)
    const area = document.getElementById('saveExportArea');[span_338](start_span)[span_338](end_span)
    if (area) {[span_339](start_span)[span_339](end_span)
        try { area.value = btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }[span_340](start_span)[span_340](end_span)
        catch(e) { area.value = JSON.stringify(state); }[span_341](start_span)[span_341](end_span)
    }
    const modal = document.getElementById('modalSaveManager');[span_342](start_span)[span_342](end_span)
    if (modal) modal.classList.add('active');[span_343](start_span)[span_343](end_span)
    playSound('tick');[span_344](start_span)[span_344](end_span)
}

function exportSaveCodeAction() {[span_345](start_span)[span_345](end_span)
    const area = document.getElementById('saveExportArea');[span_346](start_span)[span_346](end_span)
    if (!area || !area.value) return;[span_347](start_span)[span_347](end_span)
    if (navigator.clipboard) {[span_348](start_span)[span_348](end_span)
        navigator.clipboard.writeText(area.value).then(() => {[span_349](start_span)[span_349](end_span)
            showToast("Код сейва скопирован!"); tgHaptic('success'); playSound('win');[span_350](start_span)[span_350](end_span)
        }).catch(() => { area.select(); document.execCommand('copy'); showToast("Код скопирован!"); });[span_351](start_span)[span_351](end_span)
    } else {
        area.select(); document.execCommand('copy'); showToast("Код скопирован!");[span_352](start_span)[span_352](end_span)
    }
}

function importSaveCodeAction() {[span_353](start_span)[span_353](end_span)
    const area = document.getElementById('saveExportArea');[span_354](start_span)[span_354](end_span)
    if (!area || !area.value.trim()) return showToast("Вставьте код сохранения!");[span_355](start_span)[span_355](end_span)
    try {
        let rawStr = area.value.trim();[span_356](start_span)[span_356](end_span)
        let jsonStr = "";[span_357](start_span)[span_357](end_span)
        try { jsonStr = decodeURIComponent(escape(atob(rawStr))); }[span_358](start_span)[span_358](end_span)
        catch(e) { jsonStr = rawStr; }[span_359](start_span)[span_359](end_span)

        const parsed = JSON.parse(jsonStr);[span_360](start_span)[span_360](end_span)
        if (!parsed.player) throw new Error();[span_361](start_span)[span_361](end_span)
        applyLoadedState(parsed);[span_362](start_span)[span_362](end_span)
        saveState();[span_363](start_span)[span_363](end_span)
        closeModal('modalSaveManager');[span_364](start_span)[span_364](end_span)
        location.reload();[span_365](start_span)[span_365](end_span)
    } catch(err) {
        tgHaptic('error'); showToast("Некорректный код сейва!");[span_366](start_span)[span_366](end_span)
    }
}

// ========================================================
// 8. ПРИВЯЗКА К СМЕНЕ СУТОК В РЕАЛЬНОМ ВРЕМЕНИ (ПОЛНОЧЬ 00:00)
// ========================================================
function checkRealTimeDayChange() {
    const now = new Date();
    const lastDate = new Date(state.player.lastRealDayTimestamp || Date.now());

    const isDifferentDay = (
        now.getFullYear() !== lastDate.getFullYear() ||
        now.getMonth() !== lastDate.getMonth() ||
        now.getDate() !== lastDate.getDate()
    );

    if (isDifferentDay) {
        executeDayCycleMidnight(now);
    }
}

function executeDayCycleMidnight(currentDateObj) {
    state.player.day = (state.player.day || 1) + 1;
    state.player.lastRealDayTimestamp = currentDateObj.getTime();
    state.player.expressTickets = state.player.maxExpressTickets || 25;
    state.player.consecutiveRaces = 0;

    let curId = state.player?.housingId || 'room';
    let isOwn = state.player?.ownedHouses?.includes(curId);
    if (!isOwn && typeof HOUSING_LIST !== 'undefined' && Array.isArray(HOUSING_LIST)) {
        const h = HOUSING_LIST.find(item => item.id === curId);
        let rentVal = h ? (h.rent || 2500) : 2500;
        state.player.cash = Math.max(0, (state.player.cash || 0) - rentVal);
    }

    if (state.player.furniture?.includes('home_ps5')) {
        state.player.mood = Math.min(100, (state.player.mood || 85) + 25);
    }
    let hasPersonal = state.garage?.some(c => c && c.isPersonal);
    if (hasPersonal) {
        state.player.mood = Math.min(100, (state.player.mood || 85) + 15);
    }

    if (state.player.policeImmunityDays > 0) {
        state.player.policeImmunityDays -= 1;
    }

    if (state.player.safeDeposit > 0) {
        let percentEarned = Math.round(state.player.safeDeposit * 0.03);
        state.player.safeDeposit += percentEarned;
        spawnFloatingReward(`+${percentEarned.toLocaleString()} ₽ в сейфе`);

        if (state.player.phoneMessages) {
            state.player.phoneMessages.unshift({
                id: "sms_bank_" + Date.now(),
                sender: "💳 Во-Банк Онлайн",
                avatar: "🏦",
                preview: `Капитализация сейфа: +${percentEarned.toLocaleString()} ₽!`,
                time: "00:01",
                unread: true,
                chatHistory: [
                    { from: "them", text: `Начислен ежедневный процент на сейф перекупа: +${percentEarned.toLocaleString()} ₽. Баланс сейфа: ${state.player.safeDeposit.toLocaleString()} ₽.` }
                ]
            });
        }
    }

    if (Array.isArray(state.player.bankDeposits)) {
        state.player.bankDeposits.forEach(dep => {
            if (dep.active) {
                let gain = Math.round(dep.amount * (dep.dailyRate || 0.02));
                dep.amount += gain;
            }
        });
    }

    if (state.businesses) {
        state.businesses.forEach(b => {
            if (b && b.level > 0) {
                if (b.stock > 0) {
                    b.stock = Math.max(0, b.stock - 20);
                    let inc = b.income || 0;
                    b.stored = (b.stored || 0) + (inc * b.level);
                }
            }
        });
    }

    if (state.garage) {
        state.garage.forEach(car => {
            if (car) {
                car.ownershipDays = (car.ownershipDays || 0) + 1;
                car.engineTemp = 90;
            }
        });
    }

    state.player.hunger = Math.max(10, (state.player.hunger || 80) - 25);
    state.player.mood = Math.max(10, (state.player.mood || 85) - 15);
    refreshDailyQuestsList();

    saveState();
    updateHeaderUI();
    if (typeof PhoneManager !== 'undefined') {
        PhoneManager.renderDailyQuestsWidget();
        PhoneManager.renderBusinessWidget();
        PhoneManager.updateUnreadBadge();
    }
    showToast("Наступил новый календарный день 🌙 Суточные лимиты и начисления обновлены!");
    playSound('win');
    tgHaptic('success');
}

// ========================================================
// 9. UI И РЕСУРСЫ
// ========================================================
function updateHeaderUI() {
    let cash = state.player?.cash || 0;[span_367](start_span)[span_367](end_span)
    let stars = state.player?.stars || 0;[span_368](start_span)[span_368](end_span)
    let fuel = state.player?.fuel !== undefined ? state.player.fuel : 100;[span_369](start_span)[span_369](end_span)
    let tck = state.player?.expressTickets || 0;[span_370](start_span)[span_370](end_span)
    let mTck = state.player?.maxExpressTickets || 25;[span_371](start_span)[span_371](end_span)
    let pName = state.player?.name || "Перекуп #777";[span_372](start_span)[span_372](end_span)
    let lvl = state.player?.level || 1;[span_373](start_span)[span_373](end_span)
    let conn = state.player?.connections || 0;[span_374](start_span)[span_374](end_span)
    let karma = Math.max(0, Math.min(100, state.player?.karma !== undefined ? state.player.karma : 50));[span_375](start_span)[span_375](end_span)

    setTxt('cashAmount', cash.toLocaleString());[span_376](start_span)[span_376](end_span)
    setTxt('starsAmount', stars);[span_377](start_span)[span_377](end_span)
    setTxt('fuelAmount', fuel);[span_378](start_span)[span_378](end_span)
    setTxt('ticketsAmount', tck + "/" + mTck);[span_379](start_span)[span_379](end_span)
    setTxt('playerName', pName);[span_380](start_span)[span_380](end_span)
    setTxt('playerLvl', "Ур. " + lvl);[span_381](start_span)[span_381](end_span)
    setTxt('connectionsText', conn);[span_382](start_span)[span_382](end_span)
    setTxt('karmaText', karma);[span_383](start_span)[span_383](end_span)
    
    const pPhoto = document.getElementById('playerTgPhoto');[span_384](start_span)[span_384](end_span)
    const dIcon = document.getElementById('defaultAvatarIcon');[span_385](start_span)[span_385](end_span)
    if (state.player?.avatarUrl) {[span_386](start_span)[span_386](end_span)
        if (pPhoto) { pPhoto.src = state.player.avatarUrl; pPhoto.style.display = 'block'; }[span_387](start_span)[span_387](end_span)
        if (dIcon) dIcon.style.display = 'none';[span_388](start_span)[span_388](end_span)
    } else { 
        if (pPhoto) pPhoto.style.display = 'none';[span_389](start_span)[span_389](end_span)
        if (dIcon) dIcon.style.display = 'block';[span_390](start_span)[span_390](end_span)
    }
    
    const fill = document.getElementById('xpBar');[span_391](start_span)[span_391](end_span)
    if (fill) {[span_392](start_span)[span_392](end_span)
        let xp = state.player?.xp || 0;[span_393](start_span)[span_393](end_span)
        let maxXp = state.player?.maxXp || 120;[span_394](start_span)[span_394](end_span)
        fill.style.width = Math.min(100, (xp / maxXp) * 100) + "%";[span_395](start_span)[span_395](end_span)
    }
    
    let hng = state.player?.hunger || 80;[span_396](start_span)[span_396](end_span)
    setTxt('hungerText', hng + "%");[span_397](start_span)[span_397](end_span)
    const hFill = document.getElementById('hungerFill');[span_398](start_span)[span_398](end_span)
    if (hFill) hFill.style.width = hng + "%";[span_399](start_span)[span_399](end_span)

    let md = state.player?.mood || 85;[span_400](start_span)[span_400](end_span)
    setTxt('moodText', md + "%");[span_401](start_span)[span_401](end_span)
    const mFill = document.getElementById('moodFill');[span_402](start_span)[span_402](end_span)
    if (mFill) mFill.style.width = md + "%";[span_403](start_span)[span_403](end_span)

    const vipBadge = document.getElementById('vipBadge');[span_404](start_span)[span_404](end_span)
    if (vipBadge) vipBadge.style.display = state.player?.vipPro ? 'block' : 'none';[span_405](start_span)[span_405](end_span)

    let gLen = state.garage ? state.garage.length : 0;[span_406](start_span)[span_406](end_span)
    setTxt('garageHeaderSlots', gLen + "/" + getTotalGarageSlots());[span_407](start_span)[span_407](end_span)
    
    const slotCost = getGarageSlotCost();[span_408](start_span)[span_408](end_span)
    const btnSlot = document.getElementById('btnBuyGarageSlot');[span_409](start_span)[span_409](end_span)
    if (btnSlot) btnSlot.innerText = "+1 Бокс (" + (slotCost / 1000).toFixed(0) + "k ₽)";[span_410](start_span)[span_410](end_span)

    updateRaceHeatBadge();[span_411](start_span)[span_411](end_span)
    if (typeof PhoneManager !== 'undefined') PhoneManager.updateUnreadBadge();[span_412](start_span)[span_412](end_span)
}

function updateRaceHeatBadge() {[span_413](start_span)[span_413](end_span)
    const heatBadge = document.getElementById('raceHeatBadge');[span_414](start_span)[span_414](end_span)
    if (!heatBadge) return;[span_415](start_span)[span_415](end_span)
    const curRaces = state.player?.consecutiveRaces || 0;[span_416](start_span)[span_416](end_span)
    const maxRaces = state.player?.maxRacesBeforeRaid || 12;[span_417](start_span)[span_417](end_span)
    heatBadge.innerText = "Внимание ДПС: " + curRaces + "/" + maxRaces;[span_418](start_span)[span_418](end_span)
    if (curRaces >= maxRaces - 2) heatBadge.className = "tag-badge bg-tag-red";[span_419](start_span)[span_419](end_span)
    else if (curRaces >= Math.floor(maxRaces / 2)) heatBadge.className = "tag-badge bg-tag-amber";[span_420](start_span)[span_420](end_span)
    else heatBadge.className = "tag-badge bg-tag-green";[span_421](start_span)[span_421](end_span)
}

function updateLevelGatesUI() {[span_422](start_span)[span_422](end_span)
    let lvl = state.player?.level || 1;[span_423](start_span)[span_423](end_span)
    const gates = [[span_424](start_span)[span_424](end_span)
        { id: 'moto', lockId: 'lock-moto', minLvl: 5 },[span_425](start_span)[span_425](end_span)
        { id: 'atv', lockId: 'lock-atv', minLvl: 8 },[span_426](start_span)[span_426](end_span)
        { id: 'comfort', lockId: 'lock-comfort', minLvl: 30 },[span_427](start_span)[span_427](end_span)
        { id: 'premium', lockId: 'lock-premium', minLvl: 30 },[span_428](start_span)[span_428](end_span)
        { id: 'hyper', lockId: 'lock-hyper', minLvl: 50 },[span_429](start_span)[span_429](end_span)
        { id: 'truck', lockId: 'lock-truck', minLvl: 50 },[span_430](start_span)[span_430](end_span)
        { id: 'yacht', lockId: 'lock-yacht', minLvl: 100 }[span_431](start_span)[span_431](end_span)
    ];[span_432](start_span)[span_432](end_span)

    gates.forEach(g => {[span_433](start_span)[span_433](end_span)
        const btn = document.getElementById("catBtn-" + g.id);[span_434](start_span)[span_434](end_span)
        const sub = document.getElementById(g.lockId);[span_435](start_span)[span_435](end_span)
        if (btn && sub) {[span_436](start_span)[span_436](end_span)
            if (lvl >= g.minLvl) {[span_437](start_span)[span_437](end_span)
                btn.classList.remove('locked');[span_438](start_span)[span_438](end_span)
                sub.innerHTML = "Доступен";[span_439](start_span)[span_439](end_span)
                sub.style.color = "var(--green)";[span_440](start_span)[span_440](end_span)
            } else {
                btn.classList.add('locked');[span_441](start_span)[span_441](end_span)
                sub.innerHTML = "<i class='fa-solid fa-lock'></i> " + g.minLvl + " ур";[span_442](start_span)[span_442](end_span)
                sub.style.color = "#f87171";[span_443](start_span)[span_443](end_span)
            }
        }
    });
}

function addXp(amount) {[span_444](start_span)[span_444](end_span)
    state.player.xp += amount;[span_445](start_span)[span_445](end_span)
    if (state.player.xp >= state.player.maxXp) {[span_446](start_span)[span_446](end_span)
        state.player.xp -= state.player.maxXp;[span_447](start_span)[span_447](end_span)
        state.player.level += 1;[span_448](start_span)[span_448](end_span)
        state.player.maxXp = Math.round(state.player.maxXp * 1.35);[span_449](start_span)[span_449](end_span)
        openVerdictModal("Новый уровень!", "Вы достигли " + state.player.level + " уровня авторитета!", true);[span_450](start_span)[span_450](end_span)
    }
    updateLevelGatesUI();[span_451](start_span)[span_451](end_span)
    saveState();[span_452](start_span)[span_452](end_span)
}

function adjustResource(type, delta) {[span_453](start_span)[span_453](end_span)
    if (!state.player) return;[span_454](start_span)[span_454](end_span)
    if (type === 'cash') {[span_455](start_span)[span_455](end_span)
        state.player.cash = Math.max(0, (state.player.cash || 0) + delta);[span_456](start_span)[span_456](end_span)
        showToast((delta > 0 ? "+" : "") + delta.toLocaleString() + " ₽");[span_457](start_span)[span_457](end_span)
    } else if (type === 'level') {[span_458](start_span)[span_458](end_span)
        state.player.level = Math.max(1, Math.min(100, (state.player.level || 1) + delta));[span_459](start_span)[span_459](end_span)
        updateLevelGatesUI();[span_460](start_span)[span_460](end_span)
        showToast((delta > 0 ? "+" : "") + delta + " Ур");[span_461](start_span)[span_461](end_span)
    } else if (type === 'stars') {[span_462](start_span)[span_462](end_span)
        state.player.stars = Math.max(0, (state.player.stars || 0) + delta);[span_463](start_span)[span_463](end_span)
        showToast((delta > 0 ? "+" : "") + delta + " Stars ⭐");[span_464](start_span)[span_464](end_span)
    } else if (type === 'tickets') {[span_465](start_span)[span_465](end_span)
        let max = state.player.maxExpressTickets || 25;[span_466](start_span)[span_466](end_span)
        state.player.expressTickets = Math.max(0, Math.min(max, (state.player.expressTickets || 0) + delta));[span_467](start_span)[span_467](end_span)
        showToast((delta > 0 ? "+" : "") + delta + " Талонов 🎟️");[span_468](start_span)[span_468](end_span)
    } else if (type === 'connections') {[span_469](start_span)[span_469](end_span)
        state.player.connections = Math.max(0, (state.player.connections || 0) + delta);[span_470](start_span)[span_470](end_span)
        showToast((delta > 0 ? "+" : "") + delta + " Связей 🤝");[span_471](start_span)[span_471](end_span)
    }
    saveState();[span_472](start_span)[span_472](end_span)
    updateHeaderUI();[span_473](start_span)[span_473](end_span)
    renderProfileAnalytics();[span_474](start_span)[span_474](end_span)
}

function openDailyBonusModal() {[span_475](start_span)[span_475](end_span)
    const grid = document.getElementById('dailyBonusGrid');[span_476](start_span)[span_476](end_span)
    if (!grid || typeof DAILY_REWARDS_CONFIG === 'undefined') return;[span_477](start_span)[span_477](end_span)
    let sDay = state.player.streakDay || 1;[span_478](start_span)[span_478](end_span)
    let html = "";[span_479](start_span)[span_479](end_span)
    DAILY_REWARDS_CONFIG.forEach(r => {[span_480](start_span)[span_480](end_span)
        let isClaimed = sDay > r.day;[span_481](start_span)[span_481](end_span)
        let isCurrent = sDay === r.day;[span_482](start_span)[span_482](end_span)
        let cName = "daily-streak-day" + (isClaimed ? " claimed" : "") + (isCurrent ? " current" : "");[span_483](start_span)[span_483](end_span)
        let sym = isClaimed ? "✓" : (isCurrent ? "★" : "🔒");[span_484](start_span)[span_484](end_span)
        html += `<div class='${cName}'><div class='font-bold text-xs'>День ${r.day}</div><div class='sub-label my-1'>${r.title}</div><div>${sym}</div></div>`;[span_485](start_span)[span_485](end_span)
    });
    grid.innerHTML = html;[span_486](start_span)[span_486](end_span)

    const claimBtn = document.getElementById('btnClaimDaily');[span_487](start_span)[span_487](end_span)
    if (claimBtn) {[span_488](start_span)[span_488](end_span)
        let last = state.player.lastClaimedDay || 0;[span_489](start_span)[span_489](end_span)
        let pDay = state.player.day || 1;[span_490](start_span)[span_490](end_span)
        let canClaim = last < pDay;[span_491](start_span)[span_491](end_span)
        claimBtn.disabled = !canClaim;[span_492](start_span)[span_492](end_span)
        claimBtn.innerText = canClaim ? "Забрать награду" : "Уже получено сегодня";[span_493](start_span)[span_493](end_span)
    }
    const mod = document.getElementById('modalDailyBonus');[span_494](start_span)[span_494](end_span)
    if (mod) mod.classList.add('active');[span_495](start_span)[span_495](end_span)
}

function claimDailyReward() {[span_496](start_span)[span_496](end_span)
    let last = state.player.lastClaimedDay || 0;[span_497](start_span)[span_497](end_span)
    let pDay = state.player.day || 1;[span_498](start_span)[span_498](end_span)
    if (last >= pDay) return showToast("Награда уже получена сегодня!");[span_499](start_span)[span_499](end_span)

    let sDay = state.player.streakDay || 1;[span_500](start_span)[span_500](end_span)
    let currentReward = DAILY_REWARDS_CONFIG.find(r => r.day === sDay) || DAILY_REWARDS_CONFIG[0];[span_501](start_span)[span_501](end_span)
    const r = currentReward.reward;[span_502](start_span)[span_502](end_span)
    if (r.cash) state.player.cash += r.cash;[span_503](start_span)[span_503](end_span)
    if (r.fuel) state.player.fuel = Math.min(100, (state.player.fuel || 0) + r.fuel);[span_504](start_span)[span_504](end_span)
    if (r.connections) state.player.connections = (state.player.connections || 0) + r.connections;[span_505](start_span)[span_505](end_span)
    if (r.stars) state.player.stars += r.stars;[span_506](start_span)[span_506](end_span)
    if (r.specialPlate) {[span_507](start_span)[span_507](end_span)
        if (!state.ownedPlates) state.ownedPlates = [];[span_508](start_span)[span_508](end_span)
        state.ownedPlates.push(r.specialPlate);[span_509](start_span)[span_509](end_span)
    }
    state.player.lastClaimedDay = pDay;[span_510](start_span)[span_510](end_span)
    state.player.streakDay = (sDay % 7) + 1;[span_511](start_span)[span_511](end_span)
    saveState();[span_512](start_span)[span_512](end_span)
    closeModal('modalDailyBonus');[span_513](start_span)[span_513](end_span)
    playSound('win'); tgHaptic('success');[span_514](start_span)[span_514](end_span)
    openVerdictModal("БОНУС ПОЛУЧЕН! 🎁", "Вам начислено: " + currentReward.title, true);[span_515](start_span)[span_515](end_span)
}

// ========================================================
// 10. МАГАЗИН ПЕРЕКУПА
// ========================================================
function switchShopSection(section) {[span_516](start_span)[span_516](end_span)
    ['tools', 'consumables', 'tuningParts', 'homeItems'].forEach(s => {[span_517](start_span)[span_517](end_span)
        const sec = document.getElementById('shopSec-' + s);[span_518](start_span)[span_518](end_span)
        const btn = document.getElementById('shopTab-' + s);[span_519](start_span)[span_519](end_span)
        if (sec) sec.style.display = (s === section) ? 'block' : 'none';[span_520](start_span)[span_520](end_span)
        if (btn) {[span_521](start_span)[span_521](end_span)
            btn.className = (s === section) ? 'btn btn-cyan btn-sm' : 'btn btn-dark btn-sm';[span_522](start_span)[span_522](end_span)
        }
    });

    if (section === 'tools') renderShopTools();[span_523](start_span)[span_523](end_span)
    if (section === 'consumables') renderShopConsumables();[span_524](start_span)[span_524](end_span)
    if (section === 'tuningParts') renderShopTuningParts();[span_525](start_span)[span_525](end_span)
    if (section === 'homeItems') renderShopHomeItems();[span_526](start_span)[span_526](end_span)
}

function renderShopTools() {[span_527](start_span)[span_527](end_span)
    const box = document.getElementById('shopToolsList');[span_528](start_span)[span_528](end_span)
    if (!box) return;[span_529](start_span)[span_529](end_span)
    const tools = (typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.tools) ? SHOP_CATALOG.tools : [];[span_530](start_span)[span_530](end_span)

    let html = "";[span_531](start_span)[span_531](end_span)
    tools.forEach(t => {[span_532](start_span)[span_532](end_span)
        let isOwned = !!(state.player.tools && state.player.tools[t.id]);[span_533](start_span)[span_533](end_span)
        let btn = isOwned 
            ? `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Куплено ✓</button>`[span_534](start_span)[span_534](end_span)
            : `<button onclick="buyToolAction('${t.id}', ${t.cost})" class="btn btn-cyan btn-sm btn-auto">${t.cost.toLocaleString()} ₽</button>`;[span_535](start_span)[span_535](end_span)
        html += `
        <div class="glass-card flex-between p-2 mb-2">
            <div style="flex:1; margin-right:8px;">
                <b class="text-xs color-cyan"><i class="fa-solid ${t.icon || 'fa-wrench'} mr-1"></i> ${t.name}</b>
                <div class="sub-label" style="font-size:10px;">${t.desc}</div>
            </div>
            ${btn}
        </div>`;[span_536](start_span)[span_536](end_span)
    });
    box.innerHTML = html;[span_537](start_span)[span_537](end_span)
}

function buyToolAction(toolId, cost) {[span_538](start_span)[span_538](end_span)
    let cash = state.player.cash || 0;[span_539](start_span)[span_539](end_span)
    if (cash < cost) return showToast("Не хватает денег на прибор!");[span_540](start_span)[span_540](end_span)
    state.player.cash -= cost;[span_541](start_span)[span_541](end_span)
    if (!state.player.tools) state.player.tools = {};[span_542](start_span)[span_542](end_span)
    state.player.tools[toolId] = true;[span_543](start_span)[span_543](end_span)
    saveState();[span_544](start_span)[span_544](end_span)
    renderShopTools();[span_545](start_span)[span_545](end_span)
    if (typeof renderContracts === 'function') renderContracts();[span_546](start_span)[span_546](end_span)
    playSound('win'); tgHaptic('success');[span_547](start_span)[span_547](end_span)
    showToast("Прибор куплен и добавлен в диагностический арсенал!");[span_548](start_span)[span_548](end_span)
}

function renderShopConsumables() {[span_549](start_span)[span_549](end_span)
    const box = document.getElementById('shopConsumablesList');[span_550](start_span)[span_550](end_span)
    if (!box) return;[span_551](start_span)[span_551](end_span)
    const packs = (typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.consumables) ? SHOP_CATALOG.consumables : [];[span_552](start_span)[span_552](end_span)

    let html = "";[span_553](start_span)[span_553](end_span)
    packs.forEach(p => {[span_554](start_span)[span_554](end_span)
        html += `
        <div class="glass-card flex-between p-2 mb-2">
            <div style="flex:1; margin-right:8px;">
                <b class="text-xs color-amber">${p.name}</b>
                <div class="sub-label" style="font-size:10px;">${p.desc}</div>
            </div>
            <button onclick="buyConsumableAction(${p.cost}, ${p.value})" class="btn btn-amber btn-sm btn-auto">${p.cost.toLocaleString()} ₽</button>
        </div>`;[span_555](start_span)[span_555](end_span)
    });
    box.innerHTML = html;[span_556](start_span)[span_556](end_span)
}

function buyConsumableAction(cost, val) {[span_557](start_span)[span_557](end_span)
    let cash = state.player.cash || 0;[span_558](start_span)[span_558](end_span)
    if (cash < cost) return showToast("Не хватает денег на партию сырья!");[span_559](start_span)[span_559](end_span)
    state.player.cash -= cost;[span_560](start_span)[span_560](end_span)
    if (state.businesses) {[span_561](start_span)[span_561](end_span)
        state.businesses.forEach(b => {[span_562](start_span)[span_562](end_span)
            b.stock = Math.min(100, (b.stock || 0) + val);[span_563](start_span)[span_563](end_span)
        });
    }
    saveState();[span_564](start_span)[span_564](end_span)
    playSound('win'); tgHaptic('success');[span_565](start_span)[span_565](end_span)
    showToast("Склады предприятий успешно пополнены сырьём!");[span_566](start_span)[span_566](end_span)
}

function renderShopTuningParts() {[span_567](start_span)[span_567](end_span)
    const box = document.getElementById('shopTuningPartsList');[span_568](start_span)[span_568](end_span)
    if (!box) return;[span_569](start_span)[span_569](end_span)
    const parts = (typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.tuningParts) ? SHOP_CATALOG.tuningParts : [];[span_570](start_span)[span_570](end_span)

    let html = "";[span_571](start_span)[span_571](end_span)
    parts.forEach(p => {[span_572](start_span)[span_572](end_span)
        let isBought = false;[span_573](start_span)[span_573](end_span)
        if (p.id === 'raf_license') isBought = !!state.player.hasRacingLicense;[span_574](start_span)[span_574](end_span)
        let btn = isBought
            ? `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Оформлено ✓</button>`[span_575](start_span)[span_575](end_span)
            : `<button onclick="buyShopDocAction('${p.id}', ${p.cost})" class="btn btn-red btn-sm btn-auto">${p.cost.toLocaleString()} ₽</button>`;[span_576](start_span)[span_576](end_span)

        html += `
        <div class="glass-card flex-between p-2 mb-2">
            <div style="flex:1; margin-right:8px;">
                <b class="text-xs color-red"><i class="fa-solid ${p.icon || 'fa-file'} mr-1"></i> ${p.name}</b>
                <div class="sub-label" style="font-size:10px;">${p.desc}</div>
            </div>
            ${btn}
        </div>`;[span_577](start_span)[span_577](end_span)
    });

    html += `
    <div class="glass-card p-2 text-center sub-label" style="font-size:10px;">
        💡 Спортивные компоненты покупаются непосредственно в <b>Гараже</b> под конкретный кузов!
    </div>`;[span_578](start_span)[span_578](end_span)

    box.innerHTML = html;[span_579](start_span)[span_579](end_span)
}

function buyShopDocAction(docId, cost) {[span_580](start_span)[span_580](end_span)
    let cash = state.player.cash || 0;[span_581](start_span)[span_581](end_span)
    if (cash < cost) return showToast("Не хватает денег!");[span_582](start_span)[span_582](end_span)
    state.player.cash -= cost;[span_583](start_span)[span_583](end_span)

    if (docId === 'raf_license') {[span_584](start_span)[span_584](end_span)
        state.player.hasRacingLicense = true;[span_585](start_span)[span_585](end_span)
        openVerdictModal("ЛИЦЕНЗИЯ ПИЛОТА РАФ! 🏎️", "Официальная лицензия оформлена. Доступ к заездам открыт!", true);[span_586](start_span)[span_586](end_span)
    } else if (docId === 'insurance_osago') {[span_587](start_span)[span_587](end_span)
        showToast("Полис оформлен! Вы можете активировать его на любой авто в Гараже.");[span_588](start_span)[span_588](end_span)
    } else if (docId === 'gps_tracker') {[span_589](start_span)[span_589](end_span)
        showToast("GPS-маяк приобретен в арсенал безопасности!");[span_590](start_span)[span_590](end_span)
    }

    saveState();[span_591](start_span)[span_591](end_span)
    renderShopTuningParts();[span_592](start_span)[span_592](end_span)
    playSound('win');[span_593](start_span)[span_593](end_span)
    tgHaptic('success');[span_594](start_span)[span_594](end_span)
}

function renderShopHomeItems() {[span_595](start_span)[span_595](end_span)
    const box = document.getElementById('shopHomeItemsList');[span_596](start_span)[span_596](end_span)
    if (!box) return;[span_597](start_span)[span_597](end_span)
    if (typeof HOUSING_INTERIOR_CATALOG === 'undefined') return;[span_598](start_span)[span_598](end_span)
    if (!state.player.furniture) state.player.furniture = [];[span_599](start_span)[span_599](end_span)

    let html = "";[span_600](start_span)[span_600](end_span)
    HOUSING_INTERIOR_CATALOG.forEach(item => {[span_601](start_span)[span_601](end_span)
        let isBought = state.player.furniture.includes(item.id);[span_602](start_span)[span_602](end_span)
        let btnContent = isBought 
            ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Куплено ✓</button>[span_603](start_span)"[span_603](end_span)
            : `<button onclick="buyHomeFurnitureShop('${item.id}', ${item.cost})" class="btn btn-green btn-sm btn-auto">${(item.cost / 1000).toFixed(0)}k ₽</button>`;[span_604](start_span)[span_604](end_span)

        html += `
        <div class="glass-card p-2 flex-between mb-2">
            <div>
                <div class="font-bold text-xs color-cyan">${item.name}</div>
                <div class="sub-label" style="font-size:10px;">${item.perk}</div>
            </div>
            ${btnContent}
        </div>`;[span_605](start_span)[span_605](end_span)
    });
    box.innerHTML = html;[span_606](start_span)[span_606](end_span)
}

function buyHomeFurnitureShop(fId, cost) {[span_607](start_span)[span_607](end_span)
    let cash = state.player.cash || 0;[span_608](start_span)[span_608](end_span)
    if (cash < cost) return showToast("Не хватает денег!");[span_609](start_span)[span_609](end_span)
    state.player.cash -= cost;[span_610](start_span)[span_610](end_span)
    if (!state.player.furniture) state.player.furniture = [];[span_611](start_span)[span_611](end_span)
    state.player.furniture.push(fId);[span_612](start_span)[span_612](end_span)
    saveState();[span_613](start_span)[span_613](end_span)
    renderShopHomeItems();[span_614](start_span)[span_614](end_span)
    playSound('win'); tgHaptic('success');[span_615](start_span)[span_615](end_span)
    showToast("Куплено и установлено в вашем жилье!");[span_616](start_span)[span_616](end_span)
}

// ========================================================
// 11. АНАЛИТИКА ПРОФИЛЯ
// ========================================================
function renderProfileAnalytics() {
    let s = state.player?.stats || { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 };[span_617](start_span)[span_617](end_span)
    setTxt('statProfitable', s.profitableSales || 0);[span_618](start_span)[span_618](end_span)
    setTxt('statLoss', s.lossSales || 0);[span_619](start_span)[span_619](end_span)
    setTxt('statTotalNetProfit', (s.totalNetProfit || 0).toLocaleString() + " ₽");[span_620](start_span)[span_620](end_span)
    let totalSales = (s.profitableSales || 0) + (s.lossSales || 0);[span_621](start_span)[span_621](end_span)
    let winrate = totalSales > 0 ? Math.round(((s.profitableSales || 0) / totalSales) * 100) : 0;[span_622](start_span)[span_622](end_span)
    setTxt('statWinrate', winrate + "%");[span_623](start_span)[span_623](end_span)
    setTxt('profileTgUsername', state.player?.name || "Перекуп #777");[span_624](start_span)[span_624](end_span)

    let lvl = state.player?.level || 1;[span_625](start_span)[span_625](end_span)
    let rank = lvl >= 50 ? "Автомобильный Олигарх" : (lvl >= 30 ? "Хозяин Авторынка" : (lvl >= 15 ? "Серый Делец" : "Гаражный Перекуп"));[span_626](start_span)[span_626](end_span)
    setTxt('profPlayerRank', "Статус: " + rank);[span_627](start_span)[span_627](end_span)
}

// ========================================================
// 12. НАВИГАЦИЯ И ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// ========================================================
function switchTab(tabId) {
    try { initAudio(); playSound('tick'); tgHaptic('light'); } catch(e) {}
    
    const activeTab = document.querySelector('.tab-screen.active');[span_628](start_span)[span_628](end_span)
    if (tabId === 'tabPhone' && activeTab && activeTab.id === 'tabPhone') {[span_629](start_span)[span_629](end_span)
        if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.goHome === 'function') {
            PhoneManager.goHome();[span_630](start_span)[span_630](end_span)
        }
        return;[span_631](start_span)[span_631](end_span)
    }
    
    document.querySelectorAll('.tab-screen').forEach(el => el.classList.remove('active'));[span_632](start_span)[span_632](end_span)
    const tb = document.getElementById(tabId);[span_633](start_span)[span_633](end_span)
    if (tb) tb.classList.add('active');[span_634](start_span)[span_634](end_span)
    
    document.querySelectorAll('.b-nav-item').forEach(b => b.classList.remove('active'));[span_635](start_span)[span_635](end_span)
    
    const navBtn = document.getElementById('bnav-' + tabId);
    if (navBtn) navBtn.classList.add('active');
    else {
        const fallbackBtn = document.getElementById('bnav-tabMarket');
        if (fallbackBtn) fallbackBtn.classList.add('active');
    }

    try {
        if (tabId === 'tabMarket' && typeof renderMarketFeed === 'function') renderMarketFeed();[span_636](start_span)[span_636](end_span)
        if (tabId === 'tabGarage' && typeof renderGarage === 'function') renderGarage();[span_637](start_span)[span_637](end_span)
        if (tabId === 'tabSalesLot' && typeof renderSalesLot === 'function') renderSalesLot();[span_638](start_span)[span_638](end_span)
        if (tabId === 'tabPhone') {[span_639](start_span)[span_639](end_span)
            if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.renderPhoneScreen === 'function') {
                PhoneManager.renderPhoneScreen();[span_640](start_span)[span_640](end_span)
            }
        }
        if (tabId === 'tabLife') {[span_641](start_span)[span_641](end_span)
            if (typeof renderDiets === 'function') renderDiets();[span_642](start_span)[span_642](end_span)
            if (typeof renderLifeChat === 'function') renderLifeChat();[span_643](start_span)[span_643](end_span)
        }
        if (tabId === 'tabProfile') renderProfileAnalytics();[span_644](start_span)[span_644](end_span)
    } catch(err) {
        console.error("switchTab render error:", err);
    }
}

function checkAutoShowPatchNotes() {[span_645](start_span)[span_645](end_span)
    try {
        const lastSeen = localStorage.getItem('perekup_last_seen_version');[span_646](start_span)[span_646](end_span)
        if (lastSeen !== CURRENT_GAME_VERSION) {[span_647](start_span)[span_647](end_span)
            setTimeout(() => { openPatchNotesModal(); }, 800);[span_648](start_span)[span_648](end_span)
        }
    } catch(e) {}
}

// ========================================================
// 13. СВАЙП-ЛИСТЕНЕР РЫНКА
// ========================================================
function initMarketScrollListener() {[span_649](start_span)[span_649](end_span)
    const mainContent = document.querySelector('.main-content');[span_650](start_span)[span_650](end_span)
    if (!mainContent) return;[span_651](start_span)[span_651](end_span)

    let touchStartY = 0;[span_652](start_span)[span_652](end_span)
    let touchEndY = 0;[span_653](start_span)[span_653](end_span)

    mainContent.addEventListener('scroll', () => {[span_654](start_span)[span_654](end_span)
        const marketTab = document.getElementById('tabMarket');[span_655](start_span)[span_655](end_span)
        if (!marketTab || !marketTab.classList.contains('active')) return;[span_656](start_span)[span_656](end_span)

        const grid = document.getElementById('marketCatListContainer');[span_657](start_span)[span_657](end_span)
        const btnIcon = document.querySelector('#btnToggleMarketGrid i');[span_658](start_span)[span_658](end_span)

        if (mainContent.scrollTop > 90) {[span_659](start_span)[span_659](end_span)
            if (grid && !grid.classList.contains('collapsed')) {[span_660](start_span)[span_660](end_span)
                grid.classList.add('collapsed');[span_661](start_span)[span_661](end_span)
                if (btnIcon) btnIcon.className = "fa-solid fa-chevron-down";[span_662](start_span)[span_662](end_span)
            }
        }
    });

    mainContent.addEventListener('touchstart', (e) => {[span_663](start_span)[span_663](end_span)
        touchStartY = e.touches[0].clientY;[span_664](start_span)[span_664](end_span)
    }, { passive: true });[span_665](start_span)[span_665](end_span)

    mainContent.addEventListener('touchmove', (e) => {[span_666](start_span)[span_666](end_span)
        touchEndY = e.touches[0].clientY;[span_667](start_span)[span_667](end_span)
        const marketTab = document.getElementById('tabMarket');[span_668](start_span)[span_668](end_span)
        if (!marketTab || !marketTab.classList.contains('active')) return;[span_669](start_span)[span_669](end_span)

        if (mainContent.scrollTop <= 2 && touchEndY - touchStartY > 65) {[span_670](start_span)[span_670](end_span)
            const grid = document.getElementById('marketCatListContainer');[span_671](start_span)[span_671](end_span)
            const btnIcon = document.querySelector('#btnToggleMarketGrid i');[span_672](start_span)[span_672](end_span)
            if (grid && grid.classList.contains('collapsed')) {[span_673](start_span)[span_673](end_span)
                grid.classList.remove('collapsed');[span_674](start_span)[span_674](end_span)
                if (btnIcon) btnIcon.className = "fa-solid fa-chevron-up";[span_675](start_span)[span_675](end_span)
                tgHaptic('light');[span_676](start_span)[span_676](end_span)
            }
        }
    }, { passive: true });[span_677](start_span)[span_677](end_span)
}

// ========================================================
// 14. ИНИЦИАЛИЗАЦИЯ И ИГРОВОЙ ЦИКЛ
// ========================================================
function initApp() {[span_678](start_span)[span_678](end_span)
    initTelegramAuthAndStorage(() => {[span_679](start_span)[span_679](end_span)
        updateHeaderUI();[span_680](start_span)[span_680](end_span)
        updateLevelGatesUI();[span_681](start_span)[span_681](end_span)
        applyLanguageToDOM();
        checkRealTimeDayChange();
        
        // Гарантированное наполнение базы при первом запуске
        if (!state.marketFeed || state.marketFeed.length === 0 || !state.marketFeed.some(c => c && !c.unavailable)) {
            if (typeof populateMarketFeed === 'function') populateMarketFeed();[span_682](start_span)[span_682](end_span)
        }
        if (!state.plateCatalog || state.plateCatalog.length === 0) {[span_683](start_span)[span_683](end_span)
            if (typeof refreshPlateCatalog === 'function') refreshPlateCatalog();[span_684](start_span)[span_684](end_span)
        }
        if (!state.contracts || state.contracts.length === 0) {[span_685](start_span)[span_685](end_span)
            if (typeof generateContracts === 'function') generateContracts();[span_686](start_span)[span_686](end_span)
        }

        if (typeof renderGarage === 'function') renderGarage();[span_687](start_span)[span_687](end_span)
        if (typeof renderSalesLot === 'function') renderSalesLot();[span_688](start_span)[span_688](end_span)
        if (typeof renderDiets === 'function') renderDiets();[span_689](start_span)[span_689](end_span)
        if (typeof renderHousing === 'function') renderHousing();[span_690](start_span)[span_690](end_span)
        if (typeof renderContracts === 'function') renderContracts();[span_691](start_span)[span_691](end_span)
        if (typeof renderMarketFeed === 'function') renderMarketFeed();
        
        if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.init === 'function') {
            PhoneManager.init();[span_692](start_span)[span_692](end_span)
        }
        
        initMarketScrollListener();[span_693](start_span)[span_693](end_span)
        switchTab('tabMarket');[span_694](start_span)[span_694](end_span)
        checkAutoShowPatchNotes();[span_695](start_span)[span_695](end_span)
    });
}

let gameCycleSeconds = 0;[span_696](start_span)[span_696](end_span)

setInterval(() => {[span_697](start_span)[span_697](end_span)
    gameCycleSeconds++;[span_698](start_span)[span_698](end_span)
    let lotChanged = false;[span_699](start_span)[span_699](end_span)

    if (gameCycleSeconds % 60 === 0) {
        checkRealTimeDayChange();
    }

    if (gameCycleSeconds % 30 === 0 && state.businesses) {[span_700](start_span)[span_700](end_span)
        let bizUpdated = false;[span_701](start_span)[span_701](end_span)
        state.businesses.forEach(b => {[span_702](start_span)[span_702](end_span)
            if (b && b.level > 0) {[span_703](start_span)[span_703](end_span)
                if (b.stock > 0) {[span_704](start_span)[span_704](end_span)
                    b.stock = Math.max(0, b.stock - 2);[span_705](start_span)[span_705](end_span)
                    let tickIncome = Math.round((b.income * b.level) / 5);[span_706](start_span)[span_706](end_span)
                    b.stored = (b.stored || 0) + tickIncome;[span_707](start_span)[span_707](end_span)
                    bizUpdated = true;[span_708](start_span)[span_708](end_span)
                }
            }
        });
        if (bizUpdated) {[span_709](start_span)[span_709](end_span)
            saveState();[span_710](start_span)[span_710](end_span)
            if (typeof PhoneManager !== 'undefined') PhoneManager.renderBusinessWidget();[span_711](start_span)[span_711](end_span)
        }
    }

    if (gameCycleSeconds % 45 === 0 && state.player) {[span_712](start_span)[span_712](end_span)
        state.player.hunger = Math.max(0, (state.player.hunger || 80) - 1);[span_713](start_span)[span_713](end_span)
        state.player.mood = Math.max(0, (state.player.mood || 85) - 1);[span_714](start_span)[span_714](end_span)
        updateHeaderUI();[span_715](start_span)[span_715](end_span)
    }

    if (gameCycleSeconds % 10 === 0 && state.garage) {
        state.garage.forEach(car => {
            if (car && car.engineTemp && car.engineTemp > 90) {
                car.engineTemp = Math.max(90, car.engineTemp - 5);
            }
        });
    }

    if (state.salesLot && state.salesLot.length > 0) {[span_716](start_span)[span_716](end_span)
        for (let i = 0; i < state.salesLot.length; i++) {[span_717](start_span)[span_717](end_span)
            let slot = state.salesLot[i];[span_718](start_span)[span_718](end_span)
            if (!slot) continue;[span_719](start_span)[span_719](end_span)

            if (!slot.currentBuyer) {[span_720](start_span)[span_720](end_span)
                if (slot.timer === undefined || isNaN(slot.timer) || slot.maxTimer === undefined || isNaN(slot.maxTimer)) {[span_721](start_span)[span_721](end_span)
                    let t = (typeof calculateLotWaitTime === 'function') ? calculateLotWaitTime() : 120;[span_722](start_span)[span_722](end_span)
                    slot.maxTimer = t;[span_723](start_span)[span_723](end_span)
                    slot.timer = t;[span_724](start_span)[span_724](end_span)
                }

                if (slot.timer > 0) {[span_725](start_span)[span_725](end_span)
                    slot.timer -= 1;[span_726](start_span)[span_726](end_span)
                    const progressBar = document.getElementById("lot_progress_fill_" + i);[span_727](start_span)[span_727](end_span)
                    const timerText = document.getElementById("lot_timer_text_" + i);[span_728](start_span)[span_728](end_span)
                    if (progressBar) {[span_729](start_span)[span_729](end_span)
                        let pct = Math.max(0, Math.min(100, ((slot.maxTimer - slot.timer) / slot.maxTimer) * 100));[span_730](start_span)[span_730](end_span)
                        progressBar.style.width = pct + "%";[span_731](start_span)[span_731](end_span)
                    }
                    if (timerText) timerText.innerText = "Ожидание клиента: " + slot.timer + "с";[span_732](start_span)[span_732](end_span)
                }

                if (slot.timer <= 0) {[span_733](start_span)[span_733](end_span)
                    if (typeof generateBuyerForSlot === 'function') generateBuyerForSlot(slot);[span_734](start_span)[span_734](end_span)
                    lotChanged = true;[span_735](start_span)[span_735](end_span)
                }
            } else {
                if (slot.buyerTimerLeft === undefined || isNaN(slot.buyerTimerLeft)) {[span_736](start_span)[span_736](end_span)
                    slot.buyerTimerLeft = 120;[span_737](start_span)[span_737](end_span)
                }
                
                if (slot.buyerTimerLeft > 0) {[span_738](start_span)[span_738](end_span)
                    slot.buyerTimerLeft -= 1;[span_739](start_span)[span_739](end_span)
                    const buyerTimeText = document.getElementById("lot_buyer_timer_" + i);[span_740](start_span)[span_740](end_span)
                    if (buyerTimeText) buyerTimeText.innerText = "⏳ " + slot.buyerTimerLeft + "с";[span_741](start_span)[span_741](end_span)
                }

                if (slot.buyerTimerLeft <= 0) {[span_742](start_span)[span_742](end_span)
                    slot.currentBuyer = null;[span_743](start_span)[span_743](end_span)
                    let t = (typeof calculateLotWaitTime === 'function') ? calculateLotWaitTime() : 120;[span_744](start_span)[span_744](end_span)
                    slot.maxTimer = t;[span_745](start_span)[span_745](end_span)
                    slot.timer = t;[span_746](start_span)[span_746](end_span)
                    lotChanged = true;[span_747](start_span)[span_747](end_span)
                    showToast("🚶‍♂️ Клиент не дождался вас и ушел. Площадка ищет следующего...");[span_748](start_span)[span_748](end_span)
                }
            }
        }
    }
    
    const sTab = document.getElementById('tabSalesLot');[span_749](start_span)[span_749](end_span)
    if (lotChanged && sTab && sTab.classList.contains('active') && typeof renderSalesLot === 'function') {[span_750](start_span)[span_750](end_span)
        renderSalesLot();[span_751](start_span)[span_751](end_span)
    }
    
    const mTab = document.getElementById('tabMarket');[span_752](start_span)[span_752](end_span)
    if (mTab && mTab.classList.contains('active') && typeof updateMarketTimers === 'function') {[span_753](start_span)[span_753](end_span)
        updateMarketTimers();[span_754](start_span)[span_754](end_span)
    }
}, 1000);[span_755](start_span)[span_755](end_span)

// Экспорт всех глобальных функций в объект window
window.switchTab = switchTab;
window.saveState = saveState;
window.updateHeaderUI = updateHeaderUI;
window.showToast = showToast;
window.closeModal = closeModal;
window.openVerdictModal = openVerdictModal;
window.playSound = playSound;
window.tgHaptic = tgHaptic;
window.addXp = addXp;
window.adjustResource = adjustResource;
window.openDailyBonusModal = openDailyBonusModal;
window.claimDailyReward = claimDailyReward;
window.toggleGameLanguage = toggleGameLanguage;
window.setGameLanguage = setGameLanguage;
window.trackQuestProgress = trackQuestProgress;
window.refreshDailyQuestsList = refreshDailyQuestsList;
window.checkSyndicateAccessDetails = checkSyndicateAccessDetails;
window.getTotalGarageSlots = getTotalGarageSlots;
window.getGarageSlotCost = getGarageSlotCost;
window.getExpressTicketUpgradeCost = getExpressTicketUpgradeCost;
window.getMarketRefreshCost = getMarketRefreshCost;
window.openSaveManagerModal = openSaveManagerModal;
window.exportSaveCodeAction = exportSaveCodeAction;
window.importSaveCodeAction = importSaveCodeAction;
window.syncCloudStorageManual = syncCloudStorageManual;
window.resetGameData = resetGameData;
window.openPatchNotesModal = openPatchNotesModal;
window.dismissPatchNotesModal = dismissPatchNotesModal;
window.switchShopSection = switchShopSection;
window.buyToolAction = buyToolAction;
window.buyConsumableAction = buyConsumableAction;
window.buyShopDocAction = buyShopDocAction;
window.buyHomeFurnitureShop = buyHomeFurnitureShop;
window.renderProfileAnalytics = renderProfileAnalytics;

if (document.readyState === 'loading') {[span_756](start_span)[span_756](end_span)
    document.addEventListener('DOMContentLoaded', initApp);[span_757](start_span)[span_757](end_span)
} else {
    initApp();[span_758](start_span)[span_758](end_span)
}

// ========================================================
// js/app.js — ЯДРО, TELEGRAM CLOUD STORAGE & FIREBASE (v0.4.0)
// ========================================================

const CURRENT_GAME_VERSION = "v0.4.0";

// Инициализация AudioContext для звуков
let ACtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

let tgUserId = "guest_777";
let SAVE_KEY = "perekup_save_guest_777";
let cloudSaveDebounceTimer = null;
let isCloudStorageAvailable = false;

// ========================================================
// ГЛОБАЛЬНЫЕ УТИЛИТЫ И UI
// ========================================================
function tgHaptic(type = 'light') {
    try { 
        if (window.Telegram?.WebApp?.HapticFeedback) { 
            let isNotif = ['success', 'warning', 'error'].includes(type);
            if (isNotif) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred(type); 
            } else {
                window.Telegram.WebApp.HapticFeedback.impactOccurred(type); 
            }
        } 
    } catch(e) {
        console.warn("Haptic API недоступен:", e);
    }
}

function initAudio() {
    if (!audioCtx) {
        audioCtx = new ACtx();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    try {
        initAudio();
        const now = audioCtx.currentTime;
        if (type === 'tick') {
            const osc = audioCtx.createOscillator(); 
            const g = audioCtx.createGain(); 
            osc.connect(g); 
            g.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(800, now); 
            g.gain.setValueAtTime(0.06, now); 
            g.gain.linearRampToValueAtTime(0, now + 0.03); 
            osc.start(now); 
            osc.stop(now + 0.03);
        } else if (type === 'win') {
            const osc = audioCtx.createOscillator(); 
            const g = audioCtx.createGain(); 
            osc.connect(g); 
            g.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(440, now); 
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.2); 
            g.gain.setValueAtTime(0.2, now); 
            g.gain.linearRampToValueAtTime(0, now + 0.25); 
            osc.start(now); 
            osc.stop(now + 0.25);
        } else if (type === 'error') {
            const osc = audioCtx.createOscillator(); 
            const g = audioCtx.createGain(); 
            osc.connect(g); 
            g.connect(audioCtx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now); 
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.3); 
            g.gain.setValueAtTime(0.15, now); 
            g.gain.linearRampToValueAtTime(0, now + 0.3); 
            osc.start(now); 
            osc.stop(now + 0.3);
        }
    } catch(e) {}
}

function playEngineSound() {
    try {
        initAudio(); 
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator(); 
        const g = audioCtx.createGain(); 
        osc.type = 'sawtooth'; 
        osc.connect(g); 
        g.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(100, now); 
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.4); 
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.85);
        g.gain.setValueAtTime(0.25, now); 
        g.gain.linearRampToValueAtTime(0, now + 0.9); 
        osc.start(now); 
        osc.stop(now + 0.9); 
        tgHaptic('medium'); 
    } catch(e) {}
}

function spawnFloatingReward(text) {
    const el = document.createElement('div'); 
    el.className = 'floating-reward'; 
    el.innerText = text; 
    el.style.left = '50%'; 
    el.style.top = '45%'; 
    document.body.appendChild(el); 
    setTimeout(() => { el.remove(); }, 1200);
}

function setTxt(id, val) { 
    const el = document.getElementById(id); 
    if (el) el.innerHTML = val; 
}

function showToast(msg) { 
    const t = document.getElementById('toastNotification'); 
    if (!t) return; 
    t.innerText = msg; 
    t.classList.add('show'); 
    setTimeout(() => { t.classList.remove('show'); }, 2300); 
}

function closeModal(id) { 
    const el = document.getElementById(id);
    if (el) el.classList.remove('active'); 
}

function openVerdictModal(title, text, isSuccess, amount, profit) {
    tgHaptic(isSuccess ? 'success' : 'error'); 
    if (isSuccess) playSound('win');
    else playSound('error');

    setTxt('verdictEmoji', isSuccess ? '🎉' : '❌'); 
    setTxt('verdictTitle', title); 
    setTxt('verdictText', text);
    
    const amtEl = document.getElementById('verdictAmount'); 
    if (amtEl) { 
        if (amount) {
            amtEl.style.display = 'block';
            amtEl.innerText = "+" + amount.toLocaleString() + " ₽"; 
        } else {
            amtEl.style.display = 'none';
        }
    }
    
    const profitEl = document.getElementById('verdictProfitBadge');
    if (profitEl) {
        if (profit !== undefined && profit !== null) {
            profitEl.style.display = 'block';
            if (profit > 0) { 
                profitEl.className = 'text-xs font-bold mb-3 color-green'; 
                profitEl.innerText = "Чистая прибыль: +" + profit.toLocaleString() + " ₽ 📈"; 
            } else if (profit < 0) { 
                profitEl.className = 'text-xs font-bold mb-3 color-red'; 
                profitEl.innerText = "Убыток: " + profit.toLocaleString() + " ₽ 📉"; 
            } else { 
                profitEl.className = 'text-xs font-bold mb-3 color-amber'; 
                profitEl.innerText = "Сделка закрыта в ноль (0 ₽)"; 
            }
        } else { 
            profitEl.style.display = 'none'; 
        }
    }
    const mod = document.getElementById('modalDealVerdict');
    if (mod) mod.classList.add('active');
}

function openPatchNotesModal() {
    const modal = document.getElementById('modalPatchNotes');
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function dismissPatchNotesModal() {
    closeModal('modalPatchNotes');
    try {
        localStorage.setItem('perekup_last_seen_version', CURRENT_GAME_VERSION);
    } catch(e) {}
}

// ========================================================
// УПРАВЛЕНИЕ СОСТОЯНИЕМ (STATE)
// ========================================================
const DEFAULT_STATE = {
    player: { 
        name: "Перекуп #777", avatarUrl: null, cash: 150000, stars: 15, connections: 1, 
        expressTickets: 25, maxExpressTickets: 25, fuel: 100, level: 1, xp: 0, maxXp: 120, 
        baseSlots: 2, vip: false, vipPro: false, lastFreeSpinDay: 0, club: null, karma: 50, 
        stats: { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 }, 
        hunger: 80, mood: 85, loanDebt: 0, day: 1, streakDay: 1, lastClaimedDay: 0, 
        diet: 'shaurma', housingId: 'room', housingType: 'rent', ownedHouses: [], selectedStreetCarIndex: 0, 
        lastBarnDay: 0, preSalesCount: 0, preSaleCooldownUntil: 0, policeImmunityDays: 0,
        hasRacingLicense: false, consecutiveRaces: 0, maxRacesBeforeRaid: 12,
        tools: { gauge: false, obd: false, endoscope: false, compressor: false },
        furniture: []
    },
    garage: [], salesLot: [], contracts: [], plateCatalog: [], ownedPlates: ["В777ВВ 77"], 
    activeCategory: 'economy', marketFeed: [], p2pMode: 'cars', syndicateSubTab: 'p2p', 
    myP2PListings: [], businesses: [], confiscatedLot: null, blackMarketPlates: [],
    marketModifiers: { economy: 1, comfort: 1, premium: 1, all: 1 },
    lifeChatMessages: [], friendsList: []
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

function getGarageSlotCost() {
    let bs = 2;
    if (state.player && state.player.baseSlots) bs = state.player.baseSlots;
    let extraSlots = Math.max(0, bs - 2);
    return Math.round(250000 * Math.pow(1.65, extraSlots));
}

function getExpressTicketUpgradeCost() {
    let m = 25;
    if (state.player && state.player.maxExpressTickets) m = state.player.maxExpressTickets;
    let extra = Math.max(0, m - 25);
    const steps = Math.floor(extra / 25);
    return Math.round(50000 * Math.pow(1.5, steps));
}

function getTotalGarageSlots() {
    let slots = 2;
    if (state.player && state.player.baseSlots) slots = state.player.baseSlots;
    if (typeof HOUSING_LIST !== 'undefined' && Array.isArray(HOUSING_LIST)) {
        if (state.player && state.player.housingId) {
            const house = HOUSING_LIST.find(h => h.id === state.player.housingId); 
            if (house) slots += (house.slots || 0);
        }
        if (state.player && state.player.ownedHouses && Array.isArray(state.player.ownedHouses)) {
           state.player.ownedHouses.forEach(hId => { 
               const oh = HOUSING_LIST.find(h => h.id === hId); 
               if (oh) slots += (oh.slots || 0); 
           }); 
        }
    }
    return slots;
}

// ========================================================
// АВТОРИЗАЦИЯ, СОХРАНЕНИЕ И СЕТЬ
// ========================================================
function initTelegramAuthAndStorage(callback) {
    try {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();

            if (tg.initDataUnsafe?.user) {
                const u = tg.initDataUnsafe.user;
                tgUserId = String(u.id);
                SAVE_KEY = "perekup_save_" + tgUserId;

                let names = [];
                if (u.first_name) names.push(u.first_name);
                if (u.last_name) names.push(u.last_name);
                const fullName = names.join(' ');

                if (fullName) state.player.name = fullName;
                else if (u.username) state.player.name = "@" + u.username;
                if (u.photo_url) state.player.avatarUrl = u.photo_url;
            }

            if (tg.CloudStorage && typeof tg.CloudStorage.getItem === 'function') {
                isCloudStorageAvailable = true;
                const statusEl = document.getElementById('cloudStorageStatus');
                if (statusEl) {
                    statusEl.innerText = "TG Cloud: Синхронно";
                    statusEl.className = "tag-badge bg-tag-green";
                }

                tg.CloudStorage.getItem(SAVE_KEY, (err, val) => {
                    if (!err && val) {
                        try {
                            applyLoadedState(JSON.parse(val));
                            if (callback) callback();
                            return;
                        } catch(e) { console.error("Ошибка парсинга TG Cloud:", e); }
                    }
                    loadFromLocalStorage();
                    if (callback) callback();
                });
                return;
            }
        }
    } catch(e) { console.error("Ошибка инициализации TG:", e); }

    loadFromLocalStorage();
    if (callback) callback();
}

function loadFromLocalStorage() {
    try {
        let saved = localStorage.getItem(SAVE_KEY);
        if (!saved) saved = localStorage.getItem('perekoop_sim_save_v105_release');
        if (saved) applyLoadedState(JSON.parse(saved));
    } catch(e) { console.error("Ошибка загрузки LocalStorage:", e); }
}

function applyLoadedState(parsed) {
    if (!parsed) return;
    
    if (parsed.player) {
        state.player = { ...DEFAULT_STATE.player, ...parsed.player };
        if (parsed.player.stats) state.player.stats = { ...DEFAULT_STATE.player.stats, ...parsed.player.stats };
        if (parsed.player.tools) state.player.tools = { ...DEFAULT_STATE.player.tools, ...parsed.player.tools };
    }
    
    if (Array.isArray(parsed.garage)) state.garage = parsed.garage;
    if (Array.isArray(parsed.salesLot)) state.salesLot = parsed.salesLot;
    if (Array.isArray(parsed.ownedPlates)) state.ownedPlates = parsed.ownedPlates;
    if (Array.isArray(parsed.businesses)) state.businesses = parsed.businesses;
    if (parsed.marketModifiers) state.marketModifiers = parsed.marketModifiers;
    if (Array.isArray(parsed.myP2PListings)) state.myP2PListings = parsed.myP2PListings;
    if (parsed.confiscatedLot) state.confiscatedLot = parsed.confiscatedLot;
    if (Array.isArray(parsed.marketFeed)) state.marketFeed = parsed.marketFeed;
    if (Array.isArray(parsed.blackMarketPlates)) state.blackMarketPlates = parsed.blackMarketPlates;

    sanitizeState();
}

function sanitizeState() {
    if (!state.player.baseSlots || state.player.baseSlots < 2) state.player.baseSlots = 2;
    if (!state.player.maxExpressTickets) state.player.maxExpressTickets = 25;
    if (typeof state.player.expressTickets !== 'number') state.player.expressTickets = state.player.maxExpressTickets;
    if (typeof state.player.policeImmunityDays !== 'number') state.player.policeImmunityDays = 0;
    if (typeof state.player.consecutiveRaces !== 'number') state.player.consecutiveRaces = 0;
    if (typeof state.player.maxRacesBeforeRaid !== 'number') state.player.maxRacesBeforeRaid = Math.floor(10 + Math.random() * 5);
    if (!Array.isArray(state.player.ownedHouses)) state.player.ownedHouses = [];
    if (!Array.isArray(state.player.furniture)) state.player.furniture = [];
    if (typeof state.player.cash !== 'number' || state.player.cash < 0) state.player.cash = 150000;
    if (typeof state.player.loanDebt !== 'number' || state.player.loanDebt < 0) state.player.loanDebt = 0;
    if (!state.player.tools) state.player.tools = { gauge: false, obd: false, endoscope: false, compressor: false };
    
    if (!state.businesses || state.businesses.length === 0) {
        if (typeof BUSINESS_DATA !== 'undefined') {
            state.businesses = JSON.parse(JSON.stringify(BUSINESS_DATA));
        } else {
            state.businesses = [];
        }
    }
}

function saveState() { 
    try { 
        const jsonStr = JSON.stringify(state);
        localStorage.setItem(SAVE_KEY, jsonStr);

        if (isCloudStorageAvailable && window.Telegram?.WebApp?.CloudStorage) {
            if (cloudSaveDebounceTimer) clearTimeout(cloudSaveDebounceTimer);
            cloudSaveDebounceTimer = setTimeout(() => {
                window.Telegram.WebApp.CloudStorage.setItem(SAVE_KEY, jsonStr, (err, success) => {
                    const statusEl = document.getElementById('cloudStorageStatus');
                    if (statusEl) {
                        if (success) {
                            statusEl.innerText = "TG Cloud: Синхронно";
                            statusEl.className = "tag-badge bg-tag-green";
                        } else {
                            statusEl.innerText = "TG Cloud: Ошибка";
                            statusEl.className = "tag-badge bg-tag-red";
                        }
                    }
                });
            }, 1800);
        }

        if (window.FB_Bridge && typeof window.FB_Bridge.CloudSave?.pushSave === 'function') {
            window.FB_Bridge.CloudSave.pushSave(tgUserId, state);
            if (state.player.stats?.totalNetProfit > 0) {
                window.FB_Bridge.Leaderboard.updateMyRank(tgUserId, state.player.name, state.player.stats.totalNetProfit, state.player.level);
            }
        }
        
    } catch(e) { console.error("Ошибка сохранения:", e); } 
    updateHeaderUI(); 
}

function syncCloudStorageManual() {
    if (!isCloudStorageAvailable || !window.Telegram?.WebApp?.CloudStorage) {
        return showToast("Telegram Cloud Storage недоступен в обычном браузере!");
    }
    const jsonStr = JSON.stringify(state);
    window.Telegram.WebApp.CloudStorage.setItem(SAVE_KEY, jsonStr, (err, success) => {
        if (success) {
            playSound('win');
            tgHaptic('success');
            showToast("Облако Telegram успешно синхронизировано!");
        } else {
            tgHaptic('error');
            showToast("Не удалось сохранить в облако Telegram.");
        }
    });
}

function openSaveManagerModal() {
    const area = document.getElementById('saveExportArea');
    if (area) {
        try {
            area.value = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
        } catch(e) {
            area.value = JSON.stringify(state);
        }
    }
    const modal = document.getElementById('modalSaveManager');
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function exportSaveCodeAction() {
    const area = document.getElementById('saveExportArea');
    if (!area || !area.value) return;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(area.value).then(() => {
            showToast("Код сейва скопирован в буфер обмена!");
            tgHaptic('success');
            playSound('win');
        }).catch(() => {
            area.select();
            document.execCommand('copy');
            showToast("Код скопирован!");
        });
    } else {
        area.select();
        document.execCommand('copy');
        showToast("Код скопирован!");
    }
}

function importSaveCodeAction() {
    const area = document.getElementById('saveExportArea');
    if (!area || !area.value.trim()) return showToast("Вставьте код сохранения в поле!");

    try {
        let rawStr = area.value.trim();
        let jsonStr = "";
        try {
            jsonStr = decodeURIComponent(escape(atob(rawStr)));
        } catch(e) {
            jsonStr = rawStr;
        }

        const parsed = JSON.parse(jsonStr);
        if (!parsed.player || typeof parsed.player.cash !== 'number') {
            throw new Error("Неверный формат данных");
        }

        applyLoadedState(parsed);
        saveState();
        closeModal('modalSaveManager');
        location.reload();
    } catch(err) {
        tgHaptic('error');
        showToast("Ошибка импорта! Некорректный код сейва.");
    }
}

// ========================================================
// УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ И НАВИГАЦИЕЙ
// ========================================================
function updateHeaderUI() {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    let stars = (state.player && state.player.stars) ? state.player.stars : 0;
    let fuel = (state.player && state.player.fuel) ? state.player.fuel : 0;
    let tck = (state.player && state.player.expressTickets) ? state.player.expressTickets : 0;
    let mTck = (state.player && state.player.maxExpressTickets) ? state.player.maxExpressTickets : 25;
    let pName = (state.player && state.player.name) ? state.player.name : "Перекуп #777";
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    let conn = (state.player && state.player.connections) ? state.player.connections : 0;
    let karma = (state.player && state.player.karma) ? state.player.karma : 50;

    setTxt('cashAmount', cash.toLocaleString()); 
    setTxt('starsAmount', stars); 
    setTxt('fuelAmount', fuel);
    setTxt('ticketsAmount', tck + "/" + mTck);
    setTxt('playerName', pName); 
    setTxt('playerLvl', "Ур. " + lvl); 
    setTxt('connectionsText', conn); 
    setTxt('karmaText', karma);
    setTxt('reshalaConnectionsVal', conn + " 🤝");
    
    const pPhoto = document.getElementById('playerTgPhoto'); 
    const dIcon = document.getElementById('defaultAvatarIcon');
    if (state.player && state.player.avatarUrl) { 
        if (pPhoto) { pPhoto.src = state.player.avatarUrl; pPhoto.style.display = 'block'; }
        if (dIcon) dIcon.style.display = 'none'; 
    } else { 
        if (pPhoto) pPhoto.style.display = 'none'; 
        if (dIcon) dIcon.style.display = 'block'; 
    }
    
    const fill = document.getElementById('xpBar'); 
    if (fill) {
        let xp = (state.player && state.player.xp) ? state.player.xp : 0;
        let maxXp = (state.player && state.player.maxXp) ? state.player.maxXp : 120;
        let pct = Math.min(100, (xp / maxXp) * 100);
        fill.style.width = pct + "%";
    }
    
    let hng = (state.player && state.player.hunger) ? state.player.hunger : 80;
    setTxt('hungerText', hng + "%"); 
    const hFill = document.getElementById('hungerFill');
    if (hFill) hFill.style.width = hng + "%";

    let md = (state.player && state.player.mood) ? state.player.mood : 85;
    setTxt('moodText', md + "%"); 
    const mFill = document.getElementById('moodFill');
    if (mFill) mFill.style.width = md + "%";

    const vipBadge = document.getElementById('vipBadge');
    if (vipBadge) vipBadge.style.display = (state.player && state.player.vipPro) ? 'block' : 'none';

    let gLen = state.garage ? state.garage.length : 0;
    setTxt('garageHeaderSlots', gLen + "/" + getTotalGarageSlots());
    
    const slotCost = getGarageSlotCost();
    const btnSlot = document.getElementById('btnBuyGarageSlot');
    if (btnSlot) btnSlot.innerText = "+1 Бокс (" + (slotCost / 1000).toFixed(0) + "k ₽)";

    let debt = (state.player && state.player.loanDebt) ? state.player.loanDebt : 0;
    const loanEl = document.getElementById('loanDebtText');
    if (loanEl) loanEl.innerText = "Долг: " + debt.toLocaleString() + " ₽";

    updateRaceHeatBadge();
}

function updateRaceHeatBadge() {
    const heatBadge = document.getElementById('raceHeatBadge');
    if (!heatBadge) return;
    const curRaces = (state.player && state.player.consecutiveRaces) ? state.player.consecutiveRaces : 0;
    const maxRaces = (state.player && state.player.maxRacesBeforeRaid) ? state.player.maxRacesBeforeRaid : 12;
    heatBadge.innerText = "Внимание ДПС: " + curRaces + "/" + maxRaces;
    if (curRaces >= maxRaces - 2) {
        heatBadge.className = "tag-badge bg-tag-red";
    } else if (curRaces >= Math.floor(maxRaces / 2)) {
        heatBadge.className = "tag-badge bg-tag-amber";
    } else {
        heatBadge.className = "tag-badge bg-tag-green";
    }
}

function updateLevelGatesUI() {
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    const gates = [
        { id: 'moto', lockId: 'lock-moto', minLvl: 5, title: 'Мото' },
        { id: 'atv', lockId: 'lock-atv', minLvl: 8, title: 'Квадро' },
        { id: 'comfort', lockId: 'lock-comfort', minLvl: 30, title: 'Комфорт' },
        { id: 'premium', lockId: 'lock-premium', minLvl: 30, title: 'Премиум' },
        { id: 'hyper', lockId: 'lock-hyper', minLvl: 50, title: 'Гиперкары' },
        { id: 'truck', lockId: 'lock-truck', minLvl: 50, title: 'Грузовики' },
        { id: 'yacht', lockId: 'lock-yacht', minLvl: 100, title: 'Яхты' }
    ];

    gates.forEach(g => {
        const btn = document.getElementById("catBtn-" + g.id);
        const sub = document.getElementById(g.lockId);
        if (btn && sub) {
            if (lvl >= g.minLvl) {
                btn.classList.remove('locked');
                sub.innerHTML = "Доступен";
                sub.style.color = "var(--green)";
            } else {
                btn.classList.add('locked');
                sub.innerHTML = "<i class='fa-solid fa-lock'></i> " + g.minLvl + " ур";
                sub.style.color = "#f87171";
            }
        }
    });
}

function addXp(amount) {
    state.player.xp += amount;
    if (state.player.xp >= state.player.maxXp) { 
        state.player.xp -= state.player.maxXp; 
        state.player.level += 1; 
        state.player.maxXp = Math.round(state.player.maxXp * 1.35); 
        openVerdictModal("Новый уровень!", "Вы достигли " + state.player.level + " уровня авторитета!", true); 
    }
    updateLevelGatesUI(); 
    if (typeof checkReshalaAccess === 'function') checkReshalaAccess();
    saveState();
}

function adjustResource(type, delta) {
    if (!state.player) return;
    
    if (type === 'cash') {
        let cur = state.player.cash ? state.player.cash : 0;
        state.player.cash = Math.max(0, cur + delta);
        showToast((delta > 0 ? "+" : "") + delta.toLocaleString() + " ₽");
    } else if (type === 'level') {
        let cur = state.player.level ? state.player.level : 1;
        state.player.level = Math.max(1, Math.min(100, cur + delta));
        updateLevelGatesUI();
        if (typeof checkReshalaAccess === 'function') checkReshalaAccess();
        showToast((delta > 0 ? "+" : "") + delta + " Ур");
    } else if (type === 'stars') {
        let cur = state.player.stars ? state.player.stars : 0;
        state.player.stars = Math.max(0, cur + delta);
        showToast((delta > 0 ? "+" : "") + delta + " Stars ⭐");
    } else if (type === 'tickets') {
        let cur = state.player.expressTickets ? state.player.expressTickets : 0;
        let max = state.player.maxExpressTickets ? state.player.maxExpressTickets : 25;
        state.player.expressTickets = Math.max(0, Math.min(max, cur + delta));
        showToast((delta > 0 ? "+" : "") + delta + " Талонов 🎟️");
    } else if (type === 'connections') {
        let cur = state.player.connections ? state.player.connections : 0;
        state.player.connections = Math.max(0, cur + delta);
        showToast((delta > 0 ? "+" : "") + delta + " Связей 🤝");
    }
    
    saveState();
    updateHeaderUI();
    if (typeof renderProfileAnalytics === 'function') renderProfileAnalytics();
}

function openDailyBonusModal() {
    const grid = document.getElementById('dailyBonusGrid');
    if (!grid || typeof DAILY_REWARDS_CONFIG === 'undefined') return;

    let sDay = state.player.streakDay ? state.player.streakDay : 1;
    let html = "";
    DAILY_REWARDS_CONFIG.forEach(r => {
        let isClaimed = sDay > r.day;
        let isCurrent = sDay === r.day;
        let cName = "daily-streak-day" + (isClaimed ? " claimed" : "") + (isCurrent ? " current" : "");
        let sym = isClaimed ? "✓" : (isCurrent ? "★" : "🔒");

        html += 
        "<div class='" + cName + "'>" +
            "<div class='font-bold text-xs'>День " + r.day + "</div>" +
            "<div class='sub-label my-1'>" + r.title + "</div>" +
            "<div>" + sym + "</div>" +
        "</div>";
    });
    grid.innerHTML = html;

    const claimBtn = document.getElementById('btnClaimDaily');
    if (claimBtn) {
        let last = state.player.lastClaimedDay ? state.player.lastClaimedDay : 0;
        let pDay = state.player.day ? state.player.day : 1;
        let canClaim = last < pDay;
        claimBtn.disabled = !canClaim;
        claimBtn.innerText = canClaim ? "Забрать награду" : "Уже получено сегодня";
    }

    const mod = document.getElementById('modalDailyBonus');
    if (mod) mod.classList.add('active');
}

function claimDailyReward() {
    let last = state.player.lastClaimedDay ? state.player.lastClaimedDay : 0;
    let pDay = state.player.day ? state.player.day : 1;
    if (last >= pDay) return showToast("Награда за сегодня уже забрана!");

    let sDay = state.player.streakDay ? state.player.streakDay : 1;
    let currentReward = DAILY_REWARDS_CONFIG.find(r => r.day === sDay);
    if (!currentReward) currentReward = DAILY_REWARDS_CONFIG[0];
    
    const r = currentReward.reward;
    if (r.cash) state.player.cash += r.cash;
    if (r.fuel) state.player.fuel = Math.min(100, state.player.fuel + r.fuel);
    if (r.connections) state.player.connections = (state.player.connections || 0) + r.connections;
    if (r.stars) state.player.stars += r.stars;
    if (r.specialPlate) {
        if (!state.ownedPlates) state.ownedPlates = [];
        state.ownedPlates.push(r.specialPlate);
    }

    state.player.lastClaimedDay = pDay;
    state.player.streakDay = (sDay % 7) + 1;

    saveState();
    closeModal('modalDailyBonus');
    playSound('win');
    tgHaptic('success');
    openVerdictModal("БОНУС ПОЛУЧЕН! 🎁", "Вам начислено: " + currentReward.title, true);
}

function switchTab(tabId) {
    initAudio(); 
    playSound('tick'); 
    tgHaptic('light'); 
    
    document.querySelectorAll('.tab-screen').forEach(el => el.classList.remove('active')); 
    const tb = document.getElementById(tabId);
    if (tb) tb.classList.add('active'); 
    
    document.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active')); 
    const targetNavBtn = document.querySelector(".sub-nav-btn.nav-" + tabId);
    if (targetNavBtn) {
        targetNavBtn.classList.add('active');
        targetNavBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    
    document.querySelectorAll('.b-nav-item').forEach(b => b.classList.remove('active'));
    
    if (tabId === 'tabMarket') { const el = document.getElementById('bnav-tabMarket'); if (el) el.classList.add('active'); }
    else if (tabId === 'tabGarage') { const el = document.getElementById('bnav-tabGarage'); if (el) el.classList.add('active'); }
    else if (tabId === 'tabSalesLot') { const el = document.getElementById('bnav-tabSalesLot'); if (el) el.classList.add('active'); }
    else if (tabId === 'tabSyndicate') { const el = document.getElementById('bnav-tabSyndicate'); if (el) el.classList.add('active'); }
    else { const el = document.getElementById('bnav-tabLife'); if (el) el.classList.add('active'); }

    // Безопасный вызов рендеров из других модулей
    if (tabId === 'tabMarket' && typeof renderMarketFeed === 'function') renderMarketFeed();
    if (tabId === 'tabGarage' && typeof renderGarage === 'function') renderGarage(); 
    if (tabId === 'tabSalesLot' && typeof renderSalesLot === 'function') renderSalesLot();
    
    if (tabId === 'tabStreet' && typeof renderStreetScreen === 'function' && typeof renderStreetEvents === 'function') {
        renderStreetScreen();
        renderStreetEvents();
    }
    
    if (tabId === 'tabShop' && typeof switchShopSection === 'function') switchShopSection('tools');
    if (tabId === 'tabReshala' && typeof checkReshalaAccess === 'function') checkReshalaAccess();
    if (tabId === 'tabContainers' && typeof renderContainersList === 'function') renderContainersList();
    if (tabId === 'tabContracts' && typeof renderContracts === 'function') renderContracts();
    if (tabId === 'tabBarn' && typeof renderBarnFind === 'function') renderBarnFind();
    
    if (tabId === 'tabLife') {
        if (typeof renderDiets === 'function') renderDiets(); 
        if (typeof renderLifeChat === 'function') renderLifeChat();
        if (typeof checkBusinessAccess === 'function') checkBusinessAccess();
    }
    
    if (tabId === 'tabServices') { 
        if (typeof initWheelModule === 'function') initWheelModule(); 
        if (typeof initCasino === 'function') initCasino(); 
    }
    
    if (tabId === 'tabHousing' && typeof renderHousing === 'function') renderHousing();
    if (tabId === 'tabSyndicate' && typeof renderSyndicateHub === 'function') renderSyndicateHub();
    if (tabId === 'tabProfile' && typeof renderProfileAnalytics === 'function') renderProfileAnalytics();
}

function checkAutoShowPatchNotes() {
    try {
        const lastSeen = localStorage.getItem('perekup_last_seen_version');
        if (lastSeen !== CURRENT_GAME_VERSION) {
            setTimeout(() => { openPatchNotesModal(); }, 800);
        }
    } catch(e) {}
}

// ========================================================
// ИНИЦИАЛИЗАЦИЯ И НАДЕЖНЫЙ ИГРОВОЙ ЦИКЛ (TICK)
// ========================================================
function initApp() {
    initTelegramAuthAndStorage(() => {
        updateHeaderUI();
        updateLevelGatesUI();
        
        if (!state.marketFeed || state.marketFeed.length === 0) {
            if (typeof populateMarketFeed === 'function') populateMarketFeed();
        }
        if (!state.plateCatalog || state.plateCatalog.length === 0) {
            if (typeof refreshPlateCatalog === 'function') refreshPlateCatalog();
        }
        if (!state.contracts || state.contracts.length === 0) {
            if (typeof generateContracts === 'function') generateContracts();
        }

        if (typeof checkReshalaAccess === 'function') checkReshalaAccess();
        if (typeof renderGarage === 'function') renderGarage(); 
        if (typeof renderSalesLot === 'function') renderSalesLot();
        if (typeof renderDiets === 'function') renderDiets(); 
        if (typeof renderHousing === 'function') renderHousing(); 
        if (typeof renderContracts === 'function') renderContracts(); 
        if (typeof renderContainersList === 'function') renderContainersList(); 
        if (typeof renderBarnFind === 'function') renderBarnFind();
        if (typeof checkBusinessAccess === 'function') checkBusinessAccess();
        
        switchTab('tabMarket');
        checkAutoShowPatchNotes();
    });
}

setInterval(() => {
    let lotChanged = false; 
    
    // НАДЕЖНАЯ ЛОГИКА ТАЙМЕРОВ ПЛОЩАДКИ
    if (state.salesLot && state.salesLot.length > 0) {
        // Проходим с конца, чтобы удаление (splice) не сбивало индексы цикла!
        for (let i = state.salesLot.length - 1; i >= 0; i--) {
            let slot = state.salesLot[i];
            if (!slot) continue;

            if (!slot.currentBuyer) {
                // АВТО-РЕМОНТ: если загружен старый сейв или кривые таймеры
                if (slot.timer === undefined || isNaN(slot.timer) || slot.maxTimer === undefined || isNaN(slot.maxTimer) || slot.timer > slot.maxTimer) {
                    let t = Math.floor(60 + Math.random() * 180);
                    slot.maxTimer = t;
                    slot.timer = t;
                }

                if (slot.timer > 0) {
                    slot.timer -= 1;
                    const progressBar = document.getElementById("lot_progress_fill_" + i);
                    const timerText = document.getElementById("lot_timer_text_" + i);
                    
                    if (progressBar) {
                        let pct = Math.max(0, Math.min(100, ((slot.maxTimer - slot.timer) / slot.maxTimer) * 100));
                        progressBar.style.width = pct + "%";
                    }
                    if (timerText) timerText.innerText = "Ожидание клиента: " + slot.timer + "с";
                }

                if (slot.timer <= 0) {
                    if (typeof generateBuyerForSlot === 'function') generateBuyerForSlot(slot);
                    lotChanged = true;
                }
            } else {
                // Логика когда покупатель уже у капота (уходит через X секунд)
                if (slot.buyerTimerLeft === undefined || isNaN(slot.buyerTimerLeft)) {
                    slot.buyerTimerLeft = 120;
                }
                
                if (slot.buyerTimerLeft > 0) {
                    slot.buyerTimerLeft -= 1;
                    const buyerTimeText = document.getElementById("lot_buyer_timer_" + i);
                    if (buyerTimeText) buyerTimeText.innerText = "⏳ " + slot.buyerTimerLeft + "с";
                }

                if (slot.buyerTimerLeft <= 0) {
                    state.salesLot.splice(i, 1);
                    lotChanged = true;
                    showToast("🚶‍♂️ Покупатель не дождался вас и ушел к другому перекупу.");
                }
            }
        }
    }
    
    const sTab = document.getElementById('tabSalesLot');
    if (lotChanged && sTab && sTab.classList.contains('active') && typeof renderSalesLot === 'function') {
        renderSalesLot();
    }
    
    // Восстановление бензина
    let pFuel = (state.player && state.player.fuel !== undefined) ? state.player.fuel : 100;
    if (pFuel < 100) {
        state.player.fuel = Math.min(100, pFuel + 1);
        setTxt('fuelAmount', state.player.fuel);
    }
    
    // Обновление таймеров рынка (дозвон продавцу)
    const mTab = document.getElementById('tabMarket');
    if (mTab && mTab.classList.contains('active') && typeof updateMarketTimers === 'function') {
        updateMarketTimers();
    }
}, 1000);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
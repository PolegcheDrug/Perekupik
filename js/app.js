// ========================================================
// js/app.js — ЯДРО, TELEGRAM CLOUD STORAGE & FIREBASE (v0.4.5)
// Полная переоценка гаража, синхронизация и патчноут
// ========================================================

const CURRENT_GAME_VERSION = "v0.4.5";

let ACtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

let tgUserId = "guest_777";
let tgUserData = null; // Реальные данные пользователя Telegram
let SAVE_KEY_PREFIX = "perekup_v4_";
let cloudSaveDebounceTimer = null;
let isCloudStorageAvailable = false;

// ========================================================
// ЗВУК И ТАКТИЛЬНЫЙ ОТКЛИК (HAPTICS)
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
    } catch(e) {}
}

function initAudio() {
    if (!audioCtx) audioCtx = new ACtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    try {
        initAudio();
        const now = audioCtx.currentTime;
        if (type === 'tick') {
            const osc = audioCtx.createOscillator();
            const g = audioGain = audioCtx.createGain();
            osc.connect(g); g.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(800, now);
            g.gain.setValueAtTime(0.05, now);
            g.gain.linearRampToValueAtTime(0, now + 0.03);
            osc.start(now); osc.stop(now + 0.03);
        } else if (type === 'win') {
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.connect(g); g.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
            g.gain.setValueAtTime(0.2, now);
            g.gain.linearRampToValueAtTime(0, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
        } else if (type === 'error') {
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.connect(g); g.connect(audioCtx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
            g.gain.setValueAtTime(0.15, now);
            g.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
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
        osc.connect(g); g.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.45);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.9);
        g.gain.setValueAtTime(0.25, now);
        g.gain.linearRampToValueAtTime(0, now + 0.95);
        osc.start(now); osc.stop(now + 0.95);
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
    setTimeout(() => { t.classList.remove('show'); }, 2500);
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
// ИГРОВОЙ STATE
// ========================================================
const DEFAULT_STATE = {
    player: { 
        name: "Перекуп #777", avatarUrl: null, cash: 150000, stars: 15, connections: 1, 
        expressTickets: 25, maxExpressTickets: 25, fuel: 100, level: 1, xp: 0, maxXp: 120, 
        baseSlots: 2, vip: false, vipPro: false, lastFreeSpinDay: 0, club: null, karma: 50, 
        streetCred: 100,
        stats: { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0, scandalsAvoided: 0 }, 
        hunger: 80, mood: 85, loanDebt: 0, day: 1, streakDay: 1, lastClaimedDay: 0, 
        diet: 'shaurma', housingId: 'room', housingType: 'rent', ownedHouses: [], selectedStreetCarIndex: 0, 
        lastBarnDay: 0, preSalesCount: 0, preSaleCooldownUntil: 0, policeImmunityDays: 0,
        hasRacingLicense: false, consecutiveRaces: 0, maxRacesBeforeRaid: 12,
        safeDeposit: 0, trafficFines: 0,
        tools: { gauge: false, gauge_pro: false, obd: false, obd_launch: false, endoscope: false, compressor: false, battery_tester: false },
        furniture: [],
        phoneMessages: []
    },
    garage: [], salesLot: [], contracts: [], plateCatalog: [], 
    ownedPlates: ["В777ВВ 77"], registeredPlates: ["В777ВВ 77"],
    activeCategory: 'economy', marketFeed: [], p2pMode: 'cars', syndicateSubTab: 'contracts', 
    myP2PListings: [], p2pMarketListings: [], businesses: [], confiscatedLot: null, blackMarketPlates: [],
    marketModifiers: { economy: 1, comfort: 1, premium: 1, all: 1 },
    lifeChatMessages: [], friendsList: []
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

function getGarageSlotCost() {
    let bs = state.player?.baseSlots || 2;
    let extraSlots = Math.max(0, bs - 2);
    return Math.round(250000 * Math.pow(1.65, extraSlots));
}

function getExpressTicketUpgradeCost() {
    let m = state.player?.maxExpressTickets || 25;
    let extra = Math.max(0, m - 25);
    const steps = Math.floor(extra / 25);
    return Math.round(50000 * Math.pow(1.5, steps));
}

function getTotalGarageSlots() {
    let slots = state.player?.baseSlots || 2;
    if (typeof HOUSING_LIST !== 'undefined' && Array.isArray(HOUSING_LIST)) {
        if (state.player?.housingId) {
            const house = HOUSING_LIST.find(h => h.id === state.player.housingId); 
            if (house) slots += (house.slots || 0);
        }
        if (state.player?.ownedHouses && Array.isArray(state.player.ownedHouses)) {
            state.player.ownedHouses.forEach(hId => { 
                const oh = HOUSING_LIST.find(h => h.id === hId); 
                if (oh) slots += (oh.slots || 0); 
            }); 
        }
    }
    return slots;
}

// ========================================================
// TELEGRAM CLOUD STORAGE ЧАНКИНГ
// ========================================================
const CHUNK_SIZE = 3600;

function prepareStateForCloud() {
    const copy = JSON.parse(JSON.stringify(state));
    copy.marketFeed = [];
    return JSON.stringify(copy);
}

function saveToTelegramCloud(jsonString, callback) {
    if (!window.Telegram?.WebApp?.CloudStorage) return;
    const tgCloud = window.Telegram.WebApp.CloudStorage;
    const totalChunks = Math.ceil(jsonString.length / CHUNK_SIZE);
    
    tgCloud.setItem(SAVE_KEY_PREFIX + tgUserId + "_meta", String(totalChunks), (err) => {
        if (err) {
            if (callback) callback(false);
            return;
        }
        let completed = 0;
        for (let i = 0; i < totalChunks; i++) {
            const chunk = jsonString.substr(i * CHUNK_SIZE, CHUNK_SIZE);
            tgCloud.setItem(SAVE_KEY_PREFIX + tgUserId + "_c" + i, chunk, (cErr) => {
                if (!cErr) completed++;
                if (completed === totalChunks && callback) {
                    callback(true);
                }
            });
        }
    });
}

function loadFromTelegramCloud(callback) {
    if (!window.Telegram?.WebApp?.CloudStorage) {
        callback(null);
        return;
    }
    const tgCloud = window.Telegram.WebApp.CloudStorage;
    tgCloud.getItem(SAVE_KEY_PREFIX + tgUserId + "_meta", (err, metaVal) => {
        if (err || !metaVal) {
            callback(null);
            return;
        }
        const totalChunks = parseInt(metaVal);
        if (isNaN(totalChunks) || totalChunks <= 0) {
            callback(null);
            return;
        }

        const keys = [];
        for (let i = 0; i < totalChunks; i++) {
            keys.push(SAVE_KEY_PREFIX + tgUserId + "_c" + i);
        }

        tgCloud.getItems(keys, (gErr, values) => {
            if (gErr || !values) {
                callback(null);
                return;
            }
            let fullStr = "";
            for (let i = 0; i < totalChunks; i++) {
                const k = SAVE_KEY_PREFIX + tgUserId + "_c" + i;
                if (!values[k]) {
                    callback(null);
                    return;
                }
                fullStr += values[k];
            }
            try {
                const parsed = JSON.parse(fullStr);
                callback(parsed);
            } catch(e) {
                callback(null);
            }
        });
    });
}

function initTelegramAuthAndStorage(callback) {
    let callbackCalled = false;
    const safeCallback = () => {
        if (!callbackCalled) {
            callbackCalled = true;
            if (callback) callback();
        }
    };

    const fallbackTimer = setTimeout(() => {
        if (!callbackCalled) {
            loadFromLocalStorage();
            safeCallback();
        }
    }, 1200);

    try {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();

            if (tg.initDataUnsafe?.user) {
                tgUserData = tg.initDataUnsafe.user;
                tgUserId = String(tgUserData.id);
            }

            if (tg.CloudStorage && typeof tg.CloudStorage.getItem === 'function') {
                isCloudStorageAvailable = true;
                const statusEl = document.getElementById('cloudStorageStatus');
                if (statusEl) {
                    statusEl.innerText = "TG Cloud: Загрузка...";
                    statusEl.className = "tag-badge bg-tag-cyan";
                }

                loadFromTelegramCloud((cloudData) => {
                    clearTimeout(fallbackTimer);
                    if (cloudData) {
                        applyLoadedState(cloudData);
                        if (statusEl) {
                            statusEl.innerText = "TG Cloud: Синхронно";
                            statusEl.className = "tag-badge bg-tag-green";
                        }
                        safeCallback();
                    } else {
                        loadFromLocalStorage();
                        safeCallback();
                    }
                });
                return;
            }
        }
    } catch(e) {
        console.error("TG Init error:", e);
    }

    clearTimeout(fallbackTimer);
    loadFromLocalStorage();
    safeCallback();
}

function loadFromLocalStorage() {
    try {
        let saved = localStorage.getItem("perekup_save_" + tgUserId);
        if (!saved) saved = localStorage.getItem('perekoop_sim_save_v105_release');
        if (saved) applyLoadedState(JSON.parse(saved));
        else applyLoadedState({});
    } catch(e) {}
}

function applyLoadedState(parsed) {
    if (!parsed) parsed = {};
    if (parsed.player) {
        state.player = { ...DEFAULT_STATE.player, ...parsed.player };
        if (parsed.player.stats) state.player.stats = { ...DEFAULT_STATE.player.stats, ...parsed.player.stats };
        if (parsed.player.tools) state.player.tools = { ...DEFAULT_STATE.player.tools, ...parsed.player.tools };
        if (Array.isArray(parsed.player.phoneMessages)) state.player.phoneMessages = parsed.player.phoneMessages;
    }
    if (Array.isArray(parsed.garage)) state.garage = parsed.garage;
    if (Array.isArray(parsed.salesLot)) state.salesLot = parsed.salesLot;
    if (Array.isArray(parsed.contracts)) state.contracts = parsed.contracts;
    if (Array.isArray(parsed.ownedPlates)) state.ownedPlates = parsed.ownedPlates;
    if (Array.isArray(parsed.registeredPlates)) state.registeredPlates = parsed.registeredPlates;
    if (Array.isArray(parsed.businesses)) state.businesses = parsed.businesses;
    if (parsed.marketModifiers) state.marketModifiers = parsed.marketModifiers;
    if (Array.isArray(parsed.myP2PListings)) state.myP2PListings = parsed.myP2PListings;
    if (Array.isArray(parsed.p2pMarketListings)) state.p2pMarketListings = parsed.p2pMarketListings;
    if (parsed.confiscatedLot) state.confiscatedLot = parsed.confiscatedLot;
    if (Array.isArray(parsed.marketFeed)) state.marketFeed = parsed.marketFeed;
    if (Array.isArray(parsed.blackMarketPlates)) state.blackMarketPlates = parsed.blackMarketPlates;
    
    if (tgUserData) {
        let names = [];
        if (tgUserData.first_name) names.push(tgUserData.first_name);
        if (tgUserData.last_name) names.push(tgUserData.last_name);
        const fullName = names.join(' ').trim();

        if (fullName) state.player.name = fullName;
        else if (tgUserData.username) state.player.name = "@" + tgUserData.username;
        if (tgUserData.photo_url) state.player.avatarUrl = tgUserData.photo_url;
    }

    sanitizeState();
}

function sanitizeState() {
    if (!state.player.baseSlots || state.player.baseSlots < 2) state.player.baseSlots = 2;
    if (!state.player.maxExpressTickets) state.player.maxExpressTickets = 25;
    if (typeof state.player.expressTickets !== 'number') state.player.expressTickets = state.player.maxExpressTickets;
    if (typeof state.player.policeImmunityDays !== 'number') state.player.policeImmunityDays = 0;
    if (typeof state.player.consecutiveRaces !== 'number') state.player.consecutiveRaces = 0;
    if (typeof state.player.maxRacesBeforeRaid !== 'number') state.player.maxRacesBeforeRaid = Math.floor(10 + Math.random() * 5);
    if (typeof state.player.streetCred !== 'number') state.player.streetCred = 100;
    if (!Array.isArray(state.player.ownedHouses)) state.player.ownedHouses = [];
    if (!Array.isArray(state.player.furniture)) state.player.furniture = [];
    if (!Array.isArray(state.player.phoneMessages)) state.player.phoneMessages = [];
    if (!Array.isArray(state.registeredPlates)) state.registeredPlates = ["В777ВВ 77"];
    if (!Array.isArray(state.p2pMarketListings)) state.p2pMarketListings = [];
    if (typeof state.player.cash !== 'number' || state.player.cash < 0) state.player.cash = 150000;
    if (typeof state.player.loanDebt !== 'number' || state.player.loanDebt < 0) state.player.loanDebt = 0;
    if (typeof state.player.safeDeposit !== 'number') state.player.safeDeposit = 0;
    if (typeof state.player.fuel !== 'number') state.player.fuel = 100;
    if (typeof state.player.karma !== 'number') state.player.karma = 50;
    if (!state.player.tools) state.player.tools = { gauge: false, gauge_pro: false, obd: false, obd_launch: false, endoscope: false, compressor: false, battery_tester: false };
    
    if (state.businesses && typeof BUSINESS_DATA !== 'undefined') {
        state.businesses.forEach(b => {
            const template = BUSINESS_DATA.find(d => d.id === b.id);
            if (template) {
                b.img = template.img;
                if (!b.perk) b.perk = template.perk;
            }
        });
    }

    if (state.garage && Array.isArray(state.garage)) {
        state.garage.forEach(car => {
            if (car && !car.tuning) {
                car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 };
            }
            if (car && car.insurance === undefined) car.insurance = null;
            if (car && car.isPersonal === undefined) car.isPersonal = false;

            // Автоматическая переоценка всех машин в гараже при загрузке v0.4.5
            if (typeof recalculateCarMarketValue === 'function') {
                recalculateCarMarketValue(car);
            }
        });
    }

    if (!state.businesses || state.businesses.length === 0) {
        if (typeof BUSINESS_DATA !== 'undefined') {
            state.businesses = JSON.parse(JSON.stringify(BUSINESS_DATA));
        }
    }
}

function saveState() {
    try {
        const fullJson = JSON.stringify(state);
        localStorage.setItem("perekup_save_" + tgUserId, fullJson);

        if (isCloudStorageAvailable) {
            if (cloudSaveDebounceTimer) clearTimeout(cloudSaveDebounceTimer);
            cloudSaveDebounceTimer = setTimeout(() => {
                const cloudJson = prepareStateForCloud();
                saveToTelegramCloud(cloudJson, (success) => {
                    const statusEl = document.getElementById('cloudStorageStatus');
                    if (statusEl) {
                        statusEl.innerText = success ? "TG Cloud: Синхронно" : "TG Cloud: Ошибка";
                        statusEl.className = success ? "tag-badge bg-tag-green" : "tag-badge bg-tag-red";
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
    } catch(e) {}
    updateHeaderUI();
}

function resetGameData() {
    if (!confirm("Внимание! Вы уверены, что хотите полностью стереть весь прогресс, гараж, бизнес и начать заново? Это действие необратимо!")) {
        return;
    }

    try {
        localStorage.removeItem("perekup_save_" + tgUserId);
        localStorage.removeItem('perekoop_sim_save_v105_release');
        localStorage.removeItem('perekup_last_seen_version');

        const cleanState = JSON.parse(JSON.stringify(DEFAULT_STATE));
        const cleanJson = JSON.stringify(cleanState);

        if (isCloudStorageAvailable && window.Telegram?.WebApp?.CloudStorage) {
            saveToTelegramCloud(cleanJson, () => {
                console.log("TG Cloud очищен.");
            });
        }

        if (window.FB_Bridge && typeof window.FB_Bridge.CloudSave?.pushSave === 'function') {
            window.FB_Bridge.CloudSave.pushSave(tgUserId, cleanState);
        }

        tgHaptic('warning');
        showToast("Прогресс сброшен. Перезагрузка...");
        setTimeout(() => {
            location.reload();
        }, 600);
    } catch(e) {
        location.reload();
    }
}

function syncCloudStorageManual() {
    if (!isCloudStorageAvailable) return showToast("Telegram Cloud недоступен в браузере!");
    const cloudJson = prepareStateForCloud();
    saveToTelegramCloud(cloudJson, (success) => {
        if (success) {
            playSound('win'); tgHaptic('success');
            showToast("Облако Telegram успешно синхронизировано!");
        } else {
            tgHaptic('error');
            showToast("Ошибка сохранения в облако Telegram.");
        }
    });
}

function openSaveManagerModal() {
    const area = document.getElementById('saveExportArea');
    if (area) {
        try { area.value = btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
        catch(e) { area.value = JSON.stringify(state); }
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
            showToast("Код сейва скопирован!"); tgHaptic('success'); playSound('win');
        }).catch(() => { area.select(); document.execCommand('copy'); showToast("Код скопирован!"); });
    } else {
        area.select(); document.execCommand('copy'); showToast("Код скопирован!");
    }
}

function importSaveCodeAction() {
    const area = document.getElementById('saveExportArea');
    if (!area || !area.value.trim()) return showToast("Вставьте код сохранения!");
    try {
        let rawStr = area.value.trim();
        let jsonStr = "";
        try { jsonStr = decodeURIComponent(escape(atob(rawStr))); }
        catch(e) { jsonStr = rawStr; }

        const parsed = JSON.parse(jsonStr);
        if (!parsed.player) throw new Error();
        applyLoadedState(parsed);
        saveState();
        closeModal('modalSaveManager');
        location.reload();
    } catch(err) {
        tgHaptic('error'); showToast("Некорректный код сейва!");
    }
}

// ========================================================
// UI И РЕСУРСЫ
// ========================================================
function updateHeaderUI() {
    let cash = state.player?.cash || 0;
    let stars = state.player?.stars || 0;
    let fuel = state.player?.fuel !== undefined ? state.player.fuel : 100;
    let tck = state.player?.expressTickets || 0;
    let mTck = state.player?.maxExpressTickets || 25;
    let pName = state.player?.name || "Перекуп #777";
    let lvl = state.player?.level || 1;
    let conn = state.player?.connections || 0;
    let karma = Math.max(0, Math.min(100, state.player?.karma !== undefined ? state.player.karma : 50));

    setTxt('cashAmount', cash.toLocaleString()); 
    setTxt('starsAmount', stars); 
    setTxt('fuelAmount', fuel);
    setTxt('ticketsAmount', tck + "/" + mTck);
    setTxt('playerName', pName); 
    setTxt('playerLvl', "Ур. " + lvl); 
    setTxt('connectionsText', conn); 
    setTxt('karmaText', karma);
    
    const pPhoto = document.getElementById('playerTgPhoto'); 
    const dIcon = document.getElementById('defaultAvatarIcon');
    if (state.player?.avatarUrl) { 
        if (pPhoto) { pPhoto.src = state.player.avatarUrl; pPhoto.style.display = 'block'; }
        if (dIcon) dIcon.style.display = 'none'; 
    } else { 
        if (pPhoto) pPhoto.style.display = 'none'; 
        if (dIcon) dIcon.style.display = 'block'; 
    }
    
    const fill = document.getElementById('xpBar'); 
    if (fill) {
        let xp = state.player?.xp || 0;
        let maxXp = state.player?.maxXp || 120;
        fill.style.width = Math.min(100, (xp / maxXp) * 100) + "%";
    }
    
    let hng = state.player?.hunger || 80;
    setTxt('hungerText', hng + "%"); 
    const hFill = document.getElementById('hungerFill');
    if (hFill) hFill.style.width = hng + "%";

    let md = state.player?.mood || 85;
    setTxt('moodText', md + "%"); 
    const mFill = document.getElementById('moodFill');
    if (mFill) mFill.style.width = md + "%";

    const vipBadge = document.getElementById('vipBadge');
    if (vipBadge) vipBadge.style.display = state.player?.vipPro ? 'block' : 'none';

    let gLen = state.garage ? state.garage.length : 0;
    setTxt('garageHeaderSlots', gLen + "/" + getTotalGarageSlots());
    
    const slotCost = getGarageSlotCost();
    const btnSlot = document.getElementById('btnBuyGarageSlot');
    if (btnSlot) btnSlot.innerText = "+1 Бокс (" + (slotCost / 1000).toFixed(0) + "k ₽)";

    updateRaceHeatBadge();
    if (typeof PhoneManager !== 'undefined') PhoneManager.updateUnreadBadge();
}

function updateRaceHeatBadge() {
    const heatBadge = document.getElementById('raceHeatBadge');
    if (!heatBadge) return;
    const curRaces = state.player?.consecutiveRaces || 0;
    const maxRaces = state.player?.maxRacesBeforeRaid || 12;
    heatBadge.innerText = "Внимание ДПС: " + curRaces + "/" + maxRaces;
    if (curRaces >= maxRaces - 2) heatBadge.className = "tag-badge bg-tag-red";
    else if (curRaces >= Math.floor(maxRaces / 2)) heatBadge.className = "tag-badge bg-tag-amber";
    else heatBadge.className = "tag-badge bg-tag-green";
}

function updateLevelGatesUI() {
    let lvl = state.player?.level || 1;
    const gates = [
        { id: 'moto', lockId: 'lock-moto', minLvl: 5 },
        { id: 'atv', lockId: 'lock-atv', minLvl: 8 },
        { id: 'comfort', lockId: 'lock-comfort', minLvl: 30 },
        { id: 'premium', lockId: 'lock-premium', minLvl: 30 },
        { id: 'hyper', lockId: 'lock-hyper', minLvl: 50 },
        { id: 'truck', lockId: 'lock-truck', minLvl: 50 },
        { id: 'yacht', lockId: 'lock-yacht', minLvl: 100 }
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
    saveState();
}

function adjustResource(type, delta) {
    if (!state.player) return;
    if (type === 'cash') {
        state.player.cash = Math.max(0, (state.player.cash || 0) + delta);
        showToast((delta > 0 ? "+" : "") + delta.toLocaleString() + " ₽");
    } else if (type === 'level') {
        state.player.level = Math.max(1, Math.min(100, (state.player.level || 1) + delta));
        updateLevelGatesUI();
        showToast((delta > 0 ? "+" : "") + delta + " Ур");
    } else if (type === 'stars') {
        state.player.stars = Math.max(0, (state.player.stars || 0) + delta);
        showToast((delta > 0 ? "+" : "") + delta + " Stars ⭐");
    } else if (type === 'tickets') {
        let max = state.player.maxExpressTickets || 25;
        state.player.expressTickets = Math.max(0, Math.min(max, (state.player.expressTickets || 0) + delta));
        showToast((delta > 0 ? "+" : "") + delta + " Талонов 🎟️");
    } else if (type === 'connections') {
        state.player.connections = Math.max(0, (state.player.connections || 0) + delta);
        showToast((delta > 0 ? "+" : "") + delta + " Связей 🤝");
    }
    saveState();
    updateHeaderUI();
    renderProfileAnalytics();
}

function openDailyBonusModal() {
    const grid = document.getElementById('dailyBonusGrid');
    if (!grid || typeof DAILY_REWARDS_CONFIG === 'undefined') return;
    let sDay = state.player.streakDay || 1;
    let html = "";
    DAILY_REWARDS_CONFIG.forEach(r => {
        let isClaimed = sDay > r.day;
        let isCurrent = sDay === r.day;
        let cName = "daily-streak-day" + (isClaimed ? " claimed" : "") + (isCurrent ? " current" : "");
        let sym = isClaimed ? "✓" : (isCurrent ? "★" : "🔒");
        html += `<div class='${cName}'><div class='font-bold text-xs'>День ${r.day}</div><div class='sub-label my-1'>${r.title}</div><div>${sym}</div></div>`;
    });
    grid.innerHTML = html;

    const claimBtn = document.getElementById('btnClaimDaily');
    if (claimBtn) {
        let last = state.player.lastClaimedDay || 0;
        let pDay = state.player.day || 1;
        let canClaim = last < pDay;
        claimBtn.disabled = !canClaim;
        claimBtn.innerText = canClaim ? "Забрать награду" : "Уже получено сегодня";
    }
    const mod = document.getElementById('modalDailyBonus');
    if (mod) mod.classList.add('active');
}

function claimDailyReward() {
    let last = state.player.lastClaimedDay || 0;
    let pDay = state.player.day || 1;
    if (last >= pDay) return showToast("Награда уже получена сегодня!");

    let sDay = state.player.streakDay || 1;
    let currentReward = DAILY_REWARDS_CONFIG.find(r => r.day === sDay) || DAILY_REWARDS_CONFIG[0];
    const r = currentReward.reward;
    if (r.cash) state.player.cash += r.cash;
    if (r.fuel) state.player.fuel = Math.min(100, (state.player.fuel || 0) + r.fuel);
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
    playSound('win'); tgHaptic('success');
    openVerdictModal("БОНУС ПОЛУЧЕН! 🎁", "Вам начислено: " + currentReward.title, true);
}

// ========================================================
// МАГАЗИН ПЕРЕКУПА
// ========================================================
function switchShopSection(section) {
    ['tools', 'consumables', 'tuningParts', 'homeItems'].forEach(s => {
        const sec = document.getElementById('shopSec-' + s);
        const btn = document.getElementById('shopTab-' + s);
        if (sec) sec.style.display = (s === section) ? 'block' : 'none';
        if (btn) {
            btn.className = (s === section) ? 'btn btn-cyan btn-sm' : 'btn btn-dark btn-sm';
        }
    });

    if (section === 'tools') renderShopTools();
    if (section === 'consumables') renderShopConsumables();
    if (section === 'tuningParts') renderShopTuningParts();
    if (section === 'homeItems') renderShopHomeItems();
}

function renderShopTools() {
    const box = document.getElementById('shopToolsList');
    if (!box) return;
    const tools = (typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.tools) ? SHOP_CATALOG.tools : [];

    let html = "";
    tools.forEach(t => {
        let isOwned = !!(state.player.tools && state.player.tools[t.id]);
        let btn = isOwned 
            ? `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Куплено ✓</button>`
            : `<button onclick="buyToolAction('${t.id}', ${t.cost})" class="btn btn-cyan btn-sm btn-auto">${t.cost.toLocaleString()} ₽</button>`;
        html += `
        <div class="glass-card flex-between p-2 mb-2">
            <div style="flex:1; margin-right:8px;">
                <b class="text-xs color-cyan"><i class="fa-solid ${t.icon || 'fa-wrench'} mr-1"></i> ${t.name}</b>
                <div class="sub-label" style="font-size:10px;">${t.desc}</div>
            </div>
            ${btn}
        </div>`;
    });
    box.innerHTML = html;
}

function buyToolAction(toolId, cost) {
    let cash = state.player.cash || 0;
    if (cash < cost) return showToast("Не хватает денег на прибор!");
    state.player.cash -= cost;
    if (!state.player.tools) state.player.tools = {};
    state.player.tools[toolId] = true;
    saveState();
    renderShopTools();
    if (typeof renderContracts === 'function') renderContracts();
    playSound('win'); tgHaptic('success');
    showToast("Прибор куплен и добавлен в диагностический арсенал!");
}

function renderShopConsumables() {
    const box = document.getElementById('shopConsumablesList');
    if (!box) return;
    const packs = (typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.consumables) ? SHOP_CATALOG.consumables : [];

    let html = "";
    packs.forEach(p => {
        html += `
        <div class="glass-card flex-between p-2 mb-2">
            <div style="flex:1; margin-right:8px;">
                <b class="text-xs color-amber">${p.name}</b>
                <div class="sub-label" style="font-size:10px;">${p.desc}</div>
            </div>
            <button onclick="buyConsumableAction(${p.cost}, ${p.value})" class="btn btn-amber btn-sm btn-auto">${p.cost.toLocaleString()} ₽</button>
        </div>`;
    });
    box.innerHTML = html;
}

function buyConsumableAction(cost, val) {
    let cash = state.player.cash || 0;
    if (cash < cost) return showToast("Не хватает денег на партию сырья!");
    state.player.cash -= cost;
    if (state.businesses) {
        state.businesses.forEach(b => {
            b.stock = Math.min(100, (b.stock || 0) + val);
        });
    }
    saveState();
    playSound('win'); tgHaptic('success');
    showToast("Склады предприятий успешно пополнены сырьём!");
}

function renderShopTuningParts() {
    const box = document.getElementById('shopTuningPartsList');
    if (!box) return;
    const parts = (typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.tuningParts) ? SHOP_CATALOG.tuningParts : [];

    let html = "";
    parts.forEach(p => {
        let isBought = false;
        if (p.id === 'raf_license') isBought = !!state.player.hasRacingLicense;
        let btn = isBought
            ? `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Оформлено ✓</button>`
            : `<button onclick="buyShopDocAction('${p.id}', ${p.cost})" class="btn btn-red btn-sm btn-auto">${p.cost.toLocaleString()} ₽</button>`;

        html += `
        <div class="glass-card flex-between p-2 mb-2">
            <div style="flex:1; margin-right:8px;">
                <b class="text-xs color-red"><i class="fa-solid ${p.icon || 'fa-file'} mr-1"></i> ${p.name}</b>
                <div class="sub-label" style="font-size:10px;">${p.desc}</div>
            </div>
            ${btn}
        </div>`;
    });

    html += `
    <div class="glass-card p-2 text-center sub-label" style="font-size:10px;">
        💡 Спортивные компоненты покупаются непосредственно в <b>Гараже</b> под конкретный кузов!
    </div>`;

    box.innerHTML = html;
}

function buyShopDocAction(docId, cost) {
    let cash = state.player.cash || 0;
    if (cash < cost) return showToast("Не хватает денег!");
    state.player.cash -= cost;

    if (docId === 'raf_license') {
        state.player.hasRacingLicense = true;
        openVerdictModal("ЛИЦЕНЗИЯ ПИЛОТА РАФ! 🏎️", "Официальная лицензия оформлена. Доступ к заездам открыт!", true);
    } else if (docId === 'insurance_osago') {
        showToast("Полис оформлен! Вы можете активировать его на любой авто в Гараже.");
    } else if (docId === 'gps_tracker') {
        showToast("GPS-маяк приобретен в арсенал безопасности!");
    }

    saveState();
    renderShopTuningParts();
    playSound('win');
    tgHaptic('success');
}

function renderShopHomeItems() {
    const box = document.getElementById('shopHomeItemsList');
    if (!box) return;
    if (typeof HOUSING_INTERIOR_CATALOG === 'undefined') return;
    if (!state.player.furniture) state.player.furniture = [];

    let html = "";
    HOUSING_INTERIOR_CATALOG.forEach(item => {
        let isBought = state.player.furniture.includes(item.id);
        let btnContent = isBought 
            ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Куплено ✓</button>" 
            : `<button onclick="buyHomeFurnitureShop('${item.id}', ${item.cost})" class="btn btn-green btn-sm btn-auto">${(item.cost / 1000).toFixed(0)}k ₽</button>`;

        html += `
        <div class="glass-card p-2 flex-between mb-2">
            <div>
                <div class="font-bold text-xs color-cyan">${item.name}</div>
                <div class="sub-label" style="font-size:10px;">${item.perk}</div>
            </div>
            ${btnContent}
        </div>`;
    });
    box.innerHTML = html;
}

function buyHomeFurnitureShop(fId, cost) {
    let cash = state.player.cash || 0;
    if (cash < cost) return showToast("Не хватает денег!");
    state.player.cash -= cost;
    if (!state.player.furniture) state.player.furniture = [];
    state.player.furniture.push(fId);
    saveState();
    renderShopHomeItems();
    playSound('win'); tgHaptic('success');
    showToast("Куплено и установлено в вашем жилье!");
}

// ========================================================
// АНАЛИТИКА ПРОФИЛЯ
// ========================================================
function renderProfileAnalytics() {
    let s = state.player?.stats || { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 };
    setTxt('statProfitable', s.profitableSales || 0);
    setTxt('statLoss', s.lossSales || 0);
    setTxt('statTotalNetProfit', (s.totalNetProfit || 0).toLocaleString() + " ₽");
    let totalSales = (s.profitableSales || 0) + (s.lossSales || 0);
    let winrate = totalSales > 0 ? Math.round(((s.profitableSales || 0) / totalSales) * 100) : 0;
    setTxt('statWinrate', winrate + "%");
    setTxt('profileTgUsername', state.player?.name || "Перекуп #777");

    let lvl = state.player?.level || 1;
    let rank = lvl >= 50 ? "Автомобильный Олигарх" : (lvl >= 30 ? "Хозяин Авторынка" : (lvl >= 15 ? "Серый Делец" : "Гаражный Перекуп"));
    setTxt('profPlayerRank', "Статус: " + rank);
}

// ========================================================
// НАВИГАЦИЯ И ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// ========================================================
function switchTab(tabId) {
    initAudio(); 
    playSound('tick'); 
    tgHaptic('light'); 
    
    const activeTab = document.querySelector('.tab-screen.active');
    if (tabId === 'tabPhone' && activeTab && activeTab.id === 'tabPhone') {
        if (typeof PhoneManager !== 'undefined') {
            PhoneManager.goHome();
        }
        return;
    }
    
    document.querySelectorAll('.tab-screen').forEach(el => el.classList.remove('active')); 
    const tb = document.getElementById(tabId);
    if (tb) tb.classList.add('active'); 
    
    document.querySelectorAll('.b-nav-item').forEach(b => b.classList.remove('active'));
    
    if (tabId === 'tabMarket') { const el = document.getElementById('bnav-tabMarket'); if (el) el.classList.add('active'); }
    else if (tabId === 'tabGarage') { const el = document.getElementById('bnav-tabGarage'); if (el) el.classList.add('active'); }
    else if (tabId === 'tabSalesLot') { const el = document.getElementById('bnav-tabSalesLot'); if (el) el.classList.add('active'); }
    else if (tabId === 'tabPhone') { const el = document.getElementById('bnav-tabPhone'); if (el) el.classList.add('active'); }
    else { const el = document.getElementById('bnav-tabLife'); if (el) el.classList.add('active'); }

    if (tabId === 'tabMarket' && typeof renderMarketFeed === 'function') renderMarketFeed();
    if (tabId === 'tabGarage' && typeof renderGarage === 'function') renderGarage(); 
    if (tabId === 'tabSalesLot' && typeof renderSalesLot === 'function') renderSalesLot();
    if (tabId === 'tabPhone') {
        if (typeof PhoneManager !== 'undefined') PhoneManager.renderPhoneScreen();
    }
    if (tabId === 'tabLife') {
        if (typeof renderDiets === 'function') renderDiets(); 
        if (typeof renderLifeChat === 'function') renderLifeChat();
    }
    if (tabId === 'tabProfile') renderProfileAnalytics();
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
// СВАЙП-ЛИСТЕНЕР РЫНКА
// ========================================================
function initMarketScrollListener() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    let touchStartY = 0;
    let touchEndY = 0;

    mainContent.addEventListener('scroll', () => {
        const marketTab = document.getElementById('tabMarket');
        if (!marketTab || !marketTab.classList.contains('active')) return;

        const grid = document.getElementById('marketCatListContainer');
        const btnIcon = document.querySelector('#btnToggleMarketGrid i');

        if (mainContent.scrollTop > 90) {
            if (grid && !grid.classList.contains('collapsed')) {
                grid.classList.add('collapsed');
                if (btnIcon) btnIcon.className = "fa-solid fa-chevron-down";
            }
        }
    });

    mainContent.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    mainContent.addEventListener('touchmove', (e) => {
        touchEndY = e.touches[0].clientY;
        const marketTab = document.getElementById('tabMarket');
        if (!marketTab || !marketTab.classList.contains('active')) return;

        if (mainContent.scrollTop <= 2 && touchEndY - touchStartY > 65) {
            const grid = document.getElementById('marketCatListContainer');
            const btnIcon = document.querySelector('#btnToggleMarketGrid i');
            if (grid && grid.classList.contains('collapsed')) {
                grid.classList.remove('collapsed');
                if (btnIcon) btnIcon.className = "fa-solid fa-chevron-up";
                tgHaptic('light');
            }
        }
    }, { passive: true });
}

// ========================================================
// ИНИЦИАЛИЗАЦИЯ И ТАЙМЕРЫ
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

        if (typeof renderGarage === 'function') renderGarage(); 
        if (typeof renderSalesLot === 'function') renderSalesLot();
        if (typeof renderDiets === 'function') renderDiets(); 
        if (typeof renderHousing === 'function') renderHousing(); 
        if (typeof renderContracts === 'function') renderContracts(); 
        
        if (typeof PhoneManager !== 'undefined') {
            PhoneManager.init();
        }
        
        initMarketScrollListener();
        switchTab('tabMarket');
        checkAutoShowPatchNotes();
    });
}

let gameCycleSeconds = 0;

setInterval(() => {
    gameCycleSeconds++;
    let lotChanged = false;

    // 1. ФОНОВЫЙ ТАЙМЕР БИЗНЕСА И РАСХОДА СЫРЬЯ (каждые 30 секунд)
    if (gameCycleSeconds % 30 === 0 && state.businesses) {
        let bizUpdated = false;
        state.businesses.forEach(b => {
            if (b && b.level > 0) {
                if (b.stock > 0) {
                    b.stock = Math.max(0, b.stock - 2);
                    let tickIncome = Math.round((b.income * b.level) / 5);
                    b.stored = (b.stored || 0) + tickIncome;
                    bizUpdated = true;
                }
            }
        });
        if (bizUpdated) {
            saveState();
            if (typeof PhoneManager !== 'undefined') PhoneManager.renderBusinessWidget();
        }
    }

    // 2. РАСХОД ГОЛОДА И НАСТРОЕНИЯ (каждые 45 секунд)
    if (gameCycleSeconds % 45 === 0 && state.player) {
        state.player.hunger = Math.max(0, (state.player.hunger || 80) - 1);
        state.player.mood = Math.max(0, (state.player.mood || 85) - 1);
        updateHeaderUI();
    }

    // 3. ОБРАБОТКА ТАЙМЕРОВ ПЛОЩАДКИ ПРОДАЖ
    if (state.salesLot && state.salesLot.length > 0) {
        for (let i = 0; i < state.salesLot.length; i++) {
            let slot = state.salesLot[i];
            if (!slot) continue;

            if (!slot.currentBuyer) {
                if (slot.timer === undefined || isNaN(slot.timer) || slot.maxTimer === undefined || isNaN(slot.maxTimer)) {
                    let t = (typeof calculateLotWaitTime === 'function') ? calculateLotWaitTime() : 120;
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
                if (slot.buyerTimerLeft === undefined || isNaN(slot.buyerTimerLeft)) {
                    slot.buyerTimerLeft = 120;
                }
                
                if (slot.buyerTimerLeft > 0) {
                    slot.buyerTimerLeft -= 1;
                    const buyerTimeText = document.getElementById("lot_buyer_timer_" + i);
                    if (buyerTimeText) buyerTimeText.innerText = "⏳ " + slot.buyerTimerLeft + "с";
                }

                if (slot.buyerTimerLeft <= 0) {
                    slot.currentBuyer = null;
                    let t = (typeof calculateLotWaitTime === 'function') ? calculateLotWaitTime() : 120;
                    slot.maxTimer = t;
                    slot.timer = t;
                    lotChanged = true;
                    showToast("🚶‍♂️ Клиент не дождался вас и ушел. Слот ищет следующего...");
                }
            }
        }
    }
    
    const sTab = document.getElementById('tabSalesLot');
    if (lotChanged && sTab && sTab.classList.contains('active') && typeof renderSalesLot === 'function') {
        renderSalesLot();
    }
    
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
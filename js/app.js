// ===================== ЯДРО ИГРЫ И СОСТОЯНИЕ (js/app.js) =====================

let ACtx = window.AudioContext;
if (!ACtx) ACtx = window.webkitAudioContext;
let audioCtx = null;

function tgHaptic(type) {
    let t = type ? type : 'light';
    try { 
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) { 
            let isNotif = false;
            if (t === 'success') isNotif = true;
            if (t === 'warning') isNotif = true;
            if (t === 'error') isNotif = true;

            if (isNotif) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred(t); 
            } else {
                window.Telegram.WebApp.HapticFeedback.impactOccurred(t); 
            }
        } 
    } catch(e) {}
}

function playSound(type) {
    try {
        if (!audioCtx) audioCtx = new ACtx();
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
        }
    } catch(e) {}
}

function playEngineSound() {
    try {
        if (!audioCtx) audioCtx = new ACtx(); 
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
        showToast("🔥 РЁВ ВЫХЛОПА: Газ в пол!");
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

const SAVE_KEY = 'perekoop_sim_save_v70_clean';

const DEFAULT_STATE = {
    player: { 
        name: "Перекуп #777", avatarUrl: null, cash: 150000, stars: 15, connections: 1, 
        expressTickets: 25, maxExpressTickets: 25, fuel: 100, level: 1, xp: 0, maxXp: 120, 
        baseSlots: 2, vip: false, vipPro: false, lastFreeSpin: 0, club: null, karma: 50, 
        stats: { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 }, 
        hunger: 80, mood: 85, reputation: 30, loanDebt: 0, day: 1, streakDay: 1, lastClaimedDay: 0, 
        diet: 'shaurma', housingId: 'room', housingType: 'rent', ownedHouses: [], selectedStreetCarIndex: 0, 
        lastBarnDay: 0, preSalesCount: 0, preSaleCooldownUntil: 0, policeImmunityDays: 0,
        tools: { gauge: false, obd: false, endoscope: false, compressor: false },
        supplies: { energyDrinks: 0, coffee: 0 }
    },
    garage: [], salesLot: [], contracts: [], plateCatalog: [], ownedPlates: ["В777ВВ 777"], 
    activeCategory: 'economy', marketFeed: [], p2pMode: 'cars', syndicateSubTab: 'p2p', 
    myP2PListings: [], businesses: [], confiscatedLot: null,
    barnProgress: { car: null, step: 0, tier: 1, plate: '' }, 
    marketModifiers: { economy: 1, comfort: 1, premium: 1, all: 1 }
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

function getGarageSlotCost() {
    let bs = 2;
    if (state.player && state.player.baseSlots) bs = state.player.baseSlots;
    let extraSlots = bs - 2;
    if (extraSlots < 0) extraSlots = 0;
    return Math.round(250000 * Math.pow(1.65, extraSlots));
}

function getExpressTicketUpgradeCost() {
    let m = 25;
    if (state.player && state.player.maxExpressTickets) m = state.player.maxExpressTickets;
    let extra = m - 25;
    if (extra < 0) extra = 0;
    const steps = Math.floor(extra / 25);
    return Math.round(50000 * Math.pow(1.5, steps));
}

function getTotalGarageSlots() {
    let slots = 2;
    if (state.player && state.player.baseSlots) slots = state.player.baseSlots;
    if (typeof HOUSING_LIST !== 'undefined' && Array.isArray(HOUSING_LIST)) {
        if (state.player && state.player.housingId) {
            const house = HOUSING_LIST.find(h => h.id === state.player.housingId); 
            if (house) slots += house.slots;
        }
        if (state.player && state.player.ownedHouses && Array.isArray(state.player.ownedHouses)) {
           state.player.ownedHouses.forEach(hId => { 
               const oh = HOUSING_LIST.find(h => h.id === hId); 
               if (oh) slots += oh.slots; 
           }); 
        }
    }
    return slots;
}

function sanitizeState() {
    try { 
        const saved = localStorage.getItem(SAVE_KEY); 
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.player) {
                state.player = Object.assign({}, DEFAULT_STATE.player, parsed.player);
                if (parsed.player.stats) state.player.stats = Object.assign({}, DEFAULT_STATE.player.stats, parsed.player.stats);
                if (parsed.player.tools) state.player.tools = Object.assign({}, DEFAULT_STATE.player.tools, parsed.player.tools);
                if (parsed.player.supplies) state.player.supplies = Object.assign({}, DEFAULT_STATE.player.supplies, parsed.player.supplies);
            }
            if (Array.isArray(parsed.garage)) state.garage = parsed.garage;
            if (Array.isArray(parsed.salesLot)) state.salesLot = parsed.salesLot;
            if (Array.isArray(parsed.ownedPlates)) state.ownedPlates = parsed.ownedPlates;
            if (Array.isArray(parsed.businesses)) state.businesses = parsed.businesses;
            if (parsed.marketModifiers) state.marketModifiers = parsed.marketModifiers;
            if (parsed.barnProgress) state.barnProgress = parsed.barnProgress;
            if (Array.isArray(parsed.myP2PListings)) state.myP2PListings = parsed.myP2PListings;
            if (parsed.confiscatedLot) state.confiscatedLot = parsed.confiscatedLot;
            if (Array.isArray(parsed.marketFeed)) state.marketFeed = parsed.marketFeed;
        } 
    } catch(e) {}
    
    if (!state.player.baseSlots) state.player.baseSlots = 2;
    if (state.player.baseSlots < 2) state.player.baseSlots = 2;
    if (!state.player.maxExpressTickets) state.player.maxExpressTickets = 25;
    if (typeof state.player.expressTickets !== 'number') state.player.expressTickets = state.player.maxExpressTickets;
    if (typeof state.player.policeImmunityDays !== 'number') state.player.policeImmunityDays = 0;
    if (!Array.isArray(state.player.ownedHouses)) state.player.ownedHouses = [];
    if (typeof state.player.cash !== 'number') state.player.cash = 150000;
    if (state.player.cash < 0) state.player.cash = 150000;
    if (typeof state.player.loanDebt !== 'number') state.player.loanDebt = 0;
    if (state.player.loanDebt < 0) state.player.loanDebt = 0;
    if (!state.player.tools) state.player.tools = { gauge: false, obd: false, endoscope: false, compressor: false };
    if (!state.player.supplies) state.player.supplies = { energyDrinks: 0, coffee: 0 };
    
    if (!state.businesses || state.businesses.length === 0) {
        if (typeof BUSINESS_DATA !== 'undefined') {
            state.businesses = BUSINESS_DATA;
        } else {
            state.businesses = [];
        }
    }
}

function updateHeaderUI() {
    let cash = 0; if (state.player && state.player.cash) cash = state.player.cash;
    let stars = 0; if (state.player && state.player.stars) stars = state.player.stars;
    let fuel = 0; if (state.player && state.player.fuel) fuel = state.player.fuel;
    let tck = 0; if (state.player && state.player.expressTickets) tck = state.player.expressTickets;
    let mTck = 25; if (state.player && state.player.maxExpressTickets) mTck = state.player.maxExpressTickets;
    let pName = "Перекуп #777"; if (state.player && state.player.name) pName = state.player.name;
    let lvl = 1; if (state.player && state.player.level) lvl = state.player.level;
    let conn = 0; if (state.player && state.player.connections) conn = state.player.connections;
    let karma = 50; if (state.player && state.player.karma) karma = state.player.karma;

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
        let xp = 0; if (state.player && state.player.xp) xp = state.player.xp;
        let maxXp = 120; if (state.player && state.player.maxXp) maxXp = state.player.maxXp;
        let pct = (xp / maxXp) * 100;
        if (pct > 100) pct = 100;
        fill.style.width = pct + "%";
    }
    
    let hng = 80; if (state.player && state.player.hunger) hng = state.player.hunger;
    setTxt('hungerText', hng + "%"); 
    const hFill = document.getElementById('hungerFill');
    if (hFill) hFill.style.width = hng + "%";

    let md = 85; if (state.player && state.player.mood) md = state.player.mood;
    setTxt('moodText', md + "%"); 
    const mFill = document.getElementById('moodFill');
    if (mFill) mFill.style.width = md + "%";

    const vipBadge = document.getElementById('vipBadge');
    if (vipBadge) {
        vipBadge.style.display = (state.player && state.player.vipPro) ? 'block' : 'none';
    }

    let gLen = 0; if (state.garage) gLen = state.garage.length;
    setTxt('garageHeaderSlots', gLen + "/" + getTotalGarageSlots());
    
    const slotCost = getGarageSlotCost();
    const btnSlot = document.getElementById('btnBuyGarageSlot');
    if (btnSlot) btnSlot.innerText = "+1 Бокс (" + (slotCost / 1000).toFixed(0) + "k ₽)";

    let debt = 0; if (state.player && state.player.loanDebt) debt = state.player.loanDebt;
    const loanEl = document.getElementById('loanDebtText');
    if (loanEl) loanEl.innerText = "Долг: " + debt.toLocaleString() + " ₽";
}

function updateLevelGatesUI() {
    let lvl = 1; if (state.player && state.player.level) lvl = state.player.level;
    const gates = [
        { id: 'moto', lockId: 'lock-moto', minLvl: 16, title: 'Мото' },
        { id: 'atv', lockId: 'lock-atv', minLvl: 16, title: 'Квадро' },
        { id: 'comfort', lockId: 'lock-comfort', minLvl: 30, title: 'Комфорт' },
        { id: 'premium', lockId: 'lock-premium', minLvl: 30, title: 'Премиум' },
        { id: 'hyper', lockId: 'lock-hyper', minLvl: 50, title: 'Гиперкары' },
        { id: 'truck', lockId: 'lock-truck', minLvl: 50, title: 'Грузовики' },
        { id: 'yacht', lockId: 'lock-yacht', minLvl: 100, title: 'Яхты' }
    ];

    gates.forEach(g => {
        const btn = document.getElementById("catBtn-" + g.id);
        if (btn) {
            if (lvl >= g.minLvl) {
                btn.classList.remove('locked');
                btn.innerHTML = g.title;
            } else {
                btn.classList.add('locked');
                btn.innerHTML = "<i class='fa-solid fa-lock' id='" + g.lockId + "'></i> " + g.title + " (" + g.minLvl + " ур)";
            }
        }
    });
}

function saveState() { 
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e) {} 
    updateHeaderUI(); 
}

function syncTelegramProfile() {
    try {
        if (window.Telegram && window.Telegram.WebApp) { 
            const tg = window.Telegram.WebApp;
            tg.ready(); 
            tg.expand(); 
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) { 
                const u = tg.initDataUnsafe.user; 
                let arr = [];
                if (u.first_name) arr.push(u.first_name);
                if (u.last_name) arr.push(u.last_name);
                const fullName = arr.join(' ');
                
                if (fullName) state.player.name = fullName;
                else if (u.username) state.player.name = "@" + u.username;
                
                if (u.photo_url) state.player.avatarUrl = u.photo_url; 
            } 
        }
    } catch(e) {}
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

// --- ПУЛЬТ РЕГУЛИРОВКИ РЕСУРСОВ (+ / -) ---
function adjustResource(type, delta) {
    if (!state.player) return;
    
    if (type === 'cash') {
        let cur = state.player.cash || 0;
        state.player.cash = Math.max(0, cur + delta);
        showToast((delta > 0 ? "+" : "") + delta.toLocaleString() + " ₽");
    } else if (type === 'level') {
        let cur = state.player.level || 1;
        state.player.level = Math.max(1, Math.min(100, cur + delta));
        updateLevelGatesUI();
        if (typeof checkReshalaAccess === 'function') checkReshalaAccess();
        showToast((delta > 0 ? "+" : "") + delta + " Ур");
    } else if (type === 'stars') {
        let cur = state.player.stars || 0;
        state.player.stars = Math.max(0, cur + delta);
        showToast((delta > 0 ? "+" : "") + delta + " Stars ⭐");
    } else if (type === 'tickets') {
        let cur = state.player.expressTickets || 0;
        let max = state.player.maxExpressTickets || 25;
        state.player.expressTickets = Math.max(0, Math.min(max, cur + delta));
        showToast((delta > 0 ? "+" : "") + delta + " Талонов 🎟️");
    } else if (type === 'connections') {
        let cur = state.player.connections || 0;
        state.player.connections = Math.max(0, cur + delta);
        showToast((delta > 0 ? "+" : "") + delta + " Связей 🤝");
    }
    
    saveState();
    updateHeaderUI();
    renderProfileAnalytics();
}

function openDailyBonusModal() {
    const grid = document.getElementById('dailyBonusGrid');
    if (!grid || typeof DAILY_REWARDS_CONFIG === 'undefined') return;

    let sDay = state.player?.streakDay || 1;

    let html = "";
    DAILY_REWARDS_CONFIG.forEach(r => {
        let isClaimed = sDay > r.day;
        let isCurrent = sDay === r.day;
        
        let cName = "daily-streak-day";
        if (isClaimed) cName += " claimed";
        if (isCurrent) cName += " current";

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
        let last = state.player?.lastClaimedDay || 0;
        let pDay = state.player?.day || 1;
        let canClaim = last < pDay;
        
        claimBtn.disabled = !canClaim;
        claimBtn.innerText = canClaim ? "Забрать награду" : "Уже получено сегодня";
    }

    const mod = document.getElementById('modalDailyBonus');
    if (mod) mod.classList.add('active');
}

function claimDailyReward() {
    let last = state.player?.lastClaimedDay || 0;
    let pDay = state.player?.day || 1;
    if (last >= pDay) return showToast("Награда за сегодня уже забрана!");

    let sDay = state.player?.streakDay || 1;
    let currentReward = DAILY_REWARDS_CONFIG.find(r => r.day === sDay);
    if (!currentReward) currentReward = DAILY_REWARDS_CONFIG[0];
    
    const r = currentReward.reward;
    if (r.cash) state.player.cash += r.cash;
    if (r.fuel) state.player.fuel = Math.min(100, state.player.fuel + r.fuel);
    if (r.connections) state.player.connections = (state.player.connections || 0) + r.connections;
    if (r.stars) state.player.stars += r.stars;
    if (r.specialPlate) state.ownedPlates.push(r.specialPlate);

    state.player.lastClaimedDay = pDay;
    state.player.streakDay = (sDay % 7) + 1;

    saveState();
    closeModal('modalDailyBonus');
    playSound('win');
    tgHaptic('success');
    openVerdictModal("БОНУС ПОЛУЧЕН! 🎁", "Вам начислено: " + currentReward.title, true);
}

function switchTab(tabId) {
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

    if (tabId === 'tabMarket' && typeof renderMarketFeed === 'function') renderMarketFeed();
    if (tabId === 'tabGarage' && typeof renderGarage === 'function') renderGarage(); 
    if (tabId === 'tabSalesLot' && typeof renderSalesLot === 'function') renderSalesLot();
    
    if (tabId === 'tabStreet') {
        if (typeof renderStreetScreen === 'function') renderStreetScreen();
        if (typeof renderStreetEvents === 'function') renderStreetEvents();
    }
    
    if (tabId === 'tabBusiness' && typeof checkBusinessAccess === 'function') checkBusinessAccess();
    if (tabId === 'tabShop' && typeof renderShopTools === 'function') renderShopTools();
    if (tabId === 'tabReshala' && typeof renderConfiscatedCardUI === 'function') renderConfiscatedCardUI();
    if (tabId === 'tabContainers' && typeof renderContainersList === 'function') renderContainersList();
    if (tabId === 'tabContracts' && typeof renderContracts === 'function') renderContracts();
    if (tabId === 'tabBarn' && typeof renderBarnFind === 'function') renderBarnFind();
    
    if (tabId === 'tabLife') {
        if (typeof renderDiets === 'function') renderDiets(); 
        if (typeof renderLifeChat === 'function') renderLifeChat();
    }
    
    if (tabId === 'tabServices') { 
        if (typeof initWheelModule === 'function') initWheelModule(); 
        if (typeof initCasino === 'function') initCasino(); 
    }
    
    if (tabId === 'tabHousing' && typeof renderHousing === 'function') renderHousing();
    if (tabId === 'tabSyndicate' && typeof renderSyndicateHub === 'function') renderSyndicateHub();
    if (tabId === 'tabProfile' && typeof renderProfileAnalytics === 'function') renderProfileAnalytics();
}

// ===================== СТРИТ И ДРАГ-РЕЙСИНГ =====================

let currentRaceBet = 25000;
let tachoRpm = 1000;
let isGasPressed = false;
let gasInterval = null;
let isRaceRunning = false;

function renderStreetScreen() {
    const box = document.getElementById('streetCarPickerBox');
    if (!box) return;

    if (!state.garage || state.garage.length === 0) {
        box.innerHTML = "<div class='sub-label text-center py-2'>В гараже пусто! Купите авто для заездов.</div>";
        setTxt('streetSelectedCarHp', '0 л.с.');
        return;
    }

    let selIdx = state.player?.selectedStreetCarIndex || 0;
    let selCar = state.garage[selIdx] || state.garage[0];
    
    let cPower = selCar.power || 100;
    setTxt('streetSelectedCarHp', cPower + " л.с.");

    let cName = selCar.name || "Авто";
    let cChip = selCar.tuning?.chip || 0;

    let opts = "";
    state.garage.forEach((c, i) => {
        let isSel = (i === selIdx) ? "selected" : "";
        let optName = c?.name || "Авто";
        opts += "<option value='" + i + "' " + isSel + ">" + optName + "</option>";
    });

    box.innerHTML = 
        "<div class='flex-between'>" +
            "<div>" +
                "<b class='text-xs color-cyan'>" + cName + "</b>" +
                "<div class='sub-label'>" + cPower + " л.с. / Чип: Stage " + cChip + "</div>" +
            "</div>" +
            "<select onchange='onSelectStreetCar(this.value)' style='background:#131c2e; color:#fff; border:1px solid var(--border-glass); border-radius:6px; padding:6px; font-size:11px; outline:none;'>" +
                opts +
            "</select>" +
        "</div>";
}

function onSelectStreetCar(idx) {
    state.player.selectedStreetCarIndex = parseInt(idx);
    saveState();
    renderStreetScreen();
    renderStreetEvents();
}

function setRaceBet(amt) {
    currentRaceBet = amt;
    setTxt('raceStatusText', "Ставка установлена: " + amt.toLocaleString() + " ₽. Прогрейте мотор!");
    tgHaptic('light');
}

function holdGasPedal() {
    if (isRaceRunning) return;
    isGasPressed = true;
    if (gasInterval) clearInterval(gasInterval);
    gasInterval = setInterval(() => {
        tachoRpm += 400;
        if (tachoRpm > 8000) tachoRpm = 8000;
        updateTachometerUI();
        if (Math.random() < 0.3) playSound('tick');
    }, 60);
}

function releaseGasPedal() {
    isGasPressed = false;
    if (gasInterval) clearInterval(gasInterval);
    gasInterval = setInterval(() => {
        if (tachoRpm > 1000) {
            tachoRpm -= 350;
            if (tachoRpm < 1000) tachoRpm = 1000;
            updateTachometerUI();
        } else {
            clearInterval(gasInterval);
        }
    }, 80);
}

function updateTachometerUI() {
    const needle = document.getElementById('tachoNeedle');
    if (!needle) return;
    let pct = ((tachoRpm - 1000) / 7000) * 100;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    needle.style.left = pct + "%";
}

function launchDragRace() {
    if (isRaceRunning) return;
    if (!state.garage || state.garage.length === 0) return showToast("Нет авто для заезда!");
    
    let selIdx = state.player?.selectedStreetCarIndex || 0;
    let car = state.garage[selIdx] || state.garage[0];

    if (car.unregistered) {
        return showToast("🚫 Авто снято с учёта! Поставьте на учёт в гараже.");
    }
    if (car.impounded) {
        return showToast("🚨 Автомобиль на штрафстоянке! Сначала вызволите его.");
    }

    let cash = state.player?.cash || 0;
    if (cash < currentRaceBet) return showToast("Не хватает денег на ставку!");
    
    let fuel = state.player?.fuel || 0;
    if (fuel < 10) return showToast("Нужно 10 ⛽ бензина для заезда!");

    state.player.cash -= currentRaceBet;
    state.player.fuel -= 10;
    saveState();
    updateHeaderUI();

    isRaceRunning = true;
    playEngineSound();

    let playerHp = car.power || 100;
    const rivalHp = Math.round(playerHp * (0.85 + Math.random() * 0.35));

    let isPerfectLaunch = (tachoRpm >= 5500 && tachoRpm <= 6500);
    let launchBonus = isPerfectLaunch ? 35 : (tachoRpm > 7200 ? -20 : 0);

    setTxt('raceStatusText', isPerfectLaunch ? '🔥 ИДЕАЛЬНЫЙ ЛАНЧ-СТАРТ!' : '🚦 Заезд начался!');

    const pRunner = document.getElementById('playerRaceCarRunner');
    const rRunner = document.getElementById('rivalRaceCarRunner');

    let pProgress = 0;
    let rProgress = 0;

    const raceTimer = setInterval(() => {
        pProgress += (playerHp / 30) + (launchBonus / 10) + Math.random() * 4;
        rProgress += (rivalHp / 30) + Math.random() * 4;

        let pPct = Math.min(92, pProgress);
        let rPct = Math.min(92, rProgress);

        if (pRunner) pRunner.style.left = pPct + "%";
        if (rRunner) rRunner.style.left = rPct + "%";

        if (pProgress >= 92 || rProgress >= 92) {
            clearInterval(raceTimer);
            isRaceRunning = false;

            let isWin = (pProgress >= rProgress);
            if (isWin) {
                const prize = currentRaceBet * 2;
                state.player.cash += prize;
                let mood = state.player?.mood || 80;
                state.player.mood = Math.min(100, mood + 15);
                addXp(30);
                saveState();
                updateHeaderUI();
                openVerdictModal("ПОБЕДА НА 402М! 🏁", "Вы обогнали соперника и забрали банк: +" + prize.toLocaleString() + " ₽!", true, prize);
            } else {
                let mood = state.player?.mood || 80;
                state.player.mood = Math.max(0, mood - 15);
                saveState();
                updateHeaderUI();
                openVerdictModal("ПОРАЖЕНИЕ 💨", "Соперник оказался быстрее на финише. Банк утерян: -" + currentRaceBet.toLocaleString() + " ₽.", false);
            }

            setTimeout(() => {
                if (pRunner) pRunner.style.left = '0%';
                if (rRunner) rRunner.style.left = '0%';
                tachoRpm = 1000;
                updateTachometerUI();
                setTxt('raceStatusText', 'Заезд завершен. Выберите ставку для новой гонки!');
            }, 1200);
        }
    }, 120);
}

// ===================== НОВАЯ МЕХАНИКА: СТРИТ-МЕРОПРИЯТИЯ =====================

const STREET_EVENTS_LIST = [
    {
        id: "meet",
        name: "🅿️ Парковочная авто-сходка",
        reqLvl: 3,
        fuelCost: 15,
        desc: "Ночная встреча у гипермаркета. Показ машин, общение с ребятами, обмен связями.",
        rewardText: "+20 Кармы, +15% Куража и шанс получить +1 🤝 Связь.",
        riskText: "Безопасно (Облав нет)"
    },
    {
        id: "autoshow",
        name: "🏆 Городской Стенс & Автошоу",
        reqLvl: 8,
        fuelCost: 20,
        desc: "Конкурс внешнего вида: полировка, стенс, спортивный обвес и выхлоп.",
        rewardText: "Призовой фонд до 180,000 ₽ + кубок лучшего проекта.",
        riskText: "Риск 12.5.1: ДПС на выезде с выставки!"
    },
    {
        id: "drift",
        name: "💨 Нелегальный ночной дрифт",
        reqLvl: 12,
        fuelCost: 25,
        desc: "Парный дрифт вокруг столбов и на кольце. Жесткий визг резины и адреналин.",
        rewardText: "Банк до 450,000 ₽ и огромный авторитет перекупа.",
        riskText: "ВЫСОКИЙ РИСК: Эвакуация на штрафстоянку и аннулирование учёта!"
    }
];

function renderStreetEvents() {
    const container = document.getElementById('streetEventsContainer');
    if (!container) return;

    const lvl = state.player?.level || 1;
    let html = "";

    STREET_EVENTS_LIST.forEach(ev => {
        let isLocked = lvl < ev.reqLvl;
        let cardClass = "street-event-card";
        if (ev.id === 'drift') cardClass += " card-drift";
        if (ev.id === 'autoshow') cardClass += " card-show";

        let lockBadge = isLocked 
            ? "<span class='tag-badge bg-tag-red'><i class='fa-solid fa-lock'></i> С " + ev.reqLvl + " УР</span>" 
            : "<span class='tag-badge bg-tag-green'>Доступно</span>";

        let btnText = isLocked ? "Закрыто (Нужен " + ev.reqLvl + " ур)" : "Участвовать (-" + ev.fuelCost + " ⛽)";

        html += 
        "<div class='" + cardClass + "'>" +
            "<div class='flex-between mb-1'>" +
                "<b class='text-xs color-cyan'>" + ev.name + "</b>" +
                lockBadge +
            "</div>" +
            "<p class='sub-label mb-2'>" + ev.desc + "</p>" +
            "<div class='text-xs mb-1 color-green'>🎁 Награда: " + ev.rewardText + "</div>" +
            "<div class='text-xs mb-2 color-amber'>⚠️ Опасность: " + ev.riskText + "</div>" +
            "<button onclick=\"participateInStreetEvent('" + ev.id + "')\" class='btn btn-dark btn-sm w-full' " + (isLocked ? "disabled" : "") + ">" +
                btnText +
            "</button>" +
        "</div>";
    });

    container.innerHTML = html;
}

function participateInStreetEvent(eventId) {
    if (!state.garage || state.garage.length === 0) {
        return showToast("В гараже нет машин для участия!");
    }

    let selIdx = state.player?.selectedStreetCarIndex || 0;
    let car = state.garage[selIdx] || state.garage[0];

    if (car.unregistered) {
        return showToast("🚫 Авто снято с учёта! Восстановите регистрацию в гараже.");
    }
    if (car.impounded) {
        return showToast("🚨 Авто на штрафстоянке! Вызволите его перед выездом.");
    }

    const ev = STREET_EVENTS_LIST.find(e => e.id === eventId);
    if (!ev) return;

    let fuel = state.player?.fuel || 0;
    if (fuel < ev.fuelCost) {
        return showToast("Не хватает " + ev.fuelCost + " ⛽ бензина!");
    }

    state.player.fuel -= ev.fuelCost;
    saveState();
    updateHeaderUI();

    let hasImmunity = (state.player?.policeImmunityDays || 0) > 0;

    if (eventId === 'meet') {
        playEngineSound();
        state.player.karma = Math.min(100, (state.player.karma || 50) + 15);
        state.player.mood = Math.min(100, (state.player.mood || 80) + 15);
        
        let gotConnection = Math.random() < 0.40;
        if (gotConnection) {
            state.player.connections = (state.player.connections || 0) + 1;
        }

        addXp(35);
        saveState();
        updateHeaderUI();

        let desc = "Вы отлично провели время с местными перекупами и стритрейсерами. Кураж +15%, Карма +15.";
        if (gotConnection) desc += " Удалось познакомиться с влиятельным человеком (+1 🤝 Связь)!";
        openVerdictModal("СХОДКА УДАЛАСЬ! 🅿️", desc, true);
    } 
    else if (eventId === 'autoshow') {
        playEngineSound();
        let showPoints = (car.condition || 80);
        if (car.isPolished) showPoints += 25;
        if (car.tuning?.stance) showPoints += 35;
        if (car.tuning?.bodykit) showPoints += 25;

        let risk1251 = car.tuning?.risk1251 || 0;
        let isRaid = (!hasImmunity && Math.random() < (risk1251 / 150));

        if (isRaid) {
            let fine = 25000;
            state.player.cash = Math.max(0, (state.player.cash || 0) - fine);
            saveState();
            updateHeaderUI();
            openVerdictModal(
                "ОБЛАВА ТЕХНАДЗОРА! 🚔", 
                "На выезде с автошоу экипаж ДПС выписал протокол по ст. 12.5.1 КоАП за изменение конструкции. Штраф: -" + fine.toLocaleString() + " ₽.", 
                false
            );
        } else {
            let prize = Math.round(100000 + (showPoints * 600));
            state.player.cash = (state.player.cash || 0) + prize;
            addXp(50);
            saveState();
            updateHeaderUI();
            openVerdictModal(
                "ПРИЗЕР АВТОШОУ! 🏆", 
                "Судьи оценили стиль «" + car.name + "» (" + showPoints + " баллов)! Приз за участие: +" + prize.toLocaleString() + " ₽.", 
                true, 
                prize
            );
        }
    } 
    else if (eventId === 'drift') {
        playEngineSound();
        let driftSkillRoll = Math.random();

        // Риск облавы на нелегальном дрифте
        let raidRoll = Math.random();
        let isBusted = (!hasImmunity && raidRoll < 0.45);

        if (isBusted) {
            tgHaptic('error');
            let severeBust = Math.random() < 0.50;

            if (severeBust && (car.tuning?.exhaust || car.tuning?.stance || car.tuning?.chip)) {
                // АННУЛИРОВАНИЕ УЧЁТА (СНЯТИЕ С РЕГИСТРАЦИИ)
                car.unregistered = true;
                car.impounded = true;
                car.impoundedDays = 1;
                car.impoundFine = 45000;
                saveState();
                renderGarage();
                openVerdictModal(
                    "УЧЁТ АННУЛИРОВАН! 🚨", 
                    "Облава спецбатальона! За агрессивный дрифт и незаконный тюнинг регистрация «" + car.name + "» АННУЛИРОВАНА, а машина отправлена на штрафстоянку! Придётся восстанавливать учёт.", 
                    false
                );
            } else {
                // ОБЫЧНАЯ ШТРАФСТОЯНКА
                car.impounded = true;
                car.impoundedDays = 1;
                car.impoundFine = 30000;
                saveState();
                renderGarage();
                openVerdictModal(
                    "ЭВАКУАЦИЯ НА ШТРАФСТОЯНКУ! 🚔", 
                    "ДПС перекрыли выезды с площадки! «" + car.name + "» эвакуирован на штрафстоянку за опасное вождение.", 
                    false
                );
            }
        } else {
            let winBank = Math.round(200000 + Math.random() * 250000);
            state.player.cash = (state.player.cash || 0) + winBank;
            addXp(65);
            saveState();
            updateHeaderUI();
            openVerdictModal(
                "КОРОЛЬ УЛИЧНОГО ДРИФТА! 💨", 
                "Вы раздали угла без ошибок, сорвали овации зрителей и забрали весь банк: +" + winBank.toLocaleString() + " ₽!", 
                true, 
                winBank
            );
        }
    }
}

// ===================== ПРОФИЛЬ И АНАЛИТИКА =====================

function renderProfileAnalytics() {
    let pName = state.player?.name || "Перекуп";
    setTxt('profileTgUsername', pName);
    
    let pStats = state.player?.stats || { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 };
    setTxt('statProfitable', pStats.profitableSales);
    setTxt('statLoss', pStats.lossSales);
    setTxt('statTotalNetProfit', (pStats.totalNetProfit || 0).toLocaleString() + " ₽");
    
    const totalSales = (pStats.profitableSales || 0) + (pStats.lossSales || 0);
    let winrate = (totalSales > 0) ? Math.round((pStats.profitableSales / totalSales) * 100) : 0;
    setTxt('statWinrate', winrate + "%");

    let rank = "Новичок с района";
    let lvl = state.player?.level || 1;
    
    if (lvl >= 50) rank = "Автомобильный Олигарх";
    else if (lvl >= 30) rank = "Хозяин Авторынка";
    else if (lvl >= 20) rank = "Крупный Перекуп";
    else if (lvl >= 10) rank = "Гаражный Профи";
    else if (lvl >= 5) rank = "Бодрый Перекуп";
    
    setTxt('profPlayerRank', "Статус: " + rank);
}

function resetGameData() { 
    if (confirm("Точно сбросить весь прогресс?")) {
        localStorage.removeItem(SAVE_KEY); 
        location.reload(); 
    }
}

function initApp() {
    sanitizeState(); 
    syncTelegramProfile(); 
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
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
}

setInterval(() => {
    let lotChanged = false; 
    if (state.salesLot && state.salesLot.length > 0) {
        state.salesLot.forEach((slot, idx) => { 
            if (slot && slot.timer > 0) { 
                slot.timer -= 1; 
                const progressBar = document.getElementById("lot_progress_fill_" + idx);
                const timerText = document.getElementById("lot_timer_text_" + idx);
                
                if (progressBar) {
                    let pct = Math.max(0, Math.min(100, ((30 - slot.timer) / 30) * 100));
                    progressBar.style.width = pct + "%";
                }
                if (timerText) timerText.innerText = "Ожидание клиента: " + slot.timer + "с";

                if (slot.timer === 0 && !slot.currentBuyer) { 
                    if (typeof generateBuyerForSlot === 'function') generateBuyerForSlot(slot); 
                    lotChanged = true; 
                } 
            } 
        }); 
    }
    
    const sTab = document.getElementById('tabSalesLot');
    if (lotChanged && sTab && sTab.classList.contains('active') && typeof renderSalesLot === 'function') {
        renderSalesLot();
    }
    
    let pFuel = (state.player && state.player.fuel !== undefined) ? state.player.fuel : 100;
    if (pFuel < 100) {
        state.player.fuel = Math.min(100, pFuel + 1);
        setTxt('fuelAmount', state.player.fuel);
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

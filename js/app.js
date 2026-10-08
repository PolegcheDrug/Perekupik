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

const SAVE_KEY = 'perekoop_sim_save_v50_clean';

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
        if (state.player && state.player.vipPro) vipBadge.style.display = 'block';
        else vipBadge.style.display = 'none';
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

function openDailyBonusModal() {
    const grid = document.getElementById('dailyBonusGrid');
    if (!grid) return;
    if (typeof DAILY_REWARDS_CONFIG === 'undefined') return;

    let sDay = 1; if (state.player && state.player.streakDay) sDay = state.player.streakDay;

    let html = "";
    DAILY_REWARDS_CONFIG.forEach(r => {
        let isClaimed = false; if (sDay > r.day) isClaimed = true;
        let isCurrent = false; if (sDay === r.day) isCurrent = true;
        
        let cName = "daily-streak-day";
        if (isClaimed) cName += " claimed";
        if (isCurrent) cName += " current";

        let sym = "🔒";
        if (isClaimed) sym = "✓";
        else if (isCurrent) sym = "★";

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
        let last = 0; if (state.player && state.player.lastClaimedDay) last = state.player.lastClaimedDay;
        let pDay = 1; if (state.player && state.player.day) pDay = state.player.day;
        
        let canClaim = false;
        if (last < pDay) canClaim = true;
        
        claimBtn.disabled = !canClaim;
        if (canClaim) claimBtn.innerText = "Забрать награду";
        else claimBtn.innerText = "Уже получено сегодня";
    }

    const mod = document.getElementById('modalDailyBonus');
    if (mod) mod.classList.add('active');
}

function claimDailyReward() {
    let last = 0; if (state.player && state.player.lastClaimedDay) last = state.player.lastClaimedDay;
    let pDay = 1; if (state.player && state.player.day) pDay = state.player.day;
    if (last >= pDay) return showToast("Награда за сегодня уже забрана!");

    let sDay = 1; if (state.player && state.player.streakDay) sDay = state.player.streakDay;
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
    else if (tabId === 'tabSyndicate') { const el = document.getElementById('bnav
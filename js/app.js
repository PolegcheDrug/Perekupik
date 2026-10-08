// ===================== ЯДРО ИГРЫ И СОСТОЯНИЕ (js/app.js) =====================

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

// --- УТИЛИТЫ (Звук, Вибрация, Уведомления) ---
function tgHaptic(type = 'light') {
    try { 
        if (window.Telegram?.WebApp?.HapticFeedback) { 
            if (['success', 'warning', 'error'].includes(type)) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred(type); 
            } else {
                window.Telegram.WebApp.HapticFeedback.impactOccurred(type); 
            }
        } 
    } catch(e) {}
}

function playSound(type) {
    try {
        if (!audioCtx) audioCtx = new AudioContext();
        const now = audioCtx.currentTime;
        if (type === 'tick') {
            const osc = audioCtx.createOscillator(); const g = audioCtx.createGain(); osc.connect(g); g.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(800, now); g.gain.setValueAtTime(0.06, now); g.gain.linearRampToValueAtTime(0, now + 0.03); osc.start(now); osc.stop(now + 0.03);
        } else if (type === 'win') {
            const osc = audioCtx.createOscillator(); const g = audioCtx.createGain(); osc.connect(g); g.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.2); g.gain.setValueAtTime(0.2, now); g.gain.linearRampToValueAtTime(0, now + 0.25); osc.start(now); osc.stop(now + 0.25);
        }
    } catch(e) {}
}

function playEngineSound() {
    try {
        if (!audioCtx) audioCtx = new AudioContext(); const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator(); const g = audioCtx.createGain(); osc.type = 'sawtooth'; osc.connect(g); g.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(480, now + 0.4); osc.frequency.exponentialRampToValueAtTime(160, now + 0.85);
        g.gain.setValueAtTime(0.25, now); g.gain.linearRampToValueAtTime(0, now + 0.9); osc.start(now); osc.stop(now + 0.9); tgHaptic('medium'); showToast("🔥 РЁВ ВЫХЛОПА: Газ в пол!");
    } catch(e) {}
}

function spawnFloatingReward(text) {
    const el = document.createElement('div'); el.className = 'floating-reward'; el.innerText = text; el.style.left = '50%'; el.style.top = '45%'; document.body.appendChild(el); setTimeout(() => el.remove(), 1200);
}

function setTxt(id, val) { const el = document.getElementById(id); if (el) el.innerHTML = val; }

function showToast(msg) { 
    const t = document.getElementById('toastNotification'); 
    if (!t) return; 
    t.innerText = msg; 
    t.classList.add('show'); 
    setTimeout(() => t.classList.remove('show'), 2300); 
}

function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

function openVerdictModal(title, text, isSuccess, amount = null, profit = null) {
    tgHaptic(isSuccess ? 'success' : 'error'); if (isSuccess) playSound('win');
    setTxt('verdictEmoji', isSuccess ? '🎉' : '❌'); setTxt('verdictTitle', title); setTxt('verdictText', text);
    const amtEl = document.getElementById('verdictAmount'); 
    if (amtEl) { 
        amtEl.style.display = amount ? 'block' : 'none'; 
        if (amount) amtEl.innerText = `+${amount.toLocaleString()} ₽`; 
    }
    const profitEl = document.getElementById('verdictProfitBadge');
    if (profitEl) {
        if (profit !== null) {
            profitEl.style.display = 'block';
            if (profit > 0) { profitEl.className = 'text-xs font-bold mb-3 color-green'; profitEl.innerText = `Чистая прибыль: +${profit.toLocaleString()} ₽ 📈`; } 
            else if (profit < 0) { profitEl.className = 'text-xs font-bold mb-3 color-red'; profitEl.innerText = `Убыток: ${profit.toLocaleString()} ₽ 📉`; } 
            else { profitEl.className = 'text-xs font-bold mb-3 color-amber'; profitEl.innerText = `Сделка закрыта в ноль (0 ₽)`; }
        } else { 
            profitEl.style.display = 'none'; 
        }
    }
    document.getElementById('modalDealVerdict')?.classList.add('active');
}

// --- СОСТОЯНИЕ (STATE) ---
const DEFAULT_STATE = {
    player: { 
        name: "Перекуп #777", avatarUrl: null, cash: 150000, stars: 15, connections: 1, expressTickets: 25, maxExpressTickets: 25, fuel: 100, level: 1, xp: 0, maxXp: 120, baseSlots: 1, 
        vip: false, vipPro: false, lastFreeSpin: 0, club: null, karma: 50, stats: { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 }, 
        hunger: 80, mood: 85, reputation: 30, loanDebt: 0, day: 1, streakDay: 1, lastClaimedDay: 0, lastAutoShowDay: 0, lastAutoShowTimestamp: 0, 
        lastDragRaceTimestamp: 0, lastAdTimestamp: 0, lastContractsRefreshTimestamp: 0, diet: 'shaurma', housingId: 'room', housingType: 'rent', 
        ownedHouses: [], selectedStreetCarIndex: 0, lastBarnDay: 0,
        preSalesCount: 0, preSaleCooldownUntil: 0, policeImmunityDays: 0
    },
    garage: [], salesLot: [], contracts: [], plateCatalog: [], ownedPlates: ["В777ВВ 777"], activeCategory: 'economy', marketFeed: [], p2pMode: 'cars', syndicateSubTab: 'p2p', myP2PListings: [], businesses: [], barnProgress: { car: null, step: 0, tier: 1, plate: '' }, marketModifiers: { economy: 1, comfort: 1, premium: 1, all: 1 }
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

function getTotalGarageSlots() {
    let slots = (state.player.baseSlots || 1); 
    if (typeof HOUSING_LIST !== 'undefined') {
        const house = HOUSING_LIST.find(h => h.id === state.player.housingId); if (house) slots += house.slots;
        if(state.player.ownedHouses && Array.isArray(state.player.ownedHouses)) {
           state.player.ownedHouses.forEach(hId => { const oh = HOUSING_LIST.find(h => h.id === hId); if (oh) slots += oh.slots; }); 
        }
    }
    return slots;
}

function sanitizeState() {
    try { 
        const saved = localStorage.getItem('perekoop_sim_save_v39'); 
        if (saved) {
            const parsed = JSON.parse(saved);
            state.player = { ...DEFAULT_STATE.player, ...(parsed.player || {}) };
            state.player.stats = { ...DEFAULT_STATE.player.stats, ...(state.player.stats || {}) };
            state.garage = Array.isArray(parsed.garage) ? parsed.garage : [];
            state.salesLot = Array.isArray(parsed.salesLot) ? parsed.salesLot : [];
            state.ownedPlates = Array.isArray(parsed.ownedPlates) ? parsed.ownedPlates : ["В777ВВ 777"];
            state.businesses = Array.isArray(parsed.businesses) ? parsed.businesses : (typeof BUSINESS_DATA !== 'undefined' ? BUSINESS_DATA : []);
            state.marketModifiers = parsed.marketModifiers || DEFAULT_STATE.marketModifiers;
            state.barnProgress = parsed.barnProgress || DEFAULT_STATE.barnProgress;
            state.myP2PListings = Array.isArray(parsed.myP2PListings) ? parsed.myP2PListings : [];
        } 
    } catch(e) {}
    
    if (typeof state.player.maxExpressTickets === 'undefined') state.player.maxExpressTickets = 25;
    if (typeof state.player.expressTickets === 'undefined') state.player.expressTickets = state.player.maxExpressTickets;
    if (typeof state.player.policeImmunityDays === 'undefined') state.player.policeImmunityDays = 0;
    if (!state.player.ownedHouses || !Array.isArray(state.player.ownedHouses)) state.player.ownedHouses = [];
    if (isNaN(state.player.cash) || state.player.cash < 0) state.player.cash = 150000;
    if (isNaN(state.player.loanDebt) || state.player.loanDebt < 0) state.player.loanDebt = 0;
    if (typeof state.player.preSalesCount === 'undefined') state.player.preSalesCount = 0;
    if (typeof state.player.preSaleCooldownUntil === 'undefined') state.player.preSaleCooldownUntil = 0;
    
    if (!state.businesses || state.businesses.length === 0) state.businesses = (typeof BUSINESS_DATA !== 'undefined' ? BUSINESS_DATA : []);
    // if (!Array.isArray(state.plateCatalog) || state.plateCatalog.length === 0) refreshPlateCatalog();
    // if (!Array.isArray(state.contracts) || state.contracts.length === 0) generateContracts();
    
    if (typeof BUSINESS_DATA !== 'undefined') {
        state.businesses.forEach((b, idx) => { if (!b.minLevel && BUSINESS_DATA[idx]) b.minLevel = BUSINESS_DATA[idx].minLevel; });
    }
    
    state.garage.forEach((car, index) => {
        if (!car.id) car.id = 'g_' + index + '_' + Date.now();
        if (!car.tuning) car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 };
        if (!car.wear) car.wear = { engine: 100, transmission: 100 };
        if (isNaN(car.purchaseCost) || car.purchaseCost <= 0) car.purchaseCost = car.basePrice || car.price || 100000;
        if (isNaN(car.marketValue) || car.marketValue <= 0) car.marketValue = car.price || 150000;
        if (isNaN(car.power)) car.power = 100;
    });
    state.salesLot.forEach(slot => {
        if (isNaN(slot.askingPrice) || slot.askingPrice <= 0) slot.askingPrice = slot.car.marketValue || 100000;
    });
}

function updateHeaderUI() {
    setTxt('cashAmount', state.player.cash.toLocaleString()); 
    setTxt('starsAmount', state.player.stars); 
    setTxt('fuelAmount', state.player.fuel);
    setTxt('ticketsAmount', `${state.player.expressTickets} / ${state.player.maxExpressTickets}`);
    setTxt('playerName', state.player.name); 
    setTxt('playerLvl', `Ур. ${state.player.level}`); 
    setTxt('connectionsText', `${state.player.connections} 🤝`); 
    setTxt('karmaText', `${state.player.karma} 😇`);
    setTxt('reshalaConnectionsVal', `${state.player.connections} 🤝`);
    
    const pPhoto = document.getElementById('playerTgPhoto'); 
    const dIcon = document.getElementById('defaultAvatarIcon');
    if (state.player.avatarUrl) { 
        pPhoto.src = state.player.avatarUrl; pPhoto.style.display = 'block'; dIcon.style.display = 'none'; 
    } else { 
        pPhoto.style.display = 'none'; dIcon.style.display = 'block'; 
    }
    
    const fill = document.getElementById('xpBar'); 
    if (fill) fill.style.width = `${(state.player.xp / state.player.maxXp) * 100}%`;
    
    setTxt('hungerText', state.player.hunger); 
    document.getElementById('hungerFill').style.width = `${state.player.hunger}%`;
    setTxt('moodText', state.player.mood); 
    document.getElementById('moodFill').style.width = `${state.player.mood}%`;
    document.getElementById('vipBadge').style.display = state.player.vipPro ? 'block' : 'none';
    setTxt('garageHeaderSlots', `${state.garage.length}/${getTotalGarageSlots()}`);
    
    const loanEl = document.getElementById('loanDebtText');
    if(loanEl) loanEl.innerText = `Долг: ${state.player.loanDebt.toLocaleString()} ₽`;
}

function saveState() { 
    try { localStorage.setItem('perekoop_sim_save_v39', JSON.stringify(state)); } catch(e) {} 
    updateHeaderUI(); 
}

function syncTelegramProfile() {
    try {
        const tg = window.Telegram?.WebApp;
        if (tg) { 
            tg.ready(); tg.expand(); 
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) { 
                const u = tg.initDataUnsafe.user; 
                const fullName = [u.first_name, u.last_name].filter(Boolean).join(' '); 
                state.player.name = fullName || (u.username ? '@' + u.username : state.player.name); 
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
        openVerdictModal("Новый уровень!", `Вы достигли ${state.player.level} уровня авторитета!`, true); 
    }
    if (typeof updateLevelGatesUI === 'function') updateLevelGatesUI(); 
    if (typeof checkReshalaAccess === 'function') checkReshalaAccess();
    saveState();
}

// --- НАВИГАЦИЯ ---
function switchTab(tabId) {
    playSound('tick'); tgHaptic('light'); 
    if (typeof resetRaceState === 'function') resetRaceState();
    
    document.querySelectorAll('.tab-screen').forEach(el => el.classList.remove('active')); 
    document.getElementById(tabId)?.classList.add('active');
    
    document.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active')); 
    document.getElementById(`topBtn-${tabId}`)?.classList.add('active');
    
    document.querySelectorAll('.b-nav-item').forEach(b => b.classList.remove('active'));
    
    if (tabId === 'tabMarket') document.getElementById('bnav-tabMarket')?.classList.add('active');
    else if (tabId === 'tabGarage') document.getElementById('bnav-tabGarage')?.classList.add('active');
    else if (tabId === 'tabSalesLot') document.getElementById('bnav-tabSalesLot')?.classList.add('active');
    else if (tabId === 'tabLife' || tabId === 'tabHousing' || tabId === 'tabContainers' || tabId === 'tabContracts' || tabId === 'tabBarn' || tabId === 'tabPlates' || tabId === 'tabReshala' || tabId === 'tabServices') document.getElementById('bnav-tabLife')?.classList.add('active');
    else if (tabId === 'tabSyndicate') document.getElementById('bnav-tabSyndicate')?.classList.add('active');

    if (tabId === 'tabGarage' && typeof renderGarage === 'function') { renderGarage(); if(typeof checkBarterEvent === 'function') checkBarterEvent(); }
    if (tabId === 'tabSalesLot' && typeof renderSalesLot === 'function') renderSalesLot();
    if (tabId === 'tabBusiness' && typeof checkBusinessAccess === 'function') checkBusinessAccess();
    if (tabId === 'tabContainers' && typeof renderContainersList === 'function') renderContainersList();
    if (tabId === 'tabPlates' && typeof renderPlatesPage === 'function') renderPlatesPage();
    if (tabId === 'tabContracts' && typeof renderContracts === 'function') renderContracts();
    if (tabId === 'tabBarn' && typeof renderBarnFind === 'function') renderBarnFind();
    if (tabId === 'tabLife') { 
        if(typeof renderDiets === 'function') renderDiets(); 
        if(typeof renderLifeChat === 'function') renderLifeChat(); 
        if(typeof initCasino === 'function') initCasino(); 
    }
    if (tabId === 'tabHousing' && typeof renderHousing === 'function') renderHousing();
    if (tabId === 'tabServices' && typeof initWheelModule === 'function') initWheelModule();
    if (tabId === 'tabSyndicate' && typeof renderSyndicateHub === 'function') renderSyndicateHub();
    if (tabId === 'tabStreet' && typeof initStreetView === 'function') { initStreetView(); }
    if (tabId === 'tabProfile' && typeof renderProfileAnalytics === 'function') renderProfileAnalytics();
}

function openStreetFromLife() {
    switchTab('tabStreet');
}

// --- ЧИТ-КОДЫ / СБРОС ---
function setCheatLevel(lvl) { state.player.level = lvl; if(typeof updateLevelGatesUI==='function') updateLevelGatesUI(); if(typeof checkReshalaAccess==='function') checkReshalaAccess(); updateHeaderUI(); saveState(); showToast(`Уровень ${lvl}`); switchTab('tabProfile'); }
function cheatAddMoney() { state.player.cash += 10000000; updateHeaderUI(); saveState(); showToast("+10M ₽"); }
function cheatAddStats() { state.player.hunger = 100; state.player.mood = 100; state.player.reputation = 100; updateHeaderUI(); saveState(); showToast("100%!"); }
function resetGameData() { localStorage.removeItem('perekoop_sim_save_v39'); location.reload(); }

// --- ИНИЦИАЛИЗАЦИЯ ИГРЫ ---
function initApp() {
    sanitizeState(); 
    syncTelegramProfile(); 
    updateHeaderUI();
    
    if (typeof updateLevelGatesUI === 'function') updateLevelGatesUI();
    if (typeof checkReshalaAccess === 'function') checkReshalaAccess();
    if (state.marketFeed.length === 0 && typeof populateMarketFeed === 'function') populateMarketFeed();
    if (!Array.isArray(state.plateCatalog) || state.plateCatalog.length === 0) if(typeof refreshPlateCatalog === 'function') refreshPlateCatalog();
    if (!Array.isArray(state.contracts) || state.contracts.length === 0) if(typeof generateContracts === 'function') generateContracts();

    if (typeof renderGarage === 'function') renderGarage(); 
    if (typeof renderSalesLot === 'function') renderSalesLot();
    if (typeof renderDiets === 'function') renderDiets(); 
    if (typeof renderHousing === 'function') renderHousing(); 
    if (typeof renderContracts === 'function') renderContracts(); 
    if (typeof renderContainersList === 'function') renderContainersList(); 
    if (typeof renderPlatesPage === 'function') renderPlatesPage();
    if (typeof renderBarnFind === 'function') renderBarnFind();
    if (typeof renderLifeChat === 'function') renderLifeChat();
    
    switchTab('tabMarket');
}

// --- ГЛОБАЛЬНЫЙ ТАЙМЕР ---
setInterval(() => {
    let lotChanged = false; 
    state.salesLot.forEach((slot, idx) => { 
        if (slot.timer > 0) { 
            slot.timer -= 1; 
            const progressBar = document.getElementById(`lot_progress_fill_${idx}`);
            const timerText = document.getElementById(`lot_timer_text_${idx}`);
            
            if (progressBar) {
                const progressPercent = Math.max(0, Math.min(100, ((30 - slot.timer) / 30) * 100));
                progressBar.style.width = `${progressPercent}%`;
            }
            if (timerText) timerText.innerText = `Ожидание клиента: ${slot.timer}с`;

            if (slot.timer === 0 && !slot.currentBuyer) { 
                if(typeof generateBuyerForSlot === 'function') generateBuyerForSlot(slot); 
                lotChanged = true; 
            } 
        } 
    }); 
    if (lotChanged && document.getElementById('tabSalesLot')?.classList.contains('active') && typeof renderSalesLot === 'function') renderSalesLot();
    
    if (state.player.fuel < 100) {
        state.player.fuel = Math.min(100, state.player.fuel + 1);
        setTxt('fuelAmount', `${state.player.fuel}/100`);
    }
    
    if (document.getElementById('tabMarket')?.classList.contains('active') && typeof updateMarketTimers === 'function') updateMarketTimers();
}, 1000);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
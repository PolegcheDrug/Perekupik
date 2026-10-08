// ===================== ЯДРО ИГРЫ И СОСТОЯНИЕ (js/app.js) =====================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
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
if (!audioCtx) audioCtx = new AudioContext();
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
setTimeout(() => el.remove(), 1200);
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
setTimeout(() => t.classList.remove('show'), 2300);
}
function closeModal(id) {
document.getElementById(id)?.classList.remove('active');
}
function openVerdictModal(title, text, isSuccess, amount = null, profit = null) {
tgHaptic(isSuccess ? 'success' : 'error');
if (isSuccess) playSound('win');
setTxt('verdictEmoji', isSuccess ? '🎉' : '❌');
setTxt('verdictTitle', title);
setTxt('verdictText', text);
const amtEl = document.getElementById('verdictAmount');
if (amtEl) {
amtEl.style.display = amount ? 'block' : 'none';
if (amount) amtEl.innerText = `+${amount.toLocaleString()} ₽`;
}
const profitEl = document.getElementById('verdictProfitBadge');
if (profitEl) {
if (profit !== null) {
profitEl.style.display = 'block';
if (profit > 0) {
profitEl.className = 'text-xs font-bold mb-3 color-green';
profitEl.innerText = `Чистая прибыль: +${profit.toLocaleString()} ₽ 📈`;
} else if (profit < 0) {
profitEl.className = 'text-xs font-bold mb-3 color-red';
profitEl.innerText = `Убыток: ${profit.toLocaleString()} ₽ 📉`;
} else {
profitEl.className = 'text-xs font-bold mb-3 color-amber';
profitEl.innerText = `Сделка закрыта в ноль (0 ₽)`;
}
} else {
profitEl.style.display = 'none';
}
}
document.getElementById('modalDealVerdict')?.classList.add('active');
}
// --- СОСТОЯНИЕ (STATE) ---
const SAVE_KEY = 'perekoop_sim_save_v48_stable';
const DEFAULT_STATE = {
player: {
name: "Перекуп #777",
avatarUrl: null,
cash: 150000,
stars: 15,
connections: 1,
expressTickets: 25,
maxExpressTickets: 25,
fuel: 100,
level: 1,
xp: 0,
maxXp: 120,
baseSlots: 2,
vip: false,
vipPro: false,
lastFreeSpin: 0,
club: null,
karma: 50,
stats: { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 },
hunger: 80,
mood: 85,
reputation: 30,
loanDebt: 0,
day: 1,
streakDay: 1,
lastClaimedDay: 0,
diet: 'shaurma',
housingId: 'room',
housingType: 'rent',
ownedHouses: [],
selectedStreetCarIndex: 0,
lastBarnDay: 0,
preSalesCount: 0,
preSaleCooldownUntil: 0,
policeImmunityDays: 0,
tools: {
gauge: false,
obd: false,
endoscope: false,
compressor: false
},
supplies: {
energyDrinks: 0,
coffee: 0
}
},
garage: [],
salesLot: [],
contracts: [],
plateCatalog: [],
ownedPlates: ["В777ВВ 777"],
activeCategory: 'economy',
marketFeed: [],
p2pMode: 'cars',
syndicateSubTab: 'p2p',
myP2PListings: [],
businesses: [],
confiscatedLot: null,
barnProgress: { car: null, step: 0, tier: 1, plate: '' },
marketModifiers: { economy: 1, comfort: 1, premium: 1, all: 1 }
};
let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
function getGarageSlotCost() {
const extraSlots = Math.max(0, (state.player.baseSlots || 2) - 2);
return Math.round(250000 * Math.pow(1.65, extraSlots));
}
function getExpressTicketUpgradeCost() {
const steps = Math.floor(Math.max(0, (state.player.maxExpressTickets || 25) - 25) / 25);
return Math.round(50000 * Math.pow(1.5, steps));
}
function getTotalGarageSlots() {
let slots = (state.player.baseSlots || 2);
if (typeof HOUSING_LIST !== 'undefined' && Array.isArray(HOUSING_LIST)) {
const house = HOUSING_LIST.find(h => h.id === state.player.housingId);
if (house) slots += house.slots;
if (state.player.ownedHouses && Array.isArray(state.player.ownedHouses)) {
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
state.player = { ...DEFAULT_STATE.player, ...(parsed.player || {}) };
state.player.stats = { ...DEFAULT_STATE.player.stats, ...(parsed.player?.stats || {}) };
state.player.tools = { ...DEFAULT_STATE.player.tools, ...(parsed.player?.tools || {}) };
state.player.supplies = { ...DEFAULT_STATE.player.supplies, ...(parsed.player?.supplies || {}) };
state.garage = Array.isArray(parsed.garage) ? parsed.garage : [];
state.salesLot = Array.isArray(parsed.salesLot) ? parsed.salesLot : [];
state.ownedPlates = Array.isArray(parsed.ownedPlates) ? parsed.ownedPlates : ["В777ВВ 777"];
state.businesses = Array.isArray(parsed.businesses) ? parsed.businesses : (typeof BUSINESS_DATA !== 'undefined' ? BUSINESS_DATA : []);
state.marketModifiers = parsed.marketModifiers || DEFAULT_STATE.marketModifiers;
state.barnProgress = parsed.barnProgress || DEFAULT_STATE.barnProgress;
state.myP2PListings = Array.isArray(parsed.myP2PListings) ? parsed.myP2PListings : [];
state.confiscatedLot = parsed.confiscatedLot || null;
state.marketFeed = Array.isArray(parsed.marketFeed) ? parsed.marketFeed : [];
}
} catch(e) {}
if (typeof state.player.baseSlots === 'undefined' || state.player.baseSlots < 2) state.player.baseSlots = 2;
if (typeof state.player.maxExpressTickets === 'undefined') state.player.maxExpressTickets = 25;
if (typeof state.player.expressTickets === 'undefined') state.player.expressTickets = state.player.maxExpressTickets;
if (typeof state.player.policeImmunityDays === 'undefined') state.player.policeImmunityDays = 0;
if (!state.player.ownedHouses || !Array.isArray(state.player.ownedHouses)) state.player.ownedHouses = [];
if (isNaN(state.player.cash) || state.player.cash < 0) state.player.cash = 150000;
if (isNaN(state.player.loanDebt) || state.player.loanDebt < 0) state.player.loanDebt = 0;
if (!state.player.tools) state.player.tools = { gauge: false, obd: false, endoscope: false, compressor: false };
if (!state.player.supplies) state.player.supplies = { energyDrinks: 0, coffee: 0 };
if (!state.businesses || state.businesses.length === 0) {
state.businesses = (typeof BUSINESS_DATA !== 'undefined' ? BUSINESS_DATA : []);
}
}
function updateHeaderUI() {
setTxt('cashAmount', (state.player.cash || 0).toLocaleString());
setTxt('starsAmount', state.player.stars || 0);
setTxt('fuelAmount', state.player.fuel || 0);
setTxt('ticketsAmount', `${state.player.expressTickets || 0}/${state.player.maxExpressTickets || 25}`);
setTxt('playerName', state.player.name);
setTxt('playerLvl', `Ур. ${state.player.level}`);
setTxt('connectionsText', `${state.player.connections || 0}`);
setTxt('karmaText', `${state.player.karma || 0}`);
setTxt('reshalaConnectionsVal', `${state.player.connections || 0} 🤝`);
const pPhoto = document.getElementById('playerTgPhoto');
const dIcon = document.getElementById('defaultAvatarIcon');
if (state.player.avatarUrl) {
if (pPhoto) { pPhoto.src = state.player.avatarUrl; pPhoto.style.display = 'block'; }
if (dIcon) dIcon.style.display = 'none';
} else {
if (pPhoto) pPhoto.style.display = 'none';
if (dIcon) dIcon.style.display = 'block';
}
const fill = document.getElementById('xpBar');
if (fill) fill.style.width = `${Math.min(100, (state.player.xp / state.player.maxXp) * 100)}%`;
setTxt('hungerText', `${state.player.hunger}%`);
const hFill = document.getElementById('hungerFill');
if (hFill) hFill.style.width = `${state.player.hunger}%`;
setTxt('moodText', `${state.player.mood}%`);
const mFill = document.getElementById('moodFill');
if (mFill) mFill.style.width = `${state.player.mood}%`;
const vipBadge = document.getElementById('vipBadge');
if (vipBadge) vipBadge.style.display = state.player.vipPro ? 'block' : 'none';
setTxt('garageHeaderSlots', `${state.garage.length}/${getTotalGarageSlots()}`);
const slotCost = getGarageSlotCost();
const btnSlot = document.getElementById('btnBuyGarageSlot');
if (btnSlot) btnSlot.innerText = `+1 Бокс (${(slotCost / 1000).toFixed(0)}k ₽)`;
const loanEl = document.getElementById('loanDebtText');
if (loanEl) loanEl.innerText = `Долг: ${(state.player.loanDebt || 0).toLocaleString()} ₽`;
}
function updateLevelGatesUI() {
const lvl = state.player.level || 1;
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
const btn = document.getElementById(`catBtn-${g.id}`);
if (btn) {
if (lvl >= g.minLvl) {
btn.classList.remove('locked');
btn.innerHTML = g.title;
} else {
btn.classList.add('locked');
btn.innerHTML = `<i class="fa-solid fa-lock" id="${g.lockId}">
</i> ${g.title} (${g.minLvl} ур)`;
}
}
});
}
function saveState() {
try {
localStorage.setItem(SAVE_KEY, JSON.stringify(state));
} catch(e) {}
updateHeaderUI();
}
function syncTelegramProfile() {
try {
const tg = window.Telegram?.WebApp;
if (tg) {
tg.ready();
tg.expand();
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
updateLevelGatesUI();
if (typeof checkReshalaAccess === 'function') checkReshalaAccess();
saveState();
}
function openDailyBonusModal() {
const grid = document.getElementById('dailyBonusGrid');
if (!grid || typeof DAILY_REWARDS_CONFIG === 'undefined') return;
grid.innerHTML = DAILY_REWARDS_CONFIG.map(r => {
const isClaimed = state.player.streakDay > r.day;
const isCurrent = state.player.streakDay === r.day;
return `
<div class="daily-streak-day ${isClaimed ? 'claimed' : ''} ${isCurrent ? 'current' : ''}">
  <div class="font-bold text-xs">День ${r.day}</div>
  <div class="sub-label my-1">${r.title}</div>
  <div>${isClaimed ? '✓' : (isCurrent ? '★' : '🔒')}</div>
</div>
`;
}).join('');
const claimBtn = document.getElementById('btnClaimDaily');
if (claimBtn) {
const canClaim = (state.player.lastClaimedDay || 0) < state.player.day;
claimBtn.disabled = !canClaim;
claimBtn.innerText = canClaim ? "Забрать награду" : "Уже получено сегодня";
}
document.getElementById('modalDailyBonus')?.classList.add('active');
}
function claimDailyReward() {
if ((state.player.lastClaimedDay || 0) >= state.player.day) {
return showToast("Награда за сегодня уже забрана!");
}
const currentReward = DAILY_REWARDS_CONFIG.find(r => r.day === state.player.streakDay) || DAILY_REWARDS_CONFIG[0];
const r = currentReward.reward;
if (r.cash) state.player.cash += r.cash;
if (r.fuel) state.player.fuel = Math.min(100, state.player.fuel + r.fuel);
if (r.connections) state.player.connections += r.connections;
if (r.stars) state.player.stars += r.stars;
if (r.specialPlate) state.ownedPlates.push(r.specialPlate);
state.player.lastClaimedDay = state.player.day;
state.player.streakDay = (state.player.streakDay % 7) + 1;
saveState();
closeModal('modalDailyBonus');
playSound('win');
tgHaptic('success');
openVerdictModal("БОНУС ПОЛУЧЕН! 🎁", `Вам начислено: ${currentReward.title}`, true);
}
// --- НАВИГАЦИЯ ---
function switchTab(tabId) {
playSound('tick');
tgHaptic('light');
document.querySelectorAll('.tab-screen').forEach(el => el.classList.remove('active'));
document.getElementById(tabId)?.classList.add('active');
document.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
const targetNavBtn = document.querySelector(`.sub-nav-btn.nav-${tabId}`);
if (targetNavBtn) {
targetNavBtn.classList.add('active');
targetNavBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}
document.querySelectorAll('.b-nav-item').forEach(b => b.classList.remove('active'));
if (tabId === 'tabMarket') document.getElementById('bnav-tabMarket')?.classList.add('active');
else if (tabId === 'tabGarage') document.getElementById('bnav-tabGarage')?.classList.add('active');
else if (tabId === 'tabSalesLot') document.getElementById('bnav-tabSalesLot')?.classList.add('active');
else if (['tabLife', 'tabHousing', 'tabContainers', 'tabContracts', 'tabBarn', 'tabReshala', 'tabServices', 'tabBusiness', 'tabShop', 'tabStreet'].includes(tabId)) {
document.getElementById('bnav-tabLife')?.classList.add('active');
}
else if (tabId === 'tabSyndicate') document.getElementById('bnav-tabSyndicate')?.classList.add('active');
if (tabId === 'tabMarket' && typeof renderMarketFeed === 'function') renderMarketFeed();
if (tabId === 'tabGarage' && typeof renderGarage === 'function') renderGarage();
if (tabId === 'tabSalesLot' && typeof renderSalesLot === 'function') renderSalesLot();
if (tabId === 'tabStreet') renderStreetScreen();
if (tabId === 'tabBusiness' && typeof checkBusinessAccess === 'function') checkBusinessAccess();
if (tabId === 'tabShop' && typeof renderShopTools === 'function') renderShopTools();
if (tabId === 'tabReshala' && typeof renderConfiscatedCardUI === 'function') renderConfiscatedCardUI();
if (tabId === 'tabContainers' && typeof renderContainersList === 'function') renderContainersList();
if (tabId === 'tabContracts' && typeof renderContracts === 'function') renderContracts();
if (tabId === 'tabBarn' && typeof renderBarnFind === 'function') renderBarnFind();
if (tabId === 'tabLife') {
if (typeof renderDiets === 'function') renderDiets();
if (typeof renderLifeChat === 'function') renderLifeChat();
if (typeof initCasino === 'function') initCasino();
}
if (tabId === 'tabHousing' && typeof renderHousing === 'function') renderHousing();
if (tabId === 'tabServices' && typeof initWheelModule === 'function') initWheelModule();
if (tabId === 'tabSyndicate' && typeof renderSyndicateHub === 'function') renderSyndicateHub();
if (tabId === 'tabProfile') renderProfileAnalytics();
}
// ===================== ДВИЖОК СТРИТ / ДРАГ-РЕЙСИНГА =====================
let currentRaceBet = 25000;
let tachoRpm = 1000;
let isGasPressed = false;
let gasInterval = null;
let isRaceRunning = false;
function renderStreetScreen() {
const box = document.getElementById('streetCarPickerBox');
if (!box) return;
if (state.garage.length === 0) {
box.innerHTML = `<div class="sub-label text-center py-2">В гараже пусто! Купите авто для заездов.</div>`;
setTxt('streetSelectedCarHp', '0 л.с.');
return;
}
const selCar = state.garage[state.player.selectedStreetCarIndex] || state.garage[0];
setTxt('streetSelectedCarHp', `${selCar.power || 100} л.с.`);
box.innerHTML = `
<div class="flex-between">
  <div>
    <b class="text-xs color-cyan">${selCar.name}</b>
    <div class="sub-label">${selCar.power || 100} л.с. | Чип: Stage ${selCar.tuning?.chip || 0}</div>
  </div>
  <select onchange="onSelectStreetCar(this.value)" style="background:#131c2e; color:#fff; border:1px solid var(--border-glass); border-radius:6px; padding:6px; font-size:11px; outline:none;">
    ${state.garage.map((c, i) => `<option value="${i}" ${i === state.player.selectedStreetCarIndex ? 'selected' : ''}>${c.name}</option>`).join('')}
  </select>
</div>
`;
}
function onSelectStreetCar(idx) {
state.player.selectedStreetCarIndex = parseInt(idx);
saveState();
renderStreetScreen();
}
function setRaceBet(amt) {
currentRaceBet = amt;
setTxt('raceStatusText', `Ставка установлена: ${amt.toLocaleString()} ₽. Прогрейте мотор!`);
tgHaptic('light');
}
function holdGasPedal() {
if (isRaceRunning) return;
isGasPressed = true;
if (gasInterval) clearInterval(gasInterval);
gasInterval = setInterval(() => {
tachoRpm = Math.min(8000, tachoRpm + 400);
updateTachometerUI();
if (Math.random() < 0.3) playSound('tick');
}, 60);
}
function releaseGasPedal() {
isGasPressed = false;
if (gasInterval) clearInterval(gasInterval);
gasInterval = setInterval(() => {
if (tachoRpm > 1000) {
tachoRpm = Math.max(1000, tachoRpm - 350);
updateTachometerUI();
} else {
clearInterval(gasInterval);
}
}, 80);
}
function updateTachometerUI() {
const needle = document.getElementById('tachoNeedle');
if (!needle) return;
const pct = Math.max(0, Math.min(100, ((tachoRpm - 1000) / 7000) * 100));
needle.style.left = `${pct}%`;
}
function launchDragRace() {
if (isRaceRunning) return;
if (state.garage.length === 0) return showToast("Нет авто для заезда!");
if (state.player.cash < currentRaceBet) return showToast("Не хватает денег на ставку!");
if (state.player.fuel < 10) return showToast("Нужно 10 ⛽ бензина для заезда!");
state.player.cash -= currentRaceBet;
state.player.fuel -= 10;
saveState();
updateHeaderUI();
isRaceRunning = true;
playEngineSound();
const car = state.garage[state.player.selectedStreetCarIndex] || state.garage[0];
const playerHp = car.power || 100;
const rivalHp = Math.round(playerHp * (0.85 + Math.random() * 0.35));
const isPerfectLaunch = tachoRpm >= 5500 && tachoRpm <= 6500;
const launchBonus = isPerfectLaunch ? 35 : (tachoRpm > 7200 ? -20 : 0);
setTxt('raceStatusText', isPerfectLaunch ? '🔥 ИДЕАЛЬНЫЙ ЛАНЧ-СТАРТ!' : '🚦 Заезд начался!');
const pRunner = document.getElementById('playerRaceCarRunner');
const rRunner = document.getElementById('rivalRaceCarRunner');
let pProgress = 0;
let rProgress = 0;
const raceTimer = setInterval(() => {
pProgress += (playerHp / 30) + (launchBonus / 10) + Math.random() * 4;
rProgress += (rivalHp / 30) + Math.random() * 4;
if (pRunner) pRunner.style.left = `${Math.min(92, pProgress)}%`;
if (rRunner) rRunner.style.left = `${Math.min(92, rProgress)}%`;
if (pProgress >= 92 || rProgress >= 92) {
clearInterval(raceTimer);
isRaceRunning = false;
const isWin = pProgress >= rProgress;
if (isWin) {
const prize = currentRaceBet * 2;
state.player.cash += prize;
state.player.mood = Math.min(100, (state.player.mood || 80) + 15);
addXp(30);
saveState();
updateHeaderUI();
openVerdictModal("ПОБЕДА НА 402М! 🏁", `Вы обогнали соперника и забрали банк: +${prize.toLocaleString()} ₽!`, true, prize);
} else {
state.player.mood = Math.max(0, (state.player.mood || 80) - 15);
saveState();
updateHeaderUI();
openVerdictModal("ПОРАЖЕНИЕ 💨", `Соперник оказался быстрее на финише. Банк утерян: -${currentRaceBet.toLocaleString()} ₽.`, false);
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
function renderProfileAnalytics() {
setTxt('profileTgUsername', state.player.name);
const s = state.player.stats || { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 };
setTxt('statProfitable', s.profitableSales || 0);
setTxt('statLoss', s.lossSales || 0);
setTxt('statTotalNetProfit', `${(s.totalNetProfit || 0).toLocaleString()} ₽`);
const totalSales = (s.profitableSales || 0) + (s.lossSales || 0);
const winrate = totalSales > 0 ? Math.round(((s.profitableSales || 0) / totalSales) * 100) : 0;
setTxt('statWinrate', `${winrate}%`);
let rank = "Новичок с района";
if (state.player.level >= 50) rank = "Автомобильный Олигарх";
else if (state.player.level >= 30) rank = "Хозяин Авторынка";
else if (state.player.level >= 20) rank = "Крупный Перекуп";
else if (state.player.level >= 10) rank = "Гаражный Профи";
else if (state.player.level >= 5) rank = "Бодрый Перекуп";
setTxt('profPlayerRank', `Статус: ${rank}`);
}
function setCheatLevel(lvl) {
state.player.level = lvl;
updateLevelGatesUI();
if (typeof checkReshalaAccess === 'function') checkReshalaAccess();
updateHeaderUI();
saveState();
showToast(`Уровень изменён на ${lvl}`);
renderProfileAnalytics();
}
function cheatAddMoney() {
state.player.cash += 10000000;
updateHeaderUI();
saveState();
showToast("+10,000,000 ₽");
}
function resetGameData() {
if (confirm("Точно сбросить весь прогресс?")) {
localStorage.removeItem(SAVE_KEY);
location.reload();
}
}
// --- ИНИЦИАЛИЗАЦИЯ ИГРЫ (ПРЯМОЙ БЕЗОПАСНЫЙ СТАРТ) ---
function initApp() {
sanitizeState();
syncTelegramProfile();
updateHeaderUI();
updateLevelGatesUI();
// Принудительно генерируем и рендерим ленту рынка
if (!state.marketFeed || state.marketFeed.length === 0) {
if (typeof populateMarketFeed === 'function') {
populateMarketFeed();
}
}
if (!Array.isArray(state.plateCatalog) || state.plateCatalog.length === 0) {
if (typeof refreshPlateCatalog === 'function') refreshPlateCatalog();
}
if (!Array.isArray(state.contracts) || state.contracts.length === 0) {
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
if (typeof renderLifeChat === 'function') renderLifeChat();
switchTab('tabMarket');
if (typeof renderMarketFeed === 'function') {
renderMarketFeed();
}
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
if (typeof generateBuyerForSlot === 'function') generateBuyerForSlot(slot);
lotChanged = true;
}
}
});
if (lotChanged && document.getElementById('tabSalesLot')?.classList.contains('active') && typeof renderSalesLot === 'function') {
renderSalesLot();
}
if (state.player.fuel < 100) {
state.player.fuel = Math.min(100, state.player.fuel + 1);
setTxt('fuelAmount', `${state.player.fuel}`);
}
if (document.getElementById('tabMarket')?.classList.contains('active') && typeof updateMarketTimers === 'function') {
updateMarketTimers();
}
}, 1000);
// Запуск без задержек
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', initApp);
} else {
initApp();
}
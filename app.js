// ===================== ОСНОВНОЙ СКРИПТ ИГРЫ (app.js) =====================
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
const PLATE_LETTERS = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];
const REGIONS = ['77', '99', '97', '177', '199', '777', '799', '50', '90', '150', '190', '750'];
function generateNormalPlate() {
const l1 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)]; const l2 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)]; const l3 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
let num = String(Math.floor(Math.random() * 899) + 100); const reg = REGIONS[Math.floor(Math.random() * REGIONS.length)];
return `${l1}${num}${l2}${l3} ${reg}`;
}
function generateCoolPlate() {
const letters = Math.random() > 0.5 ? PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)].repeat(3) : PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)] + PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)].repeat(2);
const coolNums = ['001', '007', '111', '222', '333', '444', '555', '666', '777', '888', '999'];
const num = coolNums[Math.floor(Math.random() * coolNums.length)]; const reg = ['77', '99', '97', '777'][Math.floor(Math.random() * 4)];
return `${letters.charAt(0)}${num}${letters.substring(1)} ${reg}`;
}
function evaluatePlate(plateStr) {
if (!plateStr || plateStr.startsWith('ТРАНЗИТ')) return 0;
let value = 15000; const parts = plateStr.split(' '); if (parts.length < 2) return 0;
const main = parts[0]; const reg = parts[1]; const num = main.replace(/[^0-9]/g, ''); const letters = main.replace(/[^А-Яа-я]/g, '');
if (['001', '007', '777'].includes(num)) value += 300000; else if (num.length === 3 && num[0] === num[1] && num[1] === num[2]) value += 150000; else if (num.includes('00')) value += 50000;
if (letters.length === 3 && letters[0] === letters[1] && letters[1] === letters[2]) value += 200000;
if (['АМР', 'ЕКХ', 'СКР'].includes(letters)) value += 500000; if (['77', '97', '99', '777'].includes(reg)) value += 50000;
return value;
}
function refreshPlateCatalog() {
state.plateCatalog = [];
for(let i=0; i<6; i++) {
const isCool = Math.random() > 0.4;
const p = isCool ? generateCoolPlate() : generateNormalPlate();
state.plateCatalog.push({ plate: p, price: Math.round(evaluatePlate(p) * (1.1 + Math.random()*0.3)) });
}
}
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
const saved = localStorage.getItem('perekoop_sim_save_v38');
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
if (!Array.isArray(state.plateCatalog) || state.plateCatalog.length === 0) refreshPlateCatalog();
if (!Array.isArray(state.contracts) || state.contracts.length === 0) generateContracts();
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
try { localStorage.setItem('perekoop_sim_save_v38', JSON.stringify(state)); } catch(e) {}
updateHeaderUI();
}
function getMarketRefreshCost() { return 150 + (state.player.level * 350); }
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
updateLevelGatesUI();
checkReshalaAccess();
saveState();
}
function switchTab(tabId) {
playSound('tick'); tgHaptic('light'); resetRaceState();
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
if (tabId === 'tabGarage') { renderGarage(); checkBarterEvent(); }
if (tabId === 'tabSalesLot') renderSalesLot();
if (tabId === 'tabBusiness') checkBusinessAccess();
if (tabId === 'tabContainers') renderContainersList();
if (tabId === 'tabPlates') renderPlatesPage();
if (tabId === 'tabContracts') renderContracts();
if (tabId === 'tabBarn') renderBarnFind();
if (tabId === 'tabLife') { renderDiets(); renderLifeChat(); initCasino(); }
if (tabId === 'tabHousing') renderHousing();
if (tabId === 'tabServices') initWheelModule();
if (tabId === 'tabSyndicate') renderSyndicateHub();
if (tabId === 'tabStreet') { initStreetView(); }
if (tabId === 'tabProfile') renderProfileAnalytics();
}
function openStreetFromLife() {
switchTab('tabStreet');
}
let activeInspectCarId = null;
let pendingMarketCar = null;
function getDynamicPrice(basePrice, type) {
const mod = state.marketModifiers[type] || 1;
const globalMod = state.marketModifiers.all || 1;
return Math.floor(basePrice * mod * globalMod);
}
function setCategory(cat) {
const lvl = state.player.level;
if (['moto', 'atv'].includes(cat) && lvl < 16) return showToast("🔒 Нужен 16 ур!");
if (['comfort', 'premium'].includes(cat) && lvl < 30) return showToast("🔒 Нужен 30 ур!");
if (['hyper', 'truck'].includes(cat) && lvl < 50) return showToast("🔒 Нужен 50 ур!");
if (['yacht'].includes(cat) && lvl < 100) return showToast("🔒 Нужен 100 ур!");
state.activeCategory = cat;
document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
document.getElementById(`catBtn-${cat}`)?.classList.add('active');
populateMarketFeed();
}
function refreshMarketFeedManual() {
const cost = getMarketRefreshCost();
if (state.player.cash < cost) return showToast(`Не хватает ${cost.toLocaleString()} ₽!`);
if (state.player.fuel < 5) return showToast("Закончился бензин ⛽!");
state.player.cash -= cost;
state.player.fuel -= 5;
saveState();
populateMarketFeed();
showToast("Лента обновлена (-5 ⛽)!");
}
function populateMarketFeed() {
if (typeof CAR_DATABASE === 'undefined') return showToast("Ошибка загрузки базы автомобилей!");
const pool = CAR_DATABASE[state.activeCategory] || CAR_DATABASE.economy;
state.marketFeed = [];
for (let i = 0; i < 10; i++) {
const template = pool[i % pool.length];
const hasHiddenDefect = typeof OBD_ERRORS !== 'undefined' ? (Math.random() < 0.40) : false;
const isStolen = Math.random() < 0.15;
const carId = 'm_' + Date.now() + '_' + i;
const genPlate = generateNormalPlate();
const dynPrice = getDynamicPrice(template.basePrice, template.type);
const sellerPrice = Math.round(dynPrice * (0.80 + Math.random() * 0.35));
const baseVal = Math.round(dynPrice * 1.15);
const defectObj = hasHiddenDefect ? OBD_ERRORS[Math.floor(Math.random() * OBD_ERRORS.length)] : null;
const sNote = typeof SELLER_ADS_PHRASES !== 'undefined' ? SELLER_ADS_PHRASES[Math.floor(Math.random() * SELLER_ADS_PHRASES.length)] : "Хорошая машина, сел поехал.";
state.marketFeed.push({
id: carId, name: template.name, power: template.power, type: template.type, basePrice: template.basePrice, mileage: Math.floor(Math.random() * 110000) + 14000,
price: sellerPrice, baseMarketValue: baseVal, marketValue: baseVal + evaluatePlate(genPlate),
img: template.img || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80", plate: genPlate,
isStolen: isStolen, autotekaChecked: false, cooldownUntil: 0, stoChecked: false, haggled: false, unavailable: false,
hiddenDefect: defectObj,
sellerNote: sNote, condition: hasHiddenDefect ? 55 : 85, tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 },
wear: { engine: 70 + Math.random()*25, transmission: 70 + Math.random()*25 }, bodyThickness: { hood: Math.random() > 0.6 ? 240 : 110, roof: 100, doors: Math.random() > 0.5 ? 240 : 110, wings: 105 }, rolledOdometer: false, hasAdditive: false, isRepainted: false, isPolished: false, viewed: false
});
}
renderMarketFeed();
}
function renderMarketFeed() {
const container = document.getElementById('marketCardContainer'); if (!container) return;
setTxt('refreshCostText', getMarketRefreshCost().toLocaleString());
const mainContent = document.querySelector('.main-content');
const scrollPos = mainContent ? mainContent.scrollTop : 0;
const now = Date.now();
container.innerHTML = state.marketFeed.map(car => {
if (car.unavailable) return '';
const isBusy = (car.cooldownUntil && car.cooldownUntil > now);
const timeLeft = isBusy ? Math.ceil((car.cooldownUntil - now) / 1000) : 0;
return `<div class="glass-card mb-3 ${isBusy ? 'busy' : ''} ${car.viewed ? 'viewed-card' : ''}" id="card_${car.id}">
${car.viewed ? '<div class="viewed-badge">
<i class="fa-solid fa-eye">
</i> Просмотрено</div>' : ''}
<div class="cooldown-timer">
  <div class="timer-clock" id="timer_num_${car.id}">${timeLeft}с</div>
  <div class="timer-text">Абонент занят</div>
  <button onclick="paidCallMarketCar('${car.id}')" class="btn btn-amber" style="width: 80%;">Платный дозвон (1000 ₽)</button>
</div>
<div class="car-img-wrap">
  <img src="${car.img}" class="car-img" onerror="this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'">
    <div class="badge-tag" style="bottom: 8px; right: 8px;">${(car.type || 'car').toUpperCase()}</div>
    <div class="plate-corner">
      <div class="license-plate">${car.plate} <div class="license-flag">RUS</div>
    </div>
  </div>
</div>
<div class="mb-2">
  <h4 class="font-bold">${car.name}</h4>
  <div class="sub-label mb-2">${car.power || 100} л.с. | Пробег: ${(car.mileage || 0).toLocaleString()} км</div>${car.sellerNote ? `<div class="seller-note-card">${car.sellerNote}</div>` : ''}</div>
  <div class="price-box">
    <div>
      <span class="text-xs color-green font-bold">ЦЕНА:</span>
      <div class="price-val" id="price_txt_${car.id}">${car.price.toLocaleString()} ₽</div>
    </div>
    <div class="sub-label">Рыночная: ~${car.marketValue.toLocaleString()} ₽</div>
  </div>
  <div class="grid-2 mb-2">
    <button onclick="openGaugeModal('${car.id}')" class="btn btn-dark">Толщиномер (3k ₽)</button>
    <button onclick="openAutotekaModal('${car.id}')" class="btn btn-dark">Автотека (${car.autotekaChecked ? '0' : '5k'} ₽)</button>
  </div>
  <button onclick="initiateBuyMarketCar('${car.id}')" class="btn btn-cyan w-full">
    <i class="fa-solid fa-phone">
    </i> Позвонить продавцу</button>
  </div>`;
  }).join('');
  if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
  }
  function initiateBuyMarketCar(carId) {
  const carIndex = state.marketFeed.findIndex(c => c.id === carId); if (carIndex === -1) return;
  const car = state.marketFeed[carIndex];
  car.viewed = true; renderMarketFeed();
  const now = Date.now();
  if (car.cooldownUntil && car.cooldownUntil > now) return showToast("Абонент занят! Перезвоните позже.");
  setTxt('buyCallEmoji', '📞'); setTxt('buyCallTitle', `Звонок по объявлению`); setTxt('buyCallDesc', 'Набираем номер продавца... Идут гудки...');
  const btnBox = document.getElementById('buyCallActionBtnBox');
  if (btnBox) btnBox.innerHTML = `<button class="btn btn-dark w-full" disabled>Ожидание ответа...</button>`;
  document.getElementById('modalBuyCall')?.classList.add('active'); tgHaptic('light');
  setTimeout(() => {
  const roll = Math.random() * 100;
  if (roll < 55) {
  closeModal('modalBuyCall'); openMarketDeal(carId);
  } else if (roll < 85) {
  car.cooldownUntil = Date.now() + (30000 + Math.random() * 30000);
  setTxt('buyCallEmoji', '📵'); setTxt('buyCallTitle', 'Абонент занят'); setTxt('buyCallDesc', 'Короткие гудки... Продавец общается с кем-то другим!');
  btnBox.innerHTML = `<button onclick="closeModal('modalBuyCall')" class="btn btn-dark w-full">Понятно</button>`;
  saveState(); renderMarketFeed();
  } else {
  setTxt('buyCallEmoji', '🚪'); setTxt('buyCallTitle', 'Продавец передумал!'); setTxt('buyCallDesc', '«Извини, брат, оставил себе. Снимаю с продажи!»');
  car.unavailable = true; saveState(); renderMarketFeed();
  btnBox.innerHTML = `<button onclick="closeModal('modalBuyCall')" class="btn btn-dark w-full">Закрыть</button>`;
  }
  }, 1500);
  }
  function paidCallMarketCar(carId) {
  if (state.player.cash < 1000) return showToast("Не хватает 1000 ₽ на пробив номера!");
  state.player.cash -= 1000;
  const carIndex = state.marketFeed.findIndex(c => c.id === carId); if (carIndex === -1) return;
  const car = state.marketFeed[carIndex];
  car.cooldownUntil = 0; saveState(); renderMarketFeed();
  openMarketDeal(carId);
  }
  function openMarketDeal(carId) {
  const carIndex = state.marketFeed.findIndex(c => c.id === carId); if (carIndex === -1) return;
  const car = state.marketFeed[carIndex];
  pendingMarketCar = { car, carIndex };
  document.getElementById('dealCarImg').src = car.img;
  setTxt('dealCarTitle', car.name);
  setTxt('dealCarPrice', `${car.price.toLocaleString()} ₽`);
  setTxt('dealSellerMessage', `«Ало, да, продаю. Приезжай смотри, машина огонь!»`);
  const haggleArea = document.getElementById('dealHaggleArea');
  if (car.haggled) haggleArea.style.display = 'none'; else haggleArea.style.display = 'block';
  document.getElementById('modalMarketDeal').classList.add('active'); playSound('tick');
  }
  function attemptMarketHaggle(percent) {
  if (!pendingMarketCar) return; const car = pendingMarketCar.car;
  if (car.haggled) return showToast("Продавец больше не пойдет на уступки!");
  let successChance = percent === 3 ? 80 : (percent === 7 ? 45 : 15);
  successChance += (state.player.level * 0.5) + (state.player.karma > 60 ? 10 : 0);
  car.haggled = true; document.getElementById('dealHaggleArea').style.display = 'none';
  if (Math.random() * 100 <= successChance) {
  const disc = Math.round(car.price * (percent / 100));
  car.price = Math.max(10000, car.price - disc);
  setTxt('dealCarPrice', `${car.price.toLocaleString()} ₽`);
  setTxt('dealSellerMessage', `«Ладно, уболтал... Скину ${disc.toLocaleString()} ₽. По рукам!»`);
  playSound('win'); tgHaptic('success');
  } else {
  setTxt('dealSellerMessage', `«Ни копейки не скину! Бери за сколько стоит или уходи.»`);
  tgHaptic('error');
  }
  saveState();
  }
  function confirmMarketPurchaseSuccess() {
  if (!pendingMarketCar) return;
  const { car, carIndex } = pendingMarketCar;
  const maxSlots = getTotalGarageSlots();
  if (state.garage.length >= maxSlots) return showToast(`Гараж полон! Вместимость: ${maxSlots} мест.`);
  if (state.player.cash < car.price) return showToast("Недостаточно денег на выкуп!");
  closeModal('modalMarketDeal');
  state.player.cash -= car.price;
  state.player.stats.bought += 1;
  state.garage.push({ ...car, customPlate: car.plate, impounded: false, purchaseCost: car.price, wear: car.wear || { engine: 90, transmission: 90 }, preSaleVisited: false });
  state.marketFeed.splice(carIndex, 1); pendingMarketCar = null;
  addXp(40);
  showToast(`✅ ${car.name} куплен за ${car.price.toLocaleString()} ₽!`); playSound('win'); tgHaptic('success'); spawnFloatingReward(`-${car.price.toLocaleString()} ₽`);
  saveState(); renderMarketFeed(); renderGarage(); setTimeout(() => switchTab('tabGarage'), 350);
  }
  function openGaugeModal(carId) {
  activeInspectCarId = carId; const car = state.marketFeed.find(c => c.id === carId); if (car) car.viewed = true;
  if (state.player.cash < 3000) return showToast("Не хватает 3,000 ₽ на замер!");
  state.player.cash -= 3000; saveState(); document.getElementById('modalGauge')?.classList.add('active'); renderMarketFeed();
  }
  function checkBodyPart(part) {
  if (!activeInspectCarId) return; const car = state.marketFeed.find(c => c.id === activeInspectCarId); if (!car) return;
  playSound('tick'); tgHaptic('light');
  const val = car.bodyThickness[part];
  const el = document.getElementById(`part-${part}`);
  if (el) el.innerHTML = val > 200 ? `<span class="color-red">${val} мкм (Окрас)</span>` : `<span class="color-green">${val} мкм (Завод)</span>`;
  }
  function openAutotekaModal(carId) {
  const car = state.marketFeed.find(c => c.id === carId); if (!car) return; car.viewed = true;
  if (!car.autotekaChecked) {
  const cost = state.player.vipPro ? 0 : 5000;
  if (state.player.cash < cost && !state.player.vipPro) return showToast("Автотека стоит 5,000 ₽!");
  state.player.cash -= cost; car.autotekaChecked = true; saveState();
  }
  const stat = car.isStolen ? "<b class='color-red'>В РОЗЫСКЕ (Перебиты VIN)</b>" : "<b class='color-green'>Юридически чист</b>";
  const rep = document.getElementById('autotekaReportContent');
  if (rep) {
  rep.innerHTML = `<div class="mb-1 font-bold">${car.name} (${car.plate})</div>
  <div>ДТП в базе: <b>${car.hiddenDefect ? '2' : '0'} шт.</b>
</div>
<div class="mt-1">Юридический статус: ${stat}</div>`;
}
document.getElementById('modalAutoteka')?.classList.add('active'); renderMarketFeed();
}
let selectedCarIndex = null;
let activePreSaleCarIndex = null;
let carToLotIndex = null;
function renderGarage() {
const list = document.getElementById('garageList'); if (!list) return;
const totalSlots = getTotalGarageSlots(); setTxt('garageDetailedSlots', `${state.garage.length} из ${totalSlots} боксов занято`);
const mainContent = document.querySelector('.main-content'); const scrollPos = mainContent ? mainContent.scrollTop : 0;
if (state.garage.length === 0) {
list.innerHTML = `<div class="glass-card text-center sub-label py-8">
<i class="fa-solid fa-warehouse color-cyan mb-2" style="font-size:32px;">
</i>
<div>Гараж пуст. Выберите технику на авторынке или P2P!</div>
</div>`;
return;
}
list.innerHTML = state.garage.map((car, idx) => {
const cost = car.purchaseCost || car.basePrice || 100000;
return `<div class="glass-card mb-3 ${car.hiddenDefect && !car.hasAdditive ? 'card-danger' : ''}">
<div class="car-img-wrap" style="height: 140px;">
  <img src="${car.img}" class="car-img" onerror="this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'">
    <div class="badge-tag" style="bottom: 8px; right: 8px;">${(car.type || 'car').toUpperCase()}</div>
    <div class="plate-corner">
      <div class="license-plate">${car.customPlate || car.plate} <div class="license-flag">RUS</div>
    </div>
  </div>
</div>
<div class="flex-between mb-2">
  <div>
    <h4 class="font-bold">${car.name}</h4>
    <div class="sub-label">${car.power || 100} л.с. | Пробег: ${(car.mileage || 85000).toLocaleString()} км | Сост: ${car.condition || 85}%</div>
    <div class="text-xs color-amber mt-1">Куплена за: <b>${cost.toLocaleString()} ₽</b>
  </div>
</div>
<div class="text-right">
  <div class="sub-label">Оценка:</div>
  <div class="price-val">${(car.marketValue || car.price).toLocaleString()} ₽</div>
</div>
</div>
${car.hiddenDefect ? `<div class="legal-warning mb-2">
<span>⚠ <b>${car.hasAdditive ? 'Присадка залита' : car.hiddenDefect.text}</b>
</span>
<button onclick="repairCarDefect(${idx})" class="btn btn-amber btn-auto btn-sm">Капиталка (${car.hiddenDefect.cost.toLocaleString()} ₽)</button>
</div>` : ''}
${car.impounded ? `<div class="legal-warning mb-2">
<span>🚨 <b>НА ШТРАФСТОЯНКЕ</b>
</span>
<button onclick="unimpoundCar(${idx})" class="btn btn-cyan btn-auto btn-sm">Вызволить (1 🤝 или 100k ₽)</button>
</div>` : ''}
<div class="grid-2 mb-2">
  <button onclick="openPreviewModal(${idx})" class="btn btn-dark">🔍 Осмотр & Звук</button>
  <button onclick="openPreSaleModal(${idx})" class="btn btn-dark" ${car.impounded ? 'disabled' : ''}>🪄 Предпродажка</button>
</div>
<div class="grid-2 mb-2">
  <button onclick="openTuningModal(${idx})" class="btn btn-dark" ${car.impounded ? 'disabled' : ''}>🛠 Тюнинг</button>
  <button onclick="openPutOnLotModal(${idx})" class="btn btn-green" ${car.impounded ? 'disabled' : ''}>🏪 На площадку</button>
</div>
<button onclick="scrapCar(${idx})" class="btn btn-dark btn-sm w-full">Сдать на разборку (-35% стоимости)</button>
</div>`;
}).join('');
if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
}
function buyGarageSlot() {
if (state.player.cash < 250000) return showToast("Нужно 250,000 ₽");
state.player.cash -= 250000; state.player.baseSlots += 1; saveState(); renderGarage(); showToast("Добавлен +1 бокс в гараж!");
}
function scrapCar(idx) {
const car = state.garage[idx]; const scrapPrice = Math.round((car.baseMarketValue || car.price) * 0.65);
state.player.cash += scrapPrice; state.player.mood = Math.max(0, state.player.mood - 10);
state.player.stats.sold += 1;
state.garage.splice(idx, 1); saveState(); renderGarage(); showToast(`Авто сдано на разбор за ${scrapPrice.toLocaleString()} ₽`);
}
function openPreviewModal(idx) {
selectedCarIndex = idx; const car = state.garage[idx]; document.getElementById('prevImg').src = car.img || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
setTxt('prevTypeBadge', (car.type || 'car').toUpperCase()); document.getElementById('prevPlate').innerHTML = `${car.customPlate || car.plate} <div class="license-flag">RUS</div>`;
setTxt('prevTitle', car.name); setTxt('prevSpecs', `${car.power || 100} л.с. | Разгон: ~6.2с | Состояние: ${car.condition || 85}%`);
setTxt('prevCostDetails', `Себестоимость выкупа: ${(car.purchaseCost || car.basePrice || 0).toLocaleString()} ₽`); setTxt('prevPrice', `${(car.marketValue || car.price).toLocaleString()} ₽`); document.getElementById('modalPreview')?.classList.add('active');
}
function openTuningFromPreview() { if (selectedCarIndex === null) return; closeModal('modalPreview'); openTuningModal(selectedCarIndex); }
function openPreSaleModal(idx) {
const now = Date.now();
if (state.player.preSaleCooldownUntil && state.player.preSaleCooldownUntil > now) {
const mins = Math.ceil((state.player.preSaleCooldownUntil - now) / 60000);
return showToast(`Мастера на перерыве! Предпродажка недоступна еще ${mins} мин.`);
}
activePreSaleCarIndex = idx;
const car = state.garage[idx];
if (!car.preSaleVisited) {
if (state.player.preSalesCount >= 10) {
state.player.preSaleCooldownUntil = now + 3600000;
state.player.preSalesCount = 0;
saveState();
return showToast(`Лимит (10 машин) исчерпан! Студия закрыта на 1 час.`);
}
car.preSaleVisited = true;
state.player.preSalesCount = (state.player.preSalesCount || 0) + 1;
saveState();
}
setTxt('preSaleCarTitle', `${car.name} (Оценка: ${car.marketValue.toLocaleString()} ₽) | ${10 - state.player.preSalesCount} авто до паузы`);
const wash = state.businesses.find(b => b.id === 'wash');
const sto = state.businesses.find(b => b.id === 'sto');
const cleanCost = (wash && wash.level >= 3) ? 0 : (wash && wash.level > 0 ? 2000 : 4000);
const paintCost = (sto && sto.level > 0) ? 6000 : 12000;
const btnClean = document.getElementById('btnCleanPrice');
const btnPaint = document.getElementById('btnPaintPrice');
const btnAdditive = document.getElementById('btnAdditivePrice');
const btnOdometer = document.getElementById('btnOdometerPrice');
if(btnClean) { btnClean.innerText = car.isPolished ? 'Сделано' : `${cleanCost.toLocaleString()} ₽`; btnClean.disabled = car.isPolished; btnClean.className = car.isPolished ? 'btn btn-dark btn-sm opacity-50' : 'btn btn-cyan btn-sm'; }
if(btnPaint) { btnPaint.innerText = car.isRepainted ? 'Сделано' : `${paintCost.toLocaleString()} ₽`; btnPaint.disabled = car.isRepainted; btnPaint.className = car.isRepainted ? 'btn btn-dark btn-sm opacity-50' : 'btn btn-dark btn-sm'; }
if(btnAdditive) { btnAdditive.innerText = car.hasAdditive ? 'Сделано' : `6,000 ₽`; btnAdditive.disabled = car.hasAdditive; btnAdditive.className = car.hasAdditive ? 'btn btn-dark btn-sm opacity-50' : 'btn btn-amber btn-sm'; }
if(btnOdometer) { btnOdometer.innerText = car.rolledOdometer ? 'Сделано' : `8,000 ₽`; btnOdometer.disabled = car.rolledOdometer; btnOdometer.className = car.rolledOdometer ? 'btn btn-dark btn-sm opacity-50' : 'btn btn-danger btn-sm'; }
document.getElementById('modalPreSale')?.classList.add('active');
}
function applyPreSaleMod(type) {
if (activePreSaleCarIndex === null) return;
const car = state.garage[activePreSaleCarIndex];
const wash = state.businesses.find(b => b.id === 'wash');
const sto = state.businesses.find(b => b.id === 'sto');
const cleanCost = (wash && wash.level >= 3) ? 0 : (wash && wash.level > 0 ? 2000 : 4000);
const paintCost = (sto && sto.level > 0) ? 6000 : 12000;
if (type === 'clean') {
if (car.isPolished) return showToast("Уже отполировано!");
if (state.player.cash < cleanCost) return showToast("Не хватает денег!");
state.player.cash -= cleanCost; car.isPolished = true; car.baseMarketValue = Math.round(car.baseMarketValue * 1.05); car.marketValue = car.baseMarketValue + evaluatePlate(car.customPlate); showToast("✨ Фары отполированы, салон чист! +5% к цене.");
}
else if (type === 'paint') {
if (car.isRepainted) return showToast("Уже окрашено!");
if (state.player.cash < paintCost) return showToast("Не хватает денег!");
state.player.cash -= paintCost; car.condition = Math.min(100, car.condition + 20); car.isRepainted = true; car.bodyThickness.doors = 280; showToast("🎨 Детали окрашены у дяди Вани! Толщиномер покажет слой.");
}
else if (type === 'additive') {
if (car.hasAdditive) return showToast("Присадка уже залита!");
if (state.player.cash < 6000) return showToast("Не хватает 6,000 ₽!");
state.player.cash -= 6000; car.hasAdditive = true; showToast("🧪 Присадка залита! Стук временно скрыт.");
}
else if (type === 'odometer') {
if (car.rolledOdometer) return showToast("Пробег уже скручивался!");
if (state.player.cash < 8000) return showToast("Не хватает 8,000 ₽!");
state.player.cash -= 8000; car.mileage = Math.round((car.mileage || 85000) / 2); car.baseMarketValue = Math.round(car.baseMarketValue * 1.15); car.marketValue = car.baseMarketValue + evaluatePlate(car.customPlate); car.rolledOdometer = true; showToast("⏳ Пробег скручен вдвое! Машина помолодела.");
}
saveState();
renderGarage();
openPreSaleModal(activePreSaleCarIndex);
}
function repairCarDefect(idx) {
const car = state.garage[idx]; const sto = state.businesses.find(b => b.id === 'sto'); let cost = car.hiddenDefect ? car.hiddenDefect.cost : 10000; if (sto && sto.level > 0) cost = Math.round(cost * 0.6);
if (state.player.cash < cost) return showToast("Не хватает денег на капремонт!"); state.player.cash -= cost; car.hiddenDefect = null; car.hasAdditive = false; car.condition = 95; saveState(); renderGarage(); showToast("Дефект устранён!");
}
let obdActiveCarIdx = null;
function openOBD2Modal() {
if (selectedCarIndex === null) return; obdActiveCarIdx = selectedCarIndex; const car = state.garage[selectedCarIndex]; closeModal('modalPreview');
car.stoChecked = true; setTxt('obd2CarTitle', `Диагностика: ${car.name}`); const resBox = document.getElementById('obd2ResultBox'); const actBox = document.getElementById('obd2ActionBox');
resBox.innerHTML = `Подключение...<br>`; actBox.innerHTML = ``; document.getElementById('modalOBD2').classList.add('active');
setTimeout(() => {
let issuesHtml = `<b>Отчет об узлах:</b>
<br>Двигатель: ${Math.round(car.wear.engine)}% ресурса<br>Трансмиссия: ${Math.round(car.wear.transmission)}% ресурса<br>`;
  if (car.hiddenDefect) { issuesHtml += `<br>
  <span class="color-red">НАЙДЕНЫ ОШИБКИ В ЭБУ:</span>
  <br>${car.hiddenDefect.text}`; actBox.innerHTML = `<button onclick="repairOBDErrorFromScanner()" class="btn btn-amber w-full">Устранить неисправность (${car.hiddenDefect.cost.toLocaleString()} ₽)</button>`; } else { issuesHtml += `<br>
  <span class="color-green">Ошибок (DTC) не обнаружено. Агрегаты в норме.</span>`; }
  resBox.innerHTML = issuesHtml;
  }, 900);
  }
  function closeOBD2Modal() { closeModal('modalOBD2'); if (obdActiveCarIdx !== null) openPreviewModal(obdActiveCarIdx); }
  function repairOBDErrorFromScanner() {
  if (obdActiveCarIdx === null) return; const car = state.garage[obdActiveCarIdx]; if (!car.hiddenDefect) return;
  if (state.player.cash < car.hiddenDefect.cost) return showToast("Недостаточно денег на ремонт!");
  state.player.cash -= car.hiddenDefect.cost;
  car.hiddenDefect = null;
  car.wear.engine = Math.max(90, car.wear.engine + 40); car.wear.transmission = Math.max(90, car.wear.transmission + 40);
  car.baseMarketValue = Math.round(car.baseMarketValue * 1.08); car.marketValue = car.baseMarketValue + evaluatePlate(car.customPlate);
  saveState(); closeOBD2Modal(); renderGarage(); showToast("Ремонт узлов выполнен успешно!");
  }
  function openChangePlateModal() {
  if (selectedCarIndex === null) return; const list = document.getElementById('changePlateList'); if (!list) return;
  if (state.ownedPlates.length === 0) list.innerHTML = `<div class="sub-label">У вас нет номеров в коллекции!</div>`;
  else { list.innerHTML = state.ownedPlates.map((p, i) => `<div class="glass-card flex-between w-full mb-1 p-2">
  <div class="license-plate">${p} <div class="license-flag">RUS</div>
</div>
<button onclick="installPlateOnCar('${p}', ${i})" class="btn btn-cyan btn-auto btn-sm">Установить</button>
</div>`).join(''); }
document.getElementById('modalChangePlate')?.classList.add('active');
}
function removePlateFromCar() {
if (selectedCarIndex === null) return; const car = state.garage[selectedCarIndex]; const oldPlate = car.customPlate || car.plate;
if (oldPlate && oldPlate.startsWith('ТРАНЗИТ')) return showToast("На авто уже стоят транзитные номера!");
if (state.player.cash < 2000) return showToast("Нужно 2,000 ₽ на снятие!");
state.player.cash -= 2000;
if (oldPlate) state.ownedPlates.push(oldPlate);
const transitNum = Math.floor(Math.random() * 9000) + 1000; car.customPlate = `ТРАНЗИТ ${transitNum}`; car.marketValue = car.baseMarketValue;
saveState(); closeModal('modalChangePlate'); openPreviewModal(selectedCarIndex); renderGarage(); showToast("Номер снят в инвентарь (-2,000 ₽). Выданы транзиты!");
}
function installPlateOnCar(plate, plateIdx) {
if (selectedCarIndex === null) return; const car = state.garage[selectedCarIndex]; const oldPlate = car.customPlate || car.plate;
if (state.player.cash < 2000) return showToast("Нужно 2,000 ₽ на установку!");
state.player.cash -= 2000;
if (oldPlate && !oldPlate.startsWith('ТРАНЗИТ')) state.ownedPlates.push(oldPlate);
car.customPlate = plate; car.marketValue = car.baseMarketValue + evaluatePlate(plate);
state.ownedPlates.splice(plateIdx, 1);
saveState(); closeModal('modalChangePlate'); openPreviewModal(selectedCarIndex); renderGarage(); showToast(`✅ Госномер ${plate} установлен (-2,000 ₽)!`);
}
function openTuningModal(idx) {
selectedCarIndex = idx; const car = state.garage[idx];
if (!car.tuning) car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 };
setTxt('tuneCarTitle', `${car.name} (${car.power || 100} л.с.)`);
updateTuningRiskUI(car);
const c = document.getElementById('tuningItemsContainer');
if (c) {
c.innerHTML = `
<div class="tuning-row">
  <div>
    <div class="font-bold text-xs">Чип-Тюнинг Stage</div>
    <div class="sub-label">+30 л.с. | Лимит: Stage 3</div>
  </div>
  <button onclick="applyTuningMod('chip')" class="btn btn-dark btn-auto btn-sm" ${state.player.level < 5 ? 'disabled' : ''}>
    ${state.player.level < 5 ? 'С 5 УР' : '50,000 ₽'}
  </button>
</div>
<div class="tuning-row">
  <div>
    <div class="font-bold text-xs">Прямоточный Выхлоп</div>
    <div class="sub-label">+25% риск 12.5.1</div>
  </div>
  <button onclick="applyTuningMod('exhaust')" class="btn btn-dark btn-auto btn-sm" ${state.player.level < 10 ? 'disabled' : ''}>
    ${state.player.level < 10 ? 'С 10 УР' : '35,000 ₽'}
  </button>
</div>
<div class="tuning-row">
  <div>
    <div class="font-bold text-xs">Пневмоподвеска (Стенс)</div>
    <div class="sub-label">+40 баллов на Автошоу</div>
  </div>
  <button onclick="applyTuningMod('stance')" class="btn btn-dark btn-auto btn-sm" ${state.player.level < 15 ? 'disabled' : ''}>
    ${state.player.level < 15 ? 'С 15 УР' : '45,000 ₽'}
  </button>
</div>
<div class="tuning-row">
  <div>
    <div class="font-bold text-xs">Спортивный Обвес</div>
    <div class="sub-label">+15% риск</div>
  </div>
  <button onclick="applyTuningMod('bodykit')" class="btn btn-dark btn-auto btn-sm" ${state.player.level < 20 ? 'disabled' : ''}>
    ${state.player.level < 20 ? 'С 20 УР' : '60,000 ₽'}
  </button>
</div>
`;
}
document.getElementById('modalTuning')?.classList.add('active');
}
function updateTuningRiskUI(car) { const risk = car.tuning?.risk1251 || 0; setTxt('tuneRiskValue', `${risk}%`); const fill = document.getElementById('tuneRiskFill'); if (fill) fill.style.width = `${Math.min(100, risk)}%`; }
function applyTuningMod(type) {
if (selectedCarIndex === null) return; const car = state.garage[selectedCarIndex]; if (!car.tuning) car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 };
if (type === 'chip') {
if (state.player.level < 5) return showToast("Требуется 5 уровень!");
if (car.tuning.chip >= 3) return showToast("Максимальный уровень Stage 3 уже установлен!");
if (state.player.cash < 50000) return showToast("Не хватает 50,000 ₽!");
state.player.cash -= 50000; car.tuning.chip += 1; car.power = (car.power || 100) + 30; car.tuning.risk1251 += 15;
}
else if (type === 'exhaust') {
if (state.player.level < 10) return showToast("Требуется 10 уровень!");
if (car.tuning.exhaust) return showToast("Прямоток уже стоит!");
if (state.player.cash < 35000) return showToast("Не хватает 35,000 ₽!");
state.player.cash -= 35000; car.tuning.exhaust = true; car.tuning.risk1251 += 25;
}
else if (type === 'stance') {
if (state.player.level < 15) return showToast("Требуется 15 уровень!");
if (car.tuning.stance) return showToast("Пневма уже настроена!");
if (state.player.cash < 45000) return showToast("Не хватает 45,000 ₽!");
state.player.cash -= 45000; car.tuning.stance = true; car.tuning.risk1251 += 20;
}
else if (type === 'bodykit') {
if (state.player.level < 20) return showToast("Требуется 20 уровень!");
if (car.tuning.bodykit) return showToast("Обвес уже установлен!");
if (state.player.cash < 60000) return showToast("Не хватает 60,000 ₽!");
state.player.cash -= 60000; car.tuning.bodykit = true; car.tuning.risk1251 += 15;
}
updateTuningRiskUI(car); saveState(); renderGarage(); showToast("Тюнинг установлен!");
}
function unimpoundCar(idx) {
const sto = state.businesses.find(b => b.id === 'sto'); if (sto && sto.level > 0 && Math.random() < 0.5) { state.garage[idx].impounded = false; saveState(); renderGarage(); return showToast("🔧 Дядя Ваня с СТО договорился на штрафстоянке! Авто спасено."); }
if (state.player.connections >= 1) { state.player.connections -= 1; state.garage[idx].impounded = false; showToast("Авто вызволено через связи 🤝!"); }
else if (state.player.cash >= 100000) { state.player.cash -= 100000; state.garage[idx].impounded = false; showToast("Штрафстоянка оплачена (100,000 ₽)!"); }
else { return showToast("Нужно 100,000 ₽ или 1 Связь (🤝)!"); }
saveState(); renderGarage();
}
let activeHaggleSlotIdx = null;
function openPutOnLotModal(idx) {
carToLotIndex = idx; const car = state.garage[idx]; const cost = car.purchaseCost || car.basePrice || 100000;
setTxt('lotPutCarTitle', `${car.name} (Оценка: ${(car.marketValue || car.price).toLocaleString()} ₽)`);
setTxt('lotCostInfo', `Начальная себестоимость: ${cost.toLocaleString()} ₽`);
setTxt('lotRecPriceText', `Рекомендуемая рыночная: ~${(car.marketValue || car.price).toLocaleString()} ₽`);
const input = document.getElementById('lotAskingPriceInput'); if (input) input.value = car.marketValue || car.price;
document.getElementById('modalPutOnLot')?.classList.add('active');
}
function confirmPutOnLot() {
if (carToLotIndex === null) return; const car = state.garage[carToLotIndex]; const input = document.getElementById('lotAskingPriceInput');
let askingPrice = parseInt(input.value);
if (isNaN(askingPrice) || askingPrice <= 0) return showToast("Введите корректную сумму для продажи!");
if (askingPrice > 999999999) askingPrice = 999999999;
closeModal('modalPutOnLot');
state.garage.splice(carToLotIndex, 1);
state.salesLot.push({ id: 'lot_' + Date.now(), car: car, askingPrice: askingPrice, timer: 30, currentBuyer: null });
saveState(); renderGarage(); renderSalesLot(); tgHaptic('success'); showToast(`🚗 ${car.name} выставлен на площадку!`); setTimeout(() => switchTab('tabSalesLot'), 300);
}
// ===================== ПЛОЩАДКА ПРОДАЖ =====================
function upgradeExpressCapacity() {
if (state.player.maxExpressTickets >= 200) return showToast("Достигнут абсолютный максимум склада (200)!");
const cost = (state.player.maxExpressTickets / 25) * 50000;
if (state.player.cash < cost) return showToast(`Не хватает денег! Нужно ${cost.toLocaleString()} ₽`);
state.player.cash -= cost;
state.player.maxExpressTickets += 25;
saveState();
renderSalesLot();
showToast(`Вместимость склада увеличена до ${state.player.maxExpressTickets}!`);
}
function renderSalesLot() {
const list = document.getElementById('salesLotList'); if (!list) return;
setTxt('lotCountBadge', `${state.salesLot.length} авто на продаже`);
setTxt('expressCountDisplay', `${state.player.expressTickets} / ${state.player.maxExpressTickets}`);
const upgBtn = document.getElementById('btnUpgradeTickets');
if (upgBtn) {
const cost = (state.player.maxExpressTickets / 25) * 50000;
upgBtn.innerText = state.player.maxExpressTickets >= 200 ? 'МАКСИМУМ' : `Расширить (${cost/1000}k ₽)`;
if(state.player.maxExpressTickets >= 200) upgBtn.disabled = true;
}
const mainContent = document.querySelector('.main-content'); const scrollPos = mainContent ? mainContent.scrollTop : 0;
if (state.salesLot.length === 0) {
list.innerHTML = `<div class="glass-card text-center sub-label py-8">
<i class="fa-solid fa-car-on color-green mb-2" style="font-size:32px;">
</i>
<div>Площадка пуста. Выставьте авто из гаража.</div>
</div>`;
return;
}
list.innerHTML = state.salesLot.map((slot, idx) => {
const car = slot.car; const buyer = slot.currentBuyer;
const progressPercent = Math.max(0, Math.min(100, ((30 - slot.timer) / 30) * 100));
return `
<div class="glass-card mb-3">
  <div class="car-img-wrap" style="height:130px;">
    <img src="${car.img}" class="car-img" onerror="this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'">
      <div class="plate-corner">
        <div class="license-plate">${car.customPlate || car.plate}</div>
      </div>
    </div>
    <div class="flex-between mb-2">
      <div>
        <h4 class="font-bold">${car.name}</h4>
        <div class="sub-label">Цена: <b class="color-green">${slot.askingPrice.toLocaleString()} ₽</b>
      </div>
    </div>
    <div>
      ${slot.timer <= 0 ? `<span class="tag-badge bg-tag-green">Клиент у капота!</span>` : ''}
    </div>
  </div>
  ${slot.timer > 0 ? `
  <div class="lot-progress-wrap">
    <div class="lot-progress-bar" id="lot_progress_fill_${idx}" style="width: ${progressPercent}%;">
    </div>
  </div>
  <div class="sub-label mb-2 text-center" id="lot_timer_text_${idx}">Ожидание клиента: ${slot.timer}с</div>
  <div class="grid-2 mb-2">
    <button onclick="speedUpLotWithTicket(${idx})" class="btn btn-purple btn-sm">🎟️ Пропуск (${state.player.expressTickets || 0} шт)</button>
    <button onclick="speedUpLotWithStars(${idx})" class="btn btn-amber btn-sm">⭐ 5 Stars</button>
  </div>` : ''}
  ${buyer ? `
  <div class="glass-card p-3 mb-2" style="background:#090e18; border-color:var(--cyan);">
    <div class="flex-between mb-1">
      <div class="font-bold text-xs color-cyan">${buyer.avatar} ${buyer.name}</div>
      <div class="price-val">${buyer.offerPrice.toLocaleString()} ₽</div>
    </div>
    <div class="sub-label mb-2 color-amber" style="font-style:italic;">«${buyer.preStatus}»</div>
    <div class="grid-3">
      <button onclick="acceptBuyerDeal(${idx})" class="btn btn-green btn-sm">Продать</button>
      <button onclick="openHaggleSaleModal(${idx})" class="btn btn-amber btn-sm" ${buyer.offerPrice === 0 ? 'disabled' : ''}>Торг 🗣</button>
      <button onclick="rejectBuyerDeal(${idx})" class="btn btn-dark btn-sm">Отказать</button>
    </div>
  </div>` : ''}
  <button onclick="withdrawFromLot(${idx})" class="btn btn-dark w-full mt-1 btn-sm">Забрать обратно в гараж</button>
</div>`;
}).join('');
if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
}
function speedUpLotWithTicket(idx) {
if ((state.player.expressTickets || 0) <= 0) return showToast("У вас нет Экспресс-пропусков! Купите у Решалы или подождите смены дня.");
state.player.expressTickets -= 1;
const slot = state.salesLot[idx];
slot.timer = 0;
generateBuyerForSlot(slot);
saveState(); renderSalesLot();
tgHaptic('success');
showToast("🎟️ Экспресс-пропуск использован! Клиент уже на месте.");
}
function speedUpLotWithStars(idx) {
if (state.player.stars < 5) return showToast("Не хватает 5 Telegram Stars ⭐!");
state.player.stars -= 5;
const slot = state.salesLot[idx];
slot.timer = 0;
generateBuyerForSlot(slot);
saveState(); renderSalesLot();
tgHaptic('success');
showToast("⭐ 5 Stars списано! VIP-клиент прибыл.");
}
function openHaggleSaleModal(idx) {
activeHaggleSlotIdx = idx; const slot = state.salesLot[idx]; if (!slot || !slot.currentBuyer) return;
if (state.player.karma < slot.currentBuyer.minKarma) return showToast("Ваша репутация слишком низка для торга с ним!");
const html = `<div class="modal-box">
<h4 class="text-center mb-1">🗣️ Торг у капота</h4>
<div class="text-xs color-cyan text-center font-bold mb-1">${slot.currentBuyer.avatar} ${slot.currentBuyer.name}</div>
<div class="sub-label text-center mb-1 color-amber">Предложение: ${slot.currentBuyer.offerPrice.toLocaleString()} ₽</div>
<div class="patience-bar-container">
  <div class="patience-bar" id="buyerPatienceFill" style="width: ${slot.currentBuyer.patience}%; background: ${slot.currentBuyer.patience > 50 ? 'linear-gradient(90deg, #4caf50, #8bc34a)' : '#ff9800'};">
  </div>
</div>
<div class="space-y-2 mb-3">
  <button onclick="attemptHaggleSale('safe')" class="btn btn-dark mb-1 w-full">Мягко обосновать цену (+2% к цене | Малый риск)</button>
  <button onclick="attemptHaggleSale('firm')" class="btn btn-dark mb-1 w-full">Жестко давить (+7% к цене | Высокий риск ухода)</button>
</div>
<button onclick="closeModal('modalHaggleSale')" class="btn btn-dark w-full">Назад к сделке</button>
</div>`;
document.getElementById('modalHaggleSale').innerHTML = html; document.getElementById('modalHaggleSale').classList.add('active');
}
function attemptHaggleSale(strategy) {
if (activeHaggleSlotIdx === null) return; const slot = state.salesLot[activeHaggleSlotIdx]; if (!slot || !slot.currentBuyer) return;
const buyer = slot.currentBuyer; let priceBoost = 0; let patienceHit = 0; let failChance = 0;
if (strategy === 'safe') { priceBoost = 0.02; patienceHit = 15; failChance = 0.2; } else if (strategy === 'firm') { priceBoost = 0.07; patienceHit = 40; failChance = 0.5; }
if (Math.random() < failChance || buyer.patience - patienceHit <= 0) { closeModal('modalHaggleSale'); rejectBuyerDeal(activeHaggleSlotIdx); return showToast("😡 Покупатель психанул и ушел!"); }
else { buyer.offerPrice = Math.min(slot.askingPrice, Math.round(buyer.offerPrice * (1 + priceBoost))); buyer.patience -= patienceHit; openHaggleSaleModal(activeHaggleSlotIdx); showToast("Вы накинули цену, но терпение покупателя падает!"); }
}
function generateBuyerForSlot(slot) {
if (typeof EXPANDED_BUYERS_POOL === 'undefined') return;
const b = EXPANDED_BUYERS_POOL[Math.floor(Math.random() * EXPANDED_BUYERS_POOL.length)];
const car = slot.car;
let rate = Math.min(1.05, b.rate + 0.05);
let fairPrice = Math.round(car.marketValue * rate);
let finalOffer = Math.min(slot.askingPrice, fairPrice);
slot.currentBuyer = { name: b.name, avatar: b.avatar, type: b.type, minKarma: b.minKarma || 0, offerPrice: finalOffer, preStatus: b.preStatus, rejectSay: b.rejectSay, patience: 100 };
}
function acceptBuyerDeal(idx) {
const slot = state.salesLot[idx]; if (!slot || !slot.currentBuyer) return;
const buyer = slot.currentBuyer; const car = slot.car;
const cost = car.purchaseCost || car.basePrice || Math.round(buyer.offerPrice * 0.9);
const netProfit = buyer.offerPrice - cost;
state.player.cash += buyer.offerPrice;
state.player.stats.sold += 1;
state.player.stats.totalNetProfit += netProfit;
if (netProfit >= 0) state.player.stats.profitableSales += 1; else state.player.stats.lossSales += 1;
addXp(30);
state.salesLot.splice(idx, 1);
saveState(); renderSalesLot();
openVerdictModal("СДЕЛКА ЗАКРЫТА! 🎉", `${buyer.name} купил автомобиль!`, true, buyer.offerPrice, netProfit);
}
function rejectBuyerDeal(idx) { const slot = state.salesLot[idx]; slot.currentBuyer = null; slot.timer = 30; saveState(); renderSalesLot(); showToast("Ждем следующего покупателя..."); }
function withdrawFromLot(idx) { const slot = state.salesLot.splice(idx, 1)[0]; state.garage.push(slot.car); saveState(); renderGarage(); renderSalesLot(); showToast("Автомобиль возвращен в бокс."); }
// ===================== ТЕНЕВЫЕ СВЯЗИ (РЕШАЛА АРТУР С УРОВНЯМИ) =====================
function buyReshalaPack(type) {
if (type === 'pack1') {
if (state.player.cash < 150000) return showToast("Не хватает 150,000 ₽!");
state.player.cash -= 150000; state.player.connections += 1;
showToast("Связи приобретены (+1 🤝)!");
} else if (type === 'pack5') {
if (state.player.cash < 650000) return showToast("Не хватает 650,000 ₽!");
state.player.cash -= 650000; state.player.connections += 5;
showToast("Оптовый пакет связей (+5 🤝) активирован!");
}
saveState(); updateHeaderUI();
}
function checkReshalaAccess() {
const roofCard = document.getElementById('reshala-roof-card');
const legalCard = document.getElementById('reshala-legalize-card');
const ticketsCard = document.getElementById('reshala-tickets-card');
const confCard = document.getElementById('reshala-confiscate-card');
if (roofCard) {
if (state.player.level < 10) { roofCard.classList.add('item-locked'); roofCard.querySelector('button').disabled = true; roofCard.querySelector('button').innerText = 'С 10 УРОВНЯ'; }
else { roofCard.classList.remove('item-locked'); roofCard.querySelector('button').disabled = false; roofCard.querySelector('button').innerText = 'Оформить (350k ₽ / 45 ⭐)'; }
}
if (legalCard) {
if (state.player.level < 15) { legalCard.classList.add('item-locked'); legalCard.querySelector('button').disabled = true; legalCard.querySelector('button').innerText = 'С 15 УРОВНЯ'; }
else { legalCard.classList.remove('item-locked'); legalCard.querySelector('button').disabled = false; legalCard.querySelector('button').innerText = 'Легализовать (200k ₽ + 1 🤝)'; }
}
if (ticketsCard) {
if (state.player.level < 5) { ticketsCard.classList.add('item-locked'); ticketsCard.querySelector('button').disabled = true; ticketsCard.querySelector('button').innerText = 'С 5 УРОВНЯ'; }
else { ticketsCard.classList.remove('item-locked'); ticketsCard.querySelector('button').disabled = false; ticketsCard.querySelector('button').innerText = 'Купить 5 шт (75k ₽ / 15 ⭐)'; }
}
if (confCard) {
if (state.player.level < 20) { confCard.classList.add('item-locked'); confCard.querySelector('button').disabled = true; confCard.querySelector('button').innerText = 'С 20 УРОВНЯ'; }
else { confCard.classList.remove('item-locked'); confCard.querySelector('button').disabled = false; confCard.querySelector('button').innerText = 'Выкупить (450k ₽ + 2 🤝)'; }
}
}
function buyReshalaService(service) {
if (service === 'roof') {
if (state.player.level < 10) return showToast("Услуга доступна с 10 уровня!");
if (state.player.cash >= 350000) { state.player.cash -= 350000; }
else if (state.player.stars >= 45) { state.player.stars -= 45; }
else return showToast("Нужно 350,000 ₽ или 45 Stars ⭐!");
state.player.policeImmunityDays += 3;
saveState();
openVerdictModal("🚨 КРЫША ОФОРМЛЕНА", "ГИБДД не тронет ваши машины следующие 3 дня!", true);
}
}
function buyTicketsPack(amount, cost) {
if (state.player.level < 5) return showToast("Услуга доступна с 5 уровня!");
if (state.player.expressTickets + amount > state.player.maxExpressTickets) return showToast(`Склад переполнен! Максимум: ${state.player.maxExpressTickets}. Расширьте вместимость на Площадке Продаж.`);
if (state.player.cash >= cost) { state.player.cash -= cost; }
else if (state.player.stars >= 15) { state.player.stars -= 15; }
else return showToast("Не хватает 75,000 ₽ или 15 Stars ⭐!");
state.player.expressTickets += amount;
saveState(); updateHeaderUI();
showToast(`Получено +${amount} Экспресс-пропусков 🎟️!`);
}
function openLegalizeCarModal() {
if (state.player.level < 15) return showToast("Услуга доступна с 15 уровня!");
const criminalCars = state.garage.filter(c => c.isStolen);
const list = document.getElementById('legalizeCarList');
if (criminalCars.length === 0) {
list.innerHTML = `<div class="sub-label text-center py-4">У вас в гараже нет криминальных авто в розыске.</div>`;
} else {
list.innerHTML = criminalCars.map(c => `
<div class="glass-card flex-between p-2 mb-1">
  <div>
    <b>${c.name}</b>
    <div class="sub-label color-red">В розыске</div>
  </div>
  <button onclick="confirmLegalizeCar('${c.id}')" class="btn btn-purple btn-auto btn-sm">Отмыть VIN</button>
</div>
`).join('');
}
document.getElementById('modalLegalizeCar')?.classList.add('active');
}
function confirmLegalizeCar(carId) {
if (state.player.cash < 200000 || state.player.connections < 1) return showToast("Нужно 200,000 ₽ и 1 Связь 🤝!");
state.player.cash -= 200000; state.player.connections -= 1;
const car = state.garage.find(c => c.id === carId);
if (car) { car.isStolen = false; car.autotekaChecked = true; }
closeModal('modalLegalizeCar');
saveState(); renderGarage();
openVerdictModal("VIN ОТМЫТ! 🔏", `Автомобиль теперь юридически чист во всех базах!`, true);
}
function buyConfiscatedCar() {
if (state.player.level < 20) return showToast("Услуга доступна с 20 уровня!");
if (state.player.cash < 450000 || state.player.connections < 2) return showToast("Нужно 450,000 ₽ и 2 Связи 🤝!");
if (state.garage.length >= getTotalGarageSlots()) return showToast("Гараж полон!");
state.player.cash -= 450000; state.player.connections -= 2;
const конфискат = {
id: 'confiscated_' + Date.now(),
name: "Mercedes W140 S500 (Кабан)",
power: 320, type: "economy", basePrice: 600000, price: 450000,
marketValue: 850000, img: "assets/cars/economy/w140.jpg",
plate: generateCoolPlate(), customPlate: generateCoolPlate(),
condition: 90, wear: { engine: 90, transmission: 90 },
isStolen: false, autotekaChecked: true
};
state.garage.push(конфискат);
saveState(); renderGarage();
openVerdictModal("ТАЧКА ВЫКУПЛЕНА! 🚔", `Вы забрали арестованный «Кабан W140» за полцены!`, true);
}
// ===================== КОЛЕСО ФОРТУНЫ =====================
const WHEEL_SECTORS = [
{ label: "15,000 ₽", color: "#0284c7", textColor: "#fff", type: "cash", value: 15000 },
{ label: "1 🤝 Связь", color: "#9333ea", textColor: "#fff", type: "conn", value: 1 },
{ label: "50,000 ₽", color: "#059669", textColor: "#fff", type: "cash", value: 50000 },
{ label: "5 Stars ⭐", color: "#d97706", textColor: "#fff", type: "stars", value: 5 },
{ label: "100,000 ₽", color: "#0284c7", textColor: "#fff", type: "cash", value: 100000 },
{ label: "2 🎟️ Талона", color: "#c084fc", textColor: "#000", type: "tickets", value: 2 },
{ label: "250,000 ₽", color: "#10b981", textColor: "#fff", type: "cash", value: 250000 },
{ label: "ДЖЕКПОТ!", color: "#e11d48", textColor: "#fff", type: "jackpot", value: 500000 }
];
let currentWheelAngle = 0;
let isWheelSpinning = false;
function initWheelModule() {
drawWheelCanvas(currentWheelAngle);
const now = Date.now();
const canFree = (now - (state.player.lastFreeSpin || 0) >= 86400000);
const statusBadge = document.getElementById('wheelStatusBadge');
const notice = document.getElementById('wheelCooldownNotice');
if (canFree) {
if (statusBadge) { statusBadge.innerText = "Доступно"; statusBadge.className = "tag-badge bg-tag-green"; }
if (notice) notice.innerText = "Бесплатная прокрутка готова!";
} else {
const hours = Math.ceil((86400000 - (now - state.player.lastFreeSpin)) / 3600000);
if (statusBadge) { statusBadge.innerText = `КД ${hours}ч`; statusBadge.className = "tag-badge bg-tag-amber"; }
if (notice) notice.innerText = `Бесплатный спин через ${hours} ч. Можно крутить за Stars ⭐.`;
}
}
function drawWheelCanvas(angle) {
const canvas = document.getElementById('wheelCanvas'); if (!canvas) return;
const ctx = canvas.getContext('2d');
const size = canvas.width;
const center = size / 2;
const radius = center - 8;
const numSectors = WHEEL_SECTORS.length;
const arc = (2 * Math.PI) / numSectors;
ctx.clearRect(0, 0, size, size);
for (let i = 0; i < numSectors; i++) {
const sectorAngle = angle + (i * arc);
ctx.beginPath();
ctx.fillStyle = WHEEL_SECTORS[i].color;
ctx.moveTo(center, center);
ctx.arc(center, center, radius, sectorAngle, sectorAngle + arc);
ctx.lineTo(center, center);
ctx.fill();
ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
ctx.lineWidth = 3;
ctx.stroke();
ctx.save();
ctx.translate(center, center);
ctx.rotate(sectorAngle + arc / 2);
ctx.textAlign = "right";
ctx.fillStyle = WHEEL_SECTORS[i].textColor;
ctx.font = "bold 24px -apple-system, sans-serif";
ctx.shadowColor = "rgba(0,0,0,0.8)";
ctx.shadowBlur = 4;
ctx.fillText(WHEEL_SECTORS[i].label, radius - 28, 8);
ctx.restore();
}
ctx.beginPath();
ctx.arc(center, center, radius, 0, 2 * Math.PI);
ctx.strokeStyle = "#00f2fe";
ctx.lineWidth = 6;
ctx.stroke();
}
function spinWheelAction(isFree) {
if (isWheelSpinning) return;
const now = Date.now();
if (isFree) {
if (now - (state.player.lastFreeSpin || 0) < 86400000) {
const hours = Math.ceil((86400000 - (now - state.player.lastFreeSpin)) / 3600000);
return showToast(`Бесплатный спин еще недоступен (ждать ${hours} ч).`);
}
state.player.lastFreeSpin = now;
} else {
if (state.player.stars < 25) return showToast("Не хватает 25 Telegram Stars ⭐!");
state.player.stars -= 25;
}
isWheelSpinning = true;
saveState();
updateHeaderUI();
const winningIndex = Math.floor(Math.random() * WHEEL_SECTORS.length);
const numSectors = WHEEL_SECTORS.length;
const arc = (2 * Math.PI) / numSectors;
const targetSectorCenter = (3 * Math.PI / 2) - (winningIndex * arc) - (arc / 2);
const extraRotations = (6 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
const targetAngle = currentWheelAngle + extraRotations + (targetSectorCenter - (currentWheelAngle % (2 * Math.PI)));
const startAngle = currentWheelAngle;
const duration = 4000;
const startTime = performance.now();
const arrow = document.getElementById('wheelPointerArrow');
function animateWheel(currentTime) {
const elapsed = currentTime - startTime;
const progress = Math.min(elapsed / duration, 1);
const easeOut = 1 - Math.pow(1 - progress, 3);
currentWheelAngle = startAngle + (targetAngle - startAngle) * easeOut;
drawWheelCanvas(currentWheelAngle);
if (Math.random() < 0.25) {
if (arrow) arrow.classList.add('tick');
setTimeout(() => arrow && arrow.classList.remove('tick'), 50);
playSound('tick');
}
if (progress < 1) {
requestAnimationFrame(animateWheel);
} else {
isWheelSpinning = false;
giveWheelPrize(WHEEL_SECTORS[winningIndex]);
initWheelModule();
}
}
requestAnimationFrame(animateWheel);
}
function giveWheelPrize(prize) {
playSound('win');
tgHaptic('success');
if (prize.type === 'cash') {
state.player.cash += prize.value;
openVerdictModal("🎉 ПРИЗ В КОЛЕСЕ!", `Вы выиграли +${prize.value.toLocaleString()} ₽ на баланс!`, true, prize.value);
} else if (prize.type === 'conn') {
state.player.connections += prize.value;
openVerdictModal("🤝 СВЯЗИ ОТ РЕШАЛЫ!", `Вы выиграли +${prize.value} авторитетную Связь!`, true);
} else if (prize.type === 'stars') {
state.player.stars += prize.value;
openVerdictModal("⭐ ЗВЁЗДНЫЙ ПРИЗ!", `Вам начислено +${prize.value} Telegram Stars!`, true);
} else if (prize.type === 'tickets') {
state.player.expressTickets = Math.min(state.player.maxExpressTickets, (state.player.expressTickets || 0) + prize.value);
openVerdictModal("🎟️ ЭКСПРЕСС-ПРОПУСКА!", `Получено +${prize.value} талона для быстрой продажи!`, true);
} else if (prize.type === 'jackpot') {
state.player.cash += prize.value;
state.player.stars += 25;
state.player.expressTickets = Math.min(state.player.maxExpressTickets, (state.player.expressTickets || 0) + 5);
openVerdictModal("👑 ГРАНД ДЖЕКПОТ!", `ДЖЕКПОТ: +500,000 ₽, +25 Stars ⭐ и +5 Пропусков 🎟️!`, true, 500000);
}
saveState();
updateHeaderUI();
}
// ===================== СИНДИКАТ (СЕТЕВОЙ ХАБ) =====================
function switchSyndicateTab(sub) {
state.syndicateSubTab = sub;
['p2p', 'clubs', 'friends', 'leaderboard'].forEach(s => {
document.getElementById(`synTabBtn-${s}`)?.classList.toggle('active', s === sub);
const screen = document.getElementById(`synScreen-${s}`);
if (screen) screen.style.display = s === sub ? 'block' : 'none';
});
renderSyndicateHub();
}
function renderSyndicateHub() {
if (state.syndicateSubTab === 'p2p') renderP2P();
else if (state.syndicateSubTab === 'clubs') renderClubsSub();
else if (state.syndicateSubTab === 'friends') renderFriendsSub();
else if (state.syndicateSubTab === 'leaderboard') renderLeaderboardSub();
}
function filterP2P(type) {
state.p2pMode = type;
document.getElementById('p2pFilter-cars')?.classList.toggle('btn-cyan', type === 'cars');
document.getElementById('p2pFilter-cars')?.classList.toggle('btn-dark', type !== 'cars');
document.getElementById('p2pFilter-plates')?.classList.toggle('btn-cyan', type === 'plates');
document.getElementById('p2pFilter-plates')?.classList.toggle('btn-dark', type !== 'plates');
renderP2P();
}
function renderP2P() {
const c = document.getElementById('p2pItemsList'); if (!c) return;
if (state.player.level < 5) {
c.innerHTML = `
<div class="glass-card item-locked text-center py-6">
  <i class="fa-solid fa-lock" style="font-size:32px; color:var(--red); margin-bottom:10px;">
  </i>
  <h3 class="font-bold">Биржа закрыта</h3>
  <p class="sub-label mt-1">Доступ к P2P торговле открывается с <b>5 уровня</b> авторитета.</p>
</div>
`;
return;
}
const items = OnlineBridge.mockListings.filter(l => state.p2pMode === 'cars' ? l.itemType === 'car' : l.itemType === 'plate');
if (items.length === 0) { c.innerHTML = `<div class="glass-card text-center sub-label py-6">Лотов нет в этой категории.</div>`; return; }
c.innerHTML = items.map(lot => {
if (lot.itemType === 'car') {
return `
<div class="glass-card mb-2">
  <div class="flex-between mb-1">
    <h4 class="font-bold">${lot.itemData.name}</h4>
    <span class="tag-badge bg-tag-cyan">${lot.sellerName}</span>
  </div>
  <div class="sub-label mb-2">${lot.itemData.power || 100} л.с. | Оценка: ~${(lot.recommendedPrice || lot.price).toLocaleString()} ₽</div>
  <div class="flex-between mb-2">
    <div class="license-plate">${lot.itemData.plate}</div>
    <div class="price-val">${lot.price.toLocaleString()} ₽</div>
  </div>
  <button onclick="buyP2POnlineListing('${lot.id}')" class="btn btn-green w-full">Выкупить лот</button>
</div>`;
} else {
return `
<div class="glass-card flex-between mb-2">
  <div>
    <div class="license-plate">${lot.itemData.plate}</div>
    <div class="sub-label mt-1">Оценка: ~${(lot.recommendedPrice || lot.price).toLocaleString()} ₽</div>
  </div>
  <button onclick="buyP2POnlineListing('${lot.id}')" class="btn btn-amber btn-auto">Купить (${lot.price.toLocaleString()} ₽)</button>
</div>`;
}
}).join('');
}
let currentP2PType = 'car';
function openCreateListingModal() {
if (state.player.level < 5) return showToast("Выставление лотов доступно с 5 уровня!");
selectP2PListingType('car');
document.getElementById('modalCreateP2P')?.classList.add('active');
}
function selectP2PListingType(type) {
currentP2PType = type;
document.getElementById('btnP2PTypeCar')?.classList.toggle('btn-cyan', type === 'car');
document.getElementById('btnP2PTypeCar')?.classList.toggle('btn-dark', type !== 'car');
document.getElementById('btnP2PTypePlate')?.classList.toggle('btn-cyan', type === 'plate');
document.getElementById('btnP2PTypePlate')?.classList.toggle('btn-dark', type !== 'plate');
const sel = document.getElementById('p2pItemSelect'); if (!sel) return;
if (type === 'car') {
if (state.garage.length === 0) sel.innerHTML = `<option value="">Гараж пуст</option>`;
else sel.innerHTML = state.garage.map((c, i) => `<option value="${i}">${c.name} (${c.customPlate || c.plate})</option>`).join('');
} else {
if (state.ownedPlates.length === 0) sel.innerHTML = `<option value="">Нет номеров</option>`;
else sel.innerHTML = state.ownedPlates.map((p, i) => `<option value="${i}">${p}</option>`).join('');
}
onP2PItemSelected(sel.value);
}
function onP2PItemSelected(val) {
const inp = document.getElementById('p2pPriceInput');
const badge = document.getElementById('p2pRecPriceBadge');
const hint = document.getElementById('p2pPriceHint');
if (!inp || val === "") {
if (badge) badge.innerText = "Оценка: 0 ₽";
return;
}
const idx = parseInt(val);
let recPrice = 100000;
if (currentP2PType === 'car') {
const car = state.garage[idx];
if (car) recPrice = car.marketValue || car.price || 150000;
} else {
const plate = state.ownedPlates[idx];
if (plate) recPrice = evaluatePlate(plate);
}
inp.value = recPrice;
if (badge) badge.innerText = `Оценка: ~${recPrice.toLocaleString()} ₽`;
if (hint) hint.innerText = `Рекомендованный диапазон: ${Math.round(recPrice * 0.9).toLocaleString()} - ${Math.round(recPrice * 1.15).toLocaleString()} ₽`;
}
function confirmCreateP2PListing() {
const sel = document.getElementById('p2pItemSelect');
const price = parseInt(document.getElementById('p2pPriceInput').value);
const announce = document.getElementById('p2pAnnounceFeed')?.checked;
if (isNaN(price) || price <= 0) return showToast("Укажите цену!");
if (sel.value === "") return showToast("Выберите лот!");
const idx = parseInt(sel.value);
let itemData = null;
let rec = price;
if (currentP2PType === 'car') {
itemData = state.garage.splice(idx, 1)[0];
rec = itemData.marketValue;
renderGarage();
} else {
const plate = state.ownedPlates.splice(idx, 1)[0];
itemData = { plate: plate };
rec = evaluatePlate(plate);
renderPlatesPage();
}
const newLot = {
id: 'lot_u_' + Date.now(),
sellerId: 'me',
sellerName: state.player.name,
itemType: currentP2PType,
price: price,
recommendedPrice: rec,
itemData: itemData
};
OnlineBridge.mockListings.unshift(newLot);
if (announce) {
const now = new Date();
const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
OnlineBridge.mockLiveFeed.push({
id: 'msg_' + Date.now(),
author: state.player.name,
text: `📢 Выставил на P2P: ${currentP2PType === 'car' ? itemData.name : itemData.plate} за ${price.toLocaleString()} ₽!`,
type: 'p2p_ad',
time: timeStr
});
renderLifeChat();
}
closeModal('modalCreateP2P');
saveState();
renderP2P();
showToast("Лот опубликован на бирже!");
}
function buyP2POnlineListing(lotId) {
const idx = OnlineBridge.mockListings.findIndex(l => l.id === lotId);
if (idx === -1) return showToast("Лот уже продан!");
const lot = OnlineBridge.mockListings[idx];
if (state.player.cash < lot.price) return showToast("Не хватает денег!");
if (lot.itemType === 'car' && state.garage.length >= getTotalGarageSlots()) return showToast("Гараж полон!");
state.player.cash -= lot.price;
if (lot.itemType === 'car') {
state.garage.push({ ...lot.itemData, purchaseCost: lot.price, customPlate: lot.itemData.plate });
renderGarage();
} else {
state.ownedPlates.push(lot.itemData.plate);
renderPlatesPage();
}
OnlineBridge.mockListings.splice(idx, 1);
saveState();
renderP2P();
openVerdictModal("КУПЛЕНО! 🤝", `Вы приобрели ${lot.itemType === 'car' ? lot.itemData.name : lot.itemData.plate}`, true);
}
function renderClubsSub() {
const c = document.getElementById('synClubsContainer'); if (!c) return;
setTxt('synMyClubName', state.player.club || 'Без автоклуба');
c.innerHTML = OnlineBridge.mockClubs.map(club => {
const isMy = state.player.club === club.name;
return `
<div class="club-card ${isMy ? 'my-club' : ''}">
  <div class="flex-between mb-1">
    <b class="font-bold">${club.icon} [${club.tag}] ${club.name}</b>
    <span class="tag-badge bg-tag-cyan">Ур. ${club.level}</span>
  </div>
  <p class="sub-label mb-2">${club.desc}</p>
  <div class="flex-between text-xs mb-3">
    <span>Участники: <b>${club.membersCount}/${club.maxMembers}</b>
  </span>
  <span>Казна: <b class="color-green">${club.bank.toLocaleString()} ₽</b>
</span>
</div>
${isMy ?
`<button class="btn btn-dark btn-sm" disabled>Вы состоите в этом клубе</button>` :
`<button onclick="joinNetworkClub('${club.name}')" class="btn btn-cyan btn-sm">Вступить в синдикат</button>`
}
</div>`;
}).join('');
}
function joinNetworkClub(name) {
state.player.club = name;
saveState();
renderClubsSub();
showToast(`Вы вступили в клуб ${name}!`);
}
function createClubPrompt() {
const name = prompt("Название нового автоклуба:");
if (name && name.trim()) {
OnlineBridge.mockClubs.push({
id: 'club_' + Date.now(),
name: name.trim(),
tag: name.substring(0, 4).toUpperCase(),
leader: state.player.name,
membersCount: 1,
maxMembers: 30,
level: 1,
bank: 0,
desc: "Новосозданный автоклуб",
icon: "🔰"
});
joinNetworkClub(name.trim());
}
}
function renderFriendsSub() {
const list = document.getElementById('friendsListContainer');
const badge = document.getElementById('friendsCountBadge');
if (!list) return;
if (badge) badge.innerText = `${OnlineBridge.mockFriends.length} друзей`;
list.innerHTML = OnlineBridge.mockFriends.map(f => `
<div class="friend-item">
  <div>
    <div class="font-bold text-xs">
      <span class="online-dot ${f.online ? 'dot-green' : 'dot-gray'}">
      </span>${f.name}</div>
      <div class="sub-label">Уровень: ${f.level} | Капитал: ${f.netWorth.toLocaleString()} ₽</div>
    </div>
    <button onclick="showToast('Прямой трейд будет доступен после синхронизации!')" class="btn btn-dark btn-auto btn-sm">Трейд 🤝</button>
  </div>
  `).join('');
  }
  function shareReferralLink() {
  const link = OnlineBridge.getReferralLink();
  if (window.Telegram?.WebApp?.openTelegramLink) window.Telegram.WebApp.openTelegramLink(link);
  else window.open(link, '_blank');
  }
  function copyReferralLink() {
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "777";
  navigator.clipboard?.writeText(`https://t.me/ВАШ_БОТ?startapp=ref_${tgId}`).then(() => showToast("Ссылка скопирована!")).catch(() => showToast("Готово"));
  }
  function renderLeaderboardSub() {
  const c = document.getElementById('leaderboardListContainer'); if (!c) return;
  c.innerHTML = OnlineBridge.mockLeaderboard.map(u => `
  <div class="leader-item">
    <div class="leader-rank ${u.rank === 1 ? 'rank-1' : (u.rank === 2 ? 'rank-2' : (u.rank === 3 ? 'rank-3' : ''))}">#${u.rank}</div>
    <div style="flex: 1;">
      <div class="font-bold text-xs">${u.name} <span class="tag-badge bg-tag-amber">${u.badge}</span>
    </div>
    <div class="sub-label">Уровень: ${u.level}</div>
  </div>
  <div class="text-right">
    <div class="color-green font-bold text-xs">${u.netWorth.toLocaleString()} ₽</div>
  </div>
</div>
`).join('');
}
// ===================== ГОРОДСКОЙ ЭФИР (СТИЛЬНЫЙ ЧАТ) =====================
function renderLifeChat() {
const feed = document.getElementById('lifeChatFeed'); if (!feed) return;
const myName = state.player.name;
feed.innerHTML = OnlineBridge.mockLiveFeed.map(m => {
const isMine = m.author === myName;
return `
<div class="chat-bubble ${isMine ? 'mine' : ''} ${m.type || ''}">
  <div class="chat-bubble-header">
    <span class="chat-bubble-author">${m.author}</span>
    <span class="chat-bubble-time">${m.time || '08:45'}</span>
  </div>
  <div class="chat-bubble-text">${m.text}</div>
</div>`;
}).join('');
feed.scrollTop = feed.scrollHeight;
}
function sendChatMessageFromInput() {
const inp = document.getElementById('feedMessageInput'); if (!inp) return;
const text = inp.value.trim(); if (!text) return;
const now = new Date();
const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
OnlineBridge.mockLiveFeed.push({
id: 'msg_' + Date.now(),
author: state.player.name,
text: text,
type: 'user_msg',
time: timeStr
});
inp.value = '';
renderLifeChat();
tgHaptic('light');
}
// ===================== КАЗИНО 21 =====================
let casinoBet = 0; let casinoState = 'betting'; let pHand = []; let dHand = []; let deck = [];
function getCasinoMaxBet() { return Math.min(500000, Math.max(25000, Math.round(state.player.cash * 0.5))); }
function initCasino() {
const isLocked = state.player.level < 12;
const activeBox = document.getElementById('casinoActiveBox');
const lockCover = document.getElementById('casinoLockCover');
if (activeBox) activeBox.style.display = isLocked ? 'none' : 'block';
if (lockCover) lockCover.style.display = isLocked ? 'block' : 'none';
if (isLocked) return;
setTxt('casinoMaxBetText', `Лимит: ${getCasinoMaxBet().toLocaleString()} ₽`);
if (casinoState === 'betting') resetCasinoUI();
}
function resetCasinoUI() {
casinoBet = 0; pHand = []; dHand = []; casinoState = 'betting';
setTxt('currentBetDisplay', '0 ₽'); setTxt('casinoMaxBetText', `Лимит: ${getCasinoMaxBet().toLocaleString()} ₽`);
document.getElementById('casinoBettingArea').style.display = 'block';
document.getElementById('casinoPlayingArea').style.display = 'none';
document.getElementById('casinoResultArea').style.display = 'none';
document.getElementById('playerHandBox').innerHTML = '';
document.getElementById('dealerHandBox').innerHTML = '';
setTxt('playerScore', '0'); setTxt('dealerScore', '?');
}
function addCasinoBet(amt) { const maxAllowed = getCasinoMaxBet(); if (casinoBet + amt > maxAllowed) casinoBet = maxAllowed; else if (state.player.cash < casinoBet + amt) return showToast("Не хватает денег!"); else casinoBet += amt; setTxt('currentBetDisplay', `${casinoBet.toLocaleString()} ₽`); }
function setCasinoMaxBet() { casinoBet = Math.min(getCasinoMaxBet(), state.player.cash); setTxt('currentBetDisplay', `${casinoBet.toLocaleString()} ₽`); }
function clearCasinoBet() { casinoBet = 0; setTxt('currentBetDisplay', '0 ₽'); }
function get21Deck() { const suits = ['♠','♥','♣','♦']; const vals = ['6','7','8','9','10','J','Q','K','A']; let d = []; for(let s of suits) { for(let v of vals) d.push({v, s}); } return d.sort(() => Math.random() - 0.5); }
function get21Score(hand) { let score = 0; let aces = 0; for (let c of hand) { if (c.v === 'J') score += 2; else if (c.v === 'Q') score += 3; else if (c.v === 'K') score += 4; else if (c.v === 'A') { score += 11; aces += 1; } else score += parseInt(c.v); } while (score > 21 && aces > 0) { score -= 10; aces -= 1; } return score; }
function isTwoAces(hand) { return hand.length === 2 && hand[0].v === 'A' && hand[1].v === 'A'; }
function renderCard(c, hidden = false) { if (hidden) return `<div class="playing-card card-hidden">?</div>`; const colorClass = (c.s === '♥' || c.s === '♦') ? 'card-red' : 'card-black'; return `<div class="playing-card ${colorClass}">${c.v}${c.s}</div>`; }
function updateCasinoTable(showDealerHidden = false) {
document.getElementById('playerHandBox').innerHTML = pHand.map(c => renderCard(c)).join('');
setTxt('playerScore', isTwoAces(pHand) ? '21 (Золотое!)' : get21Score(pHand));
if (showDealerHidden) {
document.getElementById('dealerHandBox').innerHTML = dHand.map(c => renderCard(c)).join('');
setTxt('dealerScore', isTwoAces(dHand) ? '21 (Золотое!)' : get21Score(dHand));
} else {
document.getElementById('dealerHandBox').innerHTML = renderCard(dHand[0]) + renderCard(dHand[1], true);
setTxt('dealerScore', dHand[0].v === 'A' ? 11 : 7);
}
}
function startCasinoGame() {
if (casinoBet <= 0) return showToast("Сделайте ставку!"); if (state.player.cash < casinoBet) return showToast("Не хватает денег!");
state.player.cash -= casinoBet; saveState(); deck = get21Deck(); pHand = [deck.pop(), deck.pop()]; dHand = [deck.pop(), deck.pop()];
casinoState = 'playing'; document.getElementById('casinoBettingArea').style.display = 'none'; document.getElementById('casinoPlayingArea').style.display = 'block';
updateCasinoTable(false); if (get21Score(pHand) === 21 || isTwoAces(pHand)) setTimeout(standCasino, 600);
}
function hitCasino() { if (casinoState !== 'playing') return; pHand.push(deck.pop()); updateCasinoTable(false); if (get21Score(pHand) >= 21) setTimeout(standCasino, 500); }
function standCasino() { if (casinoState !== 'playing') return; document.getElementById('casinoPlayingArea').style.display = 'none'; endCasinoGame(); }
function endCasinoGame() {
casinoState = 'done';
let pScore = isTwoAces(pHand) ? 21 : get21Score(pHand);
if (pScore <= 21) { let dScore = isTwoAces(dHand) ? 21 : get21Score(dHand); while (dScore < 17 && deck.length > 0) { dHand.push(deck.pop()); dScore = isTwoAces(dHand) ? 21 : get21Score(dHand); } }
updateCasinoTable(true); let dScore = isTwoAces(dHand) ? 21 : get21Score(dHand); const resBox = document.getElementById('casinoResultArea'); resBox.style.display = 'block';
if (pScore > 21) resBox.innerHTML = `<span class="color-red">ПЕРЕБОР (-${casinoBet.toLocaleString()} ₽)</span>`;
else if (dScore > 21 || pScore > dScore) { const payout = casinoBet * 2; state.player.cash += payout; resBox.innerHTML = `<span class="color-green">ПОБЕДА (+${casinoBet.toLocaleString()} ₽)</span>`; playSound('win'); }
else if (pScore === dScore) { state.player.cash += casinoBet; resBox.innerHTML = `<span class="color-amber">НИЧЬЯ</span>`; }
else resBox.innerHTML = `<span class="color-red">КРУПЬЕ ЗАБРАЛ БАНК</span>`;
resBox.innerHTML += `<br>
<button onclick="resetCasinoUI()" class="btn btn-dark btn-sm mt-2">Снова</button>`; saveState(); updateHeaderUI();
}
function takeLoan(amt) { if (state.player.loanDebt >= 1000000) return showToast("Лимит долга!"); state.player.cash += amt * 0.95; state.player.loanDebt += amt; saveState(); showToast(`Одобрено: ${amt.toLocaleString()} ₽`); }
function repayLoan(percent) { if (state.player.loanDebt <= 0) return showToast("Нет долгов!"); let amt = Math.ceil(state.player.loanDebt * (percent / 100)); if (state.player.cash < amt) return showToast("Не хватает денег!"); state.player.cash -= amt; state.player.loanDebt = Math.max(0, state.player.loanDebt - amt); saveState(); showToast(`Оплачено ${amt.toLocaleString()} ₽`); }
function donateForKarma() { if (state.player.cash < 50000) return showToast("Не хватает 50k ₽"); state.player.cash -= 50000; state.player.karma = Math.min(100, state.player.karma + 10); saveState(); showToast("Карма +10 😇"); }
function checkBarterEvent() {
if (typeof CAR_DATABASE === 'undefined') return;
if (state.garage.length > 0 && Math.random() < 0.1) {
const myCarIdx = Math.floor(Math.random() * state.garage.length); const myCar = state.garage[myCarIdx];
const npcCar = CAR_DATABASE.comfort[Math.floor(Math.random() * CAR_DATABASE.comfort.length)];
if (confirm(`Обмен? ${npcCar.name} на ваш ${myCar.name}?`)) {
state.garage.splice(myCarIdx, 1);
state.garage.push({ id: 'barter_' + Date.now(), name: npcCar.name, type: npcCar.type, basePrice: npcCar.basePrice, price: npcCar.basePrice, marketValue: npcCar.basePrice, img: npcCar.img, plate: generateNormalPlate(), customPlate: generateNormalPlate(), wear: {engine: 90, transmission: 90}, condition: 85, tuning: {chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0} });
saveState(); renderGarage(); showToast("Обмен завершен!");
}
}
}
// ===================== СМЕНА ДНЯ (И ВЫДАЧА ПРОПУСКОВ) =====================
function nextDayAction() {
state.player.day += 1;
state.player.cash -= 1500;
state.player.fuel = 100;
// ВЫДАЧА 25 ЕЖЕДНЕВНЫХ ПРОПУСКОВ (С УЧЕТОМ МАКСИМАЛЬНОЙ ВМЕСТИМОСТИ)
state.player.expressTickets = Math.min(state.player.maxExpressTickets, (state.player.expressTickets || 0) + 25);
if (state.player.policeImmunityDays > 0) state.player.policeImmunityDays -= 1;
populateMarketFeed(); refreshPlateCatalog(); saveState(); renderDiets(); renderHousing(); renderPlatesPage();
showToast("Наступил новый день! Получено 25 пропусков.");
updateHeaderUI();
}
// СТРИТ АРЕНА
let isRacing = false; let racePos = 0; let raceInterval = null; let raceDuelInterval = null; let currentRaceDifficulty = 'easy'; let playerTrackPos = 0; let oppTrackPos = 0;
function resetRaceState() { if (raceInterval) clearInterval(raceInterval); if (raceDuelInterval) clearInterval(raceDuelInterval); isRacing = false; racePos = 0; playerTrackPos = 0; oppTrackPos = 0; }
function initStreetView() { resetRaceState(); updateStreetCarSelector(); }
function updateStreetCarSelector() {
const sel = document.getElementById('streetCarSelector'); if (!sel) return;
if (state.garage.length === 0) { sel.innerHTML = `<option value="">Нет машин</option>`; return; }
sel.innerHTML = state.garage.map((c, idx) => `<option value="${idx}">${c.name} (${c.power || 100} л.с.)</option>`).join('');
selectCarForStreet(0);
}
function selectCarForStreet(idx) {
const car = state.garage[parseInt(idx) || 0]; if (!car) return;
setTxt('streetSelectedCarPower', `${car.power || 100} л.с.`);
setTxt('streetSelectedCarStats', `Мотор: ${Math.round(car.wear?.engine || 100)}% | КПП: ${Math.round(car.wear?.transmission || 100)}%`);
setTxt('showCarSelectName', car.name);
}
function toggleStreetSub(mode) {
document.getElementById('streetSub-race')?.classList.toggle('active', mode === 'race');
document.getElementById('streetSub-show')?.classList.toggle('active', mode === 'show');
document.getElementById('streetRaceBox').style.display = mode === 'race' ? 'block' : 'none';
document.getElementById('streetShowBox').style.display = mode === 'show' ? 'block' : 'none';
}
function setRaceDifficulty(diff) { currentRaceDifficulty = diff; ['easy', 'medium', 'boss'].forEach(d => document.getElementById(`raceDiff-${d}`)?.classList.toggle('btn-cyan', d === diff)); }
function startDragRace() {
if (isRacing) return; if (state.player.fuel < 15) return showToast("Нужно 15 ⛽!");
state.player.fuel -= 15; isRacing = true; playerTrackPos = 0; oppTrackPos = 0;
document.getElementById('raceStartBtn').disabled = true;
document.getElementById('raceShiftBtn').disabled = false;
document.getElementById('raceShiftBtn').className = 'btn btn-green';
raceDuelInterval = setInterval(() => {
playerTrackPos += 1.2; oppTrackPos += 1.1;
if (playerTrackPos >= 90 || oppTrackPos >= 90) {
clearInterval(raceDuelInterval); clearInterval(raceInterval); isRacing = false;
document.getElementById('raceStartBtn').disabled = false;
document.getElementById('raceShiftBtn').disabled = true;
document.getElementById('raceShiftBtn').className = 'btn btn-dark opacity-50';
if (playerTrackPos >= 90) { state.player.cash += 25000; setTxt('raceStatusText', "ПОБЕДА (+25,000 ₽)!"); }
else setTxt('raceStatusText', "ПОРАЖЕНИЕ!");
saveState();
}
document.getElementById('raceTrackPlayer').style.left = `${Math.min(90, playerTrackPos)}%`;
document.getElementById('raceTrackOpponent').style.left = `${Math.min(90, oppTrackPos)}%`;
}, 100);
raceInterval = setInterval(() => { racePos = (racePos + 5) % 100; document.getElementById('raceNeedle').style.left = `${racePos}%`; }, 30);
}
function shiftGear() { if (!isRacing) return; if (racePos >= 65 && racePos <= 85) playerTrackPos += 10; else oppTrackPos += 8; racePos = 0; }
function enterAutoShow() { if (state.player.fuel < 15) return showToast("Нужно 15 ⛽!"); state.player.fuel -= 15; state.player.cash += 45000; saveState(); openVerdictModal("АВТОШОУ", "Приз получен (+45,000 ₽)", true, 45000); }
function policeAction(type) { closeModal('modalPolice'); }
function renderPlatesPage() {
const d = document.getElementById('ownedPlatesListDetailed');
if (d) d.innerHTML = state.ownedPlates.map(p => `<div class="glass-card flex-between p-2 mb-1">
<div class="license-plate">${p}</div>
</div>`).join('');
const pm = document.getElementById('plateMarketList');
if (pm) pm.innerHTML = state.plateCatalog.map(p => `<div class="glass-card flex-between p-2 mb-1">
<div class="license-plate">${p.plate}</div>
<button onclick="buyPlateFromShop('${p.plate}', ${p.price})" class="btn btn-amber btn-auto">Купить (${p.price.toLocaleString()} ₽)</button>
</div>`).join('');
}
function buyPlateFromShop(plate, price) { if (state.player.cash < price) return showToast("Не хватает денег!"); state.player.cash -= price; state.ownedPlates.push(plate); saveState(); renderPlatesPage(); showToast("Номер куплен!"); }
// ========================================================
// ВОССТАНОВЛЕНИЕ: ПОЛНЫЙ КРАСИВЫЙ РЕНДЕР С КАРТИНКАМИ (DATA.JS)
// ========================================================
// 1. РЕНДЕР КОНТЕЙНЕРОВ
function renderContainersList() {
const r = document.getElementById('containersListRender');
const lock = document.getElementById('containersLockCover');
if (state.player.level < 20) {
if (r) r.style.display = 'none';
if (lock) lock.style.display = 'block';
return;
}
if (lock) lock.style.display = 'none';
if (!r || typeof CONTAINER_ITEMS === 'undefined') return;
r.style.display = 'block';
r.innerHTML = CONTAINER_ITEMS.map(item => `
<div class="glass-card mb-3">
  <div class="car-img-wrap" style="height: 140px;">
    <img src="${item.img}" class="car-img" onerror="this.src='https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80'">
      <div class="badge-tag">${item.badge}</div>
    </div>
    <div class="flex-between mb-1">
      <h4 class="font-bold">${item.name}</h4>
      <div class="price-val">${item.cost.toLocaleString()} ₽</div>
    </div>
    <p class="sub-label mb-3">${item.desc}</p>
    <button onclick="openContainer('${item.id}', ${item.cost})" class="btn btn-cyan w-full">
      Открыть контейнер (Таймер ${item.timer}с)
    </button>
  </div>
  `).join('');
  }
  function openContainer(type, price) {
  if (state.player.cash < price) return showToast("Не хватает денег!");
  if (state.garage.length >= getTotalGarageSlots()) return showToast("Гараж полон!");
  state.player.cash -= price;
  showToast("🚢 Контейнер вскрывается...");
  setTimeout(() => {
  let won = {
  id: 'c_' + Date.now(),
  name: "Lexus RX 350",
  power: 300,
  type: "premium",
  basePrice: price,
  price: price,
  marketValue: Math.round(price * 1.25),
  img: "assets/cars/premium/rx350.jpg",
  plate: generateCoolPlate(),
  customPlate: generateCoolPlate(),
  condition: 100,
  wear: { engine: 100, transmission: 100 },
  tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }
  };
  if (type === 'dubai') {
  won.name = "Porsche 911 GT3 RS";
  won.power = 525;
  won.type = "hyper";
  won.img = "assets/cars/hyper/911.jpg";
  }
  state.garage.push(won);
  saveState(); renderGarage();
  openVerdictModal("КОНТЕЙНЕР ВСКРЫТ! 🎁", `В контейнере: «${won.name}»!`, true);
  }, 1500);
  }
  // 2. РЕНДЕР ЗАКАЗОВ
  function generateContracts() {
  state.contracts = [
  { id: 'cnt_1', title: 'Подобрать Солярис/Рио', reward: 75000, req: 'economy' },
  { id: 'cnt_2', title: 'Найти живую Октавию/Камри', reward: 180000, req: 'comfort' },
  { id: 'cnt_3', title: 'Гелик/БМВ для авторитета', reward: 950000, req: 'premium' }
  ];
  }
  function renderContracts() {
  const c = document.getElementById('contractsList');
  const lock = document.getElementById('contractsLockCover');
  if (state.player.level < 15) {
  if (c) c.style.display = 'none';
  if (lock) lock.style.display = 'block';
  return;
  }
  if (lock) lock.style.display = 'none';
  if (!c) return;
  c.style.display = 'block';
  if (state.contracts.length === 0) {
  c.innerHTML = `<div class="sub-label text-center py-4">Все заказы выполнены! Нажмите «Обновить».</div>`;
  return;
  }
  c.innerHTML = state.contracts.map((cnt, i) => `
  <div class="glass-card mb-2" style="border-left: 3px solid var(--cyan);">
    <div class="flex-between mb-1">
      <b class="color-cyan">
        <i class="fa-solid fa-user-tie">
        </i> ${cnt.title}</b>
        <span class="tag-badge bg-tag-amber">+${cnt.reward.toLocaleString()} ₽</span>
      </div>
      <p class="sub-label mb-2">Требуемый класс авто: <b>${cnt.req.toUpperCase()}</b>
    </p>
    <button onclick="completeContract(${i})" class="btn btn-dark btn-sm w-full">
      <i class="fa-solid fa-car-side">
      </i> Отдать подходящее авто из гаража
    </button>
  </div>
  `).join('');
  }
  function completeContract(idx) {
  const cnt = state.contracts[idx];
  const carIdx = state.garage.findIndex(c => c.type === cnt.req && !c.impounded);
  if (carIdx === -1) return showToast(`В гараже нет свободного авто класса ${cnt.req.toUpperCase()}!`);
  const car = state.garage[carIdx];
  state.garage.splice(carIdx, 1);
  state.player.cash += cnt.reward;
  state.contracts.splice(idx, 1);
  saveState(); renderGarage(); renderContracts();
  openVerdictModal("ЗАКАЗ ВЫПОЛНЕН! 🎉", `Вы подобрали и передали ${car.name}. Оплата +${cnt.reward.toLocaleString()} ₽.`, true, cnt.reward);
  }
  function refreshContractsManual() {
  generateContracts();
  renderContracts();
  showToast("Заказы обновлены!");
  }
  // 3. РЕНДЕР САРАЕВ (ГАРАЖНЫХ НАХОДОК)
  function renderBarnFind() {
  const b = document.getElementById('barnFindContent');
  if (!b || typeof BARN_FINDS === 'undefined') return;
  const canExplore = (state.player.lastBarnDay || 0) < state.player.day;
  b.innerHTML = BARN_FINDS.map((barn, i) => `
  <div class="barn-tier-card">
    <div class="flex-between mb-1">
      <b class="color-amber">${barn.name}</b>
      <span class="tag-badge bg-tag-amber">Оценка: ~${barn.marketValue.toLocaleString()} ₽</span>
    </div>
    <div class="car-img-wrap" style="height: 110px; opacity: 0.85; filter: grayscale(0.4);">
      <img src="${barn.img}" class="car-img" onerror="this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'">
      </div>
      <button onclick="exploreBarn(${i})" class="btn btn-dark w-full btn-sm" ${!canExplore ? 'disabled' : ''}>
        ${canExplore ? 'Разведать сарай (50,000 ₽)' : 'Разведка будет доступна завтра'}
      </button>
    </div>
    `).join('');
    }
    function exploreBarn(idx) {
    if ((state.player.lastBarnDay || 0) >= state.player.day) return showToast("Разведка сараев доступна только 1 раз в игровой день!");
    if (state.player.cash < 50000) return showToast("Не хватает 50,000 ₽ на разведку!");
    if (state.garage.length >= getTotalGarageSlots()) return showToast("В гараже нет свободного места!");
    state.player.cash -= 50000;
    state.player.lastBarnDay = state.player.day;
    const template = BARN_FINDS[idx];
    const foundCar = {
    id: 'barn_' + Date.now(),
    name: template.name,
    power: template.power,
    type: template.type,
    basePrice: template.basePrice,
    price: template.basePrice,
    purchaseCost: 50000,
    baseMarketValue: template.marketValue,
    marketValue: Math.round(template.marketValue * 0.25),
    img: template.img,
    plate: generateNormalPlate(),
    customPlate: generateNormalPlate(),
    isStolen: false,
    condition: 20,
    wear: { engine: 20, transmission: 20 },
    tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 },
    bodyThickness: { hood: 800, roof: 140, doors: 600, wings: 900 },
    hiddenDefect: { text: "Машина долго стояла. Мотор троит, подвеска сыпется.", cost: Math.round(template.basePrice * 0.4), severity: "Критическая" },
    isRepainted: false,
    isPolished: false
    };
    state.garage.push(foundCar);
    saveState(); renderBarnFind(); renderGarage();
    openVerdictModal("НАХОДКА! 🏚️", `Вы откопали ${template.name}! Автомобиль доставлен в гараж, но требует полного ремонта.`, true);
    }
    // 4. РЕНДЕР ЖИЛЬЯ
    function renderHousing() {
    const list = document.getElementById('housingMarketList');
    if (!list || typeof HOUSING_LIST === 'undefined') return;
    list.innerHTML = HOUSING_LIST.map(h => {
    const isCurrent = state.player.housingId === h.id;
    const isOwned = state.player.ownedHouses && state.player.ownedHouses.includes(h.id);
    const isLocked = state.player.level < h.minLevel;
    let rentBtn = '';
    if (h.rent > 0 && !isOwned) {
    let rClass = (isCurrent && state.player.housingType === 'rent') ? 'btn-cyan' : 'btn-dark';
    rentBtn = `<button onclick="rentHouse('${h.id}')" class="btn ${rClass} btn-sm" ${isLocked ? 'disabled' : ''}>Аренда (${h.rent.toLocaleString()} ₽/д)</button>`;
    }
    let buyBtn = '';
    if (h.buyPrice > 0) {
    let bClass = isOwned ? 'btn-green' : 'btn-amber';
    let bText = isOwned ? 'Выкуплено' : `Купить (${(h.buyPrice / 1000000).toFixed(1)}M ₽)`;
    buyBtn = `<button onclick="buyHouse('${h.id}')" class="btn ${bClass} btn-sm" ${isOwned || isLocked ? 'disabled' : ''}>${bText}</button>`;
    }
    return `
    <div class="glass-card mb-3" style="${isCurrent ? 'border-color:var(--cyan);' : ''}">
      <div class="car-img-wrap" style="height: 125px; ${isLocked ? 'filter: grayscale(1); opacity: 0.7;' : ''}">
        <img src="${h.img}" class="car-img" onerror="this.src='https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=400&q=80'">
          <div class="badge-tag">${isOwned ? 'В СОБСТВЕННОСТИ' : 'АРЕНДА'}</div>
          ${isLocked ? `<div class="cooldown-timer" style="display:flex; font-size:14px; opacity:1;">
          <i class="fa-solid fa-lock mr-2">
          </i>С ${h.minLevel} УР</div>` : ''}
        </div>
        <div class="flex-between mb-1">
          <h4 class="font-bold">${h.name} ${isCurrent ? '🏠 (Вы здесь)' : ''}</h4>
        </div>
        <div class="sub-label mb-2">+${h.slots} боксов гаража | +${h.moodBonus}% к настроению в день</div>
        <div class="grid-2">
          ${rentBtn}
          ${buyBtn}
        </div>
      </div>`;
      }).join('');
      }
      function rentHouse(id) {
      state.player.housingId = id;
      state.player.housingType = 'rent';
      saveState(); renderHousing(); renderGarage();
      showToast("Вы переехали! Вместимость гаража пересчитана.");
      }
      function buyHouse(id) {
      const house = HOUSING_LIST.find(h => h.id === id);
      if (!house) return;
      if (state.player.cash < house.buyPrice) return showToast("Не хватает денег на покупку!");
      state.player.cash -= house.buyPrice;
      state.player.ownedHouses.push(id);
      state.player.housingId = id;
      state.player.housingType = 'owned';
      saveState(); renderHousing(); renderGarage();
      openVerdictModal("🎉 НЕДВИЖИМОСТЬ КУПЛЕНА!", `Вы стали собственником «${house.name}»! Боксы закреплены навсегда.`, true);
      }
      // 5. РЕНДЕР РАЦИОНА ПИТАНИЯ
      function renderDiets() {
      const dietList = document.getElementById('dietList');
      if (!dietList || typeof DIETS === 'undefined') return;
      dietList.innerHTML = DIETS.map(d => `
      <div class="glass-card flex-between p-2 mb-2">
        <div>
          <div class="font-bold text-xs">${d.name}</div>
          <div class="sub-label mb-1">${d.desc}</div>
          <div class="text-xs color-green">+${d.hunger} сытости | ${d.mood > 0 ? '+' : ''}${d.mood} куража</div>
        </div>
        <button onclick="selectDiet('${d.id}')" class="btn ${state.player.diet === d.id ? 'btn-green' : 'btn-dark'} btn-sm btn-auto" style="min-width: 85px;">
          ${state.player.diet === d.id ? 'Выбрано' : (d.cost === 0 ? 'Бесплатно' : d.cost.toLocaleString() + ' ₽')}
        </button>
      </div>
      `).join('');
      }
      function selectDiet(id) {
      state.player.diet = id;
      saveState(); renderDiets();
      showToast("Рацион питания успешно изменен!");
      }
      // 6. РЕНДЕР ИМПЕРИИ
      function checkBusinessAccess() {
      const c = document.getElementById('businessList');
      const lock = document.getElementById('businessLockCover');
      const activeBox = document.getElementById('businessActiveBox');
      if (state.player.level < 5) {
      if (activeBox) activeBox.style.display = 'none';
      if (lock) lock.style.display = 'block';
      return;
      }
      if (lock) lock.style.display = 'none';
      if (activeBox) activeBox.style.display = 'block';
      if (!c || typeof BUSINESS_DATA === 'undefined') return;
      let totalNet = 0;
      c.innerHTML = state.businesses.map((b, i) => {
      const isMax = b.level >= 10;
      const isLocked = state.player.level < b.minLevel;
      const cost = b.level === 0 ? b.cost : b.cost * (b.level + 1);
      totalNet += b.level * cost;
      const defaultBizImgs = [
      'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&q=80',
      'https://images.unsplash.com/photo-1599256614138-0ceec0e766c8?w=400&q=80',
      'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?w=400&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80'
      ];
      const imgSrc = defaultBizImgs[i % defaultBizImgs.length];
      return `
      <div class="business-card ${!isLocked ? 'unlocked' : ''}">
        <div class="business-img-box ${isLocked ? 'item-locked' : ''}">
          <img src="${imgSrc}" class="business-img" onerror="this.src='https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=400&q=80'">
            ${isLocked ? `<div class="cooldown-timer" style="display:flex; opacity:1; font-size:14px;">
            <i class="fa-solid fa-lock mb-2">
            </i> С ${b.minLevel} УРОВНЯ</div>` : ''}
            <div class="badge-tag bg-tag-cyan" style="bottom: 8px; left: 8px; right: auto;">${isMax ? 'MAX УРОВЕНЬ' : 'Ур. ' + b.level}</div>
          </div>
          <div class="business-content">
            <div class="flex-between mb-1">
              <b class="text-xs">${b.name}</b>
              <div class="sub-label">Доход: <span class="color-green font-bold">${(b.income * b.level).toLocaleString()} ₽</span>
            </div>
          </div>
          <div class="business-perk-badge">⭐ Перк: ${b.perk || 'Пассивный доход'}</div>
          ${b.level > 0 ? `<div class="color-green text-xs font-bold mb-2">Накоплено в кассе: ${(b.stored || 0).toLocaleString()} ₽</div>` : ''}
          <button onclick="upgradeBusiness(${i})" class="btn ${isMax ? 'btn-dark' : 'btn-cyan'} btn-sm" ${isMax || isLocked ? 'disabled' : ''}>
            ${isMax ? 'Улучшено до максимума' : (isLocked ? `Доступно с ${b.minLevel} ур` : (b.level === 0 ? 'Купить ('+cost.toLocaleString()+' ₽)' : 'Улучшить ('+cost.toLocaleString()+' ₽)'))}
          </button>
        </div>
      </div>`;
      }).join('');
      setTxt('netWorthText', totalNet.toLocaleString() + ' ₽');
      }
      function upgradeBusiness(idx) {
      const b = state.businesses[idx];
      if (state.player.level < b.minLevel) return showToast(`Этот бизнес доступен с ${b.minLevel} уровня!`);
      if (b.level >= 10) return showToast("Бизнес достиг максимума!");
      const cost = b.level === 0 ? b.cost : b.cost * (b.level + 1);
      if (state.player.cash < cost) return showToast("Не хватает денег!");
      state.player.cash -= cost;
      b.level += 1;
      saveState(); checkBusinessAccess();
      showToast(`Бизнес «${b.name}» прокачан до ${b.level} уровня!`);
      }
      function setCheatLevel(lvl) { state.player.level = lvl; updateLevelGatesUI(); checkReshalaAccess(); updateHeaderUI(); saveState(); showToast(`Уровень ${lvl}`); switchTab('tabProfile'); }
      function cheatAddMoney() { state.player.cash += 10000000; updateHeaderUI(); saveState(); showToast("+10M ₽"); }
      function cheatAddStats() { state.player.hunger = 100; state.player.mood = 100; state.player.reputation = 100; updateHeaderUI(); saveState(); showToast("100%!"); }
      function updateLevelGatesUI() {
      const locks = [
      { id: 'catBtn-moto', lock: 'lock-moto', lvl: 16 },
      { id: 'catBtn-atv', lock: 'lock-atv', lvl: 16 },
      { id: 'catBtn-comfort', lock: 'lock-comfort', lvl: 30 },
      { id: 'catBtn-premium', lock: 'lock-premium', lvl: 30 },
      { id: 'catBtn-hyper', lock: 'lock-hyper', lvl: 50 },
      { id: 'catBtn-truck', lock: 'lock-truck', lvl: 50 },
      { id: 'catBtn-yacht', lock: 'lock-yacht', lvl: 100 }
      ];
      locks.forEach(l => {
      const btn = document.getElementById(l.id);
      const icon = document.getElementById(l.lock);
      if (btn && icon) {
      if (state.player.level >= l.lvl) {
      btn.classList.remove('locked');
      icon.style.display = 'none';
      } else {
      btn.classList.add('locked');
      icon.style.display = 'inline-block';
      }
      }
      });
      }
      function openDailyBonusModal() { document.getElementById('modalDailyBonus')?.classList.add('active'); }
      function claimDailyReward() { state.player.cash += 50000; saveState(); closeModal('modalDailyBonus'); showToast("+50,000 ₽ бонус!"); }
      function renderProfileAnalytics() {
      setTxt('profileTgUsername', state.player.name);
      setTxt('statProfitable', state.player.stats.profitableSales);
      setTxt('statLoss', state.player.stats.lossSales);
      setTxt('statTotalNetProfit', state.player.stats.totalNetProfit.toLocaleString() + ' ₽');
      }
      function doActivity(type, cost, mood, connections = 0) { if (state.player.cash < cost) return showToast("Не хватает денег!"); state.player.cash -= cost; state.player.mood = Math.min(100, state.player.mood + mood); if (connections) state.player.connections += connections; saveState(); showToast("Отдохнули!"); }
      function watchAdsgram() { state.player.cash += 25000; state.player.connections += 1; saveState(); showToast("+25k ₽ и +1 🤝"); }
      function buyPackWithStars(stars, cash) { state.player.cash += cash; saveState(); showToast(`+${cash.toLocaleString()} ₽`); }
      function buyVipProPass() { state.player.vipPro = true; saveState(); showToast("VIP активирован!"); }
      function refuelAction(type) { state.player.fuel = 100; saveState(); showToast("Бак 100 ⛽!"); }
      function resetGameData() { localStorage.removeItem('perekoop_sim_save_v38'); location.reload(); }
      function updateMarketTimers() {
      const now = Date.now();
      let needRender = false;
      state.marketFeed.forEach(car => {
      if (car.cooldownUntil && car.cooldownUntil > now) {
      const timeLeft = Math.ceil((car.cooldownUntil - now) / 1000);
      const el = document.getElementById(`timer_num_${car.id}`);
      if (el) el.innerText = `${timeLeft}с`;
      } else if (car.cooldownUntil && car.cooldownUntil <= now) {
      car.cooldownUntil = 0;
      needRender = true;
      }
      });
      if (needRender) renderMarketFeed();
      }
      function initApp() {
      sanitizeState();
      syncTelegramProfile();
      updateHeaderUI();
      updateLevelGatesUI();
      checkReshalaAccess();
      if (state.marketFeed.length === 0) populateMarketFeed();
      renderGarage();
      renderSalesLot();
      renderDiets();
      renderHousing();
      renderContracts();
      renderContainersList();
      renderPlatesPage();
      renderBarnFind();
      renderLifeChat();
      switchTab('tabMarket');
      }
      // ===================== ГЛАВНЫЙ ЦИКЛ ИНТЕРФЕЙСА =====================
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
      generateBuyerForSlot(slot);
      lotChanged = true;
      }
      }
      });
      if (lotChanged && document.getElementById('tabSalesLot')?.classList.contains('active')) renderSalesLot();
      if (state.player.fuel < 100) {
      state.player.fuel = Math.min(100, state.player.fuel + 1);
      setTxt('fuelAmount', `${state.player.fuel}/100`);
      }
      if (document.getElementById('tabMarket')?.classList.contains('active')) updateMarketTimers();
      }, 1000);
      if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
      } else {
      initApp();
      }

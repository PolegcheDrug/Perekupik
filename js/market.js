// ===================== Вкладка: РЫНОК (js/market.js) =====================
// --- ЛОГИКА ГОСНОМЕРОВ ---
const PLATE_LETTERS = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];
const REGIONS = ['77', '99', '97', '177', '199', '777', '799', '50', '90', '150', '190', '750'];
function generateNormalPlate() {
const l1 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
const l2 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
const l3 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
let num = String(Math.floor(Math.random() * 899) + 100);
const reg = REGIONS[Math.floor(Math.random() * REGIONS.length)];
return `${l1}${num}${l2}${l3} ${reg}`;
}
function generateCoolPlate() {
const letters = Math.random() > 0.5
? PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)].repeat(3)
: PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)] + PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)].repeat(2);
const coolNums = ['001', '007', '111', '222', '333', '444', '555', '666', '777', '888', '999'];
const num = coolNums[Math.floor(Math.random() * coolNums.length)];
const reg = ['77', '99', '97', '777'][Math.floor(Math.random() * 4)];
return `${letters.charAt(0)}${num}${letters.substring(1)} ${reg}`;
}
function evaluatePlate(plateStr) {
if (typeof calculatePlateValue === 'function') {
return calculatePlateValue(plateStr);
}
if (!plateStr || plateStr.startsWith('ТРАНЗИТ')) return 0;
return 1500;
}
function refreshPlateCatalog() {
state.plateCatalog = [];
for (let i = 0; i < 6; i++) {
const isCool = Math.random() > 0.45;
const p = isCool ? generateCoolPlate() : generateNormalPlate();
state.plateCatalog.push({ plate: p, price: Math.round(evaluatePlate(p) * (1.1 + Math.random() * 0.25)) });
}
}
// --- ЛОГИКА РЫНКА (Покупка, Торг, Осмотр) ---
let activeInspectCarId = null;
let pendingMarketCar = null;
function getDynamicPrice(basePrice, type) {
if (!state.marketModifiers) state.marketModifiers = { economy: 1, comfort: 1, premium: 1, all: 1 };
const mod = state.marketModifiers[type] || 1;
const globalMod = state.marketModifiers.all || 1;
return Math.floor(basePrice * mod * globalMod);
}
function getMarketRefreshCost() {
return 150 + ((state.player?.level || 1) * 350);
}
function setCategory(cat) {
const lvl = state.player?.level || 1;
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
renderMarketFeed();
showToast("Лента обновлена (-5 ⛽)!");
}
function populateMarketFeed() {
if (typeof CAR_DATABASE === 'undefined' || !CAR_DATABASE) return;
const cat = state.activeCategory || 'economy';
const pool = CAR_DATABASE[cat] || CAR_DATABASE.economy || [];
if (pool.length === 0) return;
state.marketFeed = [];
const lvl = state.player?.level || 1;
for (let i = 0; i < 8; i++) {
const template = pool[i % pool.length];
// Повышенные и сбалансированные шансы дефектов и криминала
const defectChance = lvl <= 5 ? 0.35 : (lvl >= 20 ? 0.60 : 0.45);
const stolenChance = lvl <= 5 ? 0.12 : (lvl >= 20 ? 0.28 : 0.20);
const hasHiddenDefect = (typeof OBD_ERRORS !== 'undefined' && OBD_ERRORS.length > 0) ? (Math.random() < defectChance) : false;
const isStolen = Math.random() < stolenChance;
const carId = 'm_' + Date.now() + '_' + i;
const isCool = Math.random() < 0.20;
const genPlate = isCool ? generateCoolPlate() : generateNormalPlate();
const dynPrice = getDynamicPrice(template.basePrice, template.type);
const priceMultiplier = lvl <= 10
? (0.75 + Math.random() * 0.20)
: (lvl >= 20 ? (0.85 + Math.random() * 0.30) : (0.80 + Math.random() * 0.25));
const sellerPrice = Math.round(dynPrice * priceMultiplier);
const baseVal = Math.round(dynPrice * 1.15);
const defectObj = (hasHiddenDefect && typeof OBD_ERRORS !== 'undefined') ? OBD_ERRORS[Math.floor(Math.random() * OBD_ERRORS.length)] : null;
const sNote = (typeof SELLER_ADS_PHRASES !== 'undefined' && SELLER_ADS_PHRASES.length > 0)
? SELLER_ADS_PHRASES[Math.floor(Math.random() * SELLER_ADS_PHRASES.length)]
: "Хорошая машина, сел и поехал.";
const plateVal = evaluatePlate(genPlate);
state.marketFeed.push({
id: carId,
name: template.name,
power: template.power || 100,
type: template.type || 'economy',
basePrice: template.basePrice,
mileage: Math.floor(Math.random() * 120000) + 18000,
price: sellerPrice,
baseMarketValue: baseVal,
marketValue: baseVal + plateVal,
img: template.img || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80",
plate: genPlate,
isStolen: isStolen,
autotekaChecked: false,
cooldownUntil: 0,
stoChecked: false,
haggled: false,
unavailable: false,
hiddenDefect: defectObj,
sellerNote: sNote,
condition: hasHiddenDefect ? 55 : 85,
tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 },
wear: { engine: 65 + Math.random() * 30, transmission: 65 + Math.random() * 30 },
bodyThickness: { hood: Math.random() > 0.6 ? 250 : 115, roof: 100, doors: Math.random() > 0.5 ? 260 : 110, wings: 110 },
rolledOdometer: false,
hasAdditive: false,
isRepainted: false,
isPolished: false,
viewed: false
});
}
saveState();
renderMarketFeed();
}
function renderMarketFeed() {
const container = document.getElementById('marketCardContainer');
if (!container) return;
setTxt('refreshCostText', getMarketRefreshCost().toLocaleString());
const mainContent = document.querySelector('.main-content');
const scrollPos = mainContent ? mainContent.scrollTop : 0;
const now = Date.now();
if (!state.marketFeed || state.marketFeed.length === 0) {
container.innerHTML = `<div class="glass-card text-center py-6 sub-label">Нет предложений на рынке. Нажмите «Обновить ленту»!</div>`;
return;
}
container.innerHTML = state.marketFeed.map(car => {
if (car.unavailable) return '';
const isBusy = (car.cooldownUntil && car.cooldownUntil > now);
const timeLeft = isBusy ? Math.ceil((car.cooldownUntil - now) / 1000) : 0;
const hasScanner = !!(state.player.tools && state.player.tools.obd);
return `
<div class="glass-card mb-3 ${isBusy ? 'busy' : ''} ${car.viewed ? 'viewed-card' : ''}" id="card_${car.id}">
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
    <div class="sub-label mb-2">${car.power || 100} л.с. | Пробег: ${(car.mileage || 0).toLocaleString()} км</div>
    ${car.sellerNote ? `<div class="seller-note-card">${car.sellerNote}</div>` : ''}
  </div>
  <div class="price-box">
    <div>
      <span class="text-xs color-green font-bold">ЦЕНА:</span>
      <div class="price-val" id="price_txt_${car.id}">${car.price.toLocaleString()} ₽</div>
    </div>
    <div class="sub-label">Рыночная: ~${car.marketValue.toLocaleString()} ₽</div>
  </div>
  <div class="grid-3 mb-2">
    <button onclick="openGaugeModal('${car.id}')" class="btn btn-dark btn-sm">Толщиномер ${state.player.tools?.gauge ? '✓' : '(3k)'}</button>
    <button onclick="quickOBDScanMarketCar('${car.id}')" class="btn btn-dark btn-sm">${hasScanner ? 'OBD2 ✓' : 'OBD2 (5k)'}</button>
    <button onclick="openAutotekaModal('${car.id}')" class="btn btn-dark btn-sm">Автотека (${car.autotekaChecked ? '0' : '5k'})</button>
  </div>
  <button onclick="initiateBuyMarketCar('${car.id}')" class="btn btn-cyan w-full">
    <i class="fa-solid fa-phone">
    </i> Позвонить продавцу
  </button>
</div>`;
}).join('');
if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
}
// --- ЭКСПРЕСС-ДИАГНОСТИКА OBD2 НА РЫНКЕ ---
function quickOBDScanMarketCar(carId) {
const car = state.marketFeed.find(c => c.id === carId);
if (!car) return;
car.viewed = true;
const hasScanner = !!(state.player.tools && state.player.tools.obd);
if (!hasScanner) {
if (state.player.cash < 5000) return showToast("Нужно 5,000 ₽ на выездного диагноста или сканер из Маркета!");
state.player.cash -= 5000;
showToast("Выездной мастер подключил сканер (-5,000 ₽)");
} else {
showToast("Подключен ваш собственный OBD2-сканер ✓");
}
car.stoChecked = true;
saveState();
renderMarketFeed();
if (car.hiddenDefect) {
openVerdictModal("ОШИБКИ В ЭБУ! ⚠️", `Сканер считал неисправность: ${car.hiddenDefect.text}. Затраты на ремонт: ~${car.hiddenDefect.cost.toLocaleString()} ₽.`, false);
} else {
openVerdictModal("ОШИБОК НЕТ ✓", `ЭБУ чист. Ресурс двигателя: ${Math.round(car.wear?.engine || 90)}%, трансмиссии: ${Math.round(car.wear?.transmission || 90)}%.`, true);
}
}
function initiateBuyMarketCar(carId) {
const carIndex = state.marketFeed.findIndex(c => c.id === carId);
if (carIndex === -1) return;
const car = state.marketFeed[carIndex];
car.viewed = true;
renderMarketFeed();
const now = Date.now();
if (car.cooldownUntil && car.cooldownUntil > now) {
return showToast("Абонент всё ещё занят! Подождите.");
}
setTxt('buyCallEmoji', '📞');
setTxt('buyCallTitle', `Звонок продавцу...`);
setTxt('buyCallDesc', 'Соединение с абонентом... Идут гудки...');
const btnBox = document.getElementById('buyCallActionBtnBox');
if (btnBox) btnBox.innerHTML = `<button class="btn btn-dark w-full" disabled>Гудки в трубке...</button>`;
document.getElementById('modalBuyCall')?.classList.add('active');
tgHaptic('light');
setTimeout(() => {
let callSuccessChance = 55 + (state.player.karma > 60 ? 10 : 0) - (car.type === 'premium' ? 10 : 0);
const roll = Math.random() * 100;
if (roll < callSuccessChance) {
closeModal('modalBuyCall');
openMarketDeal(carId);
} else if (roll < 85) {
const waitSec = Math.floor(20 + Math.random() * 25);
car.cooldownUntil = Date.now() + (waitSec * 1000);
setTxt('buyCallEmoji', '📵');
setTxt('buyCallTitle', 'Абонент сбросил');
setTxt('buyCallDesc', `«Не могу говорить, перезвоните через ${waitSec} сек!»`);
btnBox.innerHTML = `<button onclick="closeModal('modalBuyCall')" class="btn btn-dark w-full">Понятно</button>`;
saveState();
renderMarketFeed();
} else {
setTxt('buyCallEmoji', '❌');
setTxt('buyCallTitle', 'Объявление снято');
setTxt('buyCallDesc', '«Только что внесли задаток, машина ушла!»');
car.unavailable = true;
saveState();
renderMarketFeed();
btnBox.innerHTML = `<button onclick="closeModal('modalBuyCall')" class="btn btn-dark w-full">Закрыть</button>`;
}
}, 1200);
}
function paidCallMarketCar(carId) {
if (state.player.cash < 1000) return showToast("Не хватает 1000 ₽ на платный дозвон!");
state.player.cash -= 1000;
const carIndex = state.marketFeed.findIndex(c => c.id === carId);
if (carIndex === -1) return;
const car = state.marketFeed[carIndex];
car.cooldownUntil = 0;
saveState();
renderMarketFeed();
openMarketDeal(carId);
}
function updateMarketRiskPreview(pct) {
const text = document.getElementById('marketHaggleRiskText');
const fill = document.getElementById('marketHaggleRiskFill');
if (!text || !fill) return;
if (pct === 3) {
text.innerText = "Низкий (~15%)";
text.className = "color-green";
fill.className = "risk-fill risk-low";
fill.style.width = "20%";
} else if (pct === 7) {
text.innerText = "Умеренный (~50%)";
text.className = "color-amber";
fill.className = "risk-fill risk-mid";
fill.style.width = "55%";
} else {
text.innerText = "Критический (~85%)";
text.className = "color-red";
fill.className = "risk-fill risk-high";
fill.style.width = "90%";
}
}
// --- ОТКРЫТИЕ ОКНА В ФОРМАТЕ ЧАТА/МЕССЕНДЖЕРА ---
function openMarketDeal(carId) {
const carIndex = state.marketFeed.findIndex(c => c.id === carId);
if (carIndex === -1) return;
const car = state.marketFeed[carIndex];
pendingMarketCar = { car, carIndex };
document.getElementById('dealCarImg').src = car.img;
setTxt('dealCarTitle', car.name);
setTxt('dealCarMileageInfo', `Пробег: ${car.mileage.toLocaleString()} км | Госномер: ${car.plate}`);
setTxt('dealCarPrice', `${car.price.toLocaleString()} ₽`);
// Аватарка продавца
const avatars = ['👨‍💼', '🧔', '😎', '👨‍🔧', '🧑‍💻'];
const names = ['Сергей', 'Алексей', 'Дмитрий', 'Артем', 'Михаил'];
const randIdx = Math.abs(carId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % avatars.length;
setTxt('dealSellerAvatar', avatars[randIdx]);
setTxt('dealSellerName', `${names[randIdx]} (Продавец)`);
const thread = document.getElementById('dealChatThread');
if (thread) {
thread.innerHTML = `
<div class="chat-msg msg-seller">«Алло, да, продаю. Машина в порядке, сел и поехал. Что интересует?»</div>
`;
}
const haggleArea = document.getElementById('dealHaggleArea');
if (car.haggled) {
haggleArea.style.display = 'none';
} else {
haggleArea.style.display = 'block';
haggleArea.innerHTML = `
<div class="risk-meter-box mb-2">
  <div class="flex-between text-xs">
    <span>Риск срыва переговоров:</span>
    <b id="marketHaggleRiskText" class="color-green">Низкий (~15%)</b>
  </div>
  <div class="risk-track">
    <div id="marketHaggleRiskFill" class="risk-fill risk-low" style="width: 20%;">
    </div>
  </div>
</div>
<div class="grid-3">
  <button onmouseenter="updateMarketRiskPreview(3)" onclick="attemptMarketHaggle(3)" class="btn btn-dark btn-sm">
    -3%<br>
    <span class="color-green text-xs">Мягко</span>
  </button>
  <button onmouseenter="updateMarketRiskPreview(7)" onclick="attemptMarketHaggle(7)" class="btn btn-dark btn-sm">
    -7%<br>
    <span class="color-amber text-xs">Напор</span>
  </button>
  <button onmouseenter="updateMarketRiskPreview(12)" onclick="attemptMarketHaggle(12)" class="btn btn-dark btn-sm">
    -12%<br>
    <span class="color-red text-xs">Нагло</span>
  </button>
</div>
`;
}
document.getElementById('modalMarketDeal')?.classList.add('active');
playSound('tick');
}
function attemptMarketHaggle(percent) {
if (!pendingMarketCar) return;
const car = pendingMarketCar.car;
if (car.haggled) return showToast("Продавец больше не пойдет на уступки!");
let successChance = percent === 3 ? 80 : (percent === 7 ? 45 : 15);
successChance += ((state.player?.level || 1) * 0.5) + (state.player?.karma > 60 ? 10 : 0);
car.haggled = true;
document.getElementById('dealHaggleArea').style.display = 'none';
const thread = document.getElementById('dealChatThread');
if (Math.random() * 100 <= successChance) {
const disc = Math.round(car.price * (percent / 100));
car.price = Math.max(10000, car.price - disc);
setTxt('dealCarPrice', `${car.price.toLocaleString()} ₽`);
if (thread) {
thread.innerHTML += `
<div class="chat-msg msg-player">«Скинь ${percent}%, забираю прямо сейчас за наличку без лишних вопросов.»</div>
<div class="chat-msg msg-seller">«Ладно, по рукам... Скину ${disc.toLocaleString()} ₽. Оформляем ДКП!»</div>
`;
thread.scrollTop = thread.scrollHeight;
}
playSound('win');
tgHaptic('success');
} else {
if (thread) {
thread.innerHTML += `
<div class="chat-msg msg-player">«Скидывай цену, на ней шпакли в два пальца!»</div>
<div class="chat-msg msg-seller">«Слышь, не нравится — иди пешком ходи! Торга нет, цена окончательная.»</div>
`;
thread.scrollTop = thread.scrollHeight;
}
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
state.player.stats.bought = (state.player.stats.bought || 0) + 1;
state.garage.push({
...car,
customPlate: car.plate,
impounded: false,
purchaseCost: car.price,
wear: car.wear || { engine: 85, transmission: 85 },
preSaleVisited: false
});
state.marketFeed.splice(carIndex, 1);
pendingMarketCar = null;
addXp(40);
showToast(`✅ ${car.name} куплен за ${car.price.toLocaleString()} ₽!`);
playSound('win');
tgHaptic('success');
spawnFloatingReward(`-${car.price.toLocaleString()} ₽`);
saveState();
renderMarketFeed();
renderGarage();
setTimeout(() => switchTab('tabGarage'), 350);
}
function openGaugeModal(carId) {
activeInspectCarId = carId;
const car = state.marketFeed.find(c => c.id === carId);
if (car) car.viewed = true;
if (!state.player.tools?.gauge) {
if (state.player.cash < 3000) return showToast("Купите толщиномер в Маркете или отдайте 3,000 ₽ за замер!");
state.player.cash -= 3000;
}
saveState();
document.getElementById('modalGauge')?.classList.add('active');
renderMarketFeed();
}
function checkBodyPart(part) {
if (!activeInspectCarId) return;
const car = state.marketFeed.find(c => c.id === activeInspectCarId);
if (!car) return;
playSound('tick');
tgHaptic('light');
const val = car.bodyThickness[part];
const el = document.getElementById(`part-${part}`);
if (el) el.innerHTML = val > 200 ? `<span class="color-red">${val} мкм (Шпакля)</span>` : `<span class="color-green">${val} мкм (Завод)</span>`;
}
function openAutotekaModal(carId) {
const car = state.marketFeed.find(c => c.id === carId);
if (!car) return;
car.viewed = true;
if (!car.autotekaChecked) {
const cost = state.player.vipPro ? 0 : 5000;
if (state.player.cash < cost && !state.player.vipPro) return showToast("Автотека стоит 5,000 ₽!");
state.player.cash -= cost;
car.autotekaChecked = true;
saveState();
}
const stat = car.isStolen ? "<b class='color-red'>В РОЗЫСКЕ (Перебиты номера кузова)</b>" : "<b class='color-green'>Юридически чист</b>";
const rep = document.getElementById('autotekaReportContent');
if (rep) {
rep.innerHTML = `<div class="mb-1 font-bold">${car.name} (${car.plate})</div>
<div>ДТП в базе: <b>${car.hiddenDefect ? '2' : '0'} шт.</b>
</div>
<div class="mt-1">Юридический статус: ${stat}</div>`;
}
document.getElementById('modalAutoteka')?.classList.add('active');
renderMarketFeed();
}
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
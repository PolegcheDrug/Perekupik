// ===================== Вкладка: ГАРАЖ (js/garage.js) =====================
let selectedCarIndex = null;
let activePreSaleCarIndex = null;
let carToLotIndex = null;
let obdActiveCarIdx = null;
let pendingBarterCar = null;
function calculatePlateValue(plateStr) {
if (!plateStr) return 0;
if (String(plateStr).startsWith('ТРАНЗИТ')) return 0;
const parts = String(plateStr).split(' ');
if (parts.length < 2) return 0;
const main = parts[0];
const reg = parts[1];
const num = main.replace(/[^0-9]/g, '');
const letters = main.replace(/[^А-Яа-я]/g, '');
let value = 1500;
if (num === '777') { value += 850000; }
else if (num === '007') { value += 850000; }
else if (num === '001') { value += 850000; }
else if (num.length === 3 && num[0] === num[1] && num[1] === num[2]) { value += 380000; }
else if (num.startsWith('00')) { value += 120000; }
else if (num.endsWith('00')) { value += 65000; }
else if (num.length === 3 && num[0] === num[2]) { value += 15000; }
if (letters.length === 3 && letters[0] === letters[1] && letters[1] === letters[2]) { value += 450000; }
if (letters === 'АМР') { value += 1500000; }
if (letters === 'ЕКХ') { value += 1500000; }
if (letters === 'СКР') { value += 700000; }
if (letters === 'САС') { value += 700000; }
if (letters === 'ВОР') { value += 700000; }
if (letters === 'МММ') { value += 700000; }
if (reg === '77') { value = Math.round(value * 1.3); }
if (reg === '99') { value = Math.round(value * 1.3); }
if (reg === '97') { value = Math.round(value * 1.3); }
if (reg === '777') { value = Math.round(value * 1.3); }
if (value <= 2000) {
return Math.floor(Math.random() * 1000) + 500;
}
return value;
}
function renderGarage() {
const list = document.getElementById('garageList');
if (!list) return;
const totalSlots = getTotalGarageSlots();
let currentCount = 0;
if (state.garage && state.garage.length) currentCount = state.garage.length;
setTxt('garageDetailedSlots', currentCount + " из " + totalSlots + " боксов занято");
const mainContent = document.querySelector('.main-content');
const scrollPos = mainContent ? mainContent.scrollTop : 0;
if (!state.garage) {
list.innerHTML = "<div class='glass-card text-center sub-label py-8'>
<i class='fa-solid fa-warehouse color-cyan mb-2' style='font-size:32px;'>
</i>
<div>Гараж пуст. Подберите технику на авторынке!</div>
</div>";
return;
}
if (state.garage.length === 0) {
list.innerHTML = "<div class='glass-card text-center sub-label py-8'>
<i class='fa-solid fa-warehouse color-cyan mb-2' style='font-size:32px;'>
</i>
<div>Гараж пуст. Подберите технику на авторынке!</div>
</div>";
return;
}
let htmlContent = "";
state.garage.forEach((car, idx) => {
if (!car) return;
let cost = 100000;
if (car.purchaseCost) cost = car.purchaseCost;
else if (car.basePrice) cost = car.basePrice;
else if (car.price) cost = car.price;
let carImg = "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
if (car.img) carImg = car.img;
let carType = "ECONOMY";
if (car.type) carType = car.type.toUpperCase();
let carPlate = "ТРАНЗИТ";
if (car.customPlate) carPlate = car.customPlate;
else if (car.plate) carPlate = car.plate;
let carPower = 100;
if (car.power) carPower = car.power;
let carMileageStr = "85 000";
if (typeof car.mileage === 'number') carMileageStr = car.mileage.toLocaleString();
let carCondition = 85;
if (typeof car.condition === 'number') carCondition = car.condition;
const plateVal = calculatePlateValue(carPlate);
let baseVal = 150000;
if (car.baseMarketValue) baseVal = car.baseMarketValue;
else if (car.price) baseVal = car.price;
const marketVal = baseVal + plateVal;
car.marketValue = marketVal;
let defectBlock = "";
if (car.hiddenDefect) {
let defectText = "Неисправность узлов";
if (car.hasAdditive) defectText = "Присадка залита (Стук заглушен)";
else if (car.hiddenDefect.text) defectText = car.hiddenDefect.text;
let dCost = 10000;
if (car.hiddenDefect.cost) dCost = car.hiddenDefect.cost;
defectBlock =
"<div class='legal-warning mb-2'>" +
"<span>⚠ <b>" + defectText + "</b>
</span>" +
"<button onclick='repairCarDefect(" + idx + ")' class='btn btn-amber btn-auto btn-sm'>Капиталка (" + dCost.toLocaleString() + " ₽)</button>" +
"</div>";
}
let impoundedBlock = "";
if (car.impounded) {
let daysAtLot = 1;
if (car.impoundedDays) daysAtLot = car.impoundedDays;
let baseDailyRate = 3500;
if (car.type === 'premium') baseDailyRate = 12000;
else if (car.type === 'comfort') baseDailyRate = 6000;
let iFine = 30000;
if (car.impoundFine) iFine = car.impoundFine;
const totalParkingDebt = iFine + (daysAtLot * baseDailyRate);
impoundedBlock =
"<div class='impound-debt-badge'>" +
"<div>" +
"<div>🚨 <b>ШТРАФСТОЯНКА (Простой: " + daysAtLot + " дн.)</b>
</div>" +
"<div class='sub-label color-red'>Эвакуатор: <b>" + totalParkingDebt.toLocaleString() + " ₽</b>
</div>" +
"</div>" +
"<button onclick='unimpoundCar(" + idx + ")' class='btn btn-cyan btn-auto btn-sm'>Вызволить</button>" +
"</div>";
}
let preSaleDisabled = "";
if (car.impounded) preSaleDisabled = "disabled";
let lotDisabled = "";
if (car.impounded) lotDisabled = "disabled";
let dangerClass = "";
if (car.hiddenDefect) {
if (!car.hasAdditive) dangerClass = "card-danger";
}
let bonusPlateBlock = "";
if (plateVal > 5000) {
bonusPlateBlock = "<div class='text-xs color-cyan font-bold'>+" + plateVal.toLocaleString() + " ₽ за номер</div>";
}
let carName = "Автомобиль";
if (car.name) carName = car.name;
htmlContent +=
"<div class='glass-card mb-3 " + dangerClass + "'>" +
"<div class='car-img-wrap' style='height: 140px;'>" +
"<img src='" + carImg + "' class='car-img' onerror=\"this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'\">" +
"<div class='badge-tag' style='bottom: 8px; right: 8px;'>" + carType + "</div>" +
"<div class='plate-corner'>
<div class='license-plate'>" + carPlate + " <div class='license-flag'>RUS</div>
</div>
</div>" +
"</div>" +
"<div class='flex-between mb-2'>" +
"<div>" +
"<h4 class='font-bold'>" + carName + "</h4>" +
"<div class='sub-label'>" + carPower + " л.с. / Пробег: " + carMileageStr + " км / Сост: " + carCondition + "%</div>" +
"<div class='text-xs color-amber mt-1'>Куплена за: <b>" + cost.toLocaleString() + " ₽</b>
</div>" +
"</div>" +
"<div class='text-right'>" +
"<div class='sub-label'>Оценка:</div>" +
"<div class='price-val'>" + marketVal.toLocaleString() + " ₽</div>" +
bonusPlateBlock +
"</div>" +
"</div>" +
defectBlock +
impoundedBlock +
"<div class='grid-2 mb-2'>" +
"<button onclick='openPreviewModal(" + idx + ")' class='btn btn-dark'>🔍 Осмотр / Звук</button>" +
"<button onclick='openPreSaleModal(" + idx + ")' class='btn btn-dark' " + preSaleDisabled + ">🪄 Предпродажка</button>" +
"</div>" +
"<div class='grid-2 mb-2'>" +
"<button onclick='openTuningModal(" + idx + ")' class='btn btn-dark' " + preSaleDisabled + ">🛠 Тюнинг</button>" +
"<button onclick='openPutOnLotModal(" + idx + ")' class='btn btn-green' " + lotDisabled + ">🏪 На площадку</button>" +
"</div>" +
"<button onclick='scrapCar(" + idx + ")' class='btn btn-dark btn-sm w-full'>Сдать на разборку (-35% стоимости)</button>" +
"</div>";
});
list.innerHTML = htmlContent;
if (mainContent) {
requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
}
}
function buyGarageSlot() {
const cost = getGarageSlotCost();
let cash = 0;
if (state.player && state.player.cash) cash = state.player.cash;
if (cash < cost) return showToast("Нужно " + cost.toLocaleString() + " ₽ на расширение!");
state.player.cash -= cost;
let bSlots = 2;
if (state.player && state.player.baseSlots) bSlots = state.player.baseSlots;
state.player.baseSlots = bSlots + 1;
saveState();
renderGarage();
showToast("Гараж расширен! Добавлен +1 бокс.");
}
function scrapCar(idx) {
const car = state.garage[idx];
if (!car) return;
let baseVal = 100000;
if (car.baseMarketValue) baseVal = car.baseMarketValue;
else if (car.price) baseVal = car.price;
const scrapPrice = Math.round(baseVal * 0.65);
state.player.cash += scrapPrice;
let mood = 85;
if (state.player && state.player.mood) mood = state.player.mood;
state.player.mood = Math.max(0, mood - 10);
if (!state.player.stats) state.player.stats = {};
if (!state.player.stats.sold) state.player.stats.sold = 0;
state.player.stats.sold += 1;
state.garage.splice(idx, 1);
saveState();
renderGarage();
showToast("Авто сдано на разбор за " + scrapPrice.toLocaleString() + " ₽");
}
function openPreviewModal(idx) {
selectedCarIndex = idx;
const car = state.garage[idx];
if (!car) return;
let cPlate = "ТРАНЗИТ";
if (car.customPlate) cPlate = car.customPlate;
else if (car.plate) cPlate = car.plate;
const plateVal = calculatePlateValue(cPlate);
let baseVal = 150000;
if (car.baseMarketValue) baseVal = car.baseMarketValue;
else if (car.price) baseVal = car.price;
const totalVal = baseVal + plateVal;
const imgEl = document.getElementById("prevImg");
if (imgEl) {
if (car.img) imgEl.src = car.img;
else imgEl.src = "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
}
let cType = "car";
if (car.type) cType = car.type;
setTxt("prevTypeBadge", cType.toUpperCase());
const plateEl = document.getElementById("prevPlate");
if (plateEl) {
plateEl.innerHTML = cPlate + " <div class='license-flag'>RUS</div>";
}
let cName = "Автомобиль";
if (car.name) cName = car.name;
setTxt("prevTitle", cName);
let power = 100;
if (car.power) power = car.power;
let cond = 85;
if (typeof car.condition === 'number') cond = car.condition;
setTxt("prevSpecs", power + " л.с. / Разгон: ~6.2с / Состояние: " + cond + "%");
let pCost = 0;
if (car.purchaseCost) pCost = car.purchaseCost;
else if (car.basePrice) pCost = car.basePrice;
setTxt("prevCostDetails", "Себестоимость выкупа: " + pCost.toLocaleString() + " ₽");
setTxt("prevPrice", totalVal.toLocaleString() + " ₽");
const obdBtn = document.getElementById("btnPreviewObdScan");
if (obdBtn) {
let hasScanner = false;
if (state.player && state.player.tools && state.player.tools.obd) {
hasScanner = true;
}
if (hasScanner) {
obdBtn.innerText = "OBD2 Сканер";
obdBtn.className = "btn btn-cyan";
} else {
obdBtn.innerText = "🔒 Нужен OBD2";
obdBtn.className = "btn btn-dark opacity-50";
}
}
const modal = document.getElementById("modalPreview");
if (modal) modal.classList.add('active');
}
function openTuningFromPreview() {
if (selectedCarIndex === null) return;
closeModal("modalPreview");
openTuningModal(selectedCarIndex);
}
function openPreSaleModal(idx) {
const now = Date.now();
if (state.player && state.player.preSaleCooldownUntil && state.player.preSaleCooldownUntil > now) {
const mins = Math.ceil((state.player.preSaleCooldownUntil - now) / 60000);
return showToast("Мастера на перерыве! Откроется через " + mins + " мин.");
}
activePreSaleCarIndex = idx;
const car = state.garage[idx];
if (!car) return;
let mVal = 0;
if (car.marketValue) mVal = car.marketValue;
let cName = "Авто";
if (car.name) cName = car.name;
setTxt("preSaleCarTitle", cName + " (Оценка: " + mVal.toLocaleString() + " ₽)");
let washLevel = 0;
let stoLevel = 0;
if (state.businesses) {
const w = state.businesses.find(b => b.id === 'wash');
if (w) washLevel = w.level;
const s = state.businesses.find(b => b.id === 'sto');
if (s) stoLevel = s.level;
}
let cleanCost = 4000;
if (washLevel >= 3) cleanCost = 0;
else if (washLevel > 0) cleanCost = 2000;
let paintCost = 12000;
if (stoLevel > 0) paintCost = 6000;
const btnClean = document.getElementById("btnCleanPrice");
const btnPaint = document.getElementById("btnPaintPrice");
const btnAdditive = document.getElementById("btnAdditivePrice");
const btnOdometer = document.getElementById("btnOdometerPrice");
if (btnClean) {
if (car.isPolished) {
btnClean.innerText = "Готово ✓";
btnClean.disabled = true;
btnClean.className = "btn btn-dark btn-sm opacity-50";
} else {
btnClean.innerText = cleanCost.toLocaleString() + " ₽";
btnClean.disabled = false;
btnClean.className = "btn btn-cyan btn-sm";
}
}
if (btnPaint) {
if (car.isRepainted) {
btnPaint.innerText = "Готово ✓";
btnPaint.disabled = true;
btnPaint.className = "btn btn-dark btn-sm opacity-50";
} else {
btnPaint.innerText = paintCost.toLocaleString() + " ₽";
btnPaint.disabled = false;
btnPaint.className = "btn btn-dark btn-sm";
}
}
if (btnAdditive) {
if (car.hasAdditive) {
btnAdditive.innerText = "Готово ✓";
btnAdditive.disabled = true;
btnAdditive.className = "btn btn-dark btn-sm opacity-50";
} else {
btnAdditive.innerText = "6,000 ₽";
btnAdditive.disabled = false;
btnAdditive.className = "btn btn-amber btn-sm";
}
}
if (btnOdometer) {
if (car.rolledOdometer) {
btnOdometer.innerText = "Скручен ✓";
btnOdometer.disabled = true;
btnOdometer.className = "btn btn-dark btn-sm opacity-50";
} else {
btnOdometer.innerText = "8,000 ₽";
btnOdometer.disabled = false;
btnOdometer.className = "btn btn-danger btn-sm";
}
}
const modal = document.getElementById("modalPreSale");
if (modal) modal.classList.add('active');
}
function applyPreSaleMod(type) {
if (activePreSaleCarIndex === null) return;
const car = state.garage[activePreSaleCarIndex];
if (!car) return;
let washLevel = 0;
let stoLevel = 0;
if (state.businesses) {
const w = state.businesses.find(b => b.id === 'wash');
if (w) washLevel = w.level;
const s = state.businesses.find(b => b.id === 'sto');
if (s) stoLevel = s.level;
}
let cleanCost = 4000;
if (washLevel >= 3) cleanCost = 0;
else if (washLevel > 0) cleanCost = 2000;
let paintCost = 12000;
if (stoLevel > 0) paintCost = 6000;
let cash = 0;
if (state.player && state.player.cash) cash = state.player.cash;
if (type === 'clean') {
if (car.isPolished) return showToast("Уже отполировано!");
if (cash < cleanCost) return showToast("Не хватает денег!");
state.player.cash -= cleanCost;
car.isPolished = true;
let bmVal = 100000;
if (car.baseMarketValue) bmVal = car.baseMarketValue;
else if (car.price) bmVal = car.price;
car.baseMarketValue = Math.round(bmVal * 1.05);
let cPlate = "ТРАНЗИТ";
if (car.customPlate) cPlate = car.customPlate;
else if (car.plate) cPlate = car.plate;
car.marketValue = car.baseMarketValue + calculatePlateValue(cPlate);
showToast("✨ Фары сияют, салон как новый! +5% к цене.");
}
else if (type === 'paint') {
if (car.isRepainted) return showToast("Уже окрашено!");
if (cash < paintCost) return showToast("Не хватает денег!");
state.player.cash -= paintCost;
let cCond = 85;
if (car.condition !== undefined) cCond = car.condition;
car.condition = Math.min(100, cCond + 20);
car.isRepainted = true;
if (!car.bodyThickness) car.bodyThickness = { hood: 110, roof: 100, doors: 110, wings: 105 };
car.bodyThickness.doors = 280;
showToast("🎨 Детали облиты! Слой краски увеличился.");
}
else if (type === 'additive') {
if (car.hasAdditive) return showToast("Присадка уже залита!");
if (cash < 6000) return showToast("Не хватает 6,000 ₽!");
state.player.cash -= 6000;
car.hasAdditive = true;
showToast("🧪 «Медовая» присадка залита! Стук гидрокомпенсаторов скрыт.");
}
else if (type === 'odometer') {
if (car.rolledOdometer) return showToast("Пробег уже скручивался!");
if (cash < 8000) return showToast("Не хватает 8,000 ₽!");
state.player.cash -= 8000;
let m = 85000;
if (typeof car.mileage === 'number') m = car.mileage;
car.mileage = Math.round(m / 2);
let bmVal = 100000;
if (car.baseMarketValue) bmVal = car.baseMarketValue;
else if (car.price) bmVal = car.price;
car.baseMarketValue = Math.round(bmVal * 1.15);
let cPlate = "ТРАНЗИТ";
if (car.customPlate) cPlate = car.customPlate;
else if (car.plate) cPlate = car.plate;
car.marketValue = car.baseMarketValue + calculatePlateValue(cPlate);
car.rolledOdometer = true;
showToast("⏳ Пробег скручен вдвое! Машина помолодела.");
}
saveState();
renderGarage();
openPreSaleModal(activePreSaleCarIndex);
}
function repairCarDefect(idx) {
const car = state.garage[idx];
if (!car) return;
let stoLevel = 0;
if (state.businesses) {
const s = state.businesses.find(b => b.id === 'sto');
if (s) stoLevel = s.level;
}
let cost = 10000;
if (car.hiddenDefect && typeof car.hiddenDefect.cost === 'number') {
cost = car.hiddenDefect.cost;
}
if (stoLevel > 0) cost = Math.round(cost * 0.6);
let cash = 0;
if (state.player && state.player.cash) cash = state.player.cash;
if (cash < cost) return showToast("Не хватает денег на капремонт!");
state.player.cash -= cost;
car.hiddenDefect = null;
car.hasAdditive = false;
car.condition = 95;
saveState();
renderGarage();
showToast("Дефект устранён!");
}
function openOBD2Modal() {
if (selectedCarIndex === null) return;
let hasScanner = false;
if (state.player && state.player.tools && state.player.tools.obd) {
hasScanner = true;
}
if (!hasScanner) {
return showToast("🔒 Требуется OBD2-сканер! Купите его в Маркете Перекупа.");
}
obdActiveCarIdx = selectedCarIndex;
const car = state.garage[selectedCarIndex];
if (!car) return;
closeModal("modalPreview");
car.stoChecked = true;
let cName = "Авто";
if (car.name) cName = car.name;
setTxt("obd2CarTitle", "Диагностика: " + cName);
const resBox = document.getElementById("obd2ResultBox");
const actBox = document.getElementById("obd2ActionBox");
if (resBox) resBox.innerHTML = "Подключение по протоколу CAN / ISO 14230...<br>";
if (actBox) actBox.innerHTML = "";
const modal = document.getElementById("modalOBD2");
if (modal) modal.classList.add('active');
setTimeout(() => {
let engWear = 100;
if (car.wear && car.wear.engine) engWear = Math.round(car.wear.engine);
let transWear = 100;
if (car.wear && car.wear.transmission) transWear = Math.round(car.wear.transmission);
let issuesHtml = "<b>Отчет об узлах:</b>
<br>Двигатель: " + engWear + "% ресурса<br>Трансмиссия: " + transWear + "% ресурса<br>";
  if (car.hiddenDefect) {
  let dText = "Неизвестная ошибка";
  if (car.hiddenDefect.text) dText = car.hiddenDefect.text;
  let dCost = 10000;
  if (car.hiddenDefect.cost) dCost = car.hiddenDefect.cost;
  issuesHtml += "<br>
  <span class='color-red'>ОШИБКИ В ЭБУ:</span>
  <br>" + dText;
    if (actBox) actBox.innerHTML = "<button onclick='repairOBDErrorFromScanner()' class='btn btn-amber w-full'>Устранить ошибку (" + dCost.toLocaleString() + " ₽)</button>";
    } else {
    issuesHtml += "<br>
    <span class='color-green'>Ошибок (DTC) не обнаружено. Агрегаты в норме.</span>";
    }
    if (resBox) resBox.innerHTML = issuesHtml;
    }, 800);
    }
    function closeOBD2Modal() {
    closeModal("modalOBD2");
    if (obdActiveCarIdx !== null) openPreviewModal(obdActiveCarIdx);
    }
    function repairOBDErrorFromScanner() {
    if (obdActiveCarIdx === null) return;
    const car = state.garage[obdActiveCarIdx];
    if (!car) return;
    if (!car.hiddenDefect) return;
    let cost = 10000;
    if (car.hiddenDefect.cost) cost = car.hiddenDefect.cost;
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;
    if (cash < cost) return showToast("Недостаточно денег на ремонт!");
    state.player.cash -= cost;
    car.hiddenDefect = null;
    if (!car.wear) car.wear = { engine: 90, transmission: 90 };
    let eng = 90;
    if (car.wear.engine) eng = car.wear.engine;
    car.wear.engine = Math.max(90, eng + 30);
    let trans = 90;
    if (car.wear.transmission) trans = car.wear.transmission;
    car.wear.transmission = Math.max(90, trans + 30);
    let bmVal = 100000;
    if (car.baseMarketValue) bmVal = car.baseMarketValue;
    else if (car.price) bmVal = car.price;
    car.baseMarketValue = Math.round(bmVal * 1.08);
    let cPlate = "ТРАНЗИТ";
    if (car.customPlate) cPlate = car.customPlate;
    else if (car.plate) cPlate = car.plate;
    car.marketValue = car.baseMarketValue + calculatePlateValue(cPlate);
    saveState();
    closeOBD2Modal();
    renderGarage();
    showToast("Ремонт узлов выполнен успешно!");
    }
    function openChangePlateModal() {
    if (selectedCarIndex === null) return;
    const list = document.getElementById("changePlateList");
    if (!list) return;
    if (!state.ownedPlates || state.ownedPlates.length === 0) {
    list.innerHTML = "<div class='sub-label py-2'>У вас нет номеров в коллекции! Купите в Маркете.</div>";
    } else {
    let html = "";
    state.ownedPlates.forEach((p, i) => {
    const pVal = calculatePlateValue(p);
    let extraClass = "";
    if (pVal > 5000) {
    extraClass = "<div class='text-xs color-green mt-1'>+" + pVal.toLocaleString() + " ₽ к цене</div>";
    }
    html +=
    "<div class='glass-card flex-between w-full mb-1 p-2'>" +
    "<div>" +
    "<div class='license-plate'>" + p + " <div class='license-flag'>RUS</div>
  </div>" +
  extraClass +
  "</div>" +
  "<button onclick=\"installPlateOnCar('" + p + "', " + i + ")\" class='btn btn-cyan btn-auto btn-sm'>Установить</button>" +
  "</div>";
  });
  list.innerHTML = html;
  }
  const modal = document.getElementById("modalChangePlate");
  if (modal) modal.classList.add('active');
  }
  function removePlateFromCar() {
  if (selectedCarIndex === null) return;
  const car = state.garage[selectedCarIndex];
  if (!car) return;
  let oldPlate = "ТРАНЗИТ";
  if (car.customPlate) oldPlate = car.customPlate;
  else if (car.plate) oldPlate = car.plate;
  if (oldPlate && String(oldPlate).startsWith('ТРАНЗИТ')) {
  return showToast("На машине уже установлены транзиты!");
  }
  let cash = 0;
  if (state.player && state.player.cash) cash = state.player.cash;
  if (cash < 2000) return showToast("Нужно 2,000 ₽ на снятие!");
  state.player.cash -= 2000;
  if (oldPlate) {
  if (!state.ownedPlates) state.ownedPlates = [];
  state.ownedPlates.push(oldPlate);
  }
  const transitNum = Math.floor(Math.random() * 9000) + 1000;
  car.customPlate = "ТРАНЗИТ " + transitNum;
  let bmVal = 100000;
  if (car.baseMarketValue) bmVal = car.baseMarketValue;
  else if (car.price) bmVal = car.price;
  car.marketValue = bmVal;
  saveState();
  closeModal("modalChangePlate");
  openPreviewModal(selectedCarIndex);
  renderGarage();
  showToast("Номер снят в инвентарь (-2,000 ₽). Выданы транзиты!");
  }
  function installPlateOnCar(plate, plateIdx) {
  if (selectedCarIndex === null) return;
  const car = state.garage[selectedCarIndex];
  if (!car) return;
  let cash = 0;
  if (state.player && state.player.cash) cash = state.player.cash;
  if (cash < 2000) return showToast("Нужно 2,000 ₽ на установку!");
  state.player.cash -= 2000;
  car.customPlate = plate;
  state.ownedPlates.splice(plateIdx, 1);
  const plateVal = calculatePlateValue(plate);
  let bmVal = 100000;
  if (car.baseMarketValue) bmVal = car.baseMarketValue;
  else if (car.price) bmVal = car.price;
  car.marketValue = bmVal + plateVal;
  saveState();
  closeModal("modalChangePlate");
  openPreviewModal(selectedCarIndex);
  renderGarage();
  showToast("Госномер " + plate + " установлен! (+" + plateVal.toLocaleString() + " ₽ к оценке авто)");
  }
  function updateTuningRiskUI(car) {
  let risk = 0;
  if (car && car.tuning && typeof car.tuning.risk1251 === 'number') {
  risk = car.tuning.risk1251;
  }
  setTxt("tuneRiskValue", risk + "%");
  const fill = document.getElementById("tuneRiskFill");
  if (fill) fill.style.width = Math.min(100, risk) + "%";
  }
  function openTuningModal(idx) {
  selectedCarIndex = idx;
  const car = state.garage[idx];
  if (!car) return;
  if (!car.tuning) car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 };
  let cName = "Авто";
  if (car.name) cName = car.name;
  let cPower = 100;
  if (car.power) cPower = car.power;
  setTxt("tuneCarTitle", cName + " (" + cPower + " л.с.)");
  updateTuningRiskUI(car);
  const c = document.getElementById("tuningItemsContainer");
  if (c) {
  let lvl = 1;
  if (state.player && state.player.level) lvl = state.player.level;
  let btn1 = "50,000 ₽";
  let dis1 = "";
  if (lvl < 5) { btn1 = "С 5 УР"; dis1 = "disabled"; }
  let btn2 = "35,000 ₽";
  let dis2 = "";
  if (lvl < 10) { btn2 = "С 10 УР"; dis2 = "disabled"; }
  let btn3 = "45,000 ₽";
  let dis3 = "";
  if (lvl < 15) { btn3 = "С 15 УР"; dis3 = "disabled"; }
  let btn4 = "60,000 ₽";
  let dis4 = "";
  if (lvl < 20) { btn4 = "С 20 УР"; dis4 = "disabled"; }
  c.innerHTML =
  "<div class='glass-card flex-between p-2 mb-2'>" +
  "<div>
  <div class='font-bold text-xs'>Чип-Тюнинг Stage</div>
  <div class='sub-label'>+30 л.с. / Лимит: Stage 3</div>
</div>" +
"<button onclick=\"applyTuningMod('chip')\" class='btn btn-dark btn-auto btn-sm' " + dis1 + ">" + btn1 + "</button>" +
"</div>" +
"<div class='glass-card flex-between p-2 mb-2'>" +
"<div>
<div class='font-bold text-xs'>Прямоточный Выхлоп</div>
<div class='sub-label'>+25% риск 12.5.1</div>
</div>" +
"<button onclick=\"applyTuningMod('exhaust')\" class='btn btn-dark btn-auto btn-sm' " + dis2 + ">" + btn2 + "</button>" +
"</div>" +
"<div class='glass-card flex-between p-2 mb-2'>" +
"<div>
<div class='font-bold text-xs'>Пневмоподвеска (Стенс)</div>
<div class='sub-label'>+40 баллов на шоу</div>
</div>" +
"<button onclick=\"applyTuningMod('stance')\" class='btn btn-dark btn-auto btn-sm' " + dis3 + ">" + btn3 + "</button>" +
"</div>" +
"<div class='glass-card flex-between p-2 mb-2'>" +
"<div>
<div class='font-bold text-xs'>Спортивный Обвес</div>
<div class='sub-label'>+15% риск 12.5.1</div>
</div>" +
"<button onclick=\"applyTuningMod('bodykit')\" class='btn btn-dark btn-auto btn-sm' " + dis4 + ">" + btn4 + "</button>" +
"</div>";
}
const modal = document.getElementById("modalTuning");
if (modal) modal.classList.add('active');
}
function applyTuningMod(type) {
if (selectedCarIndex === null) return;
const car = state.garage[selectedCarIndex];
if (!car) return;
if (!car.tuning) car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 };
let lvl = 1;
if (state.player && state.player.level) lvl = state.player.level;
let cash = 0;
if (state.player && state.player.cash) cash = state.player.cash;
if (type === 'chip') {
if (lvl < 5) return showToast("Требуется 5 уровень!");
if (car.tuning.chip >= 3) return showToast("Уже установлен Stage 3!");
if (cash < 50000) return showToast("Не хватает 50,000 ₽!");
state.player.cash -= 50000;
car.tuning.chip += 1;
let pwr = 100;
if (car.power) pwr = car.power;
car.power = pwr + 30;
car.tuning.risk1251 += 15;
}
else if (type === 'exhaust') {
if (lvl < 10) return showToast("Требуется 10 уровень!");
if (car.tuning.exhaust) return showToast("Прямоток уже стоит!");
if (cash < 35000) return showToast("Не хватает 35,000 ₽!");
state.player.cash -= 35000;
car.tuning.exhaust = true;
car.tuning.risk1251 += 25;
}
else if (type === 'stance') {
if (lvl < 15) return showToast("Требуется 15 уровень!");
if (car.tuning.stance) return showToast("Пневма уже настроена!");
if (cash < 45000) return showToast("Не хватает 45,000 ₽!");
state.player.cash -= 45000;
car.tuning.stance = true;
car.tuning.risk1251 += 20;
}
else if (type === 'bodykit') {
if (lvl < 20) return showToast("Требуется 20 уровень!");
if (car.tuning.bodykit) return showToast("Обвес уже установлен!");
if (cash < 60000) return showToast("Не хватает 60,000 ₽!");
state.player.cash -= 60000;
car.tuning.bodykit = true;
car.tuning.risk1251 += 15;
}
updateTuningRiskUI(car);
saveState();
renderGarage();
showToast("Тюнинг установлен!");
}
function unimpoundCar(idx) {
const car = state.garage[idx];
if (!car) return;
if (!car.impounded) return;
let daysAtLot = 1;
if (car.impoundedDays) daysAtLot = car.impoundedDays;
let baseDailyRate = 3500;
if (car.type === 'premium') baseDailyRate = 12000;
else if (car.type === 'comfort') baseDailyRate = 6000;
let fine = 30000;
if (car.impoundFine) fine = car.impoundFine;
const totalParkingDebt = fine + (daysAtLot * baseDailyRate);
let stoLevel = 0;
if (state.businesses) {
const s = state.businesses.find(b => b.id === 'sto');
if (s) stoLevel = s.level;
}
if (stoLevel >= 3 && Math.random() < 0.35) {
car.impounded = false;
car.impoundedDays = 0;
saveState();
renderGarage();
return showToast("🔧 Дядя Ваня с СТО вытащил машину со стоянки бесплатно!");
}
let conn = 0;
if (state.player && state.player.connections) conn = state.player.connections;
if (conn >= 2) {
state.player.connections -= 2;
car.impounded = false;
car.impoundedDays = 0;
saveState();
renderGarage();
return showToast("🤝 Машина забрана со штрафстоянки за 2 Связи!");
}
let cash = 0;
if (state.player && state.player.cash) cash = state.player.cash;
if (cash < totalParkingDebt) {
return showToast("Не хватает денег! Долг за стоянку: " + totalParkingDebt.toLocaleString() + " ₽");
}
state.player.cash -= totalParkingDebt;
car.impounded = false;
car.impoundedDays = 0;
saveState();
renderGarage();
showToast("Штрафстоянка оплачена (-" + totalParkingDebt.toLocaleString() + " ₽)");
}
function openPutOnLotModal(idx) {
carToLotIndex = idx;
const car = state.garage[idx];
if (!car) return;
let cost = 100000;
if (car.purchaseCost) cost = car.purchaseCost;
else if (car.basePrice) cost = car.basePrice;
else if (car.price) cost = car.price;
let mVal = 100000;
if (car.marketValue) mVal = car.marketValue;
else if (car.price) mVal = car.price;
let cName = "Авто";
if (car.name) cName = car.name;
setTxt("lotPutCarTitle", cName + " (Оценка: " + mVal.toLocaleString() + " ₽)");
setTxt("lotCostInfo", "Начальная себестоимость: " + cost.toLocaleString() + " ₽");
const input = document.getElementById("lotAskingPriceInput");
if (input) input.value = mVal;
const modal = document.getElementById("modalPutOnLot");
if (modal) modal.classList.add('active');
}
function confirmPutOnLot() {
if (carToLotIndex === null) return;
const car = state.garage[carToLotIndex];
if (!car) return;
const input = document.getElementById("lotAskingPriceInput");
let askingPrice = 0;
if (input && input.value) askingPrice = parseInt(input.value);
if (isNaN(askingPrice) || askingPrice <= 0) return showToast("Введите корректную сумму продажи!");
closeModal("modalPutOnLot");
state.garage.splice(carToLotIndex, 1);
if (!state.salesLot) state.salesLot = [];
state.salesLot.push({
id: "lot_" + Date.now(),
car: car,
askingPrice: askingPrice,
timer: 30,
currentBuyer: null
});
saveState();
renderGarage();
if (typeof renderSalesLot === 'function') renderSalesLot();
tgHaptic('success');
let cName = "Авто";
if (car.name) cName = car.name;
showToast("🚗 " + cName + " выставлен на площадку!");
setTimeout(() => { if (typeof switchTab === 'function') switchTab("tabSalesLot"); }, 300);
}
function checkBarterEvent() {
if (typeof CAR_DATABASE === 'undefined') return;
if (!state.garage) return;
if (state.garage.length === 0) return;
if (Math.random() > 0.08) return;
const myCarIdx = Math.floor(Math.random() * state.garage.length);
const myCar = state.garage[myCarIdx];
if (!myCar) return;
if (myCar.impounded) return;
let currentClass = 'economy';
if (myCar.type) currentClass = myCar.type;
let pool = CAR_DATABASE.economy;
if (CAR_DATABASE[currentClass]) pool = CAR_DATABASE[currentClass];
if (!pool) return;
if (pool.length === 0) return;
let myCarPrice = 100000;
if (myCar.basePrice) myCarPrice = myCar.basePrice;
else if (myCar.price) myCarPrice = myCar.price;
const candidates = pool.filter(c => c && c.name !== myCar.name && c.basePrice >= myCarPrice * 0.8 && c.basePrice <= myCarPrice * 1.3);
let npcTemplate = pool[0];
if (candidates.length > 0) {
npcTemplate = candidates[Math.floor(Math.random() * candidates.length)];
}
if (!npcTemplate) return;
let plate = "В777ВВ 77";
if (typeof generateNormalPlate === 'function') plate = generateNormalPlate();
let nName = "Автомобиль";
if (npcTemplate.name) nName = npcTemplate.name;
let nType = 'economy';
if (npcTemplate.type) nType = npcTemplate.type;
let nPower = 100;
if (npcTemplate.power) nPower = npcTemplate.power;
let nBaseP = 100000;
if (npcTemplate.basePrice) nBaseP = npcTemplate.basePrice;
let nImg = "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
if (npcTemplate.img) nImg = npcTemplate.img;
pendingBarterCar = {
myCarIdx: myCarIdx,
myCar: myCar,
npcCar: {
id: "barter_" + Date.now(),
name: nName,
type: nType,
power: nPower,
basePrice: nBaseP,
price: nBaseP,
baseMarketValue: nBaseP,
marketValue: nBaseP,
img: nImg,
plate: plate,
customPlate: plate,
condition: 85,
wear: { engine: 85, transmission: 85 },
tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }
}
};
let mName = "Авто";
if (myCar.name) mName = myCar.name;
let mVal = 0;
if (myCar.marketValue) mVal = myCar.marketValue;
else if (myCar.price) mVal = myCar.price;
setTxt("barterMyCarName", mName);
setTxt("barterMyCarVal", mVal.toLocaleString() + " ₽");
let npcVal = 0;
if (pendingBarterCar.npcCar.marketValue) npcVal = pendingBarterCar.npcCar.marketValue;
setTxt("barterNpcCarName", pendingBarterCar.npcCar.name);
setTxt("barterNpcCarVal", npcVal.toLocaleString() + " ₽");
const modal = document.getElementById("modalBarterDeal");
if (modal) modal.classList.add('active');
}
function confirmBarterExchange() {
if (!pendingBarterCar) return;
const myCarIdx = pendingBarterCar.myCarIdx;
const npcCar = pendingBarterCar.npcCar;
state.garage.splice(myCarIdx, 1);
state.garage.push(npcCar);
pendingBarterCar = null;
closeModal("modalBarterDeal");
saveState();
renderGarage();
tgHaptic('success');
playSound('win');
showToast("Ключ в ключ! Вы обменяли авто на «" + npcCar.name + "»!");
}
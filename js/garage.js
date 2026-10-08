// ===================== Вкладка: ГАРАЖ (js/garage.js) =====================
let selectedCarIndex = null;
let activePreSaleCarIndex = null;
let carToLotIndex = null;
let obdActiveCarIdx = null;
let pendingBarterCar = null;
function calculatePlateValue(plateStr) {
if (!plateStr || String(plateStr).startsWith('ТРАНЗИТ')) return 0;
const parts = String(plateStr).split(' ');
if (parts.length < 2) return 0;
const main = parts[0];
const reg = parts[1];
const num = main.replace(/[^0-9]/g, '');
const letters = main.replace(/[^А-Яа-я]/g, '');
let value = 1500;
if (num === '777' || num === '007' || num === '001') {
value += 850000;
} else if (num.length === 3 && num[0] === num[1] && num[1] === num[2]) {
value += 380000;
} else if (num.startsWith('00')) {
value += 120000;
} else if (num.endsWith('00')) {
value += 65000;
} else if (num.length === 3 && num[0] === num[2]) {
value += 15000;
}
if (letters.length === 3 && letters[0] === letters[1] && letters[1] === letters[2]) {
value += 450000;
}
if (letters === 'АМР' || letters === 'ЕКХ') {
value += 1500000;
}
if (letters === 'СКР' || letters === 'САС' || letters === 'ВОР' || letters === 'МММ') {
value += 700000;
}
if (reg === '77' || reg === '99' || reg === '97' || reg === '777') {
value = Math.round(value * 1.3);
}
if (value <= 2000) {
return Math.floor(Math.random() * 1000) + 500;
}
return value;
}
function renderGarage() {
const list = document.getElementById('garageList');
if (!list) return;
const totalSlots = getTotalGarageSlots();
const currentCount = (state.garage && state.garage.length) ? state.garage.length : 0;
setTxt('garageDetailedSlots', currentCount + " из " + totalSlots + " боксов занято");
const mainContent = document.querySelector('.main-content');
const scrollPos = mainContent ? mainContent.scrollTop : 0;
if (!state.garage || state.garage.length === 0) {
list.innerHTML = "<div class='glass-card text-center sub-label py-8'>
<i class='fa-solid fa-warehouse color-cyan mb-2' style='font-size:32px;'>
</i>
<div>Гараж пуст. Подберите технику на авторынке или P2P!</div>
</div>";
return;
}
let htmlContent = "";
state.garage.forEach((car, idx) => {
if (!car) return;
const cost = car.purchaseCost || car.basePrice || car.price || 100000;
const carImg = car.img || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
const carType = car.type ? car.type.toUpperCase() : "ECONOMY";
const carPlate = car.customPlate || car.plate || "ТРАНЗИТ";
const carPower = car.power || 100;
let carMileageStr = "85 000";
if (typeof car.mileage === 'number') carMileageStr = car.mileage.toLocaleString();
const carCondition = typeof car.condition === 'number' ? car.condition : 85;
const plateVal = calculatePlateValue(carPlate);
const baseVal = car.baseMarketValue || car.price || 150000;
const marketVal = baseVal + plateVal;
car.marketValue = marketVal;
let defectBlock = "";
if (car.hiddenDefect) {
const defectText = car.hasAdditive ? "Присадка залита (Стук заглушен)" : (car.hiddenDefect.text || "Неисправность узлов");
const dCost = car.hiddenDefect.cost || 10000;
defectBlock =
"<div class='legal-warning mb-2'>" +
"<span>⚠ <b>" + defectText + "</b>
</span>" +
"<button onclick='repairCarDefect(" + idx + ")' class='btn btn-amber btn-auto btn-sm'>Капиталка (" + dCost.toLocaleString() + " ₽)</button>" +
"</div>";
}
let impoundedBlock = "";
if (car.impounded) {
const daysAtLot = car.impoundedDays || 1;
let baseDailyRate = 3500;
if (car.type === 'premium') baseDailyRate = 12000;
else if (car.type === 'comfort') baseDailyRate = 6000;
const totalParkingDebt = (car.impoundFine || 30000) + (daysAtLot * baseDailyRate);
impoundedBlock =
"<div class='impound-debt-badge'>" +
"<div>" +
"<div>🚨 <b>ШТРАФСТОЯНКА (Простой: " + daysAtLot + " дн.)</b>
</div>" +
"<div class='sub-label color-red'>Спецстоянка + эвакуатор: <b>" + totalParkingDebt.toLocaleString() + " ₽</b>
</div>" +
"</div>" +
"<button onclick='unimpoundCar(" + idx + ")' class='btn btn-cyan btn-auto btn-sm'>Вызволить</button>" +
"</div>";
}
const preSaleDisabled = car.impounded ? "disabled" : "";
const lotDisabled = car.impounded ? "disabled" : "";
const dangerClass = (car.hiddenDefect && !car.hasAdditive) ? "card-danger" : "";
const bonusPlateBlock = plateVal > 5000 ? "<div class='text-xs color-cyan font-bold'>+" + plateVal.toLocaleString() + " ₽ за номер</div>" : "";
const carName = car.name || "Автомобиль";
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
"<div class='sub-label'>" + carPower + " л.с. | Пробег: " + carMileageStr + " км | Сост: " + carCondition + "%</div>" +
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
"<button onclick='openPreviewModal(" + idx + ")' class='btn btn-dark'>🔍 Осмотр & Звук</button>" +
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
const cash = state.player?.cash || 0;
if (cash < cost) return showToast("Нужно " + cost.toLocaleString() + " ₽ на расширение!");
state.player.cash -= cost;
state.player.baseSlots = (state.player.baseSlots || 2) + 1;
saveState();
renderGarage();
showToast("Гараж расширен! Добавлен +1 бокс.");
}
function scrapCar(idx) {
const car = state.garage[idx];
if (!car) return;
const baseVal = car.baseMarketValue || car.price || 100000;
const scrapPrice = Math.round(baseVal * 0.65);
state.player.cash += scrapPrice;
let mood = state.player.mood || 85;
state.player.mood = Math.max(0, mood - 10);
if (!state.player.stats) state.player.stats = {};
state.player.stats.sold = (state.player.stats.sold || 0) + 1;
state.garage.splice(idx, 1);
saveState();
renderGarage();
showToast("Авто сдано на разбор за " + scrapPrice.toLocaleString() + " ₽");
}
function openPreviewModal(idx) {
selectedCarIndex = idx;
const car = state.garage[idx];
if (!car) return;
const plateVal = calculatePlateValue(car.customPlate || car.plate);
const baseVal = car.baseMarketValue || car.price || 150000;
const totalVal = baseVal + plateVal;
const imgEl = document.getElementById("prevImg");
if (imgEl) imgEl.src = car.img || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
setTxt("prevTypeBadge", (car.type || "car").toUpperCase());
const plateEl = document.getElementById("prevPlate");
if (plateEl) {
const pStr = car.customPlate || car.plate || "ТРАНЗИТ";
plateEl.innerHTML = pStr + " <div class='license-flag'>RUS</div>";
}
setTxt("prevTitle", car.name || "Автомобиль");
const power = car.power || 100;
const cond = car.condition !== undefined ? car.condition : 85;
setTxt("prevSpecs", power + " л.с. | Разгон: ~6.2с | Состояние: " + cond + "%");
const pCost = car.purchaseCost || car.basePrice || 0;
setTxt("prevCostDetails", "Себестоимость выкупа: " + pCost.toLocaleString() + " ₽");
setTxt("prevPrice", totalVal.toLocaleString() + " ₽");
const obdBtn = document.getElementById("btnPreviewObdScan");
if (obdBtn) {
let hasScanner = false;
if (state.player && state.player.tools && state.player.tools.obd) {
hasScanner = true;
}
obdBtn.innerText = hasScanner ? "OBD2 Сканер" : "🔒 Нужен OBD2";
obdBtn.className = hasScanner ? "btn btn-cyan" : "btn btn-dark opacity-50";
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
return showToast("Мастера на перерыве! Предпродажка откроется через " + mins + " мин.");
}
activePreSaleCarIndex = idx;
const car = state.garage[idx];
if (!car) return;
const mVal = car.marketValue || 0;
setTxt("preSaleCarTitle", (car.name || "Авто") + " (Оценка: " + mVal.toLocaleString() + " ₽)");
let washLevel = 0;
let stoLevel = 0;
if (state.businesses) {
const w = state.businesses.find(b => b.id === 'wash');
if (w) washLevel = w.level;
const s = state.businesses.find(b => b.id === 'sto');
if (s) stoLevel = s.level;
}
const cleanCost = (washLevel >= 3) ? 0 : (washLevel > 0 ? 2000 : 4000);
const paintCost = (stoLevel > 0) ? 6000 : 12000;
const btnClean = document.getElementById("btnCleanPrice");
const btnPaint = document.getElementById("btnPaintPrice");
const btnAdditive = document.getElementById("btnAdditivePrice");
const btnOdometer = document.getElementById("btnOdometerPrice");
if (btnClean) {
btnClean.innerText = car.isPolished ? "Готово ✓" : cleanCost.toLocaleString() + " ₽";
btnClean.disabled = !!car.isPolished;
btnClean.className = car.isPolished ? "btn btn-dark btn-sm opacity-50" : "btn btn-cyan btn-sm";
}
if (btnPaint) {
btnPaint.innerText = car.isRepainted ? "Готово ✓" : paintCost.toLocaleString() + " ₽";
btnPaint.disabled = !!car.isRepainted;
btnPaint.className = car.isRepainted ? "btn btn-dark btn-sm opacity-50" : "btn btn-dark btn-sm";
}
if (btnAdditive) {
btnAdditive.innerText = car.hasAdditive ? "Готово ✓" : "6,000 ₽";
btnAdditive.disabled = !!car.hasAdditive;
btnAdditive.className = car.hasAdditive ? "btn btn-dark btn-sm opacity-50" : "btn btn-amber btn-sm";
}
if (btnOdometer) {
btnOdometer.innerText = car.rolledOdometer ? "Скручен ✓" : "8,000 ₽";
btnOdometer.disabled = !!car.rolledOdometer;
btnOdometer.className = car.rolledOdometer ? "btn btn-dark btn-sm opacity-50" : "btn btn-danger btn-sm";
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
const cleanCost = (washLevel >= 3) ? 0 : (washLevel > 0 ? 2000 : 4000);
const paintCost = (stoLevel > 0) ? 6000 : 12000;
const cash = state.player?.cash || 0;
if (type === 'clean') {
if (car.isPolished) return showToast("Уже отполировано!");
if (cash < cleanCost) return showToast("Не хватает денег!");
state.player.cash -= cleanCost;
car.isPolished = true;
car.baseMarketValue = Math.round((car.baseMarketValue || car.price || 100000) * 1.05);
car.marketValue = car.baseMarketValue + calculatePlateValue(car.customPlate || car.plate);
showToast("✨ Фары сияют, салон как новый! +5% к цене.");
}
else if (type === 'paint') {
if (car.isRepainted) return showToast("Уже окрашено!");
if (cash < paintCost) return showToast("Не хватает денег!");
state.player.cash -= paintCost;
const cCond = car.condition !== undefined ? car.condition : 85;
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
const m = typeof car.mileage === 'number' ? car.mileage : 85000;
car.mileage = Math.round(m / 2);
car.baseMarketValue = Math.round((car.baseMarketValue || car.price || 100000) * 1.15);
car.marketValue = car.baseMarketValue + calculatePlateValue(car.customPlate || car.plate);
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
const cash = state.player?.cash || 0;
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
const cName = car.name || "Авто";
setTxt("obd2CarTitle", "Диагностика: " + cName);
const resBox = document.getElementById("obd2ResultBox");
const actBox = document.getElementById("obd2ActionBox");
if (resBox) resBox.innerHTML = "Подключение по протоколу CAN / ISO 14230...<br>";
if (actBox) actBox.innerHTML = "";
const modal = document.getElementById("modalOBD2");
if (modal) modal.classList.add('active');
setTimeout(() => {
const engWear = car.wear ? Math.round(car.wear.engine) : 100;
const transWear = car.wear ? Math.round(car.wear.transmission) : 100;
let issuesHtml = "<b>Отчет об узлах:</b>
<br>Двигатель: " + engWear + "% ресурса<br>Трансмиссия: " + transWear + "% ресурса<br>";
  if (car.hiddenDefect) {
  const dText = car.hiddenDefect.text || "Неизвестная ошибка";
  const dCost = car.hiddenDefect.cost || 10000;
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
    if (!car || !car.hiddenDefect) return;
    const cost = car.hiddenDefect.cost || 10000;
    const cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Недостаточно денег на ремонт!");
    state.player.cash -= cost;
    car.hiddenDefect = null;
    if (!car.wear) car.wear = { engine: 90, transmission: 90 };
    car.wear.engine = Math.max(90, car.wear.engine + 30);
    car.wear.transmission = Math.max(90, car.wear.transmission + 30);
    car.baseMarketValue = Math.round((car.baseMarketValue || car.price || 100000) * 1.08);
    car.marketValue = car.baseMarketValue + calculatePlateValue(car.customPlate || car.plate);
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
    const extraClass = pVal > 5000 ? "<div class='text-xs color-green mt-1'>+" + pVal.toLocaleString() + " ₽ к цене</div>" : "";
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
  const oldPlate = car.customPlate || car.plate;
  if (oldPlate && String(oldPlate).startsWith('ТРАНЗИТ')) {
  return showToast("На машине уже установлены транзиты!");
  }
  const cash = state.player?.cash || 0;
  if (cash < 2000) return showToast("Нужно 2,000 ₽ на снятие!");
  state.player.cash -= 2000;
  if (oldPlate) {
  if (!state.ownedPlates) state.ownedPlates = [];
  state.ownedPlates.push(oldPlate);
  }
  const transitNum = Math.floor(Math.random() * 9000) + 1000;
  car.customPlate = "ТРАНЗИТ " + transitNum;
  car.marketValue = car.baseMarketValue || car.price || 100000;
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
  const cash = state.player?.cash || 0;
  if (cash < 2000) return showToast("Нужно 2,000 ₽ на установку!");
  state.player.cash -= 2000;
  car.customPlate = plate;
  state.ownedPlates.splice(plateIdx, 1);
  const plateVal = calculatePlateValue(plate);
  car.marketValue = (car.baseMarketValue || car.price || 100000) + plateVal;
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
  const cName = car.name || "Авто";
  const cPower = car.power || 100;
  setTxt("tuneCarTitle", cName + " (" + cPower + " л.с.)");
  updateTuningRiskUI(car);
  const c = document.getElementById("tuningItemsContainer");
  if (c) {
  const lvl = state.player?.level || 1;
  const btn1 = lvl < 5 ? "С 5 УР" : "50,000 ₽";
  const btn2 = lvl < 10 ? "С 10 УР" : "35,000 ₽";
  const btn3 = lvl < 15 ? "С 15 УР" : "45,000 ₽";
  const btn4 = lvl < 20 ? "С 20 УР" : "60,000 ₽";
  const dis1 = lvl < 5 ? "disabled" : "";
  const dis2 = lvl < 10 ? "disabled" : "";
  const dis3 = lvl < 15 ? "disabled" : "";
  const dis4 = lvl < 20 ? "disabled" : "";
  c.innerHTML =
  "<div class='glass-card flex-between p-2 mb-2'>" +
  "<div>
  <div class='font-bold text-xs'>Чип-Тюнинг Stage</div>
  <div class='sub-label'>+30 л.с. | Лимит: Stage 3</div>
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
const lvl = state.player?.level || 1;
const cash = state.player?.cash || 0;
if (type === 'chip') {
if (lvl < 5) return showToast("Требуется 5 уровень!");
if (car.tuning.chip >= 3) return showToast("Уже установлен Stage 3!");
if (cash < 50000) return showToast("Не хватает 50,000 ₽!");
state.player.cash -= 50000;
car.tuning.chip += 1;
car.power = (car.power || 100) + 30;
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
if (!car || !car.impounded) return;
const daysAtLot = car.impoundedDays || 1;
let baseDailyRate = 3500;
if (car.type === 'premium') baseDailyRate = 12000;
else if (car.type === 'comfort') baseDailyRate = 6000;
const totalParkingDebt = (car.impoundFine || 30000) + (daysAtLot * baseDailyRate);
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
const conn = state.player?.connections || 0;
if (conn >= 2) {
state.player.connections -= 2;
car.impounded = false;
car.impoundedDays = 0;
saveState();
renderGarage();
return showToast("🤝 Машина забрана со штрафстоянки за 2 Связи!");
}
const cash = state.player?.cash || 0;
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
const cost = car.purchaseCost || car.basePrice || car.price || 100000;
const mVal = car.marketValue || car.price || 100000;
const cName = car.name || "Авто";
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
if (input) askingPrice = parseInt(input.value);
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
renderSalesLot();
tgHaptic('success');
const cName = car.name || "Авто";
showToast("🚗 " + cName + " выставлен на площадку!");
setTimeout(() => switchTab("tabSalesLot"), 300);
}
function checkBarterEvent() {
if (typeof CAR_DATABASE === 'undefined') return;
if (!state.garage || state.garage.length === 0) return;
if (Math.random() > 0.08) return;
const myCarIdx = Math.floor(Math.random() * state.garage.length);
const myCar = state.garage[myCarIdx];
if (!myCar || myCar.impounded) return;
const currentClass = myCar.type || 'economy';
const pool = CAR_DATABASE[currentClass] || CAR_DATABASE.economy;
if (!pool || pool.length === 0) return;
const myCarPrice = myCar.basePrice || myCar.price || 100000;
const candidates = pool.filter(c => c && c.name !== myCar.name && c.basePrice >= myCarPrice * 0.8 && c.basePrice <= myCarPrice * 1.3);
const npcTemplate = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : pool[0];
if (!npcTemplate) return;
let plate = "В777ВВ 77";
if (typeof generateNormalPlate === 'function') plate = generateNormalPlate();
pendingBarterCar = {
myCarIdx: myCarIdx,
myCar: myCar,
npcCar: {
id: "barter_" + Date.now(),
name: npcTemplate.name || "Автомобиль",
type: npcTemplate.type || 'economy',
power: npcTemplate.power || 100,
basePrice: npcTemplate.basePrice || 100000,
price: npcTemplate.basePrice || 100000,
baseMarketValue: npcTemplate.basePrice || 100000,
marketValue: npcTemplate.basePrice || 100000,
img: npcTemplate.img || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80",
plate: plate,
customPlate: plate,
condition: 85,
wear: { engine: 85, transmission: 85 },
tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }
}
};
const myName = myCar.name || "Авто";
const myVal = myCar.marketValue || myCar.price || 0;
setTxt("barterMyCarName", myName);
setTxt("barterMyCarVal", myVal.toLocaleString() + " ₽");
const npcName = pendingBarterCar.npcCar.name;
const npcVal = pendingBarterCar.npcCar.marketValue || 0;
setTxt("barterNpcCarName", npcName);
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
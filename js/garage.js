// ===================== Вкладка: ГАРАЖ (js/garage.js) =====================
let selectedCarIndex = null;
let activePreSaleCarIndex = null;
let carToLotIndex = null;
let obdActiveCarIdx = null;
let pendingBarterCar = null;
// --- РАСЧЁТ ЦЕННОСТИ ГОСНОМЕРА (СТРОГО ДИФФЕРЕНЦИРОВАННЫЙ) ---
function calculatePlateValue(plateStr) {
if (!plateStr || plateStr.startsWith('ТРАНЗИТ')) return 0;
const parts = plateStr.split(' ');
if (parts.length < 2) return 0;
const main = parts[0];
const reg = parts[1];
const num = main.replace(/[^0-9]/g, '');
const letters = main.replace(/[^А-Яа-я]/g, '');
// Обычный номер не стоит почти ничего
let value = 1500;
// 1. Цифровые комбинации
if (['777', '007', '001'].includes(num)) {
value += 850000;
} else if (num.length === 3 && num[0] === num[1] && num[1] === num[2]) {
value += 380000; // 111, 222, 333, etc.
} else if (num.startsWith('00')) {
value += 120000; // 002-009
} else if (num.endsWith('00')) {
value += 65000;  // 100-900
} else if (num[0] === num[2]) {
value += 15000;  // зеркалка (121, 585)
}
// 2. Буквенные комбинации
if (letters.length === 3 && letters[0] === letters[1] && letters[1] === letters[2]) {
value += 450000; // ААА, ВВВ, ХХХ
}
if (['АМР', 'ЕКХ'].includes(letters)) {
value += 1500000; // правительственные / спецслужбы
}
if (['СКР', 'САС', 'ВОР', 'МММ'].includes(letters)) {
value += 700000;
}
// 3. Блатные московские регионы
if (['77', '99', '97', '777'].includes(reg)) {
value = Math.round(value * 1.3);
}
// Если нет ни красивых цифр, ни букв — бонус минимальный
if (value <= 2000) {
return Math.floor(Math.random() * 1000) + 500;
}
return value;
}
function renderGarage() {
const list = document.getElementById('garageList');
if (!list) return;
const totalSlots = getTotalGarageSlots();
setTxt('garageDetailedSlots', `${state.garage.length} из ${totalSlots} боксов занято`);
const mainContent = document.querySelector('.main-content');
const scrollPos = mainContent ? mainContent.scrollTop : 0;
if (state.garage.length === 0) {
list.innerHTML = '<div class="glass-card text-center sub-label py-8">
<i class="fa-solid fa-warehouse color-cyan mb-2" style="font-size:32px;">
</i>
<div>Гараж пуст. Подберите технику на авторынке или P2P!</div>
</div>';
return;
}
list.innerHTML = state.garage.map((car, idx) => {
const cost = car.purchaseCost || car.basePrice || 100000;
const carImg = car.img || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80';
const carType = (car.type || 'economy').toUpperCase();
const carPlate = car.customPlate || car.plate || 'ТРАНЗИТ';
const carPower = car.power || 100;
const carMileage = (car.mileage || 85000).toLocaleString();
const carCondition = car.condition || 85;
// Гарантированный пересчёт с учётом крутизны номера
const plateVal = calculatePlateValue(carPlate);
const marketVal = (car.baseMarketValue || car.price || 150000) + plateVal;
car.marketValue = marketVal;
let defectBlock = '';
if (car.hiddenDefect) {
const defectText = car.hasAdditive ? 'Присадка залита (Стук заглушен)' : car.hiddenDefect.text;
const defectCost = car.hiddenDefect.cost.toLocaleString();
defectBlock = `
<div class="legal-warning mb-2">
  <span>⚠ <b>${defectText}</b>
</span>
<button onclick="repairCarDefect(${idx})" class="btn btn-amber btn-auto btn-sm">Капиталка (${defectCost} ₽)</button>
</div>`;
}
let impoundedBlock = '';
if (car.impounded) {
const daysAtLot = car.impoundedDays || 1;
const baseDailyRate = car.type === 'premium' ? 12000 : (car.type === 'comfort' ? 6000 : 3500);
const totalParkingDebt = (car.impoundFine || 30000) + (daysAtLot * baseDailyRate);
impoundedBlock = `
<div class="impound-debt-badge">
  <div>
    <div>🚨 <b>ШТРАФСТОЯНКА (Простой: ${daysAtLot} дн.)</b>
  </div>
  <div class="sub-label color-red">Спецстоянка + эвакуатор: <b>${totalParkingDebt.toLocaleString()} ₽</b>
</div>
</div>
<button onclick="unimpoundCar(${idx})" class="btn btn-cyan btn-auto btn-sm">Вызволить</button>
</div>`;
}
const preSaleDisabled = car.impounded ? 'disabled' : '';
const lotDisabled = car.impounded ? 'disabled' : '';
return `
<div class="glass-card mb-3 ${car.hiddenDefect && !car.hasAdditive ? 'card-danger' : ''}">
  <div class="car-img-wrap" style="height: 140px;">
    <img src="${carImg}" class="car-img" onerror="this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'">
      <div class="badge-tag" style="bottom: 8px; right: 8px;">${carType}</div>
      <div class="plate-corner">
        <div class="license-plate">${carPlate} <div class="license-flag">RUS</div>
      </div>
    </div>
  </div>
  <div class="flex-between mb-2">
    <div>
      <h4 class="font-bold">${car.name}</h4>
      <div class="sub-label">${carPower} л.с. | Пробег: ${carMileage} км | Сост: ${carCondition}%</div>
      <div class="text-xs color-amber mt-1">Куплена за: <b>${cost.toLocaleString()} ₽</b>
    </div>
  </div>
  <div class="text-right">
    <div class="sub-label">Оценка:</div>
    <div class="price-val">${marketVal.toLocaleString()} ₽</div>
    ${plateVal > 5000 ? `<div class="text-xs color-cyan font-bold">+${plateVal.toLocaleString()} ₽ за номер</div>` : ''}
  </div>
</div>
${defectBlock}
${impoundedBlock}
<div class="grid-2 mb-2">
  <button onclick="openPreviewModal(${idx})" class="btn btn-dark">🔍 Осмотр & Звук</button>
  <button onclick="openPreSaleModal(${idx})" class="btn btn-dark" ${preSaleDisabled}>🪄 Предпродажка</button>
</div>
<div class="grid-2 mb-2">
  <button onclick="openTuningModal(${idx})" class="btn btn-dark" ${preSaleDisabled}>🛠 Тюнинг</button>
  <button onclick="openPutOnLotModal(${idx})" class="btn btn-green" ${lotDisabled}>🏪 На площадку</button>
</div>
<button onclick="scrapCar(${idx})" class="btn btn-dark btn-sm w-full">Сдать на разборку (-35% стоимости)</button>
</div>`;
}).join('');
if (mainContent) {
requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
}
}
function buyGarageSlot() {
const cost = getGarageSlotCost();
if (state.player.cash < cost) return showToast(`Нужно ${cost.toLocaleString()} ₽ на расширение!`);
state.player.cash -= cost;
state.player.baseSlots = (state.player.baseSlots || 1) + 1;
saveState();
renderGarage();
showToast(`Гараж расширен! Добавлен +1 бокс.`);
}
function scrapCar(idx) {
const car = state.garage[idx];
const scrapPrice = Math.round((car.baseMarketValue || car.price || 100000) * 0.65);
state.player.cash += scrapPrice;
state.player.mood = Math.max(0, state.player.mood - 10);
state.player.stats.sold += 1;
state.garage.splice(idx, 1);
saveState();
renderGarage();
showToast(`Авто сдано на разбор за ${scrapPrice.toLocaleString()} ₽`);
}
function openPreviewModal(idx) {
selectedCarIndex = idx;
const car = state.garage[idx];
const plateVal = calculatePlateValue(car.customPlate || car.plate);
const totalVal = (car.baseMarketValue || car.price || 150000) + plateVal;
document.getElementById('prevImg').src = car.img || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
setTxt('prevTypeBadge', (car.type || 'car').toUpperCase());
document.getElementById('prevPlate').innerHTML = `${car.customPlate || car.plate} <div class="license-flag">RUS</div>`;
setTxt('prevTitle', car.name);
setTxt('prevSpecs', `${car.power || 100} л.с. | Разгон: ~6.2с | Состояние: ${car.condition || 85}%`);
setTxt('prevCostDetails', `Себестоимость выкупа: ${(car.purchaseCost || car.basePrice || 0).toLocaleString()} ₽`);
setTxt('prevPrice', `${totalVal.toLocaleString()} ₽`);
// Блокировка OBD сканера, если инструмент не куплен
const obdBtn = document.getElementById('btnPreviewObdScan');
if (obdBtn) {
const hasScanner = !!(state.player.tools && state.player.tools.obd);
obdBtn.innerText = hasScanner ? "OBD2 Сканер" : "🔒 Нужен OBD2";
obdBtn.className = hasScanner ? "btn btn-cyan" : "btn btn-dark opacity-50";
}
document.getElementById('modalPreview')?.classList.add('active');
}
function openTuningFromPreview() {
if (selectedCarIndex === null) return;
closeModal('modalPreview');
openTuningModal(selectedCarIndex);
}
function openPreSaleModal(idx) {
const now = Date.now();
if (state.player.preSaleCooldownUntil && state.player.preSaleCooldownUntil > now) {
const mins = Math.ceil((state.player.preSaleCooldownUntil - now) / 60000);
return showToast(`Мастера на перерыве! Предпродажка откроется через ${mins} мин.`);
}
activePreSaleCarIndex = idx;
const car = state.garage[idx];
setTxt('preSaleCarTitle', `${car.name} (Оценка: ${(car.marketValue || 0).toLocaleString()} ₽)`);
const wash = state.businesses ? state.businesses.find(b => b.id === 'wash') : null;
const sto = state.businesses ? state.businesses.find(b => b.id === 'sto') : null;
const cleanCost = (wash && wash.level >= 3) ? 0 : (wash && wash.level > 0 ? 2000 : 4000);
const paintCost = (sto && sto.level > 0) ? 6000 : 12000;
const btnClean = document.getElementById('btnCleanPrice');
const btnPaint = document.getElementById('btnPaintPrice');
const btnAdditive = document.getElementById('btnAdditivePrice');
const btnOdometer = document.getElementById('btnOdometerPrice');
if (btnClean) {
btnClean.innerText = car.isPolished ? 'Готово ✓' : `${cleanCost.toLocaleString()} ₽`;
btnClean.disabled = !!car.isPolished;
btnClean.className = car.isPolished ? 'btn btn-dark btn-sm opacity-50' : 'btn btn-cyan btn-sm';
}
if (btnPaint) {
btnPaint.innerText = car.isRepainted ? 'Готово ✓' : `${paintCost.toLocaleString()} ₽`;
btnPaint.disabled = !!car.isRepainted;
btnPaint.className = car.isRepainted ? 'btn btn-dark btn-sm opacity-50' : 'btn btn-dark btn-sm';
}
if (btnAdditive) {
btnAdditive.innerText = car.hasAdditive ? 'Готово ✓' : '6,000 ₽';
btnAdditive.disabled = !!car.hasAdditive;
btnAdditive.className = car.hasAdditive ? 'btn btn-dark btn-sm opacity-50' : 'btn btn-amber btn-sm';
}
if (btnOdometer) {
btnOdometer.innerText = car.rolledOdometer ? 'Скручен ✓' : '8,000 ₽';
btnOdometer.disabled = !!car.rolledOdometer;
btnOdometer.className = car.rolledOdometer ? 'btn btn-dark btn-sm opacity-50' : 'btn btn-danger btn-sm';
}
document.getElementById('modalPreSale')?.classList.add('active');
}
function applyPreSaleMod(type) {
if (activePreSaleCarIndex === null) return;
const car = state.garage[activePreSaleCarIndex];
const wash = state.businesses ? state.businesses.find(b => b.id === 'wash') : null;
const sto = state.businesses ? state.businesses.find(b => b.id === 'sto') : null;
const cleanCost = (wash && wash.level >= 3) ? 0 : (wash && wash.level > 0 ? 2000 : 4000);
const paintCost = (sto && sto.level > 0) ? 6000 : 12000;
if (type === 'clean') {
if (car.isPolished) return showToast("Уже отполировано!");
if (state.player.cash < cleanCost) return showToast("Не хватает денег!");
state.player.cash -= cleanCost;
car.isPolished = true;
car.baseMarketValue = Math.round((car.baseMarketValue || car.price) * 1.05);
car.marketValue = car.baseMarketValue + calculatePlateValue(car.customPlate || car.plate);
showToast("✨ Фары сияют, салон как новый! +5% к цене.");
}
else if (type === 'paint') {
if (car.isRepainted) return showToast("Уже окрашено!");
if (state.player.cash < paintCost) return showToast("Не хватает денег!");
state.player.cash -= paintCost;
car.condition = Math.min(100, (car.condition || 85) + 20);
car.isRepainted = true;
if (!car.bodyThickness) car.bodyThickness = { hood: 110, roof: 100, doors: 110, wings: 105 };
car.bodyThickness.doors = 280;
showToast("🎨 Детали облиты! Слой краски увеличился.");
}
else if (type === 'additive') {
if (car.hasAdditive) return showToast("Присадка уже залита!");
if (state.player.cash < 6000) return showToast("Не хватает 6,000 ₽!");
state.player.cash -= 6000;
car.hasAdditive = true;
showToast("🧪 «Медовая» присадка залита! Стук гидрокомпенсаторов скрыт.");
}
else if (type === 'odometer') {
if (car.rolledOdometer) return showToast("Пробег уже скручивался!");
if (state.player.cash < 8000) return showToast("Не хватает 8,000 ₽!");
state.player.cash -= 8000;
car.mileage = Math.round((car.mileage || 85000) / 2);
car.baseMarketValue = Math.round((car.baseMarketValue || car.price) * 1.15);
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
const sto = state.businesses ? state.businesses.find(b => b.id === 'sto') : null;
let cost = car.hiddenDefect ? car.hiddenDefect.cost : 10000;
if (sto && sto.level > 0) cost = Math.round(cost * 0.6);
if (state.player.cash < cost) return showToast("Не хватает денег на капремонт!");
state.player.cash -= cost;
car.hiddenDefect = null;
car.hasAdditive = false;
car.condition = 95;
saveState();
renderGarage();
showToast("Дефект устранён!");
}
// --- ДИАГНОСТИКА СТРОГО ПРИ НАЛИЧИИ ОБОРУДОВАНИЯ ---
function openOBD2Modal() {
if (selectedCarIndex === null) return;
if (!state.player.tools || !state.player.tools.obd) {
return showToast("🔒 Требуется OBD2-сканер! Купите его в Маркете Перекупа.");
}
obdActiveCarIdx = selectedCarIndex;
const car = state.garage[selectedCarIndex];
closeModal('modalPreview');
car.stoChecked = true;
setTxt('obd2CarTitle', `Диагностика: ${car.name}`);
const resBox = document.getElementById('obd2ResultBox');
const actBox = document.getElementById('obd2ActionBox');
resBox.innerHTML = "Подключение по протоколу CAN / ISO 14230...<br>";
actBox.innerHTML = "";
document.getElementById('modalOBD2').classList.add('active');
setTimeout(() => {
const engWear = car.wear ? Math.round(car.wear.engine) : 100;
const transWear = car.wear ? Math.round(car.wear.transmission) : 100;
let issuesHtml = `<b>Отчет об узлах:</b>
<br>Двигатель: ${engWear}% ресурса<br>Трансмиссия: ${transWear}% ресурса<br>`;
  if (car.hiddenDefect) {
  issuesHtml += `<br>
  <span class="color-red">ОШИБКИ В ЭБУ:</span>
  <br>${car.hiddenDefect.text}`;
    actBox.innerHTML = `<button onclick="repairOBDErrorFromScanner()" class="btn btn-amber w-full">Устранить ошибку (${car.hiddenDefect.cost.toLocaleString()} ₽)</button>`;
    } else {
    issuesHtml += `<br>
    <span class="color-green">Ошибок (DTC) не обнаружено. Агрегаты в норме.</span>`;
    }
    resBox.innerHTML = issuesHtml;
    }, 800);
    }
    function closeOBD2Modal() {
    closeModal('modalOBD2');
    if (obdActiveCarIdx !== null) openPreviewModal(obdActiveCarIdx);
    }
    function repairOBDErrorFromScanner() {
    if (obdActiveCarIdx === null) return;
    const car = state.garage[obdActiveCarIdx];
    if (!car.hiddenDefect) return;
    if (state.player.cash < car.hiddenDefect.cost) return showToast("Недостаточно денег на ремонт!");
    state.player.cash -= car.hiddenDefect.cost;
    car.hiddenDefect = null;
    if (!car.wear) car.wear = { engine: 90, transmission: 90 };
    car.wear.engine = Math.max(90, car.wear.engine + 30);
    car.wear.transmission = Math.max(90, car.wear.transmission + 30);
    car.baseMarketValue = Math.round((car.baseMarketValue || car.price) * 1.08);
    car.marketValue = car.baseMarketValue + calculatePlateValue(car.customPlate || car.plate);
    saveState();
    closeOBD2Modal();
    renderGarage();
    showToast("Ремонт узлов выполнен успешно!");
    }
    function openChangePlateModal() {
    if (selectedCarIndex === null) return;
    const list = document.getElementById('changePlateList');
    if (!list) return;
    if (state.ownedPlates.length === 0) {
    list.innerHTML = '<div class="sub-label py-2">У вас нет номеров в коллекции! Купите в Маркете.</div>';
    } else {
    list.innerHTML = state.ownedPlates.map((p, i) => {
    const pVal = calculatePlateValue(p);
    return `
    <div class="glass-card flex-between w-full mb-1 p-2">
      <div>
        <div class="license-plate">${p} <div class="license-flag">RUS</div>
      </div>
      ${pVal > 5000 ? `<div class="text-xs color-green mt-1">+${pVal.toLocaleString()} ₽ к цене</div>` : ''}
    </div>
    <button onclick="installPlateOnCar('${p}', ${i})" class="btn btn-cyan btn-auto btn-sm">Установить</button>
  </div>`;
  }).join('');
  }
  document.getElementById('modalChangePlate')?.classList.add('active');
  }
  function removePlateFromCar() {
  if (selectedCarIndex === null) return;
  const car = state.garage[selectedCarIndex];
  const oldPlate = car.customPlate || car.plate;
  if (oldPlate && oldPlate.startsWith('ТРАНЗИТ')) return showToast("На машине уже установлены транзиты!");
  if (state.player.cash < 2000) return showToast("Нужно 2,000 ₽ на снятие!");
  state.player.cash -= 2000;
  if (oldPlate) state.ownedPlates.push(oldPlate);
  const transitNum = Math.floor(Math.random() * 9000) + 1000;
  car.customPlate = `ТРАНЗИТ ${transitNum}`;
  // Пересчёт рыночной стоимости без номера
  car.marketValue = car.baseMarketValue || car.price;
  saveState();
  closeModal('modalChangePlate');
  openPreviewModal(selectedCarIndex);
  renderGarage();
  showToast("Номер снят в инвентарь (-2,000 ₽). Выданы транзиты!");
  }
  function installPlateOnCar(plate, plateIdx) {
  if (selectedCarIndex === null) return;
  const car = state.garage[selectedCarIndex];
  if (state.player.cash < 2000) return showToast("Нужно 2,000 ₽ на установку!");
  state.player.cash -= 2000;
  car.customPlate = plate;
  state.ownedPlates.splice(plateIdx, 1);
  // Мгновенный пересчёт оценки машины с учётом установленного номера
  const plateVal = calculatePlateValue(plate);
  car.marketValue = (car.baseMarketValue || car.price) + plateVal;
  saveState();
  closeModal('modalChangePlate');
  openPreviewModal(selectedCarIndex);
  renderGarage();
  showToast(`Госномер ${plate} установлен! (+${plateVal.toLocaleString()} ₽ к оценке авто)`);
  }
  function updateTuningRiskUI(car) {
  const risk = car.tuning?.risk1251 || 0;
  setTxt('tuneRiskValue', `${risk}%`);
  const fill = document.getElementById('tuneRiskFill');
  if (fill) fill.style.width = `${Math.min(100, risk)}%`;
  }
  function openTuningModal(idx) {
  selectedCarIndex = idx;
  const car = state.garage[idx];
  if (!car.tuning) car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 };
  setTxt('tuneCarTitle', `${car.name} (${car.power || 100} л.с.)`);
  updateTuningRiskUI(car);
  const c = document.getElementById('tuningItemsContainer');
  if (c) {
  c.innerHTML = `
  <div class="glass-card flex-between p-2 mb-2">
    <div>
      <div class="font-bold text-xs">Чип-Тюнинг Stage</div>
      <div class="sub-label">+30 л.с. | Лимит: Stage 3</div>
    </div>
    <button onclick="applyTuningMod('chip')" class="btn btn-dark btn-auto btn-sm" ${state.player.level < 5 ? 'disabled' : ''}>
      ${state.player.level < 5 ? 'С 5 УР' : '50,000 ₽'}
    </button>
  </div>
  <div class="glass-card flex-between p-2 mb-2">
    <div>
      <div class="font-bold text-xs">Прямоточный Выхлоп</div>
      <div class="sub-label">+25% риск 12.5.1</div>
    </div>
    <button onclick="applyTuningMod('exhaust')" class="btn btn-dark btn-auto btn-sm" ${state.player.level < 10 ? 'disabled' : ''}>
      ${state.player.level < 10 ? 'С 10 УР' : '35,000 ₽'}
    </button>
  </div>
  <div class="glass-card flex-between p-2 mb-2">
    <div>
      <div class="font-bold text-xs">Пневмоподвеска (Стенс)</div>
      <div class="sub-label">+40 баллов на шоу</div>
    </div>
    <button onclick="applyTuningMod('stance')" class="btn btn-dark btn-auto btn-sm" ${state.player.level < 15 ? 'disabled' : ''}>
      ${state.player.level < 15 ? 'С 15 УР' : '45,000 ₽'}
    </button>
  </div>
  <div class="glass-card flex-between p-2 mb-2">
    <div>
      <div class="font-bold text-xs">Спортивный Обвес</div>
      <div class="sub-label">+15% риск 12.5.1</div>
    </div>
    <button onclick="applyTuningMod('bodykit')" class="btn btn-dark btn-auto btn-sm" ${state.player.level < 20 ? 'disabled' : ''}>
      ${state.player.level < 20 ? 'С 20 УР' : '60,000 ₽'}
    </button>
  </div>`;
  }
  document.getElementById('modalTuning')?.classList.add('active');
  }
  function applyTuningMod(type) {
  if (selectedCarIndex === null) return;
  const car = state.garage[selectedCarIndex];
  if (!car.tuning) car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 };
  if (type === 'chip') {
  if (state.player.level < 5) return showToast("Требуется 5 уровень!");
  if (car.tuning.chip >= 3) return showToast("Уже установлен Stage 3!");
  if (state.player.cash < 50000) return showToast("Не хватает 50,000 ₽!");
  state.player.cash -= 50000;
  car.tuning.chip += 1;
  car.power = (car.power || 100) + 30;
  car.tuning.risk1251 += 15;
  }
  else if (type === 'exhaust') {
  if (state.player.level < 10) return showToast("Требуется 10 уровень!");
  if (car.tuning.exhaust) return showToast("Прямоток уже стоит!");
  if (state.player.cash < 35000) return showToast("Не хватает 35,000 ₽!");
  state.player.cash -= 35000;
  car.tuning.exhaust = true;
  car.tuning.risk1251 += 25;
  }
  else if (type === 'stance') {
  if (state.player.level < 15) return showToast("Требуется 15 уровень!");
  if (car.tuning.stance) return showToast("Пневма уже настроена!");
  if (state.player.cash < 45000) return showToast("Не хватает 45,000 ₽!");
  state.player.cash -= 45000;
  car.tuning.stance = true;
  car.tuning.risk1251 += 20;
  }
  else if (type === 'bodykit') {
  if (state.player.level < 20) return showToast("Требуется 20 уровень!");
  if (car.tuning.bodykit) return showToast("Обвес уже установлен!");
  if (state.player.cash < 60000) return showToast("Не хватает 60,000 ₽!");
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
  const baseDailyRate = car.type === 'premium' ? 12000 : (car.type === 'comfort' ? 6000 : 3500);
  const totalParkingDebt = (car.impoundFine || 30000) + (daysAtLot * baseDailyRate);
  const sto = state.businesses ? state.businesses.find(b => b.id === 'sto') : null;
  if (sto && sto.level >= 3 && Math.random() < 0.35) {
  car.impounded = false;
  car.impoundedDays = 0;
  saveState();
  renderGarage();
  return showToast("🔧 Дядя Ваня с СТО вытащил машину со стоянки бесплатно!");
  }
  if (state.player.connections >= 2) {
  state.player.connections -= 2;
  car.impounded = false;
  car.impoundedDays = 0;
  saveState();
  renderGarage();
  return showToast("🤝 Машина забрана со штрафстоянки за 2 Связи!");
  }
  if (state.player.cash < totalParkingDebt) {
  return showToast(`Не хватает денег! Долг за стоянку: ${totalParkingDebt.toLocaleString()} ₽`);
  }
  state.player.cash -= totalParkingDebt;
  car.impounded = false;
  car.impoundedDays = 0;
  saveState();
  renderGarage();
  showToast(`Штрафстоянка оплачена (-${totalParkingDebt.toLocaleString()} ₽)`);
  }
  function openPutOnLotModal(idx) {
  carToLotIndex = idx;
  const car = state.garage[idx];
  const cost = car.purchaseCost || car.basePrice || 100000;
  setTxt('lotPutCarTitle', `${car.name} (Оценка: ${(car.marketValue || car.price).toLocaleString()} ₽)`);
  setTxt('lotCostInfo', `Начальная себестоимость: ${cost.toLocaleString()} ₽`);
  const input = document.getElementById('lotAskingPriceInput');
  if (input) input.value = car.marketValue || car.price;
  document.getElementById('modalPutOnLot')?.classList.add('active');
  }
  function confirmPutOnLot() {
  if (carToLotIndex === null) return;
  const car = state.garage[carToLotIndex];
  const input = document.getElementById('lotAskingPriceInput');
  let askingPrice = parseInt(input.value);
  if (isNaN(askingPrice) || askingPrice <= 0) return showToast("Введите корректную сумму продажи!");
  closeModal('modalPutOnLot');
  state.garage.splice(carToLotIndex, 1);
  state.salesLot.push({
  id: 'lot_' + Date.now(),
  car: car,
  askingPrice: askingPrice,
  timer: 30,
  currentBuyer: null
  });
  saveState();
  renderGarage();
  renderSalesLot();
  tgHaptic('success');
  showToast(`🚗 ${car.name} выставлен на площадку!`);
  setTimeout(() => switchTab('tabSalesLot'), 300);
  }
  // --- СБАЛАНСИРОВАННЫЙ БАРТЕР (ОБМЕН ПО УРОВНЮ И ЦЕНЕ) ---
  function checkBarterEvent() {
  if (typeof CAR_DATABASE === 'undefined' || state.garage.length === 0) return;
  if (Math.random() > 0.08) return; // Срабатывает редко
  const myCarIdx = Math.floor(Math.random() * state.garage.length);
  const myCar = state.garage[myCarIdx];
  if (myCar.impounded) return;
  // Пул строго по текущему классу авто игрока (а не безумный Comfort на 1 уровне)
  const currentClass = myCar.type || 'economy';
  const pool = CAR_DATABASE[currentClass] || CAR_DATABASE.economy;
  // Ищем машину с близкой ценой (от 80% до 125% от цены авто игрока)
  const myCarPrice = myCar.basePrice || myCar.price || 100000;
  const candidates = pool.filter(c => c.name !== myCar.name && c.basePrice >= myCarPrice * 0.8 && c.basePrice <= myCarPrice * 1.3);
  const npcTemplate = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : pool[0];
  pendingBarterCar = {
  myCarIdx: myCarIdx,
  myCar: myCar,
  npcCar: {
  id: 'barter_' + Date.now(),
  name: npcTemplate.name,
  type: npcTemplate.type,
  power: npcTemplate.power || 100,
  basePrice: npcTemplate.basePrice,
  price: npcTemplate.basePrice,
  baseMarketValue: npcTemplate.basePrice,
  marketValue: npcTemplate.basePrice,
  img: npcTemplate.img,
  plate: typeof generateNormalPlate === 'function' ? generateNormalPlate() : 'В777ВВ 77',
  customPlate: typeof generateNormalPlate === 'function' ? generateNormalPlate() : 'В777ВВ 77',
  condition: 85,
  wear: { engine: 85, transmission: 85 },
  tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }
  }
  };
  setTxt('barterMyCarName', myCar.name);
  setTxt('barterMyCarVal', `${(myCar.marketValue || myCar.price).toLocaleString()} ₽`);
  setTxt('barterNpcCarName', pendingBarterCar.npcCar.name);
  setTxt('barterNpcCarVal', `${pendingBarterCar.npcCar.marketValue.toLocaleString()} ₽`);
  document.getElementById('modalBarterDeal')?.classList.add('active');
  }
  function confirmBarterExchange() {
  if (!pendingBarterCar) return;
  const { myCarIdx, npcCar } = pendingBarterCar;
  state.garage.splice(myCarIdx, 1);
  state.garage.push(npcCar);
  pendingBarterCar = null;
  closeModal('modalBarterDeal');
  saveState();
  renderGarage();
  tgHaptic('success');
  playSound('win');
  showToast(`Ключ в ключ! Вы обменяли авто на «${npcCar.name}»!`);
  }
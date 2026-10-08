// ===================== Вкладка: ГАРАЖ (js/garage.js) =====================

let selectedCarIndex = null; 
let activePreSaleCarIndex = null; 
let carToLotIndex = null;
let obdActiveCarIdx = null;

function renderGarage() {
    const list = document.getElementById('garageList'); if (!list) return; 
    const totalSlots = getTotalGarageSlots(); setTxt('garageDetailedSlots', `${state.garage.length} из ${totalSlots} боксов занято`);
    const mainContent = document.querySelector('.main-content'); const scrollPos = mainContent ? mainContent.scrollTop : 0;
    
    if (state.garage.length === 0) { 
        list.innerHTML = `<div class="glass-card text-center sub-label py-8"><i class="fa-solid fa-warehouse color-cyan mb-2" style="font-size:32px;"></i><div>Гараж пуст. Выберите технику на авторынке или P2P!</div></div>`; 
        return; 
    }
    
    list.innerHTML = state.garage.map((car, idx) => {
        const cost = car.purchaseCost || car.basePrice || 100000;
        return `<div class="glass-card mb-3 ${car.hiddenDefect && !car.hasAdditive ? 'card-danger' : ''}">
            <div class="car-img-wrap" style="height: 140px;">
                <img src="${car.img}" class="car-img" onerror="this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'">
                <div class="badge-tag" style="bottom: 8px; right: 8px;">${(car.type || 'car').toUpperCase()}</div>
                <div class="plate-corner"><div class="license-plate">${car.customPlate || car.plate} <div class="license-flag">RUS</div></div></div>
            </div>
            <div class="flex-between mb-2">
                <div>
                    <h4 class="font-bold">${car.name}</h4>
                    <div class="sub-label">${car.power || 100} л.с. | Пробег: ${(car.mileage \vert{}\vert{} 85000).toLocaleString()} км \vert{} Сост: ${car.condition || 85}%</div>
                    <div class="text-xs color-amber mt-1">Куплена за: <b>${cost.toLocaleString()} ₽</b></div>
                </div>
                <div class="text-right">
                    <div class="sub-label">Оценка:</div>
                    <div class="price-val">${(car.marketValue || car.price).toLocaleString()} ₽</div>
                </div>
            </div>
            ${car.hiddenDefect ? `<div class="legal-warning mb-2"><span>⚠ <b>${car.hasAdditive ? 'Присадка залита' : car.hiddenDefect.text}</b></span><button onclick="repairCarDefect(${idx})" class="btn btn-amber btn-auto btn-sm">Капиталка (${car.hiddenDefect.cost.toLocaleString()} ₽)</button></div>` : ''}
            ${car.impounded ? `<div class="legal-warning mb-2"><span>🚨 <b>НА ШТРАФСТОЯНКЕ</b></span><button onclick="unimpoundCar(${idx})" class="btn btn-cyan btn-auto btn-sm">Вызволить (1 🤝 или 100k ₽)</button></div>` : ''}
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
    setTxt('prevTitle', car.name); setTxt('prevSpecs', `${car.power \vert{}\vert{} 100} л.с. \vert{} Разгон: ~6.2с \vert{} Состояние: ${car.condition || 85}%`);
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

    setTxt('preSaleCarTitle', `${car.name} (Оценка: ${car.marketValue.toLocaleString()} ₽) \vert{}${10 - state.player.preSalesCount} авто до паузы`);
    
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

function openOBD2Modal() {
    if (selectedCarIndex === null) return; obdActiveCarIdx = selectedCarIndex; const car = state.garage[selectedCarIndex]; closeModal('modalPreview');
    car.stoChecked = true; setTxt('obd2CarTitle', `Диагностика: ${car.name}`); const resBox = document.getElementById('obd2ResultBox'); const actBox = document.getElementById('obd2ActionBox');
    resBox.innerHTML = `Подключение...<br>`; actBox.innerHTML = ``; document.getElementById('modalOBD2').classList.add('active');
    setTimeout(() => {
        let issuesHtml = `<b>Отчет об узлах:</b><br>Двигатель: ${Math.round(car.wear.engine)}% ресурса<br>Трансмиссия: ${Math.round(car.wear.transmission)}% ресурса<br>`;
        if (car.hiddenDefect) { issuesHtml += `<br><span class="color-red">НАЙДЕНЫ ОШИБКИ В ЭБУ:</span><br>${car.hiddenDefect.text}`; actBox.innerHTML = `<button onclick="repairOBDErrorFromScanner()" class="btn btn-amber w-full">Устранить неисправность (${car.hiddenDefect.cost.toLocaleString()} ₽)</button>`; } else { issuesHtml += `<br><span class="color-green">Ошибок (DTC) не обнаружено. Агрегаты в норме.</span>`; }
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
    else { list.innerHTML = state.ownedPlates.map((p, i) => `<div class="glass-card flex-between w-full mb-1 p-2"><div class="license-plate">${p} <div class="license-flag">RUS</div></div><button onclick="installPlateOnCar('${p}', ${i})" class="btn btn-cyan btn-auto btn-sm">Установить</button></div>`).join(''); }
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
    car.customPlate = plate;
    state.ownedPlates.splice(plateIdx, 1); 
    saveState(); closeModal('modalChangePlate'); openPreviewModal(selectedCarIndex); renderGarage(); showToast(`✅ Госномер ${plate} установлен (-2,000 ₽)!`);
}

function updateTuningRiskUI(car) { const risk = car.tuning?.risk1251 || 0; setTxt('tuneRiskValue', `${risk}%`); const fill = document.getElementById('tuneRiskFill'); if (fill) fill.style.width = `${Math.min(100, risk)}%`; }

function openTuningModal(idx) { 
    selectedCarIndex = idx; const car = state.garage[idx]; 
    if (!car.tuning) car.tuning = { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }; 
    setTxt('tuneCarTitle', `${car.name} (${car.power || 100} л.с.)`); 
    updateTuningRiskUI(car);
    
    const c = document.getElementById('tuningItemsContainer');
    if (c) {
        c.innerHTML = `
        <div class="tuning-row">
            <div><div class="font-bold text-xs">Чип-Тюнинг Stage</div><div class="sub-label">+30 л.с. | Лимит: Stage 3</div></div>
            <button onclick="applyTuningMod('chip')" class="btn btn-dark btn-auto btn-sm" ${state.player.level < 5 ? 'disabled' : ''}>
                ${state.player.level < 5 ? 'С 5 УР' : '50,000 ₽'}
            </button>
        </div>
        <div class="tuning-row">
            <div><div class="font-bold text-xs">Прямоточный Выхлоп</div><div class="sub-label">+25% риск 12.5.1</div></div>
            <button onclick="applyTuningMod('exhaust')" class="btn btn-dark btn-auto btn-sm" ${state.player.level < 10 ? 'disabled' : ''}>
                ${state.player.level < 10 ? 'С 10 УР' : '35,000 ₽'}
            </button>
        </div>
        <div class="tuning-row">
            <div><div class="font-bold text-xs">Пневмоподвеска (Стенс)</div><div class="sub-label">+40 баллов на Автошоу</div></div>
            <button onclick="applyTuningMod('stance')" class="btn btn-dark btn-auto btn-sm" ${state.player.level < 15 ? 'disabled' : ''}>
                ${state.player.level < 15 ? 'С 15 УР' : '45,000 ₽'}
            </button>
        </div>
        <div class="tuning-row">
            <div><div class="font-bold text-xs">Спортивный Обвес</div><div class="sub-label">+15% риск</div></div>
            <button onclick="applyTuningMod('bodykit')" class="btn btn-dark btn-auto btn-sm" ${state.player.level < 20 ? 'disabled' : ''}>
                ${state.player.level < 20 ? 'С 20 УР' : '60,000 ₽'}
            </button>
        </div>
        `;
    }

    document.getElementById('modalTuning')?.classList.add('active'); 
}

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
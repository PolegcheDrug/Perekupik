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
    const letters = Math.random() > 0.5 ? PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)].repeat(3) : PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)] + PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)].repeat(2);
    const coolNums = ['001', '007', '111', '222', '333', '444', '555', '666', '777', '888', '999'];
    const num = coolNums[Math.floor(Math.random() * coolNums.length)]; 
    const reg = ['77', '99', '97', '777'][Math.floor(Math.random() * 4)];
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

// --- ЛОГИКА РЫНКА (Покупка, Торг, Осмотр) ---

let activeInspectCarId = null; 
let pendingMarketCar = null;

function getDynamicPrice(basePrice, type) { 
    const mod = state.marketModifiers[type] || 1; 
    const globalMod = state.marketModifiers.all || 1; 
    return Math.floor(basePrice * mod * globalMod); 
}

function getMarketRefreshCost() { return 150 + (state.player.level * 350); }

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
            ${car.viewed ? '<div class="viewed-badge"><i class="fa-solid fa-eye"></i> Просмотрено</div>' : ''}
            <div class="cooldown-timer">
                <div class="timer-clock" id="timer_num_${car.id}">${timeLeft}с</div>
                <div class="timer-text">Абонент занят</div>
                <button onclick="paidCallMarketCar('${car.id}')" class="btn btn-amber" style="width: 80%;">Платный дозвон (1000 ₽)</button>
            </div>
            <div class="car-img-wrap"><img src="${car.img}" class="car-img" onerror="this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'">
            <div class="badge-tag" style="bottom: 8px; right: 8px;">${(car.type || 'car').toUpperCase()}</div><div class="plate-corner"><div class="license-plate">${car.plate} <div class="license-flag">RUS</div></div></div></div>
            <div class="mb-2"><h4 class="font-bold">${car.name}</h4><div class="sub-label mb-2">${car.power || 100} л.с. | Пробег: ${(car.mileage || 0).toLocaleString()} км</div>${car.sellerNote ? `<div class="seller-note-card">${car.sellerNote}</div>` : ''}</div>
            <div class="price-box"><div><span class="text-xs color-green font-bold">ЦЕНА:</span><div class="price-val" id="price_txt_${car.id}">${car.price.toLocaleString()} ₽</div></div><div class="sub-label">Рыночная: ~${car.marketValue.toLocaleString()} ₽</div></div>
            <div class="grid-2 mb-2"><button onclick="openGaugeModal('${car.id}')" class="btn btn-dark">Толщиномер (3k ₽)</button><button onclick="openAutotekaModal('${car.id}')" class="btn btn-dark">Автотека (${car.autotekaChecked ? '0' : '5k'} ₽)</button></div>
            <button onclick="initiateBuyMarketCar('${car.id}')" class="btn btn-cyan w-full"><i class="fa-solid fa-phone"></i> Позвонить продавцу</button>
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
        rep.innerHTML = `<div class="mb-1 font-bold">${car.name} (${car.plate})</div><div>ДТП в базе: <b>${car.hiddenDefect ? '2' : '0'} шт.</b></div><div class="mt-1">Юридический статус: ${stat}</div>`; 
    }
    document.getElementById('modalAutoteka')?.classList.add('active'); renderMarketFeed();
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
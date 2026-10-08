// ===================== Вкладка: ЖИЗНЬ И ДОП. АКТИВНОСТИ (js/life.js) =====================

// ===================== 1. ТЕНЕВЫЕ СВЯЗИ (РЕШАЛА) =====================
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
                <div><b>${c.name}</b><div class="sub-label color-red">В розыске</div></div>
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

// ===================== 2. ЛОМБАРД И КАРМА =====================
function takeLoan(amt) { 
    if (state.player.loanDebt >= 1000000) return showToast("Лимит долга!"); 
    state.player.cash += amt * 0.95; state.player.loanDebt += amt; 
    saveState(); showToast(`Одобрено: ${amt.toLocaleString()} ₽`); 
}

function repayLoan(percent) { 
    if (state.player.loanDebt <= 0) return showToast("Нет долгов!"); 
    let amt = Math.ceil(state.player.loanDebt * (percent / 100)); 
    if (state.player.cash < amt) return showToast("Не хватает денег!"); 
    state.player.cash -= amt; state.player.loanDebt = Math.max(0, state.player.loanDebt - amt); 
    saveState(); showToast(`Оплачено ${amt.toLocaleString()} ₽`); 
}

function donateForKarma() { 
    if (state.player.cash < 50000) return showToast("Не хватает 50k ₽"); 
    state.player.cash -= 50000; state.player.karma = Math.min(100, state.player.karma + 10); 
    saveState(); showToast("Карма +10 😇"); 
}

// ===================== 3. ИМПЕРИЯ (БИЗНЕСЫ) =====================
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
                ${isLocked ? `<div class="cooldown-timer" style="display:flex; opacity:1; font-size:14px;"><i class="fa-solid fa-lock mb-2"></i> С ${b.minLevel} УРОВНЯ</div>` : ''}
                <div class="badge-tag bg-tag-cyan" style="bottom: 8px; left: 8px; right: auto;">${isMax ? 'MAX УРОВЕНЬ' : 'Ур. ' + b.level}</div>
            </div>
            <div class="business-content">
                <div class="flex-between mb-1">
                    <b class="text-xs">${b.name}</b>
                    <div class="sub-label">Доход: <span class="color-green font-bold">${(b.income * b.level).toLocaleString()} ₽</span></div>
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

// ===================== 4. СТРИТ АРЕНА =====================
let isRacing = false; let racePos = 0; let raceInterval = null; let raceDuelInterval = null; let currentRaceDifficulty = 'easy'; let playerTrackPos = 0; let oppTrackPos = 0;

function resetRaceState() { 
    if (raceInterval) clearInterval(raceInterval); 
    if (raceDuelInterval) clearInterval(raceDuelInterval); 
    isRacing = false; racePos = 0; playerTrackPos = 0; oppTrackPos = 0; 
}

function initStreetView() { 
    resetRaceState(); 
    updateStreetCarSelector(); 
}

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

function setRaceDifficulty(diff) { 
    currentRaceDifficulty = diff; 
    ['easy', 'medium', 'boss'].forEach(d => document.getElementById(`raceDiff-${d}`)?.classList.toggle('btn-cyan', d === diff)); 
}

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
    
    raceInterval = setInterval(() => { 
        racePos = (racePos + 5) % 100; 
        document.getElementById('raceNeedle').style.left = `${racePos}%`; 
    }, 30);
}

function shiftGear() { 
    if (!isRacing) return; 
    if (racePos >= 65 && racePos <= 85) playerTrackPos += 10; 
    else oppTrackPos += 8; 
    racePos = 0; 
}

function enterAutoShow() { 
    if (state.player.fuel < 15) return showToast("Нужно 15 ⛽!"); 
    state.player.fuel -= 15; state.player.cash += 45000; 
    saveState(); openVerdictModal("АВТОШОУ", "Приз получен (+45,000 ₽)", true, 45000); 
}

function policeAction(type) { closeModal('modalPolice'); }

// ===================== 5. САРАИ (ГАРАЖНЫЕ НАХОДКИ) =====================
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

// ===================== 6. КОНТЕЙНЕРЫ =====================
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

// ===================== 7. ЗАКАЗЫ СИНДИКАТА =====================
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
                <b class="color-cyan"><i class="fa-solid fa-user-tie"></i> ${cnt.title}</b>
                <span class="tag-badge bg-tag-amber">+${cnt.reward.toLocaleString()} ₽</span>
            </div>
            <p class="sub-label mb-2">Требуемый класс авто: <b>${cnt.req.toUpperCase()}</b></p>
            <button onclick="completeContract(${i})" class="btn btn-dark btn-sm w-full">
                <i class="fa-solid fa-car-side"></i> Отдать подходящее авто из гаража
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

// ===================== 8. ЖИЛЬЁ =====================
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
                ${isLocked ? `<div class="cooldown-timer" style="display:flex; font-size:14px; opacity:1;"><i class="fa-solid fa-lock mr-2"></i>С ${h.minLevel} УР</div>` : ''}
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

// ===================== 9. ЕДА И АКТИВНОСТИ =====================
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

function doActivity(type, cost, mood, connections = 0) { 
    if (state.player.cash < cost) return showToast("Не хватает денег!"); 
    state.player.cash -= cost; 
    state.player.mood = Math.min(100, state.player.mood + mood); 
    if (connections) state.player.connections += connections; 
    saveState(); showToast("Отдохнули!"); 
}

// ===================== 10. КОЛЕСО ФОРТУНЫ =====================
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
    const size = canvas.width; const center = size / 2; const radius = center - 8;
    const numSectors = WHEEL_SECTORS.length; const arc = (2 * Math.PI) / numSectors;

    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < numSectors; i++) {
        const sectorAngle = angle + (i * arc);
        ctx.beginPath();
        ctx.fillStyle = WHEEL_SECTORS[i].color;
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, sectorAngle, sectorAngle + arc);
        ctx.lineTo(center, center);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)"; ctx.lineWidth = 3; ctx.stroke();

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(sectorAngle + arc / 2);
        ctx.textAlign = "right"; ctx.fillStyle = WHEEL_SECTORS[i].textColor;
        ctx.font = "bold 24px -apple-system, sans-serif";
        ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 4;
        ctx.fillText(WHEEL_SECTORS[i].label, radius - 28, 8);
        ctx.restore();
    }

    ctx.beginPath(); ctx.arc(center, center, radius, 0, 2 * Math.PI); ctx.strokeStyle = "#00f2fe"; ctx.lineWidth = 6; ctx.stroke();
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

    isWheelSpinning = true; saveState(); updateHeaderUI();

    const winningIndex = Math.floor(Math.random() * WHEEL_SECTORS.length);
    const numSectors = WHEEL_SECTORS.length; const arc = (2 * Math.PI) / numSectors;
    const targetSectorCenter = (3 * Math.PI / 2) - (winningIndex * arc) - (arc / 2);
    const extraRotations = (6 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
    const targetAngle = currentWheelAngle + extraRotations + (targetSectorCenter - (currentWheelAngle % (2 * Math.PI)));

    const startAngle = currentWheelAngle; const duration = 4000; const startTime = performance.now();
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

        if (progress < 1) requestAnimationFrame(animateWheel);
        else { isWheelSpinning = false; giveWheelPrize(WHEEL_SECTORS[winningIndex]); initWheelModule(); }
    }
    requestAnimationFrame(animateWheel);
}

function giveWheelPrize(prize) {
    playSound('win'); tgHaptic('success');
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
        state.player.cash += prize.value; state.player.stars += 25;
        state.player.expressTickets = Math.min(state.player.maxExpressTickets, (state.player.expressTickets || 0) + 5);
        openVerdictModal("👑 ГРАНД ДЖЕКПОТ!", `ДЖЕКПОТ: +500,000 ₽, +25 Stars ⭐ и +5 Пропусков 🎟️!`, true, 500000);
    }
    saveState(); updateHeaderUI();
}

// ===================== 11. КАЗИНО 21 =====================
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

function addCasinoBet(amt) { 
    const maxAllowed = getCasinoMaxBet(); 
    if (casinoBet + amt > maxAllowed) casinoBet = maxAllowed; 
    else if (state.player.cash < casinoBet + amt) return showToast("Не хватает денег!"); 
    else casinoBet += amt; 
    setTxt('currentBetDisplay', `${casinoBet.toLocaleString()} ₽`); 
}

function setCasinoMaxBet() { casinoBet = Math.min(getCasinoMaxBet(), state.player.cash); setTxt('currentBetDisplay', `${casinoBet.toLocaleString()} ₽`); }
function clearCasinoBet() { casinoBet = 0; setTxt('currentBetDisplay', '0 ₽'); }

function get21Deck() { 
    const suits = ['♠','♥','♣','♦']; const vals = ['6','7','8','9','10','J','Q','K','A']; 
    let d = []; for(let s of suits) { for(let v of vals) d.push({v, s}); } 
    return d.sort(() => Math.random() - 0.5); 
}

function get21Score(hand) { 
    let score = 0; let aces = 0; 
    for (let c of hand) { 
        if (c.v === 'J') score += 2; 
        else if (c.v === 'Q') score += 3; 
        else if (c.v === 'K') score += 4; 
        else if (c.v === 'A') { score += 11; aces += 1; } 
        else score += parseInt(c.v); 
    } 
    while (score > 21 && aces > 0) { score -= 10; aces -= 1; } 
    return score; 
}

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
    
    resBox.innerHTML += `<br><button onclick="resetCasinoUI()" class="btn btn-dark btn-sm mt-2">Снова</button>`; saveState(); updateHeaderUI();
}

// ===================== 12. ПРОЧЕЕ (Реклама, Донат, Смена дня) =====================
function watchAdsgram() { state.player.cash += 25000; state.player.connections += 1; saveState(); showToast("+25k ₽ и +1 🤝"); }
function buyPackWithStars(stars, cash) { state.player.cash += cash; saveState(); showToast(`+${cash.toLocaleString()} ₽`); }
function buyVipProPass() { state.player.vipPro = true; saveState(); showToast("VIP активирован!"); }
function refuelAction(type) { state.player.fuel = 100; saveState(); showToast("Бак 100 ⛽!"); }

function nextDayAction() {
    state.player.day += 1;
    state.player.cash -= 1500;
    state.player.fuel = 100;
    state.player.expressTickets = Math.min(state.player.maxExpressTickets, (state.player.expressTickets || 0) + 25);

    if (state.player.policeImmunityDays > 0) state.player.policeImmunityDays -= 1;
    
    populateMarketFeed(); refreshPlateCatalog(); saveState(); renderDiets(); renderHousing(); renderPlatesPage();
    
    showToast("Наступил новый день! Получено 25 пропусков.");
    updateHeaderUI();
}
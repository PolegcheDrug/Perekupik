// ========================================================
// js/salesLot.js — ПЛОЩАДКА ПРОДАЖ, КАРМА И ЧЕСТНЫЙ ТОРГ (v0.5.0)
// Разработчики: Tak Toje, Max, Sergo, gemini
// Честная реакция покупателей без ложных обвинений в обмане,
// право отказаться от подписания ДКП, налог 13% при быстрой продаже,
// официальный редизайн бланка ДКП и штампа МРЭО без наложений
// ========================================================

const BUYERS_CATALOG = {
    economy: [
        { name: "Студент Макс", avatar: "🧑‍🎓", rate: 0.82, type: "economy", meticulous: 0.15 },
        { name: "Таксист Ашот", avatar: "🧔", rate: 0.88, type: "economy", meticulous: 0.45 },
        { name: "Дед Михалыч", avatar: "👴", rate: 0.95, type: "economy", meticulous: 0.10 },
        { name: "Перекуп Саня", avatar: "😎", rate: 0.75, type: "economy", meticulous: 0.85 },
        { name: "Дачник Петрович", avatar: "👨‍🌾", rate: 0.90, type: "economy", meticulous: 0.20 },
        { name: "Курьер Руслан", avatar: "🛵", rate: 0.85, type: "economy", meticulous: 0.25 },
        { name: "Пацан с района Костян", avatar: "🧢", rate: 0.78, type: "economy", meticulous: 0.10 },
        { name: "Новичок с правами Лера", avatar: "👩‍🦰", rate: 0.93, type: "economy", meticulous: 0.30 },
        { name: "Гаражный мастер Толя", avatar: "👨‍🔧", rate: 0.80, type: "economy", meticulous: 0.70 },
        { name: "Бригадир Валера", avatar: "👷‍♂️", rate: 0.89, type: "economy", meticulous: 0.35 }
    ],
    comfort: [
        { name: "Менеджер Олег", avatar: "👨‍💼", rate: 0.88, type: "comfort", meticulous: 0.40 },
        { name: "Семейный Илья", avatar: "👨‍👩‍👦", rate: 0.92, type: "comfort", meticulous: 0.50 },
        { name: "Блогерша Аня", avatar: "👩‍🎤", rate: 0.95, type: "comfort", meticulous: 0.20 },
        { name: "Автоподборщик со сканером", avatar: "🕵️‍♂️", rate: 0.80, type: "comfort", meticulous: 0.90 },
        { name: "IT-тимлид Денис", avatar: "👨‍💻", rate: 0.94, type: "comfort", meticulous: 0.65 },
        { name: "Риелтор Кристина", avatar: "👩‍💼", rate: 0.91, type: "comfort", meticulous: 0.35 },
        { name: "Фитнес-тренер Влад", avatar: "💪", rate: 0.87, type: "comfort", meticulous: 0.25 },
        { name: "Врач-стоматолог Павел", avatar: "👨‍⚕️", rate: 0.96, type: "comfort", meticulous: 0.60 },
        { name: "Торговый представитель Юра", avatar: "🚘", rate: 0.84, type: "comfort", meticulous: 0.55 },
        { name: "Дизайнер интерьеров Соня", avatar: "🎨", rate: 0.93, type: "comfort", meticulous: 0.30 }
    ],
    premium: [
        { name: "Бизнесмен Игорь", avatar: "🤵", rate: 0.90, type: "premium", meticulous: 0.60 },
        { name: "Мажор Артур", avatar: "🕺", rate: 0.98, type: "premium", meticulous: 0.15 },
        { name: "Депутат Виталий", avatar: "🕴️", rate: 0.85, type: "premium", meticulous: 0.70 },
        { name: "Владелец таксопарка", avatar: "🧔‍♂️", rate: 0.82, type: "premium", meticulous: 0.80 },
        { name: "Застройщик Альберт", avatar: "🏗️", rate: 0.93, type: "premium", meticulous: 0.55 },
        { name: "Продюсер Марк", avatar: "🎬", rate: 0.97, type: "premium", meticulous: 0.30 },
        { name: "Ресторатор Карен", avatar: "🍽️", rate: 0.89, type: "premium", meticulous: 0.40 },
        { name: "Юрист международник Яна", avatar: "⚖️", rate: 0.92, type: "premium", meticulous: 0.85 },
        { name: "Владелец сети клиник Борис", avatar: "🩺", rate: 0.95, type: "premium", meticulous: 0.65 },
        { name: "Инвестор Герман", avatar: "📈", rate: 0.86, type: "premium", meticulous: 0.75 }
    ],
    hyper: [
        { name: "Шейх Мансур", avatar: "👳‍♂️", rate: 1.05, type: "hyper", meticulous: 0.30 },
        { name: "Олигарх Роман", avatar: "🛥️", rate: 0.95, type: "hyper", meticulous: 0.80 },
        { name: "Крипто-миллионер", avatar: "🤑", rate: 1.10, type: "hyper", meticulous: 0.20 },
        { name: "Стример-хайпожор", avatar: "🎮", rate: 1.08, type: "hyper", meticulous: 0.25 },
        { name: "Звезда футбола Алекс", avatar: "⚽", rate: 1.02, type: "hyper", meticulous: 0.35 },
        { name: "Коллекционер редких авто", avatar: "🏛️", rate: 1.15, type: "hyper", meticulous: 0.95 },
        { name: "IT-фаундер из Дубая", avatar: "🚀", rate: 0.99, type: "hyper", meticulous: 0.50 },
        { name: "Наследник синдиката Тариэл", avatar: "🕶️", rate: 0.92, type: "hyper", meticulous: 0.70 }
    ]
};

let dkpAutoCloseTimer = null;
let dealIsAborted = false;

// Расчёт времени ожидания клиента с учётом Кармы игрока
function calculateLotWaitTime() {
    let baseTime = Math.floor(60 + Math.random() * 120); // 60-180 сек[cite: 40]
    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50; //[cite: 40]

    let karmaFactor = 1.0 - ((karma - 50) / 100) * 0.8; //[cite: 40]
    karmaFactor = Math.max(0.5, Math.min(1.7, karmaFactor)); //[cite: 40]

    return Math.max(15, Math.round(baseTime * karmaFactor)); //[cite: 40]
}

function renderSalesLot() {
    const list = document.getElementById('salesLotList'); //[cite: 40]
    if (!list) return; //[cite: 40]

    let count = (state.salesLot && state.salesLot.length) ? state.salesLot.length : 0; //[cite: 40]
    setTxt('lotCountBadge', count + " авто на продаже"); //[cite: 40]
    
    let maxExpress = (state.player && state.player.maxExpressTickets) ? state.player.maxExpressTickets : 25; //[cite: 40]
    let curExpress = (state.player && state.player.expressTickets) ? state.player.expressTickets : 0; //[cite: 40]
    setTxt('expressCountDisplay', curExpress + " / " + maxExpress); //[cite: 40]

    if (!state.salesLot || state.salesLot.length === 0) { //[cite: 40]
        list.innerHTML = "<div class='glass-card text-center sub-label py-8'><i class='fa-solid fa-car-on color-cyan mb-2' style='font-size:32px;'></i><div>Площадка пуста. Выставьте автомобиль из гаража!</div></div>"; //[cite: 40]
        return; //[cite: 40]
    }

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50; //[cite: 40]
    let karmaSpeedText = karma >= 70 //[cite: 40]
        ? "<div class='text-xs color-green font-bold mt-1'>⚡ Высокая репутация: клиенты приходят на 40% быстрее</div>" //[cite: 40]
        : (karma < 40 ? "<div class='text-xs color-red font-bold mt-1'>🐌 Низкая репутация: покупатели приходят неохотно</div>" : ""); //[cite: 40]

    let html = ""; //[cite: 40]
    state.salesLot.forEach((lot, idx) => { //[cite: 40]
        if (!lot || !lot.car) return; //[cite: 40]

        let car = lot.car; //[cite: 40]
        let cName = car.name || "Автомобиль"; //[cite: 40]
        let cPower = car.power || 100;
        let cImg = car.img || "assets/cars/economy/vaz-2107.jpg"; //[cite: 40]
        let cPlate = car.customPlate || car.plate || "ТРАНЗИТ"; //[cite: 40]
        let asking = lot.askingPrice || 100000; //[cite: 40]

        let statusBlock = ""; //[cite: 40]
        if (!lot.currentBuyer) { //[cite: 40]
            let maxTime = lot.maxTimer || 120; //[cite: 40]
            let currentTimer = lot.timer || 0; //[cite: 40]
            let progressPct = Math.max(0, Math.min(100, ((maxTime - currentTimer) / maxTime) * 100)); //[cite: 40]

            statusBlock = `
            <div class='p-2' style='background:#090e18; border-radius:8px; border:1px solid var(--border-glass);'>
                <div class='flex-between text-xs mb-1'>
                    <span id='lot_timer_text_${idx}'>Ожидание клиента: ${currentTimer}с</span>
                    <span class='color-cyan font-bold'>Поиск покупателя</span>
                </div>
                <div class='container-progress-wrap'>
                    <div class='container-progress-bar' id='lot_progress_fill_${idx}' style='width:${progressPct}%;'></div>
                </div>
                ${karmaSpeedText}
                <button onclick='useExpressTicket(${idx})' class='btn btn-purple btn-sm w-full mt-2'>
                    ⚡ Ускорить поиск (1 Талон 🎟️)
                </button>
            </div>`; //[cite: 40]
        } else { //[cite: 40]
            let buyer = lot.currentBuyer; //[cite: 40]
            let timeLeft = lot.buyerTimerLeft || 60; //[cite: 40]
            statusBlock = `
            <div class='p-2' style='background:rgba(0,230,118,0.08); border:1px solid var(--green); border-radius:10px;'>
                <div class='flex-between mb-1'>
                    <div class='flex-gap' style='align-items:center;'>
                        <span style='font-size:24px;'>${buyer.avatar}</span>
                        <div>
                            <b class='text-xs color-green' style='font-size:12px;'>${buyer.name}</b>
                            <div class='sub-label' style='font-size:9.5px;'>Осматривает авто у капота</div>
                        </div>
                    </div>
                    <span class='tag-badge bg-tag-amber' id='lot_buyer_timer_${idx}'>⏳ ${timeLeft}с</span>
                </div>
                <div class='flex-between mb-2 p-1' style='background:#060a12; border-radius:6px;'>
                    <span class='sub-label text-xs'>Предложение клиента:</span>
                    <span class='price-val text-xs color-green' style='font-size:14px;'>${buyer.offerPrice.toLocaleString()} ₽</span>
                </div>
                <div class='grid-2'>
                    <button onclick="openSaleHaggleModal(${idx})" class='btn btn-cyan btn-sm'>💬 Торговаться</button>
                    <button onclick="acceptBuyerOffer(${idx})" class='btn btn-green btn-sm'>Продать 🤝</button>
                </div>
            </div>`;
        }

        let regBadge = car.isRegisteredOnPlayer  //[cite: 40]
            ? "<span class='tag-badge bg-tag-green' style='font-size:8.5px;'>УЧЁТ РФ</span>" //[cite: 40]
            : "<span class='tag-badge bg-tag-amber' style='font-size:8.5px;'>НА ДКП</span>"; //[cite: 40]

        let criminalBadge = car.isStolen  //[cite: 40]
            ? "<span class='tag-badge bg-tag-red ml-1' style='font-size:8.5px;'>В РОЗЫСКЕ</span>" //[cite: 40]
            : (car.unregistered ? "<span class='tag-badge bg-tag-red ml-1' style='font-size:8.5px;'>12.5.1</span>" : ""); //[cite: 40]

        html += `
        <div class='glass-card mb-3'>
            <div class='car-img-wrap' style='height: 140px;'>
                <img src='${cImg}' class='car-img' onerror="this.src='assets/cars/economy/vaz-2107.jpg'">
                <div class='plate-corner'><div class='license-plate'>${cPlate} <div class='license-flag'>RUS</div></div></div>
                <div class='badge-tag' style='bottom:6px; right:6px;'>
                    ${regBadge}
                    ${criminalBadge}
                </div>
            </div>

            <div class='flex-between mb-2'>
                <div>
                    <h4 class='font-bold text-xs color-cyan' style='font-size:14px;'>${cName}</h4>
                </div>
                <div class='price-val text-xs color-green' style='font-size:14px;'>
                    ${asking.toLocaleString()} ₽
                </div>
            </div>

            <!-- МИКРО-ПЛИТКИ ПАРАМЕТРОВ (SPEC GRID) -->
            <div class='car-spec-chips-row mb-2'>
                <div class='car-spec-chip'><i class='fa-solid fa-bolt color-amber'></i> <b>${cPower}</b> л.с.</div>
                <div class='car-spec-chip'><i class='fa-solid fa-road color-cyan'></i> <b>${(car.mileage || 85000).toLocaleString()}</b> км</div>
                <div class='car-spec-chip'><i class='fa-solid fa-shield color-green'></i> <b>${car.condition || 80}%</b> кузов</div>
            </div>

            <div class='flex-between mb-2'>
                <span class='sub-label text-xs'>Цена в объявлении: <b class='color-cyan'>${asking.toLocaleString()} ₽</b></span>
                <button onclick='cancelSalesLot(${idx})' class='btn btn-dark btn-auto btn-sm' style='padding:4px 8px;'>Снять</button>
            </div>

            ${statusBlock}
        </div>`;
    });

    list.innerHTML = html; //[cite: 40]
}

function generateBuyerForSlot(slot) {
    if (!slot || !slot.car) return; //[cite: 40]
    const car = slot.car; //[cite: 40]
    let carCat = car.type ? car.type : 'economy'; //[cite: 40]
    
    if (!BUYERS_CATALOG[carCat]) carCat = 'economy'; //[cite: 40]
    const pool = BUYERS_CATALOG[carCat]; //[cite: 40]
    const template = pool[Math.floor(Math.random() * pool.length)]; //[cite: 40]
    
    let asking = slot.askingPrice ? slot.askingPrice : car.marketValue; //[cite: 40]
    let baseVal = car.marketValue || 100000; //[cite: 40]
    
    let tuneBonus = 0; //[cite: 40]
    if (car.tuning) { //[cite: 40]
        if (car.tuning.stance) tuneBonus += 0.05; //[cite: 40]
        if (car.tuning.customWheels) tuneBonus += 0.05; //[cite: 40]
        if (car.tuning.chip > 0) tuneBonus += 0.03; //[cite: 40]
    }
    if (car.isPolished) tuneBonus += 0.05; //[cite: 40]

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50; //[cite: 40]
    let karmaBonus = ((karma - 50) / 100) * 0.08; //[cite: 40]

    let plateBonus = 0; //[cite: 40]
    let cPlate = car.customPlate || car.plate; //[cite: 40]
    let pVal = (typeof calculatePlateValue === 'function') ? calculatePlateValue(cPlate) : 0; //[cite: 40]
    if (pVal >= 35000) { //[cite: 40]
        plateBonus = 0.20 + Math.random() * 0.15; //[cite: 40]
    }
    
    let rate = template.rate + tuneBonus + plateBonus + karmaBonus; //[cite: 40]
    let offer = Math.round(baseVal * (rate + (Math.random() * 0.06 - 0.03))); //[cite: 40]
    
    if (offer > asking * 1.10) offer = asking; //[cite: 40]
    if (offer < asking * 0.45) offer = Math.round(asking * 0.50); //[cite: 40]

    let calculatedMeticulous = template.meticulous || 0.3; //[cite: 40]
    if (karma < 40) calculatedMeticulous += 0.25; //[cite: 40]
    if (car.isStolen || car.unregistered) calculatedMeticulous += 0.20; //[cite: 40]

    slot.currentBuyer = {
        name: template.name, //[cite: 40]
        avatar: template.avatar, //[cite: 40]
        type: template.type, //[cite: 40]
        offerPrice: offer, //[cite: 40]
        initialOfferPrice: offer, //[cite: 40]
        maxOfferPrice: Math.round(offer * (1.06 + Math.random() * 0.10)), //[cite: 40]
        patience: 100, //[cite: 40]
        meticulous: Math.min(0.95, calculatedMeticulous), //[cite: 40]
        successfulHagglesCount: 0, //[cite: 40]
        maxAllowedHaggles: Math.floor(2 + Math.random() * 2) //[cite: 40]
    };
    
    slot.buyerTimerLeft = Math.floor(60 + Math.random() * 240); //[cite: 40]

    try {
        tgHaptic('success'); //[cite: 40]
        playSound('tick'); //[cite: 40]
    } catch(e) {}
    
    sendBackgroundNotification("Клиент у капота!", `Покупатель ${template.name} осматривает «${car.name}»`); //[cite: 40]

    let plateText = plateBonus > 0 ? " (🔥 Оценил красивый госномер!)" : ""; //[cite: 40]
    showToast("🔔 На площадке клиент: " + template.name + plateText); //[cite: 40]
    renderSalesLot(); //[cite: 40]
}

function sendBackgroundNotification(title, body) {
    if (document.visibilityState === 'hidden') { //[cite: 40]
        tgHaptic('warning'); //[cite: 40]
        document.title = `🔔 ${title}`; //[cite: 40]
    }
}

document.addEventListener('visibilitychange', () => { //[cite: 40]
    if (document.visibilityState === 'visible') { //[cite: 40]
        document.title = "Симулятор Перекупа v0.5.0";
    }
});

function upgradeExpressCapacity() {
    let cost = getExpressTicketUpgradeCost(); //[cite: 40]
    let cash = (state.player && state.player.cash) ? state.player.cash : 0; //[cite: 40]
    if (cash < cost) return showToast("Нужно " + cost.toLocaleString() + " ₽ для расширения хранилища талонов!"); //[cite: 40]
    
    state.player.cash -= cost; //[cite: 40]
    let maxT = (state.player && state.player.maxExpressTickets) ? state.player.maxExpressTickets : 25; //[cite: 40]
    state.player.maxExpressTickets = maxT + 25; //[cite: 40]
    state.player.expressTickets = state.player.maxExpressTickets; //[cite: 40]
    
    saveState(); //[cite: 40]
    updateHeaderUI(); //[cite: 40]
    renderSalesLot(); //[cite: 40]
    playSound('win'); //[cite: 40]
    tgHaptic('success'); //[cite: 40]
    showToast("Склад пропусков расширен и заполнен! (Вместимость: " + state.player.maxExpressTickets + ")"); //[cite: 40]
}

function useExpressTicket(idx) {
    let tck = (state.player && state.player.expressTickets) ? state.player.expressTickets : 0; //[cite: 40]
    if (tck <= 0) return showToast("У вас закончились экспресс-пропуски 🎟️! Подождите смены суток."); //[cite: 40]

    state.player.expressTickets -= 1; //[cite: 40]
    const slot = state.salesLot[idx]; //[cite: 40]
    if (slot) { //[cite: 40]
        slot.timer = 0; //[cite: 40]
        generateBuyerForSlot(slot); //[cite: 40]
    }
    saveState(); //[cite: 40]
    renderSalesLot(); //[cite: 40]
    updateHeaderUI(); //[cite: 40]
    showToast("⚡ Экспресс-пропуск применен! Покупатель найден мгновенно."); //[cite: 40]
}

function cancelSalesLot(idx) {
    const slot = state.salesLot[idx]; //[cite: 40]
    if (!slot || !slot.car) return; //[cite: 40]

    let maxSlots = getTotalGarageSlots(); //[cite: 40]
    let curSlots = state.garage ? state.garage.length : 0; //[cite: 40]
    if (curSlots >= maxSlots) return showToast("Гараж полон! Освободите место для возврата авто."); //[cite: 40]

    state.garage.push(slot.car); //[cite: 40]
    state.salesLot.splice(idx, 1); //[cite: 40]
    saveState(); //[cite: 40]
    renderSalesLot(); //[cite: 40]
    if (typeof renderGarage === 'function') renderGarage(); //[cite: 40]
    updateHeaderUI(); //[cite: 40]
    showToast("Автомобиль снят с продажи и возвращен в гараж."); //[cite: 40]
}

// ========================================================
// ЛОГИКА ТОРГА С ПРОВЕРКОЙ ЧЕСТНОСТИ
// ========================================================
let activeHaggleLotIndex = null; //[cite: 40]
let currentSaleBuyer = null; //[cite: 40]

function openSaleHaggleModal(idx) {
    dealIsAborted = false; //[cite: 40]
    activeHaggleLotIndex = idx; //[cite: 40]
    const slot = state.salesLot[idx]; //[cite: 40]
    if (!slot || !slot.currentBuyer) return; //[cite: 40]

    currentSaleBuyer = slot.currentBuyer; //[cite: 40]
    const car = slot.car; //[cite: 40]

    const imgEl = document.getElementById("saleCarImg"); //[cite: 40]
    if (imgEl) imgEl.src = car.img ? car.img : "assets/cars/economy/vaz-2107.jpg"; //[cite: 40]
    
    setTxt("saleCarTitle", car.name ? car.name : "Автомобиль"); //[cite: 40]
    setTxt("saleBuyerOfferVal", currentSaleBuyer.offerPrice.toLocaleString() + " ₽"); //[cite: 40]
    setTxt("saleBuyerAvatar", currentSaleBuyer.avatar); //[cite: 40]
    setTxt("saleBuyerName", currentSaleBuyer.name); //[cite: 40]
    setTxt("saleBuyerPatienceText", currentSaleBuyer.patience + "%"); //[cite: 40]

    const fill = document.getElementById("saleBuyerPatienceFill"); //[cite: 40]
    if (fill) { //[cite: 40]
        fill.style.width = currentSaleBuyer.patience + "%"; //[cite: 40]
        fill.className = currentSaleBuyer.patience > 50 ? "risk-fill risk-low" : "risk-fill risk-high"; //[cite: 40]
    }

    const thread = document.getElementById("saleHaggleChatThread"); //[cite: 40]
    if (thread) { //[cite: 40]
        const greetings = [
            "«Машина интересная, но цену надо обсудить...»",
            "«Осмотрел тачку, есть пара вопросов. Скидку сделаешь?»",
            "«Готов забрать сегодня за наличку, если подвинешься в цене.»",
            "«Ну что, оформляем? Только цену давай адекватную сделаем.»"
        ]; //[cite: 40]
        let randomGreeting = greetings[Math.floor(Math.random() * greetings.length)]; //[cite: 40]
        thread.innerHTML = "<div class='chat-msg msg-seller' id='saleBuyerGreetingMsg'>" + randomGreeting + "</div>"; //[cite: 40]
    }

    const modalButtons = document.querySelectorAll('#modalHaggleSale button'); //[cite: 40]
    modalButtons.forEach(b => { //[cite: 40]
        b.disabled = false; //[cite: 40]
        b.style.display = ''; //[cite: 40]
        b.style.pointerEvents = 'auto'; //[cite: 40]
    });

    const modal = document.getElementById("modalHaggleSale"); //[cite: 40]
    if (modal) modal.classList.add('active'); //[cite: 40]
    playSound('tick'); //[cite: 40]
}

function rejectBuyerHaggle() {
    if (activeHaggleLotIndex === null) return; //[cite: 40]
    const slot = state.salesLot[activeHaggleLotIndex]; //[cite: 40]
    if (!slot) return; //[cite: 40]

    dealIsAborted = true; //[cite: 40]
    closeModal("modalHaggleSale"); //[cite: 40]
    slot.currentBuyer = null; //[cite: 40]
    slot.maxTimer = calculateLotWaitTime(); //[cite: 40]
    slot.timer = slot.maxTimer; //[cite: 40]
    saveState(); //[cite: 40]
    renderSalesLot(); //[cite: 40]
    updateHeaderUI(); //[cite: 40]
    playSound('tick'); //[cite: 40]
    showToast("Вы отказали клиенту: «Не сошлись по цене». Площадка ищет следующего!"); //[cite: 40]
}

function attemptHaggleSale(type) {
    if (dealIsAborted || activeHaggleLotIndex === null || !currentSaleBuyer) return; //[cite: 40]
    
    const slot = state.salesLot[activeHaggleLotIndex]; //[cite: 40]
    if (!slot) return; //[cite: 40]
    const car = slot.car; //[cite: 40]
    const thread = document.getElementById("saleHaggleChatThread"); //[cite: 40]

    // 1. ПРОВЕРКА НА КРИМИНАЛ (УГОН, 12.5.1)
    let isCriminal = car.isStolen || car.unregistered; //[cite: 40]
    if (isCriminal) { //[cite: 40]
        let bustRoll = Math.random(); //[cite: 40]
        if (bustRoll < currentSaleBuyer.meticulous) { //[cite: 40]
            dealIsAborted = true; //[cite: 40]
            const modalButtons = document.querySelectorAll('#modalHaggleSale button'); //[cite: 40]
            modalButtons.forEach(b => { //[cite: 40]
                b.disabled = true; //[cite: 40]
                b.style.pointerEvents = 'none'; //[cite: 40]
            });

            let crimReason = car.isStolen ? "перебитый VIN и розыск в базе МВД!" : "аннулированный учёт по ст. 12.5.1!"; //[cite: 40]
            if (thread) { //[cite: 40]
                thread.innerHTML += `
                    <div class="chat-msg msg-player">«Документы чистые, брат, забирай!»</div>
                    <div class="chat-msg msg-seller" style="background:#3b050d; border-color:var(--red);">
                        «Ты кого вздумал обмануть?! Я пробил базы: тут ${crimReason} Я вызываю наряд полиции!»
                    </div>`; //[cite: 40]
                thread.scrollTop = thread.scrollHeight; //[cite: 40]
            }

            tgHaptic('error'); //[cite: 40]
            playSound('error'); //[cite: 40]

            setTimeout(() => { //[cite: 40]
                closeModal("modalHaggleSale"); //[cite: 40]
                state.salesLot.splice(activeHaggleLotIndex, 1); //[cite: 40]
                
                let fine = 45000; //[cite: 40]
                state.player.cash = Math.max(0, (state.player.cash || 0) - fine); //[cite: 40]
                state.player.karma = Math.max(0, (state.player.karma || 50) - 25); //[cite: 40]
                state.player.mood = Math.max(0, (state.player.mood || 80) - 30); //[cite: 40]
                
                saveState(); //[cite: 40]
                renderSalesLot(); //[cite: 40]
                updateHeaderUI(); //[cite: 40]
                
                openVerdictModal(
                    "ПОЛИЦЕЙСКАЯ ОБЛАВА НА ПЛОЩАДКЕ! 🚨",
                    `Клиент вызвал наряд ДПС из-за криминального прошлого авто (${crimReason}). Автомобиль конфискован на спецстоянку!\nШтраф: -${fine.toLocaleString()} ₽ | Карма: -25`,
                    false
                ); //[cite: 40]
            }, 1900); //[cite: 40]
            return; //[cite: 40]
        }
    }

    // 2. ПРОВЕРКА НА УМЫШЛЕННЫЙ ОБМАН ИГРОКА (ТОЛЬКО ЕСЛИ САМ СКРУТИЛ ИЛИ ЗАЛИЛ ПРИСАДКУ)
    let isIntentionalScam = !!car.rolledOdometer || !!car.hasAdditive; //[cite: 40]
    if (isIntentionalScam) { //[cite: 40]
        let scamRoll = Math.random(); //[cite: 40]
        if (scamRoll < currentSaleBuyer.meticulous) { //[cite: 40]
            dealIsAborted = true; //[cite: 40]
            const modalButtons = document.querySelectorAll('#modalHaggleSale button'); //[cite: 40]
            modalButtons.forEach(b => { //[cite: 40]
                b.disabled = true; //[cite: 40]
                b.style.pointerEvents = 'none'; //[cite: 40]
            });

            let scamReason = car.rolledOdometer //[cite: 40]
                ? "скрученный пробег!" //[cite: 40]
                : "залитую загущающую присадку в мотор!"; //[cite: 40]

            if (thread) { //[cite: 40]
                thread.innerHTML += `
                    <div class="chat-msg msg-player">«Машина в идеале, брат, отвечаю!»</div>
                    <div class="chat-msg msg-seller" style="background:#3b050d; border-color:var(--red);">
                        «Ты кого развести вздумал?! Я подключил свой прибор и нашёл ${scamReason} Сделки не будет!»
                    </div>`; //[cite: 40]
                thread.scrollTop = thread.scrollHeight; //[cite: 40]
            }

            let karmaLoss = 15; //[cite: 40]
            state.player.karma = Math.max(0, (state.player.karma || 50) - karmaLoss); //[cite: 40]
            saveState(); //[cite: 40]
            updateHeaderUI(); //[cite: 40]
            tgHaptic('error'); //[cite: 40]
            playSound('error'); //[cite: 40]

            if (typeof PhoneManager !== 'undefined') { //[cite: 40]
                PhoneManager.pushBuyerFollowupSMS(car.name, true, currentSaleBuyer.name); //[cite: 40]
            }

            setTimeout(() => { //[cite: 40]
                closeModal("modalHaggleSale"); //[cite: 40]
                slot.currentBuyer = null; //[cite: 40]
                slot.maxTimer = calculateLotWaitTime(); //[cite: 40]
                slot.timer = slot.maxTimer; //[cite: 40]
                saveState(); //[cite: 40]
                renderSalesLot(); //[cite: 40]
                openVerdictModal("СКАНДАЛ НА ПЛОЩАДКЕ! 🚨", `Клиент раскусил обман (${scamReason}). Он ушёл и разнёс дурную славу. Карма упала на -${karmaLoss}!`, false); //[cite: 40]
            }, 1800); //[cite: 40]
            return; //[cite: 40]
        }
    }

    // 3. ЕСТЕСТВЕННЫЙ ИЗНОС (НЕ СЧИТАЕТСЯ ОБМАНОМ — ПОКУПАТЕЛЬ ПРОСТО СБИВАЕТ ЦЕНУ НА РЕМОНТ)
    if (car.hiddenDefect && !car.hasAdditive) { //[cite: 40]
        if (Math.random() < 0.40) { //[cite: 40]
            let repairDiscount = Math.round((car.hiddenDefect.cost || 15000) * 0.85); //[cite: 40]
            currentSaleBuyer.offerPrice = Math.max(10000, currentSaleBuyer.offerPrice - repairDiscount); //[cite: 40]
            setTxt("saleBuyerOfferVal", currentSaleBuyer.offerPrice.toLocaleString() + " ₽"); //[cite: 40]

            if (thread) { //[cite: 40]
                thread.innerHTML += `
                    <div class="chat-msg msg-seller">
                        «Слушай, я прислушался к мотору: тут явно проблема (${car.hiddenDefect.text}). Либо скидываешь ${repairDiscount.toLocaleString()} ₽ на сервис, либо я пошёл.»
                    </div>`; //[cite: 40]
                thread.scrollTop = thread.scrollHeight; //[cite: 40]
            }
            tgHaptic('warning'); //[cite: 40]
            playSound('tick'); //[cite: 40]
            showToast("Покупатель заметил стук мотора и сбил цену на ремонт!"); //[cite: 40]
            return; //[cite: 40]
        }
    }

    // 4. ПРОВЕРКА ЛИМИТА ТОРГА
    if (currentSaleBuyer.successfulHagglesCount >= currentSaleBuyer.maxAllowedHaggles) { //[cite: 40]
        if (thread) { //[cite: 40]
            thread.innerHTML += `
                <div class="chat-msg msg-player">«Может накинешь еще немного сверху?»</div>
                <div class="chat-msg msg-seller">«Всё, хватит! Я уже и так поднял цену до предела. Либо забираю по этой цене, либо я ухожу!»</div>`; //[cite: 40]
            thread.scrollTop = thread.scrollHeight; //[cite: 40]
        }
        showToast("⚠️ Покупатель упёрся в потолок своего бюджета!"); //[cite: 40]
        return; //[cite: 40]
    }

    // 5. БАЗОВЫЙ РАСЧЁТ ТОРГА
    let baseSuccess = type === 'safe' ? 0.80 : 0.40; //[cite: 40]
    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50; //[cite: 40]
    let lvl = (state.player && state.player.level) ? state.player.level : 1; //[cite: 40]
    let statBonus = ((karma - 50) / 250) + (lvl / 300); //[cite: 40]
    
    let successChance = baseSuccess + statBonus; //[cite: 40]
    let success = Math.random() < successChance; //[cite: 40]

    if (success) { //[cite: 40]
        currentSaleBuyer.successfulHagglesCount += 1; //[cite: 40]
        let increasePercent = type === 'safe' ? (0.02 + Math.random() * 0.015) : (0.05 + Math.random() * 0.03); //[cite: 40]
        let delta = Math.round(currentSaleBuyer.offerPrice * increasePercent); //[cite: 40]
        
        if (currentSaleBuyer.offerPrice + delta > currentSaleBuyer.maxOfferPrice) { //[cite: 40]
            delta = currentSaleBuyer.maxOfferPrice - currentSaleBuyer.offerPrice; //[cite: 40]
        }

        if (delta <= 0) { //[cite: 40]
            if (thread) { //[cite: 40]
                thread.innerHTML += "<div class='chat-msg msg-player'>«Ну накинь еще чуток за состояние!»</div>"; //[cite: 40]
                thread.innerHTML += "<div class='chat-msg msg-seller'>«Брат, это мой край. Больше ни рубля не дам!»</div>"; //[cite: 40]
                thread.scrollTop = thread.scrollHeight; //[cite: 40]
            }
            showToast("⚠️ Покупатель достиг предела своего бюджета!"); //[cite: 40]
            return; //[cite: 40]
        }

        currentSaleBuyer.offerPrice += delta; //[cite: 40]
        setTxt("saleBuyerOfferVal", currentSaleBuyer.offerPrice.toLocaleString() + " ₽"); //[cite: 40]
        
        if (thread) { //[cite: 40]
            let playerLines = type === 'safe' //[cite: 40]
                ? ["«По кузову тут всё в родне, давай чуть дороже.»", "«Ты посмотри на состояние салона, она стоит своих денег.»"] //[cite: 40]
                : ["«За такую тачку и номера люди в очереди стоят. Накидывай!»", "«Меньше этой суммы даже разговаривать не буду, эксклюзив!»"]; //[cite: 40]
            let pLine = playerLines[Math.floor(Math.random() * playerLines.length)]; //[cite: 40]
            thread.innerHTML += "<div class='chat-msg msg-player'>" + pLine + "</div>"; //[cite: 40]
            thread.innerHTML += "<div class='chat-msg msg-seller'>«Уговорил... Накину " + delta.toLocaleString() + " ₽. По рукам?»</div>"; //[cite: 40]
            thread.scrollTop = thread.scrollHeight; //[cite: 40]
        }

        playSound('win'); //[cite: 40]
        tgHaptic('success'); //[cite: 40]
    } else { //[cite: 40]
        let damage = type === 'safe' ? Math.floor(18 + Math.random() * 12) : Math.floor(35 + Math.random() * 20); //[cite: 40]
        currentSaleBuyer.patience = Math.max(0, currentSaleBuyer.patience - damage); //[cite: 40]
        
        if (type === 'firm' && Math.random() < 0.35) { //[cite: 40]
            let cutback = Math.round(currentSaleBuyer.offerPrice * 0.03); //[cite: 40]
            currentSaleBuyer.offerPrice = Math.max(currentSaleBuyer.initialOfferPrice * 0.85, currentSaleBuyer.offerPrice - cutback); //[cite: 40]
            setTxt("saleBuyerOfferVal", currentSaleBuyer.offerPrice.toLocaleString() + " ₽"); //[cite: 40]
            if (thread) { //[cite: 40]
                thread.innerHTML += `<div class='chat-msg msg-seller color-red'>«Ах так? За твою наглость я сбиваю предложение на -${cutback.toLocaleString()} ₽!»</div>`; //[cite: 40]
            }
        }

        setTxt("saleBuyerPatienceText", currentSaleBuyer.patience + "%"); //[cite: 40]
        const fill = document.getElementById("saleBuyerPatienceFill"); //[cite: 40]
        if (fill) { //[cite: 40]
            fill.style.width = currentSaleBuyer.patience + "%"; //[cite: 40]
            fill.className = currentSaleBuyer.patience > 50 ? "risk-fill risk-low" : "risk-fill risk-high"; //[cite: 40]
        }

        if (thread) { //[cite: 40]
            let sLines = [
                "«Давай без сказок, я рынок знаю. Моя цена окончательная!»",
                "«Слушай, не борзей. Я и так хорошую цену предложил.»",
                "«Не надо мне тут наваливать, я с толщиномером всю её пробил!»"
            ]; //[cite: 40]
            let sLine = sLines[Math.floor(Math.random() * sLines.length)]; //[cite: 40]
            thread.innerHTML += "<div class='chat-msg msg-player'>«Цена космос, тачка эксклюзив!»</div>"; //[cite: 40]
            thread.innerHTML += "<div class='chat-msg msg-seller'>" + sLine + "</div>"; //[cite: 40]
            thread.scrollTop = thread.scrollHeight; //[cite: 40]
        }

        tgHaptic('warning'); //[cite: 40]

        if (currentSaleBuyer.patience <= 0) { //[cite: 40]
            dealIsAborted = true; //[cite: 40]
            setTimeout(() => { //[cite: 40]
                closeModal("modalHaggleSale"); //[cite: 40]
                slot.currentBuyer = null; //[cite: 40]
                slot.maxTimer = calculateLotWaitTime(); //[cite: 40]
                slot.timer = slot.maxTimer; //[cite: 40]
                saveState(); //[cite: 40]
                renderSalesLot(); //[cite: 40]
                updateHeaderUI(); //[cite: 40]
                openVerdictModal("ПОКУПАТЕЛЬ УШЁЛ 🚶‍♂️", "Покупатель устал от долгих споров и развернулся. Площадка ищет следующего клиента.", false); //[cite: 40]
            }, 1200); //[cite: 40]
        }
    }
}

// ========================================================
// ОФОРМЛЕНИЕ ДОГОВОРА КУПЛИ-ПРОДАЖИ (ДКП) БЕЗ НАЛОЖЕНИЙ
// ========================================================
function acceptBuyerOffer(idx) {
    if (dealIsAborted) return; //[cite: 40]
    const slot = state.salesLot[idx]; //[cite: 40]
    if (!slot || !slot.currentBuyer) return; //[cite: 40]

    const buyer = slot.currentBuyer; //[cite: 40]
    const car = slot.car; //[cite: 40]

    // Проверка криминала при быстрой продаже
    if ((car.isStolen || car.unregistered) && Math.random() < buyer.meticulous) { //[cite: 40]
        let crimReason = car.isStolen ? "перебитый VIN и розыск" : "аннулированный учёт по ст. 12.5.1"; //[cite: 40]
        state.salesLot.splice(idx, 1); //[cite: 40]
        let fine = 45000; //[cite: 40]
        state.player.cash = Math.max(0, (state.player.cash || 0) - fine); //[cite: 40]
        state.player.karma = Math.max(0, (state.player.karma || 50) - 25); //[cite: 40]
        saveState(); //[cite: 40]
        renderSalesLot(); //[cite: 40]
        updateHeaderUI(); //[cite: 40]
        openVerdictModal("ОБЛАВА ПОЛИЦИИ! 🚨", `Покупатель ${buyer.name} при проверке документов обнаружил ${crimReason} и вызвал ДПС! Автомобиль конфискован, выписан штраф -${fine.toLocaleString()} ₽!`, false); //[cite: 40]
        return; //[cite: 40]
    }

    const finalPrice = buyer.offerPrice; //[cite: 40]
    let purchaseCost = car.purchaseCost || car.basePrice || 100000; //[cite: 40]
    let rawProfit = finalPrice - purchaseCost; //[cite: 40]

    // Расчет налога 13% если авто стояло на учете в МРЭО и продано быстро (<30 дней)
    let taxAmount = 0; //[cite: 40]
    let netProfit = rawProfit; //[cite: 40]
    let isTaxApplied = false; //[cite: 40]

    if (car.isRegisteredOnPlayer && (car.ownershipDays || 0) < 30 && rawProfit > 0) { //[cite: 40]
        taxAmount = Math.round(rawProfit * 0.13); //[cite: 40]
        netProfit = rawProfit - taxAmount; //[cite: 40]
        isTaxApplied = true; //[cite: 40]
    }

    activePendingDKPDeal = {
        type: 'sale',
        lotIndex: idx,
        car: car,
        seller: (state.player && state.player.name) ? state.player.name : "Перекуп #777",
        buyer: buyer.name,
        price: finalPrice,
        rawProfit: rawProfit,
        profit: netProfit,
        tax: taxAmount,
        isTaxApplied: isTaxApplied
    }; //[cite: 40]

    openDKPModal(activePendingDKPDeal); //[cite: 40]
}

function openDKPModal(dealData) {
    if (dkpAutoCloseTimer) { //[cite: 40]
        clearInterval(dkpAutoCloseTimer); //[cite: 40]
        dkpAutoCloseTimer = null; //[cite: 40]
    }

    setTxt('dkpSellerName', dealData.seller); //[cite: 40]
    setTxt('dkpBuyerName', dealData.buyer); //[cite: 40]
    setTxt('dkpCarTitle', dealData.car.name); //[cite: 40]
    
    let power = dealData.car.power || 100; //[cite: 40]
    let mileage = typeof dealData.car.mileage === 'number' ? dealData.car.mileage.toLocaleString() : "85 000"; //[cite: 40]
    setTxt('dkpCarSpecs', `Мощность: <b>${power} л.с.</b> | Пробег: <b>${mileage} км</b>`);
    
    let plate = dealData.car.customPlate || dealData.car.plate || "ТРАНЗИТ"; //[cite: 40]
    setTxt('dkpCarPlate', plate); //[cite: 40]
    setTxt('dkpPriceAmount', dealData.price.toLocaleString() + " ₽"); //[cite: 40]

    const profitBadge = document.getElementById('dkpNetProfitBadge'); //[cite: 40]
    if (profitBadge) { //[cite: 40]
        if (dealData.profit !== undefined) { //[cite: 40]
            profitBadge.style.display = 'block'; //[cite: 40]
            let taxInfo = dealData.isTaxApplied ? ` (Удержан НДФЛ 13%: -${dealData.tax.toLocaleString()} ₽)` : ""; //[cite: 40]
            if (dealData.profit > 0) { //[cite: 40]
                profitBadge.className = 'text-xs text-center font-bold mb-2 color-green'; //[cite: 40]
                profitBadge.innerText = `Чистая прибыль от продажи: +${dealData.profit.toLocaleString()} ₽ 📈${taxInfo}`; //[cite: 40]
            } else if (dealData.profit < 0) { //[cite: 40]
                profitBadge.className = 'text-xs text-center font-bold mb-2 color-red'; //[cite: 40]
                profitBadge.innerText = `Убыток от сделки: ${dealData.profit.toLocaleString()} ₽ 📉`; //[cite: 40]
            } else {
                profitBadge.className = 'text-xs text-center font-bold mb-2 color-amber'; //[cite: 40]
                profitBadge.innerText = `Сделка закрыта в ноль (0 ₽)`; //[cite: 40]
            }
        } else {
            profitBadge.style.display = 'none'; //[cite: 40]
        }
    }

    const stamp = document.getElementById('dkpOfficialStamp'); //[cite: 40]
    if (stamp) stamp.classList.remove('stamp-approved'); //[cite: 40]

    setTxt('dkpSellerSig', "✓ Подписано"); //[cite: 40]
    setTxt('dkpBuyerSig', "✍️ Ожидает подписи..."); //[cite: 40]

    const btnSign = document.getElementById('btnSignDKP'); //[cite: 40]
    const btnClose = document.getElementById('btnCloseDKP'); //[cite: 40]
    const btnAbort = document.getElementById('btnAbortDKP'); //[cite: 40]

    if (btnSign) { //[cite: 40]
        btnSign.style.display = 'block'; //[cite: 40]
        btnSign.innerText = dealData.type === 'buy' ? "✍️ Подписать ДКП и выкупить ТС" : "✍️ Подписать ДКП и забрать деньги"; //[cite: 40]
    }
    if (btnAbort) { //[cite: 40]
        btnAbort.style.display = 'block'; //[cite: 40]
    }
    if (btnClose) btnClose.style.display = 'none'; //[cite: 40]

    const modal = document.getElementById('modalDKP'); //[cite: 40]
    if (modal) modal.classList.add('active'); //[cite: 40]
    playSound('tick'); //[cite: 40]
}

function abortDKPDeal() {
    if (dkpAutoCloseTimer) { //[cite: 40]
        clearInterval(dkpAutoCloseTimer); //[cite: 40]
        dkpAutoCloseTimer = null; //[cite: 40]
    }
    closeModal('modalDKP'); //[cite: 40]
    activePendingDKPDeal = null; //[cite: 40]
    playSound('tick'); //[cite: 40]
    showToast("Сделка расторгнута. Автомобиль остался у вас!"); //[cite: 40]
}

function confirmSignDKP() {
    if (!activePendingDKPDeal) return; //[cite: 40]
    const deal = activePendingDKPDeal; //[cite: 40]

    const stamp = document.getElementById('dkpOfficialStamp'); //[cite: 40]
    if (stamp) stamp.classList.add('stamp-approved'); //[cite: 40]

    setTxt('dkpBuyerSig', "✓ Подписано (Игрок)"); //[cite: 40]
    playSound('win'); //[cite: 40]
    tgHaptic('success'); //[cite: 40]

    const btnSign = document.getElementById('btnSignDKP'); //[cite: 40]
    const btnAbort = document.getElementById('btnAbortDKP'); //[cite: 40]
    const btnClose = document.getElementById('btnCloseDKP'); //[cite: 40]

    if (btnSign) btnSign.style.display = 'none'; //[cite: 40]
    if (btnAbort) btnAbort.style.display = 'none'; //[cite: 40]
    if (btnClose) { //[cite: 40]
        btnClose.style.display = 'block'; //[cite: 40]
        btnClose.innerText = "Готово (автозакрытие через 4с...)";
    }

    if (deal.type === 'sale') { //[cite: 40]
        state.salesLot.splice(deal.lotIndex, 1); //[cite: 40]
        
        let payout = deal.price; //[cite: 40]
        if (deal.isTaxApplied && deal.tax > 0) { //[cite: 40]
            payout -= deal.tax; //[cite: 40]
            showToast(`Удержан налог НДФЛ 13% с быстрой продажи: -${deal.tax.toLocaleString()} ₽`); //[cite: 40]
        }
        
        state.player.cash = (state.player.cash || 0) + payout; //[cite: 40]

        if (!state.player.stats) state.player.stats = { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 }; //[cite: 40]
        state.player.stats.sold = (state.player.stats.sold || 0) + 1; //[cite: 40]
        state.player.stats.totalNetProfit = (state.player.stats.totalNetProfit || 0) + deal.profit; //[cite: 40]

        if (deal.profit >= 0) { //[cite: 40]
            state.player.stats.profitableSales = (state.player.stats.profitableSales || 0) + 1; //[cite: 40]
        } else {
            state.player.stats.lossSales = (state.player.stats.lossSales || 0) + 1; //[cite: 40]
        }

        let car = deal.car; //[cite: 40]
        let isCleanCar = !car.rolledOdometer && !car.hasAdditive && !car.hiddenDefect && car.condition >= 85 && !car.isStolen && !car.unregistered; //[cite: 40]
        if (isCleanCar) { //[cite: 40]
            state.player.karma = Math.min(100, (state.player.karma || 50) + 5); //[cite: 40]
            showToast("🕊️ Честная сделка! Карма выросла (+5)"); //[cite: 40]
        }

        if (typeof PhoneManager !== 'undefined') { //[cite: 40]
            PhoneManager.pushBuyerFollowupSMS(car.name, false, deal.buyer); //[cite: 40]
        }

        if (typeof trackQuestProgress === 'function') { //[cite: 40]
            trackQuestProgress('sell_car', 1); //[cite: 40]
        }

        addXp(50); //[cite: 40]
        state.player.mood = Math.min(100, (state.player.mood || 80) + 10); //[cite: 40]

        saveState(); //[cite: 40]
        renderSalesLot(); //[cite: 40]
        updateHeaderUI(); //[cite: 40]
        showToast("🤝 ДКП зарегистрирован! Средства зачислены."); //[cite: 40]
    } else if (deal.type === 'buy') { //[cite: 40]
        closeModal('modalDKP'); //[cite: 40]
        if (typeof openRegistrationChoiceModal === 'function') { //[cite: 40]
            openRegistrationChoiceModal(deal); //[cite: 40]
        } else if (typeof finishMarketCarBuyProcess === 'function') { //[cite: 40]
            finishMarketCarBuyProcess(deal); //[cite: 40]
        }
        return; //[cite: 40]
    }

    let secondsLeft = 4;
    if (dkpAutoCloseTimer) clearInterval(dkpAutoCloseTimer); //[cite: 40]

    dkpAutoCloseTimer = setInterval(() => { //[cite: 40]
        secondsLeft--;
        if (btnClose) { //[cite: 40]
            btnClose.innerText = `Готово (закроется через ${secondsLeft}с...)`;
        }

        if (secondsLeft <= 0) { //[cite: 40]
            clearInterval(dkpAutoCloseTimer); //[cite: 40]
            dkpAutoCloseTimer = null; //[cite: 40]
            closeModal('modalDKP'); //[cite: 40]
        }
    }, 1000); //[cite: 40]
}

function confirmSaleFromHaggleModal() {
    if (dealIsAborted || activeHaggleLotIndex === null) return; //[cite: 40]
    closeModal("modalHaggleSale"); //[cite: 40]
    acceptBuyerOffer(activeHaggleLotIndex); //[cite: 40]
}

// Экспорт в глобальную область видимости
window.renderSalesLot = renderSalesLot; //[cite: 40]
window.generateBuyerForSlot = generateBuyerForSlot; //[cite: 40]
window.calculateLotWaitTime = calculateLotWaitTime; //[cite: 40]
window.useExpressTicket = useExpressTicket; //[cite: 40]
window.upgradeExpressCapacity = upgradeExpressCapacity; //[cite: 40]
window.cancelSalesLot = cancelSalesLot; //[cite: 40]
window.openSaleHaggleModal = openSaleHaggleModal; //[cite: 40]
window.rejectBuyerHaggle = rejectBuyerHaggle; //[cite: 40]
window.attemptHaggleSale = attemptHaggleSale; //[cite: 40]
window.acceptBuyerOffer = acceptBuyerOffer; //[cite: 40]
window.openDKPModal = openDKPModal; //[cite: 40]
window.abortDKPDeal = abortDKPDeal; //[cite: 40]
window.confirmSignDKP = confirmSignDKP; //[cite: 40]
window.confirmSaleFromHaggleModal = confirmSaleFromHaggleModal; //[cite: 40]
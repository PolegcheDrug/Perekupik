// ========================================================
// js/salesLot.js — ПЛОЩАДКА ПРОДАЖ, КАРМА И ЧЕСТНЫЙ ТОРГ (v0.4.6)
// Разработчики: Tak Toje, Max, Sergo, gemini
// Честная реакция покупателей без ложных обвинений в обмане,
// право отказаться от подписания ДКП, налог 13% при быстрой продаже
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
    let baseTime = Math.floor(60 + Math.random() * 120); // 60-180 сек
    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;

    let karmaFactor = 1.0 - ((karma - 50) / 100) * 0.8;
    karmaFactor = Math.max(0.5, Math.min(1.7, karmaFactor));

    return Math.max(15, Math.round(baseTime * karmaFactor));
}

function renderSalesLot() {
    const list = document.getElementById('salesLotList');
    if (!list) return;

    let count = (state.salesLot && state.salesLot.length) ? state.salesLot.length : 0;
    setTxt('lotCountBadge', count + " авто на продаже");
    
    let maxExpress = (state.player && state.player.maxExpressTickets) ? state.player.maxExpressTickets : 25;
    let curExpress = (state.player && state.player.expressTickets) ? state.player.expressTickets : 0;
    setTxt('expressCountDisplay', curExpress + " / " + maxExpress);

    if (!state.salesLot || state.salesLot.length === 0) {
        list.innerHTML = "<div class='glass-card text-center sub-label py-8'><i class='fa-solid fa-car-on color-cyan mb-2' style='font-size:32px;'></i><div>Площадка пуста. Выставьте автомобиль из гаража!</div></div>";
        return;
    }

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
    let karmaSpeedText = karma >= 70
        ? "<div class='text-xs color-green font-bold mt-1'>⚡ Высокая репутация: клиенты приходят на 40% быстрее</div>"
        : (karma < 40 ? "<div class='text-xs color-red font-bold mt-1'>🐌 Низкая репутация: покупатели приходят неохотно</div>" : "");

    let html = "";
    state.salesLot.forEach((lot, idx) => {
        if (!lot || !lot.car) return;

        let car = lot.car;
        let cName = car.name || "Автомобиль";
        let cImg = car.img || "assets/cars/economy/vaz-2107.jpg";
        let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
        let asking = lot.askingPrice || 100000;

        let statusBlock = "";
        if (!lot.currentBuyer) {
            let maxTime = lot.maxTimer || 120;
            let currentTimer = lot.timer || 0;
            let progressPct = Math.max(0, Math.min(100, ((maxTime - currentTimer) / maxTime) * 100));

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
            </div>`;
        } else {
            let buyer = lot.currentBuyer;
            let timeLeft = lot.buyerTimerLeft || 60;
            statusBlock = `
            <div class='p-2' style='background:rgba(0,230,118,0.1); border:1px solid var(--green); border-radius:8px;'>
                <div class='flex-between mb-1'>
                    <div class='flex-gap' style='align-items:center;'>
                        <span style='font-size:20px;'>${buyer.avatar}</span>
                        <div><b class='text-xs color-green' style='font-size:11px;'>${buyer.name}</b><div class='sub-label' style='font-size:9px;'>Осматривает авто у капота</div></div>
                    </div>
                    <span class='tag-badge bg-tag-amber' id='lot_buyer_timer_${idx}'>⏳ ${timeLeft}с</span>
                </div>
                <div class='flex-between mb-2'>
                    <span class='sub-label'>Предложение:</span>
                    <span class='price-val text-xs'>${buyer.offerPrice.toLocaleString()} ₽</span>
                </div>
                <div class='grid-2'>
                    <button onclick="openSaleHaggleModal(${idx})" class='btn btn-cyan btn-sm'>💬 Торговаться</button>
                    <button onclick="acceptBuyerOffer(${idx})" class='btn btn-green btn-sm'>Продать 🤝</button>
                </div>
            </div>`;
        }

        let regBadge = car.isRegisteredOnPlayer 
            ? "<span class='tag-badge bg-tag-green' style='font-size:8.5px;'>УЧЁТ РФ</span>"
            : "<span class='tag-badge bg-tag-amber' style='font-size:8.5px;'>НА ДКП</span>";

        let criminalBadge = car.isStolen 
            ? "<span class='tag-badge bg-tag-red ml-1' style='font-size:8.5px;'>В РОЗЫСКЕ</span>"
            : (car.unregistered ? "<span class='tag-badge bg-tag-red ml-1' style='font-size:8.5px;'>12.5.1</span>" : "");

        html += `
        <div class='glass-card mb-3'>
            <div class='car-img-wrap' style='height: 130px;'>
                <img src='${cImg}' class='car-img' onerror="this.src='assets/cars/economy/vaz-2107.jpg'">
                <div class='plate-corner'><div class='license-plate'>${cPlate} <div class='license-flag'>RUS</div></div></div>
                <div class='badge-tag' style='bottom:6px; right:6px;'>
                    ${regBadge}
                    ${criminalBadge}
                </div>
            </div>
            <div class='flex-between mb-2'>
                <div>
                    <h4 class='font-bold'>${cName}</h4>
                    <div class='sub-label'>Цена в объявлении: <b class='color-cyan'>${asking.toLocaleString()} ₽</b></div>
                </div>
                <button onclick='cancelSalesLot(${idx})' class='btn btn-dark btn-auto btn-sm'>Снять с продажи</button>
            </div>
            ${statusBlock}
        </div>`;
    });

    list.innerHTML = html;
}

function generateBuyerForSlot(slot) {
    if (!slot || !slot.car) return;
    const car = slot.car;
    let carCat = car.type ? car.type : 'economy';
    
    if (!BUYERS_CATALOG[carCat]) carCat = 'economy';
    const pool = BUYERS_CATALOG[carCat];
    const template = pool[Math.floor(Math.random() * pool.length)];
    
    let asking = slot.askingPrice ? slot.askingPrice : car.marketValue;
    let baseVal = car.marketValue || 100000;
    
    let tuneBonus = 0;
    if (car.tuning) {
        if (car.tuning.stance) tuneBonus += 0.05;
        if (car.tuning.customWheels) tuneBonus += 0.05;
        if (car.tuning.chip > 0) tuneBonus += 0.03;
    }
    if (car.isPolished) tuneBonus += 0.05;

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
    let karmaBonus = ((karma - 50) / 100) * 0.08;

    let plateBonus = 0;
    let cPlate = car.customPlate || car.plate;
    let pVal = (typeof calculatePlateValue === 'function') ? calculatePlateValue(cPlate) : 0;
    if (pVal >= 35000) {
        plateBonus = 0.20 + Math.random() * 0.15;
    }
    
    let rate = template.rate + tuneBonus + plateBonus + karmaBonus;
    let offer = Math.round(baseVal * (rate + (Math.random() * 0.06 - 0.03)));
    
    if (offer > asking * 1.10) offer = asking;
    if (offer < asking * 0.45) offer = Math.round(asking * 0.50);

    let calculatedMeticulous = template.meticulous || 0.3;
    if (karma < 40) calculatedMeticulous += 0.25;
    if (car.isStolen || car.unregistered) calculatedMeticulous += 0.20;

    slot.currentBuyer = {
        name: template.name,
        avatar: template.avatar,
        type: template.type,
        offerPrice: offer,
        initialOfferPrice: offer,
        maxOfferPrice: Math.round(offer * (1.06 + Math.random() * 0.10)),
        patience: 100,
        meticulous: Math.min(0.95, calculatedMeticulous),
        successfulHagglesCount: 0,
        maxAllowedHaggles: Math.floor(2 + Math.random() * 2)
    };
    
    slot.buyerTimerLeft = Math.floor(60 + Math.random() * 240);

    try {
        tgHaptic('success');
        playSound('tick');
    } catch(e) {}
    
    sendBackgroundNotification("Клиент у капота!", `Покупатель ${template.name} осматривает «${car.name}»`);

    let plateText = plateBonus > 0 ? " (🔥 Оценил красивый госномер!)" : "";
    showToast("🔔 На площадке клиент: " + template.name + plateText);
    renderSalesLot();
}

function sendBackgroundNotification(title, body) {
    if (document.visibilityState === 'hidden') {
        tgHaptic('warning');
        document.title = `🔔 ${title}`;
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        document.title = "Симулятор Перекупа v0.4.6";
    }
});

function upgradeExpressCapacity() {
    let cost = getExpressTicketUpgradeCost();
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < cost) return showToast("Нужно " + cost.toLocaleString() + " ₽ для расширения хранилища талонов!");
    
    state.player.cash -= cost;
    let maxT = (state.player && state.player.maxExpressTickets) ? state.player.maxExpressTickets : 25;
    state.player.maxExpressTickets = maxT + 25;
    state.player.expressTickets = state.player.maxExpressTickets;
    
    saveState();
    updateHeaderUI();
    renderSalesLot();
    playSound('win');
    tgHaptic('success');
    showToast("Склад пропусков расширен и заполнен! (Вместимость: " + state.player.maxExpressTickets + ")");
}

function useExpressTicket(idx) {
    let tck = (state.player && state.player.expressTickets) ? state.player.expressTickets : 0;
    if (tck <= 0) return showToast("У вас закончились экспресс-пропуски 🎟️! Подождите смены суток.");

    state.player.expressTickets -= 1;
    const slot = state.salesLot[idx];
    if (slot) {
        slot.timer = 0;
        generateBuyerForSlot(slot);
    }
    saveState();
    renderSalesLot();
    updateHeaderUI();
    showToast("⚡ Экспресс-пропуск применен! Покупатель найден мгновенно.");
}

function cancelSalesLot(idx) {
    const slot = state.salesLot[idx];
    if (!slot || !slot.car) return;

    let maxSlots = getTotalGarageSlots();
    let curSlots = state.garage ? state.garage.length : 0;
    if (curSlots >= maxSlots) return showToast("Гараж полон! Освободите место для возврата авто.");

    state.garage.push(slot.car);
    state.salesLot.splice(idx, 1);
    saveState();
    renderSalesLot();
    if (typeof renderGarage === 'function') renderGarage();
    updateHeaderUI();
    showToast("Автомобиль снят с продажи и возвращен в гараж.");
}

// ========================================================
// ЛОГИКА ТОРГА С ПРОВЕРКОЙ ЧЕСТНОСТИ
// ========================================================
let activeHaggleLotIndex = null;
let currentSaleBuyer = null;

function openSaleHaggleModal(idx) {
    dealIsAborted = false;
    activeHaggleLotIndex = idx;
    const slot = state.salesLot[idx];
    if (!slot || !slot.currentBuyer) return;

    currentSaleBuyer = slot.currentBuyer;
    const car = slot.car;

    const imgEl = document.getElementById("saleCarImg");
    if (imgEl) imgEl.src = car.img ? car.img : "assets/cars/economy/vaz-2107.jpg";
    
    setTxt("saleCarTitle", car.name ? car.name : "Автомобиль");
    setTxt("saleBuyerOfferVal", currentSaleBuyer.offerPrice.toLocaleString() + " ₽");
    setTxt("saleBuyerAvatar", currentSaleBuyer.avatar);
    setTxt("saleBuyerName", currentSaleBuyer.name);
    setTxt("saleBuyerPatienceText", currentSaleBuyer.patience + "%");

    const fill = document.getElementById("saleBuyerPatienceFill");
    if (fill) {
        fill.style.width = currentSaleBuyer.patience + "%";
        fill.className = currentSaleBuyer.patience > 50 ? "risk-fill risk-low" : "risk-fill risk-high";
    }

    const thread = document.getElementById("saleHaggleChatThread");
    if (thread) {
        const greetings = [
            "«Машина интересная, но цену надо обсудить...»",
            "«Осмотрел тачку, есть пара вопросов. Скидку сделаешь?»",
            "«Готов забрать сегодня за наличку, если подвинешься в цене.»",
            "«Ну что, оформляем? Только цену давай адекватную сделаем.»"
        ];
        let randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        thread.innerHTML = "<div class='chat-msg msg-seller' id='saleBuyerGreetingMsg'>" + randomGreeting + "</div>";
    }

    const modalButtons = document.querySelectorAll('#modalHaggleSale button');
    modalButtons.forEach(b => { 
        b.disabled = false;
        b.style.display = '';
        b.style.pointerEvents = 'auto';
    });

    const modal = document.getElementById("modalHaggleSale");
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function rejectBuyerHaggle() {
    if (activeHaggleLotIndex === null) return;
    const slot = state.salesLot[activeHaggleLotIndex];
    if (!slot) return;

    dealIsAborted = true;
    closeModal("modalHaggleSale");
    slot.currentBuyer = null;
    slot.maxTimer = calculateLotWaitTime();
    slot.timer = slot.maxTimer;
    saveState();
    renderSalesLot();
    updateHeaderUI();
    playSound('tick');
    showToast("Вы отказали клиенту: «Не сошлись по цене». Площадка ищет следующего!");
}

function attemptHaggleSale(type) {
    if (dealIsAborted || activeHaggleLotIndex === null || !currentSaleBuyer) return;
    
    const slot = state.salesLot[activeHaggleLotIndex];
    if (!slot) return;
    const car = slot.car;
    const thread = document.getElementById("saleHaggleChatThread");

    // 1. ПРОВЕРКА НА КРИМИНАЛ (УГОН, 12.5.1)
    let isCriminal = car.isStolen || car.unregistered;
    if (isCriminal) {
        let bustRoll = Math.random();
        if (bustRoll < currentSaleBuyer.meticulous) {
            dealIsAborted = true;
            const modalButtons = document.querySelectorAll('#modalHaggleSale button');
            modalButtons.forEach(b => { 
                b.disabled = true;
                b.style.pointerEvents = 'none';
            });

            let crimReason = car.isStolen ? "перебитый VIN и розыск в базе МВД!" : "аннулированный учёт по ст. 12.5.1!";
            if (thread) {
                thread.innerHTML += `
                    <div class="chat-msg msg-player">«Документы чистые, брат, забирай!»</div>
                    <div class="chat-msg msg-seller" style="background:#3b050d; border-color:var(--red);">
                        «Ты кого вздумал обмануть?! Я пробил базы: тут ${crimReason} Я вызываю наряд полиции!»
                    </div>`;
                thread.scrollTop = thread.scrollHeight;
            }

            tgHaptic('error');
            playSound('error');

            setTimeout(() => {
                closeModal("modalHaggleSale");
                state.salesLot.splice(activeHaggleLotIndex, 1);
                
                let fine = 45000;
                state.player.cash = Math.max(0, (state.player.cash || 0) - fine);
                state.player.karma = Math.max(0, (state.player.karma || 50) - 25);
                state.player.mood = Math.max(0, (state.player.mood || 80) - 30);
                
                saveState();
                renderSalesLot();
                updateHeaderUI();
                
                openVerdictModal(
                    "ПОЛИЦЕЙСКАЯ ОБЛАВА НА ПЛОЩАДКЕ! 🚨",
                    `Клиент вызвал наряд ДПС из-за криминального прошлого авто (${crimReason}). Автомобиль конфискован на спецстоянку!\nШтраф: -${fine.toLocaleString()} ₽ | Карма: -25`,
                    false
                );
            }, 1900);
            return;
        }
    }

    // 2. ПРОВЕРКА НА УМЫШЛЕННЫЙ ОБМАН ИГРОКА (ТОЛЬКО ЕСЛИ САМ СКРУТИЛ ИЛИ ЗАЛИЛ ПРИСАДКУ)
    let isIntentionalScam = !!car.rolledOdometer || !!car.hasAdditive;
    if (isIntentionalScam) {
        let scamRoll = Math.random();
        if (scamRoll < currentSaleBuyer.meticulous) {
            dealIsAborted = true;
            const modalButtons = document.querySelectorAll('#modalHaggleSale button');
            modalButtons.forEach(b => { 
                b.disabled = true;
                b.style.pointerEvents = 'none';
            });

            let scamReason = car.rolledOdometer
                ? "скрученный пробег!"
                : "залитую загущающую присадку в мотор!";

            if (thread) {
                thread.innerHTML += `
                    <div class="chat-msg msg-player">«Машина в идеале, брат, отвечаю!»</div>
                    <div class="chat-msg msg-seller" style="background:#3b050d; border-color:var(--red);">
                        «Ты кого развести вздумал?! Я подключил свой прибор и нашёл ${scamReason} Сделки не будет!»
                    </div>`;
                thread.scrollTop = thread.scrollHeight;
            }

            let karmaLoss = 15;
            state.player.karma = Math.max(0, (state.player.karma || 50) - karmaLoss);
            saveState();
            updateHeaderUI();
            tgHaptic('error');
            playSound('error');

            if (typeof PhoneManager !== 'undefined') {
                PhoneManager.pushBuyerFollowupSMS(car.name, true, currentSaleBuyer.name);
            }

            setTimeout(() => {
                closeModal("modalHaggleSale");
                slot.currentBuyer = null;
                slot.maxTimer = calculateLotWaitTime();
                slot.timer = slot.maxTimer;
                saveState();
                renderSalesLot();
                openVerdictModal("СКАНДАЛ НА ПЛОЩАДКЕ! 🚨", `Клиент раскусил обман (${scamReason}). Он ушёл и разнёс дурную славу. Карма упала на -${karmaLoss}!`, false);
            }, 1800);
            return;
        }
    }

    // 3. ЕСТЕСТВЕННЫЙ ИЗНОС (НЕ СЧИТАЕТСЯ ОБМАНОМ — ПОКУПАТЕЛЬ ПРОСТО СБИВАЕТ ЦЕНУ НА РЕМОНТ)
    if (car.hiddenDefect && !car.hasAdditive) {
        if (Math.random() < 0.40) {
            let repairDiscount = Math.round((car.hiddenDefect.cost || 15000) * 0.85);
            currentSaleBuyer.offerPrice = Math.max(10000, currentSaleBuyer.offerPrice - repairDiscount);
            setTxt("saleBuyerOfferVal", currentSaleBuyer.offerPrice.toLocaleString() + " ₽");

            if (thread) {
                thread.innerHTML += `
                    <div class="chat-msg msg-seller">
                        «Слушай, я прислушался к мотору: тут явно проблема (${car.hiddenDefect.text}). Либо скидываешь ${repairDiscount.toLocaleString()} ₽ на сервис, либо я пошёл.»
                    </div>`;
                thread.scrollTop = thread.scrollHeight;
            }
            tgHaptic('warning');
            playSound('tick');
            showToast("Покупатель заметил стук мотора и сбил цену на ремонт!");
            return;
        }
    }

    // 4. ПРОВЕРКА ЛИМИТА ТОРГА
    if (currentSaleBuyer.successfulHagglesCount >= currentSaleBuyer.maxAllowedHaggles) {
        if (thread) {
            thread.innerHTML += `
                <div class="chat-msg msg-player">«Может накинешь еще немного сверху?»</div>
                <div class="chat-msg msg-seller">«Всё, хватит! Я уже и так поднял цену до предела. Либо забираю по этой цене, либо я ухожу!»</div>`;
            thread.scrollTop = thread.scrollHeight;
        }
        showToast("⚠️ Покупатель упёрся в потолок своего бюджета!");
        return;
    }

    // 5. БАЗОВЫЙ РАСЧЁТ ТОРГА
    let baseSuccess = type === 'safe' ? 0.80 : 0.40;
    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    let statBonus = ((karma - 50) / 250) + (lvl / 300);
    
    let successChance = baseSuccess + statBonus;
    let success = Math.random() < successChance;

    if (success) {
        currentSaleBuyer.successfulHagglesCount += 1;
        let increasePercent = type === 'safe' ? (0.02 + Math.random() * 0.015) : (0.05 + Math.random() * 0.03);
        let delta = Math.round(currentSaleBuyer.offerPrice * increasePercent);
        
        if (currentSaleBuyer.offerPrice + delta > currentSaleBuyer.maxOfferPrice) {
            delta = currentSaleBuyer.maxOfferPrice - currentSaleBuyer.offerPrice;
        }

        if (delta <= 0) {
            if (thread) {
                thread.innerHTML += "<div class='chat-msg msg-player'>«Ну накинь еще чуток за состояние!»</div>";
                thread.innerHTML += "<div class='chat-msg msg-seller'>«Брат, это мой край. Больше ни рубля не дам!»</div>";
                thread.scrollTop = thread.scrollHeight;
            }
            showToast("⚠️ Покупатель достиг предела своего бюджета!");
            return;
        }

        currentSaleBuyer.offerPrice += delta;
        setTxt("saleBuyerOfferVal", currentSaleBuyer.offerPrice.toLocaleString() + " ₽");
        
        if (thread) {
            let playerLines = type === 'safe'
                ? ["«По кузову тут всё в родне, давай чуть дороже.»", "«Ты посмотри на состояние салона, она стоит своих денег.»"]
                : ["«За такую тачку и номера люди в очереди стоят. Накидывай!»", "«Меньше этой суммы даже разговаривать не буду, эксклюзив!»"];
            let pLine = playerLines[Math.floor(Math.random() * playerLines.length)];
            thread.innerHTML += "<div class='chat-msg msg-player'>" + pLine + "</div>";
            thread.innerHTML += "<div class='chat-msg msg-seller'>«Уговорил... Накину " + delta.toLocaleString() + " ₽. По рукам?»</div>";
            thread.scrollTop = thread.scrollHeight;
        }

        playSound('win');
        tgHaptic('success');
    } else {
        let damage = type === 'safe' ? Math.floor(18 + Math.random() * 12) : Math.floor(35 + Math.random() * 20);
        currentSaleBuyer.patience = Math.max(0, currentSaleBuyer.patience - damage);
        
        if (type === 'firm' && Math.random() < 0.35) {
            let cutback = Math.round(currentSaleBuyer.offerPrice * 0.03);
            currentSaleBuyer.offerPrice = Math.max(currentSaleBuyer.initialOfferPrice * 0.85, currentSaleBuyer.offerPrice - cutback);
            setTxt("saleBuyerOfferVal", currentSaleBuyer.offerPrice.toLocaleString() + " ₽");
            if (thread) {
                thread.innerHTML += `<div class='chat-msg msg-seller color-red'>«Ах так? За твою наглость я сбиваю предложение на -${cutback.toLocaleString()} ₽!»</div>`;
            }
        }

        setTxt("saleBuyerPatienceText", currentSaleBuyer.patience + "%");
        const fill = document.getElementById("saleBuyerPatienceFill");
        if (fill) {
            fill.style.width = currentSaleBuyer.patience + "%";
            fill.className = currentSaleBuyer.patience > 50 ? "risk-fill risk-low" : "risk-fill risk-high";
        }

        if (thread) {
            let sLines = [
                "«Давай без сказок, я рынок знаю. Моя цена окончательная!»",
                "«Слушай, не борзей. Я и так хорошую цену предложил.»",
                "«Не надо мне тут наваливать, я с толщиномером всю её пробил!»"
            ];
            let sLine = sLines[Math.floor(Math.random() * sLines.length)];
            thread.innerHTML += "<div class='chat-msg msg-player'>«Цена космос, тачка эксклюзив!»</div>";
            thread.innerHTML += "<div class='chat-msg msg-seller'>" + sLine + "</div>";
            thread.scrollTop = thread.scrollHeight;
        }

        tgHaptic('warning');

        if (currentSaleBuyer.patience <= 0) {
            dealIsAborted = true;
            setTimeout(() => {
                closeModal("modalHaggleSale");
                slot.currentBuyer = null;
                slot.maxTimer = calculateLotWaitTime();
                slot.timer = slot.maxTimer;
                saveState();
                renderSalesLot();
                updateHeaderUI();
                openVerdictModal("ПОКУПАТЕЛЬ УШЁЛ 🚶‍♂️", "Покупатель устал от долгих споров и развернулся. Площадка ищет следующего клиента.", false);
            }, 1200);
        }
    }
}

// ========================================================
// ОФОРМЛЕНИЕ ДОГОВОРА КУПЛИ-ПРОДАЖИ (ДКП)
// ========================================================
function acceptBuyerOffer(idx) {
    if (dealIsAborted) return;
    const slot = state.salesLot[idx];
    if (!slot || !slot.currentBuyer) return;

    const buyer = slot.currentBuyer;
    const car = slot.car;

    // Проверка криминала при быстрой продаже
    if ((car.isStolen || car.unregistered) && Math.random() < buyer.meticulous) {
        let crimReason = car.isStolen ? "перебитый VIN и розыск" : "аннулированный учёт по ст. 12.5.1";
        state.salesLot.splice(idx, 1);
        let fine = 45000;
        state.player.cash = Math.max(0, (state.player.cash || 0) - fine);
        state.player.karma = Math.max(0, (state.player.karma || 50) - 25);
        saveState();
        renderSalesLot();
        updateHeaderUI();
        openVerdictModal("ОБЛАВА ПОЛИЦИИ! 🚨", `Покупатель ${buyer.name} при проверке документов обнаружил ${crimReason} и вызвал ДПС! Автомобиль конфискован, выписан штраф -${fine.toLocaleString()} ₽!`, false);
        return;
    }

    const finalPrice = buyer.offerPrice;
    let purchaseCost = car.purchaseCost || car.basePrice || 100000;
    let rawProfit = finalPrice - purchaseCost;

    // Расчет налога 13% если авто стояло на учете в МРЭО и продано быстро (<30 дней)
    let taxAmount = 0;
    let netProfit = rawProfit;
    let isTaxApplied = false;

    if (car.isRegisteredOnPlayer && (car.ownershipDays || 0) < 30 && rawProfit > 0) {
        taxAmount = Math.round(rawProfit * 0.13);
        netProfit = rawProfit - taxAmount;
        isTaxApplied = true;
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
    };

    openDKPModal(activePendingDKPDeal);
}

function openDKPModal(dealData) {
    if (dkpAutoCloseTimer) {
        clearInterval(dkpAutoCloseTimer);
        dkpAutoCloseTimer = null;
    }

    setTxt('dkpSellerName', dealData.seller);
    setTxt('dkpBuyerName', dealData.buyer);
    setTxt('dkpCarTitle', dealData.car.name);
    
    let power = dealData.car.power || 100;
    let mileage = typeof dealData.car.mileage === 'number' ? dealData.car.mileage.toLocaleString() : "85 000";
    setTxt('dkpCarSpecs', `Мощность: ${power} л.с. | Пробег: ${mileage} км`);
    
    let plate = dealData.car.customPlate || dealData.car.plate || "ТРАНЗИТ";
    setTxt('dkpCarPlate', plate);
    setTxt('dkpPriceAmount', dealData.price.toLocaleString() + " ₽");

    const profitBadge = document.getElementById('dkpNetProfitBadge');
    if (profitBadge) {
        if (dealData.profit !== undefined) {
            profitBadge.style.display = 'block';
            let taxInfo = dealData.isTaxApplied ? ` (Удержан НДФЛ 13%: -${dealData.tax.toLocaleString()} ₽)` : "";
            if (dealData.profit > 0) {
                profitBadge.className = 'text-xs text-center font-bold mb-2 color-green';
                profitBadge.innerText = `Чистая прибыль от продажи: +${dealData.profit.toLocaleString()} ₽ 📈${taxInfo}`;
            } else if (dealData.profit < 0) {
                profitBadge.className = 'text-xs text-center font-bold mb-2 color-red';
                profitBadge.innerText = `Убыток от сделки: ${dealData.profit.toLocaleString()} ₽ 📉`;
            } else {
                profitBadge.className = 'text-xs text-center font-bold mb-2 color-amber';
                profitBadge.innerText = `Сделка закрыта в ноль (0 ₽)`;
            }
        } else {
            profitBadge.style.display = 'none';
        }
    }

    const stamp = document.getElementById('dkpOfficialStamp');
    if (stamp) stamp.classList.remove('stamp-approved');

    setTxt('dkpSellerSig', "✓ Подписано");
    setTxt('dkpBuyerSig', "✍️ Ожидает подписи...");

    const btnSign = document.getElementById('btnSignDKP');
    const btnClose = document.getElementById('btnCloseDKP');
    const btnAbort = document.getElementById('btnAbortDKP');

    if (btnSign) {
        btnSign.style.display = 'block';
        btnSign.innerText = dealData.type === 'buy' ? "✍️ Подписать ДКП и выкупить ТС" : "✍️ Подписать ДКП и забрать деньги";
    }
    if (btnAbort) {
        btnAbort.style.display = 'block';
    }
    if (btnClose) btnClose.style.display = 'none';

    const modal = document.getElementById('modalDKP');
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function abortDKPDeal() {
    if (dkpAutoCloseTimer) {
        clearInterval(dkpAutoCloseTimer);
        dkpAutoCloseTimer = null;
    }
    closeModal('modalDKP');
    activePendingDKPDeal = null;
    playSound('tick');
    showToast("Сделка расторгнута. Автомобиль остался у вас!");
}

function confirmSignDKP() {
    if (!activePendingDKPDeal) return;
    const deal = activePendingDKPDeal;

    const stamp = document.getElementById('dkpOfficialStamp');
    if (stamp) stamp.classList.add('stamp-approved');

    setTxt('dkpBuyerSig', "✓ Подписано (Игрок)");
    playSound('win');
    tgHaptic('success');

    const btnSign = document.getElementById('btnSignDKP');
    const btnAbort = document.getElementById('btnAbortDKP');
    const btnClose = document.getElementById('btnCloseDKP');

    if (btnSign) btnSign.style.display = 'none';
    if (btnAbort) btnAbort.style.display = 'none';
    if (btnClose) {
        btnClose.style.display = 'block';
        btnClose.innerText = "Готово (автозакрытие через 5с...)";
    }

    if (deal.type === 'sale') {
        state.salesLot.splice(deal.lotIndex, 1);
        
        let payout = deal.price;
        if (deal.isTaxApplied && deal.tax > 0) {
            payout -= deal.tax;
            showToast(`Удержан налог НДФЛ 13% с быстрой продажи: -${deal.tax.toLocaleString()} ₽`);
        }
        
        state.player.cash = (state.player.cash || 0) + payout;

        if (!state.player.stats) state.player.stats = { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 };
        state.player.stats.sold = (state.player.stats.sold || 0) + 1;
        state.player.stats.totalNetProfit = (state.player.stats.totalNetProfit || 0) + deal.profit;

        if (deal.profit >= 0) {
            state.player.stats.profitableSales = (state.player.stats.profitableSales || 0) + 1;
        } else {
            state.player.stats.lossSales = (state.player.stats.lossSales || 0) + 1;
        }

        let car = deal.car;
        let isCleanCar = !car.rolledOdometer && !car.hasAdditive && !car.hiddenDefect && car.condition >= 85 && !car.isStolen && !car.unregistered;
        if (isCleanCar) {
            state.player.karma = Math.min(100, (state.player.karma || 50) + 5);
            showToast("🕊️ Честная сделка! Карма выросла (+5)");
        }

        if (typeof PhoneManager !== 'undefined') {
            PhoneManager.pushBuyerFollowupSMS(car.name, false, deal.buyer);
        }

        if (typeof trackQuestProgress === 'function') {
            trackQuestProgress('sell_car', 1);
        }

        addXp(50);
        state.player.mood = Math.min(100, (state.player.mood || 80) + 10);

        saveState();
        renderSalesLot();
        updateHeaderUI();
        showToast("🤝 ДКП зарегистрирован! Средства зачислены.");
    } else if (deal.type === 'buy') {
        closeModal('modalDKP');
        if (typeof openRegistrationChoiceModal === 'function') {
            openRegistrationChoiceModal(deal);
        } else if (typeof finishMarketCarBuyProcess === 'function') {
            finishMarketCarBuyProcess(deal);
        }
        return;
    }

    let secondsLeft = 5;
    if (dkpAutoCloseTimer) clearInterval(dkpAutoCloseTimer);

    dkpAutoCloseTimer = setInterval(() => {
        secondsLeft--;
        if (btnClose) {
            btnClose.innerText = `Готово (закроется через ${secondsLeft}с...)`;
        }

        if (secondsLeft <= 0) {
            clearInterval(dkpAutoCloseTimer);
            dkpAutoCloseTimer = null;
            closeModal('modalDKP');
        }
    }, 1000);
}

function confirmSaleFromHaggleModal() {
    if (dealIsAborted || activeHaggleLotIndex === null) return;
    closeModal("modalHaggleSale");
    acceptBuyerOffer(activeHaggleLotIndex);
}

// Экспорт в глобальную область видимости
window.renderSalesLot = renderSalesLot;
window.generateBuyerForSlot = generateBuyerForSlot;
window.calculateLotWaitTime = calculateLotWaitTime;
window.useExpressTicket = useExpressTicket;
window.upgradeExpressCapacity = upgradeExpressCapacity;
window.cancelSalesLot = cancelSalesLot;
window.openSaleHaggleModal = openSaleHaggleModal;
window.rejectBuyerHaggle = rejectBuyerHaggle;
window.attemptHaggleSale = attemptHaggleSale;
window.acceptBuyerOffer = acceptBuyerOffer;
window.openDKPModal = openDKPModal;
window.abortDKPDeal = abortDKPDeal;
window.confirmSignDKP = confirmSignDKP;
window.confirmSaleFromHaggleModal = confirmSaleFromHaggleModal;
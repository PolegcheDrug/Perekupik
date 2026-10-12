// ========================================================
// js/salesLot.js — ПЛОЩАДКА ПРОДАЖ, КАРМА И ГАРАНТИЙНЫЙ ШАНТАЖ (v0.7.2)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Живые шкалы мощности и кузова, сонарный радар поиска клиента,
// эмодзи-индикатор терпения при торге (😊🤨😤🤬), гарантийные
// разборки за обман и официальный бланк ДКП.
// ========================================================

let dkpAutoCloseTimer = null;
let dealIsAborted = false;
let activeHaggleLotIndex = null;
let currentSaleBuyer = null;

function calculateCarUpgradesCost(car) {
    if (!car) return 0;
    let total = 0;
    let t = car.tuning || {};

    if (t.chip === 1) total += 30000;
    else if (t.chip === 2) total += 95000;
    else if (t.chip >= 3) total += 275000;

    if (t.weldedDiff) total += 12000;
    if (t.steeringAngle) total += 25000;
    if (t.hydroHandbrake) total += 35000;
    if (t.bucketSeats) total += 45000;
    if (t.dragSlicks) total += 45000;
    if (t.rollCage) total += 85000;
    if (t.exhaust) total += 35000;
    if (t.stance) total += 75000;
    if (t.customWheels) total += 60000;
    if (t.bodykit) total += 50000;

    if (car.isPolished) total += 7000;
    if (car.isRepainted) total += 25000;
    if (car.hasAdditive) total += 12000;
    if (car.rolledOdometer) total += 15000;

    return total;
}

function calculateLotWaitTime() {
    let baseTime = Math.floor(40 + Math.random() * 80);
    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;

    let karmaFactor = 1.0 - ((karma - 50) / 100) * 0.7;
    karmaFactor = Math.max(0.4, Math.min(1.5, karmaFactor));

    return Math.max(12, Math.round(baseTime * karmaFactor));
}

function getBuyerMoodEmoji(patience) {
    if (patience >= 75) return "😊";
    if (patience >= 50) return "🤨";
    if (patience >= 25) return "😤";
    return "🤬";
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
        let cPower = car.power || 100;
        let cImg = car.img || "assets/cars/economy/2101/vaz-2101.jpg";
        let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
        let asking = lot.askingPrice || 100000;

        let buyCost = car.purchaseCost || car.basePrice || 100000;
        let modsCost = calculateCarUpgradesCost(car);
        let totalInvested = buyCost + modsCost;
        let potentialMargin = asking - totalInvested;

        // Расчет процентов шкал
        let powerPct = Math.min(100, Math.round((cPower / 500) * 100));
        let condVal = car.condition || 80;
        let condClass = condVal >= 80 ? 'fill-condition-high' : (condVal >= 50 ? 'fill-condition-mid' : 'fill-condition-low');
        let condColor = condVal >= 80 ? 'color-green' : (condVal >= 50 ? 'color-amber' : 'color-red');
        let carMileage = (typeof car.mileage === 'number') ? car.mileage.toLocaleString() : "85 000";
        let mileagePct = Math.min(100, Math.round(((car.mileage || 85000) / 250000) * 100));

        let statusBlock = "";
        if (!lot.currentBuyer) {
            let maxTime = lot.maxTimer || 120;
            let currentTimer = lot.timer || 0;
            let progressPct = Math.max(0, Math.min(100, ((maxTime - currentTimer) / maxTime) * 100));

            statusBlock = `
            <div class='p-2' style='background:#090e18; border-radius:8px; border:1px solid var(--border-glass);'>
                <div class='flex-between text-xs mb-1'>
                    <span id='lot_timer_text_${idx}'>Ожидание клиента: <b>${currentTimer}с</b></span>
                    <span class='color-cyan font-bold'><i class='fa-solid fa-satellite-dish fa-spin'></i> Сканер клиентов</span>
                </div>
                <div class='telemetry-bar-bg mb-1' style='height:8px;'>
                    <div class='telemetry-bar-fill' id='lot_progress_fill_${idx}' style='width:${progressPct}%; background: linear-gradient(90deg, #9333ea, #00f2fe); box-shadow: 0 0 10px var(--cyan-glow);'></div>
                </div>
                ${karmaSpeedText}
                <button onclick='useExpressTicket(${idx})' class='btn btn-purple btn-sm w-full mt-2'>
                    ⚡ Ускорить поиск (1 Талон 🎟️)
                </button>
            </div>`;
        } else {
            let buyer = lot.currentBuyer;
            let timeLeft = lot.buyerTimerLeft || 60;
            let currentMargin = buyer.offerPrice - totalInvested;

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
                    <div class='text-right'>
                        <span class='price-val text-xs color-green' style='font-size:14px;'>${buyer.offerPrice.toLocaleString()} ₽</span>
                        <div class='sub-label' style='font-size:9px;'>Маржа: <b class="${currentMargin >= 0 ? 'color-green' : 'color-red'}">${currentMargin >= 0 ? '+' : ''}${currentMargin.toLocaleString()} ₽</b></div>
                    </div>
                </div>
                <div class='grid-2'>
                    <button onclick="openSaleHaggleModal(${idx})" class='btn btn-cyan btn-sm'>💬 Торговаться</button>
                    <button onclick="acceptBuyerOffer(${idx})" class='btn btn-green btn-sm'>Продать 🤝</button>
                </div>
            </div>`;
        }

        let regBadge = car.isRegisteredOnPlayer 
            ? "<span class='tag-badge bg-tag-green' style='font-size:8.5px;'><span class='led-dot led-green'></span> УЧЁТ РФ</span>" 
            : "<span class='tag-badge bg-tag-amber' style='font-size:8.5px;'><span class='led-dot led-amber'></span> НА ДКП (0% НАЛОГ)</span>";

        let criminalBadge = car.isStolen 
            ? "<span class='tag-badge badge-police-strobe ml-1' style='font-size:8.5px;'>🚨 В РОЗЫСКЕ</span>" 
            : (car.unregistered ? "<span class='tag-badge badge-police-strobe ml-1' style='font-size:8.5px;'>12.5.1</span>" : "");

        html += `
        <div class='glass-card mb-3'>
            <div class='car-img-wrap' style='height: 140px;'>
                <img src='${cImg}' class='car-img' onerror="this.src='assets/cars/economy/2101/vaz-2101.jpg'">
                <div class='plate-corner'><div class='license-plate'>${cPlate} <div class='license-flag'>RUS</div></div></div>
                <div class='badge-tag badge-br'>
                    ${regBadge}
                    ${criminalBadge}
                </div>
            </div>

            <div class='flex-between mb-2'>
                <h4 class='font-bold text-xs color-cyan' style='font-size:14px;'>${cName}</h4>
                <div class='price-val text-xs color-green' style='font-size:14px;'>
                    ${asking.toLocaleString()} ₽
                </div>
            </div>

            <!-- АНИМИРОВАННЫЕ ШКАЛЫ КАРТОЧКИ ПЛОЩАДКИ -->
            <div class="car-telemetry-panel mb-2">
                <div class="telemetry-row">
                    <div class="telemetry-label"><i class="fa-solid fa-bolt color-amber"></i> Мощность:</div>
                    <div class="telemetry-bar-bg">
                        <div class="telemetry-bar-fill fill-power" style="width:${powerPct}%;"></div>
                    </div>
                    <div class="telemetry-val color-amber">${cPower} л.с.</div>
                </div>

                <div class="telemetry-row">
                    <div class="telemetry-label"><i class="fa-solid fa-shield ${condColor}"></i> Кузов:</div>
                    <div class="telemetry-bar-bg">
                        <div class="telemetry-bar-fill ${condClass}" style="width:${condVal}%;"></div>
                    </div>
                    <div class="telemetry-val ${condColor}">${condVal}%</div>
                </div>

                <div class="telemetry-row">
                    <div class="telemetry-label"><i class="fa-solid fa-road color-cyan"></i> Пробег:</div>
                    <div class="telemetry-bar-bg">
                        <div class="telemetry-bar-fill fill-power" style="width:${mileagePct}%; background: linear-gradient(90deg, #0284c7, #38bdf8);"></div>
                    </div>
                    <div class="telemetry-val color-cyan">${carMileage} км</div>
                </div>
            </div>

            <!-- ФИНАНСОВЫЙ БЛОК: СЕБЕСТОИМОСТЬ, ТЮНИНГ И МАРЖА -->
            <div class='p-2 mb-2' style='background:#090e18; border-radius:8px; border:1px solid var(--border-glass); font-size:10px;'>
                <div class='flex-between mb-1'>
                    <span class='sub-label'>Себестоимость выкупа:</span>
                    <b>${buyCost.toLocaleString()} ₽</b>
                </div>
                <div class='flex-between mb-1'>
                    <span class='sub-label'>Вложено в доработки:</span>
                    <b class='color-amber'>+${modsCost.toLocaleString()} ₽</b>
                </div>
                <div class='flex-between pt-1' style='border-top:1px dashed rgba(255,255,255,0.08);'>
                    <span class='sub-label font-bold'>Ожидаемая чистая маржа:</span>
                    <b class='${potentialMargin >= 0 ? "color-green" : "color-red"} font-bold'>
                        ${potentialMargin >= 0 ? "+" : ""}${potentialMargin.toLocaleString()} ₽
                    </b>
                </div>
            </div>

            <div class='flex-between mb-2'>
                <span class='sub-label text-xs'>Цена в объявлении: <b class='color-cyan'>${asking.toLocaleString()} ₽</b></span>
                <button onclick='cancelSalesLot(${idx})' class='btn btn-dark btn-auto btn-sm' style='padding:4px 8px;'>Снять</button>
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
    
    const catalog = (typeof BUYERS_CATALOG !== 'undefined') ? BUYERS_CATALOG : {};
    if (!catalog[carCat]) carCat = 'economy';
    const pool = catalog[carCat] || [
        { name: "Покупатель", avatar: "🧔", rate: 1.10, type: "economy", meticulous: 0.3 }
    ];
    const template = pool[Math.floor(Math.random() * pool.length)];
    
    let asking = slot.askingPrice ? slot.askingPrice : car.marketValue;
    let baseVal = car.marketValue || car.basePrice || 100000;
    
    let tuneBonus = 0;
    if (car.tuning) {
        if (car.tuning.stance) tuneBonus += 0.05;
        if (car.tuning.customWheels) tuneBonus += 0.04;
        if (car.tuning.chip > 0) tuneBonus += 0.04;
        if (car.tuning.weldedDiff) tuneBonus += 0.03;
    }
    if (car.isPolished) tuneBonus += 0.06;
    if (car.isRepainted) tuneBonus += 0.04;

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
    let karmaBonus = ((karma - 50) / 100) * 0.08;

    let plateBonus = 0;
    let cPlate = car.customPlate || car.plate;
    let pVal = (typeof calculatePlateValue === 'function') ? calculatePlateValue(cPlate) : 0;
    if (pVal >= 35000) {
        plateBonus = 0.15 + Math.random() * 0.10;
    }
    
    let rate = (template.rate - 0.15) + tuneBonus + plateBonus + karmaBonus;
    let offer = Math.round(baseVal * (rate + (Math.random() * 0.06 - 0.03)));
    
    if (offer > asking * 1.08) offer = Math.round(asking * 1.02);
    if (offer < baseVal * 0.80) offer = Math.round(baseVal * 0.85);

    let calculatedMeticulous = template.meticulous || 0.3;
    if (karma < 40) calculatedMeticulous += 0.20;
    if (car.isStolen || car.unregistered) calculatedMeticulous += 0.25;

    slot.currentBuyer = {
        name: template.name,
        avatar: template.avatar,
        type: template.type,
        offerPrice: offer,
        initialOfferPrice: offer,
        maxOfferPrice: Math.round(offer * (1.05 + Math.random() * 0.05)),
        patience: 100,
        meticulous: Math.min(0.95, calculatedMeticulous),
        successfulHagglesCount: 0,
        maxAllowedHaggles: Math.floor(2 + Math.random() * 2)
    };
    
    slot.buyerTimerLeft = Math.floor(90 + Math.random() * 180);

    try {
        tgHaptic('success');
        playSound('tick');
    } catch(e) {}
    
    let plateText = plateBonus > 0 ? " (🔥 Оценил красивый госномер!)" : "";
    showToast("🔔 На площадке клиент: " + template.name + plateText);
    renderSalesLot();
}

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
// ЛОГИКА ТОРГА С ЖИВЫМИ ЭМОДЗИ ТЕРПЕНИЯ
// ========================================================
function openSaleHaggleModal(idx) {
    dealIsAborted = false;
    activeHaggleLotIndex = idx;
    const slot = state.salesLot[idx];
    if (!slot || !slot.currentBuyer) return;

    currentSaleBuyer = slot.currentBuyer;
    const car = slot.car;

    const imgEl = document.getElementById("saleCarImg");
    if (imgEl) imgEl.src = car.img ? car.img : "assets/cars/economy/2101/vaz-2101.jpg";
    
    let buyCost = car.purchaseCost || car.basePrice || 100000;
    let modsCost = calculateCarUpgradesCost(car);
    let totalInvested = buyCost + modsCost;
    let currentMargin = currentSaleBuyer.offerPrice - totalInvested;

    setTxt("saleCarTitle", car.name ? car.name : "Автомобиль");
    setTxt("saleBuyerOfferVal", currentSaleBuyer.offerPrice.toLocaleString() + " ₽");
    setTxt("saleBuyerAvatar", currentSaleBuyer.avatar);
    setTxt("saleBuyerName", currentSaleBuyer.name);
    
    updateSaleBuyerPatienceUI(currentSaleBuyer.patience);

    const thread = document.getElementById("saleHaggleChatThread");
    if (thread) {
        let marginInfo = `<div class='text-xs mb-1 sub-label' style='font-size:9.5px;'>Себестоимость: ${buyCost.toLocaleString()} ₽ | Тюнинг: +${modsCost.toLocaleString()} ₽ | Текущая маржа: <b class="${currentMargin >= 0 ? 'color-green' : 'color-red'}">${currentMargin >= 0 ? '+' : ''}${currentMargin.toLocaleString()} ₽</b></div>`;

        const greetings = [
            "«Машина интересная, цена неплохая, но давай обсудим детали...»",
            "«Осмотрел аппарат, готов брать прямо сейчас, если договоримся.»",
            "«За наличку прямо сейчас готов забрать. Сделаешь скидочку?»",
            "«Вижу, что ухаживал за тачкой. Оформляем ДКП?»"
        ];
        let randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        thread.innerHTML = marginInfo + "<div class='chat-msg msg-seller' id='saleBuyerGreetingMsg'>" + randomGreeting + "</div>";
    }

    const modalButtons = document.querySelectorAll('#modalHaggleSale button');
    modalButtons.forEach(b => {
        b.disabled = false;
        b.style.display = '';
        b.style.pointerEvents = 'auto';
    });

    ModalManager.open("modalHaggleSale", { closeOthers: true });
    playSound('tick');
}

function updateSaleBuyerPatienceUI(patience) {
    let emoji = getBuyerMoodEmoji(patience);
    setTxt("saleBuyerPatienceText", `${emoji} ${patience}%`);
    const fill = document.getElementById("saleBuyerPatienceFill");
    if (fill) {
        fill.style.width = patience + "%";
        fill.className = patience > 50 ? "risk-fill risk-low" : (patience > 25 ? "risk-fill risk-mid" : "risk-fill risk-high");
    }
}

function rejectBuyerHaggle() {
    if (activeHaggleLotIndex === null) return;
    const slot = state.salesLot[activeHaggleLotIndex];
    if (!slot) return;

    dealIsAborted = true;
    ModalManager.close("modalHaggleSale");
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

    // 1. Проверка на криминал
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
                ModalManager.close("modalHaggleSale");
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

    // 2. Проверка на умышленный обман
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

            setTimeout(() => {
                ModalManager.close("modalHaggleSale");
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

    // 3. Естественный износ
    if (car.hiddenDefect && !car.hasAdditive) {
        if (Math.random() < 0.35) {
            let repairDiscount = Math.round((car.hiddenDefect.cost || 15000) * 0.70);
            currentSaleBuyer.offerPrice = Math.max(10000, currentSaleBuyer.offerPrice - repairDiscount);
            setTxt("saleBuyerOfferVal", currentSaleBuyer.offerPrice.toLocaleString() + " ₽");

            if (thread) {
                thread.innerHTML += `
                    <div class="chat-msg msg-seller">
                        «Слушай, я прислушался к мотору: тут явно проблема (${car.hiddenDefect.text}). Скинь ${repairDiscount.toLocaleString()} ₽ на сервис, и я забираю.»
                    </div>`;
                thread.scrollTop = thread.scrollHeight;
            }
            tgHaptic('warning');
            playSound('tick');
            showToast("Покупатель заметил дефект и попросил скидку на ремонт!");
            return;
        }
    }

    // 4. Лимит торга
    if (currentSaleBuyer.successfulHagglesCount >= currentSaleBuyer.maxAllowedHaggles) {
        if (thread) {
            thread.innerHTML += `
                <div class="chat-msg msg-player">«Может накинешь еще немного сверху?»</div>
                <div class="chat-msg msg-seller">«Всё, это мой максимум! Либо забираю по этой цене, либо разворачиваюсь!»</div>`;
            thread.scrollTop = thread.scrollHeight;
        }
        showToast("⚠️ Покупатель достиг предела своего бюджета!");
        return;
    }

    // 5. Расчет торга
    let baseSuccess = type === 'safe' ? 0.75 : 0.40;
    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    let statBonus = ((karma - 50) / 250) + (lvl / 300);
    
    let successChance = baseSuccess + statBonus;
    let success = Math.random() < successChance;

    if (success) {
        currentSaleBuyer.successfulHagglesCount += 1;
        let increasePercent = type === 'safe' ? (0.02 + Math.random() * 0.03) : (0.05 + Math.random() * 0.04);
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
        spawnFloatingReward(`+${delta.toLocaleString()} ₽`);
        
        if (thread) {
            let playerLines = type === 'safe' 
                ? ["«По кузову тут всё в родне, салон ухожен, давай чуть дороже.»", "«Ты посмотри на состояние ходовой, она стоит этих денег.»"] 
                : ["«За такую тачку и номера люди в очереди стоят. Накидывай!»", "«Меньше этой суммы даже разговаривать не буду, эксклюзив!»"];
            let pLine = playerLines[Math.floor(Math.random() * playerLines.length)];
            thread.innerHTML += "<div class='chat-msg msg-player'>" + pLine + "</div>";
            thread.innerHTML += "<div class='chat-msg msg-seller'>«Уговорил... Накину +" + delta.toLocaleString() + " ₽. По рукам!»</div>";
            thread.scrollTop = thread.scrollHeight;
        }

        playSound('win');
        tgHaptic('success');
    } else {
        let damage = type === 'safe' ? Math.floor(20 + Math.random() * 15) : Math.floor(35 + Math.random() * 20);
        currentSaleBuyer.patience = Math.max(0, currentSaleBuyer.patience - damage);
        
        updateSaleBuyerPatienceUI(currentSaleBuyer.patience);

        if (thread) {
            let sLines = [
                "«Давай без сказок, я рынок знаю. Моя цена окончательная!»",
                "«Слушай, не наглей. Я и так отличное предложение сделал.»",
                "«Не надо мне рассказывать, я с толщиномером всю её промерил!»"
            ];
            let sLine = sLines[Math.floor(Math.random() * sLines.length)];
            thread.innerHTML += "<div class='chat-msg msg-player'>«Цена подарок, накидывай!»</div>";
            thread.innerHTML += "<div class='chat-msg msg-seller'>" + sLine + "</div>";
            thread.scrollTop = thread.scrollHeight;
        }

        tgHaptic('warning');

        if (currentSaleBuyer.patience <= 0) {
            dealIsAborted = true;
            setTimeout(() => {
                ModalManager.close("modalHaggleSale");
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
    let modsCost = calculateCarUpgradesCost(car);
    let totalInvested = purchaseCost + modsCost;
    let rawProfit = finalPrice - totalInvested;

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
        purchaseCost: purchaseCost,
        modsCost: modsCost,
        totalInvested: totalInvested,
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
    setTxt('dkpCarSpecs', `Мощность: <b>${power} л.с.</b> | Пробег: <b>${mileage} км</b>`);
    
    let plate = dealData.car.customPlate || dealData.car.plate || "ТРАНЗИТ";
    setTxt('dkpCarPlate', plate);
    setTxt('dkpPriceAmount', dealData.price.toLocaleString() + " ₽");

    const profitBadge = document.getElementById('dkpNetProfitBadge');
    if (profitBadge) {
        if (dealData.profit !== undefined) {
            profitBadge.style.display = 'block';
            let taxInfo = dealData.isTaxApplied ? ` (Удержан НДФЛ 13%: -${dealData.tax.toLocaleString()} ₽)` : " (ДКП без налога ✓)";
            let breakdown = `<div class='sub-label mb-1' style='font-size:9.5px;'>Выкуп: ${(dealData.purchaseCost || 0).toLocaleString()} ₽ | Вложено: +${(dealData.modsCost || 0).toLocaleString()} ₽</div>`;

            if (dealData.profit > 0) {
                profitBadge.className = 'text-xs text-center font-bold mb-2 color-green';
                profitBadge.innerHTML = `${breakdown}Чистая прибыль от продажи: +${dealData.profit.toLocaleString()} ₽ 📈${taxInfo}`;
            } else if (dealData.profit < 0) {
                profitBadge.className = 'text-xs text-center font-bold mb-2 color-red';
                profitBadge.innerHTML = `${breakdown}Убыток от сделки: ${dealData.profit.toLocaleString()} ₽ 📉`;
            } else {
                profitBadge.className = 'text-xs text-center font-bold mb-2 color-amber';
                profitBadge.innerHTML = `${breakdown}Сделка закрыта в ноль (0 ₽)`;
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

    ModalManager.open('modalDKP', { closeOthers: true });
    playSound('tick');
}

function abortDKPDeal() {
    if (dkpAutoCloseTimer) {
        clearInterval(dkpAutoCloseTimer);
        dkpAutoCloseTimer = null;
    }
    ModalManager.close('modalDKP');
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
        btnClose.innerText = "Готово (автозакрытие через 4с...)";
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
            state.player.karma = Math.min(100, (state.player.karma || 50) + 6);
            showToast("🕊️ Честная сделка! Карма выросла (+6)");
        }

        if (typeof AppAutodrot !== 'undefined' && typeof AppAutodrot.triggerBuyerReview === 'function') {
            AppAutodrot.triggerBuyerReview(car);
        }

        scheduleBuyerBackfireCheck(car, deal.buyer);

        if (typeof trackQuestProgress === 'function') {
            trackQuestProgress('sell_car', 1);
        }

        addXp(60);
        state.player.mood = Math.min(100, (state.player.mood || 80) + 15);

        saveState();
        renderSalesLot();
        updateHeaderUI();
        showToast("🤝 ДКП зарегистрирован! Средства зачислены.");
    } else if (deal.type === 'buy') {
        ModalManager.close('modalDKP');
        if (typeof openRegistrationChoiceModal === 'function') {
            openRegistrationChoiceModal(deal);
        } else if (typeof finishMarketCarBuyProcess === 'function') {
            finishMarketCarBuyProcess(deal);
        }
        return;
    }

    let secondsLeft = 4;
    if (dkpAutoCloseTimer) clearInterval(dkpAutoCloseTimer);

    dkpAutoCloseTimer = setInterval(() => {
        secondsLeft--;
        if (btnClose) {
            btnClose.innerText = `Готово (закроется через ${secondsLeft}с...)`;
        }

        if (secondsLeft <= 0) {
            clearInterval(dkpAutoCloseTimer);
            dkpAutoCloseTimer = null;
            ModalManager.close('modalDKP');
        }
    }, 1000);
}

// ========================================================
// МЕХАНИКА «ГАРАНТИЙНЫЙ ШАНТАЖ И ОБРАТКА»
// ========================================================
function scheduleBuyerBackfireCheck(car, buyerName) {
    if (!car) return;
    let isRisky = car.rolledOdometer || car.hasAdditive || (car.hiddenDefect && !car.repaired);
    if (!isRisky) return;

    if (Math.random() < 0.35) {
        setTimeout(() => {
            triggerBuyerBackfireEvent(car, buyerName);
        }, 15000 + Math.random() * 25000);
    }
}

function triggerBuyerBackfireEvent(car, buyerName) {
    const events = (typeof BUYER_BACKFIRE_EVENTS !== 'undefined') ? BUYER_BACKFIRE_EVENTS : [];
    let matchedEv = null;

    if (car.rolledOdometer) {
        matchedEv = events.find(e => e.trigger === 'rolledOdometer');
    } else if (car.hasAdditive) {
        matchedEv = events.find(e => e.trigger === 'hasAdditive');
    } else if (car.hiddenDefect) {
        matchedEv = events.find(e => e.trigger === 'hiddenDefect');
    }

    if (!matchedEv) {
        matchedEv = events[0] || {
            title: "Претензия по автомобилю",
            desc: "Покупатель обнаружил скрытый дефект и требует компенсацию!",
            penaltyCash: 50000,
            penaltyKarma: 15,
            reshalaCostConn: 1
        };
    }

    playSound('error');
    tgHaptic('error');

    let conn = state.player?.connections || 0;

    let resBox = document.getElementById('garageEventActions');
    setTxt('garageEventEmoji', "⚖️");
    setTxt('garageEventBadge', "ПРЕТЕНЗИЯ КЛИЕНТА");
    setTxt('garageEventTitle', matchedEv.title);
    setTxt('garageEventDesc', `Покупатель <b>${buyerName}</b> приехал с претензией к вашему боксу:<br>«${matchedEv.desc}»`);
    setTxt('garageEventCarName', `${car.name} (${car.customPlate || car.plate || "ТРАНЗИТ"})`);

    if (resBox) {
        resBox.innerHTML = `
            <div class="space-y-2">
                <button onclick="resolveBuyerBackfire('pay', ${matchedEv.penaltyCash}, ${matchedEv.penaltyKarma})" class="btn btn-danger btn-sm w-full">
                    Выплатить неустойку (-${matchedEv.penaltyCash.toLocaleString()} ₽) 💸
                </button>
                <button onclick="resolveBuyerBackfire('reshala', 0, 0, ${matchedEv.reshalaCostConn})" class="btn btn-purple btn-sm w-full" ${conn < matchedEv.reshalaCostConn ? 'disabled' : ''}>
                    Подключить Решалу Артура (${matchedEv.reshalaCostConn} 🤝) 🕶️
                </button>
                <button onclick="resolveBuyerBackfire('ignore', 0, ${matchedEv.penaltyKarma * 2})" class="btn btn-dark btn-sm w-full">
                    Послать подальше (-${matchedEv.penaltyKarma * 2} Кармы & Слив отзывов)
                </button>
            </div>
        `;
    }

    ModalManager.open('modalGarageEvent');
}

function resolveBuyerBackfire(action, cashPenalty, karmaPenalty, connCost = 1) {
    if (action === 'pay') {
        state.player.cash = Math.max(0, (state.player.cash || 0) - cashPenalty);
        state.player.karma = Math.max(0, (state.player.karma || 50) - karmaPenalty);
        showToast(`Вы выплатили компенсацию (-${cashPenalty.toLocaleString()} ₽). Конфликт улажен.`);
    } else if (action === 'reshala') {
        state.player.connections = Math.max(0, (state.player.connections || 0) - connCost);
        showToast("Решала Артур доходчиво объяснил клиенту, что претензии не принимаются! 🤝");
    } else {
        state.player.karma = Math.max(0, (state.player.karma || 50) - karmaPenalty);
        if (state.player.p2pReputation) {
            state.player.p2pReputation.rating = Math.max(1.0, (state.player.p2pReputation.rating || 5.0) - 0.5);
            state.player.p2pReputation.badReviews = (state.player.p2pReputation.badReviews || 0) + 1;
        }
        showToast("Вы проигнорировали клиента. Он слил рейтинг вашего салона в ноль!");
    }

    ModalManager.close('modalGarageEvent');
    saveState();
    updateHeaderUI();
}

function confirmSaleFromHaggleModal() {
    if (dealIsAborted || activeHaggleLotIndex === null) return;
    ModalManager.close("modalHaggleSale");
    acceptBuyerOffer(activeHaggleLotIndex);
}

// Экспорт в глобальную область видимости
window.calculateCarUpgradesCost = calculateCarUpgradesCost;
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
window.scheduleBuyerBackfireCheck = scheduleBuyerBackfireCheck;
window.triggerBuyerBackfireEvent = triggerBuyerBackfireEvent;
window.resolveBuyerBackfire = resolveBuyerBackfire;
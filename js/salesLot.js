// ========================================================
// js/salesLot.js — ПЛОЩАДКА ПРОДАЖ, КАРМА И ФОНОВЫЕ ПУШИ (v0.4.5)
// Разработчики: Илья Чепиль (DXF) & Perekup Dev Team
// Проверка криминала (угон / перебитый VIN / 12.5.1),
// расчет налога 13% при быстрой продаже и трекинг заданий
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

// Расчёт времени ожидания клиента с учётом Кармы игрока[span_0](start_span)[span_0](end_span)
function calculateLotWaitTime() {
    let baseTime = Math.floor(60 + Math.random() * 120); // 60-180 сек[span_1](start_span)[span_1](end_span)
    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50; //[span_2](start_span)[span_2](end_span)

    let karmaFactor = 1.0 - ((karma - 50) / 100) * 0.8; //[span_3](start_span)[span_3](end_span)
    karmaFactor = Math.max(0.5, Math.min(1.7, karmaFactor)); //[span_4](start_span)[span_4](end_span)

    return Math.max(15, Math.round(baseTime * karmaFactor)); //[span_5](start_span)[span_5](end_span)
}

function renderSalesLot() {
    const list = document.getElementById('salesLotList'); //[span_6](start_span)[span_6](end_span)
    if (!list) return; //[span_7](start_span)[span_7](end_span)

    let count = (state.salesLot && state.salesLot.length) ? state.salesLot.length : 0; //[span_8](start_span)[span_8](end_span)
    setTxt('lotCountBadge', count + " авто на продаже"); //[span_9](start_span)[span_9](end_span)
    
    let maxExpress = (state.player && state.player.maxExpressTickets) ? state.player.maxExpressTickets : 25; //[span_10](start_span)[span_10](end_span)
    let curExpress = (state.player && state.player.expressTickets) ? state.player.expressTickets : 0; //[span_11](start_span)[span_11](end_span)
    setTxt('expressCountDisplay', curExpress + " / " + maxExpress); //[span_12](start_span)[span_12](end_span)

    if (!state.salesLot || state.salesLot.length === 0) { //[span_13](start_span)[span_13](end_span)
        list.innerHTML = "<div class='glass-card text-center sub-label py-8'><i class='fa-solid fa-car-on color-cyan mb-2' style='font-size:32px;'></i><div>Площадка пуста. Выставьте автомобиль из гаража!</div></div>"; //[span_14](start_span)[span_14](end_span)
        return; //[span_15](start_span)[span_15](end_span)
    }

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50; //[span_16](start_span)[span_16](end_span)
    let karmaSpeedText = karma >= 70  //[span_17](start_span)[span_17](end_span)
        ? "<div class='text-xs color-green font-bold mt-1'>⚡ Высокая репутация: клиенты приходят на 40% быстрее</div>"  //[span_18](start_span)[span_18](end_span)
        : (karma < 40 ? "<div class='text-xs color-red font-bold mt-1'>🐌 Низкая репутация: покупатели приходят неохотно</div>" : ""); //[span_19](start_span)[span_19](end_span)

    let html = ""; //[span_20](start_span)[span_20](end_span)
    state.salesLot.forEach((lot, idx) => { //[span_21](start_span)[span_21](end_span)
        if (!lot || !lot.car) return; //[span_22](start_span)[span_22](end_span)

        let car = lot.car; //[span_23](start_span)[span_23](end_span)
        let cName = car.name || "Автомобиль"; //[span_24](start_span)[span_24](end_span)
        let cImg = car.img || "assets/cars/economy/vaz-2107.jpg"; //[span_25](start_span)[span_25](end_span)
        let cPlate = car.customPlate || car.plate || "ТРАНЗИТ"; //[span_26](start_span)[span_26](end_span)
        let asking = lot.askingPrice || 100000; //[span_27](start_span)[span_27](end_span)

        let statusBlock = ""; //[span_28](start_span)[span_28](end_span)
        if (!lot.currentBuyer) { //[span_29](start_span)[span_29](end_span)
            let maxTime = lot.maxTimer || 120; //[span_30](start_span)[span_30](end_span)
            let currentTimer = lot.timer || 0; //[span_31](start_span)[span_31](end_span)
            let progressPct = Math.max(0, Math.min(100, ((maxTime - currentTimer) / maxTime) * 100)); //[span_32](start_span)[span_32](end_span)

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
            </div>`; //[span_33](start_span)[span_33](end_span)
        } else {
            let buyer = lot.currentBuyer; //[span_34](start_span)[span_34](end_span)
            let timeLeft = lot.buyerTimerLeft || 60; //[span_35](start_span)[span_35](end_span)
            statusBlock = `
            <div class='p-2' style='background:rgba(0,230,118,0.1); border:1px solid var(--green); border-radius:8px;'>
                <div class='flex-between mb-1'>
                    <div class='flex-gap' style='align-items:center;'>
                        <span style='font-size:20px;'>${buyer.avatar}</span>
                        <div><b class='text-xs color-green'>${buyer.name}</b><div class='sub-label' style='font-size:9px;'>Осматривает авто у капота</div></div>
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
            </div>`; //[span_36](start_span)[span_36](end_span)
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

    list.innerHTML = html; //[span_37](start_span)[span_37](end_span)
}

function generateBuyerForSlot(slot) {
    if (!slot || !slot.car) return; //[span_38](start_span)[span_38](end_span)
    const car = slot.car; //[span_39](start_span)[span_39](end_span)
    let carCat = car.type ? car.type : 'economy'; //[span_40](start_span)[span_40](end_span)
    
    if (!BUYERS_CATALOG[carCat]) carCat = 'economy';
    const pool = BUYERS_CATALOG[carCat]; //[span_41](start_span)[span_41](end_span)
    const template = pool[Math.floor(Math.random() * pool.length)]; //[span_42](start_span)[span_42](end_span)
    
    let asking = slot.askingPrice ? slot.askingPrice : car.marketValue; //[span_43](start_span)[span_43](end_span)
    let baseVal = car.marketValue || 100000; //[span_44](start_span)[span_44](end_span)
    
    let tuneBonus = 0; //[span_45](start_span)[span_45](end_span)
    if (car.tuning) { //[span_46](start_span)[span_46](end_span)
        if (car.tuning.stance) tuneBonus += 0.05; //[span_47](start_span)[span_47](end_span)
        if (car.tuning.customWheels) tuneBonus += 0.05; //[span_48](start_span)[span_48](end_span)
        if (car.tuning.chip > 0) tuneBonus += 0.03; //[span_49](start_span)[span_49](end_span)
    }
    if (car.isPolished) tuneBonus += 0.05; //[span_50](start_span)[span_50](end_span)

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50; //[span_51](start_span)[span_51](end_span)
    let karmaBonus = ((karma - 50) / 100) * 0.08; //[span_52](start_span)[span_52](end_span)

    let plateBonus = 0; //[span_53](start_span)[span_53](end_span)
    let cPlate = car.customPlate || car.plate; //[span_54](start_span)[span_54](end_span)
    let pVal = (typeof calculatePlateValue === 'function') ? calculatePlateValue(cPlate) : 0; //[span_55](start_span)[span_55](end_span)
    if (pVal >= 35000) {
        plateBonus = 0.20 + Math.random() * 0.15;
    }
    
    let rate = template.rate + tuneBonus + plateBonus + karmaBonus; //[span_56](start_span)[span_56](end_span)
    let offer = Math.round(baseVal * (rate + (Math.random() * 0.06 - 0.03))); //[span_57](start_span)[span_57](end_span)
    
    if (offer > asking * 1.10) offer = asking; //[span_58](start_span)[span_58](end_span)
    if (offer < asking * 0.45) offer = Math.round(asking * 0.50); //[span_59](start_span)[span_59](end_span)

    let calculatedMeticulous = template.meticulous || 0.3; //[span_60](start_span)[span_60](end_span)
    if (karma < 40) calculatedMeticulous += 0.25; //[span_61](start_span)[span_61](end_span)
    if (car.isStolen || car.unregistered) calculatedMeticulous += 0.20;

    slot.currentBuyer = {
        name: template.name, //[span_62](start_span)[span_62](end_span)
        avatar: template.avatar, //[span_63](start_span)[span_63](end_span)
        type: template.type, //[span_64](start_span)[span_64](end_span)
        offerPrice: offer, //[span_65](start_span)[span_65](end_span)
        initialOfferPrice: offer, //[span_66](start_span)[span_66](end_span)
        maxOfferPrice: Math.round(offer * (1.06 + Math.random() * 0.10)), //[span_67](start_span)[span_67](end_span)
        patience: 100, //[span_68](start_span)[span_68](end_span)
        meticulous: Math.min(0.95, calculatedMeticulous), //[span_69](start_span)[span_69](end_span)
        successfulHagglesCount: 0, //[span_70](start_span)[span_70](end_span)
        maxAllowedHaggles: Math.floor(2 + Math.random() * 2) //[span_71](start_span)[span_71](end_span)
    };
    
    slot.buyerTimerLeft = Math.floor(60 + Math.random() * 240); //[span_72](start_span)[span_72](end_span)

    try {
        tgHaptic('success'); //[span_73](start_span)[span_73](end_span)
        playSound('tick'); //[span_74](start_span)[span_74](end_span)
    } catch(e) {}
    
    sendBackgroundNotification("Клиент у капота!", `Покупатель ${template.name} осматривает «${car.name}»`); //[span_75](start_span)[span_75](end_span)

    let plateText = plateBonus > 0 ? " (🔥 Оценил красивый госномер!)" : ""; //[span_76](start_span)[span_76](end_span)
    showToast("🔔 На площадке клиент: " + template.name + plateText); //[span_77](start_span)[span_77](end_span)
    renderSalesLot(); //[span_78](start_span)[span_78](end_span)
}

function sendBackgroundNotification(title, body) {
    if (document.visibilityState === 'hidden') { //[span_79](start_span)[span_79](end_span)
        tgHaptic('warning'); //[span_80](start_span)[span_80](end_span)
        document.title = `🔔 ${title}`; //[span_81](start_span)[span_81](end_span)
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { //[span_82](start_span)[span_82](end_span)
        document.title = "Симулятор Перекупа v0.4.5";
    }
});

function upgradeExpressCapacity() {
    let cost = getExpressTicketUpgradeCost(); //[span_83](start_span)[span_83](end_span)
    let cash = (state.player && state.player.cash) ? state.player.cash : 0; //[span_84](start_span)[span_84](end_span)
    if (cash < cost) return showToast("Нужно " + cost.toLocaleString() + " ₽ для расширения хранилища талонов!"); //[span_85](start_span)[span_85](end_span)
    
    state.player.cash -= cost; //[span_86](start_span)[span_86](end_span)
    let maxT = (state.player && state.player.maxExpressTickets) ? state.player.maxExpressTickets : 25; //[span_87](start_span)[span_87](end_span)
    state.player.maxExpressTickets = maxT + 25; //[span_88](start_span)[span_88](end_span)
    state.player.expressTickets = state.player.maxExpressTickets; //[span_89](start_span)[span_89](end_span)
    
    saveState(); //[span_90](start_span)[span_90](end_span)
    updateHeaderUI(); //[span_91](start_span)[span_91](end_span)
    renderSalesLot(); //[span_92](start_span)[span_92](end_span)
    playSound('win'); //[span_93](start_span)[span_93](end_span)
    tgHaptic('success'); //[span_94](start_span)[span_94](end_span)
    showToast("Склад пропусков расширен и заполнен! (Вместимость: " + state.player.maxExpressTickets + ")"); //[span_95](start_span)[span_95](end_span)
}

function useExpressTicket(idx) {
    let tck = (state.player && state.player.expressTickets) ? state.player.expressTickets : 0; //[span_96](start_span)[span_96](end_span)
    if (tck <= 0) return showToast("У вас закончились экспресс-пропуски 🎟️! Подождите смены суток.");

    state.player.expressTickets -= 1; //[span_97](start_span)[span_97](end_span)
    const slot = state.salesLot[idx]; //[span_98](start_span)[span_98](end_span)
    if (slot) { //[span_99](start_span)[span_99](end_span)
        slot.timer = 0; //[span_100](start_span)[span_100](end_span)
        generateBuyerForSlot(slot); //[span_101](start_span)[span_101](end_span)
    }
    saveState(); //[span_102](start_span)[span_102](end_span)
    renderSalesLot(); //[span_103](start_span)[span_103](end_span)
    updateHeaderUI(); //[span_104](start_span)[span_104](end_span)
    showToast("⚡ Экспресс-пропуск применен! Покупатель найден мгновенно."); //[span_105](start_span)[span_105](end_span)
}

function cancelSalesLot(idx) {
    const slot = state.salesLot[idx]; //[span_106](start_span)[span_106](end_span)
    if (!slot || !slot.car) return; //[span_107](start_span)[span_107](end_span)

    let maxSlots = getTotalGarageSlots(); //[span_108](start_span)[span_108](end_span)
    let curSlots = state.garage ? state.garage.length : 0; //[span_109](start_span)[span_109](end_span)
    if (curSlots >= maxSlots) return showToast("Гараж полон! Освободите место для возврата авто."); //[span_110](start_span)[span_110](end_span)

    state.garage.push(slot.car); //[span_111](start_span)[span_111](end_span)
    state.salesLot.splice(idx, 1); //[span_112](start_span)[span_112](end_span)
    saveState(); //[span_113](start_span)[span_113](end_span)
    renderSalesLot(); //[span_114](start_span)[span_114](end_span)
    if (typeof renderGarage === 'function') renderGarage(); //[span_115](start_span)[span_115](end_span)
    updateHeaderUI(); //[span_116](start_span)[span_116](end_span)
    showToast("Автомобиль снят с продажи и возвращен в гараж."); //[span_117](start_span)[span_117](end_span)
}

// ========================================================
// ЛОГИКА ТОРГА С ПРОВЕРКОЙ КРИМИНАЛА (УГОН, 12.5.1, ОБМАН)
// ========================================================
let activeHaggleLotIndex = null; //[span_118](start_span)[span_118](end_span)
let currentSaleBuyer = null; //[span_119](start_span)[span_119](end_span)

function openSaleHaggleModal(idx) {
    dealIsAborted = false; //[span_120](start_span)[span_120](end_span)
    activeHaggleLotIndex = idx; //[span_121](start_span)[span_121](end_span)
    const slot = state.salesLot[idx]; //[span_122](start_span)[span_122](end_span)
    if (!slot || !slot.currentBuyer) return; //[span_123](start_span)[span_123](end_span)

    currentSaleBuyer = slot.currentBuyer; //[span_124](start_span)[span_124](end_span)
    const car = slot.car; //[span_125](start_span)[span_125](end_span)

    const imgEl = document.getElementById("saleCarImg"); //[span_126](start_span)[span_126](end_span)
    if (imgEl) imgEl.src = car.img ? car.img : "assets/cars/economy/vaz-2107.jpg"; //[span_127](start_span)[span_127](end_span)
    
    setTxt("saleCarTitle", car.name ? car.name : "Автомобиль"); //[span_128](start_span)[span_128](end_span)
    setTxt("saleBuyerOfferVal", currentSaleBuyer.offerPrice.toLocaleString() + " ₽"); //[span_129](start_span)[span_129](end_span)
    setTxt("saleBuyerAvatar", currentSaleBuyer.avatar); //[span_130](start_span)[span_130](end_span)
    setTxt("saleBuyerName", currentSaleBuyer.name); //[span_131](start_span)[span_131](end_span)
    setTxt("saleBuyerPatienceText", currentSaleBuyer.patience + "%"); //[span_132](start_span)[span_132](end_span)

    const fill = document.getElementById("saleBuyerPatienceFill"); //[span_133](start_span)[span_133](end_span)
    if (fill) { //[span_134](start_span)[span_134](end_span)
        fill.style.width = currentSaleBuyer.patience + "%"; //[span_135](start_span)[span_135](end_span)
        fill.className = currentSaleBuyer.patience > 50 ? "risk-fill risk-low" : "risk-fill risk-high"; //[span_136](start_span)[span_136](end_span)
    }

    const thread = document.getElementById("saleHaggleChatThread"); //[span_137](start_span)[span_137](end_span)
    if (thread) { //[span_138](start_span)[span_138](end_span)
        const greetings = [
            "«Машина интересная, но цену надо обсудить...»",
            "«Осмотрел тачку, есть пара вопросов. Скидку сделаешь?»",
            "«Готов забрать сегодня за наличку, если подвинешься в цене.»",
            "«Ну что, оформляем? Только цену давай адекватную сделаем.»"
        ]; //[span_139](start_span)[span_139](end_span)
        let randomGreeting = greetings[Math.floor(Math.random() * greetings.length)]; //[span_140](start_span)[span_140](end_span)
        thread.innerHTML = "<div class='chat-msg msg-seller' id='saleBuyerGreetingMsg'>" + randomGreeting + "</div>"; //[span_141](start_span)[span_141](end_span)
    }

    const modalButtons = document.querySelectorAll('#modalHaggleSale button'); //[span_142](start_span)[span_142](end_span)
    modalButtons.forEach(b => { 
        b.disabled = false; //[span_143](start_span)[span_143](end_span)
        b.style.display = ''; //[span_144](start_span)[span_144](end_span)
        b.style.pointerEvents = 'auto'; //[span_145](start_span)[span_145](end_span)
    });

    const modal = document.getElementById("modalHaggleSale"); //[span_146](start_span)[span_146](end_span)
    if (modal) modal.classList.add('active'); //[span_147](start_span)[span_147](end_span)
    playSound('tick'); //[span_148](start_span)[span_148](end_span)
}

function attemptHaggleSale(type) {
    if (dealIsAborted || activeHaggleLotIndex === null || !currentSaleBuyer) return; //[span_149](start_span)[span_149](end_span)
    
    const slot = state.salesLot[activeHaggleLotIndex]; //[span_150](start_span)[span_150](end_span)
    if (!slot) return; //[span_151](start_span)[span_151](end_span)
    const car = slot.car; //[span_152](start_span)[span_152](end_span)
    const thread = document.getElementById("saleHaggleChatThread"); //[span_153](start_span)[span_153](end_span)

    // 1. ПРОВЕРКА НА КРИМИНАЛ (УГОН, 12.5.1, СКРУТКА, ПРИСАДКА)
    let isCriminal = car.isStolen || car.unregistered;
    let isDeceitful = car.rolledOdometer || car.hasAdditive || (car.hiddenDefect && !car.hasAdditive) || isCriminal; //[span_154](start_span)[span_154](end_span)
    
    if (isDeceitful) {
        let bustRoll = Math.random(); //[span_155](start_span)[span_155](end_span)
        if (bustRoll < currentSaleBuyer.meticulous) { //[span_156](start_span)[span_156](end_span)
            dealIsAborted = true; //[span_157](start_span)[span_157](end_span)

            const modalButtons = document.querySelectorAll('#modalHaggleSale button'); //[span_158](start_span)[span_158](end_span)
            modalButtons.forEach(b => { 
                b.disabled = true; //[span_159](start_span)[span_159](end_span)
                b.style.pointerEvents = 'none'; //[span_160](start_span)[span_160](end_span)
            });

            // Если криминал (угон или 12.5.1) -> Вызов полиции и конфискация
            if (isCriminal) {
                let crimReason = car.isStolen ? "перебитый VIN и розыск в базе МВД!" : "аннулированный учёт по ст. 12.5.1!";
                if (thread) {
                    thread.innerHTML += `
                        <div class="chat-msg msg-player">«Брат, документы в полном порядке, мамой клянусь!»</div>
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
                    state.player.karma = Math.max(0, (state.player.karma || 50) - 30);
                    state.player.mood = Math.max(0, (state.player.mood || 80) - 35);
                    
                    saveState();
                    renderSalesLot();
                    updateHeaderUI();
                    
                    openVerdictModal(
                        "ПОЛИЦЕЙСКАЯ ОБЛАВА НА ПЛОЩАДКЕ! 🚨",
                        `Клиент вызвал наряд ДПС из-за криминального прошлого авто (${crimReason}). Автомобиль конфискован на спецстоянку!\nШтраф: -${fine.toLocaleString()} ₽ | Карма: -30`,
                        false
                    );
                }, 1900);
                return;
            }

            // Бытовой обман (одометр, присадка, дефект)
            let scamReason = car.rolledOdometer  //[span_161](start_span)[span_161](end_span)
                ? "скрученный пробег!"  //[span_162](start_span)[span_162](end_span)
                : (car.hasAdditive ? "залитую загущающую присадку в мотор!" : "скрытый дефект агрегатов!"); //[span_163](start_span)[span_163](end_span)

            if (thread) { //[span_164](start_span)[span_164](end_span)
                thread.innerHTML += `
                    <div class="chat-msg msg-player">«Машина в идеале, брат, отвечаю!»</div>
                    <div class="chat-msg msg-seller" style="background:#3b050d; border-color:var(--red);">
                        «Ты кого развести вздумал?! Я подключил свой прибор и нашёл ${scamReason} Сделки не будет!»
                    </div>`; //[span_165](start_span)[span_165](end_span)
                thread.scrollTop = thread.scrollHeight; //[span_166](start_span)[span_166](end_span)
            }

            let karmaLoss = 20; //[span_167](start_span)[span_167](end_span)
            state.player.karma = Math.max(0, (state.player.karma || 50) - karmaLoss); //[span_168](start_span)[span_168](end_span)
            saveState(); //[span_169](start_span)[span_169](end_span)
            updateHeaderUI(); //[span_170](start_span)[span_170](end_span)
            tgHaptic('error'); //[span_171](start_span)[span_171](end_span)
            playSound('error'); //[span_172](start_span)[span_172](end_span)

            if (typeof PhoneManager !== 'undefined') { //[span_173](start_span)[span_173](end_span)
                PhoneManager.pushBuyerFollowupSMS(car.name, true, currentSaleBuyer.name); //[span_174](start_span)[span_174](end_span)
            }

            setTimeout(() => { //[span_175](start_span)[span_175](end_span)
                closeModal("modalHaggleSale"); //[span_176](start_span)[span_176](end_span)
                slot.currentBuyer = null; //[span_177](start_span)[span_177](end_span)
                slot.maxTimer = calculateLotWaitTime(); //[span_178](start_span)[span_178](end_span)
                slot.timer = slot.maxTimer; //[span_179](start_span)[span_179](end_span)
                saveState(); //[span_180](start_span)[span_180](end_span)
                renderSalesLot(); //[span_181](start_span)[span_181](end_span)
                openVerdictModal("СКАНДАЛ НА ПЛОЩАДКЕ! 🚨", `Клиент раскусил обман (${scamReason}). Он ушёл и разнёс дурную славу. Карма упала на -${karmaLoss}!`, false); //[span_182](start_span)[span_182](end_span)
            }, 1800); //[span_183](start_span)[span_183](end_span)
            return; //[span_184](start_span)[span_184](end_span)
        }
    }

    // 2. ПРОВЕРКА ЛИМИТА ТОРГА
    if (currentSaleBuyer.successfulHagglesCount >= currentSaleBuyer.maxAllowedHaggles) { //[span_185](start_span)[span_185](end_span)
        if (thread) { //[span_186](start_span)[span_186](end_span)
            thread.innerHTML += `
                <div class="chat-msg msg-player">«Может накинешь еще немного сверху?»</div>
                <div class="chat-msg msg-seller">«Всё, хватит! Я уже и так поднял цену до предела. Либо забираю по этой цене, либо я ухожу!»</div>`; //[span_187](start_span)[span_187](end_span)
            thread.scrollTop = thread.scrollHeight; //[span_188](start_span)[span_188](end_span)
        }
        showToast("⚠️ Покупатель упёрся в потолок своего бюджета!"); //[span_189](start_span)[span_189](end_span)
        return; //[span_190](start_span)[span_190](end_span)
    }

    // 3. БАЗОВЫЙ РАСЧЁТ
    let baseSuccess = type === 'safe' ? 0.80 : 0.40; //[span_191](start_span)[span_191](end_span)
    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50; //[span_192](start_span)[span_192](end_span)
    let lvl = (state.player && state.player.level) ? state.player.level : 1; //[span_193](start_span)[span_193](end_span)
    let statBonus = ((karma - 50) / 250) + (lvl / 300);  //[span_194](start_span)[span_194](end_span)
    
    let successChance = baseSuccess + statBonus; //[span_195](start_span)[span_195](end_span)
    let success = Math.random() < successChance; //[span_196](start_span)[span_196](end_span)

    if (success) { //[span_197](start_span)[span_197](end_span)
        currentSaleBuyer.successfulHagglesCount += 1; //[span_198](start_span)[span_198](end_span)
        let increasePercent = type === 'safe' ? (0.02 + Math.random() * 0.015) : (0.05 + Math.random() * 0.03); //[span_199](start_span)[span_199](end_span)
        let delta = Math.round(currentSaleBuyer.offerPrice * increasePercent); //[span_200](start_span)[span_200](end_span)
        
        if (currentSaleBuyer.offerPrice + delta > currentSaleBuyer.maxOfferPrice) { //[span_201](start_span)[span_201](end_span)
            delta = currentSaleBuyer.maxOfferPrice - currentSaleBuyer.offerPrice; //[span_202](start_span)[span_202](end_span)
        }

        if (delta <= 0) { //[span_203](start_span)[span_203](end_span)
            if (thread) { //[span_204](start_span)[span_204](end_span)
                thread.innerHTML += "<div class='chat-msg msg-player'>«Ну накинь еще чуток за состояние!»</div>"; //[span_205](start_span)[span_205](end_span)
                thread.innerHTML += "<div class='chat-msg msg-seller'>«Брат, это мой край. Больше ни рубля не дам!»</div>"; //[span_206](start_span)[span_206](end_span)
                thread.scrollTop = thread.scrollHeight; //[span_207](start_span)[span_207](end_span)
            }
            showToast("⚠️ Покупатель достиг предела своего бюджета!"); //[span_208](start_span)[span_208](end_span)
            return; //[span_209](start_span)[span_209](end_span)
        }

        currentSaleBuyer.offerPrice += delta; //[span_210](start_span)[span_210](end_span)
        setTxt("saleBuyerOfferVal", currentSaleBuyer.offerPrice.toLocaleString() + " ₽"); //[span_211](start_span)[span_211](end_span)
        
        if (thread) { //[span_212](start_span)[span_212](end_span)
            let playerLines = type === 'safe'  //[span_213](start_span)[span_213](end_span)
                ? ["«По кузову тут всё в родне, давай чуть дороже.»", "«Ты посмотри на состояние салона, она стоит своих денег.»"]  //[span_214](start_span)[span_214](end_span)
                : ["«За такую тачку и номера люди в очереди стоят. Накидывай!»", "«Меньше этой суммы даже разговаривать не буду, эксклюзив!»"]; //[span_215](start_span)[span_215](end_span)
            let pLine = playerLines[Math.floor(Math.random() * playerLines.length)]; //[span_216](start_span)[span_216](end_span)
            thread.innerHTML += "<div class='chat-msg msg-player'>" + pLine + "</div>"; //[span_217](start_span)[span_217](end_span)
            thread.innerHTML += "<div class='chat-msg msg-seller'>«Уговорил... Накину " + delta.toLocaleString() + " ₽. По рукам?»</div>"; //[span_218](start_span)[span_218](end_span)
            thread.scrollTop = thread.scrollHeight; //[span_219](start_span)[span_219](end_span)
        }

        playSound('win'); //[span_220](start_span)[span_220](end_span)
        tgHaptic('success'); //[span_221](start_span)[span_221](end_span)
    } else {
        let damage = type === 'safe' ? Math.floor(20 + Math.random() * 15) : Math.floor(40 + Math.random() * 25); //[span_222](start_span)[span_222](end_span)
        currentSaleBuyer.patience = Math.max(0, currentSaleBuyer.patience - damage); //[span_223](start_span)[span_223](end_span)
        
        if (type === 'firm' && Math.random() < 0.35) { //[span_224](start_span)[span_224](end_span)
            let cutback = Math.round(currentSaleBuyer.offerPrice * 0.03); //[span_225](start_span)[span_225](end_span)
            currentSaleBuyer.offerPrice = Math.max(currentSaleBuyer.initialOfferPrice * 0.85, currentSaleBuyer.offerPrice - cutback); //[span_226](start_span)[span_226](end_span)
            setTxt("saleBuyerOfferVal", currentSaleBuyer.offerPrice.toLocaleString() + " ₽"); //[span_227](start_span)[span_227](end_span)
            if (thread) { //[span_228](start_span)[span_228](end_span)
                thread.innerHTML += `<div class='chat-msg msg-seller color-red'>«Ах так? За твою наглость я сбиваю предложение на -${cutback.toLocaleString()} ₽!»</div>`; //[span_229](start_span)[span_229](end_span)
            }
        }

        setTxt("saleBuyerPatienceText", currentSaleBuyer.patience + "%"); //[span_230](start_span)[span_230](end_span)
        const fill = document.getElementById("saleBuyerPatienceFill"); //[span_231](start_span)[span_231](end_span)
        if (fill) { //[span_232](start_span)[span_232](end_span)
            fill.style.width = currentSaleBuyer.patience + "%"; //[span_233](start_span)[span_233](end_span)
            fill.className = currentSaleBuyer.patience > 50 ? "risk-fill risk-low" : "risk-fill risk-high"; //[span_234](start_span)[span_234](end_span)
        }

        if (thread) { //[span_235](start_span)[span_235](end_span)
            let sLines = [
                "«Давай без сказок, я рынок знаю. Моя цена окончательная!»",
                "«Слушай, не борзей. Я и так хорошую цену предложил.»",
                "«Не надо мне тут наваливать, я с толщиномером всю её пробил!»"
            ]; //[span_236](start_span)[span_236](end_span)
            let sLine = sLines[Math.floor(Math.random() * sLines.length)]; //[span_237](start_span)[span_237](end_span)
            thread.innerHTML += "<div class='chat-msg msg-player'>«Цена космос, тачка эксклюзив!»</div>"; //[span_238](start_span)[span_238](end_span)
            thread.innerHTML += "<div class='chat-msg msg-seller'>" + sLine + "</div>"; //[span_239](start_span)[span_239](end_span)
            thread.scrollTop = thread.scrollHeight; //[span_240](start_span)[span_240](end_span)
        }

        tgHaptic('warning'); //[span_241](start_span)[span_241](end_span)

        if (currentSaleBuyer.patience <= 0) { //[span_242](start_span)[span_242](end_span)
            dealIsAborted = true; //[span_243](start_span)[span_243](end_span)
            setTimeout(() => { //[span_244](start_span)[span_244](end_span)
                closeModal("modalHaggleSale"); //[span_245](start_span)[span_245](end_span)
                slot.currentBuyer = null; //[span_246](start_span)[span_246](end_span)
                slot.maxTimer = calculateLotWaitTime(); //[span_247](start_span)[span_247](end_span)
                slot.timer = slot.maxTimer; //[span_248](start_span)[span_248](end_span)
                saveState(); //[span_249](start_span)[span_249](end_span)
                renderSalesLot(); //[span_250](start_span)[span_250](end_span)
                updateHeaderUI(); //[span_251](start_span)[span_251](end_span)
                openVerdictModal("ПОКУПАТЕЛЬ УШЁЛ 🚶‍♂️", "Из-за излишней наглости в торгах покупатель развернулся и ушел. Площадка ищет следующего клиента.", false); //[span_252](start_span)[span_252](end_span)
            }, 1200); //[span_253](start_span)[span_253](end_span)
        }
    }
}

// ========================================================
// ОФОРМЛЕНИЕ ДОГОВОРА КУПЛИ-ПРОДАЖИ (ДКП)
// ========================================================
function acceptBuyerOffer(idx) {
    if (dealIsAborted) return; //[span_254](start_span)[span_254](end_span)
    const slot = state.salesLot[idx]; //[span_255](start_span)[span_255](end_span)
    if (!slot || !slot.currentBuyer) return; //[span_256](start_span)[span_256](end_span)

    const buyer = slot.currentBuyer; //[span_257](start_span)[span_257](end_span)
    const car = slot.car; //[span_258](start_span)[span_258](end_span)

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

    const finalPrice = buyer.offerPrice; //[span_259](start_span)[span_259](end_span)
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
        type: 'sale', //[span_260](start_span)[span_260](end_span)
        lotIndex: idx, //[span_261](start_span)[span_261](end_span)
        car: car, //[span_262](start_span)[span_262](end_span)
        seller: (state.player && state.player.name) ? state.player.name : "Перекуп #777", //[span_263](start_span)[span_263](end_span)
        buyer: buyer.name, //[span_264](start_span)[span_264](end_span)
        price: finalPrice, //[span_265](start_span)[span_265](end_span)
        rawProfit: rawProfit,
        profit: netProfit, //[span_266](start_span)[span_266](end_span)
        tax: taxAmount,
        isTaxApplied: isTaxApplied
    };

    openDKPModal(activePendingDKPDeal); //[span_267](start_span)[span_267](end_span)
}

function openDKPModal(dealData) {
    if (dkpAutoCloseTimer) { //[span_268](start_span)[span_268](end_span)
        clearInterval(dkpAutoCloseTimer); //[span_269](start_span)[span_269](end_span)
        dkpAutoCloseTimer = null; //[span_270](start_span)[span_270](end_span)
    }

    setTxt('dkpSellerName', dealData.seller); //[span_271](start_span)[span_271](end_span)
    setTxt('dkpBuyerName', dealData.buyer); //[span_272](start_span)[span_272](end_span)
    setTxt('dkpCarTitle', dealData.car.name); //[span_273](start_span)[span_273](end_span)
    
    let power = dealData.car.power || 100; //[span_274](start_span)[span_274](end_span)
    let mileage = typeof dealData.car.mileage === 'number' ? dealData.car.mileage.toLocaleString() : "85 000"; //[span_275](start_span)[span_275](end_span)
    setTxt('dkpCarSpecs', `Мощность: ${power} л.с. | Пробег: ${mileage} км`); //[span_276](start_span)[span_276](end_span)
    
    let plate = dealData.car.customPlate || dealData.car.plate || "ТРАНЗИТ"; //[span_277](start_span)[span_277](end_span)
    setTxt('dkpCarPlate', plate); //[span_278](start_span)[span_278](end_span)
    setTxt('dkpPriceAmount', dealData.price.toLocaleString() + " ₽"); //[span_279](start_span)[span_279](end_span)

    const profitBadge = document.getElementById('dkpNetProfitBadge'); //[span_280](start_span)[span_280](end_span)
    if (profitBadge) { //[span_281](start_span)[span_281](end_span)
        if (dealData.profit !== undefined) { //[span_282](start_span)[span_282](end_span)
            profitBadge.style.display = 'block'; //[span_283](start_span)[span_283](end_span)
            let taxInfo = dealData.isTaxApplied ? ` (Удержан НДФЛ 13%: -${dealData.tax.toLocaleString()} ₽)` : "";
            if (dealData.profit > 0) { //[span_284](start_span)[span_284](end_span)
                profitBadge.className = 'text-xs text-center font-bold mb-2 color-green'; //[span_285](start_span)[span_285](end_span)
                profitBadge.innerText = `Чистая прибыль от продажи: +${dealData.profit.toLocaleString()} ₽ 📈${taxInfo}`;
            } else if (dealData.profit < 0) { //[span_286](start_span)[span_286](end_span)
                profitBadge.className = 'text-xs text-center font-bold mb-2 color-red'; //[span_287](start_span)[span_287](end_span)
                profitBadge.innerText = `Убыток от сделки: ${dealData.profit.toLocaleString()} ₽ 📉`; //[span_288](start_span)[span_288](end_span)
            } else {
                profitBadge.className = 'text-xs text-center font-bold mb-2 color-amber'; //[span_289](start_span)[span_289](end_span)
                profitBadge.innerText = `Сделка закрыта в ноль (0 ₽)`; //[span_290](start_span)[span_290](end_span)
            }
        } else {
            profitBadge.style.display = 'none'; //[span_291](start_span)[span_291](end_span)
        }
    }

    const stamp = document.getElementById('dkpOfficialStamp'); //[span_292](start_span)[span_292](end_span)
    if (stamp) stamp.classList.remove('stamp-approved'); //[span_293](start_span)[span_293](end_span)

    setTxt('dkpSellerSig', "✓ Подписано"); //[span_294](start_span)[span_294](end_span)
    setTxt('dkpBuyerSig', "✍️ Ожидает подписи..."); //[span_295](start_span)[span_295](end_span)

    const btnSign = document.getElementById('btnSignDKP'); //[span_296](start_span)[span_296](end_span)
    const btnClose = document.getElementById('btnCloseDKP'); //[span_297](start_span)[span_297](end_span)
    if (btnSign) { //[span_298](start_span)[span_298](end_span)
        btnSign.style.display = 'block'; //[span_299](start_span)[span_299](end_span)
        btnSign.innerText = dealData.type === 'buy' ? "✍️ Подписать ДКП и выкупить ТС" : "✍️ Подписать ДКП и забрать деньги"; //[span_300](start_span)[span_300](end_span)
    }
    if (btnClose) btnClose.style.display = 'none'; //[span_301](start_span)[span_301](end_span)

    const modal = document.getElementById('modalDKP'); //[span_302](start_span)[span_302](end_span)
    if (modal) modal.classList.add('active'); //[span_303](start_span)[span_303](end_span)
    playSound('tick'); //[span_304](start_span)[span_304](end_span)
}

function confirmSignDKP() {
    if (!activePendingDKPDeal) return; //[span_305](start_span)[span_305](end_span)
    const deal = activePendingDKPDeal; //[span_306](start_span)[span_306](end_span)

    const stamp = document.getElementById('dkpOfficialStamp'); //[span_307](start_span)[span_307](end_span)
    if (stamp) stamp.classList.add('stamp-approved'); //[span_308](start_span)[span_308](end_span)

    setTxt('dkpBuyerSig', "✓ Подписано (Игрок)"); //[span_309](start_span)[span_309](end_span)
    playSound('win'); //[span_310](start_span)[span_310](end_span)
    tgHaptic('success'); //[span_311](start_span)[span_311](end_span)

    const btnSign = document.getElementById('btnSignDKP'); //[span_312](start_span)[span_312](end_span)
    const btnClose = document.getElementById('btnCloseDKP'); //[span_313](start_span)[span_313](end_span)
    if (btnSign) btnSign.style.display = 'none'; //[span_314](start_span)[span_314](end_span)
    if (btnClose) { //[span_315](start_span)[span_315](end_span)
        btnClose.style.display = 'block'; //[span_316](start_span)[span_316](end_span)
        btnClose.innerText = "Готово (автозакрытие через 5с...)"; //[span_317](start_span)[span_317](end_span)
    }

    if (deal.type === 'sale') { //[span_318](start_span)[span_318](end_span)
        state.salesLot.splice(deal.lotIndex, 1); //[span_319](start_span)[span_319](end_span)
        
        let payout = deal.price;
        if (deal.isTaxApplied && deal.tax > 0) {
            payout -= deal.tax;
            showToast(`Удержан налог НДФЛ 13% с быстрой продажи: -${deal.tax.toLocaleString()} ₽`);
        }
        
        state.player.cash = (state.player.cash || 0) + payout; //[span_320](start_span)[span_320](end_span)

        if (!state.player.stats) state.player.stats = { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 }; //[span_321](start_span)[span_321](end_span)
        state.player.stats.sold = (state.player.stats.sold || 0) + 1; //[span_322](start_span)[span_322](end_span)
        state.player.stats.totalNetProfit = (state.player.stats.totalNetProfit || 0) + deal.profit; //[span_323](start_span)[span_323](end_span)

        if (deal.profit >= 0) { //[span_324](start_span)[span_324](end_span)
            state.player.stats.profitableSales = (state.player.stats.profitableSales || 0) + 1; //[span_325](start_span)[span_325](end_span)
        } else {
            state.player.stats.lossSales = (state.player.stats.lossSales || 0) + 1; //[span_326](start_span)[span_326](end_span)
        }

        let car = deal.car; //[span_327](start_span)[span_327](end_span)
        let isCleanCar = !car.rolledOdometer && !car.hasAdditive && !car.hiddenDefect && car.condition >= 85 && !car.isStolen && !car.unregistered;
        if (isCleanCar) { //[span_328](start_span)[span_328](end_span)
            state.player.karma = Math.min(100, (state.player.karma || 50) + 5); //[span_329](start_span)[span_329](end_span)
            showToast("🕊️ Честная сделка! Карма выросла (+5)"); //[span_330](start_span)[span_330](end_span)
        }

        if (typeof PhoneManager !== 'undefined') { //[span_331](start_span)[span_331](end_span)
            PhoneManager.pushBuyerFollowupSMS(car.name, false, deal.buyer); //[span_332](start_span)[span_332](end_span)
        }

        if (typeof trackQuestProgress === 'function') {
            trackQuestProgress('sell_car', 1);
        }

        addXp(50); //[span_333](start_span)[span_333](end_span)
        state.player.mood = Math.min(100, (state.player.mood || 80) + 10); //[span_334](start_span)[span_334](end_span)

        saveState(); //[span_335](start_span)[span_335](end_span)
        renderSalesLot(); //[span_336](start_span)[span_336](end_span)
        updateHeaderUI(); //[span_337](start_span)[span_337](end_span)
        showToast("🤝 ДКП зарегистрирован! Средства зачислены."); //[span_338](start_span)[span_338](end_span)
    } else if (deal.type === 'buy') { //[span_339](start_span)[span_339](end_span)
        closeModal('modalDKP');
        if (typeof openRegistrationChoiceModal === 'function') {
            openRegistrationChoiceModal(deal);
        } else if (typeof finishMarketCarBuyProcess === 'function') { //[span_340](start_span)[span_340](end_span)
            finishMarketCarBuyProcess(deal); //[span_341](start_span)[span_341](end_span)
        }
        return;
    }

    let secondsLeft = 5; //[span_342](start_span)[span_342](end_span)
    if (dkpAutoCloseTimer) clearInterval(dkpAutoCloseTimer); //[span_343](start_span)[span_343](end_span)

    dkpAutoCloseTimer = setInterval(() => { //[span_344](start_span)[span_344](end_span)
        secondsLeft--; //[span_345](start_span)[span_345](end_span)
        if (btnClose) { //[span_346](start_span)[span_346](end_span)
            btnClose.innerText = `Готово (закроется через ${secondsLeft}с...)`; //[span_347](start_span)[span_347](end_span)
        }

        if (secondsLeft <= 0) { //[span_348](start_span)[span_348](end_span)
            clearInterval(dkpAutoCloseTimer); //[span_349](start_span)[span_349](end_span)
            dkpAutoCloseTimer = null; //[span_350](start_span)[span_350](end_span)
            closeModal('modalDKP'); //[span_351](start_span)[span_351](end_span)
        }
    }, 1000); //[span_352](start_span)[span_352](end_span)
}

function confirmSaleFromHaggleModal() {
    if (dealIsAborted || activeHaggleLotIndex === null) return; //[span_353](start_span)[span_353](end_span)
    closeModal("modalHaggleSale"); //[span_354](start_span)[span_354](end_span)
    acceptBuyerOffer(activeHaggleLotIndex); //[span_355](start_span)[span_355](end_span)
}

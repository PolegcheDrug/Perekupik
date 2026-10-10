// ========================================================
// js/salesLot.js — ПЛОЩАДКА ПРОДАЖ, ПОКУПАТЕЛИ И ТОРГ (v0.4.0)
// ========================================================

const BUYERS_CATALOG = {
    economy: [
        { name: "Студент Макс", avatar: "🧑‍🎓", rate: 0.82, type: "economy" },
        { name: "Таксист Ашот", avatar: "🧔", rate: 0.88, type: "economy" },
        { name: "Дед Михалыч", avatar: "👴", rate: 0.95, type: "economy" },
        { name: "Перекуп Саня", avatar: "😎", rate: 0.75, type: "economy" }
    ],
    comfort: [
        { name: "Менеджер Олег", avatar: "👨‍💼", rate: 0.88, type: "comfort" },
        { name: "Семейный Илья", avatar: "👨‍👩‍👦", rate: 0.92, type: "comfort" },
        { name: "Блогерша Аня", avatar: "👩‍🎤", rate: 0.95, type: "comfort" },
        { name: "Автоподборщик", avatar: "🕵️‍♂️", rate: 0.80, type: "comfort" }
    ],
    premium: [
        { name: "Бизнесмен Игорь", avatar: "🤵", rate: 0.90, type: "premium" },
        { name: "Мажор Артур", avatar: "🕺", rate: 0.98, type: "premium" },
        { name: "Депутат Виталий", avatar: "🕴️", rate: 0.85, type: "premium" },
        { name: "Владелец таксопарка", avatar: "🧔‍♂️", rate: 0.82, type: "premium" }
    ],
    hyper: [
        { name: "Шейх Мансур", avatar: "👳‍♂️", rate: 1.05, type: "hyper" },
        { name: "Олигарх Роман", avatar: "🛥️", rate: 0.95, type: "hyper" },
        { name: "Крипто-миллионер", avatar: "🤑", rate: 1.10, type: "hyper" }
    ]
};

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

    let html = "";
    state.salesLot.forEach((lot, idx) => {
        if (!lot || !lot.car) return;

        let car = lot.car;
        let cName = car.name ? car.name : "Автомобиль";
        let cImg = car.img ? car.img : "assets/cars/economy/vaz-2107.jpg";
        let cPlate = car.customPlate ? car.customPlate : (car.plate ? car.plate : "ТРАНЗИТ");
        let asking = lot.askingPrice ? lot.askingPrice : 100000;

        let statusBlock = "";
        if (!lot.currentBuyer) {
            let maxTime = lot.maxTimer || 180;
            let currentTimer = lot.timer || 0;
            let progressPct = Math.max(0, Math.min(100, ((maxTime - currentTimer) / maxTime) * 100));

            statusBlock = 
            "<div class='p-2' style='background:#090e18; border-radius:8px; border:1px solid var(--border-glass);'>" +
                "<div class='flex-between text-xs mb-1'>" +
                    "<span id='lot_timer_text_" + idx + "'>Ожидание клиента: " + currentTimer + "с</span>" +
                    "<span class='color-cyan font-bold'>Поиск покупателя</span>" +
                "</div>" +
                "<div class='container-progress-wrap'>" +
                    "<div class='container-progress-bar' id='lot_progress_fill_" + idx + "' style='width:" + progressPct + "%;'></div>" +
                "</div>" +
                "<button onclick='useExpressTicket(" + idx + ")' class='btn btn-purple btn-sm w-full mt-2'>" +
                    "⚡ Ускорить поиск (1 Талон 🎟️)" +
                "</button>" +
            "</div>";
        } else {
            let buyer = lot.currentBuyer;
            let timeLeft = lot.buyerTimerLeft ? lot.buyerTimerLeft : 60;
            statusBlock = 
            "<div class='p-2' style='background:rgba(0,230,118,0.1); border:1px solid var(--green); border-radius:8px;'>" +
                "<div class='flex-between mb-1'>" +
                    "<div class='flex-gap' style='align-items:center;'>" +
                        "<span style='font-size:20px;'>" + buyer.avatar + "</span>" +
                        "<div><b class='text-xs color-green'>" + buyer.name + "</b><div class='sub-label' style='font-size:9px;'>Осматривает авто у капота</div></div>" +
                    "</div>" +
                    "<span class='tag-badge bg-tag-amber' id='lot_buyer_timer_" + idx + "'>⏳ " + timeLeft + "с</span>" +
                "</div>" +
                "<div class='flex-between mb-2'>" +
                    "<span class='sub-label'>Предложение:</span>" +
                    "<span class='price-val text-xs'>" + buyer.offerPrice.toLocaleString() + " ₽</span>" +
                "</div>" +
                "<div class='grid-2'>" +
                    "<button onclick=\"openSaleHaggleModal(" + idx + ")\" class='btn btn-cyan btn-sm'>💬 Торговаться</button>" +
                    "<button onclick=\"acceptBuyerOffer(" + idx + ")\" class='btn btn-green btn-sm'>Продать 🤝</button>" +
                "</div>" +
            "</div>";
        }

        html += 
        "<div class='glass-card mb-3'>" +
            "<div class='car-img-wrap' style='height: 130px;'>" +
                "<img src='" + cImg + "' class='car-img' onerror=\"this.src='assets/cars/economy/vaz-2107.jpg'\">" +
                "<div class='plate-corner'><div class='license-plate'>" + cPlate + " <div class='license-flag'>RUS</div></div></div>" +
            "</div>" +
            "<div class='flex-between mb-2'>" +
                "<div>" +
                    "<h4 class='font-bold'>" + cName + "</h4>" +
                    "<div class='sub-label'>Цена в объявлении: <b class='color-cyan'>" + asking.toLocaleString() + " ₽</b></div>" +
                "</div>" +
                "<button onclick='cancelSalesLot(" + idx + ")' class='btn btn-dark btn-auto btn-sm'>Снять с продажи</button>" +
            "</div>" +
            statusBlock +
        "</div>";
    });

    list.innerHTML = html;
}

function generateBuyerForSlot(slot) {
    if (!slot || !slot.car) return;
    const car = slot.car;
    let carCat = car.type ? car.type : 'economy';
    
    if (!BUYERS_CATALOG[carCat]) carCat = 'premium';
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

    // ПЕРЕПЛАТА ЗА ЭКСКЛЮЗИВНЫЕ ГОСНОМЕРА (+30-50%)
    let plateBonus = 0;
    let cPlate = car.customPlate || car.plate;
    let pVal = (typeof calculatePlateValue === 'function') ? calculatePlateValue(cPlate) : 0;
    if (pVal >= 40000) {
        plateBonus = 0.30 + Math.random() * 0.20;
    }
    
    let rate = template.rate + tuneBonus + plateBonus;
    let offer = Math.round(baseVal * (rate + (Math.random() * 0.08 - 0.04)));
    
    if (offer > asking * 1.15) offer = asking;
    if (offer < asking * 0.5) offer = Math.round(asking * 0.55);

    slot.currentBuyer = {
        name: template.name,
        avatar: template.avatar,
        type: template.type,
        offerPrice: offer,
        maxOfferPrice: Math.round(offer * (1.08 + Math.random() * 0.14)),
        patience: 100
    };
    
    // Таймер терпения покупателя (от 1 до 5 минут)
    slot.buyerTimerLeft = Math.floor(60 + Math.random() * 240); 

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
    if (tck <= 0) return showToast("У вас закончились экспресс-пропуски 🎟️! Подождите смены дня.");

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
// ЛОГИКА ТОРГА И ДИАЛОГОВ
// ========================================================
let activeHaggleLotIndex = null;
let currentSaleBuyer = null;

function openSaleHaggleModal(idx) {
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
            "«Машина интересная, но цена кусается. Давай обсудим...»",
            "«Осмотрел тачку, есть пара вопросов. Скидку сделаешь?»",
            "«Готов забрать сегодня за наличку, если подвинешься в цене.»",
            "«Ну что, оформляем? Только цену давай адекватную сделаем.»"
        ];
        let randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        thread.innerHTML = "<div class='chat-msg msg-seller' id='saleBuyerGreetingMsg'>" + randomGreeting + "</div>";
    }

    const modal = document.getElementById("modalHaggleSale");
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function attemptHaggleSale(type) {
    if (activeHaggleLotIndex === null || !currentSaleBuyer) return;
    
    const slot = state.salesLot[activeHaggleLotIndex];
    if (!slot) return;

    let baseSuccess = type === 'safe' ? 0.85 : 0.45;
    let karma = (state.player && state.player.karma) ? state.player.karma : 50;
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    let statBonus = (karma / 500) + (lvl / 200); 
    
    let successChance = baseSuccess + statBonus;
    let success = Math.random() < successChance;

    const thread = document.getElementById("saleHaggleChatThread");

    if (success) {
        let increasePercent = type === 'safe' ? (0.02 + Math.random() * 0.01) : (0.06 + Math.random() * 0.03);
        let delta = Math.round(currentSaleBuyer.offerPrice * increasePercent);
        
        if (currentSaleBuyer.offerPrice + delta > currentSaleBuyer.maxOfferPrice) {
            delta = currentSaleBuyer.maxOfferPrice - currentSaleBuyer.offerPrice;
        }

        if (delta <= 0) {
            if (thread) {
                thread.innerHTML += "<div class='chat-msg msg-player'>«Может накинешь еще немного?»</div>";
                thread.innerHTML += "<div class='chat-msg msg-seller'>«Брат, это мой край. Больше ни копейки не дам, бюджет впритык!»</div>";
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
        let damage = type === 'safe' ? Math.floor(15 + Math.random() * 10) : Math.floor(45 + Math.random() * 20);
        currentSaleBuyer.patience = Math.max(0, currentSaleBuyer.patience - damage);
        
        setTxt("saleBuyerPatienceText", currentSaleBuyer.patience + "%");
        const fill = document.getElementById("saleBuyerPatienceFill");
        if (fill) {
            fill.style.width = currentSaleBuyer.patience + "%";
            fill.className = currentSaleBuyer.patience > 50 ? "risk-fill risk-low" : "risk-fill risk-high";
        }

        if (thread) {
            let pLine = type === 'safe' ? "«А если еще немного накинуть за хорошую историю?»" : "«Цена космос, тачка эксклюзив, бери или уходи!»";
            let sLines = [
                "«Давай без сказок, я рынок знаю. Моя цена окончательная!»",
                "«Слушай, не борзей. Я и так хорошую цену предложил.»",
                "«Не надо мне тут наваливать, я с толщиномером всю её пробил!»"
            ];
            let sLine = sLines[Math.floor(Math.random() * sLines.length)];
            thread.innerHTML += "<div class='chat-msg msg-player'>" + pLine + "</div>";
            thread.innerHTML += "<div class='chat-msg msg-seller'>" + sLine + "</div>";
            thread.scrollTop = thread.scrollHeight;
        }

        tgHaptic('warning');

        if (currentSaleBuyer.patience <= 0) {
            setTimeout(() => {
                closeModal("modalHaggleSale");
                slot.currentBuyer = null;
                slot.maxTimer = Math.floor(60 + Math.random() * 120);
                slot.timer = slot.maxTimer;
                saveState();
                renderSalesLot();
                updateHeaderUI();
                openVerdictModal("ПОКУПАТЕЛЬ УШЁЛ 🚶‍♂️", "Из-за излишней наглости в торгах покупатель развернулся и ушел. Слот ищет следующего клиента.", false);
            }, 1200);
        }
    }
}

function acceptBuyerOffer(idx) {
    const slot = state.salesLot[idx];
    if (!slot || !slot.currentBuyer) return;

    const buyer = slot.currentBuyer;
    const car = slot.car;
    const finalPrice = buyer.offerPrice;

    state.salesLot.splice(idx, 1);
    state.player.cash = (state.player.cash || 0) + finalPrice;

    let purchaseCost = car.purchaseCost ? car.purchaseCost : (car.basePrice ? car.basePrice : 100000);
    let netProfit = finalPrice - purchaseCost;

    if (!state.player.stats) state.player.stats = { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 };
    state.player.stats.sold = (state.player.stats.sold || 0) + 1;
    if (!state.player.stats.totalNetProfit) state.player.stats.totalNetProfit = 0;
    state.player.stats.totalNetProfit += netProfit;

    if (netProfit >= 0) {
        state.player.stats.profitableSales = (state.player.stats.profitableSales || 0) + 1;
    } else {
        state.player.stats.lossSales = (state.player.stats.lossSales || 0) + 1;
    }

    addXp(50);
    state.player.mood = Math.min(100, (state.player.mood || 80) + 10);

    saveState();
    renderSalesLot();
    updateHeaderUI();

    openVerdictModal("АВТО ПРОДАНО! 🤝", "ДКП подписан! Покупатель забрал «" + car.name + "» за " + finalPrice.toLocaleString() + " ₽.", true, finalPrice, netProfit);
}

function confirmSaleFromHaggleModal() {
    if (activeHaggleLotIndex === null) return;
    closeModal("modalHaggleSale");
    acceptBuyerOffer(activeHaggleLotIndex);
}
// ===================== Вкладка: ПЛОЩАДКА ПРОДАЖ (js/salesLot.js) =====================

let activeHaggleSlotIdx = null;

function upgradeExpressCapacity() {
    let maxT = 25;
    if (state.player && state.player.maxExpressTickets) maxT = state.player.maxExpressTickets;
    
    if (maxT >= 200) return showToast("Достигнут максимум склада талонов (200 шт)!");
    
    let cost = 50000;
    if (typeof getExpressTicketUpgradeCost === 'function') cost = getExpressTicketUpgradeCost();
    
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;
    
    if (cash < cost) return showToast("Не хватает денег! Нужно " + cost.toLocaleString() + " ₽");
    
    state.player.cash -= cost;
    state.player.maxExpressTickets = maxT + 25;
    saveState();
    renderSalesLot();
    tgHaptic('success');
    showToast("Вместимость склада увеличена до " + state.player.maxExpressTickets + " талонов!");
}

function renderSalesLot() {
    const list = document.getElementById('salesLotList');
    if (!list) return;
    
    let lCount = 0;
    if (state.salesLot && state.salesLot.length) lCount = state.salesLot.length;
    setTxt('lotCountBadge', lCount + " авто на продаже");
    
    let curT = 0;
    if (state.player && state.player.expressTickets) curT = state.player.expressTickets;
    let maxT = 25;
    if (state.player && state.player.maxExpressTickets) maxT = state.player.maxExpressTickets;
    setTxt('expressCountDisplay', curT + " / " + maxT);
    
    const upgBtn = document.getElementById('btnUpgradeTickets');
    if (upgBtn) {
        let cost = 50000;
        if (typeof getExpressTicketUpgradeCost === 'function') cost = getExpressTicketUpgradeCost();
        
        if (maxT >= 200) {
            upgBtn.innerText = "МАКСИМУМ";
            upgBtn.disabled = true;
        } else {
            upgBtn.innerText = "Расширить (" + (cost / 1000).toFixed(0) + "k ₽)";
            upgBtn.disabled = false;
        }
    }
    
    const mainContent = document.querySelector('.main-content');
    const scrollPos = mainContent ? mainContent.scrollTop : 0;
    
    let noLots = false;
    if (!state.salesLot) noLots = true;
    else if (state.salesLot.length === 0) noLots = true;
    
    if (noLots) {
        list.innerHTML = "<div class='glass-card text-center sub-label py-8'><i class='fa-solid fa-car-on color-green mb-2' style='font-size:32px;'></i><div>Площадка пуста. Выставьте авто из гаража!</div></div>";
        return;
    }
    
    let htmlContent = "";

    state.salesLot.forEach((slot, idx) => {
        if (!slot) return;
        if (!slot.car) return;
        
        const car = slot.car;
        const buyer = slot.currentBuyer;
        
        let progressPercent = ((30 - slot.timer) / 30) * 100;
        if (progressPercent < 0) progressPercent = 0;
        if (progressPercent > 100) progressPercent = 100;
        
        let clientStatus = "";
        if (slot.timer <= 0) clientStatus = "<span class='tag-badge bg-tag-green'>Клиент осматривает!</span>";
        
        let timerBlock = "";
        let buyerBlock = "";
        
        let pTck = 0;
        if (state.player && state.player.expressTickets) pTck = state.player.expressTickets;

        if (slot.timer > 0) {
            timerBlock = 
            "<div class='lot-progress-wrap'>" +
                "<div class='lot-progress-bar' id='lot_progress_fill_" + idx + "' style='width: " + progressPercent + "%;'></div>" +
            "</div>" +
            "<div class='sub-label mb-2 text-center' id='lot_timer_text_" + idx + "'>Ожидание покупателя: " + slot.timer + "с</div>" +
            "<div class='grid-2 mb-2'>" +
                "<button onclick='speedUpLotWithTicket(" + idx + ")' class='btn btn-purple btn-sm'>🎟️ Пропуск (" + pTck + " шт)</button>" +
                "<button onclick='speedUpLotWithStars(" + idx + ")' class='btn btn-amber btn-sm'>⭐ 5 Stars</button>" +
            "</div>";
        }

        if (buyer) {
            let disableHaggle = "";
            if (buyer.offerPrice === 0) disableHaggle = "disabled";
            
            let bAva = "👤"; if (buyer.avatar) bAva = buyer.avatar;
            let bName = "Покупатель"; if (buyer.name) bName = buyer.name;
            let bPrice = 0; if (buyer.offerPrice) bPrice = buyer.offerPrice;
            let bStat = ""; if (buyer.preStatus) bStat = buyer.preStatus;

            buyerBlock = 
            "<div class='glass-card p-3 mb-2' style='background:#090e18; border-color:var(--cyan);'>" +
                "<div class='flex-between mb-1'>" +
                    "<div class='font-bold text-xs color-cyan'>" + bAva + " " + bName + "</div>" +
                    "<div class='price-val'>" + bPrice.toLocaleString() + " ₽</div>" +
                "</div>" +
                "<div class='sub-label mb-2 color-amber' style='font-style:italic;'>«" + bStat + "»</div>" +
                "<div class='grid-3'>" +
                    "<button onclick='acceptBuyerDeal(" + idx + ")' class='btn btn-green btn-sm'>Продать</button>" +
                    "<button onclick='openHaggleSaleModal(" + idx + ")' class='btn btn-amber btn-sm' " + disableHaggle + ">Торг 🗣</button>" +
                    "<button onclick='rejectBuyerDeal(" + idx + ")' class='btn btn-dark btn-sm'>Отказать</button>" +
                "</div>" +
            "</div>";
        }

        let cImg = "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
        if (car.img) cImg = car.img;

        let cPlate = "ТРАНЗИТ";
        if (car.customPlate) cPlate = car.customPlate;
        else if (car.plate) cPlate = car.plate;

        let cName = "Автомобиль";
        if (car.name) cName = car.name;

        let sPrice = 0;
        if (slot.askingPrice) sPrice = slot.askingPrice;

        htmlContent += 
        "<div class='glass-card mb-3'>" +
            "<div class='car-img-wrap' style='height:135px;'>" +
                "<img src='" + cImg + "' class='car-img' onerror=\"this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'\">" +
                "<div class='plate-corner'><div class='license-plate'>" + cPlate + "</div></div>" +
            "</div>" +
            "<div class='flex-between mb-2'>" +
                "<div>" +
                    "<h4 class='font-bold'>" + cName + "</h4>" +
                    "<div class='sub-label'>Цена выставления: <b class='color-green'>" + sPrice.toLocaleString() + " ₽</b></div>" +
                "</div>" +
                "<div>" + clientStatus + "</div>" +
            "</div>" +
            timerBlock +
            buyerBlock +
            "<button onclick='withdrawFromLot(" + idx + ")' class='btn btn-dark w-full mt-1 btn-sm'>Забрать обратно в гараж</button>" +
        "</div>";
    });

    list.innerHTML = htmlContent;
    if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
}

function speedUpLotWithTicket(idx) {
    let tck = 0;
    if (state.player && state.player.expressTickets) tck = state.player.expressTickets;
    
    if (tck <= 0) {
        return showToast("Нет пропусков! Купите у Решалы или дождитесь смены дня.");
    }
    state.player.expressTickets -= 1;
    const slot = state.salesLot[idx];
    if (!slot) return;
    slot.timer = 0;
    generateBuyerForSlot(slot);
    saveState();
    renderSalesLot();
    tgHaptic('success');
    showToast("🎟️ Экспресс-пропуск активирован! Клиент подошёл к капоту.");
}

function speedUpLotWithStars(idx) {
    let stars = 0;
    if (state.player && state.player.stars) stars = state.player.stars;

    if (stars < 5) return showToast("Не хватает 5 Telegram Stars ⭐!");
    state.player.stars -= 5;
    const slot = state.salesLot[idx];
    if (!slot) return;
    slot.timer = 0;
    generateBuyerForSlot(slot);
    saveState();
    renderSalesLot();
    tgHaptic('success');
    showToast("⭐ VIP-покупатель сразу у капота!");
}

function openHaggleSaleModal(idx) {
    activeHaggleSlotIdx = idx;
    const slot = state.salesLot[idx];
    if (!slot) return;
    if (!slot.currentBuyer) return;
    const buyer = slot.currentBuyer;
    
    let karma = 50;
    if (state.player && state.player.karma) karma = state.player.karma;

    let bKarma = 0;
    if (buyer.minKarma) bKarma = buyer.minKarma;

    if (karma < bKarma) {
        return showToast("Ваша репутация слишком низкая для торга с этим покупателем!");
    }
    
    let riskClass = "color-red";
    let fillClass = "risk-high";
    if (buyer.patience > 50) {
        riskClass = "color-green";
        fillClass = "risk-low";
    }

    let bAva = "👤"; if (buyer.avatar) bAva = buyer.avatar;
    let bName = "Покупатель"; if (buyer.name) bName = buyer.name;
    let bPrice = 0; if (buyer.offerPrice) bPrice = buyer.offerPrice;

    const html = 
    "<div class='modal-box'>" +
        "<h4 class='text-center mb-1'><i class='fa-solid fa-comments-dollar color-amber'></i> Торг у капота</h4>" +
        "<div class='text-xs color-cyan text-center font-bold mb-1'>" + bAva + " " + bName + "</div>" +
        "<div class='sub-label text-center mb-2 color-amber'>Предложение: <b>" + bPrice.toLocaleString() + " ₽</b></div>" +
        "<div class='risk-meter-box mb-2'>" +
            "<div class='flex-between text-xs'>" +
                "<span>Терпение покупателя:</span>" +
                "<b class='" + riskClass + "'>" + buyer.patience + "%</b>" +
            "</div>" +
            "<div class='risk-track'>" +
                "<div class='risk-fill " + fillClass + "' style='width: " + buyer.patience + "%;'></div>" +
            "</div>" +
        "</div>" +
        "<div class='space-y-2 mb-3'>" +
            "<button onclick=\"attemptHaggleSale('safe')\" class='btn btn-dark w-full'>🛡 Обосновать по кузову (+2% / Риск 15%)</button>" +
            "<button onclick=\"attemptHaggleSale('firm')\" class='btn btn-dark w-full'>🔥 Давить на эксклюзив (+6% / Риск 45%)</button>" +
        "</div>" +
        "<button onclick=\"closeModal('modalHaggleSale')\" class='btn btn-dark w-full'>Назад к предложению</button>" +
    "</div>";
    
    const mod = document.getElementById('modalHaggleSale');
    if (mod) {
        mod.innerHTML = html;
        mod.classList.add('active');
    }
}

function attemptHaggleSale(strategy) {
    if (activeHaggleSlotIdx === null) return;
    const slot = state.salesLot[activeHaggleSlotIdx];
    if (!slot) return;
    if (!slot.currentBuyer) return;
    const buyer = slot.currentBuyer;
    
    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;

    let priceBoost = 0;
    let patienceHit = 0;
    let failChance = 0;
    
    let hardModifier = 1.0;
    if (lvl >= 20) hardModifier = 1.35;
    else if (lvl <= 5) hardModifier = 0.85;
    
    if (strategy === 'safe') {
        priceBoost = 0.02;
        patienceHit = Math.round(15 * hardModifier);
        failChance = 0.15 * hardModifier;
    } else if (strategy === 'firm') {
        priceBoost = 0.06;
        patienceHit = Math.round(35 * hardModifier);
        failChance = 0.40 * hardModifier;
    }
    
    let isFailed = false;
    if (Math.random() < failChance) isFailed = true;
    if (buyer.patience - patienceHit <= 0) isFailed = true;

    if (isFailed) {
        closeModal('modalHaggleSale');
        rejectBuyerDeal(activeHaggleSlotIdx);
        return showToast("😡 Покупатель развернулся и ушёл!");
    } else {
        const ask = slot.askingPrice ? slot.askingPrice : 100000;
        const bOff = buyer.offerPrice ? buyer.offerPrice : 100000;
        let newOffer = Math.round(bOff * (1 + priceBoost));
        if (newOffer > ask) newOffer = ask;
        
        buyer.offerPrice = newOffer;
        buyer.patience -= patienceHit;
        openHaggleSaleModal(activeHaggleSlotIdx);
        showToast("Удалось накинуть цену, но терпение падает!");
    }
}

function generateBuyerForSlot(slot) {
    if (typeof EXPANDED_BUYERS_POOL === 'undefined') return;
    const b = EXPANDED_BUYERS_POOL[Math.floor(Math.random() * EXPANDED_BUYERS_POOL.length)];
    const car = slot.car;
    
    let cPlate = "";
    if (car.customPlate) cPlate = car.customPlate;
    else if (car.plate) cPlate = car.plate;

    let plateVal = 0;
    if (typeof calculatePlateValue === 'function') plateVal = calculatePlateValue(cPlate);
    
    let baseM = 150000;
    if (car.baseMarketValue) baseM = car.baseMarketValue;
    else if (car.price) baseM = car.price;

    const realMarketVal = baseM + plateVal;
    
    let rate = b.rate + 0.05;
    if (rate > 1.05) rate = 1.05;

    let fairPrice = Math.round(realMarketVal * rate);
    
    let finalOffer = fairPrice;
    if (slot.askingPrice && slot.askingPrice < fairPrice) finalOffer = slot.askingPrice;
    
    slot.currentBuyer = {
        name: b.name,
        avatar: b.avatar,
        type: b.type,
        minKarma: b.minKarma ? b.minKarma : 0,
        offerPrice: finalOffer,
        preStatus: b.preStatus,
        rejectSay: b.rejectSay,
        patience: 100
    };
}

function acceptBuyerDeal(idx) {
    const slot = state.salesLot[idx];
    if (!slot) return;
    if (!slot.currentBuyer) return;
    const buyer = slot.currentBuyer;
    const car = slot.car;
    
    if (car.isStolen) {
        let pDays = 0;
        if (state.player && state.player.policeImmunityDays) pDays = state.player.policeImmunityDays;
        const hasRoof = pDays > 0;

        let isCop = false;
        if (buyer.type === 'inspector') isCop = true;
        if (buyer.type === 'regular') isCop = true;

        let willBust = false;
        if (isCop) willBust = true;
        if (Math.random() < 0.45) willBust = true;

        if (!hasRoof && willBust) {
            tgHaptic('error');
            state.salesLot.splice(idx, 1);
            
            let cash = 0; if (state.player && state.player.cash) cash = state.player.cash;
            state.player.cash = Math.max(0, cash - 150000);
            
            let karma = 50; if (state.player && state.player.karma) karma = state.player.karma;
            state.player.karma = Math.max(0, karma - 20);
            
            saveState();
            renderSalesLot();

            let cName = "Авто"; if (car.name) cName = car.name;
            let bName = "Покупатель"; if (buyer.name) bName = buyer.name;

            openVerdictModal(
                "🚨 ОБЛАВА ПРИ ПРОДАЖЕ!",
                "Покупатель (" + bName + ") сверил VIN по базам ГИБДД и вызвал наряд! Автомобиль «" + cName + "» конфискован в пользу государства, наложен штраф 150,000 ₽.",
                false
            );
            return;
        } else if (hasRoof) {
            showToast("🛡️ Крыша Решалы отвела проверку VIN!");
        }
    }
    
    let cost = 100000;
    if (car.purchaseCost) cost = car.purchaseCost;
    else if (car.basePrice) cost = car.basePrice;
    else if (buyer.offerPrice) cost = Math.round(buyer.offerPrice * 0.9);

    const netProfit = buyer.offerPrice - cost;
    
    state.player.cash += buyer.offerPrice;
    
    if (!state.player.stats) state.player.stats = {};
    if (!state.player.stats.sold) state.player.stats.sold = 0;
    state.player.stats.sold += 1;
    
    if (!state.player.stats.totalNetProfit) state.player.stats.totalNetProfit = 0;
    state.player.stats.totalNetProfit += netProfit;
    
    if (netProfit >= 0) {
        if (!state.player.stats.profitableSales) state.player.stats.profitableSales = 0;
        state.player.stats.profitableSales += 1;
    } else {
        if (!state.player.stats.lossSales) state.player.stats.lossSales = 0;
        state.player.stats.lossSales += 1;
    }
    
    addXp(35);
    state.salesLot.splice(idx, 1);
    saveState();
    renderSalesLot();

    let cName = "Авто"; if (car.name) cName = car.name;
    let bName = "Покупатель"; if (buyer.name) bName = buyer.name;

    openVerdictModal("СДЕЛКА ЗАКРЫТА! 🎉", bName + " забрал «" + cName + "»!", true, buyer.offerPrice, netProfit);
}

function rejectBuyerDeal(idx) {
    const slot = state.salesLot[idx];
    if (!slot) return;
    slot.currentBuyer = null;
    slot.timer = 30;
    saveState();
    renderSalesLot();
    showToast("Ждём следующего покупателя...");
}

function withdrawFromLot(idx) {
    const slot = state.salesLot.splice(idx, 1)[0];
    if (!state.garage) state.garage = [];
    state.garage.push(slot.car);
    saveState();
    renderGarage();
    renderSalesLot();
    showToast("Автомобиль возвращен в бокс гаража.");
}

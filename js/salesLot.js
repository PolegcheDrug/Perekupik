// ===================== Вкладка: ПЛОЩАДКА ПРОДАЖ (js/salesLot.js) =====================

let activeHaggleSlotIdx = null;

function upgradeExpressCapacity() {
    if (state.player.maxExpressTickets >= 200) return showToast("Достигнут абсолютный максимум склада (200)!");
    const cost = (state.player.maxExpressTickets / 25) * 50000;
    if (state.player.cash < cost) return showToast(`Не хватает денег! Нужно ${cost.toLocaleString()} ₽`);
    state.player.cash -= cost;
    state.player.maxExpressTickets += 25;
    saveState();
    renderSalesLot();
    showToast(`Вместимость склада увеличена до ${state.player.maxExpressTickets}!`);
}

function renderSalesLot() {
    const list = document.getElementById('salesLotList'); if (!list) return; 
    setTxt('lotCountBadge', `${state.salesLot.length} авто на продаже`);
    setTxt('expressCountDisplay', `${state.player.expressTickets} / ${state.player.maxExpressTickets}`);
    
    const upgBtn = document.getElementById('btnUpgradeTickets');
    if (upgBtn) {
        const cost = (state.player.maxExpressTickets / 25) * 50000;
        upgBtn.innerText = state.player.maxExpressTickets >= 200 ? 'МАКСИМУМ' : `Расширить (${cost/1000}k ₽)`;
        if(state.player.maxExpressTickets >= 200) upgBtn.disabled = true;
    }

    const mainContent = document.querySelector('.main-content'); const scrollPos = mainContent ? mainContent.scrollTop : 0;
    if (state.salesLot.length === 0) { 
        list.innerHTML = `<div class="glass-card text-center sub-label py-8"><i class="fa-solid fa-car-on color-green mb-2" style="font-size:32px;"></i><div>Площадка пуста. Выставьте авто из гаража.</div></div>`; 
        return; 
    }
    
    list.innerHTML = state.salesLot.map((slot, idx) => {
        const car = slot.car; const buyer = slot.currentBuyer;
        const progressPercent = Math.max(0, Math.min(100, ((30 - slot.timer) / 30) * 100));

        return `
        <div class="glass-card mb-3">
            <div class="car-img-wrap" style="height:130px;">
                <img src="${car.img}" class="car-img" onerror="this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'">
                <div class="plate-corner"><div class="license-plate">${car.customPlate || car.plate}</div></div>
            </div>
            <div class="flex-between mb-2">
                <div>
                    <h4 class="font-bold">${car.name}</h4>
                    <div class="sub-label">Цена: <b class="color-green">${slot.askingPrice.toLocaleString()} ₽</b></div>
                </div>
                <div>
                    ${slot.timer <= 0 ? `<span class="tag-badge bg-tag-green">Клиент у капота!</span>` : ''}
                </div>
            </div>
            
            ${slot.timer > 0 ? `
            <div class="lot-progress-wrap">
                <div class="lot-progress-bar" id="lot_progress_fill_${idx}" style="width: ${progressPercent}%;"></div>
            </div>
            <div class="sub-label mb-2 text-center" id="lot_timer_text_${idx}">Ожидание клиента: ${slot.timer}с</div>
            
            <div class="grid-2 mb-2">
                <button onclick="speedUpLotWithTicket(${idx})" class="btn btn-purple btn-sm">🎟️ Пропуск (${state.player.expressTickets || 0} шт)</button>
                <button onclick="speedUpLotWithStars(${idx})" class="btn btn-amber btn-sm">⭐ 5 Stars</button>
            </div>` : ''}
            
            ${buyer ? `
            <div class="glass-card p-3 mb-2" style="background:#090e18; border-color:var(--cyan);">
                <div class="flex-between mb-1"><div class="font-bold text-xs color-cyan">${buyer.avatar}${buyer.name}</div><div class="price-val">${buyer.offerPrice.toLocaleString()} ₽</div></div>
                <div class="sub-label mb-2 color-amber" style="font-style:italic;">«${buyer.preStatus}»</div>
                <div class="grid-3">
                    <button onclick="acceptBuyerDeal(${idx})" class="btn btn-green btn-sm">Продать</button>
                    <button onclick="openHaggleSaleModal(${idx})" class="btn btn-amber btn-sm" ${buyer.offerPrice === 0 ? 'disabled' : ''}>Торг 🗣</button>
                    <button onclick="rejectBuyerDeal(${idx})" class="btn btn-dark btn-sm">Отказать</button>
                </div>
            </div>` : ''}
            
            <button onclick="withdrawFromLot(${idx})" class="btn btn-dark w-full mt-1 btn-sm">Забрать обратно в гараж</button>
        </div>`;
    }).join('');
    
    if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
}

function speedUpLotWithTicket(idx) {
    if ((state.player.expressTickets || 0) <= 0) return showToast("У вас нет Экспресс-пропусков! Купите у Решалы или подождите смены дня.");
    state.player.expressTickets -= 1;
    const slot = state.salesLot[idx];
    slot.timer = 0;
    generateBuyerForSlot(slot);
    saveState(); renderSalesLot();
    tgHaptic('success');
    showToast("🎟️ Экспресс-пропуск использован! Клиент уже на месте.");
}

function speedUpLotWithStars(idx) {
    if (state.player.stars < 5) return showToast("Не хватает 5 Telegram Stars ⭐!");
    state.player.stars -= 5;
    const slot = state.salesLot[idx];
    slot.timer = 0;
    generateBuyerForSlot(slot);
    saveState(); renderSalesLot();
    tgHaptic('success');
    showToast("⭐ 5 Stars списано! VIP-клиент прибыл.");
}

function openHaggleSaleModal(idx) { 
    activeHaggleSlotIdx = idx; const slot = state.salesLot[idx]; if (!slot || !slot.currentBuyer) return;
    if (state.player.karma < slot.currentBuyer.minKarma) return showToast("Ваша репутация слишком низка для торга с ним!");
    
    const html = `<div class="modal-box"><h4 class="text-center mb-1">🗣️ Торг у капота</h4>
        <div class="text-xs color-cyan text-center font-bold mb-1">${slot.currentBuyer.avatar} ${slot.currentBuyer.name}</div>
        <div class="sub-label text-center mb-1 color-amber">Предложение: ${slot.currentBuyer.offerPrice.toLocaleString()} ₽</div>
        <div class="patience-bar-container" style="background:#182232; height:8px; border-radius:6px; overflow:hidden; margin-bottom:12px;">
            <div class="patience-bar" id="buyerPatienceFill" style="height:100%; width: ${slot.currentBuyer.patience}%; background: ${slot.currentBuyer.patience > 50 ? 'linear-gradient(90deg, #4caf50, #8bc34a)' : '#ff9800'}; transition: width 0.3s;"></div>
        </div>
        <div class="space-y-2 mb-3">
            <button onclick="attemptHaggleSale('safe')" class="btn btn-dark mb-1 w-full">Мягко обосновать цену (+2% к цене | Малый риск)</button>
            <button onclick="attemptHaggleSale('firm')" class="btn btn-dark mb-1 w-full">Жестко давить (+7% к цене | Высокий риск ухода)</button>
        </div><button onclick="closeModal('modalHaggleSale')" class="btn btn-dark w-full">Назад к сделке</button></div>`;
        
    document.getElementById('modalHaggleSale').innerHTML = html; 
    document.getElementById('modalHaggleSale').classList.add('active'); 
}

function attemptHaggleSale(strategy) {
    if (activeHaggleSlotIdx === null) return; const slot = state.salesLot[activeHaggleSlotIdx]; if (!slot || !slot.currentBuyer) return;
    const buyer = slot.currentBuyer; let priceBoost = 0; let patienceHit = 0; let failChance = 0;
    
    if (strategy === 'safe') { priceBoost = 0.02; patienceHit = 15; failChance = 0.2; } 
    else if (strategy === 'firm') { priceBoost = 0.07; patienceHit = 40; failChance = 0.5; }
    
    if (Math.random() < failChance || buyer.patience - patienceHit <= 0) { 
        closeModal('modalHaggleSale'); 
        rejectBuyerDeal(activeHaggleSlotIdx); 
        return showToast("😡 Покупатель психанул и ушел!"); 
    } else { 
        buyer.offerPrice = Math.min(slot.askingPrice, Math.round(buyer.offerPrice * (1 + priceBoost))); 
        buyer.patience -= patienceHit; 
        openHaggleSaleModal(activeHaggleSlotIdx); 
        showToast("Вы накинули цену, но терпение покупателя падает!"); 
    }
}

function generateBuyerForSlot(slot) { 
    if (typeof EXPANDED_BUYERS_POOL === 'undefined') return;
    const b = EXPANDED_BUYERS_POOL[Math.floor(Math.random() * EXPANDED_BUYERS_POOL.length)]; 
    const car = slot.car;
    let rate = Math.min(1.05, b.rate + 0.05); 
    let fairPrice = Math.round(car.marketValue * rate);
    let finalOffer = Math.min(slot.askingPrice, fairPrice);
    slot.currentBuyer = { name: b.name, avatar: b.avatar, type: b.type, minKarma: b.minKarma || 0, offerPrice: finalOffer, preStatus: b.preStatus, rejectSay: b.rejectSay, patience: 100 }; 
}

function acceptBuyerDeal(idx) {
    const slot = state.salesLot[idx]; if (!slot || !slot.currentBuyer) return;
    const buyer = slot.currentBuyer; const car = slot.car;
    const cost = car.purchaseCost || car.basePrice || Math.round(buyer.offerPrice * 0.9);
    const netProfit = buyer.offerPrice - cost;
    
    state.player.cash += buyer.offerPrice;
    state.player.stats.sold += 1;
    state.player.stats.totalNetProfit += netProfit;
    
    if (netProfit >= 0) state.player.stats.profitableSales += 1; 
    else state.player.stats.lossSales += 1;
    
    addXp(30);
    state.salesLot.splice(idx, 1);
    saveState(); 
    renderSalesLot();
    
    openVerdictModal("СДЕЛКА ЗАКРЫТА! 🎉", `${buyer.name} купил автомобиль!`, true, buyer.offerPrice, netProfit);
}

function rejectBuyerDeal(idx) { 
    const slot = state.salesLot[idx]; 
    slot.currentBuyer = null; 
    slot.timer = 30; 
    saveState(); 
    renderSalesLot(); 
    showToast("Ждем следующего покупателя..."); 
}

function withdrawFromLot(idx) { 
    const slot = state.salesLot.splice(idx, 1)[0]; 
    state.garage.push(slot.car); 
    saveState(); 
    renderGarage(); 
    renderSalesLot(); 
    showToast("Автомобиль возвращен в бокс."); 
}
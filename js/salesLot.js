// ========================================================
// js/salesLot.js — ПЛОЩАДКА ПРОДАЖ, ТОРГ У КАПОТА И M+ (v2.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// 1. Полное разделение клиентов: «У капота» (Офлайн) vs «В сети M+» (Онлайн)
// 2. Исправленный синхронный таймер поиска без зацикливания
// 3. Мгновенный пропуск за талоны и Stars с гарантированным вызовом
// 4. Инлайн-торг у капота прямо внутри карточки без оверлеев
// 5. Синхронизация цены лота и текущего предложения покупателя
// ========================================================

let salesLotTimerInterval = null;

// Психотипы покупателей площадки
const BUYER_ARCHETYPES = [
    { 
        id: "student", 
        name: "Макс (Студент)", 
        avatar: "🧢", 
        patience: 5, 
        riskTolerance: "low", 
        moodPhrase: "«Ищу первую тачку подкопить опыт. Денег впритык!»",
        inspectionSkill: "low" // Редко замечает скрытые дефекты
    },
    { 
        id: "podbor", 
        name: "Олег (Автоподбор)", 
        avatar: "🔎", 
        patience: 6, 
        riskTolerance: "mid", 
        moodPhrase: "«Проверяю каждый болт и зазор толщиномером. Есть ли торг?»",
        inspectionSkill: "high" // Всегда тычет в окрасы и дефекты
    },
    { 
        id: "perekup", 
        name: "Серго (Перекуп)", 
        avatar: "🧔", 
        patience: 3, 
        riskTolerance: "high", 
        moodPhrase: "«Заберу быстро за наличку прямо сейчас с хорошим дисконтом!»",
        inspectionSkill: "mid"
    },
    { 
        id: "shadow", 
        name: "Артур (Теневой)", 
        avatar: "🕶️", 
        patience: 4, 
        riskTolerance: "high", 
        moodPhrase: "«Документы в порядке? Деньги на руках, без лишних вопросов.»",
        inspectionSkill: "mid"
    },
    { 
        id: "family", 
        name: "Виктор (Семьянин)", 
        avatar: "👨‍👩‍👦", 
        patience: 5, 
        riskTolerance: "low", 
        moodPhrase: "«Нужна надёжная машина на каждый день для семьи и дачи.»",
        inspectionSkill: "low"
    }
];

function initSalesLotTimer() {
    if (salesLotTimerInterval) clearInterval(salesLotTimerInterval);
    salesLotTimerInterval = setInterval(() => {
        updateSalesLotTimers();
    }, 1000);
}

function renderSalesLot() {
    const container = document.getElementById('salesLotList');
    if (!container) return;

    if (!state.salesLot) state.salesLot = [];

    const badge = document.getElementById('lotCountBadge');
    if (badge) badge.innerText = `${state.salesLot.length} авто на продаже`;

    const ticketDisplay = document.getElementById('expressCountDisplay');
    if (ticketDisplay) {
        ticketDisplay.innerText = `${state.player?.expressTickets || 0} / ${state.player?.maxExpressTickets || 25}`;
    }

    if (state.salesLot.length === 0) {
        container.innerHTML = `
            <div class="glass-card text-center py-6 sub-label">
                <i class="fa-solid fa-car-on mb-2 color-green" style="font-size:28px;"></i>
                <div>На площадке продаж пусто.</div>
                <div class="text-xs mt-1">Перейдите в <b class="color-cyan" style="cursor:pointer;" onclick="switchTab('tabGarage')">Гараж</b> и выставьте автомобиль на продажу!</div>
            </div>
        `;
        return;
    }

    let html = "";

    state.salesLot.forEach((lot, idx) => {
        if (!lot) return;

        let car = lot.car || lot;
        let askingPrice = lot.askingPrice || car.price || 100000;
        let purchaseCost = car.purchaseCost || Math.round(askingPrice * 0.75);
        let margin = askingPrice - purchaseCost;
        let marginClass = margin >= 0 ? "color-green" : "color-red";

        // Единая нормализация таймеров поиска
        if (lot.timer === undefined || isNaN(lot.timer)) {
            lot.timer = (lot.maxTimer && !isNaN(lot.maxTimer)) ? lot.maxTimer : 60;
        }
        if (lot.maxTimer === undefined || isNaN(lot.maxTimer)) {
            lot.maxTimer = 60;
        }

        let remainingSec = Math.max(0, lot.timer);
        let maxSec = Math.max(1, lot.maxTimer);
        let progressPct = Math.min(100, Math.max(0, Math.round(((maxSec - remainingSec) / maxSec) * 100)));

        let hasBuyer = !!lot.currentBuyer || !!lot.buyer;
        if (remainingSec === 0 && !hasBuyer) {
            lot.currentBuyer = generateRandomLotBuyer(car, askingPrice);
            lot.buyer = lot.currentBuyer;
            lot.buyerTimerLeft = 120;
            hasBuyer = true;
            syncBuyerToMNetwork(lot, idx);
        }

        let rawImg = car.img || "assets/cars/economy/2101/vaz-2101.jpg";
        let carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
        let fallbackUrl = car.fallback || "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80";

        let statusBadgeHtml = "";
        let waitSectionHtml = "";

        if (!hasBuyer) {
            statusBadgeHtml = `<span class="tag-badge bg-tag-cyan"><i class="fa-solid fa-arrows-rotate fa-spin mr-1"></i> ПОИСК ПОКУПАТЕЛЯ...</span>`;
            waitSectionHtml = `
                <div class="mb-2">
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label"><i class="fa-solid fa-users mr-1"></i> Ожидание покупателя:</span>
                        <span class="color-amber font-bold" id="lot_timer_text_${idx}">⏳ ${remainingSec}с</span>
                    </div>
                    <div class="lot-progress-track" style="height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden; border:1px solid rgba(0,242,254,0.2);">
                        <div id="lot_progress_fill_${idx}" class="lot-progress-fill" style="width:${progressPct}%; height:100%; background:linear-gradient(90deg, #00f2fe, #4facfe); box-shadow:0 0 10px rgba(0,242,254,0.6); transition:width 0.4s ease;"></div>
                    </div>
                </div>

                <div class="grid-2 mb-2">
                    <button onclick="speedUpLotSearch(${idx}, 'ticket')" class="btn btn-purple btn-sm">
                        <i class="fa-solid fa-ticket mr-1"></i> ПРОПУСК (${state.player?.expressTickets || 0} ШТ)
                    </button>
                    <button onclick="speedUpLotSearch(${idx}, 'stars')" class="btn btn-amber btn-sm">
                        <i class="fa-solid fa-star mr-1"></i> 5 STARS ⭐
                    </button>
                </div>
            `;
        } else {
            let buyer = lot.currentBuyer || lot.buyer;
            let isOnlineChat = buyer.dealType === 'chat';

            if (isOnlineChat) {
                statusBadgeHtml = `<span class="tag-badge bg-tag-cyan"><i class="fa-solid fa-envelope mr-1"></i> НАПИСАЛ В M+</span>`;
            } else {
                statusBadgeHtml = `<span class="tag-badge bg-tag-green"><span class="led-dot led-green"></span> КЛИЕНТ У КАПОТА!</span>`;
            }
            waitSectionHtml = renderActiveBuyerBlockHtml(lot, idx);
        }

        let plateText = car.customPlate || car.plate || "ТРАНЗИТ";

        html += `
            <div class="glass-card mb-3 ${hasBuyer ? 'card-glow-deal' : ''}" id="sales_lot_card_${idx}">
                <div class="car-img-wrap mb-2">
                    <img src="${carImg}" class="car-img" onerror="this.onerror=null; this.src='${fallbackUrl}';">
                </div>

                <div class="car-header-row-volumetric mb-2">
                    <div>
                        <div class="flex-gap" style="align-items:center;">
                            <span class="car-brand-pill brand-default">ЛОТ</span>
                            <h3 class="font-bold text-xs" style="font-size:15px;">${car.name}</h3>
                        </div>
                        <div class="mt-1 flex-gap" style="align-items:center;">
                            <span class="license-plate" style="font-size:9.5px; padding:2px 6px;">${plateText} <span class="license-flag">RUS</span></span>
                            <span class="tag-badge bg-tag-green">НА ПЛОЩАДКЕ</span>
                        </div>
                    </div>

                    <div class="car-price-badge-3d text-right">
                        <span class="car-price-label-sub">Цена на лоте</span>
                        <div class="car-price-value-3d" style="color:var(--green);">${askingPrice.toLocaleString()} ₽</div>
                        <div class="text-xs font-bold ${marginClass}" style="font-size:9.5px;">
                            ${margin >= 0 ? '▲ +' : '▼ '}${margin.toLocaleString()} ₽ маржа
                        </div>
                    </div>
                </div>

                <div class="car-specs-grid-volumetric mb-2">
                    <div class="spec-tile-3d-col">
                        <span class="spec-tile-col-label">Мощность</span>
                        <b class="color-amber">${car.power || 100} л.с.</b>
                    </div>
                    <div class="spec-tile-3d-col">
                        <span class="spec-tile-col-label">Пробег</span>
                        <b class="color-cyan">${(car.mileage || 85000).toLocaleString()} км</b>
                    </div>
                    <div class="spec-tile-3d-col">
                        <span class="spec-tile-col-label">Кузов</span>
                        <b class="color-green">${car.condition || 85}%</b>
                    </div>
                </div>

                <div class="flex-between mb-2">
                    <span class="text-xs sub-label">Статус площадки:</span>
                    ${statusBadgeHtml}
                </div>

                ${waitSectionHtml}

                <button onclick="reclaimCarFromLot(${idx})" class="btn btn-dark btn-sm w-full mt-2" ${lot.isHaggling ? 'disabled' : ''}>
                    <i class="fa-solid fa-rotate-left mr-1"></i> Забрать обратно в гараж
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}

// --------------------------------------------------------
// ГЕНЕРАТОР ПОКУПАТЕЛЯ: ОФЛАЙН (У КАПОТА) ИЛИ ОНЛАЙН (В M+)
// --------------------------------------------------------
function generateRandomLotBuyer(car, askingPrice) {
    const archetype = BUYER_ARCHETYPES[Math.floor(Math.random() * BUYER_ARCHETYPES.length)];
    const discountRatio = 0.83 + Math.random() * 0.11;
    const offeredPrice = Math.round(askingPrice * discountRatio);

    // 50% шанс, что покупатель пишет онлайн в M+, 50% — приехал очно к капоту
    const isOnlineChat = Math.random() < 0.50;

    let initialDialogue = archetype.moodPhrase;
    if (isOnlineChat) {
        initialDialogue = `«Здравствуйте! Пишу по вашему объявлению. Готов забрать за ${offeredPrice.toLocaleString()} ₽, если договоримся!»`;
    }

    return {
        id: "buyer_" + Date.now(),
        name: archetype.name,
        avatar: archetype.avatar,
        patience: archetype.patience,
        maxPatience: archetype.patience,
        riskTolerance: archetype.riskTolerance,
        inspectionSkill: archetype.inspectionSkill,
        offeredPrice: offeredPrice,
        initialOfferedPrice: offeredPrice,
        currentOffer: offeredPrice,
        lastReply: initialDialogue,
        dealType: isOnlineChat ? "chat" : "hood"
    };
}

// Синхронизация чата в мессенджер M+
function syncBuyerToMNetwork(lot, idx) {
    if (!lot || !lot.buyer || lot.buyer.dealType !== 'chat') return;
    if (!state.player) state.player = {};
    if (!state.player.phoneMessages) state.player.phoneMessages = [];

    const car = lot.car || lot;
    const buyer = lot.buyer;
    const safeCarName = String(car.name || 'car').replace(/[^a-zа-я0-9]/gi, '_');
    const dialogId = `dlg_buyer_slot_${idx}_${safeCarName}`;

    let exists = state.player.phoneMessages.find(m => m.id === dialogId);
    if (!exists) {
        state.player.phoneMessages.unshift({
            id: dialogId,
            category: 'buyers',
            sender: `${buyer.avatar} ${buyer.name}`,
            time: "Сейчас",
            unread: true,
            carIndex: idx,
            carData: car,
            askingPrice: lot.askingPrice || car.price,
            offerPrice: buyer.currentOffer,
            preview: buyer.lastReply,
            chatHistory: [
                { from: 'them', text: `Здравствуйте! Пишу по объявлению на «${car.name}». Готов забрать за ${buyer.currentOffer.toLocaleString()} ₽!` }
            ]
        });
    } else {
        exists.askingPrice = lot.askingPrice || car.price;
        exists.offerPrice = buyer.currentOffer;
    }
}

// --------------------------------------------------------
// ОТРИСОВКА БЛОКА ПОКУПАТЕЛЯ: У КАПОТА ИЛИ ЧЕРЕЗ M+
// --------------------------------------------------------
function renderActiveBuyerBlockHtml(lot, idx) {
    const buyer = lot.currentBuyer || lot.buyer;
    if (!buyer) return "";

    const car = lot.car || lot;
    const askingPrice = lot.askingPrice || car.price || 100000;
    const purchaseCost = car.purchaseCost || Math.round(askingPrice * 0.75);
    const currentPriceOffer = buyer.currentOffer || buyer.offeredPrice || Math.round(askingPrice * 0.85);
    const netProfit = currentPriceOffer - purchaseCost;

    let patiencePct = Math.round((buyer.patience / buyer.maxPatience) * 100);
    let patienceColor = patiencePct > 60 ? "color-green" : (patiencePct > 30 ? "color-amber" : "color-red");

    const isOnlineChat = buyer.dealType === 'chat';

    // ВАРИАНТ 1: ПОКУПАТЕЛЬ НАПИСАЛ В M+ (ОНЛАЙН СДЕЛКА)
    if (isOnlineChat) {
        return `
            <div class="p-2 mb-2" style="background:rgba(0, 242, 254, 0.04); border-radius:10px; border:1px solid rgba(0, 242, 254, 0.35);">
                <div class="flex-between mb-1">
                    <div class="flex-gap" style="align-items:center;">
                        <span style="font-size:22px;">${buyer.avatar}</span>
                        <div>
                            <b class="text-xs color-cyan">${buyer.name}</b>
                            <div class="sub-label" style="font-size:9px;">
                                Написал в M+ • <span class="color-amber" id="lot_buyer_timer_${idx}">⏳ ${lot.buyerTimerLeft || 120}с</span>
                            </div>
                        </div>
                    </div>

                    <div class="text-right">
                        <span class="sub-label" style="font-size:8.5px;">ПРЕДЛОЖЕНИЕ В ЧАТЕ:</span>
                        <div class="price-val color-green" style="font-size:15px;">${currentPriceOffer.toLocaleString()} ₽</div>
                    </div>
                </div>

                <div class="seller-dialog-bubble my-2">
                    <span class="seller-mood-icon">${buyer.avatar}</span>
                    <span class="seller-bubble-text">${buyer.lastReply}</span>
                </div>

                <div class="flex-between text-xs px-1 mb-2">
                    <span class="sub-label">Чистая маржа с продажи:</span>
                    <b class="${netProfit >= 0 ? 'color-green' : 'color-red'}">${netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()} ₽</b>
                </div>

                <!-- Кнопки для онлайн-сделки: прямой переход в чат M+ -->
                <div class="grid-2" style="gap:6px;">
                    <button onclick="openLotBuyerInNetworkM(${idx})" class="btn btn-cyan btn-sm font-bold">
                        <i class="fa-solid fa-comment-dots mr-1"></i> ПЕРЕЙТИ В ЧАТ M+ 💬
                    </button>
                    <button onclick="rejectLotBuyer(${idx})" class="btn btn-danger btn-sm">
                        ✕ ОТКЛОНИТЬ ЗАПРОС
                    </button>
                </div>
            </div>
        `;
    }

    // ВАРИАНТ 2: ПОКУПАТЕЛЬ СТОИТ У КАПОТА (ОФЛАЙН СДЕЛКА)
    let haggleControlsHtml = "";
    if (lot.isHaggling) {
        haggleControlsHtml = `
            <div class="p-2 my-2" style="background:#090e18; border-radius:10px; border:1px solid var(--amber);">
                <div class="flex-between text-xs mb-1">
                    <b class="color-amber"><i class="fa-solid fa-comments-dollar mr-1"></i> Выберите стратегию торга у капота:</b>
                    <span class="sub-label font-bold">Риск срыва:</span>
                </div>

                <div class="space-y-1 mb-2">
                    <button onclick="executeLotHaggleStep(${idx}, 'body')" class="btn btn-dark btn-sm w-full text-left flex-between" style="padding:6px 10px;">
                        <span>🛡️ Обосновать по кузову (+2% к цене)</span>
                        <span class="tag-badge bg-tag-green" style="font-size:8px;">РИСК 15%</span>
                    </button>

                    <button onclick="executeLotHaggleStep(${idx}, 'rare')" class="btn btn-dark btn-sm w-full text-left flex-between" style="padding:6px 10px;">
                        <span>🔥 Давить на эксклюзив (+6% к цене)</span>
                        <span class="tag-badge bg-tag-amber" style="font-size:8px;">РИСК 40%</span>
                    </button>

                    <button onclick="executeLotHaggleStep(${idx}, 'firm')" class="btn btn-dark btn-sm w-full text-left flex-between" style="padding:6px 10px;">
                        <span>⚡ Без торга, уже есть покупатель (+10%)</span>
                        <span class="tag-badge bg-tag-red" style="font-size:8px;">РИСК 70%</span>
                    </button>
                </div>

                <button onclick="toggleLotHaggleMode(${idx}, false)" class="btn btn-dark btn-sm w-full" style="font-size:10px;">
                    Скрыть торг / Назад к предложению
                </button>
            </div>
        `;
    }

    return `
        <div class="p-2 mb-2" style="background:rgba(0, 242, 254, 0.04); border-radius:10px; border:1px solid rgba(0, 242, 254, 0.25);">
            <div class="flex-between mb-1">
                <div class="flex-gap" style="align-items:center;">
                    <span style="font-size:22px;">${buyer.avatar}</span>
                    <div>
                        <b class="text-xs color-cyan">${buyer.name}</b>
                        <div class="sub-label" style="font-size:9px;">
                            Терпение: <b class="${patienceColor}">${patiencePct}%</b> • <span class="color-amber" id="lot_buyer_timer_${idx}">⏳ ${lot.buyerTimerLeft || 120}с</span>
                        </div>
                    </div>
                </div>

                <div class="text-right">
                    <span class="sub-label" style="font-size:8.5px;">ПРЕДЛОЖЕНИЕ:</span>
                    <div class="price-val color-green" style="font-size:15px;">${currentPriceOffer.toLocaleString()} ₽</div>
                </div>
            </div>

            <div class="seller-dialog-bubble my-2">
                <span class="seller-mood-icon">${buyer.avatar}</span>
                <span class="seller-bubble-text">${buyer.lastReply}</span>
            </div>

            <div class="flex-between text-xs px-1 mb-2">
                <span class="sub-label">Чистая маржа с продажи:</span>
                <b class="${netProfit >= 0 ? 'color-green' : 'color-red'}">${netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()} ₽</b>
            </div>

            ${haggleControlsHtml}

            <!-- Офлайн-кнопки у капота: ДКП, Торг, Отказ -->
            <div class="grid-3" style="gap:5px;">
                <button onclick="acceptLotBuyerDeal(${idx})" class="btn btn-green btn-sm" style="font-weight:900;">
                    <i class="fa-solid fa-handshake mr-1"></i> ДКП 🤝
                </button>

                <button onclick="toggleLotHaggleMode(${idx}, true)" class="btn ${lot.isHaggling ? 'btn-dark' : 'btn-amber'} btn-sm">
                    <i class="fa-solid fa-comments-dollar mr-1"></i> ТОРГ
                </button>

                <button onclick="rejectLotBuyer(${idx})" class="btn btn-danger btn-sm">
                    ✕ ОТКАЗ
                </button>
            </div>
        </div>
    `;
}

function toggleLotHaggleMode(idx, show) {
    if (!state.salesLot[idx]) return;
    state.salesLot[idx].isHaggling = show;
    renderSalesLot();
    if (typeof playSound === 'function') playSound('tick');
}

function executeLotHaggleStep(idx, strategy) {
    const lot = state.salesLot[idx];
    if (!lot) return;
    const buyer = lot.currentBuyer || lot.buyer;
    if (!buyer) return;

    if (buyer.patience <= 0) {
        return showToast("Покупатель потерял терпение и больше не торгуется!");
    }

    buyer.patience -= 1;

    let bonusPct = 0.02;
    let failRisk = 0.15;
    let failMsg = "«Не вижу здесь идеала, кузов требует внимания. Больше не накину!»";

    if (strategy === 'rare') {
        bonusPct = 0.06;
        failRisk = 0.40;
        failMsg = "«Эксклюзив? Не смеши, таких на рынке полно. Либо по моей цене, либо я ухожу!»";
    } else if (strategy === 'firm') {
        bonusPct = 0.10;
        failRisk = 0.70;
        failMsg = "«Ну и продавай своей очереди, а я пошёл искать дальше!»";
    }

    let roll = Math.random();

    if (roll < failRisk) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');

        if (buyer.patience <= 0 || roll < 0.25) {
            showToast(`🚫 ${buyer.name} хлопнул дверью и ушёл!`);
            lot.currentBuyer = null;
            lot.buyer = null;
            lot.isHaggling = false;
            lot.timer = 50;
            lot.maxTimer = 50;
            saveState();
            renderSalesLot();
            return;
        } else {
            buyer.lastReply = failMsg;
            showToast("Торг не удался! Покупатель упёрся.");
        }
    } else {
        let car = lot.car || lot;
        let askingPrice = lot.askingPrice || car.price || 100000;
        let increaseAmount = Math.round(askingPrice * bonusPct);

        buyer.currentOffer = Math.min(askingPrice, (buyer.currentOffer || buyer.offeredPrice) + increaseAmount);
        buyer.offeredPrice = buyer.currentOffer;
        buyer.lastReply = `«Ладно, твоя взяла! Накидываю +${increaseAmount.toLocaleString()} ₽, оформляем?»`;

        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`Покупатель согласился! Предложение: ${buyer.currentOffer.toLocaleString()} ₽`);
    }

    saveState();
    renderSalesLot();
}

function acceptLotBuyerDeal(idx) {
    const lot = state.salesLot[idx];
    if (!lot) return;
    const buyer = lot.currentBuyer || lot.buyer;
    if (!buyer) return;

    const car = lot.car || lot;
    const finalPrice = buyer.currentOffer || buyer.offeredPrice;
    const purchaseCost = car.purchaseCost || Math.round(finalPrice * 0.75);
    const profit = finalPrice - purchaseCost;

    const deal = {
        type: 'sale',
        car: car,
        price: finalPrice,
        profit: profit,
        seller: (state.player?.name) || "Перекуп #777",
        buyer: buyer.name,
        lotIndex: idx
    };

    if (typeof openDKPModal === 'function') {
        openDKPModal(deal);
    } else {
        finishSalesLotDeal(idx, finalPrice, profit);
    }
}

function finishSalesLotDeal(idx, price, profit) {
    const lot = state.salesLot[idx];
    if (!lot) return;

    const car = lot.car || lot;

    state.player.cash = (state.player.cash || 0) + price;
    if (!state.player.stats) state.player.stats = {};
    state.player.stats.sold = (state.player.stats.sold || 0) + 1;
    state.player.stats.totalProfit = (state.player.stats.totalProfit || 0) + Math.max(0, profit);

    if (typeof addXp === 'function') addXp(50);
    if (typeof logBankTransaction === 'function') {
        logBankTransaction(`Продажа авто на площадке: ${car.name}`, price, true);
    }

    if (window.FB_Bridge?.Plates && car.plate) {
        window.FB_Bridge.Plates.releasePlate(car.plate, null, false);
    }

    state.salesLot.splice(idx, 1);
    saveState();
    updateHeaderUI();
    renderSalesLot();

    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');

    openVerdictModal(
        "АВТОМОБИЛЬ ПРОДАН! 🤝",
        `Машина «${car.name}» успешно передана новому владельцу!\nВыручка: +${price.toLocaleString()} ₽\nЧистая прибыль: +${profit.toLocaleString()} ₽`,
        true,
        price
    );
}

function rejectLotBuyer(idx) {
    const lot = state.salesLot[idx];
    if (!lot) return;

    lot.currentBuyer = null;
    lot.buyer = null;
    lot.isHaggling = false;
    lot.timer = 45;
    lot.maxTimer = 45;

    saveState();
    renderSalesLot();
    if (typeof playSound === 'function') playSound('tick');
    showToast("Покупателю отказано. Начат поиск следующего клиента!");
}

function openLotBuyerInNetworkM(idx) {
    const lot = state.salesLot[idx];
    if (!lot) return;
    const buyer = lot.currentBuyer || lot.buyer;
    if (!buyer) return;

    const car = lot.car || lot;
    const safeCarName = String(car.name || 'car').replace(/[^a-zа-я0-9]/gi, '_');
    const dialogId = `dlg_buyer_slot_${idx}_${safeCarName}`;

    // Гарантируем синхронизацию входящего диалога
    syncBuyerToMNetwork(lot, idx);

    if (typeof switchTab === 'function') switchTab('tabPhone');
    setTimeout(() => {
        if (typeof PhoneManager !== 'undefined') {
            PhoneManager.openApp('m');
            setTimeout(() => {
                if (window.AppM && typeof window.AppM.openDialog === 'function') {
                    window.AppM.openDialog(dialogId);
                }
            }, 100);
        }
    }, 120);
}

function updateSalesLotTimers() {
    if (!state.salesLot || state.salesLot.length === 0) return;
    let needReRender = false;

    state.salesLot.forEach((lot, idx) => {
        if (!lot) return;

        let hasBuyer = !!lot.currentBuyer || !!lot.buyer;

        if (!hasBuyer) {
            if (lot.timer > 0) {
                lot.timer -= 1;
                const textEl = document.getElementById(`lot_timer_text_${idx}`);
                const barEl = document.getElementById(`lot_progress_fill_${idx}`);
                if (textEl) textEl.innerText = `⏳ ${lot.timer}с`;
                if (barEl) {
                    let progressPct = Math.min(100, Math.max(0, Math.round(((lot.maxTimer - lot.timer) / lot.maxTimer) * 100)));
                    barEl.style.width = `${progressPct}%`;
                }
            } else {
                let car = lot.car || lot;
                let askingPrice = lot.askingPrice || car.price || 100000;
                lot.currentBuyer = generateRandomLotBuyer(car, askingPrice);
                lot.buyer = lot.currentBuyer;
                lot.buyerTimerLeft = 120;
                syncBuyerToMNetwork(lot, idx);
                needReRender = true;
            }
        } else {
            if (lot.buyerTimerLeft > 0) {
                lot.buyerTimerLeft -= 1;
                const buyerTimeText = document.getElementById(`lot_buyer_timer_${idx}`);
                if (buyerTimeText) buyerTimeText.innerText = `⏳ ${lot.buyerTimerLeft}с`;
            } else {
                lot.currentBuyer = null;
                lot.buyer = null;
                lot.timer = 50;
                lot.maxTimer = 50;
                needReRender = true;
            }
        }
    });

    if (needReRender) {
        saveState();
        renderSalesLot();
    }
}

function speedUpLotSearch(idx, type) {
    const lot = state.salesLot[idx];
    if (!lot) return;

    if (type === 'ticket') {
        let t = state.player?.expressTickets || 0;
        if (t <= 0) return showToast("Нет экспресс-талонов! Расширьте лимит или докупите талоны.");
        state.player.expressTickets -= 1;
    } else if (type === 'stars') {
        let s = state.player?.stars || 0;
        if (s < 5) return showToast("Не хватает 5 Stars ⭐!");
        state.player.stars -= 5;
    }

    let car = lot.car || lot;
    let askingPrice = lot.askingPrice || car.price || 100000;

    // Мгновенный вызов покупателя
    lot.timer = 0;
    lot.currentBuyer = generateRandomLotBuyer(car, askingPrice);
    lot.buyer = lot.currentBuyer;
    lot.buyerTimerLeft = 120;

    syncBuyerToMNetwork(lot, idx);

    saveState();
    updateHeaderUI();
    renderSalesLot();

    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    showToast("Покупатель найден мгновенно!");
}

function reclaimCarFromLot(idx) {
    const maxSlots = getTotalGarageSlots();
    if ((state.garage?.length || 0) >= maxSlots) {
        return showToast("В гараже нет свободного места! Освободите бокс.");
    }

    const lot = state.salesLot[idx];
    if (!lot) return;

    const car = lot.car || lot;
    if (!state.garage) state.garage = [];
    state.garage.push(car);
    state.salesLot.splice(idx, 1);

    saveState();
    renderSalesLot();
    if (typeof renderGarage === 'function') renderGarage();
    if (typeof playSound === 'function') playSound('tick');
    showToast(`«${car.name}» возвращен в гараж.`);
}

function buyGarageSlot() {
    let slots = state.player?.garageSlots || 2;
    let cost = 150000 + (slots - 2) * 200000;

    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast(`Нужно ${cost.toLocaleString()} ₽ на расширение бокса!`);

    state.player.cash -= cost;
    state.player.garageSlots = slots + 1;

    saveState();
    updateHeaderUI();
    if (typeof renderGarage === 'function') renderGarage();
    if (typeof playSound === 'function') playSound('win');
    showToast(`Куплен новый бокс гаража! Вместимость: ${slots + 1} мест.`);
}

function upgradeExpressCapacity() {
    let cap = state.player?.maxExpressTickets || 25;
    let cost = 75000;

    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast(`Нужно ${cost.toLocaleString()} ₽ на расширение квоты талонов!`);

    state.player.cash -= cost;
    state.player.maxExpressTickets = cap + 10;
    state.player.expressTickets = (state.player.expressTickets || 0) + 10;

    saveState();
    updateHeaderUI();
    renderSalesLot();
    if (typeof playSound === 'function') playSound('win');
    showToast(`Квота экспресс-талонов увеличена до ${cap + 10} шт!`);
}

window.renderSalesLot = renderSalesLot;
window.initSalesLotTimer = initSalesLotTimer;
window.updateSalesLotTimers = updateSalesLotTimers;
window.speedUpLotSearch = speedUpLotSearch;
window.reclaimCarFromLot = reclaimCarFromLot;
window.toggleLotHaggleMode = toggleLotHaggleMode;
window.executeLotHaggleStep = executeLotHaggleStep;
window.acceptLotBuyerDeal = acceptLotBuyerDeal;
window.finishSalesLotDeal = finishSalesLotDeal;
window.rejectLotBuyer = rejectLotBuyer;
window.openLotBuyerInNetworkM = openLotBuyerInNetworkM;
window.buyGarageSlot = buyGarageSlot;
window.upgradeExpressCapacity = upgradeExpressCapacity;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initSalesLotTimer(); });
} else {
    initSalesLotTimer();
}
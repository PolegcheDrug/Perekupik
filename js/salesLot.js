// ========================================================
// js/salesLot.js — ПЛОЩАДКА ПРОДАЖ & МОДАЛЬНЫЙ ТОРГ У КАПОТА (v2.4.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ПОЛНЫЙ ФАЙЛ БЕЗ СОКРАЩЕНИЙ.
// 1. На карточке лота только 2 кнопки: ТОРГ (или Открыть M+) и ОТКАЗ
// 2. Отдельное стильное модальное окно торга у капота (как при покупке)
// 3. Автоматические системные проверки клиента в ленте чата (ЛКП, ЭБУ)
// 4. Неоновая шкала терпения, кнопки риска и заключение ДКП
// 5. Каскадный фолбек фото: <name>_N → <name> → images[0] → fallback → дефолт
// ========================================================

let salesLotTimerInterval = null;
let activeSalesLotHaggleIndex = null;

const BUYER_ARCHETYPES = [
    { 
        id: "student", 
        name: "Макс (Студент)", 
        avatar: "🧢", 
        patience: 4, 
        riskTolerance: "low", 
        moodPhrase: "«Ищу первую тачку подкопить опыт. Денег впритык, уступи немного!»",
        inspectionSkill: "low"
    },
    { 
        id: "podbor", 
        name: "Олег (Автоподбор)", 
        avatar: "🔎", 
        patience: 5, 
        riskTolerance: "mid", 
        moodPhrase: "«Здравствуйте. Осматриваю авто под ключ для клиента. Давайте проверим кузов и диагностику.»",
        inspectionSkill: "high"
    },
    { 
        id: "perekup", 
        name: "Серго (Перекуп)", 
        avatar: "🧔", 
        patience: 3, 
        riskTolerance: "high", 
        moodPhrase: "«Салам! Заберу за наличку прямо сейчас, но скинь по-братски!»",
        inspectionSkill: "mid"
    },
    { 
        id: "shadow", 
        name: "Артур (Теневой)", 
        avatar: "🕶️", 
        patience: 4, 
        riskTolerance: "high", 
        moodPhrase: "«Машина на ходу, документы чистые? Если сойдёмся в цене — забираю.»",
        inspectionSkill: "mid"
    },
    { 
        id: "family", 
        name: "Виктор (Семьянин)", 
        avatar: "👨‍👩‍👦", 
        patience: 5, 
        riskTolerance: "low", 
        moodPhrase: "«Нужна надёжная машина для семьи на каждый день. Главное чтобы без сюрпризов.»",
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

        // ⭐ КАСКАДНЫЙ ФОЛБЕК
        let carImgAttrs = (typeof buildCarImageAttrs === 'function')
            ? buildCarImageAttrs(rawImg, car)
            : `src="${rawImg}" onerror="this.onerror=null; this.src='${car.fallback || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80'}'"`;

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
            waitSectionHtml = renderBuyerCardActions(lot, idx);
        }

        let plateText = car.customPlate || car.plate || "ТРАНЗИТ";
        let condVal = car.condition || 85;
        let shieldIconClass = condVal >= 80 
            ? 'spec-tile-icon-shield' 
            : (condVal >= 50 ? 'spec-tile-icon-shield-mid' : 'spec-tile-icon-shield-low');
        let condColorClass = condVal >= 80 
            ? 'color-green' 
            : (condVal >= 50 ? 'color-amber' : 'color-red');

        html += `
            <div class="glass-card mb-3 ${hasBuyer ? 'card-glow-deal' : ''}" id="sales_lot_card_${idx}">
                <div class="car-img-wrap mb-2">
                    <img ${carImgAttrs} class="car-img">
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

                <!-- ОБЪЕМНЫЕ ПЛАШКИ СПЕЦИФИКАЦИЙ -->
                <div class="car-specs-grid-volumetric mb-2">
                    <div class="spec-tile-3d-col">
                        <div class="spec-tile-icon-wrap spec-tile-icon-power">
                            <i class="fa-solid fa-bolt"></i>
                        </div>
                        <div class="spec-tile-col-data">
                            <span class="spec-tile-col-label">Мощность</span>
                            <b class="color-amber">${car.power || 100} л.с.</b>
                        </div>
                    </div>

                    <div class="spec-tile-3d-col">
                        <div class="spec-tile-icon-wrap spec-tile-icon-road">
                            <i class="fa-solid fa-road"></i>
                        </div>
                        <div class="spec-tile-col-data">
                            <span class="spec-tile-col-label">Пробег</span>
                            <b class="color-cyan">${(car.mileage || 85000).toLocaleString()} км</b>
                        </div>
                    </div>

                    <div class="spec-tile-3d-col">
                        <div class="spec-tile-icon-wrap ${shieldIconClass}">
                            <i class="fa-solid fa-shield"></i>
                        </div>
                        <div class="spec-tile-col-data">
                            <span class="spec-tile-col-label">Кузов</span>
                            <b class="${condColorClass}">${condVal}%</b>
                        </div>
                    </div>
                </div>

                <div class="flex-between mb-2">
                    <span class="text-xs sub-label">Статус лота:</span>
                    ${statusBadgeHtml}
                </div>

                ${waitSectionHtml}

                <button onclick="reclaimCarFromLot(${idx})" class="btn btn-dark btn-sm w-full mt-2">
                    <i class="fa-solid fa-rotate-left mr-1"></i> Забрать обратно в гараж
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}

// --------------------------------------------------------
// ЛОГИЧЕСКИЙ БЛОК: СТРОГО 2 КНОПКИ НА КАРТОЧКЕ
// --------------------------------------------------------
function renderBuyerCardActions(lot, idx) {
    const buyer = lot.currentBuyer || lot.buyer;
    if (!buyer) return "";

    const car = lot.car || lot;
    const askingPrice = lot.askingPrice || car.price || 100000;
    const currentPriceOffer = buyer.currentOffer || buyer.offeredPrice || Math.round(askingPrice * 0.85);
    const isOnlineChat = buyer.dealType === 'chat';

    return `
        <div class="p-2 mb-2" style="background:#060a14; border-radius:12px; border:1px solid rgba(0, 242, 254, 0.3);">
            <div class="flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <span style="font-size:24px;">${buyer.avatar}</span>
                    <div>
                        <b class="text-xs color-cyan" style="font-size:12px;">${buyer.name}</b>
                        <div class="sub-label" style="font-size:8.5px;">
                            ${isOnlineChat ? '📩 Написал в мессенджере M+' : '🚗 Стоит перед вами у капота'} • <span class="color-amber">⏳ ${lot.buyerTimerLeft || 120}с</span>
                        </div>
                    </div>
                </div>

                <div class="text-right">
                    <span class="sub-label" style="font-size:8px;">ПРЕДЛОЖЕНИЕ:</span>
                    <div class="price-val color-green" style="font-size:15px;">${currentPriceOffer.toLocaleString()} ₽</div>
                </div>
            </div>

            <div class="seller-dialog-bubble my-2" style="border-left: 3px solid var(--cyan); background: rgba(0, 242, 254, 0.04); padding: 8px 10px; border-radius: 8px;">
                <span class="seller-mood-icon">${buyer.avatar}</span>
                <span class="seller-bubble-text" style="font-size:10px; line-height:1.35; color:#f1f5f9;">${buyer.lastReply}</span>
            </div>

            <!-- СТРОГО 2 КНОПКИ: ДИАЛОГ ИЛИ ОТКАЗ -->
            <div class="grid-2 mt-2" style="gap:6px;">
                ${isOnlineChat ? `
                    <button onclick="openLotBuyerInNetworkM(${idx})" class="btn btn-cyan btn-sm font-bold" style="padding:8px 0; font-size:11px;">
                        <i class="fa-solid fa-comment-dots mr-1"></i> ОТКРЫТЬ M+ 💬
                    </button>
                ` : `
                    <button onclick="openLotHoodHaggleModal(${idx})" class="btn btn-amber btn-sm font-bold" style="padding:8px 0; font-size:11px;">
                        <i class="fa-solid fa-comments-dollar mr-1"></i> ТОРГ 🗣️
                    </button>
                `}
                <button onclick="rejectLotBuyer(${idx})" class="btn btn-danger btn-sm font-bold" style="padding:8px 0; font-size:11px;">
                    ✕ ОТКАЗ
                </button>
            </div>
        </div>
    `;
}

function generateRandomLotBuyer(car, askingPrice) {
    const archetype = BUYER_ARCHETYPES[Math.floor(Math.random() * BUYER_ARCHETYPES.length)];
    const discountRatio = 0.82 + Math.random() * 0.12;
    const offeredPrice = Math.round(askingPrice * discountRatio);
    const isOnlineChat = Math.random() < 0.40;

    let initialDialogue = archetype.moodPhrase;
    if (isOnlineChat) {
        initialDialogue = `«Здравствуйте! Увидел объявление на «${car.name}». За ${offeredPrice.toLocaleString()} ₽ отдадите?»`;
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
        dealType: isOnlineChat ? "chat" : "hood",
        dialogHistory: [
            { from: 'them', text: initialDialogue }
        ],
        inspectionsDone: { gauge: false, obd: false, testDrive: false }
    };
}

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

// ========================================================
// МОДАЛЬНОЕ ОКНО ТОРГА У КАПОТА (СТИЛЬ КАК ПРИ ПОКУПКЕ)
// ========================================================
function openLotHoodHaggleModal(idx) {
    activeSalesLotHaggleIndex = idx;
    const lot = state.salesLot[idx];
    if (!lot || !lot.buyer) return;

    let modal = document.getElementById('modalLotHoodDeal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalLotHoodDeal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    renderLotHoodHaggleModalContent();
    ModalManager.open('modalLotHoodDeal');
    if (typeof playSound === 'function') playSound('tick');
}

function renderLotHoodHaggleModalContent() {
    const modal = document.getElementById('modalLotHoodDeal');
    if (!modal || activeSalesLotHaggleIndex === null) return;

    const lot = state.salesLot[activeSalesLotHaggleIndex];
    if (!lot || !lot.buyer) {
        ModalManager.close('modalLotHoodDeal');
        return;
    }

    const car = lot.car || lot;
    const buyer = lot.buyer;
    const currentOffer = buyer.currentOffer || buyer.offeredPrice;

    let rawImg = car.img || "assets/cars/economy/2101/vaz-2101.jpg";

    // ⭐ КАСКАДНЫЙ ФОЛБЕК
    let carImgAttrs = (typeof buildCarImageAttrs === 'function')
        ? buildCarImageAttrs(rawImg, car)
        : `src="${rawImg}" onerror="this.onerror=null; this.src='${car.fallback || 'assets/cars/economy/2101/vaz-2101.jpg'}'"`;

    let plateText = car.customPlate || car.plate || "ТРАНЗИТ";

    let patience = buyer.patience !== undefined ? buyer.patience : 4;
    let maxPatience = buyer.maxPatience || 4;
    let patiencePct = Math.round((patience / maxPatience) * 100);
    let patienceColor = patiencePct > 60 ? "color-green" : (patiencePct > 30 ? "color-amber" : "color-red");
    let progressBg = patiencePct > 60 ? "var(--green)" : (patiencePct > 30 ? "var(--amber)" : "var(--red)");

    let historyHtml = (buyer.dialogHistory || []).map(m => `
        <div class="chat-msg ${m.from === 'me' ? 'msg-player' : 'msg-seller'}" style="margin-bottom:6px;">
            ${m.text}
        </div>
    `).join('');

    let actionButtonsGrid = "";
    if (patience <= 0) {
        actionButtonsGrid = `
            <div class="p-2 mb-2 text-center" style="background:rgba(255,51,102,0.1); border-radius:10px; border:1px solid var(--red);">
                <b class="color-red text-xs block mb-1">🚫 ПОКУПАТЕЛЬ УСТАЛ ОТ ТОРГА И ЗАФИКСИРОВАЛ ЦЕНУ!</b>
                <div class="sub-label" style="font-size:9px;">Дальнейшие попытки сбить цену приведут к срыву сделки.</div>
            </div>
        `;
    } else {
        actionButtonsGrid = `
            <div class="grid-3 mb-2" style="gap:4px;">
                <button onclick="executeModalHaggleStep(4, 12)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                    <div class="font-bold color-green text-xs" style="font-size:9.5px;">-4% НА ДОРОГУ</div>
                    <div class="sub-label" style="font-size:7.5px;">РИСК: 12%</div>
                </button>

                <button onclick="executeModalHaggleStep(8, 30)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                    <div class="font-bold color-amber text-xs" style="font-size:9.5px;">-8% ПО ФАКТУ</div>
                    <div class="sub-label" style="font-size:7.5px;">РИСК: 30%</div>
                </button>

                <button onclick="executeModalHaggleStep(15, 60)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                    <div class="font-bold color-red text-xs" style="font-size:9.5px;">-15% ЖЕСТКО</div>
                    <div class="sub-label" style="font-size:7.5px;">РИСК: 60%</div>
                </button>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal-box chat-deal-box" style="max-width:440px;">
            <div class="chat-header-bar flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <div class="chat-avatar-circle" style="font-size:20px;">${buyer.avatar}</div>
                    <div>
                        <div class="font-bold text-xs">${buyer.name} (Покупатель у капота)</div>
                        <div class="text-xs color-green">● Личная встреча у капота</div>
                    </div>
                </div>
                <button onclick="closeModal('modalLotHoodDeal')" class="btn btn-dark btn-auto btn-sm">✕</button>
            </div>

            <!-- КАРТОЧКА ПРЕВЬЮ АВТОМОБИЛЯ -->
            <div class="deal-car-preview-card mb-2">
                <img ${carImgAttrs} class="deal-car-thumb">
                <div style="flex:1;">
                    <div class="font-bold text-xs">${car.name}</div>
                    <div class="text-xs sub-label">Пробег: ${(car.mileage || 85000).toLocaleString()} км / Госномер: ${plateText}</div>
                    <div class="price-val text-xs color-green" id="modalLotDealPrice">${currentOffer.toLocaleString()} ₽</div>
                </div>
            </div>

            <!-- ЛЕНТА ПЕРЕГОВОРОВ И ПРОВЕРОК -->
            <div class="chat-thread-container mb-2" id="modalLotChatThread" style="max-height:160px; min-height:120px; overflow-y:auto; padding:8px;">
                ${historyHtml}
            </div>

            <!-- НЕОНОВАЯ ШКАЛА ТЕРПЕНИЯ -->
            <div class="mb-2 p-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                <div class="flex-between text-xs mb-1" style="font-size:9.5px;">
                    <span>Терпение покупателя:</span>
                    <b class="${patienceColor}">${patiencePct}% (${patience} попыток)</b>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                    <div style="width:${patiencePct}%; height:100%; background:${progressBg}; transition:width 0.3s ease;"></div>
                </div>
            </div>

            <!-- КНОПКИ ТОРГА -->
            ${actionButtonsGrid}

            <!-- ГЛАВНЫЕ КНОПКИ ДЕЙСТВИЯ -->
            <div class="grid-2" style="gap:6px;">
                <button onclick="closeModal('modalLotHoodDeal')" class="btn btn-dark">
                    УЕХАТЬ СО ВСТРЕЧИ 🚗
                </button>
                <button onclick="confirmLotHoodDKP()" class="btn btn-green font-bold">
                    ОФОРМИТЬ ДКП 🤝
                </button>
            </div>
        </div>
    `;

    const thread = document.getElementById('modalLotChatThread');
    if (thread) thread.scrollTop = thread.scrollHeight;
}

function executeModalHaggleStep(percent, failRisk) {
    if (activeSalesLotHaggleIndex === null) return;
    const lot = state.salesLot[activeSalesLotHaggleIndex];
    if (!lot || !lot.buyer) return;

    const car = lot.car || lot;
    const buyer = lot.buyer;
    if (buyer.patience <= 0) return showToast("Покупатель больше не торгуется!");

    buyer.patience -= 1;
    if (!buyer.dialogHistory) buyer.dialogHistory = [];

    let actualRisk = failRisk;
    if (buyer.riskTolerance === 'high') actualRisk -= 10;
    if (buyer.riskTolerance === 'low') actualRisk += 15;

    let karma = state.player?.karma !== undefined ? state.player.karma : 50;
    let lvl = state.player?.level || 1;
    actualRisk = Math.max(5, Math.min(95, actualRisk - (lvl * 0.3) - ((karma - 50) * 0.2)));

    // СЛУЧАЙНАЯ ПРОВЕРКА МАШИНЫ ПОКУПАТЕЛЕМ В ПРОЦЕССЕ ТОРГА
    let inspectionTriggerRoll = Math.random();
    let inspectionMessage = "";

    if (inspectionTriggerRoll < 0.35 && !buyer.inspectionsDone.gauge) {
        buyer.inspectionsDone.gauge = true;
        let isRepainted = car.condition < 70 || car.bodyThickness?.doors > 200 || car.bodyThickness?.hood > 200;
        if (isRepainted) {
            let pen = Math.round((buyer.currentOffer || buyer.offeredPrice) * 0.05);
            buyer.currentOffer = Math.max(10000, (buyer.currentOffer || buyer.offeredPrice) - pen);
            inspectionMessage = `🔍 <i>[Покупатель достал толщиномер]</i>: «На приборе 280 мкм, шпаклёвка! Минус ${pen.toLocaleString()} ₽ за неродной окрас.»`;
        } else {
            inspectionMessage = `🔍 <i>[Покупатель достал толщиномер]</i>: «Проверил арки и капот — везде заводской слой, отлично!»`;
        }
    } else if (inspectionTriggerRoll < 0.65 && !buyer.inspectionsDone.obd) {
        buyer.inspectionsDone.obd = true;
        let hasErr = !!car.hiddenDefect || (car.wear?.engine < 50);
        if (hasErr) {
            let pen = Math.round((buyer.currentOffer || buyer.offeredPrice) * 0.06);
            buyer.currentOffer = Math.max(10000, (buyer.currentOffer || buyer.offeredPrice) - pen);
            inspectionMessage = `💻 <i>[Покупатель подключил Launch OBD2]</i>: «В блоке DME висит ошибка по смеси! Скидывай ${pen.toLocaleString()} ₽ на сервис.»`;
        } else {
            inspectionMessage = `💻 <i>[Покупатель подключил Launch OBD2]</i>: «Ошибок в памяти ЭБУ нет, блоки чистые.»`;
        }
    }

    let roll = Math.random() * 100;

    buyer.dialogHistory.push({ from: 'me', text: `«Скинь ${percent}%, у меня деньги на руках — забираю прямо сейчас!»` });

    if (inspectionMessage) {
        buyer.dialogHistory.push({ from: 'them', text: inspectionMessage });
    }

    if (roll < actualRisk) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');

        if (buyer.patience <= 0 || roll < 12) {
            buyer.dialogHistory.push({ from: 'them', text: `«Ты надоел торговаться, машина снята с продажи! Я поехал.»` });
            showToast("🚫 Покупатель психанул и уехал со встречи!");
            lot.currentBuyer = null;
            lot.buyer = null;
            lot.timer = 50;
            lot.maxTimer = 50;
            setTimeout(() => {
                ModalManager.close('modalLotHoodDeal');
                renderSalesLot();
            }, 1200);
            saveState();
            renderLotHoodHaggleModalContent();
            return;
        } else {
            buyer.dialogHistory.push({ from: 'them', text: `«Никаких скидок, цена и так по низу рынка за это состояние!»` });
            showToast("Покупатель отказался снижать цену!");
        }
    } else {
        let askingPrice = lot.askingPrice || car.price || 100000;
        let raiseAmount = Math.round(askingPrice * (percent / 100));

        buyer.currentOffer = Math.min(askingPrice, (buyer.currentOffer || buyer.offeredPrice) + raiseAmount);
        buyer.offeredPrice = buyer.currentOffer;
        buyer.lastReply = `«По рукам. Уступаю и накидываю +${raiseAmount.toLocaleString()} ₽, оформляем ДКП?»`;
        buyer.dialogHistory.push({ from: 'them', text: `«По рукам. Уступаю +${raiseAmount.toLocaleString()} ₽, оформляем ДКП!»` });

        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`Успешный торг! Предложение выросло на +${raiseAmount.toLocaleString()} ₽`);
    }

    saveState();
    renderLotHoodHaggleModalContent();
    renderSalesLot();
}

function confirmLotHoodDKP() {
    if (activeSalesLotHaggleIndex === null) return;
    const idx = activeSalesLotHaggleIndex;
    ModalManager.close('modalLotHoodDeal');
    acceptLotBuyerDeal(idx);
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
    activeSalesLotHaggleIndex = null;
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
    lot.timer = 45;
    lot.maxTimer = 45;

    activeSalesLotHaggleIndex = null;
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
                if (activeSalesLotHaggleIndex === idx) {
                    ModalManager.close('modalLotHoodDeal');
                }
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
    let cost = 120000 + (slots - 2) * 160000;

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
    let cost = 65000;

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
window.openLotHoodHaggleModal = openLotHoodHaggleModal;
window.renderLotHoodHaggleModalContent = renderLotHoodHaggleModalContent;
window.executeModalHaggleStep = executeModalHaggleStep;
window.confirmLotHoodDKP = confirmLotHoodDKP;
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
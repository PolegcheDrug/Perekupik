// ========================================================
// js/salesLot.js — ПЛОЩАДКА ПРОДАЖ И ТОРГ С ПОКУПАТЕЛЯМИ (v0.8.1)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Характеристики в 3 колонки слева направо (.spec-tile-3d-col),
// склад талонов, ускорение за Stars, расширенный пул клиентов,
// торг у капота (safe/firm) со шкалой терпения и возврат в гараж.
// ========================================================

let activeHaggleSlotIdx = null;

// ========================================================
// 1. УПРАВЛЕНИЕ СКЛАДОМ ЭКСПРЕСС-ТАЛОНОВ
// ========================================================
function upgradeExpressCapacity() {
    let maxT = 25;
    if (state.player && state.player.maxExpressTickets) maxT = state.player.maxExpressTickets;

    if (maxT >= 200) return showToast("Достигнут максимум склада талонов (200 шт)!");

    let cost = 50000;
    if (typeof getExpressTicketUpgradeCost === 'function') {
        cost = getExpressTicketUpgradeCost();
    } else {
        cost = 50000 + ((maxT - 25) / 25) * 35000;
    }

    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Не хватает денег! Нужно " + cost.toLocaleString() + " ₽");

    state.player.cash -= cost;
    state.player.maxExpressTickets = maxT + 25;

    saveState();
    renderSalesLot();
    updateHeaderUI();
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    showToast("Вместимость склада увеличена до " + state.player.maxExpressTickets + " талонов!");
}

// ========================================================
// 2. ОСНОВНОЙ РЕНДЕР ПЛОЩАДКИ ПРОДАЖ
// ========================================================
function renderSalesLot() {
    const list = document.getElementById('salesLotList');
    if (!list) return;

    let lCount = (state.salesLot && state.salesLot.length) ? state.salesLot.length : 0;
    setTxt('lotCountBadge', lCount + " авто на продаже");

    let curT = state.player?.expressTickets || 0;
    let maxT = state.player?.maxExpressTickets || 25;
    setTxt('expressCountDisplay', curT + " / " + maxT);

    const upgBtn = document.getElementById('btnUpgradeTickets');
    if (upgBtn) {
        let cost = 50000;
        if (typeof getExpressTicketUpgradeCost === 'function') {
            cost = getExpressTicketUpgradeCost();
        } else {
            cost = 50000 + ((maxT - 25) / 25) * 35000;
        }

        if (maxT >= 200) {
            upgBtn.innerText = "МАКСИМУМ (200)";
            upgBtn.disabled = true;
        } else {
            upgBtn.innerText = "Расширить склад (" + (cost / 1000).toFixed(0) + "k ₽)";
            upgBtn.disabled = false;
        }
    }

    const mainContent = document.querySelector('.main-content');
    const scrollPos = mainContent ? mainContent.scrollTop : 0;

    if (!state.salesLot || state.salesLot.length === 0) {
        list.innerHTML = `
            <div class='glass-card text-center sub-label py-8'>
                <i class='fa-solid fa-car-on color-green mb-2' style='font-size:36px;'></i>
                <div class='font-bold text-xs color-green mb-1'>Площадка продаж свободна</div>
                <div style='font-size:10px;'>Перейдите в гараж и выставьте подготовленные авто на продажу!</div>
            </div>`;
        return;
    }

    let htmlContent = "";

    state.salesLot.forEach((slot, idx) => {
        if (!slot || !slot.car) return;

        const car = slot.car;
        const buyer = slot.currentBuyer;

        let maxTimer = slot.maxTimer || 30;
        let progressPercent = ((maxTimer - slot.timer) / maxTimer) * 100;
        if (progressPercent < 0) progressPercent = 0;
        if (progressPercent > 100) progressPercent = 100;

        let clientStatus = "";
        if (slot.timer <= 0 && buyer) {
            clientStatus = "<span class='tag-badge bg-tag-green'><span class='led-dot led-green'></span> Клиент осматривает!</span>";
        } else {
            clientStatus = "<span class='tag-badge bg-tag-cyan'>Поиск покупателя...</span>";
        }

        // Блок таймера ожидания
        let timerBlock = "";
        let pTck = state.player?.expressTickets || 0;

        if (slot.timer > 0) {
            timerBlock = `
                <div class='p-2 mb-2' style='background:#090e18; border-radius:10px; border:1px solid rgba(255,255,255,0.06);'>
                    <div class='flex-between text-xs mb-1'>
                        <span class='sub-label'><i class='fa-solid fa-users color-cyan'></i> Ожидание покупателя:</span>
                        <b class='color-amber' id='lot_timer_text_${idx}'>${slot.timer}с</b>
                    </div>
                    <div class='lot-progress-wrap mb-2'>
                        <div class='lot-progress-bar' id='lot_progress_fill_${idx}' style='width: ${progressPercent}%;'></div>
                    </div>
                    <div class='grid-2'>
                        <button onclick='speedUpLotWithTicket(${idx})' class='btn btn-purple btn-sm'>
                            <i class='fa-solid fa-ticket'></i> Пропуск (${pTck} шт)
                        </button>
                        <button onclick='speedUpLotWithStars(${idx})' class='btn btn-amber btn-sm'>
                            <i class='fa-solid fa-star'></i> 5 Stars ⭐
                        </button>
                    </div>
                </div>`;
        }

        // Блок покупателя у капота
        let buyerBlock = "";
        if (buyer) {
            let disableHaggle = (buyer.offerPrice === 0 || buyer.patience <= 0) ? "disabled" : "";
            let bAva = buyer.avatar || "👨‍💼";
            let bName = buyer.name || "Покупатель";
            let bPrice = buyer.offerPrice || 0;
            let bStat = buyer.preStatus || "Машина меня устраивает, готов забрать за наличку.";

            let purchaseCost = car.purchaseCost || car.basePrice || Math.round(bPrice * 0.8);
            let estimatedProfit = bPrice - purchaseCost;

            buyerBlock = `
                <div class='p-2 mb-2' style='background:#090e18; border-radius:10px; border:1.5px solid var(--green); box-shadow: 0 0 14px rgba(0, 230, 118, 0.2);'>
                    <div class='flex-between mb-1'>
                        <div class='flex-gap' style='align-items:center;'>
                            <span style='font-size:22px;'>${bAva}</span>
                            <div>
                                <b class='text-xs color-green'>${bName}</b>
                                <div class='sub-label' style='font-size:8.5px;'>Терпение: <b class='${buyer.patience > 40 ? "color-green" : "color-red"}'>${buyer.patience || 100}%</b></div>
                            </div>
                        </div>
                        <div class='text-right'>
                            <span class='sub-label' style='font-size:8px;'>ПРЕДЛОЖЕНИЕ:</span>
                            <div class='price-val color-green' style='font-size:15px;'>${bPrice.toLocaleString()} ₽</div>
                        </div>
                    </div>

                    <div class='seller-dialog-bubble my-1' style='margin:4px 0 6px 0;'>
                        <span class='seller-bubble-text' style='font-size:9.5px;'>«${bStat}»</span>
                    </div>

                    <div class='flex-between text-xs mb-2 p-1' style='background:rgba(0,0,0,0.4); border-radius:6px;'>
                        <span class='sub-label'>Чистая прибыль со сделки:</span>
                        <b class='${estimatedProfit >= 0 ? "color-green" : "color-red"}'>
                            ${estimatedProfit >= 0 ? "+" : ""}${estimatedProfit.toLocaleString()} ₽
                        </b>
                    </div>

                    <div class='grid-3'>
                        <button onclick='acceptBuyerDeal(${idx})' class='btn btn-green btn-sm'>
                            <i class='fa-solid fa-handshake'></i> Продать
                        </button>
                        <button onclick='openHaggleSaleModal(${idx})' class='btn btn-amber btn-sm' ${disableHaggle}>
                            <i class='fa-solid fa-comments-dollar'></i> Торг 🗣️
                        </button>
                        <button onclick='rejectBuyerDeal(${idx})' class='btn btn-dark btn-sm'>
                            <i class='fa-solid fa-xmark'></i> Отказать
                        </button>
                    </div>
                </div>`;
        }

        let cImg = car.img || car.fallback || "assets/cars/economy/2101/vaz-2101.jpg";
        let cPlate = car.customPlate || car.plate || "ТРАНЗИТ";
        let cName = car.name || "Автомобиль";
        let cPower = car.power || 100;
        let cMileage = (typeof car.mileage === 'number') ? car.mileage.toLocaleString() : "85 000";
        let condVal = car.condition !== undefined ? car.condition : 80;

        let shieldIconClass = condVal >= 80 
            ? 'spec-tile-icon-shield' 
            : (condVal >= 50 ? 'spec-tile-icon-shield-mid' : 'spec-tile-icon-shield-low');
        let condColorClass = condVal >= 80 
            ? 'color-green' 
            : (condVal >= 50 ? 'color-amber' : 'color-red');

        let sPrice = slot.askingPrice || car.marketValue || 100000;
        let purchaseCost = car.purchaseCost || Math.round(sPrice * 0.75);
        let profitAtAsking = sPrice - purchaseCost;

        // Неоновая подсветка редких лотов
        let cardAuraClass = "card-anim-shimmer";
        if (car.isTunedSpec) cardAuraClass += " card-glow-tuned";
        else if (car.isBeaterProject) cardAuraClass += " card-glow-beater";

        let brandHeaderHtml = (typeof formatCarBrandBadgeHtml === 'function') 
            ? formatCarBrandBadgeHtml(cName) 
            : `<div class='car-title-plate'>${cName}</div>`;

        htmlContent += `
        <div class='glass-card mb-3 ${cardAuraClass}'>
            <!-- ЧИСТАЯ ОБЛОЖКА БЕЗ ПЕРЕГРУЖАЮЩИХ ОВЕРЛЕЕВ -->
            <div class='car-img-wrap' style='height:155px;'>
                <img src='${cImg}' class='car-img' onerror="this.src='${car.fallback || "assets/cars/economy/2101/vaz-2101.jpg"}';">
            </div>

            <!-- ВЕРХНИЙ БЛОК: ШИЛЬДИК МАРКИ, ТЕГИ С НОМЕРОМ И ЦЕНА ВЫСТАВЛЕНИЯ -->
            <div class='car-header-row-volumetric'>
                <div style='flex:1; min-width:0; margin-right:8px;'>
                    ${brandHeaderHtml}
                    <div class='car-status-badges-row mt-1'>
                        <div class='plate-mini-capsule notranslate' translate='no'>
                            ${cPlate} <span class='plate-flag-mini'>RUS</span>
                        </div>
                        <span class='tag-badge bg-tag-green'>НА ПЛОЩАДКЕ</span>
                        ${car.isTunedSpec ? "<span class='tag-badge bg-tag-purple'>🔥 КОРЧ</span>" : ""}
                        ${car.isBeaterProject ? "<span class='tag-badge bg-tag-red'>💥 ПРОЕКТ</span>" : ""}
                    </div>
                </div>

                <div class='car-price-badge-3d'>
                    <span class='car-price-label-sub'>Цена на лоте</span>
                    <span class='car-price-value-3d'>${sPrice.toLocaleString()} ₽</span>
                    <div class='market-price-margin-row ${profitAtAsking >= 0 ? "color-green" : "color-red"}'>
                        ${profitAtAsking >= 0 ? "▲ +" : "▼ "}${profitAtAsking.toLocaleString()} ₽ маржа
                    </div>
                </div>
            </div>

            <!-- ХАРАКТЕРИСТИКИ СЛЕВА НАПРАВО В 3 КОЛОНКИ (.spec-tile-3d-col) -->
            <div class='car-specs-grid-volumetric'>
                <div class='spec-tile-3d-col'>
                    <div class='spec-tile-icon-wrap spec-tile-icon-power'>
                        <i class='fa-solid fa-bolt'></i>
                    </div>
                    <div class='spec-tile-col-data'>
                        <span class='spec-tile-col-label'>Мощность</span>
                        <b class='color-amber'>${cPower} л.с.</b>
                    </div>
                </div>

                <div class='spec-tile-3d-col'>
                    <div class='spec-tile-icon-wrap spec-tile-icon-road'>
                        <i class='fa-solid fa-road'></i>
                    </div>
                    <div class='spec-tile-col-data'>
                        <span class='spec-tile-col-label'>Пробег</span>
                        <b class='color-cyan'>${cMileage} км</b>
                    </div>
                </div>

                <div class='spec-tile-3d-col'>
                    <div class='spec-tile-icon-wrap ${shieldIconClass}'>
                        <i class='fa-solid fa-shield'></i>
                    </div>
                    <div class='spec-tile-col-data'>
                        <span class='spec-tile-col-label'>Кузов</span>
                        <b class='${condColorClass}'>${condVal}%</b>
                    </div>
                </div>
            </div>

            <!-- БЛОК СТАТУСА КЛИЕНТА / ТАЙМЕРА И ПОКУПАТЕЛЯ -->
            <div class='mb-2 flex-between'>
                <span class='sub-label text-xs'>Статус площадки:</span>
                ${clientStatus}
            </div>

            ${timerBlock}
            ${buyerBlock}

            <button onclick='withdrawFromLot(${idx})' class='btn btn-dark w-full mt-1 btn-sm'>
                <i class='fa-solid fa-rotate-left mr-1'></i> Забрать обратно в гараж
            </button>
        </div>`;
    });

    list.innerHTML = htmlContent;
    if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
}

// ========================================================
// 3. УСКОРЕНИЕ ПОИСКА (ТАЛОНЫ И STARS)
// ========================================================
function speedUpLotWithTicket(idx) {
    let tck = state.player?.expressTickets || 0;
    if (tck <= 0) {
        return showToast("У вас нет Экспресс-пропусков! Купите у Решалы или дождитесь смены дня.");
    }

    state.player.expressTickets -= 1;
    const slot = state.salesLot[idx];
    if (!slot) return;

    slot.timer = 0;
    generateBuyerForSlot(slot);

    saveState();
    updateHeaderUI();
    renderSalesLot();
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    showToast("🎟️ Экспресс-пропуск активирован! Клиент уже у капота.");
}

function speedUpLotWithStars(idx) {
    let stars = state.player?.stars || 0;
    if (stars < 5) {
        return showToast("Не хватает 5 Telegram Stars ⭐!");
    }

    state.player.stars -= 5;
    const slot = state.salesLot[idx];
    if (!slot) return;

    slot.timer = 0;
    generateBuyerForSlot(slot);

    saveState();
    updateHeaderUI();
    renderSalesLot();
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    showToast("⭐ VIP-покупатель сразу у капота!");
}

// ========================================================
// 4. ТОРГ У КАПОТА (ОРИГИНАЛЬНАЯ МЕХАНИКА SAFE / FIRM)
// ========================================================
function openHaggleSaleModal(idx) {
    activeHaggleSlotIdx = idx;
    const slot = state.salesLot[idx];
    if (!slot || !slot.currentBuyer) return;

    const buyer = slot.currentBuyer;
    let karma = state.player?.karma || 50;
    let bKarma = buyer.minKarma || 0;

    if (karma < bKarma) {
        return showToast("Ваша репутация слишком низкая для торга с этим покупателем!");
    }

    let riskClass = "color-red";
    let fillClass = "risk-high";
    if (buyer.patience > 50) {
        riskClass = "color-green";
        fillClass = "risk-low";
    } else if (buyer.patience > 25) {
        riskClass = "color-amber";
        fillClass = "risk-mid";
    }

    let bAva = buyer.avatar || "👨‍💼";
    let bName = buyer.name || "Покупатель";
    let bPrice = buyer.offerPrice || 0;

    const html = `
        <div class='modal-box text-center' style='max-width: 400px;'>
            <div class='modal-glow-badge mb-1' style='color:var(--amber); border-color:rgba(255,179,0,0.4);'>
                <i class='fa-solid fa-comments-dollar color-amber mr-1'></i> ТОРГ У КАПОТА
            </div>
            <div class='text-xs color-cyan font-bold mb-1'>${bAva} ${bName}</div>
            <div class='sub-label mb-2 color-amber'>Текущее предложение: <b>${bPrice.toLocaleString()} ₽</b></div>
            
            <div class='risk-meter-box mb-3'>
                <div class='flex-between text-xs mb-1'>
                    <span>Терпение покупателя:</span>
                    <b class='${riskClass}'>${buyer.patience}%</b>
                </div>
                <div class='risk-track'>
                    <div class='risk-fill ${fillClass}' style='width: ${buyer.patience}%;'></div>
                </div>
            </div>

            <div class='space-y-2 mb-3'>
                <button onclick="attemptHaggleSale('safe')" class='btn btn-dark w-full'>
                    🛡️ Обосновать по кузову (+2% к цене / Риск 15%)
                </button>
                <button onclick="attemptHaggleSale('firm')" class='btn btn-dark w-full'>
                    🔥 Давить на эксклюзив (+6% к цене / Риск 40%)
                </button>
            </div>

            <button onclick="closeHaggleSaleModal()" class='btn btn-dark w-full'>
                Назад к предложению
            </button>
        </div>
    `;

    let mod = document.getElementById('modalHaggleSale');
    if (!mod) {
        mod = document.createElement('div');
        mod.id = 'modalHaggleSale';
        mod.className = 'modal-overlay';
        document.body.appendChild(mod);
    }

    mod.innerHTML = html;
    if (typeof ModalManager !== 'undefined') {
        ModalManager.open('modalHaggleSale');
    } else {
        mod.classList.add('active');
    }
    if (typeof playSound === 'function') playSound('tick');
}

function closeHaggleSaleModal() {
    if (typeof ModalManager !== 'undefined') {
        ModalManager.close('modalHaggleSale');
    } else {
        const mod = document.getElementById('modalHaggleSale');
        if (mod) mod.classList.remove('active');
    }
}

function attemptHaggleSale(strategy) {
    if (activeHaggleSlotIdx === null) return;
    const slot = state.salesLot[activeHaggleSlotIdx];
    if (!slot || !slot.currentBuyer) return;

    const buyer = slot.currentBuyer;
    let lvl = state.player?.level || 1;

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
        closeHaggleSaleModal();
        rejectBuyerDeal(activeHaggleSlotIdx);
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');
        return showToast("🤬 Покупатель психанул и ушёл с площадки!");
    } else {
        const ask = slot.askingPrice || 100000;
        const bOff = buyer.offerPrice || 100000;
        let newOffer = Math.round(bOff * (1 + priceBoost));
        if (newOffer > ask) newOffer = ask;

        buyer.offerPrice = newOffer;
        buyer.patience -= patienceHit;

        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('medium');
        openHaggleSaleModal(activeHaggleSlotIdx);
        showToast("Удалось накинуть цену, но терпение покупателя падает!");
        saveState();
        renderSalesLot();
    }
}

// ========================================================
// 5. ГЕНЕРАЦИЯ ПОКУПАТЕЛЯ ИЗ РАСШИРЕННОГО ПУЛА
// ========================================================
function generateBuyerForSlot(slot) {
    const car = slot.car;
    let asking = slot.askingPrice || car.marketValue || 100000;
    let mVal = car.marketValue || car.basePrice || 100000;

    if (typeof EXPANDED_BUYERS_POOL !== 'undefined' && Array.isArray(EXPANDED_BUYERS_POOL) && EXPANDED_BUYERS_POOL.length > 0) {
        const b = EXPANDED_BUYERS_POOL[Math.floor(Math.random() * EXPANDED_BUYERS_POOL.length)];
        let rate = Math.min(1.08, (b.rate || 0.95) + 0.05);

        if (car.isTunedSpec && b.type === 'drifter') rate += 0.12;
        if (car.isPolished) rate += 0.06;

        let fairPrice = Math.round(mVal * rate);
        let finalOffer = Math.min(asking, fairPrice);

        slot.currentBuyer = {
            name: b.name,
            avatar: b.avatar,
            type: b.type,
            minKarma: b.minKarma || 0,
            offerPrice: finalOffer,
            preStatus: b.preStatus || "Машина понравилась, готов забрать.",
            rejectSay: b.rejectSay || "Ну и ладно, поищу другой вариант.",
            patience: 100
        };
    } else {
        // Резервный пул покупателей
        const defaultBuyers = [
            { name: "Александр (Семейный)", avatar: "👨‍💼", type: "family", rate: 0.95, minKarma: 30, preStatus: "Ищу надёжный авто для семьи. Готов брать." },
            { name: "Руслан (С района)", avatar: "🧢", type: "street", rate: 1.02, minKarma: 0, preStatus: "Вид имеет, звук зачётный. Забираю за нал." },
            { name: "Олег (Автоподбор)", avatar: "🔍", type: "podbor", rate: 0.92, minKarma: 50, preStatus: "Проверил по базам, клиент утвердил сделку." },
            { name: "Артур (Теневой)", avatar: "🕶️", type: "shady", rate: 1.05, minKarma: 0, preStatus: "Документы в порядке? Деньги на руках." }
        ];
        const b = defaultBuyers[Math.floor(Math.random() * defaultBuyers.length)];
        let finalOffer = Math.min(asking, Math.round(mVal * b.rate));

        slot.currentBuyer = {
            name: b.name,
            avatar: b.avatar,
            type: b.type,
            minKarma: b.minKarma,
            offerPrice: finalOffer,
            preStatus: b.preStatus,
            rejectSay: "Пойду посмотрю соседние ряды.",
            patience: 100
        };
    }
}

// ========================================================
// 6. ЗАВЕРШЕНИЕ СДЕЛКИ И ВЫВОД ИЗ ЛОТА
// ========================================================
function acceptBuyerDeal(idx) {
    const slot = state.salesLot[idx];
    if (!slot || !slot.currentBuyer) return;

    const buyer = slot.currentBuyer;
    const car = slot.car;
    const cost = car.purchaseCost || car.basePrice || Math.round(buyer.offerPrice * 0.85);
    const netProfit = buyer.offerPrice - cost;

    state.player.cash = (state.player.cash || 0) + buyer.offerPrice;

    if (!state.player.stats) state.player.stats = {};
    state.player.stats.sold = (state.player.stats.sold || 0) + 1;
    state.player.stats.totalNetProfit = (state.player.stats.totalNetProfit || 0) + netProfit;

    if (netProfit >= 0) {
        state.player.stats.profitableSales = (state.player.stats.profitableSales || 0) + 1;
    } else {
        state.player.stats.lossSales = (state.player.stats.lossSales || 0) + 1;
    }

    addXp(35);

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('sell_car', 1);
        if (netProfit > 50000) trackQuestProgress('profitable_deal', 1);
    }

    state.salesLot.splice(idx, 1);
    saveState();
    updateHeaderUI();
    renderSalesLot();
    if (typeof renderGarage === 'function') renderGarage();
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');

    openVerdictModal(
        "СДЕЛКА ЗАКРЫТА! 🎉",
        `Покупатель «${buyer.name}» выкупил ${car.name}!\n\nСумма сделки: +${buyer.offerPrice.toLocaleString()} ₽\nЧистая прибыль: ${netProfit >= 0 ? "+" : ""}${netProfit.toLocaleString()} ₽ (+35 XP)`,
        true,
        buyer.offerPrice,
        netProfit
    );
}

function rejectBuyerDeal(idx) {
    const slot = state.salesLot[idx];
    if (!slot) return;

    slot.currentBuyer = null;
    slot.timer = 30;

    saveState();
    renderSalesLot();
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');
    showToast("Ждём следующего покупателя...");
}

function withdrawFromLot(idx) {
    const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
    let curSlots = state.garage ? state.garage.length : 0;

    if (curSlots >= maxSlots) {
        return showToast("В гараже нет свободного места для возврата автомобиля!");
    }

    const slot = state.salesLot.splice(idx, 1)[0];
    if (slot && slot.car) {
        if (!state.garage) state.garage = [];
        state.garage.push(slot.car);
    }

    saveState();
    if (typeof renderGarage === 'function') renderGarage();
    renderSalesLot();
    updateHeaderUI();
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');
    showToast("Автомобиль возвращён в бокс гаража.");
}

// Экспорт всех методов в глобальный объект window
window.upgradeExpressCapacity = upgradeExpressCapacity;
window.renderSalesLot = renderSalesLot;
window.speedUpLotWithTicket = speedUpLotWithTicket;
window.speedUpLotWithStars = speedUpLotWithStars;
window.openHaggleSaleModal = openHaggleSaleModal;
window.closeHaggleSaleModal = closeHaggleSaleModal;
window.attemptHaggleSale = attemptHaggleSale;
window.generateBuyerForSlot = generateBuyerForSlot;
window.acceptBuyerDeal = acceptBuyerDeal;
window.rejectBuyerDeal = rejectBuyerDeal;
window.withdrawFromLot = withdrawFromLot;
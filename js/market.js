// ========================================================
// js/market.js — ГЛАВНЫЙ КОНТРОЛЛЕР АВТОРЫНКА (v1.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Каскадный фолбек картинок: gazel_6 → gazel → images[0]
//                            → fallback категории → дефолт
// ========================================================

let marketSortOrder = 'asc';
let activePendingDKPDeal = null;

function t(key) {
    let lang = state.lang || 'ru';
    if (typeof I18N_TRANSLATIONS !== 'undefined' && I18N_TRANSLATIONS[lang] && I18N_TRANSLATIONS[lang][key]) {
        return I18N_TRANSLATIONS[lang][key];
    }
    return key;
}

function toggleMarketCategories() {
    const grid = document.getElementById('marketCatListContainer');
    const btnIcon = document.querySelector('#btnToggleMarketGrid i');
    if (!grid) return;
    grid.classList.toggle('collapsed');
    if (btnIcon) {
        btnIcon.className = grid.classList.contains('collapsed') ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-up";
    }
}

function toggleMarketSortOrder() {
    marketSortOrder = marketSortOrder === 'asc' ? 'desc' : 'asc';
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');
    showToast(marketSortOrder === 'asc' ? "Сортировка: сначала дешевле ⬆️" : "Сортировка: сначала дороже ⬇️");
    sortCurrentMarketFeed();
    renderMarketFeed();
}

function sortCurrentMarketFeed() {
    if (!state.marketFeed || state.marketFeed.length === 0) return;
    state.marketFeed.sort((a, b) => {
        let pA = a?.price || 0;
        let pB = b?.price || 0;
        return marketSortOrder === 'asc' ? pA - pB : pB - pA;
    });
}

async function setCategory(cat) {
    let lvl = state.player?.level ? state.player.level : 1;
    
    if (cat === 'moto' && lvl < 5) return showToast("🔒 Мотоциклы доступны с 5 уровня!");
    if (cat === 'atv' && lvl < 8) return showToast("🔒 Квадроциклы доступны с 8 уровня!");
    if (cat === 'comfort' && lvl < 15) return showToast("🔒 Класс «Комфорт» открывается с 15 уровня!");
    if (cat === 'premium' && lvl < 30) return showToast("🔒 Премиум доступен с 30 уровня!");
    if (cat === 'hyper' && lvl < 50) return showToast("🔒 Гиперкары доступны с 50 уровня!");
    if (cat === 'truck' && lvl < 50) return showToast("🔒 Грузовики доступны с 50 уровня!");
    if (cat === 'yacht' && lvl < 100) return showToast("🔒 Яхты доступны со 100 уровня!");
    
    state.activeCategory = cat;
    
    document.querySelectorAll('.cat-tile').forEach(c => c.classList.remove('active'));
    const btn = document.getElementById("catBtn-" + cat);
    if (btn) btn.classList.add('active');

    const meta = CATEGORY_META[cat] ? CATEGORY_META[cat] : CATEGORY_META.economy;
    if (typeof setTxt === 'function') {
        setTxt("currentCatBadge", meta.name);
        setTxt("catInfoTitle", "<i class='fa-solid fa-chart-line'></i> " + meta.title + ":");
        setTxt("catInfoPrice", "Капитал: " + meta.capital);
        setTxt("catInfoDesc", meta.desc);
    }

    if (typeof playSound === 'function') playSound('tick');
    await populateMarketFeed();
}

async function refreshMarketFeedManual() {
    const cost = getMarketRefreshCost();
    let pCash = (state.player && state.player.cash) ? state.player.cash : 0;
    let pFuel = (state.player && state.player.fuel !== undefined) ? state.player.fuel : 0;

    if (pCash < cost) return showToast("Не хватает " + cost.toLocaleString() + " ₽!");
    if (pFuel < 5) return showToast("Закончился бензин ⛽! Заправьтесь на АЗС.");
    
    state.player.cash -= cost;
    state.player.fuel -= 5;
    
    const grid = document.getElementById('marketCatListContainer');
    const btnIcon = document.querySelector('#btnToggleMarketGrid i');
    if (grid && !grid.classList.contains('collapsed')) {
        grid.classList.add('collapsed');
        if (btnIcon) btnIcon.className = "fa-solid fa-chevron-down";
    }

    if (typeof saveState === 'function') saveState();
    await populateMarketFeed();
    renderMarketFeed();
    showToast("Лента предложений обновлена (-5 ⛽)!");
}

function promptHiddenPlateAutotekaHint(event) {
    if (event) event.stopPropagation();
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');
    showToast("🔒 Продавец скрыл госномер в объявлении. Закажите Автотеку, чтобы узнать знак!");
}

function renderMarketFeed() {
    const container = document.getElementById('marketCardContainer');
    if (!container) return;
    
    const refreshText = document.getElementById('refreshCostText');
    if (refreshText) refreshText.innerText = getMarketRefreshCost().toLocaleString();
    
    const mainContent = document.querySelector('.main-content');
    const scrollPos = mainContent ? mainContent.scrollTop : 0;
    const now = Date.now();

    if (!state.marketFeed || state.marketFeed.length === 0) {
        container.innerHTML = `<div class='glass-card text-center py-6 sub-label'>${t('classes_title')}: нет активных лотов. Нажмите «${t('btn_refresh_market')}»!</div>`;
        return;
    }

    let sortBarHtml = `
        <div class="glass-card mb-2 p-2 flex-between" style="border-color: rgba(255, 255, 255, 0.08);">
            <span class="text-xs sub-label">Сортировка предложений:</span>
            <button onclick="toggleMarketSortOrder()" class="btn btn-dark btn-sm btn-auto" style="padding: 4px 10px; font-size: 10px;">
                <i class="fa-solid fa-arrow-down-wide-short color-cyan mr-1"></i>
                ${marketSortOrder === 'asc' ? 'Сначала дешевле (▲)' : 'Сначала дороже (▼)'}
            </button>
        </div>
    `;
    
    let htmlContent = sortBarHtml;
    
    state.marketFeed.forEach(car => {
        if (!car || car.unavailable) return;
        
        let isBusy = (car.cooldownUntil && car.cooldownUntil > now);
        let timeLeft = isBusy ? Math.ceil((car.cooldownUntil - now) / 1000) : 0;
        
        let carMileage = (typeof car.mileage === 'number') ? car.mileage.toLocaleString() : "85 000";
        let carPrice = (typeof car.price === 'number') ? car.price.toLocaleString() : "100 000";
        let carMarketVal = (typeof car.marketValue === 'number') ? car.marketValue.toLocaleString() : carPrice;
        let carType = car.type ? car.type.toUpperCase() : "CAR";
        
        // ⭐ КАСКАДНЫЙ ФОЛБЕК
        let fallbackUrl = car.fallback || getCategoryFallback(car.type);
        let rawImg = car.img ? car.img : fallbackUrl;
        let carImgAttrs = (typeof buildCarImageAttrs === 'function')
            ? buildCarImageAttrs(rawImg, car)
            : `src="${rawImg}" onerror="this.onerror=null; this.src='${fallbackUrl}'"`;
        
        let viewedBadge = car.viewed ? `<div class='viewed-badge'><i class='fa-solid fa-eye'></i> ${t('inspected')}</div>` : "";
        let busyClass = isBusy ? "busy" : "";
        let viewedClass = car.viewed ? "viewed-card" : "";
        let autoIcon = car.autotekaChecked ? "Проверено ✓" : "5,000 ₽";

        let cardAuraClass = "card-anim-shimmer";
        if (car.isP2PUserListing) cardAuraClass += " personal-car-card";
        else if (car.isMuseumStock) cardAuraClass += " card-glow-urgent";
        else if (car.isTunedSpec) cardAuraClass += " card-glow-tuned";
        else if (car.isBeaterProject) cardAuraClass += " card-glow-beater";

        let isBodyKnown = !!car.inspectedAtHood || car.isP2PUserListing;
        let condVal = car.condition || 80;
        let shieldIconClass = "spec-tile-icon-unknown";
        let condValueHtml = `<b class="color-sub">У капота</b>`;

        if (isBodyKnown) {
            shieldIconClass = condVal >= 80 
                ? 'spec-tile-icon-shield' 
                : (condVal >= 50 ? 'spec-tile-icon-shield-mid' : 'spec-tile-icon-shield-low');
            let condColorClass = condVal >= 80 
                ? 'color-green' 
                : (condVal >= 50 ? 'color-amber' : 'color-red');
            condValueHtml = `<b class="${condColorClass}">${condVal}%</b>`;
        }

        let isPlateRevealed = !!car.autotekaChecked || car.isP2PUserListing;
        let plateInRowHtml = "";

        if (isPlateRevealed) {
            plateInRowHtml = `
                <div class="plate-mini-capsule notranslate" translate="no">
                    ${car.plate} <span class="plate-flag-mini">RUS</span>
                </div>
            `;
        } else {
            let regionNum = (car.plate && car.plate.split(' ')[1]) ? car.plate.split(' ')[1] : "77";
            plateInRowHtml = `
                <div class="plate-hidden-capsule notranslate" onclick="promptHiddenPlateAutotekaHint(event)" translate="no" title="Нажмите для подсказки">
                    <i class="fa-solid fa-lock" style="font-size:8px; margin-right:4px;"></i> • ••• •• ${regionNum}
                </div>
            `;
        }

        let statusBadgesHtml = `<span class='tag-badge bg-tag-cyan'>${carType}</span>`;

        if (car.isP2PUserListing) {
            statusBadgesHtml += "<span class='tag-badge bg-tag-green font-bold'>ИГРОК P2P</span>";
        } else if (car.isMuseumStock) {
            statusBadgesHtml += "<span class='tag-badge bg-tag-amber'>🏆 КАПСУЛА</span>";
        } else if (car.isTunedSpec) {
            statusBadgesHtml += "<span class='tag-badge bg-tag-purple'>🔥 КОРЧ</span>";
        } else if (car.isBeaterProject) {
            statusBadgesHtml += "<span class='tag-badge bg-tag-red'>💥 ПОД ПРОЕКТ</span>";
        } else if (car.dealType === 'urgent') {
            statusBadgesHtml += "<span class='tag-badge bg-tag-green'>⚡ СРОЧНО</span>";
        }

        let pVal = evaluatePlate(car.plate);
        if (isPlateRevealed && pVal > 15000) {
            statusBadgesHtml += "<span class='tag-badge badge-shimmer-gold'>🏷️ БЛАТНОЙ</span>";
        }

        if (car.isStolen && isPlateRevealed) {
            statusBadgesHtml += "<span class='tag-badge badge-police-strobe'>🚨 РОЗЫСК</span>";
        }

        let sellerNameRowHtml = "";
        if (car.isP2PUserListing) {
            let fxClass = car.sellerNickEffectClass || "nick-fx-lightning";
            sellerNameRowHtml = `
                <div class="sub-label mb-1" style="font-size:9px;">
                    Продавец: <b class="font-bold ${fxClass}" style="font-size:11px;">${car.sellerPlayerName}</b>
                </div>
            `;
        }

        let sellerDialogHtml = car.sellerNote ? `
            <div class="seller-dialog-bubble">
                <span class="seller-mood-icon">${car.sellerMoodIcon || '🚗'}</span>
                <span class="seller-bubble-text">${car.sellerNote}</span>
            </div>
        ` : "";

        let estimatedProfit = (car.marketValue || 0) - (car.price || 0);
        let marginBadgeHtml = estimatedProfit > 0 
            ? `<div class="market-price-margin-row color-green">▲ +${estimatedProfit.toLocaleString()} ₽ маржа</div>`
            : `<div class="market-price-margin-row color-red">▼ В убыток</div>`;

        let odoWarningPill = (isPlateRevealed && car.rolledOdometer) 
            ? `<span class="color-red font-bold ml-1" style="font-size:8px;">[скручен]</span>` 
            : "";

        htmlContent += `
        <div class='glass-card mb-3 ${busyClass} ${viewedClass} ${cardAuraClass}' id='card_${car.id}'>
            ${viewedBadge}
            
            <div class='cooldown-timer notranslate' translate='no' style='${isBusy ? "display:flex !important;" : "display:none !important;"}'>
                <div class='timer-clock notranslate' translate='no' id='timer_num_${car.id}'>${timeLeft}с</div>
                <div class='timer-text'>${t('busy_subscriber')}</div>
                <button onclick="paidCallMarketCar('${car.id}')" class='btn btn-amber' style='width: 80%;'>${t('paid_call')} (1,000 ₽)</button>
            </div>

            <div class='car-img-wrap'>
                <img id="market_car_img_${car.id}" ${carImgAttrs} class='car-img'>
            </div>

            <div class="car-header-row-volumetric">
                <div style="flex:1; min-width:0; margin-right:8px;">
                    ${formatCarBrandBadgeHtml(car.name)}
                    ${sellerNameRowHtml}
                    <div class="car-status-badges-row mt-1">
                        ${statusBadgesHtml}
                        ${plateInRowHtml}
                    </div>
                </div>

                <div class="car-price-badge-3d">
                    <span class="car-price-label-sub">Цена продавца</span>
                    <span class="car-price-value-3d" id='price_txt_${car.id}'>${carPrice} ₽</span>
                    ${marginBadgeHtml}
                </div>
            </div>

            <div class="car-specs-grid-volumetric">
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
                        <b class="color-cyan">${carMileage} км${odoWarningPill}</b>
                    </div>
                </div>

                <div class="spec-tile-3d-col">
                    <div class="spec-tile-icon-wrap ${shieldIconClass}">
                        <i class="fa-solid ${isBodyKnown ? 'fa-shield' : 'fa-circle-question'}"></i>
                    </div>
                    <div class="spec-tile-col-data">
                        <span class="spec-tile-col-label">Кузов</span>
                        ${condValueHtml}
                    </div>
                </div>
            </div>

            ${sellerDialogHtml}

            <div class="p-2 mb-2 flex-between" style="background:#090e18; border-radius:10px; border:1px solid rgba(255,255,255,0.06);">
                <div>
                    <span class="sub-label text-xs">Оценка вторичного рынка:</span>
                    <div class="font-bold color-cyan text-xs" style="font-size:12px;">~${carMarketVal} ₽</div>
                </div>
                <div class="text-right">
                    <span class="sub-label text-xs">Разница от оценки:</span>
                    <div class="font-bold ${estimatedProfit > 0 ? 'color-green' : 'color-red'} text-xs" style="font-size:12px;">
                        ${estimatedProfit > 0 ? '+' : ''}${estimatedProfit.toLocaleString()} ₽
                    </div>
                </div>
            </div>

            <div class='mb-2'>
                <button onclick="openAutotekaModal('${car.id}')" class='btn btn-dark btn-sm w-full'>
                    <i class='fa-solid fa-file-waveform color-green mr-1'></i> ${t('autoteka')} (${autoIcon})
                </button>
            </div>

            <button onclick="initiateBuyMarketCar('${car.id}')" class="btn btn-cyan w-full font-bold">
                <i class="fa-solid fa-phone mr-1"></i> Позвонить и назначить встречу
            </button>
        </div>`;
    });
    
    container.innerHTML = htmlContent;
    if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
}

function updateMarketTimers() {
    if (!state.marketFeed) return;
    const now = Date.now();
    let needFullReRender = false;

    state.marketFeed.forEach(car => {
        if (!car) return;
        const cardEl = document.getElementById("card_" + car.id);
        const timerNumEl = document.getElementById("timer_num_" + car.id);

        if (car.cooldownUntil && car.cooldownUntil > now) {
            const timeLeft = Math.ceil((car.cooldownUntil - now) / 1000);
            if (timerNumEl) timerNumEl.innerText = timeLeft + "с";
            if (cardEl && !cardEl.classList.contains('busy')) cardEl.classList.add('busy');
        } else if (car.cooldownUntil && car.cooldownUntil <= now) {
            car.cooldownUntil = 0;
            if (cardEl) cardEl.classList.remove('busy');
            needFullReRender = true;
        }
    });

    if (needFullReRender) renderMarketFeed();
}

function confirmMarketPurchaseSuccess() {
    if (!pendingMarketCar) return;
    const car = pendingMarketCar.car;
    
    const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
    let currentSlots = state.garage ? state.garage.length : 0;

    if (currentSlots >= maxSlots) return showToast("Гараж полон! Вместимость: " + maxSlots + " мест.");
    
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    let price = car.price ? car.price : 0;

    if (cash < price) return showToast("Недостаточно денег на выкуп!");
    
    ModalManager.close("modalMarketDeal");

    activePendingDKPDeal = {
        type: 'buy',
        car: car,
        carIndex: pendingMarketCar.carIndex,
        seller: pendingMarketCar.sellerName || "Продавец",
        buyer: (state.player && state.player.name) ? state.player.name : "Перекуп #777",
        price: price
    };

    if (typeof openDKPModal === 'function') {
        openDKPModal(activePendingDKPDeal);
    } else {
        openRegistrationChoiceModal(activePendingDKPDeal);
    }
}

function openRegistrationChoiceModal(deal) {
    activePendingDKPDeal = deal;
    ModalManager.open('modalRegistrationChoice');
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');
}

function confirmRegistrationChoice(registerOnPlayer) {
    ModalManager.close('modalRegistrationChoice');
    if (!activePendingDKPDeal) return;

    if (registerOnPlayer) {
        let duty = 2850;
        let cash = state.player?.cash || 0;
        if (cash < duty) {
            showToast("Не хватает 2,850 ₽ на госпошлину МРЭО! Оформлено по ДКП.");
            activePendingDKPDeal.isRegisteredOnPlayer = false;
        } else {
            state.player.cash -= duty;
            activePendingDKPDeal.isRegisteredOnPlayer = true;
            showToast("Машина зарегистрирована в МРЭО ГИБДД (-2,850 ₽ госпошлина) ✓");
        }
    } else {
        activePendingDKPDeal.isRegisteredOnPlayer = false;
        showToast("Автомобиль оставлен на ДКП без постановки на учёт (Лимит: 10 дней)!");
    }

    openDriveRouteChoiceModal(activePendingDKPDeal);
}

function openDriveRouteChoiceModal(deal) {
    let modal = document.getElementById('modalRouteChoice');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalRouteChoice';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    let isReg = !!deal.isRegisteredOnPlayer;

    modal.innerHTML = `
        <div class="modal-box text-center" style="max-width: 420px;">
            <div class="modal-glow-badge mb-1" style="color:var(--cyan); border-color:rgba(0,242,254,0.4);">
                🚗 МАРШРУТ ПЕРЕГОНА В ГАРАЖ
            </div>
            <h3 class="font-bold mb-1 color-cyan">${deal.car.name}</h3>
            <div class="sub-label mb-3">Выберите, как перегнать только что купленный автомобиль:</div>

            <div class="space-y-2 mb-3 text-left">
                <div class="glass-card p-2" style="border: 1px solid var(--cyan); background: rgba(0,242,254,0.08);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-road"></i> По широкому проспекту</b>
                        <span class="tag-badge bg-tag-cyan">+15 XP</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9.5px;">Ровный асфальт, быстрый доезд. Но на перекрёстках дежурят экипажи ДПС с камерами.</div>
                    <div class="sub-label mb-2 color-amber" style="font-size:8.5px;">
                        ${isReg ? '✓ Авто на учёте РФ — проверка документов пройдёт легко.' : '⚠️ Авто без номеров/страховки — риск штрафа по ст. 12.37 КоАП РФ!'}
                    </div>
                    <button onclick="finishMarketCarBuyProcessRoute('highway')" class="btn btn-cyan btn-sm w-full">
                        Поехать по проспекту (Быстро)
                    </button>
                </div>

                <div class="glass-card p-2" style="border: 1px solid var(--amber); background: rgba(255,179,0,0.08);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber"><i class="fa-solid fa-signs-post"></i> Глухими дворами и промзонами</b>
                        <span class="tag-badge bg-tag-amber">БЕЗ ДПС</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9.5px;">Ни одного патруля ДПС. Но ямы и разбитая дорога могут повредить подвеску уставшей машины.</div>
                    <button onclick="finishMarketCarBuyProcessRoute('backstreets')" class="btn btn-amber btn-sm w-full">
                        Объехать дворами (Безопасно от ДПС)
                    </button>
                </div>
            </div>
        </div>
    `;

    ModalManager.open('modalRouteChoice');
    if (typeof playSound === 'function') playSound('tick');
}

function finishMarketCarBuyProcessRoute(routeType) {
    ModalManager.close('modalRouteChoice');
    if (!activePendingDKPDeal) return;

    const deal = activePendingDKPDeal;
    const car = deal.car;

    if (routeType === 'highway') {
        let dpsRoll = Math.random();
        if (dpsRoll < 0.28 && !deal.isRegisteredOnPlayer) {
            let fine = 800;
            state.player.cash = Math.max(0, (state.player.cash || 0) - fine);
            showToast(`🚔 Экипаж ДПС остановил на шоссе! Штраф за езду без полиса ОСАГО (-${fine} ₽).`);
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('error');
        } else {
            if (typeof addXp === 'function') addXp(15);
            showToast("Доехали по проспекту с ветерком (+15 XP)!");
        }
    } else {
        if (Math.random() < 0.25) {
            car.tireWear = Math.max(10, (car.tireWear || 80) - 10);
            if (car.wear) car.wear.engine = Math.max(10, (car.wear.engine || 80) - 5);
            showToast("⚠️ Попали в яму во дворах! Небольшой износ шин и подвески.");
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('warning');
        } else {
            showToast("Успешно объехали все посты ДПС по дворам!");
        }
    }

    finishMarketCarBuyProcess(deal);
}

async function finishMarketCarBuyProcess(deal) {
    const car = deal.car;
    const price = deal.price;
    const carIndex = deal.carIndex;

    state.player.cash -= price;
    
    if (!state.player.stats) state.player.stats = {};
    state.player.stats.bought = (state.player.stats.bought || 0) + 1;
    
    if (!state.garage) state.garage = [];
    
    const newCar = Object.assign({}, car);
    newCar.customPlate = car.plate;
    newCar.impounded = false;
    newCar.unregistered = false;
    newCar.insurance = null;
    newCar.purchaseCost = price;
    newCar.wear = car.wear ? car.wear : { engine: 85, transmission: 85 };
    newCar.preSaleVisited = false;
    newCar.isPersonal = false;
    newCar.isRegisteredOnPlayer = !!deal.isRegisteredOnPlayer;
    newCar.ownershipDays = 0;
    newCar.engineTemp = 90;
    newCar.tireWear = car.tireWear !== undefined ? car.tireWear : 100;
    newCar.tuning = car.tuning || { 
        chip: 0, exhaust: false, stance: false, bodykit: false, 
        rollCage: false, dragSlicks: false, hydroHandbrake: false, 
        weldedDiff: false, steeringAngle: false, bucketSeats: false, 
        customWheels: false, risk1251: 0 
    };

    // ⭐ Сохраняем галерею картинок из лота в гараж,
    //    чтобы в гараже можно было листать все 11 фото модели
    newCar.images = Array.isArray(car.images) && car.images.length > 0
        ? [...car.images]
        : (car.img ? [car.img] : []);

    // Гарантируем что main img — одна из галереи
    if (!newCar.img && newCar.images.length > 0) {
        newCar.img = newCar.images[0];
    }

    if (window.FB_Bridge && window.FB_Bridge.Plates && newCar.plate && !newCar.plate.includes("ТРАНЗИТ")) {
        try {
            await window.FB_Bridge.Plates.claimPlateAtomic(newCar.plate, null, newCar.id);
        } catch (e) {
            console.warn("[Market] Ошибка бронирования номера в реестре:", e);
        }
    }

    if (typeof recalculateCarMarketValue === 'function') {
        recalculateCarMarketValue(newCar);
    }

    state.garage.push(newCar);
    
    if (state.marketFeed && state.marketFeed.length > carIndex) {
        state.marketFeed.splice(carIndex, 1);
    }
    
    pendingMarketCar = null;
    activePendingDKPDeal = null;
    if (typeof addXp === 'function') addXp(40);

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('buy_car', 1);
    }
    
    let carName = car.name ? car.name : "Авто";
    showToast("✅ " + carName + " куплен за " + price.toLocaleString() + " ₽!");
    if (typeof spawnFloatingReward === 'function') spawnFloatingReward("-" + price.toLocaleString() + " ₽");
    
    if (window.FB_Bridge?.M && price >= 100000) {
        window.FB_Bridge.M.publishPost({
            type: "deal",
            title: "Удачный выкуп у капота!",
            text: `Только что сторговал и забрал «${carName}» в гараж за ${price.toLocaleString()} ₽!`,
            carName: carName,
            profit: Math.round((newCar.marketValue || price) - price)
        });
    }

    if (typeof saveState === 'function') saveState();
    renderMarketFeed();
    if (typeof renderGarage === 'function') renderGarage();
    setTimeout(() => { if (typeof switchTab === 'function') switchTab("tabGarage"); }, 400);
}

Object.assign(window, {
    t,
    toggleMarketCategories,
    toggleMarketSortOrder,
    sortCurrentMarketFeed,
    setCategory,
    refreshMarketFeedManual,
    promptHiddenPlateAutotekaHint,
    renderMarketFeed,
    updateMarketTimers,
    confirmMarketPurchaseSuccess,
    openRegistrationChoiceModal,
    confirmRegistrationChoice,
    openDriveRouteChoiceModal,
    finishMarketCarBuyProcessRoute,
    finishMarketCarBuyProcess
});
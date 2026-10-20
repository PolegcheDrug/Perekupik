// ========================================================
// js/market/market.js — ГЛАВНЫЙ КОНТРОЛЛЕР АВТОРЫНКА (v2.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v2.1.0:
//   - УДАЛЕНА лишняя кнопка переключения «Автомобили» (чистая лента рынка)
//   - Умная фильтрация: бейджи соответствия бизнесу отображаются ПОСЛЕ Автотеки
//     и ТОЛЬКО если у игрока РЕАЛЬНО КУПЛЕН данный бизнес (не засоряет карточку)
//   - Исправлена работа кнопки «Позвонить» / «Торг» с защитой от всплытия клика
//   - Полная интеграция с FLEET_CALCULATOR и проверкой автопарков
// ========================================================

let marketSortOrder = 'asc';
let activePendingDKPDeal = null;

// Токены защиты от гонок
if (typeof window.__marketRefreshToken !== 'number') window.__marketRefreshToken = 0;
if (typeof window.__marketRenderToken !== 'number') window.__marketRenderToken = 0;

// Защита от двойного клика по категориям
if (typeof window._setCategoryPending !== 'boolean') window._setCategoryPending = false;

function toggleMarketCategories(forceCollapse = null) {
    const grid = document.getElementById('marketCatListContainer');
    const btnIcon = document.querySelector('#btnToggleMarketGrid i') || document.querySelector('.categories-toggle-btn i');
    if (!grid) return;
    
    const shouldCollapse = forceCollapse !== null ? forceCollapse : !grid.classList.contains('collapsed');

    if (shouldCollapse) {
        grid.classList.add('collapsed');
        if (btnIcon) btnIcon.className = "fa-solid fa-chevron-down";
        localStorage.setItem('market_cat_collapsed', 'true');
    } else {
        grid.classList.remove('collapsed');
        if (btnIcon) btnIcon.className = "fa-solid fa-chevron-up";
        localStorage.setItem('market_cat_collapsed', 'false');
    }

    if (typeof playSound === 'function') playSound('tick');
}

function toggleMarketSortOrder() {
    marketSortOrder = marketSortOrder === 'asc' ? 'desc' : 'asc';
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');
    if (typeof showToast === 'function') showToast(marketSortOrder === 'asc' ? "Сортировка: сначала дешевле ⬆️" : "Сортировка: сначала дороже ⬇️");
    try {
        sortCurrentMarketFeed();
        renderMarketFeed();
    } catch (e) {
        console.error('[Market] Ошибка сортировки:', e);
    }
}

function openMarketMapMode() {
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');

    if (typeof MarketMap !== 'undefined' && typeof MarketMap.show === 'function') {
        MarketMap.show(state.marketFeed || []);
    } else {
        if (typeof showToast === 'function') showToast("Карта авторынка инициализируется...");
    }
}

function sortCurrentMarketFeed() {
    if (!state.marketFeed || state.marketFeed.length === 0) return;
    state.marketFeed.sort((a, b) => {
        let pA = a?.price || 0;
        let pB = b?.price || 0;
        return marketSortOrder === 'asc' ? pA - pB : pB - pA;
    });
    state.marketFeedVersion = (state.marketFeedVersion || 0) + 1;
}

// ========================================================
// ОПРЕДЕЛЕНИЕ ПРИГОДНОСТИ АВТО ДЛЯ БИЗНЕСА
// ========================================================
function getCarBusinessSuitability(car, ownedBizIds = []) {
    let matches = [];

    if (window.FLEET_CALCULATOR && typeof window.FLEET_CALCULATOR.checkSuitability === 'function') {
        try {
            const res = window.FLEET_CALCULATOR.checkSuitability(car, ownedBizIds);
            if (res && res.suitable && Array.isArray(res.matches) && res.matches.length > 0) {
                matches = res.matches.map(m => ({
                    id: m.bizId || m.id,
                    name: m.name,
                    icon: m.icon,
                    badgeColor: m.badgeColor
                }));
            }
        } catch (e) {
            console.warn('[Market] Ошибка FLEET_CALCULATOR:', e);
        }
    }

    if (matches.length === 0) {
        const cat = String(car.category || car.type || '').toLowerCase();
        const pwr = Number(car.power) || 0;
        const trunk = Number(car.trunkVolume) || 0;
        const name = String(car.name || '').toLowerCase();
        const year = Number(car.year) || 2012;

        if (cat === 'economy' || cat === 'comfort' || name.includes('solaris') || name.includes('rio') || name.includes('logan') || name.includes('camry') || name.includes('octavia') || name.includes('vesta') || name.includes('granta')) {
            matches.push({ id: 'taxi', name: 'Такси', icon: 'fa-taxi', badgeColor: '#f59e0b' });
        }

        if (cat === 'economy' || name.includes('matiz') || name.includes('granta') || name.includes('polo') || name.includes('priora') || name.includes('fabia') || name.includes('getz') || name.includes('largus')) {
            matches.push({ id: 'delivery', name: 'Доставка', icon: 'fa-box', badgeColor: '#10b981' });
        }

        if (cat === 'truck' || trunk >= 450 || name.includes('газель') || name.includes('фургон') || name.includes('porter') || name.includes('transit') || name.includes('largus') || name.includes('caddy')) {
            matches.push({ id: 'transport_company', name: 'Грузоперевозки', icon: 'fa-truck-fast', badgeColor: '#3b82f6' });
        }

        if (name.includes('эвакуатор') || name.includes('газон') || name.includes('платформ')) {
            matches.push({ id: 'tow_truck', name: 'Эвакуатор', icon: 'fa-truck-pickup', badgeColor: '#e74c3c' });
        }

        if (car.condition && Number(car.condition) <= 55) {
            matches.push({ id: 'razborka', name: 'Разборка', icon: 'fa-wrench', badgeColor: '#9b59b6' });
        }
    }

    return matches;
}

// ========================================================
// ДИСПЕТЧЕР ДЕЙСТВИЙ (ЗВОНОК / ОСМОТР)
// ========================================================
function dispatchMarketAction(carId, actionType = 'call') {
    let car = null;
    if (state && Array.isArray(state.marketFeed)) {
        car = state.marketFeed.find(c => c && (c.id == carId || String(c.id) === String(carId)));
    }
    const targetId = (car && car.id !== undefined) ? car.id : carId;

    const now = Date.now();
    if (car && car.cooldownUntil && car.cooldownUntil > now) {
        if (typeof showToast === 'function') {
            const left = Math.ceil((car.cooldownUntil - now) / 1000);
            showToast(`⏳ Абонент занят (${left}с). Дождитесь или используйте платный дозвон.`);
        }
        if (typeof playSound === 'function') playSound('error');
        return;
    }

    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');

    if (typeof window.initiateBuyMarketCar === 'function') {
        try {
            return window.initiateBuyMarketCar(targetId);
        } catch (e) {
            console.warn('[Market] Ошибка initiateBuyMarketCar:', e);
        }
    }

    if (typeof window.startMarketDeal === 'function') return window.startMarketDeal(targetId);
    if (typeof window.callMarketCar === 'function') return window.callMarketCar(targetId);

    if (window.MarketDeal && typeof window.MarketDeal.initiateBuyMarketCar === 'function') {
        return window.MarketDeal.initiateBuyMarketCar(targetId);
    }

    if (actionType === 'inspect' && typeof window.openInspectionModal === 'function') {
        return window.openInspectionModal(targetId);
    }

    console.error('[Market] Не найден обработчик вызова для carId:', carId);
    if (typeof showToast === 'function') showToast("❌ Ошибка соединения с продавцом");
}

function onMarketCallClick(carId, event) {
    if (event) {
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }
    dispatchMarketAction(carId, 'call');
}

function onMarketCardClick(carId, event) {
    if (event && event.target) {
        if (event.target.closest('button') || event.target.closest('.plate-hidden-capsule') || event.target.closest('.cooldown-timer')) {
            return;
        }
    }
    dispatchMarketAction(carId, 'inspect');
}

function onAutotekaClick(carId, event) {
    if (event) {
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }
    let car = state?.marketFeed?.find(c => c && (c.id == carId || String(c.id) === String(carId)));
    const targetId = (car && car.id !== undefined) ? car.id : carId;
    if (typeof window.openAutotekaModal === 'function') {
        window.openAutotekaModal(targetId);
    } else if (typeof showToast === 'function') {
        showToast("Автотека временно недоступна");
    }
}

function onPaidCallClick(carId, event) {
    if (event) {
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }
    let car = state?.marketFeed?.find(c => c && (c.id == carId || String(c.id) === String(carId)));
    const targetId = (car && car.id !== undefined) ? car.id : carId;
    if (typeof window.paidCallMarketCar === 'function') {
        window.paidCallMarketCar(targetId);
    } else {
        dispatchMarketAction(targetId, 'call');
    }
}

async function setCategory(cat) {
    if (window._setCategoryPending) return;
    window._setCategoryPending = true;

    try {
        if (!cat || typeof cat !== 'string') {
            window._setCategoryPending = false;
            return;
        }

        let lvl = state.player?.level ? state.player.level : 1;
        const levelGates = { moto: 5, atv: 8, comfort: 15, premium: 30, hyper: 50, truck: 50, yacht: 100 };
        if (levelGates[cat] && lvl < levelGates[cat]) {
            if (typeof showToast === 'function') showToast(`🔒 Категория доступна с ${levelGates[cat]} уровня!`);
            window._setCategoryPending = false;
            return;
        }

        state.activeCategory = cat;

        document.querySelectorAll('.cat-tile').forEach(c => c.classList.remove('active'));
        const btn = document.getElementById("catBtn-" + cat);
        if (btn) btn.classList.add('active');

        toggleMarketCategories(true);

        const meta = (typeof CATEGORY_META !== 'undefined' && CATEGORY_META[cat]) ? CATEGORY_META[cat] : { name: 'Рынок', title: 'Общий рынок', capital: '—', desc: '' };
        if (typeof setTxt === 'function') {
            setTxt("currentCatBadge", meta.name);
            setTxt("catInfoTitle", "<i class='fa-solid fa-chart-line'></i> " + meta.title + ":");
            setTxt("catInfoPrice", "Капитал: " + meta.capital);
            setTxt("catInfoDesc", meta.desc);
        }

        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');

        const container = document.getElementById('marketCardContainer');
        if (container) {
            container.innerHTML = `
                <div class="glass-card text-center py-6" style="background:#090e18;">
                    <div class="radar-spinner-ring mb-2" style="margin: 0 auto;"></div>
                    <div class="sub-label font-bold text-xs color-cyan">Генерация лотов для категории «${meta.name}»...</div>
                </div>
            `;
        }

        const myToken = ++window.__marketRefreshToken;
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), 5000));

        let populateResult;
        if (typeof populateMarketFeed === 'function') {
            populateResult = await Promise.race([populateMarketFeed(), timeoutPromise]);
        } else {
            populateResult = 'MISSING';
        }

        if (window.__marketRefreshToken !== myToken) {
            window._setCategoryPending = false;
            return;
        }

        if (populateResult === 'TIMEOUT') {
            if (typeof showToast === 'function') showToast("⏱ Превышено время генерации. Повторите попытку.");
            window._setCategoryPending = false;
            return;
        }

        renderMarketFeed();
    } catch (e) {
        console.error('[Market] Ошибка в setCategory:', e);
    } finally {
        window._setCategoryPending = false;
    }
}

async function refreshMarketFeedManual() {
    if (window._setCategoryPending) return;
    window._setCategoryPending = true;

    try {
        const cost = (typeof getMarketRefreshCost === 'function') ? getMarketRefreshCost() : 250;
        let pCash = (state.player && state.player.cash) ? state.player.cash : 0;
        let pFuel = (state.player && state.player.fuel !== undefined) ? state.player.fuel : 0;

        if (pCash < cost) {
            if (typeof showToast === 'function') showToast("Не хватает " + cost.toLocaleString() + " ₽!");
            window._setCategoryPending = false;
            return;
        }
        if (pFuel < 5) {
            if (typeof showToast === 'function') showToast("Закончился бензин ⛽! Заправьтесь на АЗС.");
            window._setCategoryPending = false;
            return;
        }

        state.player.cash -= cost;
        state.player.fuel -= 5;

        toggleMarketCategories(true);
        if (typeof saveState === 'function') saveState();

        const container = document.getElementById('marketCardContainer');
        if (container) {
            container.innerHTML = `
                <div class="glass-card text-center py-6" style="background:#090e18;">
                    <div class="radar-spinner-ring mb-2" style="margin: 0 auto;"></div>
                    <div class="sub-label font-bold text-xs color-cyan">Обновление ленты рынка...</div>
                </div>
            `;
        }

        const myToken = ++window.__marketRefreshToken;
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), 5000));

        let populateResult;
        if (typeof populateMarketFeed === 'function') {
            populateResult = await Promise.race([populateMarketFeed(), timeoutPromise]);
        } else {
            populateResult = 'MISSING';
        }

        if (window.__marketRefreshToken !== myToken) {
            window._setCategoryPending = false;
            return;
        }

        renderMarketFeed();
        if (typeof showToast === 'function') showToast("Лента обновлена (-5 ⛽)!");
    } catch (e) {
        console.error('[Market] Ошибка refresh:', e);
    } finally {
        window._setCategoryPending = false;
    }
}

function promptHiddenPlateAutotekaHint(event) {
    if (event) event.stopPropagation();
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');
    if (typeof showToast === 'function') showToast("🔒 Продавец скрыл госномер в объявлении. Закажите Автотеку, чтобы узнать знак!");
}

// ========================================================
// РЕНДЕР ЛЕНТЫ АВТОРЫНКА
// ========================================================
function renderMarketFeed() {
    const container = document.getElementById('marketCardContainer');
    if (!container) return;

    const myRenderToken = ++window.__marketRenderToken;

    try {
        const refreshText = document.getElementById('refreshCostText');
        if (refreshText) {
            const cost = (typeof getMarketRefreshCost === 'function') ? getMarketRefreshCost() : 250;
            refreshText.innerText = cost.toLocaleString();
        }

        const mainContent = document.querySelector('.main-content');
        const scrollPos = mainContent ? mainContent.scrollTop : 0;
        const now = Date.now();

        if (!state.marketFeed || state.marketFeed.length === 0) {
            container.innerHTML = `
                <div class='glass-card text-center py-6 sub-label' style="background:#090e18;">
                    <div style="font-size:28px; margin-bottom:6px;">🚗</div>
                    <b class="text-xs color-cyan">Нет активных лотов в категории</b>
                    <div class="mt-1" style="font-size:10px;">Нажмите «Обновить ленту» или смените категорию</div>
                </div>
            `;
            return;
        }

        let seasonBannerHtml = "";
        if (state.globalEvent && state.globalEvent.isActive) {
            seasonBannerHtml = `
                <div class="glass-card mb-2 p-2 text-center" style="background: linear-gradient(90deg, rgba(192,132,252,0.2), rgba(0,242,254,0.2)); border-color: var(--purple);">
                    <b class="text-xs color-purple"><i class="fa-solid fa-star mr-1"></i> ${state.globalEvent.name}</b>
                    <div class="sub-label" style="font-size:9px;">Множитель цен: x${state.globalEvent.multiplier} | Осталось: ${state.globalEvent.daysLeft} дн.</div>
                </div>
            `;
        }

        let sortBarHtml = `
            ${seasonBannerHtml}
            <div class="glass-card mb-2 p-2 flex-between" style="border-color: rgba(255, 255, 255, 0.08);">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="text-xs sub-label">Сортировка:</span>
                    <button onclick="toggleMarketSortOrder()" class="btn btn-dark btn-sm btn-auto" style="padding: 4px 10px; font-size: 10px;">
                        <i class="fa-solid fa-arrow-down-wide-short color-cyan mr-1"></i>
                        ${marketSortOrder === 'asc' ? 'Сначала дешевле (▲)' : 'Сначала дороже (▼)'}
                    </button>
                </div>
                <button onclick="openMarketMapMode()" class="btn btn-cyan btn-sm btn-auto" style="padding: 5px 12px; font-size: 11px; font-weight:700;">
                    <i class="fa-solid fa-map-location-dot mr-1"></i> На карте
                </button>
            </div>
        `;

        let htmlContent = sortBarHtml;

        // Определяем РЕАЛЬНО КУПЛЕННЫЕ игроком бизнесы (level > 0)
        let ownedBizIds = [];
        if (Array.isArray(state.businesses)) {
            ownedBizIds = state.businesses
                .filter(b => b && Number(b.level) > 0)
                .map(b => b.id);
        } else if (state.businesses && typeof state.businesses === 'object') {
            ownedBizIds = Object.keys(state.businesses).filter(key => {
                const b = state.businesses[key];
                return b && Number(b.level) > 0;
            });
        }

        state.marketFeed.forEach(car => {
            if (!car || car.unavailable) return;

            try {
                let isBusy = (car.cooldownUntil && car.cooldownUntil > now);
                let timeLeft = isBusy ? Math.ceil((car.cooldownUntil - now) / 1000) : 0;

                let carMileage = (typeof car.mileage === 'number') ? car.mileage.toLocaleString() : "85 000";
                let carPrice = (typeof car.price === 'number') ? car.price.toLocaleString() : "100 000";
                let carMarketVal = (typeof car.marketValue === 'number') ? car.marketValue.toLocaleString() : carPrice;
                let carType = car.type ? car.type.toUpperCase() : "CAR";

                let fallbackUrl = car.fallback || (typeof getCategoryFallback === 'function' ? getCategoryFallback(car.type) : '');
                let rawImg = car.img ? car.img : fallbackUrl;
                let carImgAttrs = (typeof buildCarImageAttrs === 'function')
                    ? buildCarImageAttrs(rawImg, car)
                    : `src="${rawImg}" onerror="this.onerror=null; this.src='${fallbackUrl}'"`;

                let viewedBadge = car.viewed ? `<div class='viewed-badge'><i class='fa-solid fa-eye'></i> Просмотрено</div>` : "";
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
                    shieldIconClass = condVal >= 80 ? 'spec-tile-icon-shield' : (condVal >= 50 ? 'spec-tile-icon-shield-mid' : 'spec-tile-icon-shield-low');
                    let condColorClass = condVal >= 80 ? 'color-green' : (condVal >= 50 ? 'color-amber' : 'color-red');
                    condValueHtml = `<b class="${condColorClass}">${condVal}%</b>`;
                }

                let isPlateRevealed = !!car.autotekaChecked || car.isP2PUserListing;
                let plateInRowHtml = "";

                if (isPlateRevealed) {
                    plateInRowHtml = `<div class="plate-mini-capsule notranslate" translate="no">${car.plate} <span class="plate-flag-mini">RUS</span></div>`;
                } else {
                    let regionNum = (car.plate && car.plate.split(' ')[1]) ? car.plate.split(' ')[1] : "77";
                    plateInRowHtml = `<div class="plate-hidden-capsule notranslate" onclick="promptHiddenPlateAutotekaHint(event)" translate="no"><i class="fa-solid fa-lock" style="font-size:8px; margin-right:4px;"></i> • ••• •• ${regionNum}</div>`;
                }

                let statusBadgesHtml = `<span class='tag-badge bg-tag-cyan'>${carType}</span>`;

                if (car.isP2PUserListing) statusBadgesHtml += "<span class='tag-badge bg-tag-green font-bold'>ИГРОК P2P</span>";
                else if (car.isMuseumStock) statusBadgesHtml += "<span class='tag-badge bg-tag-amber'>🏆 КАПСУЛА</span>";
                else if (car.isTunedSpec) statusBadgesHtml += "<span class='tag-badge bg-tag-purple'>🔥 КОРЧ</span>";
                else if (car.isBeaterProject) statusBadgesHtml += "<span class='tag-badge bg-tag-red'>💥 ПОД ПРОЕКТ</span>";
                else if (car.dealType === 'urgent') statusBadgesHtml += "<span class='tag-badge bg-tag-green'>⚡ СРОЧНО</span>";

                let pVal = (typeof evaluatePlate === 'function') ? evaluatePlate(car.plate) : 0;
                if (isPlateRevealed && pVal > 15000) statusBadgesHtml += "<span class='tag-badge badge-shimmer-gold'>🏷️ БЛАТНОЙ</span>";
                if (car.isStolen && isPlateRevealed) statusBadgesHtml += "<span class='tag-badge badge-police-strobe'>🚨 РОЗЫСК</span>";

                // ⭐ ОТОБРАЖЕНИЕ БЕЙДЖЕЙ БИЗНЕСА ТОЛЬКО ПОСЛЕ АВТОТЕКИ И ТОЛЬКО ДЛЯ КУПЛЕННЫХ БИЗНЕСОВ
                let bizTopBadgeHtml = "";
                if (isPlateRevealed && ownedBizIds.length > 0) {
                    const allMatches = getCarBusinessSuitability(car, ownedBizIds);
                    // Фильтруем: оставляем ТОЛЬКО те бизнесы, которые есть у игрока
                    const ownedMatches = allMatches.filter(m => ownedBizIds.includes(m.id));

                    if (ownedMatches.length > 0) {
                        car.businessMatches = ownedMatches;

                        bizTopBadgeHtml = `
                            <div class="biz-fleet-card-badge notranslate" translate="no" style="position:absolute; top:8px; left:8px; z-index:10; background:rgba(9,14,24,0.92); border:1px solid var(--green); color:var(--green); border-radius:6px; padding:3px 7px; font-size:8.5px; font-weight:800; display:flex; align-items:center; gap:4px; box-shadow:0 0 10px rgba(0,230,118,0.35);">
                                <i class="fa-solid fa-briefcase"></i> ДЛЯ ВАШЕГО БИЗНЕСА
                            </div>
                        `;

                        ownedMatches.forEach(m => {
                            const badgeColor = m.badgeColor || '#00e676';
                            statusBadgesHtml += `
                                <span class='tag-badge notranslate' translate='no' title='Подходит для: ${m.name}' style='background:rgba(9,14,24,0.85); color:${badgeColor}; border:1px solid ${badgeColor}; box-shadow:0 0 6px ${badgeColor}; font-weight:700; font-size:8px;'>
                                    <i class='fa-solid ${m.icon || 'fa-briefcase'}' style='margin-right:3px;'></i>${m.name} ✓
                                </span>
                            `;
                        });
                    }
                }

                let sellerNameRowHtml = "";
                if (car.isP2PUserListing) {
                    let fxClass = car.sellerNickEffectClass || "nick-fx-lightning";
                    sellerNameRowHtml = `<div class="sub-label mb-1" style="font-size:9px;">Продавец: <b class="font-bold ${fxClass}" style="font-size:11px;">${car.sellerPlayerName}</b></div>`;
                }

                let locationRowHtml = "";
                if (car.address) {
                    locationRowHtml = `<div class="sub-label mb-1" style="font-size:9.5px; color:#7d96b2; display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-location-dot color-cyan"></i><span>${car.address}</span></div>`;
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

                const actionBtnLabel = car.isP2PUserListing ? 'Торг' : 'Позвонить';
                const actionBtnIcon = car.isP2PUserListing ? 'fa-solid fa-comments-dollar' : 'fa-solid fa-phone';

                htmlContent += `
                <div class='glass-card mb-3 ${busyClass} ${viewedClass} ${cardAuraClass}' 
                     id='card_${car.id}'
                     style="cursor: pointer;"
                     onclick="onMarketCardClick('${car.id}', event)">
                    ${viewedBadge}

                    <div class='cooldown-timer notranslate' translate='no' style='${isBusy ? "display:flex !important;" : "display:none !important;"}'>
                        <div class='timer-clock notranslate' translate='no' id='timer_num_${car.id}'>${timeLeft}с</div>
                        <div class='timer-text'>Абонент занят</div>
                        <button onclick="onPaidCallClick('${car.id}', event)" class='btn btn-amber' style='width: 80%;'>Платный дозвон (1,000 ₽)</button>
                    </div>

                    <div class='car-img-wrap' style="height: 190px; position: relative;">
                        ${bizTopBadgeHtml}
                        <img id="market_car_img_${car.id}" ${carImgAttrs} class='car-img'>
                    </div>

                    <div class="car-header-row-volumetric">
                        <div style="flex:1; min-width:0; margin-right:8px;">
                            ${(typeof formatCarBrandBadgeHtml === 'function' ? formatCarBrandBadgeHtml(car.name) : car.name)}
                            ${sellerNameRowHtml}
                            ${locationRowHtml}
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

                    <div class="car-specs-grid-volumetric" style="margin-bottom: 6px !important;">
                        <div class="spec-tile-3d-col" style="min-height: 38px; padding: 4px 6px;">
                            <div class="spec-tile-icon-wrap spec-tile-icon-power" style="width: 18px; height: 18px; font-size: 9px;"><i class="fa-solid fa-bolt"></i></div>
                            <div class="spec-tile-col-data">
                                <span class="spec-tile-col-label" style="font-size: 7.5px;">Мощность</span>
                                <b class="color-amber" style="font-size: 10px;">${car.power || 100} л.с.</b>
                            </div>
                        </div>
                        <div class="spec-tile-3d-col" style="min-height: 38px; padding: 4px 6px;">
                            <div class="spec-tile-icon-wrap spec-tile-icon-road" style="width: 18px; height: 18px; font-size: 9px;"><i class="fa-solid fa-road"></i></div>
                            <div class="spec-tile-col-data">
                                <span class="spec-tile-col-label" style="font-size: 7.5px;">Пробег</span>
                                <b class="color-cyan" style="font-size: 10px;">${carMileage} км${odoWarningPill}</b>
                            </div>
                        </div>
                        <div class="spec-tile-3d-col" style="min-height: 38px; padding: 4px 6px;">
                            <div class="spec-tile-icon-wrap ${shieldIconClass}" style="width: 18px; height: 18px; font-size: 9px;"><i class="fa-solid ${isBodyKnown ? 'fa-shield' : 'fa-circle-question'}"></i></div>
                            <div class="spec-tile-col-data">
                                <span class="spec-tile-col-label" style="font-size: 7.5px;">Кузов</span>
                                ${condValueHtml.replace('font-size:12px', 'font-size:10px')}
                            </div>
                        </div>
                    </div>

                    ${sellerDialogHtml}

                    <div class="p-2 mb-2" style="background:#090e18; border-radius:10px; border:1px solid rgba(255,255,255,0.06);">
                        <div class="flex-between mb-2">
                            <div>
                                <span class="sub-label text-xs">Оценка вторичного рынка:</span>
                                <div class="font-bold color-cyan text-xs" style="font-size:12px;">~${carMarketVal} ₽</div>
                            </div>
                            <div class="text-right">
                                <span class="sub-label text-xs">Разница от оценки:</span>
                                <div class="font-bold ${estimatedProfit > 0 ? 'color-green' : 'color-red'} text-xs" style="font-size:12px;">${estimatedProfit > 0 ? '+' : ''}${estimatedProfit.toLocaleString()} ₽</div>
                            </div>
                        </div>

                        <div class="grid-2" style="gap: 6px;">
                            <button onclick="onAutotekaClick('${car.id}', event)" class='btn btn-dark btn-sm' style="height: 30px; font-size: 9.5px; padding: 0 6px;">
                                <i class='fa-solid fa-file-waveform color-green' style="font-size:10px;"></i> Автотека (${autoIcon})
                            </button>
                            <button onclick="onMarketCallClick('${car.id}', event)" class="btn btn-cyan btn-sm" style="height: 30px; font-size: 9.5px; padding: 0 6px; font-weight: 700;">
                                <i class="${actionBtnIcon}" style="font-size:10px;"></i> ${actionBtnLabel}
                            </button>
                        </div>
                    </div>
                </div>`;

            } catch (carError) {
                console.error('[Market] Ошибка рендера карточки:', carError, car.id);
            }
        });

        if (window.__marketRenderToken !== myRenderToken) {
            return;
        }

        container.innerHTML = htmlContent;
        if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });

    } catch (e) {
        console.error('[Market] Ошибка рендера:', e);
    }
}

function updateMarketTimers() {
    if (!state.marketFeed || !Array.isArray(state.marketFeed) || state.marketFeed.length === 0) return;

    try {
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

        if (needFullReRender) {
            state.marketFeedVersion = (state.marketFeedVersion || 0) + 1;
            renderMarketFeed();
        }
    } catch (e) {
        console.warn('[Market] Ошибка updateMarketTimers:', e);
    }
}

Object.assign(window, {
    toggleMarketCategories,
    toggleMarketSortOrder,
    openMarketMapMode,
    sortCurrentMarketFeed,
    setCategory,
    refreshMarketFeedManual,
    promptHiddenPlateAutotekaHint,
    renderMarketFeed,
    updateMarketTimers,
    onMarketCallClick,
    onMarketCardClick,
    onAutotekaClick,
    onPaidCallClick,
    getCarBusinessSuitability,
    dispatchMarketAction
});

console.log('[🏪 market v2.1.0] Очищен интерфейс от лишней кнопки, иконки бизнеса только под купленные точки ✓');

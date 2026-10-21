// ========================================================
// js/market/market.js — ГЛАВНЫЙ КОНТРОЛЛЕР АВТОРЫНКА (v3.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v3.0.0 (ИНТЕГРАЦИЯ ЗАКАЗОВ КЛИЕНТОВ И БИРЖИ):
//   1. Биржа перенесена из Приложения М прямо на Авторынок в виде вкладки «Заказы на подбор».
//   2. Клиенты оставляют запросы на выкуп авто с фиксированным бюджетом и бонусом перекупу.
//   3. Быстрая сдача подходящего авто прямо из гаража в 1 клик с зачислением выплаты.
//   4. Сохранено ультракомпактное сворачивание категорий, Автотека, ДКП и проверка под бизнес.
// ========================================================

let marketSortOrder = 'asc';
let marketViewMode = 'cars'; // 'cars' | 'orders'
let activePendingDKPDeal = null;

// Токены защиты от гонок
if (typeof window.__marketRefreshToken !== 'number') window.__marketRefreshToken = 0;
if (typeof window.__marketRenderToken !== 'number') window.__marketRenderToken = 0;

// Защита от двойного клика по категориям
if (typeof window._setCategoryPending !== 'boolean') window._setCategoryPending = false;

// Базовые заказы клиентов на случай отсутствия в state
const DEFAULT_MARKET_ORDERS = [
    {
        id: 'ord_taxi_1',
        customer: 'Таксопарк «Лидер»',
        customerRole: 'Корпоративный клиент',
        avatar: '🚖',
        carRequirementText: 'Седан Comfort или Economy (Solaris, Rio, Logan, Vesta)',
        acceptedTypes: ['economy', 'comfort'],
        minCondition: 70,
        maxMileage: 180000,
        rewardBudget: 750000,
        bonusFee: 45000,
        desc: 'Срочно пополняем линию тарифа «Эконом/Комфорт». Нужен авто на ходу без сильных ударов по геометрии кузова.',
        daysLeft: 2
    },
    {
        id: 'ord_delivery_2',
        customer: 'Курьерская служба «Метеор»',
        customerRole: 'Малый бизнес',
        avatar: '📦',
        carRequirementText: 'Компактный хэтчбек или универсал (Matiz, Granta, Polo, Largus)',
        acceptedTypes: ['economy'],
        minCondition: 55,
        maxMileage: 250000,
        rewardBudget: 380000,
        bonusFee: 25000,
        desc: 'Ищем рабочую лошадку для развоза заказов по центру. Внешний вид не критичен, главное живой мотор и коробка.',
        daysLeft: 3
    },
    {
        id: 'ord_private_3',
        customer: 'Иван Сергеевич',
        customerRole: 'Частный покупатель',
        avatar: '👨‍💼',
        carRequirementText: 'Живой классический ВАЗ или японец под проект',
        acceptedTypes: ['economy', 'comfort'],
        minCondition: 80,
        maxMileage: 120000,
        rewardBudget: 320000,
        bonusFee: 35000,
        desc: 'Ищу первую машину для сына. Главное не гнилой кузов и родной пробег без криминала по базе.',
        daysLeft: 1
    }
];

// ========================================================
// УПРАВЛЕНИЕ СВОРАЧИВАНИЕМ КАТЕГОРИЙ (РУЧНОЕ И АВТОМАТИЧЕСКОЕ)
// ========================================================
function toggleMarketCategories(forceCollapse = null, isSilent = false) {
    const card = document.querySelector('.market-filter-card');
    const grid = document.getElementById('marketCatListContainer');
    const banner = document.getElementById('catInfoBanner');
    const btnIcon = document.querySelector('#btnToggleMarketGrid i') || document.querySelector('.categories-toggle-btn i');
    if (!grid) return;
    
    const isCurrentlyCollapsed = grid.classList.contains('collapsed') || grid.style.display === 'none';
    const shouldCollapse = forceCollapse !== null ? forceCollapse : !isCurrentlyCollapsed;

    if (shouldCollapse) {
        grid.classList.add('collapsed');
        grid.style.display = 'none';
        if (banner) banner.style.display = 'none';
        if (card) {
            card.classList.add('is-compact-header');
            card.style.marginBottom = '6px';
            card.style.padding = '8px 12px';
        }
        if (btnIcon) btnIcon.className = "fa-solid fa-chevron-down";
        localStorage.setItem('market_cat_collapsed', 'true');
    } else {
        grid.classList.remove('collapsed');
        grid.style.display = 'grid';
        if (banner) banner.style.display = 'block';
        if (card) {
            card.classList.remove('is-compact-header');
            card.style.marginBottom = '';
            card.style.padding = '';
        }
        if (btnIcon) btnIcon.className = "fa-solid fa-chevron-up";
        localStorage.setItem('market_cat_collapsed', 'false');
    }

    if (!isSilent && typeof playSound === 'function') {
        playSound('tick');
    }
}

function collapseMarketCategories(shouldCollapse) {
    toggleMarketCategories(shouldCollapse, true);
}

function switchMarketViewMode(mode) {
    marketViewMode = mode;
    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');
    renderMarketFeed();
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
        const trunk = Number(car.trunkVolume) || 0;
        const name = String(car.name || '').toLowerCase();

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

        // Компактно сворачиваем сетку после выбора
        toggleMarketCategories(true, true);

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

        toggleMarketCategories(true, true);
        if (typeof saveState === 'function') saveState();

        const container = document.getElementById('marketCardContainer');
        if (container) {
            container.innerHTML = `
                <div class="glass-card text-center py-6" style="background:#090e18;">
                    <div class="radar-spinner-ring mb-2" style="margin: 0 auto;"></div>
                    <div class="sub-label font-bold text-xs color-cyan">Обновление рынка...</div>
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
// РЕНДЕР ЛЕНТЫ АВТОРЫНКА И ЗАКАЗОВ
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

        // Проверяем актуальность списка заказов
        if (!state.marketOrders || !Array.isArray(state.marketOrders) || state.marketOrders.length === 0) {
            state.marketOrders = JSON.parse(JSON.stringify(DEFAULT_MARKET_ORDERS));
        }

        // Переключатель режимов: Автомобили / Заказы на подбор
        const ordersCount = (state.marketOrders || []).length;
        const carsCount = (state.marketFeed || []).filter(c => c && !c.unavailable).length;

        const modeSwitcherHtml = `
            <div class="mb-2" style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; background:rgba(15,23,42,0.85); padding:3px; border-radius:12px; border:1px solid rgba(0,242,254,0.18);">
                <button onclick="switchMarketViewMode('cars')" class="btn ${marketViewMode === 'cars' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-weight:800; font-size:10px; border-radius:9px; padding:6px 0;">
                    <i class="fa-solid fa-car mr-1"></i> Автомобили (${carsCount})
                </button>
                <button onclick="switchMarketViewMode('orders')" class="btn ${marketViewMode === 'orders' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-weight:800; font-size:10px; border-radius:9px; padding:6px 0;">
                    <i class="fa-solid fa-clipboard-check mr-1"></i> Заказы клиентов (${ordersCount})
                </button>
            </div>
        `;

        // Если открыт режим заказов
        if (marketViewMode === 'orders') {
            container.innerHTML = modeSwitcherHtml + renderMarketOrdersHtml();
            if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
            return;
        }

        // Режим обычной ленты авторынка
        if (!state.marketFeed || state.marketFeed.length === 0) {
            container.innerHTML = modeSwitcherHtml + `
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
            ${modeSwitcherHtml}
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

        // Определяем РЕАЛЬНО КУПЛЕННЫЕ игроком бизнесы
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

                let bizTopBadgeHtml = "";
                if (isPlateRevealed && ownedBizIds.length > 0) {
                    const allMatches = getCarBusinessSuitability(car, ownedBizIds);
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

// ========================================================
// РЕНДЕР И ЛОГИКА ЗАКАЗОВ КЛИЕНТОВ (БЫВШАЯ БИРЖА)
// ========================================================
function renderMarketOrdersHtml() {
    const orders = state.marketOrders || [];
    const myGarage = state.garage || state.player?.garage || [];

    if (orders.length === 0) {
        return `
            <div class="glass-card text-center py-6 sub-label" style="background:#090e18;">
                <div style="font-size:32px; margin-bottom:8px;">📋</div>
                <b class="text-xs color-green">Все заказы закрыты</b>
                <div class="mt-1" style="font-size:10px;">Новые покупатели обратятся в ближайшее время</div>
            </div>
        `;
    }

    let html = `
        <div class="glass-card mb-2 p-2" style="background:linear-gradient(135deg, rgba(0,230,118,0.1), #090e18); border-color:rgba(0,230,118,0.3);">
            <div class="flex-between">
                <div>
                    <b class="text-xs color-green" style="font-size:12px;"><i class="fa-solid fa-briefcase mr-1"></i> Срочный выкуп и Подбор</b>
                    <div class="sub-label" style="font-size:8.5px;">Сдавайте авто из гаража под требования клиентов и получайте премию</div>
                </div>
                <span class="tag-badge bg-tag-green">${orders.length} ЗАКАЗОВ</span>
            </div>
        </div>
    `;

    orders.forEach((ord, ordIdx) => {
        // Проверяем, есть ли в гараже подходящая машина
        const matchingCars = myGarage.filter(c => {
            if (!c) return false;
            const cType = String(c.type || c.category || 'economy').toLowerCase();
            const typeMatch = ord.acceptedTypes.includes(cType);
            const condMatch = (c.condition || 80) >= ord.minCondition;
            const mileMatch = (c.mileage || 100000) <= ord.maxMileage;
            return typeMatch && condMatch && mileMatch;
        });

        const hasMatch = matchingCars.length > 0;
        const totalPayout = ord.rewardBudget + ord.bonusFee;

        html += `
            <div class="glass-card mb-3 p-3" style="background:#090e18; border:1px solid ${hasMatch ? 'rgba(0,230,118,0.4)' : 'rgba(255,255,255,0.06)'}; border-radius:14px;">
                <div class="flex-between mb-2">
                    <div class="flex-gap" style="align-items:center;">
                        <span style="font-size:22px;">${ord.avatar || '👤'}</span>
                        <div>
                            <b class="text-xs color-main" style="font-size:12px;">${ord.customer}</b>
                            <div class="sub-label" style="font-size:8.5px; color:#94a3b8;">${ord.customerRole} • Осталось: ${ord.daysLeft} дн.</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="sub-label" style="font-size:7.5px;">ВЫПЛАТА:</span>
                        <div class="price-val text-xs color-green" style="font-size:13px;">${totalPayout.toLocaleString()} ₽</div>
                    </div>
                </div>

                <div class="p-2 mb-2" style="background:#04070e; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                    <div class="sub-label mb-1" style="font-size:8.5px; color:#cbd5e1;"><b>Требование:</b> ${ord.carRequirementText}</div>
                    <div class="flex-between text-xs" style="font-size:8.5px;">
                        <span>Кузов: <b class="color-amber">&ge; ${ord.minCondition}%</b></span>
                        <span>Пробег: <b class="color-cyan">&le; ${ord.maxMileage.toLocaleString()} км</b></span>
                        <span>Премия: <b class="color-green">+${ord.bonusFee.toLocaleString()} ₽</b></span>
                    </div>
                </div>

                <div class="sub-label mb-2" style="font-size:9.5px; line-height:1.35; color:#94a3b8;">
                    ${ord.desc}
                </div>

                <div class="grid-2" style="gap:6px;">
                    ${hasMatch ? `
                        <button onclick="fulfillMarketOrderAction('${ord.id}')" class="btn btn-green btn-sm" style="font-size:10px; font-weight:800; padding:8px 0;">
                            <i class="fa-solid fa-handshake mr-1"></i> СДАТЬ ИЗ ГАРАЖА (${matchingCars.length})
                        </button>
                    ` : `
                        <button onclick="switchMarketViewMode('cars')" class="btn btn-cyan btn-sm" style="font-size:9.5px; padding:8px 0;">
                            <i class="fa-solid fa-magnifying-glass mr-1"></i> НАЙТИ НА РЫНКЕ
                        </button>
                    `}
                    <button onclick="showOrderDetailsToast('${ord.id}')" class="btn btn-dark btn-sm" style="font-size:9.5px; padding:8px 0;">
                        ИНФОРМАЦИЯ
                    </button>
                </div>
            </div>
        `;
    });

    return html;
}

function fulfillMarketOrderAction(orderId) {
    const orders = state.marketOrders || [];
    const ordIndex = orders.findIndex(o => o.id === orderId);
    if (ordIndex === -1) return;
    const ord = orders[ordIndex];

    const myGarage = state.garage || state.player?.garage || [];
    const carIndex = myGarage.findIndex(c => {
        if (!c) return false;
        const cType = String(c.type || c.category || 'economy').toLowerCase();
        return ord.acceptedTypes.includes(cType) && (c.condition || 80) >= ord.minCondition && (c.mileage || 100000) <= ord.maxMileage;
    });

    if (carIndex === -1) {
        if (typeof showToast === 'function') showToast("⚠️ В гараже нет подходящего автомобиля под этот заказ!");
        return;
    }

    const soldCar = myGarage[carIndex];
    const payout = ord.rewardBudget + ord.bonusFee;

    // Списание авто и начисление денег
    myGarage.splice(carIndex, 1);
    if (state.garage) state.garage = myGarage;
    if (state.player?.garage) state.player.garage = myGarage;

    state.player.cash = (state.player.cash || 0) + payout;
    state.player.completedDeals = (state.player.completedDeals || 0) + 1;
    state.player.karma = Math.min(100, (state.player.karma || 50) + 4);

    // Удаляем выполненный заказ
    orders.splice(ordIndex, 1);

    if (typeof saveState === 'function') saveState();
    if (typeof updateHeaderUI === 'function') updateHeaderUI();
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');

    if (typeof showToast === 'function') {
        showToast(`🤝 Заказ успешно закрыт! Автомобиль «${soldCar.name}» сдан клиенту (+${payout.toLocaleString()} ₽)!`);
    }

    renderMarketFeed();
}

function showOrderDetailsToast(orderId) {
    const ord = (state.marketOrders || []).find(o => o.id === orderId);
    if (!ord) return;
    if (typeof showToast === 'function') {
        showToast(`📋 ${ord.customer}: ${ord.desc}`);
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
    collapseMarketCategories,
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
    dispatchMarketAction,
    switchMarketViewMode,
    fulfillMarketOrderAction,
    showOrderDetailsToast
});

console.log('[🏪 market v3.0.0] Авторынок обновлен: Заказы на подбор интегрированы, быстрая сдача авто ✓');

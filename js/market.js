// ========================================================
// js/market.js — ГЛАВНЫЙ КОНТРОЛЛЕР АВТОРЫНКА (v1.3.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.3.0 (ФИКС КЛИКОВ ПО КАТЕГОРИЯМ):
//   - setCategory обёрнут в try/catch с логированием
//   - Защита от двойного клика через _setCategoryPending
//   - Таймаут на populateMarketFeed (5 сек)
//   - renderMarketFeed устойчив к пустому marketFeed
//   - updateMarketTimers безопасен
//   - Диагностика: [Market] setCategory → ...
// ========================================================

let marketSortOrder = 'asc';
let activePendingDKPDeal = null;

// ⭐ v1.2.0: токены защиты от гонок
if (typeof window.__marketRefreshToken !== 'number') window.__marketRefreshToken = 0;
if (typeof window.__marketRenderToken !== 'number') window.__marketRenderToken = 0;

// ⭐ v1.3.0: защита от двойного клика по категориям
if (typeof window._setCategoryPending !== 'boolean') window._setCategoryPending = false;

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
// ⭐ v1.3.0: setCategory с полной защитой
// ========================================================
async function setCategory(cat) {
    console.log('[Market] setCategory → ' + cat + ' (START)');

    // ⭐ Защита от двойного клика
    if (window._setCategoryPending) {
        console.warn('[Market] setCategory проигнорирован — предыдущий вызов в процессе');
        return;
    }
    window._setCategoryPending = true;

    try {
        // Валидация
        if (!cat || typeof cat !== 'string') {
            console.warn('[Market] setCategory: некорректная категория');
            window._setCategoryPending = false;
            return;
        }

        // Проверка уровня
        let lvl = state.player?.level ? state.player.level : 1;
        const levelGates = {
            moto: 5, atv: 8, comfort: 15, premium: 30, hyper: 50, truck: 50, yacht: 100
        };
        if (levelGates[cat] && lvl < levelGates[cat]) {
            if (typeof showToast === 'function') showToast(`🔒 Категория доступна с ${levelGates[cat]} уровня!`);
            console.log('[Market] setCategory → blocked by level for ' + cat);
            window._setCategoryPending = false;
            return;
        }

        // Обновляем активную категорию
        state.activeCategory = cat;

        // Обновляем визуально активную кнопку
        document.querySelectorAll('.cat-tile').forEach(c => c.classList.remove('active'));
        const btn = document.getElementById("catBtn-" + cat);
        if (btn) btn.classList.add('active');

        // Обновляем инфо-баннер
        const meta = (typeof CATEGORY_META !== 'undefined' && CATEGORY_META[cat]) ? CATEGORY_META[cat] : (typeof CATEGORY_META !== 'undefined' ? CATEGORY_META.economy : { name: 'Рынок', title: 'Общий рынок', capital: '—', desc: '' });
        if (typeof setTxt === 'function') {
            setTxt("currentCatBadge", meta.name);
            setTxt("catInfoTitle", "<i class='fa-solid fa-chart-line'></i> " + meta.title + ":");
            setTxt("catInfoPrice", "Капитал: " + meta.capital);
            setTxt("catInfoDesc", meta.desc);
        }

        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');

        // Показываем индикатор загрузки в контейнере
        const container = document.getElementById('marketCardContainer');
        if (container) {
            container.innerHTML = `
                <div class="glass-card text-center py-6" style="background:#090e18;">
                    <div class="radar-spinner-ring mb-2" style="margin: 0 auto;"></div>
                    <div class="sub-label font-bold text-xs color-cyan">Генерация лотов для категории «${meta.name}»...</div>
                </div>
            `;
        }

        // ⭐ Токен для защиты от гонок
        const myToken = ++window.__marketRefreshToken;

        // ⭐ Таймаут: если populateMarketFeed не завершится за 5 сек — сообщаем
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve('TIMEOUT'), 5000);
        });

        let populateResult;
        if (typeof populateMarketFeed === 'function') {
            populateResult = await Promise.race([populateMarketFeed(), timeoutPromise]);
        } else {
            console.error('[Market] populateMarketFeed не найдена!');
            populateResult = 'MISSING';
        }

        console.log('[Market] setCategory → populate result: ' + populateResult);

        // Проверяем токен — не перебил ли другой клик
        if (window.__marketRefreshToken !== myToken) {
            console.warn('[Market] setCategory → старый вызов отменён новым токеном');
            window._setCategoryPending = false;
            return;
        }

        if (populateResult === 'TIMEOUT') {
            if (typeof showToast === 'function') showToast("⏱ Превышено время генерации. Попробуйте ещё раз.");
            if (container) {
                container.innerHTML = `
                    <div class="glass-card text-center py-6" style="background:#090e18;">
                        <div style="font-size:32px; margin-bottom:6px;">⏱</div>
                        <b class="text-xs color-amber">Превышено время генерации</b>
                        <div class="sub-label mt-1" style="font-size:9.5px;">Проверьте консоль (F12) — возможно, ошибка в данных</div>
                        <button onclick="setCategory('${cat}')" class="btn btn-cyan btn-sm mt-2">Повторить</button>
                    </div>
                `;
            }
            window._setCategoryPending = false;
            return;
        }

        // Финальный рендер
        try {
            renderMarketFeed();
        } catch (e) {
            console.error('[Market] Ошибка renderMarketFeed:', e);
            if (container) {
                container.innerHTML = `
                    <div class="glass-card text-center py-6" style="background:#090e18;">
                        <div style="font-size:32px; margin-bottom:6px;">❌</div>
                        <b class="text-xs color-red">Ошибка рендера</b>
                        <div class="sub-label mt-1" style="font-size:9.5px;">Проверьте консоль — детали ошибки в логах</div>
                    </div>
                `;
            }
        }

        console.log('[Market] setCategory → ' + cat + ' (END, ' + (state.marketFeed?.length || 0) + ' lots)');

    } catch (e) {
        console.error('[Market] КРИТИЧЕСКАЯ ОШИБКА в setCategory:', e);
        if (typeof showToast === 'function') showToast("❌ Ошибка при смене категории. Смотрите консоль.");
        const container = document.getElementById('marketCardContainer');
        if (container) {
            container.innerHTML = `
                <div class="glass-card text-center py-6" style="background:#090e18; border-color:var(--red);">
                    <div style="font-size:32px; margin-bottom:6px;">❌</div>
                    <b class="text-xs color-red">Ошибка загрузки</b>
                    <div class="sub-label mt-1" style="font-size:9.5px;">${String(e.message || e).substring(0, 100)}</div>
                    <button onclick="setCategory('${cat}')" class="btn btn-cyan btn-sm mt-2">Повторить</button>
                </div>
            `;
        }
    } finally {
        window._setCategoryPending = false;
    }
}

// ========================================================
// ОБНОВЛЕНИЕ ЛЕНТЫ (ручное)
// ========================================================
async function refreshMarketFeedManual() {
    console.log('[Market] refreshMarketFeedManual → START');

    if (window._setCategoryPending) {
        console.warn('[Market] refresh проигнорирован — обновление уже идёт');
        return;
    }
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

        const grid = document.getElementById('marketCatListContainer');
        const btnIcon = document.querySelector('#btnToggleMarketGrid i');
        if (grid && !grid.classList.contains('collapsed')) {
            grid.classList.add('collapsed');
            if (btnIcon) btnIcon.className = "fa-solid fa-chevron-down";
        }

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

        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve('TIMEOUT'), 5000);
        });

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
            if (typeof showToast === 'function') showToast("⏱ Превышено время обновления");
            window._setCategoryPending = false;
            return;
        }

        renderMarketFeed();
        if (typeof showToast === 'function') showToast("Лента обновлена (-5 ⛽)!");

    } catch (e) {
        console.error('[Market] Ошибка refresh:', e);
        if (typeof showToast === 'function') showToast("❌ Ошибка обновления ленты");
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
// РЕНДЕР ЛЕНТЫ
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

        // Панель сортировки + карта
        let sortBarHtml = `
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

                htmlContent += `
                <div class='glass-card mb-3 ${busyClass} ${viewedClass} ${cardAuraClass}' id='card_${car.id}'>
                    ${viewedBadge}

                    <div class='cooldown-timer notranslate' translate='no' style='${isBusy ? "display:flex !important;" : "display:none !important;"}'>
                        <div class='timer-clock notranslate' translate='no' id='timer_num_${car.id}'>${timeLeft}с</div>
                        <div class='timer-text'>Абонент занят</div>
                        <button onclick="paidCallMarketCar('${car.id}')" class='btn btn-amber' style='width: 80%;'>Платный дозвон (1,000 ₽)</button>
                    </div>

                    <div class='car-img-wrap'>
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

                    <div class="car-specs-grid-volumetric">
                        <div class="spec-tile-3d-col">
                            <div class="spec-tile-icon-wrap spec-tile-icon-power"><i class="fa-solid fa-bolt"></i></div>
                            <div class="spec-tile-col-data">
                                <span class="spec-tile-col-label">Мощность</span>
                                <b class="color-amber">${car.power || 100} л.с.</b>
                            </div>
                        </div>
                        <div class="spec-tile-3d-col">
                            <div class="spec-tile-icon-wrap spec-tile-icon-road"><i class="fa-solid fa-road"></i></div>
                            <div class="spec-tile-col-data">
                                <span class="spec-tile-col-label">Пробег</span>
                                <b class="color-cyan">${carMileage} км${odoWarningPill}</b>
                            </div>
                        </div>
                        <div class="spec-tile-3d-col">
                            <div class="spec-tile-icon-wrap ${shieldIconClass}"><i class="fa-solid ${isBodyKnown ? 'fa-shield' : 'fa-circle-question'}"></i></div>
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
                            <div class="font-bold ${estimatedProfit > 0 ? 'color-green' : 'color-red'} text-xs" style="font-size:12px;">${estimatedProfit > 0 ? '+' : ''}${estimatedProfit.toLocaleString()} ₽</div>
                        </div>
                    </div>

                    <div class='mb-2'>
                        <button onclick="openAutotekaModal('${car.id}')" class='btn btn-dark btn-sm w-full'>
                            <i class='fa-solid fa-file-waveform color-green mr-1'></i> Автотека (${autoIcon})
                        </button>
                    </div>

                    <button onclick="initiateBuyMarketCar('${car.id}')" class="btn btn-cyan w-full font-bold">
                        <i class="fa-solid fa-phone mr-1"></i> Позвонить и назначить встречу
                    </button>
                </div>`;

            } catch (carError) {
                console.error('[Market] Ошибка рендера карточки:', carError, car.id);
            }
        });

        // Проверка токена — не перебил ли другой рендер
        if (window.__marketRenderToken !== myRenderToken) {
            console.warn('[Market] Устаревший рендер отменён');
            return;
        }

        container.innerHTML = htmlContent;
        if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });

    } catch (e) {
        console.error('[Market] Ошибка рендера:', e);
        container.innerHTML = `
            <div class='glass-card text-center py-6' style="background:#090e18; border-color:var(--red);">
                <div style="font-size:32px; margin-bottom:6px;">❌</div>
                <b class="text-xs color-red">Ошибка отображения</b>
                <div class="sub-label mt-1" style="font-size:9.5px;">${String(e.message || e).substring(0, 100)}</div>
            </div>
        `;
    }
}

// ========================================================
// ОБНОВЛЕНИЕ ТАЙМЕРОВ
// ========================================================
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

// ========================================================
// ПОКУПКА (сохранено из v1.2.0)
// ========================================================
function confirmMarketPurchaseSuccess() {
    if (typeof window.confirmMarketPurchaseSuccess === 'function' && window.confirmMarketPurchaseSuccess !== confirmMarketPurchaseSuccess) {
        // Делегируем в market-deal.js
        return window.confirmMarketPurchaseSuccess();
    }
    console.warn('[Market] confirmMarketPurchaseSuccess: делегирование не найдено');
}

function openRegistrationChoiceModal(deal) {
    if (typeof window.openRegistrationChoiceModal === 'function' && window.openRegistrationChoiceModal !== openRegistrationChoiceModal) {
        return window.openRegistrationChoiceModal(deal);
    }
}

function confirmRegistrationChoice(registerOnPlayer) {
    if (typeof window.confirmRegistrationChoice === 'function' && window.confirmRegistrationChoice !== confirmRegistrationChoice) {
        return window.confirmRegistrationChoice(registerOnPlayer);
    }
}

function openDriveRouteChoiceModal(deal) {
    if (typeof window.openDriveRouteChoiceModal === 'function' && window.openDriveRouteChoiceModal !== openDriveRouteChoiceModal) {
        return window.openDriveRouteChoiceModal(deal);
    }
}

function finishMarketCarBuyProcessRoute(routeType) {
    if (typeof window.finishMarketCarBuyProcessRoute === 'function' && window.finishMarketCarBuyProcessRoute !== finishMarketCarBuyProcessRoute) {
        return window.finishMarketCarBuyProcessRoute(routeType);
    }
}

function finishMarketCarBuyProcess(deal) {
    if (typeof window.finishMarketCarBuyProcess === 'function' && window.finishMarketCarBuyProcess !== finishMarketCarBuyProcess) {
        return window.finishMarketCarBuyProcess(deal);
    }
}

// ========================================================
// ЭКСПОРТ
// ========================================================
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
    confirmMarketPurchaseSuccess,
    openRegistrationChoiceModal,
    confirmRegistrationChoice,
    openDriveRouteChoiceModal,
    finishMarketCarBuyProcessRoute,
    finishMarketCarBuyProcess
});

console.log('[🏪 market v1.3.0] setCategory с try/catch + двойной клик + диагностика ✓');
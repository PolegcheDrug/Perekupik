// ========================================================
// js/phone/phone-m-market.js — M+ HUB: БИРЖА (v9.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v9.1.0 (UI/UX UPDATE):
//   - ДОБАВЛЕНА вкладка "Мои лоты" (фильтр my_lots).
//   - Улучшены пустые состояния (анимированный радар).
//   - Красивые карточки: бейдж "Ваш лот", анимация свежих лотов.
//   - Кнопка "ПРОДАТЬ" в шапке теперь вызывает openCreateListingModal.
//   - Исправлена ошибка с отсутствием метода _refreshCurrentScreen.
// ========================================================

(function() {
    'use strict';

    if (!window.AppM) {
        console.error('[💬 phone-m-market] AppM не загружен! Проверьте порядок скриптов: phone-m-core.js должен быть ДО phone-m-market.js');
        return;
    }

    const AppM = window.AppM;

    function getMarketManager() {
        return window.FB_Market?.MarketLots || window.FB_MarketLots || window.FB_Bridge?.MarketLots || null;
    }

    function safeEscape(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ========================================================
    // 1. ОБНОВЛЕНИЕ ЛЕНТЫ (ЗАГРУЗКА С СЕРВЕРА)
    // ========================================================
    AppM.refreshMarketFeed = async function() {
        if (this._refreshPending) return;
        this._refreshPending = true;

        try {
            const btn = document.querySelector('button[onclick="AppM.refreshMarketFeed()"]');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                btn.disabled = true;
            }

            const marketMgr = getMarketManager();
            if (marketMgr?.fetchLots) {
                const remoteLots = await marketMgr.fetchLots(true);
                
                if (Array.isArray(remoteLots)) {
                    window.state.p2pMarketListings = remoteLots.filter(l => l && l.status === 'active');
                    
                    if (typeof saveState === 'function') saveState();
                    if (typeof showToast === 'function') {
                        showToast(`🔄 Лента обновлена. Загружено лотов: ${window.state.p2pMarketListings.length}`, 'success');
                    }
                    if (window.AudioFx) window.AudioFx.play('win');
                }
            } else {
                if (typeof showToast === 'function') showToast('⚠️ Нет связи с сервером биржи', 'warning');
            }
        } catch (e) {
            console.error('[AppM] refreshMarketFeed error:', e);
            if (typeof showToast === 'function') showToast('❌ Ошибка обновления ленты', 'error');
        } finally {
            this._refreshPending = false;
            const container = document.getElementById('phoneAppContainer');
            if (container && typeof this.render === 'function') {
                this.render(container);
            }
        }
    };

    // ========================================================
    // 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ЧЕРНОГО РЫНКА
    // ========================================================
    AppM._generateBlackMarketListings = function() {
        if (!window.state.blackMarketCars || window.state.blackMarketCars.length === 0) {
            window.state.blackMarketCars = [
                {
                    id: 'bm_car_1',
                    name: 'BMW E39 530d (Перебитый VIN)',
                    price: 350000,
                    itemData: { name: 'BMW E39 530d', power: 193, condition: 65, img: 'assets/cars/economy/e38/e38.jpg', isStolen: true, legalDefect: 'criminal_vin' },
                    type: 'cars',
                    sellerName: 'Теневой Барыга',
                    sellerId: 'npc_shadow',
                    isBlackMarket: true
                },
                {
                    id: 'bm_car_2',
                    name: 'Toyota Mark II (Угон)',
                    price: 450000,
                    itemData: { name: 'Toyota Mark II', power: 280, condition: 70, img: 'assets/cars/economy/chaser/chaser.jpg', isStolen: true, legalDefect: 'legal_arrest' },
                    type: 'cars',
                    sellerName: 'Ночной Курьер',
                    sellerId: 'npc_night',
                    isBlackMarket: true
                },
                {
                    id: 'bm_car_3',
                    name: 'Audi A6 C5 (Конструктор)',
                    price: 280000,
                    itemData: { name: 'Audi A6 C5', power: 165, condition: 50, img: 'assets/cars/economy/a6c5/a6c5.jpg', isStolen: false, legalDefect: 'legal_pts_duplicate' },
                    type: 'cars',
                    sellerName: 'Разборщик',
                    sellerId: 'npc_scrap',
                    isBlackMarket: true
                }
            ];
        }
        return window.state.blackMarketCars;
    };

    // ========================================================
    // 3. РЕНДЕР БИРЖИ
    // ========================================================
    AppM.renderMarketScreen = function(container) {
        if (!container) return;

        const f = this.marketFilter || 'cars';
        const pLvl = window.state.player?.level || 1;
        
        const seasonEvent = window.state.globalEvent || null;
        let seasonBannerHtml = '';
        if (seasonEvent && seasonEvent.isActive) {
            seasonBannerHtml = `
                <div class="glass-card mb-2 p-2 text-center" style="background: linear-gradient(90deg, rgba(192,132,252,0.2), rgba(0,242,254,0.2)); border-color: var(--purple);">
                    <b class="text-xs color-purple"><i class="fa-solid fa-star mr-1"></i> ${seasonEvent.name}</b>
                    <div class="sub-label" style="font-size:9px;">Множитель цен: x${seasonEvent.multiplier} | Осталось: ${seasonEvent.daysLeft} дн.</div>
                </div>
            `;
        }

        container.innerHTML = `
            <style>
                @keyframes radarSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes lotPulse {
                    0% { box-shadow: 0 0 5px rgba(0,242,254,0.2); border-color: rgba(0,242,254,0.3); }
                    50% { box-shadow: 0 0 20px rgba(0,242,254,0.6); border-color: rgba(0,242,254,0.8); }
                    100% { box-shadow: 0 0 5px rgba(0,242,254,0.2); border-color: rgba(0,242,254,0.3); }
                }
            </style>

            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.12), #090e18); border-color: rgba(0, 230, 118, 0.35);">
                <div>
                    <b class="text-xs color-green"><i class="fa-solid fa-globe"></i> Онлайн P2P Биржа</b>
                    <div class="sub-label" style="font-size:8.5px;">Авто · Номера · Бизнес · Жильё</div>
                </div>
            </div>

            ${seasonBannerHtml}

            <!-- ФИЛЬТРЫ -->
            <div class="mplus-nav-scroll-bar mb-2">
                <button onclick="AppM.setMarketFilter('cars')" class="m-nav-pill ${f === 'cars' ? 'active' : ''}">
                    <i class="fa-solid fa-car"></i> Авто
                </button>
                <button onclick="AppM.setMarketFilter('plates')" class="m-nav-pill ${f === 'plates' ? 'active' : ''}">
                    <i class="fa-solid fa-id-card"></i> Номера
                </button>
                <button onclick="AppM.setMarketFilter('business')" class="m-nav-pill ${f === 'business' ? 'active' : ''}">
                    <i class="fa-solid fa-briefcase"></i> Бизнес
                </button>
                <button onclick="AppM.setMarketFilter('housing')" class="m-nav-pill ${f === 'housing' ? 'active' : ''}">
                    <i class="fa-solid fa-house"></i> Жильё
                </button>
                <button onclick="AppM.setMarketFilter('my_lots')" class="m-nav-pill ${f === 'my_lots' ? 'active' : ''}">
                    <i class="fa-solid fa-user"></i> Мои
                </button>
            </div>

            <div id="p2pLotsArea">
                ${this.renderP2PLotsHtml(f)}
            </div>
        `;
    };

    AppM.setMarketFilter = function(filter) {
        this.marketFilter = filter;
        if (typeof playSound === 'function') playSound('tick');
        const area = document.getElementById('p2pLotsArea');
        if (area) area.innerHTML = this.renderP2PLotsHtml(filter);
    };

    AppM.renderP2PLotsHtml = function(filter) {
        const myUid = String(window.state?.player?.uid || window.tgUserId || '');
        let lots = [];

        if (filter === 'black_market') {
            lots = this._generateBlackMarketListings();
        } else if (filter === 'my_lots') {
            lots = (window.state.p2pMarketListings || []).filter(l => l && String(l.sellerId) === myUid);
        } else {
            lots = window.state.p2pMarketListings || [];
            
            const seen = new Set();
            const deduped = [];
            lots.forEach(l => {
                if (!l) return;
                const key = String(l.id || l.lot_id || '');
                if (key && seen.has(key)) return;
                if (key) seen.add(key);
                deduped.push(l);
            });
            window.state.p2pMarketListings = deduped;

            lots = deduped.filter(l => {
                if (filter === 'cars') return l.type === 'car' || l.type === 'cars';
                if (filter === 'plates') return l.type === 'plate' || l.type === 'plates';
                return l.type === filter;
            });
        }

        if (lots.length === 0) {
            return `
                <div class="glass-card text-center sub-label py-6" style="background:#090e18; border: 1px dashed rgba(0,242,254,0.2);">
                    <div style="position:relative; width:60px; height:60px; margin:0 auto 15px auto;">
                        <div style="position:absolute; inset:0; border:2px solid rgba(0,242,254,0.2); border-radius:50%;"></div>
                        <div style="position:absolute; inset:0; border-top:2px solid var(--cyan); border-radius:50%; animation: radarSpin 2s linear infinite;"></div>
                        <i class="fa-solid fa-satellite-dish" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:20px; color:var(--cyan);"></i>
                    </div>
                    <div class="font-bold color-cyan" style="font-size:12px;">Сканирование сети...</div>
                    <div class="text-xs mt-1" style="font-size:9px; color:#94a3b8;">
                        ${filter === 'my_lots' ? 'Вы пока ничего не выставили на продажу. Нажмите "+ ПРОДАТЬ" сверху!' : 'Пока нет активных лотов. Нажмите "Обновить", чтобы подгрузить данные.'}
                    </div>
                </div>
            `;
        }

        const now = Date.now();

        return lots.map(item => {
            const isMine = String(item.sellerId) === myUid;
            const itemData = item.itemData || {};
            const isNew = item.createdAt && (now - item.createdAt < 5 * 60 * 1000);
            const ageMinutes = Math.floor((now - (item.createdAt || now)) / 60000);
            
            let borderColor = isMine ? 'var(--green)' : 'var(--cyan)';
            if (item.isBlackMarket) borderColor = 'var(--red)';
            if (isNew) borderColor = 'var(--amber)';

            let imgHtml = '';
            let descText = '';

            if (item.type === 'cars' || item.type === 'car') {
                let rawImg = itemData.img || item.img;
                if (!rawImg) {
                    const catalogCar = (window.BARN_CARS_DATABASE || []).find(b => b && (b.id === itemData.id || b.name === item.name || b.name === itemData.name))
                                    || (window.CARS_DATABASE || []).find(c => c && (c.id === itemData.id || c.name === item.name || c.name === itemData.name));
                    if (catalogCar && catalogCar.img) rawImg = catalogCar.img;
                }
                if (!rawImg) rawImg = "assets/cars/economy/2101/vaz-2101.jpg";

                let imgAttrs = (typeof buildCarImageAttrs === 'function')
                    ? buildCarImageAttrs(rawImg, itemData)
                    : `src="${rawImg}"`;

                imgHtml = `<div class="car-img-wrap mb-2" style="height:110px;"><img ${imgAttrs} class="car-img"></div>`;
                descText = `${itemData.power || 100} л.с. · Кузов ${itemData.condition || 85}%`;
                
                if (item.isBlackMarket) {
                    descText += ` · <span class="color-red">⚠️ ${itemData.legalDefect ? 'Проблемный VIN' : 'Риск'}</span>`;
                }
            } else if (item.type === 'plates' || item.type === 'plate') {
                imgHtml = `<div class="p-3 mb-2 text-center" style="background:#050914; border-radius:10px; border:1px solid rgba(0, 242, 254, 0.3);">
                    <div class="license-plate" style="font-size:15px; padding:4px 10px; display:inline-flex;">${safeEscape(itemData.plate || item.name)}</div>
                </div>`;
                descText = 'Архивный знак РФ';
            } else if (item.type === 'business') {
                imgHtml = `<div class="p-3 mb-2 text-center" style="background:#050914; border-radius:10px; border:1px solid rgba(0, 230, 118, 0.3);">
                    <b class="color-green">${safeEscape(item.name)}</b>
                </div>`;
                descText = 'Готовый бизнес';
            } else if (item.type === 'housing') {
                imgHtml = `<div class="p-3 mb-2 text-center" style="background:#050914; border-radius:10px; border:1px solid rgba(255, 179, 0, 0.3);">
                    <b class="color-amber">${safeEscape(item.name)}</b>
                </div>`;
                descText = 'Недвижимость / Бокс';
            }

            const targetLotId = item.id || item.lot_id;

            return `
                <div class="glass-card mb-2 p-2" style="border-left: 3px solid ${borderColor}; background:#090e18; ${isNew ? 'animation: lotPulse 2s infinite alternate;' : ''}">
                    ${imgHtml}
                    
                    <div class="flex-between mb-1">
                        <div style="min-width:0; flex:1;">
                            <div class="flex-gap" style="align-items:center;">
                                <b class="text-xs ${item.isBlackMarket ? 'color-red' : (isMine ? 'color-green' : 'color-cyan')}" style="font-size:12px;">${safeEscape(item.name)}</b>
                                ${isMine ? '<span class="tag-badge bg-tag-green" style="font-size:7px;">ВАШ ЛОТ</span>' : ''}
                                ${isNew ? '<span class="tag-badge bg-tag-amber" style="font-size:7px;">НОВЫЙ</span>' : ''}
                            </div>
                            <div class="sub-label" style="font-size:8.5px;">
                                Продавец: ${isMine ? 'Вы' : safeEscape(item.sellerName || 'Игрок')} • ${ageMinutes < 1 ? 'Только что' : ageMinutes + ' мин назад'}
                            </div>
                        </div>
                        <span class="price-val text-xs color-green" style="font-size:13px;">${Number(item.price).toLocaleString()} ₽</span>
                    </div>
                    
                    <div class="sub-label mb-2" style="font-size:9.5px;">${descText}</div>

                    ${isMine ? `
                        <button onclick="AppM.cancelP2PListing('${targetLotId}')" class="btn btn-red btn-sm w-full" style="font-size:10px; padding:6px;">
                            <i class="fa-solid fa-xmark mr-1"></i> Снять с продажи
                        </button>
                    ` : `
                        <div class="grid-2" style="gap:4px;">
                            <button onclick="AppM.startTradeWithSeller('${targetLotId}')" class="btn btn-cyan btn-sm" style="font-size:10px; padding:6px;">
                                <i class="fa-solid fa-comments"></i> Торг
                            </button>
                            <button onclick="AppM.buyP2PInstantly('${targetLotId}')" class="btn ${item.isBlackMarket ? 'btn-red' : 'btn-green'} btn-sm" style="font-size:10px; padding:6px; box-shadow: 0 0 10px rgba(0,230,118,0.3);">
                                <i class="fa-solid fa-bolt"></i> Выкупить
                            </button>
                        </div>
                    `}
                </div>
            `;
        }).join('');
    };

    // ========================================================
    // 4. ТОРГ С ПРОДАВЦОМ
    // ========================================================
    AppM.startTradeWithSeller = function(lotId) {
        if (!lotId) return;
        if (typeof window.openP2PDealModal === 'function') {
            window.openP2PDealModal(lotId);
        } else {
            if (typeof showToast === 'function') showToast('⚠️ Модуль P2P-торга не загружен');
        }
    };

    // ========================================================
    // 5. МГНОВЕННЫЙ ВЫКУП
    // ========================================================
    AppM.buyP2PInstantly = async function(lotId) {
        if (this._buyPending) return;
        this._buyPending = true;

        try {
            const lot = (window.state?.p2pMarketListings || []).find(l => l && (l.id === lotId || l.lot_id === lotId));
            const isBlackMarket = !lot && String(lotId).startsWith('bm_car_');

            if (isBlackMarket) {
                this._buyBlackMarketCar(lotId);
                return;
            }

            if (!lot) {
                if (typeof showToast === 'function') showToast('❌ Лот не найден');
                return;
            }

            const price = Number(lot.price) || 0;
            const myCash = Number(window.state?.player?.cash) || 0;

            if (myCash < price) {
                if (typeof showToast === 'function') showToast(`❌ Не хватает ${(price - myCash).toLocaleString()} ₽`);
                return;
            }

            // Прямой вызов через глобальный метод firebase-market.js
            if (typeof window.buyP2PLotDirect === 'function') {
                await window.buyP2PLotDirect(lot.id || lot.lot_id || lotId);
                const area = document.getElementById('p2pLotsArea');
                if (area) area.innerHTML = this.renderP2PLotsHtml(this.marketFilter || 'cars');
                return;
            }

            // Резервный вызов через менеджер FB_Market
            const marketMgr = getMarketManager();
            const myProfile = window.FB_Market?.getCurrentPlayerProfile?.() || {
                id: window.state.player?.uid || window.tgUserId,
                name: window.state.player?.name || 'Покупатель'
            };

            if (marketMgr?.buyLotAtomic) {
                const res = await marketMgr.buyLotAtomic(lot.id || lot.lot_id || lotId, myProfile, myCash);
                if (!res.success) {
                    if (typeof showToast === 'function') showToast(`❌ ${res.error || 'Ошибка выкупа в облаке'}`);
                    return;
                }
            }

            // Локальные операции
            window.state.player.cash -= price;

            if (lot.type === 'cars' || lot.type === 'car') {
                const car = Object.assign({}, lot.itemData || {}, {
                    name: lot.name,
                    uid: 'car_p2p_' + Date.now(),
                    purchaseCost: price,
                    isRegisteredOnPlayer: false,
                    ownershipDays: 0
                });
                if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);
                if (!window.state.garage) window.state.garage = [];
                window.state.garage.push(car);
            } else if (lot.type === 'plates' || lot.type === 'plate') {
                if (window.PlatesManager) {
                    window.PlatesManager.addPlate(lot.itemData?.plate || lot.name, 'p2p_buy');
                }
            } else if (lot.type === 'business') {
                const biz = (window.state.businesses || []).find(b => b.id === lot.itemData?.bizId);
                if (biz) biz.level = Math.max(biz.level || 0, lot.itemData?.level || 1);
            } else if (lot.type === 'housing') {
                if (!window.state.player.ownedHouses) window.state.player.ownedHouses = [];
                if (!window.state.player.ownedHouses.includes(lot.itemData?.houseId)) {
                    window.state.player.ownedHouses.push(lot.itemData?.houseId);
                }
            }

            window.state.p2pMarketListings = (window.state.p2pMarketListings || []).filter(l =>
                l && (l.id !== lotId && l.lot_id !== lotId)
            );

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (typeof renderGarage === 'function') renderGarage();

            if (typeof openVerdictModal === 'function') {
                openVerdictModal(
                    "✅ СДЕЛКА ЗАКРЫТА!",
                    `Вы выкупили «${lot.name}» за ${price.toLocaleString()} ₽. Товар доставлен в гараж/инвентарь.`,
                    true,
                    price
                );
            }
            if (window.AudioFx) window.AudioFx.play('win');

            const area = document.getElementById('p2pLotsArea');
            if (area) area.innerHTML = this.renderP2PLotsHtml(this.marketFilter || 'cars');

        } catch (e) {
            console.error('[AppM] buyP2PInstantly error:', e);
            if (typeof showToast === 'function') showToast('❌ Ошибка выкупа: ' + (e.message || String(e)));
        } finally {
            this._buyPending = false;
        }
    };

    // ========================================================
    // 6. ВЫКУП С ЧЁРНОГО РЫНКА
    // ========================================================
    AppM._buyBlackMarketCar = function(carId) {
        const bmCars = this._generateBlackMarketListings();
        const lot = bmCars.find(c => c.id === carId);
        if (!lot) {
            if (typeof showToast === 'function') showToast('❌ Лот не найден');
            return;
        }

        const price = lot.price;
        const myCash = window.state.player?.cash || 0;
        if (myCash < price) {
            if (typeof showToast === 'function') showToast('❌ Не хватает наличных!');
            return;
        }

        window.state.player.cash -= price;
        bmCars.splice(bmCars.indexOf(lot), 1);

        const car = Object.assign({}, lot.itemData, {
            uid: 'car_bm_' + Date.now(),
            purchaseCost: price,
            isRegisteredOnPlayer: false,
            isStolen: !!lot.itemData?.isStolen,
            legalDefect: lot.itemData?.legalDefect ? { id: lot.itemData.legalDefect } : null,
            ownershipDays: 0
        });

        if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);
        if (!window.state.garage) window.state.garage = [];
        window.state.garage.push(car);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();

        if (typeof openVerdictModal === 'function') {
            openVerdictModal(
                "🏴‍☠️ КУПЛЕНО НА ЧЁРНОМ РЫНКЕ",
                `Машина «${car.name}» в гараже. ⚠️ У неё есть юридические проблемы — ГИБДД может изъять!`,
                true,
                price
            );
        }
        if (window.AudioFx) window.AudioFx.play('win');

        const area = document.getElementById('p2pLotsArea');
        if (area) area.innerHTML = this.renderP2PLotsHtml('black_market');
    };

    // ========================================================
    // 7. СНЯТИЕ ЛОТА
    // ========================================================
    AppM.cancelP2PListing = async function(lotId) {
        if (!lotId) return;
        if (!confirm('Снять лот с продажи?')) return;

        const marketMgr = getMarketManager();
        if (marketMgr?.cancelLot) {
            try {
                await marketMgr.cancelLot(lotId, window.state.player?.uid);
            } catch (e) {
                console.warn('[AppM] cancelLot error:', e);
            }
        }

        window.state.p2pMarketListings = (window.state.p2pMarketListings || []).filter(l =>
            l && l.id !== lotId && l.lot_id !== lotId
        );

        if (typeof saveState === 'function') saveState();
        if (typeof showToast === 'function') showToast('✅ Лот снят с биржи');

        const area = document.getElementById('p2pLotsArea');
        if (area) area.innerHTML = this.renderP2PLotsHtml(this.marketFilter || 'cars');
    };

    // ========================================================
    // 8. СОЗДАНИЕ ЛОТА
    // ========================================================
    AppM.openCreateListingModal = function() {
        this._currentModalItems = [];
        this.selectedItemIndex = null;

        const modal = document.getElementById('modalCreateP2P');
        if (modal && typeof ModalManager !== 'undefined') {
            ModalManager.open('modalCreateP2P');
        }
    };

    // ========================================================
    // 9. ПОДТВЕРЖДЕНИЕ ПУБЛИКАЦИИ
    // ========================================================
    AppM.confirmCreateP2PListing = async function() {
        if (this._publishPending) return;
        this._publishPending = true;

        try {
            const priceInput = document.getElementById('p2pPriceInput');
            const price = parseInt(priceInput?.value, 10);
            const idx = this.selectedItemIndex;

            if (idx === null || isNaN(price) || price <= 1000) {
                if (typeof showToast === 'function') showToast('Укажите корректную цену');
                return;
            }

            const type = this.selectedListingType;
            const myUid = String(window.state.player?.uid || window.tgUserId || 'me');
            const myName = window.state.player?.name || 'Перекуп';

            const targetItem = this._currentModalItems?.[idx];
            if (!targetItem) {
                if (typeof showToast === 'function') showToast('Ошибка: выбранный объект не найден');
                return;
            }

            let newListing = {
                id: 'p2p_' + Date.now(),
                sellerId: myUid,
                sellerName: myName,
                type: type,
                price: price,
                itemData: {},
                createdAt: Date.now()
            };

            if (type === 'cars') {
                const car = targetItem;
                newListing.name = car.name;
                newListing.img = car.assignedLotImg || car.img || car.baseImg || '';
                newListing.fallback = car.fallback || '';
                newListing.itemData = Object.assign({}, car);
                if (!newListing.itemData.img) newListing.itemData.img = newListing.img;

                const gIdx = window.state.garage.indexOf(car);
                if (gIdx !== -1) {
                    window.state.garage.splice(gIdx, 1);
                }
                if (typeof renderGarage === 'function') renderGarage();
            } else if (type === 'plates') {
                const plateObj = targetItem;
                newListing.name = 'Номер ' + plateObj.number;
                newListing.itemData = { plate: plateObj.number, region: plateObj.region || 77 };
                plateObj.status = 'on_sale';
            } else if (type === 'business') {
                const biz = targetItem;
                newListing.name = biz.customName || biz.name;
                newListing.itemData = { bizId: biz.id, level: biz.level };
                biz.level = 0;
            } else if (type === 'housing') {
                const house = targetItem;
                newListing.name = 'Объект ' + house.name;
                newListing.itemData = { houseId: house.id };
                window.state.player.ownedHouses = (window.state.player.ownedHouses || []).filter(x => x !== house.id);
            }

            if (!window.state.p2pMarketListings) window.state.p2pMarketListings = [];
            window.state.p2pMarketListings.unshift(newListing);

            const marketMgr = getMarketManager();
            if (marketMgr?.publishLot) {
                try {
                    const res = await marketMgr.publishLot(newListing, { id: myUid, name: myName });
                    if (res && res.success && res.lotId) {
                        newListing.id = res.lotId;
                        newListing.lot_id = res.lotId;
                    } else if (res && !res.success) {
                        if (typeof showToast === 'function') showToast(`⚠️ Облако: ${res.error}. Лот сохранён локально.`);
                    }
                } catch (e) {
                    console.warn('[AppM] Firestore publishLot error:', e);
                    if (typeof showToast === 'function') showToast('⚠️ Облако недоступно. Лот сохранён локально.');
                }
            }

            if (typeof saveState === 'function') saveState();
            if (typeof ModalManager !== 'undefined') ModalManager.close('modalCreateP2P');
            if (typeof showToast === 'function') showToast('✅ Лот выставлен на биржу');
            if (window.AudioFx) window.AudioFx.play('win');

            const area = document.getElementById('p2pLotsArea');
            if (area) area.innerHTML = this.renderP2PLotsHtml(this.marketFilter || 'cars');

        } finally {
            this._publishPending = false;
        }
    };

    console.log('[💱 phone-m-market v9.1.0] Добавлена вкладка "Мои лоты", анимированные заглушки и премиум-карточки ✓');
})();
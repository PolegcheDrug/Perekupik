// ========================================================
// js/phone/phone-m-market.js — M+ HUB: БИРЖА (v9.1.6 P2P TRADE READY)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ========================================================

(function() {
    'use strict';

    if (!window.AppM) {
        console.error('[💬 phone-m-market] AppM не загружен!');
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

    function resolveCarImage(car) {
        if (!car) return "assets/cars/economy/2101/vaz-2101.jpg";
        if (car.assignedLotImg) return car.assignedLotImg;
        if (car.img) return car.img;
        if (car.baseImg) return car.baseImg;
        
        const catalogCar = (window.BARN_CARS_DATABASE || []).find(b => b && (b.id === car.id || b.name === car.name))
                        || (window.CARS_DATABASE || []).find(c => c && (c.id === car.id || c.name === car.name));
        if (catalogCar && catalogCar.img) return catalogCar.img;
        
        return "assets/cars/economy/2101/vaz-2101.jpg";
    }

    // ========================================================
    // 1. ОБНОВЛЕНИЕ ЛЕНТЫ
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
                    window.state.p2pMarketListings = remoteLots.filter(l => l && (l.status === 'active' || !l.status));
                    
                    if (typeof saveState === 'function') saveState();
                    if (typeof showToast === 'function') {
                        showToast(`🔄 Загружено лотов: ${window.state.p2pMarketListings.length}`, 'success');
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
            const area = document.getElementById('p2pLotsArea');
            if (area) area.innerHTML = this.renderP2PLotsHtml(this.marketFilter || 'cars');
            const btn = document.querySelector('button[onclick="AppM.refreshMarketFeed()"]');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-rotate"></i>';
                btn.disabled = false;
            }
        }
    };

    // ========================================================
    // 2. ЧЕРНЫЙ РЫНОК
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
                const rawImg = resolveCarImage(itemData.img ? itemData : item);
                let imgAttrs = (typeof buildCarImageAttrs === 'function')
                    ? buildCarImageAttrs(rawImg, itemData)
                    : `src="${rawImg}"`;

                imgHtml = `<div class="car-img-wrap mb-2" style="height:110px;"><img ${imgAttrs} class="car-img" style="width:100%; height:100%; object-fit:cover; border-radius:6px;"></div>`;
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
    // 4. ТОРГ С ПРОДАВЦОМ (МОДАЛКА ИЛИ ДИАЛОГ)
    // ========================================================
    AppM.startTradeWithSeller = function(lotId) {
        if (!lotId) return;

        const lot = (window.state?.p2pMarketListings || []).find(l => l && (String(l.id) === String(lotId) || String(l.lot_id) === String(lotId)));
        const targetId = lot ? (lot.id || lot.lot_id) : lotId;

        // Если доступна модалка офферов
        if (typeof window.openP2PDealModal === 'function') {
            try {
                window.openP2PDealModal(targetId);
                return;
            } catch (e) {
                console.warn('[AppM] openP2PDealModal error:', e);
            }
        }

        // Альтернативный переход в чат
        if (lot) {
            let dialogId = 'dlg_p2p_' + targetId;
            let msg = (window.state.player.phoneMessages || []).find(m => m.id === dialogId);

            if (!msg) {
                if (!window.state.player.phoneMessages) window.state.player.phoneMessages = [];
                msg = {
                    id: dialogId,
                    sender: lot.sellerName || 'Продавец',
                    sellerId: lot.sellerId,
                    category: 'p2p',
                    p2pLotId: targetId,
                    p2pRole: 'buyer',
                    askingPrice: lot.price,
                    carData: lot.itemData || { name: lot.name, img: lot.img },
                    chatHistory: [
                        { from: 'them', text: `Здравствуйте! Торгуюсь по ${lot.name}. Какое у вас предложение?` }
                    ],
                    unread: false,
                    lastMessageAt: Date.now()
                };
                window.state.player.phoneMessages.unshift(msg);
                if (typeof saveState === 'function') saveState();
            }

            this.openDialog(dialogId);
        } else {
            if (typeof showToast === 'function') showToast('❌ Лот не найден');
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

            if (typeof window.buyP2PLotDirect === 'function') {
                await window.buyP2PLotDirect(lot.id || lot.lot_id || lotId);
                const area = document.getElementById('p2pLotsArea');
                if (area) area.innerHTML = this.renderP2PLotsHtml(this.marketFilter || 'cars');
                return;
            }

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
    // 6. ЧЁРНЫЙ РЫНОК
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

        const lot = (window.state.p2pMarketListings || []).find(l => l && (l.id === lotId || l.lot_id === lotId));

        const marketMgr = getMarketManager();
        if (marketMgr?.cancelLot) {
            try {
                await marketMgr.cancelLot(lotId, window.state.player?.uid);
            } catch (e) {
                console.warn('[AppM] cancelLot error:', e);
            }
        }

        if (lot && lot.itemData) {
            if (lot.type === 'cars' || lot.type === 'car') {
                if (!Array.isArray(window.state.garage)) window.state.garage = [];
                const restoredCar = Object.assign({}, lot.itemData);
                if (!restoredCar.uid) restoredCar.uid = 'car_' + Date.now();
                window.state.garage.push(restoredCar);
                if (typeof renderGarage === 'function') renderGarage();
            } else if (lot.type === 'plates' || lot.type === 'plate') {
                const pNum = lot.itemData?.plate || lot.name?.replace('Номер ', '');
                if (window.PlatesManager && typeof window.PlatesManager.addPlate === 'function') {
                    window.PlatesManager.addPlate(pNum, 'storage');
                }
            } else if (lot.type === 'business') {
                const biz = (window.state.businesses || []).find(b => b.id === lot.itemData?.bizId);
                if (biz) biz.level = Math.max(biz.level || 0, lot.itemData?.level || 1);
            } else if (lot.type === 'housing' && lot.itemData?.houseId) {
                if (!window.state.player.ownedHouses) window.state.player.ownedHouses = [];
                if (!window.state.player.ownedHouses.includes(lot.itemData.houseId)) {
                    window.state.player.ownedHouses.push(lot.itemData.houseId);
                }
            }
        }

        window.state.p2pMarketListings = (window.state.p2pMarketListings || []).filter(l =>
            l && l.id !== lotId && l.lot_id !== lotId
        );

        if (typeof saveState === 'function') saveState();
        if (typeof showToast === 'function') showToast('✅ Лот снят и возвращён в гараж');

        const area = document.getElementById('p2pLotsArea');
        if (area) area.innerHTML = this.renderP2PLotsHtml(this.marketFilter || 'cars');
    };

    // ========================================================
    // 8. СОЗДАНИЕ ЛОТА
    // ========================================================
    AppM._ensureCreateModalExists = function() {
        let modal = document.getElementById('modalCreateP2P');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalCreateP2P';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-box" style="max-width: 420px; width:92%; background:#090e18; border:1.5px solid var(--green); border-radius:12px; padding:16px; box-shadow:0 0 35px rgba(0,230,118,0.25);">
                    <div class="flex-between mb-3" style="display:flex; justify-content:space-between; align-items:center;">
                        <div class="modal-glow-badge" style="color:var(--green); border-color:var(--green); font-size:12px; font-weight:800;">
                            <i class="fa-solid fa-handshake"></i> ВЫСТАВИТЬ НА P2P
                        </div>
                        <button onclick="AppM.closeCreateListingModal()" class="btn btn-dark btn-auto btn-sm" style="padding:4px 10px;">✕</button>
                    </div>

                    <div class="grid-4 mb-3" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:4px;">
                        <button id="btnP2PTypeCar" onclick="AppM.selectP2PListingType('cars')" class="btn btn-cyan btn-sm active" style="font-size:10px; padding:6px 0;">АВТО</button>
                        <button id="btnP2PTypePlate" onclick="AppM.selectP2PListingType('plates')" class="btn btn-dark btn-sm" style="font-size:10px; padding:6px 0;">НОМЕР</button>
                        <button id="btnP2PTypeBiz" onclick="AppM.selectP2PListingType('business')" class="btn btn-dark btn-sm" style="font-size:10px; padding:6px 0;">БИЗНЕС</button>
                        <button id="btnP2PTypeHouse" onclick="AppM.selectP2PListingType('housing')" class="btn btn-dark btn-sm" style="font-size:10px; padding:6px 0;">ЖИЛЬЁ</button>
                    </div>

                    <div class="sub-label mb-1" style="font-size:9.5px; color:#94a3b8;">Выберите объект:</div>
                    <div id="p2pCardsListContainer" style="max-height:180px; overflow-y:auto; margin-bottom:12px; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:4px; background:#050811;">
                        <div class="sub-label text-center py-4">Загрузка...</div>
                    </div>

                    <div class="sub-label mb-1" style="font-size:9.5px; color:#94a3b8;">Цена (₽):</div>
                    <input type="number" id="p2pPriceInput" class="chat-input" 
                           style="width:100%; font-size:16px; font-weight:800; color:var(--green); padding:10px; margin-bottom:12px; background:#050811; border:1px solid rgba(0,230,118,0.3); border-radius:6px;"
                           placeholder="Цена в рублях" min="1000">

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                        <button onclick="AppM.confirmCreateP2PListing()" class="btn btn-green font-bold" style="padding:10px; background:var(--green); color:#000; font-weight:bold; border:none; border-radius:6px; cursor:pointer;">
                            ВЫСТАВИТЬ ☁️
                        </button>
                        <button onclick="AppM.closeCreateListingModal()" class="btn btn-dark" style="padding:10px; border-radius:6px;">
                            ОТМЕНА
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        return modal;
    };

    AppM.openCreateListingModal = function() {
        const modal = this._ensureCreateModalExists();
        this._currentModalItems = [];
        this.selectedItemIndex = 0;

        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.zIndex = '999999';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.background = 'rgba(0, 0, 0, 0.85)';
        modal.style.backdropFilter = 'blur(6px)';
        modal.classList.add('active');

        if (typeof ModalManager !== 'undefined') {
            try { ModalManager.open('modalCreateP2P'); } catch (e) {}
        }

        setTimeout(() => {
            this.selectP2PListingType('cars', false);
        }, 50);

        if (window.AudioFx) window.AudioFx.play('tick');
    };

    AppM.closeCreateListingModal = function() {
        const modal = document.getElementById('modalCreateP2P');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        if (typeof ModalManager !== 'undefined') {
            try { ModalManager.close('modalCreateP2P'); } catch (e) {}
        }
    };

    AppM.selectP2PListingType = function(type, resetSelection = true) {
        try {
            this.selectedListingType = type;
            if (resetSelection) {
                this.selectedItemIndex = 0;
            }

            const btnCar = document.getElementById('btnP2PTypeCar');
            const btnPlate = document.getElementById('btnP2PTypePlate');
            const btnBiz = document.getElementById('btnP2PTypeBiz');
            const btnHouse = document.getElementById('btnP2PTypeHouse');

            if (btnCar) btnCar.className = type === 'cars' ? 'btn btn-cyan btn-sm active' : 'btn btn-dark btn-sm';
            if (btnPlate) btnPlate.className = type === 'plates' ? 'btn btn-cyan btn-sm active' : 'btn btn-dark btn-sm';
            if (btnBiz) btnBiz.className = type === 'business' ? 'btn btn-cyan btn-sm active' : 'btn btn-dark btn-sm';
            if (btnHouse) btnHouse.className = type === 'housing' ? 'btn btn-cyan btn-sm active' : 'btn btn-dark btn-sm';

            const container = document.getElementById('p2pCardsListContainer');
            if (!container) return;

            let html = '';
            this._currentModalItems = [];

            if (type === 'cars') {
                const garageArr = window.state?.garage;
                const garage = Array.isArray(garageArr) ? garageArr.filter(c => c && !c.isPersonal) : [];
                
                if (garage.length === 0) {
                    html = '<div class="sub-label text-center py-4" style="font-size:10px; color:#64748b;">В гараже нет доступных машин для продажи</div>';
                    this.selectedItemIndex = null;
                } else {
                    garage.forEach((car, i) => {
                        this._currentModalItems.push(car);
                        const isSelected = this.selectedItemIndex === i;
                        const img = resolveCarImage(car);
                        html += `
                            <div onclick="AppM.selectP2PItemToSell(${i})" class="glass-card p-2 flex-between mb-1" style="cursor:pointer; border-color:${isSelected ? 'var(--green)' : 'rgba(255,255,255,0.08)'}; background:${isSelected ? 'rgba(0,230,118,0.12)' : '#070b14'}; display:flex; justify-content:space-between; align-items:center; border-radius:6px;">
                                <div class="flex-gap" style="display:flex; align-items:center; gap:8px;">
                                    <img src="${img}" style="width:45px; height:32px; object-fit:cover; border-radius:4px; border:1px solid rgba(255,255,255,0.1);">
                                    <div>
                                        <b class="text-xs ${isSelected ? 'color-green' : 'color-cyan'}" style="font-size:11px;">${safeEscape(car.name)}</b>
                                        <div class="sub-label" style="font-size:9px; color:#94a3b8;">${car.power || 100} л.с. | ${car.condition || 80}%</div>
                                    </div>
                                </div>
                                ${isSelected ? '<i class="fa-solid fa-circle-check color-green" style="font-size:16px; color:var(--green);"></i>' : ''}
                            </div>
                        `;
                    });
                }
            } else if (type === 'plates') {
                const plates = (window.PlatesManager && typeof window.PlatesManager.getFreePlates === 'function') ? window.PlatesManager.getFreePlates() : [];
                if (plates.length === 0) {
                    html = '<div class="sub-label text-center py-4" style="font-size:10px; color:#64748b;">Нет свободных номеров в инвентаре</div>';
                    this.selectedItemIndex = null;
                } else {
                    plates.forEach((p, i) => {
                        this._currentModalItems.push(p);
                        const isSelected = this.selectedItemIndex === i;
                        html += `
                            <div onclick="AppM.selectP2PItemToSell(${i})" class="glass-card p-2 flex-between mb-1" style="cursor:pointer; border-color:${isSelected ? 'var(--green)' : 'rgba(255,255,255,0.08)'}; background:${isSelected ? 'rgba(0,230,118,0.12)' : '#070b14'}; display:flex; justify-content:space-between; align-items:center; border-radius:6px;">
                                <div>
                                    <b class="text-xs font-mono ${isSelected ? 'color-green' : 'color-cyan'}">${safeEscape(p.number)}</b>
                                    <div class="sub-label" style="font-size:9px; color:#94a3b8;">Регион: ${p.region || 77}</div>
                                </div>
                                ${isSelected ? '<i class="fa-solid fa-circle-check color-green" style="font-size:16px; color:var(--green);"></i>' : ''}
                            </div>
                        `;
                    });
                }
            } else if (type === 'business') {
                const bizArr = window.state?.businesses;
                const biz = Array.isArray(bizArr) ? bizArr.filter(b => b && b.level > 0) : [];
                if (biz.length === 0) {
                    html = '<div class="sub-label text-center py-4" style="font-size:10px; color:#64748b;">Нет купленных бизнесов</div>';
                    this.selectedItemIndex = null;
                } else {
                    biz.forEach((b, i) => {
                        this._currentModalItems.push(b);
                        const isSelected = this.selectedItemIndex === i;
                        html += `
                            <div onclick="AppM.selectP2PItemToSell(${i})" class="glass-card p-2 flex-between mb-1" style="cursor:pointer; border-color:${isSelected ? 'var(--green)' : 'rgba(255,255,255,0.08)'}; background:${isSelected ? 'rgba(0,230,118,0.12)' : '#070b14'}; display:flex; justify-content:space-between; align-items:center; border-radius:6px;">
                                <div>
                                    <b class="text-xs ${isSelected ? 'color-green' : 'color-cyan'}">${safeEscape(b.name)}</b>
                                    <div class="sub-label" style="font-size:9px; color:#94a3b8;">Уровень ${b.level}</div>
                                </div>
                                ${isSelected ? '<i class="fa-solid fa-circle-check color-green" style="font-size:16px; color:var(--green);"></i>' : ''}
                            </div>
                        `;
                    });
                }
            } else if (type === 'housing') {
                const houses = window.state?.player?.ownedHouses || [];
                if (houses.length === 0) {
                    html = '<div class="sub-label text-center py-4" style="font-size:10px; color:#64748b;">Нет недвижимости в собственности</div>';
                    this.selectedItemIndex = null;
                } else {
                    houses.forEach((hId, i) => {
                        this._currentModalItems.push(hId);
                        const isSelected = this.selectedItemIndex === i;
                        const houseObj = (window.HOUSING_LIST || []).find(h => h.id === hId);
                        const hName = houseObj ? houseObj.name : hId;
                        html += `
                            <div onclick="AppM.selectP2PItemToSell(${i})" class="glass-card p-2 flex-between mb-1" style="cursor:pointer; border-color:${isSelected ? 'var(--green)' : 'rgba(255,255,255,0.08)'}; background:${isSelected ? 'rgba(0,230,118,0.12)' : '#070b14'}; display:flex; justify-content:space-between; align-items:center; border-radius:6px;">
                                <div>
                                    <b class="text-xs ${isSelected ? 'color-green' : 'color-cyan'}">${safeEscape(hName)}</b>
                                    <div class="sub-label" style="font-size:9px; color:#94a3b8;">Жильё / Бокс</div>
                                </div>
                                ${isSelected ? '<i class="fa-solid fa-circle-check color-green" style="font-size:16px; color:var(--green);"></i>' : ''}
                            </div>
                        `;
                    });
                }
            }

            container.innerHTML = html;

            if (this.selectedItemIndex !== null && this._currentModalItems[this.selectedItemIndex]) {
                const currentItem = this._currentModalItems[this.selectedItemIndex];
                const priceInput = document.getElementById('p2pPriceInput');
                if (priceInput && (!priceInput.value || priceInput.value === '0')) {
                    if (type === 'cars') priceInput.value = currentItem.marketValue || currentItem.price || 150000;
                    else if (type === 'plates') priceInput.value = 150000;
                    else if (type === 'business') priceInput.value = 250000;
                    else if (type === 'housing') priceInput.value = 1500000;
                }
            }

        } catch (e) {
            console.error('[P2P Market] Error in selectP2PListingType:', e);
            const container = document.getElementById('p2pCardsListContainer');
            if (container) container.innerHTML = `<div class="sub-label color-red text-center py-2" style="font-size:10px;">Ошибка: ${e.message}</div>`;
        }
    };

    AppM.selectP2PItemToSell = function(index) {
        this.selectedItemIndex = index;
        this.selectP2PListingType(this.selectedListingType, false);

        const item = this._currentModalItems[index];
        const priceInput = document.getElementById('p2pPriceInput');
        
        if (priceInput && item) {
            if (this.selectedListingType === 'cars') priceInput.value = item.marketValue || item.price || 150000;
            else if (this.selectedListingType === 'plates') priceInput.value = 150000;
            else if (this.selectedListingType === 'business') priceInput.value = 250000;
            else if (this.selectedListingType === 'housing') priceInput.value = 1500000;
        }
        
        if (window.AudioFx) window.AudioFx.play('tick');
    };

    AppM.confirmCreateP2PListing = async function() {
        if (this._publishPending) return;
        this._publishPending = true;

        try {
            const priceInput = document.getElementById('p2pPriceInput');
            const rawVal = priceInput ? String(priceInput.value).replace(/\s+/g, '') : '0';
            const price = parseInt(rawVal, 10);
            const idx = this.selectedItemIndex;

            if (idx === null || idx === undefined || isNaN(price) || price <= 1000) {
                if (typeof showToast === 'function') showToast('Выберите объект и укажите корректную цену (>1000 ₽)');
                return;
            }

            const type = this.selectedListingType || 'cars';
            const myUid = String(window.state.player?.uid || window.tgUserId || 'me');
            const myName = window.state.player?.name || 'Перекуп';

            const targetItem = this._currentModalItems?.[idx];
            if (!targetItem) {
                if (typeof showToast === 'function') showToast('Ошибка: выбранный объект не найден');
                return;
            }

            const listingId = 'lot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

            let newListing = {
                id: listingId,
                lot_id: listingId,
                sellerId: myUid,
                sellerName: myName,
                sellerAvatar: window.state?.player?.avatarUrl || '🧔',
                type: type,
                price: price,
                status: 'active',
                itemData: {},
                createdAt: Date.now()
            };

            if (type === 'cars') {
                const car = targetItem;
                const carImg = resolveCarImage(car);
                newListing.name = car.name;
                newListing.img = carImg;
                newListing.fallback = car.fallback || '';
                newListing.itemData = Object.assign({}, car, { img: carImg });

                const gIdx = window.state.garage.indexOf(car);
                if (gIdx !== -1) {
                    window.state.garage.splice(gIdx, 1);
                }
                if (typeof renderGarage === 'function') renderGarage();
            } else if (type === 'plates') {
                const plateObj = targetItem;
                newListing.name = 'Номер ' + plateObj.number;
                newListing.itemData = { plate: plateObj.number, region: plateObj.region || 77 };
                if (window.PlatesManager && typeof window.PlatesManager.removePlate === 'function') {
                    window.PlatesManager.removePlate(plateObj.number, { silent: true });
                } else {
                    plateObj.status = 'on_sale';
                }
            } else if (type === 'business') {
                const biz = targetItem;
                newListing.name = biz.customName || biz.name;
                newListing.itemData = { bizId: biz.id, level: biz.level };
                biz.level = 0;
            } else if (type === 'housing') {
                const houseId = targetItem;
                const houseObj = (window.HOUSING_LIST || []).find(h => h.id === houseId);
                newListing.name = 'Объект ' + (houseObj ? houseObj.name : houseId);
                newListing.itemData = { houseId: houseId };
                window.state.player.ownedHouses = (window.state.player.ownedHouses || []).filter(x => x !== houseId);
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
                    }
                } catch (e) {
                    console.warn('[AppM] Firestore publishLot error:', e);
                }
            }

            if (typeof saveState === 'function') saveState();
            
            this.closeCreateListingModal();

            if (typeof showToast === 'function') showToast('✅ Лот успешно выставлен на биржу!');
            if (window.AudioFx) window.AudioFx.play('win');

            const area = document.getElementById('p2pLotsArea');
            if (area) area.innerHTML = this.renderP2PLotsHtml(this.marketFilter || 'cars');

        } finally {
            this._publishPending = false;
        }
    };

    console.log('[💱 phone-m-market v9.1.6] Прямой торг + переход в чат сделки готов ✓');
})();
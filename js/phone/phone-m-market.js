// ========================================================
// js/phone/phone-m-market.js — M+ HUB: БИРЖА (v9.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v9.0.0 (РАЗГРУЗКА phone-m.js на 3 файла):
//   - Часть 2 из 3: биржа, P2P-лоты, торг, выкуп, публикация
// ========================================================

(function() {
    'use strict';

    if (!window.AppM) {
        console.error('[💬 phone-m-market] AppM не загружен! Проверьте порядок скриптов: phone-m-core.js должен быть ДО phone-m-market.js');
        return;
    }

    const AppM = window.AppM;

    // ========================================================
    // БИРЖА
    // ========================================================
    AppM.renderMarketScreen = function(container) {
        if (!container) return;

        const f = this.marketFilter || 'cars';
        const pLvl = window.state.player?.level || 1;

        container.innerHTML = `
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.12), #090e18); border-color: rgba(0, 230, 118, 0.35);">
                <div>
                    <b class="text-xs color-green"><i class="fa-solid fa-globe"></i> Онлайн P2P Биржа</b>
                    <div class="sub-label" style="font-size:8.5px;">Авто · Номера · Бизнес · Жильё</div>
                </div>
                <button onclick="AppM.openCreateListingModal()" class="btn btn-green btn-auto btn-sm" style="font-size:9px; padding:4px 8px;">
                    + Выставить
                </button>
            </div>

            <div class="mplus-nav-scroll-bar mb-2">
                <button onclick="AppM.setMarketFilter('cars')" class="m-nav-pill ${f === 'cars' ? 'active' : ''}">
                    <i class="fa-solid fa-car"></i> Авто
                </button>
                <button onclick="AppM.setMarketFilter('plates')" class="m-nav-pill ${f === 'plates' ? 'active' : ''}">
                    <i class="fa-solid fa-id-card"></i> Номера ${pLvl < 3 ? '🔒' : ''}
                </button>
                <button onclick="AppM.setMarketFilter('business')" class="m-nav-pill ${f === 'business' ? 'active' : ''}">
                    <i class="fa-solid fa-briefcase"></i> Бизнес ${pLvl < 6 ? '🔒' : ''}
                </button>
                <button onclick="AppM.setMarketFilter('housing')" class="m-nav-pill ${f === 'housing' ? 'active' : ''}">
                    <i class="fa-solid fa-house"></i> Жильё ${pLvl < 4 ? '🔒' : ''}
                </button>
            </div>

            <div id="p2pLotsArea">
                ${this.renderP2PLotsHtml(f)}
            </div>
        `;
    };

    AppM.setMarketFilter = function(filter) {
        const pLvl = window.state.player?.level || 1;
        if (filter === 'plates' && pLvl < 3) return showToast('🔒 Категория с 3 уровня');
        if (filter === 'housing' && pLvl < 4) return showToast('🔒 Категория с 4 уровня');
        if (filter === 'business' && pLvl < 6) return showToast('🔒 Категория с 6 уровня');
        this.marketFilter = filter;
        if (typeof playSound === 'function') playSound('tick');
        const area = document.getElementById('p2pLotsArea');
        if (area) area.innerHTML = this.renderP2PLotsHtml(filter);
    };

    AppM.renderP2PLotsHtml = function(filter) {
        let lots = window.state.p2pMarketListings || [];

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

        if (deduped.length === 0) {
            return `
                <div class="glass-card text-center sub-label py-6" style="background:#090e18;">
                    <i class="fa-solid fa-box-open color-cyan mb-2" style="font-size:26px;"></i>
                    <div>Пока нет активных лотов</div>
                    <div class="text-xs mt-1" style="font-size:9px;">Нажмите «+ Выставить», чтобы продать своё</div>
                </div>
            `;
        }

        const filtered = deduped.filter(l => {
            if (filter === 'cars') return l.type === 'car' || l.type === 'cars';
            if (filter === 'plates') return l.type === 'plate' || l.type === 'plates';
            return l.type === filter;
        });

        if (filtered.length === 0) {
            return `<div class="glass-card text-center sub-label py-6" style="background:#090e18;">В этой категории лотов пока нет</div>`;
        }

        const myUid = String(window.state?.player?.uid || window.tgUserId || '');

        return filtered.map(item => {
            const isMine = String(item.sellerId) === myUid;
            const itemData = item.itemData || {};

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

                const carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
                const fallbackImg = item.fallback || itemData.fallback || ((typeof getCategoryFallback === 'function') ? getCategoryFallback(itemData.type || 'economy') : "assets/cars/economy/2101/vaz-2101.jpg");
                
                imgHtml = `<div class="car-img-wrap mb-2" style="height:110px;"><img src="${carImg}" class="car-img" onerror="this.onerror=null; this.src='${fallbackImg}';"></div>`;
                descText = `${itemData.power || 100} л.с. · Кузов ${itemData.condition || 85}%`;
            } else if (item.type === 'plates' || item.type === 'plate') {
                imgHtml = `<div class="p-3 mb-2 text-center" style="background:#050914; border-radius:10px; border:1px solid rgba(0, 242, 254, 0.3);">
                    <div class="license-plate" style="font-size:15px; padding:4px 10px; display:inline-flex;">${this._escapeHtml(itemData.plate || item.name)}</div>
                </div>`;
                descText = 'Архивный знак РФ';
            } else if (item.type === 'business') {
                imgHtml = `<div class="p-3 mb-2 text-center" style="background:#050914; border-radius:10px; border:1px solid rgba(0, 230, 118, 0.3);">
                    <b class="color-green">${this._escapeHtml(item.name)}</b>
                </div>`;
                descText = 'Готовый бизнес';
            } else if (item.type === 'housing') {
                imgHtml = `<div class="p-3 mb-2 text-center" style="background:#050914; border-radius:10px; border:1px solid rgba(255, 179, 0, 0.3);">
                    <b class="color-amber">${this._escapeHtml(item.name)}</b>
                </div>`;
                descText = 'Недвижимость / Бокс';
            }

            return `
                <div class="glass-card mb-2 p-2" style="border-left: 3px solid ${isMine ? 'var(--green)' : 'var(--cyan)'}; background:#090e18;">
                    ${imgHtml}
                    <div class="flex-between mb-1">
                        <div style="min-width:0; flex:1;">
                            <b class="text-xs color-cyan" style="font-size:12px;">${this._escapeHtml(item.name)}</b>
                            <div class="sub-label" style="font-size:8.5px;">${isMine ? 'Вы (Продавец)' : `Продавец: ${this._escapeHtml(item.sellerName || 'Игрок')}`}</div>
                        </div>
                        <span class="price-val text-xs color-green">${Number(item.price).toLocaleString()} ₽</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9.5px;">${descText}</div>

                    ${isMine ? `
                        <button onclick="AppM.cancelP2PListing('${item.id || item.lot_id}')" class="btn btn-red btn-sm w-full" style="font-size:10px;">
                            <i class="fa-solid fa-xmark mr-1"></i> Снять с продажи
                        </button>
                    ` : `
                        <div class="grid-2" style="gap:4px;">
                            <button onclick="AppM.startTradeWithSeller('${item.id || item.lot_id}')" class="btn btn-cyan btn-sm" style="font-size:10px;">
                                <i class="fa-solid fa-comments"></i> Торг
                            </button>
                            <button onclick="AppM.buyP2PInstantly('${item.id || item.lot_id}')" class="btn btn-green btn-sm" style="font-size:10px;">
                                <i class="fa-solid fa-bolt"></i> Выкупить
                            </button>
                        </div>
                    `}
                </div>
            `;
        }).join('');
    };

    /**
     * ⭐ v8.2.0: Автономный торг с продавцом
     */
    AppM.startTradeWithSeller = async function(lotId) {
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');

        const lot = await this._findLotById(lotId);
        if (!lot) return showToast('❌ Лот не найден');

        const myUid = String(window.state?.player?.uid || window.tgUserId || '');
        if (String(lot.sellerId) === myUid) {
            return showToast('Это ваш собственный лот');
        }

        if (window.P2PDeals && typeof window.P2PDeals.openDealChat === 'function') {
            const res = await window.P2PDeals.openDealChat(lotId);
            if (!res.success) showToast(`❌ ${res.error}`);
            return;
        }

        const dialogId = `dlg_p2p_${lot.id || lot.lot_id}_${lot.sellerId}`;
        if (!window.state.player) window.state.player = {};
        if (!window.state.player.phoneMessages) window.state.player.phoneMessages = [];

        let dialog = window.state.player.phoneMessages.find(m => m.id === dialogId);
        if (!dialog) {
            dialog = {
                id: dialogId,
                dialogId: dialogId,
                category: 'p2p',
                p2pLotId: lot.id || lot.lot_id,
                p2pRole: 'buyer',
                sellerId: lot.sellerId,
                sender: lot.sellerName || 'Продавец',
                askingPrice: lot.price,
                carData: lot.itemData || { name: lot.name, img: lot.img },
                unread: false,
                viewed: true,
                createdAt: Date.now(),
                chatHistory: [
                    { from: 'them', text: `Здравствуйте! Автомобиль «${lot.name}» продаётся за ${Number(lot.price).toLocaleString()} ₽. Предлагайте вашу цену!` }
                ]
            };
            window.state.player.phoneMessages.unshift(dialog);
            if (typeof saveState === 'function') saveState();
        }

        this.openDialog(dialogId);
    };

    /**
     * ⭐ v8.2.0: Автономный выкуп P2P лота
     */
    AppM.buyP2PInstantly = async function(lotId) {
        const lot = await this._findLotById(lotId);
        if (!lot) return showToast('❌ Лот не найден');

        const myUid = String(window.state?.player?.uid || window.tgUserId || '');
        if (String(lot.sellerId) === myUid) {
            return showToast('Нельзя выкупить собственный лот');
        }

        const price = Number(lot.price) || 0;
        const myCash = window.state?.player?.cash || 0;

        if (myCash < price) {
            return showToast(`Не хватает денег! Нужно ${price.toLocaleString()} ₽`);
        }

        if (window.P2PDeals && typeof window.P2PDeals.createDealDraft === 'function') {
            const res = await window.P2PDeals.createDealDraft(lotId, price);
            if (res.success) {
                this._openP2PDKPModal(res.dealId, res.deal);
                return;
            }
        }

        if (!confirm(`Вы действительно хотите выкупить «${lot.name}» за ${price.toLocaleString()} ₽?`)) return;

        if (lot.type === 'cars' || lot.type === 'car') {
            const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
            if ((window.state.garage?.length || 0) >= maxSlots) {
                return showToast('В гараже нет свободного места! Освободите бокс.');
            }
        }

        // ⭐ SPRINT 2: исправлена сигнатура buyLotAtomic
        const buyerProfile = { id: myUid, name: window.state?.player?.name || 'Перекуп' };

        if (window.FB_Bridge?.MarketLots?.buyLotAtomic) {
            try {
                const res = await window.FB_Bridge.MarketLots.buyLotAtomic(
                    lot.id || lot.lot_id,
                    buyerProfile,
                    myCash,
                    null,
                    null
                );
                if (!res || !res.success) {
                    return showToast(`❌ ${res?.error || 'Ошибка выкупа'}`);
                }
            } catch (e) {
                console.warn('[AppM] buyLotAtomic warning:', e);
            }
        } else {
            // Fallback на локальное списание
            if (window.MoneyManager) {
                window.MoneyManager.spend(price, `Выкуп P2P: ${lot.name}`);
            } else {
                window.state.player.cash -= price;
            }
        }

        // Локальное зачисление имущества
        if (lot.type === 'cars' || lot.type === 'car') {
            const boughtCar = Object.assign({}, lot.itemData || {});
            if (!boughtCar.name) boughtCar.name = lot.name;
            if (!boughtCar.img) boughtCar.img = lot.img;
            boughtCar.purchaseCost = price;
            if (!window.state.garage) window.state.garage = [];
            window.state.garage.push(boughtCar);
            if (typeof renderGarage === 'function') renderGarage();
        } else if (lot.type === 'plates' || lot.type === 'plate') {
            if (window.PlatesManager && typeof window.PlatesManager.addPlate === 'function') {
                window.PlatesManager.addPlate(lot.itemData?.plate || lot.name, 'p2p');
            }
        } else if (lot.type === 'housing') {
            if (!window.state.player.ownedHouses) window.state.player.ownedHouses = [];
            const hId = lot.itemData?.houseId || lot.name;
            if (!window.state.player.ownedHouses.includes(hId)) {
                window.state.player.ownedHouses.push(hId);
            }
        }

        window.state.p2pMarketListings = (window.state.p2pMarketListings || []).filter(l =>
            l && l.id !== lotId && l.lot_id !== lotId
        );

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`🎉 Вы успешно приобрели «${lot.name}»!`);

        this._refreshCurrentScreen();
    };

    AppM.cancelP2PListing = async function(lotId) {
        if (!confirm('Снять лот с продажи?')) return;
        const lot = (window.state.p2pMarketListings || []).find(l => l && (l.id === lotId || l.lot_id === lotId));
        if (!lot) return;

        if (window.FB_Bridge?.MarketLots?.cancelLot) {
            try {
                await window.FB_Bridge.MarketLots.cancelLot(lot.id || lotId, window.state.player?.uid);
            } catch (e) {}
        }

        window.state.p2pMarketListings = (window.state.p2pMarketListings || []).filter(l =>
            l && l.id !== lotId && l.lot_id !== lotId
        );

        if (lot.type === 'plates' || lot.type === 'plate') {
            const plateNum = lot.itemData?.plate;
            const pObj = (window.state.player?.platesInventory || []).find(p => p && p.number === plateNum);
            if (pObj) pObj.status = 'inventory';
        }

        if (typeof saveState === 'function') saveState();
        if (typeof showToast === 'function') showToast('Лот снят');
        this._refreshCurrentScreen();
    };

    // ========================================================
    // СОЗДАНИЕ ЛОТА (модалка)
    // ========================================================
    AppM.openCreateListingModal = function() {
        this.selectP2PListingType('cars');
        if (typeof ModalManager !== 'undefined') ModalManager.open('modalCreateP2P');
    };

    AppM.selectP2PListingType = function(type) {
        this.selectedListingType = type;
        this.selectedItemIndex = null;

        const elMap = { cars: 'btnP2PTypeCar', plates: 'btnP2PTypePlate', business: 'btnP2PTypeBiz', housing: 'btnP2PTypeHouse' };
        ['cars', 'plates', 'business', 'housing'].forEach(t => {
            const btn = document.getElementById(elMap[t]);
            if (btn) btn.className = t === type ? 'btn btn-cyan btn-sm' : 'btn btn-dark btn-sm';
        });

        this.renderP2PCardsList(type);
    };

    AppM.renderP2PCardsList = function(type) {
        const container = document.getElementById('p2pCardsListContainer');
        if (!container) return;

        let html = '';
        let items = [];

        if (type === 'cars') {
            items = (window.state.garage || []).filter(c => c && typeof c === 'object');
        } else if (type === 'plates') {
            items = (window.state.player?.platesInventory || []).filter(p => p && p.status === 'inventory' && !p.installedCarId);
        } else if (type === 'business') {
            items = (window.state.businesses || []).filter(b => b && b.level > 0);
        } else if (type === 'housing') {
            items = (window.state.player?.ownedHouses || []).map(id => ({ id, name: id }));
        }

        this._currentModalItems = items;

        if (items.length === 0) {
            container.innerHTML = `<div class="glass-card p-3 text-center sub-label" style="background:#050914;">Нет объектов для продажи</div>`;
            return;
        }

        items.forEach((item, idx) => {
            if (type === 'cars') {
                const rawImg = item.img || "assets/cars/economy/2101/vaz-2101.jpg";
                const carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
                const fallbackImg = item.fallback || ((typeof getCategoryFallback === 'function') ? getCategoryFallback(item.type || 'economy') : "assets/cars/economy/2101/vaz-2101.jpg");
                html += `
                    <div onclick="AppM.pickP2PItemCard(${idx})" id="p2pCardItem_${idx}" 
                         class="glass-card p-2 cursor-pointer flex-gap" 
                         style="align-items:center; background:#050914; border:1.5px solid rgba(255,255,255,0.08); border-radius:10px;">
                        <img src="${carImg}" style="width:64px; height:44px; object-fit:cover; border-radius:6px;" 
                             onerror="this.onerror=null; this.src='${fallbackImg}';">
                        <div style="flex:1; min-width:0;">
                            <b class="text-xs color-cyan">${this._escapeHtml(item.name)}</b>
                            <div class="sub-label" style="font-size:8.5px;">${item.power || 100} л.с. · ${item.condition || 85}%</div>
                        </div>
                    </div>
                `;
            } else if (type === 'plates') {
                html += `
                    <div onclick="AppM.pickP2PItemCard(${idx})" id="p2pCardItem_${idx}" 
                         class="glass-card p-2 cursor-pointer flex-between" 
                         style="background:#050914; border:1.5px solid rgba(255,255,255,0.08); border-radius:10px;">
                        <div>
                            <span class="license-plate" style="font-size:12px;">${this._escapeHtml(item.number)}</span>
                            <div class="sub-label" style="font-size:8.5px;">Регион ${item.region || 77}</div>
                        </div>
                        <i class="fa-solid fa-circle-check" style="opacity:0;"></i>
                    </div>
                `;
            } else {
                html += `
                    <div onclick="AppM.pickP2PItemCard(${idx})" id="p2pCardItem_${idx}" 
                         class="glass-card p-2 cursor-pointer" 
                         style="background:#050914; border:1.5px solid rgba(255,255,255,0.08); border-radius:10px;">
                        <b class="text-xs color-cyan">${this._escapeHtml(item.name || item.customName || item.id)}</b>
                    </div>
                `;
            }
        });

        container.innerHTML = html;
        if (items.length > 0) this.pickP2PItemCard(0);
    };

    AppM.pickP2PItemCard = function(idx) {
        this.selectedItemIndex = idx;
        document.querySelectorAll('[id^="p2pCardItem_"]').forEach(c => {
            c.style.border = '1.5px solid rgba(255,255,255,0.08)';
        });
        const card = document.getElementById(`p2pCardItem_${idx}`);
        if (card) card.style.border = '1.5px solid var(--cyan)';

        const type = this.selectedListingType;
        const priceInput = document.getElementById('p2pPriceInput');
        if (!priceInput) return;

        const currentItem = this._currentModalItems?.[idx];

        if (type === 'cars') {
            if (currentItem) priceInput.value = Math.round((currentItem.marketValue || currentItem.basePrice || 150000) * 1.1);
        } else if (type === 'plates') priceInput.value = 500000;
        else if (type === 'business') priceInput.value = 250000;
        else if (type === 'housing') priceInput.value = 1500000;
    };

    AppM.confirmCreateP2PListing = async function() {
        if (this._publishPending) return;
        this._publishPending = true;

        try {
            const priceInput = document.getElementById('p2pPriceInput');
            const price = parseInt(priceInput?.value, 10);
            const idx = this.selectedItemIndex;

            if (idx === null || isNaN(price) || price <= 1000) {
                return showToast('Укажите корректную цену');
            }

            const type = this.selectedListingType;
            const myUid = String(window.state.player?.uid || window.tgUserId || 'me');
            const myName = window.state.player?.name || 'Перекуп';

            const targetItem = this._currentModalItems?.[idx];
            if (!targetItem) {
                return showToast('Ошибка: выбранный объект не найден');
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

            if (window.FB_Bridge?.MarketLots?.publishLot) {
                try {
                    const res = await window.FB_Bridge.MarketLots.publishLot(newListing, { id: myUid, name: myName });
                    if (res && res.lotId) {
                        newListing.id = res.lotId;
                        newListing.lot_id = res.lotId;
                    }
                } catch (e) {
                    console.warn('[AppM] Firestore publishLot error:', e);
                }
            }

            if (!window.state.p2pMarketListings) window.state.p2pMarketListings = [];
            window.state.p2pMarketListings.unshift(newListing);

            if (typeof saveState === 'function') saveState();
            if (typeof ModalManager !== 'undefined') ModalManager.close('modalCreateP2P');
            showToast('✅ Лот выставлен');
            if (typeof playSound === 'function') playSound('win');
            this._refreshCurrentScreen();
        } finally {
            this._publishPending = false;
        }
    };

    console.log('[💱 phone-m-market v9.0.0] Биржа P2P + торг + выкуп + публикация ✓');
})();
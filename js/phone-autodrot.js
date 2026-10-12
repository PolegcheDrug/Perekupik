// ========================================================
// js/phone-autodrot.js — ОНЛАЙН P2P МАРКЕТПЛЕЙС И QUICK-CHAT (v0.8.5)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Полноценный онлайн через Cloud Firestore:
// P2P биржа (авто, номера, бизнес, жильё), безопасный торг шаблонами,
// чёрный рынок госномеров, срочный перехват и отзывы.
// ========================================================

const AppAutodrot = {
    subTab: 'market', // 'market', 'blackmarket', 'hotdeals', 'reputation'
    p2pFilter: 'cars', // 'cars', 'plates', 'business', 'housing'
    activeChatLot: null,
    activeChatDialogId: null,
    chatPollInterval: null,
    selectedListingType: 'cars',

    render(container) {
        if (!container) return;
        let sub = this.subTab;
        if (!state.player) state.player = {};
        if (!state.player.p2pReputation) {
            state.player.p2pReputation = { rating: 5.0, reviewsCount: 0, badReviews: 0, reviewsLog: [] };
        }

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-bolt color-cyan mr-1"></i> Autodrot Marketplace</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <!-- ВЕРХНЕЕ МЕНЮ РАЗДЕЛОВ АВТОДРОТА -->
                <div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 3px;">
                    <button onclick="AppAutodrot.switchTab('market')" class="btn ${sub === 'market' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9px;">
                        <i class="fa-solid fa-handshake"></i> Биржа
                    </button>
                    <button onclick="AppAutodrot.switchTab('blackmarket')" class="btn ${sub === 'blackmarket' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9px;">
                        <i class="fa-solid fa-gem"></i> Номера
                    </button>
                    <button onclick="AppAutodrot.switchTab('hotdeals')" class="btn ${sub === 'hotdeals' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9px;">
                        <i class="fa-solid fa-fire"></i> Выкуп
                    </button>
                    <button onclick="AppAutodrot.switchTab('reputation')" class="btn ${sub === 'reputation' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9px;">
                        <i class="fa-solid fa-star"></i> Отзывы
                    </button>
                </div>

                <div id="autodrotScreenContent"></div>
            </div>
        `;
        this.renderSubScreen();
    },

    switchTab(tab) {
        if (this.chatPollInterval) {
            clearInterval(this.chatPollInterval);
            this.chatPollInterval = null;
        }
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.subTab = tab;
        this.render(document.getElementById('phoneAppContainer'));
    },

    setFilter(filter) {
        this.p2pFilter = filter;
        if (typeof playSound === 'function') playSound('tick');
        this.renderSubScreen();
    },

    renderSubScreen() {
        const content = document.getElementById('autodrotScreenContent');
        if (!content) return;

        // 1. ОНЛАЙН P2P БИРЖА
        if (this.subTab === 'market') {
            let f = this.p2pFilter || 'cars';
            content.innerHTML = `
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs color-green"><i class="fa-solid fa-globe"></i> Облачная P2P Биржа (Firestore)</b>
                            <div class="sub-label" style="font-size:9.5px;">Лоты реальных игроков с живым чатом и быстрым торгом</div>
                        </div>
                        <button onclick="AppAutodrot.openCreateListingModal()" class="btn btn-green btn-auto btn-sm" style="font-size:9.5px;">+ Продать лот</button>
                    </div>
                </div>

                <!-- ФИЛЬТРЫ КАТЕГОРИЙ ЛОТОВ -->
                <div class="grid-4 mb-2">
                    <button onclick="AppAutodrot.setFilter('cars')" class="btn ${f === 'cars' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">🚗 Авто</button>
                    <button onclick="AppAutodrot.setFilter('plates')" class="btn ${f === 'plates' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">🏷 Номера</button>
                    <button onclick="AppAutodrot.setFilter('business')" class="btn ${f === 'business' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">💼 Бизнес</button>
                    <button onclick="AppAutodrot.setFilter('housing')" class="btn ${f === 'housing' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">🏠 Жильё</button>
                </div>

                <div id="p2pItemsList">
                    <div class="sub-label text-center py-4"><i class="fa-solid fa-spinner fa-spin color-cyan"></i> Синхронизация с облаком...</div>
                </div>
            `;
            this.renderP2PListingsFiltered();

        // 2. БАЗАР БЛАТНЫХ НОМЕРОВ
        } else if (this.subTab === 'blackmarket') {
            content.innerHTML = `
                <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(192,132,252,0.18), #090e18); border-color:var(--purple);">
                    <div>
                        <b class="text-xs color-purple"><i class="fa-solid fa-gem"></i> Эксклюзивный Базар Госномеров</b>
                        <div class="sub-label" style="font-size:9.5px;">Спецсерии АМР, ЕКХ, три топора и зеркалки РФ</div>
                    </div>
                    <button onclick="AppAutodrot.refreshNumbersMarket()" class="btn btn-purple btn-auto btn-sm" style="font-size:9px;">Связь (35k)</button>
                </div>
                <div id="autodrotBlackMarketPlatesList"></div>
            `;
            this.renderBlackMarketNumbersList();

        // 3. СРОЧНЫЙ ВЫКУП
        } else if (this.subTab === 'hotdeals') {
            content.innerHTML = `
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber"><i class="fa-solid fa-fire"></i> Срочный выкуп с рук (-35%)</b>
                        <span class="tag-badge bg-tag-amber">ГОРЯЩИЙ ЛОТ</span>
                    </div>
                    <p class="sub-label mb-2" style="font-size:9.5px;">Владельцам срочно нужны наличные! Перехватите автомобиль по низу рынка до того, как его заберут другие дельцы.</p>
                </div>
                <div id="autodrotHotDealsContainer"></div>
            `;
            this.renderHotDealsContainer();

        // 4. РЕПУТАЦИЯ И ОТЗЫВЫ
        } else if (this.subTab === 'reputation') {
            this.renderReputationScreen(content);
        }
    },

    // --------------------------------------------------------
    // ЗАГРУЗКА И ОТРИСОВКА P2P ЛОТОВ
    // --------------------------------------------------------
    async renderP2PListingsFiltered() {
        const list = document.getElementById('p2pItemsList');
        if (!list) return;

        const myProfile = window.FB_Bridge ? window.FB_Bridge.getProfile() : { id: "local", name: "Перекуп" };
        let filter = this.p2pFilter || 'cars';
        let lots = [];

        // 1. Получение лотов из Firestore
        if (window.FB_Bridge && window.FB_Bridge.P2P) {
            try {
                lots = await Promise.race([
                    window.FB_Bridge.P2P.fetchLots(),
                    new Promise(resolve => setTimeout(() => resolve(null), 2500))
                ]);
            } catch(e) {}
        }

        // 2. Фолбек на локальные данные
        if (!lots || lots.length === 0) {
            if (state.p2pMarketListings && state.p2pMarketListings.length > 0) {
                lots = state.p2pMarketListings;
            } else {
                lots = [
                    { 
                        id: "demo_1", sellerId: "bot_1", sellerName: "Maga_GTI", type: "cars", name: "VW Golf VI GTI (Stage 2)",
                        price: 1850000, itemData: { plate: "О777ОО 77", power: 260, condition: 85, img: "assets/cars/comfort/golf6/golf6.jpg" }
                    },
                    { 
                        id: "demo_2", sellerId: "bot_2", sellerName: "Major_Vova", type: "plates", name: "Госномер А777АА 77", 
                        price: 1500000, itemData: { plate: "А777АА 77" } 
                    },
                    { 
                        id: "demo_3", sellerId: "bot_3", sellerName: "Serega_Drift", type: "cars", name: "ВАЗ-2101 (Корч)",
                        price: 250000, itemData: { plate: "В123ВВ 77", power: 85, condition: 60, img: "assets/cars/economy/2101/vaz-2101_1.jpg" }
                    },
                    { 
                        id: "demo_4", sellerId: "bot_4", sellerName: "Oligarch_Vova", type: "business", name: "Автомойка 24/7 (Ур. 3)",
                        price: 320000, itemData: { bizId: "wash", bizLevel: 3, desc: "Готовая точка с доходностью 2,700 ₽/д." }
                    }
                ];
                state.p2pMarketListings = lots;
            }
        }

        let filtered = lots.filter(item => {
            if (filter === 'cars') return item.type === 'car' || item.type === 'cars';
            if (filter === 'plates') return item.type === 'plate' || item.type === 'plates';
            return item.type === filter;
        });

        if (filtered.length === 0) {
            list.innerHTML = "<div class='glass-card text-center sub-label py-6'>В этой категории биржи пока нет активных предложений.</div>";
            return;
        }

        let html = "";
        filtered.forEach((item) => {
            const isMy = String(item.sellerId) === String(myProfile.id) || (state.myP2PListings && state.myP2PListings.includes(item.id));
            const itemData = item.itemData || {};

            let actionButtons = "";
            if (isMy) {
                actionButtons = `<button onclick="AppAutodrot.cancelP2PListing('${item.id}')" class="btn btn-danger btn-auto btn-sm">Снять с продажи</button>`;
            } else {
                actionButtons = `
                    <div class="grid-2" style="gap:4px;">
                        <button onclick="AppAutodrot.openQuickChatModalById('${item.id}')" class="btn btn-dark btn-sm btn-auto" style="padding:4px 8px; font-size:9.5px;">
                            💬 Чат / Торг
                        </button>
                        <button onclick="AppAutodrot.buyP2PLot('${item.id}')" class="btn btn-green btn-sm btn-auto" style="padding:4px 10px; font-size:9.5px;">
                            Купить (${item.price.toLocaleString()} ₽)
                        </button>
                    </div>
                `;
            }

            if (item.type === 'car' || item.type === 'cars') {
                let carImg = itemData.img || item.img || "assets/cars/economy/2101/vaz-2101.jpg";
                let plateStr = itemData.plate || item.plate || "ТРАНЗИТ";
                let powerVal = itemData.power || item.power || 100;
                let condVal = itemData.condition || 85;

                html += `
                <div class='glass-card mb-2 p-2' style="border-left: 3px solid var(--cyan);">
                    <div class='flex-between mb-1'>
                        <div class='flex-gap' style='align-items:center;'>
                            <div class='chat-avatar-circle' style='width:28px; height:28px; font-size:14px;'>👤</div>
                            <div>
                                <b class='text-xs color-cyan'>${item.sellerName || item.seller || 'Перекуп'}</b>
                                <div class='sub-label' style='font-size:8.5px;'>${isMy ? 'Ваш лот' : 'Онлайн-продавец'}</div>
                            </div>
                        </div>
                        <span class='tag-badge bg-tag-cyan'>АВТО P2P</span>
                    </div>

                    <div class='deal-car-preview-card mb-2'>
                        <img src='${carImg}' class='deal-car-thumb' onerror="this.src='assets/cars/economy/2101/vaz-2101.jpg'">
                        <div style='flex:1; min-width:0;'>
                            <div class='font-bold text-xs'>${item.name}</div>
                            <div class='license-plate text-xs' style='padding:1px 4px; margin:3px 0;'>${plateStr}</div>
                            <div class='price-val text-xs color-green'>${item.price.toLocaleString()} ₽</div>
                        </div>
                    </div>

                    <div class='flex-between'>
                        <div class='sub-label text-xs'>
                            ${powerVal} л.с. • Кузов: <b class="color-green">${condVal}%</b>
                        </div>
                        ${actionButtons}
                    </div>
                </div>`;
            } else if (item.type === 'plate' || item.type === 'plates') {
                let plateStr = itemData.plate || item.plate || item.name;
                html += `
                <div class='glass-card p-2 flex-between mb-2' style="border-left: 3px solid var(--purple);">
                    <div>
                        <div class='license-plate mb-1' style='font-size:13px;'>${plateStr} <div class='license-flag'>RUS</div></div>
                        <div class='sub-label text-xs'>Продавец: <b class='color-cyan'>${item.sellerName || 'Перекуп'}</b></div>
                    </div>
                    <div class='text-right'>
                        <div class='price-val text-xs color-green mb-1'>${item.price.toLocaleString()} ₽</div>
                        ${actionButtons}
                    </div>
                </div>`;
            } else if (item.type === 'business') {
                html += `
                <div class='glass-card p-2 flex-between mb-2' style="border-left: 3px solid var(--green);">
                    <div>
                        <b class='text-xs color-green'><i class='fa-solid fa-briefcase'></i> ${item.name}</b>
                        <div class='sub-label' style='font-size:9.5px;'>Продавец: <b>${item.sellerName || 'Перекуп'}</b> | ${itemData.desc || ''}</div>
                    </div>
                    <div class='text-right'>
                        <div class='price-val text-xs color-green mb-1'>${item.price.toLocaleString()} ₽</div>
                        ${actionButtons}
                    </div>
                </div>`;
            } else if (item.type === 'housing') {
                html += `
                <div class='glass-card p-2 flex-between mb-2' style="border-left: 3px solid var(--amber);">
                    <div>
                        <b class='text-xs color-amber'><i class='fa-solid fa-warehouse'></i> ${item.name}</b>
                        <div class='sub-label' style='font-size:9.5px;'>Продавец: <b>${item.sellerName || 'Перекуп'}</b> | ${itemData.desc || ''}</div>
                    </div>
                    <div class='text-right'>
                        <div class='price-val text-xs color-green mb-1'>${item.price.toLocaleString()} ₽</div>
                        ${actionButtons}
                    </div>
                </div>`;
            }
        });

        list.innerHTML = html;
    },

    // --------------------------------------------------------
    // АТОМАРНАЯ ПОКУПКА ЛОТА
    // --------------------------------------------------------
    async buyP2PLot(listingId) {
        const myProfile = window.FB_Bridge ? window.FB_Bridge.getProfile() : { id: "local", name: "Перекуп" };
        let cash = state.player?.cash || 0;

        let lot = (state.p2pMarketListings || []).find(l => l.id === listingId);

        if (window.FB_Bridge && window.FB_Bridge.P2P) {
            showToast("⏳ Оформление сделки на бирже...");
            const res = await window.FB_Bridge.P2P.buyLotAtomic(listingId, myProfile, cash);

            if (res && res.success) {
                lot = res.lot;
            } else if (res && !res.success) {
                if (typeof playSound === 'function') playSound('error');
                return showToast(`❌ Ошибка: ${res.error}`);
            }
        }

        if (!lot) return showToast("Лот не найден или уже снят с продажи!");
        if (cash < lot.price) return showToast("Недостаточно денег на балансе!");

        state.player.cash -= lot.price;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`P2P Покупка: ${lot.name}`, lot.price, false);
        }

        const itemData = lot.itemData || {};
        if (lot.type === 'car' || lot.type === 'cars') {
            let carObj = Object.assign({}, itemData, {
                id: "car_p2p_" + Date.now(),
                name: lot.name,
                price: lot.price,
                purchaseCost: lot.price,
                isRegisteredOnPlayer: false,
                ownershipDays: 0
            });
            if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(carObj);
            if (!state.garage) state.garage = [];
            state.garage.push(carObj);
        } else if (lot.type === 'plate' || lot.type === 'plates') {
            if (!state.ownedPlates) state.ownedPlates = [];
            state.ownedPlates.push(itemData.plate || lot.name);
        } else if (lot.type === 'business') {
            let targetBiz = (state.businesses || []).find(b => b.id === (itemData.bizId || lot.name));
            if (targetBiz) {
                targetBiz.level = Math.max(targetBiz.level || 0, itemData.bizLevel || 1);
                targetBiz.stock = 100;
            }
        } else if (lot.type === 'housing') {
            let hId = itemData.houseId || lot.name;
            if (!state.player.ownedHouses) state.player.ownedHouses = [];
            if (!state.player.ownedHouses.includes(hId)) state.player.ownedHouses.push(hId);
            state.player.housingId = hId;
            state.player.housingType = 'own';
        }

        if (state.p2pMarketListings) {
            state.p2pMarketListings = state.p2pMarketListings.filter(l => l.id !== listingId);
        }

        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        
        if (typeof openVerdictModal === 'function') {
            openVerdictModal("СДЕЛКА P2P ЗАКРЫТА! 🤝", `Вы успешно выкупили «${lot.name}» у игрока ${lot.sellerName || 'Продавца'} за ${lot.price.toLocaleString()} ₽!`, true, lot.price);
        }
        this.renderSubScreen();
    },

    async cancelP2PListing(listingId) {
        const myProfile = window.FB_Bridge ? window.FB_Bridge.getProfile() : { id: "local", name: "Перекуп" };
        if (window.FB_Bridge && window.FB_Bridge.P2P) {
            await window.FB_Bridge.P2P.cancelLot(listingId, myProfile.id);
        }
        if (state.myP2PListings) state.myP2PListings = state.myP2PListings.filter(id => id !== listingId);
        if (state.p2pMarketListings) state.p2pMarketListings = state.p2pMarketListings.filter(l => l.id !== listingId);
        saveState();
        showToast("Лот успешно удален с онлайн-биржи.");
        this.renderSubScreen();
    },

    openQuickChatModalById(lotId) {
        let lot = (state.p2pMarketListings || []).find(l => l.id === lotId);
        if (lot) this.openQuickChatModal(lot);
    },

    openQuickChatModal(lot) {
        if (!lot) return;
        this.activeChatLot = lot;
        const myProfile = window.FB_Bridge ? window.FB_Bridge.getProfile() : { id: "me", name: "Перекуп" };
        const sellerId = lot.sellerId || "seller";
        const dialogId = (window.FB_Bridge && window.FB_Bridge.QuickChat)
            ? window.FB_Bridge.QuickChat.makeDialogId(myProfile.id, sellerId, lot.id)
            : `dlg_${lot.id}`;
        this.activeChatDialogId = dialogId;

        setTxt('p2pChatSellerTitle', `${lot.sellerName || 'Продавец'}`);
        setTxt('p2pChatLotSubtitle', `Лот: ${lot.name} (${lot.price.toLocaleString()} ₽)`);

        const buyBtn = document.getElementById('p2pChatBuyBtn');
        if (buyBtn) {
            buyBtn.onclick = () => {
                closeModal('modalP2PChat');
                AppAutodrot.buyP2PLot(lot.id);
            };
        }

        const chipsBox = document.getElementById('p2pCannedChipsBox');
        if (chipsBox && window.FB_Bridge && window.FB_Bridge.QuickChat) {
            const phrases = window.FB_Bridge.QuickChat.getPhrasesList();
            chipsBox.innerHTML = phrases.map(p => `
                <button onclick="AppAutodrot.sendQuickPhrase('${p.id}')" class="btn btn-dark btn-sm" style="font-size:9px; padding:4px 7px; border-radius:14px; text-transform:none;">
                    ${p.text}
                </button>
            `).join('');
        }

        this.refreshChatMessages();

        if (this.chatPollInterval) clearInterval(this.chatPollInterval);
        this.chatPollInterval = setInterval(() => {
            this.refreshChatMessages();
        }, 4000);

        ModalManager.open('modalP2PChat');
        if (typeof playSound === 'function') playSound('tick');
    },

    async refreshChatMessages() {
        if (!this.activeChatDialogId) return;
        const msgBox = document.getElementById('p2pChatMessagesBox');
        if (!msgBox) return;

        const myProfile = window.FB_Bridge ? window.FB_Bridge.getProfile() : { id: "me", name: "Перекуп" };
        let msgs = [];
        if (window.FB_Bridge && window.FB_Bridge.QuickChat) {
            msgs = await window.FB_Bridge.QuickChat.fetchDialogMessages(this.activeChatDialogId);
        }

        if (!msgs || msgs.length === 0) {
            msgBox.innerHTML = `<div class="sub-label text-center py-4">Начните торг с продавцом, выбрав заготовленную реплику ниже.</div>`;
            return;
        }

        msgBox.innerHTML = msgs.map(m => {
            const isMine = String(m.senderId) === String(myProfile.id);
            return `
                <div class="chat-msg ${isMine ? 'msg-player' : 'msg-seller'}" style="margin-bottom:5px;">
                    <div style="font-size:9px; opacity:0.7; margin-bottom:2px;"><b>${m.senderName}</b></div>
                    <div>${m.text}</div>
                </div>
            `;
        }).join('');

        msgBox.scrollTop = msgBox.scrollHeight;
    },

    async sendQuickPhrase(phraseId) {
        if (!this.activeChatDialogId || !this.activeChatLot) return;
        const myProfile = window.FB_Bridge ? window.FB_Bridge.getProfile() : { id: "me", name: "Перекуп" };

        if (window.FB_Bridge && window.FB_Bridge.QuickChat) {
            await window.FB_Bridge.QuickChat.sendPhrase(
                this.activeChatDialogId,
                phraseId,
                myProfile,
                this.activeChatLot.name
            );
        }

        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        await this.refreshChatMessages();
    },

    // --------------------------------------------------------
    // МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ЛОТА
    // --------------------------------------------------------
    openCreateListingModal() {
        this.selectP2PListingType('cars');
        ModalManager.open('modalCreateP2P');
    },

    selectP2PListingType(type) {
        this.selectedListingType = type;
        ['cars', 'plates', 'business', 'housing'].forEach(t => {
            const btn = document.getElementById('btnP2PType' + (t === 'cars' ? 'Car' : (t === 'plates' ? 'Plate' : (t === 'business' ? 'Biz' : 'House'))));
            if (btn) btn.className = (t === type) ? 'btn btn-cyan btn-sm' : 'btn btn-dark btn-sm';
        });

        const select = document.getElementById('p2pItemSelect');
        if (!select) return;

        let options = "";
        if (type === 'cars') {
            const garage = state.garage || [];
            if (garage.length === 0) options = "<option value='-1'>В гараже нет машин</option>";
            else garage.forEach((c, i) => options += `<option value="${i}">${c.name} (${c.power || 100} л.с. | ${c.plate || 'ТРАНЗИТ'})</option>`);
        } else if (type === 'plates') {
            const plates = state.ownedPlates || [];
            if (plates.length === 0) options = "<option value='-1'>Нет номеров в инвентаре</option>";
            else plates.forEach((p, i) => options += `<option value="${i}">Госномер ${p}</option>`);
        } else if (type === 'business') {
            const biz = (state.businesses || []).filter(b => b.level > 0);
            if (biz.length === 0) options = "<option value='-1'>Нет купленных предприятий</option>";
            else biz.forEach((b, i) => options += `<option value="${i}">${b.name} (Ур. ${b.level})</option>`);
        } else if (type === 'housing') {
            const houses = state.player?.ownedHouses || [];
            if (houses.length === 0) options = "<option value='-1'>Нет недвижимости в собственности</option>";
            else houses.forEach((hId, i) => options += `<option value="${i}">Объект: ${hId}</option>`);
        }

        select.innerHTML = options;
        this.onP2PItemSelected(select.value);
    },

    onP2PItemSelected(val) {
        const priceInput = document.getElementById('p2pPriceInput');
        if (!priceInput) return;
        const idx = parseInt(val, 10);
        if (isNaN(idx) || idx < 0) return;

        if (this.selectedListingType === 'cars') {
            const c = state.garage?.[idx];
            if (c) priceInput.value = c.marketValue || c.basePrice || 100000;
        } else if (this.selectedListingType === 'plates') {
            priceInput.value = 150000;
        } else if (this.selectedListingType === 'business') {
            priceInput.value = 250000;
        } else if (this.selectedListingType === 'housing') {
            priceInput.value = 1500000;
        }
    },

    async confirmCreateP2PListing() {
        const select = document.getElementById('p2pItemSelect');
        const priceInput = document.getElementById('p2pPriceInput');
        const idx = parseInt(select?.value, 10);
        const price = parseInt(priceInput?.value, 10);

        if (isNaN(idx) || idx < 0) return showToast("Выберите предмет для выставления!");
        if (isNaN(price) || price < 1000) return showToast("Укажите корректную цену (от 1,000 ₽)!");

        const myProfile = window.FB_Bridge ? window.FB_Bridge.getProfile() : { id: "local", name: "Перекуп" };
        let lotData = null;

        if (this.selectedListingType === 'cars') {
            const car = state.garage.splice(idx, 1)[0];
            lotData = {
                type: 'cars',
                name: car.name,
                price: price,
                itemData: car
            };
        } else if (this.selectedListingType === 'plates') {
            const plate = state.ownedPlates.splice(idx, 1)[0];
            lotData = {
                type: 'plates',
                name: `Госномер ${plate}`,
                price: price,
                itemData: { plate }
            };
        } else if (this.selectedListingType === 'business') {
            const biz = (state.businesses || []).filter(b => b.level > 0)[idx];
            lotData = {
                type: 'business',
                name: `${biz.name} (Ур. ${biz.level})`,
                price: price,
                itemData: { bizId: biz.id, bizLevel: biz.level }
            };
            biz.level = 0;
        } else if (this.selectedListingType === 'housing') {
            const hId = (state.player.ownedHouses || [])[idx];
            state.player.ownedHouses = state.player.ownedHouses.filter(id => id !== hId);
            lotData = {
                type: 'housing',
                name: `Недвижимость ${hId}`,
                price: price,
                itemData: { houseId: hId }
            };
        }

        let newLotId = "p2p_" + Date.now();
        if (window.FB_Bridge && window.FB_Bridge.P2P) {
            showToast("Публикация лота...");
            const res = await window.FB_Bridge.P2P.publishLot(lotData, myProfile);
            if (res && res.success) {
                newLotId = res.lotId;
            }
        }

        if (!state.myP2PListings) state.myP2PListings = [];
        state.myP2PListings.push(newLotId);

        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        state.p2pMarketListings.unshift({
            id: newLotId,
            sellerId: String(myProfile.id),
            sellerName: myProfile.name,
            ...lotData
        });

        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        closeModal('modalCreateP2P');
        showToast("✓ Лот успешно выставлен на онлайн-биржу!");
        this.renderSubScreen();
    },

    // --------------------------------------------------------
    // БАЗАР ГОСНОМЕРОВ (ТЕНЕВЫЕ ЗНАКИ)
    // --------------------------------------------------------
    renderBlackMarketNumbersList() {
        const list = document.getElementById('autodrotBlackMarketPlatesList');
        if (!list) return;

        if (!state.blackMarketPlates || state.blackMarketPlates.length === 0) {
            this.generateLocalBlackPlates();
            saveState();
        }

        let html = "";
        state.blackMarketPlates.forEach((item, idx) => {
            let isSuperRare = item.price > 1000000;
            let borderGlow = isSuperRare ? "border: 1px solid var(--purple); box-shadow: 0 0 15px rgba(192, 132, 252, 0.25);" : "";
            let rarityText = isSuperRare ? "<span class='color-purple text-xs font-bold'>ЭКСКЛЮЗИВ</span>" : "<span class='color-amber text-xs'>БЛАТНОЙ</span>";

            html += `
            <div class='glass-card flex-between p-2 mb-2' style='${borderGlow}'>
                <div>
                    <div class='license-plate mb-1' style='font-size:15px; padding:4px 8px;'>${item.plate} <div class='license-flag'>RUS</div></div>
                    ${rarityText}
                </div>
                <div class='text-right'>
                    <div class='price-val text-xs color-green mb-1'>${item.price.toLocaleString()} ₽</div>
                    <button onclick="AppAutodrot.buyBlackPlateDirect(${idx})" class='btn ${isSuperRare ? "btn-purple" : "btn-amber"} btn-sm btn-auto'>Выкупить</button>
                </div>
            </div>`;
        });

        list.innerHTML = html;
    },

    generateLocalBlackPlates() {
        const rareRegions = ['77', '99', '97', '777', '199', '177'];
        const rareLetters = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];
        let generated = [];
        
        for (let i = 0; i < 4; i++) {
            let l1 = rareLetters[Math.floor(Math.random() * rareLetters.length)];
            let l2 = rareLetters[Math.floor(Math.random() * rareLetters.length)];
            let l3 = rareLetters[Math.floor(Math.random() * rareLetters.length)];
            let reg = rareRegions[Math.floor(Math.random() * rareRegions.length)];
            
            let plateType = Math.random();
            let plateStr = "";

            if (plateType < 0.25) {
                plateStr = l1 + l1 + l1 + " " + (Math.floor(Math.random()*899)+100) + " " + reg;
            } else if (plateType < 0.50) {
                const nums = ['111', '222', '333', '444', '555', '666', '888', '999'];
                let n = nums[Math.floor(Math.random() * nums.length)];
                plateStr = l1 + n + l2 + l3 + " " + reg;
            } else if (plateType < 0.75) {
                const eliteNums = ['777', '001', '007'];
                let n = eliteNums[Math.floor(Math.random() * eliteNums.length)];
                plateStr = l1 + n + l1 + l1 + " " + reg;
            } else {
                const specList = ["АМР", "ЕКХ", "СКР", "ВОР"];
                let spec = specList[Math.floor(Math.random() * specList.length)];
                plateStr = spec[0] + (Math.floor(Math.random()*899)+100) + spec[1] + spec[2] + " " + reg;
            }

            let calculatedValue = (typeof calculatePlateValue === 'function')
                ? calculatePlateValue(plateStr)
                : 450000;

            let marketPrice = Math.round(calculatedValue * (1.05 + Math.random() * 0.12));

            generated.push({
                id: "bm_plate_" + Date.now() + "_" + i,
                plate: plateStr,
                price: marketPrice
            });
        }

        state.blackMarketPlates = generated;
    },

    refreshNumbersMarket() {
        let cash = state.player?.cash || 0;
        let cost = 35000;
        if (cash < cost) return showToast(`Нужно ${cost.toLocaleString()} ₽ за услуги связи с барыгой!`);
        
        state.player.cash -= cost;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Информатор черного рынка госномеров", cost, false);
        }

        this.generateLocalBlackPlates();
        saveState();
        updateHeaderUI();
        this.renderBlackMarketNumbersList();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Список теневых госзнаков обновлен!");
    },

    buyBlackPlateDirect(idx) {
        const lot = state.blackMarketPlates[idx];
        if (!lot) return;

        let cash = state.player?.cash || 0;
        if (cash < lot.price) return showToast("Не хватает денег на покупку номера!");

        state.player.cash -= lot.price;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Покупка госномера: ${lot.plate}`, lot.price, false);
        }

        if (!state.ownedPlates) state.ownedPlates = [];
        state.ownedPlates.push(lot.plate);

        state.blackMarketPlates.splice(idx, 1);
        saveState();
        updateHeaderUI();
        this.renderBlackMarketNumbersList();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof openVerdictModal === 'function') {
            openVerdictModal("НОМЕР ПРИОБРЕТЕН! 🏷️", `Госзнак «${lot.plate}» добавлен в ваш инвентарь. Можете установить его в Гараже, чтобы повысить стоимость автомобиля!`, true);
        }
    },

    // --------------------------------------------------------
    // СРОЧНЫЙ ВЫКУП (HOT DEALS)
    // --------------------------------------------------------
    renderHotDealsContainer() {
        const container = document.getElementById('autodrotHotDealsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="glass-card mb-2 p-2" style="border: 1px solid var(--amber);">
                <div class="flex-between mb-1">
                    <b class="text-xs">Toyota Mark II JZX90 (Срочно)</b>
                    <span class="tag-badge bg-tag-red">Осталось: 55с</span>
                </div>
                <div class="sub-label mb-2" style="font-size:10px;">Цена продавца: <b class="color-green">290,000 ₽</b> (Рыночная оценка: 490,000 ₽)</div>
                <button onclick="AppAutodrot.interceptHotDeal()" class="btn btn-amber btn-sm w-full">Перехватить сделку ⚡</button>
            </div>
        `;
    },

    interceptHotDeal() {
        let cash = state.player?.cash || 0;
        let cost = 290000;
        if (cash < cost) return showToast("Не хватает 290,000 ₽ на срочный выкуп!");

        let maxSlots = typeof getTotalGarageSlots === 'function' ? getTotalGarageSlots() : 2;
        let curSlots = state.garage ? state.garage.length : 0;
        if (curSlots >= maxSlots) return showToast("Гараж переполнен! Освободите бокс.");

        state.player.cash -= cost;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Срочный перехват: Toyota Mark II JZX90", cost, false);
        }

        let car = {
            id: "hot_mark2_" + Date.now(),
            name: "Toyota Mark II JZX90",
            power: 180,
            type: "economy",
            drivetrain: "rwd",
            basePrice: 490000,
            price: cost,
            baseMarketValue: 490000,
            marketValue: 490000,
            img: "assets/cars/economy/mark2/mark2.jpg",
            fallback: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80",
            plate: (typeof generateNormalPlate === 'function') ? generateNormalPlate() : "О777ОО 77",
            isStolen: false,
            condition: 75,
            wear: { engine: 80, transmission: 75 },
            tuning: { chip: 0, weldedDiff: false, steeringAngle: false, risk1251: 0 },
            purchaseCost: cost,
            ownershipDays: 0,
            engineTemp: 90,
            tireWear: 85
        };

        if (typeof recalculateCarMarketValue === 'function') {
            recalculateCarMarketValue(car);
        }

        if (!state.garage) state.garage = [];
        state.garage.push(car);

        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof openVerdictModal === 'function') {
            openVerdictModal("СРОЧНЫЙ ВЫКУП! 🔥", `Вы успели перехватить «${car.name}» за ${cost.toLocaleString()} ₽!\nМашина доставлена в гараж.`, true);
        }
        this.renderSubScreen();
    },

    // --------------------------------------------------------
    // РЕПУТАЦИЯ И КНИГА ОТЗЫВОВ
    // --------------------------------------------------------
    renderReputationScreen(content) {
        if (!state.player) state.player = {};
        if (!state.player.p2pReputation) {
            state.player.p2pReputation = { rating: 5.0, reviewsCount: 0, badReviews: 0, reviewsLog: [] };
        }
        let rep = state.player.p2pReputation;

        let logHtml = "";
        let logs = rep.reviewsLog || [];
        if (logs.length === 0) {
            logHtml = "<div class='sub-label text-center py-3'>У вас пока нет отзывов. Продавайте машины клиентам, чтобы заработать репутацию!</div>";
        } else {
            logs.forEach(rev => {
                let isGood = rev.stars >= 4;
                logHtml += `
                <div class="glass-card p-2 mb-2" style="border-left: 3px solid ${isGood ? 'var(--green)' : 'var(--red)'};">
                    <div class="flex-between mb-1">
                        <b class="text-xs">${rev.buyerName}</b>
                        <span class="color-amber">${'⭐'.repeat(rev.stars)}</span>
                    </div>
                    <div class="sub-label" style="font-size:9.5px;">«${rev.text}»</div>
                </div>`;
            });
        }

        let penaltyInfo = rep.rating < 4.0 
            ? `<div class="p-2 mb-2" style="background:rgba(220,38,38,0.15); border:1px solid var(--red); border-radius:8px; font-size:9.5px; color:var(--red);">⚠️ <b>Низкий рейтинг!</b> Покупатели на площадке и бирже торгуются агрессивнее. Продавайте честные машины без скрутки пробега, чтобы поднять оценку.</div>`
            : `<div class="p-2 mb-2" style="background:rgba(0,230,118,0.1); border:1px solid rgba(0,230,118,0.3); border-radius:8px; font-size:9.5px; color:var(--green);">✓ <b>Отличная репутация!</b> Клиенты безоговорочно доверяют вашему автосалону.</div>`;

        content.innerHTML = `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.15), #090e18);">
                <div class="font-bold text-xs color-cyan mb-1">РЕЙТИНГ ПРОФИЛЯ ПЕРЕКУПА</div>
                <div class="price-val color-amber my-1" style="font-size:28px;">⭐ ${rep.rating.toFixed(1)} / 5.0</div>
                <div class="sub-label" style="font-size:10px;">Всего сделок с отзывами: <b>${rep.reviewsCount}</b> (Негативных: <b class="color-red">${rep.badReviews}</b>)</div>
            </div>
            ${penaltyInfo}
            <div class="glass-card p-2">
                <b class="text-xs color-cyan mb-2 block">💬 Книга отзывов покупателей:</b>
                <div class="space-y-1" style="max-height: 200px; overflow-y: auto;">
                    ${logHtml}
                </div>
            </div>
        `;
    }
};

window.AppAutodrot = AppAutodrot;
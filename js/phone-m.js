// ========================================================
// js/phone-m.js — ИНТЕРАКТИВНЫЙ ХАБ «M+ PRO» & P2P БИРЖА (v3.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Полный редизайн:
// 1. «Чаты сделок M+» — онлайн-торг с кнопками риска и 100% синхронизацией цен
// 2. «P2P Биржа» — торговля автомобилями, номерами, бизнесом и жильём
// 3. «Пульс рынка» — лента хроники, сделок и реакций перекупов
// 4. «Напарники & Профиль» — френдлист, рефералы и витрина болида
// ========================================================

const AppM = {
    activeTab: 'chats', // 'chats' | 'market' | 'feed' | 'profile'
    marketFilter: 'cars', // 'cars' | 'plates' | 'business' | 'housing'
    activeDialogId: null,
    selectedListingType: 'cars',

    init() {
        this.syncSalesLotBuyersToMessages();
    },

    render(container) {
        if (!container) return;

        if (this.activeDialogId) {
            this.renderConversationScreen(container);
            return;
        }

        const curTab = this.activeTab;
        const unreadCount = this.getGlobalUnreadCount();

        container.innerHTML = `
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 242, 254, 0.4);">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn">
                    <i class="fa-solid fa-chevron-left"></i> Меню
                </button>
                <div class="phone-app-title color-cyan" style="display:flex; align-items:center; gap:6px;">
                    <span class="m-network-logo" style="background: linear-gradient(135deg, #00f2fe, #7928ca); padding: 2px 7px; border-radius: 6px; font-weight: 900; color: #000; font-size: 11px;">M+</span>
                    <span style="font-size:12px; font-weight:900; letter-spacing:0.4px;">PRO HUB</span>
                </div>
                <button onclick="AppM.openCreateListingModal()" class="btn btn-green btn-auto btn-sm" style="font-size:9.5px; padding:3px 8px; font-weight:900;">
                    + Лот
                </button>
            </div>

            <div class="phone-app-body">
                <!-- ГЛАВНОЕ МЕНЮ РАЗДЕЛОВ M+ -->
                <div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 4px;">
                    <button onclick="AppM.switchMainTab('chats')" class="btn ${curTab === 'chats' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9.5px; padding:6px 2px; position:relative;">
                        <i class="fa-solid fa-comments"></i> Торг ${unreadCount > 0 ? `<span class="phone-nav-counter">${unreadCount}</span>` : ''}
                    </button>
                    <button onclick="AppM.switchMainTab('market')" class="btn ${curTab === 'market' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9.5px; padding:6px 2px;">
                        <i class="fa-solid fa-handshake"></i> Биржа
                    </button>
                    <button onclick="AppM.switchMainTab('feed')" class="btn ${curTab === 'feed' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9.5px; padding:6px 2px;">
                        <i class="fa-solid fa-fire"></i> Пульс
                    </button>
                    <button onclick="AppM.switchMainTab('profile')" class="btn ${curTab === 'profile' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9.5px; padding:6px 2px;">
                        <i class="fa-solid fa-id-card"></i> Профиль
                    </button>
                </div>

                <div id="mHubSubContentBox"></div>
            </div>
        `;

        const subBox = document.getElementById('mHubSubContentBox');
        if (curTab === 'chats') this.renderChatsScreen(subBox);
        else if (curTab === 'market') this.renderMarketScreen(subBox);
        else if (curTab === 'feed') this.renderFeedScreen(subBox);
        else if (curTab === 'profile') this.renderProfileScreen(subBox);
    },

    switchMainTab(tab) {
        this.activeTab = tab;
        this.activeDialogId = null;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.render(document.getElementById('phoneAppContainer'));
    },

    getGlobalUnreadCount() {
        let msgs = state.player?.phoneMessages || [];
        return msgs.filter(m => m && m.unread).length;
    },

    // ========================================================
    // 1. ВКЛАДКА: «ТОРГ В ЧАТАХ» (СДЕЛКИ M+)
    // ========================================================
    renderChatsScreen(container) {
        if (!container) return;
        this.syncSalesLotBuyersToMessages();

        let msgs = state.player?.phoneMessages || [];

        container.innerHTML = `
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.14), #090e18); border-color: var(--cyan);">
                <div>
                    <b class="text-xs color-cyan"><i class="fa-solid fa-comments-dollar mr-1"></i> Диалоги перекупских сделок</b>
                    <div class="sub-label" style="font-size:8.5px;">Удалённые торги по выставленным машинам и откликам</div>
                </div>
                <span class="tag-badge bg-tag-green">M+ CHAT</span>
            </div>

            <div id="mDialogsListContainer">
                ${this.renderDialogsListHtml(msgs)}
            </div>
        `;
    },

    renderDialogsListHtml(msgs) {
        if (!msgs || msgs.length === 0) {
            return `
                <div class="glass-card text-center sub-label py-6">
                    <i class="fa-solid fa-comment-slash color-cyan mb-2" style="font-size:26px;"></i>
                    <div>Активных переписок пока нет.</div>
                    <div class="text-xs mt-1">Выставьте автомобиль на площадку продажи, чтобы получать сообщения от клиентов!</div>
                </div>
            `;
        }

        return msgs.map(m => {
            let history = m.chatHistory || [];
            let lastText = history.length > 0 ? history[history.length - 1].text : (m.preview || "Обсуждение условий сделки");
            let isUnread = !!m.unread;

            let carData = m.carData || {};
            let carName = carData.name || "Автомобиль";
            let rawImg = carData.img || "assets/cars/economy/2101/vaz-2101.jpg";
            let carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;

            // Живая синхронизация цены из лота площадки
            let priceText = "";
            if (m.carIndex !== undefined && state.salesLot?.[m.carIndex]) {
                let slot = state.salesLot[m.carIndex];
                let b = slot.currentBuyer || slot.buyer;
                let curOffer = b?.currentOffer || m.offerPrice || slot.askingPrice;
                priceText = `${Number(curOffer).toLocaleString()} ₽`;
            } else if (m.offerPrice) {
                priceText = `${Number(m.offerPrice).toLocaleString()} ₽`;
            }

            return `
                <div onclick="AppM.openDialog('${m.id}')" class="glass-card p-2 flex-between mb-2 cursor-pointer" style="border-left: 3px solid ${isUnread ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}; background: #090e18;">
                    <div class="flex-gap" style="align-items:center; flex:1; min-width:0;">
                        <div style="position:relative; width:44px; height:44px; border-radius:10px; overflow:hidden; border:1px solid var(--border-glass); flex-shrink:0;">
                            <img src="${carImg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='assets/cars/economy/2101/vaz-2101.jpg';">
                            <span style="position:absolute; bottom:1px; right:1px; font-size:10px;">${m.avatar || '🧢'}</span>
                        </div>
                        <div style="flex:1; min-width:0; margin-left:6px;">
                            <div class="flex-between">
                                <b class="text-xs ${isUnread ? 'color-cyan' : ''}">${m.sender}</b>
                                <span class="sub-label color-amber font-bold" style="font-size:9px;">${priceText}</span>
                            </div>
                            <div class="sub-label font-bold" style="font-size:8.5px; color:#94a3b8;">Лот: ${carName}</div>
                            <div class="sub-label mt-1" style="font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#cbd5e1;">
                                ${lastText}
                            </div>
                        </div>
                    </div>
                    ${isUnread ? '<span class="tag-badge bg-tag-red ml-2" style="font-size:7px; padding:2px 4px;">NEW</span>' : ''}
                </div>
            `;
        }).join('');
    },

    // --------------------------------------------------------
    // ДИАЛОГ СДЕЛКИ: ТАКТИКА ТОРГА С РИСКАМИ И ОФОРМЛЕНИЕ ДКП
    // --------------------------------------------------------
    renderConversationScreen(container) {
        let msg = (state.player?.phoneMessages || []).find(m => m && m.id === this.activeDialogId);
        if (!msg) {
            this.activeDialogId = null;
            this.render(container);
            return;
        }

        // Синхронизация цен из слота площадки продаж
        let slot = (msg.carIndex !== undefined && state.salesLot?.[msg.carIndex]) ? state.salesLot[msg.carIndex] : null;
        let car = slot?.car || msg.carData || {};
        let buyerObj = slot?.currentBuyer || slot?.buyer || null;

        let askingPrice = slot?.askingPrice || msg.askingPrice || car.price || 100000;
        let currentOffer = buyerObj?.currentOffer || msg.offerPrice || Math.round(askingPrice * 0.85);

        // Обновляем оффер в объекте сообщения
        msg.askingPrice = askingPrice;
        msg.offerPrice = currentOffer;

        let purchaseCost = car.purchaseCost || Math.round(askingPrice * 0.75);
        let netProfit = currentOffer - purchaseCost;

        let patience = buyerObj ? buyerObj.patience : (msg.patience !== undefined ? msg.patience : 4);
        let maxPatience = buyerObj ? buyerObj.maxPatience : 4;
        let patiencePct = Math.round((patience / maxPatience) * 100);
        let patienceColor = patiencePct > 60 ? "color-green" : (patiencePct > 30 ? "color-amber" : "color-red");

        let rawImg = car.img || "assets/cars/economy/2101/vaz-2101.jpg";
        let carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;

        let history = msg.chatHistory || [];
        let messagesHtml = history.map(item => `
            <div class="chat-msg ${item.from === 'me' ? 'msg-player' : 'msg-seller'}" style="margin-bottom:6px;">
                ${item.text}
            </div>
        `).join('');

        container.innerHTML = `
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 242, 254, 0.4);">
                <button onclick="AppM.closeDialog()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div style="text-align:center;">
                    <div class="phone-app-title text-xs font-bold">${msg.sender}</div>
                    <div class="sub-label color-green" style="font-size:8px;">● В сети (Готов к сделке)</div>
                </div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body flex-col" style="justify-content: space-between;">
                <!-- КАРТОЧКА ОБСУЖДАЕМОГО ЛОТА С ТОЧНЫМИ ЦИФРАМИ -->
                <div class="glass-card mb-2 p-2" style="border: 1.5px solid var(--green); background: #060a14;">
                    <div class="deal-car-preview-card mb-2" style="height:64px;">
                        <img src="${carImg}" class="deal-car-thumb" style="width:72px; height:50px;" onerror="this.src='assets/cars/economy/2101/vaz-2101.jpg';">
                        <div style="flex:1; min-width:0;">
                            <div class="flex-between">
                                <b class="text-xs color-cyan block" style="font-size:12px;">${car.name || 'Автомобиль'}</b>
                                <span class="tag-badge bg-tag-green">M+ DEAL</span>
                            </div>
                            <div class="sub-label mt-1" style="font-size:9px;">
                                Цена на лоте: <b>${Number(askingPrice).toLocaleString()} ₽</b>
                            </div>
                            <div class="flex-between mt-1">
                                <span class="sub-label" style="font-size:8.5px;">Предложение покупателя:</span>
                                <b class="color-green text-xs" style="font-size:12px;">${Number(currentOffer).toLocaleString()} ₽</b>
                            </div>
                        </div>
                    </div>

                    <div class="flex-between text-xs px-1 mb-2">
                        <span class="sub-label">Чистая прибыль по ДКП:</span>
                        <b class="${netProfit >= 0 ? 'color-green' : 'color-red'}">${netProfit >= 0 ? '+' : ''}${Number(netProfit).toLocaleString()} ₽</b>
                    </div>

                    <button onclick="AppM.dealAcceptFromChat('${msg.id}')" class="btn btn-green btn-sm w-full font-bold" style="padding:8px 0; font-size:11px;">
                        <i class="fa-solid fa-handshake mr-1"></i> Заключить ДКП и забрать ${Number(currentOffer).toLocaleString()} ₽ 🤝
                    </button>
                </div>

                <!-- ОКНО ПЕРЕПИСКИ -->
                <div class="chat-thread-container mb-2" id="mChatScrollBox" style="flex:1; min-height:130px; max-height:190px; overflow-y:auto; padding:8px;">
                    ${messagesHtml}
                </div>

                <!-- ИНТЕРАКТИВНЫЕ КНОПКИ ТОРГА С РИСКАМИ -->
                <div class="p-2" style="background:#090e18; border-radius:12px; border:1px solid rgba(255,255,255,0.08);">
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label font-bold">Терпение клиента в чате:</span>
                        <b class="${patienceColor}">${patiencePct}% (${patience} попытки)</b>
                    </div>
                    <div style="height:5px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; margin-bottom:8px;">
                        <div style="width:${patiencePct}%; height:100%; background:${patiencePct > 50 ? 'var(--green)' : (patiencePct > 25 ? 'var(--amber)' : 'var(--red)')}; transition:width 0.3s ease;"></div>
                    </div>

                    <div class="sub-label mb-1" style="font-size:8px; text-transform:uppercase; font-weight:800; color:#94a3b8;">Стратегии торга в переписке:</div>
                    <div class="grid-3" style="gap:5px;">
                        <button onclick="AppM.executeChatHaggle('${msg.id}', 3, 10)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                            <div class="font-bold color-green text-xs" style="font-size:9.5px;">-3% НА ДОРОГУ</div>
                            <div class="sub-label" style="font-size:7.5px;">РИСК: 10%</div>
                        </button>
                        <button onclick="AppM.executeChatHaggle('${msg.id}', 6, 30)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                            <div class="font-bold color-amber text-xs" style="font-size:9.5px;">-6% ПО ФАКТУ</div>
                            <div class="sub-label" style="font-size:7.5px;">РИСК: 30%</div>
                        </button>
                        <button onclick="AppM.executeChatHaggle('${msg.id}', 10, 65)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                            <div class="font-bold color-red text-xs" style="font-size:9.5px;">БЕЗ СКИДОК</div>
                            <div class="sub-label" style="font-size:7.5px;">РИСК: 65%</div>
                        </button>
                    </div>
                </div>
            </div>
        `;

        const box = document.getElementById('mChatScrollBox');
        if (box) box.scrollTop = box.scrollHeight;
    },

    executeChatHaggle(msgId, percent, failRisk) {
        let msg = (state.player?.phoneMessages || []).find(m => m && m.id === msgId);
        if (!msg) return;

        let slot = (msg.carIndex !== undefined && state.salesLot?.[msg.carIndex]) ? state.salesLot[msg.carIndex] : null;
        let buyer = slot?.currentBuyer || slot?.buyer;

        let currentPatience = buyer ? buyer.patience : (msg.patience !== undefined ? msg.patience : 4);
        if (currentPatience <= 0) {
            return showToast("Покупатель вышел из чата и больше не торгуется!");
        }

        if (buyer) buyer.patience -= 1;
        msg.patience = (currentPatience - 1);

        let roll = Math.random() * 100;
        if (!msg.chatHistory) msg.chatHistory = [];

        if (roll < failRisk) {
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('error');

            msg.chatHistory.push({ from: 'me', text: `Скидывай ещё ${percent}%, забирай прямо сейчас!` });
            msg.chatHistory.push({ from: 'them', text: `«Не устраивает цена — продавай дальше. Я на такое предложение не пойду!»` });

            if (msg.patience <= 0 || roll < 15) {
                msg.chatHistory.push({ from: 'them', text: `«Диалог окончен. Удачи в продаже!»` });
                showToast("Покупатель прервал переписку!");
                if (slot) {
                    slot.currentBuyer = null;
                    slot.buyer = null;
                    slot.timer = 50;
                    slot.maxTimer = 50;
                }
            }
        } else {
            let asking = msg.askingPrice || 100000;
            let raise = Math.round(asking * (percent / 100));

            let newOffer = Math.min(asking, (msg.offerPrice || Math.round(asking * 0.85)) + raise);
            msg.offerPrice = newOffer;
            if (buyer) {
                buyer.currentOffer = newOffer;
                buyer.offeredPrice = newOffer;
            }

            msg.chatHistory.push({ from: 'me', text: `Давай добавим +${raise.toLocaleString()} ₽ на дорогу и оформляем ДКП прямо сейчас!` });
            msg.chatHistory.push({ from: 'them', text: `«Ладно, убедил! Накидываю +${raise.toLocaleString()} ₽, оформляем сделку 🤝»` });

            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');
            showToast("Успешный торг! Предложение покупателя выросло.");
        }

        saveState();
        this.renderConversationScreen(document.getElementById('phoneAppContainer'));
    },

    openDialog(msgId) {
        this.activeDialogId = msgId;
        const msg = (state.player?.phoneMessages || []).find(m => m && m.id === msgId);
        if (msg && msg.unread) {
            msg.unread = false;
            saveState();
            if (typeof PhoneManager !== 'undefined') PhoneManager.updateUnreadBadge();
        }
        if (typeof playSound === 'function') playSound('tick');
        this.render(document.getElementById('phoneAppContainer'));
    },

    closeDialog() {
        this.activeDialogId = null;
        if (typeof playSound === 'function') playSound('tick');
        this.render(document.getElementById('phoneAppContainer'));
    },

    dealAcceptFromChat(msgId) {
        let msg = (state.player?.phoneMessages || []).find(m => m && m.id === msgId);
        if (!msg) return;

        let slotIdx = msg.carIndex !== undefined ? msg.carIndex : 0;
        let slot = state.salesLot ? state.salesLot[slotIdx] : null;

        if (slot) {
            let buyer = slot.currentBuyer || slot.buyer;
            let finalPrice = msg.offerPrice || buyer?.currentOffer || slot.askingPrice;

            if (typeof finishSalesLotDeal === 'function') {
                let car = slot.car || slot;
                let purchaseCost = car.purchaseCost || Math.round(finalPrice * 0.75);
                let profit = finalPrice - purchaseCost;
                finishSalesLotDeal(slotIdx, finalPrice, profit);
            }
        } else {
            let car = msg.carData || {};
            let price = msg.offerPrice || 100000;
            state.player.cash = (state.player.cash || 0) + price;
            if (typeof addXp === 'function') addXp(40);
            saveState();
            updateHeaderUI();
            openVerdictModal("СДЕЛКА В M+ ЗАКРЫТА! 🤝", `Покупатель ${msg.sender} выкупил ${car.name || 'авто'} за ${Number(price).toLocaleString()} ₽!`, true, price);
        }

        state.player.phoneMessages = state.player.phoneMessages.filter(m => m.id !== msgId);
        saveState();
        this.activeDialogId = null;
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 2. ВКЛАДКА: «P2P БИРЖА» (ОНЛАЙН РЫНОК)
    // ========================================================
    async renderMarketScreen(container) {
        if (!container) return;
        let f = this.marketFilter || 'cars';

        container.innerHTML = `
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.12), #090e18); border-color: rgba(0, 230, 118, 0.35);">
                <div>
                    <b class="text-xs color-green"><i class="fa-solid fa-globe mr-1"></i> P2P Биржа перекупов</b>
                    <div class="sub-label" style="font-size:8.5px;">Лоты игроков и ботов с прямым выкупом</div>
                </div>
                <button onclick="AppM.openCreateListingModal()" class="btn btn-green btn-auto btn-sm" style="font-size:9px; padding:4px 8px;">
                    + Выставить
                </button>
            </div>

            <div class="grid-4 mb-2">
                <button onclick="AppM.setMarketFilter('cars')" class="btn ${f === 'cars' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">🚗 Авто</button>
                <button onclick="AppM.setMarketFilter('plates')" class="btn ${f === 'plates' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">🏷 Номера</button>
                <button onclick="AppM.setMarketFilter('business')" class="btn ${f === 'business' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">💼 Бизнес</button>
                <button onclick="AppM.setMarketFilter('housing')" class="btn ${f === 'housing' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">🏠 Жильё</button>
            </div>

            <div id="p2pLotsArea">
                <div class="sub-label text-center py-6"><i class="fa-solid fa-spinner fa-spin color-cyan"></i> Загрузка биржи...</div>
            </div>
        `;

        this.renderP2PLotsArea();
    },

    setMarketFilter(filter) {
        this.marketFilter = filter;
        if (typeof playSound === 'function') playSound('tick');
        this.renderMarketScreen(document.getElementById('mHubSubContentBox'));
    },

    async renderP2PLotsArea() {
        const area = document.getElementById('p2pLotsArea');
        if (!area) return;

        let lots = state.p2pMarketListings || [];
        if (lots.length === 0) {
            lots = [
                { id: "demo_1", sellerId: "bot_1", sellerName: "Maga_GTI", type: "cars", name: "VW Golf VI GTI (Stage 2)", price: 1850000, itemData: { plate: "О777ОО 77", power: 260, condition: 85, img: "assets/cars/comfort/golf6/golf6.jpg" } },
                { id: "demo_2", sellerId: "bot_2", sellerName: "Major_Vova", type: "plates", name: "Госномер А777АА 77", price: 1500000, itemData: { plate: "А777АА 77" } },
                { id: "demo_3", sellerId: "bot_3", sellerName: "Serega_Drift", type: "cars", name: "ВАЗ-2101 (Корч)", price: 250000, itemData: { plate: "В123ВВ 77", power: 85, condition: 60, img: "assets/cars/economy/2101/vaz-2101_1.jpg" } }
            ];
            state.p2pMarketListings = lots;
        }

        let f = this.marketFilter || 'cars';
        let filtered = lots.filter(l => (f === 'cars' ? (l.type === 'car' || l.type === 'cars') : (f === 'plates' ? (l.type === 'plate' || l.type === 'plates') : l.type === f)));

        if (filtered.length === 0) {
            area.innerHTML = `<div class="glass-card text-center sub-label py-6">В категории «${f.toUpperCase()}» лотов пока нет.</div>`;
            return;
        }

        area.innerHTML = filtered.map(item => {
            let rawImg = item.itemData?.img || item.img || "assets/cars/economy/2101/vaz-2101.jpg";
            let carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;

            return `
                <div class="glass-card mb-2 p-2" style="border-left: 3px solid var(--green); background:#090e18;">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan">${item.sellerName || 'Перекуп'}</b>
                        <span class="tag-badge bg-tag-cyan">P2P</span>
                    </div>
                    <div class="deal-car-preview-card mb-2" style="height:60px;">
                        <img src="${carImg}" class="deal-car-thumb" style="width:70px; height:48px;" onerror="this.src='assets/cars/economy/2101/vaz-2101.jpg';">
                        <div style="flex:1; min-width:0;">
                            <div class="font-bold text-xs">${item.name}</div>
                            <div class="price-val text-xs color-green">${Number(item.price).toLocaleString()} ₽</div>
                        </div>
                    </div>
                    <button onclick="AppM.directBuyP2PLot('${item.id}')" class="btn btn-green btn-sm w-full font-bold">
                        Купить за ${Number(item.price).toLocaleString()} ₽ 🤝
                    </button>
                </div>
            `;
        }).join('');
    },

    directBuyP2PLot(lotId) {
        let lot = (state.p2pMarketListings || []).find(l => l.id === lotId);
        if (!lot) return showToast("Лот не найден!");

        let cash = state.player?.cash || 0;
        if (cash < lot.price) return showToast(`Не хватает денег! Нужно: ${Number(lot.price).toLocaleString()} ₽`);

        state.player.cash -= lot.price;
        if (lot.type === 'car' || lot.type === 'cars') {
            if (!state.garage) state.garage = [];
            state.garage.push(Object.assign({}, lot.itemData, { id: "p2p_" + Date.now(), purchaseCost: lot.price }));
        } else if (lot.type === 'plate' || lot.type === 'plates') {
            if (!state.ownedPlates) state.ownedPlates = [];
            state.ownedPlates.push(lot.itemData?.plate || lot.name);
        }

        state.p2pMarketListings = state.p2pMarketListings.filter(l => l.id !== lotId);
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("P2P СДЕЛКА ЗАКРЫТА! 🤝", `Вы выкупили «${lot.name}» за ${Number(lot.price).toLocaleString()} ₽!`, true, lot.price);
        this.renderMarketScreen(document.getElementById('mHubSubContentBox'));
    },

    // ========================================================
    // 3. ВКЛАДКА: «ПУЛЬС РЫНКА»
    // ========================================================
    renderFeedScreen(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.14), #090e18); border-color: var(--cyan);">
                <div>
                    <b class="text-xs color-cyan"><i class="fa-solid fa-fire"></i> Пульс Авторынка:</b>
                    <div class="sub-label" style="font-size:9px;">Хроника сделок, побед на 402м и находок в сараях</div>
                </div>
                <button onclick="AppM.openCreatePostPrompt()" class="btn btn-cyan btn-auto btn-sm" style="font-size:9px;">+ Новость</button>
            </div>
            <div class="glass-card mb-2 p-2 m-post-card">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan">Илюха DXF</b>
                    <span class="tag-badge bg-tag-green">ПУЛЬС</span>
                </div>
                <div class="font-bold text-xs mb-1">Закрыта жирная сделка у капота!</div>
                <div class="sub-label mb-2" style="font-size:9.5px; color:#f1f5f9;">
                    Выкупил Mark II в обвесе, скинул цену за скол на крыле и продал с чистой маржой +160,000 ₽!
                </div>
                <div class="m-reactions-row">
                    <button class="m-reaction-btn">🔥 <span>18</span></button>
                    <button class="m-reaction-btn">💸 <span>12</span></button>
                    <button class="m-reaction-btn">🤝 <span>9</span></button>
                </div>
            </div>
        `;
    },

    // ========================================================
    // 4. ВКЛАДКА: «ПРОФИЛЬ ПЕРЕКУПА»
    // ========================================================
    renderProfileScreen(container) {
        if (!container) return;
        let p = state.player || {};
        let myCar = state.garage?.[0];
        let carName = myCar ? myCar.name : "Пешком";

        container.innerHTML = `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.18), #090e18); border-color: var(--cyan);">
                <div class="avatar mb-2" style="margin: 0 auto; width: 56px; height: 56px; font-size: 24px;">
                    <i class="fa-solid fa-user-ninja color-cyan"></i>
                </div>
                <h3 class="font-bold text-xs color-cyan" style="font-size:15px;">${p.name || 'Перекуп #777'}</h3>
                <div class="sub-label mt-1" style="font-size:9.5px;">Авторитет: Уровень ${p.level || 1} • Респект: ⚡ ${p.streetCred || 100}</div>
                <div class="p-2 mt-2" style="background:#090e18; border-radius:8px;">
                    <span class="sub-label" style="font-size:8.5px;">Капитал:</span>
                    <div class="font-bold color-green text-xs mt-1">${Number(p.cash || 0).toLocaleString()} ₽</div>
                </div>
            </div>
            <div class="glass-card p-2 mb-2 flex-between">
                <div>
                    <span class="sub-label" style="font-size:8.5px;">Главный болид:</span>
                    <div class="font-bold text-xs color-amber">${carName}</div>
                </div>
                <span class="tag-badge bg-tag-amber">ФЛАГМАН</span>
            </div>
        `;
    },

    // --------------------------------------------------------
    // СИНХРОНИЗАЦИЯ СЛОТОВ ПЛОЩАДКИ ПРОДАЖ В СООБЩЕНИЯ
    // --------------------------------------------------------
    syncSalesLotBuyersToMessages() {
        if (!state.player) state.player = {};
        if (!state.player.phoneMessages) state.player.phoneMessages = [];
        if (!state.salesLot || state.salesLot.length === 0) return;

        state.salesLot.forEach((slot, slotIdx) => {
            let buyer = slot.currentBuyer || slot.buyer;
            if (slot && buyer && slot.car && buyer.dealType === 'chat') {
                let safeCarName = String(slot.car.name || 'car').replace(/[^a-zа-я0-9]/gi, '_');
                let dialogId = `dlg_buyer_slot_${slotIdx}_${safeCarName}`;
                let exists = state.player.phoneMessages.find(m => m.id === dialogId);

                let asking = slot.askingPrice || slot.car.price;
                let offer = buyer.currentOffer || buyer.offeredPrice || Math.round(asking * 0.85);

                if (!exists) {
                    state.player.phoneMessages.unshift({
                        id: dialogId,
                        category: 'buyers',
                        sender: `${buyer.avatar || '🧢'} ${buyer.name || 'Покупатель'}`,
                        time: "Сейчас",
                        unread: true,
                        carIndex: slotIdx,
                        carData: slot.car,
                        askingPrice: asking,
                        offerPrice: offer,
                        patience: buyer.patience || 4,
                        preview: buyer.lastReply || `Готов забрать авто за ${Number(offer).toLocaleString()} ₽!`,
                        chatHistory: [
                            { from: 'them', text: `Здравствуйте! Пишу по объявлению на «${slot.car.name}». Готов забрать за ${Number(offer).toLocaleString()} ₽!` }
                        ]
                    });
                } else {
                    exists.askingPrice = asking;
                    exists.offerPrice = offer;
                }
            }
        });
    },

    openCreateListingModal() {
        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalCreateP2P');
        } else {
            showToast("Откройте гараж для выставления автомобиля!");
        }
    },

    openCreatePostPrompt() {
        let text = prompt("О чём хотите рассказать в ленте M+?", "Только что закрыл выгодную сделку!");
        if (text && text.trim()) {
            showToast("Заметка опубликована в Пульс!");
        }
    }
};

window.AppM = AppM;
window.AppMessenger = AppM;
window.AppAutodrot = AppM;
// ========================================================
// js/phone-m.js — СОЦИАЛЬНАЯ СЕТЬ & P2P БИРЖА «M+ PRO HUB» (v6.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v6.0.0 (ИНТЕГРАЦИЯ REALTIMEMANAGER + EVENTBUS + MONEYMANAGER):
//   - ВСЕ подписки через RealtimeManager
//   - УБРАН локальный _subscriptions
//   - EventBus для публикации p2p:lot_published, p2p:lot_sold, ...
//   - MoneyManager для списания/начисления
//   - SafeState для безопасного доступа к state
//   - destroy() для очистки подписок
//   - onTabOpen() для подписки при открытии
//   - P2P покупка с каскадом Склад → Парковка → Гараж
// ⭐ v5.0.1:
//   - PlatesManager.addPlate для номеров
//   - Real-time подписки вручную
// ========================================================

if (typeof window.BUSINESS_TITLE_STYLES === 'undefined') {
    window.BUSINESS_TITLE_STYLES = [];
}
if (typeof window.BUSINESS_CARD_ANIMATIONS === 'undefined') {
    window.BUSINESS_CARD_ANIMATIONS = [];
}

const AppM = {
    activeTab: 'chats',
    marketFilter: 'cars',
    activeDialogId: null,
    selectedListingType: 'cars',
    selectedItemIndex: null,

    // ⭐ v6.0.0: для вкладки друзей
    friendsSubTab: 'friends', // 'friends' | 'pending' | 'subscribed'

    // ⭐ v6.0.0: для вкладки трейда
    tradeSubTab: 'incoming', // 'incoming' | 'outgoing'

    // ⭐ v6.0.0: защита от двойных кликов
    _buyPending: false,
    _publishPending: false,

    init() {
        this.syncSalesLotBuyersToMessages();
    },

    // ====================================================
    // REAL-TIME ПОДПИСКИ (через RealtimeManager)
    // ====================================================
    _subscribeRealtime() {
        if (!window.RealtimeManager) {
            console.warn('[AppM] RealtimeManager недоступен');
            return;
        }

        const myUid = String(window.state?.player?.uid || window.tgUserId || "");

        // Подписка на лоты (только на вкладке 'market')
        if (this.activeTab === 'market') {
            try {
                window.RealtimeManager.subscribe('lots', null, (lots) => {
                    if (!Array.isArray(lots)) return;
                    const localIds = new Set((window.state.p2pMarketListings || []).map(l => l.id));
                    lots.forEach(cl => {
                        if (!localIds.has(cl.lot_id || cl.id)) {
                            window.state.p2pMarketListings.unshift({
                                id: cl.lot_id || cl.id,
                                sellerId: cl.sellerId,
                                sellerName: cl.sellerName || "Игрок сети",
                                type: cl.type,
                                name: cl.name,
                                price: cl.price,
                                itemData: cl.itemData || {}
                            });
                        }
                    });
                    const area = document.getElementById('p2pLotsArea');
                    if (area) area.innerHTML = this.renderP2PLotsHtml(this.marketFilter || 'cars');
                });
            } catch (e) {
                console.warn('[AppM] subscribe lots error:', e);
            }
        }

        // Подписка на уведомления (на вкладке 'chats')
        if (this.activeTab === 'chats' && myUid) {
            try {
                window.RealtimeManager.subscribe('notifications', null, () => {
                    const listEl = document.getElementById('mDialogsListContainer');
                    if (listEl) listEl.innerHTML = this.renderDialogsListHtml(window.state.player?.phoneMessages || []);
                });
            } catch (e) {
                console.warn('[AppM] subscribe notifications error:', e);
            }
        }

        // Подписка на сообщения диалога (на вкладке с активным диалогом)
        if (this.activeDialogId) {
            const msg = (window.state.player?.phoneMessages || []).find(m => m && m.id === this.activeDialogId);
            if (msg) {
                const dialogId = msg.dialogId || msg.id;
                try {
                    window.RealtimeManager.subscribe('chat', dialogId, (messages) => {
                        if (!messages || messages.length === 0) return;
                        msg.chatHistory = messages.map(m => ({
                            from: String(m.senderId) === String(window.state.player?.uid) ? 'me' : 'them',
                            text: m.text
                        }));
                        const box = document.getElementById('mChatScrollBox');
                        if (box) {
                            box.innerHTML = msg.chatHistory.map(item => `
                                <div class="chat-msg ${item.from === 'me' ? 'msg-player' : 'msg-seller'}" style="margin-bottom:6px;">
                                    ${item.text}
                                </div>
                            `).join('');
                            box.scrollTop = box.scrollHeight;
                        }
                    });
                } catch (e) {
                    console.warn('[AppM] subscribe chat error:', e);
                }
            }
        }

        // Подписка на trade offers (на вкладке 'trade')
        if (this.activeTab === 'trade' && myUid) {
            try {
                window.RealtimeManager.subscribe('tradeOffers', null, (offers) => {
                    window.state.player.incomingTradeOffers = offers || [];
                    this._refreshTradeList();
                });
            } catch (e) {
                console.warn('[AppM] subscribe tradeOffers error:', e);
            }
        }

        // Подписка на дружбы (на вкладке 'friends')
        if (this.activeTab === 'friends' && myUid) {
            try {
                window.RealtimeManager.subscribe('friendships', null, (pending) => {
                    window.state.player.pendingFriendRequests = pending || [];
                    this._refreshFriendsList();
                });
            } catch (e) {
                console.warn('[AppM] subscribe friendships error:', e);
            }
        }
    },

    /**
     * Вызывается при уходе с вкладки M+.
     */
    destroy() {
        if (window.RealtimeManager) {
            window.RealtimeManager.unsubscribeChannel('lots');
            window.RealtimeManager.unsubscribeChannel('notifications');
            window.RealtimeManager.unsubscribeChannel('chat');
            window.RealtimeManager.unsubscribeChannel('tradeOffers');
            window.RealtimeManager.unsubscribeChannel('friendships');
        }
    },

    /**
     * Публичный метод — вызвать при открытии вкладки.
     */
    onTabOpen() {
        this._subscribeRealtime();
    },

    // ====================================================
    // ХЕЛПЕРЫ
    // ====================================================
    findLotByUid(carUid) {
        if (!carUid || !Array.isArray(window.state.salesLot)) return null;
        return window.state.salesLot.find(lot => {
            if (!lot) return false;
            const car = lot.car || lot;
            return car && (car.uid === carUid || car.id === carUid);
        }) || null;
    },

    getLotIndexByUid(carUid) {
        if (!carUid || !Array.isArray(window.state.salesLot)) return -1;
        return window.state.salesLot.findIndex(lot => {
            if (!lot) return false;
            const car = lot.car || lot;
            return car && (car.uid === carUid || car.id === carUid);
        });
    },

    // ====================================================
    // ГЛАВНЫЙ РЕНДЕР
    // ====================================================
    render(container) {
        if (!container) return;

        // Отписываемся от предыдущих подписок перед перерисовкой
        this.destroy();

        if (this.activeDialogId) {
            this.renderConversationScreen(container);
            return;
        }

        const curTab = this.activeTab;
        const unreadCount = this.getGlobalUnreadCount();
        const pendingFriends = this._getPendingFriendsCount();
        const pendingTrades = this._getPendingTradesCount();

        container.innerHTML = `
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 242, 254, 0.4); padding: 6px 10px;">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn">
                    <i class="fa-solid fa-chevron-left"></i> Меню
                </button>
                <div class="phone-app-title color-cyan" style="display:flex; align-items:center; gap:6px;">
                    <span class="m-network-logo" style="background: linear-gradient(135deg, #00f2fe, #7928ca); padding: 2px 7px; border-radius: 6px; font-weight: 900; color: #000; font-size: 11px;">M+</span>
                    <span style="font-size:12px; font-weight:900; letter-spacing:0.4px;">PRO HUB</span>
                </div>
                <button onclick="AppM.openCreateListingModal()" class="btn btn-green btn-auto btn-sm" style="font-size:9.5px; padding:4px 9px; font-weight:900;">
                    + Продать
                </button>
            </div>

            <div class="phone-app-body" style="padding: 6px 8px;">
                <div class="mplus-nav-scroll-bar mb-2">
                    <button onclick="AppM.switchMainTab('chats')" class="m-nav-pill ${curTab === 'chats' ? 'active' : ''}">
                        <i class="fa-solid fa-comments"></i> Торг ${unreadCount > 0 ? `<span class="m-pill-badge">${unreadCount}</span>` : ''}
                    </button>
                    <button onclick="AppM.switchMainTab('market')" class="m-nav-pill ${curTab === 'market' ? 'active' : ''}">
                        <i class="fa-solid fa-handshake"></i> Биржа
                    </button>
                    <button onclick="AppM.switchMainTab('trade')" class="m-nav-pill ${curTab === 'trade' ? 'active' : ''}">
                        <i class="fa-solid fa-arrows-rotate"></i> Трейд ${pendingTrades > 0 ? `<span class="m-pill-badge">${pendingTrades}</span>` : ''}
                    </button>
                    <button onclick="AppM.switchMainTab('friends')" class="m-nav-pill ${curTab === 'friends' ? 'active' : ''}">
                        <i class="fa-solid fa-user-group"></i> Друзья ${pendingFriends > 0 ? `<span class="m-pill-badge">${pendingFriends}</span>` : ''}
                    </button>
                    <button onclick="AppM.switchMainTab('players')" class="m-nav-pill ${curTab === 'players' ? 'active' : ''}">
                        <i class="fa-solid fa-trophy"></i> Игроки
                    </button>
                    <button onclick="AppM.switchMainTab('events')" class="m-nav-pill ${curTab === 'events' ? 'active' : ''}">
                        <i class="fa-solid fa-tower-broadcast"></i> События
                    </button>
                    <button onclick="AppM.switchMainTab('clubs')" class="m-nav-pill ${curTab === 'clubs' ? 'active' : ''}">
                        <i class="fa-solid fa-users"></i> Клубы
                    </button>
                    <button onclick="AppM.switchMainTab('profile')" class="m-nav-pill ${curTab === 'profile' ? 'active' : ''}">
                        <i class="fa-solid fa-id-card"></i> Визитка
                    </button>
                </div>

                <div id="mHubSubContentBox" style="min-height: 280px;"></div>
            </div>
        `;

        const subBox = document.getElementById('mHubSubContentBox');
        if (!subBox) return;

        if (curTab === 'chats') this.renderChatsScreen(subBox);
        else if (curTab === 'market') this.renderMarketScreen(subBox);
        else if (curTab === 'trade') this.renderTradeScreen(subBox);
        else if (curTab === 'friends') this.renderFriendsScreen(subBox);
        else if (curTab === 'players') {
            if (window.MLeaderboardModule) {
                if (window.MLeaderboardModule.onTabOpen) window.MLeaderboardModule.onTabOpen();
                window.MLeaderboardModule.renderScreen(subBox);
            }
        } else if (curTab === 'events') {
            if (window.MEventsModule) {
                if (window.MEventsModule.onTabOpen) window.MEventsModule.onTabOpen();
                window.MEventsModule.renderScreen(subBox);
            }
        } else if (curTab === 'clubs') {
            if (window.MClubsModule) {
                if (window.MClubsModule.onTabOpen) window.MClubsModule.onTabOpen();
                window.MClubsModule.renderScreen(subBox);
            }
        } else if (curTab === 'profile') this.renderProfileScreen(subBox);

        // ⭐ Подписываемся на real-time для текущей вкладки
        this._subscribeRealtime();
    },

    switchMainTab(tab) {
        this.activeTab = tab;
        this.activeDialogId = null;

        // Отписываемся от предыдущих подписок
        this.destroy();

        if (window.AudioFx) window.AudioFx.play('tick');
        if (window.AudioFx) window.AudioFx.haptic('light');

        this.render(document.getElementById('phoneAppContainer'));
    },

    getGlobalUnreadCount() {
        let msgs = window.state.player?.phoneMessages || [];
        return msgs.filter(m => m && m.unread).length;
    },

    _getPendingFriendsCount() {
        return (window.state.player?.pendingFriendRequests || []).length;
    },

    _getPendingTradesCount() {
        return (window.state.player?.incomingTradeOffers || []).length;
    },

    // ====================================================
    // 1. ВКЛАДКА: «ТОРГ В ЧАТАХ»
    // ====================================================
    renderChatsScreen(container) {
        if (!container) return;
        this.syncSalesLotBuyersToMessages();

        if (typeof window.cleanupOrphanedDialogs === 'function') {
            try {
                window.cleanupOrphanedDialogs();
            } catch (e) {
                console.warn('[AppM] cleanupOrphanedDialogs ошибка:', e);
            }
        }

        container.innerHTML = `
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.14), #090e18); border-color: var(--cyan);">
                <div>
                    <b class="text-xs color-cyan"><i class="fa-solid fa-comments-dollar mr-1"></i> Переписки по объявлениям</b>
                    <div class="sub-label" style="font-size:8.5px;">Клиенты по авто с площадки и отклики с P2P биржи</div>
                </div>
                <span class="tag-badge bg-tag-green">M+ ONLINE</span>
            </div>

            <div id="mDialogsListContainer">
                ${this.renderDialogsListHtml(window.state.player?.phoneMessages || [])}
            </div>
        `;
    },

    renderDialogsListHtml(msgs) {
        if (!msgs || msgs.length === 0) {
            return `
                <div class="glass-card text-center sub-label py-6" style="background:#090e18;">
                    <i class="fa-solid fa-comment-slash color-cyan mb-2" style="font-size:26px;"></i>
                    <div>Входящих сообщений пока нет.</div>
                    <div class="text-xs mt-1">Выставьте имущество на биржу или дождитесь покупателя на авторынке!</div>
                </div>
            `;
        }

        return msgs.map(m => {
            let history = m.chatHistory || [];
            let lastText = history.length > 0 ? history[history.length - 1].text : (m.preview || "Обсуждение условий сделки");
            let isUnread = !!m.unread;
            let isViewed = !!m.viewed && !isUnread;

            let carData = m.carData || {};
            let carName = carData.name || "Объект сделки";
            let rawImg = carData.img || "assets/cars/economy/2101/vaz-2101.jpg";
            let carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
            let fallbackImg = (typeof getCategoryFallback === 'function') ? getCategoryFallback(carData.type || 'economy') : "assets/cars/economy/2101/vaz-2101.jpg";

            let priceText = "";
            let liveLot = null;
            if (m.carUid) liveLot = this.findLotByUid(m.carUid);
            if (!liveLot && m.carIndex !== undefined && window.state.salesLot?.[m.carIndex]) {
                liveLot = window.state.salesLot[m.carIndex];
            }

            if (liveLot) {
                let b = liveLot.currentBuyer || liveLot.buyer;
                let curOffer = b?.currentOffer || m.offerPrice || liveLot.askingPrice;
                priceText = `${Number(curOffer).toLocaleString()} ₽`;
            } else if (m.offerPrice) {
                priceText = `${Number(m.offerPrice).toLocaleString()} ₽`;
            }

            let viewStatusBadge = isUnread
                ? `<span class="tag-badge bg-tag-red" style="font-weight:900;"><span class="led-dot led-red"></span> НОВОЕ</span>`
                : (isViewed ? `<span class="tag-badge bg-tag-dark" style="border-color:rgba(255,255,255,0.2);"><i class="fa-solid fa-eye color-cyan mr-1"></i> ПРОСМОТРЕНО</span>` : '');

            let senderLabel = m.isP2PMarket ? "Продавец P2P:" : "Покупатель:";

            let orphanBadge = (!liveLot && m.category === 'buyers')
                ? `<div class="p-1 mt-1 text-center" style="background:rgba(255,51,102,0.12); border-radius:6px; border:1px solid rgba(255,51,102,0.35);">
                       <span class="sub-label" style="font-size:8.5px; color:#fca5a5;">⚠️ Лот больше не на площадке</span>
                   </div>`
                : '';

            return `
                <div onclick="AppM.openDialog('${m.id}')" class="glass-card mb-2 p-2 cursor-pointer ${isUnread ? 'card-glow-deal' : ''}" style="border-left: 3px solid ${isUnread ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}; background: #090e18;">
                    <div class="car-img-wrap mb-2" style="height:115px; position:relative; border-radius:10px; overflow:hidden;">
                        <img src="${carImg}" class="car-img" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='${fallbackImg}';">
                        <div class="badge-tag badge-br">
                            ${viewStatusBadge}
                        </div>
                    </div>

                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs color-cyan" style="font-size:12.5px;">${carName}</b>
                            <div class="sub-label mt-1" style="font-size:9px;">
                                ${senderLabel} <b class="color-amber">${m.sender}</b>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="sub-label" style="font-size:8px;">ПРЕДЛОЖЕНИЕ:</span>
                            <div class="price-val text-xs color-green" style="font-size:14px;">${priceText || '—'}</div>
                        </div>
                    </div>

                    <div class="seller-dialog-bubble my-2" style="border-left: 3px solid var(--cyan); background: rgba(0, 242, 254, 0.04); padding: 6px 10px; border-radius: 6px;">
                        <span class="sub-label" style="font-size:9.5px; color:#cbd5e1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">
                            ${lastText}
                        </span>
                    </div>

                    ${orphanBadge}

                    <button class="btn btn-cyan btn-sm w-full font-bold" style="padding:6px 0; font-size:10px;">
                        <i class="fa-solid fa-comments mr-1"></i> ПЕРЕЙТИ В ДИАЛОГ 💬
                    </button>
                </div>
            `;
        }).join('');
    },

    renderConversationScreen(container) {
        let msg = (window.state.player?.phoneMessages || []).find(m => m && m.id === this.activeDialogId);
        if (!msg) {
            this.activeDialogId = null;
            this.render(container);
            return;
        }

        msg.unread = false;
        msg.viewed = true;

        let isP2P = !!msg.isP2PMarket;

        let slot = null;
        if (!isP2P) {
            if (msg.carUid) slot = this.findLotByUid(msg.carUid);
            if (!slot && msg.carIndex !== undefined && window.state.salesLot?.[msg.carIndex]) {
                slot = window.state.salesLot[msg.carIndex];
            }
        }

        let car = slot?.car || msg.carData || {};
        let buyerObj = slot?.currentBuyer || slot?.buyer || null;

        let p2pLost = false;
        if (isP2P && msg.p2pId) {
            const liveLot = (window.state.p2pMarketListings || []).find(l => l.id === msg.p2pId);
            if (!liveLot) p2pLost = true;
        }

        let askingPrice = slot?.askingPrice || msg.askingPrice || car.price || 100000;
        let currentOffer = buyerObj?.currentOffer || msg.offerPrice || (isP2P ? askingPrice : Math.round(askingPrice * 0.85));

        msg.askingPrice = askingPrice;
        msg.offerPrice = currentOffer;

        let patience = buyerObj ? buyerObj.patience : (msg.patience !== undefined ? msg.patience : 4);
        let maxPatience = buyerObj ? buyerObj.maxPatience : (msg.maxPatience || 4);
        let patiencePct = Math.round((patience / maxPatience) * 100);
        let patienceColor = patiencePct > 60 ? "color-green" : (patiencePct > 30 ? "color-amber" : "color-red");

        let rawImg = car.img || "assets/cars/economy/2101/vaz-2101.jpg";
        let carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
        let fallbackImg = (typeof getCategoryFallback === 'function') ? getCategoryFallback(car.type || 'economy') : "assets/cars/economy/2101/vaz-2101.jpg";

        let history = msg.chatHistory || [];

        if (p2pLost) {
            container.innerHTML = `
                <div class="phone-app-header" style="border-bottom-color: rgba(0, 242, 254, 0.4); flex-shrink: 0;">
                    <button onclick="AppM.closeDialog()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                    <div style="text-align:center;">
                        <div class="phone-app-title text-xs font-bold">${msg.sender}</div>
                        <div class="sub-label color-red" style="font-size:8px;">● Лот недоступен</div>
                    </div>
                    <div style="width:40px;"></div>
                </div>
                <div class="phone-app-body" style="padding: 12px;">
                    <div class="glass-card p-3 text-center" style="border-color: var(--red);">
                        <div style="font-size:36px; margin-bottom:8px;">🛒</div>
                        <b class="text-xs color-red block mb-2" style="font-size:13px;">ЭТОТ ЛОТ УЖЕ ВЫКУПЛЕН</b>
                        <div class="sub-label mb-3" style="font-size:10px;">Другой игрок оформил сделку раньше вас. Переписка закрыта.</div>
                        <button onclick="AppM.deleteOrphanDialog('${msg.id}')" class="btn btn-dark btn-sm w-full">
                            Удалить диалог
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        let benefitHtml = "";
        let tacticsButtonsHtml = "";
        let dkpButtonHtml = "";

        if (isP2P) {
            let discountGained = Math.max(0, askingPrice - currentOffer);
            benefitHtml = `
                <div class="flex-between text-xs px-1 mt-1">
                    <span class="sub-label" style="font-size:8.5px;">Сторговано на бирже:</span>
                    <b class="color-green" style="font-size:9.5px;">-${Number(discountGained).toLocaleString()} ₽</b>
                </div>
            `;
            tacticsButtonsHtml = `
                <button onclick="AppM.executeChatHaggle('${msg.id}', 3, 15)" class="btn btn-dark btn-sm text-left" style="padding:5px 4px; min-height:34px;">
                    <div class="font-bold color-green text-xs" style="font-size:8.5px;">-3% НА ДОРОГУ</div>
                    <div class="sub-label" style="font-size:7px;">РИСК: 15%</div>
                </button>
                <button onclick="AppM.executeChatHaggle('${msg.id}', 7, 35)" class="btn btn-dark btn-sm text-left" style="padding:5px 4px; min-height:34px;">
                    <div class="font-bold color-amber text-xs" style="font-size:8.5px;">-7% ПО ФАКТУ</div>
                    <div class="sub-label" style="font-size:7px;">РИСК: 35%</div>
                </button>
                <button onclick="AppM.executeChatHaggle('${msg.id}', 12, 60)" class="btn btn-dark btn-sm text-left" style="padding:5px 4px; min-height:34px;">
                    <div class="font-bold color-red text-xs" style="font-size:8.5px;">-12% ЖЁСТКО</div>
                    <div class="sub-label" style="font-size:7px;">РИСК: 60%</div>
                </button>
            `;
            dkpButtonHtml = `
                <button onclick="AppM.dealAcceptFromChat('${msg.id}')" class="btn btn-green btn-sm w-full font-bold mt-1" style="padding:9px 0; font-size:11px; box-shadow:0 0 14px var(--green-glow);">
                    <i class="fa-solid fa-handshake mr-1"></i> ЗАКЛЮЧИТЬ ДКП И ВЫКУПИТЬ ЗА ${Number(currentOffer).toLocaleString()} ₽ 🤝
                </button>
            `;
        } else {
            let purchaseCost = car.purchaseCost || Math.round(askingPrice * 0.75);
            let netProfit = currentOffer - purchaseCost;
            benefitHtml = `
                <div class="flex-between text-xs px-1 mt-1">
                    <span class="sub-label" style="font-size:8.5px;">Чистая прибыль по сделке:</span>
                    <b class="${netProfit >= 0 ? 'color-green' : 'color-red'}" style="font-size:9.5px;">${netProfit >= 0 ? '+' : ''}${Number(netProfit).toLocaleString()} ₽</b>
                </div>
            `;
            tacticsButtonsHtml = `
                <button onclick="AppM.executeChatHaggle('${msg.id}', 3, 10)" class="btn btn-dark btn-sm text-left" style="padding:5px 4px; min-height:34px;">
                    <div class="font-bold color-green text-xs" style="font-size:8.5px;">+3% НА ДОРОГУ</div>
                    <div class="sub-label" style="font-size:7px;">РИСК: 10%</div>
                </button>
                <button onclick="AppM.executeChatHaggle('${msg.id}', 6, 28)" class="btn btn-dark btn-sm text-left" style="padding:5px 4px; min-height:34px;">
                    <div class="font-bold color-amber text-xs" style="font-size:8.5px;">+6% ПО ФАКТУ</div>
                    <div class="sub-label" style="font-size:7px;">РИСК: 28%</div>
                </button>
                <button onclick="AppM.executeChatHaggle('${msg.id}', 10, 60)" class="btn btn-dark btn-sm text-left" style="padding:5px 4px; min-height:34px;">
                    <div class="font-bold color-red text-xs" style="font-size:8.5px;">БЕЗ СКИДОК</div>
                    <div class="sub-label" style="font-size:7px;">РИСК: 60%</div>
                </button>
            `;
            dkpButtonHtml = `
                <button onclick="AppM.dealAcceptFromChat('${msg.id}')" class="btn btn-green btn-sm w-full font-bold mt-1" style="padding:9px 0; font-size:11px; box-shadow:0 0 14px var(--green-glow);">
                    <i class="fa-solid fa-handshake mr-1"></i> ЗАКЛЮЧИТЬ ДКП ЗА ${Number(currentOffer).toLocaleString()} ₽ 🤝
                </button>
            `;
        }

        container.innerHTML = `
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 242, 254, 0.4); flex-shrink: 0;">
                <button onclick="AppM.closeDialog()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div style="text-align:center;">
                    <div class="phone-app-title text-xs font-bold">${msg.sender}</div>
                    <div class="sub-label color-green" style="font-size:8px;">● ${isP2P ? 'P2P Биржа онлайн' : 'Покупатель с площадки'}</div>
                </div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body" style="display:flex; flex-direction:column; height: calc(100% - 46px); min-height: 0; padding: 4px 6px 8px 6px; gap: 6px;">
                <div class="glass-card p-2" style="border: 1.5px solid var(--green); background: #060a14; margin-bottom: 0; flex-shrink: 0;">
                    <div class="deal-car-preview-card" style="height:56px; min-height:56px; padding: 4px 8px;">
                        <img src="${carImg}" class="deal-car-thumb" style="width:68px; height:46px; min-width:68px; object-fit:cover;" onerror="this.onerror=null; this.src='${fallbackImg}';">
                        <div style="flex:1; min-width:0;">
                            <div class="flex-between">
                                <b class="text-xs color-cyan block" style="font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${car.name || 'Объект сделки'}</b>
                                <span class="tag-badge bg-tag-green" style="font-size:7.5px;">${isP2P ? 'P2P ЛОТ' : 'СИНХРОНЕН'}</span>
                            </div>
                            <div class="sub-label mt-1" style="font-size:8.5px;">
                                Цена в объявлении: <b>${Number(askingPrice).toLocaleString()} ₽</b>
                            </div>
                            <div class="flex-between mt-1">
                                <span class="sub-label" style="font-size:8px;">${isP2P ? 'Ваше предложение:' : 'Оффер покупателя:'}</span>
                                <b class="color-green text-xs" style="font-size:12px;">${Number(currentOffer).toLocaleString()} ₽</b>
                            </div>
                        </div>
                    </div>
                    ${benefitHtml}
                </div>

                <div class="chat-thread-container" id="mChatScrollBox" style="flex: 1 1 auto; min-height: 120px; max-height: none; overflow-y:auto; padding:8px; background:#04070e; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
                    ${history.map(item => `
                        <div class="chat-msg ${item.from === 'me' ? 'msg-player' : 'msg-seller'}" style="margin-bottom:6px;">
                            ${item.text}
                        </div>
                    `).join('')}
                </div>

                <div class="p-2" style="background:#090e18; border-radius:12px; border:1px solid rgba(255,255,255,0.08); flex-shrink: 0; display:flex; flex-direction:column; gap:5px;">
                    <div class="flex-between text-xs">
                        <span class="sub-label font-bold" style="font-size:9px;">Терпение собеседника:</span>
                        <b class="${patienceColor}" style="font-size:9px;">${patiencePct}% (${patience} попытки)</b>
                    </div>
                    <div style="height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden;">
                        <div style="width:${patiencePct}%; height:100%; background:${patiencePct > 50 ? 'var(--green)' : (patiencePct > 25 ? 'var(--amber)' : 'var(--red)')}; transition:width 0.3s ease;"></div>
                    </div>

                    <div class="sub-label" style="font-size:8px; text-transform:uppercase; font-weight:800; color:#94a3b8; margin-top:2px;">Тактика торга:</div>
                    <div class="grid-3" style="gap:4px;">
                        ${tacticsButtonsHtml}
                    </div>

                    ${dkpButtonHtml}
                </div>
            </div>
        `;

        const box = document.getElementById('mChatScrollBox');
        if (box) box.scrollTop = box.scrollHeight;

        // Подписка на сообщения диалога
        this._subscribeRealtime();
    },

    deleteOrphanDialog(msgId) {
        if (!window.state.player?.phoneMessages) return;
        window.state.player.phoneMessages = window.state.player.phoneMessages.filter(m => m && m.id !== msgId);
        this.activeDialogId = null;
        if (typeof saveState === 'function') saveState();
        if (typeof PhoneManager !== 'undefined') PhoneManager.updateUnreadBadge();
        this.render(document.getElementById('phoneAppContainer'));
    },

    executeChatHaggle(msgId, percent, failRisk) {
        let msg = (window.state.player?.phoneMessages || []).find(m => m && m.id === msgId);
        if (!msg) return;

        let isP2P = !!msg.isP2PMarket;

        let slot = null;
        if (!isP2P) {
            if (msg.carUid) slot = this.findLotByUid(msg.carUid);
            if (!slot && msg.carIndex !== undefined) slot = window.state.salesLot?.[msg.carIndex];
        }

        if (!isP2P && !slot) {
            showToast("⚠️ Лот больше не на площадке. Диалог закрыт.");
            this.deleteOrphanDialog(msgId);
            return;
        }

        let buyer = slot?.currentBuyer || slot?.buyer;

        let currentPatience = buyer ? buyer.patience : (msg.patience !== undefined ? msg.patience : 4);
        if (currentPatience <= 0) {
            return showToast("Собеседник больше не готов вести диалог!");
        }

        if (buyer) buyer.patience -= 1;
        msg.patience = (currentPatience - 1);

        let lvl = window.state.player?.level || 1;
        let karma = window.state.player?.karma || 50;
        let adjustedRisk = Math.max(5, Math.min(90, failRisk - (lvl * 0.5) - ((karma - 50) * 0.2)));
        let roll = Math.random() * 100;

        if (!msg.chatHistory) msg.chatHistory = [];
        let tacticKey = percent <= 3 ? 'soft' : (percent <= 8 ? 'medium' : 'hard');

        if (roll < adjustedRisk) {
            if (window.AudioFx) window.AudioFx.play('error');
            if (window.AudioFx) window.AudioFx.haptic('error');

            let playerMsg = isP2P
                ? `Скидывай ещё ${percent}%, деньги на руках!`
                : `Скидывай ещё ${percent}%, заберу прямо сейчас!`;

            let sellerReply = "«Не устраивает цена — ищи другой вариант. На такое не пойду!»";

            if (isP2P && typeof DIALOGUES_DATABASE !== 'undefined' && DIALOGUES_DATABASE.p2p?.tacticsResponses?.[tacticKey]) {
                let refusePool = DIALOGUES_DATABASE.p2p.tacticsResponses[tacticKey].refuse;
                if (Array.isArray(refusePool) && refusePool.length > 0) {
                    sellerReply = refusePool[Math.floor(Math.random() * refusePool.length)];
                }
            }

            msg.chatHistory.push({ from: 'me', text: playerMsg });
            msg.chatHistory.push({ from: 'them', text: sellerReply });

            if (msg.patience <= 0 || roll < 10) {
                let quitReply = "«С вами каши не сваришь. Сделки не будет!»";
                if (isP2P && typeof DIALOGUES_DATABASE !== 'undefined' && DIALOGUES_DATABASE.p2p?.tacticsResponses?.rageQuit) {
                    let quitPool = DIALOGUES_DATABASE.p2p.tacticsResponses.rageQuit;
                    quitReply = quitPool[Math.floor(Math.random() * quitPool.length)];
                }
                msg.chatHistory.push({ from: 'them', text: quitReply });
                showToast("Собеседник прервал сделку!");

                if (slot) {
                    slot.currentBuyer = null;
                    slot.buyer = null;
                    slot.timer = 50;
                    slot.maxTimer = 50;

                    if (typeof window.removeDialogByCarIndex === 'function' && msg.carIndex !== undefined) {
                        window.removeDialogByCarIndex(msg.carIndex);
                    }
                }
            }
        } else {
            if (window.AudioFx) window.AudioFx.play('win');
            if (window.AudioFx) window.AudioFx.haptic('success');

            let asking = msg.askingPrice || 100000;
            let delta = Math.round(asking * (percent / 100));

            if (isP2P) {
                let newOffer = Math.max(Math.round(asking * 0.5), (msg.offerPrice || asking) - delta);
                msg.offerPrice = newOffer;

                let playerPhrase = `Давай скидку -${delta.toLocaleString()} ₽, и я сразу жму кнопку выкупа!`;
                let sellerPhrase = `«Ладно, твоя взяла! Уступаю -${delta.toLocaleString()} ₽, забирай!»`;

                if (typeof DIALOGUES_DATABASE !== 'undefined' && DIALOGUES_DATABASE.p2p?.tacticsResponses?.[tacticKey]) {
                    let agreePool = DIALOGUES_DATABASE.p2p.tacticsResponses[tacticKey].agree;
                    if (Array.isArray(agreePool) && agreePool.length > 0) {
                        let fn = agreePool[Math.floor(Math.random() * agreePool.length)];
                        if (typeof fn === 'function') sellerPhrase = fn(delta);
                    }
                }

                msg.chatHistory.push({ from: 'me', text: playerPhrase });
                msg.chatHistory.push({ from: 'them', text: sellerPhrase });
                showToast("Успешный торг! Цена лота снижена.");
            } else {
                let newOffer = Math.min(asking, (msg.offerPrice || Math.round(asking * 0.85)) + delta);
                msg.offerPrice = newOffer;
                if (buyer) {
                    buyer.currentOffer = newOffer;
                    buyer.offeredPrice = newOffer;
                }

                msg.chatHistory.push({ from: 'me', text: `Давай добавим +${delta.toLocaleString()} ₽ на дорогу и оформляем ДКП прямо сейчас!` });
                msg.chatHistory.push({ from: 'them', text: `«Ладно, твоя взяла! Накидываю +${delta.toLocaleString()} ₽, оформляем сделку 🤝»` });
                showToast("Успешный торг! Предложение покупателя выросло.");
            }
        }

        if (typeof saveState === 'function') saveState();
        this.renderConversationScreen(document.getElementById('phoneAppContainer'));
    },

    openDialog(msgId) {
        const msg = (window.state.player?.phoneMessages || []).find(m => m && m.id === msgId);
        if (!msg) return;

        this.activeDialogId = msgId;

        if (msg.isP2PMarket && msg.p2pId) {
            const liveLot = (window.state.p2pMarketListings || []).find(l => l.id === msg.p2pId);
            if (!liveLot) {
                msg.unread = false;
                msg.viewed = true;
                saveState();
                if (typeof PhoneManager !== 'undefined') PhoneManager.updateUnreadBadge();
            }
        }

        msg.unread = false;
        msg.viewed = true;
        if (typeof saveState === 'function') saveState();
        if (typeof PhoneManager !== 'undefined') PhoneManager.updateUnreadBadge();

        if (window.AudioFx) window.AudioFx.play('tick');
        this.render(document.getElementById('phoneAppContainer'));
    },

    closeDialog() {
        this.activeDialogId = null;
        this.destroy();
        if (window.AudioFx) window.AudioFx.play('tick');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ====================================================
    // P2P ПОКУПКА (через MoneyManager + EventBus)
    // ====================================================
    async dealAcceptFromChat(msgId) {
        if (this._buyPending) return;
        this._buyPending = true;

        try {
            let msg = (window.state.player?.phoneMessages || []).find(m => m && m.id === msgId);
            if (!msg) return;

            if (!window.state.player) {
                return showToast("❌ Ошибка: профиль игрока недоступен");
            }

            if (msg.isP2PMarket && msg.p2pId) {
                // P2P покупка
                let lot = (window.state.p2pMarketListings || []).find(l => l.id === msg.p2pId);
                if (!lot) {
                    showToast("❌ Лот уже выкуплен другим игроком!");
                    this.deleteOrphanDialog(msgId);
                    return;
                }

                let finalPrice = msg.offerPrice || lot.price || 100000;
                let cash = window.state.player?.cash || 0;

                const myUid = String(window.state.player?.uid || window.tgUserId || "guest_777");
                const sellerUid = String(lot?.sellerId || lot?.sellerName || "");
                if (sellerUid === myUid || (lot?.sellerName && lot.sellerName === window.state.player?.name)) {
                    return showToast("Вы не можете купить собственное предложение!");
                }

                if (cash < finalPrice) {
                    return showToast(`Не хватает денег! Нужно: ${Number(finalPrice).toLocaleString()} ₽`);
                }

                // Атомарная покупка через FB_Bridge
                if (window.FB_Bridge?.P2P?.buyLotAtomic) {
                    showToast("⏳ Оформление сделки на бирже...");

                    const profile = window.FB_Bridge.getProfile?.() || { id: myUid, name: window.state.player.name };
                    const res = await window.FB_Bridge.P2P.buyLotAtomic(msg.p2pId, profile, cash);

                    if (!res || !res.success) {
                        return showToast(`❌ Ошибка: ${res?.error || 'неизвестная'}`);
                    }

                    // Списание через MoneyManager
                    if (window.MoneyManager) {
                        window.MoneyManager.spend(finalPrice, `P2P Покупка: ${lot.name}`);
                    } else {
                        window.state.player.cash -= finalPrice;
                        if (typeof logBankTransaction === 'function') {
                            logBankTransaction(`P2P Покупка: ${lot.name}`, finalPrice, false);
                        }
                    }

                    // Купленный лот → Склад (если есть бизнес) или Парковка
                    const hasBiz = (window.state.businesses || []).some(b => b && b.level > 0);
                    const itemData = lot.itemData || {};

                    if (lot.type === 'car' || lot.type === 'cars') {
                        let carObj = Object.assign({}, itemData, {
                            id: "car_p2p_" + Date.now(),
                            name: lot.name,
                            price: finalPrice,
                            purchaseCost: finalPrice,
                            isRegisteredOnPlayer: false,
                            ownershipDays: 0,
                            storageType: hasBiz ? 'warehouse' : 'paid_parking'
                        });
                        if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(carObj);
                        if (typeof window.ensureCarIdentity === 'function') window.ensureCarIdentity(carObj);

                        if (hasBiz) {
                            if (!window.state.player.warehouse) window.state.player.warehouse = { maxCars: 6, maxItems: 12, cars: [], items: [] };
                            window.state.player.warehouse.cars.push(carObj);
                            carObj.isStoredInWarehouse = true;
                            showToast(`🚗 «${lot.name}» доставлен на Склад!`);
                        } else {
                            if (!window.state.player.paidParking) window.state.player.paidParking = { maxCars: 3, cars: [], dailyRate: 200, lastChargeDay: 0 };
                            if (window.state.player.paidParking.cars.length >= window.state.player.paidParking.maxCars) {
                                const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
                                if ((window.state.garage?.length || 0) < maxSlots) {
                                    window.state.garage.push(carObj);
                                    showToast(`🚗 «${lot.name}» доставлен в Гараж (склад переполнен)!`);
                                } else {
                                    if (window.MoneyManager) {
                                        window.MoneyManager.earn(finalPrice, `Возврат за переполненный склад: ${lot.name}`, { silent: true });
                                    } else {
                                        window.state.player.cash += finalPrice;
                                    }
                                    showToast(`⚠️ Нет места для «${lot.name}» — деньги возвращены.`);
                                }
                            } else {
                                window.state.player.paidParking.cars.push(carObj);
                                carObj.isStoredInWarehouse = false;
                                showToast(`🅿️ «${lot.name}» на Платной парковке (${window.state.player.paidParking.dailyRate} ₽/день)!`);
                            }
                        }
                        if (typeof renderGarage === 'function') renderGarage();
                    } else if (lot.type === 'plate' || lot.type === 'plates') {
                        let plateNumber = itemData.plate || lot.name;
                        if (window.PlatesManager) {
                            window.PlatesManager.addPlate(plateNumber, 'p2p_buy', { silent: false });
                        } else {
                            if (!window.state.player.platesInventory) window.state.player.platesInventory = [];
                            window.state.player.platesInventory.push({
                                id: 'plate_' + Date.now(),
                                number: String(plateNumber).trim().toUpperCase(),
                                region: 77,
                                status: 'inventory',
                                installedCarId: null,
                                ownerId: window.state.player.uid || 'player_local',
                                source: 'p2p_buy_fallback',
                                createdAt: Date.now()
                            });
                        }
                    } else if (lot.type === 'business') {
                        let bizId = itemData?.bizId || lot.id;
                        let targetBiz = (window.state.businesses || []).find(b => b.id === bizId);
                        if (targetBiz) {
                            targetBiz.level = Math.max(targetBiz.level || 0, itemData?.level || 1);
                            targetBiz.stock = 100;
                        }
                    } else if (lot.type === 'housing') {
                        let hId = itemData?.houseId || 'gsk_box';
                        if (!window.state.player.ownedHouses) window.state.player.ownedHouses = [];
                        if (!window.state.player.ownedHouses.includes(hId)) window.state.player.ownedHouses.push(hId);
                        window.state.player.housingId = hId;
                        window.state.player.housingType = 'own';
                    }

                    // Убираем лот из локального списка
                    window.state.p2pMarketListings = (window.state.p2pMarketListings || []).filter(l => l.id !== msg.p2pId);
                    window.state.player.phoneMessages = window.state.player.phoneMessages.filter(m => m.id !== msgId);

                    if (typeof saveState === 'function') saveState();
                    if (typeof updateHeaderUI === 'function') updateHeaderUI();

                    // Публикуем событие
                    if (window.EventBus) {
                        window.EventBus.emit('p2p:lot_bought', {
                            lotId: msg.p2pId,
                            sellerId: lot.sellerId,
                            price: finalPrice,
                            itemType: lot.type
                        });
                    }

                    this.activeDialogId = null;
                    this.render(document.getElementById('phoneAppContainer'));

                    if (typeof openVerdictModal === 'function') {
                        openVerdictModal("P2P СДЕЛКА ЗАКРЫТА! 🤝", `Вы выкупили лот за ${Number(finalPrice).toLocaleString()} ₽!`, true, finalPrice);
                    }
                    return;
                }

                // Fallback на локальную покупку
                if (window.MoneyManager) {
                    window.MoneyManager.spend(finalPrice, `P2P Покупка (локально): ${lot.name}`);
                } else {
                    window.state.player.cash -= finalPrice;
                    if (typeof logBankTransaction === 'function') {
                        logBankTransaction(`P2P Покупка (локально): ${lot.name}`, finalPrice, false);
                    }
                }

                const itemData2 = lot.itemData || {};
                if (lot.type === 'car' || lot.type === 'cars') {
                    let carObj = Object.assign({}, itemData2, {
                        id: "car_p2p_" + Date.now(),
                        purchaseCost: finalPrice,
                        isRegisteredOnPlayer: false,
                        ownershipDays: 0
                    });
                    if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(carObj);
                    if (!window.state.garage) window.state.garage = [];
                    window.state.garage.push(carObj);
                    if (typeof renderGarage === 'function') renderGarage();
                } else if (lot.type === 'plate' || lot.type === 'plates') {
                    let plateNumber = itemData2.plate || lot.name;
                    if (window.PlatesManager) {
                        window.PlatesManager.addPlate(plateNumber, 'p2p_buy_local');
                    } else {
                        if (!window.state.player.platesInventory) window.state.player.platesInventory = [];
                        window.state.player.platesInventory.push({
                            id: 'plate_' + Date.now(),
                            number: String(plateNumber).trim().toUpperCase(),
                            region: 77,
                            status: 'inventory',
                            installedCarId: null,
                            ownerId: window.state.player.uid || 'player_local',
                            source: 'p2p_buy_local_fallback',
                            createdAt: Date.now()
                        });
                    }
                }

                window.state.p2pMarketListings = window.state.p2pMarketListings.filter(l => l.id !== msg.p2pId);
                window.state.player.phoneMessages = window.state.player.phoneMessages.filter(m => m.id !== msgId);
                if (typeof saveState === 'function') saveState();
                if (typeof updateHeaderUI === 'function') updateHeaderUI();

                // Публикуем событие
                if (window.EventBus) {
                    window.EventBus.emit('p2p:lot_bought', {
                        lotId: msg.p2pId,
                        sellerId: lot.sellerId,
                        price: finalPrice,
                        itemType: lot.type
                    });
                }

                this.activeDialogId = null;
                this.render(document.getElementById('phoneAppContainer'));
                if (typeof openVerdictModal === 'function') {
                    openVerdictModal("P2P СДЕЛКА ЗАКРЫТА! 🤝", `Вы выкупили лот за ${Number(finalPrice).toLocaleString()} ₽!`, true, finalPrice);
                }
                return;
            }

            // Сделка с NPC-покупателем
            let slot = null;
            if (msg.carUid) slot = this.findLotByUid(msg.carUid);
            if (!slot && msg.carIndex !== undefined) slot = window.state.salesLot?.[msg.carIndex];

            if (!slot) {
                showToast("⚠️ Лот больше не на площадке.");
                this.deleteOrphanDialog(msgId);
                return;
            }

            let finalPrice = msg.offerPrice || slot.currentBuyer?.currentOffer || slot.buyer?.currentOffer || slot.askingPrice;
            let idx = window.state.salesLot.indexOf(slot);

            if (idx === -1) {
                showToast("⚠️ Лот потерян.");
                this.deleteOrphanDialog(msgId);
                return;
            }

            if (typeof finishSalesLotDeal === 'function') {
                let car = slot.car || slot;
                let purchaseCost = car.purchaseCost || Math.round(finalPrice * 0.75);
                let profit = finalPrice - purchaseCost;
                finishSalesLotDeal(idx, finalPrice, profit);
            }

            window.state.player.phoneMessages = window.state.player.phoneMessages.filter(m => m.id !== msgId);
            if (typeof saveState === 'function') saveState();
            this.activeDialogId = null;
            this.render(document.getElementById('phoneAppContainer'));
        } finally {
            this._buyPending = false;
        }
    },

    // ====================================================
    // 2. ВКЛАДКА: «P2P БИРЖА»
    // ====================================================
    renderMarketScreen(container) {
        if (!container) return;

        let f = this.marketFilter || 'cars';
        let pLvl = window.state.player?.level || 1;

        container.innerHTML = `
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.12), #090e18); border-color: rgba(0, 230, 118, 0.35);">
                <div>
                    <b class="text-xs color-green"><i class="fa-solid fa-globe"></i> Онлайн P2P Биржа имущества</b>
                    <div class="sub-label" style="font-size:8.5px;">Торговля машинами, номерами, бизнесом и жильём</div>
                </div>
                <button onclick="AppM.openCreateListingModal()" class="btn btn-green btn-auto btn-sm" style="font-size:9px; padding:4px 8px;">
                    + Выставить
                </button>
            </div>

            <div class="grid-4 mb-2">
                <button onclick="AppM.setMarketFilter('cars')" class="btn ${f === 'cars' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">🚗 Авто</button>
                <button onclick="AppM.setMarketFilter('plates')" class="btn ${f === 'plates' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">${pLvl >= 3 ? '🏷 Номера' : '🔒 Номера (3 ур.)'}</button>
                <button onclick="AppM.setMarketFilter('housing')" class="btn ${f === 'housing' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">${pLvl >= 4 ? '🏠 Жильё' : '🔒 Жильё (4 ур.)'}</button>
                <button onclick="AppM.setMarketFilter('business')" class="btn ${f === 'business' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">${pLvl >= 6 ? '💼 Бизнес' : '🔒 Бизнес (6 ур.)'}</button>
            </div>

            <div id="p2pLotsArea">
                ${this.renderP2PLotsHtml(f)}
            </div>
        `;
    },

    setMarketFilter(filter) {
        let pLvl = window.state.player?.level || 1;
        if (filter === 'plates' && pLvl < 3) return showToast("Категория «Номера» на бирже доступна с 3 уровня!");
        if (filter === 'housing' && pLvl < 4) return showToast("Категория «Жильё» на бирже доступна с 4 уровня!");
        if (filter === 'business' && pLvl < 6) return showToast("Категория «Бизнес» на бирже доступна с 6 уровня!");

        this.marketFilter = filter;
        if (window.AudioFx) window.AudioFx.play('tick');
        const area = document.getElementById('p2pLotsArea');
        if (area) area.innerHTML = this.renderP2PLotsHtml(filter);
    },

    renderP2PLotsHtml(filter) {
        let lots = window.state.p2pMarketListings || [];
        if (lots.length === 0) {
            return `<div class="glass-card text-center sub-label py-6" style="background:#090e18;">В категории «${filter.toUpperCase()}» активных лотов пока нет.</div>`;
        }

        let filtered = lots.filter(l => {
            if (filter === 'cars') return l.type === 'car' || l.type === 'cars';
            if (filter === 'plates') return l.type === 'plate' || l.type === 'plates';
            return l.type === filter;
        });

        if (filtered.length === 0) {
            return `<div class="glass-card text-center sub-label py-6" style="background:#090e18;">В категории «${filter.toUpperCase()}» активных лотов пока нет.</div>`;
        }

        const myUid = String(window.state.player?.uid || window.tgUserId || "guest_777");
        const myName = String(window.state.player?.name || 'me');

        return filtered.map(item => {
            let isMine = (item.sellerId && String(item.sellerId) === myUid) || (String(item.sellerName) === myName);

            let actionBtn = isMine
                ? `<button onclick="AppM.cancelP2PListing('${item.id}')" class="btn btn-danger btn-sm w-full font-bold">Снять свой лот с продажи</button>`
                : `<div class="grid-2" style="gap:4px;">
                       <button onclick="AppM.sendTradeOfferForLot('${item.id}')" class="btn btn-purple btn-sm font-bold" style="padding:6px 2px; font-size:9.5px;">
                           <i class="fa-solid fa-arrows-rotate mr-1"></i> Обмен ⚔️
                       </button>
                       <button onclick="AppM.startBuyP2P('${item.id}')" class="btn btn-green btn-sm font-bold" style="padding:6px 2px; font-size:9.5px;">
                           <i class="fa-solid fa-ruble-sign mr-1"></i> Купить ${Number(item.price).toLocaleString()} ₽
                       </button>
                   </div>`;

            let descText = "";
            let imgBlockHtml = "";
            let animClass = "";

            if (item.type === 'cars' || item.type === 'car') {
                let rawImg = item.itemData?.img || item.img || "assets/cars/economy/2101/vaz-2101.jpg";
                let carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
                let fallbackImg = (typeof getCategoryFallback === 'function') ? getCategoryFallback(item.itemData?.type || 'economy') : "assets/cars/economy/2101/vaz-2101.jpg";

                let plateStr = item.itemData?.plate ? `<span class="license-plate" style="font-size:9.5px; padding:1px 5px;">${item.itemData.plate}</span>` : '';
                let tuningObj = item.itemData?.tuning || {};
                let tuningCount = Object.keys(tuningObj).filter(k => tuningObj[k] === true).length;
                let tuningDesc = tuningCount > 0 ? `⚡ Тюнинг (модификаций: ${tuningCount})` : '📦 Стоковое состояние';
                let vinStr = item.itemData?.vin ? `<div class="sub-label font-mono mt-1" style="font-size:8px; color:var(--cyan);">VIN: ${item.itemData.vin}</div>` : '';

                descText = `Мощность: <b>${item.itemData?.power || 100} л.с.</b> • Кузов: ${item.itemData?.condition || 85}%<br>${tuningDesc}${vinStr}`;

                imgBlockHtml = `
                    <div class="car-img-wrap mb-2" style="height:115px; position:relative; border-radius:10px; overflow:hidden;">
                        <img src="${carImg}" class="car-img" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='${fallbackImg}';">
                        <div class="badge-tag badge-tl" style="top:6px; left:6px;">${plateStr}</div>
                        <div class="badge-tag badge-br">${isMine ? '<span class="tag-badge bg-tag-green">ВАШ ЛОТ</span>' : '<span class="tag-badge bg-tag-cyan">АВТО P2P</span>'}</div>
                    </div>
                `;
            } else if (item.type === 'business') {
                let bData = item.itemData || {};
                let bName = bData.customName || item.name;
                let bIncome = bData.income || 25000;
                let skinId = bData.coverSkin || 'classic';
                let skin = (typeof window.BUSINESS_COVER_SKINS !== 'undefined')
                    ? window.BUSINESS_COVER_SKINS.find(s => s.id === skinId)
                    : null;
                let stickerId = bData.vipSticker || 'none';
                let sticker = (typeof window.BUSINESS_VIP_STICKERS !== 'undefined')
                    ? window.BUSINESS_VIP_STICKERS.find(s => s.id === stickerId)
                    : null;
                let titleStyleId = bData.titleStyle || 'default';
                let titleStyle = (typeof window.BUSINESS_TITLE_STYLES !== 'undefined')
                    ? window.BUSINESS_TITLE_STYLES.find(t => t.id === titleStyleId)
                    : null;

                if (bData.cardAnimation && typeof window.BUSINESS_CARD_ANIMATIONS !== 'undefined') {
                    let aObj = window.BUSINESS_CARD_ANIMATIONS.find(a => a.id === bData.cardAnimation);
                    if (aObj) animClass = aObj.className || '';
                }

                let iconClass = skin?.icon || 'fa-briefcase';
                let colorHex = skin?.color || '#00e676';
                let titleFx = titleStyle?.className || '';
                let stickerHtml = (sticker && sticker.icon) ? `<span class="biz-vip-sticker ${sticker.cssClass || ''}">${sticker.icon}</span>` : '';

                let rawImg = bData.img || ('assets/business/' + (bData.bizId || 'wash') + '.jpg');
                let bizImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;

                descText = `Ежедневный доход: <b class="color-green">+${Number(bIncome).toLocaleString()} ₽/день</b> • Уровень точки: <b>${bData.level || 1}</b>`;

                imgBlockHtml = `
                    <div class="car-img-wrap mb-2" style="height:120px; position:relative; border-radius:10px; overflow:hidden;">
                        <img src="${bizImg}" class="car-img" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80'">
                        <div class="biz-cover-badge">
                            <div class="biz-brand-pill" style="border-color:${colorHex};">
                                <i class="fa-solid ${iconClass}" style="color:${colorHex};"></i>
                                <span class="biz-brand-name ${titleFx}">${bName}</span>
                            </div>
                            <span class="tag-badge ${isMine ? 'bg-tag-green' : 'bg-tag-cyan'}">${isMine ? 'ВАШ БИЗНЕС' : 'БИЗНЕС P2P'}</span>
                        </div>
                    </div>
                    <div class="flex-between mb-1">
                        <span class="sub-label" style="font-size:9px;">Стикер владельца:</span>
                        <div class="biz-income-badge-wrap">
                            ${stickerHtml}
                            <span class="tag-badge bg-tag-green font-bold">+${Number(bIncome).toLocaleString()} ₽/д</span>
                        </div>
                    </div>
                `;
            } else if (item.type === 'plate' || item.type === 'plates') {
                let plateStr = item.itemData?.plate || item.name;
                descText = `Архивный регистрационный знак РФ`;
                imgBlockHtml = `
                    <div class="p-3 mb-2 text-center" style="background:#050914; border-radius:10px; border:1px solid rgba(0, 242, 254, 0.3);">
                        <div class="license-plate" style="font-size:15px; padding:4px 10px; display:inline-flex;">${plateStr} <div class="license-flag">RUS</div></div>
                    </div>
                `;
            } else if (item.type === 'housing') {
                descText = `Объект недвижимости / Бокс`;
                imgBlockHtml = `
                    <div class="p-3 mb-2 text-center" style="background:#050914; border-radius:10px; border:1px solid rgba(255, 179, 0, 0.3);">
                        <b class="color-amber">${item.name}</b>
                    </div>
                `;
            } else {
                descText = `Лот категории ${item.type.toUpperCase()}`;
                imgBlockHtml = `
                    <div class="p-3 mb-2 text-center" style="background:#050914; border-radius:10px; border:1px solid rgba(0, 242, 254, 0.3);">
                        <b class="color-cyan">${item.name}</b>
                    </div>
                `;
            }

            return `
                <div class="glass-card mb-2 p-2 biz-card-compact ${animClass}" style="border-left: 3px solid ${isMine ? 'var(--green)' : 'var(--cyan)'}; background:#090e18;">
                    ${imgBlockHtml}
                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs color-cyan" style="font-size:12px;">${item.name}</b>
                            <div class="sub-label" style="font-size:8.5px;">Продавец: <b class="color-amber">${isMine ? 'Вы (Владелец)' : (item.sellerName || 'Игрок')}</b></div>
                        </div>
                        <span class="price-val text-xs color-green">${Number(item.price).toLocaleString()} ₽</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9.5px; color:#cbd5e1; line-height:1.3;">${descText}</div>
                    ${actionBtn}
                </div>
            `;
        }).join('');
    },

    // ====================================================
    // 3. ВЫСТАВЛЕНИЕ ИМУЩЕСТВА
    // ====================================================
    selectP2PListingType(type) {
        this.selectedListingType = type;
        this.selectedItemIndex = null;

        const elMap = { cars: 'btnP2PTypeCar', plates: 'btnP2PTypePlate', business: 'btnP2PTypeBiz', housing: 'btnP2PTypeHouse' };
        ['cars', 'plates', 'business', 'housing'].forEach(t => {
            let btn = document.getElementById(elMap[t]);
            if (btn) btn.className = t === type ? 'btn btn-cyan btn-sm' : 'btn btn-dark btn-sm';
        });

        this.renderP2PCardsList(type);
    },

    renderP2PCardsList(type) {
        const container = document.getElementById('p2pCardsListContainer');
        if (!container) return;

        let html = '';

        if (type === 'cars' || type === 'car') {
            let garage = (window.state.garage || []).filter(c => c && typeof c === 'object');
            if (garage.length === 0) {
                html = `<div class="glass-card p-3 text-center sub-label" style="background:#050914;">В гараже пока нет машин для выставления.</div>`;
            } else {
                garage.forEach((car, idx) => {
                    let rawImg = car.img || "assets/cars/economy/2101/vaz-2101.jpg";
                    let carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
                    let fallbackImg = (typeof getCategoryFallback === 'function') ? getCategoryFallback(car.type || 'economy') : "assets/cars/economy/2101/vaz-2101.jpg";
                    let plateStr = car.plate ? `<span class="license-plate" style="font-size:9px; padding:1px 5px;">${car.plate}</span>` : '<span class="sub-label">ТРАНЗИТ</span>';
                    let isSelected = this.selectedItemIndex === idx;

                    html += `
                        <div onclick="AppM.pickP2PItemCard(${idx})" id="p2pCardItem_${idx}" class="glass-card p-2 cursor-pointer flex-gap" style="align-items:center; background:#050914; border: 1.5px solid ${isSelected ? 'var(--cyan)' : 'rgba(255,255,255,0.08)'}; border-radius:10px;">
                            <img src="${carImg}" style="width:72px; height:48px; min-width:72px; object-fit:cover; border-radius:6px;" onerror="this.onerror=null; this.src='${fallbackImg}';">
                            <div style="flex:1; min-width:0;">
                                <div class="flex-between">
                                    <b class="text-xs color-cyan" style="font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${car.name || 'Автомобиль'}</b>
                                    ${plateStr}
                                </div>
                                <div class="sub-label mt-1" style="font-size:8.5px;">Мощность: <b>${car.power || 100} л.с.</b> • Состояние: <b>${car.condition || 85}%</b></div>
                            </div>
                        </div>
                    `;
                });
            }
        } else if (type === 'plates' || type === 'plate') {
            let plates = [];
            if (window.PlatesManager) {
                plates = window.PlatesManager.getFreePlates().map(p => p.number);
            } else {
                plates = window.state.ownedPlates || ['А777АА 77'];
            }

            if (plates.length === 0) {
                html = `<div class="glass-card p-3 text-center sub-label" style="background:#050914;">У вас нет свободных номеров в инвентаре.</div>`;
            } else {
                plates.forEach((plate, idx) => {
                    let isSelected = this.selectedItemIndex === idx;
                    html += `
                        <div onclick="AppM.pickP2PItemCard(${idx})" id="p2pCardItem_${idx}" class="glass-card p-2 cursor-pointer flex-between" style="background:#050914; border: 1.5px solid ${isSelected ? 'var(--cyan)' : 'rgba(255,255,255,0.08)'}; border-radius:10px;">
                            <div>
                                <span class="license-plate" style="font-size:12px; padding:2px 8px;">${plate}</span>
                                <div class="sub-label mt-1" style="font-size:8.5px;">Архивный регистрационный знак РФ</div>
                            </div>
                            <i class="fa-solid ${isSelected ? 'fa-circle-check color-cyan' : 'fa-circle-dot'} text-xs"></i>
                        </div>
                    `;
                });
            }
        } else if (type === 'business') {
            let bizList = (window.state.businesses || []).filter(b => b && (b.level || 0) > 0);
            if (bizList.length === 0) {
                html = `<div class="glass-card p-3 text-center sub-label" style="background:#050914;">У вас пока нет купленных предприятий.</div>`;
            } else {
                bizList.forEach((b, idx) => {
                    let isSelected = this.selectedItemIndex === idx;
                    let displayName = b.customName || b.name;
                    let stickerIcon = '';
                    if (b.vipSticker && typeof window.BUSINESS_VIP_STICKERS !== 'undefined') {
                        let st = window.BUSINESS_VIP_STICKERS.find(s => s.id === b.vipSticker);
                        if (st && st.icon) stickerIcon = st.icon + ' ';
                    }

                    html += `
                        <div onclick="AppM.pickP2PItemCard(${idx})" id="p2pCardItem_${idx}" class="glass-card p-2 cursor-pointer flex-between" style="background:#050914; border: 1.5px solid ${isSelected ? 'var(--cyan)' : 'rgba(255,255,255,0.08)'}; border-radius:10px;">
                            <div>
                                <b class="text-xs color-green">${stickerIcon}${displayName} (Ур. ${b.level || 1})</b>
                                <div class="sub-label mt-1" style="font-size:8.5px;">Касса: +${Number((b.income || 1000) * b.level).toLocaleString()} ₽/д | Обложка: <b>${b.coverSkin || 'classic'}</b></div>
                            </div>
                            <i class="fa-solid ${isSelected ? 'fa-circle-check color-cyan' : 'fa-circle-dot'} text-xs"></i>
                        </div>
                    `;
                });
            }
        } else if (type === 'housing') {
            let houses = window.state.player?.ownedHouses || [];
            if (houses.length === 0) {
                html = `<div class="glass-card p-3 text-center sub-label" style="background:#050914;">У вас пока нет недвижимости в собственности.</div>`;
            } else {
                houses.forEach((hId, idx) => {
                    let isSelected = this.selectedItemIndex === idx;
                    html += `
                        <div onclick="AppM.pickP2PItemCard(${idx})" id="p2pCardItem_${idx}" class="glass-card p-2 cursor-pointer flex-between" style="background:#050914; border: 1.5px solid ${isSelected ? 'var(--cyan)' : 'rgba(255,255,255,0.08)'}; border-radius:10px;">
                            <div>
                                <b class="text-xs color-amber">Объект: ${hId}</b>
                                <div class="sub-label mt-1" style="font-size:8.5px;">Собственный бокс / Недвижимость</div>
                            </div>
                            <i class="fa-solid ${isSelected ? 'fa-circle-check color-cyan' : 'fa-circle-dot'} text-xs"></i>
                        </div>
                    `;
                });
            }
        }

        container.innerHTML = html;

        if (this.selectedItemIndex === null) {
            let hasItems = (type === 'cars' && (window.state.garage || []).length > 0) ||
                           (type === 'plates' && (window.state.player?.platesInventory || []).filter(p => p.status === 'inventory').length > 0) ||
                           (type === 'business' && (window.state.businesses || []).some(b => b && b.level > 0)) ||
                           (type === 'housing' && (window.state.player?.ownedHouses || []).length > 0);
            if (hasItems) this.pickP2PItemCard(0);
        }
    },

    pickP2PItemCard(idx) {
        this.selectedItemIndex = idx;
        const type = this.selectedListingType;

        const cards = document.querySelectorAll('[id^="p2pCardItem_"]');
        cards.forEach(c => {
            c.style.border = '1.5px solid rgba(255,255,255,0.08)';
            c.style.boxShadow = 'none';
        });

        const activeCard = document.getElementById(`p2pCardItem_${idx}`);
        if (activeCard) {
            activeCard.style.border = '1.5px solid var(--cyan)';
            activeCard.style.boxShadow = '0 0 14px var(--cyan-glow)';
        }

        const priceInput = document.getElementById('p2pPriceInput');
        if (priceInput) {
            if (type === 'cars') {
                let car = (window.state.garage || [])[idx];
                if (car) priceInput.value = Math.round((car.price || car.marketValue || 150000) * 1.15);
            } else if (type === 'plates') {
                priceInput.value = 500000;
            } else if (type === 'business') {
                let b = (window.state.businesses || []).filter(x => x && x.level > 0)[idx];
                if (b) priceInput.value = Math.round((b.cost || 200000) * (b.level || 1) * 1.3);
            } else if (type === 'housing') {
                priceInput.value = 1500000;
            }
        }

        if (window.AudioFx) window.AudioFx.play('tick');
    },

    async confirmCreateP2PListing() {
        if (this._publishPending) return;
        this._publishPending = true;

        try {
            const priceInput = document.getElementById('p2pPriceInput');
            if (!priceInput) return;

            let price = parseInt(priceInput.value, 10);
            let idx = this.selectedItemIndex;

            if (idx === null || idx === undefined || isNaN(price) || price <= 500) {
                return showToast("Выберите объект и укажите цену!");
            }

            let type = this.selectedListingType;
            let myName = window.state.player?.name || 'Перекуп #777';
            let myUid = String(window.state.player?.uid || window.tgUserId || "guest_777");

            let newListing = {
                id: "p2p_item_" + Date.now(),
                sellerId: myUid,
                sellerName: myName,
                type: type,
                price: price,
                itemData: {}
            };

            if (type === 'cars') {
                let car = window.state.garage[idx];
                if (!car) return showToast("Машина не найдена в гараже!");
                if (typeof window.ensureCarIdentity === 'function') {
                    window.ensureCarIdentity(car);
                }
                newListing.name = car.name;
                newListing.itemData = Object.assign({}, car);
                window.state.garage.splice(idx, 1);
                if (typeof renderGarage === 'function') renderGarage();
            } else if (type === 'plates') {
                let plates = [];
                if (window.PlatesManager) {
                    plates = window.PlatesManager.getFreePlates().map(p => p.number);
                } else {
                    plates = window.state.ownedPlates || ['А777АА 77'];
                }

                let plateStr = plates[idx] || 'В777ВВ 77';
                newListing.name = `Госномер ${plateStr}`;
                newListing.itemData = { plate: plateStr };

                if (window.PlatesManager) {
                    const plateObj = window.state.player?.platesInventory?.find(p => p.number === plateStr);
                    if (plateObj) {
                        plateObj.status = 'on_sale';
                    }
                } else {
                    window.state.ownedPlates = plates.filter((_, i) => i !== idx);
                }
            } else if (type === 'business') {
                let bizList = (window.state.businesses || []).filter(b => b && b.level > 0);
                let b = bizList[idx];
                if (!b) return showToast("Бизнес не найден!");
                newListing.name = b.customName || b.name;
                newListing.itemData = {
                    bizId: b.id,
                    level: b.level,
                    income: (b.income || 1000) * b.level,
                    customName: b.customName || b.name,
                    coverSkin: b.coverSkin || 'classic',
                    cardAnimation: b.cardAnimation || 'none',
                    vipSticker: b.vipSticker || 'none',
                    titleStyle: b.titleStyle || 'default',
                    upgrades: b.upgrades || {}
                };
                b.level = 0;
                b.stored = 0;
            } else if (type === 'housing') {
                let houses = window.state.player?.ownedHouses || [];
                let hId = houses[idx] || 'gsk_box';
                newListing.name = `Бокс (${hId})`;
                newListing.itemData = { houseId: hId, slots: 2 };
                window.state.player.ownedHouses = window.state.player.ownedHouses.filter(id => id !== hId);
            }

            if (window.FB_Bridge?.MarketLots?.publishLot) {
                try {
                    showToast("Публикация в облако Firestore...");
                    let pubRes = await window.FB_Bridge.MarketLots.publishLot(newListing, { id: myUid, name: myName });
                    if (pubRes && pubRes.lotId) newListing.id = pubRes.lotId;
                    if (pubRes && pubRes.success === false) {
                        return showToast(`❌ ${pubRes.error || 'Ошибка публикации'}`);
                    }
                } catch (e) {
                    console.warn("[P2P] Ошибка облачной публикации:", e);
                }
            }

            if (!window.state.p2pMarketListings) window.state.p2pMarketListings = [];
            window.state.p2pMarketListings.unshift(newListing);

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();

            // Публикуем событие
            if (window.EventBus) {
                window.EventBus.emit('p2p:lot_published', { lotId: newListing.id, price, itemType: type });
            }

            if (typeof ModalManager !== 'undefined') {
                ModalManager.close('modalCreateP2P');
            } else {
                let m = document.getElementById('modalCreateP2P');
                if (m) m.classList.remove('active');
            }

            showToast("✓ Объект успешно выставлен на биржу!");
            this.render(document.getElementById('phoneAppContainer'));
        } finally {
            this._publishPending = false;
        }
    },

    async cancelP2PListing(lotId) {
        if (!confirm("Снять лот с биржи?")) return;

        let lot = (window.state.p2pMarketListings || []).find(l => l.id === lotId);
        if (!lot) return;

        if (window.FB_Bridge?.MarketLots?.cancelLot) {
            try {
                await window.FB_Bridge.MarketLots.cancelLot(lotId, window.state.player?.uid);
            } catch (e) {
                console.warn('[AppM] cancelLot error:', e);
            }
        }

        if (lot.type === 'business') {
            let b = (window.state.businesses || []).find(x => x.id === (lot.itemData?.bizId || lot.name));
            if (b) {
                b.level = lot.itemData?.level || 1;
                b.customName = lot.itemData?.customName || lot.name;
                b.coverSkin = lot.itemData?.coverSkin || 'classic';
                b.cardAnimation = lot.itemData?.cardAnimation || 'none';
                b.vipSticker = lot.itemData?.vipSticker || 'none';
                b.titleStyle = lot.itemData?.titleStyle || 'default';
            }
        } else if (lot.type === 'car' || lot.type === 'cars') {
            if (!window.state.garage) window.state.garage = [];
            window.state.garage.push(lot.itemData);
            if (typeof renderGarage === 'function') renderGarage();
        } else if (lot.type === 'plate' || lot.type === 'plates') {
            let plateNumber = lot.itemData?.plate || lot.name;
            if (window.PlatesManager) {
                const plateObj = window.state.player?.platesInventory?.find(p => p.number === plateNumber);
                if (plateObj) {
                    plateObj.status = 'inventory';
                } else {
                    window.PlatesManager.addPlate(plateNumber, 'p2p_cancel', { silent: true });
                }
            } else {
                if (!window.state.player.platesInventory) window.state.player.platesInventory = [];
                const existing = window.state.player.platesInventory.find(p => p.number === plateNumber);
                if (existing) {
                    existing.status = 'inventory';
                } else {
                    window.state.player.platesInventory.push({
                        id: 'plate_' + Date.now(),
                        number: String(plateNumber).trim().toUpperCase(),
                        region: 77,
                        status: 'inventory',
                        installedCarId: null,
                        ownerId: window.state.player.uid || 'player_local',
                        source: 'p2p_cancel_fallback',
                        createdAt: Date.now()
                    });
                }
            }
        }

        window.state.p2pMarketListings = (window.state.p2pMarketListings || []).filter(l => l.id !== lotId);
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();

        // Публикуем событие
        if (window.EventBus) {
            window.EventBus.emit('p2p:lot_cancelled', { lotId, itemType: lot.type });
        }

        showToast("Лот снят с биржи и возвращён владельцу.");
        this.render(document.getElementById('phoneAppContainer'));
    },

    startBuyP2P(lotId) {
        let lot = (window.state.p2pMarketListings || []).find(l => l.id === lotId);
        if (!lot) return;

        if (typeof openP2PDealModal === 'function') {
            openP2PDealModal(lot.id);
        } else {
            showToast("⚠️ Модуль торга недоступен");
        }
    },

    sendTradeOfferForLot(lotId) {
        let lot = (window.state.p2pMarketListings || []).find(l => l.id === lotId);
        if (!lot) return;

        let myGarage = (window.state.garage || []).filter(c => c && typeof c === 'object' && !c.isPersonal);
        if (myGarage.length === 0) {
            return showToast("⚠️ У вас нет машин для обмена!");
        }

        let options = myGarage.map((c, i) => `<option value="${i}">${c.name} (${c.power || 100} л.с.)</option>`).join('');

        let modal = document.getElementById('modalTradeOffer');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalTradeOffer';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-box" style="max-width: 400px;">
                <div class="flex-between mb-2">
                    <div class="modal-glow-badge" style="color:var(--purple); border-color:var(--purple);">
                        <i class="fa-solid fa-arrows-rotate mr-1"></i> ПРЕДЛОЖИТЬ ОБМЕН
                    </div>
                    <button onclick="ModalManager.close('modalTradeOffer')" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                <div class="glass-card p-2 mb-2" style="background:#090e18;">
                    <span class="sub-label" style="font-size:9px;">Вы предлагаете обмен на:</span>
                    <b class="text-xs color-cyan block mt-1">${lot.name}</b>
                    <div class="sub-label mt-1" style="font-size:9px;">Цена лота: <b class="color-green">${Number(lot.price).toLocaleString()} ₽</b></div>
                </div>

                <div class="mb-2">
                    <label class="sub-label block mb-1" style="font-size:9.5px;">Выберите свою машину для обмена:</label>
                    <select id="tradeOfferCarSelect" class="chat-input" style="font-size:11px; padding:8px;">
                        ${options}
                    </select>
                </div>

                <div class="mb-3">
                    <label class="sub-label block mb-1" style="font-size:9.5px;">Сообщение (опционально):</label>
                    <input type="text" id="tradeOfferMessage" class="chat-input" maxlength="120" placeholder="Обмен + доплата 50k ₽..." style="font-size:11px; padding:8px;">
                </div>

                <button onclick="AppM.confirmSendTradeOffer('${lotId}')" class="btn btn-purple w-full font-bold">
                    <i class="fa-solid fa-paper-plane mr-1"></i> Отправить предложение
                </button>
            </div>
        `;

        ModalManager.open('modalTradeOffer');
    },

    async confirmSendTradeOffer(lotId) {
        let lot = (window.state.p2pMarketListings || []).find(l => l.id === lotId);
        if (!lot) return;

        const selectEl = document.getElementById('tradeOfferCarSelect');
        const msgEl = document.getElementById('tradeOfferMessage');
        if (!selectEl) return;

        let idx = parseInt(selectEl.value, 10);
        let myGarage = (window.state.garage || []).filter(c => c && typeof c === 'object' && !c.isPersonal);
        let myCar = myGarage[idx];
        if (!myCar) return showToast("Машина не найдена!");

        let message = (msgEl?.value || '').trim();

        if (!window.FB_Bridge?.P2PTrade?.sendTradeOffer) {
            return showToast("⚠️ Модуль обмена недоступен");
        }

        showToast("⏳ Отправка предложения...");

        const res = await window.FB_Bridge.P2PTrade.sendTradeOffer(lot.sellerId, {
            myItem: {
                type: 'car',
                name: myCar.name,
                uid: myCar.uid || myCar.id,
                power: myCar.power,
                marketValue: myCar.marketValue || myCar.basePrice
            },
            theirItemId: lotId,
            message: message
        });

        if (res && res.success) {
            ModalManager.close('modalTradeOffer');
            if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
            showToast(`✅ Предложение отправлено игроку ${lot.sellerName}!`);
        } else {
            showToast(`❌ Ошибка: ${res?.error || 'неизвестная'}`);
        }
    },

    // ====================================================
    // 4. ВКЛАДКА: «ТРЕЙД»
    // ====================================================
    renderTradeScreen(container) {
        if (!container) return;

        const sub = this.tradeSubTab || 'incoming';

        container.innerHTML = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(192,132,252,0.14), #090e18); border-color: var(--purple);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-purple"><i class="fa-solid fa-arrows-rotate mr-1"></i> Трейд с игроками</b>
                    <span class="tag-badge bg-tag-purple">ОБМЕН</span>
                </div>
                <div class="sub-label" style="font-size:9px;">Предложения обмена имуществом между игроками</div>
            </div>

            <div class="grid-2 mb-2">
                <button onclick="AppM.setTradeSubTab('incoming')" class="btn ${sub === 'incoming' ? 'btn-purple' : 'btn-dark'} btn-sm" style="font-size:10px;">
                    <i class="fa-solid fa-inbox mr-1"></i> Входящие
                </button>
                <button onclick="AppM.setTradeSubTab('outgoing')" class="btn ${sub === 'outgoing' ? 'btn-purple' : 'btn-dark'} btn-sm" style="font-size:10px;">
                    <i class="fa-solid fa-paper-plane mr-1"></i> Исходящие
                </button>
            </div>

            <div id="mTradeListBox">
                <div class="text-center p-3 sub-label" style="font-size:9.5px;">
                    <div class="radar-spinner-ring mb-1" style="margin:0 auto; width:22px; height:22px;"></div>
                    Синхронизация офферов...
                </div>
            </div>
        `;

        this._refreshTradeList();
    },

    setTradeSubTab(sub) {
        this.tradeSubTab = sub;
        if (window.AudioFx) window.AudioFx.play('tick');
        this._refreshTradeList();
    },

    async _refreshTradeList() {
        const box = document.getElementById('mTradeListBox');
        if (!box) return;

        const sub = this.tradeSubTab || 'incoming';
        const myUid = window.TelegramAuthManager?.getVerifiedUserId() || window.state.player?.uid;
        if (!myUid) {
            box.innerHTML = `<div class="glass-card p-3 text-center sub-label">Нет UID</div>`;
            return;
        }

        let offers = [];

        if (window.FB_Bridge?.P2PTrade?.fetchTradeOffers) {
            try {
                const res = await window.FB_Bridge.P2PTrade.fetchTradeOffers(myUid);
                offers = sub === 'incoming' ? (res.incoming || []) : (res.outgoing || []);
            } catch (e) {
                console.warn('[AppM] fetchTradeOffers error:', e);
            }
        }

        if (offers.length === 0) {
            box.innerHTML = `
                <div class="glass-card text-center sub-label py-6" style="background:#090e18;">
                    <i class="fa-solid fa-arrows-rotate color-purple mb-2" style="font-size:26px;"></i>
                    <div>${sub === 'incoming' ? 'Нет входящих предложений' : 'Нет отправленных предложений'}</div>
                    <div class="text-xs mt-1">Предлагайте обмен прямо с биржи лотов!</div>
                </div>
            `;
            return;
        }

        box.innerHTML = offers.map(offer => {
            let isIncoming = sub === 'incoming';
            let timeAgo = this._formatTimeAgo(offer.createdAt);

            return `
                <div class="glass-card mb-2 p-2" style="border-left: 3px solid var(--purple); background:#090e18;">
                    <div class="flex-between mb-2">
                        <div>
                            <b class="text-xs color-purple">${isIncoming ? offer.fromUserName : offer.toUserName || 'Получатель'}</b>
                            <div class="sub-label" style="font-size:8.5px;">${timeAgo}</div>
                        </div>
                        <span class="tag-badge bg-tag-purple">ОБМЕН</span>
                    </div>

                    <div class="grid-2 mb-2" style="gap:6px;">
                        <div class="p-2" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                            <span class="sub-label" style="font-size:8px;">ОТ НЕГО:</span>
                            <div class="text-xs font-bold mt-1">${offer.myItem?.name || 'Объект'}</div>
                        </div>
                        <div class="p-2" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                            <span class="sub-label" style="font-size:8px;">ЗА ВАШЕ:</span>
                            <div class="text-xs font-bold mt-1">${offer.theirItemId || 'Лот'}</div>
                        </div>
                    </div>

                    ${offer.message ? `
                        <div class="seller-dialog-bubble my-2" style="border-left: 3px solid var(--purple); background: rgba(192, 132, 252, 0.04); padding: 6px 10px; border-radius: 6px;">
                            <span class="sub-label" style="font-size:9.5px; color:#cbd5e1;">${offer.message}</span>
                        </div>
                    ` : ''}

                    ${isIncoming ? `
                        <div class="grid-2" style="gap:4px;">
                            <button onclick="AppM.acceptTradeOffer('${offer.id}')" class="btn btn-green btn-sm font-bold">
                                <i class="fa-solid fa-check mr-1"></i> Принять
                            </button>
                            <button onclick="AppM.rejectTradeOffer('${offer.id}')" class="btn btn-danger btn-sm font-bold">
                                <i class="fa-solid fa-xmark mr-1"></i> Отклонить
                            </button>
                        </div>
                    ` : `
                        <button onclick="AppM.cancelTradeOffer('${offer.id}')" class="btn btn-dark btn-sm w-full">
                            <i class="fa-solid fa-xmark mr-1"></i> Отменить предложение
                        </button>
                    `}
                </div>
            `;
        }).join('');
    },

    async acceptTradeOffer(offerId) {
        if (!confirm("Принять предложение обмена? Убедитесь, что согласны с условиями.")) return;

        if (!window.FB_Bridge?.P2PTrade?.acceptTradeOffer) {
            return showToast("⚠️ Модуль обмена недоступен");
        }

        showToast("⏳ Обработка...");
        const res = await window.FB_Bridge.P2PTrade.acceptTradeOffer(offerId);

        if (res && res.success) {
            if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
            showToast("✅ Оффер принят! Свяжитесь с игроком для оформления.");
            this._refreshTradeList();
        } else {
            showToast(`❌ Ошибка: ${res?.error || 'неизвестная'}`);
        }
    },

    async rejectTradeOffer(offerId) {
        if (!confirm("Отклонить предложение?")) return;

        if (!window.FB_Bridge?.P2PTrade?.rejectTradeOffer) {
            return showToast("⚠️ Модуль обмена недоступен");
        }

        const res = await window.FB_Bridge.P2PTrade.rejectTradeOffer(offerId);
        if (res && res.success) {
            showToast("Оффер отклонён.");
            this._refreshTradeList();
        } else {
            showToast(`❌ ${res?.error || 'Ошибка'}`);
        }
    },

    async cancelTradeOffer(offerId) {
        if (!confirm("Отменить своё предложение?")) return;

        if (!window.FB_Bridge?.P2PTrade?.cancelTradeOffer) return;
        const res = await window.FB_Bridge.P2PTrade.cancelTradeOffer(offerId);
        if (res && res.success) {
            showToast("Оффер отменён.");
            this._refreshTradeList();
        }
    },

    // ====================================================
    // 5. ВКЛАДКА: «ДРУЗЬЯ»
    // ====================================================
    renderFriendsScreen(container) {
        if (!container) return;

        const sub = this.friendsSubTab || 'friends';

        container.innerHTML = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.14), #090e18); border-color: var(--green);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-green"><i class="fa-solid fa-user-group mr-1"></i> Друзья и напарники</b>
                    <span class="tag-badge bg-tag-green">СЕТЬ M+</span>
                </div>
                <div class="sub-label" style="font-size:9px;">Добавляйте перекупов, обменивайтесь лотами и катайтесь на треках</div>
            </div>

            <div class="grid-3 mb-2" style="gap:4px;">
                <button onclick="AppM.setFriendsSubTab('friends')" class="btn ${sub === 'friends' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:5px 2px;">
                    <i class="fa-solid fa-user-check mr-1"></i> Друзья
                </button>
                <button onclick="AppM.setFriendsSubTab('pending')" class="btn ${sub === 'pending' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:5px 2px; position:relative;">
                    <i class="fa-solid fa-user-plus mr-1"></i> Заявки
                    ${(window.state.player?.pendingFriendRequests || []).length > 0 ? `<span class="m-pill-badge" style="position:absolute; top:2px; right:2px; font-size:7px; padding:1px 4px;">${(window.state.player.pendingFriendRequests || []).length}</span>` : ''}
                </button>
                <button onclick="AppM.setFriendsSubTab('subscribed')" class="btn ${sub === 'subscribed' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:5px 2px;">
                    <i class="fa-solid fa-users mr-1"></i> Подписчики
                </button>
            </div>

            <div id="mFriendsListBox">
                <div class="text-center p-3 sub-label" style="font-size:9.5px;">
                    <div class="radar-spinner-ring mb-1" style="margin:0 auto; width:22px; height:22px;"></div>
                    Синхронизация...
                </div>
            </div>
        `;

        this._refreshFriendsList();
    },

    setFriendsSubTab(sub) {
        this.friendsSubTab = sub;
        if (window.AudioFx) window.AudioFx.play('tick');
        this._refreshFriendsList();
    },

    async _refreshFriendsList() {
        const box = document.getElementById('mFriendsListBox');
        if (!box) return;

        const sub = this.friendsSubTab || 'friends';
        const myUid = window.TelegramAuthManager?.getVerifiedUserId() || window.state.player?.uid;
        if (!myUid) {
            box.innerHTML = `<div class="glass-card p-3 text-center sub-label">Нет UID</div>`;
            return;
        }

        let data = { friends: [], pending: [], subscribed: [] };

        if (window.FB_Bridge?.Friendships?.fetchFriendships) {
            try {
                data = await window.FB_Bridge.Friendships.fetchFriendships(myUid);
                window.state.player.pendingFriendRequests = data.pending || [];
            } catch (e) {
                console.warn('[AppM] fetchFriendships error:', e);
            }
        }

        let list = [];
        if (sub === 'friends') list = data.friends || [];
        else if (sub === 'pending') list = data.pending || [];
        else list = data.subscribed || [];

        if (list.length === 0) {
            box.innerHTML = `
                <div class="glass-card text-center sub-label py-6" style="background:#090e18;">
                    <i class="fa-solid fa-user-group color-green mb-2" style="font-size:26px;"></i>
                    <div>${sub === 'friends' ? 'Список друзей пуст' : (sub === 'pending' ? 'Нет входящих заявок' : 'Нет подписчиков')}</div>
                    <div class="text-xs mt-1">${sub === 'friends' ? 'Добавляйте игроков со вкладки «Игроки»' : ''}</div>
                </div>
            `;
            return;
        }

        box.innerHTML = list.map(item => {
            if (sub === 'pending') {
                return `
                    <div class="glass-card mb-2 p-2" style="border-left: 3px solid var(--amber); background:#090e18;">
                        <div class="flex-between mb-2">
                            <div>
                                <b class="text-xs color-amber">${item.name || 'Перекуп'}</b>
                                <div class="sub-label" style="font-size:8.5px;">Хочет добавить в друзья</div>
                            </div>
                            <span class="tag-badge bg-tag-amber">ЗАЯВКА</span>
                        </div>
                        <div class="grid-2" style="gap:4px;">
                            <button onclick="AppM.acceptFriendRequest('${item.id}')" class="btn btn-green btn-sm font-bold">
                                <i class="fa-solid fa-check mr-1"></i> Принять
                            </button>
                            <button onclick="AppM.declineFriendRequest('${item.id}')" class="btn btn-dark btn-sm font-bold">
                                <i class="fa-solid fa-xmark mr-1"></i> Отклонить
                            </button>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="glass-card mb-2 p-2" style="border-left: 3px solid ${sub === 'friends' ? 'var(--green)' : 'var(--cyan)'}; background:#090e18;">
                    <div class="flex-between">
                        <div>
                            <b class="text-xs ${sub === 'friends' ? 'color-green' : 'color-cyan'}">${item.name || 'Перекуп'}</b>
                            <div class="sub-label" style="font-size:8.5px;">${sub === 'friends' ? 'Напарник' : 'Подписчик'}</div>
                        </div>
                        <div class="flex-gap">
                            ${sub === 'friends' ? `
                                <button onclick="AppM.openChatWithFriend('${item.id}', '${item.name}')" class="btn btn-cyan btn-sm btn-auto" style="font-size:9px; padding:4px 8px;">
                                    <i class="fa-solid fa-comments mr-1"></i> Написать
                                </button>
                            ` : ''}
                            <button onclick="AppM.removeFriend('${item.id}', '${item.name}')" class="btn btn-dark btn-sm btn-auto" style="font-size:9px; padding:4px 8px;">
                                <i class="fa-solid fa-user-minus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    async acceptFriendRequest(fromUserId) {
        if (!window.FB_Bridge?.Friendships?.acceptRequest) {
            return showToast("⚠️ Модуль друзей недоступен");
        }
        const res = await window.FB_Bridge.Friendships.acceptRequest(fromUserId);
        if (res && res.success) {
            if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
            showToast("✅ Заявка принята!");
            this._refreshFriendsList();
        } else {
            showToast(`❌ ${res?.error || 'Ошибка'}`);
        }
    },

    async declineFriendRequest(fromUserId) {
        if (!window.FB_Bridge?.Friendships?.declineRequest) return;
        const res = await window.FB_Bridge.Friendships.declineRequest(fromUserId);
        if (res && res.success) {
            showToast("Заявка отклонена. Игрок добавлен в подписчики.");
            this._refreshFriendsList();
        }
    },

    openChatWithFriend(friendUid, friendName) {
        if (!window.state.player.phoneMessages) window.state.player.phoneMessages = [];

        const myUid = String(window.state.player?.uid || window.tgUserId || "me");
        const dialogId = `dlg_friend_${[myUid, String(friendUid)].sort().join("_")}`;

        let existing = window.state.player.phoneMessages.find(m => m.id === dialogId);
        if (!existing) {
            existing = {
                id: dialogId,
                dialogId: dialogId,
                category: 'friends',
                sender: friendName,
                time: "Сейчас",
                unread: false,
                viewed: true,
                chatHistory: []
            };
            window.state.player.phoneMessages.unshift(existing);
        }

        if (typeof saveState === 'function') saveState();
        this.activeDialogId = dialogId;
        this.render(document.getElementById('phoneAppContainer'));
    },

    removeFriend(friendUid, friendName) {
        if (!confirm(`Удалить ${friendName} из друзей?`)) return;
        showToast("Функция удаления будет доступна в следующем обновлении.");
    },

    // ====================================================
    // 6. ВИЗИТКА
    // ====================================================
    renderProfileScreen(container) {
        if (!container) return;
        let p = window.state.player || {};
        let myCar = window.state.garage?.[0];
        let carName = myCar ? myCar.name : "Пешком";

        container.innerHTML = `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.18), #090e18); border-color: var(--cyan);">
                <div class="avatar mb-2" style="margin: 0 auto; width: 56px; height: 56px; font-size: 24px;">
                    <i class="fa-solid fa-user-ninja color-cyan"></i>
                </div>
                <h3 class="font-bold text-xs color-cyan" style="font-size:15px;">${p.name || 'Перекуп #777'}</h3>
                <div class="sub-label mt-1 font-bold color-amber">${p.traderTitle || 'Быстрый выкуп за кэш 💸'}</div>
                <div class="sub-label mt-1 font-mono" style="font-size:9px;">UID: ${p.uid || window.tgUserId || 'local'}</div>

                <div class="grid-2 mt-3" style="gap:6px;">
                    <div class="p-2 text-left" style="background:#060a12; border-radius:8px;">
                        <span class="sub-label" style="font-size:8px;">Авторитет:</span>
                        <div class="font-bold color-cyan text-xs mt-1">Уровень ${p.level || 1}</div>
                    </div>
                    <div class="p-2 text-left" style="background:#060a12; border-radius:8px;">
                        <span class="sub-label" style="font-size:8px;">Капитал (Net Worth):</span>
                        <div class="font-bold color-green text-xs mt-1">${Number(p.cash || 0).toLocaleString()} ₽</div>
                    </div>
                </div>
            </div>

            <div class="glass-card p-2 mb-2 flex-between" style="background:#090e18;">
                <div>
                    <span class="sub-label" style="font-size:8.5px;">Флагманский болид гаража:</span>
                    <div class="font-bold text-xs color-amber mt-1">${carName}</div>
                </div>
                <span class="tag-badge bg-tag-amber">ФЛАГМАН</span>
            </div>
        `;
    },

    // ====================================================
    // 7. ВСПОМОГАТЕЛЬНЫЕ
    // ====================================================
    _formatTimeAgo(timestamp) {
        if (!timestamp) return 'Недавно';
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Только что';
        if (minutes < 60) return `${minutes} мин назад`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} ч назад`;
        const days = Math.floor(hours / 24);
        return `${days} д назад`;
    },

    syncSalesLotBuyersToMessages() {
        if (!window.state.player) window.state.player = {};
        if (!window.state.player.phoneMessages) window.state.player.phoneMessages = [];
        if (!window.state.salesLot || window.state.salesLot.length === 0) return;

        window.state.salesLot.forEach((slot, slotIdx) => {
            let buyer = slot.currentBuyer || slot.buyer;
            if (slot && buyer && slot.car && buyer.dealType === 'chat') {
                let safeCarName = String(slot.car.name || 'car').replace(/[^a-zа-я0-9]/gi, '_');
                let dialogId = `dlg_buyer_slot_${slotIdx}_${safeCarName}`;
                let exists = window.state.player.phoneMessages.find(m => m.id === dialogId);

                let asking = slot.askingPrice || slot.car.price;
                let offer = buyer.currentOffer || buyer.offeredPrice || Math.round(asking * 0.85);
                const carUid = slot.car.uid || slot.car.id || null;

                if (!exists) {
                    window.state.player.phoneMessages.unshift({
                        id: dialogId,
                        dialogId: dialogId,
                        category: 'buyers',
                        sender: `${buyer.avatar || '🧢'} ${buyer.name || 'Покупатель'}`,
                        time: "Сейчас",
                        unread: true,
                        viewed: false,
                        carIndex: slotIdx,
                        carUid: carUid,
                        carData: slot.car,
                        askingPrice: asking,
                        offerPrice: offer,
                        patience: buyer.patience || 4,
                        maxPatience: 4,
                        preview: buyer.lastReply || `Готов забрать авто за ${Number(offer).toLocaleString()} ₽!`,
                        chatHistory: [
                            { from: 'them', text: `Здравствуйте! Пишу по объявлению на «${slot.car.name}». Готов забрать за ${Number(offer).toLocaleString()} ₽!` }
                        ]
                    });
                } else {
                    exists.askingPrice = asking;
                    exists.offerPrice = offer;
                    if (carUid) exists.carUid = carUid;
                    exists.carIndex = slotIdx;
                }
            }
        });
    },

    openCreateListingModal() {
        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalCreateP2P');
        } else {
            let m = document.getElementById('modalCreateP2P');
            if (m) m.classList.add('active');
        }
        setTimeout(() => {
            this.selectP2PListingType('cars');
        }, 50);
    }
};

// Экспорт
window.AppM = AppM;
window.AppMessenger = AppM;

console.log('[💬 phone-m v6.0.0] RealtimeManager + EventBus + MoneyManager + SafeState интеграция ✓');
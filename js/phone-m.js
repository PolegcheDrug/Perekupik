// ========================================================
// js/phone-m.js — СОЦИАЛЬНАЯ СЕТЬ & P2P БИРЖА «M+ PRO» (v3.9.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Полная поддержка живых карточек кастомизации (скины, ауры,
// стикеры дохода, анимированные названия и передача прав)
// ========================================================

const AppM = {
    activeTab: 'chats', // 'chats' | 'market' | 'clubs' | 'friends' | 'feed' | 'profile'
    marketFilter: 'cars', // 'cars' | 'plates' | 'business' | 'housing'
    activeDialogId: null,
    selectedListingType: 'cars',
    selectedItemIndex: null,

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
                    + Продать
                </button>
            </div>

            <div class="phone-app-body">
                <!-- ВЕРХНЯЯ НАВИГАЦИОННАЯ СЕТКА M+ -->
                <div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 4px;">
                    <button onclick="AppM.switchMainTab('chats')" class="btn ${curTab === 'chats' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px; position:relative; font-weight:800;">
                        <i class="fa-solid fa-comments"></i> Торг ${unreadCount > 0 ? `<span class="phone-nav-counter">${unreadCount}</span>` : ''}
                    </button>
                    <button onclick="AppM.switchMainTab('market')" class="btn ${curTab === 'market' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px; font-weight:800;">
                        <i class="fa-solid fa-handshake"></i> Биржа
                    </button>
                    <button onclick="AppM.switchMainTab('clubs')" class="btn ${curTab === 'clubs' ? 'btn-purple' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px; font-weight:800;">
                        <i class="fa-solid fa-users"></i> Клубы
                    </button>
                    <button onclick="AppM.switchMainTab('friends')" class="btn ${curTab === 'friends' ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px; font-weight:800;">
                        <i class="fa-solid fa-user-group"></i> Друзья
                    </button>
                </div>

                <div class="grid-2 mb-2" style="gap:4px;">
                    <button onclick="AppM.switchMainTab('feed')" class="btn ${curTab === 'feed' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">
                        <i class="fa-solid fa-fire mr-1"></i> Пульс рынка
                    </button>
                    <button onclick="AppM.switchMainTab('profile')" class="btn ${curTab === 'profile' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">
                        <i class="fa-solid fa-id-card mr-1"></i> Визитка
                    </button>
                </div>

                <div id="mHubSubContentBox"></div>
            </div>
        `;

        const subBox = document.getElementById('mHubSubContentBox');
        if (curTab === 'chats') this.renderChatsScreen(subBox);
        else if (curTab === 'market') this.renderMarketScreen(subBox);
        else if (curTab === 'clubs') this.renderClubsScreen(subBox);
        else if (curTab === 'friends') this.renderFriendsScreen(subBox);
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
    // 1. ВКЛАДКА: «ТОРГ В ЧАТАХ»
    // ========================================================
    renderChatsScreen(container) {
        if (!container) return;
        this.syncSalesLotBuyersToMessages();

        let msgs = state.player?.phoneMessages || [];

        container.innerHTML = `
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.14), #090e18); border-color: var(--cyan);">
                <div>
                    <b class="text-xs color-cyan"><i class="fa-solid fa-comments-dollar mr-1"></i> Переписки по объявлениям</b>
                    <div class="sub-label" style="font-size:8.5px;">Клиенты по авто с площадки и отклики с P2P биржи</div>
                </div>
                <span class="tag-badge bg-tag-green">M+ ONLINE</span>
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
                    <div>Входящих сообщений пока нет.</div>
                    <div class="text-xs mt-1">Выставьте имущество на биржу или дождитесь покупателя!</div>
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
            if (m.carIndex !== undefined && state.salesLot?.[m.carIndex]) {
                let slot = state.salesLot[m.carIndex];
                let b = slot.currentBuyer || slot.buyer;
                let curOffer = b?.currentOffer || m.offerPrice || slot.askingPrice;
                priceText = `${Number(curOffer).toLocaleString()} ₽`;
            } else if (m.offerPrice) {
                priceText = `${Number(m.offerPrice).toLocaleString()} ₽`;
            }

            let viewStatusBadge = isUnread 
                ? `<span class="tag-badge bg-tag-red" style="font-weight:900;"><span class="led-dot led-red"></span> НОВОЕ</span>`
                : (isViewed ? `<span class="tag-badge bg-tag-dark" style="border-color:rgba(255,255,255,0.2);"><i class="fa-solid fa-eye color-cyan mr-1"></i> ПРОСМОТРЕНО</span>` : '');

            let senderLabel = m.isP2PMarket ? "Продавец P2P:" : "Покупатель:";

            return `
                <div onclick="AppM.openDialog('${m.id}')" class="glass-card mb-3 p-2 cursor-pointer ${isUnread ? 'card-glow-deal' : ''}" style="border-left: 3px solid ${isUnread ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}; background: #090e18;">
                    <div class="car-img-wrap mb-2" style="height:120px; position:relative; border-radius:10px; overflow:hidden;">
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
                            <div class="price-val text-xs color-green" style="font-size:14px;">${priceText}</div>
                        </div>
                    </div>

                    <div class="seller-dialog-bubble my-2" style="border-left: 3px solid var(--cyan); background: rgba(0, 242, 254, 0.04); padding: 6px 10px; border-radius: 6px;">
                        <span class="sub-label" style="font-size:9.5px; color:#cbd5e1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">
                            ${lastText}
                        </span>
                    </div>

                    <button class="btn btn-cyan btn-sm w-full font-bold" style="padding:6px 0; font-size:10px;">
                        <i class="fa-solid fa-comments mr-1"></i> ПЕРЕЙТИ В ДИАЛОГ 💬
                    </button>
                </div>
            `;
        }).join('');
    },

    renderConversationScreen(container) {
        let msg = (state.player?.phoneMessages || []).find(m => m && m.id === this.activeDialogId);
        if (!msg) {
            this.activeDialogId = null;
            this.render(container);
            return;
        }

        msg.unread = false;
        msg.viewed = true;

        let isP2P = !!msg.isP2PMarket;
        let slot = (!isP2P && msg.carIndex !== undefined && state.salesLot?.[msg.carIndex]) ? state.salesLot[msg.carIndex] : null;
        let car = slot?.car || msg.carData || {};
        let buyerObj = slot?.currentBuyer || slot?.buyer || null;

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
        let messagesHtml = history.map(item => `
            <div class="chat-msg ${item.from === 'me' ? 'msg-player' : 'msg-seller'}" style="margin-bottom:6px;">
                ${item.text}
            </div>
        `).join('');

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
                    ${messagesHtml}
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
    },

    executeChatHaggle(msgId, percent, failRisk) {
        let msg = (state.player?.phoneMessages || []).find(m => m && m.id === msgId);
        if (!msg) return;

        let isP2P = !!msg.isP2PMarket;
        let slot = (!isP2P && msg.carIndex !== undefined && state.salesLot?.[msg.carIndex]) ? state.salesLot[msg.carIndex] : null;
        let buyer = slot?.currentBuyer || slot?.buyer;

        let currentPatience = buyer ? buyer.patience : (msg.patience !== undefined ? msg.patience : 4);
        if (currentPatience <= 0) {
            return showToast("Собеседник больше не готов вести диалог!");
        }

        if (buyer) buyer.patience -= 1;
        msg.patience = (currentPatience - 1);

        let lvl = state.player?.level || 1;
        let karma = state.player?.karma || 50;
        let adjustedRisk = Math.max(5, Math.min(90, failRisk - (lvl * 0.5) - ((karma - 50) * 0.2)));
        let roll = Math.random() * 100;

        if (!msg.chatHistory) msg.chatHistory = [];
        let tacticKey = percent <= 3 ? 'soft' : (percent <= 8 ? 'medium' : 'hard');

        if (roll < adjustedRisk) {
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('error');

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
                }
            }
        } else {
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

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

        saveState();
        this.renderConversationScreen(document.getElementById('phoneAppContainer'));
    },

    openDialog(msgId) {
        this.activeDialogId = msgId;
        const msg = (state.player?.phoneMessages || []).find(m => m && m.id === msgId);
        if (msg) {
            msg.unread = false;
            msg.viewed = true;
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

        if (msg.isP2PMarket && msg.p2pId) {
            let lot = (state.p2pMarketListings || []).find(l => l.id === msg.p2pId);
            let finalPrice = msg.offerPrice || lot?.price || 100000;
            let cash = state.player?.cash || 0;

            if (cash < finalPrice) {
                return showToast(`Не хватает денег! Нужно: ${Number(finalPrice).toLocaleString()} ₽`);
            }

            state.player.cash -= finalPrice;
            if (lot) {
                if (lot.type === 'car' || lot.type === 'cars') {
                    if (!state.garage) state.garage = [];
                    state.garage.push(Object.assign({}, lot.itemData, { id: "p2p_" + Date.now(), purchaseCost: finalPrice }));
                    if (typeof renderGarage === 'function') renderGarage();
                } else if (lot.type === 'plate' || lot.type === 'plates') {
                    if (!state.ownedPlates) state.ownedPlates = [];
                    state.ownedPlates.push(lot.itemData?.plate || lot.name);
                } else if (lot.type === 'business') {
                    let bizId = lot.itemData?.bizId || lot.id;
                    let targetBiz = (state.businesses || []).find(b => b.id === bizId);
                    if (targetBiz) {
                        targetBiz.level = Math.max(targetBiz.level || 0, lot.itemData?.level || 1);
                        targetBiz.stock = 100;
                        targetBiz.customName = lot.itemData?.customName || lot.name;
                        targetBiz.coverSkin = lot.itemData?.coverSkin || 'classic';
                        targetBiz.cardAnimation = lot.itemData?.cardAnimation || 'none';
                        targetBiz.vipSticker = lot.itemData?.vipSticker || 'none';
                        targetBiz.titleStyle = lot.itemData?.titleStyle || 'default';
                    }
                } else if (lot.type === 'housing') {
                    let hId = lot.itemData?.houseId || 'gsk_box';
                    if (!state.player.ownedHouses) state.player.ownedHouses = [];
                    if (!state.player.ownedHouses.includes(hId)) state.player.ownedHouses.push(hId);
                    state.player.housingId = hId;
                    state.player.housingType = 'own';
                }
                state.p2pMarketListings = state.p2pMarketListings.filter(l => l.id !== msg.p2pId);
            }

            state.player.phoneMessages = state.player.phoneMessages.filter(m => m.id !== msgId);
            saveState();
            updateHeaderUI();
            this.activeDialogId = null;
            this.render(document.getElementById('phoneAppContainer'));

            if (typeof openVerdictModal === 'function') {
                openVerdictModal("P2P СДЕЛКА ЗАКРЫТА! 🤝", `Вы выкупили лот за ${Number(finalPrice).toLocaleString()} ₽!`, true, finalPrice);
            } else {
                showToast("Сделка на бирже успешно закрыта!");
            }
            return;
        }

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
            if (!state.player.stats) state.player.stats = {};
            state.player.stats.sold = (state.player.stats.sold || 0) + 1;
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
    // 2. ВКЛАДКА: «P2P БИРЖА» С ПОЛНОЙ КАСТОМИЗАЦИЕЙ
    // ========================================================
    renderMarketScreen(container) {
        if (!container) return;
        let f = this.marketFilter || 'cars';
        let pLvl = state.player?.level || 1;

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
        let pLvl = state.player?.level || 1;
        if (filter === 'plates' && pLvl < 3) return showToast("Категория «Номера» на бирже доступна с 3 уровня!");
        if (filter === 'housing' && pLvl < 4) return showToast("Категория «Жильё» на бирже доступна с 4 уровня!");
        if (filter === 'business' && pLvl < 6) return showToast("Категория «Бизнес» на бирже доступна с 6 уровня!");

        this.marketFilter = filter;
        if (typeof playSound === 'function') playSound('tick');
        this.renderMarketScreen(document.getElementById('mHubSubContentBox'));
    },

    renderP2PLotsHtml(filter) {
        let lots = state.p2pMarketListings || [];
        if (lots.length === 0) {
            lots = [
                { id: "demo_c1", sellerId: "bot_1", sellerName: "Maga_GTI", type: "cars", name: "VW Golf VI GTI (Stage 2)", price: 1850000, itemData: { plate: "О777ОО 77", power: 260, condition: 85, img: "assets/cars/comfort/golf6/golf6.jpg", tuning: { chip: 2, weldedDiff: true } } }
            ];
            state.p2pMarketListings = lots;
        }

        let filtered = lots.filter(l => {
            if (filter === 'cars') return l.type === 'car' || l.type === 'cars';
            if (filter === 'plates') return l.type === 'plate' || l.type === 'plates';
            return l.type === filter;
        });

        if (filtered.length === 0) {
            return `<div class="glass-card text-center sub-label py-6">В категории «${filter.toUpperCase()}» активных лотов пока нет.</div>`;
        }

        return filtered.map(item => {
            let myId = String(state.player?.name || 'me');
            let isMine = String(item.sellerName) === myId;

            let actionBtn = isMine 
                ? `<button onclick="AppM.cancelP2PListing('${item.id}')" class="btn btn-danger btn-sm w-full">Снять с продажи</button>`
                : `<button onclick="openP2PDealModal('${item.id}')" class="btn btn-green btn-sm w-full font-bold">Торговаться / Купить за ${Number(item.price).toLocaleString()} ₽ 🤝</button>`;

            let descText = "";
            let imgBlockHtml = "";
            let animClass = "";

            if (item.type === 'cars' || item.type === 'car') {
                let rawImg = item.itemData?.img || item.img || "assets/cars/economy/2101/vaz-2101.jpg";
                let carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
                let fallbackImg = (typeof getCategoryFallback === 'function') ? getCategoryFallback(item.itemData?.type || 'economy') : "assets/cars/economy/2101/vaz-2101.jpg";

                let plateStr = item.itemData?.plate ? `<span class="license-plate" style="font-size:9.5px; padding:1px 5px;">${item.itemData.plate}</span>` : '';
                let tuningObj = item.itemData?.tuning || {};
                let tuningCount = Object.keys(tuningObj).length;
                let tuningDesc = tuningCount > 0 ? `⚡ Тюнинг (модификаций: ${tuningCount})` : '📦 Стоковое состояние';

                descText = `Мощность: <b>${item.itemData?.power || 100} л.с.</b> • Кузов: ${item.itemData?.condition || 85}%<br>${tuningDesc}`;

                imgBlockHtml = `
                    <div class="car-img-wrap mb-2" style="height:115px; position:relative; border-radius:10px; overflow:hidden;">
                        <img src="${carImg}" class="car-img" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='${fallbackImg}';">
                        <div class="badge-tag badge-tl" style="top:6px; left:6px;">${plateStr}</div>
                        <div class="badge-tag badge-br"><span class="tag-badge bg-tag-cyan">АВТО P2P</span></div>
                    </div>
                `;
            } else if (item.type === 'business') {
                let bData = item.itemData || {};
                let bName = bData.customName || item.name;
                let bIncome = bData.income || 25000;
                let skinId = bData.coverSkin || 'classic';
                let skin = (typeof BUSINESS_COVER_SKINS !== 'undefined') ? BUSINESS_COVER_SKINS.find(s => s.id === skinId) : null;
                let stickerId = bData.vipSticker || 'none';
                let sticker = (typeof BUSINESS_VIP_STICKERS !== 'undefined') ? BUSINESS_VIP_STICKERS.find(s => s.id === stickerId) : null;
                let titleStyleId = bData.titleStyle || 'default';
                let titleStyle = (typeof BUSINESS_TITLE_STYLES !== 'undefined') ? BUSINESS_TITLE_STYLES.find(t => t.id === titleStyleId) : null;

                if (bData.cardAnimation && typeof BUSINESS_CARD_ANIMATIONS !== 'undefined') {
                    let aObj = BUSINESS_CARD_ANIMATIONS.find(a => a.id === bData.cardAnimation);
                    if (aObj) animClass = aObj.className;
                }

                let iconClass = skin?.icon || 'fa-briefcase';
                let colorHex = skin?.color || '#00e676';
                let titleFx = titleStyle?.className || '';
                let stickerHtml = (sticker && sticker.icon) ? `<span class="biz-vip-sticker ${sticker.cssClass}">${sticker.icon}</span>` : '';

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
                            <span class="tag-badge bg-tag-green">БИЗНЕС P2P</span>
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
            } else {
                descText = `Официальный лот категории ${item.type.toUpperCase()}`;
                imgBlockHtml = `
                    <div class="p-3 mb-2 text-center" style="background:#050914; border-radius:10px; border:1px solid rgba(0, 242, 254, 0.3);">
                        <b class="color-cyan">${item.name}</b>
                    </div>
                `;
            }

            return `
                <div onclick="openP2PDealModal('${item.id}')" class="glass-card mb-3 p-2 cursor-pointer biz-card-compact ${animClass}" style="border-left: 3px solid var(--green); background:#090e18;">
                    ${imgBlockHtml}
                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs color-cyan" style="font-size:12px;">${item.name}</b>
                            <div class="sub-label" style="font-size:8.5px;">Продавец: <b class="color-amber">${item.sellerName || 'Игрок'}</b></div>
                        </div>
                        <span class="price-val text-xs color-green">${Number(item.price).toLocaleString()} ₽</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9.5px; color:#cbd5e1; line-height:1.3;">${descText}</div>
                    ${actionBtn}
                </div>
            `;
        }).join('');
    },

    // ========================================================
    // ВЫСТАВЛЕНИЕ ИМУЩЕСТВА С УЧЕТОМ КАСТОМИЗАЦИИ
    // ========================================================
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
            let garage = (state.garage || []).filter(c => c && typeof c === 'object');
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
            let plates = state.ownedPlates || ['А777АА 77'];
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
        } else if (type === 'business') {
            let bizList = (state.businesses || []).filter(b => b && (b.level || 0) > 0);
            if (bizList.length === 0) {
                html = `<div class="glass-card p-3 text-center sub-label" style="background:#050914;">У вас пока нет купленных предприятий.</div>`;
            } else {
                bizList.forEach((b, idx) => {
                    let isSelected = this.selectedItemIndex === idx;
                    let displayName = b.customName || b.name;
                    let stickerIcon = '';
                    if (b.vipSticker && typeof BUSINESS_VIP_STICKERS !== 'undefined') {
                        let st = BUSINESS_VIP_STICKERS.find(s => s.id === b.vipSticker);
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
            let houses = state.player?.ownedHouses || [];
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
            let hasItems = (type === 'cars' && (state.garage || []).length > 0) ||
                           (type === 'plates' && (state.ownedPlates || []).length > 0) ||
                           (type === 'business' && (state.businesses || []).some(b => b && b.level > 0)) ||
                           (type === 'housing' && (state.player?.ownedHouses || []).length > 0);
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
                let car = (state.garage || [])[idx];
                if (car) priceInput.value = Math.round((car.price || car.marketValue || 150000) * 1.15);
            } else if (type === 'plates') {
                priceInput.value = 500000;
            } else if (type === 'business') {
                let b = (state.businesses || []).filter(x => x && x.level > 0)[idx];
                if (b) priceInput.value = Math.round((b.cost || 200000) * (b.level || 1) * 1.3);
            } else if (type === 'housing') {
                priceInput.value = 1500000;
            }
        }

        if (typeof playSound === 'function') playSound('tick');
    },

    async confirmCreateP2PListing() {
        const priceInput = document.getElementById('p2pPriceInput');
        if (!priceInput) return;

        let price = parseInt(priceInput.value, 10);
        let idx = this.selectedItemIndex;

        if (idx === null || idx === undefined || isNaN(price) || price <= 500) {
            return showToast("Выберите объект и укажите цену!");
        }

        let type = this.selectedListingType;
        let myName = state.player?.name || 'Перекуп #777';
        let newListing = {
            id: "p2p_item_" + Date.now(),
            sellerName: myName,
            type: type,
            price: price,
            itemData: {}
        };

        if (type === 'cars') {
            let car = state.garage[idx];
            if (!car) return showToast("Машина не найдена в гараже!");
            newListing.name = car.name;
            newListing.itemData = Object.assign({}, car);
            state.garage.splice(idx, 1);
            if (typeof renderGarage === 'function') renderGarage();
        } else if (type === 'plates') {
            let plates = state.ownedPlates || ['А777АА 77'];
            let plateStr = plates[idx] || 'В777ВВ 77';
            newListing.name = `Госномер ${plateStr}`;
            newListing.itemData = { plate: plateStr };
            state.ownedPlates = plates.filter((_, i) => i !== idx);
        } else if (type === 'business') {
            let bizList = (state.businesses || []).filter(b => b && b.level > 0);
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
            let houses = state.player?.ownedHouses || [];
            let hId = houses[idx] || 'gsk_box';
            newListing.name = `Бокс (${hId})`;
            newListing.itemData = { houseId: hId, slots: 2 };
            state.player.ownedHouses = state.player.ownedHouses.filter(id => id !== hId);
        }

        if (window.publishP2PLot && typeof window.publishP2PLot === 'function') {
            try {
                showToast("Публикация в облако Firestore...");
                let cloudId = await window.publishP2PLot(newListing);
                if (cloudId) newListing.id = cloudId;
            } catch (e) {
                console.warn("[P2P] Ошибка облачной публикации:", e);
            }
        }

        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        state.p2pMarketListings.unshift(newListing);

        saveState();
        updateHeaderUI();

        if (typeof ModalManager !== 'undefined') {
            ModalManager.close('modalCreateP2P');
        } else {
            let m = document.getElementById('modalCreateP2P');
            if (m) m.classList.remove('active');
        }

        showToast("✓ Объект успешно выставлен на биржу!");
        this.renderMarketScreen(document.getElementById('mHubSubContentBox'));
    },

    cancelP2PListing(lotId) {
        let lot = (state.p2pMarketListings || []).find(l => l.id === lotId);
        if (lot) {
            if (lot.type === 'business') {
                let b = (state.businesses || []).find(x => x.id === (lot.itemData?.bizId || lot.name));
                if (b) {
                    b.level = lot.itemData?.level || 1;
                    b.customName = lot.itemData?.customName || lot.name;
                    b.coverSkin = lot.itemData?.coverSkin || 'classic';
                    b.cardAnimation = lot.itemData?.cardAnimation || 'none';
                    b.vipSticker = lot.itemData?.vipSticker || 'none';
                    b.titleStyle = lot.itemData?.titleStyle || 'default';
                }
            } else if (lot.type === 'car' || lot.type === 'cars') {
                if (!state.garage) state.garage = [];
                state.garage.push(lot.itemData);
                if (typeof renderGarage === 'function') renderGarage();
            } else if (lot.type === 'plate' || lot.type === 'plates') {
                if (!state.ownedPlates) state.ownedPlates = [];
                state.ownedPlates.push(lot.itemData?.plate || lot.name);
            }
        }

        state.p2pMarketListings = (state.p2pMarketListings || []).filter(l => l.id !== lotId);
        saveState();
        updateHeaderUI();
        showToast("Лот снят с биржи и возвращен владельцу.");
        this.renderMarketScreen(document.getElementById('mHubSubContentBox'));
    },

    // ========================================================
    // 3. АВТОКЛУБЫ
    // ========================================================
    renderClubsScreen(container) {
        if (!container) return;
        let myClub = state.player?.club;
        let pLvl = state.player?.level || 1;

        let clubs = [
            { id: "club_vaz", name: "Боевая Классика РФ", minLvl: 2, members: 28, bank: 220000, fee: 35000, perk: "Бесплатный ремонт подвески на сходках" },
            { id: "club_jdm", name: "JDM Legends Moscow", minLvl: 4, members: 14, bank: 450000, fee: 80000, perk: "+10% к оценке японских авто" },
            { id: "club_m", name: "Bavarian Power M", minLvl: 7, members: 9, bank: 1850000, fee: 200000, perk: "+15% к победе на 402м" },
            { id: "club_syndicate", name: "Синдикат Олигархов", minLvl: 12, members: 4, bank: 6200000, fee: 600000, perk: "-25% ко всем налогам и проверкам" }
        ];

        let clubListHtml = clubs.map(c => {
            let isMember = myClub && myClub.id === c.id;
            let isLvlLocked = pLvl < c.minLvl;

            let btn = "";
            if (isMember) {
                btn = `<button onclick="AppM.leaveClubAction()" class="btn btn-danger btn-sm btn-auto">Покинуть</button>`;
            } else if (isLvlLocked) {
                btn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>🔒 С ${c.minLvl} ур.</button>`;
            } else {
                btn = `<button onclick="AppM.joinClubAction('${c.id}', '${c.name}', ${c.fee}, ${c.minLvl})" class="btn btn-purple btn-sm btn-auto">Вступить (${(c.fee/1000).toFixed(0)}k ₽)</button>`;
            }

            return `
                <div class="glass-card mb-2 p-2 flex-between" style="border-left: 3px solid var(--purple); background:#090e18;">
                    <div>
                        <b class="text-xs color-purple">${c.name}</b>
                        <div class="sub-label" style="font-size:9px;">Участников: <b>${c.members}</b> • Общак: <b class="color-green">${c.bank.toLocaleString()} ₽</b></div>
                        <div class="sub-label mt-1" style="font-size:8.5px; color:#cbd5e1;">⭐ Перк: <b>${c.perk}</b></div>
                    </div>
                    ${btn}
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(192, 132, 252, 0.16), #090e18); border-color: var(--purple);">
                <div>
                    <b class="text-xs color-purple"><i class="fa-solid fa-users"></i> Автоклубы Перекупов</b>
                    <div class="sub-label" style="font-size:8.5px;">${myClub ? `Вы состоите в: <b>${myClub.name}</b>` : 'Вступите в клуб или создайте свой'}</div>
                </div>
                <button onclick="AppM.createClubPrompt()" class="btn btn-purple btn-auto btn-sm" style="font-size:9px;">+ Создать</button>
            </div>
            <div class="space-y-1">${clubListHtml}</div>
        `;
    },

    joinClubAction(clubId, clubName, fee, minLvl) {
        let pLvl = state.player?.level || 1;
        if (pLvl < (minLvl || 1)) return showToast(`Доступно с ${minLvl} уровня!`);

        let cash = state.player?.cash || 0;
        if (cash < fee) return showToast(`Нужно ${fee.toLocaleString()} ₽ на взнос!`);

        state.player.cash -= fee;
        state.player.club = { id: clubId, name: clubName };
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Вы вступили в автоклуб «${clubName}»!`);
        this.renderClubsScreen(document.getElementById('mHubSubContentBox'));
    },

    leaveClubAction() {
        state.player.club = null;
        saveState();
        updateHeaderUI();
        showToast("Вы покинули автоклуб.");
        this.renderClubsScreen(document.getElementById('mHubSubContentBox'));
    },

    createClubPrompt() {
        let pLvl = state.player?.level || 1;
        if (pLvl < 5) return showToast("Создание клуба доступно с 5 уровня!");

        let name = prompt("Название нового автоклуба:", "Turbo Syndicate");
        if (!name || !name.trim()) return;

        let cash = state.player?.cash || 0;
        let cost = 250000;
        if (cash < cost) return showToast(`Нужно ${cost.toLocaleString()} ₽ на регистрацию клуба!`);

        state.player.cash -= cost;
        state.player.club = { id: "club_" + Date.now(), name: name.trim() };
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Автоклуб «${name.trim()}» зарегистрирован!`);
        this.renderClubsScreen(document.getElementById('mHubSubContentBox'));
    },

    // ========================================================
    // 4. НАПАРНИКИ
    // ========================================================
    renderFriendsScreen(container) {
        if (!container) return;

        let friends = [
            { id: "f1", name: "Артём_BMW (Ур. 14)", car: "BMW E30 Coupe" },
            { id: "f2", name: "Денис_GTI (Ур. 22)", car: "Golf VI GTI" }
        ];

        let listHtml = friends.map(f => `
            <div class="glass-card mb-2 p-2 flex-between" style="background:#090e18; border-left:3px solid var(--amber);">
                <div class="flex-gap" style="align-items:center;">
                    <div class="avatar" style="width:36px; height:36px; font-size:16px;">🏎️</div>
                    <div>
                        <b class="text-xs color-cyan">${f.name}</b>
                        <div class="sub-label" style="font-size:8.5px;">Болид: <b class="color-amber">${f.car}</b></div>
                    </div>
                </div>
                <div class="flex-gap">
                    <button onclick="AppM.sendFriendGift('fuel')" class="btn btn-dark btn-sm btn-auto" style="font-size:8.5px; padding:4px 6px;">⛽ +10л</button>
                    <button onclick="AppM.challengeFriendPrompt('${f.name}')" class="btn btn-red btn-sm btn-auto" style="font-size:8.5px; padding:4px 6px;">⚔️ Дуэль</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-green"><i class="fa-solid fa-user-plus"></i> Добавить напарника:</b>
                    <button onclick="AppM.shareTelegramInvite()" class="btn btn-green btn-auto btn-sm" style="font-size:9px;">
                        <i class="fa-brands fa-telegram mr-1"></i> Пригласить (+75k ₽)
                    </button>
                </div>
                <div class="sub-label" style="font-size:8.5px;">Приглашайте напарников для бесплатных заправок и закрытых сделок.</div>
            </div>

            <div class="glass-card mb-2 p-2" style="background:#090e18; border:1px solid var(--amber);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-bullhorn"></i> Гаражные Инсайды от друзей:</b>
                    <span class="tag-badge bg-tag-amber">ДИСКОНТ 40%</span>
                </div>
                <div class="sub-label mb-2" style="font-size:8.5px;">Напарники находят закрытые объявления до их выхода на рынок.</div>
                <button onclick="AppM.triggerInsiderDealAction()" class="btn btn-amber btn-sm w-full font-bold">
                    ⚡ Запросить гаражный инсайд (-1 🤝 Связь)
                </button>
            </div>

            <div class="sub-label mb-1" style="font-size:9px;">Напарники в сети:</div>
            ${listHtml}
        `;
    },

    sendFriendGift(type) {
        showToast("Топливо успешно отправлено напарнику ⛽!");
        playSound('win');
    },

    challengeFriendPrompt(name) {
        let bet = prompt(`Сумма ставки на заезд 402м против ${name} (₽):`, "50000");
        if (!bet) return;
        switchTab('tabPhone');
        setTimeout(() => {
            if (typeof PhoneManager !== 'undefined') {
                PhoneManager.openApp('street');
                if (typeof setRaceBet === 'function') setRaceBet(parseInt(bet, 10));
                showToast(`Вызов против ${name} отправлен на трек!`);
            }
        }, 120);
    },

    triggerInsiderDealAction() {
        let conn = state.player?.connections || 0;
        if (conn < 1) return showToast("Нужна хотя бы 1 Теневая Связь 🤝!");

        state.player.connections -= 1;
        saveState();
        updateHeaderUI();

        let hotCar = {
            id: "insider_" + Date.now(),
            name: "Toyota Mark II JZX90 (Инсайд от напарника)",
            power: 180,
            type: "comfort",
            drivetrain: "rwd",
            basePrice: 450000,
            price: 260000,
            baseMarketValue: 450000,
            marketValue: 450000,
            img: "assets/cars/comfort/golf6/golf6.jpg",
            fallback: "assets/cars/economy/2101/vaz-2101.jpg",
            plate: "В777ВВ 77",
            condition: 82,
            wear: { engine: 85, transmission: 85 },
            tuning: { chip: 1, weldedDiff: true, steeringAngle: true, risk1251: 0 },
            purchaseCost: 260000
        };

        if (!state.marketFeed) state.marketFeed = [];
        state.marketFeed.unshift(hotCar);
        saveState();

        playSound('win');
        tgHaptic('success');
        openVerdictModal("ИНСАЙД ПОЛУЧЕН! ⚡", `Напарник нашёл «${hotCar.name}» с дисконтом 40% за ${hotCar.price.toLocaleString()} ₽! Лот выведен на первую строчку Авторынка.`, true);
    },

    shareTelegramInvite() {
        let text = "Залетай со мной в авторынок перекупов «M+»! Лови лоты по низу рынка и получай +75,000 ₽ бонуса!";
        let url = `https://t.me/share/url?url=https://t.me/PerekupSimBot&text=${encodeURIComponent(text)}`;
        if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }
    },

    // ========================================================
    // 5. ПУЛЬС РЫНКА И ВИЗИТКА
    // ========================================================
    renderFeedScreen(container) {
        if (!container) return;
        container.innerHTML = `
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.14), #090e18); border-color: var(--cyan);">
                <div>
                    <b class="text-xs color-cyan"><i class="fa-solid fa-fire"></i> Пульс Авторынка:</b>
                    <div class="sub-label" style="font-size:9px;">Хроника сделок, побед на 402м и находок в сараях</div>
                </div>
                <button onclick="showToast('Лента обновлена!')" class="btn btn-cyan btn-auto btn-sm" style="font-size:9px;">+ Новость</button>
            </div>
            <div class="glass-card mb-2 p-2 m-post-card">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan">Илюха DXF</b>
                    <span class="tag-badge bg-tag-green">ПУЛЬС</span>
                </div>
                <div class="font-bold text-xs mb-1">Закрыта жирная сделка у капота!</div>
                <div class="sub-label mb-2" style="font-size:9.5px; color:#f1f5f9;">
                    Выкупил тачку в обвесе, скинул цену за скол на крыле и продал с чистой маржой +120,000 ₽!
                </div>
                <div class="m-reactions-row">
                    <button class="m-reaction-btn">🔥 <span>18</span></button>
                    <button class="m-reaction-btn">💸 <span>12</span></button>
                    <button class="m-reaction-btn">🤝 <span>9</span></button>
                </div>
            </div>
        `;
    },

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
                    <span class="sub-label" style="font-size:8.5px;">Капитал (Net Worth):</span>
                    <div class="font-bold color-green text-xs mt-1">${Number(p.cash || 0).toLocaleString()} ₽</div>
                </div>
            </div>
            <div class="glass-card p-2 mb-2 flex-between">
                <div>
                    <span class="sub-label" style="font-size:8.5px;">Главный болид автопарка:</span>
                    <div class="font-bold text-xs color-amber">${carName}</div>
                </div>
                <span class="tag-badge bg-tag-amber">ФЛАГМАН</span>
            </div>
        `;
    },

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
                        viewed: false,
                        carIndex: slotIdx,
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

window.AppM = AppM;
window.AppMessenger = AppM;
window.AppAutodrot = AppM;
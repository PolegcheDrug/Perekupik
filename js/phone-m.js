// ========================================================
// js/phone-m.js — СОЦИАЛЬНАЯ СЕТЬ & МЕССЕНДЖЕР «M» 2.0 (v0.9.2)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// 4 ключевых раздела:
// 1. 📰 «Пульс» — живая лента сделок, побед и реакций (🔥/💸/🤝/💀)
// 2. 💬 «Чаты» — сделки у капота, ДКП в 1 клик, P2P диалоги, ДПС
// 3. 👥 «Друзья» — френдлист, подарки ⛽/🎟️, дуэли и «Гаражные Инсайды»
// 4. 👤 «Профиль» — визитка перекупа, Net Worth и шеринг в Telegram
// ========================================================

const AppM = {
    activeTab: 'chats', // 'feed' | 'chats' | 'friends' | 'profile'
    chatCategory: 'buyers', // 'buyers' | 'club' | 'system'
    activeDialogId: null,

    render(container) {
        if (!container) return;

        if (this.activeDialogId) {
            this.renderConversationScreen(container);
            return;
        }

        const curTab = this.activeTab;
        const unreadCount = this.getGlobalUnreadCount();

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title color-cyan">
                    <span class="m-network-logo">M</span> Сеть «M»
                </div>
                <button onclick="AppM.openCreatePostPrompt()" class="btn btn-dark btn-auto btn-sm" title="Опубликовать в Пульс" style="font-size:10px; padding:3px 8px;">
                    <i class="fa-solid fa-feather-pointed color-cyan"></i>
                </button>
            </div>

            <div class="phone-app-body">
                <!-- НАВИГАЦИОННАЯ ПАНЕЛЬ СЕТИ «M» -->
                <div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 3px;">
                    <button onclick="AppM.switchMainTab('feed')" class="btn ${curTab === 'feed' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        <i class="fa-solid fa-newspaper"></i> Пульс
                    </button>
                    <button onclick="AppM.switchMainTab('chats')" class="btn ${curTab === 'chats' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px; position:relative;">
                        <i class="fa-solid fa-comments"></i> Чаты ${unreadCount > 0 ? `<span class="phone-nav-counter">${unreadCount}</span>` : ''}
                    </button>
                    <button onclick="AppM.switchMainTab('friends')" class="btn ${curTab === 'friends' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        <i class="fa-solid fa-user-group"></i> Друзья
                    </button>
                    <button onclick="AppM.switchMainTab('profile')" class="btn ${curTab === 'profile' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        <i class="fa-solid fa-id-badge"></i> Профиль
                    </button>
                </div>

                <div id="mScreenSubContent"></div>
            </div>
        `;

        const subBox = document.getElementById('mScreenSubContent');
        if (curTab === 'feed') this.renderFeedScreen(subBox);
        else if (curTab === 'chats') this.renderChatsScreen(subBox);
        else if (curTab === 'friends') this.renderFriendsScreen(subBox);
        else if (curTab === 'profile') this.renderProfileScreen(subBox);
    },

    switchMainTab(tab) {
        this.activeTab = tab;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.render(document.getElementById('phoneAppContainer'));
    },

    getGlobalUnreadCount() {
        let msgs = state.player?.phoneMessages || [];
        return msgs.filter(m => m && m.unread).length;
    },

    // ========================================================
    // 1. ВКЛАДКА: «ПУЛЬС» (ЛЕНТА ХРОНИКИ И РЕАКЦИЙ)
    // ========================================================
    async renderFeedScreen(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.14), #090e18); border-color: var(--cyan);">
                <div>
                    <b class="text-xs color-cyan"><i class="fa-solid fa-fire"></i> Пульс Авторынка:</b>
                    <div class="sub-label" style="font-size:9px;">Хроника сделок, побед на 402м и находок в сараях</div>
                </div>
                <button onclick="AppM.refreshFeedAction()" class="btn btn-dark btn-auto btn-sm" style="font-size:9px; padding:4px 8px;">
                    <i class="fa-solid fa-arrows-rotate"></i>
                </button>
            </div>

            <div id="mFeedPostsList">
                <div class="sub-label text-center py-4"><i class="fa-solid fa-spinner fa-spin color-cyan"></i> Загрузка ленты...</div>
            </div>
        `;

        let posts = [];
        if (window.FB_Bridge?.M) {
            try {
                posts = await Promise.race([
                    window.FB_Bridge.M.fetchFeed(),
                    new Promise(resolve => setTimeout(() => resolve(null), 2500))
                ]);
            } catch(e) {}
        }

        if (!posts || posts.length === 0) {
            posts = [
                {
                    id: "post_demo_1",
                    authorName: "Илюха DXF",
                    type: "deal",
                    title: "Закрыта жирная сделка у капота!",
                    text: "Выкупил Mark II в обвесе, скинул цену за скол на крыле и продал за 15 минут с чистой маржой +160,000 ₽!",
                    carName: "Toyota Mark II JZX90",
                    profit: 160000,
                    reactions: { fire: 18, cash: 12, handshake: 9, skull: 1 },
                    createdAt: Date.now() - 1800000
                },
                {
                    id: "post_demo_2",
                    authorName: "Max_GTI",
                    type: "race",
                    title: "Победа на 402м в Стрите!",
                    text: "Идеальный ланч-старт в зеленой зоне оборотов! Stage 2 оправдал каждую вложенную копейку 🏆",
                    carName: "VW Golf VI GTI (Stage 2)",
                    profit: 200000,
                    reactions: { fire: 24, cash: 15, handshake: 11, skull: 0 },
                    createdAt: Date.now() - 5400000
                },
                {
                    id: "post_demo_3",
                    authorName: "Sergo_Drift",
                    type: "barn",
                    title: "Капсула времени из сарая!",
                    text: "Вскрыли старый бокс в ГСК: под брезентом стояла советская ВАЗ-2101 в родной краске и с номерами 77 региона!",
                    carName: "ВАЗ-2101 «Копейка»",
                    profit: 320000,
                    reactions: { fire: 21, cash: 17, handshake: 14, skull: 2 },
                    createdAt: Date.now() - 12000000
                }
            ];
        }

        const feedBox = document.getElementById('mFeedPostsList');
        if (!feedBox) return;

        feedBox.innerHTML = posts.map(p => {
            let typeTag = p.type === 'race' ? '<span class="tag-badge bg-tag-red">402М СТРИТ</span>' 
                : (p.type === 'barn' ? '<span class="tag-badge bg-tag-amber">САРАЙ</span>' : '<span class="tag-badge bg-tag-green">ПРОДАЖА</span>');

            let timeAgo = "Недавно";
            if (p.createdAt) {
                let mins = Math.floor((Date.now() - p.createdAt) / 60000);
                timeAgo = mins < 60 ? `${Math.max(1, mins)}м назад` : `${Math.floor(mins/60)}ч назад`;
            }

            return `
                <div class="glass-card mb-2 p-2 m-post-card">
                    <div class="flex-between mb-1">
                        <div class="flex-gap" style="align-items:center;">
                            <div class="avatar" style="width:30px; height:30px; font-size:14px;">👤</div>
                            <div>
                                <b class="text-xs color-cyan">${p.authorName || 'Перекуп'}</b>
                                <div class="sub-label" style="font-size:8px;">${timeAgo}</div>
                            </div>
                        </div>
                        ${typeTag}
                    </div>

                    <div class="font-bold text-xs mb-1">${p.title}</div>
                    <div class="sub-label mb-2" style="font-size:9.5px; line-height:1.35; color:#f1f5f9;">${p.text}</div>

                    ${p.carName ? `
                        <div class="p-1 mb-2 flex-between" style="background:#090e18; border-radius:6px; font-size:9px;">
                            <span>Объект: <b class="color-amber">${p.carName}</b></span>${p.profit ? `<span class="color-green font-bold">+${Number(p.profit).toLocaleString()} ₽</span>` : ''}
                        </div>
                    ` : ''}

                    <div class="m-reactions-row">
                        <button onclick="AppM.addPostReaction('${p.id}', 'fire')" class="m-reaction-btn">
                            🔥 <span>${p.reactions?.fire || 0}</span>
                        </button>
                        <button onclick="AppM.addPostReaction('${p.id}', 'cash')" class="m-reaction-btn">
                            💸 <span>${p.reactions?.cash || 0}</span>
                        </button>
                        <button onclick="AppM.addPostReaction('${p.id}', 'handshake')" class="m-reaction-btn">
                            🤝 <span>${p.reactions?.handshake || 0}</span>
                        </button>
                        <button onclick="AppM.addPostReaction('${p.id}', 'skull')" class="m-reaction-btn">
                            💀 <span>${p.reactions?.skull || 0}</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    async addPostReaction(postId, type) {
        if (window.FB_Bridge?.M) {
            await window.FB_Bridge.M.toggleReaction(postId, type);
            if (typeof playSound === 'function') playSound('tick');
            if (typeof tgHaptic === 'function') tgHaptic('light');
            this.renderFeedScreen(document.getElementById('mScreenSubContent'));
        }
    },

    refreshFeedAction() {
        if (typeof playSound === 'function') playSound('tick');
        this.renderFeedScreen(document.getElementById('mScreenSubContent'));
    },

    async openCreatePostPrompt() {
        let text = prompt("О чём хотите рассказать в сети «M»?", "Только что закрыл отличную сделку!");
        if (!text || !text.trim()) return;

        let myCar = state.garage?.[0]?.name || null;
        let profile = window.FB_Bridge?.getProfile() || { id: "me", name: state.player?.name || "Перекуп" };

        if (window.FB_Bridge?.M) {
            await window.FB_Bridge.M.publishPost({
                type: "custom",
                title: "Заметка перекупа",
                text: text.trim(),
                carName: myCar
            }, profile);

            showToast("✓ Опубликовано в Пульс!");
            if (typeof playSound === 'function') playSound('win');
            this.switchMainTab('feed');
        }
    },

    // ========================================================
    // 2. ВКЛАДКА: «ЧАТЫ» (КЛИЕНТЫ, ДКП У КАПОТА, СЛУЖБЫ)
    // ========================================================
    renderChatsScreen(container) {
        if (!container) return;

        let sub = this.chatCategory || 'buyers';
        this.syncSalesLotBuyersToMessages();

        let unreadBuyers = this.getCategoryUnreadCount('buyers');
        let unreadClub = this.getCategoryUnreadCount('club');
        let unreadSystem = this.getCategoryUnreadCount('system');

        container.innerHTML = `
            <div class="grid-3 mb-2" style="grid-template-columns: repeat(3, 1fr); gap: 4px;">
                <button onclick="AppM.switchChatCategory('buyers')" class="btn ${sub === 'buyers' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px; position:relative;">
                    🚗 Клиенты ${unreadBuyers > 0 ? `<span class="phone-nav-counter">${unreadBuyers}</span>` : ''}
                </button>
                <button onclick="AppM.switchChatCategory('club')" class="btn ${sub === 'club' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px; position:relative;">
                    👥 Клуб ${unreadClub > 0 ? `<span class="phone-nav-counter">${unreadClub}</span>` : ''}
                </button>
                <button onclick="AppM.switchChatCategory('system')" class="btn ${sub === 'system' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px; position:relative;">
                    🚨 Службы ${unreadSystem > 0 ? `<span class="phone-nav-counter">${unreadSystem}</span>` : ''}
                </button>
            </div>

            <div id="mDialogsContainerList">
                ${this.renderDialogsListHtml(sub)}
            </div>
        `;
    },

    switchChatCategory(cat) {
        this.chatCategory = cat;
        if (typeof playSound === 'function') playSound('tick');
        this.renderChatsScreen(document.getElementById('mScreenSubContent'));
    },

    getCategoryUnreadCount(cat) {
        let msgs = state.player?.phoneMessages || [];
        return msgs.filter(m => m && m.unread && (m.category === cat || (!m.category && cat === 'system'))).length;
    },

    syncSalesLotBuyersToMessages() {
        if (!state.player) state.player = {};
        if (!state.player.phoneMessages) state.player.phoneMessages = [];
        if (!state.salesLot || state.salesLot.length === 0) return;

        state.salesLot.forEach((slot, slotIdx) => {
            if (slot && slot.currentBuyer && slot.car) {
                let safeCarName = String(slot.car.name || 'car').replace(/[^a-zа-я0-9]/gi, '_');
                let dialogId = `dlg_buyer_slot_${slotIdx}_${safeCarName}`;
                let exists = state.player.phoneMessages.find(m => m.id === dialogId);

                if (!exists) {
                    let b = slot.currentBuyer;
                    state.player.phoneMessages.unshift({
                        id: dialogId,
                        category: 'buyers',
                        sender: `${b.avatar || '👨‍💼'} ${b.name || 'Покупатель'}`,
                        time: "Сейчас",
                        unread: true,
                        carIndex: slotIdx,
                        carData: slot.car,
                        askingPrice: slot.askingPrice || slot.car.marketValue,
                        offerPrice: b.offerPrice || Math.round((slot.askingPrice || 100000) * 0.95),
                        preview: `«${b.preStatus || 'Машина заинтересовала. Готов забрать за наличные.'}»`,
                        chatHistory: [
                            { from: 'them', text: `Здравствуйте! Пишу по объявлению на «${slot.car.name}». Готов забрать за ${Number(b.offerPrice).toLocaleString()} ₽!` },
                            { from: 'them', text: b.preStatus || "Машина на ходу? Документы чистые?" }
                        ]
                    });
                }
            }
        });
    },

    renderDialogsListHtml(cat) {
        if (cat === 'club') return this.renderClubTabContent();

        let msgs = state.player?.phoneMessages || [];
        let filtered = msgs.filter(m => {
            if (cat === 'buyers') return m.category === 'buyers';
            return m.category === 'system' || !m.category;
        });

        if (filtered.length === 0) {
            let emptyText = cat === 'buyers' 
                ? "Пока нет сообщений от покупателей. Выставьте автомобили на «Площадку» или «P2P биржу»!" 
                : "Входящих служебных сводок нет.";
            return `<div class="glass-card text-center sub-label py-6">${emptyText}</div>`;
        }

        return filtered.map(m => {
            let history = m.chatHistory || [];
            let lastText = history.length > 0 ? history[history.length - 1].text : (m.preview || "");
            let isUnread = !!m.unread;

            return `
                <div onclick="AppM.openDialog('${m.id}')" class="glass-card p-2 flex-between mb-2 cursor-pointer" style="border-left: 3px solid ${isUnread ? 'var(--cyan)' : 'transparent'};">
                    <div class="flex-gap" style="align-items:center; flex:1; min-width:0;">
                        <div class="avatar" style="width:36px; height:36px; font-size:16px; min-width:36px;">
                            ${m.avatar || (cat === 'buyers' ? '🧑‍💼' : '💬')}
                        </div>
                        <div style="flex:1; min-width:0; margin-left:4px;">
                            <div class="flex-between">
                                <b class="text-xs ${isUnread ? 'color-cyan' : ''}">${m.sender}</b>
                                <span class="sub-label" style="font-size:8.5px;">${m.time || ''}</span>
                            </div>
                            <div class="sub-label mt-1" style="font-size:9.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                ${lastText}
                            </div>
                        </div>
                    </div>
                    ${isUnread ? '<span class="tag-badge bg-tag-red ml-2" style="font-size:7px; padding:2px 4px;">NEW</span>' : ''}
                </div>
            `;
        }).join('');
    },

    renderClubTabContent() {
        let myClub = state.player?.club;
        if (!myClub) {
            return `
                <div class="glass-card text-center py-6">
                    <i class="fa-solid fa-users color-purple mb-2" style="font-size:32px;"></i>
                    <h4 class="font-bold text-xs color-purple mb-1">Вы не состоите в автоклубе</h4>
                    <p class="sub-label mb-3" style="font-size:10px;">Вступите в синдикат перекупов в «ПодКлюч», чтобы открыть командную рацию и сейф!</p>
                    <button onclick="PhoneManager.openApp('syndicate'); switchSyndicateTab('clubs');" class="btn btn-purple btn-sm w-full">
                        Перейти к выбору клубов 👥
                    </button>
                </div>
            `;
        }

        let phrases = window.FB_Bridge?.QuickChat?.getPhrasesList('club') || [];

        return `
            <div class="glass-card mb-2 p-2 flex-between" style="border-color:var(--purple); background: radial-gradient(circle at 50% 0%, rgba(192,132,252,0.15), #090e18);">
                <div>
                    <b class="text-xs color-purple"><i class="fa-solid fa-users"></i> Чат клуба: ${myClub.name}</b>
                    <div class="sub-label" style="font-size:9px;">Рация синдиката</div>
                </div>
                <button onclick="AppM.openClubDepositPrompt()" class="btn btn-green btn-auto btn-sm" style="font-size:8.5px;">
                    +Общак 💰
                </button>
            </div>

            <div class="chat-thread-container mb-2" id="mClubChatBoxMessages" style="min-height:160px; max-height:220px; overflow-y:auto;">
                <div class="sub-label text-center py-4"><i class="fa-solid fa-spinner fa-spin color-purple"></i> Загрузка сообщений клуба...</div>
            </div>

            <div class="sub-label mb-1" style="font-size:9px;">Реплика в рацию клуба:</div>
            <div class="p2p-canned-chips-container mb-1" style="display:flex; flex-wrap:wrap; gap:4px;">
                ${phrases.map(p => `
                    <button onclick="AppM.sendClubPhrase('${p.id}')" class="btn btn-dark btn-sm" style="font-size:9px; padding:3px 7px; border-radius:12px; text-transform:none;">
                        ${p.text}
                    </button>
                `).join('')}
            </div>
        `;
    },

    renderConversationScreen(container) {
        let msg = (state.player?.phoneMessages || []).find(m => m && m.id === this.activeDialogId);
        if (!msg) {
            this.activeDialogId = null;
            this.render(container);
            return;
        }

        let carHeaderCard = "";
        if (msg.category === 'buyers' && msg.carData) {
            let car = msg.carData;
            let asking = msg.askingPrice || car.marketValue || 100000;
            let offer = msg.offerPrice || asking;
            let purchaseCost = car.purchaseCost || Math.round(offer * 0.8);
            let profit = offer - purchaseCost;

            carHeaderCard = `
                <div class="glass-card mb-2 p-2" style="border:1.5px solid var(--green); background:#090e18;">
                    <div class="deal-car-preview-card mb-2" style="height:68px;">
                        <img src="${car.img || 'assets/cars/economy/2101/vaz-2101.jpg'}" class="deal-car-thumb" style="width:75px; height:54px;" onerror="this.src='assets/cars/economy/2101/vaz-2101.jpg';">
                        <div style="flex:1; min-width:0;">
                            <b class="text-xs color-cyan block" style="font-size:11.5px;">${car.name}</b>
                            <div class="sub-label" style="font-size:9px;">Лот: ${Number(asking).toLocaleString()} ₽ | Предложение: <b class="color-green">${Number(offer).toLocaleString()} ₽</b></div>
                            <div class="sub-label mt-1" style="font-size:8.5px;">Чистая прибыль: <b class="${profit >= 0 ? 'color-green' : 'color-red'}">${profit >= 0 ? '+' : ''}${Number(profit).toLocaleString()} ₽</b></div>
                        </div>
                    </div>

                    <div class="grid-3" style="gap:4px;">
                        <button onclick="AppM.dealAcceptFromChat('${msg.id}')" class="btn btn-green btn-sm" style="font-size:9.5px; padding:6px 2px;">
                            <i class="fa-solid fa-handshake"></i> Оформить ДКП
                        </button>
                        <button onclick="AppM.dealHaggleFromChat('${msg.id}')" class="btn btn-amber btn-sm" style="font-size:9.5px; padding:6px 2px;">
                            <i class="fa-solid fa-comments-dollar"></i> Торг 🗣️
                        </button>
                        <button onclick="AppM.dealRejectFromChat('${msg.id}')" class="btn btn-dark btn-sm" style="font-size:9.5px; padding:6px 2px;">
                            <i class="fa-solid fa-xmark"></i> Отказать
                        </button>
                    </div>
                </div>
            `;
        }

        let history = msg.chatHistory || [];
        let messagesHtml = history.map(item => {
            let isMe = item.from === 'me';
            return `
                <div class="chat-msg ${isMe ? 'msg-player' : 'msg-seller'}" style="margin-bottom:6px;">
                    ${item.text}
                </div>
            `;
        }).join('');

        let phrases = window.FB_Bridge?.QuickChat?.getPhrasesList() || [];

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="AppM.closeDialog()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title">${msg.sender}</div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body flex-col" style="justify-content: space-between;">
                ${carHeaderCard}

                <div class="chat-thread-container mb-2" id="mChatScrollBox" style="flex:1; min-height:140px; max-height:220px; overflow-y:auto;">
                    ${messagesHtml}
                </div>

                <div class="sub-label mb-1" style="font-size:8.5px;">Быстрый ответ:</div>
                <div class="p2p-canned-chips-container mb-2" style="display:flex; flex-wrap:wrap; gap:4px; max-height:85px; overflow-y:auto;">
                    ${phrases.slice(0, 8).map(p => `
                        <button onclick="AppM.sendReplyPhrase('${p.id}')" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:3px 6px; border-radius:10px; text-transform:none;">
                            ${p.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        const box = document.getElementById('mChatScrollBox');
        if (box) box.scrollTop = box.scrollHeight;
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
            if (slot.currentBuyer) slot.currentBuyer.offerPrice = msg.offerPrice;
            if (typeof acceptBuyerDeal === 'function') acceptBuyerDeal(slotIdx);
        } else {
            let car = msg.carData;
            let price = msg.offerPrice || 100000;
            state.player.cash = (state.player.cash || 0) + price;
            if (typeof addXp === 'function') addXp(35);
            saveState();
            updateHeaderUI();
            openVerdictModal("СДЕЛКА В СЕТИ ЗАКРЫТА! 🤝", `Покупатель ${msg.sender} выкупил ${car.name} за ${Number(price).toLocaleString()} ₽!`, true, price);
        }

        state.player.phoneMessages = state.player.phoneMessages.filter(m => m.id !== msgId);
        saveState();
        this.activeDialogId = null;
        this.render(document.getElementById('phoneAppContainer'));
    },

    dealHaggleFromChat(msgId) {
        let msg = (state.player?.phoneMessages || []).find(m => m && m.id === msgId);
        if (!msg) return;
        let slotIdx = msg.carIndex !== undefined ? msg.carIndex : 0;
        if (typeof openHaggleSaleModal === 'function') openHaggleSaleModal(slotIdx);
    },

    dealRejectFromChat(msgId) {
        let msg = (state.player?.phoneMessages || []).find(m => m && m.id === msgId);
        if (!msg) return;
        let slotIdx = msg.carIndex !== undefined ? msg.carIndex : 0;
        if (state.salesLot?.[slotIdx] && typeof rejectBuyerDeal === 'function') {
            rejectBuyerDeal(slotIdx);
        }
        state.player.phoneMessages = state.player.phoneMessages.filter(m => m.id !== msgId);
        saveState();
        showToast("Вы отказали покупателю в продаже.");
        this.activeDialogId = null;
        this.render(document.getElementById('phoneAppContainer'));
    },

    sendReplyPhrase(phraseId) {
        let msg = (state.player?.phoneMessages || []).find(m => m && m.id === this.activeDialogId);
        if (!msg) return;

        let phraseObj = window.FB_Bridge?.QuickChat?.getPhrasesList()?.find(p => p.id === phraseId);
        let textToSend = phraseObj ? phraseObj.text : "Договорились!";

        if (!msg.chatHistory) msg.chatHistory = [];
        msg.chatHistory.push({ from: 'me', text: textToSend });

        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');

        saveState();
        this.renderConversationScreen(document.getElementById('phoneAppContainer'));

        setTimeout(() => {
            let replies = [
                "«Понял вас. Держу деньги наготове!»",
                "«Отлично! Готов оформлять ДКП прямо сейчас.»",
                "«По рукам, жду подтверждения сделки!»"
            ];
            let botReply = replies[Math.floor(Math.random() * replies.length)];
            msg.chatHistory.push({ from: 'them', text: botReply });
            saveState();
            if (this.activeDialogId === msg.id) {
                this.renderConversationScreen(document.getElementById('phoneAppContainer'));
                if (typeof playSound === 'function') playSound('tick');
            }
        }, 1200);
    },

    async sendClubPhrase(phraseId) {
        let myClub = state.player?.club;
        if (!myClub || !window.FB_Bridge?.Clubs) return;
        let ok = await window.FB_Bridge.Clubs.sendClubChatMessage(myClub.id, phraseId);
        if (ok) {
            if (typeof playSound === 'function') playSound('tick');
            this.refreshClubChatBox();
        }
    },

    async refreshClubChatBox() {
        let myClub = state.player?.club;
        const box = document.getElementById('mClubChatBoxMessages');
        if (!box || !myClub || !window.FB_Bridge?.Clubs) return;

        let msgs = await window.FB_Bridge.Clubs.fetchClubChatMessages(myClub.id);
        if (!msgs || msgs.length === 0) {
            box.innerHTML = `<div class="sub-label text-center py-4">Чат автоклуба пуст. Отправьте первое сообщение!</div>`;
            return;
        }

        let myId = String(window.FB_Bridge.getProfile().id);
        box.innerHTML = msgs.map(m => {
            let isMine = String(m.senderId) === myId;
            return `
                <div class="chat-msg ${isMine ? 'msg-player' : 'msg-seller'}" style="margin-bottom:4px;">
                    <div style="font-size:8.5px; opacity:0.75; margin-bottom:1px;"><b>${m.senderName}</b></div>
                    <div>${m.text}</div>
                </div>
            `;
        }).join('');
        box.scrollTop = box.scrollHeight;
    },

    openClubDepositPrompt() {
        let myClub = state.player?.club;
        if (!myClub) return;

        let sumStr = prompt("Сумма взноса в клановый общак (₽):", "50000");
        if (!sumStr) return;
        let sum = parseInt(sumStr, 10);
        if (isNaN(sum) || sum <= 0) return showToast("Некорректная сумма!");

        let cash = state.player?.cash || 0;
        if (cash < sum) return showToast("Не хватает денег для взноса!");

        state.player.cash -= sum;
        if (window.FB_Bridge?.Clubs) {
            window.FB_Bridge.Clubs.depositToClubBank(myClub.id, sum);
        }

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`В клановый общак внесено +${sum.toLocaleString()} ₽!`);
    },

    // ========================================================
    // 3. ВКЛАДКА: «ДРУЗЬЯ» (ИНСАЙДЫ, ПОДАРКИ, ДУЭЛИ)
    // ========================================================
    async renderFriendsScreen(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-green"><i class="fa-solid fa-user-plus"></i> Добавить напарника:</b>
                    <button onclick="AppM.shareMyInvite()" class="btn btn-green btn-auto btn-sm" style="font-size:9px;">
                        <i class="fa-brands fa-telegram mr-1"></i> Пригласить (+75k ₽)
                    </button>
                </div>
                <div class="grid-2 my-1" style="grid-template-columns: 1fr auto; gap:4px;">
                    <input type="text" id="mFriendSearchInput" class="chat-input" placeholder="Telegram ID / Ник напарника..." style="font-size:10px; padding:6px 8px;">
                    <button onclick="AppM.addFriendByIdAction()" class="btn btn-cyan btn-sm btn-auto" style="font-size:9.5px;">+ Добавить</button>
                </div>
            </div>

            <div class="glass-card mb-2 p-2" style="background:#090e18; border:1px solid var(--amber);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-bullhorn"></i> Гаражные Инсайды от друзей:</b>
                    <span class="m-insider-deal-badge">СКИДКА ДО 40%</span>
                </div>
                <div class="sub-label mb-2" style="font-size:8.5px;">Напарники из сети «M» находят срочные автомобили до их выхода на открытый рынок.</div>
                <button onclick="AppM.triggerFriendInsiderDeal()" class="btn btn-amber btn-sm w-full">
                    ⚡ Запросить инсайд у напарников (-1 🤝)
                </button>
            </div>

            <div class="glass-card mb-2 p-2 flex-between" style="background:#090e18; border-color:var(--border-glow);">
                <div>
                    <b class="text-xs color-green"><i class="fa-solid fa-gift"></i> Посылки от напарников:</b>
                    <div class="sub-label" style="font-size:8.5px;">Топливо и талоны, присланные вашими друзьями</div>
                </div>
                <button onclick="AppM.claimGiftsAction()" class="btn btn-green btn-auto btn-sm" style="font-size:9px;">
                    Забрать посылки
                </button>
            </div>

            <div class="sub-label mb-1" style="font-size:9.5px;">Список напарников:</div>
            <div id="mFriendsListContainer">
                <div class="sub-label text-center py-4"><i class="fa-solid fa-spinner fa-spin color-green"></i> Загрузка списка...</div>
            </div>
        `;

        let friends = [];
        if (window.FB_Bridge?.M) {
            try {
                friends = await Promise.race([
                    window.FB_Bridge.M.fetchFriends(),
                    new Promise(resolve => setTimeout(() => resolve(null), 2500))
                ]);
            } catch(e) {}
        }

        if (!friends || friends.length === 0) {
            friends = [
                { id: "demo_f1", name: "Артём_BMW (Ур. 14)", status: "В гараже", car: "BMW E30 Coupe" },
                { id: "demo_f2", name: "Денис_GTI (Ур. 22)", status: "На заезде 402м", car: "Golf VI GTI" }
            ];
        }

        const fBox = document.getElementById('mFriendsListContainer');
        if (!fBox) return;

        fBox.innerHTML = friends.map(f => `
            <div class="glass-card p-2 flex-between mb-2 m-friend-item-card">
                <div class="flex-gap" style="align-items:center;">
                    <div class="avatar" style="width:34px; height:34px; font-size:16px;">🏎️</div>
                    <div>
                        <b class="text-xs color-cyan">${f.name}</b>
                        <div class="sub-label" style="font-size:8px;">Авто: <span class="color-amber">${f.car || 'ВАЗ-2101'}</span></div>
                    </div>
                </div>

                <div class="flex-gap">
                    <button onclick="AppM.sendGiftToFriend('${f.id}', 'fuel')" class="btn btn-dark btn-sm btn-auto" style="font-size:8.5px; padding:4px 6px;" title="Подарить 10л бензина">
                        ⛽ +10л
                    </button>
                    <button onclick="AppM.challengeFriendToRace('${f.id}', '${f.name}')" class="btn btn-red btn-sm btn-auto" style="font-size:8.5px; padding:4px 6px;" title="Вызвать на 402м">
                        ⚔️ Дуэль
                    </button>
                </div>
            </div>
        `).join('');
    },

    triggerFriendInsiderDeal() {
        let conn = state.player?.connections || 0;
        if (conn < 1) return showToast("Нужна хотя бы 1 Теневая Связь 🤝!");

        state.player.connections -= 1;
        saveState();
        updateHeaderUI();

        let templates = (typeof CAR_DATABASE !== 'undefined' && CAR_DATABASE.economy) ? CAR_DATABASE.economy : [];
        let carTpl = templates[Math.floor(Math.random() * templates.length)] || { name: "ВАЗ-2107", basePrice: 110000 };

        let marketEst = Math.round((carTpl.basePrice || 100000) * 1.25);
        let insiderPrice = Math.round(marketEst * 0.60);

        let hotCar = {
            id: "insider_" + Date.now(),
            name: `${carTpl.name} (Инсайд от друга)`,
            power: carTpl.power || 75,
            type: carTpl.type || "economy",
            drivetrain: carTpl.drivetrain || "rwd",
            basePrice: carTpl.basePrice,
            price: insiderPrice,
            baseMarketValue: marketEst,
            marketValue: marketEst,
            img: carTpl.img || "assets/cars/economy/2101/vaz-2101.jpg",
            fallback: carTpl.fallback || "assets/cars/economy/2101/vaz-2101.jpg",
            plate: (typeof generateNormalPlate === 'function') ? generateNormalPlate() : "В777ВВ 77",
            isStolen: false,
            condition: 80,
            wear: { engine: 85, transmission: 85 },
            tuning: { chip: 0, weldedDiff: false, steeringAngle: false, risk1251: 0 },
            purchaseCost: insiderPrice,
            ownershipDays: 0,
            engineTemp: 90,
            tireWear: 90
        };

        if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(hotCar);

        if (!state.marketFeed) state.marketFeed = [];
        state.marketFeed.unshift(hotCar);
        saveState();

        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        openVerdictModal(
            "ГАРАЖНЫЙ ИНСАЙД ПОЛУЧЕН! ⚡",
            `Друг из сети «M» нашёл дедушкин гараж с машиной «${hotCar.name}»!\nЦена со скидкой: ${insiderPrice.toLocaleString()} ₽ (Оценка: ${marketEst.toLocaleString()} ₽).\nЛот добавлен на первую строчку Авторынка!`,
            true
        );
    },

    async addFriendByIdAction() {
        const input = document.getElementById('mFriendSearchInput');
        if (!input || !input.value.trim()) return showToast("Введите ID напарника!");

        let targetId = input.value.trim();
        input.value = "";

        if (window.FB_Bridge?.M) {
            let res = await window.FB_Bridge.M.addFriendDirect(
                window.FB_Bridge.getProfile(),
                { id: targetId, name: `Напарник #${targetId}` }
            );

            if (res.success) {
                showToast("✓ Напарник добавлен в френдлист!");
                if (typeof playSound === 'function') playSound('win');
                this.renderFriendsScreen(document.getElementById('mScreenSubContent'));
            } else {
                showToast(`Ошибка: ${res.error || 'не удалось'}`);
            }
        }
    },

    shareMyInvite() {
        let p = window.FB_Bridge?.getProfile() || { id: "777" };
        let link = `https://t.me/PerekupSimBot?start=ref_${p.id}`;
        let text = "Залетай ко мне в соцсеть перекупов «M»! Вместе выкупаем лоты, качаем автоклубы и получаем стартовые +75,000 ₽!";
        let url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;

        if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }
    },

    async sendGiftToFriend(friendId, giftType) {
        if (window.FB_Bridge?.M) {
            let res = await window.FB_Bridge.M.sendDailyGift(window.FB_Bridge.getProfile(), friendId, giftType);
            if (res.success) {
                if (typeof playSound === 'function') playSound('win');
                if (typeof tgHaptic === 'function') tgHaptic('success');
                showToast("Подарок отправлен напарнику 🎁!");
            } else {
                showToast("Не удалось отправить подарок.");
            }
        }
    },

    async claimGiftsAction() {
        if (window.FB_Bridge?.M) {
            let res = await window.FB_Bridge.M.claimIncomingGifts();
            if (res.totalFuel > 0 || res.totalTickets > 0) {
                state.player.fuel = Math.min(100, (state.player.fuel || 0) + res.totalFuel);
                let maxT = state.player.maxExpressTickets || 25;
                state.player.expressTickets = Math.min(maxT, (state.player.expressTickets || 0) + res.totalTickets);

                saveState();
                updateHeaderUI();
                if (typeof playSound === 'function') playSound('win');
                if (typeof tgHaptic === 'function') tgHaptic('success');

                openVerdictModal(
                    "ПОСЫЛКА ОТ ДРУЗЕЙ ПОЛУЧЕНА! 🎁",
                    `Напарники [${res.senders.join(", ")}] прислали вам подгон:\nТопливо: +${res.totalFuel} ⛽\nЭкспресс-талоны: +${res.totalTickets} 🎟️`,
                    true
                );
            } else {
                showToast("Новых посылок от друзей пока нет.");
            }
        }
    },

    challengeFriendToRace(friendId, friendName) {
        let betStr = prompt(`Вызов на дуэль 402м против ${friendName}!\nВведите сумму ставки (₽):`, "50000");
        if (!betStr) return;
        let bet = parseInt(betStr, 10);
        if (isNaN(bet) || bet <= 0) return showToast("Некорректная ставка!");

        let cash = state.player?.cash || 0;
        if (cash < bet) return showToast("Не хватает денег на ставку!");

        switchTab('tabPhone');
        setTimeout(() => {
            if (typeof PhoneManager !== 'undefined') {
                PhoneManager.openApp('street');
                if (typeof setRaceBet === 'function') setRaceBet(bet);
                showToast(`⚔️ Вызов против ${friendName} принят! Прогревайте шины.`);
            }
        }, 120);
    },

    // ========================================================
    // 4. ВКЛАДКА: «ПРОФИЛЬ» (ВИЗИТКА, АВТОПАРК, ШЕРИНГ)
    // ========================================================
    renderProfileScreen(container) {
        if (!container) return;

        let p = state.player || {};
        let s = p.stats || {};
        let myCar = state.garage?.[0];
        let carName = myCar ? myCar.name : "Пешком";
        let carImg = myCar ? (myCar.img || "assets/cars/economy/2101/vaz-2101.jpg") : "assets/cars/economy/2101/vaz-2101.jpg";

        container.innerHTML = `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.18), #090e18); border-color: var(--cyan);">
                <div class="avatar mb-2" style="margin: 0 auto; width: 56px; height: 56px; font-size: 24px;">
                    <i class="fa-solid fa-user-ninja color-cyan"></i>
                </div>
                <h3 class="font-bold text-xs color-cyan" style="font-size:15px;">${p.name || 'Перекуп #777'}</h3>
                <div class="sub-label mt-1" style="font-size:9.5px;">Авторитет: Уровень ${p.level || 1} • Респект: ⚡ ${p.streetCred || 100}</div>

                <div class="grid-2 my-2" style="gap:6px;">
                    <div class="p-2" style="background:#090e18; border-radius:8px;">
                        <span class="sub-label" style="font-size:8.5px;">Капитал (Net Worth):</span>
                        <div class="font-bold color-green text-xs mt-1">${Number(p.cash || 0).toLocaleString()} ₽</div>
                    </div>
                    <div class="p-2" style="background:#090e18; border-radius:8px;">
                        <span class="sub-label" style="font-size:8.5px;">Продано тачек:</span>
                        <div class="font-bold color-amber text-xs mt-1">${s.sold || 0} шт.</div>
                    </div>
                </div>
            </div>

            <!-- ЛУЧШИЙ АВТОМОБИЛЬ ИЗ ГАРАЖА -->
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-crown"></i> Главный болид:</b>
                    <span class="tag-badge bg-tag-amber">ФЛАГМАН</span>
                </div>
                <div class="deal-car-preview-card">
                    <img src="${carImg}" class="deal-car-thumb" onerror="this.src='assets/cars/economy/2101/vaz-2101.jpg'">
                    <div style="flex:1;">
                        <b class="text-xs">${carName}</b>
                        <div class="sub-label mt-1" style="font-size:9px;">Мощность: ${myCar?.power || 100} л.с. | Кузов: ${myCar?.condition || 80}%</div>
                    </div>
                </div>
            </div>

            <button onclick="AppM.shareMyInvite()" class="btn btn-green w-full">
                <i class="fa-brands fa-telegram mr-1"></i> Поделиться профилем перекупа в Telegram
            </button>
        `;
    }
};

window.AppM = AppM;
window.AppMessenger = AppM;
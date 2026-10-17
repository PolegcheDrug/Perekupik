// ========================================================
// js/phone/phone-m.js — M+ HUB & P2P БИРЖА (v8.2.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v8.2.0 (АВТОНОМНЫЙ ВЫКУП И ТОРГ НА P2P):
//   - ФИКС: Устранена блокировка «Модуль P2P не загружен» при клике на «Торг» и «Выкупить».
//   - ФИКС: Автономный выкуп лотов (авто зачисляются в гараж, номера — в PlatesManager).
//   - ФИКС: Автономное открытие чата торга с продавцом, если P2PDeals отсутствует.
// ⭐ v8.1.0 (ФИКС РАССИНХРОНА ИНДЕКСОВ И ОБЛОЖЕК P2P):
//   - ФИКС: Устранена ошибка рассинхронизации индексов при выборе номеров и авто в модалке.
//   - ФИКС: Гарантированное сохранение img и fallback при публикации.
//   - ФИКС: В renderP2PLotsHtml добавлен автоматический fallback на BARN_CARS_DATABASE / CARS_DATABASE.
// ⭐ v8.0.0 (SPRINT 1 — РЕДИЗАЙН В СОЦСЕТЬ):
//   - 4 таба: ЧАТЫ / БИРЖА / СОЦИУМ / Я.
// ========================================================

if (typeof window.BUSINESS_TITLE_STYLES === 'undefined') window.BUSINESS_TITLE_STYLES = [];
if (typeof window.BUSINESS_CARD_ANIMATIONS === 'undefined') window.BUSINESS_CARD_ANIMATIONS = [];

const AppM = {
    // 4 главных таба
    activeTab: 'chats',           // 'chats' | 'market' | 'social' | 'me'

    // Подтабы СОЦИУМА
    socialSubTab: 'feed',         // 'feed' | 'top' | 'friends' | 'clubs'

    // Подтабы ЧАТОВ (фильтры)
    chatFilter: 'all',            // 'all' | 'p2p' | 'buyers' | 'friends'

    // Биржа
    marketFilter: 'cars',         // 'cars' | 'plates' | 'business' | 'housing'
    selectedListingType: 'cars',
    selectedItemIndex: null,
    _currentModalItems: [],       // ⭐ зафиксированный список объектов в модалке

    // Диалоги
    activeDialogId: null,

    // Флаги
    _buyPending: false,
    _publishPending: false,

    // ========================================================
    // ИНИЦИАЛИЗАЦИЯ
    // ========================================================
    init() {
        this.syncSalesLotBuyersToMessages();
        this._bindEvents();
    },

    _bindEvents() {
        if (!window.EventBus) return;

        window.EventBus.on('p2p:deal_completed', () => {
            this._refreshCurrentScreen();
        });
        window.EventBus.on('p2p:deal_signed', () => {
            this._refreshCurrentScreen();
        });
        window.EventBus.on('p2p:deal_created', () => {
            this._refreshCurrentScreen();
        });

        window.EventBus.on('p2p:chat_opened', () => {
            this._updateBadge();
        });

        window.EventBus.on('notification:received', () => {
            this._updateBadge();
        });
    },

    _refreshCurrentScreen() {
        const container = document.getElementById('phoneAppContainer');
        if (container && window.PhoneManager?.currentApp === 'm') {
            this.render(container);
        }
        this._updateBadge();
    },

    _updateBadge() {
        try {
            const badge = document.getElementById('phoneAppSmsBadge');
            if (badge) {
                const unreadCount = (window.state?.player?.phoneMessages || []).filter(m => m && m.unread).length;
                badge.style.display = unreadCount > 0 ? 'block' : 'none';
                badge.innerText = unreadCount;
            }
            const navBadge = document.getElementById('phoneNavBadge');
            if (navBadge) {
                const unreadCount = (window.state?.player?.phoneMessages || []).filter(m => m && m.unread).length;
                const unreadMail = (window.state?.player?.mailbox || []).filter(m => m && !m.claimed).length;
                const total = unreadCount + unreadMail;
                navBadge.style.display = total > 0 ? 'inline-block' : 'none';
                navBadge.innerText = total;
            }
        } catch (e) {}
    },

    // ========================================================
    // ГЛАВНЫЙ РЕНДЕР
    // ========================================================
    render(container) {
        if (!container) return;

        if (this.activeDialogId) {
            this.renderConversationScreen(container);
            return;
        }

        const curTab = this.activeTab;
        const unreadCount = this._getUnreadCount();
        const activeDeals = this._getActiveDealsCount();

        container.innerHTML = `
            <!-- ШАПКА M+ -->
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 242, 254, 0.4); padding: 6px 10px;">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn">
                    <i class="fa-solid fa-chevron-left"></i> Меню
                </button>
                <div class="phone-app-title color-cyan" style="display:flex; align-items:center; gap:6px;">
                    <span class="m-network-logo" style="background: linear-gradient(135deg, #00f2fe, #7928ca); padding: 2px 7px; border-radius: 6px; font-weight: 900; color: #000; font-size: 11px;">M+</span>
                    <span style="font-size:12px; font-weight:900; letter-spacing:0.4px;">PRO HUB</span>
                </div>
                ${curTab === 'market' ? `
                    <button onclick="AppM.openCreateListingModal()" class="btn btn-green btn-auto btn-sm" style="font-size:9.5px; padding:4px 9px; font-weight:900;">
                        + Продать
                    </button>
                ` : `<div style="width:40px;"></div>`}
            </div>

            <div class="phone-app-body" style="padding: 6px 8px;">
                <!-- 4 ГЛАВНЫХ ТАБА -->
                <div class="mplus-nav-scroll-bar mb-2">
                    <button onclick="AppM.switchMainTab('chats')" class="m-nav-pill ${curTab === 'chats' ? 'active' : ''}">
                        <i class="fa-solid fa-comments"></i> ЧАТЫ ${unreadCount > 0 ? `<span class="m-pill-badge">${unreadCount}</span>` : ''}
                    </button>
                    <button onclick="AppM.switchMainTab('market')" class="m-nav-pill ${curTab === 'market' ? 'active' : ''}">
                        <i class="fa-solid fa-globe"></i> БИРЖА
                    </button>
                    <button onclick="AppM.switchMainTab('social')" class="m-nav-pill ${curTab === 'social' ? 'active' : ''}">
                        <i class="fa-solid fa-users"></i> СОЦИУМ ${activeDeals > 0 ? `<span class="m-pill-badge">${activeDeals}</span>` : ''}
                    </button>
                    <button onclick="AppM.switchMainTab('me')" class="m-nav-pill ${curTab === 'me' ? 'active' : ''}">
                        <i class="fa-solid fa-user"></i> Я
                    </button>
                </div>

                <div id="mHubSubContentBox" style="min-height: 300px;"></div>
            </div>
        `;

        const subBox = document.getElementById('mHubSubContentBox');
        if (!subBox) return;

        try {
            if (curTab === 'chats')       this.renderChatsScreen(subBox);
            else if (curTab === 'market') this.renderMarketScreen(subBox);
            else if (curTab === 'social') this.renderSocialHubScreen(subBox);
            else if (curTab === 'me')     this.renderProfileScreen(subBox);
        } catch (e) {
            console.error('[AppM] Ошибка рендера таба', curTab, e);
            subBox.innerHTML = `
                <div class="glass-card p-3 text-center" style="border-color: var(--red);">
                    <b class="color-red text-xs">Ошибка рендера</b>
                    <div class="sub-label mt-1" style="font-size:9.5px;">${String(e.message || e).substring(0, 150)}</div>
                </div>
            `;
        }
    },

    switchMainTab(tab) {
        this.activeTab = tab;
        this.activeDialogId = null;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // ХЕЛПЕРЫ
    // ========================================================
    _getUnreadCount() {
        return (window.state?.player?.phoneMessages || []).filter(m => m && m.unread).length;
    },

    _getActiveDealsCount() {
        const messages = window.state?.player?.phoneMessages || [];
        return messages.filter(m => m && m.category === 'p2p' && m.unread).length;
    },

    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    _escapeAttr(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    },

    // ========================================================
    // ЧАТЫ — ЕДИНЫЙ ИНБОКС С ФИЛЬТРАМИ
    // ========================================================
    renderChatsScreen(container) {
        if (!container) return;

        this.syncSalesLotBuyersToMessages();

        if (typeof window.cleanupOrphanedDialogs === 'function') {
            try { window.cleanupOrphanedDialogs(); } catch (e) {}
        }

        const filtered = this._getFilteredDialogs();

        const allMsgs = window.state?.player?.phoneMessages || [];
        const counts = {
            all: allMsgs.length,
            p2p: allMsgs.filter(m => m && m.category === 'p2p').length,
            buyers: allMsgs.filter(m => m && m.category === 'buyers').length,
            friends: allMsgs.filter(m => m && m.category === 'friends').length
        };

        const curFilter = this.chatFilter;

        container.innerHTML = `
            <div class="mplus-nav-scroll-bar mb-2">
                <button onclick="AppM.setChatFilter('all')" class="m-nav-pill ${curFilter === 'all' ? 'active' : ''}">
                    <i class="fa-solid fa-list-ul"></i> Все (${counts.all})
                </button>
                <button onclick="AppM.setChatFilter('p2p')" class="m-nav-pill ${curFilter === 'p2p' ? 'active' : ''}">
                    <i class="fa-solid fa-handshake"></i> Торг P2P (${counts.p2p})
                </button>
                <button onclick="AppM.setChatFilter('buyers')" class="m-nav-pill ${curFilter === 'buyers' ? 'active' : ''}">
                    <i class="fa-solid fa-user-tag"></i> Покупатели (${counts.buyers})
                </button>
                <button onclick="AppM.setChatFilter('friends')" class="m-nav-pill ${curFilter === 'friends' ? 'active' : ''}">
                    <i class="fa-solid fa-user-group"></i> Друзья (${counts.friends})
                </button>
            </div>

            <div id="mDialogsListContainer">
                ${this._renderDialogsListHtml(filtered)}
            </div>
        `;
    },

    setChatFilter(filter) {
        this.chatFilter = filter;
        if (typeof playSound === 'function') playSound('tick');
        this.render(document.getElementById('phoneAppContainer'));
    },

    _getFilteredDialogs() {
        const all = window.state?.player?.phoneMessages || [];
        const f = this.chatFilter;

        let filtered = all;
        if (f === 'p2p') {
            filtered = all.filter(m => m && m.category === 'p2p');
        } else if (f === 'buyers') {
            filtered = all.filter(m => m && m.category === 'buyers');
        } else if (f === 'friends') {
            filtered = all.filter(m => m && m.category === 'friends');
        }

        return [...filtered].sort((a, b) => {
            if (!a || !b) return 0;
            const aUnread = a.unread ? 1 : 0;
            const bUnread = b.unread ? 1 : 0;
            if (aUnread !== bUnread) return bUnread - aUnread;
            const aTs = a.lastMessageAt || a.createdAt || 0;
            const bTs = b.lastMessageAt || b.createdAt || 0;
            return bTs - aTs;
        });
    },

    _renderDialogsListHtml(dialogs) {
        if (!dialogs || dialogs.length === 0) {
            return `
                <div class="glass-card text-center sub-label py-6" style="background:#090e18;">
                    <i class="fa-solid fa-comment-slash color-cyan mb-2" style="font-size:26px;"></i>
                    <div>Здесь пока пусто</div>
                    <div class="text-xs mt-1" style="font-size:9px;">
                        ${this.chatFilter === 'p2p' ? 'Откройте Биржу и напишите продавцу' : 
                          this.chatFilter === 'buyers' ? 'Выставьте авто на площадку продаж' :
                          this.chatFilter === 'friends' ? 'Найдите друзей в разделе Социум' :
                          'Начните переписку — биржа, площадка или друзья'}
                    </div>
                </div>
            `;
        }

        return dialogs.map(m => this._buildDialogCard(m)).join('');
    },

    _buildDialogCard(m) {
        if (!m) return '';

        const history = m.chatHistory || [];
        const lastMsg = history.length > 0 ? history[history.length - 1].text : (m.preview || '');
        const isUnread = !!m.unread;
        const category = m.category || 'unknown';

        const carData = m.carData || {};
        const rawImg = carData.img || "assets/cars/economy/2101/vaz-2101.jpg";
        const carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
        const fallbackImg = (typeof getCategoryFallback === 'function') ? getCategoryFallback(carData.type || 'economy') : "assets/cars/economy/2101/vaz-2101.jpg";

        let categoryBadge = '';
        if (category === 'p2p') {
            const role = m.p2pRole === 'seller' ? 'ВЫ — ПРОДАВЕЦ' : 'ВЫ — ПОКУПАТЕЛЬ';
            const roleColor = m.p2pRole === 'seller' ? 'var(--amber)' : 'var(--cyan)';
            categoryBadge = `<span class="tag-badge" style="background:rgba(${m.p2pRole === 'seller' ? '255,179,0' : '0,242,254'},0.15); color:${roleColor}; font-size:7.5px;">${role}</span>`;
        } else if (category === 'buyers') {
            categoryBadge = `<span class="tag-badge bg-tag-green" style="font-size:7.5px;">ПОКУПАТЕЛЬ NPC</span>`;
        } else if (category === 'friends') {
            categoryBadge = `<span class="tag-badge bg-tag-cyan" style="font-size:7.5px;">ДРУГ</span>`;
        }

        const unreadBadge = isUnread
            ? `<span class="tag-badge bg-tag-red" style="font-weight:900; font-size:7.5px;"><span class="led-dot led-red"></span> НОВОЕ</span>`
            : '';

        let priceText = '';
        if (m.askingPrice) {
            priceText = `${Number(m.askingPrice).toLocaleString()} ₽`;
        }

        let dealActionBtn = '';
        if (category === 'p2p') {
            dealActionBtn = `
                <button onclick="event.stopPropagation(); AppM.openDealForDialog('${m.id}')" 
                        class="btn btn-amber btn-sm btn-auto" 
                        style="font-size:9px; padding:3px 8px;">
                    <i class="fa-solid fa-file-signature"></i> ДКП
                </button>
            `;
        }

        return `
            <div onclick="AppM.openDialog('${m.id}')" 
                 class="glass-card mb-2 p-2 cursor-pointer ${isUnread ? 'card-glow-deal' : ''}" 
                 style="border-left: 3px solid ${isUnread ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}; background: #090e18;">
                
                <div class="car-img-wrap mb-2" style="height:100px; position:relative; border-radius:10px; overflow:hidden;">
                    <img src="${carImg}" 
                         class="car-img" 
                         style="width:100%; height:100%; object-fit:cover;" 
                         onerror="this.onerror=null; this.src='${fallbackImg}';">
                    <div class="badge-tag badge-br" style="bottom:4px; right:4px;">
                        ${unreadBadge}
                    </div>
                    ${categoryBadge ? `<div class="badge-tag badge-tl" style="top:4px; left:4px;">${categoryBadge}</div>` : ''}
                </div>

                <div class="flex-between mb-1">
                    <div style="min-width:0; flex:1;">
                        <b class="text-xs color-cyan" style="font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">
                            ${this._escapeHtml(carData.name || 'Диалог')}
                        </b>
                        <div class="sub-label" style="font-size:8.5px;">
                            ${this._escapeHtml(m.sender || 'Собеседник')}
                        </div>
                    </div>
                    ${priceText ? `
                        <div class="text-right" style="flex-shrink:0;">
                            <span class="sub-label" style="font-size:7.5px;">${category === 'p2p' ? 'ЦЕНА' : 'ПРЕДЛОЖЕНИЕ'}</span>
                            <div class="price-val text-xs color-green" style="font-size:12px;">${priceText}</div>
                        </div>
                    ` : ''}
                </div>

                <div class="seller-dialog-bubble my-1" 
                     style="border-left: 3px solid var(--cyan); background: rgba(0, 242, 254, 0.04); padding: 5px 9px; border-radius: 6px;">
                    <span class="sub-label" 
                          style="font-size:9px; color:#cbd5e1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">
                        ${this._escapeHtml(lastMsg) || 'Начните переписку...'}
                    </span>
                </div>

                <div class="grid-2 mt-1" style="gap:4px;">
                    <button onclick="event.stopPropagation(); AppM.openDialog('${m.id}')" 
                            class="btn btn-cyan btn-sm" 
                            style="font-size:9px; padding:5px 0;">
                        <i class="fa-solid fa-comments mr-1"></i> ОТКРЫТЬ
                    </button>
                    ${dealActionBtn || `
                        <button onclick="event.stopPropagation(); AppM.deleteDialog('${m.id}')" 
                                class="btn btn-dark btn-sm" 
                                style="font-size:9px; padding:5px 0;">
                            <i class="fa-solid fa-trash"></i> УДАЛИТЬ
                        </button>
                    `}
                </div>
            </div>
        `;
    },

    deleteDialog(dialogId) {
        if (!confirm('Удалить диалог?')) return;
        if (!window.state?.player?.phoneMessages) return;

        window.state.player.phoneMessages = window.state.player.phoneMessages.filter(m => m.id !== dialogId);
        if (typeof saveState === 'function') saveState();
        if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.updateUnreadBadge === 'function') {
            PhoneManager.updateUnreadBadge();
        }
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // ОТКРЫТЬ ДКП ПО ДИАЛОГУ
    // ========================================================
    async openDealForDialog(dialogId) {
        const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === dialogId);
        if (!msg) return;

        if (msg.category !== 'p2p') {
            return showToast('⚠️ ДКП доступен только для P2P-диалогов');
        }

        const lotId = msg.p2pLotId;
        if (!lotId) return showToast('❌ Нет привязки к лоту');

        if (!window.P2PDeals) {
            return showToast('⚠️ Модуль P2P-сделок не загружен');
        }

        const existing = await window.P2PDeals.findActiveDealByLot(lotId);
        if (existing) {
            this._openP2PDKPModal(existing.id, existing);
            return;
        }

        const lot = await this._findLotById(lotId);
        if (!lot) return showToast('❌ Лот не найден');

        const price = Number(lot.price) || 100000;

        const res = await window.P2PDeals.createDealDraft(lotId, price);
        if (res.success) {
            this._openP2PDKPModal(res.dealId, res.deal);
        } else {
            showToast(`❌ ${res.error}`);
        }
    },

    async _findLotById(lotId) {
        if (!lotId) return null;
        const local = (window.state?.p2pMarketListings || []).find(l => l && (l.id === lotId || l.lot_id === lotId));
        if (local) return local;
        if (window.FB_Bridge?.MarketLots?.fetchLots) {
            try {
                const lots = await window.FB_Bridge.MarketLots.fetchLots();
                return (lots || []).find(l => l && (l.id === lotId || l.lot_id === lotId)) || null;
            } catch (e) {}
        }
        return null;
    },

    _openP2PDKPModal(dealId, deal) {
        const modal = document.getElementById('modalP2PDKP');
        if (!modal) {
            return showToast('⚠️ Модалка ДКП не найдена в index.html');
        }

        if (window.P2PDKPModal && typeof window.P2PDKPModal.open === 'function') {
            window.P2PDKPModal.open(dealId, deal);
        } else {
            showToast('⚠️ Обработчик P2PDKPModal не загружен');
        }
    },

    // ========================================================
    // ЭКРАН ДИАЛОГА (ОБСУЖДЕНИЕ)
    // ========================================================
    async openDialog(msgId) {
        const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === msgId);
        if (!msg) return;

        this.activeDialogId = msgId;
        msg.unread = false;
        msg.viewed = true;

        if (typeof saveState === 'function') saveState();
        if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.updateUnreadBadge === 'function') {
            PhoneManager.updateUnreadBadge();
        }

        if (typeof playSound === 'function') playSound('tick');
        this.render(document.getElementById('phoneAppContainer'));
    },

    closeDialog() {
        this.activeDialogId = null;
        if (typeof playSound === 'function') playSound('tick');
        this.render(document.getElementById('phoneAppContainer'));
    },

    renderConversationScreen(container) {
        const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === this.activeDialogId);
        if (!msg) {
            this.activeDialogId = null;
            this.render(container);
            return;
        }

        if (msg.category === 'p2p') {
            this._renderP2PConversation(container, msg);
        } else if (msg.category === 'buyers') {
            this._renderNPCDialog(container, msg);
        } else {
            this._renderGenericDialog(container, msg);
        }
    },

    async _renderP2PConversation(container, msg) {
        const carData = msg.carData || {};
        const rawImg = carData.img || "assets/cars/economy/2101/vaz-2101.jpg";
        const carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
        const fallbackImg = (typeof getCategoryFallback === 'function') ? getCategoryFallback(carData.type || 'economy') : "assets/cars/economy/2101/vaz-2101.jpg";

        let activeDeal = null;
        if (window.P2PDeals && msg.p2pLotId) {
            try {
                activeDeal = await window.P2PDeals.findActiveDealByLot(msg.p2pLotId);
            } catch (e) {}
        }

        const history = msg.chatHistory || [];

        container.innerHTML = `
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 242, 254, 0.4); flex-shrink: 0;">
                <button onclick="AppM.closeDialog()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div style="text-align:center; min-width:0; flex:1;">
                    <div class="phone-app-title text-xs font-bold" style="font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${this._escapeHtml(msg.sender || 'Продавец')}
                    </div>
                    <div class="sub-label color-green" style="font-size:8px;">● P2P Биржа</div>
                </div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body" style="display:flex; flex-direction:column; gap:8px; padding:6px;">
                <div class="glass-card p-2" style="border: 1.5px solid var(--cyan); background: #060a14; margin-bottom: 0;">
                    <div class="deal-car-preview-card" style="height:56px; min-height:56px; padding:4px 8px;">
                        <img src="${carImg}" class="deal-car-thumb" 
                             style="width:68px; height:46px; min-width:68px; object-fit:cover;" 
                             onerror="this.onerror=null; this.src='${fallbackImg}';">
                        <div style="flex:1; min-width:0;">
                            <div class="flex-between">
                                <b class="text-xs color-cyan block" style="font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                    ${this._escapeHtml(carData.name || 'Автомобиль')}
                                </b>
                                <span class="tag-badge bg-tag-cyan" style="font-size:7.5px;">P2P ЛОТ</span>
                            </div>
                            <div class="sub-label mt-1" style="font-size:8.5px;">
                                Продавец: <b class="color-amber">${this._escapeHtml(msg.sender || '—')}</b>
                            </div>
                            <div class="flex-between mt-1">
                                <span class="sub-label" style="font-size:8px;">Цена продавца:</span>
                                <b class="color-green text-xs" style="font-size:12px;">${Number(msg.askingPrice || 0).toLocaleString()} ₽</b>
                            </div>
                        </div>
                    </div>
                </div>

                ${activeDeal ? `
                    <div class="p-2" style="background:rgba(255,179,0,0.1); border-radius:10px; border:1px solid rgba(255,179,0,0.4);">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-amber" style="font-size:10px;">
                                <i class="fa-solid fa-file-signature mr-1"></i> ${window.P2PDeals?.getStatusLabel(activeDeal.status) || 'ДКП активен'}
                            </b>
                            <button onclick="event.stopPropagation(); AppM.openActiveDeal()" 
                                    class="btn btn-amber btn-sm btn-auto" 
                                    style="font-size:9px; padding:3px 8px;">
                                ОТКРЫТЬ
                            </button>
                        </div>
                        <div class="sub-label" style="font-size:9px;">
                            Цена: <b class="color-green">${Number(activeDeal.currentPrice).toLocaleString()} ₽</b>
                        </div>
                    </div>
                ` : ''}

                <div class="chat-thread-container" id="mChatScrollBox" 
                     style="flex:1; min-height:180px; max-height:340px; overflow-y:auto; padding:8px; background:#04070e; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
                    ${history.length === 0 ? `
                        <div class="sub-label text-center py-4" style="font-size:9.5px;">
                            Начните переписку — обсудите цену и состояние
                        </div>
                    ` : history.map(item => `
                        <div class="chat-msg ${item.from === 'me' ? 'msg-player' : 'msg-seller'}" style="margin-bottom:6px;">
                            ${this._escapeHtml(item.text)}
                        </div>
                    `).join('')}
                </div>

                <div class="p2p-compact-composer">
                    <input type="text" 
                           id="mP2PChatInput" 
                           class="chat-input p2p-compact-input" 
                           placeholder="Написать сообщение..." 
                           maxlength="200"
                           autocomplete="off"
                           onkeydown="if(event.key==='Enter'){AppM.sendP2PMessage('${msg.id}');}">
                    <button onclick="AppM.sendP2PMessage('${msg.id}')" 
                            class="p2p-compact-btn p2p-compact-btn-send" 
                            title="Отправить сообщение">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>

                <div class="grid-2" style="gap:6px;">
                    ${activeDeal ? `
                        <button onclick="AppM.openActiveDeal()" class="btn btn-amber w-full" style="font-size:11px;">
                            <i class="fa-solid fa-file-signature mr-1"></i> ОТКРЫТЬ ДКП
                        </button>
                    ` : `
                        <button onclick="AppM.openDealForDialog('${msg.id}')" class="btn btn-green w-full" style="font-size:11px;">
                            <i class="fa-solid fa-file-signature mr-1"></i> 💰 ОФОРМИТЬ ДКП
                        </button>
                    `}
                    <button onclick="AppM.closeDialog()" class="btn btn-dark w-full" style="font-size:11px;">
                        <i class="fa-solid fa-arrow-left mr-1"></i> К бирже
                    </button>
                </div>
            </div>
        `;

        const box = document.getElementById('mChatScrollBox');
        if (box) box.scrollTop = box.scrollHeight;
    },

    openActiveDeal() {
        const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === this.activeDialogId);
        if (!msg || !msg.p2pLotId) return;
        this.openDealForDialog(this.activeDialogId);
    },

    async sendP2PMessage(dialogId) {
        const input = document.getElementById('mP2PChatInput');
        if (!input || !input.value.trim()) return;

        const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === dialogId);
        if (!msg) return;

        const text = input.value.trim();
        input.value = '';

        if (!Array.isArray(msg.chatHistory)) msg.chatHistory = [];
        msg.chatHistory.push({ from: 'me', text: text });
        msg.lastMessageAt = Date.now();
        msg.preview = text;

        if (window.FB_Bridge?.ChatMessages?.sendMessage && msg.dialogId) {
            try {
                await window.FB_Bridge.ChatMessages.sendMessage({
                    dialogId: msg.dialogId,
                    text: text,
                    receiverId: msg.sellerId || null
                });
            } catch (e) {
                console.warn('[AppM] sendP2PMessage firestore error:', e);
            }
        }

        if (typeof saveState === 'function') saveState();
        if (typeof playSound === 'function') playSound('tick');

        const box = document.getElementById('mChatScrollBox');
        if (box) {
            const div = document.createElement('div');
            div.className = 'chat-msg msg-player';
            div.style.marginBottom = '6px';
            div.innerText = text;
            box.appendChild(div);
            box.scrollTop = box.scrollHeight;
        }
    },

    _renderNPCDialog(container, msg) {
        const carData = msg.carData || {};
        const rawImg = carData.img || "assets/cars/economy/2101/vaz-2101.jpg";
        const carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
        const fallbackImg = (typeof getCategoryFallback === 'function') ? getCategoryFallback(carData.type || 'economy') : "assets/cars/economy/2101/vaz-2101.jpg";

        const history = msg.chatHistory || [];

        container.innerHTML = `
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 230, 118, 0.4); flex-shrink: 0;">
                <button onclick="AppM.closeDialog()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div style="text-align:center;">
                    <div class="phone-app-title text-xs font-bold">${this._escapeHtml(msg.sender || 'Покупатель')}</div>
                    <div class="sub-label color-green" style="font-size:8px;">● Покупатель с площадки</div>
                </div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body" style="padding:6px;">
                <div class="glass-card p-2 mb-2" style="border: 1.5px solid var(--green); background: #060a14;">
                    <div class="deal-car-preview-card" style="padding:4px 8px;">
                        <img src="${carImg}" class="deal-car-thumb" 
                             style="width:68px; height:46px; object-fit:cover;" 
                             onerror="this.onerror=null; this.src='${fallbackImg}';">
                        <div style="flex:1; min-width:0;">
                            <b class="text-xs color-cyan" style="font-size:11.5px;">${this._escapeHtml(carData.name || 'Автомобиль')}</b>
                            <div class="sub-label mt-1" style="font-size:8.5px;">
                                Предложение: <b class="color-green">${Number(msg.offerPrice || 0).toLocaleString()} ₽</b>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="chat-thread-container" id="mChatScrollBox" 
                     style="min-height:200px; max-height:340px; overflow-y:auto; padding:8px; background:#04070e; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
                    ${history.map(item => `
                        <div class="chat-msg ${item.from === 'me' ? 'msg-player' : 'msg-seller'}" style="margin-bottom:6px;">
                            ${this._escapeHtml(item.text)}
                        </div>
                    `).join('')}
                </div>

                <div class="p2p-compact-composer mt-2">
                    <input type="text" 
                           id="mP2PChatInput" 
                           class="chat-input p2p-compact-input" 
                           placeholder="Сообщение покупателю..." 
                           maxlength="200"
                           onkeydown="if(event.key==='Enter'){AppM.sendNPCMessage('${msg.id}');}">
                    <button onclick="AppM.sendNPCMessage('${msg.id}')" 
                            class="p2p-compact-btn p2p-compact-btn-send">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>

                <div class="grid-2 mt-2" style="gap:6px;">
                    <button onclick="AppM.acceptNPCBuyer('${msg.id}')" class="btn btn-green" style="font-size:11px;">
                        🤝 Согласиться
                    </button>
                    <button onclick="AppM.rejectNPCBuyer('${msg.id}')" class="btn btn-dark" style="font-size:11px;">
                        ❌ Отказать
                    </button>
                </div>
            </div>
        `;

        const box = document.getElementById('mChatScrollBox');
        if (box) box.scrollTop = box.scrollHeight;
    },

    sendNPCMessage(dialogId) {
        const input = document.getElementById('mP2PChatInput');
        if (!input || !input.value.trim()) return;
        const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === dialogId);
        if (!msg) return;
        const text = input.value.trim();
        input.value = '';
        if (!Array.isArray(msg.chatHistory)) msg.chatHistory = [];
        msg.chatHistory.push({ from: 'me', text });
        if (typeof saveState === 'function') saveState();
        if (typeof playSound === 'function') playSound('tick');
        const box = document.getElementById('mChatScrollBox');
        if (box) {
            const div = document.createElement('div');
            div.className = 'chat-msg msg-player';
            div.style.marginBottom = '6px';
            div.innerText = text;
            box.appendChild(div);
            box.scrollTop = box.scrollHeight;
        }
    },

    acceptNPCBuyer(dialogId) {
        if (typeof finishSalesLotDeal === 'function') {
            const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === dialogId);
            if (msg && msg.carIndex !== undefined) {
                const slot = window.state.salesLot?.[msg.carIndex];
                if (slot) {
                    const finalPrice = msg.offerPrice || 100000;
                    const purchaseCost = (slot.car?.purchaseCost) || Math.round(finalPrice * 0.75);
                    const profit = finalPrice - purchaseCost;
                    this.closeDialog();
                    finishSalesLotDeal(msg.carIndex, finalPrice, profit);
                    return;
                }
            }
        }
        showToast('⚠️ Действие недоступно');
    },

    rejectNPCBuyer(dialogId) {
        const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === dialogId);
        if (msg && msg.carIndex !== undefined && typeof rejectLotBuyer === 'function') {
            this.closeDialog();
            rejectLotBuyer(msg.carIndex);
        } else {
            this.closeDialog();
        }
    },

    _renderGenericDialog(container, msg) {
        const history = msg.chatHistory || [];

        container.innerHTML = `
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 242, 254, 0.4); flex-shrink: 0;">
                <button onclick="AppM.closeDialog()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title text-xs font-bold">${this._escapeHtml(msg.sender || 'Диалог')}</div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body" style="padding:6px;">
                <div class="chat-thread-container" id="mChatScrollBox" 
                     style="min-height:200px; max-height:400px; overflow-y:auto; padding:8px; background:#04070e; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
                    ${history.map(item => `
                        <div class="chat-msg ${item.from === 'me' ? 'msg-player' : 'msg-seller'}" style="margin-bottom:6px;">
                            ${this._escapeHtml(item.text)}
                        </div>
                    `).join('')}
                </div>

                <div class="p2p-compact-composer mt-2">
                    <input type="text" 
                           id="mP2PChatInput" 
                           class="chat-input p2p-compact-input" 
                           placeholder="Сообщение..." 
                           maxlength="200"
                           onkeydown="if(event.key==='Enter'){AppM.sendGenericMessage('${msg.id}');}">
                    <button onclick="AppM.sendGenericMessage('${msg.id}')" 
                            class="p2p-compact-btn p2p-compact-btn-send">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;

        const box = document.getElementById('mChatScrollBox');
        if (box) box.scrollTop = box.scrollHeight;
    },

    sendGenericMessage(dialogId) {
        const input = document.getElementById('mP2PChatInput');
        if (!input || !input.value.trim()) return;
        const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === dialogId);
        if (!msg) return;
        const text = input.value.trim();
        input.value = '';
        if (!Array.isArray(msg.chatHistory)) msg.chatHistory = [];
        msg.chatHistory.push({ from: 'me', text });
        if (typeof saveState === 'function') saveState();
        if (typeof playSound === 'function') playSound('tick');
        const box = document.getElementById('mChatScrollBox');
        if (box) {
            const div = document.createElement('div');
            div.className = 'chat-msg msg-player';
            div.style.marginBottom = '6px';
            div.innerText = text;
            box.appendChild(div);
            box.scrollTop = box.scrollHeight;
        }
    },

    // ========================================================
    // БИРЖА
    // ========================================================
    renderMarketScreen(container) {
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
    },

    setMarketFilter(filter) {
        const pLvl = window.state.player?.level || 1;
        if (filter === 'plates' && pLvl < 3) return showToast('🔒 Категория с 3 уровня');
        if (filter === 'housing' && pLvl < 4) return showToast('🔒 Категория с 4 уровня');
        if (filter === 'business' && pLvl < 6) return showToast('🔒 Категория с 6 уровня');
        this.marketFilter = filter;
        if (typeof playSound === 'function') playSound('tick');
        const area = document.getElementById('p2pLotsArea');
        if (area) area.innerHTML = this.renderP2PLotsHtml(filter);
    },

    renderP2PLotsHtml(filter) {
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
    },

    // ⭐ v8.2.0: Автономный торг с продавцом
    async startTradeWithSeller(lotId) {
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');

        const lot = await this._findLotById(lotId);
        if (!lot) return showToast('❌ Лот не найден');

        const myUid = String(window.state?.player?.uid || window.tgUserId || '');
        if (String(lot.sellerId) === myUid) {
            return showToast('Это ваш собственный лот');
        }

        // Если P2PDeals доступен — используем его
        if (window.P2PDeals && typeof window.P2PDeals.openDealChat === 'function') {
            const res = await window.P2PDeals.openDealChat(lotId);
            if (!res.success) showToast(`❌ ${res.error}`);
            return;
        }

        // Автономный переход в диалог торга
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
    },

    // ⭐ v8.2.0: Автономный выкуп P2P лота
    async buyP2PInstantly(lotId) {
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

        // Если модалка ДКП через P2PDeals доступна
        if (window.P2PDeals && typeof window.P2PDeals.createDealDraft === 'function') {
            const res = await window.P2PDeals.createDealDraft(lotId, price);
            if (res.success) {
                this._openP2PDKPModal(res.dealId, res.deal);
                return;
            }
        }

        // Автономный прямой выкуп
        if (!confirm(`Вы действительно хотите выкупить «${lot.name}» за ${price.toLocaleString()} ₽?`)) return;

        // Проверка боксов гаража
        if (lot.type === 'cars' || lot.type === 'car') {
            const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
            if ((window.state.garage?.length || 0) >= maxSlots) {
                return showToast('В гараже нет свободного места! Освободите бокс.');
            }
        }

        // Списание денег
        window.state.player.cash -= price;

        // Зачисление имущества
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

        // Синхронизация с Firestore
        if (window.FB_Bridge?.MarketLots?.buyLotAtomic) {
            try {
                await window.FB_Bridge.MarketLots.buyLotAtomic(lot.id || lot.lot_id, myUid);
            } catch (e) {
                console.warn('[P2P] buyLotAtomic warning:', e);
            }
        }

        // Удаление из локального списка биржи
        window.state.p2pMarketListings = (window.state.p2pMarketListings || []).filter(l =>
            l && l.id !== lotId && l.lot_id !== lotId
        );

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`🎉 Вы успешно приобрели «${lot.name}»!`);

        this._refreshCurrentScreen();
    },

    async cancelP2PListing(lotId) {
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

        // Возвращаем номер в инвентарь при отмене
        if (lot.type === 'plates' || lot.type === 'plate') {
            const plateNum = lot.itemData?.plate;
            const pObj = (window.state.player?.platesInventory || []).find(p => p && p.number === plateNum);
            if (pObj) pObj.status = 'inventory';
        }

        if (typeof saveState === 'function') saveState();
        if (typeof showToast === 'function') showToast('Лот снят');
        this._refreshCurrentScreen();
    },

    // --------------------------------------------------------
    // СОЗДАНИЕ ЛОТА (модалка)
    // --------------------------------------------------------
    openCreateListingModal() {
        this.selectP2PListingType('cars');
        if (typeof ModalManager !== 'undefined') ModalManager.open('modalCreateP2P');
    },

    selectP2PListingType(type) {
        this.selectedListingType = type;
        this.selectedItemIndex = null;

        const elMap = { cars: 'btnP2PTypeCar', plates: 'btnP2PTypePlate', business: 'btnP2PTypeBiz', housing: 'btnP2PTypeHouse' };
        ['cars', 'plates', 'business', 'housing'].forEach(t => {
            const btn = document.getElementById(elMap[t]);
            if (btn) btn.className = t === type ? 'btn btn-cyan btn-sm' : 'btn btn-dark btn-sm';
        });

        this.renderP2PCardsList(type);
    },

    renderP2PCardsList(type) {
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
    },

    pickP2PItemCard(idx) {
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
    },

    async confirmCreateP2PListing() {
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
    },

    // ========================================================
    // СОЦИУМ — объединённый хаб
    // ========================================================
    renderSocialHubScreen(container) {
        if (!container) return;

        const sub = this.socialSubTab;

        container.innerHTML = `
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(192, 132, 252, 0.16), #090e18); border-color: var(--purple);">
                <div>
                    <b class="text-xs color-purple"><i class="fa-solid fa-users mr-1"></i> Социум перекупов</b>
                    <div class="sub-label" style="font-size:8.5px;">Лента · Топ · Друзья · Клубы</div>
                </div>
                <span class="tag-badge bg-tag-purple">M+ SOCIAL</span>
            </div>

            <div class="mplus-nav-scroll-bar mb-2">
                <button onclick="AppM.setSocialSubTab('feed')" class="m-nav-pill ${sub === 'feed' ? 'active' : ''}">
                    <i class="fa-solid fa-newspaper"></i> Лента
                </button>
                <button onclick="AppM.setSocialSubTab('top')" class="m-nav-pill ${sub === 'top' ? 'active' : ''}">
                    <i class="fa-solid fa-trophy"></i> Топ
                </button>
                <button onclick="AppM.setSocialSubTab('friends')" class="m-nav-pill ${sub === 'friends' ? 'active' : ''}">
                    <i class="fa-solid fa-user-group"></i> Друзья
                </button>
                <button onclick="AppM.setSocialSubTab('clubs')" class="m-nav-pill ${sub === 'clubs' ? 'active' : ''}">
                    <i class="fa-solid fa-shield-halved"></i> Клубы
                </button>
            </div>

            <div id="mSocialContentBox" style="min-height: 250px;"></div>
        `;

        const box = document.getElementById('mSocialContentBox');
        if (!box) return;

        try {
            if (sub === 'feed') {
                if (window.MEventsModule) {
                    if (typeof window.MEventsModule.onTabOpen === 'function') window.MEventsModule.onTabOpen();
                    if (typeof window.MEventsModule.renderScreen === 'function') {
                        window.MEventsModule.renderScreen(box);
                    } else {
                        box.innerHTML = `<div class="glass-card text-center py-4 sub-label">Лента временно недоступна</div>`;
                    }
                } else {
                    box.innerHTML = `<div class="glass-card text-center py-4 sub-label">MEventsModule не загружен</div>`;
                }
            } else if (sub === 'top') {
                if (window.MLeaderboardModule) {
                    if (typeof window.MLeaderboardModule.onTabOpen === 'function') window.MLeaderboardModule.onTabOpen();
                    if (typeof window.MLeaderboardModule.renderScreen === 'function') {
                        window.MLeaderboardModule.renderScreen(box);
                    }
                } else {
                    box.innerHTML = `<div class="glass-card text-center py-4 sub-label">MLeaderboardModule не загружен</div>`;
                }
            } else if (sub === 'friends') {
                this._renderFriendsScreen(box);
            } else if (sub === 'clubs') {
                if (window.MClubsModule) {
                    if (typeof window.MClubsModule.onTabOpen === 'function') window.MClubsModule.onTabOpen();
                    if (typeof window.MClubsModule.renderScreen === 'function') {
                        window.MClubsModule.renderScreen(box);
                    }
                } else {
                    box.innerHTML = `<div class="glass-card text-center py-4 sub-label">MClubsModule не загружен</div>`;
                }
            }
        } catch (e) {
            console.error('[AppM] Ошибка рендера социума:', e);
            box.innerHTML = `<div class="glass-card p-3 text-center" style="border-color: var(--red);">
                <b class="color-red text-xs">Ошибка</b>
                <div class="sub-label mt-1" style="font-size:9px;">${String(e.message || e).substring(0, 120)}</div>
            </div>`;
        }
    },

    setSocialSubTab(sub) {
        this.socialSubTab = sub;
        if (typeof playSound === 'function') playSound('tick');
        this.render(document.getElementById('phoneAppContainer'));
    },

    _renderFriendsScreen(box) {
        const friendsList = window.state?.friendsList || [];
        const pendingReqs = window.state?.player?.pendingFriendRequests || [];

        box.innerHTML = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.14), #090e18); border-color: var(--green);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-green"><i class="fa-solid fa-user-plus mr-1"></i> Друзья</b>
                    <span class="tag-badge bg-tag-green">${friendsList.length}</span>
                </div>
                <div class="sub-label mb-2" style="font-size:8.5px;">Ищите друзей в разделе «Топ» → кнопка «Дружить»</div>
            </div>

            ${pendingReqs.length > 0 ? `
                <div class="glass-card mb-2 p-2" style="border-color: var(--amber);">
                    <b class="text-xs color-amber mb-2 block">📩 Входящие заявки (${pendingReqs.length})</b>${pendingReqs.map(req => `
                        <div class="flex-between p-2 mb-1" style="background:#050914; border-radius:8px;">
                            <div>
                                <b class="text-xs">${this._escapeHtml(req.name || 'Игрок')}</b>
                            </div>
                            <div class="flex-gap">
                                <button onclick="AppM._acceptFriend('${req.id}')" class="btn btn-green btn-sm btn-auto" style="font-size:8px; padding:3px 8px;">✓</button>
                                <button onclick="AppM._declineFriend('${req.id}')" class="btn btn-dark btn-sm btn-auto" style="font-size:8px; padding:3px 8px;">✕</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${friendsList.length === 0 ? `
                <div class="glass-card text-center sub-label py-6" style="background:#090e18;">
                    <i class="fa-solid fa-user-group color-green mb-2" style="font-size:26px;"></i>
                    <div>У вас пока нет друзей</div>
                </div>
            ` : `
                <div class="space-y-1">
                    ${friendsList.map(f => {
                        const friendId = typeof f === 'string' ? f : (f.id || '');
                        const friendName = typeof f === 'string' ? f : (f.name || 'Друг');
                        return `
                            <div class="glass-card p-2 flex-between">
                                <div>
                                    <b class="text-xs color-green">${this._escapeHtml(friendName)}</b>
                                    <div class="sub-label" style="font-size:8.5px;">ID: ${this._escapeHtml(friendId)}</div>
                                </div>
                                <button onclick="AppM._chatWithFriend('${friendId}', '${this._escapeAttr(friendName)}')" 
                                        class="btn btn-cyan btn-sm btn-auto" style="font-size:9px; padding:4px 10px;">
                                    💬 Написать
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        `;
    },

    async _acceptFriend(fromUserId) {
        if (!window.FB_Bridge?.Friendships?.acceptRequest) return showToast('⚠️ Модуль друзей недоступен');
        const res = await window.FB_Bridge.Friendships.acceptRequest(fromUserId);
        if (res && res.success) {
            showToast('✅ Заявка принята');
            window.state.player.pendingFriendRequests = (window.state.player.pendingFriendRequests || []).filter(p => p.id !== fromUserId);
            if (typeof saveState === 'function') saveState();
            this._refreshCurrentScreen();
        }
    },

    async _declineFriend(fromUserId) {
        if (!window.FB_Bridge?.Friendships?.declineRequest) return;
        const res = await window.FB_Bridge.Friendships.declineRequest(fromUserId);
        if (res && res.success) {
            showToast('Заявка отклонена');
            window.state.player.pendingFriendRequests = (window.state.player.pendingFriendRequests || []).filter(p => p.id !== fromUserId);
            if (typeof saveState === 'function') saveState();
            this._refreshCurrentScreen();
        }
    },

    _chatWithFriend(friendId, friendName) {
        if (!window.state.player.phoneMessages) window.state.player.phoneMessages = [];
        const myUid = String(window.state.player?.uid || window.tgUserId || 'me');
        const dialogId = `dlg_friend_${[myUid, String(friendId)].sort().join('_')}`;

        let dialog = window.state.player.phoneMessages.find(m => m.id === dialogId);
        if (!dialog) {
            dialog = {
                id: dialogId,
                dialogId: dialogId,
                category: 'friends',
                sender: friendName,
                time: 'Сейчас',
                unread: false,
                viewed: true,
                chatHistory: []
            };
            window.state.player.phoneMessages.unshift(dialog);
            if (typeof saveState === 'function') saveState();
        }

        this.activeTab = 'chats';
        this.activeDialogId = dialogId;
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // Я — ПРОФИЛЬ
    // ========================================================
    renderProfileScreen(container) {
        if (!container) return;

        const p = window.state.player || {};
        const stats = p.stats || {};
        const garage = window.state.garage || [];

        let fleetValue = 0;
        garage.forEach(c => { if (c) fleetValue += (c.marketValue || c.basePrice || 100000); });

        const winrate = (stats.profitableSales || 0) + (stats.lossSales || 0) > 0
            ? Math.round(((stats.profitableSales || 0) / ((stats.profitableSales || 0) + (stats.lossSales || 0))) * 100)
            : 0;

        container.innerHTML = `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.18), #090e18); border-color: var(--cyan);">
                <div class="avatar-ring mb-2" style="margin: 0 auto; width: 62px; height: 62px;">
                    <div class="avatar-glow"></div>
                    <div class="avatar-fx-glow"></div>
                    <div class="avatar" style="width: 54px; height: 54px; font-size: 22px;">
                        <i class="fa-solid fa-user-ninja"></i>
                    </div>
                </div>
                <h3 class="font-bold text-xs" style="font-size:16px;">${this._escapeHtml(p.name || 'Перекуп #777')}</h3>
                <div class="sub-label mt-1 font-bold color-amber" style="font-size:11px;">${this._escapeHtml(p.traderTitle || 'Быстрый выкуп за кэш 💸')}</div>
                <div class="sub-label mt-1 font-mono" style="font-size:9px; color:#64748b;">UID: ${this._escapeHtml(p.uid || '—')}</div>
                <div class="mt-2 flex-center flex-gap">
                    <span class="tag-badge bg-tag-cyan">Уровень ${p.level || 1}</span>
                    <span class="tag-badge bg-tag-green">${Number(p.cash || 0).toLocaleString()} ₽</span>
                </div>
            </div>

            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.14), #090e18); border-color: var(--green);">
                <b class="text-xs color-green mb-2 block"><i class="fa-solid fa-chart-pie mr-1"></i> Статистика</b>
                <div class="grid-2" style="gap:6px;">
                    <div class="p-2" style="background:#090e18; border-radius:8px;">
                        <div class="sub-label" style="font-size:8px;">Сделок</div>
                        <div class="font-bold color-cyan" style="font-size:14px;">${stats.sold || 0}</div>
                    </div>
                    <div class="p-2" style="background:#090e18; border-radius:8px;">
                        <div class="sub-label" style="font-size:8px;">Винрейт</div>
                        <div class="font-bold color-green" style="font-size:14px;">${winrate}%</div>
                    </div>
                    <div class="p-2" style="background:#090e18; border-radius:8px;">
                        <div class="sub-label" style="font-size:8px;">Автопарк</div>
                        <div class="font-bold color-amber" style="font-size:14px;">${garage.length}</div>
                    </div>
                    <div class="p-2" style="background:#090e18; border-radius:8px;">
                        <div class="sub-label" style="font-size:8px;">Стоимость</div>
                        <div class="font-bold color-green" style="font-size:12px;">${fleetValue.toLocaleString()} ₽</div>
                    </div>
                </div>
            </div>

            <div class="glass-card mb-2 p-2">
                <b class="text-xs color-cyan mb-2 block"><i class="fa-solid fa-cog mr-1"></i> Настройки</b>
                <div class="space-y-1">
                    <button onclick="openHudCustomizerModal()" class="btn btn-dark btn-sm w-full" style="justify-content:flex-start;">
                        <i class="fa-solid fa-palette color-purple mr-2"></i> Стиль HUD и эффекты
                    </button>
                    <button onclick="toggleGameLanguage()" class="btn btn-dark btn-sm w-full" style="justify-content:flex-start;">
                        <i class="fa-solid fa-globe color-cyan mr-2"></i> Язык / Language
                    </button>
                    <button onclick="switchTab('tabProfile')" class="btn btn-dark btn-sm w-full" style="justify-content:flex-start;">
                        <i class="fa-solid fa-id-card color-green mr-2"></i> Полный профиль
                    </button>
                    <button onclick="switchTab('tabPhone'); setTimeout(() => PhoneManager.openApp('post'), 150);" class="btn btn-dark btn-sm w-full" style="justify-content:flex-start;">
                        <i class="fa-solid fa-boxes-packing color-amber mr-2"></i> Почта и Склад
                    </button>
                </div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-amber mb-2 block"><i class="fa-solid fa-users mr-1"></i> Социальное</b>
                <div class="grid-2" style="gap:6px;">
                    <button onclick="AppM.switchMainTab('social'); AppM.setSocialSubTab('top');" class="btn btn-purple btn-sm" style="font-size:9px;">
                        <i class="fa-solid fa-trophy mr-1"></i> Топ игроков
                    </button>
                    <button onclick="AppM.switchMainTab('social'); AppM.setSocialSubTab('clubs');" class="btn btn-purple btn-sm" style="font-size:9px;">
                        <i class="fa-solid fa-shield-halved mr-1"></i> Клубы
                    </button>
                </div>
            </div>
        `;
    },

    // ========================================================
    // СИНХРОНИЗАЦИЯ NPC-ПОКУПАТЕЛЕЙ
    // ========================================================
    syncSalesLotBuyersToMessages() {
        if (!window.state.player) window.state.player = {};
        if (!window.state.player.phoneMessages) window.state.player.phoneMessages = [];
        if (!window.state.salesLot || window.state.salesLot.length === 0) return;

        window.state.salesLot.forEach((slot, slotIdx) => {
            const buyer = slot.currentBuyer || slot.buyer;
            if (slot && buyer && slot.car && buyer.dealType === 'chat') {
                const safeCarName = String(slot.car.name || 'car').replace(/[^a-zа-я0-9]/gi, '_');
                const dialogId = `dlg_buyer_slot_${slotIdx}_${safeCarName}`;
                let exists = window.state.player.phoneMessages.find(m => m.id === dialogId);

                const asking = slot.askingPrice || slot.car.price;
                const offer = buyer.currentOffer || buyer.offeredPrice || Math.round(asking * 0.85);

                if (!exists) {
                    window.state.player.phoneMessages.unshift({
                        id: dialogId,
                        dialogId: dialogId,
                        category: 'buyers',
                        sender: `${buyer.avatar || '🧢'} ${buyer.name || 'Покупатель'}`,
                        time: 'Сейчас',
                        unread: true,
                        viewed: false,
                        carIndex: slotIdx,
                        carUid: slot.car.uid || slot.car.id || null,
                        carData: slot.car,
                        askingPrice: asking,
                        offerPrice: offer,
                        preview: buyer.lastReply || `Готов забрать за ${Number(offer).toLocaleString()} ₽!`,
                        chatHistory: [
                            { from: 'them', text: `Здравствуйте! Пишу по объявлению на «${slot.car.name}». Готов забрать за ${Number(offer).toLocaleString()} ₽!` }
                        ]
                    });
                }
            }
        });
    }
};

window.AppM = AppM;
window.AppMessenger = AppM;

console.log('[💬 phone-m v8.2.0] АВТОНОМНЫЙ ВЫКУП И ТОРГ НА P2P ✓');

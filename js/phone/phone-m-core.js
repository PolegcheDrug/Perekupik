// ========================================================
// js/phone/phone-m-core.js — M+ HUB: ЯДРО И ЧАТЫ (v9.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v9.1.0 (UI/UX UPDATE):
//   - Возвращена кнопка "+ ПРОДАТЬ" на вкладку Биржа с анимацией пульсации.
//   - ФИКС: Системные сообщения (новости, банки) теперь рендерятся
//     как отдельные карточки с иконкой и кнопкой "Очистить", 
//     а не как диалоги с покупателями.
//   - Добавлены анимированные заглушки (радар) для пустых чатов.
//   - Добавлена неоновая пульсация для непрочитанных сообщений.
// ========================================================

if (typeof window.BUSINESS_TITLE_STYLES === 'undefined') window.BUSINESS_TITLE_STYLES = [];
if (typeof window.BUSINESS_CARD_ANIMATIONS === 'undefined') window.BUSINESS_CARD_ANIMATIONS = [];

// ⭐ Единый объект AppM — используется всеми 3 частями
const AppM = {
    // 4 главных таба
    activeTab: 'chats',           // 'chats' | 'market' | 'social' | 'me'

    // Подтабы СОЦИУМА
    socialSubTab: 'feed',         // 'feed' | 'top' | 'friends' | 'clubs'

    // Подтабы ЧАТОВ (фильтры)
    chatFilter: 'all',            // 'all' | 'p2p' | 'buyers' | 'friends' | 'system'

    // Биржа
    marketFilter: 'cars',         // 'cars' | 'plates' | 'business' | 'housing' | 'black_market'
    selectedListingType: 'cars',
    selectedItemIndex: null,
    _currentModalItems: [],

    // Диалоги
    activeDialogId: null,

    // Флаги
    _buyPending: false,
    _publishPending: false,
    _refreshPending: false,

    // Real-time подписка на чат друга
    _friendChatUnsubscribe: null,

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

        // ⭐ v9.1.0: Кнопка "ПРОДАТЬ" с анимацией пульсации
        const headerActionBtn = curTab === 'market' ? `
            <div class="flex-gap" style="align-items:center;">
                <button onclick="AppM.refreshMarketFeed()" class="btn btn-dark btn-auto btn-sm" style="padding:4px 9px;" title="Обновить ленту">
                    <i class="fa-solid fa-arrows-rotate"></i>
                </button>
                <button onclick="AppM.openCreateListingModal()" class="btn btn-green btn-auto btn-sm" style="padding:4px 12px; font-size:9.5px; font-weight:900; box-shadow: 0 0 10px rgba(0,230,118,0.5); animation: btnPulseGlow 2s infinite alternate;">
                    <i class="fa-solid fa-plus mr-1"></i> ПРОДАТЬ
                </button>
            </div>
        ` : `<div style="width:40px;"></div>`;

        container.innerHTML = `
            <style>
                @keyframes btnPulseGlow {
                    0% { box-shadow: 0 0 5px rgba(0,230,118,0.3); }
                    100% { box-shadow: 0 0 15px rgba(0,230,118,0.8); }
                }
                @keyframes radarSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes msgPulse {
                    0% { border-color: rgba(0,242,254,0.3); }
                    50% { border-color: rgba(0,242,254,1); box-shadow: 0 0 15px rgba(0,242,254,0.4); }
                    100% { border-color: rgba(0,242,254,0.3); }
                }
            </style>

            <div class="phone-app-header" style="border-bottom-color: rgba(0, 242, 254, 0.4); padding: 6px 10px;">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn">
                    <i class="fa-solid fa-chevron-left"></i> Меню
                </button>
                <div class="phone-app-title color-cyan" style="display:flex; align-items:center; gap:6px;">
                    <span class="m-network-logo" style="background: linear-gradient(135deg, #00f2fe, #7928ca); padding: 2px 7px; border-radius: 6px; font-weight: 900; color: #000; font-size: 11px;">M+</span>
                    <span style="font-size:12px; font-weight:900; letter-spacing:0.4px;">PRO HUB</span>
                </div>
                ${headerActionBtn}
            </div>

            <div class="phone-app-body" style="padding: 6px 8px;">
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
            system: allMsgs.filter(m => m && (m.category === 'system' || m.isSystem)).length,
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
                <button onclick="AppM.setChatFilter('system')" class="m-nav-pill ${curFilter === 'system' ? 'active' : ''}">
                    <i class="fa-solid fa-newspaper"></i> Система (${counts.system})
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
        } else if (f === 'system') {
            filtered = all.filter(m => m && (m.category === 'system' || m.isSystem));
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
                <div class="glass-card text-center sub-label py-6" style="background:#090e18; border: 1px dashed rgba(0,242,254,0.2);">
                    <div style="position:relative; width:60px; height:60px; margin:0 auto 15px auto;">
                        <div style="position:absolute; inset:0; border:2px solid rgba(0,242,254,0.2); border-radius:50%;"></div>
                        <div style="position:absolute; inset:0; border-top:2px solid var(--cyan); border-radius:50%; animation: radarSpin 2s linear infinite;"></div>
                        <i class="fa-solid fa-satellite-dish" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:20px; color:var(--cyan);"></i>
                    </div>
                    <div class="font-bold color-cyan" style="font-size:12px;">Эфир пуст</div>
                    <div class="text-xs mt-1" style="font-size:9px; color:#94a3b8;">
                        ${this.chatFilter === 'p2p' ? 'Откройте Биржу и напишите продавцу' : 
                          this.chatFilter === 'buyers' ? 'Выставьте авто на площадку продаж' :
                          this.chatFilter === 'system' ? 'Системных уведомлений пока нет' :
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
        const isSystem = category === 'system' || m.isSystem;

        const carData = m.carData || {};
        const rawImg = carData.img || "assets/cars/economy/2101/vaz-2101.jpg";
        const carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
        const fallbackImg = (typeof getCategoryFallback === 'function') ? getCategoryFallback(carData.type || 'economy') : "assets/cars/economy/2101/vaz-2101.jpg";

        // ⭐ v9.1.0: СИСТЕМНЫЕ СООБЩЕНИЯ (Банки, Новости)
        if (isSystem) {
            return `
                <div class="glass-card mb-2 p-3" style="border-left: 3px solid var(--amber); background: linear-gradient(135deg, rgba(255,179,0,0.08), #090e18);">
                    <div class="flex-between mb-2">
                        <div class="flex-gap" style="align-items:center;">
                            <span style="font-size:18px; filter:drop-shadow(0 0 5px var(--amber));">📰</span>
                            <b class="text-xs color-amber" style="font-size:11.5px;">${this._escapeHtml(m.sender || 'Система')}</b>
                        </div>
                        <span class="tag-badge bg-tag-amber" style="font-size:7.5px;">УВЕДОМЛЕНИЕ</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px; line-height:1.4; color:#f1f5f9;">
                        ${this._escapeHtml(lastMsg)}
                    </div>
                    <button onclick="AppM.deleteDialog('${m.id}')" class="btn btn-dark btn-sm w-full" style="font-size:9px; padding:5px;">
                        <i class="fa-solid fa-check mr-1"></i> Ознакомлен
                    </button>
                </div>
            `;
        }

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
                 style="border-left: 3px solid ${isUnread ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}; background: #090e18; ${isUnread ? 'animation: msgPulse 2s infinite alternate;' : ''}">
                
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

        // Отписка от real-time чата друга
        if (this._friendChatUnsubscribe) {
            try { this._friendChatUnsubscribe(); } catch (e) {}
            this._friendChatUnsubscribe = null;
        }

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

    /**
     * Универсальный диалог (друзья и т.д.)
     * С real-time подпиской для дружеских чатов + отправка в Firestore.
     */
    _renderGenericDialog(container, msg) {
        const history = msg.chatHistory || [];

        // Real-time подписка для друзей
        if (msg.category === 'friends' && msg.dialogId && window.FB_Bridge?.ChatMessages?.subscribeToDialog) {
            if (this._friendChatUnsubscribe) {
                try { this._friendChatUnsubscribe(); } catch (e) {}
            }
            const myUid = String(window.state?.player?.uid || window.tgUserId || '');
            const currentMsgId = msg.id;

            this._friendChatUnsubscribe = window.FB_Bridge.ChatMessages.subscribeToDialog(
                msg.dialogId,
                (messages) => {
                    if (!Array.isArray(messages)) return;
                    msg.chatHistory = messages.map(m => ({
                        from: String(m.senderId) === String(myUid) ? 'me' : 'them',
                        text: m.text
                    }));
                    if (typeof saveState === 'function') saveState();
                    if (this.activeDialogId === currentMsgId) {
                        this._renderGenericDialog(container, msg);
                    }
                }
            );
        }

        container.innerHTML = `
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 242, 254, 0.4); flex-shrink: 0;">
                <button onclick="AppM.closeDialog()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title text-xs font-bold">${this._escapeHtml(msg.sender || 'Диалог')}</div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body" style="padding:6px;">
                <div class="chat-thread-container" id="mChatScrollBox" 
                     style="min-height:200px; max-height:400px; overflow-y:auto; padding:8px; background:#04070e; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
                    ${history.length === 0 ? `
                        <div class="sub-label text-center py-4" style="font-size:9.5px;">
                            Начните переписку с другом
                        </div>
                    ` : history.map(item => `
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

    /**
     * Отправка сообщения другу в Firestore + push в бот.
     */
    async sendGenericMessage(dialogId) {
        const input = document.getElementById('mP2PChatInput');
        if (!input || !input.value.trim()) return;
        const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === dialogId);
        if (!msg) return;
        const text = input.value.trim();
        input.value = '';

        if (!Array.isArray(msg.chatHistory)) msg.chatHistory = [];
        msg.chatHistory.push({ from: 'me', text });
        msg.lastMessageAt = Date.now();
        msg.preview = text;

        // Отправка в Firestore (для друзей)
        if (msg.category === 'friends' && msg.friendUserId && window.FB_Bridge?.ChatMessages?.sendMessage) {
            try {
                await window.FB_Bridge.ChatMessages.sendMessage({
                    dialogId: msg.dialogId || dialogId,
                    receiverId: msg.friendUserId,
                    text: text
                });
            } catch (e) {
                console.warn('[AppM] sendGenericMessage → Firestore error:', e);
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
    }
};

// Экспорт в window
window.AppM = AppM;
window.AppMessenger = AppM;

console.log('[💬 phone-m-core v9.1.0] Возвращена кнопка ПРОДАТЬ, добавлены анимации и фикс системных сообщений ✓');
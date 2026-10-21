// ========================================================
// js/phone/phone-m-core.js — M+ MESSENGER & DEALS (v10.0.0 REDESIGN)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v10.0.0 (3-TAB CLEAN ARCHITECTURE):
//   - Полная переработка UI: переход на чистую 3-секционную структуру (Чаты / Сделки / Профиль).
//   - Ликвидировано нагромождение кнопок и вложенных вкладок (Биржа перенесена в Рынок, Социум — в Жизнь).
//   - Чаты организованы единым потоком со стикерами-индикаторами типов сделок.
//   - Полное сохранение алгоритмов прямого торга (NPC-Haggle v9.4.0) и P2P-синхронизации.
// ========================================================

if (typeof window.BUSINESS_TITLE_STYLES === 'undefined') window.BUSINESS_TITLE_STYLES = [];
if (typeof window.BUSINESS_CARD_ANIMATIONS === 'undefined') window.BUSINESS_CARD_ANIMATIONS = [];

const AppM = {
    activeTab: 'chats',      // 'chats' | 'deals' | 'me'
    chatFilter: 'all',       // 'all' | 'deals' | 'personal'
    activeDialogId: null,
    _friendChatUnsubscribe: null,

    init() {
        this.syncSalesLotBuyersToMessages();
        this._bindEvents();
    },

    syncSalesLotBuyersToMessages() {
        if (!window.state?.salesLot || !Array.isArray(window.state.salesLot)) return;
        window.state.salesLot.forEach((lot, idx) => {
            if (lot && lot.buyer && typeof window.syncBuyerToMNetwork === 'function') {
                window.syncBuyerToMNetwork(lot, idx);
            }
        });
    },

    _bindEvents() {
        if (!window.EventBus) return;

        window.EventBus.on('p2p:deal_completed', () => this._refreshCurrentScreen());
        window.EventBus.on('p2p:deal_signed', () => this._refreshCurrentScreen());
        window.EventBus.on('p2p:deal_created', () => this._refreshCurrentScreen());
        window.EventBus.on('p2p:offer_accepted', () => this._refreshCurrentScreen());
        window.EventBus.on('p2p:offer_rejected', () => this._refreshCurrentScreen());
        window.EventBus.on('p2p:chat_opened', () => this._updateBadge());
        window.EventBus.on('notification:received', () => this._updateBadge());
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

    _getUnreadCount() {
        return (window.state?.player?.phoneMessages || []).filter(m => m && m.unread).length;
    },

    _getActiveDealsCount() {
        const msgs = window.state?.player?.phoneMessages || [];
        const p2pDeals = msgs.filter(m => m && (m.category === 'p2p' || m.category === 'buyers') && m.unread).length;
        const liveLots = (window.state?.salesLot || []).filter(l => l && l.buyer).length;
        return p2pDeals + liveLots;
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
            <style>
                .m-app-shell {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: #050811;
                    color: #e2e8f0;
                    font-family: inherit;
                    overflow: hidden;
                }
                .m-clean-tabs {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    background: rgba(15, 23, 42, 0.85);
                    border: 1px solid rgba(0, 242, 254, 0.15);
                    border-radius: 12px;
                    padding: 3px;
                    gap: 4px;
                    margin-bottom: 8px;
                    backdrop-filter: blur(10px);
                }
                .m-clean-tab-btn {
                    position: relative;
                    background: transparent;
                    border: none;
                    outline: none;
                    color: #94a3b8;
                    font-size: 10px;
                    font-weight: 800;
                    padding: 7px 4px;
                    border-radius: 9px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    transition: all 0.2s ease;
                }
                .m-clean-tab-btn.active {
                    background: linear-gradient(135deg, rgba(0,242,254,0.18), rgba(121,40,202,0.22));
                    color: #00f2fe;
                    border: 1px solid rgba(0, 242, 254, 0.4);
                    box-shadow: 0 0 12px rgba(0,242,254,0.2);
                }
                .m-badge-pill {
                    background: #ff3366;
                    color: #fff;
                    font-size: 8px;
                    font-weight: 900;
                    padding: 1px 5px;
                    border-radius: 10px;
                    line-height: 1.1;
                }
                .m-badge-pill-cyan {
                    background: #00f2fe;
                    color: #000;
                }
                .m-dialog-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 9px 10px;
                    background: rgba(13, 20, 36, 0.65);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    margin-bottom: 7px;
                    cursor: pointer;
                    transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
                }
                .m-dialog-item:hover, .m-dialog-item:active {
                    transform: translateY(-1px);
                    background: rgba(18, 28, 51, 0.9);
                    border-color: rgba(0, 242, 254, 0.3);
                }
                .m-dialog-item.unread {
                    border-left: 3px solid #00f2fe;
                    background: linear-gradient(90deg, rgba(0,242,254,0.08), rgba(13, 20, 36, 0.85));
                }
                .m-dialog-avatar {
                    position: relative;
                    width: 44px;
                    height: 44px;
                    min-width: 44px;
                    border-radius: 10px;
                    overflow: hidden;
                    background: #000;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .m-dialog-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .m-sticker {
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                    font-size: 7.5px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    padding: 2px 6px;
                    border-radius: 6px;
                }
                .m-sticker-buyer { background: rgba(0, 230, 118, 0.15); color: #00e676; border: 1px solid rgba(0, 230, 118, 0.3); }
                .m-sticker-p2p { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
                .m-sticker-friend { background: rgba(0, 242, 254, 0.15); color: #00f2fe; border: 1px solid rgba(0, 242, 254, 0.3); }
                .m-sticker-system { background: rgba(255, 179, 0, 0.15); color: #ffb300; border: 1px solid rgba(255, 179, 0, 0.3); }
                .m-pill-chip {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: #94a3b8;
                    border-radius: 20px;
                    padding: 3px 9px;
                    font-size: 8.5px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .m-pill-chip.active {
                    background: rgba(0, 242, 254, 0.15);
                    border-color: #00f2fe;
                    color: #00f2fe;
                }
                @keyframes pulseSlow {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.08); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
            </style>

            <div class="m-app-shell">
                <div class="phone-app-header" style="border-bottom-color: rgba(0, 242, 254, 0.25); padding: 7px 10px;">
                    <button onclick="PhoneManager.goHome()" class="phone-back-btn">
                        <i class="fa-solid fa-chevron-left"></i> Меню
                    </button>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="background: linear-gradient(135deg, #00f2fe, #7928ca); padding: 2px 7px; border-radius: 6px; font-weight: 900; color: #000; font-size: 11px;">M+</span>
                        <span style="font-size:12px; font-weight:900; letter-spacing:0.5px; color:#f1f5f9;">СВЯЗЬ</span>
                    </div>
                    <div style="width: 44px; text-align: right;">
                        <span style="font-size: 8px; color: #00e676; font-weight: 800;"><i class="fa-solid fa-circle" style="font-size:6px;"></i> ON</span>
                    </div>
                </div>

                <div class="phone-app-body" style="padding: 7px 8px; flex:1; display:flex; flex-direction:column; overflow-y:auto;">
                    <!-- 3 ГЛАВНЫХ РАЗДЕЛА БЕЗ НАГРОМОЖДЕНИЯ -->
                    <div class="m-clean-tabs">
                        <button onclick="AppM.switchMainTab('chats')" class="m-clean-tab-btn ${curTab === 'chats' ? 'active' : ''}">
                            <i class="fa-solid fa-comment-dots"></i> ЧАТЫ
                            ${unreadCount > 0 ? `<span class="m-badge-pill">${unreadCount}</span>` : ''}
                        </button>
                        <button onclick="AppM.switchMainTab('deals')" class="m-clean-tab-btn ${curTab === 'deals' ? 'active' : ''}">
                            <i class="fa-solid fa-bolt"></i> СДЕЛКИ
                            ${activeDeals > 0 ? `<span class="m-badge-pill m-badge-pill-cyan">${activeDeals}</span>` : ''}
                        </button>
                        <button onclick="AppM.switchMainTab('me')" class="m-clean-tab-btn ${curTab === 'me' ? 'active' : ''}">
                            <i class="fa-solid fa-id-badge"></i> ПРОФИЛЬ
                        </button>
                    </div>

                    <div id="mHubMainArea" style="flex:1;"></div>
                </div>
            </div>
        `;

        const area = document.getElementById('mHubMainArea');
        if (!area) return;

        try {
            if (curTab === 'chats') this.renderChatsScreen(area);
            else if (curTab === 'deals') this.renderDealsScreen(area);
            else if (curTab === 'me') this.renderResellerProfile(area);
        } catch (e) {
            console.error('[AppM] Ошибка рендера таба', curTab, e);
            area.innerHTML = `
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
    // 1. РАЗДЕЛ «ЧАТЫ»: ЕДИНЫЙ ПОТОК СО СТИКЕРАМИ
    // ========================================================
    renderChatsScreen(container) {
        if (!container) return;

        this.syncSalesLotBuyersToMessages();
        if (typeof window.cleanupOrphanedDialogs === 'function') {
            try { window.cleanupOrphanedDialogs(); } catch (e) {}
        }

        const all = window.state?.player?.phoneMessages || [];
        const f = this.chatFilter;

        let filtered = all;
        if (f === 'deals') {
            filtered = all.filter(m => m && (m.category === 'p2p' || m.category === 'buyers'));
        } else if (f === 'personal') {
            filtered = all.filter(m => m && (m.category === 'friends' || m.category === 'system' || m.isSystem));
        }

        const sorted = [...filtered].sort((a, b) => {
            if (!a || !b) return 0;
            const aUnread = a.unread ? 1 : 0;
            const bUnread = b.unread ? 1 : 0;
            if (aUnread !== bUnread) return bUnread - aUnread;
            const aTs = a.lastMessageAt || a.createdAt || 0;
            const bTs = b.lastMessageAt || b.createdAt || 0;
            return bTs - aTs;
        });

        const counts = {
            all: all.length,
            deals: all.filter(m => m && (m.category === 'p2p' || m.category === 'buyers')).length,
            personal: all.filter(m => m && (m.category === 'friends' || m.category === 'system' || m.isSystem)).length
        };

        container.innerHTML = `
            <!-- Быстрые микро-чипсы (вместо многоэтажных рядов кнопок) -->
            <div style="display:flex; gap:5px; margin-bottom:8px; overflow-x:auto; padding-bottom:2px;">
                <button onclick="AppM.setFilter('all')" class="m-pill-chip ${f === 'all' ? 'active' : ''}">
                    Все (${counts.all})
                </button>
                <button onclick="AppM.setFilter('deals')" class="m-pill-chip ${f === 'deals' ? 'active' : ''}">
                    🤝 Сделки & Покупатели (${counts.deals})
                </button>
                <button onclick="AppM.setFilter('personal')" class="m-pill-chip ${f === 'personal' ? 'active' : ''}">
                    💬 Личные & Инфо (${counts.personal})
                </button>
            </div>

            <div id="mDialogsFlow">
                ${sorted.length === 0 ? this._renderEmptyChatsState() : sorted.map(m => this._buildDialogItem(m)).join('')}
            </div>
        `;
    },

    setFilter(filter) {
        this.chatFilter = filter;
        if (typeof playSound === 'function') playSound('tick');
        const area = document.getElementById('mHubMainArea');
        if (area) this.renderChatsScreen(area);
    },

    _renderEmptyChatsState() {
        return `
            <div style="text-align:center; padding: 36px 16px; background: rgba(13,20,36,0.4); border-radius:14px; border:1px dashed rgba(0,242,254,0.2); margin-top:10px;">
                <div style="width:48px; height:48px; margin:0 auto 12px auto; border-radius:50%; background:rgba(0,242,254,0.08); display:flex; align-items:center; justify-content:center; border:1px solid rgba(0,242,254,0.3); animation:pulseSlow 2.5s infinite;">
                    <i class="fa-solid fa-satellite-dish" style="color:#00f2fe; font-size:20px;"></i>
                </div>
                <div style="font-weight:800; font-size:12px; color:#f1f5f9;">В эфире пока тихо</div>
                <div style="font-size:9px; color:#94a3b8; margin-top:4px; max-width:220px; margin-left:auto; margin-right:auto; line-height:1.4;">
                    Выставьте машину на продажу на авторынке или отправьте встречный оффер игроку
                </div>
            </div>
        `;
    },

    _buildDialogItem(m) {
        if (!m) return '';

        const history = m.chatHistory || [];
        const lastMsg = history.length > 0 ? history[history.length - 1].text : (m.preview || 'Нет сообщений');
        const isUnread = !!m.unread;
        const category = m.category || 'unknown';
        const isSystem = category === 'system' || m.isSystem;

        const carData = m.carData || {};
        const rawImg = carData.img || "assets/cars/economy/2101/vaz-2101.jpg";
        const carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
        const fallbackImg = (typeof getCategoryFallback === 'function') ? getCategoryFallback(carData.type || 'economy') : "assets/cars/economy/2101/vaz-2101.jpg";

        // Формирование стикера типа чата
        let sticker = '';
        if (isSystem) {
            sticker = `<span class="m-sticker m-sticker-system"><i class="fa-solid fa-bell"></i> ИНФО</span>`;
        } else if (category === 'buyers') {
            sticker = `<span class="m-sticker m-sticker-buyer"><i class="fa-solid fa-tag"></i> ПОКУПАТЕЛЬ</span>`;
        } else if (category === 'p2p') {
            const role = m.p2pRole === 'seller' ? 'ПРОДАЖА P2P' : 'ПОКУПКА P2P';
            sticker = `<span class="m-sticker m-sticker-p2p"><i class="fa-solid fa-handshake"></i> ${role}</span>`;
        } else {
            sticker = `<span class="m-sticker m-sticker-friend"><i class="fa-solid fa-user"></i> КОНТАКТ</span>`;
        }

        let priceBadge = '';
        const price = m.offerPrice || m.askingPrice;
        if (price) {
            priceBadge = `<span style="font-size:9.5px; font-weight:800; color:#00e676;">${Number(price).toLocaleString()} ₽</span>`;
        }

        const avatarContent = isSystem
            ? `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#1e293b; color:#ffb300; font-size:18px;"><i class="fa-solid fa-newspaper"></i></div>`
            : `<img src="${carImg}" onerror="this.onerror=null; this.src='${fallbackImg}';">`;

        return `
            <div onclick="AppM.openDialog('${m.id}')" class="m-dialog-item ${isUnread ? 'unread' : ''}">
                <div class="m-dialog-avatar">
                    ${avatarContent}
                    ${isUnread ? `<span style="position:absolute; top:2px; right:2px; width:7px; height:7px; background:#00f2fe; border-radius:50%; box-shadow:0 0 6px #00f2fe;"></span>` : ''}
                </div>

                <div style="flex:1; min-width:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                        <span style="font-weight:800; font-size:11px; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">
                            ${this._escapeHtml(carData.name || m.sender || 'Диалог')}
                        </span>
                        ${sticker}
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                        <span style="font-size:9px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">
                            ${this._escapeHtml(lastMsg)}
                        </span>
                        ${priceBadge}
                    </div>
                </div>

                <button onclick="event.stopPropagation(); AppM.deleteDialog('${m.id}')" 
                        style="background:none; border:none; color:#475569; padding:4px 6px; cursor:pointer; font-size:11px;" 
                        title="Удалить диалог">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;
    },

    // ========================================================
    // 2. РАЗДЕЛ «СДЕЛКИ»: АКТИВНЫЙ ТОРГ И ОФФЕРЫ В 1 КЛИК
    // ========================================================
    renderDealsScreen(container) {
        if (!container) return;

        const lotsWithBuyers = (window.state?.salesLot || []).filter(l => l && l.buyer);
        const p2pMessages = (window.state?.player?.phoneMessages || []).filter(m => m && m.category === 'p2p');

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div>
                    <b style="font-size:11.5px; color:#f1f5f9;">Оперативные сделки</b>
                    <div style="font-size:8.5px; color:#94a3b8;">Покупатели у капота и предложения от игроков</div>
                </div>
                <span class="m-sticker m-sticker-buyer">${lotsWithBuyers.length + p2pMessages.length} АКТИВНО</span>
            </div>

            <!-- ПОКУПАТЕЛИ С ПЛОЩАДКИ ПРОДАЖ -->
            <div class="mb-3">
                <div style="font-size:9.5px; font-weight:800; color:#00e676; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.3px;">
                    <i class="fa-solid fa-car-on mr-1"></i> На площадке (${lotsWithBuyers.length})
                </div>
                ${lotsWithBuyers.length === 0 ? `
                    <div style="padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; border:1px solid rgba(255,255,255,0.05); font-size:9px; color:#64748b; text-align:center;">
                        Сейчас на площадке нет ожидающих клиентов.
                    </div>
                ` : lotsWithBuyers.map((lot, idx) => this._renderQuickLotDealCard(lot, idx)).join('')}
            </div>

            <!-- ПРЕДЛОЖЕНИЯ P2P -->
            <div>
                <div style="font-size:9.5px; font-weight:800; color:#c084fc; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.3px;">
                    <i class="fa-solid fa-handshake mr-1"></i> Встречный торг P2P (${p2pMessages.length})
                </div>
                ${p2pMessages.length === 0 ? `
                    <div style="padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; border:1px solid rgba(255,255,255,0.05); font-size:9px; color:#64748b; text-align:center;">
                        Нет открытых P2P предложений.
                    </div>
                ` : p2pMessages.map(m => this._renderQuickP2PDealCard(m)).join('')}
            </div>
        `;
    },

    _renderQuickLotDealCard(lot, idx) {
        const car = lot.car || {};
        const buyer = lot.buyer || lot.currentBuyer || {};
        const offer = buyer.currentOffer || buyer.offeredPrice || lot.askingPrice || 0;
        const rawImg = car.img || "assets/cars/economy/2101/vaz-2101.jpg";
        const carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;

        return `
            <div class="glass-card mb-2 p-2" style="background:#090e18; border:1px solid rgba(0,230,118,0.3); border-radius:11px;">
                <div style="display:flex; gap:9px; align-items:center;">
                    <img src="${carImg}" style="width:58px; height:40px; object-fit:cover; border-radius:7px; border:1px solid rgba(255,255,255,0.1);">
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <b style="font-size:10.5px; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                ${this._escapeHtml(car.name || 'Автомобиль')}
                            </b>
                            <span style="font-size:10.5px; font-weight:900; color:#00e676;">${Number(offer).toLocaleString()} ₽</span>
                        </div>
                        <div style="font-size:8.5px; color:#94a3b8; margin-top:2px;">
                            Клиент: <b style="color:#e2e8f0;">${this._escapeHtml(buyer.name || 'Покупатель')}</b>
                        </div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-top:8px;">
                    <button onclick="AppM.openDialogForCarIndex(${idx})" class="btn btn-green btn-sm" style="font-size:9px; padding:6px 0; font-weight:800;">
                        <i class="fa-solid fa-comments mr-1"></i> ТОРГОВАТЬСЯ
                    </button>
                    <button onclick="AppM.acceptLotBuyerDirect(${idx})" class="btn btn-dark btn-sm" style="font-size:9px; padding:6px 0;">
                        <i class="fa-solid fa-check mr-1"></i> ПРИНЯТЬ
                    </button>
                </div>
            </div>
        `;
    },

    _renderQuickP2PDealCard(m) {
        const car = m.carData || {};
        const price = m.offerPrice || m.askingPrice || 0;

        return `
            <div class="glass-card mb-2 p-2" style="background:#090e18; border:1px solid rgba(168,85,247,0.3); border-radius:11px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <b style="font-size:10.5px; color:#c084fc;">${this._escapeHtml(car.name || 'P2P Авто')}</b>
                    <span style="font-size:10.5px; font-weight:900; color:#00e676;">${Number(price).toLocaleString()} ₽</span>
                </div>
                <div style="font-size:8.5px; color:#94a3b8; margin-bottom:7px;">
                    Собеседник: <b style="color:#e2e8f0;">${this._escapeHtml(m.sender || 'Игрок')}</b>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                    <button onclick="AppM.openDialog('${m.id}')" class="btn btn-cyan btn-sm" style="font-size:9px; padding:6px 0; font-weight:800;">
                        <i class="fa-solid fa-comments mr-1"></i> В ЧАТ
                    </button>
                    <button onclick="AppM.openDealForDialog('${m.id}')" class="btn btn-dark btn-sm" style="font-size:9px; padding:6px 0;">
                        <i class="fa-solid fa-file-contract mr-1"></i> ДОГОВОР
                    </button>
                </div>
            </div>
        `;
    },

    openDialogForCarIndex(idx) {
        const lot = window.state?.salesLot?.[idx];
        if (!lot) return;
        const msg = (window.state?.player?.phoneMessages || []).find(m => 
            m && (m.carUid === lot.car?.uid || m.carIndex === idx)
        );
        if (msg) {
            this.openDialog(msg.id);
        } else {
            this.switchMainTab('chats');
        }
    },

    acceptLotBuyerDirect(lotIndex) {
        const slot = window.state?.salesLot?.[lotIndex];
        if (!slot) return showToast?.('⚠️ Лот не найден');

        const buyer = slot.currentBuyer || slot.buyer;
        const finalPrice = buyer?.currentOffer || buyer?.offeredPrice || slot.askingPrice || 100000;
        const purchaseCost = (slot.car?.purchaseCost) || Math.round(finalPrice * 0.75);
        const profit = finalPrice - purchaseCost;

        if (typeof finishSalesLotDeal === 'function') {
            finishSalesLotDeal(lotIndex, finalPrice, profit, purchaseCost);
        } else if (typeof acceptLotBuyerDeal === 'function') {
            acceptLotBuyerDeal(lotIndex);
        }
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 3. РАЗДЕЛ «ПРОФИЛЬ»: АВТОРИТЕТ И СТАТИСТИКА ПЕРЕКУПА
    // ========================================================
    renderResellerProfile(container) {
        if (!container) return;

        const player = window.state?.player || {};
        const name = player.name || 'Taktoje';
        const level = player.level || 1;
        const karma = player.karma || 50;
        const dealsCount = player.completedDeals || 0;
        const repStatus = karma > 70 ? 'Честный перекуп' : (karma < 30 ? 'Скрутчик со стажем' : 'Бывалый торгаш');
        const repColor = karma > 70 ? '#00e676' : (karma < 30 ? '#ff3366' : '#ffb300');

        container.innerHTML = `
            <div class="glass-card p-3 mb-3" style="background:#090e18; border:1px solid rgba(0,242,254,0.3); border-radius:14px; text-align:center;">
                <div style="width:56px; height:56px; border-radius:50%; margin:0 auto 8px auto; border:2px solid #00f2fe; padding:2px; background:#000;">
                    <div style="width:100%; height:100%; border-radius:50%; background:linear-gradient(135deg, #00f2fe, #7928ca); display:flex; align-items:center; justify-content:center; color:#000; font-size:22px; font-weight:900;">
                        ${name.charAt(0).toUpperCase()}
                    </div>
                </div>
                <b style="font-size:13px; color:#f1f5f9; display:block;">${this._escapeHtml(name)}</b>
                <div style="display:inline-block; margin-top:4px; font-size:8.5px; font-weight:800; color:${repColor}; background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:20px; border:1px solid ${repColor}40;">
                    ${repStatus}
                </div>
            </div>

            <div class="grid-2 mb-3" style="gap:6px;">
                <div class="glass-card p-2 text-center" style="background:#090e18; border-radius:10px;">
                    <div style="font-size:8px; color:#94a3b8;">УРОВЕНЬ</div>
                    <b style="font-size:14px; color:#00f2fe;">${level}</b>
                </div>
                <div class="glass-card p-2 text-center" style="background:#090e18; border-radius:10px;">
                    <div style="font-size:8px; color:#94a3b8;">КАРМА ТОРГА</div>
                    <b style="font-size:14px; color:${repColor};">${karma}/100</b>
                </div>
            </div>

            <div class="glass-card p-3" style="background:#090e18; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
                <div style="font-size:10px; font-weight:800; color:#f1f5f9; margin-bottom:8px;">СТАТУС СВЯЗИ</div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:9px; color:#94a3b8; margin-bottom:6px;">
                    <span>Канал приема офферов</span>
                    <span style="color:#00e676; font-weight:800;">ОТКРЫТ</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:9px; color:#94a3b8;">
                    <span>Шифрование диалогов</span>
                    <span style="color:#00f2fe; font-weight:800;">АКТИВНО</span>
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

    openDealForDialog(dialogId) {
        if (typeof window.openP2PDealModal === 'function') {
            const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === dialogId);
            if (msg && msg.p2pLotId) {
                window.openP2PDealModal(msg.p2pLotId);
            }
        }
    },

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

        if (msg.category === 'p2p') this._renderP2PConversation(container, msg);
        else if (msg.category === 'buyers') this._renderNPCDialog(container, msg);
        else this._renderGenericDialog(container, msg);
    },

    // ========================================================
    // P2P-ЧАТ
    // ========================================================
    async _renderP2PConversation(container, msg) {
        const carData = msg.carData || {};
        const rawImg = carData.img || "assets/cars/economy/2101/vaz-2101.jpg";
        const carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
        const fallbackImg = (typeof getCategoryFallback === 'function') ? getCategoryFallback(carData.type || 'economy') : "assets/cars/economy/2101/vaz-2101.jpg";
        const history = msg.chatHistory || [];

        container.innerHTML = `
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 242, 254, 0.4); flex-shrink: 0;">
                <button onclick="AppM.closeDialog()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div style="text-align:center; min-width:0; flex:1;">
                    <div class="phone-app-title text-xs font-bold" style="font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${this._escapeHtml(msg.sender || 'Продавец')}
                    </div>
                    <div class="sub-label color-green" style="font-size:8px;">● P2P Торг</div>
                </div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body" style="display:flex; flex-direction:column; gap:8px; padding:6px; flex:1;">
                <div class="glass-card p-2" style="border: 1.5px solid var(--cyan); background: #060a14; margin-bottom: 0;">
                    <div class="deal-car-preview-card" style="height:56px; min-height:56px; padding:4px 8px;">
                        <img src="${carImg}" class="deal-car-thumb" style="width:68px; height:46px; min-width:68px; object-fit:cover;" onerror="this.onerror=null; this.src='${fallbackImg}';">
                        <div style="flex:1; min-width:0;">
                            <div class="flex-between">
                                <b class="text-xs color-cyan block" style="font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                    ${this._escapeHtml(carData.name || 'Автомобиль')}
                                </b>
                                <span class="tag-badge bg-tag-cyan" style="font-size:7.5px;">P2P ЛОТ</span>
                            </div>
                            <div class="flex-between mt-1">
                                <span class="sub-label" style="font-size:8px;">Цена:</span>
                                <b class="color-green text-xs" style="font-size:12px;">${Number(msg.askingPrice || 0).toLocaleString()} ₽</b>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="chat-thread-container" id="mChatScrollBox" 
                     style="flex:1; min-height:180px; max-height:340px; overflow-y:auto; padding:8px; background:#04070e; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
                    ${history.map(item => `
                        <div class="chat-msg ${item.from === 'me' ? 'msg-player' : 'msg-seller'}" style="margin-bottom:6px;">
                            ${this._escapeHtml(item.text)}
                        </div>
                    `).join('')}
                </div>

                <div class="p2p-compact-composer">
                    <input type="text" id="mP2PChatInput" class="chat-input p2p-compact-input" placeholder="Написать сообщение..." maxlength="200" onkeydown="if(event.key==='Enter'){AppM.sendP2PMessage('${msg.id}');}">
                    <button onclick="AppM.sendP2PMessage('${msg.id}')" class="p2p-compact-btn p2p-compact-btn-send">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;

        const box = document.getElementById('mChatScrollBox');
        if (box) box.scrollTop = box.scrollHeight;
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
    // ТОРГ С NPC-ПОКУПАТЕЛЕМ (DIRECT HAGGLE)
    // ========================================================
    _renderNPCDialog(container, msg) {
        const carData = msg.carData || {};
        const rawImg = carData.img || "assets/cars/economy/2101/vaz-2101.jpg";
        const carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
        const fallbackImg = (typeof getCategoryFallback === 'function') ? getCategoryFallback(carData.type || 'economy') : "assets/cars/economy/2101/vaz-2101.jpg";

        let lot = null;
        if (msg.carUid && Array.isArray(window.state?.salesLot)) {
            lot = window.state.salesLot.find(l => l && l.car && (l.car.uid === msg.carUid || l.car.id === msg.carUid));
        }
        if (!lot && typeof msg.carIndex === 'number' && window.state?.salesLot?.[msg.carIndex]) {
            lot = window.state.salesLot[msg.carIndex];
        }

        const buyer = lot?.currentBuyer || lot?.buyer;
        const currentOffer = buyer?.currentOffer || buyer?.offeredPrice || msg.offerPrice || msg.askingPrice || 100000;
        const history = msg.chatHistory || [];

        let patience = buyer?.patience !== undefined ? buyer.patience : 4;
        let maxPatience = buyer?.maxPatience || 4;
        let patiencePct = Math.round((patience / maxPatience) * 100);
        let patienceColor = patiencePct > 60 ? "color-green" : (patiencePct > 30 ? "color-amber" : "color-red");
        let progressBg = patiencePct > 60 ? "var(--green)" : (patiencePct > 30 ? "var(--amber)" : "var(--red)");

        let tradeControlsHtml = '';
        if (patience <= 0) {
            tradeControlsHtml = `
                <div class="p-2 mb-2 text-center" style="background:rgba(255,51,102,0.1); border-radius:10px; border:1px solid var(--red);">
                    <b class="color-red text-xs block mb-1">🚫 ПОКУПАТЕЛЬ УСТАЛ ОТ ТОРГА!</b>
                    <div class="sub-label" style="font-size:9px;">Дальнейшие попытки сбить цену приведут к срыву сделки.</div>
                </div>
            `;
        } else {
            tradeControlsHtml = `
                <div class="grid-3 mb-2" style="gap:4px;">
                    <button onclick="AppM.chatHaggle('${msg.id}', 4, 12)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                        <div class="font-bold color-green text-xs" style="font-size:9.5px;">+4% НА ДОРОГУ</div>
                        <div class="sub-label" style="font-size:7.5px;">РИСК: 12%</div>
                    </button>

                    <button onclick="AppM.chatHaggle('${msg.id}', 8, 30)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                        <div class="font-bold color-amber text-xs" style="font-size:9.5px;">+8% ПО ФАКТУ</div>
                        <div class="sub-label" style="font-size:7.5px;">РИСК: 30%</div>
                    </button>

                    <button onclick="AppM.chatHaggle('${msg.id}', 15, 60)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                        <div class="font-bold color-red text-xs" style="font-size:9.5px;">+15% ЖЕСТКО</div>
                        <div class="sub-label" style="font-size:7.5px;">РИСК: 60%</div>
                    </button>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 230, 118, 0.4); flex-shrink: 0;">
                <button onclick="AppM.closeDialog()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div style="text-align:center;">
                    <div class="phone-app-title text-xs font-bold">${this._escapeHtml(msg.sender || 'Покупатель')}</div>
                    <div class="sub-label color-green" style="font-size:8px;">● Покупатель с площадки</div>
                </div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body" style="padding:6px; display:flex; flex-direction:column; height:100%;">
                <div class="glass-card p-2 mb-2" style="border: 1.5px solid var(--green); background: #060a14;">
                    <div class="deal-car-preview-card" style="padding:4px 8px;">
                        <img src="${carImg}" class="deal-car-thumb" 
                             style="width:68px; height:46px; object-fit:cover;" 
                             onerror="this.onerror=null; this.src='${fallbackImg}';">
                        <div style="flex:1; min-width:0;">
                            <b class="text-xs color-cyan" style="font-size:11.5px;">${this._escapeHtml(carData.name || 'Автомобиль')}</b>
                            <div class="sub-label mt-1" style="font-size:8.5px;">
                                Предложение: <b class="color-green" id="mNpcOfferVal">${Number(currentOffer).toLocaleString()} ₽</b>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="chat-thread-container" id="mChatScrollBox" 
                     style="flex:1; min-height:180px; max-height:360px; overflow-y:auto; padding:8px; background:#04070e; border-radius:12px; border:1px solid rgba(255,255,255,0.06); margin-bottom:10px;">
                    ${history.map(item => `
                        <div class="chat-msg ${item.from === 'me' ? 'msg-player' : 'msg-seller'}" style="margin-bottom:6px;">
                            ${this._escapeHtml(item.text)}
                        </div>
                    `).join('')}
                </div>

                <div class="mb-2 p-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                    <div class="flex-between text-xs mb-1" style="font-size:9.5px;">
                        <span>Терпение покупателя:</span>
                        <b class="${patienceColor}">${patiencePct}% (${patience} попыток)</b>
                    </div>
                    <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                        <div style="width:${patiencePct}%; height:100%; background:${progressBg}; transition:width 0.3s ease;"></div>
                    </div>
                </div>

                ${tradeControlsHtml}

                <div class="grid-2 mt-1" style="gap:6px;">
                    <button onclick="AppM.acceptNPCBuyer('${msg.id}')" class="btn btn-green font-bold" style="font-size:11px; padding:10px 0;">
                        🤝 СОГЛАСИТЬСЯ (${Number(currentOffer).toLocaleString()} ₽)
                    </button>
                    <button onclick="AppM.rejectNPCBuyer('${msg.id}')" class="btn btn-danger font-bold" style="font-size:11px; padding:10px 0;">
                        ✕ ОТКАЗАТЬ
                    </button>
                </div>
            </div>
        `;

        const box = document.getElementById('mChatScrollBox');
        if (box) box.scrollTop = box.scrollHeight;
    },

    chatHaggle(msgId, percent, failRisk) {
        const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === msgId);
        if (!msg) return;

        let lot = null;
        let lotIndex = null;

        if (msg.carUid && Array.isArray(window.state?.salesLot)) {
            lotIndex = window.state.salesLot.findIndex(l => l && l.car && (l.car.uid === msg.carUid || l.car.id === msg.carUid));
            if (lotIndex !== -1) lot = window.state.salesLot[lotIndex];
        }
        if (!lot && typeof msg.carIndex === 'number' && window.state?.salesLot?.[msg.carIndex]) {
            lotIndex = msg.carIndex;
            lot = window.state.salesLot[lotIndex];
        }

        if (!lot || !lot.buyer) {
            if (typeof showToast === 'function') showToast('⚠️ Покупатель уже ушёл с площадки!');
            return;
        }

        const buyer = lot.buyer;
        if (buyer.patience <= 0) {
            if (typeof showToast === 'function') showToast('🚫 Покупатель устал и больше не торгуется!');
            return;
        }

        buyer.patience -= 1;

        const currentPrice = buyer.currentOffer || buyer.offeredPrice || msg.offerPrice || 100000;
        const raiseAmount = Math.round(currentPrice * (percent / 100));
        const newTargetPrice = currentPrice + raiseAmount;

        if (!Array.isArray(msg.chatHistory)) msg.chatHistory = [];
        if (!Array.isArray(buyer.dialogHistory)) buyer.dialogHistory = [];

        const playerText = `«За ${currentPrice.toLocaleString()} ₽ не отдам. Добавь хотя бы +${raiseAmount.toLocaleString()} ₽, и по рукам!»`;
        msg.chatHistory.push({ from: 'me', text: playerText });
        buyer.dialogHistory.push({ from: 'me', text: playerText });

        const karma = window.state?.player?.karma || 50;
        const lvl = window.state?.player?.level || 1;
        let actualRisk = failRisk;
        if (buyer.riskTolerance === 'high') actualRisk -= 10;
        if (buyer.riskTolerance === 'low') actualRisk += 15;
        actualRisk = Math.max(5, Math.min(95, actualRisk - (lvl * 0.3) - ((karma - 50) * 0.2)));

        const roll = Math.random() * 100;

        if (roll < actualRisk) {
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('error');

            if (buyer.patience <= 0 || roll < 10) {
                const rageText = `«Ты надоел торговаться, сделки не будет! Я поехал.»`;
                msg.chatHistory.push({ from: 'them', text: rageText });
                buyer.dialogHistory.push({ from: 'them', text: rageText });

                if (typeof showToast === 'function') showToast('🚫 Покупатель психанул и уехал!');
                lot.currentBuyer = null;
                lot.buyer = null;
                lot.timer = 45;
                lot.maxTimer = 45;
                lot._buyerTimerActive = false;

                if (typeof saveState === 'function') saveState();
                this._renderNPCDialog(document.getElementById('phoneAppContainer'), msg);
                setTimeout(() => this.closeDialog(), 1800);
                return;
            } else {
                const refuseText = `«Никаких надбавок, цена и так крайняя за такое состояние!»`;
                msg.chatHistory.push({ from: 'them', text: refuseText });
                buyer.dialogHistory.push({ from: 'them', text: refuseText });
                if (typeof showToast === 'function') showToast('❌ Покупатель отказался накидывать цену!');
            }
        } else {
            buyer.currentOffer = newTargetPrice;
            buyer.offeredPrice = newTargetPrice;
            msg.offerPrice = newTargetPrice;
            lot.askingPrice = Math.max(lot.askingPrice || 0, newTargetPrice);

            const agreeText = `«По рукам! Накинул +${raiseAmount.toLocaleString()} ₽. Итого ${newTargetPrice.toLocaleString()} ₽. Оформляем?»`;
            msg.chatHistory.push({ from: 'them', text: agreeText });
            buyer.dialogHistory.push({ from: 'them', text: agreeText });

            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');
            if (typeof showToast === 'function') showToast(`✅ Предложение выросло: ${newTargetPrice.toLocaleString()} ₽!`);
        }

        if (typeof saveState === 'function') saveState();
        this._renderNPCDialog(document.getElementById('phoneAppContainer'), msg);
    },

    acceptNPCBuyer(dialogId) {
        const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === dialogId);
        if (!msg) return;

        let lotIndex = -1;
        if (msg.carUid && Array.isArray(window.state?.salesLot)) {
            lotIndex = window.state.salesLot.findIndex(l => l && l.car && (l.car.uid === msg.carUid || l.car.id === msg.carUid));
        }
        if (lotIndex === -1 && typeof msg.carIndex === 'number') {
            lotIndex = msg.carIndex;
        }

        const slot = window.state?.salesLot?.[lotIndex];
        if (!slot || lotIndex === -1) {
            return showToast('⚠️ Лот уже снят с площадки');
        }

        const buyer = slot.currentBuyer || slot.buyer;
        const finalPrice = buyer?.currentOffer || buyer?.offeredPrice || msg.offerPrice || 100000;
        const purchaseCost = (slot.car?.purchaseCost) || Math.round(finalPrice * 0.75);
        const profit = finalPrice - purchaseCost;

        this.closeDialog();

        if (typeof finishSalesLotDeal === 'function') {
            finishSalesLotDeal(lotIndex, finalPrice, profit, purchaseCost);
        } else if (typeof acceptLotBuyerDeal === 'function') {
            acceptLotBuyerDeal(lotIndex);
        }
    },

    rejectNPCBuyer(dialogId) {
        const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === dialogId);
        if (!msg) return this.closeDialog();

        let lotIndex = -1;
        if (msg.carUid && Array.isArray(window.state?.salesLot)) {
            lotIndex = window.state.salesLot.findIndex(l => l && l.car && (l.car.uid === msg.carUid || l.car.id === msg.carUid));
        }
        if (lotIndex === -1 && typeof msg.carIndex === 'number') {
            lotIndex = msg.carIndex;
        }

        this.closeDialog();
        if (lotIndex !== -1 && typeof rejectLotBuyer === 'function') {
            rejectLotBuyer(lotIndex);
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

            <div class="phone-app-body" style="padding:6px; flex:1; display:flex; flex-direction:column;">
                <div class="chat-thread-container" id="mChatScrollBox" 
                     style="flex:1; min-height:200px; max-height:400px; overflow-y:auto; padding:8px; background:#04070e; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
                    ${history.map(item => `
                        <div class="chat-msg ${item.from === 'me' ? 'msg-player' : 'msg-seller'}" style="margin-bottom:6px;">
                            ${this._escapeHtml(item.text)}
                        </div>
                    `).join('')}
                </div>

                <div class="p2p-compact-composer mt-2">
                    <input type="text" id="mP2PChatInput" class="chat-input p2p-compact-input" placeholder="Сообщение..." maxlength="200" onkeydown="if(event.key==='Enter'){AppM.sendGenericMessage('${msg.id}');}">
                    <button onclick="AppM.sendGenericMessage('${msg.id}')" class="p2p-compact-btn p2p-compact-btn-send">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;

        const box = document.getElementById('mChatScrollBox');
        if (box) box.scrollTop = box.scrollHeight;
    },

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

window.AppM = AppM;
window.AppMessenger = AppM;

console.log('[💬 phone-m-core v10.0.0] Редизайн M+ на 3 чистых раздела (Чаты, Сделки, Профиль) ✓');

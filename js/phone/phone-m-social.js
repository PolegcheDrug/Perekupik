// ========================================================
// js/phone/phone-m-social.js — M+ HUB: СОЦИУМ И ПРОФИЛЬ (v9.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v9.0.0 (РАЗГРУЗКА phone-m.js на 3 файла):
//   - Часть 3 из 3: социум, друзья, профиль, синхронизация NPC
// ========================================================

(function() {
    'use strict';

    if (!window.AppM) {
        console.error('[💬 phone-m-social] AppM не загружен! Проверьте порядок: phone-m-core.js до phone-m-social.js');
        return;
    }

    const AppM = window.AppM;

    // ========================================================
    // СОЦИУМ — объединённый хаб
    // ========================================================
    AppM.renderSocialHubScreen = function(container) {
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
    };

    AppM.setSocialSubTab = function(sub) {
        this.socialSubTab = sub;
        if (typeof playSound === 'function') playSound('tick');
        this.render(document.getElementById('phoneAppContainer'));
    };

    // ========================================================
    // ДРУЗЬЯ
    // ========================================================
    AppM._renderFriendsScreen = function(box) {
        if (!box) return;

        const friendsList = window.state?.friendsList || [];
        const pendingReqs = window.state?.player?.pendingFriendRequests || [];

        // Нормализация: если friendsList содержит строки — превращаем в объекты
        const normalizedFriends = friendsList.map(f => {
            if (typeof f === 'string') {
                return { id: f, name: f };
            }
            return f;
        });

        box.innerHTML = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.14), #090e18); border-color: var(--green);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-green"><i class="fa-solid fa-user-plus mr-1"></i> Друзья</b>
                    <span class="tag-badge bg-tag-green">${normalizedFriends.length}</span>
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

            ${normalizedFriends.length === 0 ? `
                <div class="glass-card text-center sub-label py-6" style="background:#090e18;">
                    <i class="fa-solid fa-user-group color-green mb-2" style="font-size:26px;"></i>
                    <div>У вас пока нет друзей</div>
                </div>
            ` : `
                <div class="space-y-1">
                    ${normalizedFriends.map(f => {
                        const friendId = f.id || '';
                        const friendName = f.name || 'Друг';
                        if (!friendId) return '';
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
    };

    AppM._acceptFriend = async function(fromUserId) {
        if (!window.FB_Bridge?.Friendships?.acceptRequest) return showToast('⚠️ Модуль друзей недоступен');
        const res = await window.FB_Bridge.Friendships.acceptRequest(fromUserId);
        if (res && res.success) {
            showToast('✅ Заявка принята');
            window.state.player.pendingFriendRequests = (window.state.player.pendingFriendRequests || []).filter(p => p.id !== fromUserId);
            if (typeof saveState === 'function') saveState();
            this._refreshCurrentScreen();
        } else {
            showToast(`❌ ${res?.error || 'Ошибка'}`);
        }
    };

    AppM._declineFriend = async function(fromUserId) {
        if (!window.FB_Bridge?.Friendships?.declineRequest) return;
        const res = await window.FB_Bridge.Friendships.declineRequest(fromUserId);
        if (res && res.success) {
            showToast('Заявка отклонена');
            window.state.player.pendingFriendRequests = (window.state.player.pendingFriendRequests || []).filter(p => p.id !== fromUserId);
            if (typeof saveState === 'function') saveState();
            this._refreshCurrentScreen();
        }
    };

    AppM._chatWithFriend = function(friendId, friendName) {
        if (!friendId) return showToast('⚠️ Некорректный ID друга');
        if (!window.state.player) window.state.player = {};
        if (!window.state.player.phoneMessages) window.state.player.phoneMessages = [];

        const myUid = String(window.state.player?.uid || window.tgUserId || 'me');
        const dialogId = `dlg_friend_${[myUid, String(friendId)].sort().join('_')}`;

        let dialog = window.state.player.phoneMessages.find(m => m.id === dialogId);
        if (!dialog) {
            dialog = {
                id: dialogId,
                dialogId: dialogId,
                category: 'friends',
                friendUserId: String(friendId),
                friendName: friendName,
                sender: friendName,
                time: 'Сейчас',
                unread: false,
                viewed: true,
                createdAt: Date.now(),
                chatHistory: []
            };
            window.state.player.phoneMessages.unshift(dialog);
            if (typeof saveState === 'function') saveState();
        } else {
            // Обновляем на случай, если имя изменилось
            dialog.friendUserId = String(friendId);
            dialog.friendName = friendName;
            dialog.sender = friendName;
        }

        this.activeTab = 'chats';
        this.activeDialogId = dialogId;
        this.render(document.getElementById('phoneAppContainer'));
    };

    // ========================================================
    // ПРОФИЛЬ (Я)
    // ========================================================
    AppM.renderProfileScreen = function(container) {
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
    };

    // ========================================================
    // СИНХРОНИЗАЦИЯ NPC-ПОКУПАТЕЛЕЙ С M+ ЧАТОМ
    // ========================================================
    AppM.syncSalesLotBuyersToMessages = function() {
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
    };

    console.log('[👥 phone-m-social v9.0.0] Социум + Друзья + Профиль + синхронизация NPC ✓');
})();
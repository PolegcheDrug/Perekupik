// ========================================================
// js/phone/phone-m-social.js — M+ HUB: СОЦИУМ, ДРУЗЬЯ И P2P ЧАТ (v9.3.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v9.3.0 (ПОЛНОЦЕННЫЙ ЧАТ ДРУЗЕЙ & ИНТЕРАКТИВНЫЕ КАРТОЧКИ АВТО):
//   - ДРУЗЬЯ НА 1 МЕСТЕ: вкладка открывается по умолчанию, табы не затираются.
//   - ЭКРАН ПЕРЕПИСКИ: диалог с другом, история сообщений и чипсы фраз внизу.
//   - КАРТОЧКА АВТО В ЧАТЕ: прямое предложение авто с кнопками «Купить»,
//     «Торговаться (-10%)» и «Отклонить» внутри ленты сообщений.
// ========================================================

(function() {
    'use strict';

    if (!window.AppM) {
        console.error('[💬 phone-m-social] AppM не загружен! Проверьте порядок: phone-m-core.js до phone-m-social.js');
        return;
    }

    const AppM = window.AppM;

    // Состояние вкладки социума (по умолчанию Друзья)
    AppM.socialSubTab = AppM.socialSubTab || 'friends';
    AppM._cachedSocialData = { friends: [], pending: [], outgoing: [] };
    AppM._currentChatFriend = null; // Если выбран друг, открываем экран чата

    // Набор перекупских заготовок для быстрых сообщений
    const QUICK_CHAT_PHRASES = [
        "Салам пополам! Как торговля? 🤝",
        "Здорово! Есть свежий завоз в гараже? 🚗",
        "Глянь, какой аппарат я выкатил на продажу 👀",
        "Срочно нужны наличные, отдам авто со скидкой! ⚡",
        "Там шпакли на полмашины, скидывай цену! 🪣",
        "Пушка-гонка, уважение за сборку! 🚀",
        "Не бит, не крашен, дедушка за хлебом ездил! 😂",
        "Ищу бодрый корч под дрифт, есть варианты? 🏁",
        "Коплю на новый проект, пока на мели 📉",
        "По рукам, оформляем сделку! 🤝"
    ];

    // ========================================================
    // СОЦИУМ — ГЛАВНЫЙ ЭКРАН ХАБА
    // ========================================================
    AppM.renderSocialHubScreen = function(container) {
        if (!container) return;

        // Если сейчас открыт диалог с конкретным другом — рендерим экран переписки
        if (this._currentChatFriend) {
            this._renderFriendChatScreen(container, this._currentChatFriend);
            return;
        }

        const sub = this.socialSubTab || 'friends';
        const incomingCount = (this._cachedSocialData?.pending || []).length;
        const friendsCount = (this._cachedSocialData?.friends || []).length;

        container.innerHTML = `
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.16), #090e18); border-color: var(--green);">
                <div>
                    <b class="text-xs color-green"><i class="fa-solid fa-users mr-1"></i> Социум перекупов</b>
                    <div class="sub-label" style="font-size:8.5px;">Друзья · Заявки · Рейтинг · Клубы</div>
                </div>
                <span class="tag-badge bg-tag-green">В СЕТИ: ${friendsCount}</span>
            </div>

            <!-- УДОБНАЯ ВЕРХНЯЯ НАВИГАЦИЯ -->
            <div class="mplus-nav-scroll-bar mb-2" style="display:flex; gap:4px; overflow-x:auto; padding-bottom:2px;">
                <button onclick="AppM.setSocialSubTab('friends')" class="m-nav-pill ${sub === 'friends' ? 'active' : ''}">
                    <i class="fa-solid fa-user-group"></i> Друзья (${friendsCount})
                </button>
                <button onclick="AppM.setSocialSubTab('incoming')" class="m-nav-pill ${sub === 'incoming' ? 'active' : ''}">
                    <i class="fa-solid fa-envelope"></i> Заявки ${incomingCount > 0 ? `<b class="color-red">(${incomingCount})</b>` : ''}
                </button>
                <button onclick="AppM.setSocialSubTab('top')" class="m-nav-pill ${sub === 'top' ? 'active' : ''}">
                    <i class="fa-solid fa-trophy"></i> Топ игроков
                </button>
                <button onclick="AppM.setSocialSubTab('feed')" class="m-nav-pill ${sub === 'feed' ? 'active' : ''}">
                    <i class="fa-solid fa-newspaper"></i> Лента
                </button>
                <button onclick="AppM.setSocialSubTab('clubs')" class="m-nav-pill ${sub === 'clubs' ? 'active' : ''}">
                    <i class="fa-solid fa-shield-halved"></i> Клубы
                </button>
            </div>

            <div id="mSocialContentBox" style="min-height: 260px;"></div>
        `;

        const box = document.getElementById('mSocialContentBox');
        if (!box) return;

        try {
            if (sub === 'friends') {
                this._renderFriendsScreen(box);
            } else if (sub === 'incoming') {
                this._renderIncomingTab(box, this._cachedSocialData?.pending || []);
            } else if (sub === 'top') {
                if (window.MLeaderboardModule?.renderScreen) {
                    window.MLeaderboardModule.onTabOpen?.();
                    window.MLeaderboardModule.renderScreen(box);
                } else {
                    box.innerHTML = `<div class="glass-card text-center py-4 sub-label">Рейтинг загружается...</div>`;
                }
            } else if (sub === 'feed') {
                if (window.MEventsModule?.renderScreen) {
                    window.MEventsModule.onTabOpen?.();
                    window.MEventsModule.renderScreen(box);
                } else {
                    box.innerHTML = `<div class="glass-card text-center py-4 sub-label">Лента временно недоступна</div>`;
                }
            } else if (sub === 'clubs') {
                if (window.MClubsModule?.renderScreen) {
                    window.MClubsModule.onTabOpen?.();
                    window.MClubsModule.renderScreen(box);
                } else {
                    box.innerHTML = `<div class="glass-card text-center py-4 sub-label">Клубы временно недоступны</div>`;
                }
            }
        } catch (e) {
            console.error('[AppM] Ошибка рендера вкладки:', e);
            box.innerHTML = `<div class="glass-card p-3 text-center" style="border-color: var(--red);">
                <b class="color-red text-xs">Ошибка отображения</b>
                <div class="sub-label mt-1" style="font-size:9px;">${String(e.message || e).substring(0, 120)}</div>
            </div>`;
        }
    };

    AppM.setSocialSubTab = function(sub) {
        this.socialSubTab = sub;
        this._currentChatFriend = null; // Выход из чата к списку
        if (typeof playSound === 'function') playSound('tick');
        this.render(document.getElementById('phoneAppContainer'));
    };

    // ========================================================
    // СПИСОК ДРУЗЕЙ
    // ========================================================
    AppM._renderFriendsScreen = async function(box) {
        if (!box) return;

        box.innerHTML = `
            <div class="sub-label text-center py-6">
                <i class="fa-solid fa-spinner fa-spin color-green" style="font-size:22px;"></i>
                <div class="mt-2 text-xs">Загрузка контактов...</div>
            </div>
        `;

        if (window.FB_FriendshipsManager?.fetchFriendships) {
            try {
                const data = await window.FB_FriendshipsManager.fetchFriendships();
                this._cachedSocialData = data || { friends: [], pending: [], outgoing: [] };
            } catch (err) {
                console.warn('[Social] Ошибка Firestore:', err);
            }
        }

        const friends = this._cachedSocialData.friends || [];

        if (friends.length === 0) {
            box.innerHTML = `
                <div class="glass-card text-center sub-label py-6" style="background:#090e18;">
                    <i class="fa-solid fa-user-group color-green mb-2" style="font-size:28px;"></i>
                    <div class="font-bold text-xs mb-1">Список друзей пуст</div>
                    <div style="font-size:9px;" class="mb-3">Перейдите во вкладку «Топ игроков», чтобы найти перекупов и добавить в друзья.</div>
                    <button onclick="AppM.setSocialSubTab('top')" class="btn btn-cyan btn-sm btn-auto" style="padding:5px 12px; font-size:10px;">
                        🏆 Открыть Топ игроков
                    </button>
                </div>
            `;
            return;
        }

        box.innerHTML = `
            <div class="space-y-1">
                ${friends.map(f => {
                    const friendId = f.id;
                    const friendName = this._escapeHtml(f.name || 'Перекуп');
                    const carTitle = this._escapeHtml(f.carName || 'Пешком');
                    const lastMsg = f.lastMessage ? `
                        <div class="sub-label mt-1" style="font-size:8.5px; color:#38bdf8; background:rgba(56,189,248,0.08); padding:3px 7px; border-radius:4px; max-width:92%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            💬 «${this._escapeHtml(f.lastMessage.text)}»
                        </div>
                    ` : '';

                    return `
                        <div class="glass-card p-2 mb-2" style="border-left: 3px solid var(--green);">
                            <div class="flex-between mb-1">
                                <div>
                                    <b class="text-xs color-green" style="font-size:12px;">${friendName}</b>
                                    <span class="tag-badge bg-tag-cyan" style="font-size:7.5px; padding:1px 4px;">Ур. ${f.level || 1}</span>
                                    <div class="sub-label mt-1" style="font-size:8.5px;">Болид: <b class="color-amber">${carTitle}</b></div>
                                </div>
                                <button onclick="AppM.removeFriendConfirm('${friendId}', '${this._escapeAttr(f.name)}')" class="btn btn-dark btn-sm btn-auto" style="padding:2px 6px; font-size:8px; opacity:0.5;">✕</button>
                            </div>
                            ${lastMsg}
                            <div class="grid-2 mt-2" style="gap:6px;">
                                <button onclick="AppM.openFriendChat('${friendId}', '${this._escapeAttr(f.name)}')" class="btn btn-green btn-sm font-bold" style="font-size:10px; padding:6px 0;">
                                    💬 ЧАТ С ДРУГОМ
                                </button>
                                <button onclick="AppM.openDirectOfferModal('${friendId}', '${this._escapeAttr(f.name)}')" class="btn btn-dark btn-sm" style="font-size:10px; padding:6px 0; border-color:var(--cyan); color:var(--cyan);">
                                    🤝 Продать авто
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    // ========================================================
    // ВХОДЯЩИЕ ЗАЯВКИ
    // ========================================================
    AppM._renderIncomingTab = function(container, incoming) {
        if (!incoming || incoming.length === 0) {
            container.innerHTML = `
                <div class="glass-card text-center sub-label py-6" style="background:#090e18;">
                    <i class="fa-solid fa-envelope-open color-amber mb-2" style="font-size:26px;"></i>
                    <div class="text-xs">Новых входящих заявок в друзья нет</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="space-y-1">
                ${incoming.map(req => `
                    <div class="glass-card p-2 flex-between mb-2" style="border-left: 3px solid var(--amber);">
                        <div>
                            <b class="text-xs color-cyan">${this._escapeHtml(req.name || 'Игрок')}</b>
                            <div class="sub-label" style="font-size:8.5px;">Хочет добавиться к вам в друзья</div>
                        </div>
                        <div class="flex-gap">
                            <button onclick="AppM._acceptFriend('${req.id}')" class="btn btn-green btn-sm btn-auto" style="font-size:9.5px; padding:4px 10px;">Принять</button>
                            <button onclick="AppM._declineFriend('${req.id}')" class="btn btn-dark btn-sm btn-auto" style="font-size:9.5px; padding:4px 8px;">✕</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    };

    // ========================================================
    // ЭКРАН ПЕРЕПИСКИ (ЧАТ С ДРУГОМ + КАРТОЧКА АВТО)
    // ========================================================
    AppM.openFriendChat = function(friendId, friendName) {
        this._currentChatFriend = { id: String(friendId), name: friendName };
        if (typeof playSound === 'function') playSound('tick');
        this.renderSocialHubScreen(document.getElementById('mSocialContentBox')?.parentElement || document.getElementById('phoneAppContainer'));
    };

    AppM._renderFriendChatScreen = async function(container, friend) {
        const myUid = String(window.state?.player?.uid || window.tgUserId || 'me');
        const dialogId = `dlg_friend_${[myUid, friend.id].sort().join('_')}`;

        // Получаем историю сообщений и активные предложения авто
        let chatHistory = [];
        let activeCarOffer = null;

        if (!window.state.player) window.state.player = {};
        if (!window.state.player.phoneMessages) window.state.player.phoneMessages = [];

        let localDialog = window.state.player.phoneMessages.find(m => m.id === dialogId);
        if (localDialog && Array.isArray(localDialog.chatHistory)) {
            chatHistory = localDialog.chatHistory;
        }

        // Проверяем наличие активного оффера на продажу
        if (localDialog?.pendingOffer) {
            activeCarOffer = localDialog.pendingOffer;
        }

        container.innerHTML = `
            <div class="glass-card p-2 mb-2 flex-between" style="background:#090e18; border-color:var(--cyan);">
                <div class="flex-gap" style="align-items:center;">
                    <button onclick="AppM.setSocialSubTab('friends')" class="btn btn-dark btn-sm btn-auto" style="padding:4px 8px; font-size:10px;">
                        <i class="fa-solid fa-chevron-left mr-1"></i> Друзья
                    </button>
                    <div>
                        <b class="text-xs color-green">${this._escapeHtml(friend.name)}</b>
                        <div class="sub-label" style="font-size:8px;">● В сети для сделок</div>
                    </div>
                </div>
                <button onclick="AppM.openDirectOfferModal('${friend.id}', '${this._escapeAttr(friend.name)}')" class="btn btn-cyan btn-sm btn-auto" style="font-size:9px; padding:4px 8px;">
                    🤝 Продать авто
                </button>
            </div>

            <!-- ЛЕНТА ПЕРЕПИСКИ -->
            <div id="friendChatHistoryBox" style="background:#050914; border:1px solid rgba(255,255,255,0.06); border-radius:12px; height:280px; overflow-y:auto; padding:10px; margin-bottom:8px; display:flex; flex-direction:column; gap:6px;">
                <!-- Сообщения генерируются ниже -->
            </div>

            <!-- БЫСТРЫЕ РЕПЛИКИ (ЧИПСЫ) -->
            <div class="sub-label mb-1" style="font-size:8.5px;">Нажмите фразу для отправки:</div>
            <div style="display:flex; gap:5px; overflow-x:auto; padding-bottom:6px; margin-bottom:4px;" id="friendChatChipsContainer">
                ${QUICK_CHAT_PHRASES.map((phrase, idx) => `
                    <button onclick="AppM.sendChatPhrase('${friend.id}',${idx})" class="btn btn-dark btn-sm" style="font-size:9px; padding:4px 9px; white-space:nowrap; border-radius:14px; text-transform:none;">
                        ${phrase}
                    </button>
                `).join('')}
            </div>
        `;

        this._renderMessagesList(friend, chatHistory, activeCarOffer);
    };

    AppM._renderMessagesList = function(friend, chatHistory, activeCarOffer) {
        const box = document.getElementById('friendChatHistoryBox');
        if (!box) return;

        let html = '';

        if (!chatHistory || chatHistory.length === 0) {
            html += `<div class="sub-label text-center py-6">Начните диалог с перекупом, выбрав готовую реплику внизу!</div>`;
        } else {
            chatHistory.forEach(msg => {
                const isMe = msg.from === 'me';
                html += `
                    <div style="align-self: ${isMe ? 'flex-end' : 'flex-start'}; max-width:82%; background:${isMe ? 'rgba(0,242,254,0.14)' : '#111827'}; border:1px solid ${isMe ? 'rgba(0,242,254,0.3)' : 'rgba(255,255,255,0.08)'}; border-radius:10px; padding:6px 10px; font-size:10.5px; color:#f1f5f9; line-height:1.35;">
                        ${this._escapeHtml(msg.text)}
                    </div>
                `;
            });
        }

        // РЕНДЕР ИНТЕРАКТИВНОЙ КАРТОЧКИ АВТО В ЧАТЕ
        if (activeCarOffer && activeCarOffer.status === 'pending') {
            const isMyOffer = activeCarOffer.sellerId === String(window.state?.player?.uid || window.tgUserId || 'me');
            const car = activeCarOffer.car || {};
            const carImg = car.img || "assets/cars/economy/2101/vaz-2101.jpg";

            html += `
                <div style="background:#090e18; border:1.5px solid var(--green); border-radius:12px; padding:10px; margin:8px 0; box-shadow:0 0 15px rgba(0,230,118,0.2);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-green"><i class="fa-solid fa-car mr-1"></i> ПРЕДЛОЖЕНИЕ АВТОМОБИЛЯ</b>
                        <span class="tag-badge bg-tag-green">${Number(activeCarOffer.price).toLocaleString()} ₽</span>
                    </div>

                    <div style="display:flex; gap:8px; align-items:center; margin:6px 0;">
                        <img src="${carImg}" style="width:70px; height:48px; border-radius:6px; object-fit:cover;" onerror="this.src='assets/cars/economy/2101/vaz-2101.jpg'">
                        <div>
                            <div class="font-bold text-xs" style="font-size:11px;">${this._escapeHtml(car.name || 'Автомобиль')}</div>
                            <div class="sub-label" style="font-size:8.5px;">${car.power || 100} л.с. • Пробег: ${(car.mileage || 65000).toLocaleString()} км</div>
                            <div class="sub-label" style="font-size:8.5px;">Кузов: <b class="color-green">${car.condition || 80}%</b></div>
                        </div>
                    </div>

                    ${!isMyOffer ? `
                        <div class="grid-3 mt-2" style="gap:4px;">
                            <button onclick="AppM.acceptDirectCarOfferInChat('${activeCarOffer.offerId}')" class="btn btn-green btn-sm font-bold" style="font-size:9px; padding:5px 0;">
                                ✅ Купить
                            </button>
                            <button onclick="AppM.haggleCarOfferInChat('${friend.id}', '${activeCarOffer.offerId}',${activeCarOffer.price})" class="btn btn-amber btn-sm" style="font-size:9px; padding:5px 0;">
                                💬 -10%
                            </button>
                            <button onclick="AppM.rejectCarOfferInChat('${activeCarOffer.offerId}')" class="btn btn-dark btn-sm" style="font-size:9px; padding:5px 0;">
                                ✕ Отказ
                            </button>
                        </div>
                    ` : `
                        <div class="p-1 text-center sub-label" style="font-size:8.5px; background:rgba(255,255,255,0.04); border-radius:4px;">
                            ⏳ Предложение отправлено другу. Ожидаем его решения...
                        </div>
                    `}
                </div>
            `;
        }

        box.innerHTML = html;
        box.scrollTop = box.scrollHeight;
    };

    // Отправка заготовки фразы в чат
    AppM.sendChatPhrase = async function(friendId, phraseIdx) {
        const phrase = QUICK_CHAT_PHRASES[phraseIdx];
        if (!phrase) return;

        const myUid = String(window.state?.player?.uid || window.tgUserId || 'me');
        const dialogId = `dlg_friend_${[myUid, friendId].sort().join('_')}`;

        if (!window.state.player) window.state.player = {};
        if (!window.state.player.phoneMessages) window.state.player.phoneMessages = [];

        let dialog = window.state.player.phoneMessages.find(m => m.id === dialogId);
        if (!dialog) {
            dialog = {
                id: dialogId,
                category: 'friends',
                friendId: friendId,
                chatHistory: []
            };
            window.state.player.phoneMessages.unshift(dialog);
        }

        dialog.chatHistory.push({ from: 'me', text: phrase });
        if (typeof saveState === 'function') saveState();

        this._renderMessagesList(this._currentChatFriend, dialog.chatHistory, dialog.pendingOffer);

        // Отправка в Firestore для синхронизации с реальным другом
        if (window.FB_FriendshipsManager?.sendQuickPhrase) {
            window.FB_FriendshipsManager.sendQuickPhrase(friendId, phrase);
        }

        if (typeof playSound === 'function') playSound('tick');
    };

    // ========================================================
    // ДЕЙСТВИЯ С ОФФЕРОМ ПРЯМО В ЧАТЕ
    // ========================================================
    AppM.acceptDirectCarOfferInChat = async function(offerId) {
        if (!window.FB_NotificationsManager?.acceptDirectCarOffer) return;
        showToast('Оформление покупки...');
        const res = await window.FB_NotificationsManager.acceptDirectCarOffer(offerId);
        if (res && res.success) {
            showToast(`✅ «${res.carName}» в гараже!`);
            if (typeof playSound === 'function') playSound('win');
            this.setSocialSubTab('friends');
        } else {
            showToast(`❌ ${res?.error || 'Не удалось купить'}`);
        }
    };

    AppM.haggleCarOfferInChat = function(friendId, offerId, currentPrice) {
        const discounted = Math.round(currentPrice * 0.9);
        const text = `Скинь 10% — готов забрать прямо сейчас за ${discounted.toLocaleString()} ₽!`;
        
        // Отправляем как реплику в чат
        const myUid = String(window.state?.player?.uid || window.tgUserId || 'me');
        const dialogId = `dlg_friend_${[myUid, friendId].sort().join('_')}`;
        let dialog = window.state?.player?.phoneMessages?.find(m => m.id === dialogId);
        if (dialog) {
            dialog.chatHistory.push({ from: 'me', text: text });
            saveState();
            this._renderMessagesList(this._currentChatFriend, dialog.chatHistory, dialog.pendingOffer);
        }

        if (window.FB_FriendshipsManager?.sendQuickPhrase) {
            window.FB_FriendshipsManager.sendQuickPhrase(friendId, text);
        }
        showToast('💬 Встречное предложение отправлено в чат!');
    };

    AppM.rejectCarOfferInChat = async function(offerId) {
        if (window.FB_NotificationsManager?.rejectDirectCarOffer) {
            await window.FB_NotificationsManager.rejectDirectCarOffer(offerId);
        }
        showToast('Предложение отклонено');
        this.setSocialSubTab('friends');
    };

    // ========================================================
    // ПРИНЯТИЕ / ОТКЛОНЕНИЕ / УДАЛЕНИЕ ДРУЗЕЙ
    // ========================================================
    AppM._acceptFriend = async function(fromUserId) {
        if (!window.FB_FriendshipsManager?.acceptRequest) return;
        showToast('Принятие заявки...');
        const res = await window.FB_FriendshipsManager.acceptRequest(fromUserId);
        if (res && res.success) {
            showToast('✅ Вы теперь друзья!');
            if (typeof playSound === 'function') playSound('win');
            this.setSocialSubTab('friends');
        } else {
            showToast(`❌ ${res?.error || 'Ошибка'}`);
        }
    };

    AppM._declineFriend = async function(fromUserId) {
        if (!window.FB_FriendshipsManager?.declineRequest) return;
        await window.FB_FriendshipsManager.declineRequest(fromUserId);
        showToast('Заявка отклонена');
        this.setSocialSubTab('incoming');
    };

    AppM.removeFriendConfirm = async function(friendId, friendName) {
        if (!confirm(`Удалить перекупа «${friendName}» из списка друзей?`)) return;
        if (!window.FB_FriendshipsManager?.removeFriend) return;
        await window.FB_FriendshipsManager.removeFriend(friendId);
        showToast('Удалено из друзей');
        this.setSocialSubTab('friends');
    };

    // ========================================================
    // МОДАЛКА ПРЯМОЙ ПРОДАЖИ АВТО ДРУГУ
    // ========================================================
    AppM.openDirectOfferModal = function(friendId, friendName) {
        const garage = window.state?.garage || [];
        if (garage.length === 0) return showToast('В гараже нет машин для продажи!');

        const modal = document.createElement('div');
        modal.id = 'modalDirectOfferFriend';
        modal.className = 'modal-backdrop active';
        modal.style.cssText = 'position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; padding:15px; backdrop-filter:blur(4px);';

        const carOptions = garage.map((c, i) => `
            <option value="${i}">${c.name} (${c.power || 100} л.с. | ${c.plate || 'ТРАНЗИТ'})</option>
        `).join('');

        modal.innerHTML = `
            <div class="glass-card p-3 w-full" style="max-width:380px; border-radius:14px; background:#0b1120; border:1px solid var(--green);">
                <div class="flex-between mb-2">
                    <b class="text-xs color-green"><i class="fa-solid fa-car-side mr-1"></i> Продать авто: ${this._escapeHtml(friendName)}</b>
                    <button onclick="document.getElementById('modalDirectOfferFriend')?.remove()" class="btn btn-dark btn-sm btn-auto" style="padding:3px 7px;">✕</button>
                </div>
                <div class="sub-label mb-2" style="font-size:9px;">Предложение появится у друга прямо в диалоге чата.</div>

                <div class="mb-2">
                    <label class="sub-label block mb-1" style="font-size:9px;">Выберите автомобиль:</label>
                    <select id="directOfferCarSelect" class="input-field" style="width:100%; font-size:11px; padding:6px;" onchange="AppM._onDirectCarSelected(this.value)">
                        ${carOptions}
                    </select>
                </div>

                <div class="mb-3">
                    <label class="sub-label block mb-1" style="font-size:9px;">Цена предложения (₽):</label>
                    <input type="number" id="directOfferPriceInput" class="input-field font-bold color-green" style="width:100%; font-size:13px; padding:6px;" value="${garage[0]?.marketValue || garage[0]?.price || 150000}">
                </div>

                <div class="grid-2" style="gap:6px;">
                    <button onclick="document.getElementById('modalDirectOfferFriend')?.remove()" class="btn btn-dark btn-sm">Отмена</button>
                    <button onclick="AppM.confirmDirectOffer('${friendId}')" class="btn btn-green btn-sm">Отправить оффер</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    };

    AppM._onDirectCarSelected = function(idx) {
        const car = window.state?.garage?.[parseInt(idx, 10)];
        const priceInput = document.getElementById('directOfferPriceInput');
        if (car && priceInput) {
            priceInput.value = car.marketValue || car.price || 150000;
        }
    };

    AppM.confirmDirectOffer = async function(friendId) {
        const select = document.getElementById('directOfferCarSelect');
        const priceInput = document.getElementById('directOfferPriceInput');
        const carIdx = parseInt(select?.value, 10);
        const price = parseInt(priceInput?.value, 10);

        if (isNaN(carIdx) || !window.state?.garage?.[carIdx]) return showToast('Выберите автомобиль!');
        if (isNaN(price) || price < 5000) return showToast('Укажите корректную сумму продажи!');

        const car = window.state.garage[carIdx];

        if (window.FB_FriendshipsManager?.sendDirectCarOffer) {
            showToast('Отправка оффера в чат...');
            const res = await window.FB_FriendshipsManager.sendDirectCarOffer(friendId, car, price);
            if (res && res.success) {
                document.getElementById('modalDirectOfferFriend')?.remove();
                
                // Прикрепляем оффер в локальный диалог
                const myUid = String(window.state?.player?.uid || window.tgUserId || 'me');
                const dialogId = `dlg_friend_${[myUid, friendId].sort().join('_')}`;
                let dialog = window.state?.player?.phoneMessages?.find(m => m.id === dialogId);
                if (dialog) {
                    dialog.pendingOffer = {
                        offerId: res.offerId,
                        sellerId: myUid,
                        car: car,
                        price: price,
                        status: 'pending'
                    };
                    saveState();
                }

                showToast('🤝 Оффер доставлен в чат друга!');
                if (typeof playSound === 'function') playSound('win');
                this.openFriendChat(friendId, this._currentChatFriend?.name || 'Друг');
            } else {
                showToast(`❌ Ошибка: ${res?.error || 'Не удалось отправить'}`);
            }
        }
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
                </div>
            </div>
        `;
    };

    AppM._escapeHtml = function(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    AppM._escapeAttr = function(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    };

    console.log('[👥 phone-m-social v9.3.0] Друзья на 1 месте + Чат + Карточки сделок в диалоге ✓');
})();

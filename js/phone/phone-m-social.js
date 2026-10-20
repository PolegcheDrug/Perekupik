// ========================================================
// js/phone/phone-m-social.js — M+ HUB: СОЦИУМ, ДРУЗЬЯ И СДЕЛКИ (v9.2.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v9.2.0:
//   - ПОЛНОЦЕННЫЙ ЭКРАН ДРУЗЕЙ: табы "Мои друзья", "Входящие", "Исходящие".
//   - ВЗАИМНОЕ ДОБАВЛЕНИЕ: кнопки Принять/Отклонить с Firestore-синхронизацией.
//   - БЫСТРЫЕ ФРАЗЫ (Quick Chat): всплывающее меню с перекупскими фразами.
//   - ПРЯМАЯ ПРОДАЖА АВТО ДРУГУ: модальное окно выбора авто из гаража с ценой.
// ========================================================

(function() {
    'use strict';

    if (!window.AppM) {
        console.error('[💬 phone-m-social] AppM не загружен! Проверьте порядок: phone-m-core.js до phone-m-social.js');
        return;
    }

    const AppM = window.AppM;

    // Внутреннее состояние вкладок друзей
    AppM._friendsSubTab = AppM._friendsSubTab || 'list'; // 'list' | 'incoming' | 'outgoing'
    AppM._cachedSocialData = { friends: [], pending: [], outgoing: [] };

    // Набор перекупских фраз для быстрого общения
    const QUICK_CHAT_PHRASES = [
        { cat: "Приветствия", text: "Салам пополам! Как торговля? 🤝" },
        { cat: "Приветствия", text: "Здорово! Есть свежий завоз в гараже? 🚗" },
        { cat: "Статус", text: "Коплю на новый проект, пока на мели 📉" },
        { cat: "Статус", text: "Снял куш на перепродаже, обмываю! 🍾" },
        { cat: "Подколы", text: "Не бит, не крашен, дедушка за хлебом ездил! 😂" },
        { cat: "Подколы", text: "Там шпакли на полмашины, скидывай цену! 🪣" },
        { cat: "Подколы", text: "Пушка-гонка, уважение за сборку! 🚀" },
        { cat: "Деловые", text: "Глянь, что я выкатил на продажу 👀" },
        { cat: "Деловые", text: "Ищу бодрый корч под дрифт, есть варианты? 🏁" },
        { cat: "Деловые", text: "Срочно нужны деньги, отдам авто ниже рынка! ⚡" }
    ];

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
                if (window.MEventsModule?.renderScreen) {
                    window.MEventsModule.onTabOpen?.();
                    window.MEventsModule.renderScreen(box);
                } else {
                    box.innerHTML = `<div class="glass-card text-center py-4 sub-label">Лента временно недоступна</div>`;
                }
            } else if (sub === 'top') {
                if (window.MLeaderboardModule?.renderScreen) {
                    window.MLeaderboardModule.onTabOpen?.();
                    window.MLeaderboardModule.renderScreen(box);
                } else {
                    box.innerHTML = `<div class="glass-card text-center py-4 sub-label">Рейтинг загружается...</div>`;
                }
            } else if (sub === 'friends') {
                this._renderFriendsScreen(box);
            } else if (sub === 'clubs') {
                if (window.MClubsModule?.renderScreen) {
                    window.MClubsModule.onTabOpen?.();
                    window.MClubsModule.renderScreen(box);
                } else {
                    box.innerHTML = `<div class="glass-card text-center py-4 sub-label">Клубы временно недоступны</div>`;
                }
            }
        } catch (e) {
            console.error('[AppM] Ошибка рендера социума:', e);
            box.innerHTML = `<div class="glass-card p-3 text-center" style="border-color: var(--red);">
                <b class="color-red text-xs">Ошибка загрузки модуля</b>
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
    // ДРУЗЬЯ — ОБНОВЛЕННЫЙ ИНТЕРФЕЙС
    // ========================================================
    AppM._renderFriendsScreen = async function(box) {
        if (!box) return;

        box.innerHTML = `
            <div class="sub-label text-center py-6">
                <i class="fa-solid fa-spinner fa-spin color-green" style="font-size:22px;"></i>
                <div class="mt-2 text-xs">Загрузка контактов синдиката...</div>
            </div>
        `;

        // Загрузка данных из облака через Firebase
        if (window.FB_FriendshipsManager?.fetchFriendships) {
            try {
                const data = await window.FB_FriendshipsManager.fetchFriendships();
                this._cachedSocialData = data || { friends: [], pending: [], outgoing: [] };
            } catch (err) {
                console.warn('[Social] Не удалось обновить из облака:', err);
            }
        }

        const friends = this._cachedSocialData.friends || [];
        const incoming = this._cachedSocialData.pending || [];
        const outgoing = this._cachedSocialData.outgoing || [];
        const fTab = this._friendsSubTab || 'list';

        box.innerHTML = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.14), #090e18); border-color: var(--green);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-green"><i class="fa-solid fa-handshake mr-1"></i> Сообщество друзей</b>
                    <span class="tag-badge bg-tag-green">В сети: ${friends.length}</span>
                </div>
                <div class="sub-label" style="font-size:8.5px;">Обменивайтесь репликами и продавайте авто без комиссии биржи</div>
            </div>

            <div class="grid-3 mb-2" style="grid-template-columns: 1.2fr 1fr 1fr; gap: 4px;">
                <button onclick="AppM.switchFriendsSubTab('list')" class="btn ${fTab === 'list' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:5px 2px;">
                    👥 Друзья (${friends.length})
                </button>
                <button onclick="AppM.switchFriendsSubTab('incoming')" class="btn ${fTab === 'incoming' ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:9px; padding:5px 2px;">
                    📬 Входящие ${incoming.length > 0 ? `<b class="color-red">(${incoming.length})</b>` : ''}
                </button>
                <button onclick="AppM.switchFriendsSubTab('outgoing')" class="btn ${fTab === 'outgoing' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:5px 2px;">
                    ⏳ Запросы (${outgoing.length})
                </button>
            </div>

            <div id="friendsSubContent"></div>
        `;

        const subContainer = document.getElementById('friendsSubContent');
        if (!subContainer) return;

        if (fTab === 'list') {
            this._renderFriendsListTab(subContainer, friends);
        } else if (fTab === 'incoming') {
            this._renderIncomingTab(subContainer, incoming);
        } else if (fTab === 'outgoing') {
            this._renderOutgoingTab(subContainer, outgoing);
        }
    };

    AppM.switchFriendsSubTab = function(tab) {
        this._friendsSubTab = tab;
        if (typeof playSound === 'function') playSound('tick');
        const box = document.getElementById('mSocialContentBox');
        if (box) this._renderFriendsScreen(box);
    };

    // 1. Список подтвержденных друзей
    AppM._renderFriendsListTab = function(container, friends) {
        if (!friends || friends.length === 0) {
            container.innerHTML = `
                <div class="glass-card text-center sub-label py-6" style="background:#090e18;">
                    <i class="fa-solid fa-user-group color-green mb-2" style="font-size:26px;"></i>
                    <div class="font-bold text-xs mb-1">Список друзей пуст</div>
                    <div style="font-size:9px;">Перейдите во вкладку «Топ», чтобы отправить заявки другим перекупам.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="space-y-1">
                ${friends.map(f => {
                    const friendId = f.id;
                    const friendName = this._escapeHtml(f.name || 'Перекуп');
                    const carTitle = this._escapeHtml(f.carName || 'Пешком');
                    const lastMsg = f.lastMessage ? `
                        <div class="sub-label mt-1" style="font-size:8.5px; color:#38bdf8; background:rgba(56,189,248,0.08); padding:2px 6px; border-radius:4px; max-width:90%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            💬 «${this._escapeHtml(f.lastMessage.text)}»
                        </div>
                    ` : '';

                    return `
                        <div class="glass-card p-2 mb-1" style="border-left: 3px solid var(--green);">
                            <div class="flex-between mb-1">
                                <div>
                                    <b class="text-xs color-green">${friendName}</b>
                                    <span class="tag-badge bg-tag-cyan" style="font-size:7.5px; padding:1px 4px;">Ур. ${f.level || 1}</span>
                                    <div class="sub-label" style="font-size:8.5px;">Авто: <b>${carTitle}</b></div>
                                </div>
                                <button onclick="AppM.removeFriendConfirm('${friendId}', '${this._escapeAttr(f.name)}')" class="btn btn-dark btn-sm btn-auto" style="padding:2px 6px; font-size:8px; opacity:0.6;">✕</button>
                            </div>
                            ${lastMsg}
                            <div class="grid-2 mt-2" style="gap:4px;">
                                <button onclick="AppM.openQuickPhrasePicker('${friendId}', '${this._escapeAttr(f.name)}')" class="btn btn-cyan btn-sm btn-auto" style="font-size:9px; padding:4px 6px;">
                                    💬 Фраза
                                </button>
                                <button onclick="AppM.openDirectOfferModal('${friendId}', '${this._escapeAttr(f.name)}')" class="btn btn-green btn-sm btn-auto" style="font-size:9px; padding:4px 6px;">
                                    🤝 Продать авто
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    // 2. Входящие заявки
    AppM._renderIncomingTab = function(container, incoming) {
        if (!incoming || incoming.length === 0) {
            container.innerHTML = `
                <div class="glass-card text-center sub-label py-6" style="background:#090e18;">
                    <i class="fa-solid fa-envelope-open color-amber mb-2" style="font-size:24px;"></i>
                    <div class="text-xs">Новых входящих заявок нет</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="space-y-1">
                ${incoming.map(req => `
                    <div class="glass-card p-2 flex-between mb-1" style="border-left: 3px solid var(--amber);">
                        <div>
                            <b class="text-xs">${this._escapeHtml(req.name || 'Игрок')}</b>
                            <div class="sub-label" style="font-size:8.5px;">Хочет добавиться к вам в друзья</div>
                        </div>
                        <div class="flex-gap">
                            <button onclick="AppM._acceptFriend('${req.id}')" class="btn btn-green btn-sm btn-auto" style="font-size:9px; padding:4px 9px;">Принять</button>
                            <button onclick="AppM._declineFriend('${req.id}')" class="btn btn-dark btn-sm btn-auto" style="font-size:9px; padding:4px 7px;">✕</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    };

    // 3. Исходящие запросы
    AppM._renderOutgoingTab = function(container, outgoing) {
        if (!outgoing || outgoing.length === 0) {
            container.innerHTML = `
                <div class="glass-card text-center sub-label py-6" style="background:#090e18;">
                    <i class="fa-solid fa-paper-plane color-cyan mb-2" style="font-size:24px;"></i>
                    <div class="text-xs">Вы не отправляли заявок, ожидающих ответа</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="space-y-1">
                ${outgoing.map(req => `
                    <div class="glass-card p-2 flex-between mb-1">
                        <div>
                            <b class="text-xs color-cyan">${this._escapeHtml(req.name || 'Игрок')}</b>
                            <div class="sub-label" style="font-size:8.5px;">Заявка ожидает подтверждения игроком</div>
                        </div>
                        <span class="tag-badge bg-tag-cyan" style="font-size:8px;">Ожидание</span>
                    </div>
                `).join('')}
            </div>
        `;
    };

    // ========================================================
    // ДЕЙСТВИЯ: ПРИНЯТЬ, ОТКЛОНИТЬ, УДАЛИТЬ
    // ========================================================
    AppM._acceptFriend = async function(fromUserId) {
        if (!window.FB_FriendshipsManager?.acceptRequest) return showToast('⚠️ Модуль недоступен');
        showToast('⏳ Принятие заявки...');
        const res = await window.FB_FriendshipsManager.acceptRequest(fromUserId);
        if (res && res.success) {
            showToast('✅ Вы теперь друзья!');
            if (typeof playSound === 'function') playSound('win');
            this._renderFriendsScreen(document.getElementById('mSocialContentBox'));
        } else {
            showToast(`❌ ${res?.error || 'Ошибка'}`);
        }
    };

    AppM._declineFriend = async function(fromUserId) {
        if (!window.FB_FriendshipsManager?.declineRequest) return;
        const res = await window.FB_FriendshipsManager.declineRequest(fromUserId);
        if (res && res.success) {
            showToast('Заявка отклонена');
            this._renderFriendsScreen(document.getElementById('mSocialContentBox'));
        }
    };

    AppM.removeFriendConfirm = async function(friendId, friendName) {
        if (!confirm(`Удалить перекупа «${friendName}» из списка друзей?`)) return;
        if (!window.FB_FriendshipsManager?.removeFriend) return;
        
        const res = await window.FB_FriendshipsManager.removeFriend(friendId);
        if (res && res.success) {
            showToast('Удалено из друзей');
            this._renderFriendsScreen(document.getElementById('mSocialContentBox'));
        } else {
            showToast(`Ошибка: ${res?.error || 'Не удалось удалить'}`);
        }
    };

    // ========================================================
    // БЫСТРЫЕ ФРАЗЫ (QUICK CHAT)
    // ========================================================
    AppM.openQuickPhrasePicker = function(friendId, friendName) {
        const modal = document.createElement('div');
        modal.id = 'modalQuickPhrasePicker';
        modal.className = 'modal-backdrop active';
        modal.style.cssText = 'position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.85); display:flex; align-items:flex-end; justify-content:center; backdrop-filter:blur(4px);';

        const chipsHtml = QUICK_CHAT_PHRASES.map((p, idx) => `
            <button onclick="AppM.sendPhraseToFriend('${friendId}', ${idx})" class="btn btn-dark btn-sm text-left w-full mb-1" style="justify-content:flex-start; font-size:10.5px; padding:7px 10px; border-radius:8px;">
                <span style="opacity:0.6; font-size:9px; margin-right:6px;">[${p.cat}]</span> ${p.text}
            </button>
        `).join('');

        modal.innerHTML = `
            <div class="glass-card p-3 w-full" style="max-width:440px; border-radius:18px 18px 0 0; background:#0b1120; border-top:2px solid var(--cyan); max-height:80vh; display:flex; flex-direction:column;">
                <div class="flex-between mb-2">
                    <div>
                        <b class="text-xs color-cyan"><i class="fa-solid fa-comment-dots mr-1"></i> Сообщение для ${this._escapeHtml(friendName)}</b>
                        <div class="sub-label" style="font-size:8.5px;">Выберите заготовленную перекупскую фразу</div>
                    </div>
                    <button onclick="document.getElementById('modalQuickPhrasePicker')?.remove()" class="btn btn-dark btn-sm btn-auto" style="padding:4px 8px;">✕</button>
                </div>
                <div style="overflow-y:auto; flex:1; padding-right:2px;">
                    ${chipsHtml}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    };

    AppM.sendPhraseToFriend = async function(friendId, phraseIdx) {
        const phrase = QUICK_CHAT_PHRASES[phraseIdx]?.text;
        if (!phrase) return;

        document.getElementById('modalQuickPhrasePicker')?.remove();

        if (window.FB_FriendshipsManager?.sendQuickPhrase) {
            showToast('Отправка реплики...');
            const res = await window.FB_FriendshipsManager.sendQuickPhrase(friendId, phrase);
            if (res && res.success) {
                showToast('💬 Реплика доставлена!');
                if (typeof playSound === 'function') playSound('tick');
                this._renderFriendsScreen(document.getElementById('mSocialContentBox'));
            } else {
                showToast(`❌ Ошибка: ${res?.error || 'Не удалось отправить'}`);
            }
        }
    };

    // ========================================================
    // ПРЯМАЯ ПРОДАЖА АВТОМОБИЛЯ ДРУГУ (P2P ОФФЕР)
    // ========================================================
    AppM.openDirectOfferModal = function(friendId, friendName) {
        const garage = window.state?.garage || [];
        if (garage.length === 0) {
            return showToast('В вашем гараже нет машин для продажи!');
        }

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
                <div class="sub-label mb-2" style="font-size:9px;">Предложение появится у друга в уведомлениях. При покупке деньги поступят на ваш баланс.</div>

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
            showToast('Отправка оффера другу...');
            const res = await window.FB_FriendshipsManager.sendDirectCarOffer(friendId, car, price);
            if (res && res.success) {
                document.getElementById('modalDirectOfferFriend')?.remove();
                showToast('🤝 Оффер успешно отправлен!');
                if (typeof playSound === 'function') playSound('win');
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
                    <button onclick="switchTab('tabPhone'); setTimeout(() => PhoneManager.openApp('post'), 150);" class="btn btn-dark btn-sm w-full" style="justify-content:flex-start;">
                        <i class="fa-solid fa-boxes-packing color-amber mr-2"></i> Почта и Склад
                    </button>
                </div>
            </div>
        `;
    };

    console.log('[👥 phone-m-social v9.2.0] Социум + Взаимная дружба + Быстрые фразы + P2P Офферы ✓');
})();

// ========================================================
// js/phone/phone-m-social.js — M+ MESSENGER: ЛИЧНЫЕ ЧАТЫ И ОФФЕРЫ ДРУЗЬЯМ (v10.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v10.0.0 (ЧИСТЫЙ МОДУЛЬ ПЕРЕПИСКИ И СДЕЛОК В ЛИЧКЕ):
//   - Убран дублирующий функционал Социума, Клубов и Рейтинга (вынесены в экран «Жизнь»).
//   - Прямой диалог с другом: история переписки и быстрые перекупские фразы-чипсы.
//   - Интерактивная карточка продажи авто другу прямо в ленте сообщений.
//   - Полная интеграция с 3-секционной архитектурой AppM.
// ========================================================

(function() {
    'use strict';

    if (!window.AppM) {
        console.error('[💬 phone-m-social] AppM не загружен! Проверьте порядок: phone-m-core.js до phone-m-social.js');
        return;
    }

    const AppM = window.AppM;
    AppM._currentChatFriend = null;

    // Быстрые заготовки фраз перекупа для диалога с друзьями
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
    // 1. ОТКРЫТИЕ И РЕНДЕР ДИАЛОГА С ДРУГОМ
    // ========================================================
    AppM.openFriendChat = function(friendId, friendName) {
        this._currentChatFriend = { id: String(friendId), name: friendName };
        const myUid = String(window.state?.player?.uid || window.tgUserId || 'me');
        const dialogId = `dlg_friend_${[myUid, friendId].sort().join('_')}`;

        if (!window.state.player) window.state.player = {};
        if (!Array.isArray(window.state.player.phoneMessages)) window.state.player.phoneMessages = [];

        let dialog = window.state.player.phoneMessages.find(m => m && m.id === dialogId);
        if (!dialog) {
            dialog = {
                id: dialogId,
                category: 'friends',
                sender: friendName,
                senderName: friendName,
                avatar: '👤',
                friendId: String(friendId),
                unread: false,
                viewed: true,
                time: "Сейчас",
                chatHistory: []
            };
            window.state.player.phoneMessages.unshift(dialog);
            if (typeof saveState === 'function') saveState();
        }

        this.openDialog(dialogId);
    };

    // ========================================================
    // 2. ОТПРАВКА БЫСТРОЙ ФРАЗЫ В ЧАТ
    // ========================================================
    AppM.sendChatPhrase = function(dialogId, phraseIdx) {
        const phrase = QUICK_CHAT_PHRASES[phraseIdx];
        if (!phrase) return;

        const msg = (window.state?.player?.phoneMessages || []).find(m => m && m.id === dialogId);
        if (!msg) return;

        if (!Array.isArray(msg.chatHistory)) msg.chatHistory = [];
        msg.chatHistory.push({ from: 'me', text: phrase });
        msg.lastMessageAt = Date.now();
        msg.preview = phrase;

        if (typeof saveState === 'function') saveState();
        if (typeof playSound === 'function') playSound('tick');

        // Синхронизация через Firestore с реальным игроком
        if (msg.friendId && window.FB_FriendshipsManager?.sendQuickPhrase) {
            window.FB_FriendshipsManager.sendQuickPhrase(msg.friendId, phrase);
        }

        const box = document.getElementById('mChatScrollBox');
        if (box) {
            const div = document.createElement('div');
            div.className = 'chat-msg msg-player';
            div.style.marginBottom = '6px';
            div.innerText = phrase;
            box.appendChild(div);
            box.scrollTop = box.scrollHeight;
        }
    };

    // ========================================================
    // 3. МОДАЛКА ПРЯМОЙ ПРОДАЖИ АВТО ДРУГУ ИЗ ГАРАЖА
    // ========================================================
    AppM.openDirectOfferModal = function(friendId, friendName) {
        const garage = window.state?.garage || [];
        if (garage.length === 0) {
            return showToast('В гараже нет машин для предложения другу!');
        }

        const oldModal = document.getElementById('modalDirectOfferFriend');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.id = 'modalDirectOfferFriend';
        modal.className = 'modal-overlay active';
        modal.style.display = 'flex';
        modal.style.zIndex = '6000';

        const carOptions = garage.map((c, i) => `
            <option value="${i}">${c.name} (${c.power || 100} л.с. | ${c.plate || 'ТРАНЗИТ'})</option>
        `).join('');

        modal.innerHTML = `
            <div class="modal-box" style="max-width:390px; background:#070b14; border:1px solid var(--green); border-radius:14px; padding:14px;">
                <div class="flex-between mb-2">
                    <b class="text-xs color-green" style="font-size:12px;">
                        <i class="fa-solid fa-car-side mr-1"></i> Продать авто другу: ${this._escapeHtml(friendName)}
                    </b>
                    <button onclick="document.getElementById('modalDirectOfferFriend')?.remove()" class="btn btn-dark btn-auto btn-sm" style="padding:3px 7px;">✕</button>
                </div>
                <div class="sub-label mb-2" style="font-size:8.5px; color:#cbd5e1;">
                    Предложение появится в чате вашего друга в виде интерактивной карточки покупки.
                </div>

                <div class="mb-2">
                    <label class="sub-label block mb-1" style="font-size:8.5px;">Выберите автомобиль из гаража:</label>
                    <select id="directOfferCarSelect" class="chat-input" style="width:100%; font-size:11px; padding:7px;" onchange="AppM._onDirectCarSelected(this.value)">
                        ${carOptions}
                    </select>
                </div>

                <div class="mb-3">
                    <label class="sub-label block mb-1" style="font-size:8.5px;">Цена продажи (₽):</label>
                    <input type="number" id="directOfferPriceInput" class="chat-input font-bold color-green" style="width:100%; font-size:13px; padding:7px;" value="${garage[0]?.marketValue || garage[0]?.price || 150000}">
                </div>

                <div class="grid-2" style="gap:6px;">
                    <button onclick="document.getElementById('modalDirectOfferFriend')?.remove()" class="btn btn-dark btn-sm">
                        Отмена
                    </button>
                    <button onclick="AppM.confirmDirectOffer('${friendId}')" class="btn btn-green btn-sm font-bold">
                        Отправить оффер
                    </button>
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
        const myUid = String(window.state?.player?.uid || window.tgUserId || 'me');
        const dialogId = `dlg_friend_${[myUid, friendId].sort().join('_')}`;

        if (window.FB_FriendshipsManager?.sendDirectCarOffer) {
            showToast('Отправка предложения...');
            const res = await window.FB_FriendshipsManager.sendDirectCarOffer(friendId, car, price);
            if (res && res.success) {
                document.getElementById('modalDirectOfferFriend')?.remove();

                let dialog = window.state?.player?.phoneMessages?.find(m => m && m.id === dialogId);
                if (dialog) {
                    dialog.pendingOffer = {
                        offerId: res.offerId,
                        sellerId: myUid,
                        car: car,
                        price: price,
                        status: 'pending'
                    };
                    dialog.chatHistory.push({
                        from: 'me',
                        text: `«Предлагаю забрать мой ${car.name} за ${price.toLocaleString()} ₽. По рукам?»`
                    });
                    saveState();
                }

                showToast('🤝 Предложение отправлено в чат друга!');
                if (typeof playSound === 'function') playSound('win');
                this.openFriendChat(friendId, this._currentChatFriend?.name || 'Друг');
            } else {
                showToast(`❌ Ошибка: ${res?.error || 'Не удалось отправить'}`);
            }
        }
    };

    // ========================================================
    // 4. ДЕЙСТВИЯ С ОФФЕРОМ ВНУТРИ ЧАТА
    // ========================================================
    AppM.acceptDirectCarOfferInChat = async function(offerId) {
        if (!window.FB_NotificationsManager?.acceptDirectCarOffer) return;
        showToast('Оформление сделки...');
        const res = await window.FB_NotificationsManager.acceptDirectCarOffer(offerId);
        if (res && res.success) {
            showToast(`✅ «${res.carName}» в вашем автопарке!`);
            if (typeof playSound === 'function') playSound('win');
            this.switchMainTab('chats');
        } else {
            showToast(`❌ ${res?.error || 'Не удалось купить автомобиль'}`);
        }
    };

    AppM.haggleCarOfferInChat = function(friendId, offerId, currentPrice) {
        const discounted = Math.round(currentPrice * 0.9);
        const text = `Скинь 10% — готов забрать прямо сейчас за ${discounted.toLocaleString()} ₽!`;
        const myUid = String(window.state?.player?.uid || window.tgUserId || 'me');
        const dialogId = `dlg_friend_${[myUid, friendId].sort().join('_')}`;

        let dialog = window.state?.player?.phoneMessages?.find(m => m && m.id === dialogId);
        if (dialog) {
            if (!Array.isArray(dialog.chatHistory)) dialog.chatHistory = [];
            dialog.chatHistory.push({ from: 'me', text: text });
            dialog.preview = text;
            saveState();
        }

        if (window.FB_FriendshipsManager?.sendQuickPhrase) {
            window.FB_FriendshipsManager.sendQuickPhrase(friendId, text);
        }
        showToast('💬 Встречное предложение отправлено в переписку!');
        this.openFriendChat(friendId, this._currentChatFriend?.name || 'Друг');
    };

    AppM.rejectCarOfferInChat = async function(offerId) {
        if (window.FB_NotificationsManager?.rejectDirectCarOffer) {
            await window.FB_NotificationsManager.rejectDirectCarOffer(offerId);
        }
        showToast('Предложение отклонено');
        this.switchMainTab('chats');
    };

    console.log('[💬 phone-m-social v10.0.0] Чат с друзьями и прямые офферы авто адаптированы к M+ ✓');
})();

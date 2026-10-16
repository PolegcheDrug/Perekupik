// ========================================================
// js/notification-center.js — ЕДИНЫЙ ЦЕНТР УВЕДОМЛЕНИЙ (v1.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.1.0 (SPRINT 2 — P2P ТОРГ):
//   - ДОБАВЛЕНЫ 6 типов уведомлений:
//       p2p_offer_received  → новый оффер продавцу
//       p2p_offer_accepted  → оффер принят
//       p2p_offer_rejected  → оффер отклонён
//       p2p_offer_countered → встречное предложение
//       p2p_offer_cancelled → оффер отменён
//       p2p_offer_expired   → оффер истёк (30 мин)
//   - Хелпер _isAppOnScreen() для проверки активного экрана M+
//   - EventBus-эмиты: p2p:incoming_offer, p2p:offer_ui_update
// ⭐ v1.0.0 (ВЫДЕЛЕНО ИЗ app.js):
//   - NotificationCenter — единый обработчик уведомлений
//   - handleIncomingNotification — идемпотентная обработка
//   - processStartupNotifications — накопленные при старте
//   - ВСЕ типы уведомлений:
//       deal_payout       → продажа P2P (деньги в Почту)
//       trade_offer       → новый оффер обмена
//       trade_accepted    → ваш оффер принят
//       trade_rejected    → ваш оффер отклонён
//       friend_request    → заявка в друзья
//       friend_accepted   → заявка принята
//       new_message       → новое сообщение в чате
//       lot_bought        → ваш лот купили
//       lot_sold          → вы купили лот (деньги в Почту)
//   - Идемпотентность через state.player._processedNotifIds
//   - Интеграция с EventBus (notification:received, notification:handled)
//   - Экспорт в window.NotificationCenter
//
// ВАЖНО: файл подключается через <script src="js/notification-center.js"></script>
// НЕ является ES-модулем, загружается ПОСЛЕ firebase-p2p.js
// и ПОСЛЕ p2p-offers.js.
// ========================================================

(function() {
    'use strict';

    const NotificationCenter = {
        _processing: false,
        _maxHistoryIds: 200,

        /**
         * Централизованная обработка уведомления.
         * Идемпотентна — повторная обработка не производится.
         * @param {Object} notif — уведомление из Firestore
         * @returns {Promise<boolean>} — true, если обработано
         */
        async handleIncomingNotification(notif) {
            if (!notif || !notif.id) return false;
            if (!window.state) window.state = {};
            if (!window.state.player) window.state.player = {};

            // ⭐ Дедупликация: уже обрабатывали?
            if (!Array.isArray(window.state.player._processedNotifIds)) {
                window.state.player._processedNotifIds = [];
            }
            if (window.state.player._processedNotifIds.includes(notif.id)) {
                return false;
            }

            // Публикуем событие для всех подписчиков
            if (window.EventBus) {
                window.EventBus.emit('notification:received', { notif });
            }

            let handled = false;

            try {
                switch (notif.type) {
                    // === СУЩЕСТВУЮЩИЕ ТИПЫ ===
                    case 'deal_payout':
                        handled = this._handleDealPayout(notif);
                        break;
                    case 'trade_offer':
                        handled = this._handleTradeOffer(notif);
                        break;
                    case 'trade_accepted':
                        handled = this._handleTradeAccepted(notif);
                        break;
                    case 'trade_rejected':
                        handled = this._handleTradeRejected(notif);
                        break;
                    case 'friend_request':
                        handled = this._handleFriendRequest(notif);
                        break;
                    case 'friend_accepted':
                        handled = this._handleFriendAccepted(notif);
                        break;
                    case 'new_message':
                        handled = this._handleNewMessage(notif);
                        break;
                    case 'lot_bought':
                        handled = this._handleLotBought(notif);
                        break;
                    case 'lot_sold':
                        handled = this._handleLotSold(notif);
                        break;

                    // ⭐ v1.1.0: НОВЫЕ P2P ТИПЫ ===
                    case 'p2p_offer_received':
                        handled = this._handleP2POfferReceived(notif);
                        break;
                    case 'p2p_offer_accepted':
                        handled = this._handleP2POfferAccepted(notif);
                        break;
                    case 'p2p_offer_rejected':
                        handled = this._handleP2POfferRejected(notif);
                        break;
                    case 'p2p_offer_countered':
                        handled = this._handleP2POfferCountered(notif);
                        break;
                    case 'p2p_offer_cancelled':
                        handled = this._handleP2POfferCancelled(notif);
                        break;
                    case 'p2p_offer_expired':
                        handled = this._handleP2POfferExpired(notif);
                        break;

                    default:
                        console.log('[NotificationCenter] Неизвестный тип:', notif.type);
                        handled = true;
                }
            } catch (e) {
                console.error('[NotificationCenter] Ошибка обработки:', e);
                if (window.DevLogger) {
                    window.DevLogger.add('error', `NotificationCenter: ${e.message}`, { notifType: notif.type });
                }
            }

            // Помечаем как обработанное
            if (handled) {
                window.state.player._processedNotifIds.push(notif.id);
                if (window.state.player._processedNotifIds.length > this._maxHistoryIds) {
                    window.state.player._processedNotifIds = window.state.player._processedNotifIds.slice(-this._maxHistoryIds);
                }

                // Помечаем в Firestore
                if (window.FB_Bridge?.Notifications?.claimNotificationPayout) {
                    try {
                        await window.FB_Bridge.Notifications.claimNotificationPayout(notif.id);
                    } catch (e) {}
                }

                // Сохраняем и обновляем HUD
                if (typeof saveState === 'function') saveState();
                if (typeof updateHeaderUI === 'function') updateHeaderUI();

                // Событие
                if (window.EventBus) {
                    window.EventBus.emit('notification:handled', { notifId: notif.id, type: notif.type });
                }
            }

            return handled;
        },

        /**
         * Проверить, открыт ли сейчас экран M+ на конкретной вкладке.
         * @param {string} [tabName] — 'trade' | 'chats' | 'market' | null (любая вкладка M+)
         */
        _isAppOnScreen(tabName) {
            try {
                if (!window.AppM) return false;
                if (!window.PhoneManager) return false;
                if (window.PhoneManager.currentApp !== 'm') return false;
                if (tabName && window.AppM.activeTab !== tabName) return false;
                return true;
            } catch (e) {
                return false;
            }
        },

        /**
         * Форсированно обновить UI M+ (если открыт).
         */
        _refreshAppM() {
            try {
                if (!this._isAppOnScreen()) return;
                const container = document.getElementById('phoneAppContainer');
                if (container && window.AppM?.render) {
                    window.AppM.render(container);
                }
            } catch (e) {
                console.warn('[NotificationCenter] _refreshAppM error:', e);
            }
        },

        // ====================================================
        // ⭐ P2P ОФФЕР: НОВЫЙ ОФФЕР ОТ ПОКУПАТЕЛЯ (продавцу)
        // ====================================================
        _handleP2POfferReceived(notif) {
            const offerId = notif.offerId;
            const buyerName = notif.buyerName || 'Покупатель';
            const price = Number(notif.price) || 0;

            // Тост
            if (typeof showToast === 'function') {
                showToast(`💬 ${buyerName}: ${price.toLocaleString()} ₽ за «${notif.lotName || 'авто'}»`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            // EventBus — для UI-слоя
            if (window.EventBus) {
                window.EventBus.emit('p2p:incoming_offer', {
                    offerId,
                    lotId: notif.lotId,
                    lotName: notif.lotName,
                    buyerId: notif.buyerId,
                    buyerName,
                    price
                });
            }

            // Если открыт M+ → «Торг» — обновить список
            if (this._isAppOnScreen('trade')) {
                this._refreshAppM();
            }

            return true;
        },

        // ====================================================
        // ⭐ P2P ОФФЕР: ПРИНЯТ
        // ====================================================
        _handleP2POfferAccepted(notif) {
            const offerId = notif.offerId;
            const price = Number(notif.price) || 0;

            if (typeof showToast === 'function') {
                showToast(`✅ Сделка согласована: ${price.toLocaleString()} ₽!`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:offer_accepted', {
                    offerId,
                    lotId: notif.lotId,
                    price,
                    forUser: notif.toUser
                });
            }

            // Если открыт M+ → «Торг» — обновить UI
            if (this._isAppOnScreen('trade')) {
                this._refreshAppM();
            }

            // Если открыт чат этого оффера — перейти на экран ДКП
            // (это делает AppM через подписку RealtimeManager, а не отсюда)

            return true;
        },

        // ====================================================
        // ⭐ P2P ОФФЕР: ОТКЛОНЁН
        // ====================================================
        _handleP2POfferRejected(notif) {
            const offerId = notif.offerId;

            if (typeof showToast === 'function') {
                showToast(`❌ Продавец отклонил ваше предложение по «${notif.lotName || 'авто'}»`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('error');
                window.AudioFx.haptic('warning');
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:offer_rejected', {
                    offerId,
                    lotId: notif.lotId,
                    forUser: notif.toUser
                });
            }

            if (this._isAppOnScreen('trade')) {
                this._refreshAppM();
            }

            return true;
        },

        // ====================================================
        // ⭐ P2P ОФФЕР: ВСТРЕЧНОЕ ПРЕДЛОЖЕНИЕ
        // ====================================================
        _handleP2POfferCountered(notif) {
            const offerId = notif.offerId;
            const counterPrice = Number(notif.counterPrice) || 0;
            const sellerName = notif.sellerName || 'Продавец';

            if (typeof showToast === 'function') {
                showToast(`🔄 ${sellerName} предлагает ${counterPrice.toLocaleString()} ₽`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('medium');
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:offer_countered', {
                    offerId,
                    lotId: notif.lotId,
                    counterPrice,
                    sellerId: notif.sellerId,
                    sellerName,
                    forUser: notif.toUser
                });
            }

            if (this._isAppOnScreen('trade')) {
                this._refreshAppM();
            }

            return true;
        },

        // ====================================================
        // ⭐ P2P ОФФЕР: ОТМЕНЁН
        // ====================================================
        _handleP2POfferCancelled(notif) {
            const offerId = notif.offerId;

            if (typeof showToast === 'function') {
                showToast(`⛔ Торг по «${notif.lotName || 'авто'}» отменён`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('error');
                window.AudioFx.haptic('warning');
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:offer_cancelled', {
                    offerId,
                    lotId: notif.lotId,
                    forUser: notif.toUser
                });
            }

            if (this._isAppOnScreen('trade')) {
                this._refreshAppM();
            }

            return true;
        },

        // ====================================================
        // ⭐ P2P ОФФЕР: ИСТЁК (30 минут)
        // ====================================================
        _handleP2POfferExpired(notif) {
            const offerId = notif.offerId;

            if (typeof showToast === 'function') {
                showToast(`⌛ Срок торга по «${notif.lotName || 'авто'}» истёк`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('error');
                window.AudioFx.haptic('warning');
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:offer_expired', {
                    offerId,
                    lotId: notif.lotId,
                    forUser: notif.toUser
                });
            }

            if (this._isAppOnScreen('trade')) {
                this._refreshAppM();
            }

            return true;
        },

        // ====================================================
        // СУЩЕСТВУЮЩИЕ ОБРАБОТЧИКИ
        // ====================================================

        /**
         * ПРОДАЖА P2P — деньги в ПОЧТУ (не в карман).
         */
        _handleDealPayout(notif) {
            const amount = Number(notif.amount) || 0;
            if (amount <= 0) return false;

            // Кладём в Почту, а не на баланс
            if (typeof window.pushToMailbox === 'function') {
                window.pushToMailbox({
                    type: "cash",
                    amount: amount,
                    title: `Продажа P2P: ${notif.title || 'Лот'}`,
                    sender: "P2P Биржа M+",
                    desc: `Покупатель приобрёл ваш лот! Сумма к получению: ${amount.toLocaleString()} ₽. Комиссия биржи уже учтена.`,
                    badge: "P2P ВЫПЛАТА"
                });
            } else {
                // Fallback — если Почты нет, кладём сразу на баланс
                window.state.player.cash = (window.state.player.cash || 0) + amount;
            }

            if (typeof showToast === 'function') {
                showToast(`💰 Продажа P2P! +${amount.toLocaleString()} ₽ в Почту`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            // Убираем проданный лот из локального списка
            try {
                if (Array.isArray(window.state.p2pMarketListings)) {
                    window.state.p2pMarketListings = window.state.p2pMarketListings.filter(l =>
                        l && l.id !== notif.offerId && l.name !== notif.title
                    );
                }
                if (Array.isArray(window.state.myP2PListings)) {
                    window.state.myP2PListings = window.state.myP2PListings.filter(id => id !== notif.offerId);
                }
            } catch (e) {}

            return true;
        },

        /**
         * Новый оффер обмена.
         */
        _handleTradeOffer(notif) {
            if (!window.state.player.incomingTradeOffers) {
                window.state.player.incomingTradeOffers = [];
            }
            const exists = window.state.player.incomingTradeOffers.some(o => o.id === notif.offerId);
            if (!exists) {
                window.state.player.incomingTradeOffers.push({
                    id: notif.offerId,
                    title: notif.title,
                    text: notif.text,
                    timestamp: notif.timestamp
                });
            }

            if (typeof showToast === 'function') {
                showToast(`🤝 Новое предложение обмена!`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            // Обновляем вкладку «Трейд», если открыта
            if (window.AppM && window.AppM.activeTab === 'trade') {
                try { window.AppM._refreshTradeList(); } catch (e) {}
            }

            return true;
        },

        /**
         * Ваш оффер принят.
         */
        _handleTradeAccepted(notif) {
            if (typeof showToast === 'function') {
                showToast(`✅ Ваш оффер принят!`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            if (typeof openVerdictModal === 'function') {
                openVerdictModal(
                    "🤝 ОФФЕР ПРИНЯТ!",
                    `${notif.text || 'Игрок принял ваше предложение обмена.'}\nСвяжитесь для оформления сделки.`,
                    true
                );
            }

            return true;
        },

        /**
         * Ваш оффер отклонён.
         */
        _handleTradeRejected(notif) {
            if (typeof showToast === 'function') {
                showToast(`❌ Ваш оффер отклонён.`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('error');
                window.AudioFx.haptic('warning');
            }
            return true;
        },

        /**
         * Заявка в друзья.
         */
        _handleFriendRequest(notif) {
            if (!window.state.player.pendingFriendRequests) {
                window.state.player.pendingFriendRequests = [];
            }
            const exists = window.state.player.pendingFriendRequests.some(p => p.id === notif.fromUserId);
            if (!exists) {
                window.state.player.pendingFriendRequests.push({
                    id: notif.fromUserId,
                    name: notif.fromUserName || 'Перекуп',
                    timestamp: notif.timestamp
                });
            }

            if (typeof showToast === 'function') {
                showToast(`👋 Заявка в друзья от ${notif.fromUserName || 'игрока'}!`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            if (window.AppM && window.AppM.activeTab === 'friends') {
                try { window.AppM._refreshFriendsList(); } catch (e) {}
            }

            return true;
        },

        /**
         * Ваша заявка в друзья принята.
         */
        _handleFriendAccepted(notif) {
            if (!window.state.player.friendsList) window.state.player.friendsList = [];
            if (notif.fromUserId && !window.state.player.friendsList.includes(notif.fromUserId)) {
                window.state.player.friendsList.push(notif.fromUserId);
            }

            if (typeof showToast === 'function') {
                showToast(`✅ ${notif.fromUserName || 'Игрок'} принял вашу заявку!`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            // Форсируем сохранение в облако
            if (window.FB_Bridge?.Players?.pushSaveForce && window.tgUserId) {
                window.FB_Bridge.Players.pushSaveForce(window.tgUserId, window.state).catch(() => {});
            }

            return true;
        },

        /**
         * Новое сообщение в чате.
         */
        _handleNewMessage(notif) {
            if (!window.state.player) window.state.player = {};
            if (!Array.isArray(window.state.player.phoneMessages)) {
                window.state.player.phoneMessages = [];
            }

            const dialogId = notif.dialogId;
            if (!dialogId) return false;

            let msg = window.state.player.phoneMessages.find(m => m && m.id === dialogId);
            if (!msg) {
                msg = {
                    id: dialogId,
                    dialogId: dialogId,
                    category: 'chat',
                    sender: notif.fromUserName || 'Игрок',
                    time: "Сейчас",
                    unread: true,
                    viewed: false,
                    chatHistory: []
                };
                window.state.player.phoneMessages.unshift(msg);
            }

            msg.unread = true;
            if (!msg.chatHistory) msg.chatHistory = [];
            msg.chatHistory.push({
                from: 'them',
                text: notif.text || ''
            });
            msg.preview = notif.text || '';

            if (typeof PhoneManager !== 'undefined') {
                PhoneManager.updateUnreadBadge();
            }

            if (typeof showToast === 'function') {
                showToast(`💬 Новое сообщение от ${notif.fromUserName || 'игрока'}`);
            }

            return true;
        },

        /**
         * Ваш лот кто-то купил (уведомление покупателю/продавцу).
         */
        _handleLotBought(notif) {
            const amount = Number(notif.amount) || 0;
            if (amount <= 0) return false;

            try {
                if (Array.isArray(window.state.p2pMarketListings)) {
                    window.state.p2pMarketListings = window.state.p2pMarketListings.filter(l =>
                        l && l.id !== notif.offerId
                    );
                }
            } catch (e) {}

            if (typeof showToast === 'function') {
                showToast(`🔔 Лот продан: ${notif.title || ''}`);
            }

            return true;
        },

        /**
         * Вы купили лот (уведомление покупателю).
         */
        _handleLotSold(notif) {
            if (typeof showToast === 'function') {
                showToast(`🎉 Лот куплен: ${notif.title || ''}`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }
            return true;
        },

        /**
         * Обработать все накопленные уведомления при старте.
         */
        async processStartupNotifications() {
            if (!window.state.player) window.state.player = {};
            if (!Array.isArray(window.state.player._processedNotifIds)) {
                window.state.player._processedNotifIds = [];
            }

            if (!window.FB_Bridge?.Notifications?.fetchMyNotifications) return;
            if (!window.tgUserId) return;

            try {
                const notifs = await window.FB_Bridge.Notifications.fetchMyNotifications(window.tgUserId);
                if (!notifs || notifs.length === 0) return;

                console.log(`[NotificationCenter] Обработка ${notifs.length} стартовых уведомлений...`);
                for (const n of notifs) {
                    await this.handleIncomingNotification(n);
                }
            } catch (e) {
                console.warn('[NotificationCenter] Ошибка startup:', e);
            }
        },

        /**
         * Подписаться на real-time уведомления.
         * Возвращает unsubscribe.
         */
        subscribe() {
            if (!window.FB_Bridge?.Notifications?.subscribeToNotifications) return () => {};
            if (!window.tgUserId) return () => {};

            try {
                return window.FB_Bridge.Notifications.subscribeToNotifications(window.tgUserId, async (notifs) => {
                    if (!Array.isArray(notifs)) return;
                    for (const n of notifs) {
                        await this.handleIncomingNotification(n);
                    }
                });
            } catch (e) {
                console.warn('[NotificationCenter] subscribe error:', e);
                return () => {};
            }
        },

        /**
         * Очистить историю обработанных ID (для DEV).
         */
        resetProcessedIds() {
            if (window.state?.player) {
                window.state.player._processedNotifIds = [];
                if (typeof saveState === 'function') saveState();
            }
        }
    };

    // Экспорт
    window.NotificationCenter = NotificationCenter;

    console.log('[🔔 NotificationCenter v1.1.0] Единый центр уведомлений загружен. 6 типов P2P-офферов + существующие типы ✓');

})();

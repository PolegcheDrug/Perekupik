// ========================================================
// js/notification-center.js — ЕДИНЫЙ ЦЕНТР УВЕДОМЛЕНИЙ (v2.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v2.0.0 (SPRINT 1 — РЕДИЗАЙН P2P):
//   - УБРАНЫ обработчики p2p_offer_* (старая система p2p-offers.js)
//   - ДОБАВЛЕНЫ новые типы для P2PDeals:
//       • p2p_deal_created              — черновик ДКП создан
//       • p2p_deal_signed_by_counterparty — вторая сторона подписала
//       • p2p_deal_completed            — сделка закрыта
//       • p2p_deal_cancelled            — ДКП отменён
//       • p2p_deal_payout               — продавцу зачислены деньги
//       • p2p_deal_car_delivered        — покупателю доставлено авто
//   - Интеграция с P2PDKPModal: при уведомлении о подписи
//     автоматически открывает/обновляет модалку ДКП
//   - EventBus p2p:deal_* для UI-слоя
//   - Хелпер _openDealModalForNotification
//
// ⭐ v1.1.0:
//   - 6 типов P2P offer (устаревшие, заменены)
//   - Хелпер _isAppOnScreen
//   - EventBus-эмиты
//
// ⭐ v1.0.0:
//   - Единый обработчик всех уведомлений
//   - Идемпотентность через state.player._processedNotifIds
//   - processStartupNotifications, subscribe
//
// ВАЖНО: загружается ПОСЛЕ firebase-*, p2p-deals.js и p2p-deals-modal.js
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

            // Дедупликация
            if (!Array.isArray(window.state.player._processedNotifIds)) {
                window.state.player._processedNotifIds = [];
            }
            if (window.state.player._processedNotifIds.includes(notif.id)) {
                return false;
            }

            if (window.EventBus) {
                window.EventBus.emit('notification:received', { notif });
            }

            let handled = false;

            try {
                switch (notif.type) {
                    // === ЭКОНОМИКА ===
                    case 'deal_payout':
                        handled = this._handleDealPayout(notif);
                        break;
                    case 'lot_bought':
                        handled = this._handleLotBought(notif);
                        break;
                    case 'lot_sold':
                        handled = this._handleLotSold(notif);
                        break;

                    // === ⭐ v2.0.0: P2P ДКП ===
                    case 'p2p_deal_created':
                        handled = this._handleP2PDealCreated(notif);
                        break;
                    case 'p2p_deal_signed_by_counterparty':
                        handled = this._handleP2PDealSigned(notif);
                        break;
                    case 'p2p_deal_completed':
                        handled = this._handleP2PDealCompleted(notif);
                        break;
                    case 'p2p_deal_cancelled':
                        handled = this._handleP2PDealCancelled(notif);
                        break;
                    case 'p2p_deal_payout':
                        handled = this._handleP2PDealPayout(notif);
                        break;
                    case 'p2p_deal_car_delivered':
                        handled = this._handleP2PDealCarDelivered(notif);
                        break;

                    // === ДРУЗЬЯ ===
                    case 'friend_request':
                        handled = this._handleFriendRequest(notif);
                        break;
                    case 'friend_accepted':
                        handled = this._handleFriendAccepted(notif);
                        break;

                    // === ЧАТ ===
                    case 'new_message':
                        handled = this._handleNewMessage(notif);
                        break;

                    // === TRADE OFFERS (старые, обмен авто) ===
                    case 'trade_offer':
                        handled = this._handleTradeOffer(notif);
                        break;
                    case 'trade_accepted':
                        handled = this._handleTradeAccepted(notif);
                        break;
                    case 'trade_rejected':
                        handled = this._handleTradeRejected(notif);
                        break;

                    // ═══════════════════════════════════════
                    // ⭐ v2.0.0: СТАРЫЕ p2p_offer_* БОЛЬШЕ НЕ ОБРАБАТЫВАЮТСЯ
                    // (оставлены заглушки для старых непрочитанных уведомлений)
                    // ═══════════════════════════════════════
                    case 'p2p_offer_received':
                    case 'p2p_offer_accepted':
                    case 'p2p_offer_rejected':
                    case 'p2p_offer_countered':
                    case 'p2p_offer_cancelled':
                    case 'p2p_offer_expired':
                        handled = this._handleLegacyP2POffer(notif);
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

                if (window.FB_Bridge?.Notifications?.claimNotificationPayout) {
                    try {
                        await window.FB_Bridge.Notifications.claimNotificationPayout(notif.id);
                    } catch (e) {}
                }

                if (typeof saveState === 'function') saveState();
                if (typeof updateHeaderUI === 'function') updateHeaderUI();

                if (window.EventBus) {
                    window.EventBus.emit('notification:handled', { notifId: notif.id, type: notif.type });
                }
            }

            return handled;
        },

        /**
         * Проверить, открыт ли сейчас экран M+ на конкретной вкладке.
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
                if (!window.AppM) return;
                if (!window.PhoneManager) return;
                if (window.PhoneManager.currentApp !== 'm') return;
                const container = document.getElementById('phoneAppContainer');
                if (container && typeof window.AppM.render === 'function') {
                    window.AppM.render(container);
                }
            } catch (e) {
                console.warn('[NotificationCenter] _refreshAppM error:', e);
            }
        },

        /**
         * ⭐ v2.0.0: Открыть модалку ДКП, если открыт диалог или вкладка чатов.
         */
        _openDealModalForNotification(dealId, lotId) {
            if (!dealId) return;

            try {
                // Если игрок сейчас в чате — открываем модалку
                const isOnChats = this._isAppOnScreen('chats');
                if (isOnChats && window.P2PDKPModal) {
                    // Проверяем, не открыта ли уже эта модалка
                    const modal = document.getElementById('modalP2PDKP');
                    const alreadyOpen = modal && modal.classList.contains('active');

                    if (!alreadyOpen) {
                        // Небольшая задержка, чтобы тост/уведомление показались
                        setTimeout(() => {
                            try {
                                window.P2PDKPModal.open(dealId);
                            } catch (e) {
                                console.warn('[NotificationCenter] P2PDKPModal.open error:', e);
                            }
                        }, 800);
                    }
                }
            } catch (e) {
                console.warn('[NotificationCenter] _openDealModalForNotification error:', e);
            }
        },

        // ====================================================
        // ⭐ v2.0.0: P2P ДКП — ОБРАБОТЧИКИ
        // ====================================================

        /**
         * Черновик ДКП создан (для продавца).
         */
        _handleP2PDealCreated(notif) {
            const buyerName = notif.buyerName || 'Покупатель';
            const price = Number(notif.price) || 0;

            if (typeof showToast === 'function') {
                showToast(`📝 ${buyerName} оформил ДКП за ${price.toLocaleString()} ₽`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:deal_created_notif', {
                    dealId: notif.dealId,
                    lotId: notif.lotId,
                    buyerId: notif.buyerId,
                    buyerName,
                    price
                });
            }

            // Обновляем чаты
            this._refreshAppM();

            // Открываем модалку, если игрок в M+
            if (this._isAppOnScreen('chats')) {
                this._openDealModalForNotification(notif.dealId, notif.lotId);
            }

            return true;
        },

        /**
         * Вторая сторона подписала ДКП.
         */
        _handleP2PDealSigned(notif) {
            const price = Number(notif.price) || 0;

            if (typeof showToast === 'function') {
                showToast(`✍️ Ждут вашу подпись! ${price.toLocaleString()} ₽`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:deal_signed_notif', {
                    dealId: notif.dealId,
                    lotId: notif.lotId,
                    price
                });
            }

            this._refreshAppM();
            this._openDealModalForNotification(notif.dealId, notif.lotId);

            return true;
        },

        /**
         * Сделка полностью завершена.
         */
        _handleP2PDealCompleted(notif) {
            const price = Number(notif.price) || 0;
            const lotName = notif.title || 'авто';

            if (typeof showToast === 'function') {
                showToast(`🎉 Сделка закрыта: ${price.toLocaleString()} ₽`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:deal_completed_notif', {
                    dealId: notif.dealId,
                    lotId: notif.lotId,
                    price,
                    lotName
                });
            }

            this._refreshAppM();

            // Обновляем HUD (деньги могли измениться)
            if (typeof updateHeaderUI === 'function') updateHeaderUI();

            // Обновляем гараж, если открыт
            if (typeof renderGarage === 'function') renderGarage();

            return true;
        },

        /**
         * ДКП отменён.
         */
        _handleP2PDealCancelled(notif) {
            if (typeof showToast === 'function') {
                showToast(`⛔ ${notif.text || 'ДКП отменён'}`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('error');
                window.AudioFx.haptic('warning');
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:deal_cancelled_notif', {
                    dealId: notif.dealId,
                    lotId: notif.lotId
                });
            }

            this._refreshAppM();

            return true;
        },

        /**
         * Выплата продавцу (деньги зачислены в Почту).
         */
        _handleP2PDealPayout(notif) {
            const amount = Number(notif.amount) || 0;

            // Зачисляем деньги продавцу
            if (amount > 0) {
                window.state.player.cash = (window.state.player.cash || 0) + amount;
            }

            if (typeof showToast === 'function') {
                showToast(`💰 Выплата за P2P сделку: +${amount.toLocaleString()} ₽`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }
            if (typeof spawnFloatingReward === 'function') {
                spawnFloatingReward(`+${amount.toLocaleString()} ₽`);
            }

            // Логируем
            if (typeof logBankTransaction === 'function') {
                logBankTransaction('P2P продажа авто', amount, true);
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:deal_payout_notif', {
                    dealId: notif.dealId,
                    amount
                });
            }

            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            this._refreshAppM();

            return true;
        },

        /**
         * Авто доставлено покупателю (на платную парковку).
         */
        _handleP2PDealCarDelivered(notif) {
            if (typeof showToast === 'function') {
                showToast(`🚗 ${notif.text || 'Авто на парковке'}`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:deal_car_delivered_notif', {
                    dealId: notif.dealId,
                    lotId: notif.lotId
                });
            }

            // Обновляем парковку/гараж если открыты
            if (window.PhoneManager?.currentApp === 'post' && window.AppPost?.render) {
                const container = document.getElementById('phoneAppContainer');
                if (container) window.AppPost.render(container);
            }
            if (typeof renderGarage === 'function') renderGarage();

            this._refreshAppM();

            return true;
        },

        /**
         * ⭐ v2.0.0: Заглушка для старых p2p_offer_* уведомлений.
         * Они больше не создаются (система заменена), но если попадутся
         * старые непрочитанные — просто помечаем как обработанные.
         */
        _handleLegacyP2POffer(notif) {
            console.log('[NotificationCenter] Legacy P2P offer тип:', notif.type, '→ игнор');
            return true;
        },

        // ====================================================
        // СУЩЕСТВУЮЩИЕ ОБРАБОТЧИКИ
        // ====================================================

        /**
         * Продажа лота P2P (деньги в Почту — старая система).
         */
        _handleDealPayout(notif) {
            const amount = Number(notif.amount) || 0;
            if (amount <= 0) return false;

            if (typeof window.pushToMailbox === 'function') {
                window.pushToMailbox({
                    type: "cash",
                    amount: amount,
                    title: `Продажа P2P: ${notif.title || 'Лот'}`,
                    sender: "P2P Биржа M+",
                    desc: `Покупатель приобрёл ваш лот! Сумма: ${amount.toLocaleString()} ₽.`,
                    badge: "P2P ВЫПЛАТА"
                });
            } else {
                window.state.player.cash = (window.state.player.cash || 0) + amount;
            }

            if (typeof showToast === 'function') {
                showToast(`💰 Продажа P2P! +${amount.toLocaleString()} ₽`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            try {
                if (Array.isArray(window.state.p2pMarketListings)) {
                    window.state.p2pMarketListings = window.state.p2pMarketListings.filter(l =>
                        l && l.id !== notif.offerId && l.name !== notif.title
                    );
                }
            } catch (e) {}

            return true;
        },

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

            return true;
        },

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

            this._refreshAppM();
            return true;
        },

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

            if (window.FB_Bridge?.Players?.pushSaveForce && window.tgUserId) {
                window.FB_Bridge.Players.pushSaveForce(window.tgUserId, window.state).catch(() => {});
            }

            return true;
        },

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

    console.log('[🔔 NotificationCenter v2.0.0] SPRINT 1: новые типы p2p_deal_* + интеграция с P2PDKPModal ✓');
    console.log('[🔔 NotificationCenter] Старые p2p_offer_* обрабатываются как legacy (игнорируются) ✓');

})();
// ========================================================
// js/notification-center.js — ЕДИНЫЙ ЦЕНТР УВЕДОМЛЕНИЙ (v2.1.1)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v2.1.1 (P2P CAR DELIVERY DEBIT):
//   - ФИКС: _handleP2PDealCarDelivered теперь дебетует cash
//     покупателя и добавляет авто в гараж из meta.carData.
//     Раньше показывал только тост — покупатель получал
//     уведомление «авто ваше», но в гараже ничего не появлялось.
//     Срабатывает при сценарии «продавец принял оффер, покупатель
//     был оффлайн» — при следующем заходе покупателя в игру
//     processStartupNotifications подхватывает уведомление и
//     локально завершает сделку.
//
// ⭐ v2.1.0 (P2P TRADING REPAIR):
//   - ФИКС: p2p_offer_* больше НЕ игнорируются как legacy.
//     Добавлены реальные обработчики:
//       • p2p_offer_received  — продавцу приходит оффер
//       • p2p_offer_accepted  — продавец принял → покупателю
//       • p2p_offer_rejected  — отклонён
//       • p2p_offer_countered — встречное предложение
//       • p2p_offer_cancelled — отменён
//       • p2p_offer_expired   — истёк
//     Каждый показывает тост + эмитит EventBus.
//
//   - ДОБАВЛЕНО: _showIncomingOfferModal — минимальная модалка
//     ответа на оффер (Принять / Встречное / Отклонить) через
//     P2POffersManager.
//
//   - ФИКС: _handleNewMessage читает message || text и
//     dialogId || meta.dialogId. Раньше читал только text и
//     dialogId на верхнем уровне — а queueP2PNotification пишет
//     message в text, а dialogId в meta.dialogId.
//
//   - ФИКС: _handleDealPayout корректно начисляет деньги
//     напрямую в state.player.cash, если pushToMailbox недоступна.
//
//   - УДАЛЕНО: _handleLegacyP2POffer (больше не нужна).
//
// ⭐ v2.0.0 (SPRINT 1 — РЕДИЗАЙН P2P):
//   - Типы p2p_deal_* и интеграция с P2PDKPModal.
//
// ВАЖНО: загружается ПОСЛЕ firebase-*, p2p-deals.js и p2p-deals-modal.js
// ========================================================

(function() {
    'use strict';

    const NotificationCenter = {
        _processing: false,
        _maxHistoryIds: 200,

        async handleIncomingNotification(notif) {
            if (!notif || !notif.id) return false;
            if (!window.state) window.state = {};
            if (!window.state.player) window.state.player = {};

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

                    // === P2P ОФФЕРЫ (v2.1.0) ===
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

                    // === P2P ДКП (типы p2p_deal_*) ===
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

        _openDealModalForNotification(dealId, lotId) {
            if (!dealId) return;

            try {
                const isOnChats = this._isAppOnScreen('chats');
                if (isOnChats && window.P2PDKPModal) {
                    const modal = document.getElementById('modalP2PDKP');
                    const alreadyOpen = modal && modal.classList.contains('active');

                    if (!alreadyOpen) {
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
        // P2P ОФФЕРЫ — ОБРАБОТЧИКИ
        //
        // Данные приходят из P2PNotificationsManager.queueP2PNotification:
        //   notif.message  — текст
        //   notif.fromUser — ID отправителя
        //   notif.fromUserName
        //   notif.meta.offerId / lotId / carName / counterPrice
        // ====================================================

        _handleP2POfferReceived(notif) {
            const meta = notif.meta || {};
            const offerId = meta.offerId || notif.offerId;
            const carName = meta.carName || notif.title || 'Объект';
            const buyerName = notif.fromUserName || 'Покупатель';
            const offeredPrice = Number(meta.offeredPrice || meta.cash || notif.amount || 0);

            if (typeof showToast === 'function') {
                showToast(`🤝 ${buyerName}: ${offeredPrice.toLocaleString()} ₽ по «${carName}»`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:offer_received_notif', {
                    offerId,
                    lotId: meta.lotId || notif.lotId,
                    buyerId: notif.fromUser || notif.fromUserId,
                    buyerName,
                    carName,
                    offeredPrice,
                    notif
                });
            }

            this._refreshAppM();

            setTimeout(() => {
                this._showIncomingOfferModal(offerId, notif);
            }, 500);

            return true;
        },

        async _showIncomingOfferModal(offerId, notif) {
            if (!offerId) return;
            if (!window.P2POffersManager?.fetchOffer) {
                console.warn('[NotificationCenter] P2POffersManager не загружен — модалка оффера не открыта');
                return;
            }

            if (this._isAppOnScreen('chats')) return;

            let offer = null;
            try {
                offer = await window.P2POffersManager.fetchOffer(offerId);
            } catch (e) {
                console.warn('[NotificationCenter] fetchOffer error:', e);
                return;
            }

            if (!offer) {
                console.warn('[NotificationCenter] Оффер не найден:', offerId);
                return;
            }

            if (offer.status !== 'pending' && offer.status !== 'countered') {
                console.log('[NotificationCenter] Оффер уже неактуален:', offer.status);
                return;
            }

            const myProfile = (typeof window.FB_Bridge?.getProfile === 'function')
                ? window.FB_Bridge.getProfile()
                : null;
            const myUid = String(myProfile?.id || window.state?.player?.uid || '');

            if (String(offer.sellerId) !== myUid) {
                console.log('[NotificationCenter] Оффер не для текущего игрока');
                return;
            }

            let modal = document.getElementById('modalIncomingP2POffer');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'modalIncomingP2POffer';
                modal.className = 'modal-overlay';
                document.body.appendChild(modal);
            }

            const originalPrice = Number(offer.originalPrice) || 0;
            const offeredPrice = Number(offer.offeredPrice) || 0;
            const lotName = offer.lotName || 'Автомобиль';
            const buyerName = offer.buyerName || 'Покупатель';
            const buyerMessage = offer.buyerMessage || '';
            const round = offer.round || 1;

            modal.innerHTML = `
                <div class="modal-box" style="max-width: 420px; border-color: var(--cyan);">
                    <div class="flex-between mb-2">
                        <div class="modal-glow-badge" style="color:var(--cyan); border-color:var(--cyan);">
                            <i class="fa-solid fa-comments-dollar"></i> ВХОДЯЩЕЕ ПРЕДЛОЖЕНИЕ
                        </div>
                        <button onclick="ModalManager.close('modalIncomingP2POffer')" class="btn btn-dark btn-auto btn-sm">✕</button>
                    </div>

                    <div class="p-2 mb-2" style="background:#050914; border-radius:8px; border:1px solid rgba(0,242,254,0.3);">
                        <b class="text-xs color-cyan">${lotName}</b>
                        <div class="flex-between mt-2 text-xs">
                            <span class="sub-label">Цена лота:</span>
                            <b class="color-amber">${originalPrice.toLocaleString()} ₽</b>
                        </div>
                        <div class="flex-between mt-1 text-xs">
                            <span class="sub-label">Предложение покупателя:</span>
                            <b class="color-green" style="font-size:14px;">${offeredPrice.toLocaleString()} ₽</b>
                        </div>
                        <div class="flex-between mt-1 text-xs">
                            <span class="sub-label">Раунд:</span>
                            <b class="color-cyan">${round}</b>
                        </div>
                    </div>

                    <div class="p-2 mb-2" style="background:rgba(0,242,254,0.05); border-radius:8px; border-left:3px solid var(--cyan);">
                        <b class="text-xs color-cyan">${buyerName}:</b>
                        <div class="sub-label mt-1" style="font-size:10px; color:#f1f5f9;">
                            ${buyerMessage || '«Предлагаю указанную сумму, готов оформлять!»'}
                        </div>
                    </div>

                    <div class="grid-3 mb-2" style="gap:6px;">
                        <button onclick="window._p2pOfferAccept('${offerId}')" class="btn btn-green btn-sm font-bold" style="padding:8px 0;">
                            ✅ ПРИНЯТЬ
                        </button>
                        <button onclick="window._p2pOfferCounter('${offerId}', ${originalPrice})" class="btn btn-amber btn-sm font-bold" style="padding:8px 0;">
                            🔄 ВСТРЕЧНОЕ
                        </button>
                        <button onclick="window._p2pOfferReject('${offerId}')" class="btn btn-danger btn-sm font-bold" style="padding:8px 0;">
                            ❌ ОТКЛОНИТЬ
                        </button>
                    </div>

                    <button onclick="ModalManager.close('modalIncomingP2POffer')" class="btn btn-dark w-full btn-sm">
                        Закрыть (оффер останется активным)
                    </button>
                </div>
            `;

            window._p2pOfferAccept = async (oId) => {
                try {
                    const res = await window.P2POffersManager.acceptOffer(oId);
                    if (res.success) {
                        if (typeof showToast === 'function') showToast(`✅ Оффер принят: ${Number(res.price || 0).toLocaleString()} ₽`);
                        if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
                        ModalManager.close('modalIncomingP2POffer');
                        if (window.EventBus) window.EventBus.emit('p2p:offer_accepted_ui', { offerId: oId, price: res.price });
                    } else {
                        if (typeof showToast === 'function') showToast(`❌ ${res.error || 'Не удалось принять'}`);
                        if (window.AudioFx) window.AudioFx.play('error');
                    }
                } catch (e) {
                    if (typeof showToast === 'function') showToast(`❌ ${e.message}`);
                }
            };

            window._p2pOfferCounter = async (oId, maxPrice) => {
                const raw = prompt(`Встречная цена (макс. ${Number(maxPrice).toLocaleString()} ₽):`, String(Math.round(maxPrice * 0.95)));
                if (raw === null) return;
                const cp = parseInt(raw, 10);
                if (!cp || cp < 1000) return showToast('❌ Некорректная цена');

                try {
                    const res = await window.P2POffersManager.counterOffer(oId, cp, '');
                    if (res.success) {
                        if (typeof showToast === 'function') showToast(`🔄 Встречное: ${cp.toLocaleString()} ₽`);
                        if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
                        ModalManager.close('modalIncomingP2POffer');
                    } else {
                        if (typeof showToast === 'function') showToast(`❌ ${res.error || 'Не удалось'}`);
                    }
                } catch (e) {
                    if (typeof showToast === 'function') showToast(`❌ ${e.message}`);
                }
            };

            window._p2pOfferReject = async (oId) => {
                if (!confirm('Отклонить предложение покупателя?')) return;
                try {
                    const res = await window.P2POffersManager.rejectOffer(oId);
                    if (res.success) {
                        if (typeof showToast === 'function') showToast('❌ Оффер отклонён');
                        if (window.AudioFx) window.AudioFx.play('error');
                        ModalManager.close('modalIncomingP2POffer');
                    } else {
                        if (typeof showToast === 'function') showToast(`❌ ${res.error || 'Не удалось'}`);
                    }
                } catch (e) {
                    if (typeof showToast === 'function') showToast(`❌ ${e.message}`);
                }
            };

            if (window.ModalManager && typeof window.ModalManager.open === 'function') {
                window.ModalManager.open('modalIncomingP2POffer', { closeOthers: false });
            } else {
                modal.classList.add('active');
            }
            if (typeof playSound === 'function') playSound('tick');
        },

        _handleP2POfferAccepted(notif) {
            const meta = notif.meta || {};
            const carName = meta.carName || notif.title || 'Объект';
            const responder = notif.fromUserName || 'Продавец';

            if (typeof showToast === 'function') {
                showToast(`✅ ${responder} принял ваш оффер по «${carName}»!`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:offer_accepted_notif', {
                    offerId: meta.offerId || notif.offerId,
                    lotId: meta.lotId || notif.lotId,
                    responderName: responder,
                    notif
                });
            }

            this._refreshAppM();
            return true;
        },

        _handleP2POfferRejected(notif) {
            const meta = notif.meta || {};
            const carName = meta.carName || notif.title || 'Объект';

            if (typeof showToast === 'function') {
                showToast(`❌ Оффер по «${carName}» отклонён`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('error');
                window.AudioFx.haptic('warning');
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:offer_rejected_notif', {
                    offerId: meta.offerId || notif.offerId,
                    notif
                });
            }

            this._refreshAppM();
            return true;
        },

        _handleP2POfferCountered(notif) {
            const meta = notif.meta || {};
            const carName = meta.carName || notif.title || 'Объект';
            const counterPrice = Number(meta.counterPrice || 0);

            if (typeof showToast === 'function') {
                showToast(`🔄 Встречное предложение по «${carName}»: ${counterPrice.toLocaleString()} ₽`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:offer_countered_notif', {
                    offerId: meta.offerId || notif.offerId,
                    counterPrice,
                    notif
                });
            }

            this._refreshAppM();
            return true;
        },

        _handleP2POfferCancelled(notif) {
            const meta = notif.meta || {};
            const carName = meta.carName || notif.title || 'Объект';

            if (typeof showToast === 'function') {
                showToast(`⚠️ Оффер по «${carName}» отозван`);
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:offer_cancelled_notif', {
                    offerId: meta.offerId || notif.offerId,
                    notif
                });
            }

            this._refreshAppM();
            return true;
        },

        _handleP2POfferExpired(notif) {
            const meta = notif.meta || {};
            const carName = meta.carName || notif.title || 'Объект';

            if (typeof showToast === 'function') {
                showToast(`⌛ Оффер по «${carName}» истёк`);
            }

            if (window.EventBus) {
                window.EventBus.emit('p2p:offer_expired_notif', {
                    offerId: meta.offerId || notif.offerId,
                    notif
                });
            }

            return true;
        },

        // ====================================================
        // P2P ДКП — обработчики (типы p2p_deal_*)
        // ====================================================

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

            this._refreshAppM();

            if (this._isAppOnScreen('chats')) {
                this._openDealModalForNotification(notif.dealId, notif.lotId);
            }

            return true;
        },

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
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (typeof renderGarage === 'function') renderGarage();

            return true;
        },

        _handleP2PDealCancelled(notif) {
            if (typeof showToast === 'function') {
                showToast(`⛔ ${notif.message || notif.text || 'ДКП отменён'}`);
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

        _handleP2PDealPayout(notif) {
            const amount = Number(notif.amount) || 0;
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
         * ⭐ v2.1.1: Авто доставлено покупателю — списываем cash,
         * добавляем авто из meta.carData в гараж.
         *
         * Срабатывает при сценарии «продавец принял оффер,
         * покупатель был оффлайн» — при следующем заходе покупателя
         * в игру processStartupNotifications подхватывает уведомление
         * и локально завершает сделку.
         *
         * Если покупатель был онлайн и сам принял counter-offer —
         * p2p-offers.js v1.4.0 уже применил _applyBuyerSideCompletion,
         * и эта функция не вызывается (skipBuyerNotif: true).
         */
        _handleP2PDealCarDelivered(notif) {
            const meta = notif.meta || {};
            const carData = meta.carData;
            const finalPrice = Number(meta.finalPrice || notif.amount || 0);

            if (carData && carData.name) {
                try {
                    const player = window.state && window.state.player;
                    if (player) {
                        const cash = Number(player.cash) || 0;

                        if (cash >= finalPrice) {
                            player.cash = cash - finalPrice;

                            const car = Object.assign({}, carData);
                            car.uid = 'car_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
                            car.purchaseCost = finalPrice;
                            car.isPersonal = false;
                            car.impounded = false;
                            car.ownershipDays = 0;
                            car.insurance = null;
                            car.engineTemp = 90;
                            if (car.tireWear === undefined) car.tireWear = 100;
                            if (car.wear === undefined) car.wear = { engine: 85, transmission: 85 };

                            if (typeof window.ensureCarIdentity === 'function') window.ensureCarIdentity(car);

                            if (!Array.isArray(window.state.garage)) window.state.garage = [];
                            window.state.garage.push(car);

                            if (Array.isArray(window.state.p2pMarketListings) && meta.lotId) {
                                window.state.p2pMarketListings = window.state.p2pMarketListings.filter(l =>
                                    l && String(l.id || l.lot_id) !== String(meta.lotId)
                                );
                            }

                            if (typeof window.logBankTransaction === 'function') {
                                window.logBankTransaction(`P2P покупка: ${car.name}`, finalPrice, false);
                            }

                            if (typeof saveState === 'function') saveState();
                            if (typeof renderGarage === 'function') renderGarage();

                            console.log(`[NotificationCenter] ✅ P2P: ${car.name} за ${finalPrice} добавлен в гараж`);
                        } else {
                            console.warn(`[NotificationCenter] P2P car delivery: не хватает ${finalPrice - cash} ₽ для списания`);
                        }
                    }
                } catch (e) {
                    console.error('[NotificationCenter] P2P car delivery error:', e);
                }
            }

            if (typeof showToast === 'function') {
                showToast(`🚗 ${notif.message || notif.text || 'Авто доставлено'}`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }
            if (typeof updateHeaderUI === 'function') updateHeaderUI();

            if (window.EventBus) {
                window.EventBus.emit('p2p:deal_car_delivered_notif', {
                    dealId: notif.dealId,
                    lotId: notif.lotId || meta.lotId,
                    meta
                });
            }

            this._refreshAppM();
            return true;
        },

        // ====================================================
        // ЭКОНОМИКА
        // ====================================================

        _handleDealPayout(notif) {
            const amount = Number(notif.amount) || 0;
            if (amount <= 0) return false;

            let usedMailbox = false;
            try {
                if (typeof window.pushToMailbox === 'function') {
                    window.pushToMailbox({
                        type: "cash",
                        amount: amount,
                        title: `Продажа P2P: ${notif.title || 'Лот'}`,
                        sender: "P2P Биржа M+",
                        desc: `Покупатель приобрёл ваш лот! Сумма: ${amount.toLocaleString()} ₽.`,
                        badge: "P2P ВЫПЛАТА"
                    });
                    usedMailbox = true;
                }
            } catch (e) {
                console.warn('[NotificationCenter] pushToMailbox error:', e);
            }

            if (!usedMailbox) {
                window.state.player.cash = (window.state.player.cash || 0) + amount;
                if (typeof spawnFloatingReward === 'function') spawnFloatingReward(`+${amount.toLocaleString()} ₽`);
            }

            if (typeof showToast === 'function') {
                showToast(`💰 Продажа P2P! +${amount.toLocaleString()} ₽`);
            }
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }
            if (typeof logBankTransaction === 'function') {
                logBankTransaction(`P2P продажа: ${notif.title || 'Лот'}`, amount, true);
            }

            try {
                if (Array.isArray(window.state.p2pMarketListings)) {
                    const lotId = notif.lotId || notif.offerId;
                    window.state.p2pMarketListings = window.state.p2pMarketListings.filter(l => {
                        if (!l) return false;
                        const lid = l.id || l.lot_id;
                        if (lotId && String(lid) === String(lotId)) return false;
                        if (notif.title && l.name === notif.title) return false;
                        return true;
                    });
                }
            } catch (e) {}

            if (typeof updateHeaderUI === 'function') updateHeaderUI();

            if (window.EventBus) {
                window.EventBus.emit('p2p:payout_received', { amount, notif });
            }

            return true;
        },

        _handleLotBought(notif) {
            const amount = Number(notif.amount) || 0;
            if (amount <= 0) return false;

            try {
                if (Array.isArray(window.state.p2pMarketListings)) {
                    const lotId = notif.lotId || notif.offerId;
                    window.state.p2pMarketListings = window.state.p2pMarketListings.filter(l => {
                        if (!l) return false;
                        return String(l.id || l.lot_id) !== String(lotId);
                    });
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

        // ====================================================
        // TRADE OFFERS (обмен авто)
        // ====================================================

        _handleTradeOffer(notif) {
            if (!window.state.player.incomingTradeOffers) {
                window.state.player.incomingTradeOffers = [];
            }
            const exists = window.state.player.incomingTradeOffers.some(o => o.id === notif.offerId);
            if (!exists) {
                window.state.player.incomingTradeOffers.push({
                    id: notif.offerId,
                    title: notif.title,
                    text: notif.message || notif.text,
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
                    `${notif.message || notif.text || 'Игрок принял ваше предложение обмена.'}\nСвяжитесь для оформления сделки.`,
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

        // ====================================================
        // ДРУЗЬЯ
        // ====================================================

        _handleFriendRequest(notif) {
            const fromId = notif.fromUserId || notif.fromUser;
            if (!window.state.player.pendingFriendRequests) {
                window.state.player.pendingFriendRequests = [];
            }
            const exists = window.state.player.pendingFriendRequests.some(p => p.id === fromId);
            if (!exists) {
                window.state.player.pendingFriendRequests.push({
                    id: fromId,
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
            const fromId = notif.fromUserId || notif.fromUser;
            if (!window.state.player.friendsList) window.state.player.friendsList = [];
            if (fromId && !window.state.player.friendsList.includes(fromId)) {
                window.state.player.friendsList.push(fromId);
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

        // ====================================================
        // ЧАТ (читаем message || text, dialogId || meta.dialogId)
        // ====================================================

        _handleNewMessage(notif) {
            if (!window.state.player) window.state.player = {};
            if (!Array.isArray(window.state.player.phoneMessages)) {
                window.state.player.phoneMessages = [];
            }

            const meta = notif.meta || {};
            const dialogId = notif.dialogId || meta.dialogId;
            if (!dialogId) {
                console.warn('[NotificationCenter] new_message без dialogId — пропуск');
                return true;
            }

            const msgText = notif.message || notif.text || '';
            const fromName = notif.fromUserName || meta.senderName || 'Игрок';

            let msg = window.state.player.phoneMessages.find(m => m && m.id === dialogId);
            if (!msg) {
                msg = {
                    id: dialogId,
                    dialogId: dialogId,
                    category: 'chat',
                    sender: fromName,
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
                text: msgText
            });
            msg.preview = msgText;

            if (typeof PhoneManager !== 'undefined') {
                PhoneManager.updateUnreadBadge();
            }

            if (typeof showToast === 'function') {
                showToast(`💬 ${fromName}: ${String(msgText).substring(0, 60)}`);
            }

            if (window.EventBus) {
                window.EventBus.emit('chat:new_message_notif', {
                    dialogId,
                    fromName,
                    text: msgText,
                    notif
                });
            }

            return true;
        },

        // ====================================================
        // СТАРТ И ПОДПИСКА
        // ====================================================

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

        resetProcessedIds() {
            if (window.state?.player) {
                window.state.player._processedNotifIds = [];
                if (typeof saveState === 'function') saveState();
            }
        }
    };

    window.NotificationCenter = NotificationCenter;

    console.log('[🔔 NotificationCenter v2.1.1] ФИКС: _handleP2PDealCarDelivered дебетует cash + добавляет авто ✓');
    console.log('[🔔 NotificationCenter] p2p_offer_* реальные обработчики + _showIncomingOfferModal ✓');

})();
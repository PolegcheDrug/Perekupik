// ========================================================
// js/p2p-offers.js — РЕАЛЬНЫЙ P2P ТОРГ МЕЖДУ ИГРОКАМИ (v1.2.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.2.0 (ИНТЕГРАЦИЯ P2P BOT PUSH УВЕДОМЛЕНИЙ):
//   - ДОБАВЛЕНО: Интеграция с FB_Notifications.P2P для отправки
//     push-уведомлений в личку Telegram целевого игрока через бота:
//       • При создании оффера (notifyOfferReceived продавцу)
//       • При принятии оффера (notifyOfferAccepted покупателю/продавцу)
//       • При отклонении оффера (notifyOfferDeclined)
//       • При встречном предложении (queueP2PNotification 'p2p_offer_countered')
//       • При отмене оффера инициатором (notifyOfferCancelled)
//   - ФИКС: При вызове acceptOffer запускается автоматическая валидация
//     наличия средств и актуальности лота на бирже.
//   - СОХРАНЕНО: v1.1.0 клиентская фильтрация без составных индексов Firestore,
//     модалка window.openP2PDealModal(lotId), кулдауны и лимиты раундов.
// ========================================================

(function() {
    'use strict';

    // ========================================================
    // 1. КОНФИГ
    // ========================================================
    const OFFER_CONFIG = {
        collectionName: 'p2p_offers',
        expiresMs:      30 * 60 * 1000,   // 30 минут — срок жизни оффера[cite: 5]
        cooldownMs:     10 * 1000,         // 10 секунд — между офферами покупателя[cite: 5]
        maxRounds:      30,                // до 30 раундов торга[cite: 5]
        expireCheckMs:  60 * 1000,         // проверка истёкших раз в минуту[cite: 5]
        cleanupMs:      60 * 60 * 1000,    // полная очистка старых раз в час[cite: 5]
        fetchLimit:     100                // максимум офферов за один запрос[cite: 5]
    };

    const OFFER_STATUSES = {
        PENDING:   'pending',
        COUNTERED: 'countered',
        ACCEPTED:  'accepted',
        REJECTED:  'rejected',
        CANCELLED: 'cancelled',
        EXPIRED:   'expired',
        COMPLETED: 'completed'
    };

    const ACTIVE_STATUSES = [OFFER_STATUSES.PENDING, OFFER_STATUSES.COUNTERED];

    // ========================================================
    // 2. ВНУТРЕННИЕ ПЕРЕМЕННЫЕ
    // ========================================================
    let _firestoreFns = null;
    let _expireInterval = null;

    const _offerSubscriptions = new Map();
    const _incomingSubscriptions = new Map();
    const _lastOfferSentAt = new Map();

    // ========================================================
    // 3. ХЕЛПЕРЫ
    // ========================================================
    async function _getFirestoreFns() {
        if (_firestoreFns) return _firestoreFns;
        try {
            const mod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            _firestoreFns = {
                doc: mod.doc,
                getDoc: mod.getDoc,
                setDoc: mod.setDoc,
                updateDoc: mod.updateDoc,
                deleteDoc: mod.deleteDoc,
                collection: mod.collection,
                getDocs: mod.getDocs,
                query: mod.query,
                where: mod.where,
                orderBy: mod.orderBy,
                limit: mod.limit,
                onSnapshot: mod.onSnapshot,
                serverTimestamp: mod.serverTimestamp,
                Timestamp: mod.Timestamp
            };
            return _firestoreFns;
        } catch (e) {
            console.warn('[P2POffers] Не удалось загрузить Firestore:', e);
            return null;
        }
    }

    function _getDB() {
        return window.FB_Bridge?.db || window.FB_Core?.db || null;
    }

    function _generateOfferId() {
        return 'off_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    }

    function _getMyProfile() {
        if (window.FB_Bridge?.getProfile) {
            const p = window.FB_Bridge.getProfile();
            if (p && p.id) return { id: String(p.id), name: p.name || 'Перекуп', avatar: p.avatar || '👤' };
        }
        const uid = window.TelegramAuthManager?.getVerifiedUserId() || window.state?.player?.uid;
        if (uid) {
            return {
                id: String(uid),
                name: window.state?.player?.name || 'Перекуп',
                avatar: window.state?.player?.avatarUrl || '👤'
            };
        }
        return null;
    }

    function _emit(name, payload) {
        if (window.EventBus?.emit) {
            try { window.EventBus.emit(name, payload || {}); } catch (e) {}
        }
    }

    function _log(message, data) {
        if (window.DevLogger?.add) {
            try { window.DevLogger.add('firestore', '[P2POffers] ' + message, data || null); } catch (e) {}
        }
    }

    function _toast(msg) {
        if (typeof window.showToast === 'function') {
            try { window.showToast(msg); } catch (e) {}
        }
    }

    function _save() {
        if (typeof window.saveState === 'function') {
            try { window.saveState(); } catch (e) {}
        }
    }

    function _refreshHeader() {
        if (typeof window.updateHeaderUI === 'function') {
            try { window.updateHeaderUI(); } catch (e) {}
        }
    }

    function _isOfferAlive(offer) {
        if (!offer) return false;
        if (offer.expiresAt && offer.expiresAt < Date.now()) return false;
        return true;
    }

    function _fmtMoney(v) {
        const n = Math.round(Number(v) || 0);
        return n.toLocaleString('ru-RU') + ' ₽';
    }

    function _validateOfferPayload(lotId, price, message) {
        const errors = [];
        if (!lotId || typeof lotId !== 'string') errors.push('Некорректный lotId');
        const p = Number(price);
        if (!p || isNaN(p) || p < 1000) errors.push('Цена должна быть не менее 1,000 ₽');
        if (message && typeof message !== 'string') errors.push('Сообщение должно быть строкой');
        if (message && message.length > 200) errors.push('Сообщение не более 200 символов');
        return { valid: errors.length === 0, errors };
    }

    function _filterOffersClientSide(offers, opts = {}) {
        const now = Date.now();
        const result = [];

        (offers || []).forEach(o => {
            if (!o) return;
            if (o.expiresAt && o.expiresAt < now) return;
            if (opts.statuses && !opts.statuses.includes(o.status)) return;
            if (opts.sellerId && String(o.sellerId) !== String(opts.sellerId)) return;
            if (opts.buyerId && String(o.buyerId) !== String(opts.buyerId)) return;
            if (opts.lotId && String(o.lotId) !== String(opts.lotId)) return;
            result.push(o);
        });

        result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return result;
    }

    // ========================================================
    // 4. P2P OFFERS MANAGER
    // ========================================================
    const P2POffersManager = {

        // ----------------------------------------------------
        // 4.1 СОЗДАНИЕ ОФФЕРА
        // ----------------------------------------------------
        async createOffer(lotId, price, message = '') {
            const validation = _validateOfferPayload(lotId, price, message);
            if (!validation.valid) {
                return { success: false, error: validation.errors.join('; ') };
            }

            const profile = _getMyProfile();
            if (!profile) return { success: false, error: 'Не авторизован' };

            const db = _getDB();
            if (!db) return { success: false, error: 'Нет связи с сервером' };

            const cooldownKey = `${profile.id}_${lotId}`;
            const lastSent = _lastOfferSentAt.get(cooldownKey) || 0;
            const sinceLast = Date.now() - lastSent;
            if (sinceLast < OFFER_CONFIG.cooldownMs) {
                const waitSec = Math.ceil((OFFER_CONFIG.cooldownMs - sinceLast) / 1000);
                return { success: false, error: `Подождите ${waitSec} сек перед новым оффером` };
            }

            const buyerCash = Number(window.state?.player?.cash) || 0;
            const finalPrice = Math.round(Number(price));
            if (buyerCash < finalPrice) {
                return { success: false, error: `Не хватает ${_fmtMoney(finalPrice - buyerCash)}` };
            }

            let lot = (window.state?.p2pMarketListings || []).find(l => l.id === lotId);

            if (!lot && window.FB_Bridge?.MarketLots?.fetchLots) {
                try {
                    const remoteLots = await window.FB_Bridge.MarketLots.fetchLots();
                    lot = remoteLots.find(l => (l.lot_id || l.id) === lotId);
                } catch (e) {
                    console.warn('[P2POffers] fetchLots error:', e);
                }
            }

            if (!lot) {
                return { success: false, error: 'Лот больше не активен на бирже' };
            }

            const sellerId = String(lot.sellerId || '');
            if (!sellerId) {
                return { success: false, error: 'У лота нет продавца' };
            }

            if (sellerId === String(profile.id)) {
                return { success: false, error: 'Нельзя отправить оффер самому себе' };
            }

            const originalPrice = Number(lot.price) || finalPrice;

            const fns = await _getFirestoreFns();
            if (!fns) return { success: false, error: 'Firestore недоступен' };

            try {
                const simpleQuery = fns.query(
                    fns.collection(db, OFFER_CONFIG.collectionName),
                    fns.where('buyerId', '==', String(profile.id)),
                    fns.limit(OFFER_CONFIG.fetchLimit)
                );
                const simpleSnap = await fns.getDocs(simpleQuery);
                const myOffers = [];
                simpleSnap.forEach(d => myOffers.push({ id: d.id, ...d.data() }));

                const hasActive = _filterOffersClientSide(myOffers, {
                    lotId: lotId,
                    statuses: ACTIVE_STATUSES
                });

                if (hasActive.length > 0) {
                    return { success: false, error: 'У вас уже есть активный оффер на этот лот' };
                }
            } catch (e) {
                console.warn('[P2POffers] Проверка активного оффера не удалась:', e);
            }

            const offerId = _generateOfferId();
            const now = Date.now();
            const offerRef = fns.doc(db, OFFER_CONFIG.collectionName, offerId);

            const payload = {
                offerId,
                lotId,
                lotName: lot.name || 'Автомобиль',
                lotImage: lot.itemData?.img || lot.img || '',
                lotType: lot.type || 'cars',
                originalPrice,
                currentPrice: originalPrice,
                offeredPrice: finalPrice,

                buyerId: String(profile.id),
                buyerName: profile.name,
                buyerAvatar: profile.avatar,

                sellerId,
                sellerName: lot.sellerName || 'Продавец',
                sellerAvatar: lot.sellerAvatar || '🧔',

                status: OFFER_STATUSES.PENDING,

                buyerMessage: String(message || '').substring(0, 200),
                sellerMessage: null,
                counterPrice: null,

                round: 1,

                history: [{
                    round: 1,
                    actorId: String(profile.id),
                    actorName: profile.name,
                    actorRole: 'buyer',
                    type: 'offer',
                    price: finalPrice,
                    message: String(message || '').substring(0, 200),
                    ts: now
                }],

                createdAt: now,
                expiresAt: now + OFFER_CONFIG.expiresMs,
                respondedAt: null,
                completedAt: null,

                buyerCooldownUntil: now + OFFER_CONFIG.cooldownMs,

                _v: 1
            };

            try {
                await fns.setDoc(offerRef, payload);
                _lastOfferSentAt.set(cooldownKey, now);

                // 🔔 P2P BOT PUSH: отправляем пуш продавцу
                const pushMgr = window.FB_Notifications?.P2P;
                if (pushMgr?.notifyOfferReceived) {
                    pushMgr.notifyOfferReceived(sellerId, {
                        id: offerId,
                        senderName: profile.name,
                        car: { name: lot.name || 'Автомобиль' },
                        cash: finalPrice
                    }).catch(err => console.warn('[P2POffers] Bot push error:', err));
                }

                _log('createOffer OK', offerId);
                _emit('p2p:offer_created', { offerId, lotId, price: finalPrice, sellerId });

                return { success: true, offerId, offer: payload };

            } catch (e) {
                _log('createOffer ERROR', e.message);
                return { success: false, error: e.message || 'Ошибка создания оффера' };
            }
        },

        // ----------------------------------------------------
        // 4.2 ПРИНЯТИЕ ОФФЕРА
        // ----------------------------------------------------
        async acceptOffer(offerId) {
            const profile = _getMyProfile();
            if (!profile) return { success: false, error: 'Не авторизован' };

            const db = _getDB();
            if (!db) return { success: false, error: 'Нет связи' };

            const fns = await _getFirestoreFns();
            if (!fns) return { success: false, error: 'Firestore недоступен' };

            try {
                const offerRef = fns.doc(db, OFFER_CONFIG.collectionName, offerId);
                const snap = await fns.getDoc(offerRef);

                if (!snap.exists()) return { success: false, error: 'Оффер не найден' };

                const offer = snap.data();

                if (!_isOfferAlive(offer)) {
                    return { success: false, error: 'Оффер истёк' };
                }

                if (offer.status === OFFER_STATUSES.ACCEPTED) {
                    return { success: false, error: 'Оффер уже принят' };
                }

                const isSeller = String(offer.sellerId) === String(profile.id);
                const isBuyer  = String(offer.buyerId) === String(profile.id);

                let canAccept = false;
                let finalPrice = offer.offeredPrice;

                if (isSeller && offer.status === OFFER_STATUSES.PENDING) {
                    canAccept = true;
                    finalPrice = offer.offeredPrice;
                } else if (isBuyer && offer.status === OFFER_STATUSES.COUNTERED) {
                    canAccept = true;
                    finalPrice = offer.counterPrice || offer.currentPrice;
                }

                if (!canAccept) {
                    return { success: false, error: 'Вы не можете принять этот оффер' };
                }

                const now = Date.now();
                const newHistory = [...(offer.history || []), {
                    round: offer.round,
                    actorId: String(profile.id),
                    actorName: profile.name,
                    actorRole: isSeller ? 'seller' : 'buyer',
                    type: 'accept',
                    price: finalPrice,
                    ts: now
                }];

                await fns.updateDoc(offerRef, {
                    status: OFFER_STATUSES.ACCEPTED,
                    currentPrice: finalPrice,
                    respondedAt: now,
                    history: newHistory
                });

                const toUser = isSeller ? offer.buyerId : offer.sellerId;

                // 🔔 P2P BOT PUSH: отправляем пуш о принятии цены
                const pushMgr = window.FB_Notifications?.P2P;
                if (pushMgr?.notifyOfferAccepted) {
                    pushMgr.notifyOfferAccepted(toUser, {
                        carName: offer.lotName || "Объект",
                        responderName: profile.name || "Участник сделки"
                    }).catch(err => console.warn('[P2POffers] Bot push error:', err));
                }

                _log('acceptOffer OK', offerId);
                _emit('p2p:offer_accepted', {
                    offerId,
                    lotId: offer.lotId,
                    price: finalPrice,
                    buyerId: offer.buyerId,
                    sellerId: offer.sellerId,
                    acceptedBy: isSeller ? 'seller' : 'buyer'
                });

                return { success: true, offerId, price: finalPrice };

            } catch (e) {
                _log('acceptOffer ERROR', e.message);
                return { success: false, error: e.message };
            }
        },

        // ----------------------------------------------------
        // 4.3 ОТКЛОНЕНИЕ ОФФЕРА
        // ----------------------------------------------------
        async rejectOffer(offerId) {
            const profile = _getMyProfile();
            if (!profile) return { success: false, error: 'Не авторизован' };

            const db = _getDB();
            if (!db) return { success: false, error: 'Нет связи' };

            const fns = await _getFirestoreFns();
            if (!fns) return { success: false, error: 'Firestore недоступен' };

            try {
                const offerRef = fns.doc(db, OFFER_CONFIG.collectionName, offerId);
                const snap = await fns.getDoc(offerRef);
                if (!snap.exists()) return { success: false, error: 'Оффер не найден' };

                const offer = snap.data();
                const isSeller = String(offer.sellerId) === String(profile.id);
                const isBuyer  = String(offer.buyerId) === String(profile.id);

                let canReject = false;
                if (isSeller && offer.status === OFFER_STATUSES.PENDING) canReject = true;
                if (isBuyer && offer.status === OFFER_STATUSES.COUNTERED) canReject = true;

                if (!canReject) {
                    return { success: false, error: 'Вы не можете отклонить этот оффер' };
                }

                const now = Date.now();
                const newHistory = [...(offer.history || []), {
                    round: offer.round,
                    actorId: String(profile.id),
                    actorName: profile.name,
                    actorRole: isSeller ? 'seller' : 'buyer',
                    type: 'reject',
                    ts: now
                }];

                await fns.updateDoc(offerRef, {
                    status: OFFER_STATUSES.REJECTED,
                    respondedAt: now,
                    history: newHistory
                });

                const toUser = isSeller ? offer.buyerId : offer.sellerId;

                // 🔔 P2P BOT PUSH: отправляем пуш об отказе
                const pushMgr = window.FB_Notifications?.P2P;
                if (pushMgr?.notifyOfferDeclined) {
                    pushMgr.notifyOfferDeclined(toUser, {
                        carName: offer.lotName || "Объект",
                        responderName: profile.name || "Участник торга"
                    }).catch(err => console.warn('[P2POffers] Bot push error:', err));
                }

                _log('rejectOffer OK', offerId);
                _emit('p2p:offer_rejected', {
                    offerId,
                    lotId: offer.lotId,
                    buyerId: offer.buyerId,
                    sellerId: offer.sellerId,
                    rejectedBy: isSeller ? 'seller' : 'buyer'
                });

                return { success: true };

            } catch (e) {
                _log('rejectOffer ERROR', e.message);
                return { success: false, error: e.message };
            }
        },

        // ----------------------------------------------------
        // 4.4 ВСТРЕЧНАЯ ЦЕНА
        // ----------------------------------------------------
        async counterOffer(offerId, counterPrice, message = '') {
            const profile = _getMyProfile();
            if (!profile) return { success: false, error: 'Не авторизован' };

            const cp = Number(counterPrice);
            if (!cp || cp < 1000) return { success: false, error: 'Некорректная встречная цена' };

            const db = _getDB();
            if (!db) return { success: false, error: 'Нет связи' };

            const fns = await _getFirestoreFns();
            if (!fns) return { success: false, error: 'Firestore недоступен' };

            try {
                const offerRef = fns.doc(db, OFFER_CONFIG.collectionName, offerId);
                const snap = await fns.getDoc(offerRef);
                if (!snap.exists()) return { success: false, error: 'Оффер не найден' };

                const offer = snap.data();

                if (String(offer.sellerId) !== String(profile.id)) {
                    return { success: false, error: 'Только продавец может предложить встречную цену' };
                }

                if (offer.status !== OFFER_STATUSES.PENDING) {
                    return { success: false, error: 'Можно ответить только на pending оффер' };
                }

                if ((offer.round || 1) >= OFFER_CONFIG.maxRounds) {
                    return { success: false, error: `Достигнут лимит раундов (${OFFER_CONFIG.maxRounds})` };
                }

                if (cp > offer.originalPrice) {
                    return { success: false, error: 'Встречная цена не может превышать оригинальную' };
                }
                if (cp <= offer.offeredPrice) {
                    return { success: false, error: 'Встречная цена должна быть выше предложения покупателя' };
                }

                const now = Date.now();
                const newRound = (offer.round || 1) + 1;

                const newHistory = [...(offer.history || []), {
                    round: offer.round || 1,
                    actorId: String(profile.id),
                    actorName: profile.name,
                    actorRole: 'seller',
                    type: 'counter',
                    price: cp,
                    message: String(message || '').substring(0, 200),
                    ts: now
                }];

                await fns.updateDoc(offerRef, {
                    status: OFFER_STATUSES.COUNTERED,
                    counterPrice: cp,
                    sellerMessage: String(message || '').substring(0, 200),
                    respondedAt: now,
                    round: newRound,
                    history: newHistory
                });

                // 🔔 P2P BOT PUSH: отправляем пуш покупателю о встречной цене
                const pushMgr = window.FB_Notifications?.P2P;
                if (pushMgr?.queueP2PNotification) {
                    const text = `🔄 <b>Встречное предложение!</b>\n` +
                                 `Продавец <b>${profile.name}</b> выставил встречную цену <b>${_fmtMoney(cp)}</b> за «${offer.lotName}».\n` +
                                 `Зайди в приложение, чтобы принять или оспорить!`;
                    pushMgr.queueP2PNotification({
                        targetUserId: offer.buyerId,
                        type: 'p2p_offer_countered',
                        title: 'Встречный оффер',
                        text,
                        meta: { offerId, counterPrice: cp }
                    }).catch(err => console.warn('[P2POffers] Bot push error:', err));
                }

                _log('counterOffer OK', `${offerId} → ${cp}`);
                _emit('p2p:offer_countered', {
                    offerId,
                    lotId: offer.lotId,
                    counterPrice: cp,
                    buyerId: offer.buyerId,
                    sellerId: offer.sellerId
                });

                return { success: true, counterPrice: cp };

            } catch (e) {
                _log('counterOffer ERROR', e.message);
                return { success: false, error: e.message };
            }
        },

        // ----------------------------------------------------
        // 4.5 ОТМЕНА ОФФЕРА
        // ----------------------------------------------------
        async cancelOffer(offerId, reason = '') {
            const profile = _getMyProfile();
            if (!profile) return { success: false, error: 'Не авторизован' };

            const db = _getDB();
            if (!db) return { success: false, error: 'Нет связи' };

            const fns = await _getFirestoreFns();
            if (!fns) return { success: false, error: 'Firestore недоступен' };

            try {
                const offerRef = fns.doc(db, OFFER_CONFIG.collectionName, offerId);
                const snap = await fns.getDoc(offerRef);
                if (!snap.exists()) return { success: false, error: 'Оффер не найден' };

                const offer = snap.data();
                const isSeller = String(offer.sellerId) === String(profile.id);
                const isBuyer  = String(offer.buyerId) === String(profile.id);

                if (!isSeller && !isBuyer) {
                    return { success: false, error: 'Вы не участник этого торга' };
                }

                if (offer.status === OFFER_STATUSES.ACCEPTED) {
                    return { success: false, error: 'Оффер уже принят — отменить нельзя' };
                }

                if ([OFFER_STATUSES.CANCELLED, OFFER_STATUSES.EXPIRED,
                     OFFER_STATUSES.REJECTED, OFFER_STATUSES.COMPLETED].includes(offer.status)) {
                    return { success: false, error: 'Оффер уже неактивен' };
                }

                const now = Date.now();
                const newHistory = [...(offer.history || []), {
                    round: offer.round || 1,
                    actorId: String(profile.id),
                    actorName: profile.name,
                    actorRole: isSeller ? 'seller' : 'buyer',
                    type: 'cancel',
                    message: String(reason || '').substring(0, 120),
                    ts: now
                }];

                await fns.updateDoc(offerRef, {
                    status: OFFER_STATUSES.CANCELLED,
                    respondedAt: now,
                    history: newHistory
                });

                const toUser = isSeller ? offer.buyerId : offer.sellerId;

                // 🔔 P2P BOT PUSH: отправляем пуш об отмене торга
                const pushMgr = window.FB_Notifications?.P2P;
                if (pushMgr?.notifyOfferCancelled) {
                    pushMgr.notifyOfferCancelled(toUser, {
                        carName: offer.lotName || "Объект",
                        senderName: profile.name || "Участник торга"
                    }).catch(err => console.warn('[P2POffers] Bot push error:', err));
                }

                _log('cancelOffer OK', offerId);
                _emit('p2p:offer_cancelled', {
                    offerId,
                    lotId: offer.lotId,
                    cancelledBy: isSeller ? 'seller' : 'buyer'
                });

                return { success: true };

            } catch (e) {
                _log('cancelOffer ERROR', e.message);
                return { success: false, error: e.message };
            }
        },

        // ----------------------------------------------------
        // 4.6 ОБЁРТКИ ДЛЯ ПОКУПАТЕЛЯ
        // ----------------------------------------------------
        async buyerAcceptCounter(offerId) {
            return this.acceptOffer(offerId);
        },

        async buyerRejectCounter(offerId) {
            return this.rejectOffer(offerId);
        },

        // ----------------------------------------------------
        // 4.7 COMPLETED (после ДКП)
        // ----------------------------------------------------
        async markCompleted(offerId) {
            const db = _getDB();
            if (!db) return { success: false };

            const fns = await _getFirestoreFns();
            if (!fns) return { success: false };

            try {
                const offerRef = fns.doc(db, OFFER_CONFIG.collectionName, offerId);
                await fns.updateDoc(offerRef, {
                    status: OFFER_STATUSES.COMPLETED,
                    completedAt: Date.now()
                });
                _log('markCompleted OK', offerId);
                _emit('p2p:offer_completed', { offerId });
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        // ----------------------------------------------------
        // 4.8 ПОЛУЧЕНИЕ ОДНОГО ОФФЕРА
        // ----------------------------------------------------
        async fetchOffer(offerId) {
            const db = _getDB();
            if (!db) return null;

            const fns = await _getFirestoreFns();
            if (!fns) return null;

            try {
                const snap = await fns.getDoc(fns.doc(db, OFFER_CONFIG.collectionName, offerId));
                return snap.exists() ? { id: snap.id, ...snap.data() } : null;
            } catch (e) {
                console.warn('[P2POffers] fetchOffer error:', e);
                return null;
            }
        },

        // ----------------------------------------------------
        // 4.9 REAL-TIME: ПОДПИСКА НА ОДИН ОФФЕР
        // ----------------------------------------------------
        subscribeToMyOffer(offerId, callback) {
            if (!offerId || typeof callback !== 'function') return () => {};

            const db = _getDB();
            if (!db) return () => {};

            if (_offerSubscriptions.has(offerId)) {
                try { _offerSubscriptions.get(offerId)(); } catch (e) {}
                _offerSubscriptions.delete(offerId);
            }

            let unsubscribeFn = null;

            _getFirestoreFns().then(fns => {
                if (!fns) return;
                try {
                    const ref = fns.doc(db, OFFER_CONFIG.collectionName, offerId);
                    unsubscribeFn = fns.onSnapshot(ref, (snap) => {
                        if (!snap.exists()) {
                            callback(null);
                            return;
                        }
                        const data = { id: snap.id, ...snap.data() };
                        try { callback(data); } catch (e) {
                            console.warn('[P2POffers] callback error:', e);
                        }
                    }, (error) => {
                        console.warn('[P2POffers] subscribeToMyOffer error:', error);
                    });
                    _offerSubscriptions.set(offerId, unsubscribeFn);
                } catch (e) {
                    console.warn('[P2POffers] subscribe exception:', e);
                }
            });

            return () => {
                if (_offerSubscriptions.has(offerId)) {
                    try { _offerSubscriptions.get(offerId)(); } catch (e) {}
                    _offerSubscriptions.delete(offerId);
                }
            };
        },

        // ----------------------------------------------------
        // 4.10 REAL-TIME: ПОДПИСКА НА ВХОДЯЩИЕ ОФФЕРЫ
        // ----------------------------------------------------
        subscribeToIncomingOffers(userId, callback) {
            if (!userId || typeof callback !== 'function') return () => {};

            const db = _getDB();
            if (!db) return () => {};

            if (_incomingSubscriptions.has(userId)) {
                try { _incomingSubscriptions.get(userId)(); } catch (e) {}
                _incomingSubscriptions.delete(userId);
            }

            let unsubscribeFn = null;

            _getFirestoreFns().then(fns => {
                if (!fns) return;
                try {
                    const q = fns.query(
                        fns.collection(db, OFFER_CONFIG.collectionName),
                        fns.where('sellerId', '==', String(userId)),
                        fns.limit(OFFER_CONFIG.fetchLimit)
                    );

                    unsubscribeFn = fns.onSnapshot(q, (snap) => {
                        const raw = [];
                        snap.forEach(d => raw.push({ id: d.id, ...d.data() }));

                        const offers = _filterOffersClientSide(raw, {
                            sellerId: userId,
                            statuses: ACTIVE_STATUSES
                        });

                        try { callback(offers); } catch (e) {
                            console.warn('[P2POffers] callback error:', e);
                        }
                    }, (error) => {
                        console.warn('[P2POffers] subscribeToIncomingOffers error:', error);
                    });

                    _incomingSubscriptions.set(userId, unsubscribeFn);
                } catch (e) {
                    console.warn('[P2POffers] subscribeToIncomingOffers exception:', e);
                }
            });

            return () => {
                if (_incomingSubscriptions.has(userId)) {
                    try { _incomingSubscriptions.get(userId)(); } catch (e) {}
                    _incomingSubscriptions.delete(userId);
                }
            };
        },

        // ----------------------------------------------------
        // 4.11 РУЧНОЙ FETCH ВХОДЯЩИХ ОФФЕРОВ
        // ----------------------------------------------------
        async fetchIncomingOffers(userId) {
            const db = _getDB();
            if (!db) return [];

            const fns = await _getFirestoreFns();
            if (!fns) return [];

            try {
                const q = fns.query(
                    fns.collection(db, OFFER_CONFIG.collectionName),
                    fns.where('sellerId', '==', String(userId)),
                    fns.limit(OFFER_CONFIG.fetchLimit)
                );
                const snap = await fns.getDocs(q);
                const raw = [];
                snap.forEach(d => raw.push({ id: d.id, ...d.data() }));

                return _filterOffersClientSide(raw, {
                    sellerId: userId,
                    statuses: ACTIVE_STATUSES
                });
            } catch (e) {
                console.warn('[P2POffers] fetchIncomingOffers error:', e);
                return [];
            }
        },

        // ----------------------------------------------------
        // 4.12 МОИ ИСХОДЯЩИЕ ОФФЕРЫ
        // ----------------------------------------------------
        async fetchMyOffers(userId) {
            const db = _getDB();
            if (!db) return [];

            const fns = await _getFirestoreFns();
            if (!fns) return [];

            try {
                const q = fns.query(
                    fns.collection(db, OFFER_CONFIG.collectionName),
                    fns.where('buyerId', '==', String(userId)),
                    fns.limit(OFFER_CONFIG.fetchLimit)
                );
                const snap = await fns.getDocs(q);
                const raw = [];
                snap.forEach(d => raw.push({ id: d.id, ...d.data() }));

                return _filterOffersClientSide(raw, { buyerId: userId });
            } catch (e) {
                console.warn('[P2POffers] fetchMyOffers error:', e);
                return [];
            }
        },

        // ----------------------------------------------------
        // 4.13 УТИЛИТЫ
        // ----------------------------------------------------
        getTimeLeft(offer) {
            if (!offer || !offer.expiresAt) return 0;
            return Math.max(0, Math.ceil((offer.expiresAt - Date.now()) / 1000));
        },

        canSendNewOffer(buyerId, lotId) {
            const cooldownKey = `${buyerId}_${lotId}`;
            const lastSent = _lastOfferSentAt.get(cooldownKey) || 0;
            return (Date.now() - lastSent) >= OFFER_CONFIG.cooldownMs;
        },

        getCooldownRemaining(buyerId, lotId) {
            const cooldownKey = `${buyerId}_${lotId}`;
            const lastSent = _lastOfferSentAt.get(cooldownKey) || 0;
            const elapsed = Date.now() - lastSent;
            return Math.max(0, OFFER_CONFIG.cooldownMs - elapsed);
        },

        getStatusLabel(status) {
            switch (status) {
                case OFFER_STATUSES.PENDING:   return '⏳ Ожидает ответа';
                case OFFER_STATUSES.COUNTERED: return '🔄 Встречное предложение';
                case OFFER_STATUSES.ACCEPTED:  return '✅ Согласовано';
                case OFFER_STATUSES.REJECTED:  return '❌ Отклонено';
                case OFFER_STATUSES.CANCELLED: return '⛔ Отменено';
                case OFFER_STATUSES.EXPIRED:   return '⌛ Истекло';
                case OFFER_STATUSES.COMPLETED: return '🎉 Завершено';
                default:                        return '❓ Неизвестно';
            }
        },

        // ----------------------------------------------------
        // 4.14 АВТООЧИСТКА ПРОСРОЧЕННЫХ
        // ----------------------------------------------------
        async expireOldOffers() {
            const db = _getDB();
            if (!db) return { expired: 0 };

            const fns = await _getFirestoreFns();
            if (!fns) return { expired: 0 };

            try {
                const now = Date.now();
                const q = fns.query(
                    fns.collection(db, OFFER_CONFIG.collectionName),
                    fns.limit(OFFER_CONFIG.fetchLimit)
                );
                const snap = await fns.getDocs(q);
                let count = 0;

                for (const d of snap.docs) {
                    const data = d.data();
                    if (!ACTIVE_STATUSES.includes(data.status)) continue;
                    if (!data.expiresAt || data.expiresAt >= now) continue;

                    try {
                        await fns.updateDoc(d.ref, {
                            status: OFFER_STATUSES.EXPIRED,
                            respondedAt: now
                        });
                        count++;

                        const pushMgr = window.FB_Notifications?.P2P;
                        if (pushMgr?.queueP2PNotification) {
                            pushMgr.queueP2PNotification({
                                targetUserId: data.buyerId,
                                type: 'p2p_offer_expired',
                                title: 'Торг истёк',
                                text: `Продавец не ответил на предложение по «${data.lotName}» вовремя.`,
                                meta: { offerId: data.offerId }
                            }).catch(() => {});
                        }
                    } catch (e) {
                        console.warn('[P2POffers] expire update error:', e);
                    }
                }

                if (count > 0) _log(`expireOldOffers: ${count} expired`);
                return { expired: count };
            } catch (e) {
                console.warn('[P2POffers] expireOldOffers error:', e);
                return { expired: 0 };
            }
        },

        // ----------------------------------------------------
        // 4.15 СТАРТ/СТОП ЦИКЛОВ
        // ----------------------------------------------------
        startAutoExpire() {
            if (_expireInterval) clearInterval(_expireInterval);
            _expireInterval = setInterval(() => {
                this.expireOldOffers().catch(() => {});
            }, OFFER_CONFIG.expireCheckMs);
            _log('startAutoExpire OK');
        },

        stopAutoExpire() {
            if (_expireInterval) {
                clearInterval(_expireInterval);
                _expireInterval = null;
            }
        },

        unsubscribeAll() {
            _offerSubscriptions.forEach(unsub => {
                try { unsub(); } catch (e) {}
            });
            _offerSubscriptions.clear();

            _incomingSubscriptions.forEach(unsub => {
                try { unsub(); } catch (e) {}
            });
            _incomingSubscriptions.clear();

            _log('unsubscribeAll OK');
        },

        getStats() {
            return {
                activeOfferSubscriptions: _offerSubscriptions.size,
                activeIncomingSubscriptions: _incomingSubscriptions.size,
                cooldownEntries: _lastOfferSentAt.size,
                config: { ...OFFER_CONFIG },
                statuses: { ...OFFER_STATUSES }
            };
        }
    };

    // ========================================================
    // 5. ЭКСПОРТ МЕНЕДЖЕРА
    // ========================================================
    window.P2POffersManager = P2POffersManager;
    window.P2P_OFFER_CONFIG = OFFER_CONFIG;
    window.P2P_OFFER_STATUSES = OFFER_STATUSES;

    // ========================================================
    // 6. UI-ФУНКЦИИ: ТОРГ ПОКУПАТЕЛЯ С ЛОТА
    // ========================================================
    window.openP2PDealModal = async function(lotId) {
        if (!lotId) return;

        const profile = _getMyProfile();
        if (!profile) {
            _toast('❌ Не авторизован');
            return;
        }

        let lot = (window.state?.p2pMarketListings || []).find(l => l.id === lotId);

        if (!lot && window.FB_Bridge?.MarketLots?.fetchLots) {
            try {
                const remoteLots = await window.FB_Bridge.MarketLots.fetchLots();
                lot = remoteLots.find(l => (l.lot_id || l.id) === lotId);
            } catch (e) {
                console.warn('[P2POffers] openP2PDealModal fetchLots:', e);
            }
        }

        if (!lot) {
            _toast('❌ Лот не найден или снят с продажи');
            return;
        }

        const sellerId = String(lot.sellerId || '');
        if (sellerId === String(profile.id)) {
            _toast('❌ Это ваш собственный лот');
            return;
        }

        if (!P2POffersManager.canSendNewOffer(profile.id, lotId)) {
            const waitSec = Math.ceil(P2POffersManager.getCooldownRemaining(profile.id, lotId) / 1000);
            _toast(`⏳ Подождите ${waitSec} сек перед новым оффером`);
            return;
        }

        const lotPrice = Number(lot.price) || 100000;
        const suggestedPrice = Math.max(1000, Math.round(lotPrice * 0.9 / 1000) * 1000);
        const myCash = Number(window.state?.player?.cash) || 0;

        let modal = document.getElementById('modalP2PBuyerOffer');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalP2PBuyerOffer';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-box" style="max-width: 420px;">
                <div class="flex-between mb-2">
                    <div class="modal-glow-badge">
                        <i class="fa-solid fa-comments-dollar"></i> ТОРГ С ПРОДАВЦОМ
                    </div>
                    <button onclick="ModalManager.close('modalP2PBuyerOffer')" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                <div class="glass-card p-2 mb-2" style="background: #090e18; border-color: var(--cyan);">
                    <b class="text-xs color-cyan">${lot.name || 'Автомобиль'}</b>
                    <div class="sub-label mt-1" style="font-size:9.5px;">
                        Продавец: <b class="color-amber">${lot.sellerName || 'Игрок сети'}</b>
                    </div>
                    <div class="flex-between mt-1">
                        <span class="sub-label" style="font-size:9px;">Цена лота:</span>
                        <b class="color-green" style="font-size:13px;">${lotPrice.toLocaleString()} ₽</b>
                    </div>
                </div>

                <div class="sub-label mb-1" style="font-size:9.5px;">
                    Ваше предложение (от 1,000 ₽ до ${lotPrice.toLocaleString()} ₽):
                </div>
                <input type="number" id="p2pBuyerPriceInput"
                       class="chat-input"
                       style="width:100%; font-size:15px; padding:10px; margin-bottom:10px;"
                       value="${suggestedPrice}" min="1000" max="${lotPrice}">

                <div class="sub-label mb-1" style="font-size:9.5px;">
                    Сообщение продавцу (опционально):
                </div>
                <input type="text" id="p2pBuyerMsgInput"
                       class="chat-input"
                       style="width:100%; font-size:12px; padding:10px; margin-bottom:12px;"
                       maxlength="200"
                       placeholder="Даю прямо сейчас, оформляем ДКП!">

                <div class="glass-card p-2 mb-2" style="background:#090e18;">
                    <div class="flex-between text-xs">
                        <span class="sub-label">Ваш баланс:</span>
                        <b class="${myCash >= lotPrice ? 'color-green' : 'color-amber'}">${myCash.toLocaleString()} ₽</b>
                    </div>
                    <div class="flex-between text-xs mt-1">
                        <span class="sub-label">Срок оффера:</span>
                        <b class="color-cyan">30 минут на ответ</b>
                    </div>
                    <div class="flex-between text-xs mt-1">
                        <span class="sub-label">Действие продавца:</span>
                        <b class="color-purple">Принять / Отклонить / Встречная</b>
                    </div>
                </div>

                <div class="grid-2" style="gap:6px;">
                    <button onclick="ModalManager.close('modalP2PBuyerOffer')" class="btn btn-dark">
                        Отмена
                    </button>
                    <button onclick="window._submitP2PBuyerOffer('${lotId}')" class="btn btn-green font-bold">
                        <i class="fa-solid fa-paper-plane mr-1"></i> ОТПРАВИТЬ
                    </button>
                </div>
            </div>
        `;

        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalP2PBuyerOffer', { closeOthers: true });
        } else {
            modal.classList.add('active');
        }

        if (window.AudioFx) window.AudioFx.play('tick');
    };

    window._submitP2PBuyerOffer = async function(lotId) {
        const priceEl = document.getElementById('p2pBuyerPriceInput');
        const msgEl = document.getElementById('p2pBuyerMsgInput');
        if (!priceEl) return;

        const price = parseInt(priceEl.value, 10);
        const msg = (msgEl?.value || '').trim();

        if (!price || isNaN(price) || price < 1000) {
            return _toast('❌ Цена не менее 1,000 ₽');
        }

        let lot = (window.state?.p2pMarketListings || []).find(l => l.id === lotId);
        const lotPrice = Number(lot?.price || 0);
        if (lotPrice > 0 && price > lotPrice) {
            return _toast(`❌ Цена не выше ${lotPrice.toLocaleString()} ₽`);
        }

        if (typeof ModalManager !== 'undefined') {
            ModalManager.close('modalP2PBuyerOffer');
        } else {
            const m = document.getElementById('modalP2PBuyerOffer');
            if (m) m.classList.remove('active');
        }

        const res = await P2POffersManager.createOffer(lotId, price, msg);

        if (res.success) {
            _toast(`📤 Оффер отправлен: ${price.toLocaleString()} ₽`);
            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }
        } else {
            _toast(`❌ ${res.error}`);
            if (window.AudioFx) window.AudioFx.play('error');
        }
    };

    // ========================================================
    // 7. АВТОЗАПУСК ЦИКЛА АВТООЧИСТКИ
    // ========================================================
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => P2POffersManager.startAutoExpire(), 5000);
            });
        } else {
            setTimeout(() => P2POffersManager.startAutoExpire(), 5000);
        }
    }

    console.log('[🤝 p2p-offers v1.2.0] P2P торг + Telegram Bot Push интеграция ✓');

})();
// ========================================================
// js/p2p-offers.js — РЕАЛЬНЫЙ P2P ТОРГ МЕЖДУ ИГРОКАМИ (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.0.0 (SPRINT 2 — РЕАЛЬНЫЙ ТОРГ):
//   - Firestore-коллекция p2p_offers — живые офферы между игроками
//   - Машина состояний: pending → countered → accepted/rejected/cancelled/expired/completed
//   - 3 типа ответа продавца: accept / reject / counter
//   - Real-time подписки через onSnapshot
//   - Автоматический TTL: 30 минут на оффер
//   - Cooldown: 10 секунд между офферами от одного покупателя
//   - Лимит раундов: 30
//   - Автоочистка просроченных офферов (раз в 60 сек)
//   - Интеграция с EventBus и NotificationCenter
//
// ИСПОЛЬЗОВАНИЕ:
//   await P2POffersManager.createOffer(lotId, price, message);
//   await P2POffersManager.acceptOffer(offerId);
//   await P2POffersManager.counterOffer(offerId, newPrice, message);
//   P2POffersManager.subscribeToIncomingOffers(uid, callback);
// ========================================================

(function() {
    'use strict';

    // ========================================================
    // 1. КОНФИГ
    // ========================================================
    const OFFER_CONFIG = {
        collectionName: 'p2p_offers',
        expiresMs:      30 * 60 * 1000,   // 30 минут — срок жизни оффера
        cooldownMs:     10 * 1000,         // 10 секунд — между офферами покупателя
        maxRounds:      30,                // до 30 раундов торга
        expireCheckMs:  60 * 1000,         // проверка истёкших раз в минуту
        cleanupMs:      60 * 60 * 1000     // полная очистка старых раз в час
    };

    const OFFER_STATUSES = {
        PENDING:   'pending',    // оффер отправлен, ждём продавца
        COUNTERED: 'countered',  // продавец предложил встречную цену
        ACCEPTED:  'accepted',   // продавец принял (или покупатель принял counter)
        REJECTED:  'rejected',   // продавец (или покупатель) отклонил
        CANCELLED: 'cancelled',  // одна из сторон отменила
        EXPIRED:   'expired',    // 30 минут прошло без ответа
        COMPLETED: 'completed'   // сделка проведена (ДКП подписан)
    };

    // ========================================================
    // 2. ВНУТРЕННИЕ ПЕРЕМЕННЫЕ
    // ========================================================
    let _firestoreFns = null;
    let _expireInterval = null;
    let _cleanupInterval = null;

    // Реестр подписок: offerId -> unsubscribe
    const _offerSubscriptions = new Map();
    // Реестр подписок на входящие: uid -> unsubscribe
    const _incomingSubscriptions = new Map();

    // Кэш "последнее время отправки оффера" для cooldown
    const _lastOfferSentAt = new Map();  // `${uid}_${lotId}` -> timestamp

    // ========================================================
    // 3. ХЕЛПЕРЫ
    // ========================================================

    /**
     * Динамический импорт функций Firestore.
     */
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

    /**
     * Получить db.
     */
    function _getDB() {
        return window.FB_Bridge?.db || window.FB_Core?.db || null;
    }

    /**
     * Генерация уникального ID оффера.
     */
    function _generateOfferId() {
        return 'off_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    }

    /**
     * Профиль текущего игрока.
     */
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

    /**
     * Emit события через EventBus.
     */
    function _emit(name, payload) {
        if (window.EventBus?.emit) {
            try { window.EventBus.emit(name, payload || {}); } catch (e) {}
        }
    }

    /**
     * Логирование.
     */
    function _log(message, data) {
        if (window.DevLogger?.add) {
            try { window.DevLogger.add('firestore', '[P2POffers] ' + message, data || null); } catch (e) {}
        }
    }

    /**
     * Тост.
     */
    function _toast(msg) {
        if (typeof window.showToast === 'function') {
            try { window.showToast(msg); } catch (e) {}
        }
    }

    /**
     * Сохранить state.
     */
    function _save() {
        if (typeof window.saveState === 'function') {
            try { window.saveState(); } catch (e) {}
        }
    }

    /**
     * Обновить HUD.
     */
    function _refreshHeader() {
        if (typeof window.updateHeaderUI === 'function') {
            try { window.updateHeaderUI(); } catch (e) {}
        }
    }

    /**
     * Проверить, что оффер ещё «живой».
     */
    function _isOfferAlive(offer) {
        if (!offer) return false;
        if (offer.expiresAt && offer.expiresAt < Date.now()) return false;
        return true;
    }

    /**
     * Форматирование цены.
     */
    function _fmtMoney(v) {
        const n = Math.round(Number(v) || 0);
        return n.toLocaleString('ru-RU') + ' ₽';
    }

    // ========================================================
    // 4. ВАЛИДАЦИЯ ВХОДНЫХ ДАННЫХ
    // ========================================================
    function _validateOfferPayload(lotId, price, message) {
        const errors = [];

        if (!lotId || typeof lotId !== 'string') {
            errors.push('Некорректный lotId');
        }
        const p = Number(price);
        if (!p || isNaN(p) || p < 1000) {
            errors.push('Цена должна быть не менее 1,000 ₽');
        }
        if (message && typeof message !== 'string') {
            errors.push('Сообщение должно быть строкой');
        }
        if (message && message.length > 200) {
            errors.push('Сообщение не более 200 символов');
        }

        return { valid: errors.length === 0, errors };
    }

    // ========================================================
    // 5. P2P OFFERS MANAGER
    // ========================================================
    const P2POffersManager = {

        // ----------------------------------------------------
        // 5.1 СОЗДАНИЕ ОФФЕРА (покупатель → продавцу)
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

            // Cooldown: 10 сек между офферами на один и тот же лот
            const cooldownKey = `${profile.id}_${lotId}`;
            const lastSent = _lastOfferSentAt.get(cooldownKey) || 0;
            const sinceLast = Date.now() - lastSent;
            if (sinceLast < OFFER_CONFIG.cooldownMs) {
                const waitSec = Math.ceil((OFFER_CONFIG.cooldownMs - sinceLast) / 1000);
                return { success: false, error: `Подождите ${waitSec} сек перед новым оффером` };
            }

            // Проверка баланса покупателя
            const buyerCash = Number(window.state?.player?.cash) || 0;
            const finalPrice = Math.round(Number(price));
            if (buyerCash < finalPrice) {
                return { success: false, error: `Не хватает ${_fmtMoney(finalPrice - buyerCash)}` };
            }

            // Находим лот (в локальном кэше или в Firestore)
            let lot = null;
            if (window.FB_Bridge?.MarketLots?.fetchLots) {
                try {
                    const remoteLots = await window.FB_Bridge.MarketLots.fetchLots();
                    lot = remoteLots.find(l => (l.lot_id || l.id) === lotId);
                } catch (e) {
                    console.warn('[P2POffers] fetchLots error:', e);
                }
            }

            if (!lot) {
                lot = (window.state?.p2pMarketListings || []).find(l => l.id === lotId);
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

            // Проверяем, нет ли уже активного оффера на этот лот от этого покупателя
            const fns = await _getFirestoreFns();
            if (!fns) return { success: false, error: 'Firestore недоступен' };

            try {
                const activeQuery = fns.query(
                    fns.collection(db, OFFER_CONFIG.collectionName),
                    fns.where('buyerId', '==', String(profile.id)),
                    fns.where('lotId', '==', lotId),
                    fns.where('status', 'in', [OFFER_STATUSES.PENDING, OFFER_STATUSES.COUNTERED]),
                    fns.limit(1)
                );
                const activeSnap = await fns.getDocs(activeQuery);
                if (!activeSnap.empty) {
                    return { success: false, error: 'У вас уже есть активный оффер на этот лот' };
                }
            } catch (e) {
                console.warn('[P2POffers] Проверка активного оффера не удалась:', e);
                // Не блокируем — продолжаем
            }

            // Создаём оффер
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

                // Запоминаем время отправки для cooldown
                _lastOfferSentAt.set(cooldownKey, now);

                // Уведомление продавцу
                const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
                const notifRef = fns.doc(db, 'notifications', notifId);
                await fns.setDoc(notifRef, {
                    toUser: sellerId,
                    type: 'p2p_offer_received',
                    title: '💬 Новое предложение торга!',
                    text: `${profile.name} предлагает ${_fmtMoney(finalPrice)} за «${lot.name}»`,
                    offerId,
                    lotId,
                    buyerId: String(profile.id),
                    buyerName: profile.name,
                    read: false,
                    claimed: false,
                    timestamp: now,
                    expireAt: now + 7 * 24 * 60 * 60 * 1000
                }).catch(err => console.warn('[P2POffers] notif error:', err));

                _log('createOffer OK', offerId);
                _emit('p2p:offer_created', { offerId, lotId, price: finalPrice, sellerId });

                return { success: true, offerId, offer: payload };

            } catch (e) {
                _log('createOffer ERROR', e.message);
                return { success: false, error: e.message || 'Ошибка создания оффера' };
            }
        },

        // ----------------------------------------------------
        // 5.2 ПРИНЯТИЕ ОФФЕРА (продавец или покупатель counter)
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

                // Проверка прав: продавец может принять pending, покупатель — countered
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

                // Уведомление второй стороне
                const toUser = isSeller ? offer.buyerId : offer.sellerId;
                const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
                const notifRef = fns.doc(db, 'notifications', notifId);
                await fns.setDoc(notifRef, {
                    toUser,
                    type: 'p2p_offer_accepted',
                    title: '✅ Сделка согласована!',
                    text: `${profile.name} принял(а) цену ${_fmtMoney(finalPrice)} за «${offer.lotName}»`,
                    offerId,
                    lotId: offer.lotId,
                    price: finalPrice,
                    read: false,
                    claimed: false,
                    timestamp: now,
                    expireAt: now + 7 * 24 * 60 * 60 * 1000
                }).catch(err => console.warn('[P2POffers] notif error:', err));

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
        // 5.3 ОТКЛОНЕНИЕ ОФФЕРА
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
                const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
                const notifRef = fns.doc(db, 'notifications', notifId);
                await fns.setDoc(notifRef, {
                    toUser,
                    type: 'p2p_offer_rejected',
                    title: '❌ Оффер отклонён',
                    text: `${profile.name} отклонил предложение по «${offer.lotName}»`,
                    offerId,
                    lotId: offer.lotId,
                    read: false,
                    claimed: false,
                    timestamp: now,
                    expireAt: now + 7 * 24 * 60 * 60 * 1000
                }).catch(err => console.warn('[P2POffers] notif error:', err));

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
        // 5.4 ВСТРЕЧНАЯ ЦЕНА (только продавец)
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

                // Встречная цена должна быть:
                // - меньше или равна оригинальной
                // - больше предложенной покупателем
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

                const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
                const notifRef = fns.doc(db, 'notifications', notifId);
                await fns.setDoc(notifRef, {
                    toUser: offer.buyerId,
                    type: 'p2p_offer_countered',
                    title: '🔄 Встречное предложение!',
                    text: `${profile.name} предлагает ${_fmtMoney(cp)} за «${offer.lotName}»`,
                    offerId,
                    lotId: offer.lotId,
                    counterPrice: cp,
                    read: false,
                    claimed: false,
                    timestamp: now,
                    expireAt: now + 7 * 24 * 60 * 60 * 1000
                }).catch(err => console.warn('[P2POffers] notif error:', err));

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
        // 5.5 ОТМЕНА ОФФЕРА (доступна и покупателю, и продавцу)
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

                if (offer.status === OFFER_STATUSES.CANCELLED ||
                    offer.status === OFFER_STATUSES.EXPIRED ||
                    offer.status === OFFER_STATUSES.REJECTED ||
                    offer.status === OFFER_STATUSES.COMPLETED) {
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
                const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
                const notifRef = fns.doc(db, 'notifications', notifId);
                await fns.setDoc(notifRef, {
                    toUser,
                    type: 'p2p_offer_cancelled',
                    title: '⛔ Торг отменён',
                    text: `${profile.name} отменил переговоры по «${offer.lotName}»`,
                    offerId,
                    lotId: offer.lotId,
                    read: false,
                    claimed: false,
                    timestamp: now,
                    expireAt: now + 7 * 24 * 60 * 60 * 1000
                }).catch(err => console.warn('[P2POffers] notif error:', err));

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
        // 5.6 ПОКУПАТЕЛЬ ОТВЕЧАЕТ НА ВСТРЕЧНУЮ ЦЕНУ
        // (это обёртка над acceptOffer / rejectOffer)
        // ----------------------------------------------------
        async buyerAcceptCounter(offerId) {
            return this.acceptOffer(offerId);
        },

        async buyerRejectCounter(offerId) {
            return this.rejectOffer(offerId);
        },

        // ----------------------------------------------------
        // 5.7 ПОМЕТИТЬ ОФФЕР КАК COMPLETED (после ДКП)
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
        // 5.8 ПОЛУЧЕНИЕ ОДНОГО ОФФЕРА
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
        // 5.9 REAL-TIME: ПОДПИСКА НА ОДИН ОФФЕР
        // ----------------------------------------------------
        subscribeToMyOffer(offerId, callback) {
            if (!offerId || typeof callback !== 'function') return () => {};

            const db = _getDB();
            if (!db) return () => {};

            // Отписываемся, если уже есть
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
        // 5.10 REAL-TIME: ПОДПИСКА НА ВХОДЯЩИЕ ОФФЕРЫ
        // ----------------------------------------------------
        subscribeToIncomingOffers(userId, callback) {
            if (!userId || typeof callback !== 'function') return () => {};

            const db = _getDB();
            if (!db) return () => {};

            // Отписываемся, если уже есть
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
                        fns.where('status', 'in', [OFFER_STATUSES.PENDING, OFFER_STATUSES.COUNTERED]),
                        fns.orderBy('createdAt', 'desc'),
                        fns.limit(50)
                    );

                    unsubscribeFn = fns.onSnapshot(q, (snap) => {
                        const offers = [];
                        const now = Date.now();
                        snap.forEach(d => {
                            const data = { id: d.id, ...d.data() };
                            if (data.expiresAt && data.expiresAt < now) return;
                            offers.push(data);
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
        // 5.11 РУЧНОЙ FETCH ВХОДЯЩИХ ОФФЕРОВ
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
                    fns.where('status', 'in', [OFFER_STATUSES.PENDING, OFFER_STATUSES.COUNTERED]),
                    fns.limit(50)
                );
                const snap = await fns.getDocs(q);
                const now = Date.now();
                const result = [];
                snap.forEach(d => {
                    const data = { id: d.id, ...d.data() };
                    if (data.expiresAt && data.expiresAt < now) return;
                    result.push(data);
                });
                return result;
            } catch (e) {
                console.warn('[P2POffers] fetchIncomingOffers error:', e);
                return [];
            }
        },

        // ----------------------------------------------------
        // 5.12 МОИ ИСХОДЯЩИЕ ОФФЕРЫ (покупатель)
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
                    fns.orderBy('createdAt', 'desc'),
                    fns.limit(30)
                );
                const snap = await fns.getDocs(q);
                const result = [];
                snap.forEach(d => result.push({ id: d.id, ...d.data() }));
                return result;
            } catch (e) {
                console.warn('[P2POffers] fetchMyOffers error:', e);
                return [];
            }
        },

        // ----------------------------------------------------
        // 5.13 УТИЛИТЫ
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
        // 5.14 АВТООЧИСТКА ПРОСРОЧЕННЫХ ОФФЕРОВ
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
                    fns.where('status', 'in', [OFFER_STATUSES.PENDING, OFFER_STATUSES.COUNTERED]),
                    fns.limit(50)
                );
                const snap = await fns.getDocs(q);
                let count = 0;
                for (const d of snap.docs) {
                    const data = d.data();
                    if (data.expiresAt && data.expiresAt < now) {
                        try {
                            await fns.updateDoc(d.ref, {
                                status: OFFER_STATUSES.EXPIRED,
                                respondedAt: now
                            });
                            count++;

                            // Уведомляем покупателя
                            const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
                            await fns.setDoc(fns.doc(db, 'notifications', notifId), {
                                toUser: data.buyerId,
                                type: 'p2p_offer_expired',
                                title: '⌛ Торг истёк',
                                text: `Продавец не ответил на ваше предложение по «${data.lotName}» за 30 минут`,
                                offerId: data.offerId,
                                lotId: data.lotId,
                                read: false,
                                claimed: false,
                                timestamp: now,
                                expireAt: now + 7 * 24 * 60 * 60 * 1000
                            });
                        } catch (e) {
                            console.warn('[P2POffers] expire update error:', e);
                        }
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
        // 5.15 СТАРТ/СТОП ЦИКЛОВ
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

        // ----------------------------------------------------
        // 5.16 ОТПИСАТЬСЯ ОТ ВСЕГО
        // ----------------------------------------------------
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

        // ----------------------------------------------------
        // 5.17 DEV-СТАТИСТИКА
        // ----------------------------------------------------
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
    // 6. ЭКСПОРТ
    // ========================================================
    window.P2POffersManager = P2POffersManager;
    window.P2P_OFFER_CONFIG = OFFER_CONFIG;
    window.P2P_OFFER_STATUSES = OFFER_STATUSES;

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

    console.log('[🤝 p2p-offers v1.0.0] Реальный P2P торг загружен. Config: TTL=30min, Cooldown=10s, MaxRounds=30 ✓');
    console.log('[🤝 p2p-offers] API: createOffer, acceptOffer, rejectOffer, counterOffer, cancelOffer, subscribeToMyOffer, subscribeToIncomingOffers ✓');

})();

// ========================================================
// js/p2p-offers.js — РЕАЛЬНЫЙ P2P ТОРГ МЕЖДУ ИГРОКАМИ (v1.5.3 FULL)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.5.3 (INTERACTIVE DEAL CHAT & MODAL DISPLAY FIX):
//   - Гарантированный показ модалки торга (#modalP2PBuyerOffer) поверх телефона.
//   - Снята блокировка торга для DEV-режима и тестирования.
//   - Сохранена полная атомарная транзакция ДКП, уведомления и автоистечение срока.
// ========================================================

(function() {
    'use strict';

    // ========================================================
    // 0. TOP-LEVEL ЗАГРУЗКА FIRESTORE HELPERS
    // ========================================================
    const FIRESTORE_LOAD_TIMEOUT_MS = 10000;

    let _firestoreFns = null;
    let _firestoreLoadError = null;

    const _firestoreHelpersPromise = (async () => {
        try {
            console.log('[P2POffers] Загрузка Firestore helpers (top-level)...');

            const mod = await Promise.race([
                import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Firestore helpers load timeout (${FIRESTORE_LOAD_TIMEOUT_MS}ms)`)), FIRESTORE_LOAD_TIMEOUT_MS)
                )
            ]);

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
                runTransaction: mod.runTransaction,
                serverTimestamp: mod.serverTimestamp,
                Timestamp: mod.Timestamp
            };

            console.log('[P2POffers] ✓ Firestore helpers готовы');
            return _firestoreFns;
        } catch (e) {
            _firestoreLoadError = e;
            console.warn('[P2POffers] ⚠️ Не удалось загрузить Firestore helpers:', e.message);
            return null;
        }
    })();

    async function _getFirestoreFns() {
        if (_firestoreFns) return _firestoreFns;
        if (_firestoreLoadError) return null;
        return await _firestoreHelpersPromise;
    }

    async function _ensureReady() {
        const db = window.FB_Bridge?.db || window.FB_Core?.db;
        if (!db) {
            console.warn('[P2POffers] Firestore DB недоступен');
            return null;
        }

        const fns = await _getFirestoreFns();
        if (!fns) {
            console.warn('[P2POffers] Firestore helpers не загружены');
            return null;
        }

        return { db, fns };
    }

    // ========================================================
    // 1. КОНФИГ
    // ========================================================
    const OFFER_CONFIG = {
        collectionName: 'p2p_offers',
        expiresMs:      30 * 60 * 1000,
        cooldownMs:     5 * 1000,
        maxRounds:      30,
        expireCheckMs:  60 * 1000,
        cleanupMs:      60 * 60 * 1000,
        fetchLimit:     100
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
    const P2P_MARKET_FEE_PERCENT = 0.03;
    const TTL_NOTIFICATIONS = 7 * 24 * 60 * 60 * 1000;
    const TTL_TRANSACTIONS = 90 * 24 * 60 * 60 * 1000;

    // ========================================================
    // 2. ВНУТРЕННИЕ ПЕРЕМЕННЫЕ
    // ========================================================
    let _expireInterval = null;
    const _offerSubscriptions = new Map();
    const _incomingSubscriptions = new Map();
    const _lastOfferSentAt = new Map();

    // ========================================================
    // 3. ХЕЛПЕРЫ
    // ========================================================
    function _generateOfferId() {
        return 'off_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    }

    function _isDevMode() {
        const name = String(window.state?.player?.name || '');
        const uid = String(window.state?.player?.uid || '');
        return name.toLowerCase().includes('dev') || uid.toLowerCase().includes('dev') || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    }

    function _getMyProfile() {
        if (window.FB_Bridge?.getProfile) {
            const p = window.FB_Bridge.getProfile();
            if (p && p.id) return { id: String(p.id), name: p.name || 'Перекуп', avatar: p.avatar || '👤' };
        }
        const uid = window.TelegramAuthManager?.getVerifiedUserId() || window.state?.player?.uid || window.tgUserId;
        if (uid) {
            return {
                id: String(uid),
                name: window.state?.player?.name || 'Перекуп',
                avatar: window.state?.player?.avatarUrl || '👤'
            };
        }
        return { id: 'me_buyer', name: 'Перекуп', avatar: '👤' };
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

    function _findLot(lotId) {
        const listings = window.state?.p2pMarketListings || [];
        return listings.find(l => l && (String(l.id) === String(lotId) || String(l.lot_id) === String(lotId)));
    }

    // ========================================================
    // 4. P2P OFFERS MANAGER
    // ========================================================
    const P2POffersManager = {

        async createOffer(lotId, price, message = '') {
            const validation = _validateOfferPayload(String(lotId), price, message);
            if (!validation.valid) {
                return { success: false, error: validation.errors.join('; ') };
            }

            let profile = _getMyProfile();
            if (!profile) return { success: false, error: 'Не авторизован' };

            const ready = await _ensureReady();
            if (!ready) return { success: false, error: 'Нет связи с сервером' };
            const { db, fns } = ready;

            const cooldownKey = `${profile.id}_${lotId}`;
            const lastSent = _lastOfferSentAt.get(cooldownKey) || 0;
            const sinceLast = Date.now() - lastSent;
            if (!_isDevMode() && sinceLast < OFFER_CONFIG.cooldownMs) {
                const waitSec = Math.ceil((OFFER_CONFIG.cooldownMs - sinceLast) / 1000);
                return { success: false, error: `Подождите ${waitSec} сек перед новым оффером` };
            }

            const buyerCash = Number(window.state?.player?.cash) || 0;
            const finalPrice = Math.round(Number(price));
            if (buyerCash < finalPrice) {
                return { success: false, error: `Не хватает ${_fmtMoney(finalPrice - buyerCash)}` };
            }

            let lot = _findLot(lotId);

            if (!lot && window.FB_Bridge?.MarketLots?.fetchLots) {
                try {
                    const remoteLots = await window.FB_Bridge.MarketLots.fetchLots();
                    lot = (remoteLots || []).find(l => l && (String(l.lot_id) === String(lotId) || String(l.id) === String(lotId)));
                } catch (e) {
                    console.warn('[P2POffers] fetchLots error:', e);
                }
            }

            if (!lot) {
                return { success: false, error: 'Лот больше не активен на бирже' };
            }

            let sellerId = String(lot.sellerId || '');
            if (!sellerId) sellerId = 'seller_player';

            let buyerId = String(profile.id);

            // DEV режим: авто-эмуляция покупателя при совпадении с продавцом
            if (sellerId === buyerId) {
                if (_isDevMode()) {
                    buyerId = 'buyer_dev_' + Math.random().toString(36).substring(2, 6);
                    profile = { id: buyerId, name: 'Тестовый Покупатель', avatar: '🏎️' };
                } else {
                    return { success: false, error: 'Нельзя отправить оффер самому себе' };
                }
            }

            const originalPrice = Number(lot.price) || finalPrice;

            const offerId = _generateOfferId();
            const now = Date.now();
            const offerRef = fns.doc(db, OFFER_CONFIG.collectionName, offerId);

            const payload = {
                offerId,
                lotId: String(lotId),
                lotName: lot.name || 'Автомобиль',
                lotImage: lot.itemData?.img || lot.img || '',
                lotType: lot.type || 'cars',
                originalPrice,
                currentPrice: originalPrice,
                offeredPrice: finalPrice,

                buyerId: String(buyerId),
                buyerName: profile.name,
                buyerAvatar: profile.avatar,

                sellerId: String(sellerId),
                sellerName: lot.sellerName || 'Продавец',
                sellerAvatar: lot.sellerAvatar || '🧔',

                status: OFFER_STATUSES.PENDING,

                buyerMessage: String(message || '').substring(0, 200),
                sellerMessage: null,
                counterPrice: null,

                round: 1,

                history: [{
                    round: 1,
                    actorId: String(buyerId),
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

                const pushMgr = window.FB_Notifications?.P2P;
                if (pushMgr?.notifyOfferReceived) {
                    pushMgr.notifyOfferReceived(sellerId, {
                        id: offerId,
                        senderName: profile.name,
                        car: { name: lot.name || 'Автомобиль' },
                        cash: finalPrice
                    }).catch(err => console.warn('[P2POffers] Push error:', err));
                }

                _log('createOffer OK', offerId);
                _emit('p2p:offer_created', { offerId, lotId: String(lotId), price: finalPrice, sellerId });

                return { success: true, offerId, offer: payload };
            } catch (e) {
                _log('createOffer ERROR', e.message);
                return { success: false, error: e.message || 'Ошибка создания оффера' };
            }
        },

        async acceptOffer(offerId) {
            const profile = _getMyProfile();
            if (!profile) return { success: false, error: 'Не авторизован' };

            const ready = await _ensureReady();
            if (!ready) return { success: false, error: 'Нет связи' };
            const { db, fns } = ready;

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
                if (offer.status === OFFER_STATUSES.COMPLETED) {
                    return { success: false, error: 'Сделка уже завершена' };
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
                } else if (_isDevMode()) {
                    canAccept = true;
                    finalPrice = offer.counterPrice || offer.offeredPrice || offer.currentPrice;
                }

                if (!canAccept) {
                    return { success: false, error: 'Вы не можете принять этот оффер' };
                }

                const fpNum = Number(finalPrice);
                if (!fpNum || fpNum < 1000) {
                    return { success: false, error: 'Некорректная финальная цена' };
                }

                if (isBuyer) {
                    const myCash = Number(window.state?.player?.cash) || 0;
                    if (myCash < fpNum) {
                        return {
                            success: false,
                            error: `Не хватает ${_fmtMoney(fpNum - myCash)} для оплаты сделки`
                        };
                    }
                }

                const completeRes = await this._completeDealAtomic(offerId, offer, fpNum, {
                    skipBuyerNotif: isBuyer
                });

                if (!completeRes.success) {
                    return { success: false, error: completeRes.error || 'Не удалось завершить сделку' };
                }

                if (isBuyer || _isDevMode()) {
                    await this._applyBuyerSideCompletion(completeRes.lot || {}, offer, fpNum);
                }

                const toUser = isSeller ? offer.buyerId : offer.sellerId;
                const pushMgr = window.FB_Notifications?.P2P;
                if (pushMgr?.notifyOfferAccepted) {
                    pushMgr.notifyOfferAccepted(toUser, {
                        carName: offer.lotName || "Объект",
                        responderName: profile.name || "Участник сделки"
                    }).catch(err => console.warn('[P2POffers] Push error:', err));
                }

                _log('acceptOffer OK', `${offerId} → ${fpNum}`);
                _emit('p2p:offer_accepted', {
                    offerId,
                    lotId: offer.lotId,
                    price: fpNum,
                    completed: true
                });

                return { success: true, offerId, price: fpNum, completed: true };
            } catch (e) {
                _log('acceptOffer ERROR', e.message);
                return { success: false, error: e.message };
            }
        },

        async _completeDealAtomic(offerId, offer, finalPrice, opts = {}) {
            const ready = await _ensureReady();
            if (!ready) return { success: false, error: 'Нет связи' };
            const { db, fns } = ready;

            const offerRef = fns.doc(db, OFFER_CONFIG.collectionName, offerId);
            const lotRef = offer.lotId ? fns.doc(db, 'market_lots', String(offer.lotId)) : null;
            const now = Date.now();
            const txId = 'tx_' + now + '_' + Math.random().toString(36).substring(2, 6);
            const txRef = fns.doc(db, 'transactions', txId);

            const sellerNotifId = 'notif_payout_' + now + '_' + Math.random().toString(36).substring(2, 6);
            const sellerNotifRef = fns.doc(db, 'notifications', sellerNotifId);

            const buyerNotifId = 'notif_car_' + now + '_' + Math.random().toString(36).substring(2, 6);
            const buyerNotifRef = fns.doc(db, 'notifications', buyerNotifId);

            let lotData = null;

            try {
                await fns.runTransaction(db, async (tx) => {
                    if (lotRef) {
                        const lotSnap = await tx.get(lotRef);
                        if (lotSnap.exists()) {
                            lotData = lotSnap.data();
                            if (lotData.status && lotData.status !== 'active') {
                                throw new Error('Лот уже продан или снят с продажи');
                            }
                            tx.update(lotRef, {
                                status: 'sold',
                                buyerId: String(offer.buyerId),
                                buyerName: offer.buyerName || 'Покупатель',
                                soldAt: now,
                                finalPrice: finalPrice,
                                offerId: offerId
                            });
                        }
                    }

                    const offerSnap = await tx.get(offerRef);
                    if (!offerSnap.exists()) throw new Error('Оффер не найден');
                    const of = offerSnap.data();
                    if (of.status === OFFER_STATUSES.COMPLETED) {
                        throw new Error('Сделка уже завершена');
                    }

                    const fee = Math.round(finalPrice * P2P_MARKET_FEE_PERCENT);
                    const sellerPayout = finalPrice - fee;
                    const itemName = (lotData && lotData.name) || offer.lotName || 'Автомобиль';

                    tx.update(offerRef, {
                        status: OFFER_STATUSES.COMPLETED,
                        currentPrice: finalPrice,
                        finalPrice: finalPrice,
                        completedAt: now,
                        respondedAt: now
                    });

                    tx.set(txRef, {
                        tx_id: txId,
                        lot_id: offer.lotId || null,
                        offer_id: offerId,
                        buyerId: String(offer.buyerId),
                        buyerName: offer.buyerName || 'Покупатель',
                        sellerId: String(offer.sellerId),
                        sellerName: offer.sellerName || 'Продавец',
                        item: itemName,
                        type: (lotData && lotData.type) || offer.lotType || 'cars',
                        price: finalPrice,
                        originalPrice: Number(offer.originalPrice) || finalPrice,
                        fee: fee,
                        payout: sellerPayout,
                        source: 'p2p_offer',
                        timestamp: now,
                        expireAt: now + TTL_TRANSACTIONS
                    });

                    tx.set(sellerNotifRef, {
                        toUser: String(offer.sellerId),
                        type: 'deal_payout',
                        title: '💰 Продажа на P2P бирже!',
                        text: `Покупатель ${offer.buyerName || 'Перекуп'} купил «${itemName}» за ${finalPrice.toLocaleString()} ₽. Начислено: +${sellerPayout.toLocaleString()} ₽ (комиссия ${fee.toLocaleString()} ₽).`,
                        amount: sellerPayout,
                        lotId: offer.lotId || null,
                        offerId: offerId,
                        read: false,
                        claimed: false,
                        timestamp: now,
                        expireAt: now + TTL_NOTIFICATIONS
                    });

                    if (!opts.skipBuyerNotif) {
                        const carData = (lotData && lotData.itemData) || { name: itemName };
                        tx.set(buyerNotifRef, {
                            toUser: String(offer.buyerId),
                            type: 'p2p_deal_car_delivered',
                            title: '🚗 Автомобиль ваш!',
                            text: `Вы приобрели «${itemName}» за ${finalPrice.toLocaleString()} ₽. Авто уже в гараже.`,
                            meta: {
                                lotId: offer.lotId || null,
                                offerId: offerId,
                                carData: carData,
                                finalPrice: finalPrice
                            },
                            read: false,
                            claimed: false,
                            timestamp: now,
                            expireAt: now + TTL_NOTIFICATIONS
                        });
                    }

                    if (lotData && (lotData.type === 'plate' || lotData.type === 'plates')) {
                        const plateStr = (lotData.itemData && lotData.itemData.plate) || lotData.name;
                        if (plateStr) {
                            const cleanId = String(plateStr).replace(/\s+/g, '_');
                            tx.set(fns.doc(db, 'registered_plates', cleanId), {
                                plate: plateStr,
                                ownerId: String(offer.buyerId),
                                carId: null,
                                status: 'owned',
                                updatedAt: now
                            }, { merge: true });
                        }
                    }
                });

                _log('_completeDealAtomic OK', `${offerId} → ${finalPrice}`);
                return { success: true, lot: lotData };
            } catch (e) {
                _log('_completeDealAtomic ERROR', e.message);
                return { success: false, error: e.message };
            }
        },

        async _applyBuyerSideCompletion(lot, offer, finalPrice) {
            try {
                const player = window.state && window.state.player;
                if (!player) return;

                const cash = Number(player.cash) || 0;
                if (cash < finalPrice) {
                    _toast(`⚠️ Сделка завершена, но не хватает ${_fmtMoney(finalPrice - cash)}. Проверьте баланс.`);
                    _log('_applyBuyerSideCompletion WARN', 'not enough cash');
                    return;
                }

                player.cash = cash - finalPrice;

                const item = (lot && lot.itemData) || { name: (lot && lot.name) || offer.lotName || 'Автомобиль' };
                const car = Object.assign({}, item);
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

                if (Array.isArray(window.state.p2pMarketListings)) {
                    window.state.p2pMarketListings = window.state.p2pMarketListings.filter(l =>
                        l && String(l.id || l.lot_id) !== String(offer.lotId)
                    );
                }

                if (typeof window.logBankTransaction === 'function') {
                    window.logBankTransaction(`P2P покупка: ${car.name || 'Автомобиль'}`, finalPrice, false);
                }

                if (typeof saveState === 'function') saveState();
                if (typeof updateHeaderUI === 'function') updateHeaderUI();
                if (typeof renderGarage === 'function') renderGarage();

                _toast(`✅ Сделка закрыта: «${car.name || 'Автомобиль'}» за ${_fmtMoney(finalPrice)}`);
                if (window.AudioFx) {
                    window.AudioFx.play('win');
                    window.AudioFx.haptic('success');
                }

                _log('_applyBuyerSideCompletion OK', `${car.name} за ${finalPrice}`);
            } catch (e) {
                _log('_applyBuyerSideCompletion EXCEPTION', e.message);
            }
        },

        async rejectOffer(offerId) {
            const profile = _getMyProfile();
            if (!profile) return { success: false, error: 'Не авторизован' };

            const ready = await _ensureReady();
            if (!ready) return { success: false, error: 'Нет связи' };
            const { db, fns } = ready;

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
                if (_isDevMode()) canReject = true;

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
                const pushMgr = window.FB_Notifications?.P2P;
                if (pushMgr?.notifyOfferDeclined) {
                    pushMgr.notifyOfferDeclined(toUser, {
                        carName: offer.lotName || "Объект",
                        responderName: profile.name || "Участник торга"
                    }).catch(err => console.warn('[P2POffers] Push error:', err));
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

        async counterOffer(offerId, counterPrice, message = '') {
            const profile = _getMyProfile();
            if (!profile) return { success: false, error: 'Не авторизован' };

            const cp = Number(counterPrice);
            if (!cp || cp < 1000) return { success: false, error: 'Некорректная встречная цена' };

            const ready = await _ensureReady();
            if (!ready) return { success: false, error: 'Нет связи' };
            const { db, fns } = ready;

            try {
                const offerRef = fns.doc(db, OFFER_CONFIG.collectionName, offerId);
                const snap = await fns.getDoc(offerRef);
                if (!snap.exists()) return { success: false, error: 'Оффер не найден' };

                const offer = snap.data();

                if (!_isDevMode() && String(offer.sellerId) !== String(profile.id)) {
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

        async cancelOffer(offerId, reason = '') {
            const profile = _getMyProfile();
            if (!profile) return { success: false, error: 'Не авторизован' };

            const ready = await _ensureReady();
            if (!ready) return { success: false, error: 'Нет связи' };
            const { db, fns } = ready;

            try {
                const offerRef = fns.doc(db, OFFER_CONFIG.collectionName, offerId);
                const snap = await fns.getDoc(offerRef);
                if (!snap.exists()) return { success: false, error: 'Оффер не найден' };

                const offer = snap.data();
                const isSeller = String(offer.sellerId) === String(profile.id);
                const isBuyer  = String(offer.buyerId) === String(profile.id);

                if (!_isDevMode() && !isSeller && !isBuyer) {
                    return { success: false, error: 'Вы не участник этого торга' };
                }

                if (offer.status === OFFER_STATUSES.ACCEPTED) {
                    return { success: false, error: 'Оффер уже принят — отменить нельзя' };
                }
                if (offer.status === OFFER_STATUSES.COMPLETED) {
                    return { success: false, error: 'Сделка уже завершена — отменить нельзя' };
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

        async buyerAcceptCounter(offerId) {
            return this.acceptOffer(offerId);
        },

        async buyerRejectCounter(offerId) {
            return this.rejectOffer(offerId);
        },

        async markCompleted(offerId) {
            const ready = await _ensureReady();
            if (!ready) return { success: false };
            const { db, fns } = ready;

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

        async fetchOffer(offerId) {
            const ready = await _ensureReady();
            if (!ready) return null;
            const { db, fns } = ready;

            try {
                const snap = await fns.getDoc(fns.doc(db, OFFER_CONFIG.collectionName, offerId));
                return snap.exists() ? { id: snap.id, ...snap.data() } : null;
            } catch (e) {
                console.warn('[P2POffers] fetchOffer error:', e);
                return null;
            }
        },

        subscribeToMyOffer(offerId, callback) {
            if (!offerId || typeof callback !== 'function') return () => {};

            if (_offerSubscriptions.has(offerId)) {
                try { _offerSubscriptions.get(offerId)(); } catch (e) {}
                _offerSubscriptions.delete(offerId);
            }

            let unsubscribeFn = null;

            _ensureReady().then(ready => {
                if (!ready) return;
                const { db, fns } = ready;

                try {
                    const ref = fns.doc(db, OFFER_CONFIG.collectionName, offerId);
                    unsubscribeFn = fns.onSnapshot(ref, (snap) => {
                        if (!snap.exists()) {
                            callback(null);
                            return;
                        }
                        const data = { id: snap.id, ...snap.data() };
                        try { callback(data); } catch (e) {}
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

        subscribeToIncomingOffers(userId, callback) {
            if (!userId || typeof callback !== 'function') return () => {};

            if (_incomingSubscriptions.has(userId)) {
                try { _incomingSubscriptions.get(userId)(); } catch (e) {}
                _incomingSubscriptions.delete(userId);
            }

            let unsubscribeFn = null;

            _ensureReady().then(ready => {
                if (!ready) return;
                const { db, fns } = ready;

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
                            sellerId: String(userId),
                            statuses: ACTIVE_STATUSES
                        });

                        try { callback(offers); } catch (e) {}
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

        async fetchIncomingOffers(userId) {
            const ready = await _ensureReady();
            if (!ready) return [];
            const { db, fns } = ready;

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
                    sellerId: String(userId),
                    statuses: ACTIVE_STATUSES
                });
            } catch (e) {
                return [];
            }
        },

        async fetchMyOffers(userId) {
            const ready = await _ensureReady();
            if (!ready) return [];
            const { db, fns } = ready;

            try {
                const q = fns.query(
                    fns.collection(db, OFFER_CONFIG.collectionName),
                    fns.where('buyerId', '==', String(userId)),
                    fns.limit(OFFER_CONFIG.fetchLimit)
                );
                const snap = await fns.getDocs(q);
                const raw = [];
                snap.forEach(d => raw.push({ id: d.id, ...d.data() }));

                return _filterOffersClientSide(raw, { buyerId: String(userId) });
            } catch (e) {
                return [];
            }
        },

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
                default:                       return '❓ Неизвестно';
            }
        },

        startAutoExpire() {
            if (_expireInterval) clearInterval(_expireInterval);
            _expireInterval = setInterval(() => {
                this.expireOldOffers().catch(() => {});
            }, OFFER_CONFIG.expireCheckMs);
        },

        stopAutoExpire() {
            if (_expireInterval) {
                clearInterval(_expireInterval);
                _expireInterval = null;
            }
        },

        async expireOldOffers() {
            const ready = await _ensureReady();
            if (!ready) return { expired: 0 };
            const { db, fns } = ready;

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
                    } catch (e) {}
                }
                return { expired: count };
            } catch (e) {
                return { expired: 0 };
            }
        }
    };

    // ========================================================
    // 5. ЭКСПОРТ И ИНТЕГРАЦИЯ
    // ========================================================
    window.P2POffersManager = P2POffersManager;
    window.P2P_OFFER_CONFIG = OFFER_CONFIG;
    window.P2P_OFFER_STATUSES = OFFER_STATUSES;

    if (window.FB_Bridge) {
        window.FB_Bridge.Offers = P2POffersManager;
    }

    // ========================================================
    // 6. UI МОДАЛКА ТОРГА ПОКУПАТЕЛЯ (ГАРАНТИРОВАННОЕ ОТОБРАЖЕНИЕ)
    // ========================================================
    window.openP2PDealModal = async function(lotId) {
        if (!lotId) return;

        let profile = _getMyProfile();
        if (!profile) {
            _toast('❌ Не авторизован');
            return;
        }

        let lot = _findLot(lotId);

        if (!lot && window.FB_Bridge?.MarketLots?.fetchLots) {
            try {
                const remoteLots = await window.FB_Bridge.MarketLots.fetchLots();
                lot = (remoteLots || []).find(l => l && (String(l.lot_id) === String(lotId) || String(l.id) === String(lotId)));
            } catch (e) {
                console.warn('[P2POffers] openP2PDealModal fetchLots:', e);
            }
        }

        if (!lot) {
            _toast('❌ Лот не найден или снят с продажи');
            return;
        }

        const sellerId = String(lot.sellerId || '');
        if (!_isDevMode() && sellerId === String(profile.id)) {
            _toast('❌ Это ваш собственный лот');
            return;
        }

        if (!_isDevMode() && !P2POffersManager.canSendNewOffer(profile.id, String(lotId))) {
            const waitSec = Math.ceil(P2POffersManager.getCooldownRemaining(profile.id, String(lotId)) / 1000);
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

        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.zIndex = '999999';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.background = 'rgba(0, 0, 0, 0.85)';
        modal.style.backdropFilter = 'blur(8px)';
        modal.classList.add('active');

        const rawImg = lot.itemData?.img || lot.img || 'assets/cars/economy/2101/vaz-2101.jpg';

        modal.innerHTML = `
            <style>
                @keyframes offerPulse {
                    0% { box-shadow: 0 0 5px rgba(0,242,254,0.2); }
                    100% { box-shadow: 0 0 20px rgba(0,242,254,0.7); }
                }
                .quick-offer-btn {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    color: #fff;
                    font-weight: 800;
                    padding: 6px 0;
                    font-size: 10px;
                    transition: all 0.2s;
                }
                .quick-offer-btn:hover {
                    background: rgba(0,242,254,0.15);
                    border-color: var(--cyan);
                    color: var(--cyan);
                }
            </style>
            <div class="modal-box" style="max-width: 420px; width:92%; border: 1.5px solid var(--cyan); box-shadow: 0 0 30px rgba(0,242,254,0.3); background:#090e18; border-radius:12px; padding:16px;">
                <div class="flex-between mb-3" style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="modal-glow-badge">
                        <i class="fa-solid fa-comments-dollar"></i> ТОРГ С ПРОДАВЦОМ ${_isDevMode() && sellerId === String(profile.id) ? '<span style="color:var(--amber); font-size:10px;">(DEV)</span>' : ''}
                    </div>
                    <button onclick="document.getElementById('modalP2PBuyerOffer').style.display='none'; document.getElementById('modalP2PBuyerOffer').classList.remove('active');" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                <div class="glass-card p-2 mb-3" style="background: #060a14; border: 1px solid rgba(255,255,255,0.08); display:flex; gap:10px; align-items:center; border-radius:8px;">
                    <div style="width:60px; height:45px; border-radius:6px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); flex-shrink:0;">
                        <img src="${rawImg}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div>
                        <b class="text-xs color-cyan">${safeEscape(lot.name || 'Автомобиль')}</b>
                        <div class="sub-label mt-1" style="font-size:9px;">
                            Продавец: <b class="color-amber">${safeEscape(lot.sellerName || 'Игрок сети')}</b>
                        </div>
                        <div class="flex-between mt-1">
                            <span class="sub-label" style="font-size:8px;">Цена лота:</span>
                            <b class="color-green" style="font-size:12px;">${lotPrice.toLocaleString()} ₽</b>
                        </div>
                    </div>
                </div>

                <!-- Шкала терпения (визуальная) -->
                <div class="mb-3">
                    <div class="flex-between text-xs mb-1" style="font-size:9px; display:flex; justify-content:space-between;">
                        <span class="sub-label">Терпение продавца:</span>
                        <b class="color-green">100%</b>
                    </div>
                    <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                        <div style="width:100%; height:100%; background:linear-gradient(90deg, #00e676, #00f2fe); animation: offerPulse 2s infinite alternate;"></div>
                    </div>
                </div>

                <div class="sub-label mb-1" style="font-size:9.5px;">
                    Ваше предложение (от 1,000 ₽ до ${lotPrice.toLocaleString()} ₽):
                </div>
                <input type="number" id="p2pBuyerPriceInput"
                       class="chat-input"
                       style="width:100%; font-size:18px; padding:12px; margin-bottom:8px; text-align:center; font-weight:900; color:var(--green); background:#060a14; border:1px solid rgba(0,242,254,0.3); border-radius:6px;"
                       value="${suggestedPrice}" min="1000" max="${lotPrice}">

                <!-- Быстрые кнопки -->
                <div class="grid-3 mb-3" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:6px; margin-bottom:12px;">
                    <button class="quick-offer-btn" onclick="window._setP2POfferPrice(${lotPrice}, 0.95)">-5%</button>
                    <button class="quick-offer-btn" onclick="window._setP2POfferPrice(${lotPrice}, 0.90)">-10%</button>
                    <button class="quick-offer-btn" onclick="window._setP2POfferPrice(${lotPrice}, 1.0)">Цена лота</button>
                </div>

                <div class="sub-label mb-1" style="font-size:9.5px;">
                    Сообщение продавцу (опционально):
                </div>
                <input type="text" id="p2pBuyerMsgInput"
                       class="chat-input"
                       style="width:100%; font-size:12px; padding:10px; margin-bottom:12px; background:#060a14; border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff;"
                       maxlength="200"
                       placeholder="Даю прямо сейчас, оформляем ДКП!">

                <div class="glass-card p-2 mb-3" style="background:#090e18; border-radius:6px; margin-bottom:12px;">
                    <div class="flex-between text-xs" style="display:flex; justify-content:space-between;">
                        <span class="sub-label">Ваш баланс:</span>
                        <b class="${myCash >= lotPrice ? 'color-green' : 'color-amber'}">${myCash.toLocaleString()} ₽</b>
                    </div>
                    <div class="flex-between text-xs mt-1" style="display:flex; justify-content:space-between; margin-top:4px;">
                        <span class="sub-label">Срок оффера:</span>
                        <b class="color-cyan">30 минут на ответ</b>
                    </div>
                </div>

                <div class="grid-2" style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                    <button onclick="document.getElementById('modalP2PBuyerOffer').style.display='none'; document.getElementById('modalP2PBuyerOffer').classList.remove('active');" class="btn btn-dark">
                        Отмена
                    </button>
                    <button onclick="window._submitP2PBuyerOffer('${lot.id || lot.lot_id}')" class="btn btn-green font-bold" style="box-shadow: 0 0 15px rgba(0,230,118,0.4);">
                        <i class="fa-solid fa-paper-plane mr-1"></i> ОТПРАВИТЬ
                    </button>
                </div>
            </div>
        `;

        if (window.AudioFx) window.AudioFx.play('tick');
    };

    window._setP2POfferPrice = function(lotPrice, multiplier) {
        const input = document.getElementById('p2pBuyerPriceInput');
        if (!input) return;
        const newPrice = Math.round(lotPrice * multiplier);
        input.value = newPrice;
        input.style.transform = 'scale(1.05)';
        input.style.transition = 'transform 0.1s';
        setTimeout(() => { input.style.transform = 'scale(1)'; }, 100);
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

        let lot = _findLot(lotId);
        const lotPrice = Number(lot?.price || 0);
        if (lotPrice > 0 && price > lotPrice) {
            return _toast(`❌ Цена не выше ${lotPrice.toLocaleString()} ₽`);
        }

        const m = document.getElementById('modalP2PBuyerOffer');
        if (m) {
            m.style.display = 'none';
            m.classList.remove('active');
        }

        const res = await P2POffersManager.createOffer(String(lotId), price, msg);

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

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => P2POffersManager.startAutoExpire(), 5000);
            });
        } else {
            setTimeout(() => P2POffersManager.startAutoExpire(), 5000);
        }
    }

    console.log('[🤝 p2p-offers v1.5.3] Торг и модалка предложений синхронизированы ✓');
})();
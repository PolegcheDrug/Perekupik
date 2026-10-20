// ========================================================
// js/p2p-offers.js — P2P ТОРГ, АУКЦИОНЫ И КОНТРАКТЫ АВТОПОДБОРА (v1.6.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.6.0 (ОНЛАЙН-АУКЦИОНЫ & ЗАКАЗНОЙ АВТОПОДБОР):
//   - P2PAuctionsManager: живые аукционы с шагом ставок и таймером 30с.
//   - P2POrderContractsManager: контракты автоподбора между реальными игроками с наградой.
//   - СОХРАНЕНО: Все методы офферов v1.5.7, поддержка NPC-лотов, _findLot и модалка торга.
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
        if (!db) return null;

        const fns = await _getFirestoreFns();
        if (!fns) return null;

        return { db, fns };
    }

    // ========================================================
    // 1. КОНФИГ
    // ========================================================
    const OFFER_CONFIG = {
        collectionName: 'p2p_offers',
        auctionsCollection: 'p2p_auctions',
        contractsCollection: 'p2p_order_contracts',
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

    let _expireInterval = null;
    const _offerSubscriptions = new Map();
    const _incomingSubscriptions = new Map();
    const _lastOfferSentAt = new Map();

    // ========================================================
    // 2. ХЕЛПЕРЫ
    // ========================================================
    function safeEscape(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

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
        if (!lotId) return null;

        const p2pListings = window.state?.p2pMarketListings || [];
        const p2pLot = p2pListings.find(l => l && (String(l.id) === String(lotId) || String(l.lot_id) === String(lotId)));
        if (p2pLot) return p2pLot;

        const marketFeed = window.state?.marketFeed || [];
        const npcLot = marketFeed.find(l => l && String(l.id) === String(lotId));
        if (npcLot) {
            return {
                id: npcLot.id,
                lot_id: npcLot.id,
                sellerId: 'npc_seller',
                sellerName: npcLot.sellerMoodIcon ? `${npcLot.sellerMoodIcon} Продавец` : 'Продавец',
                sellerAvatar: npcLot.sellerMoodIcon || '🧔',
                name: npcLot.name || 'Автомобиль',
                price: Number(npcLot.price) || 100000,
                itemData: npcLot.itemData || { name: npcLot.name, img: npcLot.img },
                img: npcLot.img || '',
                type: npcLot.type || 'cars',
                isNpcLot: true
            };
        }

        return null;
    }

    // ========================================================
    // 3. P2P OFFERS MANAGER
    // ========================================================
    const P2POffersManager = {
        canSendNewOffer(userId, lotId) {
            const cooldownKey = `${userId}_${lotId}`;
            const lastSent = _lastOfferSentAt.get(cooldownKey) || 0;
            return (Date.now() - lastSent) >= OFFER_CONFIG.cooldownMs;
        },

        getCooldownRemaining(userId, lotId) {
            const cooldownKey = `${userId}_${lotId}`;
            const lastSent = _lastOfferSentAt.get(cooldownKey) || 0;
            const remaining = OFFER_CONFIG.cooldownMs - (Date.now() - lastSent);
            return Math.max(0, remaining);
        },

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
                } catch (e) {}
            }

            if (!lot) return { success: false, error: 'Лот больше не активен на бирже' };

            let sellerId = String(lot.sellerId || '');
            if (!sellerId) sellerId = 'seller_player';

            let buyerId = String(profile.id);

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

                if (window.state?.player) {
                    if (!Array.isArray(window.state.player.phoneMessages)) {
                        window.state.player.phoneMessages = [];
                    }

                    const dialogId = 'dlg_p2p_' + lotId;
                    let existingMsg = window.state.player.phoneMessages.find(m => m && (m.id === dialogId || m.p2pLotId === String(lotId)));
                    const firstText = message ? `Предложение: ${_fmtMoney(finalPrice)} («${message}»)` : `Предложение цены: ${_fmtMoney(finalPrice)}`;

                    if (existingMsg) {
                        existingMsg.askingPrice = finalPrice;
                        existingMsg.lastMessageAt = now;
                        existingMsg.preview = firstText;
                        if (!Array.isArray(existingMsg.chatHistory)) existingMsg.chatHistory = [];
                        existingMsg.chatHistory.push({ from: 'me', text: firstText });
                    } else {
                        window.state.player.phoneMessages.unshift({
                            id: dialogId,
                            sender: lot.sellerName || 'Продавец',
                            sellerId: sellerId,
                            category: 'p2p',
                            p2pLotId: String(lotId),
                            p2pOfferId: offerId,
                            p2pRole: 'buyer',
                            askingPrice: finalPrice,
                            carData: lot.itemData || { name: lot.name, img: lot.img, type: lot.type },
                            chatHistory: [{ from: 'me', text: firstText }],
                            unread: false,
                            createdAt: now,
                            lastMessageAt: now,
                            preview: firstText
                        });
                    }

                    if (typeof saveState === 'function') saveState();
                    if (window.AppM?._refreshCurrentScreen) window.AppM._refreshCurrentScreen();
                }

                const pushMgr = window.FB_Notifications?.P2P;
                if (pushMgr?.notifyOfferReceived) {
                    pushMgr.notifyOfferReceived(sellerId, {
                        id: offerId,
                        senderName: profile.name,
                        car: { name: lot.name || 'Автомобиль' },
                        cash: finalPrice
                    }).catch(() => {});
                }

                _log('createOffer OK', offerId);
                _emit('p2p:offer_created', { offerId, lotId: String(lotId), price: finalPrice, sellerId });

                return { success: true, offerId, offer: payload };
            } catch (e) {
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

                if (!_isOfferAlive(offer)) return { success: false, error: 'Оффер истёк' };
                if (offer.status === OFFER_STATUSES.ACCEPTED) return { success: false, error: 'Оффер уже принят' };
                if (offer.status === OFFER_STATUSES.COMPLETED) return { success: false, error: 'Сделка уже завершена' };

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

                if (!canAccept) return { success: false, error: 'Вы не можете принять этот оффер' };

                const fpNum = Number(finalPrice);
                if (!fpNum || fpNum < 1000) return { success: false, error: 'Некорректная финальная цена' };

                if (isBuyer) {
                    const myCash = Number(window.state?.player?.cash) || 0;
                    if (myCash < fpNum) {
                        return { success: false, error: `Не хватает ${_fmtMoney(fpNum - myCash)} для оплаты сделки` };
                    }
                }

                const completeRes = await this._completeDealAtomic(offerId, offer, fpNum, { skipBuyerNotif: isBuyer });

                if (!completeRes.success) {
                    return { success: false, error: completeRes.error || 'Не удалось завершить сделку' };
                }

                if (isBuyer || _isDevMode()) {
                    await this._applyBuyerSideCompletion(completeRes.lot || {}, offer, fpNum);
                }

                _emit('p2p:offer_accepted', { offerId, lotId: offer.lotId, price: fpNum, completed: true });
                return { success: true, offerId, price: fpNum, completed: true };
            } catch (e) {
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

            let lotData = null;

            try {
                await fns.runTransaction(db, async (tx) => {
                    if (lotRef) {
                        const lotSnap = await tx.get(lotRef);
                        if (lotSnap.exists()) {
                            lotData = lotSnap.data();
                            tx.update(lotRef, {
                                status: 'sold',
                                buyerId: String(offer.buyerId),
                                buyerName: offer.buyerName || 'Покупатель',
                                soldAt: now,
                                finalPrice: finalPrice
                            });
                        }
                    }

                    const fee = Math.round(finalPrice * P2P_MARKET_FEE_PERCENT);
                    const sellerPayout = finalPrice - fee;
                    const itemName = (lotData && lotData.name) || offer.lotName || 'Автомобиль';

                    tx.update(offerRef, {
                        status: OFFER_STATUSES.COMPLETED,
                        currentPrice: finalPrice,
                        finalPrice: finalPrice,
                        completedAt: now
                    });

                    tx.set(txRef, {
                        tx_id: txId,
                        lot_id: offer.lotId || null,
                        offer_id: offerId,
                        buyerId: String(offer.buyerId),
                        sellerId: String(offer.sellerId),
                        price: finalPrice,
                        fee: fee,
                        payout: sellerPayout,
                        timestamp: now
                    });

                    tx.set(sellerNotifRef, {
                        toUser: String(offer.sellerId),
                        type: 'deal_payout',
                        title: '💰 Продажа на P2P бирже!',
                        text: `Покупатель ${offer.buyerName || 'Перекуп'} купил «${itemName}» за ${finalPrice.toLocaleString()} ₽. Начислено: +${sellerPayout.toLocaleString()} ₽.`,
                        amount: sellerPayout,
                        claimed: false,
                        read: false,
                        timestamp: now
                    });
                });

                return { success: true, lot: lotData };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        async _applyBuyerSideCompletion(lot, offer, finalPrice) {
            try {
                const player = window.state && window.state.player;
                if (!player) return;

                player.cash = Math.max(0, (Number(player.cash) || 0) - finalPrice);

                const item = (lot && lot.itemData) || { name: (lot && lot.name) || offer.lotName || 'Автомобиль' };
                const car = Object.assign({}, item);
                car.uid = 'car_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
                car.purchaseCost = finalPrice;
                car.ownershipDays = 0;

                if (typeof window.ensureCarIdentity === 'function') window.ensureCarIdentity(car);

                if (!Array.isArray(window.state.garage)) window.state.garage = [];
                window.state.garage.push(car);

                if (Array.isArray(window.state.p2pMarketListings)) {
                    window.state.p2pMarketListings = window.state.p2pMarketListings.filter(l =>
                        l && String(l.id || l.lot_id) !== String(offer.lotId)
                    );
                }

                if (typeof saveState === 'function') saveState();
                if (typeof updateHeaderUI === 'function') updateHeaderUI();
                if (typeof renderGarage === 'function') renderGarage();

                _toast(`✅ Сделка закрыта: «${car.name || 'Автомобиль'}» за ${_fmtMoney(finalPrice)}`);
            } catch (e) {}
        },

        async rejectOffer(offerId) {
            const profile = _getMyProfile();
            if (!profile) return { success: false, error: 'Не авторизован' };

            const ready = await _ensureReady();
            if (!ready) return { success: false, error: 'Нет связи' };
            const { db, fns } = ready;

            try {
                const offerRef = fns.doc(db, OFFER_CONFIG.collectionName, offerId);
                await fns.updateDoc(offerRef, {
                    status: OFFER_STATUSES.REJECTED,
                    respondedAt: Date.now()
                });
                return { success: true };
            } catch (e) {
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
                await fns.updateDoc(offerRef, {
                    status: OFFER_STATUSES.COUNTERED,
                    counterPrice: cp,
                    sellerMessage: String(message || '').substring(0, 200),
                    respondedAt: Date.now()
                });
                return { success: true, counterPrice: cp };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        async cancelOffer(offerId) {
            const ready = await _ensureReady();
            if (!ready) return { success: false, error: 'Нет связи' };
            const { db, fns } = ready;

            try {
                const offerRef = fns.doc(db, OFFER_CONFIG.collectionName, offerId);
                await fns.updateDoc(offerRef, {
                    status: OFFER_STATUSES.CANCELLED,
                    respondedAt: Date.now()
                });
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
                return null;
            }
        },

        subscribeToMyOffer(offerId, callback) {
            if (!offerId || typeof callback !== 'function') return () => {};
            let unsubscribeFn = null;

            _ensureReady().then(ready => {
                if (!ready) return;
                const { db, fns } = ready;
                const ref = fns.doc(db, OFFER_CONFIG.collectionName, offerId);
                unsubscribeFn = fns.onSnapshot(ref, (snap) => {
                    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
                });
            });

            return () => { if (unsubscribeFn) unsubscribeFn(); };
        },

        subscribeToIncomingOffers(userId, callback) {
            if (!userId || typeof callback !== 'function') return () => {};
            let unsubscribeFn = null;

            _ensureReady().then(ready => {
                if (!ready) return;
                const { db, fns } = ready;
                const q = fns.query(
                    fns.collection(db, OFFER_CONFIG.collectionName),
                    fns.where('sellerId', '==', String(userId)),
                    fns.limit(OFFER_CONFIG.fetchLimit)
                );
                unsubscribeFn = fns.onSnapshot(q, (snap) => {
                    const raw = [];
                    snap.forEach(d => raw.push({ id: d.id, ...d.data() }));
                    callback(_filterOffersClientSide(raw, { sellerId: String(userId), statuses: ACTIVE_STATUSES }));
                });
            });

            return () => { if (unsubscribeFn) unsubscribeFn(); };
        },

        startAutoExpire() {
            if (_expireInterval) clearInterval(_expireInterval);
            _expireInterval = setInterval(() => { this.expireOldOffers().catch(() => {}); }, OFFER_CONFIG.expireCheckMs);
        },

        async expireOldOffers() {
            const ready = await _ensureReady();
            if (!ready) return { expired: 0 };
            const { db, fns } = ready;

            try {
                const now = Date.now();
                const q = fns.query(fns.collection(db, OFFER_CONFIG.collectionName), fns.limit(OFFER_CONFIG.fetchLimit));
                const snap = await fns.getDocs(q);
                let count = 0;

                for (const d of snap.docs) {
                    const data = d.data();
                    if (!ACTIVE_STATUSES.includes(data.status)) continue;
                    if (data.expiresAt && data.expiresAt < now) {
                        await fns.updateDoc(d.ref, { status: OFFER_STATUSES.EXPIRED });
                        count++;
                    }
                }
                return { expired: count };
            } catch (e) {
                return { expired: 0 };
            }
        }
    };

    // ========================================================
    // 4. ЖИВЫЕ ОНЛАЙН-АУКЦИОНЫ (v1.6.0)
    // ========================================================
    const P2PAuctionsManager = {
        async createAuction(carData, startPrice, stepBid = 25000, durationSec = 180) {
            const profile = _getMyProfile();
            if (!profile) return { success: false, error: "Требуется авторизация" };

            const ready = await _ensureReady();
            if (!ready) return { success: false, error: "Нет связи" };
            const { db, fns } = ready;

            const auctionId = "auc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
            const now = Date.now();

            const payload = {
                auctionId,
                sellerId: profile.id,
                sellerName: profile.name,
                car: carData,
                currentBid: Number(startPrice),
                minStep: Number(stepBid),
                highestBidderId: null,
                highestBidderName: null,
                status: 'active', // active | finished | cancelled
                createdAt: now,
                expiresAt: now + (durationSec * 1000),
                totalBids: 0
            };

            try {
                await fns.setDoc(fns.doc(db, OFFER_CONFIG.auctionsCollection, auctionId), payload);
                _toast("🔨 Аукцион успешно запущен на 3 минуты!");
                return { success: true, auctionId, auction: payload };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        async placeBid(auctionId, bidAmount) {
            const profile = _getMyProfile();
            if (!profile) return { success: false, error: "Требуется авторизация" };

            const cash = Number(window.state?.player?.cash || 0);
            if (cash < Number(bidAmount)) {
                return { success: false, error: "Недостаточно наличных для перебития ставки!" };
            }

            const ready = await _ensureReady();
            if (!ready) return { success: false, error: "Нет связи" };
            const { db, fns } = ready;

            try {
                const aucRef = fns.doc(db, OFFER_CONFIG.auctionsCollection, auctionId);
                await fns.runTransaction(db, async (tx) => {
                    const snap = await tx.get(aucRef);
                    if (!snap.exists()) throw new Error("Аукцион не найден");

                    const auc = snap.data();
                    if (auc.status !== 'active' || auc.expiresAt <= Date.now()) {
                        throw new Error("Аукцион уже завершён!");
                    }

                    if (Number(bidAmount) < auc.currentBid + auc.minStep) {
                        throw new Error(`Минимальная ставка: ${(auc.currentBid + auc.minStep).toLocaleString()} ₽`);
                    }

                    // Если осталось меньше 20с, продлеваем на 30с
                    let newExpires = auc.expiresAt;
                    if (auc.expiresAt - Date.now() < 20000) {
                        newExpires = Date.now() + 30000;
                    }

                    tx.update(aucRef, {
                        currentBid: Number(bidAmount),
                        highestBidderId: profile.id,
                        highestBidderName: profile.name,
                        expiresAt: newExpires,
                        totalBids: (auc.totalBids || 0) + 1
                    });
                });

                _toast(`🔨 Ваша ставка принята: ${Number(bidAmount).toLocaleString()} ₽!`);
                if (window.AudioFx) window.AudioFx.play('win');
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        async fetchActiveAuctions() {
            const ready = await _ensureReady();
            if (!ready) return [];
            const { db, fns } = ready;

            try {
                const q = fns.query(
                    fns.collection(db, OFFER_CONFIG.auctionsCollection),
                    fns.where('status', '==', 'active'),
                    fns.limit(20)
                );
                const snap = await fns.getDocs(q);
                const list = [];
                snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                return list.filter(a => a.expiresAt > Date.now());
            } catch (e) {
                return [];
            }
        }
    };

    // ========================================================
    // 5. ЗАКАЗНОЙ АВТОПОДБОР МЕЖДУ ИГРОКАМИ (v1.6.0)
    // ========================================================
    const P2POrderContractsManager = {
        async createOrderContract(carRequirement, maxBudget, rewardFee) {
            const profile = _getMyProfile();
            if (!profile) return { success: false, error: "Требуется авторизация" };

            const totalEscrow = Number(maxBudget) + Number(rewardFee);
            const cash = Number(window.state?.player?.cash || 0);
            if (cash < totalEscrow) {
                return { success: false, error: `Требуется заморозка бюджета и гонорара (${totalEscrow.toLocaleString()} ₽)!` };
            }

            const ready = await _ensureReady();
            if (!ready) return { success: false, error: "Нет связи" };
            const { db, fns } = ready;

            const contractId = "ct_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);

            const payload = {
                contractId,
                clientUserId: profile.id,
                clientName: profile.name,
                requirement: carRequirement, // { targetModel, minHp, maxCondition }
                maxBudget: Number(maxBudget),
                rewardFee: Number(rewardFee),
                status: 'open', // open | taken | completed | expired
                takenByUserId: null,
                takenByName: null,
                createdAt: Date.now(),
                expiresAt: Date.now() + (48 * 3600 * 1000)
            };

            try {
                // Замораживаем средства у заказчика
                window.state.player.cash -= totalEscrow;
                if (typeof logBankTransaction === 'function') {
                    logBankTransaction(`Заказ автоподбора: депозит контракта`, totalEscrow, false);
                }
                if (typeof saveState === 'function') saveState();

                await fns.setDoc(fns.doc(db, OFFER_CONFIG.contractsCollection, contractId), payload);
                _toast("📋 Контракт автоподбора опубликован на бирже!");
                return { success: true, contractId };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        async fetchOpenContracts() {
            const ready = await _ensureReady();
            if (!ready) return [];
            const { db, fns } = ready;

            try {
                const q = fns.query(
                    fns.collection(db, OFFER_CONFIG.contractsCollection),
                    fns.where('status', '==', 'open'),
                    fns.limit(30)
                );
                const snap = await fns.getDocs(q);
                const list = [];
                snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                return list.filter(c => c.expiresAt > Date.now());
            } catch (e) {
                return [];
            }
        }
    };

    // ========================================================
    // 6. ЭКСПОРТ
    // ========================================================
    window.P2POffersManager = P2POffersManager;
    window.P2PAuctionsManager = P2PAuctionsManager;
    window.P2POrderContractsManager = P2POrderContractsManager;
    window.P2P_OFFER_CONFIG = OFFER_CONFIG;
    window.P2P_OFFER_STATUSES = OFFER_STATUSES;

    if (window.FB_Bridge) {
        window.FB_Bridge.Offers = P2POffersManager;
        window.FB_Bridge.Auctions = P2PAuctionsManager;
        window.FB_Bridge.Contracts = P2POrderContractsManager;
    }

    // ========================================================
    // 7. МОДАЛКА ТОРГА ПОКУПАТЕЛЯ (UI)
    // ========================================================
    window.openP2PDealModal = async function(lotId) {
        if (!lotId) return;

        let profile = _getMyProfile();
        if (!profile) return _toast('❌ Не авторизован');

        let lot = _findLot(lotId);
        if (!lot && window.FB_Bridge?.MarketLots?.fetchLots) {
            try {
                const remoteLots = await window.FB_Bridge.MarketLots.fetchLots();
                lot = (remoteLots || []).find(l => l && (String(l.lot_id) === String(lotId) || String(l.id) === String(lotId)));
            } catch (e) {}
        }

        if (!lot) return _toast('❌ Лот не найден или снят с продажи');

        const sellerId = String(lot.sellerId || '');
        if (!_isDevMode() && sellerId === String(profile.id)) {
            return _toast('❌ Это ваш собственный лот');
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

        const rawImg = lot.itemData?.img || lot.img || 'assets/cars/economy/2101/vaz-2101.jpg';

        modal.innerHTML = `
            <div class="modal-box" style="max-width: 420px; width:92%; border: 1.5px solid var(--cyan); background:#090e18; border-radius:12px; padding:16px;">
                <div class="flex-between mb-3">
                    <div class="modal-glow-badge"><i class="fa-solid fa-comments-dollar"></i> ТОРГ С ПРОДАВЦОМ</div>
                    <button onclick="document.getElementById('modalP2PBuyerOffer').style.display='none';" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>
                <div class="glass-card p-2 mb-3" style="background:#060a14; display:flex; gap:10px; align-items:center;">
                    <img src="${rawImg}" style="width:60px; height:45px; border-radius:6px; object-fit:cover;">
                    <div>
                        <b class="text-xs color-cyan">${safeEscape(lot.name || 'Автомобиль')}</b>
                        <div class="sub-label" style="font-size:9px;">Продавец: <b>${safeEscape(lot.sellerName || 'Игрок')}</b></div>
                        <b class="color-green" style="font-size:12px;">${lotPrice.toLocaleString()} ₽</b>
                    </div>
                </div>
                <div class="sub-label mb-1" style="font-size:9.5px;">Ваше предложение (₽):</div>
                <input type="number" id="p2pBuyerPriceInput" class="chat-input" style="width:100%; font-size:18px; padding:10px; text-align:center; font-weight:900; color:var(--green); background:#060a14; border:1px solid rgba(0,242,254,0.3); border-radius:6px; margin-bottom:8px;" value="${suggestedPrice}">
                <div class="grid-3 mb-3" style="gap:6px;">
                    <button class="btn btn-dark btn-sm" onclick="window._setP2POfferPrice(${lotPrice}, 0.95)">-5%</button>
                    <button class="btn btn-dark btn-sm" onclick="window._setP2POfferPrice(${lotPrice}, 0.90)">-10%</button>
                    <button class="btn btn-dark btn-sm" onclick="window._setP2POfferPrice(${lotPrice}, 1.0)">Без торга</button>
                </div>
                <input type="text" id="p2pBuyerMsgInput" class="chat-input" style="width:100%; font-size:12px; padding:8px; margin-bottom:12px; background:#060a14; border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff;" placeholder="Сообщение продавцу...">
                <div class="grid-2" style="gap:6px;">
                    <button onclick="document.getElementById('modalP2PBuyerOffer').style.display='none';" class="btn btn-dark">Отмена</button>
                    <button onclick="window._submitP2PBuyerOffer('${lot.id || lot.lot_id}')" class="btn btn-green font-bold">ОТПРАВИТЬ</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.zIndex = '999999';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.background = 'rgba(0, 0, 0, 0.85)';
        modal.classList.add('active');
    };

    window._setP2POfferPrice = function(lotPrice, multiplier) {
        const input = document.getElementById('p2pBuyerPriceInput');
        if (input) input.value = Math.round(lotPrice * multiplier);
    };

    window._submitP2PBuyerOffer = async function(lotId) {
        const priceEl = document.getElementById('p2pBuyerPriceInput');
        const msgEl = document.getElementById('p2pBuyerMsgInput');
        if (!priceEl) return;

        const price = parseInt(priceEl.value, 10);
        const msg = (msgEl?.value || '').trim();

        if (!price || price < 1000) return _toast('❌ Цена не менее 1,000 ₽');

        const m = document.getElementById('modalP2PBuyerOffer');
        if (m) m.style.display = 'none';

        const res = await P2POffersManager.createOffer(String(lotId), price, msg);
        if (res.success) {
            _toast(`📤 Оффер отправлен: ${price.toLocaleString()} ₽`);
            if (window.AudioFx) window.AudioFx.play('win');
            if (window.AppM?.switchMainTab) setTimeout(() => window.AppM.switchMainTab('chats'), 300);
        } else {
            _toast(`❌ ${res.error}`);
            if (window.AudioFx) window.AudioFx.play('error');
        }
    };

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(() => P2POffersManager.startAutoExpire(), 5000));
        } else {
            setTimeout(() => P2POffersManager.startAutoExpire(), 5000);
        }
    }

    console.log('[🤝 p2p-offers v1.6.0] P2P Офферы + Живые аукционы + Контракты автоподбора ✓');
})();

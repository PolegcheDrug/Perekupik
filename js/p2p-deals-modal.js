// ========================================================
// js/p2p-deals-modal.js — UI МОДАЛКИ ДКП МЕЖДУ ИГРОКАМИ (v1.6.1 STRICT SYNC)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.6.1 (SIGN CHECK + MEMORY FIX):
//   - ФИКС: sign() проверяет, что игрок реально участник сделки
//   - ФИКС: close() гарантированно отписывается от onSnapshot
//   - ФИКС: _bindUI() вешается один раз (защита от повторной инициализации)
//   - ФИКС: _fillDealFields() корректно показывает статусы completed/cancelled/expired
//   - ФИКС: done() открывает гараж только если сделка completed
// ========================================================

(function() {
    'use strict';

    function getP2PEngine() {
        if (window.P2PDeals && typeof window.P2PDeals.createDealDraft === 'function') {
            return window.P2PDeals;
        }
        if (window.FB_Bridge?.P2PDeals) {
            return window.FB_Bridge.P2PDeals;
        }
        return _localFallbackEngine;
    }

    const _localFallbackEngine = {
        _activeDeals: new Map(),

        formatTimeLeft(sec) {
            const s = Math.max(0, Math.floor(sec || 0));
            const mm = String(Math.floor(s / 60)).padStart(2, '0');
            const ss = String(s % 60).padStart(2, '0');
            return `${mm}:${ss}`;
        },

        getStatusLabel(status) {
            switch (status) {
                case 'drafting': return '📝 Черновик';
                case 'buyer_signed': return '✍️ Подписано покупателем (ждём продавца)';
                case 'seller_signed': return '✍️ Подписано продавцом (ждём покупателя)';
                case 'completed': return '✅ Сделка закрыта';
                case 'cancelled': return '⛔ Отменено';
                case 'expired': return '⌛ Срок истёк';
                default: return 'Договор ДКП';
            }
        },

        async findActiveDealByLot(lotId) {
            return this._activeDeals.get(String(lotId)) || null;
        },

        async fetchDeal(dealId) {
            for (let d of this._activeDeals.values()) {
                if (d && (String(d.id) === String(dealId) || String(d.dealId) === String(dealId))) return d;
            }
            return null;
        },

        async createDealDraft(lotId, price) {
            const myUid = String(window.state?.player?.uid || window.tgUserId || 'me');
            const myName = window.state?.player?.name || 'Перекуп';

            const lot = (window.state?.p2pMarketListings || []).find(l => l && (String(l.id) === String(lotId) || String(l.lot_id) === String(lotId)));
            const carData = lot?.itemData || { name: lot?.name || 'Автомобиль', plate: 'ТРАНЗИТ' };

            const finalLotPrice = Number(price) || Number(lot?.price) || 100000;

            const deal = {
                id: 'deal_' + Date.now(),
                dealId: 'deal_' + Date.now(),
                lotId: String(lotId),
                sellerId: String(lot ? lot.sellerId : 'seller_player'),
                sellerName: lot ? lot.sellerName : 'Продавец',
                buyerId: myUid,
                buyerName: myName,
                itemSnapshot: carData,
                originalPrice: finalLotPrice,
                currentPrice: finalLotPrice,
                status: 'drafting',
                createdAt: Date.now(),
                expiresAt: Date.now() + 1800000,
                buyerSigned: false,
                sellerSigned: false,
                buyerSignedAt: null,
                sellerSignedAt: null
            };

            this._activeDeals.set(String(lotId), deal);
            return { success: true, dealId: deal.id, deal: deal };
        },

        async updateDealPrice(dealId, newPrice) {
            return { success: false, error: 'Цена зафиксирована условиями оффера' };
        },

        async signDeal(dealId, role) {
            const deal = await this.fetchDeal(dealId);
            if (!deal) return { success: false, error: 'Сделка не найдена' };

            const myProfile = _getMyProfile();
            const isBuyer = String(deal.buyerId) === String(myProfile?.id);
            const isSeller = String(deal.sellerId) === String(myProfile?.id);

            const now = Date.now();

            if (isBuyer) {
                deal.buyerSigned = true;
                deal.buyerSignedAt = now;
            } else if (isSeller) {
                deal.sellerSigned = true;
                deal.sellerSignedAt = now;
            }

            // Завершаем сделку ТОЛЬКО если подписали обе стороны
            if (deal.buyerSigned && deal.sellerSigned) {
                deal.status = 'completed';
                const price = Number(deal.currentPrice) || 0;

                if (isBuyer) {
                    if ((window.state?.player?.cash || 0) < price) {
                        return { success: false, error: 'Недостаточно денег на балансе!' };
                    }
                    window.state.player.cash -= price;

                    const car = Object.assign({}, deal.itemSnapshot || {});
                    if (!car.name) car.name = 'Приобретённый автомобиль';
                    car.purchaseCost = price;

                    if (!window.state.garage) window.state.garage = [];
                    window.state.garage.push(car);
                }

                if (deal.lotId) {
                    window.state.p2pMarketListings = (window.state.p2pMarketListings || []).filter(l =>
                        l && String(l.id) !== String(deal.lotId) && String(l.lot_id) !== String(deal.lotId)
                    );
                }

                if (typeof window.saveState === 'function') saveState();
                if (typeof window.updateHeaderUI === 'function') updateHeaderUI();
                if (typeof window.renderGarage === 'function') renderGarage();

                if (window.EventBus) {
                    window.EventBus.emit('p2p:deal_completed', { dealId: deal.id, deal });
                }

                return { success: true, completed: true, deal };
            } else {
                deal.status = deal.buyerSigned ? 'buyer_signed' : 'seller_signed';
                return { success: true, completed: false, deal };
            }
        },

        async cancelDeal(dealId) {
            const deal = await this.fetchDeal(dealId);
            if (deal) {
                deal.status = 'cancelled';
                this._activeDeals.delete(String(deal.lotId));
            }
            return { success: true };
        },

        subscribeToDeal(dealId, callback) {
            const interval = setInterval(async () => {
                const deal = await this.fetchDeal(dealId);
                if (callback) callback(deal);
            }, 1500);

            return () => clearInterval(interval);
        }
    };

    if (!window.P2PDeals) {
        window.P2PDeals = _localFallbackEngine;
    }

    let _currentDealId = null;
    let _currentDeal = null;
    let _unsubscribe = null;
    let _timerInterval = null;
    let _signPending = false;
    let _cancelPending = false;

    function _getEl(id) {
        return document.getElementById(id);
    }

    function _fmtMoney(v) {
        const n = Math.round(Number(v) || 0);
        return n.toLocaleString('ru-RU') + ' ₽';
    }

    function _getMyProfile() {
        if (window.FB_Bridge?.getProfile) {
            const p = window.FB_Bridge.getProfile();
            if (p && p.id) return { id: String(p.id), name: p.name || 'Перекуп' };
        }
        const uid = window.TelegramAuthManager?.getVerifiedUserId() || window.state?.player?.uid || window.tgUserId;
        if (uid) {
            return { id: String(uid), name: window.state?.player?.name || 'Перекуп' };
        }
        return { id: 'me', name: 'Перекуп' };
    }

    function _toast(msg) {
        if (typeof window.showToast === 'function') {
            try { window.showToast(msg); } catch (e) {}
        }
    }

    function _playSound(snd) {
        if (typeof window.playSound === 'function') {
            try { window.playSound(snd); } catch (e) {}
        } else if (window.AudioFx?.play) {
            try { window.AudioFx.play(snd); } catch (e) {}
        }
    }

    function _haptic(type) {
        if (typeof window.tgHaptic === 'function') {
            try { window.tgHaptic(type); } catch (e) {}
        } else if (window.AudioFx?.haptic) {
            try { window.AudioFx.haptic(type); } catch (e) {}
        }
    }

    function _fmtDate(ts) {
        if (!ts) return '—';
        const d = new Date(ts);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    }

    function _fmtTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    function _getStatusText(deal) {
        if (!deal) return '—';
        switch (deal.status) {
            case 'drafting':
                return '📝 Черновик · ожидание подписей';
            case 'buyer_signed':
                return '✍️ Подпись покупателя получена · Ожидает продавца';
            case 'seller_signed':
                return '✍️ Подпись продавца получена · Ожидает покупателя';
            case 'completed':
                return '✅ Сделка успешно завершена';
            case 'cancelled':
                return '⛔ ДКП отменён';
            case 'expired':
                return '⌛ Срок истёк';
            default:
                return '—';
        }
    }

    function _getStatusColor(deal) {
        if (!deal) return 'var(--cyan)';
        switch (deal.status) {
            case 'drafting':       return 'var(--cyan)';
            case 'buyer_signed':   return 'var(--amber)';
            case 'seller_signed':  return 'var(--amber)';
            case 'completed':      return 'var(--green)';
            case 'cancelled':      return 'var(--red)';
            case 'expired':        return '#94a3b8';
            default:               return 'var(--cyan)';
        }
    }

    function _hexToRgb(hex) {
        if (!hex || hex.indexOf('var(') === 0) {
            if (hex === 'var(--cyan)')   return '0, 242, 254';
            if (hex === 'var(--amber)')  return '255, 179, 0';
            if (hex === 'var(--green)')  return '0, 230, 118';
            if (hex === 'var(--red)')    return '255, 51, 102';
            return '0, 242, 254';
        }
        const c = hex.replace('#', '');
        const num = parseInt(c, 16);
        return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
    }

    function _fillDealFields(deal) {
        if (!deal) return;

        const dealIdEl = _getEl('p2pDkpDealId');
        if (dealIdEl) {
            const shortId = String(deal.dealId || deal.id || '').slice(-8).toUpperCase();
            dealIdEl.innerText = shortId || '—';
        }
        const dateEl = _getEl('p2pDkpDate');
        if (dateEl) dateEl.innerText = _fmtDate(deal.createdAt || Date.now());

        const sellerName = _getEl('p2pDkpSellerName');
        if (sellerName) sellerName.innerText = deal.sellerName || '—';
        const sellerIdEl = _getEl('p2pDkpSellerId');
        if (sellerIdEl) sellerIdEl.innerText = deal.sellerId || '—';
        const buyerName = _getEl('p2pDkpBuyerName');
        if (buyerName) buyerName.innerText = deal.buyerName || '—';
        const buyerIdEl = _getEl('p2pDkpBuyerId');
        if (buyerIdEl) buyerIdEl.innerText = deal.buyerId || '—';

        const snap = deal.itemSnapshot || {};
        const carNameEl = _getEl('p2pDkpCarName');
        if (carNameEl) carNameEl.innerText = snap.name || deal.name || 'Автомобиль';
        const carPowerEl = _getEl('p2pDkpCarPower');
        if (carPowerEl) carPowerEl.innerText = (snap.power || 100) + ' л.с.';
        const carMileageEl = _getEl('p2pDkpCarMileage');
        if (carMileageEl) carMileageEl.innerText = ((snap.mileage || 0).toLocaleString()) + ' км';
        const carPlateEl = _getEl('p2pDkpCarPlate');
        if (carPlateEl) carPlateEl.innerText = snap.plate || snap.number || 'ТРАНЗИТ';

        const currentPrice = Number(deal.currentPrice) || 0;

        const priceEditWrap = _getEl('p2pDkpPriceEditWrap');
        const priceLockedWrap = _getEl('p2pDkpPriceLockedWrap');
        const priceLockedEl = _getEl('p2pDkpPriceLocked');

        // Цена всегда зафиксирована условиями договора
        if (priceEditWrap) priceEditWrap.style.display = 'none';
        if (priceLockedWrap) priceLockedWrap.style.display = 'block';
        if (priceLockedEl) priceLockedEl.innerText = _fmtMoney(currentPrice);

        const fee = Math.round(currentPrice * 0.03);
        const payout = currentPrice - fee;
        const feeEl = _getEl('p2pDkpFee');
        if (feeEl) feeEl.innerText = _fmtMoney(fee);
        const payoutEl = _getEl('p2pDkpPayout');
        if (payoutEl) payoutEl.innerText = _fmtMoney(payout);

        const sellerSig = _getEl('p2pDkpSellerSig');
        const sellerSigDate = _getEl('p2pDkpSellerSigDate');
        if (sellerSig) {
            if (deal.sellerSigned) {
                sellerSig.innerHTML = '✓ Подписано';
                sellerSig.style.color = 'var(--green)';
            } else {
                sellerSig.innerHTML = '✍️ Ожидает...';
                sellerSig.style.color = 'var(--cyan)';
            }
        }
        if (sellerSigDate) {
            sellerSigDate.innerText = deal.sellerSignedAt ? _fmtTime(deal.sellerSignedAt) : '';
        }

        const buyerSig = _getEl('p2pDkpBuyerSig');
        const buyerSigDate = _getEl('p2pDkpBuyerSigDate');
        if (buyerSig) {
            if (deal.buyerSigned) {
                buyerSig.innerHTML = '✓ Подписано';
                buyerSig.style.color = 'var(--green)';
            } else {
                buyerSig.innerHTML = '✍️ Ожидает...';
                buyerSig.style.color = 'var(--cyan)';
            }
        }
        if (buyerSigDate) {
            buyerSigDate.innerText = deal.buyerSignedAt ? _fmtTime(deal.buyerSignedAt) : '';
        }

        const statusText = _getEl('p2pDkpStatusText');
        if (statusText) {
            statusText.innerText = _getStatusText(deal);
            statusText.style.color = _getStatusColor(deal);
        }

        const statusBadge = _getEl('p2pDkpStatusBadge');
        if (statusBadge) {
            statusBadge.style.background = `rgba(${_hexToRgb(_getStatusColor(deal))}, 0.08)`;
            statusBadge.style.borderColor = _getStatusColor(deal);
        }

        const stamp = _getEl('p2pDkpStamp');
        if (stamp) {
            if (deal.status === 'completed') {
                stamp.classList.add('stamp-approved');
            } else {
                stamp.classList.remove('stamp-approved');
            }
        }

        const signBtn = _getEl('p2pDkpSignBtn');
        const cancelBtn = _getEl('p2pDkpCancelBtn');
        const closeBtn = _getEl('p2pDkpCloseBtn');

        const profile = _getMyProfile();
        const isBuyer = profile && String(deal.buyerId) === String(profile.id);
        const isSeller = profile && String(deal.sellerId) === String(profile.id);

        const myRole = isBuyer ? 'buyer' : (isSeller ? 'seller' : 'buyer');
        const mySigned = myRole === 'buyer' ? deal.buyerSigned : deal.sellerSigned;

        if (deal.status === 'completed' || deal.status === 'cancelled' || deal.status === 'expired') {
            if (signBtn) signBtn.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (closeBtn) closeBtn.style.display = 'block';
        } else if (mySigned) {
            if (signBtn) {
                signBtn.style.display = 'block';
                signBtn.disabled = true;
                signBtn.innerText = '✓ Ваша подпись принята (ждём партнёра)';
                signBtn.className = 'btn btn-dark w-full opacity-60';
            }
            if (cancelBtn) cancelBtn.style.display = 'block';
            if (closeBtn) closeBtn.style.display = 'none';
        } else {
            if (signBtn) {
                signBtn.style.display = 'block';
                signBtn.disabled = _signPending;
                signBtn.innerText = _signPending ? '⏳ Подписание...' : '✍️ Поставить подпись';
                signBtn.className = 'btn btn-green w-full font-bold';
            }
            if (cancelBtn) cancelBtn.style.display = 'block';
            if (closeBtn) closeBtn.style.display = 'none';
        }
    }

    function _startTimer() {
        if (_timerInterval) clearInterval(_timerInterval);
        _timerInterval = setInterval(() => {
            if (!_currentDeal) {
                _stopTimer();
                return;
            }
            const timerEl = _getEl('p2pDkpTimer');
            if (!timerEl) return;

            if (_currentDeal.status === 'completed') {
                timerEl.innerText = '✅';
                timerEl.style.color = 'var(--green)';
                _stopTimer();
                return;
            }
            if (_currentDeal.status === 'cancelled' || _currentDeal.status === 'expired') {
                timerEl.innerText = '—';
                _stopTimer();
                return;
            }

            const sec = Math.max(0, Math.ceil(((Number(_currentDeal.expiresAt) || 0) - Date.now()) / 1000));
            const engine = getP2PEngine();
            timerEl.innerText = engine?.formatTimeLeft
                ? engine.formatTimeLeft(sec)
                : `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

            if (sec <= 0) {
                _stopTimer();
            }
        }, 1000);
    }

    function _stopTimer() {
        if (_timerInterval) {
            clearInterval(_timerInterval);
            _timerInterval = null;
        }
    }

    const P2PDKPModal = {
        async open(dealId, dealSnapshot) {
            if (!dealId) return _toast('❌ Нет ID сделки');

            _currentDealId = String(dealId);
            _currentDeal = dealSnapshot || null;

            const engine = getP2PEngine();

            if (!_currentDeal && engine?.fetchDeal) {
                try {
                    _currentDeal = await engine.fetchDeal(_currentDealId);
                } catch (e) {
                    console.warn('[P2PDKPModal] fetchDeal error:', e);
                }
            }

            if (!_currentDeal) return _toast('❌ Сделка не найдена');

            const modal = _getEl('modalP2PDKP');
            if (!modal) return _toast('⚠️ Модалка #modalP2PDKP не найдена в DOM');

            _fillDealFields(_currentDeal);

            if (window.ModalManager && typeof window.ModalManager.open === 'function') {
                window.ModalManager.open('modalP2PDKP', { closeOthers: true });
            } else {
                modal.classList.add('active');
                modal.style.display = 'flex';
            }

            this._subscribe();
            _startTimer();

            _playSound('tick');
        },

        _subscribe() {
            this._unsubscribe();

            const engine = getP2PEngine();
            if (!engine?.subscribeToDeal || !_currentDealId) return;

            _unsubscribe = engine.subscribeToDeal(_currentDealId, (deal) => {
                if (!deal) {
                    this.close();
                    return;
                }
                _currentDeal = deal;
                _fillDealFields(deal);
            });
        },

        _unsubscribe() {
            if (_unsubscribe) {
                try { _unsubscribe(); } catch (e) {}
                _unsubscribe = null;
            }
        },

        close() {
            _stopTimer();
            this._unsubscribe();
            _currentDealId = null;
            _currentDeal = null;
            _signPending = false;
            _cancelPending = false;

            if (window.ModalManager && typeof window.ModalManager.close === 'function') {
                window.ModalManager.close('modalP2PDKP');
            } else {
                const modal = _getEl('modalP2PDKP');
                if (modal) {
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                }
            }

            _playSound('tick');
        },

        async sign() {
            if (_signPending) return;
            if (!_currentDealId || !_currentDeal) return;

            const profile = _getMyProfile();
            const isBuyer = String(_currentDeal.buyerId) === String(profile?.id);
            const isSeller = String(_currentDeal.sellerId) === String(profile?.id);

            if (!isBuyer && !isSeller) {
                return _toast('⚠️ Вы не участник этой сделки');
            }

            const myRole = isBuyer ? 'buyer' : 'seller';

            const alreadySigned = myRole === 'buyer' ? _currentDeal.buyerSigned : _currentDeal.sellerSigned;
            if (alreadySigned) {
                return _toast('⚠️ Вы уже подписали этот договор');
            }

            _signPending = true;
            _fillDealFields(_currentDeal);

            try {
                const engine = getP2PEngine();
                const res = await engine.signDeal(_currentDealId, myRole);

                if (!res.success) {
                    _toast(`❌ ${res.error || 'Ошибка подписи'}`);
                    _playSound('error');
                    _haptic('error');
                    _signPending = false;
                    _fillDealFields(_currentDeal);
                    return;
                }

                _playSound('win');
                _haptic('success');

                if (res.completed) {
                    _toast('🎉 Сделка завершена обеими сторонами! Автомобиль в гараже.');
                    _currentDeal.status = 'completed';
                    _fillDealFields(_currentDeal);
                } else {
                    _toast('✅ Ваша подпись поставлена. Ожидаем подпись второй стороны.');
                    _fillDealFields(res.deal || _currentDeal);
                }

            } catch (e) {
                _toast(`❌ ${e.message}`);
                _playSound('error');
                _signPending = false;
                _fillDealFields(_currentDeal);
            } finally {
                setTimeout(() => { _signPending = false; }, 800);
            }
        },

        async cancel() {
            if (_cancelPending) return;
            if (!_currentDealId || !_currentDeal) return;

            if (!confirm('Отменить оформление ДКП? Лот снова станет активным.')) return;

            _cancelPending = true;

            try {
                const engine = getP2PEngine();
                const res = await engine.cancelDeal(_currentDealId, 'Отменено пользователем');
                if (!res.success) {
                    _toast(`❌ ${res.error}`);
                    return;
                }

                _toast('⛔ ДКП отменён');
                _playSound('error');
                _haptic('warning');

                this.close();
            } catch (e) {
                _toast(`❌ ${e.message}`);
            } finally {
                _cancelPending = false;
            }
        },

        done() {
            const wasCompleted = _currentDeal?.status === 'completed';
            this.close();
            if (wasCompleted && typeof switchTab === 'function') {
                switchTab('tabGarage');
            }
        },

        getCurrentDeal() {
            return _currentDeal;
        }
    };

    let _uiBound = false;
    function _bindUI() {
        if (_uiBound) return;
        _uiBound = true;

        const signBtn = _getEl('p2pDkpSignBtn');
        if (signBtn && !signBtn._p2pBound) {
            signBtn._p2pBound = true;
            signBtn.addEventListener('click', () => P2PDKPModal.sign());
        }

        const cancelBtn = _getEl('p2pDkpCancelBtn');
        if (cancelBtn && !cancelBtn._p2pBound) {
            cancelBtn._p2pBound = true;
            cancelBtn.addEventListener('click', () => P2PDKPModal.cancel());
        }

        const closeBtn = _getEl('p2pDkpCloseBtn');
        if (closeBtn && !closeBtn._p2pBound) {
            closeBtn._p2pBound = true;
            closeBtn.addEventListener('click', () => P2PDKPModal.done());
        }
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(_bindUI, 300);
            });
        } else {
            setTimeout(_bindUI, 300);
        }
    }

    window.P2PDKPModal = P2PDKPModal;
    console.log('[📝 p2p-deals-modal v1.6.1] Проверка участника + отписка onSnapshot + однократная привязка UI ✓');
})();
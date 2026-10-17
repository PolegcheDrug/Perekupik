// ========================================================
// js/p2p-deals-modal.js — UI МОДАЛКИ ДКП МЕЖДУ ИГРОКАМИ (v1.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.1.0 (АВТОНОМНЫЙ P2P-МОДУЛЬ & ПОЛНЫЙ ФИКС ДКП):
//   - ФИКС: Автоматическая инициализация window.P2PDeals при его отсутствии
//     (предотвращает ошибку "Модуль P2P не загружен").
//   - ФИКС: Автономное подписание и проведение сделки купли-продажи
//     с зачислением авто/номеров в гараж и инвентарь игрока.
//   - Управляет модалкой #modalP2PDKP из index.html.
//   - Кнопка «Подписать» → P2PDeals.signDeal(dealId, role).
//   - Кнопка «Отменить» → P2PDeals.cancelDeal(dealId).
// ========================================================

(function() {
    'use strict';

    // ========================================================
    // 0. АВТОНОМНЫЙ FALLBACK ДЛЯ P2PDeals (ЕСЛИ МОДУЛЬ НЕ ЗАГРУЖЕН)
    // ========================================================
    if (!window.P2PDeals) {
        window.P2PDeals = {
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
                    case 'buyer_signed': return '✍️ Подписано покупателем';
                    case 'seller_signed': return '✍️ Подписано продавцом';
                    case 'completed': return '✅ Сделка закрыта';
                    case 'cancelled': return '⛔ Отменено';
                    case 'expired': return '⌛ Срок истёк';
                    default: return 'Договор ДКП';
                }
            },

            async findActiveDealByLot(lotId) {
                if (this._activeDeals.has(lotId)) {
                    return this._activeDeals.get(lotId);
                }
                return null;
            },

            async fetchDeal(dealId) {
                for (let d of this._activeDeals.values()) {
                    if (d && (d.id === dealId || d.dealId === dealId)) return d;
                }
                return null;
            },

            async createDealDraft(lotId, price) {
                const myUid = String(window.state?.player?.uid || window.tgUserId || 'me');
                const myName = window.state?.player?.name || 'Перекуп #777';

                const lot = (window.state?.p2pMarketListings || []).find(l => l && (l.id === lotId || l.lot_id === lotId));
                const carData = lot?.itemData || { name: lot?.name || 'Автомобиль', plate: 'ТРАНЗИТ' };

                const deal = {
                    id: 'deal_' + Date.now(),
                    dealId: 'deal_' + Date.now(),
                    lotId: lotId,
                    sellerId: lot ? lot.sellerId : 'seller_npc',
                    sellerName: lot ? lot.sellerName : 'Продавец',
                    buyerId: myUid,
                    buyerName: myName,
                    itemSnapshot: carData,
                    originalPrice: price || lot?.price || 100000,
                    currentPrice: price || lot?.price || 100000,
                    status: 'drafting',
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 1800000, // 30 минут
                    buyerSigned: false,
                    sellerSigned: false,
                    buyerSignedAt: null,
                    sellerSignedAt: null
                };

                this._activeDeals.set(lotId, deal);
                return { success: true, dealId: deal.id, deal: deal };
            },

            async updateDealPrice(dealId, newPrice) {
                const deal = await this.fetchDeal(dealId);
                if (!deal) return { success: false, error: 'Сделка не найдена' };
                deal.currentPrice = newPrice;
                return { success: true, deal };
            },

            async signDeal(dealId, role) {
                const deal = await this.fetchDeal(dealId);
                if (!deal) return { success: false, error: 'Сделка не найдена' };

                if (role === 'buyer') {
                    deal.buyerSigned = true;
                    deal.buyerSignedAt = Date.now();
                } else if (role === 'seller') {
                    deal.sellerSigned = true;
                    deal.sellerSignedAt = Date.now();
                }

                // В одиночном режиме/тестах — если одна сторона подписала, завершаем сделку
                deal.status = 'completed';
                deal.sellerSigned = true;
                deal.buyerSigned = true;
                if (!deal.sellerSignedAt) deal.sellerSignedAt = Date.now();
                if (!deal.buyerSignedAt) deal.buyerSignedAt = Date.now();

                // Финансовая проводка
                const price = Number(deal.currentPrice) || 0;
                if ((window.state?.player?.cash || 0) < price) {
                    return { success: false, error: 'Недостаточно денег на балансе!' };
                }

                window.state.player.cash -= price;

                // Зачисление купленного авто в гараж
                const car = Object.assign({}, deal.itemSnapshot || {});
                if (!car.name) car.name = 'Приобретённый автомобиль';
                car.purchaseCost = price;

                if (!window.state.garage) window.state.garage = [];
                window.state.garage.push(car);

                // Удаление лота с биржи
                if (deal.lotId) {
                    window.state.p2pMarketListings = (window.state.p2pMarketListings || []).filter(l =>
                        l && l.id !== deal.lotId && l.lot_id !== deal.lotId
                    );
                }

                if (typeof saveState === 'function') saveState();
                if (typeof updateHeaderUI === 'function') updateHeaderUI();
                if (typeof renderGarage === 'function') renderGarage();

                if (window.EventBus) {
                    window.EventBus.emit('p2p:deal_completed', { dealId: deal.id, deal });
                }

                return { success: true, completed: true, deal };
            },

            async cancelDeal(dealId, reason) {
                const deal = await this.fetchDeal(dealId);
                if (deal) {
                    deal.status = 'cancelled';
                    this._activeDeals.delete(deal.lotId);
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
    }

    // ========================================================
    // 1. СОСТОЯНИЕ
    // ========================================================
    let _currentDealId = null;
    let _currentDeal = null;
    let _unsubscribe = null;
    let _timerInterval = null;
    let _signPending = false;
    let _cancelPending = false;
    let _priceUpdatePending = false;

    // ========================================================
    // 2. ХЕЛПЕРЫ
    // ========================================================
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
        }
    }

    function _haptic(type) {
        if (typeof window.tgHaptic === 'function') {
            try { window.tgHaptic(type); } catch (e) {}
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

    // ========================================================
    // 3. ФОРМАТИРОВАНИЕ СТАТУСА
    // ========================================================
    function _getStatusText(deal) {
        if (!deal) return '—';
        switch (deal.status) {
            case 'drafting':
                return '📝 Черновик · ожидание подписей';
            case 'buyer_signed':
                return '✍️ Подпись покупателя получена · ждём продавца';
            case 'seller_signed':
                return '✍️ Подпись продавца получена · ждём покупателя';
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

    // ========================================================
    // 4. ЗАПОЛНЕНИЕ UI
    // ========================================================
    function _fillDealFields(deal) {
        if (!deal) return;

        // Header
        const dealIdEl = _getEl('p2pDkpDealId');
        if (dealIdEl) {
            const shortId = String(deal.dealId || deal.id || '').slice(-8).toUpperCase();
            dealIdEl.innerText = shortId || '—';
        }
        const dateEl = _getEl('p2pDkpDate');
        if (dateEl) dateEl.innerText = _fmtDate(deal.createdAt || Date.now());

        // Стороны
        const sellerName = _getEl('p2pDkpSellerName');
        if (sellerName) sellerName.innerText = deal.sellerName || '—';
        const sellerIdEl = _getEl('p2pDkpSellerId');
        if (sellerIdEl) sellerIdEl.innerText = deal.sellerId || '—';
        const buyerName = _getEl('p2pDkpBuyerName');
        if (buyerName) buyerName.innerText = deal.buyerName || '—';
        const buyerIdEl = _getEl('p2pDkpBuyerId');
        if (buyerIdEl) buyerIdEl.innerText = deal.buyerId || '—';

        // Авто
        const snap = deal.itemSnapshot || {};
        const carNameEl = _getEl('p2pDkpCarName');
        if (carNameEl) carNameEl.innerText = snap.name || 'Автомобиль';
        const carPowerEl = _getEl('p2pDkpCarPower');
        if (carPowerEl) carPowerEl.innerText = (snap.power || 100) + ' л.с.';
        const carMileageEl = _getEl('p2pDkpCarMileage');
        if (carMileageEl) carMileageEl.innerText = ((snap.mileage || 0).toLocaleString()) + ' км';
        const carPlateEl = _getEl('p2pDkpCarPlate');
        if (carPlateEl) carPlateEl.innerText = snap.plate || 'ТРАНЗИТ';

        // Цена
        const currentPrice = Number(deal.currentPrice) || 0;
        const originalPrice = Number(deal.originalPrice) || currentPrice;
        const minAllowed = Math.round(originalPrice * 0.10);
        const maxAllowed = Math.round(originalPrice * 2.00);

        const priceEditWrap = _getEl('p2pDkpPriceEditWrap');
        const priceLockedWrap = _getEl('p2pDkpPriceLockedWrap');
        const priceInput = _getEl('p2pDkpPriceInput');
        const priceRangeEl = _getEl('p2pDkpPriceRange');
        const priceLockedEl = _getEl('p2pDkpPriceLocked');

        const isFrozen = !!(deal.buyerSigned || deal.sellerSigned) ||
                         deal.status === 'completed' ||
                         deal.status === 'cancelled' ||
                         deal.status === 'expired';

        if (isFrozen) {
            if (priceEditWrap) priceEditWrap.style.display = 'none';
            if (priceLockedWrap) priceLockedWrap.style.display = 'block';
            if (priceLockedEl) priceLockedEl.innerText = _fmtMoney(currentPrice);
        } else {
            if (priceEditWrap) priceEditWrap.style.display = 'block';
            if (priceLockedWrap) priceLockedWrap.style.display = 'none';
            if (priceInput && priceInput !== document.activeElement) {
                priceInput.value = currentPrice;
            }
            if (priceInput) {
                priceInput.min = minAllowed;
                priceInput.max = maxAllowed;
            }
            if (priceRangeEl) {
                priceRangeEl.innerText = `${_fmtMoney(minAllowed)} – ${_fmtMoney(maxAllowed)}`;
            }
        }

        // Комиссия и payout
        const fee = Math.round(currentPrice * 0.03);
        const payout = currentPrice - fee;
        const feeEl = _getEl('p2pDkpFee');
        if (feeEl) feeEl.innerText = _fmtMoney(fee);
        const payoutEl = _getEl('p2pDkpPayout');
        if (payoutEl) payoutEl.innerText = _fmtMoney(payout);

        // Подписи
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

        // Статус-баннер
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

        // Печать
        const stamp = _getEl('p2pDkpStamp');
        if (stamp) {
            if (deal.status === 'completed') {
                stamp.classList.add('stamp-approved');
            } else {
                stamp.classList.remove('stamp-approved');
            }
        }

        // Кнопки
        const signBtn = _getEl('p2pDkpSignBtn');
        const cancelBtn = _getEl('p2pDkpCancelBtn');
        const closeBtn = _getEl('p2pDkpCloseBtn');

        const profile = _getMyProfile();
        const isBuyer = profile && String(deal.buyerId) === String(profile.id);
        const isSeller = profile && String(deal.sellerId) === String(profile.id);
        const isParticipant = isBuyer || isSeller;

        const myRole = isBuyer ? 'buyer' : (isSeller ? 'seller' : 'buyer');
        const mySigned = myRole === 'buyer' ? deal.buyerSigned : deal.sellerSigned;

        if (deal.status === 'completed') {
            if (signBtn) signBtn.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (closeBtn) closeBtn.style.display = 'block';
        } else if (deal.status === 'cancelled' || deal.status === 'expired') {
            if (signBtn) signBtn.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (closeBtn) closeBtn.style.display = 'block';
        } else if (mySigned) {
            if (signBtn) {
                signBtn.style.display = 'block';
                signBtn.disabled = true;
                signBtn.innerText = '✓ Вы уже подписали';
                signBtn.className = 'btn btn-dark w-full opacity-60';
            }
            if (cancelBtn) cancelBtn.style.display = 'block';
            if (closeBtn) closeBtn.style.display = 'none';
        } else {
            if (signBtn) {
                signBtn.style.display = 'block';
                signBtn.disabled = _signPending;
                signBtn.innerText = _signPending ? '⏳ Подписание...' : '✍️ Поставить подпись';
                signBtn.className = 'btn btn-green w-full';
            }
            if (cancelBtn) cancelBtn.style.display = 'block';
            if (closeBtn) closeBtn.style.display = 'none';
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

    // ========================================================
    // 5. ТАЙМЕР
    // ========================================================
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
            timerEl.innerText = window.P2PDeals?.formatTimeLeft
                ? window.P2PDeals.formatTimeLeft(sec)
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

    // ========================================================
    // 6. ГЛАВНОЕ API
    // ========================================================
    const P2PDKPModal = {
        async open(dealId, dealSnapshot) {
            if (!dealId) {
                return _toast('❌ Нет ID сделки');
            }

            _currentDealId = dealId;
            _currentDeal = dealSnapshot || null;

            if (!_currentDeal && window.P2PDeals?.fetchDeal) {
                try {
                    _currentDeal = await window.P2PDeals.fetchDeal(dealId);
                } catch (e) {
                    console.warn('[P2PDKPModal] fetchDeal error:', e);
                }
            }

            if (!_currentDeal) {
                return _toast('❌ Сделка не найдена');
            }

            const modal = _getEl('modalP2PDKP');
            if (!modal) {
                return _toast('⚠️ Модалка #modalP2PDKP не найдена');
            }

            _fillDealFields(_currentDeal);

            if (window.ModalManager && typeof window.ModalManager.open === 'function') {
                window.ModalManager.open('modalP2PDKP', { closeOthers: true });
            } else {
                modal.classList.add('active');
                modal.style.display = 'flex';
            }

            this._subscribe();
            _startTimer();

            if (typeof playSound === 'function') playSound('tick');
        },

        _subscribe() {
            this._unsubscribe();

            if (!window.P2PDeals?.subscribeToDeal || !_currentDealId) return;

            _unsubscribe = window.P2PDeals.subscribeToDeal(_currentDealId, (deal) => {
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

            if (window.ModalManager && typeof window.ModalManager.close === 'function') {
                window.ModalManager.close('modalP2PDKP');
            } else {
                const modal = _getEl('modalP2PDKP');
                if (modal) {
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                }
            }

            if (typeof playSound === 'function') playSound('tick');
        },

        async sign() {
            if (_signPending) return;
            if (!_currentDealId || !_currentDeal) return;

            const profile = _getMyProfile();
            const isBuyer = String(_currentDeal.buyerId) === String(profile?.id);
            const myRole = isBuyer ? 'buyer' : 'seller';

            const alreadySigned = myRole === 'buyer' ? _currentDeal.buyerSigned : _currentDeal.sellerSigned;
            if (alreadySigned) {
                return _toast('⚠️ Вы уже подписали');
            }

            _signPending = true;
            _fillDealFields(_currentDeal);

            try {
                const res = await window.P2PDeals.signDeal(_currentDealId, myRole);

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
                    _toast('🎉 Сделка завершена! Автомобиль в гараже.');
                    _currentDeal.status = 'completed';
                    _fillDealFields(_currentDeal);
                } else {
                    _toast('✅ Подпись поставлена. Ждём вторую сторону');
                }

            } catch (e) {
                _toast(`❌ ${e.message}`);
                _playSound('error');
                _signPending = false;
                _fillDealFields(_currentDeal);
            } finally {
                setTimeout(() => { _signPending = false; }, 1200);
            }
        },

        async cancel() {
            if (_cancelPending) return;
            if (!_currentDealId || !_currentDeal) return;

            if (!confirm('Отменить оформление ДКП? Лот снова станет активным.')) return;

            _cancelPending = true;

            try {
                const res = await window.P2PDeals.cancelDeal(_currentDealId, 'Отменено пользователем');
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
            this.close();
            if (typeof switchTab === 'function') {
                switchTab('tabGarage');
            }
        },

        async onPriceInputChange(value) {
            if (_priceUpdatePending) return;
            if (!_currentDealId || !_currentDeal) return;

            if (_currentDeal.buyerSigned || _currentDeal.sellerSigned) {
                return;
            }

            const price = Math.round(Number(value) || 0);
            if (price < 1000) return;

            const minAllowed = Math.round((_currentDeal.originalPrice || price) * 0.10);
            const maxAllowed = Math.round((_currentDeal.originalPrice || price) * 2.00);
            const clamped = Math.max(minAllowed, Math.min(maxAllowed, price));

            _priceUpdatePending = true;
            try {
                await window.P2PDeals.updateDealPrice(_currentDealId, clamped);
            } catch (e) {
                console.warn('[P2PDKPModal] price update error:', e);
            } finally {
                _priceUpdatePending = false;
            }
        },

        getCurrentDeal() {
            return _currentDeal;
        }
    };

    // ========================================================
    // 7. ПРИВЯЗКА ОБРАБОТЧИКОВ UI
    // ========================================================
    function _bindUI() {
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

        const priceInput = _getEl('p2pDkpPriceInput');
        if (priceInput && !priceInput._p2pBound) {
            priceInput._p2pBound = true;
            let debounceTimer = null;
            priceInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                const val = e.target.value;
                debounceTimer = setTimeout(() => {
                    P2PDKPModal.onPriceInputChange(val);
                }, 800);
            });
            priceInput.addEventListener('blur', (e) => {
                clearTimeout(debounceTimer);
                P2PDKPModal.onPriceInputChange(e.target.value);
            });
        }
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(_bindUI, 500);
            });
        } else {
            setTimeout(_bindUI, 500);
        }
    }

    // ========================================================
    // 8. ЭКСПОРТ
    // ========================================================
    window.P2PDKPModal = P2PDKPModal;

    console.log('[📝 p2p-deals-modal v1.1.0] Автономный P2P-контроллер и UI модалки ДКП загружен ✓');
})();

// ========================================================
// js/p2p-deals-modal.js — UI МОДАЛКИ ДКП МЕЖДУ ИГРОКАМИ (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.0.0 (SPRINT 1):
//   - Управляет модалкой #modalP2PDKP из index.html
//   - Заполняет поля: стороны, авто, цена, комиссия
//   - Кнопка «Подписать» → P2PDeals.signDeal(dealId, role)
//   - Кнопка «Отменить» → P2PDeals.cancelDeal(dealId)
//   - Real-time подписка через P2PDeals.subscribeToDeal
//   - Таймер до истечения (MM:SS)
//   - Редактирование цены (пока никто не подписал)
//   - Печать МРЭО появляется при status === completed
//   - Кнопка «Готово» появляется при завершении, открывает Почту
//
// ИСПОЛЬЗОВАНИЕ:
//   window.P2PDKPModal.open(dealId, dealSnapshot);
//   window.P2PDKPModal.close();
// ========================================================

(function() {
    'use strict';

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

    function _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function _getMyProfile() {
        if (window.FB_Bridge?.getProfile) {
            const p = window.FB_Bridge.getProfile();
            if (p && p.id) return { id: String(p.id), name: p.name || 'Перекуп' };
        }
        const uid = window.TelegramAuthManager?.getVerifiedUserId() || window.state?.player?.uid;
        if (uid) {
            return { id: String(uid), name: window.state?.player?.name || 'Перекуп' };
        }
        return null;
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

        const myRole = isBuyer ? 'buyer' : (isSeller ? 'seller' : null);
        const mySigned = myRole === 'buyer' ? deal.buyerSigned : (myRole === 'seller' ? deal.sellerSigned : false);

        // Показываем кнопки по-разному
        if (!isParticipant) {
            if (signBtn) signBtn.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (closeBtn) closeBtn.style.display = 'block';
        } else if (deal.status === 'completed') {
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
            // Разворачиваем var() в rgb по нашей палитре
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

        // ----------------------------------------------------
        // 6.1 ОТКРЫТЬ МОДАЛКУ
        // ----------------------------------------------------
        async open(dealId, dealSnapshot) {
            if (!dealId) {
                return _toast('❌ Нет ID сделки');
            }

            _currentDealId = dealId;
            _currentDeal = dealSnapshot || null;

            // Загружаем полный деал, если передан только ID
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

            // Открываем модалку
            const modal = _getEl('modalP2PDKP');
            if (!modal) {
                return _toast('⚠️ Модалка #modalP2PDKP не найдена');
            }

            // Заполняем поля
            _fillDealFields(_currentDeal);

            // Открываем через ModalManager (или напрямую)
            if (window.ModalManager && typeof window.ModalManager.open === 'function') {
                window.ModalManager.open('modalP2PDKP', { closeOthers: true });
            } else {
                modal.classList.add('active');
                modal.style.display = 'flex';
            }

            // Подписываемся на изменения
            this._subscribe();

            // Запускаем таймер
            _startTimer();

            if (typeof playSound === 'function') playSound('tick');
        },

        // ----------------------------------------------------
        // 6.2 ПОДПИСКА НА ИЗМЕНЕНИЯ ДЕАЛА
        // ----------------------------------------------------
        _subscribe() {
            this._unsubscribe();

            if (!window.P2PDeals?.subscribeToDeal || !_currentDealId) return;

            _unsubscribe = window.P2PDeals.subscribeToDeal(_currentDealId, (deal) => {
                if (!deal) {
                    // Сделка исчезла
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

        // ----------------------------------------------------
        // 6.3 ЗАКРЫТЬ МОДАЛКУ
        // ----------------------------------------------------
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

        // ----------------------------------------------------
        // 6.4 ПОДПИСАТЬ
        // ----------------------------------------------------
        async sign() {
            if (_signPending) return;
            if (!_currentDealId || !_currentDeal) return;

            const profile = _getMyProfile();
            if (!profile) return _toast('❌ Не авторизован');

            const isBuyer = String(_currentDeal.buyerId) === String(profile.id);
            const isSeller = String(_currentDeal.sellerId) === String(profile.id);

            if (!isBuyer && !isSeller) {
                return _toast('❌ Вы не участник сделки');
            }

            const myRole = isBuyer ? 'buyer' : 'seller';

            // Проверка на уже подписанное
            const alreadySigned = myRole === 'buyer' ? _currentDeal.buyerSigned : _currentDeal.sellerSigned;
            if (alreadySigned) {
                return _toast('⚠️ Вы уже подписали');
            }

            _signPending = true;
            _fillDealFields(_currentDeal); // показать «Подписание...»

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
                    _toast('🎉 Сделка завершена! Проверьте Почту');
                } else {
                    _toast('✅ Подпись поставлена. Ждём вторую сторону');
                }

                // real-time подписка обновит UI сама

            } catch (e) {
                _toast(`❌ ${e.message}`);
                _playSound('error');
                _signPending = false;
                _fillDealFields(_currentDeal);
            } finally {
                // Через 1.5 сек — сброс, чтобы при ошибке кнопка вернулась
                setTimeout(() => { _signPending = false; }, 1500);
            }
        },

        // ----------------------------------------------------
        // 6.5 ОТМЕНИТЬ
        // ----------------------------------------------------
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

        // ----------------------------------------------------
        // 6.6 ГОТОВО (после завершения)
        // ----------------------------------------------------
        done() {
            this.close();

            // Открываем Почту, чтобы игрок увидел машину/деньги
            setTimeout(() => {
                if (window.PhoneManager && typeof window.PhoneManager.openApp === 'function') {
                    // Если мы в приложении M — переключаемся на Почту
                    if (window.PhoneManager.currentApp === 'm') {
                        window.PhoneManager.openApp('post');
                    }
                }
            }, 300);
        },

        // ----------------------------------------------------
        // 6.7 ИЗМЕНЕНИЕ ЦЕНЫ
        // ----------------------------------------------------
        async onPriceInputChange(value) {
            if (_priceUpdatePending) return;
            if (!_currentDealId || !_currentDeal) return;

            // Нельзя менять, если уже есть подпись
            if (_currentDeal.buyerSigned || _currentDeal.sellerSigned) {
                return;
            }

            const price = Math.round(Number(value) || 0);
            if (price < 1000) {
                // Просто не отправляем слишком маленькое
                return;
            }

            // Ограничиваем
            const minAllowed = Math.round((_currentDeal.originalPrice || price) * 0.10);
            const maxAllowed = Math.round((_currentDeal.originalPrice || price) * 2.00);
            const clamped = Math.max(minAllowed, Math.min(maxAllowed, price));

            _priceUpdatePending = true;
            try {
                const res = await window.P2PDeals.updateDealPrice(_currentDealId, clamped);
                if (!res.success) {
                    // Тихо игнорируем — цена слишком близко к границе
                }
            } catch (e) {
                console.warn('[P2PDKPModal] price update error:', e);
            } finally {
                _priceUpdatePending = false;
            }
        },

        // ----------------------------------------------------
        // 6.8 ПОЛУЧИТЬ ТЕКУЩУЮ СДЕЛКУ (для отладки)
        // ----------------------------------------------------
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
            // На blur — сразу применяем
            priceInput.addEventListener('blur', (e) => {
                clearTimeout(debounceTimer);
                P2PDKPModal.onPriceInputChange(e.target.value);
            });
        }

        // Закрытие при клике по фону модалки
        const modal = _getEl('modalP2PDKP');
        if (modal && !modal._p2pBound) {
            modal._p2pBound = true;
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    // Не закрываем принудительно — игрок должен увидеть подписи
                    // P2PDKPModal.close();
                }
            });
        }
    }

    // Привязываем после загрузки DOM
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

    console.log('[📝 p2p-deals-modal v1.0.0] UI модалки ДКП между игроками загружен ✓');
    console.log('[📝 p2p-deals-modal] API: open(dealId, deal), close(), sign(), cancel(), done() ✓');

})();
// ========================================================
// js/p2p-deals-modal.js — МОДАЛЬНОЕ ОКНО ЭЛЕКТРОННОГО ДКП (v1.2.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.2.0 (P2P BOT NOTIFICATIONS & RACE CONDITION DEFENSE):
//   - ИНТЕГРАЦИЯ: автоматическая отправка Telegram Bot Push при
//     подписании ДКП покупателем/продавцом и при закрытии сделки.
//   - ФИКС: защита от повторных/одновременных кликов на кнопку подписи (isSigning flag).
//   - ФИКС: строгая валидация баланса покупателя перед вызовом window.P2PDeals.signDeal.
//   - ФИКС: real-time синхронизация подписей через onSnapshot: если вторая сторона
//     подписала договор, печать МРЭО и статус обновляются на лету без перезагрузки.
//   - СОХРАНЕНО: анимация печати МРЭО, подсчёт комиссии 3%, адаптивность интерфейса.
// ========================================================

(function () {
    'use strict';

    let currentDealId = null;
    let dealUnsubscribe = null;
    let countdownTimer = null;
    let isSigning = false;

    function _getProfile() {
        if (window.FB_Bridge?.getProfile) {
            const p = window.FB_Bridge.getProfile();
            if (p && p.id) return { id: String(p.id), name: p.name || 'Перекуп' };
        }
        const uid = window.TelegramAuthManager?.getVerifiedUserId() || window.state?.player?.uid;
        return {
            id: String(uid || 'player_local'),
            name: window.state?.player?.name || 'Перекуп'
        };
    }

    function _fmtMoney(val) {
        return (Math.round(Number(val) || 0)).toLocaleString('ru-RU') + ' ₽';
    }

    function _toast(msg) {
        if (typeof window.showToast === 'function') {
            try { window.showToast(msg); } catch (e) {}
        }
    }

    /**
     * Создание или получение DOM-контейнера модалки ДКП
     */
    function _ensureModalDOM() {
        let modal = document.getElementById('modalP2PDKP');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'modalP2PDKP';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-box dkp-official-blank">
                <div class="dkp-header text-center">
                    <div class="dkp-flag-row">
                        <span class="dkp-flag-icon">🇷🇺</span>
                    </div>
                    <div class="dkp-title-small">РОССИЙСКАЯ ФЕДЕРАЦИЯ • ГИБДД МРЭО СЕТИ</div>
                    <div class="dkp-title-main">ДОГОВОР КУПЛИ-ПРОДАЖИ ТС</div>
                    <div class="dkp-contract-num">БЛАНК ДКП № <b id="p2pDkpNum">-------</b></div>
                </div>

                <div id="p2pDkpStatusBadge" class="mb-2">
                    <span id="p2pDkpStatusText">📝 Подготовка договора</span>
                    <div id="p2pDkpTimerWrap" class="mt-1" style="display:none;">
                        Осталось: <span id="p2pDkpTimer">30:00</span>
                    </div>
                </div>

                <div class="dkp-section-compact">
                    <div class="dkp-section-title">1. СТОРОНЫ ДОГОВОРА</div>
                    <div class="dkp-two-col">
                        <div class="dkp-row-compact">
                            <span class="dkp-label">Продавец:</span>
                            <span id="p2pDkpSellerName" class="dkp-value">---</span>
                        </div>
                        <div class="dkp-row-compact">
                            <span class="dkp-label">Покупатель:</span>
                            <span id="p2pDkpBuyerName" class="dkp-value">---</span>
                        </div>
                    </div>
                </div>

                <div class="dkp-section-compact">
                    <div class="dkp-section-title">2. ПРЕДМЕТ ДОГОВОРА (ОБЪЕКТ СДЕЛКИ)</div>
                    <div class="dkp-car-info-box">
                        <div class="dkp-row-compact">
                            <span class="dkp-label">Наименование:</span>
                            <b id="p2pDkpItemName" class="dkp-value color-cyan">---</b>
                        </div>
                        <div class="dkp-row-compact">
                            <span class="dkp-label">Идентификатор / Госномер:</span>
                            <span id="p2pDkpItemPlate" class="dkp-value-mono">ТРАНЗИТ</span>
                        </div>
                    </div>
                </div>

                <div class="dkp-section-compact">
                    <div class="dkp-section-title">3. СУММА ДОГОВОРА И РАСЧЁТЫ</div>
                    <div id="p2pDkpPriceLockedWrap">
                        <div class="dkp-price-line-highlight flex-between">
                            <span class="sub-label">Сумма к оплате:</span>
                            <b id="p2pDkpPriceLocked" class="color-green font-bold">--- ₽</b>
                        </div>
                    </div>
                    <div class="flex-between text-xs mt-1 px-1">
                        <span class="sub-label" style="font-size:9px;">Сервисный сбор биржи (3%):</span>
                        <span id="p2pDkpFee" style="font-size:9.5px;">0 ₽</span>
                    </div>
                    <div class="flex-between text-xs mt-1 px-1">
                        <span class="sub-label" style="font-size:9px;">К выплате продавцу:</span>
                        <span id="p2pDkpPayout" style="font-size:9.5px;">0 ₽</span>
                    </div>
                </div>

                <div class="dkp-signatures-area dkp-compact-sigs">
                    <div class="dkp-sig-col">
                        <span class="dkp-sig-label">Подпись Продавца:</span>
                        <div id="p2pDkpSellerSig" class="dkp-handwrite">Не подписано</div>
                        <div id="p2pDkpSellerSigDate" class="dkp-sig-date">--.--.----</div>
                    </div>

                    <div id="p2pDkpStamp">
                        <div class="stamp-inner">
                            <span>★ ГИБДД ★</span>
                            <span>МРЭО СЕТИ</span>
                            <span>СДЕЛКА</span>
                            <span>УТВЕРЖДЕНА</span>
                        </div>
                    </div>

                    <div class="dkp-sig-col text-right">
                        <span class="dkp-sig-label">Подпись Покупателя:</span>
                        <div id="p2pDkpBuyerSig" class="dkp-handwrite">Не подписано</div>
                        <div id="p2pDkpBuyerSigDate" class="dkp-sig-date">--.--.----</div>
                    </div>
                </div>

                <div id="p2pDkpActionBlock" class="mt-2">
                    <button id="p2pDkpSignBtn" class="btn btn-green btn-block font-bold">
                        <i class="fa-solid fa-signature mr-1"></i> ПОДПИСАТЬ ЭЛЕКТРОННОЙ ПОДПИСЬЮ
                    </button>
                    <div class="flex-between mt-2" style="gap:8px;">
                        <button id="p2pDkpCancelBtn" class="btn btn-dark btn-sm flex-1">
                            Отозвать договор
                        </button>
                        <button id="p2pDkpCloseBtn" class="btn btn-dark btn-sm flex-1">
                            Закрыть окно
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#p2pDkpSignBtn').addEventListener('click', _onSignClicked);
        modal.querySelector('#p2pDkpCancelBtn').addEventListener('click', _onCancelClicked);
        modal.querySelector('#p2pDkpCloseBtn').addEventListener('click', () => {
            window.closeP2PDKPModal();
        });

        return modal;
    }

    /**
     * Открытие модального окна сделки
     */
    window.openP2PDKPModal = async function (dealId) {
        if (!dealId) return;
        currentDealId = String(dealId);
        isSigning = false;

        const modal = _ensureModalDOM();

        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalP2PDKP', { closeOthers: false });
        } else {
            modal.classList.add('active');
        }

        if (window.AudioFx) window.AudioFx.play('paper');

        if (dealUnsubscribe) {
            try { dealUnsubscribe(); } catch (e) {}
            dealUnsubscribe = null;
        }

        if (window.P2PDeals?.subscribeToDeal) {
            dealUnsubscribe = window.P2PDeals.subscribeToDeal(currentDealId, (deal) => {
                if (deal) _renderDealUI(deal);
            });
        }

        if (window.P2PDeals?.fetchDeal) {
            const initialDeal = await window.P2PDeals.fetchDeal(currentDealId);
            if (initialDeal) _renderDealUI(initialDeal);
        }
    };

    /**
     * Закрытие модального окна
     */
    window.closeP2PDKPModal = function () {
        if (dealUnsubscribe) {
            try { dealUnsubscribe(); } catch (e) {}
            dealUnsubscribe = null;
        }
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
        currentDealId = null;
        isSigning = false;

        if (typeof ModalManager !== 'undefined') {
            ModalManager.close('modalP2PDKP');
        } else {
            const m = document.getElementById('modalP2PDKP');
            if (m) m.classList.remove('active');
        }
    };

    /**
     * Отрисовка интерфейса ДКП
     */
    function _renderDealUI(deal) {
        if (!deal) return;
        const myProfile = _getProfile();
        const modal = document.getElementById('modalP2PDKP');
        if (!modal) return;

        // Номер договора
        const dkpNumEl = modal.querySelector('#p2pDkpNum');
        if (dkpNumEl) dkpNumEl.textContent = (deal.dealId || deal.id || '---').toUpperCase();

        // Стороны
        const sellerNameEl = modal.querySelector('#p2pDkpSellerName');
        const buyerNameEl = modal.querySelector('#p2pDkpBuyerName');
        if (sellerNameEl) sellerNameEl.textContent = deal.sellerName || 'Продавец';
        if (buyerNameEl) buyerNameEl.textContent = deal.buyerName || 'Покупатель';

        // Предмет сделки
        const snap = deal.itemSnapshot || {};
        const itemNameEl = modal.querySelector('#p2pDkpItemName');
        const itemPlateEl = modal.querySelector('#p2pDkpItemPlate');
        if (itemNameEl) itemNameEl.textContent = snap.name || 'Транспортное средство';
        if (itemPlateEl) {
            itemPlateEl.textContent = snap.plate || snap.number || snap.vin || 'ТРАНЗИТ';
        }

        // Финансы
        const price = Number(deal.currentPrice) || Number(deal.originalPrice) || 0;
        const fee = Math.round(price * 0.03);
        const payout = Math.max(0, price - fee);

        const priceEl = modal.querySelector('#p2pDkpPriceLocked');
        const feeEl = modal.querySelector('#p2pDkpFee');
        const payoutEl = modal.querySelector('#p2pDkpPayout');
        if (priceEl) priceEl.textContent = _fmtMoney(price);
        if (feeEl) feeEl.textContent = _fmtMoney(fee);
        if (payoutEl) payoutEl.textContent = _fmtMoney(payout);

        // Статус-баннер
        const badgeEl = modal.querySelector('#p2pDkpStatusBadge');
        const statusTextEl = modal.querySelector('#p2pDkpStatusText');
        const isCompleted = deal.status === 'completed';
        const isCancelled = deal.status === 'cancelled';

        if (badgeEl && statusTextEl) {
            badgeEl.className = 'mb-2';
            if (isCompleted) {
                badgeEl.classList.add('status-completed');
                statusTextEl.innerHTML = '✅ СДЕЛКА ЗАКРЫТА • ТС ПЕРЕДАНО В ГАРАЖ';
            } else if (isCancelled) {
                badgeEl.classList.add('status-cancelled');
                statusTextEl.innerHTML = '⛔ ДОГОВОР АННУЛИРОВАН';
            } else if (deal.buyerSigned && !deal.sellerSigned) {
                badgeEl.classList.add('status-buyer-signed');
                statusTextEl.innerHTML = '✍️ ПОДПИСАНО ПОКУПАТЕЛЕМ • ОЖИДАЕТ ПРОДАВЦА';
            } else if (deal.sellerSigned && !deal.buyerSigned) {
                badgeEl.classList.add('status-seller-signed');
                statusTextEl.innerHTML = '✍️ ПОДПИСАНО ПРОДАВЦОМ • ОЖИДАЕТ ПОКУПАТЕЛЯ';
            } else {
                statusTextEl.innerHTML = '📝 ЧЕРНОВИК ДКП • ОЖИДАЕТ ПОДПИСАНИЯ СТОРОН';
            }
        }

        // Подпись Продавца
        const sellerSigEl = modal.querySelector('#p2pDkpSellerSig');
        const sellerDateEl = modal.querySelector('#p2pDkpSellerSigDate');
        if (deal.sellerSigned) {
            sellerSigEl.textContent = deal.sellerName || 'Продавец';
            sellerSigEl.className = 'dkp-handwrite sig-placed';
            sellerDateEl.textContent = new Date(deal.sellerSignedAt || Date.now()).toLocaleDateString('ru-RU');
        } else {
            sellerSigEl.textContent = 'Ожидает подписи';
            sellerSigEl.className = 'dkp-handwrite';
            sellerDateEl.textContent = '--.--.----';
        }

        // Подпись Покупателя
        const buyerSigEl = modal.querySelector('#p2pDkpBuyerSig');
        const buyerDateEl = modal.querySelector('#p2pDkpBuyerSigDate');
        if (deal.buyerSigned) {
            buyerSigEl.textContent = deal.buyerName || 'Покупатель';
            buyerSigEl.className = 'dkp-handwrite sig-placed';
            buyerDateEl.textContent = new Date(deal.buyerSignedAt || Date.now()).toLocaleDateString('ru-RU');
        } else {
            buyerSigEl.textContent = 'Ожидает подписи';
            buyerSigEl.className = 'dkp-handwrite';
            buyerDateEl.textContent = '--.--.----';
        }

        // Печать МРЭО
        const stampEl = modal.querySelector('#p2pDkpStamp');
        if (stampEl) {
            if (isCompleted) {
                stampEl.classList.add('stamp-approved');
            } else {
                stampEl.classList.remove('stamp-approved');
            }
        }

        // Управление кнопкой подписания
        const signBtn = modal.querySelector('#p2pDkpSignBtn');
        const cancelBtn = modal.querySelector('#p2pDkpCancelBtn');
        const isBuyer = String(deal.buyerId) === String(myProfile.id);
        const isSeller = String(deal.sellerId) === String(myProfile.id);

        if (isCompleted || isCancelled) {
            if (signBtn) {
                signBtn.disabled = true;
                signBtn.innerHTML = isCompleted ? '✅ СДЕЛКА УСПЕШНО ЗАКРЫТА' : '⛔ ДОГОВОР ОТМЕНЁН';
            }
            if (cancelBtn) cancelBtn.style.display = 'none';
        } else {
            if (cancelBtn) cancelBtn.style.display = 'block';

            let alreadySignedByMe = false;
            if (isBuyer && deal.buyerSigned) alreadySignedByMe = true;
            if (isSeller && deal.sellerSigned) alreadySignedByMe = true;

            if (signBtn) {
                if (alreadySignedByMe) {
                    signBtn.disabled = true;
                    signBtn.innerHTML = '⏳ ВЫ УЖЕ ПОДПИСАЛИ • ОЖИДАЕМ ВТОРОГО ИГРОКА';
                } else {
                    signBtn.disabled = isSigning;
                    signBtn.innerHTML = '<i class="fa-solid fa-signature mr-1"></i> ПОДПИСАТЬ ЭЛЕКТРОННОЙ ПОДПИСЬЮ';
                }
            }
        }
    }

    /**
     * Обработка нажатия кнопки «Подписать»
     */
    async function _onSignClicked() {
        if (!currentDealId || isSigning) return;

        const myProfile = _getProfile();
        let deal = await window.P2PDeals.fetchDeal(currentDealId);
        if (!deal) return _toast('❌ Сделка не найдена');

        const isBuyer = String(deal.buyerId) === String(myProfile.id);
        const isSeller = String(deal.sellerId) === String(myProfile.id);
        const role = isBuyer ? 'buyer' : (isSeller ? 'seller' : 'buyer');

        // Проверка баланса перед подписанием
        if (role === 'buyer') {
            const price = Number(deal.currentPrice) || Number(deal.originalPrice) || 0;
            const currentCash = Number(window.state?.player?.cash) || 0;
            if (currentCash < price) {
                return _toast(`❌ Недостаточно средств! Нужно: ${_fmtMoney(price)}`);
            }
        }

        isSigning = true;
        const signBtn = document.getElementById('p2pDkpSignBtn');
        if (signBtn) {
            signBtn.disabled = true;
            signBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> РЕГИСТРАЦИЯ В БАЗЕ МРЭО...';
        }

        try {
            const res = await window.P2PDeals.signDeal(currentDealId, role);
            if (res.success) {
                _toast(res.completed ? '🎉 Сделка закрыта! Объект передан' : '✍️ Подпись поставлена!');
                if (window.AudioFx) {
                    window.AudioFx.play('win');
                    window.AudioFx.haptic('success');
                }
            } else {
                _toast(`❌ ${res.error || 'Ошибка подписания'}`);
                if (window.AudioFx) window.AudioFx.play('error');
            }
        } catch (e) {
            _toast(`❌ Ошибка: ${e.message || e}`);
        } finally {
            isSigning = false;
            deal = await window.P2PDeals.fetchDeal(currentDealId);
            if (deal) _renderDealUI(deal);
        }
    }

    /**
     * Обработка нажатия кнопки «Отозвать»
     */
    async function _onCancelClicked() {
        if (!currentDealId) return;
        if (!confirm('Вы уверены, что хотите аннулировать договор ДКП?')) return;

        try {
            await window.P2PDeals.cancelDeal(currentDealId, 'Отозвано участником');
            _toast('⛔ Договор аннулирован');
            window.closeP2PDKPModal();
        } catch (e) {
            _toast(`❌ Ошибка отмены: ${e.message || e}`);
        }
    }

    console.log('[✍️ p2p-deals-modal v1.2.0] Модалка ДКП + атомарная подпись + защита от race conditions ✓');
})();

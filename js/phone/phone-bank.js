// ========================================================
// js/phone-bank.js — БАНК «ВО-БАНК ОНЛАЙН» (v2.4.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v2.4.0 (КРИТИЧЕСКИЙ ФИКС):
//   - ФИКС: _refreshExchangeButtonState проверяет баланс
//     игрока. Раньше кнопка «ОБМЕНЯТЬ СЕЙЧАС» была активна
//     даже при недостатке средств, что давало плохой UX.
//   - ФИКС: _exchangeActionPending — защита от двойного клика.
//   - ФИКС: _loanActionPending — защита от двойного оформления
//     кредита (раньше можно было получить 2× деньги).
//   - ФИКС: buySuperSpinTicketAction делегирует в
//     PhoneMedia.purchaseSuperSpinTicket (единая точка покупки).
//   - ФИКС: все методы защищены от !state.player.
// ⭐ v2.3.0: Обменник читает курс из BANK_EXCHANGE_RATES.
//   - Каретка в инпуте больше не прыгает (partial update).
//   - Табло котировок синхронизировано с курсом ⭐ = 2,500 ₽.
//   - Мин. обмен: 1 ⭐ = 2,500 ₽.
// ========================================================

const AppBank = {
    activeSubTab: 'exchange',
    exchangeDirection: 'rub_to_stars',
    exchangeAmountInput: 2500,

    // ⭐ v2.4.0: флаги блокировки
    _exchangeActionPending: false,
    _loanActionPending: false,

    // ⭐ v2.3.0: единый геттер курса
    _getStarRate() {
        const cfg = window.BANK_EXCHANGE_RATES;
        if (cfg && cfg.stars && typeof cfg.stars.buyRub === 'number') {
            return cfg.stars.buyRub;
        }
        return 2500; // безопасный фолбек
    },

    render(container) {
        if (!container) return;

        let sub = this.activeSubTab;

        container.innerHTML = `
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 230, 118, 0.4);">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn">
                    <i class="fa-solid fa-chevron-left"></i> Назад
                </button>
                <div class="phone-app-title color-green">
                    <i class="fa-solid fa-building-columns mr-1"></i> Во-Банк Онлайн
                </div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body">
                <div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 4px;">
                    <button onclick="AppBank.switchSubTab('accounts')" class="btn ${sub === 'accounts' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        СЧЕТА
                    </button>
                    <button onclick="AppBank.switchSubTab('exchange')" class="btn ${sub === 'exchange' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        ОБМЕННИК
                    </button>
                    <button onclick="AppBank.switchSubTab('deposits')" class="btn ${sub === 'deposits' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        ВКЛАДЫ
                    </button>
                    <button onclick="AppBank.switchSubTab('reputation')" class="btn ${sub === 'reputation' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        РЕПУТАЦИЯ
                    </button>
                </div>

                <div class="grid-3 mb-2" style="grid-template-columns: repeat(3, 1fr); gap: 4px;">
                    <button onclick="AppBank.switchSubTab('crypto')" class="btn ${sub === 'crypto' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">
                        КРИПТА
                    </button>
                    <button onclick="AppBank.switchSubTab('loan')" class="btn ${sub === 'loan' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">
                        КРЕДИТ
                    </button>
                    <button onclick="AppBank.switchSubTab('mortgage')" class="btn ${sub === 'mortgage' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">
                        ИПОТЕКА
                    </button>
                </div>

                <div id="bankSubContentBox"></div>
            </div>
        `;

        const subBox = document.getElementById('bankSubContentBox');
        if (!subBox) return;

        try {
            if (sub === 'exchange') this.renderExchangeScreen(subBox);
            else if (sub === 'accounts') this.renderAccountsScreen(subBox);
            else if (sub === 'deposits') this.renderDepositsScreen(subBox);
            else if (sub === 'reputation') this.renderReputationScreen(subBox);
            else if (sub === 'crypto') this.renderCryptoScreen(subBox);
            else if (sub === 'loan') this.renderLoanScreen(subBox);
            else if (sub === 'mortgage') this.renderMortgageScreen(subBox);
        } catch (e) {
            console.error('[AppBank] Ошибка рендера:', e);
            subBox.innerHTML = `
                <div class="glass-card p-3 text-center" style="border-color: var(--red);">
                    <div style="font-size: 32px; margin-bottom: 6px;">⚠️</div>
                    <b class="color-red text-xs">Ошибка банка</b>
                    <div class="sub-label mt-1" style="font-size: 9.5px;">${String(e.message || e).substring(0, 120)}</div>
                </div>
            `;
        }
    },

    switchSubTab(tab) {
        this.activeSubTab = tab;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // ОБМЕННИК ВАЛЮТ
    // ========================================================
    renderExchangeScreen(container) {
        if (!container) return;

        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;
        let superSpinTickets = state.player?.superSpinTickets || 1;

        let dir = this.exchangeDirection;
        let inputVal = this.exchangeAmountInput || 0;

        const starRate = this._getStarRate();

        let resultVal = 0;
        if (dir === 'rub_to_stars') {
            resultVal = Math.floor(inputVal / starRate);
        } else {
            resultVal = inputVal * starRate;
        }

        const superWheelStars = window.WHEEL_CONFIG?.superWheel?.costStars || 60;
        const superWheelCash = window.WHEEL_CONFIG?.superWheel?.costCash || 150000;

        container.innerHTML = `
            <div class="glass-card mb-2 p-2" style="background:#050914; border:1px solid rgba(0, 242, 254, 0.35);">
                <div class="flex-between mb-1">
                    <span class="sub-label font-bold" style="font-size:8.5px; color:#94a3b8;"><i class="fa-solid fa-chart-line color-cyan mr-1"></i> ТАБЛО КОТИРОВОК ЦБ РФ & КРИПТОВАЛЮТ</span>
                    <span class="tag-badge bg-tag-green" style="font-size:7.5px;">LIVE 24/7</span>
                </div>
                <div class="grid-4 text-center py-1" style="grid-template-columns: repeat(4, 1fr); gap: 4px; background: rgba(0,0,0,0.5); border-radius: 8px;">
                    <div>
                        <div class="sub-label" style="font-size:8px;">USD/RUB</div>
                        <b class="color-green text-xs" style="font-size:10px;">94.20 ₽</b>
                        <div class="color-green" style="font-size:7px;">▲ +0.4%</div>
                    </div>
                    <div>
                        <div class="sub-label" style="font-size:8px;">EUR/RUB</div>
                        <b class="color-green text-xs" style="font-size:10px;">102.50 ₽</b>
                        <div class="color-green" style="font-size:7px;">▲ +0.2%</div>
                    </div>
                    <div>
                        <div class="sub-label" style="font-size:8px;">BTC/RUB</div>
                        <b class="color-amber text-xs" style="font-size:10px;">9.45M ₽</b>
                        <div class="color-green" style="font-size:7px;">▲ +1.8%</div>
                    </div>
                    <div>
                        <div class="sub-label" style="font-size:8px;">STARS ⭐</div>
                        <b class="color-cyan text-xs" style="font-size:10px;">${starRate.toLocaleString()} ₽</b>
                        <div class="color-cyan" style="font-size:7px;">ФИКС 1:${(starRate/1000).toFixed(1)}k</div>
                    </div>
                </div>
            </div>

            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(255, 179, 0, 0.12), #090e18); border-color: var(--amber);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-star"></i> Гарантированный курс Stars</b>
                    <span class="tag-badge bg-tag-amber">ФИКС 100%</span>
                </div>
                <div class="font-bold text-xs color-green" style="font-size:14px;">1 ⭐ = ${starRate.toLocaleString()} ₽</div>
                <div class="sub-label mt-1" style="font-size:8.5px;">Официальный обменный пункт Во-Банка без скрытых комиссий и проскальзываний.</div>
            </div>

            <div class="glass-card mb-2 p-3" style="background: #090e18; border-color: rgba(255,255,255,0.08);">
                <div class="flex-between mb-2">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-arrow-right-arrow-left mr-1"></i> Калькулятор конвертации</b>
                    <span class="tag-badge bg-tag-cyan"><i class="fa-solid fa-bolt mr-1"></i> Без комиссии</span>
                </div>

                <div class="mb-2">
                    <div class="flex-between mb-1 text-xs">
                        <span class="sub-label font-bold" style="font-size:9px;">ОТДАЮ:</span>
                        <span class="sub-label" style="font-size:9px;">Баланс: <b class="color-cyan" id="bankExchangeFromBalance">${dir === 'rub_to_stars' ? cash.toLocaleString() + ' ₽' : stars + ' ⭐'}</b></span>
                    </div>
                    <div class="grid-2" style="grid-template-columns: 120px 1fr; gap:6px;">
                        <div class="p-2" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.1); font-size:11px; font-weight:800;">
                            ${dir === 'rub_to_stars' ? '₽ Рубли ₽' : '⭐ Stars ⭐'}
                        </div>
                        <input type="number" id="bankExchangeInput" value="${inputVal}" oninput="AppBank.onExchangeInputChanged(this.value)" class="chat-input text-right font-bold" style="font-size:14px; padding:6px 10px; color:#fff;" min="0" step="1">
                    </div>
                </div>

                <div class="grid-4 mb-2" style="gap:4px;">
                    <button onclick="AppBank.setExchangePercent(25)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">25%</button>
                    <button onclick="AppBank.setExchangePercent(50)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">50%</button>
                    <button onclick="AppBank.setExchangePercent(75)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">75%</button>
                    <button onclick="AppBank.setExchangePercent(100)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">MAX</button>
                </div>

                <div class="text-center my-1">
                    <button onclick="AppBank.toggleExchangeDirection()" class="btn btn-dark btn-auto btn-sm" style="width:34px; height:34px; border-radius:50%; padding:0; line-height:34px;" title="Поменять направление">
                        <i class="fa-solid fa-arrows-up-down color-cyan"></i>
                    </button>
                </div>

                <div class="mb-3">
                    <div class="flex-between mb-1 text-xs">
                        <span class="sub-label font-bold" style="font-size:9px;">ПОЛУЧАЮ:</span>
                        <span class="sub-label" style="font-size:9px;">Баланс: <b class="color-green" id="bankExchangeToBalance">${dir === 'rub_to_stars' ? stars + ' ⭐' : cash.toLocaleString() + ' ₽'}</b></span>
                    </div>
                    <div class="grid-2" style="grid-template-columns: 120px 1fr; gap:6px;">
                        <div class="p-2" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.1); font-size:11px; font-weight:800;">
                            ${dir === 'rub_to_stars' ? '⭐ Stars ⭐' : '₽ Рубли ₽'}
                        </div>
                        <div class="p-2 text-right font-bold color-green" id="bankExchangeResult" style="background:#050914; border-radius:8px; border:1px solid rgba(0,230,118,0.3); font-size:14px;">
                            +${resultVal.toLocaleString()} ${dir === 'rub_to_stars' ? '⭐' : '₽'}
                        </div>
                    </div>
                    <div class="sub-label text-center mt-1" style="font-size:8px;" id="bankExchangeRateHint">
                        Курс конвертации: <b>1 ⭐ = ${starRate.toLocaleString()} ₽</b>
                    </div>
                </div>

                <button id="bankExchangeSubmitBtn" onclick="AppBank.executeExchangeAction()" class="btn btn-green w-full font-bold" style="padding:10px 0; font-size:12px;">
                    ОБМЕНЯТЬ СЕЙЧАС
                </button>
            </div>

            <div class="glass-card p-2 flex-between" style="border-left: 3px solid var(--green); background:#090e18;">
                <div>
                    <div class="font-bold text-xs color-green"><i class="fa-solid fa-ticket-simple mr-1"></i> Билет «Супер Вилспин»</div>
                    <div class="sub-label" style="font-size:8.5px;">На балансе: <b>${superSpinTickets} шт.</b></div>
                </div>
                <button onclick="AppBank.buySuperSpinTicketAction()" class="btn btn-green btn-auto btn-sm font-bold" style="font-size:9.5px; padding:5px 10px;">
                    КУПИТЬ (${(superWheelCash/1000).toFixed(0)}K или ${superWheelStars} ⭐)
                </button>
            </div>
        `;

        this._refreshExchangeButtonState();
    },

    // ⭐ v2.4.0: обновляет ТОЛЬКО блок результата (без пересоздания input)
    _updateExchangeResultOnly() {
        const dir = this.exchangeDirection;
        const inputVal = this.exchangeAmountInput || 0;
        const starRate = this._getStarRate();

        let resultVal = 0;
        if (dir === 'rub_to_stars') {
            resultVal = Math.floor(inputVal / starRate);
        } else {
            resultVal = inputVal * starRate;
        }

        const resultEl = document.getElementById('bankExchangeResult');
        if (resultEl) {
            resultEl.innerText = `+${resultVal.toLocaleString()} ${dir === 'rub_to_stars' ? '⭐' : '₽'}`;
        }

        this._refreshExchangeButtonState(resultVal);
    },

    // ⭐ v2.4.0: обновляет подписи кнопки submit + проверяет баланс
    _refreshExchangeButtonState(precomputedResult) {
        const dir = this.exchangeDirection;
        const inputVal = this.exchangeAmountInput || 0;
        const starRate = this._getStarRate();

        let resultVal = precomputedResult;
        if (resultVal === undefined) {
            resultVal = dir === 'rub_to_stars' ? Math.floor(inputVal / starRate) : inputVal * starRate;
        }

        const btn = document.getElementById('bankExchangeSubmitBtn');
        if (!btn) return;

        let btnText = 'ОБМЕНЯТЬ СЕЙЧАС';
        let btnDisabled = false;

        const cash = state.player?.cash || 0;
        const stars = state.player?.stars || 0;

        if (inputVal <= 0) {
            btnText = 'ВВЕДИТЕ СУММУ';
            btnDisabled = true;
        } else if (dir === 'rub_to_stars') {
            if (resultVal <= 0) {
                btnText = `МИНИМУМ ${starRate.toLocaleString()} ₽ ЗА 1 ⭐`;
                btnDisabled = true;
            } else if (cash < inputVal) {
                btnText = `НЕ ХВАТАЕТ ₽ (ЕСТЬ ${cash.toLocaleString()})`;
                btnDisabled = true;
            } else {
                btnText = `ОБМЕНЯТЬ (${inputVal.toLocaleString()} ₽ → ${resultVal} ⭐)`;
            }
        } else {
            if (stars < inputVal) {
                btnText = `НЕ ХВАТАЕТ ⭐ (ЕСТЬ ${stars})`;
                btnDisabled = true;
            } else {
                btnText = `ОБМЕНЯТЬ (${inputVal} ⭐ → ${resultVal.toLocaleString()} ₽)`;
            }
        }

        if (this._exchangeActionPending) {
            btnText = 'ОБРАБОТКА...';
            btnDisabled = true;
        }

        btn.innerText = btnText;
        btn.disabled = btnDisabled;
    },

    toggleExchangeDirection() {
        this.exchangeDirection = this.exchangeDirection === 'rub_to_stars' ? 'stars_to_rub' : 'rub_to_stars';
        this.exchangeAmountInput = this.exchangeDirection === 'rub_to_stars'
            ? this._getStarRate()
            : 1;
        if (typeof playSound === 'function') playSound('tick');
        this.renderExchangeScreen(document.getElementById('bankSubContentBox'));
    },

    onExchangeInputChanged(val) {
        let n = parseInt(val, 10);
        this.exchangeAmountInput = isNaN(n) ? 0 : Math.max(0, n);
        this._updateExchangeResultOnly();
    },

    setExchangePercent(pct) {
        const dir = this.exchangeDirection;
        let maxVal = dir === 'rub_to_stars' ? (state.player?.cash || 0) : (state.player?.stars || 0);

        let newVal = Math.floor(maxVal * (pct / 100));

        if (newVal <= 0 && maxVal > 0) {
            newVal = dir === 'rub_to_stars' ? this._getStarRate() : 1;
        }

        if (dir === 'rub_to_stars' && pct === 100) {
            const starRate = this._getStarRate();
            newVal = Math.floor(maxVal / starRate) * starRate;
            if (newVal <= 0) newVal = starRate;
        }

        this.exchangeAmountInput = newVal;

        const inputEl = document.getElementById('bankExchangeInput');
        if (inputEl) inputEl.value = newVal;

        this._updateExchangeResultOnly();

        if (typeof playSound === 'function') playSound('tick');
    },

    // ⭐ v2.4.0: защита от двойного клика
    executeExchangeAction() {
        if (this._exchangeActionPending) return;
        if (!state.player) return showToast("❌ Профиль игрока недоступен");

        const dir = this.exchangeDirection;
        const val = this.exchangeAmountInput || 0;
        const starRate = this._getStarRate();

        if (val <= 0) return showToast("Введите сумму для конвертации!");

        let cash = state.player.cash || 0;
        let stars = state.player.stars || 0;

        this._exchangeActionPending = true;

        try {
            if (dir === 'rub_to_stars') {
                if (val < starRate) return showToast(`Минимальный обмен: ${starRate.toLocaleString()} ₽ за 1 ⭐!`);
                if (cash < val) return showToast("Недостаточно рублей на балансе!");

                let starsGained = Math.floor(val / starRate);
                let rubSpent = starsGained * starRate;

                if (starsGained <= 0) return showToast("Слишком маленькая сумма!");

                state.player.cash -= rubSpent;
                state.player.stars += starsGained;

                if (typeof logBankTransaction === 'function') {
                    logBankTransaction(`Обмен валюты: -${rubSpent.toLocaleString()} ₽ на +${starsGained} ⭐`, rubSpent, false);
                }

                saveState();
                updateHeaderUI();
                if (typeof playSound === 'function') playSound('win');
                if (typeof tgHaptic === 'function') tgHaptic('success');
                showToast(`Успешно получено +${starsGained} Stars ⭐!`);
            } else {
                if (stars < val) return showToast("Недостаточно Stars на балансе!");

                let rubGained = val * starRate;
                state.player.stars -= val;
                state.player.cash += rubGained;

                if (typeof logBankTransaction === 'function') {
                    logBankTransaction(`Конвертация Stars: -${val} ⭐ в +${rubGained.toLocaleString()} ₽`, rubGained, true);
                }

                saveState();
                updateHeaderUI();
                if (typeof playSound === 'function') playSound('win');
                if (typeof tgHaptic === 'function') tgHaptic('success');
                showToast(`Успешно начислено +${rubGained.toLocaleString()} ₽!`);
            }

            this.exchangeAmountInput = dir === 'rub_to_stars' ? starRate : 1;
            this.renderExchangeScreen(document.getElementById('bankSubContentBox'));
        } finally {
            this._exchangeActionPending = false;
        }
    },

    // ⭐ v2.4.0: делегирует в PhoneMedia
    buySuperSpinTicketAction() {
        if (typeof PhoneMedia !== 'undefined' && typeof PhoneMedia.purchaseSuperSpinTicket === 'function') {
            const ok = PhoneMedia.purchaseSuperSpinTicket();
            if (ok) {
                this.renderExchangeScreen(document.getElementById('bankSubContentBox'));
            }
            return;
        }

        // Fallback — если PhoneMedia не загружен
        const cfg = window.WHEEL_CONFIG?.superWheel || { costCash: 150000, costStars: 60 };
        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;

        if (cash >= cfg.costCash) {
            state.player.cash -= cfg.costCash;
        } else if (stars >= cfg.costStars) {
            state.player.stars -= cfg.costStars;
        } else {
            return showToast(`Нужно ${cfg.costCash.toLocaleString()} ₽ или ${cfg.costStars} Stars ⭐ на покупку билета!`);
        }

        state.player.superSpinTickets = (state.player.superSpinTickets || 0) + 1;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Покупка билета Супер Вилспин`, cfg.costCash, false);
        }

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Билет «Супер Вилспин» успешно приобретен! Крутите колесо в Фортуне 🎰");
        this.renderExchangeScreen(document.getElementById('bankSubContentBox'));
    },

    // ========================================================
    // ДРУГИЕ РАЗДЕЛЫ
    // ========================================================
    renderAccountsScreen(container) {
        if (!container) return;
        let p = state.player || {};
        let history = p.bankHistory || [];

        let historyHtml = history.length === 0
            ? `<div class="sub-label text-center py-4">Транзакций пока нет.</div>`
            : history.slice(0, 10).map(tx => `
                <div class="p-2 mb-1 flex-between" style="background:#090e18; border-radius:6px; font-size:10px;">
                    <div>
                        <b>${tx.title}</b>
                        <div class="sub-label" style="font-size:8px;">${tx.time || 'Сегодня'}</div>
                    </div>
                    <b class="${tx.isIncome ? 'color-green' : 'color-red'}">${tx.isIncome ? '+' : '-'}${Number(tx.amount).toLocaleString()} ₽</b>
                </div>
            `).join('');

        container.innerHTML = `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0,230,118,0.18), #090e18);">
                <span class="sub-label text-xs">Текущий расчетный счет перекупа:</span>
                <div class="price-val color-green my-1" style="font-size:24px;">${Number(p.cash || 0).toLocaleString()} ₽</div>
                <div class="sub-label" style="font-size:9px;">Премиальный резерв: <b class="color-amber">${Number(p.stars || 0)} ⭐</b></div>
            </div>

            <b class="text-xs color-green block mb-1"><i class="fa-solid fa-clock-rotate-left mr-1"></i> История операций:</b>
            <div class="space-y-1">${historyHtml}</div>
        `;
    },

    renderDepositsScreen(container) {
        if (!container) return;
        let safe = state.player?.safeDeposit || 0;

        container.innerHTML = `
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.12), #090e18); border-color: var(--cyan);">
                <div>
                    <b class="text-xs color-cyan"><i class="fa-solid fa-vault mr-1"></i> Несгораемый депозитный сейф</b>
                    <div class="sub-label" style="font-size:8.5px;">Иммунитет к долгам и ограблениям. Без процентов.</div>
                </div>
                <div class="text-right">
                    <span class="sub-label" style="font-size:8px;">В СЕЙФЕ:</span>
                    <div class="price-val color-green text-xs" style="font-size:14px;">${safe.toLocaleString()} ₽</div>
                </div>
            </div>

            <div class="grid-2">
                <button onclick="AppBank.depositToSafePrompt()" class="btn btn-cyan btn-sm">Внести в сейф 📥</button>
                <button onclick="AppBank.withdrawSafePrompt()" class="btn btn-dark btn-sm" ${safe <= 0 ? 'disabled' : ''}>Снять из сейфа 📤</button>
            </div>
        `;
    },

    depositToSafePrompt() {
        if (!state.player) return;
        let str = prompt("Сумма для внесения в сейф (₽):", "100000");
        if (!str) return;
        let val = parseInt(str, 10);
        if (isNaN(val) || val <= 0) return showToast("Некорректная сумма!");

        let cash = state.player.cash || 0;
        if (cash < val) return showToast("Недостаточно денег на балансе!");

        state.player.cash -= val;
        state.player.safeDeposit = (state.player.safeDeposit || 0) + val;
        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        showToast(`В сейф внесено +${val.toLocaleString()} ₽!`);
        this.renderDepositsScreen(document.getElementById('bankSubContentBox'));
    },

    withdrawSafePrompt() {
        if (!state.player) return;
        let safe = state.player.safeDeposit || 0;
        let str = prompt(`Сколько снять из сейфа? (Доступно: ${safe.toLocaleString()} ₽):`, String(safe));
        if (!str) return;
        let val = parseInt(str, 10);
        if (isNaN(val) || val <= 0 || val > safe) return showToast("Некорректная сумма!");

        state.player.safeDeposit -= val;
        state.player.cash += val;
        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        showToast(`Из сейфа снято +${val.toLocaleString()} ₽!`);
        this.renderDepositsScreen(document.getElementById('bankSubContentBox'));
    },

    renderReputationScreen(container) {
        if (!container) return;
        let rep = state.player?.bankReputation || { rating: 5.0, loanLimit: 500000 };
        container.innerHTML = `
            <div class="glass-card mb-2 p-3 text-center" style="background:#090e18; border-color:var(--green);">
                <div class="font-bold text-xs color-green mb-1">РЕЙТИНГ КРЕДИТОСПОСОБНОСТИ</div>
                <div class="price-val color-amber my-1" style="font-size:26px;">⭐ ${Number(rep.rating).toFixed(1)} / 5.0</div>
                <div class="sub-label" style="font-size:9.5px;">Лимит кредитования: <b class="color-green">${Number(rep.loanLimit).toLocaleString()} ₽</b></div>
            </div>
        `;
    },

    renderCryptoScreen(container) {
        if (!container) return;
        let crypto = state.player?.crypto || { btc: 0, eth: 0, prices: { btc: 9500000, eth: 340000 } };
        container.innerHTML = `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-brands fa-bitcoin"></i> Bitcoin (BTC)</b>
                    <span class="color-green text-xs font-bold">${Number(crypto.prices.btc).toLocaleString()} ₽</span>
                </div>
                <div class="sub-label mb-2" style="font-size:8.5px;">На кошельке: <b>${crypto.btc || 0} BTC</b></div>
                <button onclick="showToast('Биржа крипты на техобслуживании')" class="btn btn-dark btn-sm w-full">Купить / Продать BTC</button>
            </div>
        `;
    },

    // ========================================================
    // КРЕДИТНАЯ ЛИНЕЙКА
    // ========================================================
    renderLoanScreen(container) {
        if (!container) return;
        let debt = state.player?.loanDebt || 0;
        let lvl = state.player?.level || 1;

        let options = [
            { id: "starter", title: "Стартовый овердрафт",    amount: 150000,  repay: 165000,  minLvl: 1, desc: "Быстрый выкуп первой классики под ремонт" },
            { id: "comfort", title: "Займ «Шаг в Комфорт»",   amount: 500000,  repay: 550000,  minLvl: 4, desc: "Хватает на покупку Solaris или Focus на авторынке" },
            { id: "pro",     title: "Бизнес-кредит перекупа", amount: 1500000, repay: 1680000, minLvl: 8, desc: "Оптовый выкуп автопарков и редких янгтаймеров" }
        ];

        let loanCardsHtml = options.map(opt => {
            let isLocked = lvl < opt.minLvl;
            let hasDebt = debt > 0;
            let isPending = this._loanActionPending;
            let btnDisabled = isLocked || hasDebt || isPending;

            let btnLabel = isLocked
                ? `🔒 С ${opt.minLvl} уровня`
                : (hasDebt ? 'Есть активный долг' : (isPending ? 'Обработка...' : 'Оформить займ'));

            return `
                <div class="glass-card p-2 mb-2" style="background:#070b14; border-color:${isLocked ? 'rgba(255,255,255,0.06)' : 'var(--cyan)'};">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan">${opt.title}</b>
                        <b class="price-val color-green text-xs">+${opt.amount.toLocaleString()} ₽</b>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9px;">${opt.desc} • К возврату: <b>${opt.repay.toLocaleString()} ₽</b></div>
                    <button onclick="AppBank.takeTierLoanAction(${opt.amount}, ${opt.repay})" class="btn ${btnDisabled ? 'btn-dark opacity-50' : 'btn-cyan'} btn-sm w-full" ${btnDisabled ? 'disabled' : ''}>
                        ${btnLabel}
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(255,51,102,0.12), #090e18); border-color: ${debt > 0 ? 'var(--red)' : 'var(--border-glass)'};">
                <span class="sub-label text-xs">Текущая задолженность по кредиту:</span>
                <div class="price-val ${debt > 0 ? 'color-red' : 'color-green'} my-1" style="font-size:22px;">${debt.toLocaleString()} ₽</div>
                <div class="sub-label" style="font-size:8.5px;">Начисление: 2% в полночь на остаток задолженности</div>
            </div>

            ${debt > 0 ? `
                <button onclick="AppBank.repayLoanAction()" class="btn btn-green w-full font-bold mb-3">
                    Погасить долг (${debt.toLocaleString()} ₽) ✓
                </button>
            ` : ''}

            <div class="sub-label mb-1" style="font-size:9.5px;">Доступные кредитные программы Во-Банка:</div>
            ${loanCardsHtml}
        `;
    },

    // ⭐ v2.4.0: защита от двойного клика
    takeTierLoanAction(amount, repayAmount) {
        if (this._loanActionPending) return;
        if (!state.player) return showToast("❌ Профиль игрока недоступен");

        if ((state.player.loanDebt || 0) > 0) return showToast("У вас уже есть непогашенный займ!");

        this._loanActionPending = true;
        try {
            state.player.cash = (state.player.cash || 0) + amount;
            state.player.loanDebt = repayAmount;

            if (typeof logBankTransaction === 'function') {
                logBankTransaction(`Зачисление кредита`, amount, true);
            }

            saveState();
            updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');
            showToast(`Кредит ${amount.toLocaleString()} ₽ зачислен на баланс!`);
            this.renderLoanScreen(document.getElementById('bankSubContentBox'));
        } finally {
            this._loanActionPending = false;
        }
    },

    // ⭐ v2.4.0: защита от двойного клика
    repayLoanAction() {
        if (this._loanActionPending) return;
        if (!state.player) return;

        let debt = state.player.loanDebt || 0;
        let cash = state.player.cash || 0;
        if (cash < debt) return showToast("Недостаточно денег для закрытия долга!");
        if (debt <= 0) return showToast("У вас нет активных долгов!");

        this._loanActionPending = true;
        try {
            state.player.cash -= debt;
            state.player.loanDebt = 0;

            if (typeof logBankTransaction === 'function') {
                logBankTransaction(`Полное погашение кредита`, debt, false);
            }

            saveState();
            updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');
            showToast("Кредит полностью закрыт!");
            this.renderLoanScreen(document.getElementById('bankSubContentBox'));
        } finally {
            this._loanActionPending = false;
        }
    },

    renderMortgageScreen(container) {
        if (!container) return;
        container.innerHTML = `
            <div class="glass-card text-center sub-label py-6">
                <i class="fa-solid fa-house-chimney color-teal mb-2" style="font-size:26px;"></i>
                <div>Ипотечные программы доступны для коттеджей, боксов и пентхаусов.</div>
                <div class="text-xs mt-1">Ознакомьтесь с объектами в приложении «Жильё & Боксы».</div>
            </div>
        `;
    }
};

window.AppBank = AppBank;

console.log('[🏦 phone-bank v2.4.0] Проверка баланса на кнопке + защита от двойного клика (loan/exchange) + делегирование SuperSpin ✓');
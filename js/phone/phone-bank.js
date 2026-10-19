// ========================================================
// js/phone/phone-bank.js — БАНК «ВО-БАНК ОНЛАЙН» (v3.5.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v3.5.0 (ОФФЛАЙН-ПРОЦЕНТЫ, ПЕНИ И КРЕДИТНЫЙ СКОРИНГ):
//   - НАЧИСЛЕНИЕ СЛОЖНЫХ ПРОЦЕНТОВ ПО ВКЛАДАМ: Накопительный счет «Автокапитал»
//     с авто-капитализацией (1.5%/день) по дельте реального времени Date.now().
//   - БАЛАНС КРЕДИТОВАНИЯ И ШТРАФОВ:
//       • Фиксированный льготный период 72 ч (3 дня) со ставкой 2%/день.
//       • При просрочке начисляются штрафные пени (+3%/день) и падает кредитный рейтинг.
//       • При закрытии кредита рейтинг восстанавливается (+0.2 ⭐), лимит растет.
//   - СОХРАНЕНО: Несгораемый сейф (safeDeposit) без процентов с защитой от долгов.
//   - АКТИВАЦИЯ КРИПТОВАЛЮТЫ: Полноценная покупка/продажа BTC и ETH в кошельке.
//   - СОХРАНЕНО: Умный fallback курса Stars 2500 ₽ и мультивалютный обменник v3.0.1.
// ========================================================

const AppBank = {
    activeSubTab: 'exchange',

    exchangeFromCurrency: 'rub',
    exchangeToCurrency: 'stars',
    exchangeAmountInput: 25000,

    _exchangeActionPending: false,
    _loanActionPending: false,
    _cryptoActionPending: false,

    init() {
        this.processOfflineAccruals();
        this._bindLifecycleEvents();
    },

    _bindLifecycleEvents() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.processOfflineAccruals();
            }
        });

        if (window.EventBus) {
            window.EventBus.on('day:passed', () => this.processOfflineAccruals());
            window.EventBus.on('app:resume', () => this.processOfflineAccruals());
        }
    },

    // ====================================================
    // РАСЧЕТ СЛОЖНЫХ ПРОЦЕНТОВ И ПЕНИ ПО ОФФЛАЙНУ (Date.now)
    // ====================================================
    processOfflineAccruals() {
        const p = window.state?.player;
        if (!p) return;

        const now = Date.now();
        const DAY_MS = 86400000; // 24 часа

        // 1. НАКОПИТЕЛЬНЫЙ ВКЛАД СО СЛОЖНЫМИ ПРОЦЕНТАМИ
        if (!p.bankDeposit) {
            p.bankDeposit = {
                amount: 0,
                lastAccrual: now,
                totalEarned: 0
            };
        }

        if (p.bankDeposit.amount > 0) {
            if (!p.bankDeposit.lastAccrual) p.bankDeposit.lastAccrual = now;
            const deltaMs = now - p.bankDeposit.lastAccrual;

            // Капитализация при дельте от 60 секунд
            if (deltaMs > 60000) {
                const dailyRate = 0.015; // 1.5% в день
                const days = Math.min(30, deltaMs / DAY_MS); // защита от переполнения: макс 30 дней
                
                // Формула сложного процента: S = P * (1 + r)^t
                const currentDeposit = p.bankDeposit.amount;
                const newDeposit = Math.round(currentDeposit * Math.pow(1 + dailyRate, days));
                const profit = newDeposit - currentDeposit;

                if (profit > 0) {
                    p.bankDeposit.amount = newDeposit;
                    p.bankDeposit.totalEarned = (p.bankDeposit.totalEarned || 0) + profit;
                    p.bankDeposit.lastAccrual = now;

                    if (typeof logBankTransaction === 'function') {
                        logBankTransaction(`Капитализация вклада (+${profit.toLocaleString()} ₽)`, profit, true);
                    }
                    if (typeof showToast === 'function' && days >= 0.1) {
                        showToast(`📈 Сложные проценты по вкладу: +${profit.toLocaleString()} ₽`, 'success');
                    }
                }
            }
        } else {
            p.bankDeposit.lastAccrual = now;
        }

        // 2. КРЕДИТЫ, СТАВКИ И ШТРАФНЫЕ ПЕНИ
        if (p.loanDebt && p.loanDebt > 0) {
            if (!p.loanLastInterestAt) p.loanLastInterestAt = now;
            const loanDeltaMs = now - p.loanLastInterestAt;

            if (loanDeltaMs > 60000) {
                const days = Math.min(30, loanDeltaMs / DAY_MS);
                const dailyInterestRate = 0.02; // Стандартная ставка: 2% в день

                const isOverdue = p.loanDueTime && now > p.loanDueTime;
                const penaltyRate = isOverdue ? 0.03 : 0; // Штрафная пеня: +3% в день сверху
                const totalRate = dailyInterestRate + penaltyRate;

                const currentDebt = p.loanDebt;
                const newDebt = Math.round(currentDebt * Math.pow(1 + totalRate, days));
                const addedDebt = newDebt - currentDebt;

                if (addedDebt > 0) {
                    p.loanDebt = newDebt;
                    p.loanLastInterestAt = now;

                    if (isOverdue) {
                        if (!p.bankReputation) p.bankReputation = { rating: 5.0, loanLimit: 500000 };
                        const ratingDrop = Math.min(2.0, days * 0.15);
                        p.bankReputation.rating = Math.max(1.0, Number((p.bankReputation.rating - ratingDrop).toFixed(1)));
                        this.recalculateLoanLimit();
                    }

                    if (typeof logBankTransaction === 'function') {
                        logBankTransaction(
                            isOverdue ? `Пени за просрочку кредита (+${addedDebt.toLocaleString()} ₽)` : `Проценты по кредиту (+${addedDebt.toLocaleString()} ₽)`,
                            addedDebt,
                            false
                        );
                    }
                }
            }
        } else {
            p.loanLastInterestAt = now;
        }

        this.recalculateLoanLimit();
    },

    recalculateLoanLimit() {
        const p = window.state?.player;
        if (!p) return 500000;
        if (!p.bankReputation) {
            p.bankReputation = { rating: 5.0, loanLimit: 500000 };
        }

        const lvl = p.level || 1;
        const rating = p.bankReputation.rating !== undefined ? p.bankReputation.rating : 5.0;

        const base = 150000 + (lvl - 1) * 150000;
        const multiplier = Math.max(0.2, rating / 5.0);
        const limit = Math.round((base * multiplier) / 10000) * 10000;

        p.bankReputation.loanLimit = Math.max(50000, limit);
        return p.bankReputation.loanLimit;
    },

    // ====================================================
    // УТИЛИТЫ КУРСОВ
    // ====================================================
    _getCurrencyConfig(code) {
        const cfg = window.BANK_EXCHANGE_RATES;
        if (cfg && cfg[code]) return cfg[code];
        return null;
    },

    _getStarRate() {
        const cfg = this._getCurrencyConfig('stars');
        if (cfg && typeof cfg.buyRub === 'number' && cfg.buyRub > 0) {
            return cfg.buyRub;
        }

        try {
            const wheel = window.WHEEL_CONFIG?.superWheel;
            if (wheel && typeof wheel.costCash === 'number' && typeof wheel.costStars === 'number'
                && wheel.costStars > 0 && wheel.costCash > 0) {
                const derivedRate = Math.round(wheel.costCash / wheel.costStars);
                if (derivedRate > 0 && derivedRate !== 25000) {
                    return derivedRate;
                }
            }
        } catch (e) {}

        return 2500;
    },

    _getSellRate(code) {
        if (code === 'rub') return 1;
        const cfg = this._getCurrencyConfig(code);
        return cfg ? (cfg.sellRub || cfg.buyRub || 0) : 0;
    },

    _getBuyRate(code) {
        if (code === 'rub') return 1;
        const cfg = this._getCurrencyConfig(code);
        return cfg ? (cfg.buyRub || 0) : 0;
    },

    _getPlayerBalance(code) {
        const p = window.state?.player || {};
        switch (code) {
            case 'rub':             return Number(p.cash) || 0;
            case 'stars':           return Number(p.stars) || 0;
            case 'superSpinTicket': return Number(p.superSpinTickets) || 0;
            case 'tickets':         return Number(p.expressTickets) || 0;
            default:                return 0;
        }
    },

    _spendCurrency(code, amount) {
        const p = window.state?.player;
        if (!p) return false;
        const val = Math.round(Number(amount) || 0);
        if (val <= 0) return false;

        switch (code) {
            case 'rub':
                p.cash = Math.max(0, (Number(p.cash) || 0) - val);
                return true;
            case 'stars':
                p.stars = Math.max(0, (Number(p.stars) || 0) - val);
                return true;
            case 'superSpinTicket':
                p.superSpinTickets = Math.max(0, (Number(p.superSpinTickets) || 0) - val);
                return true;
            case 'tickets':
                p.expressTickets = Math.max(0, (Number(p.expressTickets) || 0) - val);
                return true;
            default:
                return false;
        }
    },

    _gainCurrency(code, amount) {
        const p = window.state?.player;
        if (!p) return false;
        const val = Math.round(Number(amount) || 0);
        if (val <= 0) return false;

        switch (code) {
            case 'rub':
                p.cash = (Number(p.cash) || 0) + val;
                return true;
            case 'stars':
                p.stars = (Number(p.stars) || 0) + val;
                return true;
            case 'superSpinTicket':
                p.superSpinTickets = (Number(p.superSpinTickets) || 0) + val;
                return true;
            case 'tickets': {
                const max = p.maxExpressTickets || 25;
                p.expressTickets = Math.min(max, (Number(p.expressTickets) || 0) + val);
                return true;
            }
            default:
                return false;
        }
    },

    _getCurrencyLabel(code) {
        const cfg = this._getCurrencyConfig(code);
        if (code === 'rub') return '₽ Рубли';
        if (!cfg) return code;
        return `${cfg.emoji || ''} ${cfg.name || code}`.trim();
    },

    _getCurrencyUnit(code) {
        if (code === 'rub') return '₽';
        const cfg = this._getCurrencyConfig(code);
        return cfg ? (cfg.emoji || '') : '';
    },

    _getExchangeCurrencies() {
        return [
            { code: 'rub',             label: '₽ Рубли',            icon: 'fa-ruble-sign',   emoji: '₽'  },
            { code: 'stars',           label: '⭐ Stars',           icon: 'fa-star',         emoji: '⭐' },
            { code: 'superSpinTicket', label: '🎟️ Билет СПИН',     icon: 'fa-dharmachakra', emoji: '🎟️' },
            { code: 'tickets',         label: '🎫 Экспресс-талон',  icon: 'fa-ticket',       emoji: '🎫' }
        ];
    },

    _calcExchangeResult(fromCurrency, toCurrency, amountFrom) {
        const amt = Number(amountFrom) || 0;
        if (amt <= 0) return 0;
        if (fromCurrency === toCurrency) return 0;

        const sellRateFrom = this._getSellRate(fromCurrency);
        const buyRateTo    = this._getBuyRate(toCurrency);

        if (sellRateFrom <= 0 || buyRateTo <= 0) return 0;

        const rubValue = amt * sellRateFrom;
        const result = rubValue / buyRateTo;

        if (toCurrency === 'rub') return Math.floor(result);
        return Math.floor(result * 100) / 100;
    },

    // ====================================================
    // ГЛАВНЫЙ РЕНДЕР
    // ====================================================
    render(container) {
        if (!container) return;

        this.processOfflineAccruals();
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

    // ====================================================
    // ОБМЕННИК ВАЛЮТ
    // ====================================================
    renderExchangeScreen(container) {
        if (!container) return;

        if (this.exchangeFromCurrency === this.exchangeToCurrency) {
            this.exchangeToCurrency = (this.exchangeFromCurrency === 'rub') ? 'stars' : 'rub';
        }

        const currencies = this._getExchangeCurrencies();
        const fromCode = this.exchangeFromCurrency;
        const toCode = this.exchangeToCurrency;

        const fromBalance = this._getPlayerBalance(fromCode);
        const toBalance = this._getPlayerBalance(toCode);

        const inputVal = this.exchangeAmountInput || 0;
        const resultVal = this._calcExchangeResult(fromCode, toCode, inputVal);

        const starRate = this._getStarRate();

        const unitFrom = this._getCurrencyUnit(fromCode);
        const unitTo = this._getCurrencyUnit(toCode);
        const sellRateFrom = this._getSellRate(fromCode);
        const buyRateTo = this._getBuyRate(toCode);

        const fromOptionsHtml = currencies.map(c =>
            `<option value="${c.code}" ${c.code === fromCode ? 'selected' : ''}>${c.label}</option>`
        ).join('');

        const toOptionsHtml = currencies.map(c =>
            `<option value="${c.code}" ${c.code === toCode ? 'selected' : ''}>${c.label}</option>`
        ).join('');

        const rubStarRate = starRate.toLocaleString();
        const superSpinCash = window.WHEEL_CONFIG?.superWheel?.costCash || 150000;
        const superSpinStars = window.WHEEL_CONFIG?.superWheel?.costStars || 60;

        container.innerHTML = `
            <!-- ТАБЛО КОТИРОВОК -->
            <div class="glass-card mb-2 p-2" style="background:#050914; border:1px solid rgba(0, 242, 254, 0.35);">
                <div class="flex-between mb-1">
                    <span class="sub-label font-bold" style="font-size:8.5px; color:#94a3b8;">
                        <i class="fa-solid fa-chart-line color-cyan mr-1"></i> ТАБЛО КОТИРОВОК ЦБ РФ & КРИПТОВАЛЮТ
                    </span>
                    <span class="tag-badge bg-tag-green" style="font-size:7.5px;">LIVE 24/7</span>
                </div>
                <div class="grid-4 text-center py-1" style="grid-template-columns: repeat(4, 1fr); gap: 4px; background: rgba(0,0,0,0.5); border-radius: 8px;">
                    <div>
                        <div class="sub-label" style="font-size:8px;">USD/RUB</div>
                        <b class="color-green text-xs" style="font-size:10px;">94.20 ₽</b>
                        <div class="color-green" style="font-size:7px;">▲ +0.4%</div>
                    </div>
                    <div>
                        <div class="sub-label" style="font-size:8px;">BTC/RUB</div>
                        <b class="color-amber text-xs" style="font-size:10px;">9.45M ₽</b>
                        <div class="color-green" style="font-size:7px;">▲ +1.8%</div>
                    </div>
                    <div>
                        <div class="sub-label" style="font-size:8px;">⭐ STARS</div>
                        <b class="color-cyan text-xs" style="font-size:10px;">${rubStarRate} ₽</b>
                        <div class="color-cyan" style="font-size:7px;">1 : ${(starRate/1000).toFixed(1)}k</div>
                    </div>
                    <div>
                        <div class="sub-label" style="font-size:8px;">🎟️ СПИН</div>
                        <b class="color-amber text-xs" style="font-size:10px;">${(superSpinCash/1000).toFixed(0)}k ₽</b>
                        <div class="color-amber" style="font-size:7px;">= ${superSpinStars} ⭐</div>
                    </div>
                </div>
            </div>

            <!-- ГАРАНТИРОВАННЫЙ КУРС ⭐ -->
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(255, 179, 0, 0.12), #090e18); border-color: var(--amber);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-star"></i> Гарантированный курс Stars</b>
                    <span class="tag-badge bg-tag-amber">ФИКС 100%</span>
                </div>
                <div class="font-bold text-xs color-green" style="font-size:14px;">1 ⭐ = ${starRate.toLocaleString()} ₽</div>
                <div class="sub-label mt-1" style="font-size:8.5px;">
                    Спред банка: продажа банку — ${this._getSellRate('stars').toLocaleString()} ₽ / покупка у банка — ${this._getBuyRate('stars').toLocaleString()} ₽.
                </div>
            </div>

            <!-- КАЛЬКУЛЯТОР ОБМЕНА -->
            <div class="glass-card mb-2 p-3" style="background: #090e18; border-color: rgba(255,255,255,0.08);">
                <div class="flex-between mb-2">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-arrow-right-arrow-left mr-1"></i> Калькулятор конвертации</b>
                    <span class="tag-badge bg-tag-cyan"><i class="fa-solid fa-bolt mr-1"></i> Спред 4%</span>
                </div>

                <div class="mb-2">
                    <div class="flex-between mb-1 text-xs">
                        <span class="sub-label font-bold" style="font-size:9px;">ОТДАЮ:</span>
                        <span class="sub-label" style="font-size:9px;">
                            Баланс: <b class="color-cyan" id="bankExchangeFromBalance">${this._formatBalanceDisplay(fromCode, fromBalance)}</b>
                        </span>
                    </div>
                    <div class="grid-2" style="grid-template-columns: 130px 1fr; gap:6px;">
                        <select id="bankExchangeFromSelect"
                                onchange="AppBank.onExchangeCurrencyChanged('from', this.value)"
                                class="chat-input"
                                style="font-size:10.5px; padding:6px 4px; font-weight:800; background:#050914; border:1px solid rgba(255,255,255,0.1); color:#fff;">
                            ${fromOptionsHtml}
                        </select>
                        <input type="number"
                               id="bankExchangeInput"
                               value="${inputVal}"
                               oninput="AppBank.onExchangeInputChanged(this.value)"
                               class="chat-input text-right font-bold"
                               style="font-size:14px; padding:6px 10px; color:#fff;"
                               min="0"
                               step="1">
                    </div>
                </div>

                <div class="grid-4 mb-2" style="gap:4px;">
                    <button onclick="AppBank.setExchangePercent(25)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">25%</button>
                    <button onclick="AppBank.setExchangePercent(50)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">50%</button>
                    <button onclick="AppBank.setExchangePercent(75)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">75%</button>
                    <button onclick="AppBank.setExchangePercent(100)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">MAX</button>
                </div>

                <div class="text-center my-1">
                    <button onclick="AppBank.toggleExchangeDirection()"
                            class="btn btn-dark btn-auto btn-sm"
                            style="width:34px; height:34px; border-radius:50%; padding:0; line-height:34px;"
                            title="Поменять валюты местами">
                        <i class="fa-solid fa-arrows-up-down color-cyan"></i>
                    </button>
                </div>

                <div class="mb-3">
                    <div class="flex-between mb-1 text-xs">
                        <span class="sub-label font-bold" style="font-size:9px;">ПОЛУЧАЮ:</span>
                        <span class="sub-label" style="font-size:9px;">
                            Баланс: <b class="color-green" id="bankExchangeToBalance">${this._formatBalanceDisplay(toCode, toBalance)}</b>
                        </span>
                    </div>
                    <div class="grid-2" style="grid-template-columns: 130px 1fr; gap:6px;">
                        <select id="bankExchangeToSelect"
                                onchange="AppBank.onExchangeCurrencyChanged('to', this.value)"
                                class="chat-input"
                                style="font-size:10.5px; padding:6px 4px; font-weight:800; background:#050914; border:1px solid rgba(255,255,255,0.1); color:#fff;">
                            ${toOptionsHtml}
                        </select>
                        <div class="p-2 text-right font-bold color-green"
                             id="bankExchangeResult"
                             style="background:#050914; border-radius:8px; border:1px solid rgba(0,230,118,0.3); font-size:14px;">
                            +${resultVal.toLocaleString()} ${unitTo}
                        </div>
                    </div>
                    <div class="sub-label text-center mt-1" style="font-size:8px;" id="bankExchangeRateHint">
                        ${this._formatRateHint(fromCode, toCode, sellRateFrom, buyRateTo)}
                    </div>
                </div>

                <button id="bankExchangeSubmitBtn"
                        onclick="AppBank.executeExchangeAction()"
                        class="btn btn-green w-full font-bold"
                        style="padding:10px 0; font-size:12px;">
                    ОБМЕНЯТЬ СЕЙЧАС
                </button>
            </div>

            <!-- БИЛЕТ СУПЕРВИЛСПИНА -->
            <div class="glass-card p-2 flex-between" style="border-left: 3px solid var(--green); background:#090e18;">
                <div>
                    <div class="font-bold text-xs color-green">
                        <i class="fa-solid fa-ticket-simple mr-1"></i> Билет «Супер Вилспин»
                    </div>
                    <div class="sub-label" style="font-size:8.5px;">На балансе: <b>${this._getPlayerBalance('superSpinTicket')} шт.</b></div>
                </div>
                <button onclick="AppBank.buySuperSpinTicketAction()"
                        class="btn btn-green btn-auto btn-sm font-bold"
                        style="font-size:9.5px; padding:5px 10px;">
                    КУПИТЬ (${(superSpinCash/1000).toFixed(0)}K или ${superSpinStars} ⭐)
                </button>
            </div>
        `;

        this._refreshExchangeButtonState();
    },

    _formatBalanceDisplay(code, value) {
        if (code === 'rub') return `${Number(value).toLocaleString()} ₽`;
        const unit = this._getCurrencyUnit(code);
        return `${Number(value).toLocaleString()} ${unit}`;
    },

    _formatRateHint(fromCode, toCode, sellRateFrom, buyRateTo) {
        const fromLabel = this._getCurrencyLabel(fromCode);
        const toLabel = this._getCurrencyLabel(toCode);
        if (fromCode === 'rub') {
            return `Курс: 1 ${this._getCurrencyUnit(toCode)} = ${buyRateTo.toLocaleString()} ₽`;
        }
        if (toCode === 'rub') {
            return `Курс: 1 ${this._getCurrencyUnit(fromCode)} = ${sellRateFrom.toLocaleString()} ₽`;
        }
        if (buyRateTo > 0) {
            const unitRate = sellRateFrom / buyRateTo;
            return `${fromLabel} → ${toLabel}: 1 ${this._getCurrencyUnit(fromCode)} ≈ ${unitRate.toFixed(4)} ${this._getCurrencyUnit(toCode)}`;
        }
        return '';
    },

    onExchangeCurrencyChanged(which, code) {
        if (!code) return;
        if (which === 'from') {
            if (code === this.exchangeToCurrency) {
                this.exchangeToCurrency = this.exchangeFromCurrency;
            }
            this.exchangeFromCurrency = code;
        } else {
            if (code === this.exchangeFromCurrency) {
                this.exchangeFromCurrency = this.exchangeToCurrency;
            }
            this.exchangeToCurrency = code;
        }

        this.exchangeAmountInput = this._suggestDefaultAmount(this.exchangeFromCurrency);

        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');

        this.renderExchangeScreen(document.getElementById('bankSubContentBox'));
    },

    _suggestDefaultAmount(fromCode) {
        const bal = this._getPlayerBalance(fromCode);
        if (bal <= 0) {
            if (fromCode === 'rub') return 25000;
            return 1;
        }
        if (fromCode === 'rub') {
            return Math.min(bal, 100000);
        }
        return Math.min(bal, 5);
    },

    _updateExchangeResultOnly() {
        const fromCode = this.exchangeFromCurrency;
        const toCode = this.exchangeToCurrency;
        const inputVal = this.exchangeAmountInput || 0;

        const resultVal = this._calcExchangeResult(fromCode, toCode, inputVal);
        const unitTo = this._getCurrencyUnit(toCode);

        const resultEl = document.getElementById('bankExchangeResult');
        if (resultEl) {
            resultEl.innerText = `+${resultVal.toLocaleString()} ${unitTo}`;
        }

        this._refreshExchangeButtonState(resultVal);
    },

    _refreshExchangeButtonState(precomputedResult) {
        const btn = document.getElementById('bankExchangeSubmitBtn');
        if (!btn) return;

        const fromCode = this.exchangeFromCurrency;
        const toCode = this.exchangeToCurrency;
        const inputVal = this.exchangeAmountInput || 0;

        let resultVal = precomputedResult;
        if (resultVal === undefined) {
            resultVal = this._calcExchangeResult(fromCode, toCode, inputVal);
        }

        const fromBalance = this._getPlayerBalance(fromCode);
        const unitTo = this._getCurrencyUnit(toCode);

        let btnText = 'ОБМЕНЯТЬ СЕЙЧАС';
        let btnDisabled = false;

        if (fromCode === toCode) {
            btnText = 'ВЫБЕРИТЕ РАЗНЫЕ ВАЛЮТЫ';
            btnDisabled = true;
        } else if (inputVal <= 0) {
            btnText = 'ВВЕДИТЕ СУММУ';
            btnDisabled = true;
        } else if (resultVal <= 0) {
            btnText = 'СУММА СЛИШКОМ МАЛА';
            btnDisabled = true;
        } else if (fromBalance < inputVal) {
            btnText = `НЕ ХВАТАЕТ ${this._getCurrencyUnit(fromCode)} (ЕСТЬ ${fromBalance.toLocaleString()})`;
            btnDisabled = true;
        } else {
            btnText = `ОБМЕНЯТЬ (${inputVal.toLocaleString()} ${this._getCurrencyUnit(fromCode)} → ${resultVal.toLocaleString()} ${unitTo})`;
        }

        if (this._exchangeActionPending) {
            btnText = 'ОБРАБОТКА...';
            btnDisabled = true;
        }

        btn.innerText = btnText;
        btn.disabled = btnDisabled;
    },

    toggleExchangeDirection() {
        const tmp = this.exchangeFromCurrency;
        this.exchangeFromCurrency = this.exchangeToCurrency;
        this.exchangeToCurrency = tmp;

        this.exchangeAmountInput = this._suggestDefaultAmount(this.exchangeFromCurrency);

        if (typeof playSound === 'function') playSound('tick');
        this.renderExchangeScreen(document.getElementById('bankSubContentBox'));
    },

    onExchangeInputChanged(val) {
        let n = parseFloat(val);
        this.exchangeAmountInput = isNaN(n) ? 0 : Math.max(0, n);
        this._updateExchangeResultOnly();
    },

    setExchangePercent(pct) {
        const fromCode = this.exchangeFromCurrency;
        const maxVal = this._getPlayerBalance(fromCode);

        let newVal = Math.floor(maxVal * (pct / 100));

        if (pct === 100) newVal = maxVal;
        if (newVal <= 0 && maxVal > 0) newVal = 1;

        this.exchangeAmountInput = newVal;

        const inputEl = document.getElementById('bankExchangeInput');
        if (inputEl) inputEl.value = newVal;

        this._updateExchangeResultOnly();
        if (typeof playSound === 'function') playSound('tick');
    },

    executeExchangeAction() {
        if (this._exchangeActionPending) return;
        if (!state.player) return showToast("❌ Профиль игрока недоступен");

        const fromCode = this.exchangeFromCurrency;
        const toCode = this.exchangeToCurrency;
        const val = Number(this.exchangeAmountInput) || 0;

        if (fromCode === toCode) return showToast("Выберите разные валюты!");
        if (val <= 0) return showToast("Введите сумму для конвертации!");

        const fromBalance = this._getPlayerBalance(fromCode);
        if (fromBalance < val) {
            return showToast(`Недостаточно ${this._getCurrencyLabel(fromCode)}!`);
        }

        const resultVal = Math.floor(this._calcExchangeResult(fromCode, toCode, val));
        if (resultVal <= 0) {
            return showToast("Слишком маленькая сумма для обмена!");
        }

        this._exchangeActionPending = true;

        try {
            const spendOk = this._spendCurrency(fromCode, val);
            if (!spendOk) {
                return showToast("Ошибка списания!");
            }

            const gainOk = this._gainCurrency(toCode, resultVal);
            if (!gainOk) {
                this._gainCurrency(fromCode, val);
                return showToast("Ошибка начисления!");
            }

            const fromUnit = this._getCurrencyUnit(fromCode);
            const toUnit = this._getCurrencyUnit(toCode);

            if (typeof logBankTransaction === 'function') {
                const rubValue = Math.round(val * this._getSellRate(fromCode));
                const isIncome = (fromCode !== 'rub');
                logBankTransaction(
                    `Обмен: ${val.toLocaleString()} ${fromUnit} → ${resultVal.toLocaleString()} ${toUnit}`,
                    rubValue,
                    isIncome
                );
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

            showToast(`Успешно обменяно: +${resultVal.toLocaleString()} ${toUnit}`);

            this.exchangeAmountInput = this._suggestDefaultAmount(fromCode);

            this.renderExchangeScreen(document.getElementById('bankSubContentBox'));

        } finally {
            this._exchangeActionPending = false;
        }
    },

    buySuperSpinTicketAction() {
        if (typeof PhoneMedia !== 'undefined' && typeof PhoneMedia.purchaseSuperSpinTicket === 'function') {
            const ok = PhoneMedia.purchaseSuperSpinTicket();
            if (ok) {
                this.renderExchangeScreen(document.getElementById('bankSubContentBox'));
            }
            return;
        }

        const cfg = window.WHEEL_CONFIG?.superWheel || { costCash: 150000, costStars: 60 };
        const cash = state.player?.cash || 0;
        const stars = state.player?.stars || 0;

        if (cash >= cfg.costCash) {
            state.player.cash -= cfg.costCash;
        } else if (stars >= cfg.costStars) {
            state.player.stars -= cfg.costStars;
        } else {
            return showToast(`Нужно ${cfg.costCash.toLocaleString()} ₽ или ${cfg.costStars} ⭐ на покупку билета!`);
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

    // ====================================================
    // СЧЕТА И ИСТОРИЯ
    // ====================================================
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

    // ====================================================
    // ВКЛАДЫ И СЛОЖНЫЕ ПРОЦЕНТЫ
    // ====================================================
    renderDepositsScreen(container) {
        if (!container) return;
        this.processOfflineAccruals();

        let safe = state.player?.safeDeposit || 0;
        let deposit = state.player?.bankDeposit?.amount || 0;
        let totalEarned = state.player?.bankDeposit?.totalEarned || 0;

        container.innerHTML = `
            <!-- НАКОПИТЕЛЬНЫЙ ВКЛАД СО СЛОЖНЫМИ ПРОЦЕНТАМИ -->
            <div class="glass-card mb-2 p-3" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.15), #090e18); border-color: var(--green);">
                <div class="flex-between mb-1">
                    <div>
                        <b class="text-xs color-green"><i class="fa-solid fa-chart-pie mr-1"></i> Накопительный вклад «Автокапитал»</b>
                        <div class="sub-label" style="font-size:8.5px;">Сложные проценты 1.5% в день с авто-капитализацией.</div>
                    </div>
                    <span class="tag-badge bg-tag-green" style="font-size:8px;">1.5% / ДЕНЬ</span>
                </div>

                <div class="grid-2 my-2 p-2" style="background:#050914; border-radius:8px; gap:8px;">
                    <div>
                        <span class="sub-label" style="font-size:8px;">СУММА ВКЛАДА:</span>
                        <div class="price-val color-green text-xs" style="font-size:15px;">${deposit.toLocaleString()} ₽</div>
                    </div>
                    <div class="text-right">
                        <span class="sub-label" style="font-size:8px;">ДОХОД ЗА ВСЕ ВРЕМЯ:</span>
                        <div class="price-val color-cyan text-xs" style="font-size:15px;">+${totalEarned.toLocaleString()} ₽</div>
                    </div>
                </div>

                <div class="grid-2" style="gap:6px;">
                    <button onclick="AppBank.depositToBankPrompt()" class="btn btn-green btn-sm font-bold">
                        <i class="fa-solid fa-plus mr-1"></i> Пополнить вклад
                    </button>
                    <button onclick="AppBank.withdrawBankDepositPrompt()" class="btn btn-dark btn-sm font-bold" ${deposit <= 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-arrow-up-from-bracket mr-1"></i> Забрать вклад
                    </button>
                </div>
            </div>

            <!-- НЕСГОРАЕМЫЙ ДЕПОЗИТНЫЙ СЕЙФ -->
            <div class="glass-card mb-2 p-3" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.12), #090e18); border-color: var(--cyan);">
                <div class="flex-between mb-1">
                    <div>
                        <b class="text-xs color-cyan"><i class="fa-solid fa-vault mr-1"></i> Несгораемый депозитный сейф</b>
                        <div class="sub-label" style="font-size:8.5px;">Иммунитет к долгам и ограблениям. 0% годовых.</div>
                    </div>
                    <div class="text-right">
                        <span class="sub-label" style="font-size:8px;">В СЕЙФЕ:</span>
                        <div class="price-val color-cyan text-xs" style="font-size:14px;">${safe.toLocaleString()} ₽</div>
                    </div>
                </div>

                <div class="grid-2 mt-2" style="gap:6px;">
                    <button onclick="AppBank.depositToSafePrompt()" class="btn btn-cyan btn-sm">Внести в сейф 📥</button>
                    <button onclick="AppBank.withdrawSafePrompt()" class="btn btn-dark btn-sm" ${safe <= 0 ? 'disabled' : ''}>Снять из сейфа 📤</button>
                </div>
            </div>
        `;
    },

    depositToBankPrompt() {
        if (!state.player) return;
        let str = prompt("Сумма пополнения накопительного вклада (₽):", "250000");
        if (!str) return;
        let val = parseInt(str.replace(/\s+/g, ''), 10);
        if (isNaN(val) || val <= 0) return showToast("Некорректная сумма!");

        let cash = state.player.cash || 0;
        if (cash < val) return showToast("Недостаточно денег на балансе!");

        state.player.cash -= val;
        if (!state.player.bankDeposit) {
            state.player.bankDeposit = { amount: 0, lastAccrual: Date.now(), totalEarned: 0 };
        }
        state.player.bankDeposit.amount += val;
        state.player.bankDeposit.lastAccrual = Date.now();

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Пополнение вклада «Автокапитал»`, val, false);
        }

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        showToast(`Вклад пополнен на +${val.toLocaleString()} ₽! Сложные проценты активированы.`);
        this.renderDepositsScreen(document.getElementById('bankSubContentBox'));
    },

    withdrawBankDepositPrompt() {
        if (!state.player) return;
        let deposit = state.player.bankDeposit?.amount || 0;
        if (deposit <= 0) return showToast("На вкладе нет средств!");

        let str = prompt(`Сколько снять с вклада? (Доступно: ${deposit.toLocaleString()} ₽):`, String(deposit));
        if (!str) return;
        let val = parseInt(str.replace(/\s+/g, ''), 10);
        if (isNaN(val) || val <= 0 || val > deposit) return showToast("Некорректная сумма!");

        state.player.bankDeposit.amount -= val;
        state.player.cash += val;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Снятие с вклада «Автокапитал»`, val, true);
        }

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        showToast(`С вклада снято +${val.toLocaleString()} ₽!`);
        this.renderDepositsScreen(document.getElementById('bankSubContentBox'));
    },

    depositToSafePrompt() {
        if (!state.player) return;
        let str = prompt("Сумма для внесения в сейф (₽):", "100000");
        if (!str) return;
        let val = parseInt(str.replace(/\s+/g, ''), 10);
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
        let val = parseInt(str.replace(/\s+/g, ''), 10);
        if (isNaN(val) || val <= 0 || val > safe) return showToast("Некорректная сумма!");

        state.player.safeDeposit -= val;
        state.player.cash += val;
        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        showToast(`Из сейфа снято +${val.toLocaleString()} ₽!`);
        this.renderDepositsScreen(document.getElementById('bankSubContentBox'));
    },

    // ====================================================
    // РЕПУТАЦИЯ И КРЕДИТНЫЙ СКОРИНГ
    // ====================================================
    renderReputationScreen(container) {
        if (!container) return;
        this.processOfflineAccruals();
        let rep = state.player?.bankReputation || { rating: 5.0, loanLimit: 500000 };
        let rating = Number(rep.rating || 5.0);
        let color = rating >= 4.0 ? 'color-green' : (rating >= 2.5 ? 'color-amber' : 'color-red');

        container.innerHTML = `
            <div class="glass-card mb-2 p-3 text-center" style="background:#090e18; border-color:${rating >= 4.0 ? 'var(--green)' : 'var(--red)'};">
                <div class="font-bold text-xs color-green mb-1">РЕЙТИНГ КРЕДИТОСПОСОБНОСТИ</div>
                <div class="price-val ${color} my-1" style="font-size:26px;">⭐ ${rating.toFixed(1)} / 5.0</div>
                <div class="sub-label mb-2" style="font-size:9.5px;">Лимит кредитования: <b class="color-green">${Number(rep.loanLimit).toLocaleString()} ₽</b></div>
                <div class="sub-label" style="font-size:8.5px; line-height:1.4;">
                    Закрывайте кредиты вовремя, чтобы растить лимит. Просрочки снижают рейтинг и накладывают штрафные пени.
                </div>
            </div>
        `;
    },

    // ====================================================
    // КРИПТОВАЛЮТНЫЙ МОДУЛЬ
    // ====================================================
    renderCryptoScreen(container) {
        if (!container) return;
        if (!state.player.crypto) {
            state.player.crypto = { btc: 0, eth: 0, prices: { btc: 9450000, eth: 320000 } };
        }
        let crypto = state.player.crypto;

        container.innerHTML = `
            <div class="glass-card mb-2 p-2" style="border-left:3px solid var(--amber); background:#090e18;">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-brands fa-bitcoin"></i> Bitcoin (BTC)</b>
                    <span class="color-green text-xs font-bold">${Number(crypto.prices.btc).toLocaleString()} ₽</span>
                </div>
                <div class="sub-label mb-2" style="font-size:8.5px;">Баланс: <b>${(crypto.btc || 0).toFixed(4)} BTC</b></div>
                <div class="grid-2" style="gap:4px;">
                    <button onclick="AppBank.buyCryptoAction('btc')" class="btn btn-green btn-sm" style="font-size:9.5px;">Купить BTC</button>
                    <button onclick="AppBank.sellCryptoAction('btc')" class="btn btn-dark btn-sm" style="font-size:9.5px;" ${(!crypto.btc || crypto.btc <= 0) ? 'disabled' : ''}>Продать BTC</button>
                </div>
            </div>

            <div class="glass-card mb-2 p-2" style="border-left:3px solid var(--cyan); background:#090e18;">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan"><i class="fa-brands fa-ethereum"></i> Ethereum (ETH)</b>
                    <span class="color-green text-xs font-bold">${Number(crypto.prices.eth).toLocaleString()} ₽</span>
                </div>
                <div class="sub-label mb-2" style="font-size:8.5px;">Баланс: <b>${(crypto.eth || 0).toFixed(4)} ETH</b></div>
                <div class="grid-2" style="gap:4px;">
                    <button onclick="AppBank.buyCryptoAction('eth')" class="btn btn-green btn-sm" style="font-size:9.5px;">Купить ETH</button>
                    <button onclick="AppBank.sellCryptoAction('eth')" class="btn btn-dark btn-sm" style="font-size:9.5px;" ${(!crypto.eth || crypto.eth <= 0) ? 'disabled' : ''}>Продать ETH</button>
                </div>
            </div>
        `;
    },

    buyCryptoAction(coin) {
        if (!state.player) return;
        const prices = state.player.crypto?.prices || { btc: 9450000, eth: 320000 };
        const pricePerUnit = prices[coin];
        const cash = state.player.cash || 0;

        let str = prompt(`На какую сумму купить ${coin.toUpperCase()} в рублях? (Доступно: ${cash.toLocaleString()} ₽):`, "100000");
        if (!str) return;
        let rubAmount = parseInt(str.replace(/\s+/g, ''), 10);
        if (isNaN(rubAmount) || rubAmount <= 0) return showToast("Некорректная сумма!");
        if (cash < rubAmount) return showToast("Недостаточно рублей на балансе!");

        const coinsToAdd = rubAmount / pricePerUnit;
        state.player.cash -= rubAmount;
        if (!state.player.crypto) state.player.crypto = { btc: 0, eth: 0, prices };
        state.player.crypto[coin] = (state.player.crypto[coin] || 0) + coinsToAdd;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Покупка ${coin.toUpperCase()}`, rubAmount, false);
        }

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        showToast(`Куплено ${coinsToAdd.toFixed(4)} ${coin.toUpperCase()}!`);
        this.renderCryptoScreen(document.getElementById('bankSubContentBox'));
    },

    sellCryptoAction(coin) {
        if (!state.player) return;
        const prices = state.player.crypto?.prices || { btc: 9450000, eth: 320000 };
        const pricePerUnit = prices[coin];
        const balance = state.player.crypto?.[coin] || 0;
        if (balance <= 0) return showToast(`У вас нет ${coin.toUpperCase()}!`);

        let str = prompt(`Сколько ${coin.toUpperCase()} продать? (Доступно: ${balance.toFixed(4)}):`, String(balance.toFixed(4)));
        if (!str) return;
        let amount = parseFloat(str);
        if (isNaN(amount) || amount <= 0 || amount > balance) return showToast("Некорректное количество!");

        const rubGain = Math.floor(amount * pricePerUnit);
        state.player.crypto[coin] -= amount;
        state.player.cash += rubGain;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Продажа ${coin.toUpperCase()}`, rubGain, true);
        }

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        showToast(`Продано ${amount.toFixed(4)} ${coin.toUpperCase()} за +${rubGain.toLocaleString()} ₽!`);
        this.renderCryptoScreen(document.getElementById('bankSubContentBox'));
    },

    // ====================================================
    // КРЕДИТЫ И ПРОСРОЧКИ
    // ====================================================
    renderLoanScreen(container) {
        if (!container) return;
        this.processOfflineAccruals();

        let debt = state.player?.loanDebt || 0;
        let lvl = state.player?.level || 1;
        let rep = state.player?.bankReputation || { rating: 5.0, loanLimit: 500000 };
        let maxLimit = rep.loanLimit || 500000;
        let now = Date.now();
        let isOverdue = debt > 0 && state.player?.loanDueTime && now > state.player.loanDueTime;

        let options = [
            { id: "starter", title: "Стартовый овердрафт",    amount: Math.min(maxLimit, 150000),  repay: Math.round(Math.min(maxLimit, 150000) * 1.08), minLvl: 1, desc: "Быстрый выкуп первой классики под ремонт" },
            { id: "comfort", title: "Займ «Шаг в Комфорт»",   amount: Math.min(maxLimit, 500000),  repay: Math.round(Math.min(maxLimit, 500000) * 1.10), minLvl: 3, desc: "Хватает на покупку иномарки на авторынке" },
            { id: "pro",     title: "Бизнес-кредит перекупа", amount: Math.min(maxLimit, 1500000), repay: Math.round(Math.min(maxLimit, 1500000) * 1.12), minLvl: 6, desc: "Оптовый выкуп автопарков и редких лотов" }
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

        let dueStatusHtml = '';
        if (debt > 0) {
            if (isOverdue) {
                dueStatusHtml = `<b class="color-red blink text-xs block mt-1">⚠️ ПРОСРОЧКА! Начисляются штрафные пени +3%/день!</b>`;
            } else if (state.player?.loanDueTime) {
                let hoursLeft = Math.max(1, Math.round((state.player.loanDueTime - now) / 3600000));
                dueStatusHtml = `<div class="sub-label color-amber text-xs mt-1">Льготный срок: осталось ${hoursLeft} ч. (ставка 2%/день)</div>`;
            }
        }

        container.innerHTML = `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, ${isOverdue ? 'rgba(255,51,102,0.25)' : 'rgba(0,230,118,0.12)'}, #090e18); border-color: ${debt > 0 ? (isOverdue ? 'var(--red)' : 'var(--amber)') : 'var(--border-glass)'};">
                <span class="sub-label text-xs">Текущая задолженность по кредиту:</span>
                <div class="price-val ${debt > 0 ? 'color-red' : 'color-green'} my-1" style="font-size:22px;">${debt.toLocaleString()} ₽</div>
                ${dueStatusHtml}
            </div>

            ${debt > 0 ? `
                <button onclick="AppBank.repayLoanAction()" class="btn btn-green w-full font-bold mb-3">
                    Погасить долг (${debt.toLocaleString()} ₽) ✓
                </button>
            ` : ''}

            <div class="sub-label mb-1" style="font-size:9.5px;">Доступные кредитные программы (лимит: ${maxLimit.toLocaleString()} ₽):</div>
            ${loanCardsHtml}
        `;
    },

    takeTierLoanAction(amount, repayAmount) {
        if (this._loanActionPending) return;
        if (!state.player) return showToast("❌ Профиль игрока недоступен");

        if ((state.player.loanDebt || 0) > 0) return showToast("У вас уже есть непогашенный займ!");

        this._loanActionPending = true;
        try {
            state.player.cash = (state.player.cash || 0) + amount;
            state.player.loanDebt = repayAmount;
            state.player.loanTakenAt = Date.now();
            state.player.loanLastInterestAt = Date.now();
            state.player.loanDueTime = Date.now() + (3 * 86400000); // 3 суток льготный период

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
            state.player.loanDueTime = null;
            state.player.loanLastInterestAt = null;

            // Повышаем кредитный рейтинг за успешное закрытие
            if (!state.player.bankReputation) {
                state.player.bankReputation = { rating: 5.0, loanLimit: 500000 };
            }
            state.player.bankReputation.rating = Math.min(5.0, Number((state.player.bankReputation.rating + 0.2).toFixed(1)));
            this.recalculateLoanLimit();

            if (typeof logBankTransaction === 'function') {
                logBankTransaction(`Полное погашение кредита`, debt, false);
            }

            saveState();
            updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');
            showToast(`Кредит полностью закрыт! Рейтинг повышен до ⭐ ${state.player.bankReputation.rating}`);
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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AppBank.init());
} else {
    AppBank.init();
}

console.log('[🏦 phone-bank v3.5.0] Сложные проценты по вкладам (Date.now), пени и кредитный скоринг готовы ✓');

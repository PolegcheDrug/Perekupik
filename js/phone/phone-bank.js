// ========================================================
// js/phone-bank.js — БАНК «ВО-БАНК ОНЛАЙН» (v3.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v3.0.0 (SPRINT 3 — ОБМЕННИК 4 ВАЛЮТ):
//   - Полностью переработан ОБМЕННИК:
//       • 4 валюты: ₽ RUB, ⭐ Stars, 🎟️ SuperSpinTicket, 🎫 ExpressTicket
//       • Любые пары через селекты «Отдаю» / «Получаю»
//       • Кнопка реверса направления ⇅
//       • Курс между любыми валютами через рублёвый эквивалент
//       • Спред банка 4% (заложен в sellRub)
//       • Пресеты 25 / 50 / 75 / MAX по балансу отдаваемой валюты
//   - Курс ⭐ обновлён: 1 ⭐ = 25 000 ₽ (было 2 500)
//   - Добавлены валюты superSpinTicket и tickets в UI обменника
//   - Кнопка «Купить билет СуперВилспина» делегирует в PhoneMedia
//   - Все остальные табы (счета, вклады, репутация, крипта,
//     кредит, ипотека) сохранены без изменений
// ⭐ v2.4.0:
//   - ФИКС: _refreshExchangeButtonState проверяет баланс игрока
//   - ФИКС: _exchangeActionPending / _loanActionPending защита
//   - ФИКС: buySuperSpinTicketAction делегирует в PhoneMedia
// ========================================================

const AppBank = {
    activeSubTab: 'exchange',

    // ⭐ v3.0.0: направление обмена — теперь две валюты
    // Все доступные валюты для обменника (ключи из BANK_EXCHANGE_RATES)
    exchangeFromCurrency: 'rub',
    exchangeToCurrency: 'stars',
    exchangeAmountInput: 25000,

    // ⭐ Защита от двойного клика
    _exchangeActionPending: false,
    _loanActionPending: false,

    // ====================================================
    // УТИЛИТЫ КУРСОВ
    // ====================================================

    /**
     * Получить конфиг валюты.
     */
    _getCurrencyConfig(code) {
        const cfg = window.BANK_EXCHANGE_RATES;
        if (cfg && cfg[code]) return cfg[code];
        return null;
    },

    /**
     * Курс 1 ⭐ в рублях (для отображения).
     * ⭐ v3.0.0: читаем из BANK_EXCHANGE_RATES.stars.buyRub.
     * Runtime-подмена курса делается в app.js (_syncStarRateToBank).
     */
    _getStarRate() {
        const cfg = this._getCurrencyConfig('stars');
        return (cfg && typeof cfg.buyRub === 'number') ? cfg.buyRub : 25000;
    },

    /**
     * Рублёвая ценность единицы валюты ПРИ ПРОДАЖЕ игроком.
     * (то есть сколько банк заплатит за 1 единицу)
     */
    _getSellRate(code) {
        if (code === 'rub') return 1;
        const cfg = this._getCurrencyConfig(code);
        return cfg ? (cfg.sellRub || cfg.buyRub || 0) : 0;
    },

    /**
     * Рублёвая цена единицы валюты ПРИ ПОКУПКЕ игроком.
     * (то есть сколько игрок заплатит за 1 единицу)
     */
    _getBuyRate(code) {
        if (code === 'rub') return 1;
        const cfg = this._getCurrencyConfig(code);
        return cfg ? (cfg.buyRub || 0) : 0;
    },

    /**
     * Баланс игрока по валюте.
     */
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

    /**
     * Списать валюту с игрока.
     * @returns {boolean} — успех
     */
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

    /**
     * Начислить валюту игроку.
     */
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

    /**
     * Имя валюты для UI.
     */
    _getCurrencyLabel(code) {
        const cfg = this._getCurrencyConfig(code);
        if (code === 'rub') return '₽ Рубли';
        if (!cfg) return code;
        return `${cfg.emoji || ''} ${cfg.name || code}`.trim();
    },

    /**
     * Единица валюты для подписи.
     */
    _getCurrencyUnit(code) {
        if (code === 'rub') return '₽';
        const cfg = this._getCurrencyConfig(code);
        return cfg ? (cfg.emoji || '') : '';
    },

    /**
     * Список доступных валют обменника.
     */
    _getExchangeCurrencies() {
        return [
            { code: 'rub',             label: '₽ Рубли',            icon: 'fa-ruble-sign',   emoji: '₽'  },
            { code: 'stars',           label: '⭐ Stars',           icon: 'fa-star',         emoji: '⭐' },
            { code: 'superSpinTicket', label: '🎟️ Билет СПИН',     icon: 'fa-dharmachakra', emoji: '🎟️' },
            { code: 'tickets',         label: '🎫 Экспресс-талон',  icon: 'fa-ticket',       emoji: '🎫' }
        ];
    },

    /**
     * Расчёт результата обмена.
     * @returns {number} — сколько получит игрок единиц целевой валюты
     */
    _calcExchangeResult(fromCurrency, toCurrency, amountFrom) {
        const amt = Number(amountFrom) || 0;
        if (amt <= 0) return 0;
        if (fromCurrency === toCurrency) return 0;

        const sellRateFrom = this._getSellRate(fromCurrency);   // руб за 1 ед. отдаваемой
        const buyRateTo    = this._getBuyRate(toCurrency);      // руб за 1 ед. получаемой

        if (sellRateFrom <= 0 || buyRateTo <= 0) return 0;

        const rubValue = amt * sellRateFrom;
        const result = rubValue / buyRateTo;

        // Для целочисленных валют (Stars, Tickets) округляем вниз
        if (toCurrency === 'rub') return Math.floor(result);
        return Math.floor(result * 100) / 100; // до копеек для логов
    },

    // ====================================================
    // ГЛАВНЫЙ РЕНДЕР
    // ====================================================
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

    // ====================================================
    // ⭐ v3.0.0: ОБМЕННИК ВАЛЮТ (4 ВАЛЮТЫ)
    // ====================================================
    renderExchangeScreen(container) {
        if (!container) return;

        // Валидация направления
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

        // ─── Курс-хинт ───
        const unitFrom = this._getCurrencyUnit(fromCode);
        const unitTo = this._getCurrencyUnit(toCode);
        const sellRateFrom = this._getSellRate(fromCode);
        const buyRateTo = this._getBuyRate(toCode);

        // ─── Селекты валют ───
        const fromOptionsHtml = currencies.map(c =>
            `<option value="${c.code}" ${c.code === fromCode ? 'selected' : ''}>${c.label}</option>`
        ).join('');

        const toOptionsHtml = currencies.map(c =>
            `<option value="${c.code}" ${c.code === toCode ? 'selected' : ''}>${c.label}</option>`
        ).join('');

        // ─── Верхняя таблица котировок (5 валют) ───
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

            <!-- ВЕРХНЯЯ КАРТОЧКА: ГАРАНТИРОВАННЫЙ КУРС ⭐ -->
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(255, 179, 0, 0.12), #090e18); border-color: var(--amber);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-star"></i> Гарантированный курс Stars</b>
                    <span class="tag-badge bg-tag-amber">ФИКС 100%</span>
                </div>
                <div class="font-bold text-xs color-green" style="font-size:14px;">1 ⭐ = ${starRate.toLocaleString()} ₽</div>
                <div class="sub-label mt-1" style="font-size:8.5px;">
                    Спред банка: продажа банку (банк покупает у вас) — ${this._getSellRate('stars').toLocaleString()} ₽ / покупка (вы покупаете у банка) — ${this._getBuyRate('stars').toLocaleString()} ₽.
                </div>
            </div>

            <!-- КАЛЬКУЛЯТОР ОБМЕНА -->
            <div class="glass-card mb-2 p-3" style="background: #090e18; border-color: rgba(255,255,255,0.08);">
                <div class="flex-between mb-2">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-arrow-right-arrow-left mr-1"></i> Калькулятор конвертации</b>
                    <span class="tag-badge bg-tag-cyan"><i class="fa-solid fa-bolt mr-1"></i> Спред 4%</span>
                </div>

                <!-- ОТДАЮ -->
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

                <!-- ПРЕСЕТЫ -->
                <div class="grid-4 mb-2" style="gap:4px;">
                    <button onclick="AppBank.setExchangePercent(25)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">25%</button>
                    <button onclick="AppBank.setExchangePercent(50)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">50%</button>
                    <button onclick="AppBank.setExchangePercent(75)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">75%</button>
                    <button onclick="AppBank.setExchangePercent(100)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">MAX</button>
                </div>

                <!-- КНОПКА РЕВЕРСА -->
                <div class="text-center my-1">
                    <button onclick="AppBank.toggleExchangeDirection()"
                            class="btn btn-dark btn-auto btn-sm"
                            style="width:34px; height:34px; border-radius:50%; padding:0; line-height:34px;"
                            title="Поменять валюты местами">
                        <i class="fa-solid fa-arrows-up-down color-cyan"></i>
                    </button>
                </div>

                <!-- ПОЛУЧАЮ -->
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

            <!-- ПРОДАЖА БИЛЕТА СУПЕРВИЛСПИНА -->
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

    /**
     * Формат баланса для UI.
     */
    _formatBalanceDisplay(code, value) {
        if (code === 'rub') return `${Number(value).toLocaleString()} ₽`;
        const unit = this._getCurrencyUnit(code);
        return `${Number(value).toLocaleString()} ${unit}`;
    },

    /**
     * Подсказка по курсу под полем «Получаю».
     */
    _formatRateHint(fromCode, toCode, sellRateFrom, buyRateTo) {
        const fromLabel = this._getCurrencyLabel(fromCode);
        const toLabel = this._getCurrencyLabel(toCode);
        if (fromCode === 'rub') {
            return `Курс: 1 ${this._getCurrencyUnit(toCode)} = ${buyRateTo.toLocaleString()} ₽`;
        }
        if (toCode === 'rub') {
            return `Курс: 1 ${this._getCurrencyUnit(fromCode)} = ${sellRateFrom.toLocaleString()} ₽`;
        }
        // Между валютами: показываем 1 единицу from → сколько to
        if (buyRateTo > 0) {
            const unitRate = sellRateFrom / buyRateTo;
            return `${fromLabel} → ${toLabel}: 1 ${this._getCurrencyUnit(fromCode)} ≈ ${unitRate.toFixed(4)} ${this._getCurrencyUnit(toCode)}`;
        }
        return '';
    },

    /**
     * Обработка смены валюты (from/to).
     */
    onExchangeCurrencyChanged(which, code) {
        if (!code) return;
        if (which === 'from') {
            if (code === this.exchangeToCurrency) {
                // Меняем местами, чтобы не было одинаковых
                this.exchangeToCurrency = this.exchangeFromCurrency;
            }
            this.exchangeFromCurrency = code;
        } else {
            if (code === this.exchangeFromCurrency) {
                this.exchangeFromCurrency = this.exchangeToCurrency;
            }
            this.exchangeToCurrency = code;
        }

        // Сбрасываем сумму обмена под разумное значение
        this.exchangeAmountInput = this._suggestDefaultAmount(this.exchangeFromCurrency);

        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');

        // Перерисовываем полностью, чтобы обновить курс-хинт
        this.renderExchangeScreen(document.getElementById('bankSubContentBox'));
    },

    /**
     * Подобрать разумную сумму обмена по умолчанию.
     */
    _suggestDefaultAmount(fromCode) {
        const bal = this._getPlayerBalance(fromCode);
        if (bal <= 0) {
            // Дефолт для пустых балансов
            if (fromCode === 'rub') return 25000;
            return 1;
        }
        if (fromCode === 'rub') {
            return Math.min(bal, 100000);
        }
        return Math.min(bal, 5);
    },

    /**
     * Обновление только блока результата — без пересоздания input.
     */
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

    /**
     * Обновляет подписи кнопки submit + проверяет баланс.
     */
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

    /**
     * Реверс направления обмена.
     */
    toggleExchangeDirection() {
        const tmp = this.exchangeFromCurrency;
        this.exchangeFromCurrency = this.exchangeToCurrency;
        this.exchangeToCurrency = tmp;

        this.exchangeAmountInput = this._suggestDefaultAmount(this.exchangeFromCurrency);

        if (typeof playSound === 'function') playSound('tick');
        this.renderExchangeScreen(document.getElementById('bankSubContentBox'));
    },

    /**
     * Ввод суммы.
     */
    onExchangeInputChanged(val) {
        let n = parseFloat(val);
        this.exchangeAmountInput = isNaN(n) ? 0 : Math.max(0, n);
        this._updateExchangeResultOnly();
    },

    /**
     * Пресет % от баланса отдаваемой валюты.
     */
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

    /**
     * Выполнить обмен.
     */
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
            // Списание
            const spendOk = this._spendCurrency(fromCode, val);
            if (!spendOk) {
                return showToast("Ошибка списания!");
            }

            // Начисление
            const gainOk = this._gainCurrency(toCode, resultVal);
            if (!gainOk) {
                // Откат
                this._gainCurrency(fromCode, val);
                return showToast("Ошибка начисления!");
            }

            // Лог в банк
            const fromUnit = this._getCurrencyUnit(fromCode);
            const toUnit = this._getCurrencyUnit(toCode);

            if (typeof logBankTransaction === 'function') {
                // Рублёвый эквивалент для истории
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

            // Сбрасываем сумму под новый баланс
            this.exchangeAmountInput = this._suggestDefaultAmount(fromCode);

            // Перерисовываем
            this.renderExchangeScreen(document.getElementById('bankSubContentBox'));

        } finally {
            this._exchangeActionPending = false;
        }
    },

    /**
     * Покупка билета СуперВилспина — делегируем в PhoneMedia.
     */
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

    // ========================================================
    // ДРУГИЕ РАЗДЕЛЫ (без изменений)
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

console.log('[🏦 phone-bank v3.0.0] Обменник 4 валют (₽ ⭐ 🎟️ 🎫) + любые пары + спред 4% + курс ⭐ = 25 000 ₽ ✓');

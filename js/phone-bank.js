// ========================================================
// js/phone-bank.js — БАНК «ВО-БАНК ОНЛАЙН» (v2.2.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ПОЛНЫЙ ФАЙЛ БЕЗ СОКРАЩЕНИЙ.
// Электронное табло курсов валют, конвертер Stars/RUB,
// кредитная линейка перекупа для перехода в Комфорт,
// депозитный сейф и история транзакций.
// ========================================================

const AppBank = {
    activeSubTab: 'exchange', // 'accounts' | 'exchange' | 'deposits' | 'reputation' | 'crypto' | 'loan' | 'mortgage'
    exchangeDirection: 'rub_to_stars', // 'rub_to_stars' | 'stars_to_rub'
    exchangeAmountInput: 100000,

    render(container) {
        if (!container) return;

        let sub = this.activeSubTab;
        let p = state.player || {};

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
                <!-- ВЕРХНИЕ ВКЛАДКИ БАНКА -->
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
        if (sub === 'exchange') this.renderExchangeScreen(subBox);
        else if (sub === 'accounts') this.renderAccountsScreen(subBox);
        else if (sub === 'deposits') this.renderDepositsScreen(subBox);
        else if (sub === 'reputation') this.renderReputationScreen(subBox);
        else if (sub === 'crypto') this.renderCryptoScreen(subBox);
        else if (sub === 'loan') this.renderLoanScreen(subBox);
        else if (sub === 'mortgage') this.renderMortgageScreen(subBox);
    },

    switchSubTab(tab) {
        this.activeSubTab = tab;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // ТАБЛО КУРСОВ ВАЛЮТ И КОНВЕРТАЦИЯ
    // ========================================================
    renderExchangeScreen(container) {
        if (!container) return;

        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;
        let superSpinTickets = state.player?.superSpinTickets || 1;

        let dir = this.exchangeDirection;
        let inputVal = this.exchangeAmountInput || 100000;

        // Расчёт конвертации: 1 Star = 100,000 ₽
        let resultVal = 0;
        if (dir === 'rub_to_stars') {
            resultVal = Math.floor(inputVal / 100000);
        } else {
            resultVal = inputVal * 100000;
        }

        const superWheelStars = window.WHEEL_CONFIG?.superWheel?.costStars || 60;

        container.innerHTML = `
            <!-- ТАБЛО КУРСОВ ВАЛЮТ ЦБ & БИРЖИ -->
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
                        <b class="color-cyan text-xs" style="font-size:10px;">100,000 ₽</b>
                        <div class="color-cyan" style="font-size:7px;">ФИКС 1:100k</div>
                    </div>
                </div>
            </div>

            <!-- ИНФО-ПЛАШКА ГАРАНТИРОВАННОГО КУРСА -->
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(255, 179, 0, 0.12), #090e18); border-color: var(--amber);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-star"></i> Гарантированный курс Stars</b>
                    <span class="tag-badge bg-tag-amber">ФИКС 100%</span>
                </div>
                <div class="font-bold text-xs color-green" style="font-size:14px;">1 ⭐ = 100,000 ₽</div>
                <div class="sub-label mt-1" style="font-size:8.5px;">Официальный обменный пункт Во-Банка без скрытых комиссий и проскальзываний.</div>
            </div>

            <!-- ИНТЕРАКТИВНЫЙ КАЛЬКУЛЯТОР КОНВЕРТАЦИИ -->
            <div class="glass-card mb-2 p-3" style="background: #090e18; border-color: rgba(255,255,255,0.08);">
                <div class="flex-between mb-2">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-arrow-right-arrow-left mr-1"></i> Калькулятор конвертации</b>
                    <span class="tag-badge bg-tag-cyan"><i class="fa-solid fa-bolt mr-1"></i> Без комиссии</span>
                </div>

                <!-- ОТДАЮ -->
                <div class="mb-2">
                    <div class="flex-between mb-1 text-xs">
                        <span class="sub-label font-bold" style="font-size:9px;">ОТДАЮ:</span>
                        <span class="sub-label" style="font-size:9px;">Баланс: <b class="color-cyan">${dir === 'rub_to_stars' ? cash.toLocaleString() + ' ₽' : stars + ' ⭐'}</b></span>
                    </div>
                    <div class="grid-2" style="grid-template-columns: 120px 1fr; gap:6px;">
                        <div class="p-2" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.1); font-size:11px; font-weight:800;">
                            ${dir === 'rub_to_stars' ? '₽ Рубли ₽' : '⭐ Stars ⭐'}
                        </div>
                        <input type="number" id="bankExchangeInput" value="${inputVal}" oninput="AppBank.onExchangeInputChanged(this.value)" class="chat-input text-right font-bold" style="font-size:14px; padding:6px 10px; color:#fff;" min="1">
                    </div>
                </div>

                <!-- БЫСТРЫЕ ПРОЦЕНТНЫЕ КНОПКИ -->
                <div class="grid-4 mb-2" style="gap:4px;">
                    <button onclick="AppBank.setExchangePercent(25)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">25%</button>
                    <button onclick="AppBank.setExchangePercent(50)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">50%</button>
                    <button onclick="AppBank.setExchangePercent(75)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">75%</button>
                    <button onclick="AppBank.setExchangePercent(100)" class="btn btn-dark btn-sm" style="font-size:8.5px; padding:4px 0;">MAX</button>
                </div>

                <!-- КНОПКА СМЕНЫ НАПРАВЛЕНИЯ -->
                <div class="text-center my-1">
                    <button onclick="AppBank.toggleExchangeDirection()" class="btn btn-dark btn-auto btn-sm" style="width:34px; height:34px; border-radius:50%; padding:0; line-height:34px;" title="Поменять направление">
                        <i class="fa-solid fa-arrows-up-down color-cyan"></i>
                    </button>
                </div>

                <!-- ПОЛУЧАЮ -->
                <div class="mb-3">
                    <div class="flex-between mb-1 text-xs">
                        <span class="sub-label font-bold" style="font-size:9px;">ПОЛУЧАЮ:</span>
                        <span class="sub-label" style="font-size:9px;">Баланс: <b class="color-green">${dir === 'rub_to_stars' ? stars + ' ⭐' : cash.toLocaleString() + ' ₽'}</b></span>
                    </div>
                    <div class="grid-2" style="grid-template-columns: 120px 1fr; gap:6px;">
                        <div class="p-2" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.1); font-size:11px; font-weight:800;">
                            ${dir === 'rub_to_stars' ? '⭐ Stars ⭐' : '₽ Рубли ₽'}
                        </div>
                        <div class="p-2 text-right font-bold color-green" style="background:#050914; border-radius:8px; border:1px solid rgba(0,230,118,0.3); font-size:14px;">
                            +${resultVal.toLocaleString()} ${dir === 'rub_to_stars' ? '⭐' : '₽'}
                        </div>
                    </div>
                    <div class="sub-label text-center mt-1" style="font-size:8px;">Курс конвертации: <b>1 RUB = 0.00001 STARS</b></div>
                </div>

                <button onclick="AppBank.executeExchangeAction()" class="btn btn-green w-full font-bold" style="padding:10px 0; font-size:12px;">
                    ОБМЕНЯТЬ СЕЙЧАС (${dir === 'rub_to_stars' ? inputVal.toLocaleString() + ' RUB' : inputVal + ' STARS'}) 💱
                </button>
            </div>

            <!-- ПОКУПКА БИЛЕТОВ СУПЕР ВИЛСПИНА С ОБНОВЛЕННОЙ СТОИМОСТЬЮ -->
            <div class="glass-card p-2 flex-between" style="border-left: 3px solid var(--green); background:#090e18;">
                <div>
                    <div class="font-bold text-xs color-green"><i class="fa-solid fa-ticket-simple mr-1"></i> Билет «Супер Вилспин»</div>
                    <div class="sub-label" style="font-size:8.5px;">На балансе: <b>${superSpinTickets} шт.</b></div>
                </div>
                <button onclick="AppBank.buySuperSpinTicketAction()" class="btn btn-green btn-auto btn-sm font-bold" style="font-size:9.5px; padding:5px 10px;">
                    КУПИТЬ (150K или ${superWheelStars} ⭐)
                </button>
            </div>
        `;
    },

    toggleExchangeDirection() {
        this.exchangeDirection = this.exchangeDirection === 'rub_to_stars' ? 'stars_to_rub' : 'rub_to_stars';
        this.exchangeAmountInput = this.exchangeDirection === 'rub_to_stars' ? 100000 : 1;
        if (typeof playSound === 'function') playSound('tick');
        this.renderExchangeScreen(document.getElementById('bankSubContentBox'));
    },

    onExchangeInputChanged(val) {
        let n = parseInt(val, 10);
        this.exchangeAmountInput = isNaN(n) ? 0 : Math.max(0, n);
        this.renderExchangeScreen(document.getElementById('bankSubContentBox'));
    },

    setExchangePercent(pct) {
        let dir = this.exchangeDirection;
        let maxVal = dir === 'rub_to_stars' ? (state.player?.cash || 0) : (state.player?.stars || 0);
        this.exchangeAmountInput = Math.floor(maxVal * (pct / 100));
        if (typeof playSound === 'function') playSound('tick');
        this.renderExchangeScreen(document.getElementById('bankSubContentBox'));
    },

    executeExchangeAction() {
        let dir = this.exchangeDirection;
        let val = this.exchangeAmountInput || 0;

        if (val <= 0) return showToast("Введите сумму для конвертации!");

        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;

        if (dir === 'rub_to_stars') {
            if (val < 100000) return showToast("Минимальный обмен: 100,000 ₽ за 1 ⭐!");
            if (cash < val) return showToast("Недостаточно рублей на балансе!");

            let starsGained = Math.floor(val / 100000);
            let rubSpent = starsGained * 100000;

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

            let rubGained = val * 100000;
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

        this.renderExchangeScreen(document.getElementById('bankSubContentBox'));
    },

    buySuperSpinTicketAction() {
        const starCost = window.WHEEL_CONFIG?.superWheel?.costStars || 60;
        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;

        if (cash >= 150000) {
            state.player.cash -= 150000;
        } else if (stars >= starCost) {
            state.player.stars -= starCost;
        } else {
            return showToast(`Нужно 150,000 ₽ или ${starCost} Stars ⭐ на покупку билета!`);
        }

        state.player.superSpinTickets = (state.player.superSpinTickets || 0) + 1;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Покупка билета Супер Вилспин`, 150000, false);
        }

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Билет «Супер Вилспин» успешно приобретен! Крутите колесо в Фортуне 🎰");
        this.renderExchangeScreen(document.getElementById('bankSubContentBox'));
    },

    // ========================================================
    // ДРУГИЕ РАЗДЕЛЫ БАНКА: СЧЕТА, ВКЛАДЫ, КРЕДИТЫ
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
                    <div class="sub-label" style="font-size:8.5px;">+3% доходности в полночь, иммунитет к долгам</div>
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
        let str = prompt("Сумма для внесения в сейф (₽):", "100000");
        if (!str) return;
        let val = parseInt(str, 10);
        if (isNaN(val) || val <= 0) return showToast("Некорректная сумма!");

        let cash = state.player?.cash || 0;
        if (cash < val) return showToast("Недостаточно денег на балансе!");

        state.player.cash -= val;
        state.player.safeDeposit = (state.player.safeDeposit || 0) + val;
        saveState();
        updateHeaderUI();
        playSound('win');
        showToast(`В сейф внесено +${val.toLocaleString()} ₽!`);
        this.renderDepositsScreen(document.getElementById('bankSubContentBox'));
    },

    withdrawSafePrompt() {
        let safe = state.player?.safeDeposit || 0;
        let str = prompt(`Сколько снять из сейфа? (Доступно: ${safe.toLocaleString()} ₽):`, String(safe));
        if (!str) return;
        let val = parseInt(str, 10);
        if (isNaN(val) || val <= 0 || val > safe) return showToast("Некорректная сумма!");

        state.player.safeDeposit -= val;
        state.player.cash += val;
        saveState();
        updateHeaderUI();
        playSound('win');
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

    // --------------------------------------------------------
    // УМНАЯ КРЕДИТНАЯ ЛИНЕЙКА ДЛЯ ПЕРЕХОДА В КОМФОРТ
    // --------------------------------------------------------
    renderLoanScreen(container) {
        if (!container) return;
        let debt = state.player?.loanDebt || 0;
        let lvl = state.player?.level || 1;

        let options = [
            { id: "starter", title: "Стартовый овердрафт", amount: 150000, repay: 165000, minLvl: 1, desc: "Быстрый выкуп первой классики под ремонт" },
            { id: "comfort", title: "Займ «Шаг в Комфорт»", amount: 500000, repay: 550000, minLvl: 4, desc: "Хватает на покупку Solaris или Focus на авторынке" },
            { id: "pro", title: "Бизнес-кредит перекупа", amount: 1500000, repay: 1680000, minLvl: 8, desc: "Оптовый выкуп автопарков и редких янгтаймеров" }
        ];

        let loanCardsHtml = options.map(opt => {
            let isLocked = lvl < opt.minLvl;
            return `
                <div class="glass-card p-2 mb-2" style="background:#070b14; border-color:${isLocked ? 'rgba(255,255,255,0.06)' : 'var(--cyan)'};">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan">${opt.title}</b>
                        <b class="price-val color-green text-xs">+${opt.amount.toLocaleString()} ₽</b>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9px;">${opt.desc} • К возврату: <b>${opt.repay.toLocaleString()} ₽</b></div>
                    <button onclick="AppBank.takeTierLoanAction(${opt.amount}, ${opt.repay})" class="btn ${isLocked ? 'btn-dark opacity-50' : 'btn-cyan'} btn-sm w-full" ${isLocked || debt > 0 ? 'disabled' : ''}>
                        ${isLocked ? `🔒 С ${opt.minLvl} уровня` : (debt > 0 ? 'Есть активный долг' : 'Оформить займ')}
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
        if ((state.player?.loanDebt || 0) > 0) return showToast("У вас уже есть непогашенный займ!");
        state.player.cash = (state.player.cash || 0) + amount;
        state.player.loanDebt = repayAmount;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Зачисление кредита`, amount, true);
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Кредит ${amount.toLocaleString()} ₽ зачислен на баланс!`);
        this.renderLoanScreen(document.getElementById('bankSubContentBox'));
    },

    repayLoanAction() {
        let debt = state.player?.loanDebt || 0;
        let cash = state.player?.cash || 0;
        if (cash < debt) return showToast("Недостаточно денег для закрытия долга!");

        state.player.cash -= debt;
        state.player.loanDebt = 0;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Полное погашение кредита`, debt, false);
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast("Кредит полностью закрыт!");
        this.renderLoanScreen(document.getElementById('bankSubContentBox'));
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
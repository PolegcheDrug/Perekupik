// ========================================================
// js/phone-bank.js — ПРИЛОЖЕНИЕ «ВО-БАНК ОНЛАЙН» (v0.6.2)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Полноценный мультивалютный обменник, репутация перекупа,
// гибкие срочные вклады с капитализацией, крипто-биржа и ипотека.
// ========================================================

const AppBank = {
    subTab: 'accounts', // 'accounts', 'exchange', 'deposits', 'reputation', 'crypto', 'credit', 'mortgage'

    render(container) {
        let cash = state.player?.cash || 0;
        let safe = state.player?.safeDeposit || 0;
        let debt = state.player?.loanDebt || 0;
        let sub = this.subTab;

        let btcAmount = state.player?.crypto?.btc || 0;
        let ethAmount = state.player?.crypto?.eth || 0;
        let btcPrice = state.player?.crypto?.prices?.btc || 9500000;
        let ethPrice = state.player?.crypto?.prices?.eth || 340000;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-building-columns color-green mr-1"></i> Во-Банк Онлайн</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                
                <!-- Верхняя панель навигации по банку -->
                <div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 4px;">
                    <button onclick="AppBank.switchTab('accounts')" class="btn ${sub === 'accounts' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">Счета</button>
                    <button onclick="AppBank.switchTab('exchange')" class="btn ${sub === 'exchange' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">Обменник</button>
                    <button onclick="AppBank.switchTab('deposits')" class="btn ${sub === 'deposits' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">Вклады</button>
                    <button onclick="AppBank.switchTab('reputation')" class="btn ${sub === 'reputation' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">Репутация</button>
                </div>
                <div class="grid-3 mb-2" style="grid-template-columns: repeat(3, 1fr); gap: 4px;">
                    <button onclick="AppBank.switchTab('crypto')" class="btn ${sub === 'crypto' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">Крипта</button>
                    <button onclick="AppBank.switchTab('credit')" class="btn ${sub === 'credit' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">Кредит</button>
                    <button onclick="AppBank.switchTab('mortgage')" class="btn ${sub === 'mortgage' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">Ипотека</button>
                </div>

                ${sub === 'accounts' ? this.renderAccountsTab(cash, safe) : ''}
                ${sub === 'exchange' ? this.renderExchangeTab() : ''}
                ${sub === 'deposits' ? this.renderDepositsTab() : ''}
                ${sub === 'reputation' ? this.renderReputationTab() : ''}
                ${sub === 'crypto' ? this.renderCryptoTab(btcAmount, ethAmount, btcPrice, ethPrice) : ''}
                ${sub === 'credit' ? this.renderCreditTab(debt) : ''}
                ${sub === 'mortgage' ? this.renderMortgageTab() : ''}
            </div>
        `;
    },

    switchTab(tab) {
        playSound('tick');
        tgHaptic('light');
        this.subTab = tab;
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 1. ВКЛАДКА: СЧЕТА И СЕЙФ
    // ========================================================
    renderAccountsTab(cash, safe) {
        let historyHtml = "";
        let history = state.player?.bankHistory || [];
        if (history.length === 0) {
            historyHtml = "<div class='sub-label text-center py-3'>История транзакций пуста.</div>";
        } else {
            history.slice(0, 10).forEach(tx => {
                historyHtml += `
                <div class="p-2 flex-between mb-1" style="background:#090e18; border-radius:6px; border:1px solid rgba(255,255,255,0.04);">
                    <div>
                        <div class="text-xs font-bold">${tx.title}</div>
                        <div class="sub-label" style="font-size:8.5px;">${tx.time || 'Только что'}</div>
                    </div>
                    <b class="text-xs ${tx.isIncome ? 'color-green' : 'color-red'}">${tx.isIncome ? '+' : '-'}${tx.amount.toLocaleString()} ₽</b>
                </div>`;
            });
        }

        return `
            <div class="bank-credit-card mb-2">
                <div class="flex-between mb-2">
                    <b style="font-size:14px; letter-spacing:0.5px;">VO-BANK PLATINUM</b>
                    <i class="fa-brands fa-cc-visa" style="font-size:22px; color:#38bdf8;"></i>
                </div>
                <div class="bank-chip"></div>
                <div class="bank-balance">${cash.toLocaleString()} ₽</div>
                <div class="bank-card-num">**** **** **** 7777</div>
                <div class="flex-between mt-2 text-xs" style="opacity:0.85;">
                    <span>${(state.player?.name || 'PEREKUP').toUpperCase()}</span>
                    <span>12/29</span>
                </div>
            </div>
            
            <div class="glass-card mb-2 p-2">
                <div class="p-2 mb-2" style="background:#090e18; border-radius:10px; border:1px solid var(--border-glow);">
                    <div class="flex-between">
                        <div>
                            <div class="text-xs font-bold color-amber"><i class="fa-solid fa-shield-halved"></i> Бронированный Сейф Перекупа</div>
                            <div class="sub-label" style="font-size:9.5px;">+3% ежедневно в полночь • Иммунитет к рэкету</div>
                        </div>
                        <b class="color-amber text-xs" style="font-size:13px;">${safe.toLocaleString()} ₽</b>
                    </div>
                </div>

                <div class="grid-2 mb-2">
                    <button onclick="AppBank.depositSafe(50000)" class="btn btn-dark btn-sm">+50,000 ₽</button>
                    <button onclick="AppBank.depositSafe(250000)" class="btn btn-dark btn-sm">+250,000 ₽</button>
                </div>
                <div class="grid-2">
                    <button onclick="AppBank.depositSafe('all')" class="btn btn-cyan btn-sm">Внести всё</button>
                    <button onclick="AppBank.withdrawSafe()" class="btn btn-green btn-sm" ${safe <= 0 ? 'disabled' : ''}>Забрать из сейфа</button>
                </div>
            </div>

            <div class="glass-card p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-clock-rotate-left"></i> Выписка по карте</b>
                    <span class="sub-label" style="font-size:9px;">Последние операции</span>
                </div>
                <div class="space-y-1" style="max-height: 150px; overflow-y: auto;">
                    ${historyHtml}
                </div>
            </div>
        `;
    },

    // ========================================================
    // 2. ВКЛАДКА: ВАЛЮТНЫЙ ОБМЕННИК
    // ========================================================
    renderExchangeTab() {
        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;
        let fuel = state.player?.fuel || 0;
        let tickets = state.player?.expressTickets || 0;
        let superSpinTickets = state.player?.superSpinTickets || 0;

        return `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.12), #090e18); border-color: rgba(0, 242, 254, 0.35);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-arrow-right-arrow-left"></i> Мультивалютная Касса Во-Банка</b>
                    <span class="tag-badge bg-tag-cyan">Комиссия 0%</span>
                </div>
                <div class="sub-label mb-2" style="font-size:9.5px;">Мгновенный обмен валют, конвертация бензина, талонов и покупка Stars.</div>

                <div class="car-spec-chips-row mb-1">
                    <div class="car-spec-chip"><i class="fa-solid fa-ruble-sign color-green"></i> <b>${(cash / 1000).toFixed(0)}k</b></div>
                    <div class="car-spec-chip"><i class="fa-solid fa-star color-amber"></i> <b>${stars}</b> ⭐</div>
                    <div class="car-spec-chip"><i class="fa-solid fa-gas-pump color-cyan"></i> <b>${fuel}</b> ⛽</div>
                    <div class="car-spec-chip"><i class="fa-solid fa-ticket color-purple"></i> <b>${tickets}</b> 🎟️</div>
                </div>
            </div>

            <!-- Размен рублей на Stars -->
            <div class="glass-card p-2 mb-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-star"></i> Покупка Stars за Наличные</b>
                    <span class="sub-label text-xs">Курс: 1 ⭐ = 14,000 ₽</span>
                </div>
                <div class="grid-3 mb-1">
                    <button onclick="AppBank.buyStarsPack(10, 140000)" class="btn btn-dark btn-sm">+10 ⭐ (140k)</button>
                    <button onclick="AppBank.buyStarsPack(25, 350000)" class="btn btn-amber btn-sm">+25 ⭐ (350k)</button>
                    <button onclick="AppBank.buyStarsPack(100, 1400000)" class="btn btn-dark btn-sm">+100 ⭐ (1.4M)</button>
                </div>
            </div>

            <!-- Конвертация топлива в Stars -->
            <div class="glass-card p-2 mb-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-gas-pump"></i> Сдать излишки Топлива ⛽</b>
                    <span class="sub-label text-xs">АЗС Скупка</span>
                </div>
                <div class="grid-2">
                    <button onclick="AppBank.exchangeFuelForCash(30)" class="btn btn-dark btn-sm" ${fuel < 30 ? 'disabled' : ''}>-30 ⛽ (+60,000 ₽)</button>
                    <button onclick="AppBank.exchangeFuelForStars(50, 8)" class="btn btn-cyan btn-sm" ${fuel < 50 ? 'disabled' : ''}>-50 ⛽ (+8 ⭐ Stars)</button>
                </div>
            </div>

            <!-- Конвертация талонов -->
            <div class="glass-card p-2 mb-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-purple"><i class="fa-solid fa-ticket"></i> Обмен экспресс-пропусков 🎟️</b>
                    <span class="sub-label text-xs">Талоны площадки</span>
                </div>
                <div class="grid-2">
                    <button onclick="AppBank.exchangeTicketsForCash(10)" class="btn btn-dark btn-sm" ${tickets < 10 ? 'disabled' : ''}>-10 🎟️ (+75,000 ₽)</button>
                    <button onclick="AppBank.exchangeTicketsForStars(15, 10)" class="btn btn-purple btn-sm" ${tickets < 15 ? 'disabled' : ''}>-15 🎟️ (+10 ⭐ Stars)</button>
                </div>
            </div>

            <!-- Билеты супер-вилспина -->
            <div class="glass-card p-2" style="border: 1px solid rgba(0, 230, 118, 0.4);">
                <div class="flex-between mb-1">
                    <div>
                        <b class="text-xs color-green"><i class="fa-solid fa-clover"></i> Билет «Супер Вилспин»</b>
                        <div class="sub-label" style="font-size:9px;">В наличии: <b>${superSpinTickets} шт.</b></div>
                    </div>
                    <span class="price-val text-xs color-green">300k ₽ + 30 ⭐</span>
                </div>
                <button onclick="AppBank.buySuperSpinTicketBank()" class="btn btn-green btn-sm w-full mt-1">
                    Приобрести билет Фортуны 🎰
                </button>
            </div>
        `;
    },

    // ========================================================
    // 3. ВКЛАДКА: ГЛУБОКАЯ СИСТЕМА ДЕПОЗИТОВ
    // ========================================================
    renderDepositsTab() {
        let deposits = state.player?.bankDeposits || [];
        let htmlList = "";

        if (deposits.length === 0) {
            htmlList = `
                <div class="sub-label text-center py-4">
                    <i class="fa-solid fa-vault mb-2" style="font-size:24px; color:var(--text-sub);"></i>
                    <div>У вас нет открытых вкладов. Выберите тариф ниже!</div>
                </div>
            `;
        } else {
            deposits.forEach((dep, idx) => {
                let progressPct = Math.min(100, Math.round(((dep.daysPassed || 0) / dep.totalDays) * 100));
                let isMatured = (dep.daysPassed || 0) >= dep.totalDays;
                let profit = dep.currentAmount - dep.principal;

                htmlList += `
                <div class="glass-card p-2 mb-2" style="border-left: 3px solid ${isMatured ? 'var(--green)' : 'var(--cyan)'};">
                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs ${isMatured ? 'color-green' : 'color-cyan'}">${dep.name}</b>
                            <div class="sub-label" style="font-size:9px;">Срок: ${dep.totalDays} дн. (Прошло: ${dep.daysPassed} дн.)</div>
                        </div>
                        <span class="tag-badge ${isMatured ? 'bg-tag-green' : 'bg-tag-cyan'}">
                            ${isMatured ? 'ВЫПЛАЧЕН ✓' : `${dep.dailyPercent}% / д`}
                        </span>
                    </div>

                    <div class="p-2 my-1" style="background:#090e18; border-radius:8px;">
                        <div class="flex-between text-xs mb-1">
                            <span class="sub-label">Тело вклада:</span>
                            <b>${dep.principal.toLocaleString()} ₽</b>
                        </div>
                        <div class="flex-between text-xs mb-1">
                            <span class="sub-label">Баланс с процентами:</span>
                            <b class="color-green font-bold">${Math.round(dep.currentAmount).toLocaleString()} ₽</b>
                        </div>
                        <div class="flex-between text-xs">
                            <span class="sub-label">Чистая прибыль:</span>
                            <b class="color-amber">+${Math.round(profit).toLocaleString()} ₽</b>
                        </div>
                    </div>

                    <div class="biz-progress-track mb-2">
                        <div class="biz-progress-fill ${isMatured ? 'fill-biz-stock' : 'fill-biz-lvl'}" style="width: ${progressPct}%;"></div>
                    </div>

                    <div class="grid-2">
                        <button onclick="AppBank.closeDeposit(${idx}, true)" class="btn ${isMatured ? 'btn-green' : 'btn-dark'} btn-sm">
                            ${isMatured ? 'Забрать всю сумму ✓' : 'Досрочный возврат (Без %)'}
                        </button>
                        <button onclick="AppBank.toggleCompound(${idx})" class="btn btn-dark btn-sm" style="font-size:10px;">
                            ${dep.autoCompound ? 'Капитализация: ВКЛ ✓' : 'Капитализация: ВЫКЛ'}
                        </button>
                    </div>
                </div>`;
            });
        }

        return `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-green"><i class="fa-solid fa-chart-line"></i> Открыть новый депозит</b>
                    <span class="tag-badge bg-tag-green">АСВ Защита</span>
                </div>
                <div class="sub-label mb-2" style="font-size:9.5px;">Проценты начисляются в 00:00. При включённой капитализации доход реинвестируется.</div>

                <div class="space-y-2 mb-2">
                    <div class="p-2 flex-between" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                        <div>
                            <b class="text-xs color-cyan">«Быстрый Оборот» (7 дней)</b>
                            <div class="sub-label" style="font-size:9px;">Ставка 2.8% в день • Минимум: 100,000 ₽</div>
                        </div>
                        <button onclick="AppBank.createDepositPlan('Быстрый Оборот', 100000, 7, 2.8)" class="btn btn-cyan btn-sm btn-auto">Открыть (100k)</button>
                    </div>

                    <div class="p-2 flex-between" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                        <div>
                            <b class="text-xs color-green">«Гаражный Капитал» (14 дней)</b>
                            <div class="sub-label" style="font-size:9px;">Ставка 3.5% в день • Минимум: 500,000 ₽</div>
                        </div>
                        <button onclick="AppBank.createDepositPlan('Гаражный Капитал', 500000, 14, 3.5)" class="btn btn-green btn-sm btn-auto">Открыть (500k)</button>
                    </div>

                    <div class="p-2 flex-between" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                        <div>
                            <b class="text-xs color-amber">«Синдикат Инвест» (30 дней)</b>
                            <div class="sub-label" style="font-size:9px;">Ставка 4.2% в день • Минимум: 2,000,000 ₽</div>
                        </div>
                        <button onclick="AppBank.createDepositPlan('Синдикат Инвест', 2000000, 30, 4.2)" class="btn btn-amber btn-sm btn-auto">Открыть (2M)</button>
                    </div>
                </div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-cyan mb-2 block">💼 Ваши действующие вклады:</b>
                ${htmlList}
            </div>
        `;
    },

    createDepositPlan(name, amount, days, rate) {
        let cash = state.player?.cash || 0;
        if (cash < amount) return showToast(`Не хватает денег! Требуется ${amount.toLocaleString()} ₽.`);

        state.player.cash -= amount;
        if (!Array.isArray(state.player.bankDeposits)) state.player.bankDeposits = [];

        state.player.bankDeposits.push({
            id: "dep_" + Date.now(),
            name: name,
            principal: amount,
            currentAmount: amount,
            dailyPercent: rate,
            totalDays: days,
            daysPassed: 0,
            autoCompound: true,
            startDate: Date.now()
        });

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Открытие вклада «${name}»`, amount, false);
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Вклад «${name}» на ${amount.toLocaleString()} ₽ открыт!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    closeDeposit(idx, isManual) {
        let dep = state.player?.bankDeposits?.[idx];
        if (!dep) return;

        let isMatured = (dep.daysPassed || 0) >= dep.totalDays;
        let payout = isMatured ? Math.round(dep.currentAmount) : dep.principal;

        state.player.cash = (state.player.cash || 0) + payout;
        state.player.bankDeposits.splice(idx, 1);

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Закрытие вклада «${dep.name}»`, payout, true);
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');

        if (isMatured) {
            openVerdictModal("ВКЛАД УСПЕШНО ЗАКРЫТ! 💰", `Срок договора истёк. Вся сумма с процентами зачислена на карту!\nВыплачено: +${payout.toLocaleString()} ₽`, true, payout);
        } else {
            showToast(`Вклад закрыт досрочно. Возвращено тело депозита: ${payout.toLocaleString()} ₽.`);
        }

        this.render(document.getElementById('phoneAppContainer'));
    },

    toggleCompound(idx) {
        let dep = state.player?.bankDeposits?.[idx];
        if (!dep) return;
        dep.autoCompound = !dep.autoCompound;
        saveState();
        playSound('tick');
        this.render(document.getElementById('phoneAppContainer'));
        showToast(dep.autoCompound ? "Капитализация процентов включена!" : "Капитализация процентов отключена.");
    },

    // ========================================================
    // 4. ВКЛАДКА: РЕПУТАЦИЯ ПЕРЕКУПА И ОТЗЫВЫ КЛИЕНТОВ
    // ========================================================
    renderReputationTab() {
        let rep = state.player?.bankReputation || { rating: 5.0, successfulDeals: 0, fairDealsCount: 0, scandalsCount: 0, vipBankTier: 'Стандарт', loanLimit: 500000, reviewsLog: [] };
        let karma = state.player?.karma || 50;
        let reviews = rep.reviewsLog || [];

        let starsHtml = "";
        let rounded = Math.round(rep.rating || 5);
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<i class="fa-solid fa-star ${i <= rounded ? 'color-amber' : 'color-sub'}" style="font-size:15px; margin:0 2px;"></i>`;
        }

        let reviewsListHtml = "";
        if (reviews.length === 0) {
            reviewsListHtml = "<div class='sub-label text-center py-3'>Пока нет отзывов от покупателей с площадки.</div>";
        } else {
            reviews.slice(0, 8).forEach(rev => {
                reviewsListHtml += `
                <div class="glass-card p-2 mb-2" style="background:#090e18; border-color:rgba(255,255,255,0.05);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan">${rev.author}</b>
                        <span class="color-amber text-xs">${'★'.repeat(rev.rating || 5)}</span>
                    </div>
                    <div class="sub-label" style="font-size:9.5px; line-height:1.35; color:#cbd5e1;">«${rev.text}»</div>
                    <div class="sub-label mt-1" style="font-size:8px;">${rev.date || 'Недавно'}</div>
                </div>`;
            });
        }

        return `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.15), #090e18);">
                <div class="sub-label text-xs mb-1">Рейтинг деловой репутации Во-Банка:</div>
                <div class="price-val color-green mb-1" style="font-size:28px;">${(rep.rating || 5.0).toFixed(1)} / 5.0</div>
                <div class="mb-2">${starsHtml}</div>
                <div class="flex-between text-xs px-2 py-1" style="background:rgba(0,0,0,0.4); border-radius:8px;">
                  <span>Уровень доверия: <b class="color-cyan">${rep.vipBankTier}</b></span>
                  <span>Карма перекупа: <b class="color-amber">${karma}%</b></span>
                </div>
            </div>

            <div class="grid-2 mb-2">
                <div class="glass-card p-2 text-center">
                    <div class="sub-label" style="font-size:9px;">Честных сделок:</div>
                    <b class="color-green text-xs" style="font-size:14px;">${rep.fairDealsCount || (state.player?.stats?.profitableSales || 0)}</b>
                </div>
                <div class="glass-card p-2 text-center">
                    <div class="sub-label" style="font-size:9px;">Кредитный лимит:</div>
                    <b class="color-amber text-xs" style="font-size:14px;">${(rep.loanLimit || 500000).toLocaleString()} ₽</b>
                </div>
            </div>

            <div class="glass-card p-2">
                <div class="flex-between mb-2">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-comments"></i> Отзывы покупателей с площадки:</b>
                    <span class="sub-label" style="font-size:9px;">Проверенные клиенты</span>
                </div>
                <div class="space-y-1" style="max-height: 210px; overflow-y: auto;">
                    ${reviewsListHtml}
                </div>
            </div>
        `;
    },

    // ========================================================
    // 5. ВКЛАДКА: КРИПТО-БИРЖА
    // ========================================================
    renderCryptoTab(btcAmount, ethAmount, btcPrice, ethPrice) {
        return `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-brands fa-bitcoin"></i> Bitcoin (BTC)</b>
                    <span class="text-xs font-bold">${btcAmount.toFixed(4)} ₿</span>
                </div>
                <div class="price-val color-green mb-1">${btcPrice.toLocaleString()} ₽</div>
                <div class="crypto-chart-mockup"><div class="crypto-line"></div></div>
                <div class="grid-2 mt-2">
                    <button onclick="AppBank.tradeCrypto('btc', 'buy')" class="btn btn-green btn-sm">Купить 0.01 ₿</button>
                    <button onclick="AppBank.tradeCrypto('btc', 'sell')" class="btn btn-danger btn-sm">Продать всё</button>
                </div>
            </div>

            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-purple"><i class="fa-brands fa-ethereum"></i> Ethereum (ETH)</b>
                    <span class="text-xs font-bold">${ethAmount.toFixed(2)} Ξ</span>
                </div>
                <div class="price-val color-green mb-1">${ethPrice.toLocaleString()} ₽</div>
                <div class="crypto-chart-mockup"><div class="crypto-line" style="filter: hue-rotate(90deg);"></div></div>
                <div class="grid-2 mt-2">
                    <button onclick="AppBank.tradeCrypto('eth', 'buy')" class="btn btn-green btn-sm">Купить 1.0 Ξ</button>
                    <button onclick="AppBank.tradeCrypto('eth', 'sell')" class="btn btn-danger btn-sm">Продать всё</button>
                </div>
            </div>
            <div class="sub-label text-center" style="font-size:9.5px;">💡 Курсы криптовалюты динамически пересчитываются каждую полночь (00:00).</div>
        `;
    },

    // ========================================================
    // 6. ВКЛАДКА: КРЕДИТНАЯ ЛИНИЯ
    // ========================================================
    renderCreditTab(debt) {
        let maxLimit = state.player?.bankReputation?.loanLimit || 500000;
        let available = Math.max(0, maxLimit - debt);

        return `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-red"><i class="fa-solid fa-handholding-dollar"></i> Кредитная Линия Во-Банка</b>
                    <span class="sub-label text-xs">Долг: <b class="color-amber">${debt.toLocaleString()} ₽</b></span>
                </div>
                <div class="p-2 my-2" style="background:#090e18; border-radius:8px;">
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label">Доступный лимит:</span>
                        <b class="color-green">${available.toLocaleString()} ₽</b>
                    </div>
                    <div class="sub-label color-red" style="font-size:9.5px;">Ежедневная ставка: <b>2.0%</b> в полночь на остаток долга.</div>
                </div>

                <div class="grid-2 mb-2">
                    <button onclick="AppBank.takeLoan(100000)" class="btn btn-dark btn-sm" ${available < 100000 ? 'disabled' : ''}>Взять 100k</button>
                    <button onclick="AppBank.takeLoan(300000)" class="btn btn-dark btn-sm" ${available < 300000 ? 'disabled' : ''}>Взять 300k</button>
                </div>
                
                <div class="sub-label text-xs mb-1 font-bold">Погашение кредита:</div>
                <div class="grid-3">
                    <button onclick="AppBank.repayLoan(25)" class="btn btn-cyan btn-sm" ${debt <= 0 ? 'disabled' : ''}>25%</button>
                    <button onclick="AppBank.repayLoan(50)" class="btn btn-cyan btn-sm" ${debt <= 0 ? 'disabled' : ''}>50%</button>
                    <button onclick="AppBank.repayLoan(100)" class="btn btn-green btn-sm" ${debt <= 0 ? 'disabled' : ''}>Всё</button>
                </div>
            </div>
        `;
    },

    // ========================================================
    // 7. ВКЛАДКА: ИПОТЕЧНЫЙ ЦЕНТР
    // ========================================================
    renderMortgageTab() {
        let mort = state.player?.mortgage;
        let mortgageCardHtml = "";

        if (!mort) {
            mortgageCardHtml = `
                <div class="sub-label mb-2" style="font-size:10px;">Купите элитную недвижимость в рассрочку с первоначальным взносом 20% и ежедневным платежом 5%.</div>
                <div class="space-y-2">
                    <div class="glass-card p-2 flex-between">
                        <div>
                            <b class="text-xs color-amber">🏢 Элитный Пентхаус ММДЦ</b>
                            <div class="sub-label" style="font-size:9.5px;">Цена: 150,000,000 ₽ | Пул: 8 мест</div>
                        </div>
                        <button onclick="AppBank.takeMortgage('penthouse', 150000000)" class="btn btn-amber btn-sm btn-auto">В ипотеку</button>
                    </div>
                    <div class="glass-card p-2 flex-between">
                        <div>
                            <b class="text-xs color-purple">🏰 Загородная Вилла с Ангаром</b>
                            <div class="sub-label" style="font-size:9.5px;">Цена: 480,000,000 ₽ | Пул: 18 мест</div>
                        </div>
                        <button onclick="AppBank.takeMortgage('villa', 480000000)" class="btn btn-purple btn-sm btn-auto">В ипотеку</button>
                    </div>
                </div>
            `;
        } else {
            mortgageCardHtml = `
                <div class="p-3 mb-2" style="background:#090e18; border-radius:10px; border:1px solid var(--amber);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber">Активная ипотека: ${mort.name}</b>
                        <span class="tag-badge bg-tag-amber">Платёж: 5%/д</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">Остаток долга: <b class="color-red">${mort.debtAmount.toLocaleString()} ₽</b></div>
                    <div class="grid-2">
                        <button onclick="AppBank.payMortgageInstallment()" class="btn btn-green btn-sm">Внести платёж</button>
                        <button onclick="AppBank.earlyCloseMortgage()" class="btn btn-cyan btn-sm">Закрыть досрочно</button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-2">
                    <b class="text-xs color-amber"><i class="fa-solid fa-house-chimney"></i> Ипотечный центр Во-Банка</b>
                    <span class="tag-badge bg-tag-amber">Рассрочка</span>
                </div>
                ${mortgageCardHtml}
            </div>
        `;
    },

    // ========================================================
    // ВСПОМОГАТЕЛЬНЫЕ ФИНАНСОВЫЕ ОПЕРАЦИИ
    // ========================================================
    buyStarsPack(starsAmount, rubCost) {
        let cash = state.player?.cash || 0;
        if (cash < rubCost) return showToast(`Не хватает рублей! Нужно ${rubCost.toLocaleString()} ₽.`);

        state.player.cash -= rubCost;
        state.player.stars = (state.player.stars || 0) + starsAmount;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Покупка ${starsAmount} ⭐ Stars`, rubCost, false);
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Успешно куплено +${starsAmount} ⭐ Stars!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    exchangeFuelForCash(fuelAmount) {
        let fuel = state.player?.fuel || 0;
        if (fuel < fuelAmount) return showToast("Не хватает топлива в баке!");

        state.player.fuel -= fuelAmount;
        let gain = fuelAmount * 2000;
        state.player.cash = (state.player.cash || 0) + gain;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Продажа ${fuelAmount} ⛽ бензина`, gain, true);
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Слито ${fuelAmount} ⛽ бензина. Получено +${gain.toLocaleString()} ₽!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    exchangeFuelForStars(fuelAmount, starsGain) {
        let fuel = state.player?.fuel || 0;
        if (fuel < fuelAmount) return showToast("Не хватает топлива в баке!");

        state.player.fuel -= fuelAmount;
        state.player.stars = (state.player.stars || 0) + starsGain;

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Обменяно ${fuelAmount} ⛽ на +${starsGain} ⭐ Stars!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    exchangeTicketsForCash(ticketsCount) {
        let tck = state.player?.expressTickets || 0;
        if (tck < ticketsCount) return showToast("Не хватает экспресс-талонов!");

        state.player.expressTickets -= ticketsCount;
        let gain = ticketsCount * 7500;
        state.player.cash = (state.player.cash || 0) + gain;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Обмен ${ticketsCount} 🎟️ талонов`, gain, true);
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Сдано ${ticketsCount} 🎟️ талонов за +${gain.toLocaleString()} ₽!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    exchangeTicketsForStars(ticketsCount, starsGain) {
        let tck = state.player?.expressTickets || 0;
        if (tck < ticketsCount) return showToast("Не хватает экспресс-талонов!");

        state.player.expressTickets -= ticketsCount;
        state.player.stars = (state.player.stars || 0) + starsGain;

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Обменяно ${ticketsCount} 🎟️ талонов на +${starsGain} ⭐ Stars!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    buySuperSpinTicketBank() {
        const costCash = 300000;
        const costStars = 30;

        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;

        if (cash < costCash) return showToast(`Не хватает рублей! Нужно ${costCash.toLocaleString()} ₽.`);
        if (stars < costStars) return showToast(`Не хватает звёзд! Нужно ${costStars} ⭐ Stars.`);

        state.player.cash -= costCash;
        state.player.stars -= costStars;
        state.player.superSpinTickets = (state.player.superSpinTickets || 0) + 1;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Покупка билета Супер Вилспина", costCash, false);
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast("Билет Супер Вилспина приобретён! Крутите в Клубе Фортуны 🎰.");
        this.render(document.getElementById('phoneAppContainer'));
    },

    depositSafe(amount) {
        let cash = state.player?.cash || 0;
        let toDeposit = (amount === 'all') ? cash : amount;

        if (toDeposit <= 0) return showToast("Нечего вносить в сейф!");
        if (cash < toDeposit) return showToast("Не хватает денег для пополнения!");

        state.player.cash -= toDeposit;
        state.player.safeDeposit = (state.player.safeDeposit || 0) + toDeposit;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Пополнение сейфа", toDeposit, false);
        }

        saveState();
        updateHeaderUI();
        playSound('tick');
        tgHaptic('light');
        showToast(`В сейф внесено +${toDeposit.toLocaleString()} ₽!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    withdrawSafe() {
        let safe = state.player?.safeDeposit || 0;
        if (safe <= 0) return showToast("Сейф пуст!");

        state.player.cash = (state.player.cash || 0) + safe;
        state.player.safeDeposit = 0;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Снятие из сейфа", safe, true);
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Из сейфа забрано +${safe.toLocaleString()} ₽!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    takeLoan(amt) {
        let maxLimit = state.player?.bankReputation?.loanLimit || 500000;
        let debt = state.player?.loanDebt || 0;

        if (debt + amt > maxLimit) {
            return showToast(`Превышен кредитный лимит (${maxLimit.toLocaleString()} ₽)!`);
        }

        state.player.cash = (state.player.cash || 0) + amt;
        state.player.loanDebt = debt + amt;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Кредитная выплата", amt, true);
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Кредит оформлен: +${amt.toLocaleString()} ₽!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    repayLoan(pct) {
        let debt = state.player?.loanDebt || 0;
        if (debt <= 0) return showToast("У вас нет задолженности по кредиту!");

        let amountToPay = Math.round(debt * (pct / 100));
        let cash = state.player?.cash || 0;

        if (cash < amountToPay) return showToast(`Не хватает денег! Нужно ${amountToPay.toLocaleString()} ₽.`);

        state.player.cash -= amountToPay;
        state.player.loanDebt = Math.max(0, debt - amountToPay);

        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Погашение кредита", amountToPay, false);
        }

        saveState();
        updateHeaderUI();
        playSound('tick');
        tgHaptic('light');
        showToast(`Погашено ${amountToPay.toLocaleString()} ₽ долга!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    takeMortgage(type, totalPrice) {
        let initialPayment = Math.round(totalPrice * 0.20);
        let cash = state.player?.cash || 0;
        if (cash < initialPayment) return showToast(`Нужен первоначальный взнос 20%: ${initialPayment.toLocaleString()} ₽!`);

        state.player.cash -= initialPayment;
        let houseName = type === 'penthouse' ? 'Элитный Пентхаус ММДЦ' : 'Загородная Вилла с Ангаром';
        let houseId = type === 'penthouse' ? 'penthouse' : 'villa';

        state.player.mortgage = {
            id: houseId,
            name: houseName,
            debtAmount: totalPrice - initialPayment,
            totalPrice: totalPrice
        };

        if (!state.player.ownedHouses) state.player.ownedHouses = [];
        if (!state.player.ownedHouses.includes(houseId)) state.player.ownedHouses.push(houseId);
        state.player.housingId = houseId;
        state.player.housingType = 'own';

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("ИПОТЕКА ОФОРМЛЕНА! 🏠", `Вы приобрели «${houseName}» в ипотеку!\nПервоначальный взнос оплачен. Не забывайте вносить ежедневные платежи.`, true);
        this.render(document.getElementById('phoneAppContainer'));
    },

    payMortgageInstallment() {
        let mort = state.player?.mortgage;
        if (!mort) return;

        let payment = Math.round(mort.debtAmount * 0.05);
        let cash = state.player?.cash || 0;
        if (cash < payment) return showToast(`Не хватает денег на платеж: ${payment.toLocaleString()} ₽!`);

        state.player.cash -= payment;
        mort.debtAmount -= payment;

        if (mort.debtAmount <= 0) {
            state.player.mortgage = null;
            openVerdictModal("ИПОТЕКА ПОЛНОСТЬЮ ВЫПЛАТИЛАСЬ! 🎉", "Поздравляем! Объект недвижимости полностью перешел в вашу единоличную собственность без обременений банка.", true);
        } else {
            showToast(`Платёж внесён (-${payment.toLocaleString()} ₽). Остаток долга снижен.`);
        }

        saveState();
        updateHeaderUI();
        this.render(document.getElementById('phoneAppContainer'));
    },

    earlyCloseMortgage() {
        let mort = state.player?.mortgage;
        if (!mort) return;

        let cash = state.player?.cash || 0;
        if (cash < mort.debtAmount) return showToast(`Нужно ${mort.debtAmount.toLocaleString()} ₽ для полного погашения!`);

        state.player.cash -= mort.debtAmount;
        state.player.mortgage = null;

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("ИПОТЕКА ЗАКРЫТА ДОСРОЧНО! 🍾", "Вы внесли оставшуюся сумму. Банк снял залог с недвижимости!", true);
        this.render(document.getElementById('phoneAppContainer'));
    },

    tradeCrypto(coin, action) {
        if (!state.player.crypto) state.player.crypto = { btc: 0, eth: 0, staked: [], prices: { btc: 9500000, eth: 340000 } };
        let price = state.player.crypto.prices[coin];

        if (action === 'buy') {
            let amount = coin === 'btc' ? 0.01 : 1.0;
            let cost = Math.round(price * amount);
            if ((state.player?.cash || 0) < cost) return showToast("Не хватает рублей для покупки крипты!");

            state.player.cash -= cost;
            state.player.crypto[coin] = (state.player.crypto[coin] || 0) + amount;

            if (typeof logBankTransaction === 'function') logBankTransaction(`Покупка ${coin.toUpperCase()}`, cost, false);
            playSound('win'); tgHaptic('success');
            showToast(`Куплено ${amount} ${coin.toUpperCase()}!`);
        } else {
            let amount = state.player.crypto[coin] || 0;
            if (amount <= 0) return showToast(`У вас нет ${coin.toUpperCase()} для продажи!`);

            let revenue = Math.round(amount * price);
            state.player.cash = (state.player.cash || 0) + revenue;
            state.player.crypto[coin] = 0;

            if (typeof logBankTransaction === 'function') logBankTransaction(`Продажа ${coin.toUpperCase()}`, revenue, true);
            playSound('win'); tgHaptic('success');
            showToast(`Продано за +${revenue.toLocaleString()} ₽!`);
        }

        saveState();
        updateHeaderUI();
        this.render(document.getElementById('phoneAppContainer'));
    }
};

window.AppBank = AppBank;
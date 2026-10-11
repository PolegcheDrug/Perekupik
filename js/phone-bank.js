// ========================================================
// js/phone-bank.js — ПРИЛОЖЕНИЕ «ВО-БАНК ОНЛАЙН» (v0.6.0)
// Счета, сейф, крипта, стейкинг, вклады, ипотека и кредиты.
// ========================================================

const AppBank = {
    subTab: 'accounts', // 'accounts', 'crypto', 'staking', 'deposits', 'credit', 'mortgage'

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
                <div class="phone-app-title"><i class="fa-solid fa-vault color-green mr-1"></i> Во-Банк Онлайн</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                
                <div class="grid-3 mb-2" style="grid-template-columns: repeat(3, 1fr); gap: 4px;">
                    <button onclick="AppBank.switchTab('accounts')" class="btn ${sub === 'accounts' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9.5px;">Счета</button>
                    <button onclick="AppBank.switchTab('crypto')" class="btn ${sub === 'crypto' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9.5px;">Крипта</button>
                    <button onclick="AppBank.switchTab('staking')" class="btn ${sub === 'staking' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9.5px;">Стейкинг</button>
                    <button onclick="AppBank.switchTab('deposits')" class="btn ${sub === 'deposits' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9.5px;">Вклады</button>
                    <button onclick="AppBank.switchTab('credit')" class="btn ${sub === 'credit' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9.5px;">Кредиты</button>
                    <button onclick="AppBank.switchTab('mortgage')" class="btn ${sub === 'mortgage' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9.5px;">Ипотека</button>
                </div>

                ${sub === 'accounts' ? this.renderAccountsTab(cash, safe) : ''}
                ${sub === 'crypto' ? this.renderCryptoTab(btcAmount, ethAmount, btcPrice, ethPrice) : ''}
                ${sub === 'staking' ? this.renderStakingTab(btcAmount, ethAmount, btcPrice, ethPrice) : ''}
                ${sub === 'deposits' ? this.renderDepositsTab() : ''}
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

    renderAccountsTab(cash, safe) {
        let historyHtml = "";
        let history = state.player?.bankHistory || [];
        if (history.length === 0) {
            historyHtml = "<div class='sub-label text-center py-2'>История операций пуста.</div>";
        } else {
            history.forEach(tx => {
                historyHtml += `
                <div class="p-2 flex-between mb-1" style="background:#090e18; border-radius:6px; border:1px solid rgba(255,255,255,0.04);">
                    <div>
                        <div class="text-xs">${tx.title}</div>
                        <div class="sub-label" style="font-size:8.5px;">${tx.time}</div>
                    </div>
                    <b class="text-xs ${tx.isIncome ? 'color-green' : 'color-red'}">${tx.isIncome ? '+' : '-'}${tx.amount.toLocaleString()} ₽</b>
                </div>`;
            });
        }

        return `
            <div class="bank-credit-card mb-2">
                <div class="flex-between mb-2">
                    <b style="font-size:14px; font-style:italic;">VO-BANK</b>
                    <i class="fa-brands fa-cc-visa" style="font-size:20px;"></i>
                </div>
                <div class="bank-chip"></div>
                <div class="bank-balance">${cash.toLocaleString()} ₽</div>
                <div class="bank-card-num">**** **** **** 7777</div>
                <div class="flex-between mt-2 text-xs" style="opacity:0.8;">
                    <span>${(state.player?.name || 'PEREKUP').toUpperCase()}</span>
                    <span>12/29</span>
                </div>
            </div>
            
            <div class="glass-card mb-2 p-2">
                <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                    <div class="flex-between">
                        <div>
                            <div class="text-xs font-bold color-amber"><i class="fa-solid fa-lock"></i> Неприкосновенный Сейф</div>
                            <div class="sub-label" style="font-size:9px;">Начисление +3% в полночь | Защита от рэкета</div>
                        </div>
                        <b class="color-amber text-xs">${safe.toLocaleString()} ₽</b>
                    </div>
                </div>

                <div class="grid-2 mb-2">
                    <button onclick="AppBank.depositSafe(50000)" class="btn btn-dark btn-sm">+50k в сейф</button>
                    <button onclick="AppBank.depositSafe(200000)" class="btn btn-dark btn-sm">+200k в сейф</button>
                </div>
                <button onclick="AppBank.withdrawSafe()" class="btn btn-green btn-sm w-full">Забрать всё из сейфа</button>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-cyan mb-2 block">📋 Последние транзакции:</b>
                <div class="space-y-1" style="max-height: 160px; overflow-y: auto;">
                    ${historyHtml}
                </div>
            </div>
        `;
    },

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
            <div class="sub-label text-center" style="font-size:9.5px;">💡 Курсы крипты обновляются каждую полночь (00:00).</div>
        `;
    },

    // --- НОВАЯ МЕХАНИКА: СТЕЙКИНГ КРИПТЫ ---
    renderStakingTab(btcAmount, ethAmount, btcPrice, ethPrice) {
        if (!state.player.crypto.staked) state.player.crypto.staked = [];
        let stakedList = state.player.crypto.staked;

        let stakedHtml = "";
        if (stakedList.length === 0) {
            stakedHtml = "<div class='sub-label text-center py-2'>У вас нет активных стейкинг-пулов.</div>";
        } else {
            stakedList.forEach((st, sIdx) => {
                let timeLeft = Math.max(0, st.daysLeft || 7);
                stakedHtml += `
                <div class="glass-card p-2 mb-2" style="border-color: rgba(0, 242, 254, 0.4);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan">Пул: ${st.coin.toUpperCase()} (${st.amount} монет)</b>
                        <span class="tag-badge bg-tag-cyan">Осталось: ${timeLeft} дн.</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9.5px;">Награда по истечении: <b class="color-green">+${(st.amount * st.rewardMultiplier).toFixed(4)} ${st.coin.toUpperCase()} (+25%)</b></div>
                    <button onclick="AppBank.claimStaking(${sIdx})" class="btn ${timeLeft <= 0 ? 'btn-green' : 'btn-dark'} btn-sm w-full" ${timeLeft > 0 ? 'disabled' : ''}>
                        ${timeLeft <= 0 ? 'Забрать награду!' : 'Заморозка активна (Ждите таймер)'}
                    </button>
                </div>`;
            });
        }

        return `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.1), #090e18);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-lock"></i> Крипто-Стейкинг (7 дней)</b>
                    <span class="tag-badge bg-tag-cyan">Доход +25%</span>
                </div>
                <p class="sub-label mb-2" style="font-size:10px;">Заморозьте Bitcoin или Ethereum на 7 реальных/игровых дней под фиксированный процент. Досрочный вывод невозможен.</p>
                
                <div class="grid-2 mb-2">
                    <button onclick="AppBank.startStaking('btc', 0.05)" class="btn btn-cyan btn-sm">Стейк 0.05 ₿</button>
                    <button onclick="AppBank.startStaking('eth', 1.5)" class="btn btn-purple btn-sm">Стейк 1.5 Ξ</button>
                </div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-cyan mb-2 block">🔒 Ваши замороженные активы:</b>
                ${stakedHtml}
            </div>
        `;
    },

    startStaking(coin, amount) {
        if (!state.player.crypto) state.player.crypto = { btc: 0, eth: 0, staked: [], prices: { btc: 9500000, eth: 340000 } };
        if (!state.player.crypto.staked) state.player.crypto.staked = [];

        if (coin === 'btc') {
            if (state.player.crypto.btc < amount) return showToast("Не хватает BTC на балансе криптокошелька!");
            state.player.crypto.btc -= amount;
        } else {
            if (state.player.crypto.eth < amount) return showToast("Не хватает ETH на балансе криптокошелька!");
            state.player.crypto.eth -= amount;
        }

        state.player.crypto.staked.push({
            coin: coin,
            amount: amount,
            rewardMultiplier: 0.25, // +25% сверху
            daysLeft: 7
        });

        saveState();
        playSound('win');
        tgHaptic('success');
        showToast(`Активы (${amount} ${coin.toUpperCase()}) успешно отправлены в стейкинг на 7 дней!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    claimStaking(idx) {
        let staked = state.player.crypto.staked;
        if (!staked || !staked[idx]) return;
        let st = staked[idx];

        if (st.daysLeft > 0) return showToast("Срок заморозки ещё не вышел!");

        let totalReturn = st.amount * (1 + st.rewardMultiplier);
        if (st.coin === 'btc') state.player.crypto.btc += totalReturn;
        if (st.coin === 'eth') state.player.crypto.eth += totalReturn;

        staked.splice(idx, 1);
        saveState();
        playSound('win');
        tgHaptic('success');
        showToast(`Стейкинг завершен! Начислено ${totalReturn.toFixed(4)} ${st.coin.toUpperCase()}!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    renderDepositsTab() {
        let depositsListHtml = "";
        let deposits = state.player?.bankDeposits || [];
        if (deposits.length === 0) {
            depositsListHtml = "<div class='sub-label text-center py-2'>У вас нет активных вкладов.</div>";
        } else {
            deposits.forEach((dep, dIdx) => {
                depositsListHtml += `
                <div class="glass-card p-2 flex-between mb-2">
                    <div>
                        <b class="text-xs color-green">${dep.name}</b>
                        <div class="sub-label" style="font-size:9.5px;">Сумма с процентами: <b class="color-green">${dep.amount.toLocaleString()} ₽</b> (+${(dep.dailyRate * 100).toFixed(0)}%/день)</div>
                    </div>
                    <button onclick="AppBank.closeDeposit(${dIdx})" class="btn btn-green btn-auto btn-sm">Забрать</button>
                </div>`;
            });
        }

        return `
            <div class="glass-card mb-2 p-2">
                <b class="text-xs color-green mb-1 block">📈 Срочные депозиты:</b>
                <div class="grid-2 mb-2">
                    <button onclick="AppBank.openDeposit(100000, 7, 0.025)" class="btn btn-cyan btn-sm">100k под 2.5%/д</button>
                    <button onclick="AppBank.openDeposit(500000, 14, 0.035)" class="btn btn-green btn-sm">500k под 3.5%/д</button>
                </div>
                <div class="text-xs font-bold mb-1">Активные депозиты:</div>
                ${depositsListHtml}
            </div>
        `;
    },

    renderCreditTab(debt) {
        return `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-red"><i class="fa-solid fa-handholding-dollar"></i> Кредитная линия</b>
                    <span class="sub-label text-xs">Долг: <b class="color-amber">${debt.toLocaleString()} ₽</b></span>
                </div>
                <div class="sub-label mb-2 color-red" style="font-size:9.5px;">Внимание: каждый день в 00:00 на сумму долга начисляется <b>2%</b>.</div>
                <div class="grid-2 mb-2">
                    <button onclick="AppBank.takeLoan(100000)" class="btn btn-dark btn-sm">Взять 100k</button>
                    <button onclick="AppBank.takeLoan(500000)" class="btn btn-dark btn-sm">Взять 500k</button>
                </div>
                <div class="grid-3">
                    <button onclick="AppBank.repayLoan(25)" class="btn btn-cyan btn-sm">25%</button>
                    <button onclick="AppBank.repayLoan(50)" class="btn btn-cyan btn-sm">50%</button>
                    <button onclick="AppBank.repayLoan(100)" class="btn btn-green btn-sm">Всё</button>
                </div>
            </div>
        `;
    },

    // --- НОВАЯ МЕХАНИКА: ИПОТЕКА НА НЕДВИЖИМОСТЬ ---
    renderMortgageTab() {
        if (!state.player.mortgage) {
            state.player.mortgage = null;
        }
        let mort = state.player.mortgage;

        let mortgageCardHtml = "";
        if (!mort) {
            mortgageCardHtml = `
                <div class="sub-label mb-2" style="font-size:10px;">Купите элитную недвижимость в рассрочку с ежедневным платежом 5% от остатка долга.</div>
                <div class="space-y-2">
                    <div class="glass-card p-2 flex-between">
                        <div>
                            <b class="text-xs color-amber">🏢 Элитный Пентхаус ММДЦ</b>
                            <div class="sub-label" style="font-size:9.5px;">Цена: 15,000,000 ₽ | Пулл: 30 мест</div>
                        </div>
                        <button onclick="AppBank.takeMortgage('penthouse', 15000000)" class="btn btn-amber btn-sm btn-auto">В ипотеку</button>
                    </div>
                    <div class="glass-card p-2 flex-between">
                        <div>
                            <b class="text-xs color-purple">🏰 Загородная Вилла с Ангаром</b>
                            <div class="sub-label" style="font-size:9.5px;">Цена: 35,000,000 ₽ | Пулл: 50 мест</div>
                        </div>
                        <button onclick="AppBank.takeMortgage('villa', 35000000)" class="btn btn-purple btn-sm btn-auto">В ипотеку</button>
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

    takeMortgage(type, totalPrice) {
        let initialPayment = Math.round(totalPrice * 0.20); // 20% первоначальный взнос
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

    depositSafe(amount) { depositToSafeAction(amount); this.render(document.getElementById('phoneAppContainer')); },
    withdrawSafe() { withdrawFromSafeAction(); this.render(document.getElementById('phoneAppContainer')); },
    openDeposit(amt, days, rate) { openBankDepositAction(amt, days, rate); this.render(document.getElementById('phoneAppContainer')); },
    closeDeposit(idx) { closeBankDepositAction(idx); this.render(document.getElementById('phoneAppContainer')); },
    takeLoan(amt) { takeLoan(amt); this.render(document.getElementById('phoneAppContainer')); },
    repayLoan(pct) { repayLoan(pct); this.render(document.getElementById('phoneAppContainer')); },
    
    tradeCrypto(coin, action) {
        if (action === 'buy') this.buyCrypto(coin);
        else this.sellCrypto(coin);
        this.render(document.getElementById('phoneAppContainer'));
    },

    buyCrypto(coin) {
        if (!state.player.crypto) state.player.crypto = { btc: 0, eth: 0, prices: { btc: 9500000, eth: 340000 } };
        let price = state.player.crypto.prices[coin];
        let cost = coin === 'btc' ? price * 0.01 : price * 1.0;
        
        if (state.player.cash < cost) return showToast("Не хватает средств для покупки крипты!");
        
        state.player.cash -= cost;
        if (coin === 'btc') state.player.crypto.btc += 0.01;
        if (coin === 'eth') state.player.crypto.eth += 1.0;
        
        logBankTransaction(`Покупка ${coin.toUpperCase()}`, cost, false);
        saveState();
        playSound('win'); tgHaptic('success');
    },

    sellCrypto(coin) {
        if (!state.player.crypto) state.player.crypto = { btc: 0, eth: 0, prices: { btc: 9500000, eth: 340000 } };
        let amount = state.player.crypto[coin];
        if (amount <= 0) return showToast(`У вас нет ${coin.toUpperCase()} для продажи!`);
        
        let price = state.player.crypto.prices[coin];
        let revenue = amount * price;
        
        state.player.cash += revenue;
        state.player.crypto[coin] = 0;
        
        logBankTransaction(`Продажа ${coin.toUpperCase()}`, revenue, true);
        saveState();
        playSound('win'); tgHaptic('success');
        showToast(`Продано за ${revenue.toLocaleString()} ₽!`);
    }
};

window.AppBank = AppBank;
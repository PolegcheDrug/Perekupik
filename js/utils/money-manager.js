// ========================================================
// js/utils/money-manager.js — ЕДИНЫЙ МЕНЕДЖЕР ДЕНЕГ (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ Заменяет прямые вызовы state.player.cash -= X.
//     Все изменения баланса идут через MoneyManager.
//
// Использование:
//   MoneyManager.earn(50000, 'Продажа авто');
//   MoneyManager.spend(25000, 'Покупка запчастей');
//   MoneyManager.canAfford(100000);   // → true/false
//   MoneyManager.getBalance();
//   MoneyManager.getStars();
// ========================================================

(function() {
    'use strict';

    const MoneyManager = {
        /**
         * Получить текущий баланс рублей.
         */
        getBalance() {
            return Number(window.state?.player?.cash) || 0;
        },

        /**
         * Получить текущий баланс звёзд.
         */
        getStars() {
            return Number(window.state?.player?.stars) || 0;
        },

        /**
         * Получить баланс звёзд.
         */
        getSuperSpinTickets() {
            return Number(window.state?.player?.superSpinTickets) || 0;
        },

        /**
         * Получить баланс связей.
         */
        getConnections() {
            return Number(window.state?.player?.connections) || 0;
        },

        /**
         * Проверить, хватает ли денег.
         * @param {number} amount — сумма
         * @param {string} [currency] — 'cash' | 'stars' | 'tickets' | 'connections'
         */
        canAfford(amount, currency = 'cash') {
            const needed = Number(amount) || 0;
            if (needed <= 0) return true;

            switch (currency) {
                case 'cash':        return this.getBalance() >= needed;
                case 'stars':       return this.getStars() >= needed;
                case 'tickets':     return this.getSuperSpinTickets() >= needed;
                case 'connections': return this.getConnections() >= needed;
                default:            return false;
            }
        },

        /**
         * Начислить деньги.
         * @param {number} amount — сумма (>0)
         * @param {string} source — описание (для bankHistory)
         * @param {Object} [options] — { silent: bool, currency: 'cash'|'stars'|'tickets'|'connections' }
         * @returns {boolean} — успех
         */
        earn(amount, source = 'Доход', options = {}) {
            const val = Math.round(Number(amount) || 0);
            if (val <= 0) {
                console.warn('[MoneyManager] earn: некорректная сумма', amount);
                return false;
            }

            if (!window.state) window.state = {};
            if (!window.state.player) window.state.player = {};

            const currency = options.currency || 'cash';

            if (currency === 'cash') {
                window.state.player.cash = this.getBalance() + val;
            } else if (currency === 'stars') {
                window.state.player.stars = this.getStars() + val;
            } else if (currency === 'tickets') {
                const max = window.state.player.maxExpressTickets || 25;
                window.state.player.expressTickets = Math.min(
                    max,
                    (Number(window.state.player.expressTickets) || 0) + val
                );
            } else if (currency === 'connections') {
                window.state.player.connections = this.getConnections() + val;
            }

            // Лог в банк
            if (!options.silent && currency === 'cash') {
                if (typeof window.logBankTransaction === 'function') {
                    window.logBankTransaction(source, val, true);
                }
            }

            // Событие
            if (window.EventBus) {
                window.EventBus.emit('money:changed', { amount: val, source, direction: 'in', currency });
                window.EventBus.emit('money:earned', { amount: val, source, currency });
            }

            return true;
        },

        /**
         * Списать деньги.
         * @param {number} amount — сумма (>0)
         * @param {string} source — описание
         * @param {Object} [options] — { silent: bool, currency, force: bool }
         * @returns {boolean} — успех
         */
        spend(amount, source = 'Расход', options = {}) {
            const val = Math.round(Number(amount) || 0);
            if (val <= 0) {
                console.warn('[MoneyManager] spend: некорректная сумма', amount);
                return false;
            }

            if (!window.state) window.state = {};
            if (!window.state.player) window.state.player = {};

            const currency = options.currency || 'cash';

            // Проверка достатка
            if (!options.force && !this.canAfford(val, currency)) {
                if (window.DevLogger) {
                    window.DevLogger.add('warn', `MoneyManager: недостаточно средств (${currency})`, { needed: val, source });
                }
                return false;
            }

            if (currency === 'cash') {
                window.state.player.cash = Math.max(0, this.getBalance() - val);
            } else if (currency === 'stars') {
                window.state.player.stars = Math.max(0, this.getStars() - val);
            } else if (currency === 'tickets') {
                window.state.player.expressTickets = Math.max(
                    0,
                    (Number(window.state.player.expressTickets) || 0) - val
                );
            } else if (currency === 'connections') {
                window.state.player.connections = Math.max(0, this.getConnections() - val);
            }

            // Лог в банк
            if (!options.silent && currency === 'cash') {
                if (typeof window.logBankTransaction === 'function') {
                    window.logBankTransaction(source, val, false);
                }
            }

            // Событие
            if (window.EventBus) {
                window.EventBus.emit('money:changed', { amount: val, source, direction: 'out', currency });
                window.EventBus.emit('money:spent', { amount: val, source, currency });
            }

            return true;
        },

        /**
         * Атомарная операция: проверить + списать.
         * @returns {boolean}
         */
        trySpend(amount, source = 'Расход', options = {}) {
            return this.spend(amount, source, options);
        },

        /**
         * Установить баланс напрямую (для DEV и загрузки сейва).
         */
        setBalance(amount, options = {}) {
            const val = Math.max(0, Math.round(Number(amount) || 0));
            if (!window.state) window.state = {};
            if (!window.state.player) window.state.player = {};
            window.state.player.cash = val;

            if (!options.silent) {
                if (window.EventBus) {
                    window.EventBus.emit('money:changed', {
                        amount: val,
                        source: options.source || 'setBalance',
                        direction: 'set',
                        currency: 'cash'
                    });
                }
            }
            return true;
        },

        /**
         * Безопасное форматирование суммы.
         */
        format(amount, currency = '₽') {
            const val = Number(amount) || 0;
            return `${val.toLocaleString('ru-RU')} ${currency}`;
        },

        /**
         * Проверка и списание с нескольких валют сразу.
         * Например, покупка темы за 150000 ₽ + 25 ⭐.
         */
        trySpendMulti(costs, source = 'Покупка') {
            // costs = { cash: 150000, stars: 25, tickets: 0 }
            const cash = Number(costs.cash) || 0;
            const stars = Number(costs.stars) || 0;
            const tickets = Number(costs.tickets) || 0;
            const conn = Number(costs.connections) || 0;

            if (!this.canAfford(cash, 'cash')) return { success: false, error: 'Не хватает рублей' };
            if (!this.canAfford(stars, 'stars')) return { success: false, error: 'Не хватает звёзд' };
            if (!this.canAfford(tickets, 'tickets')) return { success: false, error: 'Не хватает билетов' };
            if (!this.canAfford(conn, 'connections')) return { success: false, error: 'Не хватает связей' };

            if (cash > 0) this.spend(cash, source, { currency: 'cash' });
            if (stars > 0) this.spend(stars, source, { currency: 'stars' });
            if (tickets > 0) this.spend(tickets, source, { currency: 'tickets' });
            if (conn > 0) this.spend(conn, source, { currency: 'connections' });

            return { success: true };
        }
    };

    // Экспорт
    window.MoneyManager = MoneyManager;

    console.log('[💰 MoneyManager v1.0.0] Единый менеджер денег загружен');
})();
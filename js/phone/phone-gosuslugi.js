// ========================================================
// js/phone-gosuslugi.js — ПРИЛОЖЕНИЕ «ГОСУСЛУГИ / МРЭО» (v1.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.1.0 (SPRINT 2 — ФИКСЫ АУКЦИОНА):
//   - ФИКС E2: bidPlate не даёт перебить самого себя
//     (проверка lot.highestBidderId === myUid)
//   - ФИКС: при создании лота пишется highestBidderId (для проверки)
//   - ФИКС: _bidPending защищает от двойного клика
//   - Дополнительно: при выигрыше лота игрок получает госномер
//     через PlatesManager и в лог пишется его имя + id
// ⭐ v1.0.0 (ЕДИНЫЙ PLATESMANAGER):
//   - bidPlate → PlatesManager.addPlate
//   - Все остальные методы без изменений
// ========================================================

const AppGosuslugi = {
    subTab: 'fines', // 'fines', 'taxes', 'plates'
    _bidPending: false,

    render(container) {
        let sub = this.subTab;

        if (state.player.trafficFines === undefined) state.player.trafficFines = 0;
        if (state.player.taxDebt === undefined) state.player.taxDebt = 0;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-shield-halved color-cyan mr-1"></i> Госуслуги МРЭО</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="grid-3 mb-2" style="grid-template-columns: repeat(3, 1fr); gap: 4px;">
                    <button onclick="AppGosuslugi.switchTab('fines')" class="btn ${sub === 'fines' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9.5px;">Штрафы</button>
                    <button onclick="AppGosuslugi.switchTab('taxes')" class="btn ${sub === 'taxes' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9.5px;">Налоги</button>
                    <button onclick="AppGosuslugi.switchTab('plates')" class="btn ${sub === 'plates' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9.5px;">Аукцион</button>
                </div>

                ${sub === 'fines' ? this.renderFinesTab() : ''}
                ${sub === 'taxes' ? this.renderTaxesTab() : ''}
                ${sub === 'plates' ? this.renderPlatesAuctionTab() : ''}
            </div>
        `;
    },

    switchTab(tab) {
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.subTab = tab;
        this.render(document.getElementById('phoneAppContainer'));
    },

    renderFinesTab() {
        let fines = state.player?.trafficFines || 0;

        return `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(220, 38, 38, 0.15), #090e18);">
                <div class="font-bold text-xs color-red mb-1">НЕОПЛАЧЕННЫЕ ШТРАФЫ С КАМЕР ФВФД</div>
                <div class="price-val color-red my-1" style="font-size:26px;">${fines.toLocaleString()} ₽</div>
                <div class="sub-label" style="font-size:10px;">Фиксация превышений скорости и опасных манёвров на МКАД.</div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-cyan mb-2 block">⚖️ Исполнительные производства:</b>
                ${fines > 0 ? `
                    <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(220,38,38,0.3);">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-amber">Автоматические камеры ГИБДД</b>
                            <span class="tag-badge bg-tag-red">Взыскание</span>
                        </div>
                        <div class="sub-label mb-2" style="font-size:9.5px;">Сумма задолженности перед бюджетом: <b>${fines.toLocaleString()} ₽</b></div>
                        <button onclick="AppGosuslugi.payFines()" class="btn btn-green btn-sm w-full">Оплатить со скидкой 50% (${Math.round(fines * 0.5).toLocaleString()} ₽)</button>
                    </div>
                ` : `
                    <div class="sub-label text-center py-4">У вас нет неоплаченных штрафов. Вы аккуратный водитель!</div>
                `}
            </div>
        `;
    },

    payFines() {
        let fines = state.player?.trafficFines || 0;
        if (fines <= 0) return showToast("Штрафов нет!");

        let toPay = Math.round(fines * 0.5);
        let cash = state.player?.cash || 0;
        if (cash < toPay) return showToast(`Не хватает денег для оплаты: ${toPay.toLocaleString()} ₽!`);

        state.player.cash -= toPay;
        state.player.trafficFines = 0;

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast("Штрафы успешно оплачены через Госуслуги!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    renderTaxesTab() {
        let totalPowerTax = 0;
        if (state.garage) {
            state.garage.forEach(c => {
                let p = c.power || 100;
                if (p > 250) {
                    totalPowerTax += (p - 250) * 150;
                }
            });
        }
        state.player.taxDebt = (state.player.taxDebt || 0) + totalPowerTax;
        let tax = state.player.taxDebt;

        return `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(255, 179, 0, 0.15), #090e18);">
                <div class="font-bold text-xs color-amber mb-1">ТРАНСПОРТНЫЙ НАЛОГ НА МОЩНЫЕ АВТО</div>
                <div class="price-val color-amber my-1" style="font-size:26px;">${tax.toLocaleString()} ₽</div>
                <div class="sub-label" style="font-size:10px;">Налог на роскошь и спортивные моторы (>250 л.с.).</div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-cyan mb-2 block">🏛️ Налоговая задолженность:</b>
                ${tax > 0 ? `
                    <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,179,0,0.3);">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-amber">Федеральная налоговая служба</b>
                            <span class="tag-badge bg-tag-amber">К уплате</span>
                        </div>
                        <div class="sub-label mb-2" style="font-size:9.5px;">Начислено за мощные автомобили в автопарке: <b>${tax.toLocaleString()} ₽</b></div>
                        <button onclick="AppGosuslugi.payTaxes()" class="btn btn-green btn-sm w-full">Оплатить налог (${tax.toLocaleString()} ₽)</button>
                    </div>
                ` : `
                    <div class="sub-label text-center py-4">Все налоговые сборы полностью уплачены.</div>
                `}
            </div>
        `;
    },

    payTaxes() {
        let tax = state.player?.taxDebt || 0;
        if (tax <= 0) return showToast("Налогов к уплате нет!");

        let cash = state.player?.cash || 0;
        if (cash < tax) return showToast(`Не хватает денег для уплаты налога: ${tax.toLocaleString()} ₽!`);

        state.player.cash -= tax;
        state.player.taxDebt = 0;

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast("Транспортный налог успешно уплачен!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // АУКЦИОН ГОСНОМЕРОВ
    // ========================================================
    renderPlatesAuctionTab() {
        if (!state.officialPlateAuction || state.officialPlateAuction.length === 0) {
            state.officialPlateAuction = this._generateInitialAuctionLots();
        }

        const myUid = String(state.player?.uid || window.tgUserId || "");
        const myName = String(state.player?.name || "Вы");

        let html = "";
        state.officialPlateAuction.forEach((lot, lIdx) => {
            // ⭐ v1.1.0: проверяем, лидирует ли уже игрок
            const isPlayerLeading =
                (lot.highestBidderId && String(lot.highestBidderId) === myUid) ||
                (!lot.highestBidderId && String(lot.highestBidder || "") === myName && myName !== 'Государство' && myName !== '');

            const currentBid = Number(lot.currentBid) || 0;
            const lotId = lot.id || `auc_${lIdx}`;

            html += `
            <div class="glass-card mb-2 p-2" style="${isPlayerLeading ? 'border-color:var(--green); background:rgba(0,230,118,0.05);' : ''}">
                <div class="flex-between mb-1">
                    <span class="license-plate">${lot.plate} <div class="license-flag">RUS</div></span>
                    <span class="price-val text-xs color-green">${currentBid.toLocaleString()} ₽</span>
                </div>
                <div class="sub-label mb-2" style="font-size:9.5px;">
                    Лидер торгов:
                    ${isPlayerLeading
                        ? `<b class="color-green">⚡ ВЫ (${myName})</b>`
                        : `<b class="color-amber">${lot.highestBidder || 'Государство'}</b>`}
                </div>

                ${isPlayerLeading ? `
                    <div class="p-2 mb-2 text-center" style="background:rgba(0,230,118,0.1); border-radius:8px; border:1px solid rgba(0,230,118,0.3);">
                        <span class="sub-label color-green" style="font-size:9.5px;">✅ Вы уже лидируете на этом лоте</span>
                    </div>
                    <button class="btn btn-dark btn-sm w-full opacity-50" disabled>
                        <i class="fa-solid fa-crown color-amber"></i> Ваша текущая ставка
                    </button>
                ` : `
                    <div class="grid-2">
                        <button onclick="AppGosuslugi.bidPlate(${lIdx}, 50000)" class="btn btn-cyan btn-sm">
                            +50k к ставке
                        </button>
                        <button onclick="AppGosuslugi.bidPlate(${lIdx}, 150000)" class="btn btn-green btn-sm">
                            +150k к ставке
                        </button>
                    </div>
                `}
            </div>`;
        });

        return `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-2">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-gavel"></i> Официальный аукцион номеров МРЭО</b>
                    <span class="tag-badge bg-tag-cyan">Торги</span>
                </div>
                <div class="sub-label mb-2" style="font-size:9.5px;">
                    Официальные торги на редкие серии. Убедитесь, что вас не перебивают — свою же ставку перебить нельзя.
                </div>
                <div class="space-y-2">
                    ${html}
                </div>
            </div>
        `;
    },

    /**
     * ⭐ v1.1.0: генерация стартовых лотов с highestBidderId
     */
    _generateInitialAuctionLots() {
        return [
            { id: 'p_' + Date.now() + '_1', plate: 'А777АА 777', currentBid: 450000, highestBidder: 'Государство', highestBidderId: null },
            { id: 'p_' + Date.now() + '_2', plate: 'М001ММ 99',  currentBid: 750000, highestBidder: 'Государство', highestBidderId: null },
            { id: 'p_' + Date.now() + '_3', plate: 'В888ВВ 50',  currentBid: 300000, highestBidder: 'Государство', highestBidderId: null }
        ];
    },

    /**
     * ⭐ v1.1.0: ставка на лот с защитой от самоперебивания
     */
    bidPlate(lotIdx, raiseAmount) {
        // Защита от двойного клика
        if (this._bidPending) return;

        const lot = state.officialPlateAuction[lotIdx];
        if (!lot) return showToast("Лот не найден");

        const myUid = String(state.player?.uid || window.tgUserId || "");
        const myName = String(state.player?.name || "Вы");

        // ⭐ ФИКС E2: проверка "вы уже лидируете"
        const isPlayerLeading =
            (lot.highestBidderId && String(lot.highestBidderId) === myUid) ||
            (!lot.highestBidderId && String(lot.highestBidder || "") === myName && myName !== 'Государство' && myName !== '');

        if (isPlayerLeading) {
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('warning');
            return showToast("⚠️ Вы уже лидируете на этом лоте!");
        }

        // Проверка модуля номеров
        if (!window.PlatesManager) {
            return showToast("⚠️ Модуль номеров не загружен");
        }

        // Расчёт новой ставки
        const currentBid = Number(lot.currentBid) || 0;
        const newBid = currentBid + raiseAmount;
        const cash = state.player?.cash || 0;

        if (cash < newBid) {
            if (typeof playSound === 'function') playSound('error');
            return showToast(`Не хватает ₽: нужно ${newBid.toLocaleString()} ₽ (у вас ${cash.toLocaleString()} ₽)`);
        }

        this._bidPending = true;

        try {
            // Списываем деньги
            state.player.cash -= newBid;

            // Выдаём номер через PlatesManager
            const addRes = window.PlatesManager.addPlate(lot.plate, 'gosuslugi_auction', { silent: true });

            if (!addRes) {
                // Откат денег
                state.player.cash += newBid;
                return showToast("❌ Не удалось выиграть номер (ошибка менеджера)");
            }

            // Обновляем лот — теперь лидер это игрок
            lot.highestBidder = myName;
            lot.highestBidderId = myUid;
            lot.currentBid = newBid;

            // ⭐ v1.1.0: генерируем новый лот с новым номером вместо выигранного
            const newPlate = (typeof generateCoolPlate === 'function') ? generateCoolPlate() : "А777АА 77";
            state.officialPlateAuction[lotIdx] = {
                id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                plate: newPlate,
                currentBid: Math.floor(250000 + Math.random() * 400000),
                highestBidder: 'Государство',
                highestBidderId: null
            };

            saveState();
            updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

            // ⭐ v1.1.0: логируем транзакцию
            if (typeof logBankTransaction === 'function') {
                logBankTransaction(`Аукцион номеров МРЭО: ${lot.plate}`, newBid, false);
            }

            if (typeof openVerdictModal === 'function') {
                openVerdictModal(
                    "НОМЕР ВЫИГРАН НА АУКЦИОНЕ! 🏷️",
                    `Вы перебили ставку и официально закрепили за собой красивый знак <b>${lot.plate}</b>!\nСумма: ${newBid.toLocaleString()} ₽\nЗнак добавлен в инвентарь госномеров.`,
                    true,
                    newBid
                );
            }

            this.render(document.getElementById('phoneAppContainer'));

        } finally {
            this._bidPending = false;
        }
    }
};

window.AppGosuslugi = AppGosuslugi;

console.log('[🏛 phone-gosuslugi v1.1.0] ФИКС E2: запрет самоперебивания ставки + highestBidderId + _bidPending защита ✓');

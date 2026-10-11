// ========================================================
// js/phone-gosuslugi.js — ПРИЛОЖЕНИЕ «ГОСУСЛУГИ / МРЭО» (v0.6.0)
// Проверка и оплата штрафов с камер, транспортный налог
// на мощные авто и официальный аукцион блатных госномеров.
// ========================================================

const AppGosuslugi = {
    subTab: 'fines', // 'fines', 'taxes', 'plates'

    render(container) {
        let sub = this.subTab;

        // Инициализация данных, если их нет
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
        playSound('tick');
        tgHaptic('light');
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

        let toPay = Math.round(fines * 0.5); // Льготная оплата 50%
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
        // Расчет налога на основе мощности машин в гараже (все что > 250 л.с.)
        let totalPowerTax = 0;
        if (state.garage) {
            state.garage.forEach(c => {
                let p = c.power || 100;
                if (p > 250) {
                    totalPowerTax += (p - 250) * 150; // 150 рублей за каждую лошадь свыше 250 л.с. за цикл
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
                        <div class="sub-label mb-2" style="font-size:9.5px;">Начислено за мощные автомобили в вашем автопарке: <b>${tax.toLocaleString()} ₽</b></div>
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

    renderPlatesAuctionTab() {
        if (!state.officialPlateAuction) {
            state.officialPlateAuction = [
                { id: 'p_1', plate: 'А777АА 777', currentBid: 450000, highestBidder: 'Государство' },
                { id: 'p_2', plate: 'М001ММ 99', currentBid: 750000, highestBidder: 'Государство' },
                { id: 'p_3', plate: 'В888ВВ 50', currentBid: 300000, highestBidder: 'Государство' }
            ];
        }

        let html = "";
        state.officialPlateAuction.push = state.officialPlateAuction || [];
        state.officialPlateAuction.forEach((lot, lIdx) => {
            html += `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <span class="license-plate">${lot.plate} <div class="license-flag">RUS</div></span>
                    <span class="price-val text-xs color-green">${lot.currentBid.toLocaleString()} ₽</span>
                </div>
                <div class="sub-label mb-2" style="font-size:9.5px;">Лидер торгов: <b>${lot.highestBidder}</b></div>
                <div class="grid-2">
                    <button onclick="AppGosuslugi.bidPlate(${lIdx}, 50000)" class="btn btn-cyan btn-sm">+50k к ставке</button>
                    <button onclick="AppGosuslugi.bidPlate(${lIdx}, 150000)" class="btn btn-green btn-sm">+150k к ставке</button>
                </div>
            </div>`;
        });

        return `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-2">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-gavel"></i> Официальный аукцион номеров МРЭО</b>
                    <span class="tag-badge bg-tag-cyan">Торги</span>
                </div>
                <div class="space-y-2">
                    ${html}
                </div>
            </div>
        `;
    },

    bidPlate(lotIdx, raiseAmount) {
        let lot = state.officialPlateAuction[lotIdx];
        if (!lot) return;

        let newBid = lot.currentBid + raiseAmount;
        let cash = state.player?.cash || 0;
        if (cash < newBid) return showToast("Не хватает денег для такой ставки!");

        lot.currentBid = newBid;
        lot.highestBidder = state.player?.name || "Вы";

        // Если ставка перебита, сразу забираем номер в инвентарь (упрощенно для геймплея)
        state.player.cash -= newBid;
        if (!state.ownedPlates) state.ownedPlates = [];
        state.ownedPlates.push(lot.plate);

        // Заменяем лот на новый
        let newP = generateCoolPlate();
        state.officialPlateAuction[lotIdx] = {
            id: 'p_' + Date.now(),
            plate: newP,
            currentBid: Math.floor(250000 + Math.random() * 400000),
            highestBidder: 'Государство'
        };

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("НОМЕР ВЫИГРАН НА АУКЦИОНЕ! 🏷️", `Вы перебили ставку и официально закрепили за собой красивый знак ${lot.plate}!\nЗнак добавлен в инвентарь.`, true);
        this.render(document.getElementById('phoneAppContainer'));
    }
};

window.AppGosuslugi = AppGosuslugi;
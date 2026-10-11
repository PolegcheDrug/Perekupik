// ========================================================
// js/phone-darknet.js — ПРИЛОЖЕНИЕ «ДАРКНЕТ» (v0.6.0)
// Теневой портал Артура: покупка ворованных/контрактных 
// запчастей со скидкой, крыша ГИБДД и отмыв криминальных VIN.
// ========================================================

const AppDarknet = {
    subTab: 'services', // 'services', 'parts'

    render(container) {
        let sub = this.subTab;
        let conn = state.player?.connections || 0;
        let immunity = state.player?.policeImmunityDays || 0;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-user-secret color-purple mr-1"></i> Даркнет Портал</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="reshala-banner mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-purple">Теневые Связи: ${conn} 🤝</b>
                        <span class="tag-badge bg-tag-purple">Штаб Артура</span>
                    </div>
                    <div class="sub-label" style="font-size:10px;">
                        Анонимный доступ к серым услугам и контрактным деталям без лишних вопросов.
                    </div>
                </div>

                <div class="grid-2 mb-2">
                    <button onclick="AppDarknet.buyPack(1)" class="btn btn-purple btn-sm">1 Связь (200k)</button>
                    <button onclick="AppDarknet.buyPack(5)" class="btn btn-purple btn-sm">5 Связей (850k)</button>
                </div>

                <div class="grid-2 mb-2" style="grid-template-columns: repeat(2, 1fr); gap: 4px;">
                    <button onclick="AppDarknet.switchTab('services')" class="btn ${sub === 'services' ? 'btn-purple' : 'btn-dark'} btn-sm" style="font-size:9.5px;">Услуги</button>
                    <button onclick="AppDarknet.switchTab('parts')" class="btn ${sub === 'parts' ? 'btn-purple' : 'btn-dark'} btn-sm" style="font-size:9.5px;">Контрактные запчасти</button>
                </div>

                ${sub === 'services' ? this.renderServicesTab(immunity) : this.renderStolenPartsTab()}
            </div>
        `;
    },

    switchTab(tab) {
        playSound('tick');
        tgHaptic('light');
        this.subTab = tab;
        this.render(document.getElementById('phoneAppContainer'));
    },

    renderServicesTab(immunity) {
        let hasLic = !!state.player?.hasRacingLicense;

        return `
            <div class="reshala-deal-card mb-2 p-2">
                <div class="flex-between">
                    <b class="text-xs">🚨 Крыша ГИБДД (3 дня)</b>
                    <span class="tag-badge bg-tag-amber">${immunity > 0 ? immunity + ' дн.' : 'Иммунитет'}</span>
                </div>
                <p class="sub-label my-1" style="font-size:10px;">Защита от облав на заездах и штрафов за просроченный ДКП.</p>
                <button onclick="buyReshalaService('roof'); AppDarknet.render(document.getElementById('phoneAppContainer'));" class="btn btn-amber btn-sm w-full" ${immunity > 0 ? 'disabled' : ''}>
                    ${immunity > 0 ? 'Крыша активна' : 'Оформить (450k ₽ / 45 ⭐)'}
                </button>
            </div>

            <div class="reshala-deal-card mb-2 p-2">
                <div class="flex-between">
                    <b class="text-xs">🏎️ Гоночная Лицензия РАФ</b>
                    <span class="tag-badge bg-tag-cyan">402 метра</span>
                </div>
                <p class="sub-label my-1" style="font-size:10px;">Официальный регламентный допуск пилота к заездам.</p>
                <button onclick="buyReshalaService('license'); AppDarknet.render(document.getElementById('phoneAppContainer'));" class="btn btn-cyan btn-sm w-full" ${hasLic ? 'disabled' : ''}>
                    ${hasLic ? 'Оформлено ✓' : 'Оформить (120k ₽ / 15 ⭐)'}
                </button>
            </div>

            <div class="reshala-deal-card p-2">
                <div class="flex-between">
                    <b class="text-xs">🔏 Легализация криминала</b>
                    <span class="tag-badge bg-tag-cyan">Чистый VIN</span>
                </div>
                <p class="sub-label my-1" style="font-size:10px;">Снимает статус «В розыске» и аннулирование 12.5.1 с проблемного авто.</p>
                <button onclick="openLegalizeCarModal()" class="btn btn-dark btn-sm w-full">Выбрать авто (300k + 1 🤝)</button>
            </div>
        `;
    },

    // --- НОВАЯ МЕХАНИКА: КОНТРАКТНЫЕ (ВОРОВАННЫЕ) ЗАПЧАСТИ ---
    renderStolenPartsTab() {
        if (!state.player.darknetStolenParts) state.player.darknetStolenParts = [];

        const catalog = [
            { id: 'stolen_turbo', name: 'Stage 3 Big Turbo (Контракт)', type: 'turbo', cost: 85000, marketCost: 180000, risk: 40, perk: '+150 л.с. (Снят с распила в Владивостоке)' },
            { id: 'stolen_cage', name: 'Вварной каркас безопасности', type: 'cage', cost: 40000, marketCost: 85000, risk: 25, perk: 'Допуск в RDS GP' },
            { id: 'stolen_slicks', name: 'Комплект полусликов Toyo', type: 'slicks', cost: 20000, marketCost: 45000, risk: 15, perk: 'Максимальный зацеп на квотере' }
        ];

        let html = "";
        catalog.forEach((part, pIdx) => {
            html += `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-purple">${part.name}</b>
                    <span class="price-val text-xs color-green">${part.cost.toLocaleString()} ₽</span>
                </div>
                <div class="sub-label mb-1" style="font-size:9.5px;">${part.perk}</div>
                <div class="sub-label mb-2 color-red" style="font-size:8.5px;">⚠️ Риск конфискации на техкоме RDS: <b>${part.risk}%</b></div>
                
                <div class="flex-between">
                    <span class="sub-label" style="font-size:9px;">Экономия: ~${(part.marketCost - part.cost).toLocaleString()} ₽</span>
                    <button onclick="AppDarknet.buyStolenPart('${part.id}', ${part.cost}, ${part.risk})" class="btn btn-purple btn-sm btn-auto">Взять с серого рынка</button>
                </div>
            </div>`;
        });

        return `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(192, 132, 252, 0.15), #090e18);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-purple"><i class="fa-solid fa-triangle-exclamation"></i> Серый рынок деталей</b>
                    <span class="tag-badge bg-tag-red">Риск техкома</span>
                </div>
                <p class="sub-label mb-2" style="font-size:10px;">Детали с распилов по бросовым ценам. Если инспектор на техкоме RDS проверит номера агрегатов, машину арестуют!</p>
                ${html}
            </div>
        `;
    },

    buyPart(count) { buyReshalaPack(count === 1 ? 'pack1' : 'pack5'); this.render(document.getElementById('phoneAppContainer')); },
    buyPack(count) { buyReshalaPack(count === 1 ? 'pack1' : 'pack5'); this.render(document.getElementById('phoneAppContainer')); },

    buyStolenPart(partId, cost, riskPct) {
        let cash = state.player?.cash || 0;
        if (cash < cost) return showToast("Не хватает наличных на контрактную деталь!");

        let carIdx = state.player?.selectedStreetCarIndex || 0;
        if (!state.garage || !state.garage[carIdx]) return showToast("Сначала выберите автомобиль в гараже!");
        let car = state.garage[carIdx];

        state.player.cash -= cost;
        if (!car.tuning) car.tuning = {};

        if (partId === 'stolen_turbo') {
            car.tuning.chip = 3;
            car.power = (car.power || 100) + 150;
        } else if (partId === 'stolen_cage') {
            car.tuning.rollCage = true;
        } else if (partId === 'stolen_slicks') {
            car.tuning.dragSlicks = true;
        }

        car.hasStolenParts = true;
        car.stolenPartsRisk = (car.stolenPartsRisk || 0) + riskPct;

        if (typeof recalculateCarMarketValue === 'function') {
            recalculateCarMarketValue(car);
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("ДЕТАЛЬ УСТАНОВЛЕНА! 🏴‍☠️", `Контрактная деталь инсталлирована на «${car.name}».\nВнимание: на техкоме RDS есть риск проверки серийных номеров!`, true);
    }
};

window.AppDarknet = AppDarknet;
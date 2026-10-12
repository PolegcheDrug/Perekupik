// ========================================================
// js/phone-business.js — ПРИЛОЖЕНИЕ «УПРАВЛЕНИЕ БИЗНЕСОМ» (v0.6.0)
// Сеть предприятий, пассивный доход, кассы, апгрейды
// и автоматическая закупка сырья при достижении 5 уровня.
// ========================================================

const AppBusiness = {
    render(container) {
        if (!state.businesses || state.businesses.length === 0) {
            if (typeof BUSINESS_DATA !== 'undefined') state.businesses = JSON.parse(JSON.stringify(BUSINESS_DATA));
        }

        let lvl = state.player?.level || 1;
        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-briefcase color-green mr-1"></i> Сеть Предприятий</div>
                <button onclick="collectAllBusinessCash(); AppBusiness.render(document.getElementById('phoneAppContainer'));" class="btn btn-green btn-auto btn-sm">Вся касса</button>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.12), rgba(9, 14, 24, 0.98));">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-green"><i class="fa-solid fa-robot"></i> Авто-закупка сырья</b>
                        <span class="tag-badge bg-tag-green">Инновация</span>
                    </div>
                    <div class="sub-label" style="font-size:9.5px; line-height:1.4;">
                        💡 При достижении бизнесом <b>5 уровня</b>, управляющий автоматически закупает сырьё (за 15k ₽) при падении запасов ниже 10%.
                    </div>
                </div>
        `;

        const defaultIcons = {
            wash: 'fa-soap',
            shina: 'fa-compact-disc',
            sto: 'fa-screwdriver-wrench',
            detailing: 'fa-spray-can-sparkles',
            razborka: 'fa-car-burst',
            taxi: 'fa-taxi'
        };

        state.businesses.forEach((biz, idx) => {
            if (!biz) return;
            let isLocked = lvl < biz.minLevel;
            let isOwned = biz.level > 0;
            let cost = isOwned ? biz.cost * (biz.level + 1) : biz.cost;
            let saleToNpcPrice = isOwned ? Math.round(biz.cost * biz.level * 0.75) : 0;
            let imgSrc = biz.img || `assets/business/${biz.id}.jpg`;
            let fallbackIcon = defaultIcons[biz.id] || 'fa-briefcase';
            let fallbackSrc = biz.fallback || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80';

            let actionBlock = "";
            if (isLocked) {
                actionBlock = `<button class="btn btn-dark btn-sm w-full opacity-50" disabled>С ${biz.minLevel} уровня</button>`;
            } else if (!isOwned) {
                actionBlock = `<button onclick="upgradeBusiness(${idx}); AppBusiness.render(document.getElementById('phoneAppContainer'));" class="btn btn-cyan btn-sm w-full">Купить (${cost.toLocaleString()} ₽)</button>`;
            } else {
                actionBlock = `
                    <div class="grid-2 mb-1">
                        <button onclick="upgradeBusiness(${idx}); AppBusiness.render(document.getElementById('phoneAppContainer'));" class="btn btn-cyan btn-sm">Апгрейд (${cost.toLocaleString()} ₽)</button>
                        <button onclick="restockBusiness(${idx}); AppBusiness.render(document.getElementById('phoneAppContainer'));" class="btn btn-amber btn-sm">Сырьё (15k)</button>
                    </div>
                    <div class="grid-2">
                        <button onclick="AppBusiness.sellToNPC('${biz.id}', ${saleToNpcPrice})" class="btn btn-dark btn-sm">Продать (${(saleToNpcPrice/1000000).toFixed(2)}M)</button>
                        <button onclick="AppBusiness.listOnP2P('${biz.id}')" class="btn btn-purple btn-sm">На P2P биржу</button>
                    </div>
                `;
            }

            let autoBadge = (isOwned && biz.level >= 5) 
                ? `<span class="tag-badge bg-tag-green ml-1" style="font-size:8px;"><i class="fa-solid fa-robot"></i> АВТО</span>` 
                : "";

            let stockVal = biz.stock !== undefined ? biz.stock : 100;
            let storedCash = biz.stored || 0;

            html += `
                <div class="glass-card mb-3 p-2">
                    <div class="car-img-wrap mb-2" style="height:115px; position:relative;">
                        <img src="${imgSrc}" class="car-img" onerror="this.onerror=null; this.src='${fallbackSrc}';">
                        <div class="badge-tag badge-br">
                            <span class="tag-badge ${isOwned ? 'bg-tag-green' : 'bg-tag-amber'}">${isOwned ? 'Ур. ' + biz.level : 'С ' + biz.minLevel + ' ур'}</span>
                        </div>
                    </div>
                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs color-green">${biz.name}</b>
                            ${autoBadge}
                        </div>
                        <span class="price-val text-xs">${((biz.income || 0) * (biz.level || 0)).toLocaleString()} ₽/д</span>
                    </div>
                    <div class="sub-label mb-1" style="font-size:10px;">⭐ Перк: ${biz.perk || 'Пассивный доход'}</div>
                    ${isOwned ? `<div class="color-green text-xs font-bold mb-1">В кассе: ${storedCash.toLocaleString()} ₽</div>` : ''}
                    <div class="sub-label mb-1" style="font-size:9.5px;">Запас сырья: <b>${stockVal}%</b></div>
                    <div class="biz-progress-track mb-2">
                        <div class="biz-progress-fill ${stockVal > 20 ? 'fill-biz-stock' : 'risk-high'}" style="width:${stockVal}%;"></div>
                    </div>
                    ${actionBlock}
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    sellToNPC(bizId, refundAmount) {
        const biz = (state.businesses || []).find(b => b.id === bizId);
        if (!biz || biz.level <= 0) return;

        if (!confirm(`Продать «${biz.name}» инвестору за ${refundAmount.toLocaleString()} ₽?`)) return;

        state.player.cash = (state.player.cash || 0) + refundAmount;
        biz.level = 0;
        biz.stock = 0;
        biz.stored = 0;
        saveState();
        updateHeaderUI();
        playSound('win'); tgHaptic('success');
        showToast(`Бизнес продан инвестору (+${refundAmount.toLocaleString()} ₽)!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    listOnP2P(bizId) {
        const biz = (state.businesses || []).find(b => b.id === bizId);
        if (!biz || biz.level <= 0) return;

        let priceStr = prompt(`Введите цену продажи «${biz.name} (Ур. ${biz.level})» на P2P бирже:`, String(biz.cost * biz.level));
        if (!priceStr) return;
        let price = parseInt(priceStr);
        if (isNaN(price) || price <= 0) return showToast("Некорректная цена!");

        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        let lotId = "p2p_biz_" + Date.now();
        state.p2pMarketListings.unshift({
            id: lotId,
            seller: state.player?.name || "Перекуп",
            type: "business",
            name: `${biz.name} (Ур. ${biz.level})`,
            bizId: biz.id,
            bizLevel: biz.level,
            price: price,
            desc: `Готовая точка с доходностью ${((biz.income || 0) * biz.level).toLocaleString()} ₽/д.`
        });

        if (!state.myP2PListings) state.myP2PListings = [];
        state.myP2PListings.push(lotId);

        biz.level = 0;
        biz.stock = 0;
        saveState();
        showToast("Бизнес выставлен на онлайн P2P биржу Autodrot!");
        this.render(document.getElementById('phoneAppContainer'));
    }
};

window.AppBusiness = AppBusiness;
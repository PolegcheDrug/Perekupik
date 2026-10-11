// ========================================================
// js/phone-housing.js — ПРИЛОЖЕНИЕ «ЖИЛЬЁ & МАСТЕРСКИЕ» (v0.6.0)
// Аренда и покупка гаражей, боксов, вилл и пентхаусов,
// проверка технических возможностей (яма, свет, вода) и интерьер.
// ========================================================

const AppHousing = {
    render(container) {
        let curId = state.player?.housingId || 'trailer';
        let owned = state.player?.ownedHouses || [];
        let lvl = state.player?.level || 1;

        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-warehouse color-cyan mr-1"></i> Жильё & Мастерские</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.12), rgba(9,14,24,0.98));">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-circle-info"></i> База перекупа:</b>
                        <span class="tag-badge bg-tag-green">Тех. паспорт</span>
                    </div>
                    <div class="sub-label" style="font-size:9.5px; line-height:1.4;">
                        Слесарный тюнинг и корчевание требуют <b>смотровую яму</b>, а полировка кузова — <b>закрытый чистый бокс с водой</b>.
                    </div>
                </div>
        `;

        (typeof HOUSING_LIST !== 'undefined' ? HOUSING_LIST : []).forEach(h => {
            let isCur = curId === h.id;
            let isPurchased = owned.includes(h.id);
            let isLvlLocked = lvl < (h.minLevel || 1);
            let refundPrice = Math.round((h.buyPrice || 1000000) * 0.8);
            let imgSrc = h.img || `assets/houses/${h.id}.jpg`;
            let fallbackSrc = h.fallback || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80';
            let reqStars = h.reqStars || 5;

            let tuneBadge = h.canTune 
                ? `<span class="tag-badge bg-tag-green" style="font-size:8.5px;"><i class="fa-solid fa-screwdriver-wrench"></i> Тюнинг ✓</span>`
                : `<span class="tag-badge bg-tag-red" style="font-size:8.5px;"><i class="fa-solid fa-ban"></i> Тюнинг ✗</span>`;

            let detailBadge = h.canDetail
                ? `<span class="tag-badge bg-tag-cyan" style="font-size:8.5px;"><i class="fa-solid fa-wand-magic-sparkles"></i> Детейлинг ✓</span>`
                : `<span class="tag-badge bg-tag-amber" style="font-size:8.5px;"><i class="fa-solid fa-xmark"></i> Детейлинг ✗</span>`;

            let obdBadge = h.canOBDGarage
                ? `<span class="tag-badge bg-tag-green" style="font-size:8.5px;"><i class="fa-solid fa-laptop-code"></i> Launch ✓</span>`
                : `<span class="tag-badge bg-tag-red" style="font-size:8.5px;"><i class="fa-solid fa-xmark"></i> Launch ✗</span>`;

            let personalBadge = h.hasPersonalSlot
                ? `<span class="tag-badge bg-tag-purple" style="font-size:8.5px;"><i class="fa-solid fa-crown"></i> Личка ✓</span>`
                : `<span class="tag-badge bg-tag-red" style="font-size:8.5px;"><i class="fa-solid fa-xmark"></i> Без лички</span>`;

            let slotCost = h.slots > 0 ? `~${((h.buyPrice || 1000000) / h.slots / 1000).toFixed(0)}k ₽/место` : '—';

            let actionBtns = "";
            if (isLvlLocked) {
                actionBtns = `<button class="btn btn-dark btn-sm w-full opacity-50" disabled>С ${h.minLevel} уровня авторитета</button>`;
            } else if (isPurchased) {
                actionBtns = `
                    <div class="grid-2 mb-1">
                        <button onclick="openHomeInteriorModal('${h.id}')" class="btn btn-cyan btn-sm">🛋️ Интерьер</button>
                        ${isCur ? '<button class="btn btn-dark btn-sm opacity-50" disabled>Текущая база</button>' : `<button onclick="moveIntoHousing('${h.id}'); AppHousing.render(document.getElementById('phoneAppContainer'));" class="btn btn-green btn-sm">Переехать</button>`}
                    </div>
                    <div class="grid-2">
                        <button onclick="AppHousing.sellToNPC('${h.id}', ${refundPrice})" class="btn btn-dark btn-sm">Продать (${(refundPrice / 1000000).toFixed(1)}M)</button>
                        <button onclick="AppHousing.listOnP2P('${h.id}')" class="btn btn-purple btn-sm">На P2P биржу</button>
                    </div>
                `;
            } else {
                actionBtns = `
                    <div class="grid-2">
                        <button onclick="rentHousing('${h.id}'); AppHousing.render(document.getElementById('phoneAppContainer'));" class="btn btn-cyan btn-sm">Аренда (${(h.rent || 2000).toLocaleString()} ₽/д)</button>
                        <button onclick="buyHousingProperty('${h.id}'); AppHousing.render(document.getElementById('phoneAppContainer'));" class="btn btn-amber btn-sm">Купить (${(h.buyPrice / 1000000).toFixed(1)}M + ${reqStars} ⭐)</button>
                    </div>
                `;
            }

            html += `
                <div class="glass-card mb-3 p-2 ${isCur ? 'personal-car-card' : ''}">
                    <div class="car-img-wrap mb-2" style="height:125px; overflow:hidden; border-radius:10px;">
                        <img src="${imgSrc}" class="car-img" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='${fallbackSrc}';">
                        <div class="badge-tag" style="position:absolute; bottom:8px; right:8px; z-index:10;">
                            <span class="tag-badge ${isPurchased ? 'bg-tag-green' : (isCur ? 'bg-tag-cyan' : 'bg-tag-amber')}">
                                ${isPurchased ? 'Собственность' : (isCur ? 'Арендовано' : 'Доступно')}
                            </span>
                        </div>
                        <div class="badge-tag" style="position:absolute; top:8px; left:8px; right:auto; z-index:10;">
                            <span class="tag-badge bg-tag-cyan">${h.typeLabel || 'Объект'}</span>
                        </div>
                    </div>
                    
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan">${h.name}</b>
                        <span class="color-green font-bold text-xs">+${h.slots} мест гаража</span>
                    </div>

                    <div class="car-mods-badges-container my-1">
                        ${tuneBadge}
                        ${detailBadge}
                        ${obdBadge}
                        ${personalBadge}
                    </div>

                    <div class="sub-label mb-2" style="font-size:9.5px; line-height:1.35;">${h.desc || ''}</div>
                    
                    <div class="p-1 mb-2" style="background:#090e18; border-radius:6px; font-size:9.5px;">
                        <div class="color-amber font-bold mb-1">⭐ Перк: ${h.perk || 'Стандарт'}</div>
                        <div class="flex-between sub-label">
                            <span>Уют: <b class="${(h.moodBonus || 0) >= 0 ? 'color-green' : 'color-red'}">${(h.moodBonus || 0) >= 0 ? '+' : ''}${h.moodBonus || 0}% куража/д</b></span>
                            <span>Место: <b class="color-cyan">${slotCost}</b></span>
                        </div>
                    </div>

                    ${actionBtns}
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    sellToNPC(hId, refundAmount) {
        if (!confirm(`Продать недвижимость агентству за ${refundAmount.toLocaleString()} ₽?`)) return;

        state.player.cash = (state.player.cash || 0) + refundAmount;
        state.player.ownedHouses = (state.player.ownedHouses || []).filter(id => id !== hId);

        if (state.player.housingId === hId) {
            state.player.housingId = 'trailer';
            state.player.housingType = 'rent';
        }

        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        playSound('win'); tgHaptic('success');
        showToast(`Недвижимость продана риелторам (+${refundAmount.toLocaleString()} ₽)!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    listOnP2P(hId) {
        const h = (typeof HOUSING_LIST !== 'undefined' ? HOUSING_LIST : []).find(item => item.id === hId);
        if (!h) return;

        let priceStr = prompt(`Введите цену продажи «${h.name}» на P2P бирже:`, String(h.buyPrice));
        if (!priceStr) return;
        let price = parseInt(priceStr);
        if (isNaN(price) || price <= 0) return showToast("Некорректная цена!");

        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        let lotId = "p2p_house_" + Date.now();
        state.p2pMarketListings.unshift({
            id: lotId,
            seller: state.player?.name || "Перекуп",
            type: "housing",
            name: h.name,
            houseId: h.id,
            price: price,
            desc: `Недвижимость в собственности. Гараж на +${h.slots} мест.`
        });

        if (!state.myP2PListings) state.myP2PListings = [];
        state.myP2PListings.push(lotId);

        state.player.ownedHouses = (state.player.ownedHouses || []).filter(id => id !== hId);
        if (state.player.housingId === hId) {
            state.player.housingId = 'trailer';
            state.player.housingType = 'rent';
        }

        saveState();
        if (typeof renderGarage === 'function') renderGarage();
        showToast("Недвижимость выставлена на онлайн P2P биржу Autodrot!");
        this.render(document.getElementById('phoneAppContainer'));
    }
};

window.AppHousing = AppHousing;
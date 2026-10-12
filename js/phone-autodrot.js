// ========================================================
// js/phone-autodrot.js — ПРИЛОЖЕНИЕ «AUTODROT» (v0.6.0)
// Онлайн P2P биржа (авто, номера, бизнес, жильё), чат перекупов,
// срочный выкуп и система отзывов / рейтинга профиля.
// ========================================================

const AppAutodrot = {
    subTab: 'market', // 'market', 'chat', 'hotdeals', 'reputation'
    p2pFilter: 'cars',

    render(container) {
        let sub = this.subTab;
        if (!state.player.p2pReputation) {
            state.player.p2pReputation = { rating: 5.0, reviewsCount: 0, badReviews: 0, reviewsLog: [] };
        }

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-bolt color-cyan mr-1"></i> Autodrot P2P</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 4px;">
                    <button onclick="AppAutodrot.switchTab('market')" class="btn ${sub === 'market' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9.5px;">Биржа</button>
                    <button onclick="AppAutodrot.switchTab('chat')" class="btn ${sub === 'chat' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9.5px;">Чат</button>
                    <button onclick="AppAutodrot.switchTab('hotdeals')" class="btn ${sub === 'hotdeals' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9.5px;">Выкуп</button>
                    <button onclick="AppAutodrot.switchTab('reputation')" class="btn ${sub === 'reputation' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9.5px;">Рейтинг</button>
                </div>
                <div id="autodrotScreenContent"></div>
            </div>
        `;
        this.renderSubScreen();
    },

    switchTab(tab) {
        playSound('tick');
        tgHaptic('light');
        this.subTab = tab;
        this.render(document.getElementById('phoneAppContainer'));
    },

    setFilter(filter) {
        this.p2pFilter = filter;
        this.renderSubScreen();
    },

    renderSubScreen() {
        const content = document.getElementById('autodrotScreenContent');
        if (!content) return;

        if (this.subTab === 'market') {
            let f = this.p2pFilter || 'cars';
            content.innerHTML = `
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-green"><i class="fa-solid fa-handshake"></i> Онлайн P2P торговля</b>
                        <button onclick="openCreateListingModal()" class="btn btn-green btn-auto btn-sm">+ Продать лот</button>
                    </div>
                    <div class="sub-label" style="font-size:10px;">Продавайте свои авто, номера, бизнес и недвижимость другим дельцам.</div>
                </div>
                <div class="grid-4 mb-2">
                    <button onclick="AppAutodrot.setFilter('cars')" class="btn ${f === 'cars' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9.5px;">🚗 Авто</button>
                    <button onclick="AppAutodrot.setFilter('plates')" class="btn ${f === 'plates' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9.5px;">🏷 Номера</button>
                    <button onclick="AppAutodrot.setFilter('business')" class="btn ${f === 'business' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9.5px;">💼 Бизнес</button>
                    <button onclick="AppAutodrot.setFilter('housing')" class="btn ${f === 'housing' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9.5px;">🏠 Жильё</button>
                </div>
                <div id="p2pItemsList"></div>
            `;
            this.renderP2PListingsFiltered();
        } else if (this.subTab === 'chat') {
            content.innerHTML = `
                <div class="live-chat-card mb-2 p-2">
                    <div class="flex-between mb-2">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-satellite-dish"></i> Эфир перекупов города</b>
                        <span class="tag-badge bg-tag-cyan">Live</span>
                    </div>
                    <div id="lifeChatFeed" class="chat-messages-container" style="max-height: 230px; overflow-y: auto;"></div>
                    <div class="chat-compose-box mt-2">
                        <input type="text" id="feedMessageInput" class="chat-input" placeholder="Написать в Autodrot..." maxlength="100">
                        <button onclick="sendChatMessageFromInput()" class="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
                    </div>
                </div>
            `;
            if (typeof renderLifeChat === 'function') renderLifeChat();
        } else if (this.subTab === 'hotdeals') {
            content.innerHTML = `
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber"><i class="fa-solid fa-fire"></i> Срочный выкуп с рук</b>
                        <span class="tag-badge bg-tag-amber">Дисконт -35%</span>
                    </div>
                    <p class="sub-label mb-2" style="font-size:10px;">Владельцам срочно нужны наличные! Успейте забрать лот до истечения таймера.</p>
                </div>
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs">Toyota Mark II JZX90 (Срочно)</b>
                        <span class="tag-badge bg-tag-red">Осталось: 45с</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">Цена продавца: <b class="color-green">290,000 ₽</b> (Рыночная оценка: 490,000 ₽)</div>
                    <button onclick="AppAutodrot.interceptHotDeal()" class="btn btn-amber btn-sm w-full">Перехватить сделку ⚡</button>
                </div>
            `;
        } else if (this.subTab === 'reputation') {
            this.renderReputationScreen(content);
        }
    },

    interceptHotDeal() {
        let cash = state.player?.cash || 0;
        let cost = 290000;
        if (cash < cost) return showToast("Не хватает 290,000 ₽ на срочный выкуп!");

        let maxSlots = getTotalGarageSlots();
        let curSlots = state.garage ? state.garage.length : 0;
        if (curSlots >= maxSlots) return showToast("Гараж переполнен! Освободите бокс.");

        state.player.cash -= cost;
        let car = {
            id: "hot_mark2_" + Date.now(),
            name: "Toyota Mark II JZX90",
            power: 180,
            type: "economy",
            drivetrain: "rwd",
            basePrice: 490000,
            price: cost,
            baseMarketValue: 490000,
            marketValue: 490000,
            img: "assets/cars/economy/mark2.jpg",
            fallback: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80",
            plate: generateNormalPlate(),
            isStolen: false,
            condition: 75,
            wear: { engine: 80, transmission: 75 },
            tuning: { chip: 0, weldedDiff: false, steeringAngle: false, risk1251: 0 },
            purchaseCost: cost,
            ownershipDays: 0,
            engineTemp: 90,
            tireWear: 85
        };

        if (typeof recalculateCarMarketValue === 'function') {
            recalculateCarMarketValue(car);
        }

        if (!state.garage) state.garage = [];
        state.garage.push(car);

        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("СРОЧНЫЙ ВЫКУП! 🔥", `Вы успели перехватить «${car.name}» за ${cost.toLocaleString()} ₽!\nМашина доставлена в гараж.`, true);
        this.renderSubScreen();
    },

    renderReputationScreen(content) {
        if (!state.player.p2pReputation) {
            state.player.p2pReputation = { rating: 5.0, reviewsCount: 0, badReviews: 0, reviewsLog: [] };
        }
        let rep = state.player.p2pReputation;

        let logHtml = "";
        let logs = rep.reviewsLog || [];
        if (logs.length === 0) {
            logHtml = "<div class='sub-label text-center py-3'>У вас пока нет отзывов. Продавайте машины клиентам, чтобы заработать репутацию!</div>";
        } else {
            logs.forEach(rev => {
                let isGood = rev.stars >= 4;
                logHtml += `
                <div class="glass-card p-2 mb-2" style="border-left: 3px solid ${isGood ? 'var(--green)' : 'var(--red)'};">
                    <div class="flex-between mb-1">
                        <b class="text-xs">${rev.buyerName}</b>
                        <span class="color-amber">${'⭐'.repeat(rev.stars)}</span>
                    </div>
                    <div class="sub-label" style="font-size:9.5px;">«${rev.text}»</div>
                </div>`;
            });
        }

        let penaltyInfo = rep.rating < 4.0 
            ? `<div class="p-2 mb-2" style="background:rgba(220,38,38,0.15); border:1px solid var(--red); border-radius:8px; font-size:9.5px; color:var(--red);">⚠️ <b>Низкий рейтинг!</b> Покупатели на площадке и бирже торгуются агрессивнее. Продавайте честные машины без скрутки пробега, чтобы поднять оценку.</div>`
            : `<div class="p-2 mb-2" style="background:rgba(0,230,118,0.1); border:1px solid rgba(0,230,118,0.3); border-radius:8px; font-size:9.5px; color:var(--green);">✓ <b>Отличная репутация!</b> Клиенты безоговорочно доверяют вашему автосалону.</div>`;

        content.innerHTML = `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.15), #090e18);">
                <div class="font-bold text-xs color-cyan mb-1">РЕЙТИНГ ПРОФИЛЯ ПЕРЕКУПА</div>
                <div class="price-val color-amber my-1" style="font-size:28px;">⭐ ${rep.rating.toFixed(1)} / 5.0</div>
                <div class="sub-label" style="font-size:10px;">Всего сделок с отзывами: <b>${rep.reviewsCount}</b> (Негативных: <b class="color-red">${rep.badReviews}</b>)</div>
            </div>
            ${penaltyInfo}
            <div class="glass-card p-2">
                <b class="text-xs color-cyan mb-2 block">💬 Книга отзывов покупателей:</b>
                <div class="space-y-1" style="max-height: 200px; overflow-y: auto;">
                    ${logHtml}
                </div>
            </div>
        `;
    },

    triggerBuyerReview(car) {
        if (!state.player.p2pReputation) {
            state.player.p2pReputation = { rating: 5.0, reviewsCount: 0, badReviews: 0, reviewsLog: [] };
        }
        let rep = state.player.p2pReputation;
        let isCheated = car.rolledOdometer || car.hasAdditive || (car.hiddenDefect && !car.repaired);

        let stars = 5;
        let reviewText = "Отличная машина! Сел и поехал, продавцу респект.";
        let buyerNames = ["Алексей Д.", "Максим К.", "Артур М.", "Илья С.", "Денис В.", "Сергей Т."];
        let bName = buyerNames[Math.floor(Math.random() * buyerNames.length)];

        if (isCheated && Math.random() < 0.75) {
            stars = Math.floor(1 + Math.random() * 2);
            rep.badReviews++;
            const badComments = [
                "Обманщик! Скрутил пробег, через 10 км застучал мотор!",
                "Залил присадку в масло, чтобы скрыть стук. Не советую этого перекупа!",
                "Машина оказалась битая в круг, хотя в объявлении было 'не бита не крашена'."
            ];
            reviewText = badComments[Math.floor(Math.random() * badComments.length)];
        } else if (car.condition > 85) {
            stars = 5;
            reviewText = "Состояние идеальное, сделка прошла быстро. Рекомендую!";
        } else {
            stars = 4;
            reviewText = "Нормальная тачка за свои деньги, спасибо.";
        }

        rep.reviewsCount++;
        let totalScore = (rep.rating * (rep.reviewsCount - 1)) + stars;
        rep.rating = Math.max(1.0, Math.min(5.0, totalScore / rep.reviewsCount));

        if (!rep.reviewsLog) rep.reviewsLog = [];
        rep.reviewsLog.unshift({ buyerName: bName, stars: stars, text: reviewText });
        if (rep.reviewsLog.length > 15) rep.reviewsLog.pop();

        saveState();
        if (stars <= 2) {
            showToast(`⚠️ Покупатель оставил негативный отзыв (${stars}⭐)! Рейтинг упал.`);
        }
    },

    renderP2PListingsFiltered() {
        const list = document.getElementById('p2pItemsList');
        if (!list) return;

        let filter = this.p2pFilter || 'cars';
        if (!state.p2pMarketListings) state.p2pMarketListings = [];

        let filtered = state.p2pMarketListings.filter(item => item.type === filter || (filter === 'cars' && item.type === 'car') || (filter === 'plates' && item.type === 'plate'));

        if (filtered.length === 0) {
            list.innerHTML = "<div class='glass-card text-center sub-label py-6'>В этой категории биржи пока нет лотов.</div>";
            return;
        }

        let html = "";
        filtered.forEach(item => {
            let isMy = (state.myP2PListings && state.myP2PListings.includes(item.id));
            let btnAction = isMy 
                ? `<button onclick="cancelP2PListing('${item.id}'); AppAutodrot.renderSubScreen();" class="btn btn-danger btn-auto btn-sm">Снять с продажи</button>`
                : `<button onclick="AppAutodrot.buyP2PLot('${item.id}')" class="btn btn-green btn-auto btn-sm">Купить (${item.price.toLocaleString()} ₽)</button>`;

            html += `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan">${item.name}</b>
                    <span class="price-val text-xs color-green">${item.price.toLocaleString()} ₽</span>
                </div>
                <div class="sub-label mb-2" style="font-size:10px;">Продавец: <b>${item.seller}</b> ${item.desc ? '• ' + item.desc : ''}</div>
                <div class="text-right">${btnAction}</div>
            </div>`;
        });
        list.innerHTML = html;
    },

    buyP2PLot(listingId) {
        const idx = (state.p2pMarketListings || []).findIndex(l => l.id === listingId);
        if (idx === -1) return;
        const lot = state.p2pMarketListings[idx];

        let cash = state.player?.cash || 0;
        if (cash < lot.price) return showToast("Не хватает денег для выкупа лота!");

        if (lot.type === 'business') {
            state.player.cash -= lot.price;
            let targetBiz = (state.businesses || []).find(b => b.id === lot.bizId);
            if (targetBiz) {
                targetBiz.level = Math.max(targetBiz.level || 0, lot.bizLevel || 1);
                targetBiz.stock = 100;
            }
            showToast(`Вы выкупили готовый бизнес «${lot.name}» с P2P биржи!`);
        } else if (lot.type === 'housing') {
            state.player.cash -= lot.price;
            if (!state.player.ownedHouses) state.player.ownedHouses = [];
            if (!state.player.ownedHouses.includes(lot.houseId)) state.player.ownedHouses.push(lot.houseId);
            state.player.housingId = lot.houseId;
            state.player.housingType = 'own';
            showToast(`Вы выкупили недвижимость «${lot.name}» с P2P биржи!`);
        } else if (typeof buyP2PListing === 'function') {
            buyP2PListing(listingId);
            return;
        }

        state.p2pMarketListings.splice(idx, 1);
        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        playSound('win');
        tgHaptic('success');
        this.renderSubScreen();
    }
};

window.AppAutodrot = AppAutodrot;
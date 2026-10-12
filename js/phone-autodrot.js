// ========================================================
// js/phone-autodrot.js — ПРИЛОЖЕНИЕ «AUTODROT» (v0.6.7)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Единый маркетплейс перекупа: онлайн P2P биржа (авто, номера,
// готовый бизнес, жильё), чёрный рынок номеров, горячий выкуп,
// городской эфир перекупов и система репутации/отзывов.
// ========================================================

const AppAutodrot = {
    subTab: 'market', // 'market', 'blackmarket', 'hotdeals', 'chat', 'reputation'
    p2pFilter: 'cars', // 'cars', 'plates', 'business', 'housing'

    render(container) {
        let sub = this.subTab;
        if (!state.player.p2pReputation) {
            state.player.p2pReputation = { rating: 5.0, reviewsCount: 0, badReviews: 0, reviewsLog: [] };
        }

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-bolt color-cyan mr-1"></i> Autodrot Marketplace</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <!-- ВЕРХНЕЕ МЕНЮ РАЗДЕЛОВ АВТОДРОТА -->
                <div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 3px;">
                    <button onclick="AppAutodrot.switchTab('market')" class="btn ${sub === 'market' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9px;">
                        <i class="fa-solid fa-handshake"></i> Биржа
                    </button>
                    <button onclick="AppAutodrot.switchTab('blackmarket')" class="btn ${sub === 'blackmarket' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9px;">
                        <i class="fa-solid fa-gem"></i> Номера
                    </button>
                    <button onclick="AppAutodrot.switchTab('hotdeals')" class="btn ${sub === 'hotdeals' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9px;">
                        <i class="fa-solid fa-fire"></i> Выкуп
                    </button>
                    <button onclick="AppAutodrot.switchTab('reputation')" class="btn ${sub === 'reputation' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:9px;">
                        <i class="fa-solid fa-star"></i> Отзывы
                    </button>
                </div>

                <div id="autodrotScreenContent"></div>
            </div>
        `;
        this.renderSubScreen();
    },

    switchTab(tab) {
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.subTab = tab;
        this.render(document.getElementById('phoneAppContainer'));
    },

    setFilter(filter) {
        this.p2pFilter = filter;
        if (typeof playSound === 'function') playSound('tick');
        this.renderSubScreen();
    },

    renderSubScreen() {
        const content = document.getElementById('autodrotScreenContent');
        if (!content) return;

        // 1. P2P БИРЖА
        if (this.subTab === 'market') {
            let f = this.p2pFilter || 'cars';
            content.innerHTML = `
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs color-green"><i class="fa-solid fa-handshake"></i> Онлайн P2P Торговля</b>
                            <div class="sub-label" style="font-size:9.5px;">Сделки между перекупами без комиссий и посредников</div>
                        </div>
                        <button onclick="openCreateListingModal()" class="btn btn-green btn-auto btn-sm" style="font-size:9.5px;">+ Продать лот</button>
                    </div>
                </div>

                <!-- ФИЛЬТРЫ КАТЕГОРИЙ ЛОТОВ -->
                <div class="grid-4 mb-2">
                    <button onclick="AppAutodrot.setFilter('cars')" class="btn ${f === 'cars' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">🚗 Авто</button>
                    <button onclick="AppAutodrot.setFilter('plates')" class="btn ${f === 'plates' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">🏷 Номера</button>
                    <button onclick="AppAutodrot.setFilter('business')" class="btn ${f === 'business' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">💼 Бизнес</button>
                    <button onclick="AppAutodrot.setFilter('housing')" class="btn ${f === 'housing' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:4px 2px;">🏠 Жильё</button>
                </div>

                <div id="p2pItemsList"></div>
            `;
            this.renderP2PListingsFiltered();

        // 2. БАЗАР БЛАТНЫХ НОМЕРОВ
        } else if (this.subTab === 'blackmarket') {
            content.innerHTML = `
                <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(192,132,252,0.18), #090e18); border-color:var(--purple);">
                    <div>
                        <b class="text-xs color-purple"><i class="fa-solid fa-gem"></i> Эксклюзивный Базар Госномеров</b>
                        <div class="sub-label" style="font-size:9.5px;">Спецсерии АМР, ЕКХ, три топора и зеркалки РФ</div>
                    </div>
                    <button onclick="AppAutodrot.refreshNumbersMarket()" class="btn btn-purple btn-auto btn-sm" style="font-size:9px;">Связь (35k)</button>
                </div>
                <div id="autodrotBlackMarketPlatesList"></div>
            `;
            this.renderBlackMarketNumbersList();

        // 3. СРОЧНЫЙ ВЫКУП
        } else if (this.subTab === 'hotdeals') {
            content.innerHTML = `
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber"><i class="fa-solid fa-fire"></i> Срочный выкуп с рук (-35%)</b>
                        <span class="tag-badge bg-tag-amber">ГОРЯЩИЙ ЛОТ</span>
                    </div>
                    <p class="sub-label mb-2" style="font-size:9.5px;">Владельцам срочно нужны наличные! Перехватите автомобиль по низу рынка до того, как его заберут другие дельцы.</p>
                </div>
                <div id="autodrotHotDealsContainer"></div>
            `;
            this.renderHotDealsContainer();

        // 4. РЕПУТАЦИЯ И ОТЗЫВЫ
        } else if (this.subTab === 'reputation') {
            this.renderReputationScreen(content);
        }
    },

    // --------------------------------------------------------
    // ОТРИСОВКА P2P ЛОТОВ
    // --------------------------------------------------------
    renderP2PListingsFiltered() {
        const list = document.getElementById('p2pItemsList');
        if (!list) return;

        let filter = this.p2pFilter || 'cars';
        if (!state.p2pMarketListings || state.p2pMarketListings.length === 0) {
            state.p2pMarketListings = [
                { 
                    id: "p2p_1", seller: "Maga_GTI", type: "cars", name: "VW Golf VI GTI (Stage 2)",
                    price: 1850000, plate: "О777ОО 77", power: 260, img: "assets/cars/comfort/golf6/golf6.jpg",
                    originalCarObj: { condition: 85, wear: {engine: 80, transmission: 75}, tuning: {chip: 2, exhaust: true, stance: false, bodykit: false} }
                },
                { id: "p2p_2", seller: "Major_Vova", type: "plates", name: "Госномер А777АА 77", price: 1500000, plate: "А777АА 77" },
                { 
                    id: "p2p_3", seller: "Serega_Drift", type: "cars", name: "ВАЗ-2101 (Корч)",
                    price: 250000, plate: "В123ВВ 77", power: 85, img: "assets/cars/economy/2101/vaz-2101_1.jpg",
                    originalCarObj: { condition: 60, wear: {engine: 50, transmission: 40}, tuning: {chip: 0, exhaust: true, stance: false, bodykit: false, weldedDiff: true, steeringAngle: true, hydroHandbrake: true} }
                },
                { id: "p2p_4", seller: "Bumer_Boy", type: "plates", name: "Госномер В001ОР 777", price: 950000, plate: "В001ОР 777" },
                {
                    id: "p2p_5", seller: "Oligarch_Vova", type: "business", name: "Автомойка 24/7 (Ур. 3)",
                    bizId: "wash", bizLevel: 3, price: 320000, desc: "Готовая точка с доходностью 2,700 ₽/д."
                },
                {
                    id: "p2p_6", seller: "Maksim_Realtor", type: "housing", name: "Стандартный бокс в ГСК-7",
                    houseId: "gsk_box", price: 1750000, desc: "В собственности, яма, верстак, +2 машиноместа."
                }
            ];
        }

        let filtered = state.p2pMarketListings.filter(item => {
            if (filter === 'cars') return item.type === 'car' || item.type === 'cars';
            if (filter === 'plates') return item.type === 'plate' || item.type === 'plates';
            return item.type === filter;
        });

        if (filtered.length === 0) {
            list.innerHTML = "<div class='glass-card text-center sub-label py-6'>В этой категории биржи пока нет лотов.</div>";
            return;
        }

        let html = "";
        filtered.forEach(item => {
            let isMy = (state.myP2PListings && state.myP2PListings.includes(item.id));
            let btnAction = isMy 
                ? `<button onclick="AppAutodrot.cancelP2PListing('${item.id}')" class="btn btn-danger btn-auto btn-sm">Снять с продажи</button>`
                : `<button onclick="AppAutodrot.buyP2PLot('${item.id}')" class="btn btn-green btn-auto btn-sm">Купить (${item.price.toLocaleString()} ₽)</button>`;

            if (item.type === 'car' || item.type === 'cars') {
                let carImg = item.img ? item.img : "assets/cars/economy/2101/vaz-2101.jpg";
                let tuneBadges = "";
                let t = item.originalCarObj?.tuning;
                if (t) {
                    if (t.chip > 0) tuneBadges += "<span class='tag-badge bg-tag-purple mx-1'>STG " + t.chip + "</span>";
                    if (t.stance) tuneBadges += "<span class='tag-badge bg-tag-amber mx-1'>ПНЕВМА</span>";
                    if (t.weldedDiff) tuneBadges += "<span class='tag-badge bg-tag-red mx-1'>ДРИФТ</span>";
                }

                html += `
                <div class='glass-card mb-2 p-2'>
                    <div class='flex-between mb-1'>
                        <div class='flex-gap' style='align-items:center;'>
                            <div class='chat-avatar-circle' style='width:28px; height:28px; font-size:14px;'>👤</div>
                            <div><b class='text-xs color-cyan'>${item.seller}</b><div class='sub-label' style='font-size:9px;'>Продавец авто</div></div>
                        </div>
                        <span class='tag-badge bg-tag-cyan'>АВТО P2P</span>
                    </div>
                    <div class='deal-car-preview-card mb-2'>
                        <img src='${carImg}' class='deal-car-thumb' onerror="this.src='assets/cars/economy/2101/vaz-2101.jpg'">
                        <div style='flex:1;'>
                            <div class='font-bold text-xs'>${item.name}</div>
                            <div class='license-plate text-xs' style='padding:1px 4px; margin:4px 0;'>${item.plate}</div>
                            <div class='price-val text-xs color-green'>${item.price.toLocaleString()} ₽</div>
                        </div>
                    </div>
                    <div class='flex-between'>
                        <div>
                            <div class='sub-label text-xs'>Мощность: ${item.power || 100} л.с.</div>
                            <div class='mt-1'>${tuneBadges}</div>
                        </div>
                        ${btnAction}
                    </div>
                </div>`;
            } else if (item.type === 'plate' || item.type === 'plates') {
                html += `
                <div class='glass-card p-2 flex-between mb-2'>
                    <div>
                        <div class='license-plate mb-1' style='font-size:14px;'>${item.plate} <div class='license-flag'>RUS</div></div>
                        <div class='sub-label text-xs'>Продавец: <b class='color-cyan'>${item.seller}</b></div>
                    </div>
                    <div class='text-right'>
                        <div class='price-val text-xs color-green mb-1'>${item.price.toLocaleString()} ₽</div>
                        ${btnAction}
                    </div>
                </div>`;
            } else if (item.type === 'business') {
                html += `
                <div class='glass-card p-2 flex-between mb-2'>
                    <div>
                        <b class='text-xs color-green'><i class='fa-solid fa-briefcase'></i> ${item.name}</b>
                        <div class='sub-label' style='font-size:10px;'>Продавец: <b>${item.seller}</b> | ${item.desc || ''}</div>
                    </div>
                    <div class='text-right'>
                        <div class='price-val text-xs color-green mb-1'>${item.price.toLocaleString()} ₽</div>
                        ${btnAction}
                    </div>
                </div>`;
            } else if (item.type === 'housing') {
                html += `
                <div class='glass-card p-2 flex-between mb-2'>
                    <div>
                        <b class='text-xs color-cyan'><i class='fa-solid fa-warehouse'></i> ${item.name}</b>
                        <div class='sub-label' style='font-size:10px;'>Продавец: <b>${item.seller}</b> | ${item.desc || ''}</div>
                    </div>
                    <div class='text-right'>
                        <div class='price-val text-xs color-green mb-1'>${item.price.toLocaleString()} ₽</div>
                        ${btnAction}
                    </div>
                </div>`;
            }
        });

        list.innerHTML = html;
    },

    buyP2PLot(listingId) {
        const idx = (state.p2pMarketListings || []).findIndex(l => l.id === listingId);
        if (idx === -1) return;
        const lot = state.p2pMarketListings[idx];

        let cash = state.player?.cash || 0;
        if (cash < lot.price) return showToast("Не хватает денег для выкупа лота с биржи!");

        if (lot.type === 'car' || lot.type === 'cars') {
            let maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
            let curSlots = (state.garage && state.garage.length) ? state.garage.length : 0;
            if (curSlots >= maxSlots) return showToast("В гараже нет свободного места!");

            state.player.cash -= lot.price;
            
            let carObj = lot.originalCarObj ? Object.assign({}, lot.originalCarObj) : {
                id: "car_p2p_" + Date.now(),
                name: lot.name,
                power: lot.power || 100,
                type: "comfort",
                price: lot.price,
                img: lot.img,
                plate: lot.plate,
                customPlate: lot.plate,
                condition: 90,
                wear: { engine: 90, transmission: 90 },
                isRegisteredOnPlayer: false,
                ownershipDays: 0,
                engineTemp: 90,
                tireWear: 95,
                tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }
            };
            
            carObj.purchaseCost = lot.price;
            if (typeof recalculateCarMarketValue === 'function') {
                recalculateCarMarketValue(carObj);
            }

            if (!state.garage) state.garage = [];
            state.garage.push(carObj);
        } else if (lot.type === 'plate' || lot.type === 'plates') {
            state.player.cash -= lot.price;
            if (!state.ownedPlates) state.ownedPlates = [];
            state.ownedPlates.push(lot.plate);
        } else if (lot.type === 'business') {
            state.player.cash -= lot.price;
            let targetBiz = (state.businesses || []).find(b => b.id === lot.bizId);
            if (targetBiz) {
                targetBiz.level = Math.max(targetBiz.level || 0, lot.bizLevel || 1);
                targetBiz.stock = 100;
            }
        } else if (lot.type === 'housing') {
            state.player.cash -= lot.price;
            if (!state.player.ownedHouses) state.player.ownedHouses = [];
            if (!state.player.ownedHouses.includes(lot.houseId)) state.player.ownedHouses.push(lot.houseId);
            state.player.housingId = lot.houseId;
            state.player.housingType = 'own';
        }

        state.p2pMarketListings.splice(idx, 1);
        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Лот успешно выкуплен с онлайн P2P биржи!");
        this.renderSubScreen();
    },

    cancelP2PListing(listingId) {
        if (!state.p2pMarketListings) return;
        const idx = state.p2pMarketListings.findIndex(l => l.id === listingId);
        if (idx === -1) return;
        const lot = state.p2pMarketListings[idx];

        if (lot.type === 'car' || lot.type === 'cars') {
            let maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
            let curSlots = (state.garage && state.garage.length) ? state.garage.length : 0;
            if (curSlots >= maxSlots) return showToast("В гараже нет свободного места под возврат авто!");

            let carObj = lot.originalCarObj ? Object.assign({}, lot.originalCarObj) : {
                id: "car_p2p_" + Date.now(),
                name: lot.name,
                power: lot.power || 100,
                type: "comfort",
                price: lot.price,
                img: lot.img,
                plate: lot.plate,
                customPlate: lot.plate,
                condition: 85,
                isRegisteredOnPlayer: false,
                ownershipDays: 0,
                engineTemp: 90,
                tireWear: 90,
                tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }
            };

            if (typeof recalculateCarMarketValue === 'function') {
                recalculateCarMarketValue(carObj);
            }

            if (!state.garage) state.garage = [];
            state.garage.push(carObj);
        } else if (lot.type === 'plate' || lot.type === 'plates') {
            if (!state.ownedPlates) state.ownedPlates = [];
            state.ownedPlates.push(lot.plate);
        } else if (lot.type === 'business') {
            let targetBiz = (state.businesses || []).find(b => b.id === lot.bizId);
            if (targetBiz) {
                targetBiz.level = lot.bizLevel || 1;
                targetBiz.stock = 100;
            }
        } else if (lot.type === 'housing') {
            if (!state.player.ownedHouses) state.player.ownedHouses = [];
            if (!state.player.ownedHouses.includes(lot.houseId)) state.player.ownedHouses.push(lot.houseId);
        }

        state.p2pMarketListings.splice(idx, 1);
        if (state.myP2PListings) {
            state.myP2PListings = state.myP2PListings.filter(id => id !== listingId);
        }

        saveState();
        if (typeof renderGarage === 'function') renderGarage();
        showToast("Лот снят с продажи и возвращён в инвентарь.");
        this.renderSubScreen();
    },

    // --------------------------------------------------------
    // БАЗАР НОМЕРОВ (ПЕРЕНЕСЕНО ИЗ СИНДИКАТА)
    // --------------------------------------------------------
    renderBlackMarketNumbersList() {
        const list = document.getElementById('autodrotBlackMarketPlatesList');
        if (!list) return;

        if (!state.blackMarketPlates || state.blackMarketPlates.length === 0) {
            if (typeof generateBlackMarketPlates === 'function') {
                generateBlackMarketPlates();
            } else {
                this.generateLocalBlackPlates();
            }
            saveState();
        }

        let html = "";
        state.blackMarketPlates.forEach((item, idx) => {
            let isSuperRare = item.price > 1000000;
            let borderGlow = isSuperRare ? "border: 1px solid var(--purple); box-shadow: 0 0 15px rgba(192, 132, 252, 0.25);" : "";
            let rarityText = isSuperRare ? "<span class='color-purple text-xs font-bold'>ЭКСКЛЮЗИВ</span>" : "<span class='color-amber text-xs'>БЛАТНОЙ</span>";

            html += `
            <div class='glass-card flex-between p-2 mb-2' style='${borderGlow}'>
                <div>
                    <div class='license-plate mb-1' style='font-size:15px; padding:4px 8px;'>${item.plate} <div class='license-flag'>RUS</div></div>
                    ${rarityText}
                </div>
                <div class='text-right'>
                    <div class='price-val text-xs color-green mb-1'>${item.price.toLocaleString()} ₽</div>
                    <button onclick="AppAutodrot.buyBlackPlateDirect(${idx})" class='btn ${isSuperRare ? "btn-purple" : "btn-amber"} btn-sm btn-auto'>Выкупить</button>
                </div>
            </div>`;
        });

        list.innerHTML = html;
    },

    generateLocalBlackPlates() {
        const rareRegions = ['77', '99', '97', '777', '199', '177'];
        const rareLetters = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];
        let generated = [];
        
        for (let i = 0; i < 4; i++) {
            let l1 = rareLetters[Math.floor(Math.random() * rareLetters.length)];
            let l2 = rareLetters[Math.floor(Math.random() * rareLetters.length)];
            let l3 = rareLetters[Math.floor(Math.random() * rareLetters.length)];
            let reg = rareRegions[Math.floor(Math.random() * rareRegions.length)];
            
            let plateType = Math.random();
            let plateStr = "";

            if (plateType < 0.25) {
                plateStr = l1 + l1 + l1 + " " + (Math.floor(Math.random()*899)+100) + " " + reg;
            } else if (plateType < 0.50) {
                const nums = ['111', '222', '333', '444', '555', '666', '888', '999'];
                let n = nums[Math.floor(Math.random() * nums.length)];
                plateStr = l1 + n + l2 + l3 + " " + reg;
            } else if (plateType < 0.75) {
                const eliteNums = ['777', '001', '007'];
                let n = eliteNums[Math.floor(Math.random() * eliteNums.length)];
                plateStr = l1 + n + l1 + l1 + " " + reg;
            } else {
                const specList = ["АМР", "ЕКХ", "СКР", "ВОР"];
                let spec = specList[Math.floor(Math.random() * specList.length)];
                plateStr = spec[0] + (Math.floor(Math.random()*899)+100) + spec[1] + spec[2] + " " + reg;
            }

            let calculatedValue = (typeof calculatePlateValue === 'function')
                ? calculatePlateValue(plateStr)
                : 450000;

            let marketPrice = Math.round(calculatedValue * (1.05 + Math.random() * 0.12));

            generated.push({
                id: "bm_plate_" + Date.now() + "_" + i,
                plate: plateStr,
                price: marketPrice
            });
        }

        state.blackMarketPlates = generated;
    },

    refreshNumbersMarket() {
        let cash = state.player?.cash || 0;
        let cost = 35000;
        if (cash < cost) return showToast(`Нужно ${cost.toLocaleString()} ₽ за услуги связи с барыгой!`);
        
        state.player.cash -= cost;
        this.generateLocalBlackPlates();
        saveState();
        updateHeaderUI();
        this.renderBlackMarketNumbersList();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Список теневых госзнаков обновлен!");
    },

    buyBlackPlateDirect(idx) {
        const lot = state.blackMarketPlates[idx];
        if (!lot) return;

        let cash = state.player?.cash || 0;
        if (cash < lot.price) return showToast("Не хватает денег на покупку номера!");

        state.player.cash -= lot.price;
        if (!state.ownedPlates) state.ownedPlates = [];
        state.ownedPlates.push(lot.plate);

        state.blackMarketPlates.splice(idx, 1);
        saveState();
        updateHeaderUI();
        this.renderBlackMarketNumbersList();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof openVerdictModal === 'function') {
            openVerdictModal("НОМЕР ПРИОБРЕТЕН! 🏷️", `Госзнак «${lot.plate}» добавлен в ваш инвентарь. Можете установить его в Гараже, чтобы повысить стоимость автомобиля!`, true);
        }
    },

    // --------------------------------------------------------
    // СРОЧНЫЙ ВЫКУП (HOT DEALS)
    // --------------------------------------------------------
    renderHotDealsContainer() {
        const container = document.getElementById('autodrotHotDealsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="glass-card mb-2 p-2" style="border: 1px solid var(--amber);">
                <div class="flex-between mb-1">
                    <b class="text-xs">Toyota Mark II JZX90 (Срочно)</b>
                    <span class="tag-badge bg-tag-red">Осталось: 55с</span>
                </div>
                <div class="sub-label mb-2" style="font-size:10px;">Цена продавца: <b class="color-green">290,000 ₽</b> (Рыночная оценка: 490,000 ₽)</div>
                <button onclick="AppAutodrot.interceptHotDeal()" class="btn btn-amber btn-sm w-full">Перехватить сделку ⚡</button>
            </div>
        `;
    },

    interceptHotDeal() {
        let cash = state.player?.cash || 0;
        let cost = 290000;
        if (cash < cost) return showToast("Не хватает 290,000 ₽ на срочный выкуп!");

        let maxSlots = typeof getTotalGarageSlots === 'function' ? getTotalGarageSlots() : 2;
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
            img: "assets/cars/economy/mark2/mark2.jpg",
            fallback: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80",
            plate: (typeof generateNormalPlate === 'function') ? generateNormalPlate() : "О777ОО 77",
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
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof openVerdictModal === 'function') {
            openVerdictModal("СРОЧНЫЙ ВЫКУП! 🔥", `Вы успели перехватить «${car.name}» за ${cost.toLocaleString()} ₽!\nМашина доставлена в гараж.`, true);
        }
        this.renderSubScreen();
    },

    // --------------------------------------------------------
    // РЕПУТАЦИЯ И КНИГА ОТЗЫВОВ
    // --------------------------------------------------------
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
    }
};

window.AppAutodrot = AppAutodrot;
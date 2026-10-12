// ========================================================
// js/phone-port.js — ПОРТ И БИТВЫ ЗА КОНТЕЙНЕРЫ (v0.7.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Таможенные контейнеры, импорт JDM/Европы и новый режим
// «Storage Wars» — интерактивный аукцион против ботов-перекупов
// с повышением ставок в реальном времени, таймером и блефом.
// ========================================================

const AppPort = {
    activeSubTab: 'catalog', // 'catalog' | 'storagewars'
    
    // Состояние сессии Storage Wars
    storageWars: {
        containerIdx: 0,
        currentBid: 0,
        leaderName: "Таможня",
        leaderIsPlayer: false,
        timerSec: 15,
        timerInterval: null,
        activeBots: [],
        isAuctionActive: false,
        log: []
    },

    render(container) {
        let lvl = state.player?.level || 1;
        let isLocked = lvl < 12;

        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-box-open color-purple mr-1"></i> Порт & Таможня</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
        `;

        if (isLocked) {
            html += `
                <div class="glass-card text-center p-4 my-auto">
                    <div class="radar-spinner-ring mb-3" style="border-top-color: var(--purple); border-right-color: var(--cyan);">
                        <div class="radar-spinner-center">🚢</div>
                    </div>
                    <div class="modal-glow-badge mb-2" style="color:var(--purple); border-color:rgba(192,132,252,0.4); background:rgba(192,132,252,0.1);">
                        ТАМОЖНЯ ОПЕЧАТАНА
                    </div>
                    <h3 class="font-bold color-purple mb-1">Доступ с 12 Уровня!</h3>
                    <p class="sub-label mb-3" style="font-size:10.5px; line-height:1.45;">
                        Ваш текущий уровень авторитета: <b>${lvl} из 12</b>.<br>
                        Импортные контейнеры и закрытые торги Storage Wars открываются с набором опыта на рынке.
                    </p>
                    <button onclick="PhoneManager.goHome()" class="btn btn-dark btn-sm w-full">На рабочий стол</button>
                </div>
            </div>`;
            container.innerHTML = html;
            return;
        }

        let sub = this.activeSubTab;

        html += `
            <div class="grid-2 mb-2">
                <button onclick="AppPort.switchTab('catalog')" class="btn ${sub === 'catalog' ? 'btn-purple' : 'btn-dark'} btn-sm">
                    <i class="fa-solid fa-boxes-stacked"></i> Контейнеры
                </button>
                <button onclick="AppPort.switchTab('storagewars')" class="btn ${sub === 'storagewars' ? 'btn-red' : 'btn-dark'} btn-sm">
                    <i class="fa-solid fa-gavel"></i> Storage Wars ⚔️
                </button>
            </div>

            <div id="portAppContentArea"></div>
        </div>`;

        container.innerHTML = html;
        this.renderSubTabContent();
    },

    switchTab(tab) {
        if (this.storageWars.timerInterval) {
            clearInterval(this.storageWars.timerInterval);
            this.storageWars.timerInterval = null;
        }
        this.activeSubTab = tab;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.render(document.getElementById('phoneAppContainer'));
    },

    renderSubTabContent() {
        const area = document.getElementById('portAppContentArea');
        if (!area) return;

        if (this.activeSubTab === 'catalog') {
            this.renderCatalogTab(area);
        } else {
            this.renderStorageWarsTab(area);
        }
    },

    // ========================================================
    // 1. СТАНДАРТНЫЙ КАТАЛОГ КОНТЕЙНЕРОВ
    // ========================================================
    renderCatalogTab(area) {
        let lvl = state.player?.level || 1;
        let html = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(192,132,252,0.15), #090e18); border-color: rgba(192,132,252,0.35);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-purple"><i class="fa-solid fa-ship"></i> Морской терминал</b>
                    <span class="tag-badge bg-tag-purple">Прямой импорт</span>
                </div>
                <div class="sub-label" style="font-size:9.5px;">Покупка закрытых партий автовозов и судов без аукциона.</div>
            </div>
            <div id="containersListRender"></div>
        `;
        area.innerHTML = html;
        this.renderContainersList();
    },

    renderContainersList() {
        const container = document.getElementById('containersListRender');
        if (!container) return;

        let lvl = state.player?.level || 1;
        let html = "";

        const catalog = (typeof CONTAINER_ITEMS !== 'undefined' && Array.isArray(CONTAINER_ITEMS)) 
            ? CONTAINER_ITEMS 
            : [];

        catalog.forEach(box => {
            let minLvl = box.minLevel || 12;
            let isLocked = lvl < minLvl;
            let starsTxt = box.reqStars ? ` + ${box.reqStars} ⭐` : "";
            let btnText = isLocked ? "С " + minLvl + " уровня" : `Вскрыть (${(box.cost / 1000).toFixed(0)}k ₽${starsTxt})`;
            let imgSrc = box.img || 'assets/containers/japan.jpg';
            let fallbackSrc = box.fallback || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80';

            let carsHint = (box.possibleCars && box.possibleCars.length > 0)
                ? `<div class="sub-label mb-2 color-cyan" style="font-size:9px;">🚗 Возможный транспорт: <b>${box.possibleCars.slice(0, 3).join(', ')}</b></div>`
                : "";

            html += `
            <div class='glass-card mb-3 p-2'>
                <div class='car-img-wrap mb-2' style='height:130px; position:relative;'>
                    <img src='${imgSrc}' class='car-img' onerror="this.onerror=null; this.src='${fallbackSrc}';">
                    <div class='badge-tag badge-br'><span class='tag-badge bg-tag-purple'>${box.badge}</span></div>
                </div>
                <div class='flex-between mb-1'>
                    <b class='font-bold text-xs color-purple'>${box.name}</b>
                    <span class='price-val text-xs'>${box.cost.toLocaleString()} ₽${starsTxt}</span>
                </div>
                <p class='sub-label mb-1' style="font-size:10px;">${box.desc}</p>
                ${carsHint}
                <button onclick="AppPort.openContainer('${box.id}')" class='btn btn-purple btn-sm w-full' ${isLocked ? "disabled" : ""}>
                    ${btnText}
                </button>
            </div>`;
        });

        container.innerHTML = html;
    },

    openContainer(boxId) {
        const catalog = typeof CONTAINER_ITEMS !== 'undefined' ? CONTAINER_ITEMS : [];
        const box = catalog.find(b => b.id === boxId);
        if (!box) return;

        let cost = box.cost;
        let reqStars = box.reqStars || 0;
        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;

        if (cash < cost) return showToast("Не хватает рублей на покупку контейнера!");
        if (stars < reqStars) return showToast(`Нужно ${reqStars} Stars ⭐!`);

        state.player.cash -= cost;
        state.player.stars -= reqStars;

        let roll = Math.random();

        // 1. Дроп автомобиля
        if (roll < 0.28 && box.possibleCars && box.possibleCars.length > 0) {
            let maxSlots = typeof getTotalGarageSlots === 'function' ? getTotalGarageSlots() : 2;
            let curSlots = state.garage ? state.garage.length : 0;

            let carName = box.possibleCars[Math.floor(Math.random() * box.possibleCars.length)];
            let matchedTemplate = null;

            if (typeof CAR_DATABASE !== 'undefined') {
                for (let cat in CAR_DATABASE) {
                    let found = CAR_DATABASE[cat].find(c => c.name === carName);
                    if (found) { matchedTemplate = found; break; }
                }
            }

            if (!matchedTemplate) {
                matchedTemplate = { name: carName, power: 180, basePrice: Math.round(cost * 1.5), type: 'comfort' };
            }

            let wonPlate = (typeof generateCoolPlate === 'function') ? generateCoolPlate() : "ТРАНЗИТ";
            let marketVal = Math.round(matchedTemplate.basePrice * 1.35);

            let wonCar = {
                id: "cont_car_" + Date.now(),
                name: matchedTemplate.name,
                type: matchedTemplate.type || 'comfort',
                power: matchedTemplate.power || 150,
                basePrice: matchedTemplate.basePrice,
                price: matchedTemplate.basePrice,
                baseMarketValue: marketVal,
                marketValue: marketVal,
                img: matchedTemplate.img || "assets/cars/comfort/polo/polo.jpg",
                fallback: matchedTemplate.fallback || getCategoryFallback(matchedTemplate.type),
                plate: wonPlate,
                customPlate: wonPlate,
                condition: Math.floor(75 + Math.random() * 20),
                wear: { engine: 85, transmission: 85 },
                isRegisteredOnPlayer: false,
                ownershipDays: 0,
                engineTemp: 90,
                tireWear: 90,
                purchaseCost: cost,
                tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 }
            };

            if (typeof recalculateCarMarketValue === 'function') {
                recalculateCarMarketValue(wonCar);
            }

            let rewardMsg = "";
            if (curSlots < maxSlots) {
                if (!state.garage) state.garage = [];
                state.garage.push(wonCar);
                rewardMsg = `В контейнере обнаружен «${wonCar.name}» с номерами ${wonPlate}!\nАвтомобиль доставлен в гараж.`;
            } else {
                let compensation = Math.round(wonCar.marketValue * 0.95);
                state.player.cash += compensation;
                rewardMsg = `Найден «${wonCar.name}»!\nГараж полон: компенсация на таможне +${compensation.toLocaleString()} ₽!`;
            }

            let gainedXp = Math.floor(100 + Math.random() * 80);
            addXp(gainedXp);

            saveState();
            updateHeaderUI();
            if (typeof renderGarage === 'function') renderGarage();
            playSound('win');
            tgHaptic('success');
            openVerdictModal("ТАМОЖЕННЫЙ ДЖЕКПОТ: АВТОМОБИЛЬ! 🚢", `${rewardMsg}\nОпыт: +${gainedXp} XP`, true);

        // 2. Денежный груз
        } else if (roll < 0.65) {
            let winCash = Math.round(cost * (1.35 + Math.random() * 0.65));
            let gainedXp = Math.floor(60 + Math.random() * 60);

            state.player.cash += winCash;
            addXp(gainedXp);

            let bonusImpound = Math.random() < 0.25;
            if (bonusImpound) {
                state.player.freeImpoundPasses = (state.player.freeImpoundPasses || 0) + 1;
            }

            saveState();
            updateHeaderUI();
            playSound('win');
            tgHaptic('success');

            let extraPassText = bonusImpound ? "\nБонус: +1 Талон забора со штрафстоянки ГИБДД 🚔!" : "";
            openVerdictModal(
                "ЦЕННЫЙ ТАМОЖЕННЫЙ ГРУЗ! 📦",
                `Партия контрактных узлов успешно растаможена!\nВыручка: +${winCash.toLocaleString()} ₽\nОпыт: +${gainedXp} XP${extraPassText}`,
                true,
                winCash
            );

        // 3. Битый распил
        } else if (roll < 0.88) {
            let salvageCash = Math.round(cost * 0.80);
            let gainedXp = 35;

            state.player.cash += salvageCash;
            addXp(gainedXp);

            saveState();
            updateHeaderUI();
            tgHaptic('light');

            openVerdictModal(
                "БИТЫЙ РАСПИЛ 🔩",
                `Кузов получил повреждения при морской транспортировке. Сдан на разборку за +${salvageCash.toLocaleString()} ₽ (+${gainedXp} XP).`,
                false,
                salvageCash
            );

        // 4. Пустышка
        } else {
            let gainedXp = 20;
            addXp(gainedXp);

            saveState();
            updateHeaderUI();
            playSound('error');
            tgHaptic('error');

            openVerdictModal(
                "ТАМОЖЕННАЯ ПУСТЫШКА 💨",
                `В ящиках оказались ржавые металлоконструкции без ценности. Убыток: -${cost.toLocaleString()} ₽ (+${gainedXp} XP за опыт).`,
                false
            );
        }

        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 2. ИНТЕРАКТИВНЫЙ АУКЦИОН «STORAGE WARS» В РЕАЛЬНОМ ВРЕМЕНИ
    // ========================================================
    renderStorageWarsTab(area) {
        const containers = (typeof STORAGE_WARS_CONTAINERS !== 'undefined') 
            ? STORAGE_WARS_CONTAINERS 
            : [];
        
        const sw = this.storageWars;
        const curContainer = containers[sw.containerIdx] || containers[0];

        if (!sw.isAuctionActive) {
            // Экран подготовки к торгам
            area.innerHTML = `
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(220, 38, 38, 0.22), #090e18); border-color: var(--red);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-red"><i class="fa-solid fa-gavel"></i> БИТВА ЗА КОНТЕЙНЕРЫ (STORAGE WARS)</b>
                        <span class="tag-badge bg-tag-red">LIVE АУКЦИОН</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9.5px;">
                        Соревнуйтесь против перекупов города в реальном времени! Поднимайте ставки, блефуйте и заставляйте ботов сливать деньги на пустышки.
                    </div>
                </div>

                <div class="glass-card mb-2 p-2">
                    <div class="car-img-wrap mb-2" style="height:140px; position:relative;">
                        <img src="${curContainer.img}" class="car-img" onerror="this.src='${curContainer.fallback}';">
                        <div class="badge-tag badge-br"><span class="tag-badge bg-tag-amber">${curContainer.badge}</span></div>
                    </div>

                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan" style="font-size:13px;">${curContainer.title}</b>
                        <span class="price-val text-xs color-green">Старт: ${curContainer.baseBid.toLocaleString()} ₽</span>
                    </div>

                    <div class="sub-label mb-2" style="font-size:9.5px;">${curContainer.desc}</div>

                    <div class="p-2 mb-2 text-xs" style="background:#090e18; border-radius:8px;">
                        <div class="flex-between mb-1"><span>Оценка содержимого:</span> <b class="color-amber">${curContainer.estValue}</b></div>
                        <div class="flex-between"><span>Риск распила/хлама:</span> <b class="color-red">${curContainer.riskLevel}</b></div>
                    </div>

                    <button onclick="AppPort.startStorageWarsSession(${sw.containerIdx})" class="btn btn-red btn-sm w-full" style="box-shadow: 0 0 16px var(--red-glow);">
                        🔥 ВОЙТИ В ТОРГИ (СТАРТОВАЯ СТАВКА)
                    </button>
                </div>
            `;
        } else {
            // Активные торги с таймером и ботами
            let logHtml = sw.log.slice(-6).map(l => `<div class="sub-label mb-1" style="font-size:9px;">${l}</div>`).join('');

            area.innerHTML = `
                <div class="glass-card mb-2 p-2" style="border-color: ${sw.leaderIsPlayer ? 'var(--green)' : 'var(--red)'};">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan">${curContainer.title}</b>
                        <div class="radar-spinner-ring" style="width:28px; height:28px; border-width:2px;">
                            <span class="font-bold text-xs color-amber" id="swTimerText">${sw.timerSec}с</span>
                        </div>
                    </div>

                    <div class="p-3 my-2 text-center" style="background:#090e18; border-radius:10px; border:1px solid var(--border-glow);">
                        <div class="sub-label text-xs">Текущая ставка молотка:</div>
                        <div class="price-val my-1" style="font-size:24px; color:${sw.leaderIsPlayer ? 'var(--green)' : 'var(--amber)'};">
                            ${sw.currentBid.toLocaleString()} ₽
                        </div>
                        <div class="sub-label" style="font-size:10px;">
                            Лидер: <b class="${sw.leaderIsPlayer ? 'color-green' : 'color-cyan'}">${sw.leaderName}</b>
                            ${sw.leaderIsPlayer ? ' (ВЫ ЛИДИРУЕТЕ ✓)' : ''}
                        </div>
                    </div>

                    <div class="p-2 mb-2" style="background:#060a12; border-radius:8px; max-height:85px; overflow-y:auto;" id="swLogBox">
                        ${logHtml}
                    </div>

                    <div class="grid-3 mb-2">
                        <button onclick="AppPort.playerMakeBid(25000)" class="btn btn-green btn-sm">+25k ₽</button>
                        <button onclick="AppPort.playerMakeBid(50000)" class="btn btn-green btn-sm">+50k ₽</button>
                        <button onclick="AppPort.playerMakeBid(150000)" class="btn btn-cyan btn-sm">+150k (Блеф!)</button>
                    </div>

                    <button onclick="AppPort.playerFoldAuction()" class="btn btn-dark btn-sm w-full">
                        Пас (Сбросить лот ботам) 🏳️
                    </button>
                </div>
            `;
        }
    },

    startStorageWarsSession(cIdx) {
        const containers = typeof STORAGE_WARS_CONTAINERS !== 'undefined' ? STORAGE_WARS_CONTAINERS : [];
        const container = containers[cIdx] || containers[0];
        
        let cash = state.player?.cash || 0;
        if (cash < container.baseBid) {
            return showToast(`Не хватает денег даже на стартовую ставку (${container.baseBid.toLocaleString()} ₽)!`);
        }

        const sw = this.storageWars;
        sw.containerIdx = cIdx;
        sw.currentBid = container.baseBid;
        sw.leaderName = (state.player?.name || "Вы");
        sw.leaderIsPlayer = true;
        sw.timerSec = 14;
        sw.isAuctionActive = true;
        sw.log = [`[Аукционист]: Торги открыты! Вы сделали первую ставку: ${sw.currentBid.toLocaleString()} ₽.`];

        // Инициализация ботов со случайными лимитами
        const botPool = typeof STORAGE_WARS_BOTS !== 'undefined' ? STORAGE_WARS_BOTS : [];
        sw.activeBots = botPool.map(b => ({
            ...b,
            budget: Math.round(container.baseBid * b.maxBudgetMul * (0.9 + Math.random() * 0.35)),
            hasFolded: false
        }));

        playSound('tick');
        tgHaptic('medium');

        this.renderSubTabContent();
        this.runAuctionTickLoop();
    },

    runAuctionTickLoop() {
        const sw = this.storageWars;
        if (sw.timerInterval) clearInterval(sw.timerInterval);

        sw.timerInterval = setInterval(() => {
            if (!sw.isAuctionActive) {
                clearInterval(sw.timerInterval);
                return;
            }

            sw.timerSec--;
            const timerEl = document.getElementById('swTimerText');
            if (timerEl) timerEl.innerText = `${sw.timerSec}с`;

            // Реакция ботов (раз в 2-4 секунды бот может перебить)
            if (sw.timerSec > 2 && Math.random() < 0.40) {
                this.triggerBotBid();
            }

            // Молоточный отсчет
            if (sw.timerSec === 3) {
                sw.log.push(`[Молоток]: Раз! ${sw.currentBid.toLocaleString()} ₽...`);
                playSound('tick');
            } else if (sw.timerSec === 2) {
                sw.log.push(`[Молоток]: Два! ${sw.currentBid.toLocaleString()} ₽...`);
                playSound('tick');
            } else if (sw.timerSec <= 0) {
                clearInterval(sw.timerInterval);
                this.finishStorageWarsAuction();
            }

            const logBox = document.getElementById('swLogBox');
            if (logBox) {
                logBox.innerHTML = sw.log.slice(-6).map(l => `<div class="sub-label mb-1" style="font-size:9px;">${l}</div>`).join('');
                logBox.scrollTop = logBox.scrollHeight;
            }
        }, 1000);
    },

    triggerBotBid() {
        const sw = this.storageWars;
        const availableBots = sw.activeBots.filter(b => !b.hasFolded && b.budget > sw.currentBid);
        if (availableBots.length === 0) return;

        const bot = availableBots[Math.floor(Math.random() * availableBots.length)];
        
        let raiseSteps = [25000, 50000, 75000];
        let raise = raiseSteps[Math.floor(Math.random() * raiseSteps.length)];
        
        // Шанс блефа
        if (Math.random() < bot.bluffChance && bot.budget > sw.currentBid + 150000) {
            raise = 150000;
        }

        sw.currentBid += raise;
        sw.leaderName = `${bot.avatar} ${bot.name}`;
        sw.leaderIsPlayer = false;
        sw.timerSec = Math.max(7, sw.timerSec + 3); // Продлеваем молоток

        sw.log.push(`${bot.avatar} ${bot.name}: «Поднимаю до ${sw.currentBid.toLocaleString()} ₽!»`);
        playSound('tick');
        tgHaptic('light');

        this.renderSubTabContent();
    },

    playerMakeBid(raiseAmount) {
        const sw = this.storageWars;
        if (!sw.isAuctionActive) return;

        let newBid = sw.currentBid + raiseAmount;
        let cash = state.player?.cash || 0;

        if (cash < newBid) {
            return showToast(`Не хватает денег для ставки ${newBid.toLocaleString()} ₽!`);
        }

        sw.currentBid = newBid;
        sw.leaderName = (state.player?.name || "Вы");
        sw.leaderIsPlayer = true;
        sw.timerSec = Math.max(8, sw.timerSec + 3); // Продлеваем молоток
        sw.log.push(`Вы: «Моя ставка ${sw.currentBid.toLocaleString()} ₽!» (+${raiseAmount.toLocaleString()})`);

        playSound('win');
        tgHaptic('medium');

        this.renderSubTabContent();
    },

    playerFoldAuction() {
        const sw = this.storageWars;
        if (!sw.isAuctionActive) return;

        if (sw.timerInterval) clearInterval(sw.timerInterval);
        sw.isAuctionActive = false;

        playSound('tick');
        showToast("Вы спасовали. Лот ушёл другому покупателю!");

        openVerdictModal(
            "ВЫ СБРОСИЛИ ЛОТ 🏳️",
            `Вы вовремя спасовали! Контейнер достался ${sw.leaderName} за ${sw.currentBid.toLocaleString()} ₽. Ваши деньги целы.`,
            true
        );

        this.renderSubTabContent();
    },

    finishStorageWarsAuction() {
        const sw = this.storageWars;
        sw.isAuctionActive = false;

        const containers = typeof STORAGE_WARS_CONTAINERS !== 'undefined' ? STORAGE_WARS_CONTAINERS : [];
        const container = containers[sw.containerIdx] || containers[0];

        if (!sw.leaderIsPlayer) {
            playSound('tick');
            openVerdictModal(
                "ТОРГИ ОКОНЧЕНЫ 🔨",
                `ПРОДАНО! Контейнер выиграл ${sw.leaderName} за ${sw.currentBid.toLocaleString()} ₽. Вы не потратили ни рубля.`,
                false
            );
            this.renderSubTabContent();
            return;
        }

        // ПОБЕДА ИГРОКА
        state.player.cash = Math.max(0, (state.player.cash || 0) - sw.currentBid);

        let roll = Math.random();

        // 1. Дроп машины (40% шанс в Storage Wars)
        if (roll < 0.40 && container.possibleCars && container.possibleCars.length > 0) {
            let maxSlots = typeof getTotalGarageSlots === 'function' ? getTotalGarageSlots() : 2;
            let curSlots = state.garage ? state.garage.length : 0;

            let carName = container.possibleCars[Math.floor(Math.random() * container.possibleCars.length)];
            let matchedTemplate = null;

            if (typeof CAR_DATABASE !== 'undefined') {
                for (let cat in CAR_DATABASE) {
                    let found = CAR_DATABASE[cat].find(c => c.name === carName);
                    if (found) { matchedTemplate = found; break; }
                }
            }

            if (!matchedTemplate) {
                matchedTemplate = { name: carName, power: 190, basePrice: Math.round(sw.currentBid * 1.6), type: 'comfort' };
            }

            let wonPlate = (typeof generateCoolPlate === 'function') ? generateCoolPlate() : "ТРАНЗИТ";
            let marketVal = Math.round(matchedTemplate.basePrice * 1.4);

            let wonCar = {
                id: "sw_car_" + Date.now(),
                name: matchedTemplate.name,
                type: matchedTemplate.type || 'comfort',
                power: matchedTemplate.power || 150,
                basePrice: matchedTemplate.basePrice,
                price: matchedTemplate.basePrice,
                baseMarketValue: marketVal,
                marketValue: marketVal,
                img: matchedTemplate.img || "assets/cars/comfort/polo/polo.jpg",
                fallback: matchedTemplate.fallback || getCategoryFallback(matchedTemplate.type),
                plate: wonPlate,
                customPlate: wonPlate,
                condition: Math.floor(75 + Math.random() * 20),
                wear: { engine: 85, transmission: 85 },
                isRegisteredOnPlayer: false,
                ownershipDays: 0,
                engineTemp: 90,
                tireWear: 90,
                purchaseCost: sw.currentBid,
                tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 }
            };

            if (typeof recalculateCarMarketValue === 'function') {
                recalculateCarMarketValue(wonCar);
            }

            let rewardMsg = "";
            if (curSlots < maxSlots) {
                if (!state.garage) state.garage = [];
                state.garage.push(wonCar);
                rewardMsg = `В контейнере обнаружен «${wonCar.name}» с номерами ${wonPlate}!\nАвтомобиль доставлен в гараж.`;
            } else {
                let comp = Math.round(wonCar.marketValue * 0.95);
                state.player.cash += comp;
                rewardMsg = `Найден «${wonCar.name}»!\nГараж полон: компенсация на месте +${comp.toLocaleString()} ₽!`;
            }

            let gainedXp = 150;
            addXp(gainedXp);

            saveState();
            updateHeaderUI();
            if (typeof renderGarage === 'function') renderGarage();
            playSound('win');
            tgHaptic('success');

            openVerdictModal(
                "ПОБЕДА В STORAGE WARS! 🏆",
                `ПРОДАНО ВАМ за ${sw.currentBid.toLocaleString()} ₽!\n\n${rewardMsg}\nОпыт: +${gainedXp} XP`,
                true
            );

        // 2. Куш с запчастей
        } else if (roll < (1 - container.scrapChance)) {
            let profit = Math.round(sw.currentBid * (1.25 + Math.random() * 0.50));
            state.player.cash += profit;
            let gainedXp = 80;
            addXp(gainedXp);

            saveState();
            updateHeaderUI();
            playSound('win');
            tgHaptic('success');

            openVerdictModal(
                "ПРИБЫЛЬНЫЙ КОНТЕЙНЕР! 📦",
                `ПРОДАНО ВАМ за ${sw.currentBid.toLocaleString()} ₽!\nВнутри обнаружена партия ценных контрактных моторов и дисков.\nВыручка с перепродажи: +${profit.toLocaleString()} ₽ (Чистыми: +${(profit - sw.currentBid).toLocaleString()} ₽)`,
                true,
                profit
            );

        // 3. Пустышка / хлам
        } else {
            let salvage = Math.round(sw.currentBid * 0.45);
            state.player.cash += salvage;
            let gainedXp = 40;
            addXp(gainedXp);

            saveState();
            updateHeaderUI();
            playSound('error');
            tgHaptic('error');

            openVerdictModal(
                "УБЫТОЧНЫЙ ХЛАМ 🔩",
                `ПРОДАНО ВАМ за ${sw.currentBid.toLocaleString()} ₽.\nУвы! В контейнере оказался ржавый металлолом и старые покрышки. Сдано на чермет за +${salvage.toLocaleString()} ₽.`,
                false,
                salvage
            );
        }

        this.renderSubTabContent();
    }
};

window.AppPort = AppPort;
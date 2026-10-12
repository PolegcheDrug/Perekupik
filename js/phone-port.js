// ========================================================
// js/phone-port.js — ПРИЛОЖЕНИЕ «ПОРТ И КОНТЕЙНЕРЫ» (v0.6.1)
// Таможенные контейнеры, импорт японских и европейских авто,
// выигрыш реальных машин, пакетов XP и слепые аукционы ФССП.
// ========================================================

const AppPort = {
    render(container) {
        let lvl = state.player?.level || 1;
        let isLocked = lvl < 12;

        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-box-open color-purple mr-1"></i> Порт & Контейнеры</div>
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
                        Контейнеры из Японии, Германии и аукционов США станут доступны после набора авторитета на авторынке!
                    </p>
                    <button onclick="PhoneManager.goHome()" class="btn btn-dark btn-sm w-full">На рабочий стол</button>
                </div>
            </div>`;
            container.innerHTML = html;
            return;
        }

        html += `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle, rgba(220, 38, 38, 0.2) 0%, #0b101a 100%); border-color: rgba(220, 38, 38, 0.4);">
                <div class="flex-between mb-1">
                    <b class="color-red text-xs"><i class="fa-solid fa-gavel"></i> Слепой аукцион ФССП</b>
                    <span class="tag-badge bg-tag-red">Слепой лот</span>
                </div>
                <p class="sub-label mb-2" style="font-size:10px;">Машина под чехлом. Неизвестен пробег, юридический статус и скрытые дефекты.</p>
                <button onclick="openBlindAuctionModal()" class="btn btn-danger btn-sm w-full">Перейти к торгам</button>
            </div>

            <div class="glass-card p-2">
                <div class="flex-between mb-2">
                    <b class="text-xs color-purple"><i class="fa-solid fa-ship"></i> Портовые Контейнеры</b>
                    <span class="sub-label" style="font-size:10px;">Таможня Кобе / Copart / Дубай</span>
                </div>
                <div id="containersListRender"></div>
            </div>
        </div>`;

        container.innerHTML = html;
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

        // 1. ДРОП РЕАЛЬНОГО АВТОМОБИЛЯ (28% шанс)
        if (roll < 0.28 && box.possibleCars && box.possibleCars.length > 0) {
            let maxSlots = typeof getTotalGarageSlots === 'function' ? getTotalGarageSlots() : 2;
            let curSlots = state.garage ? state.garage.length : 0;

            let carName = box.possibleCars[Math.floor(Math.random() * box.possibleCars.length)];
            let matchedTemplate = null;

            if (typeof CAR_DATABASE !== 'undefined') {
                for (let cat in CAR_DATABASE) {
                    let found = CAR_DATABASE[cat].find(c => c.name === carName);
                    if (found) {
                        matchedTemplate = found;
                        break;
                    }
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
                img: matchedTemplate.img || "assets/cars/comfort/polo.jpg",
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
                rewardMsg = `В контейнере обнаружен идеальный «${wonCar.name}» с номерами ${wonPlate}!\nАвтомобиль доставлен в гараж.`;
            } else {
                let compensation = Math.round(wonCar.marketValue * 0.95);
                state.player.cash += compensation;
                rewardMsg = `Найден «${wonCar.name}»!\nГараж полон: автомобиль продан прямо на таможне за +${compensation.toLocaleString()} ₽!`;
            }

            let gainedXp = Math.floor(100 + Math.random() * 80);
            addXp(gainedXp);

            saveState();
            updateHeaderUI();
            if (typeof renderGarage === 'function') renderGarage();
            playSound('win');
            tgHaptic('success');
            openVerdictModal("ТАМОЖЕННЫЙ ДЖЕКПОТ: АВТОМОБИЛЬ! 🚢", `${rewardMsg}\nБонус опыта: +${gainedXp} XP`, true);

        // 2. КРУПНЫЙ ДЕНЕЖНЫЙ КУШ + ОПЫТ (37% шанс)
        } else if (roll < 0.65) {
            let winCash = Math.round(cost * (1.35 + Math.random() * 0.65));
            let gainedXp = Math.floor(60 + Math.random() * 60);

            state.player.cash += winCash;
            addXp(gainedXp);

            // Редкий бонус: талон бесплатного забора со штрафстоянки
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
                `Партия контрактных моторов и электроники успешно реализована!\nВыручка: +${winCash.toLocaleString()} ₽\nОпыт: +${gainedXp} XP${extraPassText}`,
                true,
                winCash
            );

        // 3. РАСПИЛ НА ЗАПЧАСТИ (23% шанс)
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

        // 4. ТАМОЖЕННАЯ ПУСТЫШКА (12% шанс)
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
    }
};

window.AppPort = AppPort;
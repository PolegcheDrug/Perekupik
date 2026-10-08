// ===================== Вкладка: ЖИЗНЬ, БИЗНЕС И СЕРВИСЫ (js/life.js) =====================

function buyReshalaPack(type) {
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;

    if (type === 'pack1') {
        if (cash < 150000) return showToast("Не хватает 150,000 ₽!");
        state.player.cash -= 150000;
        
        let conn = 0;
        if (state.player && state.player.connections) conn = state.player.connections;
        state.player.connections = conn + 1;
        
        showToast("Связи приобретены (+1 🤝)!");
    } else if (type === 'pack5') {
        if (cash < 650000) return showToast("Не хватает 650,000 ₽!");
        state.player.cash -= 650000;
        
        let conn = 0;
        if (state.player && state.player.connections) conn = state.player.connections;
        state.player.connections = conn + 5;
        
        showToast("Оптовый пакет связей (+5 🤝) активирован!");
    }
    saveState();
    updateHeaderUI();
}

function checkReshalaAccess() {
    const roofCard = document.getElementById('reshala-roof-card');
    const legalCard = document.getElementById('reshala-legalize-card');
    
    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;

    if (roofCard) {
        const btn = roofCard.querySelector('button');
        if (lvl < 10) {
            roofCard.classList.add('item-locked');
            if (btn) {
                btn.disabled = true;
                btn.innerText = 'С 10 УРОВНЯ';
            }
        } else {
            roofCard.classList.remove('item-locked');
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Оформить (350k ₽ / 45 ⭐)';
            }
        }
    }
    if (legalCard) {
        const btn = legalCard.querySelector('button');
        if (lvl < 15) {
            legalCard.classList.add('item-locked');
            if (btn) {
                btn.disabled = true;
                btn.innerText = 'С 15 УРОВНЯ';
            }
        } else {
            legalCard.classList.remove('item-locked');
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Легализовать (200k ₽ + 1 🤝)';
            }
        }
    }
    renderConfiscatedCardUI();
}

function buyReshalaService(service) {
    if (service === 'roof') {
        let lvl = 1;
        if (state.player && state.player.level) lvl = state.player.level;
        if (lvl < 10) return showToast("Услуга доступна с 10 уровня!");
        
        let cash = 0;
        if (state.player && state.player.cash) cash = state.player.cash;
        
        let stars = 0;
        if (state.player && state.player.stars) stars = state.player.stars;

        if (cash >= 350000) {
            state.player.cash -= 350000;
        } else if (stars >= 45) {
            state.player.stars -= 45;
        } else {
            return showToast("Нужно 350,000 ₽ или 45 Stars ⭐!");
        }
        
        let d = 0;
        if (state.player && state.player.policeImmunityDays) d = state.player.policeImmunityDays;
        state.player.policeImmunityDays = d + 3;
        
        saveState();
        openVerdictModal("🚨 КРЫША ОФОРМЛЕНА", "ГИБДД не тронет ваши машины следующие 3 дня!", true);
    }
}

function openLegalizeCarModal() {
    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;
    if (lvl < 15) return showToast("Услуга доступна с 15 уровня!");
    
    if (!state.garage) return;
    const criminalCars = state.garage.filter(c => c && c.isStolen);
    const list = document.getElementById('legalizeCarList');
    if (!list) return;
    
    if (criminalCars.length === 0) {
        list.innerHTML = "<div class='sub-label text-center py-4'>У вас в гараже нет криминальных авто в розыске.</div>";
    } else {
        let html = "";
        criminalCars.forEach(c => {
            let cName = "Авто"; if (c.name) cName = c.name;
            let cPlate = "ТРАНЗИТ"; 
            if (c.customPlate) cPlate = c.customPlate;
            else if (c.plate) cPlate = c.plate;

            html += 
            "<div class='glass-card flex-between p-2 mb-1'>" +
                "<div>" +
                    "<b>" + cName + "</b>" +
                    "<div class='sub-label color-red'>В розыске (" + cPlate + ")</div>" +
                "</div>" +
                "<button onclick=\"confirmLegalizeCar('" + c.id + "')\" class='btn btn-purple btn-auto btn-sm'>Отмыть VIN</button>" +
            "</div>";
        });
        list.innerHTML = html;
    }
    const mod = document.getElementById('modalLegalizeCar');
    if (mod) mod.classList.add('active');
}

function confirmLegalizeCar(carId) {
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;
    let conn = 0;
    if (state.player && state.player.connections) conn = state.player.connections;

    let noMoney = false;
    if (cash < 200000) noMoney = true;
    let noConn = false;
    if (conn < 1) noConn = true;

    if (noMoney) return showToast("Нужно 200,000 ₽ и 1 Связь 🤝!");
    if (noConn) return showToast("Нужно 200,000 ₽ и 1 Связь 🤝!");

    state.player.cash -= 200000;
    state.player.connections -= 1;
    
    if (state.garage) {
        const car = state.garage.find(c => c && c.id === carId);
        if (car) {
            car.isStolen = false;
            car.autotekaChecked = true;
        }
    }
    closeModal('modalLegalizeCar');
    saveState();
    renderGarage();
    openVerdictModal("VIN ОТМЫТ! 🔏", "Автомобиль теперь юридически чист во всех базах!", true);
}

function generateConfiscatedCarLot() {
    if (typeof CAR_DATABASE === 'undefined') return;

    const isExclusive = Math.random() < 0.15;
    let template = null;
    let category = 'comfort';
    
    if (isExclusive) {
        let pool = CAR_DATABASE.premium;
        if (CAR_DATABASE.hyper && CAR_DATABASE.hyper.length > 0) pool = CAR_DATABASE.hyper;
        template = pool[Math.floor(Math.random() * pool.length)];
        category = 'exclusive';
    } else {
        const pools = ['economy', 'comfort', 'premium'];
        const chosenCat = pools[Math.floor(Math.random() * pools.length)];
        let pool = CAR_DATABASE.economy;
        if (CAR_DATABASE[chosenCat]) pool = CAR_DATABASE[chosenCat];
        template = pool[Math.floor(Math.random() * pool.length)];
        category = chosenCat;
    }

    if (!template) return;

    let dynPrice = 350000;
    if (template.basePrice) dynPrice = template.basePrice;

    const discount = isExclusive ? 0.50 : 0.45;
    const buyPrice = Math.round(dynPrice * (1 - discount));
    const marketVal = Math.round(dynPrice * 1.15);
    const plate = isExclusive ? 'Е777КХ 77' : 'А123МР 77';

    let tName = "Авто"; if (template.name) tName = template.name;
    let tPow = 120; if (template.power) tPow = template.power;
    let tType = "comfort"; if (template.type) tType = template.type;
    let tImg = "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
    if (template.img) tImg = template.img;

    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;

    let reqConn = 2;
    if (isExclusive) reqConn = 5;
    else if (lvl >= 20) reqConn = 3;

    state.confiscatedLot = {
        id: 'confiscated_' + Date.now(),
        name: tName,
        power: tPow,
        type: tType,
        basePrice: dynPrice,
        price: buyPrice,
        baseMarketValue: marketVal,
        marketValue: marketVal + 250000,
        img: tImg,
        plate: plate,
        customPlate: plate,
        isExclusive: isExclusive,
        category: category,
        requiredConnections: reqConn,
        condition: Math.floor(70 + Math.random() * 25),
        wear: { engine: 80, transmission: 85 },
        isStolen: false,
        autotekaChecked: true
    };
}

function renderConfiscatedCardUI() {
    const card = document.getElementById('reshala-confiscate-card');
    if (!card) return;
    
    if (!state.confiscatedLot) {
        generateConfiscatedCarLot();
    }
    const lot = state.confiscatedLot;
    if (!lot) return;
    
    let conn = 0;
    if (state.player && state.player.connections) conn = state.player.connections;
    
    let hasEnoughConn = false;
    if (conn >= lot.requiredConnections) hasEnoughConn = true;
    
    let minLvl = 12;
    if (lot.isExclusive) minLvl = 20;
    
    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;
    
    let isLevelOk = false;
    if (lvl >= minLvl) isLevelOk = true;

    let titleText = "📦 Теневой конфискат (ФССП)";
    let badgeClass = "bg-tag-purple";
    let badgeText = "СКИДКА 45%";
    let btnClass = "btn-purple";

    if (lot.isExclusive) {
        titleText = "👑 АРЕСТОВАННЫЙ ЭКСКЛЮЗИВ";
        badgeClass = "bg-tag-amber";
        badgeText = "СКИДКА 50%";
        btnClass = "btn-amber";
    }

    let isDis = "";
    if (!isLevelOk) isDis = "disabled";
    else if (!hasEnoughConn) isDis = "disabled";

    let btnText = "Выкупить (" + lot.price.toLocaleString() + " ₽ + " + lot.requiredConnections + " 🤝)";
    if (!isLevelOk) btnText = "С " + minLvl + " УРОВНЯ";
    else if (!hasEnoughConn) btnText = "Нужно " + lot.requiredConnections + " 🤝 связей";

    card.innerHTML = 
        "<div class='flex-between mb-1'>" +
            "<b>" + titleText + "</b>" +
            "<span class='tag-badge " + badgeClass + "'>" + badgeText + "</span>" +
        "</div>" +
        "<div class='flex-between text-xs mb-1'>" +
            "<span class='font-bold color-cyan'>" + lot.name + "</span>" +
            "<span class='license-plate'>" + lot.plate + "</span>" +
        "</div>" +
        "<p class='sub-label mb-2'>Рынок: ~" + lot.marketValue.toLocaleString() + " ₽ / Требуется: <b>" + lot.requiredConnections + " 🤝</b></p>" +
        "<button onclick='buyConfiscatedCar()' class='btn " + btnClass + " btn-sm' " + isDis + ">" + btnText + "</button>";
}

function buyConfiscatedCar() {
    if (!state.confiscatedLot) generateConfiscatedCarLot();
    const lot = state.confiscatedLot;
    if (!lot) return;
    
    let minLvl = 12;
    if (lot.isExclusive) minLvl = 20;

    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;

    if (lvl < minLvl) return showToast("Выкуп доступен с " + minLvl + " уровня!");
    
    let conn = 0;
    if (state.player && state.player.connections) conn = state.player.connections;
    if (conn < lot.requiredConnections) return showToast("Требуется минимум " + lot.requiredConnections + " 🤝 связей!");
    
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;
    if (cash < lot.price) return showToast("Не хватает денег! Нужно " + lot.price.toLocaleString() + " ₽.");
    
    let maxSlots = getTotalGarageSlots();
    let currentSlots = 0;
    if (state.garage && state.garage.length) currentSlots = state.garage.length;
    if (currentSlots >= maxSlots) return showToast("В гараже нет свободного места!");
    
    state.player.cash -= lot.price;
    state.player.connections -= lot.requiredConnections;
    
    let cChip = 0;
    if (lot.isExclusive) cChip = 1;

    const carToAdd = Object.assign({}, lot);
    carToAdd.id = 'car_conf_' + Date.now();
    carToAdd.purchaseCost = lot.price;
    carToAdd.tuning = { chip: cChip, exhaust: false, stance: false, bodykit: false, risk1251: 0 };
    
    if (!state.garage) state.garage = [];
    state.garage.push(carToAdd);
    state.confiscatedLot = null; 
    saveState();
    renderGarage();
    renderConfiscatedCardUI();
    
    let vTitle = "АВТО СО ШТРАФСТОЯНКИ! 🚔";
    if (lot.isExclusive) vTitle = "РЕЗЕРВ ФССП ВЫКУПЛЕН! 👑";

    openVerdictModal(
        vTitle,
        "Вы забрали " + lot.name + " с солидным дисконтом!",
        true,
        lot.marketValue - lot.price
    );
}

function roadAssistanceAction() {
    let fuel = 0;
    if (state.player && state.player.fuel) fuel = state.player.fuel;

    if (fuel < 10) return showToast("Нужно 10 ⛽ бензина для выезда!");
    state.player.fuel -= 10;
    
    const roll = Math.random();
    let karma = 0;
    if (state.player && state.player.karma) karma = state.player.karma;

    if (roll < 0.65) {
        state.player.karma = Math.min(100, karma + 12);
        showToast("Вы прикурили аккумулятор на трассе! (+12 Кармы 😇)");
    } else {
        let conn = 0;
        if (state.player && state.player.connections) conn = state.player.connections;
        state.player.connections = conn + 1;
        state.player.karma = Math.min(100, karma + 5);
        showToast("Вы помогли сотруднику ведомства! (+1 🤝 Связь и +5 Карма)");
    }
    saveState();
    updateHeaderUI();
}

function donatePartsToMechanic() {
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;
    if (cash < 35000) return showToast("Нужно 35,000 ₽ на закупку деталей!");
    
    state.player.cash -= 35000;
    
    let conn = 0;
    if (state.player && state.player.connections) conn = state.player.connections;
    state.player.connections = conn + 1;

    let karma = 0;
    if (state.player && state.player.karma) karma = state.player.karma;
    state.player.karma = Math.min(100, karma + 8);
    
    saveState();
    updateHeaderUI();
    showToast("Дядя Ваня благодарен за запчасти! (+1 🤝 Связь и +8 Карма)");
}

function bigCharityDonate() {
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;
    if (cash < 100000) return showToast("Нужно 100,000 ₽!");
    
    state.player.cash -= 100000;
    
    let karma = 0;
    if (state.player && state.player.karma) karma = state.player.karma;
    state.player.karma = Math.min(100, karma + 25);
    
    saveState();
    updateHeaderUI();
    showToast("Доброе дело сделано! (+25 Кармы 😇)");
}

function takeLoan(amt) {
    let debt = 0;
    if (state.player && state.player.loanDebt) debt = state.player.loanDebt;
    if (debt >= 1000000) return showToast("Лимит долга исчерпан!"); 
    
    state.player.cash += amt * 0.95; 
    state.player.loanDebt = debt + amt; 
    saveState(); 
    showToast("Одобрено: " + amt.toLocaleString() + " ₽ (Комиссия 5%)"); 
}

function repayLoan(percent) {
    let debt = 0;
    if (state.player && state.player.loanDebt) debt = state.player.loanDebt;
    if (debt <= 0) return showToast("У вас нет задолженностей!"); 
    
    let amt = Math.ceil(debt * (percent / 100)); 
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;
    if (cash < amt) return showToast("Не хватает денег для оплаты!"); 
    
    state.player.cash -= amt; 
    state.player.loanDebt = Math.max(0, debt - amt); 
    saveState(); 
    showToast("Оплачено " + amt.toLocaleString() + " ₽ долга"); 
}

function checkBusinessAccess() {
    const c = document.getElementById('businessList');
    const lock = document.getElementById('businessLockCover');
    const activeBox = document.getElementById('businessActiveBox');
    
    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;

    if (lvl < 5) {
        if (activeBox) activeBox.style.display = 'none';
        if (lock) lock.style.display = 'block';
        return;
    }
    
    if (lock) lock.style.display = 'none';
    if (activeBox) activeBox.style.display = 'block';
    
    if (!c) return;
    if (typeof BUSINESS_DATA === 'undefined') return;
    
    let html = "";
    state.businesses.forEach((b, i) => {
        if (!b) return;
        let isMax = false;
        if (b.level >= 10) isMax = true;
        
        let isLocked = false;
        if (lvl < b.minLevel) isLocked = true;
        
        let cost = b.cost;
        if (b.level > 0) cost = b.cost * (b.level + 1);
        
        const defaultBizImgs = [
            'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&q=80',
            'https://images.unsplash.com/photo-1599256614138-0ceec0e766c8?w=400&q=80',
            'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?w=400&q=80',
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80'
        ];
        const imgSrc = defaultBizImgs[i % defaultBizImgs.length];
        
        let lockBlock = "";
        if (isLocked) {
            lockBlock = "<div class='cooldown-timer' style='display:flex; opacity:1; font-size:14px;'><i class='fa-solid fa-lock mb-2'></i> С " + b.minLevel + " УРОВНЯ</div>";
        }
        
        let rankText = "Ур. " + b.level;
        if (isMax) rankText = "MAX";

        let storedBlock = "";
        if (b.level > 0) {
            let s = 0; if (b.stored) s = b.stored;
            storedBlock = "<div class='color-green text-xs font-bold mb-2'>В кассе: " + s.toLocaleString() + " ₽</div>";
        }
        
        let btnClass = "btn-cyan";
        if (isMax) btnClass = "btn-dark";

        let dis = "";
        if (isMax || isLocked) dis = "disabled";

        let btnText = "Купить (" + cost.toLocaleString() + " ₽)";
        if (isMax) btnText = "Максимум";
        else if (isLocked) btnText = "С " + b.minLevel + " ур";
        else if (b.level > 0) btnText = "Улучшить (" + cost.toLocaleString() + " ₽)";

        let cardClass = "business-card";
        if (!isLocked) cardClass += " unlocked";

        let imgClass = "business-img-box";
        if (isLocked) imgClass += " item-locked";

        let bInc = 0; if (b.income) bInc = b.income;
        let bLvl = 0; if (b.level) bLvl = b.level;
        let incTotal = bInc * bLvl;

        html += 
        "<div class='" + cardClass + "'>" +
            "<div class='" + imgClass + "'>" +
                "<img src='" + imgSrc + "' class='business-img' onerror=\"this.src='https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=400&q=80'\">" +
                lockBlock +
                "<div class='badge-tag bg-tag-cyan' style='bottom: 8px; left: 8px; right: auto;'>" + rankText + "</div>" +
            "</div>" +
            "<div class='business-content'>" +
                "<div class='flex-between mb-1'>" +
                    "<b class='text-xs'>" + b.name + "</b>" +
                    "<div class='sub-label'>Доход: <span class='color-green font-bold'>" + incTotal.toLocaleString() + " ₽</span></div>" +
                "</div>" +
                "<div class='business-perk-badge'>⭐ Перк: " + (b.perk ? b.perk : 'Пассивный доход') + "</div>" +
                storedBlock +
                "<button onclick='upgradeBusiness(" + i + ")' class='btn " + btnClass + " btn-sm' " + dis + ">" + btnText + "</button>" +
            "</div>" +
        "</div>";
    });
    c.innerHTML = html;
}

function upgradeBusiness(idx) {
    const b = state.businesses[idx];
    if (!b) return;
    
    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;

    if (lvl < b.minLevel) return showToast("Этот бизнес доступен с " + b.minLevel + " уровня!");
    if (b.level >= 10) return showToast("Бизнес достиг максимума!");
    
    let cost = b.cost;
    if (b.level > 0) cost = b.cost * (b.level + 1);
    
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;

    if (cash < cost) return showToast("Не хватает денег!");
    
    state.player.cash -= cost;
    b.level += 1;
    saveState(); 
    checkBusinessAccess();
    showToast("Бизнес «" + b.name + "» улучшен до " + b.level + " уровня!");
}

function collectAllBusinessCash() {
    let totalCollected = 0;
    if (state.businesses) {
        state.businesses.forEach(b => {
            if (b && b.stored && b.stored > 0) {
                totalCollected += b.stored;
                b.stored = 0;
            }
        });
    }
    if (totalCollected <= 0) {
        return showToast("В кассах предприятий пока пусто!");
    }
    state.player.cash += totalCollected;
    saveState();
    checkBusinessAccess();
    tgHaptic('success');
    playSound('win');
    spawnFloatingReward("+" 
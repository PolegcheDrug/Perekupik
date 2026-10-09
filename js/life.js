// ===================== Вкладка: ЖИЗНЬ, БИЗНЕС И СЕРВИСЫ (js/life.js) =====================

// ===================== 1. ТЕНЕВЫЕ СВЯЗИ (РЕШАЛА АРТУР) =====================
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

    if (cash < 200000 || conn < 1) return showToast("Нужно 200,000 ₽ и 1 Связь 🤝!");

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
    let hasEnoughConn = conn >= lot.requiredConnections;
    
    let minLvl = lot.isExclusive ? 20 : 12;
    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;
    let isLevelOk = lvl >= minLvl;

    let titleText = lot.isExclusive ? "👑 АРЕСТОВАННЫЙ ЭКСКЛЮЗИВ" : "📦 Теневой конфискат (ФССП)";
    let badgeClass = lot.isExclusive ? "bg-tag-amber" : "bg-tag-purple";
    let badgeText = lot.isExclusive ? "СКИДКА 50%" : "СКИДКА 45%";
    let btnClass = lot.isExclusive ? "btn-amber" : "btn-purple";

    let isDis = (!isLevelOk || !hasEnoughConn) ? "disabled" : "";

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
    
    let minLvl = lot.isExclusive ? 20 : 12;
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
    
    let cChip = lot.isExclusive ? 1 : 0;
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
    
    let vTitle = lot.isExclusive ? "РЕЗЕРВ ФССП ВЫКУПЛЕН! 👑" : "АВТО СО ШТРАФСТОЯНКИ! 🚔";

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

// ===================== 2. ИНТЕРАКТИВНЫЙ АВТОБИЗНЕС СО СНАБЖЕНИЕМ =====================

const BUSINESS_SUPPLY_CONFIG = {
    wash: { name: "Автошампунь & Воск", unitCost: 1500, stockPerPack: 25 },
    shina: { name: "Грузики & Жгуты", unitCost: 2500, stockPerPack: 25 },
    sto: { name: "Моторное масло & Фильтры", unitCost: 4500, stockPerPack: 25 },
    shaurma: { name: "Мясо & Лаваши", unitCost: 3500, stockPerPack: 35 },
    detailing: { name: "Керамика & Полироли", unitCost: 8000, stockPerPack: 25 }
};

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
    if (!c || typeof BUSINESS_DATA === 'undefined') return;
    
    let html = "";
    state.businesses.forEach((b, i) => {
        if (!b) return;
        let isMax = b.level >= 10;
        let isLocked = lvl < b.minLevel;
        let cost = b.level > 0 ? b.cost * (b.level + 1) : b.cost;
        
        const defaultBizImgs = [
            'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&q=80',
            'https://images.unsplash.com/photo-1599256614138-0ceec0e766c8?w=400&q=80',
            'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?w=400&q=80',
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80'
        ];
        const imgSrc = defaultBizImgs[i % defaultBizImgs.length];
        
        let lockBlock = isLocked 
            ? "<div class='cooldown-timer' style='display:flex; opacity:1; font-size:14px;'><i class='fa-solid fa-lock mb-2'></i> С " + b.minLevel + " УРОВНЯ</div>" 
            : "";
        
        let rankText = isMax ? "MAX" : "Ур. " + b.level;
        let lvlPct = (b.level / 10) * 100;

        let stockVal = (typeof b.stock === 'number') ? b.stock : 100;
        b.stock = stockVal;

        let supplyConfig = BUSINESS_SUPPLY_CONFIG[b.id];
        let supplyBuyCost = supplyConfig ? supplyConfig.unitCost : 3000;

        let interactiveControlBlock = "";
        if (b.level > 0) {
            let s = b.stored || 0;
            let stockColor = stockVal > 25 ? "color-green" : "color-red";
            
            interactiveControlBlock = 
            "<div class='sub-label mb-1 flex-between'><span>Прокачка уровня:</span><b class='color-cyan'>" + b.level + "/10</b></div>" +
            "<div class='biz-progress-track'><div class='biz-progress-fill fill-biz-lvl' style='width:" + lvlPct + "%;'></div></div>" +
            
            "<div class='sub-label mb-1 flex-between'><span>Запас сырья:</span><b class='" + stockColor + "'>" + stockVal + "%</b></div>" +
            "<div class='biz-progress-track'><div class='biz-progress-fill fill-biz-stock' style='width:" + stockVal + "%;'></div></div>" +
            
            "<div class='color-green text-xs font-bold mb-2'>В кассе: " + s.toLocaleString() + " ₽</div>" +
            
            "<div class='grid-2 mb-2'>" +
                "<button onclick='refillBusinessStock(" + i + ")' class='btn btn-amber btn-sm'>📦 Сырьё (" + supplyBuyCost.toLocaleString() + " ₽)</button>" +
                "<button onclick='upgradeBusiness(" + i + ")' class='btn " + (isMax ? "btn-dark" : "btn-cyan") + " btn-sm' " + (isMax ? "disabled" : "") + ">" + 
                    (isMax ? "Макс" : "Апгрейд (" + cost.toLocaleString() + " ₽)") + 
                "</button>" +
            "</div>";
        } else {
            let dis = isLocked ? "disabled" : "";
            let btnText = isLocked ? "С " + b.minLevel + " ур" : "Купить (" + cost.toLocaleString() + " ₽)";
            interactiveControlBlock = "<button onclick='upgradeBusiness(" + i + ")' class='btn btn-cyan btn-sm' " + dis + ">" + btnText + "</button>";
        }

        let cardClass = isLocked ? "business-card" : "business-card unlocked";
        let imgClass = isLocked ? "business-img-box item-locked" : "business-img-box";
        let bInc = (b.income || 0) * (b.level || 0);

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
                    "<div class='sub-label'>Доход: <span class='color-green font-bold'>" + bInc.toLocaleString() + " ₽</span></div>" +
                "</div>" +
                "<div class='business-perk-badge'>⭐ Перк: " + (b.perk || 'Пассивный доход') + "</div>" +
                interactiveControlBlock +
            "</div>" +
        "</div>";
    });
    c.innerHTML = html;
}

function refillBusinessStock(idx) {
    const b = state.businesses[idx];
    if (!b || b.level <= 0) return;
    
    let curStock = b.stock || 0;
    if (curStock >= 100) return showToast("Склады сырья заполнены на 100%!");
    
    let supplyConfig = BUSINESS_SUPPLY_CONFIG[b.id];
    let cost = supplyConfig ? supplyConfig.unitCost : 3000;
    let addPack = supplyConfig ? supplyConfig.stockPerPack : 25;
    
    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Не хватает " + cost.toLocaleString() + " ₽ на сырьё!");
    
    state.player.cash -= cost;
    b.stock = Math.min(100, curStock + addPack);
    saveState();
    checkBusinessAccess();
    playSound('tick');
    tgHaptic('success');
    showToast("Сырьё поставлено (+ " + addPack + "%)!");
}

function upgradeBusiness(idx) {
    const b = state.businesses[idx];
    if (!b) return;
    
    let lvl = state.player?.level || 1;
    if (lvl < b.minLevel) return showToast("Этот бизнес доступен с " + b.minLevel + " уровня!");
    if (b.level >= 10) return showToast("Бизнес достиг максимума!");
    
    let cost = b.level > 0 ? b.cost * (b.level + 1) : b.cost;
    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Не хватает денег!");
    
    state.player.cash -= cost;
    b.level += 1;
    if (!b.stock) b.stock = 100;
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
    spawnFloatingReward("+" + totalCollected.toLocaleString() + " ₽");
    showToast("Инкассация: снято " + totalCollected.toLocaleString() + " ₽!");
}

// ===================== 3. МАГАЗИН ПЕРЕКУПА (С РАЗДЕЛОМ РАСХОДНИКИ) =====================

const SHOP_TOOLS = [
    { id: 'gauge', name: 'Цифровой толщиномер ET-111', icon: 'fa-ruler-combined', price: 25000, desc: 'Бесплатно и точно измеряет ЛКП на авторынке.', reqLvl: 1 },
    { id: 'obd', name: 'OBD2 Сканер «Вася-Диагност Pro»', icon: 'fa-laptop-code', price: 65000, desc: 'Открывает чтение блоков ЭБУ и мотора перед сделкой.', reqLvl: 5 },
    { id: 'endoscope', name: 'Поворотный HD-Эндоскоп', icon: 'fa-camera', price: 110000, desc: 'Заглядывает в цилиндры: защита от покупки задиров.', reqLvl: 10 },
    { id: 'compressor', name: 'Турбо-бустер и компрессор 12V', icon: 'fa-bolt', price: 40000, desc: '+10 к успеху при выезде на помощь на трассе.', reqLvl: 8 }
];

const SHOP_CONSUMABLES = [
    { id: 'wash', name: 'Канистра автошампуня (Для автомойки)', cost: 1500, stockBonus: 25, icon: 'fa-soap', desc: '+25% сырья для работы автомойки' },
    { id: 'shina', name: 'Набор грузиков и жгутов (Для шинки)', cost: 2500, stockBonus: 25, icon: 'fa-circle-notch', desc: '+25% расходников на балансировку' },
    { id: 'sto', name: 'Бочка моторного масла 5W-40 (Для СТО)', cost: 4500, stockBonus: 25, icon: 'fa-oil-can', desc: '+25% масел и расходников для сервиса' },
    { id: 'shaurma', name: 'Партия свежего мяса и лавашей (Шаурма)', cost: 3500, stockBonus: 35, icon: 'fa-drumstick-bite', desc: '+35% сырья для точки с фастфудом' },
    { id: 'detailing', name: 'Керамика & Полировальные круги', cost: 8000, stockBonus: 25, icon: 'fa-wand-magic-sparkles', desc: '+25% химии для студии детейлинга' }
];

const SHOP_SUPPLIES = [
    { id: 'coffee', name: 'Двойной эспрессо', cost: 450, hunger: 10, mood: 15, desc: 'Бодрит и снимает сонливость.' },
    { id: 'energy', name: 'Энергетик Red Bull Litre', cost: 950, hunger: 15, mood: 30, desc: '+30 куража перед торгами у капота!' },
    { id: 'burger', name: 'Комбо-бургер перекупа', cost: 1800, hunger: 50, mood: 20, desc: 'Быстрый и сытный перекус.' }
];

function switchShopSection(sec) {
    const list = ['tools', 'consumables', 'plates', 'supplies'];
    list.forEach(s => {
        const btn = document.getElementById("shopTab-" + s);
        const block = document.getElementById("shopSec-" + s);
        if (btn) {
            btn.classList.toggle('btn-cyan', s === sec);
            btn.classList.toggle('btn-dark', s !== sec);
        }
        if (block) {
            block.style.display = (s === sec) ? 'block' : 'none';
        }
    });

    if (sec === 'tools') renderShopTools();
    if (sec === 'consumables') renderShopConsumables();
    if (sec === 'plates') renderShopPlates();
    if (sec === 'supplies') renderShopSupplies();
}

function renderShopConsumables() {
    const container = document.getElementById('shopConsumablesList');
    if (!container) return;
    
    let html = "";
    SHOP_CONSUMABLES.forEach(c => {
        let linkedBiz = state.businesses ? state.businesses.find(b => b.id === c.id) : null;
        let isOwned = linkedBiz && linkedBiz.level > 0;
        let stockVal = linkedBiz ? (linkedBiz.stock || 0) : 0;

        html += 
        "<div class='glass-card p-3 mb-2 flex-between'>" +
            "<div style='flex:1; padding-right:12px;'>" +
                "<div class='flex-between mb-1'>" +
                    "<b class='font-bold text-xs color-amber'><i class='fa-solid " + c.icon + "'></i> " + c.name + "</b>" +
                    "<span class='text-xs font-bold color-green'>" + c.cost.toLocaleString() + " ₽</span>" +
                "</div>" +
                "<div class='sub-label mb-1'>" + c.desc + "</div>" +
                (isOwned ? "<div class='text-xs color-cyan'>Запас на предприятии: <b>" + stockVal + "%</b></div>" : "<div class='sub-label color-red'>Предприятие не куплено</div>") +
            "</div>" +
            "<button onclick=\"buyConsumableForBiz('" + c.id + "', " + c.cost + ", " + c.stockBonus + ")\" class='btn btn-amber btn-auto btn-sm' " + (!isOwned ? "disabled" : "") + ">" +
                "Купить" +
            "</button>" +
        "</div>";
    });
    container.innerHTML = html;
}

function buyConsumableForBiz(bizId, cost, stockBonus) {
    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Не хватает " + cost.toLocaleString() + " ₽!");
    
    let targetBiz = state.businesses ? state.businesses.find(b => b.id === bizId) : null;
    if (!targetBiz || targetBiz.level <= 0) return showToast("Сначала приобретите это предприятие!");
    
    let curStock = targetBiz.stock || 0;
    if (curStock >= 100) return showToast("Склады уже заполнены на 100%!");
    
    state.player.cash -= cost;
    targetBiz.stock = Math.min(100, curStock + stockBonus);
    saveState();
    renderShopConsumables();
    playSound('tick');
    tgHaptic('success');
    showToast("Сырьё куплено и развезено на базу (+ " + stockBonus + "%)!");
}

function renderShopTools() {
    const container = document.getElementById('shopToolsList');
    if (!container) return;

    if (!state.player.tools) {
        state.player.tools = { gauge: false, obd: false, endoscope: false, compressor: false };
    }

    let hasGauge = !!(state.player && state.player.tools && state.player.tools.gauge);
    let hasObd = !!(state.player && state.player.tools && state.player.tools.obd);
    let lvl = state.player?.level || 1;
    let canDoContracts = hasGauge && hasObd && lvl >= 15;

    const statusBadge = document.getElementById('syndicateEquipStatus');
    if (statusBadge) {
        statusBadge.innerText = canDoContracts ? "Заказы: Доступны ✓" : "Заказы: Нужен Толщиномер + OBD";
        statusBadge.className = canDoContracts ? "tag-badge bg-tag-green" : "tag-badge bg-tag-amber";
    }

    let html = "";
    SHOP_TOOLS.forEach(tool => {
        let isOwned = !!(state.player && state.player.tools && state.player.tools[tool.id]);
        let isLocked = lvl < tool.reqLvl;
        let statusColor = isOwned ? "color-green" : "color-amber";
        let statusText = isOwned ? "КУПЛЕНО ✓" : tool.price.toLocaleString() + " ₽";
        let lockHtml = isLocked ? "<div class='sub-label color-red font-bold'>С " + tool.reqLvl + " уровня</div>" : "";
        let btnClass = isOwned ? "btn-dark" : "btn-cyan";
        let dis = (isOwned || isLocked) ? "disabled" : "";
        let btnText = isOwned ? "В наличии" : "Купить";

        html += 
        "<div class='glass-card p-3 mb-2 flex-between'>" +
            "<div style='flex: 1; padding-right: 12px;'>" +
                "<div class='flex-between mb-1'>" +
                    "<b class='font-bold text-xs color-cyan'><i class='fa-solid " + tool.icon + "'></i> " + tool.name + "</b>" +
                    "<span class='text-xs font-bold " + statusColor + "'>" + statusText + "</span>" +
                "</div>" +
                "<div class='sub-label mb-1'>" + tool.desc + "</div>" +
                lockHtml +
            "</div>" +
            "<button onclick=\"buyShopTool('" + tool.id + "')\" class='btn " + btnClass + " btn-auto btn-sm' " + dis + ">" + btnText + "</button>" +
        "</div>";
    });
    container.innerHTML = html;
}

function buyShopTool(toolId) {
    const tool = SHOP_TOOLS.find(t => t.id === toolId);
    if (!tool) return;
    
    let cash = state.player?.cash || 0;
    if (cash < tool.price) return showToast("Не хватает денег на прибор!");
    state.player.cash -= tool.price;
    state.player.tools[toolId] = true;
    saveState();
    renderShopTools();
    playSound('win');
    tgHaptic('success');
    showToast("Куплен " + tool.name + "!");
}

function renderShopSupplies() {
    const container = document.getElementById('shopSuppliesList');
    if (!container) return;
    let html = "";
    SHOP_SUPPLIES.forEach(item => {
        html += 
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div>" +
                "<b class='text-xs color-green'>" + item.name + "</b>" +
                "<div class='sub-label mb-1'>" + item.desc + "</div>" +
                "<div class='text-xs color-amber'>+" + item.hunger + "% сытости / +" + item.mood + "% куража</div>" +
            "</div>" +
            "<button onclick=\"buyShopSupply('" + item.id + "')\" class='btn btn-green btn-auto btn-sm' style='min-width: 85px;'>" +
                item.cost.toLocaleString() + " ₽" +
            "</button>" +
        "</div>";
    });
    container.innerHTML = html;
}

function buyShopSupply(itemId) {
    const item = SHOP_SUPPLIES.find(i => i.id === itemId);
    if (!item) return;
    
    let cash = state.player?.cash || 0;
    if (cash < item.cost) return showToast("Не хватает денег!");
    state.player.cash -= item.cost;
    
    let hng = state.player?.hunger || 80;
    state.player.hunger = Math.min(100, hng + item.hunger);
    
    let mod = state.player?.mood || 85;
    state.player.mood = Math.min(100, mod + item.mood);
    
    saveState();
    updateHeaderUI();
    showToast("Употреблено: " + item.name + "!");
}

function renderShopPlates() {
    const container = document.getElementById('plateMarketListDetailed');
    if (!container) return;
    
    if (!state.plateCatalog || state.plateCatalog.length === 0) {
        if (typeof refreshPlateCatalog === 'function') refreshPlateCatalog();
    }
    
    let html = "";
    if (state.plateCatalog) {
        state.plateCatalog.forEach((item, idx) => {
            if (!item) return;
            let price = item.price || 0;
            let pStr = item.plate || "ТРАНЗИТ";

            html += 
            "<div class='glass-card flex-between p-2 mb-2'>" +
                "<div class='license-plate'>" + pStr + " <div class='license-flag'>RUS</div></div>" +
                "<div class='text-right flex-gap'>" +
                    "<span class='price-val text-xs' style='line-height:28px;'>" + price.toLocaleString() + " ₽</span>" +
                    "<button onclick='buyPlateFromShop(" + idx + ")' class='btn btn-amber btn-auto btn-sm'>Купить</button>" +
                "</div>" +
            "</div>";
        });
    }
    container.innerHTML = html;
}

function buyPlateFromShop(idx) {
    const item = state.plateCatalog[idx];
    if (!item) return;
    
    let cash = state.player?.cash || 0;
    if (cash < item.price) return showToast("Не хватает денег на госномер!");
    state.player.cash -= item.price;
    if (!state.ownedPlates) state.ownedPlates = [];
    state.ownedPlates.push(item.plate);
    state.plateCatalog.splice(idx, 1);
    saveState();
    renderShopPlates();
    tgHaptic('success');
    showToast("Госномер " + item.plate + " добавлен в коллекцию!");
}

// ===================== 4. ЗАКАЗЫ СИНДИКАТА =====================

const CONTRACT_CLIENT_TYPES = [
    { client: "Бизнесмен Игорь", avatar: "💼", reqClass: "premium", minHp: 240, cleanOnly: true, desc: "Строгий представительский авто для деловых встреч." },
    { client: "Таксопарк «Вектор»", avatar: "🚕", reqClass: "comfort", minHp: 100, cleanOnly: true, desc: "Свежий рабочий комфорт под долгосрочную аренду." },
    { client: "Уличный гонщик Влад", avatar: "🏎️", reqClass: "economy", minHp: 130, cleanOnly: false, desc: "Корч под зимний дрифт. На дефекты всё равно!" },
    { client: "Чиновник Соколов", avatar: "🏛️", reqClass: "premium", minHp: 300, cleanOnly: true, desc: "Юридически чистый премиум-внедорожник без следов ДТП." },
    { client: "Перекуп Артём", avatar: "🕶️", reqClass: "comfort", minHp: 120, cleanOnly: false, desc: "Перехватить клиенту под ключ. Заберу с доплатой." }
];

function generateContracts() {
    state.contracts = [];
    for (let i = 0; i < 3; i++) {
        const t = CONTRACT_CLIENT_TYPES[Math.floor(Math.random() * CONTRACT_CLIENT_TYPES.length)];
        let rb = 110000;
        if (t.reqClass === 'premium') rb = 750000;
        else if (t.reqClass === 'comfort') rb = 250000;
        
        const reward = Math.round(rb * (0.9 + Math.random() * 0.35));
        let bxp = t.reqClass === 'premium' ? 120 : 60;

        state.contracts.push({
            id: 'cnt_' + Date.now() + '_' + i,
            client: t.client,
            avatar: t.avatar,
            desc: t.desc,
            reqClass: t.reqClass,
            minHp: t.minHp,
            cleanOnly: t.cleanOnly,
            reward: reward,
            bonusXp: bxp
        });
    }
}

function renderContracts() {
    const c = document.getElementById('contractsList');
    const lock = document.getElementById('contractsLockCover');
    
    let lvl = state.player?.level || 1;
    if (lvl < 15) {
        if (c) c.style.display = 'none';
        if (lock) lock.style.display = 'block';
        return;
    }
    if (lock) lock.style.display = 'none';
    if (!c) return;
    c.style.display = 'block';
    
    let hasGauge = !!(state.player && state.player.tools && state.player.tools.gauge);
    let hasObd = !!(state.player && state.player.tools && state.player.tools.obd);

    if (!hasGauge || !hasObd) {
        c.innerHTML = 
        "<div class='glass-card text-center py-6'>" +
            "<i class='fa-solid fa-lock color-amber' style='font-size:32px; margin-bottom:10px;'></i>" +
            "<h4 class='font-bold'>Нужно профессиональное оборудование!</h4>" +
            "<p class='sub-label mt-1 mb-3'>Для подбора авто требуются <b>Толщиномер</b> и <b>OBD2 Сканер</b>.</p>" +
            "<button onclick=\"switchTab('tabShop')\" class='btn btn-amber btn-auto'>Перейти в Маркет 🛒</button>" +
        "</div>";
        return;
    }

    if (!state.contracts || state.contracts.length === 0) {
        generateContracts();
    }

    let html = "";
    state.contracts.forEach((cnt, i) => {
        if (!cnt) return;

        let suitableCar = null;
        if (state.garage && state.garage.length > 0) {
            suitableCar = state.garage.find(car => {
                if (!car || car.type !== cnt.reqClass || car.impounded) return false;
                let cPow = car.power || 100;
                if (cPow < cnt.minHp) return false;
                if (cnt.cleanOnly && car.isStolen) return false;
                return true;
            });
        }

        let btnClass = suitableCar ? "btn-green" : "btn-dark";
        let sName = suitableCar ? (suitableCar.name || "Авто") : "";
        let cRew = cnt.reward || 0;
        let btnText = suitableCar 
            ? "✓ Отдать «" + sName + "» (Выплата +" + cRew.toLocaleString() + " ₽)" 
            : "Нет подходящего авто в гараже";

        let cAva = cnt.avatar || "";
        let cClient = cnt.client || "";
        let cDesc = cnt.desc || "";
        let cClass = cnt.reqClass ? cnt.reqClass.toUpperCase() : "";
        let cHp = cnt.minHp || 0;
        let cleanText = cnt.cleanOnly ? "Только чистый VIN" : "Любая история";

        html += 
        "<div class='glass-card mb-2' style='border-left: 4px solid var(--cyan);'>" +
            "<div class='flex-between mb-1'>" +
                "<b class='color-cyan'>" + cAva + " " + cClient + "</b>" +
                "<span class='tag-badge bg-tag-amber'>+" + cRew.toLocaleString() + " ₽</span>" +
            "</div>" +
            "<p class='sub-label mb-2'>" + cDesc + "</p>" +
            "<div class='space-y-1 mb-2 text-xs'>" +
                "<div>Класс: <b class='color-green'>" + cClass + "</b> / Мощность: <b>от " + cHp + " л.с.</b></div>" +
                "<div>Юр. чистота: <b>" + cleanText + "</b></div>" +
            "</div>" +
            "<button onclick='completeContract(" + i + ")' class='btn " + btnClass + " btn-sm w-full'>" + btnText + "</button>" +
        "</div>";
    });
    c.innerHTML = html;
}

function completeContract(idx) {
    const cnt = state.contracts[idx];
    if (!cnt) return;

    let carIdx = -1;
    if (state.garage && state.garage.length > 0) {
        carIdx = state.garage.findIndex(car => {
            if (!car || car.type !== cnt.reqClass || car.impounded) return false;
            let cPow = car.power || 100;
            if (cPow < cnt.minHp) return false;
            if (cnt.cleanOnly && car.isStolen) return false;
            return true;
        });
    }

    if (carIdx === -1) {
        let rClass = cnt.reqClass ? cnt.reqClass.toUpperCase() : "";
        return showToast("Нужен не арестованный авто класса " + rClass + " от " + cnt.minHp + " л.с.!");
    }

    const car = state.garage[carIdx];
    state.garage.splice(carIdx, 1);

    let mVal = car.marketValue || car.price || 100000;
    let cRew = cnt.reward || 0;
    const totalPayout = mVal + cRew;
    state.player.cash += totalPayout;
    
    if (!state.player.stats) state.player.stats = {};
    state.player.stats.sold = (state.player.stats.sold || 0) + 1;
    state.player.stats.totalNetProfit = (state.player.stats.totalNetProfit || 0) + cRew;
    
    addXp(cnt.bonusXp || 50);

    state.contracts.splice(idx, 1);
    saveState();
    renderGarage();
    renderContracts();

    tgHaptic('success');
    playSound('win');
    
    let cClient = cnt.client || "";
    let cName = car.name || "Авто";
    openVerdictModal("ЗАКАЗ ВЫПОЛНЕН! 🤝", cClient + " забрал " + cName + ". Оплата зачислена!", true, totalPayout, cRew);
}

function refreshContractsManual() {
    let cash = state.player?.cash || 0;
    if (cash < 15000) return showToast("Обновление базы стоит 15,000 ₽!");
    
    state.player.cash -= 15000;
    generateContracts();
    saveState();
    renderContracts();
    showToast("Список заказов обновлен!");
}

// ===================== 5. САРАИ (ГАРАЖНЫЕ НАХОДКИ) =====================

function renderBarnFind() {
    const b = document.getElementById('barnFindContent');
    if (!b || typeof BARN_FINDS === 'undefined') return;

    let lDay = state.player?.lastBarnDay || 0;
    let pDay = state.player?.day || 1;
    let canExplore = lDay < pDay;

    let html = "";
    BARN_FINDS.forEach((barn, i) => {
        let bName = barn.name || "";
        let bVal = barn.marketValue || 0;
        let bImg = barn.img || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
        let dis = canExplore ? "" : "disabled";
        let btnText = canExplore ? "Разведать сарай (50,000 ₽)" : "Разведка будет доступна завтра";

        html += 
        "<div class='barn-tier-card'>" +
            "<div class='flex-between mb-1'>" +
                "<b class='color-amber'>" + bName + "</b>" +
                "<span class='tag-badge bg-tag-amber'>Оценка: ~" + bVal.toLocaleString() + " ₽</span>" +
            "</div>" +
            "<div class='car-img-wrap' style='height: 110px; opacity: 0.85; filter: grayscale(0.4);'>" +
                "<img src='" + bImg + "' class='car-img' onerror=\"this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'\">" +
            "</div>" +
            "<button onclick='exploreBarn(" + i + ")' class='btn btn-dark w-full btn-sm' " + dis + ">" + btnText + "</button>" +
        "</div>";
    });
    b.innerHTML = html;
}

function exploreBarn(idx) {
    let lDay = state.player?.lastBarnDay || 0;
    let pDay = state.player?.day || 1;
    if (lDay >= pDay) return showToast("Разведка доступна только 1 раз в день!");
    
    let cash = state.player?.cash || 0;
    if (cash < 50000) return showToast("Не хватает 50,000 ₽ на разведку!");
    
    const maxSlots = getTotalGarageSlots();
    let currentSlots = state.garage ? state.garage.length : 0;
    if (currentSlots >= maxSlots) return showToast("В гараже нет свободного места! Вместимость: " + maxSlots + " мест.");

    state.player.cash -= 50000;
    state.player.lastBarnDay = pDay;

    const template = BARN_FINDS[idx];
    if (!template) return;

    const plate = 'С777ВВ 77';
    let tName = template.name || "Авто";
    let tPow = template.power || 120;
    let tType = template.type || "economy";
    let tBaseP = template.basePrice || 400000;
    let tMVal = template.marketValue || 800000;
    let tImg = template.img || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";

    const foundCar = {
        id: 'barn_' + Date.now(),
        name: tName,
        power: tPow,
        type: tType,
        basePrice: tBaseP,
        price: tBaseP,
        purchaseCost: 50000,
        baseMarketValue: tMVal,
        marketValue: Math.round(tMVal * 0.35),
        img: tImg,
        plate: plate,
        customPlate: plate,
        isStolen: false,
        condition: 20,
        wear: { engine: 20, transmission: 20 },
        tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 },
        bodyThickness: { hood: 800, roof: 140, doors: 600, wings: 900 },
        hiddenDefect: { text: "Долгий простой. Мотор троит, компрессия слабая.", cost: Math.round(tBaseP * 0.35), severity: "Критическая" },
        isRepainted: false,
        isPolished: false
    };

    if (!state.garage) state.garage = [];
    state.garage.push(foundCar);
    
    saveState(); 
    renderBarnFind(); 
    renderGarage();
    openVerdictModal("НАХОДКА! 🏚️", "Вы нашли «" + tName + "»! Автомобиль доставлен в бокс и ждёт восстановления.", true);
}

// ===================== 6. ПОРТОВЫЕ КОНТЕЙНЕРЫ =====================

const activeContainerTimers = {};

function renderContainersList() {
    const r = document.getElementById('containersListRender');
    const lock = document.getElementById('containersLockCover');
    
    let lvl = state.player?.level || 1;
    if (lvl < 20) {
        if (r) r.style.display = 'none';
        if (lock) lock.style.display = 'block';
        return;
    }
    if (lock) lock.style.display = 'none';
    if (!r || typeof CONTAINER_ITEMS === 'undefined') return;
    
    r.style.display = 'block';

    let html = "";
    CONTAINER_ITEMS.forEach(item => {
        if (!item) return;

        let isOpening = !!activeContainerTimers[item.id];
        let progress = isOpening ? activeContainerTimers[item.id].progress : 0;
        let secondsLeft = isOpening ? activeContainerTimers[item.id].secondsLeft : item.timer;

        let iImg = item.img || "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80";
        let iBadge = item.badge || "";
        let iName = item.name || "Контейнер";
        let iCost = item.cost || 0;
        let iDesc = item.desc || "";
        let iTimer = item.timer || 30;

        let dis = isOpening ? "disabled" : "";
        let wrapDisp = isOpening ? "block" : "none";
        let btnText = isOpening ? "Вскрытие... (" + secondsLeft + "с)" : "Открыть контейнер (" + iCost.toLocaleString() + " ₽)";

        html += 
        "<div class='glass-card mb-3'>" +
            "<div class='car-img-wrap' style='height: 140px;'>" +
                "<img src='" + iImg + "' class='car-img' onerror=\"this.src='https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80'\">" +
                "<div class='badge-tag'>" + iBadge + "</div>" +
            "</div>" +
            "<div class='flex-between mb-1'>" +
                "<h4 class='font-bold'>" + iName + "</h4>" +
                "<div class='price-val'>" + iCost.toLocaleString() + " ₽</div>" +
            "</div>" +
            "<p class='sub-label mb-2'>" + iDesc + "</p>" +
            "<div class='container-progress-wrap' style='display: " + wrapDisp + ";'>" +
                "<div class='container-progress-bar' id='cnt_progress_" + item.id + "' style='width: " + progress + "%;'></div>" +
            "</div>" +
            "<div class='sub-label text-center mb-2' id='cnt_timer_text_" + item.id + "' style='display: " + wrapDisp + ";'>" +
                "Таможенное вскрытие: " + secondsLeft + "с" +
            "</div>" +
            "<button id='btn_open_cnt_" + item.id + "' onclick=\"startContainerUnboxing('" + item.id + "', " + iCost + ", " + iTimer + ")\" class='btn btn-cyan w-full' " + dis + ">" + btnText + "</button>" +
        "</div>";
    });
    r.innerHTML = html;
}

function startContainerUnboxing(type, price, durationSec) {
    if (activeContainerTimers[type]) return showToast("Контейнер уже вскрывается!");
    
    let cash = state.player?.cash || 0;
    if (cash < price) return showToast("Не хватает денег на покупку контейнера!");
    
    const maxSlots = getTotalGarageSlots();
    let currentSlots = state.garage ? state.garage.length : 0;
    if (currentSlots >= maxSlots) return showToast("Гараж полон! Освободите место.");

    state.player.cash -= price;
    saveState();
    updateHeaderUI();

    let totalDuration = durationSec;
    let elapsed = 0;

    activeContainerTimers[type] = {
        secondsLeft: totalDuration,
        progress: 0
    };

    renderContainersList();
    showToast("🚢 Таможенники начали вскрытие пломб...");

    const interval = setInterval(() => {
        elapsed += 1;
        let pct = Math.min(100, (elapsed / totalDuration) * 100);
        let rem = Math.max(0, totalDuration - elapsed);

        if (activeContainerTimers[type]) {
            activeContainerTimers[type].progress = pct;
            activeContainerTimers[type].secondsLeft = rem;
        }

        const bar = document.getElementById("cnt_progress_" + type);
        const txt = document.getElementById("cnt_timer_text_" + type);
        const btn = document.getElementById("btn_open_cnt_" + type);

        if (bar) bar.style.width = pct + "%";
        if (txt) txt.innerText = "Таможенное вскрытие: " + rem + "с";
        if (btn) btn.innerText = "Вскрытие... (" + rem + "с)";

        if (elapsed >= totalDuration) {
            clearInterval(interval);
            delete activeContainerTimers[type];
            finishContainerOpening(type, price);
        }
    }, 1000);
}

function finishContainerOpening(type, price) {
    let won = {
        id: 'c_' + Date.now(),
        name: "Lexus RX 350",
        power: 300,
        type: "premium",
        basePrice: price,
        price: price,
        baseMarketValue: Math.round(price * 1.3),
        img: "assets/cars/premium/rx350.jpg",
        condition: 100,
        wear: { engine: 100, transmission: 100 },
        tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }
    };

    if (type === 'dubai') {
        won.name = "Porsche 911 GT3 RS";
        won.power = 525;
        won.type = "hyper";
        won.img = "assets/cars/hyper/911.jpg";
    } else if (type === 'japan') {
        won.name = "Nissan GT-R R35";
        won.power = 570;
        won.type = "hyper";
        won.img = "assets/cars/hyper/gtr.jpg";
    }

    const plate = 'А777АА 777';
    won.plate = plate;
    won.customPlate = plate;
    
    let plateVal = (typeof calculatePlateValue === 'function') ? calculatePlateValue(plate) : 250000;
    let baseM = won.baseMarketValue || won.price;
    won.marketValue = baseM + plateVal;

    if (!state.garage) state.garage = [];
    state.garage.push(won);
    
    saveState(); 
    renderGarage();
    renderContainersList();

    playSound('win');
    tgHaptic('success');
    openVerdictModal("КОНТЕЙНЕР ВСКРЫТ! 🎁", "В контейнере находился автомобиль: «" + won.name + "» с номерами " + plate + "!", true);
}

// ===================== 7. НЕДВИЖИМОСТЬ =====================

function renderHousing() {
    const list = document.getElementById('housingMarketList');
    if (!list || typeof HOUSING_LIST === 'undefined') return;

    let html = "";
    HOUSING_LIST.forEach(h => {
        if (!h) return;
        
        let isCurrent = state.player && state.player.housingId === h.id;
        let isOwned = state.player && state.player.ownedHouses && state.player.ownedHouses.includes(h.id);
        let lvl = state.player?.level || 1;
        let isLocked = lvl < h.minLevel;

        let rentBtn = "";
        let hRent = h.rent || 0;

        if (hRent > 0 && !isOwned) {
            let rClass = (isCurrent && state.player?.housingType === 'rent') ? "btn-cyan" : "btn-dark";
            let dis = isLocked ? "disabled" : "";
            rentBtn = "<button onclick=\"rentHouse('" + h.id + "')\" class='btn " + rClass + " btn-sm' " + dis + ">Аренда (" + hRent.toLocaleString() + " ₽/д)</button>";
        }

        let buyBtn = "";
        let hBuy = h.buyPrice || 0;

        if (hBuy > 0) {
            let bClass = isOwned ? "btn-green" : "btn-amber";
            let bText = isOwned ? "В собственности" : "Купить (" + (hBuy / 1000000).toFixed(1) + "M ₽)";
            let dis = (isOwned || isLocked) ? "disabled" : "";
            buyBtn = "<button onclick=\"buyHouse('" + h.id + "')\" class='btn " + bClass + " btn-sm' " + dis + ">" + bText + "</button>";
        }

        let hImg = h.img || "https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=400&q=80";
        let hName = h.name || "";
        let hSlots = h.slots || 0;
        let hMood = h.moodBonus || 0;
        let hMinLvl = h.minLevel || 1;

        let curText = isCurrent ? " 🏠 (Вы здесь)" : "";
        let ownText = isOwned ? "СОБСТВЕННОСТЬ" : "АРЕНДА";
        let borderSty = isCurrent ? "border-color:var(--cyan);" : "";
        let imgSty = isLocked ? "height: 125px; filter: grayscale(1); opacity: 0.7;" : "height: 125px;";
        let lockHtml = isLocked ? "<div class='cooldown-timer' style='display:flex; font-size:14px; opacity:1;'><i class='fa-solid fa-lock mr-2'></i>С " + hMinLvl + " УР</div>" : "";

        html += 
        "<div class='glass-card mb-3' style='" + borderSty + "'>" +
            "<div class='car-img-wrap' style='" + imgSty + "'>" +
                "<img src='" + hImg + "' class='car-img' onerror=\"this.src='https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=400&q=80'\">" +
                "<div class='badge-tag'>" + ownText + "</div>" +
                lockHtml +
            "</div>" +
            "<div class='flex-between mb-1'>" +
                "<h4 class='font-bold'>" + hName + curText + "</h4>" +
            "</div>" +
            "<div class='sub-label mb-2'>+" + hSlots + " боксов гаража / +" + hMood + "% к настроению в день</div>" +
            "<div class='grid-2'>" +
                rentBtn +
                buyBtn +
            "</div>" +
        "</div>";
    });
    list.innerHTML = html;
}

function rentHouse(id) {
    state.player.housingId = id;
    state.player.housingType = 'rent';
    saveState(); 
    renderHousing(); 
    renderGarage();
    showToast("Вы переехали! Вместимость гаража пересчитана.");
}

function buyHouse(id) {
    const house = HOUSING_LIST.find(h => h && h.id === id);
    if (!house) return;
    
    let cash = state.player?.cash || 0;
    let hBuy = house.buyPrice || 0;

    if (cash < hBuy) return showToast("Не хватает денег на покупку!");
    
    state.player.cash -= hBuy;
    if (!state.player.ownedHouses) state.player.ownedHouses = [];
    state.player.ownedHouses.push(id);
    state.player.housingId = id;
    state.player.housingType = 'owned';
    
    saveState(); 
    renderHousing(); 
    renderGarage();
    
    let hName = house.name || "";
    openVerdictModal("НЕДВИЖИМОСТЬ КУПЛЕНА! 🏠", "Вы приобрели «" + hName + "»! Места закреплены навсегда.", true);
}

// ===================== 8. РАЦИОН ПИТАНИЯ =====================

function renderDiets() {
    const dietList = document.getElementById('dietList');
    if (!dietList || typeof DIETS === 'undefined') return;

    let html = "";
    DIETS.forEach(d => {
        if (!d) return;
        
        let isSel = state.player?.diet === d.id;
        let dName = d.name || "";
        let dDesc = d.desc || "";
        let dHung = d.hunger || 0;
        let dMood = d.mood || 0;
        let dCost = d.cost || 0;

        let moodPrefix = dMood > 0 ? "+" : "";
        let btnClass = isSel ? "btn-green" : "btn-dark";
        let btnText = isSel ? "Выбрано" : (dCost === 0 ? "Бесплатно" : dCost.toLocaleString() + " ₽");

        html += 
        "<div class='glass-card flex-between p-2 mb-2'>" +
            "<div>" +
                "<div class='font-bold text-xs'>" + dName + "</div>" +
                "<div class='sub-label mb-1'>" + dDesc + "</div>" +
                "<div class='text-xs color-green'>+" + dHung + "% сытости / " + moodPrefix + dMood + " куража</div>" +
            "</div>" +
            "<button onclick=\"selectDiet('" + d.id + "')\" class='btn " + btnClass + " btn-sm btn-auto' style='min-width: 85px;'>" +
                btnText +
            "</button>" +
        "</div>";
    });
    dietList.innerHTML = html;
}

function selectDiet(id) {
    state.player.diet = id;
    saveState(); 
    renderDiets();
    showToast("Рацион питания изменен!");
}

// ===================== 9. КОЛЕСО ФОРТУНЫ =====================

const WHEEL_SECTORS = [
    { label: "15,000 ₽", color: "#0284c7", textColor: "#fff", type: "cash", value: 15000 },
    { label: "1 🤝 Связь", color: "#9333ea", textColor: "#fff", type: "conn", value: 1 },
    { label: "50,000 ₽", color: "#059669", textColor: "#fff", type: "cash", value: 50000 },
    { label: "5 Stars ⭐", color: "#d97706", textColor: "#fff", type: "stars", value: 5 },
    { label: "100,000 ₽", color: "#0284c7", textColor: "#fff", type: "cash", value: 100000 },
    { label: "2 🎟️ Талона", color: "#c084fc", textColor: "#000", type: "tickets", value: 2 },
    { label: "250,000 ₽", color: "#10b981", textColor: "#fff", type: "cash", value: 250000 },
    { label: "ДЖЕКПОТ!", color: "#e11d48", textColor: "#fff", type: "jackpot", value: 500000 }
];

let currentWheelAngle = 0;
let isWheelSpinning = false;

function initWheelModule() {
    drawWheelCanvas(currentWheelAngle);
    const now = Date.now();
    let lastSpin = state.player?.lastFreeSpin || 0;
    let canFree = (now - lastSpin) >= 86400000;
    
    const statusBadge = document.getElementById('wheelStatusBadge');
    if (statusBadge) {
        if (canFree) {
            statusBadge.innerText = "Доступно";
            statusBadge.className = "tag-badge bg-tag-green";
        } else {
            let hours = Math.ceil((86400000 - (now - lastSpin)) / 3600000);
            statusBadge.innerText = "КД " + hours + "ч";
            statusBadge.className = "tag-badge bg-tag-amber";
        }
    }
}

function drawWheelCanvas(angle) {
    const canvas = document.getElementById('wheelCanvas'); 
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width; 
    const center = size / 2; 
    const radius = center - 8;
    const numSectors = WHEEL_SECTORS.length; 
    const arc = (2 * Math.PI) / numSectors;

    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < numSectors; i++) {
        const sectorAngle = angle + (i * arc);
        ctx.beginPath();
        ctx.fillStyle = WHEEL_SECTORS[i].color;
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, sectorAngle, sectorAngle + arc);
        ctx.lineTo(center, center);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)"; 
        ctx.lineWidth = 3; 
        ctx.stroke();

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(sectorAngle + arc / 2);
        ctx.textAlign = "right"; 
        ctx.fillStyle = WHEEL_SECTORS[i].textColor;
        ctx.font = "bold 24px -apple-system, sans-serif";
        ctx.fillText(WHEEL_SECTORS[i].label, radius - 28, 8);
        ctx.restore();
    }

    ctx.beginPath(); 
    ctx.arc(center, center, radius, 0, 2 * Math.PI); 
    ctx.strokeStyle = "#00f2fe"; 
    ctx.lineWidth = 6; 
    ctx.stroke();
}

function spinWheelAction(isFree) {
    if (isWheelSpinning) return;
    const now = Date.now();
    let lastSpin = state.player?.lastFreeSpin || 0;

    if (isFree) {
        if (now - lastSpin < 86400000) {
            let hours = Math.ceil((86400000 - (now - lastSpin)) / 3600000);
            return showToast("Бесплатный спин через " + hours + " ч.");
        }
        state.player.lastFreeSpin = now;
    } else {
        let stars = state.player?.stars || 0;
        if (stars < 25) return showToast("Не хватает 25 Telegram Stars ⭐!");
        state.player.stars -= 25;
    }

    isWheelSpinning = true; 
    saveState(); 
    updateHeaderUI();

    const winningIndex = Math.floor(Math.random() * WHEEL_SECTORS.length);
    const numSectors = WHEEL_SECTORS.length; 
    const arc = (2 * Math.PI) / numSectors;
    const targetSectorCenter = (3 * Math.PI / 2) - (winningIndex * arc) - (arc / 2);
    const extraRotations = (6 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
    const targetAngle = currentWheelAngle + extraRotations + (targetSectorCenter - (currentWheelAngle % (2 * Math.PI)));

    const startAngle = currentWheelAngle; 
    const duration = 3800; 
    const startTime = performance.now();

    function animateWheel(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        currentWheelAngle = startAngle + (targetAngle - startAngle) * easeOut;
        drawWheelCanvas(currentWheelAngle);

        if (progress < 1) {
            requestAnimationFrame(animateWheel);
        } else { 
            isWheelSpinning = false; 
            giveWheelPrize(WHEEL_SECTORS[winningIndex]); 
            initWheelModule(); 
        }
    }
    requestAnimationFrame(animateWheel);
}

function giveWheelPrize(prize) {
    playSound('win'); 
    tgHaptic('success');
    if (prize.type === 'cash') {
        state.player.cash += prize.value;
        openVerdictModal("ПРИЗ В КОЛЕСЕ! 🎉", "Выигрыш: +" + prize.value.toLocaleString() + " ₽ на баланс!", true, prize.value);
    } else if (prize.type === 'conn') {
        state.player.connections = (state.player.connections || 0) + prize.value;
        openVerdictModal("СВЯЗИ ОТ РЕШАЛЫ! 🤝", "Начислено: +" + prize.value + " Связь!", true);
    } else if (prize.type === 'stars') {
        state.player.stars += prize.value;
        openVerdictModal("ЗВЁЗДЫ! ⭐", "Начислено: +" + prize.value + " Telegram Stars!", true);
    } else if (prize.type === 'tickets') {
        let maxT = state.player?.maxExpressTickets || 25;
        state.player.expressTickets = Math.min(maxT, (state.player.expressTickets || 0) + prize.value);
        openVerdictModal("ТАЛОНЫ! 🎟️", "Получено: +" + prize.value + " экспресс-пропуска!", true);
    } else if (prize.type === 'jackpot') {
        state.player.cash += prize.value; 
        state.player.stars += 25;
        let maxT = state.player?.maxExpressTickets || 25;
        state.player.expressTickets = Math.min(maxT, (state.player.expressTickets || 0) + 5);
        openVerdictModal("ГРАНД ДЖЕКПОТ! 👑", "ДЖЕКПОТ: +500,000 ₽, +25 Stars ⭐ и +5 Пропусков 🎟️!", true, 500000);
    }
    saveState(); 
    updateHeaderUI();
}

// ===================== 10. МИНИ-ИГРА: НАПЁРСТКИ ПЕРЕКУПА (x2) =====================

let currentThimblesBet = 10000;
let isThimblesLocked = false;

function setThimblesBet(amt) {
    if (isThimblesLocked) return;
    currentThimblesBet = amt;
    setTxt('thimblesBetText', amt.toLocaleString() + " ₽");
    playSound('tick');
}

function playThimbles(chosenIndex) {
    if (isThimblesLocked) return;
    
    let cash = state.player?.cash || 0;
    if (cash < currentThimblesBet) return showToast("Не хватает " + currentThimblesBet.toLocaleString() + " ₽ для игры!");
    
    isThimblesLocked = true;
    state.player.cash -= currentThimblesBet;
    saveState();
    updateHeaderUI();
    
    setTxt('thimblesResultText', "Стаканчики крутятся... Следите внимательно!");
    playSound('tick');
    
    for (let i = 0; i < 3; i++) {
        setTxt('thimble-secret-' + i, "");
        const cup = document.getElementById('thimble-cup-' + i);
        if (cup) cup.style.transform = "translateY(0)";
    }

    setTimeout(() => {
        const winningIndex = Math.floor(Math.random() * 3);
        const isWin = (chosenIndex === winningIndex);

        for (let i = 0; i < 3; i++) {
            const cup = document.getElementById('thimble-cup-' + i);
            if (cup) cup.style.transform = "translateY(-12px)";
            setTxt('thimble-secret-' + i, (i === winningIndex) ? "🔑" : "💨");
        }

        if (isWin) {
            const prize = currentThimblesBet * 2;
            state.player.cash += prize;
            saveState();
            updateHeaderUI();
            playSound('win');
            tgHaptic('success');
            setTxt('thimblesResultText', "<span class='color-green font-bold'>ПОБЕДА! Ключ найден! (+" + prize.toLocaleString() + " ₽)</span>");
        } else {
            playSound('tick');
            tgHaptic('error');
            setTxt('thimblesResultText', "<span class='color-red font-bold'>Мимо! Стаканчик оказался пустым (-" + currentThimblesBet.toLocaleString() + " ₽)</span>");
        }

        setTimeout(() => {
            for (let i = 0; i < 3; i++) {
                const cup = document.getElementById('thimble-cup-' + i);
                if (cup) cup.style.transform = "translateY(0)";
            }
            isThimblesLocked = false;
        }, 1800);
    }, 700);
}

// ===================== 11. ПОДПОЛЬНЫЙ КЛУБ «21» =====================

let casinoBet = 0; 
let casinoState = 'betting'; 
let pHand = []; 
let dHand = []; 
let deck = [];

function getCasinoMaxBet() { 
    let lvl = state.player?.level || 1;
    let cash = state.player?.cash || 0;

    if (lvl <= 10) return Math.min(50000, Math.max(5000, Math.round(cash * 0.10)));
    if (lvl <= 20) return Math.min(300000, Math.max(15000, Math.round(cash * 0.20)));
    return Math.min(2500000, Math.max(50000, Math.round(cash * 0.40)));
}

function initCasino() { 
    setTxt('casinoMaxBetText', "Лимит: " + getCasinoMaxBet().toLocaleString() + " ₽"); 
    if (casinoState === 'betting') resetCasinoUI(); 
}

function resetCasinoUI() { 
    casinoBet = 0; 
    pHand = []; 
    dHand = []; 
    casinoState = 'betting'; 
    setTxt('currentBetDisplay', '0 ₽'); 
    setTxt('casinoMaxBetText', "Лимит: " + getCasinoMaxBet().toLocaleString() + " ₽"); 
    
    const bArea = document.getElementById('casinoBettingArea');
    if (bArea) bArea.style.display = 'block'; 
    const pArea = document.getElementById('casinoPlayingArea');
    if (pArea) pArea.style.display = 'none'; 
    const rArea = document.getElementById('casinoResultArea');
    if (rArea) rArea.style.display = 'none'; 
    
    const pHBox = document.getElementById('playerHandBox');
    if (pHBox) pHBox.innerHTML = ''; 
    const dHBox = document.getElementById('dealerHandBox');
    if (dHBox) dHBox.innerHTML = ''; 
    
    setTxt('playerScore', '0'); 
    setTxt('dealerScore', '?'); 
}

function addCasinoBet(amt) { 
    const maxAllowed = getCasinoMaxBet(); 
    let cash = state.player?.cash || 0;

    if (casinoBet + amt > maxAllowed) {
        casinoBet = maxAllowed;
    } else if (cash < casinoBet + amt) {
        return showToast("Не хватает денег!"); 
    } else {
        casinoBet += amt; 
    }
    setTxt('currentBetDisplay', casinoBet.toLocaleString() + " ₽"); 
}

function setCasinoMaxBet() { 
    let cash = state.player?.cash || 0;
    casinoBet = Math.min(getCasinoMaxBet(), cash); 
    setTxt('currentBetDisplay', casinoBet.toLocaleString() + " ₽"); 
}

function clearCasinoBet() { 
    casinoBet = 0; 
    setTxt('currentBetDisplay', '0 ₽'); 
}

function get21Deck() { 
    const suits = ['♠','♥','♣','♦']; 
    const vals = ['6','7','8','9','10','J','Q','K','A']; 
    let d = []; 
    suits.forEach(s => { 
        vals.forEach(v => { d.push({ v: v, s: s }); }); 
    }); 
    return d.sort(() => Math.random() - 0.5); 
}

function get21Score(hand) { 
    let score = 0; 
    let aces = 0; 
    hand.forEach(c => { 
        if (c.v === 'J') score += 2; 
        else if (c.v === 'Q') score += 3; 
        else if (c.v === 'K') score += 4; 
        else if (c.v === 'A') { score += 11; aces += 1; } 
        else score += parseInt(c.v); 
    }); 
    while (score > 21 && aces > 0) { 
        score -= 10; 
        aces -= 1; 
    } 
    return score; 
}

function isTwoAces(hand) { 
    return !!(hand && hand.length === 2 && hand[0].v === 'A' && hand[1].v === 'A');
}

function renderCard(c, hidden) { 
    if (hidden) return "<div class='playing-card card-hidden' style='background:#131c2e; padding:4px 8px; border-radius:6px; border:1px solid var(--border-glass);'>?</div>"; 
    let colorClass = (c.s === '♥' || c.s === '♦') ? 'color-red' : 'color-cyan';
    return "<div class='playing-card " + colorClass + "' style='background:#131c2e; padding:4px 8px; border-radius:6px; border:1px solid var(--border-glass); font-weight:900;'>" + c.v + c.s + "</div>"; 
}

function updateCasinoTable(showDealerHidden) { 
    const pHBox = document.getElementById('playerHandBox');
    if (pHBox) pHBox.innerHTML = pHand.map(c => renderCard(c, false)).join(''); 
    
    let pScoreText = isTwoAces(pHand) ? '21 (Золотое!)' : get21Score(pHand);
    setTxt('playerScore', pScoreText); 

    const dHBox = document.getElementById('dealerHandBox');
    if (showDealerHidden) { 
        if (dHBox) dHBox.innerHTML = dHand.map(c => renderCard(c, false)).join(''); 
        let dScoreText = isTwoAces(dHand) ? '21 (Золотое!)' : get21Score(dHand);
        setTxt('dealerScore', dScoreText); 
    } else { 
        if (dHBox && dHand.length >= 2) {
            dHBox.innerHTML = renderCard(dHand[0], false) + renderCard(dHand[1], true); 
        }
        let initialDealer = (dHand.length > 0 && dHand[0].v === 'A') ? '11' : '?';
        setTxt('dealerScore', initialDealer); 
    } 
}

function startCasinoGame() {
    if (casinoBet <= 0) return showToast("Сделайте ставку!"); 
    let cash = state.player?.cash || 0;
    if (cash < casinoBet) return showToast("Не хватает денег!");
    
    state.player.cash -= casinoBet; 
    saveState(); 
    
    deck = get21Deck(); 
    pHand = [deck.pop(), deck.pop()]; 
    dHand = [deck.pop(), deck.pop()]; 
    casinoState = 'playing'; 
    
    const bArea = document.getElementById('casinoBettingArea');
    if (bArea) bArea.style.display = 'none'; 
    const pArea = document.getElementById('casinoPlayingArea');
    if (pArea) pArea.style.display = 'block'; 
    
    updateCasinoTable(false); 
    
    if (get21Score(pHand) === 21 || isTwoAces(pHand)) {
        setTimeout(standCasino, 600);
    }
}

function hitCasino() { 
    if (casinoState !== 'playing') return; 
    pHand.push(deck.pop()); 
    updateCasinoTable(false); 
    if (get21Score(pHand) >= 21) setTimeout(standCasino, 500); 
}

function standCasino() { 
    if (casinoState !== 'playing') return; 
    const pArea = document.getElementById('casinoPlayingArea');
    if (pArea) pArea.style.display = 'none'; 
    endCasinoGame(); 
}

function endCasinoGame() {
    casinoState = 'done';
    let pScore = isTwoAces(pHand) ? 21 : get21Score(pHand);

    if (pScore <= 21) { 
        let dScore = isTwoAces(dHand) ? 21 : get21Score(dHand); 
        while (dScore < 17 && deck.length > 0) { 
            dHand.push(deck.pop()); 
            dScore = isTwoAces(dHand) ? 21 : get21Score(dHand); 
        } 
    }
    
    updateCasinoTable(true); 
    let dScore = isTwoAces(dHand) ? 21 : get21Score(dHand); 
    
    const resBox = document.getElementById('casinoResultArea'); 
    if (resBox) resBox.style.display = 'block'; 
    
    if (pScore > 21) {
        if (resBox) resBox.innerHTML = "<span class='color-red'>ПЕРЕБОР (-" + casinoBet.toLocaleString() + " ₽)</span>";
    } else if (dScore > 21 || pScore > dScore) { 
        let mult = isTwoAces(pHand) ? 2.5 : 2;
        const payout = Math.round(casinoBet * mult); 
        state.player.cash += payout; 
        if (resBox) resBox.innerHTML = "<span class='color-green'>ПОБЕДА (+" + (payout - casinoBet).toLocaleString() + " ₽)</span>"; 
        playSound('win'); 
    } else if (pScore === dScore) { 
        state.player.cash += casinoBet; 
        if (resBox) resBox.innerHTML = "<span class='color-amber'>НИЧЬЯ (Возврат)</span>"; 
    } else {
        if (resBox) resBox.innerHTML = "<span class='color-red'>КРУПЬЕ ЗАБРАЛ БАНК</span>";
    }
    
    if (resBox) resBox.innerHTML += "<br><button onclick='resetCasinoUI()' class='btn btn-dark btn-sm mt-2'>Сыграть снова</button>"; 
    saveState(); 
    updateHeaderUI();
}

// ===================== 12. СМЕНА ДНЯ И РАСХОД СЫРЬЯ =====================

function nextDayAction() {
    let day = state.player?.day || 1;
    state.player.day = day + 1;
    
    let lvl = state.player?.level || 1;
    let dailyCost = 1500;
    
    if (typeof DIETS !== 'undefined') {
        const diet = DIETS.find(d => d && d.id === state.player?.diet);
        if (diet && diet.cost > 0) dailyCost = diet.cost;
    }

    if (state.player?.housingType === 'rent' && typeof HOUSING_LIST !== 'undefined') {
        const house = HOUSING_LIST.find(h => h && h.id === state.player?.housingId);
        if (house && house.rent > 0) dailyCost += house.rent;
    }

    if (lvl >= 20 && state.garage && state.garage.length > 0) {
        let garageValue = 0;
        state.garage.forEach(c => {
            if (c) garageValue += (c.marketValue || c.price || 0);
        });
        dailyCost += Math.round(garageValue * 0.005);
    }

    let debt = state.player?.loanDebt || 0;
    if (debt > 0) {
        state.player.loanDebt = debt + Math.round(debt * 0.15);
    }

    if (state.garage) {
        state.garage.forEach(car => {
            if (car && car.impounded) {
                car.impoundedDays = (car.impoundedDays || 0) + 1;
            }
        });
    }

    let cash = state.player?.cash || 0;
    state.player.cash = Math.max(-500000, cash - dailyCost);
    state.player.fuel = 100;
    
    let curT = state.player?.expressTickets || 0;
    let maxT = state.player?.maxExpressTickets || 25;
    state.player.expressTickets = Math.min(maxT, curT + 25);

    let pIm = state.player?.policeImmunityDays || 0;
    if (pIm > 0) state.player.policeImmunityDays = pIm - 1;

    // Начисление дохода предприятий с учетом расхода сырья
    if (state.businesses) {
        state.businesses.forEach(b => {
            if (b && b.level > 0) {
                let st = b.stored || 0;
                let inc = b.income || 0;
                let bLvl = b.level || 1;
                let stock = (typeof b.stock === 'number') ? b.stock : 100;

                // Если есть сырьё — генерируем доход
                let efficiency = stock > 0 ? (stock / 100) : 0;
                let generatedIncome = Math.round(inc * bLvl * efficiency);
                b.stored = st + generatedIncome;

                // Расходуем 20% сырья в сутки
                b.stock = Math.max(0, stock - 20);
            }
        });
    }

    generateConfiscatedCarLot();
    if (typeof populateMarketFeed === 'function') populateMarketFeed(); 
    if (typeof refreshPlateCatalog === 'function') refreshPlateCatalog(); 
    
    saveState(); 
    renderDiets(); 
    renderHousing(); 
    renderConfiscatedCardUI();
    checkBusinessAccess();
    if (typeof renderShopPlates === 'function') renderShopPlates();
    
    showToast("День " + state.player.day + ": списано " + dailyCost.toLocaleString() + " ₽ расходов");
    updateHeaderUI();
}

function watchAdsgram() { 
    state.player.cash += 25000; 
    state.player.connections = (state.player.connections || 0) + 1; 
    saveState(); 
    updateHeaderUI();
    showToast("+25k ₽ и +1 🤝 за просмотр!"); 
}

function refuelAction(type) { 
    if (type === 'cash') {
        let cash = state.player?.cash || 0;
        if (cash < 5000) return showToast("Нужно 5,000 ₽!");
        state.player.cash -= 5000;
    }
    state.player.fuel = 100; 
    saveState(); 
    updateHeaderUI();
    showToast("Бак заправлен до 100 ⛽!"); 
}

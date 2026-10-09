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
    spawnFloatingReward("+" + totalCollected.toLocaleString() + " ₽");
    showToast("Инкассация: снято " + totalCollected.toLocaleString() + " ₽!");
}

const SHOP_TOOLS = [
    { id: 'gauge', name: 'Цифровой толщиномер ET-111', icon: 'fa-ruler-combined', price: 25000, desc: 'Бесплатно и точно измеряет ЛКП (шпаклёвку/окрасы) на авторынке.', reqLvl: 1 },
    { id: 'obd', name: 'OBD2 Сканер «Вася-Диагност Pro»', icon: 'fa-laptop-code', price: 65000, desc: 'Открывает диагностику блоков ЭБУ, мотора и коробки перед сделкой.', reqLvl: 5 },
    { id: 'endoscope', name: 'Поворотный HD-Эндоскоп', icon: 'fa-camera', price: 110000, desc: 'Заглядывает в цилиндры: защита от покупки задиристых моторов.', reqLvl: 10 },
    { id: 'compressor', name: 'Турбо-бустер и компрессор 12V', icon: 'fa-bolt', price: 40000, desc: '+10 к успеху при выезде на помощь на дороге и реанимации сараев.', reqLvl: 8 }
];

const SHOP_SUPPLIES = [
    { id: 'coffee', name: 'Двойной эспрессо', cost: 450, hunger: 10, mood: 15, desc: 'Бодрит и снимает сонливость.' },
    { id: 'energy', name: 'Энергетик Red Bull Litre', cost: 950, hunger: 15, mood: 30, desc: '+30 куража перед торгами у капота!' },
    { id: 'burger', name: 'Комбо-бургер перекупа', cost: 1800, hunger: 50, mood: 20, desc: 'Быстрый и сытный перекус.' }
];

function switchShopSection(sec) {
    const list = ['tools', 'plates', 'supplies'];
    list.forEach(s => {
        const btn = document.getElementById("shopTab-" + s);
        const block = document.getElementById("shopSec-" + s);
        if (btn) {
            if (s === sec) {
                btn.classList.add('btn-cyan');
                btn.classList.remove('btn-dark');
            } else {
                btn.classList.add('btn-dark');
                btn.classList.remove('btn-cyan');
            }
        }
        if (block) {
            if (s === sec) block.style.display = 'block';
            else block.style.display = 'none';
        }
    });

    if (sec === 'tools') renderShopTools();
    if (sec === 'plates') renderShopPlates();
    if (sec === 'supplies') renderShopSupplies();
}

function renderShopTools() {
    const container = document.getElementById('shopToolsList');
    if (!container) return;

    if (!state.player.tools) {
        state.player.tools = { gauge: false, obd: false, endoscope: false, compressor: false };
    }

    let hasGauge = false;
    if (state.player && state.player.tools && state.player.tools.gauge) hasGauge = true;

    let hasObd = false;
    if (state.player && state.player.tools && state.player.tools.obd) hasObd = true;

    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;

    let canDoContracts = false;
    if (hasGauge && hasObd && lvl >= 15) canDoContracts = true;

    const statusBadge = document.getElementById('syndicateEquipStatus');
    if (statusBadge) {
        if (canDoContracts) {
            statusBadge.innerText = "Заказы: Доступны ✓";
            statusBadge.className = "tag-badge bg-tag-green";
        } else {
            statusBadge.innerText = "Заказы: Нужен Толщиномер + OBD";
            statusBadge.className = "tag-badge bg-tag-amber";
        }
    }

    let html = "";
    SHOP_TOOLS.forEach(tool => {
        let isOwned = false;
        if (state.player && state.player.tools && state.player.tools[tool.id]) isOwned = true;
        
        let isLocked = false;
        if (lvl < tool.reqLvl) isLocked = true;

        let statusColor = "color-amber";
        if (isOwned) statusColor = "color-green";

        let statusText = tool.price.toLocaleString() + " ₽";
        if (isOwned) statusText = "КУПЛЕНО ✓";

        let lockHtml = "";
        if (isLocked) lockHtml = "<div class='sub-label color-red font-bold'>С " + tool.reqLvl + " уровня</div>";

        let btnClass = "btn-cyan";
        if (isOwned) btnClass = "btn-dark";

        let dis = "";
        if (isOwned || isLocked) dis = "disabled";

        let btnText = "Купить";
        if (isOwned) btnText = "В наличии";

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
    
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;

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
    
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;

    if (cash < item.cost) return showToast("Не хватает денег!");
    state.player.cash -= item.cost;
    
    let hng = 80;
    if (state.player && state.player.hunger) hng = state.player.hunger;
    state.player.hunger = Math.min(100, hng + item.hunger);
    
    let mod = 85;
    if (state.player && state.player.mood) mod = state.player.mood;
    state.player.mood = Math.min(100, mod + item.mood);
    
    saveState();
    updateHeaderUI();
    showToast("Употреблено: " + item.name + "!");
}

function renderShopPlates() {
    const container = document.getElementById('plateMarketListDetailed');
    if (!container) return;
    
    let noPlates = false;
    if (!state.plateCatalog) noPlates = true;
    else if (state.plateCatalog.length === 0) noPlates = true;

    if (noPlates) {
        if (typeof refreshPlateCatalog === 'function') refreshPlateCatalog();
    }
    
    let html = "";
    if (state.plateCatalog) {
        state.plateCatalog.forEach((item, idx) => {
            if (!item) return;
            let price = 0;
            if (item.price) price = item.price;
            let pStr = "ТРАНЗИТ";
            if (item.plate) pStr = item.plate;

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
    
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;

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
        let bxp = 60;
        if (t.reqClass === 'premium') bxp = 120;

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
    
    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;

    if (lvl < 15) {
        if (c) c.style.display = 'none';
        if (lock) lock.style.display = 'block';
        return;
    }
    if (lock) lock.style.display = 'none';
    if (!c) return;
    c.style.display = 'block';
    
    let hasGauge = false;
    if (state.player && state.player.tools && state.player.tools.gauge) hasGauge = true;

    let hasObd = false;
    if (state.player && state.player.tools && state.player.tools.obd) hasObd = true;

    let hasTools = false;
    if (hasGauge && hasObd) hasTools = true;

    if (!hasTools) {
        c.innerHTML = 
        "<div class='glass-card text-center py-6'>" +
            "<i class='fa-solid fa-lock color-amber' style='font-size:32px; margin-bottom:10px;'></i>" +
            "<h4 class='font-bold'>Нужно профессиональное оборудование!</h4>" +
            "<p class='sub-label mt-1 mb-3'>Для подбора авто требуются <b>Толщиномер</b> и <b>OBD2 Сканер</b>.</p>" +
            "<button onclick=\"switchTab('tabShop')\" class='btn btn-amber btn-auto'>Перейти в Маркет 🛒</button>" +
        "</div>";
        return;
    }

    let noContr = false;
    if (!state.contracts) noContr = true;
    else if (state.contracts.length === 0) noContr = true;

    if (noContr) {
        generateContracts();
    }

    let html = "";
    state.contracts.forEach((cnt, i) => {
        if (!cnt) return;

        let suitableCar = null;
        if (state.garage && state.garage.length > 0) {
            suitableCar = state.garage.find(car => {
                if (!car) return false;
                if (car.type !== cnt.reqClass) return false;
                if (car.impounded) return false;
                let cPow = 100;
                if (car.power) cPow = car.power;
                if (cPow < cnt.minHp) return false;
                if (cnt.cleanOnly && car.isStolen) return false;
                return true;
            });
        }

        let btnClass = "btn-dark";
        let btnText = "Нет подходящего авто в гараже";
        if (suitableCar) {
            btnClass = "btn-green";
            let sName = "Авто"; if (suitableCar.name) sName = suitableCar.name;
            let cRew = 0; if (cnt.reward) cRew = cnt.reward;
            btnText = "✓ Отдать «" + sName + "» (Выплата +" + cRew.toLocaleString() + " ₽)";
        }
        
        let cRew = 0; if (cnt.reward) cRew = cnt.reward;
        let cAva = ""; if (cnt.avatar) cAva = cnt.avatar;
        let cClient = ""; if (cnt.client) cClient = cnt.client;
        let cDesc = ""; if (cnt.desc) cDesc = cnt.desc;
        let cClass = ""; if (cnt.reqClass) cClass = cnt.reqClass.toUpperCase();
        let cHp = 0; if (cnt.minHp) cHp = cnt.minHp;
        
        let cleanText = "Любая история";
        if (cnt.cleanOnly) cleanText = "Только чистый VIN";

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
            if (!car) return false;
            if (car.type !== cnt.reqClass) return false;
            if (car.impounded) return false;
            let cPow = 100;
            if (car.power) cPow = car.power;
            if (cPow < cnt.minHp) return false;
            if (cnt.cleanOnly && car.isStolen) return false;
            return true;
        });
    }

    if (carIdx === -1) {
        let rClass = ""; if (cnt.reqClass) rClass = cnt.reqClass.toUpperCase();
        return showToast("Нужен не арестованный авто класса " + rClass + " от " + cnt.minHp + " л.с.!");
    }

    const car = state.garage[carIdx];
    state.garage.splice(carIdx, 1);

    let mVal = 100000;
    if (car.marketValue) mVal = car.marketValue;
    else if (car.price) mVal = car.price;

    let cRew = 0; if (cnt.reward) cRew = cnt.reward;

    const totalPayout = mVal + cRew;
    state.player.cash += totalPayout;
    
    if (!state.player.stats) state.player.stats = {};
    if (!state.player.stats.sold) state.player.stats.sold = 0;
    state.player.stats.sold += 1;

    if (!state.player.stats.totalNetProfit) state.player.stats.totalNetProfit = 0;
    state.player.stats.totalNetProfit += cRew;
    
    let bxp = 50; if (cnt.bonusXp) bxp = cnt.bonusXp;
    addXp(bxp);

    state.contracts.splice(idx, 1);
    saveState();
    renderGarage();
    renderContracts();

    tgHaptic('success');
    playSound('win');
    
    let cClient = ""; if (cnt.client) cClient = cnt.client;
    let cName = "Авто"; if (car.name) cName = car.name;

    openVerdictModal("ЗАКАЗ ВЫПОЛНЕН! 🤝", cClient + " забрал " + cName + ". Оплата зачислена!", true, totalPayout, cRew);
}

function refreshContractsManual() {
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;
    if (cash < 15000) return showToast("Обновление базы стоит 15,000 ₽!");
    
    state.player.cash -= 15000;
    generateContracts();
    saveState();
    renderContracts();
    showToast("Список заказов обновлен!");
}

function renderBarnFind() {
    const b = document.getElementById('barnFindContent');
    if (!b) return;
    if (typeof BARN_FINDS === 'undefined') return;

    let lDay = 0;
    if (state.player && state.player.lastBarnDay) lDay = state.player.lastBarnDay;
    
    let pDay = 1;
    if (state.player && state.player.day) pDay = state.player.day;

    let canExplore = false;
    if (lDay < pDay) canExplore = true;

    let html = "";
    BARN_FINDS.forEach((barn, i) => {
        let bName = ""; if (barn.name) bName = barn.name;
        let bVal = 0; if (barn.marketValue) bVal = barn.marketValue;
        let bImg = "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
        if (barn.img) bImg = barn.img;

        let dis = "";
        if (!canExplore) dis = "disabled";

        let btnText = "Разведать сарай (50,000 ₽)";
        if (!canExplore) btnText = "Разведка будет доступна завтра";

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
    let lDay = 0;
    if (state.player && state.player.lastBarnDay) lDay = state.player.lastBarnDay;
    let pDay = 1;
    if (state.player && state.player.day) pDay = state.player.day;

    if (lDay >= pDay) {
        return showToast("Разведка доступна только 1 раз в день!");
    }
    
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;

    if (cash < 50000) {
        return showToast("Не хватает 50,000 ₽ на разведку!");
    }
    
    const maxSlots = getTotalGarageSlots();
    let currentSlots = 0;
    if (state.garage && state.garage.length) currentSlots = state.garage.length;

    if (currentSlots >= maxSlots) {
        return showToast("В гараже нет свободного места! Вместимость: " + maxSlots + " мест.");
    }

    state.player.cash -= 50000;
    state.player.lastBarnDay = pDay;

    const template = BARN_FINDS[idx];
    if (!template) return;

    const plate = 'С777ВВ 77';
    
    let tName = "Авто"; if (template.name) tName = template.name;
    let tPow = 120; if (template.power) tPow = template.power;
    let tType = "economy"; if (template.type) tType = template.type;
    let tBaseP = 400000; if (template.basePrice) tBaseP = template.basePrice;
    let tMVal = 800000; if (template.marketValue) tMVal = template.marketValue;
    let tImg = "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";
    if (template.img) tImg = template.img;

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

const activeContainerTimers = {};

function renderContainersList() {
    const r = document.getElementById('containersListRender');
    const lock = document.getElementById('containersLockCover');
    
    let lvl = 1;
    if (state.player && state.player.level) lvl = state.player.level;

    if (lvl < 20) {
        if (r) r.style.display = 'none';
        if (lock) lock.style.display = 'block';
        return;
    }
    if (lock) lock.style.display = 'none';
    if (!r) return;
    if (typeof CONTAINER_ITEMS === 'undefined') return;
    
    r.style.display = 'block';

    let html = "";
    CONTAINER_ITEMS.forEach(item => {
        if (!item) return;

        let isOpening = false;
        if (activeContainerTimers[item.id]) isOpening = true;

        let progress = 0;
        if (isOpening) progress = activeContainerTimers[item.id].progress;

        let secondsLeft = item.timer;
        if (isOpening) secondsLeft = activeContainerTimers[item.id].secondsLeft;

        let iImg = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80";
        if (item.img) iImg = item.img;
        let iBadge = ""; if (item.badge) iBadge = item.badge;
        let iName = "Контейнер"; if (item.name) iName = item.name;
        let iCost = 0; if (item.cost) iCost = item.cost;
        let iDesc = ""; if (item.desc) iDesc = item.desc;
        let iTimer = 30; if (item.timer) iTimer = item.timer;

        let dis = "";
        if (isOpening) dis = "disabled";

        let wrapDisp = "none";
        if (isOpening) wrapDisp = "block";

        let btnText = "Открыть контейнер (" + iCost.toLocaleString() + " ₽)";
        if (isOpening) btnText = "Вскрытие... (" + secondsLeft + "с)";

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
    
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;

    if (cash < price) return showToast("Не хватает денег на покупку контейнера!");
    
    const maxSlots = getTotalGarageSlots();
    let currentSlots = 0;
    if (state.garage && state.garage.length) currentSlots = state.garage.length;

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
        let pct = (elapsed / totalDuration) * 100;
        if (pct > 100) pct = 100;
        
        let rem = totalDuration - elapsed;
        if (rem < 0) rem = 0;

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
    
    let plateVal = 250000;
    if (typeof calculatePlateValue === 'function') plateVal = calculatePlateValue(plate);

    let baseM = won.price;
    if (won.baseMarketValue) baseM = won.baseMarketValue;

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

function renderHousing() {
    const list = document.getElementById('housingMarketList');
    if (!list) return;
    if (typeof HOUSING_LIST === 'undefined') return;

    let html = "";
    HOUSING_LIST.forEach(h => {
        if (!h) return;
        
        let hId = ""; if (state.player && state.player.housingId) hId = state.player.housingId;
        let isCurrent = false;
        if (hId === h.id) isCurrent = true;

        let isOwned = false;
        if (state.player && state.player.ownedHouses && state.player.ownedHouses.includes(h.id)) isOwned = true;

        let lvl = 1; if (state.player && state.player.level) lvl = state.player.level;
        let isLocked = false;
        if (lvl < h.minLevel) isLocked = true;

        let rentBtn = "";
        let hRent = 0; if (h.rent) hRent = h.rent;

        if (hRent > 0 && !isOwned) {
            let rClass = "btn-dark";
            let hType = ""; if (state.player && state.player.housingType) hType = state.player.housingType;
            if (isCurrent && hType === 'rent') rClass = "btn-cyan";
            
            let dis = ""; if (isLocked) dis = "disabled";
            rentBtn = "<button onclick=\"rentHouse('" + h.id + "')\" class='btn " + rClass + " btn-sm' " + dis + ">Аренда (" + hRent.toLocaleString() + " ₽/д)</button>";
        }

        let buyBtn = "";
        let hBuy = 0; if (h.buyPrice) hBuy = h.buyPrice;

        if (hBuy > 0) {
            let bClass = "btn-amber";
            if (isOwned) bClass = "btn-green";

            let bText = "Купить (" + (hBuy / 1000000).toFixed(1) + "M ₽)";
            if (isOwned) bText = "В собственности";

            let dis = "";
            if (isOwned || isLocked) dis = "disabled";

            buyBtn = "<button onclick=\"buyHouse('" + h.id + "')\" class='btn " + bClass + " btn-sm' " + dis + ">" + bText + "</button>";
        }

        let hImg = "https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=400&q=80";
        if (h.img) hImg = h.img;

        let hName = ""; if (h.name) hName = h.name;
        let hSlots = 0; if (h.slots) hSlots = h.slots;
        let hMood = 0; if (h.moodBonus) hMood = h.moodBonus;
        let hMinLvl = 1; if (h.minLevel) hMinLvl = h.minLevel;

        let curText = "";
        if (isCurrent) curText = " 🏠 (Вы здесь)";

        let ownText = "АРЕНДА";
        if (isOwned) ownText = "СОБСТВЕННОСТЬ";

        let borderSty = "";
        if (isCurrent) borderSty = "border-color:var(--cyan);";

        let imgSty = "height: 125px;";
        if (isLocked) imgSty += " filter: grayscale(1); opacity: 0.7;";

        let lockHtml = "";
        if (isLocked) {
            lockHtml = "<div class='cooldown-timer' style='display:flex; font-size:14px; opacity:1;'><i class='fa-solid fa-lock mr-2'></i>С " + hMinLvl + " УР</div>";
        }

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
    
    let cash = 0;
    if (state.player && state.player.cash) cash = state.player.cash;
    
    let hBuy = 0; if (house.buyPrice) hBuy = house.buyPrice;

    if (cash < hBuy) return showToast("Не хватает денег на покупку!");
    
    state.player.cash -= hBuy;
    if (!state.player.ownedHouses) state.player.ownedHouses = [];
    state.player.ownedHouses.push(id);
    state.player.housingId = id;
    state.player.housingType = 'owned';
    
    saveState(); 
    renderHousing(); 
    renderGarage();
    
    let hName = ""; if (house.name) hName = house.name;
    openVerdictModal("НЕДВИЖИМОСТЬ КУПЛЕНА! 🏠", "Вы приобрели «" + hName + "»! Места закреплены навсегда.", true);
}

function renderDiets() {
    const dietList = document.getElementById('dietList');
    if (!dietList) return;
    if (typeof DIETS === 'undefined') return;

    let html = "";
    DIETS.forEach(d => {
        if (!d) return;
        
        let pDiet = ""; if (state.player && state.player.diet) pDiet = state.player.diet;
        let isSel = false; if (pDiet === d.id) isSel = true;

        let dName = ""; if (d.name) dName = d.name;
        let dDesc = ""; if (d.desc) dDesc = d.desc;
        let dHung = 0; if (d.hunger) dHung = d.hunger;
        let dMood = 0; if (d.mood) dMood = d.mood;
        let dCost = 0; if (d.cost) dCost = d.cost;

        let moodPrefix = "";
        if (dMood > 0) moodPrefix = "+";

        let btnClass = "btn-dark";
        if (isSel) btnClass = "btn-green";

        let btnText = dCost.toLocaleString() + " ₽";
        if (dCost === 0) btnText = "Бесплатно";
        if (isSel) btnText = "Выбрано";

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

function nextDayAction() {
    let day = 1; if (state.player && state.player.day) day = state.player.day;
    state.player.day = day + 1;
    
    let lvl = 1; if (state.player && state.player.level) lvl = state.player.level;
    
    let dailyCost = 1500;
    if (typeof DIETS !== 'undefined') {
        let pDiet = ""; if (state.player && state.player.diet) pDiet = state.player.diet;
        const diet = DIETS.find(d => d && d.id === pDiet);
        if (diet && diet.cost > 0) dailyCost = diet.cost;
    }

    let hType = ""; if (state.player && state.player.housingType) hType = state.player.housingType;
    let hId = ""; if (state.player && state.player.housingId) hId = state.player.housingId;

    if (hType === 'rent' && typeof HOUSING_LIST !== 'undefined') {
        const house = HOUSING_LIST.find(h => h && h.id === hId);
        if (house && house.rent > 0) dailyCost += house.rent;
    }

    if (lvl >= 20 && state.garage && state.garage.length > 0) {
        let garageValue = 0;
        state.garage.forEach(c => {
            if (c) {
                if (c.marketValue) garageValue += c.marketValue;
                else if (c.price) garageValue += c.price;
            }
        });
        const tax = Math.round(garageValue * 0.005);
        dailyCost += tax;
    }

    let debt = 0; if (state.player && state.player.loanDebt) debt = state.player.loanDebt;
    if (debt > 0) {
        const debtInterest = Math.round(debt * 0.15);
        state.player.loanDebt = debt + debtInterest;
    }

    if (state.garage) {
        state.garage.forEach(car => {
            if (car && car.impounded) {
                let d = 0; if (car.impoundedDays) d = car.impoundedDays;
                car.impoundedDays = d + 1;
            }
        });
    }

    let cash = 0; if (state.player && state.player.cash) cash = state.player.cash;
    state.player.cash = Math.max(-500000, cash - dailyCost);
    
    state.player.fuel = 100;
    
    let curT = 0; if (state.player && state.player.expressTickets) curT = state.player.expressTickets;
    let maxT = 25; if (state.player && state.player.maxExpressTickets) maxT = state.player.maxExpressTickets;
    state.player.expressTickets = Math.min(maxT, curT + 25);

    let pIm = 0; if (state.player && state.player.policeImmunityDays) pIm = state.player.policeImmunityDays;
    if (pIm > 0) {
        state.player.policeImmunityDays = pIm - 1;
    }

    if (state.businesses) {
        state.businesses.forEach(b => {
            if (b && b.level > 0) {
                let st = 0; if (b.stored) st = b.stored;
                let inc = 0; if (b.income) inc = b.income;
                let bLvl = 1; if (b.level) bLvl = b.level;
                b.stored = st + (inc * bLvl);
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
    if (typeof renderShopPlates === 'function') renderShopPlates();
    
    let curDay = 1; if (state.player && state.player.day) curDay = state.player.day;
    showToast("День " + curDay + ": расходы составили " + dailyCost.toLocaleString() + " ₽");
    updateHeaderUI();
}

// ===================== Вкладка: ЖИЗНЬ, БИЗНЕС И СЕРВИСЫ (js/life.js) =====================

// ===================== 1. ТЕНЕВЫЕ СВЯЗИ (РЕШАЛА АРТУР) =====================
function buyReshalaPack(type) {
    if (type === 'pack1') {
        if (state.player.cash < 150000) return showToast("Не хватает 150,000 ₽!");
        state.player.cash -= 150000; 
        state.player.connections = (state.player.connections || 0) + 1;
        showToast("Связи приобретены (+1 🤝)!");
    } else if (type === 'pack5') {
        if (state.player.cash < 650000) return showToast("Не хватает 650,000 ₽!");
        state.player.cash -= 650000; 
        state.player.connections = (state.player.connections || 0) + 5;
        showToast("Оптовый пакет связей (+5 🤝) активирован!");
    }
    saveState(); 
    updateHeaderUI();
}

function checkReshalaAccess() {
    const roofCard = document.getElementById('reshala-roof-card');
    const legalCard = document.getElementById('reshala-legalize-card');
    const ticketsCard = document.getElementById('reshala-tickets-card');
    
    if (roofCard) {
        if (state.player.level < 10) { 
            roofCard.classList.add('item-locked'); 
            roofCard.querySelector('button').disabled = true; 
            roofCard.querySelector('button').innerText = 'С 10 УРОВНЯ'; 
        } else { 
            roofCard.classList.remove('item-locked'); 
            roofCard.querySelector('button').disabled = false; 
            roofCard.querySelector('button').innerText = 'Оформить (350k ₽ / 45 ⭐)'; 
        }
    }
    if (legalCard) {
        if (state.player.level < 15) { 
            legalCard.classList.add('item-locked'); 
            legalCard.querySelector('button').disabled = true; 
            legalCard.querySelector('button').innerText = 'С 15 УРОВНЯ'; 
        } else { 
            legalCard.classList.remove('item-locked'); 
            legalCard.querySelector('button').disabled = false; 
            legalCard.querySelector('button').innerText = 'Легализовать (200k ₽ + 1 🤝)'; 
        }
    }
    if (ticketsCard) {
        if (state.player.level < 5) { 
            ticketsCard.classList.add('item-locked'); 
            ticketsCard.querySelector('button').disabled = true; 
            ticketsCard.querySelector('button').innerText = 'С 5 УРОВНЯ'; 
        } else { 
            ticketsCard.classList.remove('item-locked'); 
            ticketsCard.querySelector('button').disabled = false; 
            ticketsCard.querySelector('button').innerText = 'Купить 5 шт (75k ₽ / 15 ⭐)'; 
        }
    }
    renderConfiscatedCardUI();
}

function buyReshalaService(service) {
    if (service === 'roof') {
        if (state.player.level < 10) return showToast("Услуга доступна с 10 уровня!");
        if (state.player.cash >= 350000) { 
            state.player.cash -= 350000; 
        } else if (state.player.stars >= 45) { 
            state.player.stars -= 45; 
        } else {
            return showToast("Нужно 350,000 ₽ или 45 Stars ⭐!");
        }
        state.player.policeImmunityDays = (state.player.policeImmunityDays || 0) + 3;
        saveState();
        openVerdictModal("🚨 КРЫША ОФОРМЛЕНА", "ГИБДД не тронет ваши машины следующие 3 дня!", true);
    }
}

function buyTicketsPack(amount, cost) {
    if (state.player.level < 5) return showToast("Услуга доступна с 5 уровня!");
    if ((state.player.expressTickets || 0) + amount > (state.player.maxExpressTickets || 25)) {
        return showToast(`Склад переполнен! Максимум: ${state.player.maxExpressTickets}. Расширьте его на Площадке Продаж.`);
    }
    if (state.player.cash >= cost) { 
        state.player.cash -= cost; 
    } else if (state.player.stars >= 15) { 
        state.player.stars -= 15; 
    } else {
        return showToast("Не хватает 75,000 ₽ или 15 Stars ⭐!");
    }
    state.player.expressTickets = (state.player.expressTickets || 0) + amount;
    saveState(); 
    updateHeaderUI();
    showToast(`Получено +${amount} Экспресс-пропусков 🎟️!`);
}

function openLegalizeCarModal() {
    if (state.player.level < 15) return showToast("Услуга доступна с 15 уровня!");
    const criminalCars = state.garage.filter(c => c.isStolen);
    const list = document.getElementById('legalizeCarList');
    if (!list) return;

    if (criminalCars.length === 0) {
        list.innerHTML = `<div class="sub-label text-center py-4">У вас в гараже нет криминальных авто в розыске.</div>`;
    } else {
        list.innerHTML = criminalCars.map(c => `
            <div class="glass-card flex-between p-2 mb-1">
                <div>
                    <b>${c.name}</b>
                    <div class="sub-label color-red">В розыске (${c.customPlate || c.plate})</div>
                </div>
                <button onclick="confirmLegalizeCar('${c.id}')" class="btn btn-purple btn-auto btn-sm">Отмыть VIN</button>
            </div>
        `).join('');
    }
    document.getElementById('modalLegalizeCar')?.classList.add('active');
}

function confirmLegalizeCar(carId) {
    if (state.player.cash < 200000 || (state.player.connections || 0) < 1) {
        return showToast("Нужно 200,000 ₽ и 1 Связь 🤝!");
    }
    state.player.cash -= 200000; 
    state.player.connections -= 1;
    const car = state.garage.find(c => c.id === carId);
    if (car) { 
        car.isStolen = false; 
        car.autotekaChecked = true; 
    }
    closeModal('modalLegalizeCar');
    saveState(); 
    renderGarage();
    openVerdictModal("VIN ОТМЫТ! 🔏", "Автомобиль теперь юридически чист во всех базах!", true);
}

// ===================== 2. ТЕНЕВОЙ КОНФИСКАТ (ФССП/ШТРАФСТОЯНКА) =====================
function generateConfiscatedCarLot() {
    if (typeof CAR_DATABASE === 'undefined') return;

    const isExclusive = Math.random() < 0.12; 
    let template = null;
    let category = 'comfort';

    if (isExclusive) {
        const pool = (CAR_DATABASE.hyper && CAR_DATABASE.hyper.length > 0) 
            ? CAR_DATABASE.hyper 
            : CAR_DATABASE.premium;
        template = pool[Math.floor(Math.random() * pool.length)];
        category = 'exclusive';
    } else {
        const pools = ['economy', 'comfort', 'premium'];
        const chosenCat = pools[Math.floor(Math.random() * pools.length)];
        const pool = CAR_DATABASE[chosenCat] || CAR_DATABASE.economy;
        template = pool[Math.floor(Math.random() * pool.length)];
        category = chosenCat;
    }

    const dynPrice = typeof getDynamicPrice === 'function' ? getDynamicPrice(template.basePrice, template.type) : template.basePrice;
    const discount = isExclusive ? 0.50 : 0.45; 
    const buyPrice = Math.round(dynPrice * (1 - discount));
    const marketVal = Math.round(dynPrice * 1.15);
    const plate = isExclusive ? generateCoolPlate() : generateNormalPlate();

    state.confiscatedLot = {
        id: 'confiscated_' + Date.now(),
        name: template.name,
        power: template.power || 120,
        type: template.type || 'comfort',
        basePrice: template.basePrice,
        price: buyPrice,
        marketValue: marketVal + (typeof evaluatePlate === 'function' ? evaluatePlate(plate) : 0),
        img: template.img,
        plate: plate,
        customPlate: plate,
        isExclusive: isExclusive,
        category: category,
        requiredConnections: isExclusive ? 5 : (state.player.level >= 20 ? 3 : 2),
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

    const hasEnoughConn = (state.player.connections || 0) >= lot.requiredConnections;
    const minLvl = lot.isExclusive ? 20 : 12;
    const isLevelOk = state.player.level >= minLvl;

    card.innerHTML = `
        <div class="flex-between mb-1">
            <b>${lot.isExclusive ? '👑 АРЕСТОВАННЫЙ ЭКСКЛЮЗИВ' : '📦 Теневой конфискат (ФССП)'}</b>
            <span class="tag-badge ${lot.isExclusive ? 'bg-tag-amber' : 'bg-tag-purple'}">
                ${lot.isExclusive ? 'СКИДКА 50%' : 'СКИДКА 45%'}
            </span>
        </div>
        <div class="flex-between text-xs mb-1">
            <span class="font-bold color-cyan">${lot.name}</span>
            <span class="license-plate">${lot.plate}</span>
        </div>
        <p class="sub-label mb-2">Рынок: ~${lot.marketValue.toLocaleString()} ₽ | Требуется: <b>${lot.requiredConnections} 🤝</b></p>
        <button onclick="buyConfiscatedCar()" class="btn ${lot.isExclusive ? 'btn-amber' : 'btn-purple'} btn-sm" ${(!hasEnoughConn || !isLevelOk) ? 'disabled' : ''}>
            ${!isLevelOk ? `С ${minLvl} УРОВНЯ` : (!hasEnoughConn ? `Нужно ${lot.requiredConnections} 🤝 связей` : `Выкупить (${lot.price.toLocaleString()} ₽ + ${lot.requiredConnections} 🤝)`)}
        </button>
    `;
}

function buyConfiscatedCar() {
    if (!state.confiscatedLot) generateConfiscatedCarLot();
    const lot = state.confiscatedLot;
    if (!lot) return;

    const minLvl = lot.isExclusive ? 20 : 12;
    if (state.player.level < minLvl) return showToast(`Выкуп доступен с ${minLvl} уровня!`);
    if ((state.player.connections || 0) < lot.requiredConnections) return showToast(`Требуется минимум ${lot.requiredConnections} 🤝 связей!`);
    if (state.player.cash < lot.price) return showToast(`Не хватает денег! Нужно ${lot.price.toLocaleString()} ₽.`);
    if (state.garage.length >= getTotalGarageSlots()) return showToast("В гараже нет свободного места!");

    state.player.cash -= lot.price;
    state.player.connections -= lot.requiredConnections;

    const carToAdd = {
        ...lot,
        id: 'car_conf_' + Date.now(),
        purchaseCost: lot.price,
        tuning: { chip: lot.isExclusive ? 1 : 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }
    };

    state.garage.push(carToAdd);
    state.confiscatedLot = null; 
    saveState();
    renderGarage();
    renderConfiscatedCardUI();

    openVerdictModal(
        lot.isExclusive ? "РЕЗЕРВ ФССП ВЫКУПЛЕН! 👑" : "АВТО СО ШТРАФСТОЯНКИ! 🚔",
        `Вы забрали ${lot.name} с дисконтом через теневые каналы!`,
        true,
        lot.marketValue - lot.price
    );
}

// ===================== 3. РЕПУТАЦИЯ, СВЯЗИ И БЛАГОТВОРИТЕЛЬНОСТЬ =====================
function roadAssistanceAction() {
    if (state.player.fuel < 10) return showToast("Нужно 10 ⛽ бензина для выезда!");
    state.player.fuel -= 10;
    
    const roll = Math.random();
    if (roll < 0.65) {
        state.player.karma = Math.min(100, (state.player.karma || 0) + 12);
        showToast("Вы прикурили аккумулятор на трассе! (+12 Кармы 😇)");
    } else {
        state.player.connections = (state.player.connections || 0) + 1;
        state.player.karma = Math.min(100, (state.player.karma || 0) + 5);
        showToast("Вы помогли сотруднику ведомства! (+1 🤝 Связь и +5 Карма)");
    }
    saveState();
    updateHeaderUI();
}

function donatePartsToMechanic() {
    if (state.player.cash < 35000) return showToast("Нужно 35,000 ₽ на закупку деталей!");
    state.player.cash -= 35000;
    state.player.connections = (state.player.connections || 0) + 1;
    state.player.karma = Math.min(100, (state.player.karma || 0) + 8);
    saveState();
    updateHeaderUI();
    showToast("Дядя Ваня благодарен за запчасти! (+1 🤝 Связь и +8 Карма)");
}

function bigCharityDonate() {
    if (state.player.cash < 100000) return showToast("Нужно 100,000 ₽!");
    state.player.cash -= 100000;
    state.player.karma = Math.min(100, (state.player.karma || 0) + 25);
    saveState();
    updateHeaderUI();
    showToast("Доброе дело сделано! (+25 Кармы 😇)");
}

// ===================== 4. ЛОМБАРД (КРЕДИТЫ) =====================
function takeLoan(amt) { 
    if ((state.player.loanDebt || 0) >= 1000000) return showToast("Лимит долга исчерпан!"); 
    state.player.cash += amt * 0.95; 
    state.player.loanDebt = (state.player.loanDebt || 0) + amt; 
    saveState(); 
    showToast(`Одобрено: ${amt.toLocaleString()} ₽ (Комиссия 5%)`); 
}

function repayLoan(percent) { 
    if ((state.player.loanDebt || 0) <= 0) return showToast("У вас нет задолженностей!"); 
    let amt = Math.ceil(state.player.loanDebt * (percent / 100)); 
    if (state.player.cash < amt) return showToast("Не хватает денег для оплаты!"); 
    state.player.cash -= amt; 
    state.player.loanDebt = Math.max(0, state.player.loanDebt - amt); 
    saveState(); 
    showToast(`Оплачено ${amt.toLocaleString()} ₽ долга`); 
}

// ===================== 5. МОЙ АВТОБИЗНЕС =====================
function checkBusinessAccess() {
    const c = document.getElementById('businessList');
    const lock = document.getElementById('businessLockCover');
    const activeBox = document.getElementById('businessActiveBox');
    
    if (state.player.level < 5) {
        if (activeBox) activeBox.style.display = 'none';
        if (lock) lock.style.display = 'block';
        return;
    }
    if (lock) lock.style.display = 'none';
    if (activeBox) activeBox.style.display = 'block';
    if (!c || typeof BUSINESS_DATA === 'undefined') return;

    let totalNet = 0;
    c.innerHTML = state.businesses.map((b, i) => {
        const isMax = b.level >= 10;
        const isLocked = state.player.level < b.minLevel;
        const cost = b.level === 0 ? b.cost : b.cost * (b.level + 1);
        totalNet += b.level * cost;

        const defaultBizImgs = [
            'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&q=80',
            'https://images.unsplash.com/photo-1599256614138-0ceec0e766c8?w=400&q=80',
            'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?w=400&q=80',
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80'
        ];
        const imgSrc = defaultBizImgs[i % defaultBizImgs.length];

        return `
        <div class="business-card ${!isLocked ? 'unlocked' : ''}">
            <div class="business-img-box ${isLocked ? 'item-locked' : ''}">
                <img src="${imgSrc}" class="business-img" onerror="this.src='https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=400&q=80'">
                ${isLocked ? `<div class="cooldown-timer" style="display:flex; opacity:1; font-size:14px;"><i class="fa-solid fa-lock mb-2"></i> С ${b.minLevel} УРОВНЯ</div>` : ''}
                <div class="badge-tag bg-tag-cyan" style="bottom: 8px; left: 8px; right: auto;">${isMax ? 'MAX УРОВЕНЬ' : 'Ур. ' + b.level}</div>
            </div>
            <div class="business-content">
                <div class="flex-between mb-1">
                    <b class="text-xs">${b.name}</b>
                    <div class="sub-label">Доход: <span class="color-green font-bold">${(b.income * b.level).toLocaleString()} ₽</span></div>
                </div>
                
                <div class="business-perk-badge">⭐ Перк: ${b.perk || 'Пассивный доход'}</div>
                
                ${b.level > 0 ? `<div class="color-green text-xs font-bold mb-2">Накоплено в кассе: ${(b.stored || 0).toLocaleString()} ₽</div>` : ''}
                
                <button onclick="upgradeBusiness(${i})" class="btn ${isMax ? 'btn-dark' : 'btn-cyan'} btn-sm" ${isMax || isLocked ? 'disabled' : ''}>
                    ${isMax ? 'Улучшено до максимума' : (isLocked ? `Доступно с ${b.minLevel} ур` : (b.level === 0 ? 'Купить (' + cost.toLocaleString() + ' ₽)' : 'Улучшить (' + cost.toLocaleString() + ' ₽)'))}
                </button>
            </div>
        </div>`;
    }).join('');
    setTxt('netWorthText', totalNet.toLocaleString() + ' ₽');
}

function upgradeBusiness(idx) {
    const b = state.businesses[idx];
    if (state.player.level < b.minLevel) return showToast(`Этот бизнес доступен с ${b.minLevel} уровня!`);
    if (b.level >= 10) return showToast("Бизнес достиг максимума!");
    const cost = b.level === 0 ? b.cost : b.cost * (b.level + 1);
    if (state.player.cash < cost) return showToast("Не хватает денег!");
    state.player.cash -= cost;
    b.level += 1;
    saveState(); 
    checkBusinessAccess();
    showToast(`Бизнес «${b.name}» улучшен до ${b.level} уровня!`);
}

function collectAllBusinessCash() {
    let totalCollected = 0;
    state.businesses.forEach(b => {
        if (b.stored && b.stored > 0) {
            totalCollected += b.stored;
            b.stored = 0;
        }
    });

    if (totalCollected <= 0) {
        return showToast("В кассах предприятий пока пусто!");
    }

    state.player.cash += totalCollected;
    saveState();
    checkBusinessAccess();
    tgHaptic('success');
    playSound('win');
    spawnFloatingReward(`+${totalCollected.toLocaleString()} ₽`);
    showToast(`Инкассация успешна: снято ${totalCollected.toLocaleString()} ₽!`);
}

// ===================== 6. МАГАЗИН ПЕРЕКУПА & ОБОРУДОВАНИЕ =====================
const SHOP_TOOLS = [
    {
        id: 'gauge',
        name: 'Цифровой толщиномер ET-111',
        icon: 'fa-ruler-combined',
        price: 25000,
        desc: 'Позволяет бесплатно и точно мерить толщину ЛКП (шпаклёвку/окрасы) на авторынке.',
        reqLvl: 1
    },
    {
        id: 'obd',
        name: 'OBD2 Сканер «Вася-Диагност Pro»',
        icon: 'fa-laptop-code',
        price: 65000,
        desc: 'Считывает реальные ошибки ЭБУ, ресурс мотора и КПП перед сделкой.',
        reqLvl: 5
    },
    {
        id: 'endoscope',
        name: 'Поворотный HD-Эндоскоп',
        icon: 'fa-camera',
        price: 110000,
        desc: 'Заглядывает в цилиндры: защита от покупки моторов с задирами.',
        reqLvl: 10
    },
    {
        id: 'compressor',
        name: 'Турбо-бустер и компрессор 12V',
        icon: 'fa-bolt',
        price: 40000,
        desc: 'Даёт +10 к успеху при выезде на помощь на дороге и реанимации сараев.',
        reqLvl: 8
    }
];

const SHOP_SUPPLIES = [
    {
        id: 'coffee',
        name: 'Двойной эспрессо с заправки',
        cost: 450,
        hunger: 10,
        mood: 15,
        desc: 'Бодрит, снимает усталость, поднимает кураж.'
    },
    {
        id: 'energy',
        name: 'Энергетик «Red Bull Litre»',
        cost: 950,
        hunger: 15,
        mood: 30,
        desc: '+30 куража перед сложными переговорами у капота!'
    },
    {
        id: 'burger',
        name: 'Горячий перекупский комбо-бургер',
        cost: 1800,
        hunger: 50,
        mood: 20,
        desc: 'Быстрый и сытный перекус прямо в салоне.'
    }
];

function switchShopSection(sec) {
    ['tools', 'plates', 'supplies'].forEach(s => {
        const btn = document.getElementById(`shopTab-${s}`);
        const block = document.getElementById(`shopSec-${s}`);
        if (btn) btn.classList.toggle('active', s === sec);
        if (block) block.style.display = s === sec ? 'block' : 'none';
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

    const canDoContracts = state.player.tools.gauge && state.player.tools.obd && state.player.level >= 15;
    const statusBadge = document.getElementById('syndicateEquipStatus');
    if (statusBadge) {
        statusBadge.innerText = canDoContracts ? "Заказы: Доступны ✓" : "Заказы: Нужен Толщиномер + OBD";
        statusBadge.className = canDoContracts ? "tag-badge bg-tag-green" : "tag-badge bg-tag-amber";
    }

    container.innerHTML = SHOP_TOOLS.map(tool => {
        const isOwned = state.player.tools[tool.id];
        const isLocked = state.player.level < tool.reqLvl;

        return `
        <div class="glass-card p-3 mb-2 flex-between">
            <div style="flex: 1; padding-right: 12px;">
                <div class="flex-between mb-1">
                    <b class="font-bold text-xs color-cyan"><i class="fa-solid ${tool.icon}"></i> ${tool.name}</b>
                    <span class="text-xs font-bold ${isOwned ? 'color-green' : 'color-amber'}">
                        ${isOwned ? 'В ИНВЕНТАРЕ ✓' : tool.price.toLocaleString() + ' ₽'}
                    </span>
                </div>
                <div class="sub-label mb-1">${tool.desc}</div>
                ${isLocked ? `<div class="sub-label color-red font-bold">С ${tool.reqLvl} уровня</div>` : ''}
            </div>
            <button onclick="buyShopTool('${tool.id}')" class="btn ${isOwned ? 'btn-dark' : 'btn-cyan'} btn-auto btn-sm" ${isOwned || isLocked ? 'disabled' : ''}>
                ${isOwned ? 'Куплено' : 'Купить'}
            </button>
        </div>`;
    }).join('');
}

function buyShopTool(toolId) {
    const tool = SHOP_TOOLS.find(t => t.id === toolId);
    if (!tool) return;
    if (state.player.cash < tool.price) return showToast("Не хватает денег на покупку прибора!");

    state.player.cash -= tool.price;
    state.player.tools[toolId] = true;
    saveState();
    renderShopTools();
    playSound('win');
    tgHaptic('success');
    showToast(`Куплен ${tool.name}!`);
}

function renderShopSupplies() {
    const container = document.getElementById('shopSuppliesList');
    if (!container) return;

    container.innerHTML = SHOP_SUPPLIES.map(item => `
        <div class="glass-card flex-between p-2 mb-2">
            <div>
                <b class="text-xs color-green">${item.name}</b>
                <div class="sub-label mb-1">${item.desc}</div>
                <div class="text-xs color-amber">+${item.hunger}% сытости | +${item.mood}% куража</div>
            </div>
            <button onclick="buyShopSupply('${item.id}')" class="btn btn-green btn-auto btn-sm" style="min-width: 85px;">
                ${item.cost.toLocaleString()} ₽
            </button>
        </div>
    `).join('');
}

function buyShopSupply(itemId) {
    const item = SHOP_SUPPLIES.find(i => i.id === itemId);
    if (!item) return;
    if (state.player.cash < item.cost) return showToast("Не хватает денег!");

    state.player.cash -= item.cost;
    state.player.hunger = Math.min(100, (state.player.hunger || 80) + item.hunger);
    state.player.mood = Math.min(100, (state.player.mood || 85) + item.mood);
    saveState();
    updateHeaderUI();
    showToast(`Употреблено: ${item.name}! Сытость и кураж восполнены.`);
}

function renderShopPlates() {
    const container = document.getElementById('plateMarketListDetailed');
    if (!container) return;

    if (!state.plateCatalog || state.plateCatalog.length === 0) {
        if (typeof refreshPlateCatalog === 'function') refreshPlateCatalog();
    }

    container.innerHTML = state.plateCatalog.map((item, idx) => `
        <div class="glass-card flex-between p-2 mb-2">
            <div class="license-plate">${item.plate} <div class="license-flag">RUS</div></div>
            <div class="text-right flex-gap">
                <span class="price-val text-xs" style="line-height:28px;">${item.price.toLocaleString()} ₽</span>
                <button onclick="buyPlateFromShop(${idx})" class="btn btn-amber btn-auto btn-sm">Купить</button>
            </div>
        </div>
    `).join('');
}

function buyPlateFromShop(idx) {
    const item = state.plateCatalog[idx];
    if (!item) return;
    if (state.player.cash < item.price) return showToast("Не хватает денег на госномер!");

    state.player.cash -= item.price;
    state.ownedPlates.push(item.plate);
    state.plateCatalog.splice(idx, 1);
    saveState();
    renderShopPlates();
    tgHaptic('success');
    showToast(`Госномер ${item.plate} добавлен в коллекцию!`);
}

// ===================== 7. ЗАКАЗЫ СИНДИКАТА =====================
const CONTRACT_CLIENT_TYPES = [
    { client: "Бизнесмен Игорь", avatar: "💼", reqClass: "premium", minHp: 240, cleanOnly: true, desc: "Нужен строгий представительский авто для встреч с инвесторами." },
    { client: "Таксопарк «Вектор»", avatar: "🚕", reqClass: "comfort", minHp: 100, cleanOnly: true, desc: "Ищем свежий рабочий комфорт под долгосрочную аренду водителям." },
    { client: "Уличный гонщик Влад", avatar: "🏎️", reqClass: "economy", minHp: 130, cleanOnly: false, desc: "Нужен бодрый корч под зимний дрифт или стрит. На дефекты пофиг!" },
    { client: "Чиновник Соколов", avatar: "🏛️", reqClass: "premium", minHp: 300, cleanOnly: true, desc: "Только юридически чистый премиум-внедорожник без следов ДТП." },
    { client: "Перекуп Артём", avatar: "🕶️", reqClass: "comfort", minHp: 120, cleanOnly: false, desc: "Срочно перехватить клиенту под ключ. Заберу сразу с доплатой." }
];

function generateContracts() {
    state.contracts = [];
    const count = 3;

    for (let i = 0; i < count; i++) {
        const clientTemplate = CONTRACT_CLIENT_TYPES[Math.floor(Math.random() * CONTRACT_CLIENT_TYPES.length)];
        const rewardBase = clientTemplate.reqClass === 'premium' ? 750000 : (clientTemplate.reqClass === 'comfort' ? 250000 : 110000);
        const reward = Math.round(rewardBase * (0.9 + Math.random() * 0.35));

        state.contracts.push({
            id: 'cnt_' + Date.now() + '_' + i,
            client: clientTemplate.client,
            avatar: clientTemplate.avatar,
            desc: clientTemplate.desc,
            reqClass: clientTemplate.reqClass,
            minHp: clientTemplate.minHp,
            cleanOnly: clientTemplate.cleanOnly,
            reward: reward,
            bonusXp: clientTemplate.reqClass === 'premium' ? 120 : 60
        });
    }
}

function renderContracts() {
    const c = document.getElementById('contractsList');
    const lock = document.getElementById('contractsLockCover');
    
    if (state.player.level < 15) {
        if (c) c.style.display = 'none';
        if (lock) lock.style.display = 'block';
        return;
    }
    if (lock) lock.style.display = 'none';
    if (!c) return;
    c.style.display = 'block';

    const hasTools = state.player.tools && state.player.tools.gauge && state.player.tools.obd;
    if (!hasTools) {
        c.innerHTML = `
            <div class="glass-card text-center py-6">
                <i class="fa-solid fa-lock color-amber" style="font-size:32px; margin-bottom:10px;"></i>
                <h4 class="font-bold">Синдикат требует профессиональное оборудование!</h4>
                <p class="sub-label mt-1 mb-3">Чтобы подбирать машины клиентам, вам нужны <b>Толщиномер</b> и <b>OBD2 Сканер</b>.</p>
                <button onclick="switchTab('tabShop')" class="btn btn-amber btn-auto">Перейти в Маркет Перекупа 🛒</button>
            </div>
        `;
        return;
    }

    if (!state.contracts || state.contracts.length === 0) {
        generateContracts();
    }

    c.innerHTML = state.contracts.map((cnt, i) => {
        const suitableCar = state.garage.find(car => 
            car.type === cnt.reqClass && 
            !car.impounded && 
            (car.power || 100) >= cnt.minHp &&
            (!cnt.cleanOnly || !car.isStolen)
        );

        return `
        <div class="glass-card mb-2" style="border-left: 4px solid var(--cyan);">
            <div class="flex-between mb-1">
                <b class="color-cyan">${cnt.avatar} ${cnt.client}</b>
                <span class="tag-badge bg-tag-amber">+${cnt.reward.toLocaleString()} ₽</span>
            </div>
            <p class="sub-label mb-2">${cnt.desc}</p>
            <div class="space-y-1 mb-2 text-xs">
                <div>Класс: <b class="color-green">${cnt.reqClass.toUpperCase()}</b> | Мощность: <b>от ${cnt.minHp} л.с.</b></div>
                <div>Юр. чистота: <b>${cnt.cleanOnly ? 'Только чистый VIN' : 'Любая история'}</b></div>
            </div>
            <button onclick="completeContract(${i})" class="btn ${suitableCar ? 'btn-green' : 'btn-dark'} btn-sm w-full">
                ${suitableCar ? `✓ Отдать «${suitableCar.name}» (Выплата +${cnt.reward.toLocaleString()} ₽)` : 'Нет подходящего авто в гараже'}
            </button>
        </div>`;
    }).join('');
}

function completeContract(idx) {
    const cnt = state.contracts[idx];
    if (!cnt) return;

    const carIdx = state.garage.findIndex(car => 
        car.type === cnt.reqClass && 
        !car.impounded && 
        (car.power || 100) >= cnt.minHp &&
        (!cnt.cleanOnly || !car.isStolen)
    );

    if (carIdx === -1) {
        return showToast(`Нужен не арестованный авто класса ${cnt.reqClass.toUpperCase()} от ${cnt.minHp} л.с.!`);
    }

    const car = state.garage[carIdx];
    state.garage.splice(carIdx, 1);

    const totalPayout = (car.marketValue || car.price || 100000) + cnt.reward;
    state.player.cash += totalPayout;
    state.player.stats.sold = (state.player.stats.sold || 0) + 1;
    state.player.stats.totalNetProfit = (state.player.stats.totalNetProfit || 0) + cnt.reward;
    addXp(cnt.bonusXp || 50);

    state.contracts.splice(idx, 1);
    saveState();
    renderGarage();
    renderContracts();

    tgHaptic('success');
    playSound('win');
    openVerdictModal(
        "ЗАКАЗ ЗАКРЫТ! 🤝",
        `${cnt.client} принял авто ${car.name}. Компенсация и комиссия зачислены!`,
        true,
        totalPayout,
        cnt.reward
    );
}

function refreshContractsManual() {
    if (state.player.cash < 15000) return showToast("Обновление базы заказов стоит 15,000 ₽!");
    state.player.cash -= 15000;
    generateContracts();
    saveState();
    renderContracts();
    showToast("Список заказов синдиката обновлен!");
}

// ===================== 8. САРАИ (ГАРАЖНЫЕ НАХОДКИ) =====================
function renderBarnFind() {
    const b = document.getElementById('barnFindContent');
    if (!b || typeof BARN_FINDS === 'undefined') return;

    const canExplore = (state.player.lastBarnDay || 0) < state.player.day;

    b.innerHTML = BARN_FINDS.map((barn, i) => `
        <div class="barn-tier-card">
            <div class="flex-between mb-1">
                <b class="color-amber">${barn.name}</b>
                <span class="tag-badge bg-tag-amber">Оценка: ~${barn.marketValue.toLocaleString()} ₽</span>
            </div>
            <div class="car-img-wrap" style="height: 110px; opacity: 0.85; filter: grayscale(0.4);">
                <img src="${barn.img}" class="car-img" onerror="this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'">
            </div>
            <button onclick="exploreBarn(${i})" class="btn btn-dark w-full btn-sm" ${!canExplore ? 'disabled' : ''}>
                ${canExplore ? 'Разведать сарай (50,000 ₽)' : 'Разведка будет доступна завтра'}
            </button>
        </div>
    `).join('');
}

function exploreBarn(idx) {
    if ((state.player.lastBarnDay || 0) >= state.player.day) return showToast("Разведка сараев доступна только 1 раз в игровой день!");
    if (state.player.cash < 50000) return showToast("Не хватает 50,000 ₽ на разведку!");
    if (state.garage.length >= getTotalGarageSlots()) return showToast("В гараже нет свободного места!");

    state.player.cash -= 50000;
    state.player.lastBarnDay = state.player.day;

    const template = BARN_FINDS[idx];
    const foundCar = {
        id: 'barn_' + Date.now(),
        name: template.name,
        power: template.power,
        type: template.type,
        basePrice: template.basePrice,
        price: template.basePrice,
        purchaseCost: 50000,
        baseMarketValue: template.marketValue,
        marketValue: Math.round(template.marketValue * 0.25),
        img: template.img,
        plate: generateNormalPlate(),
        customPlate: generateNormalPlate(),
        isStolen: false,
        condition: 20,
        wear: { engine: 20, transmission: 20 },
        tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 },
        bodyThickness: { hood: 800, roof: 140, doors: 600, wings: 900 },
        hiddenDefect: { text: "Машина долго стояла. Мотор троит, подвеска сыпется.", cost: Math.round(template.basePrice * 0.4), severity: "Критическая" },
        isRepainted: false,
        isPolished: false
    };

    state.garage.push(foundCar);
    saveState(); 
    renderBarnFind(); 
    renderGarage();
    openVerdictModal("НАХОДКА! 🏚️", `Вы откопали ${template.name}! Автомобиль доставлен в гараж, но требует полного ремонта.`, true);
}

// ===================== 9. КОНТЕЙНЕРЫ =====================
function renderContainersList() {
    const r = document.getElementById('containersListRender');
    const lock = document.getElementById('containersLockCover');
    if (state.player.level < 20) {
        if (r) r.style.display = 'none';
        if (lock) lock.style.display = 'block';
        return;
    }
    if (lock) lock.style.display = 'none';
    if (!r || typeof CONTAINER_ITEMS === 'undefined') return;
    r.style.display = 'block';

    r.innerHTML = CONTAINER_ITEMS.map(item => `
        <div class="glass-card mb-3">
            <div class="car-img-wrap" style="height: 140px;">
                <img src="${item.img}" class="car-img" onerror="this.src='https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80'">
                <div class="badge-tag">${item.badge}</div>
            </div>
            <div class="flex-between mb-1">
                <h4 class="font-bold">${item.name}</h4>
                <div class="price-val">${item.cost.toLocaleString()} ₽</div>
            </div>
            <p class="sub-label mb-3">${item.desc}</p>
            <button onclick="openContainer('${item.id}', ${item.cost})" class="btn btn-cyan w-full">
                Открыть контейнер (Таймер ${item.timer}с)
            </button>
        </div>
    `).join('');
}

function openContainer(type, price) {
    if (state.player.cash < price) return showToast("Не хватает денег!");
    if (state.garage.length >= getTotalGarageSlots()) return showToast("Гараж полон!");
    state.player.cash -= price;
    showToast("🚢 Контейнер вскрывается...");
    setTimeout(() => {
        let won = {
            id: 'c_' + Date.now(),
            name: "Lexus RX 350",
            power: 300,
            type: "premium",
            basePrice: price,
            price: price,
            marketValue: Math.round(price * 1.25),
            img: "assets/cars/premium/rx350.jpg",
            plate: generateCoolPlate(),
            customPlate: generateCoolPlate(),
            condition: 100,
            wear: { engine: 100, transmission: 100 },
            tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }
        };
        if (type === 'dubai') {
            won.name = "Porsche 911 GT3 RS";
            won.power = 525;
            won.type = "hyper";
            won.img = "assets/cars/hyper/911.jpg";
        }
        state.garage.push(won);
        saveState(); 
        renderGarage();
        openVerdictModal("КОНТЕЙНЕР ВСКРЫТ! 🎁", `В контейнере: «${won.name}»!`, true);
    }, 1500);
}

// ===================== 10. ЖИЛЬЁ =====================
function renderHousing() {
    const list = document.getElementById('housingMarketList');
    if (!list || typeof HOUSING_LIST === 'undefined') return;

    list.innerHTML = HOUSING_LIST.map(h => {
        const isCurrent = state.player.housingId === h.id;
        const isOwned = state.player.ownedHouses && state.player.ownedHouses.includes(h.id);
        const isLocked = state.player.level < h.minLevel;

        let rentBtn = '';
        if (h.rent > 0 && !isOwned) {
            let rClass = (isCurrent && state.player.housingType === 'rent') ? 'btn-cyan' : 'btn-dark';
            rentBtn = `<button onclick="rentHouse('${h.id}')" class="btn ${rClass} btn-sm" ${isLocked ? 'disabled' : ''}>Аренда (${h.rent.toLocaleString()} ₽/д)</button>`;
        }

        let buyBtn = '';
        if (h.buyPrice > 0) {
            let bClass = isOwned ? 'btn-green' : 'btn-amber';
            let bText = isOwned ? 'Выкуплено' : `Купить (${(h.buyPrice / 1000000).toFixed(1)}M ₽)`;
            buyBtn = `<button onclick="buyHouse('${h.id}')" class="btn ${bClass} btn-sm" ${isOwned || isLocked ? 'disabled' : ''}>${bText}</button>`;
        }

        return `
        <div class="glass-card mb-3" style="${isCurrent ? 'border-color:var(--cyan);' : ''}">
            <div class="car-img-wrap" style="height: 125px; ${isLocked ? 'filter: grayscale(1); opacity: 0.7;' : ''}">
                <img src="${h.img}" class="car-img" onerror="this.src='https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=400&q=80'">
                <div class="badge-tag">${isOwned ? 'В СОБСТВЕННОСТИ' : 'АРЕНДА'}</div>
                ${isLocked ? `<div class="cooldown-timer" style="display:flex; font-size:14px; opacity:1;"><i class="fa-solid fa-lock mr-2"></i>С ${h.minLevel} УР</div>` : ''}
            </div>
            <div class="flex-between mb-1">
                <h4 class="font-bold">${h.name} ${isCurrent ? '🏠 (Вы здесь)' : ''}</h4>
            </div>
            <div class="sub-label mb-2">+${h.slots} боксов гаража | +${h.moodBonus}% к настроению в день</div>
            <div class="grid-2">
                ${rentBtn}
                ${buyBtn}
            </div>
        </div>`;
    }).join('');
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
    const house = HOUSING_LIST.find(h => h.id === id);
    if (!house) return;
    if (state.player.cash < house.buyPrice) return showToast("Не хватает денег на покупку!");
    state.player.cash -= house.buyPrice;
    state.player.ownedHouses.push(id);
    state.player.housingId = id;
    state.player.housingType = 'owned';
    saveState(); 
    renderHousing(); 
    renderGarage();
    openVerdictModal("🎉 НЕДВИЖИМОСТЬ КУПЛЕНА!", `Вы стали собственником «${house.name}»! Боксы закреплены навсегда.`, true);
}

// ===================== 11. ЕДА И АКТИВНОСТИ =====================
function renderDiets() {
    const dietList = document.getElementById('dietList');
    if (!dietList || typeof DIETS === 'undefined') return;

    dietList.innerHTML = DIETS.map(d => `
        <div class="glass-card flex-between p-2 mb-2">
            <div>
                <div class="font-bold text-xs">${d.name}</div>
                <div class="sub-label mb-1">${d.desc}</div>
                <div class="text-xs color-green">+${d.hunger} сытости | ${d.mood > 0 ? '+' : ''}${d.mood} куража</div>
            </div>
            <button onclick="selectDiet('${d.id}')" class="btn ${state.player.diet === d.id ? 'btn-green' : 'btn-dark'} btn-sm btn-auto" style="min-width: 85px;">
                ${state.player.diet === d.id ? 'Выбрано' : (d.cost === 0 ? 'Бесплатно' : d.cost.toLocaleString() + ' ₽')}
            </button>
        </div>
    `).join('');
}

function selectDiet(id) {
    state.player.diet = id;
    saveState(); 
    renderDiets();
    showToast("Рацион питания успешно изменен!");
}

function doActivity(type, cost, mood, connections = 0) { 
    if (state.player.cash < cost) return showToast("Не хватает денег!"); 
    state.player.cash -= cost; 
    state.player.mood = Math.min(100, (state.player.mood || 85) + mood); 
    if (connections) state.player.connections = (state.player.connections || 0) + connections; 
    saveState(); 
    updateHeaderUI();
    showToast("Отдохнули на славу!"); 
}

// ===================== 12. КОЛЕСО ФОРТУНЫ =====================
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
    const canFree = (now - (state.player.lastFreeSpin || 0) >= 86400000);
    const statusBadge = document.getElementById('wheelStatusBadge');
    const notice = document.getElementById('wheelCooldownNotice');
    if (canFree) {
        if (statusBadge) { statusBadge.innerText = "Доступно"; statusBadge.className = "tag-badge bg-tag-green"; }
        if (notice) notice.innerText = "Бесплатная прокрутка готова!";
    } else {
        const hours = Math.ceil((86400000 - (now - state.player.lastFreeSpin)) / 3600000);
        if (statusBadge) { statusBadge.innerText = `КД ${hours}ч`; statusBadge.className = "tag-badge bg-tag-amber"; }
        if (notice) notice.innerText = `Бесплатный спин через ${hours} ч. Можно крутить за Stars ⭐.`;
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
        ctx.shadowColor = "rgba(0,0,0,0.8)"; 
        ctx.shadowBlur = 4;
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
    if (isFree) {
        if (now - (state.player.lastFreeSpin || 0) < 86400000) {
            const hours = Math.ceil((86400000 - (now - state.player.lastFreeSpin)) / 3600000);
            return showToast(`Бесплатный спин еще недоступен (ждать ${hours} ч).`);
        }
        state.player.lastFreeSpin = now;
    } else {
        if (state.player.stars < 25) return showToast("Не хватает 25 Telegram Stars ⭐!");
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
    const duration = 4000; 
    const startTime = performance.now();
    const arrow = document.getElementById('wheelPointerArrow');

    function animateWheel(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        currentWheelAngle = startAngle + (targetAngle - startAngle) * easeOut;
        drawWheelCanvas(currentWheelAngle);

        if (Math.random() < 0.25) {
            if (arrow) arrow.classList.add('tick');
            setTimeout(() => arrow && arrow.classList.remove('tick'), 50);
            playSound('tick');
        }

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
        openVerdictModal("🎉 ПРИЗ В КОЛЕСЕ!", `Вы выиграли +${prize.value.toLocaleString()} ₽ на баланс!`, true, prize.value);
    } else if (prize.type === 'conn') {
        state.player.connections = (state.player.connections || 0) + prize.value;
        openVerdictModal("🤝 СВЯЗИ ОТ РЕШАЛЫ!", `Вы выиграли +${prize.value} авторитетную Связь!`, true);
    } else if (prize.type === 'stars') {
        state.player.stars += prize.value;
        openVerdictModal("⭐ ЗВЁЗДНЫЙ ПРИЗ!", `Вам начислено +${prize.value} Telegram Stars!`, true);
    } else if (prize.type === 'tickets') {
        state.player.expressTickets = Math.min(state.player.maxExpressTickets || 25, (state.player.expressTickets || 0) + prize.value);
        openVerdictModal("🎟️ ЭКСПРЕСС-ПРОПУСКА!", `Получено +${prize.value} талона для быстрой продажи!`, true);
    } else if (prize.type === 'jackpot') {
        state.player.cash += prize.value; 
        state.player.stars += 25;
        state.player.expressTickets = Math.min(state.player.maxExpressTickets || 25, (state.player.expressTickets || 0) + 5);
        openVerdictModal("👑 ГРАНД ДЖЕКПОТ!", `ДЖЕКПОТ: +500,000 ₽, +25 Stars ⭐ и +5 Пропусков 🎟️!`, true, 500000);
    }
    saveState(); 
    updateHeaderUI();
}

// ===================== 13. КАЗИНО 21 =====================
let casinoBet = 0; 
let casinoState = 'betting'; 
let pHand = []; 
let dHand = []; 
let deck = [];

function getCasinoMaxBet() { 
    const lvl = state.player.level || 1;
    if (lvl <= 10) {
        return Math.min(50000, Math.max(5000, Math.round(state.player.cash * 0.10)));
    } else if (lvl <= 20) {
        return Math.min(300000, Math.max(15000, Math.round(state.player.cash * 0.20)));
    } else {
        return Math.min(2500000, Math.max(50000, Math.round(state.player.cash * 0.40)));
    }
}

function initCasino() { 
    setTxt('casinoMaxBetText', `Лимит: ${getCasinoMaxBet().toLocaleString()} ₽`); 
    if (casinoState === 'betting') resetCasinoUI(); 
}

function resetCasinoUI() { 
    casinoBet = 0; 
    pHand = []; 
    dHand = []; 
    casinoState = 'betting'; 
    setTxt('currentBetDisplay', '0 ₽'); 
    setTxt('casinoMaxBetText', `Лимит: ${getCasinoMaxBet().toLocaleString()} ₽`); 
    document.getElementById('casinoBettingArea').style.display = 'block'; 
    document.getElementById('casinoPlayingArea').style.display = 'none'; 
    document.getElementById('casinoResultArea').style.display = 'none'; 
    document.getElementById('playerHandBox').innerHTML = ''; 
    document.getElementById('dealerHandBox').innerHTML = ''; 
    setTxt('playerScore', '0'); 
    setTxt('dealerScore', '?'); 
}

function addCasinoBet(amt) { 
    const maxAllowed = getCasinoMaxBet(); 
    if (casinoBet + amt > maxAllowed) casinoBet = maxAllowed; 
    else if (state.player.cash < casinoBet + amt) return showToast("Не хватает денег!"); 
    else casinoBet += amt; 
    setTxt('currentBetDisplay', `${casinoBet.toLocaleString()} ₽`); 
}

function setCasinoMaxBet() { 
    casinoBet = Math.min(getCasinoMaxBet(), state.player.cash); 
    setTxt('currentBetDisplay', `${casinoBet.toLocaleString()} ₽`); 
}

function clearCasinoBet() { 
    casinoBet = 0; 
    setTxt('currentBetDisplay', '0 ₽'); 
}

function get21Deck() { 
    const suits = ['♠','♥','♣','♦']; 
    const vals = ['6','7','8','9','10','J','Q','K','A']; 
    let d = []; 
    for (let s of suits) { 
        for (let v of vals) d.push({ v, s }); 
    } 
    return d.sort(() => Math.random() - 0.5); 
}

function get21Score(hand) { 
    let score = 0; 
    let aces = 0; 
    for (let c of hand) { 
        if (c.v === 'J') score += 2; 
        else if (c.v === 'Q') score += 3; 
        else if (c.v === 'K') score += 4; 
        else if (c.v === 'A') { score += 11; aces += 1; } 
        else score += parseInt(c.v); 
    } 
    while (score > 21 && aces > 0) { 
        score -= 10; 
        aces -= 1; 
    } 
    return score; 
}

function isTwoAces(hand) { 
    return hand.length === 2 && hand[0].v === 'A' && hand[1].v === 'A'; 
}

function renderCard(c, hidden = false) { 
    if (hidden) return `<div class="playing-card card-hidden">?</div>`; 
    const colorClass = (c.s === '♥' || c.s === '♦') ? 'color-red' : 'color-cyan'; 
    return `<div class="playing-card ${colorClass}" style="background:#131c2e; padding:4px 8px; border-radius:6px; border:1px solid var(--border-glass); font-weight:900;">${c.v}${c.s}</div>`; 
}

function updateCasinoTable(showDealerHidden = false) { 
    document.getElementById('playerHandBox').innerHTML = pHand.map(c => renderCard(c)).join(''); 
    setTxt('playerScore', isTwoAces(pHand) ? '21 (Золотое!)' : get21Score(pHand)); 
    if (showDealerHidden) { 
        document.getElementById('dealerHandBox').innerHTML = dHand.map(c => renderCard(c)).join(''); 
        setTxt('dealerScore', isTwoAces(dHand) ? '21 (Золотое!)' : get21Score(dHand)); 
    } else { 
        document.getElementById('dealerHandBox').innerHTML = renderCard(dHand[0]) + renderCard(dHand[1], true); 
        setTxt('dealerScore', dHand[0].v === 'A' ? 11 : '?'); 
    } 
}

function startCasinoGame() {
    if (casinoBet <= 0) return showToast("Сделайте ставку!"); 
    if (state.player.cash < casinoBet) return showToast("Не хватает денег!");
    state.player.cash -= casinoBet; 
    saveState(); 
    deck = get21Deck(); 
    pHand = [deck.pop(), deck.pop()]; 
    dHand = [deck.pop(), deck.pop()]; 
    casinoState = 'playing'; 
    document.getElementById('casinoBettingArea').style.display = 'none'; 
    document.getElementById('casinoPlayingArea').style.display = 'block'; 
    updateCasinoTable(false); 
    if (get21Score(pHand) === 21 || isTwoAces(pHand)) setTimeout(standCasino, 600);
}

function hitCasino() { 
    if (casinoState !== 'playing') return; 
    pHand.push(deck.pop()); 
    updateCasinoTable(false); 
    if (get21Score(pHand) >= 21) setTimeout(standCasino, 500); 
}

function standCasino() { 
    if (casinoState !== 'playing') return; 
    document.getElementById('casinoPlayingArea').style.display = 'none'; 
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
    resBox.style.display = 'block';
    
    if (pScore > 21) {
        resBox.innerHTML = `<span class="color-red">ПЕРЕБОР (-${casinoBet.toLocaleString()} ₽)</span>`;
    } else if (dScore > 21 || pScore > dScore) { 
        const isGolden = isTwoAces(pHand);
        const payout = isGolden ? Math.round(casinoBet * 2.5) : casinoBet * 2; 
        state.player.cash += payout; 
        resBox.innerHTML = `<span class="color-green">ПОБЕДА (+${(payout - casinoBet).toLocaleString()} ₽)</span>`; 
        playSound('win'); 
    } else if (pScore === dScore) { 
        state.player.cash += casinoBet; 
        resBox.innerHTML = `<span class="color-amber">НИЧЬЯ (Возврат)</span>`; 
    } else {
        resBox.innerHTML = `<span class="color-red">КРУПЬЕ ЗАБРАЛ БАНК</span>`;
    }
    
    resBox.innerHTML += `<br><button onclick="resetCasinoUI()" class="btn btn-dark btn-sm mt-2">Сыграть снова</button>`; 
    saveState(); 
    updateHeaderUI();
}

// ===================== 14. СМЕНА ДНЯ И РАСХОДЫ =====================
function nextDayAction() {
    state.player.day += 1;
    const lvl = state.player.level || 1;
    
    let dailyCost = 1500;
    if (typeof DIETS !== 'undefined') {
        const diet = DIETS.find(d => d.id === state.player.diet);
        if (diet && diet.cost > 0) dailyCost = diet.cost;
    }

    if (state.player.housingType === 'rent' && typeof HOUSING_LIST !== 'undefined') {
        const house = HOUSING_LIST.find(h => h.id === state.player.housingId);
        if (house && house.rent > 0) dailyCost += house.rent;
    }

    if (lvl >= 20 && state.garage.length > 0) {
        const garageValue = state.garage.reduce((sum, c) => sum + (c.marketValue || c.price || 0), 0);
        const tax = Math.round(garageValue * 0.005);
        dailyCost += tax;
    }

    if (state.player.loanDebt > 0) {
        const debtInterest = Math.round(state.player.loanDebt * 0.15);
        state.player.loanDebt += debtInterest;
    }

    state.garage.forEach(car => {
        if (car.impounded) {
            car.impoundedDays = (car.impoundedDays || 0) + 1;
        }
    });

    state.player.cash = Math.max(-500000, state.player.cash - dailyCost);
    state.player.fuel = 100;
    state.player.expressTickets = Math.min(state.player.maxExpressTickets || 25, (state.player.expressTickets || 0) + 25);

    if (state.player.policeImmunityDays > 0) {
        state.player.policeImmunityDays -= 1;
    }

    state.businesses.forEach(b => {
        if (b.level > 0) {
            b.stored = (b.stored || 0) + (b.income * b.level);
        }
    });

    generateConfiscatedCarLot();
    if (typeof populateMarketFeed === 'function') populateMarketFeed(); 
    if (typeof refreshPlateCatalog === 'function') refreshPlateCatalog(); 
    
    saveState(); 
    renderDiets(); 
    renderHousing(); 
    renderConfiscatedCardUI();
    if (typeof renderShopPlates === 'function') renderShopPlates();
    
    showToast(`День ${state.player.day}: расходы составили ${dailyCost.toLocaleString()} ₽`);
    updateHeaderUI();
}

function watchAdsgram() { 
    state.player.cash += 25000; 
    state.player.connections = (state.player.connections || 0) + 1; 
    saveState(); 
    updateHeaderUI();
    showToast("+25k ₽ и +1 🤝 за просмотр!"); 
}

function buyPackWithStars(stars, cash) { 
    if (state.player.stars < stars) return showToast("Не хватает Stars ⭐!");
    state.player.stars -= stars;
    state.player.cash += cash; 
    saveState(); 
    updateHeaderUI();
    showToast(`+${cash.toLocaleString()} ₽ зачислено!`); 
}

function buyVipProPass() { 
    if (state.player.vipPro) return showToast("VIP PRO уже активен!");
    if (state.player.cash >= 1500000) {
        state.player.cash -= 1500000;
    } else if (state.player.stars >= 199) {
        state.player.stars -= 199;
    } else {
        return showToast("Нужно 1,500,000 ₽ или 199 Stars ⭐!");
    }
    state.player.vipPro = true; 
    saveState(); 
    updateHeaderUI();
    showToast("VIP PRO навсегда активирован!"); 
}

function refuelAction(type) { 
    if (type === 'cash') {
        if (state.player.cash < 5000) return showToast("Нужно 5,000 ₽!");
        state.player.cash -= 5000;
    }
    state.player.fuel = 100; 
    saveState(); 
    updateHeaderUI();
    showToast("Бак заправлен до 100 ⛽!"); 
}
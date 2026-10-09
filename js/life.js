// ===================== ПОЛНАЯ ВЕРСИЯ: js/life.js =====================

// ----------------------------------------------------
// 1. РЕШАЛА АРТУР (СВЯЗИ, КРЫША, ЛЕГАЛИЗАЦИЯ, ЛИЦЕНЗИЯ РАФ)
// ----------------------------------------------------
function buyReshalaPack(type) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;

    if (type === 'pack1') {
        if (cash < 150000) return showToast("Не хватает 150,000 ₽!");
        state.player.cash -= 150000;
        let conn = (state.player && state.player.connections) ? state.player.connections : 0;
        state.player.connections = conn + 1;
        showToast("Связи приобретены (+1 🤝)!");
    } else if (type === 'pack5') {
        if (cash < 650000) return showToast("Не хватает 650,000 ₽!");
        state.player.cash -= 650000;
        let conn = (state.player && state.player.connections) ? state.player.connections : 0;
        state.player.connections = conn + 5;
        showToast("Оптовый пакет связей (+5 🤝) активирован!");
    }
    saveState();
    updateHeaderUI();
}

function checkReshalaAccess() {
    const roofCard = document.getElementById('reshala-roof-card');
    const legalCard = document.getElementById('reshala-legalize-card');
    let lvl = (state.player && state.player.level) ? state.player.level : 1;

    if (roofCard) {
        const btn = roofCard.querySelector('button');
        if (state.player && state.player.policeImmunityDays > 0) {
            roofCard.classList.remove('item-locked');
            if (btn) {
                btn.disabled = true;
                btn.innerText = "Иммунитет активен (" + state.player.policeImmunityDays + " дн.)";
            }
        } else if (lvl < 10) {
            roofCard.classList.add('item-locked');
            if (btn) {
                btn.disabled = true;
                btn.innerText = "С 10 УРОВНЯ";
            }
        } else {
            roofCard.classList.remove('item-locked');
            if (btn) {
                btn.disabled = false;
                btn.innerText = "Оформить (350k ₽ / 45 ⭐)";
            }
        }
    }

    if (legalCard) {
        const btn = legalCard.querySelector('button');
        if (lvl < 15) {
            legalCard.classList.add('item-locked');
            if (btn) {
                btn.disabled = true;
                btn.innerText = "С 15 УРОВНЯ";
            }
        } else {
            legalCard.classList.remove('item-locked');
            if (btn) {
                btn.disabled = false;
                btn.innerText = "Легализовать (200k ₽ + 1 🤝)";
            }
        }
    }

    const btnLic = document.getElementById('btnReshalaLicense');
    if (btnLic) {
        if (state.player && state.player.hasRacingLicense) {
            btnLic.disabled = true;
            btnLic.innerText = "Лицензия оформлена ✓";
        } else {
            btnLic.disabled = false;
            btnLic.innerText = "Оформить (85k ₽ / 1 🤝)";
        }
    }

    renderConfiscatedCardUI();
}

function buyReshalaService(service) {
    if (service === 'roof') {
        let lvl = (state.player && state.player.level) ? state.player.level : 1;
        if (lvl < 10) return showToast("Услуга доступна с 10 уровня!");

        let cash = (state.player && state.player.cash) ? state.player.cash : 0;
        let stars = (state.player && state.player.stars) ? state.player.stars : 0;

        if (cash >= 350000) {
            state.player.cash -= 350000;
        } else if (stars >= 45) {
            state.player.stars -= 45;
        } else {
            return showToast("Нужно 350,000 ₽ или 45 Stars ⭐!");
        }

        let d = (state.player && state.player.policeImmunityDays) ? state.player.policeImmunityDays : 0;
        state.player.policeImmunityDays = d + 3;
        saveState();
        checkReshalaAccess();
        openVerdictModal("🚨 КРЫША ОФОРМЛЕНА", "ГИБДД не тронет ваши авто следующие 3 дня!", true);
    } else if (service === 'license') {
        if (state.player && state.player.hasRacingLicense) return showToast("Лицензия уже получена!");
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;
        let conn = (state.player && state.player.connections) ? state.player.connections : 0;

        if (conn >= 1) {
            state.player.connections -= 1;
        } else if (cash >= 85000) {
            state.player.cash -= 85000;
        } else {
            return showToast("Нужно 85,000 ₽ или 1 Связь 🤝!");
        }

        state.player.hasRacingLicense = true;
        saveState();
        checkReshalaAccess();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("ЛИЦЕНЗИЯ ПИЛОТА РАФ! 🏎️", "Решала уладил все вопросы: официальный допуск пилота к заездам 402м получен!", true);
    }
}

function openLegalizeCarModal() {
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    if (lvl < 15) return showToast("Услуга доступна с 15 уровня!");

    if (!state.garage) return;
    const criminalCars = state.garage.filter(c => c && (c.isStolen || c.unregistered));
    const list = document.getElementById('legalizeCarList');
    if (!list) return;

    if (criminalCars.length === 0) {
        list.innerHTML = "<div class='sub-label text-center py-4'>У вас в гараже нет проблемных авто (в розыске или без учёта).</div>";
    } else {
        let html = "";
        criminalCars.forEach(c => {
            let cName = c.name ? c.name : "Авто";
            let cPlate = c.customPlate ? c.customPlate : (c.plate ? c.plate : "ТРАНЗИТ");
            let reason = c.isStolen ? "В розыске" : "Учёт аннулирован";

            html += 
            "<div class='glass-card flex-between p-2 mb-1'>" +
                "<div>" +
                    "<b>" + cName + "</b>" +
                    "<div class='sub-label color-red'>" + reason + " (" + cPlate + ")</div>" +
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
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    let conn = (state.player && state.player.connections) ? state.player.connections : 0;

    if (cash < 200000) return showToast("Нужно 200,000 ₽ и 1 Связь 🤝!");
    if (conn < 1) return showToast("Нужно 200,000 ₽ и 1 Связь 🤝!");

    state.player.cash -= 200000;
    state.player.connections -= 1;

    if (state.garage) {
        const car = state.garage.find(c => c && c.id === carId);
        if (car) {
            car.isStolen = false;
            car.unregistered = false;
            car.autotekaChecked = true;
        }
    }
    closeModal('modalLegalizeCar');
    saveState();
    renderGarage();
    openVerdictModal("VIN ОТМЫТ! 🔏", "Автомобиль теперь юридически чист во всех базах ГИБДД!", true);
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

    let dynPrice = template.basePrice ? template.basePrice : 350000;
    const discount = isExclusive ? 0.50 : 0.45;
    const buyPrice = Math.round(dynPrice * (1 - discount));
    const marketVal = Math.round(dynPrice * 1.15);
    const plate = isExclusive ? 'Е777КХ 77' : 'А123МР 77';

    let tName = template.name ? template.name : "Авто";
    let tPow = template.power ? template.power : 120;
    let tType = template.type ? template.type : "comfort";
    let tImg = template.img ? template.img : "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80";

    let lvl = (state.player && state.player.level) ? state.player.level : 1;
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

    if (!state.confiscatedLot) generateConfiscatedCarLot();
    const lot = state.confiscatedLot;
    if (!lot) return;

    let conn = (state.player && state.player.connections) ? state.player.connections : 0;
    let hasEnoughConn = conn >= lot.requiredConnections;
    let minLvl = lot.isExclusive ? 20 : 12;
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
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
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    if (lvl < minLvl) return showToast("Выкуп доступен с " + minLvl + " уровня!");

    let conn = (state.player && state.player.connections) ? state.player.connections : 0;
    if (conn < lot.requiredConnections) return showToast("Требуется минимум " + lot.requiredConnections + " 🤝 связей!");

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < lot.price) return showToast("Не хватает денег! Нужно " + lot.price.toLocaleString() + " ₽.");

    let maxSlots = getTotalGarageSlots();
    let currentSlots = (state.garage && state.garage.length) ? state.garage.length : 0;
    if (currentSlots >= maxSlots) return showToast("В гараже нет свободного места!");

    state.player.cash -= lot.price;
    state.player.connections -= lot.requiredConnections;

    const carToAdd = Object.assign({}, lot);
    carToAdd.id = 'car_conf_' + Date.now();
    carToAdd.purchaseCost = lot.price;
    carToAdd.tuning = { chip: lot.isExclusive ? 1 : 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 };

    if (!state.garage) state.garage = [];
    state.garage.push(carToAdd);
    state.confiscatedLot = null;
    saveState();
    renderGarage();
    renderConfiscatedCardUI();

    let vTitle = lot.isExclusive ? "РЕЗЕРВ ФССП ВЫКУПЛЕН! 👑" : "АВТО СО ШТРАФСТОЯНКИ! 🚔";
    openVerdictModal(vTitle, "Вы забрали " + lot.name + " с солидным дисконтом!", true, lot.marketValue - lot.price);
}

// ----------------------------------------------------
// 2. ИНТЕРАКТИВНЫЙ БИЗНЕС
// ----------------------------------------------------
function checkBusinessAccess() {
    const lock = document.getElementById('businessLockCover');
    const activeBox = document.getElementById('businessActiveBox');
    let lvl = (state.player && state.player.level) ? state.player.level : 1;

    if (lvl < 5) {
        if (activeBox) activeBox.style.display = 'none';
        if (lock) lock.style.display = 'block';
        return;
    }

    if (lock) lock.style.display = 'none';
    if (activeBox) activeBox.style.display = 'block';
    renderBusinessList();
}

function renderBusinessList() {
    const list = document.getElementById('businessList');
    if (!list) return;

    if (!state.businesses || state.businesses.length === 0) {
        if (typeof BUSINESS_DATA !== 'undefined') state.businesses = JSON.parse(JSON.stringify(BUSINESS_DATA));
    }

    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    let html = "";

    state.businesses.forEach((biz, idx) => {
        if (!biz) return;
        let isMax = biz.level >= 10;
        let isLocked = lvl < biz.minLevel;
        let cost = (biz.level > 0) ? biz.cost * (biz.level + 1) : biz.cost;

        const defaultBizImgs = [
            'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&q=80',
            'https://images.unsplash.com/photo-1599256614138-0ceec0e766c8?w=400&q=80',
            'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?w=400&q=80',
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80'
        ];
        const imgSrc = biz.img ? biz.img : defaultBizImgs[idx % defaultBizImgs.length];

        let lockBlock = isLocked ? "<div class='cooldown-timer' style='display:flex; opacity:1; font-size:14px;'><i class='fa-solid fa-lock mb-2'></i> С " + biz.minLevel + " УРОВНЯ</div>" : "";
        let rankText = isMax ? "MAX" : "Ур. " + (biz.level || 0);

        let storedBlock = "";
        if (biz.level > 0) {
            let s = biz.stored ? biz.stored : 0;
            storedBlock = "<div class='color-green text-xs font-bold mb-2'>В кассе: " + s.toLocaleString() + " ₽</div>";
        }

        let btnClass = isMax ? "btn-dark" : "btn-cyan";
        let dis = (isMax || isLocked) ? "disabled" : "";
        let btnText = "Купить (" + cost.toLocaleString() + " ₽)";
        if (isMax) btnText = "Максимум";
        else if (isLocked) btnText = "С " + biz.minLevel + " ур";
        else if (biz.level > 0) btnText = "Улучшить (" + cost.toLocaleString() + " ₽)";

        let cardClass = "business-card" + (!isLocked ? " unlocked" : "");
        let imgClass = "business-img-box" + (isLocked ? " item-locked" : "");

        let bInc = biz.income ? biz.income : 0;
        let bLvl = biz.level ? biz.level : 0;
        let incTotal = bInc * bLvl;
        let stockVal = (biz.stock !== undefined) ? biz.stock : 75;

        html += 
        "<div class='" + cardClass + "'>" +
            "<div class='" + imgClass + "'>" +
                "<img src='" + imgSrc + "' class='business-img' onerror=\"this.src='https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=400&q=80'\">" +
                lockBlock +
                "<div class='badge-tag bg-tag-cyan' style='bottom:8px; left:8px; right:auto;'>" + rankText + "</div>" +
            "</div>" +
            "<div class='business-content'>" +
                "<div class='flex-between mb-1'>" +
                    "<b class='text-xs'>" + biz.name + "</b>" +
                    "<div class='sub-label'>Доход: <span class='color-green font-bold'>" + incTotal.toLocaleString() + " ₽/д</span></div>" +
                "</div>" +
                "<div class='business-perk-badge mb-2'>⭐ Перк: " + (biz.perk ? biz.perk : 'Пассивный доход') + "</div>" +
                "<div class='sub-label text-xs mb-1'>Склад сырья и деталей: " + stockVal + "%</div>" +
                "<div class='biz-progress-track'><div class='biz-progress-fill fill-biz-stock' style='width:" + stockVal + "%;'></div></div>" +
                storedBlock +
                "<div class='grid-2 mt-2'>" +
                    "<button onclick='upgradeBusiness(" + idx + ")' class='btn " + btnClass + " btn-sm' " + dis + ">" + btnText + "</button>" +
                    "<button onclick='restockBusiness(" + idx + ")' class='btn btn-amber btn-sm' " + (isLocked ? "disabled" : "") + ">Сырьё (+50%)</button>" +
                "</div>" +
            "</div>" +
        "</div>";
    });

    list.innerHTML = html;
}

function upgradeBusiness(idx) {
    const b = state.businesses[idx];
    if (!b) return;

    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    if (lvl < b.minLevel) return showToast("Этот бизнес доступен с " + b.minLevel + " уровня!");
    if (b.level >= 10) return showToast("Бизнес достиг максимума!");

    let cost = (b.level > 0) ? b.cost * (b.level + 1) : b.cost;
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < cost) return showToast("Не хватает денег!");

    state.player.cash -= cost;
    b.level = (b.level || 0) + 1;
    if (b.stock === undefined) b.stock = 100;
    saveState();
    checkBusinessAccess();
    showToast("Бизнес «" + b.name + "» улучшен до " + b.level + " уровня!");
}

function restockBusiness(idx) {
    const b = state.businesses[idx];
    if (!b) return;
    let cost = 15000;
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < cost) return showToast("Нужно 15,000 ₽ на партию сырья!");

    state.player.cash -= cost;
    b.stock = Math.min(100, (b.stock || 0) + 50);
    saveState();
    renderBusinessList();
    showToast("Склад сырья пополнен (+50%)!");
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
    if (totalCollected <= 0) return showToast("В кассах предприятий пока пусто!");

    state.player.cash = (state.player.cash || 0) + totalCollected;
    saveState();
    checkBusinessAccess();
    tgHaptic('success');
    playSound('win');
    spawnFloatingReward("+" + totalCollected.toLocaleString() + " ₽");
    showToast("Собрана выручка: +" + totalCollected.toLocaleString() + " ₽!");
}

// ----------------------------------------------------
// 3. САРАИ: 4 ГРЕЙДА И ЛУТ
// ----------------------------------------------------
function renderBarnFind() {
    const container = document.getElementById('barnFindContent');
    if (!container) return;

    const pDay = (state.player && state.player.day) ? state.player.day : 1;
    const lastDay = (state.player && state.player.lastBarnDay) ? state.player.lastBarnDay : 0;
    const canScoutToday = lastDay < pDay;
    const lvl = (state.player && state.player.level) ? state.player.level : 1;

    let html = "";
    BARN_TIERS_CONFIG.forEach(b => {
        let isLvlLocked = lvl < b.reqLvl;
        let isDoneToday = !canScoutToday;

        let statusBadge = "";
        let btnDisabled = "";
        let btnText = "Вскрыть ангар (" + (b.cost / 1000).toFixed(0) + "k ₽)";

        if (isLvlLocked) {
            statusBadge = "<span class='tag-badge bg-tag-red'><i class='fa-solid fa-lock'></i> С " + b.reqLvl + " УР</span>";
            btnDisabled = "disabled";
            btnText = "Требуется " + b.reqLvl + " уровень";
        } else if (isDoneToday) {
            statusBadge = "<span class='tag-badge bg-tag-amber'>Разведка завершена</span>";
            btnDisabled = "disabled";
            btnText = "Доступно завтра (Смена дня 🌙)";
        } else {
            statusBadge = "<span class='tag-badge bg-tag-green'>Готово к разведке</span>";
        }

        html += 
        "<div class='barn-tier-card " + b.classGrade + "'>" +
            "<div class='flex-between mb-1'>" +
                "<b class='text-xs color-cyan'>" + b.title + "</b>" +
                statusBadge +
            "</div>" +
            "<p class='sub-label mb-2'>" + b.desc + "</p>" +
            "<div class='text-xs mb-1 color-amber'>⭐ Редкий дроп (5%): <b>" + b.rareName + "</b></div>" +
            "<div class='text-xs mb-2 color-purple'>🏷️ Шанс на блатные номера: <b>15%</b></div>" +
            "<button onclick='scoutBarnTier(" + b.tier + ")' class='btn btn-cyan btn-sm w-full' " + btnDisabled + ">" +
                btnText +
            "</button>" +
        "</div>";
    });

    container.innerHTML = html;
}

function scoutBarnTier(tier) {
    const pDay = (state.player && state.player.day) ? state.player.day : 1;
    const lastDay = (state.player && state.player.lastBarnDay) ? state.player.lastBarnDay : 0;
    if (lastDay >= pDay) return showToast("Вы уже исследовали сараи сегодня! Смените день 🌙.");

    const config = BARN_TIERS_CONFIG.find(b => b.tier === tier);
    if (!config) return;

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < config.cost) return showToast("Не хватает " + config.cost.toLocaleString() + " ₽ на разведку!");

    let maxSlots = getTotalGarageSlots();
    let currentSlots = (state.garage && state.garage.length) ? state.garage.length : 0;
    if (currentSlots >= maxSlots) return showToast("Гараж переполнен! Освободите бокс для находки.");

    state.player.cash -= config.cost;
    state.player.lastBarnDay = pDay;

    let isRare = Math.random() < 0.05;
    let foundCar = null;

    if (isRare) {
        foundCar = {
            name: config.rareName,
            power: 140,
            basePrice: config.cost * 4,
            img: config.rareImg
        };
    } else {
        const pool = config.pool;
        foundCar = pool[Math.floor(Math.random() * pool.length)];
    }

    let genPlate = "ТРАНЗИТ";
    let isCoolPlate = Math.random() < 0.15;
    if (isCoolPlate && typeof generateCoolPlate === 'function') {
        genPlate = generateCoolPlate();
    } else if (typeof generateNormalPlate === 'function') {
        genPlate = generateNormalPlate();
    }

    let pVal = 0;
    if (typeof calculatePlateValue === 'function') pVal = calculatePlateValue(genPlate);

    let newCar = {
        id: "barn_" + Date.now(),
        name: foundCar.name,
        type: 'economy',
        power: foundCar.power,
        basePrice: foundCar.basePrice,
        price: foundCar.basePrice,
        baseMarketValue: foundCar.basePrice,
        marketValue: foundCar.basePrice + pVal,
        img: foundCar.img,
        plate: genPlate,
        customPlate: genPlate,
        condition: Math.floor(40 + Math.random() * 25),
        wear: { engine: 50, transmission: 50 },
        hiddenDefect: { text: "Залегшие кольца и старое масло", cost: 15000 },
        tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 },
        purchaseCost: config.cost
    };

    if (!state.garage) state.garage = [];
    state.garage.push(newCar);

    saveState();
    renderBarnFind();
    playSound('win');
    tgHaptic('success');

    let verdictMsg = "В дальнем углу обнаружен «" + newCar.name + "»!";
    if (isCoolPlate) verdictMsg += " На кузове висят архивные номера " + genPlate + "!";
    openVerdictModal("НАХОДКА В САРАЕ! 🏚️", verdictMsg, true, 0);
}

// ----------------------------------------------------
// 4. ИНТЕРАКТИВНОЕ ЖИЛЬЁ И ОБУСТРОЙСТВО
// ----------------------------------------------------
function renderHousing() {
    const list = document.getElementById('housingMarketList');
    if (!list || typeof HOUSING_LIST === 'undefined') return;

    let curId = (state.player && state.player.housingId) ? state.player.housingId : 'room';
    let owned = (state.player && state.player.ownedHouses) ? state.player.ownedHouses : [];

    let currentHouse = HOUSING_LIST.find(h => h.id === curId);
    let curTitle = currentHouse ? currentHouse.name : "Комната";
    setTxt('currentHomeText', "Текущее: " + curTitle);

    let html = "";
    HOUSING_LIST.forEach(h => {
        let isCurrent = curId === h.id;
        let isPurchased = owned.includes(h.id);

        let statusTag = isPurchased 
            ? "<span class='tag-badge bg-tag-green'>В собственности</span>" 
            : "<span class='tag-badge bg-tag-amber'>Аренда</span>";

        let actionBtns = "";
        if (isCurrent && isPurchased) {
            actionBtns = 
            "<div class='grid-2 mt-2'>" +
                "<button onclick=\"openHomeInteriorModal('" + h.id + "')\" class='btn btn-cyan btn-sm'>🛋️ Обустройство дома</button>" +
                "<button class='btn btn-dark btn-sm opacity-50' disabled>Текущее жилье</button>" +
            "</div>";
        } else if (isCurrent && !isPurchased) {
            actionBtns = 
            "<div class='grid-2 mt-2'>" +
                "<button onclick=\"buyHousingProperty('" + h.id + "')\" class='btn btn-amber btn-sm'>Выкупить (" + (h.buyPrice / 1000000).toFixed(1) + "M ₽)</button>" +
                "<button class='btn btn-dark btn-sm opacity-50' disabled>Арендовано</button>" +
            "</div>";
        } else if (isPurchased) {
            actionBtns = 
            "<div class='grid-2 mt-2'>" +
                "<button onclick=\"openHomeInteriorModal('" + h.id + "')\" class='btn btn-cyan btn-sm'>🛋️ Обустройство</button>" +
                "<button onclick=\"moveIntoHousing('" + h.id + "')\" class='btn btn-green btn-sm'>Переехать 🚚</button>" +
            "</div>";
        } else {
            actionBtns = 
            "<div class='grid-2 mt-2'>" +
                "<button onclick=\"rentHousing('" + h.id + "')\" class='btn btn-cyan btn-sm'>Аренда (" + h.rentPrice.toLocaleString() + " ₽/д)</button>" +
                "<button onclick=\"buyHousingProperty('" + h.id + "')\" class='btn btn-amber btn-sm'>Купить (" + (h.buyPrice / 1000000).toFixed(1) + "M ₽)</button>" +
            "</div>";
        }

        html += 
        "<div class='glass-card mb-3'>" +
            "<div class='car-img-wrap' style='height:140px;'>" +
                "<img src='" + h.img + "' class='car-img' onerror=\"this.src='https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=400&q=80'\">" +
                "<div class='badge-tag' style='bottom:8px; right:8px;'>" + statusTag + "</div>" +
            "</div>" +
            "<div class='flex-between mb-1'>" +
                "<h4 class='font-bold'>" + h.name + "</h4>" +
                "<div class='color-cyan font-bold text-xs'>+" + h.slots + " мест гаража</div>" +
            "</div>" +
            "<p class='sub-label mb-2'>" + h.desc + "</p>" +
            actionBtns +
        "</div>";
    });

    list.innerHTML = html;
}

function rentHousing(hId) {
    state.player.housingId = hId;
    state.player.housingType = 'rent';
    saveState();
    renderHousing();
    updateHeaderUI();
    showToast("Вы переехали в арендованное жилье!");
}

function buyHousingProperty(hId) {
    const h = HOUSING_LIST.find(item => item.id === hId);
    if (!h) return;

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < h.buyPrice) return showToast("Не хватает денег на покупку!");

    state.player.cash -= h.buyPrice;
    if (!state.player.ownedHouses) state.player.ownedHouses = [];
    if (!state.player.ownedHouses.includes(hId)) state.player.ownedHouses.push(hId);
    state.player.housingId = hId;
    state.player.housingType = 'own';

    saveState();
    renderHousing();
    updateHeaderUI();
    playSound('win');
    tgHaptic('success');
    openVerdictModal("НОВОСЕЛЬЕ! 🍾", "Вы выкупили недвижимость «" + h.name + "» в собственность!", true);
}

function moveIntoHousing(hId) {
    state.player.housingId = hId;
    state.player.housingType = 'own';
    saveState();
    renderHousing();
    updateHeaderUI();
    showToast("Вы переехали в собственное жилье!");
}

function openHomeInteriorModal(hId) {
    const h = HOUSING_LIST.find(item => item.id === hId);
    if (!h) return;

    setTxt('homeInteriorHeader', "Обустройство: <b>" + h.name + "</b> (Собственность)");
    if (!state.player.furniture) state.player.furniture = [];

    const list = document.getElementById('homeInteriorItemsList');
    if (!list) return;

    let html = "";
    HOUSING_INTERIOR_CATALOG.forEach(item => {
        let isBought = state.player.furniture.includes(item.id);
        let btnContent = isBought 
            ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Куплено ✓</button>" 
            : "<button onclick=\"buyHomeFurniture('" + item.id + "', " + item.cost + ")\" class='btn btn-green btn-sm btn-auto'>" + (item.cost / 1000).toFixed(0) + "k ₽</button>";

        html += 
        "<div class='glass-card p-2 flex-between mb-2'>" +
            "<div>" +
                "<div class='font-bold text-xs color-cyan'>" + item.name + "</div>" +
                "<div class='sub-label' style='font-size:10px;'>" + item.perk + "</div>" +
            "</div>" +
            btnContent +
        "</div>";
    });

    list.innerHTML = html;
    const modal = document.getElementById('modalHomeInterior');
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function buyHomeFurniture(fId, cost) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < cost) return showToast("Не хватает денег на покупку!");

    state.player.cash -= cost;
    if (!state.player.furniture) state.player.furniture = [];
    state.player.furniture.push(fId);

    saveState();
    updateHeaderUI();
    playSound('win');
    tgHaptic('success');
    showToast("Установлено в вашем доме!");

    let curId = (state.player && state.player.housingId) ? state.player.housingId : 'room';
    openHomeInteriorModal(curId);
}

// ----------------------------------------------------
// 5. МАГАЗИН ПЕРЕКУПА (ПОЛНОСТЬЮ)
// ----------------------------------------------------
function switchShopSection(sec) {
    ['tools', 'consumables', 'tuningParts', 'homeItems'].forEach(s => {
        const el = document.getElementById('shopSec-' + s);
        const btn = document.getElementById('shopTab-' + s);
        if (el) el.style.display = (s === sec) ? 'block' : 'none';
        if (btn) {
            if (s === sec) {
                btn.classList.add('btn-cyan');
                btn.classList.remove('btn-dark');
            } else {
                btn.classList.remove('btn-cyan');
                btn.classList.add('btn-dark');
            }
        }
    });

    if (sec === 'tools') renderShopTools();
    if (sec === 'consumables') renderShopConsumables();
    if (sec === 'tuningParts') renderShopTuningParts();
    if (sec === 'homeItems') renderShopHomeItems();
}

function renderShopTools() {
    const box = document.getElementById('shopToolsList');
    if (!box) return;

    const tools = [
        { id: 'gauge', name: "Толщиномер ЛКП", cost: 15000, desc: "Бесплатный замер шпакли в объявлениях" },
        { id: 'obd', name: "OBD2 Сканер ЭБУ", cost: 25000, desc: "Чтение реального износа и ошибок мотора" },
        { id: 'endoscope', name: "Эндоскоп двигателя", cost: 40000, desc: "Проверка задиров в цилиндрах при покупке" }
    ];

    let html = "";
    tools.forEach(t => {
        let has = state.player.tools && state.player.tools[t.id];
        let btn = has 
            ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Куплено ✓</button>" 
            : "<button onclick=\"buyToolAction('" + t.id + "', " + t.cost + ")\" class='btn btn-cyan btn-sm btn-auto'>" + t.cost.toLocaleString() + " ₽</button>";

        html += 
        "<div class='glass-card p-2 flex-between mb-2'>" +
            "<div>" +
                "<b class='text-xs color-cyan'>" + t.name + "</b>" +
                "<div class='sub-label'>" + t.desc + "</div>" +
            "</div>" +
            btn +
        "</div>";
    });
    box.innerHTML = html;
}

function buyToolAction(tId, cost) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < cost) return showToast("Не хватает денег!");
    state.player.cash -= cost;
    if (!state.player.tools) state.player.tools = {};
    state.player.tools[tId] = true;
    saveState();
    renderShopTools();
    playSound('win');
    showToast("Прибор куплен и добавлен в арсенал!");
}

function renderShopConsumables() {
    const box = document.getElementById('shopConsumablesList');
    if (!box) return;
    box.innerHTML = 
        "<div class='glass-card p-2 flex-between mb-2'>" +
            "<div><b class='text-xs color-amber'>Партия автошампуня (Мойка)</b><div class='sub-label'>Расходники для 100% сырья</div></div>" +
            "<button onclick='buyGenericSupplies(15000)' class='btn btn-amber btn-sm btn-auto'>15,000 ₽</button>" +
        "</div>" +
        "<div class='glass-card p-2 flex-between mb-2'>" +
            "<div><b class='text-xs color-amber'>Комплект масел и фильтров (СТО)</b><div class='sub-label'>Запас расходников для слесарей</div></div>" +
            "<button onclick='buyGenericSupplies(25000)' class='btn btn-amber btn-sm btn-auto'>25,000 ₽</button>" +
        "</div>";
}

function buyGenericSupplies(cost) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < cost) return showToast("Не хватает денег!");
    state.player.cash -= cost;
    if (state.businesses) {
        state.businesses.forEach(b => { if (b.unlocked) b.stock = 100; });
    }
    saveState();
    renderBusinessList();
    playSound('win');
    showToast("Все предприятия обеспечены сырьём на 100%!");
}

function renderShopTuningParts() {
    const box = document.getElementById('shopTuningPartsList');
    if (!box) return;
    box.innerHTML = 
        "<div class='glass-card p-2 flex-between mb-2'>" +
            "<div><b class='text-xs color-red'>🏎️ Лицензия пилота РАФ</b><div class='sub-label'>Допуск к ночным заездам на 402м</div></div>" +
            "<button onclick=\"buyReshalaService('license')\" class='btn btn-cyan btn-sm btn-auto'>85,000 ₽</button>" +
        "</div>" +
        "<div class='glass-card p-2 flex-between mb-2'>" +
            "<div><b class='text-xs color-red'>🔩 Комплект выворота (Красноярск)</b><div class='sub-label'>Необходимо для заездов в дрифте</div></div>" +
            "<button onclick='switchTab(\"tabGarage\")' class='btn btn-dark btn-sm btn-auto'>В Тюнинг</button>" +
        "</div>";
}

function renderShopHomeItems() {
    const box = document.getElementById('shopHomeItemsList');
    if (!box) return;
    box.innerHTML = 
        "<div class='glass-card p-2 flex-between mb-2'>" +
            "<div><b class='text-xs color-green'>🎮 PlayStation 5</b><div class='sub-label'>+25% к настроению каждый день</div></div>" +
            "<button onclick='switchTab(\"tabHousing\")' class='btn btn-cyan btn-sm btn-auto'>В Недвижимость</button>" +
        "</div>" +
        "<div class='glass-card p-2 flex-between mb-2'>" +
            "<div><b class='text-xs color-green'>🛋️ Мягкая мебель</b><div class='sub-label'>Обустройство собственного жилья</div></div>" +
            "<button onclick='switchTab(\"tabHousing\")' class='btn btn-cyan btn-sm btn-auto'>В Недвижимость</button>" +
        "</div>";
}

// ----------------------------------------------------
// 6. ПОРТОВЫЕ КОНТЕЙНЕРЫ И ЗАКАЗЫ СИНДИКАТА
// ----------------------------------------------------
function renderContainersList() {
    const container = document.getElementById('containersListRender');
    const lockCover = document.getElementById('containersLockCover');
    let lvl = (state.player && state.player.level) ? state.player.level : 1;

    if (lvl < 20) {
        if (container) container.style.display = 'none';
        if (lockCover) lockCover.style.display = 'block';
        return;
    }

    if (lockCover) lockCover.style.display = 'none';
    if (container) {
        container.style.display = 'block';
        container.innerHTML = 
        "<div class='glass-card card-purple mb-3'>" +
            "<div class='flex-between mb-2'>" +
                "<div><b class='color-purple'>Контейнер из Дубая</b><div class='sub-label'>Шанс на гиперкар или пустой кузов</div></div>" +
                "<span class='price-val color-purple'>1,500,000 ₽</span>" +
            "</div>" +
            "<button onclick='openPortContainerAction(1500000)' class='btn btn-purple w-full'>Вскрыть контейнер</button>" +
        "</div>";
    }
}

function openPortContainerAction(cost) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < cost) return showToast("Не хватает денег на таможенный контейнер!");
    state.player.cash -= cost;

    let isWin = Math.random() < 0.45;
    if (isWin) {
        let winPrize = Math.round(cost * (1.5 + Math.random()));
        state.player.cash += winPrize;
        saveState();
        updateHeaderUI();
        playSound('win');
        openVerdictModal("ТАМОЖЕННЫЙ КУШ! 🚢", "В контейнере найден раритетный спорткар! Прибыль с лота: +" + winPrize.toLocaleString() + " ₽", true, winPrize);
    } else {
        saveState();
        updateHeaderUI();
        tgHaptic('error');
        openVerdictModal("ТАМОЖЕННЫЙ ПУСТЫШКА 💨", "В контейнере оказались только битые запчасти. Убыток: -" + cost.toLocaleString() + " ₽", false);
    }
}

function renderContracts() {
    const list = document.getElementById('contractsList');
    const lockCover = document.getElementById('contractsLockCover');
    let lvl = (state.player && state.player.level) ? state.player.level : 1;

    if (lvl < 15) {
        if (list) list.style.display = 'none';
        if (lockCover) lockCover.style.display = 'block';
        return;
    }

    if (lockCover) lockCover.style.display = 'none';
    if (list) {
        list.style.display = 'block';
        list.innerHTML = 
        "<div class='glass-card mb-2'>" +
            "<div class='flex-between mb-1'>" +
                "<b class='text-xs color-cyan'>Подбор Mercedes W221 для чиновника</b>" +
                "<span class='color-green font-bold text-xs'>+250,000 ₽</span>" +
            "</div>" +
            "<p class='sub-label mb-2'>Требуется авто в идеале без ДТП и окрасов.</p>" +
            "<button onclick='completeContractAction(250000)' class='btn btn-cyan btn-sm w-full'>Сдать заказ клиенту</button>" +
        "</div>";
    }
}

function refreshContractsManual() {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < 15000) return showToast("Нужно 15,000 ₽ на обновление базы!");
    state.player.cash -= 15000;
    saveState();
    updateHeaderUI();
    renderContracts();
    showToast("База заказов обновлена!");
}

function completeContractAction(reward) {
    state.player.cash = (state.player.cash || 0) + reward;
    addXp(45);
    saveState();
    updateHeaderUI();
    playSound('win');
    showToast("Заказ Синдиката выполнен! +" + reward.toLocaleString() + " ₽");
}

// ----------------------------------------------------
// 7. ЛОМБАРД, СМЕНА ДНЯ, РАЦИОН И ЧАТ
// ----------------------------------------------------
function takeLoan(amount) {
    let debt = (state.player && state.player.loanDebt) ? state.player.loanDebt : 0;
    if (debt >= 1000000) return showToast("Лимит долга исчерпан!");

    state.player.cash = (state.player.cash || 0) + (amount * 0.95);
    state.player.loanDebt = debt + amount;
    saveState();
    updateHeaderUI();
    showToast("Одобрено: " + amount.toLocaleString() + " ₽ (Комиссия 5%)");
}

function repayLoan(percent) {
    let debt = (state.player && state.player.loanDebt) ? state.player.loanDebt : 0;
    if (debt <= 0) return showToast("У вас нет задолженности!");

    let amt = Math.ceil(debt * (percent / 100));
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < amt) return showToast("Не хватает денег для оплаты!");

    state.player.cash -= amt;
    state.player.loanDebt = Math.max(0, debt - amt);
    saveState();
    updateHeaderUI();
    showToast("Оплачено " + amt.toLocaleString() + " ₽ долга");
}

function nextDayAction() {
    state.player.day = (state.player.day || 1) + 1;
    state.player.expressTickets = state.player.maxExpressTickets ? state.player.maxExpressTickets : 25;
    state.player.consecutiveRaces = 0;

    let curId = (state.player && state.player.housingId) ? state.player.housingId : 'room';
    let isOwn = (state.player && state.player.ownedHouses) ? state.player.ownedHouses.includes(curId) : false;
    if (!isOwn && typeof HOUSING_LIST !== 'undefined') {
        const h = HOUSING_LIST.find(item => item.id === curId);
        if (h && h.rentPrice) {
            state.player.cash = Math.max(0, (state.player.cash || 0) - h.rentPrice);
        }
    }

    if (state.player.furniture && state.player.furniture.includes('ps5')) {
        state.player.mood = Math.min(100, (state.player.mood || 85) + 25);
    }

    if (state.player.policeImmunityDays && state.player.policeImmunityDays > 0) {
        state.player.policeImmunityDays -= 1;
    }

    // Начисление выручки с предприятий
    if (state.businesses) {
        state.businesses.forEach(b => {
            if (b && b.level > 0) {
                let currentStored = b.stored ? b.stored : 0;
                let inc = b.income ? b.income : 0;
                b.stored = currentStored + (inc * b.level);
            }
        });
    }

    saveState();
    updateHeaderUI();
    renderHousing();
    renderBarnFind();
    checkBusinessAccess();
    playSound('tick');
    tgHaptic('light');
    showToast("Наступил новый игровой день ☀️ Талоны пополнены, кассы пополнились!");
}

function renderDiets() {
    const list = document.getElementById('dietList');
    if (!list) return;

    const diets = [
        { id: "shaurma", name: "Шаурма на вокзале", cost: 350, hunger: 25, mood: 10 },
        { id: "stolovaya", name: "Обед в рабочей столовой", cost: 750, hunger: 50, mood: 20 },
        { id: "restik", name: "Ресторан у авторынка", cost: 3500, hunger: 90, mood: 50 }
    ];

    let html = "";
    diets.forEach(d => {
        html += 
        "<div class='glass-card flex-between p-2 mb-1'>" +
            "<div>" +
                "<b class='text-xs color-green'>" + d.name + "</b>" +
                "<div class='sub-label'>Сытость: +" + d.hunger + "% / Настроение: +" + d.mood + "%</div>" +
            "</div>" +
            "<button onclick=\"eatMeal('" + d.id + "', " + d.cost + ", " + d.hunger + ", " + d.mood + ")\" class='btn btn-dark btn-auto btn-sm'>" + d.cost.toLocaleString() + " ₽</button>" +
        "</div>";
    });
    list.innerHTML = html;
}

function eatMeal(id, cost, hunger, mood) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < cost) return showToast("Не хватает денег на еду!");

    state.player.cash -= cost;
    state.player.hunger = Math.min(100, (state.player.hunger || 80) + hunger);
    state.player.mood = Math.min(100, (state.player.mood || 85) + mood);

    saveState();
    updateHeaderUI();
    showToast("Вы перекусили! Силы восстановлены.");
}

function renderLifeChat() {
    const feed = document.getElementById('lifeChatFeed');
    if (!feed) return;
    if (!state.lifeChatMessages || state.lifeChatMessages.length === 0) {
        state.lifeChatMessages = [
            { sender: "Колян_99", text: "Кто на кольце сегодня? ДПСников вроде нет." },
            { sender: "Артур_Решала", text: "Номера 777 в наличии, пишите в личку." },
            { sender: "Серый_СТО", text: "Сварка выворота на классику — скидки до конца дня." }
        ];
    }
    let html = "";
    state.lifeChatMessages.forEach(m => {
        let isMine = m.isMine ? "mine" : "";
        html += 
        "<div class='chat-bubble " + isMine + "'>" +
            "<b class='color-cyan text-xs'>" + m.sender + ":</b> " + m.text +
        "</div>";
    });
    feed.innerHTML = html;
    feed.scrollTop = feed.scrollHeight;
}

function sendChatMessageFromInput() {
    const input = document.getElementById('feedMessageInput');
    if (!input || !input.value.trim()) return;

    if (!state.lifeChatMessages) state.lifeChatMessages = [];
    state.lifeChatMessages.push({
        sender: (state.player && state.player.name) ? state.player.name : "Вы",
        text: input.value.trim(),
        isMine: true
    });

    input.value = "";
    saveState();
    renderLifeChat();
}

// ----------------------------------------------------
// 8. ФОРТУНА: ВИЛСПИН, НАПЁРСТКИ, КАЗИНО 21, АЗС, ADSGRAM
// ----------------------------------------------------
let currentThimblesBet = 10000;

function setThimblesBet(amt) {
    currentThimblesBet = amt;
    setTxt('thimblesBetText', amt.toLocaleString() + " ₽");
    tgHaptic('light');
}

function playThimbles(chosenIdx) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < currentThimblesBet) return showToast("Не хватает денег на ставку в напёрстках!");

    state.player.cash -= currentThimblesBet;
    const winningIdx = Math.floor(Math.random() * 3);

    for (let i = 0; i < 3; i++) {
        const sec = document.getElementById('thimble-secret-' + i);
        if (sec) sec.innerText = (i === winningIdx) ? "🔑" : "❌";
    }

    if (chosenIdx === winningIdx) {
        let win = currentThimblesBet * 2;
        state.player.cash += win;
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        setTxt('thimblesResultText', "🎉 ВЫ УГАДАЛИ! Выигрыш: +" + win.toLocaleString() + " ₽!");
    } else {
        saveState();
        updateHeaderUI();
        tgHaptic('error');
        setTxt('thimblesResultText', "💨 Пусто! Ключ был под другим стаканчиком.");
    }

    setTimeout(() => {
        for (let i = 0; i < 3; i++) {
            const sec = document.getElementById('thimble-secret-' + i);
            if (sec) sec.innerText = "";
        }
    }, 2000);
}

function initWheelModule() {
    const cvs = document.getElementById('wheelCanvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const sectors = ["10k ₽", "100k ₽", "50k ₽", "1 🤝", "500k ₽", "25 ⛽", "0 ₽", "⭐ Stars"];
    const colors = ["#00f2fe", "#00e676", "#ffb300", "#c084fc", "#ff3366", "#38bdf8", "#475569", "#fbbf24"];

    const arc = (2 * Math.PI) / sectors.length;
    for (let i = 0; i < sectors.length; i++) {
        ctx.beginPath();
        ctx.fillStyle = colors[i];
        ctx.moveTo(270, 270);
        ctx.arc(270, 270, 260, i * arc, (i + 1) * arc);
        ctx.fill();
        ctx.save();
        ctx.fillStyle = "#000";
        ctx.font = "bold 20px sans-serif";
        ctx.translate(270 + Math.cos(i * arc + arc / 2) * 160, 270 + Math.sin(i * arc + arc / 2) * 160);
        ctx.rotate(i * arc + arc / 2 + Math.PI / 2);
        ctx.fillText(sectors[i], -ctx.measureText(sectors[i]).width / 2, 0);
        ctx.restore();
    }
}

function spinWheelAction(isFree) {
    if (isFree) {
        let pDay = (state.player && state.player.day) ? state.player.day : 1;
        let last = (state.player && state.player.lastFreeSpinDay) ? state.player.lastFreeSpinDay : 0;
        if (last >= pDay) return showToast("Бесплатный спин доступен раз в день!");
        state.player.lastFreeSpinDay = pDay;
    } else {
        let stars = (state.player && state.player.stars) ? state.player.stars : 0;
        if (stars < 25) return showToast("Нужно 25 Stars ⭐!");
        state.player.stars -= 25;
    }

    const cvs = document.getElementById('wheelCanvas');
    if (!cvs) return;

    let rot = Math.floor(1800 + Math.random() * 1800);
    cvs.style.transition = "transform 3s cubic-bezier(0.1, 0.9, 0.2, 1)";
    cvs.style.transform = "rotate(" + rot + "deg)";

    setTimeout(() => {
        let win = 50000;
        state.player.cash = (state.player.cash || 0) + win;
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("ПРИЗ С КОЛЕСА! 🎡", "Вы выиграли +" + win.toLocaleString() + " ₽!", true, win);
    }, 3200);
}

let casinoBet = 0;
let playerHand = [];
let dealerHand = [];

function initCasino() {
    setTxt('currentBetDisplay', casinoBet.toLocaleString() + " ₽");
}

function addCasinoBet(amt) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < casinoBet + amt) return showToast("Не хватает денег на ставку!");
    casinoBet += amt;
    setTxt('currentBetDisplay', casinoBet.toLocaleString() + " ₽");
    playSound('tick');
}

function clearCasinoBet() {
    casinoBet = 0;
    setTxt('currentBetDisplay', "0 ₽");
}

function setCasinoMaxBet() {
    casinoBet = 50000;
    setTxt('currentBetDisplay', casinoBet.toLocaleString() + " ₽");
}

function startCasinoGame() {
    if (casinoBet <= 0) return showToast("Сделайте ставку!");
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < casinoBet) return showToast("Не хватает денег!");

    state.player.cash -= casinoBet;
    playerHand = [getCardVal(), getCardVal()];
    dealerHand = [getCardVal()];

    const bArea = document.getElementById('casinoBettingArea');
    const pArea = document.getElementById('casinoPlayingArea');
    if (bArea) bArea.style.display = 'none';
    if (pArea) pArea.style.display = 'block';
    updateCasinoUI();
}

function getCardVal() {
    return Math.floor(Math.random() * 9) + 2;
}

function getHandScore(hand) {
    let sum = 0;
    hand.forEach(v => { sum += v; });
    return sum;
}

function updateCasinoUI() {
    setTxt('playerScore', getHandScore(playerHand));
    setTxt('dealerScore', getHandScore(dealerHand));

    const pBox = document.getElementById('playerHandBox');
    const dBox = document.getElementById('dealerHandBox');
    if (pBox) pBox.innerHTML = playerHand.map(c => "<span class='tag-badge bg-tag-cyan'>" + c + "</span>").join(" ");
    if (dBox) dBox.innerHTML = dealerHand.map(c => "<span class='tag-badge bg-tag-red'>" + c + "</span>").join(" ");
}

function hitCasino() {
    playerHand.push(getCardVal());
    updateCasinoUI();
    if (getHandScore(playerHand) > 21) {
        endCasinoGame(false, "Перебор! Больше 21 очка.");
    }
}

function standCasino() {
    while (getHandScore(dealerHand) < 17) {
        dealerHand.push(getCardVal());
    }
    updateCasinoUI();

    let p = getHandScore(playerHand);
    let d = getHandScore(dealerHand);

    if (d > 21 || p > d) {
        endCasinoGame(true, "Вы выиграли! У крупье " + d + " очков.");
    } else {
        endCasinoGame(false, "Крупье победил с " + d + " очками.");
    }
}

function endCasinoGame(isWin, msg) {
    const bArea = document.getElementById('casinoBettingArea');
    const pArea = document.getElementById('casinoPlayingArea');
    if (pArea) pArea.style.display = 'none';
    if (bArea) bArea.style.display = 'block';

    if (isWin) {
        let win = casinoBet * 2;
        state.player.cash = (state.player.cash || 0) + win;
        playSound('win');
        tgHaptic('success');
        openVerdictModal("ПОБЕДА В КЛУБЕ 21! 🃏", msg + " +" + win.toLocaleString() + " ₽", true, win);
    } else {
        tgHaptic('error');
        openVerdictModal("ПРОИГРЫШ В 21 💨", msg + " -" + casinoBet.toLocaleString() + " ₽", false);
    }

    casinoBet = 0;
    setTxt('currentBetDisplay', "0 ₽");
    saveState();
    updateHeaderUI();
}

function refuelAction(type) {
    if (type === 'cash') {
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;
        if (cash < 5000) return showToast("Нужно 5,000 ₽ на полный бак!");
        state.player.cash -= 5000;
        state.player.fuel = 100;
        saveState();
        updateHeaderUI();
        playSound('win');
        showToast("Бак заправлен на 100 ⛽!");
    } else {
        state.player.fuel = 100;
        saveState();
        updateHeaderUI();
        playSound('win');
        showToast("Заправка за рекламу завершена: 100 ⛽!");
    }
}

function watchAdsgram() {
    state.player.cash = (state.player.cash || 0) + 25000;
    state.player.connections = ((state.player && state.player.connections) ? state.player.connections : 0) + 1;
    saveState();
    updateHeaderUI();
    playSound('win');
    showToast("Награда за просмотр: +25,000 ₽ и +1 🤝!");
}

function roadAssistanceAction() {
    let fuel = (state.player && state.player.fuel) ? state.player.fuel : 0;
    if (fuel < 10) return showToast("Нужно 10 ⛽ бензина для выезда!");
    state.player.fuel -= 10;

    let karma = (state.player && state.player.karma) ? state.player.karma : 0;
    if (Math.random() < 0.65) {
        state.player.karma = Math.min(100, karma + 12);
        showToast("Вы прикурили аккумулятор на трассе! (+12 Кармы 😊)");
    } else {
        let conn = (state.player && state.player.connections) ? state.player.connections : 0;
        state.player.connections = conn + 1;
        state.player.karma = Math.min(100, karma + 5);
        showToast("Вы помогли сотруднику ведомства! (+1 🤝 Связь и +5 Карма)");
    }
    saveState();
    updateHeaderUI();
}

function donatePartsToMechanic() {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < 35000) return showToast("Нужно 35,000 ₽ на закупку деталей!");

    state.player.cash -= 35000;
    let conn = (state.player && state.player.connections) ? state.player.connections : 0;
    state.player.connections = conn + 1;
    let karma = (state.player && state.player.karma) ? state.player.karma : 0;
    state.player.karma = Math.min(100, karma + 8);

    saveState();
    updateHeaderUI();
    showToast("Дядя Ваня благодарен за запчасти! (+1 🤝 Связь и +8 Карма)");
}

function bigCharityDonate() {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < 100000) return showToast("Нужно 100,000 ₽!");

    state.player.cash -= 100000;
    let karma = (state.player && state.player.karma) ? state.player.karma : 0;
    state.player.karma = Math.min(100, karma + 25);

    saveState();
    updateHeaderUI();
    showToast("Доброе дело сделано! (+25 Кармы 😊)");
}

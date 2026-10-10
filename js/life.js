// ========================================================
// js/life.js — ЖИЗНЬ, РЕПУТАЦИЯ, СМЕНА ДНЯ, ФОРТУНА, ПОРТ (v0.4.4)
// ========================================================

// ========================================================
// 1. ФИНАНСОВЫЕ ОПЕРАЦИИ (ПЕРЕНЕСЕНЫ В «ВО-БАНК» В СМАРТФОНЕ)
// ========================================================
function depositToSafeAction(amount) {
    let cash = state.player?.cash || 0;
    if (cash < amount) return showToast("Не хватает наличных денег для внесения в сейф!");

    state.player.cash -= amount;
    state.player.safeDeposit = (state.player.safeDeposit || 0) + amount;
    saveState();
    updateHeaderUI();
    playSound('tick');
    tgHaptic('light');
    showToast(`Заначка пополнена на +${amount.toLocaleString()} ₽! Деньги защищены в Во-Банке.`);
}

function withdrawFromSafeAction() {
    let safeCash = state.player?.safeDeposit || 0;
    if (safeCash <= 0) return showToast("В сейфе пока пусто! Отложите часть прибыли.");

    state.player.cash = (state.player.cash || 0) + safeCash;
    state.player.safeDeposit = 0;
    saveState();
    updateHeaderUI();
    playSound('win');
    tgHaptic('success');
    spawnFloatingReward(`+${safeCash.toLocaleString()} ₽`);
    showToast(`Вы забрали всю заначку из сейфа: +${safeCash.toLocaleString()} ₽!`);
}

function takeLoan(amount) {
    let debt = (state.player && state.player.loanDebt) ? state.player.loanDebt : 0;
    if (debt >= 1000000) return showToast("Лимит долга в Во-Банке исчерпан!");

    state.player.cash = (state.player.cash || 0) + (amount * 0.95);
    state.player.loanDebt = debt + amount;
    saveState();
    updateHeaderUI();
    showToast("Во-Банк одобрил: " + amount.toLocaleString() + " ₽ (Комиссия 5%)");
}

function repayLoan(percent) {
    let debt = (state.player && state.player.loanDebt) ? state.player.loanDebt : 0;
    if (debt <= 0) return showToast("У вас нет задолженности перед банком!");

    let amt = Math.ceil(debt * (percent / 100));
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < amt) return showToast("Не хватает денег для оплаты долга!");

    state.player.cash -= amt;
    state.player.loanDebt = Math.max(0, debt - amt);
    saveState();
    updateHeaderUI();
    showToast("Оплачено " + amt.toLocaleString() + " ₽ долга");
}

// ========================================================
// 2. РЕШАЛА АРТУР (СЕРВИСЫ ДЛЯ ПРИЛОЖЕНИЯ В СМАРТФОНЕ)
// ========================================================
function buyReshalaPack(type) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;

    if (type === 'pack1') {
        if (cash < 150000) return showToast("Не хватает 150,000 ₽!");
        state.player.cash -= 150000;
        state.player.connections = (state.player.connections || 0) + 1;
        showToast("Связи приобретены (+1 🤝)!");
    } else if (type === 'pack5') {
        if (cash < 650000) return showToast("Не хватает 650,000 ₽!");
        state.player.cash -= 650000;
        state.player.connections = (state.player.connections || 0) + 5;
        showToast("Оптовый пакет связей (+5 🤝) активирован!");
    }
    saveState();
    updateHeaderUI();
}

function checkReshalaAccess() {
    // Совместимость
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
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("ЛИЦЕНЗИЯ ПИЛОТА РАФ! 🏎️", "Официальный допуск пилота к заездам 402м получен!", true);
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
            let reason = c.isStolen ? "В розыске" : "Учёт аннулирован (12.5.1)";

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

    if (cash < 200000 || conn < 1) return showToast("Нужно 200,000 ₽ и 1 Связь 🤝!");

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
    if (typeof renderGarage === 'function') renderGarage();
    openVerdictModal("VIN ОТМЫТ! 🔏", "Автомобиль теперь юридически чист во всех базах ГИБДД!", true);
}

// ========================================================
// 3. БИЗНЕС
// ========================================================
function checkBusinessAccess() {
    const lock = document.getElementById('businessLockCover');
    let lvl = (state.player && state.player.level) ? state.player.level : 1;

    if (lvl < 5) {
        if (lock) lock.style.display = 'block';
        const list = document.getElementById('businessList');
        if (list) list.innerHTML = '';
        return;
    }

    if (lock) lock.style.display = 'none';
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

    const defaultIcons = {
        wash: 'fa-soap',
        shina: 'fa-compact-disc',
        sto: 'fa-screwdriver-wrench',
        detailing: 'fa-spray-can-sparkles',
        razborka: 'fa-car-burst',
        taxi: 'fa-taxi'
    };

    state.businesses.forEach((biz, idx) => {
        if (!biz) return;
        let isMax = biz.level >= 10;
        let isLocked = lvl < biz.minLevel;
        let cost = (biz.level > 0) ? biz.cost * (biz.level + 1) : biz.cost;

        let imgSrc = biz.img || ("assets/business/" + biz.id + ".jpg");
        let fallbackIcon = defaultIcons[biz.id] || 'fa-briefcase';
        let lockBlock = isLocked ? "<div class='cooldown-timer' style='display:flex; opacity:1; font-size:14px;'><i class='fa-solid fa-lock mb-2'></i> С " + biz.minLevel + " УРОВНЯ</div>" : "";
        let rankText = isMax ? "MAX" : "Ур. " + (biz.level || 0);

        let stockVal = (biz.stock !== undefined) ? biz.stock : 100;
        let isOutOfStock = biz.level > 0 && stockVal <= 0;

        let statusBadge = isOutOfStock
            ? "<span class='tag-badge bg-tag-red'>ПРОСТОЙ (НЕТ СЫРЬЯ)</span>"
            : (biz.level > 0 ? "<span class='tag-badge bg-tag-green'>РАБОТАЕТ</span>" : "");

        let storedBlock = "";
        if (biz.level > 0) {
            let s = biz.stored ? biz.stored : 0;
            storedBlock = "<div class='color-green text-xs font-bold mb-1'>В кассе: " + s.toLocaleString() + " ₽</div>";
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

        html += 
        "<div class='" + cardClass + "'>" +
            "<div class='" + imgClass + "'>" +
                "<img src='" + imgSrc + "' class='business-img' onerror=\"this.style.display='none'; this.nextElementSibling.style.display='flex';\">" +
                "<div class='business-fallback-icon' style='display:none;'><i class='fa-solid " + fallbackIcon + "'></i></div>" +
                lockBlock +
                "<div class='badge-tag bg-tag-cyan' style='bottom:8px; left:8px; right:auto;'>" + rankText + "</div>" +
            "</div>" +
            "<div class='business-content'>" +
                "<div class='flex-between mb-1'>" +
                    "<b class='text-xs'>" + biz.name + "</b>" +
                    statusBadge +
                "</div>" +
                "<div class='sub-label mb-2'>Доход: <b class='color-green'>" + (isOutOfStock ? "0 (Заморожен)" : incTotal.toLocaleString() + " ₽/д") + "</b></div>" +
                "<div class='business-perk-badge mb-2'>⭐ Перк: " + (biz.perk ? biz.perk : 'Пассивный доход') + "</div>" +
                "<div class='flex-between text-xs mb-1'>" +
                    "<span class='sub-label'>Запас сырья:</span>" +
                    "<b class='" + (stockVal > 20 ? "color-green" : "color-red") + "'>" + stockVal + "%</b>" +
                "</div>" +
                "<div class='biz-progress-track mb-2'>" +
                    "<div class='biz-progress-fill " + (stockVal > 20 ? "fill-biz-stock" : "risk-high") + "' style='width:" + stockVal + "%;'></div>" +
                "</div>" +
                storedBlock +
                "<div class='grid-2 mt-2'>" +
                    "<button onclick='upgradeBusiness(" + idx + ")' class='btn " + btnClass + " btn-sm' " + dis + ">" + btnText + "</button>" +
                    "<button onclick='restockBusiness(" + idx + ")' class='btn btn-amber btn-sm' " + (isLocked ? "disabled" : "") + ">Сырьё +50% (15k ₽)</button>" +
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
    if (typeof PhoneManager !== 'undefined') PhoneManager.renderBusinessWidget();
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
    if (typeof PhoneManager !== 'undefined') PhoneManager.renderBusinessWidget();
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
    if (typeof PhoneManager !== 'undefined') PhoneManager.renderBusinessWidget();
    tgHaptic('success');
    playSound('win');
    spawnFloatingReward("+" + totalCollected.toLocaleString() + " ₽");
    showToast("Собрана выручка: +" + totalCollected.toLocaleString() + " ₽!");
}

// ========================================================
// 4. САРАИ (БЕЗ ДУБЛИКАТОВ КОНСТАНТ)
// ========================================================
function getBarnTiersSafe() {
    if (typeof BARN_TIERS_CONFIG !== 'undefined' && Array.isArray(BARN_TIERS_CONFIG)) {
        return BARN_TIERS_CONFIG;
    }
    return [
        { tier: 1, reqLvl: 1, cost: 35000, title: "🏚️ Сарай в СНТ «Заря»", desc: "Дачный кооператив. Советская классика.", classGrade: "barn-grade-1", rareIdx: 0, fallback: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80" },
        { tier: 2, reqLvl: 7, cost: 120000, title: "🏢 Заброшенный бокс ГСК-4", desc: "Кооператив возле промзоны.", classGrade: "barn-grade-2", rareIdx: 1, fallback: "https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?auto=format&fit=crop&w=600&q=80" },
        { tier: 3, reqLvl: 15, cost: 350000, title: "🏭 Ангар механического завода", desc: "Закрытый цех. JDM купе.", classGrade: "barn-grade-3", rareIdx: 2, fallback: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80" },
        { tier: 4, reqLvl: 25, cost: 850000, title: "🏛️ Коллекционный подземный бокс", desc: "Опечатанный паркинг банка.", classGrade: "barn-grade-4", rareIdx: 4, fallback: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80" }
    ];
}

function renderBarnFind() {
    const container = document.getElementById('barnFindContent');
    if (!container) return;

    const pDay = (state.player && state.player.day) ? state.player.day : 1;
    const lastDay = (state.player && state.player.lastBarnDay) ? state.player.lastBarnDay : 0;
    const canScoutToday = lastDay < pDay;
    const lvl = (state.player && state.player.level) ? state.player.level : 1;

    let html = "";
    getBarnTiersSafe().forEach(b => {
        let isLvlLocked = lvl < b.reqLvl;
        let isDoneToday = !canScoutToday;

        let rareCar = (typeof BARN_FINDS !== 'undefined' && BARN_FINDS[b.rareIdx]) ? BARN_FINDS[b.rareIdx] : { name: "Раритет" };
        let statusBadge = isLvlLocked 
            ? "<span class='tag-badge bg-tag-red'><i class='fa-solid fa-lock'></i> С " + b.reqLvl + " УР</span>"
            : (isDoneToday ? "<span class='tag-badge bg-tag-amber'>Разведка завершена</span>" : "<span class='tag-badge bg-tag-green'>Готово к разведке</span>");

        let btnDisabled = (isLvlLocked || isDoneToday) ? "disabled" : "";
        let btnText = isLvlLocked ? "Требуется " + b.reqLvl + " уровень" : (isDoneToday ? "Доступно завтра (Смена дня 🌙)" : "Вскрыть ангар (" + (b.cost / 1000).toFixed(0) + "k ₽)");
        let imgSrc = b.img || `assets/barns/barn_tier${b.tier}.jpg`;
        let fallbackSrc = b.fallback || "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80";

        html += `
        <div class='glass-card mb-3 p-2 ${b.classGrade}'>
            <div class='car-img-wrap mb-2' style='height:120px; position:relative;'>
                <img src='${imgSrc}' class='car-img' onerror="this.onerror=null; this.src='${fallbackSrc}';">
                <div class='badge-tag' style='bottom:6px; right:6px;'>${statusBadge}</div>
            </div>
            <div class='flex-between mb-1'>
                <b class='text-xs color-cyan'>${b.title}</b>
                <span class='price-val text-xs color-amber'>${b.cost.toLocaleString()} ₽</span>
            </div>
            <p class='sub-label mb-2'>${b.desc}</p>
            <div class='text-xs mb-1 color-amber'>⭐ Редкий дроп (5%): <b>${rareCar.name}</b></div>
            <div class='text-xs mb-2 color-purple'>🏷️ Шанс на архивные госномера: <b>15%</b></div>
            <button onclick='scoutBarnTier(${b.tier})' class='btn btn-cyan btn-sm w-full' ${btnDisabled}>${btnText}</button>
        </div>`;
    });

    container.innerHTML = html;
}

function scoutBarnTier(tier) {
    const pDay = (state.player && state.player.day) ? state.player.day : 1;
    const lastDay = (state.player && state.player.lastBarnDay) ? state.player.lastBarnDay : 0;
    if (lastDay >= pDay) return showToast("Вы уже исследовали сараи сегодня! Смените день 🌙.");

    const config = getBarnTiersSafe().find(b => b.tier === tier);
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

    if (isRare && typeof BARN_FINDS !== 'undefined' && BARN_FINDS[config.rareIdx]) {
        foundCar = BARN_FINDS[config.rareIdx];
    } else if (typeof CAR_DATABASE !== 'undefined' && CAR_DATABASE.economy) {
        foundCar = CAR_DATABASE.economy[Math.floor(Math.random() * CAR_DATABASE.economy.length)];
    } else {
        foundCar = { name: "ВАЗ-2101 «Копейка»", power: 64, basePrice: 65000, img: "assets/cars/economy/vaz-2101.jpg" };
    }

    let genPlate = "ТРАНЗИТ";
    let isCoolPlate = Math.random() < 0.15;
    if (isCoolPlate && typeof generateCoolPlate === 'function') {
        genPlate = generateCoolPlate();
    } else if (typeof generateNormalPlate === 'function') {
        genPlate = generateNormalPlate();
    }

    let pVal = (typeof calculatePlateValue === 'function') ? calculatePlateValue(genPlate) : 0;

    let newCar = {
        id: "barn_" + Date.now(),
        name: foundCar.name,
        type: foundCar.type || 'economy',
        power: foundCar.power || 75,
        basePrice: foundCar.basePrice || config.cost * 2,
        price: foundCar.basePrice || config.cost * 2,
        baseMarketValue: foundCar.marketValue || foundCar.basePrice * 1.3,
        marketValue: (foundCar.marketValue || foundCar.basePrice * 1.3) + pVal,
        img: foundCar.img || "assets/cars/economy/vaz-2107.jpg",
        plate: genPlate,
        customPlate: genPlate,
        condition: Math.floor(40 + Math.random() * 25),
        wear: { engine: 50, transmission: 50 },
        hiddenDefect: { text: "Залегшие кольца и старое масло", cost: 15000 },
        insurance: null,
        tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 },
        purchaseCost: config.cost
    };

    if (!state.garage) state.garage = [];
    state.garage.push(newCar);

    saveState();
    renderBarnFind();
    if (typeof renderGarage === 'function') renderGarage();
    playSound('win');
    tgHaptic('success');

    let verdictMsg = "В дальнем углу обнаружен «" + newCar.name + "»!";
    if (isCoolPlate) verdictMsg += " На кузове висят архивные номера " + genPlate + "!";
    openVerdictModal("НАХОДКА В САРАЕ! 🏚️", verdictMsg, true, 0);
}

// ========================================================
// 5. НЕДВИЖИМОСТЬ
// ========================================================
function renderHousing() {
    const list = document.getElementById('housingMarketList');
    if (!list) return;

    if (typeof HOUSING_LIST === 'undefined' || !Array.isArray(HOUSING_LIST) || HOUSING_LIST.length === 0) {
        list.innerHTML = "<div class='glass-card text-center sub-label py-4'>База недвижимости не загружена.</div>";
        return;
    }

    let curId = (state.player && state.player.housingId) ? state.player.housingId : 'room';
    let owned = (state.player && state.player.ownedHouses) ? state.player.ownedHouses : [];

    let currentHouse = HOUSING_LIST.find(h => h.id === curId);
    let curTitle = currentHouse ? currentHouse.name : "Комната в общежитии";
    setTxt('currentHomeText', "Текущее: " + curTitle);

    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    let html = "";

    HOUSING_LIST.forEach(h => {
        let isCurrent = curId === h.id;
        let isPurchased = owned.includes(h.id);
        let isLvlLocked = lvl < (h.minLevel || 1);
        let imgSrc = h.img || `assets/houses/${h.id}.jpg`;
        let fallbackSrc = h.fallback || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80';

        let statusTag = isPurchased 
            ? "<span class='tag-badge bg-tag-green'>В собственности</span>" 
            : "<span class='tag-badge bg-tag-amber'>Аренда</span>";

        let actionBtns = "";
        if (isLvlLocked) {
            actionBtns = "<button class='btn btn-dark btn-sm w-full opacity-50' disabled>Доступно с " + h.minLevel + " уровня</button>";
        } else if (isCurrent && isPurchased) {
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
            let rentVal = h.rent ? h.rent : 2000;
            actionBtns = 
            "<div class='grid-2 mt-2'>" +
                "<button onclick=\"rentHousing('" + h.id + "')\" class='btn btn-cyan btn-sm'>Аренда (" + rentVal.toLocaleString() + " ₽/д)</button>" +
                "<button onclick=\"buyHousingProperty('" + h.id + "')\" class='btn btn-amber btn-sm'>Купить (" + (h.buyPrice / 1000000).toFixed(1) + "M ₽)</button>" +
            "</div>";
        }

        html += `
        <div class='glass-card mb-3'>
            <div class='car-img-wrap' style='height:140px; position:relative;'>
                <img src='${imgSrc}' class='car-img' onerror="this.onerror=null; this.src='${fallbackSrc}';">
                <div class='badge-tag' style='bottom:8px; right:8px;'>${statusTag}</div>
            </div>
            <div class='flex-between mb-1'>
                <h4 class='font-bold'>${h.name}</h4>
                <div class='color-cyan font-bold text-xs'>+${h.slots} мест гаража</div>
            </div>
            <p class='sub-label mb-2'>${h.desc || "Комфортное жильё для отдыха перекупа."}</p>
            ${actionBtns}
        </div>`;
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
    if (typeof HOUSING_LIST === 'undefined') return;
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
    openVerdictModal("НОВОСЕЛЬЕ! 🍾", "Вы выкупили «" + h.name + "» в собственность!", true);
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
    if (typeof HOUSING_LIST === 'undefined') return;
    const h = HOUSING_LIST.find(item => item.id === hId);
    if (!h) return;

    setTxt('homeInteriorHeader', "Обустройство: <b>" + h.name + "</b> (Собственность)");
    if (!state.player.furniture) state.player.furniture = [];

    const list = document.getElementById('homeInteriorItemsList');
    if (!list) return;

    let html = "";
    if (typeof HOUSING_INTERIOR_CATALOG !== 'undefined') {
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
    }

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
    showToast("Куплено и установлено в вашем доме!");

    let curId = (state.player && state.player.housingId) ? state.player.housingId : 'room';
    openHomeInteriorModal(curId);
}

// ========================================================
// 6. ПОРТОВЫЕ КОНТЕЙНЕРЫ (С НАДЕЖНЫМИ ФОТО-FALLBACKS)
// ========================================================
function renderContainersList() {
    const container = document.getElementById('containersListRender');
    const lockCover = document.getElementById('containersLockCover');
    let lvl = (state.player && state.player.level) ? state.player.level : 1;

    if (lvl < 12) {
        if (container) container.style.display = 'none';
        if (lockCover) lockCover.style.display = 'block';
        return;
    }

    if (lockCover) lockCover.style.display = 'none';
    if (!container) return;

    container.style.display = 'block';
    let html = "";

    const catalog = (typeof CONTAINER_ITEMS !== 'undefined' && Array.isArray(CONTAINER_ITEMS)) ? CONTAINER_ITEMS : [
        { id: 'japan', name: 'Японский Контейнер', cost: 150000, timer: 30, minLevel: 12, badge: 'JDM & Мото', desc: 'Прямые поставки из порта Кобе.', img: 'assets/containers/japan.jpg', fallback: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80' },
        { id: 'europe', name: 'Европейский Автовоз', cost: 450000, timer: 35, minLevel: 15, badge: 'Комфорт & Премиум', desc: 'Автомобили из Германии без пробега по РФ.', img: 'assets/containers/europe.jpg', fallback: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80' },
        { id: 'usa_auction', name: 'Американский Аукцион', cost: 750000, timer: 40, minLevel: 18, badge: 'Битые & Маслкары', desc: 'Контейнер с Copart. Кот в мешке.', img: 'assets/containers/usa.jpg', fallback: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80' },
        { id: 'china_ship', name: 'Китайский Сухогруз', cost: 950000, timer: 38, minLevel: 22, badge: 'Электрички & Новые', desc: 'Свежие Lixiang и Zeekr прямиком из Гуанчжоу.', img: 'assets/containers/china.jpg', fallback: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=600&q=80' },
        { id: 'dubai', name: 'Эмиратский Контейнер', cost: 1200000, timer: 45, minLevel: 25, badge: 'Катера & Суперкары', desc: 'Аукционная роскошь шейхов.', img: 'assets/containers/dubai.jpg', fallback: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80' },
        { id: 'hangar', name: 'Заброшенный Ангар', cost: 5000000, timer: 60, minLevel: 30, badge: 'Тягачи & Гиперкары', desc: 'Списанное имущество логистического хаба!', img: 'assets/containers/hangar.jpg', fallback: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80' }
    ];

    catalog.forEach(box => {
        let minLvl = box.minLevel || 12;
        let isLocked = lvl < minLvl;
        let btnText = isLocked ? "С " + minLvl + " уровня" : "Вскрыть (" + (box.cost / 1000).toFixed(0) + "k ₽)";
        let imgSrc = box.img || 'assets/containers/japan.jpg';
        let fallbackSrc = box.fallback || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80';

        html += `
        <div class='glass-card mb-3'>
            <div class='car-img-wrap' style='height:130px; position:relative;'>
                <img src='${imgSrc}' class='car-img' onerror="this.onerror=null; this.src='${fallbackSrc}';">
                <div class='badge-tag' style='bottom:8px; right:8px;'><span class='tag-badge bg-tag-purple'>${box.badge}</span></div>
            </div>
            <div class='flex-between mb-1'>
                <b class='font-bold'>${box.name}</b>
                <span class='price-val text-xs'>${box.cost.toLocaleString()} ₽</span>
            </div>
            <p class='sub-label mb-2'>${box.desc}</p>
            <button onclick="openPortContainerAction('${box.id}', ${box.cost})" class='btn btn-purple w-full' ${isLocked ? "disabled" : ""}>${btnText}</button>
        </div>`;
    });

    container.innerHTML = html;
}

function openPortContainerAction(boxId, cost) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < cost) return showToast("Не хватает денег на контейнер!");

    let maxSlots = getTotalGarageSlots();
    let currentSlots = (state.garage && state.garage.length) ? state.garage.length : 0;
    if (currentSlots >= maxSlots) return showToast("В гараже нет места под авто из контейнера!");

    state.player.cash -= cost;

    let roll = Math.random();
    if (roll < 0.40) {
        let winPrize = Math.round(cost * (1.35 + Math.random() * 0.65));
        state.player.cash += winPrize;
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("ТАМОЖЕННЫЙ ДЖЕКПОТ! 🚢", "В контейнере найден ценный зарубежный лот! Выручка: +" + winPrize.toLocaleString() + " ₽", true, winPrize);
    } else if (roll < 0.75) {
        let partValue = Math.round(cost * 0.75);
        state.player.cash += partValue;
        saveState();
        updateHeaderUI();
        openVerdictModal("РАСПИЛ НА ЗАПЧАСТИ 🔩", "Кузов повреждён при доставке. Сдан на разбор: +" + partValue.toLocaleString() + " ₽", false);
    } else {
        saveState();
        updateHeaderUI();
        tgHaptic('error');
        openVerdictModal("ТАМОЖЕННАЯ ПУСТЫШКА 💨", "В контейнере оказались только битые запчасти. Убыток: -" + cost.toLocaleString() + " ₽", false);
    }
}

let currentBlindLot = null;

function openBlindAuctionModal() {
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    if (lvl < 20) return showToast("Теневой аукцион ФССП доступен с 20 уровня!");

    let isPremium = Math.random() > 0.5;
    let bidPrice = isPremium ? Math.floor(1500000 + Math.random() * 3000000) : Math.floor(200000 + Math.random() * 500000);

    currentBlindLot = { bid: bidPrice, isPremium: isPremium };

    setTxt('blindAuctionLotNum', Math.floor(100 + Math.random() * 899));
    setTxt('blindAuctionClassText', isPremium ? "ПРЕМИУМ / ГИПЕР" : "СЮРПРИЗ (Может быть всё)");
    
    const btn = document.getElementById('btnBlindBid');
    if (btn) btn.innerText = "Ставка " + bidPrice.toLocaleString() + " ₽";

    const modal = document.getElementById('modalBlindAuction');
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function placeBlindBid() {
    if (!currentBlindLot) return;
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < currentBlindLot.bid) return showToast("Не хватает денег на ставку!");

    let maxSlots = getTotalGarageSlots();
    let currentSlots = (state.garage && state.garage.length) ? state.garage.length : 0;
    if (currentSlots >= maxSlots) return showToast("Освободите бокс в гараже!");

    state.player.cash -= currentBlindLot.bid;

    let poolType = currentBlindLot.isPremium ? (Math.random() > 0.3 ? 'premium' : 'hyper') : (Math.random() > 0.5 ? 'comfort' : 'economy');
    if (typeof CAR_DATABASE === 'undefined' || !CAR_DATABASE[poolType]) poolType = 'economy';
    
    let pool = CAR_DATABASE[poolType];
    let template = pool[Math.floor(Math.random() * pool.length)];

    let isTrash = Math.random() < 0.3; 
    let isStolen = Math.random() < 0.2; 

    let plate = isStolen ? "ТРАНЗИТ" : (typeof generateNormalPlate === 'function' ? generateNormalPlate() : "А001АА 77");
    let baseVal = template.basePrice || 100000;
    
    let car = {
        id: "blind_" + Date.now(),
        name: template.name || "Автомобиль",
        type: template.type || poolType,
        power: template.power || 100,
        basePrice: baseVal,
        price: currentBlindLot.bid,
        baseMarketValue: baseVal * (isTrash ? 0.4 : 1.1),
        marketValue: baseVal * (isTrash ? 0.4 : 1.1),
        img: template.img || "assets/cars/economy/vaz-2107.jpg",
        plate: plate,
        customPlate: plate,
        condition: isTrash ? Math.floor(10 + Math.random() * 30) : Math.floor(70 + Math.random() * 30),
        wear: { engine: isTrash ? 20 : 80, transmission: isTrash ? 30 : 80 },
        hiddenDefect: isTrash ? { text: "Двигатель заклинило, блок пробит!", cost: baseVal * 0.4 } : null,
        isStolen: isStolen,
        unregistered: false,
        impounded: false,
        insurance: null,
        autotekaChecked: true,
        tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 },
        purchaseCost: currentBlindLot.bid
    };

    if (!state.garage) state.garage = [];
    state.garage.push(car);
    saveState();

    closeModal('modalBlindAuction');
    if (typeof renderGarage === 'function') renderGarage();
    updateHeaderUI();

    let title = isTrash ? "КОТ В МЕШКЕ! 🗑️" : "ОТЛИЧНЫЙ ЛОТ! 🎉";
    let msg = "Под чехлом оказался «" + car.name + "». ";
    if (isTrash) {
        msg += "Машина в ужасном состоянии, требует капремонта!";
        playSound('error');
        tgHaptic('error');
    } else if (isStolen) {
        msg += "Тачка пушка, но числится в угоне! Придется отмывать VIN у Решалы.";
        playSound('win');
        tgHaptic('warning');
    } else {
        msg += "Машина в идеале, вы сорвали куш!";
        playSound('win');
        tgHaptic('success');
    }

    openVerdictModal(title, msg, !isTrash, 0, car.marketValue - currentBlindLot.bid);
}

// ========================================================
// 7. СМЕНА ДНЯ С УВЕДОМЛЕНИЯМИ В СМАРТФОН
// ========================================================
function nextDayAction() {
    state.player.day = (state.player.day || 1) + 1;
    state.player.expressTickets = state.player.maxExpressTickets ? state.player.maxExpressTickets : 25;
    state.player.consecutiveRaces = 0;

    let curId = (state.player && state.player.housingId) ? state.player.housingId : 'room';
    let isOwn = (state.player && state.player.ownedHouses) ? state.player.ownedHouses.includes(curId) : false;
    if (!isOwn && typeof HOUSING_LIST !== 'undefined' && Array.isArray(HOUSING_LIST)) {
        const h = HOUSING_LIST.find(item => item.id === curId);
        let rentVal = h ? (h.rent || 2500) : 2500;
        state.player.cash = Math.max(0, (state.player.cash || 0) - rentVal);
    }

    if (state.player.furniture && state.player.furniture.includes('home_ps5')) {
        state.player.mood = Math.min(100, (state.player.mood || 85) + 25);
    }

    let hasPersonal = state.garage && state.garage.some(c => c && c.isPersonal);
    if (hasPersonal) {
        state.player.mood = Math.min(100, (state.player.mood || 85) + 15);
    }

    if (state.player.policeImmunityDays && state.player.policeImmunityDays > 0) {
        state.player.policeImmunityDays -= 1;
    }

    if (state.player.safeDeposit && state.player.safeDeposit > 0) {
        let percentEarned = Math.round(state.player.safeDeposit * 0.03);
        state.player.safeDeposit += percentEarned;
        spawnFloatingReward(`+${percentEarned.toLocaleString()} ₽ в сейфе`);

        if (state.player.phoneMessages) {
            state.player.phoneMessages.unshift({
                id: "sms_bank_" + Date.now(),
                sender: "💳 Во-Банк Онлайн",
                avatar: "🏦",
                preview: `Выплата процентов по сейфу: +${percentEarned.toLocaleString()} ₽!`,
                time: "09:00",
                unread: true,
                chatHistory: [
                    { from: "them", text: `Начислена ежедневная капитализация по сейфу перекупа: +${percentEarned.toLocaleString()} ₽. Текущий баланс сейфа: ${state.player.safeDeposit.toLocaleString()} ₽.` }
                ]
            });
        }
    }

    if (state.businesses) {
        state.businesses.forEach(b => {
            if (b && b.level > 0) {
                if (b.stock > 0) {
                    b.stock = Math.max(0, b.stock - 20);
                    let currentStored = b.stored ? b.stored : 0;
                    let inc = b.income ? b.income : 0;
                    b.stored = currentStored + (inc * b.level);
                } else {
                    showToast("⚠️ Бизнес «" + b.name + "» простаивает из-за нехватки сырья!");
                }
            }
        });
    }

    state.player.hunger = Math.max(10, (state.player.hunger || 80) - 25);
    state.player.mood = Math.max(10, (state.player.mood || 85) - 15);

    let karma = state.player.karma !== undefined ? state.player.karma : 50;

    if (karma >= 70 && Math.random() < 0.35) {
        let rewardBonus = Math.floor(35000 + Math.random() * 40000);
        state.player.cash = (state.player.cash || 0) + rewardBonus;
        if (typeof PhoneManager !== 'undefined') {
            PhoneManager.pushBuyerFollowupSMS("Toyota Camry", false, "Семейный клиент");
        }
    } else if (karma <= 35 && Math.random() < 0.40) {
        if (typeof PhoneManager !== 'undefined') {
            PhoneManager.pushBuyerFollowupSMS("ВАЗ-2114", true, "Разъярённый покупатель");
        }
    }

    saveState();
    updateHeaderUI();
    renderHousing();
    renderBarnFind();
    checkBusinessAccess();
    if (typeof PhoneManager !== 'undefined') {
        PhoneManager.renderBusinessWidget();
        PhoneManager.updateUnreadBadge();
    }
    playSound('tick');
    tgHaptic('light');
    showToast("Наступил новый игровой день ☀️ Проценты в Во-Банке начислены!");

    setTimeout(() => { 
        triggerRandomRoadEvent(); 
        triggerGarageRandomEvent();
    }, 800);
}

function triggerRandomRoadEvent() {
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    if (lvl < 5) return;

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
    let podstavaChance = karma < 40 ? 0.16 : 0.07;

    if (Math.random() < podstavaChance) { 
        const modal = document.getElementById('modalAutoPodstava');
        if (modal) modal.classList.add('active');
        try { playSound('error'); tgHaptic('error'); } catch(e){}
    }
}

function resolvePodstava(action) {
    closeModal('modalAutoPodstava');
    if (action === 'pay') {
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;
        let cost = Math.min(150000, cash);
        state.player.cash -= cost;
        state.player.mood = Math.max(0, (state.player.mood || 80) - 20);
        saveState(); updateHeaderUI();
        openVerdictModal("ВЫ ЗАПЛАТИЛИ РЭКЕТИРАМ", "Вы отдали " + cost.toLocaleString() + " ₽. Настроение испорчено.", false);
    } else if (action === 'reshala') {
        let conn = (state.player && state.player.connections) ? state.player.connections : 0;
        if (conn < 1) {
            showToast("Нет связей! Пришлось платить наличкой.");
            resolvePodstava('pay');
            return;
        }
        state.player.connections -= 1;
        saveState(); updateHeaderUI();
        openVerdictModal("РЕШАЛА РАЗРУЛИЛ", "Один звонок Артуру, и «братки» с извинениями уехали. Связь потрачена.", true);
    } else if (action === 'fight') {
        let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
        let winChance = karma > 70 ? 0.75 : (karma < 35 ? 0.25 : 0.45);
        
        if (Math.random() < winChance) {
            state.player.karma = Math.min(100, karma + 10);
            state.player.mood = Math.min(100, (state.player.mood || 50) + 20);
            saveState(); updateHeaderUI();
            openVerdictModal("ВЫ ДАЛИ ОТПОР!", "Вы достали монтировку и отстояли свою правоту. Мошенники сбежали! Карма и кураж выросли.", true);
        } else {
            state.player.mood = Math.max(0, (state.player.mood || 50) - 40);
            state.player.hunger = Math.max(0, (state.player.hunger || 50) - 30);
            if (state.garage && state.garage.length > 0) {
                let car = state.garage[0];
                car.condition = Math.max(10, car.condition - 30);
                if (car.bodyThickness) { car.bodyThickness.doors = 300; car.bodyThickness.wings = 250; }
            }
            saveState(); updateHeaderUI(); 
            if (typeof renderGarage === 'function') renderGarage();
            openVerdictModal("ВАС ИЗБИЛИ И РАЗБИЛИ АВТО", "Численный перевес был не на вашей стороне. Ваша машина сильно помята.", false);
        }
    }
}

// ========================================================
// 8. РАЦИОН ПИТАНИЯ (С ГАРАНТИРОВАННЫМИ ДАННЫМИ)
// ========================================================
function renderDiets() {
    const list = document.getElementById('dietList');
    if (!list) return;

    const catalog = (typeof DIETS !== 'undefined' && Array.isArray(DIETS)) ? DIETS : [
        { id: 'water', name: 'Вода из-под крана', cost: 0, hunger: 5, mood: -30, desc: 'Живот крутит, жить не хочется' },
        { id: 'doshik', name: 'Бич-пакет и сухари', cost: 150, hunger: 20, mood: -15, desc: 'Желудок ноет, депрессия, тяжело торговаться' },
        { id: 'home_sandwich', name: 'Бутерброд из дома', cost: 250, hunger: 30, mood: -5, desc: 'Майонез, колбаса "Красная цена", терпимо' },
        { id: 'pelmeni', name: 'Пельмени по акции', cost: 400, hunger: 45, mood: 0, desc: 'Дешево и сердито, главное сварить' },
        { id: 'shaurma', name: 'Шаурма на вокзале', cost: 800, hunger: 50, mood: -5, desc: 'Сытно, но жирно и тоскливо' },
        { id: 'fastfood', name: 'Фастфуд комбо', cost: 1200, hunger: 60, mood: 10, desc: 'Бургер, картошка, кола. Классика.' },
        { id: 'stolovka', name: 'Обед в столовой', cost: 2200, hunger: 70, mood: 15, desc: 'Нормальное первое, второе и компот' },
        { id: 'cafe', name: 'Бизнес-ланч в ресторане', cost: 6500, hunger: 90, mood: 25, desc: 'Свежий стейк, кофе и уверенность в себе' }
    ];

    let html = "";
    catalog.forEach(d => {
        html += `
        <div class='glass-card flex-between p-2 mb-2'>
            <div>
                <b class='text-xs color-green'>${d.name}</b>
                <div class='sub-label' style='font-size:10px;'>${d.desc || "Питание перекупа"} (+${d.hunger}% сытости)</div>
            </div>
            <button onclick="eatMeal('${d.id}', ${d.cost}, ${d.hunger}, ${d.mood})" class='btn btn-dark btn-auto btn-sm'>${d.cost.toLocaleString()} ₽</button>
        </div>`;
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

// ========================================================
// 9. ГОРОДСКОЙ ЭФИР (С ГАРАНТИРОВАННЫМИ ДАННЫМИ)
// ========================================================
function renderLifeChat() {
    const feed = document.getElementById('lifeChatFeed');
    if (!feed) return;

    if (!state.lifeChatMessages || state.lifeChatMessages.length === 0) {
        if (typeof STREET_CHAT_LOG !== 'undefined' && Array.isArray(STREET_CHAT_LOG)) {
            state.lifeChatMessages = STREET_CHAT_LOG.slice(0, 6).map(m => ({ sender: m.author, text: m.text }));
        } else {
            state.lifeChatMessages = [
                { sender: "🚨 ДПС_Инфо", text: "Внимание! На ул. Ленина рейд по 12.5.1, прячьте прямотоки!" },
                { sender: "Колян_99", text: "Кто на кольце сегодня? ДПСников вроде нет." },
                { sender: "Артур_Решала", text: "Номера 777 в наличии, пишите в приложении." },
                { sender: "Vazovod_77", text: "Куплю кузов под корч ВАЗ 2107 или 2101, срочно в лс!" },
                { sender: "Perecup_Pro", text: "Продам Солярис, не бит не крашен (крашена только крыша)." }
            ];
        }
    }

    let html = "";
    state.lifeChatMessages.forEach(m => {
        let isMine = m.isMine ? "mine" : "";
        html += `
        <div class='chat-bubble ${isMine}'>
            <b class='color-cyan text-xs'>${m.sender}:</b> ${m.text}
        </div>`;
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

function roadAssistanceAction() {
    let fuel = (state.player && state.player.fuel !== undefined) ? state.player.fuel : 0;
    if (fuel < 10) return showToast("Нужно 10 ⛽ бензина для выезда!");
    state.player.fuel -= 10;

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
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
    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
    state.player.karma = Math.min(100, karma + 8);

    saveState();
    updateHeaderUI();
    showToast("Дядя Ваня благодарен за запчасти! (+1 🤝 Связь и +8 Карма)");
}

function bigCharityDonate() {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < 100000) return showToast("Нужно 100,000 ₽!");

    state.player.cash -= 100000;
    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
    state.player.karma = Math.min(100, karma + 25);

    saveState();
    updateHeaderUI();
    showToast("Доброе дело сделано! (+25 Кармы 😊)");
}

// ========================================================
// 10. ВИЛСПИН И СТАВКИ
// ========================================================
const WHEEL_SECTORS = [
    { label: "150,000 ₽", color: "#00e676", textColor: "#000", reward: { cash: 150000 } },
    { label: "15 ⭐", color: "#ffb300", textColor: "#000", reward: { stars: 15 } },
    { label: "25,000 ₽", color: "#1e293b", textColor: "#fff", reward: { cash: 25000 } },
    { label: "+1 🤝 Связь", color: "#c084fc", textColor: "#000", reward: { connections: 1 } },
    { label: "350,000 ₽", color: "#00f2fe", textColor: "#000", reward: { cash: 350000 } },
    { label: "50 ⛽ Бак", color: "#0284c7", textColor: "#fff", reward: { fuel: 50 } },
    { label: "50,000 ₽", color: "#334155", textColor: "#fff", reward: { cash: 50000 } },
    { label: "JACKPOT 1M", color: "#ff3366", textColor: "#fff", reward: { cash: 1000000 } }
];

let isWheelSpinning = false;
let currentWheelRotation = 0;

function initWheelModule() {
    const cvs = document.getElementById('wheelCanvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const totalSectors = WHEEL_SECTORS.length;
    const arc = (2 * Math.PI) / totalSectors;
    const cx = 280;
    const cy = 280;
    const radius = 270;

    ctx.clearRect(0, 0, 560, 560);

    for (let i = 0; i < totalSectors; i++) {
        const angle = i * arc;
        const sec = WHEEL_SECTORS[i];

        ctx.beginPath();
        ctx.fillStyle = sec.color;
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, angle, angle + arc);
        ctx.lineTo(cx, cy);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = sec.textColor;
        ctx.font = "900 18px sans-serif";
        ctx.shadowColor = "rgba(0,0,0,0.7)";
        ctx.shadowBlur = 4;
        ctx.fillText(sec.label, radius - 24, 6);
        ctx.restore();
    }
}

function spinWheelAction(isFree) {
    if (isWheelSpinning) return;

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

    isWheelSpinning = true;
    playSound('tick');
    tgHaptic('medium');

    const winningIdx = Math.floor(Math.random() * WHEEL_SECTORS.length);
    const totalSectors = WHEEL_SECTORS.length;
    const arcDeg = 360 / totalSectors;
    
    const targetDeg = (360 - (winningIdx * arcDeg) - (arcDeg / 2) - 90);
    const spins = 360 * (5 + Math.floor(Math.random() * 3));
    currentWheelRotation += spins + targetDeg;

    cvs.style.transition = "transform 4.5s cubic-bezier(0.12, 0.95, 0.22, 1)";
    cvs.style.transform = "rotate(" + currentWheelRotation + "deg)";

    let tickerInterval = setInterval(() => {
        playSound('tick');
    }, 280);

    setTimeout(() => {
        clearInterval(tickerInterval);
        isWheelSpinning = false;

        const prize = WHEEL_SECTORS[winningIdx];
        if (prize.reward.cash) state.player.cash += prize.reward.cash;
        if (prize.reward.stars) state.player.stars += prize.reward.stars;
        if (prize.reward.fuel) state.player.fuel = Math.min(100, (state.player.fuel || 0) + prize.reward.fuel);
        if (prize.reward.connections) state.player.connections = (state.player.connections || 0) + prize.reward.connections;

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("ПРИЗ С VIP КОЛЕСА! 🎡", "Поздравляем! Ваш выигрыш: " + prize.label, true);
    }, 4600);
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
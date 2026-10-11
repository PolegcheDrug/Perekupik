// ========================================================
// js/life.js — ЖИЗНЬ, РЕПУТАЦИЯ, ФОРТУНА, САРАИ, ПОРТ (v0.4.5)
// Разработчики: Илья Чепиль (DXF) & Perekup Dev Team
// Автоматический суточный цикл реального времени (00:00),
// расширенная банковская выписка Во-Банка, находки в сараях
// ========================================================

// ========================================================
// 1. ФИНАНСОВЫЕ ОПЕРАЦИИ И БАНК «ВО-БАНК ОНЛАЙН»
// ========================================================
function logBankTransaction(title, amount, isIncome = true) {
    if (!state.player.bankHistory) state.player.bankHistory = [];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    state.player.bankHistory.unshift({
        id: "tx_" + Date.now(),
        title: title,
        amount: Math.abs(amount),
        isIncome: isIncome,
        time: timeStr
    });
    if (state.player.bankHistory.length > 25) {
        state.player.bankHistory.pop();
    }
}

function depositToSafeAction(amount) {
    let cash = state.player?.cash || 0;[span_0](start_span)[span_0](end_span)
    if (cash < amount) return showToast("Не хватает наличных денег для внесения в сейф!");[span_1](start_span)[span_1](end_span)

    state.player.cash -= amount;[span_2](start_span)[span_2](end_span)
    state.player.safeDeposit = (state.player.safeDeposit || 0) + amount;[span_3](start_span)[span_3](end_span)
    logBankTransaction("Пополнение сейфа перекупа", amount, false);

    saveState();[span_4](start_span)[span_4](end_span)
    updateHeaderUI();[span_5](start_span)[span_5](end_span)
    playSound('tick');[span_6](start_span)[span_6](end_span)
    tgHaptic('light');[span_7](start_span)[span_7](end_span)
    showToast(`Заначка пополнена на +${amount.toLocaleString()} ₽! Деньги защищены в Во-Банке.`);[span_8](start_span)[span_8](end_span)
}

function withdrawFromSafeAction() {
    let safeCash = state.player?.safeDeposit || 0;[span_9](start_span)[span_9](end_span)
    if (safeCash <= 0) return showToast("В сейфе пока пусто! Отложите часть прибыли.");[span_10](start_span)[span_10](end_span)

    state.player.cash = (state.player.cash || 0) + safeCash;[span_11](start_span)[span_11](end_span)
    state.player.safeDeposit = 0;[span_12](start_span)[span_12](end_span)
    logBankTransaction("Изъятие средств из сейфа", safeCash, true);

    saveState();[span_13](start_span)[span_13](end_span)
    updateHeaderUI();[span_14](start_span)[span_14](end_span)
    playSound('win');[span_15](start_span)[span_15](end_span)
    tgHaptic('success');[span_16](start_span)[span_16](end_span)
    spawnFloatingReward(`+${safeCash.toLocaleString()} ₽`);[span_17](start_span)[span_17](end_span)
    showToast(`Вы забрали всю заначку из сейфа: +${safeCash.toLocaleString()} ₽!`);[span_18](start_span)[span_18](end_span)
}

function openBankDepositAction(amount, days = 7, dailyRate = 0.02) {
    let cash = state.player?.cash || 0;
    if (cash < amount) return showToast("Не хватает денег для открытия целевого депозита!");

    state.player.cash -= amount;
    if (!state.player.bankDeposits) state.player.bankDeposits = [];

    state.player.bankDeposits.push({
        id: "dep_" + Date.now(),
        name: `Срочный вклад (${days} дн.)`,
        amount: amount,
        initialAmount: amount,
        dailyRate: dailyRate,
        daysLeft: days,
        active: true
    });

    logBankTransaction(`Открытие вклада под ${(dailyRate * 100).toFixed(1)}%/день`, amount, false);
    saveState();
    updateHeaderUI();
    playSound('win');
    tgHaptic('success');
    showToast(`Вклад на ${amount.toLocaleString()} ₽ открыт! Начисление каждый день в 00:00.`);
}

function closeBankDepositAction(index) {
    if (!state.player.bankDeposits || !state.player.bankDeposits[index]) return;
    const dep = state.player.bankDeposits[index];
    
    state.player.cash = (state.player.cash || 0) + dep.amount;
    let profit = dep.amount - dep.initialAmount;
    logBankTransaction(`Закрытие вклада (Доход: +${profit.toLocaleString()} ₽)`, dep.amount, true);

    state.player.bankDeposits.splice(index, 1);
    saveState();
    updateHeaderUI();
    playSound('win');
    tgHaptic('success');
    showToast(`Вклад закрыт! Выплачено +${dep.amount.toLocaleString()} ₽.`);
}

function takeLoan(amount) {
    let debt = (state.player && state.player.loanDebt) ? state.player.loanDebt : 0;[span_19](start_span)[span_19](end_span)
    if (debt >= 1500000) return showToast("Лимит кредитной линии в Во-Банке исчерпан!");

    let received = Math.round(amount * 0.95);
    state.player.cash = (state.player.cash || 0) + received;[span_20](start_span)[span_20](end_span)
    state.player.loanDebt = debt + amount;[span_21](start_span)[span_21](end_span)
    logBankTransaction(`Одобрен кредит Во-Банка (-5% комиссия)`, received, true);

    saveState();[span_22](start_span)[span_22](end_span)
    updateHeaderUI();[span_23](start_span)[span_23](end_span)
    playSound('win');
    tgHaptic('success');
    showToast("Во-Банк перевел: " + received.toLocaleString() + " ₽ (Комиссия за выдачу 5%)");
}

function repayLoan(percent) {
    let debt = (state.player && state.player.loanDebt) ? state.player.loanDebt : 0;[span_24](start_span)[span_24](end_span)
    if (debt <= 0) return showToast("У вас нет задолженности перед банком!");[span_25](start_span)[span_25](end_span)

    let amt = Math.ceil(debt * (percent / 100));[span_26](start_span)[span_26](end_span)
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_27](start_span)[span_27](end_span)
    if (cash < amt) return showToast("Не хватает денег для оплаты долга!");[span_28](start_span)[span_28](end_span)

    state.player.cash -= amt;[span_29](start_span)[span_29](end_span)
    state.player.loanDebt = Math.max(0, debt - amt);[span_30](start_span)[span_30](end_span)
    logBankTransaction(`Погашение кредита (${percent}%)`, amt, false);

    saveState();[span_31](start_span)[span_31](end_span)
    updateHeaderUI();[span_32](start_span)[span_32](end_span)
    playSound('tick');
    tgHaptic('light');
    showToast("Оплачено " + amt.toLocaleString() + " ₽ долга");[span_33](start_span)[span_33](end_span)
}

// ========================================================
// 2. РЕШАЛА АРТУР (ТЕНЕВЫЕ СЕРВИСЫ)
// ========================================================
function buyReshalaPack(type) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_34](start_span)[span_34](end_span)

    if (type === 'pack1') {[span_35](start_span)[span_35](end_span)
        if (cash < 150000) return showToast("Не хватает 150,000 ₽!");[span_36](start_span)[span_36](end_span)
        state.player.cash -= 150000;[span_37](start_span)[span_37](end_span)
        state.player.connections = (state.player.connections || 0) + 1;[span_38](start_span)[span_38](end_span)
        showToast("Связи приобретены (+1 🤝)!");[span_39](start_span)[span_39](end_span)
    } else if (type === 'pack5') {[span_40](start_span)[span_40](end_span)
        if (cash < 650000) return showToast("Не хватает 650,000 ₽!");[span_41](start_span)[span_41](end_span)
        state.player.cash -= 650000;[span_42](start_span)[span_42](end_span)
        state.player.connections = (state.player.connections || 0) + 5;[span_43](start_span)[span_43](end_span)
        showToast("Оптовый пакет связей (+5 🤝) активирован!");[span_44](start_span)[span_44](end_span)
    }
    saveState();[span_45](start_span)[span_45](end_span)
    updateHeaderUI();[span_46](start_span)[span_46](end_span)
}

function buyReshalaService(service) {
    if (service === 'roof') {[span_47](start_span)[span_47](end_span)
        let lvl = (state.player && state.player.level) ? state.player.level : 1;[span_48](start_span)[span_48](end_span)
        if (lvl < 10) return showToast("Услуга доступна с 10 уровня!");[span_49](start_span)[span_49](end_span)

        let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_50](start_span)[span_50](end_span)
        let stars = (state.player && state.player.stars) ? state.player.stars : 0;[span_51](start_span)[span_51](end_span)

        if (cash >= 350000) {[span_52](start_span)[span_52](end_span)
            state.player.cash -= 350000;[span_53](start_span)[span_53](end_span)
        } else if (stars >= 45) {[span_54](start_span)[span_54](end_span)
            state.player.stars -= 45;[span_55](start_span)[span_55](end_span)
        } else {
            return showToast("Нужно 350,000 ₽ или 45 Stars ⭐!");[span_56](start_span)[span_56](end_span)
        }

        let d = (state.player && state.player.policeImmunityDays) ? state.player.policeImmunityDays : 0;[span_57](start_span)[span_57](end_span)
        state.player.policeImmunityDays = d + 3;[span_58](start_span)[span_58](end_span)
        saveState();[span_59](start_span)[span_59](end_span)
        openVerdictModal("🚨 КРЫША ОФОРМЛЕНА", "ГИБДД не тронет ваши авто следующие 3 дня!", true);[span_60](start_span)[span_60](end_span)
    } else if (service === 'license') {[span_61](start_span)[span_61](end_span)
        if (state.player && state.player.hasRacingLicense) return showToast("Лицензия уже получена!");[span_62](start_span)[span_62](end_span)
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_63](start_span)[span_63](end_span)
        let conn = (state.player && state.player.connections) ? state.player.connections : 0;[span_64](start_span)[span_64](end_span)

        if (conn >= 1) {[span_65](start_span)[span_65](end_span)
            state.player.connections -= 1;[span_66](start_span)[span_66](end_span)
        } else if (cash >= 85000) {[span_67](start_span)[span_67](end_span)
            state.player.cash -= 85000;[span_68](start_span)[span_68](end_span)
        } else {
            return showToast("Нужно 85,000 ₽ или 1 Связь 🤝!");[span_69](start_span)[span_69](end_span)
        }

        state.player.hasRacingLicense = true;[span_70](start_span)[span_70](end_span)
        saveState();[span_71](start_span)[span_71](end_span)
        updateHeaderUI();[span_72](start_span)[span_72](end_span)
        playSound('win');[span_73](start_span)[span_73](end_span)
        tgHaptic('success');[span_74](start_span)[span_74](end_span)
        openVerdictModal("ЛИЦЕНЗИЯ ПИЛОТА РАФ! 🏎️", "Официальный допуск пилота к заездам 402м получен!", true);[span_75](start_span)[span_75](end_span)
    }
}

function openLegalizeCarModal() {
    let lvl = (state.player && state.player.level) ? state.player.level : 1;[span_76](start_span)[span_76](end_span)
    if (lvl < 15) return showToast("Услуга доступна с 15 уровня!");[span_77](start_span)[span_77](end_span)

    if (!state.garage) return;[span_78](start_span)[span_78](end_span)
    const criminalCars = state.garage.filter(c => c && (c.isStolen || c.unregistered));[span_79](start_span)[span_79](end_span)
    const list = document.getElementById('legalizeCarList');[span_80](start_span)[span_80](end_span)
    if (!list) return;[span_81](start_span)[span_81](end_span)

    if (criminalCars.length === 0) {[span_82](start_span)[span_82](end_span)
        list.innerHTML = "<div class='sub-label text-center py-4'>У вас в гараже нет проблемных авто (в розыске или без учёта).</div>";[span_83](start_span)[span_83](end_span)
    } else {
        let html = "";[span_84](start_span)[span_84](end_span)
        criminalCars.forEach(c => {[span_85](start_span)[span_85](end_span)
            let cName = c.name ? c.name : "Авто";[span_86](start_span)[span_86](end_span)
            let cPlate = c.customPlate ? c.customPlate : (c.plate ? c.plate : "ТРАНЗИТ");[span_87](start_span)[span_87](end_span)
            let reason = c.isStolen ? "В розыске" : "Учёт аннулирован (12.5.1)";[span_88](start_span)[span_88](end_span)

            html += 
            "<div class='glass-card flex-between p-2 mb-1'>" +
                "<div>" +
                    "<b>" + cName + "</b>" +
                    "<div class='sub-label color-red'>" + reason + " (" + cPlate + ")</div>" +
                "</div>" +
                "<button onclick=\"confirmLegalizeCar('" + c.id + "')\" class='btn btn-purple btn-auto btn-sm'>Отмыть VIN</button>" +
            "</div>";[span_89](start_span)[span_89](end_span)
        });
        list.innerHTML = html;[span_90](start_span)[span_90](end_span)
    }
    const mod = document.getElementById('modalLegalizeCar');[span_91](start_span)[span_91](end_span)
    if (mod) mod.classList.add('active');[span_92](start_span)[span_92](end_span)
}

function confirmLegalizeCar(carId) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_93](start_span)[span_93](end_span)
    let conn = (state.player && state.player.connections) ? state.player.connections : 0;[span_94](start_span)[span_94](end_span)

    if (cash < 200000 || conn < 1) return showToast("Нужно 200,000 ₽ и 1 Связь 🤝!");[span_95](start_span)[span_95](end_span)

    state.player.cash -= 200000;[span_96](start_span)[span_96](end_span)
    state.player.connections -= 1;[span_97](start_span)[span_97](end_span)

    if (state.garage) {[span_98](start_span)[span_98](end_span)
        const car = state.garage.find(c => c && c.id === carId);[span_99](start_span)[span_99](end_span)
        if (car) {[span_100](start_span)[span_100](end_span)
            car.isStolen = false;[span_101](start_span)[span_101](end_span)
            car.unregistered = false;[span_102](start_span)[span_102](end_span)
            car.autotekaChecked = true;[span_103](start_span)[span_103](end_span)
            if (typeof recalculateCarMarketValue === 'function') {[span_104](start_span)[span_104](end_span)
                recalculateCarMarketValue(car);[span_105](start_span)[span_105](end_span)
            }
        }
    }
    closeModal('modalLegalizeCar');[span_106](start_span)[span_106](end_span)
    saveState();[span_107](start_span)[span_107](end_span)
    if (typeof renderGarage === 'function') renderGarage();[span_108](start_span)[span_108](end_span)
    openVerdictModal("VIN ОТМЫТ! 🔏", "Автомобиль теперь юридически чист во всех базах ГИБДД!", true);[span_109](start_span)[span_109](end_span)
}

// ========================================================
// 3. БИЗНЕС
// ========================================================
function checkBusinessAccess() {
    const lock = document.getElementById('businessLockCover');[span_110](start_span)[span_110](end_span)
    let lvl = (state.player && state.player.level) ? state.player.level : 1;[span_111](start_span)[span_111](end_span)

    if (lvl < 5) {[span_112](start_span)[span_112](end_span)
        if (lock) lock.style.display = 'block';[span_113](start_span)[span_113](end_span)
        const list = document.getElementById('businessList');[span_114](start_span)[span_114](end_span)
        if (list) list.innerHTML = '';[span_115](start_span)[span_115](end_span)
        return;[span_116](start_span)[span_116](end_span)
    }

    if (lock) lock.style.display = 'none';[span_117](start_span)[span_117](end_span)
    renderBusinessList();[span_118](start_span)[span_118](end_span)
}

function renderBusinessList() {
    const list = document.getElementById('businessList');[span_119](start_span)[span_119](end_span)
    if (!list) return;[span_120](start_span)[span_120](end_span)

    if (!state.businesses || state.businesses.length === 0) {[span_121](start_span)[span_121](end_span)
        if (typeof BUSINESS_DATA !== 'undefined') state.businesses = JSON.parse(JSON.stringify(BUSINESS_DATA));[span_122](start_span)[span_122](end_span)
    }

    let lvl = (state.player && state.player.level) ? state.player.level : 1;[span_123](start_span)[span_123](end_span)
    let html = "";[span_124](start_span)[span_124](end_span)

    const defaultIcons = {
        wash: 'fa-soap',
        shina: 'fa-compact-disc',
        sto: 'fa-screwdriver-wrench',
        detailing: 'fa-spray-can-sparkles',
        razborka: 'fa-car-burst',
        taxi: 'fa-taxi'
    };[span_125](start_span)[span_125](end_span)

    state.businesses.forEach((biz, idx) => {[span_126](start_span)[span_126](end_span)
        if (!biz) return;[span_127](start_span)[span_127](end_span)
        let isMax = biz.level >= 10;[span_128](start_span)[span_128](end_span)
        let isLocked = lvl < biz.minLevel;[span_129](start_span)[span_129](end_span)
        let cost = (biz.level > 0) ? biz.cost * (biz.level + 1) : biz.cost;[span_130](start_span)[span_130](end_span)

        let imgSrc = biz.img || ("assets/business/" + biz.id + ".jpg");[span_131](start_span)[span_131](end_span)
        let fallbackIcon = defaultIcons[biz.id] || 'fa-briefcase';[span_132](start_span)[span_132](end_span)
        let lockBlock = isLocked ? "<div class='cooldown-timer' style='display:flex; opacity:1; font-size:14px;'><i class='fa-solid fa-lock mb-2'></i> С " + biz.minLevel + " УРОВНЯ</div>" : "";[span_133](start_span)[span_133](end_span)
        let rankText = isMax ? "MAX" : "Ур. " + (biz.level || 0);[span_134](start_span)[span_134](end_span)

        let stockVal = (biz.stock !== undefined) ? biz.stock : 100;[span_135](start_span)[span_135](end_span)
        let isOutOfStock = biz.level > 0 && stockVal <= 0;[span_136](start_span)[span_136](end_span)

        let statusBadge = isOutOfStock
            ? "<span class='tag-badge bg-tag-red'>ПРОСТОЙ (НЕТ СЫРЬЯ)</span>[span_137](start_span)"[span_137](end_span)
            : (biz.level > 0 ? "<span class='tag-badge bg-tag-green'>РАБОТАЕТ</span>" : "");[span_138](start_span)[span_138](end_span)

        let storedBlock = "";[span_139](start_span)[span_139](end_span)
        if (biz.level > 0) {[span_140](start_span)[span_140](end_span)
            let s = biz.stored ? biz.stored : 0;[span_141](start_span)[span_141](end_span)
            storedBlock = "<div class='color-green text-xs font-bold mb-1'>В кассе: " + s.toLocaleString() + " ₽</div>";[span_142](start_span)[span_142](end_span)
        }

        let btnClass = isMax ? "btn-dark" : "btn-cyan";[span_143](start_span)[span_143](end_span)
        let dis = (isMax || isLocked) ? "disabled" : "";[span_144](start_span)[span_144](end_span)
        let btnText = "Купить (" + cost.toLocaleString() + " ₽)";[span_145](start_span)[span_145](end_span)
        if (isMax) btnText = "Максимум";[span_146](start_span)[span_146](end_span)
        else if (isLocked) btnText = "С " + biz.minLevel + " ур";[span_147](start_span)[span_147](end_span)
        else if (biz.level > 0) btnText = "Улучшить (" + cost.toLocaleString() + " ₽)";[span_148](start_span)[span_148](end_span)

        let cardClass = "business-card" + (!isLocked ? " unlocked" : "");[span_149](start_span)[span_149](end_span)
        let imgClass = "business-img-box" + (isLocked ? " item-locked" : "");[span_150](start_span)[span_150](end_span)

        let bInc = biz.income ? biz.income : 0;[span_151](start_span)[span_151](end_span)
        let bLvl = biz.level ? biz.level : 0;[span_152](start_span)[span_152](end_span)
        let incTotal = bInc * bLvl;[span_153](start_span)[span_153](end_span)

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
        "</div>";[span_154](start_span)[span_154](end_span)
    });

    list.innerHTML = html;[span_155](start_span)[span_155](end_span)
}

function upgradeBusiness(idx) {
    const b = state.businesses[idx];[span_156](start_span)[span_156](end_span)
    if (!b) return;[span_157](start_span)[span_157](end_span)

    let lvl = (state.player && state.player.level) ? state.player.level : 1;[span_158](start_span)[span_158](end_span)
    if (lvl < b.minLevel) return showToast("Этот бизнес доступен с " + b.minLevel + " уровня!");[span_159](start_span)[span_159](end_span)
    if (b.level >= 10) return showToast("Бизнес достиг максимума!");[span_160](start_span)[span_160](end_span)

    let cost = (b.level > 0) ? b.cost * (b.level + 1) : b.cost;[span_161](start_span)[span_161](end_span)
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_162](start_span)[span_162](end_span)
    if (cash < cost) return showToast("Не хватает денег!");[span_163](start_span)[span_163](end_span)

    state.player.cash -= cost;[span_164](start_span)[span_164](end_span)
    b.level = (b.level || 0) + 1;[span_165](start_span)[span_165](end_span)
    if (b.stock === undefined) b.stock = 100;[span_166](start_span)[span_166](end_span)
    saveState();[span_167](start_span)[span_167](end_span)
    checkBusinessAccess();[span_168](start_span)[span_168](end_span)
    if (typeof PhoneManager !== 'undefined') PhoneManager.renderBusinessWidget();[span_169](start_span)[span_169](end_span)
    showToast("Бизнес «" + b.name + "» улучшен до " + b.level + " уровня!");[span_170](start_span)[span_170](end_span)
}

function restockBusiness(idx) {
    const b = state.businesses[idx];[span_171](start_span)[span_171](end_span)
    if (!b) return;[span_172](start_span)[span_172](end_span)
    let cost = 15000;[span_173](start_span)[span_173](end_span)
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_174](start_span)[span_174](end_span)
    if (cash < cost) return showToast("Нужно 15,000 ₽ на партию сырья!");[span_175](start_span)[span_175](end_span)

    state.player.cash -= cost;[span_176](start_span)[span_176](end_span)
    b.stock = Math.min(100, (b.stock || 0) + 50);[span_177](start_span)[span_177](end_span)
    saveState();[span_178](start_span)[span_178](end_span)
    renderBusinessList();[span_179](start_span)[span_179](end_span)
    if (typeof PhoneManager !== 'undefined') PhoneManager.renderBusinessWidget();[span_180](start_span)[span_180](end_span)
    showToast("Склад сырья пополнен (+50%)!");[span_181](start_span)[span_181](end_span)
}

function collectAllBusinessCash() {
    let totalCollected = 0;[span_182](start_span)[span_182](end_span)
    if (state.businesses) {[span_183](start_span)[span_183](end_span)
        state.businesses.forEach(b => {[span_184](start_span)[span_184](end_span)
            if (b && b.stored && b.stored > 0) {[span_185](start_span)[span_185](end_span)
                totalCollected += b.stored;[span_186](start_span)[span_186](end_span)
                b.stored = 0;[span_187](start_span)[span_187](end_span)
            }
        });
    }
    if (totalCollected <= 0) return showToast("В кассах предприятий пока пусто!");[span_188](start_span)[span_188](end_span)

    state.player.cash = (state.player.cash || 0) + totalCollected;[span_189](start_span)[span_189](end_span)
    logBankTransaction("Инкассация выручки предприятий", totalCollected, true);

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('collect_biz', 1);
    }

    saveState();[span_190](start_span)[span_190](end_span)
    checkBusinessAccess();[span_191](start_span)[span_191](end_span)
    if (typeof PhoneManager !== 'undefined') {[span_192](start_span)[span_192](end_span)
        PhoneManager.renderBusinessWidget();[span_193](start_span)[span_193](end_span)
        PhoneManager.renderDailyQuestsWidget();[span_194](start_span)[span_194](end_span)
    }
    tgHaptic('success');[span_195](start_span)[span_195](end_span)
    playSound('win');[span_196](start_span)[span_196](end_span)
    spawnFloatingReward("+" + totalCollected.toLocaleString() + " ₽");[span_197](start_span)[span_197](end_span)
    showToast("Собрана выручка: +" + totalCollected.toLocaleString() + " ₽!");[span_198](start_span)[span_198](end_span)
}

// ========================================================
// 4. САРАИ (С БЛАТНЫМИ НОМЕРАМИ И ПЕРЕОЦЕНКОЙ)
// ========================================================
function getBarnTiersSafe() {
    if (typeof BARN_TIERS_CONFIG !== 'undefined' && Array.isArray(BARN_TIERS_CONFIG)) {[span_199](start_span)[span_199](end_span)
        return BARN_TIERS_CONFIG;[span_200](start_span)[span_200](end_span)
    }
    return [
        { tier: 1, reqLvl: 1, cost: 35000, title: "🏚️ Сарай в СНТ «Заря»", desc: "Дачный кооператив. Советская классика.", classGrade: "barn-grade-1", rareIdx: 0, fallback: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80" },[span_201](start_span)[span_201](end_span)
        { tier: 2, reqLvl: 7, cost: 120000, title: "🏢 Заброшенный бокс ГСК-4", desc: "Кооператив возле промзоны.", classGrade: "barn-grade-2", rareIdx: 1, fallback: "https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?auto=format&fit=crop&w=600&q=80" },[span_202](start_span)[span_202](end_span)
        { tier: 3, reqLvl: 15, cost: 350000, title: "🏭 Ангар механического завода", desc: "Закрытый цех. JDM купе.", classGrade: "barn-grade-3", rareIdx: 2, fallback: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80" },[span_203](start_span)[span_203](end_span)
        { tier: 4, reqLvl: 25, cost: 850000, title: "🏛️ Коллекционный подземный бокс", desc: "Опечатанный паркинг банка.", classGrade: "barn-grade-4", rareIdx: 4, fallback: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80" }[span_204](start_span)[span_204](end_span)
    ];[span_205](start_span)[span_205](end_span)
}

function renderBarnFind() {
    const container = document.getElementById('barnFindContent');[span_206](start_span)[span_206](end_span)
    if (!container) return;[span_207](start_span)[span_207](end_span)

    const pDay = (state.player && state.player.day) ? state.player.day : 1;[span_208](start_span)[span_208](end_span)
    const lastDay = (state.player && state.player.lastBarnDay) ? state.player.lastBarnDay : 0;[span_209](start_span)[span_209](end_span)
    const canScoutToday = lastDay < pDay;[span_210](start_span)[span_210](end_span)
    const lvl = (state.player && state.player.level) ? state.player.level : 1;[span_211](start_span)[span_211](end_span)

    let html = "";[span_212](start_span)[span_212](end_span)
    getBarnTiersSafe().forEach(b => {[span_213](start_span)[span_213](end_span)
        let isLvlLocked = lvl < b.reqLvl;[span_214](start_span)[span_214](end_span)
        let isDoneToday = !canScoutToday;[span_215](start_span)[span_215](end_span)

        let rareCar = (typeof BARN_FINDS !== 'undefined' && BARN_FINDS[b.rareIdx]) ? BARN_FINDS[b.rareIdx] : { name: "Раритет" };[span_216](start_span)[span_216](end_span)
        let statusBadge = isLvlLocked 
            ? "<span class='tag-badge bg-tag-red'><i class='fa-solid fa-lock'></i> С " + b.reqLvl + " УР</span>[span_217](start_span)"[span_217](end_span)
            : (isDoneToday ? "<span class='tag-badge bg-tag-amber'>Осмотрено сегодня</span>" : "<span class='tag-badge bg-tag-green'>Готово к разведке</span>");

        let btnDisabled = (isLvlLocked || isDoneToday) ? "disabled" : "";[span_218](start_span)[span_218](end_span)
        let btnText = isLvlLocked ? "Требуется " + b.reqLvl + " уровень" : (isDoneToday ? "Доступно завтра (00:00 🌙)" : "Вскрыть ангар (" + (b.cost / 1000).toFixed(0) + "k ₽)");
        let imgSrc = b.img || `assets/barns/barn_tier${b.tier}.jpg`;[span_219](start_span)[span_219](end_span)
        let fallbackSrc = b.fallback || "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80";[span_220](start_span)[span_220](end_span)

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
            <div class='text-xs mb-2 color-purple'>🏷️ Шанс на архивные госномера: <b>18%</b></div>
            <button onclick='scoutBarnTier(${b.tier})' class='btn btn-cyan btn-sm w-full' ${btnDisabled}>${btnText}</button>
        </div>`;[span_221](start_span)[span_221](end_span)
    });

    container.innerHTML = html;[span_222](start_span)[span_222](end_span)
}

function scoutBarnTier(tier) {
    const pDay = (state.player && state.player.day) ? state.player.day : 1;[span_223](start_span)[span_223](end_span)
    const lastDay = (state.player && state.player.lastBarnDay) ? state.player.lastBarnDay : 0;[span_224](start_span)[span_224](end_span)
    if (lastDay >= pDay) return showToast("Вы уже исследовали сараи сегодня! Дождитесь полночи 00:00.");

    const config = getBarnTiersSafe().find(b => b.tier === tier);[span_225](start_span)[span_225](end_span)
    if (!config) return;[span_226](start_span)[span_226](end_span)

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_227](start_span)[span_227](end_span)
    if (cash < config.cost) return showToast("Не хватает " + config.cost.toLocaleString() + " ₽ на разведку!");[span_228](start_span)[span_228](end_span)

    let maxSlots = getTotalGarageSlots();[span_229](start_span)[span_229](end_span)
    let currentSlots = (state.garage && state.garage.length) ? state.garage.length : 0;[span_230](start_span)[span_230](end_span)
    if (currentSlots >= maxSlots) return showToast("Гараж переполнен! Освободите бокс для находки.");[span_231](start_span)[span_231](end_span)

    state.player.cash -= config.cost;[span_232](start_span)[span_232](end_span)
    state.player.lastBarnDay = pDay;[span_233](start_span)[span_233](end_span)

    let isRare = Math.random() < 0.06;[span_234](start_span)[span_234](end_span)
    let foundCar = null;[span_235](start_span)[span_235](end_span)

    if (isRare && typeof BARN_FINDS !== 'undefined' && BARN_FINDS[config.rareIdx]) {[span_236](start_span)[span_236](end_span)
        foundCar = BARN_FINDS[config.rareIdx];[span_237](start_span)[span_237](end_span)
    } else if (typeof CAR_DATABASE !== 'undefined' && CAR_DATABASE.economy) {[span_238](start_span)[span_238](end_span)
        foundCar = CAR_DATABASE.economy[Math.floor(Math.random() * CAR_DATABASE.economy.length)];[span_239](start_span)[span_239](end_span)
    } else {
        foundCar = { name: "ВАЗ-2101 «Копейка»", power: 64, basePrice: 65000, img: "assets/cars/economy/vaz-2101.jpg" };[span_240](start_span)[span_240](end_span)
    }

    let genPlate = "ТРАНЗИТ";[span_241](start_span)[span_241](end_span)
    let isCoolPlate = Math.random() < 0.18;[span_242](start_span)[span_242](end_span)
    if (isCoolPlate && typeof generateCoolPlate === 'function') {[span_243](start_span)[span_243](end_span)
        genPlate = generateCoolPlate();[span_244](start_span)[span_244](end_span)
    } else if (typeof generateNormalPlate === 'function') {[span_245](start_span)[span_245](end_span)
        genPlate = generateNormalPlate();[span_246](start_span)[span_246](end_span)
    }

    let newCar = {
        id: "barn_" + Date.now(),[span_247](start_span)[span_247](end_span)
        name: foundCar.name,[span_248](start_span)[span_248](end_span)
        type: foundCar.type || 'economy',[span_249](start_span)[span_249](end_span)
        power: foundCar.power || 75,[span_250](start_span)[span_250](end_span)
        basePrice: foundCar.basePrice || config.cost * 2,[span_251](start_span)[span_251](end_span)
        price: foundCar.basePrice || config.cost * 2,[span_252](start_span)[span_252](end_span)
        baseMarketValue: foundCar.marketValue || foundCar.basePrice * 1.3,[span_253](start_span)[span_253](end_span)
        marketValue: foundCar.marketValue || foundCar.basePrice * 1.3,[span_254](start_span)[span_254](end_span)
        img: foundCar.img || "assets/cars/economy/vaz-2107.jpg",[span_255](start_span)[span_255](end_span)
        plate: genPlate,[span_256](start_span)[span_256](end_span)
        customPlate: genPlate,[span_257](start_span)[span_257](end_span)
        condition: Math.floor(40 + Math.random() * 25),[span_258](start_span)[span_258](end_span)
        wear: { engine: 50, transmission: 50 },[span_259](start_span)[span_259](end_span)
        hiddenDefect: { text: "Залегшие кольца и старое масло", cost: 15000 },[span_260](start_span)[span_260](end_span)
        insurance: null,[span_261](start_span)[span_261](end_span)
        isRegisteredOnPlayer: false, // Находки в сарае идут на ДКП
        ownershipDays: 0,
        engineTemp: 90,
        tireWear: 80,
        tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 },[span_262](start_span)[span_262](end_span)
        purchaseCost: config.cost[span_263](start_span)[span_263](end_span)
    };

    if (typeof recalculateCarMarketValue === 'function') {[span_264](start_span)[span_264](end_span)
        recalculateCarMarketValue(newCar);[span_265](start_span)[span_265](end_span)
    }

    if (!state.garage) state.garage = [];[span_266](start_span)[span_266](end_span)
    state.garage.push(newCar);[span_267](start_span)[span_267](end_span)

    saveState();[span_268](start_span)[span_268](end_span)
    renderBarnFind();[span_269](start_span)[span_269](end_span)
    if (typeof renderGarage === 'function') renderGarage();[span_270](start_span)[span_270](end_span)
    playSound('win');[span_271](start_span)[span_271](end_span)
    tgHaptic('success');[span_272](start_span)[span_272](end_span)

    let verdictMsg = "В дальнем углу обнаружен «" + newCar.name + "»!";[span_273](start_span)[span_273](end_span)
    if (isCoolPlate) verdictMsg += ` На кузове висят архивные номера ${genPlate} (+${(typeof calculatePlateValue === 'function' ? calculatePlateValue(genPlate).toLocaleString() : '0')} ₽ к оценке)!`;[span_274](start_span)[span_274](end_span)
    openVerdictModal("НАХОДКА В САРАЕ! 🏚️", verdictMsg, true, 0);[span_275](start_span)[span_275](end_span)
}

// ========================================================
// 5. НЕДВИЖИМОСТЬ
// ========================================================
function renderHousing() {
    const list = document.getElementById('housingMarketList');[span_276](start_span)[span_276](end_span)
    if (!list) return;[span_277](start_span)[span_277](end_span)

    if (typeof HOUSING_LIST === 'undefined' || !Array.isArray(HOUSING_LIST) || HOUSING_LIST.length === 0) {[span_278](start_span)[span_278](end_span)
        list.innerHTML = "<div class='glass-card text-center sub-label py-4'>База недвижимости не загружена.</div>";[span_279](start_span)[span_279](end_span)
        return;[span_280](start_span)[span_280](end_span)
    }

    let curId = (state.player && state.player.housingId) ? state.player.housingId : 'room';[span_281](start_span)[span_281](end_span)
    let owned = (state.player && state.player.ownedHouses) ? state.player.ownedHouses : [];[span_282](start_span)[span_282](end_span)

    let currentHouse = HOUSING_LIST.find(h => h.id === curId);[span_283](start_span)[span_283](end_span)
    let curTitle = currentHouse ? currentHouse.name : "Комната в общежитии";[span_284](start_span)[span_284](end_span)
    setTxt('currentHomeText', "Текущее: " + curTitle);[span_285](start_span)[span_285](end_span)

    let lvl = (state.player && state.player.level) ? state.player.level : 1;[span_286](start_span)[span_286](end_span)
    let html = "";[span_287](start_span)[span_287](end_span)

    HOUSING_LIST.forEach(h => {[span_288](start_span)[span_288](end_span)
        let isCurrent = curId === h.id;[span_289](start_span)[span_289](end_span)
        let isPurchased = owned.includes(h.id);[span_290](start_span)[span_290](end_span)
        let isLvlLocked = lvl < (h.minLevel || 1);[span_291](start_span)[span_291](end_span)
        let imgSrc = h.img || `assets/houses/${h.id}.jpg`;[span_292](start_span)[span_292](end_span)
        let fallbackSrc = h.fallback || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80';[span_293](start_span)[span_293](end_span)

        let statusTag = isPurchased 
            ? "<span class='tag-badge bg-tag-green'>В собственности</span>[span_294](start_span)"[span_294](end_span)
            : "<span class='tag-badge bg-tag-amber'>Аренда</span>";[span_295](start_span)[span_295](end_span)

        let actionBtns = "";[span_296](start_span)[span_296](end_span)
        if (isLvlLocked) {[span_297](start_span)[span_297](end_span)
            actionBtns = "<button class='btn btn-dark btn-sm w-full opacity-50' disabled>Доступно с " + h.minLevel + " уровня</button>";[span_298](start_span)[span_298](end_span)
        } else if (isCurrent && isPurchased) {[span_299](start_span)[span_299](end_span)
            actionBtns = 
            "<div class='grid-2 mt-2'>" +
                "<button onclick=\"openHomeInteriorModal('" + h.id + "')\" class='btn btn-cyan btn-sm'>🛋️ Обустройство дома</button>" +
                "<button class='btn btn-dark btn-sm opacity-50' disabled>Текущее жилье</button>" +
            "</div>";[span_300](start_span)[span_300](end_span)
        } else if (isCurrent && !isPurchased) {[span_301](start_span)[span_301](end_span)
            actionBtns = 
            "<div class='grid-2 mt-2'>" +
                "<button onclick=\"buyHousingProperty('" + h.id + "')\" class='btn btn-amber btn-sm'>Выкупить (" + (h.buyPrice / 1000000).toFixed(1) + "M ₽)</button>" +
                "<button class='btn btn-dark btn-sm opacity-50' disabled>Арендовано</button>" +
            "</div>";[span_302](start_span)[span_302](end_span)
        } else if (isPurchased) {[span_303](start_span)[span_303](end_span)
            actionBtns = 
            "<div class='grid-2 mt-2'>" +
                "<button onclick=\"openHomeInteriorModal('" + h.id + "')\" class='btn btn-cyan btn-sm'>🛋️ Обустройство</button>" +
                "<button onclick=\"moveIntoHousing('" + h.id + "')\" class='btn btn-green btn-sm'>Переехать 🚚</button>" +
            "</div>";[span_304](start_span)[span_304](end_span)
        } else {
            let rentVal = h.rent ? h.rent : 2000;[span_305](start_span)[span_305](end_span)
            actionBtns = 
            "<div class='grid-2 mt-2'>" +
                "<button onclick=\"rentHousing('" + h.id + "')\" class='btn btn-cyan btn-sm'>Аренда (" + rentVal.toLocaleString() + " ₽/д)</button>" +
                "<button onclick=\"buyHousingProperty('" + h.id + "')\" class='btn btn-amber btn-sm'>Купить (" + (h.buyPrice / 1000000).toFixed(1) + "M ₽)</button>" +
            "</div>";[span_306](start_span)[span_306](end_span)
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
        </div>`;[span_307](start_span)[span_307](end_span)
    });

    list.innerHTML = html;[span_308](start_span)[span_308](end_span)
}

function rentHousing(hId) {
    state.player.housingId = hId;[span_309](start_span)[span_309](end_span)
    state.player.housingType = 'rent';[span_310](start_span)[span_310](end_span)
    saveState();[span_311](start_span)[span_311](end_span)
    renderHousing();[span_312](start_span)[span_312](end_span)
    updateHeaderUI();[span_313](start_span)[span_313](end_span)
    showToast("Вы переехали в арендованное жилье!");[span_314](start_span)[span_314](end_span)
}

function buyHousingProperty(hId) {
    if (typeof HOUSING_LIST === 'undefined') return;[span_315](start_span)[span_315](end_span)
    const h = HOUSING_LIST.find(item => item.id === hId);[span_316](start_span)[span_316](end_span)
    if (!h) return;[span_317](start_span)[span_317](end_span)

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_318](start_span)[span_318](end_span)
    if (cash < h.buyPrice) return showToast("Не хватает денег на покупку!");[span_319](start_span)[span_319](end_span)

    state.player.cash -= h.buyPrice;[span_320](start_span)[span_320](end_span)
    logBankTransaction(`Покупка недвижимости «${h.name}»`, h.buyPrice, false);

    if (!state.player.ownedHouses) state.player.ownedHouses = [];[span_321](start_span)[span_321](end_span)
    if (!state.player.ownedHouses.includes(hId)) state.player.ownedHouses.push(hId);[span_322](start_span)[span_322](end_span)
    state.player.housingId = hId;[span_323](start_span)[span_323](end_span)
    state.player.housingType = 'own';[span_324](start_span)[span_324](end_span)

    saveState();[span_325](start_span)[span_325](end_span)
    renderHousing();[span_326](start_span)[span_326](end_span)
    updateHeaderUI();[span_327](start_span)[span_327](end_span)
    playSound('win');[span_328](start_span)[span_328](end_span)
    tgHaptic('success');[span_329](start_span)[span_329](end_span)
    openVerdictModal("НОВОСЕЛЬЕ! 🍾", "Вы выкупили «" + h.name + "» в собственность!", true);[span_330](start_span)[span_330](end_span)
}

function moveIntoHousing(hId) {
    state.player.housingId = hId;[span_331](start_span)[span_331](end_span)
    state.player.housingType = 'own';[span_332](start_span)[span_332](end_span)
    saveState();[span_333](start_span)[span_333](end_span)
    renderHousing();[span_334](start_span)[span_334](end_span)
    updateHeaderUI();[span_335](start_span)[span_335](end_span)
    showToast("Вы переехали в собственное жилье!");[span_336](start_span)[span_336](end_span)
}

function openHomeInteriorModal(hId) {
    if (typeof HOUSING_LIST === 'undefined') return;[span_337](start_span)[span_337](end_span)
    const h = HOUSING_LIST.find(item => item.id === hId);[span_338](start_span)[span_338](end_span)
    if (!h) return;[span_339](start_span)[span_339](end_span)

    setTxt('homeInteriorHeader', "Обустройство: <b>" + h.name + "</b> (Собственность)");[span_340](start_span)[span_340](end_span)
    if (!state.player.furniture) state.player.furniture = [];[span_341](start_span)[span_341](end_span)

    const list = document.getElementById('homeInteriorItemsList');[span_342](start_span)[span_342](end_span)
    if (!list) return;[span_343](start_span)[span_343](end_span)

    let html = "";[span_344](start_span)[span_344](end_span)
    if (typeof HOUSING_INTERIOR_CATALOG !== 'undefined') {[span_345](start_span)[span_345](end_span)
        HOUSING_INTERIOR_CATALOG.forEach(item => {[span_346](start_span)[span_346](end_span)
            let isBought = state.player.furniture.includes(item.id);[span_347](start_span)[span_347](end_span)
            let btnContent = isBought 
                ? "<button class='btn btn-dark btn-sm btn-auto opacity-50' disabled>Куплено ✓</button>[span_348](start_span)"[span_348](end_span)
                : "<button onclick=\"buyHomeFurniture('" + item.id + "', " + item.cost + ")\" class='btn btn-green btn-sm btn-auto'>" + (item.cost / 1000).toFixed(0) + "k ₽</button>";[span_349](start_span)[span_349](end_span)

            html += 
            "<div class='glass-card p-2 flex-between mb-2'>" +
                "<div>" +
                    "<div class='font-bold text-xs color-cyan'>" + item.name + "</div>" +
                    "<div class='sub-label' style='font-size:10px;'>${item.perk}</div>" +
                "</div>" +
                btnContent +
            "</div>";[span_350](start_span)[span_350](end_span)
        });
    }

    list.innerHTML = html;[span_351](start_span)[span_351](end_span)
    const modal = document.getElementById('modalHomeInterior');[span_352](start_span)[span_352](end_span)
    if (modal) modal.classList.add('active');[span_353](start_span)[span_353](end_span)
    playSound('tick');[span_354](start_span)[span_354](end_span)
}

function buyHomeFurniture(fId, cost) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_355](start_span)[span_355](end_span)
    if (cash < cost) return showToast("Не хватает денег на покупку!");[span_356](start_span)[span_356](end_span)

    state.player.cash -= cost;[span_357](start_span)[span_357](end_span)
    if (!state.player.furniture) state.player.furniture = [];[span_358](start_span)[span_358](end_span)
    state.player.furniture.push(fId);[span_359](start_span)[span_359](end_span)

    saveState();[span_360](start_span)[span_360](end_span)
    updateHeaderUI();[span_361](start_span)[span_361](end_span)
    playSound('win');[span_362](start_span)[span_362](end_span)
    tgHaptic('success');[span_363](start_span)[span_363](end_span)
    showToast("Куплено и установлено в вашем доме!");[span_364](start_span)[span_364](end_span)

    let curId = (state.player && state.player.housingId) ? state.player.housingId : 'room';[span_365](start_span)[span_365](end_span)
    openHomeInteriorModal(curId);[span_366](start_span)[span_366](end_span)
}

// ========================================================
// 6. ПОРТОВЫЕ КОНТЕЙНЕРЫ И СЛЕПОЙ АУКЦИОН
// ========================================================
function renderContainersList() {
    const container = document.getElementById('containersListRender');[span_367](start_span)[span_367](end_span)
    const lockCover = document.getElementById('containersLockCover');[span_368](start_span)[span_368](end_span)
    let lvl = (state.player && state.player.level) ? state.player.level : 1;[span_369](start_span)[span_369](end_span)

    if (lvl < 12) {[span_370](start_span)[span_370](end_span)
        if (container) container.style.display = 'none';[span_371](start_span)[span_371](end_span)
        if (lockCover) lockCover.style.display = 'block';[span_372](start_span)[span_372](end_span)
        return;[span_373](start_span)[span_373](end_span)
    }

    if (lockCover) lockCover.style.display = 'none';[span_374](start_span)[span_374](end_span)
    if (!container) return;[span_375](start_span)[span_375](end_span)

    container.style.display = 'block';[span_376](start_span)[span_376](end_span)
    let html = "";[span_377](start_span)[span_377](end_span)

    const catalog = (typeof CONTAINER_ITEMS !== 'undefined' && Array.isArray(CONTAINER_ITEMS)) ? CONTAINER_ITEMS : [[span_378](start_span)[span_378](end_span)
        { id: 'japan', name: 'Японский Контейнер', cost: 150000, timer: 30, minLevel: 12, badge: 'JDM & Мото', desc: 'Прямые поставки из порта Кобе.', img: 'assets/containers/japan.jpg', fallback: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80' },[span_379](start_span)[span_379](end_span)
        { id: 'europe', name: 'Европейский Автовоз', cost: 450000, timer: 35, minLevel: 15, badge: 'Комфорт & Премиум', desc: 'Автомобили из Германии без пробега по РФ.', img: 'assets/containers/europe.jpg', fallback: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80' },[span_380](start_span)[span_380](end_span)
        { id: 'usa_auction', name: 'Американский Аукцион', cost: 750000, timer: 40, minLevel: 18, badge: 'Битые & Маслкары', desc: 'Контейнер с Copart. Кот в мешке.', img: 'assets/containers/usa.jpg', fallback: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80' },[span_381](start_span)[span_381](end_span)
        { id: 'china_ship', name: 'Китайский Сухогруз', cost: 950000, timer: 38, minLevel: 22, badge: 'Электрички & Новые', desc: 'Свежие Lixiang и Zeekr прямиком из Гуанчжоу.', img: 'assets/containers/china.jpg', fallback: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=600&q=80' },[span_382](start_span)[span_382](end_span)
        { id: 'dubai', name: 'Эмиратский Контейнер', cost: 1200000, timer: 45, minLevel: 25, badge: 'Катера & Суперкары', desc: 'Аукционная роскошь шейхов.', img: 'assets/containers/dubai.jpg', fallback: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80' },[span_383](start_span)[span_383](end_span)
        { id: 'hangar', name: 'Заброшенный Ангар', cost: 5000000, timer: 60, minLevel: 30, badge: 'Тягачи & Гиперкары', desc: 'Списанное имущество логистического хаба!', img: 'assets/containers/hangar.jpg', fallback: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80' }[span_384](start_span)[span_384](end_span)
    ];[span_385](start_span)[span_385](end_span)

    catalog.forEach(box => {[span_386](start_span)[span_386](end_span)
        let minLvl = box.minLevel || 12;[span_387](start_span)[span_387](end_span)
        let isLocked = lvl < minLvl;[span_388](start_span)[span_388](end_span)
        let btnText = isLocked ? "С " + minLvl + " уровня" : "Вскрыть (" + (box.cost / 1000).toFixed(0) + "k ₽)";[span_389](start_span)[span_389](end_span)
        let imgSrc = box.img || 'assets/containers/japan.jpg';[span_390](start_span)[span_390](end_span)
        let fallbackSrc = box.fallback || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80';[span_391](start_span)[span_391](end_span)

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
        </div>`;[span_392](start_span)[span_392](end_span)
    });

    container.innerHTML = html;[span_393](start_span)[span_393](end_span)
}

function openPortContainerAction(boxId, cost) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_394](start_span)[span_394](end_span)
    if (cash < cost) return showToast("Не хватает денег на контейнер!");[span_395](start_span)[span_395](end_span)

    let maxSlots = getTotalGarageSlots();[span_396](start_span)[span_396](end_span)
    let currentSlots = (state.garage && state.garage.length) ? state.garage.length : 0;[span_397](start_span)[span_397](end_span)
    if (currentSlots >= maxSlots) return showToast("В гараже нет места под авто из контейнера!");[span_398](start_span)[span_398](end_span)

    state.player.cash -= cost;[span_399](start_span)[span_399](end_span)

    let roll = Math.random();[span_400](start_span)[span_400](end_span)
    if (roll < 0.40) {[span_401](start_span)[span_401](end_span)
        let winPrize = Math.round(cost * (1.35 + Math.random() * 0.65));[span_402](start_span)[span_402](end_span)
        state.player.cash += winPrize;[span_403](start_span)[span_403](end_span)
        saveState();[span_404](start_span)[span_404](end_span)
        updateHeaderUI();[span_405](start_span)[span_405](end_span)
        playSound('win');[span_406](start_span)[span_406](end_span)
        tgHaptic('success');[span_407](start_span)[span_407](end_span)
        openVerdictModal("ТАМОЖЕННЫЙ ДЖЕКПОТ! 🚢", "В контейнере найден ценный зарубежный лот! Выручка: +" + winPrize.toLocaleString() + " ₽", true, winPrize);[span_408](start_span)[span_408](end_span)
    } else if (roll < 0.75) {[span_409](start_span)[span_409](end_span)
        let partValue = Math.round(cost * 0.75);[span_410](start_span)[span_410](end_span)
        state.player.cash += partValue;[span_411](start_span)[span_411](end_span)
        saveState();[span_412](start_span)[span_412](end_span)
        updateHeaderUI();[span_413](start_span)[span_413](end_span)
        openVerdictModal("РАСПИЛ НА ЗАПЧАСТИ 🔩", "Кузов повреждён при доставке. Сдан на разбор: +" + partValue.toLocaleString() + " ₽", false);[span_414](start_span)[span_414](end_span)
    } else {
        saveState();[span_415](start_span)[span_415](end_span)
        updateHeaderUI();[span_416](start_span)[span_416](end_span)
        tgHaptic('error');[span_417](start_span)[span_417](end_span)
        openVerdictModal("ТАМОЖЕННАЯ ПУСТЫШКА 💨", "В контейнере оказались только битые запчасти. Убыток: -" + cost.toLocaleString() + " ₽", false);[span_418](start_span)[span_418](end_span)
    }
}

let currentBlindLot = null;[span_419](start_span)[span_419](end_span)

function openBlindAuctionModal() {
    let lvl = (state.player && state.player.level) ? state.player.level : 1;[span_420](start_span)[span_420](end_span)
    if (lvl < 20) return showToast("Теневой аукцион ФССП доступен с 20 уровня!");[span_421](start_span)[span_421](end_span)

    let isPremium = Math.random() > 0.5;[span_422](start_span)[span_422](end_span)
    let bidPrice = isPremium ? Math.floor(1500000 + Math.random() * 3000000) : Math.floor(200000 + Math.random() * 500000);[span_423](start_span)[span_423](end_span)

    currentBlindLot = { bid: bidPrice, isPremium: isPremium };[span_424](start_span)[span_424](end_span)

    setTxt('blindAuctionLotNum', Math.floor(100 + Math.random() * 899));[span_425](start_span)[span_425](end_span)
    setTxt('blindAuctionClassText', isPremium ? "ПРЕМИУМ / ГИПЕР" : "СЮРПРИЗ (Может быть всё)");[span_426](start_span)[span_426](end_span)
    
    const btn = document.getElementById('btnBlindBid');[span_427](start_span)[span_427](end_span)
    if (btn) btn.innerText = "Ставка " + bidPrice.toLocaleString() + " ₽";[span_428](start_span)[span_428](end_span)

    const modal = document.getElementById('modalBlindAuction');[span_429](start_span)[span_429](end_span)
    if (modal) modal.classList.add('active');[span_430](start_span)[span_430](end_span)
    playSound('tick');[span_431](start_span)[span_431](end_span)
}

function placeBlindBid() {
    if (!currentBlindLot) return;[span_432](start_span)[span_432](end_span)
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_433](start_span)[span_433](end_span)
    if (cash < currentBlindLot.bid) return showToast("Не хватает денег на ставку!");[span_434](start_span)[span_434](end_span)

    let maxSlots = getTotalGarageSlots();[span_435](start_span)[span_435](end_span)
    let currentSlots = (state.garage && state.garage.length) ? state.garage.length : 0;[span_436](start_span)[span_436](end_span)
    if (currentSlots >= maxSlots) return showToast("Освободите бокс в гараже!");[span_437](start_span)[span_437](end_span)

    state.player.cash -= currentBlindLot.bid;[span_438](start_span)[span_438](end_span)

    let poolType = currentBlindLot.isPremium ? (Math.random() > 0.3 ? 'premium' : 'hyper') : (Math.random() > 0.5 ? 'comfort' : 'economy');[span_439](start_span)[span_439](end_span)
    if (typeof CAR_DATABASE === 'undefined' || !CAR_DATABASE[poolType]) poolType = 'economy';[span_440](start_span)[span_440](end_span)
    
    let pool = CAR_DATABASE[poolType];[span_441](start_span)[span_441](end_span)
    let template = pool[Math.floor(Math.random() * pool.length)];[span_442](start_span)[span_442](end_span)

    let isTrash = Math.random() < 0.3;[span_443](start_span)[span_443](end_span)
    let isStolen = Math.random() < 0.2;[span_444](start_span)[span_444](end_span)

    let plate = isStolen ? "ТРАНЗИТ" : (typeof generateCoolPlate === 'function' && Math.random() < 0.25 ? generateCoolPlate() : generateNormalPlate());[span_445](start_span)[span_445](end_span)
    let baseVal = template.basePrice || 100000;[span_446](start_span)[span_446](end_span)
    
    let car = {
        id: "blind_" + Date.now(),[span_447](start_span)[span_447](end_span)
        name: template.name || "Автомобиль",[span_448](start_span)[span_448](end_span)
        type: template.type || poolType,[span_449](start_span)[span_449](end_span)
        power: template.power || 100,[span_450](start_span)[span_450](end_span)
        basePrice: baseVal,[span_451](start_span)[span_451](end_span)
        price: currentBlindLot.bid,[span_452](start_span)[span_452](end_span)
        baseMarketValue: baseVal * (isTrash ? 0.4 : 1.1),[span_453](start_span)[span_453](end_span)
        marketValue: baseVal * (isTrash ? 0.4 : 1.1),[span_454](start_span)[span_454](end_span)
        img: template.img || "assets/cars/economy/vaz-2107.jpg",[span_455](start_span)[span_455](end_span)
        plate: plate,[span_456](start_span)[span_456](end_span)
        customPlate: plate,[span_457](start_span)[span_457](end_span)
        condition: isTrash ? Math.floor(10 + Math.random() * 30) : Math.floor(70 + Math.random() * 30),[span_458](start_span)[span_458](end_span)
        wear: { engine: isTrash ? 20 : 80, transmission: isTrash ? 30 : 80 },[span_459](start_span)[span_459](end_span)
        hiddenDefect: isTrash ? { text: "Двигатель заклинило, блок пробит!", cost: baseVal * 0.4 } : null,[span_460](start_span)[span_460](end_span)
        isStolen: isStolen,[span_461](start_span)[span_461](end_span)
        unregistered: false,[span_462](start_span)[span_462](end_span)
        impounded: false,[span_463](start_span)[span_463](end_span)
        insurance: null,[span_464](start_span)[span_464](end_span)
        autotekaChecked: true,[span_465](start_span)[span_465](end_span)
        isRegisteredOnPlayer: false, // Лоты аукциона идут без постановки на учёт
        ownershipDays: 0,
        engineTemp: 90,
        tireWear: 75,
        tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 },[span_466](start_span)[span_466](end_span)
        purchaseCost: currentBlindLot.bid[span_467](start_span)[span_467](end_span)
    };

    if (typeof recalculateCarMarketValue === 'function') {[span_468](start_span)[span_468](end_span)
        recalculateCarMarketValue(car);[span_469](start_span)[span_469](end_span)
    }

    if (!state.garage) state.garage = [];[span_470](start_span)[span_470](end_span)
    state.garage.push(car);[span_471](start_span)[span_471](end_span)
    saveState();[span_472](start_span)[span_472](end_span)

    closeModal('modalBlindAuction');[span_473](start_span)[span_473](end_span)
    if (typeof renderGarage === 'function') renderGarage();[span_474](start_span)[span_474](end_span)
    updateHeaderUI();[span_475](start_span)[span_475](end_span)

    let title = isTrash ? "КОТ В МЕШКЕ! 🗑️" : "ОТЛИЧНЫЙ ЛОТ! 🎉";[span_476](start_span)[span_476](end_span)
    let msg = "Под чехлом оказался «" + car.name + "». ";[span_477](start_span)[span_477](end_span)
    if (isTrash) {[span_478](start_span)[span_478](end_span)
        msg += "Машина в ужасном состоянии, требует капремонта!";[span_479](start_span)[span_479](end_span)
        playSound('error');[span_480](start_span)[span_480](end_span)
        tgHaptic('error');[span_481](start_span)[span_481](end_span)
    } else if (isStolen) {[span_482](start_span)[span_482](end_span)
        msg += "Тачка пушка, но числится в угоне! Придется отмывать VIN у Решалы.";[span_483](start_span)[span_483](end_span)
        playSound('win');[span_484](start_span)[span_484](end_span)
        tgHaptic('warning');[span_485](start_span)[span_485](end_span)
    } else {
        msg += `Машина в идеале, вы сорвали куш! Номера ${car.plate}.`;[span_486](start_span)[span_486](end_span)
        playSound('win');[span_487](start_span)[span_487](end_span)
        tgHaptic('success');[span_488](start_span)[span_488](end_span)
    }

    openVerdictModal(title, msg, !isTrash, 0, car.marketValue - currentBlindLot.bid);[span_489](start_span)[span_489](end_span)
}

// ========================================================
// 7. СЛУЧАЙНЫЕ СОБЫТИЯ НА ТРАССЕ
// ========================================================
function triggerRandomRoadEvent() {
    let lvl = (state.player && state.player.level) ? state.player.level : 1;[span_490](start_span)[span_490](end_span)
    if (lvl < 5) return;[span_491](start_span)[span_491](end_span)

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;[span_492](start_span)[span_492](end_span)
    let podstavaChance = karma < 40 ? 0.16 : 0.07;[span_493](start_span)[span_493](end_span)

    if (Math.random() < podstavaChance) {[span_494](start_span)[span_494](end_span)
        const modal = document.getElementById('modalAutoPodstava');[span_495](start_span)[span_495](end_span)
        if (modal) modal.classList.add('active');[span_496](start_span)[span_496](end_span)
        try { playSound('error'); tgHaptic('error'); } catch(e){}[span_497](start_span)[span_497](end_span)
    }
}

function resolvePodstava(action) {
    closeModal('modalAutoPodstava');[span_498](start_span)[span_498](end_span)
    if (action === 'pay') {[span_499](start_span)[span_499](end_span)
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_500](start_span)[span_500](end_span)
        let cost = Math.min(150000, cash);[span_501](start_span)[span_501](end_span)
        state.player.cash -= cost;[span_502](start_span)[span_502](end_span)
        state.player.mood = Math.max(0, (state.player.mood || 80) - 20);[span_503](start_span)[span_503](end_span)
        saveState(); updateHeaderUI();[span_504](start_span)[span_504](end_span)
        openVerdictModal("ВЫ ЗАПЛАТИЛИ РЭКЕТИРАМ", "Вы отдали " + cost.toLocaleString() + " ₽. Настроение испорчено.", false);[span_505](start_span)[span_505](end_span)
    } else if (action === 'reshala') {[span_506](start_span)[span_506](end_span)
        let conn = (state.player && state.player.connections) ? state.player.connections : 0;[span_507](start_span)[span_507](end_span)
        if (conn < 1) {[span_508](start_span)[span_508](end_span)
            showToast("Нет связей! Пришлось платить наличкой.");[span_509](start_span)[span_509](end_span)
            resolvePodstava('pay');[span_510](start_span)[span_510](end_span)
            return;[span_511](start_span)[span_511](end_span)
        }
        state.player.connections -= 1;[span_512](start_span)[span_512](end_span)
        saveState(); updateHeaderUI();[span_513](start_span)[span_513](end_span)
        openVerdictModal("РЕШАЛА РАЗРУЛИЛ", "Один звонок Артуру, и «братки» с извинениями уехали. Связь потрачена.", true);[span_514](start_span)[span_514](end_span)
    } else if (action === 'fight') {[span_515](start_span)[span_515](end_span)
        let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;[span_516](start_span)[span_516](end_span)
        let winChance = karma > 70 ? 0.75 : (karma < 35 ? 0.25 : 0.45);[span_517](start_span)[span_517](end_span)
        
        if (Math.random() < winChance) {[span_518](start_span)[span_518](end_span)
            state.player.karma = Math.min(100, karma + 10);[span_519](start_span)[span_519](end_span)
            state.player.mood = Math.min(100, (state.player.mood || 50) + 20);[span_520](start_span)[span_520](end_span)
            saveState(); updateHeaderUI();[span_521](start_span)[span_521](end_span)
            openVerdictModal("ВЫ ДАЛИ ОТПОР!", "Вы достали монтировку и отстояли свою правоту. Мошенники сбежали! Карма и кураж выросли.", true);[span_522](start_span)[span_522](end_span)
        } else {
            state.player.mood = Math.max(0, (state.player.mood || 50) - 40);[span_523](start_span)[span_523](end_span)
            state.player.hunger = Math.max(0, (state.player.hunger || 50) - 30);[span_524](start_span)[span_524](end_span)
            if (state.garage && state.garage.length > 0) {[span_525](start_span)[span_525](end_span)
                let car = state.garage[0];[span_526](start_span)[span_526](end_span)
                car.condition = Math.max(10, car.condition - 30);[span_527](start_span)[span_527](end_span)
                if (car.bodyThickness) { car.bodyThickness.doors = 300; car.bodyThickness.wings = 250; }[span_528](start_span)[span_528](end_span)
                if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(car);[span_529](start_span)[span_529](end_span)
            }
            saveState(); updateHeaderUI();[span_530](start_span)[span_530](end_span)
            if (typeof renderGarage === 'function') renderGarage();[span_531](start_span)[span_531](end_span)
            openVerdictModal("ВАС ИЗБИЛИ И РАЗБИЛИ АВТО", "Численный перевес был не на вашей стороне. Ваша машина сильно помята.", false);[span_532](start_span)[span_532](end_span)
        }
    }
}

// ========================================================
// 8. РАЦИОН ПИТАНИЯ
// ========================================================
function renderDiets() {
    const list = document.getElementById('dietList');[span_533](start_span)[span_533](end_span)
    if (!list) return;[span_534](start_span)[span_534](end_span)

    const catalog = (typeof DIETS !== 'undefined' && Array.isArray(DIETS)) ? DIETS : [[span_535](start_span)[span_535](end_span)
        { id: 'water', name: 'Вода из-под крана', cost: 0, hunger: 5, mood: -30, desc: 'Живот крутит, жить не хочется' },[span_536](start_span)[span_536](end_span)
        { id: 'doshik', name: 'Бич-пакет и сухари', cost: 150, hunger: 20, mood: -15, desc: 'Желудок ноет, депрессия, тяжело торговаться' },[span_537](start_span)[span_537](end_span)
        { id: 'home_sandwich', name: 'Бутерброд из дома', cost: 250, hunger: 30, mood: -5, desc: 'Майонез, колбаса "Красная цена", терпимо' },[span_538](start_span)[span_538](end_span)
        { id: 'pelmeni', name: 'Пельмени по акции', cost: 400, hunger: 45, mood: 0, desc: 'Дешево и сердито, главное сварить' },[span_539](start_span)[span_539](end_span)
        { id: 'shaurma', name: 'Шаурма на вокзале', cost: 800, hunger: 50, mood: -5, desc: 'Сытно, но жирно и тоскливо' },[span_540](start_span)[span_540](end_span)
        { id: 'fastfood', name: 'Фастфуд комбо', cost: 1200, hunger: 60, mood: 10, desc: 'Бургер, картошка, кола. Классика.' },[span_541](start_span)[span_541](end_span)
        { id: 'stolovka', name: 'Обед в столовой', cost: 2200, hunger: 70, mood: 15, desc: 'Нормальное первое, второе и компот' },[span_542](start_span)[span_542](end_span)
        { id: 'cafe', name: 'Бизнес-ланч в ресторане', cost: 6500, hunger: 90, mood: 25, desc: 'Свежий стейк, кофе и уверенность в себе' }[span_543](start_span)[span_543](end_span)
    ];[span_544](start_span)[span_544](end_span)

    let html = "";[span_545](start_span)[span_545](end_span)
    catalog.forEach(d => {[span_546](start_span)[span_546](end_span)
        html += `
        <div class='glass-card flex-between p-2 mb-2'>
            <div>
                <b class='text-xs color-green'>${d.name}</b>
                <div class='sub-label' style='font-size:10px;'>${d.desc || "Питание перекупа"} (+${d.hunger}% сытости)</div>
            </div>
            <button onclick="eatMeal('${d.id}', ${d.cost}, ${d.hunger}, ${d.mood})" class='btn btn-dark btn-auto btn-sm'>${d.cost.toLocaleString()} ₽</button>
        </div>`;[span_547](start_span)[span_547](end_span)
    });
    list.innerHTML = html;[span_548](start_span)[span_548](end_span)
}

function eatMeal(id, cost, hunger, mood) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_549](start_span)[span_549](end_span)
    if (cash < cost) return showToast("Не хватает денег на еду!");[span_550](start_span)[span_550](end_span)

    state.player.cash -= cost;[span_551](start_span)[span_551](end_span)
    state.player.hunger = Math.min(100, (state.player.hunger || 80) + hunger);[span_552](start_span)[span_552](end_span)
    state.player.mood = Math.min(100, (state.player.mood || 85) + mood);[span_553](start_span)[span_553](end_span)

    saveState();[span_554](start_span)[span_554](end_span)
    updateHeaderUI();[span_555](start_span)[span_555](end_span)
    showToast("Вы перекусили! Силы восстановлены.");[span_556](start_span)[span_556](end_span)
}

// ========================================================
// 9. ГОРОДСКОЙ ЭФИР
// ========================================================
function renderLifeChat() {
    const feed = document.getElementById('lifeChatFeed');[span_557](start_span)[span_557](end_span)
    if (!feed) return;[span_558](start_span)[span_558](end_span)

    if (!state.lifeChatMessages || state.lifeChatMessages.length === 0) {[span_559](start_span)[span_559](end_span)
        if (typeof STREET_CHAT_LOG !== 'undefined' && Array.isArray(STREET_CHAT_LOG)) {[span_560](start_span)[span_560](end_span)
            state.lifeChatMessages = STREET_CHAT_LOG.slice(0, 6).map(m => ({ sender: m.author, text: m.text }));[span_561](start_span)[span_561](end_span)
        } else {
            state.lifeChatMessages = [
                { sender: "🚨 ДПС_Инфо", text: "Внимание! На ул. Ленина рейд по 12.5.1, прячьте прямотоки!" },[span_562](start_span)[span_562](end_span)
                { sender: "Колян_99", text: "Кто на кольце сегодня? ДПСников вроде нет." },[span_563](start_span)[span_563](end_span)
                { sender: "Артур_Решала", text: "Номера 777 в наличии, пишите в приложении." },[span_564](start_span)[span_564](end_span)
                { sender: "Vazovod_77", text: "Куплю кузов под корч ВАЗ 2107 или 2101, срочно в лс!" },[span_565](start_span)[span_565](end_span)
                { sender: "Perecup_Pro", text: "Продам Солярис, не бит не крашен (крашена только крыша)." }[span_566](start_span)[span_566](end_span)
            ];
        }
    }

    let html = "";[span_567](start_span)[span_567](end_span)
    state.lifeChatMessages.forEach(m => {[span_568](start_span)[span_568](end_span)
        let isMine = m.isMine ? "mine" : "";[span_569](start_span)[span_569](end_span)
        html += `
        <div class='chat-bubble ${isMine}'>
            <b class='color-cyan text-xs'>${m.sender}:</b> ${m.text}
        </div>`;[span_570](start_span)[span_570](end_span)
    });
    feed.innerHTML = html;[span_571](start_span)[span_571](end_span)
    feed.scrollTop = feed.scrollHeight;[span_572](start_span)[span_572](end_span)
}

function sendChatMessageFromInput() {
    const input = document.getElementById('feedMessageInput');[span_573](start_span)[span_573](end_span)
    if (!input || !input.value.trim()) return;[span_574](start_span)[span_574](end_span)

    if (!state.lifeChatMessages) state.lifeChatMessages = [];[span_575](start_span)[span_575](end_span)
    state.lifeChatMessages.push({
        sender: (state.player && state.player.name) ? state.player.name : "Вы",[span_576](start_span)[span_576](end_span)
        text: input.value.trim(),[span_577](start_span)[span_577](end_span)
        isMine: true[span_578](start_span)[span_578](end_span)
    });

    input.value = "";[span_579](start_span)[span_579](end_span)
    saveState();[span_580](start_span)[span_580](end_span)
    renderLifeChat();[span_581](start_span)[span_581](end_span)
}

function roadAssistanceAction() {
    let fuel = (state.player && state.player.fuel !== undefined) ? state.player.fuel : 0;[span_582](start_span)[span_582](end_span)
    if (fuel < 10) return showToast("Нужно 10 ⛽ бензина для выезда!");[span_583](start_span)[span_583](end_span)
    state.player.fuel -= 10;[span_584](start_span)[span_584](end_span)

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;[span_585](start_span)[span_585](end_span)
    if (Math.random() < 0.65) {[span_586](start_span)[span_586](end_span)
        state.player.karma = Math.min(100, karma + 12);[span_587](start_span)[span_587](end_span)
        showToast("Вы прикурили аккумулятор на трассе! (+12 Кармы 😊)");[span_588](start_span)[span_588](end_span)
    } else {
        let conn = (state.player && state.player.connections) ? state.player.connections : 0;[span_589](start_span)[span_589](end_span)
        state.player.connections = conn + 1;[span_590](start_span)[span_590](end_span)
        state.player.karma = Math.min(100, karma + 5);[span_591](start_span)[span_591](end_span)
        showToast("Вы помогли сотруднику ведомства! (+1 🤝 Связь и +5 Карма)");[span_592](start_span)[span_592](end_span)
    }
    saveState();[span_593](start_span)[span_593](end_span)
    updateHeaderUI();[span_594](start_span)[span_594](end_span)
}

function donatePartsToMechanic() {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_595](start_span)[span_595](end_span)
    if (cash < 35000) return showToast("Нужно 35,000 ₽ на закупку деталей!");[span_596](start_span)[span_596](end_span)

    state.player.cash -= 35000;[span_597](start_span)[span_597](end_span)
    let conn = (state.player && state.player.connections) ? state.player.connections : 0;[span_598](start_span)[span_598](end_span)
    state.player.connections = conn + 1;[span_599](start_span)[span_599](end_span)
    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;[span_600](start_span)[span_600](end_span)
    state.player.karma = Math.min(100, karma + 8);[span_601](start_span)[span_601](end_span)

    saveState();[span_602](start_span)[span_602](end_span)
    updateHeaderUI();[span_603](start_span)[span_603](end_span)
    showToast("Дядя Ваня благодарен за запчасти! (+1 🤝 Связь и +8 Карма)");[span_604](start_span)[span_604](end_span)
}

function bigCharityDonate() {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_605](start_span)[span_605](end_span)
    if (cash < 100000) return showToast("Нужно 100,000 ₽!");[span_606](start_span)[span_606](end_span)

    state.player.cash -= 100000;[span_607](start_span)[span_607](end_span)
    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;[span_608](start_span)[span_608](end_span)
    state.player.karma = Math.min(100, karma + 25);[span_609](start_span)[span_609](end_span)

    saveState();[span_610](start_span)[span_610](end_span)
    updateHeaderUI();[span_611](start_span)[span_611](end_span)
    showToast("Доброе дело сделано! (+25 Кармы 😊)");[span_612](start_span)[span_612](end_span)
}

// ========================================================
// 10. КЛАССИЧЕСКОЕ КОЛЕСО И ТОПЛИВО
// ========================================================
const WHEEL_SECTORS = [
    { label: "150,000 ₽", color: "#00e676", textColor: "#000", reward: { cash: 150000 } },[span_613](start_span)[span_613](end_span)
    { label: "15 ⭐", color: "#ffb300", textColor: "#000", reward: { stars: 15 } },[span_614](start_span)[span_614](end_span)
    { label: "25,000 ₽", color: "#1e293b", textColor: "#fff", reward: { cash: 25000 } },[span_615](start_span)[span_615](end_span)
    { label: "+1 🤝 Связь", color: "#c084fc", textColor: "#000", reward: { connections: 1 } },[span_616](start_span)[span_616](end_span)
    { label: "350,000 ₽", color: "#00f2fe", textColor: "#000", reward: { cash: 350000 } },[span_617](start_span)[span_617](end_span)
    { label: "50 ⛽ Бак", color: "#0284c7", textColor: "#fff", reward: { fuel: 50 } },[span_618](start_span)[span_618](end_span)
    { label: "50,000 ₽", color: "#334155", textColor: "#fff", reward: { cash: 50000 } },[span_619](start_span)[span_619](end_span)
    { label: "JACKPOT 1M", color: "#ff3366", textColor: "#fff", reward: { cash: 1000000 } }[span_620](start_span)[span_620](end_span)
];

let isWheelSpinning = false;[span_621](start_span)[span_621](end_span)
let currentWheelRotation = 0;[span_622](start_span)[span_622](end_span)

function initWheelModule() {
    const cvs = document.getElementById('wheelCanvas');[span_623](start_span)[span_623](end_span)
    if (!cvs) return;[span_624](start_span)[span_624](end_span)
    const ctx = cvs.getContext('2d');[span_625](start_span)[span_625](end_span)
    const totalSectors = WHEEL_SECTORS.length;[span_626](start_span)[span_626](end_span)
    const arc = (2 * Math.PI) / totalSectors;[span_627](start_span)[span_627](end_span)
    const cx = 280;[span_628](start_span)[span_628](end_span)
    const cy = 280;[span_629](start_span)[span_629](end_span)
    const radius = 270;[span_630](start_span)[span_630](end_span)

    ctx.clearRect(0, 0, 560, 560);[span_631](start_span)[span_631](end_span)

    for (let i = 0; i < totalSectors; i++) {[span_632](start_span)[span_632](end_span)
        const angle = i * arc;[span_633](start_span)[span_633](end_span)
        const sec = WHEEL_SECTORS[i];[span_634](start_span)[span_634](end_span)

        ctx.beginPath();[span_635](start_span)[span_635](end_span)
        ctx.fillStyle = sec.color;[span_636](start_span)[span_636](end_span)
        ctx.moveTo(cx, cy);[span_637](start_span)[span_637](end_span)
        ctx.arc(cx, cy, radius, angle, angle + arc);[span_638](start_span)[span_638](end_span)
        ctx.lineTo(cx, cy);[span_639](start_span)[span_639](end_span)
        ctx.fill();[span_640](start_span)[span_640](end_span)

        ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";[span_641](start_span)[span_641](end_span)
        ctx.lineWidth = 2;[span_642](start_span)[span_642](end_span)
        ctx.stroke();[span_643](start_span)[span_643](end_span)

        ctx.save();[span_644](start_span)[span_644](end_span)
        ctx.translate(cx, cy);[span_645](start_span)[span_645](end_span)
        ctx.rotate(angle + arc / 2);[span_646](start_span)[span_646](end_span)
        ctx.textAlign = "right";[span_647](start_span)[span_647](end_span)
        ctx.fillStyle = sec.textColor;[span_648](start_span)[span_648](end_span)
        ctx.font = "900 18px sans-serif";[span_649](start_span)[span_649](end_span)
        ctx.shadowColor = "rgba(0,0,0,0.7)";[span_650](start_span)[span_650](end_span)
        ctx.shadowBlur = 4;[span_651](start_span)[span_651](end_span)
        ctx.fillText(sec.label, radius - 24, 6);[span_652](start_span)[span_652](end_span)
        ctx.restore();[span_653](start_span)[span_653](end_span)
    }
}

function spinWheelAction(isFree) {
    if (isWheelSpinning) return;[span_654](start_span)[span_654](end_span)

    if (isFree) {[span_655](start_span)[span_655](end_span)
        let pDay = (state.player && state.player.day) ? state.player.day : 1;[span_656](start_span)[span_656](end_span)
        let last = (state.player && state.player.lastFreeSpinDay) ? state.player.lastFreeSpinDay : 0;[span_657](start_span)[span_657](end_span)
        if (last >= pDay) return showToast("Бесплатный спин доступен раз в сутки (сброс в 00:00)!");
        state.player.lastFreeSpinDay = pDay;[span_658](start_span)[span_658](end_span)
    } else {
        let stars = (state.player && state.player.stars) ? state.player.stars : 0;[span_659](start_span)[span_659](end_span)
        if (stars < 25) return showToast("Нужно 25 Stars ⭐!");[span_660](start_span)[span_660](end_span)
        state.player.stars -= 25;[span_661](start_span)[span_661](end_span)
    }

    const cvs = document.getElementById('wheelCanvas');[span_662](start_span)[span_662](end_span)
    if (!cvs) return;[span_663](start_span)[span_663](end_span)

    isWheelSpinning = true;[span_664](start_span)[span_664](end_span)
    playSound('tick');[span_665](start_span)[span_665](end_span)
    tgHaptic('medium');[span_666](start_span)[span_666](end_span)

    const winningIdx = Math.floor(Math.random() * WHEEL_SECTORS.length);[span_667](start_span)[span_667](end_span)
    const totalSectors = WHEEL_SECTORS.length;[span_668](start_span)[span_668](end_span)
    const arcDeg = 360 / totalSectors;[span_669](start_span)[span_669](end_span)
    
    const targetDeg = (360 - (winningIdx * arcDeg) - (arcDeg / 2) - 90);[span_670](start_span)[span_670](end_span)
    const spins = 360 * (5 + Math.floor(Math.random() * 3));[span_671](start_span)[span_671](end_span)
    currentWheelRotation += spins + targetDeg;[span_672](start_span)[span_672](end_span)

    cvs.style.transition = "transform 4.5s cubic-bezier(0.12, 0.95, 0.22, 1)";[span_673](start_span)[span_673](end_span)
    cvs.style.transform = "rotate(" + currentWheelRotation + "deg)";[span_674](start_span)[span_674](end_span)

    let tickerInterval = setInterval(() => {[span_675](start_span)[span_675](end_span)
        playSound('tick');[span_676](start_span)[span_676](end_span)
    }, 280);[span_677](start_span)[span_677](end_span)

    setTimeout(() => {[span_678](start_span)[span_678](end_span)
        clearInterval(tickerInterval);[span_679](start_span)[span_679](end_span)
        isWheelSpinning = false;[span_680](start_span)[span_680](end_span)

        const prize = WHEEL_SECTORS[winningIdx];[span_681](start_span)[span_681](end_span)
        if (prize.reward.cash) state.player.cash += prize.reward.cash;[span_682](start_span)[span_682](end_span)
        if (prize.reward.stars) state.player.stars += prize.reward.stars;[span_683](start_span)[span_683](end_span)
        if (prize.reward.fuel) state.player.fuel = Math.min(100, (state.player.fuel || 0) + prize.reward.fuel);[span_684](start_span)[span_684](end_span)
        if (prize.reward.connections) state.player.connections = (state.player.connections || 0) + prize.reward.connections;[span_685](start_span)[span_685](end_span)

        saveState();[span_686](start_span)[span_686](end_span)
        updateHeaderUI();[span_687](start_span)[span_687](end_span)
        playSound('win');[span_688](start_span)[span_688](end_span)
        tgHaptic('success');[span_689](start_span)[span_689](end_span)
        openVerdictModal("ПРИЗ С VIP КОЛЕСА! 🎡", "Поздравляем! Ваш выигрыш: " + prize.label, true);[span_690](start_span)[span_690](end_span)
    }, 4600);[span_691](start_span)[span_691](end_span)
}

function refuelAction(type) {
    if (type === 'cash') {[span_692](start_span)[span_692](end_span)
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_693](start_span)[span_693](end_span)
        if (cash < 5000) return showToast("Нужно 5,000 ₽ на полный бак!");[span_694](start_span)[span_694](end_span)
        state.player.cash -= 5000;[span_695](start_span)[span_695](end_span)
        state.player.fuel = 100;[span_696](start_span)[span_696](end_span)
        saveState();[span_697](start_span)[span_697](end_span)
        updateHeaderUI();[span_698](start_span)[span_698](end_span)
        playSound('win');[span_699](start_span)[span_699](end_span)
        showToast("Бак заправлен на 100 ⛽!");[span_700](start_span)[span_700](end_span)
    } else {
        state.player.fuel = 100;[span_701](start_span)[span_701](end_span)
        saveState();[span_702](start_span)[span_702](end_span)
        updateHeaderUI();[span_703](start_span)[span_703](end_span)
        playSound('win');[span_704](start_span)[span_704](end_span)
        showToast("Заправка за рекламу завершена: 100 ⛽!");[span_705](start_span)[span_705](end_span)
    }
}

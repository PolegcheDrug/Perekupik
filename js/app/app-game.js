// ========================================================
// js/app/app-game.js — ИГРОВЫЕ ЦИКЛЫ, КВЕСТЫ, РОЛЛЕРЫ (v4.3.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ Часть 2 из 3 (разгрузка app.js)
// ========================================================

// ========================================================
// 1. АНИМИРОВАННЫЙ РОЛЛЕР И УВЕДОМЛЕНИЯ
// ========================================================
let displayedCashValue = 0;
let displayedStarsValue = 0;
let activeNumberAnimators = {};

function animateNumberRoll(elementId, startVal, endVal, duration = 450, isCurrency = true) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (activeNumberAnimators[elementId]) {
        clearInterval(activeNumberAnimators[elementId]);
    }

    startVal = isNaN(startVal) ? 0 : Number(startVal);
    endVal = isNaN(endVal) ? 0 : Number(endVal);

    if (startVal === endVal) {
        el.innerText = isCurrency ? endVal.toLocaleString() : endVal;
        return;
    }

    const startTime = Date.now();
    const diff = endVal - startVal;
    el.style.textShadow = diff > 0 ? "0 0 16px #00e676" : "0 0 16px #ff3366";

    activeNumberAnimators[elementId] = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.round(startVal + diff * easeOut);

        el.innerText = isCurrency ? currentVal.toLocaleString() : currentVal;

        if (progress >= 1) {
            clearInterval(activeNumberAnimators[elementId]);
            delete activeNumberAnimators[elementId];
            el.innerText = isCurrency ? endVal.toLocaleString() : endVal;
            setTimeout(() => { el.style.textShadow = ""; }, 250);
        }
    }, 25);
}

function spawnFloatingReward(text) {
    try {
        const el = document.createElement('div');
        el.className = 'floating-reward';
        el.innerText = text;
        el.style.left = '50%';
        el.style.top = '45%';
        document.body.appendChild(el);
        setTimeout(() => { el.remove(); }, 1200);
    } catch(e) {}
}

function setTxt(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = val;

    try {
        document.querySelectorAll(`[data-clone-of="${id}"]`).forEach(cloneEl => {
            cloneEl.innerHTML = val;
        });
    } catch (e) {}
}

let _toastHideTimer = null;

function showToast(msg, type = 'default') {
    const t = document.getElementById('toastNotification');
    if (!t) return;

    t.className = 'toast';

    if (type && type !== 'default') {
        t.classList.add('toast-' + type);
    }

    t.innerText = msg;

    void t.offsetWidth;

    t.classList.add('show');

    if (_toastHideTimer) clearTimeout(_toastHideTimer);
    _toastHideTimer = setTimeout(() => {
        t.classList.remove('show');
    }, 2500);
}

function logBankTransaction(title, amount, isIncome) {
    if (!state.player) state.player = {};
    if (!Array.isArray(state.player.bankHistory)) state.player.bankHistory = [];

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    state.player.bankHistory.unshift({
        id: "tx_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
        title: title || "Банковская операция",
        amount: Math.round(Number(amount) || 0),
        isIncome: !!isIncome,
        time: timeStr
    });

    if (state.player.bankHistory.length > 35) {
        state.player.bankHistory = state.player.bankHistory.slice(0, 35);
    }
}

// ========================================================
// 2. ВЕРДИКТ-МОДАЛКА
// ========================================================
function renderPrizeTokensHTML(items) {
    if (!Array.isArray(items) || items.length === 0) return "";
    let html = `<div class="reward-tokens-grid my-2">`;
    items.forEach(it => {
        let borderClass = it.rarity || 'token-cyan';
        html += `
            <div class="reward-token-card ${borderClass}">
                <div class="reward-token-icon">${it.icon || '🎁'}</div>
                <div class="reward-token-details">
                    <div class="reward-token-title">${it.title}</div>
                    <div class="reward-token-value">${it.value}</div>
                    ${it.desc ? `<div class="reward-token-desc">${it.desc}</div>` : ''}
                </div>
            </div>
        `;
    });
    html += `</div>`;
    return html;
}

function extractPrizesFromText(text) {
    let tokens = [];
    if (!text || typeof text !== 'string') return tokens;
    let lines = text.split('\n');
    lines.forEach(line => {
        let trimLine = line.trim();
        if (!trimLine) return;

        if (trimLine.includes('₽')) {
            let match = trimLine.match(/([+\-]?\d[\d\s,.]*)\s*₽/);
            tokens.push({
                icon: '💰', title: 'Денежные средства',
                value: match ? match[1].trim() + ' ₽' : trimLine,
                desc: 'Зачислено на баланс игрока', rarity: 'token-green'
            });
        } else if (trimLine.includes('⭐') || trimLine.toLowerCase().includes('stars') || trimLine.toLowerCase().includes('банкнот')) {
            let match = trimLine.match(/([+\-]?\d+)\s*(⭐|stars|банкнот)/i);
            tokens.push({
                icon: '💵', title: 'Неоновые банкноты',
                value: match ? '+' + match[1] + ' 💵' : trimLine,
                desc: 'Премиальная валюта перекупа', rarity: 'token-green'
            });
        } else if (trimLine.includes('XP') || trimLine.toLowerCase().includes('опыт')) {
            let match = trimLine.match(/([+\-]?\d+)\s*XP/i);
            tokens.push({
                icon: '🎖️', title: 'Опыт авторитета',
                value: match ? '+' + match[1] + ' XP' : trimLine,
                desc: 'Повышает ранг перекупа', rarity: 'token-cyan'
            });
        } else if (trimLine.toLowerCase().includes('штрафстоян') || trimLine.includes('🚔')) {
            tokens.push({
                icon: '🚔', title: 'Талон штрафстоянки',
                value: 'Бесплатный забор авто',
                desc: 'Позволяет забрать машину без оплаты протокола', rarity: 'token-purple'
            });
        } else if (trimLine.includes('🚗') || trimLine.toLowerCase().includes('получен в гараж')) {
            tokens.push({
                icon: '🏎️', title: 'Транспортное средство',
                value: trimLine.replace(/^[0-9.\s]+/, '').replace('🚗', '').trim(),
                desc: 'Добавлено в ваш автопарк', rarity: 'token-cyan'
            });
        } else if (trimLine.includes('🏷️') || trimLine.toLowerCase().includes('номер')) {
            tokens.push({
                icon: '🏷️', title: 'Госномер РФ',
                value: trimLine.replace('🏷️', '').trim(),
                desc: 'Архивный номер в инвентаре', rarity: 'token-purple'
            });
        }
    });
    return tokens;
}

function openLevelGateModal(appName, reqLevel, customDesc = null) {
    if (window.AudioFx) {
        window.AudioFx.play('error');
        window.AudioFx.haptic('warning');
    }

    let curLvl = state.player?.level || 1;
    let curXp = state.player?.xp || 0;
    let maxXp = state.player?.maxXp || 120;
    let xpPercent = Math.min(100, Math.round((curXp / maxXp) * 100));

    let modal = document.getElementById('modalLevelGate');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalLevelGate';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    let defaultDesc = `Доступ к разделу <b>«${appName}»</b> открывается перекупам с <b>${reqLevel} уровня авторитета</b>.<br>Зарабатывайте опыт, покупая, восстанавливая и продавая машины на авторынке!`;

    modal.innerHTML = `
        <div class="modal-box text-center" style="max-width: 410px; border-color: var(--cyan); background: radial-gradient(circle at 50% 0%, #151d2f 0%, #070a10 85%);">
            <div class="radar-spinner-ring mb-2" style="border-top-color: var(--cyan); border-right-color: var(--purple); margin: 0 auto 10px auto;">
                <div class="radar-spinner-center" style="font-size:24px;">🔒</div>
            </div>
            <div class="modal-glow-badge mb-1" style="color:var(--cyan); border-color:var(--cyan); background:rgba(0,242,254,0.1); display:inline-block;">
                ТРЕБУЕТСЯ УРОВЕНЬ ${reqLevel}
            </div>
            <h3 class="font-bold mb-1 color-cyan" style="font-size:16px;">${appName}</h3>
            <p class="sub-label mb-3" style="font-size:11px; line-height:1.45; color:#cbd5e1; padding: 0 6px;">
                ${customDesc || defaultDesc}
            </p>
            <div class="p-2 mb-3 text-left" style="background:#090e18; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
                <div class="flex-between text-xs mb-1">
                    <span class="sub-label">Текущий ранг перекупа:</span>
                    <b class="color-amber">Уровень ${curLvl} из ${reqLevel}</b>
                </div>
                <div class="xp-bar-wrap my-1" style="width:100%; height:8px; background:rgba(255,255,255,0.06); border-radius:6px; overflow:hidden;">
                    <div class="xp-bar-fill" style="width: ${xpPercent}%; height:100%; background: linear-gradient(90deg, var(--cyan), var(--green));"></div>
                </div>
                <div class="flex-between" style="font-size:9.5px; color:#94a3b8;">
                    <span>Прогресс до след. ур: ${curXp}/${maxXp} XP</span>
                    <span class="color-cyan font-bold">${xpPercent}%</span>
                </div>
            </div>
            <div class="space-y-2">
                <button onclick="ModalManager.close('modalLevelGate'); switchTab('tabMarket');" class="btn btn-cyan btn-sm w-full font-bold">
                    <i class="fa-solid fa-store mr-1"></i> На авторынок (Качать опыт)
                </button>
                <button onclick="ModalManager.close('modalLevelGate')" class="btn btn-dark btn-sm w-full">
                    Понятно
                </button>
            </div>
        </div>
    `;

    ModalManager.open('modalLevelGate', { closeOthers: true });
}

function openVerdictModal(title, text, isSuccess, amount, profit, customTokens = null) {
    if (window.AudioFx) {
        window.AudioFx.haptic(isSuccess ? 'success' : 'error');
        window.AudioFx.play(isSuccess ? 'win' : 'error');
    }

    setTxt('verdictEmoji', isSuccess ? '🎉' : '❌');
    setTxt('verdictTitle', title);

    const descEl = document.getElementById('verdictText');
    const tokensBox = document.getElementById('verdictTokensContainer');

    let tokensToRender = customTokens;
    if (!tokensToRender && isSuccess) {
        tokensToRender = extractPrizesFromText(text);
    }

    if (tokensBox) {
        if (tokensToRender && tokensToRender.length > 0) {
            tokensBox.style.display = 'block';
            tokensBox.innerHTML = renderPrizeTokensHTML(tokensToRender);
            if (descEl) descEl.innerText = text.split('\n')[0] || "";
        } else {
            tokensBox.style.display = 'none';
            tokensBox.innerHTML = '';
            if (descEl) descEl.innerText = text || "";
        }
    } else if (descEl) {
        descEl.innerText = text || "";
    }

    const amtEl = document.getElementById('verdictAmount');
    if (amtEl) {
        if (amount && (!tokensToRender || tokensToRender.length === 0)) {
            amtEl.style.display = 'block';
            amtEl.innerText = (amount > 0 ? "+" : "") + Number(amount).toLocaleString() + " ₽";
        } else {
            amtEl.style.display = 'none';
        }
    }

    const profitEl = document.getElementById('verdictProfitBadge');
    if (profitEl) {
        if (profit !== undefined && profit !== null) {
            profitEl.style.display = 'block';
            if (profit > 0) {
                profitEl.className = 'text-xs font-bold mb-3 color-green';
                profitEl.innerText = "Чистая прибыль: +" + Number(profit).toLocaleString() + " ₽ 📈";
            } else if (profit < 0) {
                profitEl.className = 'text-xs font-bold mb-3 color-red';
                profitEl.innerText = "Убыток: " + Number(profit).toLocaleString() + " ₽ 📉";
            } else {
                profitEl.className = 'text-xs font-bold mb-3 color-amber';
                profitEl.innerText = "Сделка закрыта в ноль (0 ₽)";
            }
        } else {
            profitEl.style.display = 'none';
        }
    }

    ModalManager.open('modalDealVerdict');
}

function openPatchNotesModal() {
    ModalManager.open('modalPatchNotes');
    if (window.AudioFx) window.AudioFx.play('tick');
}

function dismissPatchNotesModal() {
    ModalManager.close('modalPatchNotes');
    try {
        localStorage.setItem('perekup_last_seen_version', window.CURRENT_GAME_VERSION);
    } catch(e) {}
}

// ========================================================
// 3. ЯЗЫК
// ========================================================
function toggleGameLanguage() {
    setGameLanguage(state.lang === 'ru' ? 'en' : 'ru');
}

function setGameLanguage(lang) {
    state.lang = lang;
    applyLanguageToDOM();
    saveState();
    if (window.AudioFx) {
        window.AudioFx.play('tick');
        window.AudioFx.haptic('light');
    }
    showToast(lang === 'ru' ? "Язык: Русский 🇷🇺" : "Language: English 🇬🇧", 'info');
}

function applyLanguageToDOM() {
    const lang = state.lang || 'ru';
    const dict = (typeof I18N_TRANSLATIONS !== 'undefined' && I18N_TRANSLATIONS[lang]) ? I18N_TRANSLATIONS[lang] : {};

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.innerHTML = dict[key];
    });

    const btnToggle = document.getElementById('btnLangToggle');
    if (btnToggle) {
        btnToggle.innerHTML = lang === 'ru'
            ? `<i class="fa-solid fa-globe"></i> <span>RU</span>`
            : `<i class="fa-solid fa-globe"></i> <span>EN</span>`;
    }
}

// ========================================================
// 4. ЗАДАНИЯ И ВЕХИ
// ========================================================
function trackQuestProgress(actionType, count = 1) {
    if (!state.player || !Array.isArray(state.player.dailyQuests)) return;
    let questsUpdated = false;

    state.player.dailyQuests.forEach(q => {
        if (!q.done && (q.actionType === actionType || q.id === actionType)) {
            q.cur = Math.min(q.max || q.target || 1, (q.cur || 0) + count);
            questsUpdated = true;
            if (q.cur >= (q.max || q.target || 1)) {
                showToast(`🎯 Выполнено задание: «${q.text}»!`, 'success');
                if (window.AudioFx) window.AudioFx.haptic('success');
            }
        }
    });

    if (questsUpdated) {
        saveState();
        if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.renderDailyQuestsWidget === 'function') {
            PhoneManager.renderDailyQuestsWidget();
        }
    }

    checkNotepadMilestones();
}

function checkNotepadMilestones() {
    const s = state.player?.stats || {};
    const netProfit = s.totalNetProfit || 0;
    const sold = s.sold || 0;

    if (netProfit >= 1000000 && !state.player.milestoneMilClaimed) {
        state.player.milestoneMilClaimed = true;
        showToast("🏆 Веха: Первый 1,000,000 ₽ чистой прибыли!", 'success');
        if (window.AudioFx) window.AudioFx.play('win');
    }
    if (sold >= 10 && !state.player.milestoneSalesClaimed) {
        state.player.milestoneSalesClaimed = true;
        showToast("🏆 Веха: Закрыто 10 успешных продаж!", 'success');
        if (window.AudioFx) window.AudioFx.play('win');
    }
}

function refreshDailyQuestsList() {
    state.player.dailyQuestsSuperClaimed = false;
    if (typeof DAILY_QUESTS_POOL === 'undefined' || !Array.isArray(DAILY_QUESTS_POOL)) {
        state.player.dailyQuests = [
            { id: "q_inspect", text: "Осмотреть толщиномером 2 авто", cur: 0, max: 2, actionType: "gauge_check", reward: 40000, rewardXp: 40, done: false },
            { id: "q_race", text: "Выиграть заезд 402м", cur: 0, max: 1, actionType: "win_drag", reward: 60000, rewardXp: 45, done: false },
            { id: "q_biz", text: "Собрать кассу с предприятий", cur: 0, max: 1, actionType: "collect_biz", reward: 30000, rewardXp: 30, done: false }
        ];
        return;
    }

    const shuffled = [...DAILY_QUESTS_POOL].sort(() => 0.5 - Math.random());
    state.player.dailyQuests = shuffled.slice(0, 3).map(q => ({
        id: q.id, text: q.text, cur: 0, max: q.target || 1,
        actionType: q.actionType, reward: q.reward, rewardXp: q.rewardXp || 35, done: false
    }));
}

// ========================================================
// 5. СЛОТЫ ГАРАЖА
// ========================================================
function getMarketRefreshCost() {
    let lvl = state.player?.level || 1;
    return 250 + (lvl * 450);
}

function getGarageSlotCost() {
    let bs = state.player?.baseSlots || 2;
    let extraSlots = Math.max(0, bs - 2);
    return Math.round(300000 * Math.pow(1.65, extraSlots));
}

function getExpressTicketUpgradeCost() {
    let m = state.player?.maxExpressTickets || 25;
    let extra = Math.max(0, m - 25);
    const steps = Math.floor(extra / 25);
    return Math.round(75000 * Math.pow(1.5, steps));
}

function getTotalGarageSlots() {
    let slots = state.player?.baseSlots || 2;
    if (typeof HOUSING_LIST !== 'undefined' && Array.isArray(HOUSING_LIST)) {
        const activeHousingId = state.player?.housingId;
        if (activeHousingId) {
            const activeHouse = HOUSING_LIST.find(h => h.id === activeHousingId);
            if (activeHouse && typeof activeHouse.slots === 'number') {
                slots += activeHouse.slots;
            }
        }
    }
    return Math.max(2, slots);
}

// ========================================================
// 6. КУРС STARS (динамический)
// ========================================================
function _updateDynamicStarRate() {
    if (!state.player) return;

    const prev = state.player.dynamicStarRate || STAR_RATE_DEFAULT;
    const drift = (Math.random() - 0.5) * 0.01;
    let next = Math.round(prev * (1 + drift));

    next = Math.max(STAR_RATE_MIN, Math.min(STAR_RATE_MAX, next));
    next = Math.round(next / 100) * 100;

    state.player.dynamicStarRate = next;

    if (!Array.isArray(state.player.dynamicStarRateHistory)) {
        state.player.dynamicStarRateHistory = [];
    }
    state.player.dynamicStarRateHistory.push(next);
    if (state.player.dynamicStarRateHistory.length > 30) {
        state.player.dynamicStarRateHistory = state.player.dynamicStarRateHistory.slice(-30);
    }

    console.log(`[Stars] Динамический курс: ${next.toLocaleString()} ₽ (было ${prev.toLocaleString()})`);
}

function _syncStarRateToBank() {
    if (!state.player) return;
    const rate = state.player.dynamicStarRate || STAR_RATE_DEFAULT;
    if (window.BANK_EXCHANGE_RATES && window.BANK_EXCHANGE_RATES.stars) {
        window.BANK_EXCHANGE_RATES.stars.buyRub = rate;
        window.BANK_EXCHANGE_RATES.stars.sellRub = Math.round(rate * 0.96);
    }
}

// ========================================================
// 7. СУТОЧНЫЙ ЦИКЛ
// ========================================================
function checkRealTimeDayChange() {
    const now = new Date();
    const lastDate = new Date(state.player.lastRealDayTimestamp || Date.now());

    const isDifferentDay = (
        now.getFullYear() !== lastDate.getFullYear() ||
        now.getMonth() !== lastDate.getMonth() ||
        now.getDate() !== lastDate.getDate()
    );

    if (isDifferentDay) executeDayCycleMidnight(now);
}

function executeDayCycleMidnight(currentDateObj) {
    state.player.day = (state.player.day || 1) + 1;
    state.player.lastRealDayTimestamp = currentDateObj.getTime();
    state.player.expressTickets = state.player.maxExpressTickets || 25;
    state.player.consecutiveRaces = 0;

    _updateDynamicStarRate();
    _syncStarRateToBank();

    state.player.streakDay = (state.player.streakDay || 0) + 1;
    if (state.player.streakDay >= 7) {
        state.player.streakDay = 0;
        state.player.superSpinTickets = (state.player.superSpinTickets || 0) + 1;
        if (typeof showToast === 'function') {
            setTimeout(() => showToast("🎟️ 7-дневный стрик! +1 билет СуперВилспина", 'success'), 3200);
        }
        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Бонус за 7-дневный стрик: +1 билет", 0, true);
        }
    }

    if (state.player.loanDebt > 0) state.player.loanDebt = Math.round(state.player.loanDebt * 1.02);

    if (Array.isArray(state.player.bankDeposits)) {
        state.player.bankDeposits.forEach(dep => {
            dep.daysPassed = (dep.daysPassed || 0) + 1;
            let dailyRate = (dep.dailyPercent || 0.3) / 100;
            let gain = Math.round(dep.currentAmount * dailyRate);
            if (dep.autoCompound) dep.currentAmount += gain;
            else dep.accumulatedProfit = (dep.accumulatedProfit || 0) + gain;
        });
    }

    state.player.hunger = Math.max(10, (state.player.hunger || 80) - 25);
    state.player.mood = Math.max(10, (state.player.mood || 85) - 15);

    try {
        if (typeof HOUSING_LIST !== 'undefined' && Array.isArray(HOUSING_LIST) && state.player?.housingId) {
            const activeHouse = HOUSING_LIST.find(h => h.id === state.player.housingId);
            if (activeHouse && typeof activeHouse.moodBonus === 'number' && activeHouse.moodBonus !== 0) {
                state.player.mood = Math.max(0, Math.min(100, (state.player.mood || 0) + activeHouse.moodBonus));
                console.log(`[Housing] Ежедневный mood-бонус: ${activeHouse.moodBonus >= 0 ? '+' : ''}${activeHouse.moodBonus} от «${activeHouse.name}»`);

                if (typeof showToast === 'function') {
                    setTimeout(() => {
                        showToast(`🏠 «${activeHouse.name}»: ${activeHouse.moodBonus >= 0 ? '+' : ''}${activeHouse.moodBonus}% к куражу`, 'info');
                    }, 2200);
                }
            }
        }
    } catch (e) {
        console.warn('[Housing] Ошибка применения mood-бонуса:', e);
    }

    if (typeof refreshDailyQuestsList === 'function') refreshDailyQuestsList();

    try {
        if (window.PhoneBusiness && typeof window.PhoneBusiness.onNewDay === 'function') {
            window.PhoneBusiness.onNewDay();
            if (typeof window.PhoneBusiness.checkAchievements === 'function') {
                window.PhoneBusiness.checkAchievements();
            }
        }
    } catch (e) {
        console.error('[DayCycle] Ошибка бизнеса:', e);
    }

    try {
        if (Array.isArray(state.garage)) {
            state.garage.forEach((car, idx) => {
                if (!car || !car._backfireDay || car._backfireResolved) return;
                const curDay = state.player.day || 1;
                if (curDay >= car._backfireDay) {
                    car._backfireResolved = true;
                    setTimeout(() => {
                        if (typeof _triggerBuyerBackfire === 'function') _triggerBuyerBackfire(car, idx);
                    }, 800 + Math.random() * 1500);
                }
            });
        }
    } catch (e) {}

    try {
        if (window.PhoneBusiness && typeof window.PhoneBusiness._syncActiveBonus === 'function') {
            window.PhoneBusiness._syncActiveBonus();
        } else if (state.player.businessAdBonus) {
            const curDay = state.player.day || 1;
            if (state.player.businessAdBonus.expiresDay < curDay) {
                state.player.businessAdBonus = null;
                if (window.PhoneBusiness) window.PhoneBusiness._activeBonus = null;
            }
        }
    } catch (e) {}

    try {
        if (state.player.housingType === 'rent' && state.player.housingRentDue > 0) {
            const curDay = state.player.day || 1;
            if (curDay >= state.player.housingRentDue) {
                const db = (typeof HOUSING_LIST !== 'undefined') ? HOUSING_LIST : [];
                const activeHouse = db.find(h => h.id === state.player.housingId);
                if (activeHouse) {
                    const rent = activeHouse.rent || 0;
                    if ((state.player.cash || 0) >= rent) {
                        state.player.cash -= rent;
                        state.player.housingRentDue = curDay + 1;
                        if (typeof logBankTransaction === 'function') {
                            logBankTransaction(`Аренда жилья: ${activeHouse.name}`, rent, false);
                        }
                        if (typeof showToast === 'function') {
                            setTimeout(() => showToast(`🏠 Списана аренда жилья: -${rent.toLocaleString()} ₽`, 'info'), 2800);
                        }
                    } else {
                        state.player.housingId = 'trailer';
                        state.player.housingType = 'own';
                        if (typeof showToast === 'function') {
                            setTimeout(() => showToast("⚠️ Не хватило денег на аренду! Вы переехали в бытовку.", 'warning'), 2800);
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.warn('[Housing] Ошибка списания аренды:', e);
    }

    try {
        if (window.AppPost && typeof window.AppPost.chargeDailyParking === 'function') {
            const parkingResult = window.AppPost.chargeDailyParking();
            if (parkingResult.charged > 0) {
                setTimeout(() => {
                    showToast(`🅿️ Списано за парковку: -${parkingResult.charged.toLocaleString()} ₽`, 'info');
                }, 3500);
            }
            if (parkingResult.lostCars > 0) {
                setTimeout(() => {
                    if (typeof openVerdictModal === 'function') {
                        openVerdictModal(
                            "ЭВАКУАЦИЯ С ПАРКОВКИ ⚠️",
                            `Не хватило денег на оплату парковки! ${parkingResult.lostCars} авто отправлены в утиль.`,
                            false
                        );
                    } else {
                        showToast(`⚠️ ${parkingResult.lostCars} авто утилизированы с парковки!`, 'error');
                    }
                }, 4200);
            }
        }
    } catch (e) {
        console.warn('[Parking] Ошибка ежедневного списания:', e);
    }

    saveState();
    updateHeaderUI();

    if (typeof showToast === 'function') showToast("🌙 Наступил новый день!", 'info');
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
}

// ========================================================
// 8. HUD
// ========================================================
function updateHeaderUI() {
    let targetCash = state.player?.cash || 0;
    let targetStars = state.player?.stars || 0;
    let targetSuperSpinTickets = state.player?.superSpinTickets || 0;
    let fuel = state.player?.fuel !== undefined ? state.player.fuel : 100;
    let tck = state.player?.expressTickets || 0;
    let mTck = state.player?.maxExpressTickets || 25;
    let pName = state.player?.name || "Перекуп #777";
    let lvl = state.player?.level || 1;
    let conn = state.player?.connections || 0;
    let karma = Math.max(0, Math.min(100, state.player?.karma !== undefined ? state.player.karma : 50));

    animateNumberRoll('cashAmount', displayedCashValue, targetCash, 450, true);
    displayedCashValue = targetCash;

    animateNumberRoll('starsAmount', displayedStarsValue, targetStars, 350, false);
    displayedStarsValue = targetStars;

    setTxt('superSpinTicketsAmount', targetSuperSpinTickets);
    setTxt('fuelAmount', fuel);
    setTxt('ticketsAmount', tck + "/" + mTck);
    setTxt('playerName', pName);
    setTxt('playerLvl', "Ур. " + lvl);
    setTxt('connectionsText', conn);
    setTxt('karmaText', karma);

    const hunger = state.player?.hunger !== undefined ? state.player.hunger : 80;
    const mood = state.player?.mood !== undefined ? state.player.mood : 85;
    const hungerFill = document.getElementById('hungerFill');
    const moodFill = document.getElementById('moodFill');
    const hungerText = document.getElementById('hungerText');
    const moodText = document.getElementById('moodText');
    if (hungerFill) hungerFill.style.width = hunger + '%';
    if (moodFill) moodFill.style.width = mood + '%';
    if (hungerText) hungerText.innerText = hunger + '%';
    if (moodText) moodText.innerText = mood + '%';

    const pPhoto = document.getElementById('playerTgPhoto');
    const dIcon = document.getElementById('defaultAvatarIcon');
    if (state.player?.avatarUrl) {
        if (pPhoto) { pPhoto.src = state.player.avatarUrl; pPhoto.style.display = 'block'; }
        if (dIcon) dIcon.style.display = 'none';
    } else {
        if (pPhoto) pPhoto.style.display = 'none';
        if (dIcon) dIcon.style.display = 'block';
    }

    const fill = document.getElementById('xpBar');
    if (fill) {
        let xp = state.player?.xp || 0;
        let maxXp = state.player?.maxXp || 120;
        fill.style.width = Math.min(100, (xp / maxXp) * 100) + "%";
    }

    let gLen = state.garage ? state.garage.length : 0;
    let totalSlots = getTotalGarageSlots();
    let hasWorkshop = typeof checkPlayerCapability === 'function' ? checkPlayerCapability('tune') : false;
    setTxt('garageHeaderSlots', hasWorkshop ? `${gLen}/${totalSlots}` : `${gLen}/${totalSlots} ⛺`);

    if (window.ThemeManager) window.ThemeManager.applyTheme();
    if (typeof PhoneManager !== 'undefined') PhoneManager.updateUnreadBadge();
}

function updateLevelGatesUI() {
    let lvl = state.player?.level || 1;
    const gates = [
        { id: 'moto', lockId: 'lock-moto', minLvl: 5 },
        { id: 'atv', lockId: 'lock-atv', minLvl: 8 },
        { id: 'comfort', lockId: 'lock-comfort', minLvl: 15 },
        { id: 'premium', lockId: 'lock-premium', minLvl: 30 },
        { id: 'hyper', lockId: 'lock-hyper', minLvl: 50 },
        { id: 'truck', lockId: 'lock-truck', minLvl: 50 },
        { id: 'yacht', lockId: 'lock-yacht', minLvl: 100 }
    ];
    gates.forEach(g => {
        const btn = document.getElementById("catBtn-" + g.id);
        const sub = document.getElementById(g.lockId);
        if (btn && sub) {
            if (lvl >= g.minLvl) {
                btn.classList.remove('locked');
                sub.innerHTML = "Доступен";
                sub.style.color = "var(--green)";
            } else {
                btn.classList.add('locked');
                sub.innerHTML = "<i class='fa-solid fa-lock'></i> " + g.minLvl + " ур";
                sub.style.color = "#f87171";
            }
        }
    });
}

function addXp(amount) {
    state.player.xp += amount;
    if (state.player.xp >= state.player.maxXp) {
        state.player.xp -= state.player.maxXp;
        state.player.level += 1;
        state.player.maxXp = Math.round(state.player.maxXp * 1.35);
        openVerdictModal("Новый уровень!", "Вы достигли " + state.player.level + " уровня авторитета!", true);
    }
    updateLevelGatesUI();
    saveState();
}

function adjustResource(type, delta) {
    if (!state.player) return;
    if (type === 'cash') {
        state.player.cash = Math.max(0, (state.player.cash || 0) + delta);
        showToast((delta > 0 ? "+" : "") + delta.toLocaleString() + " ₽", delta > 0 ? 'success' : 'warning');
    } else if (type === 'level') {
        state.player.level = Math.max(1, Math.min(100, (state.player.level || 1) + delta));
        updateLevelGatesUI();
        showToast((delta > 0 ? "+" : "") + delta + " Ур", 'info');
    } else if (type === 'stars') {
        state.player.stars = Math.max(0, (state.player.stars || 0) + delta);
        showToast((delta > 0 ? "+" : "") + delta + " 💵 Банкнот", delta > 0 ? 'success' : 'warning');
    } else if (type === 'tickets') {
        let max = state.player.maxExpressTickets || 25;
        state.player.expressTickets = Math.max(0, Math.min(max, (state.player.expressTickets || 0) + delta));
        showToast((delta > 0 ? "+" : "") + delta + " Талонов 🎟️", 'info');
    } else if (type === 'connections') {
        state.player.connections = Math.max(0, (state.player.connections || 0) + delta);
        showToast((delta > 0 ? "+" : "") + delta + " Связей 🤝", 'info');
    }
    saveState();
    updateHeaderUI();
    renderProfileAnalytics();
}

function renderProfileAnalytics() {
    const container = document.getElementById('profileDashboardContainer');
    if (!container) return;

    let p = state.player || {};
    let s = p.stats || { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 };
    let lvl = p.level || 1;

    let totalCash = p.cash || 0;
    let safeCash = p.safeDeposit || 0;
    let depositsTotal = 0;
    if (Array.isArray(p.bankDeposits)) {
        p.bankDeposits.forEach(d => { depositsTotal += (d.currentAmount || d.principal || 0); });
    }

    let fleetValuation = 0;
    if (Array.isArray(state.garage)) {
        state.garage.forEach(c => { if (c) fleetValuation += (c.marketValue || c.basePrice || 100000); });
    }

    let realEstateValuation = 0;
    if (Array.isArray(p.ownedHouses) && typeof HOUSING_LIST !== 'undefined') {
        p.ownedHouses.forEach(hId => {
            let h = HOUSING_LIST.find(x => x.id === hId);
            if (h) realEstateValuation += (h.buyPrice || 0);
        });
    }

    let totalNetWorth = Math.round(totalCash + safeCash + depositsTotal + fleetValuation + realEstateValuation);
    let totalSales = (s.profitableSales || 0) + (s.lossSales || 0);
    let winrate = totalSales > 0 ? Math.round(((s.profitableSales || 0) / totalSales) * 100) : 0;
    let rankTitle = p.traderTitle || "Быстрый выкуп за кэш 💸";

    const isDev = window.isPcDevMode ? window.isPcDevMode() : false;
    const isOwner = _isOwner();
    let modeBadge = '';
    if (isOwner) {
        modeBadge = `<span class="owner-badge" style="font-size:8px; margin-left:4px;">👑 OWNER</span>`;
    } else if (isDev) {
        modeBadge = `<span class="tag-badge bg-tag-purple" style="font-size:8px; margin-left:4px;">DEV MODE</span>`;
    }

    const ownerPanelButton = isOwner ? `
        <div class="glass-card mb-3 p-2" style="background:linear-gradient(135deg, rgba(255,215,0,0.08), rgba(9,14,24,0.95)); border-color:rgba(255,215,0,0.5);">
            <button onclick="AccessControl.openOwnerPanel()" class="btn btn-amber w-full font-bold" style="font-size:11px;">
                👑 Открыть Owner-панель управления доступом
            </button>
            <div class="sub-label text-center mt-1" style="font-size:9px; color:#ffd700;">
                Инвайт-коды, список игроков, баны
            </div>
        </div>
    ` : '';

    container.innerHTML = `
        <div class="glass-card mb-3 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.18), #090e18); border-color: var(--cyan);">
            <div class="avatar-ring mb-2" style="margin: 0 auto; width: 62px; height: 62px;">
                <div class="avatar-glow"></div>
                <div class="avatar-fx-glow"></div>
                <div class="avatar" style="width: 54px; height: 54px; font-size: 22px;">
                    <i class="fa-solid fa-user-ninja"></i>
                </div>
            </div>
            <h3 class="font-bold text-xs" style="font-size:16px;">${p.name || 'Перекуп #777'}${modeBadge}</h3>
            <div class="sub-label mt-1 font-bold color-cyan">${rankTitle} (Уровень ${lvl})</div>
            <div class="sub-label mt-1 font-mono" style="font-size:9px; color:#64748b;">UID: ${p.uid || '—'}</div>

            <div class="flex-between mt-3 pt-2" style="border-top: 1px dashed rgba(255,255,255,0.08);">
                <button onclick="ThemeManager.openCustomizer()" class="btn btn-purple btn-sm btn-auto" style="font-size:10px;">
                    🎨 Скин & Эффекты
                </button>
                <button onclick="openPatchNotesModal()" class="btn btn-dark btn-sm btn-auto" style="font-size:10px;">
                    <i class="fa-solid fa-bolt color-amber"></i> Патчноут ${window.CURRENT_GAME_VERSION}
                </button>
            </div>
        </div>

        ${ownerPanelButton}

        <div class="glass-card mb-3 p-3" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.14), #090e18); border-color: var(--green);">
            <div class="flex-between mb-1">
                <div>
                    <span class="sub-label" style="font-size:9.5px;">Капитализация активов:</span>
                    <div class="price-val color-green" style="font-size:22px;">${totalNetWorth.toLocaleString()} ₽</div>
                </div>
                <span class="tag-badge bg-tag-green">NET WORTH</span>
            </div>
            <div class="grid-2 my-2 text-xs" style="gap:6px;">
                <div class="p-2" style="background:#090e18; border-radius:8px;">
                    <span class="sub-label" style="font-size:9px;">Кэш & Банк:</span>
                    <div class="font-bold color-cyan mt-1">${(totalCash + safeCash + depositsTotal).toLocaleString()} ₽</div>
                </div>
                <div class="p-2" style="background:#090e18; border-radius:8px;">
                    <span class="sub-label" style="font-size:9px;">Автопарк:</span>
                    <div class="font-bold color-amber mt-1">${fleetValuation.toLocaleString()} ₽</div>
                </div>
            </div>
        </div>

        <div class="glass-card mb-3 p-3">
            <b class="text-xs color-cyan block mb-2"><i class="fa-solid fa-chart-pie mr-1"></i> Бизнес-KPI:</b>
            <div class="grid-2 mb-2">
                <div class="stat-box">
                    <div class="sub-label" style="font-size:9px;">Чистый профит:</div>
                    <div class="stat-value color-green">${(s.totalNetProfit || 0).toLocaleString()} ₽</div>
                </div>
                <div class="stat-box">
                    <div class="sub-label" style="font-size:9px;">Винрейт сделок:</div>
                    <div class="stat-value color-amber">${winrate}%</div>
                </div>
            </div>
        </div>

        <div class="glass-card p-3" style="background:#090e18; border-color:var(--border-glass);">
            <div class="grid-2 mb-2">
                <button onclick="syncCloudStorageManual()" class="btn btn-cyan btn-sm" ${isDev ? 'disabled title="Недоступно в DEV"' : ''}>
                    <i class="fa-solid fa-rotate"></i> Синхронизация
                </button>
                <button onclick="openSaveManagerModal()" class="btn btn-dark btn-sm">
                    <i class="fa-solid fa-file-export"></i> Экспорт кода
                </button>
            </div>
            <button id="btnHardReset" onclick="resetGameData()" class="btn btn-danger btn-sm w-full">
                <i class="fa-solid fa-trash-can mr-1"></i> Сбросить прогресс
            </button>
        </div>
    `;
}

// ========================================================
// 9. CLOUD / SAVE MANAGER
// ========================================================
function syncCloudStorageManual() {
    if (isPcDevSession) {
        return showToast("DEV-режим: сохранение только локально", 'info');
    }
    saveState();
    showToast("Синхронизация с облаком Firestore запущена ✓", 'success');
    if (window.AudioFx) {
        window.AudioFx.play('win');
        window.AudioFx.haptic('success');
    }
}

function openSaveManagerModal() {
    const area = document.getElementById('saveExportArea');
    if (area) {
        try { area.value = btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
        catch(e) { area.value = JSON.stringify(state); }
    }
    ModalManager.open('modalSaveManager');
    if (window.AudioFx) window.AudioFx.play('tick');
}

function exportSaveCodeAction() {
    const area = document.getElementById('saveExportArea');
    if (!area || !area.value) return;
    navigator.clipboard.writeText(area.value).then(() => {
        showToast("Код сейва скопирован!", 'success');
        if (window.AudioFx) {
            window.AudioFx.haptic('success');
            window.AudioFx.play('win');
        }
    }).catch(() => {
        area.select();
        document.execCommand('copy');
        showToast("Код скопирован!", 'success');
    });
}

function importSaveCodeAction() {
    const area = document.getElementById('saveExportArea');
    if (!area || !area.value.trim()) return showToast("Вставьте код сохранения!", 'warning');
    try {
        let rawStr = area.value.trim();
        let jsonStr = "";
        try { jsonStr = decodeURIComponent(escape(atob(rawStr))); }
        catch(e) { jsonStr = rawStr; }

        const parsed = JSON.parse(jsonStr);
        if (!parsed.player) throw new Error();
        applyLoadedState(parsed);
        saveState();
        ModalManager.close('modalSaveManager');
        location.reload();
    } catch(err) {
        if (window.AudioFx) window.AudioFx.haptic('error');
        showToast("Некорректный код сейва!", 'error');
    }
}

// ========================================================
// 10. НАВИГАЦИЯ
// ========================================================
function switchTab(tabId) {
    if (window.AudioFx) {
        window.AudioFx.play('tick');
        window.AudioFx.haptic('light');
    }

    if (window.EventBus) {
        window.EventBus.emit('ui:tab_changed', { tabId });
    }

    const activeTab = document.querySelector('.tab-screen.active');
    if (tabId === 'tabPhone' && activeTab && activeTab.id === 'tabPhone') {
        if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.goHome === 'function') {
            PhoneManager.goHome();
        }
        return;
    }

    document.querySelectorAll('.tab-screen').forEach(el => el.classList.remove('active'));
    const tb = document.getElementById(tabId);
    if (tb) tb.classList.add('active');

    document.querySelectorAll('.b-nav-item').forEach(b => b.classList.remove('active'));

    const navBtn = document.getElementById('bnav-' + tabId);
    if (navBtn) navBtn.classList.add('active');
    else {
        const fallbackBtn = document.getElementById('bnav-tabMarket');
        if (fallbackBtn) fallbackBtn.classList.add('active');
    }

    try {
        if (tabId === 'tabMarket' && typeof renderMarketFeed === 'function') renderMarketFeed();
        if (tabId === 'tabGarage' && typeof renderGarage === 'function') renderGarage();
        if (tabId === 'tabSalesLot' && typeof renderSalesLot === 'function') renderSalesLot();
        if (tabId === 'tabPhone' && typeof PhoneManager !== 'undefined' && typeof PhoneManager.renderPhoneScreen === 'function') {
            PhoneManager.renderPhoneScreen();
        }
        if (tabId === 'tabProfile') renderProfileAnalytics();
        if (tabId === 'tabLife' && typeof renderLifeScreen === 'function') renderLifeScreen();
    } catch(err) {
        console.error("switchTab error:", err);
    }
}

// ========================================================
// 11. ЭКСПОРТ
// ========================================================
window.animateNumberRoll = animateNumberRoll;
window.showToast = showToast;
window.openVerdictModal = openVerdictModal;
window.openLevelGateModal = openLevelGateModal;
window.addXp = addXp;
window.adjustResource = adjustResource;
window.toggleGameLanguage = toggleGameLanguage;
window.setGameLanguage = setGameLanguage;
window.trackQuestProgress = trackQuestProgress;
window.refreshDailyQuestsList = refreshDailyQuestsList;
window.getTotalGarageSlots = getTotalGarageSlots;
window.getGarageSlotCost = getGarageSlotCost;
window.getExpressTicketUpgradeCost = getExpressTicketUpgradeCost;
window.getMarketRefreshCost = getMarketRefreshCost;
window.openSaveManagerModal = openSaveManagerModal;
window.exportSaveCodeAction = exportSaveCodeAction;
window.importSaveCodeAction = importSaveCodeAction;
window.syncCloudStorageManual = syncCloudStorageManual;
window.resetGameData = resetGameData;
window.renderProfileAnalytics = renderProfileAnalytics;
window.executeDayCycleMidnight = executeDayCycleMidnight;
window.updateHeaderUI = updateHeaderUI;
window.updateLevelGatesUI = updateLevelGatesUI;
window.switchTab = switchTab;
window.checkRealTimeDayChange = checkRealTimeDayChange;
window._updateDynamicStarRate = _updateDynamicStarRate;
window._syncStarRateToBank = _syncStarRateToBank;
window.logBankTransaction = logBankTransaction;

console.log('[💠 app-game.js v4.3.0] Циклы + Квесты + XP + Профиль + Роллеры ✓');
// ========================================================
// js/app/app-game.js — ИГРОВЫЕ ЦИКЛЫ, КВЕСТЫ, РОЛЛЕРЫ (v5.4.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v5.4.0 (БЕСКОНЕЧНЫЙ ТАКТИЛЬНЫЙ HUD 360° + ЗОЛОТОЙ УРОВЕНЬ):
//   1. Бесконечная бесшовная карусель плашек статов без застреваний и упоров.
//   2. Мягкий и плавный свайп пальцем с инерцией и виброоткликом в Telegram.
//   3. Яркая неоновая золотая плашка уровня с короной (stat-pill-level).
//   4. Автосворачивание категорий рынка при скролле вниз и открытие вверху.
//   5. Восстановлен ежедневный бонус: календарь на 7 дней и claimDailyReward().
//   6. Полная сохранность циклов налогов ФССП, пени +5%/д, аукционов за 50%,
//      сложных процентов по депозитам, квестов и сейвов без сокращений.
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
    if (!window.state.player) window.state.player = {};
    if (!Array.isArray(window.state.player.bankHistory)) window.state.player.bankHistory = [];

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    window.state.player.bankHistory.unshift({
        id: "tx_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
        title: title || "Банковская операция",
        amount: Math.round(Number(amount) || 0),
        isIncome: !!isIncome,
        time: timeStr
    });

    if (window.state.player.bankHistory.length > 35) {
        window.state.player.bankHistory = window.state.player.bankHistory.slice(0, 35);
    }
}

// Универсальные модальные хелперы
function openModal(id) {
    if (typeof ModalManager !== 'undefined' && typeof ModalManager.open === 'function') {
        ModalManager.open(id);
    } else {
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    }
}

function closeModal(id) {
    if (typeof ModalManager !== 'undefined' && typeof ModalManager.close === 'function') {
        ModalManager.close(id);
    } else {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    }
}

// ========================================================
// 2. ЕЖЕДНЕВНЫЙ БОНУС (КАЛЕНДАРЬ НАГРАД)
// ========================================================
const DEFAULT_DAILY_CALENDAR = [
    { day: 1, title: "День 1", icon: "💰", rewardText: "35,000 ₽", subText: "+25 XP", cash: 35000, xp: 25 },
    { day: 2, title: "День 2", icon: "⛽", rewardText: "50,000 ₽", subText: "+35 ⛽ Топливо", cash: 50000, fuel: 35, xp: 35 },
    { day: 3, title: "День 3", icon: "🎟️", rewardText: "65,000 ₽", subText: "+5 🎟️ Талонов", cash: 65000, tickets: 5, xp: 45 },
    { day: 4, title: "День 4", icon: "💵", rewardText: "80,000 ₽", subText: "+5 ⭐ Stars", cash: 80000, stars: 5, xp: 55 },
    { day: 5, title: "День 5", icon: "🤝", rewardText: "100,000 ₽", subText: "+1 🤝 Связь МРЭО", cash: 100000, connections: 1, xp: 65 },
    { day: 6, title: "День 6", icon: "🛠️", rewardText: "140,000 ₽", subText: "+10 ⭐ Stars", cash: 140000, stars: 10, xp: 80 },
    { day: 7, title: "День 7", icon: "🎰", rewardText: "250,000 ₽", subText: "1 🎟️ ВИЛСПИН + 15 ⭐", cash: 250000, superSpinTickets: 1, stars: 15, xp: 120 }
];

function getDailyRewardsList() {
    if (typeof DAILY_REWARDS_CONFIG !== 'undefined' && Array.isArray(DAILY_REWARDS_CONFIG) && DAILY_REWARDS_CONFIG.length > 0) {
        return DAILY_REWARDS_CONFIG;
    }
    if (typeof DAILY_REWARDS !== 'undefined' && Array.isArray(DAILY_REWARDS) && DAILY_REWARDS.length > 0) {
        return DAILY_REWARDS;
    }
    return DEFAULT_DAILY_CALENDAR;
}

function getDailyBonusState() {
    if (!window.state.player) window.state.player = {};
    const curDay = window.state.player.day || 1;
    const lastClaimDay = window.state.player.lastDailyBonusDay || 0;
    const canClaim = lastClaimDay < curDay;

    let streak = window.state.player.dailyBonusStreak;
    if (typeof streak !== 'number' || isNaN(streak) || streak < 0) {
        streak = window.state.player.streakDay || 0;
    }
    streak = streak % 7;

    return { curDay, lastClaimDay, canClaim, streak };
}

function openDailyBonusModal() {
    renderDailyBonusGrid();
    openModal('modalDailyBonus');
    if (window.AudioFx) {
        window.AudioFx.play('tick');
        window.AudioFx.haptic('light');
    }
}

function renderDailyBonusGrid() {
    const box = document.getElementById('dailyBonusGrid');
    if (!box) return;

    const { canClaim, streak } = getDailyBonusState();
    const rewards = getDailyRewardsList();

    let html = `<div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px;">`;

    rewards.forEach((item, idx) => {
        const dayNum = idx + 1;
        const isCurrent = (idx === streak);
        const isClaimed = idx < streak || (isCurrent && !canClaim);
        const isDay7 = (idx === 6);

        let cardBg = "background:#090e18; border:1px solid rgba(255,255,255,0.08);";
        let statusBadge = "";
        let badgeColor = "var(--cyan)";

        if (isClaimed) {
            cardBg = "background:rgba(0, 230, 118, 0.08); border:1px solid rgba(0, 230, 118, 0.4); opacity:0.75;";
            statusBadge = `<div style="position:absolute; top:3px; right:5px; font-size:10px; color:var(--green); font-weight:bold;">✓</div>`;
        } else if (isCurrent && canClaim) {
            cardBg = "background:radial-gradient(circle, rgba(255,215,0,0.18), #090e18); border:1.5px solid #ffd700; box-shadow:0 0 12px rgba(255,215,0,0.35);";
            badgeColor = "#ffd700";
            statusBadge = `<div style="position:absolute; top:3px; right:5px; font-size:8px; color:#ffd700; font-weight:bold;">ГОТОВО</div>`;
        }

        const gridCol = isDay7 ? 'grid-column: span 2;' : '';
        const icon = item.icon || (isDay7 ? '🎰' : '🎁');
        const textVal = item.rewardText || item.title || (item.cash ? `${item.cash.toLocaleString()} ₽` : 'Бонус');

        html += `
            <div style="${cardBg} ${gridCol} border-radius:10px; padding:8px 4px; text-align:center; position:relative;">
                ${statusBadge}
                <div class="sub-label font-bold" style="font-size:8.5px; color:${badgeColor}; text-transform:uppercase;">День ${dayNum}</div>
                <div style="font-size:24px; margin:2px 0;">${icon}</div>
                <b class="text-xs color-green block" style="font-size:10px; line-height:1.2;">${textVal}</b>
                ${item.subText ? `<div class="sub-label" style="font-size:8px; color:#94a3b8; margin-top:2px;">${item.subText}</div>` : ''}
            </div>
        `;
    });

    html += `</div>`;
    box.innerHTML = html;

    const btn = document.getElementById('btnClaimDaily');
    if (btn) {
        if (canClaim) {
            btn.className = "btn btn-green w-full font-bold mb-2";
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
            btn.innerHTML = `<i class="fa-solid fa-gift mr-1"></i> Забрать награду (${rewards[streak]?.rewardText || 'Бонус'})!`;
        } else {
            btn.className = "btn btn-dark w-full font-bold mb-2";
            btn.disabled = true;
            btn.style.opacity = "0.55";
            btn.style.cursor = "not-allowed";
            btn.innerHTML = `✓ Награда за сегодня уже получена (Ждите 00:00)`;
        }
    }
}

function claimDailyReward() {
    const { canClaim, streak, curDay } = getDailyBonusState();
    if (!canClaim) {
        showToast("Вы уже забрали подарок сегодня! Следующий будет доступен завтра.", "warning");
        return;
    }

    const rewards = getDailyRewardsList();
    const r = rewards[streak] || rewards[0];
    let tokens = [];

    const cashVal = r.cash || r.amount || 0;
    if (cashVal > 0) {
        window.state.player.cash = (window.state.player.cash || 0) + cashVal;
        logBankTransaction(`Ежедневный подарок: День ${streak + 1}`, cashVal, true);
        tokens.push({ icon: '💰', title: 'Денежные средства', value: `+${cashVal.toLocaleString()} ₽`, rarity: 'token-green' });
    }

    if (r.stars && r.stars > 0) {
        window.state.player.stars = (window.state.player.stars || 0) + r.stars;
        tokens.push({ icon: '💵', title: 'Неоновые банкноты', value: `+${r.stars} ⭐`, rarity: 'token-amber' });
    }

    if (r.fuel && r.fuel > 0) {
        window.state.player.fuel = Math.min(100, (window.state.player.fuel || 0) + r.fuel);
        tokens.push({ icon: '⛽', title: 'Топливо в бак', value: `+${r.fuel} ⛽`, rarity: 'token-cyan' });
    }

    if (r.tickets && r.tickets > 0) {
        const maxTck = window.state.player.maxExpressTickets || 25;
        window.state.player.expressTickets = Math.min(maxTck, (window.state.player.expressTickets || 0) + r.tickets);
        tokens.push({ icon: '🎟️', title: 'Экспресс-пропуска', value: `+${r.tickets} 🎟️`, rarity: 'token-purple' });
    }

    if (r.connections && r.connections > 0) {
        window.state.player.connections = (window.state.player.connections || 0) + r.connections;
        tokens.push({ icon: '🤝', title: 'Связи в МРЭО', value: `+${r.connections} 🤝`, rarity: 'token-purple' });
    }

    if (r.superSpinTickets && r.superSpinTickets > 0) {
        window.state.player.superSpinTickets = (window.state.player.superSpinTickets || 0) + r.superSpinTickets;
        tokens.push({ icon: '🎰', title: 'Билет Вилспина', value: `+${r.superSpinTickets} 🎟️`, rarity: 'token-amber' });
    }

    if (r.xp && r.xp > 0) {
        addXp(r.xp);
        tokens.push({ icon: '🎖️', title: 'Опыт авторитета', value: `+${r.xp} XP`, rarity: 'token-cyan' });
    }

    window.state.player.lastDailyBonusDay = curDay;
    window.state.player.dailyBonusStreak = (streak + 1) % 7;
    window.state.player.streakDay = window.state.player.dailyBonusStreak;

    if (typeof saveState === 'function') saveState();
    updateHeaderUI();

    if (window.AudioFx) {
        window.AudioFx.play('win');
        window.AudioFx.haptic('success');
    }

    renderDailyBonusGrid();

    openVerdictModal(
        `ЕЖЕДНЕВНЫЙ БОНУС (ДЕНЬ ${streak + 1})! 🎁`,
        `Поздравляем! Награда за день ${streak + 1} успешно зачислена на ваш аккаунт!\nВозвращайтесь завтра за следующим бонусом.`,
        true,
        cashVal > 0 ? cashVal : null,
        null,
        tokens
    );
}

// ========================================================
// 3. ВЕРДИКТ-МОДАЛКА
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

    let curLvl = window.state.player?.level || 1;
    let curXp = window.state.player?.xp || 0;
    let maxXp = window.state.player?.maxXp || 120;
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
                <button onclick="closeModal('modalLevelGate'); switchTab('tabMarket');" class="btn btn-cyan btn-sm w-full font-bold">
                    <i class="fa-solid fa-store mr-1"></i> На авторынок (Качать опыт)
                </button>
                <button onclick="closeModal('modalLevelGate')" class="btn btn-dark btn-sm w-full">
                    Понятно
                </button>
            </div>
        </div>
    `;

    openModal('modalLevelGate');
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

    openModal('modalDealVerdict');
}

function openPatchNotesModal() {
    if (typeof openPatchnotesModal === 'function') {
        openPatchnotesModal();
    } else {
        openModal('modalPatchNotes');
    }
    if (window.AudioFx) window.AudioFx.play('tick');
}

function dismissPatchNotesModal() {
    closeModal('modalPatchNotes');
    try {
        localStorage.setItem('perekup_last_seen_version', window.CURRENT_GAME_VERSION || '4.4.0');
    } catch(e) {}
}

// ========================================================
// 4. ЯЗЫК
// ========================================================
function toggleGameLanguage() {
    setGameLanguage(window.state.lang === 'ru' ? 'en' : 'ru');
}

function setGameLanguage(lang) {
    window.state.lang = lang;
    applyLanguageToDOM();
    if (typeof saveState === 'function') saveState();
    if (window.AudioFx) {
        window.AudioFx.play('tick');
        window.AudioFx.haptic('light');
    }
    showToast(lang === 'ru' ? "Язык: Русский 🇷🇺" : "Language: English 🇬🇧", 'info');
}

function applyLanguageToDOM() {
    const lang = window.state.lang || 'ru';
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
// 5. ЗАДАНИЯ И ВЕХИ
// ========================================================
function trackQuestProgress(actionType, count = 1) {
    if (!window.state.player || !Array.isArray(window.state.player.dailyQuests)) return;
    let questsUpdated = false;

    window.state.player.dailyQuests.forEach(q => {
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
        if (typeof saveState === 'function') saveState();
        if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.renderDailyQuestsWidget === 'function') {
            PhoneManager.renderDailyQuestsWidget();
        }
    }

    checkNotepadMilestones();
}

function checkNotepadMilestones() {
    const s = window.state.player?.stats || {};
    const netProfit = s.totalNetProfit || 0;
    const sold = s.sold || 0;

    if (netProfit >= 1000000 && !window.state.player.milestoneMilClaimed) {
        window.state.player.milestoneMilClaimed = true;
        showToast("🏆 Веха: Первый 1,000,000 ₽ чистой прибыли!", 'success');
        if (window.AudioFx) window.AudioFx.play('win');
    }
    if (sold >= 10 && !window.state.player.milestoneSalesClaimed) {
        window.state.player.milestoneSalesClaimed = true;
        showToast("🏆 Веха: Закрыто 10 успешных продаж!", 'success');
        if (window.AudioFx) window.AudioFx.play('win');
    }
}

function refreshDailyQuestsList() {
    window.state.player.dailyQuestsSuperClaimed = false;
    if (typeof DAILY_QUESTS_POOL === 'undefined' || !Array.isArray(DAILY_QUESTS_POOL)) {
        window.state.player.dailyQuests = [
            { id: "q_inspect", text: "Осмотреть толщиномером 2 авто", cur: 0, max: 2, actionType: "gauge_check", reward: 40000, rewardXp: 40, done: false },
            { id: "q_race", text: "Выиграть заезд 402м", cur: 0, max: 1, actionType: "win_drag", reward: 60000, rewardXp: 45, done: false },
            { id: "q_biz", text: "Собрать кассу с предприятий", cur: 0, max: 1, actionType: "collect_biz", reward: 30000, rewardXp: 30, done: false }
        ];
        return;
    }

    const shuffled = [...DAILY_QUESTS_POOL].sort(() => 0.5 - Math.random());
    window.state.player.dailyQuests = shuffled.slice(0, 3).map(q => ({
        id: q.id, text: q.text, cur: 0, max: q.target || 1,
        actionType: q.actionType, reward: q.reward, rewardXp: q.rewardXp || 35, done: false
    }));
}

// ========================================================
// 6. СЛОТЫ ГАРАЖА И РЕСУРСЫ
// ========================================================
function getMarketRefreshCost() {
    let lvl = window.state.player?.level || 1;
    return 250 + (lvl * 450);
}

function getGarageSlotCost() {
    let bs = window.state.player?.baseSlots || 2;
    let extraSlots = Math.max(0, bs - 2);
    return Math.round(300000 * Math.pow(1.65, extraSlots));
}

function getExpressTicketUpgradeCost() {
    let m = window.state.player?.maxExpressTickets || 25;
    let extra = Math.max(0, m - 25);
    const steps = Math.floor(extra / 25);
    return Math.round(75000 * Math.pow(1.5, steps));
}

function getTotalGarageSlots() {
    let slots = window.state.player?.baseSlots || 2;
    if (typeof HOUSING_LIST !== 'undefined' && Array.isArray(HOUSING_LIST)) {
        const activeHousingId = window.state.player?.housingId;
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
// 7. КУРС STARS И ДЕПОЗИТЫ
// ========================================================
function _updateDynamicStarRate() {
    if (!window.state.player) return;

    const prev = window.state.player.dynamicStarRate || 2500;
    const drift = (Math.random() - 0.5) * 0.01;
    let next = Math.round(prev * (1 + drift));

    next = Math.max(2200, Math.min(3200, next));
    next = Math.round(next / 100) * 100;

    window.state.player.dynamicStarRate = next;

    if (!Array.isArray(window.state.player.dynamicStarRateHistory)) {
        window.state.player.dynamicStarRateHistory = [];
    }
    window.state.player.dynamicStarRateHistory.push(next);
    if (window.state.player.dynamicStarRateHistory.length > 30) {
        window.state.player.dynamicStarRateHistory = window.state.player.dynamicStarRateHistory.slice(-30);
    }
}

function _syncStarRateToBank() {
    if (!window.state.player) return;
    const rate = window.state.player.dynamicStarRate || 2500;
    if (window.BANK_EXCHANGE_RATES && window.BANK_EXCHANGE_RATES.stars) {
        window.BANK_EXCHANGE_RATES.stars.buyRub = rate;
        window.BANK_EXCHANGE_RATES.stars.sellRub = Math.round(rate * 0.96);
    }
}

function _safeNumDeposit(val, fallback = 0) {
    if (typeof window.GameHelpers?.safeNum === 'function') {
        return window.GameHelpers.safeNum(val, fallback);
    }
    const n = Number(val);
    return isNaN(n) || !isFinite(n) ? fallback : n;
}

// ========================================================
// 8. СУТОЧНЫЙ ЦИКЛ, НАЛОГИ И АУКЦИОН ФССП
// ========================================================
function checkRealTimeDayChange() {
    const now = new Date();
    const lastDate = new Date(window.state.player.lastRealDayTimestamp || Date.now());

    const isDifferentDay = (
        now.getFullYear() !== lastDate.getFullYear() ||
        now.getMonth() !== lastDate.getMonth() ||
        now.getDate() !== lastDate.getDate()
    );

    if (isDifferentDay) executeDayCycleMidnight(now);
}

function executeDayCycleMidnight(currentDateObj) {
    try {
        const curDay = (window.state.player.day || 1) + 1;
        window.state.player.day = curDay;
        window.state.player.lastRealDayTimestamp = currentDateObj.getTime();
        window.state.player.expressTickets = window.state.player.maxExpressTickets || 25;
        window.state.player.consecutiveRaces = 0;

        _updateDynamicStarRate();
        _syncStarRateToBank();

        // НАЛОГОВЫЙ ЦИКЛ, ПЕНИ И АУКЦИОН ФССП
        if (!window.state.player.taxDueDay) {
            window.state.player.taxDueDay = curDay + 7;
        }

        if (curDay >= window.state.player.taxDueDay && (!window.state.player.taxDebt || window.state.player.taxDebt <= 0)) {
            let powerTax = 0;
            if (Array.isArray(window.state.garage)) {
                window.state.garage.forEach(c => {
                    let p = Number(c.power) || 100;
                    if (p > 250) {
                        powerTax += (p - 250) * 150;
                    }
                });
            }
            if (powerTax > 0) {
                window.state.player.taxDebt = powerTax;
                window.state.player.taxDueDay = curDay + 7;
                window.state.player.taxPenalty = 0;
                window.state.player.taxOverdueDays = 0;
                window.state.player.taxArrest = false;
                setTimeout(() => {
                    showToast(`🏛️ Начислен транспортный налог ФНС: ${powerTax.toLocaleString()} ₽ (Срок: 7 дн.)`, 'warning');
                }, 2500);
            }
        }

        if (window.state.player.taxDebt > 0 && curDay > window.state.player.taxDueDay) {
            window.state.player.taxOverdueDays = (window.state.player.taxOverdueDays || 0) + 1;
            const overdue = window.state.player.taxOverdueDays;

            const dailyPenalty = Math.round(window.state.player.taxDebt * 0.05);
            window.state.player.taxPenalty = (window.state.player.taxPenalty || 0) + dailyPenalty;

            if (overdue >= 3 && !window.state.player.taxArrest) {
                window.state.player.taxArrest = true;
                setTimeout(() => {
                    openVerdictModal(
                        "НАЛОЖЕН АРЕСТ ФССП / ГИБДД! 🚨",
                        `Задолженность по налогам просрочена на ${overdue} дней!\nФССП наложила запрет на регистрационные действия.\nПродажа авто и постановка на коммерческий учёт заблокированы!`,
                        false
                    );
                }, 3000);
            }

            if (overdue >= 7) {
                const totalDebt = (window.state.player.taxDebt || 0) + (window.state.player.taxPenalty || 0);

                if ((window.state.player.cash || 0) >= totalDebt) {
                    window.state.player.cash -= totalDebt;
                    window.state.player.taxDebt = 0;
                    window.state.player.taxPenalty = 0;
                    window.state.player.taxOverdueDays = 0;
                    window.state.player.taxArrest = false;
                    window.state.player.taxDueDay = curDay + 7;
                    logBankTransaction("Принудительное списание задолженности приставами ФССП", totalDebt, false);
                    setTimeout(() => {
                        showToast(`⚖️ Приставы списали налоговый долг: -${totalDebt.toLocaleString()} ₽`, 'warning');
                    }, 3500);
                } else if (Array.isArray(window.state.garage) && window.state.garage.length > 0) {
                    let carIdx = window.state.garage.findIndex(c => !c.assignedBusinessId);
                    if (carIdx === -1) carIdx = 0;

                    const confiscatedCar = window.state.garage.splice(carIdx, 1)[0];
                    const marketVal = Number(confiscatedCar.marketValue || confiscatedCar.basePrice || 300000);
                    const bailiffAuctionPrice = Math.round(marketVal * 0.50);
                    const remainingAfterDebt = bailiffAuctionPrice - totalDebt;

                    window.state.player.taxDebt = 0;
                    window.state.player.taxPenalty = 0;
                    window.state.player.taxOverdueDays = 0;
                    window.state.player.taxArrest = false;
                    window.state.player.taxDueDay = curDay + 7;

                    if (remainingAfterDebt > 0) {
                        window.state.player.cash = (window.state.player.cash || 0) + remainingAfterDebt;
                        logBankTransaction(`Возврат остатка после аукциона ФССП (${confiscatedCar.name})`, remainingAfterDebt, true);
                    }

                    setTimeout(() => {
                        openVerdictModal(
                            "АВТОМОБИЛЬ ПРОДАН ПРИСТАВАМИ! ⚖️",
                            `В связи с просрочкой налогов на ${overdue} дней авто «<b>${confiscatedCar.name}</b>» реализовано на торгах за 50% цены (${bailiffAuctionPrice.toLocaleString()} ₽) в счёт долга (${totalDebt.toLocaleString()} ₽).\n${remainingAfterDebt > 0 ? `Остаток (+${remainingAfterDebt.toLocaleString()} ₽) возвращён на счёт.` : ''}\nАрест снят.`,
                            false,
                            remainingAfterDebt > 0 ? remainingAfterDebt : 0
                        );
                    }, 4000);
                }
            }
        }

        if (window.state.player.loanDebt > 0) {
            window.state.player.loanDebt = Math.round(window.state.player.loanDebt * 1.02);
        }

        if (Array.isArray(window.state.player.bankDeposits)) {
            const validDeposits = [];
            window.state.player.bankDeposits.forEach((dep, idx) => {
                try {
                    if (!dep || typeof dep !== 'object') return;
                    const currentAmount = _safeNumDeposit(dep.currentAmount, 0);
                    const dailyPercent = _safeNumDeposit(dep.dailyPercent, 0.3);
                    const accumulatedProfit = _safeNumDeposit(dep.accumulatedProfit, 0);
                    const daysPassed = _safeNumDeposit(dep.daysPassed, 0);

                    if (currentAmount <= 0) {
                        dep.currentAmount = 0;
                        dep.dailyPercent = dailyPercent;
                        dep.accumulatedProfit = accumulatedProfit;
                        dep.daysPassed = daysPassed + 1;
                        validDeposits.push(dep);
                        return;
                    }

                    dep.daysPassed = daysPassed + 1;
                    dep.dailyPercent = dailyPercent;
                    dep.currentAmount = currentAmount;

                    const effectiveDailyPercent = dailyPercent / 100;
                    const gain = Math.round(currentAmount * effectiveDailyPercent);

                    if (isNaN(gain) || !isFinite(gain)) {
                        dep.accumulatedProfit = accumulatedProfit;
                        validDeposits.push(dep);
                        return;
                    }

                    if (dep.autoCompound) {
                        dep.currentAmount = currentAmount + gain;
                        dep.accumulatedProfit = accumulatedProfit;
                    } else {
                        dep.accumulatedProfit = accumulatedProfit + gain;
                    }

                    validDeposits.push(dep);
                } catch (depErr) {
                    console.warn(`[DayCycle] Ошибка депозита #${idx}:`, depErr);
                }
            });
            window.state.player.bankDeposits = validDeposits;
        }

        window.state.player.hunger = Math.max(10, (window.state.player.hunger || 80) - 25);
        window.state.player.mood = Math.max(10, (window.state.player.mood || 85) - 15);

        if (typeof refreshDailyQuestsList === 'function') refreshDailyQuestsList();

        try {
            if (window.PhoneBusiness && typeof window.PhoneBusiness.onNewDay === 'function') {
                window.PhoneBusiness.onNewDay();
            }
        } catch (e) {}

        if (typeof saveState === 'function') saveState();
        updateHeaderUI();

        if (typeof showToast === 'function') showToast("🌙 Наступил новый день! Ежедневный подарок обновлен 🎁", 'info');
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
    } catch (err) {
        console.error('[DayCycle] Ошибка смены дня:', err);
    }
}

// ========================================================
// 9. HUD И ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
// ========================================================
function updateHeaderUI() {
    try {
        let targetCash = window.state.player?.cash || 0;
        let targetStars = window.state.player?.stars || 0;
        let targetSuperSpinTickets = window.state.player?.superSpinTickets || 0;
        let fuel = window.state.player?.fuel !== undefined ? window.state.player.fuel : 100;
        let tck = window.state.player?.expressTickets || 0;
        let mTck = window.state.player?.maxExpressTickets || 25;
        let pName = window.state.player?.name || "Перекуп #777";
        let lvl = window.state.player?.level || 1;
        let conn = window.state.player?.connections || 0;
        let karma = Math.max(0, Math.min(100, window.state.player?.karma !== undefined ? window.state.player.karma : 50));

        animateNumberRoll('cashAmount', displayedCashValue, targetCash, 450, true);
        displayedCashValue = targetCash;

        animateNumberRoll('starsAmount', displayedStarsValue, targetStars, 350, false);
        displayedStarsValue = targetStars;

        setTxt('superSpinTicketsAmount', targetSuperSpinTickets);
        setTxt('fuelAmount', fuel);
        setTxt('ticketsAmount', tck + "/" + mTck);
        setTxt('playerName', pName);
        
        // ⭐ ЯРКАЯ ЗОЛОТАЯ ИКОНКА УРОВНЯ
        const lvlBtn = document.querySelector('.stat-pill.stat-pill-level');
        if (lvlBtn) {
            lvlBtn.innerHTML = `<i class="fa-solid fa-crown" style="color:#ffe600; filter:drop-shadow(0 0 6px #ffd700); margin-right:4px;"></i> <span id="playerLvl" style="font-weight:900; color:#ffd700;">Ур. ${lvl}</span>`;
            lvlBtn.style.background = "linear-gradient(135deg, rgba(255, 215, 0, 0.28), rgba(255, 140, 0, 0.16))";
            lvlBtn.style.border = "1.5px solid #ffd700";
            lvlBtn.style.boxShadow = "0 0 12px rgba(255, 215, 0, 0.55), inset 0 0 6px rgba(255, 215, 0, 0.25)";
            lvlBtn.style.color = "#ffd700";
        } else {
            setTxt('playerLvl', "Ур. " + lvl);
        }

        setTxt('connectionsText', conn);
        setTxt('karmaText', karma);

        const hunger = window.state.player?.hunger !== undefined ? window.state.player.hunger : 80;
        const mood = window.state.player?.mood !== undefined ? window.state.player.mood : 85;
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
        if (window.state.player?.avatarUrl) {
            if (pPhoto) { pPhoto.src = window.state.player.avatarUrl; pPhoto.style.display = 'block'; }
            if (dIcon) dIcon.style.display = 'none';
        } else {
            if (pPhoto) pPhoto.style.display = 'none';
            if (dIcon) dIcon.style.display = 'block';
        }

        const fill = document.getElementById('xpBar');
        if (fill) {
            let xp = window.state.player?.xp || 0;
            let maxXp = window.state.player?.maxXp || 120;
            fill.style.width = Math.min(100, (xp / maxXp) * 100) + "%";
        }

        let gLen = window.state.garage ? window.state.garage.length : 0;
        let totalSlots = getTotalGarageSlots();
        let hasWorkshop = typeof checkPlayerCapability === 'function' ? checkPlayerCapability('tune') : false;
        setTxt('garageHeaderSlots', hasWorkshop ? `${gLen}/${totalSlots}` : `${gLen}/${totalSlots} ⛺`);

        // Неоновая подсветка кнопки «Бонус», если подарок доступен
        const bonusBtn = document.querySelector('.hud-btn.btn-bonus');
        if (bonusBtn) {
            const { canClaim } = getDailyBonusState();
            if (canClaim) {
                bonusBtn.style.borderColor = "#ffd700";
                bonusBtn.style.boxShadow = "0 0 12px rgba(255, 215, 0, 0.55)";
            } else {
                bonusBtn.style.borderColor = "";
                bonusBtn.style.boxShadow = "";
            }
        }

        if (window.ThemeManager) window.ThemeManager.applyTheme();
        if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.updateUnreadBadge === 'function') PhoneManager.updateUnreadBadge();
    } catch (e) {
        console.warn('[HUD] Ошибка обновления:', e);
    }
}

function updateLevelGatesUI() {
    let lvl = window.state.player?.level || 1;
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
    if (!window.state.player) return;
    amount = Math.max(0, Number(amount) || 0);
    window.state.player.xp = (window.state.player.xp || 0) + amount;

    let maxXp = window.state.player.maxXp || 120;
    while (window.state.player.xp >= maxXp) {
        window.state.player.xp -= maxXp;
        window.state.player.level = (window.state.player.level || 1) + 1;
        window.state.player.maxXp = Math.round(maxXp * 1.40 + 35);
        maxXp = window.state.player.maxXp;

        openVerdictModal(
            "НОВЫЙ УРОВЕНЬ АВТОРИТЕТА! 🎖️",
            `Поздравляем! Вы достигли <b>${window.state.player.level} уровня</b> авторитета!\nОткрыты новые возможности и классы авто на авторынке.`,
            true
        );
    }

    updateLevelGatesUI();
    updateHeaderUI();
    if (typeof saveState === 'function') saveState();
}

function adjustResource(type, delta) {
    if (!window.state.player) return;
    if (type === 'cash') {
        window.state.player.cash = Math.max(0, (window.state.player.cash || 0) + delta);
        showToast((delta > 0 ? "+" : "") + delta.toLocaleString() + " ₽", delta > 0 ? 'success' : 'warning');
    } else if (type === 'level') {
        window.state.player.level = Math.max(1, Math.min(100, (window.state.player.level || 1) + delta));
        updateLevelGatesUI();
        showToast((delta > 0 ? "+" : "") + delta + " Ур", 'info');
    } else if (type === 'stars') {
        window.state.player.stars = Math.max(0, (window.state.player.stars || 0) + delta);
        showToast((delta > 0 ? "+" : "") + delta + " 💵 Банкнот", delta > 0 ? 'success' : 'warning');
    } else if (type === 'tickets') {
        let max = window.state.player.maxExpressTickets || 25;
        window.state.player.expressTickets = Math.max(0, Math.min(max, (window.state.player.expressTickets || 0) + delta));
        showToast((delta > 0 ? "+" : "") + delta + " Талонов 🎟️", 'info');
    } else if (type === 'connections') {
        window.state.player.connections = Math.max(0, (window.state.player.connections || 0) + delta);
        showToast((delta > 0 ? "+" : "") + delta + " Связей 🤝", 'info');
    }
    if (typeof saveState === 'function') saveState();
    updateHeaderUI();
    if (typeof renderProfileAnalytics === 'function') renderProfileAnalytics();
}

function renderProfileAnalytics() {
    const container = document.getElementById('profileDashboardContainer');
    if (!container) return;

    try {
        let p = window.state.player || {};
        let s = p.stats || { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0 };
        let lvl = p.level || 1;

        let totalCash = p.cash || 0;
        let safeCash = p.safeDeposit || 0;
        let depositsTotal = 0;
        if (Array.isArray(p.bankDeposits)) {
            p.bankDeposits.forEach(d => {
                if (d) depositsTotal += _safeNumDeposit(d.currentAmount, 0);
            });
        }

        let fleetValuation = 0;
        if (Array.isArray(window.state.garage)) {
            window.state.garage.forEach(c => { if (c) fleetValuation += (c.marketValue || c.basePrice || 100000); });
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
        const isOwner = typeof _isOwner === 'function' ? _isOwner() : false;
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
                        <i class="fa-solid fa-bolt color-amber"></i> Патчноут ${window.CURRENT_GAME_VERSION || 'v4.4.0'}
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
    } catch (e) {
        console.warn('[Profile] Ошибка рендера:', e);
    }
}

// ========================================================
// 10. CLOUD / SAVE MANAGER / RESET
// ========================================================
function resetGameData() {
    if (!confirm("⚠️ Вы уверены, что хотите сбросить весь прогресс перекупа? Это действие необратимо!")) return;
    try {
        localStorage.clear();
        sessionStorage.clear();
        location.reload();
    } catch(e) {
        location.reload();
    }
}

function syncCloudStorageManual() {
    if (window.isPcDevMode && window.isPcDevMode()) {
        return showToast("DEV-режим: сохранение только локально", 'info');
    }
    if (typeof saveState === 'function') saveState();
    showToast("Синхронизация с облаком Firestore запущена ✓", 'success');
    if (window.AudioFx) {
        window.AudioFx.play('win');
        window.AudioFx.haptic('success');
    }
}

function openSaveManagerModal() {
    const area = document.getElementById('saveExportArea');
    if (area) {
        try { area.value = btoa(unescape(encodeURIComponent(JSON.stringify(window.state)))); }
        catch(e) { area.value = JSON.stringify(window.state); }
    }
    openModal('modalSaveManager');
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
        if (typeof applyLoadedState === 'function') applyLoadedState(parsed);
        if (typeof saveState === 'function') saveState();
        closeModal('modalSaveManager');
        location.reload();
    } catch(err) {
        if (window.AudioFx) window.AudioFx.haptic('error');
        showToast("Некорректный код сейва!", 'error');
    }
}

// ========================================================
// 11. НАВИГАЦИЯ С КОНТРОЛЕМ ДОСТУПА ПО УРОВНЯМ
// ========================================================
function switchTab(tabId) {
    const tabFeatureMap = {
        'tabBarn': 'barn',
        'tabContainers': 'containers',
        'tabStreet': 'street',
        'tabDarknet': 'darknet',
        'tabSyndicate': 'syndicate'
    };

    const featureKey = tabFeatureMap[tabId];
    if (featureKey && window.AccessControl && typeof window.AccessControl.guardFeature === 'function') {
        const canProceed = window.AccessControl.guardFeature(featureKey, () => {
            _performTabSwitch(tabId);
        });
        if (!canProceed) return;
    }

    _performTabSwitch(tabId);
}

function _performTabSwitch(tabId) {
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
// 12. ТАКТИЛЬНЫЙ HUD-РЕВОЛЬВЕР (БЕСКОНЕЧНЫЙ ЦИКЛ 360° + ТАЧ)
// ========================================================
const HudRevolver = {
    container: null,
    row: null,
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    velX: 0,
    momentumID: null,
    _isBound: false,
    singleSetWidth: 0,

    init() {
        this.container = document.querySelector('.user-stats-scroll');
        this.row = document.getElementById('userStatsRow');
        if (!this.container || !this.row || this._isBound) return;
        this._isBound = true;

        const slider = this.container;

        slider.style.overflowX = 'scroll';
        slider.style.overflowY = 'hidden';
        slider.style.webkitOverflowScrolling = 'touch';
        slider.style.touchAction = 'pan-x';
        slider.style.cursor = 'grab';
        slider.style.scrollbarWidth = 'none';

        // Создаем бесконечную карусель (клонируем плашки 2 раза)
        if (!this.row.dataset.cloned) {
            this.row.dataset.cloned = "true";
            const originalHTML = this.row.innerHTML;
            this.row.innerHTML = originalHTML + originalHTML + originalHTML;
        }

        requestAnimationFrame(() => {
            this.singleSetWidth = this.row.scrollWidth / 3;
            slider.scrollLeft = this.singleSetWidth;
        });

        // Мышь (ПК)
        slider.addEventListener('mousedown', (e) => {
            this.isDown = true;
            slider.style.cursor = 'grabbing';
            this.startX = e.pageX - slider.offsetLeft;
            this.scrollLeft = slider.scrollLeft;
            cancelAnimationFrame(this.momentumID);
        });

        window.addEventListener('mouseup', () => {
            if (!this.isDown) return;
            this.isDown = false;
            slider.style.cursor = 'grab';
            this.beginMomentum();
        });

        slider.addEventListener('mousemove', (e) => {
            if (!this.isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - this.startX) * 1.8;
            slider.scrollLeft = this.scrollLeft - walk;
            this.checkLoop();
        });

        // Тач-свайп (смартфон / Telegram)
        let touchStartX = 0;
        let lastX = 0;

        slider.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].pageX;
            lastX = touchStartX;
            this.velX = 0;
            cancelAnimationFrame(this.momentumID);
        }, { passive: true });

        slider.addEventListener('touchmove', (e) => {
            const currentX = e.touches[0].pageX;
            const delta = lastX - currentX;
            slider.scrollLeft += delta * 1.2;
            this.velX = delta;
            lastX = currentX;
            this.checkLoop();
        }, { passive: true });

        slider.addEventListener('touchend', () => {
            this.beginMomentum();
            if (window.AudioFx && typeof window.AudioFx.haptic === 'function') {
                window.AudioFx.haptic('light');
            } else if (typeof window.tgHaptic === 'function') {
                window.tgHaptic('light');
            }
        });

        slider.addEventListener('scroll', () => {
            this.checkLoop();
        }, { passive: true });

        console.log('[HUD] Бесконечная карусель статов активирована ✓');
    },

    checkLoop() {
        if (!this.container || !this.singleSetWidth) return;
        const cur = this.container.scrollLeft;

        if (cur <= 10) {
            this.container.scrollLeft += this.singleSetWidth;
        } else if (cur >= this.singleSetWidth * 2) {
            this.container.scrollLeft -= this.singleSetWidth;
        }
    },

    beginMomentum() {
        cancelAnimationFrame(this.momentumID);
        const loop = () => {
            if (this.container && Math.abs(this.velX) > 0.3) {
                this.container.scrollLeft += this.velX;
                this.velX *= 0.92;
                this.checkLoop();
                this.momentumID = requestAnimationFrame(loop);
            }
        };
        this.momentumID = requestAnimationFrame(loop);
    }
};

// ========================================================
// 13. СЛУШАТЕЛЬ СКРОЛЛА ЛЕНТЫ ДЛЯ АВТОСВОРАЧИВАНИЯ КАТЕГОРИЙ
// ========================================================
function initMarketScrollListener() {
    const mainContent = document.querySelector('.main-content') || window;
    let lastScrollTop = 0;

    const onScroll = () => {
        const curScroll = mainContent.scrollTop !== undefined ? mainContent.scrollTop : window.scrollY;

        const marketTab = document.getElementById('tabMarket');
        if (!marketTab || !marketTab.classList.contains('active')) return;

        if (curScroll <= 15) {
            if (typeof window.collapseMarketCategories === 'function') {
                window.collapseMarketCategories(false);
            }
        } else if (curScroll > lastScrollTop && curScroll > 60) {
            if (typeof window.collapseMarketCategories === 'function') {
                window.collapseMarketCategories(true);
            }
        }

        lastScrollTop = Math.max(0, curScroll);
    };

    if (mainContent.addEventListener) {
        mainContent.addEventListener('scroll', onScroll, { passive: true });
    }
}

// Запуск при старте
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        HudRevolver.init();
        initMarketScrollListener();
    });
} else {
    setTimeout(() => {
        HudRevolver.init();
        initMarketScrollListener();
    }, 150);
}

// ========================================================
// 14. ЭКСПОРТ В ГЛОБАЛЬНЫЙ КОНТЕКСТ
// ========================================================
window.openDailyBonusModal = openDailyBonusModal;
window.claimDailyReward = claimDailyReward;
window.renderDailyBonusGrid = renderDailyBonusGrid;
window.getDailyBonusState = getDailyBonusState;
window.openModal = openModal;
window.closeModal = closeModal;
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
window._performTabSwitch = _performTabSwitch;
window.checkRealTimeDayChange = checkRealTimeDayChange;
window._updateDynamicStarRate = _updateDynamicStarRate;
window._syncStarRateToBank = _syncStarRateToBank;
window.logBankTransaction = logBankTransaction;
window.HudRevolver = HudRevolver;
window._safeNumDeposit = _safeNumDeposit;
window.initMarketScrollListener = initMarketScrollListener;

console.log('[💠 app-game.js v5.4.0] Бесконечный свайп 360°, автоскролл и золотой уровень активированы ✓');

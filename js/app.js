// ========================================================
// js/app.js — ЯДРО СИМУЛЯТОРА, РОЛЛЕР И TELEGRAM REF (v2.2.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v2.2.0:
//   - УДАЛЁН дублирующий biz-tick из gameCycleSeconds (доход дважды)
//   - ДОБАВЛЕН backfire в executeDayCycleMidnight
//   - Вызов PhoneBusiness.onNewDay() сохранён
// ========================================================

window.CURRENT_GAME_VERSION = "v2.0.0";

let tgUserId = "guest_777";
let tgUserData = null;

// ⭐ v9: смена версии сейва для миграции экономики
const SAVE_VERSION = 9;
let SAVE_KEY_PREFIX = "perekup_v9_";

let cloudSaveDebounceTimer = null;
let isCloudStorageAvailable = false;

// Кэш предыдущих значений для плавной накрутки роллером
let displayedCashValue = 0;
let displayedStarsValue = 0;
let activeNumberAnimators = {};

// ========================================================
// 1. ДИНАМИЧЕСКИЙ ВЫБОР ФОТО АВТОМОБИЛЯ
// ========================================================
function getCarImage(template) {
    if (!template) return "assets/cars/economy/2101/vaz-2101.jpg";
    if (Array.isArray(template.images) && template.images.length > 0) {
        const randIdx = Math.floor(Math.random() * template.images.length);
        return template.images[randIdx];
    }
    if (template.img) return template.img;
    if (typeof getCategoryFallback === 'function') {
        return getCategoryFallback(template.type || 'economy');
    }
    return "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80";
}
window.getCarImage = getCarImage;

// ========================================================
// 2. ЦЕНТРАЛИЗОВАННЫЙ МЕНЕДЖЕР МОДАЛЬНЫХ ОКОН
// ========================================================
const ModalManager = {
    activeModals: [],

    open(modalId, options = {}) {
        const el = document.getElementById(modalId);
        if (!el) return;

        if (options.closeOthers) {
            this.closeAll();
        }

        if (!el.classList.contains('active')) {
            el.classList.add('active');
            this.activeModals.push(modalId);
        }

        const baseZIndex = 5000;
        const currentStackPos = this.activeModals.indexOf(modalId);
        el.style.zIndex = baseZIndex + (currentStackPos * 50);

        if (window.AudioFx) window.AudioFx.haptic('light');
    },

    close(modalId) {
        const el = document.getElementById(modalId);
        if (el) {
            el.classList.remove('active');
            el.style.zIndex = '';
        }
        this.activeModals = this.activeModals.filter(id => id !== modalId);
    },

    closeAll() {
        const opened = [...this.activeModals];
        opened.forEach(id => this.close(id));
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
            m.classList.remove('active');
            m.style.zIndex = '';
        });
        this.activeModals = [];
    },

    isAnyOpen() {
        return this.activeModals.length > 0;
    }
};

window.ModalManager = ModalManager;
window.closeModal = (id) => ModalManager.close(id);

// ========================================================
// 3. АНИМИРОВАННЫЙ РОЛЛЕР И СИСТЕМНЫЕ УВЕДОМЛЕНИЯ
// ========================================================
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
}

function showToast(msg) {
    const t = document.getElementById('toastNotification');
    if (!t) return;
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => { t.classList.remove('show'); }, 2500);
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
window.logBankTransaction = logBankTransaction;

// ========================================================
// 4. ИНТЕРАКТИВНЫЙ РЕНДЕР НАГРАД И МОДАЛКИ
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
                icon: '💰',
                title: 'Денежные средства',
                value: match ? match[1].trim() + ' ₽' : trimLine,
                desc: 'Зачислено на баланс игрока',
                rarity: 'token-green'
            });
        } else if (trimLine.includes('⭐') || trimLine.toLowerCase().includes('stars') || trimLine.toLowerCase().includes('банкнот')) {
            let match = trimLine.match(/([+\-]?\d+)\s*(⭐|stars|банкнот)/i);
            tokens.push({
                icon: '💵',
                title: 'Неоновые банкноты',
                value: match ? '+' + match[1] + ' 💵' : trimLine,
                desc: 'Премиальная валюта перекупа',
                rarity: 'token-green'
            });
        } else if (trimLine.includes('XP') || trimLine.toLowerCase().includes('опыт')) {
            let match = trimLine.match(/([+\-]?\d+)\s*XP/i);
            tokens.push({
                icon: '🎖️',
                title: 'Опыт авторитета',
                value: match ? '+' + match[1] + ' XP' : trimLine,
                desc: 'Повышает ранг перекупа',
                rarity: 'token-cyan'
            });
        } else if (trimLine.toLowerCase().includes('штрафстоян') || trimLine.includes('🚔')) {
            tokens.push({
                icon: '🚔',
                title: 'Талон штрафстоянки',
                value: 'Бесплатный забор авто',
                desc: 'Позволяет забрать машину без оплаты протокола',
                rarity: 'token-purple'
            });
        } else if (trimLine.includes('🚗') || trimLine.toLowerCase().includes('получен в гараж')) {
            tokens.push({
                icon: '🏎️',
                title: 'Транспортное средство',
                value: trimLine.replace(/^[0-9.\s]+/, '').replace('🚗', '').trim(),
                desc: 'Добавлено в ваш автопарк',
                rarity: 'token-cyan'
            });
        } else if (trimLine.includes('🏷️') || trimLine.toLowerCase().includes('номер')) {
            tokens.push({
                icon: '🏷️',
                title: 'Госномер РФ',
                value: trimLine.replace('🏷️', '').trim(),
                desc: 'Архивный номер в инвентаре',
                rarity: 'token-purple'
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
// 5. ИГРОВОЙ STATE & ДЕФОЛТНЫЕ ДАННЫЕ
// ========================================================
const DEFAULT_STATE = {
    lang: 'ru',
    __saveVersion: SAVE_VERSION,

    // ⭐ v9: версия ленты рынка для защиты от гонок
    marketFeedVersion: 0,

    // ⭐ v9: лента событий M+ (сохраняется в сейв)
    mEventsFeed: [],

    player: {
        name: "Перекуп #777", avatarUrl: null, cash: 150000, stars: 15, connections: 1,
        expressTickets: 25, maxExpressTickets: 25, fuel: 100, level: 1, xp: 0, maxXp: 120,
        baseSlots: 2, vip: false, vipPro: false, lastFreeSpinDay: 0, lastFreeSuperSpinDay: 0,
        club: null, karma: 50, streetCred: 100, superSpinTickets: 1,
        freeImpoundPasses: 0,
        traderTitle: "Быстрый выкуп за кэш 💸",
        phoneWidgetsCollapsed: { biz: false, quests: false },
        stats: { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0, scandalsAvoided: 0, bestSingleMargin: 0 },
        hunger: 80, mood: 85, loanDebt: 0, taxDebt: 0, day: 1, streakDay: 1, lastClaimedDay: 0,
        lastRealDayTimestamp: Date.now(),
        diet: 'shaurma',
        housingId: 'trailer',
        housingType: 'rent',
        ownedHouses: [],
        mortgage: null,

        hudColorId: 'lightning',
        themePresetId: 'default',
        customHexColor: null,
        nickEffect: 'none',
        avatarEffect: 'none',
        ownedNickEffects: ['none'],
        ownedAvatarEffects: ['none'],
        ownedTitles: ['cash_buyer'],
        soundProfile: 'cyber',

        crypto: { btc: 0, eth: 0, staked: [], prices: { btc: 9500000, eth: 340000 } },
        bankReputation: {
            rating: 5.0,
            successfulDeals: 0,
            fairDealsCount: 0,
            scandalsCount: 0,
            vipBankTier: 'Стандарт',
            loanLimit: 500000,
            reviewsLog: [
                { author: "Алексей В.", rating: 5, date: "Недавно", text: "Отличный продавец, машина в идеале, доехали без сюрпризов!" },
                { author: "Сергей Д.", rating: 5, date: "Недавно", text: "Честный парень, Launch показал чистый блок, респект!" }
            ]
        },

        selectedStreetCarIndex: 0,
        lastBarnDay: 0, preSalesCount: 0, preSaleCooldownUntil: 0, policeImmunityDays: 0,
        hasRacingLicense: false, consecutiveRaces: 0, maxRacesBeforeRaid: 12,
        safeDeposit: 0, trafficFines: 0,
        tools: { gauge: false, gauge_pro: false, obd: false, obd_launch: false, endoscope: false, compressor: false, battery_tester: false },
        toolsWear: { gauge: 60, gauge_pro: 100, obd: 50, obd_launch: 80, endoscope: 40, compressor: 50, battery_tester: 60 },
        furniture: [], phoneMessages: [], dailyQuests: [], dailyQuestsSuperClaimed: false,
        bankHistory: [], bankDeposits: [], mailbox: [],
        warehouse: { maxCars: 6, maxItems: 12, cars: [], items: [] },

        // ⭐ v9: реакции на события M+ сохраняются в сейв
        mEventReactions: {},

        // ⭐ v9: список разблокированных сервисов
        unlockedApps: [],

        // ⭐ v9: страховки и трекеры
        hasGpsTracker: false,
        hasCustomsPass: false,

        // ⭐ v2.2.0: бизнес-бонусы и достижения
        businessAdBonus: null,
        businessAchievements: [],
        businessSalesCount: 0,
        ownedBizSkins: [],
        ownedBizStickers: []
    },
    garage: [], salesLot: [], contracts: [], plateCatalog: [],
    ownedPlates: ["В777ВВ 77"], registeredPlates: ["В777ВВ 77"],
    activeCategory: 'economy', marketFeed: [], p2pMode: 'cars', syndicateSubTab: 'contracts',
    myP2PListings: [], p2pMarketListings: [], businesses: [], confiscatedLot: null, blackMarketPlates: [],
    officialPlateAuction: [],
    marketModifiers: { economy: 1, comfort: 1, premium: 1, hyper: 1, moto: 1, truck: 1, all: 1 },
    lifeChatMessages: [], friendsList: [],

    // ⭐ v2.2.0: инфраструктура бизнеса
    businessWorkshop: { equipment: 0, storage: 0, brand: 0, diagnostics: 0 },
    businessStaff: { mechanic: 0, painter: 0, manager: 0, accountant: 0 },
    businessFleet: []
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
window.state = state;

// ⭐ v9: глобальный монотонный счётчик для защиты async-операций от гонок
window.__marketRenderToken = 0;
window.__salesLotRenderToken = 0;

window.pushToMailbox = function(mailItem) {
    if (!state.player) state.player = {};
    if (!Array.isArray(state.player.mailbox)) state.player.mailbox = [];

    const item = Object.assign({
        id: "mail_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
        type: "item",
        title: "Посылка",
        sender: "Служба доставки",
        desc: "Новое поступление в почтовый ящик.",
        date: "Только что",
        claimed: false
    }, mailItem);

    state.player.mailbox.unshift(item);
    saveState();
    if (typeof PhoneManager !== 'undefined') PhoneManager.updateUnreadBadge();
    showToast(`📦 В почту прибыло новое отправление: «${item.title}»!`);
};

function t(key) {
    let lang = state.lang || 'ru';
    if (typeof I18N_TRANSLATIONS !== 'undefined' && I18N_TRANSLATIONS[lang] && I18N_TRANSLATIONS[lang][key]) {
        return I18N_TRANSLATIONS[lang][key];
    }
    return key;
}
window.t = t;

// ========================================================
// 6. МУЛЬТИЯЗЫЧНОСТЬ (I18N)
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
    showToast(lang === 'ru' ? "Язык: Русский 🇷🇺" : "Language: English 🇬🇧");
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
// 7. ЗАДАНИЯ И ВЕХИ КАРЬЕРЫ
// ========================================================
function trackQuestProgress(actionType, count = 1) {
    if (!state.player || !Array.isArray(state.player.dailyQuests)) return;
    let questsUpdated = false;

    state.player.dailyQuests.forEach(q => {
        if (!q.done && (q.actionType === actionType || q.id === actionType)) {
            q.cur = Math.min(q.max || q.target || 1, (q.cur || 0) + count);
            questsUpdated = true;
            if (q.cur >= (q.max || q.target || 1)) {
                showToast(`🎯 Выполнено задание: «${q.text}»! Заберите награду в телефоне.`);
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
        showToast("🏆 Веха в Блокноте: Первый 1,000,000 ₽ чистой прибыли!");
        if (window.AudioFx) window.AudioFx.play('win');
    }
    if (sold >= 10 && !state.player.milestoneSalesClaimed) {
        state.player.milestoneSalesClaimed = true;
        showToast("🏆 Веха в Блокноте: Закрыто 10 успешных продаж!");
        if (window.AudioFx) window.AudioFx.play('win');
    }
}

function refreshDailyQuestsList() {
    state.player.dailyQuestsSuperClaimed = false;
    if (typeof DAILY_QUESTS_POOL === 'undefined' || !Array.isArray(DAILY_QUESTS_POOL)) {
        state.player.dailyQuests = [
            { id: "q_inspect", text: "Осмотреть толщиномером 2 авто на рынке", cur: 0, max: 2, actionType: "gauge_check", reward: 40000, rewardXp: 40, done: false },
            { id: "q_race", text: "Выиграть заезд 402м в Стрите", cur: 0, max: 1, actionType: "win_drag", reward: 60000, rewardXp: 45, done: false },
            { id: "q_biz", text: "Собрать кассу с предприятий", cur: 0, max: 1, actionType: "collect_biz", reward: 30000, rewardXp: 30, done: false }
        ];
        return;
    }

    const shuffled = [...DAILY_QUESTS_POOL].sort(() => 0.5 - Math.random());
    state.player.dailyQuests = shuffled.slice(0, 3).map(q => ({
        id: q.id,
        text: q.text,
        cur: 0,
        max: q.target || 1,
        actionType: q.actionType,
        reward: q.reward,
        rewardXp: q.rewardXp || 35,
        done: false
    }));
}

// ========================================================
// 8. СЛОТЫ ГАРАЖА
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
// 9. ДОСТУП К СЕРВИСУ «ПОДКЛЮЧ» — живёт в syndicate.js
// ========================================================

// ========================================================
// 10. TELEGRAM CLOUD & STORAGE SYNC
// ========================================================
const CHUNK_SIZE = 2048;

function prepareStateForCloud() {
    return JSON.stringify(state);
}

function saveToTelegramCloud(jsonString, callback) {
    if (!window.Telegram?.WebApp?.CloudStorage) return;
    const tgCloud = window.Telegram.WebApp.CloudStorage;
    const totalChunks = Math.ceil(jsonString.length / CHUNK_SIZE);

    tgCloud.setItem(SAVE_KEY_PREFIX + tgUserId + "_meta", String(totalChunks), (err) => {
        if (err) {
            if (callback) callback(false);
            return;
        }
        let completed = 0;
        for (let i = 0; i < totalChunks; i++) {
            const chunk = jsonString.substr(i * CHUNK_SIZE, CHUNK_SIZE);
            tgCloud.setItem(SAVE_KEY_PREFIX + tgUserId + "_c" + i, chunk, (cErr) => {
                if (!cErr) completed++;
                if (completed === totalChunks && callback) {
                    callback(true);
                }
            });
        }
    });
}

// ========================================================
// 11. МИГРАЦИЯ СЕЙВОВ
// ========================================================
function migrateSave(parsed) {
    if (!parsed || typeof parsed !== 'object') return parsed;

    const currentVersion = parsed.__saveVersion || 8;

    if (currentVersion < 9) {
        console.log(`[Migration] Обновление сейва v${currentVersion} → v${SAVE_VERSION}`);

        if (parsed.player && typeof parsed.player === 'object') {
            if (parsed.player.garageSlots !== undefined && parsed.player.garageSlots > 0) {
                const oldBase = parsed.player.baseSlots || 2;
                const oldGarage = parsed.player.garageSlots || 2;
                parsed.player.baseSlots = Math.max(oldBase, oldGarage);
                delete parsed.player.garageSlots;
            }
            if (!Array.isArray(parsed.player.unlockedApps)) parsed.player.unlockedApps = [];
            if (typeof parsed.player.hasGpsTracker !== 'boolean') parsed.player.hasGpsTracker = false;
            if (typeof parsed.player.hasCustomsPass !== 'boolean') parsed.player.hasCustomsPass = false;
            if (!parsed.player.mEventReactions || typeof parsed.player.mEventReactions !== 'object') {
                parsed.player.mEventReactions = {};
            }
            // ⭐ v2.2.0: поля бизнеса
            if (parsed.player.businessAdBonus === undefined) parsed.player.businessAdBonus = null;
            if (!Array.isArray(parsed.player.businessAchievements)) parsed.player.businessAchievements = [];
            if (typeof parsed.player.businessSalesCount !== 'number') parsed.player.businessSalesCount = 0;
            if (!Array.isArray(parsed.player.ownedBizSkins)) parsed.player.ownedBizSkins = [];
            if (!Array.isArray(parsed.player.ownedBizStickers)) parsed.player.ownedBizStickers = [];

            if (Array.isArray(parsed.player.phoneMessages) && Array.isArray(parsed.salesLot)) {
                const validLotIndices = new Set();
                parsed.salesLot.forEach((_, i) => validLotIndices.add(i));
                parsed.player.phoneMessages = parsed.player.phoneMessages.filter(m => {
                    if (!m) return false;
                    if (m.category === 'buyers' && m.carIndex !== undefined) {
                        return validLotIndices.has(m.carIndex);
                    }
                    return true;
                });
            }
        }

        if (!Array.isArray(parsed.mEventsFeed)) parsed.mEventsFeed = [];

        // ⭐ v2.2.0: инфраструктура бизнеса
        if (!parsed.businessWorkshop || typeof parsed.businessWorkshop !== 'object') {
            parsed.businessWorkshop = { equipment: 0, storage: 0, brand: 0, diagnostics: 0 };
        }
        if (!parsed.businessStaff || typeof parsed.businessStaff !== 'object') {
            parsed.businessStaff = { mechanic: 0, painter: 0, manager: 0, accountant: 0 };
        }
        if (!Array.isArray(parsed.businessFleet)) parsed.businessFleet = [];

        parsed.marketFeedVersion = (parsed.marketFeedVersion || 0) + 1;
    }

    parsed.__saveVersion = SAVE_VERSION;
    return parsed;
}

// ========================================================
// 12. АВТОРИЗАЦИЯ, ЗАГРУЗКА И СОХРАНЕНИЕ
// ========================================================
async function initTelegramAuthAndStorage(callback) {
    let callbackCalled = false;
    const safeCallback = () => {
        if (!callbackCalled) {
            callbackCalled = true;
            if (typeof callback === 'function') callback();
        }
    };

    const watchdogTimer = setTimeout(() => {
        console.warn("[App] Сработал защитный таймаут инициализации.");
        safeCallback();
    }, 2000);

    try {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();

            if (tg.initDataUnsafe?.user) {
                tgUserData = tg.initDataUnsafe.user;
                tgUserId = String(tgUserData.id);
            }
        }
    } catch (e) {
        console.warn("Ошибка инициализации Telegram WebApp:", e);
    }

    const hadLocalSave = loadFromLocalStorage();

    if (!hadLocalSave && window.FB_Bridge?.Players?.pullSave) {
        try {
            const cloudSave = await window.FB_Bridge.Players.pullSave(tgUserId);
            if (cloudSave) {
                applyLoadedState(cloudSave);
                console.log("[Cloud] Прогресс восстановлен из облака Firestore");
                showToast("☁️ Прогресс синхронизирован из облака!");
            }
        } catch (e) {
            console.warn("[Cloud] Не удалось восстановить сейв:", e);
        }
    }

    if (tgUserData && state.player) {
        let names = [];
        if (tgUserData.first_name) names.push(tgUserData.first_name);
        if (tgUserData.last_name) names.push(tgUserData.last_name);
        const fullName = names.join(' ').trim();

        const currentName = state.player.name || "";
        const isDefaultName = !currentName || currentName === "Перекуп #777" || currentName.startsWith("Гость");

        if (isDefaultName) {
            if (fullName) state.player.name = fullName;
            else if (tgUserData.username) state.player.name = "@" + tgUserData.username;
        }
        if (tgUserData.photo_url) state.player.avatarUrl = tgUserData.photo_url;
    }

    if (window.FB_Bridge?.CarsCatalog) {
        try {
            await window.FB_Bridge.CarsCatalog.seedDefaultCarsCatalog();
        } catch (e) {}
    }

    clearTimeout(watchdogTimer);
    safeCallback();
}

function loadFromLocalStorage() {
    try {
        let saved = localStorage.getItem("perekup_save_" + tgUserId);
        if (!saved) saved = localStorage.getItem(SAVE_KEY_PREFIX + tgUserId);
        if (!saved) saved = localStorage.getItem('perekoop_sim_save_v105_release');
        if (!saved) saved = localStorage.getItem("perekup_save_guest_777");

        if (saved) {
            const parsed = JSON.parse(saved);
            applyLoadedState(parsed);
            return true;
        }

        applyLoadedState({});
        return false;
    } catch(e) {
        console.warn("[Local] Ошибка загрузки сейва:", e);
        applyLoadedState({});
        return false;
    }
}

function applyLoadedState(parsed) {
    if (!parsed) parsed = {};

    parsed = migrateSave(parsed);

    if (parsed.lang) state.lang = parsed.lang;

    if (typeof parsed.marketFeedVersion === 'number') {
        state.marketFeedVersion = parsed.marketFeedVersion;
    } else {
        state.marketFeedVersion = 0;
    }
    if (Array.isArray(parsed.mEventsFeed)) {
        state.mEventsFeed = parsed.mEventsFeed;
    } else {
        state.mEventsFeed = [];
    }

    if (parsed.player) {
        state.player = { ...DEFAULT_STATE.player, ...parsed.player };

        if (parsed.player.stats) state.player.stats = { ...DEFAULT_STATE.player.stats, ...parsed.player.stats };
        if (parsed.player.tools) state.player.tools = { ...DEFAULT_STATE.player.tools, ...parsed.player.tools };
        if (parsed.player.toolsWear) state.player.toolsWear = { ...DEFAULT_STATE.player.toolsWear, ...parsed.player.toolsWear };
        if (parsed.player.crypto) state.player.crypto = { ...DEFAULT_STATE.player.crypto, ...parsed.player.crypto };
        if (parsed.player.bankReputation) state.player.bankReputation = { ...DEFAULT_STATE.player.bankReputation, ...parsed.player.bankReputation };
        if (parsed.player.phoneWidgetsCollapsed) state.player.phoneWidgetsCollapsed = { ...DEFAULT_STATE.player.phoneWidgetsCollapsed, ...parsed.player.phoneWidgetsCollapsed };
        if (parsed.player.club) state.player.club = parsed.player.club;

        if (!Array.isArray(state.player.phoneMessages)) state.player.phoneMessages = [];
        if (!Array.isArray(state.player.dailyQuests)) state.player.dailyQuests = [];
        if (!Array.isArray(state.player.bankHistory)) state.player.bankHistory = [];
        if (!Array.isArray(state.player.bankDeposits)) state.player.bankDeposits = [];
        if (!Array.isArray(state.player.mailbox)) state.player.mailbox = [];
        if (!Array.isArray(state.player.unlockedApps)) state.player.unlockedApps = [];
        if (!Array.isArray(state.player.ownedHouses)) state.player.ownedHouses = [];
        if (!Array.isArray(state.player.businessAchievements)) state.player.businessAchievements = [];
        if (!Array.isArray(state.player.ownedBizSkins)) state.player.ownedBizSkins = [];
        if (!Array.isArray(state.player.ownedBizStickers)) state.player.ownedBizStickers = [];
        if (!state.player.mEventReactions || typeof state.player.mEventReactions !== 'object') state.player.mEventReactions = {};

        if (parsed.player.warehouse) {
            state.player.warehouse = { ...DEFAULT_STATE.player.warehouse, ...parsed.player.warehouse };
        }
    }

    if (Array.isArray(parsed.garage)) state.garage = parsed.garage;
    if (Array.isArray(parsed.salesLot)) state.salesLot = parsed.salesLot;
    if (Array.isArray(parsed.contracts)) state.contracts = parsed.contracts;
    if (Array.isArray(parsed.ownedPlates)) state.ownedPlates = parsed.ownedPlates;
    if (Array.isArray(parsed.registeredPlates)) state.registeredPlates = parsed.registeredPlates;
    if (Array.isArray(parsed.businesses)) state.businesses = parsed.businesses;
    if (parsed.marketModifiers) state.marketModifiers = parsed.marketModifiers;
    if (Array.isArray(parsed.myP2PListings)) state.myP2PListings = parsed.myP2PListings;
    if (Array.isArray(parsed.p2pMarketListings)) state.p2pMarketListings = parsed.p2pMarketListings;
    if (parsed.confiscatedLot) state.confiscatedLot = parsed.confiscatedLot;
    if (Array.isArray(parsed.marketFeed)) state.marketFeed = parsed.marketFeed;
    if (Array.isArray(parsed.blackMarketPlates)) state.blackMarketPlates = parsed.blackMarketPlates;
    if (Array.isArray(parsed.officialPlateAuction)) state.officialPlateAuction = parsed.officialPlateAuction;
    if (Array.isArray(parsed.lifeChatMessages)) state.lifeChatMessages = parsed.lifeChatMessages;
    if (Array.isArray(parsed.friendsList)) state.friendsList = parsed.friendsList;

    // ⭐ v2.2.0: инфраструктура бизнеса
    if (parsed.businessWorkshop && typeof parsed.businessWorkshop === 'object') {
        state.businessWorkshop = { ...DEFAULT_STATE.businessWorkshop, ...parsed.businessWorkshop };
    }
    if (parsed.businessStaff && typeof parsed.businessStaff === 'object') {
        state.businessStaff = { ...DEFAULT_STATE.businessStaff, ...parsed.businessStaff };
    }
    if (Array.isArray(parsed.businessFleet)) state.businessFleet = parsed.businessFleet;

    sanitizeState();
}

function sanitizeState() {
    if (!state.player) state.player = JSON.parse(JSON.stringify(DEFAULT_STATE.player));
    if (!state.player.baseSlots || state.player.baseSlots < 2) state.player.baseSlots = 2;
    if (!state.player.maxExpressTickets) state.player.maxExpressTickets = 25;
    if (typeof state.player.expressTickets !== 'number') state.player.expressTickets = state.player.maxExpressTickets;
    if (typeof state.player.cash !== 'number' || state.player.cash < 0) state.player.cash = 150000;
    if (typeof state.player.stars !== 'number' || state.player.stars < 0) state.player.stars = 15;
    if (!state.player.hudColorId) state.player.hudColorId = 'lightning';
    if (!state.player.soundProfile) state.player.soundProfile = 'cyber';
    if (!state.player.traderTitle) state.player.traderTitle = "Быстрый выкуп за кэш 💸";
    if (!Array.isArray(state.player.mailbox)) state.player.mailbox = [];
    if (!Array.isArray(state.player.unlockedApps)) state.player.unlockedApps = [];
    if (!Array.isArray(state.player.businessAchievements)) state.player.businessAchievements = [];
    if (!Array.isArray(state.player.ownedBizSkins)) state.player.ownedBizSkins = [];
    if (!Array.isArray(state.player.ownedBizStickers)) state.player.ownedBizStickers = [];
    if (typeof state.player.businessSalesCount !== 'number') state.player.businessSalesCount = 0;
    if (!state.player.warehouse) state.player.warehouse = { maxCars: 6, maxItems: 12, cars: [], items: [] };
    if (!state.player.dailyQuests || state.player.dailyQuests.length === 0) refreshDailyQuestsList();
    if (!state.player.mEventReactions || typeof state.player.mEventReactions !== 'object') state.player.mEventReactions = {};

    // ⭐ v2.2.0: инфраструктура бизнеса
    if (!state.businessWorkshop) state.businessWorkshop = { equipment: 0, storage: 0, brand: 0, diagnostics: 0 };
    if (!state.businessStaff) state.businessStaff = { mechanic: 0, painter: 0, manager: 0, accountant: 0 };
    if (!Array.isArray(state.businessFleet)) state.businessFleet = [];

    state.__saveVersion = SAVE_VERSION;
    if (!Array.isArray(state.mEventsFeed)) state.mEventsFeed = [];
    if (typeof state.marketFeedVersion !== 'number') state.marketFeedVersion = 0;
}

function saveState() {
    try {
        state.__saveVersion = SAVE_VERSION;

        const fullJson = JSON.stringify(state);
        localStorage.setItem("perekup_save_" + tgUserId, fullJson);
        localStorage.setItem(SAVE_KEY_PREFIX + tgUserId, fullJson);

        if (window.FB_Bridge && window.FB_Bridge.CloudSave) {
            window.FB_Bridge.CloudSave.pushSave(tgUserId, state);
        }

        if (isCloudStorageAvailable) {
            if (cloudSaveDebounceTimer) clearTimeout(cloudSaveDebounceTimer);
            cloudSaveDebounceTimer = setTimeout(() => {
                const cloudJson = prepareStateForCloud();
                saveToTelegramCloud(cloudJson, (success) => {
                    const statusEl = document.getElementById('cloudStorageStatus');
                    if (statusEl) {
                        statusEl.innerText = success ? "Cloud: Синхронно ✓" : "Cloud: Ошибка";
                        statusEl.className = success ? "tag-badge bg-tag-green" : "tag-badge bg-tag-red";
                    }
                });
            }, 1800);
        }
    } catch(e) {
        console.warn("[Save] Ошибка сохранения:", e);
    }
    updateHeaderUI();
}

function resetGameData() {
    if (!confirm("Внимание! Вы уверены, что хотите полностью стереть весь прогресс, гараж, бизнес и начать заново? Это действие необратимо!")) {
        return;
    }

    try {
        localStorage.removeItem("perekup_save_" + tgUserId);
        localStorage.removeItem(SAVE_KEY_PREFIX + tgUserId);
        localStorage.removeItem("perekup_save_guest_777");
        localStorage.removeItem('perekoop_sim_save_v105_release');
        localStorage.removeItem('perekup_last_seen_version');
        localStorage.removeItem("perekup_db_seeded_v1");

        const cleanState = JSON.parse(JSON.stringify(DEFAULT_STATE));
        if (window.FB_Bridge && window.FB_Bridge.CloudSave) {
            window.FB_Bridge.CloudSave.pushSave(tgUserId, cleanState);
        }

        if (window.AudioFx) window.AudioFx.haptic('warning');
        showToast("Прогресс сброшен. Перезагрузка...");
        setTimeout(() => { location.reload(); }, 600);
    } catch(e) {
        location.reload();
    }
}

function syncCloudStorageManual() {
    saveState();
    showToast("Синхронизация с облаком Firestore запущена ✓");
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
        showToast("Код сейва скопирован!");
        if (window.AudioFx) {
            window.AudioFx.haptic('success');
            window.AudioFx.play('win');
        }
    }).catch(() => {
        area.select();
        document.execCommand('copy');
        showToast("Код скопирован!");
    });
}

function importSaveCodeAction() {
    const area = document.getElementById('saveExportArea');
    if (!area || !area.value.trim()) return showToast("Вставьте код сохранения!");
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
        showToast("Некорректный код сейва!");
    }
}

// ========================================================
// 13. СУТОЧНЫЙ ЦИКЛ (v2.2.0 — расширенный)
// ⭐ v2.2.0:
//   - Вызов PhoneBusiness.onNewDay()
//   - BACKFIRE: претензии покупателей через N дней
//   - Автозахват кассы через Управляющего
// ========================================================
function checkRealTimeDayChange() {
    const now = new Date();
    const lastDate = new Date(state.player.lastRealDayTimestamp || Date.now());

    const isDifferentDay = (
        now.getFullYear() !== lastDate.getFullYear() ||
        now.getMonth() !== lastDate.getMonth() ||
        now.getDate() !== lastDate.getDate()
    );

    if (isDifferentDay) {
        executeDayCycleMidnight(now);
    }
}

function executeDayCycleMidnight(currentDateObj) {
    state.player.day = (state.player.day || 1) + 1;
    state.player.lastRealDayTimestamp = currentDateObj.getTime();
    state.player.expressTickets = state.player.maxExpressTickets || 25;
    state.player.consecutiveRaces = 0;

    // Рост долга по кредиту (2% в день на остаток)
    if (state.player.loanDebt > 0) {
        state.player.loanDebt = Math.round(state.player.loanDebt * 1.02);
    }

    // Начисление процентов по банковским вкладам (0.3%/день)
    if (Array.isArray(state.player.bankDeposits)) {
        state.player.bankDeposits.forEach(dep => {
            dep.daysPassed = (dep.daysPassed || 0) + 1;
            let dailyRate = (dep.dailyPercent || 0.3) / 100;
            let gain = Math.round(dep.currentAmount * dailyRate);
            if (dep.autoCompound) dep.currentAmount += gain;
            else dep.accumulatedProfit = (dep.accumulatedProfit || 0) + gain;
        });
    }

    // Голод и настроение
    state.player.hunger = Math.max(10, (state.player.hunger || 80) - 25);
    state.player.mood = Math.max(10, (state.player.mood || 85) - 15);

    // Обновление ежедневных квестов
    if (typeof refreshDailyQuestsList === 'function') {
        refreshDailyQuestsList();
    }

    // --------------------------------------------------------
    // БИЗНЕС-СЕТЬ ЗА ПРОШЕДШИЙ ДЕНЬ
    // --------------------------------------------------------
    try {
        if (window.PhoneBusiness && typeof window.PhoneBusiness.onNewDay === 'function') {
            window.PhoneBusiness.onNewDay();

            if (typeof window.PhoneBusiness.checkAchievements === 'function') {
                window.PhoneBusiness.checkAchievements();
            }
        } else {
            console.warn('[DayCycle] PhoneBusiness.onNewDay не найден — пропускаем обработку бизнеса');
        }
    } catch (e) {
        console.error('[DayCycle] Ошибка обработки бизнес-сети:', e);
    }

    // --------------------------------------------------------
    // Уведомление о накоплениях в кассах (если нет Управляющего)
    // --------------------------------------------------------
    try {
        if (window.PhoneBusiness && typeof window.PhoneBusiness.getAccumulatedCash === 'function') {
            const pending = window.PhoneBusiness.getAccumulatedCash();
            const hasManager = (window.state?.businessStaff?.manager || 0) > 0;
            if (pending >= 500000 && !hasManager && typeof showToast === 'function') {
                setTimeout(() => {
                    showToast(`💼 В кассах бизнесов накопилось ${pending.toLocaleString()} ₽! Загляните в приложение «Бизнес».`);
                }, 1500);
            }
        }
    } catch (e) {
        console.warn('[DayCycle] Ошибка проверки накоплений:', e);
    }

    // --------------------------------------------------------
    // ⭐ v2.2.0: BACKFIRE — ПРЕТЕНЗИЯ ПОКУПАТЕЛЯ ЧЕРЕЗ N ДНЕЙ
    // --------------------------------------------------------
    try {
        if (Array.isArray(state.garage)) {
            state.garage.forEach((car, idx) => {
                if (!car || !car._backfireDay || car._backfireResolved) return;
                const curDay = state.player.day || 1;
                if (curDay >= car._backfireDay) {
                    car._backfireResolved = true;
                    setTimeout(() => {
                        if (typeof _triggerBuyerBackfire === 'function') {
                            _triggerBuyerBackfire(car, idx);
                        } else {
                            console.warn('[DayCycle] _triggerBuyerBackfire не найден в window');
                        }
                    }, 800 + Math.random() * 1500);
                }
            });
        }
    } catch (e) {
        console.warn('[DayCycle] Ошибка backfire:', e);
    }

    // --------------------------------------------------------
    // Рекламная кампания бизнеса (сброс по истечении)
    // --------------------------------------------------------
    try {
        if (state.player.businessAdBonus) {
            const curDay = state.player.day || 1;
            if (state.player.businessAdBonus.expiresDay < curDay) {
                state.player.businessAdBonus = null;
                if (window.PhoneBusiness) window.PhoneBusiness._activeBonus = null;
            }
        }
    } catch (e) {}

    // Сохраняем и обновляем UI
    saveState();
    updateHeaderUI();

    if (typeof showToast === 'function') {
        showToast("🌙 Наступил новый день! Суточные лимиты, кассы и зарплаты обновлены.");
    }
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
}

// ========================================================
// УТИЛИТЫ ГЕНЕРАЦИИ УНИКАЛЬНЫХ ИДЕНТИФИКАТОРОВ И VIN
// ========================================================
function generatePlayerUID() {
    return 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

function generateVehicleVIN(modelPrefix = 'PRK') {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    let vin = (modelPrefix.substring(0, 3).toUpperCase() + '1').padEnd(4, 'X');
    for (let i = 0; i < 13; i++) {
        vin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return vin;
}

function ensureCarIdentity(car) {
    if (!car) return car;
    if (!car.vin) {
        car.vin = generateVehicleVIN(car.make || car.name || 'AUT');
    }
    if (!car.uid) {
        car.uid = 'car_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    }
    return car;
}
window.generateVehicleVIN = generateVehicleVIN;
window.ensureCarIdentity = ensureCarIdentity;

// ========================================================
// 14. СТАРТОВАЯ РЕГИСТРАЦИЯ ИГРОКА
// ========================================================
function checkPlayerOnboarding(onComplete) {
    if (!state.player) state.player = {};

    if (!state.player.uid) {
        state.player.uid = (tgUserId && tgUserId !== "guest_777") ? String(tgUserId) : generatePlayerUID();
        window.tgUserId = state.player.uid;
    }

    const isDefaultNick = !state.player.name || state.player.name === "Перекуп #777" || state.player.name.startsWith("Гость");

    if (isDefaultNick) {
        let overlay = document.getElementById('modalPlayerOnboarding');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalPlayerOnboarding';
            overlay.className = 'modal-overlay active';
            overlay.style.zIndex = '99999';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="modal-box text-center" style="max-width: 380px; border-color: var(--cyan); background: radial-gradient(circle at 50% 0%, #151d2f 0%, #070a10 90%);">
                <div class="modal-glow-badge mb-2" style="display:inline-block;"><i class="fa-solid fa-id-card"></i> ВХОД В СИНДИКАТ</div>
                <h3 class="font-bold mb-1 color-cyan" style="font-size:18px;">Личное дело перекупа</h3>
                <p class="sub-label mb-3" style="font-size:11px; color:#94a3b8;">
                    Придумайте ваш позывной на авторынке и P2P-бирже. Вам будет присвоен уникальный ID в общей базе.
                </p>

                <div class="glass-card p-2 mb-3 text-left" style="background:#090e18;">
                    <span class="sub-label" style="font-size:9px;">Ваш системный ID:</span>
                    <div class="font-bold color-green" style="font-size:12px; font-family:monospace;">${state.player.uid}</div>
                </div>

                <div class="mb-3 text-left">
                    <label class="sub-label block mb-1" style="font-size:10px;">Позывной (Никнейм):</label>
                    <input type="text" id="onboardingNickInput" class="input-dark w-full" maxlength="20" placeholder="Например: Хантер_77" style="padding:10px; font-size:14px; text-align:center; font-weight:bold; border:1px solid var(--cyan); border-radius:8px;">
                </div>

                <button onclick="submitPlayerOnboarding()" class="btn btn-cyan w-full font-bold" style="padding:10px;">
                    Начать карьеру перекупа <i class="fa-solid fa-arrow-right ml-1"></i>
                </button>
            </div>
        `;
        window._onboardingCallback = onComplete;
    } else {
        if (typeof onComplete === 'function') onComplete();
    }
}

function submitPlayerOnboarding() {
    const input = document.getElementById('onboardingNickInput');
    let val = input ? input.value.trim() : "";
    if (!val || val.length < 2) {
        showToast("Позывной должен быть не короче 2 символов!");
        if (window.AudioFx) window.AudioFx.play('error');
        return;
    }

    state.player.name = val;
    saveState();
    updateHeaderUI();

    const overlay = document.getElementById('modalPlayerOnboarding');
    if (overlay) overlay.remove();

    if (window.AudioFx) {
        window.AudioFx.play('win');
        window.AudioFx.haptic('success');
    }
    showToast(`Добро пожаловать в игру, ${val}!`);

    if (typeof window._onboardingCallback === 'function') {
        window._onboardingCallback();
        window._onboardingCallback = null;
    }
}
window.submitPlayerOnboarding = submitPlayerOnboarding;

// ========================================================
// 15. UI ДАШБОРД ПРОФИЛЯ
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

    const banknotePill = document.getElementById('hudBanknotePill');
    if (banknotePill) {
        banknotePill.classList.toggle('res-pulse-active', targetStars > 5);
    }

    const superSpinPill = document.getElementById('hudSuperSpinPill');
    if (superSpinPill) {
        superSpinPill.classList.toggle('res-pulse-active', targetSuperSpinTickets > 5);
    }

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
        showToast((delta > 0 ? "+" : "") + delta.toLocaleString() + " ₽");
    } else if (type === 'level') {
        state.player.level = Math.max(1, Math.min(100, (state.player.level || 1) + delta));
        updateLevelGatesUI();
        showToast((delta > 0 ? "+" : "") + delta + " Ур");
    } else if (type === 'stars') {
        state.player.stars = Math.max(0, (state.player.stars || 0) + delta);
        showToast((delta > 0 ? "+" : "") + delta + " 💵 Банкнот");
    } else if (type === 'tickets') {
        let max = state.player.maxExpressTickets || 25;
        state.player.expressTickets = Math.max(0, Math.min(max, (state.player.expressTickets || 0) + delta));
        showToast((delta > 0 ? "+" : "") + delta + " Талонов 🎟️");
    } else if (type === 'connections') {
        state.player.connections = Math.max(0, (state.player.connections || 0) + delta);
        showToast((delta > 0 ? "+" : "") + delta + " Связей 🤝");
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
        state.garage.forEach(c => {
            if (c) fleetValuation += (c.marketValue || c.basePrice || 100000);
        });
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

    container.innerHTML = `
        <div class="glass-card mb-3 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.18), #090e18); border-color: var(--cyan);">
            <div class="avatar-ring mb-2" style="margin: 0 auto; width: 62px; height: 62px;">
                <div class="avatar-glow"></div>
                <div class="avatar-fx-glow"></div>
                <div class="avatar" style="width: 54px; height: 54px; font-size: 22px;">
                    <i class="fa-solid fa-user-ninja"></i>
                </div>
            </div>

            <h3 class="font-bold text-xs" style="font-size:16px;">${p.name || 'Перекуп #777'}</h3>
            <div class="sub-label mt-1 font-bold color-cyan">${rankTitle} (Уровень ${lvl})</div>

            <div class="flex-between mt-3 pt-2" style="border-top: 1px dashed rgba(255,255,255,0.08);">
                <button onclick="ThemeManager.openCustomizer()" class="btn btn-purple btn-sm btn-auto" style="font-size:10px;">
                    🎨 Скин & Эффекты
                </button>
                <button onclick="openPatchNotesModal()" class="btn btn-dark btn-sm btn-auto" style="font-size:10px;">
                    <i class="fa-solid fa-bolt color-amber"></i> Патчноут ${window.CURRENT_GAME_VERSION}
                </button>
            </div>
        </div>

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
                <button onclick="syncCloudStorageManual()" class="btn btn-cyan btn-sm">
                    <i class="fa-solid fa-rotate"></i> Синхронизация
                </button>
                <button onclick="openSaveManagerModal()" class="btn btn-dark btn-sm">
                    <i class="fa-solid fa-file-export"></i> Экспорт кода
                </button>
            </div>
            <button onclick="resetGameData()" class="btn btn-danger btn-sm w-full">
                <i class="fa-solid fa-trash-can mr-1"></i> Сбросить прогресс
            </button>
        </div>
    `;
}

// ========================================================
// 16. НАВИГАЦИЯ
// ========================================================
function switchTab(tabId) {
    if (window.AudioFx) {
        window.AudioFx.play('tick');
        window.AudioFx.haptic('light');
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
// 17. СТАРТ ПРИЛОЖЕНИЯ И ГЛАВНЫЙ ТАЙМЕР
// ========================================================
function initApp() {
    initTelegramAuthAndStorage(async () => {
        checkPlayerOnboarding(async () => {
            updateHeaderUI();
            updateLevelGatesUI();
            applyLanguageToDOM();
            if (window.ThemeManager) window.ThemeManager.init();
            checkRealTimeDayChange();

            if (window.FB_Bridge?.CarsCatalog) {
                try {
                    await window.FB_Bridge.CarsCatalog.fetchCloudCars();
                } catch(e) {}
            }

            if (typeof renderGarage === 'function') renderGarage();
            if (typeof renderSalesLot === 'function') renderSalesLot();
            if (typeof renderMarketFeed === 'function') renderMarketFeed();

            if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.init === 'function') {
                PhoneManager.init();
            }

            if (window.FB_Bridge?.Notifications && typeof PhoneManager !== 'undefined') {
                try {
                    const notifs = await window.FB_Bridge.Notifications.fetchMyNotifications(tgUserId);
                    if (notifs && notifs.length > 0) {
                        notifs.forEach(n => {
                            if (n.type === 'deal_payout' && n.amount > 0) {
                                state.player.cash = (state.player.cash || 0) + Number(n.amount);
                                if (typeof logBankTransaction === 'function') {
                                    logBankTransaction(`P2P выплата: ${n.title || 'Продажа лота'}`, n.amount, true);
                                }
                                window.FB_Bridge.Notifications.claimNotificationPayout(n.id);
                            }
                        });
                        saveState();
                        updateHeaderUI();
                    }
                } catch (e) {
                    console.warn("[Notifications] Ошибка загрузки:", e);
                }
            }

            switchTab('tabMarket');
        });
    });
}

let gameCycleSeconds = 0;

setInterval(() => {
    gameCycleSeconds++;

    if (gameCycleSeconds % 60 === 0) {
        checkRealTimeDayChange();
    }

    // ⭐ v2.2.0: блок biz-tick УДАЛЁН — теперь его делает PhoneBusiness.tickIncome()
    // (запускается автоматически из phone-business.js каждые 30 сек)

    if (gameCycleSeconds % 45 === 0 && state.player) {
        state.player.hunger = Math.max(0, (state.player.hunger || 80) - 1);
        state.player.mood = Math.max(0, (state.player.mood || 85) - 1);
        updateHeaderUI();
    }

    const mTab = document.getElementById('tabMarket');
    if (mTab && mTab.classList.contains('active') && typeof updateMarketTimers === 'function') {
        updateMarketTimers();
    }
}, 1000);

// Экспорт ядра
window.initApp = initApp;
window.switchTab = switchTab;
window.saveState = saveState;
window.updateHeaderUI = updateHeaderUI;
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
window.migrateSave = migrateSave;
window.SAVE_VERSION = SAVE_VERSION;
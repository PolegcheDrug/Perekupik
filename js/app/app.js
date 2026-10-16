// ========================================================
// js/app/app.js — ЯДРО СИМУЛЯТОРА, РОЛЛЕР И ACCESS CONTROL (v4.2.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v4.2.0 (SPRINT 1):
//   - Клонирование .user-stats-row для marquee-прокрутки
//   - #playerLvl обновляется во всех клонах через data-clone-of
//   - showToast(msg, type) — варианты success/error/warning/info
//   - Плавающий курс Stars (динамическая ставка в банке)
//   - Save v14: миграция Stars ×10 (курс 2,500 → 25,000 ₽)
//   - Фикс конфликта window.AppMessenger (M+ побеждает)
// ⭐ v4.1.0 (ФИКСЫ БИЗНЕСА И ГЕНЕРАЦИИ ТРАНСПОРТА):
//   - Форсированный populateMarketFeed через 1.5 сек
//   - Форсированный PhoneBusiness.ensureState через 0.8 сек
//   - Owner-кнопка внизу справа + кнопка в профиле
//   - Offline-баннер
// ========================================================

window.CURRENT_GAME_VERSION = "v4.2.0";

let tgUserId = null;
let tgUserData = null;
let isPcDevSession = false;

const SAVE_VERSION = 14;
let SAVE_KEY_PREFIX = "perekup_v14_";

let cloudSaveDebounceTimer = null;
let isCloudStorageAvailable = false;

let displayedCashValue = 0;
let displayedStarsValue = 0;
let activeNumberAnimators = {};

let _notificationUnsubscribe = null;
let _isOnline = true;

// ⭐ v4.2.0: плавающий курс Stars
const STAR_RATE_MIN = 22000;
const STAR_RATE_MAX = 28000;
const STAR_RATE_DEFAULT = 25000;

window.isPcDevMode = function() {
    return isPcDevSession === true || String(tgUserId || '').startsWith('pc_dev_');
};

function _fmtMoney(val) {
    if (window.GameHelpers && window.GameHelpers.formatMoney) {
        return window.GameHelpers.formatMoney(val);
    }
    return (Math.round(Number(val) || 0)).toLocaleString('ru-RU') + ' ₽';
}

function _safeNum(val, fb = 0) {
    if (window.GameHelpers && window.GameHelpers.safeNum) {
        return window.GameHelpers.safeNum(val, fb);
    }
    const n = Number(val);
    return isNaN(n) || !isFinite(n) ? fb : n;
}

function _isOwner() {
    if (window.GameHelpers && typeof window.GameHelpers.isOwnerUser === 'function') {
        return window.GameHelpers.isOwnerUser();
    }
    if (window.AccessControl && typeof window.AccessControl.isOwner === 'function') {
        return window.AccessControl.isOwner(tgUserId);
    }
    return false;
}

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
// 2. МЕНЕДЖЕР МОДАЛЬНЫХ ОКОН
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
// 3. АНИМИРОВАННЫЙ РОЛЛЕР И УВЕДОМЛЕНИЯ
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

    // ⭐ v4.2.0: обновляем все клоны (для marquee-анимации)
    try {
        document.querySelectorAll(`[data-clone-of="${id}"]`).forEach(cloneEl => {
            cloneEl.innerHTML = val;
        });
    } catch (e) {}
}

// ⭐ v4.2.0: showToast с вариантами
let _toastHideTimer = null;

function showToast(msg, type = 'default') {
    const t = document.getElementById('toastNotification');
    if (!t) return;

    // Сброс прежнего состояния
    t.className = 'toast';

    // Накатываем variant-класс
    if (type && type !== 'default') {
        t.classList.add('toast-' + type);
    }

    t.innerText = msg;

    // Форсируем reflow для перезапуска анимации
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
window.logBankTransaction = logBankTransaction;

// ========================================================
// 4. ВЕРДИКТ-МОДАЛКА
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
// 5. ЭКРАН "ДОСТУП ЗАКРЫТ"
// ========================================================
function showAccessDeniedScreen() {
    const deniedScreen = document.getElementById('accessDeniedScreen');
    const appShell = document.getElementById('appShell');
    const pcAuth = document.getElementById('pcAuthScreen');
    const tgScreen = document.getElementById('tgRequiredScreen');

    if (deniedScreen) deniedScreen.style.display = 'flex';
    if (appShell) appShell.style.display = 'none';
    if (pcAuth) pcAuth.style.display = 'none';
    if (tgScreen) tgScreen.style.display = 'none';

    console.warn('[App] 🔒 Доступ закрыт — требуется инвайт-код');
}

// ========================================================
// 6. OWNER-ПАНЕЛЬ (кнопка внизу справа)
// ========================================================
function createOwnerPanelButton() {
    const existing = document.getElementById('ownerPanelBtn');
    if (existing) existing.remove();

    if (!_isOwner()) return;

    const btn = document.createElement('button');
    btn.id = 'ownerPanelBtn';
    btn.className = 'owner-panel-btn';
    btn.title = 'Owner-панель управления доступом';
    btn.innerHTML = '👑';
    btn.onclick = () => {
        if (window.AccessControl && typeof window.AccessControl.openOwnerPanel === 'function') {
            window.AccessControl.openOwnerPanel();
        } else {
            showToast('⚠️ AccessControl не загружен', 'warning');
        }
    };
    document.body.appendChild(btn);

    console.log('[App] 👑 Owner-панель добавлена');
}

// ========================================================
// 7. OFFLINE-БАННЕР
// ========================================================
function createOfflineBanner() {
    let banner = document.getElementById('offlineBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offlineBanner';
        banner.className = 'offline-banner';
        banner.innerHTML = '<i class="fa-solid fa-wifi"></i> Нет подключения к сети';
        document.body.appendChild(banner);
    }
}

function updateOnlineStatus(online) {
    _isOnline = online;
    const banner = document.getElementById('offlineBanner');
    if (banner) {
        banner.classList.toggle('visible', !online);
    }
    if (!online && typeof showToast === 'function') {
        showToast('⚠️ Потеряно соединение с сетью', 'warning');
    }
}

function setupOnlineListeners() {
    createOfflineBanner();
    window.addEventListener('online', () => updateOnlineStatus(true));
    window.addEventListener('offline', () => updateOnlineStatus(false));
    updateOnlineStatus(navigator.onLine);
}

// ========================================================
// 8. ДЕФОЛТНЫЙ STATE
// ========================================================
const DEFAULT_STATE = {
    lang: 'ru',
    __saveVersion: SAVE_VERSION,
    marketFeedVersion: 0,
    mEventsFeed: [],

    player: {
        name: "Перекуп #777",
        uid: null,
        onboardingDone: false,
        avatarUrl: null, cash: 150000, stars: 15, connections: 1,
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
        housingRentDue: 0,
        ownedHouses: [],
        mortgage: null,
        interior: {},
        hudColorId: 'cyber_neon',
        themePresetId: 'default',
        customHexColor: null,
        nickEffect: 'none',
        avatarEffect: 'none',
        ownedThemes: ['cyber_neon'],
        ownedNickEffects: ['none'],
        ownedAvatarEffects: ['none'],
        ownedTitles: ['cash_buyer'],
        soundProfile: 'cyber',
        crypto: { btc: 0, eth: 0, staked: [], prices: { btc: 9500000, eth: 340000 } },
        bankReputation: {
            rating: 5.0, successfulDeals: 0, fairDealsCount: 0, scandalsCount: 0,
            vipBankTier: 'Стандарт', loanLimit: 500000,
            reviewsLog: [
                { author: "Алексей В.", rating: 5, date: "Недавно", text: "Отличный продавец, машина в идеале!" },
                { author: "Сергей Д.", rating: 5, date: "Недавно", text: "Честный парень, Launch показал чистый блок!" }
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
        paidParking: { maxCars: 3, cars: [], dailyRate: 200, lastChargeDay: 0 },
        mEventReactions: {},
        unlockedApps: [],
        hasGpsTracker: false,
        hasCustomsPass: false,
        businessAdBonus: null,
        businessAchievements: [],
        businessSalesCount: 0,
        ownedBizSkins: [],
        ownedBizStickers: [],
        _processedNotifIds: [],
        pendingFriendRequests: [],
        incomingTradeOffers: [],
        platesInventory: [],
        // ⭐ v4.2.0: плавающий курс Stars
        dynamicStarRate: STAR_RATE_DEFAULT,
        dynamicStarRateHistory: []
    },
    garage: [], salesLot: [], contracts: [], plateCatalog: [],
    ownedPlates: ["В777ВВ 77"], registeredPlates: ["В777ВВ 77"],
    activeCategory: 'economy', marketFeed: [], p2pMode: 'cars', syndicateSubTab: 'contracts',
    myP2PListings: [], p2pMarketListings: [], businesses: [], confiscatedLot: null, blackMarketPlates: [],
    officialPlateAuction: [],
    marketModifiers: { economy: 1, comfort: 1, premium: 1, hyper: 1, moto: 1, truck: 1, all: 1 },
    lifeChatMessages: [], friendsList: [],
    businessWorkshop: { equipment: 0, storage: 0, brand: 0, diagnostics: 0 },
    businessStaff: { mechanic: 0, painter: 0, manager: 0, accountant: 0 },
    businessFleet: []
};

window.DEFAULT_STATE = DEFAULT_STATE;

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
window.state = state;

window.__marketRenderToken = 0;
window.__salesLotRenderToken = 0;
window.__IS_RESETTING__ = false;

function t(key) {
    let lang = state.lang || 'ru';
    if (typeof I18N_TRANSLATIONS !== 'undefined' && I18N_TRANSLATIONS[lang] && I18N_TRANSLATIONS[lang][key]) {
        return I18N_TRANSLATIONS[lang][key];
    }
    return key;
}
window.t = t;

// ========================================================
// 9. ЯЗЫК
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
// 10. ЗАДАНИЯ И ВЕХИ
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
// 11. СЛОТЫ ГАРАЖА
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
// 12. TELEGRAM CLOUD
// ========================================================
const CHUNK_SIZE = 2048;

function prepareStateForCloud() {
    return JSON.stringify(state);
}

function saveToTelegramCloud(jsonString, callback) {
    if (!window.Telegram?.WebApp?.CloudStorage) return;
    if (!tgUserId || tgUserId === "guest_777") return;
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
// ⭐ v4.2.0: 13. МИГРАЦИЯ СЕЙВА (Stars ×10, Save v14)
// ========================================================
function migrateSave(parsed) {
    if (!parsed || typeof parsed !== 'object') return parsed;
    const currentVersion = parsed.__saveVersion || 9;

    if (currentVersion < 10) {
        console.log(`[Migration] v${currentVersion} → v10`);
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
            if (!parsed.player.mEventReactions || typeof parsed.player.mEventReactions !== 'object') parsed.player.mEventReactions = {};
            if (parsed.player.businessAdBonus === undefined) parsed.player.businessAdBonus = null;
            if (!Array.isArray(parsed.player.businessAchievements)) parsed.player.businessAchievements = [];
            if (typeof parsed.player.businessSalesCount !== 'number') parsed.player.businessSalesCount = 0;
            if (!Array.isArray(parsed.player.ownedBizSkins)) parsed.player.ownedBizSkins = [];
            if (!Array.isArray(parsed.player.ownedBizStickers)) parsed.player.ownedBizStickers = [];

            if (!parsed.player.interior || typeof parsed.player.interior !== 'object') parsed.player.interior = {};
            if (typeof parsed.player.housingRentDue !== 'number') parsed.player.housingRentDue = 0;
            if (!Array.isArray(parsed.player.ownedHouses)) parsed.player.ownedHouses = [];
            if (parsed.player.mortgage === undefined) parsed.player.mortgage = null;
        }
        if (!Array.isArray(parsed.mEventsFeed)) parsed.mEventsFeed = [];
        if (!parsed.businessWorkshop || typeof parsed.businessWorkshop !== 'object') {
            parsed.businessWorkshop = { equipment: 0, storage: 0, brand: 0, diagnostics: 0 };
        }
        if (!parsed.businessStaff || typeof parsed.businessStaff !== 'object') {
            parsed.businessStaff = { mechanic: 0, painter: 0, manager: 0, accountant: 0 };
        }
        if (!Array.isArray(parsed.businessFleet)) parsed.businessFleet = [];
        parsed.marketFeedVersion = (parsed.marketFeedVersion || 0) + 1;
    }

    if (currentVersion < 11) {
        console.log(`[Migration] v${currentVersion} → v11 (косметика)`);
        if (parsed.player && typeof parsed.player === 'object') {
            if (!Array.isArray(parsed.player.ownedThemes)) {
                parsed.player.ownedThemes = ['cyber_neon'];
                if (parsed.player.hudColorId && parsed.player.hudColorId !== 'cyber_neon') {
                    parsed.player.ownedThemes.push(parsed.player.hudColorId);
                }
                if (parsed.player.themePresetId === 'cyber_black_neo') {
                    parsed.player.ownedThemes.push('cyber_black_neo');
                }
            }
            if (!Array.isArray(parsed.player.ownedNickEffects)) parsed.player.ownedNickEffects = ['none'];
            if (!Array.isArray(parsed.player.ownedAvatarEffects)) parsed.player.ownedAvatarEffects = ['none'];
            if (!Array.isArray(parsed.player.ownedTitles)) parsed.player.ownedTitles = ['cash_buyer'];
            if (typeof parsed.player.streakDay !== 'number') parsed.player.streakDay = 1;
        }
    }

    if (currentVersion < 12) {
        console.log(`[Migration] v${currentVersion} → v12 (склад/парковка/номера)`);
        if (parsed.player && typeof parsed.player === 'object') {
            if (!parsed.player.paidParking || typeof parsed.player.paidParking !== 'object') {
                parsed.player.paidParking = { maxCars: 3, cars: [], dailyRate: 200, lastChargeDay: 0 };
            } else {
                if (!Array.isArray(parsed.player.paidParking.cars)) parsed.player.paidParking.cars = [];
                if (typeof parsed.player.paidParking.maxCars !== 'number') parsed.player.paidParking.maxCars = 3;
                if (typeof parsed.player.paidParking.dailyRate !== 'number') parsed.player.paidParking.dailyRate = 200;
                if (typeof parsed.player.paidParking.lastChargeDay !== 'number') parsed.player.paidParking.lastChargeDay = 0;
            }

            if (!parsed.player.warehouse || typeof parsed.player.warehouse !== 'object') {
                parsed.player.warehouse = { maxCars: 6, maxItems: 12, cars: [], items: [] };
            } else {
                if (!Array.isArray(parsed.player.warehouse.cars)) parsed.player.warehouse.cars = [];
                if (!Array.isArray(parsed.player.warehouse.items)) parsed.player.warehouse.items = [];
                if (typeof parsed.player.warehouse.maxCars !== 'number') parsed.player.warehouse.maxCars = 6;
                if (typeof parsed.player.warehouse.maxItems !== 'number') parsed.player.warehouse.maxItems = 12;
            }

            if (!Array.isArray(parsed.player.platesInventory)) {
                parsed.player.platesInventory = [];
            }
        }
    }

    if (currentVersion < 13) {
        console.log(`[Migration] v${currentVersion} → v13 (access control)`);
        if (parsed.player && typeof parsed.player === 'object') {
            if (!Array.isArray(parsed.player._processedNotifIds)) parsed.player._processedNotifIds = [];
            if (!Array.isArray(parsed.player.pendingFriendRequests)) parsed.player.pendingFriendRequests = [];
            if (!Array.isArray(parsed.player.incomingTradeOffers)) parsed.player.incomingTradeOffers = [];
            if (!Array.isArray(parsed.player.platesInventory)) parsed.player.platesInventory = [];
        }
    }

    // ⭐ v4.2.0: v13 → v14 (Stars ×10 + плавающий курс)
    if (currentVersion < 14) {
        console.log(`[Migration] v${currentVersion} → v14 (Stars ×10, курс 25,000 ₽)`);
        if (parsed.player && typeof parsed.player === 'object') {
            // Старые Stars ×10 (курс 2,500 → 25,000 ₽)
            if (typeof parsed.player.stars === 'number' && parsed.player.stars > 0) {
                const oldStars = parsed.player.stars;
                parsed.player.stars = oldStars * 10;
                console.log(`[Migration] Stars: ${oldStars} → ${parsed.player.stars} (×10)`);
            }

            // Все цены в Stars, которые были в сейве (суперспин-билеты и т.п.)
            // пересчитывать не нужно — они и так в штуках, не в рублях

            // Динамический курс Stars
            if (typeof parsed.player.dynamicStarRate !== 'number') {
                parsed.player.dynamicStarRate = STAR_RATE_DEFAULT;
            }
            if (!Array.isArray(parsed.player.dynamicStarRateHistory)) {
                parsed.player.dynamicStarRateHistory = [];
            }
        }
    }

    parsed.__saveVersion = SAVE_VERSION;
    return parsed;
}

// ========================================================
// 14. ЭКРАН "ТРЕБУЕТСЯ TELEGRAM"
// ========================================================
function showTelegramRequiredScreen() {
    if (window.isPcDevMode()) {
        console.log('[App] DEV-режим активен, экран Telegram НЕ показывается');
        return;
    }
    if (tgUserId && !String(tgUserId).startsWith('guest_')) {
        console.log('[App] UID уже установлен:', tgUserId);
        return;
    }

    const tgScreen = document.getElementById('tgRequiredScreen');
    const appShell = document.getElementById('appShell');
    const pcAuth = document.getElementById('pcAuthScreen');
    const denied = document.getElementById('accessDeniedScreen');

    if (tgScreen) tgScreen.style.display = 'flex';
    if (appShell) appShell.style.display = 'none';
    if (pcAuth) pcAuth.style.display = 'none';
    if (denied) denied.style.display = 'none';

    console.warn('[App] ⛔ Telegram не обнаружен и DEV-режим не активирован.');
}
window.showTelegramRequiredScreen = showTelegramRequiredScreen;

// ========================================================
// 15. ИНИЦИАЛИЗАЦИЯ С ACCESS CONTROL
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
        console.warn("[App] Watchdog инициализации сработал.");
        safeCallback();
    }, 3000);

    // ─── ЭТАП 1: Telegram ───
    let tgUser = null;
    try {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();

            tgUser = tg.initDataUnsafe?.user || null;
            if (tgUser && tgUser.id) {
                tgUserData = tgUser;
                tgUserId = String(tgUser.id);
                console.log('[Auth] Telegram ID установлен:', tgUserId);
            }
        }
    } catch (e) {
        console.warn("[Auth] Ошибка Telegram WebApp:", e);
    }

    if (!tgUser || !tgUser.id) {
        if (window.tgUserId && String(window.tgUserId).startsWith('pc_dev_')) {
            console.log('[Auth] DEV-режим обнаружен, UID:', window.tgUserId);
            tgUserId = String(window.tgUserId);
            isPcDevSession = true;
            tgUserData = {
                id: tgUserId,
                first_name: 'DEV',
                last_name: 'Player',
                username: 'dev_player'
            };
        } else {
            console.error('[Auth] ⛔ Нет Telegram-пользователя и DEV-режим не активирован.');
            clearTimeout(watchdogTimer);
            showTelegramRequiredScreen();
            return;
        }
    } else {
        tgUserId = String(tgUser.id);
    }

    // ─── ЭТАП 2: AccessControl ───
    try {
        if (window.AccessControl && typeof window.AccessControl.checkAccess === 'function') {
            console.log('[App] 🔐 Проверка доступа через AccessControl...');
            const accessRes = await window.AccessControl.checkAccess(tgUserId);

            if (!accessRes || accessRes.success !== true) {
                console.warn('[App] ❌ Доступ запрещён:', accessRes?.reason || 'unknown');
                clearTimeout(watchdogTimer);
                showAccessDeniedScreen();

                const reason = accessRes?.reason || '';
                let msg = 'Требуется приглашение';
                let type = 'warning';
                if (reason === 'banned') { msg = '🚫 Вы забанены владельцем игры'; type = 'error'; }
                else if (reason === 'not_whitelisted') { msg = '🔒 Игра доступна только по приглашению'; type = 'warning'; }
                else if (reason === 'offline_no_cache') { msg = '⚠️ Нет сети и нет сохранённого доступа'; type = 'warning'; }

                setTimeout(() => { if (typeof showToast === 'function') showToast(msg, type); }, 500);
                return;
            }

            console.log('[App] ✅ Доступ разрешён:', accessRes.reason);
            if (accessRes.isOwner) {
                console.log('[App] 👑 Владелец игры обнаружен');
            }
        } else {
            console.warn('[App] ⚠️ AccessControl не загружен — пропускаем проверку');
        }
    } catch (e) {
        console.warn('[App] Ошибка AccessControl, продолжаем (fallback):', e);
    }

    // ─── ЭТАП 3: Firebase Auth ───
    if (window.FB_Bridge?.Auth) {
        try {
            const authRes = await window.FB_Bridge.Auth.initSession();
            console.log('[Auth] initSession результат:', authRes);
        } catch (e) {
            console.warn('[Auth] initSession упал:', e);
        }
    }

    if (window.FB_Bridge?.Auth?._forceVerifiedUserId) {
        window.FB_Bridge.Auth._forceVerifiedUserId(tgUserId);
    }

    // ─── ЭТАП 4: Сейв ───
    const hadLocalSave = loadFromLocalStorage();

    if (!hadLocalSave && !isPcDevSession && window.FB_Bridge?.Players?.pullSave) {
        try {
            const cloudSave = await window.FB_Bridge.Players.pullSave(tgUserId);
            if (cloudSave) {
                applyLoadedState(cloudSave);
                console.log("[Cloud] Прогресс восстановлен из Firestore");
                showToast("☁️ Прогресс синхронизирован из облака!", 'success');
            }
        } catch (e) {
            console.warn("[Cloud] Ошибка pullSave:", e);
        }
    }

    // ─── ЭТАП 5: Имя и аватар ───
    if (tgUser && state.player) {
        let names = [];
        if (tgUser.first_name) names.push(tgUser.first_name);
        if (tgUser.last_name) names.push(tgUser.last_name);
        const fullName = names.join(' ').trim();

        const currentName = state.player.name || "";
        const isDefaultName = !currentName || currentName === "Перекуп #777" || currentName.startsWith("Гость");

        if (isDefaultName && fullName) state.player.name = fullName;
        if (tgUser.photo_url) state.player.avatarUrl = tgUser.photo_url;
    }

    if (isPcDevSession && state.player) {
        if (!state.player.name || state.player.name === "Перекуп #777") {
            state.player.name = "DEV_Перекуп";
        }
    }

    state.player.uid = String(tgUserId);

    // ─── ЭТАП 6: Owner — все приложения ───
    if (_isOwner() && state.player) {
        if (!Array.isArray(state.player.unlockedApps)) state.player.unlockedApps = [];
        const allApps = ['barn', 'containers', 'autopodbor_order', 'street', 'darknet'];
        allApps.forEach(app => {
            if (!state.player.unlockedApps.includes(app)) {
                state.player.unlockedApps.push(app);
            }
        });
        console.log('[App] 👑 Owner получил все приложения:', allApps);
    }

    // ─── ЭТАП 7: Каталог машин из Firestore ───
    if (window.FB_Bridge?.CarsCatalog && !isPcDevSession) {
        try { await window.FB_Bridge.CarsCatalog.seedDefaultCarsCatalog(); } catch (e) {}
    }

    clearTimeout(watchdogTimer);
    safeCallback();
}

function loadFromLocalStorage() {
    if (!tgUserId) return false;
    try {
        let saved = localStorage.getItem("perekup_save_" + tgUserId);
        if (!saved) saved = localStorage.getItem("perekup_v13_" + tgUserId);
        if (!saved) saved = localStorage.getItem("perekup_v12_" + tgUserId);
        if (!saved) saved = localStorage.getItem("perekup_v11_" + tgUserId);
        if (!saved) saved = localStorage.getItem(SAVE_KEY_PREFIX + tgUserId);

        if (saved) {
            const parsed = JSON.parse(saved);
            applyLoadedState(parsed);
            return true;
        }
        applyLoadedState({});
        return false;
    } catch(e) {
        console.warn("[Local] Ошибка загрузки:", e);
        applyLoadedState({});
        return false;
    }
}

function applyLoadedState(parsed) {
    if (!parsed) parsed = {};
    parsed = migrateSave(parsed);

    if (parsed.lang) state.lang = parsed.lang;

    if (typeof parsed.marketFeedVersion === 'number') state.marketFeedVersion = parsed.marketFeedVersion;
    else state.marketFeedVersion = 0;

    if (Array.isArray(parsed.mEventsFeed)) state.mEventsFeed = parsed.mEventsFeed;
    else state.mEventsFeed = [];

    if (parsed.player) {
        state.player = { ...DEFAULT_STATE.player, ...parsed.player };
        if (parsed.player.stats) state.player.stats = { ...DEFAULT_STATE.player.stats, ...parsed.player.stats };
        if (parsed.player.tools) state.player.tools = { ...DEFAULT_STATE.player.tools, ...parsed.player.tools };
        if (parsed.player.toolsWear) state.player.toolsWear = { ...DEFAULT_STATE.player.toolsWear, ...parsed.player.toolsWear };
        if (parsed.player.crypto) state.player.crypto = { ...DEFAULT_STATE.player.crypto, ...parsed.player.crypto };
        if (parsed.player.bankReputation) state.player.bankReputation = { ...DEFAULT_STATE.player.bankReputation, ...parsed.player.bankReputation };
        if (parsed.player.phoneWidgetsCollapsed) state.player.phoneWidgetsCollapsed = { ...DEFAULT_STATE.player.phoneWidgetsCollapsed, ...parsed.player.phoneWidgetsCollapsed };
        if (parsed.player.club) state.player.club = parsed.player.club;

        if (!state.player.interior || typeof state.player.interior !== 'object') state.player.interior = {};
        if (!Array.isArray(state.player.ownedHouses)) state.player.ownedHouses = [];
        if (typeof state.player.housingRentDue !== 'number') state.player.housingRentDue = 0;
        if (state.player.mortgage === undefined) state.player.mortgage = null;

        if (!Array.isArray(state.player.ownedThemes)) state.player.ownedThemes = ['cyber_neon'];
        if (!Array.isArray(state.player.ownedNickEffects)) state.player.ownedNickEffects = ['none'];
        if (!Array.isArray(state.player.ownedAvatarEffects)) state.player.ownedAvatarEffects = ['none'];
        if (!Array.isArray(state.player.ownedTitles)) state.player.ownedTitles = ['cash_buyer'];

        if (!Array.isArray(state.player.phoneMessages)) state.player.phoneMessages = [];
        if (!Array.isArray(state.player.dailyQuests)) state.player.dailyQuests = [];
        if (!Array.isArray(state.player.bankHistory)) state.player.bankHistory = [];
        if (!Array.isArray(state.player.bankDeposits)) state.player.bankDeposits = [];
        if (!Array.isArray(state.player.mailbox)) state.player.mailbox = [];
        if (!Array.isArray(state.player.unlockedApps)) state.player.unlockedApps = [];
        if (!Array.isArray(state.player.businessAchievements)) state.player.businessAchievements = [];
        if (!Array.isArray(state.player.ownedBizSkins)) state.player.ownedBizSkins = [];
        if (!Array.isArray(state.player.ownedBizStickers)) state.player.ownedBizStickers = [];
        if (!state.player.mEventReactions || typeof state.player.mEventReactions !== 'object') state.player.mEventReactions = {};

        if (!Array.isArray(state.player._processedNotifIds)) state.player._processedNotifIds = [];
        if (!Array.isArray(state.player.pendingFriendRequests)) state.player.pendingFriendRequests = [];
        if (!Array.isArray(state.player.incomingTradeOffers)) state.player.incomingTradeOffers = [];
        if (!Array.isArray(state.player.platesInventory)) state.player.platesInventory = [];

        // ⭐ v4.2.0: динамический курс
        if (typeof state.player.dynamicStarRate !== 'number') {
            state.player.dynamicStarRate = STAR_RATE_DEFAULT;
        }
        if (!Array.isArray(state.player.dynamicStarRateHistory)) {
            state.player.dynamicStarRateHistory = [];
        }

        if (parsed.player.warehouse && typeof parsed.player.warehouse === 'object') {
            state.player.warehouse = { ...DEFAULT_STATE.player.warehouse, ...parsed.player.warehouse };
            if (!Array.isArray(state.player.warehouse.cars)) state.player.warehouse.cars = [];
            if (!Array.isArray(state.player.warehouse.items)) state.player.warehouse.items = [];
        }

        if (parsed.player.paidParking && typeof parsed.player.paidParking === 'object') {
            state.player.paidParking = { ...DEFAULT_STATE.player.paidParking, ...parsed.player.paidParking };
            if (!Array.isArray(state.player.paidParking.cars)) state.player.paidParking.cars = [];
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

    if (parsed.businessWorkshop && typeof parsed.businessWorkshop === 'object') {
        state.businessWorkshop = { ...DEFAULT_STATE.businessWorkshop, ...parsed.businessWorkshop };
    }
    if (parsed.businessStaff && typeof parsed.businessStaff === 'object') {
        state.businessStaff = { ...DEFAULT_STATE.businessStaff, ...parsed.businessStaff };
    }
    if (Array.isArray(parsed.businessFleet)) state.businessFleet = parsed.businessFleet;

    sanitizeState();

    if (window.PlatesManager && typeof window.PlatesManager.syncLegacyOwnedPlates === 'function') {
        try {
            window.PlatesManager.syncLegacyOwnedPlates();
            console.log('[App] PlatesManager.syncLegacyOwnedPlates выполнен');
        } catch (e) {
            console.warn('[App] Ошибка PlatesManager.syncLegacyOwnedPlates:', e);
        }
    }

    if (window.EventBus) {
        window.EventBus.emit('state:loaded', { source: 'applyLoadedState' });
    }
}

function sanitizeState() {
    if (!state.player) state.player = JSON.parse(JSON.stringify(DEFAULT_STATE.player));
    if (!state.player.baseSlots || state.player.baseSlots < 2) state.player.baseSlots = 2;
    if (!state.player.maxExpressTickets) state.player.maxExpressTickets = 25;
    if (typeof state.player.expressTickets !== 'number') state.player.expressTickets = state.player.maxExpressTickets;
    if (typeof state.player.cash !== 'number' || state.player.cash < 0) state.player.cash = 150000;
    if (typeof state.player.stars !== 'number' || state.player.stars < 0) state.player.stars = 15;
    if (!state.player.hudColorId) state.player.hudColorId = 'cyber_neon';
    if (!state.player.soundProfile) state.player.soundProfile = 'cyber';
    if (!state.player.traderTitle) state.player.traderTitle = "Быстрый выкуп за кэш 💸";
    if (!Array.isArray(state.player.mailbox)) state.player.mailbox = [];
    if (!Array.isArray(state.player.unlockedApps)) state.player.unlockedApps = [];
    if (!Array.isArray(state.player.businessAchievements)) state.player.businessAchievements = [];
    if (!Array.isArray(state.player.ownedBizSkins)) state.player.ownedBizSkins = [];
    if (!Array.isArray(state.player.ownedBizStickers)) state.player.ownedBizStickers = [];
    if (typeof state.player.businessSalesCount !== 'number') state.player.businessSalesCount = 0;
    if (!state.player.warehouse) state.player.warehouse = { maxCars: 6, maxItems: 12, cars: [], items: [] };
    if (!Array.isArray(state.player.warehouse.cars)) state.player.warehouse.cars = [];
    if (!Array.isArray(state.player.warehouse.items)) state.player.warehouse.items = [];
    if (!state.player.dailyQuests || state.player.dailyQuests.length === 0) refreshDailyQuestsList();
    if (!state.player.mEventReactions || typeof state.player.mEventReactions !== 'object') state.player.mEventReactions = {};

    if (!Array.isArray(state.player._processedNotifIds)) state.player._processedNotifIds = [];
    if (!Array.isArray(state.player.pendingFriendRequests)) state.player.pendingFriendRequests = [];
    if (!Array.isArray(state.player.incomingTradeOffers)) state.player.incomingTradeOffers = [];
    if (!Array.isArray(state.player.platesInventory)) state.player.platesInventory = [];

    if (!state.player.interior || typeof state.player.interior !== 'object') state.player.interior = {};
    if (!Array.isArray(state.player.ownedHouses)) state.player.ownedHouses = [];
    if (typeof state.player.housingRentDue !== 'number') state.player.housingRentDue = 0;
    if (state.player.mortgage === undefined) state.player.mortgage = null;
    if (!state.player.housingId) state.player.housingId = 'trailer';
    if (!state.player.housingType) state.player.housingType = 'own';

    if (!Array.isArray(state.player.ownedThemes)) {
        state.player.ownedThemes = ['cyber_neon'];
        if (state.player.hudColorId && state.player.hudColorId !== 'cyber_neon') {
            state.player.ownedThemes.push(state.player.hudColorId);
        }
        if (state.player.themePresetId === 'cyber_black_neo') {
            state.player.ownedThemes.push('cyber_black_neo');
        }
    }
    if (!Array.isArray(state.player.ownedNickEffects)) state.player.ownedNickEffects = ['none'];
    if (!Array.isArray(state.player.ownedAvatarEffects)) state.player.ownedAvatarEffects = ['none'];
    if (!Array.isArray(state.player.ownedTitles)) state.player.ownedTitles = ['cash_buyer'];

    if (typeof state.player.streakDay !== 'number' || state.player.streakDay < 0) {
        state.player.streakDay = 1;
    }

    // ⭐ v4.2.0: динамический курс
    if (typeof state.player.dynamicStarRate !== 'number') {
        state.player.dynamicStarRate = STAR_RATE_DEFAULT;
    }
    if (!Array.isArray(state.player.dynamicStarRateHistory)) {
        state.player.dynamicStarRateHistory = [];
    }

    if (!state.player.paidParking || typeof state.player.paidParking !== 'object') {
        state.player.paidParking = { maxCars: 3, cars: [], dailyRate: 200, lastChargeDay: 0 };
    } else {
        if (!Array.isArray(state.player.paidParking.cars)) state.player.paidParking.cars = [];
        if (typeof state.player.paidParking.maxCars !== 'number') state.player.paidParking.maxCars = 3;
        if (typeof state.player.paidParking.dailyRate !== 'number') state.player.paidParking.dailyRate = 200;
        if (typeof state.player.paidParking.lastChargeDay !== 'number') state.player.paidParking.lastChargeDay = 0;
    }

    if (!state.businessWorkshop) state.businessWorkshop = { equipment: 0, storage: 0, brand: 0, diagnostics: 0 };
    if (!state.businessStaff) state.businessStaff = { mechanic: 0, painter: 0, manager: 0, accountant: 0 };
    if (!Array.isArray(state.businessFleet)) state.businessFleet = [];

    state.__saveVersion = SAVE_VERSION;
    if (!Array.isArray(state.mEventsFeed)) state.mEventsFeed = [];
    if (typeof state.marketFeedVersion !== 'number') state.marketFeedVersion = 0;
}

// ========================================================
// 16. СОХРАНЕНИЕ
// ========================================================
function saveState() {
    if (!tgUserId) {
        console.warn('[Save] saveState заблокирован: нет UID');
        return;
    }

    if (String(tgUserId).startsWith('guest_') || String(tgUserId).startsWith('p_')) {
        console.warn('[Save] saveState заблокирован: некорректный UID:', tgUserId);
        return;
    }

    if (window.__IS_RESETTING__) {
        console.log('[Save] Игнорирую saveState — идёт сброс прогресса.');
        return;
    }

    try {
        state.__saveVersion = SAVE_VERSION;

        const fullJson = JSON.stringify(state);
        localStorage.setItem("perekup_save_" + tgUserId, fullJson);
        localStorage.setItem(SAVE_KEY_PREFIX + tgUserId, fullJson);

        if (isPcDevSession) {
            console.log('[Save] DEV-режим: сохранено локально');
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            return;
        }

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

    if (typeof updateHeaderUI === 'function') updateHeaderUI();

    if (window.EventBus) {
        window.EventBus.emit('state:saved', { source: 'saveState' });
    }
}

// ========================================================
// 17. СБРОС ПРОГРЕССА
// ========================================================
function resetGameData() {
    if (!confirm("⚠️ ВНИМАНИЕ! Это полностью сотрёт весь прогресс: гараж, бизнес, деньги, уровень, купленные скины и ВСЁ остальное.\n\nПрогресс будет удалён и из локальной памяти, и из облака Firestore.\n\nПродолжить?")) {
        return;
    }

    if (!confirm("🔴 ВЫ УВЕРЕНЫ? Это действие НЕОБРАТИМО!\n\nНажмите OK, чтобы стереть всё навсегда.")) {
        return;
    }

    window.__IS_RESETTING__ = true;

    try {
        const keysToRemove = new Set();

        keysToRemove.add("perekup_save_" + tgUserId);
        keysToRemove.add("perekup_v10_" + tgUserId);
        keysToRemove.add("perekup_v11_" + tgUserId);
        keysToRemove.add("perekup_v12_" + tgUserId);
        keysToRemove.add("perekup_v13_" + tgUserId);
        keysToRemove.add(SAVE_KEY_PREFIX + tgUserId);
        keysToRemove.add("perekup_save_guest_777");
        keysToRemove.add("perekup_save_777");
        keysToRemove.add("perekup_save_undefined");
        keysToRemove.add('perekoop_sim_save_v105_release');

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (key.includes('perekup_save') || key.includes('perekoop_sim_save')) {
                keysToRemove.add(key);
            }
        }

        keysToRemove.forEach(key => {
            try { localStorage.removeItem(key); } catch (e) {}
            try { sessionStorage.removeItem(key); } catch (e) {}
        });

        try {
            if (window.Telegram?.WebApp?.CloudStorage) {
                const tgCloud = window.Telegram.WebApp.CloudStorage;
                tgCloud.getKeys((err, keys) => {
                    if (!err && Array.isArray(keys)) {
                        keys.forEach(k => {
                            if (k && (k.includes('perekup') || k.includes('perekoop'))) {
                                try { tgCloud.removeItem(k, () => {}); } catch (e) {}
                            }
                        });
                    }
                });
            }
        } catch (e) {}

        if (!isPcDevSession) {
            (async () => {
                try {
                    if (window.FB_Bridge?.db && tgUserId) {
                        const uid = String(tgUserId);
                        const mod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
                        const { doc, deleteDoc } = mod;
                        const collectionsToWipe = ['players', 'garages', 'leaderboard'];
                        for (const colName of collectionsToWipe) {
                            try {
                                await deleteDoc(doc(window.FB_Bridge.db, colName, uid));
                                console.log(`[Reset] Удалён Firestore: ${colName}/${uid}`);
                            } catch (e) {}
                        }
                    }
                } catch (e) {
                    console.warn('[Reset] Ошибка очистки Firestore:', e);
                }
            })();
        }

        try {
            const cleanState = JSON.parse(JSON.stringify(DEFAULT_STATE));
            Object.keys(state).forEach(k => { delete state[k]; });
            Object.assign(state, cleanState);
            state.__saveVersion = SAVE_VERSION;
            window.state = state;
        } catch (e) {}

        try {
            if (window.gameCycleInterval) clearInterval(window.gameCycleInterval);
            if (window.salesLotTimerInterval) clearInterval(window.salesLotTimerInterval);
            if (window.PhoneBusiness?._tickInterval) clearInterval(PhoneBusiness._tickInterval);
            for (let i = 1; i < 99999; i++) { window.clearInterval(i); window.clearTimeout(i); }
        } catch (e) {}

        if (window.AudioFx) window.AudioFx.haptic('warning');
        if (typeof showToast === 'function') showToast("🗑️ Прогресс полностью сброшен! Перезагрузка...", 'success');

        if (window.EventBus) {
            window.EventBus.emit('state:reset', { reason: 'user_action' });
        }

        setTimeout(() => {
            const cleanUrl = window.location.href.split('?')[0];
            window.location.href = cleanUrl + '?reset=' + Date.now();
            setTimeout(() => { window.location.reload(true); }, 200);
        }, 1200);

    } catch (e) {
        console.error('[Reset] Критическая ошибка:', e);
        alert('Ошибка при сбросе: ' + (e.message || e));
        window.location.reload();
    }
}

// ========================================================
// 18. CLOUD / SAVE MANAGER
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
// 19. СУТОЧНЫЙ ЦИКЛ
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

// ⭐ v4.2.0: динамический курс Stars — плавный дрейф
function _updateDynamicStarRate() {
    if (!state.player) return;

    const prev = state.player.dynamicStarRate || STAR_RATE_DEFAULT;
    // Плавный дрейф: ±0.5% от предыдущего значения
    const drift = (Math.random() - 0.5) * 0.01; // ±0.5%
    let next = Math.round(prev * (1 + drift));

    // Ограничиваем коридор
    next = Math.max(STAR_RATE_MIN, Math.min(STAR_RATE_MAX, next));

    // Округляем до 100 ₽ — красиво
    next = Math.round(next / 100) * 100;

    state.player.dynamicStarRate = next;

    // Пишем в историю (последние 30 дней)
    if (!Array.isArray(state.player.dynamicStarRateHistory)) {
        state.player.dynamicStarRateHistory = [];
    }
    state.player.dynamicStarRateHistory.push(next);
    if (state.player.dynamicStarRateHistory.length > 30) {
        state.player.dynamicStarRateHistory = state.player.dynamicStarRateHistory.slice(-30);
    }

    console.log(`[Stars] Динамический курс: ${next.toLocaleString()} ₽ (было ${prev.toLocaleString()})`);
}

// ⭐ v4.2.0: синхронизация курса в BANK_EXCHANGE_RATES
function _syncStarRateToBank() {
    if (!state.player) return;
    const rate = state.player.dynamicStarRate || STAR_RATE_DEFAULT;
    if (window.BANK_EXCHANGE_RATES && window.BANK_EXCHANGE_RATES.stars) {
        window.BANK_EXCHANGE_RATES.stars.buyRub = rate;
        window.BANK_EXCHANGE_RATES.stars.sellRub = Math.round(rate * 0.96); // спред 4%
    }
}

function executeDayCycleMidnight(currentDateObj) {
    state.player.day = (state.player.day || 1) + 1;
    state.player.lastRealDayTimestamp = currentDateObj.getTime();
    state.player.expressTickets = state.player.maxExpressTickets || 25;
    state.player.consecutiveRaces = 0;

    // ⭐ v4.2.0: Обновляем динамический курс Stars
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
// 20. УНИКАЛЬНЫЕ ID
// ========================================================
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
    if (!car.vin) car.vin = generateVehicleVIN(car.make || car.name || 'AUT');
    if (!car.uid) car.uid = 'car_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    return car;
}
window.generateVehicleVIN = generateVehicleVIN;
window.ensureCarIdentity = ensureCarIdentity;

// ========================================================
// 21. ОНБОРДИНГ
// ========================================================
function checkPlayerOnboarding(onComplete) {
    if (!state.player) state.player = {};

    const validUid = tgUserId || window.tgUserId;
    if (!validUid) {
        console.error('[Onboarding] Нет UID — блокируем');
        showTelegramRequiredScreen();
        return;
    }

    if (String(validUid).startsWith('guest_') || String(validUid).startsWith('p_')) {
        console.error('[Onboarding] Некорректный UID — блокируем');
        showTelegramRequiredScreen();
        return;
    }

    state.player.uid = String(validUid);

    if (state.player.onboardingDone === true) {
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    if (_isOwner()) {
        console.log('[Onboarding] Owner — автоматический пропуск');
        state.player.onboardingDone = true;
        state.player.name = state.player.name || "Owner";
        saveState();
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    if (isPcDevSession) {
        state.player.onboardingDone = true;
        state.player.name = state.player.name || "DEV_Перекуп";
        saveState();
        if (typeof onComplete === 'function') onComplete();
        return;
    }

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
                Придумайте ваш позывной на авторынке. Он сохранится в облаке под вашим Telegram ID.
            </p>

            <div class="glass-card p-2 mb-3 text-left" style="background:#090e18;">
                <span class="sub-label" style="font-size:9px;">Ваш ID:</span>
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
}

function submitPlayerOnboarding() {
    const input = document.getElementById('onboardingNickInput');
    let val = input ? input.value.trim() : "";
    if (!val || val.length < 2) {
        showToast("Позывной должен быть не короче 2 символов!", 'warning');
        if (window.AudioFx) window.AudioFx.play('error');
        return;
    }

    const validUid = tgUserId || window.tgUserId;
    if (!validUid) {
        showToast("Ошибка: нет ID", 'error');
        return;
    }

    state.player.uid = String(validUid);
    state.player.name = val;
    state.player.onboardingDone = true;

    saveState();
    updateHeaderUI();

    if (window.FB_Bridge?.Players?.pushSaveForce && !isPcDevSession) {
        window.FB_Bridge.Players.pushSaveForce(String(validUid), state)
            .then(ok => console.log('[Onboarding] pushSaveForce →', ok ? 'OK' : 'FAIL'))
            .catch(e => console.warn('[Onboarding] pushSaveForce error:', e));
    }

    const overlay = document.getElementById('modalPlayerOnboarding');
    if (overlay) overlay.remove();

    if (window.AudioFx) {
        window.AudioFx.play('win');
        window.AudioFx.haptic('success');
    }
    showToast(`Добро пожаловать в игру, ${val}!`, 'success');

    if (typeof window._onboardingCallback === 'function') {
        window._onboardingCallback();
        window._onboardingCallback = null;
    }
}
window.submitPlayerOnboarding = submitPlayerOnboarding;

// ========================================================
// ⭐ v4.2.0: 22. КЛОНИРОВАНИЕ STATS-ROW ДЛЯ MARQUEE
// ========================================================
function _cloneStatsRow() {
    const row = document.getElementById('userStatsRow');
    if (!row) return;
    if (row.dataset.cloned === '1') return;

    try {
        // Клонируем содержимое
        const originalChildren = Array.from(row.children);
        originalChildren.forEach(child => {
            const clone = child.cloneNode(true);
            // Заменяем id на data-clone-of, чтобы избежать дублей
            if (clone.id) {
                clone.dataset.cloneOf = clone.id;
                clone.removeAttribute('id');
            }
            clone.querySelectorAll('[id]').forEach(el => {
                el.dataset.cloneOf = el.id;
                el.removeAttribute('id');
            });
            row.appendChild(clone);
        });

        row.dataset.cloned = '1';
        console.log('[App] ✅ Stats-row клонирован для marquee (всего элементов:', row.children.length, ')');
    } catch (e) {
        console.warn('[App] Ошибка клонирования stats-row:', e);
    }
}

// ========================================================
// 23. HUD
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
    // ⭐ v4.2.0: Уровень через setTxt → обновляет и клоны
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
// 24. НАВИГАЦИЯ
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
// 25. СТАРТ
// ========================================================
function initApp() {
    if (window.isPcDevMode()) {
        console.log('[App] DEV-режим активен. UID:', tgUserId || window.tgUserId);
    }

    setupOnlineListeners();

    // ⭐ v4.2.0: Фикс конфликта window.AppMessenger (M+ побеждает)
    if (window.AppM) {
        window.AppMessenger = window.AppM;
        console.log('[App] ✅ window.AppMessenger = AppM (M+ Hub)');
    }

    initTelegramAuthAndStorage(async () => {
        if (!tgUserId) {
            console.error('[App] Критическая ошибка: UID не установлен');
            showTelegramRequiredScreen();
            return;
        }

        checkPlayerOnboarding(async () => {
            const appShell = document.getElementById('appShell');
            const pcAuth = document.getElementById('pcAuthScreen');
            const tgScreen = document.getElementById('tgRequiredScreen');
            const denied = document.getElementById('accessDeniedScreen');
            if (appShell) appShell.style.display = 'flex';
            if (pcAuth) pcAuth.style.display = 'none';
            if (tgScreen) tgScreen.style.display = 'none';
            if (denied) denied.style.display = 'none';

            // ⭐ v4.2.0: синхронизируем курс Stars с банком
            _syncStarRateToBank();

            updateHeaderUI();
            updateLevelGatesUI();
            applyLanguageToDOM();
            if (window.ThemeManager) window.ThemeManager.init();
            checkRealTimeDayChange();

            // ⭐ v4.2.0: клонируем stats-row для marquee
            _cloneStatsRow();

            createOwnerPanelButton();

            if (window.FB_Bridge?.CarsCatalog && !isPcDevSession) {
                try { await window.FB_Bridge.CarsCatalog.fetchCloudCars(); } catch(e) {}
            }

            // ═══════════════════════════════════════════════
            // ФОРСИРОВАННАЯ ИНИЦИАЛИЗАЦИЯ БИЗНЕСА И РЫНКА
            // ═══════════════════════════════════════════════

            // 1. Форсируем PhoneBusiness.ensureState (пустые карточки бизнеса)
            setTimeout(() => {
                try {
                    if (typeof PhoneBusiness !== 'undefined' && typeof PhoneBusiness.ensureState === 'function') {
                        PhoneBusiness.ensureState();
                        if (window.state.businesses && window.state.businesses.length > 0) {
                            console.log('[App] ✅ Бизнесы инициализированы:', window.state.businesses.length);
                            saveState();
                        } else {
                            console.warn('[App] ❌ BUSINESS_DATA не загружен или пустой');
                        }
                    } else {
                        console.warn('[App] ❌ PhoneBusiness не загружен');
                    }
                } catch (e) {
                    console.error('[App] Ошибка PhoneBusiness.ensureState:', e);
                }
            }, 800);

            // 2. Форсируем populateMarketFeed (пустой рынок)
            setTimeout(() => {
                try {
                    const hasCars = window.CAR_DATABASE && Object.values(window.CAR_DATABASE).some(arr => Array.isArray(arr) && arr.length > 0);
                    console.log('[App] 🚗 Диагностика CAR_DATABASE:',
                        hasCars ? 'OK' : 'ПУСТО',
                        'economy:', window.CAR_DATABASE?.economy?.length || 0,
                        'comfort:', window.CAR_DATABASE?.comfort?.length || 0
                    );

                    if (hasCars) {
                        if (typeof populateMarketFeed === 'function' && (!state.marketFeed || state.marketFeed.length === 0)) {
                            console.log('[App] ⚡ Принудительный populateMarketFeed');
                            populateMarketFeed();
                        } else if (state.marketFeed && state.marketFeed.length > 0) {
                            console.log('[App] ✅ Лента рынка уже заполнена:', state.marketFeed.length, 'лотов');
                        }
                    } else {
                        console.error('[App] ❌ CAR_DATABASE пустой! Проверьте пути data/cars/*.js');
                    }
                } catch (e) {
                    console.error('[App] Ошибка populateMarketFeed:', e);
                }
            }, 1500);

            // 3. Стандартный рендер
            if (typeof renderGarage === 'function') renderGarage();
            if (typeof renderSalesLot === 'function') renderSalesLot();
            if (typeof renderMarketFeed === 'function') renderMarketFeed();

            if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.init === 'function') {
                PhoneManager.init();
            }

            if (window.NotificationCenter && !isPcDevSession) {
                try {
                    await window.NotificationCenter.processStartupNotifications();

                    if (_notificationUnsubscribe) {
                        try { _notificationUnsubscribe(); } catch (e) {}
                    }
                    _notificationUnsubscribe = window.NotificationCenter.subscribe();
                    console.log('[App] NotificationCenter подписка активна');
                } catch (e) {
                    console.warn('[App] NotificationCenter init error:', e);
                }
            }

            switchTab('tabMarket');

            // Патчноут при первом входе
            try {
                const lastSeen = localStorage.getItem('perekup_last_seen_version');
                if (lastSeen !== window.CURRENT_GAME_VERSION) {
                    setTimeout(() => openPatchNotesModal(), 2000);
                }
            } catch(e) {}
        });
    });
}

let gameCycleSeconds = 0;

window.gameCycleInterval = setInterval(() => {
    gameCycleSeconds++;

    if (gameCycleSeconds % 60 === 0) checkRealTimeDayChange();

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

// ========================================================
// 26. ЭКСПОРТ
// ========================================================
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
window.executeDayCycleMidnight = executeDayCycleMidnight;
window.isOwnerUser = _isOwner;
window.SAVE_VERSION = SAVE_VERSION;
window.showAccessDeniedScreen = showAccessDeniedScreen;
window.createOwnerPanelButton = createOwnerPanelButton;
window._cloneStatsRow = _cloneStatsRow;
window._updateDynamicStarRate = _updateDynamicStarRate;
window._syncStarRateToBank = _syncStarRateToBank;

console.log('[💠 app.js v4.2.0] SPRINT 1: HUD marquee + уровень в stats-row + showToast(type) + плавающий курс Stars + save v14 (Stars ×10) ✓');

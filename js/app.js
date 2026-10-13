// ========================================================
// js/app.js — ЯДРО СИМУЛЯТОРА, РОЛЛЕР И TELEGRAM REF (v1.2.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Анимированный роллер чисел HUD, жесткий учет инвентаря,
// Почта и Склад хранения (mailbox & warehouse),
// авто-миграция локальной базы в Cloud Firestore cars_catalog,
// темы Cyber Black Neo, кастомные эффекты огня/плазмы,
// спецзаказы «ПодКлюч», Telegram Cloud Storage, Firestore & Refs.
// Полная синхронизация с P2P-экосистемой M+ PRO Hub.
// ========================================================

const CURRENT_GAME_VERSION = "v1.2.0";

let ACtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

let tgUserId = "guest_777";
let tgUserData = null;
let SAVE_KEY_PREFIX = "perekup_v8_";
let cloudSaveDebounceTimer = null;
let isCloudStorageAvailable = false;

// Кэш предыдущих значений для плавной накрутки роллером
let displayedCashValue = 0;
let displayedStarsValue = 0;
let activeNumberAnimators = {};

// ========================================================
// 1. ДИНАМИЧЕСКИЙ ВЫБОР ФОТО АВТОМОБИЛЯ ИЗ ПАПКИ МОДЕЛИ
// ========================================================
function getCarImage(template) {
    if (!template) return "assets/cars/economy/2101/vaz-2101.jpg";
    
    if (Array.isArray(template.images) && template.images.length > 0) {
        const randIdx = Math.floor(Math.random() * template.images.length);
        return template.images[randIdx];
    }
    
    if (template.img) {
        return template.img;
    }
    
    if (typeof getCategoryFallback === 'function') {
        return getCategoryFallback(template.type || 'economy');
    }
    return "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80";
}
window.getCarImage = getCarImage;

// ========================================================
// 2. ЦЕНТРАЛИЗОВАННЫЙ МЕНЕДЖЕР МОДАЛЬНЫХ ОКОН (MODAL MANAGER)
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

        try {
            tgHaptic('light');
        } catch(e) {}
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

function closeModal(id) {
    ModalManager.close(id);
}
window.closeModal = closeModal;

// ========================================================
// 3. ЗВУК, HAPTICS И АНИМИРОВАННЫЙ РОЛЛЕР ЧИСЕЛ HUD
// ========================================================
function tgHaptic(type = 'light') {
    try { 
        if (window.Telegram?.WebApp?.HapticFeedback) { 
            let isNotif = ['success', 'warning', 'error'].includes(type);
            if (isNotif) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
            } else {
                window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
            }
        } 
    } catch(e) {}
}

function initAudio() {
    try {
        if (!audioCtx && ACtx) audioCtx = new ACtx();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch(e) {}
}

function playSound(type) {
    try {
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const soundProfile = state.player?.soundProfile || 'cyber';

        if (soundProfile === 'silent') return;

        if (type === 'tick') {
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.connect(g); g.connect(audioCtx.destination);

            if (soundProfile === 'relay') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(320, now);
                g.gain.setValueAtTime(0.04, now);
                g.linearRampToValueAtTime(0, now + 0.015);
                osc.start(now); osc.stop(now + 0.015);
            } else {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                g.gain.setValueAtTime(0.05, now);
                g.linearRampToValueAtTime(0, now + 0.03);
                osc.start(now); osc.stop(now + 0.03);
            }
        } else if (type === 'win') {
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.connect(g); g.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(440, now);
            osc.exponentialRampToValueAtTime(880, now + 0.2);
            g.gain.setValueAtTime(0.2, now);
            g.linearRampToValueAtTime(0, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
        } else if (type === 'error') {
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.connect(g); g.connect(audioCtx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(160, now);
            osc.exponentialRampToValueAtTime(50, now + 0.3);
            g.gain.setValueAtTime(0.15, now);
            g.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        }
    } catch(e) {}
}

function playEngineSound() {
    try {
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.connect(g); 
        g.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(110, now);
        osc.exponentialRampToValueAtTime(520, now + 0.45);
        osc.exponentialRampToValueAtTime(140, now + 0.9);
        g.gain.setValueAtTime(0.25, now);
        g.linearRampToValueAtTime(0, now + 0.95);
        osc.start(now); osc.stop(now + 0.95);
        tgHaptic('medium');
    } catch(e) {}
}

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

    if (diff > 0) {
        el.style.textShadow = "0 0 16px #00e676";
    } else {
        el.style.textShadow = "0 0 16px #ff3366";
    }

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

// ========================================================
// ЦЕНТРАЛИЗОВАННЫЙ ЖУРНАЛ БАНКОВСКИХ ТРАНЗАКЦИЙ
// ========================================================
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
// 4. ИНТЕРАКТИВНЫЙ РЕНДЕР НАГРАД И ЖЕТОНОВ
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
        } else if (trimLine.includes('⭐') || trimLine.toLowerCase().includes('stars')) {
            let match = trimLine.match(/([+\-]?\d+)\s*(⭐|stars)/i);
            tokens.push({
                icon: '⭐',
                title: 'Звёзды Stars',
                value: match ? '+' + match[1] + ' ⭐' : trimLine,
                desc: 'Премиальная валюта перекупа',
                rarity: 'token-amber'
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
        } else if (trimLine.includes('🤝') || trimLine.toLowerCase().includes('связь')) {
            tokens.push({
                icon: '🤝',
                title: 'Связи ПодКлюч',
                value: trimLine.replace('🤝', '').trim(),
                desc: 'Решение вопросов с ГИБДД и ДКП',
                rarity: 'token-purple'
            });
        } else if (trimLine.includes('⛽') || trimLine.toLowerCase().includes('топлив')) {
            tokens.push({
                icon: '⛽',
                title: 'Топливный запас',
                value: trimLine.replace('⛽', '').trim(),
                desc: 'Заправка в бензобак',
                rarity: 'token-cyan'
            });
        } else if (trimLine.includes('🎟️') || trimLine.toLowerCase().includes('талон')) {
            tokens.push({
                icon: '🎟️',
                title: 'Экспресс-талоны',
                value: trimLine.replace('🎟️', '').trim(),
                desc: 'Мгновенный поиск покупателя',
                rarity: 'token-purple'
            });
        }
    });

    return tokens;
}

function openVerdictModal(title, text, isSuccess, amount, profit, customTokens = null) {
    tgHaptic(isSuccess ? 'success' : 'error');
    if (isSuccess) playSound('win');
    else playSound('error');

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
    playSound('tick');
}

function dismissPatchNotesModal() {
    ModalManager.close('modalPatchNotes');
    try {
        localStorage.setItem('perekup_last_seen_version', CURRENT_GAME_VERSION);
    } catch(e) {}
}

// ========================================================
// 5. ИГРОВОЙ STATE & ДЕФОЛТНЫЕ ДАННЫЕ
// ========================================================
const DEFAULT_STATE = {
    lang: 'ru',
    player: { 
        name: "Перекуп #777", avatarUrl: null, cash: 150000, stars: 15, connections: 1,
        expressTickets: 25, maxExpressTickets: 25, fuel: 100, level: 1, xp: 0, maxXp: 120,
        baseSlots: 2, vip: false, vipPro: false, lastFreeSpinDay: 0, lastFreeSuperSpinDay: 0,
        club: null, karma: 50, streetCred: 100, superSpinTickets: 1,
        freeImpoundPasses: 0,
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
        furniture: [],
        phoneMessages: [],
        dailyQuests: [],
        dailyQuestsSuperClaimed: false,
        bankHistory: [],
        bankDeposits: [],

        mailbox: [],
        warehouse: {
            maxCars: 6,
            maxItems: 12,
            cars: [],
            items: []
        }
    },
    garage: [], salesLot: [], contracts: [], plateCatalog: [],
    ownedPlates: ["В777ВВ 77"], registeredPlates: ["В777ВВ 77"],
    activeCategory: 'economy', marketFeed: [], p2pMode: 'cars', syndicateSubTab: 'contracts',
    myP2PListings: [], p2pMarketListings: [], businesses: [], confiscatedLot: null, blackMarketPlates: [],
    officialPlateAuction: [],
    marketModifiers: { economy: 1, comfort: 1, premium: 1, hyper: 1, moto: 1, truck: 1, all: 1 },
    lifeChatMessages: [], friendsList: []
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
window.state = state;

// Глобальный маршрутизатор входящих посылок в Почтовый ящик
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
// 6. ДИНАМИЧЕСКИЙ HUD, АНИМАЦИИ, ТЕМЫ И СМАРТФОН
// ========================================================
function applyHudCustomization() {
    const root = document.documentElement;
    const curColorId = state.player?.hudColorId || 'lightning';
    const customHex = state.player?.customHexColor;
    const isCyberThemeActive = state.player?.themePresetId === 'cyber_black_neo';

    let targetHex = "#00f2fe";
    let targetSecondaryHex = "#7928ca";
    let targetGlow = "rgba(0, 242, 254, 0.45)";
    let isLightningTheme = false;

    if (customHex) {
        targetHex = customHex;
        targetGlow = hexToRgba(customHex, 0.45);
    } else if (typeof HUD_SOLID_COLORS !== 'undefined') {
        const found = HUD_SOLID_COLORS.find(c => c.id === curColorId) || HUD_SOLID_COLORS[0];
        targetHex = found.hex;
        targetSecondaryHex = found.secondaryHex || "#0284c7";
        targetGlow = found.glow;
        isLightningTheme = !!found.isLightning;
    }

    root.style.setProperty('--cyan', targetHex);
    root.style.setProperty('--cyan-glow', targetGlow);
    root.style.setProperty('--border-glow', hexToRgba(targetHex, 0.35));
    root.style.setProperty('--lightning-secondary', targetSecondaryHex);
    root.style.setProperty('--custom-fx-color', targetHex);
    root.style.setProperty('--custom-fx-glow', targetGlow);

    const phoneDevice = document.querySelector('.phone-device-wrapper');
    if (phoneDevice) {
        if (isCyberThemeActive) {
            phoneDevice.classList.add('theme-cyber-icons');
        } else {
            phoneDevice.classList.remove('theme-cyber-icons');
        }

        if (isLightningTheme) {
            phoneDevice.classList.add('theme-lightning-active');
            phoneDevice.style.borderColor = targetHex;
            phoneDevice.style.boxShadow = `0 20px 50px rgba(0, 0, 0, 0.9), inset 0 0 25px ${targetGlow}, 0 0 30px ${hexToRgba(targetSecondaryHex, 0.35)}`;
        } else {
            phoneDevice.classList.remove('theme-lightning-active');
            phoneDevice.style.borderColor = '';
            phoneDevice.style.boxShadow = '';
        }
    }

    const nameEl = document.getElementById('playerName');
    const nickFxId = state.player?.nickEffect || (isLightningTheme ? 'lightning_spark' : 'none');
    if (nameEl && typeof NICKNAME_EFFECTS_CATALOG !== 'undefined') {
        NICKNAME_EFFECTS_CATALOG.forEach(fx => {
            if (fx.className) nameEl.classList.remove(fx.className);
        });
        const activeFx = NICKNAME_EFFECTS_CATALOG.find(fx => fx.id === nickFxId);
        if (activeFx && activeFx.className) {
            nameEl.classList.add(activeFx.className);
        }
    }

    const ringEl = document.querySelector('.avatar-ring');
    const avatarFxId = state.player?.avatarEffect || (isLightningTheme ? 'lightning_shield' : 'none');
    if (ringEl && typeof AVATAR_EFFECTS_CATALOG !== 'undefined') {
        AVATAR_EFFECTS_CATALOG.forEach(fx => {
            if (fx.className) ringEl.classList.remove(fx.className);
        });
        const activeFx = AVATAR_EFFECTS_CATALOG.find(fx => fx.id === avatarFxId);
        if (activeFx && activeFx.className) {
            ringEl.classList.add(activeFx.className);
        }
    }
}

function hexToRgba(hex, alpha = 0.5) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

// ========================================================
// 7. МОДАЛЬНОЕ ОКНО КАСТОМИЗАЦИИ HUD (CYBER BLACK NEO)
// ========================================================
let activeCustomizerTab = 'colors';

function openHudCustomizerModal() {
    renderHudCustomizerContent();
    ModalManager.open('modalHudCustomizer');
    playSound('tick');
}

function switchCustomizerTab(tab) {
    activeCustomizerTab = tab;
    renderHudCustomizerContent();
    playSound('tick');
}

function renderHudCustomizerContent() {
    const modal = document.getElementById('modalHudCustomizer');
    if (!modal) return;

    const curColorId = state.player?.hudColorId || 'lightning';
    const curNickFx = state.player?.nickEffect || 'none';
    const curAvatarFx = state.player?.avatarEffect || 'none';
    const ownedNicks = state.player?.ownedNickEffects || ['none'];
    const ownedAvatars = state.player?.ownedAvatarEffects || ['none'];
    const sProfile = state.player?.soundProfile || 'cyber';
    const isCyberTheme = state.player?.themePresetId === 'cyber_black_neo';

    let bodyHtml = "";

    if (activeCustomizerTab === 'colors') {
        let colorsGrid = "";
        (typeof HUD_SOLID_COLORS !== 'undefined' ? HUD_SOLID_COLORS : []).forEach(c => {
            const isSel = curColorId === c.id && !state.player?.customHexColor;
            let lightningBadge = c.isLightning ? `<span class="tag-badge bg-tag-purple" style="font-size:7px; position:absolute; top:-4px; left:-4px;">⚡ МОЛНИИ</span>` : "";
            colorsGrid += `
                <div class="color-palette-tile ${isSel ? 'selected' : ''}" onclick="setHudSolidColor('${c.id}')" style="--tile-color:${c.hex}; position:relative;">
                    ${lightningBadge}
                    <div class="color-palette-swatch" style="background:${c.hex}; box-shadow:0 0 10px ${c.glow};"></div>
                    <span class="color-palette-name">${c.name}</span>
                    ${isSel ? '<i class="fa-solid fa-check color-check"></i>' : ''}
                </div>
            `;
        });

        bodyHtml = `
            <div class="glass-card p-2 mb-2 flex-between" style="background:#090e18; border-color: ${isCyberTheme ? 'var(--green)' : 'var(--border-glass)'};">
                <div>
                    <b class="text-xs color-green"><i class="fa-solid fa-terminal"></i> Тема «Cyber Black Neo»</b>
                    <div class="sub-label" style="font-size:9px;">Матовые черные иконки с неоновой подсветкой, как в DEV</div>
                </div>
                <button onclick="toggleCyberIconsThemeAction()" class="btn ${isCyberTheme ? 'btn-green' : 'btn-dark'} btn-sm btn-auto">
                    ${isCyberTheme ? 'ВКЛЮЧЕНА ✓' : 'ВКЛЮЧИТЬ'}
                </button>
            </div>

            <div class="sub-label mb-2" style="font-size:10px;">Выберите неоновый цвет контуров, HUD и корпуса телефона:</div>
            <div class="hud-colors-palette-grid mb-3">
                ${colorsGrid}
            </div>
            <div class="glass-card p-2 flex-between mb-2">
                <div>
                    <b class="text-xs color-cyan"><i class="fa-solid fa-eye-dropper"></i> Свой оттенок (Color Picker)</b>
                    <div class="sub-label" style="font-size:9px;">Установите любой желаемый цвет из палитры</div>
                </div>
                <input type="color" id="customColorPickerInput" value="${state.player?.customHexColor || '#00f2fe'}" onchange="setHudCustomHexColor(this.value)" style="width:36px; height:32px; border:none; background:transparent; cursor:pointer;">
            </div>
        `;
    } else if (activeCustomizerTab === 'nick') {
        let listHtml = "";
        (typeof NICKNAME_EFFECTS_CATALOG !== 'undefined' ? NICKNAME_EFFECTS_CATALOG : []).forEach(fx => {
            const isOwned = ownedNicks.includes(fx.id);
            const isCur = curNickFx === fx.id;

            let actionBtn = "";
            if (isCur) {
                actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Надето ✓</button>`;
            } else if (isOwned) {
                actionBtn = `<button onclick="setNickEffectAction('${fx.id}')" class="btn btn-cyan btn-sm btn-auto">Выбрать</button>`;
            } else {
                let starsTxt = fx.reqStars ? ` + ${fx.reqStars} ⭐` : "";
                actionBtn = `<button onclick="buyNickEffectAction('${fx.id}', ${fx.cost}, ${fx.reqStars})" class="btn btn-green btn-sm btn-auto">${fx.cost.toLocaleString()} ₽${starsTxt}</button>`;
            }

            listHtml += `
                <div class="glass-card p-2 flex-between mb-2 ${isCur ? 'personal-car-card' : ''}">
                    <div style="flex:1; margin-right:8px;">
                        <div class="flex-gap" style="align-items:center;">
                            <span class="text-xs font-bold ${fx.className}" style="font-size:12px;">${fx.name}</span>
                            ${isCur ? '<span class="tag-badge bg-tag-green" style="font-size:7.5px;">АКТИВНО</span>' : ''}
                        </div>
                        <div class="sub-label" style="font-size:9.5px;">${fx.desc}</div>
                    </div>
                    ${actionBtn}
                </div>
            `;
        });
        bodyHtml = `<div class="sub-label mb-2" style="font-size:10px;">Анимированные эффекты для имени перекупа:</div><div class="space-y-1 mb-2" style="max-height:260px; overflow-y:auto;">${listHtml}</div>`;
    } else if (activeCustomizerTab === 'avatar') {
        let listHtml = "";
        (typeof AVATAR_EFFECTS_CATALOG !== 'undefined' ? AVATAR_EFFECTS_CATALOG : []).forEach(fx => {
            const isOwned = ownedAvatars.includes(fx.id);
            const isCur = curAvatarFx === fx.id;

            let actionBtn = "";
            if (isCur) {
                actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Надето ✓</button>`;
            } else if (isOwned) {
                actionBtn = `<button onclick="setAvatarEffectAction('${fx.id}')" class="btn btn-cyan btn-sm btn-auto">Выбрать</button>`;
            } else {
                let starsTxt = fx.reqStars ? ` + ${fx.reqStars} ⭐` : "";
                actionBtn = `<button onclick="buyAvatarEffectAction('${fx.id}', ${fx.cost}, ${fx.reqStars})" class="btn btn-green btn-sm btn-auto">${fx.cost.toLocaleString()} ₽${starsTxt}</button>`;
            }

            listHtml += `
                <div class="glass-card p-2 flex-between mb-2 ${isCur ? 'personal-car-card' : ''}">
                    <div style="flex:1; margin-right:8px;">
                        <div class="flex-gap" style="align-items:center;">
                            <b class="text-xs color-cyan">${fx.name}</b>
                            ${isCur ? '<span class="tag-badge bg-tag-green" style="font-size:7.5px;">АКТИВНО</span>' : ''}
                        </div>
                        <div class="sub-label" style="font-size:9.5px;">${fx.desc}</div>
                    </div>
                    ${actionBtn}
                </div>
            `;
        });
        bodyHtml = `<div class="sub-label mb-2" style="font-size:10px;">Анимированные ауры и рамки вокруг вашего аватара:</div><div class="space-y-1 mb-2" style="max-height:260px; overflow-y:auto;">${listHtml}</div>`;
    }

    modal.innerHTML = `
        <div class="modal-box" style="max-width:430px;">
            <div class="flex-between mb-2">
                <div class="modal-glow-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> КАСТОМИЗАЦИЯ ИНТЕРФЕЙСА</div>
                <button onclick="ModalManager.close('modalHudCustomizer')" class="btn btn-dark btn-auto btn-sm">✕</button>
            </div>

            <div class="grid-3 mb-2">
                <button onclick="switchCustomizerTab('colors')" class="btn ${activeCustomizerTab === 'colors' ? 'btn-cyan' : 'btn-dark'} btn-sm">🎨 Скин</button>
                <button onclick="switchCustomizerTab('nick')" class="btn ${activeCustomizerTab === 'nick' ? 'btn-cyan' : 'btn-dark'} btn-sm">✨ Ник</button>
                <button onclick="switchCustomizerTab('avatar')" class="btn ${activeCustomizerTab === 'avatar' ? 'btn-cyan' : 'btn-dark'} btn-sm">👤 Аватар</button>
            </div>

            ${bodyHtml}

            <div class="p-2 mb-2 flex-between" style="background:#090e18; border-radius:10px; border:1px solid var(--border-glass);">
                <div>
                    <b class="text-xs color-amber"><i class="fa-solid fa-volume-high"></i> Звуки интерфейса</b>
                    <div class="sub-label" style="font-size:9px;">Отклик кнопок</div>
                </div>
                <div class="flex-gap">
                    <button onclick="setSoundProfileAction('cyber')" class="btn ${sProfile === 'cyber' ? 'btn-cyan' : 'btn-dark'} btn-sm btn-auto" style="padding:4px 8px; font-size:9px;">Кибер</button>
                    <button onclick="setSoundProfileAction('relay')" class="btn ${sProfile === 'relay' ? 'btn-cyan' : 'btn-dark'} btn-sm btn-auto" style="padding:4px 8px; font-size:9px;">Реле</button>
                    <button onclick="setSoundProfileAction('silent')" class="btn ${sProfile === 'silent' ? 'btn-cyan' : 'btn-dark'} btn-sm btn-auto" style="padding:4px 8px; font-size:9px;">Без звука</button>
                </div>
            </div>

            <button onclick="ModalManager.close('modalHudCustomizer')" class="btn btn-cyan w-full">Применить и закрыть ✓</button>
        </div>
    `;
}

function toggleCyberIconsThemeAction() {
    state.player.themePresetId = state.player.themePresetId === 'cyber_black_neo' ? 'default' : 'cyber_black_neo';
    saveState();
    applyHudCustomization();
    renderHudCustomizerContent();
    playSound('win');
    tgHaptic('success');
    showToast(state.player.themePresetId === 'cyber_black_neo' ? "Тема Cyber Black Neo активирована!" : "Тема иконок возвращена к классической.");
}

function setHudSolidColor(colorId) {
    state.player.hudColorId = colorId;
    state.player.customHexColor = null;
    saveState();
    applyHudCustomization();
    renderHudCustomizerContent();
    playSound('tick');
    tgHaptic('light');
    showToast("Тема оформления успешно активирована!");
}

function setHudCustomHexColor(hexValue) {
    state.player.customHexColor = hexValue;
    saveState();
    applyHudCustomization();
    renderHudCustomizerContent();
    playSound('tick');
    tgHaptic('light');
    showToast(`Установлен оттенок ${hexValue}!`);
}

function buyNickEffectAction(fxId, cost, reqStars = 0) {
    let cash = state.player?.cash || 0;
    let stars = state.player?.stars || 0;

    if (cash < cost) return showToast("Не хватает рублей на покупку эффекта ника!");
    if (stars < reqStars) return showToast(`Нужно ${reqStars} Stars ⭐!`);

    state.player.cash -= cost;
    state.player.stars -= reqStars;

    if (!state.player.ownedNickEffects) state.player.ownedNickEffects = ['none'];
    if (!state.player.ownedNickEffects.includes(fxId)) {
        state.player.ownedNickEffects.push(fxId);
    }
    state.player.nickEffect = fxId;

    saveState();
    updateHeaderUI();
    applyHudCustomization();
    renderHudCustomizerContent();
    playSound('win');
    tgHaptic('success');
    showToast("Эффект никнейма приобретен и активирован!");
}

function setNickEffectAction(fxId) {
    state.player.nickEffect = fxId;
    saveState();
    applyHudCustomization();
    renderHudCustomizerContent();
    playSound('tick');
    tgHaptic('light');
    showToast("Эффект ника установлен!");
}

function buyAvatarEffectAction(fxId, cost, reqStars = 0) {
    let cash = state.player?.cash || 0;
    let stars = state.player?.stars || 0;

    if (cash < cost) return showToast("Не хватает рублей на покупку ауры аватарки!");
    if (stars < reqStars) return showToast(`Нужно ${reqStars} Stars ⭐!`);

    state.player.cash -= cost;
    state.player.stars -= reqStars;

    if (!state.player.ownedAvatarEffects) state.player.ownedAvatarEffects = ['none'];
    if (!state.player.ownedAvatarEffects.includes(fxId)) {
        state.player.ownedAvatarEffects.push(fxId);
    }
    state.player.avatarEffect = fxId;

    saveState();
    updateHeaderUI();
    applyHudCustomization();
    renderHudCustomizerContent();
    playSound('win');
    tgHaptic('success');
    showToast("Аура аватарки приобретена и активирована!");
}

function setAvatarEffectAction(fxId) {
    state.player.avatarEffect = fxId;
    saveState();
    applyHudCustomization();
    renderHudCustomizerContent();
    playSound('tick');
    tgHaptic('light');
    showToast("Эффект аватарки установлен!");
}

function setSoundProfileAction(profile) {
    state.player.soundProfile = profile;
    saveState();
    renderHudCustomizerContent();
    playSound('tick');
    tgHaptic('light');
    showToast("Звуковой профиль обновлен!");
}

// ========================================================
// 8. МУЛЬТИЯЗЫЧНОСТЬ (I18N)
// ========================================================
function toggleGameLanguage() {
    let nextLang = state.lang === 'ru' ? 'en' : 'ru';
    setGameLanguage(nextLang);
}

function setGameLanguage(lang) {
    state.lang = lang;
    applyLanguageToDOM();
    saveState();
    playSound('tick');
    tgHaptic('light');
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
// 9. ЗАДАНИЯ И ВЕХИ КАРЬЕРЫ
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
                tgHaptic('success');
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
        playSound('win');
    }
    if (sold >= 10 && !state.player.milestoneSalesClaimed) {
        state.player.milestoneSalesClaimed = true;
        showToast("🏆 Веха в Блокноте: Закрыто 10 успешных продаж!");
        playSound('win');
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
// 10. ЗАТРАТЫ И СЛОТЫ АВТОПАРКА
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
        if (state.player?.housingId) {
            const house = HOUSING_LIST.find(h => h.id === state.player.housingId);
            if (house) slots += (house.slots || 0);
        }
        if (state.player?.ownedHouses && Array.isArray(state.player.ownedHouses)) {
            state.player.ownedHouses.forEach(hId => {
                if (hId !== state.player.housingId) {
                    const oh = HOUSING_LIST.find(h => h.id === hId);
                    if (oh) slots += (oh.slots || 0);
                }
            }); 
        }
    }
    return slots;
}

// ========================================================
// 11. ПРОВЕРКА ДОСТУПА К СЕРВИСУ «ПОДКЛЮЧ»
// ========================================================
function checkSyndicateAccessDetails() {
    const lvl = state.player?.level || 1;
    const tools = state.player?.tools || {};
    const stars = state.player?.stars || 0;

    const hasLvl = lvl >= 7;
    const hasEndoscope = !!tools.endoscope;
    const hasGauge = !!(tools.gauge || tools.gauge_pro);
    const hasLaunch = !!tools.obd_launch;
    const hasStars = stars >= 5;

    const isFullAccess = hasLvl && hasEndoscope && hasGauge && hasLaunch && hasStars;

    return {
        isFullAccess,
        hasLvl,
        hasEndoscope,
        hasGauge,
        hasLaunch,
        hasStars,
        lvl,
        stars
    };
}

// ========================================================
// 12. TELEGRAM CLOUD, REFS & FIRESTORE STORAGE SYNC
// ========================================================
const CHUNK_SIZE = 2048;

function prepareStateForCloud() {
    const copy = JSON.parse(JSON.stringify(state));
    return JSON.stringify(copy);
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

function loadFromTelegramCloud(callback) {
    if (!window.Telegram?.WebApp?.CloudStorage) {
        callback(null);
        return;
    }
    const tgCloud = window.Telegram.WebApp.CloudStorage;
    
    let hasReturned = false;
    const cloudTimeout = setTimeout(() => {
        if (!hasReturned) {
            hasReturned = true;
            callback(null);
        }
    }, 2500);

    tgCloud.getItem(SAVE_KEY_PREFIX + tgUserId + "_meta", (err, metaVal) => {
        if (err || !metaVal) {
            clearTimeout(cloudTimeout);
            if (!hasReturned) { hasReturned = true; callback(null); }
            return;
        }
        const totalChunks = parseInt(metaVal);
        if (isNaN(totalChunks) || totalChunks <= 0) {
            clearTimeout(cloudTimeout);
            if (!hasReturned) { hasReturned = true; callback(null); }
            return;
        }

        const keys = [];
        for (let i = 0; i < totalChunks; i++) {
            keys.push(SAVE_KEY_PREFIX + tgUserId + "_c" + i);
        }

        tgCloud.getItems(keys, (gErr, values) => {
            clearTimeout(cloudTimeout);
            if (hasReturned) return;
            hasReturned = true;

            if (gErr || !values) {
                callback(null);
                return;
            }
            let fullStr = "";
            for (let i = 0; i < totalChunks; i++) {
                const k = SAVE_KEY_PREFIX + tgUserId + "_c" + i;
                if (!values[k]) {
                    callback(null);
                    return;
                }
                fullStr += values[k];
            }
            try {
                const parsed = JSON.parse(fullStr);
                callback(parsed);
            } catch(e) {
                callback(null);
            }
        });
    });
}

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
    }, 1500);

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

    loadFromLocalStorage();

    if (tgUserData && state.player) {
        let names = [];
        if (tgUserData.first_name) names.push(tgUserData.first_name);
        if (tgUserData.last_name) names.push(tgUserData.last_name);
        const fullName = names.join(' ').trim();

        if (fullName) state.player.name = fullName;
        else if (tgUserData.username) state.player.name = "@" + tgUserData.username;
        if (tgUserData.photo_url) state.player.avatarUrl = tgUserData.photo_url;
    }

    if (window.FB_Bridge?.CarsCatalog) {
        window.FB_Bridge.CarsCatalog.seedDefaultCarsCatalog();
    }

    clearTimeout(watchdogTimer);
    safeCallback();
}

function processReferralAndPayouts(refParam) {
    if (window.FB_Bridge) {
        if (refParam && window.FB_Bridge.Friends) {
            setTimeout(async () => {
                let myProfile = window.FB_Bridge.getProfile();
                let refRes = await window.FB_Bridge.Friends.handleReferralEntry(refParam, myProfile);
                if (refRes && refRes.rewarded) {
                    state.player.cash = (state.player.cash || 0) + refRes.bonusCash;
                    state.player.connections = (state.player.connections || 0) + 1;
                    saveState();
                    updateHeaderUI();
                    openVerdictModal(
                        "РЕФЕРАЛЬНЫЙ БОНУС! 🤝",
                        `Вы перешли по приглашению напарника #${refParam}!\nВам начислено: +${refRes.bonusCash.toLocaleString()} ₽ и +1 Связь ПодКлюч.`,
                        true,
                        refRes.bonusCash
                    );
                }
            }, 1200);
        }

        if (window.FB_Bridge.P2P) {
            setTimeout(async () => {
                const payoutResult = await window.FB_Bridge.P2P.claimPendingPayouts(tgUserId);
                if (payoutResult && payoutResult.totalClaimed > 0) {
                    state.player.cash = (state.player.cash || 0) + payoutResult.totalClaimed;
                    saveState();
                    updateHeaderUI();
                    openVerdictModal(
                        "P2P ВЫПЛАТА ПОЛУЧЕНА! 💸",
                        `Пока вас не было, другие игроки выкупили ваши лоты:\n[${payoutResult.claimedItems.join(", ")}]\nЗачислено: +${payoutResult.totalClaimed.toLocaleString()} ₽!`,
                        true,
                        payoutResult.totalClaimed
                    );
                }
            }, 2000);
        }
    }
}

function loadFromLocalStorage() {
    try {
        let saved = localStorage.getItem("perekup_save_" + tgUserId);
        if (!saved) saved = localStorage.getItem('perekoop_sim_save_v105_release');
        if (saved) applyLoadedState(JSON.parse(saved));
        else applyLoadedState({});
    } catch(e) {}
}

function applyLoadedState(parsed) {
    if (!parsed) parsed = {};
    if (parsed.lang) state.lang = parsed.lang;
    if (parsed.player) {
        state.player = { ...DEFAULT_STATE.player, ...parsed.player };
        if (parsed.player.stats) state.player.stats = { ...DEFAULT_STATE.player.stats, ...parsed.player.stats };
        if (parsed.player.tools) state.player.tools = { ...DEFAULT_STATE.player.tools, ...parsed.player.tools };
        if (parsed.player.toolsWear) state.player.toolsWear = { ...DEFAULT_STATE.player.toolsWear, ...parsed.player.toolsWear };
        if (parsed.player.crypto) state.player.crypto = { ...DEFAULT_STATE.player.crypto, ...parsed.player.crypto };
        if (parsed.player.bankReputation) state.player.bankReputation = { ...DEFAULT_STATE.player.bankReputation, ...parsed.player.bankReputation };
        if (parsed.player.phoneWidgetsCollapsed) state.player.phoneWidgetsCollapsed = { ...DEFAULT_STATE.player.phoneWidgetsCollapsed, ...parsed.player.phoneWidgetsCollapsed };
        if (parsed.player.club) state.player.club = parsed.player.club;
        if (Array.isArray(parsed.player.phoneMessages)) state.player.phoneMessages = parsed.player.phoneMessages;
        if (Array.isArray(parsed.player.dailyQuests)) state.player.dailyQuests = parsed.player.dailyQuests;
        if (Array.isArray(parsed.player.bankHistory)) state.player.bankHistory = parsed.player.bankHistory;
        if (Array.isArray(parsed.player.bankDeposits)) state.player.bankDeposits = parsed.player.bankDeposits;
        if (Array.isArray(parsed.player.mailbox)) state.player.mailbox = parsed.player.mailbox;
        if (parsed.player.warehouse) state.player.warehouse = { ...DEFAULT_STATE.player.warehouse, ...parsed.player.warehouse };
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
    
    if (tgUserData) {
        let names = [];
        if (tgUserData.first_name) names.push(tgUserData.first_name);
        if (tgUserData.last_name) names.push(tgUserData.last_name);
        const fullName = names.join(' ').trim();

        if (fullName) state.player.name = fullName;
        else if (tgUserData.username) state.player.name = "@" + tgUserData.username;
        if (tgUserData.photo_url) state.player.avatarUrl = tgUserData.photo_url;
    }

    sanitizeState();
}

function sanitizeState() {
    if (!state.player) state.player = JSON.parse(JSON.stringify(DEFAULT_STATE.player));
    if (!state.player.baseSlots || state.player.baseSlots < 2) state.player.baseSlots = 2;
    if (!state.player.maxExpressTickets) state.player.maxExpressTickets = 25;
    if (typeof state.player.expressTickets !== 'number') state.player.expressTickets = state.player.maxExpressTickets;
    if (typeof state.player.policeImmunityDays !== 'number') state.player.policeImmunityDays = 0;
    if (typeof state.player.consecutiveRaces !== 'number') state.player.consecutiveRaces = 0;
    if (typeof state.player.maxRacesBeforeRaid !== 'number') state.player.maxRacesBeforeRaid = Math.floor(10 + Math.random() * 5);
    if (typeof state.player.streetCred !== 'number') state.player.streetCred = 100;
    if (typeof state.player.superSpinTickets !== 'number') state.player.superSpinTickets = 1;
    if (typeof state.player.lastFreeSuperSpinDay !== 'number') state.player.lastFreeSuperSpinDay = 0;
    if (typeof state.player.freeImpoundPasses !== 'number') state.player.freeImpoundPasses = 0;
    if (!state.player.phoneWidgetsCollapsed) state.player.phoneWidgetsCollapsed = { biz: false, quests: false };
    if (!Array.isArray(state.player.ownedHouses)) state.player.ownedHouses = [];
    
    if (!state.player.hudColorId) state.player.hudColorId = 'lightning';
    if (!state.player.themePresetId) state.player.themePresetId = 'default';
    if (!state.player.nickEffect) state.player.nickEffect = 'none';
    if (!state.player.avatarEffect) state.player.avatarEffect = 'none';
    if (!Array.isArray(state.player.ownedNickEffects)) state.player.ownedNickEffects = ['none'];
    if (!Array.isArray(state.player.ownedAvatarEffects)) state.player.ownedAvatarEffects = ['none'];
    if (!state.player.soundProfile) state.player.soundProfile = 'cyber';

    if (!Array.isArray(state.player.mailbox)) state.player.mailbox = [];
    if (!state.player.warehouse) {
        state.player.warehouse = { maxCars: 6, maxItems: 12, cars: [], items: [] };
    }
    if (!Array.isArray(state.player.warehouse.cars)) state.player.warehouse.cars = [];
    if (!Array.isArray(state.player.warehouse.items)) state.player.warehouse.items = [];
    if (!state.player.warehouse.maxCars) state.player.warehouse.maxCars = 6;

    if (!state.player.crypto) {
        state.player.crypto = { btc: 0, eth: 0, staked: [], prices: { btc: 9500000, eth: 340000 } };
    }
    if (!Array.isArray(state.player.crypto.staked)) state.player.crypto.staked = [];

    if (!state.player.bankReputation) {
        state.player.bankReputation = { 
            rating: 5.0, 
            successfulDeals: 0, 
            fairDealsCount: 0, 
            scandalsCount: 0, 
            vipBankTier: 'Стандарт',
            loanLimit: 500000,
            reviewsLog: [
                { author: "Алексей В.", rating: 5, date: "Недавно", text: "Отличный продавец, машина в идеале, доехали без сюрпризов!" }
            ] 
        };
    }

    if (!Array.isArray(state.player.furniture)) state.player.furniture = [];
    if (!Array.isArray(state.player.phoneMessages)) state.player.phoneMessages = [];
    if (!Array.isArray(state.player.bankHistory)) state.player.bankHistory = [];
    if (!Array.isArray(state.player.bankDeposits)) state.player.bankDeposits = [];
    if (!Array.isArray(state.registeredPlates)) state.registeredPlates = ["В777ВВ 77"];
    if (!Array.isArray(state.p2pMarketListings)) state.p2pMarketListings = [];
    if (!Array.isArray(state.officialPlateAuction)) state.officialPlateAuction = [];
    if (typeof state.player.cash !== 'number' || state.player.cash < 0) state.player.cash = 150000;
    if (typeof state.player.stars !== 'number' || state.player.stars < 0) state.player.stars = 15;
    if (typeof state.player.loanDebt !== 'number' || state.player.loanDebt < 0) state.player.loanDebt = 0;
    if (typeof state.player.taxDebt !== 'number' || state.player.taxDebt < 0) state.player.taxDebt = 0;
    if (typeof state.player.safeDeposit !== 'number') state.player.safeDeposit = 0;
    if (typeof state.player.fuel !== 'number') state.player.fuel = 100;
    if (typeof state.player.karma !== 'number') state.player.karma = 50;
    if (typeof state.player.lastRealDayTimestamp !== 'number') state.player.lastRealDayTimestamp = Date.now();
    
    if (!state.player.dailyQuests || state.player.dailyQuests.length === 0) {
        refreshDailyQuestsList();
    }

    if (!state.player.tools) {
        state.player.tools = { gauge: false, gauge_pro: false, obd: false, obd_launch: false, endoscope: false, compressor: false, battery_tester: false };
    }

    if (!state.player.toolsWear) {
        state.player.toolsWear = { gauge: 60, gauge_pro: 100, obd: 50, obd_launch: 80, endoscope: 40, compressor: 50, battery_tester: 60 };
    }
}

function saveState() {
    try {
        const fullJson = JSON.stringify(state);
        localStorage.setItem("perekup_save_" + tgUserId, fullJson);

        if (window.FB_Bridge && window.FB_Bridge.CloudSave) {
            window.FB_Bridge.CloudSave.pushSave(tgUserId, state);
            
            if (state.player?.stats?.totalNetProfit > 0) {
                window.FB_Bridge.Leaderboard.updateRank(
                    tgUserId,
                    state.player.name,
                    state.player.stats.totalNetProfit,
                    state.player.level
                );
            }
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
    } catch(e) {}
    updateHeaderUI();
}

function resetGameData() {
    if (!confirm("Внимание! Вы уверены, что хотите полностью стереть весь прогресс, гараж, бизнес и начать заново? Это действие необратимо!")) {
        return;
    }

    try {
        localStorage.removeItem("perekup_save_" + tgUserId);
        localStorage.removeItem('perekoop_sim_save_v105_release');
        localStorage.removeItem('perekup_last_seen_version');
        localStorage.removeItem("perekup_db_seeded_v1");

        const cleanState = JSON.parse(JSON.stringify(DEFAULT_STATE));
        const cleanJson = JSON.stringify(cleanState);

        if (window.FB_Bridge && window.FB_Bridge.CloudSave) {
            window.FB_Bridge.CloudSave.pushSave(tgUserId, cleanState);
        }

        if (isCloudStorageAvailable && window.Telegram?.WebApp?.CloudStorage) {
            saveToTelegramCloud(cleanJson, () => {});
        }

        tgHaptic('warning');
        showToast("Прогресс сброшен. Перезагрузка...");
        setTimeout(() => {
            location.reload();
        }, 600);
    } catch(e) {
        location.reload();
    }
}

function syncCloudStorageManual() {
    saveState();
    showToast("Синхронизация с облаком Firestore запущена ✓");
    playSound('win');
    tgHaptic('success');
}

function openSaveManagerModal() {
    const area = document.getElementById('saveExportArea');
    if (area) {
        try { area.value = btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
        catch(e) { area.value = JSON.stringify(state); }
    }
    ModalManager.open('modalSaveManager');
    playSound('tick');
}

function exportSaveCodeAction() {
    const area = document.getElementById('saveExportArea');
    if (!area || !area.value) return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(area.value).then(() => {
            showToast("Код сейва скопирован!"); tgHaptic('success'); playSound('win');
        }).catch(() => { area.select(); document.execCommand('copy'); showToast("Код скопирован!"); });
    } else {
        area.select(); document.execCommand('copy'); showToast("Код скопирован!");
    }
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
        tgHaptic('error'); showToast("Некорректный код сейва!");
    }
}

function triggerMarketNewsEvent() {
    if (typeof MARKET_NEWS_EVENTS === 'undefined' || MARKET_NEWS_EVENTS.length === 0) return;
    const ev = MARKET_NEWS_EVENTS[Math.floor(Math.random() * MARKET_NEWS_EVENTS.length)];
    
    if (!state.marketModifiers) state.marketModifiers = { economy: 1, comfort: 1, premium: 1, hyper: 1, moto: 1, truck: 1, all: 1 };
    state.marketModifiers[ev.cat] = ev.mod;
    
    if (!state.player.phoneMessages) state.player.phoneMessages = [];
    state.player.phoneMessages.unshift({
        id: "sms_news_" + Date.now(),
        sender: ev.sender,
        avatar: ev.type === 'up' ? "📈" : "📉",
        preview: ev.title,
        time: "00:00",
        unread: true,
        chatHistory: [
            { from: "them", text: ev.text }
        ]
    });
    
    if (typeof PhoneManager !== 'undefined') PhoneManager.updateUnreadBadge();
    showToast(`📰 Свежие новости рынка: ${ev.title}`);
}

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

    if (typeof MARKET_NEWS_EVENTS !== 'undefined' && Math.random() < 0.35) {
        triggerMarketNewsEvent();
    }

    if (state.player.loanDebt > 0) {
        state.player.loanDebt = Math.round(state.player.loanDebt * 1.02);
    }

    if (state.player.safeDeposit > 0) {
        let percentEarned = Math.round(state.player.safeDeposit * 0.03);
        state.player.safeDeposit += percentEarned;
        spawnFloatingReward(`+${percentEarned.toLocaleString()} ₽ в сейфе`);
    }

    if (Array.isArray(state.player.bankDeposits)) {
        state.player.bankDeposits.forEach(dep => {
            dep.daysPassed = (dep.daysPassed || 0) + 1;
            let dailyRate = (dep.dailyPercent || 3.0) / 100;
            let gain = Math.round(dep.currentAmount * dailyRate);
            
            if (dep.autoCompound) {
                dep.currentAmount += gain;
            } else {
                dep.accumulatedProfit = (dep.accumulatedProfit || 0) + gain;
            }
        });
    }

    state.player.hunger = Math.max(10, (state.player.hunger || 80) - 25);
    state.player.mood = Math.max(10, (state.player.mood || 85) - 15);
    refreshDailyQuestsList();

    saveState();
    updateHeaderUI();
    showToast("Наступил новый день 🌙 Суточные лимиты, кассы и зарплаты обновлены!");
    playSound('win');
    tgHaptic('success');
}

// ========================================================
// 13. UI И ДАШБОРД ПРОФИЛЯ С ЧИСЛОВЫМ РОЛЛЕРОМ
// ========================================================
function updateHeaderUI() {
    let targetCash = state.player?.cash || 0;
    let targetStars = state.player?.stars || 0;
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

    setTxt('fuelAmount', fuel);
    setTxt('ticketsAmount', tck + "/" + mTck);
    setTxt('playerName', pName);
    setTxt('playerLvl', "Ур. " + lvl);
    setTxt('connectionsText', conn);
    setTxt('karmaText', karma);
    
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
    
    let hng = state.player?.hunger || 80;
    setTxt('hungerText', hng + "%");
    const hFill = document.getElementById('hungerFill');
    if (hFill) hFill.style.width = hng + "%";

    let md = state.player?.mood || 85;
    setTxt('moodText', md + "%");
    const mFill = document.getElementById('moodFill');
    if (mFill) mFill.style.width = md + "%";

    const vipBadge = document.getElementById('vipBadge');
    if (vipBadge) vipBadge.style.display = state.player?.vipPro ? 'block' : 'none';

    let gLen = state.garage ? state.garage.length : 0;
    let totalSlots = getTotalGarageSlots();
    let hasWorkshop = typeof checkPlayerCapability === 'function' ? checkPlayerCapability('tune') : false;
    
    if (hasWorkshop) {
        setTxt('garageHeaderSlots', `${gLen}/${totalSlots}`);
    } else {
        setTxt('garageHeaderSlots', `${gLen}/${totalSlots} ⛺`);
    }

    applyHudCustomization();
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
        showToast((delta > 0 ? "+" : "") + delta + " Stars ⭐");
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

function openDailyBonusModal() {
    const grid = document.getElementById('dailyBonusGrid');
    if (!grid || typeof DAILY_REWARDS_CONFIG === 'undefined') return;
    let sDay = state.player.streakDay || 1;
    let html = "";
    DAILY_REWARDS_CONFIG.forEach(r => {
        let isClaimed = sDay > r.day;
        let isCurrent = sDay === r.day;
        let cName = "daily-streak-day" + (isClaimed ? " claimed" : "") + (isCurrent ? " current" : "");
        let sym = isClaimed ? "✓" : (isCurrent ? "★" : "🔒");
        html += `<div class='${cName}'><div class='font-bold text-xs'>День ${r.day}</div><div class='sub-label my-1'>${r.title}</div><div>${sym}</div></div>`;
    });
    grid.innerHTML = html;

    const claimBtn = document.getElementById('btnClaimDaily');
    if (claimBtn) {
        let last = state.player.lastClaimedDay || 0;
        let pDay = state.player.day || 1;
        let canClaim = last < pDay;
        claimBtn.disabled = !canClaim;
        claimBtn.innerText = canClaim ? "Забрать награду" : "Уже получено сегодня";
    }
    ModalManager.open('modalDailyBonus');
}

function claimDailyReward() {
    let last = state.player.lastClaimedDay || 0;
    let pDay = state.player.day || 1;
    if (last >= pDay) return showToast("Награда уже получена сегодня!");

    let sDay = state.player.streakDay || 1;
    let currentReward = DAILY_REWARDS_CONFIG.find(r => r.day === sDay) || DAILY_REWARDS_CONFIG[0];
    const r = currentReward.reward;

    if (r.cash && typeof window.pushToMailbox === 'function') {
        window.pushToMailbox({
            type: "cash",
            amount: r.cash,
            title: `День ${sDay}: +${r.cash.toLocaleString()} ₽`,
            sender: "Календарь наград",
            desc: "Ежедневный денежный бонус перекупа.",
            badge: "БОНУС"
        });
    }
    if (r.fuel && typeof window.pushToMailbox === 'function') {
        window.pushToMailbox({
            type: "fuel",
            amount: r.fuel,
            title: `Топливный талон: +${r.fuel} ⛽`,
            sender: "Календарь наград",
            desc: "Заправка бака из календаря подарков.",
            badge: "ТОПЛИВО"
        });
    }
    if (r.connections && typeof window.pushToMailbox === 'function') {
        window.pushToMailbox({
            type: "connections",
            amount: r.connections,
            title: `Связи ПодКлюч: +${r.connections} 🤝`,
            sender: "Календарь наград",
            desc: "Контакты от Решалы за активную игру.",
            badge: "СВЯЗИ"
        });
    }
    if (r.stars && typeof window.pushToMailbox === 'function') {
        window.pushToMailbox({
            type: "stars",
            amount: r.stars,
            title: `Премиальные Stars: +${r.stars} ⭐`,
            sender: "Календарь наград",
            desc: "Звёзды перекупа из календаря.",
            badge: "STARS"
        });
    }
    if (r.freeImpoundPasses && typeof window.pushToMailbox === 'function') {
        window.pushToMailbox({
            type: "free_impound",
            amount: r.freeImpoundPasses,
            title: "Талон ГИБДД (Штрафстоянка)",
            sender: "Календарь наград",
            desc: "Бесплатный забор авто со штрафстоянки.",
            badge: "ГИБДД"
        });
    }
    if (r.tool && typeof window.pushToMailbox === 'function') {
        window.pushToMailbox({
            type: "tool",
            toolId: r.tool,
            title: "Диагностический Launch Pro",
            sender: "Календарь наград",
            desc: "Профессиональный сканер ЭБУ в ваш арсенал.",
            badge: "ПРИБОР"
        });
    }
    if (r.specialPlate && typeof window.pushToMailbox === 'function') {
        window.pushToMailbox({
            type: "plate",
            plate: r.specialPlate,
            title: `Блатной номер: ${r.specialPlate}`,
            sender: "Календарь наград",
            desc: "Редкий знак серии 777 в инвентарь.",
            badge: "НОМЕР"
        });
    }

    state.player.lastClaimedDay = pDay;
    state.player.streakDay = (sDay % 7) + 1;
    saveState();
    ModalManager.close('modalDailyBonus');
    playSound('win'); tgHaptic('success');
    openVerdictModal("БОНУС ОТПРАВЛЕН В ПОЧТУ! 🎁", "Ежедневная награда отправлена в приложение «Почта & Склад»:\n" + currentReward.title, true);
}

// ========================================================
// 14. АНАЛИТИЧЕСКИЙ ПРОФИЛЬ ПЕРЕКУПА
// ========================================================
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

    let rankTitle = lvl >= 50 ? "Олигарх Авторынка" : (lvl >= 30 ? "Хозяин Площадки" : (lvl >= 15 ? "Серый Делец" : "Гаражный Перекуп"));
    let rankColor = lvl >= 50 ? "color-amber" : (lvl >= 30 ? "color-purple" : "color-cyan");

    let repRating = (p.bankReputation?.rating || 5.0).toFixed(1);
    let fairDeals = p.bankReputation?.fairDealsCount || s.profitableSales || 0;

    let goals = (typeof NOTEPAD_CAREER_GOALS !== 'undefined') ? NOTEPAD_CAREER_GOALS : [];
    let achievementsHtml = goals.slice(0, 4).map(g => {
        let done = false;
        if (g.targetProfit && (s.totalNetProfit || 0) >= g.targetProfit) done = true;
        if (g.targetSales && totalSales >= g.targetSales) done = true;
        if (g.targetSlots && getTotalGarageSlots() >= g.targetSlots) done = true;
        if (g.targetHousing && (p.ownedHouses || []).includes(g.targetHousing)) done = true;

        return `
            <div class="glass-card p-2 text-left" style="border-left: 3px solid ${done ? 'var(--green)' : 'rgba(255,255,255,0.1)'};">
                <div class="flex-between">
                    <b class="text-xs ${done ? 'color-green' : 'color-main'}">${g.title}</b>
                    <span class="tag-badge ${done ? 'bg-tag-green' : 'bg-tag-dark'}">${done ? 'ВЫПОЛНЕНО ✓' : 'В ПРОЦЕССЕ'}</span>
                </div>
                <div class="sub-label mt-1" style="font-size:9px;">${g.desc}</div>
            </div>
        `;
    }).join('');

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
            <div class="sub-label mt-1 font-bold ${rankColor}">${rankTitle} (Уровень ${lvl})</div>
            
            <div class="xp-bar-wrap my-2" style="height:6px; max-width:240px; margin-left:auto; margin-right:auto;">
                <div class="xp-bar-fill" style="width: ${Math.min(100, ((p.xp || 0) / (p.maxXp || 120)) * 100)}%;"></div>
            </div>
            <div class="sub-label" style="font-size:9px;">Опыт: ${p.xp || 0} / ${p.maxXp || 120} XP</div>

            <div class="flex-between mt-3 pt-2" style="border-top: 1px dashed rgba(255,255,255,0.08);">
                <button onclick="openHudCustomizerModal()" class="btn btn-purple btn-sm btn-auto" style="font-size:10px;">
                    🎨 Скин & Эффекты
                </button>
                <button onclick="openPatchNotesModal()" class="btn btn-dark btn-sm btn-auto" style="font-size:10px;">
                    <i class="fa-solid fa-bolt color-amber"></i> Патчноут ${CURRENT_GAME_VERSION}
                </button>
            </div>
        </div>

        <div class="glass-card mb-3 p-3" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.14), #090e18); border-color: var(--green);">
            <div class="flex-between mb-1">
                <div>
                    <span class="sub-label" style="font-size:9.5px;">Совокупная капитализация активов:</span>
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
                    <span class="sub-label" style="font-size:9px;">Оценка автопарка:</span>
                    <div class="font-bold color-amber mt-1">${fleetValuation.toLocaleString()} ₽</div>
                </div>
            </div>
            <div class="sub-label text-right" style="font-size:9px;">Недвижимость в собственности: <b>${realEstateValuation.toLocaleString()} ₽</b></div>
        </div>

        <div class="glass-card mb-3 p-3">
            <b class="text-xs color-cyan block mb-2"><i class="fa-solid fa-chart-pie mr-1"></i> Бизнес-KPI торговли:</b>

            <div class="grid-2 mb-2">
                <div class="stat-box">
                    <div class="sub-label" style="font-size:9px;">Чистый профит:</div>
                    <div class="stat-value color-green">${(s.totalNetProfit || 0).toLocaleString()} ₽</div>
                </div>
                <div class="stat-box">
                    <div class="sub-label" style="font-size:9px;">Торговый винрейт:</div>
                    <div class="stat-value color-amber">${winrate}%</div>
                </div>
            </div>

            <div class="grid-3 mb-2" style="gap:6px;">
                <div class="stat-box p-2">
                    <div class="sub-label" style="font-size:8.5px;">Продано авто:</div>
                    <b class="text-xs mt-1 block">${totalSales} шт.</b>
                </div>
                <div class="stat-box p-2">
                    <div class="sub-label" style="font-size:8.5px;">Сделок в плюс:</div>
                    <b class="text-xs color-green mt-1 block">${s.profitableSales || 0}</b>
                </div>
                <div class="stat-box p-2">
                    <div class="sub-label" style="font-size:8.5px;">Сделок в минус:</div>
                    <b class="text-xs color-red mt-1 block">${s.lossSales || 0}</b>
                </div>
            </div>

            <div class="p-2 flex-between" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                <div>
                    <b class="text-xs color-green"><i class="fa-solid fa-shield-halved"></i> Рейтинг честности</b>
                    <div class="sub-label" style="font-size:9px;">Честных продаж: <b>${fairDeals}</b> • Отзывы: <b>⭐ ${repRating}</b></div>
                </div>
                <span class="tag-badge bg-tag-green">ПРОВЕРЕН</span>
            </div>
        </div>

        <div class="glass-card mb-3 p-3">
            <div class="flex-between mb-2">
                <b class="text-xs color-purple"><i class="fa-solid fa-trophy mr-1"></i> Карьерные достижения:</b>
                <span class="tag-badge bg-tag-purple">Цели</span>
            </div>
            <div class="space-y-2">
                ${achievementsHtml}
            </div>
        </div>

        <div class="glass-card p-3" style="background:#090e18; border-color:var(--border-glass);">
            <div class="flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <i class="fa-solid fa-cloud-arrow-up color-cyan"></i>
                    <b class="text-xs">Firestore Online Sync</b>
                </div>
                <span class="tag-badge bg-tag-green" id="cloudStorageStatus">Online: Активно ✓</span>
            </div>
            <div class="grid-2 mb-2">
                <button onclick="syncCloudStorageManual()" class="btn btn-cyan btn-sm">
                    <i class="fa-solid fa-rotate"></i> Синхронизация
                </button>
                <button onclick="openSaveManagerModal()" class="btn btn-dark btn-sm">
                    <i class="fa-solid fa-file-export"></i> Экспорт кода
                </button>
            </div>
            <button onclick="resetGameData()" class="btn btn-danger btn-sm w-full">
                <i class="fa-solid fa-trash-can mr-1"></i> Начать игру заново (Wipe)
            </button>
        </div>
    `;
}

// ========================================================
// 15. НАВИГАЦИЯ И ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// ========================================================
function switchTab(tabId) {
    try { initAudio(); playSound('tick'); tgHaptic('light'); } catch(e) {}
    
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
        if (tabId === 'tabPhone') {
            if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.renderPhoneScreen === 'function') {
                PhoneManager.renderPhoneScreen();
            }
        }
        if (tabId === 'tabLife') {
            if (typeof renderLifeScreen === 'function') renderLifeScreen();
            else if (typeof renderDiets === 'function') renderDiets();
        }
        if (tabId === 'tabProfile') renderProfileAnalytics();
    } catch(err) {
        console.error("switchTab render error:", err);
    }
}

function checkAutoShowPatchNotes() {
    try {
        const lastSeen = localStorage.getItem('perekup_last_seen_version');
        if (lastSeen !== CURRENT_GAME_VERSION) {
            setTimeout(() => { openPatchNotesModal(); }, 800);
        }
    } catch(e) {}
}

// ========================================================
// 16. СВАЙП-ЛИСТЕНЕР РЫНКА
// ========================================================
function initMarketScrollListener() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    mainContent.addEventListener('scroll', () => {
        const marketTab = document.getElementById('tabMarket');
        if (!marketTab || !marketTab.classList.contains('active')) return;

        const grid = document.getElementById('marketCatListContainer');
        const btnIcon = document.querySelector('#btnToggleMarketGrid i');

        if (mainContent.scrollTop > 90) {
            if (grid && !grid.classList.contains('collapsed')) {
                grid.classList.add('collapsed');
                if (btnIcon) btnIcon.className = "fa-solid fa-chevron-down";
            }
        }
    });

    let touchStartY = 0;
    let touchEndY = 0;

    mainContent.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    mainContent.addEventListener('touchmove', (e) => {
        touchEndY = e.touches[0].clientY;
        const marketTab = document.getElementById('tabMarket');
        if (!marketTab || !marketTab.classList.contains('active')) return;

        if (mainContent.scrollTop <= 2 && touchEndY - touchStartY > 65) {
            const grid = document.getElementById('marketCatListContainer');
            const btnIcon = document.querySelector('#btnToggleMarketGrid i');
            if (grid && grid.classList.contains('collapsed')) {
                grid.classList.remove('collapsed');
                if (btnIcon) btnIcon.className = "fa-solid fa-chevron-up";
                tgHaptic('light');
            }
        }
    }, { passive: true });
}

// ========================================================
// 17. ИНИЦИАЛИЗАЦИЯ И ИГРОВОЙ ЦИКЛ
// ========================================================
function initApp() {
    initTelegramAuthAndStorage(async () => {
        updateHeaderUI();
        updateLevelGatesUI();
        applyLanguageToDOM();
        applyHudCustomization();
        checkRealTimeDayChange();
        
        // Синхронизация облачной базы автомобилей
        if (window.FB_Bridge?.CarsCatalog) {
            try {
                await window.FB_Bridge.CarsCatalog.fetchCloudCars();
            } catch(e) {
                console.warn("[App] Фолбек на локальные авто:", e);
            }
        }

        if (!state.marketFeed || state.marketFeed.length === 0 || !state.marketFeed.some(c => c && !c.unavailable)) {
            if (typeof populateMarketFeed === 'function') populateMarketFeed();
        }
        if (!state.plateCatalog || state.plateCatalog.length === 0) {
            if (typeof refreshPlateCatalog === 'function') refreshPlateCatalog();
        }
        if (!state.contracts || state.contracts.length === 0) {
            if (typeof generateContracts === 'function') generateContracts();
        }

        if (typeof renderGarage === 'function') renderGarage();
        if (typeof renderSalesLot === 'function') renderSalesLot();
        if (typeof renderLifeScreen === 'function') renderLifeScreen();
        else if (typeof renderDiets === 'function') renderDiets();
        
        if (typeof renderContracts === 'function') renderContracts();
        if (typeof renderMarketFeed === 'function') renderMarketFeed();
        
        if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.init === 'function') {
            PhoneManager.init();
        }
        
        initMarketScrollListener();
        switchTab('tabMarket');
        checkAutoShowPatchNotes();
    });
}

let gameCycleSeconds = 0;

setInterval(() => {
    gameCycleSeconds++;

    if (gameCycleSeconds % 60 === 0) {
        checkRealTimeDayChange();
    }

    // Бизнес-кассы и доходы
    if (gameCycleSeconds % 30 === 0 && state.businesses) {
        let bizUpdated = false;
        const staffCat = typeof BUSINESS_STAFF_CATALOG !== 'undefined' ? BUSINESS_STAFF_CATALOG : { managers: [], masters: [], security: [] };

        state.businesses.forEach(b => {
            if (b && b.level > 0) {
                let hasAutoManager = false;
                let restockDiscount = 0;
                if (b.staff?.manager) {
                    let mgr = staffCat.managers.find(m => m.id === b.staff.manager);
                    if (mgr && mgr.autoRestock) {
                        hasAutoManager = true;
                        restockDiscount = mgr.restockDiscount || 0;
                    }
                }

                let maxStk = b.maxStock || 100;
                if ((b.level >= 5 || hasAutoManager) && (b.stock || 0) <= Math.round(maxStk * 0.15)) {
                    let cost = Math.round(15000 * (1 - restockDiscount));
                    if (b.stored >= cost) {
                        b.stored -= cost;
                        b.stock = maxStk;
                        bizUpdated = true;
                    } else if (state.player.cash >= cost) {
                        state.player.cash -= cost;
                        b.stock = maxStk;
                        bizUpdated = true;
                    }
                }

                if ((b.stock || 0) > 0) {
                    let masterSavePct = 0;
                    if (b.staff?.master) {
                        let mst = staffCat.masters.find(m => m.id === b.staff.master);
                        if (mst && mst.stockSavePct) masterSavePct = mst.stockSavePct;
                    }
                    let drop = Math.max(1, Math.round(2 * (1 - (masterSavePct / 100))));
                    b.stock = Math.max(0, b.stock - drop);

                    let calcInc = (typeof AppBusiness !== 'undefined' && typeof AppBusiness.calculateBusinessIncome === 'function')
                        ? AppBusiness.calculateBusinessIncome(b)
                        : (b.income * b.level);
                    let tickIncome = Math.round(calcInc / 5);
                    b.stored = (b.stored || 0) + tickIncome;
                    bizUpdated = true;
                }
            }
        });
        if (bizUpdated) {
            saveState();
            if (typeof PhoneManager !== 'undefined') PhoneManager.renderBusinessWidget();
        }
    }

    // Голод и кураж
    if (gameCycleSeconds % 45 === 0 && state.player) {
        state.player.hunger = Math.max(0, (state.player.hunger || 80) - 1);
        state.player.mood = Math.max(0, (state.player.mood || 85) - 1);
        updateHeaderUI();
    }

    // Остывание двигателей
    if (gameCycleSeconds % 10 === 0 && state.garage) {
        state.garage.forEach(car => {
            if (car && car.engineTemp && car.engineTemp > 90) {
                car.engineTemp = Math.max(90, car.engineTemp - 5);
            }
        });
    }

    // Таймеры авторынка
    const mTab = document.getElementById('tabMarket');
    if (mTab && mTab.classList.contains('active') && typeof updateMarketTimers === 'function') {
        updateMarketTimers();
    }
}, 1000);

// Экспорт всех функций
window.initApp = initApp;
window.switchTab = switchTab;
window.saveState = saveState;
window.updateHeaderUI = updateHeaderUI;
window.animateNumberRoll = animateNumberRoll;
window.showToast = showToast;
window.openVerdictModal = openVerdictModal;
window.renderPrizeTokensHTML = renderPrizeTokensHTML;
window.extractPrizesFromText = extractPrizesFromText;
window.playSound = playSound;
window.tgHaptic = tgHaptic;
window.addXp = addXp;
window.adjustResource = adjustResource;
window.openDailyBonusModal = openDailyBonusModal;
window.claimDailyReward = claimDailyReward;
window.toggleGameLanguage = toggleGameLanguage;
window.setGameLanguage = setGameLanguage;
window.applyHudCustomization = applyHudCustomization;
window.openHudCustomizerModal = openHudCustomizerModal;
window.switchCustomizerTab = switchCustomizerTab;
window.renderHudCustomizerContent = renderHudCustomizerContent;
window.setHudSolidColor = setHudSolidColor;
window.setHudCustomHexColor = setHudCustomHexColor;
window.toggleCyberIconsThemeAction = toggleCyberIconsThemeAction;
window.buyNickEffectAction = buyNickEffectAction;
window.setNickEffectAction = setNickEffectAction;
window.buyAvatarEffectAction = buyAvatarEffectAction;
window.setAvatarEffectAction = setAvatarEffectAction;
window.setSoundProfileAction = setSoundProfileAction;
window.trackQuestProgress = trackQuestProgress;
window.refreshDailyQuestsList = refreshDailyQuestsList;
window.checkSyndicateAccessDetails = checkSyndicateAccessDetails;
window.getTotalGarageSlots = getTotalGarageSlots;
window.getGarageSlotCost = getGarageSlotCost;
window.getExpressTicketUpgradeCost = getExpressTicketUpgradeCost;
window.getMarketRefreshCost = getMarketRefreshCost;
window.openSaveManagerModal = openSaveManagerModal;
window.exportSaveCodeAction = exportSaveCodeAction;
window.importSaveCodeAction = importSaveCodeAction;
window.syncCloudStorageManual = syncCloudStorageManual;
window.resetGameData = resetGameData;
window.openPatchNotesModal = openPatchNotesModal;
window.dismissPatchNotesModal = dismissPatchNotesModal;
window.renderProfileAnalytics = renderProfileAnalytics;
window.triggerMarketNewsEvent = triggerMarketNewsEvent;
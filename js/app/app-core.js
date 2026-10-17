// ========================================================
// js/app/app-core.js — ЯДРО: STATE, SAVE, MIGRATE (v4.3.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ Часть 1 из 3 (разгрузка app.js)
// ========================================================

window.CURRENT_GAME_VERSION = "v4.3.0";

const SAVE_VERSION = 14;
let SAVE_KEY_PREFIX = "perekup_v14_";

// ⭐ Плавающий курс Stars
const STAR_RATE_MIN = 22000;
const STAR_RATE_MAX = 28000;
const STAR_RATE_DEFAULT = 25000;

// Глобальные переменные, которые заполняются в app-loader.js
// (объявлены здесь для доступа из app-core и app-game)
let tgUserId = null;
let tgUserData = null;
let isPcDevSession = false;

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
// 1. ДЕФОЛТНЫЙ STATE
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

// ========================================================
// 2. МИГРАЦИЯ СЕЙВА
// ========================================================
function migrateSave(parsed) {
    if (!parsed || typeof parsed !== 'object') return parsed;
    const currentVersion = parsed.__saveVersion || 9;

    if (currentVersion < 10) {
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
        if (parsed.player && typeof parsed.player === 'object') {
            if (!Array.isArray(parsed.player._processedNotifIds)) parsed.player._processedNotifIds = [];
            if (!Array.isArray(parsed.player.pendingFriendRequests)) parsed.player.pendingFriendRequests = [];
            if (!Array.isArray(parsed.player.incomingTradeOffers)) parsed.player.incomingTradeOffers = [];
            if (!Array.isArray(parsed.player.platesInventory)) parsed.player.platesInventory = [];
        }
    }

    if (currentVersion < 14) {
        if (parsed.player && typeof parsed.player === 'object') {
            if (typeof parsed.player.stars === 'number' && parsed.player.stars > 0) {
                const oldStars = parsed.player.stars;
                parsed.player.stars = oldStars * 10;
                console.log(`[Migration] Stars: ${oldStars} → ${parsed.player.stars} (×10)`);
            }

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
// 3. SANITIZE STATE
// ========================================================
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
// 4. ЗАГРУЗКА STATE
// ========================================================
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

    try { _syncStarRateToBank(); } catch (e) {}

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

// ========================================================
// 5. СОХРАНЕНИЕ STATE
// ========================================================
let cloudSaveDebounceTimer = null;
let isCloudStorageAvailable = false;
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
// 6. СБРОС ПРОГРЕССА
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
// 7. ХЕЛПЕРЫ АВТО (VIN)
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

// ========================================================
// 8. ЭКСПОРТ
// ========================================================
window.state = state;
window.migrateSave = migrateSave;
window.applyLoadedState = applyLoadedState;
window.loadFromLocalStorage = loadFromLocalStorage;
window.saveState = saveState;
window.resetGameData = resetGameData;
window.generateVehicleVIN = generateVehicleVIN;
window.ensureCarIdentity = ensureCarIdentity;
window.isOwnerUser = _isOwner;
window.SAVE_VERSION = SAVE_VERSION;

console.log('[💠 app-core.js v4.3.0] State + Save + Migrate + Утилиты ✓');
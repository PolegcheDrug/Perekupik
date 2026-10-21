// ========================================================
// js/app/app-core.js — ЯДРО: STATE, SAVE, MIGRATE (v4.5.0 FULL-STABLE)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v4.5.0:
//   - Полностью сохранены все миграции сейвов (v10, v11, v12, v13, v14) без пропусков.
//   - Честный стартовый баланс для новичка: 75 000 ₽ (хватает на ВАЗ-2101 и толщиномер).
//   - Полная совместимость со всеми модулями, квотами и дебаунсом сохранений.
// ========================================================

window.CURRENT_GAME_VERSION = "v4.5.0";

const SAVE_VERSION = 15;
let SAVE_KEY_PREFIX = "perekup_v15_";

const STAR_RATE_MIN = 2200;
const STAR_RATE_MAX = 2800;
const STAR_RATE_DEFAULT = 2500;

window.tgUserId = window.tgUserId || null;
window.tgUserData = window.tgUserData || null;
window.isPcDevSession = window.isPcDevSession || false;

window.isPcDevMode = function() {
    return window.isPcDevSession === true || String(window.tgUserId || '').startsWith('pc_dev_');
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
        return window.AccessControl.isOwner(window.tgUserId);
    }
    return false;
}

// ========================================================
// 1. ДЕФОЛТНЫЙ STATE (СБАЛАНСИРОВАННЫЙ СТАРТ)
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
        avatarUrl: null,
        cash: 75000,                  // Честный старт на ВАЗ-2101
        stars: 0,
        connections: 0,
        expressTickets: 25,
        maxExpressTickets: 25,
        fuel: 100,
        level: 1,
        xp: 0,
        maxXp: 120,
        baseSlots: 2,
        vip: false,
        vipPro: false,
        lastFreeSpinDay: 0,
        lastFreeSuperSpinDay: 0,
        club: null,
        karma: 50,
        streetCred: 100,
        superSpinTickets: 0,
        freeImpoundPasses: 0,
        traderTitle: "Быстрый выкуп за кэш 💸",
        phoneWidgetsCollapsed: { biz: false, quests: false },
        stats: { bought: 0, sold: 0, profitableSales: 0, lossSales: 0, totalNetProfit: 0, scandalsAvoided: 0, bestSingleMargin: 0 },
        hunger: 80,
        mood: 85,
        loanDebt: 0,
        taxDebt: 0,
        day: 1,
        streakDay: 1,
        lastClaimedDay: 0,
        lastRealDayTimestamp: Date.now(),
        lastActiveTimestamp: Date.now(),
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
            vipBankTier: 'Стандарт', loanLimit: 80000,
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
    ownedPlates: [], registeredPlates: [],
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
// 2. ПОЛНЫЕ МИГРАЦИИ СЕЙВА (БЕЗ СОКРАЩЕНИЙ)
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
    if (!window.state.player) window.state.player = JSON.parse(JSON.stringify(DEFAULT_STATE.player));
    if (!window.state.player.baseSlots || window.state.player.baseSlots < 2) window.state.player.baseSlots = 2;
    if (!window.state.player.maxExpressTickets) window.state.player.maxExpressTickets = 25;
    if (typeof window.state.player.expressTickets !== 'number') window.state.player.expressTickets = window.state.player.maxExpressTickets;
    if (typeof window.state.player.cash !== 'number' || window.state.player.cash < 0) window.state.player.cash = 75000;
    if (typeof window.state.player.stars !== 'number' || window.state.player.stars < 0) window.state.player.stars = 0;
    if (!window.state.player.hudColorId) window.state.player.hudColorId = 'cyber_neon';
    if (!window.state.player.soundProfile) window.state.player.soundProfile = 'cyber';
    if (!window.state.player.traderTitle) window.state.player.traderTitle = "Быстрый выкуп за кэш 💸";
    if (!Array.isArray(window.state.player.mailbox)) window.state.player.mailbox = [];
    if (!Array.isArray(window.state.player.unlockedApps)) window.state.player.unlockedApps = [];
    if (!Array.isArray(window.state.player.businessAchievements)) window.state.player.businessAchievements = [];
    if (!Array.isArray(window.state.player.ownedBizSkins)) window.state.player.ownedBizSkins = [];
    if (!Array.isArray(window.state.player.ownedBizStickers)) window.state.player.ownedBizStickers = [];
    if (typeof window.state.player.businessSalesCount !== 'number') window.state.player.businessSalesCount = 0;
    if (!window.state.player.warehouse) window.state.player.warehouse = { maxCars: 6, maxItems: 12, cars: [], items: [] };
    if (!Array.isArray(window.state.player.warehouse.cars)) window.state.player.warehouse.cars = [];
    if (!Array.isArray(window.state.player.warehouse.items)) window.state.player.warehouse.items = [];
    if (!window.state.player.dailyQuests || window.state.player.dailyQuests.length === 0) {
        if (typeof refreshDailyQuestsList === 'function') refreshDailyQuestsList();
    }
    if (!window.state.player.mEventReactions || typeof window.state.player.mEventReactions !== 'object') window.state.player.mEventReactions = {};

    if (!Array.isArray(window.state.player._processedNotifIds)) window.state.player._processedNotifIds = [];
    if (!Array.isArray(window.state.player.pendingFriendRequests)) window.state.player.pendingFriendRequests = [];
    if (!Array.isArray(window.state.player.incomingTradeOffers)) window.state.player.incomingTradeOffers = [];
    if (!Array.isArray(window.state.player.platesInventory)) window.state.player.platesInventory = [];

    if (!window.state.player.interior || typeof window.state.player.interior !== 'object') window.state.player.interior = {};
    if (!Array.isArray(window.state.player.ownedHouses)) window.state.player.ownedHouses = [];
    if (typeof window.state.player.housingRentDue !== 'number') window.state.player.housingRentDue = 0;
    if (window.state.player.mortgage === undefined) window.state.player.mortgage = null;
    if (!window.state.player.housingId) window.state.player.housingId = 'trailer';
    if (!window.state.player.housingType) window.state.player.housingType = 'own';

    if (!Array.isArray(window.state.player.ownedThemes)) window.state.player.ownedThemes = ['cyber_neon'];
    if (!Array.isArray(window.state.player.ownedNickEffects)) window.state.player.ownedNickEffects = ['none'];
    if (!Array.isArray(window.state.player.ownedAvatarEffects)) window.state.player.ownedAvatarEffects = ['none'];
    if (!Array.isArray(window.state.player.ownedTitles)) window.state.player.ownedTitles = ['cash_buyer'];

    if (typeof window.state.player.streakDay !== 'number' || window.state.player.streakDay < 0) {
        window.state.player.streakDay = 1;
    }

    if (typeof window.state.player.dynamicStarRate !== 'number') {
        window.state.player.dynamicStarRate = STAR_RATE_DEFAULT;
    }
    if (!Array.isArray(window.state.player.dynamicStarRateHistory)) {
        window.state.player.dynamicStarRateHistory = [];
    }

    if (!window.state.player.lastActiveTimestamp) {
        window.state.player.lastActiveTimestamp = Date.now();
    }

    if (!window.state.player.paidParking || typeof window.state.player.paidParking !== 'object') {
        window.state.player.paidParking = { maxCars: 3, cars: [], dailyRate: 200, lastChargeDay: 0 };
    }

    if (!window.state.businessWorkshop) window.state.businessWorkshop = { equipment: 0, storage: 0, brand: 0, diagnostics: 0 };
    if (!window.state.businessStaff) window.state.businessStaff = { mechanic: 0, painter: 0, manager: 0, accountant: 0 };
    if (!Array.isArray(window.state.businessFleet)) window.state.businessFleet = [];

    window.state.__saveVersion = SAVE_VERSION;
    if (!Array.isArray(window.state.mEventsFeed)) window.state.mEventsFeed = [];
    if (typeof window.state.marketFeedVersion !== 'number') window.state.marketFeedVersion = 0;
}

// ========================================================
// 4. ЗАГРУЗКА STATE
// ========================================================
function applyLoadedState(parsed) {
    if (!parsed) parsed = {};
    parsed = migrateSave(parsed);

    if (parsed.lang) window.state.lang = parsed.lang;
    if (typeof parsed.marketFeedVersion === 'number') window.state.marketFeedVersion = parsed.marketFeedVersion;

    if (Array.isArray(parsed.mEventsFeed)) window.state.mEventsFeed = parsed.mEventsFeed;

    if (parsed.player) {
        window.state.player = { ...DEFAULT_STATE.player, ...parsed.player };
        if (parsed.player.stats) window.state.player.stats = { ...DEFAULT_STATE.player.stats, ...parsed.player.stats };
        if (parsed.player.tools) window.state.player.tools = { ...DEFAULT_STATE.player.tools, ...parsed.player.tools };
        if (parsed.player.toolsWear) window.state.player.toolsWear = { ...DEFAULT_STATE.player.toolsWear, ...parsed.player.toolsWear };
        if (parsed.player.crypto) window.state.player.crypto = { ...DEFAULT_STATE.player.crypto, ...parsed.player.crypto };
        if (parsed.player.bankReputation) window.state.player.bankReputation = { ...DEFAULT_STATE.player.bankReputation, ...parsed.player.bankReputation };
        if (parsed.player.phoneWidgetsCollapsed) window.state.player.phoneWidgetsCollapsed = { ...DEFAULT_STATE.player.phoneWidgetsCollapsed, ...parsed.player.phoneWidgetsCollapsed };
        if (parsed.player.club) window.state.player.club = parsed.player.club;

        if (!window.state.player.interior || typeof window.state.player.interior !== 'object') window.state.player.interior = {};
        if (!Array.isArray(window.state.player.ownedHouses)) window.state.player.ownedHouses = [];
        if (typeof window.state.player.housingRentDue !== 'number') window.state.player.housingRentDue = 0;
        if (window.state.player.mortgage === undefined) window.state.player.mortgage = null;

        if (!Array.isArray(window.state.player.ownedThemes)) window.state.player.ownedThemes = ['cyber_neon'];
        if (!Array.isArray(window.state.player.ownedNickEffects)) window.state.player.ownedNickEffects = ['none'];
        if (!Array.isArray(window.state.player.ownedAvatarEffects)) window.state.player.ownedAvatarEffects = ['none'];
        if (!Array.isArray(window.state.player.ownedTitles)) window.state.player.ownedTitles = ['cash_buyer'];

        if (!Array.isArray(window.state.player.phoneMessages)) window.state.player.phoneMessages = [];
        if (!Array.isArray(window.state.player.dailyQuests)) window.state.player.dailyQuests = [];
        if (!Array.isArray(window.state.player.bankHistory)) window.state.player.bankHistory = [];
        if (!Array.isArray(window.state.player.bankDeposits)) window.state.player.bankDeposits = [];
        if (!Array.isArray(window.state.player.mailbox)) window.state.player.mailbox = [];
        if (!Array.isArray(window.state.player.unlockedApps)) window.state.player.unlockedApps = [];
        if (!Array.isArray(window.state.player.businessAchievements)) window.state.player.businessAchievements = [];
        if (!Array.isArray(window.state.player.ownedBizSkins)) window.state.player.ownedBizSkins = [];
        if (!Array.isArray(window.state.player.ownedBizStickers)) window.state.player.ownedBizStickers = [];
        if (!window.state.player.mEventReactions || typeof window.state.player.mEventReactions !== 'object') window.state.player.mEventReactions = {};

        if (!Array.isArray(window.state.player._processedNotifIds)) window.state.player._processedNotifIds = [];
        if (!Array.isArray(window.state.player.pendingFriendRequests)) window.state.player.pendingFriendRequests = [];
        if (!Array.isArray(window.state.player.incomingTradeOffers)) window.state.player.incomingTradeOffers = [];
        if (!Array.isArray(window.state.player.platesInventory)) window.state.player.platesInventory = [];

        if (parsed.player.warehouse && typeof parsed.player.warehouse === 'object') {
            window.state.player.warehouse = { ...DEFAULT_STATE.player.warehouse, ...parsed.player.warehouse };
            if (!Array.isArray(window.state.player.warehouse.cars)) window.state.player.warehouse.cars = [];
            if (!Array.isArray(window.state.player.warehouse.items)) window.state.player.warehouse.items = [];
        }

        if (parsed.player.paidParking && typeof parsed.player.paidParking === 'object') {
            window.state.player.paidParking = { ...DEFAULT_STATE.player.paidParking, ...parsed.player.paidParking };
            if (!Array.isArray(window.state.player.paidParking.cars)) window.state.player.paidParking.cars = [];
        }
    }

    if (Array.isArray(parsed.garage)) window.state.garage = parsed.garage;
    if (Array.isArray(parsed.salesLot)) window.state.salesLot = parsed.salesLot;
    if (Array.isArray(parsed.contracts)) window.state.contracts = parsed.contracts;
    if (Array.isArray(parsed.ownedPlates)) window.state.ownedPlates = parsed.ownedPlates;
    if (Array.isArray(parsed.registeredPlates)) window.state.registeredPlates = parsed.registeredPlates;
    if (Array.isArray(parsed.businesses)) window.state.businesses = parsed.businesses;
    if (parsed.marketModifiers) window.state.marketModifiers = parsed.marketModifiers;
    if (Array.isArray(parsed.myP2PListings)) window.state.myP2PListings = parsed.myP2PListings;
    if (Array.isArray(parsed.p2pMarketListings)) window.state.p2pMarketListings = parsed.p2pMarketListings;
    if (parsed.confiscatedLot) window.state.confiscatedLot = parsed.confiscatedLot;
    if (Array.isArray(parsed.marketFeed)) window.state.marketFeed = parsed.marketFeed;
    if (Array.isArray(parsed.blackMarketPlates)) window.state.blackMarketPlates = parsed.blackMarketPlates;
    if (Array.isArray(parsed.officialPlateAuction)) window.state.officialPlateAuction = parsed.officialPlateAuction;
    if (Array.isArray(parsed.lifeChatMessages)) window.state.lifeChatMessages = parsed.lifeChatMessages;
    if (Array.isArray(parsed.friendsList)) window.state.friendsList = parsed.friendsList;

    if (parsed.businessWorkshop && typeof parsed.businessWorkshop === 'object') {
        window.state.businessWorkshop = { ...DEFAULT_STATE.businessWorkshop, ...parsed.businessWorkshop };
    }
    if (parsed.businessStaff && typeof parsed.businessStaff === 'object') {
        window.state.businessStaff = { ...DEFAULT_STATE.businessStaff, ...parsed.businessStaff };
    }
    if (Array.isArray(parsed.businessFleet)) window.state.businessFleet = parsed.businessFleet;

    sanitizeState();

    try { _syncStarRateToBank(); } catch (e) {}

    if (window.PlatesManager && typeof window.PlatesManager.syncLegacyOwnedPlates === 'function') {
        try {
            window.PlatesManager.syncLegacyOwnedPlates();
        } catch (e) {}
    }

    if (window.EventBus) {
        window.EventBus.emit('state:loaded', { source: 'applyLoadedState' });
    }
}

function loadFromLocalStorage() {
    if (!window.tgUserId) return false;
    try {
        let saved = localStorage.getItem("perekup_save_" + window.tgUserId);
        if (!saved) saved = localStorage.getItem("perekup_v14_" + window.tgUserId);
        if (!saved) saved = localStorage.getItem("perekup_v13_" + window.tgUserId);
        if (!saved) saved = localStorage.getItem(SAVE_KEY_PREFIX + window.tgUserId);

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
let localSaveDebounceTimer = null;
let isCloudStorageAvailable = false;
const CHUNK_SIZE = 2048;

function prepareStateForCloud() {
    return JSON.stringify(window.state);
}

function saveToTelegramCloud(jsonString, callback) {
    if (!window.Telegram?.WebApp?.CloudStorage) return;
    if (!window.tgUserId || window.tgUserId === "guest_777") return;
    const tgCloud = window.Telegram.WebApp.CloudStorage;
    const totalChunks = Math.ceil(jsonString.length / CHUNK_SIZE);

    tgCloud.setItem(SAVE_KEY_PREFIX + window.tgUserId + "_meta", String(totalChunks), (err) => {
        if (err) {
            if (callback) callback(false);
            return;
        }
        let completed = 0;
        for (let i = 0; i < totalChunks; i++) {
            const chunk = jsonString.substr(i * CHUNK_SIZE, CHUNK_SIZE);
            tgCloud.setItem(SAVE_KEY_PREFIX + window.tgUserId + "_c" + i, chunk, (cErr) => {
                if (!cErr) completed++;
                if (completed === totalChunks && callback) {
                    callback(true);
                }
            });
        }
    });
}

function _pruneStateMemory() {
    try {
        if (window.state?.player?.bankHistory && window.state.player.bankHistory.length > 15) {
            window.state.player.bankHistory = window.state.player.bankHistory.slice(0, 15);
        }
        if (Array.isArray(window.state?.mEventsFeed) && window.state.mEventsFeed.length > 10) {
            window.state.mEventsFeed = window.state.mEventsFeed.slice(-10);
        }
    } catch(e) {}
}

function _performSaveNow() {
    if (!window.tgUserId) return;
    if (String(window.tgUserId).startsWith('guest_') || String(window.tgUserId).startsWith('p_')) return;
    if (window.__IS_RESETTING__) return;

    try {
        window.state.__saveVersion = SAVE_VERSION;
        if (window.state.player) {
            window.state.player.lastActiveTimestamp = Date.now();
        }

        let fullJson = JSON.stringify(window.state);

        try {
            localStorage.setItem("perekup_save_" + window.tgUserId, fullJson);
            localStorage.setItem(SAVE_KEY_PREFIX + window.tgUserId, fullJson);
        } catch (storageErr) {
            _pruneStateMemory();
            fullJson = JSON.stringify(window.state);
            localStorage.setItem("perekup_save_" + window.tgUserId, fullJson);
            localStorage.setItem(SAVE_KEY_PREFIX + window.tgUserId, fullJson);
        }

        if (window.isPcDevMode && window.isPcDevMode()) {
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            return;
        }

        if (window.FB_Bridge && window.FB_Bridge.CloudSave) {
            window.FB_Bridge.CloudSave.pushSave(window.tgUserId, window.state);
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
            }, 2000);
        }
    } catch(e) {
        console.warn("[Save] Ошибка сохранения:", e);
    }

    if (typeof updateHeaderUI === 'function') updateHeaderUI();

    if (window.EventBus) {
        window.EventBus.emit('state:saved', { source: 'saveState' });
    }
}

function saveState(immediate = false) {
    if (immediate) {
        if (localSaveDebounceTimer) {
            clearTimeout(localSaveDebounceTimer);
            localSaveDebounceTimer = null;
        }
        _performSaveNow();
        return;
    }

    if (localSaveDebounceTimer) clearTimeout(localSaveDebounceTimer);
    localSaveDebounceTimer = setTimeout(() => {
        localSaveDebounceTimer = null;
        _performSaveNow();
    }, 150);
}

// ========================================================
// ЖИЗНЕННЫЙ ЦИКЛ (TELEGRAM WEBAPP)
// ========================================================
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveState(true);
        } else if (document.visibilityState === 'visible') {
            try {
                if (window.state?.player) {
                    const now = Date.now();
                    const lastActive = window.state.player.lastActiveTimestamp || now;
                    const awaySeconds = Math.max(0, Math.floor((now - lastActive) / 1000));

                    if (awaySeconds >= 15) {
                        if (typeof checkRealTimeDayChange === 'function') {
                            checkRealTimeDayChange();
                        }
                        if (window.PhoneBusiness && typeof window.PhoneBusiness.tickIncome === 'function') {
                            window.PhoneBusiness.tickIncome();
                        }
                    }
                    window.state.player.lastActiveTimestamp = now;
                }
                if (typeof updateHeaderUI === 'function') updateHeaderUI();
            } catch (e) {}
        }
    });

    window.addEventListener('pagehide', () => {
        saveState(true);
    });
}

// ========================================================
// НАДЁЖНЫЙ СБРОС ПРОГРЕССА (TELEGRAM WEBAPP + FIRESTORE SYNC)
// ========================================================
async function resetGameData() {
    // Поддержка нативного диалога Telegram WebApp (если доступен)
    const confirmMessage = "Вы уверены, что хотите сбросить прогресс до честного старта (75 000 ₽, 1 уровень)?";
    
    if (window.Telegram?.WebApp?.showConfirm) {
        window.Telegram.WebApp.showConfirm(confirmMessage, (confirmed) => {
            if (confirmed) _executeHardReset();
        });
    } else {
        if (confirm("⚠️ " + confirmMessage)) {
            _executeHardReset();
        }
    }
}

async function _executeHardReset() {
    window.__IS_RESETTING__ = true;
    showToast("⏳ Полная очистка профиля и облака...", "warning");

    try {
        // 1. Формируем чистый честный профиль новичка
        const cleanState = JSON.parse(JSON.stringify(DEFAULT_STATE));
        cleanState.player.uid = window.tgUserId || window.state?.player?.uid || "player_" + Date.now();
        cleanState.player.name = window.tgUserData?.first_name || window.state?.player?.name || "Taktoje";
        cleanState.player.cash = 75000;
        cleanState.player.stars = 0;
        cleanState.player.level = 1;
        cleanState.player.xp = 0;
        cleanState.player.superSpinTickets = 0;
        cleanState.__saveVersion = SAVE_VERSION;

        // 2. Очищаем локальные хранилища
        try {
            localStorage.clear();
            sessionStorage.clear();
            // Записываем чистый сейв сразу под всеми возможными ключами
            const cleanJson = JSON.stringify(cleanState);
            if (window.tgUserId) {
                localStorage.setItem("perekup_save_" + window.tgUserId, cleanJson);
                localStorage.setItem(SAVE_KEY_PREFIX + window.tgUserId, cleanJson);
            }
        } catch (e) {
            console.warn("[Reset] LocalStorage clear error:", e);
        }

        // 3. Синхронная перезапись облака Telegram CloudStorage (чтобы не восстановил старое)
        if (window.Telegram?.WebApp?.CloudStorage) {
            try {
                const tgCloud = window.Telegram.WebApp.CloudStorage;
                tgCloud.getKeys((err, keys) => {
                    if (!err && Array.isArray(keys)) {
                        keys.forEach(k => {
                            if (k && k.includes('perekup')) {
                                tgCloud.removeItem(k);
                            }
                        });
                    }
                });
            } catch (e) {}
        }

        // 4. Перезапись облака Firestore (принудительно накатываем чистый сейв)
        if (window.FB_Bridge?.db && window.tgUserId) {
            try {
                const uid = String(window.tgUserId);
                const mod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
                const { doc, setDoc, deleteDoc } = mod;

                // Удаляем старые записи автопарка и лидерборда
                await Promise.allSettled([
                    deleteDoc(doc(window.FB_Bridge.db, 'garages', uid)),
                    deleteDoc(doc(window.FB_Bridge.db, 'leaderboard', uid)),
                    // Перезаписываем профиль новичком
                    setDoc(doc(window.FB_Bridge.db, 'players', uid), cleanState.player),
                    setDoc(doc(window.FB_Bridge.db, 'users', uid), {
                        uid: uid,
                        name: cleanState.player.name,
                        level: 1,
                        cash: 75000,
                        netWorth: 75000,
                        updatedAt: Date.now()
                    })
                ]);
            } catch (fsErr) {
                console.warn("[Reset] Firestore wipe error:", fsErr);
            }
        }

        // 5. Очищаем активную память JS
        Object.keys(window.state).forEach(k => delete window.state[k]);
        Object.assign(window.state, cleanState);

        showToast("✅ Прогресс сброшен до 75 000 ₽! Перезагрузка...", "success");

        // 6. Перезагрузка без кеша
        setTimeout(() => {
            const cleanUrl = window.location.href.split('?')[0];
            window.location.replace(cleanUrl + '?t=' + Date.now());
        }, 500);

    } catch (err) {
        console.error("[Reset Error]", err);
        location.reload();
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
window.state = window.state;
window.migrateSave = migrateSave;
window.applyLoadedState = applyLoadedState;
window.loadFromLocalStorage = loadFromLocalStorage;
window.saveState = saveState;
window.resetGameData = resetGameData;
window.generateVehicleVIN = generateVehicleVIN;
window.ensureCarIdentity = ensureCarIdentity;
window.isOwnerUser = _isOwner;
window.SAVE_VERSION = SAVE_VERSION;

console.log('[💠 app-core.js v4.5.0 FULL-STABLE] Все миграции сохранены, честный баланс активирован ✓');

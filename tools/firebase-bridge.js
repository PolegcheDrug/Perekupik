// ========================================================
// firebase-bridge.js — ⚠️ LEGACY STUB (v3.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⚠️⚠️⚠️ ВАЖНО: ЭТОТ ФАЙЛ — ЗАГЛУШКА. НЕ ИСПОЛЬЗУЙТЕ ЕГО. ⚠️⚠️⚠️
//
// Монолитная версия firebase-bridge.js (v2.0.0) УДАЛЕНА.
// Вся функциональность разнесена на 5 ES-модулей:
//
//   js/firebase/firebase-core.js          — Auth, Players, Cleanup, Stats
//   js/firebase/firebase-market.js        — MarketLots, Plates, PlatesAuction
//   js/firebase/firebase-notifications.js — Notifications, Chat, Events, P2P
//   js/firebase/firebase-p2p.js           — P2PDeals, P2PTrade, Clubs, Leaderboard
//   js/firebase/firebase-friendships.js   — Friendships
//
// ВСЕ ОНИ УЖЕ ПОДКЛЮЧЕНЫ в index.html в <head> как ES-модули.
// Собранный window.FB_Bridge находится в js/firebase/firebase-p2p.js.
//
// ЗАЧЕМ ОСТАВЛЕН ЭТОТ ФАЙЛ:
//   - В старых сейвах/кэше/коде могут быть ссылки на "firebase-bridge.js"
//   - Если файл удалить — браузер может показать 404 в консоли (не критично, но шумно)
//   - Если кто-то случайно его подключит — этот stub НЕ СЛОМАЕТ игру,
//     а только предупредит в консоли
//
// ИСТОРИЯ:
//   v2.0.0 (28.09.2025) — монолитная версия (УДАЛЕНА)
//   v3.0.0 (18.10.2025) — заменён на stub после security-аудита
//
// ========================================================

(function() {
    'use strict';

    const WARNING_STYLE = 'color:#ff3366; font-weight:900; font-size:14px;';
    const INFO_STYLE = 'color:#00f2fe; font-weight:700;';
    const DIM_STYLE = 'color:#94a3b8;';

    console.warn('%c⚠️ firebase-bridge.js — ЭТО LEGACY STUB', WARNING_STYLE);
    console.warn('%cФайл больше НЕ содержит монолитный Firestore-код.', INFO_STYLE);
    console.warn('%cАктуальная реализация — в ES-модулях js/firebase/firebase-*.js', INFO_STYLE);
    console.warn('');
    console.warn('%cЕсли вы видите это предупреждение:', DIM_STYLE);
    console.warn('%c  1. Скорее всего вы случайно подключили firebase-bridge.js в index.html', DIM_STYLE);
    console.warn('%c  2. Проверьте <head> — там должны быть только module-скрипты firebase-*.js', DIM_STYLE);
    console.warn('%c  3. Удалите <script src="firebase-bridge.js">, если он там есть', DIM_STYLE);
    console.warn('');

    // ═══════════════════════════════════════════════════════
    // ЗАЩИТА: НЕ перезаписываем window.FB_Bridge, если он уже готов
    // ═══════════════════════════════════════════════════════
    if (window.FB_Bridge && typeof window.FB_Bridge === 'object') {
        console.log(
            '%c✓ window.FB_Bridge уже создан модулями firebase-*.js — этот stub ничего не трогает',
            'color:#00e676; font-weight:700;'
        );
        return;
    }

    // ═══════════════════════════════════════════════════════
    // FALLBACK: если модули ещё не загрузились (или упали),
    // создаём пустой безопасный stub, чтобы код не падал с
    // "Cannot read property 'X' of undefined".
    // ═══════════════════════════════════════════════════════
    console.warn(
        '%c⚠️ window.FB_Bridge пока НЕ создан — устанавливаю пустую заглушку',
        'color:#ffb300; font-weight:700;'
    );
    console.warn(
        '%cЕсли это первый запуск — подождите 1–2 секунды, модули Firebase загрузятся.',
        'color:#94a3b8;'
    );

    // Пустая безопасная заглушка: любой вызов вернёт промис с ошибкой,
    // но НЕ сломает игру окончательно.
    const noop = () => {};
    const emptyPromise = () => Promise.resolve({ success: false, error: 'Firebase ещё не готов' });
    const emptyArrayPromise = () => Promise.resolve([]);

    window.FB_Bridge = {
        // Метка: этот объект НЕ настоящий мост
        __isLegacyStub: true,
        __warning: 'Это пустая заглушка. Настоящий FB_Bridge создают js/firebase/firebase-*.js',

        enabled: false,

        // Пустые менеджеры
        Auth: {
            initSession: emptyPromise,
            getVerifiedUserId: () => null,
            getUserProfile: () => null,
            _forceVerifiedUserId: noop
        },
        Players: {
            pushSave: noop,
            pushSaveForce: emptyPromise,
            pullSave: emptyPromise
        },
        MarketLots: {
            fetchLots: emptyArrayPromise,
            subscribeToLots: noop,
            publishLot: emptyPromise,
            buyLotAtomic: emptyPromise,
            cancelLot: emptyPromise
        },
        Notifications: {
            fetchMyNotifications: emptyArrayPromise,
            subscribeToNotifications: noop,
            claimNotificationPayout: emptyPromise
        },
        ChatMessages: {
            sendMessage: emptyPromise,
            fetchMessagesForDialog: emptyArrayPromise,
            subscribeToDialog: noop
        },
        Events: {
            fetchEvents: emptyArrayPromise,
            pushEvent: emptyPromise,
            toggleReaction: emptyPromise,
            subscribeToEvents: noop
        },
        Friendships: {
            sendRequest: emptyPromise,
            acceptRequest: emptyPromise,
            declineRequest: emptyPromise,
            fetchFriendships: () => Promise.resolve({ friends: [], pending: [], subscribed: [] }),
            subscribeToFriendships: noop
        },
        P2PTrade: {
            sendTradeOffer: emptyPromise,
            acceptTradeOffer: emptyPromise,
            rejectTradeOffer: emptyPromise,
            cancelTradeOffer: emptyPromise,
            fetchTradeOffers: () => Promise.resolve({ incoming: [], outgoing: [] }),
            subscribeToTradeOffers: noop
        },
        Clubs: {
            fetchClubs: emptyArrayPromise,
            subscribeToClubs: noop,
            createClub: emptyPromise,
            joinClub: emptyPromise,
            depositToClubBank: emptyPromise
        },
        Leaderboard: {
            fetchTop: emptyArrayPromise,
            subscribeToTop: noop,
            updateRank: emptyPromise
        },
        CarsCatalog: {
            fetchCloudCars: emptyArrayPromise,
            saveCarToCloud: emptyPromise,
            seedDefaultCarsCatalog: emptyPromise
        },
        Plates: {
            claimPlateAtomic: emptyPromise,
            releasePlate: emptyPromise,
            isPlateAvailable: () => Promise.resolve(true)
        },
        P2PDeals: {
            fetchDeal: () => Promise.resolve(null),
            createDealDraft: emptyPromise,
            signDeal: emptyPromise,
            cancelDeal: emptyPromise,
            subscribeToDeal: noop
        },
        Cleanup: {
            runCleanup: emptyPromise
        },
        getStats: () => Promise.resolve({}),
        getProfile: () => null,
        getTelegramUser: () => null,

        // Алиасы
        P2P: null,
        Transactions: null,
        Offers: null
    };

    console.warn(
        '%c⚠️ Пустая заглушка FB_Bridge установлена. ' +
        'Firebase-функции НЕ РАБОТАЮТ. Перезагрузите страницу, если это ошибка.',
        'color:#ff3366; font-weight:900;'
    );

})();
// ========================================================
// firebase-bridge.js — ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ, P2P И ТОП (v0.4.5)[span_0](start_span)[span_0](end_span)
// Разработчики: Илья Чепиль (DXF) & Perekup Dev Team
// Улучшенная версия (REST API): Не требует загрузки тяжелых SDK.[span_1](start_span)[span_1](end_span)
// Оптимизировано для Telegram Mini Apps.[span_2](start_span)[span_2](end_span)
// ========================================================

const FIREBASE_CONFIG = {
    // ВНИМАНИЕ: Чтобы включить реальный мультиплеер, установите enabled: true[span_3](start_span)[span_3](end_span)
    // и вставьте URL вашей базы данных Firebase Realtime Database.[span_4](start_span)[span_4](end_span)
    enabled: false,[span_5](start_span)[span_5](end_span)
    dbUrl: "https://твоя-база-данных.firebaseio.com[span_6](start_span)"[span_6](end_span)
};

// Внутренний логгер для отладки[span_7](start_span)[span_7](end_span)
function fbLog(msg, data = null) {
    if (data) {[span_8](start_span)[span_8](end_span)
        console.log(`[☁️ Firebase Bridge v0.4.5] ${msg}`, data);[span_9](start_span)[span_9](end_span)
    } else {
        console.log(`[☁️ Firebase Bridge v0.4.5] ${msg}`);[span_10](start_span)[span_10](end_span)
    }
}

// ========================================================
// БАЗОВЫЕ REST-МЕТОДЫ (GET, PUT, PATCH, DELETE)[span_11](start_span)[span_11](end_span)
// ========================================================
async function fb_get(path) {
    if (!FIREBASE_CONFIG.enabled) return null;[span_12](start_span)[span_12](end_span)
    try {
        const controller = new AbortController();[span_13](start_span)[span_13](end_span)
        const timeoutId = setTimeout(() => controller.abort(), 6000);[span_14](start_span)[span_14](end_span)
        const response = await fetch(`${FIREBASE_CONFIG.dbUrl}/${path}.json`, { signal: controller.signal });[span_15](start_span)[span_15](end_span)
        clearTimeout(timeoutId);[span_16](start_span)[span_16](end_span)
        if (!response.ok) throw new Error("Сетевая ошибка при GET-запросе");[span_17](start_span)[span_17](end_span)
        return await response.json();[span_18](start_span)[span_18](end_span)
    } catch (error) {
        console.error("[Firebase Bridge] Ошибка GET:", error);[span_19](start_span)[span_19](end_span)
        return null;[span_20](start_span)[span_20](end_span)
    }
}

async function fb_put(path, data) {
    if (!FIREBASE_CONFIG.enabled) return true;[span_21](start_span)[span_21](end_span)
    try {
        const controller = new AbortController();[span_22](start_span)[span_22](end_span)
        const timeoutId = setTimeout(() => controller.abort(), 6000);[span_23](start_span)[span_23](end_span)
        const response = await fetch(`${FIREBASE_CONFIG.dbUrl}/${path}.json`, {
            method: 'PUT',[span_24](start_span)[span_24](end_span)
            headers: { 'Content-Type': 'application/json' },[span_25](start_span)[span_25](end_span)
            body: JSON.stringify(data),[span_26](start_span)[span_26](end_span)
            signal: controller.signal[span_27](start_span)[span_27](end_span)
        });
        clearTimeout(timeoutId);[span_28](start_span)[span_28](end_span)
        return response.ok;[span_29](start_span)[span_29](end_span)
    } catch (error) {
        console.error("[Firebase Bridge] Ошибка PUT:", error);[span_30](start_span)[span_30](end_span)
        return false;[span_31](start_span)[span_31](end_span)
    }
}

async function fb_patch(path, data) {
    if (!FIREBASE_CONFIG.enabled) return true;[span_32](start_span)[span_32](end_span)
    try {
        const controller = new AbortController();[span_33](start_span)[span_33](end_span)
        const timeoutId = setTimeout(() => controller.abort(), 6000);[span_34](start_span)[span_34](end_span)
        const response = await fetch(`${FIREBASE_CONFIG.dbUrl}/${path}.json`, {
            method: 'PATCH',[span_35](start_span)[span_35](end_span)
            headers: { 'Content-Type': 'application/json' },[span_36](start_span)[span_36](end_span)
            body: JSON.stringify(data),[span_37](start_span)[span_37](end_span)
            signal: controller.signal[span_38](start_span)[span_38](end_span)
        });
        clearTimeout(timeoutId);[span_39](start_span)[span_39](end_span)
        return response.ok;[span_40](start_span)[span_40](end_span)
    } catch (error) {
        console.error("[Firebase Bridge] Ошибка PATCH:", error);[span_41](start_span)[span_41](end_span)
        return false;[span_42](start_span)[span_42](end_span)
    }
}

async function fb_delete(path) {
    if (!FIREBASE_CONFIG.enabled) return true;[span_43](start_span)[span_43](end_span)
    try {
        const controller = new AbortController();[span_44](start_span)[span_44](end_span)
        const timeoutId = setTimeout(() => controller.abort(), 6000);[span_45](start_span)[span_45](end_span)
        const response = await fetch(`${FIREBASE_CONFIG.dbUrl}/${path}.json`, {
            method: 'DELETE',[span_46](start_span)[span_46](end_span)
            signal: controller.signal[span_47](start_span)[span_47](end_span)
        });
        clearTimeout(timeoutId);[span_48](start_span)[span_48](end_span)
        return response.ok;[span_49](start_span)[span_49](end_span)
    } catch (error) {
        console.error("[Firebase Bridge] Ошибка DELETE:", error);[span_50](start_span)[span_50](end_span)
        return false;[span_51](start_span)[span_51](end_span)
    }
}

// ========================================================
// 1. СИНХРОНИЗАЦИЯ ИГРОВОГО СОХРАНЕНИЯ (РЕЗЕРВ TG CLOUD)[span_52](start_span)[span_52](end_span)
// ========================================================
const CloudSaveManager = {
    async pushSave(userId, gameState) {
        if (!FIREBASE_CONFIG.enabled) return;[span_53](start_span)[span_53](end_span)
        fbLog(`Отправка бекапа сейва для пользователя: ${userId}`);[span_54](start_span)[span_54](end_span)
        
        // Создаем облегченную версию сейва для БД (без тяжелых массивов)[span_55](start_span)[span_55](end_span)
        const lightState = {
            player: gameState.player,[span_56](start_span)[span_56](end_span)
            timestamp: Date.now(),[span_57](start_span)[span_57](end_span)
            version: "v0.4.5[span_58](start_span)"[span_58](end_span)
        };
        
        await fb_put(`saves/${userId}`, lightState);[span_59](start_span)[span_59](end_span)
    },

    async pullSave(userId) {
        if (!FIREBASE_CONFIG.enabled) return null;[span_60](start_span)[span_60](end_span)
        fbLog(`Запрос сейва для пользователя: ${userId}`);[span_61](start_span)[span_61](end_span)
        return await fb_get(`saves/${userId}`);[span_62](start_span)[span_62](end_span)
    }
};

// ========================================================
// 2. ГЛОБАЛЬНАЯ P2P БИРЖА ТЕХНИКИ, НОМЕРОВ, БИЗНЕСА И ЖИЛЬЯ[span_63](start_span)[span_63](end_span)
// ========================================================
const P2PMarketManager = {
    // Выставить лот на глобальный рынок[span_64](start_span)[span_64](end_span)
    async publishLot(lotData) {
        if (!FIREBASE_CONFIG.enabled) {[span_65](start_span)[span_65](end_span)
            fbLog("Симуляция отправки лота (Firebase отключен)", lotData);[span_66](start_span)[span_66](end_span)
            return true; // Локальный симулятор обработает это в syndicate.js[span_67](start_span)[span_67](end_span)
        }
        
        fbLog(`Публикация лота: ${lotData.id}`);[span_68](start_span)[span_68](end_span)
        const payload = {};[span_69](start_span)[span_69](end_span)
        payload[lotData.id] = {
            ...lotData,[span_70](start_span)[span_70](end_span)
            timestamp: Date.now()[span_71](start_span)[span_71](end_span)
        };
        
        return await fb_patch(`p2p_market`, payload);[span_72](start_span)[span_72](end_span)
    },

    // Получить все активные лоты других игроков[span_73](start_span)[span_73](end_span)
    async fetchAllLots() {
        if (!FIREBASE_CONFIG.enabled) return null; // Вернет null, и игра использует моки из syndicate.js[span_74](start_span)[span_74](end_span)
        
        fbLog("Загрузка глобального P2P рынка...");[span_75](start_span)[span_75](end_span)
        const data = await fb_get(`p2p_market`);[span_76](start_span)[span_76](end_span)
        if (!data) return [];[span_77](start_span)[span_77](end_span)

        const lots = [];[span_78](start_span)[span_78](end_span)
        for (let key in data) {[span_79](start_span)[span_79](end_span)
            if (data.hasOwnProperty(key)) {[span_80](start_span)[span_80](end_span)
                lots.push(data[key]);[span_81](start_span)[span_81](end_span)
            }
        }
        
        // Сортируем: свежие сверху[span_82](start_span)[span_82](end_span)
        lots.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));[span_83](start_span)[span_83](end_span)
        return lots;[span_84](start_span)[span_84](end_span)
    },

    // Удалить лот (если кто-то купил или игрок снял с продажи)[span_85](start_span)[span_85](end_span)
    async removeLot(lotId) {
        if (!FIREBASE_CONFIG.enabled) return true;[span_86](start_span)[span_86](end_span)
        fbLog(`Удаление лота с биржи: ${lotId}`);[span_87](start_span)[span_87](end_span)
        return await fb_delete(`p2p_market/${lotId}`);[span_88](start_span)[span_88](end_span)
    }
};

// ========================================================
// 3. ГЛОБАЛЬНАЯ ТАБЛИЦА ЛИДЕРОВ (ТОП ПЕРЕКУПОВ)[span_89](start_span)[span_89](end_span)
// ========================================================
const LeaderboardManager = {
    // Отправить свои результаты в Топ[span_90](start_span)[span_90](end_span)
    async updateMyRank(userId, playerName, profit, level) {
        if (!FIREBASE_CONFIG.enabled) return;[span_91](start_span)[span_91](end_span)

        // Чтобы не спамить базу, обновляем только если прибыль больше 0[span_92](start_span)[span_92](end_span)
        if (profit <= 0) return;[span_93](start_span)[span_93](end_span)

        const rankData = {
            name: playerName,[span_94](start_span)[span_94](end_span)
            profit: profit,[span_95](start_span)[span_95](end_span)
            level: level,[span_96](start_span)[span_96](end_span)
            lastUpdate: Date.now()[span_97](start_span)[span_97](end_span)
        };

        fbLog(`Обновление статистики в топе: ${playerName} (${profit} ₽)`);[span_98](start_span)[span_98](end_span)
        await fb_put(`leaderboard/${userId}`, rankData);[span_99](start_span)[span_99](end_span)
    },

    // Получить Топ-50 игроков[span_100](start_span)[span_100](end_span)
    async fetchTopPlayers() {
        if (!FIREBASE_CONFIG.enabled) return null; // Игра использует моки из syndicate.js[span_101](start_span)[span_101](end_span)
        
        fbLog("Загрузка лидерборда...");[span_102](start_span)[span_102](end_span)
        const data = await fb_get(`leaderboard`);[span_103](start_span)[span_103](end_span)
        if (!data) return [];[span_104](start_span)[span_104](end_span)

        const players = [];[span_105](start_span)[span_105](end_span)
        for (let key in data) {[span_106](start_span)[span_106](end_span)
            if (data.hasOwnProperty(key)) {[span_107](start_span)[span_107](end_span)
                players.push({
                    id: key,[span_108](start_span)[span_108](end_span)
                    ...data[key][span_109](start_span)[span_109](end_span)
                });
            }
        }

        // Сортировка по убыванию прибыли[span_110](start_span)[span_110](end_span)
        players.sort((a, b) => (b.profit || 0) - (a.profit || 0));[span_111](start_span)[span_111](end_span)
        
        return players.slice(0, 50);[span_112](start_span)[span_112](end_span)
    }
};

// ========================================================
// 4. СИНХРОНИЗАЦИЯ АВТОКЛУБОВ[span_113](start_span)[span_113](end_span)
// ========================================================
const SyndicateClubsManager = {
    async createOrUpdateClub(clubId, clubData) {
        if (!FIREBASE_CONFIG.enabled) return true;[span_114](start_span)[span_114](end_span)
        fbLog(`Обновление данных автоклуба: ${clubData.name}`);[span_115](start_span)[span_115](end_span)
        return await fb_put(`clubs/${clubId}`, clubData);[span_116](start_span)[span_116](end_span)
    },

    async fetchAllClubs() {
        if (!FIREBASE_CONFIG.enabled) return null;[span_117](start_span)[span_117](end_span)
        const data = await fb_get(`clubs`);[span_118](start_span)[span_118](end_span)
        if (!data) return [];[span_119](start_span)[span_119](end_span)

        const clubs = [];[span_120](start_span)[span_120](end_span)
        for (let key in data) {[span_121](start_span)[span_121](end_span)
            if (data.hasOwnProperty(key)) {[span_122](start_span)[span_122](end_span)
                clubs.push(data[key]);[span_123](start_span)[span_123](end_span)
            }
        }
        return clubs;[span_124](start_span)[span_124](end_span)
    }
};

// Инициализация при старте[span_125](start_span)[span_125](end_span)
(function initFirebaseBridge() {
    if (FIREBASE_CONFIG.enabled) {[span_126](start_span)[span_126](end_span)
        fbLog("Инициализация завершена. РЕЖИМ МУЛЬТИПЛЕЕРА АКТИВЕН 🌐");[span_127](start_span)[span_127](end_span)
        fbLog(`Подключено к БД: ${FIREBASE_CONFIG.dbUrl}`);[span_128](start_span)[span_128](end_span)
    } else {
        fbLog("Модуль работает в локальном (offline) режиме 🔒. Для включения мультиплеера установите FIREBASE_CONFIG.enabled в true.");[span_129](start_span)[span_129](end_span)
    }
})();

// Экспорт методов в глобальную область[span_130](start_span)[span_130](end_span)
window.FB_Bridge = {
    CloudSave: CloudSaveManager,[span_131](start_span)[span_131](end_span)
    P2P: P2PMarketManager,[span_132](start_span)[span_132](end_span)
    Leaderboard: LeaderboardManager,[span_133](start_span)[span_133](end_span)
    Clubs: SyndicateClubsManager[span_134](start_span)[span_134](end_span)
};

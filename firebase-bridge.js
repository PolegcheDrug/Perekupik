// ========================================================
// firebase-bridge.js — ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ, P2P И ТОП (v0.4.0)
// Улучшенная версия (REST API): Не требует загрузки тяжелых SDK.
// Идеально оптимизировано для Telegram Mini Apps.
// ========================================================

const FIREBASE_CONFIG = {
    // ВНИМАНИЕ: Чтобы включить реальный мультиплеер, установите enabled: true
    // и вставьте URL вашей базы данных Firebase Realtime Database.
    enabled: false, 
    dbUrl: "https://твоя-база-данных.firebaseio.com" 
};

// Внутренний логгер для отладки
function fbLog(msg, data = null) {
    if (data) {
        console.log(`[☁️ Firebase Bridge] ${msg}`, data);
    } else {
        console.log(`[☁️ Firebase Bridge] ${msg}`);
    }
}

// ========================================================
// БАЗОВЫЕ REST-МЕТОДЫ (GET, PUT, PATCH, DELETE)
// ========================================================
async function fb_get(path) {
    if (!FIREBASE_CONFIG.enabled) return null;
    try {
        const response = await fetch(`${FIREBASE_CONFIG.dbUrl}/${path}.json`);
        if (!response.ok) throw new Error("Сетевая ошибка при GET-запросе");
        return await response.json();
    } catch (error) {
        console.error("[Firebase Bridge] Ошибка GET:", error);
        return null;
    }
}

async function fb_put(path, data) {
    if (!FIREBASE_CONFIG.enabled) return true;
    try {
        const response = await fetch(`${FIREBASE_CONFIG.dbUrl}/${path}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.ok;
    } catch (error) {
        console.error("[Firebase Bridge] Ошибка PUT:", error);
        return false;
    }
}

async function fb_patch(path, data) {
    if (!FIREBASE_CONFIG.enabled) return true;
    try {
        const response = await fetch(`${FIREBASE_CONFIG.dbUrl}/${path}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.ok;
    } catch (error) {
        console.error("[Firebase Bridge] Ошибка PATCH:", error);
        return false;
    }
}

async function fb_delete(path) {
    if (!FIREBASE_CONFIG.enabled) return true;
    try {
        const response = await fetch(`${FIREBASE_CONFIG.dbUrl}/${path}.json`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (error) {
        console.error("[Firebase Bridge] Ошибка DELETE:", error);
        return false;
    }
}

// ========================================================
// 1. СИНХРОНИЗАЦИЯ ИГРОВОГО СОХРАНЕНИЯ (РЕЗЕРВ TG CLOUD)
// ========================================================
const CloudSaveManager = {
    async pushSave(userId, gameState) {
        if (!FIREBASE_CONFIG.enabled) return;
        fbLog(`Отправка бекапа сейва для пользователя: ${userId}`);
        
        // Создаем облегченную версию сейва для БД (без тяжелых массивов)
        const lightState = {
            player: gameState.player,
            timestamp: Date.now(),
            version: "v0.4.0"
        };
        
        await fb_put(`saves/${userId}`, lightState);
    },

    async pullSave(userId) {
        if (!FIREBASE_CONFIG.enabled) return null;
        fbLog(`Запрос сейва для пользователя: ${userId}`);
        return await fb_get(`saves/${userId}`);
    }
};

// ========================================================
// 2. ГЛОБАЛЬНАЯ P2P БИРЖА ТЕХНИКИ И НОМЕРОВ
// ========================================================
const P2PMarketManager = {
    // Выставить лот на глобальный рынок
    async publishLot(lotData) {
        if (!FIREBASE_CONFIG.enabled) {
            fbLog("Симуляция отправки лота (Firebase отключен)", lotData);
            return true; // Локальный симулятор обработает это в syndicate.js
        }
        
        fbLog(`Публикация лота: ${lotData.id}`);
        // Используем PATCH, чтобы добавить лот, не затирая чужие
        const payload = {};
        payload[lotData.id] = lotData;
        
        return await fb_patch(`p2p_market`, payload);
    },

    // Получить все активные лоты других игроков
    async fetchAllLots() {
        if (!FIREBASE_CONFIG.enabled) return null; // Вернет null, и игра использует моки из syndicate.js
        
        fbLog("Загрузка глобального P2P рынка...");
        const data = await fb_get(`p2p_market`);
        if (!data) return [];

        // Преобразуем объект Firebase в массив
        const lots = [];
        for (let key in data) {
            if (data.hasOwnProperty(key)) {
                lots.push(data[key]);
            }
        }
        
        // Сортируем: свежие сверху
        lots.sort((a, b) => b.timestamp - a.timestamp);
        return lots;
    },

    // Удалить лот (если кто-то купил или игрок снял с продажи)
    async removeLot(lotId) {
        if (!FIREBASE_CONFIG.enabled) return true;
        fbLog(`Удаление лота с биржи: ${lotId}`);
        return await fb_delete(`p2p_market/${lotId}`);
    }
};

// ========================================================
// 3. ГЛОБАЛЬНАЯ ТАБЛИЦА ЛИДЕРОВ (ТОП ПЕРЕКУПОВ)
// ========================================================
const LeaderboardManager = {
    // Отправить свои результаты в Топ
    async updateMyRank(userId, playerName, profit, level) {
        if (!FIREBASE_CONFIG.enabled) return;

        // Чтобы не спамить базу, обновляем только если прибыль больше 0
        if (profit <= 0) return;

        const rankData = {
            name: playerName,
            profit: profit,
            level: level,
            lastUpdate: Date.now()
        };

        fbLog(`Обновление статистики в топе: ${playerName} (${profit} ₽)`);
        await fb_put(`leaderboard/${userId}`, rankData);
    },

    // Получить Топ-50 игроков
    async fetchTopPlayers() {
        if (!FIREBASE_CONFIG.enabled) return null; // Игра использует моки из syndicate.js
        
        fbLog("Загрузка лидерборда...");
        const data = await fb_get(`leaderboard`);
        if (!data) return [];

        const players = [];
        for (let key in data) {
            if (data.hasOwnProperty(key)) {
                players.push({
                    id: key,
                    ...data[key]
                });
            }
        }

        // Сортировка по убыванию прибыли
        players.sort((a, b) => b.profit - a.profit);
        
        // Возвращаем только топ 50
        return players.slice(0, 50);
    }
};

// ========================================================
// 4. СИНХРОНИЗАЦИЯ АВТОКЛУБОВ
// ========================================================
const SyndicateClubsManager = {
    async createOrUpdateClub(clubId, clubData) {
        if (!FIREBASE_CONFIG.enabled) return true;
        fbLog(`Обновление данных автоклуба: ${clubData.name}`);
        return await fb_put(`clubs/${clubId}`, clubData);
    },

    async fetchAllClubs() {
        if (!FIREBASE_CONFIG.enabled) return null;
        const data = await fb_get(`clubs`);
        if (!data) return [];

        const clubs = [];
        for (let key in data) {
            if (data.hasOwnProperty(key)) {
                clubs.push(data[key]);
            }
        }
        return clubs;
    }
};

// Инициализация при старте
(function initFirebaseBridge() {
    if (FIREBASE_CONFIG.enabled) {
        fbLog("Инициализация завершена. РЕЖИМ МУЛЬТИПЛЕЕРА АКТИВЕН 🌐");
        fbLog(`Подключено к БД: ${FIREBASE_CONFIG.dbUrl}`);
    } else {
        fbLog("Модуль работает в локальном (offline) режиме 🔒. Для включения мультиплеера измените FIREBASE_CONFIG.enabled на true.");
    }
})();

// Экспорт методов в глобальную область (для вызова из app.js и syndicate.js)
window.FB_Bridge = {
    CloudSave: CloudSaveManager,
    P2P: P2PMarketManager,
    Leaderboard: LeaderboardManager,
    Clubs: SyndicateClubsManager
};
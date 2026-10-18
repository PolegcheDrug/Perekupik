/**
 * tools/bot-p2p-notifier.js
 * Воркер рассылки P2P push-уведомлений через Telegram Bot API.
 * Запуск: node tools/bot-p2p-notifier.js
 *
 * ⚠️ ВАЖНО: BOT_TOKEN теперь читается ТОЛЬКО из переменных окружения.
 * Никаких токенов в коде. Создайте tools/.env с BOT_TOKEN=...
 *
 * ⭐ v2.0.0 (SECURITY FIX):
 *   - УДАЛЁН захардкоженный BOT_TOKEN (был скомпрометирован)
 *   - Жёсткая проверка: без токена процесс падает с понятной ошибкой
 *   - Поддержка .env файла (если установлен пакет dotenv)
 *   - Улучшено логирование (не светим токен в консоль)
 *   - Graceful shutdown на SIGINT/SIGTERM
 *   - Проверка BOT_TOKEN при старте через getMe (валидация)
 */

'use strict';

// ⭐ Опциональная загрузка .env (если пакет установлен)
try {
    require('dotenv').config({ path: require('path').join(__dirname, '.env') });
} catch (e) {
    // dotenv не установлен — работаем с системными переменными окружения
    // Установить: npm install dotenv
}

// ⭐ ЗАЩИТА: токен ТОЛЬКО из окружения
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: BOT_TOKEN не задан!');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
    console.error('Как исправить:');
    console.error('  1. Создайте файл tools/.env с содержимым:');
    console.error('       BOT_TOKEN=ваш_новый_токен_из_@BotFather');
    console.error('');
    console.error('  2. Или установите переменную окружения:');
    console.error('       Linux/Mac:  export BOT_TOKEN="ваш_токен"');
    console.error('       Windows:    set BOT_TOKEN=ваш_токен');
    console.error('');
    console.error('  3. Запустите: node tools/bot-p2p-notifier.js');
    console.error('');
    console.error('⚠️  Не коммитьте .env в git! Убедитесь что он в .gitignore');
    console.error('');
    process.exit(1);
}

// Базовая валидация формата токена (не гарантирует подлинность, но ловит опечатки)
if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(BOT_TOKEN)) {
    console.error('❌ BOT_TOKEN имеет некорректный формат. Ожидается: <digits>:<chars>');
    process.exit(1);
}

const GAME_URL = process.env.GAME_URL || "https://polegchedrug.github.io/Perekupik/";

// ⭐ Маскировка токена в логах (показываем только ID бота)
const _botIdForLog = BOT_TOKEN.split(':')[0];
const _maskedToken = `${_botIdForLog}:***`;

// ========================================================
// FIREBASE
// ========================================================
const { initializeApp } = require('firebase/app');
const {
    getFirestore,
    collection,
    query,
    where,
    onSnapshot,
    deleteDoc,
    doc
} = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyAV-FUWKge9c6sO-diK7wGqN3p1UbuW7Xc",
    authDomain: "perekupik-e2979.firebaseapp.com",
    projectId: "perekupik-e2979",
    storageBucket: "perekupik-e2979.firebasestorage.app",
    messagingSenderId: "242959354626",
    appId: "1:242959354626:web:f03ff4725763c86d33501b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ========================================================
// ЛОГИРОВАНИЕ
// ========================================================
function logInfo(msg, ...args) {
    console.log(`[${new Date().toISOString()}] [🤖 Bot] ${msg}`, ...args);
}
function logWarn(msg, ...args) {
    console.warn(`[${new Date().toISOString()}] [⚠️ Bot] ${msg}`, ...args);
}
function logError(msg, ...args) {
    console.error(`[${new Date().toISOString()}] [❌ Bot] ${msg}`, ...args);
}

logInfo(`Слушатель очереди P2P-уведомлений запускается...`);
logInfo(`Bot ID: ${_botIdForLog} (token: ${_maskedToken})`);
logInfo(`Game URL: ${GAME_URL}`);

// ========================================================
// TELEGRAM API
// ========================================================
async function sendTelegramPush(chatId, text) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚗 Перейти к сделке в игре', url: GAME_URL }]
            ]
        }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return {
                ok: false,
                error_code: response.status,
                description: `HTTP ${response.status}`
            };
        }

        return await response.json();
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            return { ok: false, description: 'Request timeout (15s)' };
        }
        throw err;
    }
}

// ⭐ Валидация токена при старте через getMe
async function validateBotToken() {
    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`, {
            signal: AbortSignal.timeout(10000)
        });
        const data = await res.json();

        if (!data.ok) {
            logError(`Telegram API отклонил токен: ${data.description || 'unknown'}`);
            logError(`Проверьте что BOT_TOKEN действителен и не отозван.`);
            process.exit(1);
        }

        logInfo(`✓ Токен валиден. Бот: @${data.result.username} (${data.result.first_name})`);
        return true;
    } catch (err) {
        logError(`Не удалось проверить токен (сеть?):`, err.message);
        logWarn(`Продолжаем запуск, но проверьте соединение с api.telegram.org`);
        return false;
    }
}

// ========================================================
// ОБРАБОТКА ОЧЕРЕДИ
// ========================================================
async function processTask(task, taskId) {
    // Валидация
    if (!task.targetChatId || !task.text) {
        logWarn(`Задача ${taskId} некорректна (нет chat_id или text), удаляем`);
        try {
            await deleteDoc(doc(db, "p2p_notifications_queue", taskId));
        } catch (e) {
            logError(`Не удалось удалить некорректную задачу ${taskId}:`, e.message);
        }
        return;
    }

    const chatIdStr = String(task.targetChatId);
    if (chatIdStr.startsWith('bot_') || chatIdStr.startsWith('system_')) {
        logWarn(`Задача ${taskId} адресована системному аккаунту, пропускаем`);
        await deleteDoc(doc(db, "p2p_notifications_queue", taskId));
        return;
    }

    try {
        logInfo(`📨 Отправка → ChatID: ${task.targetChatId} (тип: ${task.type || 'p2p'})`);

        const res = await sendTelegramPush(task.targetChatId, task.text);

        if (res.ok) {
            logInfo(`✓ Доставлено игроку: ${task.targetChatId}`);
            await deleteDoc(doc(db, "p2p_notifications_queue", taskId));
        } else {
            logWarn(`Telegram API вернул ошибку: ${res.description} (code: ${res.error_code})`);

            // Ошибки, при которых задача не имеет смысла — удаляем
            const permanentErrors = [400, 403];
            if (permanentErrors.includes(res.error_code)) {
                logWarn(`Задача ${taskId} не может быть доставлена (${res.description}), удаляем`);
                await deleteDoc(doc(db, "p2p_notifications_queue", taskId));
            }
            // 429 (rate limit) и 5xx — оставляем задачу, повторим при следующем снэпшоте
        }
    } catch (err) {
        logError(`Сбой отправки задачи ${taskId}:`, err.message);
        // Сетевые ошибки — оставляем задачу в очереди
    }
}

// ========================================================
// ГЛАВНЫЙ ЦИКЛ
// ========================================================
let _unsubscribe = null;

function startListener() {
    const q = query(
        collection(db, "p2p_notifications_queue"),
        where("status", "==", "pending")
    );

    _unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const task = change.doc.data();
                const taskId = change.doc.id;
                processTask(task, taskId).catch(err => {
                    logError(`Unhandled error в processTask(${taskId}):`, err);
                });
            }
        });
    }, (error) => {
        logError(`Ошибка Firestore-снэпшота:`, error.message);
        logInfo(`Попытка переподключения через 5с...`);
        setTimeout(() => {
            try { if (_unsubscribe) _unsubscribe(); } catch (e) {}
            startListener();
        }, 5000);
    });

    logInfo(`Слушатель очереди активен. Ожидаем задачи из p2p_notifications_queue...`);
}

// ========================================================
// GRACEFUL SHUTDOWN
// ========================================================
function gracefulShutdown(signal) {
    logInfo(`Получен ${signal}, завершаем работу...`);
    try {
        if (_unsubscribe) _unsubscribe();
    } catch (e) {}
    setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
    logError(`Unhandled promise rejection:`, reason);
});

process.on('uncaughtException', (err) => {
    logError(`Uncaught exception:`, err.message, err.stack);
});

// ========================================================
// ЗАПУСК
// ========================================================
(async () => {
    await validateBotToken();
    startListener();
})();
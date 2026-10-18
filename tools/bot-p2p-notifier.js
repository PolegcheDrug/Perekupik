/**
 * tools/bot-p2p-notifier.js
 * Воркер рассылки P2P push-уведомлений и автоликвидации зависших лотов (> 24ч).
 * Запуск: node tools/bot-p2p-notifier.js
 *
 * ⭐ v2.1.0 (P2P BOT AUTO-BUYOUT & INCIDENTS):
 *   - Встроен периодический сканер зависших лотов (дольше 24 часов).
 *   - 5 вариативных сценариев (мошенники, дисконт 25-50%, ДТП, угон, эвакуация).
 *   - Атомарное начисление выплаты через notifications и транзакции.
 *   - Push-уведомление в Telegram с описанием инцидента.
 */

'use strict';

try {
    require('dotenv').config({ path: require('path').join(__dirname, '.env') });
} catch (e) {
    // dotenv не установлен — работаем с системными переменными окружения
}

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: BOT_TOKEN не задан!');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Создайте tools/.env с BOT_TOKEN=...');
    process.exit(1);
}

if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(BOT_TOKEN)) {
    console.error('❌ BOT_TOKEN имеет некорректный формат.');
    process.exit(1);
}

const GAME_URL = process.env.GAME_URL || "https://polegchedrug.github.io/Perekupik/";
const _botIdForLog = BOT_TOKEN.split(':')[0];
const _maskedToken = `${_botIdForLog}:***`;

// Настройки таймера устаревания (24 часа)
const LOT_EXPIRE_HOURS = 24;
const LOT_EXPIRE_MS = LOT_EXPIRE_HOURS * 60 * 60 * 1000;
const CHECK_STALE_INTERVAL_MS = 60 * 1000; // Проверка каждую минуту

// ========================================================
// FIREBASE
// ========================================================
const { initializeApp } = require('firebase/app');
const {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    setDoc,
    updateDoc,
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

logInfo(`Слушатель P2P и сканер зависших лотов запускаются...`);
logInfo(`Bot ID: ${_botIdForLog} (token: ${_maskedToken})`);

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

async function validateBotToken() {
    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`, {
            signal: AbortSignal.timeout(10000)
        });
        const data = await res.json();

        if (!data.ok) {
            logError(`Telegram API отклонил токен: ${data.description || 'unknown'}`);
            process.exit(1);
        }

        logInfo(`✓ Токен валиден. Бот: @${data.result.username}`);
        return true;
    } catch (err) {
        logError(`Не удалось проверить токен:`, err.message);
        return false;
    }
}

// ========================================================
// ПУЛ ВАРИАТИВНЫХ СОБЫТИЙ ДЛЯ ЗАВИСШИХ ЛОТОВ
// ========================================================
function getRandomStaleEvent(lotName, askingPrice) {
    const events = [
        {
            type: 'aggregator_buyout',
            title: '🏢 Срочный выкуп каршерингом / агрегатором',
            discountPct: Math.floor(25 + Math.random() * 10), // 25-35% дисконт
            getStory: (disc, payout) =>
                `Ваш лот <b>«${lotName}»</b> простоял на бирже более суток без спроса. ` +
                `Сетевой автосалон забрал его оптом со скидкой <b>${disc}%</b>.\n` +
                `💰 Начислено: <b>+${payout.toLocaleString()} ₽</b>.`,
            pushEmoji: '🤝'
        },
        {
            type: 'fraud_scheme',
            title: '⚠️ Нарвались на серых перекупов!',
            discountPct: Math.floor(38 + Math.random() * 12), // 38-50% дисконт
            getStory: (disc, payout) =>
                `При ночной продаже <b>«${lotName}»</b> покупатели начали агрессивно сбивать цену у капота, найдя скрытые дефекты. ` +
                `Вы уступили <b>${disc}%</b> стоимости.\n` +
                `💸 Вам переведено: <b>+${payout.toLocaleString()} ₽</b>.`,
            pushEmoji: '🕵️‍♂️'
        },
        {
            type: 'parking_crash',
            title: '💥 ДТП на открытой стоянке авторынка!',
            discountPct: 70, // выплата 30% от страховой
            getStory: (disc, payout) =>
                `Ночью на парковке в ваш <b>«${lotName}»</b> на скорости влетела другая машина. Виновник скрылся. ` +
                `Страховая компания возместила ущерб по остаточной стоимости (-70%).\n` +
                `🛡️ Выплата по страховому случаю: <b>+${payout.toLocaleString()} ₽</b>.`,
            pushEmoji: '🚨'
        },
        {
            type: 'car_theft',
            title: '🏴‍☠️ Автомобиль угнали со стоянки!',
            discountPct: 100, // 0 руб
            getStory: () =>
                `Пока <b>«${lotName}»</b> стоял более 24 часов на неохраняемой парковке, его вскрыли кодграббером и отогнали в теневой отстойник.\n` +
                `❌ Машина утеряна. Полиция завела уголовное дело, компенсация: <b>0 ₽</b>.`,
            pushEmoji: '🚨'
        },
        {
            type: 'impound_evacuation',
            title: '🚔 Эвакуация на штрафстоянку за нарушение разметки',
            discountPct: 60, // выплата 40%
            getStory: (disc, payout) =>
                `Администрация авторынка признала стоянку <b>«${lotName}»</b> нарушением и принудительно реализовала лот с аукциона для покрытия штрафов.\n` +
                `💰 Остаток средств после штрафов переведён вам: <b>+${payout.toLocaleString()} ₽</b>.`,
            pushEmoji: '🪪'
        }
    ];

    const idx = Math.floor(Math.random() * events.length);
    const selected = events[idx];
    const discount = selected.discountPct;
    const payout = Math.max(0, Math.round(askingPrice * (1 - discount / 100)));

    return {
        ...selected,
        discountPct: discount,
        payoutAmount: payout,
        description: selected.getStory(discount, payout)
    };
}

// ========================================================
// СКАНЕР ЗАВИСШИХ ЛОТОВ (> 24 ЧАСОВ)
// ========================================================
async function checkStaleMarketLots() {
    try {
        const now = Date.now();
        const q = query(
            collection(db, "market_lots"),
            where("status", "==", "active")
        );

        const snap = await getDocs(q);
        if (snap.empty) return;

        for (const lotDoc of snap.docs) {
            const lot = lotDoc.data();
            const lotId = lotDoc.id;

            const createdAt = Number(lot.createdAt || lot.timestamp || 0);
            if (!createdAt) continue;

            const ageMs = now - createdAt;

            // Если лот активен дольше 24 часов
            if (ageMs >= LOT_EXPIRE_MS) {
                const askingPrice = Number(lot.price) || 100000;
                const lotName = lot.name || 'Автомобиль';
                const sellerId = String(lot.sellerId || '');

                logWarn(`⌛ Лот ${lotId} («${lotName}») висит более ${LOT_EXPIRE_HOURS}ч. Запуск автовыкупа...`);

                const event = getRandomStaleEvent(lotName, askingPrice);

                // 1. Помечаем лот как проданный/ликвидированный
                await updateDoc(doc(db, "market_lots", lotId), {
                    status: 'sold',
                    liquidatedByBot: true,
                    liquidationType: event.type,
                    liquidationDiscount: event.discountPct,
                    soldAt: now,
                    finalPrice: event.payoutAmount
                });

                // 2. Создаем уведомление с выплатой продавцу (если выплата > 0)
                const notifId = 'notif_liq_' + now + '_' + Math.random().toString(36).substring(2, 6);
                await setDoc(doc(db, "notifications", notifId), {
                    toUser: sellerId,
                    type: "deal_payout",
                    title: `${event.pushEmoji} ${event.title}`,
                    text: event.description,
                    amount: event.payoutAmount,
                    lotId: lotId,
                    read: false,
                    claimed: false,
                    timestamp: now,
                    expireAt: now + (7 * 24 * 60 * 60 * 1000)
                });

                // 3. Записываем транзакцию
                const txId = 'tx_liq_' + now + '_' + Math.random().toString(36).substring(2, 6);
                await setDoc(doc(db, "transactions", txId), {
                    tx_id: txId,
                    lot_id: lotId,
                    sellerId: sellerId,
                    buyerId: 'bot_liquidator',
                    buyerName: 'Система ликвидации',
                    item: lotName,
                    price: askingPrice,
                    payout: event.payoutAmount,
                    discountPct: event.discountPct,
                    reason: event.type,
                    timestamp: now
                });

                // 4. Отправляем Telegram Push продавцу
                const isNumericChatId = /^\d+$/.test(sellerId);
                if (isNumericChatId) {
                    const pushMsg =
                        `${event.pushEmoji} <b>P2P БИРЖА: ${event.title}</b>\n\n` +
                        event.description + `\n\n` +
                        `<i>Заберите деньги во вкладке «Уведомления» в игре.</i>`;

                    sendTelegramPush(sellerId, pushMsg).catch(e => {
                        logWarn(`Не удалось отправить пуш ликвидации на ${sellerId}:`, e.message);
                    });
                }

                logInfo(`✓ Лот ${lotId} ликвидирован по сценарию [${event.type}], выплата: ${event.payoutAmount} ₽`);
            }
        }
    } catch (err) {
        logError('Ошибка сканера зависших лотов:', err.message);
    }
}

// ========================================================
// ОБРАБОТКА ОЧЕРЕДИ СТАНДАРТНЫХ УВЕДОМЛЕНИЙ
// ========================================================
async function processTask(task, taskId) {
    if (!task.targetChatId || !task.text) {
        logWarn(`Задача ${taskId} некорректна, удаляем`);
        try {
            await deleteDoc(doc(db, "p2p_notifications_queue", taskId));
        } catch (e) {}
        return;
    }

    const chatIdStr = String(task.targetChatId);
    if (chatIdStr.startsWith('bot_') || chatIdStr.startsWith('system_')) {
        await deleteDoc(doc(db, "p2p_notifications_queue", taskId));
        return;
    }

    try {
        logInfo(`📨 Отправка → ChatID: ${task.targetChatId}`);
        const res = await sendTelegramPush(task.targetChatId, task.text);

        if (res.ok) {
            logInfo(`✓ Доставлено: ${task.targetChatId}`);
            await deleteDoc(doc(db, "p2p_notifications_queue", taskId));
        } else {
            logWarn(`Ошибка Telegram API: ${res.description} (code: ${res.error_code})`);
            if ([400, 403].includes(res.error_code)) {
                await deleteDoc(doc(db, "p2p_notifications_queue", taskId));
            }
        }
    } catch (err) {
        logError(`Сбой отправки ${taskId}:`, err.message);
    }
}

// ========================================================
// ГЛАВНЫЙ ЦИКЛ
// ========================================================
let _unsubscribe = null;
let _staleCheckerInterval = null;

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
                    logError(`Ошибка processTask(${taskId}):`, err);
                });
            }
        });
    }, (error) => {
        logError(`Ошибка снэпшота:`, error.message);
        setTimeout(() => {
            try { if (_unsubscribe) _unsubscribe(); } catch (e) {}
            startListener();
        }, 5000);
    });

    // Запуск таймера проверки 24-часовых зависших лотов
    _staleCheckerInterval = setInterval(checkStaleMarketLots, CHECK_STALE_INTERVAL_MS);
    checkStaleMarketLots(); // первый запуск при старте

    logInfo(`Слушатель очереди и сканер 24ч лотов активны.`);
}

// ========================================================
// GRACEFUL SHUTDOWN
// ========================================================
function gracefulShutdown(signal) {
    logInfo(`Получен ${signal}, завершаем работу...`);
    try {
        if (_unsubscribe) _unsubscribe();
        if (_staleCheckerInterval) clearInterval(_staleCheckerInterval);
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
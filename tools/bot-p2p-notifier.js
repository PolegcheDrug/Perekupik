/**
 * tools/bot-p2p-notifier.js
 * Воркер рассылки P2P push-уведомлений через Telegram Bot API.
 * Запуск: node tools/bot-p2p-notifier.js
 */

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

// Вставьте конфигурацию вашего бота и Firebase
const BOT_TOKEN = process.env.BOT_TOKEN || "8817926334:AAE7WBh3KSFjLtMc6BdklWnnWniPDBds2fg";
const GAME_URL = process.env.GAME_URL || "https://polegchedrug.github.io/Perekupik/";

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

console.log('[🤖 P2P Bot Notifier] Слушатель очереди P2P-уведомлений запущен...');

async function sendTelegramPush(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚗 Перейти к сделке в игре', url: GAME_URL }]
      ]
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return response.json();
}

// Слушаем задачи в реальном времени
const q = query(
  collection(db, "p2p_notifications_queue"),
  where("status", "==", "pending")
);

onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach(async (change) => {
    if (change.type === "added") {
      const task = change.doc.data();
      const taskId = change.doc.id;

      if (!task.targetChatId || !task.text) {
        await deleteDoc(doc(db, "p2p_notifications_queue", taskId));
        return;
      }

      try {
        console.log(`[📨] Отправка уведомления для ChatID: ${task.targetChatId} (${task.type})`);
        const res = await sendTelegramPush(task.targetChatId, task.text);

        if (res.ok) {
          console.log(`[✅] Доставлено игроку: ${task.targetChatId}`);
        } else {
          console.warn(`[⚠️] Ошибка Telegram API:`, res.description);
        }

        // Удаляем выполненную задачу из очереди
        await deleteDoc(doc(db, "p2p_notifications_queue", taskId));
      } catch (err) {
        console.error(`[❌] Сбой отправки задачи ${taskId}:`, err.message);
      }
    }
  });
});

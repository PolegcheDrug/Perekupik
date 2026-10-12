require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const admin = require('firebase-admin');

// Инициализация Firebase Admin SDK
// Файл serviceAccountKey.json скачивается в Firebase Console -> Project Settings -> Service accounts
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;

/**
 * Валидация подписи Telegram WebApp initData по алгоритму HMAC-SHA256
 */
function verifyTelegramInitData(initDataRaw) {
  if (!BOT_TOKEN || !initDataRaw) return null;

  try {
    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');

    // Сортировка параметров в алфавитном порядке
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckString = sortedKeys
      .map(key => `${key}=${params.get(key)}`)
      .join('\n');

    // Создание секретного ключа из токена бота
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();

    // Генерация хеша для проверки
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) return null;

    const userRaw = params.get('user');
    return userRaw ? JSON.parse(userRaw) : null;
  } catch (err) {
    console.error('[Auth] Ошибка парсинга initData:', err);
    return null;
  }
}

/**
 * Эндпоинт авторизации Telegram
 */
app.post('/api/auth/telegram', async (req, res) => {
  const { initData } = req.body;

  let tgUser = verifyTelegramInitData(initData);

  // Режим локальной разработки без запуска внутри Telegram
  if (!tgUser && process.env.NODE_ENV !== 'production' && req.body.devUserId) {
    tgUser = {
      id: req.body.devUserId,
      first_name: 'Dev Player',
      username: 'dev_player'
    };
  }

  if (!tgUser || !tgUser.id) {
    return res.status(403).json({ error: 'Неверная подпись Telegram данных' });
  }

  const userId = String(tgUser.id);

  try {
    // Генерация Custom Token для Firebase Auth
    const customToken = await admin.auth().createCustomToken(userId, {
      telegramUsername: tgUser.username || '',
      firstName: tgUser.first_name || ''
    });

    return res.json({
      success: true,
      customToken,
      userId,
      user: {
        id: userId,
        name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || `Перекуп #${userId}`,
        username: tgUser.username || '',
        photoUrl: tgUser.photo_url || ''
      }
    });
  } catch (error) {
    console.error('[Auth] Ошибка генерации custom token:', error);
    return res.status(500).json({ error: 'Ошибка генерации токена авторизации' });
  }
});

app.listen(PORT, () => {
  console.log(`[🚀 Auth Server] Сервис авторизации запущен на порту ${PORT}`);
});
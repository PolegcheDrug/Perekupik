// ========================================================
// server.js — NODE.JS БЭКЕНД СЕРВЕР (v0.4.5)
// Авторизация Telegram HMAC-SHA256, SQLite, WebSockets, P2P
// ========================================================

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const JWT_SECRET = process.env.JWT_SECRET || "perekup_super_secret_jwt_key_2026";

// Инициализация базы данных SQLite в режиме высокой производительности WAL
const db = new Database(path.join(__dirname, 'perekup.db'));
db.pragma('journal_mode = WAL');

// Инициализация схемы БД
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        tg_id TEXT PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        photo_url TEXT,
        cash INTEGER DEFAULT 150000,
        level INTEGER DEFAULT 1,
        karma INTEGER DEFAULT 50,
        connections INTEGER DEFAULT 1,
        safe_deposit INTEGER DEFAULT 0,
        garage_json TEXT DEFAULT '[]',
        plates_json TEXT DEFAULT '[]',
        updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS p2p_listings (
        id TEXT PRIMARY KEY,
        seller_tg_id TEXT,
        seller_name TEXT,
        type TEXT,
        title TEXT,
        price INTEGER,
        item_data_json TEXT,
        created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_tg_id TEXT,
        sender_name TEXT,
        text TEXT,
        timestamp INTEGER
    );

    CREATE TABLE IF NOT EXISTS direct_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dialog_id TEXT,
        sender_tg_id TEXT,
        sender_name TEXT,
        text TEXT,
        timestamp INTEGER
    );
`);

// ==========================================
// 1. БЕЗОПАСНАЯ АВТОРИЗАЦИЯ TELEGRAM (HMAC-SHA256)
// ==========================================
function verifyTelegramInitData(initDataRaw) {
    if (!BOT_TOKEN) return null;
    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckString = sortedKeys.map(k => `${k}=${params.get(k)}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) return null;

    try {
        const user = JSON.parse(params.get('user'));
        return user;
    } catch (e) {
        return null;
    }
}

// Middleware проверки JWT токена
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(' ')[1];
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        return res.status(401).json({ error: "Invalid token" });
    }
}

// ==========================================
// 2. HTTP РОУТЫ
// ==========================================

// Авторизация пользователя
app.post('/api/auth', (req, res) => {
    const { initData } = req.body;
    let tgUser = verifyTelegramInitData(initData);

    if (!tgUser && process.env.NODE_ENV !== 'production') {
        tgUser = { id: "dev_user_777", username: "dev_perekup", first_name: "Игрок (Dev)" };
    }

    if (!tgUser) {
        return res.status(403).json({ error: "Подпись Telegram недействительна!" });
    }

    const tgId = String(tgUser.id);
    const userRow = db.prepare('SELECT * FROM users WHERE tg_id = ?').get(tgId);

    if (!userRow) {
        db.prepare(`
            INSERT INTO users (tg_id, username, first_name, photo_url, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(tgId, tgUser.username || "", tgUser.first_name || "Перекуп", tgUser.photo_url || "", Date.now());
    } else {
        db.prepare('UPDATE users SET username = ?, first_name = ?, photo_url = ? WHERE tg_id = ?')
            .run(tgUser.username || userRow.username, tgUser.first_name || userRow.first_name, tgUser.photo_url || userRow.photo_url, tgId);
    }

    const token = jwt.sign({ tg_id: tgId, name: tgUser.first_name }, JWT_SECRET, { expiresIn: '30d' });
    const fullUser = db.prepare('SELECT * FROM users WHERE tg_id = ?').get(tgId);

    res.json({ token, profile: fullUser });
});

// Синхронизация прогресса
app.post('/api/sync', authMiddleware, (req, res) => {
    const { cash, level, karma, connections, safe_deposit, garage, plates } = req.body;
    db.prepare(`
        UPDATE users 
        SET cash = ?, level = ?, karma = ?, connections = ?, safe_deposit = ?, garage_json = ?, plates_json = ?, updated_at = ?
        WHERE tg_id = ?
    `).run(
        cash || 0, level || 1, karma !== undefined ? karma : 50, connections || 0, safe_deposit || 0,
        JSON.stringify(garage || []), JSON.stringify(plates || []),
        Date.now(), req.user.tg_id
    );
    res.json({ success: true });
});

// Получить активные лоты P2P биржи
app.get('/api/p2p/listings', (req, res) => {
    const listings = db.prepare('SELECT * FROM p2p_listings ORDER BY created_at DESC').all();
    const formatted = listings.map(l => ({
        id: l.id,
        seller: l.seller_name,
        seller_tg_id: l.seller_tg_id,
        type: l.type,
        name: l.title,
        price: l.price,
        itemData: JSON.parse(l.item_data_json || '{}'),
        createdAt: l.created_at
    }));
    res.json(formatted);
});

// Атомарная транзакция покупки лота
app.post('/api/p2p/buy', authMiddleware, (req, res) => {
    const buyerId = req.user.tg_id;
    const { listingId } = req.body;

    const buyTransaction = db.transaction(() => {
        const lot = db.prepare('SELECT * FROM p2p_listings WHERE id = ?').get(listingId);
        if (!lot) throw new Error("ЛОТ_УЖЕ_КУПЛЕН");

        if (lot.seller_tg_id === buyerId) throw new Error("НЕЛЬЗЯ_КУПИТЬ_СВОЙ_ЛОТ");

        const buyer = db.prepare('SELECT * FROM users WHERE tg_id = ?').get(buyerId);
        if (!buyer || buyer.cash < lot.price) throw new Error("НЕДОСТАТОЧНО_СРЕДСТВ");

        // 1. Списание у покупателя
        db.prepare('UPDATE users SET cash = cash - ? WHERE tg_id = ?').run(lot.price, buyerId);

        // 2. Начисление продавцу
        db.prepare('UPDATE users SET cash = cash + ? WHERE tg_id = ?').run(lot.price, lot.seller_tg_id);

        // 3. Выдача предмета в инвентарь покупателя
        const itemObj = JSON.parse(lot.item_data_json || '{}');
        if (lot.type === 'car') {
            const currentGarage = JSON.parse(buyer.garage_json || '[]');
            itemObj.purchaseCost = lot.price;
            currentGarage.push(itemObj);
            db.prepare('UPDATE users SET garage_json = ? WHERE tg_id = ?').run(JSON.stringify(currentGarage), buyerId);
        } else if (lot.type === 'plate') {
            const currentPlates = JSON.parse(buyer.plates_json || '[]');
            currentPlates.push(itemObj.plate || lot.title);
            db.prepare('UPDATE users SET plates_json = ? WHERE tg_id = ?').run(JSON.stringify(currentPlates), buyerId);
        }

        // 4. Удаление выкупленного лота
        db.prepare('DELETE FROM p2p_listings WHERE id = ?').run(listingId);

        return { itemObj, type: lot.type, price: lot.price };
    });

    try {
        const result = buyTransaction();
        io.emit('p2p:lot_sold', { listingId });
        res.json({ success: true, result });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==========================================
// 3. WEBSOCKETS (ЧАТЫ И P2P-БРОДКАСТЫ)
// ==========================================
const userLastMessageTime = new Map();

io.on('connection', (socket) => {
    let currentUserId = null;

    socket.on('auth:socket', (token) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            currentUserId = decoded.tg_id;
            socket.join(`user_${currentUserId}`);
        } catch (e) {}
    });

    // Создание лота на бирже
    socket.on('p2p:create_lot', (data) => {
        if (!currentUserId) return;
        const lotId = "lot_" + Date.now();
        db.prepare(`
            INSERT INTO p2p_listings (id, seller_tg_id, seller_name, type, title, price, item_data_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(lotId, currentUserId, data.sellerName, data.type, data.title, data.price, JSON.stringify(data.itemData || {}), Date.now());

        io.emit('p2p:new_lot', {
            id: lotId,
            seller: data.sellerName,
            seller_tg_id: currentUserId,
            type: data.type,
            name: data.title,
            price: data.price,
            itemData: data.itemData
        });
    });

    // Городской эфир
    socket.on('chat:broadcast', (msgData) => {
        if (!currentUserId) return;

        const lastTime = userLastMessageTime.get(currentUserId) || 0;
        if (Date.now() - lastTime < 2500) {
            socket.emit('chat:error', 'Слишком частые сообщения!');
            return;
        }
        userLastMessageTime.set(currentUserId, Date.now());

        const textClean = String(msgData.text || "").trim().slice(0, 120);
        if (!textClean) return;

        db.prepare(`
            INSERT INTO chat_messages (sender_tg_id, sender_name, text, timestamp)
            VALUES (?, ?, ?, ?)
        `).run(currentUserId, msgData.senderName, textClean, Date.now());

        io.emit('chat:new_broadcast', {
            sender: msgData.senderName,
            senderId: currentUserId,
            text: textClean,
            timestamp: Date.now()
        });
    });

    // Личные диалоги
    socket.on('dm:join_dialog', ({ targetUserId }) => {
        if (!currentUserId || !targetUserId) return;
        const dialogId = [currentUserId, targetUserId].sort().join('_');
        socket.join(`dialog_${dialogId}`);

        const history = db.prepare('SELECT * FROM direct_messages WHERE dialog_id = ? ORDER BY timestamp ASC LIMIT 30').all(dialogId);
        socket.emit('dm:history', history);
    });

    socket.on('dm:send_message', ({ targetUserId, text, senderName }) => {
        if (!currentUserId || !targetUserId) return;
        const textClean = String(text || "").trim().slice(0, 150);
        if (!textClean) return;

        const dialogId = [currentUserId, targetUserId].sort().join('_');
        db.prepare(`
            INSERT INTO direct_messages (dialog_id, sender_tg_id, sender_name, text, timestamp)
            VALUES (?, ?, ?, ?, ?)
        `).run(dialogId, currentUserId, senderName, textClean, Date.now());

        io.to(`dialog_${dialogId}`).emit('dm:new_message', {
            sender_tg_id: currentUserId,
            sender_name: senderName,
            text: textClean,
            timestamp: Date.now()
        });

        io.to(`user_${targetUserId}`).emit('dm:notification', {
            fromName: senderName,
            text: textClean
        });
    });
});

server.listen(PORT, () => {
    console.log(`[🚀 PEREKUP SERVER v0.4.5] Сервер успешно запущен на порту ${PORT}`);
});
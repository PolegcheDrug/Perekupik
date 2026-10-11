// ========================================================
// server.js — NODE.JS БЭКЕНД СЕРВЕР (v0.4.5)
// Разработчики: Илья Чепиль (DXF) & Perekup Dev Team
// Авторизация Telegram HMAC-SHA256, SQLite WAL, WebSockets,
// Атомарные P2P сделки (Авто, Номера, Бизнес, Жильё)
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

// Инициализация базы данных SQLite в режиме высокой производительности WAL[span_0](start_span)[span_0](end_span)
const db = new Database(path.join(__dirname, 'perekup.db'));
db.pragma('journal_mode = WAL');

// Инициализация схемы БД с поддержкой инвентаря бизнеса и недвижимости[span_1](start_span)[span_1](end_span)
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
        businesses_json TEXT DEFAULT '[]',
        houses_json TEXT DEFAULT '[]',
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
// 1. БЕЗОПАСНАЯ АВТОРИЗАЦИЯ TELEGRAM (HMAC-SHA256)[span_2](start_span)[span_2](end_span)
// ==========================================
function verifyTelegramInitData(initDataRaw) {
    if (!BOT_TOKEN) return null;[span_3](start_span)[span_3](end_span)
    const params = new URLSearchParams(initDataRaw);[span_4](start_span)[span_4](end_span)
    const hash = params.get('hash');[span_5](start_span)[span_5](end_span)
    if (!hash) return null;[span_6](start_span)[span_6](end_span)

    params.delete('hash');[span_7](start_span)[span_7](end_span)
    const sortedKeys = Array.from(params.keys()).sort();[span_8](start_span)[span_8](end_span)
    const dataCheckString = sortedKeys.map(k => `${k}=${params.get(k)}`).join('\n');[span_9](start_span)[span_9](end_span)

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();[span_10](start_span)[span_10](end_span)
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');[span_11](start_span)[span_11](end_span)

    if (calculatedHash !== hash) return null;[span_12](start_span)[span_12](end_span)

    try {
        const user = JSON.parse(params.get('user'));[span_13](start_span)[span_13](end_span)
        return user;[span_14](start_span)[span_14](end_span)
    } catch (e) {
        return null;[span_15](start_span)[span_15](end_span)
    }
}

// Middleware проверки JWT токена[span_16](start_span)[span_16](end_span)
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;[span_17](start_span)[span_17](end_span)
    if (!authHeader) return res.status(401).json({ error: "No token provided" });[span_18](start_span)[span_18](end_span)
    const token = authHeader.split(' ')[1];[span_19](start_span)[span_19](end_span)
    try {
        req.user = jwt.verify(token, JWT_SECRET);[span_20](start_span)[span_20](end_span)
        next();[span_21](start_span)[span_21](end_span)
    } catch (e) {
        return res.status(401).json({ error: "Invalid token" });[span_22](start_span)[span_22](end_span)
    }
}

// ==========================================
// 2. HTTP РОУТЫ[span_23](start_span)[span_23](end_span)
// ==========================================

// Авторизация пользователя[span_24](start_span)[span_24](end_span)
app.post('/api/auth', (req, res) => {
    const { initData } = req.body;[span_25](start_span)[span_25](end_span)
    let tgUser = verifyTelegramInitData(initData);[span_26](start_span)[span_26](end_span)

    if (!tgUser && process.env.NODE_ENV !== 'production') {
        tgUser = { id: "dev_user_777", username: "dev_perekup", first_name: "Игрок (Dev)" };[span_27](start_span)[span_27](end_span)
    }

    if (!tgUser) {
        return res.status(403).json({ error: "Подпись Telegram недействительна!" });[span_28](start_span)[span_28](end_span)
    }

    const tgId = String(tgUser.id);[span_29](start_span)[span_29](end_span)
    const userRow = db.prepare('SELECT * FROM users WHERE tg_id = ?').get(tgId);[span_30](start_span)[span_30](end_span)

    if (!userRow) {
        db.prepare(`
            INSERT INTO users (tg_id, username, first_name, photo_url, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(tgId, tgUser.username || "", tgUser.first_name || "Перекуп", tgUser.photo_url || "", Date.now());[span_31](start_span)[span_31](end_span)
    } else {
        db.prepare('UPDATE users SET username = ?, first_name = ?, photo_url = ? WHERE tg_id = ?')
            .run(tgUser.username || userRow.username, tgUser.first_name || userRow.first_name, tgUser.photo_url || userRow.photo_url, tgId);[span_32](start_span)[span_32](end_span)
    }

    const token = jwt.sign({ tg_id: tgId, name: tgUser.first_name }, JWT_SECRET, { expiresIn: '30d' });[span_33](start_span)[span_33](end_span)
    const fullUser = db.prepare('SELECT * FROM users WHERE tg_id = ?').get(tgId);[span_34](start_span)[span_34](end_span)

    res.json({ token, profile: fullUser });[span_35](start_span)[span_35](end_span)
});

// Синхронизация прогресса игрока[span_36](start_span)[span_36](end_span)
app.post('/api/sync', authMiddleware, (req, res) => {
    const { cash, level, karma, connections, safe_deposit, garage, plates, businesses, houses } = req.body;
    db.prepare(`
        UPDATE users 
        SET cash = ?, level = ?, karma = ?, connections = ?, safe_deposit = ?, 
            garage_json = ?, plates_json = ?, businesses_json = ?, houses_json = ?, updated_at = ?
        WHERE tg_id = ?
    `).run(
        cash || 0, level || 1, karma !== undefined ? karma : 50, connections || 0, safe_deposit || 0,
        JSON.stringify(garage || []), JSON.stringify(plates || []),
        JSON.stringify(businesses || []), JSON.stringify(houses || []),
        Date.now(), req.user.tg_id
    );
    res.json({ success: true });[span_37](start_span)[span_37](end_span)
});

// Получить активные лоты P2P биржи[span_38](start_span)[span_38](end_span)
app.get('/api/p2p/listings', (req, res) => {
    const listings = db.prepare('SELECT * FROM p2p_listings ORDER BY created_at DESC').all();[span_39](start_span)[span_39](end_span)
    const formatted = listings.map(l => ({
        id: l.id,
        seller: l.seller_name,
        seller_tg_id: l.seller_tg_id,
        type: l.type,
        name: l.title,
        price: l.price,
        itemData: JSON.parse(l.item_data_json || '{}'),
        createdAt: l.created_at
    }));[span_40](start_span)[span_40](end_span)
    res.json(formatted);[span_41](start_span)[span_41](end_span)
});

// Атомарная транзакция покупки лота (Авто, Номера, Бизнес, Жильё)[span_42](start_span)[span_42](end_span)
app.post('/api/p2p/buy', authMiddleware, (req, res) => {
    const buyerId = req.user.tg_id;[span_43](start_span)[span_43](end_span)
    const { listingId } = req.body;[span_44](start_span)[span_44](end_span)

    const buyTransaction = db.transaction(() => {
        const lot = db.prepare('SELECT * FROM p2p_listings WHERE id = ?').get(listingId);[span_45](start_span)[span_45](end_span)
        if (!lot) throw new Error("ЛОТ_УЖЕ_КУПЛЕН");[span_46](start_span)[span_46](end_span)

        if (lot.seller_tg_id === buyerId) throw new Error("НЕЛЬЗЯ_КУПИТЬ_СВОЙ_ЛОТ");[span_47](start_span)[span_47](end_span)

        const buyer = db.prepare('SELECT * FROM users WHERE tg_id = ?').get(buyerId);[span_48](start_span)[span_48](end_span)
        if (!buyer || buyer.cash < lot.price) throw new Error("НЕДОСТАТОЧНО_СРЕДСТВ");[span_49](start_span)[span_49](end_span)

        // 1. Списание баланса у покупателя[span_50](start_span)[span_50](end_span)
        db.prepare('UPDATE users SET cash = cash - ? WHERE tg_id = ?').run(lot.price, buyerId);[span_51](start_span)[span_51](end_span)

        // 2. Начисление баланса продавцу[span_52](start_span)[span_52](end_span)
        db.prepare('UPDATE users SET cash = cash + ? WHERE tg_id = ?').run(lot.price, lot.seller_tg_id);[span_53](start_span)[span_53](end_span)

        // 3. Выдача купленного предмета в БД покупателя в зависимости от категории[span_54](start_span)[span_54](end_span)
        const itemObj = JSON.parse(lot.item_data_json || '{}');[span_55](start_span)[span_55](end_span)

        if (lot.type === 'car' || lot.type === 'cars') {
            const currentGarage = JSON.parse(buyer.garage_json || '[]');[span_56](start_span)[span_56](end_span)
            itemObj.purchaseCost = lot.price;[span_57](start_span)[span_57](end_span)
            itemObj.isRegisteredOnPlayer = false; // Покупка с P2P биржи идёт по ДКП
            currentGarage.push(itemObj);[span_58](start_span)[span_58](end_span)
            db.prepare('UPDATE users SET garage_json = ? WHERE tg_id = ?').run(JSON.stringify(currentGarage), buyerId);[span_59](start_span)[span_59](end_span)
        } else if (lot.type === 'plate' || lot.type === 'plates') {
            const currentPlates = JSON.parse(buyer.plates_json || '[]');[span_60](start_span)[span_60](end_span)
            currentPlates.push(itemObj.plate || lot.title);[span_61](start_span)[span_61](end_span)
            db.prepare('UPDATE users SET plates_json = ? WHERE tg_id = ?').run(JSON.stringify(currentPlates), buyerId);[span_62](start_span)[span_62](end_span)
        } else if (lot.type === 'business') {
            const currentBiz = JSON.parse(buyer.businesses_json || '[]');
            const existingIdx = currentBiz.findIndex(b => b.id === (itemObj.bizId || lot.title));
            if (existingIdx !== -1) {
                currentBiz[existingIdx].level = Math.max(currentBiz[existingIdx].level || 1, itemObj.bizLevel || 1);
                currentBiz[existingIdx].stock = 100;
            } else {
                currentBiz.push({
                    id: itemObj.bizId || lot.title,
                    level: itemObj.bizLevel || 1,
                    stock: 100,
                    stored: 0
                });
            }
            db.prepare('UPDATE users SET businesses_json = ? WHERE tg_id = ?').run(JSON.stringify(currentBiz), buyerId);
        } else if (lot.type === 'housing') {
            const currentHouses = JSON.parse(buyer.houses_json || '[]');
            const hId = itemObj.houseId || lot.title;
            if (!currentHouses.includes(hId)) {
                currentHouses.push(hId);
            }
            db.prepare('UPDATE users SET houses_json = ? WHERE tg_id = ?').run(JSON.stringify(currentHouses), buyerId);
        }

        // 4. Удаление выкупленного лота из реестра биржи[span_63](start_span)[span_63](end_span)
        db.prepare('DELETE FROM p2p_listings WHERE id = ?').run(listingId);[span_64](start_span)[span_64](end_span)

        return { itemObj, type: lot.type, price: lot.price };[span_65](start_span)[span_65](end_span)
    });

    try {
        const result = buyTransaction();[span_66](start_span)[span_66](end_span)
        io.emit('p2p:lot_sold', { listingId });[span_67](start_span)[span_67](end_span)
        res.json({ success: true, result });[span_68](start_span)[span_68](end_span)
    } catch (err) {
        res.status(400).json({ error: err.message });[span_69](start_span)[span_69](end_span)
    }
});

// ==========================================
// 3. WEBSOCKETS (ЧАТЫ И P2P-БРОДКАСТЫ)[span_70](start_span)[span_70](end_span)
// ==========================================
const userLastMessageTime = new Map();[span_71](start_span)[span_71](end_span)

io.on('connection', (socket) => {[span_72](start_span)[span_72](end_span)
    let currentUserId = null;[span_73](start_span)[span_73](end_span)

    socket.on('auth:socket', (token) => {[span_74](start_span)[span_74](end_span)
        try {
            const decoded = jwt.verify(token, JWT_SECRET);[span_75](start_span)[span_75](end_span)
            currentUserId = decoded.tg_id;[span_76](start_span)[span_76](end_span)
            socket.join(`user_${currentUserId}`);[span_77](start_span)[span_77](end_span)
        } catch (e) {}
    });

    // Создание лота на бирже[span_78](start_span)[span_78](end_span)
    socket.on('p2p:create_lot', (data) => {[span_79](start_span)[span_79](end_span)
        if (!currentUserId) return;[span_80](start_span)[span_80](end_span)
        const lotId = "lot_" + Date.now();[span_81](start_span)[span_81](end_span)
        db.prepare(`
            INSERT INTO p2p_listings (id, seller_tg_id, seller_name, type, title, price, item_data_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(lotId, currentUserId, data.sellerName, data.type, data.title, data.price, JSON.stringify(data.itemData || {}), Date.now());[span_82](start_span)[span_82](end_span)

        io.emit('p2p:new_lot', {
            id: lotId,
            seller: data.sellerName,
            seller_tg_id: currentUserId,
            type: data.type,
            name: data.title,
            price: data.price,
            itemData: data.itemData
        });[span_83](start_span)[span_83](end_span)
    });

    // Городской эфир[span_84](start_span)[span_84](end_span)
    socket.on('chat:broadcast', (msgData) => {[span_85](start_span)[span_85](end_span)
        if (!currentUserId) return;[span_86](start_span)[span_86](end_span)

        const lastTime = userLastMessageTime.get(currentUserId) || 0;[span_87](start_span)[span_87](end_span)
        if (Date.now() - lastTime < 2500) {[span_88](start_span)[span_88](end_span)
            socket.emit('chat:error', 'Слишком частые сообщения!');[span_89](start_span)[span_89](end_span)
            return;[span_90](start_span)[span_90](end_span)
        }
        userLastMessageTime.set(currentUserId, Date.now());[span_91](start_span)[span_91](end_span)

        const textClean = String(msgData.text || "").trim().slice(0, 120);[span_92](start_span)[span_92](end_span)
        if (!textClean) return;[span_93](start_span)[span_93](end_span)

        db.prepare(`
            INSERT INTO chat_messages (sender_tg_id, sender_name, text, timestamp)
            VALUES (?, ?, ?, ?)
        `).run(currentUserId, msgData.senderName, textClean, Date.now());[span_94](start_span)[span_94](end_span)

        io.emit('chat:new_broadcast', {
            sender: msgData.senderName,
            senderId: currentUserId,
            text: textClean,
            timestamp: Date.now()
        });[span_95](start_span)[span_95](end_span)
    });

    // Личные диалоги[span_96](start_span)[span_96](end_span)
    socket.on('dm:join_dialog', ({ targetUserId }) => {[span_97](start_span)[span_97](end_span)
        if (!currentUserId || !targetUserId) return;[span_98](start_span)[span_98](end_span)
        const dialogId = [currentUserId, targetUserId].sort().join('_');[span_99](start_span)[span_99](end_span)
        socket.join(`dialog_${dialogId}`);[span_100](start_span)[span_100](end_span)

        const history = db.prepare('SELECT * FROM direct_messages WHERE dialog_id = ? ORDER BY timestamp ASC LIMIT 30').all(dialogId);[span_101](start_span)[span_101](end_span)
        socket.emit('dm:history', history);[span_102](start_span)[span_102](end_span)
    });

    socket.on('dm:send_message', ({ targetUserId, text, senderName }) => {[span_103](start_span)[span_103](end_span)
        if (!currentUserId || !targetUserId) return;[span_104](start_span)[span_104](end_span)
        const textClean = String(text || "").trim().slice(0, 150);[span_105](start_span)[span_105](end_span)
        if (!textClean) return;[span_106](start_span)[span_106](end_span)

        const dialogId = [currentUserId, targetUserId].sort().join('_');[span_107](start_span)[span_107](end_span)
        db.prepare(`
            INSERT INTO direct_messages (dialog_id, sender_tg_id, sender_name, text, timestamp)
            VALUES (?, ?, ?, ?, ?)
        `).run(dialogId, currentUserId, senderName, textClean, Date.now());[span_108](start_span)[span_108](end_span)

        io.to(`dialog_${dialogId}`).emit('dm:new_message', {
            sender_tg_id: currentUserId,
            sender_name: senderName,
            text: textClean,
            timestamp: Date.now()
        });[span_109](start_span)[span_109](end_span)

        io.to(`user_${targetUserId}`).emit('dm:notification', {
            fromName: senderName,
            text: textClean
        });[span_110](start_span)[span_110](end_span)
    });
});

server.listen(PORT, () => {[span_111](start_span)[span_111](end_span)
    console.log(`[🚀 PEREKUP SERVER v0.4.5] Сервер успешно запущен на порту ${PORT}`);[span_112](start_span)[span_112](end_span)
});

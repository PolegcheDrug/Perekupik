// ========================================================
// js/network.js — СЕТЕВОЙ КЛИЕНТ И WEBSOCKETS (v0.4.5)
// Полная связка с P2P биржей, чатами и синхронизацией профиля
// ========================================================

const SERVER_URL = "http://localhost:3000"; // URL вашего VPS/домена после деплоя
let socket = null;
let authToken = null;
let currentChatPartnerId = null;

const NetworkManager = {
    async init() {
        let initData = "";
        try {
            if (window.Telegram?.WebApp?.initData) {
                initData = window.Telegram.WebApp.initData;
            }
        } catch (e) {}

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const res = await fetch(`${SERVER_URL}/api/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error("Auth failed");
            const data = await res.json();
            authToken = data.token;

            // Если в БД уже есть профиль — подтягиваем реальный баланс и гараж
            if (data.profile) {
                if (data.profile.cash !== undefined) state.player.cash = data.profile.cash;
                if (data.profile.safe_deposit !== undefined) state.player.safeDeposit = data.profile.safe_deposit;
                if (data.profile.garage_json) {
                    try {
                        const parsedG = JSON.parse(data.profile.garage_json);
                        if (Array.isArray(parsedG) && parsedG.length > 0) {
                            state.garage = parsedG;
                            // Актуализация цен автомобилей с учётом установленных номеров
                            state.garage.forEach(c => {
                                if (typeof recalculateCarMarketValue === 'function') {
                                    recalculateCarMarketValue(c);
                                }
                            });
                        }
                    } catch (e) {}
                }
                updateHeaderUI();
                if (typeof renderGarage === 'function') renderGarage();
            }

            this.connectSocket();
            this.fetchP2PListings();
            console.log("[🌐 Network v0.4.5] Успешная авторизация!");
        } catch (e) {
            console.warn("[🌐 Network v0.4.5] Сервер оффлайн, работаем в автономном локальном режиме.");
        }
    },

    connectSocket() {
        if (typeof io === 'undefined') return;
        socket = io(SERVER_URL, { reconnectionAttempts: 5, timeout: 5000 });

        socket.on('connect', () => {
            if (authToken) {
                socket.emit('auth:socket', authToken);
            }
        });

        // Слушатели Городского Эфира
        socket.on('chat:new_broadcast', (msg) => {
            if (!state.lifeChatMessages) state.lifeChatMessages = [];
            state.lifeChatMessages.push({
                sender: msg.sender,
                text: msg.text,
                isMine: msg.senderId === String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "dev_user_777")
            });
            if (typeof renderLifeChat === 'function') renderLifeChat();
        });

        // Слушатели P2P биржи
        socket.on('p2p:new_lot', (lot) => {
            if (!state.p2pMarketListings) state.p2pMarketListings = [];
            state.p2pMarketListings.unshift(lot);
            if (typeof renderP2PListings === 'function') renderP2PListings();
        });

        socket.on('p2p:lot_sold', ({ listingId }) => {
            if (!state.p2pMarketListings) return;
            state.p2pMarketListings = state.p2pMarketListings.filter(l => l.id !== listingId);
            if (typeof renderP2PListings === 'function') renderP2PListings();
        });

        // Личные сообщения перекупов
        socket.on('dm:new_message', (msg) => {
            this.appendDMMessage(msg);
        });

        socket.on('dm:notification', (notif) => {
            showToast(`✉️ Сообщение от ${notif.fromName}: ${notif.text.slice(0, 25)}...`);
            playSound('tick');
        });
    },

    async fetchP2PListings() {
        try {
            const res = await fetch(`${SERVER_URL}/api/p2p/listings`);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                state.p2pMarketListings = data;
                if (typeof renderP2PListings === 'function') renderP2PListings();
            }
        } catch (e) {}
    },

    sendBroadcastChat(text) {
        if (!socket || !socket.connected) {
            sendChatMessageFromInput();
            return;
        }
        socket.emit('chat:broadcast', {
            senderName: state.player?.name || "Перекуп",
            text: text
        });
    },

    openDirectChat(targetUserId, targetName) {
        currentChatPartnerId = targetUserId;
        setTxt('dmModalTitle', `Чат с ${targetName}`);
        const box = document.getElementById('dmMessagesBox');
        if (box) box.innerHTML = "<div class='sub-label text-center py-2'>Загрузка истории...</div>";

        if (socket && socket.connected) {
            socket.emit('dm:join_dialog', { targetUserId });
            socket.once('dm:history', (history) => {
                if (box) {
                    box.innerHTML = history.map(m => `
                        <div class="chat-bubble ${m.sender_tg_id === targetUserId ? '' : 'mine'}">
                            <b>${m.sender_name}:</b> ${m.text}
                        </div>
                    `).join('');
                    box.scrollTop = box.scrollHeight;
                }
            });
        }

        const modal = document.getElementById('modalDirectChat');
        if (modal) modal.classList.add('active');
    },

    sendDirectMessage() {
        const input = document.getElementById('dmInputText');
        if (!input || !input.value.trim() || !currentChatPartnerId) return;

        if (socket && socket.connected) {
            socket.emit('dm:send_message', {
                targetUserId: currentChatPartnerId,
                senderName: state.player?.name || "Перекуп",
                text: input.value.trim()
            });
        }
        input.value = "";
    },

    appendDMMessage(msg) {
        const box = document.getElementById('dmMessagesBox');
        if (!box) return;
        const isMine = msg.sender_tg_id !== currentChatPartnerId;
        box.innerHTML += `
            <div class="chat-bubble ${isMine ? 'mine' : ''}">
                <b>${msg.sender_name}:</b> ${msg.text}
            </div>
        `;
        box.scrollTop = box.scrollHeight;
    }
};

// Запуск инициализации сети
window.addEventListener('DOMContentLoaded', () => {
    NetworkManager.init();
});
// ========================================================
// js/network.js — СЕТЕВОЙ КЛИЕНТ И WEBSOCKETS (v0.4.6)
// Разработчики: Илья Чепиль (DXF) & Perekup Dev Team
// Безопасная инициализация после готовности ядра state,
// связка с P2P биржей, чатами и синхронизацией профиля
// ========================================================

const DEFAULT_BACKEND_URL = (typeof window !== 'undefined' && window.SERVER_URL)
    ? window.SERVER_URL
    : (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        ? "http://localhost:3000"
        : `${location.protocol}//${location.host}`);

let socket = null;
let authToken = null;
let currentChatPartnerId = null;
let networkInitAttempts = 0;

const NetworkManager = {
    async init() {
        // Гарантируем безопасное ожидание ядра игры (до 25 попыток по 200 мс)
        if (typeof state === 'undefined') {
            networkInitAttempts++;
            if (networkInitAttempts < 25) {
                setTimeout(() => this.init(), 200);
            } else {
                console.warn("[🌐 Network] Превышено время ожидания state, работаем в автономном режиме.");
            }
            return;
        }

        let initData = "";
        try {
            if (window.Telegram?.WebApp?.initData) {
                initData = window.Telegram.WebApp.initData;
            }
        } catch (e) {}

        const serverUrl = window.SERVER_URL || DEFAULT_BACKEND_URL;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const res = await fetch(`${serverUrl}/api/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error("Auth failed");
            const data = await res.json();
            authToken = data.token;

            // Если в БД сервера есть сохранённый профиль — аккуратно подтягиваем данные
            if (data.profile) {
                if (data.profile.cash !== undefined && state.player) state.player.cash = data.profile.cash;
                if (data.profile.safe_deposit !== undefined && state.player) state.player.safeDeposit = data.profile.safe_deposit;
                
                if (data.profile.garage_json) {
                    try {
                        const parsedG = JSON.parse(data.profile.garage_json);
                        if (Array.isArray(parsedG) && parsedG.length > 0) {
                            state.garage = parsedG;
                            state.garage.forEach(c => {
                                if (typeof recalculateCarMarketValue === 'function') {
                                    recalculateCarMarketValue(c);
                                }
                            });
                        }
                    } catch (e) {}
                }

                if (data.profile.businesses_json) {
                    try {
                        const parsedBiz = JSON.parse(data.profile.businesses_json);
                        if (Array.isArray(parsedBiz) && parsedBiz.length > 0) {
                            parsedBiz.forEach(savedB => {
                                let localB = (state.businesses || []).find(b => b.id === savedB.id);
                                if (localB) {
                                    localB.level = savedB.level;
                                    localB.stock = savedB.stock;
                                    localB.stored = savedB.stored || 0;
                                }
                            });
                        }
                    } catch (e) {}
                }

                if (data.profile.houses_json) {
                    try {
                        const parsedHouses = JSON.parse(data.profile.houses_json);
                        if (Array.isArray(parsedHouses) && parsedHouses.length > 0 && state.player) {
                            state.player.ownedHouses = parsedHouses;
                        }
                    } catch (e) {}
                }

                if (typeof updateHeaderUI === 'function') updateHeaderUI();
                if (typeof renderGarage === 'function') renderGarage();
            }

            this.connectSocket(serverUrl);
            this.fetchP2PListings(serverUrl);
            console.log("[🌐 Network v0.4.6] Успешная авторизация на бэкенде!");
        } catch (e) {
            console.warn("[🌐 Network v0.4.6] Сервер оффлайн, игра запущена в локальном автономном режиме.");
        }
    },

    connectSocket(serverUrl) {
        if (typeof io === 'undefined') return;
        const targetUrl = serverUrl || window.SERVER_URL || DEFAULT_BACKEND_URL;
        
        try {
            socket = io(targetUrl, { reconnectionAttempts: 3, timeout: 4000 });

            socket.on('connect', () => {
                if (authToken) {
                    socket.emit('auth:socket', authToken);
                }
            });

            // Слушатели Городского Эфира
            socket.on('chat:new_broadcast', (msg) => {
                if (!state.lifeChatMessages) state.lifeChatMessages = [];
                state.lifeChatMessages.push({
                    author: msg.sender,
                    text: msg.text,
                    warning: false
                });
                if (typeof renderLifeChat === 'function') renderLifeChat();
            });

            // Слушатели P2P биржи
            socket.on('p2p:new_lot', (lot) => {
                if (!state.p2pMarketListings) state.p2pMarketListings = [];
                state.p2pMarketListings.unshift(lot);
                if (typeof renderP2PListings === 'function') renderP2PListings();
                if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.renderP2PListingsFiltered === 'function') {
                    PhoneManager.renderP2PListingsFiltered();
                }
            });

            socket.on('p2p:lot_sold', ({ listingId }) => {
                if (!state.p2pMarketListings) return;
                state.p2pMarketListings = state.p2pMarketListings.filter(l => l.id !== listingId);
                if (typeof renderP2PListings === 'function') renderP2PListings();
                if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.renderP2PListingsFiltered === 'function') {
                    PhoneManager.renderP2PListingsFiltered();
                }
            });

            // Личные сообщения
            socket.on('dm:new_message', (msg) => {
                this.appendDMMessage(msg);
            });

            socket.on('dm:notification', (notif) => {
                if (typeof showToast === 'function') {
                    showToast(`✉️ Сообщение от ${notif.fromName}: ${String(notif.text).slice(0, 25)}...`);
                }
                if (typeof playSound === 'function') playSound('tick');
            });
        } catch (err) {
            console.warn("[🌐 Network] Сбой инициализации WebSocket:", err);
        }
    },

    async fetchP2PListings(serverUrl) {
        const targetUrl = serverUrl || window.SERVER_URL || DEFAULT_BACKEND_URL;
        try {
            const res = await fetch(`${targetUrl}/api/p2p/listings`);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                state.p2pMarketListings = data;
                if (typeof renderP2PListings === 'function') renderP2PListings();
                if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.renderP2PListingsFiltered === 'function') {
                    PhoneManager.renderP2PListingsFiltered();
                }
            }
        } catch (e) {}
    },

    sendBroadcastChat(text) {
        if (!socket || !socket.connected) {
            if (typeof sendChatMessageFromInput === 'function') {
                sendChatMessageFromInput();
            }
            return;
        }
        socket.emit('chat:broadcast', {
            senderName: state.player?.name || "Перекуп",
            text: text
        });
    },

    openDirectChat(targetUserId, targetName) {
        currentChatPartnerId = targetUserId;
        if (typeof setTxt === 'function') setTxt('dmModalTitle', `Чат с ${targetName}`);
        const box = document.getElementById('dmMessagesBox');
        if (box) box.innerHTML = "<div class='sub-label text-center py-2'>Загрузка истории...</div>";

        if (socket && socket.connected) {
            socket.emit('dm:join_dialog', { targetUserId });
            socket.once('dm:history', (history) => {
                if (box && Array.isArray(history)) {
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

window.NetworkManager = NetworkManager;
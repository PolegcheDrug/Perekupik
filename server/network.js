// ========================================================
// js/network.js — СЕТЕВОЙ КЛИЕНТ И WEBSOCKETS (v0.4.5)
// Разработчики: Илья Чепиль (DXF) & Perekup Dev Team
// Безопасная инициализация после готовности ядра state,
// связка с P2P биржей, чатами и синхронизацией профиля
// ========================================================

const SERVER_URL = "http://localhost:3000"; // URL вашего VPS/домена после деплоя[span_0](start_span)[span_0](end_span)
let socket = null;[span_1](start_span)[span_1](end_span)
let authToken = null;[span_2](start_span)[span_2](end_span)
let currentChatPartnerId = null;[span_3](start_span)[span_3](end_span)

const NetworkManager = {
    async init() {
        // Гарантируем, что ядро игры и глобальный state уже инициализированы
        if (typeof state === 'undefined') {
            console.warn("[🌐 Network v0.4.5] Ожидание инициализации app.js (state)...");
            setTimeout(() => this.init(), 200);
            return;
        }

        let initData = "";[span_4](start_span)[span_4](end_span)
        try {
            if (window.Telegram?.WebApp?.initData) {[span_5](start_span)[span_5](end_span)
                initData = window.Telegram.WebApp.initData;[span_6](start_span)[span_6](end_span)
            }
        } catch (e) {}

        try {
            const controller = new AbortController();[span_7](start_span)[span_7](end_span)
            const timeoutId = setTimeout(() => controller.abort(), 4000);[span_8](start_span)[span_8](end_span)

            const res = await fetch(`${SERVER_URL}/api/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData }),
                signal: controller.signal
            });[span_9](start_span)[span_9](end_span)
            clearTimeout(timeoutId);[span_10](start_span)[span_10](end_span)

            if (!res.ok) throw new Error("Auth failed");[span_11](start_span)[span_11](end_span)
            const data = await res.json();[span_12](start_span)[span_12](end_span)
            authToken = data.token;[span_13](start_span)[span_13](end_span)

            // Если в БД сервера есть сохранённый профиль — подтягиваем данные[span_14](start_span)[span_14](end_span)
            if (data.profile) {
                if (data.profile.cash !== undefined) state.player.cash = data.profile.cash;[span_15](start_span)[span_15](end_span)
                if (data.profile.safe_deposit !== undefined) state.player.safeDeposit = data.profile.safe_deposit;[span_16](start_span)[span_16](end_span)
                
                if (data.profile.garage_json) {
                    try {
                        const parsedG = JSON.parse(data.profile.garage_json);[span_17](start_span)[span_17](end_span)
                        if (Array.isArray(parsedG) && parsedG.length > 0) {[span_18](start_span)[span_18](end_span)
                            state.garage = parsedG;[span_19](start_span)[span_19](end_span)
                            // Актуализация стоимости автомобилей с учётом установленных номеров[span_20](start_span)[span_20](end_span)
                            state.garage.forEach(c => {
                                if (typeof recalculateCarMarketValue === 'function') {[span_21](start_span)[span_21](end_span)
                                    recalculateCarMarketValue(c);[span_22](start_span)[span_22](end_span)
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
                        if (Array.isArray(parsedHouses) && parsedHouses.length > 0) {
                            state.player.ownedHouses = parsedHouses;
                        }
                    } catch (e) {}
                }

                if (typeof updateHeaderUI === 'function') updateHeaderUI();[span_23](start_span)[span_23](end_span)
                if (typeof renderGarage === 'function') renderGarage();[span_24](start_span)[span_24](end_span)
            }

            this.connectSocket();[span_25](start_span)[span_25](end_span)
            this.fetchP2PListings();[span_26](start_span)[span_26](end_span)
            console.log("[🌐 Network v0.4.5] Успешная авторизация на бэкенде!");[span_27](start_span)[span_27](end_span)
        } catch (e) {
            console.warn("[🌐 Network v0.4.5] Сервер оффлайн, работаем в автономном локальном режиме.");[span_28](start_span)[span_28](end_span)
        }
    },

    connectSocket() {
        if (typeof io === 'undefined') return;[span_29](start_span)[span_29](end_span)
        socket = io(SERVER_URL, { reconnectionAttempts: 5, timeout: 5000 });[span_30](start_span)[span_30](end_span)

        socket.on('connect', () => {[span_31](start_span)[span_31](end_span)
            if (authToken) {[span_32](start_span)[span_32](end_span)
                socket.emit('auth:socket', authToken);[span_33](start_span)[span_33](end_span)
            }
        });

        // Слушатели Городского Эфира[span_34](start_span)[span_34](end_span)
        socket.on('chat:new_broadcast', (msg) => {[span_35](start_span)[span_35](end_span)
            if (!state.lifeChatMessages) state.lifeChatMessages = [];[span_36](start_span)[span_36](end_span)
            state.lifeChatMessages.push({
                sender: msg.sender,[span_37](start_span)[span_37](end_span)
                text: msg.text,[span_38](start_span)[span_38](end_span)
                isMine: msg.senderId === String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "dev_user_777")[span_39](start_span)[span_39](end_span)
            });
            if (typeof renderLifeChat === 'function') renderLifeChat();[span_40](start_span)[span_40](end_span)
        });

        // Слушатели P2P биржи[span_41](start_span)[span_41](end_span)
        socket.on('p2p:new_lot', (lot) => {[span_42](start_span)[span_42](end_span)
            if (!state.p2pMarketListings) state.p2pMarketListings = [];[span_43](start_span)[span_43](end_span)
            state.p2pMarketListings.unshift(lot);[span_44](start_span)[span_44](end_span)
            if (typeof renderP2PListings === 'function') renderP2PListings();[span_45](start_span)[span_45](end_span)
            if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.renderP2PListingsFiltered === 'function') {
                PhoneManager.renderP2PListingsFiltered();
            }
        });

        socket.on('p2p:lot_sold', ({ listingId }) => {[span_46](start_span)[span_46](end_span)
            if (!state.p2pMarketListings) return;[span_47](start_span)[span_47](end_span)
            state.p2pMarketListings = state.p2pMarketListings.filter(l => l.id !== listingId);[span_48](start_span)[span_48](end_span)
            if (typeof renderP2PListings === 'function') renderP2PListings();[span_49](start_span)[span_49](end_span)
            if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.renderP2PListingsFiltered === 'function') {
                PhoneManager.renderP2PListingsFiltered();
            }
        });

        // Личные сообщения перекупов[span_50](start_span)[span_50](end_span)
        socket.on('dm:new_message', (msg) => {[span_51](start_span)[span_51](end_span)
            this.appendDMMessage(msg);[span_52](start_span)[span_52](end_span)
        });

        socket.on('dm:notification', (notif) => {[span_53](start_span)[span_53](end_span)
            showToast(`✉️ Сообщение от ${notif.fromName}: ${notif.text.slice(0, 25)}...`);[span_54](start_span)[span_54](end_span)
            playSound('tick');[span_55](start_span)[span_55](end_span)
        });
    },

    async fetchP2PListings() {
        try {
            const res = await fetch(`${SERVER_URL}/api/p2p/listings`);[span_56](start_span)[span_56](end_span)
            const data = await res.json();[span_57](start_span)[span_57](end_span)
            if (Array.isArray(data) && data.length > 0) {[span_58](start_span)[span_58](end_span)
                state.p2pMarketListings = data;[span_59](start_span)[span_59](end_span)
                if (typeof renderP2PListings === 'function') renderP2PListings();[span_60](start_span)[span_60](end_span)
                if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.renderP2PListingsFiltered === 'function') {
                    PhoneManager.renderP2PListingsFiltered();
                }
            }
        } catch (e) {}
    },

    sendBroadcastChat(text) {
        if (!socket || !socket.connected) {[span_61](start_span)[span_61](end_span)
            sendChatMessageFromInput();[span_62](start_span)[span_62](end_span)
            return;[span_63](start_span)[span_63](end_span)
        }
        socket.emit('chat:broadcast', {[span_64](start_span)[span_64](end_span)
            senderName: state.player?.name || "Перекуп",[span_65](start_span)[span_65](end_span)
            text: text[span_66](start_span)[span_66](end_span)
        });
    },

    openDirectChat(targetUserId, targetName) {
        currentChatPartnerId = targetUserId;[span_67](start_span)[span_67](end_span)
        setTxt('dmModalTitle', `Чат с ${targetName}`);[span_68](start_span)[span_68](end_span)
        const box = document.getElementById('dmMessagesBox');[span_69](start_span)[span_69](end_span)
        if (box) box.innerHTML = "<div class='sub-label text-center py-2'>Загрузка истории...</div>";[span_70](start_span)[span_70](end_span)

        if (socket && socket.connected) {[span_71](start_span)[span_71](end_span)
            socket.emit('dm:join_dialog', { targetUserId });[span_72](start_span)[span_72](end_span)
            socket.once('dm:history', (history) => {[span_73](start_span)[span_73](end_span)
                if (box) {[span_74](start_span)[span_74](end_span)
                    box.innerHTML = history.map(m => `
                        <div class="chat-bubble ${m.sender_tg_id === targetUserId ? '' : 'mine'}">
                            <b>${m.sender_name}:</b> ${m.text}
                        </div>
                    `).join('');[span_75](start_span)[span_75](end_span)
                    box.scrollTop = box.scrollHeight;[span_76](start_span)[span_76](end_span)
                }
            });
        }

        const modal = document.getElementById('modalDirectChat');[span_77](start_span)[span_77](end_span)
        if (modal) modal.classList.add('active');[span_78](start_span)[span_78](end_span)
    },

    sendDirectMessage() {
        const input = document.getElementById('dmInputText');[span_79](start_span)[span_79](end_span)
        if (!input || !input.value.trim() || !currentChatPartnerId) return;[span_80](start_span)[span_80](end_span)

        if (socket && socket.connected) {[span_81](start_span)[span_81](end_span)
            socket.emit('dm:send_message', {[span_82](start_span)[span_82](end_span)
                targetUserId: currentChatPartnerId,[span_83](start_span)[span_83](end_span)
                senderName: state.player?.name || "Перекуп",[span_84](start_span)[span_84](end_span)
                text: input.value.trim()[span_85](start_span)[span_85](end_span)
            });
        }
        input.value = "";[span_86](start_span)[span_86](end_span)
    },

    appendDMMessage(msg) {
        const box = document.getElementById('dmMessagesBox');[span_87](start_span)[span_87](end_span)
        if (!box) return;[span_88](start_span)[span_88](end_span)
        const isMine = msg.sender_tg_id !== currentChatPartnerId;[span_89](start_span)[span_89](end_span)
        box.innerHTML += `
            <div class="chat-bubble ${isMine ? 'mine' : ''}">
                <b>${msg.sender_name}:</b> ${msg.text}
            </div>
        `;[span_90](start_span)[span_90](end_span)
        box.scrollTop = box.scrollHeight;[span_91](start_span)[span_91](end_span)
    }
};

// Запуск инициализации сети после полной загрузки документа и app.js[span_92](start_span)[span_92](end_span)
window.addEventListener('DOMContentLoaded', () => {[span_93](start_span)[span_93](end_span)
    setTimeout(() => {
        NetworkManager.init();[span_94](start_span)[span_94](end_span)
    }, 150);
});

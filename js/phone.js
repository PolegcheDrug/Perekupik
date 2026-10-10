// ========================================================
// js/phone.js — ИНТЕРАКТИВНЫЙ СМАРТФОН «PerekupOS» (v0.4.3)
// ========================================================

const PhoneManager = {
    currentApp: null, // null = домашний экран
    unreadCount: 0,
    activeChatId: null,

    defaultMessages: [
        {
            id: "sms_bank_welcome",
            sender: "💳 Во-Банк Онлайн",
            avatar: "🏦",
            preview: "Добро пожаловать в Во-Банк! Сейф активен (+3% в день).",
            time: "10:00",
            unread: true,
            chatHistory: [
                { from: "them", text: "Здравствуйте! Ваш сейф перекупа готов к приёму депозитов в приложении «Во-Банк». Каждый день вам начисляется +3% на остаток средств." },
                { from: "them", text: "Деньги в сейфе застрахованы от рэкета и уличных нападений на трассе." }
            ]
        },
        {
            id: "sms_reshala_intro",
            sender: "🕵️‍♂️ Артур Решала",
            avatar: "🕶️",
            preview: "Связи наготове. Будут проблемы со штрафстоянкой или 12.5.1 — открывай приложение.",
            time: "09:45",
            unread: true,
            chatHistory: [
                { from: "them", text: "Привет. Номер мой в приложении есть. Любые вопросы с аннулированием учёта, крышей ГИБДД и лицензиями РАФ решаю за связи." },
                { from: "them", text: "Если попадется угнанная тачка — сделаем чистый VIN, не переживай." }
            ]
        },
        {
            id: "sms_scam_1",
            sender: "⚠️ Служба Безопасности",
            avatar: "🤖",
            preview: "С вашей карты зафиксирована попытка перевода 150,000 ₽!",
            time: "08:15",
            unread: true,
            isScam: true,
            scamCost: 50000,
            chatHistory: [
                { from: "them", text: "ВНИМАНИЕ! Подозрительная операция. Чтобы отменить перевод 150,000 ₽ на неизвестный счет, переведите 50,000 ₽ на безопасный резервный счет прямо сейчас!" }
            ]
        }
    ],

    init() {
        if (!state.player.phoneMessages || state.player.phoneMessages.length === 0) {
            state.player.phoneMessages = JSON.parse(JSON.stringify(this.defaultMessages));
        }
        this.updateUnreadBadge();
        this.updatePhoneClock();
        setInterval(() => this.updatePhoneClock(), 1000);
    },

    updatePhoneClock() {
        const clockEl = document.getElementById('phoneStatusBarClock');
        if (!clockEl) return;
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        clockEl.innerText = `${hrs}:${mins}`;
    },

    updateUnreadBadge() {
        const messages = state.player?.phoneMessages || [];
        this.unreadCount = messages.filter(m => m.unread).length;

        const navBadge = document.getElementById('phoneNavBadge');
        if (navBadge) {
            if (this.unreadCount > 0) {
                navBadge.style.display = 'inline-flex';
                navBadge.innerText = this.unreadCount;
            } else {
                navBadge.style.display = 'none';
            }
        }

        const appSmsBadge = document.getElementById('phoneAppSmsBadge');
        if (appSmsBadge) {
            if (this.unreadCount > 0) {
                appSmsBadge.style.display = 'block';
                appSmsBadge.innerText = this.unreadCount;
            } else {
                appSmsBadge.style.display = 'none';
            }
        }
    },

    // Расчет сводки для бизнес-виджета
    getBusinessStats() {
        let totalIncomePerDay = 0;
        let totalStoredCash = 0;
        let activePoints = 0;
        let minStock = 100;

        if (state.businesses && Array.isArray(state.businesses)) {
            state.businesses.forEach(b => {
                if (b && b.level > 0) {
                    activePoints++;
                    totalStoredCash += (b.stored || 0);
                    if (b.stock > 0) {
                        totalIncomePerDay += ((b.income || 0) * b.level);
                    }
                    if (b.stock !== undefined && b.stock < minStock) {
                        minStock = b.stock;
                    }
                }
            });
        }
        if (activePoints === 0) minStock = 0;
        return { totalIncomePerDay, totalStoredCash, activePoints, minStock };
    },

    renderBusinessWidget() {
        const widgetContainer = document.getElementById('phoneBizWidgetContainer');
        if (!widgetContainer) return;

        const stats = this.getBusinessStats();
        let statusBadge = stats.activePoints === 0 
            ? "<span class='tag-badge bg-tag-amber'>Нет точек</span>" 
            : (stats.minStock <= 15 ? "<span class='tag-badge bg-tag-red'>Мало сырья!</span>" : "<span class='tag-badge bg-tag-green'>Работает</span>");

        widgetContainer.innerHTML = `
            <div class="phone-biz-widget">
                <div class="flex-between mb-1">
                    <div class="flex-gap" style="align-items:center;">
                        <div class="widget-icon-bubble"><i class="fa-solid fa-chart-pie color-green"></i></div>
                        <div>
                            <div class="widget-title">Сеть предприятий</div>
                            <div class="sub-label" style="font-size:9px;">Активно: <b>${stats.activePoints}</b> точек</div>
                        </div>
                    </div>
                    ${statusBadge}
                </div>
                
                <div class="widget-metrics-row mb-2">
                    <div>
                        <div class="sub-label" style="font-size:9px;">Накоплено в кассах:</div>
                        <div class="price-val text-xs color-green">${stats.totalStoredCash.toLocaleString()} ₽</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="sub-label" style="font-size:9px;">Прибыль сети:</div>
                        <b class="text-xs color-cyan">+${stats.totalIncomePerDay.toLocaleString()} ₽/д</b>
                    </div>
                </div>

                <div class="grid-2">
                    <button onclick="collectAllBusinessCash(); PhoneManager.renderBusinessWidget();" class="btn btn-green btn-sm" ${stats.totalStoredCash <= 0 ? 'disabled' : ''}>
                        Снять кассу
                    </button>
                    <button onclick="switchTab('tabBusiness')" class="btn btn-dark btn-sm">
                        Управление
                    </button>
                </div>
            </div>
        `;
    },

    renderPhoneScreen() {
        const homeScreen = document.getElementById('phoneHomeScreen');
        const appContainer = document.getElementById('phoneAppContainer');
        if (!homeScreen || !appContainer) return;

        this.updateUnreadBadge();
        this.updatePhoneClock();

        if (this.currentApp === null) {
            homeScreen.style.display = 'block';
            appContainer.style.display = 'none';
            appContainer.innerHTML = '';
            this.renderBusinessWidget();
        } else {
            homeScreen.style.display = 'none';
            appContainer.style.display = 'block';
            this.renderOpenApp();
        }
    },

    openApp(appName) {
        playSound('tick');
        tgHaptic('light');
        this.currentApp = appName;
        this.renderPhoneScreen();
    },

    goHome() {
        playSound('tick');
        tgHaptic('light');
        this.currentApp = null;
        this.activeChatId = null;
        this.renderPhoneScreen();
    },

    renderOpenApp() {
        const container = document.getElementById('phoneAppContainer');
        if (!container) return;

        if (this.currentApp === 'syndicate') {
            this.renderSyndicateApp(container);
        } else if (this.currentApp === 'messages') {
            if (this.activeChatId) {
                this.renderChatConversation(container, this.activeChatId);
            } else {
                this.renderMessagesList(container);
            }
        } else if (this.currentApp === 'bank') {
            this.renderBankApp(container);
        } else if (this.currentApp === 'reshala') {
            this.renderReshalaApp(container);
        } else if (this.currentApp === 'barn') {
            this.renderBarnApp(container);
        } else if (this.currentApp === 'containers') {
            this.renderContainersApp(container);
        } else if (this.currentApp === 'radar') {
            this.renderRadarApp(container);
        }
    },

    // ----------------------------------------------------
    // 1. СИНДИКАТ
    // ----------------------------------------------------
    renderSyndicateApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-globe color-purple"></i> Синдикат</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="grid-4 mb-2">
                    <button onclick="switchSyndicateTab('p2p')" id="synTabBtn-p2p" class="btn btn-dark btn-sm active">P2P</button>
                    <button onclick="switchSyndicateTab('blackmarket')" id="synTabBtn-blackmarket" class="btn btn-dark btn-sm">Тень</button>
                    <button onclick="switchSyndicateTab('clubs')" id="synTabBtn-clubs" class="btn btn-dark btn-sm">Клубы</button>
                    <button onclick="switchSyndicateTab('leaderboard')" id="synTabBtn-leaderboard" class="btn btn-dark btn-sm">Топ</button>
                </div>

                <div id="synScreen-p2p">
                    <div class="glass-card mb-2 p-2">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-green"><i class="fa-solid fa-handshake"></i> Онлайн P2P Биржа</b>
                            <button onclick="openCreateListingModal()" class="btn btn-green btn-auto btn-sm">+ Лот</button>
                        </div>
                        <div class="sub-label" style="font-size:10px;">Торговля техникой и номерами с игроками.</div>
                    </div>
                    <div class="grid-2 mb-2">
                        <button onclick="filterP2P('cars')" id="p2pFilter-cars" class="btn btn-cyan btn-sm">🚗 Авто</button>
                        <button onclick="filterP2P('plates')" id="p2pFilter-plates" class="btn btn-dark btn-sm">🏷 Госномера</button>
                    </div>
                    <div id="p2pItemsList"></div>
                </div>

                <div id="synScreen-blackmarket" style="display:none;">
                    <div class="glass-card mb-2 p-2">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-purple"><i class="fa-solid fa-mask"></i> Теневой рынок</b>
                            <span class="tag-badge bg-tag-purple">VIP</span>
                        </div>
                        <p class="sub-label mb-2" style="font-size:10px;">Редкие госномера с надбавкой до +50% к стоимости авто при перепродаже.</p>
                        <button onclick="refreshBlackMarketPlates()" class="btn btn-dark btn-sm w-full mb-2">Обновить список (25k ₽)</button>
                        <div id="blackMarketPlatesList"></div>
                    </div>
                </div>

                <div id="synScreen-clubs" style="display:none;">
                    <div class="glass-card mb-2 p-2">
                        <div class="flex-between mb-1">
                            <div>
                                <div class="sub-label" style="font-size:9px;">Ваш автоклуб:</div>
                                <b class="color-cyan text-xs" id="synMyClubName">Без автоклуба</b>
                            </div>
                            <button onclick="createClubPrompt()" class="btn btn-amber btn-auto btn-sm">+ Создать</button>
                        </div>
                    </div>
                    <div id="synClubsContainer"></div>
                </div>

                <div id="synScreen-leaderboard" style="display:none;">
                    <div class="glass-card mb-2 p-2 flex-between">
                        <b class="text-xs color-amber"><i class="fa-solid fa-trophy"></i> Топ Перекупов</b>
                        <span class="sub-label" style="font-size:10px;">Топ-50</span>
                    </div>
                    <div id="leaderboardListContainer"></div>
                </div>
            </div>
        `;
        if (typeof renderSyndicateHub === 'function') renderSyndicateHub();
    },

    // ----------------------------------------------------
    // 2. МЕССЕНДЖЕР И SMS
    // ----------------------------------------------------
    renderMessagesList(container) {
        const messages = state.player?.phoneMessages || [];
        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-comment-dots color-cyan"></i> Сообщения</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="phone-messages-list">
        `;

        if (messages.length === 0) {
            html += `<div class="sub-label text-center py-6">Нет входящих сообщений</div>`;
        } else {
            messages.forEach(msg => {
                let unreadClass = msg.unread ? 'unread-msg' : '';
                let unreadDot = msg.unread ? '<span class="phone-unread-dot"></span>' : '';
                html += `
                    <div class="phone-msg-item ${unreadClass}" onclick="PhoneManager.openChat('${msg.id}')">
                        <div class="phone-msg-avatar">${msg.avatar || '👤'}</div>
                        <div class="phone-msg-content">
                            <div class="flex-between">
                                <b class="text-xs">${msg.sender}</b>
                                <span class="sub-label" style="font-size:9px;">${msg.time || 'Сейчас'}</span>
                            </div>
                            <div class="phone-msg-preview">${msg.preview}</div>
                        </div>
                        ${unreadDot}
                    </div>
                `;
            });
        }

        html += `</div></div>`;
        container.innerHTML = html;
    },

    openChat(msgId) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (msg) {
            msg.unread = false;
            this.updateUnreadBadge();
            saveState();
        }
        this.activeChatId = msgId;
        this.renderPhoneScreen();
    },

    renderChatConversation(container, msgId) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (!msg) return this.goHome();

        let historyHtml = '';
        (msg.chatHistory || []).forEach(chat => {
            let isMine = chat.from === 'me';
            historyHtml += `
                <div class="chat-msg ${isMine ? 'msg-player' : 'msg-seller'}">
                    ${chat.text}
                </div>
            `;
        });

        let actionButtons = '';
        if (msg.isScam) {
            actionButtons = `
                <div class="p-2 mb-2" style="background:rgba(255,51,102,0.1); border:1px solid var(--red); border-radius:8px;">
                    <div class="text-xs color-red font-bold mb-1">Подозрение на мошенничество!</div>
                    <div class="grid-2">
                        <button onclick="PhoneManager.resolveScamMessage('${msg.id}', false)" class="btn btn-green btn-sm">Заблокировать 🛡️</button>
                        <button onclick="PhoneManager.resolveScamMessage('${msg.id}', true)" class="btn btn-danger btn-sm">Перевести 50k 💸</button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.activeChatId = null; PhoneManager.renderPhoneScreen();" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title">${msg.avatar || '👤'} ${msg.sender}</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body" style="display:flex; flex-direction:column; justify-content:space-between;">
                <div class="chat-thread-container" style="flex:1; max-height:none; margin-bottom:10px;">
                    ${historyHtml}
                </div>
                ${actionButtons}
                <div class="chat-compose-box">
                    <input type="text" id="phoneReplyInput" class="chat-input" placeholder="Ответить...">
                    <button onclick="PhoneManager.sendReplyMessage('${msg.id}')" class="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>
        `;
    },

    sendReplyMessage(msgId) {
        const input = document.getElementById('phoneReplyInput');
        if (!input || !input.value.trim()) return;
        const text = input.value.trim();

        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (!msg) return;

        if (!msg.chatHistory) msg.chatHistory = [];
        msg.chatHistory.push({ from: 'me', text: text });
        msg.preview = "Вы: " + text;
        input.value = '';

        setTimeout(() => {
            let replyText = "Сообщение принято.";
            if (msg.sender.includes("Во-Банк")) replyText = "Запрос зарегистрирован банковским сервисом.";
            else if (msg.sender.includes("Артур")) replyText = "Добро. Будут вопросы — пиши.";
            else if (msg.isScam) replyText = "Оператор безопасности требует срочного перевода средств!";
            else replyText = "Понял тебя. На связи!";

            msg.chatHistory.push({ from: 'them', text: replyText });
            msg.preview = replyText;
            saveState();
            if (PhoneManager.currentApp === 'messages' && PhoneManager.activeChatId === msgId) {
                PhoneManager.renderPhoneScreen();
            }
            playSound('tick');
            tgHaptic('light');
        }, 1000);

        saveState();
        this.renderPhoneScreen();
    },

    resolveScamMessage(msgId, fellForScam) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (!msg) return;

        if (fellForScam) {
            let loss = 50000;
            state.player.cash = Math.max(0, (state.player.cash || 0) - loss);
            state.player.mood = Math.max(0, (state.player.mood || 80) - 25);
            msg.chatHistory.push({ from: 'them', text: "Спасибо за перевод, наивный перекуп!" });
            msg.isScam = false;
            openVerdictModal("РАЗВОД МОШЕННИКОВ! 💸", `Вы поддались на спам и перевели мошенникам ${loss.toLocaleString()} ₽!`, false);
        } else {
            msg.chatHistory.push({ from: 'them', text: "Номер добавлен в спам-фильтр." });
            msg.isScam = false;
            state.player.karma = Math.min(100, (state.player.karma || 50) + 3);
            showToast("🛡️ Мошенник заблокирован! Карма (+3)");
        }

        saveState();
        this.renderPhoneScreen();
    },

    pushBuyerFollowupSMS(carName, isScamDetected, buyerName) {
        if (!state.player.phoneMessages) state.player.phoneMessages = [];

        let msgId = "sms_buyer_" + Date.now();
        let newSMS = null;

        if (isScamDetected) {
            newSMS = {
                id: msgId,
                sender: `😡 ${buyerName}`,
                avatar: "🤬",
                preview: `Ты что мне впарил?! На ${carName} скрытый дефект!`,
                time: "Только что",
                unread: true,
                chatHistory: [
                    { from: "them", text: `Слышь, перекуп! Я доехал до дома на «${carName}», а мотор застучал! Сервис сказал, была залита загущающая присадка!` },
                    { from: "them", text: `Жди гостей, я знаю твой гараж! Либо возвращай часть суммы, либо будут проблемы!` }
                ]
            };
        } else {
            newSMS = {
                id: msgId,
                sender: `🤝 ${buyerName}`,
                avatar: "🙂",
                preview: `Спасибо за ${carName}! Машина огонь, мотор шепчет.`,
                time: "Только что",
                unread: true,
                chatHistory: [
                    { from: "them", text: `Привет! Добрался отлично на «${carName}». Всё как ты и говорил — честный ухоженный аппарат.` },
                    { from: "them", text: `Оставил отличный отзыв среди знакомых водителей. Респект!` }
                ]
            };
        }

        state.player.phoneMessages.unshift(newSMS);
        this.updateUnreadBadge();
        saveState();
        showToast(`📲 Новое SMS от ${buyerName}!`);
        playSound('win');
        tgHaptic('success');
    },

    // ----------------------------------------------------
    // 3. ПРИЛОЖЕНИЕ: ВО-БАНК (СЕЙФ + ЗАЙМЫ)
    // ----------------------------------------------------
    renderBankApp(container) {
        let cash = state.player?.cash || 0;
        let safe = state.player?.safeDeposit || 0;
        let debt = state.player?.loanDebt || 0;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-vault color-green"></i> Во-Банк Онлайн</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <span class="sub-label text-xs">Текущий счет:</span>
                        <span class="tag-badge bg-tag-green">+3% / день</span>
                    </div>
                    <div class="price-val color-green mb-2">${cash.toLocaleString()} ₽</div>
                    
                    <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                        <div class="flex-between">
                            <div>
                                <div class="text-xs font-bold color-amber"><i class="fa-solid fa-lock"></i> Сейф Перекупа</div>
                                <div class="sub-label" style="font-size:9px;">Защита от рэкета на трассе</div>
                            </div>
                            <b class="color-amber text-xs">${safe.toLocaleString()} ₽</b>
                        </div>
                    </div>

                    <div class="grid-2 mb-2">
                        <button onclick="depositToSafeAction(50000); PhoneManager.renderPhoneScreen();" class="btn btn-dark btn-sm">+50k в сейф</button>
                        <button onclick="depositToSafeAction(200000); PhoneManager.renderPhoneScreen();" class="btn btn-dark btn-sm">+200k в сейф</button>
                    </div>
                    <button onclick="withdrawFromSafeAction(); PhoneManager.renderPhoneScreen();" class="btn btn-green btn-sm w-full mb-1">Забрать всё из сейфа</button>
                </div>

                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-red"><i class="fa-solid fa-hand-holding-dollar"></i> Кредитная линия Во-Банка</b>
                        <span class="sub-label text-xs">Долг: <b class="color-amber">${debt.toLocaleString()} ₽</b></span>
                    </div>
                    <div class="grid-2 mb-2">
                        <button onclick="takeLoan(100000); PhoneManager.renderPhoneScreen();" class="btn btn-dark btn-sm">Взять 100k</button>
                        <button onclick="takeLoan(500000); PhoneManager.renderPhoneScreen();" class="btn btn-dark btn-sm">Взять 500k</button>
                    </div>
                    <div class="grid-3">
                        <button onclick="repayLoan(25); PhoneManager.renderPhoneScreen();" class="btn btn-cyan btn-sm">25%</button>
                        <button onclick="repayLoan(50); PhoneManager.renderPhoneScreen();" class="btn btn-cyan btn-sm">50%</button>
                        <button onclick="repayLoan(100); PhoneManager.renderPhoneScreen();" class="btn btn-green btn-sm">Всё</button>
                    </div>
                </div>
            </div>
        `;
    },

    // ----------------------------------------------------
    // 4. ПРИЛОЖЕНИЕ: РЕШАЛА АРТУР
    // ----------------------------------------------------
    renderReshalaApp(container) {
        let conn = state.player?.connections || 0;
        let immunity = state.player?.policeImmunityDays || 0;
        let hasLic = !!state.player?.hasRacingLicense;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-user-secret color-purple"></i> Решала Артур</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="reshala-banner mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-purple">Теневые Связи: ${conn} 🤝</b>
                        <span class="tag-badge bg-tag-purple">Штаб</span>
                    </div>
                    <div class="sub-label" style="font-size:10px;">Отмена 12.5.1, конфискат приставов и снятие розыска с VIN.</div>
                </div>

                <div class="grid-2 mb-2">
                    <button onclick="buyReshalaPack('pack1'); PhoneManager.renderPhoneScreen();" class="btn btn-purple btn-sm">1 Связь (150k)</button>
                    <button onclick="buyReshalaPack('pack5'); PhoneManager.renderPhoneScreen();" class="btn btn-purple btn-sm">5 Связей (650k)</button>
                </div>

                <div class="reshala-deal-card mb-2 p-2">
                    <div class="flex-between">
                        <b class="text-xs">🚨 Крыша ГИБДД (3 дня)</b>
                        <span class="tag-badge bg-tag-amber">${immunity > 0 ? immunity + ' дн.' : 'Иммунитет'}</span>
                    </div>
                    <p class="sub-label my-1" style="font-size:10px;">Защита от проверок в дрифте и штрафстоянок.</p>
                    <button onclick="buyReshalaService('roof'); PhoneManager.renderPhoneScreen();" class="btn btn-amber btn-sm w-full" ${immunity > 0 ? 'disabled' : ''}>
                        ${immunity > 0 ? 'Крыша активна' : 'Оформить (350k ₽ / 45 ⭐)'}
                    </button>
                </div>

                <div class="reshala-deal-card mb-2 p-2">
                    <div class="flex-between">
                        <b class="text-xs">🏎️ Гоночная Лицензия РАФ</b>
                        <span class="tag-badge bg-tag-cyan">402 метра</span>
                    </div>
                    <p class="sub-label my-1" style="font-size:10px;">Официальный допуск пилота к заездам.</p>
                    <button onclick="buyReshalaService('license'); PhoneManager.renderPhoneScreen();" class="btn btn-cyan btn-sm w-full" ${hasLic ? 'disabled' : ''}>
                        ${hasLic ? 'Оформлено ✓' : 'Оформить (85k ₽ / 1 🤝)'}
                    </button>
                </div>

                <div class="reshala-deal-card p-2">
                    <div class="flex-between">
                        <b class="text-xs">🔏 Легализация криминала</b>
                        <span class="tag-badge bg-tag-cyan">Чистый VIN</span>
                    </div>
                    <p class="sub-label my-1" style="font-size:10px;">Снимает статус «В розыске» с проблемного авто.</p>
                    <button onclick="openLegalizeCarModal()" class="btn btn-dark btn-sm w-full">Выбрать авто (200k + 1 🤝)</button>
                </div>
            </div>
        `;
    },

    // ----------------------------------------------------
    // 5. ПРИЛОЖЕНИЕ: САРАИ (ГАРАЖНЫЕ НАХОДКИ)
    // ----------------------------------------------------
    renderBarnApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-screwdriver-wrench color-amber"></i> Находки в сараях</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2 flex-between">
                    <div>
                        <b class="text-xs color-amber">Разведка заброшек</b>
                        <div class="sub-label" style="font-size:10px;">Шанс найти ретро-классику и архивные номера!</div>
                    </div>
                    <span class="tag-badge bg-tag-amber">1 раз/день</span>
                </div>
                <div id="barnFindContent"></div>
            </div>
        `;
        if (typeof renderBarnFind === 'function') renderBarnFind();
    },

    // ----------------------------------------------------
    // 6. ПРИЛОЖЕНИЕ: ПОРТ & АУКЦИОНЫ
    // ----------------------------------------------------
    renderContainersApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-box-open color-purple"></i> Порт & Контейнеры</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle, rgba(220, 38, 38, 0.2) 0%, #0b101a 100%); border-color: rgba(220, 38, 38, 0.4);">
                    <div class="flex-between mb-1">
                        <b class="color-red text-xs"><i class="fa-solid fa-gavel"></i> Слепой аукцион ФССП</b>
                        <span class="tag-badge bg-tag-red">Слепой лот</span>
                    </div>
                    <p class="sub-label mb-2" style="font-size:10px;">Машина под чехлом. Неизвестен пробег и проблемы. Высокий риск!</p>
                    <button onclick="openBlindAuctionModal()" class="btn btn-danger btn-sm w-full">Перейти к торгам</button>
                </div>

                <div class="glass-card p-2">
                    <div class="flex-between mb-2">
                        <b class="text-xs color-purple"><i class="fa-solid fa-ship"></i> Портовые Контейнеры</b>
                        <span class="sub-label" style="font-size:10px;">Таможня Кобе / Copart</span>
                    </div>
                    <div id="containersListRender"></div>
                    <div id="containersLockCover" class="level-lock-cover" style="display:none;">
                        <h4 class="font-bold">Таможня закрыта</h4>
                        <p class="sub-label">С 12 уровня!</p>
                    </div>
                </div>
            </div>
        `;
        if (typeof renderContainersList === 'function') renderContainersList();
    },

    // ----------------------------------------------------
    // 7. ПРИЛОЖЕНИЕ: ДПС РАДАР
    // ----------------------------------------------------
    renderRadarApp(container) {
        let immunity = state.player?.policeImmunityDays || 0;
        let races = state.player?.consecutiveRaces || 0;
        let maxRaces = state.player?.maxRacesBeforeRaid || 12;

        let statusText = immunity > 0 
            ? `<span class="color-green font-bold">Иммунитет активен (${immunity} дн.)</span>` 
            : `<span class="color-amber font-bold">Рейды активны</span>`;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title"><i class="fa-solid fa-radar color-red"></i> ДПС Радар</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-2">
                        <b class="text-xs">Статус рейдов:</b>
                        ${statusText}
                    </div>
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label">Внимание ДПС на 402м:</span>
                        <b class="${races > 8 ? 'color-red' : 'color-green'}">${races} / ${maxRaces} заездов</b>
                    </div>
                    <div class="biz-progress-track mb-2">
                        <div class="biz-progress-fill ${races > 8 ? 'risk-high' : 'fill-biz-stock'}" style="width:${Math.min(100, (races / maxRaces) * 100)}%;"></div>
                    </div>
                    <p class="sub-label mb-2" style="font-size:10px;">При превышении лимита экипаж ДПС устраивает облаву и отправляет корч на штрафстоянку!</p>
                    <button onclick="PhoneManager.openApp('reshala')" class="btn btn-purple btn-sm w-full">Купить крышу у Решалы</button>
                </div>
            </div>
        `;
    }
};

window.PhoneManager = PhoneManager;
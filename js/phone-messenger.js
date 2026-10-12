// ========================================================
// js/phone-messenger.js — ПРИЛОЖЕНИЕ «МЕССЕНДЖЕР» (v0.6.0)
// СМС-диалоги, уведомления, анти-скам защита и 
// механика онлайн-торга с продавцами авторынка в чате.
// ========================================================

const AppMessenger = {
    render(container) {
        if (PhoneManager.activeChatId) {
            this.renderChatConversation(container, PhoneManager.activeChatId);
        } else {
            this.renderMessagesList(container);
        }
    },

    markAllAsRead() {
        if (!state.player?.phoneMessages) return;
        let hadUnread = false;
        state.player.phoneMessages.forEach(m => {
            if (m && m.unread) {
                m.unread = false;
                hadUnread = true;
            }
        });
        if (hadUnread) {
            PhoneManager.updateUnreadBadge();
            saveState();
        }
    },

    renderMessagesList(container) {
        let messages = state.player?.phoneMessages || [];
        let listHtml = "";

        if (messages.length === 0) {
            listHtml = "<div class='sub-label text-center py-6'>У вас нет входящих сообщений.</div>";
        } else {
            messages.forEach(msg => {
                let unreadDot = msg.unread ? "<span class='tag-badge bg-tag-red' style='font-size:7px; padding:2px 5px;'>NEW</span>" : "";
                listHtml += `
                <div onclick="AppMessenger.openChat('${msg.id}')" class="glass-card p-2 flex-between mb-2 cursor-pointer" style="align-items: center;">
                    <div style="font-size:24px; min-width:36px; text-align:center;">${msg.avatar || '💬'}</div>
                    <div style="flex:1; margin: 0 10px; overflow:hidden;">
                        <div class="flex-between">
                            <b class="text-xs color-cyan">${msg.sender}</b>
                            <span class="sub-label" style="font-size:8.5px;">${msg.time || '00:00'}</span>
                        </div>
                        <div class="sub-label" style="font-size:9.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${msg.preview}</div>
                    </div>
                    ${unreadDot}
                </div>`;
            });
        }

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-comments color-cyan mr-1"></i> СМС Мессенджер</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="space-y-1">
                    ${listHtml}
                </div>
            </div>
        `;
    },

    openChat(msgId) {
        playSound('tick');
        tgHaptic('light');
        PhoneManager.activeChatId = msgId;
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (msg) {
            msg.unread = false;
            PhoneManager.updateUnreadBadge();
            saveState();
        }
        PhoneManager.renderOpenApp();
    },

    renderChatConversation(container, msgId) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (!msg) {
            PhoneManager.activeChatId = null;
            this.renderMessagesList(container);
            return;
        }

        let historyHtml = "";
        let chat = msg.chatHistory || [];
        chat.forEach(ch => {
            let isMe = ch.from === 'me';
            historyHtml += `
            <div class="chat-bubble ${isMe ? 'mine' : ''}">
                <div style="font-size:11px; line-height:1.35;">${ch.text}</div>
            </div>`;
        });

        // Блок действий при скаме
        let scamActionBox = "";
        if (msg.isScam && !msg.scamResolved) {
            scamActionBox = `
            <div class="p-2 mb-2" style="background:rgba(220,38,38,0.15); border:1px solid var(--red); border-radius:8px;">
                <div class="text-xs color-red font-bold mb-1">⚠️ Подозрительная операция!</div>
                <div class="grid-2">
                    <button onclick="AppMessenger.blockScamSender('${msg.id}')" class="btn btn-green btn-sm">Заблокировать 🛡️</button>
                    <button onclick="AppMessenger.resolveScamMessage('${msg.id}')" class="btn btn-danger btn-sm">Перевести 50k 💸</button>
                </div>
            </div>`;
        }

        // Онлайн-торг в чате с продавцом
        let marketHaggleBox = "";
        if (msg.isMarketSeller && !msg.sellerBlocked) {
            marketHaggleBox = `
            <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                <div class="text-xs font-bold color-cyan mb-1">💬 Онлайн-торг по объявлению (${msg.carName || 'Авто'}):</div>
                <div class="grid-3">
                    <button onclick="AppMessenger.chatHaggle('${msg.id}', 5)" class="btn btn-dark btn-sm">-5%</button>
                    <button onclick="AppMessenger.chatHaggle('${msg.id}', 12)" class="btn btn-cyan btn-sm">-12%</button>
                    <button onclick="AppMessenger.chatHaggle('${msg.id}', 25)" class="btn btn-amber btn-sm">-25%</button>
                </div>
            </div>`;
        } else if (msg.sellerBlocked) {
            marketHaggleBox = `
            <div class="p-2 mb-2 text-center" style="background:rgba(220,38,38,0.1); border:1px solid var(--red); border-radius:8px;">
                <div class="text-xs color-red font-bold">🚫 Продавец заблокировал ваш номер за наглость. Машина снята с продажи.</div>
            </div>`;
        }

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="AppMessenger.closeChat()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title">${msg.avatar || '👤'} ${msg.sender}</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body flex-col" style="justify-content: space-between;">
                <div class="space-y-2 mb-2" style="max-height: 250px; overflow-y: auto; flex:1;" id="chatMessagesScrollBox">
                    ${historyHtml}
                </div>
                <div>
                    ${scamActionBox}
                    ${marketHaggleBox}
                    ${!msg.sellerBlocked ? `
                    <div class="chat-compose-box">
                        <input type="text" id="chatReplyInput" class="chat-input" placeholder="Введите сообщение..." maxlength="100">
                        <button onclick="AppMessenger.sendReply('${msg.id}')" class="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
                    </div>` : ''}
                </div>
            </div>
        `;

        const box = document.getElementById('chatMessagesScrollBox');
        if (box) box.scrollTop = box.scrollHeight;
    },

    closeChat() {
        playSound('tick');
        tgHaptic('light');
        PhoneManager.activeChatId = null;
        PhoneManager.renderOpenApp();
    },

    sendReply(msgId) {
        const input = document.getElementById('chatReplyInput');
        if (!input || !input.value.trim()) return;

        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (!msg || msg.sellerBlocked) return;

        let text = input.value.trim();
        input.value = "";

        if (!msg.chatHistory) msg.chatHistory = [];
        msg.chatHistory.push({ from: 'me', text: text });

        // Автоответчик
        setTimeout(() => {
            let botReply = "Принято. На связи!";
            if (msg.sender.includes("Во-Банк")) botReply = "Операция обрабатывается службой поддержки.";
            else if (msg.sender.includes("Артур")) botReply = "Связи наготове. Обращайся.";
            else if (msg.sender.includes("Влад")) botReply = "Ждём твоего заезда на треке!";

            msg.chatHistory.push({ from: 'them', text: botReply });
            saveState();
            if (PhoneManager.activeChatId === msgId) {
                this.renderChatConversation(document.getElementById('phoneAppContainer'), msgId);
            }
            playSound('tick');
        }, 1000);

        saveState();
        this.renderChatConversation(document.getElementById('phoneAppContainer'), msgId);
    },

    resolveScamMessage(msgId) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (!msg || msg.scamResolved) return;

        let cost = msg.scamCost || 50000;
        let cash = state.player?.cash || 0;
        if (cash < cost) return showToast("Не хватает денег для перевода!");

        state.player.cash -= cost;
        state.player.mood = Math.max(0, (state.player.mood || 80) - 25);
        msg.scamResolved = true;
        msg.isScam = false;
        msg.chatHistory.push({ from: 'me', text: `Перевёл ${cost.toLocaleString()} ₽ на указанный счет. Отмените операцию!` });
        msg.chatHistory.push({ from: 'them', text: "Деньги зачислены на криптокошелек. Спасибо за донат, перекуп!" });

        saveState();
        updateHeaderUI();
        playSound('error');
        tgHaptic('error');
        openVerdictModal("РАЗВОД МОШЕННИКОВ! 💸", `Вы поддались на панику и перевели мошенникам ${cost.toLocaleString()} ₽!`, false);
        this.renderChatConversation(document.getElementById('phoneAppContainer'), msgId);
    },

    blockScamSender(msgId) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (!msg) return;

        msg.scamResolved = true;
        msg.isScam = false;
        msg.chatHistory.push({ from: 'them', text: "Номер добавлен в спам-фильтр оператора связи." });
        state.player.karma = Math.min(100, (state.player.karma || 50) + 4);

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast("🛡️ Мошенник заблокирован! Карма (+4)");
        this.renderChatConversation(document.getElementById('phoneAppContainer'), msgId);
    },

    chatHaggle(msgId, percent) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (!msg || !msg.isMarketSeller || msg.sellerBlocked) return;

        let car = (state.marketFeed || []).find(c => c.id === msg.marketCarId);
        if (!car || car.unavailable) {
            showToast("Этот автомобиль уже продан или снят с продажи.");
            return;
        }

        let chat = msg.chatHistory;
        chat.push({ from: 'me', text: `Привет! Заберу за наличные прямо сегодня, если скинешь ${percent}%. По рукам?` });

        let successChance = percent === 5 ? 80 : (percent === 12 ? 55 : 25);
        if (car.dealType === 'urgent') successChance += 20;

        if (Math.random() * 100 <= successChance) {
            let discount = Math.round(car.price * (percent / 100));
            car.price = Math.max(10000, car.price - discount);
            chat.push({ from: 'them', text: `Ладно, уговорил. Скидываю ${discount.toLocaleString()} ₽, приезжай забирай!` });
            playSound('win');
            tgHaptic('success');
            showToast(`Успех! Продавец скинул ${percent}% в переписке.`);
        } else {
            if (percent === 25 || Math.random() < 0.40) {
                msg.sellerBlocked = true;
                chat.push({ from: 'them', text: `Ты совсем берега попутал? За такие копейки не отдам. В бан.` });
                car.unavailable = true;
                playSound('error');
                tgHaptic('error');
                showToast("🚫 Продавец заблокировал вас за наглость!");
            } else {
                chat.push({ from: 'them', text: `Нет, такая цена меня не устроит. Ни копейки не скину.` });
                playSound('error');
                tgHaptic('light');
                showToast("Продавец отказался давать скидку.");
            }
        }

        saveState();
        this.renderChatConversation(document.getElementById('phoneAppContainer'), msgId);
    }
};

window.AppMessenger = AppMessenger;
// ========================================================
// js/phone-messenger.js — ПРИЛОЖЕНИЕ «МЕССЕНДЖЕР» (v0.6.0)
// СМС-диалоги, уведомления, анти-скам защита и 
// новая механика онлайн-торга с продавцами в чате.
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

        // Если это скам-сообщение от службы безопасности
        let scamActionBox = "";
        if (msg.isScam && !msg.scamResolved) {
            scamActionBox = `
            <div class="p-2 mb-2" style="background:rgba(220,38,38,0.15); border:1px solid var(--red); border-radius:8px;">
                <div class="text-xs color-red font-bold mb-1">⚠️ Подозрительный перевод!</div>
                <button onclick="AppMessenger.resolveScamMessage('${msg.id}')" class="btn btn-danger btn-sm w-full">Перевести 50,000 ₽ на "безопасный счет"</button>
            </div>`;
        }

        // --- НОВАЯ МЕХАНИКА: ОНЛАЙН-ТОРГ В ЧАТЕ С ПРОДАВЦОМ ---
        let marketHaggleBox = "";
        if (msg.isMarketSeller && !msg.sellerBlocked) {
            marketHaggleBox = `
            <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                <div class="text-xs font-bold color-cyan mb-1">💬 Торг по объявлению (${msg.carName || 'Авто'}):</div>
                <div class="grid-3">
                    <button onclick="AppMessenger.chatHaggle('${msg.id}', 5)" class="btn btn-dark btn-sm">Скинуть 5%</button>
                    <button onclick="AppMessenger.chatHaggle('${msg.id}', 12)" class="btn btn-cyan btn-sm">Скинуть 12%</button>
                    <button onclick="AppMessenger.chatHaggle('${msg.id}', 25)" class="btn btn-amber btn-sm">Скинуть 25%!</button>
                </div>
            </div>`;
        } else if (msg.sellerBlocked) {
            marketHaggleBox = `
            <div class="p-2 mb-2 text-center" style="background:rgba(220,38,38,0.1); border:1px solid var(--red); border-radius:8px;">
                <div class="text-xs color-red font-bold">🚫 Продавец заблокировал ваш номер за излишнюю наглость в торгах. Объявление удалено.</div>
            </div>`;
        }

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="AppMessenger.closeChat()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-user mr-1"></i> ${msg.sender}</div>
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

        // Автоответчик бота
        setTimeout(() => {
            let botReply = "Понял вас. Жду на осмотр!";
            if (msg.sender.includes("Во-Банк")) botReply = "Спасибо за обращение в службу поддержки.";
            else if (msg.sender.includes("Артур")) botReply = "Обращайся, когда понадобятся мои услуги.";

            msg.chatHistory.push({ from: 'them', text: botReply });
            saveState();
            if (PhoneManager.activeChatId === msgId) {
                this.renderChatConversation(document.getElementById('phoneAppContainer'), msgId);
            }
        }, 1000);

        saveState();
        this.renderChatConversation(document.getElementById('phoneAppContainer'), msgId);
    },

    resolveScamMessage(msgId) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (!msg || msg.scamResolved) return;

        let cash = state.player?.cash || 0;
        if (cash < msg.scamCost) return showToast("Не хватает денег для перевода мошенникам!");

        state.player.cash -= msg.scamCost;
        msg.scamResolved = true;
        msg.chatHistory.push({ from: 'me', text: "Перевел 50,000 ₽ на указанный счет. Отмените операцию!" });
        msg.chatHistory.push({ from: 'them', text: "Ха-ха, спасибо за пополнение! Деньги ушли на криптокошелек. Лох не мамонт." });

        saveState();
        updateHeaderUI();
        playSound('error');
        tgHaptic('error');
        showToast("⚠️ Вас обманули мошенники! Со счета списано 50,000 ₽.");
        this.renderChatConversation(document.getElementById('phoneAppContainer'), msgId);
    },

    // --- НОВАЯ МЕХАНИКА: ОНЛАЙН-ТОРГ В ЧАТЕ С ПРОДАВЦОМ ---
    chatHaggle(msgId, percent) {
        const msg = (state.player?.phoneMessages || []).find(m => m.id === msgId);
        if (!msg || !msg.isMarketSeller || msg.sellerBlocked) return;

        let car = (state.marketFeed || []).find(c => c.id === msg.marketCarId);
        if (!car || car.unavailable) {
            showToast("Этот автомобиль уже продан или снят с учета.");
            return;
        }

        let chat = msg.chatHistory;
        chat.push({ from: 'me', text: `Слушай, давай заберу прямо сейчас на ${percent}% дешевле?` });

        let successChance = percent === 5 ? 80 : (percent === 12 ? 55 : 25);
        if (car.dealType === 'urgent') successChance += 25;

        if (Math.random() * 100 <= successChance) {
            let discount = Math.round(car.price * (percent / 100));
            car.price = Math.max(10000, car.price - discount);
            chat.push({ from: 'them', text: `Ладно, уговорил. Скидываю ${discount.toLocaleString()} ₽, приезжай забирай!` });
            playSound('win');
            tgHaptic('success');
            showToast(`Успех! Продавец скинул ${percent}% прямо в чате.`);
        } else {
            if (percent === 25 || Math.random() < 0.40) {
                msg.sellerBlocked = true;
                chat.push({ from: 'them', text: `Ты совсем охренел с такими скидками?! Иди лесом, перекуп.` });
                car.unavailable = true; // Машина пропадает с рынка
                playSound('error');
                tgHaptic('error');
                showToast("🚫 Продавец заблокировал ваш номер за наглый торг!");
            } else {
                chat.push({ from: 'them', text: `С дуба рухнул? Такая скидка мне неинтересна. Давай без глупостей.` });
                playSound('error');
                tgHaptic('light');
                showToast("Продавец отказался давать такую скидку.");
            }
        }

        saveState();
        this.renderChatConversation(document.getElementById('phoneAppContainer'), msgId);
    }
};

window.AppMessenger = AppMessenger;
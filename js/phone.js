// ========================================================
// js/phone.js — БАЗОВАЯ ОС СМАРТФОНА «PerekupOS» (v0.6.1)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Модульный диспетчер приложений (Router), статус-бар, 
// сворачиваемые виджеты предприятий и плана дня перекупа.
// ========================================================

const PhoneManager = {
    currentApp: null,
    unreadCount: 0,
    activeChatId: null,

    init() {
        if (!state.player.phoneMessages || state.player.phoneMessages.length === 0) {
            state.player.phoneMessages = [
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
                    id: "sms_street_boss",
                    sender: "🏎️ Влад Стрит-Орг",
                    avatar: "🏁",
                    preview: "Техком RDS ужесточил правила. Проверь свой спек перед выездом!",
                    time: "11:20",
                    unread: true,
                    chatHistory: [
                        { from: "them", text: "Здорово! В RDS GP со 105 силами больше не суйся — судьи ставят баранку за распрямление в первой же дуге." },
                        { from: "them", text: "Для слабых тачек открыт зимний паркинг ТЦ. В Европу и GP копи на турбо-мотор, каркас и слик!" }
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
                        { from: "them", text: "Если у тебя есть собственный гаражный бокс или ангар, сможем отмывать VIN и снимать 12.5.1 со скидкой твоего цеха!" }
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
            ];
        }

        if (state.player.streetCred === undefined) state.player.streetCred = 100;
        if (state.player.superSpinTickets === undefined) state.player.superSpinTickets = 1;
        if (!state.player.phoneWidgetsCollapsed) state.player.phoneWidgetsCollapsed = { biz: false, quests: false };

        if (!state.player.dailyQuests || state.player.dailyQuests.length === 0) {
            if (typeof refreshDailyQuestsList === 'function') {
                refreshDailyQuestsList();
            }
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
        this.unreadCount = messages.filter(m => m && m.unread).length;

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

    markAllMessagesAsRead() {
        if (!state.player?.phoneMessages) return;
        let hadUnread = false;
        state.player.phoneMessages.forEach(m => {
            if (m && m.unread) {
                m.unread = false;
                hadUnread = true;
            }
        });
        if (hadUnread) {
            this.updateUnreadBadge();
            saveState();
        }
    },

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

    toggleWidget(widgetName) {
        if (!state.player.phoneWidgetsCollapsed) {
            state.player.phoneWidgetsCollapsed = { biz: false, quests: false };
        }
        state.player.phoneWidgetsCollapsed[widgetName] = !state.player.phoneWidgetsCollapsed[widgetName];
        playSound('tick');
        tgHaptic('light');
        saveState();

        if (widgetName === 'biz') this.renderBusinessWidget();
        if (widgetName === 'quests') this.renderDailyQuestsWidget();
    },

    renderBusinessWidget() {
        const widgetContainer = document.getElementById('phoneBizWidgetContainer');
        if (!widgetContainer) return;

        const hasAnyBusiness = state.businesses && state.businesses.some(b => b && b.level > 0);

        if (!hasAnyBusiness) {
            widgetContainer.innerHTML = '';
            widgetContainer.style.display = 'none';
            return;
        }

        widgetContainer.style.display = 'block';
        const stats = this.getBusinessStats();
        let isCollapsed = !!state.player?.phoneWidgetsCollapsed?.biz;

        let statusBadge = stats.minStock <= 15 
            ? "<span class='tag-badge bg-tag-red'>Мало сырья!</span>" 
            : "<span class='tag-badge bg-tag-green'>Работает</span>";

        let bodyHtml = isCollapsed ? `
            <div class="flex-between text-xs pt-1">
                <span class="sub-label">В кассах: <b class="color-green">${stats.totalStoredCash.toLocaleString()} ₽</b></span>
                <span class="sub-label">Прибыль: <b class="color-cyan">+${stats.totalIncomePerDay.toLocaleString()} ₽/д</b></span>
            </div>
        ` : `
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
                <button onclick="PhoneManager.openApp('business')" class="btn btn-dark btn-sm">
                    Управление
                </button>
            </div>
        `;

        widgetContainer.innerHTML = `
            <div class="phone-biz-widget">
                <div class="flex-between mb-1">
                    <div class="flex-gap" style="align-items:center;">
                        <div class="widget-icon-bubble"><i class="fa-solid fa-briefcase color-green"></i></div>
                        <div>
                            <div class="widget-title">Сеть предприятий</div>
                            <div class="sub-label" style="font-size:9.5px;">Активно: <b class="color-green">${stats.activePoints}</b> точек</div>
                        </div>
                    </div>
                    <div class="flex-gap" style="align-items:center;">
                        ${statusBadge}
                        <button onclick="PhoneManager.toggleWidget('biz')" class="btn btn-dark btn-auto btn-sm" style="padding:2px 8px; font-size:10px;">
                            <i class="fa-solid ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                        </button>
                    </div>
                </div>
                ${bodyHtml}
            </div>
        `;
    },

    renderDailyQuestsWidget() {
        const widget = document.getElementById('phoneDailyQuestsWidget');
        if (!widget) return;

        if (!state.player.dailyQuests || state.player.dailyQuests.length === 0) {
            if (typeof refreshDailyQuestsList === 'function') refreshDailyQuestsList();
        }

        let quests = state.player.dailyQuests || [];
        let completedCount = 0;
        let isCollapsed = !!state.player?.phoneWidgetsCollapsed?.quests;
        let htmlQuests = "";

        const iconsMap = {
            gauge_check: 'fa-ruler-combined color-cyan',
            win_drag: 'fa-flag-checkered color-red',
            collect_biz: 'fa-briefcase color-green',
            buy_car: 'fa-cart-shopping color-amber',
            sell_car: 'fa-handshake color-green',
            obd_scan: 'fa-tablet-screen-button color-cyan',
            presale_mod: 'fa-wand-magic-sparkles color-purple',
            drift_run: 'fa-compass-drafting color-red'
        };

        quests.forEach((q, idx) => {
            let cur = q.cur || 0;
            let max = q.max || q.target || 1;
            let isDone = q.done || cur >= max;
            let isClaimed = !!q.done;
            if (isDone) completedCount++;

            let pct = Math.min(100, Math.round((cur / max) * 100));
            let iconClass = iconsMap[q.actionType] || 'fa-list-check color-cyan';

            let actionBtn = "";
            if (isClaimed) {
                actionBtn = `<span class="quest-done-badge"><i class="fa-solid fa-check"></i> Получено</span>`;
            } else if (cur >= max) {
                actionBtn = `
                    <button onclick="PhoneManager.claimQuestReward(${idx})" class="quest-claim-btn">
                        <i class="fa-solid fa-gift"></i> Забрать +${(q.reward / 1000).toFixed(0)}k
                    </button>`;
            } else {
                actionBtn = `<span class="sub-label font-bold" style="font-size:10px;">${cur}/${max}</span>`;
            }

            htmlQuests += `
                <div class="quest-card-item ${isClaimed ? 'quest-completed' : ''}">
                    <div style="font-size:16px; min-width:22px; text-align:center;">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="quest-card-info">
                        <div class="quest-card-title">${q.text}</div>
                        <div class="quest-card-sub">
                            <span class="sub-label">Награда: <b class="color-amber">+${q.reward.toLocaleString()} ₽</b></span>
                            <div class="quest-progress-track">
                                <div class="quest-progress-bar" style="width:${pct}%;"></div>
                            </div>
                        </div>
                    </div>
                    <div class="quest-action-btn-wrap">
                        ${actionBtn}
                    </div>
                </div>
            `;
        });

        let superRewardBlock = "";
        let allDone = completedCount >= quests.length;
        if (allDone && !state.player.dailyQuestsSuperClaimed) {
            superRewardBlock = `
                <div class="quest-super-reward-banner">
                    <div>
                        <div class="font-bold text-xs color-amber"><i class="fa-solid fa-crown"></i> План дня перевыполнен 3/3!</div>
                        <div class="sub-label" style="font-size:9.5px;">+50,000 ₽, +10 ⭐ Stars, +1 🤝 Связь</div>
                    </div>
                    <button onclick="PhoneManager.claimSuperDailyReward()" class="btn btn-amber btn-sm btn-auto" style="min-height:30px; padding:4px 10px;">
                        Забрать Супербонус!
                    </button>
                </div>
            `;
        }

        let bodyHtml = isCollapsed ? `
            <div class="flex-between text-xs pt-1">
                <span class="sub-label">Выполнено заданий: <b class="${allDone ? 'color-green' : 'color-amber'}">${completedCount} из ${quests.length}</b></span>
                <span class="tag-badge ${allDone ? 'bg-tag-green' : 'bg-tag-cyan'}">${allDone ? 'ЗАВЕРШЕНО' : 'В ПРОЦЕССЕ'}</span>
            </div>
        ` : `
            ${htmlQuests}
            ${superRewardBlock}
        `;

        widget.innerHTML = `
            <div class="quest-widget-header">
                <div class="flex-gap" style="align-items:center;">
                    <i class="fa-solid fa-list-check color-cyan"></i>
                    <b class="text-xs color-cyan">План перекупа на день:</b>
                </div>
                <div class="flex-gap" style="align-items:center;">
                    <span class="sub-label" style="font-size:9.5px;">00:00 🌙</span>
                    <button onclick="PhoneManager.toggleWidget('quests')" class="btn btn-dark btn-auto btn-sm" style="padding:2px 8px; font-size:10px;">
                        <i class="fa-solid ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                    </button>
                </div>
            </div>
            ${bodyHtml}
        `;
    },

    claimQuestReward(idx) {
        let q = state.player.dailyQuests[idx];
        let max = q?.max || q?.target || 1;
        if (!q || q.done || (q.cur || 0) < max) return;

        q.done = true;
        state.player.cash = (state.player.cash || 0) + q.reward;
        addXp(q.rewardXp || 35);
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Цель выполнена! Получено +${q.reward.toLocaleString()} ₽!`);
        this.renderDailyQuestsWidget();
    },

    claimSuperDailyReward() {
        if (state.player.dailyQuestsSuperClaimed) return;
        state.player.dailyQuestsSuperClaimed = true;

        state.player.cash = (state.player.cash || 0) + 50000;
        state.player.stars = (state.player.stars || 0) + 10;
        state.player.connections = (state.player.connections || 0) + 1;
        state.player.mood = 100;

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        openVerdictModal("СУПЕРБОНУС ДНЯ! 🌟", "Вы закрыли весь ежедневный план перекупа!\nНачислено: +50,000 ₽, +10 ⭐ Stars, +1 🤝 Связь и статус «Ударник Авторынка»!", true);
        this.renderDailyQuestsWidget();
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
            this.renderDailyQuestsWidget();
        } else {
            homeScreen.style.display = 'none';
            appContainer.style.display = 'flex';
            this.renderOpenApp();
        }
    },

    openApp(appName) {
        playSound('tick');
        tgHaptic('light');
        this.currentApp = appName;
        if (appName === 'messages') {
            this.markAllMessagesAsRead();
        }
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

        try {
            if (this.currentApp === 'street' && typeof PhoneRacing !== 'undefined') {
                PhoneRacing.renderStreetApp(container);
            } else if (this.currentApp === 'radio' && typeof PhoneMedia !== 'undefined') {
                PhoneMedia.renderRadioApp(container);
            } else if (this.currentApp === 'fortune' && typeof PhoneMedia !== 'undefined') {
                PhoneMedia.renderFortuneApp(container);
            } else if (this.currentApp === 'autodrot' && typeof AppAutodrot !== 'undefined') {
                AppAutodrot.render(container);
            } else if (this.currentApp === 'bank' && typeof AppBank !== 'undefined') {
                AppBank.render(container);
            } else if (this.currentApp === 'business' && typeof AppBusiness !== 'undefined') {
                AppBusiness.render(container);
            } else if (this.currentApp === 'housing' && typeof AppHousing !== 'undefined') {
                AppHousing.render(container);
            } else if (this.currentApp === 'reshala' && typeof AppDarknet !== 'undefined') {
                AppDarknet.render(container);
            } else if (this.currentApp === 'darknet' && typeof AppDarknet !== 'undefined') {
                AppDarknet.render(container);
            } else if (this.currentApp === 'syndicate') {
                this.renderSyndicateApp(container);
            } else if (this.currentApp === 'barn' && typeof AppBarn !== 'undefined') {
                AppBarn.render(container);
            } else if (this.currentApp === 'containers' && typeof AppPort !== 'undefined') {
                AppPort.render(container);
            } else if (this.currentApp === 'shop') {
                this.renderShopApp(container);
            } else if (this.currentApp === 'radar' && typeof AppRadar !== 'undefined') {
                AppRadar.render(container);
            } else if (this.currentApp === 'gosuslugi' && typeof AppGosuslugi !== 'undefined') {
                AppGosuslugi.render(container);
            } else if (this.currentApp === 'notepad') {
                this.renderNotepadApp(container);
            } else if (this.currentApp === 'messages' && typeof AppMessenger !== 'undefined') {
                AppMessenger.render(container);
            } else {
                container.innerHTML = `
                    <div class="phone-app-header">
                        <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                        <div class="phone-app-title">Приложение</div>
                        <div style="width:40px;"></div>
                    </div>
                    <div class="phone-app-body p-3 text-center">
                        <div class="sub-label py-4">Модуль «${this.currentApp}» загружается...</div>
                        <button onclick="PhoneManager.goHome()" class="btn btn-dark btn-sm">На главный экран</button>
                    </div>
                `;
            }
        } catch(err) {
            console.error("[PhoneManager] Ошибка запуска приложения " + this.currentApp + ":", err);
            container.innerHTML = `
                <div class="phone-app-header">
                    <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Домой</button>
                    <div class="phone-app-title">Ошибка приложения</div>
                    <div style="width:40px;"></div>
                </div>
                <div class="phone-app-body p-3 text-center">
                    <i class="fa-solid fa-triangle-exclamation color-amber mb-2" style="font-size:32px;"></i>
                    <div class="font-bold text-xs mb-1">Сбой экрана</div>
                    <div class="sub-label mb-3" style="font-size:10px;">${err.message || 'Ошибка модуля'}</div>
                    <button onclick="PhoneManager.goHome()" class="btn btn-dark btn-sm">Вернуться на домашний экран</button>
                </div>
            `;
        }
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

    renderSyndicateApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-globe color-purple mr-1"></i> Синдикат & Контракты</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="grid-4 mb-2">
                    <button onclick="switchSyndicateTab('contracts')" id="synTabBtn-contracts" class="btn btn-cyan btn-sm">Заказы</button>
                    <button onclick="switchSyndicateTab('blackmarket')" id="synTabBtn-blackmarket" class="btn btn-dark btn-sm">Тень</button>
                    <button onclick="switchSyndicateTab('clubs')" id="synTabBtn-clubs" class="btn btn-dark btn-sm">Клубы</button>
                    <button onclick="switchSyndicateTab('leaderboard')" id="synTabBtn-leaderboard" class="btn btn-dark btn-sm">Топ</button>
                </div>

                <div id="synScreen-contracts">
                    <div class="glass-card mb-2 p-2">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-cyan"><i class="fa-solid fa-file-contract"></i> Заказы Синдиката</b>
                            <button onclick="refreshContractsManual()" class="btn btn-dark btn-auto btn-sm">Обновить (25k)</button>
                        </div>
                        <div class="sub-label" style="font-size:10px;">Поставка проверенных автомобилей клиентам под ключ.</div>
                    </div>
                    <div id="contractsList"></div>
                    <div id="contractsLockCover" class="level-lock-cover" style="display:none;"></div>
                </div>

                <div id="synScreen-blackmarket" style="display:none;">
                    <div class="glass-card mb-2 p-2">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-purple"><i class="fa-solid fa-mask"></i> Теневой рынок номеров</b>
                            <span class="tag-badge bg-tag-purple">VIP</span>
                        </div>
                        <p class="sub-label mb-2" style="font-size:10px;">Биржа редких госномеров (777, ЕКХ, АМР).</p>
                        <button onclick="refreshBlackMarketPlates()" class="btn btn-dark btn-sm w-full mb-2">Обновить (35k ₽)</button>
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
        if (typeof renderContracts === 'function') renderContracts();
    },

    renderShopApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-cart-shopping color-amber mr-1"></i> Авто-Маркет</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="grid-4 mb-2">
                    <button onclick="switchShopSection('tools')" id="shopTab-tools" class="btn btn-cyan btn-sm">Приборы</button>
                    <button onclick="switchShopSection('consumables')" id="shopTab-consumables" class="btn btn-dark btn-sm">Сырьё</button>
                    <button onclick="switchShopSection('tuningParts')" id="shopTab-tuningParts" class="btn btn-dark btn-sm">Тюнинг</button>
                    <button onclick="switchShopSection('homeItems')" id="shopTab-homeItems" class="btn btn-dark btn-sm">Дом</button>
                </div>
                <div id="shopSec-tools"><div id="shopToolsList" class="space-y-2 mb-2"></div></div>
                <div id="shopSec-consumables" style="display:none;"><div id="shopConsumablesList" class="space-y-2 mb-2"></div></div>
                <div id="shopSec-tuningParts" style="display:none;"><div id="shopTuningPartsList" class="space-y-2 mb-2"></div></div>
                <div id="shopSec-homeItems" style="display:none;"><div id="shopHomeItemsList" class="space-y-2 mb-2"></div></div>
            </div>
        `;
        if (typeof switchShopSection === 'function') switchShopSection('tools');
    },

    renderNotepadApp(container) {
        let s = state.player?.stats || {};
        let goals = typeof NOTEPAD_CAREER_GOALS !== 'undefined' ? NOTEPAD_CAREER_GOALS : [];
        let netProfit = s.totalNetProfit || 0;
        let soldCount = s.sold || 0;
        let totalSlots = typeof getTotalGarageSlots === 'function' ? getTotalGarageSlots() : 2;
        let ownedHouses = state.player?.ownedHouses || [];

        let completedGoals = 0;
        let goalsHtml = goals.map(g => {
            let isDone = false;
            let currentVal = 0;
            let targetVal = 1;

            if (g.targetProfit) {
                currentVal = netProfit;
                targetVal = g.targetProfit;
                isDone = currentVal >= targetVal;
            } else if (g.targetSales) {
                currentVal = soldCount;
                targetVal = g.targetSales;
                isDone = currentVal >= targetVal;
            } else if (g.targetSlots) {
                currentVal = totalSlots;
                targetVal = g.targetSlots;
                isDone = currentVal >= targetVal;
            } else if (g.targetCred) {
                currentVal = state.player?.streetCred || 0;
                targetVal = g.targetCred;
                isDone = currentVal >= targetVal;
            } else if (g.targetHousing) {
                isDone = ownedHouses.includes(g.targetHousing);
                currentVal = isDone ? 1 : 0;
                targetVal = 1;
            }

            if (isDone) completedGoals++;
            let progressPct = Math.min(100, Math.round((currentVal / targetVal) * 100));

            return `
            <div class="glass-card p-2 mb-2" style="border-left: 3px solid ${isDone ? 'var(--green)' : 'var(--amber)'};">
                <div class="flex-between mb-1">
                    <b class="text-xs ${isDone ? 'color-green' : 'color-cyan'}">${g.title}</b>
                    <span class="tag-badge ${isDone ? 'bg-tag-green' : 'bg-tag-amber'}">${isDone ? 'ДОСТИГНУТО ✓' : g.category}</span>
                </div>
                <div class="sub-label mb-2" style="font-size:10px;">${g.desc}</div>
                <div class="flex-between text-xs mb-1">
                    <span>Прогресс:</span>
                    <b class="${isDone ? 'color-green' : 'color-amber'}">${currentVal.toLocaleString()} / ${targetVal.toLocaleString()}</b>
                </div>
                <div class="biz-progress-track mb-2">
                    <div class="biz-progress-fill ${isDone ? 'fill-biz-stock' : 'fill-biz-lvl'}" style="width:${progressPct}%;"></div>
                </div>
                <div class="text-xs color-amber" style="font-size:9.5px;">⭐ Награда: <b>${g.reward}</b></div>
            </div>`;
        }).join('');

        let totalProgressPct = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-note-sticky color-amber mr-1"></i> Блокнот Карьеры</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2" style="background:radial-gradient(circle at 50% 0%, rgba(0,242,254,0.15), rgba(9,14,24,0.98));">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-route"></i> Карьерный путь перекупа</b>
                        <span class="price-val text-xs color-green">${totalProgressPct}%</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9.5px;">Закрыто этапов: <b>${completedGoals} из ${goals.length}</b>. Выполняйте цели для получения бонусов.</div>
                    <div class="biz-progress-track">
                        <div class="biz-progress-fill fill-biz-stock" style="width:${totalProgressPct}%;"></div>
                    </div>
                </div>

                <div class="glass-card p-2 mb-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-green"><i class="fa-solid fa-chart-line"></i> Сводка эффективности:</b>
                        <span class="sub-label text-xs">Уровень: <b>${state.player?.level || 1}</b></span>
                    </div>
                    <div class="sub-label" style="font-size:10px;">
                        • Куплено ТС: <b>${s.bought || 0}</b> шт.<br>
                        • Продано в плюс: <b class="color-green">${s.profitableSales || 0}</b> сделок<br>
                        • Чистая прибыль: <b class="color-green">${(s.totalNetProfit || 0).toLocaleString()} ₽</b>
                    </div>
                </div>
                
                <h4 class="font-bold text-xs color-cyan mb-2">🎯 Долгосрочные карьерные цели:</h4>
                <div class="space-y-2 mb-3">
                    ${goalsHtml}
                </div>
            </div>
        `;
    }
};

window.PhoneManager = PhoneManager;
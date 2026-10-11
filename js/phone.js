// ========================================================
// js/phone.js — БАЗОВАЯ ОС СМАРТФОНА «PerekupOS» (v0.5.1)
// Разработчики: Tak Toje, Max, Sergo, gemini
// Автономные экраны приложений, P2P биржа (Авто, Номера, Бизнес, Жильё),
// Порт, Решала со скидками цеха, Блокнот карьеры, Во-Банк и чаты
// ========================================================

const PhoneManager = {
    currentApp: null,
    unreadCount: 0,
    activeChatId: null,
    autodrotSubTab: 'market',
    autodrotP2PFilter: 'cars',
    bankSubTab: 'accounts',

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
                { from: "them", text: "Если у тебя есть собственный гаражный бокс или ангар, сможем отмывать VIN и снимать 12.5.1 дешевле — со скидкой твоего цеха!" }
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
        if (state.player.streetCred === undefined) {
            state.player.streetCred = 100;
        }
        if (state.player.superSpinTickets === undefined) {
            state.player.superSpinTickets = 1;
        }
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
        let statusBadge = stats.minStock <= 15 
            ? "<span class='tag-badge bg-tag-red'>Мало сырья!</span>" 
            : "<span class='tag-badge bg-tag-green'>Работает</span>";

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
                    <button onclick="PhoneManager.openApp('business')" class="btn btn-dark btn-sm">
                        Управление
                    </button>
                </div>
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

        widget.innerHTML = `
            <div class="quest-widget-header">
                <div class="flex-gap" style="align-items:center;">
                    <i class="fa-solid fa-list-check color-cyan"></i>
                    <b class="text-xs color-cyan">План перекупа на день:</b>
                </div>
                <span class="sub-label" style="font-size:9.5px;">Сброс в 00:00 🌙</span>
            </div>
            ${htmlQuests}
            ${superRewardBlock}
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
            if (this.currentApp === 'street') {
                if (typeof PhoneRacing !== 'undefined') PhoneRacing.renderStreetApp(container);
            } else if (this.currentApp === 'radio') {
                if (typeof PhoneMedia !== 'undefined') PhoneMedia.renderRadioApp(container);
            } else if (this.currentApp === 'fortune') {
                if (typeof PhoneMedia !== 'undefined') PhoneMedia.renderFortuneApp(container);
            } else if (this.currentApp === 'autodrot') {
                this.renderAutodrotApp(container);
            } else if (this.currentApp === 'bank') {
                this.renderBankApp(container);
            } else if (this.currentApp === 'business') {
                this.renderBusinessApp(container);
            } else if (this.currentApp === 'housing') {
                this.renderHousingApp(container);
            } else if (this.currentApp === 'reshala') {
                this.renderReshalaApp(container);
            } else if (this.currentApp === 'syndicate') {
                this.renderSyndicateApp(container);
            } else if (this.currentApp === 'barn') {
                this.renderBarnApp(container);
            } else if (this.currentApp === 'containers') {
                this.renderContainersApp(container);
            } else if (this.currentApp === 'shop') {
                this.renderShopApp(container);
            } else if (this.currentApp === 'radar') {
                this.renderRadarApp(container);
            } else if (this.currentApp === 'gosuslugi') {
                this.renderGosuslugiApp(container);
            } else if (this.currentApp === 'notepad') {
                this.renderNotepadApp(container);
            } else if (this.currentApp === 'messages') {
                this.markAllMessagesAsRead();
                if (this.activeChatId) {
                    this.renderChatConversation(container, this.activeChatId);
                } else {
                    this.renderMessagesList(container);
                }
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
                    <div class="font-bold text-xs mb-1">Сбой загрузки экрана</div>
                    <div class="sub-label mb-3" style="font-size:10px;">${err.message || 'Неизвестная ошибка'}</div>
                    <button onclick="PhoneManager.goHome()" class="btn btn-dark btn-sm">Вернуться на главный экран</button>
                </div>
            `;
        }
    },

    // ----------------------------------------------------
    // УПРАВЛЕНИЕ БИЗНЕСОМ
    // ----------------------------------------------------
    renderBusinessApp(container) {
        if (!state.businesses || state.businesses.length === 0) {
            if (typeof BUSINESS_DATA !== 'undefined') state.businesses = JSON.parse(JSON.stringify(BUSINESS_DATA));
        }

        let lvl = state.player?.level || 1;
        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-briefcase color-green mr-1"></i> Мой Бизнес</div>
                <button onclick="collectAllBusinessCash(); PhoneManager.renderOpenApp();" class="btn btn-green btn-auto btn-sm">Касса</button>
            </div>
            <div class="phone-app-body">
        `;

        state.businesses.forEach((biz, idx) => {
            if (!biz) return;
            let isLocked = lvl < biz.minLevel;
            let isOwned = biz.level > 0;
            let cost = isOwned ? biz.cost * (biz.level + 1) : biz.cost;
            let saleToNpcPrice = isOwned ? Math.round(biz.cost * biz.level * 0.75) : 0;
            let imgSrc = biz.img || `assets/business/${biz.id}.jpg`;
            let fallbackSrc = biz.fallback || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80';

            let actionBlock = "";
            if (isLocked) {
                actionBlock = `<button class="btn btn-dark btn-sm w-full opacity-50" disabled>С ${biz.minLevel} уровня</button>`;
            } else if (!isOwned) {
                actionBlock = `<button onclick="upgradeBusiness(${idx}); PhoneManager.renderOpenApp();" class="btn btn-cyan btn-sm w-full">Купить (${cost.toLocaleString()} ₽)</button>`;
            } else {
                actionBlock = `
                    <div class="grid-2 mb-1">
                        <button onclick="upgradeBusiness(${idx}); PhoneManager.renderOpenApp();" class="btn btn-cyan btn-sm">Апгрейд (${cost.toLocaleString()} ₽)</button>
                        <button onclick="restockBusiness(${idx}); PhoneManager.renderOpenApp();" class="btn btn-amber btn-sm">Сырьё (15k)</button>
                    </div>
                    <div class="grid-2">
                        <button onclick="PhoneManager.sellBusinessToNPC('${biz.id}', ${saleToNpcPrice})" class="btn btn-dark btn-sm">Продать (${saleToNpcPrice.toLocaleString()} ₽)</button>
                        <button onclick="PhoneManager.listBusinessOnP2P('${biz.id}')" class="btn btn-purple btn-sm">На P2P биржу</button>
                    </div>
                `;
            }

            html += `
                <div class="glass-card mb-3 p-2">
                    <div class="car-img-wrap mb-2" style="height:115px; position:relative;">
                        <img src="${imgSrc}" class="car-img" onerror="this.onerror=null; this.src='${fallbackSrc}';">
                        <div class="badge-tag" style="bottom:6px; right:6px;">
                            <span class="tag-badge ${isOwned ? 'bg-tag-green' : 'bg-tag-amber'}">${isOwned ? 'Ур. ' + biz.level : 'С ' + biz.minLevel + ' ур'}</span>
                        </div>
                    </div>
                    <div class="flex-between mb-1">
                        <b class="text-xs color-green">${biz.name}</b>
                        <span class="price-val text-xs">${((biz.income || 0) * (biz.level || 0)).toLocaleString()} ₽/д</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">⭐ Перк: ${biz.perk || 'Пассивный доход'} | Сырьё: <b>${biz.stock || 0}%</b></div>
                    ${actionBlock}
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    sellBusinessToNPC(bizId, refundAmount) {
        const biz = (state.businesses || []).find(b => b.id === bizId);
        if (!biz || biz.level <= 0) return;

        if (!confirm(`Продать «${biz.name}» городскому инвестору за ${refundAmount.toLocaleString()} ₽? Точка будет ликвидирована.`)) return;

        state.player.cash = (state.player.cash || 0) + refundAmount;
        biz.level = 0;
        biz.stock = 0;
        biz.stored = 0;
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast(`Бизнес продан инвестору (+${refundAmount.toLocaleString()} ₽)!`);
        this.renderOpenApp();
        this.renderBusinessWidget();
    },

    listBusinessOnP2P(bizId) {
        const biz = (state.businesses || []).find(b => b.id === bizId);
        if (!biz || biz.level <= 0) return;

        let priceStr = prompt(`Введите цену продажи «${biz.name} (Ур. ${biz.level})» на P2P бирже:`, String(biz.cost * biz.level));
        if (!priceStr) return;
        let price = parseInt(priceStr);
        if (isNaN(price) || price <= 0) return showToast("Некорректная цена!");

        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        let lotId = "p2p_biz_" + Date.now();
        state.p2pMarketListings.unshift({
            id: lotId,
            seller: state.player?.name || "Перекуп",
            type: "business",
            name: `${biz.name} (Ур. ${biz.level})`,
            bizId: biz.id,
            bizLevel: biz.level,
            price: price,
            desc: `Готовая точка с доходностью ${((biz.income || 0) * biz.level).toLocaleString()} ₽/д.`
        });

        if (!state.myP2PListings) state.myP2PListings = [];
        state.myP2PListings.push(lotId);

        biz.level = 0;
        biz.stock = 0;
        saveState();
        showToast("Бизнес выставлен на онлайн P2P биржу Autodrot!");
        this.renderOpenApp();
    },

    // ----------------------------------------------------
    // ПРИЛОЖЕНИЕ «ЖИЛЬЁ & МАСТЕРСКИЕ»
    // ----------------------------------------------------
    renderHousingApp(container) {
        let curId = state.player?.housingId || 'trailer';
        let owned = state.player?.ownedHouses || [];
        let lvl = state.player?.level || 1;

        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-warehouse color-cyan mr-1"></i> Жильё & Мастерские</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.12), rgba(9,14,24,0.98));">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-circle-info"></i> База перекупа:</b>
                        <span class="tag-badge bg-tag-green">Тех. паспорт</span>
                    </div>
                    <div class="sub-label" style="font-size:9.5px; line-height:1.4;">
                        Слесарный тюнинг и корчевание требуют <b>смотровую яму</b>, а полировка кузова — <b>закрытый чистый бокс с водой</b>.
                    </div>
                </div>
        `;

        (typeof HOUSING_LIST !== 'undefined' ? HOUSING_LIST : []).forEach(h => {
            let isCur = curId === h.id;
            let isPurchased = owned.includes(h.id);
            let isLvlLocked = lvl < (h.minLevel || 1);
            let refundPrice = Math.round((h.buyPrice || 1000000) * 0.8);
            let imgSrc = h.img || `assets/houses/${h.id}.jpg`;
            let fallbackSrc = h.fallback || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80';
            let reqStars = h.reqStars || 5;

            let tuneBadge = h.canTune 
                ? `<span class="tag-badge bg-tag-green" style="font-size:8.5px;"><i class="fa-solid fa-screwdriver-wrench"></i> Тюнинг ✓</span>`
                : `<span class="tag-badge bg-tag-red" style="font-size:8.5px;"><i class="fa-solid fa-ban"></i> Тюнинг ✗</span>`;

            let detailBadge = h.canDetail
                ? `<span class="tag-badge bg-tag-cyan" style="font-size:8.5px;"><i class="fa-solid fa-wand-magic-sparkles"></i> Детейлинг ✓</span>`
                : `<span class="tag-badge bg-tag-amber" style="font-size:8.5px;"><i class="fa-solid fa-xmark"></i> Детейлинг ✗</span>`;

            let obdBadge = h.canOBDGarage
                ? `<span class="tag-badge bg-tag-green" style="font-size:8.5px;"><i class="fa-solid fa-laptop-code"></i> Launch ✓</span>`
                : `<span class="tag-badge bg-tag-red" style="font-size:8.5px;"><i class="fa-solid fa-xmark"></i> Launch ✗</span>`;

            let personalBadge = h.hasPersonalSlot
                ? `<span class="tag-badge bg-tag-purple" style="font-size:8.5px;"><i class="fa-solid fa-crown"></i> Личка ✓</span>`
                : `<span class="tag-badge bg-tag-red" style="font-size:8.5px;"><i class="fa-solid fa-xmark"></i> Без лички</span>`;

            let slotCost = h.slots > 0 ? `~${((h.buyPrice || 1000000) / h.slots / 1000).toFixed(0)}k ₽/место` : '—';

            let actionBtns = "";
            if (isLvlLocked) {
                actionBtns = `<button class="btn btn-dark btn-sm w-full opacity-50" disabled>С ${h.minLevel} уровня авторитета</button>`;
            } else if (isPurchased) {
                actionBtns = `
                    <div class="grid-2 mb-1">
                        <button onclick="openHomeInteriorModal('${h.id}')" class="btn btn-cyan btn-sm">🛋️ Интерьер</button>
                        ${isCur ? '<button class="btn btn-dark btn-sm opacity-50" disabled>Текущая база</button>' : `<button onclick="moveIntoHousing('${h.id}'); PhoneManager.renderOpenApp();" class="btn btn-green btn-sm">Переехать</button>`}
                    </div>
                    <div class="grid-2">
                        <button onclick="PhoneManager.sellHousingToNPC('${h.id}', ${refundPrice})" class="btn btn-dark btn-sm">Продать (${(refundPrice / 1000000).toFixed(1)}M)</button>
                        <button onclick="PhoneManager.listHousingOnP2P('${h.id}')" class="btn btn-purple btn-sm">На P2P биржу</button>
                    </div>
                `;
            } else {
                actionBtns = `
                    <div class="grid-2">
                        <button onclick="rentHousing('${h.id}'); PhoneManager.renderOpenApp();" class="btn btn-cyan btn-sm">Аренда (${(h.rent || 2000).toLocaleString()} ₽/д)</button>
                        <button onclick="buyHousingProperty('${h.id}'); PhoneManager.renderOpenApp();" class="btn btn-amber btn-sm">Купить (${(h.buyPrice / 1000000).toFixed(1)}M + ${reqStars} ⭐)</button>
                    </div>
                `;
            }

            html += `
                <div class="glass-card mb-3 p-2 ${isCur ? 'personal-car-card' : ''}">
                    <div class="car-img-wrap mb-2" style="height:125px; position:relative;">
                        <img src="${imgSrc}" class="car-img" onerror="this.onerror=null; this.src='${fallbackSrc}';">
                        <div class="badge-tag" style="bottom:6px; right:6px;">
                            <span class="tag-badge ${isPurchased ? 'bg-tag-green' : (isCur ? 'bg-tag-cyan' : 'bg-tag-amber')}">
                                ${isPurchased ? 'Собственность' : (isCur ? 'Арендовано' : 'Доступно')}
                            </span>
                        </div>
                        <div class="badge-tag bg-tag-cyan" style="top:6px; left:6px; right:auto;">${h.typeLabel || 'Объект'}</div>
                    </div>
                    
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan">${h.name}</b>
                        <span class="color-green font-bold text-xs">+${h.slots} мест гаража</span>
                    </div>

                    <div class="car-mods-badges-container my-1">
                        ${tuneBadge}
                        ${detailBadge}
                        ${obdBadge}
                        ${personalBadge}
                    </div>

                    <div class="sub-label mb-2" style="font-size:9.5px; line-height:1.35;">${h.desc || ''}</div>
                    
                    <div class="p-1 mb-2" style="background:#090e18; border-radius:6px; font-size:9.5px;">
                        <div class="color-amber font-bold mb-1">⭐ Перк: ${h.perk || 'Стандарт'}</div>
                        <div class="flex-between sub-label">
                            <span>Уют: <b class="${(h.moodBonus || 0) >= 0 ? 'color-green' : 'color-red'}">${(h.moodBonus || 0) >= 0 ? '+' : ''}${h.moodBonus || 0}% куража/д</b></span>
                            <span>Место: <b class="color-cyan">${slotCost}</b></span>
                        </div>
                    </div>

                    ${actionBtns}
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    sellHousingToNPC(hId, refundAmount) {
        if (!confirm(`Продать недвижимость агентству за ${refundAmount.toLocaleString()} ₽? Право собственности будет аннулировано.`)) return;

        state.player.cash = (state.player.cash || 0) + refundAmount;
        state.player.ownedHouses = (state.player.ownedHouses || []).filter(id => id !== hId);

        if (state.player.housingId === hId) {
            state.player.housingId = 'trailer';
            state.player.housingType = 'rent';
        }

        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        playSound('win');
        tgHaptic('success');
        showToast(`Недвижимость продана риелторам (+${refundAmount.toLocaleString()} ₽)!`);
        this.renderOpenApp();
    },

    listHousingOnP2P(hId) {
        const h = (typeof HOUSING_LIST !== 'undefined' ? HOUSING_LIST : []).find(item => item.id === hId);
        if (!h) return;

        let priceStr = prompt(`Введите цену продажи «${h.name}» на P2P бирже:`, String(h.buyPrice));
        if (!priceStr) return;
        let price = parseInt(priceStr);
        if (isNaN(price) || price <= 0) return showToast("Некорректная цена!");

        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        let lotId = "p2p_house_" + Date.now();
        state.p2pMarketListings.unshift({
            id: lotId,
            seller: state.player?.name || "Перекуп",
            type: "housing",
            name: h.name,
            houseId: h.id,
            price: price,
            desc: `Недвижимость в собственности. Гараж на +${h.slots} мест.`
        });

        if (!state.myP2PListings) state.myP2PListings = [];
        state.myP2PListings.push(lotId);

        state.player.ownedHouses = (state.player.ownedHouses || []).filter(id => id !== hId);
        if (state.player.housingId === hId) {
            state.player.housingId = 'trailer';
            state.player.housingType = 'rent';
        }

        saveState();
        if (typeof renderGarage === 'function') renderGarage();
        showToast("Недвижимость выставлена на онлайн P2P биржу Autodrot!");
        this.renderOpenApp();
    },

    // ----------------------------------------------------
    // ПОРТ И КОНТЕЙНЕРЫ
    // ----------------------------------------------------
    renderContainersApp(container) {
        let lvl = state.player?.level || 1;
        let isLocked = lvl < 12;

        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-box-open color-purple mr-1"></i> Порт & Контейнеры</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
        `;

        if (isLocked) {
            html += `
                <div class="glass-card text-center p-4 my-auto">
                    <div class="radar-spinner-ring mb-3" style="border-top-color: var(--purple); border-right-color: var(--cyan);">
                        <div class="radar-spinner-center">🚢</div>
                    </div>
                    <div class="modal-glow-badge mb-2" style="color:var(--purple); border-color:rgba(192,132,252,0.4); background:rgba(192,132,252,0.1);">
                        ТАМОЖНЯ ОПЕЧАТАНА
                    </div>
                    <h3 class="font-bold color-purple mb-1">Доступ с 12 Уровня!</h3>
                    <p class="sub-label mb-3" style="font-size:10.5px; line-height:1.45;">
                        Ваш текущий уровень авторитета: <b>${lvl} из 12</b>.<br>
                        Контейнеры из Японии, Германии и аукционов США с раритетной техникой станут доступны после того, как вы наберёте авторитет на рынке!
                    </p>
                    <button onclick="PhoneManager.goHome()" class="btn btn-dark btn-sm w-full">Вернуться на домашний экран</button>
                </div>
            </div>`;
            container.innerHTML = html;
            return;
        }

        html += `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle, rgba(220, 38, 38, 0.2) 0%, #0b101a 100%); border-color: rgba(220, 38, 38, 0.4);">
                <div class="flex-between mb-1">
                    <b class="color-red text-xs"><i class="fa-solid fa-gavel"></i> Слепой аукцион ФССП</b>
                    <span class="tag-badge bg-tag-red">Слепой лот</span>
                </div>
                <p class="sub-label mb-2" style="font-size:10px;">Машина под чехлом. Неизвестен пробег и проблемы.</p>
                <button onclick="openBlindAuctionModal()" class="btn btn-danger btn-sm w-full">Перейти к торгам</button>
            </div>

            <div class="glass-card p-2">
                <div class="flex-between mb-2">
                    <b class="text-xs color-purple"><i class="fa-solid fa-ship"></i> Портовые Контейнеры</b>
                    <span class="sub-label" style="font-size:10px;">Таможня Кобе / Copart</span>
                </div>
                <div id="containersListRender"></div>
            </div>
        </div>`;

        container.innerHTML = html;
        if (typeof renderContainersList === 'function') {
            renderContainersList();
        }
    },

    // ----------------------------------------------------
    // РЕШАЛА АРТУР (С ДИНАМИЧЕСКИМИ СКИДКАМИ МАСТЕРСКОЙ)
    // ----------------------------------------------------
    renderReshalaApp(container) {
        let conn = state.player?.connections || 0;
        let immunity = state.player?.policeImmunityDays || 0;
        let hasLic = !!state.player?.hasRacingLicense;

        const caps = typeof getPlayerHousingCapabilities === 'function' ? getPlayerHousingCapabilities() : { reshalaDiscountPct: 0 };
        let discountBadge = caps.reshalaDiscountPct > 0 
            ? `<span class="tag-badge bg-tag-green">Скидка цеха -${caps.reshalaDiscountPct}%</span>`
            : `<span class="tag-badge bg-tag-purple">Штаб</span>`;

        let roofPrice = Math.round(350000 * Math.max(0.5, 1 - (caps.reshalaDiscountPct / 100)));
        let licPrice = Math.round(85000 * Math.max(0.5, 1 - (caps.reshalaDiscountPct / 100)));

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-user-secret color-purple mr-1"></i> Решала Артур</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="reshala-banner mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-purple">Теневые Связи: ${conn} 🤝</b>
                        ${discountBadge}
                    </div>
                    <div class="sub-label" style="font-size:10px;">
                        Отмена 12.5.1, снятие розыска с VIN и крыша ГИБДД.${caps.reshalaDiscountPct > 0 ? ` Действует скидка мастерской <b>${caps.reshalaDiscountPct}%</b>!` : ''}
                    </div>
                </div>

                <div class="grid-2 mb-2">
                    <button onclick="buyReshalaPack('pack1'); PhoneManager.renderOpenApp();" class="btn btn-purple btn-sm">1 Связь (150k)</button>
                    <button onclick="buyReshalaPack('pack5'); PhoneManager.renderOpenApp();" class="btn btn-purple btn-sm">5 Связей (650k)</button>
                </div>

                <div class="reshala-deal-card mb-2 p-2">
                    <div class="flex-between">
                        <b class="text-xs">🚨 Крыша ГИБДД (3 дня)</b>
                        <span class="tag-badge bg-tag-amber">${immunity > 0 ? immunity + ' дн.' : 'Иммунитет'}</span>
                    </div>
                    <p class="sub-label my-1" style="font-size:10px;">Защита от облав на заездах и штрафов за просроченный ДКП.</p>
                    <button onclick="buyReshalaService('roof'); PhoneManager.renderOpenApp();" class="btn btn-amber btn-sm w-full" ${immunity > 0 ? 'disabled' : ''}>
                        ${immunity > 0 ? 'Крыша активна' : `Оформить (${(roofPrice / 1000).toFixed(0)}k ₽ / 45 ⭐)`}
                    </button>
                </div>

                <div class="reshala-deal-card mb-2 p-2">
                    <div class="flex-between">
                        <b class="text-xs">🏎️ Гоночная Лицензия РАФ</b>
                        <span class="tag-badge bg-tag-cyan">402 метра</span>
                    </div>
                    <p class="sub-label my-1" style="font-size:10px;">Официальный регламентный допуск пилота к заездам.</p>
                    <button onclick="buyReshalaService('license'); PhoneManager.renderOpenApp();" class="btn btn-cyan btn-sm w-full" ${hasLic ? 'disabled' : ''}>
                        ${hasLic ? 'Оформлено ✓' : `Оформить (${(licPrice / 1000).toFixed(0)}k ₽ / 15 ⭐)`}
                    </button>
                </div>

                <div class="reshala-deal-card p-2">
                    <div class="flex-between">
                        <b class="text-xs">🔏 Легализация криминала</b>
                        <span class="tag-badge bg-tag-cyan">Чистый VIN</span>
                    </div>
                    <p class="sub-label my-1" style="font-size:10px;">Снимает статус «В розыске» и аннулирование 12.5.1 с проблемного авто.</p>
                    <button onclick="openLegalizeCarModal()" class="btn btn-dark btn-sm w-full">
                        Выбрать авто (${caps.reshalaDiscountPct > 0 ? (200 * (1 - caps.reshalaDiscountPct / 100)).toFixed(0) + 'k' : '200k'} + 1 🤝)
                    </button>
                </div>
            </div>
        `;
    },

    renderBarnApp(container) {
        const pDay = state.player?.day || 1;
        const lastDay = state.player?.lastBarnDay || 0;
        const canScoutToday = lastDay < pDay;
        const lvl = state.player?.level || 1;

        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-screwdriver-wrench color-amber mr-1"></i> Находки в сараях</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2 flex-between">
                    <div>
                        <b class="text-xs color-amber">Разведка заброшек</b>
                        <div class="sub-label" style="font-size:10px;">Шанс найти ретро-классику и архивные номера!</div>
                    </div>
                    <span class="tag-badge bg-tag-amber">1 раз/сутки</span>
                </div>
        `;

        (typeof BARN_TIERS_CONFIG !== 'undefined' ? BARN_TIERS_CONFIG : []).forEach(b => {
            let isLvlLocked = lvl < b.reqLvl;
            let isDoneToday = !canScoutToday;
            let rareCar = (typeof BARN_FINDS !== 'undefined' && BARN_FINDS[b.rareIdx]) ? BARN_FINDS[b.rareIdx] : { name: "Раритет" };
            let imgSrc = b.img || `assets/barns/barn_tier${b.tier}.jpg`;
            let fallbackSrc = b.fallback || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80';

            let statusBadge = isLvlLocked 
                ? `<span class='tag-badge bg-tag-red'><i class='fa-solid fa-lock'></i> С ${b.reqLvl} УР</span>`
                : (isDoneToday ? "<span class='tag-badge bg-tag-amber'>Осмотрено</span>" : "<span class='tag-badge bg-tag-green'>Доступно</span>");

            let btnDisabled = (isLvlLocked || isDoneToday) ? "disabled" : "";
            let btnText = isLvlLocked ? `Требуется ${b.reqLvl} уровень` : (isDoneToday ? "Осмотрено (Сброс в 00:00 🌙)" : `Вскрыть ангар (${(b.cost / 1000).toFixed(0)}k ₽)`);

            html += `
                <div class="glass-card mb-3 p-2 ${b.classGrade}">
                    <div class="car-img-wrap mb-2" style="height:120px; position:relative;">
                        <img src="${imgSrc}" class="car-img" onerror="this.onerror=null; this.src='${fallbackSrc}';">
                        <div class="badge-tag" style="bottom:6px; right:6px;">${statusBadge}</div>
                    </div>
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan">${b.title}</b>
                        <span class="price-val text-xs color-amber">${b.cost.toLocaleString()} ₽</span>
                    </div>
                    <p class="sub-label mb-2" style="font-size:10px;">${b.desc}</p>
                    <div class="text-xs mb-1 color-amber">⭐ Редкий дроп (5%): <b>${rareCar.name}</b></div>
                    <div class="text-xs mb-2 color-purple">🏷️ Архивные номера: <b>15% шанс</b></div>
                    <button onclick="scoutBarnTier(${b.tier})" class="btn btn-cyan btn-sm w-full" ${btnDisabled}>${btnText}</button>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    // ----------------------------------------------------
    // ГОСУСЛУГИ, БЛОКНОТ И СООБЩЕНИЯ
    // ----------------------------------------------------
    renderGosuslugiApp(container) {
        let fines = state.player.trafficFines || 0;
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-building-columns color-cyan mr-1"></i> Госуслуги Авто</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs">Штрафы ГИБДД (со скидкой 50%)</b>
                        <span class="tag-badge ${fines > 0 ? 'bg-tag-red' : 'bg-tag-green'}">${fines > 0 ? fines.toLocaleString() + ' ₽' : 'Штрафов нет'}</span>
                    </div>
                    <p class="sub-label mb-2" style="font-size:10px;">Проверка камер и просроченных ДКП на дорогах.</p>
                    <button onclick="PhoneManager.payTrafficFines()" class="btn btn-cyan btn-sm w-full" ${fines <= 0 ? 'disabled' : ''}>Оплатить штрафы со скидкой 50%</button>
                </div>
                <div class="glass-card p-2">
                    <b class="text-xs color-green mb-1 block">✓ Проверка запретов на рег. действия</b>
                    <p class="sub-label" style="font-size:10px;">Все машины в гараже проверены по базам ФССП и реестру залогов.</p>
                </div>
            </div>
        `;
    },

    payTrafficFines() {
        let fines = state.player.trafficFines || 0;
        let discountCost = Math.round(fines * 0.5);
        if (state.player.cash < discountCost) return showToast("Не хватает денег!");
        state.player.cash -= discountCost;
        state.player.trafficFines = 0;
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast("Штрафы ГИБДД успешно оплачены!");
        this.renderOpenApp();
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
                    <div class="sub-label mb-2" style="font-size:9.5px;">Закрыто этапов: <b>${completedGoals} из ${goals.length}</b>. Выполняйте цели для получения постоянных бонусов.</div>
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
    },

    renderMessagesList(container) {
        const messages = state.player?.phoneMessages || [];
        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-comment-dots color-cyan mr-1"></i> Сообщения</div>
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
            else if (msg.sender.includes("Влад")) replyText = "Красава, ждём твоих заездов на треке!";
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
                preview: `Ты что мне продал?! На ${carName} скрытый дефект!`,
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
    // AUTODROT P2P & ДПС РАДАР
    // ----------------------------------------------------
    renderAutodrotApp(container) {
        let sub = this.autodrotSubTab || 'market';
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-bolt color-cyan mr-1"></i> Autodrot</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="grid-3 mb-2">
                    <button onclick="PhoneManager.switchAutodrotSubTab('market')" class="btn ${sub === 'market' ? 'btn-cyan' : 'btn-dark'} btn-sm">Биржа P2P</button>
                    <button onclick="PhoneManager.switchAutodrotSubTab('chat')" class="btn ${sub === 'chat' ? 'btn-cyan' : 'btn-dark'} btn-sm">Стрит-Чат</button>
                    <button onclick="PhoneManager.switchAutodrotSubTab('hotdeals')" class="btn ${sub === 'hotdeals' ? 'btn-cyan' : 'btn-dark'} btn-sm">🔥 Выкуп</button>
                </div>
                <div id="autodrotScreenContent"></div>
            </div>
        `;
        this.renderAutodrotSubScreen();
    },

    switchAutodrotSubTab(tab) {
        playSound('tick');
        tgHaptic('light');
        this.autodrotSubTab = tab;
        this.renderOpenApp();
    },

    setAutodrotP2PFilter(filter) {
        this.autodrotP2PFilter = filter;
        this.renderAutodrotSubScreen();
    },

    renderAutodrotSubScreen() {
        const content = document.getElementById('autodrotScreenContent');
        if (!content) return;

        if (this.autodrotSubTab === 'market') {
            let f = this.autodrotP2PFilter || 'cars';
            content.innerHTML = `
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-green"><i class="fa-solid fa-handshake"></i> Онлайн P2P торговля</b>
                        <button onclick="openCreateListingModal()" class="btn btn-green btn-auto btn-sm">+ Продать лот</button>
                    </div>
                    <div class="sub-label" style="font-size:10px;">Продавайте свои авто, номера, бизнес и недвижимость.</div>
                </div>
                <div class="grid-4 mb-2">
                    <button onclick="PhoneManager.setAutodrotP2PFilter('cars')" class="btn ${f === 'cars' ? 'btn-cyan' : 'btn-dark'} btn-sm">🚗 Авто</button>
                    <button onclick="PhoneManager.setAutodrotP2PFilter('plates')" class="btn ${f === 'plates' ? 'btn-cyan' : 'btn-dark'} btn-sm">🏷 Номера</button>
                    <button onclick="PhoneManager.setAutodrotP2PFilter('business')" class="btn ${f === 'business' ? 'btn-cyan' : 'btn-dark'} btn-sm">💼 Бизнес</button>
                    <button onclick="PhoneManager.setAutodrotP2PFilter('housing')" class="btn ${f === 'housing' ? 'btn-cyan' : 'btn-dark'} btn-sm">🏠 Жильё</button>
                </div>
                <div id="p2pItemsList"></div>
            `;
            this.renderP2PListingsFiltered();
        } else if (this.autodrotSubTab === 'chat') {
            content.innerHTML = `
                <div class="live-chat-card mb-2 p-2">
                    <div class="flex-between mb-2">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-satellite-dish"></i> Эфир перекупов города</b>
                        <span class="tag-badge bg-tag-cyan">Live</span>
                    </div>
                    <div id="lifeChatFeed" class="chat-messages-container" style="max-height: 230px;"></div>
                    <div class="chat-compose-box mt-2">
                        <input type="text" id="feedMessageInput" class="chat-input" placeholder="Написать в Autodrot..." maxlength="100">
                        <button onclick="sendChatMessageFromInput()" class="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
                    </div>
                </div>
            `;
            if (typeof renderLifeChat === 'function') renderLifeChat();
        } else if (this.autodrotSubTab === 'hotdeals') {
            content.innerHTML = `
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber"><i class="fa-solid fa-fire"></i> Срочный выкуп с рук</b>
                        <span class="tag-badge bg-tag-amber">Дисконт -35%</span>
                    </div>
                    <p class="sub-label mb-2" style="font-size:10px;">Владельцам срочно нужны наличные! Успейте забрать лот до истечения таймера.</p>
                </div>
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs">Toyota Mark II JZX90 (Срочно)</b>
                        <span class="tag-badge bg-tag-red">Осталось: 55с</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:10px;">Цена продавца: <b class="color-green">290,000 ₽</b> (Рынок: 490,000 ₽)</div>
                    <button onclick="showToast('Лот выкуплен другим игроком в сети!');" class="btn btn-amber btn-sm w-full">Перехватить сделку ⚡</button>
                </div>
            `;
        }
    },

    renderP2PListingsFiltered() {
        const list = document.getElementById('p2pItemsList');
        if (!list) return;

        let filter = this.autodrotP2PFilter || 'cars';
        if (!state.p2pMarketListings) state.p2pMarketListings = [];

        let filtered = state.p2pMarketListings.filter(item => item.type === filter || (filter === 'cars' && item.type === 'car') || (filter === 'plates' && item.type === 'plate'));

        if (filtered.length === 0) {
            list.innerHTML = "<div class='glass-card text-center sub-label py-6'>В этой категории биржи пока нет лотов.</div>";
            return;
        }

        let html = "";
        filtered.forEach(item => {
            let isMy = (state.myP2PListings && state.myP2PListings.includes(item.id));
            let btnAction = isMy 
                ? `<button onclick="cancelP2PListing('${item.id}')" class="btn btn-danger btn-auto btn-sm">Снять с продажи</button>`
                : `<button onclick="PhoneManager.buyP2PAnyListing('${item.id}')" class="btn btn-green btn-auto btn-sm">Купить (${item.price.toLocaleString()} ₽)</button>`;

            html += `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan">${item.name}</b>
                    <span class="price-val text-xs color-green">${item.price.toLocaleString()} ₽</span>
                </div>
                <div class="sub-label mb-2" style="font-size:10px;">Продавец: <b>${item.seller}</b> ${item.desc ? '• ' + item.desc : ''}</div>
                <div class="text-right">${btnAction}</div>
            </div>`;
        });
        list.innerHTML = html;
    },

    buyP2PAnyListing(listingId) {
        const idx = (state.p2pMarketListings || []).findIndex(l => l.id === listingId);
        if (idx === -1) return;
        const lot = state.p2pMarketListings[idx];

        let cash = state.player?.cash || 0;
        if (cash < lot.price) return showToast("Не хватает денег для выкупа лота!");

        if (lot.type === 'business') {
            state.player.cash -= lot.price;
            let targetBiz = (state.businesses || []).find(b => b.id === lot.bizId);
            if (targetBiz) {
                targetBiz.level = Math.max(targetBiz.level || 0, lot.bizLevel || 1);
                targetBiz.stock = 100;
            }
            showToast(`Вы выкупили готовый бизнес «${lot.name}» с P2P биржи!`);
        } else if (lot.type === 'housing') {
            state.player.cash -= lot.price;
            if (!state.player.ownedHouses) state.player.ownedHouses = [];
            if (!state.player.ownedHouses.includes(lot.houseId)) state.player.ownedHouses.push(lot.houseId);
            state.player.housingId = lot.houseId;
            state.player.housingType = 'own';
            showToast(`Вы выкупили недвижимость «${lot.name}» с P2P биржи!`);
        } else if (lot.type === 'cars' || lot.type === 'car' || lot.type === 'plates' || lot.type === 'plate') {
            buyP2PListing(listingId);
            return;
        }

        state.p2pMarketListings.splice(idx, 1);
        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        playSound('win');
        tgHaptic('success');
        this.renderAutodrotSubScreen();
    },

    // ----------------------------------------------------
    // ВО-БАНК ОНЛАЙН
    // ----------------------------------------------------
    renderBankApp(container) {
        let cash = state.player?.cash || 0;
        let safe = state.player?.safeDeposit || 0;
        let debt = state.player?.loanDebt || 0;
        let sub = this.bankSubTab || 'accounts';

        let depositsListHtml = "";
        let deposits = state.player?.bankDeposits || [];
        if (deposits.length === 0) {
            depositsListHtml = "<div class='sub-label text-center py-2'>У вас нет активных вкладов.</div>";
        } else {
            deposits.forEach((dep, dIdx) => {
                depositsListHtml += `
                <div class="glass-card p-2 flex-between mb-2">
                    <div>
                        <b class="text-xs color-green">${dep.name}</b>
                        <div class="sub-label" style="font-size:9.5px;">Сумма с процентами: <b class="color-green">${dep.amount.toLocaleString()} ₽</b> (+${(dep.dailyRate * 100).toFixed(0)}%/день)</div>
                    </div>
                    <button onclick="closeBankDepositAction(${dIdx}); PhoneManager.renderOpenApp();" class="btn btn-green btn-auto btn-sm">Забрать</button>
                </div>`;
            });
        }

        let historyHtml = "";
        let history = state.player?.bankHistory || [];
        if (history.length === 0) {
            historyHtml = "<div class='sub-label text-center py-2'>История операций пуста.</div>";
        } else {
            history.forEach(tx => {
                historyHtml += `
                <div class="p-2 flex-between mb-1" style="background:#090e18; border-radius:6px; border:1px solid rgba(255,255,255,0.04);">
                    <div>
                        <div class="text-xs">${tx.title}</div>
                        <div class="sub-label" style="font-size:8.5px;">${tx.time}</div>
                    </div>
                    <b class="text-xs ${tx.isIncome ? 'color-green' : 'color-red'}">${tx.isIncome ? '+' : '-'}${tx.amount.toLocaleString()} ₽</b>
                </div>`;
            });
        }

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-vault color-green mr-1"></i> Во-Банк Онлайн</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                
                <div class="grid-4 mb-2">
                    <button onclick="PhoneManager.switchBankSubTab('accounts')" class="btn ${sub === 'accounts' ? 'btn-green' : 'btn-dark'} btn-sm">Счета</button>
                    <button onclick="PhoneManager.switchBankSubTab('deposits')" class="btn ${sub === 'deposits' ? 'btn-green' : 'btn-dark'} btn-sm">Вклады</button>
                    <button onclick="PhoneManager.switchBankSubTab('credit')" class="btn ${sub === 'credit' ? 'btn-green' : 'btn-dark'} btn-sm">Кредит</button>
                    <button onclick="PhoneManager.switchBankSubTab('history')" class="btn ${sub === 'history' ? 'btn-green' : 'btn-dark'} btn-sm">Выписка</button>
                </div>

                ${sub === 'accounts' ? `
                    <div class="glass-card mb-2 p-2">
                        <div class="flex-between mb-1">
                            <span class="sub-label text-xs">Текущий счет перекупа:</span>
                            <span class="tag-badge bg-tag-green">Основной</span>
                        </div>
                        <div class="price-val color-green mb-2">${cash.toLocaleString()} ₽</div>
                        
                        <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid var(--border-glass);">
                            <div class="flex-between">
                                <div>
                                    <div class="text-xs font-bold color-amber"><i class="fa-solid fa-lock"></i> Неприкосновенный Сейф</div>
                                    <div class="sub-label" style="font-size:9px;">Начисление +3% в полночь | Защита от рэкета</div>
                                </div>
                                <b class="color-amber text-xs">${safe.toLocaleString()} ₽</b>
                            </div>
                        </div>

                        <div class="grid-2 mb-2">
                            <button onclick="depositToSafeAction(50000); PhoneManager.renderOpenApp();" class="btn btn-dark btn-sm">+50k в сейф</button>
                            <button onclick="depositToSafeAction(200000); PhoneManager.renderOpenApp();" class="btn btn-dark btn-sm">+200k в сейф</button>
                        </div>
                        <button onclick="withdrawFromSafeAction(); PhoneManager.renderOpenApp();" class="btn btn-green btn-sm w-full">Забрать всё из сейфа</button>
                    </div>
                ` : ''}

                ${sub === 'deposits' ? `
                    <div class="glass-card mb-2 p-2">
                        <b class="text-xs color-green mb-1 block">📈 Срочные депозиты с повышенной ставкой:</b>
                        <div class="grid-2 mb-2">
                            <button onclick="openBankDepositAction(100000, 7, 0.025); PhoneManager.renderOpenApp();" class="btn btn-cyan btn-sm">100k под 2.5%/д</button>
                            <button onclick="openBankDepositAction(500000, 14, 0.035); PhoneManager.renderOpenApp();" class="btn btn-green btn-sm">500k под 3.5%/д</button>
                        </div>
                        <div class="text-xs font-bold mb-1">Активные депозиты:</div>
                        ${depositsListHtml}
                    </div>
                ` : ''}

                ${sub === 'credit' ? `
                    <div class="glass-card mb-2 p-2">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-red"><i class="fa-solid fa-handholding-dollar"></i> Кредитная линия перекупа</b>
                            <span class="sub-label text-xs">Долг: <b class="color-amber">${debt.toLocaleString()} ₽</b></span>
                        </div>
                        <div class="grid-2 mb-2">
                            <button onclick="takeLoan(100000); PhoneManager.renderOpenApp();" class="btn btn-dark btn-sm">Взять 100k</button>
                            <button onclick="takeLoan(500000); PhoneManager.renderOpenApp();" class="btn btn-dark btn-sm">Взять 500k</button>
                        </div>
                        <div class="grid-3">
                            <button onclick="repayLoan(25); PhoneManager.renderOpenApp();" class="btn btn-cyan btn-sm">25%</button>
                            <button onclick="repayLoan(50); PhoneManager.renderOpenApp();" class="btn btn-cyan btn-sm">50%</button>
                            <button onclick="repayLoan(100); PhoneManager.renderOpenApp();" class="btn btn-green btn-sm">Всё</button>
                        </div>
                    </div>
                ` : ''}

                ${sub === 'history' ? `
                    <div class="glass-card mb-2 p-2">
                        <b class="text-xs color-cyan mb-2 block">📋 Последние транзакции по счетам:</b>
                        <div class="space-y-1" style="max-height: 220px; overflow-y: auto;">
                            ${historyHtml}
                        </div>
                    </div>
                ` : ''}

            </div>
        `;
    },

    switchBankSubTab(tab) {
        playSound('tick');
        tgHaptic('light');
        this.bankSubTab = tab;
        this.renderOpenApp();
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
                            <button onclick="refreshContractsManual()" class="btn btn-dark btn-auto btn-sm">Обновить (15k)</button>
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
                        <button onclick="refreshBlackMarketPlates()" class="btn btn-dark btn-sm w-full mb-2">Обновить (25k ₽)</button>
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

    renderRadarApp(container) {
        let immunity = state.player?.policeImmunityDays || 0;
        let races = state.player?.consecutiveRaces || 0;
        let maxRaces = state.player?.maxRacesBeforeRaid || 12;

        let statusText = immunity > 0 
            ? `<span class="color-green font-bold">Иммунитет (${immunity} дн.)</span>` 
            : `<span class="color-amber font-bold">Рейды активны</span>`;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-tower-broadcast color-red mr-1"></i> ДПС Радар</div>
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
                    <p class="sub-label mb-2" style="font-size:10px;">При превышении лимита экипаж ДПС устраивает облаву и конфискует корч на штрафстоянку!</p>
                    <button onclick="PhoneManager.openApp('reshala')" class="btn btn-purple btn-sm w-full">Купить крышу у Решалы</button>
                </div>
            </div>
        `;
    }
};

window.PhoneManager = PhoneManager;
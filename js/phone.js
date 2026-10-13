// ========================================================
// js/phone.js — ОПЕРАЦИОННАЯ СИСТЕМА PEREKUP OS (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Полный комплект встроенных экранов:
// 1. «M & P2P» (Единый объединённый хаб)
// 2. Во-Банк    3. Бизнес      4. Жильё
// 5. Решала     6. ПодКлюч    7. САРАИ       8. Порт
// 9. ДПС Радар  10. Стрит     11. Маркет     12. Фортуна
// 13. ПОЧТА/СКЛАД 14. Госуслуги 15. Магнитола 16. Блокнот 17. DEV (3172)
// ========================================================

const PhoneManager = {
    currentApp: null,
    _clockInterval: null,

    init() {
        this.updateClock();
        if (this._clockInterval) clearInterval(this._clockInterval);
        this._clockInterval = setInterval(() => this.updateClock(), 1000);

        this.renderDailyQuestsWidget();
        this.renderBusinessWidget();
        this.updateUnreadBadge();
    },

    updateClock() {
        const clockEl = document.getElementById('phoneStatusBarClock');
        if (!clockEl) return;
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        clockEl.innerText = `${hours}:${minutes}`;
    },

    updateUnreadBadge() {
        const smsBadge = document.getElementById('phoneAppSmsBadge');
        const postBadge = document.getElementById('phoneAppPostBadge');
        const navBadge = document.getElementById('phoneNavBadge');
        let unreadCount = 0;

        if (state.player && Array.isArray(state.player.phoneMessages)) {
            unreadCount = state.player.phoneMessages.filter(m => m && m.unread).length;
        }

        let unreadMail = 0;
        if (state.player && Array.isArray(state.player.mailbox)) {
            unreadMail = state.player.mailbox.filter(m => m && !m.claimed).length;
        }

        if (smsBadge) {
            smsBadge.style.display = unreadCount > 0 ? 'block' : 'none';
            smsBadge.innerText = unreadCount;
        }

        if (postBadge) {
            postBadge.style.display = unreadMail > 0 ? 'block' : 'none';
            postBadge.innerText = unreadMail;
        }

        let total = unreadCount + unreadMail;
        if (navBadge) {
            navBadge.style.display = total > 0 ? 'inline-block' : 'none';
            navBadge.innerText = total;
        }
    },

    openApp(appId) {
        const homeScreen = document.getElementById('phoneHomeScreen');
        const appContainer = document.getElementById('phoneAppContainer');
        if (!appContainer) return;

        this.currentApp = appId;

        if (homeScreen) {
            homeScreen.style.setProperty('display', 'none', 'important');
        }
        appContainer.style.setProperty('display', 'flex', 'important');
        appContainer.innerHTML = '';

        // Единый объединённый сетевой P2P-хаб: Autodrot + M
        if (appId === 'messages' || appId === 'm' || appId === 'autodrot') {
            if (window.AppM && typeof window.AppM.render === 'function') {
                if (appId === 'autodrot') {
                    window.AppM.activeTab = 'market';
                }
                window.AppM.render(appContainer);
            } else {
                this.renderGenericFallback(appId, appContainer);
            }
            this.afterAppOpened();
            return;
        }

        // Приложение «Почта & Склад»
        if (appId === 'post' || appId === 'mailbox' || appId === 'warehouse') {
            if (window.AppPost && typeof window.AppPost.render === 'function') {
                window.AppPost.render(appContainer);
                this.afterAppOpened();
                return;
            }
        }

        if (appId === 'shop') {
            AppShop.render(appContainer);
            this.afterAppOpened();
            return;
        }

        if (appId === 'barn') {
            AppBarn.render(appContainer);
            this.afterAppOpened();
            return;
        }

        if (appId === 'notepad') {
            AppNotepad.render(appContainer);
            this.afterAppOpened();
            return;
        }

        const externalModule = this.getExternalModule(appId);
        if (externalModule && typeof externalModule.render === 'function') {
            try {
                externalModule.render(appContainer);
                this.afterAppOpened();
                return;
            } catch(e) {
                console.warn(`[Phone] Сбой модуля ${appId}, откат:`, e);
            }
        }

        switch (appId) {
            case 'dev':
                if (window.AppDev && typeof window.AppDev.render === 'function') {
                    window.AppDev.render(appContainer);
                } else {
                    this.renderGenericFallback(appId, appContainer);
                }
                break;
            case 'fortune':
                if (window.PhoneMedia && typeof window.PhoneMedia.renderFortuneApp === 'function') {
                    window.PhoneMedia.renderFortuneApp(appContainer);
                } else {
                    this.renderFortuneApp(appContainer);
                }
                break;
            case 'reshala':
                if (window.AppDarknet && typeof window.AppDarknet.render === 'function') {
                    window.AppDarknet.render(appContainer);
                } else {
                    this.renderReshalaApp(appContainer);
                }
                break;
            case 'street':
                if (window.PhoneRacing && typeof window.PhoneRacing.renderStreetApp === 'function') {
                    window.PhoneRacing.renderStreetApp(appContainer);
                } else {
                    this.renderStreetApp(appContainer);
                }
                break;
            case 'radio':
                if (window.PhoneMedia && typeof window.PhoneMedia.renderRadioApp === 'function') {
                    window.PhoneMedia.renderRadioApp(appContainer);
                } else {
                    this.renderRadioApp(appContainer);
                }
                break;
            case 'bank':
                if (window.AppBank && typeof window.AppBank.render === 'function') {
                    window.AppBank.render(appContainer);
                } else {
                    this.renderBankApp(appContainer);
                }
                break;
            case 'business':
                if (window.AppBusiness && typeof window.AppBusiness.render === 'function') {
                    window.AppBusiness.render(appContainer);
                } else {
                    this.renderBusinessApp(appContainer);
                }
                break;
            case 'housing':
                if (window.PhoneHousing && typeof window.PhoneHousing.renderHousingApp === 'function') {
                    window.PhoneHousing.renderHousingApp(appContainer);
                } else if (window.AppHousing && typeof window.AppHousing.render === 'function') {
                    window.AppHousing.render(appContainer);
                } else {
                    this.renderHousingApp(appContainer);
                }
                break;
            case 'syndicate':
                if (window.AppSyndicate && typeof window.AppSyndicate.render === 'function') {
                    window.AppSyndicate.render(appContainer);
                } else {
                    this.renderSyndicateApp(appContainer);
                }
                break;
            case 'containers':
                if (window.AppPort && typeof window.AppPort.render === 'function') {
                    window.AppPort.render(appContainer);
                } else {
                    this.renderContainersApp(appContainer);
                }
                break;
            case 'radar':
                if (window.AppRadar && typeof window.AppRadar.render === 'function') {
                    window.AppRadar.render(appContainer);
                } else {
                    this.renderRadarApp(appContainer);
                }
                break;
            case 'gosuslugi':
                if (window.AppGosuslugi && typeof window.AppGosuslugi.render === 'function') {
                    window.AppGosuslugi.render(appContainer);
                } else {
                    this.renderGosuslugiApp(appContainer);
                }
                break;
            default:
                this.renderGenericFallback(appId, appContainer);
        }

        this.afterAppOpened();
    },

    getExternalModule(appId) {
        const registry = {
            dev: window.AppDev,
            bank: window.AppBank,
            autodrot: window.AppM,
            business: window.AppBusiness,
            housing: window.PhoneHousing || window.AppHousing,
            reshala: window.AppDarknet,
            syndicate: window.AppSyndicate || window.AppPodklyuch,
            barn: window.AppBarn,
            containers: window.AppPort,
            radar: window.AppRadar,
            street: window.PhoneRacing,
            fortune: window.PhoneMedia,
            messages: window.AppM,
            m: window.AppM,
            gosuslugi: window.AppGosuslugi,
            radio: window.PhoneMedia,
            notepad: window.AppNotepad,
            post: window.AppPost
        };
        return registry[appId] || null;
    },

    afterAppOpened() {
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
    },

    goHome() {
        this.currentApp = null;
        const homeScreen = document.getElementById('phoneHomeScreen');
        const appContainer = document.getElementById('phoneAppContainer');

        if (appContainer) {
            appContainer.style.setProperty('display', 'none', 'important');
            appContainer.innerHTML = '';
        }
        if (homeScreen) {
            homeScreen.style.setProperty('display', 'block', 'important');
        }

        this.renderDailyQuestsWidget();
        this.renderBusinessWidget();
        this.updateUnreadBadge();

        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
    },

    renderPhoneScreen() {
        if (!this.currentApp) {
            this.goHome();
        } else {
            this.openApp(this.currentApp);
        }
    },

    renderFortuneApp(container) {
        if (window.PhoneMedia && typeof window.PhoneMedia.renderFortuneApp === 'function') {
            window.PhoneMedia.renderFortuneApp(container);
        }
    },

    renderReshalaApp(container) {
        let conn = state.player?.connections || 0;
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-purple"><i class="fa-solid fa-user-secret mr-1"></i> РЕШАЛА АРТУР</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-3 mb-2">
                    <b class="text-xs color-purple block mb-1">Связи: ${conn} 🤝</b>
                    <div class="sub-label">Услуги урегулирования споров и отмыва документов.</div>
                </div>
            </div>
        `;
    },

    renderStreetApp(container) {
        if (window.PhoneRacing && typeof window.PhoneRacing.renderStreetApp === 'function') {
            window.PhoneRacing.renderStreetApp(container);
        }
    },

    renderRadioApp(container) {
        if (window.PhoneMedia && typeof window.PhoneMedia.renderRadioApp === 'function') {
            window.PhoneMedia.renderRadioApp(container);
        }
    },

    renderBankApp(container) {
        if (window.AppBank && typeof window.AppBank.render === 'function') {
            window.AppBank.render(container);
        }
    },

    renderBusinessApp(container) {
        if (window.AppBusiness && typeof window.AppBusiness.render === 'function') {
            window.AppBusiness.render(container);
        }
    },

    renderHousingApp(container) {
        if (window.PhoneHousing && typeof window.PhoneHousing.renderHousingApp === 'function') {
            window.PhoneHousing.renderHousingApp(container);
        } else if (window.AppHousing && typeof window.AppHousing.render === 'function') {
            window.AppHousing.render(container);
        }
    },

    renderSyndicateApp(container) {
        if (window.AppSyndicate && typeof window.AppSyndicate.render === 'function') {
            window.AppSyndicate.render(container);
        }
    },

    renderContainersApp(container) {
        if (window.AppPort && typeof window.AppPort.render === 'function') {
            window.AppPort.render(container);
        }
    },

    renderRadarApp(container) {
        if (window.AppRadar && typeof window.AppRadar.render === 'function') {
            window.AppRadar.render(container);
        }
    },

    renderGosuslugiApp(container) {
        if (window.AppGosuslugi && typeof window.AppGosuslugi.render === 'function') {
            window.AppGosuslugi.render(container);
        }
    },

    renderGenericFallback(appId, container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title">${appId.toUpperCase()}</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body text-center p-4">
                <div class="glass-card p-3">
                    <b class="text-xs">Приложение «${appId}» готово к работе</b>
                    <button onclick="PhoneManager.openApp('${appId}')" class="btn btn-cyan btn-sm mt-2">Перезапустить</button>
                </div>
            </div>
        `;
    },

    toggleQuestsWidgetCollapse() {
        if (!state.player) return;
        if (!state.player.phoneWidgetsCollapsed) state.player.phoneWidgetsCollapsed = {};
        state.player.phoneWidgetsCollapsed.quests = !state.player.phoneWidgetsCollapsed.quests;
        if (typeof saveState === 'function') saveState();
        this.renderDailyQuestsWidget();
        if (typeof playSound === 'function') playSound('tick');
    },

    renderDailyQuestsWidget() {
        const box = document.getElementById('phoneDailyQuestsWidget');
        if (!box) return;

        const isCollapsed = !!(state.player?.phoneWidgetsCollapsed?.quests);
        const quests = state.player?.dailyQuests || [];
        const completedCount = quests.filter(q => q && (q.done || (q.cur >= (q.max || 1)))).length;

        let itemsHtml = "";
        if (!isCollapsed) {
            quests.forEach((q, idx) => {
                if (!q) return;
                const isFinished = q.done;
                const canClaim = !q.done && (q.cur >= (q.max || 1));
                const progressPct = Math.min(100, Math.round(((q.cur || 0) / (q.max || 1)) * 100));

                let actionBtn = "";
                if (isFinished) {
                    actionBtn = `<span class="quest-done-badge">Выполнено ✓</span>`;
                } else if (canClaim) {
                    actionBtn = `<button onclick="PhoneManager.claimQuestReward(${idx})" class="quest-claim-btn">+${q.reward.toLocaleString()} ₽</button>`;
                } else {
                    actionBtn = `<span class="sub-label font-bold" style="font-size:10px;">${q.cur || 0}/${q.max || 1}</span>`;
                }

                itemsHtml += `
                    <div class="quest-card-item ${isFinished ? 'quest-completed' : ''}">
                        <div class="quest-card-info">
                            <div class="quest-card-title">${q.text}</div>
                            <div class="quest-card-sub">
                                <div class="quest-progress-track">
                                    <div class="quest-progress-bar" style="width:${progressPct}%;"></div>
                                </div>
                                <span class="sub-label" style="font-size:8.5px;">+${q.reward.toLocaleString()} ₽</span>
                            </div>
                        </div>
                        ${actionBtn}
                    </div>
                `;
            });
        }

        box.innerHTML = `
            <div class="quest-widget-header">
                <div class="flex-gap" style="align-items:center;">
                    <i class="fa-solid fa-list-check color-cyan"></i>
                    <b class="text-xs color-cyan">Задания дня</b>
                    <span class="tag-badge ${completedCount === quests.length ? 'bg-tag-green' : 'bg-tag-cyan'}" style="font-size:8px;">${completedCount}/${quests.length}</span>
                </div>
                <button onclick="PhoneManager.toggleQuestsWidgetCollapse()" class="btn btn-dark btn-auto btn-sm" style="padding:2px 6px; font-size:9px;">
                    <i class="fa-solid ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                </button>
            </div>
            ${itemsHtml}
        `;
    },

    claimQuestReward(idx) {
        const quests = state.player?.dailyQuests || [];
        const q = quests[idx];
        if (!q || q.done || (q.cur < q.max)) return;

        q.done = true;
        state.player.cash = (state.player.cash || 0) + q.reward;
        if (typeof addXp === 'function') addXp(q.rewardXp || 35);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast(`Награда получена: +${q.reward.toLocaleString()} ₽!`);

        this.renderDailyQuestsWidget();
    },

    renderBusinessWidget() {
        const box = document.getElementById('phoneBizWidgetContainer');
        if (!box) return;

        const ownedBusinesses = (state.businesses || []).filter(b => b && b.level > 0);
        if (ownedBusinesses.length === 0) {
            box.style.display = 'none';
            return;
        }

        let totalDailyIncome = 0;
        let totalStoredCash = 0;
        ownedBusinesses.forEach(b => {
            totalDailyIncome += (b.income || 0) * b.level;
            totalStoredCash += (b.stored || 0);
        });

        box.style.display = 'block';
        box.innerHTML = `
            <div class="phone-biz-widget">
                <div class="flex-between mb-1">
                    <div class="flex-gap" style="align-items:center;">
                        <div class="widget-icon-bubble"><i class="fa-solid fa-briefcase color-green"></i></div>
                        <div>
                            <div class="widget-title">Касса предприятий</div>
                            <div class="sub-label" style="font-size:8.5px;">Точек в сети: <b>${ownedBusinesses.length} шт.</b></div>
                        </div>
                    </div>
                    <span class="tag-badge bg-tag-green">+${totalDailyIncome.toLocaleString()} ₽/день</span>
                </div>

                <div class="widget-metrics-row">
                    <div>
                        <span class="sub-label" style="font-size:9px;">Накоплено в кассах:</span>
                        <div class="price-val color-green" style="font-size:14px;">${totalStoredCash.toLocaleString()} ₽</div>
                    </div>
                    <button onclick="PhoneManager.collectAllBusinessCash()" class="btn btn-green btn-sm btn-auto" ${totalStoredCash <= 0 ? 'disabled' : ''}>
                        Снять кассу
                    </button>
                </div>
            </div>
        `;
    },

    collectAllBusinessCash() {
        let total = 0;
        (state.businesses || []).forEach(b => {
            if (b && b.stored && b.stored > 0) {
                total += b.stored;
                b.stored = 0;
            }
        });

        if (total <= 0) return;

        state.player.cash = (state.player.cash || 0) + total;
        if (typeof trackQuestProgress === 'function') trackQuestProgress('collect_biz', 1);
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`Собрана выручка: +${total.toLocaleString()} ₽!`);

        this.renderBusinessWidget();
    }
};

// ========================================================
// ВСТРОЕННЫЙ МОДУЛЬ «НАХОДКИ В САРАЯХ» (AppBarn)
// ========================================================
const DEFAULT_BARN_TIERS = [
    { 
        tier: 1, reqLvl: 1, cost: 35000, reqStars: 2, title: "🏚️ Сарай в СНТ «Заря»", 
        desc: "Дачный кооператив. Старый деревянный сарай среди яблонь. Советская классика и архивные номера.", 
        classGrade: "barn-grade-1", rareIdx: 0,
        img: "assets/barns/barn_tier1.jpg",
        fallback: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80"
    },
    { 
        tier: 2, reqLvl: 7, cost: 120000, reqStars: 5, title: "🏢 Заброшенный бокс ГСК-4", 
        desc: "Кооператив возле промзоны. Ржавые ворота, сухой бетон. Янгтаймеры и советский инструмент.", 
        classGrade: "barn-grade-2", rareIdx: 1,
        img: "assets/barns/barn_tier2.jpg",
        fallback: "https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?auto=format&fit=crop&w=600&q=80"
    },
    { 
        tier: 3, reqLvl: 15, cost: 350000, reqStars: 10, title: "🏭 Ангар механического завода", 
        desc: "Закрытый цех советского завода. Высокие потолки, пыльные чехлы и JDM легенды 90-х.", 
        classGrade: "barn-grade-3", rareIdx: 2,
        img: "assets/barns/barn_tier3.jpg",
        fallback: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80"
    },
    { 
        tier: 4, reqLvl: 25, cost: 850000, reqStars: 20, title: "🏛️ Коллекционный бункер", 
        desc: "Опечатанный подземный паркинг банка. Раритетные спорткары, редчайшие госномера и джекпоты!", 
        classGrade: "barn-grade-4", rareIdx: 4,
        img: "assets/barns/barn_tier4.jpg",
        fallback: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80"
    }
];

const DEFAULT_BARN_FINDS = [
    { name: "ВАЗ-2101 «Копейка» (Дрифт-Спек)", power: 160, type: 'economy', basePrice: 850000, marketValue: 1250000, img: "assets/cars/economy/2101/vaz-2101_drift.jpg", fallback: "assets/cars/economy/2101/vaz-2101.jpg" },
    { name: "BMW E30 Coupe", power: 170, type: 'comfort', basePrice: 650000, marketValue: 1300000, img: "assets/cars/barn/e30.jpg", fallback: "assets/cars/comfort/polo/polo.jpg" },
    { name: "Nissan Silvia S13", power: 200, type: 'comfort', basePrice: 900000, marketValue: 1800000, img: "assets/cars/barn/silvia.jpg", fallback: "assets/cars/comfort/octavia/octavia.jpg" },
    { name: "VW Golf VI GTI (Stage 2 Project)", power: 280, type: 'comfort', basePrice: 1100000, marketValue: 1900000, img: "assets/cars/comfort/golf6/golf6.jpg", fallback: "assets/cars/comfort/golf6/golf6.jpg" },
    { name: "ГАЗ-24 «Волга» V8", power: 220, type: 'economy', basePrice: 700000, marketValue: 1500000, img: "assets/cars/barn/volga24.jpg", fallback: "assets/cars/economy/volga/volga.jpg" },
    { name: "Nissan Skyline GT-R R34 (В пыли)", power: 280, type: 'premium', basePrice: 4500000, marketValue: 9500000, img: "assets/cars/barn/r34.jpg", fallback: "assets/cars/premium/g20/g20.jpg" },
    { name: "Toyota Supra A80 (Без мотора)", power: 0, type: 'premium', basePrice: 3200000, marketValue: 7000000, img: "assets/cars/barn/supra.jpg", fallback: "assets/cars/premium/g30/g30.jpg" }
];

const AppBarn = {
    render(container) {
        if (!container) return;

        let pLvl = state.player?.level || 1;
        let lastDay = state.player?.lastBarnDay || 0;
        let curDay = state.player?.day || 1;
        let canSearchToday = lastDay < curDay;

        let statusText = canSearchToday 
            ? "<span class='tag-badge bg-tag-green'>ДОСТУПНО СЕЙЧАС ✓</span>" 
            : "<span class='tag-badge bg-tag-amber'>1 РАЗ В СУТКИ ⏳</span>";

        let tiersHtml = "";
        const barnTiers = (typeof BARN_TIERS_CONFIG !== 'undefined' && Array.isArray(BARN_TIERS_CONFIG) && BARN_TIERS_CONFIG.length > 0) 
            ? BARN_TIERS_CONFIG 
            : DEFAULT_BARN_TIERS;

        barnTiers.forEach(tier => {
            let isLvlLocked = pLvl < tier.reqLvl;
            let starsTxt = tier.reqStars ? ` + ${tier.reqStars} ⭐` : "";
            
            let btnClass = "btn btn-amber btn-sm w-full";
            let btnText = `Взломать и обыскать (${(tier.cost / 1000).toFixed(0)}k ₽${starsTxt})`;

            if (isLvlLocked) {
                btnClass = "btn btn-dark btn-sm w-full opacity-50";
                btnText = `🔒 С ${tier.reqLvl} уровня`;
            } else if (!canSearchToday) {
                btnClass = "btn btn-dark btn-sm w-full opacity-50";
                btnText = "Обыскано сегодня (ждём полночи)";
            }

            let imgSrc = tier.img || 'assets/barns/barn_tier1.jpg';
            let fallbackSrc = tier.fallback || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80';

            tiersHtml += `
                <div class="glass-card mb-3 p-2" style="border-color: ${isLvlLocked ? 'rgba(255,255,255,0.06)' : 'rgba(255,179,0,0.35)'};">
                    <div class="car-img-wrap mb-2" style="height:125px; position:relative;">
                        <img src="${imgSrc}" class="car-img" onerror="this.onerror=null; this.src='${fallbackSrc}';">
                        <div class="badge-tag badge-br">
                            <span class="tag-badge bg-tag-amber">Ярус ${tier.tier}</span>
                        </div>
                    </div>

                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber" style="font-size:12.5px;">${tier.title}</b>
                        <span class="price-val text-xs color-green">${tier.cost.toLocaleString()} ₽${starsTxt}</span>
                    </div>

                    <p class="sub-label mb-2" style="font-size:9.5px; line-height:1.35;">${tier.desc}</p>

                    <button onclick="AppBarn.searchBarnAction(${tier.tier})" class="${btnClass}" ${isLvlLocked || !canSearchToday ? 'disabled' : ''}>
                        ${btnText}
                    </button>
                </div>
            `;
        });

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-amber"><i class="fa-solid fa-warehouse mr-1"></i> Находки в сараях</div>
                <div style="width:40px;"></div>
            </div>
            
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(255, 179, 0, 0.16), #090e18); border-color: var(--amber);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber"><i class="fa-solid fa-map-location-dot"></i> Разведка заброшек</b>
                        ${statusText}
                    </div>
                    <div class="sub-label" style="font-size:9.5px;">
                        Опечатанные кооперативы и закрытые цеха. Шанс вытащить раритетную капсулу времени, JDM янгтаймер или архивный госномер СССР!
                    </div>
                </div>

                <div class="space-y-1">
                    ${tiersHtml}
                </div>
            </div>
        `;
    },

    searchBarnAction(tierIndex) {
        const barnTiers = (typeof BARN_TIERS_CONFIG !== 'undefined' && Array.isArray(BARN_TIERS_CONFIG) && BARN_TIERS_CONFIG.length > 0) 
            ? BARN_TIERS_CONFIG 
            : DEFAULT_BARN_TIERS;

        const tier = barnTiers.find(t => t.tier === tierIndex) || barnTiers[0];
        if (!tier) return;

        let pLvl = state.player?.level || 1;
        if (pLvl < tier.reqLvl) {
            return showToast(`Этот ярус открывается с ${tier.reqLvl} уровня!`);
        }

        let lastDay = state.player?.lastBarnDay || 0;
        let curDay = state.player?.day || 1;
        if (lastDay >= curDay) {
            return showToast("Вы уже проводили разведку сараев сегодня! Возвращайтесь завтра.");
        }

        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;
        let reqStars = tier.reqStars || 0;

        if (cash < tier.cost) return showToast("Не хватает рублей на вскрытие сарая!");
        if (stars < reqStars) return showToast(`Нужно ${reqStars} Stars ⭐!`);

        state.player.cash -= tier.cost;
        state.player.stars -= reqStars;
        state.player.lastBarnDay = curDay;

        let roll = Math.random();
        const findsPool = (typeof BARN_FINDS !== 'undefined' && Array.isArray(BARN_FINDS) && BARN_FINDS.length > 0)
            ? BARN_FINDS
            : DEFAULT_BARN_FINDS;

        if (roll < 0.35 && findsPool.length > 0) {
            let maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
            let curSlots = state.garage ? state.garage.length : 0;

            const carTemplate = findsPool[Math.floor(Math.random() * findsPool.length)];
            let wonPlate = (typeof generateCoolPlate === 'function') ? generateCoolPlate() : "В777ВВ 77";
            let marketVal = carTemplate.marketValue || Math.round(tier.cost * 2.2);

            let wonCar = {
                id: "barn_car_" + Date.now(),
                name: carTemplate.name,
                type: carTemplate.type || 'economy',
                power: carTemplate.power || 120,
                basePrice: carTemplate.basePrice || 250000,
                price: carTemplate.basePrice || 250000,
                baseMarketValue: marketVal,
                marketValue: marketVal,
                img: carTemplate.img || "assets/cars/economy/2101/vaz-2101.jpg",
                fallback: carTemplate.fallback || (typeof getCategoryFallback === 'function' ? getCategoryFallback(carTemplate.type) : "assets/cars/economy/2101/vaz-2101.jpg"),
                plate: wonPlate,
                customPlate: wonPlate,
                condition: Math.floor(65 + Math.random() * 25),
                wear: { engine: 75, transmission: 80 },
                isRegisteredOnPlayer: false,
                ownershipDays: 0,
                engineTemp: 90,
                tireWear: 85,
                purchaseCost: tier.cost,
                tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 }
            };

            if (typeof recalculateCarMarketValue === 'function') {
                recalculateCarMarketValue(wonCar);
            }

            if (typeof window.pushToMailbox === 'function') {
                window.pushToMailbox({
                    type: "car",
                    title: `Капсула времени: ${wonCar.name}`,
                    sender: `Служба эвакуации (${tier.title})`,
                    desc: `Автомобиль успешно извлечён из заброшенного бокса! Госномер: ${wonPlate}. Выберите место размещения: гараж или склад консервации.`,
                    badge: "САРАЙ",
                    carData: wonCar
                });
            } else {
                if (curSlots < maxSlots) {
                    if (!state.garage) state.garage = [];
                    state.garage.push(wonCar);
                } else {
                    let comp = Math.round(wonCar.marketValue * 0.9);
                    state.player.cash += comp;
                }
            }

            let gainedXp = 120;
            if (typeof addXp === 'function') addXp(gainedXp);

            saveState();
            updateHeaderUI();
            if (typeof renderGarage === 'function') renderGarage();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

            openVerdictModal(
                "ЛЕГЕНДАРНАЯ НАХОДКА В САРАЕ! 🏚️",
                `Найден редкий автомобиль <b>${wonCar.name}</b> (отправлен в Почту)!\nОпыт авторитета: +${gainedXp} XP`,
                true
            );
        } else if (roll < 0.60) {
            let coolPlate = (typeof generateCoolPlate === 'function') ? generateCoolPlate() : "А001МР 77";
            let plateVal = (typeof calculatePlateValue === 'function') ? calculatePlateValue(coolPlate) : 75000;

            if (typeof window.pushToMailbox === 'function') {
                window.pushToMailbox({
                    type: "plate",
                    title: `Архивный знак: ${coolPlate}`,
                    sender: "Разведка заброшек",
                    desc: `На стене гаража обнаружен советский госномер! Оценка знака: ~${plateVal.toLocaleString()} ₽.`,
                    badge: "НОМЕР",
                    plate: coolPlate
                });
            } else {
                if (!state.ownedPlates) state.ownedPlates = [];
                state.ownedPlates.push(coolPlate);
            }

            let bonusCash = Math.round(tier.cost * 0.6);
            state.player.cash += bonusCash;
            let gainedXp = 60;
            if (typeof addXp === 'function') addXp(gainedXp);

            saveState();
            updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

            openVerdictModal(
                "АРХИВНЫЙ ГОСНОМЕР НАЙДЕН! 🏷️",
                `На стене бокса обнаружен редкий номер: <b>${coolPlate}</b>!<br>Рыночная стоимость знака: ~${plateVal.toLocaleString()} ₽.<br>Дополнительно найдена заначка: +${bonusCash.toLocaleString()} ₽ (+${gainedXp} XP).`,
                true,
                bonusCash
            );
        } else if (roll < 0.85) {
            let winCash = Math.round(tier.cost * (1.35 + Math.random() * 0.45));
            let gainedXp = 50;
            state.player.cash += winCash;
            if (typeof addXp === 'function') addXp(gainedXp);

            if (state.businesses) {
                state.businesses.forEach(b => {
                    if (b && b.level > 0) b.stock = Math.min(b.maxStock || 100, (b.stock || 0) + 20);
                });
            }

            saveState();
            updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

            openVerdictModal(
                "СОВЕТСКИЙ ИНСТРУМЕНТ И З/Ч! 🔩",
                `В ящиках найдены советские верстачные тиски, наборы головок и запчасти!<br>Выручка со скупки: +${winCash.toLocaleString()} ₽ (+${gainedXp} XP).<br>Склады предприятий пополнены сырьем (+20%).`,
                true,
                winCash
            );
        } else {
            let gainedXp = 25;
            if (typeof addXp === 'function') addXp(gainedXp);
            saveState();
            updateHeaderUI();
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('error');

            openVerdictModal(
                "ПУСТОЙ САРАЙ 💨",
                `Внутри оказались лишь ржавые трубы и пустые банки. Ничего ценного не найдено.<br>Получено +${gainedXp} XP за разведку.`,
                false
            );
        }

        this.render(document.getElementById('phoneAppContainer'));
    }
};

// ========================================================
// АВТОНОМНЫЙ АВТО-МАРКЕТ (AppShop)
// ========================================================
const AppShop = {
    activeCategory: 'tools',

    render(container) {
        if (!container) return;
        let sub = this.activeCategory || 'tools';

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-orange"><i class="fa-solid fa-cart-shopping mr-1"></i> Авто-Маркет</div>
                <div style="width:40px;"></div>
            </div>
            
            <div class="phone-app-body">
                <div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 3px;">
                    <button onclick="AppShop.switchCategory('tools')" class="btn ${sub === 'tools' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">
                        <i class="fa-solid fa-microchip"></i> Приборы
                    </button>
                    <button onclick="AppShop.switchCategory('consumables')" class="btn ${sub === 'consumables' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">
                        <i class="fa-solid fa-oil-can"></i> Сырьё
                    </button>
                    <button onclick="AppShop.switchCategory('tuningParts')" class="btn ${sub === 'tuningParts' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">
                        <i class="fa-solid fa-id-card"></i> Документы
                    </button>
                    <button onclick="AppShop.switchCategory('homeItems')" class="btn ${sub === 'homeItems' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">
                        <i class="fa-solid fa-couch"></i> Бокс/Дом
                    </button>
                </div>

                <div id="shopItemsContainer"></div>
            </div>
        `;

        this.renderCategoryItems();
    },

    switchCategory(cat) {
        this.activeCategory = cat;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.render(document.getElementById('phoneAppContainer'));
    },

    renderCategoryItems() {
        const box = document.getElementById('shopItemsContainer');
        if (!box) return;

        const catalog = (typeof SHOP_CATALOG !== 'undefined') ? SHOP_CATALOG : {};
        const cat = this.activeCategory;
        let html = "";

        if (cat === 'tools') {
            const tools = catalog.tools || [];
            html += `
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.14), #090e18); border-color: var(--cyan);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-laptop-code"></i> Оборудование эксперта</b>
                        <span class="tag-badge bg-tag-cyan">Точность 100%</span>
                    </div>
                    <div class="sub-label" style="font-size:9.5px;">Без толщиномера и сканера OBD2 проверки у капота и спецзаказы ПодКлюч заблокированы.</div>
                </div>
            `;

            tools.forEach(t => {
                let isOwned = !!(state.player.tools && state.player.tools[t.id]);
                let wear = (state.player.toolsWear && state.player.toolsWear[t.id] !== undefined) 
                    ? state.player.toolsWear[t.id] 
                    : (t.maxUses || 50);
                let maxUses = t.maxUses || 50;
                let starsTxt = t.reqStars ? ` + ${t.reqStars} ⭐` : "";

                let actionBlock = "";
                if (!isOwned) {
                    actionBlock = `<button onclick="AppShop.buyToolAction('${t.id}', ${t.cost}, ${t.reqStars || 0})" class="btn btn-cyan btn-sm btn-auto">${t.cost.toLocaleString()} ₽${starsTxt}</button>`;
                } else {
                    let wearClass = wear < 15 ? "color-red" : "color-green";
                    actionBlock = `
                        <div style="text-align:right;">
                            <div class="sub-label mb-1" style="font-size:9px;">Ресурс: <b class="${wearClass}">${wear}/${maxUses}</b></div>
                            <button onclick="AppShop.calibrateToolAction('${t.id}', ${t.serviceCost || 3500})" class="btn btn-dark btn-sm btn-auto" ${wear >= maxUses ? 'disabled' : ''}>
                                Калибровка (${(t.serviceCost || 3500).toLocaleString()} ₽)
                            </button>
                        </div>
                    `;
                }

                html += `
                <div class="glass-card p-2 flex-between mb-2">
                    <div style="flex:1; margin-right:8px;">
                        <b class="text-xs color-cyan"><i class="fa-solid ${t.icon || 'fa-microchip'} mr-1"></i> ${t.name}</b>
                        <div class="sub-label mt-1" style="font-size:9.5px; line-height:1.35;">${t.desc}</div>
                    </div>
                    ${actionBlock}
                </div>`;
            });

        } else if (cat === 'consumables') {
            const consumables = catalog.consumables || [];
            html += `
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(255,179,0,0.14), #090e18); border-color: var(--amber);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber"><i class="fa-solid fa-boxes-stacked"></i> Сырьевая база сети</b>
                        <span class="tag-badge bg-tag-amber">Опт без дефицита</span>
                    </div>
                    <div class="sub-label" style="font-size:9.5px;">Пополнение запасов сырья исключает остановку кассы на ваших предприятиях.</div>
                </div>
            `;

            consumables.forEach(c => {
                let starsTxt = c.reqStars ? ` + ${c.reqStars} ⭐` : "";
                html += `
                <div class="glass-card p-2 flex-between mb-2">
                    <div style="flex:1; margin-right:8px;">
                        <b class="text-xs color-amber"><i class="fa-solid fa-box mr-1"></i> ${c.name}</b>
                        <div class="sub-label mt-1" style="font-size:9.5px; line-height:1.35;">${c.desc}</div>
                    </div>
                    <button onclick="AppShop.buyConsumableAction('${c.id}', ${c.cost}, ${c.reqStars || 0}, ${c.value}, '${c.targetBiz || 'all'}')" class="btn btn-amber btn-sm btn-auto">
                        Купить (${(c.cost / 1000).toFixed(0)}k ₽${starsTxt})
                    </button>
                </div>`;
            });

        } else if (cat === 'tuningParts') {
            const parts = catalog.tuningParts || [];
            html += `
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(192,132,252,0.14), #090e18); border-color: var(--purple);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-purple"><i class="fa-solid fa-shield-halved"></i> Официальные допуски</b>
                        <span class="tag-badge bg-tag-purple">Легальность</span>
                    </div>
                    <div class="sub-label" style="font-size:9.5px;">Лицензии пилота для 402м, пропуска в Порт и полисы защиты от угонов.</div>
                </div>
            `;

            parts.forEach(p => {
                let isOwned = false;
                if (p.id === 'raf_license') isOwned = !!state.player.hasRacingLicense;
                if (p.id === 'gps_tracker') isOwned = !!state.player.hasGpsTracker;
                if (p.id === 'customs_pass') isOwned = !!state.player.hasCustomsPass;

                let starsTxt = p.reqStars ? ` + ${p.reqStars} ⭐` : "";
                let actionBtn = isOwned
                    ? `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Оформлено ✓</button>`
                    : `<button onclick="AppShop.buyDocAction('${p.id}', ${p.cost}, ${p.reqStars || 0})" class="btn btn-purple btn-sm btn-auto">Оформить (${(p.cost / 1000).toFixed(0)}k ₽${starsTxt})</button>`;

                html += `
                <div class="glass-card p-2 flex-between mb-2">
                    <div style="flex:1; margin-right:8px;">
                        <b class="text-xs color-purple"><i class="fa-solid ${p.icon || 'fa-file'} mr-1"></i> ${p.name}</b>
                        <div class="sub-label mt-1" style="font-size:9.5px; line-height:1.35;">${p.desc}</div>
                    </div>
                    ${actionBtn}
                </div>`;
            });

        } else if (cat === 'homeItems') {
            const items = catalog.homeItems || [];
            if (!state.player.furniture) state.player.furniture = [];

            html += `
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,230,118,0.14), #090e18); border-color: var(--green);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-green"><i class="fa-solid fa-couch"></i> Оснащение боксов и апартаментов</b>
                        <span class="tag-badge bg-tag-green">Пассивные перки</span>
                    </div>
                    <div class="sub-label" style="font-size:9.5px;">Мебель восстанавливает кураж, сейф защищает кэш, а подъемник ускоряет ремонт.</div>
                </div>
            `;

            items.forEach(item => {
                let isOwned = state.player.furniture.includes(item.id);
                let starsTxt = item.reqStars ? ` + ${item.reqStars} ⭐` : "";
                let actionBtn = isOwned
                    ? `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Установлено ✓</button>`
                    : `<button onclick="AppShop.buyFurnitureAction('${item.id}', ${item.cost}, ${item.reqStars || 0})" class="btn btn-green btn-sm btn-auto">Купить (${(item.cost / 1000).toFixed(0)}k ₽${starsTxt})</button>`;

                html += `
                <div class="glass-card p-2 flex-between mb-2">
                    <div style="flex:1; margin-right:8px;">
                        <b class="text-xs color-green"><i class="fa-solid ${item.icon || 'fa-couch'} mr-1"></i> ${item.name}</b>
                        <div class="sub-label mt-1" style="font-size:9.5px; line-height:1.35;">${item.perk}</div>
                    </div>
                    ${actionBtn}
                </div>`;
            });
        }

        box.innerHTML = html;
    },

    buyToolAction(toolId, cost, reqStars) {
        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;

        if (cash < cost) return showToast("Не хватает рублей на покупку прибора!");
        if (stars < reqStars) return showToast(`Нужно ${reqStars} Stars ⭐!`);

        state.player.cash -= cost;
        state.player.stars -= reqStars;

        if (!state.player.tools) state.player.tools = {};
        if (!state.player.toolsWear) state.player.toolsWear = {};

        state.player.tools[toolId] = true;
        const catalogTools = (typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.tools) ? SHOP_CATALOG.tools : [];
        const tObj = catalogTools.find(t => t.id === toolId);
        state.player.toolsWear[toolId] = tObj ? tObj.maxUses : 50;

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Прибор куплен и добавлен в ваш арсенал!");
        this.renderCategoryItems();
    },

    calibrateToolAction(toolId, cost) {
        let cash = state.player?.cash || 0;
        if (cash < cost) return showToast("Не хватает денег на калибровку и зарядку!");

        state.player.cash -= cost;
        const catalogTools = (typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.tools) ? SHOP_CATALOG.tools : [];
        const tObj = catalogTools.find(t => t.id === toolId);
        if (!state.player.toolsWear) state.player.toolsWear = {};
        state.player.toolsWear[toolId] = tObj ? tObj.maxUses : 50;

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Прибор откалиброван и заряжен на 100%!");
        this.renderCategoryItems();
    },

    buyConsumableAction(cId, cost, reqStars, value, targetBiz) {
        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;

        if (cash < cost) return showToast("Не хватает денег на партию сырья!");
        if (stars < reqStars) return showToast(`Нужно ${reqStars} Stars ⭐!`);

        state.player.cash -= cost;
        state.player.stars -= reqStars;

        let filledAny = false;
        if (state.businesses && Array.isArray(state.businesses)) {
            state.businesses.forEach(b => {
                if (b && b.level > 0) {
                    if (targetBiz === 'all' || b.id === targetBiz) {
                        let maxStk = b.maxStock || 100;
                        b.stock = Math.min(maxStk, (b.stock || 0) + value);
                        filledAny = true;
                    }
                }
            });
        }

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(filledAny ? "Склады предприятий успешно пополнены сырьем!" : "Сырьё оплачено и поступит на склад после открытия точки!");
        this.renderCategoryItems();
    },

    buyDocAction(docId, cost, reqStars) {
        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;

        if (cash < cost) return showToast("Не хватает денег на оформление документа!");
        if (stars < reqStars) return showToast(`Нужно ${reqStars} Stars ⭐!`);

        state.player.cash -= cost;
        state.player.stars -= reqStars;

        if (docId === 'raf_license') {
            state.player.hasRacingLicense = true;
            if (typeof openVerdictModal === 'function') {
                openVerdictModal("ЛИЦЕНЗИЯ ПИЛОТА РАФ! 🏎️", "Официальная лицензия оформлена. Допуск к ночным заездам на 402м открыт!", true);
            }
        } else if (docId === 'gps_tracker') {
            state.player.hasGpsTracker = true;
            showToast("GPS-маяк активирован в защитной системе гаража!");
        } else if (docId === 'customs_pass') {
            state.player.hasCustomsPass = true;
            showToast("Таможенный пропуск в Порт зарегистрирован!");
        } else if (docId === 'insurance_osago') {
            showToast("КАСКО-страховка приобретена!");
        }

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        this.renderCategoryItems();
    },

    buyFurnitureAction(itemId, cost, reqStars) {
        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;

        if (cash < cost) return showToast("Не хватает денег на покупку мебели!");
        if (stars < reqStars) return showToast(`Нужно ${reqStars} Stars ⭐!`);

        state.player.cash -= cost;
        state.player.stars -= reqStars;

        if (!state.player.furniture) state.player.furniture = [];
        state.player.furniture.push(itemId);

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Установлено в вашей мастерской!");
        this.renderCategoryItems();
    }
};

// ========================================================
// ПРИЛОЖЕНИЕ «БЛОКНОТ ЦЕЛЕЙ» (AppNotepad)
// ========================================================
const AppNotepad = {
    render(container) {
        let s = state.player?.stats || {};
        let profit = s.totalNetProfit || 0;
        let sold = s.sold || 0;
        let goals = (typeof NOTEPAD_CAREER_GOALS !== 'undefined') ? NOTEPAD_CAREER_GOALS : [];

        let goalsHtml = goals.map(g => {
            let done = false;
            if (g.targetProfit && profit >= g.targetProfit) done = true;
            if (g.targetSales && sold >= g.targetSales) done = true;
            if (g.targetSlots && (typeof getTotalGarageSlots === 'function' ? getTotalGarageSlots() : 2) >= g.targetSlots) done = true;
            if (g.targetHousing && (state.player?.ownedHouses || []).includes(g.targetHousing)) done = true;
            if (g.targetCred && (state.player?.streetCred || 0) >= g.targetCred) done = true;
            if (g.targetPlatesCount && (state.ownedPlates || []).length >= g.targetPlatesCount) done = true;

            return `
            <div class="glass-card p-2 mb-2" style="border-left: 3px solid ${done ? 'var(--green)' : 'var(--cyan)'};">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan">${g.title}</b>
                    <span class="tag-badge ${done ? 'bg-tag-green' : 'bg-tag-cyan'}">${done ? 'ВЫПОЛНЕНО ✓' : g.category}</span>
                </div>
                <div class="sub-label mb-1" style="font-size:9.5px; line-height:1.35;">${g.desc}</div>
                <div class="color-amber font-bold text-xs" style="font-size:9px;">Награда: ${g.reward}</div>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-amber"><i class="fa-solid fa-note-sticky mr-1"></i> Блокнот Целей</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-2 mb-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(255, 179, 0, 0.12), #090e18);">
                    <div>
                        <span class="sub-label" style="font-size:9px;">Чистая прибыль:</span>
                        <div class="color-green font-bold text-xs" style="font-size:13px;">${profit.toLocaleString()} ₽</div>
                    </div>
                    <div>
                        <span class="sub-label" style="font-size:9px;">Продано авто:</span>
                        <div class="color-cyan font-bold text-xs" style="font-size:13px;">${sold} шт.</div>
                    </div>
                </div>
                <div class="space-y-1">
                    ${goalsHtml}
                </div>
            </div>
        `;
    }
};

window.PhoneManager = PhoneManager;
window.AppNotepad = AppNotepad;
window.AppShop = AppShop;
window.AppBarn = AppBarn;

document.addEventListener('DOMContentLoaded', () => {
    PhoneManager.init();
});
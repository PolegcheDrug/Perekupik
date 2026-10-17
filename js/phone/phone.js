// ========================================================
// js/phone/phone.js — ОПЕРАЦИОННАЯ СИСТЕМА PEREKUP OS (v1.9.1)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.9.1 (ФИКС DEV И СТАБИЛЬНОСТЬ):
//   - ВСЕ вызовы внешних приложений обёрнуты в try/catch.
//   - Для 'dev' добавлена проверка на window.AppDev и fallback.
//   - Добавлены проверки window.state.player в критических местах.
//   - Исправлен вызов PhoneBusiness.collectAllCash.
//
// ⭐ v1.9.0 (СПРИНТ 4 — ДЕНЬГИ ЧЕРЕЗ MONEYMANAGER):
//   - ФИКС: AppShop.buyToolAction использует MoneyManager.trySpendMulti
//   - ФИКС: AppShop.calibrateToolAction использует MoneyManager.spend
//   - ФИКС: AppShop.buyConsumableAction использует MoneyManager.trySpendMulti
//   - ФИКС: AppShop.buyDocAction использует MoneyManager.trySpendMulti
//   - ФИКС: AppShop.buyFurnitureAction использует MoneyManager.trySpendMulti
//   - ФИКС: PhoneManager.confirmUnlockAppAction использует MoneyManager.trySpendMulti
//   - Все изменения баланса идут через EventBus (money:changed)
//     → updateHeaderUI обновляется автоматически
//
// ⭐ v1.8.0 (SPRINT 2 — ФИКС C1):
//   - ФИКС C1: убраны вызовы несуществующих _startVisualizer/_stopVisualizer
//   - _onAppOpened('radio') теперь вызывает PhoneMedia.syncRadioUI()
//   - _onAppClosed('radio') ничего не делает — аудио играет в фоне
//   - openApp для 'shop'/'notepad'/'post' защищён проверками
//
// ⭐ v1.7.0 (RADIO LIFECYCLE):
//   - Интеграция с PhoneMedia: визуализатор НЕ паузится при goHome
//   - Хуки onAppOpened / onAppClosed для радио
//
// ⭐ v1.6.0 (ИНТЕГРАЦИЯ + ФИКСЫ):
//   - ФИКС: убран несуществующий PhoneHousing.renderHousingApp
//   - ФИКС: renderBusinessWidget использует PhoneBusiness API
//   - ИНТЕГРАЦИЯ: GameHelpers для escapeHtml/formatMoney/safeNum
//
// ⭐ v1.5.0:
//   - УБРАН AppAutodrot (полностью заменён на M+ Hub)
//   - Обновлён accessKeyMap
// ========================================================

const PhoneManager = {
    currentApp: null,
    _clockInterval: null,
    _isInitialized: false,
    _isOpeningApp: false,

    // ⭐ карта приложений, требующих разблокировки
    accessKeyMap: {
        'barn':       'barn',
        'containers': 'containers',
        'syndicate':  'autopodbor_order',
        'street':     'street',
        'reshala':    'darknet'
    },

    // ⭐ обёртка над GameHelpers
    _fmt(val) {
        if (window.GameHelpers && window.GameHelpers.formatMoney) {
            return window.GameHelpers.formatMoney(val);
        }
        return (Math.round(Number(val) || 0)).toLocaleString('ru-RU') + ' ₽';
    },

    _num(val, fb = 0) {
        if (window.GameHelpers && window.GameHelpers.safeNum) {
            return window.GameHelpers.safeNum(val, fb);
        }
        const n = Number(val);
        return isNaN(n) || !isFinite(n) ? fb : n;
    },

    init() {
        if (this._isInitialized) return;
        this._isInitialized = true;

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

        if (window.state?.player && Array.isArray(window.state.player.phoneMessages)) {
            unreadCount = window.state.player.phoneMessages.filter(m => m && m.unread).length;
        }

        let unreadMail = 0;
        if (window.state?.player && Array.isArray(window.state.player.mailbox)) {
            unreadMail = window.state.player.mailbox.filter(m => m && !m.claimed).length;
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

    // --------------------------------------------------------
    // ПРОВЕРКА ДОСТУПА ПО УРОВНЯМ И ПЛАТНЫМ РАЗБЛОКИРОВКАМ
    // --------------------------------------------------------
    checkAppAccess(appId) {
        const p = window.state?.player;
        if (!p) return true;
        if (!p.unlockedApps) p.unlockedApps = [];

        const configKey = this.accessKeyMap[appId];
        if (!configKey) return true;

        const config = (window.APP_ACCESS_CONFIG && window.APP_ACCESS_CONFIG[configKey])
            ? window.APP_ACCESS_CONFIG[configKey]
            : null;

        if (!config) return true;

        const minLevel = Number(config.minLevel) || 1;
        const pLvl = p.level || 1;
        const isUnlocked = p.unlockedApps.includes(configKey);

        if (isUnlocked) return true;

        if (pLvl < minLevel) {
            if (typeof window.openLevelGateModal === 'function') {
                window.openLevelGateModal(config.name || appId, minLevel);
            } else if (typeof showToast === 'function') {
                showToast(`Сервис доступен с ${minLevel} уровня!`);
            }
            return false;
        }

        this.showAppUnlockPrompt(appId, configKey, config);
        return false;
    },

    showAppUnlockPrompt(appId, configKey, config) {
        const p = window.state?.player || {};
        const cash = p.cash || 0;
        const stars = p.stars || 0;
        const tickets = p.expressTickets || 0;

        const costCash = Number(config.costCash) || 0;
        const costStars = Number(config.costStars) || 0;
        const costTickets = Number(config.costTickets) || 0;

        const hasCash = cash >= costCash;
        const hasStars = stars >= costStars;
        const hasTickets = tickets >= costTickets;
        const canUnlock = hasCash && hasStars && hasTickets;

        const starRate = window.BANK_EXCHANGE_RATES?.stars?.buyRub || 2500;

        let priceList = [];
        if (costCash > 0) priceList.push(`${costCash.toLocaleString()} ₽`);
        if (costStars > 0) priceList.push(`${costStars} ⭐ (${(costStars * starRate).toLocaleString()} ₽)`);
        if (costTickets > 0) priceList.push(`${costTickets} 🎫`);
        const priceText = priceList.length > 0 ? priceList.join(' + ') : 'Бесплатно';

        let modal = document.getElementById('modalAppUnlockPrompt');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalAppUnlockPrompt';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-box text-center" style="max-width: 410px; border-color: var(--cyan); background: radial-gradient(circle at 50% 0%, #151d2f 0%, #070a10 85%);">
                <div class="radar-spinner-ring mb-2" style="border-top-color: var(--cyan); border-right-color: var(--green); margin: 0 auto 10px auto;">
                    <div class="radar-spinner-center" style="font-size:24px;">🔑</div>
                </div>

                <div class="modal-glow-badge mb-1" style="color:var(--cyan); border-color:var(--cyan); background:rgba(0,242,254,0.1); display:inline-block;">
                    РАЗБЛОКИРОВКА СЕРВИСА
                </div>

                <h3 class="font-bold mb-1 color-cyan" style="font-size:16px;">${config.name || appId}</h3>

                <p class="sub-label mb-3" style="font-size:11px; line-height:1.45; color:#cbd5e1; padding: 0 6px;">
                    ${config.desc || 'Получите постоянный доступ к данному разделу сервиса.'}
                </p>

                <div class="p-2 mb-3 text-left" style="background:#090e18; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label">Стоимость лицензии:</span>
                        <b class="color-green" style="font-size:13px;">${priceText}</b>
                    </div>
                    <div class="flex-between" style="font-size:9.5px; color:#94a3b8;">
                        <span>Ваш баланс:</span>
                        <span>${cash.toLocaleString()} ₽ | ${stars} ⭐ | ${tickets} 🎫</span>
                    </div>
                </div>

                <div class="space-y-2">
                    <button onclick="PhoneManager.confirmUnlockAppAction('${appId}', '${configKey}')" class="btn ${canUnlock ? 'btn-green' : 'btn-dark opacity-50'} btn-sm w-full font-bold" ${canUnlock ? '' : 'disabled'}>
                        ${canUnlock ? `Оплатить и открыть (${priceText}) ✓` : 'Недостаточно средств для оплаты'}
                    </button>
                    <button onclick="ModalManager.close('modalAppUnlockPrompt')" class="btn btn-dark btn-sm w-full">
                        Отмена
                    </button>
                </div>
            </div>
        `;

        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalAppUnlockPrompt', { closeOthers: true });
        } else {
            modal.classList.add('active');
        }
        if (typeof playSound === 'function') playSound('tick');
    },

    confirmUnlockAppAction(appId, configKey) {
        const config = (window.APP_ACCESS_CONFIG && window.APP_ACCESS_CONFIG[configKey])
            ? window.APP_ACCESS_CONFIG[configKey]
            : null;
        if (!config) return;

        const p = window.state?.player;
        if (!p) return showToast("❌ Профиль игрока недоступен");

        const costCash = Number(config.costCash) || 0;
        const costStars = Number(config.costStars) || 0;
        const costTickets = Number(config.costTickets) || 0;

        // ⭐ Проверка + списание через MoneyManager
        if (window.MoneyManager && typeof window.MoneyManager.trySpendMulti === 'function') {
            const spendRes = window.MoneyManager.trySpendMulti({
                cash: costCash,
                stars: costStars,
                tickets: costTickets
            }, `Разблокировка «${config.name || appId}»`);

            if (!spendRes.success) {
                return showToast(`❌ ${spendRes.error || 'Недостаточно средств'}`);
            }
        } else {
            // Fallback на прямую проверку/списание
            const cash = p.cash || 0;
            const stars = p.stars || 0;
            const tickets = p.expressTickets || 0;

            if (cash < costCash)     return showToast("Не хватает рублей для оплаты!");
            if (stars < costStars)   return showToast("Не хватает банкнот ⭐ для оплаты!");
            if (tickets < costTickets) return showToast("Не хватает билетов 🎫 для оплаты!");

            if (costCash > 0)     p.cash -= costCash;
            if (costStars > 0)    p.stars -= costStars;
            if (costTickets > 0)  p.expressTickets -= costTickets;
        }

        if (!p.unlockedApps) p.unlockedApps = [];
        if (!p.unlockedApps.includes(configKey)) {
            p.unlockedApps.push(configKey);
        }

        if (typeof ModalManager !== 'undefined') ModalManager.close('modalAppUnlockPrompt');
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`Сервис «${config.name || appId}» успешно разблокирован!`);

        this.openApp(appId);
    },

    // --------------------------------------------------------
    // ⭐ v1.8.0: ХУКИ RADIO LIFECYCLE (ФИКС C1)
    // --------------------------------------------------------
    _onAppOpened(appId) {
        if (appId === 'radio' && window.PhoneMedia) {
            if (typeof window.PhoneMedia.syncRadioUI === 'function') {
                try {
                    window.PhoneMedia.syncRadioUI();
                } catch (e) {
                    console.warn('[Phone] syncRadioUI error:', e);
                }
            }
        }
    },

    _onAppClosed(appId) {
        // Радио продолжает играть в фоне.
        // При повторном открытии _onAppOpened вызовет syncRadioUI().
    },

    // --------------------------------------------------------
    // ОТКРЫТИЕ ПРИЛОЖЕНИЙ
    // --------------------------------------------------------
    openApp(appId) {
        if (this._isOpeningApp) {
            console.log("[Phone] openApp проигнорирован — предыдущий вызов ещё не завершён");
            return;
        }

        if (!this.checkAppAccess(appId)) {
            return;
        }

        const homeScreen = document.getElementById('phoneHomeScreen');
        const appContainer = document.getElementById('phoneAppContainer');
        if (!appContainer) return;

        this._isOpeningApp = true;

        try {
            if (this.currentApp && this.currentApp !== appId) {
                this._onAppClosed(this.currentApp);
            }

            this.currentApp = appId;

            if (homeScreen) {
                homeScreen.style.setProperty('display', 'none', 'important');
            }
            appContainer.style.setProperty('display', 'flex', 'important');
            appContainer.innerHTML = '';

            this._onAppOpened(appId);

            // 1. СЕТЬ M+ & P2P БИРЖА (AppM)
            if (appId === 'm' || appId === 'm-hub' || appId === 'messages') {
                if (window.AppM && typeof window.AppM.render === 'function') {
                    try {
                        window.AppM.render(appContainer);
                    } catch (e) {
                        console.error('[Phone] AppM.render error:', e);
                        this.renderGenericFallback(appId, appContainer);
                    }
                } else {
                    this.renderGenericFallback(appId, appContainer);
                }
                return;
            }

            // 2. ПОЧТА / СКЛАД
            if (appId === 'post' || appId === 'mailbox' || appId === 'warehouse') {
                if (window.AppPost && typeof window.AppPost.render === 'function') {
                    try {
                        window.AppPost.render(appContainer);
                    } catch (e) {
                        console.error('[Phone] AppPost.render error:', e);
                        this.renderGenericFallback(appId, appContainer);
                    }
                    return;
                }
                this.renderGenericFallback(appId, appContainer);
                return;
            }

            // 3. АВТО-МАРКЕТ
            if (appId === 'shop') {
                if (window.AppShop && typeof window.AppShop.render === 'function') {
                    try {
                        window.AppShop.render(appContainer);
                    } catch (e) {
                        console.error('[Phone] AppShop.render error:', e);
                        this.renderGenericFallback(appId, appContainer);
                    }
                    return;
                }
                this.renderGenericFallback(appId, appContainer);
                return;
            }

            // 4. САРАИ
            if (appId === 'barn') {
                if (window.AppBarn && typeof window.AppBarn.render === 'function') {
                    try {
                        window.AppBarn.render(appContainer);
                    } catch (e) {
                        console.error('[Phone] AppBarn.render error:', e);
                        this.renderGenericFallback(appId, appContainer);
                    }
                    return;
                }
                this.renderGenericFallback(appId, appContainer);
                return;
            }

            // 5. БЛОКНОТ
            if (appId === 'notepad') {
                if (window.AppNotepad && typeof window.AppNotepad.render === 'function') {
                    try {
                        window.AppNotepad.render(appContainer);
                    } catch (e) {
                        console.error('[Phone] AppNotepad.render error:', e);
                        this.renderGenericFallback(appId, appContainer);
                    }
                    return;
                }
                this.renderGenericFallback(appId, appContainer);
                return;
            }

            // 6. ОСТАЛЬНЫЕ — через switch
            switch (appId) {
                case 'dev':
                    if (window.AppDev && typeof window.AppDev.render === 'function') {
                        try {
                            window.AppDev.render(appContainer);
                        } catch (e) {
                            console.error('[Phone] AppDev.render error:', e);
                            this.renderGenericFallback(appId, appContainer);
                        }
                    } else {
                        this.renderGenericFallback(appId, appContainer);
                    }
                    break;

                case 'fortune':
                    if (window.PhoneMedia && typeof window.PhoneMedia.renderFortuneApp === 'function') {
                        try {
                            window.PhoneMedia.renderFortuneApp(appContainer);
                        } catch (e) {
                            console.error('[Phone] renderFortuneApp error:', e);
                            this.renderGenericFallback(appId, appContainer);
                        }
                    } else {
                        this.renderGenericFallback(appId, appContainer);
                    }
                    break;

                case 'reshala':
                    if (window.AppDarknet && typeof window.AppDarknet.render === 'function') {
                        try {
                            window.AppDarknet.render(appContainer);
                        } catch (e) {
                            console.error('[Phone] AppDarknet.render error:', e);
                            this.renderGenericFallback(appId, appContainer);
                        }
                    } else {
                        this.renderGenericFallback(appId, appContainer);
                    }
                    break;

                case 'street':
                    if (window.PhoneRacing && typeof window.PhoneRacing.renderStreetApp === 'function') {
                        try {
                            window.PhoneRacing.renderStreetApp(appContainer);
                        } catch (e) {
                            console.error('[Phone] PhoneRacing.renderStreetApp error:', e);
                            this.renderGenericFallback(appId, appContainer);
                        }
                    } else {
                        this.renderGenericFallback(appId, appContainer);
                    }
                    break;

                case 'radio':
                    if (window.PhoneMedia && typeof window.PhoneMedia.renderRadioApp === 'function') {
                        try {
                            window.PhoneMedia.renderRadioApp(appContainer);
                        } catch (e) {
                            console.error('[Phone] renderRadioApp error:', e);
                            this.renderGenericFallback(appId, appContainer);
                        }
                    } else {
                        this.renderGenericFallback(appId, appContainer);
                    }
                    break;

                case 'bank':
                    if (window.AppBank && typeof window.AppBank.render === 'function') {
                        try {
                            window.AppBank.render(appContainer);
                        } catch (e) {
                            console.error('[Phone] AppBank.render error:', e);
                            this.renderGenericFallback(appId, appContainer);
                        }
                    } else {
                        this.renderGenericFallback(appId, appContainer);
                    }
                    break;

                case 'business':
                    if (window.PhoneBusiness && typeof window.PhoneBusiness.render === 'function') {
                        try {
                            window.PhoneBusiness.render(appContainer);
                        } catch (e) {
                            console.error('[Phone] PhoneBusiness.render error:', e);
                            this.renderGenericFallback(appId, appContainer);
                        }
                    } else {
                        this.renderGenericFallback(appId, appContainer);
                    }
                    break;

                case 'housing':
                    if (window.PhoneHousing && typeof window.PhoneHousing.render === 'function') {
                        try {
                            window.PhoneHousing.render(appContainer);
                        } catch (e) {
                            console.error('[Phone] PhoneHousing.render error:', e);
                            this.renderGenericFallback(appId, appContainer);
                        }
                    } else if (window.AppHousing && typeof window.AppHousing.render === 'function') {
                        try {
                            window.AppHousing.render(appContainer);
                        } catch (e) {
                            console.error('[Phone] AppHousing.render error:', e);
                            this.renderGenericFallback(appId, appContainer);
                        }
                    } else {
                        this.renderGenericFallback(appId, appContainer);
                    }
                    break;

                case 'syndicate':
                    if (window.AppSyndicate && typeof window.AppSyndicate.render === 'function') {
                        try {
                            window.AppSyndicate.render(appContainer);
                        } catch (e) {
                            console.error('[Phone] AppSyndicate.render error:', e);
                            this.renderGenericFallback(appId, appContainer);
                        }
                    } else {
                        this.renderGenericFallback(appId, appContainer);
                    }
                    break;

                case 'containers':
                case 'storage_wars':
                    if (window.AppPort && typeof window.AppPort.render === 'function') {
                        try {
                            window.AppPort.render(appContainer);
                        } catch (e) {
                            console.error('[Phone] AppPort.render error:', e);
                            this.renderGenericFallback(appId, appContainer);
                        }
                    } else {
                        this.renderGenericFallback(appId, appContainer);
                    }
                    break;

                case 'radar':
                    if (window.AppRadar && typeof window.AppRadar.render === 'function') {
                        try {
                            window.AppRadar.render(appContainer);
                        } catch (e) {
                            console.error('[Phone] AppRadar.render error:', e);
                            this.renderGenericFallback(appId, appContainer);
                        }
                    } else {
                        this.renderGenericFallback(appId, appContainer);
                    }
                    break;

                case 'gosuslugi':
                    if (window.AppGosuslugi && typeof window.AppGosuslugi.render === 'function') {
                        try {
                            window.AppGosuslugi.render(appContainer);
                        } catch (e) {
                            console.error('[Phone] AppGosuslugi.render error:', e);
                            this.renderGenericFallback(appId, appContainer);
                        }
                    } else {
                        this.renderGenericFallback(appId, appContainer);
                    }
                    break;

                default:
                    this.renderGenericFallback(appId, appContainer);
            }
        } finally {
            this.afterAppOpened();
            this._isOpeningApp = false;
        }
    },

    afterAppOpened() {
        if (typeof tgHaptic === 'function') tgHaptic('light');
    },

    goHome() {
        if (this.currentApp) {
            this._onAppClosed(this.currentApp);
        }

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

    renderGenericFallback(appId, container) {
        if (!container) return;
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title">${String(appId).toUpperCase()}</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body text-center p-4">
                <div class="glass-card p-3">
                    <b class="text-xs">Приложение «${appId}» не найдено</b>
                    <div class="sub-label mt-1" style="font-size:9.5px;">Возможно, модуль ещё загружается. Попробуйте ещё раз.</div>
                    <button onclick="PhoneManager.openApp('${appId}')" class="btn btn-cyan btn-sm mt-2">Перезапустить</button>
                </div>
            </div>
        `;
    },

    // ========================================================
    // ВИДЖЕТ ЗАДАНИЙ
    // ========================================================
    toggleQuestsWidgetCollapse() {
        const p = window.state?.player;
        if (!p) return;
        if (!p.phoneWidgetsCollapsed) p.phoneWidgetsCollapsed = {};
        p.phoneWidgetsCollapsed.quests = !p.phoneWidgetsCollapsed.quests;
        if (typeof saveState === 'function') saveState();
        this.renderDailyQuestsWidget();
        if (typeof playSound === 'function') playSound('tick');
    },

    renderDailyQuestsWidget() {
        const box = document.getElementById('phoneDailyQuestsWidget');
        if (!box) return;

        const p = window.state?.player || {};
        const isDev = (typeof window.isPcDevMode === 'function') ? window.isPcDevMode() : false;
        const isCollapsed = !!(p.phoneWidgetsCollapsed?.quests);
        const quests = p.dailyQuests || [];
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
                    actionBtn = `<button onclick="PhoneManager.claimQuestReward(${idx})" class="quest-claim-btn">+${(q.reward || 0).toLocaleString()} ₽</button>`;
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
                                <span class="sub-label" style="font-size:8.5px;">+${(q.reward || 0).toLocaleString()} ₽</span>
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
                    <span class="tag-badge ${completedCount === quests.length && quests.length > 0 ? 'bg-tag-green' : 'bg-tag-cyan'}" style="font-size:8px;">${completedCount}/${quests.length}</span>
                    ${isDev ? `<span class="tag-badge bg-tag-purple" style="font-size:7.5px;">DEV</span>` : ''}
                </div>
                <button onclick="PhoneManager.toggleQuestsWidgetCollapse()" class="btn btn-dark btn-auto btn-sm" style="padding:2px 6px; font-size:9px;">
                    <i class="fa-solid ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                </button>
            </div>
            ${itemsHtml}
        `;
    },

    claimQuestReward(idx) {
        const p = window.state?.player;
        if (!p) return;

        const quests = p.dailyQuests || [];
        const q = quests[idx];
        if (!q) return;

        if (q._claiming || q.done) return;
        if ((q.cur || 0) < (q.max || 1)) return;

        q._claiming = true;
        try {
            q.done = true;

            // ⭐ v1.9.0: через MoneyManager
            if (window.MoneyManager && typeof window.MoneyManager.earn === 'function') {
                window.MoneyManager.earn(q.reward || 0, `Квест: ${q.text}`, { silent: true });
            } else {
                p.cash = (p.cash || 0) + (q.reward || 0);
            }

            if (typeof addXp === 'function') addXp(q.rewardXp || 35);

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');
            if (typeof showToast === 'function') showToast(`Награда получена: +${(q.reward || 0).toLocaleString()} ₽!`);

            this.renderDailyQuestsWidget();
        } finally {
            q._claiming = false;
        }
    },

    // ========================================================
    // ВИДЖЕТ БИЗНЕСА
    // ========================================================
    renderBusinessWidget() {
        const box = document.getElementById('phoneBizWidgetContainer');
        if (!box) return;

        if (!window.state || !window.state.businesses) {
            box.style.display = 'none';
            return;
        }

        const businesses = window.state.businesses || [];
        const ownedBusinesses = businesses.filter(b => b && b.level > 0);

        if (ownedBusinesses.length === 0) {
            box.style.display = 'none';
            return;
        }

        let totalDailyIncome = 0;
        let totalStoredCash = 0;

        if (window.PhoneBusiness) {
            try {
                if (typeof window.PhoneBusiness.getTotalDailyIncome === 'function') {
                    totalDailyIncome = window.PhoneBusiness.getTotalDailyIncome();
                }
                if (typeof window.PhoneBusiness.getAccumulatedCash === 'function') {
                    totalStoredCash = window.PhoneBusiness.getAccumulatedCash();
                }
            } catch (e) {
                console.warn('[PhoneManager] renderBusinessWidget: PhoneBusiness error', e);
            }
        }

        if (totalDailyIncome === 0 && totalStoredCash === 0) {
            ownedBusinesses.forEach(b => {
                const supplyMul = (b.stock || 0) > 0 ? 1.0 : 0.15;
                totalDailyIncome += (b.income || 0) * Math.pow(1.55, Math.max(0, (b.level || 1) - 1)) * supplyMul;
                totalStoredCash += (b.stored || 0);
            });
        }

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
                    <span class="tag-badge bg-tag-green">+${Math.round(totalDailyIncome).toLocaleString()} ₽/день</span>
                </div>

                <div class="widget-metrics-row">
                    <div>
                        <span class="sub-label" style="font-size:9px;">Накоплено в кассах:</span>
                        <div class="price-val color-green" style="font-size:14px;">${Math.floor(totalStoredCash).toLocaleString()} ₽</div>
                    </div>
                    <button onclick="PhoneManager.collectAllBusinessCash()" class="btn btn-green btn-sm btn-auto" ${totalStoredCash <= 0 ? 'disabled' : ''}>
                        Снять кассу
                    </button>
                </div>
            </div>
        `;
    },

    collectAllBusinessCash() {
        if (window.PhoneBusiness && typeof window.PhoneBusiness.collectAllCash === 'function') {
            try {
                window.PhoneBusiness.collectAllCash();
            } catch (e) {
                console.error('[Phone] collectAllBusinessCash error:', e);
            }
            return;
        }

        let total = 0;
        (window.state?.businesses || []).forEach(b => {
            if (b && b.stored && b.stored > 0) {
                total += Math.floor(b.stored);
                b.stored = 0;
            }
        });

        if (total <= 0) return;

        // ⭐ v1.9.0: через MoneyManager
        if (window.MoneyManager && typeof window.MoneyManager.earn === 'function') {
            window.MoneyManager.earn(total, 'Сбор кассы бизнес-сети');
        } else {
            window.state.player.cash = (window.state.player.cash || 0) + total;
        }

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
// АВТОНОМНЫЙ АВТО-МАРКЕТ (AppShop) — ⭐ v1.9.0 через MoneyManager
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
        const starRate = window.BANK_EXCHANGE_RATES?.stars?.buyRub || 2500;
        const p = window.state?.player || {};
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
                let isOwned = !!(p.tools && p.tools[t.id]);
                let wear = (p.toolsWear && p.toolsWear[t.id] !== undefined)
                    ? p.toolsWear[t.id]
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

            parts.forEach(p2 => {
                let isOwned = false;
                if (p2.id === 'raf_license')   isOwned = !!p.hasRacingLicense;
                if (p2.id === 'gps_tracker')   isOwned = !!p.hasGpsTracker;
                if (p2.id === 'customs_pass')  isOwned = !!p.hasCustomsPass;

                let starsTxt = p2.reqStars ? ` + ${p2.reqStars} ⭐` : "";
                let actionBtn = isOwned
                    ? `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Оформлено ✓</button>`
                    : `<button onclick="AppShop.buyDocAction('${p2.id}', ${p2.cost}, ${p2.reqStars || 0})" class="btn btn-purple btn-sm btn-auto">Оформить (${(p2.cost / 1000).toFixed(0)}k ₽${starsTxt})</button>`;

                html += `
                <div class="glass-card p-2 flex-between mb-2">
                    <div style="flex:1; margin-right:8px;">
                        <b class="text-xs color-purple"><i class="fa-solid ${p2.icon || 'fa-file'} mr-1"></i> ${p2.name}</b>
                        <div class="sub-label mt-1" style="font-size:9.5px; line-height:1.35;">${p2.desc}</div>
                    </div>
                    ${actionBtn}
                </div>`;
            });

        } else if (cat === 'homeItems') {
            const items = catalog.homeItems || [];
            if (!p.furniture) p.furniture = [];

            html += `
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,230,118,0.14), #090e18); border-color: var(--green);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-green"><i class="fa-solid fa-couch"></i> Оснащение боксов и апартаментов</b>
                        <span class="tag-badge bg-tag-green">Пассивные перки</span>
                    </div>
                    <div class="sub-label" style="font-size:9.5px;">Мебель восстанавливает кураж, сейф защищает кэш, а подъёмник ускоряет ремонт.</div>
                </div>
            `;

            items.forEach(item => {
                let isOwned = p.furniture.includes(item.id);
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
        const p = window.state?.player;
        if (!p) return showToast("❌ Профиль недоступен");

        // Проверка + списание через MoneyManager
        if (window.MoneyManager && typeof window.MoneyManager.trySpendMulti === 'function') {
            const spendRes = window.MoneyManager.trySpendMulti({
                cash: cost,
                stars: reqStars || 0
            }, `Покупка прибора`);

            if (!spendRes.success) {
                return showToast(`❌ ${spendRes.error || 'Недостаточно средств'}`);
            }
        } else {
            const cash = p.cash || 0;
            const stars = p.stars || 0;
            if (cash < cost) return showToast("Не хватает рублей на покупку прибора!");
            if (stars < (reqStars || 0)) return showToast(`Нужно ${reqStars} ⭐!`);
            p.cash -= cost;
            p.stars -= (reqStars || 0);
        }

        if (!p.tools) p.tools = {};
        if (!p.toolsWear) p.toolsWear = {};

        p.tools[toolId] = true;
        const catalogTools = (typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.tools) ? SHOP_CATALOG.tools : [];
        const tObj = catalogTools.find(t => t.id === toolId);
        p.toolsWear[toolId] = tObj ? tObj.maxUses : 50;

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Прибор куплен и добавлен в ваш арсенал!");
        this.renderCategoryItems();
    },

    calibrateToolAction(toolId, cost) {
        const p = window.state?.player;
        if (!p) return;

        // ⭐ v1.9.0: через MoneyManager
        if (window.MoneyManager && typeof window.MoneyManager.spend === 'function') {
            const ok = window.MoneyManager.spend(cost, `Калибровка прибора`);
            if (!ok) return showToast("Не хватает денег на калибровку и зарядку!");
        } else {
            if ((p.cash || 0) < cost) return showToast("Не хватает денег на калибровку и зарядку!");
            p.cash -= cost;
        }

        const catalogTools = (typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.tools) ? SHOP_CATALOG.tools : [];
        const tObj = catalogTools.find(t => t.id === toolId);
        if (!p.toolsWear) p.toolsWear = {};
        p.toolsWear[toolId] = tObj ? tObj.maxUses : 50;

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Прибор откалиброван и заряжен на 100%!");
        this.renderCategoryItems();
    },

    buyConsumableAction(cId, cost, reqStars, value, targetBiz) {
        const p = window.state?.player;
        if (!p) return;

        // ⭐ v1.9.0: через MoneyManager
        if (window.MoneyManager && typeof window.MoneyManager.trySpendMulti === 'function') {
            const spendRes = window.MoneyManager.trySpendMulti({
                cash: cost,
                stars: reqStars || 0
            }, `Покупка сырья`);
            if (!spendRes.success) {
                return showToast(`❌ ${spendRes.error || 'Недостаточно средств'}`);
            }
        } else {
            const cash = p.cash || 0;
            const stars = p.stars || 0;
            if (cash < cost) return showToast("Не хватает денег на партию сырья!");
            if (stars < (reqStars || 0)) return showToast(`Нужно ${reqStars} ⭐!`);
            p.cash -= cost;
            p.stars -= (reqStars || 0);
        }

        let filledAny = false;
        if (Array.isArray(window.state.businesses)) {
            window.state.businesses.forEach(b => {
                if (b && b.level > 0) {
                    if (targetBiz === 'all' || b.id === targetBiz) {
                        let maxStk = b.maxStock || 100;
                        b.stock = Math.min(maxStk, (b.stock || 0) + value);
                        filledAny = true;
                    }
                }
            });
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(filledAny ? "Склады предприятий успешно пополнены сырьем!" : "Сырьё оплачено и поступит на склад после открытия точки!");
        this.renderCategoryItems();
    },

    buyDocAction(docId, cost, reqStars) {
        const p = window.state?.player;
        if (!p) return;

        // ⭐ v1.9.0: через MoneyManager
        if (window.MoneyManager && typeof window.MoneyManager.trySpendMulti === 'function') {
            const spendRes = window.MoneyManager.trySpendMulti({
                cash: cost,
                stars: reqStars || 0
            }, `Оформление документа`);
            if (!spendRes.success) {
                return showToast(`❌ ${spendRes.error || 'Недостаточно средств'}`);
            }
        } else {
            const cash = p.cash || 0;
            const stars = p.stars || 0;
            if (cash < cost) return showToast("Не хватает денег на оформление документа!");
            if (stars < (reqStars || 0)) return showToast(`Нужно ${reqStars} ⭐!`);
            p.cash -= cost;
            p.stars -= (reqStars || 0);
        }

        if (docId === 'raf_license') {
            p.hasRacingLicense = true;
            if (!p.unlockedApps) p.unlockedApps = [];
            if (!p.unlockedApps.includes('street')) {
                p.unlockedApps.push('street');
            }
            if (typeof openVerdictModal === 'function') {
                openVerdictModal("ЛИЦЕНЗИЯ ПИЛОТА РАФ! 🏎️", "Официальная лицензия оформлена. Допуск к ночным заездам на 402м открыт!", true);
            }
        } else if (docId === 'gps_tracker') {
            p.hasGpsTracker = true;
            showToast("GPS-маяк активирован в защитной системе гаража!");
        } else if (docId === 'customs_pass') {
            p.hasCustomsPass = true;
            showToast("Таможенный пропуск в Порт зарегистрирован!");
        } else if (docId === 'insurance_osago') {
            showToast("Полис «КАСКО/Анти-Угон» сохранён в вашем аккаунте. Активация — через меню Инспекции авто.");
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        this.renderCategoryItems();
    },

    buyFurnitureAction(itemId, cost, reqStars) {
        const p = window.state?.player;
        if (!p) return;

        // ⭐ v1.9.0: через MoneyManager
        if (window.MoneyManager && typeof window.MoneyManager.trySpendMulti === 'function') {
            const spendRes = window.MoneyManager.trySpendMulti({
                cash: cost,
                stars: reqStars || 0
            }, `Покупка мебели`);
            if (!spendRes.success) {
                return showToast(`❌ ${spendRes.error || 'Недостаточно средств'}`);
            }
        } else {
            const cash = p.cash || 0;
            const stars = p.stars || 0;
            if (cash < cost) return showToast("Не хватает денег на покупку мебели!");
            if (stars < (reqStars || 0)) return showToast(`Нужно ${reqStars} ⭐!`);
            p.cash -= cost;
            p.stars -= (reqStars || 0);
        }

        if (!p.furniture) p.furniture = [];
        p.furniture.push(itemId);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
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
    _fallbackGoals: [
        { id: "g_mil",     category: "Капитал", title: "Первый Миллион Чистыми", desc: "Заработать суммарно более 1,000,000 ₽ чистой прибыли на сделках.", targetProfit: 1000000, reward: "Титул: «Делец со Стажем» (+5 ⭐)" },
        { id: "g_ten",     category: "Оборот",  title: "Мастер ДКП (10 Продаж)",  desc: "Закрыть 10 успешных прибыльных сделок купли-продажи.",            targetSales: 10,    reward: "+100k ₽ бонус кэша" },
        { id: "g_garage",  category: "Автопарк",title: "Гаражный Магнат",         desc: "Расширить гараж до 5 боксов и заполнить их проверенными авто.",   targetSlots: 5,     reward: "Скидка 15% на все детали тюнинга" },
        { id: "g_contract",category: "ПодКлюч", title: "Поставщик ПодКлюч",       desc: "Выполнить 5 эксклюзивных контрактов под ключ.",                   targetContracts: 5, reward: "+5 🤝 Теневых Связей" },
        { id: "g_plate",   category: "Коллекция",title: "Властелин Спецсерий",   desc: "Собрать в коллекции госномера серий 777, ЕКХ или АМР.",          targetPlatesCount: 3,reward: "+25 ⭐ Stars" },
        { id: "g_drift",   category: "Улица",   title: "Легенда RDS GP",          desc: "Построить корч мощностью свыше 450 л.с. с каркасом и победить.", targetCred: 600,    reward: "Особый статус на авторынке" },
        { id: "g_island",  category: "Олигарх", title: "Абсолютная Вершина",      desc: "Выкупить частный остров с виллой и причалом для супер-яхт.",     targetHousing: "island", reward: "Золотой статус перекупа #1" }
    ],

    render(container) {
        if (!container) return;

        const p = window.state?.player || {};
        const s = p.stats || {};
        let profit = s.totalNetProfit || 0;
        let sold = s.sold || 0;

        let goals = (typeof NOTEPAD_CAREER_GOALS !== 'undefined' && Array.isArray(NOTEPAD_CAREER_GOALS) && NOTEPAD_CAREER_GOALS.length > 0)
            ? NOTEPAD_CAREER_GOALS
            : this._fallbackGoals;

        let goalsHtml = goals.map(g => {
            let done = false;
            if (g.targetProfit && profit >= g.targetProfit) done = true;
            if (g.targetSales && sold >= g.targetSales) done = true;
            if (g.targetSlots && (typeof getTotalGarageSlots === 'function' ? getTotalGarageSlots() : 2) >= g.targetSlots) done = true;
            if (g.targetHousing && (p.ownedHouses || []).includes(g.targetHousing)) done = true;
            if (g.targetCred && (p.streetCred || 0) >= g.targetCred) done = true;

            if (g.targetPlatesCount) {
                const plates = (p.platesInventory && Array.isArray(p.platesInventory))
                    ? p.platesInventory
                    : (window.state.ownedPlates || []);
                if (plates.length >= g.targetPlatesCount) done = true;
            }
            if (g.targetContracts && (s.contractsDone || 0) >= g.targetContracts) done = true;

            return `
            <div class="glass-card p-2 mb-2" style="border-left: 3px solid ${done ? 'var(--green)' : 'var(--cyan)'}">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan">${g.title}</b>
                    <span class="tag-badge ${done ? 'bg-tag-green' : 'bg-tag-cyan'}">${done ? 'ВЫПОЛНЕНО ✓' : (g.category || 'ЦЕЛЬ')}</span>
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

// ========================================================
// Экспорт в window
// ========================================================
window.PhoneManager = PhoneManager;
window.AppNotepad = AppNotepad;
window.AppShop = AppShop;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        PhoneManager.init();
    });
} else {
    PhoneManager.init();
}

console.log('[📱 phone.js v1.9.1] Усиленная защита при открытии приложений (включая DEV) + MoneyManager ✓');
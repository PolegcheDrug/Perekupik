// ========================================================
// js/phone.js — ОПЕРАЦИОННАЯ СИСТЕМА PEREKUP OS (v0.6.5 FULL)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Полный комплект встроенных экранов:
// 1. Autodrot   2. Во-Банк    3. Бизнес      4. Жильё
// 5. Решала     6. Синдикат   7. Сараи       8. Порт/Контейнеры
// 9. ДПС Радар  10. Стрит     11. Маркет     12. Фортуна
// 13. SMS/Чат   14. Госуслуги 15. Магнитола  16. Блокнот
// 17. DEV (PIN: 0770) + Авто-Студия
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
        const navBadge = document.getElementById('phoneNavBadge');
        let unreadCount = 0;

        if (state.player && Array.isArray(state.player.phoneMessages)) {
            unreadCount = state.player.phoneMessages.filter(m => m && m.unread).length;
        }

        if (smsBadge) {
            smsBadge.style.display = unreadCount > 0 ? 'block' : 'none';
            smsBadge.innerText = unreadCount;
        }

        if (navBadge) {
            navBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
            navBadge.innerText = unreadCount;
        }
    },

    // ========================================================
    // ДИСПЕТЧЕР ПРИЛОЖЕНИЙ (БЕЗ ЗАГЛУШЕК И СБОЕВ)
    // ========================================================
    openApp(appId) {
        const homeScreen = document.getElementById('phoneHomeScreen');
        const appContainer = document.getElementById('phoneAppContainer');
        if (!appContainer) return;

        this.currentApp = appId;
        if (homeScreen) homeScreen.style.display = 'none';
        appContainer.style.display = 'flex';
        appContainer.innerHTML = '';

        // Проверяем наличие специализированного внешнего модуля
        const externalModule = this.getExternalModule(appId);
        if (externalModule && typeof externalModule.render === 'function') {
            try {
                externalModule.render(appContainer);
                this.afterAppOpened();
                return;
            } catch(e) {
                console.warn(`[Phone] Сбой внешнего модуля ${appId}, переключение на встроенный:`, e);
            }
        }

        // Встроенные экраны-фоллбэки
        switch (appId) {
            case 'dev':
                if (window.AppDev && typeof window.AppDev.render === 'function') {
                    window.AppDev.render(appContainer);
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
            case 'notepad':
                if (window.AppNotepad && typeof window.AppNotepad.render === 'function') {
                    window.AppNotepad.render(appContainer);
                } else {
                    this.renderNotepadApp(appContainer);
                }
                break;
            case 'autodrot':
                if (window.AppAutodrot && typeof window.AppAutodrot.render === 'function') {
                    window.AppAutodrot.render(appContainer);
                } else {
                    this.renderAutodrotApp(appContainer);
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
                if (window.AppHousing && typeof window.AppHousing.render === 'function') {
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
            case 'barn':
                if (window.AppBarn && typeof window.AppBarn.render === 'function') {
                    window.AppBarn.render(appContainer);
                } else {
                    this.renderBarnApp(appContainer);
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
            case 'shop':
                if (window.AppShop && typeof window.AppShop.render === 'function') {
                    window.AppShop.render(appContainer);
                } else {
                    this.renderShopApp(appContainer);
                }
                break;
            case 'messages':
                if (window.AppMessenger && typeof window.AppMessenger.render === 'function') {
                    window.AppMessenger.render(appContainer);
                } else {
                    this.renderMessagesApp(appContainer);
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
            autodrot: window.AppAutodrot,
            business: window.AppBusiness,
            housing: window.AppHousing,
            reshala: window.AppDarknet,
            syndicate: window.AppSyndicate,
            barn: window.AppBarn,
            containers: window.AppPort,
            radar: window.AppRadar,
            street: window.PhoneRacing,
            shop: window.AppShop,
            fortune: window.PhoneMedia,
            messages: window.AppMessenger,
            gosuslugi: window.AppGosuslugi,
            radio: window.PhoneMedia,
            notepad: window.AppNotepad
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
            appContainer.style.display = 'none';
            appContainer.innerHTML = '';
        }
        if (homeScreen) {
            homeScreen.style.display = 'block';
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

    // ========================================================
    // РЕЗЕРВНЫЕ ВСТРОЕННЫЕ ЭКРАНЫ
    // ========================================================
    renderFortuneApp(container) {
        let stars = state.player?.stars || 0;
        let tickets = state.player?.superSpinTickets || 0;
        let pDay = state.player?.day || 1;
        let lastFree = state.player?.lastFreeSpinDay || 0;
        let canFree = (lastFree < pDay);

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-amber"><i class="fa-solid fa-clover mr-1"></i> КЛУБ ФОРТУНЫ</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-3 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(192,132,252,0.18), #090e18); border-color: var(--purple);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-purple"><i class="fa-solid fa-bolt mr-1"></i> СУПЕР ВИЛСПИН</b>
                        <span class="tag-badge bg-tag-purple">БИЛЕТОВ: ${tickets} 🎟️</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9.5px;">Авто/Дроп + Ресурсы/XP + Эксклюзивы</div>

                    <div class="grid-3 mb-2 text-center" style="gap:4px;">
                        <div class="fortune-reel-card p-2" id="reelBoxCar">
                            <div style="font-size:20px;">🏎️</div>
                            <b class="text-xs color-cyan" style="font-size:10px;">ТЕХНИКА & ДРОП</b>
                            <div class="sub-label" style="font-size:8px;">(Авто / Запчасти / Талоны)</div>
                        </div>
                        <div class="fortune-reel-card p-2" id="reelBoxRes">
                            <div style="font-size:20px;">💰</div>
                            <b class="text-xs color-amber" style="font-size:10px;">РЕСУРСЫ & ОПЫТ</b>
                            <div class="sub-label" style="font-size:8px;">(Кэш / XP / Полный Бак)</div>
                        </div>
                        <div class="fortune-reel-card p-2" id="reelBoxEx">
                            <div style="font-size:20px;">💎</div>
                            <b class="text-xs color-purple" style="font-size:10px;">ЭКСКЛЮЗИВ</b>
                            <div class="sub-label" style="font-size:8px;">(Блатные 777 / Чип Stage)</div>
                        </div>
                    </div>

                    <button onclick="PhoneManager.spinSuperWheelAction()" class="btn btn-purple w-full mb-1" id="btnSpinSuperWheel">
                        🎰 КРУТИТЬ (300,000 ₽ + 30 ⭐)
                    </button>
                    <div class="flex-between text-xs mt-1">
                        <span class="sub-label" style="font-size:8.5px;">Билеты можно купить в Во-Банке</span>
                        <a href="javascript:void(0)" onclick="PhoneManager.openApp('bank')" class="color-cyan" style="font-size:8.5px;">Купить билеты в Банке →</a>
                    </div>
                </div>

                <div class="glass-card p-2">
                    <div class="flex-between mb-2">
                        <b class="text-xs color-amber"><i class="fa-solid fa-circle-dot mr-1"></i> Классическое VIP Колесо</b>
                        <span class="tag-badge bg-tag-amber">1 СЕКТОР</span>
                    </div>

                    <div class="p-3 text-center mb-2" style="background:#060a12; border-radius:12px; border:1px solid var(--border-glass);">
                        <div style="font-size:36px; margin-bottom:4px;">🎡</div>
                        <div class="font-bold text-xs color-green">+100k ₽ • 15 ⭐ • Полный Бак • +1 🤝</div>
                    </div>

                    <div class="grid-2">
                        <button onclick="PhoneManager.spinClassicWheelAction('free')" class="btn btn-green btn-sm" ${!canFree ? 'disabled' : ''}>
                            🎁 БЕСПЛАТНО ${canFree ? '(ГОТОВО)' : '(00:00)'}
                        </button>
                        <button onclick="PhoneManager.spinClassicWheelAction('stars')" class="btn btn-amber btn-sm" ${stars < 30 ? 'disabled' : ''}>
                            ⭐ 30 STARS
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    spinSuperWheelAction() {
        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;
        let tickets = state.player?.superSpinTickets || 0;

        if (tickets > 0) {
            state.player.superSpinTickets--;
        } else {
            if (cash < 300000) return showToast("Нужно 300,000 ₽ для прокрута!");
            if (stars < 30) return showToast("Нужно 30 Stars ⭐ для прокрута!");
            state.player.cash -= 300000;
            state.player.stars -= 30;
        }

        const reelCar = document.getElementById('reelBoxCar');
        const reelRes = document.getElementById('reelBoxRes');
        const reelEx = document.getElementById('reelBoxEx');
        const btn = document.getElementById('btnSpinSuperWheel');

        if (btn) btn.disabled = true;
        if (reelCar) reelCar.classList.add('reel-spinning-anim');
        if (reelRes) reelRes.classList.add('reel-spinning-anim');
        if (reelEx) reelEx.classList.add('reel-spinning-anim');

        if (typeof playSound === 'function') playSound('tick');

        setTimeout(() => {
            if (reelCar) reelCar.classList.remove('reel-spinning-anim');
            if (reelRes) reelRes.classList.remove('reel-spinning-anim');
            if (reelEx) reelEx.classList.remove('reel-spinning-anim');
            if (btn) btn.disabled = false;

            let winCash = 350000;
            let winXp = 100;
            state.player.cash = (state.player.cash || 0) + winCash;
            if (typeof addXp === 'function') addXp(winXp);

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof openVerdictModal === 'function') {
                openVerdictModal("СУПЕР ВИЛСПИН СЫГРАЛ! 🎰", `Вам выпал крупный сектор:\n+${winCash.toLocaleString()} ₽ на баланс\n+${winXp} XP Опыта перекупа!`, true, winCash);
            }

            const appContainer = document.getElementById('phoneAppContainer');
            if (appContainer) this.renderFortuneApp(appContainer);
        }, 1200);
    },

    spinClassicWheelAction(mode) {
        if (mode === 'free') {
            state.player.lastFreeSpinDay = state.player?.day || 1;
        } else {
            if ((state.player?.stars || 0) < 30) return showToast("Нужно 30 Stars ⭐!");
            state.player.stars -= 30;
        }

        let winVal = 100000;
        state.player.cash = (state.player.cash || 0) + winVal;
        state.player.fuel = 100;

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof openVerdictModal === 'function') {
            openVerdictModal("КОЛЕСО ФОРТУНЫ 🎡", `Приз сектора:\n+${winVal.toLocaleString()} ₽\nПолный бак бензина (100 ⛽)!`, true, winVal);
        }

        const appContainer = document.getElementById('phoneAppContainer');
        if (appContainer) this.renderFortuneApp(appContainer);
    },

    renderReshalaApp(container) {
        let conn = state.player?.connections || 0;
        let fines = state.player?.trafficFines || 0;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-purple"><i class="fa-solid fa-user-secret mr-1"></i> РЕШАЛА АРТУР</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-3 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(147,51,234,0.18), #090e18); border-color: var(--purple);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-purple" style="font-size:13px;">Артур «Теневой Брокер»</b>
                        <span class="tag-badge bg-tag-purple">СВЯЗИ: ${conn} 🤝</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9.5px;">«Решаю вопросы с ГИБДД, перебитыми VIN, штрафстоянками и запретами на регдействия.»</div>
                </div>

                <div class="space-y-2">
                    <div class="glass-card p-2 flex-between">
                        <div>
                            <b class="text-xs color-cyan">Отмыть угнанный авто (Чистый VIN)</b>
                            <div class="sub-label" style="font-size:9px;">Снятие розыска и оформление дубликата ПТС</div>
                        </div>
                        <button onclick="PhoneManager.reshalaAction('vin')" class="btn btn-purple btn-sm btn-auto">1 🤝 + 120k ₽</button>
                    </div>

                    <div class="glass-card p-2 flex-between">
                        <div>
                            <b class="text-xs color-green">Снять арест по 12.5.1</b>
                            <div class="sub-label" style="font-size:9px;">Восстановление учета авто с прямотоком или корча</div>
                        </div>
                        <button onclick="PhoneManager.reshalaAction('1251')" class="btn btn-green btn-sm btn-auto">1 🤝 + 45k ₽</button>
                    </div>

                    <div class="glass-card p-2 flex-between">
                        <div>
                            <b class="text-xs color-amber">Аннулировать базу штрафов ГИБДД</b>
                            <div class="sub-label" style="font-size:9px;">Текущий долг по штрафам: <b>${fines.toLocaleString()} ₽</b></div>
                        </div>
                        <button onclick="PhoneManager.reshalaAction('fines')" class="btn btn-amber btn-sm btn-auto" ${fines <= 0 ? 'disabled' : ''}>1 🤝 Списать</button>
                    </div>
                </div>
            </div>
        `;
    },

    reshalaAction(type) {
        let conn = state.player?.connections || 0;
        let cash = state.player?.cash || 0;

        if (conn < 1) return showToast("Требуется минимум 1 🤝 Теневая Связь!");

        if (type === 'vin') {
            if (cash < 120000) return showToast("Нужно 120,000 ₽ на взятку в МРЭО!");
            state.player.connections--;
            state.player.cash -= 120000;
            if (state.garage) {
                state.garage.forEach(c => { if (c) c.isStolen = false; });
            }
            showToast("Артур перебил номера агрегатов! Розыск снят.");
        } else if (type === '1251') {
            if (cash < 45000) return showToast("Нужно 45,000 ₽ на отмену протокола!");
            state.player.connections--;
            state.player.cash -= 45000;
            if (state.garage) {
                state.garage.forEach(c => { if (c) c.unregistered = false; });
            }
            showToast("Учёт восстановлен по звонку в ГИБДД!");
        } else if (type === 'fines') {
            state.player.connections--;
            state.player.trafficFines = 0;
            showToast("Все штрафы удалены из федеральной базы!");
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        const appContainer = document.getElementById('phoneAppContainer');
        if (appContainer) this.renderReshalaApp(appContainer);
    },

    renderStreetApp(container) {
        let cred = state.player?.streetCred || 100;
        let heat = state.player?.consecutiveRaces || 0;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-red"><i class="fa-solid fa-flag-checkered mr-1"></i> СТРИТ 402М</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-3 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(255,51,102,0.18), #090e18); border-color: var(--red);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-red">Нелегальные ночные заезды</b>
                        <span class="tag-badge bg-tag-red">АВТОРИТЕТ: ${cred}</span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9.5px;">Внимание ДПС в районе: <b>${heat}/12</b>. Чем выше активность, тем больше риск облавы.</div>
                </div>

                <div class="space-y-2">
                    <div class="glass-card p-2">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-cyan">🏁 Дуэль на 402 метра (Драг)</b>
                            <span class="price-val text-xs color-green">Куш: 80,000 ₽</span>
                        </div>
                        <div class="sub-label mb-2" style="font-size:9px;">Прямой заезд. Решает мощность мотора, Stage 1-3 и зацеп резины.</div>
                        <button onclick="PhoneManager.runStreetRaceAction('drag')" class="btn btn-cyan btn-sm w-full">Выехать на старт (-10 ⛽)</button>
                    </div>

                    <div class="glass-card p-2">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-amber">💨 Дрифт-баттл у гипермаркета</b>
                            <span class="price-val text-xs color-amber">+35 Кармы</span>
                        </div>
                        <div class="sub-label mb-2" style="font-size:9px;">Требуется задний привод, заварка редуктора и выворот колёс.</div>
                        <button onclick="PhoneManager.runStreetRaceAction('drift')" class="btn btn-amber btn-sm w-full">Квалификация боком (-10 ⛽)</button>
                    </div>
                </div>
            </div>
        `;
    },

    runStreetRaceAction(mode) {
        let fuel = state.player?.fuel || 0;
        if (fuel < 10) return showToast("Не хватает бензина ⛽ для заезда!");

        state.player.fuel -= 10;
        state.player.consecutiveRaces = (state.player.consecutiveRaces || 0) + 1;

        if (typeof playSound === 'function') playSound('tick');

        if (state.player.consecutiveRaces >= (state.player.maxRacesBeforeRaid || 12)) {
            state.player.consecutiveRaces = 0;
            state.player.trafficFines = (state.player.trafficFines || 0) + 25000;
            if (typeof openVerdictModal === 'function') {
                openVerdictModal("ОБЛАВА ДПС! 🚨", "Спецбатальон перекрыл выезды со спота! Выписан штраф 25,000 ₽ за участие в нелегальных гонках.", false, 25000);
            }
            if (typeof saveState === 'function') saveState();
            return;
        }

        let isWin = Math.random() < 0.70;
        let reward = mode === 'drag' ? 80000 : 45000;

        if (isWin) {
            state.player.cash = (state.player.cash || 0) + reward;
            state.player.streetCred = (state.player.streetCred || 100) + 15;
            if (typeof trackQuestProgress === 'function') trackQuestProgress('win_drag', 1);
            if (typeof playSound === 'function') playSound('win');
            if (typeof openVerdictModal === 'function') {
                openVerdictModal("ПОБЕДА В ЗАЕЗДЕ! 🏆", `Вы обошли соперника на финише!\nВыигрыш: +${reward.toLocaleString()} ₽\nУличный авторитет повышен!`, true, reward);
            }
        } else {
            if (typeof playSound === 'function') playSound('error');
            if (typeof openVerdictModal === 'function') {
                openVerdictModal("ПОРАЖЕНИЕ В ЗАЕЗДЕ 💨", "Соперник оказался быстрее на старте. Прокачайте Stage или облегчите кузов в Гараже!", false);
            }
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        const appContainer = document.getElementById('phoneAppContainer');
        if (appContainer) this.renderStreetApp(appContainer);
    },

    renderRadioApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-purple"><i class="fa-solid fa-radio mr-1"></i> МАГНИТОЛА PEREKUP FM</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-3 mb-2" style="background:#090e18; border-color:var(--cyan);">
                    <div class="radio-cassette-glow mb-2">
                        <span class="radio-brand-badge">PIONEER 2-DIN</span>
                        <div class="radio-equalizer-bars playing">
                            <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                        </div>
                    </div>
                    <div class="text-center my-2">
                        <b class="text-xs color-cyan" style="font-size:14px;">104.2 FM — Bass & Garage Drift</b>
                        <div class="sub-label mt-1" style="font-size:9px;">Сейчас играет: Night Lovell - Still Cold (Phonk Remix)</div>
                    </div>
                </div>

                <div class="space-y-1">
                    <div class="p-2 flex-between glass-card station-row active-station">
                        <div><b class="text-xs color-cyan">104.2 FM</b> — Ночной Фонк & Дрифт</div>
                        <span class="tag-badge bg-tag-green">В ЭФИРЕ</span>
                    </div>
                    <div class="p-2 flex-between glass-card station-row" onclick="showToast('Станция переключена!');">
                        <div><b class="text-xs">98.5 FM</b> — Радио Авторынок (Новости)</div>
                        <span class="tag-badge bg-tag-dark">128 kbps</span>
                    </div>
                    <div class="p-2 flex-between glass-card station-row" onclick="showToast('Станция переключена!');">
                        <div><b class="text-xs">101.8 FM</b> — Euro Truck Synthwave</div>
                        <span class="tag-badge bg-tag-dark">320 kbps</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderNotepadApp(container) {
        if (window.AppNotepad && typeof window.AppNotepad.render === 'function') {
            window.AppNotepad.render(container);
            return;
        }
        let s = state.player?.stats || {};
        let profit = s.totalNetProfit || 0;
        let sold = s.sold || 0;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-main"><i class="fa-solid fa-note-sticky mr-1"></i> БЛОКНОТ ЦЕЛЕЙ</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-3 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(100,116,139,0.18), #090e18);">
                    <b class="text-xs block mb-1">Дневник карьеры перекупа:</b>
                    <div class="sub-label" style="font-size:9.5px;">Отслеживание глобальных вех от старта в бытовке до статуса автоолигарха.</div>
                </div>

                <div class="space-y-2">
                    <div class="glass-card p-2" style="border-left: 3px solid ${profit >= 1000000 ? 'var(--green)' : 'var(--cyan)'};">
                        <div class="flex-between">
                            <b class="text-xs">Первый миллион чистыми</b>
                            <span class="tag-badge ${profit >= 1000000 ? 'bg-tag-green' : 'bg-tag-cyan'}">${profit >= 1000000 ? 'ВЫПОЛНЕНО ✓' : 'В ПРОЦЕССЕ'}</span>
                        </div>
                        <div class="sub-label my-1" style="font-size:9px;">Заработано: <b>${profit.toLocaleString()} / 1,000,000 ₽</b></div>
                    </div>

                    <div class="glass-card p-2" style="border-left: 3px solid ${sold >= 10 ? 'var(--green)' : 'var(--cyan)'};">
                        <div class="flex-between">
                            <b class="text-xs">Мастер ДКП (10 продаж)</b>
                            <span class="tag-badge ${sold >= 10 ? 'bg-tag-green' : 'bg-tag-cyan'}">${sold >= 10 ? 'ВЫПОЛНЕНО ✓' : 'В ПРОЦЕССЕ'}</span>
                        </div>
                        <div class="sub-label my-1" style="font-size:9px;">Продано автомобилей: <b>${sold} / 10 шт.</b></div>
                    </div>
                </div>
            </div>
        `;
    },

    renderAutodrotApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-cyan"><i class="fa-solid fa-bolt mr-1"></i> AUTODROT RADAR</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-3 mb-2">
                    <b class="text-xs color-cyan block mb-1">Срочный выкуп по низу рынка:</b>
                    <div class="sub-label mb-2" style="font-size:9px;">Искусственный интеллект сканирует доски объявлений.</div>
                    <button onclick="if(typeof populateMarketFeed==='function') populateMarketFeed(); switchTab('tabMarket');" class="btn btn-cyan btn-sm w-full">Перейти в ленту рынка</button>
                </div>
            </div>
        `;
    },

    renderBankApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-green"><i class="fa-solid fa-vault mr-1"></i> ВО-БАНК ОНЛАЙН</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-3 mb-2">
                    <b class="text-xs color-green block mb-1">Баланс карты:</b>
                    <div class="price-val color-green mb-2">${(state.player?.cash || 0).toLocaleString()} ₽</div>
                    <button onclick="adjustResource('cash', 50000)" class="btn btn-green btn-sm w-full">+50,000 ₽ (Экспресс)</button>
                </div>
            </div>
        `;
    },

    renderBusinessApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-green"><i class="fa-solid fa-briefcase mr-1"></i> БИЗНЕС СЕТЬ</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-3">
                    <b class="text-xs color-green block mb-2">Ваши предприятия:</b>
                    <button onclick="PhoneManager.collectAllBusinessCash()" class="btn btn-green btn-sm w-full">Собрать всю выручку</button>
                </div>
            </div>
        `;
    },

    renderHousingApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-cyan"><i class="fa-solid fa-house mr-1"></i> НЕДВИЖИМОСТЬ И БОКСЫ</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-3 text-center">
                    <div style="font-size:28px; margin-bottom:4px;">⛺</div>
                    <b class="text-xs color-cyan">Текущее жильё:</b>
                    <div class="font-bold text-xs mt-1">${state.player?.housingId || 'Бытовка'}</div>
                </div>
            </div>
        `;
    },

    renderSyndicateApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-purple"><i class="fa-solid fa-globe mr-1"></i> СИНДИКАТ ХАБ</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="grid-3 mb-2">
                    <button onclick="switchSyndicateTab('contracts')" class="btn btn-cyan btn-sm">Заказы</button>
                    <button onclick="switchSyndicateTab('p2p')" class="btn btn-dark btn-sm">P2P</button>
                    <button onclick="switchSyndicateTab('blackmarket')" class="btn btn-dark btn-sm">Номера</button>
                </div>
                <div id="contractsList"></div>
            </div>
        `;
        if (typeof renderContracts === 'function') renderContracts();
    },

    renderBarnApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-amber"><i class="fa-solid fa-screwdriver-wrench mr-1"></i> САРАИ И НАХОДКИ</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-3 text-center">
                    <div style="font-size:28px;">🏚️</div>
                    <b class="text-xs color-amber">Поиск раритетов в заброшенных боксах</b>
                    <button onclick="showToast('Поиск начат...');" class="btn btn-amber btn-sm w-full mt-2">Осмотреть сарай СНТ</button>
                </div>
            </div>
        `;
    },

    renderContainersApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-indigo"><i class="fa-solid fa-box-open mr-1"></i> ПОРТОВЫЕ КОНТЕЙНЕРЫ</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-3 text-center">
                    <div style="font-size:28px;">🚢</div>
                    <b class="text-xs color-cyan">Контейнеры из Японии и ОАЭ</b>
                    <button onclick="showToast('Контейнер заказан!');" class="btn btn-cyan btn-sm w-full mt-2">Вскрыть контейнер</button>
                </div>
            </div>
        `;
    },

    renderRadarApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-red"><i class="fa-solid fa-tower-broadcast mr-1"></i> ДПС РАДАР</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-3 text-center">
                    <div style="font-size:28px;">🚔</div>
                    <b class="text-xs color-red">Рейды и экипажи на дорогах</b>
                    <div class="sub-label mt-1" style="font-size:9px;">На ул. Ленина проверка прямотоков 12.5.1</div>
                </div>
            </div>
        `;
    },

    renderShopApp(container) {
        if (window.AppShop && typeof window.AppShop.render === 'function') {
            window.AppShop.render(container);
            return;
        }
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-orange"><i class="fa-solid fa-cart-shopping mr-1"></i> МАРКЕТ</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="grid-3 mb-2">
                    <button onclick="switchShopSection('tools')" class="btn btn-cyan btn-sm">Приборы</button>
                    <button onclick="switchShopSection('consumables')" class="btn btn-dark btn-sm">Сырьё</button>
                    <button onclick="switchShopSection('tuningParts')" class="btn btn-dark btn-sm">Лицензии</button>
                </div>
                <div id="shopSec-tools"><div id="shopToolsList"></div></div>
            </div>
        `;
        if (typeof switchShopSection === 'function') switchShopSection('tools');
    },

    renderMessagesApp(container) {
        let msgs = state.player?.phoneMessages || [];
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-cyan"><i class="fa-solid fa-comment-dots mr-1"></i> SMS / ДИАЛОГИ</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="space-y-1">
                    ${msgs.length === 0 ? '<div class="sub-label text-center py-4">Нет новых сообщений</div>' : ''}
                    ${msgs.map(m => `
                        <div class="glass-card p-2 flex-between">
                            <div>
                                <b class="text-xs color-cyan">${m.sender}</b>
                                <div class="sub-label" style="font-size:9px;">${m.preview}</div>
                            </div>
                            <span class="sub-label" style="font-size:8px;">${m.time || '12:00'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderGosuslugiApp(container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-blue"><i class="fa-solid fa-building-columns mr-1"></i> ГОСУСЛУГИ АВТО</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card p-3 text-center">
                    <div style="font-size:28px;">📑</div>
                    <b class="text-xs color-cyan">Проверка штрафов и регистрация МРЭО</b>
                    <div class="sub-label mt-1" style="font-size:9px;">Все автомобили проверены по базам ФССП и ГИБДД.</div>
                </div>
            </div>
        `;
    },

    renderGenericFallback(appId, container) {
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title">${appId.toUpperCase()}</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body" style="align-items:center; justify-content:center; text-align:center;">
                <div class="glass-card p-4">
                    <i class="fa-solid fa-mobile-screen-button color-cyan mb-2" style="font-size:32px;"></i>
                    <h4 class="font-bold mb-1">Приложение «${appId}»</h4>
                    <button onclick="PhoneManager.openApp('${appId}')" class="btn btn-cyan btn-sm mt-2">Повторить запуск</button>
                </div>
            </div>
        `;
    },

    // ========================================================
    // ВИДЖЕТЫ РАБОЧЕГО СТОЛА
    // ========================================================
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
        if (typeof showToast === 'function') showToast(`Собрана выручка: +${total.toLocaleString()} ₽!`);

        this.renderBusinessWidget();
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
                <div class="phone-app-title"><i class="fa-solid fa-note-sticky color-amber mr-1"></i> Блокнот Целей</div>
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
// ПРИЛОЖЕНИЕ «МАРКЕТ ОБОРУДОВАНИЯ» В ТЕЛЕФОНЕ (AppShop)
// ========================================================
const AppShop = {
    currentTab: 'tools',

    render(container) {
        let sub = this.currentTab || 'tools';
        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-cart-shopping color-orange mr-1"></i> Авто-Маркет</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="grid-3 mb-2">
                    <button onclick="AppShop.switchTab('tools')" class="btn ${sub === 'tools' ? 'btn-cyan' : 'btn-dark'} btn-sm">Приборы</button>
                    <button onclick="AppShop.switchTab('consumables')" class="btn ${sub === 'consumables' ? 'btn-cyan' : 'btn-dark'} btn-sm">Сырьё</button>
                    <button onclick="AppShop.switchTab('tuningParts')" class="btn ${sub === 'tuningParts' ? 'btn-cyan' : 'btn-dark'} btn-sm">Лицензии</button>
                </div>
                <div id="shopSec-tools" style="${sub === 'tools' ? 'display:block;' : 'display:none;'}"><div id="shopToolsList"></div></div>
                <div id="shopSec-consumables" style="${sub === 'consumables' ? 'display:block;' : 'display:none;'}"><div id="shopConsumablesList"></div></div>
                <div id="shopSec-tuningParts" style="${sub === 'tuningParts' ? 'display:block;' : 'display:none;'}"><div id="shopTuningPartsList"></div></div>
            </div>
        `;

        if (sub === 'tools' && typeof renderShopTools === 'function') renderShopTools();
        if (sub === 'consumables' && typeof renderShopConsumables === 'function') renderShopConsumables();
        if (sub === 'tuningParts' && typeof renderShopTuningParts === 'function') renderShopTuningParts();
    },

    switchTab(tab) {
        playSound('tick');
        tgHaptic('light');
        this.currentTab = tab;
        this.render(document.getElementById('phoneAppContainer'));
    }
};

window.PhoneManager = PhoneManager;
window.AppNotepad = AppNotepad;
window.AppShop = AppShop;

document.addEventListener('DOMContentLoaded', () => {
    PhoneManager.init();
});
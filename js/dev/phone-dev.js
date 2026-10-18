// ========================================================
// js/dev/phone-dev.js — ПРИЛОЖЕНИЕ «DEV TERMINAL» (v2.3.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v2.3.0 (СИНХРОНИЗАЦИЯ С НОВЫМ ADMINMANAGER):
//   - Добавлено состояние AppDev._isWiping для блокировки UI.
//   - Кнопки сброса теперь показывают спиннер во время очистки.
//   - Обработка массива errors от AdminManager (permission-denied).
// ⭐ v2.2.0 (СТАБИЛЬНОСТЬ И ЗАЩИТА ОТ ПАДЕНИЙ):
//   - Все вкладки обернуты в try/catch.
// ⭐ v2.1.0 (ГЛОБАЛЬНЫЙ СБРОС И ВАЙП БД):
//   - ДОБАВЛЕНО: Два режима сброса во вкладку FIRESTORE.
// ========================================================

const AppDev = {
    DEV_PIN: "0852",
    isAuthenticated: false,
    enteredPin: "",
    activeSubTab: "overview",

    // Для вкладки Logs
    logFilter: 'all',
    logSearchQuery: '',

    // Для вкладки Events
    eventFilter: '',

    // Для вкладки State
    stateSearchQuery: '',

    // Firestore
    firestoreStats: null,
    firestoreTesting: false,
    
    // ⭐ v2.3.0: Флаг процесса очистки БД
    _isWiping: false,

    // ⭐ v2.0.0: Кэш данных для вкладки ДОСТУП
    _accessInvites: [],
    _accessPlayers: [],
    _accessLoading: false,

    // ========================================================
    // РЕНДЕР
    // ========================================================
    render(container) {
        if (!container) return;

        try {
            if (!this.isAuthenticated) {
                this.renderLockScreen(container);
            } else {
                this.renderDashboard(container);
            }
        } catch (e) {
            console.error('[AppDev] Критическая ошибка рендера:', e);
            container.innerHTML = `
                <div class="phone-app-header">
                    <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                    <div class="phone-app-title color-red">DEV ERROR</div>
                    <div style="width:40px;"></div>
                </div>
                <div class="phone-app-body">
                    <div class="glass-card p-3" style="border-color: var(--red);">
                        <b class="color-red text-xs">Критическая ошибка DEV-приложения</b>
                        <div class="sub-label mt-1" style="font-size:9.5px;">${String(e.message || e).substring(0, 200)}</div>
                        <button onclick="AppDev.isAuthenticated=false; PhoneManager.openApp('dev')" class="btn btn-dark btn-sm mt-2">Сбросить и зайти снова</button>
                    </div>
                </div>
            `;
        }
    },

    // ========================================================
    // ⭐ v2.0.0: ПРОВЕРКА ВЛАДЕЛЬЦА
    // ========================================================
    _isOwner() {
        try {
            const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
            const uid = tgUser?.id ? String(tgUser.id) : (window.tgUserId || window.state?.player?.uid);
            if (!uid) return false;

            if (window.AccessControl && typeof window.AccessControl.isOwner === 'function') {
                return window.AccessControl.isOwner(uid);
            }

            const OWNER_ID = '1944392183';
            return String(uid) === OWNER_ID;
        } catch (e) {
            return false;
        }
    },

    // ========================================================
    // 1. ЭКРАН ВВОДА PIN-КОДА
    // ========================================================
    renderLockScreen(container) {
        let dotsHtml = "";
        for (let i = 0; i < 4; i++) {
            let isFilled = i < this.enteredPin.length;
            dotsHtml += `<div class="dev-pin-dot ${isFilled ? 'filled' : ''}" id="devDot_${i}"></div>`;
        }

        container.innerHTML = `
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 230, 118, 0.3);">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-green"><i class="fa-solid fa-terminal mr-1"></i> DEV TERMINAL</div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body" style="justify-content: center; align-items: center; padding: 12px 6px;">
                <div class="glass-card text-center p-3 w-full" style="background: radial-gradient(circle at 50% 0%, rgba(0,230,118,0.15), #060910); border: 1px solid rgba(0,230,118,0.4); box-shadow: 0 0 25px rgba(0,230,118,0.25);">
                    <div style="font-size: 32px; color: var(--green); margin-bottom: 4px;">
                        <i class="fa-solid fa-shield-halved"></i>
                    </div>
                    <b class="text-xs color-green" style="font-size: 13px; letter-spacing: 1px;">PEREKUP OS // ROOT ACCESS</b>
                    <div class="sub-label mb-3" style="font-size: 9.5px;">Введите 4-значный системный PIN-код разработчика:</div>

                    <div class="dev-pin-dots-row mb-3" id="devPinDotsContainer">
                        ${dotsHtml}
                    </div>

                    <div id="devPinErrorMsg" class="sub-label color-red mb-2" style="font-size:10px; height:14px;"></div>

                    <div class="dev-keypad-grid">
                        <button onclick="AppDev.pressKey('1')" class="dev-key-btn">1</button>
                        <button onclick="AppDev.pressKey('2')" class="dev-key-btn">2</button>
                        <button onclick="AppDev.pressKey('3')" class="dev-key-btn">3</button>
                        <button onclick="AppDev.pressKey('4')" class="dev-key-btn">4</button>
                        <button onclick="AppDev.pressKey('5')" class="dev-key-btn">5</button>
                        <button onclick="AppDev.pressKey('6')" class="dev-key-btn">6</button>
                        <button onclick="AppDev.pressKey('7')" class="dev-key-btn">7</button>
                        <button onclick="AppDev.pressKey('8')" class="dev-key-btn">8</button>
                        <button onclick="AppDev.pressKey('9')" class="dev-key-btn">9</button>
                        <button onclick="AppDev.clearPin()" class="dev-key-btn dev-key-action"><i class="fa-solid fa-xmark"></i></button>
                        <button onclick="AppDev.pressKey('0')" class="dev-key-btn">0</button>
                        <button onclick="AppDev.backspacePin()" class="dev-key-btn dev-key-action"><i class="fa-solid fa-delete-left"></i></button>
                    </div>

                    <div class="sub-label mt-3" style="font-size:8.5px; color:#64748b;">
                        Подсказка: PIN по умолчанию — <code style="color:var(--green);">0852</code>
                    </div>
                </div>
            </div>
        `;
    },

    updatePinDotsUI() {
        for (let i = 0; i < 4; i++) {
            const dot = document.getElementById(`devDot_${i}`);
            if (dot) {
                if (i < this.enteredPin.length) dot.classList.add('filled');
                else dot.classList.remove('filled');
            }
        }
    },

    pressKey(num) {
        if (this.enteredPin.length >= 4) return;
        this.enteredPin += num;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');

        const errEl = document.getElementById('devPinErrorMsg');
        if (errEl) errEl.innerText = "";

        this.updatePinDotsUI();

        if (this.enteredPin.length === 4) {
            setTimeout(() => this.verifyPin(), 120);
        }
    },

    clearPin() {
        this.enteredPin = "";
        this.updatePinDotsUI();
        const errEl = document.getElementById('devPinErrorMsg');
        if (errEl) errEl.innerText = "";
    },

    backspacePin() {
        if (this.enteredPin.length > 0) {
            this.enteredPin = this.enteredPin.slice(0, -1);
            this.updatePinDotsUI();
            const errEl = document.getElementById('devPinErrorMsg');
            if (errEl) errEl.innerText = "";
        }
    },

    verifyPin() {
        if (this.enteredPin === this.DEV_PIN) {
            this.isAuthenticated = true;
            this.enteredPin = "";
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');
            if (typeof showToast === 'function') showToast("✓ ROOT-доступ разработчика подтверждён!");
            if (window.DevLogger) window.DevLogger.add('system', 'DEV: успешная авторизация');
            if (window.EventBus) window.EventBus.emit('dev:authenticated', {});
            this.render(document.getElementById('phoneAppContainer'));
        } else {
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('error');
            if (window.DevLogger) window.DevLogger.add('warn', 'DEV: неверный PIN-код');
            this.enteredPin = "";
            this.updatePinDotsUI();
            const errEl = document.getElementById('devPinErrorMsg');
            if (errEl) errEl.innerText = "❌ Ошибка: неверный PIN-код!";
        }
    },

    logout() {
        this.isAuthenticated = false;
        this.enteredPin = "";
        if (window.DevLogger) window.DevLogger.add('system', 'DEV: сессия закрыта');
        this.render(document.getElementById('phoneAppContainer'));
        if (typeof showToast === 'function') showToast("Сессия DEV заблокирована.");
    },

    switchTab(tab) {
        this.activeSubTab = tab;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 2. ГЛАВНАЯ ПАНЕЛЬ
    // ========================================================
    renderDashboard(container) {
        const sub = this.activeSubTab;
        const isOwner = this._isOwner();

        container.innerHTML = `
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 230, 118, 0.4);">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title color-green"><i class="fa-solid fa-code mr-1"></i> DEV SUITE // 0852</div>
                <button onclick="AppDev.logout()" class="phone-back-btn" style="color:var(--red);" title="Заблокировать"><i class="fa-solid fa-lock"></i></button>
            </div>

            <div class="phone-app-body" style="gap: 6px;">
                <!-- ВЕРХНИЙ РЯД: 5 вкладок -->
                <div class="grid-5 mb-1" style="display:grid; grid-template-columns: repeat(5, 1fr); gap: 3px;">
                    <button onclick="AppDev.switchTab('overview')" class="btn ${sub === 'overview' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:8px;">
                        <i class="fa-solid fa-gauge"></i> ОБЗОР
                    </button>
                    <button onclick="AppDev.switchTab('studio')" class="btn ${sub === 'studio' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:8px;">
                        <i class="fa-solid fa-car-side"></i> СТУДИЯ
                    </button>
                    <button onclick="AppDev.switchTab('resources')" class="btn ${sub === 'resources' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:8px;">
                        <i class="fa-solid fa-coins"></i> ЧИТ
                    </button>
                    <button onclick="AppDev.switchTab('sandbox')" class="btn ${sub === 'sandbox' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:8px;">
                        <i class="fa-solid fa-sliders"></i> ДЕБАГ
                    </button>
                    <button onclick="AppDev.switchTab('data_check')" class="btn ${sub === 'data_check' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:8px;">
                        <i class="fa-solid fa-database"></i> ДАННЫЕ
                    </button>
                </div>

                <!-- СРЕДНИЙ РЯД: 5 вкладок -->
                <div class="grid-5 mb-2" style="display:grid; grid-template-columns: repeat(5, 1fr); gap: 3px;">
                    <button onclick="AppDev.switchTab('logs')" class="btn ${sub === 'logs' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:8px; position:relative;">
                        <i class="fa-solid fa-list-ul"></i> ЛОГИ
                        ${this._renderLogsBadge()}
                    </button>
                    <button onclick="AppDev.switchTab('events')" class="btn ${sub === 'events' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:8px;">
                        <i class="fa-solid fa-bolt"></i> СОБЫТИЯ
                    </button>
                    <button onclick="AppDev.switchTab('money')" class="btn ${sub === 'money' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:8px;">
                        <i class="fa-solid fa-ruble-sign"></i> ДЕНЬГИ
                    </button>
                    <button onclick="AppDev.switchTab('state')" class="btn ${sub === 'state' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:8px;">
                        <i class="fa-solid fa-eye"></i> STATE
                    </button>
                    <button onclick="AppDev.switchTab('firestore')" class="btn ${sub === 'firestore' ? 'btn-purple' : 'btn-dark'} btn-sm" style="padding:5px 2px; font-size:8px;">
                        <i class="fa-solid fa-cloud"></i> FIRESTORE
                    </button>
                </div>

                <!-- НИЖНИЙ РЯД: МОДУЛИ + ДОСТУП -->
                <div class="mb-2" style="display:grid; grid-template-columns: ${isOwner ? '2fr 1fr' : '1fr'}; gap: 4px;">
                    <button onclick="AppDev.switchTab('modules')" class="btn ${sub === 'modules' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:8.5px;">
                        <i class="fa-solid fa-puzzle-piece"></i> ПРОВЕРИТЬ МОДУЛИ
                    </button>
                    ${isOwner ? `
                        <button onclick="AppDev.switchTab('access')" class="btn ${sub === 'access' ? 'btn-amber' : 'btn-dark'}" style="padding:6px 2px; font-size:8.5px; border:1.5px solid rgba(255,215,0,0.4); background:linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,179,0,0.05));">
                            <i class="fa-solid fa-crown color-amber"></i> ДОСТУП
                        </button>
                    ` : ''}
                </div>

                <div id="devTabContentBox" style="min-height:300px;"></div>
            </div>
        `;

        const box = document.getElementById('devTabContentBox');
        if (!box) return;

        try {
            if (sub === 'overview')         this.renderOverviewTab(box);
            else if (sub === 'studio')      this.renderStudioTab(box);
            else if (sub === 'resources')   this.renderResourcesTab(box);
            else if (sub === 'sandbox')     this.renderSandboxTab(box);
            else if (sub === 'data_check')  this.renderDataCheckTab(box);
            else if (sub === 'logs')        this.renderLogsTab(box);
            else if (sub === 'events')      this.renderEventsTab(box);
            else if (sub === 'money')       this.renderMoneyTab(box);
            else if (sub === 'state')       this.renderStateTab(box);
            else if (sub === 'firestore')   this.renderFirestoreTab(box);
            else if (sub === 'modules')     this.renderModulesTab(box);
            else if (sub === 'access' && isOwner) this.renderAccessTab(box);
        } catch (e) {
            console.error('[AppDev] Ошибка вкладки', sub, e);
            box.innerHTML = `
                <div class="glass-card p-3" style="border-color: var(--red);">
                    <b class="color-red text-xs">Ошибка вкладки «${sub}»</b>
                    <div class="sub-label mt-1" style="font-size:9px;">${String(e.message || e).substring(0, 200)}</div>
                    <button onclick="AppDev.render(document.getElementById('phoneAppContainer'))" class="btn btn-dark btn-sm mt-2">Обновить</button>
                </div>
            `;
        }

        if (sub === 'firestore') {
            setTimeout(() => this.refreshFirestoreStats(), 50);
        }

        if (sub === 'access' && isOwner) {
            setTimeout(() => this.loadAccessData(), 50);
        }
    },

    _renderLogsBadge() {
        if (!window.DevLogger) return '';
        const errors = window.DevLogger.getFiltered('error').length;
        if (errors <= 0) return '';
        return `<span style="position:absolute; top:2px; right:2px; background:var(--red); color:#fff; font-size:7px; font-weight:900; padding:1px 4px; border-radius:6px;">${errors}</span>`;
    },

    // ========================================================
    // ⭐ v2.0.0: ВКЛАДКА ДОСТУП
    // ========================================================
    async loadAccessData() {
        if (!this._isOwner()) return;
        if (this._accessLoading) return;

        this._accessLoading = true;
        const box = document.getElementById('devTabContentBox');
        if (box) {
            box.innerHTML = `
                <div class="text-center p-4">
                    <div class="radar-spinner-ring mb-2" style="margin: 0 auto;"></div>
                    <div class="sub-label" style="font-size:10px;">Загрузка данных доступа...</div>
                </div>
            `;
        }

        try {
            if (!window.AccessControl) throw new Error("AccessControl не загружен");

            const [invitesRes, playersRes] = await Promise.all([
                window.AccessControl.listInvites(),
                window.AccessControl.listWhitelist()
            ]);

            this._accessInvites = invitesRes.success ? invitesRes.invites : [];
            this._accessPlayers = playersRes.success ? playersRes.players : [];

            this.renderAccessTab(document.getElementById('devTabContentBox'));
        } catch (e) {
            console.error('[AppDev] Ошибка загрузки данных доступа:', e);
            if (box) {
                box.innerHTML = `
                    <div class="glass-card p-3" style="border-color: var(--red);">
                        <b class="color-red text-xs">Ошибка загрузки</b>
                        <div class="sub-label mt-1" style="font-size:9.5px;">${String(e.message || e).substring(0, 150)}</div>
                        <button onclick="AppDev.loadAccessData()" class="btn btn-cyan btn-sm w-full mt-2" style="font-size:9px;">
                            <i class="fa-solid fa-rotate"></i> Повторить
                        </button>
                    </div>
                `;
            }
        } finally {
            this._accessLoading = false;
        }
    },

    renderAccessTab(container) {
        if (!container) return;
        if (!this._isOwner()) {
            container.innerHTML = `<div class="glass-card p-3 text-center sub-label">Доступ только для владельца</div>`;
            return;
        }

        const invites = this._accessInvites || [];
        const players = this._accessPlayers || [];

        const activeInvites = invites.filter(i => i.isActive);
        const totalPlayers = players.filter(p => !p.isBanned).length;
        const bannedCount = players.filter(p => p.isBanned).length;

        const systemEnabled = window.AccessControl?.isAccessControlEnabled?.() ?? true;

        container.innerHTML = `
            <div class="grid-3 mb-2" style="gap:5px;">
                <div class="dev-access-stat-tile tile-players">
                    <div class="dev-access-stat-value color-green">${totalPlayers}</div>
                    <div class="dev-access-stat-label color-green">ИГРОКИ</div>
                </div>
                <div class="dev-access-stat-tile tile-invites">
                    <div class="dev-access-stat-value color-cyan">${activeInvites.length}</div>
                    <div class="dev-access-stat-label color-cyan">КОДЫ</div>
                </div>
                <div class="dev-access-stat-tile tile-bans">
                    <div class="dev-access-stat-value color-red">${bannedCount}</div>
                    <div class="dev-access-stat-label color-red">БАНЫ</div>
                </div>
            </div>

            <div class="glass-card p-2 mb-2" style="border-color:rgba(255,215,0,0.4); background:linear-gradient(135deg, rgba(255,215,0,0.06), #090e18);">
                <b class="text-xs color-amber mb-2 block"><i class="fa-solid fa-bolt mr-1"></i> Быстрое создание кода</b>
                <div class="grid-3 mb-1" style="gap:4px;">
                    <button onclick="AppDev.quickCreate(1, 1)" class="btn btn-green btn-sm" style="font-size:8.5px; padding:6px 2px;">
                        <i class="fa-solid fa-ticket"></i> 1 / 1д
                    </button>
                    <button onclick="AppDev.quickCreate(1, 3)" class="btn btn-green btn-sm" style="font-size:8.5px; padding:6px 2px;">
                        <i class="fa-solid fa-ticket"></i> 1 / 3д
                    </button>
                    <button onclick="AppDev.quickCreate(5, 7)" class="btn btn-cyan btn-sm" style="font-size:8.5px; padding:6px 2px;">
                        <i class="fa-solid fa-users"></i> 5 / 7д
                    </button>
                </div>
                <div class="sub-label" style="font-size:8.5px; color:#94a3b8;">
                    Код автоматически копируется в буфер обмена
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <div class="flex-between mb-2">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-ticket mr-1"></i> Инвайт-коды (${invites.length})</b>
                    <button onclick="AppDev.loadAccessData()" class="btn btn-dark btn-auto btn-sm" style="font-size:8px; padding:3px 8px;">
                        <i class="fa-solid fa-rotate"></i>
                    </button>
                </div>
                <div style="max-height:280px; overflow-y:auto;">
                    ${invites.length === 0 ? `
                        <div class="sub-label text-center py-4" style="font-size:10px;">Нет созданных кодов</div>
                    ` : invites.slice(0, 30).map(inv => {
                        const status = inv.isExpired ? 'ИСТЁК' : (inv.isUsed ? 'ИСПОЛЬЗОВАН' : 'АКТИВЕН');
                        const statusClass = inv.isExpired ? 'color-red' : (inv.isUsed ? 'color-amber' : 'color-green');
                        const daysLeft = inv.expiresAt ? Math.max(0, Math.ceil((inv.expiresAt - Date.now()) / 86400000)) : 0;
                        const cardClass = inv.isExpired ? 'is-expired' : (inv.isUsed ? 'is-used' : '');

                        return `
                            <div class="dev-access-invite-card ${cardClass}">
                                <div class="flex-between mb-1">
                                    <div class="flex-gap" style="align-items:center; gap:6px;">
                                        <b class="dev-access-invite-code">${inv.code}</b>
                                        <button onclick="AppDev.copyCode('${inv.code}')" class="btn btn-dark btn-auto" style="font-size:8px; padding:2px 6px; min-height:auto;" title="Копировать">
                                            <i class="fa-solid fa-copy"></i>
                                        </button>
                                    </div>
                                    <span class="${statusClass}" style="font-size:8.5px; font-weight:900; letter-spacing:0.3px;">${status}</span>
                                </div>
                                <div class="flex-between" style="font-size:8.5px;">
                                    <span class="sub-label">Использовано: <b>${inv.usedCount || 0}/${inv.maxUses || 1}</b></span>
                                    <span class="sub-label">${inv.isActive ? `⏳ ${daysLeft} дн.` : ''}</span>
                                </div>
                                ${inv.isActive ? `
                                    <button onclick="AppDev.deleteCode('${inv.code}')" class="btn btn-red btn-sm w-full mt-1" style="font-size:8.5px; padding:3px;">
                                        <i class="fa-solid fa-trash"></i> Удалить
                                    </button>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-green mb-2 block"><i class="fa-solid fa-users mr-1"></i> Whitelist игроков (${players.length})</b>
                <div style="max-height:320px; overflow-y:auto;">
                    ${players.length === 0 ? `
                        <div class="sub-label text-center py-4" style="font-size:10px;">Пока никого нет</div>
                    ` : players.map(p => `
                        <div class="dev-access-player-card ${p.isBanned ? 'is-banned' : ''}">
                            <div class="flex-between mb-1">
                                <div style="min-width:0; flex:1;">
                                    <b class="text-xs ${p.isBanned ? 'color-red' : 'color-green'}" style="font-size:11px;">${p.name || 'Без имени'}</b>
                                    <div class="sub-label font-mono" style="font-size:8px;">ID: ${p.telegramId}</div>
                                </div>
                                ${p.isBanned ? '<span class="tag-badge bg-tag-red" style="font-size:7px;">BAN</span>' : ''}
                            </div>
                            <div class="grid-2" style="gap:4px; margin-top:4px;">
                                <button onclick="AppDev.toggleBan('${p.telegramId}')" class="btn ${p.isBanned ? 'btn-green' : 'btn-amber'} btn-sm" style="font-size:8.5px; padding:3px;">
                                    ${p.isBanned ? '✓ Разбанить' : '🚫 Забанить'}
                                </button>
                                <button onclick="AppDev.revoke('${p.telegramId}')" class="btn btn-red btn-sm" style="font-size:8.5px; padding:3px;">
                                    🗑 Отозвать
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="glass-card p-2" style="border-color:rgba(255,179,0,0.3);">
                <b class="text-xs color-amber mb-1 block"><i class="fa-solid fa-cog mr-1"></i> Система доступа</b>
                <div class="sub-label mb-2" style="font-size:9px;">
                    Статус: <b class="${systemEnabled ? 'color-green' : 'color-red'}">${systemEnabled ? 'ВКЛЮЧЕНА' : 'ОТКЛЮЧЕНА'}</b>
                </div>
                ${systemEnabled ? `
                    <button onclick="AppDev.disableAccessSystem()" class="btn btn-amber btn-sm w-full" style="font-size:9.5px;">
                        <i class="fa-solid fa-triangle-exclamation"></i> Отключить (пускать всех)
                    </button>
                ` : `
                    <button onclick="AppDev.enableAccessSystem()" class="btn btn-green btn-sm w-full" style="font-size:9.5px;">
                        <i class="fa-solid fa-lock"></i> Включить доступ по приглашениям
                    </button>
                `}
            </div>
        `;
    },

    async quickCreate(maxUses, ttlDays) {
        if (!window.AccessControl) return showToast("AccessControl не загружен");
        const res = await window.AccessControl.createInviteCode({ maxUses, ttlDays });
        if (res.success) {
            try {
                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(res.code);
                }
            } catch (e) {}
            if (typeof showToast === 'function') showToast(`🎟 Код ${res.code} создан и скопирован!`);
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');
            setTimeout(() => this.loadAccessData(), 300);
        } else {
            if (typeof showToast === 'function') showToast(`❌ ${res.error}`);
        }
    },

    async copyCode(code) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(code);
            } else {
                const ta = document.createElement('textarea');
                ta.value = code;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            if (typeof showToast === 'function') showToast(`📋 Код ${code} скопирован`);
            if (typeof tgHaptic === 'function') tgHaptic('light');
        } catch (e) {
            if (typeof showToast === 'function') showToast('❌ Не удалось скопировать');
        }
    },

    async deleteCode(code) {
        if (!confirm(`Удалить код ${code}?`)) return;
        if (!window.AccessControl) return;
        const res = await window.AccessControl.deleteInvite(code);
        if (res.success) {
            if (typeof showToast === 'function') showToast('🗑 Код удалён');
            setTimeout(() => this.loadAccessData(), 300);
        } else {
            if (typeof showToast === 'function') showToast(`❌ ${res.error}`);
        }
    },

    async toggleBan(targetUid) {
        if (!window.AccessControl) return;
        const res = await window.AccessControl.toggleBanPlayer(targetUid);
        if (res.success) {
            if (typeof showToast === 'function') showToast(res.isBanned ? '🚫 Игрок забанен' : '✓ Игрок разбанен');
            setTimeout(() => this.loadAccessData(), 300);
        } else {
            if (typeof showToast === 'function') showToast(`❌ ${res.error}`);
        }
    },

    async revoke(targetUid) {
        if (!confirm('Полностью отозвать доступ у игрока?')) return;
        if (!window.AccessControl) return;
        const res = await window.AccessControl.revokeAccess(targetUid);
        if (res.success) {
            if (typeof showToast === 'function') showToast('🗑 Доступ отозван');
            setTimeout(() => this.loadAccessData(), 300);
        } else {
            if (typeof showToast === 'function') showToast(`❌ ${res.error}`);
        }
    },

    disableAccessSystem() {
        if (!confirm('⚠️ Отключить систему доступа? ВСЕ игроки смогут играть.')) return;
        if (window.AccessControl) {
            window.AccessControl.disableAccessControl();
            if (typeof showToast === 'function') showToast('⚠️ Система доступа отключена');
            this.loadAccessData();
        }
    },

    enableAccessSystem() {
        if (window.AccessControl) {
            window.AccessControl.enableAccessControl();
            if (typeof showToast === 'function') showToast('🔒 Система доступа включена');
            this.loadAccessData();
        }
    },

    // ========================================================
    // 3. ВКЛАДКА: ОБЗОР (ГЛАВНАЯ)
    // ========================================================
    renderOverviewTab(container) {
        if (!container) return;

        const p = window.state?.player || {};
        const garage = window.state?.garage || [];
        const lots = window.state?.p2pMarketListings || [];
        const messages = p.phoneMessages || [];
        const unreadMessages = messages.filter(m => m && m.unread).length;

        const logStats = window.DevLogger ? {
            total: window.DevLogger.getAll().length,
            errors: window.DevLogger.getFiltered('error').length,
            warnings: window.DevLogger.getFiltered('warn').length
        } : { total: 0, errors: 0, warnings: 0 };

        const fbStats = window.FB_Bridge ? '✓ загружен' : '✗ НЕ загружен';
        const uid = window.TelegramAuthManager?.getVerifiedUserId() || '—';

        container.innerHTML = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,230,118,0.15), #090e18); border-color: var(--green);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-green"><i class="fa-solid fa-gauge-high mr-1"></i> ОБЗОР СОСТОЯНИЯ ИГРЫ</b>
                    <span class="tag-badge bg-tag-green">LIVE</span>
                </div>
                <div class="sub-label" style="font-size:9px;">UID: <b class="color-amber font-mono">${uid}</b></div>
            </div>

            <div class="grid-2 mb-2" style="gap:4px;">
                <div class="glass-card p-2">
                    <div class="sub-label" style="font-size:8px;">УРОВЕНЬ</div>
                    <b class="color-cyan text-xs" style="font-size:14px;">${p.level || 1}</b>
                </div>
                <div class="glass-card p-2">
                    <div class="sub-label" style="font-size:8px;">КЭШ</div>
                    <b class="color-green text-xs" style="font-size:14px;">${Number(p.cash || 0).toLocaleString()} ₽</b>
                </div>
                <div class="glass-card p-2">
                    <div class="sub-label" style="font-size:8px;">АВТОПАРК</div>
                    <b class="color-amber text-xs" style="font-size:14px;">${garage.length} авто</b>
                </div>
                <div class="glass-card p-2">
                    <div class="sub-label" style="font-size:8px;">P2P ЛОТЫ</div>
                    <b class="color-purple text-xs" style="font-size:14px;">${lots.length} шт</b>
                </div>
                <div class="glass-card p-2">
                    <div class="sub-label" style="font-size:8px;">СООБЩЕНИЯ</div>
                    <b class="color-cyan text-xs" style="font-size:14px;">${messages.length} (${unreadMessages} новых)</b>
                </div>
                <div class="glass-card p-2">
                    <div class="sub-label" style="font-size:8px;">FIREBASE</div>
                    <b class="${window.FB_Bridge ? 'color-green' : 'color-red'} text-xs" style="font-size:11px;">${fbStats}</b>
                </div>
            </div>

            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-list-ul mr-1"></i> Логи событий</b>
                    <button onclick="AppDev.switchTab('logs')" class="btn btn-dark btn-auto btn-sm" style="font-size:8px; padding:2px 8px;">Открыть →</button>
                </div>
                <div class="grid-3 text-xs" style="gap:4px;">
                    <div class="p-1 text-center" style="background:rgba(255,255,255,0.05); border-radius:6px;">
                        <div class="sub-label" style="font-size:7px;">ВСЕГО</div>
                        <b class="color-cyan">${logStats.total}</b>
                    </div>
                    <div class="p-1 text-center" style="background:rgba(255,179,0,0.1); border-radius:6px;">
                        <div class="sub-label" style="font-size:7px;">WARN</div>
                        <b class="color-amber">${logStats.warnings}</b>
                    </div>
                    <div class="p-1 text-center" style="background:rgba(255,51,102,0.1); border-radius:6px;">
                        <div class="sub-label" style="font-size:7px;">ERROR</div>
                        <b class="color-red">${logStats.errors}</b>
                    </div>
                </div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-amber mb-1 block"><i class="fa-solid fa-bolt mr-1"></i> Быстрые действия</b>
                <div class="grid-2" style="gap:4px;">
                    <button onclick="AppDev.forceSyncSave()" class="btn btn-green btn-sm" style="font-size:9px;">
                        <i class="fa-solid fa-cloud-arrow-up mr-1"></i> Sync Save
                    </button>
                    <button onclick="AppDev.forceLoadSave()" class="btn btn-amber btn-sm" style="font-size:9px;">
                        <i class="fa-solid fa-cloud-arrow-down mr-1"></i> Load Save
                    </button>
                    <button onclick="AppDev.exportAllLogsToFile()" class="btn btn-dark btn-sm" style="font-size:9px;">
                        <i class="fa-solid fa-download mr-1"></i> Экспорт логов
                    </button>
                    <button onclick="AppDev.exportStateToFile()" class="btn btn-dark btn-sm" style="font-size:9px;">
                        <i class="fa-solid fa-file-export mr-1"></i> Экспорт state
                    </button>
                </div>
            </div>
        `;
    },

    // ========================================================
    // 4. ВКЛАДКА: СТУДИЯ
    // ========================================================
    renderStudioTab(container) {
        if (!container) return;

        const hasStudio = typeof window.DevStudio !== 'undefined';
        const hasChecker = typeof window.DevDataChecker !== 'undefined';

        container.innerHTML = `
            <div class="glass-card p-3 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.15), #090e18); border-color: var(--cyan);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Авто-Студия Карточек</b>
                    <span class="tag-badge bg-tag-cyan">v1.4.0</span>
                </div>
                <div class="sub-label mb-3" style="font-size:9.5px;">
                    Создание новых лотов, кадрирование обложек, редактирование базы и экспорт data.js.
                </div>

                <div class="space-y-2">
                    <button onclick="AppDev.openStudioScreen('create')" class="btn btn-cyan w-full" style="box-shadow: 0 0 16px var(--cyan-glow);" ${hasStudio ? '' : 'disabled'}>
                        <i class="fa-solid fa-plus-circle mr-1"></i> Создать Новое Авто ${hasStudio ? '' : '(DevStudio не загружен)'}
                    </button>

                    <button onclick="AppDev.openStudioScreen('edit')" class="btn btn-purple w-full" style="box-shadow: 0 0 16px rgba(192,132,252,0.3);" ${hasStudio ? '' : 'disabled'}>
                        <i class="fa-solid fa-pen-to-square mr-1"></i> Редактор Базы Автотехники ${hasStudio ? '' : '(DevStudio не загружен)'}
                    </button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-amber mb-1 block"><i class="fa-solid fa-puzzle-piece mr-1"></i> Статус зависимостей:</b>
                <div class="space-y-1 text-xs" style="font-size:9.5px;">
                    <div class="flex-between">
                        <span>DevStudio (редактор машин)</span>
                        <b class="${hasStudio ? 'color-green' : 'color-red'}">${hasStudio ? '✓ Загружен' : '✗ Не загружен'}</b>
                    </div>
                    <div class="flex-between">
                        <span>DevDataChecker (проверка данных)</span>
                        <b class="${hasChecker ? 'color-green' : 'color-red'}">${hasChecker ? '✓ Загружен' : '✗ Не загружен'}</b>
                    </div>
                </div>
            </div>
        `;
    },

    openStudioScreen(screen) {
        if (typeof window.DevStudio === 'undefined') {
            return showToast("⚠️ DevStudio не загружен");
        }
        try {
            if (typeof window.DevStudio.switchScreen === 'function') {
                window.DevStudio.switchScreen(screen);
            }
            if (typeof window.DevStudio.open === 'function') {
                window.DevStudio.open();
            }
        } catch (e) {
            console.error('[AppDev] Ошибка открытия DevStudio:', e);
            showToast(`❌ Ошибка: ${e.message}`);
        }
    },

    // ========================================================
    // 5. ВКЛАДКА: ЧИТ-КЭШ
    // ========================================================
    renderResourcesTab(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-green block mb-2"><i class="fa-solid fa-ruble-sign mr-1"></i> Наличность:</b>
                <div class="grid-4 mb-2" style="gap:4px;">
                    <button onclick="AppDev.quickCash(-100000)" class="btn btn-dark btn-sm" style="font-size:9px;">-100k</button>
                    <button onclick="AppDev.quickCash(100000)" class="btn btn-green btn-sm" style="font-size:9px;">+100k</button>
                    <button onclick="AppDev.quickCash(1000000)" class="btn btn-green btn-sm" style="font-size:9px;">+1M</button>
                    <button onclick="AppDev.quickCash(10000000)" class="btn btn-green btn-sm" style="font-size:9px;">+10M</button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-cyan block mb-2"><i class="fa-solid fa-star mr-1"></i> Stars:</b>
                <div class="grid-4 mb-2" style="gap:4px;">
                    <button onclick="AppDev.quickStars(-10)" class="btn btn-dark btn-sm" style="font-size:9px;">-10</button>
                    <button onclick="AppDev.quickStars(10)" class="btn btn-cyan btn-sm" style="font-size:9px;">+10</button>
                    <button onclick="AppDev.quickStars(100)" class="btn btn-cyan btn-sm" style="font-size:9px;">+100</button>
                    <button onclick="AppDev.quickStars(500)" class="btn btn-cyan btn-sm" style="font-size:9px;">+500</button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-amber block mb-2"><i class="fa-solid fa-award mr-1"></i> Уровень:</b>
                <div class="grid-3 mb-2" style="gap:4px;">
                    <button onclick="AppDev.quickLevel(-1)" class="btn btn-dark btn-sm" style="font-size:9px;">-1 Ур</button>
                    <button onclick="AppDev.quickLevel(1)" class="btn btn-amber btn-sm" style="font-size:9px;">+1 Ур</button>
                    <button onclick="AppDev.quickLevel(10)" class="btn btn-amber btn-sm" style="font-size:9px;">+10 Ур</button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-purple block mb-2"><i class="fa-solid fa-handshake mr-1"></i> Связи и Талоны:</b>
                <div class="grid-3 mb-2" style="gap:4px;">
                    <button onclick="AppDev.quickConn(1)" class="btn btn-purple btn-sm" style="font-size:9px;">+1 🤝</button>
                    <button onclick="AppDev.quickTickets(25)" class="btn btn-purple btn-sm" style="font-size:9px;">+25 🎟</button>
                    <button onclick="AppDev.quickSuperSpinTickets(5)" class="btn btn-purple btn-sm" style="font-size:9px;">+5 🎫</button>
                </div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-green block mb-1"><i class="fa-solid fa-bolt mr-1"></i> Восстановление:</b>
                <div class="grid-2" style="gap:4px;">
                    <button onclick="AppDev.restoreAllStats()" class="btn btn-green btn-sm" style="font-size:9px;">100% Бак/Еда/Кураж</button>
                    <button onclick="AppDev.giveAllTools()" class="btn btn-dark btn-sm" style="font-size:9px;">Все приборы</button>
                </div>
            </div>
        `;
    },

    quickCash(amount) {
        if (!window.state || !window.state.player) return showToast("State не загружен");
        if (window.MoneyManager) {
            if (amount > 0) window.MoneyManager.earn(amount, 'DEV: читерство');
            else window.MoneyManager.spend(-amount, 'DEV: читерство', { force: true });
        } else {
            window.state.player.cash = Math.max(0, (window.state.player.cash || 0) + amount);
        }
        this.refreshHeader();
        showToast((amount > 0 ? '+' : '') + amount.toLocaleString() + ' ₽');
    },

    quickStars(amount) {
        if (!window.state || !window.state.player) return;
        if (window.MoneyManager) {
            if (amount > 0) window.MoneyManager.earn(amount, 'DEV: читерство', { currency: 'stars', silent: true });
            else window.MoneyManager.spend(-amount, 'DEV: читерство', { currency: 'stars', silent: true, force: true });
        } else {
            window.state.player.stars = Math.max(0, (window.state.player.stars || 0) + amount);
        }
        this.refreshHeader();
        showToast((amount > 0 ? '+' : '') + amount + ' ⭐');
    },

    quickLevel(amount) {
        if (!window.state || !window.state.player) return;
        window.state.player.level = Math.max(1, Math.min(100, (window.state.player.level || 1) + amount));
        if (typeof updateLevelGatesUI === 'function') updateLevelGatesUI();
        this.refreshHeader();
        showToast((amount > 0 ? '+' : '') + amount + ' Ур.');
    },

    quickConn(amount) {
        if (!window.state || !window.state.player) return;
        window.state.player.connections = Math.max(0, (window.state.player.connections || 0) + amount);
        this.refreshHeader();
        showToast('+' + amount + ' 🤝');
    },

    quickTickets(amount) {
        if (!window.state || !window.state.player) return;
        const max = window.state.player.maxExpressTickets || 25;
        window.state.player.expressTickets = Math.min(max, (window.state.player.expressTickets || 0) + amount);
        this.refreshHeader();
        showToast('+' + amount + ' 🎟');
    },

    quickSuperSpinTickets(amount) {
        if (!window.state || !window.state.player) return;
        window.state.player.superSpinTickets = (window.state.player.superSpinTickets || 0) + amount;
        this.refreshHeader();
        showToast('+' + amount + ' 🎫');
    },

    refreshHeader() {
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderProfileAnalytics === 'function') renderProfileAnalytics();
    },

    restoreAllStats() {
        if (!window.state.player) window.state.player = {};
        window.state.player.fuel = 100;
        window.state.player.hunger = 100;
        window.state.player.mood = 100;
        window.state.player.expressTickets = window.state.player.maxExpressTickets || 25;
        if (typeof saveState === 'function') saveState();
        this.refreshHeader();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Топливо, сытость и кураж восстановлены на 100%!");
    },

    giveAllTools() {
        if (!window.state.player) window.state.player = {};
        if (!window.state.player.tools) window.state.player.tools = {};
        if (!window.state.player.toolsWear) window.state.player.toolsWear = {};
        ['gauge', 'gauge_pro', 'obd', 'obd_launch', 'endoscope', 'compressor', 'battery_tester'].forEach(id => {
            window.state.player.tools[id] = true;
            window.state.player.toolsWear[id] = 100;
        });
        if (typeof saveState === 'function') saveState();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Все диагностические приборы выданы (100% ресурс)!");
    },

    // ========================================================
    // 6. ВКЛАДКА: ДЕБАГ-САНДБОКС
    // ========================================================
    renderSandboxTab(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-cyan block mb-2"><i class="fa-solid fa-arrows-rotate mr-1"></i> Авторынок:</b>
                <div class="space-y-1">
                    <button onclick="AppDev.regenMarket()" class="btn btn-dark btn-sm w-full" style="font-size:9px;">
                        Респавн авторынка (NPC)
                    </button>
                    <button onclick="AppDev.triggerMarketNews()" class="btn btn-cyan btn-sm w-full" style="font-size:9px;">
                        Случайная рыночная новость
                    </button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-red block mb-2"><i class="fa-solid fa-shield-halved mr-1"></i> ДПС и Розыск:</b>
                <div class="space-y-1">
                    <button onclick="AppDev.clearPoliceHeat()" class="btn btn-dark btn-sm w-full" style="font-size:9px;">
                        Сбросить розыск + 5 дней иммунитета
                    </button>
                    <button onclick="AppDev.freeAllImpoundCars()" class="btn btn-green btn-sm w-full" style="font-size:9px;">
                        Забрать все машины со штрафстоянки
                    </button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-amber block mb-2"><i class="fa-solid fa-clock mr-1"></i> Время:</b>
                <button onclick="AppDev.advanceDay()" class="btn btn-amber btn-sm w-full" style="font-size:9px;">
                    Перемотать день (00:00)
                </button>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-purple block mb-2"><i class="fa-solid fa-flask mr-1"></i> Симуляция P2P:</b>
                <div class="space-y-1">
                    <button onclick="AppDev.simulateBuyOwnLot()" class="btn btn-purple btn-sm w-full" style="font-size:9px;">
                        Симулировать покупку моего лота ботом
                    </button>
                    <button onclick="AppDev.clearP2PLots()" class="btn btn-dark btn-sm w-full" style="font-size:9px;">
                        Очистить все мои лоты
                    </button>
                </div>
            </div>
        `;
    },

    regenMarket() {
        if (typeof populateMarketFeed === 'function') {
            populateMarketFeed();
            showToast("Рынок перегенерирован!");
        }
    },

    triggerMarketNews() {
        if (typeof triggerMarketNewsEvent === 'function') {
            triggerMarketNewsEvent();
            showToast("Новость применена!");
        } else {
            showToast("⚠️ Функция новостей не найдена");
        }
    },

    clearPoliceHeat() {
        if (!window.state.player) window.state.player = {};
        window.state.player.consecutiveRaces = 0;
        window.state.player.policeImmunityDays = 5;
        window.state.player.trafficFines = 0;
        if (typeof saveState === 'function') saveState();
        this.refreshHeader();
        showToast("Внимание ДПС сброшено. Иммунитет на 5 дней!");
    },

    freeAllImpoundCars() {
        let count = 0;
        if (window.state.garage) {
            window.state.garage.forEach(car => {
                if (car && car.impounded) {
                    car.impounded = false;
                    car.impoundDaysLeft = 0;
                    count++;
                }
            });
        }
        if (typeof saveState === 'function') saveState();
        if (typeof renderGarage === 'function') renderGarage();
        showToast(`Со спецстоянки вызволено ${count} авто!`);
    },

    advanceDay() {
        if (typeof executeDayCycleMidnight === 'function') {
            executeDayCycleMidnight(new Date());
            showToast("🌙 День перемотан!");
        } else {
            showToast("⚠️ Функция day cycle не найдена");
        }
    },

    simulateBuyOwnLot() {
        const myUid = window.TelegramAuthManager?.getVerifiedUserId() || window.state?.player?.uid;
        const myLots = (window.state.p2pMarketListings || []).filter(l => String(l.sellerId) === String(myUid));

        if (myLots.length === 0) {
            return showToast("⚠️ У вас нет лотов на бирже");
        }

        const lot = myLots[0];

        const notif = {
            id: 'dev_notif_' + Date.now(),
            type: 'deal_payout',
            toUser: String(myUid),
            title: lot.name,
            text: `DEV: Бот купил «${lot.name}»`,
            amount: lot.price,
            offerId: lot.id,
            read: false,
            claimed: false,
            timestamp: Date.now()
        };

        if (window.NotificationCenter && typeof window.NotificationCenter.handleIncomingNotification === 'function') {
            window.NotificationCenter.handleIncomingNotification(notif);
            showToast(`✓ Симулирована продажа «${lot.name}» за ${Number(lot.price).toLocaleString()} ₽`);
        }
    },

    clearP2PLots() {
        const myUid = window.TelegramAuthManager?.getVerifiedUserId() || window.state?.player?.uid;
        const before = (window.state.p2pMarketListings || []).length;
        window.state.p2pMarketListings = (window.state.p2pMarketListings || []).filter(l => String(l.sellerId) !== String(myUid));
        const after = window.state.p2pMarketListings.length;
        if (typeof saveState === 'function') saveState();
        showToast(`Удалено лотов: ${before - after}`);
    },

    // ========================================================
    // 7. ВКЛАДКА: ДАННЫЕ
    // ========================================================
    renderDataCheckTab(container) {
        if (!container) return;

        if (typeof window.DevDataChecker === 'undefined') {
            container.innerHTML = `
                <div class="glass-card p-3 text-center" style="border-color: var(--amber);">
                    <b class="color-amber text-xs">DevDataChecker не загружен</b>
                    <div class="sub-label mt-1" style="font-size:9px;">Проверьте js/dev/dev-data-checker.js</div>
                </div>
            `;
            return;
        }

        try {
            window.DevDataChecker.render(container);
        } catch (e) {
            container.innerHTML = `
                <div class="glass-card p-3" style="border-color: var(--red);">
                    <b class="color-red text-xs">Ошибка DevDataChecker</b>
                    <div class="sub-label mt-1" style="font-size:9px;">${String(e.message || e).substring(0, 200)}</div>
                </div>
            `;
        }
    },

    // ========================================================
    // 8. ВКЛАДКА: ЛОГИ
    // ========================================================
    renderLogsTab(container) {
        if (!container) return;

        if (!window.DevLogger) {
            container.innerHTML = `<div class="glass-card p-3 text-center sub-label">DevLogger не загружен</div>`;
            return;
        }

        const allEvents = window.DevLogger.getAll();
        const errorCount = allEvents.filter(e => e.type === 'error').length;
        const warnCount = allEvents.filter(e => e.type === 'warn').length;
        const saveCount = allEvents.filter(e => e.type === 'save').length;
        const firestoreCount = allEvents.filter(e => e.type === 'firestore').length;

        container.innerHTML = `
            <div class="glass-card p-2 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.12), #090e18); border-color: var(--cyan);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-list-ul mr-1"></i> Живой лог событий</b>
                    <span class="tag-badge bg-tag-cyan">${allEvents.length}/200</span>
                </div>
                <div class="grid-4" style="gap:4px;">
                    <div class="p-1 text-center" style="background:rgba(255,51,102,0.1); border-radius:6px;">
                        <div class="sub-label" style="font-size:7px;">ОШИБКИ</div>
                        <div class="color-red font-bold" style="font-size:12px;">${errorCount}</div>
                    </div>
                    <div class="p-1 text-center" style="background:rgba(255,179,0,0.1); border-radius:6px;">
                        <div class="sub-label" style="font-size:7px;">WARN</div>
                        <div class="color-amber font-bold" style="font-size:12px;">${warnCount}</div>
                    </div>
                    <div class="p-1 text-center" style="background:rgba(0,230,118,0.1); border-radius:6px;">
                        <div class="sub-label" style="font-size:7px;">SAVE</div>
                        <div class="color-green font-bold" style="font-size:12px;">${saveCount}</div>
                    </div>
                    <div class="p-1 text-center" style="background:rgba(192,132,252,0.1); border-radius:6px;">
                        <div class="sub-label" style="font-size:7px;">FIRESTORE</div>
                        <div class="color-purple font-bold" style="font-size:12px;">${firestoreCount}</div>
                    </div>
                </div>
            </div>

            <div class="grid-4 mb-1" style="gap:3px;">
                <button onclick="AppDev.setLogFilter('all')" class="btn ${this.logFilter === 'all' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Все</button>
                <button onclick="AppDev.setLogFilter('error')" class="btn ${this.logFilter === 'error' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Ошибки</button>
                <button onclick="AppDev.setLogFilter('save')" class="btn ${this.logFilter === 'save' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Save</button>
                <button onclick="AppDev.setLogFilter('firestore')" class="btn ${this.logFilter === 'firestore' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Firestore</button>
            </div>
            <div class="grid-4 mb-2" style="gap:3px;">
                <button onclick="AppDev.setLogFilter('tab')" class="btn ${this.logFilter === 'tab' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Tab</button>
                <button onclick="AppDev.setLogFilter('cat')" class="btn ${this.logFilter === 'cat' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Cat</button>
                <button onclick="AppDev.setLogFilter('event')" class="btn ${this.logFilter === 'event' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Event</button>
                <button onclick="AppDev.setLogFilter('system')" class="btn ${this.logFilter === 'system' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">System</button>
            </div>

            <input type="text" id="devLogSearchInput" value="${this.logSearchQuery}"
                   oninput="AppDev.setLogSearch(this.value)"
                   placeholder="🔍 Поиск по тексту лога..."
                   class="chat-input mb-2"
                   style="font-size:10.5px; padding:6px 8px;">

            <div class="grid-3 mb-2" style="gap:3px;">
                <button onclick="AppDev.copyLogToClipboard()" class="btn btn-cyan btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-copy"></i> Копи
                </button>
                <button onclick="AppDev.downloadLog()" class="btn btn-dark btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-download"></i> Скачать
                </button>
                <button onclick="AppDev.clearLog()" class="btn btn-red btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-trash"></i> Очист.
                </button>
            </div>

            <div id="devLogsListContainer" class="space-y-1" style="max-height: 50vh; overflow-y: auto;">
                ${this.renderLogsListHtml()}
            </div>
        `;
    },

    renderLogsListHtml() {
        if (!window.DevLogger) return '';

        const filtered = window.DevLogger.getFiltered(this.logFilter, this.logSearchQuery);

        if (filtered.length === 0) {
            return `<div class="glass-card p-3 text-center sub-label" style="font-size:10px;">Нет событий под текущий фильтр.</div>`;
        }

        const sorted = [...filtered].reverse();

        return sorted.map(e => {
            let color = '#94a3b8';
            let bg = 'rgba(255,255,255,0.03)';
            let borderColor = 'rgba(255,255,255,0.08)';

            if (e.type === 'error') { color = '#ff3366'; bg = 'rgba(255,51,102,0.08)'; borderColor = 'rgba(255,51,102,0.35)'; }
            else if (e.type === 'warn') { color = '#ffb300'; bg = 'rgba(255,179,0,0.06)'; borderColor = 'rgba(255,179,0,0.3)'; }
            else if (e.type === 'save') { color = '#00e676'; bg = 'rgba(0,230,118,0.06)'; borderColor = 'rgba(0,230,118,0.3)'; }
            else if (e.type === 'firestore') { color = '#c084fc'; bg = 'rgba(192,132,252,0.08)'; borderColor = 'rgba(192,132,252,0.3)'; }
            else if (e.type === 'tab') { color = '#00f2fe'; bg = 'rgba(0,242,254,0.06)'; borderColor = 'rgba(0,242,254,0.3)'; }
            else if (e.type === 'cat') { color = '#67e8f9'; bg = 'rgba(103,232,249,0.06)'; borderColor = 'rgba(103,232,249,0.25)'; }
            else if (e.type === 'event') { color = '#fbbf24'; bg = 'rgba(251,191,36,0.06)'; borderColor = 'rgba(251,191,36,0.3)'; }
            else if (e.type === 'system') { color = '#00e676'; bg = 'rgba(0,230,118,0.08)'; borderColor = 'rgba(0,230,118,0.4)'; }

            return `
                <div class="glass-card p-2" style="background:${bg}; border:1px solid ${borderColor}; border-left:3px solid ${color};">
                    <div class="flex-between mb-1">
                        <span class="tag-badge" style="background:${bg}; color:${color}; border:1px solid ${borderColor}; font-size:7px; padding:1px 5px;">
                            ${e.type.toUpperCase()}
                        </span>
                        <span class="sub-label font-mono" style="font-size:8px;">${e.time}</span>
                    </div>
                    <div class="sub-label" style="font-size:10px; color:#f1f5f9; word-break: break-word; line-height:1.35;">
                        ${this._escapeHtml(e.message)}
                    </div>
                </div>
            `;
        }).join('');
    },

    _escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    setLogFilter(filter) {
        this.logFilter = filter;
        if (typeof playSound === 'function') playSound('tick');
        const box = document.getElementById('devLogsListContainer');
        if (box) box.innerHTML = this.renderLogsListHtml();
        this.render(document.getElementById('phoneAppContainer'));
    },

    setLogSearch(query) {
        this.logSearchQuery = query;
        const box = document.getElementById('devLogsListContainer');
        if (box) box.innerHTML = this.renderLogsListHtml();
    },

    clearLog() {
        if (!window.DevLogger) return;
        if (!confirm('Очистить весь лог событий?')) return;
        window.DevLogger.clear();
        if (typeof playSound === 'function') playSound('tick');
        this.render(document.getElementById('phoneAppContainer'));
    },

    copyLogToClipboard() {
        if (!window.DevLogger) return;
        const text = window.DevLogger.exportAsText();
        if (!text) {
            showToast('Лог пустой');
            return;
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('✓ Лог скопирован в буфер');
                if (typeof playSound === 'function') playSound('win');
            }).catch(() => this._fallbackCopy(text));
        } else {
            this._fallbackCopy(text);
        }
    },

    _fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast('✓ Лог скопирован');
        } catch (e) {
            showToast('❌ Не удалось скопировать');
        }
        document.body.removeChild(ta);
    },

    downloadLog() {
        if (!window.DevLogger) return;
        const text = window.DevLogger.exportAsText();
        if (!text) {
            showToast('Лог пустой');
            return;
        }
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'perekup_dev_log_' + Date.now() + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('📥 Лог скачан');
    },

    // ========================================================
    // 9. ВКЛАДКА: СОБЫТИЯ (EventBus)
    // ========================================================
    renderEventsTab(container) {
        if (!container) return;

        if (!window.EventBus) {
            container.innerHTML = `<div class="glass-card p-3 text-center sub-label">EventBus не загружен</div>`;
            return;
        }

        const history = window.EventBus.getHistory(this.eventFilter);
        const stats = window.EventBus.getStats();

        let statsHtml = Object.entries(stats).map(([event, count]) => `
            <div class="flex-between text-xs" style="font-size:9px; padding:2px 0; border-bottom:1px dashed rgba(255,255,255,0.05);">
                <span class="font-mono color-cyan">${event}</span>
                <b class="color-green">${count}</b>
            </div>
        `).join('') || '<div class="sub-label text-center py-2">Нет активных подписок</div>';

        const historyHtml = [...history].reverse().slice(0, 50).map(h => `
            <div class="glass-card p-2" style="background:rgba(251,191,36,0.04); border-left:3px solid #fbbf24;">
                <div class="flex-between mb-1">
                    <span class="tag-badge bg-tag-amber" style="font-size:7px;">${h.event}</span>
                    <span class="sub-label font-mono" style="font-size:8px;">${new Date(h.ts).toLocaleTimeString('ru-RU')}</span>
                </div>
                <div class="sub-label" style="font-size:9px; color:#cbd5e1; font-family:monospace; word-break:break-all;">
                    ${JSON.stringify(h.payload).substring(0, 200)}
                </div>
                <div class="sub-label" style="font-size:7px; color:#64748b;">Слушателей: ${h.listenersCount}</div>
            </div>
        `).join('') || '<div class="glass-card p-3 text-center sub-label" style="font-size:10px;">Пока событий не было</div>';

        container.innerHTML = `
            <div class="glass-card p-2 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(251,191,36,0.14), #090e18); border-color: #fbbf24;">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-bolt mr-1"></i> EventBus — активные подписки</b>
                    <span class="tag-badge bg-tag-amber">LIVE</span>
                </div>
                <div class="sub-label mb-2" style="font-size:9px;">Модулей подписано: <b>${Object.keys(stats).length}</b></div>
                <div style="max-height:180px; overflow-y:auto;">${statsHtml}</div>
            </div>

            <div class="glass-card p-2 mb-2">
                <div class="flex-between mb-2">
                    <b class="text-xs color-cyan">История (последние 50)</b>
                    <button onclick="AppDev.clearEvents()" class="btn btn-dark btn-auto btn-sm" style="font-size:8px;">Очистить</button>
                </div>
                <input type="text" value="${this.eventFilter}"
                       oninput="AppDev.setEventFilter(this.value)"
                       placeholder="🔍 Фильтр по имени события..."
                       class="chat-input mb-2" style="font-size:10px; padding:5px 8px;">
                <div class="space-y-1" style="max-height:40vh; overflow-y:auto;">
                    ${historyHtml}
                </div>
            </div>
        `;
    },

    setEventFilter(filter) {
        this.eventFilter = filter;
        this.render(document.getElementById('phoneAppContainer'));
    },

    clearEvents() {
        if (window.EventBus) {
            window.EventBus.clearHistory();
            showToast("История событий очищена");
            this.render(document.getElementById('phoneAppContainer'));
        }
    },

    // ========================================================
    // 10. ВКЛАДКА: ДЕНЬГИ (MoneyManager)
    // ========================================================
    renderMoneyTab(container) {
        if (!container) return;

        if (!window.MoneyManager) {
            container.innerHTML = `<div class="glass-card p-3 text-center sub-label">MoneyManager не загружен</div>`;
            return;
        }

        const balance = window.MoneyManager.getBalance();
        const stars = window.MoneyManager.getStars();
        const tickets = window.MoneyManager.getSuperSpinTickets();
        const conn = window.MoneyManager.getConnections();

        container.innerHTML = `
            <div class="glass-card p-2 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,230,118,0.14), #090e18); border-color: var(--green);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-green"><i class="fa-solid fa-ruble-sign mr-1"></i> MoneyManager — Единый менеджер</b>
                    <span class="tag-badge bg-tag-green">v1.0.0</span>
                </div>
                <div class="sub-label mb-2" style="font-size:9px;">Все изменения через MoneyManager. Логируется в bankHistory.</div>
            </div>

            <div class="grid-2 mb-2" style="gap:4px;">
                <div class="glass-card p-2">
                    <div class="sub-label" style="font-size:8px;">КЭШ</div>
                    <b class="color-green text-xs" style="font-size:14px;">${balance.toLocaleString()} ₽</b>
                </div>
                <div class="glass-card p-2">
                    <div class="sub-label" style="font-size:8px;">STARS</div>
                    <b class="color-cyan text-xs" style="font-size:14px;">${stars}</b>
                </div>
                <div class="glass-card p-2">
                    <div class="sub-label" style="font-size:8px;">БИЛЕТЫ СУПЕРСПИНА</div>
                    <b class="color-amber text-xs" style="font-size:14px;">${tickets}</b>
                </div>
                <div class="glass-card p-2">
                    <div class="sub-label" style="font-size:8px;">СВЯЗИ</div>
                    <b class="color-purple text-xs" style="font-size:14px;">${conn}</b>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-cyan mb-1 block">Проверка операций</b>
                <div class="grid-2 mb-2" style="gap:4px;">
                    <button onclick="AppDev.testMoneyEarn()" class="btn btn-green btn-sm" style="font-size:9px;">
                        +10,000 ₽ (earn)
                    </button>
                    <button onclick="AppDev.testMoneySpend()" class="btn btn-red btn-sm" style="font-size:9px;">
                        -5,000 ₽ (spend)
                    </button>
                </div>
                <div class="sub-label" style="font-size:8.5px; color:#94a3b8;">
                    После операции проверьте вкладку «СОБЫТИЯ» — там должен появиться <code style="color:#fbbf24;">money:changed</code>.
                </div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-amber mb-1 block">История банка (последние 10)</b>
                <div class="space-y-1" style="max-height:30vh; overflow-y:auto;">
                    ${(window.state?.player?.bankHistory || []).slice(0, 10).map(tx => `
                        <div class="flex-between p-1" style="background:rgba(255,255,255,0.03); border-radius:6px; font-size:9px;">
                            <div>
                                <b style="font-size:9px;">${tx.title}</b>
                                <div class="sub-label" style="font-size:7.5px;">${tx.time || '—'}</div>
                            </div>
                            <b class="${tx.isIncome ? 'color-green' : 'color-red'}">${tx.isIncome ? '+' : '-'}${Number(tx.amount).toLocaleString()} ₽</b>
                        </div>
                    `).join('') || '<div class="sub-label text-center py-2" style="font-size:9px;">История пуста</div>'}
                </div>
            </div>
        `;
    },

    testMoneyEarn() {
        if (window.MoneyManager) {
            window.MoneyManager.earn(10000, 'DEV: тест earn');
            showToast("+10,000 ₽ (earn)");
        }
    },

    testMoneySpend() {
        if (window.MoneyManager) {
            window.MoneyManager.spend(5000, 'DEV: тест spend');
            showToast("-5,000 ₽ (spend)");
        }
    },

    // ========================================================
    // 11. ВКЛАДКА: STATE
    // ========================================================
    renderStateTab(container) {
        if (!container) return;

        if (!window.state) {
            container.innerHTML = `<div class="glass-card p-3 text-center sub-label">state не загружен</div>`;
            return;
        }

        const summary = this._buildStateSummary();

        container.innerHTML = `
            <div class="glass-card p-2 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,230,118,0.12), #090e18); border-color: var(--green);">
                <b class="text-xs color-green"><i class="fa-solid fa-eye mr-1"></i> Снимок игрового state</b>
                <div class="sub-label mt-1" style="font-size:9px;">Обновляется при каждом открытии вкладки</div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-cyan block mb-2">📊 Сводка:</b>
                <div class="space-y-1 text-xs" style="font-size:10px;">
                    ${summary.map(row => `
                        <div class="flex-between">
                            <span class="sub-label">${row.label}</span>
                            <b class="${row.color || ''}">${row.value}</b>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="grid-3 mb-2" style="gap:3px;">
                <button onclick="AppDev.render(document.getElementById('phoneAppContainer'))" class="btn btn-cyan btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-rotate"></i> Обновить
                </button>
                <button onclick="AppDev.copyStateJson()" class="btn btn-dark btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-copy"></i> JSON
                </button>
                <button onclick="AppDev.downloadStateJson()" class="btn btn-green btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-download"></i> Скачать
                </button>
            </div>

            <input type="text" id="devStateSearchInput" value="${this.stateSearchQuery}"
                   oninput="AppDev.setStateSearch(this.value)"
                   placeholder="🔍 Фильтр по ключам (garage, marketFeed, cash)"
                   class="chat-input mb-2"
                   style="font-size:10.5px; padding:6px 8px;">

            <div id="devStateTreeContainer" class="glass-card p-2" style="background:#050914; border:1px solid rgba(0,242,254,0.2); max-height: 50vh; overflow-y:auto;">
                ${this.renderStateTreeHtml()}
            </div>
        `;
    },

    _buildStateSummary() {
        const s = window.state || {};
        const p = s.player || {};
        return [
            { label: 'Имя игрока', value: p.name || '—', color: 'color-cyan' },
            { label: 'Уровень', value: p.level || 1, color: 'color-cyan' },
            { label: 'День', value: p.day || 1, color: 'color-amber' },
            { label: 'Кэш', value: (p.cash || 0).toLocaleString() + ' ₽', color: 'color-green' },
            { label: 'Stars', value: p.stars || 0, color: 'color-green' },
            { label: 'Гараж', value: (s.garage || []).length + ' авто', color: 'color-amber' },
            { label: 'Площадка продаж', value: (s.salesLot || []).length + ' лотов', color: 'color-amber' },
            { label: 'Лента рынка', value: (s.marketFeed || []).length + ' лотов', color: 'color-purple' },
            { label: 'P2P лоты', value: (s.p2pMarketListings || []).length, color: 'color-purple' },
            { label: 'Сообщения в телефоне', value: (p.phoneMessages || []).length, color: 'color-purple' },
            { label: 'Почта (не распаковано)', value: (p.mailbox || []).filter(m => m && !m.claimed).length, color: 'color-amber' },
            { label: 'Склад авто', value: (p.warehouse?.cars || []).length + ' / ' + (p.warehouse?.maxCars || 6), color: 'color-cyan' },
            { label: 'Парковка авто', value: (p.paidParking?.cars || []).length + ' / ' + (p.paidParking?.maxCars || 3), color: 'color-amber' },
            { label: 'Бизнесы куплены', value: (s.businesses || []).filter(b => b && b.level > 0).length, color: 'color-green' },
            { label: 'Размер JSON', value: this._stateSizeKb() + ' KB', color: 'color-cyan' },
            { label: '__IS_RESETTING__', value: String(!!window.__IS_RESETTING__), color: window.__IS_RESETTING__ ? 'color-red' : 'color-green' }
        ];
    },

    _stateSizeKb() {
        try {
            return Math.round(JSON.stringify(window.state).length / 1024);
        } catch (e) { return '?'; }
    },

    renderStateTreeHtml() {
        if (!window.state) return '';

        const query = (this.stateSearchQuery || '').trim().toLowerCase();
        const maxDepth = 3;
        const maxKeys = 40;

        return this._renderObjectAsTree(window.state, '', 0, maxDepth, maxKeys, query);
    },

    _renderObjectAsTree(obj, path, depth, maxDepth, maxKeys, query) {
        if (depth > maxDepth) return '';
        if (!obj || typeof obj !== 'object') return '';

        if (query && depth > 0) {
            const pathMatch = path.toLowerCase().includes(query);
            if (!pathMatch) {
                const innerMatch = this._hasInnerMatch(obj, query, depth + 1, maxDepth);
                if (!innerMatch) return '';
            }
        }

        const keys = Object.keys(obj).slice(0, maxKeys);
        let html = '';

        keys.forEach(key => {
            const val = obj[key];
            const fullPath = path ? path + '.' + key : key;
            const pathMatch = query && fullPath.toLowerCase().includes(query);
            const indent = depth * 12;

            if (val && typeof val === 'object') {
                const isArray = Array.isArray(val);
                const count = isArray ? val.length : Object.keys(val).length;
                const openIcon = isArray ? '📚' : '📦';
                const typeLabel = isArray ? `[${count}]` : `{${count}}`;

                html += `
                    <div style="margin-left:${indent}px; margin-bottom:3px;">
                        <div class="flex-between" style="font-size:10px;">
                            <span class="${pathMatch ? 'color-amber' : 'color-cyan'}">${openIcon} <b>${key}</b></span>
                            <span class="sub-label" style="font-size:8.5px;">${typeLabel}</span>
                        </div>
                        ${this._renderObjectAsTree(val, fullPath, depth + 1, maxDepth, maxKeys, query)}
                    </div>
                `;
            } else {
                let valStr = '';
                let colorClass = '';

                if (typeof val === 'number') {
                    valStr = val.toLocaleString();
                    colorClass = 'color-green';
                } else if (typeof val === 'boolean') {
                    valStr = String(val);
                    colorClass = val ? 'color-green' : 'color-red';
                } else if (typeof val === 'string') {
                    valStr = val.length > 50 ? val.substring(0, 50) + '…' : val;
                    colorClass = 'color-cyan';
                } else if (val === null) {
                    valStr = 'null';
                    colorClass = 'color-muted';
                } else if (val === undefined) {
                    valStr = 'undefined';
                    colorClass = 'color-red';
                } else {
                    valStr = String(val);
                }

                html += `
                    <div style="margin-left:${indent}px; margin-bottom:2px;" class="flex-between">
                        <span class="${pathMatch ? 'color-amber' : ''}" style="font-size:9.5px;">• ${key}:</span>
                        <span class="${colorClass}" style="font-size:9.5px; max-width:60%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${this._escapeHtml(valStr)}</span>
                    </div>
                `;
            }
        });

        if (Object.keys(obj).length > maxKeys) {
            html += `<div style="margin-left:${depth * 12}px; font-size:9px; color:#94a3b8;">… и ещё ${Object.keys(obj).length - maxKeys} ключей</div>`;
        }

        return html;
    },

    _hasInnerMatch(obj, query, depth, maxDepth) {
        if (depth > maxDepth) return false;
        if (!obj || typeof obj !== 'object') return false;

        for (const k of Object.keys(obj)) {
            if (k.toLowerCase().includes(query)) return true;
            const v = obj[k];
            if (v && typeof v === 'object') {
                if (this._hasInnerMatch(v, query, depth + 1, maxDepth)) return true;
            }
        }
        return false;
    },

    setStateSearch(query) {
        this.stateSearchQuery = query;
        const box = document.getElementById('devStateTreeContainer');
        if (box) box.innerHTML = this.renderStateTreeHtml();
    },

    copyStateJson() {
        try {
            const json = JSON.stringify(window.state, null, 2);
            if (navigator.clipboard) {
                navigator.clipboard.writeText(json).then(() => {
                    showToast('✓ JSON state скопирован');
                }).catch(() => this._fallbackCopy(json));
            } else {
                this._fallbackCopy(json);
            }
        } catch (e) {
            showToast('❌ Ошибка копирования');
        }
    },

    downloadStateJson() {
        try {
            const json = JSON.stringify(window.state, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'perekup_state_' + Date.now() + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            showToast('📥 State скачан');
        } catch (e) {
            showToast('❌ Ошибка скачивания');
        }
    },

    exportStateToFile() {
        this.downloadStateJson();
    },

    exportAllLogsToFile() {
        this.downloadLog();
    },

    // ========================================================
    // 12. ВКЛАДКА: FIRESTORE (С ДВУМЯ КНОПКАМИ СБРОСА)
    // ========================================================
    renderFirestoreTab(container) {
        if (!container) return;

        const stats = this.firestoreStats || {};
        const isTesting = this.firestoreTesting;
        const isWiping = this._isWiping; // ⭐ v2.3.0

        const collections = ['market_lots', 'p2p_deals', 'trade_offers', 'p2p_notifications_queue',
                             'chat_messages', 'notifications', 'clubs', 'transactions',
                             'registered_plates', 'cars_catalog', 'leaderboard', 'street_events',
                             'players', 'garages'];

        container.innerHTML = `
            <div class="glass-card p-2 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(192,132,252,0.18), #090e18); border-color: var(--purple);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-purple"><i class="fa-solid fa-cloud mr-1"></i> Firestore Статистика</b>
                    <button onclick="AppDev.refreshFirestoreStats()" class="btn btn-dark btn-auto btn-sm" style="font-size:8.5px; padding:2px 8px;" ${isWiping ? 'disabled' : ''}>
                        <i class="fa-solid fa-rotate"></i> Обновить
                    </button>
                </div>
                <div class="sub-label" style="font-size:9px;">Проверка коллекций и глобальное управление БД</div>
            </div>

            <!-- ⭐ v2.3.0: СЕКЦИЯ ГЛОБАЛЬНЫХ СБРОСОВ -->
            <div class="glass-card p-2 mb-2" style="border:1.5px solid rgba(255,51,102,0.4); background: linear-gradient(135deg, rgba(255,51,102,0.08), #090e18);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-red"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Глобальные сбросы (DEV)</b>
                    <span class="tag-badge bg-tag-red">DANGER</span>
                </div>
                
                ${isWiping ? `
                    <div class="p-3 text-center my-2" style="background:rgba(0,0,0,0.5); border-radius:8px; border:1px dashed var(--amber);">
                        <div class="radar-spinner-ring mb-2" style="margin:0 auto; width:40px; height:40px; border-width:2px;">
                            <div class="radar-spinner-center" style="font-size:16px;">⏳</div>
                        </div>
                        <b class="color-amber text-xs block mb-1">ИДЁТ УДАЛЕНИЕ...</b>
                        <div class="sub-label" style="font-size:9px;">Не закрывайте игру. База очищается пачками по 200 док-тов.</div>
                    </div>
                ` : `
                    <div class="sub-label mb-2" style="font-size:8.5px; color:#cbd5e1;">
                        Используйте для очистки тестовых данных, зависших сделок и лотов на сервере.
                    </div>

                    <div class="space-y-2">
                        <!-- Кнопка 1: Сброс рынка и P2P с СОХРАНЕНИЕМ ИГРОКОВ -->
                        <button onclick="AppDev.triggerWipeMarketAndP2P()" class="btn btn-amber btn-sm w-full font-bold" style="font-size:9px; padding:7px 4px; border:1px solid rgba(255,179,0,0.5);">
                            <i class="fa-solid fa-broom mr-1"></i> СБРОС СЕТИ / РЫНКА (сохранить игроков)
                        </button>

                        <!-- Кнопка 2: Полный глобальный вайп всей базы данных -->
                        <button onclick="AppDev.triggerWipeAllGlobal()" class="btn btn-red btn-sm w-full font-bold" style="font-size:9px; padding:7px 4px; box-shadow: 0 0 12px rgba(255,51,102,0.35);">
                            <i class="fa-solid fa-skull-crossbones mr-1"></i> ПОЛНЫЙ ГЛОБАЛЬНЫЙ ВАЙП БД
                        </button>
                    </div>
                `}
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-cyan block mb-2">📊 Коллекции:</b>
                <div class="space-y-1 text-xs" style="font-size:9.5px;">
                    ${collections.map(col => `
                        <div class="flex-between">
                            <span class="sub-label font-mono">${col}</span>
                            <b class="${stats[col] === 'ошибка' ? 'color-red' : (stats[col] === 'есть данные' ? 'color-green' : 'color-amber')}">
                                ${stats[col] || '—'}
                            </b>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-green block mb-2">⚙️ Действия:</b>
                <div class="space-y-1">
                    <button onclick="AppDev.runCleanupManual()" class="btn btn-green btn-sm w-full" style="font-size:9px;" ${isTesting || isWiping ? 'disabled' : ''}>
                        <i class="fa-solid fa-broom mr-1"></i> ${isTesting ? 'Очистка...' : 'Запустить Cleanup (TTL)'}
                    </button>
                    <button onclick="AppDev.showFirestoreIndexes()" class="btn btn-cyan btn-sm w-full" style="font-size:9px;" ${isWiping ? 'disabled' : ''}>
                        <i class="fa-solid fa-list mr-1"></i> Показать нужные индексы
                    </button>
                    <button onclick="AppDev.copyFirestoreIndexes()" class="btn btn-purple btn-sm w-full" style="font-size:9px;" ${isWiping ? 'disabled' : ''}>
                        <i class="fa-solid fa-copy mr-1"></i> Скопировать индексы (JSON)
                    </button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2" style="background:#050914;">
                <b class="text-xs color-cyan block mb-1">🌐 Подключение:</b>
                <div class="sub-label" style="font-size:9px; line-height:1.4;">
                    ${window.FB_Bridge ? '✅ FB_Bridge загружен' : '❌ FB_Bridge НЕ загружен'}<br>
                    ${window.TelegramAuthManager ? '✅ TelegramAuthManager активен' : '❌ TelegramAuthManager НЕ найден'}<br>
                    UID: <b class="color-amber font-mono">${window.TelegramAuthManager?.getVerifiedUserId() || '—'}</b>
                </div>
            </div>
        `;
    },

    // ========================================================
    // ⭐ v2.3.0: ЛОГИКА ДВУХ КНОПОК СБРОСА
    // ========================================================

    /**
     * КНОПКА 1: Вайп рынка, лотов, сделок ДКП, офферов и чатов (прогресс игроков сохраняется)
     */
    async triggerWipeMarketAndP2P() {
        if (this._isWiping) return;
        
        const confirm1 = confirm("⚠️ ВНИМАНИЕ: Будут удалены все объявления на рынке, P2P сделки, офферы и чаты!\n\nПрогресс игроков (деньги, уровни, гаражи) СОХРАНИТСЯ.\n\nПродолжить?");
        if (!confirm1) return;

        const code = prompt("Для подтверждения введите слово «СБРОС» большими буквами:");
        if (code !== "СБРОС") {
            showToast("❌ Отменено: неверный код подтверждения");
            return;
        }

        const admin = window.FB_Core?.Admin;
        if (!admin?.wipeMarketAndP2P) {
            showToast("❌ FB_Core.Admin.wipeMarketAndP2P недоступен!");
            return;
        }

        this._isWiping = true;
        this.render(document.getElementById('phoneAppContainer'));
        if (window.DevLogger) window.DevLogger.add('firestore', 'Запущен сброс рынка (с сохранением игроков)');

        try {
            const res = await admin.wipeMarketAndP2P();
            if (res.success) {
                if (typeof playSound === 'function') playSound('win');
                if (typeof tgHaptic === 'function') tgHaptic('success');
                
                if (res.errors && res.errors.length > 0) {
                    showToast(`⚠️ Очищено: ${res.total} док-тов. Ошибок прав: ${res.errors.length}`, 'warning');
                    console.warn('[AppDev] Ошибки при очистке:', res.errors);
                } else {
                    showToast(`✅ Рынок и P2P очищены! Удалено: ${res.total} док-тов.`, 'success');
                }
            } else {
                showToast(`❌ Ошибка сброса: ${res.error}`, 'error');
            }
        } catch (e) {
            console.error('[AppDev] Ошибка wipeMarketAndP2P:', e);
            showToast("❌ Сбой: " + (e.message || e), 'error');
        } finally {
            this._isWiping = false;
            this.refreshFirestoreStats();
        }
    },

    /**
     * КНОПКА 2: Полный глобальный вайп всей БД (включая аккаунты всех игроков)
     */
    async triggerWipeAllGlobal() {
        if (this._isWiping) return;

        const confirm1 = confirm("🚨 КРИТИЧЕСКОЕ ДЕЙСТВИЕ!\n\nБудет полностью уничтожена ВСЯ база данных Firebase: аккаунты игроков, гаражи, деньги, лоты, чаты и статистика.\n\nВы АБСОЛЮТНО уверены?");
        if (!confirm1) return;

        const code = prompt("Для подтверждения ПОЛНОГО ВАЙПА введите слово «ВАЙП» большими буквами:");
        if (code !== "ВАЙП") {
            showToast("❌ Отменено: подтверждение не пройдено");
            return;
        }

        const admin = window.FB_Core?.Admin;
        if (!admin?.wipeAllGlobal) {
            showToast("❌ FB_Core.Admin.wipeAllGlobal недоступен!");
            return;
        }

        this._isWiping = true;
        this.render(document.getElementById('phoneAppContainer'));
        if (window.DevLogger) window.DevLogger.add('warn', 'ВНИМАНИЕ: Запущен полный вайп базы данных');

        try {
            const res = await admin.wipeAllGlobal();
            if (res.success) {
                if (typeof playSound === 'function') playSound('win');
                
                if (res.errors && res.errors.length > 0) {
                    showToast(`⚠️ Вайп завершён с ошибками прав (${res.errors.length}). Перезагрузка...`, 'warning');
                    console.warn('[AppDev] Ошибки при вайпе:', res.errors);
                } else {
                    showToast("🔥 База данных полностью очищена! Перезагрузка...", 'success');
                }
                
                // Блокируем фоновые сохранения и очищаем локальный стейт
                window.__IS_RESETTING__ = true;
                try { localStorage.clear(); } catch (e) {}
                try { sessionStorage.clear(); } catch (e) {}

                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                showToast("❌ Ошибка вайпа: " + res.error, 'error');
            }
        } catch (e) {
            console.error('[AppDev] Ошибка wipeAllGlobal:', e);
            showToast("❌ Сбой: " + (e.message || e), 'error');
        } finally {
            this._isWiping = false;
        }
    },

    FIRESTORE_INDEXES: [
        { collection: 'market_lots',        fields: ['status ASC', 'timestamp DESC'],                          desc: 'Список активных лотов' },
        { collection: 'market_lots',        fields: ['sellerId ASC', 'status ASC', 'name ASC'],                desc: 'Проверка дубликатов лотов' },
        { collection: 'notifications',      fields: ['toUser ASC', 'claimed ASC', 'timestamp DESC'],           desc: 'Мои уведомления' },
        { collection: 'chat_messages',      fields: ['dialogId ASC', 'timestamp ASC'],                         desc: 'Сообщения диалога' },
        { collection: 'trade_offers',       fields: ['toUserId ASC', 'status ASC', 'createdAt DESC'],          desc: 'Входящие офферы' },
        { collection: 'trade_offers',       fields: ['fromUserId ASC', 'status ASC', 'createdAt DESC'],        desc: 'Исходящие офферы' },
        { collection: 'friendships',        fields: ['fromUserId ASC', 'status ASC'],                          desc: 'Мои исходящие заявки' },
        { collection: 'friendships',        fields: ['toUserId ASC', 'status ASC'],                            desc: 'Мои входящие заявки' },
        { collection: 'storage_wars_lobbies', fields: ['lotKey ASC', 'status ASC', 'createdAt DESC'],          desc: 'Поиск лобби Storage Wars' },
        { collection: 'street_events',      fields: ['timestamp DESC'],                                        desc: 'Лента событий M+' }
    ],

    showFirestoreIndexes() {
        const list = this.FIRESTORE_INDEXES.map((ix, i) =>
            `${i + 1}. ${ix.collection}\n   Поля: ${ix.fields.join(', ')}\n   Назначение: ${ix.desc}`
        ).join('\n\n');

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.style.zIndex = '99999';
        modal.innerHTML = `
            <div class="modal-box" style="max-width: 420px; max-height: 80vh; overflow-y: auto;">
                <div class="flex-between mb-2">
                    <b class="text-xs color-cyan">Firestore индексы</b>
                    <button class="btn btn-dark btn-auto btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="sub-label mb-2" style="font-size:9.5px;">
                    Создайте эти индексы в Firebase Console → Firestore → Indexes → Composite.
                </div>
                <pre style="background:#050914; padding:10px; border-radius:8px; font-size:9px; color:#67e8f9; white-space:pre-wrap; word-break:break-word; line-height:1.5;">${this._escapeHtml(list)}</pre>
                <button class="btn btn-cyan w-full mt-2" onclick="this.closest('.modal-overlay').remove()">Понятно</button>
            </div>
        `;
        document.body.appendChild(modal);
    },

    copyFirestoreIndexes() {
        const json = JSON.stringify(this.FIRESTORE_INDEXES, null, 2);
        if (navigator.clipboard) {
            navigator.clipboard.writeText(json).then(() => {
                showToast("✓ Индексы скопированы в буфер");
            }).catch(() => this._fallbackCopy(json));
        } else {
            this._fallbackCopy(json);
        }
    },

    async refreshFirestoreStats() {
        if (!window.FB_Bridge?.getStats) {
            showToast('FB_Bridge.getStats недоступен');
            return;
        }
        this.firestoreStats = { loading: true };
        this.render(document.getElementById('phoneAppContainer'));

        try {
            const stats = await window.FB_Bridge.getStats();
            this.firestoreStats = stats;
        } catch (e) {
            this.firestoreStats = { error: e.message };
        }

        this.render(document.getElementById('phoneAppContainer'));
    },

    async runCleanupManual() {
        if (!window.FB_Bridge?.Cleanup?.runCleanup) {
            showToast('CleanupManager недоступен');
            return;
        }
        this.firestoreTesting = true;
        this.render(document.getElementById('phoneAppContainer'));

        try {
            const res = await window.FB_Bridge.Cleanup.runCleanup(true);
            if (res.success) {
                const r = res.results || {};
                showToast(`✅ Удалено: ${res.total} (chat: ${r.chat_messages || 0}, notif: ${r.notifications || 0})`);
            } else {
                showToast(`❌ Ошибка: ${res.error}`);
            }
        } catch (e) {
            showToast('❌ Ошибка cleanup');
        }

        this.firestoreTesting = false;
        this.render(document.getElementById('phoneAppContainer'));
    },

    forceSyncSave() {
        if (!window.FB_Bridge?.Players?.pushSaveForce) {
            showToast('pushSaveForce недоступен');
            return;
        }
        const uid = window.TelegramAuthManager?.getVerifiedUserId();
        if (!uid) {
            showToast('Нет UID');
            return;
        }
        window.FB_Bridge.Players.pushSaveForce(uid, window.state)
            .then(ok => {
                showToast(ok ? '✅ Сейв синхронизирован' : '❌ Ошибка синхронизации');
            });
    },

    async forceLoadSave() {
        if (!window.FB_Bridge?.Players?.pullSave) {
            showToast('pullSave недоступен');
            return;
        }
        const uid = window.TelegramAuthManager?.getVerifiedUserId();
        if (!uid) {
            showToast('Нет UID');
            return;
        }

        if (!confirm('Загрузить сейв из облака? Текущий прогресс будет перезаписан.')) return;

        try {
            const cloudSave = await window.FB_Bridge.Players.pullSave(uid);
            if (cloudSave && cloudSave.player) {
                if (typeof applyLoadedState === 'function') {
                    applyLoadedState(cloudSave);
                    if (typeof saveState === 'function') saveState();
                    showToast('✅ Сейв загружен. Перезагрузка...');
                    setTimeout(() => window.location.reload(), 1500);
                }
            } else {
                showToast('❌ Облачный сейв не найден');
            }
        } catch (e) {
            showToast('❌ Ошибка загрузки');
        }
    },

    // ========================================================
    // 13. ВКЛАДКА: МОДУЛИ (проверка загрузки)
    // ========================================================
    renderModulesTab(container) {
        if (!container) return;

        const modules = [
            { name: 'DataCore',           path: 'window.GAME_METADATA',                        critical: true },
            { name: 'CarsDatabase',       path: 'window.CAR_DATABASE',                          critical: true },
            { name: 'CarHelpers',         path: 'window.getCarMainImage',                       critical: true },
            { name: 'DefectsData',        path: 'window.MECHANICAL_DEFECTS',                    critical: true },
            { name: 'EventBus',           path: 'window.EventBus',                              critical: false },
            { name: 'MoneyManager',       path: 'window.MoneyManager',                          critical: false },
            { name: 'SafeState',          path: 'window.SafeState',                             critical: false },
            { name: 'PlatesManager',      path: 'window.PlatesManager',                         critical: true },
            { name: 'ThemeManager',       path: 'window.ThemeManager',                          critical: false },
            { name: 'AudioFx',            path: 'window.AudioFx',                               critical: false },
            { name: 'DevLogger',          path: 'window.DevLogger',                             critical: false },
            { name: 'DevStudio',          path: 'window.DevStudio',                             critical: false },
            { name: 'DevDataChecker',     path: 'window.DevDataChecker',                        critical: false },
            { name: 'FB_Bridge',          path: 'window.FB_Bridge',                             critical: false },
            { name: 'TelegramAuth',       path: 'window.TelegramAuthManager',                   critical: true },
            { name: 'PhoneManager',       path: 'window.PhoneManager',                          critical: true },
            { name: 'AppDev',             path: 'window.AppDev',                                critical: false },
            { name: 'AppM',               path: 'window.AppM',                                  critical: true },
            { name: 'AppPost',            path: 'window.AppPost',                               critical: true },
            { name: 'AppBank',            path: 'window.AppBank',                               critical: true },
            { name: 'AppPort',            path: 'window.AppPort',                               critical: false },
            { name: 'AppBarn',            path: 'window.AppBarn',                               critical: false },
            { name: 'AppDarknet',         path: 'window.AppDarknet',                            critical: false },
            { name: 'AppGosuslugi',       path: 'window.AppGosuslugi',                          critical: false },
            { name: 'AppRadar',           path: 'window.AppRadar',                              critical: false },
            { name: 'AppSyndicate',       path: 'window.AppSyndicate',                          critical: false },
            { name: 'PhoneRacing',        path: 'window.PhoneRacing',                           critical: false },
            { name: 'PhoneBusiness',      path: 'window.PhoneBusiness',                         critical: false },
            { name: 'PhoneHousing',       path: 'window.PhoneHousing',                          critical: false },
            { name: 'PhoneMedia',         path: 'window.PhoneMedia',                            critical: false },
            { name: 'PhoneAutoStock',     path: 'window.PhoneAutoStock',                        critical: false },
            { name: 'PlayerListings',     path: 'window.PlayerListings',                        critical: false },
            { name: 'StorageWarsP2P',     path: 'window.StorageWarsP2P',                        critical: false },
            { name: 'MarketMap',          path: 'window.MarketMap',                             critical: false },
            { name: 'MLeaderboardModule', path: 'window.MLeaderboardModule',                    critical: false },
            { name: 'MEventsModule',      path: 'window.MEventsModule',                         critical: false },
            { name: 'MClubsModule',       path: 'window.MClubsModule',                          critical: false },
            { name: 'NotificationCenter', path: 'window.NotificationCenter',                    critical: false },
            { name: 'ModalManager',       path: 'window.ModalManager',                          critical: true },
            { name: 'AccessControl',      path: 'window.AccessControl',                         critical: false }
        ];

        const checkModule = (mod) => {
            try {
                const parts = mod.path.split('.');
                let cur = window;
                for (const p of parts) {
                    if (cur === undefined || cur === null) return false;
                    cur = cur[p];
                }
                return !!cur;
            } catch (e) {
                return false;
            }
        };

        let loaded = 0;
        let criticalMissing = 0;

        const rows = modules.map(m => {
            const ok = checkModule(m);
            if (ok) loaded++;
            else if (m.critical) criticalMissing++;

            return `
                <div class="flex-between p-1" style="background:${ok ? 'rgba(0,230,118,0.06)' : (m.critical ? 'rgba(255,51,102,0.08)' : 'rgba(255,179,0,0.05)')}; border-radius:6px; font-size:9.5px;">
                    <span>${m.critical ? '⭐' : '·'} ${m.name}</span>
                    <b class="${ok ? 'color-green' : (m.critical ? 'color-red' : 'color-amber')}">
                        ${ok ? '✓' : (m.critical ? '✗ КРИТ' : '✗')}
                    </b>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="glass-card p-2 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.14), #090e18); border-color: var(--cyan);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-puzzle-piece mr-1"></i> Проверка модулей</b>
                    <span class="tag-badge ${criticalMissing > 0 ? 'bg-tag-red' : 'bg-tag-green'}">${loaded}/${modules.length}</span>
                </div>
                <div class="sub-label" style="font-size:9px;">
                    Критичных пропущено: <b class="${criticalMissing > 0 ? 'color-red' : 'color-green'}">${criticalMissing}</b>
                </div>
            </div>

            <div class="glass-card p-2">
                <div class="space-y-1" style="max-height:55vh; overflow-y:auto;">
                    ${rows}
                </div>
            </div>
        `;
    }
};

window.AppDev = AppDev;

console.log('[🔧 phone-dev v2.3.0] Синхронизация с AdminManager + Индикатор процесса Wipe ✓');
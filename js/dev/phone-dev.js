// ========================================================
// js/dev/phone-dev.js — СЕКРЕТНОЕ ПРИЛОЖЕНИЕ «DEV» (v0.7.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v0.7.0:
//   - НОВАЯ вкладка «Логи» — живые события из DevLogger
//   - НОВАЯ вкладка «State» — снимок игрового state с фильтром
//   - Кнопки «Скачать лог» и «Скопировать лог»
//   - Обновлённый дашборд с 6 вкладками
// ========================================================

const AppDev = {
    DEV_PIN: "3172",
    isAuthenticated: false,
    enteredPin: "",
    activeSubTab: "studio", // 'studio' | 'resources' | 'sandbox' | 'data_check' | 'logs' | 'state'

    // Для вкладки Logs
    logFilter: 'all',
    logSearchQuery: '',
    logAutoScroll: true,

    // Для вкладки State
    stateSearchQuery: '',

    render(container) {
        if (!container) return;
        if (!this.isAuthenticated) {
            this.renderLockScreen(container);
        } else {
            this.renderDashboard(container);
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
            if (typeof showToast === 'function') showToast("✓ ROOT-доступ разработчика подтвержден!");
            if (window.DevLogger) window.DevLogger.add('system', 'DEV: успешная авторизация');
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
    // 2. ГЛАВНАЯ ПАНЕЛЬ РАЗРАБОТЧИКА (6 РАЗДЕЛОВ)
    // ========================================================
    renderDashboard(container) {
        const sub = this.activeSubTab;

        container.innerHTML = `
            <div class="phone-app-header" style="border-bottom-color: rgba(0, 230, 118, 0.4);">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                <div class="phone-app-title color-green"><i class="fa-solid fa-code mr-1"></i> DEV SUITE // 3172</div>
                <button onclick="AppDev.logout()" class="phone-back-btn" style="color:var(--red);" title="Заблокировать"><i class="fa-solid fa-lock"></i></button>
            </div>

            <div class="phone-app-body" style="gap: 6px;">
                <!-- ВЕРХНИЕ ВКЛАДКИ (6 шт, 3+3) -->
                <div class="grid-3 mb-1" style="gap: 3px;">
                    <button onclick="AppDev.switchTab('studio')" class="btn ${sub === 'studio' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:8.5px;">
                        <i class="fa-solid fa-car-side"></i> Студия
                    </button>
                    <button onclick="AppDev.switchTab('resources')" class="btn ${sub === 'resources' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:8.5px;">
                        <i class="fa-solid fa-coins"></i> Чит-Кэш
                    </button>
                    <button onclick="AppDev.switchTab('sandbox')" class="btn ${sub === 'sandbox' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:8.5px;">
                        <i class="fa-solid fa-sliders"></i> Дебаг
                    </button>
                </div>
                <div class="grid-3 mb-2" style="gap: 3px;">
                    <button onclick="AppDev.switchTab('data_check')" class="btn ${sub === 'data_check' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:8.5px;">
                        <i class="fa-solid fa-database"></i> Данные
                    </button>
                    <button onclick="AppDev.switchTab('logs')" class="btn ${sub === 'logs' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:8.5px; position:relative;">
                        <i class="fa-solid fa-list-ul"></i> Логи
                        ${this._renderLogsBadge()}
                    </button>
                    <button onclick="AppDev.switchTab('state')" class="btn ${sub === 'state' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:8.5px;">
                        <i class="fa-solid fa-eye"></i> State
                    </button>
                </div>

                ${sub === 'studio' ? this.renderStudioTab() : ''}
                ${sub === 'resources' ? this.renderResourcesTab() : ''}
                ${sub === 'sandbox' ? this.renderSandboxTab() : ''}
                ${sub === 'data_check' ? '<div id="devDataCheckContainer"></div>' : ''}
                ${sub === 'logs' ? this.renderLogsTab() : ''}
                ${sub === 'state' ? this.renderStateTab() : ''}
            </div>
        `;

        // Инициализация вкладки «Данные»
        if (sub === 'data_check' && window.DevDataChecker) {
            setTimeout(() => {
                const box = document.getElementById('devDataCheckContainer');
                if (box) window.DevDataChecker.render(box);
            }, 30);
        }

        // Инициализация вкладки «Логи»
        if (sub === 'logs') {
            setTimeout(() => this._attachLogsEvents(), 20);
        }
    },

    _renderLogsBadge() {
        if (!window.DevLogger) return '';
        const errors = window.DevLogger.getFiltered('error').length;
        if (errors <= 0) return '';
        return `<span style="position:absolute; top:2px; right:4px; background:var(--red); color:#fff; font-size:7px; font-weight:900; padding:1px 4px; border-radius:6px;">${errors}</span>`;
    },

    // ========================================================
    // 3. ВКЛАДКА: АВТО-СТУДИЯ (как было)
    // ========================================================
    renderStudioTab() {
        const queueCount = (typeof DevStudio !== 'undefined' && DevStudio.stagedBatchQueue)
            ? DevStudio.stagedBatchQueue.length
            : 0;

        return `
            <div class="glass-card p-3 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.15), #090e18); border-color: var(--cyan);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan" style="font-size:13px;"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Авто-Студия Карточек</b>
                    <span class="tag-badge bg-tag-cyan">v0.7.0</span>
                </div>
                <div class="sub-label mb-3" style="font-size:9.5px;">
                    Создание новых лотов, кадрирование обложек 16:9, редактирование базы и экспорт data.js.
                </div>

                <div class="space-y-2">
                    <button onclick="if(typeof DevStudio !== 'undefined'){ DevStudio.switchScreen('create'); DevStudio.open(); }" class="btn btn-cyan w-full" style="box-shadow: 0 0 16px var(--cyan-glow);">
                        <i class="fa-solid fa-plus-circle mr-1"></i> Создать Новое Авто
                    </button>

                    <button onclick="if(typeof DevStudio !== 'undefined'){ DevStudio.switchScreen('edit'); DevStudio.open(); }" class="btn btn-purple w-full" style="box-shadow: 0 0 16px rgba(192,132,252,0.3);">
                        <i class="fa-solid fa-pen-to-square mr-1"></i> Редактор Базы Автотехники
                    </button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-layer-group"></i> Очередь экспорта пака:</b>
                    <span class="tag-badge bg-tag-amber">${queueCount} в буфере</span>
                </div>

                <div class="grid-2">
                    <button onclick="if(typeof DevStudio !== 'undefined') DevStudio.downloadMergedDataJs()" class="btn btn-green btn-sm" ${queueCount === 0 ? 'disabled' : ''}>
                        Скачать data.js
                    </button>
                    <button onclick="if(typeof DevStudio !== 'undefined'){ DevStudio.clearBatchQueue(); AppDev.render(document.getElementById('phoneAppContainer')); }" class="btn btn-dark btn-sm" ${queueCount === 0 ? 'disabled' : ''}>
                        Очистить очередь
                    </button>
                </div>
            </div>
        `;
    },

    // ========================================================
    // 4. ВКЛАДКА: ЧИТ-КЭШ (как было)
    // ========================================================
    renderResourcesTab() {
        return `
            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-green block mb-2"><i class="fa-solid fa-ruble-sign mr-1"></i> Наличность:</b>
                <div class="grid-4 mb-2">
                    <button onclick="adjustResource('cash', -100000); AppDev.refreshHeader();" class="btn btn-dark btn-sm">-100k</button>
                    <button onclick="adjustResource('cash', 100000); AppDev.refreshHeader();" class="btn btn-green btn-sm">+100k</button>
                    <button onclick="adjustResource('cash', 500000); AppDev.refreshHeader();" class="btn btn-green btn-sm">+500k</button>
                    <button onclick="adjustResource('cash', 5000000); AppDev.refreshHeader();" class="btn btn-green btn-sm">+5M</button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-amber block mb-2"><i class="fa-solid fa-star mr-1"></i> Stars:</b>
                <div class="grid-4 mb-2">
                    <button onclick="adjustResource('stars', -10); AppDev.refreshHeader();" class="btn btn-dark btn-sm">-10</button>
                    <button onclick="adjustResource('stars', 10); AppDev.refreshHeader();" class="btn btn-amber btn-sm">+10</button>
                    <button onclick="adjustResource('stars', 50); AppDev.refreshHeader();" class="btn btn-amber btn-sm">+50</button>
                    <button onclick="adjustResource('stars', 250); AppDev.refreshHeader();" class="btn btn-amber btn-sm">+250</button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-cyan block mb-2"><i class="fa-solid fa-award mr-1"></i> Уровень:</b>
                <div class="grid-3 mb-2">
                    <button onclick="adjustResource('level', -1); AppDev.refreshHeader();" class="btn btn-dark btn-sm">-1 Ур</button>
                    <button onclick="adjustResource('level', 1); AppDev.refreshHeader();" class="btn btn-cyan btn-sm">+1 Ур</button>
                    <button onclick="adjustResource('level', 10); AppDev.refreshHeader();" class="btn btn-cyan btn-sm">+10 Ур</button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-purple block mb-2"><i class="fa-solid fa-handshake mr-1"></i> Связи и Талоны:</b>
                <div class="grid-2">
                    <button onclick="adjustResource('connections', 1); AppDev.refreshHeader();" class="btn btn-purple btn-sm">+1 Связь</button>
                    <button onclick="adjustResource('tickets', 25); AppDev.refreshHeader();" class="btn btn-purple btn-sm">+25 Талонов</button>
                </div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-green block mb-1">⚡ Восстановление:</b>
                <div class="grid-2">
                    <button onclick="AppDev.restoreAllStats()" class="btn btn-green btn-sm">100% Бак/Еда/Настрой</button>
                    <button onclick="AppDev.giveAllTools()" class="btn btn-dark btn-sm">Выдать все приборы</button>
                </div>
            </div>
        `;
    },

    // ========================================================
    // 5. ВКЛАДКА: ДЕБАГ-САНДБОКС (как было)
    // ========================================================
    renderSandboxTab() {
        return `
            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-cyan block mb-2"><i class="fa-solid fa-arrows-rotate mr-1"></i> Авторынок:</b>
                <div class="space-y-1">
                    <button onclick="if(typeof populateMarketFeed === 'function') populateMarketFeed(); showToast('Рынок перегенерирован!');" class="btn btn-dark btn-sm w-full">
                        Респавн авторынка
                    </button>
                    <button onclick="if(typeof triggerMarketNewsEvent === 'function') triggerMarketNewsEvent();" class="btn btn-cyan btn-sm w-full">
                        Случайная рыночная новость
                    </button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-red block mb-2"><i class="fa-solid fa-shield-halved mr-1"></i> ДПС и Розыск:</b>
                <div class="space-y-1">
                    <button onclick="AppDev.clearPoliceHeat()" class="btn btn-dark btn-sm w-full">
                        Сбросить розыск ДПС + 5 дней иммунитета
                    </button>
                    <button onclick="AppDev.freeAllImpoundCars()" class="btn btn-green btn-sm w-full">
                        Забрать все машины со штрафстоянки
                    </button>
                </div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-amber block mb-2"><i class="fa-solid fa-clock mr-1"></i> Время:</b>
                <button onclick="if(typeof executeDayCycleMidnight === 'function') executeDayCycleMidnight(new Date()); showToast('🌙 День перемотан!');" class="btn btn-amber btn-sm w-full">
                    Перемотать день вперёд (00:00)
                </button>
            </div>
        `;
    },

    // ========================================================
    // 6. ⭐ НОВАЯ ВКЛАДКА: ЛОГИ
    // ========================================================
    renderLogsTab() {
        if (!window.DevLogger) {
            return `<div class="glass-card p-3 text-center sub-label">DevLogger не загружен. Проверьте подключение js/dev/dev-logger.js в index.html.</div>`;
        }

        const allEvents = window.DevLogger.getAll();
        const errorCount = allEvents.filter(e => e.type === 'error').length;
        const warnCount = allEvents.filter(e => e.type === 'warn').length;
        const saveCount = allEvents.filter(e => e.type === 'save').length;
        const firestoreCount = allEvents.filter(e => e.type === 'firestore').length;

        return `
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

            <!-- ФИЛЬТРЫ -->
            <div class="grid-4 mb-1" style="gap:3px;">
                <button onclick="AppDev.setLogFilter('all')" class="btn ${this.logFilter === 'all' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Все</button>
                <button onclick="AppDev.setLogFilter('error')" class="btn ${this.logFilter === 'error' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Ошибки</button>
                <button onclick="AppDev.setLogFilter('save')" class="btn ${this.logFilter === 'save' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Save</button>
                <button onclick="AppDev.setLogFilter('firestore')" class="btn ${this.logFilter === 'firestore' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Firestore</button>
            </div>
            <div class="grid-4 mb-2" style="gap:3px;">
                <button onclick="AppDev.setLogFilter('tab')" class="btn ${this.logFilter === 'tab' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Tab</button>
                <button onclick="AppDev.setLogFilter('cat')" class="btn ${this.logFilter === 'cat' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Cat</button>
                <button onclick="AppDev.setLogFilter('log')" class="btn ${this.logFilter === 'log' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Log</button>
                <button onclick="AppDev.setLogFilter('warn')" class="btn ${this.logFilter === 'warn' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8px; padding:4px 0;">Warn</button>
            </div>

            <!-- ПОИСК -->
            <input type="text" id="devLogSearchInput" value="${this.logSearchQuery}"
                   oninput="AppDev.setLogSearch(this.value)"
                   placeholder="🔍 Поиск по тексту лога..."
                   class="chat-input mb-2"
                   style="font-size:10.5px; padding:6px 8px;">

            <!-- КНОПКИ ДЕЙСТВИЙ -->
            <div class="grid-3 mb-2" style="gap:3px;">
                <button onclick="AppDev.copyLogToClipboard()" class="btn btn-cyan btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-copy"></i> Копировать
                </button>
                <button onclick="AppDev.downloadLog()" class="btn btn-dark btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-download"></i> Скачать
                </button>
                <button onclick="AppDev.clearLog()" class="btn btn-red btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-trash"></i> Очистить
                </button>
            </div>

            <!-- СПИСОК СОБЫТИЙ -->
            <div id="devLogsListContainer" class="space-y-1" style="max-height: 55vh; overflow-y: auto;">
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

        // Показываем в обратном порядке — свежие сверху
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
        // Обновляем кнопки
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
            if (typeof showToast === 'function') showToast('Лог пустой');
            return;
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                if (typeof showToast === 'function') showToast('✓ Лог скопирован в буфер');
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
            if (typeof showToast === 'function') showToast('✓ Лог скопирован');
        } catch (e) {
            if (typeof showToast === 'function') showToast('❌ Не удалось скопировать');
        }
        document.body.removeChild(ta);
    },

    downloadLog() {
        if (!window.DevLogger) return;
        const text = window.DevLogger.exportAsText();
        if (!text) {
            if (typeof showToast === 'function') showToast('Лог пустой');
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
        if (typeof showToast === 'function') showToast('📥 Лог скачан');
    },

    _attachLogsEvents() {
        // Функция-заглушка, если понадобятся live-обновления
    },

    // ========================================================
    // 7. ⭐ НОВАЯ ВКЛАДКА: STATE (снимок игрового состояния)
    // ========================================================
    renderStateTab() {
        if (!window.state) {
            return `<div class="glass-card p-3 text-center sub-label">State не загружен.</div>`;
        }

        const summary = this._buildStateSummary();

        return `
            <div class="glass-card p-2 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,230,118,0.12), #090e18); border-color: var(--green);">
                <b class="text-xs color-green"><i class="fa-solid fa-eye mr-1"></i> Снимок игрового state</b>
                <div class="sub-label mt-1" style="font-size:9px;">Обновляется при каждом рендере вкладки</div>
            </div>

            <!-- СВОДКА -->
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

            <!-- КНОПКИ -->
            <div class="grid-3 mb-2" style="gap:3px;">
                <button onclick="AppDev.refreshStateTab()" class="btn btn-cyan btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-rotate"></i> Обновить
                </button>
                <button onclick="AppDev.copyStateJson()" class="btn btn-dark btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-copy"></i> JSON
                </button>
                <button onclick="AppDev.downloadStateJson()" class="btn btn-green btn-sm" style="font-size:9px;">
                    <i class="fa-solid fa-download"></i> Скачать
                </button>
            </div>

            <!-- ПОИСК -->
            <input type="text" id="devStateSearchInput" value="${this.stateSearchQuery}"
                   oninput="AppDev.setStateSearch(this.value)"
                   placeholder="🔍 Фильтр по ключам (например: garage, marketFeed, cash)"
                   class="chat-input mb-2"
                   style="font-size:10.5px; padding:6px 8px;">

            <!-- JSON-ДЕРЕВО -->
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
            { label: 'Бизнесы куплены', value: (s.businesses || []).filter(b => b.level > 0).length, color: 'color-green' },
            { label: 'Размер JSON', value: this._stateSizeKb() + ' KB', color: 'color-cyan' },
            { label: 'Локальный сейв', value: this._localSaveSizeKb() + ' KB', color: 'color-cyan' },
            { label: '__IS_RESETTING__', value: String(!!window.__IS_RESETTING__), color: window.__IS_RESETTING__ ? 'color-red' : 'color-green' }
        ];
    },

    _stateSizeKb() {
        try {
            return Math.round(JSON.stringify(window.state).length / 1024);
        } catch (e) { return '?'; }
    },

    _localSaveSizeKb() {
        try {
            let total = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.includes('perekup')) {
                    total += (localStorage.getItem(k) || '').length;
                }
            }
            return Math.round(total / 1024);
        } catch (e) { return '?'; }
    },

    renderStateTreeHtml() {
        if (!window.state) return '';

        const query = (this.stateSearchQuery || '').trim().toLowerCase();
        const maxDepth = 3;
        const maxKeys = 50;

        return this._renderObjectAsTree(window.state, '', 0, maxDepth, maxKeys, query);
    },

    _renderObjectAsTree(obj, path, depth, maxDepth, maxKeys, query) {
        if (depth > maxDepth) return '';
        if (!obj || typeof obj !== 'object') return '';

        // Если задан query — проверяем, нужно ли вообще раскрывать эту ветку
        if (query && depth > 0) {
            const pathMatch = path.toLowerCase().includes(query);
            if (!pathMatch) {
                // Проверим, есть ли внутри совпадения
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
                    valStr = val.length > 60 ? val.substring(0, 60) + '…' : val;
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

    refreshStateTab() {
        const box = document.getElementById('devStateTreeContainer');
        if (box) box.innerHTML = this.renderStateTreeHtml();
        if (typeof showToast === 'function') showToast('✓ State обновлён');
    },

    copyStateJson() {
        try {
            const json = JSON.stringify(window.state, null, 2);
            if (navigator.clipboard) {
                navigator.clipboard.writeText(json).then(() => {
                    if (typeof showToast === 'function') showToast('✓ JSON state скопирован');
                }).catch(() => this._fallbackCopy(json));
            } else {
                this._fallbackCopy(json);
            }
        } catch (e) {
            if (typeof showToast === 'function') showToast('❌ Ошибка копирования');
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
            if (typeof showToast === 'function') showToast('📥 State скачан');
        } catch (e) {
            if (typeof showToast === 'function') showToast('❌ Ошибка скачивания');
        }
    },

    // ========================================================
    // СТАРЫЕ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // ========================================================
    refreshHeader() {
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderProfileAnalytics === 'function') renderProfileAnalytics();
    },

    restoreAllStats() {
        if (!state.player) state.player = {};
        state.player.fuel = 100;
        state.player.hunger = 100;
        state.player.mood = 100;
        state.player.expressTickets = state.player.maxExpressTickets || 25;
        saveState();
        this.refreshHeader();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Топливо, сытость и кураж восстановлены на 100%!");
    },

    giveAllTools() {
        if (!state.player) state.player = {};
        if (!state.player.tools) state.player.tools = {};
        if (!state.player.toolsWear) state.player.toolsWear = {};
        ['gauge', 'gauge_pro', 'obd', 'obd_launch', 'endoscope', 'compressor', 'battery_tester'].forEach(id => {
            state.player.tools[id] = true;
            state.player.toolsWear[id] = 100;
        });
        saveState();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Все диагностические приборы добавлены со 100% ресурсом!");
    },

    clearPoliceHeat() {
        if (!state.player) state.player = {};
        state.player.consecutiveRaces = 0;
        state.player.policeImmunityDays = 5;
        state.player.trafficFines = 0;
        saveState();
        this.refreshHeader();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Внимание ДПС сброшено на 0. Иммунитет на 5 дней!");
    },

    freeAllImpoundCars() {
        let count = 0;
        if (state.garage) {
            state.garage.forEach(car => {
                if (car && car.impounded) {
                    car.impounded = false;
                    car.impoundDaysLeft = 0;
                    count++;
                }
            });
        }
        saveState();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`Со спецстоянки вызволено ${count} автомобилей!`);
    }
};

window.AppDev = AppDev;
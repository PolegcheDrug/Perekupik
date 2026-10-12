// ========================================================
// js/phone-dev.js — СЕКРЕТНОЕ ПРИЛОЖЕНИЕ «DEV» В PEREKUP OS (v0.6.4)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Доступ по PIN-коду (Yo), консоль дебага, накрутка ресурсов,
// управление рынком, ДПС, автопарком и встроенная Авто-Студия.
// ========================================================

const AppDev = {
    DEV_PIN: "3172",
    isAuthenticated: false,
    enteredPin: "",
    activeSubTab: "studio", // 'studio' | 'resources' | 'sandbox' | 'database'

    render(container) {
        if (!this.isAuthenticated) {
            this.renderLockScreen(container);
        } else {
            this.renderDashboard(container);
        }
    },

    // ========================================================
    // 1. ЭКРАН ВВОДА PIN-КОДА (ХАКЕРСКИЙ ТЕРМИНАЛ)
    // ========================================================
    renderLockScreen(container) {
        let dotsHtml = "";
        for (let i = 0; i < 4; i++) {
            let isFilled = i < this.enteredPin.length;
            dotsHtml += `<div class="dev-pin-dot ${isFilled ? 'filled' : ''}"></div>`;
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

                    <div class="dev-pin-dots-row mb-3">
                        ${dotsHtml}
                    </div>

                    <div id="devPinErrorMsg" class="sub-label color-red mb-2" style="font-size:10px; height:14px;"></div>

                    <!-- ЦИФРОВОЙ КЕЙПАД -->
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

    pressKey(num) {
        if (this.enteredPin.length >= 4) return;
        this.enteredPin += num;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');

        if (this.enteredPin.length === 4) {
            this.verifyPin();
        } else {
            this.render(document.getElementById('phoneAppContainer'));
        }
    },

    clearPin() {
        this.enteredPin = "";
        this.render(document.getElementById('phoneAppContainer'));
    },

    backspacePin() {
        if (this.enteredPin.length > 0) {
            this.enteredPin = this.enteredPin.slice(0, -1);
            this.render(document.getElementById('phoneAppContainer'));
        }
    },

    verifyPin() {
        if (this.enteredPin === this.DEV_PIN) {
            this.isAuthenticated = true;
            this.enteredPin = "";
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');
            if (typeof showToast === 'function') showToast("✓ ROOT-доступ разработчика подтвержден!");
            this.render(document.getElementById('phoneAppContainer'));
        } else {
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('error');
            this.enteredPin = "";
            this.render(document.getElementById('phoneAppContainer'));
            const errEl = document.getElementById('devPinErrorMsg');
            if (errEl) errEl.innerText = "❌ Ошибка авторизации: неверный PIN-код!";
        }
    },

    logout() {
        this.isAuthenticated = false;
        this.enteredPin = "";
        this.render(document.getElementById('phoneAppContainer'));
        if (typeof showToast === 'function') showToast("Сессия DEV завершена.");
    },

    switchTab(tab) {
        this.activeSubTab = tab;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 2. ГЛАВНАЯ ПАНЕЛЬ РАЗРАБОТЧИКА (4 РАЗДЕЛА)
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
                <!-- ВЕРХНИЕ ВКЛАДКИ -->
                <div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 3px;">
                    <button onclick="AppDev.switchTab('studio')" class="btn ${sub === 'studio' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">
                        <i class="fa-solid fa-car-side"></i> Студия
                    </button>
                    <button onclick="AppDev.switchTab('resources')" class="btn ${sub === 'resources' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">
                        <i class="fa-solid fa-coins"></i> Чит-Кэш
                    </button>
                    <button onclick="AppDev.switchTab('sandbox')" class="btn ${sub === 'sandbox' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">
                        <i class="fa-solid fa-sliders"></i> Дебаг
                    </button>
                    <button onclick="AppDev.switchTab('database')" class="btn ${sub === 'database' ? 'btn-green' : 'btn-dark'} btn-sm" style="padding:6px 2px; font-size:9px;">
                        <i class="fa-solid fa-database"></i> Бэкапы
                    </button>
                </div>

                ${sub === 'studio' ? this.renderStudioTab() : ''}
                ${sub === 'resources' ? this.renderResourcesTab() : ''}
                ${sub === 'sandbox' ? this.renderSandboxTab() : ''}
                ${sub === 'database' ? this.renderDatabaseTab() : ''}
            </div>
        `;
    },

    // --------------------------------------------------------
    // ВКЛАДКА 1: АВТО-СТУДИЯ (ИНТЕГРАЦИЯ С DEVSTUDIO)
    // --------------------------------------------------------
    renderStudioTab() {
        return `
            <div class="glass-card p-3 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.15), #090e18); border-color: var(--cyan);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan" style="font-size:13px;"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Авто-Студия Карточек</b>
                    <span class="tag-badge bg-tag-cyan">v0.6.4</span>
                </div>
                <div class="sub-label mb-3" style="font-size:9.5px;">
                    Создание новых лотов из галереи телефона, кадрирование обложек в 16:9, редактирование существующих машин и экспорт в data.js.
                </div>

                <div class="space-y-2">
                    <button onclick="DevStudio.switchScreen('create'); DevStudio.open();" class="btn btn-cyan w-full" style="box-shadow: 0 0 16px var(--cyan-glow);">
                        <i class="fa-solid fa-plus-circle mr-1"></i> Открыть Создание Нового Авто (Экран 1)
                    </button>

                    <button onclick="DevStudio.switchScreen('edit'); DevStudio.open();" class="btn btn-purple w-full" style="box-shadow: 0 0 16px rgba(192,132,252,0.3);">
                        <i class="fa-solid fa-pen-to-square mr-1"></i> Открыть Редактор Базы по Классам (Экран 2)
                    </button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-layer-group"></i> Очередь экспорта пака:</b>
                    <span class="tag-badge bg-tag-amber">${DevStudio.stagedBatchQueue.length} в буфере</span>
                </div>
                <div class="sub-label mb-2" style="font-size:9px;">Все созданные и отредактированные машины готовы к слиянию.</div>
                
                <div class="grid-2">
                    <button onclick="DevStudio.downloadMergedDataJs()" class="btn btn-green btn-sm" ${DevStudio.stagedBatchQueue.length === 0 ? 'disabled' : ''}>
                        Скачать data.js
                    </button>
                    <button onclick="DevStudio.clearBatchQueue(); AppDev.render(document.getElementById('phoneAppContainer'));" class="btn btn-dark btn-sm" ${DevStudio.stagedBatchQueue.length === 0 ? 'disabled' : ''}>
                        Очистить очередь
                    </button>
                </div>
            </div>
        `;
    },

    // --------------------------------------------------------
    // ВКЛАДКА 2: РЕСУРСЫ И ЧИТ-ПАНЕЛЬ
    // --------------------------------------------------------
    renderResourcesTab() {
        return `
            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-green block mb-2"><i class="fa-solid fa-ruble-sign mr-1"></i> Наличность (Баланс игрока):</b>
                <div class="grid-4 mb-2">
                    <button onclick="adjustResource('cash', -100000); AppDev.refreshHeader();" class="btn btn-dark btn-sm">-100k</button>
                    <button onclick="adjustResource('cash', 100000); AppDev.refreshHeader();" class="btn btn-green btn-sm">+100k</button>
                    <button onclick="adjustResource('cash', 500000); AppDev.refreshHeader();" class="btn btn-green btn-sm">+500k</button>
                    <button onclick="adjustResource('cash', 5000000); AppDev.refreshHeader();" class="btn btn-green btn-sm">+5M</button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-amber block mb-2"><i class="fa-solid fa-star mr-1"></i> Звёзды Stars (Премиум):</b>
                <div class="grid-4 mb-2">
                    <button onclick="adjustResource('stars', -10); AppDev.refreshHeader();" class="btn btn-dark btn-sm">-10</button>
                    <button onclick="adjustResource('stars', 10); AppDev.refreshHeader();" class="btn btn-amber btn-sm">+10</button>
                    <button onclick="adjustResource('stars', 50); AppDev.refreshHeader();" class="btn btn-amber btn-sm">+50</button>
                    <button onclick="adjustResource('stars', 250); AppDev.refreshHeader();" class="btn btn-amber btn-sm">+250</button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-cyan block mb-2"><i class="fa-solid fa-award mr-1"></i> Уровень авторитета:</b>
                <div class="grid-3 mb-2">
                    <button onclick="adjustResource('level', -1); AppDev.refreshHeader();" class="btn btn-dark btn-sm">-1 Ур</button>
                    <button onclick="adjustResource('level', 1); AppDev.refreshHeader();" class="btn btn-cyan btn-sm">+1 Ур</button>
                    <button onclick="adjustResource('level', 10); AppDev.refreshHeader();" class="btn btn-cyan btn-sm">+10 Ур</button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-purple block mb-2"><i class="fa-solid fa-handshake mr-1"></i> Связи 🤝 и Талоны 🎟️:</b>
                <div class="grid-2">
                    <button onclick="adjustResource('connections', 1); AppDev.refreshHeader();" class="btn btn-purple btn-sm">+1 Связь 🤝</button>
                    <button onclick="adjustResource('tickets', 25); AppDev.refreshHeader();" class="btn btn-purple btn-sm">+25 Талонов 🎟️</button>
                </div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-green block mb-1">⚡ Моментальное восстановление:</b>
                <div class="grid-2">
                    <button onclick="AppDev.restoreAllStats()" class="btn btn-green btn-sm">100% Бак / Еда / Настроение</button>
                    <button onclick="AppDev.giveAllTools()" class="btn btn-dark btn-sm">Выдать все приборы (Launch/ЛКП)</button>
                </div>
            </div>
        `;
    },

    // --------------------------------------------------------
    // ВКЛАДКА 3: ДЕБАГ-САНДБОКС (МИР И МЕХАНИКИ)
    // --------------------------------------------------------
    renderSandboxTab() {
        return `
            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-cyan block mb-2"><i class="fa-solid fa-arrows-rotate mr-1"></i> Авторынок и Тренды:</b>
                <div class="space-y-1">
                    <button onclick="populateMarketFeed(); showToast('Рынок принудительно перегенерирован!');" class="btn btn-dark btn-sm w-full">
                        Респавн авторынка (Бесплатно)
                    </button>
                    <button onclick="triggerMarketNewsEvent()" class="btn btn-cyan btn-sm w-full">
                        Случайная рыночная новость (Взлёт/Спад цен)
                    </button>
                </div>
            </div>

            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-red block mb-2"><i class="fa-solid fa-shield-halved mr-1"></i> ДПС, Розыск и Штрафы:</b>
                <div class="space-y-1">
                    <button onclick="AppDev.clearPoliceHeat()" class="btn btn-dark btn-sm w-full">
                        Сбросить розыск ДПС на 0 + Вечный иммунитет на 5 дн.
                    </button>
                    <button onclick="AppDev.freeAllImpoundCars()" class="btn btn-green btn-sm w-full">
                        Забрать все машины со спецстоянки без штрафов
                    </button>
                </div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-amber block mb-2"><i class="fa-solid fa-clock mr-1"></i> Время и Суточный цикл:</b>
                <div class="space-y-1">
                    <button onclick="executeDayCycleMidnight(new Date()); showToast('🌙 Симуляция ночи: проценты и доход начислены!');" class="btn btn-amber btn-sm w-full">
                        Перемотать день вперед (00:00 Начисление кассы и вкладов)
                    </button>
                </div>
            </div>
        `;
    },

    // --------------------------------------------------------
    // ВКЛАДКА 4: БАЗА ДАННЫХ И СБРОСЫ
    // --------------------------------------------------------
    renderDatabaseTab() {
        return `
            <div class="glass-card p-2 mb-2">
                <b class="text-xs color-cyan block mb-2"><i class="fa-solid fa-database mr-1"></i> Дамп локального сохранения:</b>
                <div class="grid-2 mb-2">
                    <button onclick="openSaveManagerModal()" class="btn btn-dark btn-sm">Код сейва (Base64)</button>
                    <button onclick="syncCloudStorageManual()" class="btn btn-cyan btn-sm">Синхрон с TG Cloud</button>
                </div>
            </div>

            <div class="glass-card p-2" style="border: 1px solid var(--red);">
                <b class="text-xs color-red block mb-1"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Опасная зона:</b>
                <div class="sub-label mb-2" style="font-size:9px;">Полное удаление прогресса игры и локальных кэшей.</div>
                <button onclick="resetGameData()" class="btn btn-danger btn-sm w-full">
                    Полный Wipe и сброс прогресса до нуля
                </button>
            </div>
        `;
    },

    // ========================================================
    // ДЕЙСТВИЯ И ДЕБАГ-МЕТОДЫ
    // ========================================================
    refreshHeader() {
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderProfileAnalytics === 'function') renderProfileAnalytics();
    },

    restoreAllStats() {
        state.player.fuel = 100;
        state.player.hunger = 100;
        state.player.mood = 100;
        state.player.expressTickets = state.player.maxExpressTickets || 25;
        saveState();
        this.refreshHeader();
        playSound('win');
        tgHaptic('success');
        showToast("Топливо, сытость и кураж восстановлены на 100%!");
    },

    giveAllTools() {
        if (!state.player.tools) state.player.tools = {};
        if (!state.player.toolsWear) state.player.toolsWear = {};
        ['gauge', 'gauge_pro', 'obd', 'obd_launch', 'endoscope', 'compressor', 'battery_tester'].forEach(id => {
            state.player.tools[id] = true;
            state.player.toolsWear[id] = 100;
        });
        saveState();
        playSound('win');
        tgHaptic('success');
        showToast("Все диагностические приборы добавлены с 100% ресурсом!");
    },

    clearPoliceHeat() {
        state.player.consecutiveRaces = 0;
        state.player.policeImmunityDays = 5;
        state.player.trafficFines = 0;
        saveState();
        this.refreshHeader();
        playSound('win');
        tgHaptic('success');
        showToast("Внимание ДПС сброшено на 0. Получен иммунитет на 5 дней!");
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
        playSound('win');
        tgHaptic('success');
        showToast(`Со спецстоянки вызволено ${count} автомобилей!`);
    }
};

window.AppDev = AppDev;
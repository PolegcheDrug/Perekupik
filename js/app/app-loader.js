// ========================================================
// js/app/app-loader.js — ЗАГРУЗЧИК, АВТОРИЗАЦИЯ, HUD (v4.3.1)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v4.3.1 (ФИКС ДУБЛИРОВАНИЯ ЗАГРУЗЧИКА):
//   - УДАЛЕНЫ дублирующие scriptQueue, loadScript, initAllModules,
//     startGame. Теперь очередью скриптов управляет ТОЛЬКО index.html.
//   - initApp вызывается из index.html после загрузки всех скриптов.
//   - Добавлена защита от отсутствия state.player при рендере.
// ========================================================

let _notificationUnsubscribe = null;
let _isOnline = true;

// ========================================================
// 1. МЕНЕДЖЕР МОДАЛЬНЫХ ОКОН
// ========================================================
const ModalManager = {
    activeModals: [],

    open(modalId, options = {}) {
        const el = document.getElementById(modalId);
        if (!el) return;

        if (options.closeOthers) {
            this.closeAll();
        }

        if (!el.classList.contains('active')) {
            el.classList.add('active');
            this.activeModals.push(modalId);
        }

        const baseZIndex = 5000;
        const currentStackPos = this.activeModals.indexOf(modalId);
        el.style.zIndex = baseZIndex + (currentStackPos * 50);

        if (window.AudioFx) window.AudioFx.haptic('light');
    },

    close(modalId) {
        const el = document.getElementById(modalId);
        if (el) {
            el.classList.remove('active');
            el.style.zIndex = '';
        }
        this.activeModals = this.activeModals.filter(id => id !== modalId);
    },

    closeAll() {
        const opened = [...this.activeModals];
        opened.forEach(id => this.close(id));
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
            m.classList.remove('active');
            m.style.zIndex = '';
        });
        this.activeModals = [];
    },

    isAnyOpen() {
        return this.activeModals.length > 0;
    }
};

window.ModalManager = ModalManager;
window.closeModal = (id) => ModalManager.close(id);

// ========================================================
// 2. ОБРАБОТКА START_PARAM (DEEP-LINK ИНВАЙТ)
// ========================================================
async function _processStartParam() {
    const result = { success: false };

    try {
        const startParam =
            window.Telegram?.WebApp?.initDataUnsafe?.start_param ||
            window.Telegram?.WebApp?.initDataUnsafe?.startPayload ||
            null;

        if (!startParam) {
            return result;
        }

        const rawParam = String(startParam).trim();
        const code = rawParam.toUpperCase();

        const CODE_REGEX = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

        if (!CODE_REGEX.test(code)) {
            console.log('[StartParam] Не похоже на инвайт-код, игнорируем:', rawParam);
            return { ...result, reason: 'not_a_code' };
        }

        const sessionKey = 'perekup_redeemed_code_' + code;
        try {
            if (sessionStorage.getItem(sessionKey) === 'true') {
                console.log('[StartParam] Код уже активирован в этой сессии:', code);
                return { ...result, reason: 'already_redeemed_session' };
            }
        } catch (e) {}

        if (!window.AccessControl || typeof window.AccessControl.redeemInviteCode !== 'function') {
            console.warn('[StartParam] AccessControl не загружен — код не активирован');
            return { ...result, reason: 'no_access_control' };
        }

        console.log('[StartParam] 🎟️ Обнаружен инвайт-код, активируем:', code);

        const redeemRes = await window.AccessControl.redeemInviteCode(code);

        if (redeemRes && redeemRes.success) {
            try {
                sessionStorage.setItem(sessionKey, 'true');
            } catch (e) {}

            console.log('[StartParam] ✅ Инвайт-код активирован:', code);

            if (window.DevLogger) {
                window.DevLogger.add('system', 'Deep-link инвайт активирован', { code });
            }

            if (typeof showToast === 'function') {
                setTimeout(() => {
                    showToast('🎟️ Инвайт-код активирован! Добро пожаловать!', 'success');
                }, 800);
            }

            return { success: true, code };
        } else {
            const err = redeemRes?.error || 'Неверный код';
            console.warn('[StartParam] ❌ Ошибка активации кода:', err);

            if (typeof showToast === 'function') {
                setTimeout(() => {
                    showToast(`❌ ${err}`, 'error');
                }, 800);
            }

            return { ...result, reason: 'redeem_failed', error: err };
        }
    } catch (e) {
        console.warn('[StartParam] Ошибка обработки:', e);
        return { ...result, reason: 'exception', error: e.message };
    }
}

window._processStartParam = _processStartParam;

// ========================================================
// 3. ЭКРАНЫ ОШИБОК
// ========================================================
function showAccessDeniedScreen() {
    const deniedScreen = document.getElementById('accessDeniedScreen');
    const appShell = document.getElementById('appShell');
    const pcAuth = document.getElementById('pcAuthScreen');
    const tgScreen = document.getElementById('tgRequiredScreen');

    if (deniedScreen) deniedScreen.style.display = 'flex';
    if (appShell) appShell.style.display = 'none';
    if (pcAuth) pcAuth.style.display = 'none';
    if (tgScreen) tgScreen.style.display = 'none';

    console.warn('[App] 🔒 Доступ закрыт — требуется инвайт-код');
}

function showTelegramRequiredScreen() {
    if (window.isPcDevMode && window.isPcDevMode()) {
        console.log('[App] DEV-режим активен, экран Telegram НЕ показывается');
        return;
    }
    if (window.tgUserId && !String(window.tgUserId).startsWith('guest_')) {
        console.log('[App] UID уже установлен:', window.tgUserId);
        return;
    }

    const tgScreen = document.getElementById('tgRequiredScreen');
    const appShell = document.getElementById('appShell');
    const pcAuth = document.getElementById('pcAuthScreen');
    const denied = document.getElementById('accessDeniedScreen');

    if (tgScreen) tgScreen.style.display = 'flex';
    if (appShell) appShell.style.display = 'none';
    if (pcAuth) pcAuth.style.display = 'none';
    if (denied) denied.style.display = 'none';

    console.warn('[App] ⛔ Telegram не обнаружен и DEV-режим не активирован.');
}
window.showTelegramRequiredScreen = showTelegramRequiredScreen;

// ========================================================
// 4. OWNER-ПАНЕЛЬ
// ========================================================
function createOwnerPanelButton() {
    const existing = document.getElementById('ownerPanelBtn');
    if (existing) existing.remove();

    if (!window.isOwnerUser || !window.isOwnerUser()) return;

    const btn = document.createElement('button');
    btn.id = 'ownerPanelBtn';
    btn.className = 'owner-panel-btn';
    btn.title = 'Owner-панель управления доступом';
    btn.innerHTML = '👑';
    btn.onclick = () => {
        if (window.AccessControl && typeof window.AccessControl.openOwnerPanel === 'function') {
            window.AccessControl.openOwnerPanel();
        } else {
            showToast('⚠️ AccessControl не загружен', 'warning');
        }
    };
    document.body.appendChild(btn);

    console.log('[App] 👑 Owner-панель добавлена');
}

// ========================================================
// 5. OFFLINE-БАННЕР
// ========================================================
function createOfflineBanner() {
    let banner = document.getElementById('offlineBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offlineBanner';
        banner.className = 'offline-banner';
        banner.innerHTML = '<i class="fa-solid fa-wifi"></i> Нет подключения к сети';
        document.body.appendChild(banner);
    }
}

function updateOnlineStatus(online) {
    _isOnline = online;
    const banner = document.getElementById('offlineBanner');
    if (banner) {
        banner.classList.toggle('visible', !online);
    }
    if (!online && typeof showToast === 'function') {
        showToast('⚠️ Потеряно соединение с сетью', 'warning');
    }
}

function setupOnlineListeners() {
    createOfflineBanner();
    window.addEventListener('online', () => updateOnlineStatus(true));
    window.addEventListener('offline', () => updateOnlineStatus(false));
    updateOnlineStatus(navigator.onLine);
}

// ========================================================
// 6. ОНБОРДИНГ
// ========================================================
function checkPlayerOnboarding(onComplete) {
    if (!window.state) window.state = {};
    if (!window.state.player) window.state.player = {};

    const validUid = window.tgUserId || window.state.player.uid;
    if (!validUid) {
        console.error('[Onboarding] Нет UID — блокируем');
        showTelegramRequiredScreen();
        return;
    }

    if (String(validUid).startsWith('guest_') || String(validUid).startsWith('p_')) {
        console.error('[Onboarding] Некорректный UID — блокируем');
        showTelegramRequiredScreen();
        return;
    }

    window.state.player.uid = String(validUid);

    if (window.state.player.onboardingDone === true) {
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    if (window.isOwnerUser && window.isOwnerUser()) {
        console.log('[Onboarding] Owner — автоматический пропуск');
        window.state.player.onboardingDone = true;
        window.state.player.name = window.state.player.name || "Owner";
        if (typeof saveState === 'function') saveState();
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    if (window.isPcDevMode && window.isPcDevMode()) {
        window.state.player.onboardingDone = true;
        window.state.player.name = window.state.player.name || "DEV_Перекуп";
        if (typeof saveState === 'function') saveState();
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    let overlay = document.getElementById('modalPlayerOnboarding');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modalPlayerOnboarding';
        overlay.className = 'modal-overlay active';
        overlay.style.zIndex = '99999';
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div class="modal-box text-center" style="max-width: 380px; border-color: var(--cyan); background: radial-gradient(circle at 50% 0%, #151d2f 0%, #070a10 90%);">
            <div class="modal-glow-badge mb-2" style="display:inline-block;"><i class="fa-solid fa-id-card"></i> ВХОД В СИНДИКАТ</div>
            <h3 class="font-bold mb-1 color-cyan" style="font-size:18px;">Личное дело перекупа</h3>
            <p class="sub-label mb-3" style="font-size:11px; color:#94a3b8;">
                Придумайте ваш позывной на авторынке. Он сохранится в облаке под вашим Telegram ID.
            </p>

            <div class="glass-card p-2 mb-3 text-left" style="background:#090e18;">
                <span class="sub-label" style="font-size:9px;">Ваш ID:</span>
                <div class="font-bold color-green" style="font-size:12px; font-family:monospace;">${window.state.player.uid}</div>
            </div>

            <div class="mb-3 text-left">
                <label class="sub-label block mb-1" style="font-size:10px;">Позывной (Никнейм):</label>
                <input type="text" id="onboardingNickInput" class="input-dark w-full" maxlength="20" placeholder="Например: Хантер_77" style="padding:10px; font-size:14px; text-align:center; font-weight:bold; border:1px solid var(--cyan); border-radius:8px;">
            </div>

            <button onclick="submitPlayerOnboarding()" class="btn btn-cyan w-full font-bold" style="padding:10px;">
                Начать карьеру перекупа <i class="fa-solid fa-arrow-right ml-1"></i>
            </button>
        </div>
    `;
    window._onboardingCallback = onComplete;
}

function submitPlayerOnboarding() {
    const input = document.getElementById('onboardingNickInput');
    let val = input ? input.value.trim() : "";
    if (!val || val.length < 2) {
        showToast("Позывной должен быть не короче 2 символов!", 'warning');
        if (window.AudioFx) window.AudioFx.play('error');
        return;
    }

    const validUid = window.tgUserId || window.state.player.uid;
    if (!validUid) {
        showToast("Ошибка: нет ID", 'error');
        return;
    }

    window.state.player.uid = String(validUid);
    window.state.player.name = val;
    window.state.player.onboardingDone = true;

    if (typeof saveState === 'function') saveState();
    if (typeof updateHeaderUI === 'function') updateHeaderUI();

    if (window.FB_Bridge?.Players?.pushSaveForce && !window.isPcDevMode()) {
        window.FB_Bridge.Players.pushSaveForce(String(validUid), window.state)
            .then(ok => console.log('[Onboarding] pushSaveForce →', ok ? 'OK' : 'FAIL'))
            .catch(e => console.warn('[Onboarding] pushSaveForce error:', e));
    }

    const overlay = document.getElementById('modalPlayerOnboarding');
    if (overlay) overlay.remove();

    if (window.AudioFx) {
        window.AudioFx.play('win');
        window.AudioFx.haptic('success');
    }
    showToast(`Добро пожаловать в игру, ${val}!`, 'success');

    if (typeof window._onboardingCallback === 'function') {
        window._onboardingCallback();
        window._onboardingCallback = null;
    }
}
window.submitPlayerOnboarding = submitPlayerOnboarding;

// ========================================================
// 7. КЛОНИРОВАНИЕ STATS-ROW ДЛЯ MARQUEE
// ========================================================
function _cloneStatsRow() {
    const row = document.getElementById('userStatsRow');
    if (!row) return;
    if (row.dataset.cloned === '1') return;

    try {
        const originalChildren = Array.from(row.children);
        originalChildren.forEach(child => {
            const clone = child.cloneNode(true);
            if (clone.id) {
                clone.dataset.cloneOf = clone.id;
                clone.removeAttribute('id');
            }
            clone.querySelectorAll('[id]').forEach(el => {
                el.dataset.cloneOf = el.id;
                el.removeAttribute('id');
            });
            row.appendChild(clone);
        });

        row.dataset.cloned = '1';
        console.log('[App] ✅ Stats-row клонирован для marquee (всего элементов:', row.children.length, ')');
    } catch (e) {
        console.warn('[App] Ошибка клонирования stats-row:', e);
    }
}

// ========================================================
// 8. ИНИЦИАЛИЗАЦИЯ С ACCESS CONTROL
// ========================================================
async function initTelegramAuthAndStorage(callback) {
    let callbackCalled = false;
    const safeCallback = () => {
        if (!callbackCalled) {
            callbackCalled = true;
            if (typeof callback === 'function') callback();
        }
    };

    const watchdogTimer = setTimeout(() => {
        console.warn("[App] Watchdog инициализации сработал.");
        safeCallback();
    }, 3000);

    // ─── ЭТАП 1: Telegram ───
    let tgUser = null;
    try {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();

            tgUser = tg.initDataUnsafe?.user || null;
            if (tgUser && tgUser.id) {
                window.tgUserData = tgUser;
                window.tgUserId = String(tgUser.id);
                console.log('[Auth] Telegram ID установлен:', window.tgUserId);
            }
        }
    } catch (e) {
        console.warn("[Auth] Ошибка Telegram WebApp:", e);
    }

    if (!tgUser || !tgUser.id) {
        if (window.tgUserId && String(window.tgUserId).startsWith('pc_dev_')) {
            console.log('[Auth] DEV-режим обнаружен, UID:', window.tgUserId);
            window.isPcDevSession = true;
            window.tgUserData = {
                id: window.tgUserId,
                first_name: 'DEV',
                last_name: 'Player',
                username: 'dev_player'
            };
        } else {
            console.error('[Auth] ⛔ Нет Telegram-пользователя и DEV-режим не активирован.');
            clearTimeout(watchdogTimer);
            showTelegramRequiredScreen();
            return;
        }
    } else {
        window.tgUserId = String(tgUser.id);
    }

    // ─── ЭТАП 2: Deep-link инвайт-код ───
    try {
        const startParamRes = await _processStartParam();
        if (startParamRes && startParamRes.success) {
            console.log('[App] 🎟️ Инвайт активирован через deep-link:', startParamRes.code);
        }
    } catch (e) {
        console.warn('[App] Ошибка обработки start_param:', e);
    }

    // ─── ЭТАП 3: AccessControl ───
    try {
        if (window.AccessControl && typeof window.AccessControl.checkAccess === 'function') {
            console.log('[App] 🔐 Проверка доступа через AccessControl...');
            const accessRes = await window.AccessControl.checkAccess(window.tgUserId);

            if (!accessRes || accessRes.success !== true) {
                console.warn('[App] ❌ Доступ запрещён:', accessRes?.reason || 'unknown');
                clearTimeout(watchdogTimer);
                showAccessDeniedScreen();

                const reason = accessRes?.reason || '';
                let msg = 'Требуется приглашение';
                let type = 'warning';
                if (reason === 'banned') { msg = '🚫 Вы забанены владельцем игры'; type = 'error'; }
                else if (reason === 'not_whitelisted') { msg = '🔒 Игра доступна только по приглашению'; type = 'warning'; }
                else if (reason === 'offline_no_cache') { msg = '⚠️ Нет сети и нет сохранённого доступа'; type = 'warning'; }

                setTimeout(() => { if (typeof showToast === 'function') showToast(msg, type); }, 500);
                return;
            }

            console.log('[App] ✅ Доступ разрешён:', accessRes.reason);
            if (accessRes.isOwner) {
                console.log('[App] 👑 Владелец игры обнаружен');
            }
        } else {
            console.warn('[App] ⚠️ AccessControl не загружен — пропускаем проверку');
        }
    } catch (e) {
        console.warn('[App] Ошибка AccessControl, продолжаем (fallback):', e);
    }

    // ─── ЭТАП 4: Firebase Auth ───
    if (window.FB_Bridge?.Auth) {
        try {
            const authRes = await window.FB_Bridge.Auth.initSession();
            console.log('[Auth] initSession результат:', authRes);
        } catch (e) {
            console.warn('[Auth] initSession упал:', e);
        }
    }

    if (window.FB_Bridge?.Auth?._forceVerifiedUserId) {
        window.FB_Bridge.Auth._forceVerifiedUserId(window.tgUserId);
    }

    // ─── ЭТАП 5: Сейв ───
    const hadLocalSave = typeof loadFromLocalStorage === 'function' ? loadFromLocalStorage() : false;

    if (!hadLocalSave && !window.isPcDevMode() && window.FB_Bridge?.Players?.pullSave) {
        try {
            const cloudSave = await window.FB_Bridge.Players.pullSave(window.tgUserId);
            if (cloudSave && typeof applyLoadedState === 'function') {
                applyLoadedState(cloudSave);
                console.log("[Cloud] Прогресс восстановлен из Firestore");
                showToast("☁️ Прогресс синхронизирован из облака!", 'success');
            }
        } catch (e) {
            console.warn("[Cloud] Ошибка pullSave:", e);
        }
    }

    // ─── ЭТАП 6: Имя и аватар ───
    if (tgUser && window.state && window.state.player) {
        let names = [];
        if (tgUser.first_name) names.push(tgUser.first_name);
        if (tgUser.last_name) names.push(tgUser.last_name);
        const fullName = names.join(' ').trim();

        const currentName = window.state.player.name || "";
        const isDefaultName = !currentName || currentName === "Перекуп #777" || currentName.startsWith("Гость");

        if (isDefaultName && fullName) window.state.player.name = fullName;
        if (tgUser.photo_url) window.state.player.avatarUrl = tgUser.photo_url;
    }

    if (window.isPcDevMode && window.isPcDevMode() && window.state && window.state.player) {
        if (!window.state.player.name || window.state.player.name === "Перекуп #777") {
            window.state.player.name = "DEV_Перекуп";
        }
    }

    if (window.state && window.state.player) {
        window.state.player.uid = String(window.tgUserId);
    }

    // ─── ЭТАП 7: Owner — все приложения ───
    if (window.isOwnerUser && window.isOwnerUser() && window.state && window.state.player) {
        if (!Array.isArray(window.state.player.unlockedApps)) window.state.player.unlockedApps = [];
        const allApps = ['barn', 'containers', 'autopodbor_order', 'street', 'darknet'];
        allApps.forEach(app => {
            if (!window.state.player.unlockedApps.includes(app)) {
                window.state.player.unlockedApps.push(app);
            }
        });
        console.log('[App] 👑 Owner получил все приложения:', allApps);
    }

    // ─── ЭТАП 8: Каталог машин из Firestore ───
    if (window.FB_Bridge?.CarsCatalog && !window.isPcDevMode()) {
        try { await window.FB_Bridge.CarsCatalog.seedDefaultCarsCatalog(); } catch (e) {}
    }

    clearTimeout(watchdogTimer);
    safeCallback();
}

// ========================================================
// 9. СТАРТ
// ========================================================
function initApp() {
    if (window.isPcDevMode && window.isPcDevMode()) {
        console.log('[App] DEV-режим активен. UID:', window.tgUserId);
    }

    setupOnlineListeners();

    if (window.AppM) {
        window.AppMessenger = window.AppM;
        console.log('[App] ✅ window.AppMessenger = AppM (M+ Hub)');
    }

    initTelegramAuthAndStorage(async () => {
        if (!window.tgUserId) {
            console.error('[App] Критическая ошибка: UID не установлен');
            showTelegramRequiredScreen();
            return;
        }

        checkPlayerOnboarding(async () => {
            const appShell = document.getElementById('appShell');
            const pcAuth = document.getElementById('pcAuthScreen');
            const tgScreen = document.getElementById('tgRequiredScreen');
            const denied = document.getElementById('accessDeniedScreen');
            if (appShell) appShell.style.display = 'flex';
            if (pcAuth) pcAuth.style.display = 'none';
            if (tgScreen) tgScreen.style.display = 'none';
            if (denied) denied.style.display = 'none';

            if (typeof _syncStarRateToBank === 'function') _syncStarRateToBank();

            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (typeof updateLevelGatesUI === 'function') updateLevelGatesUI();
            if (typeof applyLanguageToDOM === 'function') applyLanguageToDOM();
            if (window.ThemeManager) window.ThemeManager.init();
            if (typeof checkRealTimeDayChange === 'function') checkRealTimeDayChange();

            _cloneStatsRow();

            createOwnerPanelButton();

            if (window.FB_Bridge?.CarsCatalog && !window.isPcDevMode()) {
                try { await window.FB_Bridge.CarsCatalog.fetchCloudCars(); } catch(e) {}
            }

            setTimeout(() => {
                try {
                    if (typeof PhoneBusiness !== 'undefined' && typeof PhoneBusiness.ensureState === 'function') {
                        PhoneBusiness.ensureState();
                        if (window.state.businesses && window.state.businesses.length > 0) {
                            console.log('[App] ✅ Бизнесы инициализированы:', window.state.businesses.length);
                            if (typeof saveState === 'function') saveState();
                        } else {
                            console.warn('[App] ❌ BUSINESS_DATA не загружен или пустой');
                        }
                    } else {
                        console.warn('[App] ❌ PhoneBusiness не загружен');
                    }
                } catch (e) {
                    console.error('[App] Ошибка PhoneBusiness.ensureState:', e);
                }
            }, 800);

            setTimeout(() => {
                try {
                    const hasCars = window.CAR_DATABASE && Object.values(window.CAR_DATABASE).some(arr => Array.isArray(arr) && arr.length > 0);
                    console.log('[App] 🚗 Диагностика CAR_DATABASE:',
                        hasCars ? 'OK' : 'ПУСТО',
                        'economy:', window.CAR_DATABASE?.economy?.length || 0,
                        'comfort:', window.CAR_DATABASE?.comfort?.length || 0
                    );

                    if (hasCars) {
                        if (typeof populateMarketFeed === 'function' && (!window.state.marketFeed || window.state.marketFeed.length === 0)) {
                            console.log('[App] ⚡ Принудительный populateMarketFeed');
                            populateMarketFeed();
                        } else if (window.state.marketFeed && window.state.marketFeed.length > 0) {
                            console.log('[App] ✅ Лента рынка уже заполнена:', window.state.marketFeed.length, 'лотов');
                        }
                    } else {
                        console.error('[App] ❌ CAR_DATABASE пустой! Проверьте пути data/cars/*.js');
                    }
                } catch (e) {
                    console.error('[App] Ошибка populateMarketFeed:', e);
                }
            }, 1500);

            if (typeof renderGarage === 'function') renderGarage();
            if (typeof renderSalesLot === 'function') renderSalesLot();
            if (typeof renderMarketFeed === 'function') renderMarketFeed();

            if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.init === 'function') {
                PhoneManager.init();
            }

            if (window.NotificationCenter && !window.isPcDevMode()) {
                try {
                    await window.NotificationCenter.processStartupNotifications();

                    if (_notificationUnsubscribe) {
                        try { _notificationUnsubscribe(); } catch (e) {}
                    }
                    _notificationUnsubscribe = window.NotificationCenter.subscribe();
                    console.log('[App] NotificationCenter подписка активна');
                } catch (e) {
                    console.warn('[App] NotificationCenter init error:', e);
                }
            }

            if (typeof switchTab === 'function') switchTab('tabMarket');

            try {
                const lastSeen = localStorage.getItem('perekup_last_seen_version');
                if (lastSeen !== window.CURRENT_GAME_VERSION) {
                    setTimeout(() => { if (typeof openPatchNotesModal === 'function') openPatchNotesModal(); }, 2000);
                }
            } catch(e) {}
        });
    });
}

// ========================================================
// 10. ЭКСПОРТ
// ========================================================
window.initApp = initApp;
window._cloneStatsRow = _cloneStatsRow;
window._processStartParam = _processStartParam;
window.showAccessDeniedScreen = showAccessDeniedScreen;
window.createOwnerPanelButton = createOwnerPanelButton;

console.log('[💠 app-loader.js v4.3.1] Загрузчик + Авторизация + AccessControl + HUD ✓ (без дублирования scriptQueue)');
// ========================================================
// js/access-control.js — СИСТЕМА ДОСТУПА ПО ПРИГЛАШЕНИЯМ И ПРОГРЕССИИ (v2.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v2.0.0:
//   1. Встроен игровой контроль разделов (FeatureAccess):
//      Сараи, Контейнеры, Под ключ, Стритрейсинг, Даркнет, Синдикат.
//   2. Ограничения по уровню (minLevel) и платная покупка лицензий/пропусков.
//   3. Модальное окно подтверждения открытия контента с ценой в ₽ и ⭐.
//   4. Сохранены все инвайт-коды, whitelist, Firestore fail-open и Owner-панель.
//
// ⭐ v1.2.0 (SPRINT 4 — КРИТИЧЕСКИЙ ФИКС «НЕТ СЕТИ»):
//   1. _ensureInit() теперь ЖДЁТ появления window.FB_Core.db (до 8с).
//   2. _syncGlobalFlagFromCloud() — fail-open: если Firestore недоступен
//      И нет локального кэша, игрока ПУСКАЕМ.
//   3. checkAccess() — подробное диагностическое логирование каждого шага.
//   4. Все Firestore-запросы обёрнуты в таймауты (не зависаем).
// ========================================================

(function() {
    'use strict';

    // ========================================================
    // 1. КОНСТАНТЫ
    // ========================================================

    const OWNER_TELEGRAM_ID = '1944392183';
    const OWNER_USERNAME = 'taktojenorm';

    const CACHE_KEY_PREFIX = 'perekup_access_cache_';
    const CACHE_TTL_MS = 5 * 60 * 1000;

    const GLOBAL_ACCESS_FLAG_KEY = 'perekup_access_disabled';
    const GLOBAL_ACCESS_FLAG_TTL_KEY = 'perekup_access_disabled_ts';
    const GLOBAL_ACCESS_FLAG_TTL_MS = 60 * 1000;

    // ⭐ v1.2.0: сколько ждать появления FB_Core.db
    const FB_WAIT_TIMEOUT_MS = 8000;
    const FB_WAIT_INTERVAL_MS = 100;

    // ⭐ v1.2.0: таймаут на отдельные Firestore-запросы
    const FIRESTORE_REQUEST_TIMEOUT_MS = 10000;

    const COL_WHITELIST = 'access_whitelist';
    const COL_INVITES   = 'access_invites';
    const COL_REQUESTS  = 'access_requests';
    const COL_SETTINGS  = 'access_settings';
    const DOC_GLOBAL    = 'global';

    const MAX_ACTIVE_INVITES = 50;

    // ========================================================
    // 2. ВНУТРЕННЕЕ СОСТОЯНИЕ
    // ========================================================
    let _fbCore = null;
    let _db = null;
    let _firestoreFns = null;
    let _fbInitInProgress = false;

    let _globalFlagCache = {
        value: null,
        ts: 0,
        loading: false
    };

    // ========================================================
    // 3. ХЕЛПЕРЫ
    // ========================================================

    function _log(msg, ...args) {
        console.log('[AccessControl] ' + msg, ...args);
    }
    function _logWarn(msg, ...args) {
        console.warn('[AccessControl] ' + msg, ...args);
    }
    function _logErr(msg, ...args) {
        console.error('[AccessControl] ' + msg, ...args);
    }

    /**
     * ⭐ v1.2.0: таймаут-обёртка для любого промиса.
     */
    function _withTimeout(promise, timeoutMs, label = 'operation') {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`${label} timeout (${timeoutMs}ms)`)), timeoutMs)
            )
        ]);
    }

    async function _getFirestoreFns() {
        if (_firestoreFns) return _firestoreFns;
        try {
            const mod = await _withTimeout(
                import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'import firebase-firestore'
            );
            _firestoreFns = {
                doc: mod.doc,
                getDoc: mod.getDoc,
                setDoc: mod.setDoc,
                updateDoc: mod.updateDoc,
                deleteDoc: mod.deleteDoc,
                collection: mod.collection,
                getDocs: mod.getDocs,
                query: mod.query,
                where: mod.where,
                orderBy: mod.orderBy,
                limit: mod.limit,
                serverTimestamp: mod.serverTimestamp,
                Timestamp: mod.Timestamp
            };
            return _firestoreFns;
        } catch (e) {
            _logWarn('Не удалось загрузить Firestore:', e.message);
            return null;
        }
    }

    /**
     * ⭐ v1.2.0: главный фикс «Нет сети».
     * Ждём появления window.FB_Core.db до FB_WAIT_TIMEOUT_MS.
     */
    async function _ensureInit() {
        if (_db) return true;

        if (_fbInitInProgress) {
            const start = Date.now();
            while (_fbInitInProgress && Date.now() - start < FB_WAIT_TIMEOUT_MS + 500) {
                await new Promise(r => setTimeout(r, 50));
            }
            return !!_db;
        }

        _fbInitInProgress = true;
        const startTs = Date.now();
        let attempts = 0;

        try {
            while (!window.FB_Core?.db) {
                attempts++;
                const elapsed = Date.now() - startTs;

                if (elapsed >= FB_WAIT_TIMEOUT_MS) {
                    _logWarn(
                        `FB_Core.db не появился за ${FB_WAIT_TIMEOUT_MS}мс ` +
                        `(${attempts} попыток). Работаем в fallback-режиме.`
                    );
                    return false;
                }

                if (attempts % 10 === 0) {
                    _log(`Ожидание Firebase... ${Math.round(elapsed / 1000)}с / ${FB_WAIT_TIMEOUT_MS / 1000}с`);
                }

                await new Promise(r => setTimeout(r, FB_WAIT_INTERVAL_MS));
            }

            _fbCore = window.FB_Core;
            _db = _fbCore.db;

            _log(`✓ FB_Core.db найден (ждали ${Date.now() - startTs}мс, ${attempts} попыток)`);

            await _getFirestoreFns();
            return !!_db;

        } catch (e) {
            _logErr('Критическая ошибка в _ensureInit:', e.message);
            return false;
        } finally {
            _fbInitInProgress = false;
        }
    }

    function _isOwner(uid) {
        if (!uid) return false;
        if (OWNER_TELEGRAM_ID && String(uid) === String(OWNER_TELEGRAM_ID)) return true;

        try {
            const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
            if (tgUser && tgUser.username) {
                const uname = String(tgUser.username).toLowerCase().replace(/^@/, '');
                if (uname === OWNER_USERNAME) return true;
            }
        } catch (e) {}

        return false;
    }

    function _readCache(uid) {
        try {
            const raw = localStorage.getItem(CACHE_KEY_PREFIX + uid);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || !data.ts) return null;
            if (Date.now() - data.ts > CACHE_TTL_MS) {
                localStorage.removeItem(CACHE_KEY_PREFIX + uid);
                return null;
            }
            return data;
        } catch (e) {
            return null;
        }
    }

    function _writeCache(uid, payload) {
        try {
            localStorage.setItem(CACHE_KEY_PREFIX + uid, JSON.stringify({
                ...payload,
                ts: Date.now()
            }));
        } catch (e) {}
    }

    function _clearCache(uid) {
        try {
            localStorage.removeItem(CACHE_KEY_PREFIX + uid);
        } catch (e) {}
    }

    function _generateInviteCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // ========================================================
    // ГЛОБАЛЬНЫЙ ФЛАГ ДОСТУПА В ИГРУ (с fail-open)
    // ========================================================

    function _readGlobalFlagLocal() {
        try {
            const value = localStorage.getItem(GLOBAL_ACCESS_FLAG_KEY);
            const ts = parseInt(localStorage.getItem(GLOBAL_ACCESS_FLAG_TTL_KEY) || '0', 10);
            if (value === null) return { value: null, ts: 0 };
            return {
                value: value === 'true',
                ts: isNaN(ts) ? 0 : ts
            };
        } catch (e) {
            return { value: null, ts: 0 };
        }
    }

    function _writeGlobalFlagLocal(value) {
        try {
            localStorage.setItem(GLOBAL_ACCESS_FLAG_KEY, String(!!value));
            localStorage.setItem(GLOBAL_ACCESS_FLAG_TTL_KEY, String(Date.now()));
        } catch (e) {}
    }

    async function _readGlobalFlagCloud() {
        const fbReady = await _ensureInit();
        if (!fbReady) return null;

        try {
            const fns = _firestoreFns;
            if (!fns) return null;

            const ref = fns.doc(_db, COL_SETTINGS, DOC_GLOBAL);
            const snap = await _withTimeout(
                fns.getDoc(ref),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'readGlobalFlagCloud'
            );

            if (!snap.exists()) {
                return false;
            }

            const data = snap.data();
            return data.accessDisabled === true;

        } catch (e) {
            _logWarn('Ошибка чтения глобального флага из Firestore:', e.message);
            return null;
        }
    }

    async function _syncGlobalFlagFromCloud(force = false) {
        const now = Date.now();

        if (!force &&
            _globalFlagCache.value !== null &&
            (now - _globalFlagCache.ts) < GLOBAL_ACCESS_FLAG_TTL_MS) {
            return _globalFlagCache.value;
        }

        if (_globalFlagCache.loading) {
            const start = Date.now();
            while (_globalFlagCache.loading && Date.now() - start < FIRESTORE_REQUEST_TIMEOUT_MS) {
                await new Promise(r => setTimeout(r, 50));
            }
            return _globalFlagCache.value;
        }

        const localCached = _readGlobalFlagLocal();
        if (!force && localCached.value !== null && (now - localCached.ts) < GLOBAL_ACCESS_FLAG_TTL_MS) {
            _globalFlagCache = { value: localCached.value, ts: localCached.ts, loading: false };
            return localCached.value;
        }

        _globalFlagCache.loading = true;
        try {
            const cloudValue = await _readGlobalFlagCloud();

            if (cloudValue !== null) {
                _globalFlagCache = { value: cloudValue, ts: now, loading: false };
                _writeGlobalFlagLocal(cloudValue);
                _log('Глобальный флаг синхронизирован:', cloudValue ? 'ДОСТУП ОТКРЫТ' : 'ПО ПРИГЛАШЕНИЯМ');
                return cloudValue;
            }

            if (localCached.value !== null) {
                _log('Firestore недоступен → используем локальный кэш:', localCached.value);
                _globalFlagCache = { value: localCached.value, ts: now, loading: false };
                return localCached.value;
            }

            _logWarn('⚠️ FAIL-OPEN: Firestore недоступен и кэша нет → пускаем игрока');
            _globalFlagCache = { value: true, ts: now, loading: false };
            return true;

        } catch (e) {
            _logWarn('syncGlobalFlag исключение:', e.message);
            _globalFlagCache.loading = false;
            if (localCached.value !== null) return localCached.value;
            _logWarn('⚠️ FAIL-OPEN (catch): пускаем игрока');
            return true;
        }
    }

    async function _writeGlobalFlagCloud(value) {
        _writeGlobalFlagLocal(value);
        _globalFlagCache = { value: value, ts: Date.now(), loading: false };

        const fbReady = await _ensureInit();
        if (!fbReady) {
            _logWarn('Firestore недоступен, флаг записан только локально');
            return false;
        }

        try {
            const fns = _firestoreFns;
            const ref = fns.doc(_db, COL_SETTINGS, DOC_GLOBAL);

            await _withTimeout(
                fns.setDoc(ref, {
                    accessDisabled: !!value,
                    updatedAt: Date.now(),
                    updatedBy: window.Telegram?.WebApp?.initDataUnsafe?.user?.id
                        ? String(window.Telegram.WebApp.initDataUnsafe.user.id)
                        : 'unknown'
                }, { merge: true }),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'writeGlobalFlagCloud'
            );

            _log('Глобальный флаг записан в Firestore:', value);
            return true;
        } catch (e) {
            _logErr('Ошибка записи глобального флага:', e.message);
            return false;
        }
    }

    function _isAccessControlDisabled() {
        if (_globalFlagCache.value !== null) return _globalFlagCache.value;
        const local = _readGlobalFlagLocal();
        return local.value === true;
    }

    // ========================================================
    // 4. ГЛАВНЫЙ МЕТОД: ПРОВЕРКА ДОСТУПА В ИГРУ
    // ========================================================
    async function checkAccess(uid) {
        if (!uid) {
            _logWarn('checkAccess: нет UID');
            return { success: false, reason: 'no_uid' };
        }

        const cleanUid = String(uid);
        _log(`checkAccess(${cleanUid}) → START`);

        if (_isOwner(cleanUid)) {
            _log('👑 Owner — доступ разрешён');
            return { success: true, reason: 'owner', isOwner: true };
        }

        if (cleanUid.startsWith('pc_dev_') || cleanUid.startsWith('dev_')) {
            _log('DEV-режим — доступ разрешён');
            return { success: true, reason: 'dev_mode' };
        }

        try {
            const isGloballyDisabled = await _syncGlobalFlagFromCloud();
            if (isGloballyDisabled === true) {
                _log('🌐 Доступ открыт глобально (или fail-open)');
                return { success: true, reason: 'global_disabled' };
            }
        } catch (e) {
            _logWarn('Ошибка проверки глобального флага, продолжаем:', e.message);
        }

        const cached = _readCache(cleanUid);
        if (cached && cached.allowed === true) {
            _log('Доступ из кэша (allowed)');
            return { success: true, reason: 'cache_allowed', isOwner: !!cached.isOwner };
        }
        if (cached && cached.allowed === false) {
            _log('Доступ из кэша (denied):', cached.reason);
            return { success: false, reason: cached.reason || 'cache_denied' };
        }

        try {
            const fbReady = await _ensureInit();

            if (!fbReady) {
                _logWarn('⚠️ Firestore недоступен, кэша нет → FAIL-OPEN (пускаем игрока)');
                return { success: true, reason: 'offline_fail_open' };
            }

            const fns = _firestoreFns;
            if (!fns) {
                _logWarn('Firestore-функции недоступны → FAIL-OPEN');
                return { success: true, reason: 'no_firestore_fns_fail_open' };
            }

            const whitelistRef = fns.doc(_db, COL_WHITELIST, cleanUid);
            const snap = await _withTimeout(
                fns.getDoc(whitelistRef),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'readWhitelist'
            );

            if (snap.exists()) {
                const data = snap.data();

                if (data.isBanned === true) {
                    _writeCache(cleanUid, { allowed: false, reason: 'banned' });
                    _log('❌ Игрок забанен');
                    return { success: false, reason: 'banned' };
                }

                _writeCache(cleanUid, { allowed: true, isOwner: false });
                _log('✅ Доступ разрешён (whitelist):', data.name || cleanUid);
                return {
                    success: true,
                    reason: 'whitelist',
                    name: data.name || null
                };
            }

            _writeCache(cleanUid, { allowed: false, reason: 'not_whitelisted' });
            _log('❌ Не в whitelist:', cleanUid);
            return { success: false, reason: 'not_whitelisted' };

        } catch (e) {
            _logWarn('Ошибка Firestore-запроса whitelist:', e.message);

            if (cached && cached.allowed === true) {
                return { success: true, reason: 'cache_fallback' };
            }

            _logWarn('⚠️ FAIL-OPEN: ошибка Firestore без кэша → пускаем игрока');
            return { success: true, reason: 'firestore_error_fail_open' };
        }
    }

    // ========================================================
    // 5. АКТИВАЦИЯ ИНВАЙТ-КОДА
    // ========================================================
    async function redeemInviteCode(code, userInfo = null) {
        if (!code || typeof code !== 'string') {
            return { success: false, error: 'Пустой код' };
        }

        const cleanCode = code.trim().toUpperCase();
        if (cleanCode.length !== 8) {
            return { success: false, error: 'Код должен быть 8 символов' };
        }

        let uid = null, name = null, username = null;

        if (userInfo && userInfo.uid) {
            uid = String(userInfo.uid);
            name = userInfo.name || null;
            username = userInfo.username || null;
        } else {
            const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
            if (!tgUser || !tgUser.id) {
                return { success: false, error: 'Нет Telegram-пользователя' };
            }
            uid = String(tgUser.id);
            const names = [];
            if (tgUser.first_name) names.push(tgUser.first_name);
            if (tgUser.last_name) names.push(tgUser.last_name);
            name = names.join(' ').trim() || (tgUser.username ? '@' + tgUser.username : 'Перекуп #' + tgUser.id);
            username = tgUser.username || null;
        }

        if (_isOwner(uid)) {
            return { success: true, message: 'Вы владелец' };
        }

        try {
            const fbReady = await _ensureInit();
            if (!fbReady) {
                return { success: false, error: 'Нет подключения к серверу' };
            }

            const fns = _firestoreFns;
            const inviteRef = fns.doc(_db, COL_INVITES, cleanCode);
            const inviteSnap = await _withTimeout(
                fns.getDoc(inviteRef),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'redeemInviteCode-getInvite'
            );

            if (!inviteSnap.exists()) {
                return { success: false, error: 'Код не найден или уже использован' };
            }

            const inviteData = inviteSnap.data();

            if (inviteData.expiresAt && inviteData.expiresAt < Date.now()) {
                return { success: false, error: 'Код просрочен' };
            }

            const usedCount = inviteData.usedCount || 0;
            const maxUses = inviteData.maxUses || 1;
            if (usedCount >= maxUses) {
                return { success: false, error: 'Код уже полностью использован' };
            }

            const now = Date.now();

            const whitelistRef = fns.doc(_db, COL_WHITELIST, uid);
            await _withTimeout(
                fns.setDoc(whitelistRef, {
                    telegramId: uid,
                    name: name,
                    username: username,
                    addedAt: now,
                    addedBy: 'invite:' + cleanCode,
                    isBanned: false
                }, { merge: true }),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'redeemInviteCode-setWhitelist'
            );

            const usedByList = Array.isArray(inviteData.usedBy) ? inviteData.usedBy : [];
            usedByList.push({ uid: uid, name: name, at: now });

            await _withTimeout(
                fns.updateDoc(inviteRef, {
                    usedCount: usedCount + 1,
                    usedBy: usedByList
                }),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'redeemInviteCode-updateInvite'
            );

            _clearCache(uid);

            _log('🎉 Код активирован:', cleanCode, '→', uid);
            return { success: true, message: 'Доступ активирован!' };

        } catch (e) {
            _logErr('Ошибка активации кода:', e.message);
            return { success: false, error: e.message || 'Ошибка сервера' };
        }
    }

    // ========================================================
    // 6. OWNER-ФУНКЦИИ
    // ========================================================
    async function createInviteCode(options = {}) {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const uid = tgUser?.id ? String(tgUser.id) : null;

        if (!_isOwner(uid)) {
            return { success: false, error: 'Только владелец может создавать коды' };
        }

        const fbReady = await _ensureInit();
        if (!fbReady) {
            return { success: false, error: 'Нет подключения к серверу' };
        }

        try {
            const fns = _firestoreFns;

            const activeQuery = fns.query(
                fns.collection(_db, COL_INVITES),
                fns.limit(MAX_ACTIVE_INVITES + 1)
            );
            const activeSnap = await _withTimeout(
                fns.getDocs(activeQuery),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'createInviteCode-countInvites'
            );

            if (activeSnap.size >= MAX_ACTIVE_INVITES) {
                return { success: false, error: `Лимит ${MAX_ACTIVE_INVITES} активных кодов достигнут` };
            }

            const code = _generateInviteCode();
            const now = Date.now();
            const ttlDays = options.ttlDays || 7;
            const maxUses = options.maxUses || 1;

            const payload = {
                code: code,
                createdBy: uid,
                createdAt: now,
                expiresAt: now + (ttlDays * 24 * 60 * 60 * 1000),
                maxUses: maxUses,
                usedCount: 0,
                usedBy: [],
                note: options.note || ''
            };

            const inviteRef = fns.doc(_db, COL_INVITES, code);
            await _withTimeout(
                fns.setDoc(inviteRef, payload),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'createInviteCode-setDoc'
            );

            _log('🎟️ Создан инвайт:', code);
            return { success: true, code: code, expiresAt: payload.expiresAt };
        } catch (e) {
            _logErr('Ошибка создания кода:', e.message);
            return { success: false, error: e.message };
        }
    }

    async function listInvites() {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const uid = tgUser?.id ? String(tgUser.id) : null;

        if (!_isOwner(uid)) {
            return { success: false, error: 'Только владелец' };
        }

        const fbReady = await _ensureInit();
        if (!fbReady) return { success: false, error: 'Нет подключения' };

        try {
            const fns = _firestoreFns;
            const q = fns.query(fns.collection(_db, COL_INVITES), fns.limit(100));
            const snap = await _withTimeout(
                fns.getDocs(q),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'listInvites'
            );

            const invites = [];
            const now = Date.now();

            snap.forEach(d => {
                const data = d.data();
                const isExpired = data.expiresAt && data.expiresAt < now;
                const isUsed = (data.usedCount || 0) >= (data.maxUses || 1);
                invites.push({
                    code: d.id,
                    ...data,
                    isExpired: isExpired,
                    isUsed: isUsed,
                    isActive: !isExpired && !isUsed
                });
            });

            invites.sort((a, b) => {
                if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
                return (b.createdAt || 0) - (a.createdAt || 0);
            });

            return { success: true, invites: invites };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async function deleteInvite(code) {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const uid = tgUser?.id ? String(tgUser.id) : null;

        if (!_isOwner(uid)) return { success: false, error: 'Только владелец' };

        const fbReady = await _ensureInit();
        if (!fbReady) return { success: false, error: 'Нет подключения' };

        try {
            const fns = _firestoreFns;
            const ref = fns.doc(_db, COL_INVITES, code.toUpperCase());
            await _withTimeout(
                fns.deleteDoc(ref),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'deleteInvite'
            );
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async function listWhitelist() {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const uid = tgUser?.id ? String(tgUser.id) : null;

        if (!_isOwner(uid)) return { success: false, error: 'Только владелец' };

        const fbReady = await _ensureInit();
        if (!fbReady) return { success: false, error: 'Нет подключения' };

        try {
            const fns = _firestoreFns;
            const q = fns.query(fns.collection(_db, COL_WHITELIST), fns.limit(200));
            const snap = await _withTimeout(
                fns.getDocs(q),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'listWhitelist'
            );

            const players = [];
            snap.forEach(d => {
                players.push({ telegramId: d.id, ...d.data() });
            });

            players.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
            return { success: true, players: players };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async function toggleBanPlayer(targetUid) {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const uid = tgUser?.id ? String(tgUser.id) : null;

        if (!_isOwner(uid)) return { success: false, error: 'Только владелец' };
        if (String(targetUid) === String(OWNER_TELEGRAM_ID)) {
            return { success: false, error: 'Нельзя банить владельца' };
        }

        const fbReady = await _ensureInit();
        if (!fbReady) return { success: false, error: 'Нет подключения' };

        try {
            const fns = _firestoreFns;
            const ref = fns.doc(_db, COL_WHITELIST, String(targetUid));
            const snap = await _withTimeout(
                fns.getDoc(ref),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'toggleBan-get'
            );

            if (!snap.exists()) {
                return { success: false, error: 'Игрок не найден' };
            }

            const current = snap.data();
            const newBanState = !current.isBanned;

            await _withTimeout(
                fns.updateDoc(ref, { isBanned: newBanState }),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'toggleBan-update'
            );
            _clearCache(String(targetUid));

            return { success: true, isBanned: newBanState };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async function revokeAccess(targetUid) {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const uid = tgUser?.id ? String(tgUser.id) : null;

        if (!_isOwner(uid)) return { success: false, error: 'Только владелец' };
        if (String(targetUid) === String(OWNER_TELEGRAM_ID)) {
            return { success: false, error: 'Нельзя удалить владельца' };
        }

        const fbReady = await _ensureInit();
        if (!fbReady) return { success: false, error: 'Нет подключения' };

        try {
            const fns = _firestoreFns;
            const ref = fns.doc(_db, COL_WHITELIST, String(targetUid));
            await _withTimeout(
                fns.deleteDoc(ref),
                FIRESTORE_REQUEST_TIMEOUT_MS,
                'revokeAccess'
            );
            _clearCache(String(targetUid));
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async function quickCreateAndCopy() {
        const res = await createInviteCode({ maxUses: 1, ttlDays: 3 });
        if (res.success && res.code) {
            try {
                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(res.code);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = res.code;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                if (typeof showToast === 'function') {
                    showToast(`🎟️ Код создан: ${res.code} (скопирован)`);
                }
            } catch (e) {
                if (typeof showToast === 'function') {
                    showToast(`🎟️ Код создан: ${res.code}`);
                }
            }
        }
        return res;
    }

    // ========================================================
    // 7. УПРАВЛЕНИЕ СИСТЕМОЙ ДОСТУПА В ИГРУ
    // ========================================================
    async function disableAccessControl() {
        try {
            const ok = await _writeGlobalFlagCloud(true);
            _log('🌐 Система доступа ОТКЛЮЧЕНА (пускаем всех)');
            return { success: true, cloudWritten: ok };
        } catch (e) {
            _logErr('Ошибка отключения:', e.message);
            return { success: false, error: e.message };
        }
    }

    async function enableAccessControl() {
        try {
            const ok = await _writeGlobalFlagCloud(false);
            _log('🔒 Система доступа ВКЛЮЧЕНА');
            return { success: true, cloudWritten: ok };
        } catch (e) {
            _logErr('Ошибка включения:', e.message);
            return { success: false, error: e.message };
        }
    }

    function isAccessControlEnabled() {
        return !_isAccessControlDisabled();
    }

    async function refreshAccessFlag() {
        await _syncGlobalFlagFromCloud(true);
        return _globalFlagCache.value === true ? false : true;
    }

    // ========================================================
    // 8. OWNER-ПАНЕЛЬ UI
    // ========================================================
    async function openOwnerPanel() {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const uid = tgUser?.id ? String(tgUser.id) : null;

        if (!_isOwner(uid)) {
            if (typeof showToast === 'function') showToast('❌ Только владелец');
            return;
        }

        let modal = document.getElementById('modalAccessManager');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalAccessManager';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-box" style="max-width: 480px;">
                <div class="flex-between mb-2">
                    <div class="modal-glow-badge" style="color:#ffd700; border-color:rgba(255,215,0,0.4);">
                        <i class="fa-solid fa-crown"></i> OWNER-ПАНЕЛЬ ДОСТУПА
                    </div>
                    <button onclick="AccessControl.closeOwnerPanel()" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>
                <div class="text-center p-3">
                    <div class="radar-spinner-ring mb-2" style="margin: 0 auto;"></div>
                    <div class="sub-label">Загрузка данных...</div>
                </div>
            </div>
        `;

        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalAccessManager', { closeOthers: true });
        } else {
            modal.classList.add('active');
        }

        await refreshAccessFlag();

        const [invitesRes, whitelistRes] = await Promise.all([
            listInvites(),
            listWhitelist()
        ]);

        const invites = invitesRes.success ? invitesRes.invites : [];
        const players = whitelistRes.success ? whitelistRes.players : [];

        const activeInvites = invites.filter(i => i.isActive);
        const totalPlayers = players.filter(p => !p.isBanned).length;
        const bannedCount = players.filter(p => p.isBanned).length;
        const systemEnabled = isAccessControlEnabled();

        modal.innerHTML = `
            <div class="modal-box" style="max-width: 480px; max-height: 90vh; overflow-y: auto;">
                <div class="flex-between mb-2">
                    <div class="modal-glow-badge" style="color:#ffd700; border-color:rgba(255,215,0,0.4); background:rgba(255,215,0,0.08);">
                        <i class="fa-solid fa-crown"></i> OWNER-ПАНЕЛЬ
                    </div>
                    <button onclick="AccessControl.closeOwnerPanel()" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                <div class="glass-card p-3 mb-3" style="border: 1.5px solid ${systemEnabled ? 'rgba(0,230,118,0.5)' : 'rgba(255,179,0,0.6)'}; background:${systemEnabled ? 'rgba(0,230,118,0.06)' : 'rgba(255,179,0,0.08)'};">
                    <div class="flex-between mb-2">
                        <div>
                            <b class="text-xs ${systemEnabled ? 'color-green' : 'color-amber'}">
                                <i class="fa-solid fa-globe mr-1"></i> Система доступа
                            </b>
                            <div class="sub-label" style="font-size:9.5px;">
                                ${systemEnabled
                                    ? 'Только игроки из whitelist могут войти в игру'
                                    : '⚠️ ИГРА ОТКРЫТА ДЛЯ ВСЕХ игроков без инвайтов'}
                            </div>
                        </div>
                        <span class="tag-badge ${systemEnabled ? 'bg-tag-green' : 'bg-tag-amber'}" style="font-size:8px;">
                            ${systemEnabled ? 'ВКЛЮЧЕНА' : 'ОТКРЫТА ДЛЯ ВСЕХ'}
                        </span>
                    </div>
                    ${systemEnabled ? `
                        <button onclick="AccessControl.disableSystem()" class="btn btn-amber btn-sm w-full" style="font-size:11px;">
                            🌐 ОТКРЫТЬ ИГРУ ДЛЯ ВСЕХ (пускать без инвайтов)
                        </button>
                    ` : `
                        <button onclick="AccessControl.enableSystem()" class="btn btn-green btn-sm w-full" style="font-size:11px;">
                            🔒 ВКЛЮЧИТЬ ДОСТУП ПО ПРИГЛАШЕНИЯМ
                        </button>
                    `}
                </div>

                <div class="grid-3 mb-3" style="gap:6px;">
                    <div class="glass-card p-2 text-center" style="background:rgba(0,230,118,0.08); border-color:rgba(0,230,118,0.3);">
                        <div class="sub-label" style="font-size:8px;">ИГРОКИ</div>
                        <div class="font-bold color-green" style="font-size:18px;">${totalPlayers}</div>
                    </div>
                    <div class="glass-card p-2 text-center" style="background:rgba(0,242,254,0.08); border-color:rgba(0,242,254,0.3);">
                        <div class="sub-label" style="font-size:8px;">АКТИВНЫЕ КОДЫ</div>
                        <div class="font-bold color-cyan" style="font-size:18px;">${activeInvites.length}</div>
                    </div>
                    <div class="glass-card p-2 text-center" style="background:rgba(255,51,102,0.08); border-color:rgba(255,51,102,0.3);">
                        <div class="sub-label" style="font-size:8px;">БАНЫ</div>
                        <div class="font-bold color-red" style="font-size:18px;">${bannedCount}</div>
                    </div>
                </div>

                <div class="glass-card p-2 mb-3" style="border-color:rgba(255,215,0,0.4);">
                    <b class="text-xs color-amber mb-2 block"><i class="fa-solid fa-bolt mr-1"></i> Быстрое создание кода</b>
                    <div class="grid-2" style="gap:6px;">
                        <button onclick="AccessControl.quickCreate(1, 3)" class="btn btn-green btn-sm" style="font-size:10px;">
                            <i class="fa-solid fa-ticket mr-1"></i> 1 игрок / 3 дня
                        </button>
                        <button onclick="AccessControl.quickCreate(5, 7)" class="btn btn-cyan btn-sm" style="font-size:10px;">
                            <i class="fa-solid fa-users mr-1"></i> 5 игроков / 7 дней
                        </button>
                    </div>
                </div>

                <div class="glass-card p-2 mb-3">
                    <div class="flex-between mb-2">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-ticket mr-1"></i> Инвайт-коды (${invites.length})</b>
                        <button onclick="AccessControl.refreshPanel()" class="btn btn-dark btn-auto btn-sm" style="font-size:9px; padding:2px 8px;">
                            <i class="fa-solid fa-rotate"></i>
                        </button>
                    </div>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${invites.length === 0 ? `
                            <div class="sub-label text-center py-3" style="font-size:10px;">Нет созданных кодов</div>
                        ` : invites.slice(0, 20).map(inv => {
                            const status = inv.isExpired ? 'Истёк' : (inv.isUsed ? 'Использован' : 'Активен');
                            const statusColor = inv.isExpired ? 'color-red' : (inv.isUsed ? 'color-amber' : 'color-green');
                            const daysLeft = inv.expiresAt ? Math.max(0, Math.ceil((inv.expiresAt - Date.now()) / 86400000)) : 0;
                            return `
                                <div class="p-2 mb-1" style="background:#050914; border-radius:8px; border-left:3px solid ${inv.isActive ? 'var(--green)' : 'var(--text-muted)'};">
                                    <div class="flex-between mb-1">
                                        <div class="flex-gap" style="align-items:center; gap:6px;">
                                            <b class="font-mono color-amber" style="font-size:14px; letter-spacing:1.5px;">${inv.code}</b>
                                            <button onclick="AccessControl.copyCode('${inv.code}')" class="btn btn-dark btn-auto" style="font-size:8px; padding:2px 6px; min-height:auto;" title="Копировать">
                                                <i class="fa-solid fa-copy"></i>
                                            </button>
                                        </div>
                                        <span class="${statusColor}" style="font-size:9px; font-weight:800;">${status}</span>
                                    </div>
                                    <div class="flex-between" style="font-size:8.5px;">
                                        <span class="sub-label">Использовано: ${inv.usedCount \vert{}\vert{} 0}/${inv.maxUses || 1}</span>
                                        <span class="sub-label">${inv.isActive ? `⏳ ${daysLeft}д` : ''}</span>
                                    </div>
                                    ${inv.isActive ? `
                                        <button onclick="AccessControl.deleteCode('${inv.code}')" class="btn btn-red btn-sm w-full mt-1" style="font-size:9px; padding:3px;">
                                            <i class="fa-solid fa-trash"></i> Удалить
                                        </button>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="glass-card p-2 mb-2">
                    <b class="text-xs color-green mb-2 block"><i class="fa-solid fa-users mr-1"></i> Игроки в whitelist (${players.length})</b>
                    <div style="max-height: 250px; overflow-y: auto;">
                        ${players.length === 0 ? `
                            <div class="sub-label text-center py-3" style="font-size:10px;">Пока никого нет</div>
                        ` : players.map(p => `
                            <div class="p-2 mb-1" style="background:#050914; border-radius:8px; border-left:3px solid ${p.isBanned ? 'var(--red)' : 'var(--green)'};">
                                <div class="flex-between mb-1">
                                    <div style="min-width:0; flex:1;">
                                        <b class="text-xs ${p.isBanned ? 'color-red' : 'color-green'}" style="font-size:11px;">${p.name || 'Без имени'}</b>
                                        <div class="sub-label font-mono" style="font-size:8px;">ID: ${p.telegramId}</div>
                                    </div>
                                    ${p.isBanned ? '<span class="tag-badge bg-tag-red" style="font-size:7px;">BAN</span>' : ''}
                                </div>
                                <div class="grid-2" style="gap:4px; margin-top:4px;">
                                    <button onclick="AccessControl.toggleBan('${p.telegramId}')" class="btn ${p.isBanned ? 'btn-green' : 'btn-amber'} btn-sm" style="font-size:8.5px; padding:3px;">
                                        ${p.isBanned ? '✓ Разбанить' : '🚫 Забанить'}
                                    </button>
                                    <button onclick="AccessControl.revoke('${p.telegramId}')" class="btn btn-red btn-sm" style="font-size:8.5px; padding:3px;">
                                        🗑️ Отозвать
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    function closeOwnerPanel() {
        if (typeof ModalManager !== 'undefined') {
            ModalManager.close('modalAccessManager');
        } else {
            const m = document.getElementById('modalAccessManager');
            if (m) m.classList.remove('active');
        }
    }

    async function refreshPanel() {
        await refreshAccessFlag();
        await openOwnerPanel();
    }

    async function quickCreate(maxUses, ttlDays) {
        const res = await createInviteCode({ maxUses: maxUses, ttlDays: ttlDays });
        if (res.success) {
            try {
                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(res.code);
                }
            } catch (e) {}
            if (typeof showToast === 'function') showToast(`🎟️ Код ${res.code} создан и скопирован!`);
            if (typeof playSound === 'function') playSound('win');
            setTimeout(() => refreshPanel(), 300);
        } else {
            if (typeof showToast === 'function') showToast(`❌ ${res.error}`);
        }
    }

    async function copyCode(code) {
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
        } catch (e) {
            if (typeof showToast === 'function') showToast('❌ Не удалось скопировать');
        }
    }

    async function deleteCode(code) {
        if (!confirm(`Удалить код ${code}?`)) return;
        const res = await deleteInvite(code);
        if (res.success) {
            if (typeof showToast === 'function') showToast('🗑️ Код удалён');
            setTimeout(() => refreshPanel(), 300);
        } else {
            if (typeof showToast === 'function') showToast(`❌ ${res.error}`);
        }
    }

    async function toggleBan(targetUid) {
        const res = await toggleBanPlayer(targetUid);
        if (res.success) {
            if (typeof showToast === 'function') showToast(res.isBanned ? '🚫 Игрок забанен' : '✓ Игрок разбанен');
            setTimeout(() => refreshPanel(), 300);
        } else {
            if (typeof showToast === 'function') showToast(`❌ ${res.error}`);
        }
    }

    async function revoke(targetUid) {
        if (!confirm('Полностью отозвать доступ у игрока?')) return;
        const res = await revokeAccess(targetUid);
        if (res.success) {
            if (typeof showToast === 'function') showToast('🗑️ Доступ отозван');
            setTimeout(() => refreshPanel(), 300);
        } else {
            if (typeof showToast === 'function') showToast(`❌ ${res.error}`);
        }
    }

    async function disableSystem() {
        if (!confirm('⚠️ ОТКРЫТЬ ИГРУ ДЛЯ ВСЕХ?\n\nИгроки без инвайт-кодов смогут войти. Whitelist и баны сохранятся, но перестанут действовать, пока система отключена.')) return;
        const res = await disableAccessControl();
        if (res.success) {
            if (typeof showToast === 'function') showToast('🌐 Система доступа отключена — игра открыта для всех');
            setTimeout(() => refreshPanel(), 300);
        } else {
            if (typeof showToast === 'function') showToast(`❌ ${res.error}`);
        }
    }

    async function enableSystem() {
        if (!confirm('🔒 ВКЛЮЧИТЬ ДОСТУП ПО ПРИГЛАШЕНИЯМ?\n\nИгроки без инвайт-кодов будут заблокированы.')) return;
        const res = await enableAccessControl();
        if (res.success) {
            if (typeof showToast === 'function') showToast('🔒 Система доступа включена');
            setTimeout(() => refreshPanel(), 300);
        } else {
            if (typeof showToast === 'function') showToast(`❌ ${res.error}`);
        }
    }

    // ========================================================
    // ⭐ 9. МОДУЛЬ FEATURE ACCESS (КОНТРОЛЬ РАЗДЕЛОВ И УРОВНЕЙ)
    // ========================================================
    const FeatureAccess = {
        getConfig(featureKey) {
            const cfg = window.APP_ACCESS_CONFIG || (typeof APP_ACCESS_CONFIG !== 'undefined' ? APP_ACCESS_CONFIG : null);
            if (cfg && cfg[featureKey]) return cfg[featureKey];

            const fallback = {
                barn: { minLevel: 8, costCash: 800000, costStars: 0, name: "Сараи (Barn Find)" },
                containers: { minLevel: 12, costCash: 2500000, costStars: 10, costTickets: 5, name: "Контейнеры (Порт)" },
                autopodbor_order: { minLevel: 5, costCash: 350000, costStars: 5, reqTool: 'obd_launch', name: "Подбор под ключ" },
                street: { minLevel: 6, costCash: 250000, costStars: 15, name: "Стритрейсинг" },
                darknet: { minLevel: 16, costCash: 6000000, costStars: 25, name: "Даркнет" },
                syndicate: { minLevel: 20, costCash: 20000000, costStars: 50, name: "Синдикат" }
            };
            return fallback[featureKey] || null;
        },

        isUnlocked(featureKey) {
            if (!state.player) return false;
            if (!state.player.unlockedFeatures) state.player.unlockedFeatures = [];
            return state.player.unlockedFeatures.includes(featureKey);
        },

        check(featureKey) {
            const config = this.getConfig(featureKey);
            if (!config) return { allowed: true };

            const playerLevel = Number(state.player?.level) || 1;
            if (playerLevel < config.minLevel) {
                return {
                    allowed: false,
                    reason: 'level_locked',
                    requiredLevel: config.minLevel,
                    message: `Раздел «${config.name}» станет доступен с ${config.minLevel} уровня!`
                };
            }

            if (!this.isUnlocked(featureKey)) {
                return {
                    allowed: false,
                    reason: 'payment_required',
                    config: config,
                    message: `Требуется приобрести лицензию/взнос для раздела «${config.name}».`
                };
            }

            return { allowed: true, config: config };
        },

        showUnlockModal(featureKey, onSuccessCallback = null) {
            const config = this.getConfig(featureKey);
            if (!config) return;

            const playerLevel = Number(state.player?.level) || 1;
            const playerCash = Number(state.player?.cash) || 0;
            const playerStars = Number(state.player?.stars) || 0;
            const playerTickets = Number(state.player?.tickets) || 0;

            if (playerLevel < config.minLevel) {
                if (typeof showToast === 'function') {
                    showToast(`🔒 Доступно с ${config.minLevel} уровня (ваш уровень: ${playerLevel})`);
                }
                if (typeof playSound === 'function') playSound('error');
                return;
            }

            let modal = document.getElementById('modalFeatureUnlock');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'modalFeatureUnlock';
                modal.className = 'modal-overlay';
                document.body.appendChild(modal);
            }

            const canAffordCash = playerCash >= (config.costCash || 0);
            const canAffordStars = playerStars >= (config.costStars || 0);
            const canAffordTickets = playerTickets >= (config.costTickets || 0);
            const canAffordAll = canAffordCash && canAffordStars && canAffordTickets;

            modal.innerHTML = `
                <div class="modal-box" style="max-width: 420px; border-color: var(--cyan);">
                    <div class="flex-between mb-2">
                        <div class="modal-glow-badge" style="color:var(--cyan); border-color:rgba(0,242,254,0.4);">
                            <i class="fa-solid fa-lock-open mr-1"></i> ОТКРЫТИЕ РАЗДЕЛА
                        </div>
                        <button onclick="AccessControl.FeatureAccess.closeModal()" class="btn btn-dark btn-auto btn-sm">✕</button>
                    </div>

                    <div class="glass-card p-3 mb-2 text-center" style="background:#090e18;">
                        <b class="text-xs color-cyan" style="font-size:15px;">${config.name}</b>
                        <div class="sub-label mt-1" style="font-size:10px; line-height:1.4;">
                            ${config.desc || 'Получите доступ к новым возможностям, редким автомобилям и повышенной марже.'}
                        </div>
                    </div>

                    <div class="glass-card p-2 mb-3" style="background:#050914;">
                        <b class="text-xs color-amber mb-2 block" style="font-size:11px;">Условия получения доступа:</b>
                        <div class="space-y-1" style="font-size:10px;">
                            <div class="flex-between">
                                <span class="sub-label">Уровень персонажа:</span>
                                <b class="color-green">Ур. ${config.minLevel} ✓</b>
                            </div>
                            ${config.costCash ? `
                                <div class="flex-between">
                                    <span class="sub-label">Денежный взнос:</span>
                                    <b class="${canAffordCash ? 'color-green' : 'color-red'}">${config.costCash.toLocaleString()} ₽</b>
                                </div>
                            ` : ''}
                            ${config.costStars ? `
                                <div class="flex-between">
                                    <span class="sub-label">Звёзды репутации:</span>
                                    <b class="${canAffordStars ? 'color-green' : 'color-red'}">${config.costStars} ⭐</b>
                                </div>
                            ` : ''}
                            ${config.costTickets ? `
                                <div class="flex-between">
                                    <span class="sub-label">Билеты/талоны:</span>
                                    <b class="${canAffordTickets ? 'color-green' : 'color-red'}">${config.costTickets} 🎫</b>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="grid-2" style="gap:6px;">
                        <button onclick="AccessControl.FeatureAccess.closeModal()" class="btn btn-dark btn-sm">
                            Отмена
                        </button>
                        <button onclick="AccessControl.FeatureAccess.confirmUnlock('${featureKey}')" class="btn btn-green btn-sm" ${canAffordAll ? '' : 'disabled style="opacity:0.6;"'}>
                            ${canAffordAll ? 'Оплатить и открыть' : 'Не хватает средств'}
                        </button>
                    </div>
                </div>
            `;

            this._pendingCallback = onSuccessCallback;

            if (typeof ModalManager !== 'undefined') {
                ModalManager.open('modalFeatureUnlock');
            } else {
                modal.classList.add('active');
            }
            if (typeof playSound === 'function') playSound('tick');
        },

        closeModal() {
            if (typeof ModalManager !== 'undefined') {
                ModalManager.close('modalFeatureUnlock');
            } else {
                const m = document.getElementById('modalFeatureUnlock');
                if (m) m.classList.remove('active');
            }
            this._pendingCallback = null;
        },

        confirmUnlock(featureKey) {
            const config = this.getConfig(featureKey);
            if (!config) return;

            const playerCash = Number(state.player?.cash) || 0;
            const playerStars = Number(state.player?.stars) || 0;
            const playerTickets = Number(state.player?.tickets) || 0;

            if (config.costCash && playerCash < config.costCash) {
                if (typeof showToast === 'function') showToast(`Не хватает ${config.costCash.toLocaleString()} ₽!`);
                if (typeof playSound === 'function') playSound('error');
                return;
            }
            if (config.costStars && playerStars < config.costStars) {
                if (typeof showToast === 'function') showToast(`Не хватает ${config.costStars} ⭐!`);
                if (typeof playSound === 'function') playSound('error');
                return;
            }
            if (config.costTickets && playerTickets < config.costTickets) {
                if (typeof showToast === 'function') showToast(`Не хватает ${config.costTickets} 🎫!`);
                if (typeof playSound === 'function') playSound('error');
                return;
            }

            if (config.costCash) {
                state.player.cash -= config.costCash;
                if (typeof logBankTransaction === 'function') {
                    logBankTransaction(`Открытие доступа: ${config.name}`, config.costCash, false);
                }
            }
            if (config.costStars) state.player.stars -= config.costStars;
            if (config.costTickets) state.player.tickets -= config.costTickets;

            if (!state.player.unlockedFeatures) state.player.unlockedFeatures = [];
            if (!state.player.unlockedFeatures.includes(featureKey)) {
                state.player.unlockedFeatures.push(featureKey);
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

            const cb = this._pendingCallback;
            this.closeModal();

            if (typeof openVerdictModal === 'function') {
                openVerdictModal(
                    "РАЗДЕЛ РАЗБЛОКИРОВАН! 🔓",
                    `Вы успешно приобрели постоянный доступ к разделу «${config.name}»!\nУдачи в новых сделках и покорении авторынка.`,
                    true
                );
            } else if (typeof showToast === 'function') {
                showToast(`✓ Раздел «${config.name}» открыт!`);
            }

            if (typeof cb === 'function') {
                setTimeout(cb, 300);
            }
        },

        guard(featureKey, onAllowed) {
            const status = this.check(featureKey);
            if (status.allowed) {
                if (typeof onAllowed === 'function') onAllowed();
                return true;
            }

            if (status.reason === 'level_locked') {
                if (typeof showToast === 'function') showToast(status.message);
                if (typeof playSound === 'function') playSound('error');
                return false;
            }

            this.showUnlockModal(featureKey, onAllowed);
            return false;
        }
    };

    // ========================================================
    // 10. ЭКСПОРТ В WINDOW
    // ========================================================
    window.AccessControl = {
        checkAccess: checkAccess,
        redeemInviteCode: redeemInviteCode,
        isOwner: function(uid) { return _isOwner(uid); },

        createInviteCode: createInviteCode,
        listInvites: listInvites,
        deleteInvite: deleteInvite,
        listWhitelist: listWhitelist,
        toggleBanPlayer: toggleBanPlayer,
        revokeAccess: revokeAccess,
        quickCreateAndCopy: quickCreateAndCopy,

        disableAccessControl: disableAccessControl,
        enableAccessControl: enableAccessControl,
        isAccessControlEnabled: isAccessControlEnabled,
        refreshAccessFlag: refreshAccessFlag,

        openOwnerPanel: openOwnerPanel,
        closeOwnerPanel: closeOwnerPanel,
        refreshPanel: refreshPanel,
        quickCreate: quickCreate,
        copyCode: copyCode,
        deleteCode: deleteCode,
        toggleBan: toggleBan,
        revoke: revoke,
        disableSystem: disableSystem,
        enableSystem: enableSystem,

        // Геймплейный модуль прогрессии
        FeatureAccess: FeatureAccess,
        checkFeature: function(key) { return FeatureAccess.check(key); },
        guardFeature: function(key, cb) { return FeatureAccess.guard(key, cb); },
        isFeatureUnlocked: function(key) { return FeatureAccess.isUnlocked(key); },
        showFeatureUnlockModal: function(key, cb) { return FeatureAccess.showUnlockModal(key, cb); },

        OWNER_TELEGRAM_ID: OWNER_TELEGRAM_ID,
        OWNER_USERNAME: OWNER_USERNAME
    };

    _log('v2.0.0 загружен: Инвайты + FeatureAccess прогрессии разделов ✓');
    _log('Владелец:', OWNER_TELEGRAM_ID, '(@' + OWNER_USERNAME + ')');

})();

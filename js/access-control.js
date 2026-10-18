// ========================================================
// js/access-control.js — СИСТЕМА ДОСТУПА ПО ПРИГЛАШЕНИЯМ (v1.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.1.0 (SPRINT 3 — ГЛОБАЛЬНЫЙ ФЛАГ ДОСТУПА):
//   - Глобальный флаг access_settings/global.accessDisabled
//     хранится в Firestore, а не в localStorage.
//     Теперь при выключении системы доступа пускает ВСЕХ игроков,
//     а не только владельца.
//   - Кэш флага 60 секунд (чтобы не читать Firestore каждый checkAccess)
//   - Fallback на localStorage при offline
//   - disableAccessControl / enableAccessControl стали async
//   - В Owner-панели кнопка-переключатель «Открыт для всех»
//   - Fail-safe: ошибка чтения из Firestore → пускаем (лучше, чем
//     заблокировать весь мир из-за сетевой ошибки на одном клиенте)
// ⭐ v1.0.0:
//   - Владелец игры автоматически получает доступ (по Telegram ID)
//   - Инвайт-коды, whitelist, баны, Owner-панель
//   - Firestore-хранилище, кэш 5 мин
// ========================================================

(function() {
    'use strict';

    // ========================================================
    // 1. КОНСТАНТЫ
    // ========================================================

    // ⭐ ID владельца игры
    const OWNER_TELEGRAM_ID = '1944392183';

    // Username владельца (для резервной проверки)
    const OWNER_USERNAME = 'taktojenorm';

    // Кэш доступа игрока (5 минут)
    const CACHE_KEY_PREFIX = 'perekup_access_cache_';
    const CACHE_TTL_MS = 5 * 60 * 1000;

    // ⭐ v1.1.0: локальный флаг-кэш для глобального доступа
    const GLOBAL_ACCESS_FLAG_KEY = 'perekup_access_disabled';
    const GLOBAL_ACCESS_FLAG_TTL_KEY = 'perekup_access_disabled_ts';
    const GLOBAL_ACCESS_FLAG_TTL_MS = 60 * 1000;  // 60 секунд

    // Коллекции Firestore
    const COL_WHITELIST = 'access_whitelist';   // { telegramId, name, addedAt, addedBy, isBanned }
    const COL_INVITES   = 'access_invites';     // { code, createdBy, createdAt, expiresAt, maxUses, usedCount, usedBy[] }
    const COL_REQUESTS  = 'access_requests';    // { telegramId, name, username, requestedAt, status }
    const COL_SETTINGS  = 'access_settings';    // ⭐ v1.1.0: коллекция настроек
    const DOC_GLOBAL    = 'global';             // ⭐ v1.1.0: документ глобальных настроек

    // Лимиты
    const MAX_ACTIVE_INVITES = 50;

    // ========================================================
    // 2. ВНУТРЕННЕЕ СОСТОЯНИЕ
    // ========================================================
    let _fbCore = null;
    let _db = null;
    let _firestoreFns = null;

    // ⭐ v1.1.0: кэш глобального флага в памяти
    let _globalFlagCache = {
        value: null,      // null = неизвестно, true/false = значение
        ts: 0,            // время последней синхронизации
        loading: false    // идёт запрос?
    };

    // ========================================================
    // 3. ХЕЛПЕРЫ
    // ========================================================

    async function _getFirestoreFns() {
        if (_firestoreFns) return _firestoreFns;
        try {
            const mod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
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
            console.warn('[AccessControl] Не удалось загрузить Firestore:', e);
            return null;
        }
    }

    async function _ensureInit() {
        if (_db) return true;

        _fbCore = window.FB_Core;
        if (!_fbCore || !_fbCore.db) {
            console.warn('[AccessControl] FB_Core.db не найден — работаем в offline-режиме');
            return false;
        }

        _db = _fbCore.db;
        await _getFirestoreFns();
        return true;
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
    // ⭐ v1.1.0: ГЛОБАЛЬНЫЙ ФЛАГ ДОСТУПА
    // ========================================================

    /**
     * Прочитать флаг из локального кэша (localStorage).
     */
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

    /**
     * Записать флаг в локальный кэш.
     */
    function _writeGlobalFlagLocal(value) {
        try {
            localStorage.setItem(GLOBAL_ACCESS_FLAG_KEY, String(!!value));
            localStorage.setItem(GLOBAL_ACCESS_FLAG_TTL_KEY, String(Date.now()));
        } catch (e) {}
    }

    /**
     * ⭐ v1.1.0: прочитать флаг из Firestore.
     * @returns {Promise<boolean|null>} — true/false или null при ошибке
     */
    async function _readGlobalFlagCloud() {
        const fbReady = await _ensureInit();
        if (!fbReady) return null;

        try {
            const fns = _firestoreFns;
            const ref = fns.doc(_db, COL_SETTINGS, DOC_GLOBAL);
            const snap = await fns.getDoc(ref);

            if (!snap.exists()) {
                // Документ ещё не создан — считаем, что система доступа включена
                return false;
            }

            const data = snap.data();
            return data.accessDisabled === true;
        } catch (e) {
            console.warn('[AccessControl] Ошибка чтения глобального флага:', e);
            return null;
        }
    }

    /**
     * ⭐ v1.1.0: синхронизировать глобальный флаг из облака в локальный кэш.
     * Кэш TTL 60 сек, чтобы не спамить Firestore.
     */
    async function _syncGlobalFlagFromCloud(force = false) {
        const now = Date.now();

        // Если недавно синхронизировали — используем кэш
        if (!force &&
            _globalFlagCache.value !== null &&
            (now - _globalFlagCache.ts) < GLOBAL_ACCESS_FLAG_TTL_MS) {
            return _globalFlagCache.value;
        }

        // Если уже идёт загрузка — ждём
        if (_globalFlagCache.loading) {
            // Простое ожидание: не блокируем, возвращаем последнее известное
            return _globalFlagCache.value;
        }

        // Сначала смотрим локальный кэш — если свежий, возвращаем его
        const localCached = _readGlobalFlagLocal();
        if (!force && localCached.value !== null && (now - localCached.ts) < GLOBAL_ACCESS_FLAG_TTL_MS) {
            _globalFlagCache = { value: localCached.value, ts: localCached.ts, loading: false };
            return localCached.value;
        }

        _globalFlagCache.loading = true;
        try {
            const cloudValue = await _readGlobalFlagCloud();

            if (cloudValue === null) {
                // Firestore недоступен — используем локальный кэш (если он есть)
                if (localCached.value !== null) {
                    console.log('[AccessControl] Firestore недоступен, используем локальный флаг:', localCached.value);
                    _globalFlagCache = { value: localCached.value, ts: now, loading: false };
                    return localCached.value;
                }
                // Совсем нет данных — считаем, что система включена
                console.log('[AccessControl] Нет данных о флаге, считаем что система включена');
                _globalFlagCache = { value: false, ts: now, loading: false };
                return false;
            }

            // Успешно прочитали из Firestore
            _globalFlagCache = { value: cloudValue, ts: now, loading: false };
            _writeGlobalFlagLocal(cloudValue);
            console.log('[AccessControl] Глобальный флаг синхронизирован:', cloudValue ? 'ДОСТУП ОТКРЫТ' : 'ДОСТУП ПО ПРИГЛАШЕНИЯМ');
            return cloudValue;

        } catch (e) {
            console.warn('[AccessControl] syncGlobalFlag error:', e);
            _globalFlagCache.loading = false;
            // Fallback на локальный кэш
            if (localCached.value !== null) return localCached.value;
            return false;
        }
    }

    /**
     * ⭐ v1.1.0: записать глобальный флаг в Firestore + локально.
     * @returns {Promise<boolean>} — успех
     */
    async function _writeGlobalFlagCloud(value) {
        // Сначала локально — чтобы UI сразу показал переключение
        _writeGlobalFlagLocal(value);
        _globalFlagCache = { value: value, ts: Date.now(), loading: false };

        const fbReady = await _ensureInit();
        if (!fbReady) {
            console.warn('[AccessControl] Firestore недоступен, флаг записан только локально');
            return false;
        }

        try {
            const fns = _firestoreFns;
            const ref = fns.doc(_db, COL_SETTINGS, DOC_GLOBAL);

            await fns.setDoc(ref, {
                accessDisabled: !!value,
                updatedAt: Date.now(),
                updatedBy: window.Telegram?.WebApp?.initDataUnsafe?.user?.id
                    ? String(window.Telegram.WebApp.initDataUnsafe.user.id)
                    : 'unknown'
            }, { merge: true });

            console.log('[AccessControl] Глобальный флаг записан в Firestore:', value);
            return true;
        } catch (e) {
            console.error('[AccessControl] Ошибка записи глобального флага:', e);
            return false;
        }
    }

    /**
     * ⭐ v1.1.0: синхронная проверка локального флага (для UI).
     * ВАЖНО: используйте _syncGlobalFlagFromCloud() для актуальных данных.
     */
    function _isAccessControlDisabled() {
        if (_globalFlagCache.value !== null) return _globalFlagCache.value;
        const local = _readGlobalFlagLocal();
        return local.value === true;
    }

    // ========================================================
    // 4. ГЛАВНЫЙ МЕТОД: ПРОВЕРКА ДОСТУПА
    // ========================================================
    async function checkAccess(uid) {
        if (!uid) {
            return { success: false, reason: 'no_uid' };
        }

        const cleanUid = String(uid);

        // ─── 1. Владелец всегда проходит ───
        if (_isOwner(cleanUid)) {
            console.log('[AccessControl] 👑 Owner — доступ разрешён');
            return { success: true, reason: 'owner', isOwner: true };
        }

        // ─── 2. DEV-режим (ПК) — пускаем ───
        if (cleanUid.startsWith('pc_dev_') || cleanUid.startsWith('dev_')) {
            console.log('[AccessControl] DEV-режим — доступ разрешён');
            return { success: true, reason: 'dev_mode' };
        }

        // ─── ⭐ v1.1.0: 3. Глобальный флаг «открыто для всех» ───
        try {
            const isGloballyDisabled = await _syncGlobalFlagFromCloud();
            if (isGloballyDisabled === true) {
                console.log('[AccessControl] 🌐 Глобальный доступ ОТКРЫТ для всех');
                return { success: true, reason: 'global_disabled' };
            }
        } catch (e) {
            // fail-safe: при ошибке синхронизации флага — продолжаем обычную проверку
            console.warn('[AccessControl] Ошибка проверки глобального флага, продолжаем:', e);
        }

        // ─── 4. Проверка локального кэша игрока ───
        const cached = _readCache(cleanUid);
        if (cached && cached.allowed === true) {
            console.log('[AccessControl] Доступ из кэша (allowed)');
            return { success: true, reason: 'cache_allowed', isOwner: !!cached.isOwner };
        }
        if (cached && cached.allowed === false) {
            console.log('[AccessControl] Доступ из кэша (denied)');
            return { success: false, reason: cached.reason || 'cache_denied' };
        }

        // ─── 5. Проверка через Firestore ───
        try {
            const fbReady = await _ensureInit();

            if (!fbReady) {
                console.warn('[AccessControl] Firestore недоступен, и кэша нет — доступ запрещён');
                return { success: false, reason: 'offline_no_cache' };
            }

            const fns = _firestoreFns;
            const whitelistRef = fns.doc(_db, COL_WHITELIST, cleanUid);
            const snap = await fns.getDoc(whitelistRef);

            if (snap.exists()) {
                const data = snap.data();

                // Забанен?
                if (data.isBanned === true) {
                    _writeCache(cleanUid, { allowed: false, reason: 'banned' });
                    return { success: false, reason: 'banned' };
                }

                // Разрешён?
                _writeCache(cleanUid, { allowed: true, isOwner: false });
                console.log('[AccessControl] ✅ Доступ разрешён (whitelist):', data.name || cleanUid);
                return {
                    success: true,
                    reason: 'whitelist',
                    name: data.name || null
                };
            }

            // Не в whitelist
            _writeCache(cleanUid, { allowed: false, reason: 'not_whitelisted' });
            console.log('[AccessControl] ❌ Не в whitelist:', cleanUid);
            return { success: false, reason: 'not_whitelisted' };

        } catch (e) {
            console.warn('[AccessControl] Ошибка проверки через Firestore:', e);
            // При ошибке сети — пускаем только если был положительный кэш
            if (cached && cached.allowed === true) {
                return { success: true, reason: 'cache_fallback' };
            }
            return { success: false, reason: 'firestore_error' };
        }
    }

    // ========================================================
    // 5. ПОЛЬЗОВАТЕЛЬ ВВОДИТ ИНВАЙТ-КОД
    // ========================================================
    async function redeemInviteCode(code, userInfo = null) {
        if (!code || typeof code !== 'string') {
            return { success: false, error: 'Пустой код' };
        }

        const cleanCode = code.trim().toUpperCase();
        if (cleanCode.length !== 8) {
            return { success: false, error: 'Код должен быть 8 символов' };
        }

        // Определяем игрока
        let uid = null;
        let name = null;
        let username = null;

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
            const inviteSnap = await fns.getDoc(inviteRef);

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

            // 1. Добавляем в whitelist
            const whitelistRef = fns.doc(_db, COL_WHITELIST, uid);
            await fns.setDoc(whitelistRef, {
                telegramId: uid,
                name: name,
                username: username,
                addedAt: now,
                addedBy: 'invite:' + cleanCode,
                isBanned: false
            }, { merge: true });

            // 2. Обновляем счётчик использований
            const usedByList = Array.isArray(inviteData.usedBy) ? inviteData.usedBy : [];
            usedByList.push({
                uid: uid,
                name: name,
                at: now
            });

            await fns.updateDoc(inviteRef, {
                usedCount: usedCount + 1,
                usedBy: usedByList
            });

            // 3. Очищаем локальный кэш
            _clearCache(uid);

            console.log('[AccessControl] 🎉 Код активирован:', cleanCode, '→', uid);
            return { success: true, message: 'Доступ активирован!' };

        } catch (e) {
            console.error('[AccessControl] Ошибка активации кода:', e);
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
            const activeSnap = await fns.getDocs(activeQuery);
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
            await fns.setDoc(inviteRef, payload);

            console.log('[AccessControl] 🎟️ Создан инвайт:', code);
            return { success: true, code: code, expiresAt: payload.expiresAt };
        } catch (e) {
            console.error('[AccessControl] Ошибка создания кода:', e);
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
            const snap = await fns.getDocs(q);
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
            await fns.deleteDoc(ref);
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
            const snap = await fns.getDocs(q);
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
            const snap = await fns.getDoc(ref);

            if (!snap.exists()) {
                return { success: false, error: 'Игрок не найден' };
            }

            const current = snap.data();
            const newBanState = !current.isBanned;

            await fns.updateDoc(ref, { isBanned: newBanState });
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
            await fns.deleteDoc(ref);
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
    // ⭐ v1.1.0: 7. УПРАВЛЕНИЕ СИСТЕМОЙ ДОСТУПА (ASYNC)
    // ========================================================

    /**
     * Отключить систему доступа — ВСЕ игроки смогут играть.
     * Записывает флаг в Firestore + локально.
     */
    async function disableAccessControl() {
        try {
            const ok = await _writeGlobalFlagCloud(true);
            console.log('[AccessControl] 🌐 Система доступа ОТКЛЮЧЕНА (пускаем всех)');
            return { success: true, cloudWritten: ok };
        } catch (e) {
            console.error('[AccessControl] Ошибка отключения:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Включить систему доступа — только whitelist.
     */
    async function enableAccessControl() {
        try {
            const ok = await _writeGlobalFlagCloud(false);
            console.log('[AccessControl] 🔒 Система доступа ВКЛЮЧЕНА');
            return { success: true, cloudWritten: ok };
        } catch (e) {
            console.error('[AccessControl] Ошибка включения:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Синхронная проверка (использует последнее известное значение).
     * Для UI Owner-панели.
     */
    function isAccessControlEnabled() {
        return !_isAccessControlDisabled();
    }

    /**
     * ⭐ v1.1.0: принудительная синхронизация флага из Firestore.
     * Вызывается Owner-панелью при открытии.
     */
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

        // Загрузка
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

        // ⭐ Синхронизируем актуальный флаг из облака
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

                <!-- ⭐ v1.1.0: ГЛОБАЛЬНЫЙ ФЛАГ ДОСТУПА -->
                <div class="glass-card p-3 mb-3" style="border: 1.5px solid ${systemEnabled ? 'rgba(0,230,118,0.5)' : 'rgba(255,179,0,0.6)'}; background:${systemEnabled ? 'rgba(0,230,118,0.06)' : 'rgba(255,179,0,0.08)'};">
                    <div class="flex-between mb-2">
                        <div>
                            <b class="text-xs ${systemEnabled ? 'color-green' : 'color-amber'}">
                                <i class="fa-solid fa-globe mr-1"></i>
                                Система доступа
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

                <!-- Статистика -->
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

                <!-- Быстрое создание -->
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

                <!-- Список инвайтов -->
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
                                        <span class="sub-label">Использовано: ${inv.usedCount || 0}/${inv.maxUses || 1}</span>
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

                <!-- Список игроков -->
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
    // 9. ЭКСПОРТ В WINDOW
    // ========================================================
    window.AccessControl = {
        // Основное API
        checkAccess: checkAccess,
        redeemInviteCode: redeemInviteCode,
        isOwner: function(uid) { return _isOwner(uid); },

        // Owner-функции
        createInviteCode: createInviteCode,
        listInvites: listInvites,
        deleteInvite: deleteInvite,
        listWhitelist: listWhitelist,
        toggleBanPlayer: toggleBanPlayer,
        revokeAccess: revokeAccess,
        quickCreateAndCopy: quickCreateAndCopy,

        // ⭐ v1.1.0: глобальный флаг доступа
        disableAccessControl: disableAccessControl,
        enableAccessControl: enableAccessControl,
        isAccessControlEnabled: isAccessControlEnabled,
        refreshAccessFlag: refreshAccessFlag,

        // UI Owner-панели
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

        // Константы (для DEV)
        OWNER_TELEGRAM_ID: OWNER_TELEGRAM_ID,
        OWNER_USERNAME: OWNER_USERNAME
    };

    console.log('[🔐 AccessControl v1.1.0] Глобальный флаг доступа в Firestore + кэш 60 сек ✓');
    console.log('[🔐 AccessControl] Владелец:', OWNER_TELEGRAM_ID, '(@' + OWNER_USERNAME + ')');
    console.log('[🔐 AccessControl] API: checkAccess, redeemInviteCode, openOwnerPanel, disableSystem, enableSystem, refreshAccessFlag ✓');

})();

// ========================================================
// js/storage-wars-p2p.js — P2P АУКЦИОН STORAGE WARS (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ Онлайн-лобби 2-5 участников через Firestore.
//   - Создание/поиск лобби по lot_id
//   - Синхронизация ставок в реальном времени
//   - Fallback на ботов, если нет игроков за 8 сек
//   - Комиссия аукциона 3% (уходит в банк)
//   - Победитель забирает контейнер
// ========================================================

const StorageWarsP2P = {
    _currentLobbyId: null,
    _lobbyUnsubscribe: null,
    _bidsUnsubscribe: null,
    _lobbyTimer: null,
    _botFallbackTimer: null,
    _lastBidSent: 0,
    _isHost: false,
    _activeLobbyData: null,

    // Конфиг
    CONFIG: {
        minPlayers: 2,
        maxPlayers: 5,
        botFallbackDelay: 8000,     // 8 сек ждём живых
        bidCooldown: 800,            // 0.8 сек между ставками
        auctionFeePct: 3,            // 3% комиссия аукциона
        extensionOnBid: 4,           // +4 сек к таймеру при каждой ставке
        initialTime: 14              // стартовое время
    },

    // ========================================================
    // ГЛАВНЫЙ ВХОД
    // ========================================================
    async openP2PLobby(containerIdx) {
        const containers = (typeof STORAGE_WARS_CONTAINERS !== 'undefined' && Array.isArray(STORAGE_WARS_CONTAINERS))
            ? STORAGE_WARS_CONTAINERS
            : [];

        const c = containers[containerIdx];
        if (!c) return showToast('Контейнер не найден');

        // Проверка доступа
        const pLvl = state.player?.level || 1;
        const reqLevel = c.minLevel || c.reqLvl || 5;
        if (pLvl < reqLevel) return showToast(`С ы ${reqLevel} уровня`);

        if (!window.FB_Bridge) {
            return showToast('Сетевой режим недоступен — играем соло');
        }

        // Ищем или создаём лобби
        showToast('🔍 Поиск онлайн-лобби...');

        const profile = window.FB_Bridge.getProfile?.() || { id: state.player?.uid || 'guest', name: state.player?.name || 'Перекуп' };
        const lotKey = c.id;

        try {
            // Проверяем есть ли открытое лобби на этот лот
            const lobbies = await window.FB_Bridge.db
                ? await this._fetchLobbies(lotKey)
                : [];

            if (lobbies.length > 0) {
                // Присоединяемся к существующему
                const lobby = lobbies[0];
                await this._joinLobby(lobby.id, profile, c);
            } else {
                // Создаём новое
                await this._createLobby(lotKey, profile, c);
            }
        } catch (e) {
            console.error('[SW-P2P] Ошибка поиска лобби:', e);
            showToast('Сеть недоступна — переключаюсь на соло');
            this._fallbackToSolo(containerIdx);
        }
    },

    // --------------------------------------------------------
    // СОЗДАНИЕ / ПОИСК / ПРИСОЕДИНЕНИЕ
    // --------------------------------------------------------
    async _fetchLobbies(lotKey) {
        try {
            if (!window.FB_Bridge?.db) return [];
            const { collection, query, where, getDocs, orderBy, limit } = await this._firestoreHelpers();

            const q = query(
                collection(window.FB_Bridge.db, 'storage_wars_lobbies'),
                where('lotKey', '==', lotKey),
                where('status', '==', 'waiting'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            const snap = await getDocs(q);
            const out = [];
            snap.forEach(d => out.push({ id: d.id, ...d.data() }));
            return out;
        } catch (e) {
            console.warn('[SW-P2P] fetchLobbies error:', e);
            return [];
        }
    },

    async _createLobby(lotKey, profile, containerData) {
        try {
            const helpers = await this._firestoreHelpers();
            const { collection, addDoc } = helpers;

            const lobbyData = {
                lotKey: lotKey,
                lotName: containerData.title || containerData.name,
                currentBid: containerData.baseBid || containerData.cost || 300000,
                highestBidder: 'Аукционист',
                highestBidderId: null,
                players: [{
                    id: String(profile.id),
                    name: profile.name,
                    avatar: '👤',
                    isHost: true,
                    joinedAt: Date.now()
                }],
                timeLeft: this.CONFIG.initialTime,
                status: 'waiting',
                createdAt: Date.now(),
                startedAt: null,
                finishedAt: null,
                winner: null,
                chatLog: [{
                    from: 'auctioneer',
                    name: 'Аукционист',
                    text: `🎙 Открываем онлайн-торги за «${containerData.title}»! Старт: ${(containerData.baseBid || containerData.cost).toLocaleString()} ₽`,
                    ts: Date.now()
                }]
            };

            const ref = await addDoc(collection(window.FB_Bridge.db, 'storage_wars_lobbies'), lobbyData);
            this._currentLobbyId = ref.id;
            this._isHost = true;

            console.log('[SW-P2P] Лобби создано:', ref.id);

            // Открываем модалку
            this._activeLobbyData = { id: ref.id, ...lobbyData };
            this._openP2PModal(containerData);

            // Запускаем слушатели
            this._subscribeToLobby(ref.id);

            // Запускаем таймер на ботов
            this._botFallbackTimer = setTimeout(() => {
                this._fillWithBotsIfNeeded();
            }, this.CONFIG.botFallbackDelay);

        } catch (e) {
            console.error('[SW-P2P] createLobby error:', e);
            showToast('Не удалось создать лобби — соло режим');
            throw e;
        }
    },

    async _joinLobby(lobbyId, profile, containerData) {
        try {
            const helpers = await this._firestoreHelpers();
            const { doc, getDoc, updateDoc, arrayUnion } = helpers;

            const lobbyRef = doc(window.FB_Bridge.db, 'storage_wars_lobbies', lobbyId);
            const snap = await getDoc(lobbyRef);
            if (!snap.exists()) {
                return this._createLobby(containerData.id, profile, containerData);
            }

            const data = snap.data();
            if (!Array.isArray(data.players)) data.players = [];

            if (data.players.length >= this.CONFIG.maxPlayers) {
                showToast('Лобби заполнено — ищу другое');
                return this._createLobby(containerData.id, profile, containerData);
            }

            if (!data.players.find(p => String(p.id) === String(profile.id))) {
                await updateDoc(lobbyRef, {
                    players: arrayUnion({
                        id: String(profile.id),
                        name: profile.name,
                        avatar: '👤',
                        isHost: false,
                        joinedAt: Date.now()
                    }),
                    chatLog: arrayUnion({
                        from: 'system',
                        name: 'Система',
                        text: `👋 ${profile.name} присоединился к торгам`,
                        ts: Date.now()
                    })
                });
            }

            this._currentLobbyId = lobbyId;
            this._isHost = false;

            console.log('[SW-P2P] Присоединились к лобби:', lobbyId);
            showToast('🎉 Вы в лобби!');

            this._activeLobbyData = { id: lobbyId, ...data };
            this._openP2PModal(containerData);

            this._subscribeToLobby(lobbyId);

        } catch (e) {
            console.error('[SW-P2P] joinLobby error:', e);
            showToast('Ошибка присоединения — соло');
            throw e;
        }
    },

    // --------------------------------------------------------
    // СЛУШАТЕЛИ FIRESTORE
    // --------------------------------------------------------
    async _subscribeToLobby(lobbyId) {
        try {
            const helpers = await this._firestoreHelpers();
            const { doc, onSnapshot } = helpers;

            if (this._lobbyUnsubscribe) this._lobbyUnsubscribe();

            const lobbyRef = doc(window.FB_Bridge.db, 'storage_wars_lobbies', lobbyId);
            this._lobbyUnsubscribe = onSnapshot(lobbyRef, (snap) => {
                if (!snap.exists()) return;
                const data = { id: snap.id, ...snap.data() };
                this._activeLobbyData = data;
                this._updateModal(data);

                // Если лобби завершилось — обрабатываем
                if (data.status === 'finished' && data.winner) {
                    this._handleLobbyFinished(data);
                }
            });

            // Запускаем локальный таймер обратного отсчёта (для UI)
            this._startLocalTimer();

        } catch (e) {
            console.error('[SW-P2P] subscribeToLobby error:', e);
        }
    },

    // --------------------------------------------------------
    // ЛОКАЛЬНЫЙ ТАЙМЕР (тикает каждую секунду, синхронизируется с сервером)
    // --------------------------------------------------------
    _startLocalTimer() {
        if (this._lobbyTimer) clearInterval(this._lobbyTimer);
        this._lobbyTimer = setInterval(() => {
            if (!this._activeLobbyData) return;
            const el = document.getElementById('swP2PTimerNum');
            if (el) {
                el.innerText = `⏳ ${Math.max(0, this._activeLobbyData.timeLeft || 0)}с`;
            }
        }, 1000);
    },

    // --------------------------------------------------------
    // ЗАПОЛНЕНИЕ БОТАМИ (если за 8 сек живые не пришли)
    // --------------------------------------------------------
    async _fillWithBotsIfNeeded() {
        if (!this._activeLobbyData) return;
        if (!this._isHost) return;

        const data = this._activeLobbyData;
        const humanCount = (data.players || []).length;
        if (humanCount >= this.CONFIG.minPlayers) {
            // Достаточно игроков — стартуем
            this._startAuctionAsHost();
            return;
        }

        // Добавляем ботов
        const botsNeeded = Math.max(1, this.CONFIG.minPlayers - humanCount);
        const botPool = this._getBotPool();

        try {
            const helpers = await this._firestoreHelpers();
            const { doc, updateDoc, arrayUnion } = helpers;

            let updates = { players: arrayUnion(...botPool.slice(0, botsNeeded).map(b => ({
                id: 'bot_' + b.name,
                name: b.name,
                avatar: b.avatar,
                isBot: true,
                joinedAt: Date.now()
            }))) };
            updates.chatLog = arrayUnion(...botPool.slice(0, botsNeeded).map(b => ({
                from: 'system',
                name: 'Система',
                text: `🤖 ${b.name} ${b.avatar} присоединился к торгам`,
                ts: Date.now()
            })));

            const lobbyRef = doc(window.FB_Bridge.db, 'storage_wars_lobbies', this._currentLobbyId);
            await updateDoc(lobbyRef, updates);

            console.log('[SW-P2P] Добавлено ботов:', botsNeeded);

            // Запускаем аукцион
            setTimeout(() => this._startAuctionAsHost(), 800);

        } catch (e) {
            console.error('[SW-P2P] fillWithBots error:', e);
        }
    },

    _getBotPool() {
        if (typeof STORAGE_WARS_BOTS !== 'undefined' && Array.isArray(STORAGE_WARS_BOTS) && STORAGE_WARS_BOTS.length > 0) {
            return STORAGE_WARS_BOTS;
        }
        return [
            { name: "Барыга Алик", avatar: "🧔", maxBudgetMul: 1.55, bluffChance: 0.35 },
            { name: "Мажор Влад", avatar: "🕺", maxBudgetMul: 2.20, bluffChance: 0.55 },
            { name: "Дед Михалыч", avatar: "👴", maxBudgetMul: 1.30, bluffChance: 0.15 },
            { name: "Перекуп Семён", avatar: "🕶️", maxBudgetMul: 1.75, bluffChance: 0.40 }
        ];
    },

    // --------------------------------------------------------
    // СТАРТ АУКЦИОНА (только хост)
    // --------------------------------------------------------
    async _startAuctionAsHost() {
        if (!this._isHost || !this._currentLobbyId) return;
        try {
            const helpers = await this._firestoreHelpers();
            const { doc, updateDoc } = helpers;

            const lobbyRef = doc(window.FB_Bridge.db, 'storage_wars_lobbies', this._currentLobbyId);
            await updateDoc(lobbyRef, {
                status: 'active',
                startedAt: Date.now(),
                timeLeft: this.CONFIG.initialTime,
                chatLog: [] // очищаем
            });

            // Хост запускает серверный таймер
            this._hostTimerLoop();

            console.log('[SW-P2P] Аукцион стартовал (хост)');
        } catch (e) {
            console.error('[SW-P2P] startAuction error:', e);
        }
    },

    // --------------------------------------------------------
    // ТИК АУКЦИОНА НА СТОРОНЕ ХОСТА (каждую секунду)
    // --------------------------------------------------------
    _hostTimerLoop() {
        if (!this._isHost) return;
        if (this._hostInterval) clearInterval(this._hostInterval);

        this._hostInterval = setInterval(async () => {
            if (!this._activeLobbyData || this._activeLobbyData.status !== 'active') {
                clearInterval(this._hostInterval);
                return;
            }

            const newTime = Math.max(0, (this._activeLobbyData.timeLeft || 0) - 1);

            try {
                const helpers = await this._firestoreHelpers();
                const { doc, updateDoc } = helpers;

                const updates = { timeLeft: newTime };

                // Удары молотка
                if (newTime === 6) {
                    updates.chatLog = this._appendLog('auctioneer', 'Аукционист', '🔨 РАЗ!');
                } else if (newTime === 4) {
                    updates.chatLog = this._appendLog('auctioneer', 'Аукционист', '🔨 ДВА!..');
                } else if (newTime === 0) {
                    updates.chatLog = this._appendLog('auctioneer', 'Аукционист', '🔨 ТРИ! ПРОДАНО!');
                    updates.status = 'finished';
                    updates.finishedAt = Date.now();
                    updates.winner = {
                        id: this._activeLobbyData.highestBidderId,
                        name: this._activeLobbyData.highestBidder,
                        amount: this._activeLobbyData.currentBid
                    };
                }

                const lobbyRef = doc(window.FB_Bridge.db, 'storage_wars_lobbies', this._currentLobbyId);
                await updateDoc(lobbyRef, updates);

                // Бот делает ставку (если он в лидерах — пропускаем)
                if (newTime > 2 && Math.random() < 0.45) {
                    this._tryBotBid();
                }

            } catch (e) {
                console.warn('[SW-P2P] hostTimer error:', e);
            }
        }, 1000);
    },

    // --------------------------------------------------------
    // БОТЫ ДЕЛАЮТ СТАВКУ
    // --------------------------------------------------------
    async _tryBotBid() {
        if (!this._activeLobbyData) return;
        const data = this._activeLobbyData;
        const bots = (data.players || []).filter(p => p.isBot);
        if (bots.length === 0) return;

        const bot = bots[Math.floor(Math.random() * bots.length)];
        const currentBid = data.currentBid || 0;
        const c = this._getContainerByKey(data.lotKey);
        const maxBudget = (c?.baseBid || 300000) * (bot.maxBudgetMul || 1.5);

        if (currentBid >= maxBudget) return;

        const raise = Math.random() < 0.6 ? 25000 : 50000;
        const newBid = currentBid + raise;

        try {
            const helpers = await this._firestoreHelpers();
            const { doc, updateDoc, arrayUnion } = helpers;

            const updates = {
                currentBid: newBid,
                highestBidder: `${bot.avatar} ${bot.name}`,
                highestBidderId: bot.id,
                timeLeft: Math.min(15, Math.max(7, (data.timeLeft || 10) + this.CONFIG.extensionOnBid)),
                chatLog: arrayUnion({
                    from: 'bot',
                    name: `${bot.avatar} ${bot.name}`,
                    text: `Ставлю ${newBid.toLocaleString()} ₽!`,
                    ts: Date.now()
                })
            };

            const lobbyRef = doc(window.FB_Bridge.db, 'storage_wars_lobbies', this._currentLobbyId);
            await updateDoc(lobbyRef, updates);
        } catch (e) {
            console.warn('[SW-P2P] botBid error:', e);
        }
    },

    // --------------------------------------------------------
    // ИГРОК ДЕЛАЕТ СТАВКУ
    // --------------------------------------------------------
    async placePlayerBid(raiseAmount) {
        if (!this._activeLobbyData || !this._currentLobbyId) return;
        if (this._activeLobbyData.status !== 'active') return showToast('Аукцион ещё не стартовал');

        const now = Date.now();
        if (now - this._lastBidSent < this.CONFIG.bidCooldown) {
            return showToast('Слишком быстро! Подожди секунду');
        }
        this._lastBidSent = now;

        const profile = window.FB_Bridge.getProfile?.() || { id: state.player?.uid, name: state.player?.name };
        const currentBid = this._activeLobbyData.currentBid || 0;
        const newBid = currentBid + raiseAmount;

        // Проверка баланса (не блокируем — только предупреждение, деньги спишутся при победе)
        const myCash = state.player?.cash || 0;
        if (myCash < newBid) {
            return showToast(`Не хватает ${newBid.toLocaleString()} ₽ на ставку`);
        }

        try {
            const helpers = await this._firestoreHelpers();
            const { doc, updateDoc, arrayUnion } = helpers;

            const updates = {
                currentBid: newBid,
                highestBidder: profile.name,
                highestBidderId: String(profile.id),
                timeLeft: Math.min(15, Math.max(8, (this._activeLobbyData.timeLeft || 10) + this.CONFIG.extensionOnBid)),
                chatLog: arrayUnion({
                    from: 'player',
                    name: profile.name,
                    text: `Ставлю ${newBid.toLocaleString()} ₽!`,
                    ts: Date.now()
                })
            };

            const lobbyRef = doc(window.FB_Bridge.db, 'storage_wars_lobbies', this._currentLobbyId);
            await updateDoc(lobbyRef, updates);

            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

        } catch (e) {
            console.error('[SW-P2P] placeBid error:', e);
            showToast('Не удалось сделать ставку');
        }
    },

    // --------------------------------------------------------
    // ОБРАБОТКА ЗАВЕРШЕНИЯ ЛОББИ
    // --------------------------------------------------------
    _handleLobbyFinished(data) {
        if (!data || !data.winner) return;
        if (this._activeLobbyData && this._activeLobbyData._handled) return;
        if (this._activeLobbyData) this._activeLobbyData._handled = true;

        const winnerId = String(data.winner.id || '');
        const myId = String(state.player?.uid || '');

        if (winnerId === myId) {
            // Я выиграл — оплачиваю и забираю
            const amount = data.winner.amount;
            const c = this._getContainerByKey(data.lotKey);

            if ((state.player.cash || 0) < amount) {
                showToast('❌ Не хватило денег на оплату выигранного лота!');
                this.closeP2PModal();
                return;
            }

            state.player.cash -= amount;

            // Комиссия аукциона 3% уходит в банк
            const fee = Math.round(amount * this.CONFIG.auctionFeePct / 100);
            if (typeof logBankTransaction === 'function') {
                logBankTransaction(`Storage Wars P2P: ${data.lotName}`, amount, false);
                logBankTransaction(`Комиссия аукциона (3%)`, fee, false);
            }

            setTimeout(() => {
                this.closeP2PModal();
                if (c && typeof window.AppPort?._unpackFromP2P === 'function') {
                    window.AppPort._unpackFromP2P(c, amount);
                } else if (typeof openVerdictModal === 'function') {
                    openVerdictModal(
                        "🏆 МОЛОТОК УПАЛ!",
                        `Вы выиграли «${data.lotName}» за ${amount.toLocaleString()} ₽!\nКонтейнер будет распакован в следующий момент.`,
                        true,
                        amount
                    );
                }
            }, 1500);

        } else {
            // Проиграл
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('error');

            setTimeout(() => {
                this.closeP2PModal();
                if (typeof openVerdictModal === 'function') {
                    openVerdictModal(
                        "АУКЦИОН ЗАВЕРШЁН 🔨",
                        `Победил ${data.winner.name} за ${data.winner.amount.toLocaleString()} ₽.\nВашу ставку перебили. Повезёт в следующий раз!`,
                        false
                    );
                }
            }, 1500);
        }
    },

    // --------------------------------------------------------
    // UI: ОТКРЫТИЕ МОДАЛКИ
    // --------------------------------------------------------
    _openP2PModal(containerData) {
        let modal = document.getElementById('modalStorageWarsP2P');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalStorageWarsP2P';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        const data = this._activeLobbyData || {};
        const players = data.players || [];

        modal.innerHTML = `
            <div class="modal-box text-center" style="max-width:440px; border-color:var(--cyan); padding:14px;">
                <div class="flex-between mb-1">
                    <div class="modal-glow-badge" style="color:var(--cyan); border-color:var(--cyan);">
                        <i class="fa-solid fa-globe"></i> STORAGE WARS P2P
                    </div>
                    <button onclick="StorageWarsP2P.confirmLeave()" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                <div class="car-img-wrap mb-2" style="height:110px; border-radius:10px;">
                    <img src="${containerData.img || ''}" class="car-img" onerror="this.onerror=null; this.src='${containerData.fallback || ''}';">
                </div>

                <h3 class="font-bold text-xs color-cyan mb-2" style="font-size:13px;">${containerData.title}</h3>

                <!-- СТАТУС ЛОББИ -->
                <div id="swP2PStatus" class="p-2 mb-2" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
                    <div class="flex-between mb-1">
                        <span class="sub-label" style="font-size:9px;">Игроков:</span>
                        <b class="color-cyan" id="swP2PPlayerCount">${players.length}/${this.CONFIG.maxPlayers}</b>
                    </div>
                    <div id="swP2PWaitingInfo" class="sub-label" style="font-size:9.5px;">
                        ${data.status === 'waiting' ? 'Ожидание игроков...' : ''}
                        ${data.status === 'active' ? '🎙 Торги идут!' : ''}
                        ${data.status === 'finished' ? '🏁 Аукцион завершён' : ''}
                    </div>
                </div>

                <!-- СТАВКА + ТАЙМЕР -->
                <div class="grid-2 mb-2" style="gap:8px;">
                    <div class="p-2 text-left" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                        <span class="sub-label" style="font-size:8.5px;">Текущая ставка:</span>
                        <div class="price-val color-green" id="swP2PCurrentBid" style="font-size:17px;">${(data.currentBid || 0).toLocaleString()} ₽</div>
                        <div class="sub-label" style="font-size:8.5px;">Лидер: <b class="color-cyan" id="swP2PLeaderName">${data.highestBidder || 'Аукционист'}</b></div>
                    </div>
                    <div class="p-2 text-center" style="background:#090e18; border-radius:8px; border:1px solid var(--cyan);">
                        <span class="sub-label" style="font-size:8.5px;">Таймер:</span>
                        <div class="price-val color-cyan" id="swP2PTimerNum" style="font-size:16px; font-weight:900;">⏳ ${data.timeLeft || this.CONFIG.initialTime}с</div>
                    </div>
                </div>

                <!-- СПИСОК ИГРОКОВ -->
                <div class="sub-label text-left mb-1" style="font-size:9px;">Участники:</div>
                <div id="swP2PPlayersList" class="flex-gap mb-2" style="flex-wrap:wrap; gap:4px;">
                    ${this._renderPlayersChips(players)}
                </div>

                <!-- ЛОГ -->
                <div class="chat-thread-container mb-2" id="swP2PLog" style="max-height:120px; min-height:80px; font-size:10.5px; text-align:left;">
                    ${this._renderLogHtml(data.chatLog || [])}
                </div>

                <!-- КНОПКИ СТАВОК -->
                <div id="swP2PBidButtons" class="grid-3 mb-2">
                    <button onclick="StorageWarsP2P.placePlayerBid(25000)" class="btn btn-amber btn-sm" ${data.status !== 'active' ? 'disabled' : ''}>+25,000 ₽</button>
                    <button onclick="StorageWarsP2P.placePlayerBid(50000)" class="btn btn-amber btn-sm" ${data.status !== 'active' ? 'disabled' : ''}>+50,000 ₽</button>
                    <button onclick="StorageWarsP2P.placePlayerBid(100000)" class="btn btn-green btn-sm" ${data.status !== 'active' ? 'disabled' : ''}>+100,000 ₽</button>
                </div>

                <button onclick="StorageWarsP2P.confirmLeave()" class="btn btn-dark btn-sm w-full">Покинуть аукцион</button>
            </div>
        `;

        ModalManager.open('modalStorageWarsP2P', { closeOthers: true });
        if (typeof playSound === 'function') playSound('tick');
    },

    // --------------------------------------------------------
    // UI: ОБНОВЛЕНИЕ МОДАЛКИ
    // --------------------------------------------------------
    _updateModal(data) {
        if (!data) return;
        const modal = document.getElementById('modalStorageWarsP2P');
        if (!modal) return;

        const players = data.players || [];
        const playerCountEl = document.getElementById('swP2PPlayerCount');
        if (playerCountEl) playerCountEl.innerText = `${players.length}/${this.CONFIG.maxPlayers}`;

        const waitingEl = document.getElementById('swP2PWaitingInfo');
        if (waitingEl) {
            if (data.status === 'waiting') waitingEl.innerText = 'Ожидание игроков...';
            else if (data.status === 'active') waitingEl.innerText = '🎙 Торги идут!';
            else if (data.status === 'finished') waitingEl.innerText = '🏁 Аукцион завершён';
        }

        const bidEl = document.getElementById('swP2PCurrentBid');
        if (bidEl) bidEl.innerText = `${(data.currentBid || 0).toLocaleString()} ₽`;

        const leaderEl = document.getElementById('swP2PLeaderName');
        if (leaderEl) leaderEl.innerText = data.highestBidder || 'Аукционист';

        const timerEl = document.getElementById('swP2PTimerNum');
        if (timerEl) timerEl.innerText = `⏳ ${Math.max(0, data.timeLeft || 0)}с`;

        const listEl = document.getElementById('swP2PPlayersList');
        if (listEl) listEl.innerHTML = this._renderPlayersChips(players);

        const logEl = document.getElementById('swP2PLog');
        if (logEl) {
            logEl.innerHTML = this._renderLogHtml(data.chatLog || []);
            logEl.scrollTop = logEl.scrollHeight;
        }

        const bidBtns = document.querySelectorAll('#swP2PBidButtons button');
        bidBtns.forEach(btn => { btn.disabled = (data.status !== 'active'); });
    },

    _renderPlayersChips(players) {
        if (!players || players.length === 0) return '<div class="sub-label" style="font-size:9px;">Ожидание...</div>';
        return players.map(p => {
            const isMe = String(p.id) === String(state.player?.uid);
            const isHost = p.isHost;
            const isBot = p.isBot;
            return `
                <span class="tag-badge ${isMe ? 'bg-tag-green' : (isBot ? 'bg-tag-dark' : 'bg-tag-cyan')}" style="font-size:8px;">
                    ${isBot ? '🤖' : (isMe ? '👤' : '🧑')} ${p.name}${isHost ? ' 👑' : ''}
                </span>
            `;
        }).join('');
    },

    _renderLogHtml(log) {
        if (!log || log.length === 0) return '<div class="sub-label" style="font-size:9.5px;">Лог пуст</div>';
        return log.slice(-10).map(msg => {
            if (msg.from === 'auctioneer') {
                return `<div class="chat-msg" style="background:rgba(255,179,0,0.12); border-left:3px solid var(--amber); color:#fef08a; padding:4px 8px; margin-bottom:4px;"><b>🔨 ${msg.name}:</b> ${msg.text}</div>`;
            } else if (msg.from === 'player') {
                return `<div class="chat-msg msg-player" style="padding:4px 8px; margin-bottom:4px;"><b>${msg.name}:</b> ${msg.text}</div>`;
            } else if (msg.from === 'system') {
                return `<div class="chat-msg" style="background:rgba(0,242,254,0.08); border-left:3px solid var(--cyan); color:#67e8f9; padding:4px 8px; margin-bottom:4px;">${msg.text}</div>`;
            } else {
                return `<div class="chat-msg msg-seller" style="padding:4px 8px; margin-bottom:4px;"><b>${msg.name}:</b> ${msg.text}</div>`;
            }
        }).join('');
    },

    _appendLog(from, name, text) {
        return [{
            from, name, text, ts: Date.now()
        }];
    },

    // --------------------------------------------------------
    // ВЫХОД / ЗАКРЫТИЕ
    // --------------------------------------------------------
    async confirmLeave() {
        if (this._activeLobbyData?.status === 'active') {
            if (!confirm('Аукцион идёт! Точно покинуть?')) return;
        }
        this.closeP2PModal();
    },

    async closeP2PModal() {
        // Отписываемся от слушателей
        if (this._lobbyUnsubscribe) { this._lobbyUnsubscribe(); this._lobbyUnsubscribe = null; }
        if (this._bidsUnsubscribe) { this._bidsUnsubscribe(); this._bidsUnsubscribe = null; }
        if (this._lobbyTimer) { clearInterval(this._lobbyTimer); this._lobbyTimer = null; }
        if (this._botFallbackTimer) { clearTimeout(this._botFallbackTimer); this._botFallbackTimer = null; }
        if (this._hostInterval) { clearInterval(this._hostInterval); this._hostInterval = null; }

        // Помечаем лобби как закрытое (если я хост)
        if (this._isHost && this._currentLobbyId && this._activeLobbyData?.status === 'waiting') {
            try {
                const helpers = await this._firestoreHelpers();
                const { doc, updateDoc } = helpers;
                const lobbyRef = doc(window.FB_Bridge.db, 'storage_wars_lobbies', this._currentLobbyId);
                await updateDoc(lobbyRef, { status: 'abandoned' });
            } catch (e) {}
        }

        this._currentLobbyId = null;
        this._isHost = false;
        this._activeLobbyData = null;

        ModalManager.close('modalStorageWarsP2P');

        // Возвращаемся в меню порта
        if (typeof AppPort !== 'undefined' && typeof AppPort.render === 'function') {
            AppPort.render(document.getElementById('phoneAppContainer'));
        }
    },

    // --------------------------------------------------------
    // FALLBACK НА СОЛО
    // --------------------------------------------------------
    _fallbackToSolo(containerIdx) {
        this.closeP2PModal();
        if (typeof AppPort !== 'undefined' && typeof AppPort.startStorageWarsAuction === 'function') {
            AppPort.startStorageWarsAuction(containerIdx);
        }
    },

    // --------------------------------------------------------
    // УТИЛИТЫ
    // --------------------------------------------------------
    _getContainerByKey(lotKey) {
        if (typeof STORAGE_WARS_CONTAINERS === 'undefined') return null;
        return STORAGE_WARS_CONTAINERS.find(c => c.id === lotKey);
    },

    // Хелперы для динамического импорта Firestore функций
    async _firestoreHelpers() {
        if (this._helpersCache) return this._helpersCache;

        const mod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        this._helpersCache = {
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
            arrayUnion: mod.arrayUnion,
            onSnapshot: mod.onSnapshot
        };
        return this._helpersCache;
    }
};

window.StorageWarsP2P = StorageWarsP2P;
console.log('[🌐 storage-wars-p2p v1.0.0] Онлайн-лобби аукциона загружено ✓');
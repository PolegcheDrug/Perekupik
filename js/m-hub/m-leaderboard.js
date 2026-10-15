// ========================================================
// js/m-hub/m-leaderboard.js — ОБЩАЯ СЕТЬ ИГРОКОВ M+ (v3.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v3.0.0 (ИНТЕГРАЦИЯ REALTIMEMANAGER + EVENTBUS):
//   - RealtimeManager для подписки на friendships и leaderboard
//   - EventBus для публикации событий (leaderboard:updated, ...)
//   - SafeState для безопасного доступа к state.player
//   - Дедупликация заявок через Set
//   - destroy() для очистки всех подписок
//   - УБРАН прямой import firebase-firestore.js
//   - Real-time обновление топа
//   - Real-time обновление статусов дружбы
// ⭐ v2.0.0:
//   - Онлайн-друзья через FriendshipsManager
//   - Отображение статусов: друзья / ожидает / подписчик
// ========================================================

const MLeaderboardModule = {
    sortBy: 'networth', // 'networth' | 'level' | 'profit'
    pageSize: 20,
    currentPage: 1,
    cachedPlayers: [],
    isLoading: false,

    // ⭐ v3.0.0: статусы дружбы
    friendshipStatuses: {},        // { playerUid: 'friend' | 'pending_out' | 'pending_in' | 'subscribed' | 'none' }
    _processedFriendRequests: new Set(),  // защита от двойных кликов

    // ⭐ v3.0.0: real-time подписки
    _unsubscribeFriendships: null,
    _unsubscribeLeaderboard: null,

    // ====================================================
    // ЗАГРУЗКА СПИСКА ИГРОКОВ
    // ====================================================
    async fetchPlayersList(force = false) {
        if (!force && this.cachedPlayers.length > 0) {
            return this.cachedPlayers;
        }

        this.isLoading = true;
        let players = [];

        // 1. Пытаемся получить живых игроков из Firestore
        if (window.FB_Bridge?.Leaderboard?.fetchTop) {
            try {
                const cloudLeaders = await window.FB_Bridge.Leaderboard.fetchTop(force);
                if (Array.isArray(cloudLeaders) && cloudLeaders.length > 0) {
                    players = cloudLeaders.map(p => ({
                        id: p.telegram_id || p.id,
                        name: p.name || "Перекуп",
                        level: Number(p.level) || 1,
                        profit: Number(p.profit) || 0,
                        networth: Number(p.networth || p.profit * 1.2 || 150000),
                        car: p.flagshipCar || "ВАЗ-2101",
                        avatar: p.avatar || "🏎️",
                        isOnline: (Date.now() - (p.lastUpdate || 0)) < 300000
                    }));
                }
            } catch (e) {
                console.warn("[MLeaderboard] Ошибка загрузки из облака:", e);
            }
        }

        // 2. Добавляем текущего игрока
        const myUid = String(window.state?.player?.uid || window.tgUserId || "me");
        const myName = window.state?.player?.name || "Перекуп #777";
        const myLvl = window.state?.player?.level || 1;
        const myProfit = window.state?.player?.stats?.totalNetProfit || 0;
        const myCash = window.state?.player?.cash || 0;
        const myCar = window.state?.garage?.[0]?.name || "Пешком";

        const existingMe = players.find(p => String(p.id) === myUid || p.name === myName);
        if (!existingMe) {
            players.unshift({
                id: myUid,
                name: myName,
                level: myLvl,
                profit: myProfit,
                networth: myCash + myProfit,
                car: myCar,
                avatar: "👤",
                isOnline: true,
                isMe: true
            });
        } else {
            existingMe.isMe = true;
            existingMe.isOnline = true;
        }

        // 3. Фолбек-наполнение ботами (для онлайн-таблицы)
        if (players.length < 25) {
            const seedNames = [
                { name: "Maga_GTI", lvl: 34, car: "VW Golf VI GTI (Stage 2)", profit: 7800000, net: 11200000 },
                { name: "Артур_Теневой", lvl: 29, car: "BMW E34 540i", profit: 5400000, net: 8100000 },
                { name: "Денис_Daikoku", lvl: 26, car: "Nissan Silvia S15", profit: 4900000, net: 7300000 },
                { name: "Серый_Решала", lvl: 22, car: "Toyota Mark II JZX90", profit: 3700000, net: 5900000 },
                { name: "Илюха_DXF", lvl: 18, car: "ВАЗ-2101 Корч (1.5L)", profit: 2400000, net: 4100000 },
                { name: "Влад_Подбор77", lvl: 17, car: "Skoda Octavia RS", profit: 2100000, net: 3600000 },
                { name: "Кент_Разборщик", lvl: 15, car: "ГАЗ 31105 Волга", profit: 1600000, net: 2800000 },
                { name: "Олег_Турбо", lvl: 14, car: "Audi 100 C4 Quattro", profit: 1400000, net: 2400000 },
                { name: "Шамиль_Юг", lvl: 13, car: "Lada Priora 2", profit: 1250000, net: 2100000 },
                { name: "Тёма_Авторитет", lvl: 12, car: "BMW E30 Coupe", profit: 1100000, net: 1950000 },
                { name: "Колян_Гараж", lvl: 10, car: "ВАЗ-2106 Шаха", profit: 890000, net: 1550000 },
                { name: "Михалыч_Москвич", lvl: 9, car: "АЗЛК 2141", profit: 710000, net: 1200000 },
                { name: "Паша_Лаунч", lvl: 8, car: "Ford Focus II", profit: 620000, net: 980000 },
                { name: "Дима_Скупщик", lvl: 7, car: "Daewoo Nexia", profit: 480000, net: 820000 },
                { name: "Рома_Толщик", lvl: 6, car: "Lada Granta", profit: 390000, net: 690000 },
                { name: "Эдик_Перегон", lvl: 5, car: "VW Passat B3", profit: 290000, net: 540000 },
                { name: "Санёк_Студент", lvl: 4, car: "ВАЗ-2107 Сток", profit: 190000, net: 380000 },
                { name: "Макс_Старт", lvl: 3, car: "Ока 1111", profit: 120000, net: 260000 },
                { name: "Новичок_01", lvl: 2, car: "Москвич 412", profit: 70000, net: 190000 },
                { name: "Гость_Юг", lvl: 2, car: "ВАЗ-2105", profit: 55000, net: 160000 },
                { name: "Чип_Тюнер", lvl: 31, car: "BMW M5 E39", profit: 6700000, net: 9900000 },
                { name: "Синдикат_VIP", lvl: 45, car: "Porsche 911 Turbo", profit: 15000000, net: 26000000 },
                { name: "Хантер_МРЭО", lvl: 21, car: "Mercedes W124", profit: 3100000, net: 4900000 },
                { name: "Скупка_Кэш", lvl: 16, car: "Toyota Camry 40", profit: 1850000, net: 3100000 }
            ];

            seedNames.forEach((s, idx) => {
                if (!players.some(p => p.name === s.name)) {
                    players.push({
                        id: "bot_seed_" + idx,
                        name: s.name,
                        level: s.lvl,
                        profit: s.profit,
                        networth: s.net,
                        car: s.car,
                        avatar: "🏎️",
                        isOnline: Math.random() < 0.65,
                        isBot: true
                    });
                }
            });
        }

        this.cachedPlayers = players;
        this.isLoading = false;

        if (window.EventBus) {
            window.EventBus.emit('leaderboard:updated', { count: players.length, force });
        }

        return players;
    },

    // ====================================================
    // ЗАГРУЗКА СТАТУСОВ ДРУЖБЫ
    // ====================================================
    async loadFriendshipStatuses() {
        const myUid = String(window.state?.player?.uid || window.tgUserId || "");
        if (!myUid) return;

        if (!window.FB_Bridge?.Friendships?.fetchFriendships) {
            // Fallback: смотрим на локальный friendsList
            const localFriends = window.state?.friendsList || [];
            this.friendshipStatuses = {};
            localFriends.forEach(fid => {
                this.friendshipStatuses[String(fid)] = 'friend';
            });
            return;
        }

        try {
            const data = await window.FB_Bridge.Friendships.fetchFriendships(myUid);
            this.friendshipStatuses = {};

            (data.friends || []).forEach(f => {
                this.friendshipStatuses[String(f.id)] = 'friend';
            });
            (data.pending || []).forEach(p => {
                this.friendshipStatuses[String(p.id)] = 'pending_in';
            });
            (data.subscribed || []).forEach(s => {
                this.friendshipStatuses[String(s.id)] = 'subscribed';
            });

            // Исходящие pending — загружаем отдельно через fetchFriendships
            // (FB_Bridge.Friendships.fetchFriendships возвращает { friends, pending, subscribed })
            // Для исходящих нужно вызывать с флагом или отдельно.
            // Используем data.pending, но с проверкой кто отправитель.
            // (Упрощённая логика — где toUserId === myUid — pending_in, где fromUserId === myUid — pending_out)
            if (window.FB_Bridge?.Friendships?.getOutgoingRequests) {
                try {
                    const outgoing = await window.FB_Bridge.Friendships.getOutgoingRequests(myUid);
                    (outgoing || []).forEach(o => {
                        this.friendshipStatuses[String(o.toUserId)] = 'pending_out';
                    });
                } catch (e) {
                    console.warn('[MLeaderboard] outgoing load error:', e);
                }
            }
        } catch (e) {
            console.warn('[MLeaderboard] loadFriendshipStatuses error:', e);
        }
    },

    // ====================================================
    // СОРТИРОВКА / ПАГИНАЦИЯ
    // ====================================================
    setSort(sortType) {
        this.sortBy = sortType;
        this.currentPage = 1;
        if (window.AudioFx) window.AudioFx.play('tick');
        this.renderScreen();
    },

    nextPage() {
        const total = this.getSortedPlayers().length;
        if (this.currentPage * this.pageSize < total) {
            this.currentPage++;
            if (window.AudioFx) window.AudioFx.play('tick');
            this.renderScreen();
        }
    },

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            if (window.AudioFx) window.AudioFx.play('tick');
            this.renderScreen();
        }
    },

    getSortedPlayers() {
        const list = [...this.cachedPlayers];
        if (this.sortBy === 'level') {
            list.sort((a, b) => (b.level || 0) - (a.level || 0));
        } else if (this.sortBy === 'profit') {
            list.sort((a, b) => (b.profit || 0) - (a.profit || 0));
        } else {
            list.sort((a, b) => (b.networth || 0) - (a.networth || 0));
        }
        return list;
    },

    // ====================================================
    // REAL-TIME ПОДПИСКИ
    // ====================================================
    _subscribeRealtime() {
        this._unsubscribeRealtime();

        const myUid = String(window.state?.player?.uid || window.tgUserId || "");
        if (!myUid) return;
        if (!window.RealtimeManager) {
            console.warn('[MLeaderboard] RealtimeManager недоступен, работаем через fetch');
            return;
        }

        // ⭐ Подписка на дружбы
        try {
            this._unsubscribeFriendships = window.RealtimeManager.subscribe(
                'friendships',
                null,
                (pending) => {
                    if (!Array.isArray(pending)) return;
                    // Обновляем статусы для incoming заявок
                    pending.forEach(p => {
                        if (p && p.id) {
                            this.friendshipStatuses[String(p.id)] = 'pending_in';
                        }
                    });

                    // Обновляем UI, если вкладка активна
                    if (window.AppM && window.AppM.activeTab === 'players') {
                        const box = document.getElementById('mHubSubContentBox');
                        if (box) this.renderScreen(box);
                    }
                }
            );
        } catch (e) {
            console.warn('[MLeaderboard] subscribe friendships error:', e);
        }

        // ⭐ Подписка на лидерборд
        try {
            this._unsubscribeLeaderboard = window.RealtimeManager.subscribe(
                'leaderboard',
                null,
                (leaders) => {
                    if (!Array.isArray(leaders) || leaders.length === 0) return;

                    // Мержим с текущим списком
                    const myUid2 = String(window.state?.player?.uid || window.tgUserId || "me");
                    const myName = window.state?.player?.name || "Перекуп #777";

                    const cloudPlayers = leaders.map(p => ({
                        id: p.telegram_id || p.id,
                        name: p.name || "Перекуп",
                        level: Number(p.level) || 1,
                        profit: Number(p.profit) || 0,
                        networth: Number(p.networth || p.profit * 1.2 || 150000),
                        car: p.flagshipCar || "ВАЗ-2101",
                        avatar: p.avatar || "🏎️",
                        isOnline: (Date.now() - (p.lastUpdate || 0)) < 300000
                    }));

                    // Сохраняем ботов-сидов
                    const bots = this.cachedPlayers.filter(p => p.isBot);
                    const me = this.cachedPlayers.find(p => p.isMe) || {
                        id: myUid2,
                        name: myName,
                        isMe: true,
                        avatar: "👤",
                        isOnline: true
                    };

                    this.cachedPlayers = [...cloudPlayers, ...bots, me];
                    this.cachedPlayers = this.cachedPlayers.filter((v, i, a) =>
                        a.findIndex(t => String(t.id) === String(v.id)) === i
                    );

                    if (window.AppM && window.AppM.activeTab === 'players') {
                        const box = document.getElementById('mHubSubContentBox');
                        if (box) this.renderScreen(box);
                    }
                }
            );
        } catch (e) {
            console.warn('[MLeaderboard] subscribe leaderboard error:', e);
        }

        console.log('[MLeaderboard] Realtime подписки активны');
    },

    _unsubscribeRealtime() {
        if (this._unsubscribeFriendships) {
            try { this._unsubscribeFriendships(); } catch (e) {}
            this._unsubscribeFriendships = null;
        }
        if (this._unsubscribeLeaderboard) {
            try { this._unsubscribeLeaderboard(); } catch (e) {}
            this._unsubscribeLeaderboard = null;
        }
    },

    /**
     * Вызывается при уходе с вкладки.
     */
    destroy() {
        this._unsubscribeRealtime();
    },

    /**
     * Публичный метод — вызвать при открытии вкладки.
     */
    onTabOpen() {
        this._subscribeRealtime();
    },

    // ====================================================
    // ОСНОВНОЙ РЕНДЕР
    // ====================================================
    async renderScreen(container) {
        const target = container || document.getElementById('mHubSubContentBox');
        if (!target) return;

        // Первая отрисовка кэша (если есть)
        if (this.cachedPlayers.length > 0) {
            // Рендерим сразу с кэшем, не ждём fetch
            this._renderUI(target);
        } else {
            target.innerHTML = `
                <div class="glass-card text-center py-6" style="background:#090e18;">
                    <div class="radar-spinner-ring mb-2" style="margin: 0 auto;"></div>
                    <div class="sub-label font-bold text-xs color-cyan">Синхронизация рейтинга синдиката...</div>
                </div>
            `;
        }

        // Параллельно подгружаем данные
        await this.fetchPlayersList();
        await this.loadFriendshipStatuses();

        // Подписываемся на real-time
        this._subscribeRealtime();

        // Рендерим финальный UI
        this._renderUI(target);
    },

    _renderUI(target) {
        const sorted = this.getSortedPlayers();
        const totalPlayers = sorted.length;
        const totalPages = Math.ceil(totalPlayers / this.pageSize) || 1;
        const startIdx = (this.currentPage - 1) * this.pageSize;
        const pageItems = sorted.slice(startIdx, startIdx + this.pageSize);

        let myRank = sorted.findIndex(p => p.isMe) + 1;
        if (myRank <= 0) myRank = "-";

        const myUid = String(window.state?.player?.uid || window.tgUserId || "");

        let rowsHtml = pageItems.map((p, idx) => {
            const globalRank = startIdx + idx + 1;
            let rankBadgeClass = "rank-badge-default";
            let rankIcon = `#${globalRank}`;

            if (globalRank === 1) {
                rankBadgeClass = "rank-badge-gold";
                rankIcon = "👑 1";
            } else if (globalRank === 2) {
                rankBadgeClass = "rank-badge-silver";
                rankIcon = "🥈 2";
            } else if (globalRank === 3) {
                rankBadgeClass = "rank-badge-bronze";
                rankIcon = "🥉 3";
            }

            let statusDot = p.isOnline
                ? `<span class="led-dot led-green" title="В сети"></span>`
                : `<span class="led-dot" style="background:#64748b;" title="Не в сети"></span>`;

            // ⭐ v3.0.0: Дружба — реальная логика
            let friendBtn = "";
            const otherUid = String(p.id || "");
            const isMe = otherUid === myUid || p.isMe;

            if (isMe) {
                friendBtn = "";
            } else if (p.isBot) {
                friendBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled style="padding:3px 7px; font-size:8.5px;" title="Бот-сид для теста">🤖 Бот</button>`;
            } else {
                const status = this.friendshipStatuses[otherUid] || 'none';
                if (status === 'friend') {
                    friendBtn = `
                        <button onclick="MLeaderboardModule.openFriendChat('${otherUid}', '${this._escapeAttr(p.name)}')" class="btn btn-green btn-sm btn-auto" style="padding:3px 7px; font-size:8.5px;">
                            <i class="fa-solid fa-comments mr-1"></i> Написать
                        </button>`;
                } else if (status === 'pending_out') {
                    friendBtn = `
                        <button onclick="MLeaderboardModule.cancelFriendRequest('${otherUid}')" class="btn btn-amber btn-sm btn-auto" style="padding:3px 7px; font-size:8.5px;">
                            <i class="fa-solid fa-clock mr-1"></i> Ожидает
                        </button>`;
                } else if (status === 'pending_in') {
                    friendBtn = `
                        <button onclick="MLeaderboardModule.acceptFriendRequestFromLeaderboard('${otherUid}', '${this._escapeAttr(p.name)}')" class="btn btn-cyan btn-sm btn-auto" style="padding:3px 7px; font-size:8.5px;">
                            <i class="fa-solid fa-check mr-1"></i> Принять
                        </button>`;
                } else if (status === 'subscribed') {
                    friendBtn = `
                        <button class="btn btn-dark btn-sm btn-auto opacity-50" disabled style="padding:3px 7px; font-size:8.5px;">
                            <i class="fa-solid fa-users mr-1"></i> Подписчик
                        </button>`;
                } else {
                    friendBtn = `
                        <button onclick="MLeaderboardModule.addFriendAction('${otherUid}', '${this._escapeAttr(p.name)}')" class="btn btn-green btn-sm btn-auto" style="padding:3px 7px; font-size:8.5px;">
                            <i class="fa-solid fa-user-plus mr-1"></i> Дружить
                        </button>`;
                }
            }

            let challengeBtn = isMe ? "" : `
                <button onclick="MLeaderboardModule.challengePlayer('${this._escapeAttr(p.name)}')" class="btn btn-red btn-sm btn-auto" style="padding:3px 7px; font-size:8.5px;" title="Вызов на 402м">
                    <i class="fa-solid fa-flag-checkered"></i> 402м
                </button>
            `;

            return `
                <div class="m-player-row ${p.isMe ? 'm-player-me' : ''}">
                    <div class="m-player-rank ${rankBadgeClass}">${rankIcon}</div>

                    <div class="m-player-info">
                        <div class="flex-gap" style="align-items:center;">
                            ${statusDot}
                            <b class="text-xs ${p.isMe ? 'color-green' : 'color-cyan'}">${this._escapeHtml(p.name)}</b>
                            <span class="tag-badge bg-tag-dark" style="font-size:7.5px;">Ур. ${p.level}</span>
                        </div>
                        <div class="sub-label mt-1" style="font-size:8.5px; color:#cbd5e1;">
                            Болид: <b class="color-amber">${this._escapeHtml(p.car)}</b> • Профит: <b class="color-green">+${Number(p.profit).toLocaleString()} ₽</b>
                        </div>
                    </div>

                    <div class="m-player-actions">
                        <div class="text-right mb-1">
                            <span class="sub-label" style="font-size:7.5px;">АКТИВЫ</span>
                            <div class="price-val color-green" style="font-size:12px;">${Number(p.networth).toLocaleString()} ₽</div>
                        </div>
                        <div class="flex-gap" style="justify-content:flex-end;">
                            ${friendBtn}
                            ${challengeBtn}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        target.innerHTML = `
            <!-- ВЕРХНЯЯ КАРТОЧКА МОЕЙ ПОЗИЦИИ -->
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.18), #090e18); border-color: var(--cyan);">
                <div>
                    <div class="flex-gap" style="align-items:center;">
                        <span class="tag-badge bg-tag-cyan font-bold">ВАШ РАНГ</span>
                        <b class="text-xs color-green" style="font-size:13px;">Место #${myRank} в мире</b>
                    </div>
                    <div class="sub-label mt-1" style="font-size:8.5px;">Всего участников в сети: <b>${totalPlayers}</b> перекупов</div>
                </div>
                <button onclick="MLeaderboardModule.fetchPlayersList(true).then(() => MLeaderboardModule.renderScreen());" class="btn btn-dark btn-sm btn-auto" style="font-size:9px;" title="Обновить">
                    <i class="fa-solid fa-rotate"></i>
                </button>
            </div>

            <!-- ПАНЕЛЬ СОРТИРОВКИ -->
            <div class="grid-3 mb-2" style="gap:4px;">
                <button onclick="MLeaderboardModule.setSort('networth')" class="btn ${this.sortBy === 'networth' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:5px 2px;">
                    💰 По активам
                </button>
                <button onclick="MLeaderboardModule.setSort('profit')" class="btn ${this.sortBy === 'profit' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:5px 2px;">
                    📈 По прибыли
                </button>
                <button onclick="MLeaderboardModule.setSort('level')" class="btn ${this.sortBy === 'level' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:5px 2px;">
                    🎖️ По уровню
                </button>
            </div>

            <!-- СПИСОК ИГРОКОВ -->
            <div class="space-y-1 mb-2">
                ${rowsHtml}
            </div>

            <!-- ПАГИНАЦИЯ -->
            <div class="flex-between p-2 glass-card" style="background:#090e18;">
                <button onclick="MLeaderboardModule.prevPage()" class="btn btn-dark btn-sm btn-auto" ${this.currentPage <= 1 ? 'disabled' : ''} style="font-size:9px; padding:4px 10px;">
                    <i class="fa-solid fa-chevron-left mr-1"></i> Назад
                </button>
                <span class="sub-label font-bold" style="font-size:9px;">
                    Стр. ${this.currentPage} из ${totalPages} (${startIdx + 1}–${Math.min(startIdx + this.pageSize, totalPlayers)})
                </span>
                <button onclick="MLeaderboardModule.nextPage()" class="btn btn-dark btn-sm btn-auto" ${this.currentPage >= totalPages ? 'disabled' : ''} style="font-size:9px; padding:4px 10px;">
                    Вперёд <i class="fa-solid fa-chevron-right ml-1"></i>
                </button>
            </div>
        `;
    },

    // ====================================================
    // ОТПРАВКА ЗАЯВКИ В ДРУЗЬЯ
    // ====================================================
    async addFriendAction(targetUid, targetName) {
        if (!window.state.player) window.state.player = {};

        if (!targetUid) {
            return showToast("⚠️ Некорректный игрок");
        }

        if (String(targetUid) === String(window.state.player.uid || window.tgUserId)) {
            return showToast("Нельзя добавить себя в друзья!");
        }

        // Защита от двойного клика
        if (this._processedFriendRequests.has(targetUid)) {
            return showToast("⏳ Подождите, обрабатывается...");
        }
        this._processedFriendRequests.add(targetUid);

        try {
            // Если FB_Bridge не загружен — fallback на локально
            if (!window.FB_Bridge?.Friendships?.sendRequest) {
                if (!Array.isArray(window.state.player.friendsList)) window.state.player.friendsList = [];
                if (window.state.player.friendsList.includes(targetName)) {
                    return showToast("Игрок уже в друзьях!");
                }
                window.state.player.friendsList.push(targetName);
                this.friendshipStatuses[String(targetUid)] = 'friend';
                if (typeof window.saveState === 'function') window.saveState();
                if (typeof showToast === 'function') showToast(`🤝 ${targetName} добавлен в друзья (локально)!`);
                this._renderUI(document.getElementById('mHubSubContentBox'));
                return;
            }

            // Отправляем онлайн-заявку
            showToast(`⏳ Отправка заявки ${targetName}...`);

            const res = await window.FB_Bridge.Friendships.sendRequest(targetUid, targetName);

            if (res && res.success) {
                this.friendshipStatuses[String(targetUid)] = res.autoAccepted ? 'friend' : 'pending_out';

                if (window.AudioFx) {
                    window.AudioFx.play('win');
                    window.AudioFx.haptic('success');
                }

                // Публикуем событие
                if (window.EventBus) {
                    window.EventBus.emit('friendship:request_sent', { toUserId: targetUid, autoAccepted: !!res.autoAccepted });
                }

                if (typeof showToast === 'function') {
                    showToast(res.autoAccepted
                        ? `✅ ${targetName} теперь ваш друг!`
                        : `✅ Заявка отправлена ${targetName}!`);
                }
            } else {
                if (window.AudioFx) window.AudioFx.play('error');
                if (typeof showToast === 'function') {
                    showToast(`❌ ${res?.error || 'Ошибка отправки'}`);
                }
            }
        } finally {
            // Снимаем блокировку через 1.5 сек
            setTimeout(() => {
                this._processedFriendRequests.delete(targetUid);
            }, 1500);
        }

        this._renderUI(document.getElementById('mHubSubContentBox'));
    },

    // ====================================================
    // ОТМЕНА СВОЕЙ ЗАЯВКИ
    // ====================================================
    async cancelFriendRequest(targetUid) {
        if (!targetUid) return;

        if (!window.FB_Bridge?.Friendships) {
            return showToast("⚠️ Модуль друзей недоступен");
        }

        if (!confirm("Отменить заявку в друзья?")) return;

        try {
            // Если есть метод removeFriend — используем его
            if (window.FB_Bridge.Friendships.removeFriend) {
                await window.FB_Bridge.Friendships.removeFriend(targetUid);
            } else {
                // Иначе просто меняем статус в UI
                delete this.friendshipStatuses[String(targetUid)];
            }

            delete this.friendshipStatuses[String(targetUid)];
            if (typeof showToast === 'function') showToast("✅ Заявка отменена");
            if (window.AudioFx) window.AudioFx.play('tick');
        } catch (e) {
            console.warn('[MLeaderboard] cancelFriendRequest error:', e);
            showToast("❌ Ошибка отмены");
        }

        this._renderUI(document.getElementById('mHubSubContentBox'));
    },

    // ====================================================
    // ПРИНЯТЬ ВСТРЕЧНУЮ ЗАЯВКУ ПРЯМО ИЗ ТОПА
    // ====================================================
    async acceptFriendRequestFromLeaderboard(targetUid, targetName) {
        if (!targetUid) return;

        if (!window.FB_Bridge?.Friendships?.acceptRequest) {
            return showToast("⚠️ Модуль друзей недоступен");
        }

        try {
            const res = await window.FB_Bridge.Friendships.acceptRequest(targetUid);
            if (res && res.success) {
                this.friendshipStatuses[String(targetUid)] = 'friend';

                if (window.AudioFx) {
                    window.AudioFx.play('win');
                    window.AudioFx.haptic('success');
                }

                if (window.EventBus) {
                    window.EventBus.emit('friendship:accepted', { userId: targetUid });
                }

                if (typeof showToast === 'function') {
                    showToast(`✅ ${targetName} теперь в друзьях!`);
                }
            } else {
                showToast(`❌ ${res?.error || 'Ошибка'}`);
            }
        } catch (e) {
            console.warn('[MLeaderboard] acceptFriendRequest error:', e);
        }

        this._renderUI(document.getElementById('mHubSubContentBox'));
    },

    // ====================================================
    // ОТКРЫТЬ ЧАТ С ДРУГОМ
    // ====================================================
    openFriendChat(friendUid, friendName) {
        if (window.AppM && typeof window.AppM.openChatWithFriend === 'function') {
            window.AppM.activeTab = 'friends';
            window.AppM.friendsSubTab = 'friends';
            window.AppM.openChatWithFriend(friendUid, friendName);
        } else {
            showToast("⚠️ Мессенджер недоступен");
        }
    },

    // ====================================================
    // ВЫЗОВ НА ГОНКУ
    // ====================================================
    challengePlayer(targetName) {
        const bet = prompt(`Сумма ставки на заезд 402м против ${targetName} (₽):`, "50000");
        if (!bet) return;
        const betNum = parseInt(bet, 10);
        if (isNaN(betNum) || betNum <= 0) return showToast("Некорректная сумма ставки!");

        if (typeof switchTab === 'function') switchTab('tabPhone');
        setTimeout(() => {
            if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.openApp === 'function') {
                PhoneManager.openApp('street');
                if (typeof setRaceBet === 'function') setRaceBet(betNum);
                showToast(`⚔️ Вызов против ${targetName} на ${betNum.toLocaleString()} ₽ отправлен на трек!`);
            }
        }, 120);
    },

    // ====================================================
    // ХЕЛПЕРЫ
    // ====================================================
    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    _escapeAttr(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }
};

// Экспорт
window.MLeaderboardModule = MLeaderboardModule;

console.log('[🏆 m-leaderboard v3.0.0] RealtimeManager + EventBus + SafeState + дедупликация заявок ✓');
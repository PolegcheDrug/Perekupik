// ========================================================
// js/m-hub/m-leaderboard.js — ОБЩАЯ СЕТЬ ИГРОКОВ M+ (v3.2.0 LIVE & SOCIAL)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v3.2.0 (СИНХРОНИЗАЦИЯ ДРУЖБЫ И СТАТУСОВ ЗАЯВОК):
//   - Полная интеграция с FB_FriendshipsManager (v1.3.0).
//   - Отображение точных статусов: "Дружить", "Ожидает", "Принять", "Друг".
//   - Автопринятие встречных заявок без конфликта "Заявка уже отправлена".
//   - Быстрый переход в шторку реплик или офферов прямо из топа.
// ========================================================

const MLeaderboardModule = {
    sortBy: 'networth', // 'networth' | 'level' | 'profit'
    pageSize: 20,
    currentPage: 1,
    cachedPlayers: [],
    isLoading: false,

    friendshipStatuses: {},
    _processedFriendRequests: new Set(),

    _unsubscribeFriendships: null,
    _unsubscribeLeaderboard: null,

    // ====================================================
    // ЗАГРУЗКА СПИСКА ИГРОКОВ ИЗ FIRESTORE
    // ====================================================
    async fetchPlayersList(force = false) {
        if (!force && this.cachedPlayers.length > 0) {
            return this.cachedPlayers;
        }

        this.isLoading = true;
        let players = [];

        // 1. Читаем реальных игроков из Firebase
        try {
            let sortField = 'netWorth';
            if (this.sortBy === 'profit') sortField = 'profit';
            if (this.sortBy === 'level') sortField = 'level';

            let cloudLeaders = null;

            if (window.FB_Core?.Leaderboard?.fetchTop) {
                cloudLeaders = await window.FB_Core.Leaderboard.fetchTop(sortField, 50);
            } else if (window.FB_Bridge?.Leaderboard?.fetchTop) {
                cloudLeaders = await window.FB_Bridge.Leaderboard.fetchTop(force);
            }

            if (Array.isArray(cloudLeaders) && cloudLeaders.length > 0) {
                players = cloudLeaders.map(p => ({
                    id: String(p.uid || p.telegram_id || p.id || ''),
                    name: p.name || "Перекуп",
                    level: Number(p.level) || 1,
                    profit: Number(p.profit) || 0,
                    networth: Number(p.netWorth || p.networth || 150000),
                    car: p.bestCar || p.flagshipCar || "Пешком",
                    avatar: p.avatar || "👤",
                    isOnline: p.updatedAt ? (Date.now() - p.updatedAt < 600000) : true,
                    isBot: false
                })).filter(p => p.id && p.id !== 'undefined');
            }
        } catch (e) {
            console.warn("[MLeaderboard] Ошибка загрузки облачного топа:", e);
        }

        // 2. Добавляем текущего игрока
        const myUid = String(window.state?.player?.uid || window.tgUserId || "me");
        const myName = window.state?.player?.name || "Перекуп #777";
        const myLvl = Number(window.state?.player?.level) || 1;
        const myProfit = Number(window.state?.player?.stats?.totalNetProfit) || 0;
        
        let myTotalAssets = Number(window.state?.player?.cash) || 0;
        (window.state?.garage || []).forEach(c => {
            myTotalAssets += Number(c.price || c.basePrice || 0);
        });
        (window.state?.businesses || []).forEach(b => {
            if (b && b.level > 0) myTotalAssets += Number(b.cost || 0);
        });

        const myCar = window.state?.garage?.[0]?.name || "Пешком";

        const existingMe = players.find(p => String(p.id) === myUid || p.name === myName);
        if (!existingMe) {
            players.unshift({
                id: myUid,
                name: myName,
                level: myLvl,
                profit: myProfit,
                networth: myTotalAssets,
                car: myCar,
                avatar: window.state?.player?.avatarUrl || "👤",
                isOnline: true,
                isMe: true,
                isBot: false
            });
        } else {
            existingMe.isMe = true;
            existingMe.isOnline = true;
            existingMe.networth = Math.max(existingMe.networth, myTotalAssets);
            existingMe.profit = Math.max(existingMe.profit, myProfit);
            existingMe.level = Math.max(existingMe.level, myLvl);
        }

        // 3. Подмешиваем минимальных ботов, если живых игроков мало
        if (players.length < 3) {
            const seedNames = [
                { name: "Синдикат_VIP", lvl: 45, car: "Porsche 911 Turbo", profit: 15000000, net: 26000000 },
                { name: "Maga_GTI", lvl: 34, car: "VW Golf VI GTI (Stage 2)", profit: 7800000, net: 11200000 },
                { name: "Чип_Тюнер", lvl: 31, car: "BMW M5 E39", profit: 6700000, net: 9900000 }
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
                        isOnline: true,
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
    // СТАТУСЫ ДРУЖБЫ И ЗАЯВОК (СВЯЗКА С FIREBASE)
    // ====================================================
    async loadFriendshipStatuses() {
        const myUid = String(window.state?.player?.uid || window.tgUserId || "");
        if (!myUid) return;

        const manager = window.FB_FriendshipsManager || window.FB_Friendships?.Friendships || window.FB_Bridge?.Friendships;

        if (!manager?.fetchFriendships) {
            const localFriends = window.state?.friendsList || [];
            this.friendshipStatuses = {};
            localFriends.forEach(fid => {
                this.friendshipStatuses[String(fid)] = 'friend';
            });
            return;
        }

        try {
            const data = await manager.fetchFriendships(myUid);
            this.friendshipStatuses = {};

            (data.friends || []).forEach(f => {
                this.friendshipStatuses[String(f.id)] = 'friend';
            });
            (data.pending || []).forEach(p => {
                this.friendshipStatuses[String(p.id)] = 'pending_in';
            });
            (data.outgoing || []).forEach(o => {
                this.friendshipStatuses[String(o.id || o.toUserId)] = 'pending_out';
            });
        } catch (e) {
            console.warn('[MLeaderboard] Ошибка получения статусов дружбы:', e);
        }
    },

    // ====================================================
    // СОРТИРОВКА И ПАГИНАЦИЯ
    // ====================================================
    setSort(sortType) {
        this.sortBy = sortType;
        this.currentPage = 1;
        if (window.AudioFx) window.AudioFx.play('tick');
        this.fetchPlayersList(true).then(() => this.renderScreen());
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

        const manager = window.FB_FriendshipsManager || window.FB_Friendships?.Friendships;
        if (manager?.subscribeToFriendships) {
            try {
                this._unsubscribeFriendships = manager.subscribeToFriendships(myUid, (pending) => {
                    if (!Array.isArray(pending)) return;
                    pending.forEach(p => {
                        if (p && p.id) this.friendshipStatuses[String(p.id)] = 'pending_in';
                    });
                    const box = document.getElementById('mHubSubContentBox') || document.getElementById('mSocialContentBox');
                    if (box && window.AppM?.socialSubTab === 'top') {
                        this._renderUI(box);
                    }
                });
            } catch (e) {}
        }
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

    destroy() {
        this._unsubscribeRealtime();
    },

    onTabOpen() {
        this._subscribeRealtime();
    },

    // ====================================================
    // ОТРИСОВКА ИНТЕРФЕЙСА
    // ====================================================
    async renderScreen(container) {
        const target = container || document.getElementById('mHubSubContentBox') || document.getElementById('mSocialContentBox');
        if (!target) return;

        if (this.cachedPlayers.length > 0) {
            this._renderUI(target);
        } else {
            target.innerHTML = `
                <div class="glass-card text-center py-6" style="background:#090e18;">
                    <div class="radar-spinner-ring mb-2" style="margin: 0 auto;"></div>
                    <div class="sub-label font-bold text-xs color-cyan">Синхронизация рейтинга перекупов...</div>
                </div>
            `;
        }

        await this.fetchPlayersList();
        await this.loadFriendshipStatuses();
        this._subscribeRealtime();
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

            let friendBtn = "";
            const otherUid = String(p.id || "");
            const isMe = otherUid === myUid || p.isMe;

            if (isMe) {
                friendBtn = "";
            } else if (p.isBot) {
                friendBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled style="padding:4px 7px; font-size:8.5px;" title="Бот">🤖 БОТ</button>`;
            } else {
                const status = this.friendshipStatuses[otherUid] || 'none';

                if (status === 'friend') {
                    friendBtn = `
                        <button onclick="AppM.openQuickPhrasePicker('${otherUid}', '${this._escapeAttr(p.name)}')" class="btn btn-dark btn-sm btn-auto" style="padding:4px 8px; font-size:8.5px; border-color:var(--green); color:var(--green);">
                            <i class="fa-solid fa-check mr-1"></i> Друг
                        </button>`;
                } else if (status === 'pending_out') {
                    friendBtn = `
                        <button onclick="MLeaderboardModule.cancelFriendRequest('${otherUid}')" class="btn btn-dark btn-sm btn-auto" style="padding:4px 7px; font-size:8.5px; border-color:var(--amber); color:var(--amber);" title="Нажмите, чтобы отозвать">
                            <i class="fa-solid fa-clock mr-1"></i> Ожидает
                        </button>`;
                } else if (status === 'pending_in') {
                    friendBtn = `
                        <button onclick="MLeaderboardModule.acceptFriendRequestFromLeaderboard('${otherUid}', '${this._escapeAttr(p.name)}')" class="btn btn-cyan btn-sm btn-auto" style="padding:4px 8px; font-size:8.5px;">
                            <i class="fa-solid fa-handshake mr-1"></i> Принять
                        </button>`;
                } else {
                    friendBtn = `
                        <button onclick="MLeaderboardModule.addFriendAction('${otherUid}', '${this._escapeAttr(p.name)}')" class="btn btn-green btn-sm btn-auto" style="padding:4px 9px; font-size:8.5px;">
                            <i class="fa-solid fa-user-plus mr-1"></i> ДРУЖИТЬ
                        </button>`;
                }
            }

            let challengeBtn = isMe ? "" : `
                <button onclick="MLeaderboardModule.challengePlayer('${this._escapeAttr(p.name)}')" class="btn btn-red btn-sm btn-auto" style="padding:4px 7px; font-size:8.5px;" title="Вызов на 402м">
                    🏁 402М
                </button>
            `;

            return `
                <div class="m-player-row ${p.isMe ? 'm-player-me' : ''}">
                    <div class="m-player-rank ${rankBadgeClass}">${rankIcon}</div>

                    <div class="m-player-info">
                        <div class="flex-gap" style="align-items:center;">
                            ${statusDot}
                            <b class="text-xs ${p.isMe ? 'color-green' : 'color-cyan'}">${this._escapeHtml(p.name)}</b>
                            <span class="tag-badge bg-tag-dark" style="font-size:7.5px;">УР. ${p.level}</span>
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
                        <div class="flex-gap" style="justify-content:flex-end; gap:4px;">
                            ${friendBtn}
                            ${challengeBtn}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        target.innerHTML = `
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

            <div class="grid-3 mb-2" style="gap:4px;">
                <button onclick="MLeaderboardModule.setSort('networth')" class="btn ${this.sortBy === 'networth' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:5px 2px;">
                    💰 ПО АКТИВАМ
                </button>
                <button onclick="MLeaderboardModule.setSort('profit')" class="btn ${this.sortBy === 'profit' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:5px 2px;">
                    📈 ПО ПРИБЫЛИ
                </button>
                <button onclick="MLeaderboardModule.setSort('level')" class="btn ${this.sortBy === 'level' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:5px 2px;">
                    🎖️ ПО УРОВНЮ
                </button>
            </div>

            <div class="space-y-1 mb-2">
                ${rowsHtml}
            </div>

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
    // ДЕЙСТВИЯ: ДРУЖБА, ЧАТ И ВЫЗОВ
    // ====================================================
    async addFriendAction(targetUid, targetName) {
        if (!window.state?.player) window.state.player = {};
        if (!targetUid) return showToast("⚠️ Некорректный игрок");

        if (String(targetUid) === String(window.state.player.uid || window.tgUserId)) {
            return showToast("Нельзя добавить себя в друзья!");
        }

        if (this._processedFriendRequests.has(targetUid)) {
            return showToast("⏳ Обрабатывается...");
        }
        this._processedFriendRequests.add(targetUid);

        const manager = window.FB_FriendshipsManager || window.FB_Friendships?.Friendships || window.FB_Bridge?.Friendships;

        try {
            if (!manager?.sendRequest) {
                if (!Array.isArray(window.state.player.friendsList)) window.state.player.friendsList = [];
                window.state.player.friendsList.push(targetName);
                this.friendshipStatuses[String(targetUid)] = 'friend';
                if (typeof window.saveState === 'function') window.saveState();
                showToast(`🤝 ${targetName} добавлен в друзья!`);
                this._renderUI(document.getElementById('mHubSubContentBox') || document.getElementById('mSocialContentBox'));
                return;
            }

            showToast(`⏳ Отправка заявки...`);
            const res = await manager.sendRequest(targetUid, targetName);

            if (res && res.success) {
                this.friendshipStatuses[String(targetUid)] = res.autoAccepted ? 'friend' : 'pending_out';
                if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
                showToast(res.autoAccepted ? `✅ ${targetName} теперь ваш друг!` : `✅ Заявка отправлена ${targetName}!`);
            } else {
                if (window.AudioFx) window.AudioFx.play('error');
                showToast(`❌ ${res?.error || 'Ошибка отправки'}`);
            }
        } finally {
            setTimeout(() => this._processedFriendRequests.delete(targetUid), 1500);
        }

        const box = document.getElementById('mHubSubContentBox') || document.getElementById('mSocialContentBox');
        if (box) this._renderUI(box);
    },

    async cancelFriendRequest(targetUid) {
        if (!targetUid) return;
        if (!confirm("Отозвать заявку в друзья?")) return;

        const manager = window.FB_FriendshipsManager || window.FB_Friendships?.Friendships || window.FB_Bridge?.Friendships;

        try {
            if (manager?.removeFriend) {
                await manager.removeFriend(targetUid);
            }
            delete this.friendshipStatuses[String(targetUid)];
            showToast("Заявка отозвана");
            if (window.AudioFx) window.AudioFx.play('tick');
        } catch (e) {
            showToast("❌ Ошибка отмены заявки");
        }

        const box = document.getElementById('mHubSubContentBox') || document.getElementById('mSocialContentBox');
        if (box) this._renderUI(box);
    },

    async acceptFriendRequestFromLeaderboard(targetUid, targetName) {
        const manager = window.FB_FriendshipsManager || window.FB_Friendships?.Friendships || window.FB_Bridge?.Friendships;
        if (!targetUid || !manager?.acceptRequest) return;

        try {
            const res = await manager.acceptRequest(targetUid);
            if (res && res.success) {
                this.friendshipStatuses[String(targetUid)] = 'friend';
                if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
                showToast(`✅ ${targetName} теперь в друзьях!`);
            } else {
                showToast(`❌ ${res?.error || 'Ошибка'}`);
            }
        } catch (e) {
            console.warn('[MLeaderboard] acceptFriendRequest error:', e);
        }

        const box = document.getElementById('mHubSubContentBox') || document.getElementById('mSocialContentBox');
        if (box) this._renderUI(box);
    },

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

window.MLeaderboardModule = MLeaderboardModule;

console.log('[🏆 m-leaderboard v3.2.0] Связка со статусами дружбы + Quick Chat ✓');

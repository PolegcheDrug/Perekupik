// ========================================================
// js/m-hub/m-clubs.js — АВТОКЛУБЫ ПЕРЕКУПОВ & СИНДИКАТЫ (v2.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v2.1.0 (SPRINT 4 — ФИКС УСТАРЕВАНИЯ КЭША):
//   - КРИТИЧЕСКИЙ ФИКС: раньше _cachedClubs жил ВЕЧНО (кроме force=true).
//     После создания нового клуба через MClubsModule.submitCreateClub()
//     игрок не видел его в списке до перезагрузки страницы — потому что
//     fetchClubsList() возвращал старый кэш.
//
//     ТЕПЕРЬ:
//       • Кэш живёт 30 секунд (CACHE_TTL_MS = 30000)
//       • При событиях EventBus кэш инвалидируется МГНОВЕННО:
//           - clubs:created       (создан новый клуб)
//           - clubs:joined        (игрок вступил в клуб)
//           - clubs:left          (игрок вышел из клуба)
//           - clubs:bank_deposit  (взнос в общак)
//       • Публичный метод _invalidateCache() для ручного сброса
//       • _lastFetchTs для диагностики
//
//   - destroy() теперь очищает и кэш, и подписку
//
// ⭐ v2.0.0 (ИНТЕГРАЦИЯ REALTIMEMANAGER + EVENTBUS + MONEYMANAGER):
//   - RealtimeManager для подписки на clubs
//   - EventBus для публикации clubs:updated, clubs:joined, ...
//   - MoneyManager для взносов и наград
//   - SafeState для безопасного доступа к state.player
//   - destroy() для очистки подписки
//   - Защита от двойных кликов (_joinPending, _depositPending)
//   - Real-time обновление списка клубов
//
// ⭐ v1.0.0:
//   - Каталог стилей, общак, перки, синхронизация с Firestore
// ========================================================

const MClubsModule = {
    // Каталог доступных стилей и обложек автоклубов
    clubThemes: [
        {
            id: 'classic',
            name: 'Боевая Классика',
            icon: '👑',
            color: '#ffd700',
            bgGrad: 'linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(9, 14, 24, 0.95))',
            img: 'assets/cars/economy/2101/vaz-2101.jpg',
            defaultPerk: 'Бесплатный ремонт подвески на сходках и скидка -20% на запчасти'
        },
        {
            id: 'jdm',
            name: 'JDM Midnight Daikoku',
            icon: '🌸',
            color: '#f43f5e',
            bgGrad: 'linear-gradient(135deg, rgba(244, 63, 94, 0.25), rgba(9, 14, 24, 0.95))',
            img: 'assets/cars/comfort/golf6/golf6.jpg',
            defaultPerk: '+12% к рыночной оценке японских и турбированных авто'
        },
        {
            id: 'bavaria',
            name: 'Bavarian M-Power',
            icon: '⚡',
            color: '#38bdf8',
            bgGrad: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(9, 14, 24, 0.95))',
            img: 'assets/cars/comfort/golf6/golf6.jpg',
            defaultPerk: '+15% к шансу победы в дуэлях 402м и чип-тюнинг со скидкой'
        },
        {
            id: 'syndicate',
            name: 'Синдикат Олигархов',
            icon: '💼',
            color: '#00e676',
            bgGrad: 'linear-gradient(135deg, rgba(0, 230, 118, 0.25), rgba(9, 14, 24, 0.95))',
            img: 'assets/cars/premium/panamera/panamera.jpg',
            defaultPerk: '-30% ко всем штрафам ДПС и налогам, закрытые аукционы Порта'
        }
    ],

    // ⭐ v2.1.0: TTL кэша клубов
    _CACHE_TTL_MS: 30 * 1000,  // 30 секунд

    // ⭐ v2.0.0: real-time подписка
    _realtimeUnsubscribe: null,
    _cachedClubs: null,
    _lastFetchTs: 0,           // ⭐ v2.1.0: для диагностики

    // ⭐ v2.0.0: защита от двойных кликов
    _joinPending: false,
    _depositPending: false,
    _createPending: false,

    // ⭐ v2.1.0: обработчики EventBus для инвалидации кэша
    _eventUnsubscribers: [],

    // ====================================================
    // ⭐ v2.1.0: ИНВАЛИДАЦИЯ КЭША
    // ====================================================
    _invalidateCache(reason = 'manual') {
        if (this._cachedClubs) {
            console.log(`[MClubs] Кэш клубов сброшен (${reason})`);
        }
        this._cachedClubs = null;
        this._lastFetchTs = 0;
    },

    /**
     * ⭐ v2.1.0: подписка на события EventBus для инвалидации.
     * Вызывается один раз при первом fetch/onTabOpen.
     */
    _setupEventInvalidation() {
        if (this._eventUnsubscribers.length > 0) return;  // уже подписаны
        if (!window.EventBus) return;

        const self = this;
        const events = [
            'clubs:created',
            'clubs:joined',
            'clubs:left',
            'clubs:bank_deposit'
        ];

        events.forEach(evName => {
            const unsub = window.EventBus.on(evName, () => {
                self._invalidateCache(`event:${evName}`);
            });
            if (typeof unsub === 'function') {
                self._eventUnsubscribers.push(unsub);
            }
        });

        console.log('[MClubs] EventBus-инвалидация кэша активна (' + events.length + ' событий)');
    },

    // ====================================================
    // ЗАГРУЗКА СПИСКА КЛУБОВ
    // ⭐ v2.1.0: TTL 30с + EventBus-инвалидация
    // ====================================================
    async fetchClubsList(force = false) {
        // ⭐ v2.1.0: проверка TTL
        const now = Date.now();
        const cacheAge = now - this._lastFetchTs;
        const cacheValid = this._cachedClubs
            && this._cachedClubs.length > 0
            && cacheAge < this._CACHE_TTL_MS;

        if (!force && cacheValid) {
            return this._cachedClubs;
        }

        let clubs = [];

        // 1. Попытка загрузить из облака Firestore через шлюз FB_Bridge
        if (window.FB_Bridge?.Clubs?.fetchClubs) {
            try {
                const cloudList = await window.FB_Bridge.Clubs.fetchClubs(force);
                if (Array.isArray(cloudList) && cloudList.length > 0) {
                    clubs = cloudList.map(c => ({
                        id: c.club_id || c.id,
                        name: c.name || "Автоклуб",
                        themeId: c.themeId || 'classic',
                        motto: c.motto || "Торгуем бодро, рулим уверенно!",
                        ownerId: c.ownerId,
                        leaderName: c.leaderName || "Олигарх",
                        membersCount: c.membersCount || 1,
                        bank: c.bank || 0,
                        fee: c.fee || 35000,
                        minLvl: c.minLvl || 2,
                        perk: c.perk || "+10% к оценке авто клуба",
                        coverImg: c.coverImg || null
                    }));
                }
            } catch (e) {
                console.warn("[MClubs] Ошибка загрузки клубов из облака:", e);
            }
        }

        // 2. Если в базе пока нет записей — подгружаем базовые фракции
        if (clubs.length === 0) {
            clubs = [
                {
                    id: "club_vaz",
                    name: "Боевая Классика РФ",
                    themeId: 'classic',
                    motto: "«Заварка, выворот и газ в палас!»",
                    ownerId: "system_1",
                    leaderName: "Илюха DXF",
                    minLvl: 2,
                    membersCount: 32,
                    bank: 340000,
                    fee: 35000,
                    perk: "Бесплатный ремонт подвески на сходках и -20% на запчасти"
                },
                {
                    id: "club_jdm",
                    name: "JDM Legends Moscow",
                    themeId: 'jdm',
                    motto: "«Ночные прострелы и запах жжёной резины.»",
                    ownerId: "system_2",
                    leaderName: "Денис Daikoku",
                    minLvl: 4,
                    membersCount: 18,
                    bank: 620000,
                    fee: 80000,
                    perk: "+12% к рыночной оценке японских и турбированных авто"
                },
                {
                    id: "club_m",
                    name: "Bavarian Power M",
                    themeId: 'bavaria',
                    motto: "«Скорость, статус и немецкий инжиниринг.»",
                    ownerId: "system_3",
                    leaderName: "Артём E30",
                    minLvl: 7,
                    membersCount: 11,
                    bank: 1950000,
                    fee: 200000,
                    perk: "+15% к шансу победы в дуэлях 402м и чип-тюнинг со скидкой"
                },
                {
                    id: "club_syndicate",
                    name: "Синдикат Олигархов",
                    themeId: 'syndicate',
                    motto: "«Оптовые партии авто и закрытые аукционы Порта.»",
                    ownerId: "system_4",
                    leaderName: "Maga Syndicate",
                    minLvl: 12,
                    membersCount: 6,
                    bank: 8400000,
                    fee: 600000,
                    perk: "-30% ко всем штрафам ДПС и налогам, закрытые аукционы Порта"
                }
            ];
        }

        // ⭐ v2.1.0: обновляем кэш + метку времени
        this._cachedClubs = clubs;
        this._lastFetchTs = now;

        return clubs;
    },

    // ====================================================
    // REAL-TIME ПОДПИСКА
    // ====================================================
    _subscribeRealtime() {
        this._unsubscribeRealtime();
        this._setupEventInvalidation();  // ⭐ v2.1.0

        if (!window.RealtimeManager) {
            console.warn('[MClubs] RealtimeManager недоступен, работаем через fetch');
            return;
        }

        try {
            this._realtimeUnsubscribe = window.RealtimeManager.subscribe(
                'clubs',
                null,
                (clubs) => {
                    if (!Array.isArray(clubs)) return;

                    this._cachedClubs = clubs.map(c => ({
                        id: c.club_id || c.id,
                        name: c.name || "Автоклуб",
                        themeId: c.themeId || 'classic',
                        motto: c.motto || "Торгуем бодро, рулим уверенно!",
                        ownerId: c.ownerId,
                        leaderName: c.leaderName || "Олигарх",
                        membersCount: c.membersCount || 1,
                        bank: c.bank || 0,
                        fee: c.fee || 35000,
                        minLvl: c.minLvl || 2,
                        perk: c.perk || "+10% к оценке авто клуба",
                        coverImg: c.coverImg || null
                    }));

                    // ⭐ v2.1.0: real-time данные = самые свежие, обновляем метку
                    this._lastFetchTs = Date.now();

                    // Обновляем UI, если вкладка активна
                    if (window.AppM && window.AppM.activeTab === 'clubs') {
                        const box = document.getElementById('mHubSubContentBox');
                        if (box) this.renderScreen(box);
                    }
                }
            );

            console.log('[MClubs] Realtime подписка на clubs активна');
        } catch (e) {
            console.warn('[MClubs] subscribe error:', e);
        }
    },

    _unsubscribeRealtime() {
        if (this._realtimeUnsubscribe && typeof this._realtimeUnsubscribe === 'function') {
            try { this._realtimeUnsubscribe(); } catch (e) {}
            this._realtimeUnsubscribe = null;
        }
    },

    /**
     * Вызывается при уходе с вкладки.
     * ⭐ v2.1.0: очищаем и кэш, и подписку
     */
    destroy() {
        this._unsubscribeRealtime();

        // Отписываемся от EventBus
        this._eventUnsubscribers.forEach(unsub => {
            try { unsub(); } catch (e) {}
        });
        this._eventUnsubscribers = [];

        // Сбрасываем кэш
        this._invalidateCache('destroy');
    },

    /**
     * Публичный метод — вызвать при открытии вкладки.
     */
    onTabOpen() {
        this._subscribeRealtime();
    },

    // ====================================================
    // ГЛАВНЫЙ РЕНДЕР
    // ====================================================
    async renderScreen(container) {
        const target = container || document.getElementById('mHubSubContentBox');
        if (!target) return;

        const myClub = window.state?.player?.club;
        const myUid = String(window.state?.player?.uid || window.tgUserId || "me");
        const pLvl = window.state?.player?.level || 1;

        // Первая отрисовка с кэшем
        if (this._cachedClubs && this._cachedClubs.length > 0) {
            this._renderUI(target, this._cachedClubs, myClub, pLvl, myUid);
        } else {
            target.innerHTML = `
                <div class="glass-card text-center py-6" style="background:#090e18;">
                    <div class="radar-spinner-ring mb-2" style="margin:0 auto;"></div>
                    <div class="sub-label font-bold text-xs color-purple">Синхронизация автоклубов синдиката...</div>
                </div>
            `;
        }

        // Подгружаем данные
        const clubs = await this.fetchClubsList();
        this._subscribeRealtime();

        // Финальный рендер
        this._renderUI(target, clubs, myClub, pLvl, myUid);
    },

    _renderUI(target, clubs, myClub, pLvl, myUid) {
        let myClubCardHtml = "";
        if (myClub) {
            const activeClubData = clubs.find(c => c.id === myClub.id) || myClub;
            const theme = this.clubThemes.find(t => t.id === activeClubData.themeId) || this.clubThemes[0];
            const isOwner = String(activeClubData.ownerId) === myUid;

            myClubCardHtml = `
                <div class="glass-card mb-3 p-3 m-club-hero-card" style="border-color:${theme.color}; background:${theme.bgGrad};">
                    <div class="flex-between mb-2">
                        <span class="tag-badge bg-tag-green font-bold">ВАШ АВТОКЛУБ</span>
                        ${isOwner ? `<button onclick="MClubsModule.openCustomizeClubModal('${activeClubData.id}')" class="btn btn-dark btn-sm btn-auto" style="font-size:9px; padding:3px 8px;"><i class="fa-solid fa-paintbrush mr-1"></i> Настройки</button>` : ''}
                    </div>

                    <div class="flex-gap mb-2" style="align-items:center;">
                        <span style="font-size:28px;">${theme.icon}</span>
                        <div>
                            <h3 class="font-bold text-xs color-main" style="font-size:16px;">${activeClubData.name}</h3>
                            <div class="sub-label" style="font-size:9.5px; color:#f1f5f9; font-style:italic;">${activeClubData.motto || theme.name}</div>
                        </div>
                    </div>

                    <div class="grid-2 my-2" style="gap:6px;">
                        <div class="p-2 text-left" style="background:rgba(0,0,0,0.5); border-radius:8px;">
                            <span class="sub-label" style="font-size:8px;">Казна / Общак:</span>
                            <div class="price-val color-green font-bold" style="font-size:14px;">${Number(activeClubData.bank || 0).toLocaleString()} ₽</div>
                        </div>
                        <div class="p-2 text-left" style="background:rgba(0,0,0,0.5); border-radius:8px;">
                            <span class="sub-label" style="font-size:8px;">Состав:</span>
                            <div class="font-bold color-cyan" style="font-size:14px;">${activeClubData.membersCount || 1} участников</div>
                        </div>
                    </div>

                    <div class="p-2 mb-2 text-left" style="background:rgba(0,0,0,0.4); border-radius:8px; border-left:3px solid ${theme.color};">
                        <span class="sub-label" style="font-size:8px;">⭐ Активный клановый перк:</span>
                        <div class="text-xs color-main mt-1" style="font-size:10px; line-height:1.3;">${activeClubData.perk || theme.defaultPerk}</div>
                    </div>

                    <div class="grid-2" style="gap:6px;">
                        <button onclick="MClubsModule.depositToBankPrompt('${activeClubData.id}')" class="btn btn-green btn-sm font-bold" style="font-size:10px;">
                            <i class="fa-solid fa-coins mr-1"></i> Пополнить общак
                        </button>
                        <button onclick="MClubsModule.leaveClubAction()" class="btn btn-danger btn-sm" style="font-size:10px;">
                            Покинуть клуб
                        </button>
                    </div>
                </div>
            `;
        }

        let clubsListHtml = clubs.map(c => {
            const theme = this.clubThemes.find(t => t.id === c.themeId) || this.clubThemes[0];
            const isMember = myClub && (myClub.id === c.id);
            const isLocked = pLvl < (c.minLvl || 1);

            let actionBtn = "";
            if (isMember) {
                actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50 font-bold" disabled style="padding:5px 10px; font-size:9px;">Вы состоите ✓</button>`;
            } else if (isLocked) {
                actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled style="padding:5px 10px; font-size:9px;">🔒 С ${c.minLvl} ур.</button>`;
            } else {
                actionBtn = `<button onclick="MClubsModule.joinClubAction('${c.id}', '${c.name}', ${c.fee || 35000}, ${c.minLvl || 1})" class="btn btn-purple btn-sm btn-auto font-bold" style="padding:5px 10px; font-size:9.5px;">Вступить (${(c.fee / 1000).toFixed(0)}k ₽)</button>`;
            }

            return `
                <div class="glass-card mb-2 p-2 m-club-card" style="border-left: 3px solid ${theme.color}; background:#090e18;">
                    <div class="flex-between mb-1">
                        <div class="flex-gap" style="align-items:center;">
                            <span style="font-size:20px;">${theme.icon}</span>
                            <div>
                                <b class="text-xs color-cyan" style="font-size:12px;">${c.name}</b>
                                <div class="sub-label" style="font-size:8px; color:#94a3b8;">Лидер: <b class="color-amber">${c.leaderName}</b> • Участников: <b>${c.membersCount}</b></div>
                            </div>
                        </div>
                        <span class="tag-badge bg-tag-purple" style="font-size:8px;">${c.minLvl}+ УР</span>
                    </div>

                    <div class="sub-label my-1" style="font-size:9px; color:#cbd5e1; line-height:1.3;">
                        «${c.motto || theme.name}»
                    </div>

                    <div class="flex-between mt-2 pt-2" style="border-top:1px dashed rgba(255,255,255,0.06); align-items:center;">
                        <div>
                            <span class="sub-label" style="font-size:7.5px;">ОБЩАК:</span>
                            <b class="color-green text-xs" style="font-size:11.5px;">${Number(c.bank || 0).toLocaleString()} ₽</b>
                        </div>
                        ${actionBtn}
                    </div>
                </div>
            `;
        }).join('');

        target.innerHTML = `
            <!-- ВЕРХНЯЯ ШАПКА РАЗДЕЛА КЛУБОВ -->
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(192, 132, 252, 0.18), #090e18); border-color: var(--purple);">
                <div>
                    <div class="flex-gap" style="align-items:center;">
                        <span class="tag-badge bg-tag-purple font-bold">СИНДИКАТЫ</span>
                        <b class="text-xs color-purple" style="font-size:12px;"><i class="fa-solid fa-users mr-1"></i> Автоклубы Перекупов</b>
                    </div>
                    <div class="sub-label mt-1" style="font-size:8.5px;">Объединяйтесь, копите общак и активируйте клановые перки</div>
                </div>
                ${!myClub ? `<button onclick="MClubsModule.openCreateClubModal()" class="btn btn-purple btn-auto btn-sm font-bold" style="font-size:9px; padding:4px 8px;">+ Создать</button>` : ''}
            </div>

            <!-- КАРТОЧКА МОЕГО КЛУБА (ЕСЛИ СОСТОИТ) -->
            ${myClubCardHtml}

            <!-- СПИСОК ОТКРЫТЫХ АВТОКЛУБОВ -->
            <div class="sub-label mb-1" style="font-size:9px;">Открытые автоклубы синдиката:</div>
            <div class="space-y-1">
                ${clubsListHtml}
            </div>
        `;
    },

    // ====================================================
    // ВСТУПЛЕНИЕ В КЛУБ
    // ====================================================
    async joinClubAction(clubId, clubName, fee, minLvl) {
        if (this._joinPending) return;
        this._joinPending = true;

        try {
            const pLvl = window.state?.player?.level || 1;
            if (pLvl < minLvl) {
                if (typeof showToast === 'function') showToast(`Вступление доступно с ${minLvl} уровня!`);
                return;
            }

            if (window.state?.player?.club && String(window.state.player.club.id) === String(clubId)) {
                if (typeof showToast === 'function') showToast("Вы уже состоите в этом клубе!");
                return;
            }

            if (window.state?.player?.club) {
                if (typeof showToast === 'function') showToast(`Сначала покиньте текущий клуб «${window.state.player.club.name}»!`);
                return;
            }

            const cash = window.state?.player?.cash || 0;
            if (cash < fee) {
                if (typeof showToast === 'function') showToast(`Не хватает рублей на вступительный взнос (${fee.toLocaleString()} ₽)!`);
                return;
            }

            if (window.MoneyManager) {
                const ok = window.MoneyManager.spend(fee, `Вступление в клуб: ${clubName}`);
                if (!ok) {
                    if (typeof showToast === 'function') showToast("Не удалось списать взнос");
                    return;
                }
            } else {
                window.state.player.cash -= fee;
                if (typeof logBankTransaction === 'function') {
                    logBankTransaction(`Вступление в клуб: ${clubName}`, fee, false);
                }
            }

            window.state.player.club = { id: clubId, name: clubName };

            if (window.FB_Bridge?.Clubs?.joinClub) {
                try {
                    await window.FB_Bridge.Clubs.joinClub(clubId, window.FB_Bridge.getProfile());
                } catch (e) {
                    console.warn("[MClubs] Ошибка joinClub:", e);
                }
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();

            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            // ⭐ v2.1.0: событие инвалидирует кэш через EventBus
            if (window.EventBus) {
                window.EventBus.emit('clubs:joined', { clubId, clubName, fee });
            } else {
                // Fallback: если EventBus не загружен — сбрасываем вручную
                this._invalidateCache('clubs:joined-fallback');
            }

            if (typeof showToast === 'function') {
                showToast(`🎉 Вы вступили в автоклуб «${clubName}»!`);
            }

            const clubs = await this.fetchClubsList(true);
            this._renderUI(document.getElementById('mHubSubContentBox'), clubs, window.state.player.club, pLvl, String(window.state.player.uid || "me"));
        } finally {
            this._joinPending = false;
        }
    },

    // ====================================================
    // ВЫХОД ИЗ КЛУБА
    // ====================================================
    leaveClubAction() {
        if (!window.state?.player?.club) return;
        if (!confirm("Вы уверены, что хотите выйти из автоклуба? Внесенный взнос не возвращается.")) return;

        const clubId = window.state.player.club.id;
        const clubName = window.state.player.club.name;

        window.state.player.club = null;
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();

        if (window.AudioFx) window.AudioFx.play('tick');

        // ⭐ v2.1.0: событие инвалидирует кэш
        if (window.EventBus) {
            window.EventBus.emit('clubs:left', { clubId, clubName });
        } else {
            this._invalidateCache('clubs:left-fallback');
        }

        if (typeof showToast === 'function') showToast("Вы покинули состав автоклуба.");

        this.renderScreen();
    },

    // ====================================================
    // ВЗНОС В ОБЩАК
    // ====================================================
    async depositToBankPrompt(clubId) {
        if (this._depositPending) return;

        const amtStr = prompt("Сумма взноса в клановый общак (₽):", "50000");
        if (!amtStr) return;
        const amount = parseInt(amtStr, 10);

        if (isNaN(amount) || amount <= 0) {
            if (typeof showToast === 'function') showToast("Некорректная сумма!");
            return;
        }

        this._depositPending = true;
        try {
            const cash = window.state?.player?.cash || 0;
            if (cash < amount) {
                if (typeof showToast === 'function') showToast("Не хватает денег на балансе!");
                return;
            }

            if (window.MoneyManager) {
                const ok = window.MoneyManager.spend(amount, `Взнос в общак клуба`);
                if (!ok) return;
            } else {
                window.state.player.cash -= amount;
                if (typeof logBankTransaction === 'function') {
                    logBankTransaction("Взнос в общак клуба", amount, false);
                }
            }

            if (window.FB_Bridge?.Clubs?.depositToClubBank) {
                try {
                    await window.FB_Bridge.Clubs.depositToClubBank(clubId, amount);
                } catch (e) {
                    console.warn("[MClubs] Ошибка depositToClubBank:", e);
                }
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();

            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            // ⭐ v2.1.0: событие инвалидирует кэш (баланс клуба изменился)
            if (window.EventBus) {
                window.EventBus.emit('clubs:bank_deposit', { clubId, amount });
            } else {
                this._invalidateCache('clubs:bank_deposit-fallback');
            }

            if (typeof showToast === 'function') {
                showToast(`💰 В общак внесено +${amount.toLocaleString()} ₽! Респект автоклуба вырос.`);
            }

            const clubs = await this.fetchClubsList(true);
            this._renderUI(document.getElementById('mHubSubContentBox'), clubs, window.state.player.club, window.state.player.level || 1, String(window.state.player.uid || "me"));
        } finally {
            this._depositPending = false;
        }
    },

    // ====================================================
    // СОЗДАНИЕ КЛУБА
    // ====================================================
    openCreateClubModal() {
        let modal = document.getElementById('modalCreateClub');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalCreateClub';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        const themesOptions = this.clubThemes.map(t => `
            <option value="${t.id}">${t.icon} ${t.name}</option>
        `).join('');

        modal.innerHTML = `
            <div class="modal-box text-left" style="max-width:390px; background: radial-gradient(circle at 50% 0%, #151d2f 0%, #070a10 90%);">
                <div class="flex-between mb-2">
                    <div class="modal-glow-badge" style="color:var(--purple); border-color:var(--purple);"><i class="fa-solid fa-users mr-1"></i> РЕГИСТРАЦИЯ АВТОКЛУБА</div>
                    <button onclick="ModalManager.close('modalCreateClub')" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                <div class="mb-2">
                    <label class="sub-label block mb-1">Название автоклуба:</label>
                    <input type="text" id="newClubNameInput" class="input-dark w-full" placeholder="Например: Syndicate 77" maxlength="24" style="padding:8px; font-size:12px;">
                </div>

                <div class="mb-2">
                    <label class="sub-label block mb-1">Стиль и направление фракции:</label>
                    <select id="newClubThemeSelect" class="input-dark w-full" style="padding:8px; font-size:11px;">
                        ${themesOptions}
                    </select>
                </div>

                <div class="mb-3">
                    <label class="sub-label block mb-1">Девиз клуба:</label>
                    <input type="text" id="newClubMottoInput" class="input-dark w-full" placeholder="«Газ в пол, никаких уступок!»" maxlength="45" style="padding:8px; font-size:11px;">
                </div>

                <div class="p-2 mb-3 flex-between" style="background:#090e18; border-radius:8px;">
                    <span class="sub-label" style="font-size:9px;">Стоимость создания клуба:</span>
                    <b class="color-amber" style="font-size:12px;">250,000 ₽</b>
                </div>

                <button onclick="MClubsModule.submitCreateClub()" class="btn btn-purple w-full font-bold">
                    Зарегистрировать автоклуб ⚡
                </button>
            </div>
        `;

        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalCreateClub');
        } else {
            modal.classList.add('active');
        }
    },

    async submitCreateClub() {
        if (this._createPending) return;
        this._createPending = true;

        try {
            const name = document.getElementById('newClubNameInput')?.value.trim();
            const themeId = document.getElementById('newClubThemeSelect')?.value || 'classic';
            const motto = document.getElementById('newClubMottoInput')?.value.trim() || "Синдикат перекупов";

            if (!name || name.length < 3) {
                if (typeof showToast === 'function') showToast("Название клуба должно содержать не менее 3 символов!");
                return;
            }

            const cost = 250000;
            const cash = window.state?.player?.cash || 0;
            if (cash < cost) {
                if (typeof showToast === 'function') showToast(`Нужно ${cost.toLocaleString()} ₽ на оформление лицензии клуба!`);
                return;
            }

            if (window.MoneyManager) {
                const ok = window.MoneyManager.spend(cost, `Создание клуба: ${name}`);
                if (!ok) return;
            } else {
                window.state.player.cash -= cost;
                if (typeof logBankTransaction === 'function') {
                    logBankTransaction(`Создание клуба: ${name}`, cost, false);
                }
            }

            const clubId = "club_" + Date.now();
            const theme = this.clubThemes.find(t => t.id === themeId) || this.clubThemes[0];

            const newClubData = {
                id: clubId,
                club_id: clubId,
                name: name,
                themeId: themeId,
                motto: motto,
                ownerId: String(window.state?.player?.uid || window.tgUserId || "me"),
                leaderName: window.state?.player?.name || "Лидер",
                membersCount: 1,
                bank: 50000,
                fee: 50000,
                minLvl: 3,
                perk: theme.defaultPerk
            };

            window.state.player.club = newClubData;

            if (window.FB_Bridge?.Clubs?.createClub) {
                try {
                    await window.FB_Bridge.Clubs.createClub(name, window.FB_Bridge.getProfile(), 50000);
                } catch (e) {
                    console.warn("[MClubs] Ошибка создания клуба в базе:", e);
                }
            }

            if (typeof ModalManager !== 'undefined') {
                ModalManager.close('modalCreateClub');
            } else {
                const m = document.getElementById('modalCreateClub');
                if (m) m.classList.remove('active');
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();

            if (window.AudioFx) {
                window.AudioFx.play('win');
                window.AudioFx.haptic('success');
            }

            // ⭐ v2.1.0: событие инвалидирует кэш → новый клуб появится в списке
            if (window.EventBus) {
                window.EventBus.emit('clubs:created', { clubId, clubName: name, themeId });
            } else {
                this._invalidateCache('clubs:created-fallback');
            }

            if (typeof showToast === 'function') {
                showToast(`👑 Автоклуб «${name}» успешно основан!`);
            }

            this.renderScreen();
        } finally {
            this._createPending = false;
        }
    },

    // ====================================================
    // КАСТОМИЗАЦИЯ КЛУБА
    // ====================================================
    openCustomizeClubModal(clubId) {
        if (typeof showToast === 'function') showToast("Кастомизация герба и обложки сохранена ✓");
    }
};

// Экспорт
window.MClubsModule = MClubsModule;

console.log('[👥 m-clubs v2.1.0] TTL кэша 30с + EventBus-инвалидация (clubs:created/joined/left/deposit) + destroy() ✓');
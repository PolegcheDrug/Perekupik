// ========================================================
// js/m-hub/m-events.js — ХРОНИКА УЛИЦ, ОБЛАВЫ ДПС И ГОНКИ M+ (v2.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v2.0.0 (ИНТЕГРАЦИЯ НОВЫХ УТИЛИТ):
//   - RealtimeManager для real-time подписки на street_events
//   - EventBus для публикации events:list_updated, events:post_created
//   - MoneyManager.earn для награды за пост (+15000 ₽)
//   - SafeState для безопасного доступа к state
//   - Дедупликация реакций через Set
//   - destroy() для очистки подписки
//   - Кэш _cachedEvents для мгновенного рендера
//   - Форсированный fetchEvents при загрузке вкладки
// ========================================================

const MEventsModule = {
    activeCategory: 'all', // 'all' | 'dps' | 'racing' | 'deals' | 'port'
    _reactionsCooldown: new Set(),
    _realtimeUnsubscribe: null,
    _cachedEvents: null,
    _isLoading: false,

    // ====================================================
    // ВСТРОЕННЫЙ ГЕНЕРАТОР (fallback, если Firestore пустой)
    // ====================================================
    systemEventsPool: [
        {
            type: 'dps',
            badge: '🚨 ОБЛАВА 12.5.1',
            badgeClass: 'badge-police-strobe',
            author: "Экипаж ДПС #214",
            car: "Ford Focus II (ДПС)",
            text: "Внимание водителям! На выезде с проспекта Мира развернут спецбатальон технадзора. Проверяют прямоточные глушители, нештатный выворот и заварку редукторов. 4 корча уже погружены на эвакуаторы!",
            time: "3 мин назад",
            likes: { fire: 8, fear: 24, rip: 19 },
            commentsCount: 7
        },
        {
            type: 'racing',
            badge: '🏁 ДУЭЛЬ 402м',
            badgeClass: 'bg-tag-amber',
            author: "Maga_GTI",
            car: "VW Golf VI GTI (Stage 2)",
            text: "Вчера на ночной набережной хлопнул в отсечку заряженную Silvia S15 на куш 150,000 ₽! Зацеп на полусликах решил заезд на второй передаче 🔥",
            time: "14 мин назад",
            likes: { fire: 42, fear: 2, rip: 1 },
            commentsCount: 15
        },
        {
            type: 'dps',
            badge: '🚔 РЕЙД БЕЗ ОСАГО',
            badgeClass: 'bg-tag-red',
            author: "Пост МРЭО Север",
            car: "Патруль 77",
            text: "Массовая проверка камер Автоураган. За прошедшие сутки выписано 85 протоколов за управление авто без полиса ОСАГО. У водителей без ДКП машины перемещены на штрафстоянку.",
            time: "28 мин назад",
            likes: { fire: 3, fear: 18, rip: 11 },
            commentsCount: 9
        },
        {
            type: 'deals',
            badge: '💸 ЖИРНЫЙ КУШ',
            badgeClass: 'bg-tag-green',
            author: "Денис_Daikoku",
            car: "Toyota Mark II JZX90",
            text: "Забрал дедушкин стоковый Mark II из сухого гаража за копейки. Сделал полировку в круг, устранил течь сальника и отдал перекупу из соседнего региона с чистым наваром +280,000 ₽ на руки!",
            time: "42 мин назад",
            likes: { fire: 56, fear: 0, rip: 3 },
            commentsCount: 18
        },
        {
            type: 'port',
            badge: '🚢 ДРОП ИЗ ПОРТА',
            badgeClass: 'bg-tag-cyan',
            author: "Синдикат_VIP",
            car: "Porsche 911 Turbo (997)",
            text: "Таможенный брокер подтвердил выдачу опечатанного контейнера из порта Гамбурга. После вскрытия пломбы обнаружен живой немецкий спорткар с пробегом 48,000 км в идеале!",
            time: "1 час назад",
            likes: { fire: 67, fear: 4, rip: 0 },
            commentsCount: 22
        }
    ],

    // ====================================================
    // ИНИЦИАЛИЗАЦИЯ
    // ====================================================
    init() {
        if (!window.state) return;

        if (!Array.isArray(window.state.mEventsFeed)) {
            window.state.mEventsFeed = [];
        }

        // Если лента пуста — инициализируем стартовыми событиями
        if (window.state.mEventsFeed.length === 0) {
            window.state.mEventsFeed = JSON.parse(JSON.stringify(this.systemEventsPool));
        }
    },

    // ====================================================
    // ПОДПИСКА НА REAL-TIME
    // ====================================================
    _subscribeRealtime() {
        // Отписываемся от предыдущей подписки
        this._unsubscribeRealtime();

        if (!window.RealtimeManager) {
            console.warn('[MEvents] RealtimeManager недоступен, работаем через кэш');
            return;
        }

        try {
            this._realtimeUnsubscribe = window.RealtimeManager.subscribe(
                'events',
                null,
                (events) => {
                    if (!Array.isArray(events)) return;
                    this._cachedEvents = events;
                    window.state.mEventsFeed = events;

                    // Обновляем UI, если вкладка активна
                    if (window.AppM && window.AppM.activeTab === 'events') {
                        const box = document.getElementById('mHubSubContentBox');
                        if (box) this.renderScreen(box);
                    }
                }
            );

            console.log('[MEvents] Realtime подписка на street_events активна');
        } catch (e) {
            console.warn('[MEvents] Realtime subscribe error:', e);
        }
    },

    _unsubscribeRealtime() {
        if (this._realtimeUnsubscribe && typeof this._realtimeUnsubscribe === 'function') {
            try { this._realtimeUnsubscribe(); } catch (e) {}
            this._realtimeUnsubscribe = null;
        }
    },

    /**
     * Вызывается при уходе с вкладки — очистка подписки.
     */
    destroy() {
        this._unsubscribeRealtime();
    },

    /**
     * Публичный метод — вызвать при открытии вкладки.
     */
    onTabOpen() {
        this.init();
        this._subscribeRealtime();
        // Форсированный fetch — если Firestore доступен
        this._fetchEventsForce();
    },

    async _fetchEventsForce() {
        if (this._isLoading) return;
        if (!window.FB_Bridge?.Events?.fetchEvents) return;

        this._isLoading = true;
        try {
            const events = await window.FB_Bridge.Events.fetchEvents(35);
            if (Array.isArray(events) && events.length > 0) {
                this._cachedEvents = events;
                window.state.mEventsFeed = events;
            }
        } catch (e) {
            console.warn('[MEvents] fetchEvents error:', e);
        } finally {
            this._isLoading = false;
        }
    },

    // ====================================================
    // СОЗДАНИЕ СОБЫТИЯ
    // ====================================================
    pushEvent(eventData) {
        if (!window.state) return;
        if (!Array.isArray(window.state.mEventsFeed)) {
            window.state.mEventsFeed = [];
        }

        const newEv = Object.assign({
            id: "m_ev_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
            type: eventData.type || 'deals',
            badge: eventData.badge || '⚡ СОБЫТИЕ',
            badgeClass: eventData.badgeClass || 'bg-tag-cyan',
            author: eventData.author || (window.state.player?.name || "Перекуп"),
            car: eventData.car || "Личный транспорт",
            text: eventData.text || "Произошло дорожное происшествие.",
            time: "Только что",
            likes: { fire: 1, fear: 0, rip: 0 },
            commentsCount: 0
        }, eventData);

        window.state.mEventsFeed.unshift(newEv);

        // Ограничиваем историю ленты 35 записями
        if (window.state.mEventsFeed.length > 35) {
            window.state.mEventsFeed = window.state.mEventsFeed.slice(0, 35);
        }

        if (typeof window.saveState === 'function') window.saveState();

        // Публикуем событие
        if (window.EventBus) {
            window.EventBus.emit('events:post_created', { eventId: newEv.id, type: newEv.type });
            window.EventBus.emit('events:list_updated', { count: window.state.mEventsFeed.length });
        }

        // Обновляем UI, если вкладка активна
        if (window.AppM && window.AppM.activeTab === 'events') {
            const box = document.getElementById('mHubSubContentBox');
            if (box) this.renderScreen(box);
        }
    },

    // ====================================================
    // ФИЛЬТРЫ И РЕАКЦИИ
    // ====================================================
    setFilter(cat) {
        this.activeCategory = cat;
        if (window.AudioFx) window.AudioFx.play('tick');

        if (window.EventBus) {
            window.EventBus.emit('events:filter_changed', { category: cat });
        }

        this.renderScreen();
    },

    toggleReaction(eventId, reactionType) {
        if (!window.state?.mEventsFeed) return;

        const ev = window.state.mEventsFeed.find(e => e.id === eventId);
        if (!ev) return;

        const key = `${eventId}_${reactionType}`;
        if (this._reactionsCooldown.has(key)) {
            if (typeof showToast === 'function') showToast("Вы уже отреагировали на эту новость!");
            return;
        }

        this._reactionsCooldown.add(key);

        if (!ev.likes) ev.likes = { fire: 0, fear: 0, rip: 0 };
        ev.likes[reactionType] = (ev.likes[reactionType] || 0) + 1;

        if (window.AudioFx) {
            window.AudioFx.play('win');
            window.AudioFx.haptic('light');
        }

        if (typeof window.saveState === 'function') window.saveState();

        // Синхронизация с Firestore (опционально, не блокируем UI)
        if (window.FB_Bridge?.Events?.toggleReaction && !String(eventId).startsWith('m_ev_')) {
            try {
                window.FB_Bridge.Events.toggleReaction(eventId, reactionType);
            } catch (e) {
                console.warn('[MEvents] toggleReaction error:', e);
            }
        }

        this.renderScreen();
    },

    // ====================================================
    // СОЗДАНИЕ ПОСТА
    // ====================================================
    openCreatePostModal() {
        let modal = document.getElementById('modalCreateStreetPost');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalCreateStreetPost';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        const myCar = window.state?.garage?.[0]?.name || "Автомобиль перекупа";

        modal.innerHTML = `
            <div class="modal-box text-left" style="max-width: 390px; background: radial-gradient(circle at 50% 0%, #151d2f 0%, #070a10 90%);">
                <div class="flex-between mb-2">
                    <div class="modal-glow-badge"><i class="fa-solid fa-bullhorn mr-1"></i> ИНСАЙД В ХРОНИКУ M+</div>
                    <button onclick="ModalManager.close('modalCreateStreetPost')" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                <div class="mb-2">
                    <label class="sub-label block mb-1">Категория события:</label>
                    <select id="postEventTypeSelect" class="input-dark w-full" style="padding:8px; font-size:11px;">
                        <option value="dps">🚨 Предупреждение об облаве ДПС / 12.5.1</option>
                        <option value="racing">🏎️ Заезд на 402м / Стритрейсинг</option>
                        <option value="deals">💸 Удачная перепродажа / Торг у капота</option>
                    </select>
                </div>

                <div class="mb-2">
                    <label class="sub-label block mb-1">Ваш автомобиль:</label>
                    <input type="text" id="postEventCarInput" class="input-dark w-full" value="${myCar}" style="padding:8px; font-size:11px;">
                </div>

                <div class="mb-3">
                    <label class="sub-label block mb-1">Текст сообщения:</label>
                    <textarea id="postEventTextInput" class="input-dark w-full" rows="3" maxlength="180" placeholder="Опишите ситуацию на дороге или условия вашей сделки..." style="padding:8px; font-size:11px; resize:none;"></textarea>
                </div>

                <button onclick="MEventsModule.submitCreatePost()" class="btn btn-cyan w-full font-bold">
                    Опубликовать новость в ленту 📢
                </button>
            </div>
        `;

        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalCreateStreetPost');
        } else {
            modal.classList.add('active');
        }
    },

    submitCreatePost() {
        const type = document.getElementById('postEventTypeSelect')?.value || 'deals';
        const car = document.getElementById('postEventCarInput')?.value.trim() || 'Транспорт';
        const text = document.getElementById('postEventTextInput')?.value.trim();

        if (!text || text.length < 6) {
            if (typeof showToast === 'function') showToast("Текст новости должен содержать не менее 6 символов!");
            return;
        }

        let badge = '⚡ ИНСАЙД';
        let badgeClass = 'bg-tag-cyan';

        if (type === 'dps') {
            badge = '🚨 РАДАР ДПС';
            badgeClass = 'badge-police-strobe';
        } else if (type === 'racing') {
            badge = '🏁 ЗАЕЗД 402м';
            badgeClass = 'bg-tag-amber';
        } else if (type === 'deals') {
            badge = '💸 СДЕЛКА У КАПОТА';
            badgeClass = 'bg-tag-green';
        }

        this.pushEvent({
            type,
            badge,
            badgeClass,
            author: window.state?.player?.name || "Перекуп #777",
            car,
            text,
            time: "Только что"
        });

        // Синхронизация с Firestore (не блокируем)
        if (window.FB_Bridge?.Events?.pushEvent) {
            try {
                window.FB_Bridge.Events.pushEvent({
                    type,
                    badge,
                    badgeClass,
                    author: window.state?.player?.name || "Перекуп #777",
                    car,
                    text
                });
            } catch (e) {
                console.warn('[MEvents] pushEvent error:', e);
            }
        }

        // Награда за активность через MoneyManager (если доступен)
        if (window.MoneyManager) {
            try {
                const todayPosts = window.state?.player?._mEventsPostsToday || 0;
                if (todayPosts < 3) {
                    window.MoneyManager.earn(15000, 'Инсайд в Хронику улиц', { silent: false });
                    if (!window.state.player._mEventsPostsToday) window.state.player._mEventsPostsToday = 0;
                    window.state.player._mEventsPostsToday += 1;
                } else {
                    if (typeof showToast === 'function') showToast("Инсайд опубликован (дневной лимит награды исчерпан)");
                }
            } catch (e) {
                console.warn('[MEvents] MoneyManager.earn error:', e);
            }
        } else {
            // Fallback
            if (window.state?.player) {
                window.state.player.cash = (window.state.player.cash || 0) + 15000;
                if (typeof logBankTransaction === 'function') {
                    logBankTransaction("Инсайд в Хронику улиц", 15000, true);
                }
            }
        }

        if (typeof ModalManager !== 'undefined') {
            ModalManager.close('modalCreateStreetPost');
        } else {
            const m = document.getElementById('modalCreateStreetPost');
            if (m) m.classList.remove('active');
        }

        if (window.AudioFx) {
            window.AudioFx.play('win');
            window.AudioFx.haptic('success');
        }

        if (typeof showToast === 'function') showToast("Новость опубликована! +15,000 ₽ за инсайд");
        this.renderScreen();
    },

    // ====================================================
    // ГЛАВНЫЙ РЕНДЕР
    // ====================================================
    renderScreen(container) {
        const target = container || document.getElementById('mHubSubContentBox');
        if (!target) return;

        this.init();

        const feed = (this._cachedEvents && this._cachedEvents.length > 0)
            ? this._cachedEvents
            : (window.state?.mEventsFeed || []);

        const cat = this.activeCategory;

        const filtered = feed.filter(ev => {
            if (cat === 'all') return true;
            return ev.type === cat;
        });

        let eventsHtml = "";

        if (filtered.length === 0) {
            eventsHtml = `
                <div class="glass-card text-center py-6" style="background:#090e18;">
                    <i class="fa-solid fa-radar color-cyan mb-2" style="font-size:28px;"></i>
                    <div class="font-bold text-xs color-cyan">В этой категории пока тихо</div>
                    <div class="sub-label mt-1" style="font-size:9px;">Нажмите кнопку «+ Инсайд», чтобы добавить первое дорожное событие!</div>
                </div>
            `;
        } else {
            eventsHtml = filtered.map(ev => {
                const evId = ev.id || ("ev_" + Math.random().toString(36).substring(2, 6));
                const likes = ev.likes || { fire: 0, fear: 0, rip: 0 };

                let iconType = "fa-bolt";
                if (ev.type === 'dps') iconType = "fa-shield-halved color-red";
                else if (ev.type === 'racing') iconType = "fa-flag-checkered color-amber";
                else if (ev.type === 'deals') iconType = "fa-handshake color-green";
                else if (ev.type === 'port') iconType = "fa-ship color-cyan";

                return `
                    <div class="glass-card mb-2 p-2 m-event-card" style="background:#090e18; border-left: 3px solid ${ev.type === 'dps' ? 'var(--red)' : (ev.type === 'deals' ? 'var(--green)' : 'var(--cyan)')};">
                        <div class="flex-between mb-1">
                            <div class="flex-gap" style="align-items:center;">
                                <i class="fa-solid ${iconType}" style="font-size:13px;"></i>
                                <b class="text-xs color-cyan" style="font-size:11.5px;">${ev.author}</b>
                                <span class="sub-label" style="font-size:8.5px; color:#94a3b8;">(${ev.car})</span>
                            </div>
                            <span class="tag-badge ${ev.badgeClass || 'bg-tag-cyan'}" style="font-size:7.5px;">${ev.badge}</span>
                        </div>

                        <div class="sub-label my-1" style="font-size:9.5px; color:#f1f5f9; line-height:1.4;">
                            ${ev.text}
                        </div>

                        <div class="flex-between mt-2 pt-1" style="border-top:1px dashed rgba(255,255,255,0.06);">
                            <span class="sub-label" style="font-size:8px; color:#64748b;">
                                <i class="fa-regular fa-clock mr-1"></i>${ev.time || 'Недавно'}
                            </span>

                            <div class="flex-gap" style="gap:4px;">
                                <button onclick="MEventsModule.toggleReaction('${evId}', 'fire')" class="btn btn-dark btn-sm btn-auto m-reaction-chip" title="Огонь">
                                    🔥 <span>${likes.fire || 0}</span>
                                </button>
                                <button onclick="MEventsModule.toggleReaction('${evId}', 'fear')" class="btn btn-dark btn-sm btn-auto m-reaction-chip" title="Шок">
                                    😱 <span>${likes.fear || 0}</span>
                                </button>
                                <button onclick="MEventsModule.toggleReaction('${evId}', 'rip')" class="btn btn-dark btn-sm btn-auto m-reaction-chip" title="Минус тачка">
                                    💀 <span>${likes.rip || 0}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        target.innerHTML = `
            <!-- ШАПКА ХРОНИКИ С КНОПКОЙ ДОБАВЛЕНИЯ -->
            <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(255, 51, 102, 0.16), #090e18); border-color: rgba(255, 51, 102, 0.35);">
                <div>
                    <div class="flex-gap" style="align-items:center;">
                        <span class="tag-badge badge-police-strobe">LIVE</span>
                        <b class="text-xs color-red" style="font-size:12px;"><i class="fa-solid fa-tower-broadcast mr-1"></i> Хроника Улиц & ДПС</b>
                    </div>
                    <div class="sub-label mt-1" style="font-size:8.5px;">Оперативная сводка облав, заездов на 402м и маржинальных сделок</div>
                </div>
                <button onclick="MEventsModule.openCreatePostModal()" class="btn btn-cyan btn-auto btn-sm font-bold" style="font-size:9px; padding:4px 8px;">
                    + Инсайд
                </button>
            </div>

            <!-- ФИЛЬТРЫ ХРОНИКИ -->
            <div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 4px;">
                <button onclick="MEventsModule.setFilter('all')" class="btn ${cat === 'all' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 0;">Все</button>
                <button onclick="MEventsModule.setFilter('dps')" class="btn ${cat === 'dps' ? 'btn-red' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 0;">🚨 ДПС / 12.5.1</button>
                <button onclick="MEventsModule.setFilter('racing')" class="btn ${cat === 'racing' ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 0;">🏁 Гонки</button>
                <button onclick="MEventsModule.setFilter('deals')" class="btn ${cat === 'deals' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:4px 0;">💸 Сделки</button>
            </div>

            <!-- СПИСОК КАРТОЧЕК СОБЫТИЙ -->
            <div class="space-y-1">
                ${eventsHtml}
            </div>
        `;
    }
};

// Экспорт
window.MEventsModule = MEventsModule;

console.log('[📡 m-events v2.0.0] RealtimeManager + EventBus + MoneyManager интеграция ✓');
// ========================================================
// js/life.js — РАЗДЕЛ «ЖИЗНЬ ПЕРЕКУПА», ТОНУС И СОЦИУМ (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.0.0 (CLEAN LIFE & SOCIAL INTEGRATION):
//   - Полная интеграция Социума, Хроники ДПС (ст. 12.5.1), Гонок и Топа игроков из Приложения М.
//   - 3 удобных подраздела: «Тонус & Быт», «Улица & ДПС», «Социум & Топ».
//   - Интерактивная лента инсайдов, реакции на облавы, рейтинг перекупов и автоклубы.
//   - Сохранены все механики рациона, активностей, бани, спортзала и кармы.
// ========================================================

let lifeActiveTab = 'tone'; // 'tone' | 'street' | 'social'
let lifeActiveFoodCategory = 'all';
let lifeStreetFilter = 'all'; // 'all' | 'dps' | 'racing' | 'deals'

// Базовый каталог рационов питания
const DEFAULT_LIFE_DIETS = [
    { id: 'doshirak', name: 'Лапша быстрого приготовления', category: 'fast', cost: 180, hunger: 25, mood: -2, desc: 'Кипяток из гаражного чайника. Дёшево, сердито, спасает при нулевом бюджете.' },
    { id: 'shaurma', name: 'Шаурма на автовокзале', category: 'fast', cost: 380, hunger: 45, mood: 5, desc: 'Классика перекупского ремесла. Сытно, быстро, можно есть прямо за рулём на перегоне.' },
    { id: 'stolovaya', name: 'Комплексный обед в рабочей столовой', category: 'home', cost: 750, hunger: 65, mood: 12, desc: 'Борщ, пюре с котлетой и компот. Отличный заряд энергии перед долгим осмотром кузовов.' },
    { id: 'home_food', name: 'Домашний ужин с мясом', category: 'home', cost: 1400, hunger: 85, mood: 20, desc: 'Полноценная домашняя еда. Полностью восстанавливает силы и снимает усталость от поездок.' },
    { id: 'grill_bar', name: 'Бургеры и гриль в автокафе', category: 'fast', cost: 2200, hunger: 75, mood: 25, desc: 'Сочный бургер из мраморной говядины и кофе. Любимое место сходок местных автоклубов.' },
    { id: 'steak_house', name: 'Ужин в стейк-хаусе', category: 'restaurant', cost: 6500, hunger: 95, mood: 40, desc: 'Рибай медиум-прожарки. Статусный ужин успешного перекупа после закрытия крупной сделки.' },
    { id: 'vip_restaurant', name: 'VIP Ресторан на набережной', category: 'restaurant', cost: 18000, hunger: 100, mood: 60, desc: 'Изысканные деликатесы и премиум обслуживание. Максимальный кураж и уверенность у капота.' }
];

// Каталог активностей для снятия стресса и прокачки настроения
const DEFAULT_LIFE_ACTIVITIES = [
    { id: 'garage_tea', name: 'Чай у гаражной печки', cost: 0, mood: 10, karma: 1, desc: 'Посидеть в тишине с кружкой горячего чая, послушать треск дров и спланировать завтрашние лоты.' },
    { id: 'gym', name: 'Тренировка в спортзале', cost: 1500, mood: 20, karma: 2, desc: 'Базовые упражнения с железом. Разгоняет кровь, держит тело в тонусе и проясняет мысли.' },
    { id: 'banya', name: 'Русская баня на дровах с веником', cost: 6000, mood: 40, karma: 3, desc: 'Берёзовый пар, ледяная купель и полный релакс. Смывает любой негатив после сложных клиентов.' },
    { id: 'karting', name: 'Заезд на прокатном картинге', cost: 8500, mood: 35, karma: 1, desc: '10 минут чистого адреналина на треке. Отличная тренировка реакции и спортивного азарта.' },
    { id: 'drift_track', name: 'Трек-день на дрифт-полигоне', cost: 25000, mood: 65, karma: 2, desc: 'Сжечь пару баллонов в управляемом заносе на боевом болиде. Чистый кайф и уважение тусовки.' },
    { id: 'spa_resort', name: 'Премиальный загородный СПА', cost: 75000, mood: 100, karma: 5, desc: 'Бассейн с подогревом, массаж и полный день восстановления без звонков с авторынка.' }
];

// Базовая хроника городских событий и облав ДПС
const DEFAULT_STREET_EVENTS = [
    {
        id: 'ev_dps_1',
        type: 'dps',
        author: 'Экипаж ДПС #214 (Ford Focus II)',
        badge: 'ОБЛАВА 12.5.1',
        badgeColor: 'var(--red)',
        text: 'Внимание водителям! На выезде с проспекта Мира развернут спецбатальон технадзора. Проверяют прямоточные глушители, нештатный выворот и заварку редукторов. 4 корча уже погружены на эвакуаторы!',
        timeAgo: '3 мин назад',
        reactions: { fire: 8, fear: 24, skull: 19 }
    },
    {
        id: 'ev_race_1',
        type: 'racing',
        author: 'Maga_GTI (VW Golf VI GTI Stage 2)',
        badge: 'ДУЭЛЬ 402М',
        badgeColor: 'var(--amber)',
        text: 'Кто смелый сегодня в полночь на объездной? Залита сотая прошивка под лаунч, ставка 100,000 ₽ на капот. Ищу живой Chaser Tourer V или Audi S3.',
        timeAgo: '12 мин назад',
        reactions: { fire: 31, fear: 2, skull: 5 }
    },
    {
        id: 'ev_deal_1',
        type: 'deals',
        author: 'Семён_Подбор (Автоэксперт)',
        badge: 'СДЕЛКА ВЕКА',
        badgeColor: 'var(--green)',
        text: 'В соседнем дворе у дедушки забрали гаражный ВАЗ-2101 1978 года в родной краске с пробегом 18,000 км за 75k! На авторынке уже готовы оторвать с руками за 450k.',
        timeAgo: '35 мин назад',
        reactions: { fire: 45, fear: 1, skull: 0 }
    }
];

function renderLifeScreen() {
    const tab = document.getElementById('tabLife');
    if (!tab) return;

    let hunger = state.player?.hunger !== undefined ? state.player.hunger : 80;
    let mood = state.player?.mood !== undefined ? state.player.mood : 85;
    let karma = state.player?.karma !== undefined ? state.player.karma : 50;

    let toneStatusText = "В норме";
    let toneStatusClass = "bg-tag-green";
    if (hunger < 35 || mood < 35) {
        toneStatusText = "Упадок сил ⚠️";
        toneStatusClass = "bg-tag-red";
    } else if (hunger > 75 && mood > 75) {
        toneStatusText = "На пике 🔥";
        toneStatusClass = "bg-tag-cyan";
    }

    tab.innerHTML = `
        <style>
            .life-nav-tabs {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 6px;
                background: rgba(15, 23, 42, 0.7);
                padding: 4px;
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                margin-bottom: 12px;
            }
            .life-tab-btn {
                background: transparent;
                border: none;
                color: #94a3b8;
                font-size: 10.5px;
                font-weight: 800;
                padding: 8px 4px;
                border-radius: 9px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                transition: all 0.2s ease;
            }
            .life-tab-btn.active {
                background: linear-gradient(135deg, rgba(0, 230, 118, 0.2), rgba(0, 242, 254, 0.15));
                color: #00e676;
                border: 1px solid rgba(0, 230, 118, 0.4);
                box-shadow: 0 0 10px rgba(0, 230, 118, 0.2);
            }
            .life-reaction-btn {
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 6px;
                color: #cbd5e1;
                font-size: 10px;
                padding: 3px 7px;
                cursor: pointer;
                transition: all 0.15s ease;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .life-reaction-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: scale(1.05);
            }
            .life-reaction-btn:active {
                transform: scale(0.95);
            }
        </style>

        <!-- ВЕРХНИЙ ДАШБОРД САМОЧУВСТВИЯ ПЕРЕКУПА -->
        <div class="glass-card mb-3 p-3" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.12), #090e18); border-color: rgba(0, 230, 118, 0.35);">
            <div class="flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <div class="chat-avatar-circle" style="font-size:20px; background:#0e1e24; border:1.5px solid var(--green);">☕</div>
                    <div>
                        <h3 class="font-bold text-xs color-green" style="font-size:14px;">Жизнь & Улица</h3>
                        <div class="sub-label" style="font-size:9.5px;">Тонус, радар ДПС, автоклубы и рейтинг в городе</div>
                    </div>
                </div>
                <span class="tag-badge ${toneStatusClass}">${toneStatusText}</span>
            </div>

            <!-- Шкалы голода и настроения -->
            <div class="space-y-2 my-2">
                <div>
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label"><i class="fa-solid fa-drumstick-bite color-amber mr-1"></i> Сытость желудка:</span>
                        <b class="${hunger < 40 ? 'color-red' : 'color-green'}">${hunger}%</b>
                    </div>
                    <div class="rp-bar-bg" style="height:7px;">
                        <div class="rp-bar-fill fill-hunger" style="width:${hunger}%;"></div>
                    </div>
                </div>

                <div>
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label"><i class="fa-solid fa-masks-theater color-cyan mr-1"></i> Кураж и Настроение:</span>
                        <b class="${mood < 40 ? 'color-red' : 'color-cyan'}">${mood}%</b>
                    </div>
                    <div class="rp-bar-bg" style="height:7px;">
                        <div class="rp-bar-fill fill-mood" style="width:${mood}%;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- НАВИГАЦИОННЫЙ ТАБ-БАР ЖИЗНИ -->
        <div class="life-nav-tabs">
            <button onclick="switchLifeTab('tone')" class="life-tab-btn ${lifeActiveTab === 'tone' ? 'active' : ''}">
                <i class="fa-solid fa-mug-hot"></i> Тонус & Быт
            </button>
            <button onclick="switchLifeTab('street')" class="life-tab-btn ${lifeActiveTab === 'street' ? 'active' : ''}">
                <i class="fa-solid fa-shield-halved"></i> Улица & ДПС
            </button>
            <button onclick="switchLifeTab('social')" class="life-tab-btn ${lifeActiveTab === 'social' ? 'active' : ''}">
                <i class="fa-solid fa-users"></i> Социум & Топ
            </button>
        </div>

        <!-- ОСНОВНОЙ КОНТЕНТНЫЙ БОКС -->
        <div id="lifeMainContentContainer"></div>
    `;

    renderCurrentLifeSubTab();
}

function switchLifeTab(tabKey) {
    lifeActiveTab = tabKey;
    playSound('tick');
    tgHaptic('light');
    renderCurrentLifeSubTab();

    // Обновляем подсветку кнопок табов
    document.querySelectorAll('.life-tab-btn').forEach(btn => btn.classList.remove('active'));
    event?.currentTarget?.classList.add('active');
}

function renderCurrentLifeSubTab() {
    const container = document.getElementById('lifeMainContentContainer');
    if (!container) return;

    if (lifeActiveTab === 'tone') {
        renderToneAndFoodSubTab(container);
    } else if (lifeActiveTab === 'street') {
        renderStreetRadarSubTab(container);
    } else if (lifeActiveTab === 'social') {
        renderSocialAndClubsSubTab(container);
    }
}

// ========================================================
// 1. ПОДРАЗДЕЛ: ТОНУС, РАЦИОН И АКТИВНОСТИ
// ========================================================
function renderToneAndFoodSubTab(container) {
    let curDietId = state.player?.diet || 'shaurma';
    let karma = state.player?.karma !== undefined ? state.player.karma : 50;

    const diets = (typeof DIETS !== 'undefined' && Array.isArray(DIETS) && DIETS.length > 0) ? DIETS : DEFAULT_LIFE_DIETS;
    let dietObj = diets.find(d => d.id === curDietId);
    let dietTitle = dietObj ? dietObj.name : 'Шаурма на автовокзале';

    container.innerHTML = `
        <!-- АКТИВНОСТИ ПЕРЕКУПА -->
        <div class="glass-card mb-3 p-3">
            <div class="flex-between mb-2">
                <b class="text-xs color-cyan" style="font-size:12.5px;"><i class="fa-solid fa-dumbbell mr-1"></i> Активности и Отдых</b>
                <span class="tag-badge bg-tag-cyan">Разгрузка</span>
            </div>
            <div class="sub-label mb-2" style="font-size:9.5px;">Снимают стресс после жесткого торга, поднимают кураж и карму.</div>
            <div class="space-y-2" id="lifeActivitiesList"></div>
        </div>

        <!-- КАРМА И БЛАГОТВОРИТЕЛЬНОСТЬ -->
        <div class="glass-card mb-3 p-3">
            <div class="flex-between mb-2">
                <b class="text-xs color-green" style="font-size:12.5px;"><i class="fa-solid fa-handshake-angle mr-1"></i> Карма и Репутация</b>
                <span class="tag-badge bg-tag-green">Карма: ${karma}%</span>
            </div>
            <p class="sub-label mb-2" style="font-size:9.5px;">Высокая карма ускоряет появление щедрых клиентов и защищает от наездов ДПС.</p>
            
            <div class="grid-2 mb-2">
                <button onclick="roadAssistanceAction()" class="btn btn-dark btn-sm" style="font-size:9px;">
                    🛞 Помощь на трассе (-10 ⛽)
                </button>
                <button onclick="donatePartsToMechanic()" class="btn btn-dark btn-sm" style="font-size:9px;">
                    🔩 СТО (+1 🤝 Связь)
                </button>
            </div>
            <button onclick="bigCharityDonate()" class="btn btn-green w-full" style="font-size:10.5px; padding:8px 0;">
                🕊 Меценатство 150,000 ₽ (+25 Кармы)
            </button>
        </div>

        <!-- КАТАЛОГ РАЦИОНА ПИТАНИЯ -->
        <div class="glass-card mb-3 p-3" id="lifeFoodSectionAnchor">
            <div class="flex-between mb-2">
                <div>
                    <b class="text-xs color-amber" style="font-size:12.5px;"><i class="fa-solid fa-utensils mr-1"></i> Рацион и Доставка Еды</b>
                    <div class="sub-label" style="font-size:9px;">Базовый: <b class="color-amber">${dietTitle}</b> (списание в полночь)</div>
                </div>
            </div>

            <!-- Фильтры по типу еды -->
            <div class="grid-4 mb-2">
                <button onclick="filterLifeFood('all')" class="btn ${lifeActiveFoodCategory === 'all' ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:9px;">Все</button>
                <button onclick="filterLifeFood('fast')" class="btn ${lifeActiveFoodCategory === 'fast' ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:9px;">Фаст</button>
                <button onclick="filterLifeFood('home')" class="btn ${lifeActiveFoodCategory === 'home' ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:9px;">Домашняя</button>
                <button onclick="filterLifeFood('restaurant')" class="btn ${lifeActiveFoodCategory === 'restaurant' ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:9px;">Ресторан</button>
            </div>

            <div class="space-y-2" id="lifeFoodListContainer"></div>
        </div>
    `;

    renderLifeActivities();
    renderLifeFoodList();
}

// ========================================================
// 2. ПОДРАЗДЕЛ: УЛИЦА, РАДАР ДПС (12.5.1) И ГОНКИ
// ========================================================
function renderStreetRadarSubTab(container) {
    if (!state.streetEvents || !Array.isArray(state.streetEvents)) {
        state.streetEvents = JSON.parse(JSON.stringify(DEFAULT_STREET_EVENTS));
    }

    const curFilter = lifeStreetFilter;
    let filtered = state.streetEvents.filter(ev => {
        if (curFilter === 'all') return true;
        return ev.type === curFilter;
    });

    container.innerHTML = `
        <!-- КАРТОЧКА ОПЕРАТИВНОЙ СВОДКИ -->
        <div class="glass-card mb-3 p-3" style="background:linear-gradient(135deg, rgba(255,51,102,0.1), #090e18); border-color:rgba(255,51,102,0.4);">
            <div class="flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <span style="font-size:16px;">🚨</span>
                    <div>
                        <b class="text-xs color-red" style="font-size:12px;">Хроника Улиц & Радар ДПС</b>
                        <div class="sub-label" style="font-size:8.5px;">Облавы технадзора (ст. 12.5.1), заезды на 402м и инсайды</div>
                    </div>
                </div>
                <button onclick="openAddStreetInsideModal()" class="btn btn-cyan btn-sm" style="font-size:9px; padding:5px 9px;">
                    <i class="fa-solid fa-plus mr-1"></i> Инсайд
                </button>
            </div>

            <!-- Фильтры хроники -->
            <div style="display:flex; gap:5px; margin-bottom:8px; overflow-x:auto;">
                <button onclick="filterStreetFeed('all')" class="m-pill-chip ${curFilter === 'all' ? 'active' : ''}">
                    Все
                </button>
                <button onclick="filterStreetFeed('dps')" class="m-pill-chip ${curFilter === 'dps' ? 'active' : ''}">
                    🚨 ДПС / 12.5.1
                </button>
                <button onclick="filterStreetFeed('racing')" class="m-pill-chip ${curFilter === 'racing' ? 'active' : ''}">
                    🏁 Гонки
                </button>
                <button onclick="filterStreetFeed('deals')" class="m-pill-chip ${curFilter === 'deals' ? 'active' : ''}">
                    💸 Сделки
                </button>
            </div>
        </div>

        <!-- СПИСОК СОБЫТИЙ -->
        <div class="space-y-2 mb-3" id="streetEventsFeed">
            ${filtered.length === 0 ? `
                <div class="glass-card p-3 text-center sub-label" style="font-size:9.5px;">В этой категории пока нет свежих сообщений.</div>
            ` : filtered.map(ev => renderSingleStreetEvent(ev)).join('')}
        </div>

        <!-- ГОРОДСКОЙ CB-РАДИОЭФИР -->
        <div class="live-chat-card p-3" style="border: 1px solid rgba(0, 242, 254, 0.25);">
            <div class="flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <i class="fa-solid fa-tower-broadcast color-cyan"></i>
                    <b class="text-xs" style="font-size:12px;">Радиоканал Авторынка (CB-рация)</b>
                </div>
                <span class="tag-badge bg-tag-cyan">LIVE 27.135 MHz</span>
            </div>
            <div id="lifeChatFeed" class="chat-messages-container mb-2" style="max-height:140px; overflow-y:auto;"></div>
            <div class="chat-compose-box">
              <input type="text" id="feedMessageInput" class="chat-input" placeholder="Передать в эфир обстановку..." maxlength="100" onkeydown="if(event.key==='Enter'){sendChatMessageFromInput();}">
              <button onclick="sendChatMessageFromInput()" class="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </div>
    `;

    renderLifeChat();
}

function renderSingleStreetEvent(ev) {
    return `
        <div class="glass-card p-3" style="background:#090e18; border-left:3px solid ${ev.badgeColor || 'var(--cyan)'}; border-radius:12px;">
            <div class="flex-between mb-1">
                <b class="text-xs color-main" style="font-size:11px;">${ev.author}</b>
                <span class="tag-badge" style="background:${ev.badgeColor}22; color:${ev.badgeColor}; border:1px solid ${ev.badgeColor}55; font-size:7.5px;">
                    ${ev.badge}
                </span>
            </div>
            <div class="sub-label mb-2" style="font-size:9.5px; line-height:1.4; color:#e2e8f0;">
                ${ev.text}
            </div>
            <div class="flex-between" style="align-items:center;">
                <span class="sub-label" style="font-size:8px; color:#64748b;">${ev.timeAgo}</span>
                <div class="flex-gap" style="gap:5px;">
                    <button onclick="reactToStreetEvent('${ev.id}', 'fire')" class="life-reaction-btn">
                        🔥 ${ev.reactions?.fire || 0}
                    </button>
                    <button onclick="reactToStreetEvent('${ev.id}', 'fear')" class="life-reaction-btn">
                        😱 ${ev.reactions?.fear || 0}
                    </button>
                    <button onclick="reactToStreetEvent('${ev.id}', 'skull')" class="life-reaction-btn">
                        💀 ${ev.reactions?.skull || 0}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function filterStreetFeed(cat) {
    lifeStreetFilter = cat;
    playSound('tick');
    const container = document.getElementById('lifeMainContentContainer');
    if (container) renderStreetRadarSubTab(container);
}

function reactToStreetEvent(eventId, reactionType) {
    if (!state.streetEvents) return;
    const ev = state.streetEvents.find(e => e.id === eventId);
    if (!ev) return;
    if (!ev.reactions) ev.reactions = { fire: 0, fear: 0, skull: 0 };
    ev.reactions[reactionType] = (ev.reactions[reactionType] || 0) + 1;
    saveState();
    playSound('tick');
    tgHaptic('light');
    const container = document.getElementById('lifeMainContentContainer');
    if (container) renderStreetRadarSubTab(container);
}

function openAddStreetInsideModal() {
    const text = prompt("Введите оперативную сводку (где пост ДПС, кто гоняет или за сколько купили авто):");
    if (!text || !text.trim()) return;

    if (!state.streetEvents) state.streetEvents = [];
    state.streetEvents.unshift({
        id: 'ev_user_' + Date.now(),
        type: 'dps',
        author: state.player?.name || 'Перекуп',
        badge: 'ИНСАЙД УЛИЦ',
        badgeColor: 'var(--cyan)',
        text: text.trim(),
        timeAgo: 'Только что',
        reactions: { fire: 1, fear: 0, skull: 0 }
    });

    saveState();
    playSound('win');
    tgHaptic('success');
    showToast("Инсайд успешно опубликован в сводке улиц! 📡");
    const container = document.getElementById('lifeMainContentContainer');
    if (container) renderStreetRadarSubTab(container);
}

// ========================================================
// 3. ПОДРАЗДЕЛ: СОЦИУМ, ТОП ИГРОКОВ И АВТОКЛУБЫ
// ========================================================
function renderSocialAndClubsSubTab(container) {
    const player = state.player || {};
    const myName = player.name || 'Taktoje';
    const myCash = player.cash || 0;
    const myLevel = player.level || 1;

    // Имитация таблицы лидеров перекупов
    const leaderboard = [
        { rank: 1, name: "Кинг_Перекуп", level: 12, balance: 48500000, rep: "Легенда авторынка" },
        { rank: 2, name: "Chaser_999", level: 9, balance: 24100000, rep: "Дрифт-барон" },
        { rank: 3, name: myName + " (Вы)", level: myLevel, balance: myCash, rep: "Активный перекуп", isMe: true },
        { rank: 4, name: "Влад_Подбор", level: 7, balance: 11200000, rep: "Толщиномер #1" },
        { rank: 5, name: "Костя_Скрутчик", level: 5, balance: 6400000, rep: "Мастер предпродажки" }
    ].sort((a, b) => b.balance - a.balance).map((item, idx) => ({ ...item, rank: idx + 1 }));

    container.innerHTML = `
        <!-- СОЦИУМ ПЕРЕКУПОВ СТАТУС -->
        <div class="glass-card mb-3 p-3" style="background:#090e18; border:1px solid rgba(0,242,254,0.3); border-radius:12px;">
            <div class="flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <span style="font-size:16px;">👥</span>
                    <div>
                        <b class="text-xs color-cyan" style="font-size:12px;">Социум и Клубы Города</b>
                        <div class="sub-label" style="font-size:8.5px;">Связи, авторитет и тусовка перекупов</div>
                    </div>
                </div>
                <span class="tag-badge bg-tag-green">В СЕТИ: 28</span>
            </div>

            <div class="grid-3 mt-2" style="gap:5px;">
                <button onclick="showToast('У вас 0 входящих заявок в друзья')" class="btn btn-dark btn-sm" style="font-size:9px; padding:6px 4px;">
                    <i class="fa-solid fa-user-group mr-1"></i> Друзья (0)
                </button>
                <button onclick="showToast('Заявок в автоклубы нет')" class="btn btn-dark btn-sm" style="font-size:9px; padding:6px 4px;">
                    <i class="fa-solid fa-envelope mr-1"></i> Заявки
                </button>
                <button onclick="showToast('Вы состоите в клубе: Street Trade Syndicate')" class="btn btn-dark btn-sm" style="font-size:9px; padding:6px 4px;">
                    <i class="fa-solid fa-flag mr-1"></i> Мой Клуб
                </button>
            </div>
        </div>

        <!-- ЗАЛ СЛАВЫ / ТОП ПЕРЕКУПОВ -->
        <div class="glass-card mb-3 p-3">
            <div class="flex-between mb-2">
                <b class="text-xs color-amber" style="font-size:12px;"><i class="fa-solid fa-trophy mr-1"></i> Зал Славы (Топ Перекупов)</b>
                <span class="tag-badge bg-tag-amber">РЕЙТИНГ</span>
            </div>
            <div class="sub-label mb-2" style="font-size:9px;">Позиция в рейтинге определяет доверие автосалонов и открывает редкие закрытые аукционы.</div>

            <div class="space-y-1">
                ${leaderboard.map(u => `
                    <div class="p-2 flex-between" style="background:${u.isMe ? 'rgba(0,242,254,0.1)' : 'rgba(255,255,255,0.02)'}; border-radius:9px; border:1px solid ${u.isMe ? 'var(--cyan)' : 'rgba(255,255,255,0.05)'};">
                        <div class="flex-gap" style="align-items:center;">
                            <b style="width:20px; font-size:11px; color:${u.rank === 1 ? '#ffd700' : (u.rank === 2 ? '#c0c0c0' : (u.rank === 3 ? '#cd7f32' : '#94a3b8'))};">#${u.rank}</b>
                            <div>
                                <b class="text-xs ${u.isMe ? 'color-cyan' : 'color-main'}" style="font-size:10.5px;">${u.name}</b>
                                <div class="sub-label" style="font-size:8px;">${u.rep} • Ур. ${u.level}</div>
                            </div>
                        </div>
                        <b class="text-xs color-green" style="font-size:11px;">${Number(u.balance).toLocaleString()} ₽</b>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ========================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ АКТИВНОСТЕЙ И ЕДЫ
// ========================================================
function renderLifeActivities() {
    const box = document.getElementById('lifeActivitiesList');
    if (!box) return;

    const list = (typeof LIFE_ACTIVITIES !== 'undefined' && Array.isArray(LIFE_ACTIVITIES) && LIFE_ACTIVITIES.length > 0)
        ? LIFE_ACTIVITIES
        : DEFAULT_LIFE_ACTIVITIES;

    let html = "";
    list.forEach(act => {
        let costLabel = act.cost === 0 ? 'Бесплатно' : `${act.cost.toLocaleString()} ₽`;
        html += `
        <div class="p-2 flex-between" style="background:#090e18; border-radius:10px; border:1px solid var(--border-glass);">
            <div style="flex:1; margin-right:8px;">
                <b class="text-xs color-cyan" style="font-size:11px;">${act.name}</b>
                <div class="sub-label" style="font-size:9px; line-height:1.3;">${act.desc}</div>
                <div class="sub-label mt-1" style="font-size:8px; color:var(--green);">
                    Эффект: Настроение +${act.mood}% | Карма +${act.karma || 0}
                </div>
            </div>
            <button onclick="doLifeActivityAction('${act.id}')" class="btn btn-cyan btn-sm btn-auto" style="min-width:85px; font-size:9.5px; padding:6px 8px;">
                ${costLabel}
            </button>
        </div>`;
    });

    box.innerHTML = html;
}

function doLifeActivityAction(actId) {
    const list = (typeof LIFE_ACTIVITIES !== 'undefined' && Array.isArray(LIFE_ACTIVITIES) && LIFE_ACTIVITIES.length > 0)
        ? LIFE_ACTIVITIES
        : DEFAULT_LIFE_ACTIVITIES;

    const act = list.find(a => a.id === actId);
    if (!act) return;

    let cash = state.player?.cash || 0;
    if (act.cost > 0 && cash < act.cost) return showToast("Не хватает денег на эту активность!");

    if (act.cost > 0) {
        state.player.cash -= act.cost;
        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Отдых: ${act.name}`, act.cost, false);
        }
    }

    state.player.mood = Math.min(100, (state.player.mood || 85) + act.mood);
    if (act.karma > 0) {
        state.player.karma = Math.min(100, (state.player.karma || 50) + act.karma);
    }

    saveState();
    updateHeaderUI();
    playSound('win');
    tgHaptic('success');
    showToast(`Вы отлично провели время: «${act.name}»! Настроение поднялось 🔥`);
    renderLifeScreen();
}

function filterLifeFood(cat) {
    lifeActiveFoodCategory = cat;
    renderLifeFoodList();
    playSound('tick');
}

function renderLifeFoodList() {
    const box = document.getElementById('lifeFoodListContainer');
    if (!box) return;

    const diets = (typeof DIETS !== 'undefined' && Array.isArray(DIETS) && DIETS.length > 0)
        ? DIETS
        : DEFAULT_LIFE_DIETS;

    let curDiet = state.player?.diet || 'shaurma';
    let filtered = diets.filter(d => lifeActiveFoodCategory === 'all' || d.category === lifeActiveFoodCategory);

    let html = "";
    filtered.forEach(d => {
        let isCurrent = curDiet === d.id;
        let moodSign = d.mood > 0 ? `+${d.mood}%` : `${d.mood}%`;
        let moodColor = d.mood >= 0 ? 'color-cyan' : 'color-red';

        html += `
        <div class="glass-card p-2 mb-2 ${isCurrent ? 'personal-car-card' : ''}" style="background:#070b14; border-color:${isCurrent ? 'var(--green)' : 'var(--border-glass)'};">
            <div class="flex-between mb-1">
                <div class="flex-gap" style="align-items:center;">
                    <b class="text-xs ${isCurrent ? 'color-green' : 'color-main'}" style="font-size:11.5px;">${d.name}</b>
                    ${isCurrent ? '<span class="tag-badge bg-tag-green" style="font-size:7px;">БАЗОВЫЙ</span>' : ''}
                </div>
                <b class="price-val text-xs color-green" style="font-size:11px;">${d.cost === 0 ? 'Бесплатно' : `${d.cost.toLocaleString()} ₽`}</b>
            </div>

            <div class="sub-label mb-1" style="font-size:9px; line-height:1.3;">${d.desc}</div>

            <div class="flex-between text-xs mb-2 p-1" style="background:#04070e; border-radius:6px; font-size:8.5px;">
                <span>Сытость: <b class="color-amber">+${d.hunger}%</b></span>
                <span>Настроение: <b class="${moodColor}">${moodSign}</b></span>
            </div>

            <div class="grid-2" style="gap:5px;">
                <button onclick="setBaseDietAction('${d.id}')" class="btn ${isCurrent ? 'btn-dark opacity-50' : 'btn-dark'} btn-sm" style="font-size:8.5px; padding:5px 0;" ${isCurrent ? 'disabled' : ''}>
                    ${isCurrent ? 'Выбран базовым ✓' : 'Сделать базовым'}
                </button>
                <button onclick="eatFoodOnceAction('${d.id}')" class="btn btn-green btn-sm" style="font-size:8.5px; padding:5px 0;">
                    Перекусить 🍽️
                </button>
            </div>
        </div>`;
    });

    box.innerHTML = html;
}

function setBaseDietAction(dietId) {
    state.player.diet = dietId;
    saveState();
    playSound('tick');
    tgHaptic('light');
    showToast("Базовый рацион обновлен! Питание будет списываться в полночь.");
    renderLifeScreen();
}

function eatFoodOnceAction(dietId) {
    const diets = (typeof DIETS !== 'undefined' && Array.isArray(DIETS) && DIETS.length > 0)
        ? DIETS
        : DEFAULT_LIFE_DIETS;

    const d = diets.find(item => item.id === dietId);
    if (!d) return;

    let cash = state.player?.cash || 0;
    if (d.cost > 0 && cash < d.cost) return showToast("Не хватает денег на этот обед!");

    if (d.cost > 0) {
        state.player.cash -= d.cost;
        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Питание: ${d.name}`, d.cost, false);
        }
    }

    state.player.hunger = Math.min(100, (state.player.hunger || 80) + d.hunger);
    state.player.mood = Math.max(10, Math.min(100, (state.player.mood || 85) + d.mood));

    saveState();
    updateHeaderUI();
    playSound('win');
    tgHaptic('success');
    showToast(`Вы вкусно поели: «${d.name}» (+${d.hunger}% сытости)!`);
    renderLifeScreen();
}

function roadAssistanceAction() {
    let fuel = state.player?.fuel || 0;
    if (fuel < 10) return showToast("Не хватает топлива в баке для выезда!");

    state.player.fuel -= 10;
    state.player.karma = Math.min(100, (state.player.karma || 50) + 8);
    state.player.mood = Math.min(100, (state.player.mood || 85) + 10);

    saveState();
    updateHeaderUI();
    playSound('win');
    tgHaptic('success');
    showToast("Вы помогли заглохшему водителю на трассе (-10 ⛽, +8 к карме)! 🤝");
    renderLifeScreen();
}

function donatePartsToMechanic() {
    let cost = 45000;
    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Нужно 45,000 ₽ на покупку запчастей для СТО!");

    state.player.cash -= cost;
    state.player.connections = (state.player.connections || 0) + 1;
    state.player.karma = Math.min(100, (state.player.karma || 50) + 5);

    saveState();
    updateHeaderUI();
    playSound('win');
    tgHaptic('success');
    showToast("Запчасти переданы дяде Ване на СТО (+1 🤝 Связь, +5 Кармы)!");
    renderLifeScreen();
}

function bigCharityDonate() {
    let cost = 150000;
    let cash = state.player?.cash || 0;
    if (cash < cost) return showToast("Нужно 150,000 ₽ на меценатство!");

    state.player.cash -= cost;
    state.player.karma = Math.min(100, (state.player.karma || 50) + 25);
    state.player.mood = 100;

    saveState();
    updateHeaderUI();
    playSound('win');
    tgHaptic('success');
    if (typeof openVerdictModal === 'function') {
        openVerdictModal(
            "БЛАГОТВОРИТЕЛЬНОСТЬ ПЕРЕКУПА 🕊️",
            "Вы профинансировали ремонт детского автогородка и помогли ветеранам автоспорта!\nКарма выросла на +25! Покупатели на авторынке относятся к вам с глубоким уважением.",
            true,
            cost
        );
    }
    renderLifeScreen();
}

function renderLifeChat() {
    const box = document.getElementById('lifeChatFeed');
    if (!box) return;

    if (!state.lifeChatMessages || state.lifeChatMessages.length === 0) {
        state.lifeChatMessages = (typeof STREET_CHAT_LOG !== 'undefined' && Array.isArray(STREET_CHAT_LOG))
            ? JSON.parse(JSON.stringify(STREET_CHAT_LOG))
            : [
                { author: "Диспетчер СВ", text: "На МКАДе свободно, на посту в Люберцах выборочный весовой контроль.", warning: false },
                { author: "Алик СТО", text: "Парни, на разборку притащили свежую Приору под распил, кому запчасти?", warning: false },
                { author: "Таксист_77", text: "В районе вокзала напёрсточники опять крутят стаканы, будьте аккуратнее.", warning: true }
            ];
    }

    let html = "";
    state.lifeChatMessages.slice(-12).forEach(msg => {
        let isWarn = !!msg.warning;
        html += `
        <div class="chat-msg ${isWarn ? 'msg-seller' : 'msg-player'}" style="margin-bottom:4px; font-size:10px; ${isWarn ? 'border-color:var(--red); color:#fca5a5;' : ''}">
            <b style="color:${isWarn ? 'var(--red)' : 'var(--cyan)'};">${msg.author}:</b> ${msg.text}
        </div>`;
    });

    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
}

function sendChatMessageFromInput() {
    const input = document.getElementById('feedMessageInput');
    if (!input || !input.value.trim()) return;

    let text = input.value.trim();
    input.value = "";

    if (!state.lifeChatMessages) state.lifeChatMessages = [];
    state.lifeChatMessages.push({
        author: state.player?.name || "Перекуп #777",
        text: text,
        warning: false
    });

    saveState();
    playSound('tick');
    renderLifeChat();
}

function renderDiets() {
    renderLifeScreen();
}

// Экспорт функций в window
window.renderLifeScreen = renderLifeScreen;
window.renderDiets = renderDiets;
window.switchLifeTab = switchLifeTab;
window.filterLifeFood = filterLifeFood;
window.renderLifeFoodList = renderLifeFoodList;
window.setBaseDietAction = setBaseDietAction;
window.eatFoodOnceAction = eatFoodOnceAction;
window.doLifeActivityAction = doLifeActivityAction;
window.roadAssistanceAction = roadAssistanceAction;
window.donatePartsToMechanic = donatePartsToMechanic;
window.bigCharityDonate = bigCharityDonate;
window.renderLifeChat = renderLifeChat;
window.sendChatMessageFromInput = sendChatMessageFromInput;
window.filterStreetFeed = filterStreetFeed;
window.reactToStreetEvent = reactToStreetEvent;
window.openAddStreetInsideModal = openAddStreetInsideModal;

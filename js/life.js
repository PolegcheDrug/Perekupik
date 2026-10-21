// ========================================================
// js/life.js — РАЗДЕЛ «ЖИЗНЬ ПЕРЕКУПА», СОЦИУМ И АВТОКЛУБЫ (v1.5.0 NO-BOTS)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v1.5.0 (ПОЛНОЕ УДАЛЕНИЕ БОТОВ + ЖИВАЯ СЕТЬ FIRESTORE):
//   1. ПОЛНЫЙ ОТКАЗ ОТ БОТОВ: Зал Славы, рекомендации и поиск работают строго по базе игроков.
//   2. ЖИВОЙ ПОИСК В FIRESTORE: поиск по нику, @username или UID через FB_FriendshipsManager.
//   3. РЕАЛЬНЫЕ РЕКОМЕНДАЦИИ: динамическая подгрузка живых перекупов в сети вместо фейков.
//   4. ФИКС НАВИГАЦИИ И КНОПОК: кнопка «Чат» ведёт прямо в личные сообщения M+, кнопки не съезжают.
//   5. ФИЧА ОТ СЕБЯ: «Уличный инсайд ДПС» с начислением Кармы и быстрый вызов на 402м из Зала Славы!
// ========================================================

let lifeActiveTab = 'tone'; // 'tone' | 'street' | 'social'
let lifeActiveFoodCategory = 'all';
let lifeStreetFilter = 'all'; // 'all' | 'dps' | 'racing' | 'deals'
let friendsActiveSubTab = 'list'; // 'list' | 'requests' | 'search'
let clubActiveSubTab = 'my_club'; // 'my_club' | 'catalog' | 'create'

let _lastSearchResults = null;
let _isSearchingFriends = false;
let _recommendedPlayersCache = [];
let _isLoadingRecommended = false;

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

// Базовая хроника городских событий и облав ДПС с таймерами активности
const DEFAULT_STREET_EVENTS = [
    {
        id: 'ev_dps_1',
        type: 'dps',
        author: 'Экипаж ДПС #214 (Ford Focus II)',
        badge: 'ОБЛАВА 12.5.1',
        badgeColor: 'var(--red)',
        text: 'Внимание водителям! На выезде с проспекта Мира развернут спецбатальон технадзора. Проверяют прямоточные глушители, нештатный выворот и заварку редукторов. 4 корча уже погружены на эвакуаторы!',
        timeAgo: '3 мин назад',
        timeLeftMinutes: 27,
        reactions: { fire: 8, fear: 24, skull: 19 }
    },
    {
        id: 'ev_race_1',
        type: 'racing',
        author: 'Уличный Гонщик (BMW E36 2.8)',
        badge: 'ДУЭЛЬ 402М',
        badgeColor: 'var(--amber)',
        text: 'Кто смелый сегодня в полночь на объездной? Залита боевая прошивка под лаунч, ставка 100,000 ₽ на капот. Ищу живой Chaser Tourer V или турбо-корч!',
        timeAgo: '12 мин назад',
        timeLeftMinutes: 45,
        reactions: { fire: 31, fear: 2, skull: 5 }
    },
    {
        id: 'ev_deal_1',
        type: 'deals',
        author: 'Эксперт Подбора',
        badge: 'СДЕЛКА ВЕКА',
        badgeColor: 'var(--green)',
        text: 'В соседнем дворе у дедушки забрали гаражный ВАЗ-2101 1978 года в родной краске с пробегом 18,000 км за 75k! На авторынке уже готовы оторвать с руками за 450k.',
        timeAgo: '35 мин назад',
        timeLeftMinutes: 15,
        reactions: { fire: 45, fear: 1, skull: 0 }
    }
];

// Каталог доступных автоклубов города
const DEFAULT_CLUBS_CATALOG = [
    {
        id: 'sts',
        name: 'Street Trade Syndicate',
        tag: 'STS',
        icon: '🦅',
        leader: 'Основатель Синдиката',
        membersCount: 42,
        totalCapital: 184500000,
        desc: 'Синдикат профессиональных автодилеров и перекупов. Контролирует оптовые поставки и крупные сделки.',
        perks: [
            { icon: '📈', title: 'Синдикат-Сбыт', desc: '+6% к цене продажи автомобилей клиентам на площадке' },
            { icon: '🛠️', title: 'Гаражное братство', desc: '-15% на закупку запчастей и диагностику авто' },
            { icon: '🚨', title: 'Свой инсайд', desc: 'Сводки об облавах технадзора ДПС поступают на 5 минут раньше' }
        ]
    },
    {
        id: 'mdd',
        name: 'Midnight Drift Dynasty',
        tag: 'MDD',
        icon: '🔥',
        leader: 'Дрифт-Инженер',
        membersCount: 29,
        totalCapital: 96200000,
        desc: 'Клуб фанатов заднего привода, турбо-японцев и нелегального драга на объездной.',
        perks: [
            { icon: '🏁', title: 'Турбо-буст', desc: '+10% к вероятности победы в ночных дуэлях на 402м' },
            { icon: '💨', title: 'Жженый корд', desc: 'Скидка 25% на спортивную резину и рычаги выворота' },
            { icon: '⛽', title: 'Спонсорский бензин', desc: 'Скидка 20% на заправку бака на сетевых АЗС' }
        ]
    },
    {
        id: 'rac',
        name: 'Royal Auto Collection',
        tag: 'RAC',
        icon: '👑',
        leader: 'Коллекционер Редких Авто',
        membersCount: 16,
        totalCapital: 340000000,
        desc: 'Закрытый клуб владельцев музейных янгтаймеров, капсул времени и суперкаров.',
        perks: [
            { icon: '🏆', title: 'Охота за ретро', desc: '+20% к вероятности найти небитый авто в гаражах дедушек' },
            { icon: '🏷️', title: 'Архивные серии', desc: 'Доступ к закрытым торгам блатных номеров 777 и ЕКХ' },
            { icon: '💵', title: 'VIP-Депозит', desc: '+0.2% к ежедневной ставке по банковским вкладам' }
        ]
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
            .life-inside-btn {
                background: linear-gradient(135deg, #00f2fe, #0284c7) !important;
                color: #000 !important;
                font-size: 10px !important;
                font-weight: 900 !important;
                padding: 6px 12px !important;
                border-radius: 8px !important;
                border: none !important;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                height: 32px;
                flex-shrink: 0;
                box-shadow: 0 0 12px rgba(0, 242, 254, 0.35);
                transition: all 0.15s ease;
                white-space: nowrap;
            }
            .life-inside-btn:hover {
                filter: brightness(1.1);
                box-shadow: 0 0 18px rgba(0, 242, 254, 0.6);
            }
            .life-inside-btn:active {
                transform: scale(0.96);
            }
            .life-btn-auto {
                width: auto !important;
                min-width: 82px !important;
                flex-shrink: 0 !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                white-space: nowrap !important;
                height: 30px !important;
                padding: 0 12px !important;
                box-sizing: border-box !important;
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
            .social-sub-pill {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.08);
                color: #94a3b8;
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 9.5px;
                font-weight: 800;
                cursor: pointer;
                transition: all 0.15s ease;
            }
            .social-sub-pill.active {
                background: rgba(0, 242, 254, 0.18);
                border-color: #00f2fe;
                color: #00f2fe;
            }
        </style>

        <!-- ВЕРХНИЙ ДАШБОРД САМОЧУВСТВИЯ ПЕРЕКУПА -->
        <div class="glass-card mb-3 p-3" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.12), #090e18); border-color: rgba(0, 230, 118, 0.35);">
            <div class="flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <div class="chat-avatar-circle" style="font-size:20px; background:#0e1e24; border:1.5px solid var(--green);">☕</div>
                    <div>
                        <h3 class="font-bold text-xs color-green" style="font-size:14px;">Жизнь & Улица</h3>
                        <div class="sub-label" style="font-size:9.5px;">Тонус, радар ДПС, автоклубы и живой рейтинг</div>
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
        <div class="glass-card mb-3 p-3">
            <div class="flex-between mb-2">
                <b class="text-xs color-cyan" style="font-size:12.5px;"><i class="fa-solid fa-dumbbell mr-1"></i> Активности и Отдых</b>
                <span class="tag-badge bg-tag-cyan">Разгрузка</span>
            </div>
            <div class="sub-label mb-2" style="font-size:9.5px;">Снимают стресс после жесткого торга, поднимают кураж и карму.</div>
            <div class="space-y-2" id="lifeActivitiesList"></div>
        </div>

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

        <div class="glass-card mb-3 p-3" id="lifeFoodSectionAnchor">
            <div class="flex-between mb-2">
                <div>
                    <b class="text-xs color-amber" style="font-size:12.5px;"><i class="fa-solid fa-utensils mr-1"></i> Рацион и Доставка Еды</b>
                    <div class="sub-label" style="font-size:9px;">Базовый: <b class="color-amber">${dietTitle}</b> (списание в полночь)</div>
                </div>
            </div>

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
        <div class="glass-card mb-3 p-3" style="background:linear-gradient(135deg, rgba(255,51,102,0.1), #090e18); border-color:rgba(255,51,102,0.4);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:10px;">
                <div style="display:flex; align-items:flex-start; gap:8px; min-width:0; flex:1;">
                    <span style="font-size:20px; line-height:1; margin-top:2px;">🚨</span>
                    <div style="min-width:0;">
                        <b class="text-xs color-red" style="font-size:12px; display:block; line-height:1.2;">Хроника Улиц & Радар ДПС</b>
                        <div class="sub-label" style="font-size:8.5px; margin-top:2px; line-height:1.3;">Облавы технадзора (ст. 12.5.1), заезды на 402м и инсайды</div>
                    </div>
                </div>
                <button onclick="openAddStreetInsideModal()" class="life-inside-btn">
                    <i class="fa-solid fa-plus"></i> ИНСАЙД (+5 🌟)
                </button>
            </div>

            <div style="display:flex; gap:5px; margin-bottom:2px; overflow-x:auto; padding-bottom:2px;">
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

        <div class="space-y-2 mb-3" id="streetEventsFeed">
            ${filtered.length === 0 ? `
                <div class="glass-card p-3 text-center sub-label" style="font-size:9.5px;">В этой категории пока нет свежих сообщений.</div>
            ` : filtered.map(ev => renderSingleStreetEvent(ev)).join('')}
        </div>

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
    const timerBadge = ev.timeLeftMinutes
        ? `<span class="sub-label" style="font-size:7.5px; color:#f59e0b; margin-left:6px;"><i class="fa-solid fa-stopwatch mr-1"></i>${ev.timeLeftMinutes} мин</span>`
        : '';

    return `
        <div class="glass-card p-3" style="background:#090e18; border-left:3px solid ${ev.badgeColor || 'var(--cyan)'}; border-radius:12px;">
            <div class="flex-between mb-1">
                <b class="text-xs color-main" style="font-size:11px;">${ev.author}</b>
                <div style="display:flex; align-items:center;">
                    <span class="tag-badge" style="background:${ev.badgeColor}22; color:${ev.badgeColor}; border:1px solid ${ev.badgeColor}55; font-size:7.5px;">
                        ${ev.badge}
                    </span>
                    ${timerBadge}
                </div>
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
        timeLeftMinutes: 30,
        reactions: { fire: 1, fear: 0, skull: 0 }
    });

    state.player.karma = Math.min(100, (state.player.karma || 50) + 5);
    saveState();
    playSound('win');
    tgHaptic('success');
    showToast("Инсайд опубликован! +5 к карме перекупа 📡");
    const container = document.getElementById('lifeMainContentContainer');
    if (container) renderStreetRadarSubTab(container);
}

// ========================================================
// 3. ПОДРАЗДЕЛ: СОЦИУМ, ЖИВОЙ ТОП ИГРОКОВ (БЕЗ БОТОВ)
// ========================================================
async function renderSocialAndClubsSubTab(container) {
    const player = state.player || {};
    const friendsCount = (state.friendsList || []).length;
    const pendingRequests = (player.pendingFriendRequests || []).length;
    const curClubId = player.club?.id || player.club || 'sts';
    const currentClub = DEFAULT_CLUBS_CATALOG.find(c => c.id === curClubId) || DEFAULT_CLUBS_CATALOG[0];

    container.innerHTML = `
        <div class="glass-card mb-3 p-3" style="background:#090e18; border:1px solid rgba(0,242,254,0.3); border-radius:12px;">
            <div class="flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <span style="font-size:16px;">👥</span>
                    <div>
                        <b class="text-xs color-cyan" style="font-size:12px;">Социум и Клубы Города</b>
                        <div class="sub-label" style="font-size:8.5px;">Связи, авторитет и тусовка перекупов</div>
                    </div>
                </div>
                <span class="tag-badge bg-tag-green" id="lifeOnlineBadge">ОНЛАЙН СЕТЬ</span>
            </div>

            <div class="grid-2 mt-2" style="gap:6px;">
                <button onclick="openFriendsModal()" class="btn btn-cyan btn-sm font-bold" style="font-size:10px; padding:8px 6px;">
                    <i class="fa-solid fa-user-group mr-1"></i> Друзья (${friendsCount})${pendingRequests > 0 ? ` <span style="background:#ff3366; color:#fff; font-size:7.5px; padding:1px 5px; border-radius:10px; font-weight:900;">+${pendingRequests}</span>` : ''}
                </button>
                <button onclick="openClubModal()" class="btn btn-purple btn-sm font-bold" style="font-size:10px; padding:8px 6px;">
                    <i class="fa-solid fa-flag mr-1"></i> Клуб: [${currentClub.tag}]
                </button>
            </div>
        </div>

        <div class="glass-card mb-3 p-3">
            <div class="flex-between mb-2">
                <b class="text-xs color-amber" style="font-size:12px;"><i class="fa-solid fa-trophy mr-1"></i> Зал Славы (Топ Перекупов)</b>
                <span class="tag-badge bg-tag-amber">РЕЙТИНГ</span>
            </div>
            <div class="sub-label mb-2" style="font-size:9px;">Позиция в рейтинге определяет доверие автосалонов и открывает редкие закрытые аукционы.</div>

            <div id="lifeLeaderboardContent" class="space-y-1">
                <div class="text-center py-4 sub-label">
                    <i class="fa-solid fa-spinner fa-spin color-cyan mr-1"></i> Загрузка реальных игроков из базы...
                </div>
            </div>
        </div>
    `;

    _updateLifeLeaderboard();
}

async function _updateLifeLeaderboard() {
    const listEl = document.getElementById('lifeLeaderboardContent');
    if (!listEl) return;

    let players = [];
    if (window.MLeaderboardModule && typeof window.MLeaderboardModule.fetchPlayersList === 'function') {
        players = await window.MLeaderboardModule.fetchPlayersList();
    } else if (window.FB_FriendshipsManager && typeof window.FB_FriendshipsManager.fetchLeaderboard === 'function') {
        players = await window.FB_FriendshipsManager.fetchLeaderboard();
    }

    // Исключаем всех фейковых ботов
    players = (players || []).filter(p => !p.isBot && !String(p.id).startsWith('bot_'));

    // Если в базе пока только текущий игрок, отображаем его честный ранг без подмешивания фейков
    if (players.length === 0) {
        const myName = state.player?.name || 'Taktoje';
        const myCash = state.player?.cash || 0;
        const myLvl = state.player?.level || 1;
        players = [{
            id: String(state.player?.uid || 'me'),
            name: myName,
            level: myLvl,
            networth: myCash,
            car: state.garage?.[0]?.name || 'Пешком',
            isMe: true
        }];
    }

    players.sort((a, b) => (b.networth || 0) - (a.networth || 0));

    listEl.innerHTML = players.slice(0, 10).map((u, idx) => {
        const rank = idx + 1;
        const isMe = u.isMe || String(u.id) === String(state.player?.uid || window.tgUserId);
        const rankColor = rank === 1 ? '#ffd700' : (rank === 2 ? '#c0c0c0' : (rank === 3 ? '#cd7f32' : '#94a3b8'));

        return `
            <div class="p-2 flex-between" style="background:${isMe ? 'rgba(0,242,254,0.1)' : 'rgba(255,255,255,0.02)'}; border-radius:9px; border:1px solid ${isMe ? 'var(--cyan)' : 'rgba(255,255,255,0.05)'};">
                <div class="flex-gap" style="align-items:center;">
                    <b style="width:20px; font-size:11px; color:${rankColor};">#${rank}</b>
                    <div>
                        <b class="text-xs ${isMe ? 'color-cyan' : 'color-main'}" style="font-size:10.5px;">${u.name}${isMe ? ' (Вы)' : ''}</b>
                        <div class="sub-label" style="font-size:8px;">${u.car || 'Пешком'} • Ур. ${u.level || 1}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <b class="text-xs color-green" style="font-size:11px;">${Number(u.networth || 0).toLocaleString()} ₽</b>
                    ${!isMe ? `
                        <button onclick="challengePlayerFromLife('${escape(u.name)}')" class="btn btn-red btn-sm btn-auto" style="padding:3px 6px; font-size:8px;" title="Вызов на 402м">
                            🏁
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function challengePlayerFromLife(targetName) {
    const rawName = unescape(targetName);
    if (window.MLeaderboardModule && typeof window.MLeaderboardModule.challengePlayer === 'function') {
        window.MLeaderboardModule.challengePlayer(rawName);
    } else {
        const bet = prompt(`Сумма ставки на заезд 402м против ${rawName} (₽):`, "50000");
        if (!bet) return;
        if (typeof switchTab === 'function') switchTab('tabPhone');
        setTimeout(() => {
            if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.openApp === 'function') {
                PhoneManager.openApp('street');
            }
        }, 120);
    }
}

// ========================================================
// 4. ЭКРАН «ДРУЗЬЯ & КОНТАКТЫ» (РЕАЛЬНЫЕ ИГРОКИ FIRESTORE)
// ========================================================
function openFriendsModal(initialSubTab = 'list') {
    friendsActiveSubTab = initialSubTab;
    let modal = document.getElementById('modalFriendsCenter');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalFriendsCenter';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    renderFriendsModalContent();
    modal.style.display = 'flex';
    modal.classList.add('active');
    playSound('tick');

    if (initialSubTab === 'search') {
        _loadRecommendedPlayers();
    }
}

function closeFriendsModal() {
    const modal = document.getElementById('modalFriendsCenter');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    playSound('tick');
    renderLifeScreen();
}

async function renderFriendsModalContent() {
    const modal = document.getElementById('modalFriendsCenter');
    if (!modal) return;

    const player = state.player || {};
    let friends = state.friendsList || [];
    const requests = player.pendingFriendRequests || [];
    const myId = player.uid || window.tgUserId || 'PRK-777-99';

    // Подгрузка живого списка друзей из Firestore
    if (window.FB_FriendshipsManager && typeof window.FB_FriendshipsManager.fetchFriendships === 'function') {
        try {
            const data = await window.FB_FriendshipsManager.fetchFriendships();
            if (data && Array.isArray(data.friends)) {
                friends = data.friends;
                state.friendsList = friends;
            }
        } catch (e) {
            console.warn('[Life] fetchFriendships fallback:', e);
        }
    }

    let subContent = '';
    if (friendsActiveSubTab === 'list') {
        subContent = `
            <div class="space-y-2" style="max-height: 290px; overflow-y: auto;">
                ${friends.length === 0 ? `
                    <div class="p-4 text-center sub-label" style="font-size:10px;">
                        <i class="fa-solid fa-user-group color-cyan mb-2" style="font-size:24px; display:block;"></i>
                        У вас пока нет друзей в игре.<br>
                        Перейдите во вкладку <b>«Поиск игроков»</b>, чтобы найти реальных перекупов!
                    </div>
                ` : friends.map(f => `
                    <div class="p-2" style="background:#090e18; border-radius:10px; border:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center; gap:8px;">
                        <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
                            <div style="position:relative; width:34px; height:34px; min-width:34px; border-radius:50%; background:linear-gradient(135deg, #00f2fe, #7928ca); display:flex; align-items:center; justify-content:center; color:#000; font-weight:900; font-size:14px;">
                                ${(f.name || 'П').charAt(0)}
                                <span style="position:absolute; bottom:0; right:0; width:8px; height:8px; border-radius:50%; background:${f.isOnline || f.online ? '#00e676' : '#64748b'}; border:1.5px solid #000;"></span>
                            </div>
                            <div style="min-width:0; flex:1;">
                                <b class="text-xs color-main" style="font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">${f.name}</b>
                                <div class="sub-label" style="font-size:8px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Ур. ${f.level \vert{}\vert{} 1} •${f.carName || f.car || 'В гараже'}</div>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                            <button onclick="writeToFriendInM('${f.id \vert{}\vert{} ''}', '${escape(f.name)}')" class="btn btn-cyan btn-sm life-btn-auto" style="font-size:9px;" title="Открыть чат">
                                <i class="fa-solid fa-comments mr-1"></i> Чат
                            </button>
                            <button onclick="inviteFriendToClubAction('${escape(f.name)}')" class="btn btn-purple btn-sm life-btn-auto" style="font-size:9px;" title="Пригласить в клуб">
                                <i class="fa-solid fa-flag"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (friendsActiveSubTab === 'requests') {
        subContent = `
            <div class="p-2 mb-2" style="background:rgba(0,242,254,0.08); border:1px solid rgba(0,242,254,0.3); border-radius:10px;">
                <div class="sub-label text-xs mb-1">Ваш персональный ID для добавления:</div>
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <b class="color-cyan font-mono" style="font-size:12.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">${myId}</b>
                    <button onclick="navigator.clipboard?.writeText('${myId}'); showToast('ID скопирован в буфер!');" class="btn btn-dark btn-sm life-btn-auto" style="font-size:9px;">
                        <i class="fa-solid fa-copy mr-1"></i> Копировать
                    </button>
                </div>
            </div>

            <div class="sub-label mb-1" style="font-size:9.5px; font-weight:800; color:#cbd5e1;">Входящие заявки (${requests.length}):</div>
            <div class="space-y-1" style="max-height: 200px; overflow-y: auto;">
                ${requests.length === 0 ? `
                    <div class="p-3 text-center sub-label" style="font-size:9px;">Новых заявок в друзья пока нет.</div>
                ` : requests.map((req, rIdx) => `
                    <div class="p-2" style="background:#090e18; border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                        <div style="min-width:0; flex:1;">
                            <b class="text-xs color-main" style="font-size:10.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">${req.name || 'Игрок'}</b>
                            <div class="sub-label" style="font-size:8px;">Уровень ${req.level || 1}</div>
                        </div>
                        <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                            <button onclick="acceptFriendRequest(${rIdx}, '${req.id || ''}')" class="btn btn-green btn-sm life-btn-auto" style="font-size:8.5px;">Принять</button>
                            <button onclick="rejectFriendRequest(${rIdx}, '${req.id || ''}')" class="btn btn-dark btn-sm life-btn-auto" style="font-size:8.5px;">Отклонить</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (friendsActiveSubTab === 'search') {
        subContent = `
            <div style="display:flex; gap:6px; margin-bottom:10px; align-items:center;">
                <input type="text" id="friendSearchInput" class="chat-input" placeholder="Введите ник, @username или ID..." style="flex:1 1 auto; min-width:0; font-size:11px; padding:8px 10px; box-sizing:border-box;" onkeydown="if(event.key==='Enter') submitSearchFriendAction();">
                <button onclick="submitSearchFriendAction()" class="btn btn-cyan btn-sm font-bold life-btn-auto" style="font-size:10px;">
                    <i class="fa-solid fa-magnifying-glass mr-1"></i> Найти
                </button>
            </div>

            <div id="friendSearchResultsBox" style="margin-bottom:12px;"></div>

            <div class="sub-label mb-1" style="font-size:9.5px; font-weight:800; color:#cbd5e1;">Рекомендуемые перекупы в сети:</div>
            <div class="space-y-1" id="recommendedFriendsListContainer" style="max-height:160px; overflow-y:auto;">
                <div class="p-3 text-center sub-label" style="font-size:9px;">
                    <i class="fa-solid fa-spinner fa-spin color-cyan mr-1"></i> Поиск свободных игроков в Firestore...
                </div>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal-box" style="max-width: 420px; background: #070b14; border: 1px solid rgba(0,242,254,0.4); border-radius: 16px;">
            <div class="flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <span style="font-size:18px;">👥</span>
                    <b class="text-xs color-cyan" style="font-size:13px;">Друзья & Контакты</b>
                </div>
                <button onclick="closeFriendsModal()" class="btn btn-dark btn-auto btn-sm" style="padding:4px 8px;">✕</button>
            </div>

            <div style="display:flex; gap:6px; margin-bottom:12px; overflow-x:auto;">
                <button onclick="switchFriendsSubTab('list')" class="social-sub-pill ${friendsActiveSubTab === 'list' ? 'active' : ''}">
                    Друзья (${friends.length})
                </button>
                <button onclick="switchFriendsSubTab('requests')" class="social-sub-pill ${friendsActiveSubTab === 'requests' ? 'active' : ''}">
                    Заявки ${requests.length > 0 ? `(${requests.length})` : ''}
                </button>
                <button onclick="switchFriendsSubTab('search')" class="social-sub-pill ${friendsActiveSubTab === 'search' ? 'active' : ''}">
                    Поиск игроков
                </button>
            </div>

            ${subContent}

            <button onclick="closeFriendsModal()" class="btn btn-dark w-full mt-3 font-bold btn-sm">
                Закрыть
            </button>
        </div>
    `;

    if (friendsActiveSubTab === 'search') {
        _renderRecommendedPlayers();
    }
}

async function _loadRecommendedPlayers() {
    if (_isLoadingRecommended) return;
    _isLoadingRecommended = true;

    try {
        if (window.FB_FriendshipsManager && typeof window.FB_FriendshipsManager.fetchRecommendedUsers === 'function') {
            _recommendedPlayersCache = await window.FB_FriendshipsManager.fetchRecommendedUsers();
        } else if (typeof window.getRecommendedPlayersOnline === 'function') {
            _recommendedPlayersCache = await window.getRecommendedPlayersOnline();
        }
    } catch (e) {
        console.warn('[Life] loadRecommended error:', e);
    } finally {
        _isLoadingRecommended = false;
        _renderRecommendedPlayers();
    }
}

function _renderRecommendedPlayers() {
    const box = document.getElementById('recommendedFriendsListContainer');
    if (!box) return;

    if (_recommendedPlayersCache.length === 0) {
        box.innerHTML = `
            <div class="p-3 text-center sub-label" style="font-size:9px; color:#64748b;">
                Все доступные перекупы уже у вас в друзьях или заявках.<br>
                Используйте поиск по ID выше для точного поиска!
            </div>
        `;
        return;
    }

    box.innerHTML = _recommendedPlayersCache.map(p => `
        <div class="p-2" style="background:#090e18; border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <div style="min-width:0; flex:1;">
                <b class="text-xs color-cyan" style="font-size:10.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">${p.name}</b>
                <div class="sub-label" style="font-size:8px; color:#94a3b8;">Ур. ${p.level || 1} • ${p.carName || 'В гараже'}</div>
            </div>
            <button onclick="sendFriendRequestTo('${p.id}', '${escape(p.name)}')" class="btn btn-cyan btn-sm life-btn-auto" style="font-size:8.5px;">+ Заявка</button>
        </div>
    `).join('');
}

async function submitSearchFriendAction() {
    const input = document.getElementById('friendSearchInput');
    const resBox = document.getElementById('friendSearchResultsBox');
    if (!input || !input.value.trim() || !resBox) return showToast("Введите ник или ID!");

    const q = input.value.trim();
    resBox.innerHTML = `
        <div class="p-2 text-center sub-label" style="font-size:9px;">
            <i class="fa-solid fa-spinner fa-spin color-cyan mr-1"></i> Поиск в базе Firestore...
        </div>
    `;

    let found = [];
    if (window.FB_FriendshipsManager && typeof window.FB_FriendshipsManager.searchUsers === 'function') {
        found = await window.FB_FriendshipsManager.searchUsers(q);
    } else if (typeof window.searchPlayersOnline === 'function') {
        found = await window.searchPlayersOnline(q);
    }

    if (found.length === 0) {
        resBox.innerHTML = `
            <div class="p-2 text-center sub-label color-amber" style="background:rgba(255,179,0,0.06); border-radius:8px; font-size:9px;">
                Игроков по запросу «${q}» не найдено в базе. Проверьте правильность ID или ника.
            </div>
        `;
        return;
    }

    resBox.innerHTML = `
        <div class="sub-label mb-1" style="font-size:9px; color:var(--cyan); font-weight:800;">Результаты поиска:</div>
        <div class="space-y-1">
            ${found.map(u => `
                <div class="p-2" style="background:#0b1324; border:1px solid rgba(0,242,254,0.3); border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <div style="min-width:0; flex:1;">
                        <b class="text-xs color-green" style="font-size:11px;">${u.name}</b>
                        <div class="sub-label" style="font-size:8px;">Ур. ${u.level} •${u.carName}</div>
                    </div>
                    <button onclick="sendFriendRequestTo('${u.id}', '${escape(u.name)}')" class="btn btn-green btn-sm life-btn-auto" style="font-size:8.5px;">+ Дружить</button>
                </div>
            `).join('')}
        </div>
    `;
}

async function sendFriendRequestTo(targetUid, targetName) {
    const rawName = unescape(targetName || 'Перекуп');
    playSound('win');
    tgHaptic('success');

    if (window.FB_FriendshipsManager && typeof window.FB_FriendshipsManager.sendRequest === 'function') {
        showToast(`Отправка заявки ${rawName}...`);
        const res = await window.FB_FriendshipsManager.sendRequest(targetUid, rawName);
        if (res && res.success) {
            showToast(res.autoAccepted ? `✅ ${rawName} теперь ваш друг!` : `✅ Заявка отправлена ${rawName}!`);
        } else {
            showToast(`⚠️ ${res?.error || 'Заявка уже в обработке'}`);
        }
    } else {
        showToast(`Заявка в друзья отправлена игроку «${rawName}»! ✉️`);
    }

    // Удаляем из списка рекомендаций
    _recommendedPlayersCache = _recommendedPlayersCache.filter(p => String(p.id) !== String(targetUid));
    _renderRecommendedPlayers();
}

function switchFriendsSubTab(tab) {
    friendsActiveSubTab = tab;
    playSound('tick');
    renderFriendsModalContent();
    if (tab === 'search') {
        _loadRecommendedPlayers();
    }
}

function writeToFriendInM(friendId, friendName) {
    const rawName = unescape(friendName);
    closeFriendsModal();

    if (typeof switchTab === 'function') switchTab('tabPhone');
    setTimeout(() => {
        if (window.PhoneManager && typeof window.PhoneManager.openApp === 'function') {
            window.PhoneManager.openApp('m');
            setTimeout(() => {
                if (window.AppM && typeof window.AppM.openFriendChat === 'function') {
                    window.AppM.openFriendChat(friendId, rawName);
                } else if (window.AppM && typeof window.AppM.switchMainTab === 'function') {
                    window.AppM.switchMainTab('chats');
                }
            }, 120);
        }
    }, 120);
    showToast(`Открываем чат с ${rawName} в M+...`);
}

async function acceptFriendRequest(idx, fromUid) {
    if (fromUid && window.FB_FriendshipsManager && typeof window.FB_FriendshipsManager.acceptRequest === 'function') {
        await window.FB_FriendshipsManager.acceptRequest(fromUid);
    }
    if (state.player.pendingFriendRequests) {
        state.player.pendingFriendRequests.splice(idx, 1);
    }
    saveState();
    playSound('win');
    tgHaptic('success');
    showToast(`Заявка в друзья принята! 🤝`);
    renderFriendsModalContent();
}

async function rejectFriendRequest(idx, fromUid) {
    if (fromUid && window.FB_FriendshipsManager && typeof window.FB_FriendshipsManager.declineRequest === 'function') {
        await window.FB_FriendshipsManager.declineRequest(fromUid);
    }
    if (state.player.pendingFriendRequests) {
        state.player.pendingFriendRequests.splice(idx, 1);
    }
    saveState();
    playSound('tick');
    renderFriendsModalContent();
}

// ========================================================
// 5. ЭКРАН «АВТОКЛУБ И СИНДИКАТ» (ФИКС ВЕРСТКИ КАТАЛОГА)
// ========================================================
function openClubModal(initialSubTab = 'my_club') {
    clubActiveSubTab = initialSubTab;
    let modal = document.getElementById('modalClubCenter');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalClubCenter';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    renderClubModalContent();
    modal.style.display = 'flex';
    modal.classList.add('active');
    playSound('tick');
}

function closeClubModal() {
    const modal = document.getElementById('modalClubCenter');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    playSound('tick');
    renderLifeScreen();
}

function renderClubModalContent() {
    const modal = document.getElementById('modalClubCenter');
    if (!modal) return;

    const player = state.player || {};
    const curClubId = player.club?.id || player.club || 'sts';
    const currentClub = DEFAULT_CLUBS_CATALOG.find(c => c.id === curClubId) || DEFAULT_CLUBS_CATALOG[0];

    let subContent = '';
    if (clubActiveSubTab === 'my_club') {
        subContent = `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 20%, rgba(192,132,252,0.22), #090e18); border: 1.5px solid var(--purple); border-radius:14px;">
                <div style="font-size:36px; line-height:1; margin-bottom:4px;">${currentClub.icon}</div>
                <b class="text-xs color-purple" style="font-size:14px;">[${currentClub.tag}] ${currentClub.name}</b>
                <div class="sub-label mt-1" style="font-size:9px; color:#cbd5e1;">Лидер: <b>${currentClub.leader}</b> • Участников: <b>${currentClub.membersCount} чел.</b></div>
                <div class="sub-label mt-1 font-bold color-green" style="font-size:10px;">Капитал клуба: ${currentClub.totalCapital.toLocaleString()} ₽</div>
            </div>

            <div class="sub-label mb-1 font-bold" style="font-size:9.5px; color:#c084fc; text-transform:uppercase; letter-spacing:0.3px;">
                <i class="fa-solid fa-sparkles mr-1"></i> Особенности & Перки клуба:
            </div>
            <div class="space-y-1 mb-3">
                ${currentClub.perks.map(p => `
                    <div class="p-2 flex-gap" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.06); align-items:flex-start;">
                        <span style="font-size:16px; line-height:1; margin-top:1px;">${p.icon}</span>
                        <div>
                            <b class="text-xs color-main" style="font-size:10.5px;">${p.title}</b>
                            <div class="sub-label" style="font-size:8.5px; line-height:1.3; color:#94a3b8;">${p.desc}</div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="grid-2" style="gap:6px;">
                <button onclick="inviteFriendToClubPrompt()" class="btn btn-cyan btn-sm font-bold" style="font-size:9.5px; padding:8px 0;">
                    <i class="fa-solid fa-user-plus mr-1"></i> Позвать друга
                </button>
                <button onclick="switchClubSubTab('catalog')" class="btn btn-dark btn-sm" style="font-size:9.5px; padding:8px 0;">
                    <i class="fa-solid fa-arrows-rotate mr-1"></i> Сменить клуб
                </button>
            </div>
        `;
    } else if (clubActiveSubTab === 'catalog') {
        subContent = `
            <div class="sub-label mb-2" style="font-size:9px;">Выберите автоклуб для вступления. Бонусы и перки активируются сразу:</div>
            <div class="space-y-2 mb-2" style="max-height: 280px; overflow-y: auto;">
                ${DEFAULT_CLUBS_CATALOG.map(c => {
                    const isMy = c.id === currentClub.id;
                    return `
                        <div class="p-2" style="background:#090e18; border:1px solid ${isMy ? 'var(--purple)' : 'rgba(255,255,255,0.06)'}; border-radius:10px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:4px;">
                                <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
                                    <span style="font-size:20px; flex-shrink:0;">${c.icon}</span>
                                    <div style="min-width:0; flex:1;">
                                        <b class="text-xs color-main" style="font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">[${c.tag}]${c.name}</b>
                                        <div class="sub-label" style="font-size:8px; color:#94a3b8;">${c.membersCount} участников</div>
                                    </div>
                                </div>
                                <div style="flex-shrink:0;">
                                    ${isMy ? `<span class="tag-badge bg-tag-purple" style="font-size:7.5px;">МОЙ КЛУБ</span>` : `
                                        <button onclick="joinClubAction('${c.id}')" class="btn btn-purple btn-sm life-btn-auto" style="font-size:9px;">
                                            Вступить
                                        </button>
                                    `}
                                </div>
                            </div>
                            <div class="sub-label" style="font-size:8.5px; color:#cbd5e1; line-height:1.3;">${c.desc}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            <button onclick="switchClubSubTab('create')" class="btn btn-cyan btn-sm w-full font-bold" style="font-size:10px; padding:8px 0;">
                <i class="fa-solid fa-plus mr-1"></i> Зарегистрировать свой клуб
            </button>
        `;
    } else if (clubActiveSubTab === 'create') {
        subContent = `
            <div class="glass-card mb-2 p-2" style="background:#090e18; border-color:var(--cyan); border-radius:10px;">
                <div class="sub-label text-xs mb-1">Регистрация в Едином Реестре Автоклубов:</div>
                <div class="sub-label" style="font-size:8.5px; color:#cbd5e1;">Стоимость: <b>1 500 000 ₽ + 10 ⭐</b> (требуется 10+ уровень).</div>
            </div>

            <div class="space-y-2 mb-3">
                <div>
                    <span class="sub-label" style="font-size:9px;">Название клуба:</span>
                    <input type="text" id="newClubNameInput" class="chat-input mt-1" placeholder="Например: Syndicate Trade Club" maxlength="28" style="font-size:11px; padding:7px 10px;">
                </div>
                <div>
                    <span class="sub-label" style="font-size:9px;">Тег клуба (2-4 символа):</span>
                    <input type="text" id="newClubTagInput" class="chat-input mt-1" placeholder="STC" maxlength="4" style="font-size:11px; padding:7px 10px; text-transform:uppercase;">
                </div>
            </div>

            <div class="grid-2" style="gap:6px;">
                <button onclick="confirmCreateClubAction()" class="btn btn-green btn-sm font-bold" style="font-size:10px; padding:8px 0;">
                    Создать за 1.5M ₽
                </button>
                <button onclick="switchClubSubTab('catalog')" class="btn btn-dark btn-sm" style="font-size:10px; padding:8px 0;">
                    Назад к списку
                </button>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal-box" style="max-width: 430px; background: #070b14; border: 1px solid rgba(192,132,252,0.4); border-radius: 16px;">
            <div class="flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <span style="font-size:18px;">🚩</span>
                    <b class="text-xs color-purple" style="font-size:13px;">Штаб Автоклуба</b>
                </div>
                <button onclick="closeClubModal()" class="btn btn-dark btn-auto btn-sm" style="padding:4px 8px;">✕</button>
            </div>

            <div style="display:flex; gap:6px; margin-bottom:12px; overflow-x:auto;">
                <button onclick="switchClubSubTab('my_club')" class="social-sub-pill ${clubActiveSubTab === 'my_club' ? 'active' : ''}">
                    Мой Клуб
                </button>
                <button onclick="switchClubSubTab('catalog')" class="social-sub-pill ${clubActiveSubTab === 'catalog' ? 'active' : ''}">
                    Каталог Клубов
                </button>
                <button onclick="switchClubSubTab('create')" class="social-sub-pill ${clubActiveSubTab === 'create' ? 'active' : ''}">
                    Создать
                </button>
            </div>

            ${subContent}

            <button onclick="closeClubModal()" class="btn btn-dark w-full mt-3 font-bold btn-sm">
                Закрыть
            </button>
        </div>
    `;
}

function switchClubSubTab(tab) {
    clubActiveSubTab = tab;
    playSound('tick');
    renderClubModalContent();
}

function joinClubAction(clubId) {
    const club = DEFAULT_CLUBS_CATALOG.find(c => c.id === clubId);
    if (!club) return;
    if (!state.player) state.player = {};
    state.player.club = { id: club.id, name: club.name, tag: club.tag };
    saveState();
    playSound('win');
    tgHaptic('success');
    showToast(`Вы вступили в автоклуб «[${club.tag}] ${club.name}»! Перки активированы 🔥`);
    switchClubSubTab('my_club');
}

function inviteFriendToClubPrompt() {
    const friends = state.friendsList || [];
    if (friends.length === 0) {
        showToast("У вас пока нет друзей для приглашения. Добавьте их во вкладке «Друзья».");
        return;
    }
    const friendName = prompt(`Введите имя друга для приглашения в клуб (из ваших друзей: ${friends.map(f => f.name).join(', ')}):`);
    if (friendName && friendName.trim()) {
        inviteFriendToClubAction(friendName.trim());
    }
}

function inviteFriendToClubAction(friendName) {
    playSound('win');
    tgHaptic('success');
    showToast(`Приглашение в клуб отправлено игроку «${friendName}»! 🚩`);
}

function confirmCreateClubAction() {
    const nameInput = document.getElementById('newClubNameInput');
    const tagInput = document.getElementById('newClubTagInput');
    if (!nameInput || !nameInput.value.trim() || !tagInput || !tagInput.value.trim()) {
        return showToast("Заполните название и тег клуба!");
    }

    const lvl = state.player?.level || 1;
    if (lvl < 10) return showToast("Создание клуба доступно только с 10 уровня!");

    const cash = state.player?.cash || 0;
    const stars = state.player?.stars || 0;
    if (cash < 1500000) return showToast("Не хватает рублей (нужно 1,500,000 ₽)!");
    if (stars < 10) return showToast("Не хватает банкнот (нужно 10 ⭐)!");

    state.player.cash -= 1500000;
    state.player.stars -= 10;

    const newClub = {
        id: 'user_club_' + Date.now(),
        name: nameInput.value.trim(),
        tag: tagInput.value.trim().toUpperCase(),
        icon: '👑',
        leader: state.player.name || 'Вы',
        membersCount: 1,
        totalCapital: state.player.cash,
        desc: 'Собственный независимый автоклуб перекупов.',
        perks: [
            { icon: '📈', title: 'Синдикат-Сбыт', desc: '+6% к цене продажи авто на площадке' },
            { icon: '🛠️', title: 'Гаражное братство', desc: '-15% на закупку запчастей' }
        ]
    };

    DEFAULT_CLUBS_CATALOG.push(newClub);
    state.player.club = { id: newClub.id, name: newClub.name, tag: newClub.tag };

    saveState();
    updateHeaderUI();
    playSound('win');
    tgHaptic('success');
    showToast(`Клуб «[${newClub.tag}] ${newClub.name}» успешно зарегистрирован! 👑`);
    switchClubSubTab('my_club');
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
window.openFriendsModal = openFriendsModal;
window.closeFriendsModal = closeFriendsModal;
window.switchFriendsSubTab = switchFriendsSubTab;
window.openClubModal = openClubModal;
window.closeClubModal = closeClubModal;
window.switchClubSubTab = switchClubSubTab;
window.joinClubAction = joinClubAction;
window.inviteFriendToClubAction = inviteFriendToClubAction;
window.confirmCreateClubAction = confirmCreateClubAction;
window.submitSearchFriendAction = submitSearchFriendAction;
window.sendFriendRequestTo = sendFriendRequestTo;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.challengePlayerFromLife = challengePlayerFromLife;

console.log('[☕ life.js v1.5.0] Боты полностью удалены: честный Зал Славы и живой поиск Firestore подключены ✓');

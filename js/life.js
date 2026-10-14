// ========================================================
// js/life.js — РАЗДЕЛ «ЖИЗНЬ ПЕРЕКУПА», РАЦИОН И ТОНУС (v0.7.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Полный редизайн: удобный рацион, активности перекупа,
// спортзал, баня, городской live-эфир и управление тонусом.
// ========================================================

let lifeActiveFoodCategory = 'all';

// Базовый каталог рационов питания на случай отсутствия внешней базы
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

function renderLifeScreen() {
    const tab = document.getElementById('tabLife');
    if (!tab) return;

    let hunger = state.player?.hunger !== undefined ? state.player.hunger : 80;
    let mood = state.player?.mood !== undefined ? state.player.mood : 85;
    let karma = state.player?.karma !== undefined ? state.player.karma : 50;
    let curDietId = state.player?.diet || 'shaurma';

    const diets = (typeof DIETS !== 'undefined' && Array.isArray(DIETS) && DIETS.length > 0) ? DIETS : DEFAULT_LIFE_DIETS;
    let dietObj = diets.find(d => d.id === curDietId);
    let dietTitle = dietObj ? dietObj.name : 'Шаурма на автовокзале';

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
        <!-- ВЕРХНИЙ ДАШБОРД САМОЧУВСТВИЯ ПЕРЕКУПА -->
        <div class="glass-card mb-3 p-3" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.12), #090e18); border-color: rgba(0, 230, 118, 0.35);">
            <div class="flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <div class="chat-avatar-circle" style="font-size:20px; background:#0e1e24; border:1.5px solid var(--green);">☕</div>
                    <div>
                        <h3 class="font-bold text-xs color-green" style="font-size:14px;">Жизненный Тонус</h3>
                        <div class="sub-label" style="font-size:9.5px;">Самочувствие влияет на успех у капота, терпение клиентов и скорость торга</div>
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
                    <div class="rp-bar-bg" style="height:8px;">
                        <div class="rp-bar-fill fill-hunger" style="width:${hunger}%;"></div>
                    </div>
                </div>

                <div>
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label"><i class="fa-solid fa-masks-theater color-cyan mr-1"></i> Кураж и Настроение:</span>
                        <b class="${mood < 40 ? 'color-red' : 'color-cyan'}">${mood}%</b>
                    </div>
                    <div class="rp-bar-bg" style="height:8px;">
                        <div class="rp-bar-fill fill-mood" style="width:${mood}%;"></div>
                    </div>
                </div>
            </div>

            <div class="p-2 flex-between mt-2" style="background:#060a12; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                <div>
                    <span class="sub-label" style="font-size:9px;">Текущий базовый рацион:</span>
                    <div class="font-bold text-xs color-amber">${dietTitle}</div>
                </div>
                <button onclick="document.getElementById('lifeFoodSectionAnchor').scrollIntoView({behavior:'smooth'})" class="btn btn-dark btn-auto btn-sm" style="font-size:10px; padding:4px 10px;">
                    Сменить рацион ↓
                </button>
            </div>
        </div>

        <!-- АКТИВНОСТИ ПЕРЕКУПА (СПОРТЗАЛ, БАНЯ, КАРТИНГ) -->
        <div class="glass-card mb-3 p-3">
            <div class="flex-between mb-2">
                <b class="text-xs color-cyan" style="font-size:13px;"><i class="fa-solid fa-dumbbell mr-1"></i> Активности и Отдых</b>
                <span class="tag-badge bg-tag-cyan">Разгрузка</span>
            </div>
            <div class="sub-label mb-2" style="font-size:10px;">Позволяют быстро поднять кураж, снять стресс после сорванных сделок и поднять авторитет.</div>

            <div class="space-y-2" id="lifeActivitiesList"></div>
        </div>

        <!-- КАРМА И БЛАГОТВОРИТЕЛЬНОСТЬ -->
        <div class="glass-card mb-3 p-3">
            <div class="flex-between mb-2">
                <b class="text-xs color-green" style="font-size:13px;"><i class="fa-solid fa-handshake-angle mr-1"></i> Карма и Городская репутация</b>
                <span class="tag-badge bg-tag-green">Карма: ${karma}%</span>
            </div>
            <p class="sub-label mb-2" style="font-size:10px;">Высокая карма ускоряет поток покупателей на площадке и защищает от внезапных проверок ДПС.</p>
            
            <div class="grid-2 mb-2">
                <button onclick="roadAssistanceAction()" class="btn btn-dark btn-sm">
                    🛞 Помощь на трассе (-10 ⛽)
                </button>
                <button onclick="donatePartsToMechanic()" class="btn btn-dark btn-sm">
                    🔩 Запчасти СТО (45k ₽ | +1 🤝)
                </button>
            </div>
            <button onclick="bigCharityDonate()" class="btn btn-green w-full">
                🕊 Меценатство 150,000 ₽ (+25 Кармы)
            </button>
        </div>

        <!-- ГОРОДСКОЙ ЭФИР / ЧАТ ПЕРЕКУПОВ -->
        <div class="live-chat-card mb-3 p-3">
            <div class="flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <i class="fa-solid fa-satellite-dish color-cyan"></i>
                    <h4 class="font-bold text-xs" style="font-size:13px;">Городской Радиоэфир</h4>
                </div>
                <span class="tag-badge bg-tag-cyan">LIVE CB-РАЦИЯ</span>
            </div>
            <div id="lifeChatFeed" class="chat-messages-container mb-2" style="max-height:160px; overflow-y:auto;"></div>
            <div class="chat-compose-box">
              <input type="text" id="feedMessageInput" class="chat-input" placeholder="Написать в эфир авторынка..." maxlength="100">
              <button onclick="sendChatMessageFromInput()" class="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </div>

        <!-- УДОБНЫЙ КАТАЛОГ РАЦИОНА ПИТАНИЯ -->
        <div class="glass-card mb-3 p-3" id="lifeFoodSectionAnchor">
            <div class="flex-between mb-2">
                <div>
                    <b class="text-xs color-amber" style="font-size:13px;"><i class="fa-solid fa-utensils mr-1"></i> Рацион и Доставка Еды</b>
                    <div class="sub-label" style="font-size:9.5px;">Списывается ежедневно в 00:00 или принимается разово для быстрого восстановления</div>
                </div>
            </div>

            <!-- Фильтры по типу еды -->
            <div class="grid-4 mb-2">
                <button onclick="filterLifeFood('all')" class="btn ${lifeActiveFoodCategory === 'all' ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:9.5px;">Все</button>
                <button onclick="filterLifeFood('fast')" class="btn ${lifeActiveFoodCategory === 'fast' ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:9.5px;">Фаст</button>
                <button onclick="filterLifeFood('home')" class="btn ${lifeActiveFoodCategory === 'home' ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:9.5px;">Домашняя</button>
                <button onclick="filterLifeFood('restaurant')" class="btn ${lifeActiveFoodCategory === 'restaurant' ? 'btn-amber' : 'btn-dark'} btn-sm" style="font-size:9.5px;">Ресторан</button>
            </div>

            <div class="space-y-2" id="lifeFoodListContainer"></div>
        </div>
    `;

    renderLifeActivities();
    renderLifeFoodList();
    renderLifeChat();
}

// ========================================================
// АКТИВНОСТИ И ОТДЫХ
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
                <b class="text-xs color-cyan">${act.name}</b>
                <div class="sub-label" style="font-size:9.5px; line-height:1.35;">${act.desc}</div>
                <div class="sub-label mt-1" style="font-size:8.5px; color:var(--green);">
                    Эффект: Настроение +${act.mood}% | Карма +${act.karma || 0}
                </div>
            </div>
            <button onclick="doLifeActivityAction('${act.id}')" class="btn btn-cyan btn-sm btn-auto" style="min-width:95px;">
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

// ========================================================
// РАЦИОН И ЕДА
// ========================================================
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
                    <b class="text-xs ${isCurrent ? 'color-green' : 'color-main'}" style="font-size:12px;">${d.name}</b>
                    ${isCurrent ? '<span class="tag-badge bg-tag-green">АКТИВНЫЙ РАЦИОН</span>' : ''}
                </div>
                <b class="price-val text-xs color-green">${d.cost === 0 ? 'Бесплатно' : `${d.cost.toLocaleString()} ₽`}</b>
            </div>

            <div class="sub-label mb-2" style="font-size:9.5px; line-height:1.35;">${d.desc}</div>

            <div class="flex-between text-xs mb-2 p-1" style="background:#04070e; border-radius:6px;">
                <span>Сытость: <b class="color-amber">+${d.hunger}%</b></span>
                <span>Настроение: <b class="${moodColor}">${moodSign}</b></span>
            </div>

            <div class="grid-2">
                <button onclick="setBaseDietAction('${d.id}')" class="btn ${isCurrent ? 'btn-dark opacity-50' : 'btn-dark'} btn-sm" ${isCurrent ? 'disabled' : ''}>
                    ${isCurrent ? 'Выбрано на каждый день ✓' : 'Сделать базовым'}
                </button>
                <button onclick="eatFoodOnceAction('${d.id}')" class="btn btn-green btn-sm">
                    Перекусить сейчас 🍽️
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

// ========================================================
// БЛАГОТВОРИТЕЛЬНОСТЬ И ПОМОЩЬ
// ========================================================
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
    openVerdictModal(
        "БЛАГОТВОРИТЕЛЬНОСТЬ ПЕРЕКУПА 🕊️",
        "Вы профинансировали ремонт детского автогородка и помогли ветеранам автоспорта!\nКарма выросла на +25! Покупатели на авторынке относятся к вам с глубоким уважением.",
        true,
        cost
    );
    renderLifeScreen();
}

// ========================================================
// ГОРОДСКОЙ ЭФИР И ЧАТ
// ========================================================
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
        <div class="chat-msg ${isWarn ? 'msg-seller' : 'msg-player'}" style="margin-bottom:4px; font-size:10.5px; ${isWarn ? 'border-color:var(--red); color:#fca5a5;' : ''}">
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
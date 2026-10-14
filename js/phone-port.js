// ========================================================
// js/phone-port.js — МОРСКОЙ ПОРТ, ТЕРМИНАЛ И STORAGE WARS 2.0 (v1.2.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.2.0:
//   - Встроенный fallback каталогов, если data_activities.js не загрузился
//   - Диагностика в консоль при старте
//   - Защита от undefined везде
//   - Улучшена анимация шкалы доминирования Storage Wars
//   - Звук на ударах молотка
// ========================================================

const AppPort = {
    activeSubTab: 'direct', // 'direct' | 'wars'

    // Состояние одиночного торга с брокером
    currentDeal: null,
    endoscopeInspected: false,
    endoscopeClue: null,

    // Состояние живого аукциона Storage Wars
    activeAuction: null,
    auctionTimerInterval: null,

    // --------------------------------------------------------
    // ВСТРОЕННЫЙ FALLBACK КАТАЛОГ (если data_activities.js упал)
    // --------------------------------------------------------
    _fallbackContainers: [
        {
            id: 'fallback_japan',
            name: 'Японский Контейнер (USS Tokyo)',
            title: 'Японский Контейнер (USS Tokyo)',
            cost: 350000,
            reqStars: 5,
            reqLvl: 10,
            country: 'JAPAN',
            flagEmoji: '🇯🇵',
            auctionHouse: 'USS Tokyo / Kobe Port',
            auctionGrade: 'Grade 4.5B',
            desc: 'Опечатанный морской контейнер из порта Кобе. Дроп: JDM легенды, турбо-седаны и архивные знаки Токио.',
            possibleCars: ["Toyota Mark II (JZX90)", "Toyota Chaser (X100)", "Yamaha MT-07", "Nissan Silvia S13"],
            lootPool: [
                { name: "Комплект кованых дисков Volk TE37", cashVal: 95000, emoji: "✨" },
                { name: "Японский номер префектуры Синагава", cashVal: 130000, plateStr: "品川 500 あ 77-77", emoji: "🏷️" }
            ],
            img: 'assets/containers/japan.jpg',
            fallback: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80'
        },
        {
            id: 'fallback_europe',
            name: 'Европейский Контейнер (BCA Germany)',
            title: 'Европейский Контейнер (BCA Germany)',
            cost: 650000,
            reqStars: 8,
            reqLvl: 14,
            country: 'GERMANY',
            flagEmoji: '🇩🇪',
            auctionHouse: 'BCA Autoauktionen Hamburg',
            auctionGrade: 'Euro Clean',
            desc: 'Прямая поставка из Гамбурга. Дроп: горячие хэтчбеки GTI, турбо-вагоны RS, баварские седаны.',
            possibleCars: ["VW Golf VI GTI", "BMW 3 Series (G20)", "Audi A6 (C8)", "BMW E30 Coupe"],
            lootPool: [
                { name: "Диагностический планшет Launch в кейсе", cashVal: 85000, emoji: "📱" },
                { name: "Оригинальный обвес M-Performance", cashVal: 120000, emoji: "🌪️" }
            ],
            img: 'assets/containers/europe.jpg',
            fallback: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
        },
        {
            id: 'fallback_usa',
            name: 'Американский Аукцион (Copart #502)',
            title: 'Американский Аукцион (Copart #502)',
            cost: 850000,
            reqStars: 12,
            reqLvl: 18,
            country: 'USA',
            flagEmoji: '🇺🇸',
            auctionHouse: 'Copart Los Angeles Yard',
            auctionGrade: 'Salvage / Clean Title',
            desc: 'Контейнер со страхового аукциона США. Кот в мешке: от лёгкого удара по навеске до мощных маслкаров.',
            possibleCars: ["Ford Focus III", "Chevrolet Cruze", "BRP Can-Am Maverick X3", "Ford Mustang GT"],
            lootPool: [
                { name: "Драговые слики Mickey Thompson", cashVal: 75000, emoji: "🛞" },
                { name: "Калифорнийский ретро-номер 1978", cashVal: 160000, plateStr: "CALIFORNIA 777", emoji: "🏷️" }
            ],
            img: 'assets/containers/usa.jpg',
            fallback: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80'
        },
        {
            id: 'fallback_dubai',
            name: 'Эмиратский Контейнер (Dubai Al-Aweer)',
            title: 'Эмиратский Контейнер (Dubai Al-Aweer)',
            cost: 1600000,
            reqStars: 20,
            reqLvl: 25,
            country: 'UAE',
            flagEmoji: '🇦🇪',
            auctionHouse: 'Al-Aweer Auto Market Dubai',
            auctionGrade: 'VIP Royal',
            desc: 'Аукционная роскошь Эмиратов: Гелики G63, Porsche Cayenne, катера или спорткары с минимальным пробегом.',
            possibleCars: ["BMW X5 (G05)", "Mercedes G63 AMG «Гелик»", "Porsche Cayenne (PO536)", "Катер Bayliner VR5"],
            lootPool: [
                { name: "Золотые часы Rolex из бардачка", cashVal: 320000, emoji: "⌚" },
                { name: "Дубайский блатной номер «7»", cashVal: 450000, plateStr: "DUBAI 7", emoji: "💎" }
            ],
            img: 'assets/containers/dubai.jpg',
            fallback: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80'
        }
    ],

    _fallbackWarsContainers: [
        {
            id: "sw_fallback_jdm",
            title: "Контейнер Кобе #911 (Япония)",
            badge: "JDM & Турбо",
            country: "JAPAN",
            baseBid: 450000,
            maxBotBudget: 1250000,
            estValue: "700,000 — 2,200,000 ₽",
            riskLevel: "Умеренный",
            desc: "Прямой груз с аукциона USS Tokyo. Характерные золотые полки дисков Work и нетронутый интерьер.",
            possibleCars: ["Toyota Mark II (JZX90)", "Toyota Chaser (X100)", "Yamaha MT-07", "Nissan Silvia S13"],
            lootPool: [
                { name: "Кованые диски Work Meister S1", cashVal: 90000, emoji: "✨" },
                { name: "Японский номер Осака", cashVal: 110000, plateStr: "大阪 330 む 77-77", emoji: "🏷️" }
            ],
            scrapChance: 0.10,
            img: "assets/containers/japan.jpg",
            fallback: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80"
        },
        {
            id: "sw_fallback_muscle",
            title: "Контейнер Copart #502 (США)",
            badge: "Маслкары & Джипы",
            country: "USA",
            baseBid: 320000,
            maxBotBudget: 850000,
            estValue: "500,000 — 1,300,000 ₽",
            riskLevel: "Средний",
            desc: "Закрытый 40-футовый контейнер из порта Лос-Анджелеса. Сквозь щели виден широкий бампер и слой пыли.",
            possibleCars: ["Ford Focus III", "Chevrolet Cruze", "BRP Can-Am Maverick X3", "Ford Mustang GT"],
            lootPool: [
                { name: "Комплект полусликов Toyo R888R", cashVal: 65000, emoji: "🛞" },
                { name: "Пачка долларов за козырьком", cashVal: 85000, emoji: "💵" }
            ],
            scrapChance: 0.15,
            img: "assets/containers/usa.jpg",
            fallback: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80"
        }
    ],

    _fallbackBrokers: [
        {
            id: "broker_fallback",
            name: "Брокер Рашид",
            avatar: "🧔‍♂️",
            title: "Таможенный декларант порта",
            patience: 4,
            bluffChance: 0.35,
            greetings: [
                "«Контейнер только со стапеля разгрузки. Какое твоё предложение?»"
            ],
            successHaggle: [
                "«Ладно, уступаю на пошлину. Но больше не торгуюсь!»"
            ],
            failHaggle: [
                "«Меньше заявленного не отдам! У меня очередь из перекупов.»"
            ]
        }
    ],

    _fallbackBots: [
        { name: "Барыга Алик", avatar: "🧔", maxBudgetMul: 1.55, bluffChance: 0.35, aggro: "moderate",
          shouts: ["«Этот контейнер точно мой, не лезьте!»", "«Поднимаю планку!»"],
          passShouts: ["«Ценник в космос улетел, я пас...»"] },
        { name: "Мажор Влад", avatar: "🕺", maxBudgetMul: 2.20, bluffChance: 0.55, aggro: "aggressive",
          shouts: ["«Мелочь не считаю!»", "«Кто готов перебить мою ставку?»"],
          passShouts: ["«Скучно с вами, пойду в ресторан...»"] },
        { name: "Дед Михалыч", avatar: "👴", maxBudgetMul: 1.30, bluffChance: 0.15, aggro: "calm",
          shouts: ["«В моё время такие лоты за копейки брали!»", "«Прибавлю ещё немного.»"],
          passShouts: ["«Пенсия не резиновая, выхожу из торгов.»"] }
    ],

    // --------------------------------------------------------
    // ВСПОМОГАТЕЛЬНЫЕ ГЕТТЕРЫ (с fallback)
    // --------------------------------------------------------
    _getContainers() {
        if (typeof PORT_AUCTIONS_CATALOG !== 'undefined' && Array.isArray(PORT_AUCTIONS_CATALOG) && PORT_AUCTIONS_CATALOG.length > 0) {
            return PORT_AUCTIONS_CATALOG;
        }
        if (typeof CONTAINER_ITEMS !== 'undefined' && Array.isArray(CONTAINER_ITEMS) && CONTAINER_ITEMS.length > 0) {
            return CONTAINER_ITEMS;
        }
        console.warn('[Port] PORT_AUCTIONS_CATALOG не найден, использую встроенный fallback');
        return this._fallbackContainers;
    },

    _getWarsContainers() {
        if (typeof STORAGE_WARS_CONTAINERS !== 'undefined' && Array.isArray(STORAGE_WARS_CONTAINERS) && STORAGE_WARS_CONTAINERS.length > 0) {
            return STORAGE_WARS_CONTAINERS;
        }
        console.warn('[Port] STORAGE_WARS_CONTAINERS не найден, использую встроенный fallback');
        return this._fallbackWarsContainers;
    },

    _getBrokers() {
        if (typeof PORT_BROKER_PROFILES !== 'undefined' && Array.isArray(PORT_BROKER_PROFILES) && PORT_BROKER_PROFILES.length > 0) {
            return PORT_BROKER_PROFILES;
        }
        return this._fallbackBrokers;
    },

    _getBots() {
        if (typeof STORAGE_WARS_BOTS !== 'undefined' && Array.isArray(STORAGE_WARS_BOTS) && STORAGE_WARS_BOTS.length > 0) {
            try {
                return JSON.parse(JSON.stringify(STORAGE_WARS_BOTS));
            } catch (e) {
                return this._fallbackBots;
            }
        }
        return this._fallbackBots;
    },

    // --------------------------------------------------------
    // ДИАГНОСТИКА (при старте, в консоль)
    // --------------------------------------------------------
    _logDiagnostics() {
        const hasCatalog = (typeof PORT_AUCTIONS_CATALOG !== 'undefined');
        const hasWars = (typeof STORAGE_WARS_CONTAINERS !== 'undefined');
        const hasBrokers = (typeof PORT_BROKER_PROFILES !== 'undefined');
        const hasBots = (typeof STORAGE_WARS_BOTS !== 'undefined');

        console.log('[🚢 Port Diagnostics]');
        console.log('  PORT_AUCTIONS_CATALOG:', hasCatalog ? `✓ (${PORT_AUCTIONS_CATALOG.length})` : '✗ (использую fallback)');
        console.log('  STORAGE_WARS_CONTAINERS:', hasWars ? `✓ (${STORAGE_WARS_CONTAINERS.length})` : '✗ (использую fallback)');
        console.log('  PORT_BROKER_PROFILES:', hasBrokers ? `✓ (${PORT_BROKER_PROFILES.length})` : '✗ (использую fallback)');
        console.log('  STORAGE_WARS_BOTS:', hasBots ? `✓ (${STORAGE_WARS_BOTS.length})` : '✗ (использую fallback)');
    },

    // --------------------------------------------------------
    // ГЛАВНЫЙ РЕНДЕР
    // --------------------------------------------------------
    render(container) {
        if (!container) return;
        const sub = this.activeSubTab;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-cyan"><i class="fa-solid fa-ship mr-1"></i> Порт & Таможня</div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body">
                <div class="grid-2 mb-2">
                    <button onclick="AppPort.switchSubTab('direct')" class="btn ${sub === 'direct' ? 'btn-cyan' : 'btn-dark'} btn-sm">
                        <i class="fa-solid fa-boxes-packing"></i> Терминал (Торг)
                    </button>
                    <button onclick="AppPort.switchSubTab('wars')" class="btn ${sub === 'wars' ? 'btn-amber' : 'btn-dark'} btn-sm">
                        <i class="fa-solid fa-gavel"></i> Storage Wars ⚔️
                    </button>
                </div>

                <div id="portSubTabContentBox"></div>
            </div>
        `;

        if (sub === 'direct') {
            this.renderDirectTerminalContent(document.getElementById('portSubTabContentBox'));
        } else {
            this.renderStorageWarsContent(document.getElementById('portSubTabContentBox'));
        }
    },

    switchSubTab(tab) {
        if (this.auctionTimerInterval) {
            clearInterval(this.auctionTimerInterval);
            this.auctionTimerInterval = null;
        }
        this.activeSubTab = tab;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 1. ТЕРМИНАЛ ПОРТА: ОДИНОЧНЫЙ ТОРГ И ДОСМОТР ЭНДОСКОПОМ
    // ========================================================
    renderDirectTerminalContent(box) {
        if (!box) return;

        let pLvl = state.player?.level || 1;
        const containers = this._getContainers();

        if (containers.length === 0) {
            box.innerHTML = `
                <div class="glass-card text-center sub-label py-8">
                    <i class="fa-solid fa-anchor color-cyan mb-2" style="font-size:32px;"></i>
                    <div class="font-bold text-xs color-cyan mb-1">Терминал временно пуст</div>
                    <div style="font-size:10px;">Ожидается прибытие сухогрузов из Кобе и Гамбурга.</div>
                </div>
            `;
            return;
        }

        let cardsHtml = containers.map((c, idx) => {
            let reqLevel = c.reqLvl || c.minLevel || 5;
            let isLocked = pLvl < reqLevel;
            let starsTxt = c.reqStars ? ` + ${c.reqStars} ⭐` : "";
            let ticketsTxt = c.reqTickets ? ` + ${c.reqTickets} 🎫` : "";
            let countryFlag = c.flagEmoji || (c.country === 'JAPAN' ? '🇯🇵' : (c.country === 'USA' ? '🇺🇸' : (c.country === 'UAE' ? '🇦🇪' : (c.country === 'GERMANY' ? '🇩🇪' : '🚢'))));
            let gradeBadge = c.auctionGrade || c.badge || "Grade 4B";

            let btnAction = isLocked
                ? `<button class="btn btn-dark btn-sm w-full opacity-50" disabled>🔒 С ${reqLevel} уровня авторитета</button>`
                : `<button onclick="AppPort.startDirectContainerDeal(${idx})" class="btn btn-cyan btn-sm w-full">
                    <i class="fa-solid fa-handshake"></i> Торговаться у ворот (${(c.cost / 1000).toFixed(0)}k ₽${starsTxt}${ticketsTxt})
                   </button>`;

            return `
                <div class="glass-card mb-3 p-2" style="border-color: ${isLocked ? 'rgba(255,255,255,0.06)' : 'var(--border-glow)'};">
                    <div class="car-img-wrap mb-2" style="height:130px; position:relative;">
                        <img src="${c.img || ''}" class="car-img" onerror="this.onerror=null; this.src='${c.fallback || ''}';">
                        <div class="badge-tag badge-br">
                            <span class="tag-badge bg-tag-cyan">${countryFlag} ${c.country || 'PORT'}</span>
                            <span class="tag-badge bg-tag-purple ml-1">${gradeBadge}</span>
                        </div>
                    </div>

                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs color-cyan" style="font-size:12.5px;">${c.title || c.name}</b>
                            <div class="sub-label" style="font-size:9px;">${c.auctionHouse || 'Морской терминал'}</div>
                        </div>
                        <div class="text-right">
                            <span class="price-val text-xs color-green">${c.cost.toLocaleString()} ₽</span>
                        </div>
                    </div>

                    <p class="sub-label mb-2" style="font-size:9.5px; line-height:1.35;">${c.desc}</p>

                    ${btnAction}
                </div>
            `;
        }).join('');

        box.innerHTML = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.16), #090e18); border-color: var(--cyan);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-anchor"></i> Таможенный терминал Порта</b>
                    <span class="tag-badge bg-tag-green">ПРЯМЫЕ ПОСТАВКИ</span>
                </div>
                <div class="sub-label" style="font-size:9.5px;">
                    Выкуп опечатанных контейнеров у брокеров. Сбивайте таможенную пошлину и используйте видеоэндоскоп через вентиляционные щели перед оплатой!
                </div>
            </div>

            <div class="space-y-1">
                ${cardsHtml}
            </div>
        `;
    },

    startDirectContainerDeal(containerIdx) {
        const containers = this._getContainers();
        const c = containers[containerIdx];
        if (!c) return;

        const brokers = this._getBrokers();
        const broker = brokers[Math.floor(Math.random() * brokers.length)];

        let askingMarkup = 1.15 + Math.random() * 0.10;
        let startPrice = Math.round(c.cost * askingMarkup);

        this.currentDeal = {
            container: c,
            containerIdx: containerIdx,
            broker: broker,
            currentPrice: startPrice,
            initialPrice: startPrice,
            basePrice: c.cost,
            patience: broker.patience || 4,
            maxPatience: broker.patience || 4,
            isBluffing: Math.random() < (broker.bluffChance || 0.35),
            haggledTimes: 0
        };

        this.endoscopeInspected = false;
        this.endoscopeClue = null;

        this.openBrokerDealModal();
    },

    openBrokerDealModal() {
        if (!this.currentDeal) return;
        const deal = this.currentDeal;
        const c = deal.container;
        const broker = deal.broker;

        let hasEndoscope = !!(state.player?.tools && state.player.tools.endoscope);
        let endoscopeWear = state.player?.toolsWear ? (state.player.toolsWear.endoscope || 0) : 0;

        let endoscopeBtn = "";
        if (this.endoscopeInspected) {
            endoscopeBtn = `
                <div class="p-2 mb-2" style="background:rgba(0, 242, 254, 0.12); border:1px solid var(--cyan); border-radius:10px;">
                    <div class="flex-between text-xs mb-1">
                        <span class="color-cyan font-bold"><i class="fa-solid fa-video"></i> Эндоскопия через щель:</span>
                        <span class="tag-badge bg-tag-cyan">ГОТОВО</span>
                    </div>
                    <div class="sub-label" style="font-size:9.5px; line-height:1.35; color:#f1f5f9;">${this.endoscopeClue}</div>
                </div>
            `;
        } else if (hasEndoscope && endoscopeWear > 0) {
            endoscopeBtn = `
                <button onclick="AppPort.useEndoscopePeek()" class="btn btn-purple btn-sm w-full mb-2">
                    <i class="fa-solid fa-video"></i> Осмотреть щель эндоскопом (Ресурс: ${endoscopeWear})
                </button>
            `;
        } else {
            endoscopeBtn = `
                <div class="p-2 mb-2 text-center" style="background:#090e18; border-radius:8px; border:1px dashed rgba(255,255,255,0.1);">
                    <div class="sub-label" style="font-size:9px;">
                        💡 Купите видеоэндоскоп в Авто-Маркете, чтобы осматривать начинку контейнера до оплаты!
                    </div>
                </div>
            `;
        }

        let modal = document.getElementById('modalPortBrokerDeal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalPortBrokerDeal';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="chat-deal-box" style="max-width:430px;">
                <div class="flex-between mb-1">
                    <div class="modal-glow-badge"><i class="fa-solid fa-ship"></i> ВОРОТА ТЕРМИНАЛА</div>
                    <button onclick="ModalManager.close('modalPortBrokerDeal')" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                <div class="deal-car-preview-card">
                    <img src="${c.img || ''}" class="deal-car-thumb" onerror="this.onerror=null; this.src='${c.fallback || ''}';">
                    <div style="flex:1; min-width:0;">
                        <div class="font-bold text-xs color-cyan" style="font-size:12px;">${c.title || c.name}</div>
                        <div class="sub-label" style="font-size:9px;">${c.auctionHouse || 'Таможенный склад'}</div>
                        <div class="mt-1 flex-between">
                            <span class="sub-label" style="font-size:9px;">Цена с пошлиной:</span>
                            <b class="price-val color-green" id="brokerDealPriceVal" style="font-size:14px;">${deal.currentPrice.toLocaleString()} ₽</b>
                        </div>
                    </div>
                </div>

                ${endoscopeBtn}

                <div class="flex-between p-2 mb-1" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                    <div class="flex-gap" style="align-items:center;">
                        <span style="font-size:22px;">${broker.avatar}</span>
                        <div>
                            <b class="text-xs" style="font-size:11.5px;">${broker.name}</b>
                            <div class="sub-label" style="font-size:8.5px;">Терпение: <b class="color-amber" id="brokerPatienceText">${deal.patience}/${deal.maxPatience}</b></div>
                        </div>
                    </div>
                    <span class="tag-badge bg-tag-amber">Торг у капота</span>
                </div>

                <div class="chat-thread-container mb-2" id="brokerChatThread" style="max-height:140px;">
                    <div class="chat-msg msg-seller">${broker.greetings[0]}</div>
                </div>

                <div class="grid-3 mb-2" id="brokerHaggleButtons">
                    <button onclick="AppPort.attemptBrokerHaggle('damage')" class="btn btn-dark btn-sm">
                        «Тара мятая»<br><span class="color-green text-xs">-8%</span>
                    </button>
                    <button onclick="AppPort.attemptBrokerHaggle('cash')" class="btn btn-dark btn-sm">
                        «Кэш без чека»<br><span class="color-amber text-xs">-15%</span>
                    </button>
                    <button onclick="AppPort.attemptBrokerHaggle('declaration')" class="btn btn-dark btn-sm">
                        «Покажи ГТД»<br><span class="color-cyan text-xs">Блеф</span>
                    </button>
                </div>

                <div class="grid-2">
                    <button onclick="AppPort.confirmBuyContainerDirect()" class="btn btn-green btn-sm">
                        Оплатить и вскрыть 🚢
                    </button>
                    <button onclick="ModalManager.close('modalPortBrokerDeal')" class="btn btn-dark btn-sm">
                        Отказаться
                    </button>
                </div>
            </div>
        `;

        ModalManager.open('modalPortBrokerDeal', { closeOthers: true });
        if (typeof playSound === 'function') playSound('tick');
    },

    useEndoscopePeek() {
        if (!this.currentDeal || this.endoscopeInspected) return;

        let wear = state.player?.toolsWear ? (state.player.toolsWear.endoscope || 0) : 0;
        if (wear <= 0) return showToast("Видеоэндоскоп разряжен! Откалибруйте его в Авто-Маркете.");

        state.player.toolsWear.endoscope = Math.max(0, wear - 1);
        this.endoscopeInspected = true;

        if (typeof saveState === 'function') saveState();

        const c = this.currentDeal.container;
        const possible = c.possibleCars || ["Проект"];

        let rollClue = Math.random();
        if (rollClue < 0.75) {
            let guessedCar = possible[Math.floor(Math.random() * possible.length)];
            let conditionGuess = this.currentDeal.isBluffing
                ? "Сквозь щель видны следы сильного замятия лонжерона и выбитые стекла!"
                : "Зонд зафиксировал чистый хром, кованые диски и нетронутый кожаный салон!";
            this.endoscopeClue = `Камера зафиксировала очертания <b>${guessedCar}</b>. ${conditionGuess}`;
        } else {
            this.endoscopeClue = "Внутри пыль и полумрак. Удалось разглядеть только спортивный низкий клиренс и широкие полуслики на задней оси.";
        }

        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('medium');
        showToast("Эндоскоп активирован! Скрытый осмотр завершён.");

        this.openBrokerDealModal();
    },

    attemptBrokerHaggle(type) {
        if (!this.currentDeal) return;
        const deal = this.currentDeal;
        const broker = deal.broker;
        const thread = document.getElementById('brokerChatThread');

        if (deal.patience <= 0) {
            showToast("Брокер больше не намерен сбивать цену!");
            return;
        }

        deal.patience -= 1;
        const pEl = document.getElementById('brokerPatienceText');
        if (pEl) pEl.innerText = `${deal.patience}/${deal.maxPatience}`;

        let success = false;
        let delta = 0;
        let playerMsg = "";
        let brokerMsg = "";

        if (type === 'damage') {
            playerMsg = "«Контейнер с глубокими вмятинами, на углах коррозия. Было залитие морской водой, скидывай 8%!»";
            success = Math.random() < 0.70;
            if (success) {
                delta = Math.round(deal.currentPrice * 0.08);
                brokerMsg = broker.successHaggle?.[0] || "«Ладно, сделаю скидку на повреждения обшивки.»";
            } else {
                brokerMsg = "«Морской контейнер полностью герметичен! Никаких скидок за царапины.»";
            }
        } else if (type === 'cash') {
            playerMsg = "«Забираю прямо сейчас за наличку без проволочек и досмотра. Минус 15% и по рукам!»";
            success = Math.random() < 0.50;
            if (success) {
                delta = Math.round(deal.currentPrice * 0.15);
                brokerMsg = broker.successHaggle?.[1] || "«Убедил. Быстрый оборот на терминале мне на руку.»";
            } else {
                brokerMsg = "«У меня и так очередь из перекупов с чемоданами наличных! Мало предлагаешь.»";
            }
        } else if (type === 'declaration') {
            playerMsg = "«Покажи ГТД и радиологический протокол! Не темни, я вижу серую поставку.»";
            if (deal.isBluffing) {
                success = true;
                delta = Math.round(deal.currentPrice * 0.18);
                brokerMsg = "«Тише ты, не поднимай шум на рампе... Скину 18%, только забирай без лишних бумаг!»";
            } else {
                success = false;
                brokerMsg = "«Вот синяя таможенная печать и акт инспектора! Всё кристально чисто.»";
            }
        }

        if (success && delta > 0) {
            deal.currentPrice = Math.max(deal.basePrice * 0.75, deal.currentPrice - delta);
            deal.haggledTimes++;
            const pvEl = document.getElementById('brokerDealPriceVal');
            if (pvEl) pvEl.innerText = `${deal.currentPrice.toLocaleString()} ₽`;

            if (thread) {
                thread.innerHTML += `
                    <div class="chat-msg msg-player">${playerMsg}</div>
                    <div class="chat-msg msg-seller">${brokerMsg} (-${delta.toLocaleString()} ₽)</div>
                `;
                thread.scrollTop = thread.scrollHeight;
            }
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');
        } else {
            if (thread) {
                thread.innerHTML += `
                    <div class="chat-msg msg-player">${playerMsg}</div>
                    <div class="chat-msg msg-seller" style="border-color:var(--red); color:#fca5a5;">${brokerMsg}</div>
                `;
                thread.scrollTop = thread.scrollHeight;
            }
            if (typeof tgHaptic === 'function') tgHaptic('warning');
        }

        if (deal.patience <= 0) {
            const btns = document.getElementById('brokerHaggleButtons');
            if (btns) btns.innerHTML = `<div class="sub-label color-red font-bold text-center py-2 w-full">🚫 Терпение брокера исчерпано. Торг закрыт!</div>`;
        }
    },

    confirmBuyContainerDirect() {
        if (!this.currentDeal) return;
        const deal = this.currentDeal;
        const c = deal.container;
        const finalPrice = deal.currentPrice;

        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;
        let tickets = state.player?.expressTickets || 0;
        let reqStars = c.reqStars || 0;
        let reqTickets = c.reqTickets || 0;

        if (cash < finalPrice) return showToast("Не хватает денег на выкуп контейнера!");
        if (stars < reqStars) return showToast(`Нужно ${reqStars} Stars ⭐!`);
        if (tickets < reqTickets) return showToast(`Нужно ${reqTickets} Билетов 🎫!`);

        state.player.cash -= finalPrice;
        if (reqStars > 0) state.player.stars -= reqStars;
        if (reqTickets > 0) state.player.expressTickets -= reqTickets;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Выкуп контейнера (${c.country || 'Port'})`, finalPrice, false);
        }

        ModalManager.close('modalPortBrokerDeal');
        this.unpackContainerContents(c, finalPrice);
    },

    // ========================================================
    // 2. STORAGE WARS 2.0: ЖИВОЙ АУКЦИОН
    // ========================================================
    renderStorageWarsContent(box) {
        if (!box) return;

        let pLvl = state.player?.level || 1;
        const containers = this._getWarsContainers();

        if (containers.length === 0) {
            box.innerHTML = `
                <div class="glass-card text-center sub-label py-8">
                    <i class="fa-solid fa-gavel color-amber mb-2" style="font-size:32px;"></i>
                    <div class="font-bold text-xs color-amber mb-1">Аукцион временно закрыт</div>
                    <div style="font-size:10px;">Ожидается поступление новых лотов из порта.</div>
                </div>
            `;
            return;
        }

        let listHtml = containers.map((c, idx) => {
            let reqLevel = c.minLevel || c.reqLvl || 5;
            let isLocked = pLvl < reqLevel;
            let ticketsBadge = c.reqTickets ? ` + ${c.reqTickets} 🎫` : "";
            let starsBadge = c.reqStars ? ` + ${c.reqStars} ⭐` : "";

            let btnAction = isLocked
                ? `<button class="btn btn-dark btn-sm w-full opacity-50" disabled>🔒 Доступно с ${reqLevel} уровня</button>`
                : `<button onclick="AppPort.startStorageWarsAuction(${idx})" class="btn btn-amber btn-sm w-full">
                    <i class="fa-solid fa-gavel"></i> Войти в торги с ботами (Live${ticketsBadge}${starsBadge})
                   </button>`;

            return `
                <div class="glass-card mb-3 p-2" style="border-color: ${isLocked ? 'rgba(255,255,255,0.06)' : 'var(--amber)'};">
                    <div class="car-img-wrap mb-2" style="height:125px; position:relative;">
                        <img src="${c.img || ''}" class="car-img" onerror="this.onerror=null; this.src='${c.fallback || ''}';">
                        <div class="badge-tag badge-br">
                            <span class="tag-badge bg-tag-amber">Storage Wars</span>
                            <span class="tag-badge bg-tag-cyan ml-1">${c.country || 'PORT'}</span>
                        </div>
                    </div>

                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber" style="font-size:12.5px;">${c.title}</b>
                        <span class="price-val text-xs color-green">Старт: ${(c.baseBid || c.cost).toLocaleString()} ₽</span>
                    </div>

                    <div class="sub-label mb-2" style="font-size:9.5px; line-height:1.35;">${c.desc}</div>

                    ${btnAction}
                </div>
            `;
        }).join('');

        box.innerHTML = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(255, 179, 0, 0.16), #090e18); border-color: var(--amber);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber"><i class="fa-solid fa-gavel"></i> Битва за контейнеры: Storage Wars</b>
                    <span class="tag-badge bg-tag-amber">LIVE ТОРГИ</span>
                </div>
                <div class="sub-label" style="font-size:9.5px;">
                    Торгуйтесь в реальном времени против уличных барыг и мажоров. Следите за шкалой доминирования и не дайте перебить вашу ставку до третьего удара молотка!
                </div>
            </div>

            <div class="space-y-1">
                ${listHtml}
            </div>
        `;
    },

    startStorageWarsAuction(idx) {
        const containers = this._getWarsContainers();
        const c = containers[idx];
        if (!c) return;

        let pLvl = state.player?.level || 1;
        let reqLevel = c.minLevel || c.reqLvl || 5;
        if (pLvl < reqLevel) {
            return showToast(`Этот аукцион открывается с ${reqLevel} уровня!`);
        }

        let tickets = state.player?.expressTickets || 0;
        let reqTickets = c.reqTickets || 0;
        if (reqTickets > 0 && tickets < reqTickets) {
            return showToast(`Для участия в торгах нужно ${reqTickets} Билетов 🎫!`);
        }

        let stars = state.player?.stars || 0;
        let reqStars = c.reqStars || 0;
        if (reqStars > 0 && stars < reqStars) {
            return showToast(`Нужно ${reqStars} Stars ⭐!`);
        }

        let bots = this._getBots();
        let startBid = c.baseBid || c.cost || 300000;

        this.activeAuction = {
            container: c,
            currentBid: startBid,
            highestBidder: "Аукционист Порта",
            isPlayerLeading: false,
            timeLeft: 14,
            hammerStrikes: 0,
            bots: bots,
            chatLog: [
                { from: "auctioneer", name: "Аукционист", text: `Открываем торги за лот «${c.title}». Стартовая цена: ${startBid.toLocaleString()} ₽!` }
            ]
        };

        this.openStorageWarsAuctionModal();
    },

    openStorageWarsAuctionModal() {
        if (!this.activeAuction) return;
        const auc = this.activeAuction;
        const c = auc.container;

        let modal = document.getElementById('modalStorageWars');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalStorageWars';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-box text-center" style="max-width:430px; border-color:var(--amber); padding:14px;">
                <div class="flex-between mb-1">
                    <div class="modal-glow-badge" style="color:var(--amber); border-color:var(--amber);"><i class="fa-solid fa-gavel"></i> STORAGE WARS LIVE</div>
                    <button onclick="AppPort.closeStorageWarsModal()" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                <div class="car-img-wrap mb-2" style="height:115px; border-radius:10px;">
                    <img src="${c.img || ''}" class="car-img" onerror="this.onerror=null; this.src='${c.fallback || ''}';">
                </div>

                <h3 class="font-bold text-xs color-amber mb-2" style="font-size:13px;">${c.title}</h3>

                <div id="swDominanceStatusBox" class="p-2 mb-2 ${auc.isPlayerLeading ? 'sw-leading-active' : 'sw-outbid-alert'}">
                    <div class="flex-between text-xs font-bold">
                        <span id="swDominanceText">${auc.isPlayerLeading ? '🟢 ВАША СТАВКА ЛИДИРУЕТ!' : '🚨 СТАВКА ПЕРЕБИТА! ВЫ ПРОИГРЫВАЕТЕ'}</span>
                        <span class="tag-badge ${auc.isPlayerLeading ? 'bg-tag-green' : 'bg-tag-red'}" id="swLeaderTag">${auc.isPlayerLeading ? 'ЛИДЕР' : 'ПЕРЕБИТО'}</span>
                    </div>
                </div>

                <div class="grid-2 mb-2" style="gap:8px;">
                    <div class="p-2 text-left" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                        <span class="sub-label" style="font-size:8.5px;">Текущая ставка:</span>
                        <div class="price-val color-green" id="swCurrentBidVal" style="font-size:17px;">${auc.currentBid.toLocaleString()} ₽</div>
                        <div class="sub-label" style="font-size:8.5px;">Лидер: <b class="color-cyan" id="swLeaderName">${auc.highestBidder}</b></div>
                    </div>

                    <div class="p-2 text-center" style="background:#090e18; border-radius:8px; border:1px solid var(--amber);">
                        <span class="sub-label" style="font-size:8.5px;">Удар молотка:</span>
                        <div class="price-val color-amber" id="swHammerStrikeText" style="font-size:14px; font-weight:900;">Идут торги...</div>
                        <div class="sub-label color-amber font-bold" id="swTimerNum" style="font-size:12px;">⏳ ${auc.timeLeft}с</div>
                    </div>
                </div>

                <div class="sub-label text-left mb-1" style="font-size:9px;">Лог торгов и выкрики участников:</div>
                <div class="chat-thread-container mb-2" id="swAuctionChatBox" style="max-height:110px; min-height:85px; font-size:10.5px; text-align:left;">
                    ${this.renderSwChatLinesHtml()}
                </div>

                <div class="grid-3 mb-2">
                    <button onclick="AppPort.placeSwBid(25000)" class="btn btn-amber btn-sm">+25,000 ₽</button>
                    <button onclick="AppPort.placeSwBid(50000)" class="btn btn-amber btn-sm">+50,000 ₽</button>
                    <button onclick="AppPort.placeSwBid(100000)" class="btn btn-green btn-sm">+100,000 ₽</button>
                </div>

                <button onclick="AppPort.closeStorageWarsModal()" class="btn btn-dark btn-sm w-full">Покинуть аукцион (Пас)</button>
            </div>
        `;

        ModalManager.open('modalStorageWars', { closeOthers: true });

        if (this.auctionTimerInterval) clearInterval(this.auctionTimerInterval);
        this.auctionTimerInterval = setInterval(() => {
            this.tickStorageWarsAuction();
        }, 1000);
    },

    renderSwChatLinesHtml() {
        if (!this.activeAuction) return "";
        let log = this.activeAuction.chatLog || [];
        return log.slice(-8).map(msg => {
            if (msg.from === 'auctioneer') {
                return `<div class="chat-msg" style="background:rgba(255,179,0,0.12); border-left:3px solid var(--amber); color:#fef08a; padding:4px 8px; margin-bottom:4px;"><b>🔨 ${msg.name}:</b> ${msg.text}</div>`;
            } else if (msg.from === 'player') {
                return `<div class="chat-msg msg-player" style="padding:4px 8px; margin-bottom:4px;"><b>Вы:</b> ${msg.text}</div>`;
            } else {
                return `<div class="chat-msg msg-seller" style="padding:4px 8px; margin-bottom:4px;"><b>${msg.name}:</b> ${msg.text}</div>`;
            }
        }).join('');
    },

    addSwChatMessage(from, name, text) {
        if (!this.activeAuction) return;
        if (!this.activeAuction.chatLog) this.activeAuction.chatLog = [];
        this.activeAuction.chatLog.push({ from, name, text });

        const chatBox = document.getElementById('swAuctionChatBox');
        if (chatBox) {
            chatBox.innerHTML = this.renderSwChatLinesHtml();
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    },

    placeSwBid(raiseAmount) {
        if (!this.activeAuction) return;
        const auc = this.activeAuction;
        let newBid = auc.currentBid + raiseAmount;
        let pCash = state.player?.cash || 0;

        if (pCash < newBid) {
            return showToast(`Не хватает денег для ставки ${newBid.toLocaleString()} ₽!`);
        }

        auc.currentBid = newBid;
        auc.highestBidder = state.player?.name || "Игрок";
        auc.isPlayerLeading = true;
        auc.timeLeft = Math.min(15, Math.max(8, auc.timeLeft + 4));
        auc.hammerStrikes = 0;

        this.addSwChatMessage('player', 'Вы', `Ставлю ${newBid.toLocaleString()} ₽!`);
        this.addSwChatMessage('auctioneer', 'Аукционист', `Принята новая ставка от игрока: ${newBid.toLocaleString()} ₽! Кто больше?`);

        this.updateSwAuctionDisplayUI();

        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
    },

    updateSwAuctionDisplayUI() {
        if (!this.activeAuction) return;
        const auc = this.activeAuction;

        const bidEl = document.getElementById('swCurrentBidVal');
        if (bidEl) bidEl.innerText = `${auc.currentBid.toLocaleString()} ₽`;
        const lNameEl = document.getElementById('swLeaderName');
        if (lNameEl) lNameEl.innerText = auc.highestBidder;
        const timerEl = document.getElementById('swTimerNum');
        if (timerEl) timerEl.innerText = `⏳ ${auc.timeLeft}с`;

        const domBox = document.getElementById('swDominanceStatusBox');
        const domText = document.getElementById('swDominanceText');
        const domTag = document.getElementById('swLeaderTag');

        if (domBox && domText && domTag) {
            if (auc.isPlayerLeading) {
                domBox.className = "p-2 mb-2 sw-leading-active";
                domText.innerText = "🟢 ВАША СТАВКА ЛИДИРУЕТ!";
                domTag.className = "tag-badge bg-tag-green";
                domTag.innerText = "ЛИДЕР";
            } else {
                domBox.className = "p-2 mb-2 sw-outbid-alert";
                domText.innerText = "🚨 СТАВКА ПЕРЕБИТА! ВЫ ПРОИГРЫВАЕТЕ";
                domTag.className = "tag-badge bg-tag-red";
                domTag.innerText = "ПЕРЕБИТО";
            }
        }
    },

    tickStorageWarsAuction() {
        if (!this.activeAuction) return;
        const auc = this.activeAuction;
        auc.timeLeft -= 1;

        const strikeEl = document.getElementById('swHammerStrikeText');
        if (auc.timeLeft <= 6 && auc.timeLeft > 4) {
            auc.hammerStrikes = 1;
            if (strikeEl) strikeEl.innerText = "🔨 РАЗ!";
            if (typeof playSound === 'function') playSound('tick');
        } else if (auc.timeLeft <= 4 && auc.timeLeft > 1) {
            auc.hammerStrikes = 2;
            if (strikeEl) strikeEl.innerText = "🔨 ДВА!..";
            if (typeof playSound === 'function') playSound('tick');
        } else if (auc.timeLeft > 6) {
            if (strikeEl) strikeEl.innerText = "Идут торги...";
        }

        // Боты повышают ставку
        if (auc.timeLeft > 2 && Math.random() < 0.45 && auc.bots.length > 0) {
            const eligibleBots = auc.bots.filter(b => (auc.currentBid < (auc.container.maxBotBudget || 1500000) * b.maxBudgetMul));

            if (eligibleBots.length > 0) {
                const bot = eligibleBots[Math.floor(Math.random() * eligibleBots.length)];
                let raiseStep = Math.random() < 0.6 ? 25000 : 50000;
                let botBid = auc.currentBid + raiseStep;

                auc.currentBid = botBid;
                auc.highestBidder = `${bot.avatar} ${bot.name}`;
                auc.isPlayerLeading = false;
                auc.timeLeft = Math.min(15, Math.max(7, auc.timeLeft + 3));
                auc.hammerStrikes = 0;

                let shout = (bot.shouts && bot.shouts.length > 0)
                    ? bot.shouts[Math.floor(Math.random() * bot.shouts.length)]
                    : "Поднимаю ставку!";

                this.addSwChatMessage('bot', `${bot.avatar} ${bot.name}`, `${shout} (${botBid.toLocaleString()} ₽)`);
                this.addSwChatMessage('auctioneer', 'Аукционист', `Ставку перебил ${bot.name}: ${botBid.toLocaleString()} ₽!`);

                if (typeof playSound === 'function') playSound('error');
                if (typeof tgHaptic === 'function') tgHaptic('error');
            }
        }

        this.updateSwAuctionDisplayUI();

        if (auc.timeLeft <= 0) {
            clearInterval(this.auctionTimerInterval);
            this.auctionTimerInterval = null;

            if (strikeEl) strikeEl.innerText = "🔨 ТРИ! ПРОДАНО!";
            if (typeof playSound === 'function') playSound('win');

            setTimeout(() => {
                this.finalizeStorageWarsAuction();
            }, 600);
        }
    },

    finalizeStorageWarsAuction() {
        if (!this.activeAuction) return;
        const auc = this.activeAuction;
        ModalManager.close('modalStorageWars');

        if (auc.isPlayerLeading) {
            state.player.cash -= auc.currentBid;
            let reqTickets = auc.container.reqTickets || 0;
            let reqStars = auc.container.reqStars || 0;
            if (reqTickets > 0) state.player.expressTickets = Math.max(0, (state.player.expressTickets || 0) - reqTickets);
            if (reqStars > 0) state.player.stars = Math.max(0, (state.player.stars || 0) - reqStars);

            if (typeof logBankTransaction === 'function') {
                logBankTransaction(`Storage Wars: ${auc.container.title}`, auc.currentBid, false);
            }

            showToast("🏆 МОЛОТОК УПАЛ! Вы выиграли контейнер на аукционе!");
            this.unpackContainerContents(auc.container, auc.currentBid);
        } else {
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('error');

            let winnerCleanName = String(auc.highestBidder).replace(/<[^>]*>?/gm, '');
            if (typeof openVerdictModal === 'function') {
                openVerdictModal(
                    "АУКЦИОН ЗАВЕРШЁН 🔨",
                    `Контейнер забрал участник ${winnerCleanName} за ${auc.currentBid.toLocaleString()} ₽.\nВашу ставку перебили в финале. В следующий раз повезёт!`,
                    false
                );
            }
        }

        this.activeAuction = null;
    },

    closeStorageWarsModal() {
        if (this.auctionTimerInterval) {
            clearInterval(this.auctionTimerInterval);
            this.auctionTimerInterval = null;
        }
        this.activeAuction = null;
        ModalManager.close('modalStorageWars');
    },

    // ========================================================
    // 3. ВСКРЫТИЕ КОНТЕЙНЕРА И АТОМАРНАЯ СВЯЗКА С FIRESTORE
    // ========================================================
    async unpackContainerContents(containerObj, paidPrice) {
        const possible = containerObj.possibleCars || ["Toyota Mark II (JZX90)"];
        const carName = possible[Math.floor(Math.random() * possible.length)];

        // Подбор шаблона в CAR_DATABASE
        const matchedTemplate = (typeof findCarTemplateByName === 'function')
            ? findCarTemplateByName(carName)
            : null;

        const chosenImg = (typeof getRandomCarImage === 'function')
            ? getRandomCarImage(matchedTemplate)
            : (matchedTemplate?.img || "assets/cars/economy/2101/vaz-2101.jpg");

        const chosenGallery = (typeof getCarImageList === 'function' && matchedTemplate)
            ? getCarImageList(matchedTemplate)
            : [chosenImg];

        let hasChip = Math.random() < 0.45 ? (Math.random() < 0.25 ? 2 : 1) : 0;
        let hasCoilovers = Math.random() < 0.40;
        let hasWheels = Math.random() < 0.50;
        let hasRollCage = Math.random() < 0.20;
        let hasExhaust = Math.random() < 0.55;

        let condition = Math.floor(65 + Math.random() * 32);
        if (containerObj.country === 'USA' && Math.random() < 0.30) {
            condition = Math.floor(40 + Math.random() * 25);
        }

        let initialPlate = (typeof generateCoolPlate === 'function') ? generateCoolPlate() : "А777АА 77";
        let estVal = Math.round(paidPrice * (1.35 + Math.random() * 0.45));

        const finalType = matchedTemplate?.type || 'comfort';
        const finalPower = (matchedTemplate?.power || 180) + (hasChip * 35);

        let wonCar = {
            id: "port_car_" + Date.now(),
            name: `${carName} (${containerObj.auctionGrade || 'Импорт'})`,
            type: finalType,
            power: finalPower,
            basePrice: Math.round(paidPrice * 0.9),
            price: Math.round(paidPrice * 0.9),
            baseMarketValue: estVal,
            marketValue: estVal,
            img: chosenImg,
            images: chosenGallery.length > 0 ? chosenGallery : [chosenImg],
            fallback: matchedTemplate?.fallback
                || (typeof getCategoryFallback === 'function'
                    ? getCategoryFallback(finalType)
                    : "assets/cars/comfort/polo/polo.jpg"),
            plate: initialPlate,
            customPlate: initialPlate,
            condition: condition,
            wear: {
                engine: Math.floor(75 + Math.random() * 20),
                transmission: Math.floor(75 + Math.random() * 20)
            },
            isRegisteredOnPlayer: false,
            ownershipDays: 0,
            engineTemp: 90,
            tireWear: 90,
            purchaseCost: paidPrice,
            tuning: {
                chip: hasChip,
                exhaust: hasExhaust,
                stance: hasCoilovers,
                bodykit: false,
                rollCage: hasRollCage,
                dragSlicks: false,
                hydroHandbrake: false,
                weldedDiff: false,
                steeringAngle: false,
                bucketSeats: false,
                customWheels: hasWheels,
                risk1251: hasChip * 10
            }
        };

        if (typeof window.ensureCarIdentity === 'function') {
            window.ensureCarIdentity(wonCar);
        }

        // Атомарно закрепляем госномер в облаке
        if (window.FB_Bridge && window.FB_Bridge.Plates && initialPlate && !initialPlate.includes("ТРАНЗИТ")) {
            try {
                await window.FB_Bridge.Plates.claimPlateAtomic(initialPlate, null, wonCar.id);
            } catch (e) {
                console.warn("[Port] Ошибка резерва номера карго:", e);
            }
        }

        if (typeof recalculateCarMarketValue === 'function') {
            recalculateCarMarketValue(wonCar);
        }

        const lootPool = containerObj.lootPool || [];
        const foundLoot = lootPool[Math.floor(Math.random() * lootPool.length)] || {
            name: "Набор специнструмента в багажнике",
            cashVal: 45000,
            emoji: "🧰"
        };

        state.player.cash += (foundLoot.cashVal || 0);

        if (foundLoot.plateStr) {
            let cleanLootPlate = foundLoot.plateStr;
            if (window.FB_Bridge && window.FB_Bridge.Plates) {
                await window.FB_Bridge.Plates.claimPlateAtomic(cleanLootPlate, null, null);
            }
            if (!state.ownedPlates) state.ownedPlates = [];
            state.ownedPlates.push(cleanLootPlate);
        }

        // Отправка накладной в Почту
        if (typeof window.pushToMailbox === 'function') {
            window.pushToMailbox({
                type: "car",
                title: `Автовоз: ${wonCar.name}`,
                sender: `Таможенный терминал (${containerObj.country || 'Порт'})`,
                desc: `Партия карго успешно растаможена. Выберите место стоянки: основной гараж или склад консервации. В багажнике обнаружено: ${foundLoot.name} (+${(foundLoot.cashVal || 0).toLocaleString()} ₽)!`,
                badge: "ГРУЗ ПОРТА",
                carData: wonCar
            });
        } else {
            let maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
            let curSlots = state.garage ? state.garage.length : 0;
            if (curSlots < maxSlots) {
                if (!state.garage) state.garage = [];
                state.garage.push(wonCar);
            } else {
                state.player.cash += wonCar.basePrice;
            }
        }

        let gainedXp = 150;
        if (typeof addXp === 'function') addXp(gainedXp);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        if (typeof openVerdictModal === 'function') {
            openVerdictModal(
                "ТАМОЖНЯ ОДОБРИЛА ГРУЗ! 🚢",
                `Контейнер вскрыт. Автомобиль «${wonCar.name}» погружен на автовоз и отправлен на вашу Почту!\nНаходка в багажнике оценена в +${(foundLoot.cashVal || 0).toLocaleString()} ₽.\nОпыт авторитета: +${gainedXp} XP`,
                true
            );
        }

        this.currentDeal = null;
    }
};

window.AppPort = AppPort;

// --------------------------------------------------------
// ДИАГНОСТИКА ПРИ ЗАГРУЗКЕ
// --------------------------------------------------------
setTimeout(() => {
    try {
        AppPort._logDiagnostics();
    } catch (e) {
        console.warn('[Port] Ошибка диагностики:', e);
    }
}, 1500);

console.log('[🚢 phone-port v1.2.0] Терминал и Storage Wars загружены ✓');
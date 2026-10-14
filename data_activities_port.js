// ========================================================
// data_activities_port.js — ДАННЫЕ ПОРТА И STORAGE WARS (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Изолированный модуль: контейнеры, брокеры, Storage Wars, боты.
// Обёрнут в try/catch — падение не валит остальные data-файлы.
// ========================================================

(function() {
    'use strict';

    try {
        // --------------------------------------------------------
        // 1. БРОКЕРЫ ПОРТА
        // --------------------------------------------------------
        const PORT_BROKER_PROFILES = [
            {
                id: "broker_rashid",
                name: "Брокер Рашид",
                avatar: "🧔‍♂️",
                title: "Таможенный декларант порта",
                patience: 4,
                bluffChance: 0.35,
                greetings: [
                    "«Контейнер только со стапеля разгрузки. Какое твоё предложение?»",
                    "«Документы на подписи, судно уже в нейтральных водах. Забираешь или мне звать других покупателей?»"
                ],
                successHaggle: [
                    "«Ладно, уступаю на пошлину. Но больше не торгуюсь!»",
                    "«Уговорил, оформляю скидку на растаможку.»"
                ],
                failHaggle: [
                    "«Меньше заявленного не отдам! У меня очередь из перекупов.»",
                    "«Не морочь мне голову, это эксклюзивный карго!»"
                ]
            },
            {
                id: "broker_viktor",
                name: "Инспектор Виктор",
                avatar: "👮‍♂️",
                title: "Старший таможенный агент",
                patience: 5,
                bluffChance: 0.20,
                greetings: [
                    "«Пломбы на месте, досмотр пройден формально. Ценник окончательный, но готов выслушать аргументы.»"
                ],
                successHaggle: [
                    "«Аргумент принят, скорректировал декларацию в меньшую сторону.»",
                    "«Сделаю скидку на повреждения внешнего каркаса тары.»"
                ],
                failHaggle: [
                    "«По регламенту скидка не положена. Бери или опечатываю обратно.»"
                ]
            },
            {
                id: "broker_kenji",
                name: "Кэндзи Сато",
                avatar: "🎌",
                title: "Представитель аукциона USS Tokyo",
                patience: 3,
                bluffChance: 0.50,
                greetings: [
                    "«Контейнер напрямую из Йокогамы. Внутри японская аукционная классика. Быстрый расчет — хорошая сделка.»"
                ],
                successHaggle: [
                    "«Хорошо, согласен на дисконт ради долгого сотрудничества.»"
                ],
                failHaggle: [
                    "«Японское качество не продаётся за копейки!»"
                ]
            }
        ];

        // --------------------------------------------------------
        // 2. КАТАЛОГ КОНТЕЙНЕРОВ
        // --------------------------------------------------------
        const PORT_AUCTIONS_CATALOG = [
            {
                id: 'japan',
                name: 'Японский Контейнер (USS Tokyo)',
                title: 'Японский Контейнер (USS Tokyo)',
                cost: 350000,
                reqStars: 5,
                reqLvl: 10,
                country: 'JAPAN',
                flagEmoji: '🇯🇵',
                auctionHouse: 'USS Tokyo / Kobe Port',
                auctionGrade: 'Grade 4.5B',
                desc: 'Опечатанный морской контейнер из порта Кобе. Дроп: JDM легенды, турбо-седаны, японские спортбайки и архивные знаки Токио.',
                possibleCars: ["Toyota Mark II (JZX90)", "Toyota Chaser (X100)", "Yamaha MT-07", "Honda CB400 Super Four", "Nissan Silvia S13"],
                lootPool: [
                    { name: "Комплект кованых дисков Volk TE37 в багажнике", cashVal: 95000, emoji: "✨" },
                    { name: "Японский номер префектуры Синагава", cashVal: 130000, plateStr: "品川 500 あ 77-77", emoji: "🏷️" },
                    { name: "Турбо-кит GReddy T88 в деревянном ящике", cashVal: 110000, emoji: "🚀" }
                ],
                img: 'assets/containers/japan.jpg',
                fallback: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'europe',
                name: 'Европейский Контейнер (BCA Germany)',
                title: 'Европейский Контейнер (BCA Germany)',
                cost: 650000,
                reqStars: 8,
                reqLvl: 14,
                country: 'GERMANY',
                flagEmoji: '🇩🇪',
                auctionHouse: 'BCA Autoauktionen Hamburg',
                auctionGrade: 'Euro Clean',
                desc: 'Прямая поставка из Гамбурга без пробега по СНГ. Дроп: горячие хэтчбеки GTI, турбо-вагоны RS, баварские седаны.',
                possibleCars: ["VW Golf VI GTI", "BMW 3 Series (G20)", "Audi A6 (C8)", "Skoda Octavia A7 1.8 TSI", "BMW E30 Coupe"],
                lootPool: [
                    { name: "Диагностический планшет Launch в кейсе", cashVal: 85000, emoji: "📱" },
                    { name: "Оригинальный обвес M-Performance в коробках", cashVal: 120000, emoji: "🌪️" },
                    { name: "Пакет немецких дойчмарок из бардачка", cashVal: 65000, emoji: "💶" }
                ],
                img: 'assets/containers/europe.jpg',
                fallback: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'usa_auction',
                name: 'Американский Аукцион (Copart #502)',
                title: 'Американский Аукцион (Copart #502)',
                cost: 850000,
                reqStars: 12,
                reqLvl: 18,
                country: 'USA',
                flagEmoji: '🇺🇸',
                auctionHouse: 'Copart Los Angeles Yard',
                auctionGrade: 'Salvage / Clean Title',
                desc: 'Контейнер со страхового аукциона США. Кот в мешке: от лёгкого удара по навеске до мощных маслкаров и заряженных багги.',
                possibleCars: ["Ford Focus III", "Chevrolet Cruze", "BRP Can-Am Maverick X3", "Ford Mustang GT"],
                lootPool: [
                    { name: "Спортивные драговые слики Mickey Thompson", cashVal: 75000, emoji: "🛞" },
                    { name: "Калифорнийский ретро-номер 1978", cashVal: 160000, plateStr: "CALIFORNIA 777", emoji: "🏷️" },
                    { name: "Пачка долларов за обшивкой двери", cashVal: 140000, emoji: "💵" }
                ],
                img: 'assets/containers/usa.jpg',
                fallback: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'dubai',
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
                    { name: "Дубайский блатной номер «7»", cashVal: 450000, plateStr: "DUBAI 7", emoji: "💎" },
                    { name: "Кованые составные диски Mansory", cashVal: 220000, emoji: "✨" }
                ],
                img: 'assets/containers/dubai.jpg',
                fallback: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'hangar',
                name: 'Заброшенный Ангар Портового Хаба',
                title: 'Заброшенный Ангар Портового Хаба',
                cost: 4500000,
                reqStars: 35,
                reqLvl: 35,
                country: 'GLOBAL',
                flagEmoji: '🌐',
                auctionHouse: 'Customs Seized Warehouse',
                auctionGrade: 'Ultra Seized',
                desc: 'Конфискованный таможней ангар! От коммерческих тягачей Scania и Volvo до Porsche 911 GT3 RS и Nissan GT-R Nismo!',
                possibleCars: ["Scania R500 V8", "Volvo FH16 750", "Porsche 911 GT3 RS (992)", "Nissan GT-R R35 Nismo", "Bugatti Chiron Sport"],
                lootPool: [
                    { name: "Кейс с ценными бумагами и платиной", cashVal: 750000, emoji: "💼" },
                    { name: "Карбоновый обвес Nismo в сборе", cashVal: 400000, emoji: "🏎️" },
                    { name: "Таможенный пропуск высшего допуска", cashVal: 300000, emoji: "📜" }
                ],
                img: 'assets/containers/hangar.jpg',
                fallback: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80'
            }
        ];

        const CONTAINER_ITEMS = PORT_AUCTIONS_CATALOG;

        // --------------------------------------------------------
        // 3. STORAGE WARS КОНТЕЙНЕРЫ
        // --------------------------------------------------------
        const STORAGE_WARS_CONTAINERS = [
            {
                id: "sw_copart_muscle",
                title: "Контейнер Copart #502 (США)",
                badge: "Маслкары & Джипы",
                country: "USA",
                baseBid: 320000,
                maxBotBudget: 850000,
                estValue: "500,000 — 1,300,000 ₽",
                riskLevel: "Средний",
                desc: "Закрытый 40-футовый контейнер из порта Лос-Анджелеса. Сквозь щели виден широкий бампер, резина на ковке и слой заокеанской пыли.",
                possibleCars: ["Ford Focus III", "Chevrolet Cruze", "BRP Can-Am Maverick X3", "Ford Mustang GT"],
                lootPool: [
                    { name: "Комплект полусликов Toyo R888R", cashVal: 65000, emoji: "🛞" },
                    { name: "Пачка долларов за козырьком", cashVal: 85000, emoji: "💵" }
                ],
                scrapChance: 0.15,
                img: "assets/containers/usa.jpg",
                fallback: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80"
            },
            {
                id: "sw_kobe_jdm",
                title: "Контейнер Кобе #911 (Япония)",
                badge: "JDM & Турбо",
                country: "JAPAN",
                baseBid: 450000,
                maxBotBudget: 1250000,
                estValue: "700,000 — 2,200,000 ₽",
                riskLevel: "Умеренный",
                desc: "Прямой груз с аукциона USS Tokyo. Характерные золотые полки дисков Work, стикеры парковки и нетронутый интерьер.",
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
                id: "sw_dubai_super",
                title: "Контейнер Дубай #777 (ОАЭ)",
                badge: "Суперкары & Люкс",
                country: "UAE",
                baseBid: 1200000,
                maxBotBudget: 2800000,
                estValue: "2,000,000 — 5,500,000 ₽",
                riskLevel: "Высокий",
                desc: "Опечатанный бокс таможенного терминала Аль-Авир. Карбоновые зеркала, диффузор и золотой ключ на приборке.",
                possibleCars: ["BMW X5 (G05)", "Mercedes G63 AMG «Гелик»", "Porsche Cayenne (PO536)", "Катер Bayliner VR5"],
                lootPool: [
                    { name: "Золотые слитки в кейсе из багажника", cashVal: 280000, emoji: "🏆" },
                    { name: "Дубайский VIP-номер «777»", cashVal: 350000, plateStr: "DUBAI 777", emoji: "💎" }
                ],
                scrapChance: 0.12,
                img: "assets/containers/dubai.jpg",
                fallback: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80"
            }
        ];

        // --------------------------------------------------------
        // 4. БОТЫ STORAGE WARS
        // --------------------------------------------------------
        const STORAGE_WARS_BOTS = [
            {
                name: "Барыга Алик",
                avatar: "🧔",
                maxBudgetMul: 1.55,
                bluffChance: 0.35,
                aggro: "moderate",
                shouts: [
                    "«Этот контейнер точно мой, не лезьте под руку!»",
                    "«Я чую японский турбо-мотор за версту, поднимаю!»",
                    "«Эй, перекуп, у тебя денег не хватит со мной бодаться!»",
                    "«Поднимаю планку, по рукам!»"
                ],
                passShouts: [
                    "«Ценник в космос улетел, я пас...»",
                    "«За такие бабки пусть забирает, там кот в мешке!»"
                ]
            },
            {
                name: "Мажор Влад",
                avatar: "🕺",
                maxBudgetMul: 2.20,
                bluffChance: 0.55,
                aggro: "aggressive",
                shouts: [
                    "«Мелочь не считаю, перебиваю ставку!»",
                    "«Папа дал бюджет, контейнер едет ко мне на виллу!»",
                    "«Кто готов перебить мою ставку? Слабо?!»",
                    "«Давайте сразу по-взрослому играть, накидываю!»"
                ],
                passShouts: [
                    "«Скучно с вами, пойду в ресторан...»",
                    "«Ладно, забирайте этот хлам, найду себе получше.»"
                ]
            },
            {
                name: "Дед Михалыч",
                avatar: "👴",
                maxBudgetMul: 1.30,
                bluffChance: 0.15,
                aggro: "calm",
                shouts: [
                    "«Не спешите, хлопцы, я на пенсии, но порох в пороховницах есть!»",
                    "«В моё время такие лоты за копейки брали. Ставлю!»",
                    "«Прибавлю еще немного, на запчасти сгодится.»"
                ],
                passShouts: [
                    "«Ох, пенсия не резиновая, выхожу из торгов.»",
                    "«Слишком дорого стало, я умываю руки.»"
                ]
            },
            {
                name: "Перекуп Семён",
                avatar: "🕶️",
                maxBudgetMul: 1.75,
                bluffChance: 0.40,
                aggro: "moderate",
                shouts: [
                    "«Я уже посчитал маржу, здесь чистый профит. Повышаю!»",
                    "«Перебиваю! Мой автосалон ждет этот лот!»",
                    "«Контейнер уйдет влет на авторынке, забираю!»"
                ],
                passShouts: [
                    "«Маржа ушла в минус, пас!»",
                    "«Дальше торговаться бессмысленно, я выхожу.»"
                ]
            }
        ];

        // --------------------------------------------------------
        // ЭКСПОРТ В WINDOW
        // --------------------------------------------------------
        window.PORT_BROKER_PROFILES = PORT_BROKER_PROFILES;
        window.PORT_AUCTIONS_CATALOG = PORT_AUCTIONS_CATALOG;
        window.CONTAINER_ITEMS = CONTAINER_ITEMS;
        window.STORAGE_WARS_CONTAINERS = STORAGE_WARS_CONTAINERS;
        window.STORAGE_WARS_BOTS = STORAGE_WARS_BOTS;

        console.log('[🚢 data_activities_port] Загружено:', PORT_AUCTIONS_CATALOG.length, 'контейнеров,', STORAGE_WARS_CONTAINERS.length, 'лотов Storage Wars,', STORAGE_WARS_BOTS.length, 'ботов ✓');

    } catch (e) {
        console.error('[🚢 data_activities_port] ОШИБКА ЗАГРУЗКИ:', e);
        console.error(e.stack);
    }
})();
// ========================================================
// data_activities_port.js — ДАННЫЕ ПОРТА И STORAGE WARS (v1.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Изолированный модуль: контейнеры, брокеры, Storage Wars, боты.
// Баланс дропа v1.1.0: сбалансированная экономика без оверпауэрных гиперкаров.
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
        // 2. КАТАЛОГ КОНТЕЙНЕРОВ (БАЛАНС ЦЕН И ДРОПА)
        // --------------------------------------------------------
        const PORT_AUCTIONS_CATALOG = [
            {
                id: 'japan',
                name: 'Японский Контейнер (USS Tokyo)',
                title: 'Японский Контейнер (USS Tokyo)',
                cost: 950000,
                reqStars: 10,
                reqLvl: 12,
                country: 'JAPAN',
                flagEmoji: '🇯🇵',
                auctionHouse: 'USS Tokyo / Kobe Port',
                auctionGrade: 'Grade 3.5R',
                desc: 'Опечатанный морской контейнер из порта Кобе. Дроп: японские седаны под проект, хэтчбеки и аукционные мотоциклы.',
                possibleCars: ["Toyota Corolla (E120)", "Mazda 3 (BK)", "Honda Civic Ferio", "Toyota Mark II (JZX90)", "Yamaha MT-03"],
                lootPool: [
                    { name: "Комплект дисков Enkei R16 в багажнике", cashVal: 35000, emoji: "✨" },
                    { name: "Японский стандартный номер префектуры", cashVal: 45000, plateStr: "品川 500 さ 38-12", emoji: "🏷️" },
                    { name: "Контрактная турбина TD04 в ящике", cashVal: 40000, emoji: "🚀" }
                ],
                img: 'assets/containers/japan.jpg',
                fallback: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'europe',
                name: 'Европейский Контейнер (BCA Germany)',
                title: 'Европейский Контейнер (BCA Germany)',
                cost: 1650000,
                reqStars: 15,
                reqLvl: 15,
                country: 'GERMANY',
                flagEmoji: '🇩🇪',
                auctionHouse: 'BCA Autoauktionen Hamburg',
                auctionGrade: 'Euro Clean',
                desc: 'Гамбургский сборный груз. Практичные европейские универсалы, хэтчбеки и дизельные седаны под перепродажу.',
                possibleCars: ["VW Golf V 1.6", "Opel Astra H GTC", "Ford Focus II Restyle", "Skoda Octavia A5", "BMW E46 320i"],
                lootPool: [
                    { name: "Диагностический адаптер VCDS в кейсе", cashVal: 30000, emoji: "📱" },
                    { name: "Комплект оригинальных дисков R17", cashVal: 45000, emoji: "🌪️" },
                    { name: "Евро-купюры из бардачка", cashVal: 35000, emoji: "💶" }
                ],
                img: 'assets/containers/europe.jpg',
                fallback: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'usa_auction',
                name: 'Американский Аукцион (Copart #502)',
                title: 'Американский Аукцион (Copart #502)',
                cost: 2500000,
                reqStars: 20,
                reqLvl: 18,
                country: 'USA',
                flagEmoji: '🇺🇸',
                auctionHouse: 'Copart Los Angeles Yard',
                auctionGrade: 'Salvage Run & Drive',
                desc: 'Контейнер со страхового аукциона США. Седаны и кроссоверы под кузовной ремонт и локальную покраску.',
                possibleCars: ["Ford Focus III", "Chevrolet Cruze 1.4T", "Volkswagen Jetta VI", "Dodge Caliber", "Ford Fusion USA"],
                lootPool: [
                    { name: "Комплект всесезонной резины Goodyear", cashVal: 38000, emoji: "🛞" },
                    { name: "Сувенирный номерной знак Техаса", cashVal: 50000, plateStr: "TEXAS 482-KPM", emoji: "🏷️" },
                    { name: "Инструментальный набор DeWalt", cashVal: 42000, emoji: "💵" }
                ],
                img: 'assets/containers/usa.jpg',
                fallback: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'dubai',
                name: 'Эмиратский Контейнер (Dubai Al-Aweer)',
                title: 'Эмиратский Контейнер (Dubai Al-Aweer)',
                cost: 4800000,
                reqStars: 30,
                reqLvl: 22,
                country: 'UAE',
                flagEmoji: '🇦🇪',
                auctionHouse: 'Al-Aweer Auto Market Dubai',
                auctionGrade: 'Fleet Trade',
                desc: 'Надёжные японские и немецкие кроссоверы и седаны комфорт-класса без коррозии из ОАЭ.',
                possibleCars: ["Toyota Camry XV50", "Nissan Teana J32", "Infiniti FX35 (S51)", "Lexus IS250", "Mitsubishi Pajero IV"],
                lootPool: [
                    { name: "Кожаный салон в упаковке", cashVal: 95000, emoji: "💺" },
                    { name: "Эмиратский номер Дубая", cashVal: 120000, plateStr: "DUBAI H-48192", emoji: "💎" },
                    { name: "Комплект легкосплавных колес R19", cashVal: 85000, emoji: "✨" }
                ],
                img: 'assets/containers/dubai.jpg',
                fallback: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'hangar',
                name: 'Заброшенный Ангар Портового Хаба',
                title: 'Заброшенный Ангар Портового Хаба',
                cost: 9500000,
                reqStars: 45,
                reqLvl: 26,
                country: 'GLOBAL',
                flagEmoji: '🌐',
                auctionHouse: 'Customs Seized Warehouse',
                auctionGrade: 'Seized Cargo',
                desc: 'Конфискованный таможней коммерческий ангар: тягачи, бизнес-седаны и заряженные универсалы.',
                possibleCars: ["ГАЗель NEXT ЦМФ", "КамАЗ 5490 Тягач", "BMW 525i E60", "Audi A6 Avant C7", "Mercedes-Benz E200 W212"],
                lootPool: [
                    { name: "Поддон контрактных автозапчастей", cashVal: 160000, emoji: "💼" },
                    { name: "Комплект грузовой резины Bridgestone", cashVal: 140000, emoji: "🚚" },
                    { name: "Лицензионный сканер Launch в кейсе", cashVal: 120000, emoji: "📜" }
                ],
                img: 'assets/containers/hangar.jpg',
                fallback: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80'
            }
        ];

        const CONTAINER_ITEMS = PORT_AUCTIONS_CATALOG;

        // --------------------------------------------------------
        // 3. STORAGE WARS КОНТЕЙНЕРЫ (СБАЛАНСИРОВАННЫЕ СТАВКИ)
        // --------------------------------------------------------
        const STORAGE_WARS_CONTAINERS = [
            {
                id: "sw_copart_muscle",
                title: "Контейнер Copart #502 (США)",
                badge: "Седаны & Хэтчи",
                country: "USA",
                baseBid: 650000,
                maxBotBudget: 1350000,
                estValue: "800,000 — 1,600,000 ₽",
                riskLevel: "Средний",
                desc: "Закрытый 40-футовый контейнер из порта Лос-Анджелеса. Сквозь щели виден бампер, резина на штамповках и слой пыли.",
                possibleCars: ["Ford Focus III", "Chevrolet Cruze 1.4T", "Volkswagen Jetta VI", "Dodge Caliber"],
                lootPool: [
                    { name: "Комплект всесезонных покрышек R16", cashVal: 28000, emoji: "🛞" },
                    { name: "Пачка долларов за козырьком", cashVal: 35000, emoji: "💵" }
                ],
                scrapChance: 0.15,
                img: "assets/containers/usa.jpg",
                fallback: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80"
            },
            {
                id: "sw_kobe_jdm",
                title: "Контейнер Кобе #911 (Япония)",
                badge: "Японский Экспорт",
                country: "JAPAN",
                baseBid: 850000,
                maxBotBudget: 1750000,
                estValue: "1,000,000 — 2,100,000 ₽",
                riskLevel: "Умеренный",
                desc: "Прямой груз с аукциона USS Tokyo. Характерные диски, наклейки техосмотра Шакена и японский велюр.",
                possibleCars: ["Toyota Corolla (E120)", "Mazda 3 (BK)", "Toyota Mark II (JZX90)", "Honda Civic Ferio"],
                lootPool: [
                    { name: "Комплект литых дисков Enkei R16", cashVal: 36000, emoji: "✨" },
                    { name: "Номерной знак префектуры Осака", cashVal: 42000, plateStr: "大阪 530 む 41-19", emoji: "🏷️" }
                ],
                scrapChance: 0.10,
                img: "assets/containers/japan.jpg",
                fallback: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80"
            },
            {
                id: "sw_dubai_super",
                title: "Контейнер Дубай #777 (ОАЭ)",
                badge: "Бизнес & Комфорт",
                country: "UAE",
                baseBid: 2200000,
                maxBotBudget: 3800000,
                estValue: "2,600,000 — 4,800,000 ₽",
                riskLevel: "Высокий",
                desc: "Опечатанный бокс таможенного терминала Аль-Авир. Седан бизнес-класса или городской кроссовер под подготовку к рынку.",
                possibleCars: ["Toyota Camry XV50", "Nissan Teana J32", "Infiniti FX35 (S51)", "Lexus IS250"],
                lootPool: [
                    { name: "Кожаные кресла в упаковке", cashVal: 70000, emoji: "💺" },
                    { name: "Номерной знак ОАЭ (Дубай)", cashVal: 95000, plateStr: "DUBAI E-92041", emoji: "💎" }
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
                maxBudgetMul: 1.45,
                bluffChance: 0.35,
                aggro: "moderate",
                shouts: [
                    "«Этот контейнер точно мой, не лезьте под руку!»",
                    "«Я чую японский мотор за версту, поднимаю!»",
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
                maxBudgetMul: 1.80,
                bluffChance: 0.50,
                aggro: "aggressive",
                shouts: [
                    "«Мелочь не считаю, перебиваю ставку!»",
                    "«Папа дал бюджет, контейнер едет ко мне!»",
                    "«Кто готов перебить мою ставку? Слабо?!»",
                    "«Давайте сразу по-взрослому играть, накидываю!»"
                ],
                passShouts: [
                    "«Скучно с вами, пойду в ресторан...»",
                    "«Ладно, забирайте этот ящик, найду себе получше.»"
                ]
            },
            {
                name: "Дед Михалыч",
                avatar: "👴",
                maxBudgetMul: 1.25,
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
                maxBudgetMul: 1.55,
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

        console.log('[🚢 data_activities_port v1.1.0] Загружено:', PORT_AUCTIONS_CATALOG.length, 'контейнеров,', STORAGE_WARS_CONTAINERS.length, 'лотов Storage Wars,', STORAGE_WARS_BOTS.length, 'ботов ✓');

    } catch (e) {
        console.error('[🚢 data_activities_port] ОШИБКА ЗАГРУЗКИ:', e);
        console.error(e.stack);
    }
})();

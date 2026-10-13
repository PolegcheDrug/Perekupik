// ========================================================
// data_economy.js — ЭКОНОМИКА, БИЗНЕСЫ, НЕДВИЖИМОСТЬ И МАРКЕТ
// ========================================================

// --------------------------------------------------------
// 0. СИСТЕМНЫЕ НАСТРОЙКИ ДОСТУПА К ПРИЛОЖЕНИЯМ И МИНИ-ИГРАМ
// --------------------------------------------------------
const APP_ACCESS_CONFIG = {
    // Находка в сарае (Barn Find)
    barn: {
        id: 'tabBarn',
        name: 'Сараи (Barn Find)',
        minLevel: 3,
        costStars: 50,
        costCash: 0,
        costTickets: 0,
        desc: 'Экспедиции по заброшенным гаражам и деревням в поисках раритетов.',
        lockMessage: 'Доступно с 3 уровня за 50 звёзд ⭐'
    },
    // Морские контейнеры (Порт)
    containers: {
        id: 'tabContainers',
        name: 'Контейнеры (Морской Порт)',
        minLevel: 5,
        costStars: 100,
        costCash: 0,
        costTickets: 5,
        desc: 'Аукцион невостребованных контейнеров из Японии, Европы и США.',
        lockMessage: 'Требуется 5 уровень, 100 звёзд ⭐ и 5 билетов 🎫'
    },
    // Автоподбор «Под ключ»
    autopodbor_order: {
        id: 'servicePodkluch',
        name: 'Автоподбор «Под ключ»',
        minLevel: 6,
        costStars: 0,
        costCash: 500000,
        costTickets: 0,
        reqTool: 'obd_launch',
        desc: 'Лицензия на выполнение официальных клиентских подборов авто с высокой маржой.',
        lockMessage: 'Требуется 6 уровень, сканер Launch Pro Pad и взнос 500,000 ₽'
    },
    // Уличные нелегальные гонки
    street: {
        id: 'tabStreet',
        name: 'Стритрейсинг (402м)',
        minLevel: 4,
        costStars: 15,
        costCash: 50000,
        costTickets: 0,
        desc: 'Ночные заезды на деньги и уважение автоклубов.',
        lockMessage: 'Доступно с 4 уровня (взнос 50,000 ₽ и 15 ⭐)'
    },
    // Даркнет и серые схемы
    darknet: {
        id: 'tabDarknet',
        name: 'Даркнет (Теневой рынок)',
        minLevel: 7,
        costStars: 40,
        costCash: 200000,
        costTickets: 0,
        desc: 'Скупка проблемных документов, двойников и перебитых номеров.',
        lockMessage: 'Доступно с 7 уровня для опытных перекупов (200,000 ₽ и 40 ⭐)'
    },
    // Автосалон и Торговая Площадка (Синдикат)
    syndicate: {
        id: 'tabSyndicate',
        name: 'Синдикат Перекупов',
        minLevel: 10,
        costStars: 75,
        costCash: 1000000,
        costTickets: 0,
        desc: 'Элитный закрытый клуб для оптовой перепродажи автопарков.',
        lockMessage: 'Доступно с 10 уровня. Вступительный взнос: 1,000,000 ₽ и 75 ⭐'
    }
};

// --------------------------------------------------------
// 0.1. НАСТРОЙКИ ВИЛСПИНА И СУПЕРВИЛСПИНА
// --------------------------------------------------------
const WHEEL_CONFIG = {
    regular: {
        costStars: 10,
        costTickets: 1,
        canFreeDaily: true,
        dropTable: [
            { type: 'cash', value: 15000, label: '15,000 ₽', weight: 30 },
            { type: 'cash', value: 35000, label: '35,000 ₽', weight: 25 },
            { type: 'cash', value: 75000, label: '75,000 ₽', weight: 15 },
            { type: 'stars', value: 5, label: '5 ⭐', weight: 12 },
            { type: 'fuel', value: 50, label: '50 л бензина', weight: 10 },
            { type: 'tickets', value: 2, label: '2 🎫 Билета', weight: 6 },
            { type: 'car', tier: 'budget', label: 'ВАЗ-2107 (Сток)', weight: 2 }
        ]
    },
    superWheel: {
        // Базовая цена увеличена на 50 звёзд (было 50, стало 100)
        costStars: 100, 
        costTickets: 5,
        canFreeDaily: false,
        dropTable: [
            { type: 'cash', value: 250000, label: '250,000 ₽', weight: 28 },
            { type: 'cash', value: 600000, label: '600,000 ₽', weight: 20 },
            { type: 'cash', value: 1500000, label: '1,500,000 ₽', weight: 10 },
            { type: 'stars', value: 60, label: '60 ⭐', weight: 15 },
            { type: 'tickets', value: 10, label: '10 🎫 Билетов', weight: 12 },
            { type: 'tool', id: 'obd_launch', label: 'Планшет Launch Pro', weight: 8 },
            { type: 'car', tier: 'rare', label: 'BMW E34 525i (Идеал)', weight: 5 },
            { type: 'car', tier: 'exclusive', label: 'Toyota Mark II Tourer V', weight: 2 }
        ]
    }
};

// --------------------------------------------------------
// 0.2. ЭКОНОМИЧЕСКИЙ БАЛАНС МАРКЕТА И ТОРГА
// --------------------------------------------------------
const MARKET_ECONOMY_CONFIG = {
    // Базовая маржа при продаже авто в зависимости от уровня подготовки
    cleanProfitMargin: 0.14,      // 14% если просто перепродать без вложений
    washedPolishedMargin: 0.22,   // 22% если вымыта и отполирована
    fullRestoredMargin: 0.38,     // 38% если устранены скрытые дефекты и мотор в идеале
    // Разброс цен продавцов на доске объявлений
    bargainMinPct: 0.05,          // Минимальный торг (-5%)
    bargainMaxPct: 0.24,          // Максимальный торг при высокой харизме/связях (-24%)
    urgentSaleChance: 0.08,       // 8% шанс появления «Срочного выкупа» со скидкой 35%
    hiddenDefectChance: 0.28      // 28% шанс скрытого косяка без детальной диагностики
};

// --------------------------------------------------------
// 1. НЕДВИЖИМОСТЬ И БОКСЫ ПЕРЕКУПА (СБАЛАНСИРОВАННАЯ ПРОГРЕССИЯ)
// --------------------------------------------------------
const HOUSING_LIST = [
    { 
        id: 'trailer', 
        name: 'Бытовка на стройплощадке', 
        category: 'street',
        typeLabel: 'Временная стоянка',
        rent: 600, 
        buyPrice: 350000, 
        reqStars: 0, 
        slots: 0, 
        moodBonus: -5, 
        minLevel: 1, 
        canTune: false,
        canDetail: false,
        canService: false,
        canOBDGarage: false,
        hasPersonalSlot: false,
        reshalaDiscountPct: 0,
        perk: 'Только ночлег. Доработки и ремонт невозможны.',
        desc: 'Временный строительный вагончик у обочины. Сквозняки, верстака нет. Автомобили стоят под открытым небом.', 
        img: 'assets/houses/trailer.jpg',
        fallback: 'https://images.unsplash.com/photo-1590725140246-201552a488c9?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'shed_yard', 
        name: 'Навес у частного дома', 
        category: 'street',
        typeLabel: 'Уличный навес',
        rent: 1400, 
        buyPrice: 750000, 
        reqStars: 5, 
        slots: 1, 
        moodBonus: 0, 
        minLevel: 2, 
        canTune: false,
        canDetail: false,
        canService: true,
        canOBDGarage: false,
        hasPersonalSlot: false,
        reshalaDiscountPct: 0,
        perk: '1 машиноместо под навесом. Доступна замена масел и свечей.',
        desc: 'Деревянный навес от дождя. Есть розетка 220V и базовый набор гаечных ключей.', 
        img: 'assets/houses/room.jpg',
        fallback: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'room', 
        name: 'Комната в общежитии + Двор', 
        category: 'living',
        typeLabel: 'Жильё + Двор',
        rent: 2200, 
        buyPrice: 1300000, 
        reqStars: 8, 
        slots: 1, 
        moodBonus: 4, 
        minLevel: 3, 
        canTune: false,
        canDetail: false,
        canService: true,
        canOBDGarage: false,
        hasPersonalSlot: false,
        reshalaDiscountPct: 0,
        perk: 'Одно машиноместо во дворе. Разрешена замена расходников.',
        desc: 'Комната в спальном районе. Автомобиль стоит под окнами на асфальте.', 
        img: 'assets/houses/room.jpg',
        fallback: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'gsk_box', 
        name: 'Стандартный бокс в ГСК-7', 
        category: 'box',
        typeLabel: 'Капитальный бокс ГСК',
        rent: 6500, 
        buyPrice: 1500000, 
        reqStars: 12, 
        slots: 2, 
        moodBonus: 8, 
        minLevel: 4, 
        canTune: true,
        canDetail: false,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 5,
        perk: 'Смотровая яма, электричество 220V, верстак со слесарными тисками.',
        desc: 'Настоящее логово перекупа! Сухая яма, верстак и диодное освещение. Открывает диагностику и тюнинг.', 
        img: 'assets/houses/garage.jpg',
        fallback: 'https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'khrusch', 
        name: 'Квартира в "Хрущевке"', 
        category: 'living',
        typeLabel: 'Городское жильё',
        rent: 12000, 
        buyPrice: 3800000, 
        reqStars: 15, 
        slots: 1, 
        moodBonus: 10, 
        minLevel: 5, 
        canTune: false,
        canDetail: false,
        canService: true,
        canOBDGarage: false,
        hasPersonalSlot: false,
        reshalaDiscountPct: 0,
        perk: 'Уютный сон, быстрое восстановление настроения (+10).',
        desc: 'Своя кухня, душ и спокойный сон. Машина паркуется во дворе под фонарём.', 
        img: 'assets/houses/khrusch.jpg',
        fallback: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'garage', 
        name: 'Двойной бокс с ямой и печкой', 
        category: 'box',
        typeLabel: 'Слесарная мастерская',
        rent: 18000, 
        buyPrice: 2900000, 
        reqStars: 20, 
        slots: 3, 
        moodBonus: 14, 
        minLevel: 7, 
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 10,
        perk: 'Сварка, полировальный пост, печь на отработке и 3 свободных машиноместа.',
        desc: 'Широкий бокс с печью, верстаком, компрессором и мойкой. Позволяет готовить тачки под ключ.', 
        img: 'assets/houses/garage.jpg',
        fallback: 'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'dvushka', 
        name: 'Двушка в спальном районе', 
        category: 'living',
        typeLabel: 'Городская квартира',
        rent: 26000, 
        buyPrice: 7500000, 
        reqStars: 25, 
        slots: 2, 
        moodBonus: 18, 
        minLevel: 10, 
        canTune: false,
        canDetail: false,
        canService: true,
        canOBDGarage: false,
        hasPersonalSlot: true,
        reshalaDiscountPct: 0,
        perk: 'Закреплённое парковочное место со шлагбаумом во дворе.',
        desc: 'Кирпичный дом, стеклопакеты, видеонаблюдение за парковкой. Высокий комфорт проживания.', 
        img: 'assets/houses/dvushka.jpg',
        fallback: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'workshop_pro', 
        name: 'Тюнинг-Ангар с подъёмником', 
        category: 'box',
        typeLabel: 'Профессиональный сервис',
        rent: 48000, 
        buyPrice: 11000000, 
        reqStars: 35, 
        slots: 5, 
        moodBonus: 22, 
        minLevel: 15, 
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 20,
        perk: 'Двухстоечный подъёмник, камера обдува, скидка 20% на услуги Решалы!',
        desc: 'Коммерческий цех в промзоне. Подъёмник, мощная приточка, возможность отмывать VIN дешевле.', 
        img: 'assets/houses/workshop.jpg',
        fallback: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'euro_treshka', 
        name: 'Евро-трешка (Новостройка)', 
        category: 'living',
        typeLabel: 'Бизнес-класс с паркингом',
        rent: 42000, 
        buyPrice: 15000000, 
        reqStars: 40, 
        slots: 3, 
        moodBonus: 28, 
        minLevel: 20, 
        canTune: false,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 0,
        perk: 'Подземный теплый паркинг с детейлинг-постом и зарядкой.',
        desc: 'ЖК комфорт-класса. Закрытый двор, охраняемый подземный паркинг, автомойка в цоколе.', 
        img: 'assets/houses/treshka.jpg',
        fallback: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'cottage', 
        name: 'Коттедж за городом с гаражом', 
        category: 'estate',
        typeLabel: 'Загородная усадьба',
        rent: 70000, 
        buyPrice: 22000000, 
        reqStars: 55, 
        slots: 7, 
        moodBonus: 35, 
        minLevel: 28, 
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 15,
        perk: 'Свой закрытый двор на 7 авто, тёплый гараж, зона отдыха и барбекю.',
        desc: 'Собственный участок, трёхфазная сеть 380V, смотровая яма и мойка высокого давления.', 
        img: 'assets/houses/cottage.jpg',
        fallback: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'loft', 
        name: 'Дизайнерский Лофт в центре', 
        category: 'living',
        typeLabel: 'Премиум-апартаменты',
        rent: 90000, 
        buyPrice: 35000000, 
        reqStars: 75, 
        slots: 4, 
        moodBonus: 40, 
        minLevel: 35, 
        canTune: false,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 0,
        perk: '+40% настроения каждый день, персональные места на VIP-паркинге.',
        desc: 'Красный кирпич, панорамные окна на набережную, стильный интерьер для отдыха автоолигарха.', 
        img: 'assets/houses/loft.jpg',
        fallback: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'penthouse', 
        name: 'Пентхаус в Москва-Сити', 
        category: 'estate',
        typeLabel: 'Небоскрёб & VIP Паркинг',
        rent: 250000, 
        buyPrice: 140000000, 
        reqStars: 110, 
        slots: 8, 
        moodBonus: 55, 
        minLevel: 50, 
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 25,
        perk: 'Личный VIP-бокс на -3 этаже Башни с охраной, консьержем и мойкой.',
        desc: 'Панорамный вид с 65 этажа, консьерж-сервис, охраняемый подземный гаражный комплекс.', 
        img: 'assets/houses/penthouse.jpg',
        fallback: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'villa', 
        name: 'Особняк на Рублёвке', 
        category: 'estate',
        typeLabel: 'Резиденция миллионера',
        rent: 600000, 
        buyPrice: 420000000, 
        reqStars: 160, 
        slots: 18, 
        moodBonus: 85, 
        minLevel: 70, 
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 35,
        perk: 'Свой автосервисный цех, малярная камера, охрана ЧОП, скидка 35% у Решалы!',
        desc: 'Гектар соснового бора, собственный автосервис на 4 поста, малярная камера и ангар для редких лотов.', 
        img: 'assets/houses/villa.jpg',
        fallback: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'island', 
        name: 'Частный остров с виллой', 
        category: 'estate',
        typeLabel: 'Личный Остров Олигарха',
        rent: 2000000, 
        buyPrice: 1200000000, 
        reqStars: 300, 
        slots: 35, 
        moodBonus: 100, 
        minLevel: 90, 
        canTune: true,
        canDetail: true,
        canService: true,
        canOBDGarage: true,
        hasPersonalSlot: true,
        reshalaDiscountPct: 50,
        perk: 'Полный иммунитет от проверок ГИБДД, личный пирс для яхт и скидка 50% у Решалы!',
        desc: 'Абсолютная автономия в нейтральных водах. Свой порт, вертолётная площадка и музей для гиперкаров.', 
        img: 'assets/houses/island.jpg',
        fallback: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
    }
];

const HOUSING_RANDOM_EVENTS = [
    {
        id: "ev_neighbor_complaint",
        applicableCategories: ["living"],
        title: "Жалоба жильцов на прямоток",
        desc: "Соседи по подъезду вызвали участкового из-за прогрева громкого выхлопа под окнами в 7 утра.",
        penaltyMood: 20,
        penaltyCash: 2500,
        resultMsg: "Вы заплатили штраф за нарушение тишины (-2,500 ₽, -20 настроения)."
    },
    {
        id: "ev_gsk_water_leak",
        applicableCategories: ["box"],
        title: "Грунтовые воды в смотровой яме",
        desc: "Весенняя оттепель подтопила нижний ярус гаражного бокса. Пришлось вызывать помпу.",
        penaltyCash: 6000,
        resultMsg: "Яма осушена и проветрена (-6,000 ₽ за насос)."
    },
    {
        id: "ev_grandpa_deal",
        applicableCategories: ["box", "estate"],
        title: "Предложение деда из соседнего бокса",
        desc: "Дедушка Михалыч продаёт советские запасы инструмента и старую резину по бросовой цене.",
        rewardDesc: "+15% сырья для предприятий и +5 к карме за помощь пожилому соседу.",
        bonusKarma: 5,
        bonusStock: 15
    },
    {
        id: "ev_tszh_praise",
        applicableCategories: ["estate", "living"],
        title: "Идеальный порядок на паркинге",
        desc: "Управляющая компания отметила аккуратность вашего парковочного бокса. Завистники кусают локти!",
        bonusMood: 15,
        resultMsg: "Приятно жить красиво! (+15 настроения)."
    }
];

// --------------------------------------------------------
// 2. БИЗНЕС-СЕТЬ (11 ПРЕДПРИЯТИЙ)
// --------------------------------------------------------
const BUSINESS_DATA = [
    { 
        id: 'wash', name: 'Автомойка 24/7', minLevel: 4, income: 950, level: 0, cost: 85000, reqStars: 5, stored: 0, stock: 100, 
        perk: 'Скидка 50% на полировку и химчистку', 
        desc: 'Круглосуточный комплекс бесконтактной мойки и сушки кузова.',
        img: 'assets/business/wash.jpg',
        fallback: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'shina', name: 'Шиномонтаж «У Алика»', minLevel: 6, income: 1600, level: 0, cost: 140000, reqStars: 8, stored: 0, stock: 100, 
        perk: '+10% к стоимости авто на правильных дисках', 
        desc: 'Правка дисков, ошиповка, монтаж низкого профиля и полусликов.',
        img: 'assets/business/shina.jpg',
        fallback: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'sto', name: 'СТО дяди Вани', minLevel: 9, income: 2400, level: 0, cost: 280000, reqStars: 12, stored: 0, stock: 100, 
        perk: 'Скидка 40% на ремонт мотора', 
        desc: 'Капитальный ремонт ДВС, замена цепей ГРМ, подвески и агрегатов.',
        img: 'assets/business/sto.jpg',
        fallback: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'tow_truck', name: 'Служба эвакуации «Шериф»', minLevel: 10, income: 3400, level: 0, cost: 390000, reqStars: 10, stored: 0, stock: 100, 
        perk: 'Бесплатный забор авто со спецстоянки ГИБДД', 
        desc: 'Парк эвакуаторов для оперативной эвакуации и спасения задержанных машин.',
        img: 'assets/business/tow.jpg',
        fallback: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'paint_shop', name: 'Малярный цех «Хамелеон»', minLevel: 13, income: 4800, level: 0, cost: 620000, reqStars: 15, stored: 0, stock: 100, 
        perk: 'Облив в заводской микронный слой без следов шпаклёвки', 
        desc: 'Покрасочная камера с инфракрасной сушкой. ЛКП ложится в заводской допуск.',
        img: 'assets/business/paint.jpg',
        fallback: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'chip_tuning', name: 'Лаборатория Stage Lab', minLevel: 16, income: 6200, level: 0, cost: 800000, reqStars: 20, stored: 0, stock: 100, 
        perk: 'Скидка 70% на установку чип-тюнинга Stage 1-3', 
        desc: 'Диностенд и калибровка прошивок ЭБУ под наддувные двигатели.',
        img: 'assets/business/chip.jpg',
        fallback: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'detailing', name: 'Детейлинг Студия', minLevel: 19, income: 7000, level: 0, cost: 920000, reqStars: 25, stored: 0, stock: 100, 
        perk: '+35% к баллам на Автошоу', 
        desc: 'Нанесение керамики, бронеплёнка, полировка и глубокая химчистка салона.',
        img: 'assets/business/detailing.jpg',
        fallback: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'razborka', name: 'Авторазборка «Последний путь»', minLevel: 22, income: 8500, level: 0, cost: 1150000, reqStars: 30, stored: 0, stock: 100, 
        perk: 'Детали на ремонт обходятся дешевле на 30%', 
        desc: 'Скупка тотальных и аварийных авто на запчасти, продажа контрактных узлов.',
        img: 'assets/business/razborka.jpg',
        fallback: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'autopodbor', name: 'Агентство «Автоподбор Pro»', minLevel: 25, income: 10500, level: 0, cost: 1450000, reqStars: 35, stored: 0, stock: 100, 
        perk: '25% шанс найти эксклюзив со скидкой 35% на авторынке', 
        desc: 'Штат выездных экспертов находит срочные варианты с огромным дисконтом.',
        img: 'assets/business/podbor.jpg',
        fallback: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'taxi', name: 'Таксопарк (15 авто)', minLevel: 30, income: 19500, level: 0, cost: 3600000, reqStars: 50, stored: 0, stock: 100, 
        perk: 'Пассивный доход и +1 🤝 связь каждый день', 
        desc: 'Парк лицензированных седанов под аренду проверенным водителям.',
        img: 'assets/business/taxi.jpg',
        fallback: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'customs_hub', name: 'Таможенный хаб Порта', minLevel: 38, income: 27000, level: 0, cost: 5200000, reqStars: 60, stored: 0, stock: 100, 
        perk: 'Прямые поставки контейнеров и +2 связи ПодКлюч', 
        desc: 'Собственный терминал для таможенной очистки автовозов и контейнеров.',
        img: 'assets/business/hub.jpg',
        fallback: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=600&q=80'
    }
];

// --------------------------------------------------------
// 3. УЛУЧШЕНИЯ, ПЕРСОНАЛ И ФЛОТ БИЗНЕСОВ
// --------------------------------------------------------
const BUSINESS_UPGRADES_BRANCHES = {
    equipment: [
        { name: "Базовый слесарный пост (+15% к выручке)", costMul: 0.35, bonusPct: 15 },
        { name: "Пневмолиния и специнструмент (+30% к выручке)", costMul: 0.65, bonusPct: 30 },
        { name: "Компьютерные 3D-стенды и стенд сход-развала (+45% к выручке)", costMul: 1.10, bonusPct: 45 }
    ],
    storage: [
        { name: "Стеллажная зона хранения (+135% к вместимости)", costMul: 0.25 },
        { name: "Автоматизированный складской модуль (+270% к вместимости)", costMul: 0.55 },
        { name: "Оптовый распределительный терминал (+405% к вместимости)", costMul: 0.90 }
    ],
    marketing: [
        { name: "Светодиодная вывеска и локальный таргетинг (+15% трафика)", costMul: 0.20, trafficBonusPct: 15 },
        { name: "Партнёрская программа с автоклубами (+25% трафика)", costMul: 0.50, trafficBonusPct: 25 },
        { name: "Генеральный спонсор соревнований (+40% трафика)", costMul: 0.85, trafficBonusPct: 40 }
    ]
};

const BUSINESS_STAFF_CATALOG = {
    managers: [
        { id: "mgr_junior", name: "Стажёр Денис", salary: 2500, hireCost: 35000, reqStars: 2, incomeBonusPct: 5, autoRestock: false, perkText: "+5% к выручке" },
        { id: "mgr_pro", name: "Управляющий Артём", salary: 7000, hireCost: 120000, reqStars: 8, incomeBonusPct: 15, autoRestock: true, restockDiscount: 0.1, perkText: "Автозакупка сырья со скидкой 10%, +15% к кассе" }
    ],
    masters: [
        { id: "mst_stepan", name: "Мастер Степаныч", salary: 3500, hireCost: 45000, reqStars: 3, incomeBonusPct: 10, stockSavePct: 15, perkText: "+10% к кассе, экономит 15% сырья" },
        { id: "mst_expert", name: "Шеф-механик Вольдемар", salary: 9000, hireCost: 160000, reqStars: 10, incomeBonusPct: 25, stockSavePct: 35, perkText: "+25% к кассе, экономит 35% сырья" }
    ],
    security: [
        { id: "sec_chop", name: "Пост ЧОП «Титан»", salary: 3000, hireCost: 40000, reqStars: 2, perkText: "Защита от ночных краж сырья и визитов полиции" }
    ]
};

const BUSINESS_FLEET_CATALOG = [
    { id: "fl_gazel", name: "ГАЗель NEXT Фургон", cost: 450000, reqStars: 5, suitableBusinesses: ["wash", "shina", "sto", "detailing", "razborka"], incomeBonusPct: 12, stockCapacityBonus: 50, desc: "Подвоз запчастей и сырья без задержек." },
    { id: "fl_tow", name: "Эвакуатор ГАЗон NEXT", cost: 1200000, reqStars: 12, suitableBusinesses: ["sto", "razborka", "tow_truck"], incomeBonusPct: 25, stockCapacityBonus: 100, desc: "Доставка аварийных машин на СТО и разборку." }
];

// --------------------------------------------------------
// 4. КАТАЛОГ АВТО-МАРКЕТА (4 ПОЛНЫЕ КАТЕГОРИИ)
// --------------------------------------------------------
const SHOP_CATALOG = {
    tools: [
        { 
            id: "gauge", 
            name: "Магнитный толщиномер ЛКП (Базовый)", 
            cost: 25000, 
            reqStars: 0, 
            maxUses: 60, 
            serviceCost: 2500, 
            desc: "Замеряет шпаклёвку и вторичные окрасы кузова. Ресурс: 60 замеров.", 
            icon: "fa-ruler-combined" 
        },
        { 
            id: "gauge_pro", 
            name: "Ультразвуковой толщиномер Pro (Цветмет)", 
            cost: 65000, 
            reqStars: 4, 
            maxUses: 100, 
            serviceCost: 6000, 
            desc: "Высокая точность до 1 мкм. Различает алюминий и цинк. Ресурс: 100 замеров.", 
            icon: "fa-microchip" 
        },
        { 
            id: "obd", 
            name: "Автосканер ELM327 Bluetooth v1.5", 
            cost: 45000, 
            reqStars: 2, 
            maxUses: 50, 
            serviceCost: 4000, 
            desc: "Базовый сканер для чтения и сброса кодов ошибок DTC в ЭБУ мотора. Ресурс: 50 сканов.", 
            icon: "fa-laptop-code" 
        },
        { 
            id: "obd_launch", 
            name: "Диагностический планшет Launch Pro Pad", 
            cost: 160000, 
            reqStars: 8, 
            maxUses: 80, 
            serviceCost: 12000, 
            desc: "Профессиональный комбайн! Обязателен для сервиса «ПодКлюч» и глубокого анализа АКПП. Ресурс: 80 циклов.", 
            icon: "fa-tablet-screen-button" 
        },
        { 
            id: "endoscope", 
            name: "HD Видеоэндоскоп мотора с поворотной камерой", 
            cost: 85000, 
            reqStars: 4, 
            maxUses: 40, 
            serviceCost: 7500, 
            desc: "Осмотр цилиндров на задиры и нагар. Обязателен для контрактов «ПодКлюч» и досмотра контейнеров. Ресурс: 40 осмотров.", 
            icon: "fa-video" 
        },
        { 
            id: "compressor", 
            name: "Профессиональный компрессометр с переходниками", 
            cost: 38000, 
            reqStars: 2, 
            maxUses: 50, 
            serviceCost: 3500, 
            desc: "Замер компрессии цилиндров ДВС. Позволяет выявлять износ колец и клапанов. Ресурс: 50 замеров.", 
            icon: "fa-gauge-high" 
        },
        { 
            id: "battery_tester", 
            name: "Цифровая нагрузочная вилка АКБ", 
            cost: 20000, 
            reqStars: 0, 
            maxUses: 60, 
            serviceCost: 1800, 
            desc: "Проверка реальной емкости и пускового тока аккумулятора у капота. Ресурс: 60 проверок.", 
            icon: "fa-car-battery" 
        }
    ],
    consumables: [
        { 
            id: "oil_pack", 
            name: "Партия синтетического масла 5W-40 и фильтров", 
            cost: 25000, 
            reqStars: 0, 
            value: 30, 
            targetBiz: "sto",
            desc: "+30% сырья на СТО дяди Вани. Обеспечивает бесперебойную работу подъемников." 
        },
        { 
            id: "chem_pack", 
            name: "Бочка автошампуня и нано-керамики (200л)", 
            cost: 45000, 
            reqStars: 1, 
            value: 50, 
            targetBiz: "wash",
            desc: "+50% сырья для Автомойки и Детейлинг студии. Защищает кузов и придает зеркальный блеск." 
        },
        { 
            id: "tires_stock", 
            name: "Партия спортивной резины и жгутов для шиномонтажа", 
            cost: 35000, 
            reqStars: 1, 
            value: 40, 
            targetBiz: "shina",
            desc: "+40% сырья на Шиномонтаж «У Алика». Устраняет дефицит расходников при сезонном буме." 
        },
        { 
            id: "brake_pack", 
            name: "Оптовая партия контрактных запчастей и суппортов", 
            cost: 55000, 
            reqStars: 2, 
            value: 50, 
            targetBiz: "razborka",
            desc: "+50% запаса деталей на Авторазборку. Повышает доходность контрактов." 
        },
        { 
            id: "paint_barrel", 
            name: "Комплект автоэмалей, грунта и лака «Хамелеон»", 
            cost: 65000, 
            reqStars: 2, 
            value: 50, 
            targetBiz: "paint_shop",
            desc: "+50% сырья в Малярный цех. Позволяет красить авто заводским микронным слоем." 
        },
        { 
            id: "full_stock", 
            name: "Генеральный оптовый запас (100% на все точки)", 
            cost: 140000, 
            reqStars: 5, 
            value: 100, 
            targetBiz: "all",
            desc: "Мгновенно заполняет склады всех выкупленных предприятий до 100%!" 
        }
    ],
    tuningParts: [
        { 
            id: "raf_license", 
            name: "Гоночная Лицензия пилота РАФ (Категория Д)", 
            cost: 85000, 
            reqStars: 15, 
            desc: "Официальный регламентный допуск пилота к ночным заездам на 402м в Стрите.", 
            icon: "fa-id-card" 
        },
        { 
            id: "insurance_osago", 
            name: "Генеральный полис «КАСКО / Анти-Угон»", 
            cost: 45000, 
            reqStars: 5, 
            desc: "100% защита от случайных повреждений на парковке, автоподстав и ночных угонов.", 
            icon: "fa-shield-halved" 
        },
        { 
            id: "gps_tracker", 
            name: "Скрытый поисковый GPS/ГЛОНАСС маяк", 
            cost: 30000, 
            reqStars: 3, 
            desc: "Позволяет моментально вернуть угнанную машину без взяток полиции и Решале.", 
            icon: "fa-satellite-dish" 
        },
        { 
            id: "customs_pass", 
            name: "Таможенный пропуск в свободную зону Порта", 
            cost: 60000, 
            reqStars: 6, 
            desc: "Снижает пошлины на вскрытие японских и европейских контейнеров на 15%.", 
            icon: "fa-passport" 
        }
    ],
    homeItems: [
        { 
            id: "home_ps5", 
            name: "Игровая консоль PlayStation 5", 
            cost: 75000, 
            reqStars: 5, 
            perk: "+25% настроения и куража каждый день в полночь", 
            icon: "fa-gamepad" 
        },
        { 
            id: "home_leather_sofa", 
            name: "Кожаный диван в клиентскую зону", 
            cost: 120000, 
            reqStars: 8, 
            perk: "+15% к восстановлению сил после смотровой ямы", 
            icon: "fa-couch" 
        },
        { 
            id: "home_garage_lift", 
            name: "Гидравлический автоподъёмник (4 тонны)", 
            cost: 320000, 
            reqStars: 20, 
            perk: "Ускоряет устранение скрытых дефектов авто на 50% и поднимает статус бокса", 
            icon: "fa-elevator" 
        },
        { 
            id: "home_safe_valberg", 
            name: "Огнеупорный сейф перекупа Valberg", 
            cost: 180000, 
            reqStars: 10, 
            perk: "100% защита заначки наличных от налоговых проверок и уличных облав", 
            icon: "fa-vault" 
        },
        { 
            id: "home_cctv", 
            name: "Система видеонаблюдения периметра 4K", 
            cost: 140000, 
            reqStars: 8, 
            perk: "Снижает шанс ночного угона авто из гаража или двора до 0%", 
            icon: "fa-video" 
        }
    ]
};

const HOUSING_INTERIOR_CATALOG = SHOP_CATALOG.homeItems;

// Экспорт в глобальный контекст window
window.APP_ACCESS_CONFIG = APP_ACCESS_CONFIG;
window.WHEEL_CONFIG = WHEEL_CONFIG;
window.MARKET_ECONOMY_CONFIG = MARKET_ECONOMY_CONFIG;
window.HOUSING_LIST = HOUSING_LIST;
window.HOUSING_RANDOM_EVENTS = HOUSING_RANDOM_EVENTS;
window.BUSINESS_DATA = BUSINESS_DATA;
window.BUSINESS_UPGRADES_BRANCHES = BUSINESS_UPGRADES_BRANCHES;
window.BUSINESS_STAFF_CATALOG = BUSINESS_STAFF_CATALOG;
window.BUSINESS_FLEET_CATALOG = BUSINESS_FLEET_CATALOG;
window.SHOP_CATALOG = SHOP_CATALOG;
window.HOUSING_INTERIOR_CATALOG = HOUSING_INTERIOR_CATALOG;
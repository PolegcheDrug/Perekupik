// ===================== ФАЙЛ БАЗЫ ДАННЫХ (data.js) =====================

// ГОРОДСКОЙ ЧАТ (30+ сообщений)
const CITY_CHAT_MESSAGES = [
    { author: "🚨 ДПС_Инфо", text: "Внимание! На ул. Ленина рейд по 12.5.1, прячьте прямотоки!", warning: true },
    { author: "🚨 ДПС_Инфо", text: "Экипаж с люстрой стоит у ТЦ Галерея, тормозят всех тонированных.", warning: true },
    { author: "🚨 ДПС_Инфо", text: "Скрытый патруль на объездной. Снимайте каркасы шторки!", warning: true },
    { author: "🚨 ДПС_Инфо", text: "Облава на парковке Ашана. Выписывают за выхлоп.", warning: true },
    { author: "🚨 ДПС_Инфо", text: "Камеры на МКАДе перенастроили на ремни и телефон.", warning: true },
    { author: "Vazovod_77", text: "Куплю кузов под корч ВАЗ 2107 или 2101, срочно в лс!", warning: false },
    { author: "Major_Vova", text: "Завтра сходка на парковке, вход только для немцев.", warning: false },
    { author: "JDM_King", text: "Кто может заварить редуктор по-братски за пиво?", warning: false },
    { author: "Perecup_Pro", text: "Продам Солярис, не бит не крашен (крашена только крыша из-за сосульки).", warning: false },
    { author: "Sanya_Garage", text: "Делаю капиталку за 3 дня, гарантия до ворот. Цены в лс.", warning: false },
    { author: "Mark_2_Top", text: "Ищу столб... тьфу, задний бампер на марк 2.", warning: false },
    { author: "BMW_Boy", text: "Куплю масло 10w40 бочку, желательно оптом.", warning: false },
    { author: "Podbor_Max", text: "Осматривал Камри на Лесной. Пробег кручен на 300к. Не берите!", warning: false },
    { author: "Patsan_Taz", text: "Где сейчас можно нормально угла дать, чтобы без мигалок?", warning: false },
    { author: "Auto_Lombard", text: "Выдаем займы под ПТС. Быстро, без вопросов.", warning: false },
    { author: "Maga_M5", text: "Встану на 402 метра с любым. Ставка 500к.", warning: false },
    { author: "GTI_Stage3", text: "У кого есть шнурок Вася Диагност? Надо чек скинуть перед продажей.", warning: false },
    { author: "Plenka_Center", text: "Акция! Закатай бункер в круг со скидкой 20%.", warning: false },
    { author: "Ilya_Resale", text: "Заберу ваш авто в любом состоянии за 60% от рынка. Деньги сразу.", warning: false },
    { author: "Serega_Taxi", text: "Сдам в аренду Логан под такси. 1500р/сутки.", warning: false },
    { author: "Detaling_Pro", text: "Химчистка после картошки и рассады. Вернем запах новой машины.", warning: false },
    { author: "Peredelka_Msk", text: "Переварю пороги балОтличное решение! Разделение игры на движок (`index.html`) и базу данных (`data.js`) — это признак профессионального подхода. Теперь вам будет невероятно легко добавлять сотни новых машин, картинок и событий, не боясь сломать саму игру.

Я подготовил для вас **два файла**. 
1. `data.js` — здесь собраны абсолютно все настройки, машины, дома, бизнесы и 30 новых уникальных фраз для чата. У каждой машины прописан прямой путь к картинке (например, `assets/cars/economy/vaz-2101.jpg`), чтобы вы могли просто закинуть свои картинки по папкам.
2. `index.html` — ядро игры. Починена игра «21», вкладка переименована и убрана из нижнего меню. На её место встала вкладка «Жизнь», куда я встроил живую электронную ленту событий (чат сам обновляется каждые 7 секунд!). 

---

### ФАЙЛ 1: Создайте файл `data.js`
В этой же папке, где у вас лежит игра, создайте файл `data.js` и вставьте туда этот код:

```javascript
// ===================== ФАЙЛ БАЗЫ ДАННЫХ (data.js) =====================

// 1. БАЗА ТРАНСПОРТА (с точными путями к картинкам)
// Инструкция: создайте папку "assets" рядом с index.html, в ней папку "cars", и закиньте картинки с нужными названиями.
const CAR_DATABASE = {
    economy: [
        { name: "ВАЗ-2101 «Копейка»", power: 64, basePrice: 65000, type: "economy", img: "assets/cars/economy/vaz-2101.jpg" },
        { name: "ВАЗ-2107 «Семёрка»", power: 74, basePrice: 95000, type: "economy", img: "assets/cars/economy/vaz-2107.jpg" },
        { name: "ВАЗ-2114 «Четырка»", power: 81, basePrice: 140000, type: "economy", img: "assets/cars/economy/vaz-2114.jpg" },
        { name: "Lada Priora", power: 98, basePrice: 280000, type: "economy", img: "assets/cars/economy/priora.jpg" },
        { name: "Daewoo Nexia", power: 80, basePrice: 150000, type: "economy", img: "assets/cars/economy/nexia.jpg" },
        { name: "Renault Logan I", power: 75, basePrice: 350000, type: "economy", img: "assets/cars/economy/logan.jpg" },
        { name: "Hyundai Solaris I", power: 123, basePrice: 620000, type: "economy", img: "assets/cars/economy/solaris.jpg" },
        { name: "Kia Rio 3", power: 123, basePrice: 650000, type: "economy", img: "assets/cars/economy/rio.jpg" }
    ],
    scooter: [
        { name: "Honda Dio AF34", power: 7, basePrice: 45000, type: "scooter", img: "assets/moto/dio.jpg" },
        { name: "Yamaha Jog ZR", power: 8, basePrice: 55000, type: "scooter", img: "assets/moto/jog.jpg" },
        { name: "Suzuki Lets 2", power: 6, basePrice: 35000, type: "scooter", img: "assets/moto/lets.jpg" }
    ],
    moto: [
        { name: "Bajaj Pulsar NS200", power: 25, basePrice: 240000, type: "moto", img: "assets/moto/pulsar.jpg" },
        { name: "Kawasaki Ninja 300", power: 39, basePrice: 450000, type: "moto", img: "assets/moto/ninja.jpg" },
        { name: "Yamaha MT-07", power: 74, basePrice: 890000, type: "moto", img: "assets/moto/mt07.jpg" },
        { name: "Ducati Panigale V4", power: 214, basePrice: 3200000, type: "moto", img: "assets/moto/ducati.jpg" }
    ],
    atv: [
        { name: "CFMOTO CFORCE 500", power: 35, basePrice: 620000, type: "atv", img: "assets/moto/cforce.jpg" },
        { name: "BRP Can-Am Maverick", power: 195, basePrice: 3500000, type: "atv", img: "assets/moto/maverick.jpg" }
    ],
    comfort: [
        { name: "VW Polo Sedan", power: 110, basePrice: 850000, type: "comfort", img: "assets/cars/comfort/polo.jpg" },
        { name: "Ford Focus III", power: 125, basePrice: 950000, type: "comfort", img: "assets/cars/comfort/focus.jpg" },
        { name: "Skoda Octavia A7 1.8", power: 180, basePrice: 1450000, type: "comfort", img: "assets/cars/comfort/octavia.jpg" },
        { name: "Toyota Camry XV50", power: 181, basePrice: 1800000, type: "comfort", img: "assets/cars/comfort/camry.jpg" },
        { name: "Kia K5", power: 194, basePrice: 2400000, type: "comfort", img: "assets/cars/comfort/k5.jpg" },
        { name: "VW Golf VI GTI", power: 260, basePrice: 1450000, type: "comfort", img: "assets/cars/comfort/golf.jpg" }
    ],
    premium: [
        { name: "BMW 3-Series G20", power: 184, basePrice: 3800000, type: "premium", img: "assets/cars/premium/g20.jpg" },
        { name: "Mercedes E-Class W213", power: 197, basePrice: 4200000, type: "premium", img: "assets/cars/premium/w213.jpg" },
        { name: "BMW 5-Series G30", power: 249, basePrice: 4800000, type: "premium", img: "assets/cars/premium/g30.jpg" },
        { name: "Lexus RX 350", power: 300, basePrice: 5500000, type: "premium", img: "assets/cars/premium/rx350.jpg" },
        { name: "Porsche Macan S", power: 354, basePrice: 6500000, type: "premium", img: "assets/cars/premium/macan.jpg" },
        { name: "Mercedes G63 AMG", power: 585, basePrice: 14500000, type: "premium", img: "assets/cars/premium/g63.jpg" }
    ],
    hyper: [
        { name: "Nissan GT-R R35", power: 570, basePrice: 12000000, type: "hyper", img: "assets/cars/hyper/gtr.jpg" },
        { name: "Porsche 911 GT3 RS", power: 525, basePrice: 29000000, type: "hyper", img: "assets/cars/hyper/911.jpg" },
        { name: "Lamborghini Huracan", power: 640, basePrice: 35000000, type: "hyper", img: "assets/cars/hyper/huracan.jpg" },
        { name: "Ferrari SF90 Stradale", power: 1000, basePrice: 75000000, type: "hyper", img: "assets/cars/hyper/sf90.jpg" }
    ],
    truck: [
        { name: "ГАЗель NEXT", power: 149, basePrice: 1800000, type: "truck", img: "assets/cars/truck/gazel.jpg" },
        { name: "КАМАЗ-54901 Continent", power: 460, basePrice: 7200000, type: "truck", img: "assets/cars/truck/kamaz.jpg" },
        { name: "Volvo FH16", power: 750, basePrice: 15500000, type: "truck", img: "assets/cars/truck/volvo.jpg" }
    ],
    yacht: [
        { name: "Гидроцикл Yamaha FX", power: 250, basePrice: 1800000, type: "yacht", img: "assets/water/yamaha.jpg" },
        { name: "Катер Bayliner VR5", power: 200, basePrice: 4500000, type: "yacht", img: "assets/water/bayliner.jpg" },
        { name: "Azimut Atlantis 45", power: 880, basePrice: 75000000, type: "yacht", img: "assets/water/azimut.jpg" },
        { name: "Sunseeker 95 Yacht", power: 3900, basePrice: 450000000, type: "yacht", img: "assets/water/sunseeker.jpg" }
    ]
};

// 2. БАЗА НЕДВИЖИМОСТИ
const HOUSING_LIST = [
    { id: 'trailer', name: 'Бытовка на стройплощадке', rent: 800, buyPrice: 0, slots: 0, moodBonus: -5, img: 'assets/houses/trailer.jpg' },
    { id: 'room', name: 'Комната в общежитии', rent: 2500, buyPrice: 1800000, slots: 1, moodBonus: 5, img: 'assets/houses/room.jpg' },
    { id: 'khrusch', name: 'Убитая "Хрущевка"', rent: 15000, buyPrice: 4500000, slots: 1, moodBonus: 10, img: 'assets/houses/khrusch.jpg' },
    { id: 'dvushka', name: 'Двушка в спальном районе', rent: 25000, buyPrice: 8500000, slots: 2, moodBonus: 15, img: 'assets/houses/dvushka.jpg' },
    { id: 'euro_treshka', name: 'Евро-трешка (Новостройка)', rent: 45000, buyPrice: 15000000, slots: 3, moodBonus: 25, img: 'assets/houses/treshka.jpg' },
    { id: 'loft', name: 'Дизайнерский Лофт в центре', rent: 80000, buyPrice: 35000000, slots: 4, moodBonus: 35, img: 'assets/houses/loft.jpg' },
    { id: 'penthouse', name: 'Пентхаус в Москва-Сити', rent: 250000, buyPrice: 140000000, slots: 6, moodBonus: 50, img: 'assets/houses/penthouse.jpg' },
    { id: 'villa', name: 'Особняк на Рублёвке', rent: 600000, buyPrice: 450000000, slots: 15, moodBonus: 80, img: 'assets/houses/villa.jpg' },
    { id: 'island', name: 'Частный остров с виллой', rent: 2000000, buyPrice: 1500000000, slots: 30, moodBonus: 100, img: 'assets/houses/island.jpg' }
];

// 3. 30 РАЗНООБРАЗНЫХ ФРАЗ ДЛЯ ЛЕНТЫ (ЖИВОЙ ЧАТ)
const STREET_CHAT_LOG = [
    { author: "🚨 ДПС_Инфо", text: "Внимание! На ул. Ленина рейд по 12.5.1, прячьте прямотоки!", warning: true },
    { author: "Vazovod_77", text: "Куплю кузов под корч ВАЗ 2107 или 2101, срочно в лс!", warning: false },
    { author: "Major_Vova", text: "Кто на драг на МКАДе? Ставка 500к, меньше не предлагать.", warning: false },
    { author: "Perecup_Pro", text: "В порту разгружают свежие японские распилы. Завтра будут на рынке.", warning: false },
    { author: "🚨 Радар", text: "Засада с треногой на выезде из города в сторону дач!", warning: true },
    { author: "JDM_Boy", text: "Продам банку HKS, оригинал! Орет как надо, соседи будут рады.", warning: false },
    { author: "Vanya_STO", text: "Заезжайте на полировку кузова, скидка 10% до конца вечера.", warning: false },
    { author: "Taxi_Boss", text: "Ищу живые Солярисы под выкуп, пробег строго до 150к. Хлам не предлагать.", warning: false },
    { author: "🚨 ДПС_Инфо", text: "Проверка тонировки на южном кольце! Тормозят всех подряд.", warning: true },
    { author: "Misha_Trade", text: "Кто сегодня на площадке? Покупателей вообще ноль, одни зеваки.", warning: false },
    { author: "DriftKing", text: "Резина стерта в ноль, где взять б/у слик на выходные?", warning: false },
    { author: "🚨 Эвакуатор", text: "Увозят тачки с парковки у центрального ТЦ! Убирайте свои корчи.", warning: true },
    { author: "Secret_Buyer", text: "Ищу премиум от 300 л.с., бюджет не ограничен. Писать в ЛС.", warning: false },
    { author: "Lada_Fan", text: "Пацаны, как снять стук клапанов на Приоре перед продажей? Срочно!", warning: false },
    { author: "🚨 ДПС_Инфо", text: "Сплошная проверка на алкотестер на мосту! Пробка на 3 километра.", warning: true },
    { author: "Ivan_Perekup", text: "Скинул перекупу машину перекупа. Круговорот хлама в природе.", warning: false },
    { author: "BMW_Lover", text: "Загорелся чек, коробка пинается... срочно продам БМВ, недорого.", warning: false },
    { author: "Hustler99", text: "Кто знает, где достать номера 777 дешевле рынка?", warning: false },
    { author: "🚨 ДПС_Инфо", text: "Скрытый патруль на трассе, снимают на камеру выезд на встречку.", warning: true },
    { author: "Auto_Podbor", text: "Сегодня смотрел 5 машин. Все скручены, две в тотале. Рынок мертв.", warning: false },
    { author: "Vanya_STO", text: "Есть свободный подъемник на час. Кому надо поменять масло?", warning: false },
    { author: "Major_Vova", text: "Продул 500к в подпольном казино... где тут ближайший ломбард?", warning: false },
    { author: "🚨 ДПС_Инфо", text: "Перекрытие центральной улицы, ищут угнанный Гелик без номеров.", warning: true },
    { author: "Perecup_Pro", text: "Слил Рио из-под такси по цене не битой. Учитесь, салаги.", warning: false },
    { author: "JDM_Boy", text: "Никто не продает койловеры на Марк 2? Занижать пора.", warning: false },
    { author: "Taxi_Boss", text: "Водитель размотал Камри об столб. Куплю морду в сборе, цвет черный.", warning: false },
    { author: "DriftKing", text: "Завтра ночная сходка на парковке Ашана. ДПС не звать!", warning: false },
    { author: "🚨 Эвакуатор", text: "Чистим обочины на проспекте Мира. Работаем жестко и быстро.", warning: true },
    { author: "Auto_Podbor", text: "Берегитесь перекупа с ником 'Дедушка'. Впаривает конструкторы!", warning: false },
    { author: "Lada_Fan", text: "Залил присадку 'Анти-дым', мотор затих на пару дней. Выставляю на продажу.", warning: false }
];

// 4. ОСТАЛЬНЫЕ НАСТРОЙКИ
const CONTAINER_ITEMS = [
    { id: 'japan', name: 'Японский Контейнер', cost: 150000, timer: 30, badge: 'JDM & Мото', desc: 'Прямые поставки.', img: 'assets/containers/japan.jpg' },
    { id: 'europe', name: 'Европейский Автовоз', cost: 450000, timer: 35, badge: 'Комфорт & Премиум', desc: 'Без пробега по РФ.', img: 'assets/containers/europe.jpg' },
    { id: 'dubai', name: 'Эмиратский Контейнер', cost: 1200000, timer: 45, badge: 'Катера & Суперкары', desc: 'Аукционная роскошь.', img: 'assets/containers/dubai.jpg' },
    { id: 'hangar', name: 'Заброшенный Ангар', cost: 5000000, timer: 60, badge: 'Тягачи & Гиперкары', desc: 'Списанное имущество!', img: 'assets/containers/hangar.jpg' }
];

const SELLER_ADS_PHRASES = [ "«Дедушка ездил только летом!»", "«Сел и поехал, мотор шепчет.»", "«Перекупам не звонить!»", "«Любые проверки за ваш счет.»", "«Красилась только одна дверь.»" ];

const EXPANDED_BUYERS_POOL = [
    { name: "Ашот, перекуп", avatar: "😎", type: "dealer", rate: 0.72, preStatus: "Жестко сбивает цену...", rejectSay: "За эти деньги я две таких возьму!" },
    { name: "Максим, подборщик", avatar: "🔍", type: "inspector", rate: 0.90, preStatus: "Лезет эндоскопом...", rejectSay: "Сделки не будет! Машина - хлам." },
    { name: "Иван Сергеевич", avatar: "👨‍🌾", type: "regular", rate: 0.85, preStatus: "Ищет повод сбить цену...", rejectSay: "Мне на дачу ездить не пойдет." },
    { name: "Артём, студент", avatar: "🧢", type: "student", rate: 0.78, preStatus: "Слушает выхлоп...", rejectSay: "Блин, стипы не хватает." }
];

const DIETS = [
    { id: 'doshik', name: 'Бич-пакет и сухари', cost: 300, hunger: 20, mood: -15, desc: 'Желудок ноет, депрессия' },
    { id: 'shaurma', name: 'Шаурма на вокзале', cost: 800, hunger: 45, mood: -5, desc: 'Сытно, но жирно' },
    { id: 'stolovka', name: 'Обед в столовой', cost: 2200, hunger: 70, mood: 10, desc: 'Нормальное первое и второе' },
    { id: 'cafe', name: 'Бизнес-ланч', cost: 6500, hunger: 90, mood: 25, desc: 'Кофе и уверенность в себе' },
    { id: 'elite', name: 'Мишлен', cost: 25000, hunger: 100, mood: 45, desc: 'Максимальный кураж!' }
];

const BUSINESS_DATA = [
    { id: 'wash', name: 'Автомойка 24/7', minLevel: 5, income: 900, level: 0, cost: 90000, stored: 0, perk: 'Скидка 50% на полировку' },
    { id: 'sto', name: 'СТО дяди Вани', minLevel: 12, income: 2200, level: 0, cost: 300000, stored: 0, perk: 'Скидка 40% на мотор' },
    { id: 'detailing', name: 'Детейлинг Студия', minLevel: 20, income: 6500, level: 0, cost: 950000, stored: 0, perk: '+35% к баллам на Автошоу' },
    { id: 'taxi', name: 'Таксопарк', minLevel: 32, income: 18000, level: 0, cost: 3800000, stored: 0, perk: '+1 🤝 связь каждый день' }
];

const OBD_ERRORS = [
    { text: "P0234: Передув турбины", cost: 16000, severity: "Высокая" },
    { text: "P2711: Недостоверные данные (Мехатроник)", cost: 65000, severity: "Критическая" },
    { text: "P0300: Множественные пропуски зажигания", cost: 11000, severity: "Средняя" },
    { text: "P0016: Рассинхронизация коленвала (Цепь)", cost: 85000, severity: "Критическая" }
];

const DAILY_REWARDS_CONFIG = [
    { day: 1, title: "+20k ₽ & 10 ⛽", reward: { cash: 20000, fuel: 10 } },
    { day: 2, title: "+40k ₽ & 1 🤝", reward: { cash: 40000, connections: 1 } },
    { day: 3, title: "+75k ₽ & 10 ⭐", reward: { cash: 75000, stars: 10 } },
    { day: 4, title: "+120k ₽ & 1 🤝", reward: { cash: 120000, connections: 1 } },
    { day: 5, title: "+200k ₽ & 15 ⭐", reward: { cash: 200000, stars: 15 } },
    { day: 6, title: "+350k ₽ & Бак", reward: { cash: 350000, fuel: 100 } },
    { day: 7, title: "+600k ₽ & 25 ⭐", reward: { cash: 600000, stars: 25, specialPlate: "Х777ХХ 77" } }
];
// ========================================================
// data.js — БАЗА ДАННЫХ ИГРЫ «СИМУЛЯТОР ПЕРЕКУПА» (v0.4.3)
// Обложки жилья, бизнеса, сараев и конфигурация Супер Вилспина
// ========================================================

const CAR_DATABASE = {
    economy: [
        { name: "Ока (ВАЗ-1111)", power: 33, basePrice: 40000, type: "economy", img: "assets/cars/economy/oka.jpg" },
        { name: "ЗАЗ-968М «Запорожец»", power: 40, basePrice: 35000, type: "economy", img: "assets/cars/economy/zaz.jpg" },
        { name: "Москвич-412", power: 75, basePrice: 50000, type: "economy", img: "assets/cars/economy/moskvich.jpg" },
        { name: "ИЖ-2126 «Ода»", power: 73, basePrice: 55000, type: "economy", img: "assets/cars/economy/izh.jpg" },
        { name: "ВАЗ-2101 «Копейка»", power: 64, basePrice: 65000, type: "economy", img: "assets/cars/economy/vaz-2101.jpg" },
        { name: "ВАЗ-2106 «Шестерка»", power: 75, basePrice: 75000, type: "economy", img: "assets/cars/economy/vaz-2106.jpg" },
        { name: "ВАЗ-2107 «Семёрка»", power: 74, basePrice: 95000, type: "economy", img: "assets/cars/economy/vaz-2107.jpg" },
        { name: "ВАЗ-2108 «Зубило»", power: 70, basePrice: 110000, type: "economy", img: "assets/cars/economy/vaz-2108.jpg" },
        { name: "ВАЗ-2109 «Девятка»", power: 72, basePrice: 125000, type: "economy", img: "assets/cars/economy/vaz-2109.jpg" },
        { name: "ВАЗ-2110 «Десятка»", power: 89, basePrice: 135000, type: "economy", img: "assets/cars/economy/vaz-2110.jpg" },
        { name: "ВАЗ-2114 «Четырка»", power: 81, basePrice: 140000, type: "economy", img: "assets/cars/economy/vaz-2114.jpg" },
        { name: "ГАЗ-3110 «Волга»", power: 130, basePrice: 120000, type: "economy", img: "assets/cars/economy/volga.jpg" },
        { name: "Lada Kalina I", power: 81, basePrice: 220000, type: "economy", img: "assets/cars/economy/kalina.jpg" },
        { name: "Lada Priora", power: 98, basePrice: 280000, type: "economy", img: "assets/cars/economy/priora.jpg" },
        { name: "Daewoo Matiz", power: 51, basePrice: 120000, type: "economy", img: "assets/cars/economy/matiz.jpg" },
        { name: "Daewoo Nexia", power: 80, basePrice: 150000, type: "economy", img: "assets/cars/economy/nexia.jpg" },
        { name: "Chevrolet Lanos", power: 86, basePrice: 170000, type: "economy", img: "assets/cars/economy/lanos.jpg" },
        { name: "Renault Logan I", power: 75, basePrice: 350000, type: "economy", img: "assets/cars/economy/logan.jpg" },
        { name: "Nissan Almera Classic", power: 107, basePrice: 400000, type: "economy", img: "assets/cars/economy/almera.jpg" },
        { name: "Ford Focus I", power: 100, basePrice: 300000, type: "economy", img: "assets/cars/economy/focus1.jpg" },
        { name: "Hyundai Solaris I", power: 123, basePrice: 620000, type: "economy", img: "assets/cars/economy/solaris.jpg" },
        { name: "Kia Rio 3", power: 123, basePrice: 650000, type: "economy", img: "assets/cars/economy/rio.jpg" },
        { name: "Toyota Mark II (JZX90)", power: 180, basePrice: 450000, type: "economy", img: "assets/cars/economy/mark2.jpg" },
        { name: "Mitsubishi Lancer IX", power: 98, basePrice: 380000, type: "economy", img: "assets/cars/economy/lancer9.jpg" },
        { name: "BMW E34 520i", power: 150, basePrice: 250000, type: "economy", img: "assets/cars/economy/e34.jpg" },
        { name: "Mercedes W210", power: 136, basePrice: 300000, type: "economy", img: "assets/cars/economy/w210.jpg" },
        { name: "BMW E38 740i", power: 286, basePrice: 450000, type: "economy", img: "assets/cars/economy/e38.jpg" },
        { name: "Audi A6 C5", power: 165, basePrice: 350000, type: "economy", img: "assets/cars/economy/a6c5.jpg" },
        { name: "Range Rover P38", power: 218, basePrice: 400000, type: "economy", img: "assets/cars/economy/p38.jpg" },
        { name: "Porsche Cayenne 955", power: 340, basePrice: 500000, type: "economy", img: "assets/cars/economy/cayenne_old.jpg" },
        { name: "Mercedes W140 S500", power: 320, basePrice: 600000, type: "economy", img: "assets/cars/economy/w140.jpg" }
    ],
    scooter: [
        { name: "Honda Dio AF34", power: 7, basePrice: 45000, type: "scooter", img: "assets/moto/dio.jpg" },
        { name: "Yamaha Jog ZR", power: 8, basePrice: 55000, type: "scooter", img: "assets/moto/jog.jpg" },
        { name: "Suzuki Lets 2", power: 6, basePrice: 35000, type: "scooter", img: "assets/moto/lets.jpg" },
        { name: "Vespa LX 125", power: 10, basePrice: 120000, type: "scooter", img: "assets/moto/vespa.jpg" }
    ],
    moto: [
        { name: "Bajaj Pulsar NS200", power: 25, basePrice: 240000, type: "moto", img: "assets/moto/pulsar.jpg" },
        { name: "Kawasaki Ninja 300", power: 39, basePrice: 450000, type: "moto", img: "assets/moto/ninja.jpg" },
        { name: "Honda CB400 Super Four", power: 53, basePrice: 350000, type: "moto", img: "assets/moto/cb400.jpg" },
        { name: "Yamaha MT-07", power: 74, basePrice: 890000, type: "moto", img: "assets/moto/mt07.jpg" },
        { name: "KTM 390 Duke", power: 44, basePrice: 550000, type: "moto", img: "assets/moto/duke.jpg" },
        { name: "Harley-Davidson Iron 883", power: 51, basePrice: 1200000, type: "moto", img: "assets/moto/iron883.jpg" },
        { name: "Triumph Bonneville T100", power: 55, basePrice: 1300000, type: "moto", img: "assets/moto/bonneville.jpg" },
        { name: "Kawasaki Z900", power: 125, basePrice: 1100000, type: "moto", img: "assets/moto/z900.jpg" },
        { name: "BMW R1250GS", power: 136, basePrice: 2500000, type: "moto", img: "assets/moto/gs1250.jpg" },
        { name: "Suzuki Hayabusa", power: 197, basePrice: 1800000, type: "moto", img: "assets/moto/hayabusa.jpg" },
        { name: "Yamaha YZF-R1", power: 200, basePrice: 2200000, type: "moto", img: "assets/moto/r1.jpg" },
        { name: "Ducati Panigale V4", power: 214, basePrice: 3200000, type: "moto", img: "assets/moto/ducati.jpg" }
    ],
    atv: [
        { name: "CFMOTO CFORCE 500", power: 35, basePrice: 620000, type: "atv", img: "assets/moto/cforce.jpg" },
        { name: "Stels Guepard 850", power: 71, basePrice: 950000, type: "atv", img: "assets/moto/guepard.jpg" },
        { name: "Suzuki KingQuad 750", power: 50, basePrice: 1200000, type: "atv", img: "assets/moto/kingquad.jpg" },
        { name: "Polaris Sportsman 850", power: 78, basePrice: 1600000, type: "atv", img: "assets/moto/sportsman.jpg" },
        { name: "Yamaha Grizzly 700", power: 49, basePrice: 1400000, type: "atv", img: "assets/moto/grizzly.jpg" },
        { name: "BRP Can-Am Maverick", power: 195, basePrice: 3500000, type: "atv", img: "assets/moto/maverick.jpg" }
    ],
    comfort: [
        { name: "VW Polo Sedan", power: 110, basePrice: 850000, type: "comfort", img: "assets/cars/comfort/polo.jpg" },
        { name: "Ford Focus III", power: 125, basePrice: 950000, type: "comfort", img: "assets/cars/comfort/focus.jpg" },
        { name: "Chevrolet Cruze", power: 109, basePrice: 750000, type: "comfort", img: "assets/cars/comfort/cruze.jpg" },
        { name: "Hyundai Elantra", power: 128, basePrice: 1100000, type: "comfort", img: "assets/cars/comfort/elantra.jpg" },
        { name: "Kia Cerato", power: 130, basePrice: 1150000, type: "comfort", img: "assets/cars/comfort/cerato.jpg" },
        { name: "Skoda Octavia A7 1.8", power: 180, basePrice: 1450000, type: "comfort", img: "assets/cars/comfort/octavia.jpg" },
        { name: "VW Jetta", power: 150, basePrice: 1300000, type: "comfort", img: "assets/cars/comfort/jetta.jpg" },
        { name: "Opel Astra J", power: 140, basePrice: 850000, type: "comfort", img: "assets/cars/comfort/astra.jpg" },
        { name: "Peugeot 408", power: 120, basePrice: 900000, type: "comfort", img: "assets/cars/comfort/peugeot408.jpg" },
        { name: "Toyota Corolla E150", power: 124, basePrice: 1050000, type: "comfort", img: "assets/cars/comfort/corolla.jpg" },
        { name: "Mazda 3 (BM)", power: 120, basePrice: 1250000, type: "comfort", img: "assets/cars/comfort/mazda3.jpg" },
        { name: "Ford Mondeo V", power: 149, basePrice: 1600000, type: "comfort", img: "assets/cars/comfort/mondeo.jpg" },
        { name: "Hyundai Sonata", power: 150, basePrice: 1900000, type: "comfort", img: "assets/cars/comfort/sonata.jpg" },
        { name: "Kia Optima", power: 150, basePrice: 1850000, type: "comfort", img: "assets/cars/comfort/optima.jpg" },
        { name: "Toyota Camry XV50", power: 181, basePrice: 1800000, type: "comfort", img: "assets/cars/comfort/camry.jpg" },
        { name: "Kia K5", power: 194, basePrice: 2400000, type: "comfort", img: "assets/cars/comfort/k5.jpg" },
        { name: "VW Golf VI GTI", power: 260, basePrice: 1450000, type: "comfort", img: "assets/cars/comfort/golf6.jpg" },
        { name: "Renault Duster", power: 143, basePrice: 1100000, type: "comfort", img: "assets/cars/comfort/duster.jpg" },
        { name: "Hyundai Creta", power: 123, basePrice: 1500000, type: "comfort", img: "assets/cars/comfort/creta.jpg" },
        { name: "Nissan Qashqai", power: 144, basePrice: 1600000, type: "comfort", img: "assets/cars/comfort/qashqai.jpg" },
        { name: "Skoda Karoq", power: 150, basePrice: 2100000, type: "comfort", img: "assets/cars/comfort/karoq.jpg" },
        { name: "Toyota RAV4", power: 149, basePrice: 2500000, type: "comfort", img: "assets/cars/comfort/rav4.jpg" },
        { name: "Mazda CX-5", power: 150, basePrice: 2300000, type: "comfort", img: "assets/cars/comfort/cx5.jpg" },
        { name: "Geely Coolray", power: 150, basePrice: 2100000, type: "comfort", img: "assets/cars/comfort/coolray.jpg" },
        { name: "Haval Jolion", power: 150, basePrice: 2000000, type: "comfort", img: "assets/cars/comfort/jolion.jpg" }
    ],
    premium: [
        { name: "BMW 5 Series (G30)", power: 190, basePrice: 3500000, type: "premium", img: "assets/cars/premium/g30.jpg" },
        { name: "Mercedes E-Class (W213)", power: 197, basePrice: 3800000, type: "premium", img: "assets/cars/premium/w213.jpg" },
        { name: "Audi A6 (C8)", power: 245, basePrice: 4000000, type: "premium", img: "assets/cars/premium/a6.jpg" },
        { name: "BMW X7", power: 184, basePrice: 3800000, type: "premium", img: "assets/cars/premium/bmwx7.jpg" },
        { name: "Mercedes C63s AMG", power: 197, basePrice: 4200000, type: "premium", img: "assets/cars/premium/mercedes_c_с63_w205_sedan.jpeg" },
        { name: "BMW M340i", power: 249, basePrice: 4800000, type: "premium", img: "assets/cars/premium/bmw_m_340i.jpeg" },
        { name: "Lexus RX 350", power: 300, basePrice: 5500000, type: "premium", img: "assets/cars/premium/rx350.jpg" },
        { name: "Porsche Macan S", power: 354, basePrice: 6500000, type: "premium", img: "assets/cars/premium/macan.jpg" },
        { name: "Audi Q7", power: 249, basePrice: 7000000, type: "premium", img: "assets/cars/premium/q7.jpg" },
        { name: "BMW X5 (G05)", power: 340, basePrice: 8500000, type: "premium", img: "assets/cars/premium/x5.jpg" },
        { name: "BMW X6 (G06)", power: 340, basePrice: 9000000, type: "premium", img: "assets/cars/premium/x6.jpg" },
        { name: "Mercedes GLE 400d", power: 330, basePrice: 9500000, type: "premium", img: "assets/cars/premium/gle.jpg" },
        { name: "Porsche Cayenne (PO536)", power: 340, basePrice: 10500000, type: "premium", img: "assets/cars/premium/cayenne_new.jpg" },
        { name: "Audi Q8", power: 340, basePrice: 9800000, type: "premium", img: "assets/cars/premium/q8.jpg" },
        { name: "Lexus LX 600", power: 415, basePrice: 14000000, type: "premium", img: "assets/cars/premium/lx600.jpg" },
        { name: "Toyota Land Cruiser 300", power: 415, basePrice: 12000000, type: "premium", img: "assets/cars/premium/lc300.jpg" },
        { name: "Range Rover Sport", power: 400, basePrice: 13500000, type: "premium", img: "assets/cars/premium/rr_sport.jpg" },
        { name: "Volvo XC90", power: 235, basePrice: 6800000, type: "premium", img: "assets/cars/premium/xc90.jpg" },
        { name: "Genesis GV80", power: 249, basePrice: 7500000, type: "premium", img: "assets/cars/premium/gv80.jpg" },
        { name: "Cadillac Escalade", power: 416, basePrice: 11000000, type: "premium", img: "assets/cars/premium/escalade.jpg" },
        { name: "Infiniti QX80", power: 405, basePrice: 8500000, type: "premium", img: "assets/cars/premium/qx80.jpg" },
        { name: "Maserati Levante", power: 350, basePrice: 9000000, type: "premium", img: "assets/cars/premium/levante.jpg" },
        { name: "Mercedes S-Class (W223)", power: 367, basePrice: 16000000, type: "premium", img: "assets/cars/premium/w223.jpg" },
        { name: "BMW 7 Series (G70)", power: 381, basePrice: 15500000, type: "premium", img: "assets/cars/premium/g70.jpg" },
        { name: "Mercedes G63 AMG", power: 585, basePrice: 14500000, type: "premium", img: "assets/cars/premium/mercedes_g63amg.jpg" },
        { name: "Porsche Panamera Turbo S", power: 630, basePrice: 13500000, type: "premium", img: "assets/cars/premium/panamera.jpg" },
        { name: "Audi RS6 Avant", power: 600, basePrice: 12800000, type: "premium", img: "assets/cars/premium/rs6.jpg" }
    ],
    hyper: [
        { name: "Nissan GT-R R35", power: 570, basePrice: 12000000, type: "hyper", img: "assets/cars/hyper/gtr.jpg" },
        { name: "Porsche 911 GT3 RS", power: 525, basePrice: 29000000, type: "hyper", img: "assets/cars/hyper/911.jpg" },
        { name: "Lamborghini Huracan", power: 640, basePrice: 35000000, type: "hyper", img: "assets/cars/hyper/huracan.jpg" },
        { name: "Ferrari SF90 Stradale", power: 1000, basePrice: 75000000, type: "hyper", img: "assets/cars/hyper/sf90.jpg" },
        { name: "McLaren 720S", power: 720, basePrice: 32000000, type: "hyper", img: "assets/cars/hyper/mclaren.jpg" },
        { name: "Lamborghini Aventador SVJ", power: 770, basePrice: 65000000, type: "hyper", img: "assets/cars/hyper/aventador.jpg" },
        { name: "Porsche 918 Spyder", power: 887, basePrice: 120000000, type: "hyper", img: "assets/cars/hyper/918.jpg" },
        { name: "McLaren P1", power: 916, basePrice: 140000000, type: "hyper", img: "assets/cars/hyper/p1.jpg" },
        { name: "LaFerrari", power: 963, basePrice: 250000000, type: "hyper", img: "assets/cars/hyper/laferrari.jpg" },
        { name: "Bugatti Chiron", power: 1500, basePrice: 350000000, type: "hyper", img: "assets/cars/hyper/chiron.jpg" },
        { name: "Koenigsegg Jesko", power: 1600, basePrice: 400000000, type: "hyper", img: "assets/cars/hyper/jesko.jpg" },
        { name: "Pagani Huayra", power: 730, basePrice: 280000000, type: "hyper", img: "assets/cars/hyper/huayra.jpg" },
        { name: "Aston Martin Valkyrie", power: 1160, basePrice: 380000000, type: "hyper", img: "assets/cars/hyper/valkyrie.jpg" }
    ],
    truck: [
        { name: "ЗИЛ-130 (С колхоза)", power: 150, basePrice: 250000, type: "truck", img: "assets/cars/truck/zil.jpg" },
        { name: "Урал NEXT", power: 312, basePrice: 4500000, type: "truck", img: "assets/cars/truck/ural.jpg" },
        { name: "ГАЗель NEXT", power: 149, basePrice: 1800000, type: "truck", img: "assets/cars/truck/gazel.jpg" },
        { name: "КАМАЗ-54901 Continent", power: 460, basePrice: 7200000, type: "truck", img: "assets/cars/truck/kamaz.jpg" },
        { name: "DAF XF 105", power: 460, basePrice: 4500000, type: "truck", img: "assets/cars/truck/daf.jpg" },
        { name: "MAN TGX", power: 480, basePrice: 9500000, type: "truck", img: "assets/cars/truck/man.jpg" },
        { name: "Mercedes-Benz Actros", power: 510, basePrice: 12000000, type: "truck", img: "assets/cars/truck/actros.jpg" },
        { name: "Iveco Stralis", power: 460, basePrice: 3800000, type: "truck", img: "assets/cars/truck/iveco.jpg" },
        { name: "Renault T-High", power: 520, basePrice: 8500000, type: "truck", img: "assets/cars/truck/renault_t.jpg" },
        { name: "Freightliner Cascadia", power: 505, basePrice: 6500000, type: "truck", img: "assets/cars/truck/freightliner.jpg" },
        { name: "Peterbilt 389", power: 550, basePrice: 14000000, type: "truck", img: "assets/cars/truck/peterbilt.jpg" },
        { name: "Kenworth W900", power: 600, basePrice: 15500000, type: "truck", img: "assets/cars/truck/kenworth.jpg" },
        { name: "Volvo FH16", power: 750, basePrice: 15500000, type: "truck", img: "assets/cars/truck/volvo.jpg" }
    ],
    yacht: [
        { name: "Гидроцикл Yamaha FX", power: 250, basePrice: 1800000, type: "yacht", img: "assets/cars/yacht/yamaha.jpg" },
        { name: "Катер Bayliner VR5", power: 200, basePrice: 4500000, type: "yacht", img: "assets/cars/yacht/bayliner.jpg" },
        { name: "Azimut Atlantis 45", power: 880, basePrice: 75000000, type: "yacht", img: "assets/cars/yacht/azimut.jpg" },
        { name: "Sunseeker 95 Yacht", power: 3900, basePrice: 450000000, type: "yacht", img: "assets/cars/yacht/sunseeker.jpg" }
    ]
};

// ========================================================
// НЕДВИЖИМОСТЬ: РЕАЛЬНЫЕ ОБЛОЖКИ И НАДЕЖНЫЕ FALLBACKS
// ========================================================
const HOUSING_LIST = [
    { 
        id: 'trailer', name: 'Бытовка на стройплощадке', rent: 800, buyPrice: 450000, slots: 0, moodBonus: -5, minLevel: 1, 
        desc: 'Временный вагончик. Сквозняки, запах мазута, но крыша над головой.', 
        img: 'assets/houses/trailer.jpg',
        fallback: 'https://images.unsplash.com/photo-1590725140246-201552a488c9?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'room', name: 'Комната в общежитии', rent: 2500, buyPrice: 1800000, slots: 1, moodBonus: 5, minLevel: 2, 
        desc: 'Угол в спальном районе. Одно парковочное место под окном во дворе.', 
        img: 'assets/houses/room.jpg',
        fallback: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'khrusch', name: 'Убитая "Хрущевка"', rent: 15000, buyPrice: 4500000, slots: 1, moodBonus: 10, minLevel: 6, 
        desc: 'Бабушкин ремонт, старый паркет, зато своя кухня.', 
        img: 'assets/houses/khrusch.jpg',
        fallback: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'garage', name: 'Кирпичный гараж с ямой', rent: 18000, buyPrice: 3000000, slots: 3, moodBonus: 12, minLevel: 10, 
        desc: 'Капитальный бокс с верстаком, печкой и смотровой ямой.', 
        img: 'assets/houses/garage.jpg',
        fallback: 'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'dvushka', name: 'Двушка в спальном районе', rent: 25000, buyPrice: 8500000, slots: 2, moodBonus: 15, minLevel: 15, 
        desc: 'Хороший кирпичный дом, стеклопакеты и парковка во дворе.', 
        img: 'assets/houses/dvushka.jpg',
        fallback: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'euro_treshka', name: 'Евро-трешка (Новостройка)', rent: 45000, buyPrice: 15000000, slots: 3, moodBonus: 25, minLevel: 22, 
        desc: 'Свежий ремонт, закрытый двор без машин и консьерж.', 
        img: 'assets/houses/treshka.jpg',
        fallback: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'cottage', name: 'Коттедж за городом', rent: 65000, buyPrice: 22000000, slots: 6, moodBonus: 30, minLevel: 30, 
        desc: 'Собственный участок, просторный гараж и мангальная зона.', 
        img: 'assets/houses/cottage.jpg',
        fallback: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'loft', name: 'Дизайнерский Лофт в центре', rent: 80000, buyPrice: 35000000, slots: 4, moodBonus: 35, minLevel: 45, 
        desc: 'Красный кирпич, панорамные окна и вид на набережную.', 
        img: 'assets/houses/loft.jpg',
        fallback: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'penthouse', name: 'Пентхаус в Москва-Сити', rent: 250000, buyPrice: 140000000, slots: 6, moodBonus: 50, minLevel: 65, 
        desc: 'Панорамный вид с 65 этажа и доступ в подземный VIP-паркинг.', 
        img: 'assets/houses/penthouse.jpg',
        fallback: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'villa', name: 'Особняк на Рублёвке', rent: 600000, buyPrice: 450000000, slots: 15, moodBonus: 80, minLevel: 85, 
        desc: 'Гектар сосен, вертолетная площадка и гаражный комплекс.', 
        img: 'assets/houses/villa.jpg',
        fallback: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'island', name: 'Частный остров с виллой', rent: 2000000, buyPrice: 1500000000, slots: 30, moodBonus: 100, minLevel: 100, 
        desc: 'Абсолютная автономия, личный пирс для яхт и ангар для спорткаров.', 
        img: 'assets/houses/island.jpg',
        fallback: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
    }
];

// ========================================================
// ПРЕДПРИЯТИЯ И БИЗНЕС С ОБЛОЖКАМИ
// ========================================================
const BUSINESS_DATA = [
    { 
        id: 'wash', name: 'Автомойка 24/7', minLevel: 5, income: 900, level: 0, cost: 90000, stored: 0, stock: 100, 
        perk: 'Скидка 50% на полировку и химчистку', 
        img: 'assets/business/wash.jpg',
        fallback: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'shina', name: 'Шиномонтаж «У Алика»', minLevel: 8, income: 1500, level: 0, cost: 150000, stored: 0, stock: 100, 
        perk: '+10% к стоимости авто на правильных дисках', 
        img: 'assets/business/shina.jpg',
        fallback: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'sto', name: 'СТО дяди Вани', minLevel: 12, income: 2200, level: 0, cost: 300000, stored: 0, stock: 100, 
        perk: 'Скидка 40% на ремонт мотора', 
        img: 'assets/business/sto.jpg',
        fallback: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'detailing', name: 'Детейлинг Студия', minLevel: 20, income: 6500, level: 0, cost: 950000, stored: 0, stock: 100, 
        perk: '+35% к баллам на Автошоу', 
        img: 'assets/business/detailing.jpg',
        fallback: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'razborka', name: 'Авторазборка «Последний путь»', minLevel: 22, income: 8000, level: 0, cost: 1200000, stored: 0, stock: 100, 
        perk: 'Детали на ремонт обходятся дешевле на 30%', 
        img: 'assets/business/razborka.jpg',
        fallback: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=600&q=80'
    },
    { 
        id: 'taxi', name: 'Таксопарк (15 авто)', minLevel: 32, income: 18000, level: 0, cost: 3800000, stored: 0, stock: 100, 
        perk: 'Пассивный доход и +1 🤝 связь каждый день', 
        img: 'assets/business/taxi.jpg',
        fallback: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80'
    }
];

// ========================================================
// 4 ГРЕЙДА САРАЕВ С ОБЛОЖКАМИ И FALLBACKS
// ========================================================
const BARN_TIERS_CONFIG = [
    { 
        tier: 1, reqLvl: 1, cost: 35000, title: "🏚️ Сарай в СНТ «Заря»", 
        desc: "Дачный кооператив. Старый деревянный сарай среди яблонь. Советская классика.", 
        classGrade: "barn-grade-1", rareIdx: 0,
        img: "assets/barns/barn_tier1.jpg",
        fallback: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80"
    },
    { 
        tier: 2, reqLvl: 7, cost: 120000, title: "🏢 Заброшенный бокс ГСК-4", 
        desc: "Кооператив возле промзоны. Ржавые ворота, но сухой бетон внутри.", 
        classGrade: "barn-grade-2", rareIdx: 1,
        img: "assets/barns/barn_tier2.jpg",
        fallback: "https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?auto=format&fit=crop&w=600&q=80"
    },
    { 
        tier: 3, reqLvl: 15, cost: 350000, title: "🏭 Ангар механического завода", 
        desc: "Закрытый цех советского завода. Высокие потолки, пыльные чехлы и JDM янгтаймеры.", 
        classGrade: "barn-grade-3", rareIdx: 2,
        img: "assets/barns/barn_tier3.jpg",
        fallback: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80"
    },
    { 
        tier: 4, reqLvl: 25, cost: 850000, title: "🏛️ Подземный коллекционный бункер", 
        desc: "Опечатанный подземный паркинг обанкротившегося банка. Настоящая сокровищница!", 
        classGrade: "barn-grade-4", rareIdx: 4,
        img: "assets/barns/barn_tier4.jpg",
        fallback: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80"
    }
];

const BARN_FINDS = [
    { name: "ВАЗ-2101 «Копейка» (Дрифт-Спек)", power: 160, type: 'economy', basePrice: 850000, marketValue: 1250000, img: "assets/cars/barn/vaz2101_drift.jpg" },
    { name: "BMW E30 Coupe", power: 170, type: 'comfort', basePrice: 650000, marketValue: 1300000, img: "assets/cars/barn/e30.jpg" },
    { name: "Nissan Silvia S13", power: 200, type: 'comfort', basePrice: 900000, marketValue: 1800000, img: "assets/cars/barn/silvia.jpg" },
    { name: "VW Golf VI GTI (Stage 2 Project)", power: 280, type: 'comfort', basePrice: 1100000, marketValue: 1900000, img: "assets/cars/barn/golf6.jpg" },
    { name: "ГАЗ-24 «Волга» V8", power: 220, type: 'economy', basePrice: 700000, marketValue: 1500000, img: "assets/cars/barn/volga24.jpg" },
    { name: "Nissan Skyline GT-R R34 (В пыли)", power: 280, type: 'premium', basePrice: 4500000, marketValue: 9500000, img: "assets/cars/barn/r34.jpg" },
    { name: "Toyota Supra A80 (Без мотора)", power: 0, type: 'premium', basePrice: 3200000, marketValue: 7000000, img: "assets/cars/barn/supra.jpg" }
];

// ========================================================
// ЛАВКА ФОРТУНЫ: ПОКУПКИ И АЗАРТНЫЕ ПАКИ
// ========================================================
const FORTUNE_SHOP_CATALOG = [
    {
        id: "super_spin_ticket_1",
        title: "🎫 1х Билет «Супер Вилспин»",
        desc: "Вращение Forza-слота: Автомобиль + Ресурсы + Эксклюзивы!",
        costStars: 35,
        costCash: 350000,
        type: "superspin",
        count: 1
    },
    {
        id: "super_spin_ticket_3",
        title: "🎟️ 3х Билета «Супер Вилспин» (Пак)",
        desc: "Скидка 20%! Три шанса забрать суперкар и сорвать джекпот.",
        costStars: 85,
        costCash: 850000,
        type: "superspin",
        count: 3
    },
    {
        id: "fuel_canister_max",
        title: "⛽ Канистра Экстра 100 ⛽",
        desc: "Моментальная заправка бака без ожидания и очередей на АЗС.",
        costStars: 5,
        costCash: 5000,
        type: "fuel",
        amount: 100
    },
    {
        id: "express_tickets_pack",
        title: "⚡ Экспресс-Талоны (25 шт)",
        desc: "25 мгновенных призывов клиентов на площадку продажи.",
        costStars: 15,
        costCash: 60000,
        type: "express",
        amount: 25
    },
    {
        id: "connection_token",
        title: "🤝 Теневая Связь Синдиката",
        desc: "+1 Связь для Решалы (снятие розыска, крыша ГИБДД, контракты).",
        costStars: 20,
        costCash: 150000,
        type: "connection",
        amount: 1
    },
    {
        id: "vip_pro_pass",
        title: "👑 VIP Pro Статус (7 дней)",
        desc: "Удвоенный XP, бесплатная Автотека 0 ₽, иммунитет от рейдов ДПС!",
        costStars: 60,
        costCash: 600000,
        type: "vip",
        days: 7
    }
];

// ========================================================
// ДРУГИЕ СПИСКИ И КАТАЛОГИ
// ========================================================
const SHOP_CATALOG = {
    tools: [
        { id: "gauge", name: "Магнитный толщиномер ЛКП (Базовый)", cost: 35000, desc: "Проверяет шпаклёвку и вторичные окрасы на рынке без оплаты услуг эксперта.", icon: "fa-ruler-combined" },
        { id: "gauge_pro", name: "Ультразвуковой толщиномер Pro (Цветмет)", cost: 75000, desc: "Точность до 1 мкм. Моментально находит переходы на алюминии и пластике.", icon: "fa-microchip" },
        { id: "obd", name: "Диагностический автосканер ELM327 Bluetooth", cost: 65000, desc: "Считывает коды DTC в ЭБУ и открывает доступ к Заказам Синдиката.", icon: "fa-laptop-code" },
        { id: "obd_launch", name: "Профессиональный мультимарочный сканер Launch", cost: 180000, desc: "Глубокая адаптация блоков, сброс сервисных интервалов и чтение реального пробега в АКПП.", icon: "fa-tablet-screen-button" },
        { id: "endoscope", name: "HD Видеоэндоскоп мотора с поворотной камерой", cost: 95000, desc: "Позволяет заглянуть в цилиндры перед покупкой: выявляет задиры и нагар на клапанах.", icon: "fa-video" },
        { id: "compressor", name: "Профессиональный компрессометр", cost: 45000, desc: "Замер компрессии в цилиндрах: предупреждает о прогаре поршня и залегших кольцах.", icon: "fa-gauge-high" },
        { id: "battery_tester", name: "Нагрузочная вилка аккумулятора", cost: 25000, desc: "Быстрая проверка емкости и пускового тока АКБ перед зимним сезоном.", icon: "fa-car-battery" }
    ],
    consumables: [
        { id: "oil_pack", name: "Партия синтетического масла и фильтров", cost: 25000, value: 30, desc: "+30% сырья на СТО дяди Вани. Обеспечивает бесперебойную работу подъемников." },
        { id: "chem_pack", name: "Бочка премиальной автохимии и шампуней", cost: 45000, value: 50, desc: "+50% сырья для Автомойки и Детейлинга. Поддерживает идеальный блеск." },
        { id: "tires_stock", name: "Комплект полусликов и жгутов для шиномонтажа", cost: 35000, value: 40, desc: "+40% сырья на Шиномонтаж «У Алика». Устраняет дефицит расходников." },
        { id: "brake_pack", name: "Оптовая партия тормозных колодок и дисков", cost: 55000, value: 50, desc: "+50% запаса деталей на Авторазборку. Увеличивает доходность контрактов." },
        { id: "full_stock", name: "Генеральный оптовый запас (100% на все точки)", cost: 140000, value: 100, desc: "Мгновенно заполняет склады всех имеющихся предприятий до 100%!" }
    ],
    tuningParts: [
        { id: "raf_license", name: "Гоночная Лицензия пилота РАФ", cost: 85000, desc: "Официальный регламентный допуск к ночным заездам на 402м (покупается 1 раз на аккаунт).", icon: "fa-id-card" },
        { id: "insurance_osago", name: "Годовой полис «КАСКО / Анти-Угон»", cost: 45000, desc: "100% защита от случайных повреждений на парковке, подстав и попыток угона авто в гараже.", icon: "fa-shield-halved" },
        { id: "gps_tracker", name: "Скрытый поисковый GPS/ГЛОНАСС маяк", cost: 30000, desc: "Позволяет моментально найти и вернуть угнанную машину без помощи полиции и Решалы.", icon: "fa-satellite-dish" }
    ]
};

const HOUSING_INTERIOR_CATALOG = [
    { id: "home_ps5", name: "🎮 Игровая консоль PlayStation 5", cost: 75000, perk: "+25% настроения и куража каждый день" },
    { id: "home_leather_sofa", name: "🛋️ Кожаный итальянский диван", cost: 120000, perk: "+15% к восстановлению сил и сытости" },
    { id: "home_cinema_audio", name: "🍿 Домашний кинотеатр 4K", cost: 250000, perk: "+35% настроения и статус перед гостями" },
    { id: "home_safe_valberg", name: "🔒 Огнеупорный сейф перекупа", cost: 180000, perk: "Защита заначки от проверок и облав" },
    { id: "home_garage_lift", name: "🏗️ Гидравлический автоподъёмник в гараж", cost: 320000, perk: "Ускоряет ремонт скрытых дефектов авто на 50%" },
    { id: "home_cctv", name: "📹 Система видеонаблюдения периметра", cost: 140000, perk: "Снижает шанс ночного угона авто из гаража до 0%" }
];

const STREET_CHAT_LOG = [
    { author: "🚨 ДПС_Инфо", text: "Внимание! На ул. Ленина рейд по 12.5.1, прячьте прямотоки!", warning: true },
    { author: "🚨 ДПС_Инфо", text: "Экипаж с люстрой стоит у ТЦ Галерея, тормозят всех тонированных.", warning: true },
    { author: "Vazovod_77", text: "Куплю кузов под корч ВАЗ 2107 или 2101, срочно в лс!", warning: false },
    { author: "Major_Vova", text: "Завтра сходка на парковке, вход только для немцев.", warning: false },
    { author: "JDM_King", text: "Кто может заварить редуктор по-братски за пиво?", warning: false },
    { author: "Perecup_Pro", text: "Продам Солярис, не бит не крашен (крашена только крыша).", warning: false },
    { author: "Sanya_Garage", text: "Делаю капиталку за 3 дня, гарантия до ворот. Цены в лс.", warning: false },
    { author: "Mark_2_Top", text: "Ищу столб... тьфу, задний бампер на марк 2.", warning: false },
    { author: "Maga_M5", text: "Встану на 402 метра с любым. Ставка 500к.", warning: false },
    { author: "Kislota_Drift", text: "Пацаны, у кого есть съёмник пружин? Срочно надо дропнуть тачку.", warning: false }
];

const CONTAINER_ITEMS = [
    { id: 'japan', name: 'Японский Контейнер', cost: 150000, timer: 30, minLevel: 12, badge: 'JDM & Мото', desc: 'Прямые поставки из порта Кобе.', img: 'assets/containers/japan.jpg' },
    { id: 'europe', name: 'Европейский Автовоз', cost: 450000, timer: 35, minLevel: 15, badge: 'Комфорт & Премиум', desc: 'Автомобили из Германии без пробега по РФ.', img: 'assets/containers/europe.jpg' },
    { id: 'usa_auction', name: 'Американский Аукцион', cost: 750000, timer: 40, minLevel: 18, badge: 'Битые & Маслкары', desc: 'Контейнер с Copart. Кот в мешке.', img: 'assets/containers/usa.jpg' },
    { id: 'china_ship', name: 'Китайский Сухогруз', cost: 950000, timer: 38, minLevel: 22, badge: 'Электрички & Новые', desc: 'Свежие Lixiang и Zeekr прямиком из Гуанчжоу.', img: 'assets/containers/china.jpg' },
    { id: 'dubai', name: 'Эмиратский Контейнер', cost: 1200000, timer: 45, minLevel: 25, badge: 'Катера & Суперкары', desc: 'Аукционная роскошь шейхов.', img: 'assets/containers/dubai.jpg' },
    { id: 'hangar', name: 'Заброшенный Ангар', cost: 5000000, timer: 60, minLevel: 30, badge: 'Тягачи & Гиперкары', desc: 'Списанное имущество логистического хаба!', img: 'assets/containers/hangar.jpg' }
];

const SELLER_ADS_PHRASES = [
    "«Дедушка ездил только летом на дачу!»", 
    "«Сел и поехал, мотор шепчет.»", 
    "«Перекупам и салонам не звонить!»",
    "«Прошита Stage 2, дует отлично, новый байпас.»",
    "«Машина в идеале, любые проверки за ваш счет.»",
    "«Продаю со слезами на глазах...»",
    "«Вложений не требует, только масло долить.»",
    "«Красилась только одна дверь (косметика).»",
    "«Ездила девушка, маршрут дом-работа-сад.»",
    "«Пробег родной 100%, можете проверять по базам.»",
    "«Не бита, не крашена, мамой клянусь!»",
    "«В салоне не курили, матом не ругались.»",
    "«Перекупы мимо, отдаю только в хорошие руки.»",
    "«Двигатель работает как швейцарские часы.»"
];

const DIETS = [
    { id: 'water', name: 'Вода из-под крана', cost: 0, hunger: 5, mood: -30, desc: 'Живот крутит, жить не хочется' },
    { id: 'doshik', name: 'Бич-пакет и сухари', cost: 150, hunger: 20, mood: -15, desc: 'Желудок ноет, депрессия, тяжело торговаться' },
    { id: 'home_sandwich', name: 'Бутерброд из дома', cost: 250, hunger: 30, mood: -5, desc: 'Майонез, колбаса "Красная цена", терпимо' },
    { id: 'pelmeni', name: 'Пельмени по акции', cost: 400, hunger: 45, mood: 0, desc: 'Дешево и сердито, главное сварить' },
    { id: 'shaurma', name: 'Шаурма на вокзале', cost: 800, hunger: 50, mood: -5, desc: 'Сытно, но жирно и тоскливо' },
    { id: 'fastfood', name: 'Фастфуд комбо', cost: 1200, hunger: 60, mood: 10, desc: 'Бургер, картошка, кола. Классика.' },
    { id: 'stolovka', name: 'Обед в столовой', cost: 2200, hunger: 70, mood: 15, desc: 'Нормальное первое, второе и компот' },
    { id: 'cafe', name: 'Бизнес-ланч в ресторане', cost: 6500, hunger: 90, mood: 25, desc: 'Свежий стейк, кофе и уверенность в себе' }
];

const OBD_ERRORS = [
    { text: "P0101: Выход сигнала ДМРВ из допустимого диапазона", cost: 5000, severity: "Низкая" },
    { text: "P0171: Слишком бедная смесь (Подсос воздуха)", cost: 4000, severity: "Средняя" },
    { text: "P0299: Недодув турбины (Утечка или хана улитке)", cost: 45000, severity: "Критическая" },
    { text: "P0300: Множественные пропуски зажигания", cost: 11000, severity: "Средняя" },
    { text: "P0420: Эффективность катализатора ниже порога", cost: 25000, severity: "Средняя" },
    { text: "P0700: Неисправность системы управления АКПП", cost: 8000, severity: "Высокая" },
    { text: "P0016: Рассинхронизация распредвала и коленвала", cost: 85000, severity: "Критическая (Цепь ГРМ)" },
    { text: "P0404: Неисправность клапана EGR (Засорен)", cost: 12000, severity: "Средняя" },
    { text: "P0340: Ошибка датчика положения распредвала", cost: 6500, severity: "Низкая" }
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
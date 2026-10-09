// ========================================================
// data.js — ГЛОБАЛЬНАЯ БАЗА ДАННЫХ «СИМУЛЯТОР ПЕРЕКУПА» (v0.4.0)
// Расширенная версия: больше авто, предметов, недвижимости и ивентов
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
        { name: "Lada Granta I", power: 87, basePrice: 280000, type: "economy", img: "assets/cars/economy/granta.jpg" },
        { name: "Lada Kalina I", power: 81, basePrice: 220000, type: "economy", img: "assets/cars/economy/kalina.jpg" },
        { name: "Lada Priora", power: 98, basePrice: 280000, type: "economy", img: "assets/cars/economy/priora.jpg" },
        { name: "Lada Vesta", power: 106, basePrice: 650000, type: "economy", img: "assets/cars/economy/vesta.jpg" },
        { name: "ГАЗ-3110 «Волга»", power: 130, basePrice: 120000, type: "economy", img: "assets/cars/economy/volga.jpg" },
        { name: "Daewoo Matiz", power: 51, basePrice: 120000, type: "economy", img: "assets/cars/economy/matiz.jpg" },
        { name: "Daewoo Nexia", power: 80, basePrice: 150000, type: "economy", img: "assets/cars/economy/nexia.jpg" },
        { name: "Chevrolet Lanos", power: 86, basePrice: 170000, type: "economy", img: "assets/cars/economy/lanos.jpg" },
        { name: "Renault Logan I", power: 75, basePrice: 350000, type: "economy", img: "assets/cars/economy/logan.jpg" },
        { name: "Renault Sandero", power: 82, basePrice: 420000, type: "economy", img: "assets/cars/economy/sandero.jpg" },
        { name: "Nissan Almera Classic", power: 107, basePrice: 400000, type: "economy", img: "assets/cars/economy/almera.jpg" },
        { name: "Ford Focus I", power: 100, basePrice: 300000, type: "economy", img: "assets/cars/economy/focus1.jpg" },
        { name: "Ford Focus II", power: 115, basePrice: 450000, type: "economy", img: "assets/cars/economy/focus2.jpg" },
        { name: "Hyundai Accent", power: 102, basePrice: 250000, type: "economy", img: "assets/cars/economy/accent.jpg" },
        { name: "Hyundai Solaris I", power: 123, basePrice: 620000, type: "economy", img: "assets/cars/economy/solaris.jpg" },
        { name: "Kia Rio 3", power: 123, basePrice: 650000, type: "economy", img: "assets/cars/economy/rio.jpg" },
        { name: "Skoda Rapid I", power: 110, basePrice: 750000, type: "economy", img: "assets/cars/economy/rapid.jpg" },
        { name: "VW Polo Sedan", power: 105, basePrice: 700000, type: "economy", img: "assets/cars/economy/polo.jpg" },
        { name: "Toyota Mark II (JZX90 Самурай)", power: 180, basePrice: 450000, type: "economy", img: "assets/cars/economy/mark2.jpg" },
        { name: "Toyota Chaser (JZX100)", power: 200, basePrice: 550000, type: "economy", img: "assets/cars/economy/chaser.jpg" },
        { name: "Mitsubishi Lancer IX", power: 98, basePrice: 380000, type: "economy", img: "assets/cars/economy/lancer9.jpg" },
        { name: "Honda Civic VIII", power: 140, basePrice: 550000, type: "economy", img: "assets/cars/economy/civic8.jpg" },
        { name: "BMW E34 520i (Гнилая)", power: 150, basePrice: 250000, type: "economy", img: "assets/cars/economy/e34.jpg" },
        { name: "BMW E39 525i", power: 192, basePrice: 400000, type: "economy", img: "assets/cars/economy/e39.jpg" },
        { name: "Mercedes W210 (Лупатый)", power: 136, basePrice: 300000, type: "economy", img: "assets/cars/economy/w210.jpg" },
        { name: "BMW E38 740i (Требует вложений)", power: 286, basePrice: 450000, type: "economy", img: "assets/cars/economy/e38.jpg" },
        { name: "Audi A6 C5 (Проблемы с АКПП)", power: 165, basePrice: 350000, type: "economy", img: "assets/cars/economy/a6c5.jpg" },
        { name: "Range Rover P38 (Пневма упала)", power: 218, basePrice: 400000, type: "economy", img: "assets/cars/economy/p38.jpg" },
        { name: "Porsche Cayenne 955 (Задиры)", power: 340, basePrice: 500000, type: "economy", img: "assets/cars/economy/cayenne_old.jpg" },
        { name: "Mercedes W140 S500 (Кабан)", power: 320, basePrice: 600000, type: "economy", img: "assets/cars/economy/w140.jpg" }
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
        { name: "Ford Focus III", power: 125, basePrice: 950000, type: "comfort", img: "assets/cars/comfort/focus.jpg" },
        { name: "Chevrolet Cruze", power: 109, basePrice: 750000, type: "comfort", img: "assets/cars/comfort/cruze.jpg" },
        { name: "Hyundai Elantra", power: 128, basePrice: 1100000, type: "comfort", img: "assets/cars/comfort/elantra.jpg" },
        { name: "Kia Cerato", power: 130, basePrice: 1150000, type: "comfort", img: "assets/cars/comfort/cerato.jpg" },
        { name: "Skoda Octavia A7 1.8", power: 180, basePrice: 1450000, type: "comfort", img: "assets/cars/comfort/octavia.jpg" },
        { name: "VW Jetta", power: 150, basePrice: 1300000, type: "comfort", img: "assets/cars/comfort/jetta.jpg" },
        { name: "VW Passat B8", power: 180, basePrice: 2200000, type: "comfort", img: "assets/cars/comfort/passat.jpg" },
        { name: "Opel Astra J", power: 140, basePrice: 850000, type: "comfort", img: "assets/cars/comfort/astra.jpg" },
        { name: "Peugeot 408", power: 120, basePrice: 900000, type: "comfort", img: "assets/cars/comfort/peugeot408.jpg" },
        { name: "Toyota Corolla E150", power: 124, basePrice: 1050000, type: "comfort", img: "assets/cars/comfort/corolla.jpg" },
        { name: "Mazda 3 (BM)", power: 120, basePrice: 1250000, type: "comfort", img: "assets/cars/comfort/mazda3.jpg" },
        { name: "Mazda 6 (GJ)", power: 150, basePrice: 1750000, type: "comfort", img: "assets/cars/comfort/mazda6.jpg" },
        { name: "Ford Mondeo V", power: 149, basePrice: 1600000, type: "comfort", img: "assets/cars/comfort/mondeo.jpg" },
        { name: "Hyundai Sonata", power: 150, basePrice: 1900000, type: "comfort", img: "assets/cars/comfort/sonata.jpg" },
        { name: "Kia Optima", power: 150, basePrice: 1850000, type: "comfort", img: "assets/cars/comfort/optima.jpg" },
        { name: "Kia K5", power: 194, basePrice: 2400000, type: "comfort", img: "assets/cars/comfort/k5.jpg" },
        { name: "Toyota Camry XV50", power: 181, basePrice: 1800000, type: "comfort", img: "assets/cars/comfort/camry50.jpg" },
        { name: "Toyota Camry XV70", power: 249, basePrice: 3200000, type: "comfort", img: "assets/cars/comfort/camry70.jpg" },
        { name: "Honda Accord 8", power: 201, basePrice: 1400000, type: "comfort", img: "assets/cars/comfort/accord8.jpg" },
        { name: "VW Golf VI GTI", power: 260, basePrice: 1450000, type: "comfort", img: "assets/cars/comfort/golf6.jpg" },
        { name: "Renault Duster", power: 143, basePrice: 1100000, type: "comfort", img: "assets/cars/comfort/duster.jpg" },
        { name: "Hyundai Creta", power: 123, basePrice: 1500000, type: "comfort", img: "assets/cars/comfort/creta.jpg" },
        { name: "Nissan Qashqai", power: 144, basePrice: 1600000, type: "comfort", img: "assets/cars/comfort/qashqai.jpg" },
        { name: "Skoda Karoq", power: 150, basePrice: 2100000, type: "comfort", img: "assets/cars/comfort/karoq.jpg" },
        { name: "Toyota RAV4", power: 149, basePrice: 2500000, type: "comfort", img: "assets/cars/comfort/rav4.jpg" },
        { name: "Mazda CX-5", power: 150, basePrice: 2300000, type: "comfort", img: "assets/cars/comfort/cx5.jpg" },
        { name: "Geely Coolray", power: 150, basePrice: 2100000, type: "comfort", img: "assets/cars/comfort/coolray.jpg" },
        { name: "Geely Monjaro", power: 238, basePrice: 3500000, type: "comfort", img: "assets/cars/comfort/monjaro.jpg" },
        { name: "Haval Jolion", power: 150, basePrice: 2000000, type: "comfort", img: "assets/cars/comfort/jolion.jpg" }
    ],
    premium: [
        { name: "BMW 5 Series (G30)", power: 190, basePrice: 3500000, type: "premium", img: "assets/cars/premium/g30.jpg" },
        { name: "BMW M5 (F90)", power: 600, basePrice: 9500000, type: "premium", img: "assets/cars/premium/m5f90.jpg" },
        { name: "Mercedes E-Class (W213)", power: 197, basePrice: 3800000, type: "premium", img: "assets/cars/premium/w213.jpg" },
        { name: "Audi A6 (C8)", power: 245, basePrice: 4000000, type: "premium", img: "assets/cars/premium/a6.jpg" },
        { name: "BMW X7", power: 184, basePrice: 3800000, type: "premium", img: "assets/cars/premium/bmwx7.jpg" },
        { name: "Mercedes C63s AMG", power: 197, basePrice: 4200000, type: "premium", img: "assets/cars/premium/mercedes_c_с63_w205_sedan.jpeg" },
        { name: "BMW M340i", power: 249, basePrice: 4800000, type: "premium", img: "assets/cars/premium/bmw_m_340i.jpeg" },
        { name: "Lexus RX 350", power: 300, basePrice: 5500000, type: "premium", img: "assets/cars/premium/rx350.jpg" },
        { name: "Porsche Macan S", power: 354, basePrice: 6500000, type: "premium", img: "assets/cars/premium/macan.jpg" },
        { name: "Audi Q7", power: 249, basePrice: 7000000, type: "premium", img: "assets/cars/premium/q7.jpg" },
        { name: "BMW X5 (G05)", power: 340, basePrice: 8500000, type: "premium", img: "assets/cars/premium/x5.jpg" },
        { name: "BMW X6 M Competition", power: 625, basePrice: 12500000, type: "premium", img: "assets/cars/premium/x6m.jpg" },
        { name: "Mercedes GLE 400d", power: 330, basePrice: 9500000, type: "premium", img: "assets/cars/premium/gle.jpg" },
        { name: "Porsche Cayenne (PO536)", power: 340, basePrice: 10500000, type: "premium", img: "assets/cars/premium/cayenne_new.jpg" },
        { name: "Audi Q8", power: 340, basePrice: 9800000, type: "premium", img: "assets/cars/premium/q8.jpg" },
        { name: "Lexus LX 570", power: 367, basePrice: 8500000, type: "premium", img: "assets/cars/premium/lx570.jpg" },
        { name: "Lexus LX 600", power: 415, basePrice: 14000000, type: "premium", img: "assets/cars/premium/lx600.jpg" },
        { name: "Toyota Land Cruiser 200", power: 235, basePrice: 6000000, type: "premium", img: "assets/cars/premium/lc200.jpg" },
        { name: "Toyota Land Cruiser 300", power: 415, basePrice: 12000000, type: "premium", img: "assets/cars/premium/lc300.jpg" },
        { name: "Range Rover Sport", power: 400, basePrice: 13500000, type: "premium", img: "assets/cars/premium/rr_sport.jpg" },
        { name: "Volvo XC90", power: 235, basePrice: 6800000, type: "premium", img: "assets/cars/premium/xc90.jpg" },
        { name: "Genesis GV80", power: 249, basePrice: 7500000, type: "premium", img: "assets/cars/premium/gv80.jpg" },
        { name: "Cadillac Escalade", power: 416, basePrice: 11000000, type: "premium", img: "assets/cars/premium/escalade.jpg" },
        { name: "Infiniti QX80", power: 405, basePrice: 8500000, type: "premium", img: "assets/cars/premium/qx80.jpg" },
        { name: "Maserati Levante", power: 350, basePrice: 9000000, type: "premium", img: "assets/cars/premium/levante.jpg" },
        { name: "Mercedes S-Class (W223)", power: 367, basePrice: 16000000, type: "premium", img: "assets/cars/premium/w223.jpg" },
        { name: "BMW 7 Series (G70)", power: 381, basePrice: 15500000, type: "premium", img: "assets/cars/premium/g70.jpg" },
        { name: "Mercedes G-Class (W463)", power: 388, basePrice: 6500000, type: "premium", img: "assets/cars/premium/gelik_old.jpg" },
        { name: "Mercedes G63 AMG", power: 585, basePrice: 18500000, type: "premium", img: "assets/cars/premium/mercedes_g63amg.jpg" },
        { name: "Porsche Panamera Turbo S", power: 630, basePrice: 13500000, type: "premium", img: "assets/cars/premium/panamera.jpg" },
        { name: "Audi RS6 Avant", power: 600, basePrice: 12800000, type: "premium", img: "assets/cars/premium/rs6.jpg" },
        { name: "Audi RS7 Sportback", power: 600, basePrice: 14000000, type: "premium", img: "assets/cars/premium/rs7.jpg" }
    ],
    hyper: [
        { name: "Nissan GT-R R35", power: 570, basePrice: 12000000, type: "hyper", img: "assets/cars/hyper/gtr.jpg" },
        { name: "Porsche 911 GT3 RS", power: 525, basePrice: 29000000, type: "hyper", img: "assets/cars/hyper/911.jpg" },
        { name: "Lamborghini Huracan", power: 640, basePrice: 35000000, type: "hyper", img: "assets/cars/hyper/huracan.jpg" },
        { name: "Ferrari SF90 Stradale", power: 1000, basePrice: 75000000, type: "hyper", img: "assets/cars/hyper/sf90.jpg" },
        { name: "McLaren 720S", power: 720, basePrice: 32000000, type: "hyper", img: "assets/cars/hyper/mclaren.jpg" },
        { name: "McLaren Senna", power: 800, basePrice: 110000000, type: "hyper", img: "assets/cars/hyper/senna.jpg" },
        { name: "Lamborghini Aventador SVJ", power: 770, basePrice: 65000000, type: "hyper", img: "assets/cars/hyper/aventador.jpg" },
        { name: "Porsche 918 Spyder", power: 887, basePrice: 120000000, type: "hyper", img: "assets/cars/hyper/918.jpg" },
        { name: "McLaren P1", power: 916, basePrice: 140000000, type: "hyper", img: "assets/cars/hyper/p1.jpg" },
        { name: "LaFerrari", power: 963, basePrice: 250000000, type: "hyper", img: "assets/cars/hyper/laferrari.jpg" },
        { name: "Bugatti Veyron", power: 1001, basePrice: 150000000, type: "hyper", img: "assets/cars/hyper/veyron.jpg" },
        { name: "Bugatti Chiron", power: 1500, basePrice: 350000000, type: "hyper", img: "assets/cars/hyper/chiron.jpg" },
        { name: "Koenigsegg Agera RS", power: 1160, basePrice: 280000000, type: "hyper", img: "assets/cars/hyper/agera.jpg" },
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
        { name: "Гидроцикл Yamaha FX", power: 250, basePrice: 1800000, type: "yacht", img: "assets/water/yamaha.jpg" },
        { name: "Катер Bayliner VR5", power: 200, basePrice: 4500000, type: "yacht", img: "assets/water/bayliner.jpg" },
        { name: "Azimut Atlantis 45", power: 880, basePrice: 75000000, type: "yacht", img: "assets/water/azimut.jpg" },
        { name: "Sunseeker 95 Yacht", power: 3900, basePrice: 450000000, type: "yacht", img: "assets/water/sunseeker.jpg" }
    ]
};

// ========================================================
// ЖИЛЬЁ И ОБУСТРОЙСТВО
// ========================================================
const HOUSING_LIST = [
    { id: 'trailer', name: 'Бытовка на стройплощадке', rent: 800, buyPrice: 450000, slots: 0, moodBonus: -5, minLevel: 1, desc: 'Временный вагончик. Сквозняки, запах мазута, но крыша над головой.', img: 'assets/houses/trailer.jpg' },
    { id: 'room', name: 'Комната в общежитии', rent: 2500, buyPrice: 1800000, slots: 1, moodBonus: 5, minLevel: 2, desc: 'Угол в спальном районе. Одно парковочное место под окном во дворе.', img: 'assets/houses/room.jpg' },
    { id: 'khrusch', name: 'Убитая "Хрущевка"', rent: 15000, buyPrice: 4500000, slots: 1, moodBonus: 10, minLevel: 6, desc: 'Бабушкин ремонт, старый паркет, зато своя кухня.', img: 'assets/houses/khrusch.jpg' },
    { id: 'garage', name: 'Кирпичный гараж с ямой', rent: 18000, buyPrice: 3000000, slots: 3, moodBonus: 12, minLevel: 10, desc: 'Капитальный бокс с верстаком, печкой и смотровой ямой.', img: 'assets/houses/garage.jpg' },
    { id: 'dvushka', name: 'Двушка в спальном районе', rent: 25000, buyPrice: 8500000, slots: 2, moodBonus: 15, minLevel: 15, desc: 'Хороший кирпичный дом, стеклопакеты и парковка во дворе.', img: 'assets/houses/dvushka.jpg' },
    { id: 'euro_treshka', name: 'Евро-трешка (Новостройка)', rent: 45000, buyPrice: 15000000, slots: 3, moodBonus: 25, minLevel: 22, desc: 'Свежий ремонт, закрытый двор без машин и консьерж.', img: 'assets/houses/treshka.jpg' },
    { id: 'cottage', name: 'Коттедж за городом', rent: 65000, buyPrice: 22000000, slots: 6, moodBonus: 30, minLevel: 30, desc: 'Собственный участок, просторный гараж и мангальная зона.', img: 'assets/houses/cottage.jpg' },
    { id: 'loft', name: 'Дизайнерский Лофт в центре', rent: 80000, buyPrice: 35000000, slots: 4, moodBonus: 35, minLevel: 45, desc: 'Красный кирпич, панорамные окна и вид на набережную.', img: 'assets/houses/loft.jpg' },
    { id: 'penthouse', name: 'Пентхаус в Москва-Сити', rent: 250000, buyPrice: 140000000, slots: 6, moodBonus: 50, minLevel: 65, desc: 'Панорамный вид с 65 этажа и доступ в подземный VIP-паркинг.', img: 'assets/houses/penthouse.jpg' },
    { id: 'villa', name: 'Особняк на Рублёвке', rent: 600000, buyPrice: 450000000, slots: 15, moodBonus: 80, minLevel: 85, desc: 'Гектар сосен, вертолетная площадка и гаражный комплекс.', img: 'assets/houses/villa.jpg' },
    { id: 'island', name: 'Частный остров с виллой', rent: 2000000, buyPrice: 1500000000, slots: 30, moodBonus: 100, minLevel: 100, desc: 'Абсолютная автономия, личный пирс для яхт и ангар для спорткаров.', img: 'assets/houses/island.jpg' }
];

const HOUSING_INTERIOR_CATALOG = [
    { id: "home_ps5", name: "🎮 Игровая консоль PlayStation 5", cost: 75000, perk: "+25% настроения и куража каждый день" },
    { id: "home_leather_sofa", name: "🛋️ Кожаный итальянский диван", cost: 120000, perk: "+15% к восстановлению сил и сытости" },
    { id: "home_cinema_audio", name: "🍿 Домашний кинотеатр 4K", cost: 250000, perk: "+35% настроения и статус перед гостями" },
    { id: "home_safe_valberg", name: "🔒 Огнеупорный сейф перекупа", cost: 180000, perk: "Защита заначки от проверок и облав" },
    { id: "home_sim_rig", name: "🏎️ Автосимулятор с рулем Direct Drive", cost: 450000, perk: "Ускоряет прокачку уровня на 10%" },
    { id: "home_billiards", name: "🎱 Бильярдный стол", cost: 320000, perk: "Приглашение друзей дает +1 🤝 раз в неделю" }
];

// ========================================================
// МАГАЗИН И БИЗНЕС
// ========================================================
const SHOP_CATALOG = {
    tools: [
        { id: "gauge", name: "Базовый толщиномер ЛКП", cost: 15000, desc: "Определяет толщину краски и шпатлевки на кузове. Обязателен для осмотра." },
        { id: "gauge_pro", name: "Лазерный толщиномер Pro", cost: 55000, desc: "Определяет скрытую ржавчину и алюминиевые детали." },
        { id: "obd", name: "Сканер OBD-II (ELM327)", cost: 25000, desc: "Считывает ошибки ЭБУ, показывает износ двигателя и КПП." },
        { id: "endoscope", name: "Эндоскоп для цилиндров", cost: 45000, desc: "Позволяет заглянуть в цилиндры и увидеть задиры (защита от капиталки)." },
        { id: "compressor", name: "Компрессометр", cost: 18000, desc: "Замеряет компрессию, выявляет мертвые моторы." }
    ],
    consumables: [
        { id: "oil", name: "Моторное масло (Бочка 200л)", cost: 35000, desc: "Сырье для бесперебойной работы СТО. Заполняет склад." },
        { id: "oil_premium", name: "Премиум масло Motul (Бочка)", cost: 75000, desc: "Для СТО высокого уровня. Увеличивает доходность на день." },
        { id: "polish", name: "Полировальная паста (Набор)", cost: 12000, desc: "Сырье для Детейлинга. Хватает надолго." },
        { id: "shampoo", name: "Автошампунь (Концентрат 50л)", cost: 8000, desc: "Сырье для Автомойки." },
        { id: "parts", name: "Контрактные запчасти (Паллета)", cost: 85000, desc: "Для активной работы Авторазборки." }
    ],
    tuningParts: [
        { id: "chip_pro", name: "Программатор ЭБУ (Чип-Тюнинг)", cost: 120000, desc: "Позволяет самостоятельно прошивать авто (Stage 1-3) прямо в гараже." },
        { id: "toolbox", name: "Профессиональный набор инструментов", cost: 65000, desc: "Снижает стоимость установки тюнинга на 25%." }
    ],
    homeItems: [
        { id: "home_ps5", name: "Игровая консоль PlayStation 5", cost: 75000, desc: "+25% настроения и куража каждый день" },
        { id: "home_leather_sofa", name: "Кожаный итальянский диван", cost: 120000, desc: "+15% к восстановлению сил и сытости" },
        { id: "home_cinema_audio", name: "Домашний кинотеатр 4K", cost: 250000, desc: "+35% настроения и статус перед гостями" },
        { id: "home_safe_valberg", name: "Огнеупорный сейф перекупа", cost: 180000, desc: "Защита заначки от проверок и облав" }
    ]
};

const BUSINESS_DATA = [
    { id: 'wash', name: 'Автомойка 24/7', minLevel: 5, income: 900, level: 0, cost: 90000, stored: 0, stock: 100, perk: 'Скидка 50% на полировку и химчистку' },
    { id: 'shina', name: 'Шиномонтаж «У Алика»', minLevel: 8, income: 1500, level: 0, cost: 150000, stored: 0, stock: 100, perk: '+10% к стоимости авто на правильных дисках' },
    { id: 'sto', name: 'СТО дяди Вани', minLevel: 12, income: 2200, level: 0, cost: 300000, stored: 0, stock: 100, perk: 'Скидка 40% на ремонт мотора' },
    { id: 'detailing', name: 'Детейлинг Студия', minLevel: 20, income: 6500, level: 0, cost: 950000, stored: 0, stock: 100, perk: '+35% к баллам на Автошоу' },
    { id: 'razborka', name: 'Авторазборка «Последний путь»', minLevel: 22, income: 8000, level: 0, cost: 1200000, stored: 0, stock: 100, perk: 'Детали на ремонт обходятся дешевле на 30%' },
    { id: 'taxi', name: 'Таксопарк (15 авто)', minLevel: 32, income: 18000, level: 0, cost: 3800000, stored: 0, stock: 100, perk: 'Пассивный доход и +1 🤝 связь каждый день' }
];

// ========================================================
// ИВЕНТЫ, ФРАЗЫ И ОШИБКИ
// ========================================================
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
    { author: "Kislota_Drift", text: "Пацаны, у кого есть съёмник пружин? Срочно надо дропнуть тачку.", warning: false },
    { author: "Artur_Reshala", text: "Есть выходы на МРЭО. Сниму запреты. Дорого.", warning: true },
    { author: "Ilya_DXF", text: "Парни, кто патчноут читал? Говорят на площадке обнова вышла.", warning: false }
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
    "«Двигатель работает как швейцарские часы.»",
    "«Срочно нужны деньги на бизнес, цена на два дня!»",
    "«Все заказ-наряды на руках, обслуживалась у дилера.»",
    "«Юридически чиста, штрафов и запретов нет.»"
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
    { text: "P0340: Ошибка датчика положения распредвала", cost: 6500, severity: "Низкая" },
    { text: "P1336: Сбой адаптации датчика положения коленвала", cost: 15000, severity: "Высокая" },
    { text: "P0500: Неисправность датчика скорости (ABS)", cost: 9000, severity: "Средняя" },
    { text: "C0040: Обрыв цепи датчика правого переднего колеса", cost: 4500, severity: "Низкая" }
];

// ========================================================
// ДОПОЛНИТЕЛЬНЫЕ МЕХАНИКИ (Питание, контейнеры, сараи)
// ========================================================
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

const CONTAINER_ITEMS = [
    { id: 'japan', name: 'Японский Контейнер', cost: 150000, timer: 30, minLevel: 12, badge: 'JDM & Мото', desc: 'Прямые поставки из порта Кобе.', img: 'assets/containers/japan.jpg' },
    { id: 'europe', name: 'Европейский Автовоз', cost: 450000, timer: 35, minLevel: 15, badge: 'Комфорт & Премиум', desc: 'Автомобили из Германии без пробега по РФ.', img: 'assets/containers/europe.jpg' },
    { id: 'usa_auction', name: 'Американский Аукцион', cost: 750000, timer: 40, minLevel: 18, badge: 'Битые & Маслкары', desc: 'Контейнер с Copart. Кот в мешке.', img: 'assets/containers/usa.jpg' },
    { id: 'china_ship', name: 'Китайский Сухогруз', cost: 950000, timer: 38, minLevel: 22, badge: 'Электрички & Новые', desc: 'Свежие Lixiang и Zeekr прямиком из Гуанчжоу.', img: 'assets/containers/china.jpg' },
    { id: 'dubai', name: 'Эмиратский Контейнер', cost: 1200000, timer: 45, minLevel: 25, badge: 'Катера & Суперкары', desc: 'Аукционная роскошь шейхов.', img: 'assets/containers/dubai.jpg' },
    { id: 'hangar', name: 'Заброшенный Ангар', cost: 5000000, timer: 60, minLevel: 30, badge: 'Тягачи & Гиперкары', desc: 'Списанное имущество логистического хаба!', img: 'assets/containers/hangar.jpg' }
];

const BARN_FINDS = [
    { name: "ВАЗ-2101 «Копейка» (Дрифт-Спек)", power: 160, type: 'economy', basePrice: 850000, marketValue: 1250000, img: "assets/cars/barn/vaz2101_drift.jpg" },
    { name: "BMW E30 Coupe", power: 170, type: 'comfort', basePrice: 650000, marketValue: 1300000, img: "assets/cars/barn/e30.jpg" },
    { name: "Nissan Silvia S13", power: 200, type: 'comfort', basePrice: 900000, marketValue: 1800000, img: "assets/cars/barn/silvia.jpg" },
    { name: "VW Golf VI GTI (Stage 2 Project)", power: 280, type: 'comfort', basePrice: 1100000, marketValue: 1900000, img: "assets/cars/barn/golf6.jpg" },
    { name: "ГАЗ-24 «Волга» V8", power: 220, type: 'economy', basePrice: 700000, marketValue: 1500000, img: "assets/cars/barn/volga24.jpg" },
    { name: "Nissan Skyline GT-R R34 (В пыли)", power: 280, type: 'premium', basePrice: 4500000, marketValue: 9500000, img: "assets/cars/barn/r34.jpg" },
    { name: "Toyota Supra A80 (Без мотора)", power: 0, type: 'premium', basePrice: 3200000, marketValue: 7000000, img: "assets/cars/barn/supra.jpg" },
    { name: "DeLorean DMC-12", power: 130, type: 'premium', basePrice: 5000000, marketValue: 12000000, img: "assets/cars/barn/delorean.jpg" }
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

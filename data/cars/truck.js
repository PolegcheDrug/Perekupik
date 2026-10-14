// ========================================================
// data/cars/truck.js — КАТЕГОРИЯ «ГРУЗОВИКИ» (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// 5 моделей коммерческого транспорта — от ЗИЛ-130 до Volvo FH16.
// Экспортируется в window.CARS_CATEGORY_TRUCK
// ========================================================

// Локальный алиас фолбек-картинки (подстраховка от порядка загрузки)
const TRUCK_FB = (window.CAR_FALLBACKS_BY_CATEGORY && window.CAR_FALLBACKS_BY_CATEGORY.truck)
    || "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80";

window.CARS_CATEGORY_TRUCK = [
    {
        name: "ЗИЛ-130 Самосвал",
        power: 150,
        basePrice: 260000,
        priceVariation: { minMultiplier: 0.70, maxMultiplier: 1.40 },
        drivetrain: "rwd",
        type: "truck",
        img: "assets/cars/truck/zil/zil.jpg",
        images: [
            "assets/cars/truck/zil/zil.jpg",
            "assets/cars/truck/zil/zil_1.jpg",
            "assets/cars/truck/zil/zil_2.jpg",
            "assets/cars/truck/zil/zil_3.jpg",
            "assets/cars/truck/zil/zil_4.jpg",
            "assets/cars/truck/zil/zil_5.jpg",
            "assets/cars/truck/zil/zil_6.jpg",
            "assets/cars/truck/zil/zil_7.jpg",
            "assets/cars/truck/zil/zil_8.jpg",
            "assets/cars/truck/zil/zil_9.jpg",
            "assets/cars/truck/zil/zil_10.jpg"
        ],
        fallback: TRUCK_FB
    },
    {
        name: "ГАЗель NEXT Рефрижератор",
        power: 149,
        basePrice: 1850000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "rwd",
        type: "truck",
        img: "assets/cars/truck/gazel/gazel.jpg",
        images: [
            "assets/cars/truck/gazel/gazel.jpg",
            "assets/cars/truck/gazel/gazel_1.jpg",
            "assets/cars/truck/gazel/gazel_2.jpg",
            "assets/cars/truck/gazel/gazel_3.jpg",
            "assets/cars/truck/gazel/gazel_4.jpg",
            "assets/cars/truck/gazel/gazel_5.jpg",
            "assets/cars/truck/gazel/gazel_6.jpg",
            "assets/cars/truck/gazel/gazel_7.jpg",
            "assets/cars/truck/gazel/gazel_8.jpg",
            "assets/cars/truck/gazel/gazel_9.jpg",
            "assets/cars/truck/gazel/gazel_10.jpg"
        ],
        fallback: TRUCK_FB
    },
    {
        name: "КАМАЗ-54901 Тягач",
        power: 460,
        basePrice: 7500000,
        priceVariation: { minMultiplier: 0.78, maxMultiplier: 1.30 },
        drivetrain: "rwd",
        type: "truck",
        img: "assets/cars/truck/kamaz/kamaz.jpg",
        images: [
            "assets/cars/truck/kamaz/kamaz.jpg",
            "assets/cars/truck/kamaz/kamaz_1.jpg",
            "assets/cars/truck/kamaz/kamaz_2.jpg",
            "assets/cars/truck/kamaz/kamaz_3.jpg",
            "assets/cars/truck/kamaz/kamaz_4.jpg",
            "assets/cars/truck/kamaz/kamaz_5.jpg",
            "assets/cars/truck/kamaz/kamaz_6.jpg",
            "assets/cars/truck/kamaz/kamaz_7.jpg",
            "assets/cars/truck/kamaz/kamaz_8.jpg",
            "assets/cars/truck/kamaz/kamaz_9.jpg",
            "assets/cars/truck/kamaz/kamaz_10.jpg"
        ],
        fallback: TRUCK_FB
    },
    {
        name: "Scania R500 V8",
        power: 500,
        basePrice: 10500000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.30 },
        drivetrain: "rwd",
        type: "truck",
        img: "assets/cars/truck/scania/scania.jpg",
        images: [
            "assets/cars/truck/scania/scania.jpg",
            "assets/cars/truck/scania/scania_1.jpg",
            "assets/cars/truck/scania/scania_2.jpg",
            "assets/cars/truck/scania/scania_3.jpg",
            "assets/cars/truck/scania/scania_4.jpg",
            "assets/cars/truck/scania/scania_5.jpg",
            "assets/cars/truck/scania/scania_6.jpg",
            "assets/cars/truck/scania/scania_7.jpg",
            "assets/cars/truck/scania/scania_8.jpg",
            "assets/cars/truck/scania/scania_9.jpg",
            "assets/cars/truck/scania/scania_10.jpg"
        ],
        fallback: TRUCK_FB
    },
    {
        name: "Volvo FH16 750",
        power: 750,
        basePrice: 15800000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.30 },
        drivetrain: "rwd",
        type: "truck",
        img: "assets/cars/truck/volvo/volvo.jpg",
        images: [
            "assets/cars/truck/volvo/volvo.jpg",
            "assets/cars/truck/volvo/volvo_1.jpg",
            "assets/cars/truck/volvo/volvo_2.jpg",
            "assets/cars/truck/volvo/volvo_3.jpg",
            "assets/cars/truck/volvo/volvo_4.jpg",
            "assets/cars/truck/volvo/volvo_5.jpg",
            "assets/cars/truck/volvo/volvo_6.jpg",
            "assets/cars/truck/volvo/volvo_7.jpg",
            "assets/cars/truck/volvo/volvo_8.jpg",
            "assets/cars/truck/volvo/volvo_9.jpg",
            "assets/cars/truck/volvo/volvo_10.jpg"
        ],
        fallback: TRUCK_FB
    }
];

console.log('[🚛 data/cars/truck] Загружено:', window.CARS_CATEGORY_TRUCK.length, 'моделей грузовиков ✓');
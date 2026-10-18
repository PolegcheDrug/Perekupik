// ========================================================
// data/cars/comfort.js — КАТЕГОРИЯ «КОМФОРТ» (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// 16 моделей седанов, хэтчбеков и кроссоверов среднего класса.
// Экспортируется в window.CARS_CATEGORY_COMFORT
// ========================================================

// Локальный алиас фолбек-картинки (подстраховка от порядка загрузки)
const COMFORT_FB = (window.CAR_FALLBACKS_BY_CATEGORY && window.CAR_FALLBACKS_BY_CATEGORY.comfort)
    || "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80";

window.CARS_CATEGORY_COMFORT = [
    {
        name: "Hyundai Solaris I",
        power: 123,
        basePrice: 620000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "fwd",
        type: "comfort",
        img: "assets/cars/comfort/solaris/solaris.jpg",
        images: [
            "assets/cars/comfort/solaris/solaris.jpg",
            "assets/cars/comfort/solaris/solaris_1.jpg",
            "assets/cars/comfort/solaris/solaris_2.jpg",
            "assets/cars/comfort/solaris/solaris_3.jpg",
            "assets/cars/comfort/solaris/solaris_4.jpg",
            "assets/cars/comfort/solaris/solaris_5.jpg",
            "assets/cars/comfort/solaris/solaris_6.jpg",
            "assets/cars/comfort/solaris/solaris_7.jpg",
            "assets/cars/comfort/solaris/solaris_8.jpg",
            "assets/cars/comfort/solaris/solaris_9.jpg",
            "assets/cars/comfort/solaris/solaris_10.jpg"
        ],
        fallback: COMFORT_FB
    },
    {
        name: "Kia Rio 3",
        power: 123,
        basePrice: 650000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "fwd",
        type: "comfort",
        img: "assets/cars/comfort/rio/rio.jpg",
        images: [
            "assets/cars/comfort/rio/rio.jpg",
            "assets/cars/comfort/rio/rio_1.jpg",
            "assets/cars/comfort/rio/rio_2.jpg",
            "assets/cars/comfort/rio/rio_3.jpg",
            "assets/cars/comfort/rio/rio_4.jpg",
            "assets/cars/comfort/rio/rio_5.jpg",
            "assets/cars/comfort/rio/rio_6.jpg",
            "assets/cars/comfort/rio/rio_7.jpg",
            "assets/cars/comfort/rio/rio_8.jpg",
            "assets/cars/comfort/rio/rio_9.jpg",
            "assets/cars/comfort/rio/rio_10.jpg"
        ],
        fallback: COMFORT_FB
    },
    {
        name: "VW Polo Sedan",
        power: 110,
        basePrice: 780000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "fwd",
        type: "comfort",
        img: "assets/cars/comfort/polo/polo.jpg",
        images: [
            "assets/cars/comfort/polo/polo.jpg",
            "assets/cars/comfort/polo/polo_1.jpg",
            "assets/cars/comfort/polo/polo_2.jpg",
            "assets/cars/comfort/polo/polo_3.jpg",
            "assets/cars/comfort/polo/polo_4.jpg",
            "assets/cars/comfort/polo/polo_5.jpg",
            "assets/cars/comfort/polo/polo_6.jpg",
            "assets/cars/comfort/polo/polo_7.jpg",
            "assets/cars/comfort/polo/polo_8.jpg",
            "assets/cars/comfort/polo/polo_9.jpg",
            "assets/cars/comfort/polo/polo_10.jpg"
        ],
        fallback: COMFORT_FB
    },
    {
        name: "Skoda Rapid",
        power: 110,
        basePrice: 840000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "fwd",
        type: "comfort",
        img: "assets/cars/comfort/rapid/rapid.jpg",
        images: [
            "assets/cars/comfort/rapid/rapid.jpg",
            "assets/cars/comfort/rapid/rapid_1.jpg",
            "assets/cars/comfort/rapid/rapid_2.jpg",
            "assets/cars/comfort/rapid/rapid_3.jpg",
            "assets/cars/comfort/rapid/rapid_4.jpg",
            "assets/cars/comfort/rapid/rapid_5.jpg",
            "assets/cars/comfort/rapid/rapid_6.jpg",
            "assets/cars/comfort/rapid/rapid_7.jpg",
            "assets/cars/comfort/rapid/rapid_8.jpg",
            "assets/cars/comfort/rapid/rapid_9.jpg",
            "assets/cars/comfort/rapid/rapid_10.jpg"
        ],
        fallback: COMFORT_FB
    },
    {
        name: "Ford Focus III",
        power: 125,
        basePrice: 890000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "fwd",
        type: "comfort",
        img: "assets/cars/comfort/focus/focus.jpg",
        images: [
            "assets/cars/comfort/focus/focus.jpg",
            "assets/cars/comfort/focus/focus_1.jpg",
            "assets/cars/comfort/focus/focus_2.jpg",
            "assets/cars/comfort/focus/focus_3.jpg",
            "assets/cars/comfort/focus/focus_4.jpg",
            "assets/cars/comfort/focus/focus_5.jpg",
            "assets/cars/comfort/focus/focus_6.jpg",
            "assets/cars/comfort/focus/focus_7.jpg",
            "assets/cars/comfort/focus/focus_8.jpg",
            "assets/cars/comfort/focus/focus_9.jpg",
            "assets/cars/comfort/focus/focus_10.jpg"
        ],
        fallback: COMFORT_FB
    },
    {
        name: "Chevrolet Cruze",
        power: 109,
        basePrice: 720000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "fwd",
        type: "comfort",
        img: "assets/cars/comfort/cruze/cruze.jpg",
        images: [
            "assets/cars/comfort/cruze/cruze.jpg",
            "assets/cars/comfort/cruze/cruze_1.jpg",
            "assets/cars/comfort/cruze/cruze_2.jpg",
            "assets/cars/comfort/cruze/cruze_3.jpg",
            "assets/cars/comfort/cruze/cruze_4.jpg",
            "assets/cars/comfort/cruze/cruze_5.jpg",
            "assets/cars/comfort/cruze/cruze_6.jpg",
            "assets/cars/comfort/cruze/cruze_7.jpg",
            "assets/cars/comfort/cruze/cruze_8.jpg",
            "assets/cars/comfort/cruze/cruze_9.jpg",
            "assets/cars/comfort/cruze/cruze_10.jpg"
        ],
        fallback: COMFORT_FB
    },
    {
        name: "Skoda Octavia A7 1.8 TSI",
        power: 180,
        basePrice: 1350000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.35 },
        drivetrain: "fwd",
        type: "comfort",
        img: "assets/cars/comfort/octavia/octavia.jpg",
        images: [
            "assets/cars/comfort/octavia/octavia.jpg",
            "assets/cars/comfort/octavia/octavia_1.jpg",
            "assets/cars/comfort/octavia/octavia_2.jpg",
            "assets/cars/comfort/octavia/octavia_3.jpg",
            "assets/cars/comfort/octavia/octavia_4.jpg",
            "assets/cars/comfort/octavia/octavia_5.jpg",
            "assets/cars/comfort/octavia/octavia_6.jpg",
            "assets/cars/comfort/octavia/octavia_7.jpg",
            "assets/cars/comfort/octavia/octavia_8.jpg",
            "assets/cars/comfort/octavia/octavia_9.jpg",
            "assets/cars/comfort/octavia/octavia_10.jpg"
        ],
        fallback: COMFORT_FB
    },
    {
        name: "VW Golf VI GTI",
        power: 211,
        basePrice: 1450000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.40 },
        drivetrain: "fwd",
        type: "comfort",
        img: "assets/cars/comfort/golf6/golf6.jpg",
        images: [
            "assets/cars/comfort/golf6/golf6.jpg",
            "assets/cars/comfort/golf6/golf6_1.jpg",
            "assets/cars/comfort/golf6/golf6_2.jpg",
            "assets/cars/comfort/golf6/golf6_3.jpg",
            "assets/cars/comfort/golf6/golf6_4.jpg",
            "assets/cars/comfort/golf6/golf6_5.jpg",
            "assets/cars/comfort/golf6/golf6_6.jpg",
            "assets/cars/comfort/golf6/golf6_7.jpg",
            "assets/cars/comfort/golf6/golf6_8.jpg",
            "assets/cars/comfort/golf6/golf6_9.jpg",
            "assets/cars/comfort/golf6/golf6_10.jpg"
        ],
        fallback: COMFORT_FB
    },
    {
        name: "Toyota Camry XV50",
        power: 181,
        basePrice: 1850000,
        priceVariation: { minMultiplier: 0.78, maxMultiplier: 1.30 },
        drivetrain: "fwd",
        type: "comfort",
        img: "assets/cars/comfort/camry/camry.jpg",
        images: [
            "assets/cars/comfort/camry/camry.jpg",
            "assets/cars/comfort/camry/camry_1.jpg",
            "assets/cars/comfort/camry/camry_2.jpg",
            "assets/cars/comfort/camry/camry_3.jpg",
            "assets/cars/comfort/camry/camry_4.jpg",
            "assets/cars/comfort/camry/camry_5.jpg",
            "assets/cars/comfort/camry/camry_6.jpg",
            "assets/cars/comfort/camry/camry_7.jpg",
            "assets/cars/comfort/camry/camry_8.jpg",
            "assets/cars/comfort/camry/camry_9.jpg",
            "assets/cars/comfort/camry/camry_10.jpg"
        ],
        fallback: COMFORT_FB
    },
    {
        name: "Kia Optima (JF)",
        power: 188,
        basePrice: 1780000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "fwd",
        type: "comfort",
        img: "assets/cars/comfort/optima/optima.jpg",
        images: [
            "assets/cars/comfort/optima/optima.jpg",
            "assets/cars/comfort/optima/optima_1.jpg",
            "assets/cars/comfort/optima/optima_2.jpg",
            "assets/cars/comfort/optima/optima_3.jpg",
            "assets/cars/comfort/optima/optima_4.jpg",
            "assets/cars/comfort/optima/optima_5.jpg",
            "assets/cars/comfort/optima/optima_6.jpg",
            "assets/cars/comfort/optima/optima_7.jpg",
            "assets/cars/comfort/optima/optima_8.jpg",
            "assets/cars/comfort/optima/optima_9.jpg",
            "assets/cars/comfort/optima/optima_10.jpg"
        ],
        fallback: COMFORT_FB
    },
    {
        name: "Kia K5",
        power: 194,
        basePrice: 2350000,
        priceVariation: { minMultiplier: 0.78, maxMultiplier: 1.30 },
        drivetrain: "fwd",
        type: "comfort",
        img: "assets/cars/comfort/k5/k5.jpg",
        images: [
            "assets/cars/comfort/k5/k5.jpg",
            "assets/cars/comfort/k5/k5_1.jpg",
            "assets/cars/comfort/k5/k5_2.jpg",
            "assets/cars/comfort/k5/k5_3.jpg",
            "assets/cars/comfort/k5/k5_4.jpg",
            "assets/cars/comfort/k5/k5_5.jpg",
            "assets/cars/comfort/k5/k5_6.jpg",
            "assets/cars/comfort/k5/k5_7.jpg",
            "assets/cars/comfort/k5/k5_8.jpg",
            "assets/cars/prop/k5/k5_9.jpg",
            "assets/cars/comfort/k5/k5_10.jpg"
        ],
        fallback: COMFORT_FB
    },
    {
        name: "Mazda 6 (GJ)",
        power: 192,
        basePrice: 2050000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "fwd",
        type: "comfort",
        img: "assets/cars/comfort/mazda6/mazda6.jpg",
        images: [
            "assets/cars/comfort/mazda6/mazda6.jpg",
            "assets/cars/comfort/mazda6/mazda6_1.jpg",
            "assets/cars/comfort/mazda6/mazda6_2.jpg",
            "assets/cars/comfort/mazda6/mazda6_3.jpg",
            "assets/cars/comfort/mazda6/mazda6_4.jpg",
            "assets/cars/comfort/mazda6/mazda6_5.jpg",
            "assets/cars/comfort/mazda6/mazda6_6.jpg",
            "assets/cars/comfort/mazda6/mazda6_7.jpg",
            "assets/cars/comfort/mazda6/mazda6_8.jpg",
            "assets/cars/comfort/mazda6/mazda6_9.jpg",
            "assets/cars/comfort/mazda6/mazda6_10.jpg"
        ],
        fallback: COMFORT_FB
    },
    {
        name: "Toyota RAV4 (XA40)",
        power: 150,
        basePrice: 2200000,
        priceVariation: { minMultiplier: 0.78, maxMultiplier: 1.30 },
        drivetrain: "awd",
        type: "comfort",
        img: "assets/cars/comfort/rav4/rav4.jpg",
        images: [
            "assets/cars/comfort/rav4/rav4.jpg",
            "assets/cars/comfort/rav4/rav4_1.jpg",
            "assets/cars/comfort/rav4/rav4_2.jpg",
            "assets/cars/comfort/rav4/rav4_3.jpg",
            "assets/cars/comfort/rav4/rav4_4.jpg",
            "assets/cars/comfort/rav4/rav4_5.jpg",
            "assets/cars/comfort/rav4/rav4_6.jpg",
            "assets/cars/comfort/rav4/rav4_7.jpg",
            "assets/cars/comfort/rav4/rav4_8.jpg",
            "assets/cars/comfort/rav4/rav4_9.jpg",
            "assets/cars/comfort/rav4/rav4_10.jpg"
        ],
        fallback: COMFORT_FB
    },
    {
        name: "Mazda CX-5",
        power: 194,
        basePrice: 2250000,
        priceVariation: { minMultiplier: 0.78, maxMultiplier: 1.30 },
        drivetrain: "awd",
        type: "comfort",
        img: "assets/cars/comfort/cx5/cx5.jpg",
        images: [
            "assets/cars/comfort/cx5/cx5.jpg",
            "assets/cars/comfort/cx5/cx5_1.jpg",
            "assets/cars/comfort/cx5/cx5_2.jpg",
            "assets/cars/comfort/cx5/cx5_3.jpg",
            "assets/cars/comfort/cx5/cx5_4.jpg",
            "assets/cars/comfort/cx5/cx5_5.jpg",
            "assets/cars/comfort/cx5/cx5_6.jpg",
            "assets/cars/comfort/cx5/cx5_7.jpg",
            "assets/cars/comfort/cx5/cx5_8.jpg",
            "assets/cars/comfort/cx5/cx5_9.jpg",
            "assets/cars/comfort/cx5/cx5_10.jpg"
        ],
        fallback: COMFORT_FB
    },
    {
        name: "Geely Monjaro",
        power: 238,
        basePrice: 3100000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.25 },
        drivetrain: "awd",
        type: "comfort",
        img: "assets/cars/comfort/monjaro/monjaro.jpg",
        images: [
            "assets/cars/comfort/monjaro/monjaro.jpg",
            "assets/cars/comfort/monjaro/monjaro_1.jpg",
            "assets/cars/comfort/monjaro/monjaro_2.jpg",
            "assets/cars/comfort/monjaro/monjaro_3.jpg",
            "assets/cars/comfort/monjaro/monjaro_4.jpg",
            "assets/cars/comfort/monjaro/monjaro_5.jpg",
            "assets/cars/comfort/monjaro/monjaro_6.jpg",
            "assets/cars/comfort/monjaro/monjaro_7.jpg",
            "assets/cars/comfort/monjaro/monjaro_8.jpg",
            "assets/cars/comfort/monjaro/monjaro_9.jpg",
            "assets/cars/comfort/monjaro/monjaro_10.jpg"
        ],
        fallback: COMFORT_FB
    }
];

console.log('[🚗 data/cars/comfort] Загружено:', window.CARS_CATEGORY_COMFORT.length, 'моделей комфорта ✓');
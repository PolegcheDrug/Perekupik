// ========================================================
// data/cars/scooter.js — КАТЕГОРИЯ «СКУТЕРЫ» (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// 5 моделей городских скутеров с мульти-фото и вилкой цен.
// Экспортируется в window.CARS_CATEGORY_SCOOTER
// ========================================================

// Локальный алиас фолбек-картинки (подстраховка от порядка загрузки)
const SCOOTER_FB = (window.CAR_FALLBACKS_BY_CATEGORY && window.CAR_FALLBACKS_BY_CATEGORY.scooter)
    || "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80";

window.CARS_CATEGORY_SCOOTER = [
    {
        name: "Honda Dio AF34",
        power: 7,
        basePrice: 42000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "rwd",
        type: "scooter",
        img: "assets/moto/dio/dio.jpg",
        images: [
            "assets/moto/dio/dio.jpg",
            "assets/moto/dio/dio_1.jpg",
            "assets/moto/dio/dio_2.jpg",
            "assets/moto/dio/dio_3.jpg",
            "assets/moto/dio/dio_4.jpg",
            "assets/moto/dio/dio_5.jpg",
            "assets/moto/dio/dio_6.jpg",
            "assets/moto/dio/dio_7.jpg",
            "assets/moto/dio/dio_8.jpg",
            "assets/moto/dio/dio_9.jpg",
            "assets/moto/dio/dio_10.jpg"
        ],
        fallback: SCOOTER_FB
    },
    {
        name: "Yamaha Jog ZR",
        power: 8,
        basePrice: 52000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "rwd",
        type: "scooter",
        img: "assets/moto/jog/jog.jpg",
        images: [
            "assets/moto/jog/jog.jpg",
            "assets/moto/jog/jog_1.jpg",
            "assets/moto/jog/jog_2.jpg",
            "assets/moto/jog/jog_3.jpg",
            "assets/moto/jog/jog_4.jpg",
            "assets/moto/jog/jog_5.jpg",
            "assets/moto/jog/jog_6.jpg",
            "assets/moto/jog/jog_7.jpg",
            "assets/moto/jog/jog_8.jpg",
            "assets/moto/jog/jog_9.jpg",
            "assets/moto/jog/jog_10.jpg"
        ],
        fallback: SCOOTER_FB
    },
    {
        name: "Suzuki Lets 2",
        power: 6,
        basePrice: 35000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "rwd",
        type: "scooter",
        img: "assets/moto/lets/lets.jpg",
        images: [
            "assets/moto/lets/lets.jpg",
            "assets/moto/lets/lets_1.jpg",
            "assets/moto/lets/lets_2.jpg",
            "assets/moto/lets/lets_3.jpg",
            "assets/moto/lets/lets_4.jpg",
            "assets/moto/lets/lets_5.jpg",
            "assets/moto/lets/lets_6.jpg",
            "assets/moto/lets/lets_7.jpg",
            "assets/moto/lets/lets_8.jpg",
            "assets/moto/lets/lets_9.jpg",
            "assets/moto/lets/lets_10.jpg"
        ],
        fallback: SCOOTER_FB
    },
    {
        name: "Honda Tact AF24",
        power: 6,
        basePrice: 39000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "rwd",
        type: "scooter",
        img: "assets/moto/tact/tact.jpg",
        images: [
            "assets/moto/tact/tact.jpg",
            "assets/moto/tact/tact_1.jpg",
            "assets/moto/tact/tact_2.jpg",
            "assets/moto/tact/tact_3.jpg",
            "assets/moto/tact/tact_4.jpg",
            "assets/moto/tact/tact_5.jpg",
            "assets/moto/tact/tact_6.jpg",
            "assets/moto/tact/tact_7.jpg",
            "assets/moto/tact/tact_8.jpg",
            "assets/moto/tact/tact_9.jpg",
            "assets/moto/tact/tact_10.jpg"
        ],
        fallback: SCOOTER_FB
    },
    {
        name: "Vespa Primavera 150",
        power: 13,
        basePrice: 195000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.30 },
        drivetrain: "rwd",
        type: "scooter",
        img: "assets/moto/vespa/vespa.jpg",
        images: [
            "assets/moto/vespa/vespa.jpg",
            "assets/moto/vespa/vespa_1.jpg",
            "assets/moto/vespa/vespa_2.jpg",
            "assets/moto/vespa/vespa_3.jpg",
            "assets/moto/vespa/vespa_4.jpg",
            "assets/moto/vespa/vespa_5.jpg",
            "assets/moto/vespa/vespa_6.jpg",
            "assets/moto/vespa/vespa_7.jpg",
            "assets/moto/vespa/vespa_8.jpg",
            "assets/moto/vespa/vespa_9.jpg",
            "assets/moto/vespa/vespa_10.jpg"
        ],
        fallback: SCOOTER_FB
    }
];

console.log('[🛵 data/cars/scooter] Загружено:', window.CARS_CATEGORY_SCOOTER.length, 'моделей скутеров ✓');
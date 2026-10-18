// ========================================================
// data/cars/hyper.js — КАТЕГОРИЯ «ГИПЕРКАРЫ» (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// 6 моделей суперкаров и гиперкаров экстра-класса.
// Экспортируется в window.CARS_CATEGORY_HYPER
// ========================================================

// Локальный алиас фолбек-картинки (подстраховка от порядка загрузки)
const HYPER_FB = (window.CAR_FALLBACKS_BY_CATEGORY && window.CAR_FALLBACKS_BY_CATEGORY.hyper)
    || "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80";

window.CARS_CATEGORY_HYPER = [
    {
        name: "Nissan GT-R R35 Nismo",
        power: 600,
        basePrice: 13500000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "hyper",
        img: "assets/cars/hyper/gtr/gtr.jpg",
        images: [
            "assets/cars/hyper/gtr/gtr.jpg",
            "assets/cars/hyper/gtr/gtr_1.jpg",
            "assets/cars/hyper/gtr/gtr_2.jpg",
            "assets/cars/hyper/gtr/gtr_3.jpg",
            "assets/cars/hyper/gtr/gtr_4.jpg",
            "assets/cars/hyper/gtr/gtr_5.jpg",
            "assets/cars/hyper/gtr/gtr_6.jpg",
            "assets/cars/hyper/gtr/gtr_7.jpg",
            "assets/cars/hyper/gtr/gtr_8.jpg",
            "assets/cars/hyper/gtr/gtr_9.jpg",
            "assets/cars/hyper/gtr/gtr_10.jpg"
        ],
        fallback: HYPER_FB
    },
    {
        name: "Porsche 911 GT3 RS (992)",
        power: 525,
        basePrice: 31000000,
        priceVariation: { minMultiplier: 0.85, maxMultiplier: 1.35 },
        drivetrain: "rwd",
        type: "hyper",
        img: "assets/cars/hyper/911/911.jpg",
        images: [
            "assets/cars/hyper/911/911.jpg",
            "assets/cars/hyper/911/911_1.jpg",
            "assets/cars/hyper/911/911_2.jpg",
            "assets/cars/hyper/911/911_3.jpg",
            "assets/cars/hyper/911/911_4.jpg",
            "assets/cars/hyper/911/911_5.jpg",
            "assets/cars/hyper/911/911_6.jpg",
            "assets/cars/hyper/911/911_7.jpg",
            "assets/cars/hyper/911/911_8.jpg",
            "assets/cars/hyper/911/911_9.jpg",
            "assets/cars/hyper/911/911_10.jpg"
        ],
        fallback: HYPER_FB
    },
    {
        name: "Lamborghini Huracan EVO",
        power: 640,
        basePrice: 36000000,
        priceVariation: { minMultiplier: 0.85, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "hyper",
        img: "assets/cars/hyper/huracan/huracan.jpg",
        images: [
            "assets/cars/hyper/huracan/huracan.jpg",
            "assets/cars/hyper/huracan/huracan_1.jpg",
            "assets/cars/hyper/huracan/huracan_2.jpg",
            "assets/cars/hyper/huracan/huracan_3.jpg",
            "assets/cars/hyper/huracan/huracan_4.jpg",
            "assets/cars/hyper/huracan/huracan_5.jpg",
            "assets/cars/hyper/huracan/huracan_6.jpg",
            "assets/cars/hyper/huracan/huracan_7.jpg",
            "assets/cars/hyper/huracan/huracan_8.jpg",
            "assets/cars/hyper/huracan/huracan_9.jpg",
            "assets/cars/hyper/huracan/huracan_10.jpg"
        ],
        fallback: HYPER_FB
    },
    {
        name: "Ferrari SF90 Stradale",
        power: 1000,
        basePrice: 75000000,
        priceVariation: { minMultiplier: 0.85, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "hyper",
        img: "assets/cars/hyper/sf90/sf90.jpg",
        images: [
            "assets/cars/hyper/sf90/sf90.jpg",
            "assets/cars/hyper/sf90/sf90_1.jpg",
            "assets/cars/hyper/sf90/sf90_2.jpg",
            "assets/cars/hyper/sf90/sf90_3.jpg",
            "assets/cars/hyper/sf90/sf90_4.jpg",
            "assets/cars/hyper/sf90/sf90_5.jpg",
            "assets/cars/hyper/sf90/sf90_6.jpg",
            "assets/cars/hyper/sf90/sf90_7.jpg",
            "assets/cars/hyper/sf90/sf90_8.jpg",
            "assets/cars/hyper/sf90/sf90_9.jpg",
            "assets/cars/hyper/sf90/sf90_10.jpg"
        ],
        fallback: HYPER_FB
    },
    {
        name: "McLaren 720S",
        power: 720,
        basePrice: 32000000,
        priceVariation: { minMultiplier: 0.85, maxMultiplier: 1.35 },
        drivetrain: "rwd",
        type: "hyper",
        img: "assets/cars/hyper/mclaren/mclaren.jpg",
        images: [
            "assets/cars/hyper/mclaren/mclaren.jpg",
            "assets/cars/hyper/mclaren/mclaren_1.jpg",
            "assets/cars/hyper/mclaren/mclaren_2.jpg",
            "assets/cars/hyper/mclaren/mclaren_3.jpg",
            "assets/cars/hyper/mclaren/mclaren_4.jpg",
            "assets/cars/hyper/mclaren/mclaren_5.jpg",
            "assets/cars/hyper/mclaren/mclaren_6.jpg",
            "assets/cars/hyper/mclaren/mclaren_7.jpg",
            "assets/cars/hyper/mclaren/mclaren_8.jpg",
            "assets/cars/hyper/mclaren/mclaren_9.jpg",
            "assets/cars/hyper/mclaren/mclaren_10.jpg"
        ],
        fallback: HYPER_FB
    },
    {
        name: "Bugatti Chiron Sport",
        power: 1500,
        basePrice: 360000000,
        priceVariation: { minMultiplier: 0.90, maxMultiplier: 1.30 },
        drivetrain: "awd",
        type: "hyper",
        img: "assets/cars/hyper/chiron/chiron.jpg",
        images: [
            "assets/cars/hyper/chiron/chiron.jpg",
            "assets/cars/hyper/chiron/chiron_1.jpg",
            "assets/cars/hyper/chiron/chiron_2.jpg",
            "assets/cars/hyper/chiron/chiron_3.jpg",
            "assets/cars/hyper/chiron/chiron_4.jpg",
            "assets/cars/hyper/chiron/chiron_5.jpg",
            "assets/cars/hyper/chiron/chiron_6.jpg",
            "assets/cars/hyper/chiron/chiron_7.jpg",
            "assets/cars/hyper/chiron/chiron_8.jpg",
            "assets/cars/hyper/chiron/chiron_9.jpg",
            "assets/cars/hyper/chiron/chiron_10.jpg"
        ],
        fallback: HYPER_FB
    }
];

console.log('[⚡ data/cars/hyper] Загружено:', window.CARS_CATEGORY_HYPER.length, 'моделей гиперкаров ✓');
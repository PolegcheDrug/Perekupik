// ========================================================
// data/cars/yacht.js — КАТЕГОРИЯ «ЯХТЫ» (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// 3 модели морской техники — гидроцикл, катер, моторная яхта.
// Экспортируется в window.CARS_CATEGORY_YACHT
// ========================================================

// Локальный алиас фолбек-картинки (подстраховка от порядка загрузки)
const YACHT_FB = (window.CAR_FALLBACKS_BY_CATEGORY && window.CAR_FALLBACKS_BY_CATEGORY.yacht)
    || "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=600&q=80";

window.CARS_CATEGORY_YACHT = [
    {
        name: "Гидроцикл Yamaha FX SVHO",
        power: 250,
        basePrice: 1850000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.30 },
        drivetrain: "jet",
        type: "yacht",
        img: "assets/cars/yacht/yamaha/yamaha.jpg",
        images: [
            "assets/cars/yacht/yamaha/yamaha.jpg",
            "assets/cars/yacht/yamaha/yamaha_1.jpg",
            "assets/cars/yacht/yamaha/yamaha_2.jpg",
            "assets/cars/yacht/yamaha/yamaha_3.jpg",
            "assets/cars/yacht/yamaha/yamaha_4.jpg",
            "assets/cars/yacht/yamaha/yamaha_5.jpg",
            "assets/cars/yacht/yamaha/yamaha_6.jpg",
            "assets/cars/yacht/yamaha/yamaha_7.jpg",
            "assets/cars/yacht/yamaha/yamaha_8.jpg",
            "assets/cars/yacht/yamaha/yamaha_9.jpg",
            "assets/cars/yacht/yamaha/yamaha_10.jpg"
        ],
        fallback: YACHT_FB
    },
    {
        name: "Катер Bayliner VR5",
        power: 200,
        basePrice: 4500000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.30 },
        drivetrain: "prop",
        type: "yacht",
        img: "assets/cars/yacht/bayliner/bayliner.jpg",
        images: [
            "assets/cars/yacht/bayliner/bayliner.jpg",
            "assets/cars/yacht/bayliner/bayliner_1.jpg",
            "assets/cars/yacht/bayliner/bayliner_2.jpg",
            "assets/cars/yacht/bayliner/bayliner_3.jpg",
            "assets/cars/yacht/bayliner/bayliner_4.jpg",
            "assets/cars/yacht/bayliner/bayliner_5.jpg",
            "assets/cars/yacht/bayliner/bayliner_6.jpg",
            "assets/cars/yacht/bayliner/bayliner_7.jpg",
            "assets/cars/yacht/bayliner/bayliner_8.jpg",
            "assets/cars/yacht/bayliner/bayliner_9.jpg",
            "assets/cars/yacht/bayliner/bayliner_10.jpg"
        ],
        fallback: YACHT_FB
    },
    {
        name: "Azimut Atlantis 45",
        power: 880,
        basePrice: 75000000,
        priceVariation: { minMultiplier: 0.85, maxMultiplier: 1.30 },
        drivetrain: "prop",
        type: "yacht",
        img: "assets/cars/yacht/azimut/azimut.jpg",
        images: [
            "assets/cars/yacht/azimut/azimut.jpg",
            "assets/cars/yacht/azimut/azimut_1.jpg",
            "assets/cars/yacht/azimut/azimut_2.jpg",
            "assets/cars/yacht/azimut/azimut_3.jpg",
            "assets/cars/yacht/azimut/azimut_4.jpg",
            "assets/cars/yacht/azimut/azimut_5.jpg",
            "assets/cars/yacht/azimut/azimut_6.jpg",
            "assets/cars/yacht/azimut/azimut_7.jpg",
            "assets/cars/yacht/azimut/azimut_8.jpg",
            "assets/cars/yacht/azimut/azimut_9.jpg",
            "assets/cars/yacht/azimut/azimut_10.jpg"
        ],
        fallback: YACHT_FB
    }
];

console.log('[🛥️ data/cars/yacht] Загружено:', window.CARS_CATEGORY_YACHT.length, 'моделей морской техники ✓');
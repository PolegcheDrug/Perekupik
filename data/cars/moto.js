// ========================================================
// data/cars/moto.js — КАТЕГОРИЯ «МОТО» (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// 11 моделей мотоциклов — от советской классики до спортбайков.
// Экспортируется в window.CARS_CATEGORY_MOTO
// ========================================================

// Локальный алиас фолбек-картинки (подстраховка от порядка загрузки)
const MOTO_FB = (window.CAR_FALLBACKS_BY_CATEGORY && window.CAR_FALLBACKS_BY_CATEGORY.moto)
    || "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80";

window.CARS_CATEGORY_MOTO = [
    {
        name: "Иж Юпитер-5 с люлькой",
        power: 24,
        basePrice: 78000,
        priceVariation: { minMultiplier: 0.70, maxMultiplier: 1.40 },
        drivetrain: "rwd",
        type: "moto",
        img: "assets/moto/jupiter/jupiter.jpg",
        images: [
            "assets/moto/jupiter/jupiter.jpg",
            "assets/moto/jupiter/jupiter_1.jpg",
            "assets/moto/jupiter/jupiter_2.jpg",
            "assets/moto/jupiter/jupiter_3.jpg",
            "assets/moto/jupiter/jupiter_4.jpg",
            "assets/moto/jupiter/jupiter_5.jpg",
            "assets/moto/jupiter/jupiter_6.jpg",
            "assets/moto/jupiter/jupiter_7.jpg",
            "assets/moto/jupiter/jupiter_8.jpg",
            "assets/moto/jupiter/jupiter_9.jpg",
            "assets/moto/jupiter/jupiter_10.jpg"
        ],
        fallback: MOTO_FB
    },
    {
        name: "Ява-350 (638)",
        power: 26,
        basePrice: 110000,
        priceVariation: { minMultiplier: 0.70, maxMultiplier: 1.40 },
        drivetrain: "rwd",
        type: "moto",
        img: "assets/moto/jawa/jawa.jpg",
        images: [
            "assets/moto/jawa/jawa.jpg",
            "assets/moto/jawa/jawa_1.jpg",
            "assets/moto/jawa/jawa_2.jpg",
            "assets/moto/jawa/jawa_3.jpg",
            "assets/moto/jawa/jawa_4.jpg",
            "assets/moto/jawa/jawa_5.jpg",
            "assets/moto/jawa/jawa_6.jpg",
            "assets/moto/jawa/jawa_7.jpg",
            "assets/moto/jawa/jawa_8.jpg",
            "assets/moto/jawa/jawa_9.jpg",
            "assets/moto/jawa/jawa_10.jpg"
        ],
        fallback: MOTO_FB
    },
    {
        name: "Bajaj Pulsar NS200",
        power: 25,
        basePrice: 220000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "rwd",
        type: "moto",
        img: "assets/moto/pulsar/pulsar.jpg",
        images: [
            "assets/moto/pulsar/pulsar.jpg",
            "assets/moto/pulsar/pulsar_1.jpg",
            "assets/moto/pulsar/pulsar_2.jpg",
            "assets/moto/pulsar/pulsar_3.jpg",
            "assets/moto/pulsar/pulsar_4.jpg",
            "assets/moto/pulsar/pulsar_5.jpg",
            "assets/moto/pulsar/pulsar_6.jpg",
            "assets/moto/pulsar/pulsar_7.jpg",
            "assets/moto/pulsar/pulsar_8.jpg",
            "assets/moto/pulsar/pulsar_9.jpg",
            "assets/moto/pulsar/pulsar_10.jpg"
        ],
        fallback: MOTO_FB
    },
    {
        name: "Kawasaki Ninja 300",
        power: 39,
        basePrice: 420000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.35 },
        drivetrain: "rwd",
        type: "moto",
        img: "assets/moto/ninja/ninja.jpg",
        images: [
            "assets/moto/ninja/ninja.jpg",
            "assets/moto/ninja/ninja_1.jpg",
            "assets/moto/ninja/ninja_2.jpg",
            "assets/moto/ninja/ninja_3.jpg",
            "assets/moto/ninja/ninja_4.jpg",
            "assets/moto/ninja/ninja_5.jpg",
            "assets/moto/ninja/ninja_6.jpg",
            "assets/moto/ninja/ninja_7.jpg",
            "assets/moto/ninja/ninja_8.jpg",
            "assets/moto/ninja/ninja_9.jpg",
            "assets/moto/ninja/ninja_10.jpg"
        ],
        fallback: MOTO_FB
    },
    {
        name: "Honda CB400 Super Four",
        power: 53,
        basePrice: 340000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.35 },
        drivetrain: "rwd",
        type: "moto",
        img: "assets/moto/cb400/cb400.jpg",
        images: [
            "assets/moto/cb400/cb400.jpg",
            "assets/moto/cb400/cb400_1.jpg",
            "assets/moto/cb400/cb400_2.jpg",
            "assets/moto/cb400/cb400_3.jpg",
            "assets/moto/cb400/cb400_4.jpg",
            "assets/moto/cb400/cb400_5.jpg",
            "assets/moto/cb400/cb400_6.jpg",
            "assets/moto/cb400/cb400_7.jpg",
            "assets/moto/cb400/cb400_8.jpg",
            "assets/moto/cb400/cb400_9.jpg",
            "assets/moto/cb400/cb400_10.jpg"
        ],
        fallback: MOTO_FB
    },
    {
        name: "Yamaha MT-07",
        power: 74,
        basePrice: 840000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "rwd",
        type: "moto",
        img: "assets/moto/mt07/mt07.jpg",
        images: [
            "assets/moto/mt07/mt07.jpg",
            "assets/moto/mt07/mt07_1.jpg",
            "assets/moto/mt07/mt07_2.jpg",
            "assets/moto/mt07/mt07_3.jpg",
            "assets/moto/mt07/mt07_4.jpg",
            "assets/moto/mt07/mt07_5.jpg",
            "assets/moto/mt07/mt07_6.jpg",
            "assets/moto/mt07/mt07_7.jpg",
            "assets/moto/mt07/mt07_8.jpg",
            "assets/moto/mt07/mt07_9.jpg",
            "assets/moto/mt07/mt07_10.jpg"
        ],
        fallback: MOTO_FB
    },
    {
        name: "KTM 390 Duke",
        power: 44,
        basePrice: 520000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "rwd",
        type: "moto",
        img: "assets/moto/duke/duke.jpg",
        images: [
            "assets/moto/duke/duke.jpg",
            "assets/moto/duke/duke_1.jpg",
            "assets/moto/duke/duke_2.jpg",
            "assets/moto/duke/duke_3.jpg",
            "assets/moto/duke/duke_4.jpg",
            "assets/moto/duke/duke_5.jpg",
            "assets/moto/duke/duke_6.jpg",
            "assets/moto/duke/duke_7.jpg",
            "assets/moto/duke/duke_8.jpg",
            "assets/moto/duke/duke_9.jpg",
            "assets/moto/duke/duke_10.jpg"
        ],
        fallback: MOTO_FB
    },
    {
        name: "Harley-Davidson Iron 883",
        power: 51,
        basePrice: 1180000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.35 },
        drivetrain: "rwd",
        type: "moto",
        img: "assets/moto/iron883/iron883.jpg",
        images: [
            "assets/moto/iron883/iron883.jpg",
            "assets/moto/iron883/iron883_1.jpg",
            "assets/moto/iron883/iron883_2.jpg",
            "assets/moto/iron883/iron883_3.jpg",
            "assets/moto/iron883/iron883_4.jpg",
            "assets/moto/iron883/iron883_5.jpg",
            "assets/moto/iron883/iron883_6.jpg",
            "assets/moto/iron883/iron883_7.jpg",
            "assets/moto/iron883/iron883_8.jpg",
            "assets/moto/iron883/iron883_9.jpg",
            "assets/moto/iron883/iron883_10.jpg"
        ],
        fallback: MOTO_FB
    },
    {
        name: "BMW R1250GS Adventure",
        power: 136,
        basePrice: 2450000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.30 },
        drivetrain: "rwd",
        type: "moto",
        img: "assets/moto/gs1250/gs1250.jpg",
        images: [
            "assets/moto/gs1250/gs1250.jpg",
            "assets/moto/gs1250/gs1250_1.jpg",
            "assets/moto/gs1250/gs1250_2.jpg",
            "assets/moto/gs1250/gs1250_3.jpg",
            "assets/moto/gs1250/gs1250_4.jpg",
            "assets/moto/gs1250/gs1250_5.jpg",
            "assets/moto/gs1250/gs1250_6.jpg",
            "assets/moto/gs1250/gs1250_7.jpg",
            "assets/moto/gs1250/gs1250_8.jpg",
            "assets/moto/gs1250/gs1250_9.jpg",
            "assets/moto/gs1250/gs1250_10.jpg"
        ],
        fallback: MOTO_FB
    },
    {
        name: "Yamaha YZF-R1",
        power: 200,
        basePrice: 2100000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.35 },
        drivetrain: "rwd",
        type: "moto",
        img: "assets/moto/r1/r1.jpg",
        images: [
            "assets/moto/r1/r1.jpg",
            "assets/moto/r1/r1_1.jpg",
            "assets/moto/r1/r1_2.jpg",
            "assets/moto/r1/r1_3.jpg",
            "assets/moto/r1/r1_4.jpg",
            "assets/moto/r1/r1_5.jpg",
            "assets/moto/r1/r1_6.jpg",
            "assets/moto/r1/r1_7.jpg",
            "assets/moto/r1/r1_8.jpg",
            "assets/moto/r1/r1_9.jpg",
            "assets/moto/r1/r1_10.jpg"
        ],
        fallback: MOTO_FB
    },
    {
        name: "Ducati Panigale V4",
        power: 214,
        basePrice: 3200000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "rwd",
        type: "moto",
        img: "assets/moto/ducati/ducati.jpg",
        images: [
            "assets/moto/ducati/ducati.jpg",
            "assets/moto/ducati/ducati_1.jpg",
            "assets/moto/ducati/ducati_2.jpg",
            "assets/moto/ducati/ducati_3.jpg",
            "assets/moto/ducati/ducati_4.jpg",
            "assets/moto/ducati/ducati_5.jpg",
            "assets/moto/ducati/ducati_6.jpg",
            "assets/moto/ducati/ducati_7.jpg",
            "assets/moto/ducati/ducati_8.jpg",
            "assets/moto/ducati/ducati_9.jpg",
            "assets/moto/ducati/ducati_10.jpg"
        ],
        fallback: MOTO_FB
    }
];

console.log('[🏍️ data/cars/moto] Загружено:', window.CARS_CATEGORY_MOTO.length, 'моделей мотоциклов ✓');
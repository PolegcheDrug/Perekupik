// ========================================================
// data/cars/atv.js — КАТЕГОРИЯ «КВАДРОЦИКЛЫ» (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// 4 модели квадроциклов 4x4 — от бюджетного CFMOTO до Can-Am.
// Экспортируется в window.CARS_CATEGORY_ATV
// ========================================================

// Локальный алиас фолбек-картинки (подстраховка от порядка загрузки)
const ATV_FB = (window.CAR_FALLBACKS_BY_CATEGORY && window.CAR_FALLBACKS_BY_CATEGORY.atv)
    || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80";

window.CARS_CATEGORY_ATV = [
    {
        name: "CFMOTO CFORCE 500",
        power: 35,
        basePrice: 580000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "awd",
        type: "atv",
        img: "assets/moto/cforce/cforce.jpg",
        images: [
            "assets/moto/cforce/cforce.jpg",
            "assets/moto/cforce/cforce_1.jpg",
            "assets/moto/cforce/cforce_2.jpg",
            "assets/moto/cforce/cforce_3.jpg",
            "assets/moto/cforce/cforce_4.jpg",
            "assets/moto/cforce/cforce_5.jpg",
            "assets/moto/cforce/cforce_6.jpg",
            "assets/moto/cforce/cforce_7.jpg",
            "assets/moto/cforce/cforce_8.jpg",
            "assets/moto/cforce/cforce_9.jpg",
            "assets/moto/cforce/cforce_10.jpg"
        ],
        fallback: ATV_FB
    },
    {
        name: "Stels Guepard 850",
        power: 71,
        basePrice: 890000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "awd",
        type: "atv",
        img: "assets/moto/guepard/guepard.jpg",
        images: [
            "assets/moto/guepard/guepard.jpg",
            "assets/moto/guepard/guepard_1.jpg",
            "assets/moto/guepard/guepard_2.jpg",
            "assets/moto/guepard/guepard_3.jpg",
            "assets/moto/guepard/guepard_4.jpg",
            "assets/moto/guepard/guepard_5.jpg",
            "assets/moto/guepard/guepard_6.jpg",
            "assets/moto/guepard/guepard_7.jpg",
            "assets/moto/guepard/guepard_8.jpg",
            "assets/moto/guepard/guepard_9.jpg",
            "assets/moto/guepard/guepard_10.jpg"
        ],
        fallback: ATV_FB
    },
    {
        name: "Yamaha Grizzly 700",
        power: 49,
        basePrice: 1350000,
        priceVariation: { minMultiplier: 0.75, maxMultiplier: 1.30 },
        drivetrain: "awd",
        type: "atv",
        img: "assets/moto/grizzly/grizzly.jpg",
        images: [
            "assets/moto/grizzly/grizzly.jpg",
            "assets/moto/grizzly/grizzly_1.jpg",
            "assets/moto/grizzly/grizzly_2.jpg",
            "assets/moto/grizzly/grizzly_3.jpg",
            "assets/moto/grizzly/grizzly_4.jpg",
            "assets/moto/grizzly/grizzly_5.jpg",
            "assets/moto/grizzly/grizzly_6.jpg",
            "assets/moto/grizzly/grizzly_7.jpg",
            "assets/moto/grizzly/grizzly_8.jpg",
            "assets/moto/grizzly/grizzly_9.jpg",
            "assets/moto/grizzly/grizzly_10.jpg"
        ],
        fallback: ATV_FB
    },
    {
        name: "BRP Can-Am Maverick X3",
        power: 195,
        basePrice: 3400000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "atv",
        img: "assets/moto/maverick/maverick.jpg",
        images: [
            "assets/moto/maverick/maverick.jpg",
            "assets/moto/maverick/maverick_1.jpg",
            "assets/moto/maverick/maverick_2.jpg",
            "assets/moto/maverick/maverick_3.jpg",
            "assets/moto/maverick/maverick_4.jpg",
            "assets/moto/maverick/maverick_5.jpg",
            "assets/moto/maverick/maverick_6.jpg",
            "assets/moto/maverick/maverick_7.jpg",
            "assets/moto/maverick/maverick_8.jpg",
            "assets/moto/maverick/maverick_9.jpg",
            "assets/moto/maverick/maverick_10.jpg"
        ],
        fallback: ATV_FB
    }
];

console.log('[🏔️ data/cars/atv] Загружено:', window.CARS_CATEGORY_ATV.length, 'моделей квадроциклов ✓');
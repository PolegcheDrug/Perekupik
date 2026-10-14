// ========================================================
// data/cars/premium.js — КАТЕГОРИЯ «ПРЕМИУМ» (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// 15 моделей бизнес-класса, спортседанов и SUV премиум-сегмента.
// Экспортируется в window.CARS_CATEGORY_PREMIUM
// ========================================================

// Локальный алиас фолбек-картинки (подстраховка от порядка загрузки)
const PREMIUM_FB = (window.CAR_FALLBACKS_BY_CATEGORY && window.CAR_FALLBACKS_BY_CATEGORY.premium)
    || "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80";

window.CARS_CATEGORY_PREMIUM = [
    {
        name: "BMW 3 Series (G20)",
        power: 190,
        basePrice: 3400000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "rwd",
        type: "premium",
        img: "assets/cars/premium/g20/g20.jpg",
        images: [
            "assets/cars/premium/g20/g20.jpg",
            "assets/cars/premium/g20/g20_1.jpg",
            "assets/cars/premium/g20/g20_2.jpg",
            "assets/cars/premium/g20/g20_3.jpg",
            "assets/cars/premium/g20/g20_4.jpg",
            "assets/cars/premium/g20/g20_5.jpg",
            "assets/cars/premium/g20/g20_6.jpg",
            "assets/cars/premium/g20/g20_7.jpg",
            "assets/cars/premium/g20/g20_8.jpg",
            "assets/cars/premium/g20/g20_9.jpg",
            "assets/cars/premium/g20/g20_10.jpg"
        ],
        fallback: PREMIUM_FB
    },
    {
        name: "BMW 5 Series (G30)",
        power: 249,
        basePrice: 4100000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "premium",
        img: "assets/cars/premium/g30/g30.jpg",
        images: [
            "assets/cars/premium/g30/g30.jpg",
            "assets/cars/premium/g30/g30_1.jpg",
            "assets/cars/premium/g30/g30_2.jpg",
            "assets/cars/premium/g30/g30_3.jpg",
            "assets/cars/premium/g30/g30_4.jpg",
            "assets/cars/premium/g30/g30_5.jpg",
            "assets/cars/premium/g30/g30_6.jpg",
            "assets/cars/premium/g30/g30_7.jpg",
            "assets/cars/premium/g30/g30_8.jpg",
            "assets/cars/premium/g30/g30_9.jpg",
            "assets/cars/premium/g30/g30_10.jpg"
        ],
        fallback: PREMIUM_FB
    },
    {
        name: "Mercedes E-Class (W213)",
        power: 249,
        basePrice: 4300000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "premium",
        img: "assets/cars/premium/w213/w213.jpg",
        images: [
            "assets/cars/premium/w213/w213.jpg",
            "assets/cars/premium/w213/w213_1.jpg",
            "assets/cars/premium/w213/w213_2.jpg",
            "assets/cars/premium/w213/w213_3.jpg",
            "assets/cars/premium/w213/w213_4.jpg",
            "assets/cars/premium/w213/w213_5.jpg",
            "assets/cars/premium/w213/w213_6.jpg",
            "assets/cars/premium/w213/w213_7.jpg",
            "assets/cars/premium/w213/w213_8.jpg",
            "assets/cars/premium/w213/w213_9.jpg",
            "assets/cars/premium/w213/w213_10.jpg"
        ],
        fallback: PREMIUM_FB
    },
    {
        name: "Audi A6 (C8)",
        power: 245,
        basePrice: 4200000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "premium",
        img: "assets/cars/premium/a6/a6.jpg",
        images: [
            "assets/cars/premium/a6/a6.jpg",
            "assets/cars/premium/a6/a6_1.jpg",
            "assets/cars/premium/a6/a6_2.jpg",
            "assets/cars/premium/a6/a6_3.jpg",
            "assets/cars/premium/a6/a6_4.jpg",
            "assets/cars/premium/a6/a6_5.jpg",
            "assets/cars/premium/a6/a6_6.jpg",
            "assets/cars/premium/a6/a6_7.jpg",
            "assets/cars/premium/a6/a6_8.jpg",
            "assets/cars/premium/a6/a6_9.jpg",
            "assets/cars/premium/a6/a6_10.jpg"
        ],
        fallback: PREMIUM_FB
    },
    {
        name: "BMW M340i xDrive",
        power: 387,
        basePrice: 4900000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.40 },
        drivetrain: "awd",
        type: "premium",
        img: "assets/cars/premium/bmw_m340i/bmw_m_340i.jpeg",
        images: [
            "assets/cars/premium/bmw_m340i/bmw_m_340i.jpeg",
            "assets/cars/premium/bmw_m340i/bmw_m_340i_1.jpg",
            "assets/cars/premium/bmw_m340i/bmw_m_340i_2.jpg",
            "assets/cars/premium/bmw_m340i/bmw_m_340i_3.jpg",
            "assets/cars/premium/bmw_m340i/bmw_m_340i_4.jpg",
            "assets/cars/premium/bmw_m340i/bmw_m_340i_5.jpg",
            "assets/cars/premium/bmw_m340i/bmw_m_340i_6.jpg",
            "assets/cars/premium/bmw_m340i/bmw_m_340i_7.jpg",
            "assets/cars/premium/bmw_m340i/bmw_m_340i_8.jpg",
            "assets/cars/premium/bmw_m340i/bmw_m_340i_9.jpg",
            "assets/cars/premium/bmw_m340i/bmw_m_340i_10.jpg"
        ],
        fallback: PREMIUM_FB
    },
    {
        name: "Mercedes C63s AMG",
        power: 510,
        basePrice: 5400000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.40 },
        drivetrain: "rwd",
        type: "premium",
        img: "assets/cars/premium/c63/mercedes_c_c63_w205_sedan.jpeg",
        images: [
            "assets/cars/premium/c63/mercedes_c_c63_w205_sedan.jpeg",
            "assets/cars/premium/c63/mercedes_c_c63_1.jpg",
            "assets/cars/premium/c63/mercedes_c_c63_2.jpg",
            "assets/cars/premium/c63/mercedes_c_c63_3.jpg",
            "assets/cars/premium/c63/mercedes_c_c63_4.jpg",
            "assets/cars/premium/c63/mercedes_c_c63_5.jpg",
            "assets/cars/premium/c63/mercedes_c_c63_6.jpg",
            "assets/cars/premium/c63/mercedes_c_c63_7.jpg",
            "assets/cars/premium/c63/mercedes_c_c63_8.jpg",
            "assets/cars/premium/c63/mercedes_c_c63_9.jpg",
            "assets/cars/premium/c63/mercedes_c_c63_10.jpg"
        ],
        fallback: PREMIUM_FB
    },
    {
        name: "Porsche Macan GTS",
        power: 440,
        basePrice: 7500000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "premium",
        img: "assets/cars/premium/macan/macan.jpg",
        images: [
            "assets/cars/premium/macan/macan.jpg",
            "assets/cars/premium/macan/macan_1.jpg",
            "assets/cars/premium/macan/macan_2.jpg",
            "assets/cars/premium/macan/macan_3.jpg",
            "assets/cars/premium/macan/macan_4.jpg",
            "assets/cars/premium/macan/macan_5.jpg",
            "assets/cars/premium/macan/macan_6.jpg",
            "assets/cars/premium/macan/macan_7.jpg",
            "assets/cars/premium/macan/macan_8.jpg",
            "assets/cars/premium/macan/macan_9.jpg",
            "assets/cars/premium/macan/macan_10.jpg"
        ],
        fallback: PREMIUM_FB
    },
    {
        name: "BMW X5 (G05)",
        power: 340,
        basePrice: 8600000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "premium",
        img: "assets/cars/premium/x5/x5.jpg",
        images: [
            "assets/cars/premium/x5/x5.jpg",
            "assets/cars/premium/x5/x5_1.jpg",
            "assets/cars/premium/x5/x5_2.jpg",
            "assets/cars/premium/x5/x5_3.jpg",
            "assets/cars/premium/x5/x5_4.jpg",
            "assets/cars/premium/x5/x5_5.jpg",
            "assets/cars/premium/x5/x5_6.jpg",
            "assets/cars/premium/x5/x5_7.jpg",
            "assets/cars/premium/x5/x5_8.jpg",
            "assets/cars/premium/x5/x5_9.jpg",
            "assets/cars/premium/x5/x5_10.jpg"
        ],
        fallback: PREMIUM_FB
    },
    {
        name: "BMW X6 (G06)",
        power: 340,
        basePrice: 9100000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "premium",
        img: "assets/cars/premium/x6/x6.jpg",
        images: [
            "assets/cars/premium/x6/x6.jpg",
            "assets/cars/premium/x6/x6_1.jpg",
            "assets/cars/premium/x6/x6_2.jpg",
            "assets/cars/premium/x6/x6_3.jpg",
            "assets/cars/premium/x6/x6_4.jpg",
            "assets/cars/premium/x6/x6_5.jpg",
            "assets/cars/premium/x6/x6_6.jpg",
            "assets/cars/premium/x6/x6_7.jpg",
            "assets/cars/premium/x6/x6_8.jpg",
            "assets/cars/premium/x6/x6_9.jpg",
            "assets/cars/premium/x6/x6_10.jpg"
        ],
        fallback: PREMIUM_FB
    },
    {
        name: "Porsche Cayenne (PO536)",
        power: 340,
        basePrice: 10500000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "premium",
        img: "assets/cars/premium/cayenne/cayenne_new.jpg",
        images: [
            "assets/cars/premium/cayenne/cayenne_new.jpg",
            "assets/cars/premium/cayenne/cayenne_new_1.jpg",
            "assets/cars/premium/cayenne/cayenne_new_2.jpg",
            "assets/cars/premium/cayenne/cayenne_new_3.jpg",
            "assets/cars/premium/cayenne/cayenne_new_4.jpg",
            "assets/cars/premium/cayenne/cayenne_new_5.jpg",
            "assets/cars/premium/cayenne/cayenne_new_6.jpg",
            "assets/cars/premium/cayenne/cayenne_new_7.jpg",
            "assets/cars/premium/cayenne/cayenne_new_8.jpg",
            "assets/cars/premium/cayenne/cayenne_new_9.jpg",
            "assets/cars/premium/cayenne/cayenne_new_10.jpg"
        ],
        fallback: PREMIUM_FB
    },
    {
        name: "Toyota Land Cruiser 300",
        power: 415,
        basePrice: 12000000,
        priceVariation: { minMultiplier: 0.82, maxMultiplier: 1.30 },
        drivetrain: "awd",
        type: "premium",
        img: "assets/cars/premium/lc300/lc300.jpg",
        images: [
            "assets/cars/premium/lc300/lc300.jpg",
            "assets/cars/premium/lc300/lc300_1.jpg",
            "assets/cars/premium/lc300/lc300_2.jpg",
            "assets/cars/premium/lc300/lc300_3.jpg",
            "assets/cars/premium/lc300/lc300_4.jpg",
            "assets/cars/premium/lc300/lc300_5.jpg",
            "assets/cars/premium/lc300/lc300_6.jpg",
            "assets/cars/premium/lc300/lc300_7.jpg",
            "assets/cars/premium/lc300/lc300_8.jpg",
            "assets/cars/premium/lc300/lc300_9.jpg",
            "assets/cars/premium/lc300/lc300_10.jpg"
        ],
        fallback: PREMIUM_FB
    },
    {
        name: "Mercedes S-Class (W223)",
        power: 367,
        basePrice: 15800000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "premium",
        img: "assets/cars/premium/w223/w223.jpg",
        images: [
            "assets/cars/premium/w223/w223.jpg",
            "assets/cars/premium/w223/w223_1.jpg",
            "assets/cars/premium/w223/w223_2.jpg",
            "assets/cars/premium/w223/w223_3.jpg",
            "assets/cars/premium/w223/w223_4.jpg",
            "assets/cars/premium/w223/w223_5.jpg",
            "assets/cars/premium/w223/w223_6.jpg",
            "assets/cars/premium/w223/w223_7.jpg",
            "assets/cars/premium/w223/w223_8.jpg",
            "assets/cars/premium/w223/w223_9.jpg",
            "assets/cars/premium/w223/w223_10.jpg"
        ],
        fallback: PREMIUM_FB
    },
    {
        name: "Mercedes G63 AMG «Гелик»",
        power: 585,
        basePrice: 17800000,
        priceVariation: { minMultiplier: 0.82, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "premium",
        img: "assets/cars/premium/g63/mercedes_g63amg.jpg",
        images: [
            "assets/cars/premium/g63/mercedes_g63amg.jpg",
            "assets/cars/premium/g63/mercedes_g63amg_1.jpg",
            "assets/cars/premium/g63/mercedes_g63amg_2.jpg",
            "assets/cars/premium/g63/mercedes_g63amg_3.jpg",
            "assets/cars/premium/g63/mercedes_g63amg_4.jpg",
            "assets/cars/premium/g63/mercedes_g63amg_5.jpg",
            "assets/cars/premium/g63/mercedes_g63amg_6.jpg",
            "assets/cars/premium/g63/mercedes_g63amg_7.jpg",
            "assets/cars/premium/g63/mercedes_g63amg_8.jpg",
            "assets/cars/premium/g63/mercedes_g63amg_9.jpg",
            "assets/cars/premium/g63/mercedes_g63amg_10.jpg"
        ],
        fallback: PREMIUM_FB
    },
    {
        name: "Audi RS6 Avant (C8)",
        power: 600,
        basePrice: 13900000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "premium",
        img: "assets/cars/premium/rs6/rs6.jpg",
        images: [
            "assets/cars/premium/rs6/rs6.jpg",
            "assets/cars/premium/rs6/rs6_1.jpg",
            "assets/cars/premium/rs6/rs6_2.jpg",
            "assets/cars/premium/rs6/rs6_3.jpg",
            "assets/cars/premium/rs6/rs6_4.jpg",
            "assets/cars/premium/rs6/rs6_5.jpg",
            "assets/cars/premium/rs6/rs6_6.jpg",
            "assets/cars/premium/rs6/rs6_7.jpg",
            "assets/cars/premium/rs6/rs6_8.jpg",
            "assets/cars/premium/rs6/rs6_9.jpg",
            "assets/cars/premium/rs6/rs6_10.jpg"
        ],
        fallback: PREMIUM_FB
    }
];

console.log('[💎 data/cars/premium] Загружено:', window.CARS_CATEGORY_PREMIUM.length, 'моделей премиума ✓');
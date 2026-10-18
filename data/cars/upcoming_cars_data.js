// ========================================================
// data/cars/upcoming.js — КАТЕГОРИЯ «СКОРО В ИГРЕ» (UPCOMING)
// Транспорт для будущих обновлений: BMW M4, BMW X5, AUDI RS6, Bentley Mulsanne.
// Экспортируется в window.CARS_CATEGORY_UPCOMING
// ========================================================

const UPCOMING_FB = (window.CAR_FALLBACKS_BY_CATEGORY && window.CAR_FALLBACKS_BY_CATEGORY.upcoming)
    || "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80";

window.CARS_CATEGORY_UPCOMING = [
    {
        name: "BMW M4 Competition (G82)",
        power: 510,
        basePrice: 11200000,
        priceVariation: { minMultiplier: 0.82, maxMultiplier: 1.35 },
        drivetrain: "rwd",
        type: "upcoming",
        img: "assets/cars/upcoming/m4/m4.jpg",
        images: [
            "assets/cars/upcoming/m4/m4.jpg",
            "assets/cars/upcoming/m4/m4_1.jpg",
            "assets/cars/upcoming/m4/m4_2.jpg",
            "assets/cars/upcoming/m4/m4_3.jpg",
            "assets/cars/upcoming/m4/m4_4.jpg",
            "assets/cars/upcoming/m4/m4_5.jpg",
            "assets/cars/upcoming/m4/m4_6.jpg",
            "assets/cars/upcoming/m4/m4_7.jpg",
            "assets/cars/upcoming/m4/m4_8.jpg",
            "assets/cars/upcoming/m4/m4_9.jpg",
            "assets/cars/upcoming/m4/m4_10.jpg"
        ],
        fallback: UPCOMING_FB
    },
    {
        name: "BMW X5 M Competition (F95)",
        power: 625,
        basePrice: 14500000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "upcoming",
        img: "assets/cars/upcoming/x5m/x5m.jpg",
        images: [
            "assets/cars/upcoming/x5m/x5m.jpg",
            "assets/cars/upcoming/x5m/x5m_1.jpg",
            "assets/cars/upcoming/x5m/x5m_2.jpg",
            "assets/cars/upcoming/x5m/x5m_3.jpg",
            "assets/cars/upcoming/x5m/x5m_4.jpg",
            "assets/cars/upcoming/x5m/x5m_5.jpg",
            "assets/cars/upcoming/x5m/x5m_6.jpg",
            "assets/cars/upcoming/x5m/x5m_7.jpg",
            "assets/cars/upcoming/x5m/x5m_8.jpg",
            "assets/cars/upcoming/x5m/x5m_9.jpg",
            "assets/cars/upcoming/x5m/x5m_10.jpg"
        ],
        fallback: UPCOMING_FB
    },
    {
        name: "Audi RS6 Avant Dynamic Plus (C8)",
        power: 630,
        basePrice: 15900000,
        priceVariation: { minMultiplier: 0.80, maxMultiplier: 1.35 },
        drivetrain: "awd",
        type: "upcoming",
        img: "assets/cars/upcoming/rs6/rs6.jpg",
        images: [
            "assets/cars/upcoming/rs6/rs6.jpg",
            "assets/cars/upcoming/rs6/rs6_1.jpg",
            "assets/cars/upcoming/rs6/rs6_2.jpg",
            "assets/cars/upcoming/rs6/rs6_3.jpg",
            "assets/cars/upcoming/rs6/rs6_4.jpg",
            "assets/cars/upcoming/rs6/rs6_5.jpg",
            "assets/cars/upcoming/rs6/rs6_6.jpg",
            "assets/cars/upcoming/rs6/rs6_7.jpg",
            "assets/cars/upcoming/rs6/rs6_8.jpg",
            "assets/cars/upcoming/rs6/rs6_9.jpg",
            "assets/cars/upcoming/rs6/rs6_10.jpg"
        ],
        fallback: UPCOMING_FB
    },
    {
        name: "Bentley Mulsanne Speed",
        power: 537,
        basePrice: 24500000,
        priceVariation: { minMultiplier: 0.85, maxMultiplier: 1.30 },
        drivetrain: "rwd",
        type: "upcoming",
        img: "assets/cars/upcoming/mulsanne/mulsanne.jpg",
        images: [
            "assets/cars/upcoming/mulsanne/mulsanne.jpg",
            "assets/cars/upcoming/mulsanne/mulsanne_1.jpg",
            "assets/cars/upcoming/mulsanne/mulsanne_2.jpg",
            "assets/cars/upcoming/mulsanne/mulsanne_3.jpg",
            "assets/cars/upcoming/mulsanne/mulsanne_4.jpg",
            "assets/cars/upcoming/mulsanne/mulsanne_5.jpg",
            "assets/cars/upcoming/mulsanne/mulsanne_6.jpg",
            "assets/cars/upcoming/mulsanne/mulsanne_7.jpg",
            "assets/cars/upcoming/mulsanne/mulsanne_8.jpg",
            "assets/cars/upcoming/mulsanne/mulsanne_9.jpg",
            "assets/cars/upcoming/mulsanne/mulsanne_10.jpg"
        ],
        fallback: UPCOMING_FB
    }
];

console.log('[🚀 data/cars/upcoming] Загружено:', window.CARS_CATEGORY_UPCOMING.length, 'моделей на будущее ✓');
// ========================================================
// data_cars_fallbacks.js — ФОЛБЕК-КАРТИНКИ ПО КАТЕГОРИЯМ (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Используется если картинка модели не загрузилась с GitHub
// или если у шаблона машины нет img/images вообще.
// Вынесено из data_cars.js для разгрузки основного файла.
// ========================================================

const CAR_FALLBACKS_BY_CATEGORY = {
    economy: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80",
    scooter: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80",
    moto:    "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80",
    atv:     "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80",
    comfort: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80",
    premium: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80",
    hyper:   "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80",
    truck:   "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80",
    yacht:   "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=600&q=80"
};

// --------------------------------------------------------
// ЭКСПОРТ В ГЛОБАЛЬНЫЙ КОНТЕКСТ WINDOW
// --------------------------------------------------------
window.CAR_FALLBACKS_BY_CATEGORY = CAR_FALLBACKS_BY_CATEGORY;

console.log('[📸 data_cars_fallbacks] Фолбеки по категориям загружены ✓');
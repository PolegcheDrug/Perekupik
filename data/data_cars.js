// ========================================================
// data_cars.js — ТОНКИЙ ИНДЕКС БАЗЫ АВТОТЕХНИКИ (v2.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Собирает CAR_DATABASE из отдельных файлов категорий:
//   data/cars/economy.js  → window.CARS_CATEGORY_ECONOMY
//   data/cars/scooter.js  → window.CARS_CATEGORY_SCOOTER
//   data/cars/moto.js     → window.CARS_CATEGORY_MOTO
//   data/cars/atv.js      → window.CARS_CATEGORY_ATV
//   data/cars/comfort.js  → window.CARS_CATEGORY_COMFORT
//   data/cars/premium.js  → window.CARS_CATEGORY_PREMIUM
//   data/cars/hyper.js    → window.CARS_CATEGORY_HYPER
//   data/cars/truck.js    → window.CARS_CATEGORY_TRUCK
//   data/cars/yacht.js    → window.CARS_CATEGORY_YACHT
// Фолбеки по категориям лежат отдельно в data_cars_fallbacks.js
// ========================================================

// --------------------------------------------------------
// СБОРКА ЕДИНОЙ БАЗЫ МАШИН ИЗ ФАЙЛОВ КАТЕГОРИЙ
// --------------------------------------------------------
const CAR_DATABASE = {
    economy: (typeof window !== 'undefined' && Array.isArray(window.CARS_CATEGORY_ECONOMY))
        ? window.CARS_CATEGORY_ECONOMY
        : [],
    scooter: (typeof window !== 'undefined' && Array.isArray(window.CARS_CATEGORY_SCOOTER))
        ? window.CARS_CATEGORY_SCOOTER
        : [],
    moto: (typeof window !== 'undefined' && Array.isArray(window.CARS_CATEGORY_MOTO))
        ? window.CARS_CATEGORY_MOTO
        : [],
    atv: (typeof window !== 'undefined' && Array.isArray(window.CARS_CATEGORY_ATV))
        ? window.CARS_CATEGORY_ATV
        : [],
    comfort: (typeof window !== 'undefined' && Array.isArray(window.CARS_CATEGORY_COMFORT))
        ? window.CARS_CATEGORY_COMFORT
        : [],
    premium: (typeof window !== 'undefined' && Array.isArray(window.CARS_CATEGORY_PREMIUM))
        ? window.CARS_CATEGORY_PREMIUM
        : [],
    hyper: (typeof window !== 'undefined' && Array.isArray(window.CARS_CATEGORY_HYPER))
        ? window.CARS_CATEGORY_HYPER
        : [],
    truck: (typeof window !== 'undefined' && Array.isArray(window.CARS_CATEGORY_TRUCK))
        ? window.CARS_CATEGORY_TRUCK
        : [],
    yacht: (typeof window !== 'undefined' && Array.isArray(window.CARS_CATEGORY_YACHT))
        ? window.CARS_CATEGORY_YACHT
        : []
};

// --------------------------------------------------------
// ДИАГНОСТИКА ПРИ ЗАГРУЗКЕ (видно в DevTools Console)
// --------------------------------------------------------
(function logLoadedCategories() {
    const counts = {
        economy: CAR_DATABASE.economy.length,
        scooter: CAR_DATABASE.scooter.length,
        moto: CAR_DATABASE.moto.length,
        atv: CAR_DATABASE.atv.length,
        comfort: CAR_DATABASE.comfort.length,
        premium: CAR_DATABASE.premium.length,
        hyper: CAR_DATABASE.hyper.length,
        truck: CAR_DATABASE.truck.length,
        yacht: CAR_DATABASE.yacht.length
    };

    let totalCars = 0;
    let missingCategories = [];

    for (const cat in counts) {
        totalCars += counts[cat];
        if (counts[cat] === 0) missingCategories.push(cat);
    }

    console.log('[🚗 data_cars] CAR_DATABASE собран:', totalCars, 'моделей');
    console.log('[🚗 data_cars] По категориям:', counts);

    if (missingCategories.length > 0) {
        console.warn('[🚗 data_cars] ⚠️ Не загружены категории:', missingCategories.join(', '));
        console.warn('[🚗 data_cars] Проверьте, что файлы data/cars/*.js подключены в index.html ДО data_cars.js');
    }
})();

// --------------------------------------------------------
// ЗАГРУЗКА ВНЕШНЕГО ПАКА АВТОТЕХНИКИ (JSON)
// Позволяет подгружать сторонние базы машин с удалённого сервера.
// Категории из JSON мержатся с существующими.
// --------------------------------------------------------
async function loadExternalCarDatabase(jsonUrl) {
    try {
        const response = await fetch(jsonUrl);
        if (!response.ok) throw new Error("Network error loading car pack");

        const customData = await response.json();

        for (let cat in customData) {
            if (Array.isArray(customData[cat])) {
                if (!CAR_DATABASE[cat]) CAR_DATABASE[cat] = [];
                CAR_DATABASE[cat].push(...customData[cat]);
            }
        }

        if (typeof showToast === 'function') {
            showToast("📦 Внешний пак автотехники успешно загружен в игру!");
        }
        return true;
    } catch (e) {
        console.warn("[CarPackLoader] Ошибка загрузки внешнего пака:", e);
        return false;
    }
}

// --------------------------------------------------------
// ЭКСПОРТ В ГЛОБАЛЬНЫЙ КОНТЕКСТ WINDOW
// --------------------------------------------------------
window.CAR_DATABASE = CAR_DATABASE;
window.loadExternalCarDatabase = loadExternalCarDatabase;

console.log('[🚗 data_cars.js v2.0.0] Тонкий индекс активен. Собран из data/cars/*.js ✓');
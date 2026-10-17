// ========================================================
// data/data_profile.js — НАСТРОЙКИ ПРОФИЛЯ (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ Спринт 3: конфиг смены никнейма
//   - freeChanges: 1      — одна бесплатная смена
//   - paidCostCash: 100000 — платная смена (рубли)
//   - minLength/maxLength  — валидация длины
//   - forbiddenWords       — чёрный список слов
// ========================================================

const NAME_CHANGE_CONFIG = {
    freeChanges: 1,
    paidCostCash: 100000,
    paidCostStars: 0,
    minLength: 2,
    maxLength: 20,
    forbiddenWords: [
        'admin', 'moder', 'support', 'system', 'official',
        'админ', 'модер', 'хуй', 'пизд', 'еб', 'бля', 'сука'
    ]
};

// Экспорт в window
window.NAME_CHANGE_CONFIG = NAME_CHANGE_CONFIG;

console.log('[👤 data_profile v1.0.0] NAME_CHANGE_CONFIG загружен. Бесплатных смен:', NAME_CHANGE_CONFIG.freeChanges, '| Платная:', NAME_CHANGE_CONFIG.paidCostCash.toLocaleString(), '₽');
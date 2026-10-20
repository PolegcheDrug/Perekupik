// ========================================================
// data/data_patchnotes.js — ИСТОРИЯ ОБНОВЛЕНИЙ И МОДАЛКА ПАТЧНОУТА
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ========================================================

const GAME_PATCHNOTES = [
    {
        version: "v4.4.0",
        title: "Глубокая диагностика, Социум и Хардкорный баланс",
        date: "Октябрь 2026",
        badge: "КРУПНЫЙ АПДЕЙТ",
        badgeColor: "var(--cyan)",
        sections: [
            {
                title: "👥 Социум, Чат и Сделки с друзьями",
                items: [
                    "Раздел «Друзья» перенесен на первое место в меню социума.",
                    "Исправлена навигация: открытие рейтинга лидеров больше не стирает вкладки.",
                    "Полноценный чат с другом: история переписки и отправка заготовок перекупских фраз.",
                    "Интерактивная карточка авто в чате: продажа машин другу с кнопками «Купить», «Торг (-10%)» и «Отклонить».",
                    "Автопринятие встречных заявок в друзья без ошибки «Заявка уже отправлена»."
                ]
            },
            {
                title: "🔍 Тест-драйв, Диагностика и Автотека PRO",
                items: [
                    "Тест-драйв у капота: проверка холодного пуска (дымность, стук вкладышей, гидрики) и коробки передач (пинки АКПП, хруст синхронизаторов).",
                    "Автотека PRO: фиксация пробега по диагностическим картам ЕАИСТО и отчеты страховых о тотальных ДТП.",
                    "Блокировка МРЭО: автомобили с ограничениями ФССП, залогами и распилами нельзя поставить на официальный учет (только ДКП физлица или Даркнет)."
                ]
            },
            {
                title: "✨ Перекуп-детейлинг и Серые схемы",
                items: [
                    "Полировка фар и чернение шин (+5% к стартовой оценке авто).",
                    "Сухой туман: устранение запаха табака и сырости утопленника.",
                    "Шпаклевка и подкрас баллончиком (+14% HP кузова, толщиномер фиксирует 380+ мкм).",
                    "Смотка одометра со сканером: риск проверки покупателем по блокам ABS/АКПП со скандалом и падением репутации."
                ]
            },
            {
                title: "⚖️ Хардкорный баланс экономики",
                items: [
                    "Покупатели на площадке рассчитывают цену строго от честной рыночной оценки (marketValue), устраняя баг моментального обогащения.",
                    "Защита от оверпрайса: завышение ценника на 35%+ вызывает отказ и жесткий торг покупателя.",
                    "Уровневый Вилспин: исключен ранний дроп иномарок за миллионы (Golf GTI, BMW E34) на 1-3 уровнях.",
                    "Фиксация фото: автомобиль на площадке сохраняет оригинальную обложку из гаража."
                ]
            },
            {
                title: "❄️ Сезоны, Перегон и Технадзор 12.5.1",
                items: [
                    "Времена года: зимний дрифт-спрос на задний привод и летний ажиотаж на мото/спорткары.",
                    "Инсайдерский перегон: выкуп «капсул времени» в регионах с заказом эвакуатора и рисками в пути.",
                    "Рейды Технадзора ГИБДД: проверка конструкции корчей по ст. 12.5.1 КоАП РФ (взятка, помощь Решалы или аннулирование учета)."
                ]
            }
        ]
    },
    {
        version: "v4.3.2",
        title: "P2P Биржа и Интеграция Клубов",
        date: "Сентябрь 2026",
        badge: "СТАБИЛЬНЫЙ",
        badgeColor: "var(--green)",
        sections: [
            {
                title: "🚗 Торговля и Биржа",
                items: [
                    "Облачная P2P-биржа техники, госномеров и предприятий.",
                    "Срочный выкуп автомобилей с дисконтом 35%.",
                    "Синхронизация рейтинга и автопарков участников синдиката."
                ]
            }
        ]
    }
];

// Функция открытия модального окна патчноута
function openPatchnotesModal() {
    let modal = document.getElementById('modalGamePatchnotes');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalGamePatchnotes';
        modal.className = 'modal-backdrop active';
        modal.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,0.88); display:flex; align-items:center; justify-content:center; padding:12px; backdrop-filter:blur(8px);';
        document.body.appendChild(modal);
    }

    const currentPatch = GAME_PATCHNOTES[0];

    const sectionsHtml = currentPatch.sections.map(sec => `
        <div class="mb-3 p-2" style="background:#090e18; border-radius:10px; border:1px solid rgba(255,255,255,0.06);">
            <b class="text-xs color-cyan block mb-1" style="font-size:11px;">${sec.title}</b>
            <div class="space-y-1">
                ${sec.items.map(item => `
                    <div class="sub-label flex-gap" style="font-size:9.5px; line-height:1.35; align-items:flex-start; color:#cbd5e1;">
                        <span class="color-green" style="font-size:11px; line-height:1;">•</span>
                        <span>${item}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    modal.innerHTML = `
        <div class="glass-card p-3 w-full" style="max-width:440px; max-height:85vh; background:#0b1120; border:1.5px solid var(--cyan); border-radius:16px; display:flex; flex-direction:column; box-shadow:0 0 30px rgba(0,242,254,0.25);">
            <div class="flex-between mb-2">
                <div>
                    <div class="flex-gap" style="align-items:center;">
                        <span class="tag-badge bg-tag-cyan font-bold">${currentPatch.version}</span>
                        <b class="text-xs color-cyan" style="font-size:13px;">${currentPatch.title}</b>
                    </div>
                    <div class="sub-label mt-1" style="font-size:8.5px;">Дата релиза: <b>${currentPatch.date}</b></div>
                </div>
                <button onclick="document.getElementById('modalGamePatchnotes')?.remove()" class="btn btn-dark btn-sm btn-auto" style="padding:4px 8px;">✕</button>
            </div>

            <div style="flex:1; overflow-y:auto; padding-right:2px; margin-bottom:10px;">
                ${sectionsHtml}
            </div>

            <button onclick="document.getElementById('modalGamePatchnotes')?.remove()" class="btn btn-cyan w-full font-bold btn-sm">
                Отлично, в игру! 🚀
            </button>
        </div>
    `;

    if (window.AudioFx) window.AudioFx.play('tick');
}

// Экспорт в глобальный контекст
window.GAME_PATCHNOTES = GAME_PATCHNOTES;
window.openPatchnotesModal = openPatchnotesModal;

console.log('[📋 data_patchnotes v4.4.0] База патчноутов и модальное окно загружены ✓');

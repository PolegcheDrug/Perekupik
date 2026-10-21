// ========================================================
// data/data_patchnotes.js — ИСТОРИЯ ОБНОВЛЕНИЙ И МОДАЛКА ПАТЧНОУТА (v5.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ========================================================

const GAME_PATCHNOTES = [
    {
        version: "v5.0.0",
        title: "Глобальный редизайн: M+ Связь, Заказы на рынке и Социум в Жизни",
        date: "Октябрь 2026",
        badge: "РЕВОЛЮЦИЯ UI",
        badgeColor: "var(--cyan)",
        sections: [
            {
                title: "📱 Редизайн «M+ Связь» (3 чистых раздела)",
                items: [
                    "Ликвидировано нагромождение кнопок и 4-уровневые вложенные вкладки.",
                    "Раздел «Чаты»: единый вертикальный поток без переключателей; каждый диалог снабжен наглядным стикером (🏷️ Покупатель NPC, 🤝 P2P Торг, 💬 Контакт/Друг, 📰 Инфо).",
                    "Раздел «Сделки»: оперативная панель активных предложений у капота и встречных P2P-офферов с действием в 1 клик.",
                    "Раздел «Профиль»: компактная визитка перекупа с уровнем, кармой и статусом шифрования связи."
                ]
            },
            {
                title: "🏪 Интеграция Заказов прямо на Авторынок",
                items: [
                    "Биржа упразднена из телефона и перенесена в экран «Рынок» в виде вкладки «Заказы клиентов на подбор».",
                    "Запросы от таксопарков, курьерских служб и частников с фиксированным бюджетом и премией.",
                    "Умная сдача авто: если в гараже есть подходящая машина, сделка закрывается в 1 клик с моментальной выплатой на баланс."
                ]
            },
            {
                title: "☕ Социум, Радар ДПС и Хроника в экране «Жизнь»",
                items: [
                    "Экран «Жизнь» получил 3 удобных подраздела: «Тонус & Быт», «Улица & ДПС» и «Социум & Топ».",
                    "Оперативный радар ДПС по ст. 12.5.1 КоАП РФ: сводка облав технадзора, нелегальные дуэли на 402м и возможность опубликовать свой инсайд.",
                    "Интерактивные реакции на городские события: 🔥 Огонь, 😱 Шок, 💀 Опасно.",
                    "Зал Славы и рейтинг перекупов города по капиталу и уровню."
                ]
            },
            {
                title: "🤝 Прямой торг у капота (Direct NPC Haggle)",
                items: [
                    "Синхронизирован автономный торг: шаги +4%, +8% и +15% сразу обновляют сумму предложения и цену в договоре купли-продажи.",
                    "Шкала терпения покупателя и защита от срыва сделки."
                ]
            }
        ]
    },
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
                    "Полноценный чат с другом: история переписки и отправка заготовок перекупских фраз.",
                    "Интерактивная карточка авто в чате: продажа машин другу с кнопками «Купить», «Торг (-10%)» и «Отклонить»."
                ]
            },
            {
                title: "🔍 Тест-драйв, Диагностика и Автотека PRO",
                items: [
                    "Тест-драйв у капота: проверка холодного пуска (дымность, гидрики) и КПП (пинки, хруст синхронизаторов).",
                    "Автотека PRO: фиксация пробега по диагностическим картам ЕАИСТО и отчеты страховых о тотальных ДТП.",
                    "Блокировка МРЭО: автомобили с ограничениями ФССП, залогами и распилами нельзя поставить на официальный учет."
                ]
            },
            {
                title: "✨ Перекуп-детейлинг и Серые схемы",
                items: [
                    "Полировка фар и чернение шин (+5% к стартовой оценке авто).",
                    "Сухой туман: устранение запаха табака и сырости утопленника.",
                    "Шпаклевка и подкрас баллончиком (+14% HP кузова, толщиномер фиксирует 380+ мкм).",
                    "Смотка одометра со сканером: риск проверки покупателем по блокам ABS/АКПП со скандалом."
                ]
            },
            {
                title: "⚖️ Хардкорный баланс экономики",
                items: [
                    "Покупатели на площадке рассчитывают цену строго от честной рыночной оценки (marketValue).",
                    "Защита от оверпрайса: завышение ценника на 35%+ вызывает отказ и жесткий торг покупателя.",
                    "Уровневый Вилспин: исключен ранний дроп иномарок за миллионы на 1-3 уровнях."
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

// ========================================================
// УНИВЕРСАЛЬНЫЙ РЕНДЕР МОДАЛЬНОГО ОКНА ПАТЧНОУТА
// ========================================================
function openPatchnotesModal() {
    let modal = document.getElementById('modalPatchNotes');
    
    if (!modal) {
        modal = document.getElementById('modalGamePatchnotes');
    }

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalPatchNotes';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const currentPatch = GAME_PATCHNOTES[0];

    const sectionsHtml = currentPatch.sections.map(sec => `
        <div class="mb-2 p-2" style="background:#090e18; border-radius:10px; border:1px solid rgba(255,255,255,0.06);">
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
        <div class="modal-box" style="max-width:440px; max-height:85vh; background:#0b1120; border:1.5px solid var(--cyan); border-radius:16px; display:flex; flex-direction:column; box-shadow:0 0 30px rgba(0,242,254,0.25);">
            <div class="flex-between mb-2">
                <div>
                    <div class="flex-gap" style="align-items:center;">
                        <span class="tag-badge bg-tag-cyan font-bold">${currentPatch.version}</span>
                        <b class="text-xs color-cyan" style="font-size:12.5px;">${currentPatch.title}</b>
                    </div>
                    <div class="sub-label mt-1" style="font-size:8.5px;">Дата релиза: <b>${currentPatch.date}</b> • Авторы: <b>Tak Toje, Max, Sergo, gemini, Илья Чепиль</b></div>
                </div>
                <button onclick="dismissPatchNotesModal()" class="btn btn-dark btn-sm btn-auto" style="padding:4px 8px;">✕</button>
            </div>

            <div style="flex:1; overflow-y:auto; padding-right:2px; margin-bottom:10px;">
                ${sectionsHtml}
            </div>

            <button onclick="dismissPatchNotesModal()" class="btn btn-cyan w-full font-bold btn-sm">
                В игру! 🚀
            </button>
        </div>
    `;

    modal.style.display = 'flex';
    modal.classList.add('active');

    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('light');
}

function dismissPatchNotesModal() {
    const modal1 = document.getElementById('modalPatchNotes');
    const modal2 = document.getElementById('modalGamePatchnotes');

    if (modal1) {
        modal1.style.display = 'none';
        modal1.classList.remove('active');
    }
    if (modal2) {
        modal2.remove();
    }

    if (typeof playSound === 'function') playSound('tick');
}

// Экспорт в глобальный контекст
window.GAME_PATCHNOTES = GAME_PATCHNOTES;
window.openPatchnotesModal = openPatchnotesModal;
window.dismissPatchNotesModal = dismissPatchNotesModal;
window.closePatchNotesModal = dismissPatchNotesModal;

console.log('[📋 data_patchnotes v5.0.0] База патчноутов v5.0.0 загружена, дубликаты устранены ✓');

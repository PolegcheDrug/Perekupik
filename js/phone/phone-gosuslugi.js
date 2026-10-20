// ========================================================
// js/phone/phone-gosuslugi.js — ПРИЛОЖЕНИЕ «ГОСУСЛУГИ / МРЭО» (v2.3.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v2.3.0 (РЕАЛИСТИЧНАЯ НАЛОГОВАЯ СИСТЕМА И АРЕСТЫ ФССП):
//   - Полный фикс бесконечной оплаты: после оплаты статус сбрасывается в 0
//     и блокируется повторное начисление до следующего налогового периода.
//   - Налоговый период на 7 игровых дней с таймером дедлайна.
//   - Начисление пени (+5% в день) при просрочке уплаты.
//   - Арест ФССП при просрочке 3+ дней (запрет регдействий в МРЭО и продаж).
//   - Уведомление о конфискации имущества приставами за 50% цены при 7+ днях.
//   - Автономный fallback для LEGAL_ENTITIES (ИП и ООО).
// ========================================================

const AppGosuslugi = {
    subTab: 'fines', // 'fines', 'taxes', 'legal', 'mreo', 'plates'
    _bidPending: false,

    _getLegalConfig(type) {
        if (typeof window !== 'undefined' && window.LEGAL_ENTITIES && window.LEGAL_ENTITIES[type]) {
            return window.LEGAL_ENTITIES[type];
        }
        if (typeof LEGAL_ENTITIES !== 'undefined' && LEGAL_ENTITIES[type]) {
            return LEGAL_ENTITIES[type];
        }

        // Автономный fallback
        const fallbackEntities = {
            none: { id: 'none', name: 'Физическое лицо', taxRate: 0, regFee: 0, reqStars: 0, minLevel: 1 },
            ip: { id: 'ip', name: 'Индивидуальный предприниматель (ИП)', tag: 'ИП', taxRate: 0.06, regFee: 15000, reqStars: 2, minLevel: 4, maxFleetPerBiz: 5 },
            ooo: { id: 'ooo', name: 'Общество с огр. ответственностью (ООО)', tag: 'ООО', taxRate: 0.15, regFee: 80000, reqStars: 10, minLevel: 8, maxFleetPerBiz: 25 }
        };
        return fallbackEntities[type] || null;
    },

    _syncLegalState() {
        if (!state.player) state.player = {};
        if (!state.player.documents) state.player.documents = {};

        const docs = state.player.documents;
        const currentLegal = state.player.legalEntity;

        if (!currentLegal || currentLegal.type === 'none') {
            if (docs.oooRegistered || state.player.hasOOO) {
                state.player.legalEntity = {
                    type: 'ooo',
                    inn: docs.inn || state.player.inn || '7701984210',
                    ogrn: docs.ogrn || '1207700892145',
                    regDate: docs.regDate || new Date().toLocaleDateString('ru-RU'),
                    companyName: docs.companyName || state.player.companyName || 'ООО «ВЕКТОР МОТОРС»'
                };
            } else if (docs.ipRegistered || state.player.hasIP || state.player.businessRegistered) {
                const pName = state.player.name || 'Игрок';
                state.player.legalEntity = {
                    type: 'ip',
                    inn: docs.inn || state.player.inn || '7705312489',
                    ogrn: docs.ogrn || '3207700512849',
                    regDate: docs.regDate || new Date().toLocaleDateString('ru-RU'),
                    companyName: docs.companyName || `ИП ${pName}`
                };
            } else {
                state.player.legalEntity = {
                    type: 'none',
                    inn: null,
                    ogrn: null,
                    regDate: null,
                    companyName: null
                };
            }
        }
    },

    /**
     * Проверка: находится ли игрок под налоговым арестом ФССП
     */
    isUnderTaxArrest() {
        return Boolean(state.player?.taxArrest || (state.player?.taxOverdueDays && state.player.taxOverdueDays >= 3));
    },

    render(container) {
        if (!container) return;
        this._syncLegalState();

        let sub = this.subTab;

        if (state.player.trafficFines === undefined) state.player.trafficFines = 0;
        if (state.player.taxDebt === undefined) state.player.taxDebt = 0;
        if (state.player.taxPenalty === undefined) state.player.taxPenalty = 0;
        if (state.player.taxOverdueDays === undefined) state.player.taxOverdueDays = 0;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-shield-halved color-cyan mr-1"></i> Госуслуги МРЭО</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="grid-5 mb-2" style="display:grid; grid-template-columns: repeat(5, 1fr); gap: 3px;">
                    <button onclick="AppGosuslugi.switchTab('fines')" class="btn ${sub === 'fines' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 1px; font-size:8.5px;">Штрафы</button>
                    <button onclick="AppGosuslugi.switchTab('taxes')" class="btn ${sub === 'taxes' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 1px; font-size:8.5px;">Налоги</button>
                    <button onclick="AppGosuslugi.switchTab('legal')" class="btn ${sub === 'legal' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 1px; font-size:8.5px;">Юрлица</button>
                    <button onclick="AppGosuslugi.switchTab('mreo')" class="btn ${sub === 'mreo' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 1px; font-size:8.5px;">МРЭО Учёт</button>
                    <button onclick="AppGosuslugi.switchTab('plates')" class="btn ${sub === 'plates' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="padding:5px 1px; font-size:8.5px;">Номера</button>
                </div>

                ${sub === 'fines' ? this.renderFinesTab() : ''}
                ${sub === 'taxes' ? this.renderTaxesTab() : ''}
                ${sub === 'legal' ? this.renderLegalTab() : ''}
                ${sub === 'mreo' ? this.renderMreoTab() : ''}
                ${sub === 'plates' ? this.renderPlatesAuctionTab() : ''}
            </div>
        `;
    },

    switchTab(tab) {
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.subTab = tab;
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 1. ШТРАФЫ
    // ========================================================
    renderFinesTab() {
        let fines = state.player?.trafficFines || 0;

        return `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(220, 38, 38, 0.15), #090e18);">
                <div class="font-bold text-xs color-red mb-1">НЕОПЛАЧЕННЫЕ ШТРАФЫ С КАМЕР ФВФД</div>
                <div class="price-val color-red my-1" style="font-size:26px;">${fines.toLocaleString()} ₽</div>
                <div class="sub-label" style="font-size:10px;">Фиксация превышений скорости и опасных манёвров на МКАД.</div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-cyan mb-2 block">⚖️ Исполнительные производства:</b>
                ${fines > 0 ? `
                    <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(220,38,38,0.3);">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-amber">Автоматические камеры ГИБДД</b>
                            <span class="tag-badge bg-tag-red">Взыскание</span>
                        </div>
                        <div class="sub-label mb-2" style="font-size:9.5px;">Сумма задолженности перед бюджетом: <b>${fines.toLocaleString()} ₽</b></div>
                        <button onclick="AppGosuslugi.payFines()" class="btn btn-green btn-sm w-full">Оплатить со скидкой 50% (${Math.round(fines * 0.5).toLocaleString()} ₽)</button>
                    </div>
                ` : `
                    <div class="sub-label text-center py-4">У вас нет неоплаченных штрафов. Вы аккуратный водитель!</div>
                `}
            </div>
        `;
    },

    payFines() {
        let fines = state.player?.trafficFines || 0;
        if (fines <= 0) return showToast("Штрафов нет!");

        let toPay = Math.round(fines * 0.5);
        let cash = state.player?.cash || 0;
        if (cash < toPay) return showToast(`Не хватает денег для оплаты: ${toPay.toLocaleString()} ₽!`);

        state.player.cash -= toPay;
        state.player.trafficFines = 0;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Оплата штрафов ГИБДД", toPay, false);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Штрафы успешно оплачены через Госуслуги!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 2. НАЛОГИ (С ИСПРАВЛЕННОЙ СИСТЕМОЙ ПЕРИОДОВ И АРЕСТОВ)
    // ========================================================
    renderTaxesTab() {
        const curDay = Number(state.player?.day) || 1;
        const taxDebt = Number(state.player?.taxDebt) || 0;
        const penalty = Number(state.player?.taxPenalty) || 0;
        const totalToPay = taxDebt + penalty;
        const overdueDays = Number(state.player?.taxOverdueDays) || 0;
        const dueDay = Number(state.player?.taxDueDay) || (curDay + 7);
        const daysLeft = Math.max(0, dueDay - curDay);

        const isArrested = Boolean(state.player?.taxArrest || overdueDays >= 3);
        const isBailiffAuctionRisk = overdueDays >= 7;

        // Баннер предупреждений приставов
        let alertBanner = '';
        if (isBailiffAuctionRisk) {
            alertBanner = `
                <div class="p-2 mb-2" style="background:rgba(220,38,38,0.2); border:1px solid var(--red); border-radius:8px;">
                    <b class="text-xs color-red"><i class="fa-solid fa-triangle-exclamation"></i> ДЕЛО ПЕРЕДАНО ПРИСТАВАМ (ФССП)!</b>
                    <div class="sub-label mt-1" style="font-size:9px; color:#fca5a5; line-height:1.35;">
                        Просрочка более 7 дней! Автомобили из вашего гаража будут выставлены на принудительный аукцион за 50% рыночной стоимости в счёт погашения долга!
                    </div>
                </div>
            `;
        } else if (isArrested) {
            alertBanner = `
                <div class="p-2 mb-2" style="background:rgba(255,179,0,0.15); border:1px solid var(--amber); border-radius:8px;">
                    <b class="text-xs color-amber"><i class="fa-solid fa-lock"></i> НАЛОЖЕН АРЕСТ ФССП / ГИБДД!</b>
                    <div class="sub-label mt-1" style="font-size:9px; color:#fde68a; line-height:1.35;">
                        Действует запрет на регистрационные действия! Вы не можете продавать автомобили клиентам и ставить машины на коммерческий учёт до полной оплаты долга.
                    </div>
                </div>
            `;
        }

        return `
            ${alertBanner}
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, ${totalToPay > 0 ? (isArrested ? 'rgba(220,38,38,0.2)' : 'rgba(255,179,0,0.15)') : 'rgba(0,230,118,0.12)'}, #090e18);">
                <div class="font-bold text-xs ${totalToPay > 0 ? (isArrested ? 'color-red' : 'color-amber') : 'color-green'} mb-1">
                    ${totalToPay > 0 ? (overdueDays > 0 ? 'НАЛОГОВАЯ ЗАДОЛЖЕННОСТЬ (ПРОСРОЧЕНО)' : 'ТЕКУЩИЙ ТРАНСПОРТНЫЙ НАЛОГ') : 'НАЛОГИ ПОЛНОСТЬЮ ОПЛАЧЕНЫ'}
                </div>
                <div class="price-val ${totalToPay > 0 ? (isArrested ? 'color-red' : 'color-amber') : 'color-green'} my-1" style="font-size:26px;">
                    ${totalToPay > 0 ? `${totalToPay.toLocaleString()} ₽` : '0 ₽'}
                </div>
                <div class="sub-label" style="font-size:10px;">
                    ${totalToPay > 0 
                        ? (overdueDays > 0 ? `Просрочка: ${overdueDays} дн. (начисляется пеня +5%/день)` : `Срок уплаты: осталось ${daysLeft} дн. (до ${dueDay} дня)`)
                        : `Следующее начисление транспортного налога: через ${Math.max(1, (Number(state.player?.taxPaidUntilDay) || (curDay + 7)) - curDay)} дн.`}
                </div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-cyan mb-2 block"><i class="fa-solid fa-file-invoice-dollar"></i> Детализация сборов ФНС:</b>
                ${totalToPay > 0 ? `
                    <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid ${isArrested ? 'rgba(220,38,38,0.4)' : 'rgba(255,179,0,0.3)'};">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-amber">Федеральная налоговая служба РФ</b>
                            <span class="tag-badge ${overdueDays > 0 ? 'bg-tag-red' : 'bg-tag-amber'}">
                                ${overdueDays > 0 ? `ПРОСРОЧЕНО (+${overdueDays}д)` : 'К УПЛАТЕ'}
                            </span>
                        </div>
                        <div class="sub-label mb-1" style="font-size:9.5px;">Базовый налог на мощность: <b>${taxDebt.toLocaleString()} ₽</b></div>${penalty > 0 ? `<div class="sub-label mb-2 color-red" style="font-size:9.5px;">Начисленная пеня ФССП: <b>+${penalty.toLocaleString()} ₽</b></div>` : ''}
                        <button onclick="AppGosuslugi.payTaxes()" class="btn btn-green btn-sm w-full">
                            Оплатить налог и снять ограничения (${totalToPay.toLocaleString()} ₽)
                        </button>
                    </div>
                ` : `
                    <div class="p-3 text-center" style="background:#090e18; border-radius:8px;">
                        <i class="fa-solid fa-circle-check color-green mb-1" style="font-size:24px;"></i>
                        <b class="text-xs color-green block mb-1">Все налоги оплачены вовремя!</b>
                        <div class="sub-label" style="font-size:9.5px;">Аресты и запреты на регистрационные действия отсутствуют. Вы чисты перед законом.</div>
                    </div>
                `}
            </div>
        `;
    },

    payTaxes() {
        const taxDebt = Number(state.player?.taxDebt) || 0;
        const penalty = Number(state.player?.taxPenalty) || 0;
        const totalToPay = taxDebt + penalty;

        if (totalToPay <= 0) {
            return showToast("У вас нет неоплаченных налогов!");
        }

        let cash = Number(state.player?.cash) || 0;
        if (cash < totalToPay) {
            if (typeof playSound === 'function') playSound('error');
            return showToast(`Не хватает денег для оплаты: требуется ${totalToPay.toLocaleString()} ₽!`);
        }

        // Списание средств
        state.player.cash -= totalToPay;

        // Фиксация полной оплаты и установка следующего периода
        const curDay = Number(state.player?.day) || 1;
        state.player.taxDebt = 0;
        state.player.taxPenalty = 0;
        state.player.taxOverdueDays = 0;
        state.player.taxArrest = false;
        state.player.taxPaidUntilDay = curDay + 7;
        state.player.taxDueDay = curDay + 7;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Погашение налоговой задолженности и пеней ФНС", totalToPay, false);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        if (typeof openVerdictModal === 'function') {
            openVerdictModal(
                "НАЛОГИ ПОЛНОСТЬЮ ПОГАШЕНЫ! 🏛️",
                `Задолженность в размере <b>${totalToPay.toLocaleString()} ₽</b> успешно оплачена в ФНС!\nВсе ограничения и запреты на регистрационные действия сняты.`,
                true,
                totalToPay
            );
        } else {
            showToast("✓ Налоги успешно уплачены!");
        }

        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 3. РЕГИСТРАЦИЯ ЮРИДИЧЕСКИХ ЛИЦ (ИП / ООО)
    // ========================================================
    renderLegalTab() {
        this._syncLegalState();
        const legal = state.player.legalEntity || { type: 'none' };
        const currentType = legal.type || 'none';
        const isRegistered = currentType !== 'none';
        const currentConfig = this._getLegalConfig(currentType);

        const ipConfig = this._getLegalConfig('ip') || { regFee: 15000, reqStars: 2, minLevel: 4, taxRate: 0.06 };
        const oooConfig = this._getLegalConfig('ooo') || { regFee: 80000, reqStars: 10, minLevel: 8, taxRate: 0.15 };

        return `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0, 229, 255, 0.15), #090e18);">
                <div class="font-bold text-xs color-cyan mb-1">РЕЕСТР СУБЪЕКТОВ ПРЕДПРИНИМАТЕЛЬСТВА</div>
                <div class="price-val color-cyan my-1" style="font-size:22px;">
                    ${isRegistered ? `${legal.companyName || currentConfig?.name}` : 'ФИЗИЧЕСКОЕ ЛИЦО'}
                </div>
                <div class="sub-label" style="font-size:10px;">
                    ${isRegistered 
                        ? `ИНН: ${legal.inn} • ОГРН: ${legal.ogrn} • Ставка налога: ${((currentConfig?.taxRate || 0.06) * 100)}%` 
                        : 'Без регистрации юридического лица покупка автобизнесов невозможна.'}
                </div>
            </div>

            ${!isRegistered ? `
                <div class="glass-card p-2 mb-2">
                    <b class="text-xs color-amber mb-2 block"><i class="fa-solid fa-briefcase"></i> Выберите форму собственности:</b>

                    <!-- Карточка ИП -->
                    <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(0,229,255,0.2);">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-cyan">ИП (Индивидуальный предприниматель)</b>
                            <span class="tag-badge bg-tag-cyan">УСН 6%</span>
                        </div>
                        <div class="sub-label mb-2" style="font-size:9.5px;">
                            • Налог: <b>6% с дохода автопарков</b><br>
                            • Лимит автопарка: <b>до 5 машин на бизнес</b><br>
                            • Доступ: Автомойки, СТО, Таксопарк, Доставка, Разборка.<br>
                            • Пошлина: <b>${ipConfig.regFee.toLocaleString()} ₽</b> + <b>${ipConfig.reqStars} ⭐</b> (Ур. ${ipConfig.minLevel})
                        </div>
                        <button onclick="AppGosuslugi.registerLegal('ip')" class="btn btn-cyan btn-sm w-full">Оформить ИП</button>
                    </div>

                    <!-- Карточка ООО -->
                    <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,179,0,0.3);">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-amber">ООО (Общество с огр. ответственностью)</b>
                            <span class="tag-badge bg-tag-amber">ОСНО 15%</span>
                        </div>
                        <div class="sub-label mb-2" style="font-size:9.5px;">
                            • Налог: <b>15% с дохода</b><br>
                            • Лимит автопарка: <b>до 25 машин на бизнес</b><br>
                            • Доступ: Все виды бизнеса + Тяжелые ТК («Магистраль») и Хабы.<br>
                            • Пошлина и капитал: <b>${oooConfig.regFee.toLocaleString()} ₽</b> + <b>${oooConfig.reqStars} ⭐</b> (Ур. ${oooConfig.minLevel})
                        </div>
                        <button onclick="AppGosuslugi.registerLegal('ooo')" class="btn btn-green btn-sm w-full">Учредить ООО</button>
                    </div>
                </div>
            ` : `
                <div class="glass-card p-2 mb-2">
                    <b class="text-xs color-green mb-2 block"><i class="fa-solid fa-circle-check"></i> Данные вашей организации:</b>
                    <div class="p-2 mb-2" style="background:#090e18; border-radius:8px;">
                        <div class="flex-between mb-1">
                            <span class="sub-label">Организационно-правовая форма:</span>
                            <b>${currentConfig?.tag || currentType.toUpperCase()}</b>
                        </div>
                        <div class="flex-between mb-1">
                            <span class="sub-label">Налоговая ставка:</span>
                            <b class="color-amber">${(currentConfig?.taxRate || 0) * 100}% с выручки</b>
                        </div>
                        <div class="flex-between mb-1">
                            <span class="sub-label">Лимит авто на точку:</span>
                            <b>до ${currentConfig?.maxFleetPerBiz || 5} ед.</b>
                        </div>
                        <div class="flex-between mb-1">
                            <span class="sub-label">Дата регистрации:</span>
                            <b>${legal.regDate || 'Недавно'}</b>
                        </div>
                    </div>

                    ${currentType === 'ip' ? `
                        <div class="p-2" style="background:rgba(255,179,0,0.06); border-radius:8px; border:1px solid rgba(255,179,0,0.2);">
                            <div class="sub-label mb-2" style="font-size:9.5px;">
                                Требуется расширить автопарк до 25 машин или открыть Транспортную компанию тягачей? Реорганизуйте ИП в ООО.
                            </div>
                            <button onclick="AppGosuslugi.registerLegal('ooo')" class="btn btn-amber btn-sm w-full">Реорганизовать в ООО (${oooConfig.regFee.toLocaleString()} ₽)</button>
                        </div>
                    ` : ''}
                </div>
            `}
        `;
    },

    registerLegal(type) {
        const config = this._getLegalConfig(type);
        if (!config) return showToast("Неизвестный тип организации");

        const player = state.player;
        const level = player.level || 1;
        const cash = player.cash || 0;
        const stars = player.stars || 0;

        if (level < config.minLevel) {
            if (typeof playSound === 'function') playSound('error');
            return showToast(`Требуется ${config.minLevel} уровень персонажа!`);
        }
        if (cash < config.regFee) {
            if (typeof playSound === 'function') playSound('error');
            return showToast(`Не хватает наличных: требуется ${config.regFee.toLocaleString()} ₽`);
        }
        if (stars < config.reqStars) {
            if (typeof playSound === 'function') playSound('error');
            return showToast(`Не хватает звёзд: требуется ${config.reqStars} ⭐`);
        }

        player.cash -= config.regFee;
        player.stars -= config.reqStars;

        const pName = player.name || 'Игрок';
        const randomInn = String(Math.floor(7700000000 + Math.random() * 99999999));
        const randomOgrn = String(Math.floor(1207700000000 + Math.random() * 999999999));
        const regDate = new Date().toLocaleDateString('ru-RU');
        const companyName = type === 'ip' ? `ИП ${pName}` : `ООО «ВЕКТОР МОТОРС»`;

        player.legalEntity = {
            type: type,
            inn: randomInn,
            ogrn: randomOgrn,
            regDate: regDate,
            companyName: companyName
        };

        if (!player.documents) player.documents = {};
        player.documents.inn = randomInn;
        player.documents.ogrn = randomOgrn;
        player.documents.companyName = companyName;
        player.documents.regDate = regDate;

        if (type === 'ip') {
            player.documents.ipRegistered = true;
            player.documents.oooRegistered = false;
            player.hasIP = true;
            player.hasOOO = false;
            player.businessRegistered = true;
        } else if (type === 'ooo') {
            player.documents.ipRegistered = false;
            player.documents.oooRegistered = true;
            player.hasIP = false;
            player.hasOOO = true;
            player.businessRegistered = true;
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        if (typeof openVerdictModal === 'function') {
            openVerdictModal(
                "ЮРИДИЧЕСКОЕ ЛИЦО ЗАРЕГИСТРИРОВАНО! 🏛️",
                `Федеральная налоговая служба одобрила регистрацию!\nОрганизация: <b>${player.legalEntity.companyName}</b>\nНалоговая ставка: <b>${config.taxRate * 100}%</b>\nТеперь вы можете выкупать предприятия и ставить машины на баланс через МРЭО.`,
                true,
                config.regFee
            );
        } else {
            showToast(`Успешно зарегистрировано: ${player.legalEntity.companyName}!`);
        }

        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 4. МРЭО: КОММЕРЧЕСКИЙ УЧЕТ ТРАНСПОРТА
    // ========================================================
    renderMreoTab() {
        this._syncLegalState();
        const legal = state.player.legalEntity || { type: 'none' };
        if (legal.type === 'none') {
            return `
                <div class="glass-card p-3 text-center">
                    <i class="fa-solid fa-building-circle-xmark color-red mb-2" style="font-size:32px;"></i>
                    <b class="text-xs color-red block mb-1">МРЭО: Доступ заблокирован</b>
                    <div class="sub-label mb-3" style="font-size:10px;">
                        Для постановки машин на коммерческий баланс предприятий необходимо сначала оформить ИП или ООО во вкладке «Юрлица».
                    </div>
                    <button onclick="AppGosuslugi.switchTab('legal')" class="btn btn-cyan btn-sm">Перейти к регистрации юрлица</button>
                </div>
            `;
        }

        // Проверка ареста ФССП
        if (this.isUnderTaxArrest()) {
            return `
                <div class="glass-card p-3 text-center" style="border:1px solid var(--red); background:rgba(220,38,38,0.1);">
                    <i class="fa-solid fa-handcuffs color-red mb-2" style="font-size:32px;"></i>
                    <b class="text-xs color-red block mb-1">РЕГИСТРАЦИОННЫЕ ДЕЙСТВИЯ ЗАПРЕЩЕНЫ ФССП</b>
                    <div class="sub-label mb-3" style="font-size:10px; color:#fca5a5;">
                        Из-за просрочки по налогам на ваш профиль наложен судебный арест. Постановка новых автомобилей на учёт заблокирована до погашения задолженности!
                    </div>
                    <button onclick="AppGosuslugi.switchTab('taxes')" class="btn btn-red btn-sm">Оплатить налоги в ФНС</button>
                </div>
            `;
        }

        const fee = window.MREO_CONFIG?.commercialRegFee || 8500;
        const garage = state.garage || [];

        let carsHtml = '';
        if (garage.length === 0) {
            carsHtml = `<div class="sub-label text-center py-4">В вашем личном гараже нет автомобилей. Купите подходящее ТС на рынке.</div>`;
        } else {
            garage.forEach((car, idx) => {
                const isComRegistered = Boolean(car.commercialRegistered);
                const regOrg = car.registeredCompany || legal.companyName;
                const assignedBiz = car.assignedBusinessName || null;

                carsHtml += `
                    <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid ${isComRegistered ? 'rgba(0,230,118,0.3)' : 'rgba(255,179,0,0.3)'};">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-cyan">${car.brand || ''} ${car.name || car.model || 'Авто'}</b>
                            <span class="tag-badge ${isComRegistered ? 'bg-tag-green' : 'bg-tag-amber'}">
                                ${isComRegistered ? 'На балансе компании' : 'Личный учет (Физлицо)'}
                            </span>
                        </div>
                        <div class="sub-label mb-2" style="font-size:9.5px;">
                            • Класс: <b>${(car.category || car.type || 'economy').toUpperCase()}</b> • Состояние: <b>${car.condition || 100}%</b><br>
                            ${isComRegistered ? `• Закреплено за: <b>${regOrg}</b>${assignedBiz ? ` (${assignedBiz})` : ''}` : `• Требуется госпошлина МРЭО: <b>${fee.toLocaleString()} ₽</b>`}
                        </div>
                        ${!isComRegistered ? `
                            <button onclick="AppGosuslugi.registerCommercialCar(${idx})" class="btn btn-green btn-sm w-full">
                                <i class="fa-solid fa-stamp"></i> Поставить на баланс юрлица (${fee.toLocaleString()} ₽)
                            </button>
                        ` : `
                            <button onclick="AppGosuslugi.deregisterCommercialCar(${idx})" class="btn btn-dark btn-sm w-full opacity-70">
                                Снять с баланса и вернуть в личный гараж
                            </button>
                        `}
                    </div>
                `;
            });
        }

        return `
            <div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.15), #090e18);">
                <div class="font-bold text-xs color-green mb-1">МРЭО: РЕЕСТР КОММЕРЧЕСКОГО ТРАНСПОРТА</div>
                <div class="price-val color-green my-1" style="font-size:22px;">${legal.companyName}</div>
                <div class="sub-label" style="font-size:10px;">
                    Оформление СТС на организацию. Автомобили без регистрации в МРЭО приносят на 50% меньше дохода из-за штрафов ГИБДД!
                </div>
            </div>

            <div class="glass-card p-2">
                <b class="text-xs color-cyan mb-2 block"><i class="fa-solid fa-car-side"></i> Автомобили для коммерческой регистрации:</b>
                ${carsHtml}
            </div>
        `;
    },

    registerCommercialCar(carIdx) {
        if (this.isUnderTaxArrest()) {
            if (typeof playSound === 'function') playSound('error');
            return showToast("❌ Действует арест ФССП! Регистрационные действия заблокированы.");
        }

        const fee = window.MREO_CONFIG?.commercialRegFee || 8500;
        const player = state.player;
        const car = state.garage ? state.garage[carIdx] : null;

        if (!car) return showToast("Автомобиль не найден");
        if ((player.cash || 0) < fee) return showToast(`Не хватает денег на госпошлину: ${fee.toLocaleString()} ₽`);

        player.cash -= fee;
        car.commercialRegistered = true;
        car.registeredCompany = player.legalEntity?.companyName || 'ООО Компания';
        car.registrationDate = new Date().toLocaleDateString('ru-RU');

        if (typeof trackQuestProgress === 'function') {
            trackQuestProgress('mreo_register', 1);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        showToast(`✅ ${car.brand || ''} ${car.name || ''} оформлен на баланс компании!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    deregisterCommercialCar(carIdx) {
        const car = state.garage ? state.garage[carIdx] : null;
        if (!car) return showToast("Автомобиль не найден");

        car.commercialRegistered = false;
        car.registeredCompany = null;
        car.assignedBusinessId = null;
        car.assignedBusinessName = null;

        if (typeof saveState === 'function') saveState();
        if (typeof playSound === 'function') playSound('tick');
        showToast(`Машина снята с коммерческого учета.`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 5. АУКЦИОН ГОСНОМЕРОВ
    // ========================================================
    renderPlatesAuctionTab() {
        if (!state.officialPlateAuction || state.officialPlateAuction.length === 0) {
            state.officialPlateAuction = this._generateInitialAuctionLots();
        }

        const myUid = String(state.player?.uid || window.tgUserId || "");
        const myName = String(state.player?.name || "Вы");

        let html = "";
        state.officialPlateAuction.forEach((lot, lIdx) => {
            const isPlayerLeading =
                (lot.highestBidderId && String(lot.highestBidderId) === myUid) ||
                (!lot.highestBidderId && String(lot.highestBidder || "") === myName && myName !== 'Государство' && myName !== '');

            const currentBid = Number(lot.currentBid) || 0;

            html += `
            <div class="glass-card mb-2 p-2" style="${isPlayerLeading ? 'border-color:var(--green); background:rgba(0,230,118,0.05);' : ''}">
                <div class="flex-between mb-1">
                    <span class="license-plate">${lot.plate} <div class="license-flag">RUS</div></span>
                    <span class="price-val text-xs color-green">${currentBid.toLocaleString()} ₽</span>
                </div>
                <div class="sub-label mb-2" style="font-size:9.5px;">
                    Лидер торгов:
                    ${isPlayerLeading
                        ? `<b class="color-green">⚡ ВЫ (${myName})</b>`
                        : `<b class="color-amber">${lot.highestBidder || 'Государство'}</b>`}
                </div>

                ${isPlayerLeading ? `
                    <div class="p-2 mb-2 text-center" style="background:rgba(0,230,118,0.1); border-radius:8px; border:1px solid rgba(0,230,118,0.3);">
                        <span class="sub-label color-green" style="font-size:9.5px;">✅ Вы уже лидируете на этом лоте</span>
                    </div>
                    <button class="btn btn-dark btn-sm w-full opacity-50" disabled>
                        <i class="fa-solid fa-crown color-amber"></i> Ваша текущая ставка
                    </button>
                ` : `
                    <div class="grid-2">
                        <button onclick="AppGosuslugi.bidPlate(${lIdx}, 50000)" class="btn btn-cyan btn-sm">
                            +50k к ставке
                        </button>
                        <button onclick="AppGosuslugi.bidPlate(${lIdx}, 150000)" class="btn btn-green btn-sm">
                            +150k к ставке
                        </button>
                    </div>
                `}
            </div>`;
        });

        return `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-2">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-gavel"></i> Официальный аукцион номеров МРЭО</b>
                    <span class="tag-badge bg-tag-cyan">Торги</span>
                </div>
                <div class="sub-label mb-2" style="font-size:9.5px;">
                    Официальные торги на редкие серии. Убедитесь, что вас не перебивают — свою же ставку перебить нельзя.
                </div>
                <div class="space-y-2">
                    ${html}
                </div>
            </div>
        `;
    },

    _generateInitialAuctionLots() {
        return [
            { id: 'p_' + Date.now() + '_1', plate: 'А777АА 777', currentBid: 450000, highestBidder: 'Государство', highestBidderId: null },
            { id: 'p_' + Date.now() + '_2', plate: 'М001ММ 99',  currentBid: 750000, highestBidder: 'Государство', highestBidderId: null },
            { id: 'p_' + Date.now() + '_3', plate: 'В888ВВ 50',  currentBid: 300000, highestBidder: 'Государство', highestBidderId: null }
        ];
    },

    bidPlate(lotIdx, raiseAmount) {
        if (this._bidPending) return;

        const lot = state.officialPlateAuction[lotIdx];
        if (!lot) return showToast("Лот не найден");

        const myUid = String(state.player?.uid || window.tgUserId || "");
        const myName = String(state.player?.name || "Вы");

        const isPlayerLeading =
            (lot.highestBidderId && String(lot.highestBidderId) === myUid) ||
            (!lot.highestBidderId && String(lot.highestBidder || "") === myName && myName !== 'Государство' && myName !== '');

        if (isPlayerLeading) {
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('warning');
            return showToast("⚠️ Вы уже лидируете на этом лоте!");
        }

        if (!window.PlatesManager) {
            return showToast("⚠️ Модуль номеров не загружен");
        }

        const currentBid = Number(lot.currentBid) || 0;
        const newBid = currentBid + raiseAmount;
        const cash = state.player?.cash || 0;

        if (cash < newBid) {
            if (typeof playSound === 'function') playSound('error');
            return showToast(`Не хватает ₽: нужно ${newBid.toLocaleString()} ₽ (у вас ${cash.toLocaleString()} ₽)`);
        }

        this._bidPending = true;

        try {
            state.player.cash -= newBid;

            const addRes = window.PlatesManager.addPlate(lot.plate, 'gosuslugi_auction', { silent: true });

            if (!addRes) {
                state.player.cash += newBid;
                return showToast("❌ Не удалось выиграть номер (ошибка менеджера)");
            }

            lot.highestBidder = myName;
            lot.highestBidderId = myUid;
            lot.currentBid = newBid;

            const newPlate = (typeof generateCoolPlate === 'function') ? generateCoolPlate() : "А777АА 77";
            state.officialPlateAuction[lotIdx] = {
                id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                plate: newPlate,
                currentBid: Math.floor(250000 + Math.random() * 400000),
                highestBidder: 'Государство',
                highestBidderId: null
            };

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

            if (typeof logBankTransaction === 'function') {
                logBankTransaction(`Аукцион номеров МРЭО: ${lot.plate}`, newBid, false);
            }

            if (typeof openVerdictModal === 'function') {
                openVerdictModal(
                    "НОМЕР ВЫИГРАН НА АУКЦИОНЕ! 🏷️",
                    `Вы перебили ставку и официально закрепили за собой красивый знак <b>${lot.plate}</b>!\nСумма: ${newBid.toLocaleString()} ₽\nЗнак добавлен в инвентарь госномеров.`,
                    true,
                    newBid
                );
            }

            this.render(document.getElementById('phoneAppContainer'));

        } finally {
            this._bidPending = false;
        }
    }
};

window.AppGosuslugi = AppGosuslugi;

console.log('[🏛 phone-gosuslugi v2.3.0] Загружен: Реалистичная налоговая система ФНС и аресты ФССП ✓');

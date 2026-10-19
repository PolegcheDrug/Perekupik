// ========================================================
// js/phone/phone-darknet.js — ОБЪЕДИНЁННЫЙ МОДУЛЬ «ТЕНЕВОЙ КОНТУР» (v2.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v2.0.0 (ОБЛАВЫ 12.5.1 & СКУПЩИК МАШИН БЕЗ ДОКУМЕНТОВ):
//   - ДОБАВЛЕНО: Скупщик авторазбора (Black Market Fencing) — мгновенный сбыт
//     угнанных, битых, распилов и корчей с аннулированным учетом 12.5.1.
//   - ДОБАВЛЕНО: checkCarRaid1251() — честный расчет рисков облавы при выезде
//     в город с нелегальным тюнингом, прямотоком, заваркой и крадеными деталями.
//   - ИНТЕГРАЦИЯ: «Крыша ГИБДД» полностью нейтрализует риски облав 12.5.1.
//   - СОХРАНЕНО: Радар ДПС, услуги Решалы (Артура) и контрактные запчасти.
// ========================================================

const AppDarknet = {
    mainTab: 'radar',   // 'radar' | 'darknet'
    subTab: 'services', // 'services' | 'parts' | 'fencing'

    // Точка входа для PhoneManager
    render(container) {
        if (!container) container = document.getElementById('phoneAppContainer');
        if (!container) return;

        const main = this.mainTab;
        const conn = state.player?.connections || 0;
        const immunity = state.player?.policeImmunityDays || 0;

        const caps = (typeof getPlayerHousingCapabilities === 'function')
            ? getPlayerHousingCapabilities()
            : { reshalaDiscountPct: 0 };

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn">
                    <i class="fa-solid fa-chevron-left"></i> Назад
                </button>
                <div class="phone-app-title">
                    ${main === 'radar' 
                        ? '<i class="fa-solid fa-tower-broadcast color-red mr-1"></i> ДПС Монитор' 
                        : '<i class="fa-solid fa-user-secret color-purple mr-1"></i> Теневой Контур'}
                </div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body">
                <!-- Главный переключатель экранов -->
                <div class="grid-2 mb-2" style="gap: 6px;">
                    <button onclick="AppDarknet.switchMainTab('radar')" 
                            class="btn ${main === 'radar' ? 'btn-cyan' : 'btn-dark'} btn-sm font-bold">
                        <i class="fa-solid fa-tower-broadcast"></i> ДПС Радар
                    </button>
                    <button onclick="AppDarknet.switchMainTab('darknet')" 
                            class="btn ${main === 'darknet' ? 'btn-purple' : 'btn-dark'} btn-sm font-bold">
                        <i class="fa-solid fa-user-secret"></i> Решала & Рынок
                    </button>
                </div>

                <!-- Контент активного экрана -->
                ${main === 'radar' ? this.renderRadarScreen(immunity) : this.renderDarknetScreen(conn, immunity, caps)}
            </div>
        `;
    },

    // ────────────────────────────────────────────────────────
    // НАВИГАЦИЯ И ПЕРЕКЛЮЧЕНИЯ
    // ────────────────────────────────────────────────────────
    switchMainTab(tab) {
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.mainTab = tab;
        this.render(document.getElementById('phoneAppContainer'));
    },

    switchSubTab(tab) {
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.subTab = tab;
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ────────────────────────────────────────────────────────
    // ЭКРАН 1: ДПС РАДАР
    // ────────────────────────────────────────────────────────
    renderRadarScreen(immunity) {
        const races = state.player?.consecutiveRaces || 0;
        const maxRaces = state.player?.maxRacesBeforeRaid || 12;
        const progressPct = Math.min(100, Math.round((races / maxRaces) * 100));

        let statusText = immunity > 0 
            ? `<span class="color-green font-bold"><i class="fa-solid fa-shield-halved"></i> Крыша активна (${immunity} дн.)</span>` 
            : (races >= maxRaces - 2 
                ? `<span class="color-red font-bold animate-pulse">🚨 КРИТИЧЕСКИЙ РИСК ОБЛАВЫ</span>`
                : `<span class="color-amber font-bold">Рейды активны</span>`);

        let barClass = races >= maxRaces - 2 
            ? "risk-high" 
            : (races >= Math.floor(maxRaces / 2) ? "fill-biz-stock" : "fill-biz-lvl");

        return `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-2">
                    <b class="text-xs">Статус контроля спотов:</b>
                    ${statusText}
                </div>

                <div class="flex-between text-xs mb-1">
                    <span class="sub-label">Внимание ДПС на 402м:</span>
                    <b class="${races >= maxRaces - 2 ? 'color-red' : (races > 4 ? 'color-amber' : 'color-green')}">
                        ${races} / ${maxRaces} заездов (${progressPct}%)
                    </b>
                </div>

                <div class="biz-progress-track mb-2">
                    <div class="biz-progress-fill ${barClass}" style="width:${progressPct}%;"></div>
                </div>

                <p class="sub-label mb-2" style="font-size:10px; line-height:1.4;">
                    При достижении <b>${maxRaces} заездов</b> спецбатальон ДПС проводит рейд на нелегальном споте по ст. 12.5.1 КоАП РФ с отправкой корча на штрафстоянку.
                </p>

                <div class="space-y-2">
                    <button onclick="AppDarknet.switchMainTab('darknet')" class="btn btn-purple btn-sm w-full font-bold">
                        <i class="fa-solid fa-user-secret mr-1"></i> ${immunity > 0 ? 'Продлить крышу в Даркнете' : 'Купить крышу в Даркнете'}
                    </button>
                    ${(races > 0 && immunity <= 0) ? `
                    <button onclick="AppDarknet.bribePoliceIntel()" class="btn btn-dark btn-sm w-full color-cyan">
                        <i class="fa-solid fa-money-bill-wave mr-1"></i> Слить ориентировку (-3 заезда за 35,000 ₽)
                    </button>` : ''}
                </div>
            </div>

            <div class="glass-card p-2">
                <div class="flex-between mb-2">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-satellite-dish"></i> Городские посты и камеры</b>
                    <span class="tag-badge bg-tag-cyan">${races > 6 ? 'УСИЛЕННЫЙ РЕЖИМ' : 'МОНИТОРИНГ'}</span>
                </div>
                <div class="sub-label" style="font-size:9.5px; line-height:1.5;">
                    • <b>МКАД (внешнее):</b> Мобильный шумомер — замер громкости выхлопа прямотоков.<br>
                    • <b>Парковка ТЦ:</b> Экипаж проверки техрегламента (выворот, заварка, 12.5.1).<br>
                    • <b>Промзона (402м):</b> ${races >= maxRaces - 3 
                        ? '<b class="color-red">Спецрота перехвата уже блокирует выезды!</b>' 
                        : 'Дежурный патруль сканирует эфир раций.'}
                </div>
            </div>
        `;
    },

    // ────────────────────────────────────────────────────────
    // ЭКРАН 2: РЕШАЛА И ДАРКНЕТ ПОРТАЛ
    // ────────────────────────────────────────────────────────
    renderDarknetScreen(conn, immunity, caps) {
        const sub = this.subTab;
        const discountBadge = caps.reshalaDiscountPct > 0 
            ? `<span class="tag-badge bg-tag-green">Скидка цеха -${caps.reshalaDiscountPct}%</span>` 
            : `<span class="tag-badge bg-tag-purple">Штаб Артура</span>`;

        return `
            <div class="reshala-banner mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-purple">Теневые Связи: ${conn} 🤝</b>
                    ${discountBadge}
                </div>
                <div class="sub-label" style="font-size:10px;">
                    Анонимный доступ к серым услугам, отмыву документов, скупщикам проблемных авто и деталям без номеров.${caps.reshalaDiscountPct > 0 ? ` Действует скидка вашего бокса <b>${caps.reshalaDiscountPct}%</b>!` : ''}
                </div>
            </div>

            <div class="grid-2 mb-2">
                <button onclick="AppDarknet.buyPack(1)" class="btn btn-purple btn-sm">1 Связь (200k)</button>
                <button onclick="AppDarknet.buyPack(5)" class="btn btn-purple btn-sm">5 Связей (850k)</button>
            </div>

            <div class="grid-3 mb-2" style="grid-template-columns: repeat(3, 1fr); gap: 4px;">
                <button onclick="AppDarknet.switchSubTab('services')" class="btn ${sub === 'services' ? 'btn-purple' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                    Услуги
                </button>
                <button onclick="AppDarknet.switchSubTab('parts')" class="btn ${sub === 'parts' ? 'btn-purple' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                    Детали
                </button>
                <button onclick="AppDarknet.switchSubTab('fencing')" class="btn ${sub === 'fencing' ? 'btn-purple' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                    Скупка авто
                </button>
            </div>

            ${sub === 'services' ? this.renderServicesSubTab(immunity, caps) : (sub === 'parts' ? this.renderStolenPartsSubTab() : this.renderFencingSubTab())}
        `;
    },

    renderServicesSubTab(immunity, caps) {
        const hasLic = !!state.player?.hasRacingLicense;
        const discountMultiplier = Math.max(0.5, 1 - ((caps?.reshalaDiscountPct || 0) / 100));

        const baseRoofCost = 450000;
        const baseLicCost = 120000;
        const baseLegalizeCost = 300000;

        const roofCost = Math.round(baseRoofCost * discountMultiplier);
        const licCost = Math.round(baseLicCost * discountMultiplier);
        const legalizeCost = Math.round(baseLegalizeCost * discountMultiplier);

        return `
            <div class="reshala-deal-card mb-2 p-2" id="cardRoofService">
                <div class="flex-between">
                    <b class="text-xs">🚨 Крыша ГИБДД (3 дня)</b>
                    <span class="tag-badge bg-tag-amber">${immunity > 0 ? immunity + ' дн.' : 'Иммунитет'}</span>
                </div>
                <p class="sub-label my-1" style="font-size:10px;">Защита от облав на заездах 402м, рейдов 12.5.1 и штрафов за просроченный ДКП. Сбрасывает внимание ДПС до 0.</p>
                <button onclick="AppDarknet.buyRoofAction(${roofCost});" class="btn btn-amber btn-sm w-full" ${immunity > 0 ? 'disabled' : ''}>
                    ${immunity > 0 ? 'Крыша активна ✓' : `Оформить (${(roofCost / 1000).toFixed(0)}k ₽ / 45 ⭐)`}
                </button>
            </div>

            <div class="reshala-deal-card mb-2 p-2">
                <div class="flex-between">
                    <b class="text-xs">🏎️ Гоночная Лицензия РАФ</b>
                    <span class="tag-badge bg-tag-cyan">402 метра</span>
                </div>
                <p class="sub-label my-1" style="font-size:10px;">Официальный регламентный допуск пилота к городским и клубным заездам.</p>
                <button onclick="buyReshalaService('license'); AppDarknet.render();" class="btn btn-cyan btn-sm w-full" ${hasLic ? 'disabled' : ''}>
                    ${hasLic ? 'Оформлено ✓' : `Оформить (${(licCost / 1000).toFixed(0)}k ₽ / 15 ⭐)`}
                </button>
            </div>

            <div class="reshala-deal-card p-2">
                <div class="flex-between">
                    <b class="text-xs">🔏 Легализация криминала</b>
                    <span class="tag-badge bg-tag-cyan">Чистый VIN</span>
                </div>
                <p class="sub-label my-1" style="font-size:10px;">Снимает статус «В розыске», запреты регдействий и аннулирование по 12.5.1 с проблемного автомобиля.</p>
                <button onclick="if(typeof openLegalizeCarModal === 'function') openLegalizeCarModal();" class="btn btn-dark btn-sm w-full">
                    Выбрать авто (${(legalizeCost / 1000).toFixed(0)}k ₽ + 1 🤝)
                </button>
            </div>
        `;
    },

    renderStolenPartsSubTab() {
        const catalog = [
            { id: 'stolen_turbo', name: 'Stage 3 Big Turbo (Контракт)', type: 'turbo', cost: 85000, marketCost: 180000, risk: 40, perk: '+150 л.с. (Снят с распила)' },
            { id: 'stolen_cage', name: 'Вварной каркас безопасности', type: 'cage', cost: 40000, marketCost: 85000, risk: 25, perk: 'Допуск в высшую лигу RDS GP' },
            { id: 'stolen_slicks', name: 'Комплект полусликов Toyo R888R', type: 'slicks', cost: 20000, marketCost: 45000, risk: 15, perk: 'Максимальный зацеп (-0.6с к квотеру)' }
        ];

        let html = "";
        catalog.forEach((part) => {
            const savings = part.marketCost - part.cost;
            html += `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-purple">${part.name}</b>
                    <span class="price-val text-xs color-green">${part.cost.toLocaleString()} ₽</span>
                </div>
                <div class="sub-label mb-1" style="font-size:9.5px;">${part.perk}</div>
                <div class="sub-label mb-2 color-red" style="font-size:8.5px;">⚠️ Риск проверки номеров на техкоме: <b>${part.risk}%</b></div>
                
                <div class="flex-between">
                    <span class="sub-label" style="font-size:9px;">Экономия: ~${savings.toLocaleString()} ₽</span>
                    <button onclick="AppDarknet.buyStolenPart('${part.id}', ${part.cost}, ${part.risk})" class="btn btn-purple btn-sm btn-auto">
                        Взять с серого рынка
                    </button>
                </div>
            </div>`;
        });

        return `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(192, 132, 252, 0.15), #090e18);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-purple"><i class="fa-solid fa-triangle-exclamation"></i> Серый рынок деталей</b>
                    <span class="tag-badge bg-tag-red">Риск техкома</span>
                </div>
                <p class="sub-label mb-2" style="font-size:10px;">Детали с распилов по бросовым ценам. Если инспектор на техкоме проверит номера агрегатов, машину могут задержать по 12.5.1!</p>
                ${html}
            </div>
        `;
    },

    // ────────────────────────────────────────────────────────
    // ЭКРАН 3: СКУПЩИК АВТОРАЗБОРА (FENCING)
    // ────────────────────────────────────────────────────────
    renderFencingSubTab() {
        const garage = state.garage || [];
        const problematicCars = garage.filter(c => c && (c.isStolen || c.legalDefect || c.isAnnulled1251 || c.hasStolenParts || !c.isRegisteredOnPlayer));

        let listHtml = '';
        if (problematicCars.length === 0) {
            listHtml = `
                <div class="sub-label text-center py-4" style="font-size:10px; color:#94a3b8;">
                    В гараже нет проблемных машин. Скупщик принимает только криминал, распилы, авто без учета и корчи под 12.5.1.
                </div>
            `;
        } else {
            listHtml = problematicCars.map((car) => {
                const idx = garage.indexOf(car);
                const baseVal = car.marketValue || car.purchaseCost || 100000;
                // Скупщик дает 60% от базы, но платит быстро и без проверок
                const fenceOffer = Math.round(baseVal * 0.60);

                let reason = 'Без документов';
                if (car.isStolen) reason = 'В розыске (Угон)';
                else if (car.isAnnulled1251) reason = 'Аннулирован по 12.5.1';
                else if (car.legalDefect) reason = 'Юридический запрет';
                else if (car.hasStolenParts) reason = 'Контрактный агрегат';

                return `
                    <div class="glass-card mb-2 p-2" style="background:#050811; border-left:3px solid var(--purple);">
                        <div class="flex-between mb-1">
                            <div>
                                <b class="text-xs color-purple">${car.name}</b>
                                <div class="sub-label color-red" style="font-size:8px;">⚠️ ${reason}</div>
                            </div>
                            <div class="text-right">
                                <span class="sub-label" style="font-size:7.5px;">СКУПКА:</span>
                                <b class="price-val color-green text-xs">${fenceOffer.toLocaleString()} ₽</b>
                            </div>
                        </div>
                        <button onclick="AppDarknet.sellToFenceAction(${idx}, ${fenceOffer})" class="btn btn-purple btn-sm w-full mt-1" style="font-size:9.5px; padding:5px 0;">
                            Сдать на разбор без вопросов 🔨
                        </button>
                    </div>
                `;
            }).join('');
        }

        return `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(121, 40, 202, 0.15), #090e18);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-purple"><i class="fa-solid fa-screwdriver-wrench"></i> Скупка проблемных авто</b>
                    <span class="tag-badge bg-tag-purple">Шредер / Разбор</span>
                </div>
                <p class="sub-label mb-2" style="font-size:10px;">
                    Быстрый сбыт битых, угнанных или аннулированных машин. Скупщик забирает машину на агрегаты за 60% рыночной стоимости без ДКП и проверок ГИБДД.
                </p>
                ${listHtml}
            </div>
        `;
    },

    sellToFenceAction(garageIndex, offerAmount) {
        if (!state.garage || !state.garage[garageIndex]) return;
        const car = state.garage[garageIndex];

        if (!confirm(`Сдать «${car.name}» скупщику на разбор за ${offerAmount.toLocaleString()} ₽? Автомобиль будет утилизирован безвозвратно.`)) {
            return;
        }

        state.garage.splice(garageIndex, 1);
        state.player.cash = (state.player.cash || 0) + offerAmount;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Сбыт авто скупщику: ${car.name}`, offerAmount, true);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('cash');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') {
            showToast(`«${car.name}» утилизирован. Получено +${offerAmount.toLocaleString()} ₽ наличными!`, 'success');
        }

        this.render();
    },

    // ────────────────────────────────────────────────────────
    // СИСТЕМА ОБЛАВ И ПРОВЕРОК 12.5.1
    // ────────────────────────────────────────────────────────
    checkCarRaid1251(car) {
        if (!car) return { caught: false };

        const immunity = state.player?.policeImmunityDays || 0;
        if (immunity > 0) {
            return { caught: false, reason: 'Крыша активна' };
        }

        let risk = 5; // базовый риск остановки ДПС
        const races = state.player?.consecutiveRaces || 0;
        risk += races * 4;

        if (car.tuning?.chip >= 3) risk += 15;
        if (car.tuning?.straightPipe) risk += 20;
        if (car.tuning?.weldedDiff) risk += 15;
        if (car.tuning?.rollCage) risk += 15;
        if (car.hasStolenParts) risk += (car.stolenPartsRisk || 20);
        if (car.isStolen) risk += 40;

        risk = Math.min(85, risk);

        const roll = Math.random() * 100;
        if (roll < risk) {
            return {
                caught: true,
                riskPct: risk,
                isSevere: roll < (risk * 0.4),
                reason: car.hasStolenParts ? 'Контрактные номерные детали' : (car.isStolen ? 'Ориентировка на угон' : '12.5.1 внесение изменений в конструкцию')
            };
        }

        return { caught: false, riskPct: risk };
    },

    // ────────────────────────────────────────────────────────
    // ИГРОВЫЕ ДЕЙСТВИЯ
    // ────────────────────────────────────────────────────────
    buyRoofAction(roofCost) {
        if (typeof buyReshalaService === 'function') {
            buyReshalaService('roof');
            if (state.player) state.player.consecutiveRaces = 0;
            this.render();
            return;
        }

        let cash = state.player?.cash || 0;
        if (cash < roofCost) {
            if (typeof showToast === 'function') showToast("Не хватает наличных на крышу!");
            return;
        }

        state.player.cash -= roofCost;
        state.player.policeImmunityDays = 3;
        state.player.consecutiveRaces = 0;

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof showToast === 'function') showToast("Крыша ГИБДД оформлена на 3 дня! Внимание сброшено.");
        this.render();
    },

    bribePoliceIntel() {
        let cash = state.player?.cash || 0;
        const bribeCost = 35000;
        if (cash < bribeCost) {
            if (typeof showToast === 'function') showToast("Не хватает 35,000 ₽ на взятку информатору!");
            return;
        }

        state.player.cash -= bribeCost;
        state.player.consecutiveRaces = Math.max(0, (state.player.consecutiveRaces || 0) - 3);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('cash');
        if (typeof showToast === 'function') showToast("Ориентировка уничтожена! Внимание ДПС снижено на 3.");
        this.render();
    },

    buyPack(count) { 
        if (typeof buyReshalaPack === 'function') {
            buyReshalaPack(count === 1 ? 'pack1' : 'pack5'); 
        }
        this.render(); 
    },

    buyStolenPart(partId, cost, riskPct) {
        let cash = state.player?.cash || 0;
        if (cash < cost) return (typeof showToast === 'function') && showToast("Не хватает наличных на контрактную деталь!");

        let carIdx = state.player?.selectedStreetCarIndex || 0;
        if (!state.garage || !state.garage[carIdx]) return (typeof showToast === 'function') && showToast("Сначала выберите автомобиль в гараже!");
        let car = state.garage[carIdx];

        state.player.cash -= cost;
        if (!car.tuning) car.tuning = {};

        if (partId === 'stolen_turbo') {
            car.tuning.chip = 3;
            car.power = (car.power || 100) + 150;
        } else if (partId === 'stolen_cage') {
            car.tuning.rollCage = true;
        } else if (partId === 'stolen_slicks') {
            car.tuning.dragSlicks = true;
        }

        car.hasStolenParts = true;
        car.stolenPartsRisk = (car.stolenPartsRisk || 0) + riskPct;

        if (typeof recalculateCarMarketValue === 'function') {
            recalculateCarMarketValue(car);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof openVerdictModal === 'function') {
            openVerdictModal("ДЕТАЛЬ УСТАНОВЛЕНА! 🏴‍☠️", `Контрактная деталь инсталлирована на «${car.name}».\nВнимание: на техкоме RDS есть риск проверки серийных номеров агрегатов!`, true);
        }
        this.render();
    }
};

// Экспорт для глобального использования
window.AppDarknet = AppDarknet;
window.AppRadar = {
    render(container) {
        AppDarknet.mainTab = 'radar';
        AppDarknet.render(container);
    }
};

// Регистрация во всех реестрах PhoneManager под тремя именами
if (typeof PhoneManager !== 'undefined') {
    if (typeof PhoneManager.registerApp === 'function') {
        PhoneManager.registerApp('darknet', {
            id: 'darknet',
            name: 'Даркнет',
            render: (c) => { AppDarknet.mainTab = 'darknet'; AppDarknet.render(c); }
        });
        PhoneManager.registerApp('radar', {
            id: 'radar',
            name: 'ДПС Радар',
            render: (c) => { AppDarknet.mainTab = 'radar'; AppDarknet.render(c); }
        });
        PhoneManager.registerApp('reshala', {
            id: 'reshala',
            name: 'Решала',
            render: (c) => { AppDarknet.mainTab = 'darknet'; AppDarknet.render(c); }
        });
    }

    if (PhoneManager.apps) {
        PhoneManager.apps['darknet'] = { render: (c) => { AppDarknet.mainTab = 'darknet'; AppDarknet.render(c); } };
        PhoneManager.apps['radar']   = { render: (c) => { AppDarknet.mainTab = 'radar'; AppDarknet.render(c); } };
        PhoneManager.apps['reshala'] = { render: (c) => { AppDarknet.mainTab = 'darknet'; AppDarknet.render(c); } };
    }
}

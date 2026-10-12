// ========================================================
// js/phone-business.js — БИЗНЕС-ИМПЕРИЯ ПЕРЕКУПА 2.0 (v0.7.7)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Графические шкалы доходности, кассы и сырья,
// глубокое управление цехами, штатом сотрудников и автопарком.
// ========================================================

if (typeof window.BUSINESS_UPGRADES_BRANCHES === 'undefined') {
    window.BUSINESS_UPGRADES_BRANCHES = {
        equipment: [
            { name: "Базовый набор инструмента и подъёмник", costMul: 0.35, bonusPct: 15 },
            { name: "Профессиональные стенды и диагностика", costMul: 0.75, bonusPct: 30 },
            { name: "Компьютерный 3D-стенд и роботизированные посты", costMul: 1.5, bonusPct: 45 }
        ],
        storage: [
            { name: "Складской стеллаж +50% ёмкости", costMul: 0.25 },
            { name: "Отдельный ангар-склад +135% ёмкости", costMul: 0.55 },
            { name: "Логистический терминал +270% ёмкости", costMul: 1.1 }
        ],
        marketing: [
            { name: "Локальная вывеска и листовки +10% трафика", costMul: 0.2, trafficBonusPct: 10 },
            { name: "Радио и баннеры в районе +25% трафика", costMul: 0.45, trafficBonusPct: 25 },
            { name: "Прямые контракты с автоклубами +40% трафика", costMul: 0.9, trafficBonusPct: 40 }
        ]
    };
}

if (typeof window.BUSINESS_STAFF_CATALOG === 'undefined') {
    window.BUSINESS_STAFF_CATALOG = {
        managers: [
            { id: "mgr_1", name: "Ашот (Управляющий)", salary: 2500, hireCost: 45000, reqStars: 0, incomeBonusPct: 5, perkText: "Автоматически докупает сырьё при падении ниже 30%" },
            { id: "mgr_2", name: "Марина (Бизнес-леди)", salary: 5500, hireCost: 120000, reqStars: 5, incomeBonusPct: 12, perkText: "+12% к доходу, снижает кражи персонала" },
            { id: "mgr_3", name: "Виктор Петрович (Экс-директор завода)", salary: 12000, hireCost: 320000, reqStars: 15, incomeBonusPct: 22, perkText: "+22% к доходу, автоматически расширяет склад" }
        ],
        masters: [
            { id: "mst_1", name: "Санёк (Гаражный мастер)", salary: 1800, hireCost: 35000, reqStars: 0, incomeBonusPct: 8, perkText: "+8% к выручке, редко халтурит" },
            { id: "mst_2", name: "Дядя Ваня (СТО-легенда)", salary: 4500, hireCost: 110000, reqStars: 5, incomeBonusPct: 18, perkText: "+18% к выручке, ускоряет ремонт на 25%" },
            { id: "mst_3", name: "Алексей (Инженер из Германии)", salary: 9500, hireCost: 280000, reqStars: 12, incomeBonusPct: 30, perkText: "+30% к выручке, снижает износ оборудования" }
        ],
        security: [
            { id: "sec_1", name: "Сторож Николай", salary: 1200, hireCost: 20000, reqStars: 0, incomeBonusPct: 0, perkText: "Снижает шанс ночной кражи на 40%" },
            { id: "sec_2", name: "ЧОП «Барс»", salary: 3500, hireCost: 85000, reqStars: 5, incomeBonusPct: 3, perkText: "Полная защита от краж, +3% к доходу" },
            { id: "sec_3", name: "Личная охрана (Ветеран спецназа)", salary: 8500, hireCost: 240000, reqStars: 18, incomeBonusPct: 7, perkText: "Иммунитет к проверкам, +7% к доходу" }
        ]
    };
}

if (typeof window.BUSINESS_FLEET_CATALOG === 'undefined') {
    window.BUSINESS_FLEET_CATALOG = [
        { id: "tow_truck", name: "Эвакуатор «MAN TGL»", cost: 850000, reqStars: 5, incomeBonusPct: 12, stockCapacityBonus: 25, suitableBusinesses: ["sto", "shina", "tow_truck", "razborka"], desc: "Быстрая доставка битых авто и клиентов." },
        { id: "autovoz", name: "Автовоз «Scania»", cost: 2500000, reqStars: 12, incomeBonusPct: 20, stockCapacityBonus: 50, suitableBusinesses: ["detailing", "chip_tuning", "autopodbor", "razborka"], desc: "Массовая перевозка авто из регионов." },
        { id: "van_parts", name: "Фургон запчастей «Ford Transit»", cost: 450000, reqStars: 3, incomeBonusPct: 8, stockCapacityBonus: 40, suitableBusinesses: ["shina", "sto", "razborka", "chip_tuning"], desc: "Оперативная доставка деталей." },
        { id: "mobile_wash", name: "Мобильная мойка «Газель Next»", cost: 620000, reqStars: 5, incomeBonusPct: 15, stockCapacityBonus: 15, suitableBusinesses: ["wash", "detailing"], desc: "Выездная мойка и химчистка." },
        { id: "tuning_lab", name: "Передвижная тюнинг-лаборатория", cost: 1800000, reqStars: 15, incomeBonusPct: 25, stockCapacityBonus: 20, suitableBusinesses: ["chip_tuning", "paint_shop"], desc: "Чип-тюнинг на выезде." },
        { id: "taxi_fleet", name: "Таксопарк (5 авто)", cost: 1200000, reqStars: 8, incomeBonusPct: 18, stockCapacityBonus: 10, suitableBusinesses: ["taxi"], desc: "Расширение таксопарка." },
        { id: "customs_truck", name: "Контейнеровоз «MAERSK»", cost: 8500000, reqStars: 25, incomeBonusPct: 35, stockCapacityBonus: 80, suitableBusinesses: ["customs_hub"], desc: "Прямые поставки из портов." }
    ];
}

const AppBusiness = {
    activeSubTab: 'list',
    selectedBizIndex: 0,

    render: function(container) {
        if (!container) return;

        if (!state.businesses || !Array.isArray(state.businesses) || state.businesses.length === 0) {
            if (typeof BUSINESS_DATA !== 'undefined' && Array.isArray(BUSINESS_DATA)) {
                state.businesses = JSON.parse(JSON.stringify(BUSINESS_DATA));
            } else {
                state.businesses = [];
            }
        }

        if (typeof BUSINESS_DATA !== 'undefined' && Array.isArray(BUSINESS_DATA)) {
            BUSINESS_DATA.forEach(function(baseBiz) {
                var found = false;
                for (var i = 0; i < state.businesses.length; i++) {
                    if (state.businesses[i].id === baseBiz.id) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    state.businesses.push(JSON.parse(JSON.stringify(baseBiz)));
                }
            });
        }

        this.sanitizeBusinessData();

        var sub = this.activeSubTab;
        var totalIncome = 0;
        var totalStored = 0;
        var ownedCount = 0;

        for (var i = 0; i < state.businesses.length; i++) {
            var b = state.businesses[i];
            if (b && b.level > 0) {
                ownedCount++;
                totalIncome += this.calculateBusinessIncome(b);
                totalStored += (b.stored || 0);
            }
        }

        var headerHtml = 
            '<div class="phone-app-header">' +
                '<button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>' +
                '<div class="phone-app-title"><i class="fa-solid fa-briefcase color-green mr-1"></i> Бизнес-Сеть</div>' +
                '<button onclick="AppBusiness.collectAllCashAction()" class="btn btn-green btn-auto btn-sm"' + (totalStored <= 0 ? ' disabled' : '') + '>' +
                    'Касса (' + (totalStored / 1000).toFixed(0) + 'k)' +
                '</button>' +
            '</div>';

        var summaryHtml = 
            '<div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.15), rgba(9, 14, 24, 0.98)); border-color: rgba(0, 230, 118, 0.35);">' +
                '<div class="flex-between mb-1">' +
                    '<div>' +
                        '<span class="sub-label" style="font-size:9px;">Пассивный доход сети:</span>' +
                        '<div class="price-val color-green" style="font-size:16px;">+' + totalIncome.toLocaleString() + ' ₽/день</div>' +
                    '</div>' +
                    '<span class="tag-badge bg-tag-green">Точек: ' + ownedCount + ' из ' + state.businesses.length + '</span>' +
                '</div>' +
            '</div>';

        var navHtml = 
            '<div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 4px;">' +
                '<button onclick="AppBusiness.switchSubTab(\'list\')" class="btn ' + (sub === 'list' ? 'btn-green' : 'btn-dark') + ' btn-sm" style="font-size:9px; padding:6px 2px;">Точки</button>' +
                '<button onclick="AppBusiness.switchSubTab(\'detail\')" class="btn ' + (sub === 'detail' ? 'btn-green' : 'btn-dark') + ' btn-sm" style="font-size:9px; padding:6px 2px;">Цех</button>' +
                '<button onclick="AppBusiness.switchSubTab(\'staff\')" class="btn ' + (sub === 'staff' ? 'btn-green' : 'btn-dark') + ' btn-sm" style="font-size:9px; padding:6px 2px;">Штат</button>' +
                '<button onclick="AppBusiness.switchSubTab(\'fleet\')" class="btn ' + (sub === 'fleet' ? 'btn-green' : 'btn-dark') + ' btn-sm" style="font-size:9px; padding:6px 2px;">Автопарк</button>' +
            '</div>';

        var contentHtml = '';
        if (sub === 'list') contentHtml = this.renderBusinessesListHtml();
        else if (sub === 'detail') contentHtml = this.renderBusinessDetailHtml();
        else if (sub === 'staff') contentHtml = this.renderStaffManagementHtml();
        else if (sub === 'fleet') contentHtml = this.renderFleetManagementHtml();

        container.innerHTML = headerHtml + '<div class="phone-app-body">' + summaryHtml + navHtml + contentHtml + '</div>';
    },

    sanitizeBusinessData: function() {
        if (!state.businesses) return;
        for (var i = 0; i < state.businesses.length; i++) {
            var b = state.businesses[i];
            if (!b.staff) b.staff = { manager: null, master: null, security: null };
            if (!Array.isArray(b.fleet)) b.fleet = [];
            if (!b.upgrades) b.upgrades = { equipment: 0, storage: 0, marketing: 0 };
            if (b.maxStock === undefined || b.maxStock <= 0) b.maxStock = 100;
            if (b.stock === undefined) b.stock = 100;
            if (b.stored === undefined) b.stored = 0;
        }
    },

    switchSubTab: function(tab) {
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.activeSubTab = tab;
        this.render(document.getElementById('phoneAppContainer'));
    },

    selectBusinessForDetail: function(idx) {
        this.selectedBizIndex = idx;
        this.switchSubTab('detail');
    },

    calculateBusinessIncome: function(biz) {
        if (!biz || biz.level <= 0) return 0;
        var base = (biz.income || 1000) * biz.level;
        var bonusMul = this.calculateBusinessMultiplier(biz);
        return Math.round(base * bonusMul);
    },

    calculateBusinessMultiplier: function(biz) {
        if (!biz) return 1.0;
        var bonusMul = 1.0;

        if (biz.staff && typeof BUSINESS_STAFF_CATALOG !== 'undefined') {
            if (biz.staff.manager && Array.isArray(BUSINESS_STAFF_CATALOG.managers)) {
                var m = BUSINESS_STAFF_CATALOG.managers.find(function(it) { return it.id === biz.staff.manager; });
                if (m && m.incomeBonusPct) bonusMul += (m.incomeBonusPct / 100);
            }
            if (biz.staff.master && Array.isArray(BUSINESS_STAFF_CATALOG.masters)) {
                var mst = BUSINESS_STAFF_CATALOG.masters.find(function(it) { return it.id === biz.staff.master; });
                if (mst && mst.incomeBonusPct) bonusMul += (mst.incomeBonusPct / 100);
            }
            if (biz.staff.security && Array.isArray(BUSINESS_STAFF_CATALOG.security)) {
                var s = BUSINESS_STAFF_CATALOG.security.find(function(it) { return it.id === biz.staff.security; });
                if (s && s.incomeBonusPct) bonusMul += (s.incomeBonusPct / 100);
            }
        }

        if (Array.isArray(biz.fleet) && typeof BUSINESS_FLEET_CATALOG !== 'undefined' && Array.isArray(BUSINESS_FLEET_CATALOG)) {
            biz.fleet.forEach(function(fleetId) {
                var fl = BUSINESS_FLEET_CATALOG.find(function(it) { return it.id === fleetId; });
                if (fl && fl.incomeBonusPct) bonusMul += (fl.incomeBonusPct / 100);
            });
        }

        if (biz.upgrades && typeof BUSINESS_UPGRADES_BRANCHES !== 'undefined') {
            if (biz.upgrades.equipment && Array.isArray(BUSINESS_UPGRADES_BRANCHES.equipment)) {
                var upgE = BUSINESS_UPGRADES_BRANCHES.equipment[biz.upgrades.equipment - 1];
                if (upgE && upgE.bonusPct) bonusMul += (upgE.bonusPct / 100);
            }
            if (biz.upgrades.marketing && Array.isArray(BUSINESS_UPGRADES_BRANCHES.marketing)) {
                var upgM = BUSINESS_UPGRADES_BRANCHES.marketing[biz.upgrades.marketing - 1];
                if (upgM && upgM.trafficBonusPct) bonusMul += (upgM.trafficBonusPct / 100);
            }
        }

        return bonusMul;
    },

    // ========================================================
    // 1. ВКЛАДКА «ТОЧКИ»: ГРАФИЧЕСКИЕ ШКАЛЫ
    // ========================================================
    renderBusinessesListHtml: function() {
        var lvl = state.player ? (state.player.level || 1) : 1;
        var html = "";

        var defaultIcons = {
            wash: 'fa-soap', shina: 'fa-compact-disc', sto: 'fa-screwdriver-wrench',
            tow_truck: 'fa-truck-pickup', paint_shop: 'fa-paint-roller', detailing: 'fa-spray-can-sparkles',
            chip_tuning: 'fa-microchip', razborka: 'fa-car-burst', autopodbor: 'fa-magnifying-glass-chart',
            taxi: 'fa-taxi', customs_hub: 'fa-ship'
        };

        for (var idx = 0; idx < state.businesses.length; idx++) {
            var biz = state.businesses[idx];
            if (!biz) continue;

            var isLocked = lvl < (biz.minLevel || 1);
            var isOwned = biz.level > 0;
            var cost = isOwned ? Math.round(biz.cost * (biz.level + 1)) : biz.cost;
            var calculatedIncome = isOwned ? this.calculateBusinessIncome(biz) : (biz.income || 1000);
            var maxStk = biz.maxStock || 100;
            var curStk = biz.stock !== undefined ? biz.stock : 100;
            var curStored = biz.stored || 0;

            var stockPct = Math.min(100, Math.round((curStk / maxStk) * 100));
            var stockBarClass = stockPct > 40 ? 'fill-biz-stock' : (stockPct > 15 ? 'fill-condition-mid' : 'risk-high');
            var stockColor = stockPct > 40 ? 'color-green' : (stockPct > 15 ? 'color-amber' : 'color-red');

            var multiplier = this.calculateBusinessMultiplier(biz);
            var effPct = Math.min(100, Math.round((multiplier / 2.5) * 100));
            var bonusPctText = Math.round((multiplier - 1) * 100);

            var safeCapacity = Math.max(50000, calculatedIncome * 3);
            var cashFillPct = Math.min(100, Math.round((curStored / safeCapacity) * 100));

            var actionBlock = "";
            if (isLocked) {
                actionBlock = '<button class="btn btn-dark btn-sm w-full opacity-50" disabled>С ' + biz.minLevel + ' уровня авторитета</button>';
            } else if (!isOwned) {
                actionBlock = 
                    '<button onclick="AppBusiness.buyNewBusinessAction(' + idx + ')" class="btn btn-cyan btn-sm w-full">' +
                        'Купить объект (' + (cost / 1000).toFixed(0) + 'k ₽ + ' + (biz.reqStars || 0) + ' ⭐)' +
                    '</button>';
            } else {
                actionBlock = 
                    '<div class="grid-2 mb-1">' +
                        '<button onclick="AppBusiness.selectBusinessForDetail(' + idx + ')" class="btn btn-dark btn-sm">' +
                            '⚙️ Управление цехом' +
                        '</button>' +
                        '<button onclick="AppBusiness.collectCashSingle(' + idx + ')" class="btn btn-green btn-sm"' + (curStored <= 0 ? ' disabled' : '') + '>' +
                            'Снять (' + curStored.toLocaleString() + ' ₽)' +
                        '</button>' +
                    '</div>' +
                    '<div class="grid-2">' +
                        '<button onclick="AppBusiness.restockSingle(' + idx + ')" class="btn btn-amber btn-sm"' + (curStk >= maxStk ? ' disabled' : '') + '>' +
                            'Сырьё (15k)' +
                        '</button>' +
                        '<button onclick="AppBusiness.upgradeLevelSingle(' + idx + ')" class="btn btn-cyan btn-sm">' +
                            '+Уровень (' + (cost / 1000).toFixed(0) + 'k)' +
                        '</button>' +
                    '</div>';
            }

            var staffBadge = "";
            if (isOwned && biz.staff && biz.staff.manager) {
                staffBadge += '<span class="tag-badge bg-tag-green ml-1" style="font-size:7.5px;">МЕНЕДЖЕР ✓</span>';
            }
            if (isOwned && Array.isArray(biz.fleet) && biz.fleet.length > 0) {
                staffBadge += '<span class="tag-badge bg-tag-cyan ml-1" style="font-size:7.5px;">ФЛОТ: ' + biz.fleet.length + '</span>';
            }

            var iconClass = defaultIcons[biz.id] || 'fa-briefcase';

            html += 
                '<div class="glass-card mb-3 p-2">' +
                    '<div class="flex-between mb-1">' +
                        '<div>' +
                            '<b class="text-xs color-green"><i class="fa-solid ' + iconClass + ' mr-1"></i> ' + biz.name + '</b>' +
                            staffBadge +
                        '</div>' +
                        '<span class="tag-badge ' + (isOwned ? 'bg-tag-green' : 'bg-tag-amber') + '">' +
                            (isOwned ? 'Ур. ' + biz.level : 'Доступно') +
                        '</span>' +
                    '</div>' +

                    '<div class="sub-label mb-2" style="font-size:9.5px; line-height:1.35;">' + (biz.desc || '') + '</div>' +

                    (isOwned ? (
                        '<div class="car-telemetry-panel mb-2" style="background:#090e18; border-radius:10px; padding:8px; border:1px solid rgba(255,255,255,0.06);">' +
                            '<!-- ШКАЛА 1: ДОХОДНОСТЬ И ЭФФЕКТИВНОСТЬ -->' +
                            '<div class="telemetry-row mb-1">' +
                                '<div class="telemetry-label" style="font-size:9px;"><i class="fa-solid fa-bolt color-green"></i> Доходность:</div>' +
                                '<div class="telemetry-bar-bg" style="height:7px;">' +
                                    '<div class="telemetry-bar-fill" style="width:' + effPct + '%; background: linear-gradient(90deg, #10b981, #00e676); box-shadow: 0 0 8px rgba(0,230,118,0.4);"></div>' +
                                '</div>' +
                                '<div class="telemetry-val color-green" style="font-size:10px; font-weight:900;">+' + calculatedIncome.toLocaleString() + ' ₽/д ' + (bonusPctText > 0 ? '(+' + bonusPctText + '%)' : '') + '</div>' +
                            '</div>' +

                            '<!-- ШКАЛА 2: НАКОПЛЕНИЕ В КАССЕ -->' +
                            '<div class="telemetry-row mb-1">' +
                                '<div class="telemetry-label" style="font-size:9px;"><i class="fa-solid fa-vault color-cyan"></i> В кассе:</div>' +
                                '<div class="telemetry-bar-bg" style="height:7px;">' +
                                    '<div class="telemetry-bar-fill" style="width:' + cashFillPct + '%; background: linear-gradient(90deg, #0284c7, #00f2fe); box-shadow: 0 0 8px var(--cyan-glow);"></div>' +
                                '</div>' +
                                '<div class="telemetry-val color-cyan" style="font-size:10px; font-weight:900;">' + curStored.toLocaleString() + ' ₽</div>' +
                            '</div>' +

                            '<!-- ШКАЛА 3: ЗАПАС СЫРЬЯ НА СКЛАДЕ -->' +
                            '<div class="telemetry-row">' +
                                '<div class="telemetry-label" style="font-size:9px;"><i class="fa-solid fa-boxes-stacked ' + stockColor + '"></i> Склад сырья:</div>' +
                                '<div class="telemetry-bar-bg" style="height:7px;">' +
                                    '<div class="telemetry-bar-fill ' + stockBarClass + '" style="width:' + stockPct + '%;"></div>' +
                                '</div>' +
                                '<div class="telemetry-val ' + stockColor + '" style="font-size:10px; font-weight:900;">' + curStk + ' / ' + maxStk + '%</div>' +
                            '</div>' +
                        '</div>'
                    ) : (
                        '<div class="flex-between p-2 mb-2" style="background:#090e18; border-radius:8px;">' +
                            '<span class="sub-label text-xs">Базовый доход:</span>' +
                            '<b class="color-green text-xs">+' + calculatedIncome.toLocaleString() + ' ₽/день</b>' +
                        '</div>'
                    )) +

                    '<div class="sub-label mb-2" style="font-size:9px; color:#cbd5e1;">⭐ Перк: <b>' + (biz.perk || 'Стандарт') + '</b></div>' +

                    actionBlock +
                '</div>';
        }

        return html;
    },

    // ========================================================
    // 2. ВКЛАДКА «ЦЕХ»: МОДЕРНИЗАЦИЯ
    // ========================================================
    renderBusinessDetailHtml: function() {
        var biz = state.businesses[this.selectedBizIndex];
        if (!biz || biz.level <= 0) {
            return '<div class="glass-card text-center sub-label py-6">' +
                '<div>Выберите выкупленное предприятие на вкладке «Точки».</div>' +
                '<button onclick="AppBusiness.switchSubTab(\'list\')" class="btn btn-cyan btn-sm mt-2">К списку точек</button>' +
            '</div>';
        }

        var eqLvl = biz.upgrades ? (biz.upgrades.equipment || 0) : 0;
        var stLvl = biz.upgrades ? (biz.upgrades.storage || 0) : 0;
        var mkLvl = biz.upgrades ? (biz.upgrades.marketing || 0) : 0;

        var branches = (typeof BUSINESS_UPGRADES_BRANCHES !== 'undefined') ? BUSINESS_UPGRADES_BRANCHES : { equipment: [], storage: [], marketing: [] };

        var nextEq = branches.equipment ? branches.equipment[eqLvl] : null;
        var nextSt = branches.storage ? branches.storage[stLvl] : null;
        var nextMk = branches.marketing ? branches.marketing[mkLvl] : null;

        var baseCost = biz.cost * (biz.level || 1);
        var eqCost = nextEq ? Math.round(baseCost * nextEq.costMul) : 0;
        var stCost = nextSt ? Math.round(baseCost * nextSt.costMul) : 0;
        var mkCost = nextMk ? Math.round(baseCost * nextMk.costMul) : 0;

        var maxStk = biz.maxStock || 100;
        var curStk = biz.stock !== undefined ? biz.stock : 100;
        var curStored = biz.stored || 0;

        var stockPct = Math.min(100, Math.round((curStk / maxStk) * 100));
        var stockColor = stockPct > 40 ? 'color-green' : (stockPct > 15 ? 'color-amber' : 'color-red');
        var stockBarClass = stockPct > 40 ? 'fill-biz-stock' : (stockPct > 15 ? 'fill-condition-mid' : 'risk-high');

        var calcIncome = this.calculateBusinessIncome(biz);
        var safeCapacity = Math.max(50000, calcIncome * 3);
        var cashPct = Math.min(100, Math.round((curStored / safeCapacity) * 100));

        return '<div class="glass-card mb-2 p-2" style="border-left: 3px solid var(--green);">' +
                '<div class="flex-between mb-1">' +
                    '<b class="text-xs color-green">' + biz.name + ' (Ур. ' + biz.level + ')</b>' +
                    '<span class="tag-badge bg-tag-green">ЦЕХ АКТИВЕН</span>' +
                '</div>' +
                '<div class="sub-label mb-2" style="font-size:9.5px;">' + (biz.desc || biz.perk || 'Промышленный объект сети.') + '</div>' +
                
                '<div class="grid-2 my-2" style="gap:6px;">' +
                    '<div class="p-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">' +
                        '<div class="flex-between text-xs mb-1">' +
                            '<span class="sub-label"><i class="fa-solid fa-vault color-cyan"></i> Касса:</span>' +
                            '<b class="color-green">' + curStored.toLocaleString() + ' ₽</b>' +
                        '</div>' +
                        '<div class="telemetry-bar-bg" style="height:6px;">' +
                            '<div class="telemetry-bar-fill" style="width:' + cashPct + '%; background: linear-gradient(90deg, #0284c7, #00f2fe);"></div>' +
                        '</div>' +
                    '</div>' +

                    '<div class="p-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">' +
                        '<div class="flex-between text-xs mb-1">' +
                            '<span class="sub-label"><i class="fa-solid fa-boxes-stacked ' + stockColor + '"></i> Склад:</span>' +
                            '<b class="' + stockColor + '">' + curStk + ' / ' + maxStk + '%</b>' +
                        '</div>' +
                        '<div class="telemetry-bar-bg" style="height:6px;">' +
                            '<div class="telemetry-bar-fill ' + stockBarClass + '" style="width:' + stockPct + '%;"></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<div class="glass-card mb-2 p-2">' +
                '<div class="flex-between mb-1">' +
                    '<div>' +
                        '<b class="text-xs color-cyan"><i class="fa-solid fa-screwdriver-wrench"></i> Оснащение цеха</b>' +
                        '<div class="sub-label" style="font-size:9px;">Уровень апгрейда: <b>' + eqLvl + '/3</b></div>' +
                    '</div>' +
                    (nextEq ? '<span class="price-val text-xs color-green">' + eqCost.toLocaleString() + ' ₽</span>' : '<span class="tag-badge bg-tag-green">МАКСИМУМ</span>') +
                '</div>' +
                '<div class="sub-label mb-2" style="font-size:9.5px;">' + (nextEq ? nextEq.name : 'Установлены топовые посты и компьютерные 3D-стенды (+45% к выручке)') + '</div>' +
                '<button onclick="AppBusiness.upgradeBranchAction(\'equipment\', ' + eqCost + ')" class="btn btn-cyan btn-sm w-full"' + (!nextEq ? ' disabled' : '') + '>' +
                    (nextEq ? 'Прокачать оснащение (' + (eqCost / 1000).toFixed(0) + 'k ₽)' : 'Оборудование максимального класса ✓') +
                '</button>' +
            '</div>' +

            '<div class="glass-card mb-2 p-2">' +
                '<div class="flex-between mb-1">' +
                    '<div>' +
                        '<b class="text-xs color-amber"><i class="fa-solid fa-boxes-stacked"></i> Склад и логистика</b>' +
                        '<div class="sub-label" style="font-size:9px;">Уровень склада: <b>' + stLvl + '/3</b></div>' +
                    '</div>' +
                    (nextSt ? '<span class="price-val text-xs color-green">' + stCost.toLocaleString() + ' ₽</span>' : '<span class="tag-badge bg-tag-green">МАКСИМУМ</span>') +
                '</div>' +
                '<div class="sub-label mb-2" style="font-size:9.5px;">' + (nextSt ? nextSt.name : 'Складской терминал вмещает до 500% сырья без простоев') + '</div>' +
                '<button onclick="AppBusiness.upgradeBranchAction(\'storage\', ' + stCost + ')" class="btn btn-amber btn-sm w-full"' + (!nextSt ? ' disabled' : '') + '>' +
                    (nextSt ? 'Расширить склад (' + (stCost / 1000).toFixed(0) + 'k ₽)' : 'Склады максимальной ёмкости ✓') +
                '</button>' +
            '</div>' +

            '<div class="glass-card mb-2 p-2">' +
                '<div class="flex-between mb-1">' +
                    '<div>' +
                        '<b class="text-xs color-purple"><i class="fa-solid fa-bullhorn"></i> Маркетинг и вывеска</b>' +
                        '<div class="sub-label" style="font-size:9px;">Уровень рекламы: <b>' + mkLvl + '/3</b></div>' +
                    '</div>' +
                    (nextMk ? '<span class="price-val text-xs color-green">' + mkCost.toLocaleString() + ' ₽</span>' : '<span class="tag-badge bg-tag-green">МАКСИМУМ</span>') +
                '</div>' +
                '<div class="sub-label mb-2" style="font-size:9.5px;">' + (nextMk ? nextMk.name : 'Прямые контракты с автоклубами города (+40% клиентов)') + '</div>' +
                '<button onclick="AppBusiness.upgradeBranchAction(\'marketing\', ' + mkCost + ')" class="btn btn-purple btn-sm w-full"' + (!nextMk ? ' disabled' : '') + '>' +
                    (nextMk ? 'Запустить кампанию (' + (mkCost / 1000).toFixed(0) + 'k ₽)' : 'Максимальный охват трафика ✓') +
                '</button>' +
            '</div>';
    },

    upgradeBranchAction: function(branchName, cost) {
        var biz = state.businesses[this.selectedBizIndex];
        if (!biz) return;
        var cash = state.player ? (state.player.cash || 0) : 0;
        if (cash < cost) return showToast("Не хватает денег на апгрейд филиала!");

        state.player.cash -= cost;
        if (!biz.upgrades) biz.upgrades = { equipment: 0, storage: 0, marketing: 0 };
        biz.upgrades[branchName] = (biz.upgrades[branchName] || 0) + 1;

        if (branchName === 'storage') {
            biz.maxStock = 100 + (biz.upgrades.storage * 135);
        }

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Филиал успешно модернизирован!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    renderStaffManagementHtml: function() {
        var biz = state.businesses[this.selectedBizIndex];
        if (!biz || biz.level <= 0) {
            return '<div class="glass-card text-center sub-label py-6">' +
                '<div>Сначала выберите выкупленное предприятие для управления штатом.</div>' +
                '<button onclick="AppBusiness.switchSubTab(\'list\')" class="btn btn-cyan btn-sm mt-2">К списку точек</button>' +
            '</div>';
        }

        var staffCat = (typeof BUSINESS_STAFF_CATALOG !== 'undefined') ? BUSINESS_STAFF_CATALOG : { managers: [], masters: [], security: [] };

        var curMgr = null, curMst = null, curSec = null;
        if (biz.staff) {
            if (biz.staff.manager && Array.isArray(staffCat.managers)) {
                curMgr = staffCat.managers.find(function(m) { return m.id === biz.staff.manager; });
            }
            if (biz.staff.master && Array.isArray(staffCat.masters)) {
                curMst = staffCat.masters.find(function(m) { return m.id === biz.staff.master; });
            }
            if (biz.staff.security && Array.isArray(staffCat.security)) {
                curSec = staffCat.security.find(function(s) { return s.id === biz.staff.security; });
            }
        }

        var mgrListHtml = '';
        if (Array.isArray(staffCat.managers)) {
            staffCat.managers.forEach(function(m) {
                mgrListHtml += '<div class="p-1 flex-between" style="background:#090e18; border-radius:6px; font-size:9.5px;">' +
                    '<div><b>' + m.name + '</b> (' + m.salary + ' ₽/д)<div class="sub-label" style="font-size:8px;">' + m.perkText + '</div></div>' +
                    '<button onclick="AppBusiness.hireStaffAction(\'manager\', \'' + m.id + '\', ' + m.hireCost + ', ' + (m.reqStars || 0) + ')" class="btn btn-cyan btn-auto btn-sm" style="font-size:8.5px; padding:3px 8px;">Нанять (' + (m.hireCost/1000).toFixed(0) + 'k)</button>' +
                '</div>';
            });
        }

        var mstListHtml = '';
        if (Array.isArray(staffCat.masters)) {
            staffCat.masters.forEach(function(m) {
                mstListHtml += '<div class="p-1 flex-between" style="background:#090e18; border-radius:6px; font-size:9.5px;">' +
                    '<div><b>' + m.name + '</b> (' + m.salary + ' ₽/д)<div class="sub-label" style="font-size:8px;">' + m.perkText + '</div></div>' +
                    '<button onclick="AppBusiness.hireStaffAction(\'master\', \'' + m.id + '\', ' + m.hireCost + ', ' + (m.reqStars || 0) + ')" class="btn btn-amber btn-auto btn-sm" style="font-size:8.5px; padding:3px 8px;">Нанять (' + (m.hireCost/1000).toFixed(0) + 'k)</button>' +
                '</div>';
            });
        }

        var secListHtml = '';
        if (Array.isArray(staffCat.security)) {
            staffCat.security.forEach(function(s) {
                secListHtml += '<div class="p-1 flex-between" style="background:#090e18; border-radius:6px; font-size:9.5px;">' +
                    '<div><b>' + s.name + '</b> (' + s.salary + ' ₽/д)<div class="sub-label" style="font-size:8px;">' + s.perkText + '</div></div>' +
                    '<button onclick="AppBusiness.hireStaffAction(\'security\', \'' + s.id + '\', ' + s.hireCost + ', ' + (s.reqStars || 0) + ')" class="btn btn-purple btn-auto btn-sm" style="font-size:8.5px; padding:3px 8px;">Нанять (' + (s.hireCost/1000).toFixed(0) + 'k)</button>' +
                '</div>';
            });
        }

        return '<div class="glass-card mb-2 p-2">' +
                '<b class="text-xs color-green block mb-1">Штат филиала: ' + biz.name + '</b>' +
                '<div class="sub-label mb-2" style="font-size:9.5px;">Сотрудники работают в филиале, дают бонусы и получают зарплату в 00:00.</div>' +
            '</div>' +
            '<div class="glass-card mb-2 p-2">' +
                '<div class="flex-between mb-1">' +
                    '<b class="text-xs color-cyan"><i class="fa-solid fa-user-tie"></i> 1. Управляющий филиала</b>' +
                    (curMgr ? '<button onclick="AppBusiness.fireStaffAction(\'manager\')" class="btn btn-danger btn-auto btn-sm" style="font-size:8px; padding:2px 6px;">Уволить</button>' : '') +
                '</div>' +
                (curMgr ? (
                    '<div class="p-2 mb-1" style="background:#090e18; border-radius:8px;">' +
                        '<div class="flex-between text-xs"><b>' + curMgr.name + '</b> <span class="color-amber">' + curMgr.salary.toLocaleString() + ' ₽/день</span></div>' +
                        '<div class="sub-label mt-1" style="font-size:9px;">' + curMgr.perkText + '</div>' +
                    '</div>'
                ) : (
                    '<div class="sub-label mb-2" style="font-size:9.5px;">Вакансия открыта. Наймите менеджера для автоматической закупки сырья.</div>' +
                    '<div class="space-y-1">' + mgrListHtml + '</div>'
                )) +
            '</div>' +
            '<div class="glass-card mb-2 p-2">' +
                '<div class="flex-between mb-1">' +
                    '<b class="text-xs color-amber"><i class="fa-solid fa-wrench"></i> 2. Старший мастер цеха</b>' +
                    (curMst ? '<button onclick="AppBusiness.fireStaffAction(\'master\')" class="btn btn-danger btn-auto btn-sm" style="font-size:8px; padding:2px 6px;">Уволить</button>' : '') +
                '</div>' +
                (curMst ? (
                    '<div class="p-2 mb-1" style="background:#090e18; border-radius:8px;">' +
                        '<div class="flex-between text-xs"><b>' + curMst.name + '</b> <span class="color-amber">' + curMst.salary.toLocaleString() + ' ₽/день</span></div>' +
                        '<div class="sub-label mt-1" style="font-size:9px;">' + curMst.perkText + '</div>' +
                    '</div>'
                ) : (
                    '<div class="sub-label mb-2" style="font-size:9.5px;">Наймите профессионала для резкого роста ежедневной выручки точки.</div>' +
                    '<div class="space-y-1">' + mstListHtml + '</div>'
                )) +
            '</div>' +
            '<div class="glass-card mb-2 p-2">' +
                '<div class="flex-between mb-1">' +
                    '<b class="text-xs color-purple"><i class="fa-solid fa-shield-halved"></i> 3. Охрана и безопасность</b>' +
                    (curSec ? '<button onclick="AppBusiness.fireStaffAction(\'security\')" class="btn btn-danger btn-auto btn-sm" style="font-size:8px; padding:2px 6px;">Уволить</button>' : '') +
                '</div>' +
                (curSec ? (
                    '<div class="p-2 mb-1" style="background:#090e18; border-radius:8px;">' +
                        '<div class="flex-between text-xs"><b>' + curSec.name + '</b> <span class="color-amber">' + curSec.salary.toLocaleString() + ' ₽/день</span></div>' +
                        '<div class="sub-label mt-1" style="font-size:9px;">' + curSec.perkText + '</div>' +
                    '</div>'
                ) : (
                    '<div class="sub-label mb-2" style="font-size:9.5px;">Защита от ночных проверок, кражи инструментов и визитов полиции.</div>' +
                    '<div class="space-y-1">' + secListHtml + '</div>'
                )) +
            '</div>';
    },

    hireStaffAction: function(role, staffId, cost, reqStars) {
        var biz = state.businesses[this.selectedBizIndex];
        if (!biz) return;
        reqStars = reqStars || 0;

        var cash = state.player ? (state.player.cash || 0) : 0;
        var stars = state.player ? (state.player.stars || 0) : 0;

        if (cash < cost) return showToast("Не хватает денег на найм!");
        if (stars < reqStars) return showToast("Нужно " + reqStars + " Stars ⭐!");

        state.player.cash -= cost;
        state.player.stars -= reqStars;
        if (!biz.staff) biz.staff = { manager: null, master: null, security: null };
        biz.staff[role] = staffId;

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Специалист принят в штат предприятия!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    fireStaffAction: function(role) {
        var biz = state.businesses[this.selectedBizIndex];
        if (!biz || !biz.staff) return;
        biz.staff[role] = null;
        saveState();
        if (typeof playSound === 'function') playSound('tick');
        showToast("Сотрудник уволен.");
        this.render(document.getElementById('phoneAppContainer'));
    },

    renderFleetManagementHtml: function() {
        var biz = state.businesses[this.selectedBizIndex];
        if (!biz || biz.level <= 0) {
            return '<div class="glass-card text-center sub-label py-6">' +
                '<div>Выберите предприятие для закрепления спецтранспорта.</div>' +
                '<button onclick="AppBusiness.switchSubTab(\'list\')" class="btn btn-cyan btn-sm mt-2">К списку точек</button>' +
            '</div>';
        }

        var fleetCat = (typeof BUSINESS_FLEET_CATALOG !== 'undefined' && Array.isArray(BUSINESS_FLEET_CATALOG)) ? BUSINESS_FLEET_CATALOG : [];
        var curFleetIds = Array.isArray(biz.fleet) ? biz.fleet : [];

        var cardsHtml = '';
        fleetCat.forEach(function(fl) {
            var isOwned = curFleetIds.indexOf(fl.id) !== -1;
            var isSuitable = Array.isArray(fl.suitableBusinesses) && fl.suitableBusinesses.indexOf(biz.id) !== -1;
            var starsTxt = fl.reqStars ? ' + ' + fl.reqStars + ' ⭐' : '';

            cardsHtml += '<div class="glass-card p-2 mb-2 ' + (isOwned ? 'personal-car-card' : '') + '">' +
                '<div class="flex-between mb-1">' +
                    '<b class="text-xs ' + (isOwned ? 'color-green' : 'color-cyan') + '">' + fl.name + '</b>' +
                    '<span class="tag-badge ' + (isOwned ? 'bg-tag-green' : (isSuitable ? 'bg-tag-cyan' : 'bg-tag-dark')) + '">' +
                        (isOwned ? 'В АВТОПАРКЕ ✓' : (isSuitable ? 'ПОДХОДИТ' : 'ДРУГОЙ ЦЕХ')) +
                    '</span>' +
                '</div>' +
                '<div class="sub-label mb-2" style="font-size:9.5px; line-height:1.35;">' + fl.desc + '</div>' +
                '<div class="flex-between text-xs mb-2 p-1" style="background:#090e18; border-radius:6px;">' +
                    '<span>Бонус к кассе: <b class="color-green">+' + fl.incomeBonusPct + '%</b></span>' +
                    '<span>Склад: <b class="color-amber">+' + fl.stockCapacityBonus + '%</b></span>' +
                '</div>' +
                '<button onclick="AppBusiness.buyFleetAction(\'' + fl.id + '\', ' + fl.cost + ', ' + (fl.reqStars || 0) + ')" class="btn ' + (isOwned ? 'btn-dark' : 'btn-cyan') + ' btn-sm w-full"' + (isOwned || !isSuitable ? ' disabled' : '') + '>' +
                    (isOwned ? 'Машина закреплена за цехом ✓' : (isSuitable ? 'Купить в автопарк (' + (fl.cost/1000).toFixed(0) + 'k ₽' + starsTxt + ')' : 'Не подходит под профиль этого цеха')) +
                '</button>' +
            '</div>';
        });

        return '<div class="glass-card mb-2 p-2">' +
                '<b class="text-xs color-green block mb-1">Спецтехника точки: ' + biz.name + '</b>' +
                '<div class="sub-label mb-2" style="font-size:9.5px;">Коммерческий транспорт увеличивает емкость складов и оборот выручки.</div>' +
            '</div>' +
            '<div class="space-y-2">' + cardsHtml + '</div>';
    },

    buyFleetAction: function(fleetId, cost, reqStars) {
        var biz = state.businesses[this.selectedBizIndex];
        if (!biz) return;
        reqStars = reqStars || 0;

        var cash = state.player ? (state.player.cash || 0) : 0;
        var stars = state.player ? (state.player.stars || 0) : 0;

        if (cash < cost) return showToast("Не хватает денег на спецтехнику!");
        if (stars < reqStars) return showToast("Нужно " + reqStars + " Stars ⭐!");

        state.player.cash -= cost;
        state.player.stars -= reqStars;
        if (!Array.isArray(biz.fleet)) biz.fleet = [];
        biz.fleet.push(fleetId);

        if (typeof BUSINESS_FLEET_CATALOG !== 'undefined' && Array.isArray(BUSINESS_FLEET_CATALOG)) {
            var fl = BUSINESS_FLEET_CATALOG.find(function(it) { return it.id === fleetId; });
            if (fl) {
                biz.maxStock = (biz.maxStock || 100) + fl.stockCapacityBonus;
            }
        }

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Спецтранспорт закреплен за предприятием!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    buyNewBusinessAction: function(idx) {
        var biz = state.businesses[idx];
        if (!biz) return;
        var cost = biz.cost;
        var reqStars = biz.reqStars || 0;
        var cash = state.player ? (state.player.cash || 0) : 0;
        var stars = state.player ? (state.player.stars || 0) : 0;

        if (cash < cost) return showToast("Не хватает денег на покупку предприятия!");
        if (stars < reqStars) return showToast("Нужно " + reqStars + " Stars ⭐!");

        state.player.cash -= cost;
        state.player.stars -= reqStars;
        biz.level = 1;
        biz.stock = 100;
        biz.stored = 0;

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Вы стали владельцем «" + biz.name + "»!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    upgradeLevelSingle: function(idx) {
        var biz = state.businesses[idx];
        if (!biz || biz.level <= 0) return;
        var cost = Math.round(biz.cost * (biz.level + 1));
        var cash = state.player ? (state.player.cash || 0) : 0;

        if (cash < cost) return showToast("Не хватает денег на повышение уровня!");

        state.player.cash -= cost;
        biz.level += 1;
        biz.stock = Math.min(biz.maxStock || 100, (biz.stock || 0) + 25);

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("«" + biz.name + "» повышен до " + biz.level + " уровня!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    restockSingle: function(idx) {
        var biz = state.businesses[idx];
        if (!biz) return;
        var cost = 15000;
        var cash = state.player ? (state.player.cash || 0) : 0;

        if (cash < cost) return showToast("Нужно 15,000 ₽ на партию сырья!");

        state.player.cash -= cost;
        biz.stock = biz.maxStock || 100;

        saveState();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        showToast("Склад сырья полностью заполнен!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    collectCashSingle: function(idx) {
        var biz = state.businesses[idx];
        if (!biz || !biz.stored || biz.stored <= 0) return;

        var payout = biz.stored;
        state.player.cash = (state.player.cash || 0) + payout;
        biz.stored = 0;

        if (typeof trackQuestProgress === 'function') trackQuestProgress('collect_biz', 1);

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Снята выручка: +" + payout.toLocaleString() + " ₽!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    collectAllCashAction: function() {
        var total = 0;
        if (Array.isArray(state.businesses)) {
            for (var i = 0; i < state.businesses.length; i++) {
                var b = state.businesses[i];
                if (b && b.stored && b.stored > 0) {
                    total += b.stored;
                    b.stored = 0;
                }
            }
        }

        if (total <= 0) return showToast("Кассы предприятий пусты!");

        state.player.cash = (state.player.cash || 0) + total;
        if (typeof trackQuestProgress === 'function') trackQuestProgress('collect_biz', 1);

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Собрана вся касса сети: +" + total.toLocaleString() + " ₽!");
        this.render(document.getElementById('phoneAppContainer'));
    }
};

window.AppBusiness = AppBusiness;

window.collectAllBusinessCash = function() {
    AppBusiness.collectAllCashAction();
};
window.upgradeBusiness = function(idx) {
    AppBusiness.upgradeLevelSingle(idx);
};
window.restockBusiness = function(idx) {
    AppBusiness.restockSingle(idx);
};
// ========================================================
// js/phone/phone-post.js — ПОЧТА & СКЛАДСКОЙ ХАБ ПЕРЕКУПА (v2.2.0 HYBRID)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v2.2.0 (ГИБРИДНАЯ СИСТЕМА: УМНАЯ РАСПАКОВКА + КАНИСТРЫ НА СКЛАД):
//   1. Топливо не сгорает при полном баке: можно упаковать в канистру на склад или слить за кэш.
//   2. Частичная дозаправка: если бак 80/100, остаток посылки превращается в канистру на складе.
//   3. Талоны и приборы при переполнении/дубликате сохраняются как предметы или сдаются скупщикам.
//   4. Забрать всё: излишки автоматически консервируются в канистры на складе без потерь.
// ========================================================

const AppPost = {
    activeTab: 'inbox',           // 'inbox' | 'warehouse' | 'paid_parking'
    warehouseFilter: 'all',

    // ========================================================
    // ГЛАВНЫЙ РЕНДЕР
    // ========================================================
    render: function(container) {
        if (!container) return;

        try {
            this.ensureDataStructures();

            var curTab = this.activeTab;
            var unreadCount = this.getInboxUnclaimedCount();
            var storedCars = (state.player.warehouse.cars || []).length;
            var totalCarsMax = state.player.warehouse.maxCars || 6;
            var parkedCars = (state.player.paidParking.cars || []).length;
            var parkedCarsMax = state.player.paidParking.maxCars || 3;

            var headerHtml =
                '<div class="phone-app-header">' +
                    '<button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>' +
                    '<div class="phone-app-title color-cyan">' +
                        '<i class="fa-solid fa-box-open mr-1"></i> Почта & Склад' +
                    '</div>' +
                    '<button onclick="AppPost.claimAllMailAction()" class="btn btn-green btn-auto btn-sm" style="font-size:9px; padding:3px 8px;"' + (unreadCount === 0 ? ' disabled' : '') + '>' +
                        'Забрать всё (' + unreadCount + ')' +
                    '</button>' +
                '</div>';

            var navHtml =
                '<div class="phone-app-body">' +
                    '<div class="grid-3 mb-2" style="gap: 4px;">' +
                        '<button onclick="AppPost.switchTab(\'inbox\')" class="btn ' + (curTab === 'inbox' ? 'btn-cyan' : 'btn-dark') + ' btn-sm" style="position:relative;">' +
                            '<i class="fa-solid fa-envelope-open-text mr-1"></i> Почта ' +
                            (unreadCount > 0 ? '<span class="phone-nav-counter">' + unreadCount + '</span>' : '') +
                        '</button>' +
                        '<button onclick="AppPost.switchTab(\'warehouse\')" class="btn ' + (curTab === 'warehouse' ? 'btn-cyan' : 'btn-dark') + ' btn-sm">' +
                            '<i class="fa-solid fa-warehouse mr-1"></i> Склад (' + storedCars + '/' + totalCarsMax + ')' +
                        '</button>' +
                        '<button onclick="AppPost.switchTab(\'paid_parking\')" class="btn ' + (curTab === 'paid_parking' ? 'btn-amber' : 'btn-dark') + ' btn-sm">' +
                            '<i class="fa-solid fa-square-parking mr-1"></i> Парковка (' + parkedCars + '/' + parkedCarsMax + ')' +
                        '</button>' +
                    '</div>' +
                    '<div id="postScreenSubContent"></div>' +
                '</div>';

            container.innerHTML = headerHtml + navHtml;

            var subBox = document.getElementById('postScreenSubContent');
            if (curTab === 'inbox') {
                this.renderInboxScreen(subBox);
            } else if (curTab === 'warehouse') {
                this.renderWarehouseScreen(subBox);
            } else {
                this.renderPaidParkingScreen(subBox);
            }
        } catch (e) {
            console.error('[AppPost] Ошибка рендера:', e);
            container.innerHTML = `
                <div class="phone-app-header">
                    <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                    <div class="phone-app-title color-cyan">Почта & Склад</div>
                    <div style="width:40px;"></div>
                </div>
                <div class="phone-app-body">
                    <div class="glass-card p-3 text-center" style="border-color: var(--red);">
                        <div style="font-size:32px; margin-bottom:8px;">⚠️</div>
                        <b class="color-red text-xs">Ошибка почты</b>
                        <div class="sub-label mt-1" style="font-size:9.5px;">${String(e.message || e).substring(0, 120)}</div>
                    </div>
                </div>
            `;
        }
    },

    switchTab: function(tab) {
        this.activeTab = tab;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // ENSURE STRUCTURES
    // ========================================================
    ensureDataStructures: function() {
        if (!state.player) state.player = {};
        if (!Array.isArray(state.player.mailbox)) {
            state.player.mailbox = [];
        }
        if (!state.player.warehouse) {
            state.player.warehouse = {
                maxCars: 6,
                maxItems: 20,
                cars: [],
                items: []
            };
        }
        if (!Array.isArray(state.player.warehouse.cars)) {
            state.player.warehouse.cars = [];
        }
        if (!Array.isArray(state.player.warehouse.items)) {
            state.player.warehouse.items = [];
        }
        if (!state.player.warehouse.maxCars) {
            state.player.warehouse.maxCars = 6;
        }

        if (!state.player.paidParking) {
            state.player.paidParking = {
                maxCars: 3,
                cars: [],
                dailyRate: 200,
                lastChargeDay: 0
            };
        }
        if (!Array.isArray(state.player.paidParking.cars)) {
            state.player.paidParking.cars = [];
        }
        if (typeof state.player.paidParking.maxCars !== 'number') {
            state.player.paidParking.maxCars = 3;
        }
        if (typeof state.player.paidParking.dailyRate !== 'number') {
            state.player.paidParking.dailyRate = 200;
        }
        if (typeof state.player.paidParking.lastChargeDay !== 'number') {
            state.player.paidParking.lastChargeDay = 0;
        }
    },

    // ========================================================
    // ХЕЛПЕРЫ
    // ========================================================
    getInboxUnclaimedCount: function() {
        var box = state.player && state.player.mailbox ? state.player.mailbox : [];
        var count = 0;
        for (var i = 0; i < box.length; i++) {
            if (box[i] && !box[i].claimed) count++;
        }
        return count;
    },

    _findMailItemById: function(itemId) {
        if (!itemId || !state.player || !Array.isArray(state.player.mailbox)) return null;
        return state.player.mailbox.find(m => m && m.id === itemId) || null;
    },

    _hasAnyBusiness: function() {
        if (!Array.isArray(state.businesses)) return false;
        return state.businesses.some(b => b && (b.level || 0) > 0);
    },

    // ========================================================
    // 1. INBOX (УМНЫЕ КАРТОЧКИ С ВЫБОРОМ ДЕЙСТВИЯ)
    // ========================================================
    renderInboxScreen: function(container) {
        if (!container) return;

        var box = state.player && state.player.mailbox ? state.player.mailbox : [];
        var mail = [];
        for (var i = 0; i < box.length; i++) {
            if (box[i] && !box[i].claimed) mail.push(box[i]);
        }

        if (mail.length === 0) {
            container.innerHTML =
                '<div class="glass-card mb-2 p-3 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.12), #090e18); border-color: rgba(0, 242, 254, 0.25);">' +
                    '<div style="font-size:36px; margin-bottom:8px;">📭</div>' +
                    '<b class="text-xs color-cyan block mb-1" style="font-size:13px;">Почтовый ящик пуст</b>' +
                    '<div class="sub-label" style="font-size:10px; line-height:1.4; color:#94a3b8;">' +
                        'Сюда поступают посылки из СуперВилспина, находок в сараях, грузы из Порта, ежедневные награды и покупки из сети «M+».' +
                    '</div>' +
                '</div>';
            return;
        }

        var curFuel = state.player?.fuel !== undefined ? state.player.fuel : 100;
        var curTickets = state.player?.expressTickets !== undefined ? state.player.expressTickets : 25;
        var maxTickets = state.player?.maxExpressTickets || 25;

        var html =
            '<div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.12), #090e18); border-color: var(--green);">' +
                '<div>' +
                    '<b class="text-xs color-green"><i class="fa-solid fa-truck-ramp-box"></i> Посылочный терминал:</b>' +
                    '<div class="sub-label" style="font-size:8.5px;">Ожидает распаковки: <b>' + mail.length + ' шт.</b></div>' +
                '</div>' +
                '<span class="tag-badge bg-tag-green">ДОСТАВЛЕНО</span>' +
            '</div>' +
            '<div class="space-y-2">';

        for (var idx = 0; idx < mail.length; idx++) {
            var item = mail[idx];
            if (!item) continue;
            var itemId = item.id;
            if (!itemId) {
                itemId = 'legacy_mail_' + idx + '_' + Date.now();
                item.id = itemId;
            }

            var isVehicle = (item.type === 'car' || item.type === 'vehicle');
            var icon = isVehicle ? '🏎️' : (item.type === 'fuel' ? '⛽' : (item.type === 'tickets' ? '🎟️' : (item.type === 'stars' ? '⭐' : (item.type === 'free_impound' ? '🚔' : (item.type === 'xp' ? '🎖️' : (item.type === 'plate' ? '🏷️' : '📦'))))));
            var timeStr = item.date ? item.date : "Сегодня";

            var previewCarHtml = "";
            if (isVehicle && item.carData) {
                var c = item.carData;
                var cImg = c.img || "assets/cars/economy/2101/vaz-2101.jpg";
                var cVal = (c.marketValue || 100000).toLocaleString();
                previewCarHtml =
                    '<div class="deal-car-preview-card my-1" style="height:62px;">' +
                        '<img src="' + cImg + '" class="deal-car-thumb" style="width:75px; height:50px;" onerror="this.src=\'assets/cars/economy/2101/vaz-2101.jpg\'">' +
                        '<div style="flex:1; min-width:0;">' +
                            '<b class="text-xs color-cyan block" style="font-size:11px;">' + (c.name || 'Автомобиль') + '</b>' +
                            '<div class="sub-label" style="font-size:8.5px;">Мощность: ' + (c.power || 100) + ' л.с. | Кузов: ' + (c.condition || 80) + '%</div>' +
                            '<div class="price-val color-green text-xs" style="font-size:11px;">Оценка: ' + cVal + ' ₽</div>' +
                        '</div>' +
                    '</div>';
            }

            var actionButtons = "";
            if (isVehicle) {
                var warehouseCount = (state.player.warehouse.cars || []).length;
                var warehouseMax = state.player.warehouse.maxCars || 6;
                var parkedCount = (state.player.paidParking.cars || []).length;
                var parkedMax = state.player.paidParking.maxCars || 3;

                var warehouseBtnText = 'Склад (' + warehouseCount + '/' + warehouseMax + ')';
                var warehouseBtnDisabled = warehouseCount >= warehouseMax ? ' disabled' : '';

                var parkingBtnText = 'Парковка (' + parkedCount + '/' + parkedMax + ')';
                var parkingBtnDisabled = parkedCount >= parkedMax ? ' disabled' : '';

                actionButtons =
                    '<div class="grid-3 mt-2" style="gap:4px;">' +
                        '<button onclick="AppPost.unpackMailCarToGarage(\'' + itemId + '\')" class="btn btn-green btn-sm" style="font-size:9px; padding:6px 2px;">' +
                            '<i class="fa-solid fa-warehouse"></i> В гараж' +
                        '</button>' +
                        '<button onclick="AppPost.unpackMailCarToWarehouse(\'' + itemId + '\')" class="btn btn-cyan btn-sm" style="font-size:9px; padding:6px 2px;"' + warehouseBtnDisabled + '>' +
                            '<i class="fa-solid fa-box-archive"></i> ' + warehouseBtnText +
                        '</button>' +
                        '<button onclick="AppPost.unpackMailCarToParking(\'' + itemId + '\')" class="btn btn-amber btn-sm" style="font-size:9px; padding:6px 2px;"' + parkingBtnDisabled + '>' +
                            '<i class="fa-solid fa-square-parking"></i> ' + parkingBtnText +
                        '</button>' +
                    '</div>' +
                    '<button onclick="AppPost.sellMailCarInstantly(\'' + itemId + '\')" class="btn btn-dark btn-sm w-full mt-1" style="font-size:9px; padding:6px 2px;">' +
                        '<i class="fa-solid fa-ruble-sign"></i> Продать скупщикам' +
                    '</button>';
            } else if (item.type === 'fuel') {
                var fuelAmt = item.amount || 35;
                var sellPrice = Math.round(fuelAmt * 55); // 55 ₽ за литр скупщикам

                if (curFuel >= 100) {
                    // БАК ПОЛОН: выбор сохранить в канистру или сдать за кэш
                    actionButtons =
                        '<div class="p-1 mb-1 text-center" style="background:rgba(255,179,0,0.08); border-radius:6px; font-size:8.5px; color:#f59e0b;">' +
                            '⚠️ Бак полон (100/100)! Выберите действие с излишком:' +
                        '</div>' +
                        '<div class="grid-2 mt-1" style="gap:4px;">' +
                            '<button onclick="AppPost.packFuelToWarehouseCanister(\'' + itemId + '\')" class="btn btn-cyan btn-sm font-bold" style="font-size:9px; padding:6px 0;">' +
                                '📦 Канистра на склад' +
                            '</button>' +
                            '<button onclick="AppPost.sellFuelSurplus(\'' + itemId + '\')" class="btn btn-amber btn-sm font-bold" style="font-size:9px; padding:6px 0;">' +
                                '💰 Слить (+ ' + sellPrice.toLocaleString() + ' ₽)' +
                            '</button>' +
                        '</div>';
                } else if (curFuel + fuelAmt > 100) {
                    // БАК ЗАПОЛНИТСЯ ЧАСТИЧНО: заправить до 100, а остаток в канистру
                    var fits = 100 - curFuel;
                    var surplus = fuelAmt - fits;
                    actionButtons =
                        '<button onclick="AppPost.claimHybridFuelItem(\'' + itemId + '\')" class="btn btn-green btn-sm w-full mt-2 font-bold" style="font-size:9.5px;">' +
                            'Заправить +' + fits + ' ⛽ (Остаток ' + surplus + ' л в канистру) ✓' +
                        '</button>';
                } else {
                    actionButtons =
                        '<button onclick="AppPost.claimSingleMailItem(\'' + itemId + '\')" class="btn btn-green btn-sm w-full mt-2 font-bold" style="font-size:10px;">' +
                            'Заправить бак (+' + fuelAmt + ' ⛽) ✓' +
                        '</button>';
                }
            } else if (item.type === 'tickets' && curTickets >= maxTickets) {
                var tckAmt = item.amount || 1;
                var sellTckPrice = Math.round(tckAmt * 8000);
                actionButtons =
                    '<div class="p-1 mb-1 text-center" style="background:rgba(192,132,252,0.08); border-radius:6px; font-size:8.5px; color:#c084fc;">' +
                        'Лимит талонов полон (' + curTickets + '/' + maxTickets + ')!' +
                    '</div>' +
                    '<div class="grid-2 mt-1" style="gap:4px;">' +
                        '<button onclick="AppPost.packTicketsToWarehouse(\'' + itemId + '\')" class="btn btn-purple btn-sm" style="font-size:9px; padding:6px 0;">' +
                            '📦 Убрать на склад' +
                        '</button>' +
                        '<button onclick="AppPost.sellTicketsSurplus(\'' + itemId + '\')" class="btn btn-dark btn-sm" style="font-size:9px; padding:6px 0;">' +
                            '💰 Сдать (+ ' + sellTckPrice.toLocaleString() + ' ₽)' +
                        '</button>' +
                    '</div>';
            } else {
                actionButtons =
                    '<button onclick="AppPost.claimSingleMailItem(\'' + itemId + '\')" class="btn btn-green btn-sm w-full mt-2" style="font-size:10px;">' +
                        'Распаковать посылку ✓' +
                    '</button>';
            }

            html +=
                '<div class="glass-card p-2" style="border-left: 3px solid ' + (isVehicle ? 'var(--amber)' : (item.type === 'fuel' ? 'var(--cyan)' : 'var(--green)')) + ';">' +
                    '<div class="flex-between mb-1">' +
                        '<div class="flex-gap" style="align-items:center;">' +
                            '<span style="font-size:20px;">' + icon + '</span>' +
                            '<div>' +
                                '<b class="text-xs ' + (isVehicle ? 'color-amber' : 'color-cyan') + '">' + (item.title || 'Посылка') + '</b>' +
                                '<div class="sub-label" style="font-size:8.5px;">От: <b>' + (item.sender || 'Служба доставки') + '</b> • ' + timeStr + '</div>' +
                            '</div>' +
                        '</div>' +
                        '<span class="tag-badge ' + (isVehicle ? 'bg-tag-amber' : 'bg-tag-cyan') + '">' + (item.badge || 'ПОСЫЛКА') + '</span>' +
                    '</div>' +
                    '<div class="sub-label my-1" style="font-size:9.5px; line-height:1.35; color:#f1f5f9;">' + (item.desc || '') + '</div>' +
                    previewCarHtml +
                    actionButtons +
                '</div>';
        }

        html += '</div>';
        container.innerHTML = html;
    },

    // ========================================================
    // 2. ГИБРИДНЫЕ МЕТОДЫ РАСПАКОВКИ И КОНВЕРТАЦИИ
    // ========================================================

    // Упаковать топливо в канистру на складе
    packFuelToWarehouseCanister: function(itemId) {
        var item = this._findMailItemById(itemId);
        if (!item) return;

        var amount = item.amount || 35;
        this.addWarehouseItem({
            id: 'item_canister_' + Date.now(),
            type: 'canister',
            name: 'Канистра АИ-95 (' + amount + ' л)',
            amount: amount,
            icon: '⛽',
            desc: 'Запас бензина на случай дальних перегонов или ночных гонок.'
        });

        state.player.mailbox = state.player.mailbox.filter(m => m && m.id !== itemId);
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast('📦 Канистра (' + amount + ' л) сохранена на Складе!');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // Продать топливо скупщикам на месте
    sellFuelSurplus: function(itemId) {
        var item = this._findMailItemById(itemId);
        if (!item) return;

        var amount = item.amount || 35;
        var payout = Math.round(amount * 55);

        state.player.cash = (state.player.cash || 0) + payout;
        logBankTransaction('Продажа топлива таксистам (' + amount + ' л)', payout, true);

        state.player.mailbox = state.player.mailbox.filter(m => m && m.id !== itemId);
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast('💰 Топливо продано: +' + payout.toLocaleString() + ' ₽!');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // Гибридная заправка: бак до 100, остаток в канистру
    claimHybridFuelItem: function(itemId) {
        var item = this._findMailItemById(itemId);
        if (!item) return;

        var amount = item.amount || 35;
        var cur = state.player.fuel || 0;
        var fits = Math.max(0, 100 - cur);
        var surplus = amount - fits;

        state.player.fuel = 100;

        if (surplus > 0) {
            this.addWarehouseItem({
                id: 'item_canister_' + Date.now(),
                type: 'canister',
                name: 'Канистра АИ-95 (' + surplus + ' л)',
                amount: surplus,
                icon: '⛽',
                desc: 'Остаток бензина от посылки.'
            });
        }

        state.player.mailbox = state.player.mailbox.filter(m => m && m.id !== itemId);
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast('⛽ Бак заправлен до 100%! Остаток ' + surplus + ' л убран в канистру.');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // Упаковать талоны на склад
    packTicketsToWarehouse: function(itemId) {
        var item = this._findMailItemById(itemId);
        if (!item) return;

        var amount = item.amount || 1;
        this.addWarehouseItem({
            id: 'item_tickets_' + Date.now(),
            type: 'tickets_bundle',
            name: 'Пачка экспресс-талонов (' + amount + ' шт)',
            amount: amount,
            icon: '🎟️',
            desc: 'Запас пропусков для мгновенного призыва клиентов на площадку.'
        });

        state.player.mailbox = state.player.mailbox.filter(m => m && m.id !== itemId);
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast('📦 Талоны убраны в запас на Склад!');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // Продать талоны перекупам
    sellTicketsSurplus: function(itemId) {
        var item = this._findMailItemById(itemId);
        if (!item) return;

        var amount = item.amount || 1;
        var payout = Math.round(amount * 8000);

        state.player.cash = (state.player.cash || 0) + payout;
        logBankTransaction('Продажа талонов коллегам (' + amount + ' шт)', payout, true);

        state.player.mailbox = state.player.mailbox.filter(m => m && m.id !== itemId);
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast('💰 Талоны выкуплены: +' + payout.toLocaleString() + ' ₽!');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // Вспомогательное добавление предмета на склад
    addWarehouseItem: function(itemObj) {
        if (!state.player.warehouse) state.player.warehouse = { cars: [], items: [] };
        if (!Array.isArray(state.player.warehouse.items)) state.player.warehouse.items = [];

        // Если такая канистра уже есть — объединяем литраж
        if (itemObj.type === 'canister') {
            var existing = state.player.warehouse.items.find(i => i.type === 'canister');
            if (existing) {
                existing.amount = (existing.amount || 0) + itemObj.amount;
                existing.name = 'Канистра АИ-95 (' + existing.amount + ' л)';
                return;
            }
        }

        state.player.warehouse.items.push(itemObj);
    },

    // ========================================================
    // 3. СТАНДАРТНАЯ РАСПАКОВКА ПОСЫЛКИ
    // ========================================================
    claimSingleMailItem: function(itemId) {
        var item = this._findMailItemById(itemId);
        if (!item) {
            if (typeof showToast === 'function') showToast("❌ Посылка не найдена");
            return;
        }

        if (item.type === 'fuel') {
            state.player.fuel = Math.min(100, (state.player.fuel || 0) + (item.amount || 10));
        } else if (item.type === 'tickets') {
            var maxT = state.player.maxExpressTickets || 25;
            state.player.expressTickets = Math.min(maxT, (state.player.expressTickets || 0) + (item.amount || 1));
        } else if (item.type === 'stars') {
            state.player.stars = (state.player.stars || 0) + (item.amount || 5);
        } else if (item.type === 'cash') {
            var amt = item.amount || 50000;
            state.player.cash = (state.player.cash || 0) + amt;
            if (typeof logBankTransaction === 'function') {
                logBankTransaction("Распаковка посылки: " + (item.title || "Денежный приз"), amt, true);
            }
        } else if (item.type === 'connections') {
            state.player.connections = (state.player.connections || 0) + (item.amount || 1);
        } else if (item.type === 'free_impound') {
            state.player.freeImpoundPasses = (state.player.freeImpoundPasses || 0) + (item.amount || 1);
        } else if (item.type === 'xp') {
            if (typeof addXp === 'function') addXp(item.amount || 100);
        } else if (item.type === 'tool') {
            if (!state.player.tools) state.player.tools = {};
            if (!state.player.toolsWear) state.player.toolsWear = {};
            state.player.tools[item.toolId] = true;
            state.player.toolsWear[item.toolId] = 100;
        } else if (item.type === 'plate') {
            if (window.PlatesManager) {
                window.PlatesManager.addPlate(item.plate || "А777АА 77", 'mail_claim', { silent: false });
            } else {
                if (!state.player.platesInventory) state.player.platesInventory = [];
                state.player.platesInventory.push({
                    id: 'plate_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
                    number: String(item.plate || "А777АА 77").trim().toUpperCase(),
                    region: 77,
                    status: 'inventory',
                    installedCarId: null,
                    ownerId: state.player.uid || 'player_local',
                    source: 'mail_claim_fallback',
                    createdAt: Date.now()
                });
            }
        }

        state.player.mailbox = state.player.mailbox.filter(m => m && m.id !== itemId);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast("Посылка «" + (item.title || '') + "» распакована!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    // Массовая умная распаковка
    claimAllMailAction: function() {
        var box = state.player && state.player.mailbox ? state.player.mailbox : [];
        var claimedCount = 0;
        var toRemoveIds = [];
        var packedSurplusMsg = [];

        var curFuel = state.player.fuel || 0;
        var curTickets = state.player.expressTickets || 0;
        var maxTickets = state.player.maxExpressTickets || 25;

        for (var i = 0; i < box.length; i++) {
            var item = box[i];
            if (!item || item.claimed) continue;
            if (item.type === 'car' || item.type === 'vehicle') continue;

            if (item.type === 'fuel') {
                var famt = item.amount || 10;
                var fits = Math.max(0, 100 - curFuel);
                if (fits >= famt) {
                    curFuel += famt;
                } else {
                    curFuel = 100;
                    var surplus = famt - fits;
                    this.addWarehouseItem({
                        id: 'item_canister_' + Date.now() + '_' + i,
                        type: 'canister',
                        name: 'Канистра АИ-95 (' + surplus + ' л)',
                        amount: surplus,
                        icon: '⛽',
                        desc: 'Запас бензина.'
                    });
                    packedSurplusMsg.push('Канистра ' + surplus + ' л');
                }
            } else if (item.type === 'tickets') {
                var tamt = item.amount || 1;
                var tfits = Math.max(0, maxTickets - curTickets);
                if (tfits >= tamt) {
                    curTickets += tamt;
                } else {
                    curTickets = maxTickets;
                    var tsurplus = tamt - tfits;
                    this.addWarehouseItem({
                        id: 'item_tickets_' + Date.now() + '_' + i,
                        type: 'tickets_bundle',
                        name: 'Пачка талонов (' + tsurplus + ' шт)',
                        amount: tsurplus,
                        icon: '🎟️',
                        desc: 'Запас талонов.'
                    });
                    packedSurplusMsg.push(tsurplus + ' талона(ов)');
                }
            } else if (item.type === 'stars') {
                state.player.stars = (state.player.stars || 0) + (item.amount || 5);
            } else if (item.type === 'cash') {
                var amt = item.amount || 50000;
                state.player.cash = (state.player.cash || 0) + amt;
                if (typeof logBankTransaction === 'function') {
                    logBankTransaction("Распаковка: " + (item.title || "Приз"), amt, true);
                }
            } else if (item.type === 'connections') {
                state.player.connections = (state.player.connections || 0) + (item.amount || 1);
            } else if (item.type === 'free_impound') {
                state.player.freeImpoundPasses = (state.player.freeImpoundPasses || 0) + (item.amount || 1);
            } else if (item.type === 'xp') {
                if (typeof addXp === 'function') addXp(item.amount || 100);
            } else if (item.type === 'tool') {
                if (!state.player.tools) state.player.tools = {};
                if (!state.player.toolsWear) state.player.toolsWear = {};
                state.player.tools[item.toolId] = true;
                state.player.toolsWear[item.toolId] = 100;
            } else if (item.type === 'plate') {
                if (window.PlatesManager) {
                    window.PlatesManager.addPlate(item.plate || "А777АА 77", 'mail_claim_all', { silent: true });
                }
            }

            if (item.id) {
                toRemoveIds.push(item.id);
                claimedCount++;
            }
        }

        state.player.fuel = curFuel;
        state.player.expressTickets = curTickets;

        if (toRemoveIds.length > 0) {
            state.player.mailbox = state.player.mailbox.filter(m => m && !toRemoveIds.includes(m.id));
        }

        if (claimedCount > 0) {
            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

            var finalMsg = "Распаковано посылок: +" + claimedCount + " шт.";
            if (packedSurplusMsg.length > 0) {
                finalMsg += "\nНа склад убрано: " + packedSurplusMsg.join(', ');
            }
            if (typeof showToast === 'function') showToast(finalMsg);
        } else {
            if (typeof showToast === 'function') showToast("Остался только транспорт — выберите место стоянки вручную.");
        }

        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 4. РАСПАКОВКА МАШИНЫ
    // ========================================================
    unpackMailCarToGarage: function(itemId) {
        var item = this._findMailItemById(itemId);
        if (!item || !item.carData) {
            if (typeof showToast === 'function') showToast("❌ Машина не найдена в посылке");
            return;
        }

        var maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
        var curSlots = state.garage ? state.garage.length : 0;

        if (curSlots >= maxSlots) {
            if (typeof showToast === 'function') showToast("В основном гараже нет свободных мест! Отправьте авто на Склад или Парковку.");
            return;
        }

        var car = item.carData;
        if (!state.garage) state.garage = [];
        state.garage.push(car);
        state.player.mailbox = state.player.mailbox.filter(m => m && m.id !== itemId);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        if (typeof openVerdictModal === 'function') {
            openVerdictModal(
                "МАШИНА В ГАРАЖЕ! 🏎️",
                "Автомобиль «" + car.name + "» выгружен с автовоза и припаркован в боксе!\nГосномер: " + (car.customPlate || car.plate || "ТРАНЗИТ") + ".",
                true
            );
        }

        this.render(document.getElementById('phoneAppContainer'));
    },

    unpackMailCarToWarehouse: function(itemId) {
        var item = this._findMailItemById(itemId);
        if (!item || !item.carData) {
            if (typeof showToast === 'function') showToast("❌ Машина не найдена в посылке");
            return;
        }

        if (!this._hasAnyBusiness()) {
            if (typeof showToast === 'function') {
                showToast("⚠️ Склад доступен только владельцам бизнеса! Перенаправляю на Платную парковку.");
            }
            return this.unpackMailCarToParking(itemId);
        }

        var stored = state.player.warehouse.cars || [];
        var maxStored = state.player.warehouse.maxCars || 6;

        if (stored.length >= maxStored) {
            if (typeof showToast === 'function') showToast("Склад заполнен (" + stored.length + "/" + maxStored + ")! Перенаправляю на Парковку.");
            return this.unpackMailCarToParking(itemId);
        }

        var car = item.carData;
        car.isStoredInWarehouse = true;
        car.storageType = 'warehouse';
        stored.push(car);
        state.player.mailbox = state.player.mailbox.filter(m => m && m.id !== itemId);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast("«" + car.name + "» законсервирован на Складе хранения!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    unpackMailCarToParking: function(itemId) {
        var item = this._findMailItemById(itemId);
        if (!item || !item.carData) {
            if (typeof showToast === 'function') showToast("❌ Машина не найдена в посылке");
            return;
        }

        var parked = state.player.paidParking.cars || [];
        var maxParked = state.player.paidParking.maxCars || 3;

        if (parked.length >= maxParked) {
            if (typeof showToast === 'function') showToast("Парковка заполнена (" + parked.length + "/" + maxParked + ")! Перенаправляю в Гараж.");
            return this.unpackMailCarToGarage(itemId);
        }

        var car = item.carData;
        car.isStoredInWarehouse = false;
        car.storageType = 'paid_parking';
        parked.push(car);
        state.player.mailbox = state.player.mailbox.filter(m => m && m.id !== itemId);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast("«" + car.name + "» на платной парковке (" + state.player.paidParking.dailyRate + " ₽/день)!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    sellMailCarInstantly: function(itemId) {
        var item = this._findMailItemById(itemId);
        if (!item || !item.carData) {
            if (typeof showToast === 'function') showToast("❌ Машина не найдена в посылке");
            return;
        }

        var car = item.carData;
        var price = Math.round((car.marketValue || car.basePrice || 100000) * 0.82);

        if (!confirm("Продать «" + car.name + "» скупщикам на месте за " + price.toLocaleString() + " ₽?")) return;

        state.player.cash = (state.player.cash || 0) + price;
        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Продажа авто с автовоза: " + car.name, price, true);
        }
        state.player.mailbox = state.player.mailbox.filter(m => m && m.id !== itemId);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast("Автомобиль выкуплен скупщиками (+" + price.toLocaleString() + " ₽)!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 5. СКЛАД (С ПОЛКОЙ КАНИСТР И РАСХОДНИКОВ)
    // ========================================================
    renderWarehouseScreen: function(container) {
        if (!container) return;

        var storedCars = state.player.warehouse.cars || [];
        var storedItems = state.player.warehouse.items || [];
        var maxCars = state.player.warehouse.maxCars || 6;
        var hasBiz = this._hasAnyBusiness();

        var headerHtml =
            '<div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.14), #090e18); border-color: var(--cyan);">' +
                '<div>' +
                    '<b class="text-xs color-cyan"><i class="fa-solid fa-warehouse"></i> Складской Терминал:</b>' +
                    '<div class="sub-label" style="font-size:8.5px;">Авто: <b>' + storedCars.length + '/' + maxCars + '</b> | Вещи: <b>' + storedItems.length + ' шт.</b></div>' +
                '</div>' +
                '<button onclick="AppPost.upgradeWarehouseCapacity()" class="btn btn-cyan btn-auto btn-sm" style="font-size:9px;">' +
                    '+2 Места (120k)' +
                '</button>' +
            '</div>';

        // Полка предметов (канистры и талоны)
        var itemsHtml = '';
        if (storedItems.length > 0) {
            itemsHtml = `
                <div class="glass-card mb-2 p-2" style="background:#060a12; border-color:rgba(0,242,254,0.3);">
                    <b class="text-xs color-cyan mb-1 block" style="font-size:10px;"><i class="fa-solid fa-boxes-packing mr-1"></i> Полка запасов и канистр:</b>
                    <div class="space-y-1">
                        ${storedItems.map((it, idx) => `
                            <div class="p-1 flex-between" style="background:#090e18; border-radius:6px; border:1px solid rgba(255,255,255,0.06); font-size:9px;">
                                <div class="flex-gap" style="align-items:center;">
                                    <span style="font-size:14px;">${it.icon || '📦'}</span>
                                    <div>
                                        <b class="color-main">${it.name}</b>
                                        <div class="sub-label" style="font-size:7.5px;">${it.desc || ''}</div>
                                    </div>
                                </div>
                                <div class="flex-gap" style="gap:4px;">
                                    ${it.type === 'canister' ? `
                                        <button onclick="AppPost.useWarehouseCanister(${idx})" class="btn btn-green btn-sm btn-auto" style="padding:3px 6px; font-size:8px;">Заправить</button>
                                    ` : ''}
                                    ${it.type === 'tickets_bundle' ? `
                                        <button onclick="AppPost.useWarehouseTickets(${idx})" class="btn btn-purple btn-sm btn-auto" style="padding:3px 6px; font-size:8px;">Применить</button>
                                    ` : ''}
                                    <button onclick="AppPost.sellWarehouseItem(${idx})" class="btn btn-dark btn-sm btn-auto" style="padding:3px 5px; font-size:8px;">Продать</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        var carsHeader = '<div class="sub-label mb-1" style="font-size:9px;">Законсервированные автомобили на складе:</div>';

        if (storedCars.length === 0 && storedItems.length === 0) {
            container.innerHTML = headerHtml +
                '<div class="glass-card text-center sub-label py-6">' +
                    '<i class="fa-solid fa-box-archive color-cyan mb-2" style="font-size:26px;"></i>' +
                    '<div>На складе нет машин и запасов.</div>' +
                    '<div style="font-size:9px; margin-top:3px;">Отправляйте сюда канистры с Почты или консервируйте автомобили.</div>' +
                '</div>';
            return;
        }

        var listHtml = '<div class="space-y-2">';
        for (var i = 0; i < storedCars.length; i++) {
            var car = storedCars[i];
            if (!car) continue;
            var cImg = car.img || "assets/cars/economy/2101/vaz-2101.jpg";
            var cPlate = car.customPlate || car.plate || "ТРАНЗИТ";

            listHtml +=
                '<div class="glass-card p-2" style="border-left: 3px solid var(--cyan);">' +
                    '<div class="deal-car-preview-card mb-2" style="height:62px;">' +
                        '<img src="' + cImg + '" class="deal-car-thumb" style="width:75px; height:50px;" onerror="this.src=\'assets/cars/economy/2101/vaz-2101.jpg\'">' +
                        '<div style="flex:1; min-width:0;">' +
                            '<b class="text-xs color-cyan block" style="font-size:11.5px;">' + car.name + '</b>' +
                            '<div class="sub-label" style="font-size:8.5px;">Мощность: ' + (car.power || 100) + ' л.с. | ' + (car.condition || 80) + '% HP</div>' +
                            '<div class="license-plate text-xs mt-1" style="padding:1px 4px;">' + cPlate + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="grid-2" style="gap:4px;">' +
                        '<button onclick="AppPost.moveWarehouseCarToGarage(' + i + ')" class="btn btn-green btn-sm" style="font-size:9px; padding:6px 2px;">' +
                            '<i class="fa-solid fa-arrow-right-to-bracket mr-1"></i> Выгрузить в гараж' +
                        '</button>' +
                        '<button onclick="AppPost.listWarehouseCarOnP2P(' + i + ')" class="btn btn-purple btn-sm" style="font-size:9px; padding:6px 2px;">' +
                            '<i class="fa-solid fa-handshake mr-1"></i> На P2P биржу' +
                        '</button>' +
                    '</div>' +
                '</div>';
        }
        listHtml += '</div>';

        container.innerHTML = headerHtml + itemsHtml + carsHeader + listHtml;
    },

    // Заправка машины из канистры на складе
    useWarehouseCanister: function(idx) {
        var items = state.player.warehouse.items || [];
        var it = items[idx];
        if (!it) return;

        var cur = state.player.fuel || 0;
        if (cur >= 100) return showToast("Бак уже полон на 100%!");

        var needed = 100 - cur;
        var take = Math.min(needed, it.amount);

        state.player.fuel = cur + take;
        it.amount -= take;

        if (it.amount <= 0) {
            items.splice(idx, 1);
        } else {
            it.name = 'Канистра АИ-95 (' + it.amount + ' л)';
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast("Залито +" + take + " ⛽ из канистры!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    // Активация талонов со склада
    useWarehouseTickets: function(idx) {
        var items = state.player.warehouse.items || [];
        var it = items[idx];
        if (!it) return;

        var cur = state.player.expressTickets || 0;
        var max = state.player.maxExpressTickets || 25;
        if (cur >= max) return showToast("Лимит талонов полон (" + max + ")!");

        var needed = max - cur;
        var take = Math.min(needed, it.amount);

        state.player.expressTickets = cur + take;
        it.amount -= take;

        if (it.amount <= 0) {
            items.splice(idx, 1);
        } else {
            it.name = 'Пачка талонов (' + it.amount + ' шт)';
        }

        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast("Активировано +" + take + " талонов!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    // Продажа предмета со склада за кэш
    sellWarehouseItem: function(idx) {
        var items = state.player.warehouse.items || [];
        var it = items[idx];
        if (!it) return;

        var payout = 0;
        if (it.type === 'canister') payout = Math.round(it.amount * 50);
        else if (it.type === 'tickets_bundle') payout = Math.round(it.amount * 7500);
        else payout = 10000;

        if (!confirm("Продать «" + it.name + "» за " + payout.toLocaleString() + " ₽?")) return;

        state.player.cash = (state.player.cash || 0) + payout;
        logBankTransaction("Продажа со склада: " + it.name, payout, true);

        items.splice(idx, 1);
        saveState();
        updateHeaderUI();
        playSound('win');
        tgHaptic('success');
        showToast("Продано: +" + payout.toLocaleString() + " ₽");
        this.render(document.getElementById('phoneAppContainer'));
    },

    moveWarehouseCarToGarage: function(idx) {
        var storedCars = state.player.warehouse.cars || [];
        var car = storedCars[idx];
        if (!car) return;

        var maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
        var curSlots = state.garage ? state.garage.length : 0;

        if (curSlots >= maxSlots) {
            return showToast("В основном гараже нет свободного места! Освободите бокс.");
        }

        delete car.isStoredInWarehouse;
        delete car.storageType;
        if (!state.garage) state.garage = [];
        state.garage.push(car);
        storedCars.splice(idx, 1);

        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("«" + car.name + "» перемещён в основной гараж!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    listWarehouseCarOnP2P: function(idx) {
        var storedCars = state.player.warehouse.cars || [];
        var car = storedCars[idx];
        if (!car) return;

        var priceStr = prompt("Цена продажи «" + car.name + "» на P2P бирже:", String(car.marketValue || 150000));
        if (!priceStr) return;
        var price = parseInt(priceStr, 10);
        if (isNaN(price) || price <= 1000) return showToast("Некорректная цена!");

        storedCars.splice(idx, 1);

        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        var lotId = "lot_wh_" + Date.now();
        state.p2pMarketListings.unshift({
            id: lotId,
            sellerId: String(state.player && state.player.uid ? state.player.uid : "me"),
            sellerName: state.player && state.player.name ? state.player.name : "Перекуп",
            type: "cars",
            name: car.name,
            price: price,
            itemData: car,
            createdAt: Date.now()
        });

        if (window.FB_Bridge && window.FB_Bridge.P2P) {
            try {
                window.FB_Bridge.P2P.publishLot({
                    type: 'cars',
                    name: car.name,
                    price: price,
                    itemData: car
                });
            } catch (e) { console.warn('[Post] P2P publishLot ошибка:', e); }
        }

        saveState();
        showToast("Автомобиль выставлен на онлайн P2P биржу со склада!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    upgradeWarehouseCapacity: function() {
        if (!this._hasAnyBusiness()) {
            return showToast("⚠️ Расширение склада доступно только владельцам бизнеса!");
        }

        var maxCars = state.player.warehouse.maxCars || 6;
        if (maxCars >= 30) return showToast("Достигнут предел склада (30 авто)!");

        var cost = 120000;
        var cash = state.player ? (state.player.cash || 0) : 0;
        if (cash < cost) return showToast("Нужно " + cost.toLocaleString() + " ₽ на расширение склада!");

        state.player.cash -= cost;
        state.player.warehouse.maxCars = maxCars + 2;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Расширение склада консервации", cost, false);
        }

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Вместимость склада увеличена до " + state.player.warehouse.maxCars + " мест!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 6. ПЛАТНАЯ ПАРКОВКА
    // ========================================================
    renderPaidParkingScreen: function(container) {
        if (!container) return;

        var parkedCars = state.player.paidParking.cars || [];
        var maxCars = state.player.paidParking.maxCars || 3;
        var dailyRate = state.player.paidParking.dailyRate || 200;
        var dailyTotal = parkedCars.length * dailyRate;

        var headerHtml =
            '<div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(255, 179, 0, 0.14), #090e18); border-color: var(--amber);">' +
                '<div>' +
                    '<b class="text-xs color-amber"><i class="fa-solid fa-square-parking"></i> Платная Парковка:</b>' +
                    '<div class="sub-label" style="font-size:8.5px;">Занято: <b>' + parkedCars.length + ' из ' + maxCars + '</b> • Тариф: <b>' + dailyRate + ' ₽/день</b></div>' +
                '</div>' +
                '<button onclick="AppPost.upgradeParkingCapacity()" class="btn btn-amber btn-auto btn-sm" style="font-size:9px;">' +
                    '+2 Места (80k)' +
                '</button>' +
            '</div>';

        var summaryHtml = parkedCars.length > 0 ? `
            <div class="glass-card mb-2 p-2" style="background:#050914; border-color:rgba(255,179,0,0.3);">
                <div class="flex-between text-xs mb-1">
                    <span class="sub-label">Ежедневное списание:</span>
                    <b class="color-amber">-${dailyTotal.toLocaleString()} ₽/день</b>
                </div>
                <div class="sub-label" style="font-size:8.5px; color:#94a3b8;">
                    Списание происходит в полночь. При нехватке денег машины уходят в утиль.
                </div>
            </div>
        ` : '';

        if (parkedCars.length === 0) {
            container.innerHTML = headerHtml + summaryHtml +
                '<div class="glass-card text-center sub-label py-6">' +
                    '<i class="fa-solid fa-square-parking color-amber mb-2" style="font-size:26px;"></i>' +
                    '<div>На платной парковке нет машин.</div>' +
                    '<div style="font-size:9px; margin-top:3px;">Отправляйте сюда машины с Почты, если у вас пока нет бизнеса.</div>' +
                '</div>';
            return;
        }

        var listHtml = '<div class="space-y-2">';
        for (var i = 0; i < parkedCars.length; i++) {
            var car = parkedCars[i];
            if (!car) continue;
            var cImg = car.img || "assets/cars/economy/2101/vaz-2101.jpg";
            var cPlate = car.customPlate || car.plate || "ТРАНЗИТ";

            listHtml +=
                '<div class="glass-card p-2" style="border-left: 3px solid var(--amber);">' +
                    '<div class="deal-car-preview-card mb-2" style="height:62px;">' +
                        '<img src="' + cImg + '" class="deal-car-thumb" style="width:75px; height:50px;" onerror="this.src=\'assets/cars/economy/2101/vaz-2101.jpg\'">' +
                        '<div style="flex:1; min-width:0;">' +
                            '<b class="text-xs color-amber block" style="font-size:11.5px;">' + car.name + '</b>' +
                            '<div class="sub-label" style="font-size:8.5px;">Мощность: ' + (car.power || 100) + ' л.с. | ' + (car.condition || 80) + '% HP</div>' +
                            '<div class="license-plate text-xs mt-1" style="padding:1px 4px;">' + cPlate + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="grid-2" style="gap:4px;">' +
                        '<button onclick="AppPost.moveParkingCarToGarage(' + i + ')" class="btn btn-green btn-sm" style="font-size:9px; padding:6px 2px;">' +
                            '<i class="fa-solid fa-arrow-right-to-bracket mr-1"></i> Забрать в гараж' +
                        '</button>' +
                        '<button onclick="AppPost.listParkingCarOnP2P(' + i + ')" class="btn btn-purple btn-sm" style="font-size:9px; padding:6px 2px;">' +
                            '<i class="fa-solid fa-handshake mr-1"></i> На P2P биржу' +
                        '</button>' +
                    '</div>' +
                '</div>';
        }
        listHtml += '</div>';

        container.innerHTML = headerHtml + summaryHtml + listHtml;
    },

    moveParkingCarToGarage: function(idx) {
        var parkedCars = state.player.paidParking.cars || [];
        var car = parkedCars[idx];
        if (!car) return;

        var maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
        var curSlots = state.garage ? state.garage.length : 0;

        if (curSlots >= maxSlots) {
            return showToast("В основном гараже нет свободного места!");
        }

        delete car.isStoredInWarehouse;
        delete car.storageType;
        if (!state.garage) state.garage = [];
        state.garage.push(car);
        parkedCars.splice(idx, 1);

        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("«" + car.name + "» перемещён в основной гараж!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    listParkingCarOnP2P: function(idx) {
        var parkedCars = state.player.paidParking.cars || [];
        var car = parkedCars[idx];
        if (!car) return;

        var priceStr = prompt("Цена продажи «" + car.name + "» на P2P бирже:", String(car.marketValue || 150000));
        if (!priceStr) return;
        var price = parseInt(priceStr, 10);
        if (isNaN(price) || price <= 1000) return showToast("Некорректная цена!");

        parkedCars.splice(idx, 1);

        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        var lotId = "lot_pk_" + Date.now();
        state.p2pMarketListings.unshift({
            id: lotId,
            sellerId: String(state.player && state.player.uid ? state.player.uid : "me"),
            sellerName: state.player && state.player.name ? state.player.name : "Перекуп",
            type: "cars",
            name: car.name,
            price: price,
            itemData: car,
            createdAt: Date.now()
        });

        if (window.FB_Bridge && window.FB_Bridge.P2P) {
            try {
                window.FB_Bridge.P2P.publishLot({
                    type: 'cars',
                    name: car.name,
                    price: price,
                    itemData: car
                });
            } catch (e) { console.warn('[Post] P2P publishLot ошибка:', e); }
        }

        saveState();
        showToast("Автомобиль выставлен на онлайн P2P биржу с парковки!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    upgradeParkingCapacity: function() {
        var maxCars = state.player.paidParking.maxCars || 3;
        if (maxCars >= 15) return showToast("Достигнут предел парковки (15 авто)!");

        var cost = 80000;
        var cash = state.player ? (state.player.cash || 0) : 0;
        if (cash < cost) return showToast("Нужно " + cost.toLocaleString() + " ₽ на расширение парковки!");

        state.player.cash -= cost;
        state.player.paidParking.maxCars = maxCars + 2;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Расширение платной парковки", cost, false);
        }

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Вместимость парковки увеличена до " + state.player.paidParking.maxCars + " мест!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // 7. ЕЖЕДНЕВНОЕ СПИСАНИЕ ЗА ПАРКОВКУ
    // ========================================================
    chargeDailyParking: function() {
        if (!state.player || !state.player.paidParking) return { charged: 0, lostCars: 0 };

        var parkedCars = state.player.paidParking.cars || [];
        if (parkedCars.length === 0) return { charged: 0, lostCars: 0 };

        var dailyRate = state.player.paidParking.dailyRate || 200;
        var totalCost = parkedCars.length * dailyRate;
        var cash = state.player.cash || 0;

        if (cash >= totalCost) {
            state.player.cash -= totalCost;
            state.player.paidParking.lastChargeDay = state.player.day || 1;
            if (typeof logBankTransaction === 'function') {
                logBankTransaction("Платная парковка (" + parkedCars.length + " авто)", totalCost, false);
            }
            return { charged: totalCost, lostCars: 0 };
        }

        var lostCars = 0;
        var remaining = [...parkedCars];

        while (remaining.length > 0 && cash < dailyRate) {
            remaining.sort((a, b) => (a.marketValue || a.basePrice || 0) - (b.marketValue || b.basePrice || 0));
            remaining.shift();
            lostCars++;
        }

        var newCost = remaining.length * dailyRate;
        if (cash >= newCost) {
            state.player.cash -= newCost;
            state.player.paidParking.cars = remaining;
            if (typeof logBankTransaction === 'function') {
                logBankTransaction("Платная парковка (частично)", newCost, false);
            }
            return { charged: newCost, lostCars: lostCars };
        }

        state.player.paidParking.cars = [];
        return { charged: 0, lostCars: parkedCars.length };
    }
};

// ========================================================
// ГЛОБАЛЬНАЯ ФУНКЦИЯ pushToMailbox
// ========================================================
window.pushToMailbox = function(mailItem) {
    if (!state.player) state.player = {};
    if (!Array.isArray(state.player.mailbox)) state.player.mailbox = [];

    var item = Object.assign({
        id: "mail_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
        type: "item",
        title: "Посылка",
        sender: "Служба доставки",
        desc: "Новое поступление в почтовый ящик.",
        date: "Только что",
        claimed: false
    }, mailItem);

    if (!item.id || state.player.mailbox.some(m => m && m.id === item.id)) {
        item.id = "mail_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
    }

    state.player.mailbox.unshift(item);
    if (typeof saveState === 'function') saveState();
    if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.updateUnreadBadge === 'function') {
        PhoneManager.updateUnreadBadge();
    }
    if (typeof showToast === 'function') {
        showToast("📦 В почту прибыло новое отправление: «" + item.title + "»!");
    }
};

window.AppPost = AppPost;

console.log('[📬 phone-post v2.2.0 HYBRID] Умная распаковка + склад канистр и талонов активированы ✓');

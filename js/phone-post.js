// ========================================================
// js/phone-post.js — ПОЧТА & СКЛАДСКОЙ ХАБ ПЕРЕКУПА (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.0.0 (КРИТИЧЕСКИЙ ФИКС):
//   - ФИКС: обработка писем теперь ищет их по ID, а не по
//     индексу в массиве `mail`. Раньше при наличии уже
//     распакованных писем индекс «съезжал» и игрок мог
//     распаковать не то письмо или удалить не тот item.
//   - claimSingleMailItem / unpackMailCarToGarage /
//     unpackMailCarToWarehouse / sellMailCarInstantly
//     принимают ID письма вместо индекса.
//   - AppPost.claimAllMailAction переписан: работает с
//     копией mailbox, удаляет по id.
//   - try/catch вокруг AppPost.render.
//   - pushToMailbox — единственная каноническая версия
//     (в app.js она удалена, см. патч app.js).
// ⭐ v0.9.5 (базовый):
//   2 раздела: Почта и Склад хранения.
// ========================================================

const AppPost = {
    activeTab: 'inbox',
    warehouseFilter: 'all',

    render: function(container) {
        if (!container) return;

        try {
            this.ensureDataStructures();

            var curTab = this.activeTab;
            var unreadCount = this.getInboxUnclaimedCount();
            var storedCars = state.player.warehouse.cars || [];
            var storedCarsCount = storedCars.length;
            var totalCarsMax = state.player.warehouse.maxCars || 6;

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
                    '<div class="grid-2 mb-2" style="gap: 5px;">' +
                        '<button onclick="AppPost.switchTab(\'inbox\')" class="btn ' + (curTab === 'inbox' ? 'btn-cyan' : 'btn-dark') + ' btn-sm" style="position:relative;">' +
                            '<i class="fa-solid fa-envelope-open-text mr-1"></i> Входящие ' +
                            (unreadCount > 0 ? '<span class="phone-nav-counter">' + unreadCount + '</span>' : '') +
                        '</button>' +
                        '<button onclick="AppPost.switchTab(\'warehouse\')" class="btn ' + (curTab === 'warehouse' ? 'btn-cyan' : 'btn-dark') + ' btn-sm">' +
                            '<i class="fa-solid fa-warehouse mr-1"></i> Склад (' + storedCarsCount + '/' + totalCarsMax + ')' +
                        '</button>' +
                    '</div>' +
                    '<div id="postScreenSubContent"></div>' +
                '</div>';

            container.innerHTML = headerHtml + navHtml;

            var subBox = document.getElementById('postScreenSubContent');
            if (curTab === 'inbox') {
                this.renderInboxScreen(subBox);
            } else {
                this.renderWarehouseScreen(subBox);
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

    ensureDataStructures: function() {
        if (!state.player) state.player = {};
        if (!Array.isArray(state.player.mailbox)) {
            state.player.mailbox = [];
        }
        if (!state.player.warehouse) {
            state.player.warehouse = {
                maxCars: 6,
                maxItems: 12,
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
    },

    getInboxUnclaimedCount: function() {
        var box = state.player && state.player.mailbox ? state.player.mailbox : [];
        var count = 0;
        for (var i = 0; i < box.length; i++) {
            if (box[i] && !box[i].claimed) count++;
        }
        return count;
    },

    // --------------------------------------------------------
    // ⭐ v1.0.0: поиск письма по ID
    // --------------------------------------------------------
    _findMailItemById: function(itemId) {
        if (!itemId || !state.player || !Array.isArray(state.player.mailbox)) return null;
        return state.player.mailbox.find(m => m && m.id === itemId) || null;
    },

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

        var html =
            '<div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.12), #090e18); border-color: var(--green);">' +
                '<div>' +
                    '<b class="text-xs color-green"><i class="fa-solid fa-truck-ramp-box"></i> Посылочный терминал:</b>' +
                    '<div class="sub-label" style="font-size:8.5px;">Ожидает распаковки: <b>' + mail.length + ' шт.</b></div>' +
                '</div>' +
                '<span class="tag-badge bg-tag-green">ДОСТАВЛЕНО</span>' +
            '</div>' +
            '<div class="space-y-2">';

        // ⭐ v1.0.0: итерируем по реальным объектам, а не по индексам
        for (var idx = 0; idx < mail.length; idx++) {
            var item = mail[idx];
            if (!item) continue;
            var itemId = item.id;
            if (!itemId) {
                // legacy fallback — если по какой-то причине у письма нет id
                itemId = 'legacy_mail_' + idx + '_' + Date.now();
                item.id = itemId;
            }

            var isVehicle = (item.type === 'car' || item.type === 'vehicle');
            var icon = isVehicle ? '🏎️' : (item.type === 'fuel' ? '⛽' : (item.type === 'tickets' ? '🎟️' : (item.type === 'stars' ? '⭐' : (item.type === 'free_impound' ? '🚔' : (item.type === 'xp' ? '🎖️' : '📦')))));
            var timeStr = item.date ? item.date : "Сегодня";

            var previewCarHtml = "";
            if (isVehicle && item.carData) {
                var c = item.carData;
                var cImg = c.img || "assets/cars/economy/2101/vaz-2101.jpg";
                var cVal = (c.marketValue || 100000).toLocaleString();
                previewCarHtml =
                    '<div class="deal-car-preview-card my-1" style="height:62px;">' +
                        '<img src="' + cImg + '" class="deal-car-thumb" style="width:75px; height:50px;">' +
                        '<div style="flex:1; min-width:0;">' +
                            '<b class="text-xs color-cyan block" style="font-size:11px;">' + (c.name || 'Автомобиль') + '</b>' +
                            '<div class="sub-label" style="font-size:8.5px;">Мощность: ' + (c.power || 100) + ' л.с. | Кузов: ' + (c.condition || 80) + '%</div>' +
                            '<div class="price-val color-green text-xs" style="font-size:11px;">Оценка: ' + cVal + ' ₽</div>' +
                        '</div>' +
                    '</div>';
            }

            // ⭐ v1.0.0: передаём itemId вместо idx
            var actionButtons = "";
            if (isVehicle) {
                actionButtons =
                    '<div class="grid-3 mt-2" style="gap:4px;">' +
                        '<button onclick="AppPost.unpackMailCarToGarage(\'' + itemId + '\')" class="btn btn-green btn-sm" style="font-size:9px; padding:6px 2px;">' +
                            '<i class="fa-solid fa-warehouse"></i> В гараж' +
                        '</button>' +
                        '<button onclick="AppPost.unpackMailCarToWarehouse(\'' + itemId + '\')" class="btn btn-cyan btn-sm" style="font-size:9px; padding:6px 2px;">' +
                            '<i class="fa-solid fa-box-archive"></i> На склад' +
                        '</button>' +
                        '<button onclick="AppPost.sellMailCarInstantly(\'' + itemId + '\')" class="btn btn-dark btn-sm" style="font-size:9px; padding:6px 2px;">' +
                            '<i class="fa-solid fa-ruble-sign"></i> Продать' +
                        '</button>' +
                    '</div>';
            } else {
                actionButtons =
                    '<button onclick="AppPost.claimSingleMailItem(\'' + itemId + '\')" class="btn btn-green btn-sm w-full mt-2" style="font-size:10px;">' +
                        'Распаковать посылку ✓' +
                    '</button>';
            }

            html +=
                '<div class="glass-card p-2" style="border-left: 3px solid ' + (isVehicle ? 'var(--amber)' : 'var(--cyan)') + ';">' +
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

    // ⭐ v1.0.0: принимает itemId вместо индекса
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
            state.player.toolsWear[item.toolId] = 80;
        } else if (item.type === 'plate') {
            if (!state.ownedPlates) state.ownedPlates = [];
            state.ownedPlates.push(item.plate || "А777АА 77");
        }

        // Удаляем по id
        state.player.mailbox = state.player.mailbox.filter(m => m && m.id !== itemId);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast("Посылка «" + (item.title || '') + "» распакована!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    claimAllMailAction: function() {
        var box = state.player && state.player.mailbox ? state.player.mailbox : [];
        var claimedCount = 0;
        var toRemoveIds = [];

        for (var i = 0; i < box.length; i++) {
            var item = box[i];
            if (!item || item.claimed) continue;
            if (item.type === 'car' || item.type === 'vehicle') continue;

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
                state.player.toolsWear[item.toolId] = 80;
            } else if (item.type === 'plate') {
                if (!state.ownedPlates) state.ownedPlates = [];
                state.ownedPlates.push(item.plate || "А777АА 77");
            }

            if (item.id) {
                toRemoveIds.push(item.id);
                claimedCount++;
            }
        }

        if (toRemoveIds.length > 0) {
            state.player.mailbox = state.player.mailbox.filter(m => m && !toRemoveIds.includes(m.id));
        }

        if (claimedCount > 0) {
            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');
            if (typeof showToast === 'function') showToast("Распаковано посылок: +" + claimedCount + " шт.");
        } else {
            if (typeof showToast === 'function') showToast("Остался только транспорт — выберите место стоянки вручную.");
        }

        this.render(document.getElementById('phoneAppContainer'));
    },

    // ⭐ v1.0.0: принимает itemId
    unpackMailCarToGarage: function(itemId) {
        var item = this._findMailItemById(itemId);
        if (!item || !item.carData) {
            if (typeof showToast === 'function') showToast("❌ Машина не найдена в посылке");
            return;
        }

        var maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
        var curSlots = state.garage ? state.garage.length : 0;

        if (curSlots >= maxSlots) {
            if (typeof showToast === 'function') showToast("В основном гараже нет свободных мест! Отправьте авто на Склад.");
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

    // ⭐ v1.0.0: принимает itemId
    unpackMailCarToWarehouse: function(itemId) {
        var item = this._findMailItemById(itemId);
        if (!item || !item.carData) {
            if (typeof showToast === 'function') showToast("❌ Машина не найдена в посылке");
            return;
        }

        var stored = state.player.warehouse.cars || [];
        var maxStored = state.player.warehouse.maxCars || 6;

        if (stored.length >= maxStored) {
            if (typeof showToast === 'function') showToast("Склад заполнен (" + stored.length + "/" + maxStored + ")! Расширьте склад.");
            return;
        }

        var car = item.carData;
        car.isStoredInWarehouse = true;
        stored.push(car);
        state.player.mailbox = state.player.mailbox.filter(m => m && m.id !== itemId);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast("«" + car.name + "» законсервирован на Складе хранения!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ⭐ v1.0.0: принимает itemId
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

    renderWarehouseScreen: function(container) {
        if (!container) return;

        var storedCars = state.player.warehouse.cars || [];
        var maxCars = state.player.warehouse.maxCars || 6;

        var headerHtml =
            '<div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(0, 242, 254, 0.14), #090e18); border-color: var(--cyan);">' +
                '<div>' +
                    '<b class="text-xs color-cyan"><i class="fa-solid fa-warehouse"></i> Складской Терминал:</b>' +
                    '<div class="sub-label" style="font-size:8.5px;">Занято: <b>' + storedCars.length + ' из ' + maxCars + '</b> (Не облагается налогом)</div>' +
                '</div>' +
                '<button onclick="AppPost.upgradeWarehouseCapacity()" class="btn btn-cyan btn-auto btn-sm" style="font-size:9px;">' +
                    '+2 Места (120k)' +
                '</button>' +
            '</div>' +
            '<div class="sub-label mb-1" style="font-size:9px;">Законсервированные автомобили на складе:</div>';

        if (storedCars.length === 0) {
            container.innerHTML = headerHtml +
                '<div class="glass-card text-center sub-label py-6">' +
                    '<i class="fa-solid fa-box-archive color-cyan mb-2" style="font-size:26px;"></i>' +
                    '<div>На складе нет законсервированных машин.</div>' +
                    '<div style="font-size:9px; margin-top:3px;">Сюда можно отправлять автомобили с Почты или перемещать из гаража.</div>' +
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
                        '<img src="' + cImg + '" class="deal-car-thumb" style="width:75px; height:50px;">' +
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

        container.innerHTML = headerHtml + listHtml;
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
    }
};

// ⭐ v1.0.0: единая каноническая версия pushToMailbox
// (в app.js её нужно удалить — см. патч app.js)
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

    // Гарантируем уникальность id
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

console.log('[📬 phone-post v1.0.0] ID-based обработка писем + защита от сдвига индексов ✓');
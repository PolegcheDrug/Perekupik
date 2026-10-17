// ========================================================
// js/phone-housing.js — НЕДВИЖИМОСТЬ, ЖИЛЬЁ И БОКСЫ (v1.2.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.2.0 (SPRINT 2 — ФИКС E3):
//   - ФИКС E3: buyHouse проверяет владение перед списанием.
//     Нельзя купить одно жильё дважды.
//   - rentHouse: повторная аренда того же жилья блокируется
//   - buyInteriorItem: защита от повторной покупки одного предмета
//   - moveToHouse: если игрок уже здесь — короткое сообщение и выход
// ⭐ v1.1.0 (КРИТИЧЕСКИЙ ФИКС):
//   - ФИКС: applyHousingBonuses больше НЕ мутирует mood.
//     Раньше игрок мог кликать moveToHouse много раз и
//     накручивать mood до 100. Теперь mood-бонус жилья
//     применяется ЕЖЕДНЕВНО в app.js → executeDayCycleMidnight.
//   - ФИКС: moveToHouse блокирует переезд в не-своё жильё.
//   - ФИКС: buyInteriorItem вызывает ensureHousingState перед
//     работой с interior (защита от null).
//   - ФИКС: render() обёрнут в try/catch.
//   - ФИКС: все методы защищены от !state.player.
//   - Улучшение: в buyHouse логируется встроенное число
//     слотов из HOUSING_LIST.
// ⭐ v1.5.0 (базовая):
//   - Каталог HOUSING_LIST с 14 объектами.
// ⭐ v1.0.0:
//   - Первая версия.
// ========================================================

const PhoneHousing = {
    activeTab: 'catalog', // 'catalog' | 'my_home'

    getHousingDatabase() {
        if (typeof HOUSING_LIST !== 'undefined' && Array.isArray(HOUSING_LIST) && HOUSING_LIST.length > 0) {
            return HOUSING_LIST;
        }
        // Fallback (минимальный набор, если data_economy.js не загружен)
        return [
            {
                id: 'trailer', name: 'Бытовка на стройплощадке', category: 'street',
                rent: 600, buyPrice: 350000, reqStars: 0, slots: 0, moodBonus: -5, minLevel: 1,
                perk: 'Только ночлег. Доработки и ремонт невозможны.',
                desc: 'Временный строительный вагончик у обочины. Сквозняки, верстака нет.',
                img: 'assets/houses/trailer.jpg',
                fallback: 'https://images.unsplash.com/photo-1590725140246-201552a488c9?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'gsk_box', name: 'Стандартный бокс в ГСК-7', category: 'box',
                rent: 6500, buyPrice: 1500000, reqStars: 12, slots: 2, moodBonus: 8, minLevel: 4,
                perk: 'Смотровая яма, электричество 220V, верстак.',
                desc: 'Настоящее логово перекупа! Сухая яма, верстак и диодное освещение.',
                img: 'assets/houses/garage.jpg',
                fallback: 'https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'villa', name: 'Особняк на Рублёвке', category: 'estate',
                rent: 600000, buyPrice: 420000000, reqStars: 160, slots: 18, moodBonus: 85, minLevel: 70,
                perk: 'Свой автосервисный цех, малярная камера, охрана ЧОП.',
                desc: 'Гектар соснового бора, собственный автосервис на 4 поста.',
                img: 'assets/houses/villa.jpg',
                fallback: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80'
            }
        ];
    },

    ensureHousingState() {
        if (!state) return;
        if (!state.player) state.player = {};
        if (!state.player.housingId) state.player.housingId = 'trailer';
        if (!state.player.housingType) state.player.housingType = 'own';
        if (!Array.isArray(state.player.ownedHouses)) {
            state.player.ownedHouses = ['trailer'];
        }
        if (!state.player.ownedHouses.includes('trailer')) {
            state.player.ownedHouses.push('trailer');
        }
        if (!state.player.interior || typeof state.player.interior !== 'object') {
            state.player.interior = {};
        }
    },

    render(container) {
        if (!container) return;

        try {
            this.ensureHousingState();

            const db = this.getHousingDatabase();
            const currentHouseId = state.player.housingId || 'trailer';
            const currentHouse = db.find(h => h.id === currentHouseId) || db[0];
            const ownedList = state.player.ownedHouses || ['trailer'];

            let tabsHtml = `
                <div class="grid-2 mb-2">
                    <button onclick="PhoneHousing.switchTab('catalog')" class="btn ${this.activeTab === 'catalog' ? 'btn-teal' : 'btn-dark'} btn-sm">
                        <i class="fa-solid fa-list-ul mr-1"></i> Каталог Объектов 🏢
                    </button>
                    <button onclick="PhoneHousing.switchTab('my_home')" class="btn ${this.activeTab === 'my_home' ? 'btn-teal' : 'btn-dark'} btn-sm">
                        <i class="fa-solid fa-house-user mr-1"></i> Моё Жильё & Мебель 🛋️
                    </button>
                </div>
            `;

            let contentHtml = "";
            if (this.activeTab === 'catalog') {
                contentHtml = this.renderCatalogHtml(db, currentHouseId, ownedList);
            } else {
                contentHtml = this.renderMyHomeHtml(currentHouse);
            }

            container.innerHTML = `
                <div class="phone-app-header">
                    <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                    <div class="phone-app-title color-teal"><i class="fa-solid fa-house mr-1"></i> Недвижимость & Боксы</div>
                    <div style="width:40px;"></div>
                </div>

                <div class="phone-app-body">
                    ${tabsHtml}
                    ${contentHtml}
                </div>
            `;
        } catch (e) {
            console.error('[PhoneHousing] Ошибка рендера:', e);
            container.innerHTML = `
                <div class="phone-app-header">
                    <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Меню</button>
                    <div class="phone-app-title color-teal">Недвижимость</div>
                    <div style="width:40px;"></div>
                </div>
                <div class="phone-app-body">
                    <div class="glass-card p-3 text-center" style="border-color: var(--red);">
                        <div style="font-size:32px; margin-bottom:8px;">⚠️</div>
                        <b class="color-red text-xs">Ошибка недвижимости</b>
                        <div class="sub-label mt-1" style="font-size:9.5px;">${String(e.message || e).substring(0, 120)}</div>
                    </div>
                </div>
            `;
        }
    },

    switchTab(tab) {
        this.activeTab = tab;
        if (typeof playSound === 'function') playSound('tick');
        this.render(document.getElementById('phoneAppContainer'));
    },

    renderCatalogHtml(db, currentHouseId, ownedList) {
        let pLvl = state.player?.level || 1;

        let cards = db.map(h => {
            const isCurrent = h.id === currentHouseId;
            const isOwned = ownedList.includes(h.id);
            const isLvlLocked = pLvl < (h.minLevel || 1);

            let price = h.buyPrice || h.price || 0;
            let rent = h.rent || h.rentPerDay || 0;
            let slots = h.slots !== undefined ? h.slots : (h.slotsBonus || 0);
            let mood = h.moodBonus || 0;
            let reqStars = h.reqStars || 0;
            let starsTxt = reqStars > 0 ? ` + ${reqStars} ⭐` : "";

            let rawImg = h.img || 'assets/houses/trailer.jpg';
            let houseImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
            let fallbackImg = h.fallback || 'https://images.unsplash.com/photo-1590725140246-201552a488c9?auto=format&fit=crop&w=600&q=80';

            let actionBtn = "";
            if (isLvlLocked) {
                actionBtn = `<button class="btn btn-dark btn-sm w-full opacity-50" disabled>🔒 С ${h.minLevel} уровня авторитета</button>`;
            } else if (isCurrent) {
                actionBtn = `<button class="btn btn-dark btn-sm w-full opacity-60" disabled><i class="fa-solid fa-check mr-1"></i> Вы находитесь здесь</button>`;
            } else if (isOwned) {
                actionBtn = `<button onclick="PhoneHousing.moveToHouse('${h.id}')" class="btn btn-cyan btn-sm w-full"><i class="fa-solid fa-truck-ramp-box mr-1"></i> Переехать сюда (В собственности)</button>`;
            } else {
                actionBtn = `
                    <div class="grid-2" style="gap:6px;">
                        <button onclick="PhoneHousing.buyHouse('${h.id}')" class="btn btn-green btn-sm" style="font-weight:900;">
                            Купить (${price.toLocaleString()} ₽${starsTxt})
                        </button>
                        <button onclick="PhoneHousing.rentHouse('${h.id}')" class="btn btn-dark btn-sm">
                            Аренда (${rent.toLocaleString()} ₽/д)
                        </button>
                    </div>
                `;
            }

            let catColor = h.category === 'box' ? '#c084fc' : (h.category === 'estate' ? '#fbbf24' : (h.category === 'living' ? '#38bdf8' : '#94a3b8'));

            return `
                <div class="glass-card p-3 mb-2" style="border-left: 3px solid ${catColor}; background: ${isCurrent ? 'rgba(45, 212, 191, 0.08)' : '#090e18'};">
                    <div class="car-img-wrap mb-2" style="height:130px; position:relative;">
                        <img src="${houseImg}" class="car-img" onerror="this.onerror=null; this.src='${fallbackImg}';">
                        <div class="badge-tag badge-br">
                            <span class="tag-badge ${isCurrent ? 'bg-tag-green' : (isOwned ? 'bg-tag-cyan' : 'bg-tag-dark')}">
                                ${isCurrent ? 'АКТИВНОЕ' : (isOwned ? 'КУПЛЕНО' : 'ПРОДАЁТСЯ')}
                            </span>
                        </div>
                    </div>

                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs" style="color:${isCurrent ? 'var(--teal)' : '#fff'}; font-size:13px;">${h.name}</b>
                            <div class="sub-label" style="font-size:9px;">
                                ${isOwned ? 'В собственности ✓' : `Покупка: ${price.toLocaleString()} ₽${starsTxt}`}
                            </div>
                        </div>
                        <span class="tag-badge bg-tag-cyan">+${slots} боксов</span>
                    </div>

                    <div class="sub-label my-2" style="font-size:9.5px; line-height:1.35;">${h.desc || h.perk || ''}</div>

                    <div class="grid-2 text-xs p-2 mb-2" style="background:rgba(0,0,0,0.45); border-radius:8px;">
                        <div>Машиномест: <b class="color-cyan">+${slots} мест</b></div>
                        <div>Кураж в полночь: <b class="${mood >= 0 ? 'color-green' : 'color-red'}">${mood >= 0 ? '+' : ''}${mood}%</b></div>
                    </div>

                    ${actionBtn}
                </div>
            `;
        }).join('');

        return `
            <div class="sub-label mb-2" style="font-size:10px;">
                Покупка недвижимости и боксов ГСК открывает слоты для автопарка, верстаки для тюнинга и перки настроения:
            </div>
            ${cards}
        `;
    },

    renderMyHomeHtml(currentHouse) {
        this.ensureHousingState();
        const interiorItems = state.player.interior?.[currentHouse.id] || [];
        const catalogItems = (typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.homeItems)
            ? SHOP_CATALOG.homeItems
            : [
                { id: "home_ps5", name: "Игровая консоль PlayStation 5", cost: 75000, reqStars: 5, perk: "+25% настроения в полночь" },
                { id: "home_leather_sofa", name: "Кожаный диван в клиентскую зону", cost: 120000, reqStars: 8, perk: "+15% к восстановлению сил" },
                { id: "home_garage_lift", name: "Гидравлический автоподъёмник (4т)", cost: 320000, reqStars: 20, perk: "Ускоряет ремонт на 50%" },
                { id: "home_safe_valberg", name: "Огнеупорный сейф перекупа", cost: 180000, reqStars: 10, perk: "100% защита заначки наличных" },
                { id: "home_cctv", name: "Система видеонаблюдения 4K", cost: 140000, reqStars: 8, perk: "Снижает риск угона до 0%" }
            ];

        let interiorListHtml = catalogItems.map(item => {
            const hasItem = interiorItems.includes(item.id);
            return `
                <div class="glass-card p-2 flex-between mb-1" style="background:#090e18;">
                    <div>
                        <b class="text-xs ${hasItem ? 'color-green' : ''}">${item.name}</b>
                        <div class="sub-label" style="font-size:8.5px;">${item.perk || item.desc || ''}</div>
                    </div>
                    ${hasItem ? `
                        <span class="tag-badge bg-tag-green">УСТАНОВЛЕНО</span>
                    ` : `
                        <button onclick="PhoneHousing.buyInteriorItem('${currentHouse.id}', '${item.id}', ${item.cost})" class="btn btn-dark btn-sm btn-auto" style="padding:4px 8px; font-size:9.5px;">
                            Купить (${item.cost.toLocaleString()} ₽)
                        </button>
                    `}
                </div>
            `;
        }).join('');

        let catColor = currentHouse.category === 'box' ? '#c084fc' : (currentHouse.category === 'estate' ? '#fbbf24' : '#38bdf8');
        let slots = currentHouse.slots !== undefined ? currentHouse.slots : (currentHouse.slotsBonus || 0);

        let rawImg = currentHouse.img || 'assets/houses/trailer.jpg';
        let houseImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
        let fallbackImg = currentHouse.fallback || 'https://images.unsplash.com/photo-1590725140246-201552a488c9?auto=format&fit=crop&w=600&q=80';

        return `
            <div class="glass-card p-3 mb-2 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(45, 212, 191, 0.18), #090e18); border-color: var(--teal);">
                <div class="car-img-wrap mb-2" style="height:140px; border-radius:12px; border:2px solid ${catColor};">
                    <img src="${houseImg}" class="car-img" onerror="this.onerror=null; this.src='${fallbackImg}';">
                </div>
                <h3 class="font-bold color-teal mb-1">${currentHouse.name}</h3>
                <div class="sub-label mb-2" style="font-size:10px;">Текущая локация проживания и хранения авто</div>

                <div class="grid-3 text-xs p-2 mb-1" style="background:#050811; border-radius:8px;">
                    <div>Боксов: <b class="color-cyan">+${slots}</b></div>
                    <div>Кураж: <b class="color-green">+${currentHouse.moodBonus || 0}%</b></div>
                    <div>Интерьер: <b class="color-amber">${interiorItems.length}/${catalogItems.length}</b></div>
                </div>
            </div>

            <b class="text-xs color-teal block mb-1"><i class="fa-solid fa-couch mr-1"></i> Обустройство и мебель:</b>
            <div class="space-y-1 mb-2">
                ${interiorListHtml}
            </div>
        `;
    },

    // --------------------------------------------------------
    // ПОКУПКА ДОМА
    // ⭐ v1.2.0 (ФИКС E3): защита от повторной покупки того же жилья
    // --------------------------------------------------------
    buyHouse(houseId) {
        this.ensureHousingState();
        const db = this.getHousingDatabase();
        const target = db.find(h => h.id === houseId);
        if (!target) return showToast("❌ Объект не найден!");

        // ⭐ ФИКС E3: проверка — не куплено ли уже
        const alreadyOwned = (state.player.ownedHouses || []).includes(houseId);
        if (alreadyOwned) {
            if (typeof playSound === 'function') playSound('tick');
            if (typeof tgHaptic === 'function') tgHaptic('light');
            return showToast(`✅ Жильё «${target.name}» уже в вашей собственности!`);
        }

        let price = target.buyPrice || target.price || 0;
        let reqStars = target.reqStars || 0;
        let cash = state.player.cash || 0;
        let stars = state.player.stars || 0;

        if (cash < price) {
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('error');
            return showToast(`Не хватает денег на покупку! Нужно: ${price.toLocaleString()} ₽`);
        }

        if (stars < reqStars) {
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('error');
            return showToast(`Требуется ${reqStars} Stars ⭐!`);
        }

        state.player.cash -= price;
        if (reqStars > 0) state.player.stars -= reqStars;

        // ⭐ ФИКС E3: двойная защита от дубликата
        if (!state.player.ownedHouses.includes(houseId)) {
            state.player.ownedHouses.push(houseId);
        }

        state.player.housingId = houseId;
        state.player.housingType = 'own';

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Покупка недвижимости: ${target.name}`, price, false);
        }

        // Mood-бонус применится ежедневно в app.js → executeDayCycleMidnight
        // (не мутируем mood вручную, чтобы не накрутить его кликами)

        const slotsGranted = target.slots !== undefined ? target.slots : (target.slotsBonus || 0);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        if (typeof openVerdictModal === 'function') {
            openVerdictModal(
                "НОВОСЕЛЬЕ! 🏢",
                `Поздравляем с покупкой «${target.name}»!\n• Вместимость гаража: +${slotsGranted} мест\n• Бонусы куража активируются в полночь (ежедневно)\n• Тюнинг-посты и скидки Решалы доступны в этом жилье!`,
                true,
                price
            );
        }

        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // АРЕНДА ДОМА
    // ⭐ v1.2.0: повторная аренда того же жилья блокируется
    // --------------------------------------------------------
    rentHouse(houseId) {
        this.ensureHousingState();
        const db = this.getHousingDatabase();
        const target = db.find(h => h.id === houseId);
        if (!target) return showToast("❌ Объект не найден!");

        // ⭐ ФИКС: если игрок уже здесь и арендует — не брать залог повторно
        if (state.player.housingId === houseId && state.player.housingType === 'rent') {
            if (typeof playSound === 'function') playSound('tick');
            return showToast(`✅ Вы уже арендуете «${target.name}»!`);
        }

        let rent = target.rent || target.rentPerDay || 0;
        let deposit = rent * 3;
        let cash = state.player.cash || 0;

        if (cash < deposit) {
            return showToast(`Нужно ${deposit.toLocaleString()} ₽ на аренду и залог на 3 дня!`);
        }

        state.player.cash -= deposit;
        state.player.housingId = houseId;
        state.player.housingType = 'rent';
        state.player.housingRentDue = (state.player.day || 1) + 3;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Аренда жилья (3 дня): ${target.name}`, deposit, false);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        showToast(`Вы сняли «${target.name}» на 3 дня! (-${deposit.toLocaleString()} ₽)`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // ПЕРЕЕЗД
    // ⭐ v1.2.0: короткое сообщение, если игрок уже здесь
    // --------------------------------------------------------
    moveToHouse(houseId) {
        this.ensureHousingState();
        const db = this.getHousingDatabase();
        const target = db.find(h => h.id === houseId);
        if (!target) return showToast("❌ Объект не найден!");

        // ⭐ ФИКС: уже здесь — не делать лишнюю работу
        if (state.player.housingId === houseId) {
            if (typeof playSound === 'function') playSound('tick');
            return showToast(`✅ Вы уже находитесь в «${target.name}»`);
        }

        // Проверка прав: нельзя переехать в чужое
        const isOwned = (state.player.ownedHouses || []).includes(houseId);
        const isCurrentRent = (state.player.housingId === houseId && state.player.housingType === 'rent');

        if (!isOwned && !isCurrentRent) {
            return showToast("🔒 Сначала купите или арендуйте это жильё!");
        }

        state.player.housingId = houseId;
        state.player.housingType = isOwned ? 'own' : 'rent';

        // Mood-бонус применится в executeDayCycleMidnight

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');

        showToast(`Вы успешно переехали в «${target.name}»!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // ПОКУПКА МЕБЕЛИ / ИНТЕРЬЕРА
    // ⭐ v1.2.0: защита от повторной покупки одного предмета
    // --------------------------------------------------------
    buyInteriorItem(houseId, itemId, cost) {
        this.ensureHousingState();
        if (!state.player) return;

        // ⭐ ФИКС: защита от дубликата
        if (!state.player.interior || typeof state.player.interior !== 'object') {
            state.player.interior = {};
        }
        if (!Array.isArray(state.player.interior[houseId])) {
            state.player.interior[houseId] = [];
        }

        if (state.player.interior[houseId].includes(itemId)) {
            if (typeof playSound === 'function') playSound('tick');
            return showToast("✅ Этот предмет уже установлен!");
        }

        let cash = state.player.cash || 0;
        if (cash < cost) {
            return showToast(`Нужно ${cost.toLocaleString()} ₽ на покупку предмета интерьера!`);
        }

        state.player.cash -= cost;

        // Добавляем в интерьер
        state.player.interior[houseId].push(itemId);

        // Разово даём +15 mood за установку (это не «накрутка», а сюрприз)
        state.player.mood = Math.min(100, (state.player.mood || 80) + 15);

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Мебель: ${itemId}`, cost, false);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        showToast("Мебель установлена! Настроение повышено.");
        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // applyHousingBonuses больше НЕ мутирует mood
    // --------------------------------------------------------
    // Раньше: state.player.mood += houseObj.moodBonus → можно
    //         было накрутить mood до 100, переключаясь между домами.
    // Теперь: функция только валидирует и логирует. Mood-бонус
    //         применяется ежедневно в app.js → executeDayCycleMidnight.
    // --------------------------------------------------------
    applyHousingBonuses(houseObj) {
        if (!houseObj) return;
        // Проверка, что слоты действительно пересчитываются на лету
        // через getTotalGarageSlots (уже учитывает housingId).
        if (typeof getTotalGarageSlots === 'function') {
            const slots = getTotalGarageSlots();
            console.log(`[Housing] Слотов гаража сейчас: ${slots} (housingId=${state.player?.housingId})`);
        }
    }
};

window.PhoneHousing = PhoneHousing;
window.AppHousing = PhoneHousing;

console.log('[🏠 phone-housing v1.2.0] ФИКС E3: защита от дубликатов в buyHouse/rentHouse/buyInteriorItem/moveToHouse ✓');

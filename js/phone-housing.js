// ========================================================
// js/phone-housing.js — НЕДВИЖИМОСТЬ, ЖИЛЬЁ И БОКСЫ (v1.4.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Восстановлены фото-обложки недвижимости, синхронизация с
// базой data.js, покупка, аренда, перки и интерьер.
// ========================================================

const PhoneHousing = {
    activeTab: 'catalog', // 'catalog' | 'my_home'

    getHousingDatabase() {
        if (typeof HOUSING_LIST !== 'undefined' && Array.isArray(HOUSING_LIST) && HOUSING_LIST.length > 0) {
            return HOUSING_LIST;
        }
        return [
            { 
                id: 'trailer', name: 'Бытовка на стройплощадке', category: 'street', rent: 800, buyPrice: 450000, 
                slots: 0, moodBonus: -5, minLevel: 1, perk: 'Только ночлег. Доработки и тюнинг невозможны.', 
                desc: 'Временный строительный вагончик у обочины. Сквозняки, верстака нет. Автомобили стоят под открытым небом.', 
                img: 'assets/houses/trailer.jpg', fallback: 'https://images.unsplash.com/photo-1590725140246-201552a488c9?auto=format&fit=crop&w=600&q=80'
            },
            { 
                id: 'room', name: 'Комната в общежитии', category: 'living', rent: 2500, buyPrice: 1800000, 
                slots: 1, moodBonus: 5, minLevel: 2, perk: 'Одно машиноместо во дворе. Разрешена замена масла.', 
                desc: 'Комната в спальном районе. Автомобиль стоит под окнами. Мелкий сервисный ремонт разрешён.', 
                img: 'assets/houses/room.jpg', fallback: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'
            },
            { 
                id: 'gsk_box', name: 'Стандартный бокс в ГСК-7', category: 'box', rent: 9000, buyPrice: 1600000, 
                slots: 2, moodBonus: 8, minLevel: 4, perk: 'Смотровая яма, электричество 220V, верстак со слесарными тисками.', 
                desc: 'Настоящее логово перекупа! Сухая яма, верстак и диодное освещение. Открывает корчевание и диагностику ЭБУ.', 
                img: 'assets/houses/garage.jpg', fallback: 'https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?auto=format&fit=crop&w=600&q=80'
            },
            { 
                id: 'khrusch', name: 'Убитая "Хрущевка"', category: 'living', rent: 15000, buyPrice: 4500000, 
                slots: 1, moodBonus: 10, minLevel: 6, perk: 'Уютный сон, быстрое восстановление настроения, парковка во дворе.', 
                desc: 'Бабушкин ремонт, старый скрипучий паркет, зато своя ванна и кухня. Машина паркуется во дворе под фонарём.', 
                img: 'assets/houses/khrusch.jpg', fallback: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'
            },
            { 
                id: 'garage', name: 'Двойной бокс с ямой и печкой', category: 'box', rent: 22000, buyPrice: 3200000, 
                slots: 3, moodBonus: 14, minLevel: 8, perk: 'Сварка, полировальный пост, печь на отработке и 3 свободных машиноместа.', 
                desc: 'Широкий бокс с печью, верстаком, компрессором и мойкой. Позволяет готовить тачки к продаже под ключ.', 
                img: 'assets/houses/garage.jpg', fallback: 'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?auto=format&fit=crop&w=600&q=80'
            },
            { 
                id: 'dvushka', name: 'Двушка в спальном районе', category: 'living', rent: 28000, buyPrice: 8500000, 
                slots: 2, moodBonus: 18, minLevel: 14, perk: 'Закреплённое парковочное место со шлагбаумом во дворе.', 
                desc: 'Кирпичный дом, стеклопакеты, видеонаблюдение за парковкой. Высокий комфорт проживания.', 
                img: 'assets/houses/dvushka.jpg', fallback: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80'
            },
            { 
                id: 'workshop_pro', name: 'Тюнинг-Ангар с подъёмником', category: 'box', rent: 55000, buyPrice: 12000000, 
                slots: 5, moodBonus: 22, minLevel: 20, perk: 'Двухстоечный подъёмник, камера обдува, скидка 20% на услуги Решалы!', 
                desc: 'Коммерческий цех в промзоне. Подъёмник, мощная приточка, возможность отмывать VIN дешевле.', 
                img: 'assets/houses/workshop.jpg', fallback: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80'
            },
            { 
                id: 'cottage', name: 'Коттедж за городом с гаражом', category: 'estate', rent: 75000, buyPrice: 24000000, 
                slots: 7, moodBonus: 35, minLevel: 32, perk: 'Свой закрытый двор на 7 авто, тёплый гараж, зона отдыха и барбекю.', 
                desc: 'Собственный участок, трёхфазная сеть 380V, смотровая яма и мойка высокого давления.', 
                img: 'assets/houses/cottage.jpg', fallback: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80'
            },
            { 
                id: 'penthouse', name: 'Пентхаус в Москва-Сити', category: 'estate', rent: 280000, buyPrice: 150000000, 
                slots: 8, moodBonus: 55, minLevel: 65, perk: 'Личный VIP-бокс на -3 этаже Башни с охраной, консьержем и мойкой.', 
                desc: 'Панорамный вид с 65 этажа, консьерж-сервис, охраняемый подземный гаражный комплекс.', 
                img: 'assets/houses/penthouse.jpg', fallback: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'
            },
            { 
                id: 'villa', name: 'Особняк на Рублёвке', category: 'estate', rent: 650000, buyPrice: 480000000, 
                slots: 18, moodBonus: 85, minLevel: 85, perk: 'Свой автосервисный цех, малярная камера, охрана ЧОП, скидка 35% у Решалы!', 
                desc: 'Гектар соснового бора, собственный автосервис на 4 поста, малярная камера и ангар для редких лотов.', 
                img: 'assets/houses/villa.jpg', fallback: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80'
            }
        ];
    },

    ensureHousingState() {
        if (!state.player) state.player = {};
        if (!state.player.housingId) state.player.housingId = 'trailer';
        if (!state.player.housingType) state.player.housingType = 'own';
        if (!Array.isArray(state.player.ownedHouses)) {
            state.player.ownedHouses = ['trailer'];
        }
        if (!state.player.ownedHouses.includes('trailer')) {
            state.player.ownedHouses.push('trailer');
        }
        if (!state.player.interior) {
            state.player.interior = {};
        }
    },

    render(container) {
        if (!container) return;
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
                            Купить (${price.toLocaleString()} ₽)
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
                    <!-- ВОССТАНОВЛЕННАЯ ОБЛОЖКА ОБЪЕКТА -->
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
                                ${isOwned ? 'В собственности ✓' : `Цена: ${price.toLocaleString()} ₽`}
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
        const interiorItems = state.player.interior?.[currentHouse.id] || [];
        const catalogItems = (typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.homeItems) 
            ? SHOP_CATALOG.homeItems 
            : INTERIOR_ITEMS;

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
                        <button onclick="PhoneHousing.buyInteriorItem('${currentHouse.id}', '${item.id}',${item.cost})" class="btn btn-dark btn-sm btn-auto" style="padding:4px 8px; font-size:9.5px;">
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

    buyHouse(houseId) {
        this.ensureHousingState();
        const db = this.getHousingDatabase();
        const target = db.find(h => h.id === houseId);
        if (!target) return;

        let price = target.buyPrice || target.price || 0;
        let cash = state.player.cash || 0;

        if (cash < price) {
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('error');
            return showToast(`Не хватает денег на покупку! Нужно: ${price.toLocaleString()} ₽`);
        }

        state.player.cash -= price;
        if (!state.player.ownedHouses.includes(houseId)) {
            state.player.ownedHouses.push(houseId);
        }

        state.player.housingId = houseId;
        state.player.housingType = 'own';

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Покупка недвижимости: ${target.name}`, price, false);
        }

        this.applyHousingBonuses(target);

        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        openVerdictModal(
            "НОВОСЕЛЬЕ! 🏢",
            `Поздравляем с покупкой «${target.name}»!\n• Вместимость гаража увеличена (+${target.slots || target.slotsBonus || 0} мест)\n• Бонусы куража активированы!`,
            true,
            price
        );

        this.render(document.getElementById('phoneAppContainer'));
    },

    rentHouse(houseId) {
        this.ensureHousingState();
        const db = this.getHousingDatabase();
        const target = db.find(h => h.id === houseId);
        if (!target) return;

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

        this.applyHousingBonuses(target);

        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        showToast(`Вы сняли «${target.name}» на 3 дня! (-${deposit.toLocaleString()} ₽)`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    moveToHouse(houseId) {
        this.ensureHousingState();
        const db = this.getHousingDatabase();
        const target = db.find(h => h.id === houseId);
        if (!target) return;

        state.player.housingId = houseId;
        state.player.housingType = state.player.ownedHouses.includes(houseId) ? 'own' : 'rent';

        this.applyHousingBonuses(target);

        saveState();
        updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');

        showToast(`Вы успешно переехали в «${target.name}»!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    buyInteriorItem(houseId, itemId, cost) {
        this.ensureHousingState();
        let cash = state.player.cash || 0;
        if (cash < cost) {
            return showToast(`Нужно ${cost.toLocaleString()} ₽ на покупку предмета интерьера!`);
        }

        state.player.cash -= cost;

        if (!state.player.interior[houseId]) {
            state.player.interior[houseId] = [];
        }

        if (!state.player.interior[houseId].includes(itemId)) {
            state.player.interior[houseId].push(itemId);
        }

        state.player.mood = Math.min(100, (state.player.mood || 80) + 15);

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        showToast("Мебель установлена! Настроение повышено.");
        this.render(document.getElementById('phoneAppContainer'));
    },

    applyHousingBonuses(houseObj) {
        if (typeof getTotalGarageSlots === 'function') {
            getTotalGarageSlots();
        }
        if (houseObj && houseObj.moodBonus) {
            state.player.mood = Math.min(100, (state.player.mood || 80) + houseObj.moodBonus);
        }
    }
};

window.PhoneHousing = PhoneHousing;
window.AppHousing = PhoneHousing;
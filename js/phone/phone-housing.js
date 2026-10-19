// ========================================================
// js/phone/phone-housing.js — НЕДВИЖИМОСТЬ, ЖИЛЬЁ И БОКСЫ (v2.0.0 PRO)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v2.0.0 (СУБАРЕНДА, ДОМАШНИЙ ВЕРСТАК И БЫТ ПЕРЕКУПА):
//   - СУБАРЕНДА НЕАКТИВНОГО ЖИЛЬЯ: Сдавайте купленные боксы и квартиры
//     в аренду другим жильцам и получайте ежедневный пассивный доход!
//   - БЫТ ПЕРЕКУПА В «МОЁ ЖИЛЬЁ»:
//       • ☕ Заварить кофе (+15% сытости и настроения).
//       • 🎮 Игра в PS5 (бафф настроения и куража перед рынком).
//       • 💰 Быстрый доступ к огнеупорному сейфу Valberg.
//       • 📹 Видеомониторинг периметра 4K (нулевой риск угона).
//   - ДОМАШНИЙ ВЕРСТАК И УХОД: Бесплатная мойка из шланга, замена свечей
//     и заливка присадки в мотор прямо в боксе.
//   - СОХРАНЕНО: Полный каталог 14 объектов и расчет слотов автопарка.
// ========================================================

const PhoneHousing = {
    activeTab: 'catalog', // 'catalog' | 'my_home'
    selectedWorkbenchCarIdx: 0,

    init() {
        this.ensureHousingState();
        this.processHousingDailyRent();
        this._bindEvents();
    },

    _bindEvents() {
        if (!window.EventBus) return;
        window.EventBus.on('day:passed', () => this.processHousingDailyRent());
        window.EventBus.on('app:resume', () => this.processHousingDailyRent());
    },

    getHousingDatabase() {
        const globalList = (typeof window !== 'undefined' && window.HOUSING_LIST) || 
                           (typeof HOUSING_LIST !== 'undefined' ? HOUSING_LIST : null);
        if (Array.isArray(globalList) && globalList.length >= 14) {
            return globalList;
        }

        const fullDatabase = [
            {
                id: 'trailer',
                name: 'Бытовка на стройплощадке',
                category: 'street',
                typeLabel: 'Временная стоянка',
                rent: 600,
                buyPrice: 350000,
                reqStars: 0,
                slots: 0,
                slotsBonus: 0,
                moodBonus: -5,
                minLevel: 1,
                canTune: false,
                canDetail: false,
                canService: false,
                canOBDGarage: false,
                hasPersonalSlot: false,
                reshalaDiscountPct: 0,
                subletIncome: 350,
                perk: 'Только ночлег. Доработки и ремонт невозможны.',
                desc: 'Временный строительный вагончик у обочины. Сквозняки, верстака нет. Автомобили стоят под открытым небом.',
                img: 'assets/houses/trailer.jpg',
                fallback: 'https://images.unsplash.com/photo-1590725140246-201552a488c9?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'shed_yard',
                name: 'Навес у частного дома',
                category: 'street',
                typeLabel: 'Уличный навес',
                rent: 1400,
                buyPrice: 750000,
                reqStars: 5,
                slots: 1,
                slotsBonus: 1,
                moodBonus: 0,
                minLevel: 2,
                canTune: false,
                canDetail: false,
                canService: true,
                canOBDGarage: false,
                hasPersonalSlot: false,
                reshalaDiscountPct: 0,
                subletIncome: 900,
                perk: '1 машиноместо под навесом. Доступна замена масел и свечей.',
                desc: 'Деревянный навес от дождя. Есть розетка 220V и базовый набор гаечных ключей.',
                img: 'assets/houses/room.jpg',
                fallback: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'room',
                name: 'Комната в общежитии + Двор',
                category: 'living',
                typeLabel: 'Жильё + Двор',
                rent: 2200,
                buyPrice: 1300000,
                reqStars: 8,
                slots: 1,
                slotsBonus: 1,
                moodBonus: 4,
                minLevel: 3,
                canTune: false,
                canDetail: false,
                canService: true,
                canOBDGarage: false,
                hasPersonalSlot: false,
                reshalaDiscountPct: 0,
                subletIncome: 1500,
                perk: 'Одно машиноместо во дворе. Разрешена замена расходников.',
                desc: 'Комната в спальном районе. Автомобиль стоит под окнами на асфальте.',
                img: 'assets/houses/room.jpg',
                fallback: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'gsk_box',
                name: 'Стандартный бокс в ГСК-7',
                category: 'box',
                typeLabel: 'Капитальный бокс ГСК',
                rent: 6500,
                buyPrice: 1500000,
                reqStars: 12,
                slots: 2,
                slotsBonus: 2,
                moodBonus: 8,
                minLevel: 4,
                canTune: true,
                canDetail: false,
                canService: true,
                canOBDGarage: true,
                hasPersonalSlot: true,
                reshalaDiscountPct: 5,
                subletIncome: 4500,
                perk: 'Смотровая яма, электричество 220V, верстак со слесарными тисками.',
                desc: 'Настоящее логово перекупа! Сухая яма, верстак и диодное освещение. Открывает диагностику и тюнинг.',
                img: 'assets/houses/garage.jpg',
                fallback: 'https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'khrusch',
                name: 'Квартира в "Хрущевке"',
                category: 'living',
                typeLabel: 'Городское жильё',
                rent: 12000,
                buyPrice: 3800000,
                reqStars: 15,
                slots: 1,
                slotsBonus: 1,
                moodBonus: 10,
                minLevel: 5,
                canTune: false,
                canDetail: false,
                canService: true,
                canOBDGarage: false,
                hasPersonalSlot: false,
                reshalaDiscountPct: 0,
                subletIncome: 8000,
                perk: 'Уютный сон, быстрое восстановление настроения (+10).',
                desc: 'Своя кухня, душ и спокойный сон. Машина паркуется во дворе под фонарём.',
                img: 'assets/houses/khrusch.jpg',
                fallback: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'garage',
                name: 'Двойной бокс с ямой и печкой',
                category: 'box',
                typeLabel: 'Слесарная мастерская',
                rent: 18000,
                buyPrice: 2900000,
                reqStars: 20,
                slots: 3,
                slotsBonus: 3,
                moodBonus: 14,
                minLevel: 7,
                canTune: true,
                canDetail: true,
                canService: true,
                canOBDGarage: true,
                hasPersonalSlot: true,
                reshalaDiscountPct: 10,
                subletIncome: 12000,
                perk: 'Сварка, полировальный пост, печь на отработке и 3 свободных машиноместа.',
                desc: 'Широкий бокс с печью, верстаком, компрессором и мойкой. Позволяет готовить тачки под ключ.',
                img: 'assets/houses/garage.jpg',
                fallback: 'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'dvushka',
                name: 'Двушка в спальном районе',
                category: 'living',
                typeLabel: 'Городская квартира',
                rent: 26000,
                buyPrice: 7500000,
                reqStars: 25,
                slots: 2,
                slotsBonus: 2,
                moodBonus: 18,
                minLevel: 10,
                canTune: false,
                canDetail: false,
                canService: true,
                canOBDGarage: false,
                hasPersonalSlot: true,
                reshalaDiscountPct: 0,
                subletIncome: 18000,
                perk: 'Закреплённое парковочное место со шлагбаумом во дворе.',
                desc: 'Кирпичный дом, стеклопакеты, видеонаблюдение за парковкой. Высокий комфорт проживания.',
                img: 'assets/houses/dvushka.jpg',
                fallback: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'workshop_pro',
                name: 'Тюнинг-Ангар с подъёмником',
                category: 'box',
                typeLabel: 'Профессиональный сервис',
                rent: 48000,
                buyPrice: 11000000,
                reqStars: 35,
                slots: 5,
                slotsBonus: 5,
                moodBonus: 22,
                minLevel: 15,
                canTune: true,
                canDetail: true,
                canService: true,
                canOBDGarage: true,
                hasPersonalSlot: true,
                reshalaDiscountPct: 20,
                subletIncome: 32000,
                perk: 'Двухстоечный подъёмник, камера обдува, скидка 20% на услуги Решалы!',
                desc: 'Коммерческий цех в промзоне. Подъёмник, мощная приточка, возможность отмывать VIN дешевле.',
                img: 'assets/houses/workshop.jpg',
                fallback: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'euro_treshka',
                name: 'Евро-трешка (Новостройка)',
                category: 'living',
                typeLabel: 'Бизнес-класс с паркингом',
                rent: 42000,
                buyPrice: 15000000,
                reqStars: 40,
                slots: 3,
                slotsBonus: 3,
                moodBonus: 28,
                minLevel: 20,
                canTune: false,
                canDetail: true,
                canService: true,
                canOBDGarage: true,
                hasPersonalSlot: true,
                reshalaDiscountPct: 0,
                subletIncome: 28000,
                perk: 'Подземный теплый паркинг с детейлинг-постом и зарядкой.',
                desc: 'ЖК комфорт-класса. Закрытый двор, охраняемый подземный паркинг, автомойка в цоколе.',
                img: 'assets/houses/treshka.jpg',
                fallback: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'cottage',
                name: 'Коттедж за городом с гаражом',
                category: 'estate',
                typeLabel: 'Загородная усадьба',
                rent: 70000,
                buyPrice: 22000000,
                reqStars: 55,
                slots: 7,
                slotsBonus: 7,
                moodBonus: 35,
                minLevel: 28,
                canTune: true,
                canDetail: true,
                canService: true,
                canOBDGarage: true,
                hasPersonalSlot: true,
                reshalaDiscountPct: 15,
                subletIncome: 48000,
                perk: 'Свой закрытый двор на 7 авто, тёплый гараж, зона отдыха и барбекю.',
                desc: 'Собственный участок, трёхфазная сеть 380V, смотровая яма и мойка высокого давления.',
                img: 'assets/houses/cottage.jpg',
                fallback: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'loft',
                name: 'Дизайнерский Лофт в центре',
                category: 'living',
                typeLabel: 'Премиум-апартаменты',
                rent: 90000,
                buyPrice: 35000000,
                reqStars: 75,
                slots: 4,
                slotsBonus: 4,
                moodBonus: 40,
                minLevel: 35,
                canTune: false,
                canDetail: true,
                canService: true,
                canOBDGarage: true,
                hasPersonalSlot: true,
                reshalaDiscountPct: 0,
                subletIncome: 60000,
                perk: '+40% настроения каждый день, персональные места на VIP-паркинге.',
                desc: 'Красный кирпич, панорамные окна на набережную, стильный интерьер для отдыха автоолигарха.',
                img: 'assets/houses/loft.jpg',
                fallback: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'penthouse',
                name: 'Пентхаус в Москва-Сити',
                category: 'estate',
                typeLabel: 'Небоскрёб & VIP Паркинг',
                rent: 250000,
                buyPrice: 140000000,
                reqStars: 110,
                slots: 8,
                slotsBonus: 8,
                moodBonus: 55,
                minLevel: 50,
                canTune: true,
                canDetail: true,
                canService: true,
                canOBDGarage: true,
                hasPersonalSlot: true,
                reshalaDiscountPct: 25,
                subletIncome: 160000,
                perk: 'Личный VIP-бокс на -3 этаже Башни с охраной, консьержем и мойкой.',
                desc: 'Панорамный вид с 65 этажа, консьерж-сервис, охраняемый подземный гаражный комплекс.',
                img: 'assets/houses/penthouse.jpg',
                fallback: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'villa',
                name: 'Особняк на Рублёвке',
                category: 'estate',
                typeLabel: 'Резиденция миллионера',
                rent: 600000,
                buyPrice: 420000000,
                reqStars: 160,
                slots: 18,
                slotsBonus: 18,
                moodBonus: 85,
                minLevel: 70,
                canTune: true,
                canDetail: true,
                canService: true,
                canOBDGarage: true,
                hasPersonalSlot: true,
                reshalaDiscountPct: 35,
                subletIncome: 380000,
                perk: 'Свой автосервисный цех, малярная камера, охрана ЧОП, скидка 35% у Решалы!',
                desc: 'Гектар соснового бора, собственный автосервис на 4 поста, малярная камера и ангар для редких лотов.',
                img: 'assets/houses/villa.jpg',
                fallback: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80'
            },
            {
                id: 'island',
                name: 'Частный остров с виллой',
                category: 'estate',
                typeLabel: 'Личный Остров Олигарха',
                rent: 2000000,
                buyPrice: 1200000000,
                reqStars: 300,
                slots: 35,
                slotsBonus: 35,
                moodBonus: 100,
                minLevel: 90,
                canTune: true,
                canDetail: true,
                canService: true,
                canOBDGarage: true,
                hasPersonalSlot: true,
                reshalaDiscountPct: 50,
                subletIncome: 1200000,
                perk: 'Полный иммунитет от проверок ГИБДД, личный пирс для яхт и скидка 50% у Решалы!',
                desc: 'Абсолютная автономия в нейтральных водах. Свой порт, вертолётная площадка и музей для гиперкаров.',
                img: 'assets/houses/island.jpg',
                fallback: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
            }
        ];

        if (typeof window !== 'undefined') {
            window.HOUSING_LIST = fullDatabase;
        }

        return fullDatabase;
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
        if (state.player.housingType === 'rent' && !state.player.housingRentDue) {
            state.player.housingRentDue = (state.player.day || 1) + 3;
        }

        // Новые поля для субаренды и быта
        if (!state.player.subletHouses || typeof state.player.subletHouses !== 'object') {
            state.player.subletHouses = {};
        }
        if (typeof state.player.subletAccrued !== 'number') {
            state.player.subletAccrued = 0;
        }
        if (!state.player.lastSubletDay) {
            state.player.lastSubletDay = state.player.day || 1;
        }
        if (!state.player.lastCoffeeTime) state.player.lastCoffeeTime = 0;
        if (!state.player.lastPs5Time) state.player.lastPs5Time = 0;
    },

    // ========================================================
    // АВТОСПИСАНИЕ АРЕНДЫ И НАЧИСЛЕНИЕ СУБАРЕНДЫ
    // ========================================================
    processHousingDailyRent() {
        this.ensureHousingState();
        const p = state?.player;
        if (!p) return;

        const currentDay = p.day || 1;
        const db = this.getHousingDatabase();

        // 1. Начисление дохода от сданной в субаренду недвижимости
        const subletMap = p.subletHouses || {};
        const subletKeys = Object.keys(subletMap);

        if (subletKeys.length > 0) {
            const daysDelta = Math.max(0, currentDay - (p.lastSubletDay || currentDay));
            if (daysDelta > 0) {
                let dailySum = 0;
                subletKeys.forEach(hId => {
                    const houseObj = db.find(h => h.id === hId);
                    if (houseObj) {
                        dailySum += (houseObj.subletIncome || Math.round((houseObj.rent || 1000) * 0.65));
                    }
                });

                const totalGained = dailySum * daysDelta;
                p.subletAccrued = (p.subletAccrued || 0) + totalGained;
                p.lastSubletDay = currentDay;

                if (totalGained > 0 && typeof showToast === 'function') {
                    showToast(`📈 Субаренда принесла доход: +${totalGained.toLocaleString()} ₽ (доступно к сбору в «Моё жильё»)`, 'success');
                }
            }
        } else {
            p.lastSubletDay = currentDay;
        }

        // 2. Списание аренды текущего жилья
        if (p.housingType === 'rent') {
            const dueDay = p.housingRentDue || currentDay;
            const house = db.find(h => h.id === p.housingId);

            if (!house) {
                p.housingId = 'trailer';
                p.housingType = 'own';
                return;
            }

            if (currentDay >= dueDay) {
                const rentPerDay = house.rent || house.rentPerDay || 0;
                const renewDays = 3;
                const totalRent = rentPerDay * renewDays;
                const cash = p.cash || 0;

                if (cash >= totalRent) {
                    p.cash -= totalRent;
                    p.housingRentDue = currentDay + renewDays;

                    if (typeof logBankTransaction === 'function') {
                        logBankTransaction(`Продление аренды (${renewDays} дн): ${house.name}`, totalRent, false);
                    }
                    if (typeof showToast === 'function') {
                        showToast(`🏠 Списана аренда за «${house.name}»: -${totalRent.toLocaleString()} ₽ на ${renewDays} дн.`, 'warning');
                    }
                } else {
                    p.housingId = 'trailer';
                    p.housingType = 'own';
                    p.housingRentDue = null;

                    if (typeof logBankTransaction === 'function') {
                        logBankTransaction(`Выселение за неуплату аренды: ${house.name}`, 0, false);
                    }
                    if (typeof showToast === 'function') {
                        showToast(`⚠️ Не хватило денег на аренду «${house.name}»! Вы вернулись в бытовку.`, 'error');
                    }
                }

                if (typeof saveState === 'function') saveState();
                if (typeof updateHeaderUI === 'function') updateHeaderUI();
                if (typeof renderGarage === 'function') renderGarage();
            }
        }
    },

    render(container) {
        if (!container) return;

        try {
            this.ensureHousingState();
            this.processHousingDailyRent();

            const db = this.getHousingDatabase();
            const currentHouseId = state.player.housingId || 'trailer';
            const currentHouse = db.find(h => h.id === currentHouseId) || db[0];
            const ownedList = state.player.ownedHouses || ['trailer'];

            let tabsHtml = `
                <div class="grid-2 mb-2">
                    <button onclick="PhoneHousing.switchTab('catalog')" class="btn ${this.activeTab === 'catalog' ? 'btn-teal' : 'btn-dark'} btn-sm">
                        <i class="fa-solid fa-list-ul mr-1"></i> Каталог Объектов (${db.length})
                    </button>
                    <button onclick="PhoneHousing.switchTab('my_home')" class="btn ${this.activeTab === 'my_home' ? 'btn-teal' : 'btn-dark'} btn-sm">
                        <i class="fa-solid fa-house-user mr-1"></i> Моё Жильё & Верстак 🛋️
                    </button>
                </div>
            `;

            let contentHtml = "";
            if (this.activeTab === 'catalog') {
                contentHtml = this.renderCatalogHtml(db, currentHouseId, ownedList);
            } else {
                contentHtml = this.renderMyHomeHtml(currentHouse, db);
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
        const subletMap = state.player?.subletHouses || {};

        let cards = db.map(h => {
            const isCurrent = h.id === currentHouseId;
            const isOwned = ownedList.includes(h.id);
            const isSublet = !!subletMap[h.id];
            const isLvlLocked = pLvl < (h.minLevel || 1);

            let price = h.buyPrice || h.price || 0;
            let rent = h.rent || h.rentPerDay || 0;
            let subletRate = h.subletIncome || Math.round(rent * 0.65);
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
                actionBtn = `
                    <div class="grid-2" style="gap:6px;">
                        <button onclick="PhoneHousing.moveToHouse('${h.id}')" class="btn btn-cyan btn-sm font-bold">
                            <i class="fa-solid fa-truck-ramp-box mr-1"></i> Жить здесь
                        </button>
                        <button onclick="PhoneHousing.toggleSubletHouse('${h.id}')" class="btn ${isSublet ? 'btn-amber' : 'btn-dark'} btn-sm font-bold">
                            ${isSublet ? '✕ Забрать (Сдаётся)' : `🔑 Сдать (${subletRate.toLocaleString()} ₽/д)`}
                        </button>
                    </div>
                `;
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
                <div class="glass-card p-3 mb-2" style="border-left: 3px solid ${catColor}; background: ${isCurrent ? 'rgba(45, 212, 191, 0.08)' : (isSublet ? 'rgba(255, 179, 0, 0.06)' : '#090e18')};">
                    <div class="car-img-wrap mb-2" style="height:130px; position:relative;">
                        <img src="${houseImg}" class="car-img" onerror="this.onerror=null; this.src='${fallbackImg}';">
                        <div class="badge-tag badge-br">
                            <span class="tag-badge ${isCurrent ? 'bg-tag-green' : (isSublet ? 'bg-tag-amber' : (isOwned ? 'bg-tag-cyan' : 'bg-tag-dark'))}">
                                ${isCurrent ? 'АКТИВНОЕ ЖИЛЬЁ' : (isSublet ? 'СДАНО В СУБАРЕНДУ' : (isOwned ? 'В СОБСТВЕННОСТИ' : 'ПРОДАЁТСЯ'))}
                            </span>
                        </div>
                    </div>

                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs" style="color:${isCurrent ? 'var(--teal)' : '#fff'}; font-size:13px;">${h.name}</b>
                            <div class="sub-label" style="font-size:9px;">
                                ${isOwned ? (isSublet ? `Доход субаренды: +${subletRate.toLocaleString()} ₽/день` : 'В вашей собственности ✓') : `Покупка: ${price.toLocaleString()} ₽${starsTxt}`}
                            </div>
                        </div>
                        <span class="tag-badge bg-tag-cyan">+${slots} боксов</span>
                    </div>

                    <div class="sub-label my-2" style="font-size:9.5px; line-height:1.35;">${h.desc || h.perk || ''}</div>

                    <div class="grid-2 text-xs p-2 mb-2" style="background:rgba(0,0,0,0.45); border-radius:8px;">
                        <div>Машиномест: <b class="color-cyan">${isSublet ? '0 (Сдано)' : `+${slots} мест`}</b></div>
                        <div>Кураж в полночь: <b class="${mood >= 0 ? 'color-green' : 'color-red'}">${mood >= 0 ? '+' : ''}${mood}%</b></div>
                    </div>

                    ${actionBtn}
                </div>
            `;
        }).join('');

        return `
            <div class="sub-label mb-2" style="font-size:10px;">
                Покупка недвижимости открывает слоты для автопарка, домашний верстак и пассивный доход от субаренды:
            </div>
            ${cards}
        `;
    },

    renderMyHomeHtml(currentHouse, db) {
        this.ensureHousingState();
        const interiorItems = state.player.interior?.[currentHouse.id] || [];
        const catalogItems = (typeof SHOP_CATALOG !== 'undefined' && SHOP_CATALOG.homeItems)
            ? SHOP_CATALOG.homeItems
            : [
                { id: "home_ps5", name: "Игровая консоль PlayStation 5", cost: 75000, reqStars: 5, perk: "+25% настроения и куража в полночь" },
                { id: "home_leather_sofa", name: "Кожаный диван в клиентскую зону", cost: 120000, reqStars: 8, perk: "+15% к восстановлению сил" },
                { id: "home_garage_lift", name: "Гидравлический автоподъёмник (4т)", cost: 320000, reqStars: 20, perk: "Ускоряет ремонт на 50%" },
                { id: "home_safe_valberg", name: "Огнеупорный сейф перекупа", cost: 180000, reqStars: 10, perk: "100% защита заначки наличных" },
                { id: "home_cctv", name: "Система видеонаблюдения 4K", cost: 140000, reqStars: 8, perk: "Снижает риск угона до 0%" }
            ];

        // ─── 1. КАССА СУБАРЕНДЫ ───
        const accruedIncome = state.player?.subletAccrued || 0;
        const subletMap = state.player?.subletHouses || {};
        const subletCount = Object.keys(subletMap).length;

        let subletBoxHtml = '';
        if (subletCount > 0 || accruedIncome > 0) {
            subletBoxHtml = `
                <div class="glass-card p-3 mb-2" style="background: radial-gradient(circle at 50% 0%, rgba(255,179,0,0.14), #090e18); border-color: var(--amber);">
                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs color-amber"><i class="fa-solid fa-hand-holding-dollar mr-1"></i> Касса субаренды (${subletCount} объектов)</b>
                            <div class="sub-label" style="font-size:8.5px;">Пассивный доход от арендаторов ваших боксов и квартир.</div>
                        </div>
                        <b class="price-val color-green text-xs" style="font-size:15px;">+${accruedIncome.toLocaleString()} ₽</b>
                    </div>
                    <button onclick="PhoneHousing.collectSubletIncome()" class="btn btn-amber btn-sm w-full font-bold mt-2" ${accruedIncome <= 0 ? 'disabled' : ''}>
                        📥 Забрать выручку субаренды (+${accruedIncome.toLocaleString()} ₽)
                    </button>
                </div>
            `;
        }

        // ─── 2. ИНТЕРАКТИВНЫЙ БЫТ ПЕРЕКУПА ───
        const now = Date.now();
        const coffeeReady = (now - (state.player.lastCoffeeTime || 0)) > 4 * 3600 * 1000;
        const hasPs5 = interiorItems.includes('home_ps5');
        const hasSafe = interiorItems.includes('home_safe_valberg');
        const hasCctv = interiorItems.includes('home_cctv');

        const interactiveLifestyleHtml = `
            <div class="glass-card p-2 mb-2" style="background:#090e18;">
                <div class="flex-between mb-2">
                    <b class="text-xs color-teal"><i class="fa-solid fa-mug-hot mr-1"></i> Быт и отдых перекупа:</b>
                    <span class="tag-badge bg-tag-cyan">РЕЛАКС</span>
                </div>
                <div class="grid-2" style="gap:6px;">
                    <button onclick="PhoneHousing.drinkCoffeeAction()" class="btn btn-dark btn-sm text-left" ${!coffeeReady ? 'disabled' : ''}>
                        <div class="font-bold text-xs color-cyan">☕ Сварить кофе</div>
                        <div class="sub-label" style="font-size:7.5px;">${coffeeReady ? '+15% сытости и настроения' : 'Кулдаун 4ч'}</div>
                    </button>

                    <button onclick="PhoneHousing.playPs5Action()" class="btn btn-dark btn-sm text-left" ${!hasPs5 ? 'disabled' : ''}>
                        <div class="font-bold text-xs color-amber">🎮 Запустить PS5</div>
                        <div class="sub-label" style="font-size:7.5px;">${hasPs5 ? 'Кураж перед рынком' : 'Нужна консоль в мебели'}</div>
                    </button>

                    <button onclick="PhoneHousing.openHomeSafePrompt()" class="btn btn-dark btn-sm text-left" ${!hasSafe ? 'disabled' : ''}>
                        <div class="font-bold text-xs color-green">💰 Сейф Valberg</div>
                        <div class="sub-label" style="font-size:7.5px;">${hasSafe ? 'Заначка наличных' : 'Требуется сейф'}</div>
                    </button>

                    <button onclick="PhoneHousing.checkCctvSecurity()" class="btn btn-dark btn-sm text-left" ${!hasCctv ? 'disabled' : ''}>
                        <div class="font-bold text-xs color-purple">📹 Камеры 4K</div>
                        <div class="sub-label" style="font-size:7.5px;">${hasCctv ? 'Угон: 0% риска' : 'Нужна система CCTV'}</div>
                    </button>
                </div>
            </div>
        `;

        // ─── 3. ДОМАШНИЙ ВЕРСТАК И УХОД ЗА МАШИНАМИ ───
        const garage = state.garage || [];
        let workbenchHtml = '';

        if (garage.length === 0) {
            workbenchHtml = `
                <div class="glass-card p-2 mb-2 text-center sub-label" style="font-size:10px;">
                    В гараже нет авто для обслуживания на домашнем верстаке.
                </div>
            `;
        } else {
            let carIdx = this.selectedWorkbenchCarIdx;
            if (carIdx >= garage.length) carIdx = 0;
            const car = garage[carIdx];

            let carOptions = garage.map((c, i) => `<option value="${i}" ${i === carIdx ? 'selected' : ''}>${c.name} (${c.condition || 80}%)</option>`).join('');

            workbenchHtml = `
                <div class="glass-card p-3 mb-2" style="background:#070b14; border-left:3px solid var(--cyan);">
                    <div class="flex-between mb-2">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-wrench mr-1"></i> Домашний верстак и обслуживание</b>
                        <span class="tag-badge bg-tag-green">СВОЙ БОКС</span>
                    </div>

                    <div class="flex-between mb-2">
                        <span class="sub-label" style="font-size:9px;">Автомобиль:</span>
                        <select onchange="PhoneHousing.selectWorkbenchCar(this.value)" class="chat-input" style="width:65%; font-size:10px; padding:4px 6px;">
                            ${carOptions}
                        </select>
                    </div>

                    <div class="grid-3 mb-2 text-xs p-2" style="background:#04070e; border-radius:6px;">
                        <div>Кузов: <b>${car.condition || 80}%</b></div>
                        <div>Мотор: <b>${car.wear?.engine || 85}%</b></div>
                        <div>Присадка: <b class="${car.hasAdditive ? 'color-green' : 'color-amber'}">${car.hasAdditive ? 'Залита ✓' : 'Нет'}</b></div>
                    </div>

                    <div class="grid-2" style="gap:6px;">
                        <button onclick="PhoneHousing.washCarWithHose(${carIdx})" class="btn btn-dark btn-sm text-left">
                            <div class="font-bold text-xs color-cyan">🚿 Мойка из шланга</div>
                            <div class="sub-label" style="font-size:7.5px;">Бесплатно · Чистота кузова</div>
                        </button>

                        <button onclick="PhoneHousing.servicePlugsAtHome(${carIdx})" class="btn btn-dark btn-sm text-left" ${!currentHouse.canService ? 'disabled' : ''}>
                            <div class="font-bold text-xs color-green">🔧 Свечи и фильтры</div>
                            <div class="sub-label" style="font-size:7.5px;">${currentHouse.canService ? '1,500 ₽ · +4% к мотору' : 'Нужен навес или бокс'}</div>
                        </button>

                        <button onclick="PhoneHousing.addEngineAdditiveAtHome(${carIdx})" class="btn btn-dark btn-sm text-left" ${!currentHouse.canTune || car.hasAdditive ? 'disabled' : ''}>
                            <div class="font-bold text-xs color-amber">🧪 Присадка в масло</div>
                            <div class="sub-label" style="font-size:7.5px;">${currentHouse.canTune ? (car.hasAdditive ? 'Уже залита' : '5,000 ₽ · Скрывает стук') : 'Нужен бокс ГСК'}</div>
                        </button>

                        <button onclick="PhoneHousing.eliminateSmallDefectAtHome(${carIdx})" class="btn btn-dark btn-sm text-left" ${!currentHouse.canDetail ? 'disabled' : ''}>
                            <div class="font-bold text-xs color-purple">🪛 Полировка царапин</div>
                            <div class="sub-label" style="font-size:7.5px;">${currentHouse.canDetail ? '3,500 ₽ · Убирает дефект' : 'Нужен двойной бокс'}</div>
                        </button>
                    </div>
                </div>
            `;
        }

        // ─── 4. МЕБЕЛЬ И УСТАНОВКА ───
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

        let rentInfoHtml = '';
        if (state.player.housingType === 'rent' && state.player.housingRentDue) {
            let leftDays = Math.max(0, state.player.housingRentDue - (state.player.day || 1));
            rentInfoHtml = `
                <div class="p-1 mb-2 text-center" style="background:rgba(255,179,0,0.12); border-radius:6px; border:1px solid var(--amber);">
                    <span class="sub-label" style="font-size:8.5px; color:var(--amber);">
                        Арендовано: осталось <b>${leftDays} дн.</b> (оплата раз в 3 дня)
                    </span>
                </div>
            `;
        }

        return `
            <div class="glass-card p-3 mb-2 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(45, 212, 191, 0.18), #090e18); border-color: var(--teal);">
                <div class="car-img-wrap mb-2" style="height:140px; border-radius:12px; border:2px solid ${catColor};">
                    <img src="${houseImg}" class="car-img" onerror="this.onerror=null; this.src='${fallbackImg}';">
                </div>
                <h3 class="font-bold color-teal mb-1">${currentHouse.name}</h3>
                <div class="sub-label mb-2" style="font-size:10px;">Текущая локация проживания и хранения авто</div>
                ${rentInfoHtml}

                <div class="grid-3 text-xs p-2 mb-1" style="background:#050811; border-radius:8px;">
                    <div>Боксов: <b class="color-cyan">+${slots}</b></div>
                    <div>Кураж: <b class="color-green">+${currentHouse.moodBonus || 0}%</b></div>
                    <div>Интерьер: <b class="color-amber">${interiorItems.length}/${catalogItems.length}</b></div>
                </div>
            </div>

            ${subletBoxHtml}
            ${interactiveLifestyleHtml}
            ${workbenchHtml}

            <b class="text-xs color-teal block mb-1"><i class="fa-solid fa-couch mr-1"></i> Обустройство и мебель:</b>
            <div class="space-y-1 mb-2">
                ${interiorListHtml}
            </div>
        `;
    },

    // --------------------------------------------------------
    // ДЕЙСТВИЯ БЫТА И ОТДЫХА
    // --------------------------------------------------------
    drinkCoffeeAction() {
        const now = Date.now();
        if (now - (state.player.lastCoffeeTime || 0) < 4 * 3600 * 1000) {
            return showToast("Кофеварка остывает, перерыв 4 часа!");
        }

        state.player.lastCoffeeTime = now;
        state.player.hunger = Math.min(100, (state.player.hunger || 80) + 15);
        state.player.mood = Math.min(100, (state.player.mood || 85) + 15);

        if (typeof playSound === 'function') playSound('cash');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof saveState === 'function') saveState();

        showToast("☕ Ароматный кофе выпит! +15% к сытости и бодрости.");
        this.render(document.getElementById('phoneAppContainer'));
    },

    playPs5Action() {
        state.player.mood = 100;
        state.player.streetCred = (state.player.streetCred || 100) + 5;

        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof saveState === 'function') saveState();

        showToast("🎮 Катка в гонки на PS5 выиграна! Настроение на максимуме (100%).");
    },

    openHomeSafePrompt() {
        if (typeof AppBank !== 'undefined' && typeof AppBank.depositToSafePrompt === 'function') {
            AppBank.depositToSafePrompt();
        } else {
            showToast("Сейф перекупа Valberg защищает ваш резерв.");
        }
    },

    checkCctvSecurity() {
        if (typeof playSound === 'function') playSound('tick');
        showToast("📹 Камеры активны: периметр чист. Риск угона авто из бокса 0%.");
    },

    // --------------------------------------------------------
    // ДЕЙСТВИЯ ДОМАШНЕГО ВЕРСТАКА
    // --------------------------------------------------------
    selectWorkbenchCar(idx) {
        this.selectedWorkbenchCarIdx = parseInt(idx, 10) || 0;
        this.render(document.getElementById('phoneAppContainer'));
    },

    washCarWithHose(carIdx) {
        const car = state.garage?.[carIdx];
        if (!car) return;

        car.isClean = true;
        car.isWashed = true;

        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        if (typeof saveState === 'function') saveState();
        if (typeof renderGarage === 'function') renderGarage();

        showToast(`🚿 «${car.name}» отмыта из шланга во дворе. Кузов сияет!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    servicePlugsAtHome(carIdx) {
        const car = state.garage?.[carIdx];
        if (!car) return;
        const cost = 1500;
        const cash = state.player?.cash || 0;

        if (cash < cost) return showToast("Нужно 1,500 ₽ на комплект свечей и фильтров!");

        state.player.cash -= cost;
        if (!car.wear) car.wear = { engine: 85, transmission: 85, body: 90 };
        car.wear.engine = Math.min(100, (car.wear.engine || 85) + 4);

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Замена свечей в боксе: ${car.name}`, cost, false);
        }

        if (typeof playSound === 'function') playSound('cash');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();

        showToast(`🔧 Свечи заменены в боксе! Двигатель работает ровнее (+4% ресурса).`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    addEngineAdditiveAtHome(carIdx) {
        const car = state.garage?.[carIdx];
        if (!car) return;
        const cost = 5000;
        const cash = state.player?.cash || 0;

        if (cash < cost) return showToast("Нужно 5,000 ₽ на банку присадки в масло!");

        state.player.cash -= cost;
        car.hasAdditive = true;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Присадка в двигатель: ${car.name}`, cost, false);
        }

        if (typeof playSound === 'function') playSound('cash');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();

        showToast(`🧪 Присадка залита! Стук мотора замаскирован для покупателей на рынке.`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    eliminateSmallDefectAtHome(carIdx) {
        const car = state.garage?.[carIdx];
        if (!car) return;
        const cost = 3500;
        const cash = state.player?.cash || 0;

        if (cash < cost) return showToast("Нужно 3,500 ₽ на полировочные пасты и круги!");

        state.player.cash -= cost;
        car.condition = Math.min(100, (car.condition || 80) + 5);
        car.isPolished = true;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Домашняя полировка: ${car.name}`, cost, false);
        }

        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();

        showToast(`🪛 Царапины заполированы! Состояние кузова поднялось на +5%.`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // СУБАРЕНДА НЕАКТИВНОГО ЖИЛЬЯ
    // --------------------------------------------------------
    toggleSubletHouse(houseId) {
        this.ensureHousingState();
        const p = state.player;
        if (!p) return;

        if (p.housingId === houseId) {
            return showToast("Нельзя сдать в субаренду жильё, в котором вы сейчас проживаете!");
        }

        const isSublet = !!p.subletHouses[houseId];
        const db = this.getHousingDatabase();
        const houseObj = db.find(h => h.id === houseId);
        if (!houseObj) return;

        if (isSublet) {
            delete p.subletHouses[houseId];
            showToast(`Жильцы съехали из «${houseObj.name}». Слоты гаража возвращены в автопарк.`);
        } else {
            p.subletHouses[houseId] = {
                sinceDay: p.day || 1,
                dailyRate: houseObj.subletIncome || Math.round((houseObj.rent || 1000) * 0.65)
            };
            showToast(`«${houseObj.name}» сдано в субаренду! Приносит +${p.subletHouses[houseId].dailyRate.toLocaleString()} ₽ в день.`);
        }

        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        if (typeof saveState === 'function') saveState();
        if (typeof renderGarage === 'function') renderGarage();

        this.render(document.getElementById('phoneAppContainer'));
    },

    collectSubletIncome() {
        this.ensureHousingState();
        const p = state.player;
        const amount = p?.subletAccrued || 0;
        if (amount <= 0) return showToast("В кассе субаренды пока пусто!");

        p.cash = (p.cash || 0) + amount;
        p.subletAccrued = 0;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Доход от субаренды недвижимости`, amount, true);
        }

        if (typeof playSound === 'function') playSound('cash');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof saveState === 'function') saveState();

        showToast(`💰 Выручка субаренды получена: +${amount.toLocaleString()} ₽ на баланс!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // ПОКУПКА ДОМА
    // --------------------------------------------------------
    buyHouse(houseId) {
        this.ensureHousingState();
        const db = this.getHousingDatabase();
        const target = db.find(h => h.id === houseId);
        if (!target) return showToast("❌ Объект не найден!");

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

        if (!state.player.ownedHouses.includes(houseId)) {
            state.player.ownedHouses.push(houseId);
        }

        state.player.housingId = houseId;
        state.player.housingType = 'own';
        state.player.housingRentDue = null;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Покупка недвижимости: ${target.name}`, price, false);
        }

        const slotsGranted = target.slots !== undefined ? target.slots : (target.slotsBonus || 0);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        if (typeof openVerdictModal === 'function') {
            openVerdictModal(
                "НОВОСЕЛЬЕ! 🏢",
                `Поздравляем с покупкой «${target.name}»!\n• Вместимость гаража увеличена: +${slotsGranted} мест\n• Доступен домашний верстак и субаренда\n• Бонусы куража активируются в полночь`,
                true,
                price
            );
        }

        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // АРЕНДА ДОМА
    // --------------------------------------------------------
    rentHouse(houseId) {
        this.ensureHousingState();
        const db = this.getHousingDatabase();
        const target = db.find(h => h.id === houseId);
        if (!target) return showToast("❌ Объект не найден!");

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
    // --------------------------------------------------------
    moveToHouse(houseId) {
        this.ensureHousingState();
        const db = this.getHousingDatabase();
        const target = db.find(h => h.id === houseId);
        if (!target) return showToast("❌ Объект не найден!");

        if (state.player.housingId === houseId) {
            if (typeof playSound === 'function') playSound('tick');
            return showToast(`✅ Вы уже находитесь в «${target.name}»`);
        }

        const isOwned = (state.player.ownedHouses || []).includes(houseId);
        const isCurrentRent = (state.player.housingId === houseId && state.player.housingType === 'rent');

        if (!isOwned && !isCurrentRent) {
            return showToast("🔒 Сначала купите или арендуйте это жильё!");
        }

        // Если переезжаем в сданный дом — снимаем с субаренды
        if (state.player.subletHouses?.[houseId]) {
            delete state.player.subletHouses[houseId];
        }

        state.player.housingId = houseId;
        state.player.housingType = isOwned ? 'own' : 'rent';

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
    // --------------------------------------------------------
    buyInteriorItem(houseId, itemId, cost) {
        this.ensureHousingState();
        if (!state.player) return;

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
        state.player.interior[houseId].push(itemId);
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

    applyHousingBonuses(houseObj) {
        if (!houseObj) return;
        if (typeof getTotalGarageSlots === 'function') {
            const slots = getTotalGarageSlots();
            console.log(`[Housing] Слотов гаража сейчас: ${slots} (housingId=${state.player?.housingId})`);
        }
    }
};

// ========================================================
// ГЛОБАЛЬНЫЙ РАСЧЕТ СЛОТОВ ГАРАЖА
// ========================================================
window.getTotalGarageSlots = function() {
    const baseSlots = 3;
    if (!window.state?.player) return baseSlots;

    const db = PhoneHousing.getHousingDatabase();
    const owned = window.state.player.ownedHouses || ['trailer'];
    const currentId = window.state.player.housingId || 'trailer';
    const isRent = window.state.player.housingType === 'rent';
    const subletMap = window.state.player.subletHouses || {};

    let maxBonus = 0;

    // Считаем максимальные слоты среди всей купленной недвижимости, которая НЕ сдана в субаренду
    owned.forEach(hId => {
        if (subletMap[hId]) return;
        const obj = db.find(h => h.id === hId);
        if (obj) {
            const s = obj.slots !== undefined ? obj.slots : (obj.slotsBonus || 0);
            if (s > maxBonus) maxBonus = s;
        }
    });

    // Если текущее жилье в аренде — учитываем его слоты
    if (isRent) {
        const currentObj = db.find(h => h.id === currentId);
        if (currentObj) {
            const s = currentObj.slots !== undefined ? currentObj.slots : (currentObj.slotsBonus || 0);
            if (s > maxBonus) maxBonus = s;
        }
    }

    return baseSlots + maxBonus;
};

window.PhoneHousing = PhoneHousing;
window.AppHousing = PhoneHousing;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PhoneHousing.init());
} else {
    PhoneHousing.init();
}

console.log('[🏠 phone-housing v2.0.0] Субаренда, домашний верстак и 14 объектов недвижимости готовы ✓');

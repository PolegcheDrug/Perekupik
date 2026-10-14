// ========================================================
// js/phone-business.js — БИЗНЕС-СЕТЬ ПЕРЕКУПА (v2.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v2.0.0: Полный рефактор под state.businesses.
//   - Использует BUSINESS_DATA из data_economy.js
//   - Работает с state.player.cash (не GameState.player.balance)
//   - 4 таба: Точки / Цех / Штат / Автопарк
//   - 7-дневный график дохода (canvas sparkline)
//   - Бонусные механики: реклама, ивенты, достижения
//   - Автозахват кассы при наличии Управляющего
//   - Экспорт PhoneBusiness + AppBusiness (алиас)
// ========================================================

const PhoneBusiness = {
    currentTab: 'points', // 'points' | 'workshop' | 'staff' | 'fleet'
    _tickInterval: null,
    _eventsCheckDay: 0,
    _activeBonus: null, // { type: 'ad_campaign', expiresDay: N, bonusPct: 15 }

    // --------------------------------------------------------
    // КОНФИГ АПГРЕЙДОВ, ШТАТА И АВТОПАРКА (внутренний)
    // --------------------------------------------------------
    workshopUpgrades: [
        { id: 'equipment',   icon: '🛠',  name: 'Оснащение цеха',            desc: 'Слесарный пост и пневмоинструмент (+15% к выручке сети за уровень)',   baseCost: 147000, costMul: 1.70, maxLevel: 3 },
        { id: 'storage',     icon: '📦',  name: 'Склад и ёмкости',           desc: 'Вместимость сырья +50% за уровень',                                    baseCost: 105000, costMul: 1.60, maxLevel: 3 },
        { id: 'brand',       icon: '🎨',  name: 'Брендирование и реклама',   desc: 'Узнаваемость сети (+20% пассивного дохода за уровень)',                baseCost: 220000, costMul: 1.80, maxLevel: 3 },
        { id: 'diagnostics', icon: '💻',  name: 'Компьютерный стенд',        desc: 'Дефектовка авто (+10% к шансу выявить скрытые косяки)',                baseCost: 310000, costMul: 1.90, maxLevel: 3 }
    ],

    staffList: [
        { id: 'mechanic',  icon: '👨‍🔧', name: 'Мастер-универсал',      role: 'Ремонт и слесарка',    salary: 45000, maxHired: 5, perk: '+10% к скорости ремонта' },
        { id: 'painter',   icon: '🥽',  name: 'Колорист-маляр',        role: 'Покраска и подготовка', salary: 60000, maxHired: 3, perk: '-15% к расходу краски' },
        { id: 'manager',   icon: '👔',  name: 'Управляющий филиалом',  role: 'Администрирование',    salary: 85000, maxHired: 2, perk: 'Автосбор кассы раз в день' },
        { id: 'accountant',icon: '💼',  name: 'Главный бухгалтер',     role: 'Финансы и налоги',     salary: 75000, maxHired: 1, perk: '+8% к чистой выручке' }
    ],

    fleetVehicles: [
        { id: 'gazelle',    icon: '🚐',  name: 'ГАЗель NEXT (Фургон)',         cost: 850000,  dailyCost: 1200, bonus: 'Доставка сырья дешевле на 30%' },
        { id: 'tow_truck',  icon: '🚛',  name: 'Эвакуатор ГАЗон NEXT',         cost: 1650000, dailyCost: 2400, bonus: 'Бесплатный выезд за авто дальше 25 км' },
        { id: 'service_van',icon: '🛠️', name: 'Mercedes Sprinter (Моб. сервис)', cost: 3200000, dailyCost: 4500, bonus: 'Осмотр авто на выезде без СТО' }
    ],

    // --------------------------------------------------------
    // ДОСТИЖЕНИЯ (бонусная механика)
    // --------------------------------------------------------
    achievements: [
        { id: 'first_point',  title: '🏪 Первый объект',       cond: s => PhoneBusiness.countOwned() >= 1,   reward: { cash: 50000,  xp: 50 } },
        { id: 'five_points',  title: '🏙 Бизнес-империя',      cond: s => PhoneBusiness.countOwned() >= 5,   reward: { cash: 250000, xp: 150 } },
        { id: 'ten_points',   title: '👑 Магнат автобизнеса',  cond: s => PhoneBusiness.countOwned() >= 10,  reward: { cash: 1000000, stars: 25, xp: 500 } },
        { id: 'cash_100k',    title: '💰 Первая сотня',        cond: s => PhoneBusiness.getAccumulatedCash() >= 100000, reward: { cash: 30000, xp: 40 } },
        { id: 'cash_1m',      title: '💎 Миллион в кассах',    cond: s => PhoneBusiness.getAccumulatedCash() >= 1000000, reward: { cash: 200000, xp: 200 } },
        { id: 'all_workshop', title: '🔧 Полное оснащение',    cond: s => PhoneBusiness.isWorkshopMaxed(),   reward: { cash: 500000, stars: 15, xp: 300 } }
    ],

    // --------------------------------------------------------
    // ИНИЦИАЛИЗАЦИЯ СТРУКТУРЫ
    // --------------------------------------------------------
    ensureState() {
        if (!state) return;
        if (!state.player) state.player = {};
        if (!Array.isArray(state.businesses)) state.businesses = [];

        // Подтягиваем базу из BUSINESS_DATA (data_economy.js)
        const baseData = (typeof BUSINESS_DATA !== 'undefined' && Array.isArray(BUSINESS_DATA)) ? BUSINESS_DATA : [];

        // Если точки ещё не созданы — создаём
        if (state.businesses.length === 0 && baseData.length > 0) {
            state.businesses = baseData.map(b => ({
                id: b.id,
                name: b.name,
                icon: this._iconForBiz(b.id),
                level: 0,
                cost: b.cost,
                reqStars: b.reqStars || 0,
                income: b.income,
                minLevel: b.minLevel || 1,
                perk: b.perk || '',
                desc: b.desc || '',
                img: b.img || '',
                fallback: b.fallback || '',
                stored: 0,
                stock: 100,
                maxStock: 100,
                incomeHistory: [],
                lastIncomeDay: 0,
                lastStockDay: 0
            }));
        }

        // Дополняем отсутствующие поля у существующих
        state.businesses.forEach(b => {
            if (!b) return;
            if (typeof b.stored !== 'number') b.stored = 0;
            if (typeof b.stock !== 'number') b.stock = 100;
            if (typeof b.maxStock !== 'number') b.maxStock = 100;
            if (!Array.isArray(b.incomeHistory)) b.incomeHistory = [];
            if (typeof b.lastIncomeDay !== 'number') b.lastIncomeDay = 0;
            if (typeof b.lastStockDay !== 'number') b.lastStockDay = 0;
            if (!b.icon) b.icon = this._iconForBiz(b.id);
        });

        // Цех
        if (!state.businessWorkshop) {
            state.businessWorkshop = { equipment: 0, storage: 0, brand: 0, diagnostics: 0 };
        }
        // Штат
        if (!state.businessStaff) {
            state.businessStaff = { mechanic: 0, painter: 0, manager: 0, accountant: 0 };
        }
        // Автопарк
        if (!Array.isArray(state.businessFleet)) {
            state.businessFleet = [];
        }
        // Достижения
        if (!Array.isArray(state.player.businessAchievements)) {
            state.player.businessAchievements = [];
        }
        // Бонус
        if (!this._activeBonus && state.player.businessAdBonus) {
            this._activeBonus = state.player.businessAdBonus;
        }
    },

    _iconForBiz(id) {
        const map = {
            wash: '🧼', shina: '🛞', sto: '🔧', tow_truck: '🚨',
            paint_shop: '🎨', chip_tuning: '🏎️', detailing: '✨',
            razborka: '🔩', autopodbor: '📋', taxi: '📱', customs_hub: '🏛️'
        };
        return map[id] || '💼';
    },

    // --------------------------------------------------------
    // РАСЧЁТЫ
    // --------------------------------------------------------
    countOwned() {
        return (state.businesses || []).filter(b => b && b.level > 0).length;
    },

    isWorkshopMaxed() {
        if (!state.businessWorkshop) return false;
        return this.workshopUpgrades.every(u => (state.businessWorkshop[u.id] || 0) >= u.maxLevel);
    },

    getWorkshopBonus(branch) {
        if (!state.businessWorkshop) return 0;
        return state.businessWorkshop[branch] || 0;
    },

    getTotalDailyIncome() {
        if (!Array.isArray(state.businesses)) return 0;
        let total = 0;

        state.businesses.forEach(b => {
            if (!b || b.level <= 0) return;
            // Если сырья нет — доход падает до 15%
            const supplyMul = b.stock > 0 ? 1.0 : 0.15;
            let inc = b.income * Math.pow(1.55, Math.max(0, b.level - 1)) * supplyMul;
            total += inc;
        });

        // Бонус цеха — оснащение
        total *= (1 + this.getWorkshopBonus('equipment') * 0.15);
        // Бонус бренда
        total *= (1 + this.getWorkshopBonus('brand') * 0.20);
        // Бухгалтер
        if ((state.businessStaff?.accountant || 0) > 0) total *= 1.08;
        // Рекламная кампания
        if (this._activeBonus && this._activeBonus.expiresDay >= (state.player?.day || 1)) {
            total *= (1 + this._activeBonus.bonusPct / 100);
        }

        return Math.round(total);
    },

    getAccumulatedCash() {
        if (!Array.isArray(state.businesses)) return 0;
        let total = 0;
        state.businesses.forEach(b => {
            if (b && b.level > 0) total += Math.floor(b.stored || 0);
        });
        return total;
    },

    // --------------------------------------------------------
    // ГЛАВНЫЙ РЕНДЕР
    // --------------------------------------------------------
    render(container) {
        if (!container) {
            console.warn('[PhoneBusiness] render: нет контейнера');
            return;
        }
        this.ensureState();

        const tab = this.currentTab;
        const dailyIncome = this.getTotalDailyIncome();
        const accumulated = this.getAccumulatedCash();
        const ownedCount = this.countOwned();
        const totalBiz = (state.businesses || []).length;

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn">
                    <i class="fa-solid fa-chevron-left"></i> Назад
                </button>
                <div class="phone-app-title color-green">
                    <i class="fa-solid fa-briefcase mr-1"></i> Бизнес-Сеть
                </div>
                <div style="width:40px;"></div>
            </div>

            <div class="phone-app-body">
                <!-- ВЕРХНЯЯ ПАНЕЛЬ СО СВОДКОЙ -->
                <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.16), #090e18); border-color: rgba(0, 230, 118, 0.4);">
                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs color-green">Бизнес-сеть перекупа</b>
                            <div class="sub-label" style="font-size:8.5px;">Точек: <b>${ownedCount} / ${totalBiz}</b></div>
                        </div>
                        <span class="tag-badge bg-tag-green">+${dailyIncome.toLocaleString()} ₽/день</span>
                    </div>

                    <div class="flex-between p-2 mt-2" style="background:#050914; border-radius:10px; border:1px solid rgba(0,230,118,0.25);">
                        <div>
                            <span class="sub-label" style="font-size:8.5px;">Свободно в кассах:</span>
                            <div class="price-val color-green" style="font-size:15px;">${accumulated.toLocaleString()} ₽</div>
                        </div>
                        <button onclick="PhoneBusiness.collectAllCash()" class="btn btn-green btn-sm btn-auto font-bold" ${accumulated <= 0 ? 'disabled' : ''}>
                            <i class="fa-solid fa-hand-holding-dollar mr-1"></i> Собрать всё
                        </button>
                    </div>

                    ${this._activeBonus && this._activeBonus.expiresDay >= (state.player?.day || 1) ? `
                        <div class="p-2 mt-2 flex-between" style="background:rgba(255,179,0,0.1); border-radius:8px; border:1px solid rgba(255,179,0,0.4);">
                            <div class="sub-label" style="font-size:9px;">
                                📻 <b class="color-amber">Рекламная кампания активна!</b>
                                <div style="font-size:8px; margin-top:2px;">+${this._activeBonus.bonusPct}% к выручке до дня ${this._activeBonus.expiresDay}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- ТАБЫ -->
                <div class="grid-4 mb-2" style="gap:4px;">
                    <button onclick="PhoneBusiness.setTab('points')" class="btn ${tab === 'points' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        <i class="fa-solid fa-store"></i><br>Точки
                    </button>
                    <button onclick="PhoneBusiness.setTab('workshop')" class="btn ${tab === 'workshop' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        <i class="fa-solid fa-screwdriver-wrench"></i><br>Цех
                    </button>
                    <button onclick="PhoneBusiness.setTab('staff')" class="btn ${tab === 'staff' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        <i class="fa-solid fa-users"></i><br>Штат
                    </button>
                    <button onclick="PhoneBusiness.setTab('fleet')" class="btn ${tab === 'fleet' ? 'btn-green' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">
                        <i class="fa-solid fa-truck"></i><br>Парк
                    </button>
                </div>

                <!-- КОНТЕНТ ТАБА -->
                <div id="bizTabContent"></div>
            </div>
        `;

        const content = document.getElementById('bizTabContent');
        if (tab === 'points') this.renderPointsTab(content);
        else if (tab === 'workshop') this.renderWorkshopTab(content);
        else if (tab === 'staff') this.renderStaffTab(content);
        else if (tab === 'fleet') this.renderFleetTab(content);
    },

    setTab(tab) {
        this.currentTab = tab;
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // ТАБ 1: ТОЧКИ
    // --------------------------------------------------------
        // --------------------------------------------------------
    // ТАБ 1: ТОЧКИ (с обложками)
    // --------------------------------------------------------
    renderPointsTab(container) {
        if (!container) return;
        const pLvl = state.player?.level || 1;

        let html = '';

        // Сортируем: купленные сверху, потом по minLevel
        const sorted = [...state.businesses].sort((a, b) => {
            if ((a.level > 0) !== (b.level > 0)) return b.level > 0 ? 1 : -1;
            return (a.minLevel || 1) - (b.minLevel || 1);
        });

        sorted.forEach(b => {
            if (!b) return;
            const isOwned = b.level > 0;
            const nextLevel = b.level + 1;
            const upgradeCost = Math.round(b.cost * Math.pow(1.65, b.level));
            const isMaxed = b.level >= 5;
            const isLockedByLevel = !isOwned && pLvl < (b.minLevel || 1);

            const currentIncome = isOwned ? Math.round(b.income * Math.pow(1.55, Math.max(0, b.level - 1))) : 0;
            const cash = Math.floor(b.stored || 0);
            const stock = Math.round(b.stock || 0);
            const maxStock = b.maxStock || 100;
            const stockPct = Math.round((stock / maxStock) * 100);

            // Цветовые классы
            const stockColor = stock < 30 ? 'color-red' : (stock < 60 ? 'color-amber' : 'color-green');
            const stockLabel = stock < 30 ? '⚠ Мало сырья!' : (stock < 60 ? 'Норма' : 'Полный склад');

            // Бейдж статуса
            let statusBadge = '';
            if (!isOwned && isLockedByLevel) {
                statusBadge = `<span class="tag-badge bg-tag-red">🔒 ${b.minLevel} ур.</span>`;
            } else if (!isOwned) {
                statusBadge = `<span class="tag-badge bg-tag-cyan">Доступен</span>`;
            } else if (isMaxed) {
                statusBadge = `<span class="tag-badge bg-tag-amber">MAX ур.</span>`;
            } else {
                statusBadge = `<span class="tag-badge bg-tag-green">Ур. ${b.level}</span>`;
            }

            // ====================================================
            // ОБЛОЖКА С КАСКАДНЫМ ФОЛБЕКОМ
            // ====================================================
            const rawImg = b.img || '';
            const fallbackImg = b.fallback || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80';

            // Пытаемся построить каскад через buildCarImageAttrs (уже есть в проекте)
            let imgAttrs;
            if (typeof buildCarImageAttrs === 'function' && rawImg) {
                // Собираем "car-подобный" объект для совместимости
                const bizCarLike = {
                    img: rawImg,
                    images: [rawImg],
                    fallback: fallbackImg,
                    type: 'comfort' // категория для общего фолбека
                };
                imgAttrs = buildCarImageAttrs(rawImg, bizCarLike);
            } else {
                // Ручной каскадный фолбек
                imgAttrs = `src="${rawImg || fallbackImg}" onerror="this.onerror=null; this.src='${fallbackImg}';"`;
            }

            // Кнопки
            let actionsHtml = '';
            if (isLockedByLevel) {
                actionsHtml = `<button class="btn btn-dark btn-sm w-full opacity-50" disabled>🔒 Требуется ${b.minLevel} ур.</button>`;
            } else if (!isOwned) {
                const canAfford = (state.player?.cash || 0) >= b.cost;
                actionsHtml = `<button onclick="PhoneBusiness.upgradePoint('${b.id}')" class="btn ${canAfford ? 'btn-green' : 'btn-dark opacity-50'} btn-sm w-full font-bold" ${canAfford ? '' : 'disabled'}>
                    🏗 Купить объект (${b.cost.toLocaleString()} ₽${b.reqStars ? ` + ${b.reqStars} ⭐` : ''})
                </button>`;
            } else {
                actionsHtml = `
                    <div class="grid-2 mb-2" style="gap:6px;">
                        <button onclick="PhoneBusiness.collectPointCash('${b.id}')" class="btn btn-green btn-sm" ${cash <= 0 ? 'disabled' : ''}>
                            <i class="fa-solid fa-hand-holding-dollar"></i> Снять (${cash.toLocaleString()} ₽)
                        </button>
                        <button onclick="PhoneBusiness.buySupplies('${b.id}')" class="btn btn-cyan btn-sm">
                            <i class="fa-solid fa-box"></i> Сырьё (15k)
                        </button>
                    </div>
                    ${!isMaxed ? `
                        <button onclick="PhoneBusiness.upgradePoint('${b.id}')" class="btn btn-amber btn-sm w-full" ${(state.player?.cash || 0) < upgradeCost ? 'disabled' : ''}>
                            ⬆ Улучшить до ур. ${nextLevel} (${upgradeCost.toLocaleString()} ₽)
                        </button>
                    ` : `
                        <button class="btn btn-dark btn-sm w-full opacity-50" disabled>🏆 Максимальный уровень</button>
                    `}
                `;
            }

            html += `
                <div class="glass-card mb-2 p-2" style="border-left: 3px solid ${isOwned ? 'var(--green)' : (isLockedByLevel ? 'rgba(255,255,255,0.1)' : 'var(--cyan)')}; position:relative; overflow:hidden;">

                    <!-- ОБЛОЖКА БИЗНЕСА -->
                    <div class="car-img-wrap mb-2" style="height:130px; position:relative; border-radius:12px; overflow:hidden; ${isLockedByLevel ? 'filter: grayscale(0.85) brightness(0.55);' : ''}">
                        <img ${imgAttrs} class="car-img" style="width:100%; height:100%; object-fit:cover; display:block;"
                             onerror="if(this.dataset.fbAttempted!=='1'){this.dataset.fbAttempted='1'; this.src='${fallbackImg}';}else{this.style.display='none'; this.parentNode.style.background='linear-gradient(135deg,#090e18,#050914)'; this.parentNode.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;font-size:52px;opacity:0.35;\\'>${b.icon}</div>';}">

                        <!-- ИКОНКА-ЭМБЛЕМА В ЛЕВОМ УГЛУ -->
                        <div style="position:absolute; top:8px; left:8px; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,0.2); border-radius:8px; padding:4px 8px; font-size:18px; line-height:1; z-index:5;">
                            ${b.icon}
                        </div>

                        <!-- БЕЙДЖ СТАТУСА В ПРАВОМ УГЛУ -->
                        <div style="position:absolute; top:8px; right:8px; z-index:5;">
                            ${statusBadge}
                        </div>

                        <!-- ГРАДИЕНТ СНИЗУ -->
                        <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%); pointer-events:none;"></div>

                        <!-- НАЗВАНИЕ НА ОБЛОЖКЕ -->
                        <div style="position:absolute; bottom:8px; left:10px; right:10px; z-index:5;">
                            <b class="text-xs ${isOwned ? 'color-green' : 'color-cyan'}" style="font-size:13px; text-shadow:0 2px 6px rgba(0,0,0,0.9);">${b.name}</b>
                        </div>
                    </div>

                    <!-- ОПИСАНИЕ -->
                    <div class="sub-label mb-2" style="font-size:9px; line-height:1.35;">${b.desc || ''}</div>

                    <!-- ПЕРК И СТАТИСТИКА -->
                    <div class="p-2 mb-2" style="background:rgba(0,0,0,0.4); border-radius:8px;">
                        <div class="sub-label mb-1" style="font-size:8.5px;">⭐ ${b.perk}</div>
                        ${isOwned ? `
                            <div class="grid-3 text-xs mt-1" style="gap:4px;">
                                <div>Доход: <b class="color-green">+${currentIncome.toLocaleString()} ₽/д</b></div>
                                <div>Касса: <b class="color-cyan">${(cash/1000).toFixed(1)}k ₽</b></div>
                                <div>Сырьё: <b class="${stockColor}">${stockPct}%</b></div>
                            </div>
                            ${stock < 30 ? `<div class="sub-label mt-1 color-red" style="font-size:8.5px;">${stockLabel}</div>` : ''}
                        ` : `
                            <div class="grid-2 text-xs mt-1">
                                <div>Старт: <b class="color-green">+${b.income.toLocaleString()} ₽/д</b></div>
                                <div>Цена: <b class="color-amber">${b.cost.toLocaleString()} ₽</b></div>
                            </div>
                        `}
                    </div>

                    ${isOwned ? this.renderSparkline(b) : ''}

                    ${actionsHtml}
                </div>
            `;
        });

        // Достижения
        html += this.renderAchievementsBlock();

        container.innerHTML = html;

        // Рисуем графики после вставки в DOM
        state.businesses.forEach(b => {
            if (b && b.level > 0) this.drawSparkline(b);
        });
    },

    // --------------------------------------------------------
    // SPARKLINE 7-ДНЕВНЫЙ ГРАФИК ДОХОДА
    // --------------------------------------------------------
    renderSparkline(biz) {
        const canvasId = `bizSpark_${biz.id}`;
        return `
            <div class="p-2 mb-2" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                <div class="flex-between mb-1">
                    <span class="sub-label" style="font-size:8px;">📈 Доход за 7 дней:</span>
                    <span class="sub-label" style="font-size:8px;" id="sparkLabel_${biz.id}">—</span>
                </div>
                <canvas id="${canvasId}" width="360" height="50" style="width:100%; height:50px; display:block;"></canvas>
            </div>
        `;
    },

    drawSparkline(biz) {
        const canvas = document.getElementById(`bizSpark_${biz.id}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;
        const history = (biz.incomeHistory || []).slice(-7);

        ctx.clearRect(0, 0, W, H);

        // Фон
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, W, H);

        // Сетка
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            const y = (H / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        if (history.length < 2) {
            ctx.fillStyle = 'rgba(148,163,184,0.5)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Накапливаем данные...', W / 2, H / 2 + 3);
            return;
        }

        const maxVal = Math.max(...history, 1);
        const stepX = W / (history.length - 1);
        const padY = 6;
        const usableH = H - padY * 2;

        // Линия
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 2;
        ctx.beginPath();
        history.forEach((val, i) => {
            const x = i * stepX;
            const y = H - padY - (val / maxVal) * usableH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Заливка
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(0,230,118,0.35)');
        grad.addColorStop(1, 'rgba(0,230,118,0.02)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Точки
        history.forEach((val, i) => {
            const x = i * stepX;
            const y = H - padY - (val / maxVal) * usableH;
            ctx.fillStyle = '#00e676';
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Подпись макс/мин
        const label = document.getElementById(`sparkLabel_${biz.id}`);
        if (label) {
            label.innerText = `Макс: ${maxVal.toLocaleString()} ₽ | Всего: ${history.reduce((a, b) => a + b, 0).toLocaleString()} ₽`;
        }
    },

    // --------------------------------------------------------
    // ДОСТИЖЕНИЯ
    // --------------------------------------------------------
    renderAchievementsBlock() {
        const unlocked = state.player?.businessAchievements || [];
        const html = this.achievements.map(a => {
            const isDone = unlocked.includes(a.id);
            return `
                <div class="p-2 mb-1 flex-between" style="background:${isDone ? 'rgba(0,230,118,0.08)' : '#050914'}; border-radius:8px; border:1px solid ${isDone ? 'rgba(0,230,118,0.3)' : 'rgba(255,255,255,0.05)'};">
                    <div>
                        <b class="text-xs ${isDone ? 'color-green' : 'color-main'}" style="font-size:11px;">${a.title}</b>
                        <div class="sub-label" style="font-size:8.5px;">Награда: ${a.reward.cash ? `+${a.reward.cash.toLocaleString()} ₽ ` : ''}${a.reward.stars ? `+${a.reward.stars} ⭐ ` : ''}${a.reward.xp ? `+${a.reward.xp} XP` : ''}</div>
                    </div>
                    ${isDone ? '<span class="tag-badge bg-tag-green">✓</span>' : '<span class="tag-badge bg-tag-dark">🔒</span>'}
                </div>
            `;
        }).join('');

        return `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(255,179,0,0.1), #090e18); border-color: rgba(255,179,0,0.3);">
                <div class="flex-between mb-2">
                    <b class="text-xs color-amber"><i class="fa-solid fa-trophy mr-1"></i> Достижения бизнес-империи</b>
                    <span class="tag-badge bg-tag-amber">${unlocked.length} / ${this.achievements.length}</span>
                </div>
                ${html}
            </div>
        `;
    },

    checkAchievements() {
        if (!state.player) return;
        if (!Array.isArray(state.player.businessAchievements)) {
            state.player.businessAchievements = [];
        }
        let unlocked = false;
        this.achievements.forEach(a => {
            if (state.player.businessAchievements.includes(a.id)) return;
            try {
                if (a.cond()) {
                    state.player.businessAchievements.push(a.id);
                    state.player.cash = (state.player.cash || 0) + (a.reward.cash || 0);
                    if (a.reward.stars) state.player.stars = (state.player.stars || 0) + a.reward.stars;
                    if (a.reward.xp && typeof addXp === 'function') addXp(a.reward.xp);
                    if (typeof showToast === 'function') showToast(`🏆 Достижение: «${a.title}»!`);
                    if (typeof playSound === 'function') playSound('win');
                    unlocked = true;
                }
            } catch (e) {
                console.warn('[Business] Ошибка проверки достижения:', a.id, e);
            }
        });
        if (unlocked && typeof saveState === 'function') saveState();
    },

    // --------------------------------------------------------
    // ТАБ 2: ЦЕХ
    // --------------------------------------------------------
    renderWorkshopTab(container) {
        if (!container) return;

        let html = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.12), #090e18); border-color: rgba(0,242,254,0.3);">
                <b class="text-xs color-cyan"><i class="fa-solid fa-screwdriver-wrench mr-1"></i> Центральный цех сети</b>
                <div class="sub-label mt-1" style="font-size:9px;">Прокачка цеха даёт пассивные бонусы всем точкам одновременно.</div>
            </div>
        `;

        this.workshopUpgrades.forEach(u => {
            const curLvl = state.businessWorkshop[u.id] || 0;
            const isMax = curLvl >= u.maxLevel;
            const cost = Math.round(u.baseCost * Math.pow(u.costMul, curLvl));
            const canAfford = (state.player?.cash || 0) >= cost;

            html += `
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <div class="flex-gap" style="align-items:center;">
                            <span style="font-size:22px;">${u.icon}</span>
                            <div>
                                <b class="text-xs color-cyan">${u.name}</b>
                                <div class="sub-label" style="font-size:8.5px;">${u.desc}</div>
                            </div>
                        </div>
                        <span class="tag-badge ${isMax ? 'bg-tag-amber' : 'bg-tag-cyan'}">${curLvl}/${u.maxLevel}</span>
                    </div>

                    <div class="progress-track mb-2" style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                        <div style="width:${(curLvl / u.maxLevel) * 100}%; height:100%; background:linear-gradient(90deg,var(--cyan),var(--green));"></div>
                    </div>

                    ${isMax ? `
                        <button class="btn btn-dark btn-sm w-full opacity-50" disabled>✓ Максимум прокачано</button>
                    ` : `
                        <button onclick="PhoneBusiness.upgradeWorkshop('${u.id}')" class="btn ${canAfford ? 'btn-cyan' : 'btn-dark opacity-50'} btn-sm w-full" ${canAfford ? '' : 'disabled'}>
                            ⬆ Прокачать до ${curLvl + 1} ур. (${cost.toLocaleString()} ₽)
                        </button>
                    `}
                </div>
            `;
        });

        container.innerHTML = html;
    },

    // --------------------------------------------------------
    // ТАБ 3: ШТАТ
    // --------------------------------------------------------
    renderStaffTab(container) {
        if (!container) return;

        let html = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(192,132,252,0.12), #090e18); border-color: rgba(192,132,252,0.3);">
                <b class="text-xs color-purple"><i class="fa-solid fa-users mr-1"></i> Управление кадрами</b>
                <div class="sub-label mt-1" style="font-size:9px;">Специалисты автоматизируют рутину и увеличивают прибыль сети.</div>
            </div>
        `;

        this.staffList.forEach(s => {
            const hired = state.businessStaff[s.id] || 0;
            const isMax = hired >= s.maxHired;
            const canAfford = (state.player?.cash || 0) >= s.salary;

            html += `
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <div class="flex-gap" style="align-items:center;">
                            <span style="font-size:22px;">${s.icon}</span>
                            <div>
                                <b class="text-xs color-purple">${s.name}</b>
                                <div class="sub-label" style="font-size:8.5px;">${s.role}</div>
                            </div>
                        </div>
                        <span class="tag-badge ${isMax ? 'bg-tag-amber' : 'bg-tag-purple'}">${hired}/${s.maxHired}</span>
                    </div>

                    <div class="p-2 mb-2" style="background:rgba(0,0,0,0.4); border-radius:8px;">
                        <div class="sub-label" style="font-size:9px;">⭐ ${s.perk}</div>
                        <div class="sub-label mt-1" style="font-size:8.5px;">Оклад: <b class="color-amber">${s.salary.toLocaleString()} ₽</b> / мес.</div>
                    </div>

                    ${isMax ? `
                        <button class="btn btn-dark btn-sm w-full opacity-50" disabled>Штат укомплектован</button>
                    ` : `
                        <button onclick="PhoneBusiness.hireStaff('${s.id}')" class="btn ${canAfford ? 'btn-purple' : 'btn-dark opacity-50'} btn-sm w-full" ${canAfford ? '' : 'disabled'}>
                            <i class="fa-solid fa-user-plus mr-1"></i> Нанять (${s.salary.toLocaleString()} ₽)
                        </button>
                    `}
                </div>
            `;
        });

        container.innerHTML = html;
    },

    // --------------------------------------------------------
    // ТАБ 4: АВТОПАРК
    // --------------------------------------------------------
    renderFleetTab(container) {
        if (!container) return;

        let html = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(255,179,0,0.12), #090e18); border-color: rgba(255,179,0,0.3);">
                <b class="text-xs color-amber"><i class="fa-solid fa-truck mr-1"></i> Корпоративный транспорт</b>
                <div class="sub-label mt-1" style="font-size:9px;">Спецтехника снижает логистические расходы и расширяет радиус подбора.</div>
            </div>
        `;

        this.fleetVehicles.forEach(v => {
            const isOwned = state.businessFleet.includes(v.id);
            const canAfford = (state.player?.cash || 0) >= v.cost;

            html += `
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-1">
                        <div class="flex-gap" style="align-items:center;">
                            <span style="font-size:22px;">${v.icon}</span>
                            <div>
                                <b class="text-xs color-amber">${v.name}</b>
                                <div class="sub-label" style="font-size:8.5px;">${v.bonus}</div>
                            </div>
                        </div>
                        ${isOwned ? '<span class="tag-badge bg-tag-green">В парке ✓</span>' : `<span class="tag-badge bg-tag-dark">${v.cost.toLocaleString()} ₽</span>`}
                    </div>

                    <div class="sub-label mb-2" style="font-size:8.5px;">Обслуживание: <b>${v.dailyCost.toLocaleString()} ₽/день</b></div>

                    ${isOwned ? `
                        <button class="btn btn-dark btn-sm w-full opacity-50" disabled>✓ Куплено в автопарк</button>
                    ` : `
                        <button onclick="PhoneBusiness.buyFleetVehicle('${v.id}')" class="btn ${canAfford ? 'btn-amber' : 'btn-dark opacity-50'} btn-sm w-full" ${canAfford ? '' : 'disabled'}>
                            <i class="fa-solid fa-cart-shopping mr-1"></i> Купить (${v.cost.toLocaleString()} ₽)
                        </button>
                    `}
                </div>
            `;
        });

        container.innerHTML = html;
    },

    // --------------------------------------------------------
    // ДЕЙСТВИЯ: СБОР КАССЫ
    // --------------------------------------------------------
    collectAllCash() {
        this.ensureState();
        let total = 0;

        state.businesses.forEach(b => {
            if (b && b.level > 0 && b.stored > 0) {
                total += Math.floor(b.stored);
                b.stored = 0;
            }
        });

        if (total <= 0) {
            if (typeof showToast === 'function') showToast('В кассах пусто!');
            return;
        }

        state.player.cash = (state.player.cash || 0) + total;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction('Сбор кассы бизнес-сети', total, true);
        }

        if (typeof trackQuestProgress === 'function') trackQuestProgress('collect_biz', 1);
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast(`💰 Собрано: +${total.toLocaleString()} ₽!`);
        if (typeof spawnFloatingReward === 'function') spawnFloatingReward(`+${total.toLocaleString()} ₽`);

        this.checkAchievements();
        this.render(document.getElementById('phoneAppContainer'));
    },

    collectPointCash(bizId) {
        this.ensureState();
        const b = state.businesses.find(x => x.id === bizId);
        if (!b || b.stored <= 0) return;

        const amount = Math.floor(b.stored);
        b.stored = 0;
        state.player.cash = (state.player.cash || 0) + amount;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Сбор кассы: ${b.name}`, amount, true);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast(`+${amount.toLocaleString()} ₽ из «${b.name}»!`);
        if (typeof trackQuestProgress === 'function') trackQuestProgress('collect_biz', 1);

        this.checkAchievements();
        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // ДЕЙСТВИЯ: СЫРЬЁ
    // --------------------------------------------------------
    buySupplies(bizId) {
        this.ensureState();
        const b = state.businesses.find(x => x.id === bizId);
        if (!b || b.level <= 0) return;

        let cost = 15000;
        // Скидка с фургоном
        if (state.businessFleet.includes('gazelle')) cost = Math.round(cost * 0.7);

        if ((state.player.cash || 0) < cost) {
            if (typeof showToast === 'function') showToast(`Нужно ${cost.toLocaleString()} ₽!`);
            return;
        }

        state.player.cash -= cost;
        b.stock = b.maxStock;

        if (typeof logBankTransaction === 'function') logBankTransaction(`Сырьё: ${b.name}`, cost, false);
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof showToast === 'function') showToast(`Склад «${b.name}» пополнен до 100%`);

        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // ДЕЙСТВИЯ: АПГРЕЙД ТОЧКИ
    // --------------------------------------------------------
    upgradePoint(bizId) {
        this.ensureState();
        const b = state.businesses.find(x => x.id === bizId);
        if (!b) return;

        const isNew = b.level === 0;
        const cost = isNew ? b.cost : Math.round(b.cost * Math.pow(1.65, b.level));
        const pLvl = state.player?.level || 1;

        if (isNew && pLvl < (b.minLevel || 1)) {
            if (typeof showToast === 'function') showToast(`Нужен ${b.minLevel} уровень!`);
            return;
        }
        if ((state.player.cash || 0) < cost) {
            if (typeof showToast === 'function') showToast(`Нужно ${cost.toLocaleString()} ₽!`);
            return;
        }

        state.player.cash -= cost;
        if (b.level === 0) {
            b.level = 1;
            b.stock = 100;
        } else {
            b.level += 1;
        }

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(isNew ? `Покупка бизнеса: ${b.name}` : `Апгрейд бизнеса: ${b.name}`, cost, false);
        }

        // XP-бонус за апгрейд
        if (typeof addXp === 'function') addXp(isNew ? 60 : 30);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') {
            showToast(isNew ? `🎉 Куплено: «${b.name}»!` : `⬆ Апгрейд «${b.name}» до ур. ${b.level}!`);
        }

        this.checkAchievements();
        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // ДЕЙСТВИЯ: ЦЕХ, ШТАТ, ПАРК
    // --------------------------------------------------------
    upgradeWorkshop(branch) {
        const u = this.workshopUpgrades.find(x => x.id === branch);
        if (!u) return;
        const curLvl = state.businessWorkshop[branch] || 0;
        if (curLvl >= u.maxLevel) return;

        const cost = Math.round(u.baseCost * Math.pow(u.costMul, curLvl));
        if ((state.player.cash || 0) < cost) {
            if (typeof showToast === 'function') showToast(`Нужно ${cost.toLocaleString()} ₽!`);
            return;
        }

        state.player.cash -= cost;
        state.businessWorkshop[branch] = curLvl + 1;

        if (typeof logBankTransaction === 'function') logBankTransaction(`Апгрейд цеха: ${u.name}`, cost, false);
        if (typeof addXp === 'function') addXp(40);
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast(`🛠 ${u.name}: уровень ${curLvl + 1}!`);

        this.checkAchievements();
        this.render(document.getElementById('phoneAppContainer'));
    },

    hireStaff(staffId) {
        const s = this.staffList.find(x => x.id === staffId);
        if (!s) return;
        const hired = state.businessStaff[staffId] || 0;
        if (hired >= s.maxHired) return;

        if ((state.player.cash || 0) < s.salary) {
            if (typeof showToast === 'function') showToast(`Нужно ${s.salary.toLocaleString()} ₽!`);
            return;
        }

        state.player.cash -= s.salary;
        state.businessStaff[staffId] = hired + 1;

        if (typeof logBankTransaction === 'function') logBankTransaction(`Найм: ${s.name}`, s.salary, false);
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast(`👤 Нанят: ${s.name}`);

        this.render(document.getElementById('phoneAppContainer'));
    },

    buyFleetVehicle(vehId) {
        const v = this.fleetVehicles.find(x => x.id === vehId);
        if (!v) return;
        if (state.businessFleet.includes(vehId)) return;

        if ((state.player.cash || 0) < v.cost) {
            if (typeof showToast === 'function') showToast(`Нужно ${v.cost.toLocaleString()} ₽!`);
            return;
        }

        state.player.cash -= v.cost;
        state.businessFleet.push(vehId);

        if (typeof logBankTransaction === 'function') logBankTransaction(`Покупка транспорта: ${v.name}`, v.cost, false);
        if (typeof addXp === 'function') addXp(80);
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast(`🚚 Куплено: ${v.name}`);

        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // БОНУС: РЕКЛАМНАЯ КАМПАНИЯ
    // --------------------------------------------------------
    orderAdCampaign() {
        const cost = 50000;
        if ((state.player.cash || 0) < cost) {
            if (typeof showToast === 'function') showToast(`Нужно ${cost.toLocaleString()} ₽ на рекламу!`);
            return;
        }
        const curDay = state.player?.day || 1;
        if (this._activeBonus && this._activeBonus.expiresDay >= curDay) {
            if (typeof showToast === 'function') showToast('Реклама уже крутится!');
            return;
        }

        state.player.cash -= cost;
        this._activeBonus = { type: 'ad_campaign', expiresDay: curDay + 3, bonusPct: 15 };
        state.player.businessAdBonus = this._activeBonus;

        if (typeof logBankTransaction === 'function') logBankTransaction('Рекламная кампания бизнеса', cost, false);
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast('📻 Реклама запущена! +15% к выручке на 3 дня.');

        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // ТИК: РАЗ В 30 СЕК НАЧИСЛЯЕМ ДОХОД
    // --------------------------------------------------------
    tickIncome() {
        if (!state || !Array.isArray(state.businesses)) return;
        this.ensureState();

        const curDay = state.player?.day || 1;
        const hourlyRate = this.getTotalDailyIncome() / 24;
        const tickHours = 30 / 3600; // 30 сек = 1/120 часа
        let anyIncome = false;

        state.businesses.forEach(b => {
            if (!b || b.level <= 0) return;

            // Тратим сырьё
            if (b.stock > 0) {
                b.stock = Math.max(0, b.stock - 1.5 * tickHours * 60);
            } else {
                // Медленно копим сырьё если управляющий
                if ((state.businessStaff?.manager || 0) > 0 && Math.random() < 0.1) {
                    b.stock = Math.min(b.maxStock, b.stock + 5);
                }
            }

            // Начисляем доход
            const supplyMul = b.stock > 0 ? 1.0 : 0.15;
            const bizIncome = b.income * Math.pow(1.55, Math.max(0, b.level - 1)) * supplyMul;
            const tickGain = (bizIncome / 24 / 3600) * 30;
            b.stored = (b.stored || 0) + tickGain;
            anyIncome = true;
        });

        // Обновляем активный бонус
        if (this._activeBonus && this._activeBonus.expiresDay < curDay) {
            this._activeBonus = null;
            state.player.businessAdBonus = null;
        }

        if (anyIncome && Math.random() < 0.15) {
            // Раз в ~3 минуты обновляем header и виджет
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.renderBusinessWidget === 'function') {
                PhoneManager.renderBusinessWidget();
            }
        }
    },

    // --------------------------------------------------------
    // СУТОЧНОЕ ОБНОВЛЕНИЕ (вызывается из executeDayCycleMidnight)
    // --------------------------------------------------------
    onNewDay() {
        if (!state || !state.player) return;
        const curDay = state.player.day || 1;

        // Записываем доход за прошедший день в историю
        state.businesses.forEach(b => {
            if (!b || b.level <= 0) return;
            const supplyMul = b.stock > 0 ? 1.0 : 0.15;
            const dayIncome = Math.round(b.income * Math.pow(1.55, Math.max(0, b.level - 1)) * supplyMul);
            b.incomeHistory.push(dayIncome);
            if (b.incomeHistory.length > 7) {
                b.incomeHistory = b.incomeHistory.slice(-7);
            }
            b.lastIncomeDay = curDay;

            // Сырьё тратится за сутки
            b.stock = Math.max(0, b.stock - 25);
        });

        // Автозахват кассы, если есть Управляющий
        if ((state.businessStaff?.manager || 0) > 0) {
            let autoCollected = 0;
            state.businesses.forEach(b => {
                if (b && b.level > 0 && b.stored > 0) {
                    autoCollected += Math.floor(b.stored);
                    b.stored = 0;
                }
            });
            if (autoCollected > 0) {
                state.player.cash = (state.player.cash || 0) + autoCollected;
                if (typeof logBankTransaction === 'function') {
                    logBankTransaction('Автосбор кассы (Управляющий)', autoCollected, true);
                }
                if (typeof showToast === 'function') {
                    showToast(`🤖 Управляющий собрал кассу: +${autoCollected.toLocaleString()} ₽`);
                }
            }
        }

        // Проверка достижений
        this.checkAchievements();
        if (typeof saveState === 'function') saveState();
    },

    // --------------------------------------------------------
    // ЗАПУСК ТИКА (вызывается из initApp)
    // --------------------------------------------------------
    startTickLoop() {
        if (this._tickInterval) return;
        this._tickInterval = setInterval(() => this.tickIncome(), 30000);
    }
};

// ⭐ Алиасы для совместимости
window.PhoneBusiness = PhoneBusiness;
window.AppBusiness = PhoneBusiness;

// Запуск тика при загрузке
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => PhoneBusiness.startTickLoop(), 3000);
    });
}

console.log('[💼 phone-business v2.0.0] Бизнес-сеть загружена ✓');
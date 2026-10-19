// ========================================================
// js/phone/phone-business.js — БИЗНЕС-СЕТЬ ПЕРЕКУПА (v7.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v7.0.0 (B2B ТЕНДЕРЫ, КРИЗИС-МЕНЕДЖМЕНТ И СИНЕРГИЯ):
//   1. Новая вкладка «Тендеры»: корпоративные контракты для таксопарков,
//      курьерских служб и ТК с мгновенным авансом и бустом к кассе.
//   2. Кризисные инциденты при инкассации: проверки налоговой, Роспотребнадзора
//      и поломки на линии с выбором вариантов решения (кэш, связи, техника).
//   3. Учёт монобрендовой синергии парка (VAG, LADA, Корея, ГАЗ, КамАЗ).
//   4. Синхронизация с системой ежедневных квестов (trackQuestProgress).
//   5. Непрерывное начисление дохода по реальному времени с защитой от сбоев.
// ========================================================

const PhoneBusiness = {
    currentTab: 'points',
    _tickInterval: null,
    _activeBonus: null,
    _ensureStateInProgress: false,

    _collectAllPending: false,
    _collectPointPending: false,
    _tickPending: false,
    _upgradePending: false,
    _tenderPending: false,

    get ECONOMIC_CYCLES() { return window.BusinessDataModule?.ECONOMIC_CYCLES || {}; },
    get NETWORK_MILESTONES() { return window.BusinessDataModule?.NETWORK_MILESTONES || []; },
    get DNA_LOCATIONS() { return window.BusinessDataModule?.DNA_LOCATIONS || []; },
    get DNA_TRAFFIC() { return window.BusinessDataModule?.DNA_TRAFFIC || []; },
    get DNA_CONDITION() { return window.BusinessDataModule?.DNA_CONDITION || []; },
    get DNA_STAFF() { return window.BusinessDataModule?.DNA_STAFF || []; },
    get CRISIS_EVENTS() {
        if (window.BUSINESS_CRISIS_EVENTS && Array.isArray(window.BUSINESS_CRISIS_EVENTS)) {
            return window.BUSINESS_CRISIS_EVENTS;
        }
        return window.BusinessDataModule?.CRISIS_EVENTS || [];
    },
    get DAILY_BIZ_CHALLENGES() { return window.BusinessDataModule?.DAILY_BIZ_CHALLENGES || []; },
    get workshopUpgrades() { return window.BusinessDataModule?.workshopUpgrades || []; },
    get staffList() { return window.BusinessDataModule?.staffList || []; },
    get fleetVehicles() { return window.BusinessDataModule?.fleetVehicles || []; },
    get achievements() { return window.BusinessDataModule?.achievements || []; },

    _fallbackCoverSkins: window.BusinessDataModule?.fallbackCoverSkins || [],
    _fallbackStickers: window.BusinessDataModule?.fallbackStickers || [],

    _getCoverSkins() {
        if (typeof window.BUSINESS_COVER_SKINS !== 'undefined' && Array.isArray(window.BUSINESS_COVER_SKINS) && window.BUSINESS_COVER_SKINS.length > 0) {
            return window.BUSINESS_COVER_SKINS;
        }
        return window.BusinessDataModule?.fallbackCoverSkins || this._fallbackCoverSkins;
    },

    _getOwnerStickers() {
        if (typeof window.BUSINESS_VIP_STICKERS !== 'undefined' && Array.isArray(window.BUSINESS_VIP_STICKERS) && window.BUSINESS_VIP_STICKERS.length > 0) {
            return window.BUSINESS_VIP_STICKERS;
        }
        return window.BusinessDataModule?.fallbackStickers || this._fallbackStickers;
    },

    get COVER_SKINS() { return this._getCoverSkins(); },
    get OWNER_STICKERS() { return this._getOwnerStickers(); },

    _n(val, fb = 0) {
        if (window.GameHelpers && window.GameHelpers.safeNum) return window.GameHelpers.safeNum(val, fb);
        const n = Number(val);
        return isNaN(n) || !isFinite(n) ? fb : n;
    },

    _bizIconsFA: {
        wash: 'fa-shower',
        shina: 'fa-circle-dot',
        sto: 'fa-screwdriver-wrench',
        tow_truck: 'fa-truck-pickup',
        delivery: 'fa-box-open',
        paint_shop: 'fa-paint-roller',
        chip_tuning: 'fa-microchip',
        detailing: 'fa-sparkles',
        razborka: 'fa-gears',
        autopodbor: 'fa-clipboard-check',
        taxi: 'fa-taxi',
        transport_company: 'fa-truck-moving',
        customs_hub: 'fa-landmark'
    },

    _getBaseBusinessData() {
        if (typeof window !== 'undefined' && window.BUSINESS_DATA && Array.isArray(window.BUSINESS_DATA) && window.BUSINESS_DATA.length > 0) {
            return window.BUSINESS_DATA;
        }
        if (typeof BUSINESS_DATA !== 'undefined' && Array.isArray(BUSINESS_DATA) && BUSINESS_DATA.length > 0) {
            return BUSINESS_DATA;
        }

        // Автономный резервный каталог точек бизнеса
        return [
            { id: 'wash', name: 'Автомойка 24/7', minLevel: 4, income: 4000, level: 0, cost: 85000, desc: 'Круглосуточный комплекс бесконтактной мойки.', img: 'assets/business/wash.jpg' },
            { id: 'shina', name: 'Шиномонтаж «У Алика»', minLevel: 6, income: 6000, level: 0, cost: 140000, desc: 'Правка дисков, ошиповка и балансировка.', img: 'assets/business/shina.jpg' },
            { id: 'sto', name: 'СТО дяди Вани', minLevel: 9, income: 12000, level: 0, cost: 280000, desc: 'Капитальный ремонт ДВС и подвески.', img: 'assets/business/sto.jpg' },
            { id: 'tow_truck', name: 'Служба эвакуации «Шериф»', minLevel: 10, income: 16000, level: 0, cost: 390000, desc: 'Эвакуация авто по городу.', img: 'assets/business/tow.jpg', fleetType: 'tow_truck' },
            { id: 'delivery', name: 'Курьерская доставка «Экспресс»', minLevel: 11, income: 18000, level: 0, cost: 480000, desc: 'Городская сеть автокурьеров.', img: 'assets/business/delivery.jpg', fleetType: 'delivery' },
            { id: 'paint_shop', name: 'Малярный цех «Хамелеон»', minLevel: 13, income: 24000, level: 0, cost: 620000, desc: 'Окрасочная камера с сушкой.', img: 'assets/business/paint.jpg' },
            { id: 'chip_tuning', name: 'Лаборатория Stage Lab', minLevel: 16, income: 30000, level: 0, cost: 800000, desc: 'Калибровка прошивок ЭБУ.', img: 'assets/business/chip.jpg' },
            { id: 'detailing', name: 'Детейлинг Студия', minLevel: 19, income: 33000, level: 0, cost: 920000, desc: 'Полировка и керамика кузова.', img: 'assets/business/detailing.jpg' },
            { id: 'razborka', name: 'Авторазборка «Последний путь»', minLevel: 22, income: 40000, level: 0, cost: 1150000, desc: 'Скупка тотальных машин на детали.', img: 'assets/business/razborka.jpg', fleetType: 'razborka' },
            { id: 'autopodbor', name: 'Агентство «Автоподбор Pro»', minLevel: 25, income: 50000, level: 0, cost: 1450000, desc: 'Выездная диагностика экспертов.', img: 'assets/business/podbor.jpg' },
            { id: 'taxi', name: 'Таксопарк', minLevel: 30, income: 80000, level: 0, cost: 3600000, desc: 'Аренда лицензированных седанов.', img: 'assets/business/taxi.jpg', fleetType: 'taxi' },
            { id: 'transport_company', name: 'Транспортная компания «Магистраль»', minLevel: 34, income: 140000, level: 0, cost: 4800000, desc: 'Магистральные тягачи и фуры.', img: 'assets/business/cargo.jpg', fleetType: 'transport_company' },
            { id: 'customs_hub', name: 'Таможенный хаб Порта', minLevel: 38, income: 160000, level: 0, cost: 5200000, desc: 'Таможенная очистка контейнеров.', img: 'assets/business/hub.jpg' }
        ];
    },

    // ========================================================
    // ИНИЦИАЛИЗАЦИЯ
    // ========================================================
    ensureState() {
        if (this._ensureStateInProgress) return;
        this._ensureStateInProgress = true;

        try {
            if (!window.state) window.state = {};
            if (!window.state.player) window.state.player = {};
            if (!Array.isArray(window.state.businesses)) window.state.businesses = [];
            if (!Array.isArray(window.state.player.activeTenders)) window.state.player.activeTenders = [];

            const baseData = this._getBaseBusinessData();

            const existingIds = new Set(window.state.businesses.filter(b => b && b.id).map(b => b.id));
            const missing = baseData.filter(b => b && b.id && !existingIds.has(b.id));

            if (missing.length > 0) {
                const newBusinesses = missing.map(b => ({
                    id: b.id,
                    name: b.name,
                    customName: b.name,
                    slogan: '',
                    icon: b.icon || this._iconForBiz(b.id),
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
                    lastStockDay: 0,
                    dna: null,
                    coverSkin: 'classic',
                    ownerSticker: 'none',
                    activeBuffs: [],
                    activeDebuffs: [],
                    reputation: 0,
                    totalEarned: 0,
                    createdAt: 0,
                    fleetType: b.fleetType || null,
                    lastTickTimestamp: Date.now()
                }));

                window.state.businesses = [...window.state.businesses, ...newBusinesses]
                    .sort((a, b) => (a.minLevel || 1) - (b.minLevel || 1));

                if (typeof saveState === 'function') saveState();
            }

            const now = Date.now();
            window.state.businesses.forEach(b => {
                if (!b) return;
                if (typeof b.stored !== 'number' || isNaN(b.stored)) b.stored = 0;
                if (typeof b.stock !== 'number' || isNaN(b.stock)) b.stock = 100;
                if (typeof b.maxStock !== 'number') b.maxStock = 100;
                if (!Array.isArray(b.incomeHistory)) b.incomeHistory = [];
                if (!b.icon) b.icon = this._iconForBiz(b.id);
                if (!b.customName) b.customName = b.name;
                if (b.level > 0 && !b.dna) b.dna = this._generateDNA(b.id);
                if (!b.lastTickTimestamp || isNaN(b.lastTickTimestamp)) b.lastTickTimestamp = now;
            });

            if (!window.state.businessWorkshop) window.state.businessWorkshop = { equipment: 0, storage: 0, brand: 0, diagnostics: 0 };
            if (!window.state.businessStaff) window.state.businessStaff = { mechanic: 0, painter: 0, manager: 0, accountant: 0 };
            if (!Array.isArray(window.state.businessFleet)) window.state.businessFleet = [];
            if (!Array.isArray(window.state.player.businessAchievements)) window.state.player.businessAchievements = [];

            if (!window.state.player.legalEntity) {
                const docs = window.state.player.documents || {};
                let inferredType = 'none';
                if (docs.oooRegistered || window.state.player.hasOOO) inferredType = 'ooo';
                else if (docs.ipRegistered || window.state.player.hasIP || window.state.player.businessRegistered) inferredType = 'ip';

                window.state.player.legalEntity = {
                    type: inferredType,
                    inn: docs.inn || window.state.player.inn || null,
                    ogrn: null,
                    companyName: null
                };
            }

            if (!window.state.player.economicCycle) {
                window.state.player.economicCycle = this._generateEconomicCycle();
            }
            if (!Array.isArray(window.state.player.dailyBizChallenges) || window.state.player.dailyBizChallenges.length === 0) {
                this._generateDailyBizChallenges();
            }

            this._checkOfflineCapitalization();
            this._syncActiveBonus();
            this.startTickLoop();
        } finally {
            this._ensureStateInProgress = false;
        }
    },

    _generateEconomicCycle() {
        const roll = Math.random();
        let cycleId = 'stable';
        if (roll < 0.25) cycleId = 'boom';
        else if (roll < 0.55) cycleId = 'bust';

        const cycle = { ...(this.ECONOMIC_CYCLES[cycleId] || { incomeMul: 1.0, name: 'Стабильный рынок' }) };
        cycle.daysLeft = Math.floor(2 + Math.random() * 4);
        cycle.startedDay = window.state?.player?.day || 1;
        return cycle;
    },

    _getEconomicCycleMultiplier() {
        const cycle = window.state?.player?.economicCycle;
        if (!cycle) return 1.0;
        const curDay = window.state?.player?.day || 1;
        const elapsed = curDay - (cycle.startedDay || curDay);
        if (elapsed >= cycle.daysLeft) return 1.0;
        return cycle.incomeMul || 1.0;
    },

    _tickEconomicCycle() {
        const curDay = window.state?.player?.day || 1;
        const cycle = window.state?.player?.economicCycle;
        if (!cycle || (curDay - (cycle.startedDay || curDay)) >= cycle.daysLeft) {
            window.state.player.economicCycle = this._generateEconomicCycle();
        }
    },

    _generateDailyBizChallenges() {
        const list = this.DAILY_BIZ_CHALLENGES;
        if (!Array.isArray(list) || list.length === 0) return;
        const shuffled = [...list].sort(() => 0.5 - Math.random());
        window.state.player.dailyBizChallenges = shuffled.slice(0, 3).map(ch => ({
            id: ch.id, text: ch.text, cur: 0, max: ch.target, action: ch.action, reward: ch.reward, xp: ch.xp, done: false
        }));
    },

    _trackBizChallenge(actionType, count = 1) {
        const challenges = window.state?.player?.dailyBizChallenges;
        if (!Array.isArray(challenges)) return;

        let updated = false;
        challenges.forEach(ch => {
            if (!ch.done && ch.action === actionType) {
                ch.cur = Math.min(ch.max, (ch.cur || 0) + count);
                updated = true;
                if (ch.cur >= ch.max) {
                    ch.done = true;
                    if (window.MoneyManager && typeof window.MoneyManager.earn === 'function') {
                        window.MoneyManager.earn(ch.reward, `Бизнес-челлендж: ${ch.text}`, { silent: true });
                    } else {
                        window.state.player.cash = (window.state.player.cash || 0) + ch.reward;
                    }
                    if (typeof addXp === 'function') addXp(ch.xp);
                    if (typeof showToast === 'function') showToast(`🏆 Челлендж выполнен: «${ch.text}» +${ch.reward.toLocaleString()} ₽`);
                    if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
                }
            }
        });
        if (updated && typeof saveState === 'function') saveState();
    },

    _checkOfflineCapitalization() {
        if (!window.state?.player) return;
        const lastVisit = window.state.player.lastBizVisitDay || 0;
        const curDay = window.state.player.day || 1;
        const daysAway = curDay - lastVisit;

        if (daysAway >= 3 && lastVisit > 0) {
            let bonus = 0;
            (window.state.businesses || []).forEach(b => {
                if (b && b.level > 0 && b.stored > 0) {
                    const bns = Math.round(b.stored * 0.05 * Math.min(daysAway, 7));
                    b.stored += bns;
                    bonus += bns;
                }
            });
            if (bonus > 0 && typeof showToast === 'function') {
                setTimeout(() => showToast(`💎 Оффлайн-бонус: +${bonus.toLocaleString()} ₽ к кассе!`), 2000);
            }
        }
        window.state.player.lastBizVisitDay = curDay;
        if (typeof saveState === 'function') saveState();
    },

    _getNetworkMilestoneBonus() {
        const owned = this.countOwned();
        let bonus = 0;
        for (const m of this.NETWORK_MILESTONES) {
            if (owned >= m.count) bonus = m.incomeBonus;
        }
        return bonus;
    },

    _getNextMilestone() {
        const owned = this.countOwned();
        for (const m of this.NETWORK_MILESTONES) {
            if (owned < m.count) return m;
        }
        return null;
    },

    _getDiversityBonus() {
        if (!Array.isArray(window.state?.businesses)) return 0;
        const ownedTypes = new Set(
            window.state.businesses.filter(b => b && b.level > 0).map(b => String(b.id).replace(/\d+/g, '').trim())
        );
        if (ownedTypes.size >= 5) return 0.15;
        if (ownedTypes.size >= 3) return 0.07;
        return 0;
    },

    _generateDNA(bizId) {
        const uid = String(window.state?.player?.uid || 'guest');
        const seed = (uid + '_' + bizId).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const pick = (arr, offset) => arr[(seed + offset) % arr.length];
        return {
            location:  pick(this.DNA_LOCATIONS, 0).id,
            traffic:   pick(this.DNA_TRAFFIC, 7).id,
            condition: pick(this.DNA_CONDITION, 13).id,
            staff:     pick(this.DNA_STAFF, 21).id
        };
    },

    _getDNAObject(dna) {
        if (!dna) return null;
        return {
            location:  this.DNA_LOCATIONS.find(x => x.id === dna.location)  || this.DNA_LOCATIONS[1],
            traffic:   this.DNA_TRAFFIC.find(x => x.id === dna.traffic)      || this.DNA_TRAFFIC[1],
            condition: this.DNA_CONDITION.find(x => x.id === dna.condition)  || this.DNA_CONDITION[1],
            staff:     this.DNA_STAFF.find(x => x.id === dna.staff)          || this.DNA_STAFF[1]
        };
    },

    getDNAMultiplier(dna) {
        const obj = this._getDNAObject(dna);
        if (!obj) return 1;
        return obj.location.mult * obj.traffic.mult * obj.condition.mult * obj.staff.mult;
    },

    _iconForBiz(id) {
        const faClass = this._bizIconsFA[id] || 'fa-briefcase';
        return `<i class="fa-solid ${faClass}"></i>`;
    },

    _syncActiveBonus() {
        const curDay = window.state?.player?.day || 1;
        const storedBonus = window.state?.player?.businessAdBonus;
        if (!storedBonus || (storedBonus.expiresDay || 0) < curDay) {
            this._activeBonus = null;
            if (window.state?.player) window.state.player.businessAdBonus = null;
        } else {
            this._activeBonus = storedBonus;
        }
    },

    countOwned() {
        if (!Array.isArray(window.state?.businesses)) return 0;
        return window.state.businesses.filter(b => b && b.level > 0).length;
    },

    getWorkshopBonus(branch) {
        return window.state?.businessWorkshop?.[branch] || 0;
    },

    getBizIncome(b) {
        if (!b || typeof b !== 'object' || b.level <= 0) return 0;

        let inc = this._n(b.income, 0) * Math.pow(1.55, Math.max(0, b.level - 1));
        inc *= this.getDNAMultiplier(b.dna);

        if (b.stock <= 0) inc *= 0.15;

        const curDay = window.state?.player?.day || 1;
        (b.activeBuffs || []).forEach(buff => {
            if (buff && (buff.expiresDay || 0) >= curDay) inc *= (1 + (buff.pct || 0) / 100);
        });
        (b.activeDebuffs || []).forEach(debuff => {
            if (debuff && (debuff.expiresDay || 0) >= curDay) inc *= (1 - (debuff.pct || 0) / 100);
        });

        const repBonus = Math.min(20, (b.reputation || 0) * 0.2);
        inc *= (1 + repBonus / 100);

        if (window.BusinessFleetModule) {
            const fleetIncome = window.BusinessFleetModule.calculateFleetIncomeForBiz(b.id);
            inc += fleetIncome.net;
        }

        return Math.round(inc);
    },

    getBizIncomeWithBonuses(b) {
        const base = this.getBizIncome(b);
        if (base <= 0) return 0;

        let total = base;
        total *= (1 + this.getWorkshopBonus('equipment') * 0.15);
        total *= (1 + this.getWorkshopBonus('brand') * 0.20);

        if ((window.state?.businessStaff?.accountant || 0) > 0) total *= 1.08;

        this._syncActiveBonus();
        if (this._activeBonus && this._activeBonus.expiresDay >= (window.state?.player?.day || 1)) {
            total *= (1 + (this._activeBonus.bonusPct || 0) / 100);
        }

        // B2B Тендерный множитель
        if (Array.isArray(window.state?.player?.activeTenders)) {
            const curDay = window.state?.player?.day || 1;
            const activeTnd = window.state.player.activeTenders.find(t => t && t.targetBiz === b.id && t.expiresDay >= curDay);
            if (activeTnd && activeTnd.incomeMultiplier) {
                total *= activeTnd.incomeMultiplier;
            }
        }

        total *= (1 + this._getCorporationBonus());
        total *= this._getEconomicCycleMultiplier();
        total *= (1 + this._getNetworkMilestoneBonus());
        total *= (1 + this._getDiversityBonus());

        return Math.round(total);
    },

    getTotalDailyIncome() {
        if (!Array.isArray(window.state?.businesses)) return 0;
        let total = 0;
        window.state.businesses.forEach(b => {
            if (b && b.level > 0) total += this.getBizIncomeWithBonuses(b);
        });
        return Math.round(total);
    },

    _getCorporationBonus() {
        if (!Array.isArray(window.state?.businesses)) return 0;
        const groups = {};
        window.state.businesses.forEach(b => {
            if (!b || b.level < 3) return;
            const rawId = String(b.id || '');
            const key = rawId.replace(/\d+/g, '').trim() || rawId || '_default';
            groups[key] = (groups[key] || 0) + 1;
        });
        let bonus = 0;
        for (const key in groups) {
            if (groups[key] >= 3) bonus += 0.40;
        }
        return Math.min(bonus, 1.20);
    },

    getAccumulatedCash() {
        if (!Array.isArray(window.state?.businesses)) return 0;
        let total = 0;
        window.state.businesses.forEach(b => {
            if (b && b.level > 0) total += Math.floor(b.stored || 0);
        });
        return total;
    },

    isWorkshopMaxed() {
        if (!window.state?.businessWorkshop) return false;
        return this.workshopUpgrades.every(u => (window.state.businessWorkshop[u.id] || 0) >= u.maxLevel);
    },

    // ========================================================
    // РЕНДЕР
    // ========================================================
    render(container) {
        if (!container) return;
        this.ensureState();

        const tab = this.currentTab;
        const dailyIncome = this.getTotalDailyIncome();
        const accumulated = this.getAccumulatedCash();
        const legal = window.state?.player?.legalEntity || { type: 'none' };
        const legalConfig = (window.LEGAL_ENTITIES && window.LEGAL_ENTITIES[legal.type]) || null;
        const isLegalActive = legal.type !== 'none';

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
                <div class="biz-summary-bar mb-2">
                    <div class="biz-summary-cell">
                        <div class="biz-summary-label">Форма</div>
                        <div class="biz-summary-value ${isLegalActive ? 'color-cyan' : 'color-amber'}" style="font-size:11px;">
                            ${(legalConfig && legalConfig.tag) ? legalConfig.tag : (isLegalActive ? legal.type.toUpperCase() : 'Физлицо')}
                        </div>
                    </div>
                    <div class="biz-summary-cell">
                        <div class="biz-summary-label">Доход</div>
                        <div class="biz-summary-value value-green">+${dailyIncome.toLocaleString()} ₽</div>
                    </div>
                    <div class="biz-summary-cell">
                        <div class="biz-summary-label">В кассах</div>
                        <div class="biz-summary-value value-cyan">${accumulated.toLocaleString()} ₽</div>
                    </div>
                    <button onclick="PhoneBusiness.collectAllCash()" class="biz-collect-btn" ${accumulated <= 0 ? 'disabled' : ''} title="Собрать всю кассу">
                        <i class="fa-solid fa-hand-holding-dollar"></i>
                    </button>
                </div>

                ${!isLegalActive ? `
                    <div class="glass-card mb-2" style="background: linear-gradient(135deg, rgba(255,179,0,0.08), rgba(9,14,24,0.96)); border: 1px solid rgba(255,179,0,0.35); border-left: 3px solid var(--amber); border-radius: 12px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                                <i class="fa-solid fa-triangle-exclamation" style="color: var(--amber); font-size: 13px;"></i>
                                <b style="color: var(--amber); font-size: 11px;">Требуется регистрация бизнеса</b>
                            </div>
                            <div class="sub-label" style="font-size: 8.5px; color: #94a3b8; line-height: 1.3;">
                                Для покупки объектов и автопарков оформите ИП или ООО через Госуслуги.
                            </div>
                        </div>
                        <div style="flex-shrink: 0;">
                            <button onclick="if(window.PhoneManager) PhoneManager.openApp('gosuslugi')" class="btn btn-amber btn-sm" style="width: auto !important; min-width: 95px; padding: 7px 12px; font-size: 10px; font-weight: 700; white-space: nowrap; border-radius: 8px; box-shadow: 0 0 10px rgba(255,179,0,0.3); display: inline-flex; align-items: center; justify-content: center; gap: 5px;">
                                Госуслуги <i class="fa-solid fa-arrow-right" style="font-size: 8.5px;"></i>
                            </button>
                        </div>
                    </div>
                ` : ''}

                <div class="biz-tabs-row mb-2" style="display:grid; grid-template-columns: repeat(6, 1fr); gap:2px;">
                    <button onclick="PhoneBusiness.setTab('points')" class="biz-tab ${tab === 'points' ? 'active' : ''}" style="padding:4px 1px; font-size:8.5px;">
                        <i class="fa-solid fa-store"></i><span>Точки</span>
                    </button>
                    <button onclick="PhoneBusiness.setTab('fleet')" class="biz-tab ${tab === 'fleet' ? 'active' : ''}" style="padding:4px 1px; font-size:8.5px;">
                        <i class="fa-solid fa-truck"></i><span>Парк</span>
                    </button>
                    <button onclick="PhoneBusiness.setTab('tenders')" class="biz-tab ${tab === 'tenders' ? 'active' : ''}" style="padding:4px 1px; font-size:8.5px;">
                        <i class="fa-solid fa-file-contract"></i><span>Тендер</span>
                    </button>
                    <button onclick="PhoneBusiness.setTab('workshop')" class="biz-tab ${tab === 'workshop' ? 'active' : ''}" style="padding:4px 1px; font-size:8.5px;">
                        <i class="fa-solid fa-screwdriver-wrench"></i><span>Цех</span>
                    </button>
                    <button onclick="PhoneBusiness.setTab('staff')" class="biz-tab ${tab === 'staff' ? 'active' : ''}" style="padding:4px 1px; font-size:8.5px;">
                        <i class="fa-solid fa-users"></i><span>Штат</span>
                    </button>
                    <button onclick="PhoneBusiness.setTab('corp')" class="biz-tab ${tab === 'corp' ? 'active' : ''}" style="padding:4px 1px; font-size:8.5px;">
                        <i class="fa-solid fa-building"></i><span>Корп.</span>
                    </button>
                </div>

                <div id="bizTabContent"></div>
            </div>
        `;

        const content = document.getElementById('bizTabContent');
        if (!content) return;

        if (tab === 'points')        this.renderPointsTab(content);
        else if (tab === 'fleet')    this.renderFleetTab(content);
        else if (tab === 'tenders')  this.renderTendersTab(content);
        else if (tab === 'workshop') this.renderWorkshopTab(content);
        else if (tab === 'staff')    this.renderStaffTab(content);
        else if (tab === 'corp')     this.renderCorporationTab(content);
        else                         this.renderPointsTab(content);
    },

    setTab(tab) {
        this.currentTab = tab;
        if (window.AudioFx) { window.AudioFx.play('tick'); window.AudioFx.haptic('light'); }
        this.render(document.getElementById('phoneAppContainer'));
    },

    renderPointsTab(container) {
        if (!container) return;
        const pLvl = window.state?.player?.level || 1;
        const curDay = window.state?.player?.day || 1;

        const sorted = [...(window.state.businesses || [])]
            .filter(b => b)
            .sort((a, b) => {
                const aOwned = a.level > 0 ? 1 : 0;
                const bOwned = b.level > 0 ? 1 : 0;
                if (aOwned !== bOwned) return bOwned - aOwned;
                return (a.minLevel || 1) - (b.minLevel || 1);
            });

        let html = '';
        sorted.forEach(b => {
            html += this._renderBizCard(b, pLvl, curDay);
        });

        html += this.renderAchievementsBlock();
        container.innerHTML = html;

        requestAnimationFrame(() => {
            (window.state.businesses || []).forEach(b => {
                if (b && b.level > 0) {
                    try { this.drawSparkline(b); } catch (e) {}
                }
            });
        });
    },

    _renderBizCard(b, pLvl, curDay) {
        const isOwned = b.level > 0;
        const upgradeCost = Math.round((b.cost || 0) * Math.pow(1.65, b.level || 0));
        const isMaxed = b.level >= 5;

        const currentIncome = isOwned ? this.getBizIncomeWithBonuses(b) : 0;
        const cash = Math.floor(b.stored || 0);
        const stock = Math.round(b.stock || 0);
        const maxStock = b.maxStock || 100;
        const stockPct = Math.round((stock / maxStock) * 100);

        const dna = b.dna ? this._getDNAObject(b.dna) : null;
        const skin = this._getCoverSkins().find(s => s.id === b.coverSkin) || this._getCoverSkins()[0];
        const sticker = this._getOwnerStickers().find(s => s.id === b.ownerSticker) || this._getOwnerStickers()[0];

        const rawImg = b.img || '';
        const fallbackImg = b.fallback || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80';

        const stickerHtml = sticker.id !== 'none' ? `
            <div class="biz-owner-sticker" style="border-color:${skin.color}; box-shadow:0 0 10px ${skin.color};">
                ${sticker.icon}
            </div>
        ` : '';

        const supportsFleet = Boolean(window.BUSINESS_FLEET_REQUIREMENTS && window.BUSINESS_FLEET_REQUIREMENTS[b.id]);
        const fleetCount = supportsFleet && window.BusinessFleetModule ? window.BusinessFleetModule.getAssignedVehicles(b.id).length : 0;

        return `
            <div class="biz-card mb-3 ${skin.cssClass || ''}" style="border-top: 1px solid rgba(255,255,255,0.15); border-left: 2px solid ${isOwned ? skin.color : 'rgba(255,255,255,0.1)'};">
                <div class="biz-cover">
                    <img src="${rawImg || fallbackImg}" class="biz-cover-img" onerror="this.src='${fallbackImg}';">
                    <div class="biz-cover-icon">${this._iconForBiz(b.id)}</div>
                    ${stickerHtml}
                    <div class="biz-cover-overlay"></div>
                    <div class="biz-cover-title">
                        <b class="${isOwned ? 'color-green' : 'color-cyan'}">${b.customName || b.name}</b>
                        ${b.slogan ? `<div class="biz-cover-slogan" style="color:${skin.color};">«${b.slogan}»</div>` : ''}
                    </div>
                </div>

                <div class="biz-main-row">
                    <div class="biz-head-block">
                        <div class="biz-head-name">${b.customName || b.name}</div>
                        <div class="biz-badges-row">
                            <span class="tag-badge bg-tag-cyan">${b.id.toUpperCase()}</span>
                            ${isOwned ? `<span class="tag-badge bg-tag-amber"><i class="fa-solid fa-bolt"></i> СЕТЬ</span>` : `<span class="tag-badge bg-tag-dark">ПОД ВЫКУП</span>`}
                            ${supportsFleet ? `<span class="tag-badge bg-tag-green"><i class="fa-solid fa-car"></i> ФЛОТ: ${fleetCount}</span>` : ''}
                        </div>
                    </div>

                    <div class="biz-price-badge-box">
                        <div class="biz-price-label">${isOwned ? 'ДОХОД В ДЕНЬ' : 'СТОИМОСТЬ'}</div>
                        <div class="biz-price-num">${isOwned ? `+${currentIncome.toLocaleString()} ₽` : `${(b.cost || 0).toLocaleString()} ₽`}</div>
                    </div>
                </div>

                <div class="biz-tri-props-grid">
                    <div class="biz-prop-card">
                        <div class="biz-prop-icon icon-amber"><i class="fa-solid fa-wallet"></i></div>
                        <div class="biz-prop-info">
                            <span class="biz-prop-label">${isOwned ? 'В кассе' : 'Базовый'}</span>
                            <b class="biz-prop-val color-amber">${isOwned ? `${cash.toLocaleString()} ₽` : `+${(b.income || 0).toLocaleString()}`}</b>
                        </div>
                    </div>
                    <div class="biz-prop-card">
                        <div class="biz-prop-icon icon-green"><i class="fa-solid fa-boxes-stacked"></i></div>
                        <div class="biz-prop-info">
                            <span class="biz-prop-label">Сырьё</span>
                            <b class="biz-prop-val ${stockPct < 30 ? 'color-red' : 'color-green'}">${isOwned ? `${stockPct}%` : '100%'}</b>
                        </div>
                    </div>
                    <div class="biz-prop-card">
                        <div class="biz-prop-icon icon-cyan"><i class="fa-solid fa-chart-simple"></i></div>
                        <div class="biz-prop-info">
                            <span class="biz-prop-label">Трафик</span>
                            <b class="biz-prop-val color-cyan">${dna ? dna.traffic.name : 'Норма'}</b>
                        </div>
                    </div>
                </div>

                <div class="biz-quote-block">
                    <div class="biz-quote-text">
                        ${b.desc || b.perk || 'Коммерческий объект сети.'}
                    </div>
                </div>

                ${isOwned ? this.renderSparkline(b) : ''}
                ${this._renderBizActions(b, pLvl, isOwned, isMaxed, upgradeCost, supportsFleet)}
            </div>
        `;
    },

    _renderBizActions(b, pLvl, isOwned, isMaxed, upgradeCost, supportsFleet) {
        const isLockedByLevel = !isOwned && pLvl < (b.minLevel || 1);
        if (isLockedByLevel) {
            return `<button class="btn btn-dark btn-sm w-full opacity-50" disabled><i class="fa-solid fa-lock"></i> Требуется ${b.minLevel} ур.</button>`;
        }

        if (!isOwned) {
            const canAfford = (window.state?.player?.cash || 0) >= (b.cost || 0);
            return `
                <button onclick="PhoneBusiness.upgradePoint('${b.id}')" class="btn ${canAfford ? 'btn-green' : 'btn-dark opacity-50'} btn-sm w-full font-bold" style="min-height:42px;">
                    <i class="fa-solid fa-plus-circle"></i> Купить объект (${(b.cost || 0).toLocaleString()} ₽)
                </button>
            `;
        }

        const cash = Math.floor(b.stored || 0);
        return `
            <div class="biz-actions-grid">
                <button onclick="PhoneBusiness.collectPointCash('${b.id}')" class="btn btn-green btn-sm" ${cash <= 0 ? 'disabled' : ''}>
                    <i class="fa-solid fa-hand-holding-dollar"></i> ${cash > 0 ? (cash/1000).toFixed(1) + 'k' : 'Касса'}
                </button>
                <button onclick="PhoneBusiness.buySupplies('${b.id}')" class="btn btn-cyan btn-sm">
                    <i class="fa-solid fa-boxes-stacked"></i> Сырьё
                </button>
                ${supportsFleet ? `
                    <button onclick="BusinessFleetModule.renderFleetManagerModal('${b.id}')" class="btn btn-amber btn-sm">
                        <i class="fa-solid fa-truck-ramp-box"></i> Автопарк
                    </button>
                ` : `
                    <button onclick="PhoneBusiness.openCustomizeModal('${b.id}')" class="btn btn-purple btn-sm">
                        <i class="fa-solid fa-pen"></i> Инфо
                    </button>
                `}
            </div>
            ${!isMaxed ? `
                <button onclick="PhoneBusiness.upgradePoint('${b.id}')" class="btn btn-amber btn-sm w-full mt-1">
                    <i class="fa-solid fa-arrow-up"></i> Улучшить до ур. ${b.level + 1} (${upgradeCost.toLocaleString()} ₽)
                </button>
            ` : ''}
        `;
    },

    renderSparkline(biz) {
        return `
            <div class="biz-spark-panel">
                <div class="biz-spark-header">
                    <span><i class="fa-solid fa-chart-line color-green"></i> Доход за 7 дней:</span>
                    <span id="sparkLabel_${biz.id}" class="biz-spark-label">—</span>
                </div>
                <canvas id="bizSpark_${biz.id}" width="360" height="45"></canvas>
            </div>
        `;
    },

    drawSparkline(biz) {
        const canvas = document.getElementById(`bizSpark_${biz.id}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const W = canvas.width, H = canvas.height;
        const history = (biz.incomeHistory || []).slice(-7);
        ctx.clearRect(0, 0, W, H);

        if (history.length < 2) {
            ctx.fillStyle = 'rgba(148,163,184,0.5)';
            ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('Накапливаем статистику...', W / 2, H / 2 + 3);
            return;
        }

        const maxVal = Math.max(...history, 1);
        const stepX = W / (history.length - 1);
        ctx.strokeStyle = '#00e676'; ctx.lineWidth = 2; ctx.beginPath();
        history.forEach((val, i) => {
            const x = i * stepX, y = H - 5 - (val / maxVal) * (H - 10);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
    },

    renderAchievementsBlock() {
        const unlocked = window.state?.player?.businessAchievements || [];
        const html = this.achievements.map(a => {
            const isDone = unlocked.includes(a.id);
            return `
                <div class="p-2 mb-1 flex-between" style="background:#050914; border-radius:6px;">
                    <div>
                        <b class="text-xs ${isDone ? 'color-green' : 'color-main'}">${a.title}</b>
                        <div class="sub-label" style="font-size:8px;">${a.desc || ''}</div>
                    </div>
                    ${isDone ? '<span class="tag-badge bg-tag-green">✓</span>' : '<span class="tag-badge bg-tag-dark"><i class="fa-solid fa-lock"></i></span>'}
                </div>
            `;
        }).join('');

        return `
            <div class="glass-card mb-2 p-2">
                <b class="text-xs color-amber mb-2 block"><i class="fa-solid fa-trophy"></i> Достижения автобизнеса:</b>
                ${html}
            </div>
        `;
    },

    checkAchievements() {
        if (!window.state?.player) return;
        if (!Array.isArray(window.state.player.businessAchievements)) window.state.player.businessAchievements = [];
        this.achievements.forEach(a => {
            if (window.state.player.businessAchievements.includes(a.id)) return;
            try {
                if (a.cond && a.cond()) {
                    window.state.player.businessAchievements.push(a.id);
                    if (a.reward?.cash) window.state.player.cash = (window.state.player.cash || 0) + a.reward.cash;
                    if (typeof showToast === 'function') showToast(`🏆 Достижение: «${a.title}»!`);
                }
            } catch (e) {}
        });
        if (typeof saveState === 'function') saveState();
    },

    // ========================================================
    // ТЕНДЕРЫ (B2B КОНТРАКТЫ)
    // ========================================================
    renderTendersTab(container) {
        const tenders = window.BUSINESS_TENDERS_CATALOG || [];
        const curDay = window.state?.player?.day || 1;
        const activeTenders = window.state?.player?.activeTenders || [];

        let html = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.12), #090e18); border-color: var(--cyan);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan"><i class="fa-solid fa-file-signature"></i> Корпоративные B2B Тендеры</b>
                    <span class="tag-badge bg-tag-cyan">Госзакупки</span>
                </div>
                <div class="sub-label" style="font-size:9.5px; line-height:1.35;">
                    Заключайте долгосрочные контракты на обслуживание автопарков! Получайте мгновенный аванс и фиксированный буст к выручке.
                </div>
            </div>
        `;

        if (tenders.length === 0) {
            html += `<div class="sub-label text-center py-4">Актуальных тендеров пока нет.</div>`;
            container.innerHTML = html;
            return;
        }

        tenders.forEach(tnd => {
            const activeContract = activeTenders.find(t => t && t.id === tnd.id && t.expiresDay >= curDay);
            const isSigned = !!activeContract;
            const daysLeft = isSigned ? Math.max(0, activeContract.expiresDay - curDay) : 0;

            const targetBiz = (window.state?.businesses || []).find(b => b && b.id === tnd.targetBiz);
            const isBizOwned = targetBiz && targetBiz.level > 0;

            const assignedVehicles = window.BusinessFleetModule ? window.BusinessFleetModule.getAssignedVehicles(tnd.targetBiz) : [];
            const req = tnd.requirements || {};

            let satisfiesCount = assignedVehicles.length >= (req.minFleetCount || 1);
            let satisfiesMreo = true;
            if (req.requireMreo) {
                satisfiesMreo = assignedVehicles.filter(c => c && c.commercialRegistered).length >= (req.minFleetCount || 1);
            }
            let satisfiesCondition = true;
            if (req.minCondition) {
                satisfiesCondition = assignedVehicles.every(c => (c.condition || 100) >= req.minCondition);
            }

            const canSign = isBizOwned && satisfiesCount && satisfiesMreo && satisfiesCondition && !isSigned;

            html += `
                <div class="glass-card mb-2 p-2" style="border-left: 3px solid ${isSigned ? 'var(--green)' : (canSign ? 'var(--cyan)' : 'rgba(255,255,255,0.15)')};">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-main" style="font-size:11.5px;">${tnd.title}</b>
                        <span class="tag-badge ${isSigned ? 'bg-tag-green' : 'bg-tag-amber'}">
                            ${isSigned ? `АКТИВЕН (${daysLeft} дн.)` : `+${Math.round((tnd.incomeMultiplier - 1) * 100)}% К КАССЕ`}
                        </span>
                    </div>
                    <div class="sub-label mb-2" style="font-size:9.5px; line-height:1.35;">${tnd.desc}</div>

                    <div class="p-2 mb-2" style="background:#050914; border-radius:6px; font-size:9px;">
                        <div class="flex-between mb-1">
                            <span>Требуемый бизнес:</span>
                            <b class="${isBizOwned ? 'color-green' : 'color-red'}">${targetBiz ? targetBiz.name : tnd.targetBiz} ${isBizOwned ? '✓' : '(Не куплен)'}</b>
                        </div>
                        <div class="flex-between mb-1">
                            <span>Машин во флоте:</span>
                            <b class="${satisfiesCount ? 'color-green' : 'color-amber'}">${assignedVehicles.length} из ${req.minFleetCount || 1} шт.</b>
                        </div>
                        ${req.requireMreo ? `
                            <div class="flex-between mb-1">
                                <span>Учёт МРЭО на юрлицо:</span>
                                <b class="${satisfiesMreo ? 'color-green' : 'color-red'}">${satisfiesMreo ? 'Выполнен ✓' : 'Требуется регистрация'}</b>
                            </div>
                        ` : ''}
                        <div class="flex-between">
                            <span>Аванс при подписании:</span>
                            <b class="color-green font-bold">+${tnd.advanceRewardCash.toLocaleString()} ₽ & ${tnd.rewardStars} ⭐</b>
                        </div>
                    </div>

                    ${isSigned ? `
                        <button class="btn btn-dark btn-sm w-full opacity-60" disabled>Контракт в исполнении</button>
                    ` : `
                        <button onclick="PhoneBusiness.signTenderContract('${tnd.id}')" class="btn ${canSign ? 'btn-green' : 'btn-dark opacity-50'} btn-sm w-full" ${canSign ? '' : 'disabled'}>
                            ${canSign ? 'Подписать госконтракт ✍️' : 'Условия тендера не выполнены'}
                        </button>
                    `}
                </div>
            `;
        });

        container.innerHTML = html;
    },

    signTenderContract(tenderId) {
        if (this._tenderPending) return;
        const tenders = window.BUSINESS_TENDERS_CATALOG || [];
        const tnd = tenders.find(t => t.id === tenderId);
        if (!tnd) return;

        this._tenderPending = true;
        try {
            const curDay = window.state?.player?.day || 1;
            if (!Array.isArray(window.state.player.activeTenders)) window.state.player.activeTenders = [];

            window.state.player.activeTenders.push({
                id: tnd.id,
                targetBiz: tnd.targetBiz,
                title: tnd.title,
                incomeMultiplier: tnd.incomeMultiplier,
                startedDay: curDay,
                expiresDay: curDay + (tnd.bonusDurationDays || 5)
            });

            window.state.player.cash = (window.state.player.cash || 0) + (tnd.advanceRewardCash || 0);
            window.state.player.stars = (window.state.player.stars || 0) + (tnd.rewardStars || 0);

            if (typeof logBankTransaction === 'function') {
                logBankTransaction(`Аванс по B2B тендеру: ${tnd.title}`, tnd.advanceRewardCash, true);
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }

            if (typeof openVerdictModal === 'function') {
                openVerdictModal(
                    "ГОСКОНТРАКТ ПОДПИСАН! ✍️",
                    `Вы выиграли тендер «<b>${tnd.title}</b>»!\nАванс: <b>+${tnd.advanceRewardCash.toLocaleString()} ₽</b> & <b>+${tnd.rewardStars} ⭐</b> зачислен на счёт.\nВыручка предприятия увеличена на <b>+${Math.round((tnd.incomeMultiplier - 1) * 100)}%</b> на ${tnd.bonusDurationDays} дней.`,
                    true,
                    tnd.advanceRewardCash
                );
            } else {
                showToast(`✓ Контракт подписан: +${tnd.advanceRewardCash.toLocaleString()} ₽!`);
            }

            this.render(document.getElementById('phoneAppContainer'));
        } finally {
            this._tenderPending = false;
        }
    },

    // ========================================================
    // КРИЗИС-МЕНЕДЖМЕНТ ПРИ СБОРЕ КАССЫ
    // ========================================================
    _maybeTriggerCrisisEvent() {
        const events = this.CRISIS_EVENTS;
        if (!Array.isArray(events) || events.length === 0) return false;

        const ownedBiz = (window.state?.businesses || []).filter(b => b && b.level > 0);
        if (ownedBiz.length === 0) return false;

        // 12% шанс кризиса при сборе кассы
        if (Math.random() > 0.12) return false;

        const rollEv = events[Math.floor(Math.random() * events.length)];
        this.openCrisisModal(rollEv);
        return true;
    },

    openCrisisModal(crisis) {
        let modal = document.getElementById('modalBizCrisis');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalBizCrisis';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        let optionsHtml = '';
        (crisis.options || []).forEach((opt, idx) => {
            optionsHtml += `
                <button onclick="PhoneBusiness.resolveCrisisAction(${idx}, '${crisis.id}')" class="btn btn-dark btn-sm w-full mb-2 text-left" style="padding: 8px 10px; font-size: 10px; line-height: 1.35;">
                    <i class="fa-solid fa-chevron-right color-cyan mr-1"></i> ${opt.text}
                </button>
            `;
        });

        modal.innerHTML = `
            <div class="modal-box text-center" style="max-width: 410px; border-color: var(--amber); background: radial-gradient(circle at 50% 0%, #1c1524 0%, #070a10 85%);">
                <div class="radar-spinner-ring mb-2" style="border-top-color: var(--amber); border-right-color: var(--red); margin: 0 auto 10px auto;">
                    <div class="radar-spinner-center" style="font-size:24px;">🚨</div>
                </div>

                <div class="modal-glow-badge mb-1" style="color:var(--amber); border-color:var(--amber); background:rgba(255,179,0,0.1); display:inline-block;">
                    ВНЕПЛАНОВАЯ СИТУАЦИЯ
                </div>

                <h3 class="font-bold mb-1 color-amber" style="font-size:15px;">${crisis.title}</h3>
                <p class="sub-label mb-3" style="font-size:10.5px; line-height:1.4; color:#cbd5e1; padding: 0 4px;">
                    ${crisis.desc}
                </p>

                <div class="space-y-1">
                    ${optionsHtml}
                </div>
            </div>
        `;

        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalBizCrisis', { closeOthers: true });
        } else {
            modal.classList.add('active');
        }
        if (window.AudioFx) { window.AudioFx.play('error'); window.AudioFx.haptic('warning'); }
    },

    resolveCrisisAction(optIdx, crisisId) {
        const events = this.CRISIS_EVENTS;
        const crisis = events.find(e => e.id === crisisId);
        if (!crisis || !crisis.options || !crisis.options[optIdx]) return;

        const opt = crisis.options[optIdx];
        const p = window.state?.player || {};

        if (opt.costCash && (p.cash || 0) < opt.costCash) {
            return showToast(`Не хватает ${opt.costCash.toLocaleString()} ₽!`);
        }
        if (opt.costConn && (p.connections || 0) < opt.costConn) {
            return showToast(`Не хватает связей 🤝 с Решалой!`);
        }
        if (opt.reqBiz) {
            const hasBiz = (window.state?.businesses || []).some(b => b.id === opt.reqBiz && b.level > 0);
            if (!hasBiz) return showToast("У вас нет службы эвакуации!");
        }

        if (opt.costCash) {
            p.cash -= opt.costCash;
            if (typeof logBankTransaction === 'function') logBankTransaction(`Инцидент: ${crisis.title}`, opt.costCash, false);
        }
        if (opt.costConn) p.connections -= opt.costConn;
        if (opt.penaltyMood) p.mood = Math.max(10, (p.mood || 85) - opt.penaltyMood);
        if (opt.bonusKarma) p.karma = Math.min(100, (p.karma || 50) + opt.bonusKarma);

        if (typeof ModalManager !== 'undefined') ModalManager.close('modalBizCrisis');
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
        showToast("Инцидент благополучно урегулирован!");
    },

    // ЦЕХ
    renderWorkshopTab(container) {
        let html = '<div class="sub-label mb-2 px-1" style="font-size:10px;">Прокачка цеха даёт постоянные процентные бонусы ко всей вашей бизнес-сети:</div>';
        this.workshopUpgrades.forEach(u => {
            const curLvl = window.state?.businessWorkshop?.[u.id] || 0;
            const cost = Math.round(u.baseCost * Math.pow(u.costMul, curLvl));
            const isMax = curLvl >= u.maxLevel;
            
            html += `
                <div class="glass-card mb-2" style="background:linear-gradient(135deg, rgba(13,20,36,0.95), rgba(9,14,24,0.98)); border:1px solid rgba(0,242,254,0.18); border-radius:12px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                        <div style="width:38px; height:38px; border-radius:10px; background:rgba(0,242,254,0.1); border:1px solid rgba(0,242,254,0.25); display:flex; align-items:center; justify-content:center; font-size:16px; color:var(--cyan); flex-shrink:0;">
                            <i class="fa-solid ${u.fa}"></i>
                        </div>
                        <div style="flex:1; min-width:0;">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                                <b style="font-size:11.5px; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${u.name}</b>
                                <span class="tag-badge ${isMax ? 'bg-tag-amber' : 'bg-tag-cyan'}" style="font-size:7.5px; padding:1px 5px;">${curLvl}/${u.maxLevel} УР</span>
                            </div>
                            <div class="sub-label" style="font-size:9px; color:#94a3b8; line-height:1.25;">${u.desc}</div>
                        </div>
                    </div>
                    <div style="flex-shrink:0;">
                        ${!isMax ? `
                            <button onclick="PhoneBusiness.upgradeWorkshop('${u.id}')" class="btn btn-cyan btn-sm" style="width:auto !important; min-width:115px; padding:7px 12px; font-size:10px; font-weight:700; white-space:nowrap; border-radius:8px; box-shadow:0 0 10px rgba(0,242,254,0.25);">
                                +1 ур. (${cost.toLocaleString()} ₽)
                            </button>
                        ` : `
                            <span class="tag-badge bg-tag-amber font-bold" style="padding:6px 10px; font-size:9.5px; border-radius:8px; display:inline-block;">МАКС. УР. ✓</span>
                        `}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    // ШТАТ
    renderStaffTab(container) {
        let html = '<div class="sub-label mb-2 px-1" style="font-size:10px;">Найм специалистов для снижения расходов и автоматизации:</div>';
        this.staffList.forEach(s => {
            const hired = window.state?.businessStaff?.[s.id] || 0;
            const isFull = hired >= s.maxHired;
            
            html += `
                <div class="glass-card mb-2" style="background:linear-gradient(135deg, rgba(13,20,36,0.95), rgba(9,14,24,0.98)); border:1px solid rgba(192,132,252,0.2); border-radius:12px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                        <div style="width:38px; height:38px; border-radius:10px; background:rgba(192,132,252,0.12); border:1px solid rgba(192,132,252,0.3); display:flex; align-items:center; justify-content:center; font-size:16px; color:#c084fc; flex-shrink:0;">
                            <i class="fa-solid ${s.fa}"></i>
                        </div>
                        <div style="flex:1; min-width:0;">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                                <b style="font-size:11.5px; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.name}</b>
                                <span class="tag-badge bg-tag-purple" style="font-size:7.5px; padding:1px 5px;">${hired}/${s.maxHired}</span>
                            </div>
                            <div class="sub-label" style="font-size:9px; color:#c084fc; font-weight:600; margin-bottom:1px;">${s.perk}</div>
                            <div class="sub-label" style="font-size:8.5px; color:#64748b;">Оклад: ${s.salary.toLocaleString()} ₽/мес</div>
                        </div>
                    </div>
                    <div style="flex-shrink:0;">
                        <button onclick="PhoneBusiness.hireStaff('${s.id}')" class="btn btn-purple btn-sm" ${isFull ? 'disabled' : ''} style="width:auto !important; min-width:110px; padding:7px 12px; font-size:10px; font-weight:700; white-space:nowrap; border-radius:8px; ${isFull ? 'opacity:0.5;' : 'box-shadow:0 0 10px rgba(192,132,252,0.25);'}">
                            ${isFull ? 'Штат полон' : `Нанять (${(s.salary/1000).toFixed(0)}k ₽)`}
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    // ПАРК
    renderFleetTab(container) {
        let html = '<div class="sub-label mb-2 px-1" style="font-size:10px;">Спецтехника для обслуживания логистики и снижения себестоимости:</div>';
        this.fleetVehicles.forEach(v => {
            const isOwned = (window.state?.businessFleet || []).includes(v.id);
            
            html += `
                <div class="glass-card mb-2" style="background:linear-gradient(135deg, rgba(13,20,36,0.95), rgba(9,14,24,0.98)); border:1px solid rgba(255,179,0,0.2); border-radius:12px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                        <div style="width:38px; height:38px; border-radius:10px; background:rgba(255,179,0,0.12); border:1px solid rgba(255,179,0,0.3); display:flex; align-items:center; justify-content:center; font-size:16px; color:var(--amber); flex-shrink:0;">
                            <i class="fa-solid ${v.fa}"></i>
                        </div>
                        <div style="flex:1; min-width:0;">
                            <b style="font-size:11.5px; color:#fff; display:block; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.name}</b>
                            <div class="sub-label" style="font-size:9px; color:#94a3b8; line-height:1.25;">${v.bonus}</div>
                        </div>
                    </div>
                    <div style="flex-shrink:0;">
                        ${isOwned ? `
                            <span class="tag-badge bg-tag-green font-bold" style="padding:6px 12px; font-size:9.5px; border-radius:8px; display:inline-block;">В ПАРКЕ ✓</span>
                        ` : `
                            <button onclick="PhoneBusiness.buyFleetVehicle('${v.id}')" class="btn btn-amber btn-sm" style="width:auto !important; min-width:115px; padding:7px 12px; font-size:10px; font-weight:700; white-space:nowrap; border-radius:8px; box-shadow:0 0 10px rgba(255,179,0,0.25);">
                                Купить (${v.cost.toLocaleString()} ₽)
                            </button>
                        `}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    renderCorporationTab(container) {
        container.innerHTML = `
            <div class="glass-card p-3 text-center">
                <b class="text-xs color-green block mb-1"><i class="fa-solid fa-building"></i> Корпорации</b>
                <div class="sub-label" style="font-size:9.5px;">
                    Владейте 3+ точками одного типа уровня 3+, чтобы объединить их в корпорацию и получать +40% к выручке.
                </div>
            </div>
        `;
    },

    // ========================================================
    // ДЕЙСТВИЯ И ПОКУПКА С ПРОВЕРКОЙ ЮРЛИЦА
    // ========================================================
    upgradePoint(bizId) {
        if (this._upgradePending) return;
        this.ensureState();

        const b = (window.state?.businesses || []).find(x => x && x.id === bizId);
        if (!b) return;

        const isNew = b.level === 0;

        if (isNew) {
            const legal = window.state?.player?.legalEntity || { type: 'none' };
            const docs = window.state?.player?.documents || {};
            const hasIP = legal.type === 'ip' || Boolean(docs.ipRegistered) || Boolean(window.state?.player?.hasIP);
            const hasOOO = legal.type === 'ooo' || Boolean(docs.oooRegistered) || Boolean(window.state?.player?.hasOOO);

            if (!hasIP && !hasOOO) {
                if (typeof showToast === 'function') {
                    showToast('⚠️ Для покупки бизнеса необходимо оформить ИП или ООО в Госуслугах!');
                }
                if (window.AudioFx) { window.AudioFx.play('error'); window.AudioFx.haptic('warning'); }
                if (window.PhoneManager && typeof window.PhoneManager.openApp === 'function') {
                    window.PhoneManager.openApp('gosuslugi');
                }
                return;
            }

            const currentType = hasOOO ? 'ooo' : 'ip';
            const legalConfig = (window.LEGAL_ENTITIES && window.LEGAL_ENTITIES[currentType]) || null;

            if (legalConfig && Array.isArray(legalConfig.allowedBusinesses) && !legalConfig.allowedBusinesses.includes(b.id)) {
                if (typeof showToast === 'function') {
                    showToast(`⚠️ Форма «${legalConfig.name || 'ИП'}» не дает права на владение этим объектом. Требуется ООО!`);
                }
                if (window.AudioFx) { window.AudioFx.play('error'); window.AudioFx.haptic('warning'); }
                return;
            }
        }

        const cost = isNew ? b.cost : Math.round(b.cost * Math.pow(1.65, b.level));
        const cash = window.state?.player?.cash || 0;

        if (cash < cost) return showToast(`Не хватает ${cost.toLocaleString()} ₽!`);

        this._upgradePending = true;
        try {
            window.state.player.cash -= cost;

            if (isNew) {
                b.level = 1;
                b.stock = 100;
                b.dna = this._generateDNA(b.id);
                b.lastTickTimestamp = Date.now();
                this._trackBizChallenge('new_biz', 1);
            } else {
                b.level += 1;
                this._trackBizChallenge('upgrade', 1);
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
            showToast(isNew ? `🎉 Открыт объект: «${b.name}»!` : `Уровень повышен до ${b.level}!`);

            this.checkAchievements();
            this.render(document.getElementById('phoneAppContainer'));
        } finally {
            this._upgradePending = false;
        }
    },

    collectAllCash() {
        if (this._collectAllPending) return;
        this._collectAllPending = true;
        try {
            this.ensureState();
            let total = 0;
            (window.state?.businesses || []).forEach(b => {
                if (b && b.level > 0 && b.stored > 0) {
                    total += Math.floor(b.stored);
                    b.stored = 0;
                    b.lastTickTimestamp = Date.now();
                }
            });
            if (total <= 0) return showToast('В кассах пусто!');

            window.state.player.cash = (window.state.player.cash || 0) + total;

            if (typeof trackQuestProgress === 'function') {
                trackQuestProgress('collect_biz', 1);
            }

            if (typeof logBankTransaction === 'function') {
                logBankTransaction('Инкассация бизнес-сети', total, true);
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
            showToast(`💰 Собрано: +${total.toLocaleString()} ₽!`);

            this._maybeTriggerCrisisEvent();
            this.render(document.getElementById('phoneAppContainer'));
        } finally {
            this._collectAllPending = false;
        }
    },

    collectPointCash(bizId) {
        if (this._collectPointPending) return;
        this._collectPointPending = true;
        try {
            const b = (window.state?.businesses || []).find(x => x && x.id === bizId);
            if (!b || b.stored <= 0) return;

            const amount = Math.floor(b.stored);
            b.stored = 0;
            b.lastTickTimestamp = Date.now();
            window.state.player.cash = (window.state.player.cash || 0) + amount;

            if (typeof trackQuestProgress === 'function') {
                trackQuestProgress('collect_biz', 1);
            }

            if (typeof logBankTransaction === 'function') {
                logBankTransaction(`Касса: ${b.customName || b.name}`, amount, true);
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (window.AudioFx) { window.AudioFx.play('win'); window.AudioFx.haptic('success'); }
            showToast(`+${amount.toLocaleString()} ₽ из «${b.customName || b.name}»!`);

            this._maybeTriggerCrisisEvent();
            this.render(document.getElementById('phoneAppContainer'));
        } finally {
            this._collectPointPending = false;
        }
    },

    buySupplies(bizId) {
        const b = (window.state?.businesses || []).find(x => x && x.id === bizId);
        if (!b || b.level <= 0) return;
        const cost = 15000;
        if ((window.state?.player?.cash || 0) < cost) return showToast(`Нужно ${cost.toLocaleString()} ₽!`);

        window.state.player.cash -= cost;
        b.stock = b.maxStock || 100;

        if (typeof trackQuestProgress === 'function') {
            trackQuestProgress('supply_stock', 1);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('tick');
        showToast(`Сырьё пополнено до 100%`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    upgradeWorkshop(branch) {
        const u = this.workshopUpgrades.find(x => x.id === branch);
        if (!u) return;
        const curLvl = window.state?.businessWorkshop?.[branch] || 0;
        const cost = Math.round(u.baseCost * Math.pow(u.costMul, curLvl));
        if ((window.state?.player?.cash || 0) < cost) return showToast(`Нужно ${cost.toLocaleString()} ₽!`);

        window.state.player.cash -= cost;
        window.state.businessWorkshop[branch] = curLvl + 1;

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('win');
        showToast(`🛠 ${u.name}: ур. ${curLvl + 1}!`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    hireStaff(staffId) {
        const s = this.staffList.find(x => x.id === staffId);
        if (!s) return;
        const hired = window.state?.businessStaff?.[staffId] || 0;
        if (hired >= s.maxHired) return;
        if ((window.state?.player?.cash || 0) < s.salary) return showToast(`Нужно ${s.salary.toLocaleString()} ₽!`);

        window.state.player.cash -= s.salary;
        window.state.businessStaff[staffId] = hired + 1;

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('win');
        showToast(`👤 Нанят: ${s.name}`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    buyFleetVehicle(vehId) {
        const v = this.fleetVehicles.find(x => x.id === vehId);
        if (!v) return;
        if ((window.state?.player?.cash || 0) < v.cost) return showToast(`Нужно ${v.cost.toLocaleString()} ₽!`);

        window.state.player.cash -= v.cost;
        window.state.businessFleet.push(vehId);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('win');
        showToast(`🚚 Куплено: ${v.name}`);
        this.render(document.getElementById('phoneAppContainer'));
    },

    openCustomizeModal(bizId) {
        const b = (window.state?.businesses || []).find(x => x && x.id === bizId);
        if (!b) return;
        const newName = prompt("Введите новое название точки:", b.customName || b.name);
        if (newName && newName.trim().length >= 2) {
            b.customName = newName.trim();
            if (typeof saveState === 'function') saveState();
            showToast("Название обновлено");
            this.render(document.getElementById('phoneAppContainer'));
        }
    },

    // ========================================================
    // НЕПРЕРЫВНОЕ НАЧИСЛЕНИЕ ДОХОДА С УЧЕТОМ РЕАЛЬНОГО ВРЕМЕНИ
    // ========================================================
    tickIncome() {
        if (!window.state?.businesses) return;
        const now = Date.now();
        let changed = false;

        window.state.businesses.forEach(b => {
            if (!b || b.level <= 0) return;

            if (!b.lastTickTimestamp || isNaN(b.lastTickTimestamp)) {
                b.lastTickTimestamp = now;
                return;
            }

            const elapsedSec = (now - b.lastTickTimestamp) / 1000;
            if (elapsedSec < 1) return;

            if (b.stock > 0) {
                b.stock = Math.max(0, b.stock - (0.005 * elapsedSec));
            }

            const dailyIncome = this.getBizIncomeWithBonuses(b);
            const incomePerSec = dailyIncome / 86400;
            const earned = elapsedSec * incomePerSec;

            if (earned > 0) {
                b.stored = (b.stored || 0) + earned;
                b.lastTickTimestamp = now;
                changed = true;
            }
        });

        const accumulated = this.getAccumulatedCash();
        const accEl = document.querySelector('.biz-summary-value.value-cyan');
        if (accEl) {
            accEl.textContent = `${accumulated.toLocaleString()} ₽`;
        }

        const collectBtn = document.querySelector('.biz-collect-btn');
        if (collectBtn) {
            collectBtn.disabled = accumulated <= 0;
        }

        if (changed && typeof saveState === 'function') {
            saveState();
        }
    },

    onNewDay() {
        if (!window.state?.player || !Array.isArray(window.state.businesses)) return;
        const curDay = window.state.player.day || 1;
        this._syncActiveBonus();
        this._tickEconomicCycle();

        // Очистка просроченных тендеров
        if (Array.isArray(window.state.player.activeTenders)) {
            window.state.player.activeTenders = window.state.player.activeTenders.filter(t => t && t.expiresDay >= curDay);
        }

        window.state.businesses.forEach(b => {
            if (!b || b.level <= 0) return;
            const dayIncome = Math.round(this.getBizIncomeWithBonuses(b));
            if (!Array.isArray(b.incomeHistory)) b.incomeHistory = [];
            b.incomeHistory.push(dayIncome);
            if (b.incomeHistory.length > 7) b.incomeHistory = b.incomeHistory.slice(-7);
            b.lastIncomeDay = curDay;
            b.stock = Math.max(0, (b.stock || 0) - 25);
        });

        this.checkAchievements();
        if (typeof saveState === 'function') saveState();
    },

    startTickLoop() {
        if (this._tickInterval) return;
        this.tickIncome();
        this._tickInterval = setInterval(() => this.tickIncome(), 3000);
    }
};

window.PhoneBusiness = PhoneBusiness;
window.AppBusiness = PhoneBusiness;

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    PhoneBusiness.startTickLoop();
} else {
    document.addEventListener('DOMContentLoaded', () => PhoneBusiness.startTickLoop());
}
setTimeout(() => PhoneBusiness.startTickLoop(), 1000);

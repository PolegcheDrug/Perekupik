// ========================================================
// js/phone/phone-business.js — БИЗНЕС-СЕТЬ ПЕРЕКУПА (v5.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v5.0.0 (ПРОКАЧКА + ФИКС ПУСТЫХ КАРТОЧЕК):
//   - ФИКС: ensureState() с retry (ждёт BUSINESS_DATA до 3 сек)
//   - ФИКС: защита от дубликатов бизнесов по id
//   - НОВОЕ: экономические циклы (Boom/Bust/Stable)
//   - НОВОЕ: дашборд доходности (день/неделя/месяц)
//   - НОВОЕ: ежедневные челленджи бизнеса
//   - НОВОЕ: оффлайн-капитализация (+5% за 3+ дня)
//   - НОВОЕ: целевые уровни (5/10/20 точек)
//   - НОВОЕ: прогноз окупаемости точки
//   - НОВОЕ: умные уведомления (касса, stock, кризис)
//   - НОВОЕ: бонус за разнообразие (+15% при 5+ типах)
//   - НОВОЕ: рабочий автосбор кассы (Управляющий)
// ⭐ v4.1.0:
//   - getBizIncomeWithBonuses, _syncActiveBonus
// ========================================================

const PhoneBusiness = {
    currentTab: 'points',
    _tickInterval: null,
    _activeBonus: null,

    // Защита от двойных кликов
    _tickPending: false,
    _upgradePending: false,
    _collectPending: false,

    // ⭐ v5.0.0: экономические циклы
    ECONOMIC_CYCLES: {
        boom:   { id: 'boom',   name: '📈 Экономический бум',   incomeMul: 1.30, daysLeft: 0, color: 'color-green',  desc: '+30% выручки у всех точек' },
        stable: { id: 'stable', name: '⚖️ Стабильный рынок',    incomeMul: 1.00, daysLeft: 0, color: 'color-cyan',   desc: 'Обычная выручка' },
        bust:   { id: 'bust',   name: '📉 Кризис рынка',        incomeMul: 0.70, daysLeft: 0, color: 'color-red',    desc: '-30% выручки у всех точек' }
    },

    // ⭐ v5.0.0: целевые уровни сети
    NETWORK_MILESTONES: [
        { count: 5,  id: 'm5',  name: '🌱 Малая сеть',      bonus: '+5% к выручке',    incomeBonus: 0.05 },
        { count: 10, id: 'm10', name: '🏪 Средняя сеть',    bonus: '+10% к выручке',   incomeBonus: 0.10 },
        { count: 20, id: 'm20', name: '🏙 Мегаполис',       bonus: '+20% к выручке',   incomeBonus: 0.20 },
        { count: 30, id: 'm30', name: '🌐 Империя',         bonus: '+35% к выручке',   incomeBonus: 0.35 }
    ],

    // ========================================================
    // FALLBACK-КАТАЛОГИ
    // ========================================================
    _fallbackCoverSkins: [
        { id: 'classic',   name: 'Классика',       cost: 0,      color: '#00f2fe', cssClass: '' },
        { id: 'neon_cyan', name: 'Неон Cyan',      cost: 50000,  color: '#00f2fe', cssClass: 'skin-neon-cyan' },
        { id: 'neon_pink', name: 'Neon Pink',      cost: 50000,  color: '#f43f5e', cssClass: 'skin-neon-pink' },
        { id: 'golden',    name: 'Золотая жила',   cost: 120000, color: '#ffd700', cssClass: 'skin-golden' },
        { id: 'matrix',    name: 'Matrix',         cost: 80000,  color: '#00e676', cssClass: 'skin-matrix' },
        { id: 'sunset',    name: 'Закат',          cost: 90000,  color: '#ff6b35', cssClass: 'skin-sunset' },
        { id: 'cyber',     name: 'Cyberpunk 2077', cost: 150000, color: '#fcee0a', cssClass: 'skin-cyber' },
        { id: 'royal',     name: 'Royal Purple',   cost: 200000, color: '#c084fc', cssClass: 'skin-royal' }
    ],

    _fallbackStickers: [
        { id: 'none',    name: 'Без стикера', cost: 0,     icon: '' },
        { id: 'gold',    name: 'Золотой',     cost: 25000, icon: '👑' },
        { id: 'fire',    name: 'Огненный',    cost: 30000, icon: '🔥' },
        { id: 'diamond', name: 'Бриллиант',   cost: 60000, icon: '💎' },
        { id: 'skull',   name: 'Череп',       cost: 40000, icon: '💀' },
        { id: 'rocket',  name: 'Ракета',      cost: 50000, icon: '🚀' }
    ],

    _getCoverSkins() {
        if (typeof window.BUSINESS_COVER_SKINS !== 'undefined'
            && Array.isArray(window.BUSINESS_COVER_SKINS)
            && window.BUSINESS_COVER_SKINS.length > 0) {
            return window.BUSINESS_COVER_SKINS;
        }
        return this._fallbackCoverSkins;
    },

    _getOwnerStickers() {
        if (typeof window.BUSINESS_VIP_STICKERS !== 'undefined'
            && Array.isArray(window.BUSINESS_VIP_STICKERS)
            && window.BUSINESS_VIP_STICKERS.length > 0) {
            return window.BUSINESS_VIP_STICKERS;
        }
        return this._fallbackStickers;
    },

    get COVER_SKINS() { return this._fallbackCoverSkins; },
    get OWNER_STICKERS() { return this._fallbackStickers; },

    // ========================================================
    // УТИЛИТА
    // ========================================================
    _n(val, fb = 0) {
        if (window.GameHelpers && window.GameHelpers.safeNum) {
            return window.GameHelpers.safeNum(val, fb);
        }
        const n = Number(val);
        return isNaN(n) || !isFinite(n) ? fb : n;
    },

    // ========================================================
    // ДНК-МОДИФИКАТОРЫ
    // ========================================================
    DNA_LOCATIONS: [
        { id: 'center',     name: 'Центр города',    mult: 1.30, icon: '🏙',  desc: 'Премиум-локация' },
        { id: 'sleep',      name: 'Спальный район',  mult: 1.00, icon: '🏘',  desc: 'Средний поток' },
        { id: 'industrial', name: 'Промзона',        mult: 1.15, icon: '🏭',  desc: 'Рабочий контингент' },
        { id: 'highway',    name: 'Трасса М4',       mult: 0.90, icon: '🛣',  desc: 'Нестабильный график' },
        { id: 'elite',      name: 'Элитный поселок', mult: 1.45, icon: '🏰',  desc: 'VIP-клиенты' }
    ],
    DNA_TRAFFIC: [
        { id: 'high',   name: 'Высокий', mult: 1.20, icon: '🔥' },
        { id: 'medium', name: 'Средний', mult: 1.00, icon: '⚡' },
        { id: 'low',    name: 'Низкий',  mult: 0.80, icon: '🌙' }
    ],
    DNA_CONDITION: [
        { id: 'new', name: 'Новое',   mult: 1.25, icon: '✨' },
        { id: 'mid', name: 'Среднее', mult: 1.00, icon: '🔧' },
        { id: 'old', name: 'Убитое',  mult: 0.75, icon: '🏚' }
    ],
    DNA_STAFF: [
        { id: 'expert', name: 'Профи',         mult: 1.15, icon: '👨‍🔧' },
        { id: 'junior', name: 'Новички',       mult: 1.00, icon: '🧑' },
        { id: 'noname', name: 'Без персонала', mult: 0.85, icon: '👤' }
    ],

    CRISIS_EVENTS: [
        { id: 'rospotreb',  icon: '🚔', name: 'Роспотребнадзор',        desc: 'Внеплановая проверка. Взятка 80k ₽ или штраф 150k ₽ + -30% дохода на 2 дня.', bribeCost: 80000,  penalty: 150000, debuffPct: 30, debuffDays: 2 },
        { id: 'blackout',   icon: '🔌', name: 'Отключение электричества', desc: '-35% дохода на 2 дня.',                                                        bribeCost: 0,      penalty: 0,      debuffPct: 35, debuffDays: 2 },
        { id: 'hype',       icon: '📱', name: 'Хайп в соцсетях!',        desc: '+50% дохода на 3 дня!',                                                          buffPct: 50,       buffDays: 3 },
        { id: 'competitor', icon: '🏪', name: 'Открылся конкурент',       desc: '-25% дохода, пока не решите.',                                                   bribeCost: 120000, penalty: 0,      debuffPct: 25, debuffDays: 5 },
        { id: 'fire',       icon: '🔥', name: 'Пожар!',                  desc: 'Теряете всю кассу, восстановление 200k ₽.',                                     bribeCost: 200000, penalty: 'store_lost', debuffPct: 0, debuffDays: 0 },
        { id: 'inspection_pass', icon: '✅', name: 'Плановый осмотр пройден', desc: '+15% к репутации.',                                                          buffPct: 15,       buffDays: 5 }
    ],

    // ========================================================
    // ⭐ v5.0.0: ЕЖЕДНЕВНЫЕ ЧЕЛЛЕНДЖИ БИЗНЕСА
    // ========================================================
    DAILY_BIZ_CHALLENGES: [
        { id: 'collect_5',   text: 'Собрать кассу с 5 точек',      target: 5, action: 'collect',   reward: 80000,  xp: 80 },
        { id: 'upgrade_2',   text: 'Улучшить 2 предприятия',       target: 2, action: 'upgrade',   reward: 100000, xp: 100 },
        { id: 'stock_5',     text: 'Пополнить сырьё 5 раз',        target: 5, action: 'stock',     reward: 60000,  xp: 60 },
        { id: 'no_crisis',   text: 'Избежать кризиса (решить через Решалу)', target: 1, action: 'bribe', reward: 90000, xp: 90 },
        { id: 'expand_1',    text: 'Купить новое предприятие',     target: 1, action: 'new_biz',   reward: 150000, xp: 150 }
    ],

    // ========================================================
    // ИНИЦИАЛИЗАЦИЯ (⭐ ГЛАВНЫЙ ФИКС)
    // ========================================================
    ensureState() {
        if (!window.state) return;
        if (!window.state.player) window.state.player = {};
        if (!Array.isArray(window.state.businesses)) window.state.businesses = [];

        const baseData = (typeof BUSINESS_DATA !== 'undefined' && Array.isArray(BUSINESS_DATA)) ? BUSINESS_DATA : [];

        // ⭐ ГЛАВНЫЙ ФИКС: если BUSINESS_DATA ещё не загружен — retry
        if (baseData.length === 0) {
            if (!this._ensureStateRetries) this._ensureStateRetries = 0;
            this._ensureStateRetries++;

            if (this._ensureStateRetries <= 6) {
                console.warn(`[PhoneBusiness] BUSINESS_DATA не загружен, retry ${this._ensureStateRetries}/6 через 500ms`);
                setTimeout(() => this.ensureState(), 500);
                return;
            } else {
                console.error('[PhoneBusiness] ❌ BUSINESS_DATA так и не загрузился после 6 попыток!');
                return;
            }
        }

        // Сбрасываем счётчик — данные есть
        this._ensureStateRetries = 0;

        // ⭐ ГЛАВНЫЙ ФИКС: добавляем отсутствующие бизнесы без перезаписи существующих
        const existingIds = new Set(
            window.state.businesses
                .filter(b => b && b.id)
                .map(b => b.id)
        );
        const missing = baseData.filter(b => b && b.id && !existingIds.has(b.id));

        if (missing.length > 0) {
            console.log('[PhoneBusiness] Добавляем отсутствующие бизнесы:', missing.length);
            const newBusinesses = missing.map(b => ({
                id: b.id,
                name: b.name,
                customName: b.name,
                slogan: '',
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
                lastStockDay: 0,
                dna: null,
                coverSkin: 'classic',
                ownerSticker: 'none',
                activeBuffs: [],
                activeDebuffs: [],
                reputation: 0,
                totalEarned: 0,
                createdAt: 0
            }));

            window.state.businesses = [...window.state.businesses, ...newBusinesses]
                .sort((a, b) => (a.minLevel || 1) - (b.minLevel || 1));

            // Сохраняем сразу
            if (typeof saveState === 'function') saveState();
        }

        // Валидация полей
        window.state.businesses.forEach(b => {
            if (!b) return;
            if (typeof b.stored !== 'number') b.stored = 0;
            if (typeof b.stock !== 'number') b.stock = 100;
            if (typeof b.maxStock !== 'number') b.maxStock = 100;
            if (!Array.isArray(b.incomeHistory)) b.incomeHistory = [];
            if (typeof b.lastIncomeDay !== 'number') b.lastIncomeDay = 0;
            if (typeof b.lastStockDay !== 'number') b.lastStockDay = 0;
            if (!b.icon) b.icon = this._iconForBiz(b.id);
            if (!b.customName) b.customName = b.name;
            if (typeof b.slogan !== 'string') b.slogan = '';
            if (!b.coverSkin) b.coverSkin = 'classic';
            if (!b.ownerSticker) b.ownerSticker = 'none';
            if (!Array.isArray(b.activeBuffs)) b.activeBuffs = [];
            if (!Array.isArray(b.activeDebuffs)) b.activeDebuffs = [];
            if (typeof b.reputation !== 'number') b.reputation = 0;
            if (typeof b.totalEarned !== 'number') b.totalEarned = 0;
            if (typeof b.createdAt !== 'number') b.createdAt = 0;
            if (b.level > 0 && !b.dna) b.dna = this._generateDNA(b.id);
        });

        // Инфраструктура
        if (!window.state.businessWorkshop) window.state.businessWorkshop = { equipment: 0, storage: 0, brand: 0, diagnostics: 0 };
        if (!window.state.businessStaff) window.state.businessStaff = { mechanic: 0, painter: 0, manager: 0, accountant: 0 };
        if (!Array.isArray(window.state.businessFleet)) window.state.businessFleet = [];
        if (!Array.isArray(window.state.player.businessAchievements)) window.state.player.businessAchievements = [];
        if (!window.state.player.businessAdBonus) window.state.player.businessAdBonus = null;

        // ⭐ v5.0.0: экономический цикл
        if (!window.state.player.economicCycle) {
            window.state.player.economicCycle = this._generateEconomicCycle();
        }

        // ⭐ v5.0.0: ежедневные челленджи
        if (!Array.isArray(window.state.player.dailyBizChallenges) || window.state.player.dailyBizChallenges.length === 0) {
            this._generateDailyBizChallenges();
        }

        // ⭐ v5.0.0: оффлайн-капитализация
        this._checkOfflineCapitalization();

        this._syncActiveBonus();
    },

    // ========================================================
    // ⭐ v5.0.0: ЭКОНОМИЧЕСКИЙ ЦИКЛ
    // ========================================================
    _generateEconomicCycle() {
        const roll = Math.random();
        let cycleId = 'stable';
        if (roll < 0.25) cycleId = 'boom';
        else if (roll < 0.55) cycleId = 'bust';

        const cycle = { ...this.ECONOMIC_CYCLES[cycleId] };
        cycle.daysLeft = Math.floor(2 + Math.random() * 4); // 2-5 дней
        cycle.startedDay = window.state.player.day || 1;

        console.log(`[PhoneBusiness] 🌍 Новый экономический цикл: ${cycle.name} (${cycle.daysLeft} дн.)`);
        return cycle;
    },

    _getEconomicCycleMultiplier() {
        const cycle = window.state.player?.economicCycle;
        if (!cycle) return 1.0;
        const curDay = window.state.player?.day || 1;
        const elapsed = curDay - (cycle.startedDay || curDay);
        if (elapsed >= cycle.daysLeft) return 1.0;
        return cycle.incomeMul || 1.0;
    },

    _tickEconomicCycle() {
        const curDay = window.state.player?.day || 1;
        const cycle = window.state.player?.economicCycle;

        if (!cycle) {
            window.state.player.economicCycle = this._generateEconomicCycle();
            return;
        }

        const elapsed = curDay - (cycle.startedDay || curDay);
        if (elapsed >= cycle.daysLeft) {
            console.log(`[PhoneBusiness] 🌍 Цикл "${cycle.name}" закончился, генерируем новый`);
            window.state.player.economicCycle = this._generateEconomicCycle();
        }
    },

    // ========================================================
    // ⭐ v5.0.0: ЕЖЕДНЕВНЫЕ ЧЕЛЛЕНДЖИ БИЗНЕСА
    // ========================================================
    _generateDailyBizChallenges() {
        const shuffled = [...this.DAILY_BIZ_CHALLENGES].sort(() => 0.5 - Math.random());
        const count = 3;

        window.state.player.dailyBizChallenges = shuffled.slice(0, count).map(ch => ({
            id: ch.id,
            text: ch.text,
            cur: 0,
            max: ch.target,
            action: ch.action,
            reward: ch.reward,
            xp: ch.xp,
            done: false
        }));
    },

    _trackBizChallenge(actionType, count = 1) {
        const challenges = window.state.player?.dailyBizChallenges;
        if (!Array.isArray(challenges)) return;

        let updated = false;
        challenges.forEach(ch => {
            if (!ch.done && ch.action === actionType) {
                ch.cur = Math.min(ch.max, (ch.cur || 0) + count);
                updated = true;

                if (ch.cur >= ch.max) {
                    ch.done = true;
                    if (window.MoneyManager) {
                        window.MoneyManager.earn(ch.reward, `Бизнес-челлендж: ${ch.text}`, { silent: true });
                    } else {
                        window.state.player.cash = (window.state.player.cash || 0) + ch.reward;
                    }
                    if (typeof addXp === 'function') addXp(ch.xp);
                    if (typeof showToast === 'function') {
                        showToast(`🏆 Челлендж выполнен: «${ch.text}» +${ch.reward.toLocaleString()} ₽`);
                    }
                    if (window.AudioFx) {
                        window.AudioFx.play('win');
                        window.AudioFx.haptic('success');
                    }
                }
            }
        });

        if (updated && typeof saveState === 'function') saveState();
    },

    // ========================================================
    // ⭐ v5.0.0: ОФФЛАЙН-КАПИТАЛИЗАЦИЯ
    // ========================================================
    _checkOfflineCapitalization() {
        const lastVisit = window.state.player?.lastBizVisitDay || 0;
        const curDay = window.state.player?.day || 1;
        const daysAway = curDay - lastVisit;

        if (daysAway >= 3 && lastVisit > 0) {
            // Начисляем +5% бонус к кассе за каждый день оффлайна
            let bonus = 0;
            window.state.businesses.forEach(b => {
                if (b && b.level > 0 && b.stored > 0) {
                    const bns = Math.round(b.stored * 0.05 * Math.min(daysAway, 7));
                    b.stored += bns;
                    bonus += bns;
                }
            });

            if (bonus > 0) {
                setTimeout(() => {
                    if (typeof showToast === 'function') {
                        showToast(`💎 Оффлайн-бонус: +${bonus.toLocaleString()} ₽ к кассе!`);
                    }
                }, 2000);
            }
        }

        window.state.player.lastBizVisitDay = curDay;
        if (typeof saveState === 'function') saveState();
    },

    // ========================================================
    // ⭐ v5.0.0: ЦЕЛЕВЫЕ УРОВНИ СЕТИ
    // ========================================================
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

    // ========================================================
    // ⭐ v5.0.0: БОНУС ЗА РАЗНООБРАЗИЕ
    // ========================================================
    _getDiversityBonus() {
        if (!Array.isArray(window.state.businesses)) return 0;
        const ownedTypes = new Set(
            window.state.businesses
                .filter(b => b && b.level > 0)
                .map(b => String(b.id).replace(/\d+/g, '').trim())
        );
        if (ownedTypes.size >= 5) return 0.15;
        if (ownedTypes.size >= 3) return 0.07;
        return 0;
    },

    // ========================================================
    // БАЗОВЫЕ ХЕЛПЕРЫ
    // ========================================================
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
        const map = {
            wash: '🧼', shina: '🛞', sto: '🔧', tow_truck: '🚨',
            paint_shop: '🎨', chip_tuning: '🏎️', detailing: '✨',
            razborka: '🔩', autopodbor: '📋', taxi: '📱', customs_hub: '🏛️'
        };
        return map[id] || '💼';
    },

    _syncActiveBonus() {
        const curDay = window.state?.player?.day || 1;
        const storedBonus = window.state?.player?.businessAdBonus;

        if (!storedBonus) {
            this._activeBonus = null;
            return;
        }

        if ((storedBonus.expiresDay || 0) < curDay) {
            window.state.player.businessAdBonus = null;
            this._activeBonus = null;
        } else {
            this._activeBonus = storedBonus;
        }
    },

    // ========================================================
    // РАСЧЁТЫ
    // ========================================================
    countOwned() {
        if (!Array.isArray(window.state?.businesses)) return 0;
        return window.state.businesses.filter(b => b && b.level > 0).length;
    },

    getWorkshopBonus(branch) {
        if (!window.state.businessWorkshop) return 0;
        return window.state.businessWorkshop[branch] || 0;
    },

    getBizIncome(b) {
        if (!b || typeof b !== 'object') return 0;
        if (b.level <= 0) return 0;

        let inc = this._n(b.income, 0) * Math.pow(1.55, Math.max(0, b.level - 1));
        inc *= this.getDNAMultiplier(b.dna);

        if (b.stock <= 0) inc *= 0.15;

        const curDay = window.state.player?.day || 1;
        (b.activeBuffs || []).forEach(buff => {
            if (buff && (buff.expiresDay || 0) >= curDay) {
                inc *= (1 + (buff.pct || 0) / 100);
            }
        });
        (b.activeDebuffs || []).forEach(debuff => {
            if (debuff && (debuff.expiresDay || 0) >= curDay) {
                inc *= (1 - (debuff.pct || 0) / 100);
            }
        });

        const repBonus = Math.min(20, (b.reputation || 0) * 0.2);
        inc *= (1 + repBonus / 100);

        return Math.round(inc);
    },

    // ⭐ v5.0.0: доход с ВСЕМИ бонусами (workshop + staff + ad + corp + цикл + milestone + diversity)
    getBizIncomeWithBonuses(b) {
        const base = this.getBizIncome(b);
        if (base <= 0) return 0;

        let total = base;

        // Цех
        total *= (1 + this.getWorkshopBonus('equipment') * 0.15);
        total *= (1 + this.getWorkshopBonus('brand') * 0.20);

        // Бухгалтер
        if ((window.state.businessStaff?.accountant || 0) > 0) {
            total *= 1.08;
        }

        // Реклама
        this._syncActiveBonus();
        if (this._activeBonus && this._activeBonus.expiresDay >= (window.state.player?.day || 1)) {
            total *= (1 + (this._activeBonus.bonusPct || 0) / 100);
        }

        // Корпорация
        total *= (1 + this._getCorporationBonus());

        // ⭐ v5.0.0: экономический цикл
        total *= this._getEconomicCycleMultiplier();

        // ⭐ v5.0.0: сетевой milestone
        total *= (1 + this._getNetworkMilestoneBonus());

        // ⭐ v5.0.0: бонус разнообразия
        total *= (1 + this._getDiversityBonus());

        return Math.round(total);
    },

    getTotalDailyIncome() {
        if (!Array.isArray(window.state?.businesses)) return 0;

        let total = 0;
        window.state.businesses.forEach(b => {
            if (!b || b.level <= 0) return;
            total += this.getBizIncomeWithBonuses(b);
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
        if (!window.state.businessWorkshop) return false;
        return this.workshopUpgrades.every(u => (window.state.businessWorkshop[u.id] || 0) >= u.maxLevel);
    },

    workshopUpgrades: [
        { id: 'equipment',   icon: '🛠',  name: 'Оснащение цеха',          desc: '+15% к выручке сети за уровень',        baseCost: 147000, costMul: 1.70, maxLevel: 3 },
        { id: 'storage',     icon: '📦',  name: 'Склад и ёмкости',         desc: 'Вместимость сырья +50% за уровень',      baseCost: 105000, costMul: 1.60, maxLevel: 3 },
        { id: 'brand',       icon: '🎨',  name: 'Брендирование и реклама', desc: '+20% пассивного дохода за уровень',      baseCost: 220000, costMul: 1.80, maxLevel: 3 },
        { id: 'diagnostics', icon: '💻',  name: 'Компьютерный стенд',      desc: '+10% к шансу выявить скрытые косяки',    baseCost: 310000, costMul: 1.90, maxLevel: 3 }
    ],

    staffList: [
        { id: 'mechanic',   icon: '👨‍🔧', name: 'Мастер-универсал',     role: 'Ремонт и слесарка',    salary: 45000, maxHired: 5, perk: '+10% к скорости ремонта' },
        { id: 'painter',    icon: '🥽',  name: 'Колорист-маляр',       role: 'Покраска',              salary: 60000, maxHired: 3, perk: '-15% к расходу краски' },
        { id: 'manager',    icon: '👔',  name: 'Управляющий филиалом', role: 'Администрирование',    salary: 85000, maxHired: 2, perk: 'Автосбор кассы раз в день' },
        { id: 'accountant', icon: '💼',  name: 'Главный бухгалтер',    role: 'Финансы и налоги',     salary: 75000, maxHired: 1, perk: '+8% к чистой выручке' }
    ],

    fleetVehicles: [
        { id: 'gazelle',     icon: '🚐',  name: 'ГАЗель NEXT (Фургон)',           cost: 850000,  dailyCost: 1200, bonus: 'Доставка сырья дешевле на 30%' },
        { id: 'tow_truck',   icon: '🚛',  name: 'Эвакуатор ГАЗон NEXT',           cost: 1650000, dailyCost: 2400, bonus: 'Бесплатный выезд за авто дальше 25 км' },
        { id: 'service_van', icon: '🛠️', name: 'Mercedes Sprinter (Моб. сервис)', cost: 3200000, dailyCost: 4500, bonus: 'Осмотр авто на выезде без СТО' }
    ],

    achievements: [
        { id: 'first_point',  title: '🏪 Первый объект',      cond: () => PhoneBusiness.countOwned() >= 1,   reward: { cash: 50000,  xp: 50 } },
        { id: 'five_points',  title: '🏙 Бизнес-империя',     cond: () => PhoneBusiness.countOwned() >= 5,   reward: { cash: 250000, xp: 150 } },
        { id: 'ten_points',   title: '👑 Магнат автобизнеса', cond: () => PhoneBusiness.countOwned() >= 10,  reward: { cash: 1000000, stars: 25, xp: 500 } },
        { id: 'cash_100k',    title: '💰 Первая сотня',       cond: () => PhoneBusiness.getAccumulatedCash() >= 100000,   reward: { cash: 30000, xp: 40 } },
        { id: 'cash_1m',      title: '💎 Миллион в кассах',   cond: () => PhoneBusiness.getAccumulatedCash() >= 1000000,  reward: { cash: 200000, xp: 200 } },
        { id: 'all_workshop', title: '🔧 Полное оснащение',   cond: () => PhoneBusiness.isWorkshopMaxed(),                reward: { cash: 500000, stars: 15, xp: 300 } },
        { id: 'corporation',  title: '🏢 Корпорация',         cond: () => PhoneBusiness._getCorporationBonus() >= 0.40,   reward: { cash: 750000, stars: 30, xp: 400 } },
        { id: 'first_p2p',    title: '💸 Первая продажа бизнеса', cond: () => (window.state.player.businessSalesCount || 0) >= 1, reward: { cash: 100000, xp: 100 } }
    ],

    // ========================================================
    // ГЛАВНЫЙ РЕНДЕР
    // ========================================================
    render(container) {
        if (!container) { console.warn('[PhoneBusiness] нет контейнера'); return; }
        this.ensureState();

        const tab = this.currentTab;
        const dailyIncome = this.getTotalDailyIncome();
        const accumulated = this.getAccumulatedCash();
        const ownedCount = this.countOwned();
        const totalBiz = (window.state.businesses || []).length;
        const corpBonus = Math.round(this._getCorporationBonus() * 100);
        const cycle = window.state.player?.economicCycle;
        const cycleMul = this._getEconomicCycleMultiplier();
        const milestoneBonus = Math.round(this._getNetworkMilestoneBonus() * 100);
        const diversityBonus = Math.round(this._getDiversityBonus() * 100);
        const nextMilestone = this._getNextMilestone();

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
                <!-- СВОДКА -->
                <div class="biz-summary-bar mb-2">
                    <div class="biz-summary-cell">
                        <div class="biz-summary-label">Точек</div>
                        <div class="biz-summary-value">${ownedCount} / ${totalBiz}</div>
                    </div>
                    <div class="biz-summary-cell">
                        <div class="biz-summary-label">Доход</div>
                        <div class="biz-summary-value color-green">+${dailyIncome.toLocaleString()} ₽</div>
                    </div>
                    <div class="biz-summary-cell">
                        <div class="biz-summary-label">В кассах</div>
                        <div class="biz-summary-value color-cyan">${accumulated.toLocaleString()} ₽</div>
                    </div>
                    <button onclick="PhoneBusiness.collectAllCash()" class="biz-collect-btn" ${accumulated <= 0 ? 'disabled' : ''} title="Собрать всю кассу">
                        <i class="fa-solid fa-hand-holding-dollar"></i>
                    </button>
                </div>

                <!-- ЭКОНОМИЧЕСКИЙ ЦИКЛ -->
                ${cycle ? `
                    <div class="glass-card mb-2 p-2" style="background:linear-gradient(135deg, rgba(0,242,254,0.06), rgba(9,14,24,0.95)); border-left:4px solid ${cycle.id === 'boom' ? 'var(--green)' : (cycle.id === 'bust' ? 'var(--red)' : 'var(--cyan)')};">
                        <div class="flex-between mb-1">
                            <b class="text-xs ${cycle.color || 'color-cyan'}">${cycle.name}</b>
                            <span class="tag-badge bg-tag-${cycle.id === 'boom' ? 'green' : (cycle.id === 'bust' ? 'red' : 'cyan')}" style="font-size:8px;">
                                ×${cycleMul.toFixed(2)} • ${cycle.daysLeft - ((window.state.player.day || 1) - (cycle.startedDay || 1))}д
                            </span>
                        </div>
                        <div class="sub-label" style="font-size:9px;">${cycle.desc}</div>
                    </div>
                ` : ''}

                <!-- БОНУСЫ СЕТИ -->
                ${(milestoneBonus > 0 || diversityBonus > 0) ? `
                    <div class="glass-card mb-2 p-2" style="background:rgba(0,230,118,0.06); border-color:rgba(0,230,118,0.3);">
                        <b class="text-xs color-green mb-1 block">🎁 Активные бонусы сети:</b>
                        <div class="space-y-1" style="font-size:9px;">
                            ${milestoneBonus > 0 ? `<div class="flex-between"><span>🏆 Milestone сети:</span> <b class="color-green">+${milestoneBonus}%</b></div>` : ''}
                            ${diversityBonus > 0 ? `<div class="flex-between"><span>🌟 Разнообразие типов:</span> <b class="color-green">+${diversityBonus}%</b></div>` : ''}
                            ${corpBonus > 0 ? `<div class="flex-between"><span>🏢 Корпорация:</span> <b class="color-green">+${corpBonus}%</b></div>` : ''}
                        </div>
                    </div>
                ` : ''}

                <!-- ПРОГРЕСС ДО СЛЕДУЮЩЕГО MILESTONE -->
                ${nextMilestone ? `
                    <div class="glass-card mb-2 p-2">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-cyan">${nextMilestone.name}</b>
                            <span class="tag-badge bg-tag-cyan" style="font-size:8px;">${ownedCount} / ${nextMilestone.count}</span>
                        </div>
                        <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; margin-bottom:4px;">
                            <div style="width:${Math.min(100, (ownedCount / nextMilestone.count) * 100)}%; height:100%; background:linear-gradient(90deg,var(--cyan),var(--green));"></div>
                        </div>
                        <div class="sub-label" style="font-size:8.5px;">Награда: <b class="color-green">${nextMilestone.bonus}</b></div>
                    </div>
                ` : ''}

                <!-- АКТИВНАЯ РЕКЛАМА -->
                ${this._activeBonus && this._activeBonus.expiresDay >= (window.state.player?.day || 1) ? `
                    <div class="biz-ad-bonus mb-2">
                        📻 <b>Реклама активна!</b> +${this._activeBonus.bonusPct}% до дня ${this._activeBonus.expiresDay}
                    </div>
                ` : ''}

                <!-- ВКЛАДКИ -->
                <div class="biz-tabs-row mb-2">
                    <button onclick="PhoneBusiness.setTab('points')" class="biz-tab ${tab === 'points' ? 'active' : ''}">
                        <i class="fa-solid fa-store"></i><span>Точки</span>
                    </button>
                    <button onclick="PhoneBusiness.setTab('workshop')" class="biz-tab ${tab === 'workshop' ? 'active' : ''}">
                        <i class="fa-solid fa-screwdriver-wrench"></i><span>Цех</span>
                    </button>
                    <button onclick="PhoneBusiness.setTab('staff')" class="biz-tab ${tab === 'staff' ? 'active' : ''}">
                        <i class="fa-solid fa-users"></i><span>Штат</span>
                    </button>
                    <button onclick="PhoneBusiness.setTab('fleet')" class="biz-tab ${tab === 'fleet' ? 'active' : ''}">
                        <i class="fa-solid fa-truck"></i><span>Парк</span>
                    </button>
                    <button onclick="PhoneBusiness.setTab('corp')" class="biz-tab ${tab === 'corp' ? 'active' : ''}">
                        <i class="fa-solid fa-building"></i><span>Корп.</span>
                    </button>
                </div>

                <!-- ЧЕЛЛЕНДЖИ -->
                ${this._renderDailyChallenges()}

                <div id="bizTabContent"></div>
            </div>
        `;

        const content = document.getElementById('bizTabContent');
        if (!content) return;

        try {
            if (tab === 'points')        this.renderPointsTab(content);
            else if (tab === 'workshop') this.renderWorkshopTab(content);
            else if (tab === 'staff')    this.renderStaffTab(content);
            else if (tab === 'fleet')    this.renderFleetTab(content);
            else if (tab === 'corp')     this.renderCorporationTab(content);
            else                         this.renderPointsTab(content);
        } catch (e) {
            console.error('[PhoneBusiness] Ошибка рендера таба:', tab, e);
            content.innerHTML = `
                <div class="glass-card p-3 text-center" style="border-color: var(--red);">
                    <div style="font-size: 28px; margin-bottom: 6px;">⚠️</div>
                    <b class="color-red text-xs">Ошибка рендера бизнес-сети</b>
                    <div class="sub-label mt-1" style="font-size: 9.5px;">${String(e.message || e).substring(0, 120)}</div>
                    <div class="sub-label mt-1" style="font-size: 9px;">Проверьте консоль (F12)</div>
                </div>
            `;
        }
    },

    // ========================================================
    // ⭐ v5.0.0: РЕНДЕР ЧЕЛЛЕНДЖЕЙ
    // ========================================================
    _renderDailyChallenges() {
        const challenges = window.state.player?.dailyBizChallenges;
        if (!Array.isArray(challenges) || challenges.length === 0) return '';

        const doneCount = challenges.filter(c => c.done).length;

        return `
            <div class="glass-card mb-2 p-2" style="background:linear-gradient(135deg, rgba(255,215,0,0.08), rgba(9,14,24,0.95)); border-color:rgba(255,215,0,0.35);">
                <div class="flex-between mb-2">
                    <b class="text-xs color-amber">🎯 Ежедневные челленджи</b>
                    <span class="tag-badge bg-tag-amber" style="font-size:8px;">${doneCount} / ${challenges.length}</span>
                </div>
                <div class="space-y-1">
                    ${challenges.map(ch => `
                        <div class="flex-between p-1" style="background:rgba(0,0,0,0.3); border-radius:6px; font-size:9px;">
                            <div style="flex:1; min-width:0;">
                                <div class="${ch.done ? 'color-green' : 'color-main'}" style="font-size:9.5px;">${ch.done ? '✅' : '⏳'} ${ch.text}</div>
                                <div class="sub-label" style="font-size:8px;">${ch.cur || 0} / ${ch.max} • +${ch.reward.toLocaleString()} ₽</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    setTab(tab) {
        this.currentTab = tab;
        if (window.AudioFx) window.AudioFx.play('tick');
        if (window.AudioFx) window.AudioFx.haptic('light');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // ========================================================
    // ТАБ: ТОЧКИ
    // ========================================================
    renderPointsTab(container) {
        if (!container) return;
        const pLvl = window.state.player?.level || 1;
        const curDay = window.state.player?.day || 1;

        const sorted = [...window.state.businesses]
            .filter(b => b)
            .sort((a, b) => {
                const aOwned = a.level > 0 ? 1 : 0;
                const bOwned = b.level > 0 ? 1 : 0;
                if (aOwned !== bOwned) return bOwned - aOwned;
                return (a.minLevel || 1) - (b.minLevel || 1);
            });

        let html = '';
        sorted.forEach(b => {
            try {
                html += this._renderBizCard(b, pLvl, curDay);
            } catch (e) {
                console.error('[PhoneBusiness] Ошибка рендера карточки:', b.id, e);
                html += `
                    <div class="glass-card mb-2 p-2" style="border-color: var(--red);">
                        <b class="text-xs color-red">⚠️ Ошибка карточки: ${b.name || b.id}</b>
                        <div class="sub-label mt-1" style="font-size: 9px;">${String(e.message || e).substring(0, 100)}</div>
                    </div>
                `;
            }
        });

        html += this.renderAchievementsBlock();
        container.innerHTML = html;

        window.state.businesses.forEach(b => {
            if (b && b.level > 0) {
                try { this.drawSparkline(b); } catch (e) {}
            }
        });
    },

    _renderBizCard(b, pLvl, curDay) {
        const isOwned = b.level > 0;
        const upgradeCost = Math.round((b.cost || 0) * Math.pow(1.65, b.level || 0));
        const isMaxed = b.level >= 5;
        const isLockedByLevel = !isOwned && pLvl < (b.minLevel || 1);

        const currentIncome = isOwned ? this.getBizIncomeWithBonuses(b) : 0;
        const cash = Math.floor(b.stored || 0);
        const stock = Math.round(b.stock || 0);
        const maxStock = b.maxStock || 100;
        const stockPct = Math.round((stock / maxStock) * 100);
        const stockColor = stock < 30 ? 'color-red' : (stock < 60 ? 'color-amber' : 'color-green');

        // ⭐ v5.0.0: прогноз окупаемости
        let paybackHtml = '';
        if (isOwned && currentIncome > 0) {
            const totalInvested = (b.cost || 0) * (Math.pow(1.65, b.level) - 1) / 0.65;
            const paybackDays = Math.ceil(totalInvested / currentIncome);
            paybackHtml = `<div class="sub-label" style="font-size:8px;">💸 Окупится за ~<b class="color-cyan">${paybackDays} дн.</b></div>`;
        }

        const statusBadge = this._renderBizStatusBadge(b, pLvl, isMaxed);
        const coverHtml = this._renderBizCover(b, statusBadge);
        const statsHtml = this._renderBizStats(b, isOwned, currentIncome, cash, stockPct, stockColor);
        const dnaHtml = isOwned ? this._renderBizDNA(b, curDay) : '';
        const effectsHtml = this._renderBizEffects(b, curDay);
        const actionsHtml = this._renderBizActions(b, pLvl, isOwned, isMaxed, upgradeCost);

        const skin = this._getCoverSkins().find(s => s.id === b.coverSkin) || this._getCoverSkins()[0];

        return `
            <div class="glass-card biz-card mb-2 ${skin.cssClass || ''}" style="border-left: 3px solid ${isOwned ? skin.color : (isLockedByLevel ? 'rgba(255,255,255,0.1)' : 'var(--cyan)')}; ${isLockedByLevel ? 'opacity:0.75;' : ''}">
                ${coverHtml}
                <div class="sub-label mb-2" style="font-size:9px; line-height:1.35;">${b.desc || ''}</div>
                ${statsHtml}
                ${paybackHtml}
                ${dnaHtml}
                ${effectsHtml}
                ${isOwned ? this.renderSparkline(b) : ''}
                ${actionsHtml}
            </div>
        `;
    },

    _renderBizStatusBadge(b, pLvl, isMaxed) {
        const isOwned = b.level > 0;
        const isLockedByLevel = !isOwned && pLvl < (b.minLevel || 1);

        if (!isOwned && isLockedByLevel) return `<span class="tag-badge bg-tag-red">🔒 ${b.minLevel} ур.</span>`;
        if (!isOwned)                    return `<span class="tag-badge bg-tag-cyan">Доступен</span>`;
        if (isMaxed)                     return `<span class="tag-badge bg-tag-amber">MAX ур.</span>`;
        return `<span class="tag-badge bg-tag-green">Ур. ${b.level}</span>`;
    },

    _renderBizCover(b, statusBadge) {
        const isOwned = b.level > 0;
        const isLockedByLevel = !isOwned && ((window.state.player?.level || 1) < (b.minLevel || 1));
        const skin = this._getCoverSkins().find(s => s.id === b.coverSkin) || this._getCoverSkins()[0];
        const sticker = this._getOwnerStickers().find(s => s.id === b.ownerSticker) || this._getOwnerStickers()[0];

        const rawImg = b.img || '';
        const fallbackImg = b.fallback || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80';

        let imgAttrs;
        if (typeof buildCarImageAttrs === 'function' && rawImg) {
            imgAttrs = buildCarImageAttrs(rawImg, {
                img: rawImg, images: [rawImg], fallback: fallbackImg, type: 'comfort'
            });
        } else {
            imgAttrs = `src="${rawImg || fallbackImg}" onerror="this.onerror=null; this.src='${fallbackImg}';"`;
        }

        const stickerHtml = sticker.id !== 'none' ? `
            <div class="biz-owner-sticker" style="border-color:${skin.color}; box-shadow:0 0 10px ${skin.color};">
                ${sticker.icon}
            </div>
        ` : '';

        return `
            <div class="biz-cover" style="${isLockedByLevel ? 'filter:grayscale(0.85) brightness(0.55);' : ''}">
                <img ${imgAttrs} class="biz-cover-img"
                     onerror="if(this.dataset.fbAttempted!=='1'){this.dataset.fbAttempted='1'; this.src='${fallbackImg}';}else{this.style.display='none'; this.parentNode.style.background='linear-gradient(135deg,#090e18,#050914)'; this.parentNode.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;font-size:52px;opacity:0.35;\\'>${b.icon}</div>';}">

                <div class="biz-cover-icon">${b.icon}</div>
                ${stickerHtml}
                <div class="biz-cover-status">${statusBadge}</div>
                <div class="biz-cover-overlay"></div>
                <div class="biz-cover-title">
                    <b class="${isOwned ? 'color-green' : 'color-cyan'}">${b.customName || b.name}</b>
                    ${b.slogan ? `<div class="biz-cover-slogan" style="color:${skin.color};">«${b.slogan}»</div>` : ''}
                </div>
            </div>
        `;
    },

    _renderBizStats(b, isOwned, currentIncome, cash, stockPct, stockColor) {
        if (isOwned) {
            return `
                <div class="biz-stats-panel">
                    <div class="sub-label mb-1" style="font-size:8.5px;">⭐ ${b.perk || ''}</div>
                    <div class="biz-stats-grid">
                        <div class="biz-stat-cell">
                            <span class="biz-stat-label">Доход</span>
                            <b class="biz-stat-val color-green">+${currentIncome.toLocaleString()}</b>
                        </div>
                        <div class="biz-stat-cell">
                            <span class="biz-stat-label">Касса</span>
                            <b class="biz-stat-val color-cyan">${(cash / 1000).toFixed(1)}k</b>
                        </div>
                        <div class="biz-stat-cell">
                            <span class="biz-stat-label">Сырьё</span>
                            <b class="biz-stat-val ${stockColor}">${stockPct}%</b>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="biz-stats-panel">
                    <div class="sub-label mb-1" style="font-size:8.5px;">⭐ ${b.perk || ''}</div>
                    <div class="biz-stats-grid">
                        <div class="biz-stat-cell">
                            <span class="biz-stat-label">Старт</span>
                            <b class="biz-stat-val color-green">+${(b.income || 0).toLocaleString()}</b>
                        </div>
                        <div class="biz-stat-cell">
                            <span class="biz-stat-label">Цена</span>
                            <b class="biz-stat-val color-amber">${(b.cost || 0).toLocaleString()}</b>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    _renderBizDNA(b, curDay) {
        const dna = b.dna ? this._getDNAObject(b.dna) : null;
        if (!dna) return '';
        const dnaMult = this.getDNAMultiplier(b.dna);

        return `
            <div class="biz-dna-panel">
                <div class="biz-dna-header">
                    <span class="biz-dna-title">🧬 ДНК</span>
                    <span class="tag-badge ${dnaMult >= 1 ? 'bg-tag-green' : 'bg-tag-red'}" style="font-size:7px;">
                        ${dnaMult >= 1 ? '+' : ''}${Math.round((dnaMult - 1) * 100)}%
                    </span>
                </div>
                <div class="biz-dna-scroll">
                    <div class="biz-dna-cell" title="${dna.location.name}">
                        <span>${dna.location.icon}</span>
                        <span class="biz-dna-cell-mult">×${dna.location.mult.toFixed(2)}</span>
                    </div>
                    <div class="biz-dna-cell" title="${dna.traffic.name}">
                        <span>${dna.traffic.icon}</span>
                        <span class="biz-dna-cell-mult">×${dna.traffic.mult.toFixed(2)}</span>
                    </div>
                    <div class="biz-dna-cell" title="${dna.condition.name}">
                        <span>${dna.condition.icon}</span>
                        <span class="biz-dna-cell-mult">×${dna.condition.mult.toFixed(2)}</span>
                    </div>
                    <div class="biz-dna-cell" title="${dna.staff.name}">
                        <span>${dna.staff.icon}</span>
                        <span class="biz-dna-cell-mult">×${dna.staff.mult.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    },

    _renderBizEffects(b, curDay) {
        const activeBuffs = (b.activeBuffs || []).filter(x => x && (x.expiresDay || 0) >= curDay);
        const activeDebuffs = (b.activeDebuffs || []).filter(x => x && (x.expiresDay || 0) >= curDay);
        if (activeBuffs.length === 0 && activeDebuffs.length === 0) return '';

        let html = `<div class="biz-effects-row">`;
        activeBuffs.forEach(buff => {
            html += `<span class="tag-badge bg-tag-green" style="font-size:7.5px;">✅ +${buff.pct}% (${buff.expiresDay - curDay + 1}д)</span>`;
        });
        activeDebuffs.forEach(d => {
            html += `<span class="tag-badge bg-tag-red" style="font-size:7.5px;">⚠ -${d.pct}% (${d.expiresDay - curDay + 1}д)</span>`;
        });
        html += `</div>`;
        return html;
    },

    _renderBizActions(b, pLvl, isOwned, isMaxed, upgradeCost) {
        const isLockedByLevel = !isOwned && pLvl < (b.minLevel || 1);

        if (isLockedByLevel) {
            return `<button class="btn btn-dark btn-sm w-full opacity-50" disabled>🔒 Требуется ${b.minLevel} ур.</button>`;
        }

        if (!isOwned) {
            const canAfford = (window.state.player?.cash || 0) >= (b.cost || 0);
            return `<button onclick="PhoneBusiness.upgradePoint('${b.id}')" class="btn ${canAfford ? 'btn-green' : 'btn-dark opacity-50'} btn-sm w-full font-bold" ${canAfford ? '' : 'disabled'}>
                🏗 Купить объект (${(b.cost || 0).toLocaleString()} ₽${b.reqStars ? ` + ${b.reqStars} ⭐` : ''})
            </button>`;
        }

        const cash = Math.floor(b.stored || 0);
        return `
            <div class="biz-actions-grid">
                <button onclick="PhoneBusiness.collectPointCash('${b.id}')" class="btn btn-green btn-sm" ${cash <= 0 ? 'disabled' : ''} title="Собрать кассу">
                    <i class="fa-solid fa-hand-holding-dollar"></i> ${cash > 0 ? (cash/1000).toFixed(1) + 'k' : '0'}
                </button>
                <button onclick="PhoneBusiness.buySupplies('${b.id}')" class="btn btn-cyan btn-sm" title="Пополнить сырьё (15k)">
                    <i class="fa-solid fa-box"></i> Сырьё
                </button>
                <button onclick="PhoneBusiness.openCustomizeModal('${b.id}')" class="btn btn-purple btn-sm" title="Изменить название/обложку">
                    <i class="fa-solid fa-pen"></i> Изменить
                </button>
            </div>
            ${!isMaxed ? `
                <button onclick="PhoneBusiness.upgradePoint('${b.id}')" class="btn btn-amber btn-sm w-full mb-2 mt-2" ${(window.state.player?.cash || 0) < upgradeCost ? 'disabled' : ''}>
                    ⬆ Улучшить до ур. ${b.level + 1} (${upgradeCost.toLocaleString()} ₽)
                </button>
            ` : `
                <button class="btn btn-dark btn-sm w-full mb-2 mt-2 opacity-50" disabled>🏆 Максимум уровня</button>
            `}
            <button onclick="PhoneBusiness.openSellModal('${b.id}')" class="btn btn-red btn-sm w-full" style="font-size:9.5px;">
                💰 Продать на P2P бирже
            </button>
        `;
    },

    // --------------------------------------------------------
    // ГРАФИК 7 ДНЕЙ
    // --------------------------------------------------------
    renderSparkline(biz) {
        return `
            <div class="biz-spark-panel">
                <div class="biz-spark-header">
                    <span>📈 Доход за 7 дней:</span>
                    <span id="sparkLabel_${biz.id}" class="biz-spark-label">—</span>
                </div>
                <canvas id="bizSpark_${biz.id}" width="360" height="50"></canvas>
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
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        for (let i = 1; i < 4; i++) {
            const y = (H / 4) * i;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        if (history.length < 2) {
            ctx.fillStyle = 'rgba(148,163,184,0.5)';
            ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('Накапливаем данные с первого дня...', W / 2, H / 2 + 3);
            const label = document.getElementById(`sparkLabel_${biz.id}`);
            if (label) label.innerText = 'Нет данных';
            return;
        }

        const maxVal = Math.max(...history, 1);
        const stepX = W / (history.length - 1);
        const padY = 6, usableH = H - padY * 2;
        ctx.strokeStyle = '#00e676'; ctx.lineWidth = 2; ctx.beginPath();
        history.forEach((val, i) => {
            const x = i * stepX, y = H - padY - (val / maxVal) * usableH;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(0,230,118,0.35)');
        grad.addColorStop(1, 'rgba(0,230,118,0.02)');
        ctx.fillStyle = grad; ctx.fill();
        history.forEach((val, i) => {
            const x = i * stepX, y = H - padY - (val / maxVal) * usableH;
            ctx.fillStyle = '#00e676'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
        });

        const label = document.getElementById(`sparkLabel_${biz.id}`);
        if (label) label.textContent = `Макс: ${maxVal.toLocaleString()} ₽`;
    },

    // --------------------------------------------------------
    // ДОСТИЖЕНИЯ
    // --------------------------------------------------------
    renderAchievementsBlock() {
        const unlocked = window.state.player?.businessAchievements || [];
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
                    <b class="text-xs color-amber"><i class="fa-solid fa-trophy mr-1"></i> Достижения</b>
                    <span class="tag-badge bg-tag-amber">${unlocked.length} / ${this.achievements.length}</span>
                </div>
                ${html}
            </div>
        `;
    },

    checkAchievements() {
        if (!window.state.player) return;
        if (!Array.isArray(window.state.player.businessAchievements)) window.state.player.businessAchievements = [];
        let unlocked = false;
        this.achievements.forEach(a => {
            if (window.state.player.businessAchievements.includes(a.id)) return;
            try {
                if (a.cond()) {
                    window.state.player.businessAchievements.push(a.id);

                    if (a.reward.cash) {
                        if (window.MoneyManager) {
                            window.MoneyManager.earn(a.reward.cash, `Достижение бизнеса: ${a.title}`, { silent: true });
                        } else {
                            window.state.player.cash = (window.state.player.cash || 0) + a.reward.cash;
                        }
                    }
                    if (a.reward.stars) {
                        window.state.player.stars = (window.state.player.stars || 0) + a.reward.stars;
                    }
                    if (a.reward.xp && typeof addXp === 'function') {
                        addXp(a.reward.xp);
                    }

                    if (typeof showToast === 'function') showToast(`🏆 Достижение: «${a.title}»!`);
                    if (window.AudioFx) window.AudioFx.play('win');

                    if (window.EventBus) {
                        window.EventBus.emit('business:achievement', { id: a.id, title: a.title });
                    }

                    unlocked = true;
                }
            } catch (e) { console.warn('[Business] ошибка достижения:', a.id, e); }
        });
        if (unlocked && typeof saveState === 'function') saveState();
    },

    // ========================================================
    // ТАБ: ЦЕХ
    // ========================================================
    renderWorkshopTab(container) {
        if (!container) return;
        let html = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,242,254,0.12), #090e18); border-color: rgba(0,242,254,0.3);">
                <b class="text-xs color-cyan"><i class="fa-solid fa-screwdriver-wrench mr-1"></i> Центральный цех сети</b>
                <div class="sub-label mt-1" style="font-size:9px;">Прокачка даёт пассивные бонусы всем точкам одновременно.</div>
            </div>
        `;

        this.workshopUpgrades.forEach(u => {
            const curLvl = window.state.businessWorkshop[u.id] || 0;
            const isMax = curLvl >= u.maxLevel;
            const cost = Math.round(u.baseCost * Math.pow(u.costMul, curLvl));
            const canAfford = (window.state.player?.cash || 0) >= cost;

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
                    <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; margin-bottom:8px;">
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

    // ========================================================
    // ТАБ: ШТАТ
    // ========================================================
    renderStaffTab(container) {
        if (!container) return;
        let html = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(192,132,252,0.12), #090e18); border-color: rgba(192,132,252,0.3);">
                <b class="text-xs color-purple"><i class="fa-solid fa-users mr-1"></i> Управление кадрами</b>
                <div class="sub-label mt-1" style="font-size:9px;">Специалисты автоматизируют рутину и увеличивают прибыль сети.</div>
            </div>
        `;

        this.staffList.forEach(s => {
            const hired = window.state.businessStaff[s.id] || 0;
            const isMax = hired >= s.maxHired;
            const canAfford = (window.state.player?.cash || 0) >= s.salary;

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

    // ========================================================
    // ТАБ: АВТОПАРК
    // ========================================================
    renderFleetTab(container) {
        if (!container) return;
        let html = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(255,179,0,0.12), #090e18); border-color: rgba(255,179,0,0.3);">
                <b class="text-xs color-amber"><i class="fa-solid fa-truck mr-1"></i> Корпоративный транспорт</b>
                <div class="sub-label mt-1" style="font-size:9px;">Спецтехника снижает расходы и расширяет радиус.</div>
            </div>
        `;
        this.fleetVehicles.forEach(v => {
            const isOwned = window.state.businessFleet.includes(v.id);
            const canAfford = (window.state.player?.cash || 0) >= v.cost;
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
                    ${isOwned ? `
                        <button class="btn btn-dark btn-sm w-full opacity-50" disabled>✓ Куплено</button>
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

    // ========================================================
    // ТАБ: КОРПОРАЦИИ (M&A)
    // ========================================================
    renderCorporationTab(container) {
        if (!container) return;
        const groups = {};
        window.state.businesses.forEach(b => {
            if (!b || b.level < 1) return;
            const rawId = String(b.id || '');
            const key = rawId.replace(/\d+/g, '').trim() || rawId || '_default';
            if (!groups[key]) groups[key] = [];
            groups[key].push(b);
        });

        let corpsHtml = '';
        let hasAnyCorp = false;

        for (const key in groups) {
            const list = groups[key];
            const eligible = list.filter(b => b.level >= 3);
            const isCorp = eligible.length >= 3;
            if (isCorp) hasAnyCorp = true;
            const totalIncome = list.reduce((sum, b) => sum + this.getBizIncomeWithBonuses(b), 0);

            corpsHtml += `
                <div class="glass-card mb-2 p-2" style="border-left:3px solid ${isCorp ? 'var(--green)' : 'var(--border-glass)'};">
                    <div class="flex-between mb-1">
                        <div>
                            <b class="text-xs ${isCorp ? 'color-green' : 'color-cyan'}">${list[0].name} × ${list.length}</b>
                            <div class="sub-label" style="font-size:8.5px;">Точек уровня 3+: <b>${eligible.length} / 3</b></div>
                        </div>
                        ${isCorp
                            ? '<span class="tag-badge bg-tag-green">🏢 КОРПОРАЦИЯ +40%</span>'
                            : `<span class="tag-badge bg-tag-dark">Не корпорация</span>`}
                    </div>
                    <div class="grid-2 text-xs" style="gap:4px;">
                        <div>Суммарный доход: <b class="color-green">+${totalIncome.toLocaleString()} ₽/д</b></div>
                        <div>Участников: <b>${list.length}</b></div>
                    </div>
                </div>
            `;
        }

        if (!hasAnyCorp && Object.keys(groups).length === 0) {
            corpsHtml = `<div class="glass-card text-center py-6 sub-label">Купите минимум 3 точки одного типа и прокачайте их до ур. 3 → получите корпорацию и бонус +40% к доходу.</div>`;
        }

        container.innerHTML = `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle at 50% 0%, rgba(0,230,118,0.12), #090e18); border-color: rgba(0,230,118,0.4);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-green"><i class="fa-solid fa-building mr-1"></i> Корпорации бизнесов</b>
                    <span class="tag-badge bg-tag-green">+40% к доходу</span>
                </div>
                <div class="sub-label" style="font-size:9px;">
                    Объединяйте 3+ точки одного типа уровня 3+ в корпорацию.
                </div>
            </div>
            ${corpsHtml}
        `;
    },

    // ========================================================
    // ДЕЙСТВИЯ
    // ========================================================
    collectAllCash() {
        if (this._collectPending) return;
        this._collectPending = true;

        try {
            this.ensureState();
            let total = 0;
            let points = 0;
            window.state.businesses.forEach(b => {
                if (b && b.level > 0 && b.stored > 0) {
                    total += Math.floor(b.stored);
                    b.totalEarned = (b.totalEarned || 0) + Math.floor(b.stored);
                    b.stored = 0;
                    points++;
                }
            });
            if (total <= 0) {
                if (typeof showToast === 'function') showToast('В кассах пусто!');
                return;
            }

            if (window.MoneyManager) {
                window.MoneyManager.earn(total, 'Сбор кассы бизнес-сети');
            } else {
                window.state.player.cash = (window.state.player.cash || 0) + total;
                if (typeof logBankTransaction === 'function') logBankTransaction('Сбор кассы бизнес-сети', total, true);
            }

            if (typeof trackQuestProgress === 'function') trackQuestProgress('collect_biz', 1);
            this._trackBizChallenge('collect', points);
            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (window.AudioFx) window.AudioFx.play('win');
            if (window.AudioFx) window.AudioFx.haptic('success');
            if (typeof showToast === 'function') showToast(`💰 Собрано: +${total.toLocaleString()} ₽!`);
            if (typeof spawnFloatingReward === 'function') spawnFloatingReward(`+${total.toLocaleString()} ₽`);

            if (window.EventBus) {
                window.EventBus.emit('business:income_collected', { total, source: 'all' });
            }

            this.checkAchievements();
            this.render(document.getElementById('phoneAppContainer'));
        } finally {
            this._collectPending = false;
        }
    },

    collectPointCash(bizId) {
        if (this._collectPending) return;

        this.ensureState();
        const b = window.state.businesses.find(x => x && x.id === bizId);
        if (!b || b.stored <= 0) return;

        this._collectPending = true;
        try {
            const amount = Math.floor(b.stored);
            b.stored = 0;
            b.totalEarned = (b.totalEarned || 0) + amount;

            if (window.MoneyManager) {
                window.MoneyManager.earn(amount, `Сбор кассы: ${b.customName || b.name}`);
            } else {
                window.state.player.cash = (window.state.player.cash || 0) + amount;
                if (typeof logBankTransaction === 'function') logBankTransaction(`Сбор кассы: ${b.customName || b.name}`, amount, true);
            }

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (window.AudioFx) window.AudioFx.play('win');
            if (window.AudioFx) window.AudioFx.haptic('success');
            if (typeof showToast === 'function') showToast(`+${amount.toLocaleString()} ₽ из «${b.customName || b.name}»!`);
            if (typeof trackQuestProgress === 'function') trackQuestProgress('collect_biz', 1);
            this._trackBizChallenge('collect', 1);

            if (window.EventBus) {
                window.EventBus.emit('business:income_collected', { bizId, amount, source: 'point' });
            }

            this.checkAchievements();
            this.render(document.getElementById('phoneAppContainer'));
        } finally {
            this._collectPending = false;
        }
    },

    buySupplies(bizId) {
        this.ensureState();
        const b = window.state.businesses.find(x => x && x.id === bizId);
        if (!b || b.level <= 0) return;

        let cost = 15000;
        if (window.state.businessFleet.includes('gazelle')) cost = Math.round(cost * 0.7);

        if (window.MoneyManager) {
            const ok = window.MoneyManager.spend(cost, `Сырьё: ${b.customName || b.name}`);
            if (!ok) {
                if (typeof showToast === 'function') showToast(`Не хватает ${cost.toLocaleString()} ₽!`);
                return;
            }
        } else {
            if ((window.state.player.cash || 0) < cost) {
                if (typeof showToast === 'function') showToast(`Нужно ${cost.toLocaleString()} ₽!`);
                return;
            }
            window.state.player.cash -= cost;
            if (typeof logBankTransaction === 'function') logBankTransaction(`Сырьё: ${b.customName || b.name}`, cost, false);
        }

        b.stock = b.maxStock;

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('tick');
        if (typeof showToast === 'function') showToast(`Склад «${b.customName || b.name}» пополнен до 100%`);
        this._trackBizChallenge('stock', 1);

        if (window.EventBus) {
            window.EventBus.emit('business:supplies_bought', { bizId, cost });
        }

        this.render(document.getElementById('phoneAppContainer'));
    },

    upgradePoint(bizId) {
        if (this._upgradePending) return;

        this.ensureState();
        const b = window.state.businesses.find(x => x && x.id === bizId);
        if (!b) return;

        const isNew = b.level === 0;
        const cost = isNew ? b.cost : Math.round(b.cost * Math.pow(1.65, b.level));
        const pLvl = window.state.player?.level || 1;

        if (isNew && pLvl < (b.minLevel || 1)) {
            if (typeof showToast === 'function') showToast(`Нужен ${b.minLevel} уровень!`);
            return;
        }

        this._upgradePending = true;
        try {
            if (window.MoneyManager) {
                const ok = window.MoneyManager.spend(cost, isNew ? `Покупка бизнеса: ${b.name}` : `Апгрейд бизнеса: ${b.name}`);
                if (!ok) {
                    if (typeof showToast === 'function') showToast(`Не хватает ${cost.toLocaleString()} ₽!`);
                    return;
                }
            } else {
                if ((window.state.player.cash || 0) < cost) {
                    if (typeof showToast === 'function') showToast(`Нужно ${cost.toLocaleString()} ₽!`);
                    return;
                }
                window.state.player.cash -= cost;
                if (typeof logBankTransaction === 'function') logBankTransaction(isNew ? `Покупка бизнеса: ${b.name}` : `Апгрейд бизнеса: ${b.name}`, cost, false);
            }

            if (b.level === 0) {
                b.level = 1;
                b.stock = 100;
                b.createdAt = Date.now();
                b.dna = this._generateDNA(b.id);
                b.reputation = 5;
                this._trackBizChallenge('new_biz', 1);
            } else {
                b.level += 1;
                b.reputation = Math.min(100, (b.reputation || 0) + 3);
                this._trackBizChallenge('upgrade', 1);
            }

            if (typeof addXp === 'function') addXp(isNew ? 60 : 30);

            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (window.AudioFx) window.AudioFx.play('win');
            if (window.AudioFx) window.AudioFx.haptic('success');
            if (typeof showToast === 'function') showToast(isNew ? `🎉 Куплено: «${b.name}»!` : `⬆ Апгрейд «${b.name}» до ур. ${b.level}!`);

            if (window.EventBus) {
                window.EventBus.emit('business:upgraded', { bizId, newLevel: b.level, isNew, cost });
            }

            this.checkAchievements();
            this.render(document.getElementById('phoneAppContainer'));
        } finally {
            this._upgradePending = false;
        }
    },

    upgradeWorkshop(branch) {
        const u = this.workshopUpgrades.find(x => x.id === branch);
        if (!u) return;
        const curLvl = window.state.businessWorkshop[branch] || 0;
        if (curLvl >= u.maxLevel) return;
        const cost = Math.round(u.baseCost * Math.pow(u.costMul, curLvl));

        if (window.MoneyManager) {
            const ok = window.MoneyManager.spend(cost, `Апгрейд цеха: ${u.name}`);
            if (!ok) {
                if (typeof showToast === 'function') showToast(`Нужно ${cost.toLocaleString()} ₽!`);
                return;
            }
        } else {
            if ((window.state.player.cash || 0) < cost) {
                if (typeof showToast === 'function') showToast(`Нужно ${cost.toLocaleString()} ₽!`);
                return;
            }
            window.state.player.cash -= cost;
            if (typeof logBankTransaction === 'function') logBankTransaction(`Апгрейд цеха: ${u.name}`, cost, false);
        }

        window.state.businessWorkshop[branch] = curLvl + 1;
        if (typeof addXp === 'function') addXp(40);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('win');
        if (window.AudioFx) window.AudioFx.haptic('success');
        if (typeof showToast === 'function') showToast(`🛠 ${u.name}: уровень ${curLvl + 1}!`);

        if (window.EventBus) {
            window.EventBus.emit('business:workshop_upgraded', { branch, newLevel: curLvl + 1 });
        }

        this.checkAchievements();
        this.render(document.getElementById('phoneAppContainer'));
    },

    hireStaff(staffId) {
        const s = this.staffList.find(x => x.id === staffId);
        if (!s) return;
        const hired = window.state.businessStaff[staffId] || 0;
        if (hired >= s.maxHired) return;

        if (window.MoneyManager) {
            const ok = window.MoneyManager.spend(s.salary, `Найм: ${s.name}`);
            if (!ok) {
                if (typeof showToast === 'function') showToast(`Нужно ${s.salary.toLocaleString()} ₽!`);
                return;
            }
        } else {
            if ((window.state.player.cash || 0) < s.salary) {
                if (typeof showToast === 'function') showToast(`Нужно ${s.salary.toLocaleString()} ₽!`);
                return;
            }
            window.state.player.cash -= s.salary;
            if (typeof logBankTransaction === 'function') logBankTransaction(`Найм: ${s.name}`, s.salary, false);
        }

        window.state.businessStaff[staffId] = hired + 1;

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('win');
        if (window.AudioFx) window.AudioFx.haptic('success');
        if (typeof showToast === 'function') showToast(`👤 Нанят: ${s.name}`);

        if (window.EventBus) {
            window.EventBus.emit('business:staff_hired', { staffId, count: hired + 1 });
        }

        this.render(document.getElementById('phoneAppContainer'));
    },

    buyFleetVehicle(vehId) {
        const v = this.fleetVehicles.find(x => x.id === vehId);
        if (!v) return;
        if (window.state.businessFleet.includes(vehId)) return;

        if (window.MoneyManager) {
            const ok = window.MoneyManager.spend(v.cost, `Транспорт: ${v.name}`);
            if (!ok) {
                if (typeof showToast === 'function') showToast(`Нужно ${v.cost.toLocaleString()} ₽!`);
                return;
            }
        } else {
            if ((window.state.player.cash || 0) < v.cost) {
                if (typeof showToast === 'function') showToast(`Нужно ${v.cost.toLocaleString()} ₽!`);
                return;
            }
            window.state.player.cash -= v.cost;
            if (typeof logBankTransaction === 'function') logBankTransaction(`Транспорт: ${v.name}`, v.cost, false);
        }

        window.state.businessFleet.push(vehId);
        if (typeof addXp === 'function') addXp(80);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('win');
        if (window.AudioFx) window.AudioFx.haptic('success');
        if (typeof showToast === 'function') showToast(`🚚 Куплено: ${v.name}`);

        if (window.EventBus) {
            window.EventBus.emit('business:fleet_added', { vehicleId: vehId, cost: v.cost });
        }

        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // КАСТОМИЗАЦИЯ
    // --------------------------------------------------------
    openCustomizeModal(bizId) {
        const b = window.state.businesses.find(x => x && x.id === bizId);
        if (!b || b.level <= 0) return;

        let modal = document.getElementById('modalBizCustomize');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalBizCustomize';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        const coverSkins = this._getCoverSkins();
        const stickers = this._getOwnerStickers();

        const skinsHtml = coverSkins.map(s => {
            const isOwned = (window.state.player.ownedBizSkins || []).includes(s.id) || s.cost === 0;
            const isCurrent = b.coverSkin === s.id;
            return `
                <div onclick="PhoneBusiness.selectCoverSkin('${b.id}', '${s.id}')" class="p-2 mb-1 flex-between" style="background:${isCurrent ? 'rgba(0,242,254,0.1)' : '#050914'}; border:1.5px solid ${isCurrent ? s.color : 'rgba(255,255,255,0.08)'}; border-radius:8px; cursor:pointer;">
                    <div class="flex-gap" style="align-items:center;">
                        <div style="width:24px; height:24px; border-radius:6px; background:${s.color}; box-shadow:0 0 10px ${s.color};"></div>
                        <div>
                            <b class="text-xs" style="font-size:10.5px;">${s.name}</b>
                            <div class="sub-label" style="font-size:8.5px;">${isOwned ? (isCurrent ? '✓ Активно' : 'Куплено') : `${s.cost.toLocaleString()} ₽`}</div>
                        </div>
                    </div>
                    ${isCurrent ? '<span class="tag-badge bg-tag-green" style="font-size:7.5px;">АКТИВНО</span>' : (isOwned ? '' : '<span class="tag-badge bg-tag-amber" style="font-size:7.5px;">КУПИТЬ</span>')}
                </div>
            `;
        }).join('');

        const stickersHtml = stickers.map(st => {
            const isOwned = (window.state.player.ownedBizStickers || []).includes(st.id) || st.cost === 0;
            const isCurrent = b.ownerSticker === st.id;
            return `
                <div onclick="PhoneBusiness.selectOwnerSticker('${b.id}', '${st.id}')" class="p-2 mb-1 flex-between" style="background:${isCurrent ? 'rgba(0,242,254,0.1)' : '#050914'}; border:1.5px solid ${isCurrent ? 'var(--cyan)' : 'rgba(255,255,255,0.08)'}; border-radius:8px; cursor:pointer;">
                    <div class="flex-gap" style="align-items:center;">
                        <span style="font-size:18px;">${st.icon || '—'}</span>
                        <b class="text-xs" style="font-size:10px;">${st.name}</b>
                    </div>
                    ${isCurrent ? '<span class="tag-badge bg-tag-green" style="font-size:7.5px;">АКТИВНО</span>' : (isOwned ? '' : `<span class="tag-badge bg-tag-amber" style="font-size:7.5px;">${st.cost.toLocaleString()} ₽</span>`)}
                </div>
            `;
        }).join('');

        modal.innerHTML = `
            <div class="modal-box" style="max-width:420px;">
                <div class="flex-between mb-2">
                    <div class="modal-glow-badge" style="color:var(--cyan); border-color:var(--cyan);"><i class="fa-solid fa-pen mr-1"></i> КАСТОМИЗАЦИЯ</div>
                    <button onclick="ModalManager.close('modalBizCustomize')" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                <div class="mb-2">
                    <label class="sub-label block mb-1" style="font-size:9px;">Название объекта:</label>
                    <input type="text" id="bizCustomName" class="chat-input" maxlength="28" value="${b.customName || b.name}" style="font-size:12px; padding:8px; font-weight:800;">
                </div>

                <div class="mb-3">
                    <label class="sub-label block mb-1" style="font-size:9px;">Слоган (+5% трафика):</label>
                    <input type="text" id="bizCustomSlogan" class="chat-input" maxlength="42" value="${b.slogan || ''}" placeholder="«Чистота как в аптеке!»" style="font-size:11px; padding:8px;">
                </div>

                <div class="sub-label mb-1" style="font-size:9px;">🎨 Обложка:</div>
                <div style="max-height:150px; overflow-y:auto; margin-bottom:10px;">${skinsHtml}</div>

                <div class="sub-label mb-1" style="font-size:9px;">👑 Стикер:</div>
                <div style="max-height:120px; overflow-y:auto; margin-bottom:10px;">${stickersHtml}</div>

                <button onclick="PhoneBusiness.saveCustomization('${b.id}')" class="btn btn-green w-full font-bold">
                    ✓ Сохранить
                </button>
            </div>
        `;

        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalBizCustomize', { closeOthers: true });
        } else {
            modal.classList.add('active');
        }
        if (window.AudioFx) window.AudioFx.play('tick');
    },

    saveCustomization(bizId) {
        const b = window.state.businesses.find(x => x && x.id === bizId);
        if (!b) return;
        const nameEl = document.getElementById('bizCustomName');
        const sloganEl = document.getElementById('bizCustomSlogan');
        const newName = (nameEl?.value || '').trim().substring(0, 28);
        const newSlogan = (sloganEl?.value || '').trim().substring(0, 42);
        if (newName && newName.length >= 2) b.customName = newName;
        b.slogan = newSlogan;
        if (typeof saveState === 'function') saveState();
        if (window.AudioFx) window.AudioFx.play('win');
        if (window.AudioFx) window.AudioFx.haptic('success');
        if (typeof showToast === 'function') showToast('✓ Кастомизация сохранена');
        if (typeof ModalManager !== 'undefined') ModalManager.close('modalBizCustomize');
        this.render(document.getElementById('phoneAppContainer'));
    },

    selectCoverSkin(bizId, skinId) {
        const b = window.state.businesses.find(x => x && x.id === bizId);
        const skin = this._getCoverSkins().find(s => s.id === skinId);
        if (!b || !skin) return;
        if (!window.state.player.ownedBizSkins) window.state.player.ownedBizSkins = [];
        const isOwned = window.state.player.ownedBizSkins.includes(skinId) || skin.cost === 0;

        if (!isOwned) {
            if (window.MoneyManager) {
                const ok = window.MoneyManager.spend(skin.cost, `Скин бизнеса: ${skin.name}`);
                if (!ok) {
                    if (typeof showToast === 'function') showToast(`Нужно ${skin.cost.toLocaleString()} ₽!`);
                    return;
                }
            } else {
                if ((window.state.player.cash || 0) < skin.cost) {
                    if (typeof showToast === 'function') showToast(`Нужно ${skin.cost.toLocaleString()} ₽!`);
                    return;
                }
                window.state.player.cash -= skin.cost;
                if (typeof logBankTransaction === 'function') logBankTransaction(`Скин бизнеса: ${skin.name}`, skin.cost, false);
            }
            window.state.player.ownedBizSkins.push(skinId);
        }

        b.coverSkin = skinId;
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('win');
        if (typeof showToast === 'function') showToast(`🎨 Скин «${skin.name}» применён!`);
        this.openCustomizeModal(bizId);
    },

    selectOwnerSticker(bizId, stickerId) {
        const b = window.state.businesses.find(x => x && x.id === bizId);
        const sticker = this._getOwnerStickers().find(s => s.id === stickerId);
        if (!b || !sticker) return;
        if (!window.state.player.ownedBizStickers) window.state.player.ownedBizStickers = [];
        const isOwned = window.state.player.ownedBizStickers.includes(stickerId) || sticker.cost === 0;

        if (!isOwned) {
            if (window.MoneyManager) {
                const ok = window.MoneyManager.spend(sticker.cost, `Стикер: ${sticker.name}`);
                if (!ok) {
                    if (typeof showToast === 'function') showToast(`Нужно ${sticker.cost.toLocaleString()} ₽!`);
                    return;
                }
            } else {
                if ((window.state.player.cash || 0) < sticker.cost) {
                    if (typeof showToast === 'function') showToast(`Нужно ${sticker.cost.toLocaleString()} ₽!`);
                    return;
                }
                window.state.player.cash -= sticker.cost;
                if (typeof logBankTransaction === 'function') logBankTransaction(`Стикер: ${sticker.name}`, sticker.cost, false);
            }
            window.state.player.ownedBizStickers.push(stickerId);
        }

        b.ownerSticker = stickerId;
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('win');
        if (typeof showToast === 'function') showToast(`👑 Стикер «${sticker.name}» установлен!`);
        this.openCustomizeModal(bizId);
    },

    // --------------------------------------------------------
    // P2P ПРОДАЖА
    // --------------------------------------------------------
    openSellModal(bizId) {
        const b = window.state.businesses.find(x => x && x.id === bizId);
        if (!b || b.level <= 0) return;

        const dailyIncome = this.getBizIncomeWithBonuses(b);
        const annualIncome = dailyIncome * 365;
        const dnaMult = this.getDNAMultiplier(b.dna);
        const multiplier = 1.5 + (dnaMult - 0.5) * 1.0;
        const cosmeticsBonus = (b.coverSkin !== 'classic' ? 0.15 : 0) + (b.slogan ? 0.05 : 0) + (b.ownerSticker !== 'none' ? 0.10 : 0);
        const estimatedValue = Math.round(annualIncome * multiplier * (1 + cosmeticsBonus));
        const quickSaleValue = Math.round(estimatedValue * 0.65);

        let modal = document.getElementById('modalBizSell');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalBizSell';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-box" style="max-width:420px;">
                <div class="flex-between mb-2">
                    <div class="modal-glow-badge" style="color:var(--green); border-color:rgba(0,230,118,0.4);"><i class="fa-solid fa-handshake mr-1"></i> ПРОДАЖА БИЗНЕСА</div>
                    <button onclick="ModalManager.close('modalBizSell')" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                <div class="glass-card p-2 mb-3">
                    <b class="text-xs color-cyan">${b.customName || b.name}</b>
                    <div class="sub-label" style="font-size:9px;">Уровень ${b.level} • ${dailyIncome.toLocaleString()} ₽/день</div>
                </div>

                <div class="p-2 mb-3" style="background:#050914; border-radius:10px; border:1px solid rgba(0,230,118,0.3);">
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label">Годовой доход:</span>
                        <b class="color-cyan">${annualIncome.toLocaleString()} ₽</b>
                    </div>
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label">Множитель:</span>
                        <b class="color-cyan">×${multiplier.toFixed(2)}</b>
                    </div>
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label">Косметика:</span>
                        <b class="color-amber">+${Math.round(cosmeticsBonus * 100)}%</b>
                    </div>
                    <div class="flex-between text-base mt-2 pt-2" style="border-top:1px dashed rgba(255,255,255,0.1);">
                        <span class="font-bold">ОЦЕНКА P2P:</span>
                        <b class="color-green font-bold" style="font-size:15px;">${estimatedValue.toLocaleString()} ₽</b>
                    </div>
                </div>

                <button onclick="PhoneBusiness.sellToBot('${b.id}', ${quickSaleValue})" class="btn btn-amber w-full mb-2" style="font-size:11px;">
                    ⚡ Быстрая продажа боту (${quickSaleValue.toLocaleString()} ₽)
                </button>
                <button onclick="PhoneBusiness.listOnP2P('${b.id}', ${estimatedValue})" class="btn btn-green w-full mb-2" style="font-size:11px;">
                    ☁️ На P2P биржу (${estimatedValue.toLocaleString()} ₽)
                </button>
                <button onclick="ModalManager.close('modalBizSell')" class="btn btn-dark w-full">Отмена</button>
            </div>
        `;

        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalBizSell', { closeOthers: true });
        } else {
            modal.classList.add('active');
        }
        if (window.AudioFx) window.AudioFx.play('tick');
    },

    sellToBot(bizId, price) {
        const b = window.state.businesses.find(x => x && x.id === bizId);
        if (!b || b.level <= 0) return;
        if (!confirm(`Продать «${b.customName || b.name}» боту за ${price.toLocaleString()} ₽?`)) return;

        if (window.MoneyManager) {
            window.MoneyManager.earn(price, `Продажа бизнеса: ${b.customName || b.name}`);
        } else {
            window.state.player.cash = (window.state.player.cash || 0) + price;
            if (typeof logBankTransaction === 'function') logBankTransaction(`Продажа бизнеса: ${b.customName || b.name}`, price, true);
        }

        window.state.player.businessSalesCount = (window.state.player.businessSalesCount || 0) + 1;

        b.level = 0; b.stored = 0; b.stock = 100;
        b.incomeHistory = []; b.dna = null;
        b.customName = b.name; b.slogan = ''; b.coverSkin = 'classic'; b.ownerSticker = 'none';
        b.reputation = 0; b.activeBuffs = []; b.activeDebuffs = [];

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('win');
        if (window.AudioFx) window.AudioFx.haptic('success');
        if (typeof showToast === 'function') showToast(`💰 Продано боту: +${price.toLocaleString()} ₽`);

        if (window.EventBus) {
            window.EventBus.emit('business:sold', { bizId, price, buyer: 'bot' });
        }

        this.checkAchievements();
        if (typeof ModalManager !== 'undefined') ModalManager.close('modalBizSell');
        this.render(document.getElementById('phoneAppContainer'));
    },

    listOnP2P(bizId, price) {
        const b = window.state.businesses.find(x => x && x.id === bizId);
        if (!b || b.level <= 0) return;

        if (!window.state.p2pMarketListings) window.state.p2pMarketListings = [];

        const lot = {
            id: 'biz_lot_' + Date.now(),
            sellerId: String(window.state.player?.uid || 'me'),
            sellerName: window.state.player?.name || 'Перекуп',
            type: 'business',
            name: `${b.customName || b.name} (Ур. ${b.level})`,
            price: price,
            itemData: {
                bizId: b.id, level: b.level, dna: b.dna,
                customName: b.customName, slogan: b.slogan,
                coverSkin: b.coverSkin, ownerSticker: b.ownerSticker,
                reputation: b.reputation, income: b.income,
                perk: b.perk, desc: b.desc, img: b.img, fallback: b.fallback,
                dailyIncome: this.getBizIncomeWithBonuses(b), estimatedValue: price
            },
            createdAt: Date.now()
        };

        window.state.p2pMarketListings.push(lot);

        if (window.FB_Bridge?.MarketLots?.publishLot) {
            try {
                window.FB_Bridge.MarketLots.publishLot(lot, { id: window.state.player?.uid, name: window.state.player?.name });
            } catch (e) { console.warn('[Biz P2P] Ошибка:', e); }
        }

        b.level = 0; b.stored = 0; b.incomeHistory = []; b.dna = null;
        b.customName = b.name; b.slogan = ''; b.coverSkin = 'classic'; b.ownerSticker = 'none';
        b.reputation = 0; b.activeBuffs = []; b.activeDebuffs = [];

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('win');
        if (window.AudioFx) window.AudioFx.haptic('success');
        if (typeof showToast === 'function') showToast(`☁️ Лот на P2P за ${price.toLocaleString()} ₽!`);

        if (window.EventBus) {
            window.EventBus.emit('p2p:lot_published', { lotId: lot.id, price, itemType: 'business' });
        }

        if (typeof ModalManager !== 'undefined') ModalManager.close('modalBizSell');
        this.render(document.getElementById('phoneAppContainer'));
    },

    // --------------------------------------------------------
    // КРИЗИСЫ
    // --------------------------------------------------------
    rollCrisisEvent() {
        if (!Array.isArray(window.state?.businesses)) return null;
        const owned = window.state.businesses.filter(b => b && b.level > 0);
        if (owned.length === 0) return null;
        if (Math.random() > 0.35) return null;
        const biz = owned[Math.floor(Math.random() * owned.length)];
        const ev = this.CRISIS_EVENTS[Math.floor(Math.random() * this.CRISIS_EVENTS.length)];
        return { biz, ev };
    },

    handleCrisisEvent(bizId, eventId, action) {
        const b = window.state.businesses.find(x => x && x.id === bizId);
        const ev = this.CRISIS_EVENTS.find(e => e.id === eventId);
        if (!b || !ev) return;
        const curDay = window.state.player?.day || 1;

        if (action === 'bribe' && ev.bribeCost > 0) {
            if (window.MoneyManager) {
                const ok = window.MoneyManager.spend(ev.bribeCost, `Взятка: ${ev.name}`);
                if (!ok) {
                    if (typeof showToast === 'function') showToast(`Нужно ${ev.bribeCost.toLocaleString()} ₽!`);
                    return;
                }
            } else {
                if ((window.state.player.cash || 0) < ev.bribeCost) {
                    if (typeof showToast === 'function') showToast(`Нужно ${ev.bribeCost.toLocaleString()} ₽!`);
                    return;
                }
                window.state.player.cash -= ev.bribeCost;
                if (typeof logBankTransaction === 'function') logBankTransaction(`Взятка: ${ev.name}`, ev.bribeCost, false);
            }
            if (typeof showToast === 'function') showToast(`✅ Решено за ${ev.bribeCost.toLocaleString()} ₽`);
            this._trackBizChallenge('bribe', 1);
        } else if (action === 'accept') {
            if (ev.penalty === 'store_lost') {
                b.stored = 0;
                if (typeof showToast === 'function') showToast(`🔥 Касса «${b.customName || b.name}» сгорела!`);
            } else if (typeof ev.penalty === 'number' && ev.penalty > 0) {
                if (window.MoneyManager) {
                    window.MoneyManager.spend(ev.penalty, `Штраф: ${ev.name}`, { force: true });
                } else {
                    window.state.player.cash = Math.max(0, (window.state.player.cash || 0) - ev.penalty);
                    if (typeof logBankTransaction === 'function') logBankTransaction(`Штраф: ${ev.name}`, ev.penalty, false);
                }
                if (typeof showToast === 'function') showToast(`💸 Штраф ${ev.penalty.toLocaleString()} ₽!`);
            }
            if (ev.debuffPct > 0) {
                b.activeDebuffs.push({ id: ev.id, name: ev.name, pct: ev.debuffPct, expiresDay: curDay + (ev.debuffDays || 2) });
            }
            b.reputation = Math.max(0, (b.reputation || 0) - 5);
        } else if (action === 'accept_buff') {
            b.activeBuffs.push({ id: ev.id, name: ev.name, pct: ev.buffPct || 15, expiresDay: curDay + (ev.buffDays || 3) });
            b.reputation = Math.min(100, (b.reputation || 0) + 3);
            if (typeof showToast === 'function') showToast(`🎉 ${ev.name}!`);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('win');
        if (window.AudioFx) window.AudioFx.haptic('success');

        if (window.EventBus) {
            window.EventBus.emit('business:crisis', { bizId, eventId, action });
        }

        if (typeof ModalManager !== 'undefined') ModalManager.close('modalBizCrisis');
        this.render(document.getElementById('phoneAppContainer'));
    },

    openCrisisModal(bizId, eventId) {
        const b = window.state.businesses.find(x => x && x.id === bizId);
        const ev = this.CRISIS_EVENTS.find(e => e.id === eventId);
        if (!b || !ev) return;

        let modal = document.getElementById('modalBizCrisis');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalBizCrisis';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        const isBuff = !!ev.buffPct;
        modal.innerHTML = `
            <div class="modal-box text-center" style="max-width:400px; border-color:${isBuff ? 'var(--green)' : 'var(--red)'};">
                <div class="radar-spinner-ring mb-2" style="border-top-color:${isBuff ? 'var(--green)' : 'var(--red)'};">
                    <div class="radar-spinner-center" style="font-size:26px;">${ev.icon}</div>
                </div>
                <div class="modal-glow-badge mb-1" style="color:${isBuff ? 'var(--green)' : 'var(--red)'}; border-color:${isBuff ? 'var(--green)' : 'var(--red)'};">
                    ${isBuff ? 'СОБЫТИЕ' : 'КРИЗИС'}
                </div>
                <h3 class="font-bold mb-1 color-${isBuff ? 'green' : 'red'}" style="font-size:14px;">${ev.name}</h3>
                <div class="sub-label mb-3" style="font-size:10.5px;">${ev.desc}</div>
                <div class="p-2 mb-3" style="background:#050914; border-radius:8px;">
                    <b class="text-xs color-cyan">${b.customName || b.name}</b>
                </div>
                ${isBuff ? `
                    <button onclick="PhoneBusiness.handleCrisisEvent('${b.id}', '${ev.id}', 'accept_buff')" class="btn btn-green w-full">🎉 Отлично!</button>
                ` : `
                    ${ev.bribeCost > 0 ? `<button onclick="PhoneBusiness.handleCrisisEvent('${b.id}', '${ev.id}', 'bribe')" class="btn btn-green w-full mb-2">💸 Откупиться (${ev.bribeCost.toLocaleString()} ₽)</button>` : ''}
                    <button onclick="PhoneBusiness.handleCrisisEvent('${b.id}', '${ev.id}', 'accept')" class="btn btn-danger w-full mb-2">⚠️ Принять последствия</button>
                `}
            </div>
        `;
        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalBizCrisis', { closeOthers: true });
        } else {
            modal.classList.add('active');
        }
        if (window.AudioFx) window.AudioFx.play('tick');
    },

    // --------------------------------------------------------
    // РЕКЛАМА / ТИК / ДЕНЬ
    // --------------------------------------------------------
    orderAdCampaign() {
        const cost = 50000;
        const curDay = window.state.player?.day || 1;

        if (this._activeBonus && this._activeBonus.expiresDay >= curDay) {
            if (typeof showToast === 'function') showToast('Реклама уже крутится!');
            return;
        }

        if (window.MoneyManager) {
            const ok = window.MoneyManager.spend(cost, 'Рекламная кампания');
            if (!ok) {
                if (typeof showToast === 'function') showToast(`Нужно ${cost.toLocaleString()} ₽!`);
                return;
            }
        } else {
            if ((window.state.player.cash || 0) < cost) {
                if (typeof showToast === 'function') showToast(`Нужно ${cost.toLocaleString()} ₽!`);
                return;
            }
            window.state.player.cash -= cost;
            if (typeof logBankTransaction === 'function') logBankTransaction('Рекламная кампания', cost, false);
        }

        this._activeBonus = { type: 'ad_campaign', expiresDay: curDay + 3, bonusPct: 15 };
        window.state.player.businessAdBonus = this._activeBonus;

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('win');
        if (window.AudioFx) window.AudioFx.haptic('success');
        if (typeof showToast === 'function') showToast('📻 Реклама запущена! +15% на 3 дня');

        if (window.EventBus) {
            window.EventBus.emit('business:ad_campaign', { cost, expiresDay: curDay + 3 });
        }

        this.render(document.getElementById('phoneAppContainer'));
    },

    tickIncome() {
        if (!window.state || !Array.isArray(window.state.businesses)) return;
        this.ensureState();
        let anyIncome = false;

        try {
            window.state.businesses.forEach(b => {
                if (!b || b.level <= 0) return;
                if (b.stock > 0) b.stock = Math.max(0, b.stock - 0.15);
                else if ((window.state.businessStaff?.manager || 0) > 0 && Math.random() < 0.1) b.stock = Math.min(b.maxStock, b.stock + 5);
                const bizIncome = this.getBizIncome(b);
                b.stored = (b.stored || 0) + (bizIncome / 24 / 3600) * 30;
                anyIncome = true;
            });
            if (anyIncome && Math.random() < 0.15) {
                if (typeof updateHeaderUI === 'function') updateHeaderUI();
                if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.renderBusinessWidget === 'function') {
                    PhoneManager.renderBusinessWidget();
                }
            }
        } catch (e) {
            console.warn('[PhoneBusiness] tick error:', e);
        }
    },

    onNewDay() {
        if (!window.state || !window.state.player) return;
        const curDay = window.state.player.day || 1;

        if (!Array.isArray(window.state.businesses)) return;

        this._syncActiveBonus();

        // ⭐ v5.0.0: обновляем экономический цикл
        this._tickEconomicCycle();

        // ⭐ v5.0.0: обновляем челленджи
        if (!Array.isArray(window.state.player.dailyBizChallenges) ||
            window.state.player.dailyBizChallenges.every(c => c.done)) {
            this._generateDailyBizChallenges();
        }

        window.state.businesses.forEach(b => {
            if (!b || b.level <= 0) return;
            const dayIncome = Math.round(this.getBizIncome(b));
            if (!Array.isArray(b.incomeHistory)) b.incomeHistory = [];
            b.incomeHistory.push(dayIncome);
            if (b.incomeHistory.length > 7) b.incomeHistory = b.incomeHistory.slice(-7);
            b.lastIncomeDay = curDay;
            b.stock = Math.max(0, (b.stock || 0) - 25);
        });

        if ((window.state.businessStaff?.manager || 0) > 0) {
            let autoCollected = 0;
            window.state.businesses.forEach(b => {
                if (b && b.level > 0 && b.stored > 0) {
                    autoCollected += Math.floor(b.stored);
                    b.stored = 0;
                }
            });
            if (autoCollected > 0) {
                if (window.MoneyManager) {
                    window.MoneyManager.earn(autoCollected, 'Автосбор кассы (Управляющий)');
                } else {
                    window.state.player.cash = (window.state.player.cash || 0) + autoCollected;
                    if (typeof logBankTransaction === 'function') logBankTransaction('Автосбор кассы (Управляющий)', autoCollected, true);
                }
                if (typeof showToast === 'function') showToast(`🤖 Управляющий собрал: +${autoCollected.toLocaleString()} ₽`);
            }
        }

        const crisis = this.rollCrisisEvent();
        if (crisis) {
            setTimeout(() => {
                this.openCrisisModal(crisis.biz.id, crisis.ev.id);
            }, 1000);
        }

        // ⭐ v5.0.0: умное уведомление о кассе
        const totalStored = this.getAccumulatedCash();
        if (totalStored >= 500000 && (window.state.businessStaff?.manager || 0) === 0) {
            setTimeout(() => {
                if (typeof showToast === 'function') {
                    showToast(`💰 В кассах накопилось ${totalStored.toLocaleString()} ₽ — наймите Управляющего!`);
                }
            }, 2500);
        }

        this.checkAchievements();

        if (window.EventBus) {
            window.EventBus.emit('business:new_day', { day: curDay });
        }

        if (typeof saveState === 'function') saveState();
    },

    startTickLoop() {
        if (this._tickInterval) return;
        this._tickInterval = setInterval(() => this.tickIncome(), 30000);
    }
};

window.PhoneBusiness = PhoneBusiness;
window.AppBusiness = PhoneBusiness;

window.BUSINESS_COVER_SKINS = PhoneBusiness._fallbackCoverSkins;
window.BUSINESS_VIP_STICKERS = PhoneBusiness._fallbackStickers;

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => PhoneBusiness.startTickLoop(), 3000);
    });
}

console.log('[💼 phone-business v5.0.0] ПРОКАЧКА: циклы, челленджи, оффлайн-бонус, milestones, разнообразие ✓');
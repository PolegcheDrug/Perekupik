// ========================================================
// js/phone-business.js — БИЗНЕС-ИМПЕРИЯ ПЕРЕКУПА 3.2
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// Стикеры дохода, анимированные названия, темы и Live Preview
// ========================================================

const DEFAULT_BUSINESS_CATALOG = [
    { id: 'wash', name: 'Автомойка «Блеск»', cost: 180000, reqStars: 0, minLevel: 1, income: 12000, perk: 'Скидка 50% на полировку и химчистку', desc: 'Круглосуточный комплекс бесконтактной мойки и сушки кузова.' },
    { id: 'shina', name: 'Шиномонтаж «Вираж»', cost: 320000, reqStars: 2, minLevel: 3, income: 22000, perk: 'Сезонный ажиотаж весной и осенью', desc: 'Пункт правки дисков, дошиповки и сезонного переобувания.' },
    { id: 'sto', name: 'Автосервис «Гараж-Мастер»', cost: 650000, reqStars: 5, minLevel: 6, income: 45000, perk: 'Скидка на ремонт собственных авто -20%', desc: 'Три подъёмника, компьютерная диагностика и слесарный цех.' },
    { id: 'detailing', name: 'Детейлинг «Ceramic Pro»', cost: 1200000, reqStars: 8, minLevel: 10, income: 85000, perk: 'Повышает ликвидность машин в гараже', desc: 'Полировка кузова, керамические составы и оклейка плёнкой.' },
    { id: 'chip_tuning', name: 'Тюнинг-Ателье «Stage 3»', cost: 2400000, reqStars: 15, minLevel: 15, income: 170000, perk: 'Доступ к кастомным прошивкам ЭБУ', desc: 'Настройка моторов на диностенде и прямоточный выхлоп.' },
    { id: 'razborka', name: 'Авторазборка «Последний Путь»', cost: 4500000, reqStars: 20, minLevel: 20, income: 320000, perk: 'Выкуп битых авто под распил', desc: 'Склад контрактных моторов, кузовных панелей и запчастей.' }
];

// Каталог скинов обложек (10 видов)
if (typeof window.BUSINESS_COVER_SKINS === 'undefined') {
    window.BUSINESS_COVER_SKINS = [
        { id: 'classic', name: 'Гаражная классика', cost: 0, bonusIncPct: 0, icon: 'fa-warehouse', color: '#64748b' },
        { id: 'neon_tokyo', name: 'Tokyo Neon Club', cost: 120000, bonusIncPct: 5, icon: 'fa-city', color: '#00f2fe' },
        { id: 'gold_syndicate', name: 'Syndicate Gold', cost: 350000, bonusIncPct: 12, icon: 'fa-crown', color: '#ffd700' },
        { id: 'carbon_stealth', name: 'Carbon Stealth', cost: 220000, bonusIncPct: 8, icon: 'fa-shield-halved', color: '#334155' },
        { id: 'cyber_terminal', name: 'Cyber Terminal', cost: 280000, bonusIncPct: 10, icon: 'fa-terminal', color: '#00e676' },
        { id: 'vintage_retro', name: 'Retro 80s Garage', cost: 150000, bonusIncPct: 6, icon: 'fa-record-vinyl', color: '#f43f5e' },
        { id: 'elite_marble', name: 'Elite Showroom', cost: 600000, bonusIncPct: 18, icon: 'fa-gem', color: '#c084fc' },
        { id: 'industrial_rust', name: 'Heavy Duty', cost: 180000, bonusIncPct: 7, icon: 'fa-industry', color: '#f59e0b' },
        { id: 'drift_king', name: 'Drift Station', cost: 310000, bonusIncPct: 11, icon: 'fa-flag-checkered', color: '#ff3366' },
        { id: 'federal_hub', name: 'Logistics Hub', cost: 950000, bonusIncPct: 25, icon: 'fa-globe', color: '#38bdf8' }
    ];
}

// Каталог анимаций карточки
if (typeof window.BUSINESS_CARD_ANIMATIONS === 'undefined') {
    window.BUSINESS_CARD_ANIMATIONS = [
        { id: 'none', name: 'Стандарт', cost: 0, className: '' },
        { id: 'neon_pulse', name: '⚡ Неон-Пульс', cost: 85000, className: 'biz-anim-neon-pulse' },
        { id: 'gold_shimmer', name: '👑 Золото', cost: 200000, className: 'biz-anim-gold-shimmer' },
        { id: 'matrix_glitch', name: '💻 Матрица', cost: 160000, className: 'biz-anim-matrix-glitch' },
        { id: 'plasma_storm', name: '🔥 Плазма', cost: 300000, className: 'biz-anim-plasma-storm' }
    ];
}

// Эксклюзивные стикеры возле суммы ежедневного дохода
if (typeof window.BUSINESS_VIP_STICKERS === 'undefined') {
    window.BUSINESS_VIP_STICKERS = [
        { id: 'none', icon: '', label: 'Без стикера', cost: 0, cssClass: '' },
        { id: 'crown', icon: '👑', label: 'Корона Олигарха', cost: 250000, cssClass: 'sticker-crown' },
        { id: 'diamond', icon: '💎', label: 'Алмазный Статус', cost: 450000, cssClass: 'sticker-diamond' },
        { id: 'fire', icon: '🔥', label: 'Огненная Прибыль', cost: 180000, cssClass: 'sticker-fire' },
        { id: 'rocket', icon: '🚀', label: 'Ракета P2P', cost: 320000, cssClass: 'sticker-rocket' },
        { id: 'moneybag', icon: '💰', label: 'Мешок Рублей', cost: 140000, cssClass: 'sticker-moneybag' },
        { id: 'shield', icon: '🛡️', label: 'Крыша Синдиката', cost: 500000, cssClass: 'sticker-crown' }
    ];
}

// Эффекты и цвет текста названия бизнеса
if (typeof window.BUSINESS_TITLE_STYLES === 'undefined') {
    window.BUSINESS_TITLE_STYLES = [
        { id: 'default', name: 'Белый классический', className: '', cost: 0 },
        { id: 'cyan_glow', name: 'Неоновый Циан', className: 'biz-title-glow-cyan', cost: 75000 },
        { id: 'gold_glow', name: 'Имперское Золото', className: 'biz-title-glow-gold', cost: 140000 },
        { id: 'neon_lime', name: 'Кислотный Лайм', className: 'biz-title-glow-neon', cost: 90000 },
        { id: 'ruby_red', name: 'Дрифт-Рубин', className: 'biz-title-glow-ruby', cost: 95000 },
        { id: 'purple_neon', name: 'Теневой Пурпур', className: 'biz-title-glow-purple', cost: 110000 },
        { id: 'fire_run', name: '🔥 Огненный Градиент', className: 'biz-title-anim-fire', cost: 260000 },
        { id: 'rainbow_wave', name: '🌈 Радужная Волна', className: 'biz-title-anim-rainbow', cost: 320000 },
        { id: 'cyber_glitch', name: '💻 Кибер-Глитч', className: 'biz-title-anim-glitch', cost: 210000 }
    ];
}

if (typeof window.FORBIDDEN_WORDS_LIST === 'undefined') {
    window.FORBIDDEN_WORDS_LIST = [
        'хуй', 'пизд', 'еб', 'сук', 'бля', 'мраз', 'чмо', 'админ', 'модер', 
        'support', 'admin', 'moderator', 'gay', 'fag', 'nigga', 'nigger', 'порно', 'casino', 'клубника'
    ];
}

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
        { id: "van_parts", name: "Фургон «Ford Transit»", cost: 450000, reqStars: 3, incomeBonusPct: 8, stockCapacityBonus: 40, suitableBusinesses: ["shina", "sto", "razborka", "chip_tuning"], desc: "Оперативная доставка деталей." },
        { id: "mobile_wash", name: "Мобильная мойка «Газель»", cost: 620000, reqStars: 5, incomeBonusPct: 15, stockCapacityBonus: 15, suitableBusinesses: ["wash", "detailing"], desc: "Выездная мойка и химчистка." }
    ];
}

const AppBusiness = {
    activeSubTab: 'list',
    selectedBizIndex: 0,
    customizerActiveTab: 'skins', // 'skins' | 'anims' | 'stickers' | 'title_fx'

    render: function(container) {
        if (!container) return;

        var sourceList = (typeof BUSINESS_DATA !== 'undefined' && Array.isArray(BUSINESS_DATA)) 
            ? BUSINESS_DATA 
            : DEFAULT_BUSINESS_CATALOG;

        if (!state.businesses || !Array.isArray(state.businesses) || state.businesses.length === 0) {
            state.businesses = JSON.parse(JSON.stringify(sourceList));
        } else {
            sourceList.forEach(function(baseBiz) {
                var found = state.businesses.some(function(b) { return b.id === baseBiz.id; });
                if (!found) state.businesses.push(JSON.parse(JSON.stringify(baseBiz)));
            });
        }

        this.sanitizeBusinessData();

        var sub = this.activeSubTab;
        var totalIncome = 0;
        var totalStored = 0;
        var ownedCount = 0;

        for (var i = 0; i < state.businesses.length; i++) {
            var b = state.businesses[i];
            if (b && (b.level || 0) > 0) {
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
                '<div class="flex-between">' +
                    '<div>' +
                        '<span class="sub-label" style="font-size:8.5px;">Пассивный доход сети:</span>' +
                        '<div class="price-val color-green" style="font-size:15px;">+' + totalIncome.toLocaleString() + ' ₽/день</div>' +
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
            if (b.level === undefined) b.level = 0;
            if (!b.customName) b.customName = b.name;
            if (!b.coverSkin) b.coverSkin = 'classic';
            if (!b.cardAnimation) b.cardAnimation = 'none';
            if (!b.vipSticker) b.vipSticker = 'none';
            if (!b.titleStyle) b.titleStyle = 'default';
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
        if (!biz || (biz.level || 0) <= 0) return 0;
        var base = (biz.income || 1000) * biz.level;
        var bonusMul = this.calculateBusinessMultiplier(biz);
        return Math.round(base * bonusMul);
    },

    calculateBusinessMultiplier: function(biz) {
        if (!biz) return 1.0;
        var bonusMul = 1.0;

        if (biz.coverSkin && typeof BUSINESS_COVER_SKINS !== 'undefined') {
            var skin = BUSINESS_COVER_SKINS.find(function(s) { return s.id === biz.coverSkin; });
            if (skin && skin.bonusIncPct) bonusMul += (skin.bonusIncPct / 100);
        }

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

    validateCustomName: function(nameStr) {
        if (!nameStr || typeof nameStr !== 'string') return "Предприятие";
        var clean = nameStr.trim();
        if (clean.length < 2) return "Предприятие";
        if (clean.length > 28) clean = clean.substring(0, 28);

        var lower = clean.toLowerCase();
        var forbidden = window.FORBIDDEN_WORDS_LIST || [];
        for (var i = 0; i < forbidden.length; i++) {
            if (lower.indexOf(forbidden[i]) !== -1) return "Заблокировано цензурой";
        }
        return clean;
    },

    renderBusinessesListHtml: function() {
        var lvl = state.player ? (state.player.level || 1) : 1;
        var html = "";

        var defaultIcons = {
            wash: 'fa-soap', shina: 'fa-compact-disc', sto: 'fa-screwdriver-wrench',
            tow_truck: 'fa-truck-pickup', detailing: 'fa-spray-can-sparkles',
            chip_tuning: 'fa-microchip', razborka: 'fa-car-burst'
        };

        var fallbackMap = {
            wash: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80',
            shina: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80',
            sto: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80',
            detailing: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=600&q=80',
            chip_tuning: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80',
            razborka: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=600&q=80'
        };

        for (var idx = 0; idx < state.businesses.length; idx++) {
            var biz = state.businesses[idx];
            if (!biz) continue;

            var isLocked = lvl < (biz.minLevel || 1);
            var isOwned = (biz.level || 0) > 0;
            var cost = isOwned ? Math.round(biz.cost * (biz.level + 1)) : biz.cost;
            var calculatedIncome = isOwned ? this.calculateBusinessIncome(biz) : (biz.income || 1000);
            var maxStk = biz.maxStock || 100;
            var curStk = biz.stock !== undefined ? biz.stock : 100;
            var curStored = biz.stored || 0;

            var stockPct = Math.min(100, Math.round((curStk / maxStk) * 100));
            var stockColor = stockPct > 40 ? 'var(--green)' : (stockPct > 15 ? 'var(--amber)' : 'var(--red)');

            var safeCapacity = Math.max(50000, calculatedIncome * 3);
            var cashFillPct = Math.min(100, Math.round((curStored / safeCapacity) * 100));

            var multiplier = this.calculateBusinessMultiplier(biz);
            var bonusPctText = Math.round((multiplier - 1) * 100);

            var rawImg = biz.img || ('assets/business/' + biz.id + '.jpg');
            var bizImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
            var fallbackImg = biz.fallback || fallbackMap[biz.id] || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80';

            var iconClass = defaultIcons[biz.id] || 'fa-briefcase';
            var displayName = isOwned ? (biz.customName || biz.name) : biz.name;

            // Класс анимации карточки
            var animClass = "";
            if (isOwned && biz.cardAnimation && typeof BUSINESS_CARD_ANIMATIONS !== 'undefined') {
                var aObj = BUSINESS_CARD_ANIMATIONS.find(function(a) { return a.id === biz.cardAnimation; });
                if (aObj) animClass = aObj.className;
            }

            // Стикер возле суммы дохода
            var stickerHtml = "";
            if (isOwned && biz.vipSticker && typeof BUSINESS_VIP_STICKERS !== 'undefined') {
                var stObj = BUSINESS_VIP_STICKERS.find(function(s) { return s.id === biz.vipSticker; });
                if (stObj && stObj.icon) {
                    stickerHtml = '<span class="biz-vip-sticker ' + stObj.cssClass + '" title="' + stObj.label + '">' + stObj.icon + '</span>';
                }
            }

            // Оформление текста названия
            var titleFxClass = "";
            if (isOwned && biz.titleStyle && typeof BUSINESS_TITLE_STYLES !== 'undefined') {
                var tObj = BUSINESS_TITLE_STYLES.find(function(t) { return t.id === biz.titleStyle; });
                if (tObj) titleFxClass = tObj.className;
            }

            var actionBlock = "";
            if (isLocked) {
                actionBlock = '<button class="btn btn-dark btn-sm w-full opacity-50" disabled>🔒 Откроется с ' + biz.minLevel + ' уровня</button>';
            } else if (!isOwned) {
                actionBlock = 
                    '<button onclick="AppBusiness.buyNewBusinessAction(' + idx + ')" class="btn btn-cyan btn-sm w-full font-bold">' +
                        'Купить объект (' + (cost / 1000).toFixed(0) + 'k ₽' + (biz.reqStars ? ' + ' + biz.reqStars + ' ⭐' : '') + ')' +
                    '</button>';
            } else {
                actionBlock = 
                    '<div class="biz-actions-panel">' +
                        '<button onclick="AppBusiness.collectCashSingle(' + idx + ')" class="btn btn-green btn-sm w-full font-bold"' + (curStored <= 0 ? ' disabled' : '') + '>' +
                            '<i class="fa-solid fa-vault mr-1"></i> Снять кассу (' + curStored.toLocaleString() + ' ₽)' +
                        '</button>' +
                        '<div class="biz-quick-actions-row">' +
                            '<button onclick="AppBusiness.restockSingle(' + idx + ')" class="btn btn-amber btn-sm" style="font-size:9.5px; padding:6px 2px;"' + (curStk >= maxStk ? ' disabled' : '') + '>' +
                                '📦 Сырьё (15k)' +
                            '</button>' +
                            '<button onclick="AppBusiness.upgradeLevelSingle(' + idx + ')" class="btn btn-cyan btn-sm" style="font-size:9.5px; padding:6px 2px;">' +
                                '⬆️ Ур. ' + (biz.level + 1) + ' (' + (cost / 1000).toFixed(0) + 'k)' +
                            '</button>' +
                            '<button onclick="AppBusiness.openCustomizationModal(' + idx + ')" class="btn btn-purple btn-sm" style="font-size:9.5px; padding:6px 2px;">' +
                                '🎨 Бренд' +
                            '</button>' +
                        '</div>' +
                    '</div>';
            }

            html += 
                '<div class="glass-card mb-2 p-2 biz-card-compact ' + animClass + '">' +
                    '<div class="car-img-wrap mb-1" style="height:115px; position:relative; cursor:pointer;" onclick="AppBusiness.selectBusinessForDetail(' + idx + ')" title="Открыть цех">' +
                        '<img src="' + bizImg + '" class="car-img" onerror="this.onerror=null; this.src=\'' + fallbackImg + '\';">' +
                        '<div class="biz-cover-badge">' +
                            '<div class="biz-brand-pill">' +
                                '<i class="fa-solid ' + iconClass + ' color-green"></i>' +
                                '<span class="biz-brand-name ' + titleFxClass + '">' + displayName + '</span>' +
                            '</div>' +
                            '<span class="tag-badge ' + (isOwned ? 'bg-tag-green' : 'bg-tag-amber') + '">' +
                                (isOwned ? 'Ур. ' + biz.level : 'СВОБОДЕН') +
                            '</span>' +
                        '</div>' +
                    '</div>' +

                    '<div class="flex-between mb-1">' +
                        '<span class="sub-label" style="font-size:8.5px; line-height:1.2; max-width:65%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + (biz.perk || biz.desc) + '</span>' +
                        '<div class="biz-income-badge-wrap">' +
                            stickerHtml +
                            '<span class="tag-badge bg-tag-green font-bold">+' + calculatedIncome.toLocaleString() + ' ₽/д</span>' +
                        '</div>' +
                    '</div>' +

                    (isOwned ? (
                        '<div class="biz-telemetry-trio">' +
                            '<div class="biz-telemetry-cell">' +
                                '<div class="biz-telemetry-title"><i class="fa-solid fa-bolt color-green"></i> Доход:</div>' +
                                '<div class="biz-telemetry-val color-green">+' + (bonusPctText > 0 ? bonusPctText + '%' : '0%') + '</div>' +
                                '<div class="biz-micro-bar"><div class="biz-micro-bar-fill" style="width:100%; background:var(--green);"></div></div>' +
                            '</div>' +

                            '<div class="biz-telemetry-cell">' +
                                '<div class="biz-telemetry-title"><i class="fa-solid fa-vault color-cyan"></i> Касса:</div>' +
                                '<div class="biz-telemetry-val color-cyan">' + (curStored / 1000).toFixed(1) + 'k ₽</div>' +
                                '<div class="biz-micro-bar"><div class="biz-micro-bar-fill" style="width:' + cashFillPct + '%; background:var(--cyan);"></div></div>' +
                            '</div>' +

                            '<div class="biz-telemetry-cell">' +
                                '<div class="biz-telemetry-title"><i class="fa-solid fa-boxes-stacked" style="color:' + stockColor + ';"></i> Склад:</div>' +
                                '<div class="biz-telemetry-val" style="color:' + stockColor + ';">' + curStk + '%</div>' +
                                '<div class="biz-micro-bar"><div class="biz-micro-bar-fill" style="width:' + stockPct + '%; background:' + stockColor + ';"></div></div>' +
                            '</div>' +
                        '</div>'
                    ) : '') +

                    actionBlock +
                '</div>';
        }

        return html;
    },

    openCustomizationModal: function(idx) {
        var biz = state.businesses[idx];
        if (!biz || (biz.level || 0) <= 0) return;
        this.selectedBizIndex = idx;

        var modal = document.getElementById('modalBusinessCustomize');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalBusinessCustomize';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        this.renderCustomizerModalContent();
        ModalManager.open('modalBusinessCustomize');
        if (typeof playSound === 'function') playSound('tick');
    },

    switchCustomizerTab: function(tab) {
        this.customizerActiveTab = tab;
        this.renderCustomizerModalContent();
        if (typeof playSound === 'function') playSound('tick');
    },

    renderCustomizerModalContent: function() {
        var modal = document.getElementById('modalBusinessCustomize');
        if (!modal) return;
        var idx = this.selectedBizIndex;
        var biz = state.businesses[idx];
        if (!biz) return;

        var activeSkin = BUSINESS_COVER_SKINS.find(function(s) { return s.id === (biz.coverSkin || 'classic'); }) || BUSINESS_COVER_SKINS[0];
        var activeAnim = BUSINESS_CARD_ANIMATIONS.find(function(a) { return a.id === (biz.cardAnimation || 'none'); }) || BUSINESS_CARD_ANIMATIONS[0];
        var activeSticker = BUSINESS_VIP_STICKERS.find(function(s) { return s.id === (biz.vipSticker || 'none'); }) || BUSINESS_VIP_STICKERS[0];
        var activeTitleStyle = BUSINESS_TITLE_STYLES.find(function(t) { return t.id === (biz.titleStyle || 'default'); }) || BUSINESS_TITLE_STYLES[0];
        var calcInc = this.calculateBusinessIncome(biz);

        // Навигация по табам в 4 кнопки
        var tabsHtml = 
            '<div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 3px;">' +
                '<button onclick="AppBusiness.switchCustomizerTab(\'skins\')" class="btn ' + (this.customizerActiveTab === 'skins' ? 'btn-cyan' : 'btn-dark') + ' btn-sm" style="font-size:8.5px; padding:6px 2px;">🎨 Скины</button>' +
                '<button onclick="AppBusiness.switchCustomizerTab(\'anims\')" class="btn ' + (this.customizerActiveTab === 'anims' ? 'btn-purple' : 'btn-dark') + ' btn-sm" style="font-size:8.5px; padding:6px 2px;">✨ Аура</button>' +
                '<button onclick="AppBusiness.switchCustomizerTab(\'stickers\')" class="btn ' + (this.customizerActiveTab === 'stickers' ? 'btn-amber' : 'btn-dark') + ' btn-sm" style="font-size:8.5px; padding:6px 2px;">💎 Стикер</button>' +
                '<button onclick="AppBusiness.switchCustomizerTab(\'title_fx\')" class="btn ' + (this.customizerActiveTab === 'title_fx' ? 'btn-green' : 'btn-dark') + ' btn-sm" style="font-size:8.5px; padding:6px 2px;">🔤 Текст</button>' +
            '</div>';

        var tabBodyHtml = '';

        if (this.customizerActiveTab === 'skins') {
            var gridTiles = '';
            BUSINESS_COVER_SKINS.forEach(function(skin) {
                var isSel = biz.coverSkin === skin.id;
                var isBought = (skin.cost === 0) || (biz.ownedSkins && biz.ownedSkins.includes(skin.id));
                var priceText = isBought ? 'Куплено' : (skin.cost / 1000).toFixed(0) + 'k ₽';

                gridTiles += 
                    '<div onclick="AppBusiness.selectSkinAction(' + idx + ', \'' + skin.id + '\')" class="biz-skin-tile ' + (isSel ? 'selected' : '') + '" style="border-color:' + (isSel ? 'var(--cyan)' : skin.color) + ';">' +
                        '<div class="flex-between">' +
                            '<i class="fa-solid ' + skin.icon + '" style="color:' + skin.color + '; font-size:14px;"></i>' +
                            '<span class="tag-badge bg-tag-green" style="font-size:7.5px;">+' + skin.bonusIncPct + '%</span>' +
                        '</div>' +
                        '<b class="text-xs" style="font-size:10px; line-height:1.15; color:#fff;">' + skin.name + '</b>' +
                        '<span class="tag-badge ' + (isSel ? 'bg-tag-green' : (isBought ? 'bg-tag-dark' : 'bg-tag-cyan')) + '" style="font-size:8px; align-self:flex-start;">' + (isSel ? 'ВЫБРАНО ✓' : priceText) + '</span>' +
                    '</div>';
            });
            tabBodyHtml = '<div class="biz-skins-grid mb-2">' + gridTiles + '</div>';

        } else if (this.customizerActiveTab === 'anims') {
            var animTiles = '';
            BUSINESS_CARD_ANIMATIONS.forEach(function(anim) {
                var isSel = biz.cardAnimation === anim.id;
                var isBought = (anim.cost === 0) || (biz.ownedAnims && biz.ownedAnims.includes(anim.id));
                var priceText = isBought ? 'Куплено' : (anim.cost / 1000).toFixed(0) + 'k ₽';

                animTiles += 
                    '<div onclick="AppBusiness.selectAnimAction(' + idx + ', \'' + anim.id + '\')" class="glass-card p-2 mb-1 flex-between cursor-pointer ' + (isSel ? 'personal-car-card' : '') + '">' +
                        '<b class="text-xs color-purple">' + anim.name + '</b>' +
                        '<span class="tag-badge ' + (isSel ? 'bg-tag-green' : (isBought ? 'bg-tag-dark' : 'bg-tag-purple')) + '">' + (isSel ? 'АКТИВНО ✓' : priceText) + '</span>' +
                    '</div>';
            });
            tabBodyHtml = '<div class="space-y-1 mb-2" style="max-height:260px; overflow-y:auto;">' + animTiles + '</div>';

        } else if (this.customizerActiveTab === 'stickers') {
            var stickerTiles = '';
            BUSINESS_VIP_STICKERS.forEach(function(st) {
                var isSel = (biz.vipSticker || 'none') === st.id;
                var isBought = (st.cost === 0) || (biz.ownedStickers && biz.ownedStickers.includes(st.id));
                var priceText = isBought ? 'Куплено' : (st.cost / 1000).toFixed(0) + 'k ₽';

                stickerTiles += 
                    '<div onclick="AppBusiness.selectStickerAction(' + idx + ', \'' + st.id + '\')" class="glass-card p-2 mb-1 flex-between cursor-pointer ' + (isSel ? 'personal-car-card' : '') + '">' +
                        '<div class="flex-gap" style="align-items:center;">' +
                            '<span style="font-size:18px;">' + (st.icon || '🚫') + '</span>' +
                            '<div><b class="text-xs">' + st.label + '</b><div class="sub-label" style="font-size:8px;">Отображается рядом с доходом</div></div>' +
                        '</div>' +
                        '<span class="tag-badge ' + (isSel ? 'bg-tag-green' : (isBought ? 'bg-tag-dark' : 'bg-tag-amber')) + '">' + (isSel ? 'ВЫБРАН ✓' : priceText) + '</span>' +
                    '</div>';
            });
            tabBodyHtml = '<div class="space-y-1 mb-2" style="max-height:260px; overflow-y:auto;">' + stickerTiles + '</div>';

        } else if (this.customizerActiveTab === 'title_fx') {
            var titleTiles = '';
            BUSINESS_TITLE_STYLES.forEach(function(tf) {
                var isSel = (biz.titleStyle || 'default') === tf.id;
                var isBought = (tf.cost === 0) || (biz.ownedTitleStyles && biz.ownedTitleStyles.includes(tf.id));
                var priceText = isBought ? 'Куплено' : (tf.cost / 1000).toFixed(0) + 'k ₽';

                titleTiles += 
                    '<div onclick="AppBusiness.selectTitleStyleAction(' + idx + ', \'' + tf.id + '\')" class="glass-card p-2 mb-1 flex-between cursor-pointer ' + (isSel ? 'personal-car-card' : '') + '">' +
                        '<b class="text-xs ' + tf.className + '">' + tf.name + '</b>' +
                        '<span class="tag-badge ' + (isSel ? 'bg-tag-green' : (isBought ? 'bg-tag-dark' : 'bg-tag-green')) + '">' + (isSel ? 'АКТИВЕН ✓' : priceText) + '</span>' +
                    '</div>';
            });
            tabBodyHtml = '<div class="space-y-1 mb-2" style="max-height:260px; overflow-y:auto;">' + titleTiles + '</div>';
        }

        modal.innerHTML = 
            '<div class="modal-box" style="max-width:420px; max-height:88vh; overflow-y:auto;">' +
                '<div class="flex-between mb-2">' +
                    '<div class="modal-glow-badge"><i class="fa-solid fa-paintbrush"></i> СТИЛЬ И БРЕНД ПРЕДПРИЯТИЯ</div>' +
                    '<button onclick="ModalManager.close(\'modalBusinessCustomize\')" class="btn btn-dark btn-auto btn-sm">✕</button>' +
                '</div>' +

                '<!-- LIVE PREVIEW -->' +
                '<div class="biz-live-preview-box ' + activeAnim.className + '">' +
                    '<div class="flex-between mb-1">' +
                        '<div class="flex-gap" style="align-items:center;">' +
                            '<i class="fa-solid ' + activeSkin.icon + '" style="color:' + activeSkin.color + ';"></i>' +
                            '<b class="text-xs ' + activeTitleStyle.className + '" id="previewBizTitle">' + (biz.customName || biz.name) + '</b>' +
                        '</div>' +
                        '<div class="biz-income-badge-wrap">' +
                            (activeSticker.icon ? '<span class="biz-vip-sticker ' + activeSticker.cssClass + '">' + activeSticker.icon + '</span>' : '') +
                            '<span class="tag-badge bg-tag-green">+' + calcInc.toLocaleString() + ' ₽/д</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="sub-label" style="font-size:8px;">Стиль: <b>' + activeSkin.name + '</b> | Эффект: <b>' + activeAnim.name + '</b></div>' +
                '</div>' +

                '<!-- НАЗВАНИЕ -->' +
                '<div class="mb-2">' +
                    '<label class="sub-label mb-1 block" style="font-size:9px;">Название бизнеса (действует цензура):</label>' +
                    '<div class="flex-gap">' +
                        '<input type="text" id="inputBizCustomName" value="' + (biz.customName || biz.name) + '" class="glass-input flex-1" placeholder="Введите бренд..." style="padding:6px 8px; font-size:11px;" oninput="document.getElementById(\'previewBizTitle\').innerText = this.value || \'Предприятие\';">' +
                        '<button onclick="AppBusiness.saveCustomNameAction(' + idx + ')" class="btn btn-green btn-auto btn-sm font-bold" style="padding:6px 10px;">OK ✓</button>' +
                    '</div>' +
                '</div>' +

                tabsHtml +
                tabBodyHtml +

                '<button onclick="ModalManager.close(\'modalBusinessCustomize\')" class="btn btn-cyan w-full font-bold">Применить и закрыть ✓</button>' +
            '</div>';
    },

    saveCustomNameAction: function(idx) {
        var input = document.getElementById('inputBizCustomName');
        if (!input) return;
        var biz = state.businesses[idx];
        if (!biz) return;

        var validated = this.validateCustomName(input.value);
        if (validated === "Заблокировано цензурой") {
            showToast("🚫 Название отклонено: обнаружены запрещённые слова!");
            if (typeof playSound === 'function') playSound('error');
            return;
        }

        biz.customName = validated;
        saveState();
        showToast("Бренд обновлён: «" + validated + "» ✓");
        if (typeof playSound === 'function') playSound('win');
        this.render(document.getElementById('phoneAppContainer'));
    },

    selectSkinAction: function(idx, skinId) {
        var biz = state.businesses[idx];
        if (!biz) return;
        var skin = BUSINESS_COVER_SKINS.find(function(s) { return s.id === skinId; });
        if (!skin) return;

        if (skin.cost > 0 && (!biz.ownedSkins || !biz.ownedSkins.includes(skinId))) {
            var cash = state.player ? (state.player.cash || 0) : 0;
            if (cash < skin.cost) return showToast("Не хватает " + skin.cost.toLocaleString() + " ₽!");
            state.player.cash -= skin.cost;
            if (!biz.ownedSkins) biz.ownedSkins = ['classic'];
            biz.ownedSkins.push(skinId);
        }

        biz.coverSkin = skinId;
        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        this.renderCustomizerModalContent();
        this.render(document.getElementById('phoneAppContainer'));
    },

    selectAnimAction: function(idx, animId) {
        var biz = state.businesses[idx];
        if (!biz) return;
        var anim = BUSINESS_CARD_ANIMATIONS.find(function(a) { return a.id === animId; });
        if (!anim) return;

        if (anim.cost > 0 && (!biz.ownedAnims || !biz.ownedAnims.includes(animId))) {
            var cash = state.player ? (state.player.cash || 0) : 0;
            if (cash < anim.cost) return showToast("Не хватает " + anim.cost.toLocaleString() + " ₽!");
            state.player.cash -= anim.cost;
            if (!biz.ownedAnims) biz.ownedAnims = ['none'];
            biz.ownedAnims.push(animId);
        }

        biz.cardAnimation = animId;
        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        this.renderCustomizerModalContent();
        this.render(document.getElementById('phoneAppContainer'));
    },

    selectStickerAction: function(idx, stickerId) {
        var biz = state.businesses[idx];
        if (!biz) return;
        var st = BUSINESS_VIP_STICKERS.find(function(s) { return s.id === stickerId; });
        if (!st) return;

        if (st.cost > 0 && (!biz.ownedStickers || !biz.ownedStickers.includes(stickerId))) {
            var cash = state.player ? (state.player.cash || 0) : 0;
            if (cash < st.cost) return showToast("Не хватает " + st.cost.toLocaleString() + " ₽!");
            state.player.cash -= st.cost;
            if (!biz.ownedStickers) biz.ownedStickers = ['none'];
            biz.ownedStickers.push(stickerId);
        }

        biz.vipSticker = stickerId;
        saveState();
        updateHeaderUI();
        showToast("Установлен стикер: " + (st.icon || 'Стандарт'));
        if (typeof playSound === 'function') playSound('win');
        this.renderCustomizerModalContent();
        this.render(document.getElementById('phoneAppContainer'));
    },

    selectTitleStyleAction: function(idx, styleId) {
        var biz = state.businesses[idx];
        if (!biz) return;
        var tf = BUSINESS_TITLE_STYLES.find(function(t) { return t.id === styleId; });
        if (!tf) return;

        if (tf.cost > 0 && (!biz.ownedTitleStyles || !biz.ownedTitleStyles.includes(styleId))) {
            var cash = state.player ? (state.player.cash || 0) : 0;
            if (cash < tf.cost) return showToast("Не хватает " + tf.cost.toLocaleString() + " ₽!");
            state.player.cash -= tf.cost;
            if (!biz.ownedTitleStyles) biz.ownedTitleStyles = ['default'];
            biz.ownedTitleStyles.push(styleId);
        }

        biz.titleStyle = styleId;
        saveState();
        updateHeaderUI();
        showToast("Применён стиль названия: " + tf.name);
        if (typeof playSound === 'function') playSound('win');
        this.renderCustomizerModalContent();
        this.render(document.getElementById('phoneAppContainer'));
    },

    renderBusinessDetailHtml: function() {
        var biz = state.businesses[this.selectedBizIndex];
        if (!biz || (biz.level || 0) <= 0) {
            return '<div class="glass-card text-center sub-label py-6">' +
                '<div>Выберите предприятие на вкладке «Точки».</div>' +
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

        return '<div class="glass-card mb-2 p-2" style="border-left: 3px solid var(--green);">' +
                '<div class="flex-between">' +
                    '<b class="text-xs color-green">' + (biz.customName || biz.name) + ' (Ур. ' + biz.level + ')</b>' +
                    '<span class="tag-badge bg-tag-green">ЦЕХ АКТИВЕН</span>' +
                '</div>' +
                '<div class="sub-label mt-1" style="font-size:9px;">' + (biz.perk || biz.desc) + '</div>' +
            '</div>' +

            '<div class="glass-card mb-2 p-2">' +
                '<div class="flex-between mb-1">' +
                    '<b class="text-xs color-cyan"><i class="fa-solid fa-screwdriver-wrench"></i> Оснащение цеха (' + eqLvl + '/3)</b>' +
                    (nextEq ? '<span class="price-val text-xs color-green">' + eqCost.toLocaleString() + ' ₽</span>' : '<span class="tag-badge bg-tag-green">MAX</span>') +
                '</div>' +
                '<div class="sub-label mb-2" style="font-size:9px;">' + (nextEq ? nextEq.name : 'Максимальный класс станков (+45% к выручке)') + '</div>' +
                '<button onclick="AppBusiness.upgradeBranchAction(\'equipment\', ' + eqCost + ')" class="btn btn-cyan btn-sm w-full"' + (!nextEq ? ' disabled' : '') + '>' +
                    (nextEq ? 'Прокачать оснащение' : 'Максимальный уровень ✓') +
                '</button>' +
            '</div>' +

            '<div class="glass-card mb-2 p-2">' +
                '<div class="flex-between mb-1">' +
                    '<b class="text-xs color-amber"><i class="fa-solid fa-boxes-stacked"></i> Склад и ёмкость (' + stLvl + '/3)</b>' +
                    (nextSt ? '<span class="price-val text-xs color-green">' + stCost.toLocaleString() + ' ₽</span>' : '<span class="tag-badge bg-tag-green">MAX</span>') +
                '</div>' +
                '<div class="sub-label mb-2" style="font-size:9px;">' + (nextSt ? nextSt.name : 'Склад вмещает до 500% сырья без простоев') + '</div>' +
                '<button onclick="AppBusiness.upgradeBranchAction(\'storage\', ' + stCost + ')" class="btn btn-amber btn-sm w-full"' + (!nextSt ? ' disabled' : '') + '>' +
                    (nextSt ? 'Расширить склад' : 'Склад расширен ✓') +
                '</button>' +
            '</div>' +

            '<div class="glass-card mb-2 p-2">' +
                '<div class="flex-between mb-1">' +
                    '<b class="text-xs color-purple"><i class="fa-solid fa-bullhorn"></i> Маркетинг (' + mkLvl + '/3)</b>' +
                    (nextMk ? '<span class="price-val text-xs color-green">' + mkCost.toLocaleString() + ' ₽</span>' : '<span class="tag-badge bg-tag-green">MAX</span>') +
                '</div>' +
                '<div class="sub-label mb-2" style="font-size:9px;">' + (nextMk ? nextMk.name : 'Контракты с автоклубами (+40% клиентов)') + '</div>' +
                '<button onclick="AppBusiness.upgradeBranchAction(\'marketing\', ' + mkCost + ')" class="btn btn-purple btn-sm w-full"' + (!nextMk ? ' disabled' : '') + '>' +
                    (nextMk ? 'Запустить рекламу' : 'Максимальный охват ✓') +
                '</button>' +
            '</div>';
    },

    upgradeBranchAction: function(branchName, cost) {
        var biz = state.businesses[this.selectedBizIndex];
        if (!biz) return;
        var cash = state.player ? (state.player.cash || 0) : 0;
        if (cash < cost) return showToast("Не хватает денег!");

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
        showToast("Улучшение установлено!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    renderStaffManagementHtml: function() {
        var biz = state.businesses[this.selectedBizIndex];
        if (!biz || (biz.level || 0) <= 0) {
            return '<div class="glass-card text-center sub-label py-6">' +
                '<div>Выберите предприятие для найма специалистов.</div>' +
                '<button onclick="AppBusiness.switchSubTab(\'list\')" class="btn btn-cyan btn-sm mt-2">К списку точек</button>' +
            '</div>';
        }

        var staffCat = (typeof BUSINESS_STAFF_CATALOG !== 'undefined') ? BUSINESS_STAFF_CATALOG : { managers: [], masters: [], security: [] };
        var curMgr = biz.staff?.manager ? staffCat.managers.find(function(m) { return m.id === biz.staff.manager; }) : null;
        var curMst = biz.staff?.master ? staffCat.masters.find(function(m) { return m.id === biz.staff.master; }) : null;
        var curSec = biz.staff?.security ? staffCat.security.find(function(s) { return s.id === biz.staff.security; }) : null;

        var renderRoleList = function(list, role, btnColor) {
            var res = '';
            list.forEach(function(item) {
                res += '<div class="p-1 flex-between mb-1" style="background:#060a12; border-radius:6px; font-size:9px;">' +
                    '<div><b>' + item.name + '</b> (' + item.salary + ' ₽/д)<div class="sub-label" style="font-size:8px;">' + item.perkText + '</div></div>' +
                    '<button onclick="AppBusiness.hireStaffAction(\'' + role + '\', \'' + item.id + '\', ' + item.hireCost + ', ' + (item.reqStars || 0) + ')" class="btn ' + btnColor + ' btn-auto btn-sm" style="font-size:8px; padding:3px 8px;">Нанять (' + (item.hireCost/1000).toFixed(0) + 'k)</button>' +
                '</div>';
            });
            return res;
        };

        return '<div class="glass-card mb-2 p-2">' +
                '<b class="text-xs color-green block mb-1">Штат: ' + (biz.customName || biz.name) + '</b>' +
                '<div class="sub-label" style="font-size:9px;">Зарплата списывается раз в сутки в 00:00.</div>' +
            '</div>' +
            '<div class="glass-card mb-2 p-2">' +
                '<div class="flex-between mb-1"><b class="text-xs color-cyan"><i class="fa-solid fa-user-tie"></i> Управляющий</b>' +
                (curMgr ? '<button onclick="AppBusiness.fireStaffAction(\'manager\')" class="btn btn-danger btn-auto btn-sm" style="font-size:8px; padding:2px 6px;">Уволить</button>' : '') + '</div>' +
                (curMgr ? '<div class="p-1 text-xs" style="background:#090e18; border-radius:6px;"><b>' + curMgr.name + '</b> (' + curMgr.salary + ' ₽/д)<div class="sub-label" style="font-size:8.5px;">' + curMgr.perkText + '</div></div>' : renderRoleList(staffCat.managers, 'manager', 'btn-cyan')) +
            '</div>' +
            '<div class="glass-card mb-2 p-2">' +
                '<div class="flex-between mb-1"><b class="text-xs color-amber"><i class="fa-solid fa-wrench"></i> Мастер цеха</b>' +
                (curMst ? '<button onclick="AppBusiness.fireStaffAction(\'master\')" class="btn btn-danger btn-auto btn-sm" style="font-size:8px; padding:2px 6px;">Уволить</button>' : '') + '</div>' +
                (curMst ? '<div class="p-1 text-xs" style="background:#090e18; border-radius:6px;"><b>' + curMst.name + '</b> (' + curMst.salary + ' ₽/д)<div class="sub-label" style="font-size:8.5px;">' + curMst.perkText + '</div></div>' : renderRoleList(staffCat.masters, 'master', 'btn-amber')) +
            '</div>' +
            '<div class="glass-card mb-2 p-2">' +
                '<div class="flex-between mb-1"><b class="text-xs color-purple"><i class="fa-solid fa-shield-halved"></i> Охрана</b>' +
                (curSec ? '<button onclick="AppBusiness.fireStaffAction(\'security\')" class="btn btn-danger btn-auto btn-sm" style="font-size:8px; padding:2px 6px;">Уволить</button>' : '') + '</div>' +
                (curSec ? '<div class="p-1 text-xs" style="background:#090e18; border-radius:6px;"><b>' + curSec.name + '</b> (' + curSec.salary + ' ₽/д)<div class="sub-label" style="font-size:8.5px;">' + curSec.perkText + '</div></div>' : renderRoleList(staffCat.security, 'security', 'btn-purple')) +
            '</div>';
    },

    hireStaffAction: function(role, staffId, cost, reqStars) {
        var biz = state.businesses[this.selectedBizIndex];
        if (!biz) return;
        var cash = state.player?.cash || 0;
        var stars = state.player?.stars || 0;
        if (cash < cost) return showToast("Не хватает денег!");
        if (stars < (reqStars || 0)) return showToast("Нужно " + reqStars + " Stars ⭐!");

        state.player.cash -= cost;
        state.player.stars -= (reqStars || 0);
        if (!biz.staff) biz.staff = {};
        biz.staff[role] = staffId;

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        showToast("Сотрудник принят в штат!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    fireStaffAction: function(role) {
        var biz = state.businesses[this.selectedBizIndex];
        if (!biz || !biz.staff) return;
        biz.staff[role] = null;
        saveState();
        showToast("Сотрудник уволен.");
        this.render(document.getElementById('phoneAppContainer'));
    },

    renderFleetManagementHtml: function() {
        var biz = state.businesses[this.selectedBizIndex];
        if (!biz || (biz.level || 0) <= 0) {
            return '<div class="glass-card text-center sub-label py-6">' +
                '<div>Выберите предприятие для закрепления транспорта.</div>' +
                '<button onclick="AppBusiness.switchSubTab(\'list\')" class="btn btn-cyan btn-sm mt-2">К списку точек</button>' +
            '</div>';
        }

        var fleetCat = (typeof BUSINESS_FLEET_CATALOG !== 'undefined') ? BUSINESS_FLEET_CATALOG : [];
        var curFleetIds = Array.isArray(biz.fleet) ? biz.fleet : [];
        var cardsHtml = '';

        fleetCat.forEach(function(fl) {
            var isOwned = curFleetIds.indexOf(fl.id) !== -1;
            var isSuitable = Array.isArray(fl.suitableBusinesses) && fl.suitableBusinesses.indexOf(biz.id) !== -1;

            cardsHtml += '<div class="glass-card p-2 mb-2 ' + (isOwned ? 'personal-car-card' : '') + '">' +
                '<div class="flex-between mb-1">' +
                    '<b class="text-xs ' + (isOwned ? 'color-green' : 'color-cyan') + '">' + fl.name + '</b>' +
                    '<span class="tag-badge ' + (isOwned ? 'bg-tag-green' : (isSuitable ? 'bg-tag-cyan' : 'bg-tag-dark')) + '">' +
                        (isOwned ? 'В ПАРКЕ ✓' : (isSuitable ? 'ПОДХОДИТ' : 'ДРУГОЙ ЦЕХ')) +
                    '</span>' +
                '</div>' +
                '<div class="sub-label mb-1" style="font-size:9px;">' + fl.desc + '</div>' +
                '<button onclick="AppBusiness.buyFleetAction(\'' + fl.id + '\', ' + fl.cost + ', ' + (fl.reqStars || 0) + ')" class="btn ' + (isOwned ? 'btn-dark' : 'btn-cyan') + ' btn-sm w-full"' + (isOwned || !isSuitable ? ' disabled' : '') + '>' +
                    (isOwned ? 'Закреплён за цехом ✓' : (isSuitable ? 'Купить (' + (fl.cost/1000).toFixed(0) + 'k ₽)' : 'Не подходит для этой точки')) +
                '</button>' +
            '</div>';
        });

        return '<div class="glass-card mb-2 p-2">' +
                '<b class="text-xs color-green block mb-1">Спецтехника: ' + (biz.customName || biz.name) + '</b>' +
                '<div class="sub-label" style="font-size:9px;">Повышает суточный доход и расширяет склады.</div>' +
            '</div>' +
            '<div class="space-y-1">' + cardsHtml + '</div>';
    },

    buyFleetAction: function(fleetId, cost, reqStars) {
        var biz = state.businesses[this.selectedBizIndex];
        if (!biz) return;
        var cash = state.player?.cash || 0;
        var stars = state.player?.stars || 0;
        if (cash < cost) return showToast("Не хватает денег!");
        if (stars < (reqStars || 0)) return showToast("Нужно " + reqStars + " Stars ⭐!");

        state.player.cash -= cost;
        state.player.stars -= (reqStars || 0);
        if (!Array.isArray(biz.fleet)) biz.fleet = [];
        biz.fleet.push(fleetId);

        var fl = (typeof BUSINESS_FLEET_CATALOG !== 'undefined') ? BUSINESS_FLEET_CATALOG.find(function(it) { return it.id === fleetId; }) : null;
        if (fl) biz.maxStock = (biz.maxStock || 100) + fl.stockCapacityBonus;

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        showToast("Спецтехника закреплена за точкой!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    buyNewBusinessAction: function(idx) {
        var biz = state.businesses[idx];
        if (!biz) return;
        var cost = biz.cost;
        var cash = state.player?.cash || 0;
        var stars = state.player?.stars || 0;
        if (cash < cost) return showToast("Не хватает денег!");
        if (stars < (biz.reqStars || 0)) return showToast("Нужно " + biz.reqStars + " Stars ⭐!");

        state.player.cash -= cost;
        state.player.stars -= (biz.reqStars || 0);
        biz.level = 1;
        biz.stock = 100;
        biz.stored = 0;
        biz.customName = biz.name;
        biz.coverSkin = 'classic';
        biz.cardAnimation = 'none';
        biz.vipSticker = 'none';
        biz.titleStyle = 'default';

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        showToast("Вы приобрели «" + biz.name + "»!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    upgradeLevelSingle: function(idx) {
        var biz = state.businesses[idx];
        if (!biz || (biz.level || 0) <= 0) return;
        var cost = Math.round(biz.cost * (biz.level + 1));
        var cash = state.player?.cash || 0;
        if (cash < cost) return showToast("Не хватает денег на апгрейд!");

        state.player.cash -= cost;
        biz.level += 1;
        biz.stock = Math.min(biz.maxStock || 100, (biz.stock || 0) + 25);

        saveState();
        updateHeaderUI();
        if (typeof playSound === 'function') playSound('win');
        showToast("Уровень точки повышен до " + biz.level + "!");
        this.render(document.getElementById('phoneAppContainer'));
    },

    restockSingle: function(idx) {
        var biz = state.businesses[idx];
        if (!biz) return;
        var cost = 15000;
        var cash = state.player?.cash || 0;
        if (cash < cost) return showToast("Нужно 15,000 ₽ на сырьё!");

        state.player.cash -= cost;
        biz.stock = biz.maxStock || 100;

        saveState();
        if (typeof playSound === 'function') playSound('tick');
        showToast("Склад сырья пополнен до 100%!");
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
        showToast("Касса снята: +" + payout.toLocaleString() + " ₽!");
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
        showToast("Собрана вся касса: +" + total.toLocaleString() + " ₽!");
        this.render(document.getElementById('phoneAppContainer'));
    }
};

window.AppBusiness = AppBusiness;

window.collectAllBusinessCash = function() { AppBusiness.collectAllCashAction(); };
window.upgradeBusiness = function(idx) { AppBusiness.upgradeLevelSingle(idx); };
window.restockBusiness = function(idx) { AppBusiness.restockSingle(idx); };
// ========================================================
// js/theme-manager.js — МЕНЕДЖЕР ТЕМ И КАСТОМИЗАЦИИ (v4.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v4.0.0 (ПЛАТНАЯ КАСТОМИЗАЦИЯ ПРОФИЛЯ):
//   - ТРИ ВАЛЮТЫ: ₽ (рубли), ⭐ (Stars), 🎟️ (билеты)
//   - reqTickets в темах, ник-эффектах, аурах, титулах
//   - ГЛИТЧ-предметы только за билеты
//   - ownedThemes — отдельный трекер купленных тем
//   - Валидация в applyTheme (откат, если тема не куплена)
//   - Баланс валют в шапке модалки
//   - Тема Cyber Black Neo — платная (1 🎟️)
//   - Убраны 4 дублирующих темы: midnight_purple, tokyo_night,
//     neon_samurai, midnight_gold, cyberpunk_2077 → в HUD_THEMES_CATALOG
//     (здесь же в themes для рендера)
// ⭐ v3.4.0:
//   - 8 аур аватара (Fire, Snow, Lava, Rim, Smoke, Aurora, Scan, Quantum)
// ⭐ v3.3.0:
//   - 3 новые темы (Neon Samurai, Midnight Gold, Cyberpunk 2077)
// ========================================================

const ThemeManager = {
    activeCustomizerTab: 'colors',

    // --------------------------------------------------------
    // ⭐ v4.0.0: 11 ТЕМ (10 игровых + DEV)
    // Три валюты: cost (₽), reqStars (⭐), reqTickets (🎟️)
    // isExclusive — глитч-предметы (покупаются ТОЛЬКО за билеты)
    // --------------------------------------------------------
    themes: [
        {
            id: 'cyber_neon',
            name: '⚡ Cyber Neon',
            hex: '#00f2fe',
            secondaryHex: '#7928ca',
            glow: 'rgba(0, 242, 254, 0.45)',
            bgGrad: 'linear-gradient(135deg, #00f2fe, #7928ca)',
            isLightning: true,
            isDev: false,
            cost: 0, reqStars: 0, reqTickets: 0, reqLevel: 1,
            desc: 'Неоновый циан с молниями и глитч-эффектами. Классика Perekup OS.'
        },
        {
            id: 'midnight_purple',
            name: '🌌 Midnight Purple',
            hex: '#a855f7',
            secondaryHex: '#6366f1',
            glow: 'rgba(168, 85, 247, 0.5)',
            bgGrad: 'linear-gradient(135deg, #a855f7, #6366f1)',
            isLightning: false,
            isDev: false,
            cost: 150000, reqStars: 0, reqTickets: 0, reqLevel: 3,
            desc: 'Глубокий фиолетовый неон с индиго. Атмосфера ночного мегаполиса.'
        },
        {
            id: 'tokyo_night',
            name: '🌸 Tokyo Night',
            hex: '#f43f5e',
            secondaryHex: '#c084fc',
            glow: 'rgba(244, 63, 94, 0.45)',
            bgGrad: 'linear-gradient(135deg, #f43f5e, #c084fc)',
            isLightning: false,
            isDev: false,
            cost: 0, reqStars: 25, reqTickets: 0, reqLevel: 5,
            desc: 'Ночные сходки Daikoku. Розово-фиолетовый неон, глубокий тёмный фон.'
        },
        {
            id: 'ruby_blood',
            name: '🩸 Ruby Blood',
            hex: '#dc2626',
            secondaryHex: '#7f1d1d',
            glow: 'rgba(220, 38, 38, 0.5)',
            bgGrad: 'linear-gradient(135deg, #dc2626, #7f1d1d)',
            isLightning: false,
            isDev: false,
            cost: 250000, reqStars: 10, reqTickets: 0, reqLevel: 10,
            desc: 'Кроваво-красный агрессивный неон для тех, кто не привык проигрывать.'
        },
        {
            id: 'matrix_green',
            name: '🟢 Matrix Green',
            hex: '#00e676',
            secondaryHex: '#064e3b',
            glow: 'rgba(0, 230, 118, 0.5)',
            bgGrad: 'linear-gradient(135deg, #00e676, #064e3b)',
            isLightning: false,
            isDev: false,
            cost: 300000, reqStars: 0, reqTickets: 0, reqLevel: 12,
            desc: 'Классический хакерский зелёный с цифровым мерцанием.'
        },
        {
            id: 'synthwave_86',
            name: '🌆 Synthwave \'86',
            hex: '#f472b6',
            secondaryHex: '#22d3ee',
            glow: 'rgba(244, 114, 182, 0.5)',
            bgGrad: 'linear-gradient(135deg, #f472b6, #22d3ee)',
            isLightning: false,
            isDev: false,
            cost: 0, reqStars: 30, reqTickets: 0, reqLevel: 15,
            desc: 'Ретро-волна 80-х: малиновый и бирюзовый градиент с хромом.'
        },
        {
            id: 'lightning_storm',
            name: '⚡ Lightning Storm',
            hex: '#6366f1',
            secondaryHex: '#7928ca',
            glow: 'rgba(99, 102, 241, 0.5)',
            bgGrad: 'linear-gradient(135deg, #6366f1, #7928ca)',
            isLightning: true,
            isDev: false,
            cost: 300000, reqStars: 15, reqTickets: 0, reqLevel: 7,
            desc: 'Электрический сине-фиолетовый неон с искрами молний на HUD и телефоне.'
        },
        {
            id: 'carbon_stealth',
            name: '🪨 Stealth Titanium',
            hex: '#94a3b8',
            secondaryHex: '#475569',
            glow: 'rgba(148, 163, 184, 0.5)',
            bgGrad: 'linear-gradient(135deg, #94a3b8, #475569)',
            isLightning: false,
            isDev: false,
            cost: 350000, reqStars: 10, reqTickets: 0, reqLevel: 12,
            desc: 'Сдержанный матовый титановый минимализм без кричащих тонов.'
        },
        {
            id: 'regal_gold',
            name: '👑 Regal Gold',
            hex: '#fbbf24',
            secondaryHex: '#b45309',
            glow: 'rgba(251, 191, 36, 0.5)',
            bgGrad: 'linear-gradient(135deg, #fbbf24, #b45309)',
            isLightning: false,
            isDev: false,
            cost: 500000, reqStars: 20, reqTickets: 0, reqLevel: 25,
            desc: 'Премиальное золото и рояльный лак высшего ранга.'
        },
        {
            id: 'neon_cyberpunk',
            name: '🌃 NEON CYBERPUNK',
            hex: '#facc15',
            secondaryHex: '#ec4899',
            glow: 'rgba(250, 204, 21, 0.6)',
            bgGrad: 'linear-gradient(135deg, #facc15, #ec4899)',
            isLightning: false,
            isDev: false,
            cost: 0, reqStars: 0, reqTickets: 3, reqLevel: 20,
            isExclusive: true,
            desc: '🎰 ГЛИТЧ-ТЕМА. Максимальный киберпанк: жёлтый + розовый + RGB-глитч.'
        },
        {
            id: 'dev_matrix',
            name: '💚 DEV Matrix (только ПК)',
            hex: '#00e676',
            secondaryHex: '#059669',
            glow: 'rgba(0, 230, 118, 0.5)',
            bgGrad: 'linear-gradient(135deg, #00e676, #059669)',
            isLightning: false,
            isDev: true,
            cost: 0, reqStars: 0, reqTickets: 0, reqLevel: 1,
            desc: 'Чёрно-зелёная матрица для разработчиков. Только в DEV-режиме на ПК.'
        }
    ],

    // --------------------------------------------------------
    // ⭐ v4.0.0: 8 НИК-ЭФФЕКТОВ
    // --------------------------------------------------------
    nickEffects: [
        {
            id: 'none',
            name: 'Классический белый',
            className: '',
            desc: 'Стандартный читаемый никнейм без эффектов',
            cost: 0, reqStars: 0, reqTickets: 0, reqLevel: 1
        },
        {
            id: 'holographic_shift',
            name: '🔮 Holographic Shift',
            className: 'nick-fx-holographic',
            desc: 'Голографический перелив всех цветов спектра. Многослойный градиент скользит по тексту.',
            cost: 180000, reqStars: 4, reqTickets: 0, reqLevel: 5
        },
        {
            id: 'aurora_flow',
            name: '🌌 Aurora Flow',
            className: 'nick-fx-aurora',
            desc: 'Полярное сияние: зелёно-голубые волны света переливаются по буквам.',
            cost: 200000, reqStars: 5, reqTickets: 0, reqLevel: 8
        },
        {
            id: 'ember_sparks',
            name: '🔥 Ember Sparks',
            className: 'nick-fx-ember',
            desc: 'Раскалённые угли с искрами. Огненно-золотое свечение с мерцанием.',
            cost: 210000, reqStars: 5, reqTickets: 0, reqLevel: 10
        },
        {
            id: 'liquid_chrome',
            name: '🪞 Liquid Chrome',
            className: 'nick-fx-chrome',
            desc: 'Жидкий металл с зеркальными бликами. Эффект плавно переливается как ртуть.',
            cost: 220000, reqStars: 5, reqTickets: 0, reqLevel: 12
        },
        {
            id: 'plasma_storm',
            name: '⚡ Plasma Storm',
            className: 'nick-fx-plasma',
            desc: 'Плазменные разряды фиолетово-розового цвета. Ник пульсирует энергией.',
            cost: 240000, reqStars: 0, reqTickets: 2, reqLevel: 15,
            isExclusive: true
        },
        {
            id: 'cyber_glitch',
            name: '👾 Cyber Glitch',
            className: 'nick-fx-glitch',
            desc: 'RGB-разделение и цифровые помехи. Ник "сбоит" как взломанный терминал.',
            cost: 260000, reqStars: 6, reqTickets: 0, reqLevel: 18
        },
        {
            id: 'quantum_nick',
            name: '🔮 QUANTUM',
            className: 'nick-fx-quantum',
            desc: '🎰 ГЛИТЧ-НИК. Квантовое мерцание: ник распадается на частицы и собирается обратно.',
            cost: 500000, reqStars: 0, reqTickets: 3, reqLevel: 25,
            isExclusive: true
        }
    ],

    // --------------------------------------------------------
    // ⭐ v4.0.0: 10 АУР АВАТАРА
    // --------------------------------------------------------
    avatarEffects: [
        {
            id: 'none',
            name: 'Базовый ободок',
            className: '',
            desc: 'Статичное кольцо аватара без эффектов',
            cost: 0, reqStars: 0, reqTickets: 0, reqLevel: 1
        },
        {
            id: 'fire_ring',
            name: '🔥 Fire Ring',
            className: 'avatar-fx-fire-ring',
            desc: 'Настоящее пламя вокруг аватара. Анимация огня с языками пламени.',
            cost: 220000, reqStars: 5, reqTickets: 0, reqLevel: 5
        },
        {
            id: 'lava_core',
            name: '🌋 Lava Core',
            className: 'avatar-fx-lava-core',
            desc: 'Раскалённая лава с пузырями. Оранжево-красное свечение с эффектом кипения.',
            cost: 250000, reqStars: 6, reqTickets: 0, reqLevel: 8
        },
        {
            id: 'aurora_halo',
            name: '🌌 Aurora Halo',
            className: 'avatar-fx-aurora-halo',
            desc: 'Полярное сияние: зелёно-голубые волны света медленно вращаются вокруг фото.',
            cost: 260000, reqStars: 6, reqTickets: 0, reqLevel: 10
        },
        {
            id: 'spinning_rim',
            name: '🏎️ Spinning Rim',
            className: 'avatar-fx-spinning-rim',
            desc: 'Вращающийся автомобильный диск. Хромированный обод с эффектом скорости.',
            cost: 260000, reqStars: 6, reqTickets: 0, reqLevel: 12
        },
        {
            id: 'snow_storm',
            name: '❄️ Snow Storm',
            className: 'avatar-fx-snow-storm',
            desc: 'Падающий снег и морозный ореол. Ледяное свечение с кружащимися снежинками.',
            cost: 280000, reqStars: 7, reqTickets: 0, reqLevel: 14
        },
        {
            id: 'cyber_scan',
            name: '👾 Cyber Scan',
            className: 'avatar-fx-cyber-scan',
            desc: 'Голографический сканер: вертикальная линия сканирует аватар.',
            cost: 300000, reqStars: 8, reqTickets: 0, reqLevel: 16
        },
        {
            id: 'tire_smoke',
            name: '🛞 Tire Smoke',
            className: 'avatar-fx-tire-smoke',
            desc: 'Покрышка с дымом. Эффект дрифта с клубами дыма.',
            cost: 300000, reqStars: 8, reqTickets: 0, reqLevel: 18
        },
        {
            id: 'quantum_shield',
            name: '💎 QUANTUM Shield',
            className: 'avatar-fx-quantum',
            desc: '🎰 ГЛИТЧ-АУРА. Квантовый щит: два вращающихся кольца с частицами.',
            cost: 350000, reqStars: 0, reqTickets: 3, reqLevel: 25,
            isExclusive: true
        },
        {
            id: 'supernova_aura',
            name: '💫 SUPERNOVA',
            className: 'avatar-fx-supernova',
            desc: '🎰 ГЛИТЧ-АУРА. Взрыв сверхновой: аватар в центре вспышки и разлетающихся лучей.',
            cost: 750000, reqStars: 0, reqTickets: 5, reqLevel: 35,
            isExclusive: true
        }
    ],

    // --------------------------------------------------------
    // ⭐ v4.0.0: 8 ТИТУЛОВ
    // --------------------------------------------------------
    traderTitles: [
        { id: 'cash_buyer',     title: 'Быстрый выкуп за кэш 💸', minLvl: 1,  cost: 0,       reqStars: 0,  reqTickets: 0, desc: 'Деньги сразу без долгих проверок' },
        { id: 'classic_king',   title: 'Король Классики 👑',      minLvl: 3,  cost: 45000,   reqStars: 0,  reqTickets: 0, desc: 'Знает каждый винтик' },
        { id: 'hood_master',    title: 'Торг у капота 🤝',        minLvl: 5,  cost: 80000,   reqStars: 0,  reqTickets: 0, desc: 'Ни рубля скидки по телефону' },
        { id: 'pro_scanner',    title: 'Автоподбор от Бога 🔍',   minLvl: 8,  cost: 150000,  reqStars: 0,  reqTickets: 0, desc: 'Видит шпаклёвку за версту' },
        { id: 'syndicate_boss', title: 'Синдикат 777 ⚡',         minLvl: 15, cost: 500000,  reqStars: 5,  reqTickets: 0, desc: 'Закрытые аукционы и опт' },
        { id: 'ghost_trader',   title: '🎭 GHOST TRADER',         minLvl: 20, cost: 0,       reqStars: 0,  reqTickets: 1, desc: '🎰 ГЛИТЧ-ТИТУЛ. Призрачный перекуп — тебя не видят камеры', isExclusive: true },
        { id: 'imperator',      title: '👑 ИМПЕРАТОР АВТОРЫНКА',  minLvl: 30, cost: 2000000, reqStars: 30, reqTickets: 2, desc: '🎰 ГЛИТЧ-ТИТУЛ. Все продавцы кланяются при встрече', isExclusive: true },
        { id: 'oligarch',       title: '💠 ОЛИГАРХ СИНДИКАТА',    minLvl: 50, cost: 5000000, reqStars: 50, reqTickets: 5, desc: '🎰 ГЛИТЧ-ТИТУЛ. Абсолютная власть на всех авторынках', isExclusive: true }
    ],

    // --------------------------------------------------------
    // ИНИЦИАЛИЗАЦИЯ
    // --------------------------------------------------------
    init() {
        this.applyTheme();
    },

    hexToRgba(hex, alpha = 0.5) {
        if (!hex) return `rgba(0, 242, 254, ${alpha})`;
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    },

    // --------------------------------------------------------
    // ⭐ v4.0.0: ВАЛИДАЦИЯ ВЛАДЕНИЯ
    // --------------------------------------------------------
    ownsThem(themeId) {
        const p = state.player || {};
        if (!Array.isArray(p.ownedThemes)) {
            // Миграция: если поле отсутствует — выдаём базовую + текущую активную
            p.ownedThemes = ['cyber_neon'];
            if (p.hudColorId && p.hudColorId !== 'cyber_neon') {
                p.ownedThemes.push(p.hudColorId);
            }
        }
        return p.ownedThemes.includes(themeId);
    },

    ownsNick(fxId) {
        const p = state.player || {};
        return (p.ownedNickEffects || ['none']).includes(fxId);
    },

    ownsAvatar(fxId) {
        const p = state.player || {};
        return (p.ownedAvatarEffects || ['none']).includes(fxId);
    },

    ownsTitle(titleId) {
        const p = state.player || {};
        return (p.ownedTitles || ['cash_buyer']).includes(titleId);
    },

    // --------------------------------------------------------
    // ПРИМЕНЕНИЕ ТЕМЫ
    // ⭐ v4.0.0: с валидацией владения
    // --------------------------------------------------------
    applyTheme() {
        const root = document.documentElement;
        const body = document.body;
        if (!window.state?.player) return;

        const isDev = (typeof window.isPcDevMode === 'function') ? window.isPcDevMode() : false;

        let curColorId = state.player.hudColorId || 'cyber_neon';

        // ⭐ v4.0.0: валидация владения — если не куплено, откат на базовую
        if (!isDev && !this.ownsThem(curColorId)) {
            console.warn(`[ThemeManager] Тема «${curColorId}» не куплена → откат на cyber_neon`);
            curColorId = 'cyber_neon';
            state.player.hudColorId = 'cyber_neon';
        }

        const customHex = state.player.customHexColor;
        const isCyberThemeActive = state.player.themePresetId === 'cyber_black_neo';

        if (isDev) curColorId = 'dev_matrix';

        let targetHex = "#00f2fe";
        let targetSecondaryHex = "#7928ca";
        let targetGlow = "rgba(0, 242, 254, 0.45)";
        let isLightning = false;

        if (customHex && !isDev) {
            targetHex = customHex;
            targetSecondaryHex = "#0284c7";
            targetGlow = this.hexToRgba(customHex, 0.45);
        } else {
            const found = this.themes.find(t => t.id === curColorId) || this.themes[0];
            targetHex = found.hex;
            targetSecondaryHex = found.secondaryHex || "#0284c7";
            targetGlow = found.glow;
            isLightning = !!found.isLightning;
        }

        root.style.setProperty('--cyan', targetHex);
        root.style.setProperty('--cyan-glow', targetGlow);
        root.style.setProperty('--border-glow', this.hexToRgba(targetHex, 0.35));
        root.style.setProperty('--lightning-secondary', targetSecondaryHex);
        root.style.setProperty('--custom-fx-color', targetHex);
        root.style.setProperty('--custom-fx-glow', targetGlow);

        if (body) body.classList.remove('theme-light');
        if (body) {
            if (isDev) body.classList.add('is-dev-mode');
            else body.classList.remove('is-dev-mode');
        }

        // Корпус телефона
        const phoneDevice = document.querySelector('.phone-device-wrapper');
        if (phoneDevice) {
            if (isCyberThemeActive && !isDev) phoneDevice.classList.add('theme-cyber-icons');
            else phoneDevice.classList.remove('theme-cyber-icons');

            phoneDevice.style.borderColor = targetHex;
            phoneDevice.style.boxShadow = `0 20px 50px rgba(0, 0, 0, 0.9), inset 0 0 25px ${targetGlow}, 0 0 30px ${this.hexToRgba(targetSecondaryHex, 0.35)}`;

            if (isLightning) phoneDevice.classList.add('theme-lightning-active');
            else phoneDevice.classList.remove('theme-lightning-active');
        }

        // Ник-эффект — валидация
        const nameEl = document.getElementById('playerName');
        let nickFxId = state.player.nickEffect || 'none';
        if (!this.ownsNick(nickFxId)) {
            nickFxId = 'none';
            state.player.nickEffect = 'none';
        }
        if (nameEl) {
            this.nickEffects.forEach(fx => {
                if (fx.className) nameEl.classList.remove(fx.className);
            });
            const activeFx = this.nickEffects.find(fx => fx.id === nickFxId);
            if (activeFx && activeFx.className) nameEl.classList.add(activeFx.className);
        }

        // Аура аватара — валидация
        const ringEl = document.querySelector('.avatar-ring');
        let avatarFxId = state.player.avatarEffect || 'none';
        if (!this.ownsAvatar(avatarFxId)) {
            avatarFxId = 'none';
            state.player.avatarEffect = 'none';
        }
        if (ringEl) {
            this.avatarEffects.forEach(fx => {
                if (fx.className) ringEl.classList.remove(fx.className);
            });
            const activeAvatarFx = this.avatarEffects.find(fx => fx.id === avatarFxId);
            if (activeAvatarFx && activeAvatarFx.className) ringEl.classList.add(activeAvatarFx.className);
        }

        this._updateDevIndicator(isDev);
    },

    _updateDevIndicator(isDev) {
        let indicator = document.getElementById('devCornerIndicator');
        if (isDev) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'devCornerIndicator';
                indicator.className = 'dev-corner-indicator';
                indicator.innerText = '🔧 DEV MODE';
                document.body.appendChild(indicator);
            }
            indicator.style.display = 'block';
        } else {
            if (indicator) indicator.style.display = 'none';
        }
    },

    // --------------------------------------------------------
    // МОДАЛКА КАСТОМИЗАЦИИ
    // --------------------------------------------------------
    openCustomizer() {
        this.renderCustomizerModal();
        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalHudCustomizer');
        } else {
            const m = document.getElementById('modalHudCustomizer');
            if (m) m.classList.add('active');
        }
        if (typeof playSound === 'function') playSound('tick');
    },

    switchTab(tab) {
        this.activeCustomizerTab = tab;
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
    },

    // --------------------------------------------------------
    // ⭐ v4.0.0: ХЕЛПЕР — формат цены
    // --------------------------------------------------------
    _formatPrice(item) {
        const parts = [];
        if (item.cost && item.cost > 0) parts.push(`${item.cost.toLocaleString()} ₽`);
        if (item.reqStars && item.reqStars > 0) parts.push(`${item.reqStars} ⭐`);
        if (item.reqTickets && item.reqTickets > 0) parts.push(`${item.reqTickets} 🎟️`);
        return parts.length > 0 ? parts.join(' + ') : 'Бесплатно';
    },

    _playerBalances() {
        return {
            cash: state.player?.cash || 0,
            stars: state.player?.stars || 0,
            tickets: state.player?.superSpinTickets || 0,
            level: state.player?.level || 1
        };
    },

    _canAfford(item, bal) {
        if ((item.cost || 0) > bal.cash) return false;
        if ((item.reqStars || 0) > bal.stars) return false;
        if ((item.reqTickets || 0) > bal.tickets) return false;
        if ((item.reqLevel || item.minLvl || 1) > bal.level) return false;
        return true;
    },

    // --------------------------------------------------------
    // РЕНДЕР МОДАЛКИ
    // --------------------------------------------------------
    renderCustomizerModal() {
        const modal = document.getElementById('modalHudCustomizer');
        if (!modal) return;

        const curTab = this.activeCustomizerTab;
        const p = state.player || {};
        const bal = this._playerBalances();
        const isDev = (typeof window.isPcDevMode === 'function') ? window.isPcDevMode() : false;

        let bodyHtml = "";

        // -------- СКИН / ТЕМА --------
        if (curTab === 'colors') {
            let colorsGrid = "";
            this.themes.forEach(c => {
                if (c.isDev && !isDev) return;

                const isOwned = c.cost === 0 && c.reqStars === 0 && c.reqTickets === 0
                    ? true
                    : this.ownsThem(c.id);
                const isSel = p.hudColorId === c.id && !p.customHexColor;
                const canAfford = this._canAfford(c, bal);
                const isLocked = (c.reqLevel || 1) > bal.level;

                let priceHtml = "";
                let btnHtml = "";

                if (isSel) {
                    btnHtml = `<span class="tag-badge bg-tag-green" style="font-size:7px;">✓ АКТИВНА</span>`;
                } else if (isOwned) {
                    btnHtml = `<button onclick="ThemeManager.setThemeColor('${c.id}')" class="btn btn-cyan btn-auto" style="font-size:8px; padding:3px 8px;">Применить</button>`;
                } else if (isLocked) {
                    btnHtml = `<span class="tag-badge bg-tag-dark" style="font-size:7px;">🔒 ${c.reqLevel} ур.</span>`;
                } else {
                    priceHtml = this._formatPrice(c);
                    btnHtml = `<button onclick="ThemeManager.buyTheme('${c.id}')" class="btn ${canAfford ? 'btn-green' : 'btn-dark opacity-50'} btn-auto" style="font-size:8px; padding:3px 8px;">${priceHtml}</button>`;
                }

                const exclusiveFrame = c.isExclusive ? 'border:1.5px solid #ffd700; box-shadow:0 0 10px rgba(255,215,0,0.4);' : '';

                colorsGrid += `
                    <div class="color-palette-tile ${isSel ? 'selected' : ''}" onclick="${isOwned || isSel ? `ThemeManager.setThemeColor('${c.id}')` : (isLocked ? '' : `ThemeManager.buyTheme('${c.id}')`)}" style="--tile-color:${c.hex}; ${exclusiveFrame} cursor:${isLocked ? 'not-allowed' : 'pointer'}; opacity:${isLocked ? 0.5 : 1};">
                        <div class="color-palette-swatch" style="background:${c.bgGrad}; box-shadow:0 0 10px ${c.glow};"></div>
                        <div style="flex:1; min-width:0;">
                            <div class="color-palette-name">${c.name}</div>
                            <div class="sub-label" style="font-size:7.5px; line-height:1.15; color:#94a3b8;">${c.desc}</div>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:2px; align-items:flex-end;">
                            ${btnHtml}
                        </div>
                    </div>
                `;
            });

            const isCyberBlackNeo = p.themePresetId === 'cyber_black_neo';
            const cyberOwned = isCyberBlackNeo || this.ownsThem('cyber_black_neo');

            bodyHtml = `
                <div class="glass-card p-2 mb-2 flex-between" style="background:#090e18; border-color: ${isCyberBlackNeo ? 'var(--green)' : (cyberOwned ? 'var(--border-glass)' : '#ffd700')}; ${!cyberOwned ? 'box-shadow:0 0 10px rgba(255,215,0,0.3);' : ''}">
                    <div>
                        <b class="text-xs color-green"><i class="fa-solid fa-terminal mr-1"></i> Cyber Black Neo</b>
                        <div class="sub-label" style="font-size:8.5px;">Матовые чёрные иконки в стиле DEV</div>
                    </div>
                    <button onclick="ThemeManager.toggleCyberTheme()" class="btn ${isCyberBlackNeo ? 'btn-green' : (cyberOwned ? 'btn-dark' : 'btn-amber')} btn-sm btn-auto" style="font-size:9px;">
                        ${isCyberBlackNeo ? 'ВКЛЮЧЕНА ✓' : (cyberOwned ? 'ВКЛЮЧИТЬ' : '380K ₽ + 20 ⭐ + 1 🎟️')}
                    </button>
                </div>

                <div class="sub-label mb-2" style="font-size:9.5px;">Выберите тему HUD (🎰 — эксклюзив за билеты):</div>
                <div class="hud-colors-palette-grid mb-2">
                    ${colorsGrid}
                </div>

                ${!isDev ? `
                    <div class="glass-card p-2 flex-between mb-2">
                        <div>
                            <b class="text-xs color-cyan"><i class="fa-solid fa-eye-dropper mr-1"></i> Свой цвет</b>
                            <div class="sub-label" style="font-size:8.5px;">Кастомный оттенок из палитры</div>
                        </div>
                        <input type="color" value="${p.customHexColor || '#00f2fe'}" onchange="ThemeManager.setCustomHex(this.value)" style="width:36px; height:32px; border:none; background:transparent; cursor:pointer;">
                    </div>
                ` : ''}
            `;
        }
        // -------- НИК --------
        else if (curTab === 'nick') {
            let listHtml = "";
            this.nickEffects.forEach(fx => {
                const isOwned = this.ownsNick(fx.id);
                const isCur = p.nickEffect === fx.id;
                const canAfford = this._canAfford(fx, bal);
                const isLocked = (fx.reqLevel || 1) > bal.level;

                let actionBtn = "";
                if (isCur) actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Надето ✓</button>`;
                else if (isOwned) actionBtn = `<button onclick="ThemeManager.setNickEffect('${fx.id}')" class="btn btn-cyan btn-sm btn-auto">Выбрать</button>`;
                else if (isLocked) actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>🔒 ${fx.reqLevel} ур.</button>`;
                else actionBtn = `<button onclick="ThemeManager.buyNickEffect('${fx.id}')" class="btn ${canAfford ? 'btn-green' : 'btn-dark opacity-50'} btn-sm btn-auto">${this._formatPrice(fx)}</button>`;

                const previewClass = fx.className || '';
                const previewText = fx.id === 'none' ? 'Ace!' : 'Перекуп';
                const exclusiveFrame = fx.isExclusive ? 'border:1.5px solid #ffd700; box-shadow:0 0 10px rgba(255,215,0,0.3);' : '';

                listHtml += `
                    <div class="glass-card p-3 mb-2 ${isCur ? 'personal-car-card' : ''}" style="${exclusiveFrame}">
                        <div class="flex-between mb-2">
                            <b class="text-xs color-cyan">${fx.name}</b>
                            ${isCur ? '<span class="tag-badge bg-tag-green" style="font-size:7.5px;">АКТИВНО</span>' : (fx.isExclusive ? '<span class="tag-badge bg-tag-amber" style="font-size:7.5px;">🎰 ГЛИТЧ</span>' : '')}
                        </div>

                        <div class="nick-preview-box mb-2">
                            <span class="nick-preview-text ${previewClass}">${previewText}</span>
                        </div>

                        <div class="sub-label mb-2" style="font-size:8.5px;">${fx.desc}</div>

                        ${actionBtn}
                    </div>
                `;
            });
            bodyHtml = `<div class="sub-label mb-2" style="font-size:9.5px;">8 эффектов для никнейма (🎰 — глитч):</div><div class="space-y-1 mb-2" style="max-height:400px; overflow-y:auto;">${listHtml}</div>`;
        }
        // -------- АВАТАР --------
        else if (curTab === 'avatar') {
            let listHtml = "";
            this.avatarEffects.forEach(fx => {
                const isOwned = this.ownsAvatar(fx.id);
                const isCur = p.avatarEffect === fx.id;
                const canAfford = this._canAfford(fx, bal);
                const isLocked = (fx.reqLevel || 1) > bal.level;

                let actionBtn = "";
                if (isCur) actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Надето ✓</button>`;
                else if (isOwned) actionBtn = `<button onclick="ThemeManager.setAvatarEffect('${fx.id}')" class="btn btn-cyan btn-sm btn-auto">Выбрать</button>`;
                else if (isLocked) actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>🔒 ${fx.reqLevel} ур.</button>`;
                else actionBtn = `<button onclick="ThemeManager.buyAvatarEffect('${fx.id}')" class="btn ${canAfford ? 'btn-green' : 'btn-dark opacity-50'} btn-sm btn-auto">${this._formatPrice(fx)}</button>`;

                const previewClass = fx.className || '';
                const exclusiveFrame = fx.isExclusive ? 'border:1.5px solid #ffd700; box-shadow:0 0 10px rgba(255,215,0,0.3);' : '';

                listHtml += `
                    <div class="glass-card p-3 mb-2 ${isCur ? 'personal-car-card' : ''}" style="${exclusiveFrame}">
                        <div class="flex-between mb-2">
                            <b class="text-xs color-cyan">${fx.name}</b>
                            ${isCur ? '<span class="tag-badge bg-tag-green" style="font-size:7.5px;">АКТИВНО</span>' : (fx.isExclusive ? '<span class="tag-badge bg-tag-amber" style="font-size:7.5px;">🎰 ГЛИТЧ</span>' : '')}
                        </div>

                        <div class="avatar-preview-box mb-2">
                            <div class="avatar-ring ${previewClass}">
                                <div class="avatar-glow"></div>
                                <div class="avatar-fx-glow"></div>
                                <div class="avatar" style="width:44px; height:44px; font-size:18px;">
                                    <i class="fa-solid fa-user-ninja"></i>
                                </div>
                            </div>
                        </div>

                        <div class="sub-label mb-2" style="font-size:8.5px;">${fx.desc}</div>

                        ${actionBtn}
                    </div>
                `;
            });
            bodyHtml = `<div class="sub-label mb-2" style="font-size:9.5px;">10 аур вокруг фото (🎰 — глитч):</div><div class="space-y-1 mb-2" style="max-height:400px; overflow-y:auto;">${listHtml}</div>`;
        }
        // -------- ТИТУЛ --------
        else if (curTab === 'titles') {
            let listHtml = "";
            this.traderTitles.forEach(t => {
                const isOwned = t.cost === 0 ? true : this.ownsTitle(t.id);
                const isCur = p.traderTitle === t.title;
                const canAfford = this._canAfford(t, bal);
                const isLocked = (t.minLvl || 1) > bal.level;

                let actionBtn = "";
                if (isCur) actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Выбран ✓</button>`;
                else if (isLocked) actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>🔒 ${t.minLvl} ур.</button>`;
                else if (isOwned) actionBtn = `<button onclick="ThemeManager.setTraderTitle('${t.id}')" class="btn btn-cyan btn-sm btn-auto">Выбрать</button>`;
                else actionBtn = `<button onclick="ThemeManager.buyTraderTitle('${t.id}')" class="btn ${canAfford ? 'btn-green' : 'btn-dark opacity-50'} btn-sm btn-auto">${this._formatPrice(t)}</button>`;

                const exclusiveFrame = t.isExclusive ? 'border:1.5px solid #ffd700; box-shadow:0 0 10px rgba(255,215,0,0.3);' : '';

                listHtml += `
                    <div class="glass-card p-2 flex-between mb-2 ${isCur ? 'personal-car-card' : ''}" style="${exclusiveFrame}">
                        <div style="flex:1; margin-right:8px;">
                            <div class="flex-gap" style="align-items:center;">
                                <b class="text-xs color-amber" style="font-size:11px;">${t.title}</b>
                                ${isCur ? '<span class="tag-badge bg-tag-green" style="font-size:7.5px;">АКТИВНО</span>' : (t.isExclusive ? '<span class="tag-badge bg-tag-amber" style="font-size:7.5px;">🎰 ГЛИТЧ</span>' : '')}
                            </div>
                            <div class="sub-label mt-1" style="font-size:8.5px;">${t.desc}</div>
                        </div>
                        ${actionBtn}
                    </div>
                `;
            });
            bodyHtml = `<div class="sub-label mb-2" style="font-size:9.5px;">8 титулов (🎰 — глитч):</div><div class="space-y-1 mb-2" style="max-height:360px; overflow-y:auto;">${listHtml}</div>`;
        }

        // Баланс валют в шапке
        const balanceBar = `
            <div class="p-2 mb-2 flex-between" style="background:#050914; border-radius:8px; border:1px solid rgba(255,215,0,0.3);">
                <div class="flex-gap" style="gap:10px; flex-wrap:wrap; align-items:center;">
                    <span class="sub-label" style="font-size:10px;">💰 <b class="color-green">${bal.cash.toLocaleString()} ₽</b></span>
                    <span class="sub-label" style="font-size:10px;">💵 <b class="color-cyan">${bal.stars} ⭐</b></span>
                    <span class="sub-label" style="font-size:10px;">🎟️ <b class="color-amber">${bal.tickets} билетов</b></span>
                </div>
                <span class="tag-badge bg-tag-cyan" style="font-size:7.5px;">Ур. ${bal.level}</span>
            </div>
        `;

        modal.innerHTML = `
            <div class="modal-box" style="max-width:430px;">
                <div class="flex-between mb-2">
                    <div class="modal-glow-badge"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i> СТИЛЬ ПЕРЕКУПА</div>
                    <button onclick="ModalManager.close('modalHudCustomizer')" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                ${balanceBar}

                <div class="grid-4 mb-2" style="grid-template-columns: repeat(4, 1fr); gap: 4px;">
                    <button onclick="ThemeManager.switchTab('colors')" class="btn ${curTab === 'colors' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">🎨 Скин</button>
                    <button onclick="ThemeManager.switchTab('nick')" class="btn ${curTab === 'nick' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">✨ Ник</button>
                    <button onclick="ThemeManager.switchTab('avatar')" class="btn ${curTab === 'avatar' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">👤 Аватар</button>
                    <button onclick="ThemeManager.switchTab('titles')" class="btn ${curTab === 'titles' ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-size:9px; padding:6px 2px;">👑 Титул</button>
                </div>

                ${bodyHtml}

                <div class="p-2 mb-2 flex-between" style="background:#090e18; border-radius:10px; border:1px solid var(--border-glass);">
                    <div>
                        <b class="text-xs color-amber"><i class="fa-solid fa-volume-high mr-1"></i> Звуки интерфейса</b>
                        <div class="sub-label" style="font-size:8.5px;">Отклик кнопок</div>
                    </div>
                    <div class="flex-gap" style="flex-wrap:wrap;">
                        <button onclick="ThemeManager.setSoundProfile('cyber')" class="btn ${(p.soundProfile || 'cyber') === 'cyber' ? 'btn-cyan' : 'btn-dark'} btn-sm btn-auto" style="padding:4px 8px; font-size:9px;">Кибер</button>
                        <button onclick="ThemeManager.setSoundProfile('relay')" class="btn ${p.soundProfile === 'relay' ? 'btn-cyan' : 'btn-dark'} btn-sm btn-auto" style="padding:4px 8px; font-size:9px;">Реле</button>
                        <button onclick="ThemeManager.setSoundProfile('retro')" class="btn ${p.soundProfile === 'retro' ? 'btn-cyan' : 'btn-dark'} btn-sm btn-auto" style="padding:4px 8px; font-size:9px;">Ретро</button>
                        <button onclick="ThemeManager.setSoundProfile('silent')" class="btn ${p.soundProfile === 'silent' ? 'btn-cyan' : 'btn-dark'} btn-sm btn-auto" style="padding:4px 8px; font-size:9px;">Тишина</button>
                    </div>
                </div>

                <button onclick="ModalManager.close('modalHudCustomizer')" class="btn btn-cyan w-full font-bold">Применить и закрыть ✓</button>
            </div>
        `;
    },

    // --------------------------------------------------------
    // ⭐ v4.0.0: ПОКУПКА ТЕМЫ
    // --------------------------------------------------------
    buyTheme(themeId) {
        const isDev = (typeof window.isPcDevMode === 'function') ? window.isPcDevMode() : false;
        if (isDev && themeId !== 'dev_matrix') {
            return showToast("🔧 В DEV-режиме доступна только Matrix");
        }

        const theme = this.themes.find(t => t.id === themeId);
        if (!theme) return;

        if (this.ownsThem(themeId)) {
            return this.setThemeColor(themeId);
        }

        const bal = this._playerBalances();
        if ((theme.reqLevel || 1) > bal.level) {
            return showToast(`🔒 Нужен ${theme.reqLevel} уровень!`);
        }
        if ((theme.cost || 0) > bal.cash) return showToast(`Не хватает рублей (нужно ${theme.cost.toLocaleString()} ₽)!`);
        if ((theme.reqStars || 0) > bal.stars) return showToast(`Нужно ${theme.reqStars} ⭐!`);
        if ((theme.reqTickets || 0) > bal.tickets) return showToast(`Нужно ${theme.reqTickets} 🎟️ билетов!`);

        // Списание
        state.player.cash -= (theme.cost || 0);
        state.player.stars -= (theme.reqStars || 0);
        state.player.superSpinTickets = (state.player.superSpinTickets || 0) - (theme.reqTickets || 0);

        // Добавляем во владение
        if (!state.player.ownedThemes) state.player.ownedThemes = ['cyber_neon'];
        state.player.ownedThemes.push(themeId);
        state.player.hudColorId = themeId;
        state.player.customHexColor = null;

        if (typeof logBankTransaction === 'function') {
            const price = (theme.cost || 0) || ((theme.reqStars || 0) * 2500) || ((theme.reqTickets || 0) * 150000);
            logBankTransaction(`Покупка темы: ${theme.name}`, price, false);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast(`🎨 Тема «${theme.name}» активирована!`);
    },

    setThemeColor(colorId) {
        const isDev = (typeof window.isPcDevMode === 'function') ? window.isPcDevMode() : false;

        if (isDev && colorId !== 'dev_matrix') {
            if (typeof showToast === 'function') showToast("🔧 В DEV-режиме тема фиксирована (Matrix)");
            return;
        }

        // ⭐ v4.0.0: валидация владения
        if (!this.ownsThem(colorId)) {
            return this.buyTheme(colorId);
        }

        state.player.hudColorId = colorId;
        state.player.customHexColor = null;
        if (typeof saveState === 'function') saveState();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        if (typeof showToast === 'function') showToast("Тема активирована!");
    },

    setCustomHex(hexValue) {
        const isDev = (typeof window.isPcDevMode === 'function') ? window.isPcDevMode() : false;
        if (isDev) {
            if (typeof showToast === 'function') showToast("🔧 В DEV-режиме кастомные цвета отключены");
            return;
        }

        state.player.customHexColor = hexValue;
        if (typeof saveState === 'function') saveState();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof showToast === 'function') showToast(`Установлен оттенок ${hexValue}!`);
    },

    // --------------------------------------------------------
    // ⭐ v4.0.0: CYBER BLACK NEO — ПЛАТНЫЙ
    // --------------------------------------------------------
    toggleCyberTheme() {
        const isActive = state.player.themePresetId === 'cyber_black_neo';

        if (isActive) {
            // Выключаем — просто возвращаемся к default
            state.player.themePresetId = 'default';
            if (typeof saveState === 'function') saveState();
            this.applyTheme();
            this.renderCustomizerModal();
            if (typeof playSound === 'function') playSound('tick');
            if (typeof showToast === 'function') showToast("Иконки возвращены к классическим.");
            return;
        }

        // Пытаемся включить — нужно ли купить?
        if (this.ownsThem('cyber_black_neo')) {
            state.player.themePresetId = 'cyber_black_neo';
            if (typeof saveState === 'function') saveState();
            this.applyTheme();
            this.renderCustomizerModal();
            if (typeof playSound === 'function') playSound('win');
            if (typeof showToast === 'function') showToast("💚 Cyber Black Neo активирована!");
            return;
        }

        // Покупка
        const cost = 380000, reqStars = 20, reqTickets = 1, reqLevel = 10;
        const bal = this._playerBalances();

        if (bal.level < reqLevel) return showToast(`🔒 Нужен ${reqLevel} уровень!`);
        if (bal.cash < cost) return showToast(`Не хватает ₽ (нужно ${cost.toLocaleString()})!`);
        if (bal.stars < reqStars) return showToast(`Нужно ${reqStars} ⭐!`);
        if (bal.tickets < reqTickets) return showToast(`Нужен ${reqTickets} 🎟️ билет!`);

        state.player.cash -= cost;
        state.player.stars -= reqStars;
        state.player.superSpinTickets -= reqTickets;

        if (!state.player.ownedThemes) state.player.ownedThemes = ['cyber_neon'];
        state.player.ownedThemes.push('cyber_black_neo');
        state.player.themePresetId = 'cyber_black_neo';

        if (typeof logBankTransaction === 'function') {
            logBankTransaction("Покупка Cyber Black Neo", cost, false);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast("💚 Cyber Black Neo куплена и активирована!");
    },

    // --------------------------------------------------------
    // ⭐ v4.0.0: ПОКУПКА НИК-ЭФФЕКТА
    // --------------------------------------------------------
    buyNickEffect(fxId) {
        const fx = this.nickEffects.find(f => f.id === fxId);
        if (!fx) return;
        if (this.ownsNick(fxId)) return this.setNickEffect(fxId);

        const bal = this._playerBalances();
        if ((fx.reqLevel || 1) > bal.level) return showToast(`🔒 Нужен ${fx.reqLevel} уровень!`);
        if ((fx.cost || 0) > bal.cash) return showToast(`Не хватает ₽ (нужно ${fx.cost.toLocaleString()})!`);
        if ((fx.reqStars || 0) > bal.stars) return showToast(`Нужно ${fx.reqStars} ⭐!`);
        if ((fx.reqTickets || 0) > bal.tickets) return showToast(`Нужно ${fx.reqTickets} 🎟️!`);

        state.player.cash -= (fx.cost || 0);
        state.player.stars -= (fx.reqStars || 0);
        state.player.superSpinTickets -= (fx.reqTickets || 0);

        if (!state.player.ownedNickEffects) state.player.ownedNickEffects = ['none'];
        state.player.ownedNickEffects.push(fxId);
        state.player.nickEffect = fxId;

        if (typeof logBankTransaction === 'function') {
            const price = (fx.cost || 0) || ((fx.reqStars || 0) * 2500) || ((fx.reqTickets || 0) * 150000);
            logBankTransaction(`Покупка ника: ${fx.name}`, price, false);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast(`✨ Ник «${fx.name}» активирован!`);
    },

    setNickEffect(fxId) {
        if (!this.ownsNick(fxId) && fxId !== 'none') {
            return this.buyNickEffect(fxId);
        }
        state.player.nickEffect = fxId;
        if (typeof saveState === 'function') saveState();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof showToast === 'function') showToast("Эффект ника установлен!");
    },

    // --------------------------------------------------------
    // ⭐ v4.0.0: ПОКУПКА АУРЫ
    // --------------------------------------------------------
    buyAvatarEffect(fxId) {
        const fx = this.avatarEffects.find(f => f.id === fxId);
        if (!fx) return;
        if (this.ownsAvatar(fxId)) return this.setAvatarEffect(fxId);

        const bal = this._playerBalances();
        if ((fx.reqLevel || 1) > bal.level) return showToast(`🔒 Нужен ${fx.reqLevel} уровень!`);
        if ((fx.cost || 0) > bal.cash) return showToast(`Не хватает ₽ (нужно ${fx.cost.toLocaleString()})!`);
        if ((fx.reqStars || 0) > bal.stars) return showToast(`Нужно ${fx.reqStars} ⭐!`);
        if ((fx.reqTickets || 0) > bal.tickets) return showToast(`Нужно ${fx.reqTickets} 🎟️!`);

        state.player.cash -= (fx.cost || 0);
        state.player.stars -= (fx.reqStars || 0);
        state.player.superSpinTickets -= (fx.reqTickets || 0);

        if (!state.player.ownedAvatarEffects) state.player.ownedAvatarEffects = ['none'];
        state.player.ownedAvatarEffects.push(fxId);
        state.player.avatarEffect = fxId;

        if (typeof logBankTransaction === 'function') {
            const price = (fx.cost || 0) || ((fx.reqStars || 0) * 2500) || ((fx.reqTickets || 0) * 150000);
            logBankTransaction(`Покупка ауры: ${fx.name}`, price, false);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast(`💎 Аура «${fx.name}» активирована!`);
    },

    setAvatarEffect(fxId) {
        if (!this.ownsAvatar(fxId) && fxId !== 'none') {
            return this.buyAvatarEffect(fxId);
        }
        state.player.avatarEffect = fxId;
        if (typeof saveState === 'function') saveState();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof showToast === 'function') showToast("Аура установлена!");
    },

    // --------------------------------------------------------
    // ⭐ v4.0.0: ПОКУПКА ТИТУЛА
    // --------------------------------------------------------
    buyTraderTitle(titleId) {
        const t = this.traderTitles.find(x => x.id === titleId);
        if (!t) return;
        if (this.ownsTitle(titleId)) return this.setTraderTitle(titleId);

        const bal = this._playerBalances();
        if ((t.minLvl || 1) > bal.level) return showToast(`🔒 Нужен ${t.minLvl} уровень!`);
        if ((t.cost || 0) > bal.cash) return showToast(`Не хватает ₽ (нужно ${t.cost.toLocaleString()})!`);
        if ((t.reqStars || 0) > bal.stars) return showToast(`Нужно ${t.reqStars} ⭐!`);
        if ((t.reqTickets || 0) > bal.tickets) return showToast(`Нужно ${t.reqTickets} 🎟️!`);

        state.player.cash -= (t.cost || 0);
        state.player.stars -= (t.reqStars || 0);
        state.player.superSpinTickets -= (t.reqTickets || 0);

        if (!state.player.ownedTitles) state.player.ownedTitles = ['cash_buyer'];
        state.player.ownedTitles.push(titleId);
        state.player.traderTitle = t.title;

        if (typeof logBankTransaction === 'function') {
            const price = (t.cost || 0) || ((t.reqStars || 0) * 2500) || ((t.reqTickets || 0) * 150000);
            logBankTransaction(`Покупка титула: ${t.title}`, price, false);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast(`👑 Титул «${t.title}» активирован!`);
    },

    setTraderTitle(titleId) {
        const found = this.traderTitles.find(t => t.id === titleId);
        if (!found) return;
        if (!this.ownsTitle(titleId) && found.cost > 0) {
            return this.buyTraderTitle(titleId);
        }
        state.player.traderTitle = found.title;
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof showToast === 'function') showToast("Титул обновлён!");
    },

    setSoundProfile(profile) {
        state.player.soundProfile = profile;
        if (typeof saveState === 'function') saveState();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof showToast === 'function') showToast("Звуковой профиль обновлён!");
    },

    // --------------------------------------------------------
    // ⭐ v4.0.0: ВЫДАЧА ПРЕДМЕТА ИЗ СУПЕРВИЛСПИНА
    // Возвращает {success, item, convertedToStars}
    // --------------------------------------------------------
    grantCosmeticFromSpin(category, itemId) {
        const p = state.player;
        if (!p) return { success: false };

        // Найти предмет
        let item = null;
        let list = null;
        let ownedList = null;

        if (category === 'themes') {
            item = this.themes.find(t => t.id === itemId);
            list = this.themes;
            if (!p.ownedThemes) p.ownedThemes = ['cyber_neon'];
            ownedList = p.ownedThemes;
        } else if (category === 'nickEffects') {
            item = this.nickEffects.find(f => f.id === itemId);
            list = this.nickEffects;
            if (!p.ownedNickEffects) p.ownedNickEffects = ['none'];
            ownedList = p.ownedNickEffects;
        } else if (category === 'avatarEffects') {
            item = this.avatarEffects.find(f => f.id === itemId);
            list = this.avatarEffects;
            if (!p.ownedAvatarEffects) p.ownedAvatarEffects = ['none'];
            ownedList = p.ownedAvatarEffects;
        } else if (category === 'titles') {
            item = this.traderTitles.find(t => t.id === itemId);
            list = this.traderTitles;
            if (!p.ownedTitles) p.ownedTitles = ['cash_buyer'];
            ownedList = p.ownedTitles;
        }

        if (!item) return { success: false };

        // Уже владеет → конвертируем в Stars
        if (ownedList.includes(itemId)) {
            const compensation = 10 + Math.floor(Math.random() * 20); // 10-30 ⭐
            p.stars = (p.stars || 0) + compensation;
            return {
                success: true,
                item: item,
                convertedToStars: compensation
            };
        }

        // Выдаём
        ownedList.push(itemId);
        return {
            success: true,
            item: item,
            convertedToStars: 0
        };
    }
};

window.ThemeManager = ThemeManager;
window.HUD_SOLID_COLORS = ThemeManager.themes;
window.NICKNAME_EFFECTS_CATALOG = ThemeManager.nickEffects;
window.AVATAR_EFFECTS_CATALOG = ThemeManager.avatarEffects;

// Алиасы для обратной совместимости
window.openHudCustomizerModal = () => ThemeManager.openCustomizer();
window.switchCustomizerTab = (tab) => ThemeManager.switchTab(tab);
window.renderHudCustomizerContent = () => ThemeManager.renderCustomizerModal();
window.applyHudCustomization = () => ThemeManager.applyTheme();
window.setHudSolidColor = (id) => ThemeManager.setThemeColor(id);
window.setHudCustomHexColor = (hex) => ThemeManager.setCustomHex(hex);
window.toggleCyberIconsThemeAction = () => ThemeManager.toggleCyberTheme();
window.buyNickEffectAction = (id) => ThemeManager.buyNickEffect(id);
window.setNickEffectAction = (id) => ThemeManager.setNickEffect(id);
window.buyAvatarEffectAction = (id) => ThemeManager.buyAvatarEffect(id);
window.setAvatarEffectAction = (id) => ThemeManager.setAvatarEffect(id);
window.setSoundProfileAction = (p) => ThemeManager.setSoundProfile(p);
window.grantCosmeticFromSpin = (cat, id) => ThemeManager.grantCosmeticFromSpin(cat, id);

console.log('[🎨 theme-manager v4.0.0] Платная кастомизация: 11 тем, 8 ников, 10 аур, 8 титулов + билеты 🎟️ + SuperSpin grant ✓');
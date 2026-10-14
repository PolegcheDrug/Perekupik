// ========================================================
// js/theme-manager.js — МЕНЕДЖЕР ТЕМ И КАСТОМИЗАЦИИ (v3.4.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v3.4.0 (НОВЫЕ АУРЫ АВАТАРА):
//   - Добавлены 3 новые ауры: Lava Core, Spinning Rim,
//     Tire Smoke.
//   - Заменены Holographic Ring и Plasma Core на
//     Fire Ring и Snow Storm.
//   - Обновлены CSS-анимации для новых аур.
// ⭐ v3.3.0 (НОВЫЕ ТЕМЫ):
//   - Добавлены 3 новые темы: Neon Samurai, Midnight Gold,
//     Cyberpunk 2077.
//   - Оптимизирована логика применения тем.
//   - Сохранена DEV-тема (чёрно-зелёная матрица).
// ========================================================

const ThemeManager = {
    activeCustomizerTab: 'colors',

    // --------------------------------------------------------
    // 7 ТЕМ (6 игровых + DEV)
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
            isLight: false,
            isDev: false,
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
            isLight: false,
            isDev: false,
            desc: 'Глубокий фиолетовый неон с индиго. Атмосфера ночного мегаполиса и синдиката.'
        },
        {
            id: 'tokyo_night',
            name: '🌸 Tokyo Night',
            hex: '#f43f5e',
            secondaryHex: '#c084fc',
            glow: 'rgba(244, 63, 94, 0.45)',
            bgGrad: 'linear-gradient(135deg, #f43f5e, #c084fc)',
            isLightning: false,
            isLight: false,
            isDev: false,
            desc: 'Ночные сходки Daikoku. Розово-фиолетовый неон, глубокий тёмный фон.'
        },
        {
            id: 'neon_samurai',
            name: '🌆 Neon Samurai',
            hex: '#e879f9', // Фуксия
            secondaryHex: '#a3e635', // Лайм
            glow: 'rgba(232, 121, 249, 0.5)',
            bgGrad: 'linear-gradient(135deg, #e879f9, #a3e635)',
            isLightning: false,
            isLight: false,
            isDev: false,
            desc: 'Глубокий фиолетовый фон, акценты фуксии и лайма. Агрессивный стиль самурая.'
        },
        {
            id: 'midnight_gold',
            name: '🏆 Midnight Gold',
            hex: '#fbbf24', // Золотой
            secondaryHex: '#f59e0b', // Медный
            glow: 'rgba(251, 191, 36, 0.5)',
            bgGrad: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            isLightning: false,
            isLight: false,
            isDev: false,
            desc: 'Тёмно-синий фон, золотые и медные акценты. Для элитного перекупа.'
        },
        {
            id: 'cyberpunk_2077',
            name: '💀 Cyberpunk 2077',
            hex: '#facc15', // Жёлтый
            secondaryHex: '#06b6d4', // Бирюзовый
            glow: 'rgba(250, 204, 21, 0.5)',
            bgGrad: 'linear-gradient(135deg, #facc15, #06b6d4)',
            isLightning: false,
            isLight: false,
            isDev: false,
            desc: 'Жёлто-чёрная схема с яркими бирюзовыми вспышками. Максимальный контраст.'
        },
        {
            id: 'dev_matrix',
            name: '💚 DEV Matrix (только ПК)',
            hex: '#00e676',
            secondaryHex: '#059669',
            glow: 'rgba(0, 230, 118, 0.5)',
            bgGrad: 'linear-gradient(135deg, #00e676, #059669)',
            isLightning: false,
            isLight: false,
            isDev: true,
            desc: 'Чёрно-зелёная матрица для разработчиков. Только в DEV-режиме на ПК.'
        }
    ],

    // --------------------------------------------------------
    // 6 ПРОДВИНУТЫХ ЭФФЕКТОВ НИКНЕЙМА
    // --------------------------------------------------------
    nickEffects: [
        {
            id: 'none',
            name: 'Классический белый',
            className: '',
            desc: 'Стандартный читаемый никнейм без эффектов',
            cost: 0,
            reqStars: 0
        },
        {
            id: 'holographic_shift',
            name: '🔮 Holographic Shift',
            className: 'nick-fx-holographic',
            desc: 'Голографический перелив всех цветов спектра. Многослойный градиент скользит по тексту.',
            cost: 180000,
            reqStars: 4
        },
        {
            id: 'liquid_chrome',
            name: '🪞 Liquid Chrome',
            className: 'nick-fx-chrome',
            desc: 'Жидкий металл с зеркальными бликами. Эффект плавно переливается как ртуть.',
            cost: 220000,
            reqStars: 5
        },
        {
            id: 'cyber_glitch',
            name: '👾 Cyber Glitch',
            className: 'nick-fx-glitch',
            desc: 'RGB-разделение и цифровые помехи. Ник "сбоит" как взломанный терминал.',
            cost: 260000,
            reqStars: 6
        },
        {
            id: 'aurora_flow',
            name: '🌌 Aurora Flow',
            className: 'nick-fx-aurora',
            desc: 'Полярное сияние: зелёно-голубые волны света переливаются по буквам.',
            cost: 200000,
            reqStars: 5
        },
        {
            id: 'plasma_storm',
            name: '⚡ Plasma Storm',
            className: 'nick-fx-plasma',
            desc: 'Плазменные разряды фиолетово-розового цвета. Ник пульсирует энергией.',
            cost: 240000,
            reqStars: 6
        },
        {
            id: 'ember_sparks',
            name: '🔥 Ember Sparks',
            className: 'nick-fx-ember',
            desc: 'Раскалённые угли с искрами. Огненно-золотое свечение с мерцанием.',
            cost: 210000,
            reqStars: 5
        }
    ],

    // --------------------------------------------------------
    // 8 ПРОДВИНУТЫХ АУР АВАТАРА (v3.4.0)
    // --------------------------------------------------------
    avatarEffects: [
        {
            id: 'none',
            name: 'Базовый ободок',
            className: '',
            desc: 'Статичное кольцо аватара без эффектов',
            cost: 0,
            reqStars: 0
        },
        {
            id: 'fire_ring',
            name: '🔥 Fire Ring',
            className: 'avatar-fx-fire-ring',
            desc: 'Настоящее пламя вокруг аватара. Анимация огня с языками пламени.',
            cost: 220000,
            reqStars: 5
        },
        {
            id: 'snow_storm',
            name: '❄️ Snow Storm',
            className: 'avatar-fx-snow-storm',
            desc: 'Падающий снег и морозный ореол. Ледяное свечение с кружащимися снежинками.',
            cost: 280000,
            reqStars: 7
        },
        {
            id: 'lava_core',
            name: '🌋 Lava Core',
            className: 'avatar-fx-lava-core',
            desc: 'Раскалённая лава с пузырями. Оранжево-красное свечение с эффектом кипения.',
            cost: 250000,
            reqStars: 6
        },
        {
            id: 'spinning_rim',
            name: '🏎️ Spinning Rim',
            className: 'avatar-fx-spinning-rim',
            desc: 'Вращающийся автомобильный диск. Хромированный обод с эффектом скорости.',
            cost: 260000,
            reqStars: 6
        },
        {
            id: 'tire_smoke',
            name: '🛞 Tire Smoke',
            className: 'avatar-fx-tire-smoke',
            desc: 'Покрышка с дымом и надписями. Эффект дрифта с клубами дыма.',
            cost: 300000,
            reqStars: 8
        },
        {
            id: 'aurora_halo',
            name: '🌌 Aurora Halo',
            className: 'avatar-fx-aurora-halo',
            desc: 'Полярное сияние: зелёно-голубые волны света медленно вращаются вокруг фото.',
            cost: 260000,
            reqStars: 6
        },
        {
            id: 'cyber_scan',
            name: '👾 Cyber Scan',
            className: 'avatar-fx-cyber-scan',
            desc: 'Голографический сканер: вертикальная линия сканирует аватар, оставляя световые полосы.',
            cost: 300000,
            reqStars: 8
        },
        {
            id: 'quantum_shield',
            name: '💎 Quantum Shield',
            className: 'avatar-fx-quantum',
            desc: 'Квантовый щит: два вращающихся кольца с частицами между ними. Внутреннее свечение.',
            cost: 350000,
            reqStars: 10
        }
    ],

    // --------------------------------------------------------
    // ТИТУЛЫ
    // --------------------------------------------------------
    traderTitles: [
        { id: 'cash_buyer',    title: 'Быстрый выкуп за кэш 💸', minLvl: 1,  cost: 0,      desc: 'Деньги сразу без долгих проверок' },
        { id: 'classic_king',  title: 'Король Классики 👑',      minLvl: 3,  cost: 45000,  desc: 'Знает каждый винтик' },
        { id: 'hood_master',   title: 'Торг у капота 🤝',        minLvl: 5,  cost: 80000,  desc: 'Ни рубля скидки по телефону' },
        { id: 'pro_scanner',   title: 'Автоподбор от Бога 🔍',   minLvl: 8,  cost: 150000, desc: 'Видит шпаклёвку за версту' },
        { id: 'syndicate_boss',title: 'Синдикат 777 ⚡',         minLvl: 15, cost: 500000, desc: 'Закрытые аукционы и опт' }
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
    // ПРИМЕНЕНИЕ ТЕМЫ
    // ⭐ v3.4.0: обновлённая логика с новыми аурами
    // --------------------------------------------------------
    applyTheme() {
        const root = document.documentElement;
        const body = document.body;
        if (!window.state?.player) return;

        const isDev = (typeof window.isPcDevMode === 'function') ? window.isPcDevMode() : false;

        let curColorId = state.player.hudColorId || 'cyber_neon';
        const customHex = state.player.customHexColor;
        const isCyberThemeActive = state.player.themePresetId === 'cyber_black_neo';

        // ⭐ v3.2.0: если DEV — форсируем DEV-тему
        if (isDev) {
            curColorId = 'dev_matrix';
        }

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

        // ⭐ v3.2.0: убираем старую светлую тему, если осталась
        if (body) body.classList.remove('theme-light');

        // ⭐ v3.2.0: DEV-стили на body
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

        // Ник-эффект
        const nameEl = document.getElementById('playerName');
        const nickFxId = state.player.nickEffect || 'none';
        if (nameEl) {
            this.nickEffects.forEach(fx => {
                if (fx.className) nameEl.classList.remove(fx.className);
            });
            const activeFx = this.nickEffects.find(fx => fx.id === nickFxId);
            if (activeFx && activeFx.className) nameEl.classList.add(activeFx.className);
        }

        // Аура аватара
        const ringEl = document.querySelector('.avatar-ring');
        const avatarFxId = state.player.avatarEffect || 'none';
        if (ringEl) {
            this.avatarEffects.forEach(fx => {
                if (fx.className) ringEl.classList.remove(fx.className);
            });
            const activeAvatarFx = this.avatarEffects.find(fx => fx.id === avatarFxId);
            if (activeAvatarFx && activeAvatarFx.className) ringEl.classList.add(activeAvatarFx.className);
        }

        // ⭐ v3.2.0: DEV-индикатор в HUD
        this._updateDevIndicator(isDev);
    },

    // ⭐ v3.2.0: обновление DEV-индикатора
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

    renderCustomizerModal() {
        const modal = document.getElementById('modalHudCustomizer');
        if (!modal) return;

        const curTab = this.activeCustomizerTab;
        const p = state.player || {};
        const curColorId = p.hudColorId || 'cyber_neon';
        const curNickFx = p.nickEffect || 'none';
        const curAvatarFx = p.avatarEffect || 'none';
        const curTitle = p.traderTitle || 'Быстрый выкуп за кэш 💸';
        const ownedNicks = p.ownedNickEffects || ['none'];
        const ownedAvatars = p.ownedAvatarEffects || ['none'];
        const ownedTitles = p.ownedTitles || ['cash_buyer'];
        const sProfile = p.soundProfile || 'cyber';

        const isDev = (typeof window.isPcDevMode === 'function') ? window.isPcDevMode() : false;

        let bodyHtml = "";

        // -------- СКИН --------
        if (curTab === 'colors') {
            let colorsGrid = "";
            this.themes.forEach(c => {
                // ⭐ v3.2.0: DEV-тема показывается только в DEV-режиме
                if (c.isDev && !isDev) return;

                const isSel = curColorId === c.id && !p.customHexColor;
                colorsGrid += `
                    <div class="color-palette-tile ${isSel ? 'selected' : ''}" onclick="ThemeManager.setThemeColor('${c.id}')" style="--tile-color:${c.hex};">
                        <div class="color-palette-swatch" style="background:${c.bgGrad}; box-shadow:0 0 10px ${c.glow};"></div>
                        <div style="flex:1; min-width:0;">
                            <div class="color-palette-name">${c.name}</div>
                            <div class="sub-label" style="font-size:7.5px; line-height:1.15; color:#94a3b8;">${c.desc}</div>
                        </div>
                        ${isSel ? '<i class="fa-solid fa-check color-check"></i>' : ''}
                    </div>
                `;
            });

            const isCyberBlackNeo = p.themePresetId === 'cyber_black_neo';

            bodyHtml = `
                <div class="glass-card p-2 mb-2 flex-between" style="background:#090e18; border-color: ${isCyberBlackNeo ? 'var(--green)' : 'var(--border-glass)'};">
                    <div>
                        <b class="text-xs color-green"><i class="fa-solid fa-terminal mr-1"></i> Cyber Black Neo</b>
                        <div class="sub-label" style="font-size:8.5px;">Матовые чёрные иконки в стиле DEV</div>
                    </div>
                    <button onclick="ThemeManager.toggleCyberTheme()" class="btn ${isCyberBlackNeo ? 'btn-green' : 'btn-dark'} btn-sm btn-auto" style="font-size:9px;">
                        ${isCyberBlackNeo ? 'ВКЛЮЧЕНА ✓' : 'ВКЛЮЧИТЬ'}
                    </button>
                </div>

                <div class="sub-label mb-2" style="font-size:9.5px;">Выберите тему HUD и корпуса телефона:</div>
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
                ` : `
                    <div class="glass-card p-2 mb-2" style="background:rgba(0,230,118,0.06); border-color:rgba(0,230,118,0.4);">
                        <b class="text-xs color-green"><i class="fa-solid fa-terminal mr-1"></i> DEV-режим активен</b>
                        <div class="sub-label" style="font-size:8.5px;">Тема Matrix применена автоматически. Кастомные цвета отключены.</div>
                    </div>
                `}
            `;
        }
        // -------- НИК --------
        else if (curTab === 'nick') {
            let listHtml = "";
            this.nickEffects.forEach(fx => {
                const isOwned = ownedNicks.includes(fx.id);
                const isCur = curNickFx === fx.id;
                let actionBtn = "";
                if (isCur) actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Надето ✓</button>`;
                else if (isOwned) actionBtn = `<button onclick="ThemeManager.setNickEffect('${fx.id}')" class="btn btn-cyan btn-sm btn-auto">Выбрать</button>`;
                else {
                    let starsTxt = fx.reqStars ? ` + ${fx.reqStars} ⭐` : "";
                    actionBtn = `<button onclick="ThemeManager.buyNickEffect('${fx.id}', ${fx.cost}, ${fx.reqStars})" class="btn btn-green btn-sm btn-auto">${fx.cost.toLocaleString()} ₽${starsTxt}</button>`;
                }

                const previewClass = fx.className ? fx.className : '';
                const previewText = fx.id === 'none' ? 'Ace!' : 'Перекуп';

                listHtml += `
                    <div class="glass-card p-3 mb-2 ${isCur ? 'personal-car-card' : ''}">
                        <div class="flex-between mb-2">
                            <b class="text-xs color-cyan">${fx.name}</b>
                            ${isCur ? '<span class="tag-badge bg-tag-green" style="font-size:7.5px;">АКТИВНО</span>' : ''}
                        </div>

                        <div class="nick-preview-box mb-2">
                            <span class="nick-preview-text ${previewClass}">${previewText}</span>
                        </div>

                        <div class="sub-label mb-2" style="font-size:8.5px;">${fx.desc}</div>

                        ${actionBtn}
                    </div>
                `;
            });
            bodyHtml = `<div class="sub-label mb-2" style="font-size:9.5px;">6 продвинутых эффектов для никнейма:</div><div class="space-y-1 mb-2" style="max-height:400px; overflow-y:auto;">${listHtml}</div>`;
        }
        // -------- АВАТАР --------
        else if (curTab === 'avatar') {
            let listHtml = "";
            this.avatarEffects.forEach(fx => {
                const isOwned = ownedAvatars.includes(fx.id);
                const isCur = curAvatarFx === fx.id;
                let actionBtn = "";
                if (isCur) actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Надето ✓</button>`;
                else if (isOwned) actionBtn = `<button onclick="ThemeManager.setAvatarEffect('${fx.id}')" class="btn btn-cyan btn-sm btn-auto">Выбрать</button>`;
                else {
                    let starsTxt = fx.reqStars ? ` + ${fx.reqStars} ⭐` : "";
                    actionBtn = `<button onclick="ThemeManager.buyAvatarEffect('${fx.id}', ${fx.cost}, ${fx.reqStars})" class="btn btn-green btn-sm btn-auto">${fx.cost.toLocaleString()} ₽${starsTxt}</button>`;
                }

                const previewClass = fx.className ? fx.className : '';

                listHtml += `
                    <div class="glass-card p-3 mb-2 ${isCur ? 'personal-car-card' : ''}">
                        <div class="flex-between mb-2">
                            <b class="text-xs color-cyan">${fx.name}</b>
                            ${isCur ? '<span class="tag-badge bg-tag-green" style="font-size:7.5px;">АКТИВНО</span>' : ''}
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
            bodyHtml = `<div class="sub-label mb-2" style="font-size:9.5px;">8 продвинутых аур вокруг фото:</div><div class="space-y-1 mb-2" style="max-height:400px; overflow-y:auto;">${listHtml}</div>`;
        }
        // -------- ТИТУЛ --------
        else if (curTab === 'titles') {
            let listHtml = "";
            let pLvl = p.level || 1;

            this.traderTitles.forEach(t => {
                const isOwned = ownedTitles.includes(t.id) || t.cost === 0;
                const isCur = curTitle === t.title;
                const isLocked = pLvl < t.minLvl;

                let actionBtn = "";
                if (isCur) actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Выбран ✓</button>`;
                else if (isLocked) actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>🔒 ${t.minLvl} ур.</button>`;
                else if (isOwned) actionBtn = `<button onclick="ThemeManager.setTraderTitle('${t.id}')" class="btn btn-cyan btn-sm btn-auto">Выбрать</button>`;
                else actionBtn = `<button onclick="ThemeManager.buyTraderTitle('${t.id}', ${t.cost})" class="btn btn-green btn-sm btn-auto">${t.cost.toLocaleString()} ₽</button>`;

                listHtml += `
                    <div class="glass-card p-2 flex-between mb-2 ${isCur ? 'personal-car-card' : ''}">
                        <div style="flex:1; margin-right:8px;">
                            <div class="flex-gap" style="align-items:center;">
                                <b class="text-xs color-amber" style="font-size:11px;">${t.title}</b>
                                ${isCur ? '<span class="tag-badge bg-tag-green" style="font-size:7.5px;">АКТИВНО</span>' : ''}
                            </div>
                            <div class="sub-label mt-1" style="font-size:8.5px;">${t.desc}</div>
                        </div>
                        ${actionBtn}
                    </div>
                `;
            });
            bodyHtml = `<div class="sub-label mb-2" style="font-size:9.5px;">Титул отображается в профиле и чатах:</div><div class="space-y-1 mb-2" style="max-height:260px; overflow-y:auto;">${listHtml}</div>`;
        }

        modal.innerHTML = `
            <div class="modal-box" style="max-width:430px;">
                <div class="flex-between mb-2">
                    <div class="modal-glow-badge"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i> СТИЛЬ ПЕРЕКУПА</div>
                    <button onclick="ModalManager.close('modalHudCustomizer')" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

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
                        <button onclick="ThemeManager.setSoundProfile('cyber')" class="btn ${sProfile === 'cyber' ? 'btn-cyan' : 'btn-dark'} btn-sm btn-auto" style="padding:4px 8px; font-size:9px;">Кибер</button>
                        <button onclick="ThemeManager.setSoundProfile('relay')" class="btn ${sProfile === 'relay' ? 'btn-cyan' : 'btn-dark'} btn-sm btn-auto" style="padding:4px 8px; font-size:9px;">Реле</button>
                        <button onclick="ThemeManager.setSoundProfile('retro')" class="btn ${sProfile === 'retro' ? 'btn-cyan' : 'btn-dark'} btn-sm btn-auto" style="padding:4px 8px; font-size:9px;">Ретро</button>
                        <button onclick="ThemeManager.setSoundProfile('silent')" class="btn ${sProfile === 'silent' ? 'btn-cyan' : 'btn-dark'} btn-sm btn-auto" style="padding:4px 8px; font-size:9px;">Тишина</button>
                    </div>
                </div>

                <button onclick="ModalManager.close('modalHudCustomizer')" class="btn btn-cyan w-full font-bold">Применить и закрыть ✓</button>
            </div>
        `;
    },

    // --------------------------------------------------------
    // ДЕЙСТВИЯ
    // --------------------------------------------------------
    setThemeColor(colorId) {
        const isDev = (typeof window.isPcDevMode === 'function') ? window.isPcDevMode() : false;

        // ⭐ v3.2.0: в DEV-режиме нельзя менять тему
        if (isDev && colorId !== 'dev_matrix') {
            if (typeof showToast === 'function') showToast("🔧 В DEV-режиме тема фиксирована (Matrix)");
            return;
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

    toggleCyberTheme() {
        state.player.themePresetId = state.player.themePresetId === 'cyber_black_neo' ? 'default' : 'cyber_black_neo';
        if (typeof saveState === 'function') saveState();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('win');
        if (typeof showToast === 'function') {
            showToast(state.player.themePresetId === 'cyber_black_neo' ? "Cyber Black Neo активирована!" : "Иконки возвращены к классическим.");
        }
    },

    buyNickEffect(fxId, cost, reqStars = 0) {
        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;
        if (cash < cost) return showToast("Не хватает рублей!");
        if (stars < reqStars) return showToast(`Нужно ${reqStars} ⭐!`);

        state.player.cash -= cost;
        state.player.stars -= reqStars;

        if (!state.player.ownedNickEffects) state.player.ownedNickEffects = ['none'];
        if (!state.player.ownedNickEffects.includes(fxId)) state.player.ownedNickEffects.push(fxId);
        state.player.nickEffect = fxId;

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast("Эффект ника активирован!");
    },

    setNickEffect(fxId) {
        state.player.nickEffect = fxId;
        if (typeof saveState === 'function') saveState();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof showToast === 'function') showToast("Эффект ника установлен!");
    },

    buyAvatarEffect(fxId, cost, reqStars = 0) {
        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;
        if (cash < cost) return showToast("Не хватает рублей!");
        if (stars < reqStars) return showToast(`Нужно ${reqStars} ⭐!`);

        state.player.cash -= cost;
        state.player.stars -= reqStars;

        if (!state.player.ownedAvatarEffects) state.player.ownedAvatarEffects = ['none'];
        if (!state.player.ownedAvatarEffects.includes(fxId)) state.player.ownedAvatarEffects.push(fxId);
        state.player.avatarEffect = fxId;

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') showToast("Аура аватарки активирована!");
    },

    setAvatarEffect(fxId) {
        state.player.avatarEffect = fxId;
        if (typeof saveState === 'function') saveState();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof showToast === 'function') showToast("Аура установлена!");
    },

    buyTraderTitle(titleId, cost) {
        let cash = state.player?.cash || 0;
        if (cash < cost) return showToast("Не хватает денег!");
        state.player.cash -= cost;
        if (!state.player.ownedTitles) state.player.ownedTitles = ['cash_buyer'];
        if (!state.player.ownedTitles.includes(titleId)) state.player.ownedTitles.push(titleId);
        const found = this.traderTitles.find(t => t.id === titleId);
        if (found) state.player.traderTitle = found.title;
        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('win');
        if (typeof showToast === 'function') showToast("Титул активирован!");
    },

    setTraderTitle(titleId) {
        const found = this.traderTitles.find(t => t.id === titleId);
        if (found) {
            state.player.traderTitle = found.title;
            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            this.renderCustomizerModal();
            if (typeof playSound === 'function') playSound('tick');
            if (typeof showToast === 'function') showToast("Титул обновлён!");
        }
    },

    setSoundProfile(profile) {
        state.player.soundProfile = profile;
        if (typeof saveState === 'function') saveState();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof showToast === 'function') showToast("Звуковой профиль обновлён!");
    }
};

window.ThemeManager = ThemeManager;
window.HUD_SOLID_COLORS = ThemeManager.themes;
window.NICKNAME_EFFECTS_CATALOG = ThemeManager.nickEffects;
window.AVATAR_EFFECTS_CATALOG = ThemeManager.avatarEffects;

// Алиасы
window.openHudCustomizerModal = () => ThemeManager.openCustomizer();
window.switchCustomizerTab = (tab) => ThemeManager.switchTab(tab);
window.renderHudCustomizerContent = () => ThemeManager.renderCustomizerModal();
window.applyHudCustomization = () => ThemeManager.applyTheme();
window.setHudSolidColor = (id) => ThemeManager.setThemeColor(id);
window.setHudCustomHexColor = (hex) => ThemeManager.setCustomHex(hex);
window.toggleCyberIconsThemeAction = () => ThemeManager.toggleCyberTheme();
window.buyNickEffectAction = (id, c, s) => ThemeManager.buyNickEffect(id, c, s);
window.setNickEffectAction = (id) => ThemeManager.setNickEffect(id);
window.buyAvatarEffectAction = (id, c, s) => ThemeManager.buyAvatarEffect(id, c, s);
window.setAvatarEffectAction = (id) => ThemeManager.setAvatarEffect(id);
window.setSoundProfileAction = (p) => ThemeManager.setSoundProfile(p);

console.log('[🎨 theme-manager v3.4.0] 8 аур аватара + новые эффекты (Fire, Snow, Lava, Rim, Smoke) ✓');
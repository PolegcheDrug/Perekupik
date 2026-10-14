// ========================================================
// js/theme-manager.js — МЕНЕДЖЕР ТЕМ, АНИМАЦИЙ И КАСТОМИЗАЦИИ (v2.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ПОЛНЫЙ ФАЙЛ БЕЗ СОКРАЩЕНИЙ.
// Разгрузка ядра app.js: темы HUD, звуковые профили,
// анимации никнейма, ауры аватарок и титулы перекупа.
// ========================================================

const ThemeManager = {
    activeCustomizerTab: 'colors', // 'colors' | 'nick' | 'avatar' | 'titles' | 'sound'

    themes: [
        { 
            id: 'lightning', 
            name: 'Cyber Neon (Молния)', 
            hex: '#00f2fe', 
            secondaryHex: '#7928ca', 
            glow: 'rgba(0, 242, 254, 0.45)', 
            bgGrad: 'linear-gradient(135deg, #00f2fe, #7928ca)',
            isLightning: true,
            desc: 'Неоновый циан и фиолетовая гроза. Корпус смартфона мерцает молниями.'
        },
        { 
            id: 'sakura', 
            name: 'Tokyo Daikoku (Сакура)', 
            hex: '#f43f5e', 
            secondaryHex: '#c084fc', 
            glow: 'rgba(244, 63, 94, 0.45)', 
            bgGrad: 'linear-gradient(135deg, #f43f5e, #c084fc)',
            isLightning: false,
            desc: 'Атмосфера ночных сходок JDM. Оптитронный розовый и фиолетовый неон.'
        },
        { 
            id: 'gold', 
            name: 'Syndicate Gold (Олигарх)', 
            hex: '#ffd700', 
            secondaryHex: '#b45309', 
            glow: 'rgba(255, 215, 0, 0.45)', 
            bgGrad: 'linear-gradient(135deg, #ffd700, #b45309)',
            isLightning: false,
            desc: 'Матовый тёмный премиум с полированным золотом для авторитетов рынка.'
        },
        { 
            id: 'redline', 
            name: 'Redline Beast (Отсечка)', 
            hex: '#ff3366', 
            secondaryHex: '#991b1b', 
            glow: 'rgba(255, 51, 102, 0.45)', 
            bgGrad: 'linear-gradient(135deg, #ff3366, #991b1b)',
            isLightning: false,
            desc: 'Агрессивный рубиновый цвет. Стрелка тахометра в красной зоне.'
        },
        { 
            id: 'matrix', 
            name: 'Matrix Emerald (Терминал)', 
            hex: '#00e676', 
            secondaryHex: '#064e3b', 
            glow: 'rgba(0, 230, 118, 0.45)', 
            bgGrad: 'linear-gradient(135deg, #00e676, #064e3b)',
            isLightning: false,
            desc: 'Хакерский сканер Launch OBD2. Цифровой зелёный монохром.'
        },
        { 
            id: 'frost', 
            name: 'Arctic Frost (Лазурь)', 
            hex: '#38bdf8', 
            secondaryHex: '#1d4ed8', 
            glow: 'rgba(56, 189, 248, 0.45)', 
            bgGrad: 'linear-gradient(135deg, #38bdf8, #1d4ed8)',
            isLightning: false,
            desc: 'Холодная лазурь и арктический синий. Строгий чистый стиль.'
        }
    ],

    nickEffects: [
        { id: 'none', name: 'Классический белый', className: '', desc: 'Стандартный читаемый никнейм без переливов', cost: 0, reqStars: 0 },
        { id: 'lightning_spark', name: '⚡ Неоновый перелив', className: 'nick-fx-lightning', desc: 'Бегущий неоновый луч высокой энергии', cost: 75000, reqStars: 2 },
        { id: 'fire_flicker', name: '🔥 Пламя отсечки', className: 'nick-fx-fire', desc: 'Огненное мерцание прямоточного выхлопа', cost: 120000, reqStars: 3 },
        { id: 'gold_shimmer', name: '👑 Золотой слиток', className: 'nick-fx-gold', desc: 'Переливающийся блеск золота высшей пробы', cost: 250000, reqStars: 5 },
        { id: 'matrix_scan', name: '💻 Цифровой код', className: 'nick-fx-matrix', desc: 'Светящиеся терминальные символы матрицы', cost: 95000, reqStars: 2 },
        { id: 'sakura_drift', name: '🌸 Tokyo Sakura', className: 'nick-fx-sakura', desc: 'Мягкий градиент лепестков ночной Daikoku', cost: 140000, reqStars: 4 }
    ],

    avatarEffects: [
        { id: 'none', name: 'Базовый ободок', className: '', desc: 'Классическое статичное кольцо аватара', cost: 0, reqStars: 0 },
        { id: 'lightning_shield', name: '⚡ Кольцо молний', className: 'avatar-fx-lightning-ring', desc: 'Непрерывно вращающееся неоновое кольцо', cost: 90000, reqStars: 2 },
        { id: 'fire_shield', name: '🔥 Огненная плазма', className: 'avatar-fx-fire-ring', desc: 'Пульсирующий огненный ореол вокруг фото', cost: 135000, reqStars: 3 },
        { id: 'gold_shield', name: '👑 Корона Синдиката', className: 'avatar-fx-gold-ring', desc: 'Вращающаяся золотая аура высшего ранга', cost: 300000, reqStars: 6 },
        { id: 'matrix_shield', name: '💻 Кибер-щит', className: 'avatar-fx-matrix-ring', desc: 'Зелёный защитный импульс сканера', cost: 110000, reqStars: 2 },
        { id: 'sakura_shield', name: '🌸 Лепестки Сакуры', className: 'avatar-fx-sakura-ring', desc: 'Вращающийся японский неоновый ореол', cost: 150000, reqStars: 4 }
    ],

    traderTitles: [
        { id: 'cash_buyer', title: 'Быстрый выкуп за кэш 💸', minLvl: 1, cost: 0, desc: 'Деньги сразу на руки без проверок' },
        { id: 'classic_king', title: 'Король Боевой Классики 👑', minLvl: 3, cost: 45000, desc: 'Знает каждый винтик в жигулях и москвичах' },
        { id: 'hood_master', title: 'Торг строго у капота 🤝', minLvl: 5, cost: 80000, desc: 'Ни рубля скидки в переписке — только по факту' },
        { id: 'pro_scanner', title: 'Автоподбор от Бога 🔍', minLvl: 8, cost: 150000, desc: 'Видит шпаклёвку и смотанный пробег за версту' },
        { id: 'syndicate_boss', title: 'Синдикат 777 ⚡', minLvl: 15, cost: 500000, desc: 'Закрытые аукционы, распилы и оптовые поставки' }
    ],

    init() {
        this.applyTheme();
    },

    hexToRgba(hex, alpha = 0.5) {
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    },

    applyTheme() {
        const root = document.documentElement;
        if (!state.player) return;

        const curColorId = state.player.hudColorId || 'lightning';
        const customHex = state.player.customHexColor;
        const isCyberThemeActive = state.player.themePresetId === 'cyber_black_neo';

        let targetHex = "#00f2fe";
        let targetSecondaryHex = "#7928ca";
        let targetGlow = "rgba(0, 242, 254, 0.45)";
        let isLightning = false;

        if (customHex) {
            targetHex = customHex;
            targetSecondaryHex = "#0284c7";
            targetGlow = this.hexToRgba(customHex, 0.45);
        } else {
            const found = this.themes.find(t => t.id === curColorId) || this.themes[0];
            targetHex = found.hex;
            targetSecondaryHex = found.secondaryHex;
            targetGlow = found.glow;
            isLightning = !!found.isLightning;
        }

        // Обновляем CSS-переменные
        root.style.setProperty('--cyan', targetHex);
        root.style.setProperty('--cyan-glow', targetGlow);
        root.style.setProperty('--border-glow', this.hexToRgba(targetHex, 0.35));
        root.style.setProperty('--lightning-secondary', targetSecondaryHex);
        root.style.setProperty('--custom-fx-color', targetHex);
        root.style.setProperty('--custom-fx-glow', targetGlow);

        // Корпус телефона Perekup OS
        const phoneDevice = document.querySelector('.phone-device-wrapper');
        if (phoneDevice) {
            if (isCyberThemeActive) {
                phoneDevice.classList.add('theme-cyber-icons');
            } else {
                phoneDevice.classList.remove('theme-cyber-icons');
            }

            // Динамический неоновый контур под выбранный цвет
            phoneDevice.style.borderColor = targetHex;
            phoneDevice.style.boxShadow = `0 20px 50px rgba(0, 0, 0, 0.9), inset 0 0 25px ${targetGlow}, 0 0 30px ${this.hexToRgba(targetSecondaryHex, 0.35)}`;

            if (isLightning) {
                phoneDevice.classList.add('theme-lightning-active');
            } else {
                phoneDevice.classList.remove('theme-lightning-active');
            }
        }

        // Эффект никнейма
        const nameEl = document.getElementById('playerName');
        const nickFxId = state.player.nickEffect || 'none';
        if (nameEl) {
            this.nickEffects.forEach(fx => {
                if (fx.className) nameEl.classList.remove(fx.className);
            });
            const activeFx = this.nickEffects.find(fx => fx.id === nickFxId);
            if (activeFx && activeFx.className) {
                nameEl.classList.add(activeFx.className);
            }
        }

        // Эффект аватара
        const ringEl = document.querySelector('.avatar-ring');
        const avatarFxId = state.player.avatarEffect || 'none';
        if (ringEl) {
            this.avatarEffects.forEach(fx => {
                if (fx.className) ringEl.classList.remove(fx.className);
            });
            const activeAvatarFx = this.avatarEffects.find(fx => fx.id === avatarFxId);
            if (activeAvatarFx && activeAvatarFx.className) {
                ringEl.classList.add(activeAvatarFx.className);
            }
        }
    },

    openCustomizer() {
        this.renderCustomizerModal();
        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalHudCustomizer');
        } else {
            let m = document.getElementById('modalHudCustomizer');
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
        const curColorId = p.hudColorId || 'lightning';
        const curNickFx = p.nickEffect || 'none';
        const curAvatarFx = p.avatarEffect || 'none';
        const curTitle = p.traderTitle || 'Быстрый выкуп за кэш 💸';
        const ownedNicks = p.ownedNickEffects || ['none'];
        const ownedAvatars = p.ownedAvatarEffects || ['none'];
        const ownedTitles = p.ownedTitles || ['cash_buyer'];
        const sProfile = p.soundProfile || 'cyber';
        const isCyberTheme = p.themePresetId === 'cyber_black_neo';

        let bodyHtml = "";

        if (curTab === 'colors') {
            let colorsGrid = "";
            this.themes.forEach(c => {
                const isSel = curColorId === c.id && !p.customHexColor;
                colorsGrid += `
                    <div class="color-palette-tile ${isSel ? 'selected' : ''}" onclick="ThemeManager.setThemeColor('${c.id}')" style="--tile-color:${c.hex}; position:relative;">
                        <div class="color-palette-swatch" style="background:${c.bgGrad || c.hex}; box-shadow:0 0 10px ${c.glow};"></div>
                        <div style="flex:1; min-width:0;">
                            <div class="color-palette-name">${c.name}</div>
                            <div class="sub-label" style="font-size:7.5px; line-height:1.1; color:#94a3b8;">${c.desc || ''}</div>
                        </div>
                        ${isSel ? '<i class="fa-solid fa-check color-check"></i>' : ''}
                    </div>
                `;
            });

            bodyHtml = `
                <div class="glass-card p-2 mb-2 flex-between" style="background:#090e18; border-color: ${isCyberTheme ? 'var(--green)' : 'var(--border-glass)'};">
                    <div>
                        <b class="text-xs color-green"><i class="fa-solid fa-terminal mr-1"></i> Тема «Cyber Black Neo»</b>
                        <div class="sub-label" style="font-size:8.5px;">Матовые чёрные иконки с подсветкой контуров в стиле DEV</div>
                    </div>
                    <button onclick="ThemeManager.toggleCyberTheme()" class="btn ${isCyberTheme ? 'btn-green' : 'btn-dark'} btn-sm btn-auto" style="font-size:9px;">
                        ${isCyberTheme ? 'ВКЛЮЧЕНА ✓' : 'ВКЛЮЧИТЬ'}
                    </button>
                </div>

                <div class="sub-label mb-2" style="font-size:9.5px;">Выберите готовую палитру HUD и неонового корпуса:</div>
                <div class="hud-colors-palette-grid mb-2">
                    ${colorsGrid}
                </div>

                <div class="glass-card p-2 flex-between mb-2">
                    <div>
                        <b class="text-xs color-cyan"><i class="fa-solid fa-eye-dropper mr-1"></i> Свой цвет (Color Picker)</b>
                        <div class="sub-label" style="font-size:8.5px;">Установите любой кастомный оттенок из палитры</div>
                    </div>
                    <input type="color" value="${p.customHexColor || '#00f2fe'}" onchange="ThemeManager.setCustomHex(this.value)" style="width:36px; height:32px; border:none; background:transparent; cursor:pointer;">
                </div>
            `;
        } else if (curTab === 'nick') {
            let listHtml = "";
            this.nickEffects.forEach(fx => {
                const isOwned = ownedNicks.includes(fx.id);
                const isCur = curNickFx === fx.id;

                let actionBtn = "";
                if (isCur) {
                    actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Надето ✓</button>`;
                } else if (isOwned) {
                    actionBtn = `<button onclick="ThemeManager.setNickEffect('${fx.id}')" class="btn btn-cyan btn-sm btn-auto">Выбрать</button>`;
                } else {
                    let starsTxt = fx.reqStars ? ` + ${fx.reqStars} 💵` : "";
                    actionBtn = `<button onclick="ThemeManager.buyNickEffect('${fx.id}', ${fx.cost}, ${fx.reqStars})" class="btn btn-green btn-sm btn-auto">${fx.cost.toLocaleString()} ₽${starsTxt}</button>`;
                }

                listHtml += `
                    <div class="glass-card p-2 flex-between mb-2 ${isCur ? 'personal-car-card' : ''}">
                        <div style="flex:1; margin-right:8px;">
                            <div class="flex-gap" style="align-items:center;">
                                <span class="text-xs font-bold ${fx.className}" style="font-size:12px;">${fx.name}</span>
                                ${isCur ? '<span class="tag-badge bg-tag-green" style="font-size:7.5px;">АКТИВНО</span>' : ''}
                            </div>
                            <div class="sub-label mt-1" style="font-size:8.5px;">${fx.desc}</div>
                        </div>
                        ${actionBtn}
                    </div>
                `;
            });
            bodyHtml = `<div class="sub-label mb-2" style="font-size:9.5px;">Анимированные эффекты перелива для никнейма:</div><div class="space-y-1 mb-2" style="max-height:260px; overflow-y:auto;">${listHtml}</div>`;
        } else if (curTab === 'avatar') {
            let listHtml = "";
            this.avatarEffects.forEach(fx => {
                const isOwned = ownedAvatars.includes(fx.id);
                const isCur = curAvatarFx === fx.id;

                let actionBtn = "";
                if (isCur) {
                    actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Надето ✓</button>`;
                } else if (isOwned) {
                    actionBtn = `<button onclick="ThemeManager.setAvatarEffect('${fx.id}')" class="btn btn-cyan btn-sm btn-auto">Выбрать</button>`;
                } else {
                    let starsTxt = fx.reqStars ? ` + ${fx.reqStars} 💵` : "";
                    actionBtn = `<button onclick="ThemeManager.buyAvatarEffect('${fx.id}', ${fx.cost}, ${fx.reqStars})" class="btn btn-green btn-sm btn-auto">${fx.cost.toLocaleString()} ₽${starsTxt}</button>`;
                }

                listHtml += `
                    <div class="glass-card p-2 flex-between mb-2 ${isCur ? 'personal-car-card' : ''}">
                        <div style="flex:1; margin-right:8px;">
                            <div class="flex-gap" style="align-items:center;">
                                <b class="text-xs color-cyan">${fx.name}</b>
                                ${isCur ? '<span class="tag-badge bg-tag-green" style="font-size:7.5px;">АКТИВНО</span>' : ''}
                            </div>
                            <div class="sub-label mt-1" style="font-size:8.5px;">${fx.desc}</div>
                        </div>
                        ${actionBtn}
                    </div>
                `;
            });
            bodyHtml = `<div class="sub-label mb-2" style="font-size:9.5px;">Вращающиеся неоновые ауры вокруг фото:</div><div class="space-y-1 mb-2" style="max-height:260px; overflow-y:auto;">${listHtml}</div>`;
        } else if (curTab === 'titles') {
            let listHtml = "";
            let pLvl = p.level || 1;

            this.traderTitles.forEach(t => {
                const isOwned = ownedTitles.includes(t.id) || t.cost === 0;
                const isCur = curTitle === t.title;
                const isLocked = pLvl < t.minLvl;

                let actionBtn = "";
                if (isCur) {
                    actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>Выбран ✓</button>`;
                } else if (isLocked) {
                    actionBtn = `<button class="btn btn-dark btn-sm btn-auto opacity-50" disabled>🔒 ${t.minLvl} ур.</button>`;
                } else if (isOwned) {
                    actionBtn = `<button onclick="ThemeManager.setTraderTitle('${t.id}')" class="btn btn-cyan btn-sm btn-auto">Выбрать</button>`;
                } else {
                    actionBtn = `<button onclick="ThemeManager.buyTraderTitle('${t.id}', ${t.cost})" class="btn btn-green btn-sm btn-auto">${t.cost.toLocaleString()} ₽</button>`;
                }

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
            bodyHtml = `<div class="sub-label mb-2" style="font-size:9.5px;">Титул отображается в вашем профиле и в чатах сделок:</div><div class="space-y-1 mb-2" style="max-height:260px; overflow-y:auto;">${listHtml}</div>`;
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
                    <div class="flex-gap">
                        <button onclick="ThemeManager.setSoundProfile('cyber')" class="btn ${sProfile === 'cyber' ? 'btn-cyan' : 'btn-dark'} btn-sm btn-auto" style="padding:4px 8px; font-size:9px;">Кибер</button>
                        <button onclick="ThemeManager.setSoundProfile('relay')" class="btn ${sProfile === 'relay' ? 'btn-cyan' : 'btn-dark'} btn-sm btn-auto" style="padding:4px 8px; font-size:9px;">Реле</button>
                        <button onclick="ThemeManager.setSoundProfile('silent')" class="btn ${sProfile === 'silent' ? 'btn-cyan' : 'btn-dark'} btn-sm btn-auto" style="padding:4px 8px; font-size:9px;">Тишина</button>
                    </div>
                </div>

                <button onclick="ModalManager.close('modalHudCustomizer')" class="btn btn-cyan w-full font-bold">Применить и закрыть ✓</button>
            </div>
        `;
    },

    setThemeColor(colorId) {
        state.player.hudColorId = colorId;
        state.player.customHexColor = null;
        if (typeof saveState === 'function') saveState();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        showToast("Тема оформления успешно активирована!");
    },

    setCustomHex(hexValue) {
        state.player.customHexColor = hexValue;
        if (typeof saveState === 'function') saveState();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        showToast(`Установлен оттенок ${hexValue}!`);
    },

    toggleCyberTheme() {
        state.player.themePresetId = state.player.themePresetId === 'cyber_black_neo' ? 'default' : 'cyber_black_neo';
        if (typeof saveState === 'function') saveState();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(state.player.themePresetId === 'cyber_black_neo' ? "Тема Cyber Black Neo активирована!" : "Тема иконок возвращена к классической.");
    },

    buyNickEffect(fxId, cost, reqStars = 0) {
        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;

        if (cash < cost) return showToast("Не хватает рублей на покупку эффекта ника!");
        if (stars < reqStars) return showToast(`Нужно ${reqStars} 💵 банкнот!`);

        state.player.cash -= cost;
        state.player.stars -= reqStars;

        if (!state.player.ownedNickEffects) state.player.ownedNickEffects = ['none'];
        if (!state.player.ownedNickEffects.includes(fxId)) {
            state.player.ownedNickEffects.push(fxId);
        }
        state.player.nickEffect = fxId;

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Эффект никнейма приобретен и активирован!");
    },

    setNickEffect(fxId) {
        state.player.nickEffect = fxId;
        if (typeof saveState === 'function') saveState();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        showToast("Эффект ника установлен!");
    },

    buyAvatarEffect(fxId, cost, reqStars = 0) {
        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;

        if (cash < cost) return showToast("Не хватает рублей на покупку ауры аватарки!");
        if (stars < reqStars) return showToast(`Нужно ${reqStars} 💵 банкнот!`);

        state.player.cash -= cost;
        state.player.stars -= reqStars;

        if (!state.player.ownedAvatarEffects) state.player.ownedAvatarEffects = ['none'];
        if (!state.player.ownedAvatarEffects.includes(fxId)) {
            state.player.ownedAvatarEffects.push(fxId);
        }
        state.player.avatarEffect = fxId;

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Аура аватарки приобретена и активирована!");
    },

    setAvatarEffect(fxId) {
        state.player.avatarEffect = fxId;
        if (typeof saveState === 'function') saveState();
        this.applyTheme();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        showToast("Эффект аватарки установлен!");
    },

    buyTraderTitle(titleId, cost) {
        let cash = state.player?.cash || 0;
        if (cash < cost) return showToast("Не хватает денег на покупку титула!");

        state.player.cash -= cost;
        if (!state.player.ownedTitles) state.player.ownedTitles = ['cash_buyer'];
        if (!state.player.ownedTitles.includes(titleId)) {
            state.player.ownedTitles.push(titleId);
        }
        const found = this.traderTitles.find(t => t.id === titleId);
        if (found) state.player.traderTitle = found.title;

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Новый титул перекупа активирован!");
    },

    setTraderTitle(titleId) {
        const found = this.traderTitles.find(t => t.id === titleId);
        if (found) {
            state.player.traderTitle = found.title;
            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            this.renderCustomizerModal();
            if (typeof playSound === 'function') playSound('tick');
            showToast("Титул перекупа обновлен!");
        }
    },

    setSoundProfile(profile) {
        state.player.soundProfile = profile;
        if (typeof saveState === 'function') saveState();
        this.renderCustomizerModal();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
        showToast("Звуковой профиль обновлен!");
    }
};

// Экспорт глобальных функций для обратной совместимости с кнопками в HUD
window.ThemeManager = ThemeManager;
window.openHudCustomizerModal = () => ThemeManager.openCustomizer();
window.applyHudCustomization = () => ThemeManager.applyTheme();
window.setHudSolidColor = (id) => ThemeManager.setThemeColor(id);
window.setHudCustomHexColor = (hex) => ThemeManager.setCustomHex(hex);
window.toggleCyberIconsThemeAction = () => ThemeManager.toggleCyberTheme();
window.buyNickEffectAction = (id, c, s) => ThemeManager.buyNickEffect(id, c, s);
window.setNickEffectAction = (id) => ThemeManager.setNickEffect(id);
window.buyAvatarEffectAction = (id, c, s) => ThemeManager.buyAvatarEffect(id, c, s);
window.setAvatarEffectAction = (id) => ThemeManager.setAvatarEffect(id);
window.setSoundProfileAction = (p) => ThemeManager.setSoundProfile(p);

// ========================================================
// js/market/market-map.js — ИНТЕРАКТИВНЫЙ GPS-НАВИГАТОР АВТОРЫНКА (v3.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ========================================================

const MarketMap = {
    modalId: 'modalMarketMapContainer',
    selectedCarId: null,

    // Состояние навигации (Pan & Zoom)
    view: {
        x: 0,
        y: 0,
        zoom: 1,
        isDragging: false,
        startX: 0,
        startY: 0,
        initialPanX: 0,
        initialPanY: 0
    },

    // Районы города на виртуальном холсте (1200x1200 px)
    DISTRICTS: [
        { id: 'center', name: 'Центральный Сити', x: 600, y: 600, tag: 'ЦЕНТР' },
        { id: 'spalny', name: 'Западные Спальники', x: 260, y: 380, tag: 'ЖИЛОЙ' },
        { id: 'promzona', name: 'Северная Промзона', x: 920, y: 300, tag: 'ПРОМ' },
        { id: 'garages', name: 'ГСК «Северный Бокс»', x: 340, y: 920, tag: 'ГАРАЖИ' },
        { id: 'suburb', name: 'Южное Шоссе / Пригород', x: 940, y: 880, tag: 'ТРАССА' }
    ],

    getRadarRadius() {
        if (window.state?.player?.radarRadius) return window.state.player.radarRadius;
        if (window.state?.radarLevel) return 10 + window.state.radarLevel * 5;
        return 15;
    },

    show(feed) {
        const cars = feed || window.state?.marketFeed || [];
        this.selectedCarId = null;

        // Сброс позиции в центр карты
        this.view.zoom = 1;
        this.view.x = 0;
        this.view.y = 0;

        let modalEl = document.getElementById(this.modalId);
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = this.modalId;
            modalEl.className = 'market-map-overlay';
            document.body.appendChild(modalEl);
        }

        modalEl.innerHTML = this.renderMapHtml(cars);
        modalEl.style.display = 'flex';

        this._bindInteractions();

        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('medium');
    },

    close() {
        const modalEl = document.getElementById(this.modalId);
        if (modalEl) modalEl.style.display = 'none';
        this.selectedCarId = null;
        if (typeof playSound === 'function') playSound('tick');
    },

    // Обработка перетаскивания и жестов
    _bindInteractions() {
        const viewport = document.getElementById('mapViewport');
        const world = document.getElementById('mapWorld');
        if (!viewport || !world) return;

        const updateTransform = () => {
            world.style.transform = `translate(calc(-50% + ${this.view.x}px), calc(-50% + ${this.view.y}px)) scale(${this.view.zoom})`;
        };

        const onPointerDown = (e) => {
            // Если клик по кнопке или карточке — не перетаскиваем
            if (e.target.closest('.map-car-pin') || e.target.closest('.map-hud-car-card') || e.target.closest('.map-control-btn')) return;
            this.view.isDragging = true;
            this.view.startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            this.view.startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            this.view.initialPanX = this.view.x;
            this.view.initialPanY = this.view.y;
            viewport.style.cursor = 'grabbing';
        };

        const onPointerMove = (e) => {
            if (!this.view.isDragging) return;
            const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            const currentY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            const dx = currentX - this.view.startX;
            const dy = currentY - this.view.startY;

            // Ограничение сдвига карты (в пределах 450px)
            const maxPan = 420 * this.view.zoom;
            this.view.x = Math.max(-maxPan, Math.min(maxPan, this.view.initialPanX + dx));
            this.view.y = Math.max(-maxPan, Math.min(maxPan, this.view.initialPanY + dy));
            updateTransform();
        };

        const onPointerUp = () => {
            this.view.isDragging = false;
            if (viewport) viewport.style.cursor = 'grab';
        };

        viewport.onmousedown = onPointerDown;
        window.onmousemove = onPointerMove;
        window.onmouseup = onPointerUp;

        viewport.ontouchstart = onPointerDown;
        viewport.ontouchmove = onPointerMove;
        viewport.ontouchend = onPointerUp;

        updateTransform();
    },

    zoomIn() {
        this.view.zoom = Math.min(1.6, this.view.zoom + 0.2);
        this._applyTransform();
    },

    zoomOut() {
        this.view.zoom = Math.max(0.75, this.view.zoom - 0.2);
        this._applyTransform();
    },

    resetToCenter() {
        this.view.x = 0;
        this.view.y = 0;
        this.view.zoom = 1;
        this._applyTransform();
        if (typeof tgHaptic === 'function') tgHaptic('light');
    },

    _applyTransform() {
        const world = document.getElementById('mapWorld');
        if (world) {
            world.style.transform = `translate(calc(-50% + ${this.view.x}px), calc(-50% + ${this.view.y}px)) scale(${this.view.zoom})`;
        }
    },

    upgradeRadarPrompt() {
        const currentRadius = this.getRadarRadius();
        const cost = currentRadius * 7500;

        if (confirm(`📡 Улучшить радар до ${currentRadius + 10} км?\nСтоимость апгрейда: ${cost.toLocaleString()} ₽`)) {
            if ((window.state?.player?.cash || 0) < cost) {
                if (typeof showToast === 'function') showToast(`Не хватает денег! Нужно ${cost.toLocaleString()} ₽`);
                return;
            }

            window.state.player.cash -= cost;
            window.state.player.radarRadius = currentRadius + 10;
            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (typeof showToast === 'function') showToast(`📡 Радар расширен до ${currentRadius + 10} км!`);
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

            this.show(window.state.marketFeed || []);
        }
    },

    selectCar(carId) {
        this.selectedCarId = carId;
        const feed = window.state?.marketFeed || [];
        const car = feed.find(c => c && c.id === carId);
        const cardBox = document.getElementById('mapSelectedCarCardBox');

        if (!cardBox) return;

        if (!car) {
            cardBox.innerHTML = '';
            cardBox.style.display = 'none';
            return;
        }

        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');

        const fallbackUrl = car.fallback || 'assets/cars/economy/2101/vaz-2101.jpg';
        const rawImg = car.img || car.image || fallbackUrl;
        const carImg = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
        const estProfit = (car.marketValue || 0) - (car.price || 0);

        cardBox.style.display = 'block';
        cardBox.innerHTML = `
            <div class="map-hud-car-card">
                <button onclick="MarketMap.selectCar(null)" class="map-hud-close-btn">✕</button>
                <div class="map-hud-car-body">
                    <img src="${carImg}" class="map-hud-car-thumb" onerror="this.onerror=null; this.src='${fallbackUrl}';">
                    <div style="flex:1; min-width:0;">
                        <div class="map-hud-title">${car.name}</div>
                        <div class="map-hud-subtitle">
                            <span><i class="fa-solid fa-road"></i> ${(car.mileage || 85000).toLocaleString()} км</span>
                            <span><i class="fa-solid fa-shield"></i> ${car.condition || 80}%</span>
                        </div>
                        <div class="map-hud-price-row">
                            <span class="map-hud-price">${(car.price || 100000).toLocaleString()} ₽</span>
                            <span class="map-hud-profit ${estProfit >= 0 ? 'color-green' : 'color-red'}">
                                ${estProfit >= 0 ? '▲ +' : '▼ '}${estProfit.toLocaleString()} ₽
                            </span>
                        </div>
                    </div>
                </div>
                <div class="map-hud-actions">
                    <button onclick="MarketMap.actionCheckAutoteka('${car.id}')" class="btn btn-dark btn-sm">
                        <i class="fa-solid fa-file-waveform color-green"></i> Автотека
                    </button>
                    <button onclick="MarketMap.actionCallSeller('${car.id}')" class="btn btn-cyan btn-sm font-bold">
                        <i class="fa-solid fa-phone"></i> Позвонить
                    </button>
                </div>
            </div>
        `;
    },

    actionCallSeller(carId) {
        this.close();
        if (typeof initiateBuyMarketCar === 'function') {
            initiateBuyMarketCar(carId);
        } else {
            const cardEl = document.getElementById(`card_${carId}`);
            if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    actionCheckAutoteka(carId) {
        if (typeof openAutotekaModal === 'function') {
            openAutotekaModal(carId);
        }
    },

    renderMapHtml(cars) {
        const radiusKm = this.getRadarRadius();
        // Радиус сканера в пикселях на карте (600x600 центр)
        const radiusPx = Math.min(540, Math.max(180, radiusKm * 18));

        const mappedCars = (cars || []).map((car, idx) => {
            const district = this.DISTRICTS[idx % this.DISTRICTS.length];
            const seed = (car.id ? String(car.id).charCodeAt(0) : idx) * 17;
            const offsetX = ((seed % 160) - 80);
            const offsetY = (((seed * 5) % 160) - 80);

            const posX = Math.max(120, Math.min(1080, district.x + offsetX));
            const posY = Math.max(120, Math.min(1080, district.y + offsetY));

            const dx = posX - 600;
            const dy = posY - 600;
            const distFromCenter = Math.sqrt(dx * dx + dy * dy);
            const inRange = distFromCenter <= radiusPx;

            return { car, posX, posY, inRange };
        });

        // Отрисовка пинов
        const pinsHtml = mappedCars.map(({ car, posX, posY, inRange }) => {
            if (inRange) {
                return `
                    <div class="map-car-pin pin-active" 
                         style="left: ${posX}px; top: ${posY}px;" 
                         onclick="MarketMap.selectCar('${car.id}')">
                        <div class="pin-halo"></div>
                        <div class="pin-marker">
                            <i class="fa-solid fa-car-side"></i>
                        </div>
                        <div class="pin-pill">${(car.price / 1000).toFixed(0)}k ₽</div>
                    </div>
                `;
            } else {
                return `
                    <div class="map-car-pin pin-fog" 
                         style="left: ${posX}px; top: ${posY}px;" 
                         onclick="MarketMap.upgradeRadarPrompt()">
                        <div class="pin-marker-fog">❓</div>
                    </div>
                `;
            }
        }).join('');

        return `
            <style>
                .market-map-overlay {
                    position: fixed; inset: 0; z-index: 9999;
                    background: rgba(3, 7, 18, 0.92); backdrop-filter: blur(12px);
                    display: flex; align-items: center; justify-content: center; padding: 8px;
                }
                .market-map-box {
                    width: 100%; max-width: 460px; height: 92vh; max-height: 680px;
                    background: #060a14; border: 1.5px solid rgba(0, 242, 254, 0.35);
                    border-radius: 18px; box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 30px rgba(0,242,254,0.15);
                    overflow: hidden; display: flex; flex-direction: column; position: relative;
                }
                /* Шапка */
                .map-header {
                    padding: 8px 12px; display: flex; align-items: center; justify-content: space-between;
                    background: rgba(10, 16, 30, 0.95); border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    z-index: 20; gap: 6px;
                }
                .map-title-group {
                    display: flex; align-items: center; gap: 8px; min-width: 0;
                }
                .map-actions-group {
                    display: flex; align-items: center; gap: 6px; flex-shrink: 0;
                }
                /* Область просмотра навигатора */
                .map-viewport {
                    position: relative; flex: 1; width: 100%; height: 100%;
                    overflow: hidden; cursor: grab; background: #04070f;
                    user-select: none; -webkit-user-select: none;
                }
                /* Виртуальный мир */
                .map-world {
                    position: absolute; top: 50%; left: 50%; width: 1200px; height: 1200px;
                    transform-origin: center center; transition: transform 0.08s ease-out;
                    pointer-events: auto;
                }
                /* Векторный город */
                .map-svg-layer {
                    position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
                }
                /* Зона действия радара */
                .radar-pulse-ring {
                    position: absolute; top: 600px; left: 600px; transform: translate(-50%, -50%);
                    border-radius: 50%; border: 1.5px dashed rgba(0, 242, 254, 0.5);
                    background: radial-gradient(circle, rgba(0, 242, 254, 0.06) 0%, transparent 72%);
                    pointer-events: none; box-shadow: 0 0 25px rgba(0, 242, 254, 0.15);
                }
                .radar-scanner-beam {
                    position: absolute; top: 50%; left: 50%; width: 100%; height: 100%;
                    transform-origin: 0 0;
                    background: conic-gradient(from 0deg, rgba(0, 242, 254, 0.22) 0deg, transparent 50deg);
                    animation: radarBeamRotate 5s linear infinite; pointer-events: none;
                }
                @keyframes radarBeamRotate {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                /* База перекупа */
                .player-base-pin {
                    position: absolute; top: 600px; left: 600px; transform: translate(-50%, -50%);
                    width: 32px; height: 32px; border-radius: 50%;
                    background: linear-gradient(135deg, #00e676, #059669);
                    border: 3px solid #ffffff; box-shadow: 0 0 20px #00e676;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 14px; z-index: 10;
                }
                /* Пины авто */
                .map-car-pin {
                    position: absolute; transform: translate(-50%, -50%);
                    cursor: pointer; display: flex; flex-direction: column; align-items: center;
                    z-index: 20; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .map-car-pin:hover, .map-car-pin:active {
                    transform: translate(-50%, -50%) scale(1.3); z-index: 30;
                }
                .pin-halo {
                    position: absolute; width: 34px; height: 34px; border-radius: 50%;
                    background: rgba(0, 242, 254, 0.25); animation: haloPulse 2s infinite ease-out;
                    pointer-events: none;
                }
                @keyframes haloPulse {
                    0% { transform: scale(0.6); opacity: 1; }
                    100% { transform: scale(1.4); opacity: 0; }
                }
                .pin-marker {
                    width: 28px; height: 28px; border-radius: 50%;
                    background: linear-gradient(135deg, #00f2fe, #0284c7);
                    border: 2px solid #ffffff; box-shadow: 0 0 14px rgba(0, 242, 254, 0.9);
                    color: #040812; display: flex; align-items: center; justify-content: center;
                    font-size: 11px;
                }
                .pin-pill {
                    background: rgba(5, 10, 22, 0.92); border: 1px solid rgba(0, 242, 254, 0.6);
                    border-radius: 6px; padding: 2px 5px; font-size: 8.5px; font-weight: 900;
                    color: #67e8f9; margin-top: 2px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.8);
                }
                .pin-marker-fog {
                    width: 24px; height: 24px; border-radius: 50%;
                    background: rgba(30, 41, 59, 0.7); border: 1.5px dashed #64748b;
                    color: #94a3b8; display: flex; align-items: center; justify-content: center;
                    font-size: 11px; font-weight: bold;
                }
                /* Плашки районов */
                .district-tag-box {
                    position: absolute; transform: translate(-50%, -50%);
                    background: rgba(10, 18, 36, 0.75); border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 6px; padding: 3px 8px; pointer-events: none;
                    text-align: center;
                }
                .district-tag-label {
                    font-size: 9px; font-weight: 900; color: #94a3b8; letter-spacing: 0.6px; text-transform: uppercase;
                }
                .district-tag-sub {
                    font-size: 7px; font-weight: 700; color: var(--cyan); letter-spacing: 0.4px;
                }
                /* Плавающие кнопки управления зумом */
                .map-floating-controls {
                    position: absolute; right: 12px; top: 12px; display: flex; flex-direction: column;
                    gap: 6px; z-index: 40;
                }
                .map-control-btn {
                    width: 34px; height: 34px; border-radius: 10px;
                    background: rgba(11, 19, 36, 0.9); border: 1px solid rgba(0, 242, 254, 0.3);
                    color: #fff; font-size: 13px; font-weight: bold; display: flex;
                    align-items: center; justify-content: center; cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.6); transition: all 0.15s ease;
                }
                .map-control-btn:active {
                    transform: scale(0.92); background: rgba(0, 242, 254, 0.2);
                }
                /* Карточка авто снизу */
                .map-hud-car-card {
                    position: absolute; bottom: 10px; left: 10px; right: 10px;
                    background: rgba(6, 12, 24, 0.96); backdrop-filter: blur(10px);
                    border: 1.5px solid var(--cyan); border-radius: 14px;
                    padding: 8px 10px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.95);
                    z-index: 50; animation: hudSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes hudSlideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .map-hud-close-btn {
                    position: absolute; top: 4px; right: 8px; background: none; border: none;
                    color: #64748b; font-size: 15px; cursor: pointer; padding: 4px;
                }
                .map-hud-car-body {
                    display: flex; gap: 10px; align-items: center; margin-bottom: 8px;
                }
                .map-hud-car-thumb {
                    width: 76px; height: 50px; border-radius: 8px; object-fit: cover;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                }
                .map-hud-title {
                    font-size: 12.5px; font-weight: 900; color: #fff;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .map-hud-subtitle {
                    font-size: 9px; color: #94a3b8; display: flex; gap: 8px; margin: 2px 0;
                }
                .map-hud-price-row {
                    display: flex; align-items: baseline; gap: 6px;
                }
                .map-hud-price {
                    font-size: 13.5px; font-weight: 900; color: var(--green);
                }
                .map-hud-profit {
                    font-size: 9.5px; font-weight: 800;
                }
                .map-hud-actions {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
                }
                /* Подвал */
                .map-footer {
                    padding: 6px 12px; background: rgba(5, 10, 20, 0.95);
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    display: flex; justify-content: space-between; align-items: center;
                    font-size: 8.5px; color: #94a3b8; z-index: 20;
                }
            </style>

            <div class="market-map-box">
                <!-- ВЕРХНЯЯ ПАНЕЛЬ -->
                <div class="map-header">
                    <div class="map-title-group">
                        <span style="font-size:20px;">🗺️</span>
                        <div>
                            <b class="text-xs color-cyan" style="font-size:12px; display:block;">GPS Авторынок</b>
                            <span class="sub-label" style="font-size:8px;">Перетаскивайте карту пальцем</span>
                        </div>
                    </div>

                    <div class="map-actions-group">
                        <span class="tag-badge bg-tag-cyan" style="font-size:8.5px; padding:3px 6px;">
                            ${radiusKm} км
                        </span>
                        <button onclick="MarketMap.upgradeRadarPrompt()" class="btn btn-amber btn-sm btn-auto" style="padding:4px 8px; font-size:9px; height:28px;">
                            <i class="fa-solid fa-satellite-dish"></i> +Радар
                        </button>
                        <button onclick="MarketMap.close()" class="btn btn-dark btn-sm btn-auto" style="padding:4px 9px; height:28px;">✕</button>
                    </div>
                </div>

                <!-- ОБЛАСТЬ ПРОСМОТРА КАРТЫ -->
                <div class="map-viewport" id="mapViewport">
                    <!-- ПЛАВАЮЩИЕ КНОПКИ УПРАВЛЕНИЯ -->
                    <div class="map-floating-controls">
                        <button class="map-control-btn" onclick="MarketMap.zoomIn()" title="Приблизить">+</button>
                        <button class="map-control-btn" onclick="MarketMap.zoomOut()" title="Отдалить">−</button>
                        <button class="map-control-btn" onclick="MarketMap.resetToCenter()" title="В центр">🎯</button>
                    </div>

                    <!-- ВИРТУАЛЬНЫЙ ГОРОД (1200x1200px) -->
                    <div class="map-world" id="mapWorld">
                        <!-- ВЕКТОРНАЯ ДОРОЖНАЯ И ГОРОДСКАЯ СЕТКА -->
                        <svg class="map-svg-layer" viewBox="0 0 1200 1200">
                            <defs>
                                <pattern id="cityGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0, 242, 254, 0.04)" stroke-width="1"/>
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#cityGrid)" />

                            <!-- Кварталы города (полигоны) -->
                            <rect x="180" y="280" width="220" height="180" rx="8" fill="rgba(15, 23, 42, 0.45)" stroke="rgba(255,255,255,0.05)" stroke-width="1.5"/>
                            <rect x="780" y="220" width="260" height="190" rx="8" fill="rgba(15, 23, 42, 0.45)" stroke="rgba(255,255,255,0.05)" stroke-width="1.5"/>
                            <rect x="240" y="800" width="220" height="200" rx="8" fill="rgba(15, 23, 42, 0.45)" stroke="rgba(255,255,255,0.05)" stroke-width="1.5"/>
                            <rect x="800" y="760" width="240" height="220" rx="8" fill="rgba(15, 23, 42, 0.45)" stroke="rgba(255,255,255,0.05)" stroke-width="1.5"/>

                            <!-- Водная артерия (река) -->
                            <path d="M -50,480 C 300,560 450,400 650,480 C 850,560 1000,440 1250,520" fill="none" stroke="rgba(2, 132, 199, 0.22)" stroke-width="44" stroke-linecap="round"/>
                            <path d="M -50,480 C 300,560 450,400 650,480 C 850,560 1000,440 1250,520" fill="none" stroke="rgba(0, 242, 254, 0.45)" stroke-width="2" stroke-dasharray="6,4"/>

                            <!-- Внешняя кольцевая трасса (МКАД) -->
                            <circle cx="600" cy="600" r="480" fill="none" stroke="rgba(0, 242, 254, 0.25)" stroke-width="4" stroke-dasharray="14,6"/>
                            <!-- Центральное кольцо -->
                            <circle cx="600" cy="600" r="220" fill="none" stroke="rgba(255, 255, 255, 0.16)" stroke-width="3"/>

                            <!-- Главные осевые магистрали -->
                            <line x1="600" y1="0" x2="600" y2="1200" stroke="rgba(255, 255, 255, 0.18)" stroke-width="4"/>
                            <line x1="0" y1="600" x2="1200" y2="600" stroke="rgba(255, 255, 255, 0.18)" stroke-width="4"/>

                            <!-- Диагональные развязки -->
                            <line x1="180" y1="180" x2="1020" y2="1020" stroke="rgba(0, 242, 254, 0.1)" stroke-width="2" stroke-dasharray="5,5"/>
                            <line x1="1020" y1="180" x2="180" y2="1020" stroke="rgba(0, 242, 254, 0.1)" stroke-width="2" stroke-dasharray="5,5"/>
                        </svg>

                        <!-- ЗОНА ДЕЙСТВИЯ РАДАРА -->
                        <div class="radar-pulse-ring" style="width: ${radiusPx * 2}px; height: ${radiusPx * 2}px;">
                            <div class="radar-scanner-beam"></div>
                        </div>

                        <!-- БАЗА ПЕРЕКУПА (ИГРОК) -->
                        <div class="player-base-pin" title="Гараж / База перекупа">
                            🏠
                        </div>

                        <!-- ТАБЛИЧКИ РАЙОНОВ -->
                        <div class="district-tag-box" style="top: 240px; left: 920px;">
                            <div class="district-tag-label">Промзона</div>
                            <div class="district-tag-sub">Авторынок</div>
                        </div>
                        <div class="district-tag-box" style="top: 320px; left: 260px;">
                            <div class="district-tag-label">Спальники</div>
                            <div class="district-tag-sub">Дворы</div>
                        </div>
                        <div class="district-tag-box" style="top: 540px; left: 600px;">
                            <div class="district-tag-label" style="color:var(--cyan);">Центральный р-н</div>
                            <div class="district-tag-sub">Сити</div>
                        </div>
                        <div class="district-tag-box" style="top: 860px; left: 340px;">
                            <div class="district-tag-label">ГСК «Север»</div>
                            <div class="district-tag-sub">Гаражи</div>
                        </div>
                        <div class="district-tag-box" style="top: 820px; left: 940px;">
                            <div class="district-tag-label">Пригород</div>
                            <div class="district-tag-sub">Трасса М4</div>
                        </div>

                        <!-- ПИНЫ МАШИН -->
                        ${pinsHtml}
                    </div>

                    <!-- ВСПЛЫВАЮЩАЯ КАРТОЧКА АВТО ПРИ КЛИКЕ -->
                    <div id="mapSelectedCarCardBox" style="display:none;"></div>
                </div>

                <!-- ПОДВАЛ -->
                <div class="map-footer">
                    <span>🟢 База</span>
                    <span class="color-cyan">🔵 В зоне радара: ${mappedCars.filter(m => m.inRange).length}</span>
                    <span style="color:#64748b;">❓ Вне зоны: ${mappedCars.filter(m => !m.inRange).length}</span>
                </div>
            </div>
        `;
    }
};

window.MarketMap = MarketMap;
console.log('[🗺️ market-map v3.0.0] Интерактивный GPS-навигатор с перетаскиванием и зумом загружен ✓');

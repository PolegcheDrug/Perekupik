// ========================================================
// js/market/market-map.js — ИНТЕРАКТИВНАЯ НЕОНОВАЯ GPS-КАРТА АВТОРЫНКА (v2.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ========================================================

const MarketMap = {
    modalId: 'modalMarketMapContainer',
    selectedCarId: null,

    // Районы города и их координаты на координатной сетке (0-100%)
    DISTRICTS: [
        { id: 'center', name: 'Центральный р-н', x: 50, y: 50, dist: 0 },
        { id: 'spalny', name: 'Спальные микрорайоны', x: 25, y: 28, dist: 18 },
        { id: 'promzona', name: 'Промзона / Авторынок', x: 74, y: 22, dist: 22 },
        { id: 'garages', name: 'Гаражный массив "Север"', x: 30, y: 76, dist: 20 },
        { id: 'suburb', name: 'Пригород / Посёлок', x: 78, y: 72, dist: 26 }
    ],

    getRadarRadius() {
        if (window.state?.player?.radarRadius) return window.state.player.radarRadius;
        if (window.state?.radarLevel) return 10 + window.state.radarLevel * 5;
        return 15; // Базовый радиус 15 км
    },

    show(feed) {
        const cars = feed || window.state?.marketFeed || [];
        this.selectedCarId = null;

        let modalEl = document.getElementById(this.modalId);
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = this.modalId;
            modalEl.className = 'market-map-overlay';
            document.body.appendChild(modalEl);
        }

        modalEl.innerHTML = this.renderMapHtml(cars);
        modalEl.style.display = 'flex';

        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('medium');
    },

    close() {
        const modalEl = document.getElementById(this.modalId);
        if (modalEl) modalEl.style.display = 'none';
        this.selectedCarId = null;
        if (typeof playSound === 'function') playSound('tick');
    },

    upgradeRadarPrompt() {
        const currentRadius = this.getRadarRadius();
        const cost = currentRadius * 8000;

        if (confirm(`📡 Улучшить радар до ${currentRadius + 8} км?\nСтоимость апгрейда: ${cost.toLocaleString()} ₽`)) {
            if ((window.state?.player?.cash || 0) < cost) {
                if (typeof showToast === 'function') showToast(`Не хватает денег! Нужно ${cost.toLocaleString()} ₽`);
                return;
            }

            window.state.player.cash -= cost;
            window.state.player.radarRadius = currentRadius + 8;
            if (typeof saveState === 'function') saveState();
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            if (typeof showToast === 'function') showToast(`📡 Радар расширен до ${currentRadius + 8} км!`);
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
        const radiusPct = Math.min(48, Math.max(16, radiusKm * 1.5));

        // Распределяем машины по координатам районов с небольшим разбросом
        const mappedCars = (cars || []).map((car, idx) => {
            const district = this.DISTRICTS[idx % this.DISTRICTS.length];
            // Псевдослучайное смещение внутри района
            const seed = (car.id ? String(car.id).charCodeAt(0) : idx) * 11;
            const offsetX = ((seed % 14) - 7);
            const offsetY = (((seed * 7) % 14) - 7);

            const posX = Math.max(8, Math.min(92, district.x + offsetX));
            const posY = Math.max(8, Math.min(92, district.y + offsetY));

            // Расстояние от центра (50, 50)
            const dx = posX - 50;
            const dy = posY - 50;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const inRange = distance <= radiusPct;

            return { car, posX, posY, inRange };
        });

        // Генерация пинов машин
        const pinsHtml = mappedCars.map(({ car, posX, posY, inRange }) => {
            if (inRange) {
                return `
                    <div class="map-car-pin pin-active" 
                         style="left: ${posX}%; top: ${posY}%;" 
                         onclick="MarketMap.selectCar('${car.id}')"
                         title="${car.name}">
                        <div class="pin-marker">
                            <i class="fa-solid fa-car-side"></i>
                        </div>
                        <div class="pin-label">${(car.price / 1000).toFixed(0)}k</div>
                    </div>
                `;
            } else {
                return `
                    <div class="map-car-pin pin-fog" 
                         style="left: ${posX}%; top: ${posY}%;" 
                         onclick="MarketMap.upgradeRadarPrompt()"
                         title="Вне зоны сканирования радара">
                        <div class="pin-marker-fog">❓</div>
                    </div>
                `;
            }
        }).join('');

        return `
            <style>
                .market-map-overlay {
                    position: fixed; inset: 0; z-index: 9999;
                    background: rgba(3, 7, 18, 0.88); backdrop-filter: blur(10px);
                    display: flex; align-items: center; justify-content: center; padding: 12px;
                }
                .market-map-box {
                    width: 100%; max-width: 440px; background: #070d18;
                    border: 1.5px solid rgba(0, 242, 254, 0.4); border-radius: 16px;
                    box-shadow: 0 0 35px rgba(0, 242, 254, 0.15), inset 0 0 20px rgba(0, 0, 0, 0.8);
                    overflow: hidden; display: flex; flex-direction: column; position: relative;
                }
                .map-header {
                    padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;
                    background: rgba(10, 18, 32, 0.85); border-bottom: 1px solid rgba(0, 242, 254, 0.2);
                }
                .map-canvas-area {
                    position: relative; width: 100%; height: 420px;
                    background: radial-gradient(circle at center, #0a1324 0%, #040812 100%);
                    overflow: hidden;
                }
                /* Сетка и дороги города */
                .map-roads-svg {
                    position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
                }
                /* Анимированный радар */
                .radar-pulse-ring {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    border-radius: 50%; border: 2px dashed rgba(0, 242, 254, 0.6);
                    background: radial-gradient(circle, rgba(0, 242, 254, 0.08) 0%, transparent 70%);
                    box-shadow: 0 0 20px rgba(0, 242, 254, 0.25), inset 0 0 15px rgba(0, 242, 254, 0.1);
                    pointer-events: none;
                }
                .radar-sweep-cone {
                    position: absolute; top: 50%; left: 50%; width: 100%; height: 100%;
                    transform-origin: 0 0;
                    background: conic-gradient(from 0deg, rgba(0, 242, 254, 0.25) 0deg, transparent 60deg);
                    animation: radarSweep 4s linear infinite; pointer-events: none;
                }
                @keyframes radarSweep {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                /* База перекупа */
                .player-base-pin {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 28px; height: 28px; border-radius: 50%;
                    background: #00e676; border: 3px solid #fff;
                    box-shadow: 0 0 16px #00e676; display: flex; align-items: center; justify-content: center;
                    font-size: 13px; z-index: 10;
                }
                /* Пины авто */
                .map-car-pin {
                    position: absolute; transform: translate(-50%, -50%);
                    cursor: pointer; display: flex; flex-direction: column; align-items: center;
                    z-index: 20; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .map-car-pin:hover, .map-car-pin:active {
                    transform: translate(-50%, -50%) scale(1.25); z-index: 30;
                }
                .pin-marker {
                    width: 26px; height: 26px; border-radius: 50%;
                    background: linear-gradient(135deg, #00f2fe, #4facfe);
                    border: 2px solid #fff; box-shadow: 0 0 12px rgba(0, 242, 254, 0.8);
                    color: #000; display: flex; align-items: center; justify-content: center; font-size: 11px;
                }
                .pin-label {
                    background: rgba(5, 10, 20, 0.85); border: 1px solid rgba(0, 242, 254, 0.5);
                    border-radius: 4px; padding: 1px 4px; font-size: 8px; font-weight: 800;
                    color: #00f2fe; margin-top: 2px; white-space: nowrap;
                }
                .pin-marker-fog {
                    width: 22px; height: 22px; border-radius: 50%;
                    background: rgba(100, 116, 139, 0.4); border: 1.5px solid #64748b;
                    color: #cbd5e1; display: flex; align-items: center; justify-content: center;
                    font-size: 10px; font-weight: bold;
                }
                /* Районы */
                .district-label {
                    position: absolute; font-size: 8.5px; font-weight: 800; color: rgba(148, 163, 184, 0.45);
                    text-transform: uppercase; letter-spacing: 0.8px; pointer-events: none;
                    transform: translate(-50%, -50%); white-space: nowrap;
                }
                /* Карточка авто внизу */
                .map-hud-car-card {
                    position: absolute; bottom: 8px; left: 8px; right: 8px;
                    background: rgba(8, 14, 26, 0.95); backdrop-filter: blur(8px);
                    border: 1.5px solid var(--cyan); border-radius: 12px;
                    padding: 8px 10px; box-shadow: 0 0 25px rgba(0, 0, 0, 0.9);
                    z-index: 50; animation: hudCardIn 0.25s ease-out;
                }
                @keyframes hudCardIn {
                    0% { transform: translateY(20px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .map-hud-close-btn {
                    position: absolute; top: 4px; right: 8px; background: none; border: none;
                    color: #64748b; font-size: 14px; cursor: pointer;
                }
                .map-hud-car-body {
                    display: flex; gap: 8px; align-items: center; margin-bottom: 6px;
                }
                .map-hud-car-thumb {
                    width: 72px; height: 48px; border-radius: 6px; object-fit: cover;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                }
                .map-hud-title {
                    font-size: 12px; font-weight: bold; color: #fff;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .map-hud-subtitle {
                    font-size: 9px; color: #94a3b8; display: flex; gap: 8px; margin: 2px 0;
                }
                .map-hud-price-row {
                    display: flex; align-items: baseline; gap: 6px;
                }
                .map-hud-price {
                    font-size: 13px; font-weight: 900; color: var(--green);
                }
                .map-hud-profit {
                    font-size: 9px; font-weight: bold;
                }
                .map-hud-actions {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
                }
                /* Легенда */
                .map-footer-legend {
                    padding: 8px 12px; background: rgba(5, 10, 20, 0.9);
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    display: flex; justify-content: space-around; font-size: 9px; color: #94a3b8;
                }
            </style>

            <div class="market-map-box">
                <!-- ШАПКА -->
                <div class="map-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:22px;">🗺️</span>
                        <div>
                            <b class="text-xs color-cyan" style="font-size:13px; display:block;">Карта авторынка</b>
                            <span class="sub-label" style="font-size:8.5px;">Поиск объявлений по районам</span>
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="tag-badge bg-tag-cyan" style="font-size:9.5px; padding:3px 7px;">
                            Радиус: ${radiusKm} км
                        </span>
                        <button onclick="MarketMap.upgradeRadarPrompt()" class="btn btn-amber btn-sm" style="font-size:9.5px; padding:4px 8px; font-weight:bold;">
                            📡 Радар +
                        </button>
                        <button onclick="MarketMap.close()" class="btn btn-dark btn-sm btn-auto" style="padding:4px 8px;">✕</button>
                    </div>
                </div>

                <!-- ХОЛСТ КАРТЫ -->
                <div class="map-canvas-area" onclick="if(event.target===this) MarketMap.selectCar(null);">
                    <!-- ВЕКТОРНЫЙ ГОРОД (SVG) -->
                    <svg class="map-roads-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <!-- Сетка кварталов -->
                        <defs>
                            <pattern id="gridPattern" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(0, 242, 254, 0.05)" stroke-width="0.5"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#gridPattern)" />

                        <!-- Река -->
                        <path d="M 0,40 Q 25,60 55,45 T 100,65" fill="none" stroke="rgba(0, 150, 255, 0.18)" stroke-width="6" stroke-linecap="round"/>
                        <path d="M 0,40 Q 25,60 55,45 T 100,65" fill="none" stroke="rgba(0, 242, 254, 0.3)" stroke-width="1" stroke-dasharray="2,2"/>

                        <!-- Главные магистрали -->
                        <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.8"/>
                        <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.8"/>

                        <!-- Кольцевая дорога (МКАД) -->
                        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(0, 242, 254, 0.22)" stroke-width="1.2" stroke-dasharray="4,2"/>
                        <!-- Малое кольцо -->
                        <circle cx="50" cy="50" r="20" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1"/>

                        <!-- Диагональные развязки -->
                        <line x1="15" y1="15" x2="85" y2="85" stroke="rgba(255, 255, 255, 0.06)" stroke-width="1"/>
                        <line x1="85" y1="15" x2="15" y2="85" stroke="rgba(255, 255, 255, 0.06)" stroke-width="1"/>
                    </svg>

                    <!-- НАЗВАНИЯ РАЙОНОВ -->
                    <div class="district-label" style="top: 15%; left: 74%;">Промзона / Авторынок</div>
                    <div class="district-label" style="top: 20%; left: 25%;">Спальные микрорайоны</div>
                    <div class="district-label" style="top: 42%; left: 50%; color:rgba(0,242,254,0.7);">Центральный р-н</div>
                    <div class="district-label" style="top: 85%; left: 30%;">Гаражный массив "Север"</div>
                    <div class="district-label" style="top: 80%; left: 78%;">Пригород / Посёлок</div>

                    <!-- ЗОНА СКАНИРОВАНИЯ РАДАРА -->
                    <div class="radar-pulse-ring" style="width: ${radiusPct * 2}%; height: ${radiusPct * 2}%;">
                        <div class="radar-sweep-cone"></div>
                    </div>

                    <!-- БАЗА ПЕРЕКУПА (ИГРОК) -->
                    <div class="player-base-pin" title="Ваша база">
                        🏠
                    </div>

                    <!-- АВТОМОБИЛИ -->
                    ${pinsHtml}

                    <!-- КАРТОЧКА ВЫБРАННОГО АВТО ПРИ КЛИКЕ -->
                    <div id="mapSelectedCarCardBox" style="display:none;"></div>
                </div>

                <!-- ЛЕГЕНДА -->
                <div class="map-footer-legend">
                    <span>🟢 База перекупа</span>
                    <span class="color-cyan">🔵 Доступные авто (${mappedCars.filter(m => m.inRange).length})</span>
                    <span style="color:#64748b;">❓ Вне зоны радара (${mappedCars.filter(m => !m.inRange).length})</span>
                </div>
            </div>
        `;
    }
};

window.MarketMap = MarketMap;
console.log('[🗺️ market-map v2.0.0] Интерактивная неоновая GPS-карта авторынка загружена ✓');

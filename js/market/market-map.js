/**
 * market-map.js
 * Интерактивная карта авторынка с радиусом поиска, районами и точками объявлений.
 */

const MarketMap = {
    canvas: null,
    ctx: null,
    container: null,
    isActive: false,

    // Центр города / база игрока (в процентах от 0 до 100)
    playerBase: {
        x: 50,
        y: 50,
        name: "Мой Гараж / Офис"
    },

    // Настройки радиуса поиска (в виртуальных километрах)
    currentRadiusKm: 15, // Стартовый радиус
    maxRadiusKm: 60,
    radiusLevels: [
        { level: 1, radiusKm: 15, cost: 0, title: "Пеший перекуп (Свой район)" },
        { level: 2, radiusKm: 30, cost: 35000, title: "Городской подбор (Весь город)" },
        { level: 3, radiusKm: 45, cost: 90000, title: "Областной радар (Пригород + Гаражи)" },
        { level: 4, radiusKm: 60, cost: 200000, title: "Федеральная сеть (Вся область)" }
    ],
    currentRadiusLevel: 1,

    // Районы города
    districts: [
        { id: 'center', name: 'Центральный р-н', x: 50, y: 50, radius: 12, priceMod: 1.15, desc: 'Премиум и ухоженные авто' },
        { id: 'sleep', name: 'Спальные микрорайоны', x: 28, y: 35, radius: 16, priceMod: 1.0, desc: 'Эконом и семейные авто' },
        { id: 'industrial', name: 'Промзона / Авторынок', x: 75, y: 30, radius: 15, priceMod: 0.92, desc: 'Срочный выкуп, битые авто' },
        { id: 'garages', name: 'Гаражный массив "Север"', x: 35, y: 80, radius: 14, priceMod: 0.85, desc: 'Капсулы времени, авто под проект' },
        { id: 'suburb', name: 'Пригород / Посёлок', x: 80, y: 78, radius: 18, priceMod: 0.88, desc: 'Рабочие лошадки, внедорожники' }
    ],

    // Кэш пинов объявлений на карте
    pins: [],
    selectedPin: null,
    animationFrameId: null,
    radarPulseAngle: 0,

    /**
     * Инициализация карты
     */
    init() {
        this.createMapDOM();
        this.bindEvents();
    },

    /**
     * Создание разметки контейнера карты
     */
    createMapDOM() {
        if (document.getElementById('market-map-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'market-map-overlay';
        overlay.className = 'market-map-overlay hidden';

        overlay.innerHTML = `
            <div class="market-map-modal">
                <div class="market-map-header">
                    <div class="market-map-title">
                        <span class="map-icon">🗺️</span>
                        <div>
                            <h3>Карта авторынка</h3>
                            <p class="map-subtitle">Поиск объявлений по районам</p>
                        </div>
                    </div>
                    <div class="market-map-controls">
                        <div class="radar-status-badge">
                            Радиус: <span id="map-current-radius-val">${this.currentRadiusKm} км</span>
                        </div>
                        <button class="map-btn-upgrade-radar" id="map-btn-upgrade" title="Расширить радиус поиска">
                            📡 Улучшить радар
                        </button>
                        <button class="map-btn-close" id="map-btn-close" title="Закрыть карту">✕</button>
                    </div>
                </div>

                <div class="market-map-body" id="market-map-body">
                    <canvas id="market-map-canvas"></canvas>
                    <div class="market-map-legend">
                        <div class="legend-item"><span class="legend-dot dot-player"></span> База перекупа</div>
                        <div class="legend-item"><span class="legend-dot dot-active"></span> Доступные авто</div>
                        <div class="legend-item"><span class="legend-dot dot-disabled"></span> Вне зоны радара</div>
                    </div>

                    <!-- Карточка предпросмотра при тапе на пин -->
                    <div class="map-pin-preview hidden" id="map-pin-preview"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        this.container = overlay;
        this.canvas = document.getElementById('market-map-canvas');
        this.ctx = this.canvas.getContext('2d');
    },

    /**
     * Привязка обработчиков событий
     */
    bindEvents() {
        const closeBtn = document.getElementById('map-btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        const upgradeBtn = document.getElementById('map-btn-upgrade');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => this.promptRadarUpgrade());
        }

        if (this.canvas) {
            this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
            this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
        }

        window.addEventListener('resize', () => {
            if (this.isActive) {
                this.resizeCanvas();
            }
        });
    },

    /**
     * Подгонка размеров canvas под контейнер
     */
    resizeCanvas() {
        const body = document.getElementById('market-map-body');
        if (!body || !this.canvas) return;

        const rect = body.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    },

    /**
     * Открытие карты
     * @param {Array} marketCars - Массив машин сгенерированного рынка
     */
    show(marketCars = []) {
        if (!this.container) this.init();

        this.container.classList.remove('hidden');
        this.isActive = true;
        this.resizeCanvas();
        this.generatePinsForCars(marketCars);
        this.startRenderLoop();
    },

    /**
     * Закрытие карты
     */
    hide() {
        if (!this.container) return;
        this.container.classList.add('hidden');
        this.isActive = false;
        this.selectedPin = null;

        const preview = document.getElementById('map-pin-preview');
        if (preview) preview.classList.add('hidden');

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    },

    /**
     * Привязка координат и районов к автомобилям рынка
     */
    generatePinsForCars(cars) {
        this.pins = [];

        cars.forEach((car, index) => {
            // Если у машины еще нет назначенных координат - генерируем в одном из районов
            if (typeof car.mapX !== 'number' || typeof car.mapY !== 'number') {
                const district = this.districts[Math.floor(Math.random() * this.districts.length)];
                
                // Случайное смещение внутри круга района
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * district.radius;

                car.mapX = Math.min(95, Math.max(5, district.x + Math.cos(angle) * r));
                car.mapY = Math.min(95, Math.max(5, district.y + Math.sin(angle) * r));
                car.districtName = district.name;
                car.address = `${district.name}, сектор ${Math.floor(Math.random() * 8) + 1}`;
            }

            // Вычисляем расстояние от базы перекупа в км (1% карты ≈ 0.8 км)
            const dx = (car.mapX - this.playerBase.x) * 0.8;
            const dy = (car.mapY - this.playerBase.y) * 0.8;
            const distanceKm = Math.round(Math.sqrt(dx * dx + dy * dy));

            this.pins.push({
                carIndex: index,
                car: car,
                x: car.mapX,
                y: car.mapY,
                distanceKm: distanceKm,
                isAvailable: distanceKm <= this.currentRadiusKm
            });
        });
    },

    /**
     * Основной цикл отрисовки
     */
    startRenderLoop() {
        const render = () => {
            if (!this.isActive) return;

            this.radarPulseAngle += 0.03;
            if (this.radarPulseAngle > Math.PI * 2) {
                this.radarPulseAngle = 0;
            }

            this.draw();
            this.animationFrameId = requestAnimationFrame(render);
        };

        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = requestAnimationFrame(render);
    },

    /**
     * Отрисовка всех слоев карты
     */
    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.clearRect(0, 0, width, height);

        // 1. Фон карты (темная стилизованная сетка кибер-города)
        this.drawBackgroundGrid(ctx, width, height);

        // 2. Районы города
        this.drawDistricts(ctx, width, height);

        // 3. Зона покрытия радара (круг поиска)
        this.drawRadarZone(ctx, width, height);

        // 4. Линии дорог к доступным объявлениям
        this.drawRoadLines(ctx, width, height);

        // 5. База игрока
        this.drawPlayerBase(ctx, width, height);

        // 6. Пины автомобилей
        this.drawPins(ctx, width, height);
    },

    drawBackgroundGrid(ctx, w, h) {
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
        ctx.lineWidth = 1;
        const step = 30;

        for (let x = 0; x < w; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    },

    drawDistricts(ctx, w, h) {
        this.districts.forEach(d => {
            const cx = (d.x / 100) * w;
            const cy = (d.y / 100) * h;
            const radius = (d.radius / 100) * Math.min(w, h);

            // Ореол района
            const grad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
            grad.addColorStop(0, 'rgba(0, 255, 170, 0.08)');
            grad.addColorStop(1, 'rgba(0, 255, 170, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();

            // Текст района
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(d.name, cx, cy - radius - 4);
        });
    },

    drawRadarZone(ctx, w, h) {
        const cx = (this.playerBase.x / 100) * w;
        const cy = (this.playerBase.y / 100) * h;

        // Перевод радиуса поиска в пиксели
        const radiusPx = (this.currentRadiusKm / 0.8 / 100) * Math.min(w, h);

        // Граница зоны поиска
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Пульсирующий луч радара
        const pulseR = radiusPx * (0.3 + 0.7 * Math.sin(this.radarPulseAngle));
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
        ctx.stroke();
    },

    drawRoadLines(ctx, w, h) {
        const bx = (this.playerBase.x / 100) * w;
        const by = (this.playerBase.y / 100) * h;

        this.pins.forEach(pin => {
            if (!pin.isAvailable) return;

            const px = (pin.x / 100) * w;
            const py = (pin.y / 100) * h;

            ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(px, py);
            ctx.stroke();
        });
    },

    drawPlayerBase(ctx, w, h) {
        const cx = (this.playerBase.x / 100) * w;
        const cy = (this.playerBase.y / 100) * h;

        // Неоновое свечение базы
        ctx.shadowColor = '#00ffaa';
        ctx.shadowBlur = 15;

        ctx.fillStyle = '#00ffaa';
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 0; // Сброс теней

        ctx.fillStyle = '#00ffaa';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ГАРАЖ', cx, cy + 18);
    },

    drawPins(ctx, w, h) {
        this.pins.forEach(pin => {
            const px = (pin.x / 100) * w;
            const py = (pin.y / 100) * h;
            const isSelected = this.selectedPin === pin;

            if (pin.isAvailable) {
                // Доступное авто (неоновый желто-бирюзовый)
                ctx.shadowColor = isSelected ? '#ffdd00' : '#00f0ff';
                ctx.shadowBlur = isSelected ? 16 : 8;

                ctx.fillStyle = isSelected ? '#ffdd00' : '#00f0ff';
                ctx.beginPath();
                ctx.arc(px, py, isSelected ? 8 : 5.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.shadowBlur = 0;

                // Ценник над машинкой
                ctx.fillStyle = '#ffffff';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                const priceShort = (pin.car.price / 1000).toFixed(0) + 'k';
                ctx.fillText(priceShort, px, py - 9);
            } else {
                // Недоступное авто (вне радиуса)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    },

    /**
     * Обработка клика по canvas для выбора машины
     */
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const w = this.canvas.width;
        const h = this.canvas.height;

        let clickedPin = null;

        // Поиск ближайшего пина в радиусе клика (14px)
        for (let i = this.pins.length - 1; i >= 0; i--) {
            const pin = this.pins[i];
            const px = (pin.x / 100) * w;
            const py = (pin.y / 100) * h;

            const dist = Math.hypot(clickX - px, clickY - py);
            if (dist <= 14) {
                clickedPin = pin;
                break;
            }
        }

        if (clickedPin) {
            this.selectedPin = clickedPin;
            this.showPinPreview(clickedPin, clickX, clickY);
        } else {
            this.selectedPin = null;
            const preview = document.getElementById('map-pin-preview');
            if (preview) preview.classList.add('hidden');
        }
    },

    /**
     * Отображение всплывающей карточки осмотра авто с карты
     */
    showPinPreview(pin, mouseX, mouseY) {
        const preview = document.getElementById('map-pin-preview');
        if (!preview) return;

        const car = pin.car;
        const travelCost = pin.distanceKm * 35; // 35 ₽ за 1 км бензина

        let actionBtnHtml = '';
        if (pin.isAvailable) {
            actionBtnHtml = `
                <button class="map-preview-btn-inspect" onclick="MarketMap.inspectCarFromMap(${pin.carIndex})">
                    🔍 Выехать на осмотр (${travelCost.toLocaleString()} ₽)
                </button>
            `;
        } else {
            actionBtnHtml = `
                <div class="map-preview-locked-warning">
                    ⚠️ Слишком далеко (${pin.distanceKm} км). Увеличьте радиус радара.
                </div>
            `;
        }

        preview.innerHTML = `
            <div class="map-preview-card">
                <div class="map-preview-header">
                    <h4>${car.brand || ''} ${car.model || 'Автомобиль'} (${car.year || '2010'})</h4>
                    <span class="map-preview-price">${Number(car.price || 0).toLocaleString()} ₽</span>
                </div>
                <div class="map-preview-info-row">
                    <span>📍 Локация:</span>
                    <strong>${car.address || pin.distanceKm + ' км от базы'}</strong>
                </div>
                <div class="map-preview-info-row">
                    <span>⚡ Дистанция:</span>
                    <strong>${pin.distanceKm} км</strong>
                </div>
                <div class="map-preview-info-row">
                    <span>🛠 Состояние кузова:</span>
                    <strong>${car.bodyCondition || car.condition || 'Неизвестно'}</strong>
                </div>
                <div class="map-preview-actions">
                    ${actionBtnHtml}
                </div>
            </div>
        `;

        preview.classList.remove('hidden');
    },

    /**
     * Переход к осмотру автомобиля через стандартный обработчик рынка
     */
    inspectCarFromMap(carIndex) {
        const pin = this.pins.find(p => p.carIndex === carIndex);
        if (!pin) return;

        const travelCost = pin.distanceKm * 35;

        // Проверяем баланс игрока на оплату выезда/бензина (ФИКС: state.player.cash)
        if (typeof state !== 'undefined' && state.player) {
            if (state.player.cash < travelCost) {
                alert(`Недостаточно денег на бензин для выезда! Требуется: ${travelCost} ₽`);
                return;
            }
            // Списываем плату за дорогу
            state.player.cash -= travelCost;
            if (typeof updateHUD === 'function') updateHUD();
        }

        this.hide();

        // Вызываем функцию осмотра авто из существующего рынка (ФИКС: openMarketDeal)
        if (typeof openMarketDeal === 'function') {
            openMarketDeal(carIndex);
        } else if (typeof Market !== 'undefined' && typeof Market.inspectCar === 'function') {
            Market.inspectCar(carIndex);
        }
    },

    /**
     * Диалог улучшения радиуса радара
     */
    promptRadarUpgrade() {
        const nextLevel = this.radiusLevels.find(l => l.level === this.currentRadiusLevel + 1);

        if (!nextLevel) {
            alert('Радар уже прокачан на максимум (60 км)!');
            return;
        }

        const confirmUpgrade = confirm(
            `Улучшить радар до "${nextLevel.title}"?\n` +
            `Новый радиус: ${nextLevel.radiusKm} км\n` +
            `Стоимость: ${nextLevel.cost.toLocaleString()} ₽`
        );

        if (!confirmUpgrade) return;

        // ФИКС: state.player.cash вместо GameState.player.balance
        if (typeof state !== 'undefined' && state.player) {
            if (state.player.cash < nextLevel.cost) {
                alert('Недостаточно средств для улучшения радара!');
                return;
            }
            state.player.cash -= nextLevel.cost;
            if (typeof updateHUD === 'function') updateHUD();
        }

        this.currentRadiusLevel = nextLevel.level;
        this.currentRadiusKm = nextLevel.radiusKm;

        const label = document.getElementById('map-current-radius-val');
        if (label) label.textContent = `${this.currentRadiusKm} км`;

        // Обновляем доступность пинов
        this.pins.forEach(pin => {
            pin.isAvailable = pin.distanceKm <= this.currentRadiusKm;
        });

        alert(`Радар успешно улучшен до ${this.currentRadiusKm} км! Теперь доступно больше объявлений.`);
    },

    handleCanvasHover(e) {
        const rect = this.canvas.getBoundingClientRect();
        const hx = e.clientX - rect.left;
        const hy = e.clientY - rect.top;

        const w = this.canvas.width;
        const h = this.canvas.height;

        let hovered = false;
        for (let pin of this.pins) {
            const px = (pin.x / 100) * w;
            const py = (pin.y / 100) * h;
            if (Math.hypot(hx - px, hy - py) <= 12) {
                hovered = true;
                break;
            }
        }
        this.canvas.style.cursor = hovered ? 'pointer' : 'default';
    }
};

window.MarketMap = MarketMap;

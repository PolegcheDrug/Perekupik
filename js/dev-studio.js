// ========================================================
// js/dev-studio.js — ДВУХЭКРАННАЯ АВТО-СТУДИЯ ПЕРЕКУПА (v0.6.5)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// 🟢 Экран 1: Создание новых карточек (Бирюзово-зеленый стиль)
// 🟣 Экран 2: Редактирование существующих авто по классам (Фиолетово-золотой стиль)
// ✂️ Встроенный Canvas-кроппер/подгонщик обложки, парсинг data.js,
// рандомизатор и экспорт базы в 1 клик.
// Гарантированная защита от null-draft и ошибок Canvas.
// ========================================================

const DevStudio = {
    activeScreen: 'create', // 'create' | 'edit'
    currentDraft: null,
    uploadedPhotos: [],
    stagedBatchQueue: [],
    originalDataJsRaw: null,

    // Параметры кадрирования обложки
    cropperState: {
        zoom: 1.0,
        offsetY: 0,
        offsetX: 0,
        rotation: 0,
        originalImgObj: null
    },

    // Состояние экрана редактирования
    editFilterClass: 'economy',
    editSearchQuery: '',
    selectedEditCarIndex: -1,

    init() {
        this.loadBatchQueueFromStorage();
        this.resetDraft();
        this.loadCustomCarsFromStorage();
    },

    resetDraft() {
        this.currentDraft = {
            isExistingCar: false,
            originalNameRef: null,
            name: "ВАЗ-2101 «Копейка»",
            type: "economy",
            power: 64,
            basePrice: 75000,
            drivetrain: "rwd",
            folderPath: "assets/cars/economy/2101/",
            baseFilename: "vaz-2101",
            images: [],
            sellerNote: "«Дедушка ездил только летом на дачу, сел и поехал.»",
            condition: 85,
            mileage: 72000,
            plate: "В777ВВ 77",
            tuning: {
                chip: 0,
                exhaust: false,
                stance: false,
                bodykit: false,
                weldedDiff: false,
                steeringAngle: false,
                hydroHandbrake: false,
                rollCage: false,
                dragSlicks: false
            },
            defectCode: "none",
            thickness: { hood: 110, roof: 100, doors: 115, wings: 110 }
        };
        this.uploadedPhotos = [];
        this.resetCropperParams();
    },

    resetCropperParams() {
        this.cropperState = {
            zoom: 1.0,
            offsetY: 0,
            offsetX: 0,
            rotation: 0,
            originalImgObj: null
        };
    },

    open() {
        if (!this.currentDraft) this.resetDraft();
        this.render();
        
        const modal = document.getElementById('modalDevStudio');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
            modal.style.zIndex = '9999';
            modal.scrollTop = 0;
        }

        if (typeof ModalManager !== 'undefined' && typeof ModalManager.open === 'function') {
            ModalManager.open('modalDevStudio');
        }
        
        if (typeof playSound === 'function') playSound('tick');
    },

    close() {
        const modal = document.getElementById('modalDevStudio');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }

        if (typeof ModalManager !== 'undefined' && typeof ModalManager.close === 'function') {
            ModalManager.close('modalDevStudio');
        }
    },

    switchScreen(screenName) {
        if (!this.currentDraft) this.resetDraft();
        this.activeScreen = screenName;
        if (screenName === 'create' && this.currentDraft.isExistingCar) {
            this.resetDraft();
        }
        this.render();
        if (typeof playSound === 'function') playSound('tick');
        if (typeof tgHaptic === 'function') tgHaptic('light');
    },

    // ========================================================
    // ГЛАВНЫЙ РЕНДЕР
    // ========================================================
    render() {
        if (!this.currentDraft) this.resetDraft();
        const container = document.getElementById('devStudioContent');
        if (!container) return;

        const isCreate = this.activeScreen === 'create';
        const themeClass = isCreate ? 'theme-studio-create' : 'theme-studio-edit';

        container.innerHTML = `
            <div class="dev-studio-container ${themeClass}">
                <!-- ШАПКА С ПЕРЕКЛЮЧАТЕЛЕМ ЭКРАНОВ -->
                <div class="flex-between mb-2 pb-2" style="border-bottom: 1px solid var(--border-glass);">
                    <div class="flex-gap" style="align-items:center;">
                        <div class="category-header-icon ${isCreate ? 'icon-create-style' : 'icon-edit-style'}">
                            <i class="fa-solid ${isCreate ? 'fa-plus' : 'fa-pen-to-square'}"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-xs" style="font-size:14px; color:${isCreate ? 'var(--cyan)' : 'var(--purple)'};">
                                ${isCreate ? '🟢 Студия: Создание Авто' : '🟣 Редактор Базы Автотехники'}
                            </h3>
                            <div class="sub-label" style="font-size:9px;">
                                ${isCreate ? 'Генерация новых лотов в папку assets/' : 'Изменение характеристик, фото и цен существующих авто'}
                            </div>
                        </div>
                    </div>
                    <button onclick="DevStudio.close()" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                <!-- НАВИГАЦИОННЫЙ СЕЛЕКТОР ЭКРАНОВ -->
                <div class="grid-2 mb-3">
                    <button onclick="DevStudio.switchScreen('create')" class="btn ${isCreate ? 'btn-cyan' : 'btn-dark'} btn-sm" style="font-weight:900;">
                        <i class="fa-solid fa-sparkles mr-1"></i> 1. Создать новую карточку
                    </button>
                    <button onclick="DevStudio.switchScreen('edit')" class="btn ${!isCreate ? 'btn-purple' : 'btn-dark'} btn-sm" style="font-weight:900;">
                        <i class="fa-solid fa-list-check mr-1"></i> 2. Редактировать из базы
                    </button>
                </div>

                ${isCreate ? this.renderCreateScreen() : this.renderEditScreen()}
            </div>
        `;

        this.renderUploadedThumbs();
        setTimeout(() => {
            this.initCropperCanvasPreview();
        }, 60);
    },

    // ========================================================
    // 🟢 ЭКРАН 1: СОЗДАНИЕ НОВЫХ КАРТОЧЕК
    // ========================================================
    renderCreateScreen() {
        const d = this.currentDraft;
        const queueCount = this.stagedBatchQueue.length;

        return `
            <div class="glass-card p-2 mb-2 studio-box-create">
                <div class="flex-between mb-2">
                    <div>
                        <b class="text-xs color-cyan"><i class="fa-solid fa-file-code mr-1"></i> База проекта data.js:</b>
                        <div class="sub-label" style="font-size:9px;">
                            ${this.originalDataJsRaw ? '<span class="color-green font-bold">✓ Файл data.js загружен</span>' : 'Используется встроенная база'}
                        </div>
                    </div>
                    <button onclick="document.getElementById('studioDataFileInput').click()" class="btn btn-cyan btn-sm btn-auto" style="font-size:9.5px;">
                        ${this.originalDataJsRaw ? 'Заменить data.js' : 'Загрузить data.js'}
                    </button>
                    <input type="file" id="studioDataFileInput" accept=".js" style="display:none;" onchange="DevStudio.handleDataJsFileUpload(this.files[0])">
                </div>

                <div class="grid-2">
                    <button onclick="DevStudio.randomizeDraftParameters()" class="btn btn-cyan btn-sm">
                        <i class="fa-solid fa-dice mr-1"></i> Рандомизировать параметры 🎲
                    </button>
                    <button onclick="DevStudio.applyPreset('drift')" class="btn btn-dark btn-sm" style="font-size:9.5px;">
                        💨 Пресет «Корч»
                    </button>
                </div>
            </div>

            <!-- КРОППЕР И НАСТРОЙКА ОБЛОЖКИ -->
            ${this.renderCropperWidgetHtml(true)}

            <!-- ФОРМА ХАРАКТЕРИСТИК -->
            ${this.renderCarFormFieldsHtml(true)}

            <!-- ОЧЕРЕДЬ ПАКА -->
            <div class="glass-card p-2 mb-2">
                <div class="flex-between mb-1">
                    <b class="text-xs color-green"><i class="fa-solid fa-layer-group mr-1"></i> Очередь для пака: ${queueCount} авто</b>
                    ${queueCount > 0 ? `<button onclick="DevStudio.clearBatchQueue()" class="btn btn-danger btn-auto btn-sm" style="padding:2px 8px; font-size:9px;">Очистить</button>` : ''}
                </div>
                <div class="space-y-1 mb-2" style="max-height: 90px; overflow-y: auto;">
                    ${this.renderBatchQueueHtml()}
                </div>
            </div>

            <!-- КНОПКИ ДЕЙСТВИЙ -->
            <div class="space-y-2 mb-2">
                <button onclick="DevStudio.addToBatchQueue()" class="btn btn-green w-full" style="box-shadow: 0 0 16px var(--green-glow);">
                    <i class="fa-solid fa-plus mr-1"></i> + Сохранить в очередь пака
                </button>
                <div class="grid-2">
                    <button onclick="DevStudio.spawnToMarketAction()" class="btn btn-cyan btn-sm">
                        <i class="fa-solid fa-store mr-1"></i> Тест на Рынке
                    </button>
                    <button onclick="DevStudio.spawnToGarageAction()" class="btn btn-dark btn-sm">
                        <i class="fa-solid fa-warehouse mr-1"></i> Тест в Гараже
                    </button>
                </div>
            </div>

            <div class="grid-2 mb-2">
                <button onclick="DevStudio.downloadMergedDataJs()" class="btn btn-cyan btn-sm">
                    <i class="fa-solid fa-download mr-1"></i> Скачать data.js
                </button>
                <button onclick="DevStudio.downloadPhotoBatch()" class="btn btn-dark btn-sm" ${this.uploadedPhotos.length === 0 ? 'disabled' : ''}>
                    <i class="fa-solid fa-file-zipper mr-1"></i> Скачать фото (.jpg)
                </button>
            </div>
        `;
    },

    // ========================================================
    // 🟣 ЭКРАН 2: РЕДАКТИРОВАНИЕ ИЗ БАЗЫ
    // ========================================================
    renderEditScreen() {
        const d = this.currentDraft;
        const classes = [
            { id: 'economy', name: 'Эконом' },
            { id: 'scooter', name: 'Скутеры' },
            { id: 'moto', name: 'Мото' },
            { id: 'atv', name: 'Квадро' },
            { id: 'comfort', name: 'Комфорт' },
            { id: 'premium', name: 'Премиум' },
            { id: 'hyper', name: 'Гипер' },
            { id: 'truck', name: 'Грузовики' },
            { id: 'yacht', name: 'Яхты' }
        ];

        let classChips = classes.map(c => `
            <button onclick="DevStudio.selectEditClassFilter('${c.id}')" 
                    class="btn ${this.editFilterClass === c.id ? 'btn-purple' : 'btn-dark'} btn-sm btn-auto" 
                    style="font-size:9px; padding:4px 8px;">
                ${c.name}
            </button>
        `).join('');

        let currentCatList = (typeof CAR_DATABASE !== 'undefined' && CAR_DATABASE[this.editFilterClass]) 
            ? CAR_DATABASE[this.editFilterClass] 
            : [];

        if (this.editSearchQuery.trim()) {
            const q = this.editSearchQuery.toLowerCase();
            currentCatList = currentCatList.filter(car => car.name.toLowerCase().includes(q));
        }

        let carsSelectOptions = currentCatList.map((car, idx) => `
            <option value="${idx}" ${this.selectedEditCarIndex === idx ? 'selected' : ''}>
                ${car.name} (${car.power} л.с. | ${(car.basePrice || 0).toLocaleString()} ₽)
            </option>
        `).join('');

        if (!carsSelectOptions) {
            carsSelectOptions = `<option value="-1">Автомобили не найдены</option>`;
        }

        return `
            <div class="glass-card p-2 mb-2 studio-box-edit">
                <b class="text-xs color-purple block mb-1"><i class="fa-solid fa-list-ul mr-1"></i> 1. Выберите авто из базы проекта:</b>
                
                <div class="flex-gap mb-2" style="overflow-x:auto; padding-bottom:4px;">
                    ${classChips}
                </div>

                <div class="mb-2">
                    <input type="text" class="chat-input" placeholder="🔍 Быстрый поиск модели..." 
                           value="${this.editSearchQuery}" 
                           oninput="DevStudio.handleEditSearch(this.value)" 
                           style="font-size:10.5px; padding:6px 8px;">
                </div>

                <div>
                    <select class="chat-input" onchange="DevStudio.loadCarForEditing(parseInt(this.value))" style="font-size:11px; padding:7px 6px;">
                        <option value="-1">-- Выберите авто для редактирования --</option>
                        ${carsSelectOptions}
                    </select>
                </div>
            </div>

            ${d.isExistingCar ? `
                <div class="p-2 mb-2 flex-between" style="background:rgba(192,132,252,0.1); border:1px solid var(--purple); border-radius:8px;">
                    <div>
                        <span class="sub-label" style="font-size:8.5px;">Редактируется объект:</span>
                        <div class="text-xs font-bold color-purple">${d.name}</div>
                    </div>
                    <span class="tag-badge bg-tag-purple">РЕЖИМ ПРАВКИ</span>
                </div>

                <!-- КРОППЕР И НАСТРОЙКА ОБЛОЖКИ -->
                ${this.renderCropperWidgetHtml(false)}

                <!-- ФОРМА ХАРАКТЕРИСТИК -->
                ${this.renderCarFormFieldsHtml(false)}

                <!-- КНОПКИ СОХРАНЕНИЯ ПРАВОК -->
                <div class="space-y-2 mb-2">
                    <button onclick="DevStudio.saveEditedCarToDatabase()" class="btn btn-purple w-full" style="box-shadow: 0 0 16px rgba(192,132,252,0.4);">
                        <i class="fa-solid fa-floppy-disk mr-1"></i> Сохранить изменения в базе проекта ✓
                    </button>
                    <div class="grid-2">
                        <button onclick="DevStudio.spawnToMarketAction()" class="btn btn-cyan btn-sm">
                            <i class="fa-solid fa-store mr-1"></i> Запустить на Рынок
                        </button>
                        <button onclick="DevStudio.downloadMergedDataJs()" class="btn btn-dark btn-sm">
                            <i class="fa-solid fa-download mr-1"></i> Скачать data.js
                        </button>
                    </div>
                </div>
            ` : `
                <div class="glass-card text-center sub-label py-6">
                    <i class="fa-solid fa-hand-pointer color-purple mb-2" style="font-size:24px;"></i>
                    <div>Выберите машину в списке выше, чтобы изменить её фото, цены или тюнинг.</div>
                </div>
            `}
        `;
    },

    // ========================================================
    // ✂️ ВИДЖЕТ КАДРИРОВАНИЯ
    // ========================================================
    renderCropperWidgetHtml(isCreate) {
        const color = isCreate ? 'var(--cyan)' : 'var(--purple)';

        return `
            <div class="glass-card mb-2 p-2">
                <div class="flex-between mb-1">
                    <b class="text-xs" style="color:${color};"><i class="fa-solid fa-crop-simple mr-1"></i> Обложка: Масштаб и Обрезка (16:9)</b>
                    <button onclick="DevStudio.resetCropperParams(); DevStudio.updateCropperCanvas();" class="btn btn-dark btn-auto btn-sm" style="font-size:8.5px; padding:2px 6px;">Сброс</button>
                </div>
                <div class="sub-label mb-2" style="font-size:9px;">Настройте ползунками точную позицию и нажмите «Обрезать и применить».</div>

                <div class="car-img-wrap" style="height: 165px; position:relative; overflow:hidden; border:1px solid ${color};">
                    <canvas id="studioCropCanvas" width="400" height="225" style="width:100%; height:100%; display:block; object-fit:cover;"></canvas>
                </div>

                <div class="space-y-1 my-2 text-xs">
                    <div class="flex-between">
                        <span class="sub-label" style="font-size:9px;">Масштаб (Zoom):</span>
                        <input type="range" min="0.5" max="2.5" step="0.05" value="${this.cropperState.zoom}" oninput="DevStudio.handleCropParamChange('zoom', parseFloat(this.value))" style="width:65%;">
                    </div>
                    <div class="flex-between">
                        <span class="sub-label" style="font-size:9px;">Сдвиг по вертикали (Y):</span>
                        <input type="range" min="-150" max="150" step="2" value="${this.cropperState.offsetY}" oninput="DevStudio.handleCropParamChange('offsetY', parseInt(this.value))" style="width:65%;">
                    </div>
                    <div class="flex-between">
                        <span class="sub-label" style="font-size:9px;">Сдвиг по горизонтали (X):</span>
                        <input type="range" min="-150" max="150" step="2" value="${this.cropperState.offsetX}" oninput="DevStudio.handleCropParamChange('offsetX', parseInt(this.value))" style="width:65%;">
                    </div>
                </div>

                <div class="grid-2">
                    <button onclick="document.getElementById('studioFileInput').click()" class="btn btn-dark btn-sm">
                        <i class="fa-solid fa-camera mr-1"></i> Сменить фото
                    </button>
                    <button onclick="DevStudio.applyCropToDraft()" class="btn ${isCreate ? 'btn-cyan' : 'btn-purple'} btn-sm">
                        <i class="fa-solid fa-check mr-1"></i> Обрезать и применить
                    </button>
                </div>

                <input type="file" id="studioFileInput" accept="image/*" multiple style="display:none;" onchange="DevStudio.handleFilesSelected(this.files)">
                <div id="studioUploadedThumbs" class="grid-4 mt-2" style="gap:6px;"></div>
            </div>
        `;
    },

    initCropperCanvasPreview() {
        const canvas = document.getElementById('studioCropCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = "anonymous";
        const coverSrc = this.getCoverImageSrc();

        img.onload = () => {
            this.cropperState.originalImgObj = img;
            this.updateCropperCanvas();
        };
        img.onerror = () => {
            ctx.fillStyle = "#090e18";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#38bdf8";
            ctx.font = "12px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("📷 Загрузите фото автомобиля", canvas.width / 2, canvas.height / 2);
        };
        img.src = coverSrc;
    },

    handleCropParamChange(param, val) {
        this.cropperState[param] = val;
        this.updateCropperCanvas();
    },

    updateCropperCanvas() {
        const canvas = document.getElementById('studioCropCanvas');
        if (!canvas || !this.cropperState.originalImgObj) return;
        const ctx = canvas.getContext('2d');
        const img = this.cropperState.originalImgObj;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#090e18";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2 + this.cropperState.offsetX, canvas.height / 2 + this.cropperState.offsetY);
        ctx.scale(this.cropperState.zoom, this.cropperState.zoom);

        const aspect = img.width / img.height;
        let drawW = canvas.width;
        let drawH = canvas.width / aspect;

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
    },

    applyCropToDraft() {
        const canvas = document.getElementById('studioCropCanvas');
        if (!canvas) return;

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const d = this.currentDraft;

        if (this.uploadedPhotos.length > 0) {
            this.uploadedPhotos[0].dataUrl = croppedDataUrl;
        } else {
            this.uploadedPhotos.unshift({
                name: `${d.baseFilename}.jpg`,
                originalName: "cropped_cover.jpg",
                dataUrl: croppedDataUrl
            });
        }

        this.updateDraftImagesArray();
        this.render();
        if (typeof playSound === 'function') playSound('win');
        if (typeof showToast === 'function') showToast("✂️ Обложка успешно кадрирована в 16:9!");
    },

    // ========================================================
    // ФОРМА ХАРАКТЕРИСТИК
    // ========================================================
    renderCarFormFieldsHtml(isCreate) {
        const d = this.currentDraft;
        const color = isCreate ? 'var(--cyan)' : 'var(--purple)';

        return `
            <div class="glass-card mb-2 p-2">
                <b class="text-xs block mb-1" style="color:${color};"><i class="fa-solid fa-sliders mr-1"></i> Характеристики и пути:</b>
                
                <div class="mb-2">
                    <span class="sub-label" style="font-size:9px;">Название марки и модели:</span>
                    <input type="text" class="chat-input" value="${d.name}" oninput="DevStudio.updateField('name', this.value)" style="font-size:11px; padding:6px 8px;">
                </div>

                <div class="grid-2 mb-2">
                    <div>
                        <span class="sub-label" style="font-size:9px;">Класс техники:</span>
                        <select class="chat-input" onchange="DevStudio.updateCategory(this.value)" style="font-size:10px; padding:6px 4px;">
                            <option value="economy" ${d.type === 'economy' ? 'selected' : ''}>Эконом (1 ур)</option>
                            <option value="scooter" ${d.type === 'scooter' ? 'selected' : ''}>Скутеры (1 ур)</option>
                            <option value="moto" ${d.type === 'moto' ? 'selected' : ''}>Мото (5 ур)</option>
                            <option value="atv" ${d.type === 'atv' ? 'selected' : ''}>Квадро (8 ур)</option>
                            <option value="comfort" ${d.type === 'comfort' ? 'selected' : ''}>Комфорт (15 ур)</option>
                            <option value="premium" ${d.type === 'premium' ? 'selected' : ''}>Премиум (30 ур)</option>
                            <option value="hyper" ${d.type === 'hyper' ? 'selected' : ''}>Гиперкары (50 ур)</option>
                            <option value="truck" ${d.type === 'truck' ? 'selected' : ''}>Грузовики (50 ур)</option>
                            <option value="yacht" ${d.type === 'yacht' ? 'selected' : ''}>Яхты (100 ур)</option>
                        </select>
                    </div>
                    <div>
                        <span class="sub-label" style="font-size:9px;">Привод:</span>
                        <select class="chat-input" onchange="DevStudio.updateField('drivetrain', this.value)" style="font-size:10px; padding:6px 4px;">
                            <option value="rwd" ${d.drivetrain === 'rwd' ? 'selected' : ''}>Задний (RWD)</option>
                            <option value="fwd" ${d.drivetrain === 'fwd' ? 'selected' : ''}>Передний (FWD)</option>
                            <option value="awd" ${d.drivetrain === 'awd' ? 'selected' : ''}>Полный (AWD)</option>
                        </select>
                    </div>
                </div>

                <div class="grid-3 mb-2">
                    <div>
                        <span class="sub-label" style="font-size:9px;">Мощность (л.с.):</span>
                        <input type="number" class="chat-input" value="${d.power}" oninput="DevStudio.updateField('power', parseInt(this.value)||0)" style="font-size:10.5px; padding:6px 6px;">
                    </div>
                    <div>
                        <span class="sub-label" style="font-size:9px;">Базовая цена (₽):</span>
                        <input type="number" class="chat-input" value="${d.basePrice}" oninput="DevStudio.updateField('basePrice', parseInt(this.value)||0)" style="font-size:10.5px; padding:6px 6px;">
                    </div>
                    <div>
                        <span class="sub-label" style="font-size:9px;">Пробег (км):</span>
                        <input type="number" class="chat-input" value="${d.mileage}" oninput="DevStudio.updateField('mileage', parseInt(this.value)||0)" style="font-size:10.5px; padding:6px 6px;">
                    </div>
                </div>

                <div class="grid-2 mb-2">
                    <div>
                        <span class="sub-label" style="font-size:9px;">Папка модели:</span>
                        <input type="text" class="chat-input" value="${d.folderPath}" oninput="DevStudio.updateField('folderPath', this.value)" style="font-size:10px; padding:6px 6px;">
                    </div>
                    <div>
                        <span class="sub-label" style="font-size:9px;">Префикс файла:</span>
                        <input type="text" class="chat-input" value="${d.baseFilename}" oninput="DevStudio.updateField('baseFilename', this.value)" style="font-size:10px; padding:6px 6px;">
                    </div>
                </div>

                <div>
                    <span class="sub-label" style="font-size:9px;">Фраза продавца в объявлении:</span>
                    <input type="text" class="chat-input" value="${d.sellerNote}" oninput="DevStudio.updateField('sellerNote', this.value)" style="font-size:10px; padding:6px 8px;">
                </div>
            </div>
        `;
    },

    selectEditClassFilter(catId) {
        this.editFilterClass = catId;
        this.selectedEditCarIndex = -1;
        this.render();
    },

    handleEditSearch(query) {
        this.editSearchQuery = query;
        this.render();
    },

    loadCarForEditing(index) {
        if (index < 0) return;
        this.selectedEditCarIndex = index;

        const catList = (typeof CAR_DATABASE !== 'undefined' && CAR_DATABASE[this.editFilterClass]) 
            ? CAR_DATABASE[this.editFilterClass] 
            : [];
        const targetCar = catList[index];
        if (!targetCar) return;

        let folder = `assets/cars/${this.editFilterClass}/`;
        let baseFile = targetCar.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (targetCar.img) {
            const parts = targetCar.img.split('/');
            if (parts.length > 1) {
                folder = parts.slice(0, -1).join('/') + '/';
                baseFile = parts[parts.length - 1].replace(/\.[^/.]+$/, "");
            }
        }

        this.currentDraft = {
            isExistingCar: true,
            originalNameRef: targetCar.name,
            name: targetCar.name,
            type: targetCar.type || this.editFilterClass,
            power: targetCar.power || 100,
            basePrice: targetCar.basePrice || 100000,
            drivetrain: targetCar.drivetrain || 'rwd',
            folderPath: folder,
            baseFilename: baseFile,
            images: Array.isArray(targetCar.images) ? [...targetCar.images] : (targetCar.img ? [targetCar.img] : []),
            sellerNote: "«Проверенный автомобиль из официальной базы игры.»",
            condition: 90,
            mileage: 65000,
            plate: "В777ВВ 77",
            tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, weldedDiff: false, steeringAngle: false, hydroHandbrake: false, rollCage: false, dragSlicks: false },
            defectCode: "none",
            thickness: { hood: 110, roof: 100, doors: 115, wings: 110 }
        };

        this.uploadedPhotos = [];
        this.render();
        if (typeof showToast === 'function') {
            showToast(`Загружены параметры: «${targetCar.name}»!`);
        }
    },

    saveEditedCarToDatabase() {
        const d = this.currentDraft;
        if (!d || !d.isExistingCar) return;

        const cat = d.type || this.editFilterClass;
        if (typeof CAR_DATABASE === 'undefined' || !CAR_DATABASE[cat]) return;

        const idx = CAR_DATABASE[cat].findIndex(c => c.name === d.originalNameRef);
        const cover = this.getCoverImageSrc();

        const updatedCarObj = {
            name: d.name,
            power: d.power,
            basePrice: d.basePrice,
            drivetrain: d.drivetrain,
            type: d.type,
            img: d.images.length > 0 ? d.images[0] : cover,
            images: d.images.length > 0 ? [...d.images] : [cover],
            fallback: (typeof getCategoryFallback === 'function') ? getCategoryFallback(d.type) : cover
        };

        if (idx !== -1) {
            CAR_DATABASE[cat][idx] = updatedCarObj;
        } else {
            CAR_DATABASE[cat].unshift(updatedCarObj);
        }

        if (this.originalDataJsRaw) {
            const formatted = this.formatCarObjectToJsString(updatedCarObj);
            const nameEscaped = d.originalNameRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\{[\\s\\S]*?name\\s*:\\s*["']${nameEscaped}["'][\\s\\S]*?\\}`, 'm');
            if (regex.test(this.originalDataJsRaw)) {
                this.originalDataJsRaw = this.originalDataJsRaw.replace(regex, formatted.trim());
            }
        }

        if (typeof saveState === 'function') saveState();
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') {
            showToast(`Автомобиль «${d.name}» успешно обновлен в базе!`);
        }
        this.render();
    },

    handleFilesSelected(files) {
        if (!files || files.length === 0) return;
        const d = this.currentDraft;
        let count = files.length;
        let loaded = 0;

        Array.from(files).forEach((file, idx) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                const ext = file.name.split('.').pop().toLowerCase();
                const targetName = (this.uploadedPhotos.length === 0 && idx === 0)
                    ? `${d.baseFilename}.${ext}`
                    : `${d.baseFilename}_${this.uploadedPhotos.length + 1}.${ext}`;

                this.uploadedPhotos.push({
                    name: targetName,
                    originalName: file.name,
                    dataUrl: dataUrl,
                    fileObj: file
                });

                loaded++;
                if (loaded === count) {
                    this.updateDraftImagesArray();
                    this.render();
                    if (typeof showToast === 'function') {
                        showToast(`Загружено ${count} фото!`);
                    }
                }
            };
            reader.readAsDataURL(file);
        });
    },

    renderUploadedThumbs() {
        const box = document.getElementById('studioUploadedThumbs');
        if (!box) return;

        if (this.uploadedPhotos.length === 0) {
            box.innerHTML = `<div class="sub-label text-center py-2" style="grid-column:span 4; font-size:9.5px;">Фото не выбраны</div>`;
            return;
        }

        let html = "";
        this.uploadedPhotos.forEach((item, idx) => {
            html += `
            <div style="position:relative; border-radius:6px; overflow:hidden; border:1px solid ${idx === 0 ? 'var(--cyan)' : 'var(--border-glass)'}; height:60px;">
                <img src="${item.dataUrl}" style="width:100%; height:100%; object-fit:cover;">
                <span class="tag-badge ${idx === 0 ? 'bg-tag-cyan' : 'bg-tag-dark'}" style="position:absolute; bottom:2px; left:2px; font-size:7px; padding:1px 3px;">
                    ${idx === 0 ? 'ОБЛОЖКА' : '#' + idx}
                </span>
                <button onclick="DevStudio.removePhoto(${idx})" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.6); color:#ff3366; border:none; border-radius:4px; font-size:9px; padding:1px 4px; cursor:pointer;">✕</button>
            </div>`;
        });
        box.innerHTML = html;
    },

    removePhoto(idx) {
        this.uploadedPhotos.splice(idx, 1);
        this.updateDraftImagesArray();
        this.render();
    },

    updateDraftImagesArray() {
        const d = this.currentDraft;
        d.images = [];
        this.uploadedPhotos.forEach(p => {
            d.images.push(`${d.folderPath}${p.name}`);
        });
    },

    getCoverImageSrc() {
        if (this.uploadedPhotos && this.uploadedPhotos.length > 0 && this.uploadedPhotos[0].dataUrl) {
            return this.uploadedPhotos[0].dataUrl;
        }
        if (this.currentDraft && this.currentDraft.images && this.currentDraft.images.length > 0) {
            return this.currentDraft.images[0];
        }
        return "assets/cars/economy/2101/vaz-2101.jpg";
    },

    updateField(field, val) {
        if (!this.currentDraft) this.resetDraft();
        this.currentDraft[field] = val;
    },

    updateCategory(cat) {
        if (!this.currentDraft) this.resetDraft();
        this.currentDraft.type = cat;
        const catFolders = {
            economy: "assets/cars/economy/", scooter: "assets/moto/", moto: "assets/moto/",
            atv: "assets/moto/", comfort: "assets/cars/comfort/", premium: "assets/cars/premium/",
            hyper: "assets/cars/hyper/", truck: "assets/cars/truck/", yacht: "assets/cars/yacht/"
        };
        const folderPrefix = catFolders[cat] || "assets/cars/economy/";
        this.currentDraft.folderPath = `${folderPrefix}${this.currentDraft.baseFilename}/`;
        this.updateDraftImagesArray();
        this.render();
    },

    randomizeDraftParameters() {
        if (!this.currentDraft) this.resetDraft();
        const d = this.currentDraft;
        d.mileage = Math.floor(25000 + Math.random() * 140000);
        if (typeof generateCoolPlate === 'function') d.plate = generateCoolPlate();
        d.tuning = {
            chip: Math.random() < 0.35 ? (Math.random() < 0.7 ? 1 : 2) : 0,
            exhaust: Math.random() < 0.4,
            stance: Math.random() < 0.25,
            bodykit: Math.random() < 0.3,
            weldedDiff: d.drivetrain === 'rwd' && Math.random() < 0.45,
            steeringAngle: d.drivetrain === 'rwd' && Math.random() < 0.45,
            hydroHandbrake: Math.random() < 0.2,
            rollCage: false,
            dragSlicks: false
        };
        this.render();
        if (typeof showToast === 'function') showToast("Параметры рандомизированы!");
    },

    applyPreset(type) {
        if (!this.currentDraft) this.resetDraft();
        const d = this.currentDraft;
        if (type === 'drift') {
            d.name = d.name.includes("Корч") ? d.name : `${d.name} (Дрифт-Спек)`;
            d.tuning.weldedDiff = true;
            d.tuning.steeringAngle = true;
            d.tuning.hydroHandbrake = true;
            d.tuning.chip = 1;
        }
        this.render();
    },

    addToBatchQueue() {
        const d = JSON.parse(JSON.stringify(this.currentDraft));
        const cover = this.getCoverImageSrc();
        
        const carObj = {
            name: d.name,
            power: d.power,
            basePrice: d.basePrice,
            drivetrain: d.drivetrain,
            type: d.type,
            img: d.images.length > 0 ? d.images[0] : cover,
            images: d.images.length > 0 ? [...d.images] : [cover],
            fallback: (typeof getCategoryFallback === 'function') ? getCategoryFallback(d.type) : cover,
            folderPath: d.folderPath,
            baseFilename: d.baseFilename
        };

        this.stagedBatchQueue.unshift(carObj);
        this.saveBatchQueueToStorage();

        if (typeof CAR_DATABASE !== 'undefined' && CAR_DATABASE[d.type]) {
            CAR_DATABASE[d.type].unshift(carObj);
        }

        if (typeof showToast === 'function') {
            showToast(`«${d.name}» добавлен в очередь пака! Всего: ${this.stagedBatchQueue.length}`);
        }

        const prevFolder = d.folderPath;
        const prevType = d.type;
        this.resetDraft();
        this.currentDraft.folderPath = prevFolder;
        this.currentDraft.type = prevType;
        this.render();
    },

    renderBatchQueueHtml() {
        if (this.stagedBatchQueue.length === 0) {
            return `<div class="sub-label text-center py-1" style="font-size:9px;">Очередь пака пуста</div>`;
        }
        return this.stagedBatchQueue.map((item, idx) => `
            <div class="p-1 flex-between" style="background:#060a12; border-radius:6px; font-size:9.5px;">
                <div class="flex-gap" style="align-items:center;">
                    <b class="color-cyan">${idx + 1}.</b>
                    <span>${item.name}</span>
                    <span class="tag-badge bg-tag-cyan" style="font-size:7.5px;">${(item.type || 'economy').toUpperCase()}</span>
                </div>
                <button onclick="DevStudio.removeFromBatchQueue(${idx})" style="background:none; border:none; color:var(--red); cursor:pointer;">✕</button>
            </div>
        `).join('');
    },

    removeFromBatchQueue(idx) {
        this.stagedBatchQueue.splice(idx, 1);
        this.saveBatchQueueToStorage();
        this.render();
    },

    clearBatchQueue() {
        if (!confirm("Очистить очередь?")) return;
        this.stagedBatchQueue = [];
        this.saveBatchQueueToStorage();
        this.render();
    },

    saveBatchQueueToStorage() {
        try { localStorage.setItem('perekup_dev_batch_queue', JSON.stringify(this.stagedBatchQueue)); } catch(e) {}
    },

    loadBatchQueueFromStorage() {
        try {
            let data = localStorage.getItem('perekup_dev_batch_queue');
            if (data) this.stagedBatchQueue = JSON.parse(data);
        } catch(e) {}
    },

    saveCustomCarToStorage(carObj) {
        try {
            let saved = JSON.parse(localStorage.getItem('perekup_custom_cars_catalog') || '[]');
            saved.unshift(carObj);
            localStorage.setItem('perekup_custom_cars_catalog', JSON.stringify(saved));
        } catch(e) {}
    },

    loadCustomCarsFromStorage() {
        try {
            let saved = JSON.parse(localStorage.getItem('perekup_custom_cars_catalog') || '[]');
            if (Array.isArray(saved) && typeof CAR_DATABASE !== 'undefined') {
                saved.forEach(c => {
                    let cat = c.type || 'economy';
                    if (CAR_DATABASE[cat] && !CAR_DATABASE[cat].some(exist => exist.name === c.name)) {
                        CAR_DATABASE[cat].unshift(c);
                    }
                });
            }
        } catch(e) {}
    },

    spawnToMarketAction() {
        const d = this.currentDraft;
        const cover = this.getCoverImageSrc();
        const lot = {
            id: "m_custom_" + Date.now(),
            name: d.name, power: d.power, type: d.type, drivetrain: d.drivetrain,
            basePrice: d.basePrice, mileage: d.mileage, price: d.basePrice,
            originalAskingPrice: d.basePrice, baseMarketValue: Math.round(d.basePrice * 1.25),
            marketValue: Math.round(d.basePrice * 1.25), img: cover, fallback: cover,
            images: d.images.length > 0 ? [...d.images] : [cover], plate: d.plate,
            isStolen: false, autotekaChecked: false, cooldownUntil: 0, stoChecked: false,
            gaugeChecked: false, haggled: false, hagglePatience: 4, sellerPersonality: "calm",
            dealType: "normal", unavailable: false, sellerNote: d.sellerNote,
            condition: d.condition, insurance: null, tuning: { ...d.tuning },
            wear: { engine: d.condition, transmission: d.condition },
            bodyThickness: { ...d.thickness }, rolledOdometer: false, hasAdditive: false,
            isRepainted: false, isPolished: false, isPersonal: false, isRegisteredOnPlayer: true,
            ownershipDays: 0, engineTemp: 90, tireWear: 100, viewed: false,
            ptsData: { ownerName: "Иванов И.И.", ownerAvatar: "🧔", ownersCount: 1, ownershipYears: 3, vin: "XTA21000000000000", ptsType: "Оригинал ПТС ✓", pledgeBank: "Залогов нет ✓", fsspRestrictions: "Ограничений нет ✓", taxiCheck: "В такси не использовалась ✓" }
        };

        if (!state.marketFeed) state.marketFeed = [];
        state.marketFeed.unshift(lot);
        this.saveCustomCarToStorage(lot);
        if (typeof saveState === 'function') saveState();

        this.close();
        if (typeof switchTab === 'function') switchTab('tabMarket');
        if (typeof renderMarketFeed === 'function') renderMarketFeed();
        if (typeof showToast === 'function') showToast(`«${d.name}» запущен на Авторынок!`);
    },

    spawnToGarageAction() {
        const d = this.currentDraft;
        const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
        if ((state.garage?.length || 0) >= maxSlots) {
            return showToast("В гараже нет свободного места!");
        }

        const cover = this.getCoverImageSrc();
        const wonCar = {
            id: "garage_custom_" + Date.now(),
            name: d.name, power: d.power, type: d.type, drivetrain: d.drivetrain,
            basePrice: d.basePrice, price: d.basePrice, baseMarketValue: Math.round(d.basePrice * 1.3),
            marketValue: Math.round(d.basePrice * 1.3), img: cover, fallback: cover,
            images: d.images.length > 0 ? [...d.images] : [cover], plate: d.plate, customPlate: d.plate,
            condition: d.condition, wear: { engine: d.condition, transmission: d.condition },
            isRegisteredOnPlayer: true, ownershipDays: 1, engineTemp: 90, tireWear: 100,
            purchaseCost: d.basePrice, tuning: { ...d.tuning }
        };

        if (!state.garage) state.garage = [];
        state.garage.unshift(wonCar);
        this.saveCustomCarToStorage(wonCar);
        if (typeof saveState === 'function') saveState();

        this.close();
        if (typeof switchTab === 'function') switchTab('tabGarage');
        if (typeof renderGarage === 'function') renderGarage();
        if (typeof showToast === 'function') showToast(`«${d.name}» доставлен в гараж!`);
    },

    formatCarObjectToJsString(car) {
        const cover = car.img || (car.images && car.images[0]) || `${car.folderPath}${car.baseFilename}.jpg`;
        let imagesArrayCode = "";
        if (car.images && car.images.length > 0) {
            imagesArrayCode = `\n            images: [\n` + car.images.map(img => `                "${img}"`).join(',\n') + `\n            ],`;
        } else {
            imagesArrayCode = `\n            images: ["${cover}"],`;
        }

        return `        { 
            name: "${car.name}", 
            power: ${car.power}, 
            basePrice: ${car.basePrice}, 
            drivetrain: "${car.drivetrain}", 
            type: "${car.type}", 
            img: "${cover}",${imagesArrayCode}
            fallback: CAR_FALLBACKS_BY_CATEGORY.${car.type} 
        }`;
    },

    handleDataJsFileUpload(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalDataJsRaw = e.target.result;
            this.render();
            if (typeof showToast === 'function') showToast("Файл data.js загружен для слияния!");
        };
        reader.readAsText(file);
    },

    downloadMergedDataJs() {
        const carsToMerge = [...this.stagedBatchQueue];
        if (carsToMerge.length === 0 && this.uploadedPhotos.length > 0) {
            carsToMerge.push({
                ...this.currentDraft,
                img: this.getCoverImageSrc(),
                images: this.currentDraft.images.length > 0 ? this.currentDraft.images : [this.getCoverImageSrc()]
            });
        }

        let outputContent = "";
        if (this.originalDataJsRaw) {
            let workingText = this.originalDataJsRaw;
            carsToMerge.forEach(car => {
                const targetCategory = car.type || 'economy';
                const formattedObj = this.formatCarObjectToJsString(car);
                const catRegex = new RegExp(`(${targetCategory}\\s*:\\s*\\[)`, 'i');
                if (catRegex.test(workingText)) {
                    workingText = workingText.replace(catRegex, `$1\n${formattedObj},`);
                }
            });
            outputContent = workingText;
        } else {
            outputContent = `// ========================================================\n// data.js — ОБНОВЛЕННАЯ БАЗА АВТОТЕХНИКИ (v0.6.4)\n// ========================================================\n\nconst CAR_DATABASE = ${JSON.stringify(typeof CAR_DATABASE !== 'undefined' ? CAR_DATABASE : {}, null, 4)};\n\nwindow.CAR_DATABASE = CAR_DATABASE;\n`;
        }

        const blob = new Blob([outputContent], { type: "text/javascript;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "data.js";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (typeof showToast === 'function') showToast("Обновленный data.js успешно скачан!");
    },

    downloadPhotoBatch() {
        if (this.uploadedPhotos.length === 0) return;
        this.uploadedPhotos.forEach((photo, i) => {
            setTimeout(() => {
                const a = document.createElement("a");
                a.href = photo.dataUrl;
                a.download = photo.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }, i * 300);
        });
        if (typeof showToast === 'function') showToast(`Скачивание ${this.uploadedPhotos.length} фото началось...`);
    }
};

window.DevStudio = DevStudio;

// Инициализация при любом состоянии готовности документа
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { DevStudio.init(); });
} else {
    DevStudio.init();
}
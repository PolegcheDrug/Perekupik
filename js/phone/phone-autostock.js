/**
 * js/phone-autostock.js — ПРИЛОЖЕНИЕ ТЕЛЕФОНА "АВТОСКЛАД" (v1.0.0)
 * Мобильное приложение для перекупа:
 *  - Вкладка "Мои лоты" (выставленные на продажу машины, статус, таймеры, статистика просмотров).
 *  - Вкладка "Подать объявление" (выбор из авто в гараже, настройка цены и маркетинга).
 *  - Вкладка "Входящие звонки и чаты" (торг с покупателями-NPC).
 *  - Платное продвижение («Турбо-продажа», «Поднять в топ»).
 */

const PhoneAutoStock = {
    currentTab: 'listings', // 'listings' | 'create' | 'chats'
    selectedCarIdToSell: null,

    // Стили описаний объявлений
    templates: [
        {
            id: 'honest',
            name: 'Честный перекуп',
            badge: 'Надёжно',
            text: 'Автомобиль полностью обслужен. Заменены масла, фильтры, сделана химчистка. Любые проверки приветствуются.',
            boost: 1.15,
            icon: '🛡️'
        },
        {
            id: 'ideal',
            name: '«Не бит, не крашен»',
            badge: 'Классика',
            text: 'Родной окрас, стекла в круг родные. Эксплуатация бережная, зимой стояла в теплом боксе.',
            boost: 1.0,
            icon: '✨'
        },
        {
            id: 'urgent',
            name: 'Срочный сброс',
            badge: 'Быстро',
            text: 'Срочно! Цена на пару дней, пока в продаже интересующий меня вариант. Торг только реальному покупателю у капота.',
            boost: 1.4,
            icon: '⚡'
        },
        {
            id: 'drift',
            name: 'Боевой аппарат',
            badge: 'Дрифт',
            text: 'Спек готов к сезону: заварка, выворот, гидроручник. Едет боком по сухому. Сел и поехал на трек.',
            boost: 1.2,
            icon: '🔥'
        }
    ],

    // Платные услуги продвижения
    promotions: [
        { id: 'turbo', name: 'Турбо-продажа', cost: 7500, mult: 2.2, icon: '🚀', desc: '+120% к частоте звонков на 1 день' },
        { id: 'top', name: 'Закрепить в ТОП', cost: 3500, mult: 1.6, icon: '⭐', desc: '+60% к просмотрам' }
    ],

    /**
     * Инициализация хранилища приложения
     */
    init() {
        if (!state.autoStock) {
            state.autoStock = {
                listings: [],
                chats: [],
                stats: {
                    totalSold: 0,
                    totalRevenue: 0
                }
            };
        }
    },

    /**
     * Точка входа при клике на иконку в меню телефона
     */
    open() {
        this.init();
        this.render();
    },

    setTab(tab) {
        this.currentTab = tab;
        this.render();
    },

    /**
     * Главный рендер внутри экрана телефона
     */
    render() {
        const container = document.getElementById('phone-screen-content');
        if (!container) return;

        const activeListingsCount = (state.autoStock.listings || []).length;
        const unreadChatsCount = (state.autoStock.chats || []).filter(c => !c.read).length;

        container.innerHTML = `
            <div class="autostock-app">
                <!-- Шапка приложения -->
                <div class="autostock-header">
                    <button class="autostock-back-btn" onclick="Phone.openApp('home')">❮ Меню</button>
                    <div class="autostock-header-title">
                        <span class="autostock-logo-icon">📦</span> АвтоСклад
                    </div>
                    <div class="autostock-user-badge">
                        ${state.player?.name || 'Перекуп'}
                    </div>
                </div>

                <!-- Навигационные вкладки -->
                <div class="autostock-tabs">
                    <button class="as-tab ${this.currentTab === 'listings' ? 'active' : ''}" onclick="PhoneAutoStock.setTab('listings')">
                        Мои авто (${activeListingsCount})
                    </button>
                    <button class="as-tab ${this.currentTab === 'create' ? 'active' : ''}" onclick="PhoneAutoStock.setTab('create')">
                        + Продать
                    </button>
                    <button class="as-tab ${this.currentTab === 'chats' ? 'active' : ''}" onclick="PhoneAutoStock.setTab('chats')">
                        Чаты ${unreadChatsCount > 0 ? `<span class="as-unread-badge">${unreadChatsCount}</span>` : ''}
                    </button>
                </div>

                <!-- Содержимое вкладки -->
                <div class="autostock-body">
                    ${this.renderTabContent()}
                </div>
            </div>
        `;
    },

    renderTabContent() {
        switch (this.currentTab) {
            case 'listings':
                return this.renderListingsTab();
            case 'create':
                return this.renderCreateTab();
            case 'chats':
                return this.renderChatsTab();
            default:
                return this.renderListingsTab();
        }
    },

    /**
     * 1. Вкладка: Активные объявления
     */
    renderListingsTab() {
        const listings = state.autoStock.listings || [];

        if (listings.length === 0) {
            return `
                <div class="as-empty-state">
                    <div class="as-empty-icon">🚗</div>
                    <h4>Нет активных объявлений</h4>
                    <p>Все ваши автомобили стоят в гараже. Выставьте транспорт на продажу, чтобы принимать звонки покупателей.</p>
                    <button class="btn-as-action btn-as-primary mt-3" onclick="PhoneAutoStock.setTab('create')">
                        Подать первое объявление
                    </button>
                </div>
            `;
        }

        return listings.map(lot => {
            const car = lot.car;
            const fallback = car.fallback || 'assets/cars/economy/2101/vaz-2101.jpg';
            const img = car.img || fallback;

            return `
                <div class="as-listing-card">
                    <div class="as-lot-top">
                        <img src="${img}" onerror="this.src='${fallback}'" class="as-lot-img">
                        <div class="as-lot-meta">
                            <div class="as-lot-title">${car.name}</div>
                            <div class="as-lot-price">${lot.price.toLocaleString()} ₽</div>
                            <div class="as-lot-sub">Рынок: ~${(car.marketValue || lot.price).toLocaleString()} ₽</div>
                            <div class="as-lot-views">👁️ Просмотров: ${lot.views || 12} | Звонков: ${lot.callsCount || 0}</div>
                        </div>
                    </div>

                    <!-- Плашка продвижения -->
                    <div class="as-promo-bar">
                        <span class="as-promo-tag ${lot.promo ? 'active' : ''}">
                            ${lot.promo ? '🚀 Активно: ' + lot.promoName : '⚪ Обычное размещение'}
                        </span>
                        ${!lot.promo ? `
                            <button class="btn-as-boost" onclick="PhoneAutoStock.openBoostModal('${lot.id}')">
                                ⚡ Продвинуть
                            </button>
                        ` : ''}
                    </div>

                    <div class="as-lot-actions">
                        <button class="btn-as-secondary" onclick="PhoneAutoStock.cancelListing('${lot.id}')">
                            Снять с продажи
                        </button>
                        <button class="btn-as-primary" onclick="PhoneAutoStock.triggerFastBuyerSearch('${lot.id}')">
                            🔍 Найти клиента
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * 2. Вкладка: Конструктор подачи объявления
     */
    renderCreateTab() {
        const garageCars = (state.garage || []).filter(c => {
            // Исключаем уже выставленные
            return !(state.autoStock.listings || []).some(l => l.carId === c.id);
        });

        if (garageCars.length === 0) {
            return `
                <div class="as-empty-state">
                    <div class="as-empty-icon">🏢</div>
                    <h4>В гараже нет свободных машин</h4>
                    <p>Все имеющиеся автомобили либо уже продаются, либо гараж пуст. Купите авто на рынке для последующей перепродажи.</p>
                    <button class="btn-as-action btn-as-primary mt-3" onclick="if(typeof switchTab==='function') switchTab('tabMarket'); Phone.close();">
                        Перейти на авторынок
                    </button>
                </div>
            `;
        }

        // Если машина не выбрана — показываем список выбора
        if (!this.selectedCarIdToSell) {
            const listHtml = garageCars.map(car => {
                const img = car.img || car.fallback || 'assets/cars/economy/2101/vaz-2101.jpg';
                return `
                    <div class="as-select-car-card" onclick="PhoneAutoStock.selectCarToSell('${car.id}')">
                        <img src="${img}" class="as-select-car-thumb">
                        <div class="as-select-car-info">
                            <strong>${car.name}</strong>
                            <div class="as-select-sub">Пробег: ${(car.mileage || 0).toLocaleString()} км | Сост.: ${car.condition || 80}%</div>
                            <div class="as-select-market">Оценка: ~${(car.marketValue || 150000).toLocaleString()} ₽</div>
                        </div>
                        <button class="btn-as-mini">Выбрать</button>
                    </div>
                `;
            }).join('');

            return `
                <div class="as-create-step">
                    <h4>Выберите авто из гаража для продажи:</h4>
                    ${listHtml}
                </div>
            `;
        }

        // Форма оформления цены и шаблона
        const car = garageCars.find(c => c.id === this.selectedCarIdToSell);
        if (!car) {
            this.selectedCarIdToSell = null;
            return this.renderCreateTab();
        }

        const marketPrice = car.marketValue || car.price || 150000;

        const templatesHtml = this.templates.map(tpl => `
            <div class="as-tpl-card ${this.selectedTemplateId === tpl.id ? 'active' : ''}" onclick="PhoneAutoStock.selectTemplate('${tpl.id}')">
                <div class="as-tpl-head">
                    <span>${tpl.icon} <b>${tpl.name}</b></span>
                    <span class="as-tpl-badge">${tpl.badge}</span>
                </div>
                <div class="as-tpl-desc">${tpl.text}</div>
            </div>
        `).join('');

        return `
            <div class="as-form-wrapper">
                <div class="as-form-top">
                    <button class="as-btn-text" onclick="PhoneAutoStock.selectedCarIdToSell = null; PhoneAutoStock.render();">
                        ❮ Сменить авто
                    </button>
                    <strong>${car.name}</strong>
                </div>

                <div class="as-form-group">
                    <label>Цена продажи (₽):</label>
                    <input type="number" id="as-price-input" class="as-input" value="${marketPrice}" oninput="PhoneAutoStock.updatePriceHint(${marketPrice})">
                    <div id="as-price-hint" class="as-hint text-cyan">⚖️ Адекватная рыночная стоимость. Стабильный поток звонков.</div>
                </div>

                <div class="as-form-group">
                    <label>Выберите стиль подачи объявления:</label>
                    ${templatesHtml}
                </div>

                <button class="btn-as-action btn-as-primary w-full" onclick="PhoneAutoStock.publishListing()">
                    🚀 Опубликовать на АвтоСкладе
                </button>
            </div>
        `;
    },

    /**
     * 3. Вкладка: Чаты и предложения покупателей
     */
    renderChatsTab() {
        const chats = state.autoStock.chats || [];

        if (chats.length === 0) {
            return `
                <div class="as-empty-state">
                    <div class="as-empty-icon">💬</div>
                    <h4>Пока нет активных диалогов</h4>
                    <p>Покупатели будут писать и звонить по вашим активным объявлениям. Ждите предложений или используйте платное продвижение.</p>
                </div>
            `;
        }

        return chats.map(chat => `
            <div class="as-chat-card ${chat.read ? '' : 'unread'}">
                <div class="as-chat-header">
                    <div class="as-chat-avatar">${chat.buyerAvatar || '👤'}</div>
                    <div class="as-chat-title-wrap">
                        <div class="as-chat-name">${chat.buyerName}</div>
                        <div class="as-chat-car-name">Интересуется: «${chat.carName}»</div>
                    </div>
                    <div class="as-chat-offer-price">${chat.offeredPrice.toLocaleString()} ₽</div>
                </div>
                <div class="as-chat-message-bubble">
                    ${chat.message}
                </div>
                <div class="as-chat-actions">
                    <button class="btn-as-mini btn-as-success" onclick="PhoneAutoStock.acceptChatDeal('${chat.id}')">
                        🤝 Согласиться (${chat.offeredPrice.toLocaleString()} ₽)
                    </button>
                    <button class="btn-as-mini btn-as-danger" onclick="PhoneAutoStock.rejectChatDeal('${chat.id}')">
                        ✕ Отклонить
                    </button>
                </div>
            </div>
        `).join('');
    },

    selectCarToSell(carId) {
        this.selectedCarIdToSell = carId;
        this.selectedTemplateId = 'honest';
        this.render();
    },

    selectTemplate(tplId) {
        this.selectedTemplateId = tplId;
        this.render();
    },

    updatePriceHint(marketPrice) {
        const input = document.getElementById('as-price-input');
        const hint = document.getElementById('as-price-hint');
        if (!input || !hint) return;

        const val = Number(input.value) || 0;
        const diff = val / marketPrice;

        if (diff <= 0.85) {
            hint.className = 'as-hint text-green';
            hint.innerHTML = '🔥 Ниже рынка! Автомобиль рассмотрят моментально перекупы и охотники за халявой.';
        } else if (diff <= 1.08) {
            hint.className = 'as-hint text-cyan';
            hint.innerHTML = '⚖️ Оптимальная цена. Ожидается умеренное количество звонков от реальных клиентов.';
        } else {
            hint.className = 'as-hint text-red';
            hint.innerHTML = '⚠️ Выше рынка! Покупатели будут требовать скидку или игнорировать объявление.';
        }
    },

    /**
     * Публикация лота
     */
    publishListing() {
        const car = (state.garage || []).find(c => c.id === this.selectedCarIdToSell);
        if (!car) return;

        const priceInput = document.getElementById('as-price-input');
        const price = Number(priceInput ? priceInput.value : 0);

        if (!price || price <= 0) {
            if (typeof showToast === 'function') showToast("Введите корректную цену!");
            return;
        }

        const tpl = this.templates.find(t => t.id === this.selectedTemplateId) || this.templates[0];

        const newLot = {
            id: 'as_lot_' + Date.now(),
            carId: car.id,
            car: car,
            price: price,
            templateId: tpl.id,
            promo: false,
            views: Math.floor(Math.random() * 15) + 5,
            callsCount: 0,
            createdAt: Date.now()
        };

        state.autoStock.listings.push(newLot);

        this.selectedCarIdToSell = null;
        this.currentTab = 'listings';

        if (typeof showToast === 'function') {
            showToast(`🚀 «${car.name}» выставлен на продажу за ${price.toLocaleString()} ₽!`);
        }
        if (typeof playSound === 'function') playSound('cash');
        if (typeof saveState === 'function') saveState();

        this.render();
    },

    /**
     * Снятие с публикации
     */
    cancelListing(lotId) {
        state.autoStock.listings = (state.autoStock.listings || []).filter(l => l.id !== lotId);
        if (typeof showToast === 'function') showToast("Объявление снято с публикации.");
        if (typeof saveState === 'function') saveState();
        this.render();
    },

    /**
     * Платное ускорение поиска покупателя
     */
    triggerFastBuyerSearch(lotId) {
        const lot = (state.autoStock.listings || []).find(l => l.id === lotId);
        if (!lot) return;

        const buyerNames = ['Дмитрий', 'Арсен', 'Виталий', 'Николай Степанович', 'Егор'];
        const buyerAvatars = ['🧔', '🧢', '🧑‍🎓', '👨‍💼', '👴'];
        const buyerPhrases = [
            '«Здравствуйте! Готов выехать с деньгами на осмотр прямо сейчас. Уступите немного?»',
            '«Добрый день! Подбираю сыну такой автомобиль. Торг минимальный уместен?»',
            '«Привет, земляк! Заберу сегодня за наличку, если состояние как на фото.»'
        ];

        const rndIdx = Math.floor(Math.random() * buyerNames.length);
        const buyerName = buyerNames[rndIdx];
        const buyerAvatar = buyerAvatars[rndIdx];
        const phrase = buyerPhrases[Math.floor(Math.random() * buyerPhrases.length)];

        // Предлагаемая цена: 90-98% от цены лота
        const discountFactor = 0.90 + Math.random() * 0.08;
        const offeredPrice = Math.round((lot.price * discountFactor) / 1000) * 1000;

        const newChat = {
            id: 'chat_' + Date.now(),
            lotId: lot.id,
            carId: lot.carId,
            carName: lot.car.name,
            buyerName: buyerName,
            buyerAvatar: buyerAvatar,
            offeredPrice: offeredPrice,
            message: phrase,
            read: false,
            createdAt: Date.now()
        };

        if (!state.autoStock.chats) state.autoStock.chats = [];
        state.autoStock.chats.unshift(newChat);

        lot.callsCount = (lot.callsCount || 0) + 1;
        lot.views = (lot.views || 0) + Math.floor(Math.random() * 8) + 3;

        this.currentTab = 'chats';
        if (typeof showToast === 'function') showToast(`📲 Новый звонок от ${buyerName}!`);
        if (typeof playSound === 'function') playSound('ringtone');
        if (typeof saveState === 'function') saveState();

        this.render();
    },

    /**
     * Согласие на сделку в чате
     */
    acceptChatDeal(chatId) {
        const chat = (state.autoStock.chats || []).find(c => c.id === chatId);
        if (!chat) return;

        const revenue = chat.offeredPrice;

        // Начисляем деньги игроку
        state.player.cash = (state.player.cash || 0) + revenue;

        // Удаляем машину из гаража
        state.garage = (state.garage || []).filter(c => c && c.id !== chat.carId);

        // Удаляем объявление
        state.autoStock.listings = (state.autoStock.listings || []).filter(l => l.carId !== chat.carId);

        // Удаляем чаты по этой машине
        state.autoStock.chats = (state.autoStock.chats || []).filter(c => c.carId !== chat.carId);

        // Обновляем статистику
        state.autoStock.stats.totalSold = (state.autoStock.stats.totalSold || 0) + 1;
        state.autoStock.stats.totalRevenue = (state.autoStock.stats.totalRevenue || 0) + revenue;

        if (typeof addXp === 'function') addXp(50);
        if (typeof playSound === 'function') playSound('cash');
        if (typeof showToast === 'function') {
            showToast(`🎉 Сделка состоялась! «${chat.carName}» продан за ${revenue.toLocaleString()} ₽ (+50 XP)!`);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof renderGarage === 'function') renderGarage();
        this.render();
    },

    /**
     * Отклонение предложения
     */
    rejectChatDeal(chatId) {
        state.autoStock.chats = (state.autoStock.chats || []).filter(c => c.id !== chatId);
        if (typeof showToast === 'function') showToast("Предложение отклонено.");
        if (typeof saveState === 'function') saveState();
        this.render();
    },

    /**
     * Модалка платного продвижения объявления
     */
    openBoostModal(lotId) {
        const lot = (state.autoStock.listings || []).find(l => l.id === lotId);
        if (!lot) return;

        const optionsHtml = this.promotions.map(p => `
            <div class="as-promo-option" onclick="PhoneAutoStock.applyPromotion('${lot.id}', '${p.id}')">
                <div class="as-promo-opt-head">
                    <span>${p.icon} <b>${p.name}</b></span>
                    <strong class="color-amber">${p.cost.toLocaleString()} ₽</strong>
                </div>
                <div class="sub-label text-xs">${p.desc}</div>
            </div>
        `).join('');

        const modal = document.createElement('div');
        modal.id = 'modalAsPromo';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal-box text-left" style="max-width:380px;">
                <div class="flex-between mb-2">
                    <h3 class="font-bold color-cyan">⚡ Продвижение лота</h3>
                    <button class="btn btn-dark btn-sm" onclick="document.getElementById('modalAsPromo').remove()">✕</button>
                </div>
                <p class="sub-label text-xs mb-3">Выберите пакет услуг для «${lot.car.name}»:</p>
                ${optionsHtml}
            </div>
        `;
        document.body.appendChild(modal);
    },

    applyPromotion(lotId, promoId) {
        const promo = this.promotions.find(p => p.id === promoId);
        const lot = (state.autoStock.listings || []).find(l => l.id === lotId);
        if (!promo || !lot) return;

        if ((state.player?.cash || 0) < promo.cost) {
            if (typeof showToast === 'function') showToast("Недостаточно денег для покупки продвижения!");
            return;
        }

        state.player.cash -= promo.cost;
        lot.promo = true;
        lot.promoName = promo.name;
        lot.views = (lot.views || 0) + Math.floor(Math.random() * 30) + 20;

        const m = document.getElementById('modalAsPromo');
        if (m) m.remove();

        if (typeof showToast === 'function') showToast(`Пакет «${promo.name}» успешно активирован!`);
        if (typeof playSound === 'function') playSound('cash');
        if (typeof saveState === 'function') saveState();

        this.render();
    }
};

window.PhoneAutoStock = PhoneAutoStock;
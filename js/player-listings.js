/**
 * js/player-listings.js — СИСТЕМА ОБЪЯВЛЕНИЙ И ПРОДАЖИ АВТО ИГРОКОМ (v1.0.0)
 * Позволяет выставлять авто из гаража на рынок, формировать цену,
 * получать звонки/сообщения от NPC-покупателей и продавать машины.
 */

const PlayerListings = {
    selectedCarId: null,
    activeOffer: null,

    // Шаблоны описаний от игрока
    descriptionTemplates: [
        {
            id: 'honest',
            title: 'Честное описание',
            text: 'Автомобиль в хорошем состоянии для своих лет. Все недочеты устранил, расходники свежие. Торг строго у капота.',
            demandMod: 1.15,
            trustBonus: 5
        },
        {
            id: 'ideal',
            title: '«Не бит, не крашен»',
            text: 'Состояние нового авто! Сел и поехал хоть во Владивосток. Родной окрас, гаражное хранение. Перекупам просьба не звонить.',
            demandMod: 1.0,
            trustBonus: 0
        },
        {
            id: 'urgent',
            title: 'Срочная продажа',
            text: 'Срочно нужны деньги до конца недели! Отдам хорошему человеку с торгом. Документы кристально чистые.',
            demandMod: 1.35,
            trustBonus: -3
        },
        {
            id: 'drift',
            title: 'Боевой спек / Под проект',
            text: 'Отличная заготовка под зиму или первый дрифт-проект. Мотор тянет, подвеска отрабатывает на все бабки.',
            demandMod: 1.1,
            trustBonus: 2
        }
    ],

    // Архетипы потенциальных покупателей
    buyerTypes: [
        {
            id: 'student',
            name: 'Максим (Студент)',
            avatar: '🧑‍🎓',
            minOfferPercent: 0.88,
            maxOfferPercent: 0.98,
            comment: '«Здравствуйте! Ищу себе первую машину на учёбу ездить. Бюджет сильно ограничен, отдадите чуть дешевле?»'
        },
        {
            id: 'family',
            name: 'Алексей Николаевич (Семейный)',
            avatar: '👨‍👧',
            minOfferPercent: 0.92,
            maxOfferPercent: 1.02,
            comment: '«Добрый день! Подбираем надёжную машину для семьи и поездок на дачу. Если состояние честное — готов забрать сегодня.»'
        },
        {
            id: 'perekup_npc',
            name: 'Арсен (Перекуп)',
            avatar: '🧢',
            minOfferPercent: 0.75,
            maxOfferPercent: 0.86,
            comment: '«Брат, салам! Заберу через 15 минут за нал без лишних вопросов и осмотра. Деньги на руках, согласен?»'
        },
        {
            id: 'enthusiast',
            name: 'Сергей (Автолюбитель)',
            avatar: '🧔',
            minOfferPercent: 0.95,
            maxOfferPercent: 1.08,
            comment: '«Приветствую! Давно присматриваюсь к этой модели. Вижу по фото, что машина ухоженная. Готов забрать без торга!»'
        }
    ],

    /**
     * Инициализация хранилища объявлений в state
     */
    init() {
        if (!state.playerListings) {
            state.playerListings = [];
        }
    },

    /**
     * Максимальное число одновременных объявлений
     */
    getMaxListingsSlots() {
        let slots = 2; // Базово 2 объявления
        // Если куплен салон с пробегом «Престиж» в бизнес-сети
        if (state.business?.points?.showroom_used?.level > 0) {
            slots += (state.business.points.showroom_used.level * 2);
        }
        return slots;
    },

    /**
     * Открытие модалки создания объявления для конкретной машины из гаража
     */
    openCreateModal(carId) {
        this.init();

        const maxSlots = this.getMaxListingsSlots();
        if (state.playerListings.length >= maxSlots) {
            if (typeof showToast === 'function') {
                showToast(`Лимит объявлений исчерпан (${maxSlots} шт.)! Прокачайте автосалон в Бизнес-Сети.`);
            } else {
                alert(`Лимит объявлений исчерпан (${maxSlots} шт.)!`);
            }
            return;
        }

        // Проверяем, не выставлена ли машина уже
        if (state.playerListings.some(item => item.carId === carId)) {
            if (typeof showToast === 'function') {
                showToast("Эта машина уже находится в активных объявлениях!");
            }
            return;
        }

        const car = (state.garage || []).find(c => c && c.id === carId);
        if (!car) {
            if (typeof showToast === 'function') showToast("Автомобиль не найден в гараже!");
            return;
        }

        this.selectedCarId = carId;

        let modal = document.getElementById('modalCreateListing');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalCreateListing';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        const estMarket = car.marketValue || car.price || 150000;
        const mileageStr = (car.mileage || 85000).toLocaleString();

        let descOptionsHtml = this.descriptionTemplates.map((t, idx) => `
            <div class="glass-card p-2 mb-2 listing-template-radio" style="cursor:pointer; border:1px solid rgba(255,255,255,0.08);" onclick="PlayerListings.selectTemplate('${t.id}')" id="tpl_opt_${t.id}">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan">${t.title}</b>
                    <span class="tag-badge bg-tag-cyan">Спрос: x${t.demandMod}</span>
                </div>
                <div class="sub-label text-xs" style="font-size:9.5px;">${t.text}</div>
            </div>
        `).join('');

        modal.innerHTML = `
            <div class="modal-box text-left" style="max-width: 440px; max-height:90vh; overflow-y:auto;">
                <div class="flex-between mb-2">
                    <div class="modal-glow-badge" style="color:var(--cyan); border-color:rgba(0,242,254,0.4);">
                        📢 ПОДАТЬ ОБЪЯВЛЕНИЕ
                    </div>
                    <button onclick="ModalManager.close('modalCreateListing')" class="btn btn-dark btn-sm" style="padding:4px 8px;">✕</button>
                </div>

                <div class="glass-card mb-3 p-2 flex-between" style="background:#090e18;">
                    <div>
                        <div class="font-bold text-sm color-white">${car.name}</div>
                        <div class="sub-label text-xs">Пробег: ${mileageStr} км | Сост.: ${car.condition || 80}%</div>
                    </div>
                    <div class="text-right">
                        <div class="sub-label text-xs">Рыночная цена:</div>
                        <b class="color-cyan text-xs">${estMarket.toLocaleString()} ₽</b>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="sub-label text-xs block mb-1">Желаемая цена продажи (₽):</label>
                    <input type="number" id="listingPriceInput" class="w-full p-2 mb-1" style="background:#090e18; border:1px solid rgba(0,242,254,0.4); border-radius:8px; color:#fff; font-weight:bold; font-size:16px;" value="${estMarket}" oninput="PlayerListings.recalcDemandPreview()">
                    <div id="listingDemandHint" class="sub-label text-xs color-green">
                        ⚖️ Оценка спроса: Средний (Покупатели будут звонить умеренно)
                    </div>
                </div>

                <div class="mb-3">
                    <label class="sub-label text-xs block mb-1">Выберите стиль описания:</label>
                    ${descOptionsHtml}
                </div>

                <button onclick="PlayerListings.submitListing()" class="btn btn-cyan w-full font-bold">
                    🚀 Опубликовать объявление (Бесплатно)
                </button>
            </div>
        `;

        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalCreateListing');
        } else {
            modal.classList.add('active');
        }

        // По умолчанию выбираем честное описание
        this.selectTemplate('honest');
        this.recalcDemandPreview();
    },

    /**
     * Выбор шаблона описания
     */
    selectTemplate(templateId) {
        this.selectedTemplateId = templateId;
        document.querySelectorAll('.listing-template-radio').forEach(el => {
            el.style.borderColor = 'rgba(255,255,255,0.08)';
            el.style.background = 'transparent';
        });

        const activeEl = document.getElementById('tpl_opt_' + templateId);
        if (activeEl) {
            activeEl.style.borderColor = 'var(--cyan)';
            activeEl.style.background = 'rgba(0,242,254,0.08)';
        }
        this.recalcDemandPreview();
    },

    /**
     * Расчет прогноза спроса по цене
     */
    recalcDemandPreview() {
        const car = (state.garage || []).find(c => c && c.id === this.selectedCarId);
        if (!car) return;

        const input = document.getElementById('listingPriceInput');
        const hint = document.getElementById('listingDemandHint');
        if (!input || !hint) return;

        const price = Number(input.value) || 0;
        const market = car.marketValue || car.price || 150000;
        const diffRatio = price / market;

        if (diffRatio <= 0.85) {
            hint.className = 'sub-label text-xs color-green';
            hint.innerHTML = '🔥 Оценка спроса: Очень высокий! (Машину захотят оторвать с руками)';
        } else if (diffRatio <= 1.05) {
            hint.className = 'sub-label text-xs color-cyan';
            hint.innerHTML = '⚖️ Оценка спроса: Оптимальный (Адекватная рыночная цена)';
        } else if (diffRatio <= 1.25) {
            hint.className = 'sub-label text-xs color-amber';
            hint.innerHTML = '⚠️ Оценка спроса: Ниже среднего (Продажа может затянуться)';
        } else {
            hint.className = 'sub-label text-xs color-red';
            hint.innerHTML = '🛑 Оценка спроса: Мёртвый (Цена задрана, звонков почти не будет)';
        }
    },

    /**
     * Публикация объявления
     */
    submitListing() {
        this.init();

        const car = (state.garage || []).find(c => c && c.id === this.selectedCarId);
        if (!car) return;

        const priceInput = document.getElementById('listingPriceInput');
        const price = Number(priceInput ? priceInput.value : 0);

        if (!price || price <= 0) {
            if (typeof showToast === 'function') showToast("Укажите корректную стоимость продажи!");
            return;
        }

        const template = this.descriptionTemplates.find(t => t.id === this.selectedTemplateId) || this.descriptionTemplates[0];

        const listingItem = {
            id: 'listing_' + Date.now(),
            carId: car.id,
            car: car,
            price: price,
            templateId: template.id,
            description: template.text,
            createdAt: Date.now(),
            nextCallTime: Date.now() + (Math.floor(Math.random() * 15000) + 10000), // Первый звонок через 10-25 секунд
            offersCount: 0
        };

        state.playerListings.push(listingItem);

        if (typeof ModalManager !== 'undefined') {
            ModalManager.close('modalCreateListing');
        }

        if (typeof showToast === 'function') {
            showToast(`✅ «${car.name}» успешно выставлен на продажу за ${price.toLocaleString()} ₽!`);
        }
        if (typeof playSound === 'function') playSound('cash');

        if (typeof saveState === 'function') saveState();
        if (typeof renderGarage === 'function') renderGarage();
    },

    /**
     * Снятие авто с продажи
     */
    cancelListing(listingId) {
        this.init();
        state.playerListings = state.playerListings.filter(item => item.id !== listingId);
        if (typeof showToast === 'function') showToast("Объявление снято с публикации.");
        if (typeof saveState === 'function') saveState();
        if (typeof renderGarage === 'function') renderGarage();
    },

    /**
     * Проверка входящих звонков/предложений (вызывается в игровом цикле)
     */
    checkIncomingBuyerCalls() {
        this.init();
        if (!state.playerListings || state.playerListings.length === 0) return;

        const now = Date.now();

        state.playerListings.forEach(listing => {
            if (listing.nextCallTime && now >= listing.nextCallTime) {
                // Планируем следующий звонок
                listing.nextCallTime = now + (Math.floor(Math.random() * 30000) + 25000);
                listing.offersCount = (listing.offersCount || 0) + 1;

                this.generateBuyerOffer(listing);
            }
        });
    },

    /**
     * Генерация оффера от NPC-покупателя
     */
    generateBuyerOffer(listing) {
        const car = listing.car;
        if (!car) return;

        const buyer = this.buyerTypes[Math.floor(Math.random() * this.buyerTypes.length)];
        const template = this.descriptionTemplates.find(t => t.id === listing.templateId) || this.descriptionTemplates[0];

        // Расчёт предложения покупателя
        const marketPrice = car.marketValue || listing.price;
        const offerPercent = (buyer.minOfferPercent + Math.random() * (buyer.maxOfferPercent - buyer.minOfferPercent)) * template.demandMod;
        
        let offeredCash = Math.round((listing.price * offerPercent) / 5000) * 5000;
        // Ограничиваем сверху, чтобы покупатели не предлагали абсурдные миллионы сверх цены
        offeredCash = Math.min(Math.round(listing.price * 1.05), offeredCash);

        this.activeOffer = {
            listingId: listing.id,
            carId: car.id,
            car: car,
            buyer: buyer,
            offeredCash: offeredCash,
            askingPrice: listing.price
        };

        this.showIncomingOfferModal(this.activeOffer);
    },

    /**
     * Модальное окно звонка покупателя
     */
    showIncomingOfferModal(offer) {
        let modal = document.getElementById('modalIncomingBuyerOffer');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalIncomingBuyerOffer';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        const car = offer.car;
        const buyer = offer.buyer;
        const profit = offer.offeredCash - (car.purchaseCost || car.price || 0);

        modal.innerHTML = `
            <div class="modal-box text-center" style="max-width: 420px;">
                <div class="modal-glow-badge mb-1" style="color:var(--cyan); border-color:rgba(0,242,254,0.4);">
                    📞 ВХОДЯЩИЙ ЗВОНОК ПО ОБЪЯВЛЕНИЮ
                </div>

                <div class="mb-2" style="font-size:36px;">${buyer.avatar}</div>
                <h3 class="font-bold mb-1 color-cyan">${buyer.name}</h3>
                <div class="sub-label mb-3" style="font-size:11px;">Интересуется: «${car.name}»</div>

                <div class="seller-dialog-bubble text-left mb-3">
                    <span class="seller-bubble-text">${buyer.comment}</span>
                </div>

                <div class="glass-card p-3 mb-3 text-left" style="background:#090e18;">
                    <div class="flex-between mb-1">
                        <span class="sub-label text-xs">Ваша цена в объявлении:</span>
                        <b class="text-xs color-white">${offer.askingPrice.toLocaleString()} ₽</b>
                    </div>
                    <div class="flex-between mb-1">
                        <span class="sub-label text-xs">Предложение покупателя:</span>
                        <b class="text-sm color-green">${offer.offeredCash.toLocaleString()} ₽</b>
                    </div>
                    <div class="flex-between">
                        <span class="sub-label text-xs">Чистая прибыль со сделки:</span>
                        <b class="text-xs ${profit >= 0 ? 'color-green' : 'color-red'}">
                            ${profit >= 0 ? '+' : ''}${profit.toLocaleString()} ₽
                        </b>
                    </div>
                </div>

                <div class="space-y-2">
                    <button onclick="PlayerListings.acceptOffer()" class="btn btn-green w-full font-bold mb-1">
                        🤝 Согласиться и оформить сделку (+${offer.offeredCash.toLocaleString()} ₽)
                    </button>
                    <button onclick="PlayerListings.rejectOffer()" class="btn btn-dark w-full">
                        ❌ Отказать (Ждать другого покупателя)
                    </button>
                </div>
            </div>
        `;

        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalIncomingBuyerOffer');
        } else {
            modal.classList.add('active');
        }

        if (typeof playSound === 'function') playSound('ringtone');
        if (typeof tgHaptic === 'function') tgHaptic('notification');
    },

    /**
     * Принятие оффера: начисление денег и удаление авто из гаража
     */
    acceptOffer() {
        if (!this.activeOffer) return;

        const offer = this.activeOffer;
        const carId = offer.carId;
        const cashEarned = offer.offeredCash;

        // Начисляем баланс
        state.player.cash = (state.player.cash || 0) + cashEarned;

        // Статистика
        if (!state.player.stats) state.player.stats = {};
        state.player.stats.sold = (state.player.stats.sold || 0) + 1;
        state.player.stats.totalEarned = (state.player.stats.totalEarned || 0) + cashEarned;

        // Удаляем авто из гаража
        state.garage = (state.garage || []).filter(c => c && c.id !== carId);

        // Удаляем из активных объявлений
        state.playerListings = (state.playerListings || []).filter(l => l.carId !== carId);

        if (typeof ModalManager !== 'undefined') {
            ModalManager.close('modalIncomingBuyerOffer');
        }

        if (typeof addXp === 'function') addXp(60);
        if (typeof playSound === 'function') playSound('cash');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        if (typeof showToast === 'function') {
            showToast(`🎉 Сделка закрыта! Вы продали «${offer.car.name}» за ${cashEarned.toLocaleString()} ₽ (+60 XP)!`);
        }

        this.activeOffer = null;

        if (typeof saveState === 'function') saveState();
        if (typeof renderGarage === 'function') renderGarage();
    },

    /**
     * Отказ от предложения
     */
    rejectOffer() {
        if (typeof ModalManager !== 'undefined') {
            ModalManager.close('modalIncomingBuyerOffer');
        }
        if (typeof showToast === 'function') showToast("Вы отказали покупателю. Ждём новых звонков.");
        this.activeOffer = null;
    }
};

// Экспорт в глобальное окружение
window.PlayerListings = PlayerListings;
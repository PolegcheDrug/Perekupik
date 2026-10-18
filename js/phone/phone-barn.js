// ========================================================
// js/phone-barn.js — ПРИЛОЖЕНИЕ «ПОИСК В САРАЯХ» (v1.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v1.1.0 (ЕДИНЫЙ PLATESMANAGER):
//   - scoutBarnAction → PlatesManager.addPlate для номеров
//   - Убрана прямая запись в state.ownedPlates
//   - Fallback на прямую запись в platesInventory
//   - Проверка загрузки PlatesManager перед вызовом
// ⭐ v1.0.0:
//   - Первая версия с 4 ярусами сараев
// ========================================================

const DEFAULT_BARN_TIERS_STANDALONE = [
    {
        tier: 1, reqLvl: 3, cost: 35000, reqStars: 2, title: "🏚️ Сарай в СНТ «Заря»",
        desc: "Дачный кооператив. Старый деревянный сарай среди яблонь. Советская классика и архивные номера.",
        classGrade: "barn-grade-1", rareIdx: 0,
        img: "assets/barns/barn_tier1.jpg",
        fallback: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80"
    },
    {
        tier: 2, reqLvl: 7, cost: 120000, reqStars: 5, title: "🏢 Заброшенный бокс ГСК-4",
        desc: "Кооператив возле промзоны. Ржавые ворота, сухой бетон. Янгтаймеры и советский инструмент.",
        classGrade: "barn-grade-2", rareIdx: 1,
        img: "assets/barns/barn_tier2.jpg",
        fallback: "https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?auto=format&fit=crop&w=600&q=80"
    },
    {
        tier: 3, reqLvl: 15, cost: 350000, reqStars: 10, title: "🏭 Ангар механического завода",
        desc: "Закрытый цех советского завода. Высокие потолки, пыльные чехлы и JDM легенды 90-х.",
        classGrade: "barn-grade-3", rareIdx: 2,
        img: "assets/barns/barn_tier3.jpg",
        fallback: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80"
    },
    {
        tier: 4, reqLvl: 25, cost: 850000, reqStars: 20, title: "🏛️ Коллекционный бункер",
        desc: "Опечатанный подземный паркинг банка. Раритетные спорткары, редчайшие госномера и джекпоты!",
        classGrade: "barn-grade-4", rareIdx: 4,
        img: "assets/barns/barn_tier4.jpg",
        fallback: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80"
    }
];

const DEFAULT_BARN_FINDS_STANDALONE = [
    { name: "ВАЗ-2101 «Копейка» (Дрифт-Спек)", power: 160, type: 'economy', basePrice: 850000, marketValue: 1250000, img: "assets/cars/economy/2101/vaz-2101.jpg", fallback: "assets/cars/economy/2101/vaz-2101.jpg" },
    { name: "BMW E30 Coupe", power: 170, type: 'comfort', basePrice: 650000, marketValue: 1300000, img: "assets/cars/comfort/polo/polo.jpg", fallback: "assets/cars/comfort/polo/polo.jpg" },
    { name: "Nissan Silvia S13", power: 200, type: 'comfort', basePrice: 900000, marketValue: 1800000, img: "assets/cars/comfort/octavia/octavia.jpg", fallback: "assets/cars/comfort/octavia/octavia.jpg" },
    { name: "VW Golf VI GTI (Stage 2 Project)", power: 280, type: 'comfort', basePrice: 1100000, marketValue: 1900000, img: "assets/cars/comfort/golf6/golf6.jpg", fallback: "assets/cars/comfort/golf6/golf6.jpg" },
    { name: "ГАЗ-24 «Волга» V8", power: 220, type: 'economy', basePrice: 700000, marketValue: 1500000, img: "assets/cars/economy/volga/volga.jpg", fallback: "assets/cars/economy/volga/volga.jpg" },
    { name: "Nissan Skyline GT-R R34 (В пыли)", power: 280, type: 'premium', basePrice: 4500000, marketValue: 9500000, img: "assets/cars/premium/g20/g20.jpg", fallback: "assets/cars/premium/g20/g20.jpg" },
    { name: "Toyota Supra A80 (Без мотора)", power: 0, type: 'premium', basePrice: 3200000, marketValue: 7000000, img: "assets/cars/premium/g30/g30.jpg", fallback: "assets/cars/premium/g30/g30.jpg" }
];

const AppBarn = {
    render(container) {
        if (!container) return;

        const pDay = state.player?.day || 1;
        const lastDay = state.player?.lastBarnDay || 0;
        const canScoutToday = lastDay < pDay;
        const lvl = state.player?.level || 1;

        let statusText = canScoutToday
            ? "<span class='tag-badge bg-tag-green'>ДОСТУПНО СЕЙЧАС ✓</span>"
            : "<span class='tag-badge bg-tag-amber'>1 РАЗ В СУТКИ ⏳</span>";

        const tiers = (typeof BARN_TIERS_CONFIG !== 'undefined' && Array.isArray(BARN_TIERS_CONFIG) && BARN_TIERS_CONFIG.length > 0)
            ? BARN_TIERS_CONFIG
            : DEFAULT_BARN_TIERS_STANDALONE;

        let tiersHtml = "";

        tiers.forEach(b => {
            let isLvlLocked = lvl < b.reqLvl;
            let isDoneToday = !canScoutToday;
            let starsTxt = b.reqStars ? ` + ${b.reqStars} ⭐` : "";

            let statusBadge = isLvlLocked
                ? `<span class='tag-badge bg-tag-red'><i class='fa-solid fa-lock'></i> С ${b.reqLvl} УР</span>`
                : (isDoneToday ? "<span class='tag-badge bg-tag-amber'>Осмотрено</span>" : "<span class='tag-badge bg-tag-green'>Доступно</span>");

            let btnDisabled = (isLvlLocked || isDoneToday) ? "disabled" : "";
            let btnClass = (isLvlLocked || isDoneToday) ? "btn btn-dark btn-sm w-full opacity-50" : "btn btn-amber btn-sm w-full";
            let btnText = isLvlLocked
                ? `🔒 С ${b.reqLvl} уровня`
                : (isDoneToday ? "Осмотрено сегодня (ждём 00:00 🌙)" : `Вскрыть ангар (${(b.cost / 1000).toFixed(0)}k ₽${starsTxt})`);

            let imgSrc = b.img || `assets/barns/barn_tier${b.tier}.jpg`;
            let fallbackSrc = b.fallback || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80';

            tiersHtml += `
                <div class="glass-card mb-3 p-2 ${b.classGrade || ''}" style="border-color:${isLvlLocked ? 'rgba(255,255,255,0.06)' : 'rgba(255,179,0,0.35)'};">
                    <div class="car-img-wrap mb-2" style="height:125px; position:relative;">
                        <img src="${imgSrc}" class="car-img" onerror="this.onerror=null; this.src='${fallbackSrc}';">
                        <div class="badge-tag badge-br">${statusBadge}</div>
                    </div>
                    <div class="flex-between mb-1">
                        <b class="text-xs color-amber" style="font-size:12.5px;">${b.title}</b>
                        <span class="price-val text-xs color-green">${b.cost.toLocaleString()} ₽${starsTxt}</span>
                    </div>
                    <p class="sub-label mb-2" style="font-size:9.5px; line-height:1.35;">${b.desc}</p>
                    <div class="text-xs mb-1 color-amber" style="font-size:9px;">⭐ Шанс капсулы времени: <b>35%</b></div>
                    <div class="text-xs mb-2 color-purple" style="font-size:9px;">🏷️ Архивные номера СССР/РФ: <b>25%</b></div>
                    <button onclick="AppBarn.scoutBarnAction(${b.tier})" class="${btnClass}" ${btnDisabled}>${btnText}</button>
                </div>
            `;
        });

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title color-amber"><i class="fa-solid fa-warehouse mr-1"></i> Находки в сараях</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2 flex-between" style="background: radial-gradient(circle at 50% 0%, rgba(255, 179, 0, 0.16), #090e18); border-color: var(--amber);">
                    <div>
                        <b class="text-xs color-amber"><i class="fa-solid fa-map-location-dot mr-1"></i> Разведка заброшек</b>
                        <div class="sub-label" style="font-size:9px;">Опечатанные боксы, ретро-капсулы времени и советский инструмент</div>
                    </div>
                    ${statusText}
                </div>
                <div class="space-y-1">
                    ${tiersHtml}
                </div>
            </div>
        `;
    },

    // ⭐ v1.1.0: номера через PlatesManager
    scoutBarnAction(tierIndex) {
        const tiers = (typeof BARN_TIERS_CONFIG !== 'undefined' && Array.isArray(BARN_TIERS_CONFIG) && BARN_TIERS_CONFIG.length > 0)
            ? BARN_TIERS_CONFIG
            : DEFAULT_BARN_TIERS_STANDALONE;

        const tier = tiers.find(t => t.tier === tierIndex) || tiers[0];
        if (!tier) return;

        let pLvl = state.player?.level || 1;
        if (pLvl < tier.reqLvl) {
            return showToast(`Этот ярус открывается с ${tier.reqLvl} уровня!`);
        }

        let lastDay = state.player?.lastBarnDay || 0;
        let curDay = state.player?.day || 1;
        if (lastDay >= curDay) {
            return showToast("Разведка сегодня уже проведена! Возвращайтесь завтра.");
        }

        let cash = state.player?.cash || 0;
        let stars = state.player?.stars || 0;
        let reqStars = tier.reqStars || 0;

        if (cash < tier.cost) return showToast("Не хватает рублей на вскрытие сарая!");
        if (stars < reqStars) return showToast(`Нужно ${reqStars} Stars ⭐!`);

        state.player.cash -= tier.cost;
        if (reqStars > 0) state.player.stars -= reqStars;
        state.player.lastBarnDay = curDay;

        let roll = Math.random();
        const findsPool = (typeof BARN_FINDS !== 'undefined' && Array.isArray(BARN_FINDS) && BARN_FINDS.length > 0)
            ? BARN_FINDS
            : DEFAULT_BARN_FINDS_STANDALONE;

        if (roll < 0.35 && findsPool.length > 0) {
            // ════ ВЫПАДЕНИЕ МАШИНЫ ════
            const carTemplate = findsPool[Math.floor(Math.random() * findsPool.length)];
            let wonPlate = (typeof generateCoolPlate === 'function') ? generateCoolPlate() : "В777ВВ 77";
            let marketVal = carTemplate.marketValue || Math.round(tier.cost * 2.2);

            let chosenImg = carTemplate.img || "assets/cars/economy/2101/vaz-2101.jpg";
            if (Array.isArray(carTemplate.images) && carTemplate.images.length > 0) {
                chosenImg = carTemplate.images[Math.floor(Math.random() * carTemplate.images.length)];
            }

            let wonCar = {
                id: "barn_car_" + Date.now(),
                name: carTemplate.name,
                type: carTemplate.type || 'economy',
                power: carTemplate.power || 120,
                basePrice: carTemplate.basePrice || 250000,
                price: carTemplate.basePrice || 250000,
                baseMarketValue: marketVal,
                marketValue: marketVal,
                img: chosenImg,
                fallback: carTemplate.fallback || "assets/cars/economy/2101/vaz-2101.jpg",
                plate: wonPlate,
                customPlate: wonPlate,
                condition: Math.floor(65 + Math.random() * 25),
                wear: { engine: 75, transmission: 80 },
                isRegisteredOnPlayer: false,
                ownershipDays: 0,
                engineTemp: 90,
                tireWear: 85,
                purchaseCost: tier.cost,
                tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, rollCage: false, dragSlicks: false, hydroHandbrake: false, weldedDiff: false, steeringAngle: false, bucketSeats: false, customWheels: false, risk1251: 0 }
            };

            // ⭐ v1.1.0: номер через PlatesManager
            if (wonPlate && !wonPlate.includes("ТРАНЗИТ")) {
                if (window.PlatesManager) {
                    try {
                        window.PlatesManager.addPlate(wonPlate, 'barn_car', { silent: true });
                        window.PlatesManager.attachPlateToCar(wonCar, wonPlate, { silent: true, skipFirestore: true });
                    } catch (e) {
                        console.warn("[Barn] Ошибка PlatesManager:", e);
                    }
                } else {
                    // Fallback
                    if (!state.player.platesInventory) state.player.platesInventory = [];
                    state.player.platesInventory.push({
                        id: 'plate_' + Date.now(),
                        number: String(wonPlate).trim().toUpperCase(),
                        region: 77,
                        status: 'installed',
                        installedCarId: wonCar.id,
                        ownerId: state.player.uid || 'player_local',
                        source: 'barn_car_fallback',
                        createdAt: Date.now()
                    });
                }
            }

            if (typeof recalculateCarMarketValue === 'function') {
                recalculateCarMarketValue(wonCar);
            }

            if (typeof window.ensureCarIdentity === 'function') {
                window.ensureCarIdentity(wonCar);
            }

            if (typeof window.pushToMailbox === 'function') {
                window.pushToMailbox({
                    type: "car",
                    title: `Капсула времени: ${wonCar.name}`,
                    sender: `Служба эвакуации (${tier.title})`,
                    desc: `Автомобиль успешно извлечён из заброшенного бокса! Госномер: ${wonPlate}. Посылка ожидает распаковки в Почте.`,
                    badge: "САРАЙ",
                    carData: wonCar
                });
            } else {
                if (!state.garage) state.garage = [];
                state.garage.push(wonCar);
            }

            let gainedXp = 120;
            if (typeof addXp === 'function') addXp(gainedXp);

            saveState();
            updateHeaderUI();
            if (typeof renderGarage === 'function') renderGarage();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

            openVerdictModal(
                "ЛЕГЕНДАРНАЯ НАХОДКА В САРАЕ! 🏚️",
                `Найден редкий автомобиль <b>${wonCar.name}</b> (отправлен в Почту)!\nОпыт авторитета: +${gainedXp} XP`,
                true
            );
        } else if (roll < 0.60) {
            // ════ ВЫПАДЕНИЕ НОМЕРА (⭐ v1.1.0: через PlatesManager) ════
            let coolPlate = (typeof generateCoolPlate === 'function') ? generateCoolPlate() : "А001МР 77";
            let plateVal = (typeof calculatePlateValue === 'function') ? calculatePlateValue(coolPlate) : 75000;

            // ⭐ v1.1.0: Регистрируем номер через PlatesManager
            if (window.PlatesManager) {
                window.PlatesManager.addPlate(coolPlate, 'barn_find', { silent: true });
            } else {
                // Fallback: прямая запись в platesInventory
                if (!state.player.platesInventory) state.player.platesInventory = [];
                state.player.platesInventory.push({
                    id: 'plate_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
                    number: String(coolPlate).trim().toUpperCase(),
                    region: 77,
                    status: 'inventory',
                    installedCarId: null,
                    ownerId: state.player.uid || 'player_local',
                    source: 'barn_find_fallback',
                    createdAt: Date.now()
                });
            }

            // Также пушим в почту как отдельный item (для UI «архивная находка»)
            if (typeof window.pushToMailbox === 'function') {
                window.pushToMailbox({
                    type: "plate",
                    title: `Архивный знак: ${coolPlate}`,
                    sender: "Разведка заброшек",
                    desc: `На стене гаража обнаружен советский госномер! Оценка знака: ~${plateVal.toLocaleString()} ₽.`,
                    badge: "НОМЕР",
                    plate: coolPlate
                });
            }

            let bonusCash = Math.round(tier.cost * 0.6);
            state.player.cash += bonusCash;
            let gainedXp = 60;
            if (typeof addXp === 'function') addXp(gainedXp);

            saveState();
            updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

            openVerdictModal(
                "АРХИВНЫЙ ГОСНОМЕР НАЙДЕН! 🏷️",
                `На стене бокса обнаружен редкий номер: <b>${coolPlate}</b>!<br>Рыночная стоимость знака: ~${plateVal.toLocaleString()} ₽.<br>Дополнительно найдена заначка: +${bonusCash.toLocaleString()} ₽ (+${gainedXp} XP).`,
                true,
                bonusCash
            );
        } else if (roll < 0.85) {
            // ════ ВЫПАДЕНИЕ СОВЕТСКОГО ИНСТРУМЕНТА / ЗАПЧАСТЕЙ ════
            let winCash = Math.round(tier.cost * (1.35 + Math.random() * 0.45));
            let gainedXp = 50;
            state.player.cash += winCash;
            if (typeof addXp === 'function') addXp(gainedXp);

            if (state.businesses) {
                state.businesses.forEach(b => {
                    if (b && b.level > 0) b.stock = Math.min(b.maxStock || 100, (b.stock || 0) + 20);
                });
            }

            saveState();
            updateHeaderUI();
            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');

            openVerdictModal(
                "СОВЕТСКИЙ ИНСТРУМЕНТ И З/Ч! 🔩",
                `В ящиках найдены советские верстачные тиски, наборы головок и запчасти!<br>Выручка со скупки: +${winCash.toLocaleString()} ₽ (+${gainedXp} XP).<br>Склады предприятий пополнены сырьем (+20%).`,
                true,
                winCash
            );
        } else {
            // ════ ПУСТОЙ САРАЙ ════
            let gainedXp = 25;
            if (typeof addXp === 'function') addXp(gainedXp);
            saveState();
            updateHeaderUI();
            if (typeof playSound === 'function') playSound('error');
            if (typeof tgHaptic === 'function') tgHaptic('error');

            openVerdictModal(
                "ПУСТОЙ САРАЙ 💨",
                `Внутри оказались лишь ржавые трубы и пустые банки. Ничего ценного не найдено.<br>Получено +${gainedXp} XP за разведку.`,
                false
            );
        }

        this.render(document.getElementById('phoneAppContainer'));
    }
};

window.AppBarn = AppBarn;

console.log('[🏚 phone-barn v1.1.0] PlatesManager.addPlate для номеров (убрана прямая запись в state.ownedPlates) ✓');
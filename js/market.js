// ========================================================
// js/market.js — АВТОРЫНОК, ЛОКАЛИЗАЦИЯ И УНИКАЛЬНЫЕ НОМЕРА (v0.4.5)
// Разработчики: Илья Чепиль (DXF) & Perekup Dev Team
// Устранение бага зависания толщиномера ЛКП, диалог выбора
// «Учёт РФ в МРЭО vs Перепродажа по ДКП», трекинг заданий
// ========================================================

const PLATE_LETTERS = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];[span_0](start_span)[span_0](end_span)
const REGIONS = ['77', '99', '97', '177', '199', '777', '799', '50', '90', '150', '190', '750'];[span_1](start_span)[span_1](end_span)

function t(key) {
    let lang = state.lang || 'ru';[span_2](start_span)[span_2](end_span)
    if (typeof I18N_TRANSLATIONS !== 'undefined' && I18N_TRANSLATIONS[lang] && I18N_TRANSLATIONS[lang][key]) {
        return I18N_TRANSLATIONS[lang][key];[span_3](start_span)[span_3](end_span)
    }
    return key;[span_4](start_span)[span_4](end_span)
}

function getCategoryFallback(type) {
    if (typeof CAR_FALLBACKS_BY_CATEGORY !== 'undefined' && CAR_FALLBACKS_BY_CATEGORY[type]) {
        return CAR_FALLBACKS_BY_CATEGORY[type];[span_5](start_span)[span_5](end_span)
    }
    return "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80";[span_6](start_span)[span_6](end_span)
}

function generateRawNormalPlate() {
    const l1 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];[span_7](start_span)[span_7](end_span)
    const l2 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];[span_8](start_span)[span_8](end_span)
    const l3 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];[span_9](start_span)[span_9](end_span)
    const num = String(Math.floor(Math.random() * 899) + 100);[span_10](start_span)[span_10](end_span)
    const reg = REGIONS[Math.floor(Math.random() * REGIONS.length)];[span_11](start_span)[span_11](end_span)
    return l1 + num + l2 + l3 + " " + reg;[span_12](start_span)[span_12](end_span)
}

function generateRawCoolPlate() {
    let letters = "";[span_13](start_span)[span_13](end_span)
    if (Math.random() > 0.6) {[span_14](start_span)[span_14](end_span)
        const l = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];[span_15](start_span)[span_15](end_span)
        letters = l + l + l;[span_16](start_span)[span_16](end_span)
    } else {
        const l1 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];[span_17](start_span)[span_17](end_span)
        const l2 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];[span_18](start_span)[span_18](end_span)
        letters = l1 + l2 + l2;[span_19](start_span)[span_19](end_span)
    }
    const coolNums = ['111', '222', '333', '444', '555', '666', '777', '888', '999', '007', '001', '100', '700'];[span_20](start_span)[span_20](end_span)
    const num = coolNums[Math.floor(Math.random() * coolNums.length)];[span_21](start_span)[span_21](end_span)
    const reg = ['77', '99', '97', '777', '50'][Math.floor(Math.random() * 5)];[span_22](start_span)[span_22](end_span)
    return letters.charAt(0) + num + letters.substring(1) + " " + reg;[span_23](start_span)[span_23](end_span)
}

// ГЕНЕРАТОР УНИКАЛЬНЫХ ГОСНОМЕРОВ (БЕЗ ДУБЛЕЙ)
function getUniquePlate(preferCool = false) {
    if (!state.registeredPlates) state.registeredPlates = [];[span_24](start_span)[span_24](end_span)
    
    let plateCandidate = "";[span_25](start_span)[span_25](end_span)
    let attempts = 0;[span_26](start_span)[span_26](end_span)

    do {
        attempts++;[span_27](start_span)[span_27](end_span)
        plateCandidate = preferCool ? generateRawCoolPlate() : generateRawNormalPlate();[span_28](start_span)[span_28](end_span)
    } while (state.registeredPlates.includes(plateCandidate) && attempts < 35);[span_29](start_span)[span_29](end_span)

    state.registeredPlates.push(plateCandidate);[span_30](start_span)[span_30](end_span)
    return plateCandidate;[span_31](start_span)[span_31](end_span)
}

function generateNormalPlate() {
    return getUniquePlate(false);[span_32](start_span)[span_32](end_span)
}

function generateCoolPlate() {
    return getUniquePlate(true);[span_33](start_span)[span_33](end_span)
}

function evaluatePlate(plateStr) {
    if (typeof calculatePlateValue === 'function') {
        return calculatePlateValue(plateStr);[span_34](start_span)[span_34](end_span)
    }
    if (!plateStr) return 0;[span_35](start_span)[span_35](end_span)
    if (String(plateStr).startsWith('ТРАНЗИТ')) return 0;[span_36](start_span)[span_36](end_span)
    return 2500;[span_37](start_span)[span_37](end_span)
}

function refreshPlateCatalog() {
    state.plateCatalog = [];[span_38](start_span)[span_38](end_span)
    for (let i = 0; i < 6; i++) {[span_39](start_span)[span_39](end_span)
        const isCool = Math.random() < 0.25;[span_40](start_span)[span_40](end_span)
        let p = isCool ? generateCoolPlate() : generateNormalPlate();[span_41](start_span)[span_41](end_span)
        const cost = Math.round(evaluatePlate(p) * (1.05 + Math.random() * 0.20));[span_42](start_span)[span_42](end_span)
        state.plateCatalog.push({ plate: p, price: cost });[span_43](start_span)[span_43](end_span)
    }
}

let activeInspectCarId = null;[span_44](start_span)[span_44](end_span)
let pendingMarketCar = null;[span_45](start_span)[span_45](end_span)
let activePendingDKPDeal = null;

function getDynamicPrice(basePrice, type) {
    if (!state.marketModifiers) state.marketModifiers = { economy: 1, comfort: 1, premium: 1, all: 1 };[span_46](start_span)[span_46](end_span)
    let mod = 1;[span_47](start_span)[span_47](end_span)
    if (state.marketModifiers && state.marketModifiers[type]) mod = state.marketModifiers[type];[span_48](start_span)[span_48](end_span)
    let globalMod = 1;[span_49](start_span)[span_49](end_span)
    if (state.marketModifiers && state.marketModifiers.all) globalMod = state.marketModifiers.all;[span_50](start_span)[span_50](end_span)
    let price = 100000;[span_51](start_span)[span_51](end_span)
    if (basePrice) price = basePrice;[span_52](start_span)[span_52](end_span)
    return Math.floor(price * mod * globalMod);[span_53](start_span)[span_53](end_span)
}

function getMarketRefreshCost() {
    let lvl = 1;[span_54](start_span)[span_54](end_span)
    if (state.player && state.player.level) lvl = state.player.level;[span_55](start_span)[span_55](end_span)
    return 150 + (lvl * 350);[span_56](start_span)[span_56](end_span)
}

const CATEGORY_META = {
    economy: { name: "ЭКОНОМ", title: "Сегмент Эконом", capital: "от 50 000 ₽", desc: "Быстрый оборот, минимальные риски на старте и высокий спрос перекупов." },[span_57](start_span)[span_57](end_span)
    scooter: { name: "СКУТЕРЫ", title: "Городские Скутеры", capital: "от 25 000 ₽", desc: "Дешёвый порог входа, моментальные сделки без заморочек с документами." },[span_58](start_span)[span_58](end_span)
    moto: { name: "МОТО", title: "Спортбайки & Классика", capital: "от 120 000 ₽", desc: "Высокая сезонная маржа, проверка состояния вилки и геометрии рамы." },[span_59](start_span)[span_59](end_span)
    atv: { name: "КВАДРО", title: "Квадроциклы 4x4", capital: "от 180 000 ₽", desc: "Техника для бездорожья. Частые скрытые дефекты ходовой и приводов." },[span_60](start_span)[span_60](end_span)
    comfort: { name: "КОМФОРТ", title: "Сегмент Комфорт", capital: "от 450 000 ₽", desc: "Городские седаны и кроссоверы. Идеально под выкуп для таксопарков." },[span_61](start_span)[span_61](end_span)
    premium: { name: "ПРЕМИУМ", title: "Премиум & Люкс", capital: "от 1 200 000 ₽", desc: "Высокая чистая прибыль с одной сделки, но капризные и дотошные клиенты." },[span_62](start_span)[span_62](end_span)
    hyper: { name: "ГИПЕРКАРЫ", title: "Спорт & Экзотика", capital: "от 5 000 000 ₽", desc: "Огромная маржа, эксклюзивные клиенты и дорогие комплектующие." },[span_63](start_span)[span_63](end_span)
    truck: { name: "ГРУЗОВИКИ", title: "Коммерческий транспорт", capital: "от 2 500 000 ₽", desc: "Тягачи и фургоны для крупных заказов Синдиката под ключ." },[span_64](start_span)[span_64](end_span)
    yacht: { name: "ЯХТЫ", title: "Морской сегмент", capital: "от 15 000 000 ₽", desc: "Элитная морская техника для настоящих автомобильных олигархов." }[span_65](start_span)[span_65](end_span)
};

function toggleMarketCategories() {
    const grid = document.getElementById('marketCatListContainer');[span_66](start_span)[span_66](end_span)
    const btnIcon = document.querySelector('#btnToggleMarketGrid i');[span_67](start_span)[span_67](end_span)
    if (!grid) return;[span_68](start_span)[span_68](end_span)
    grid.classList.toggle('collapsed');[span_69](start_span)[span_69](end_span)
    if (btnIcon) {
        btnIcon.className = grid.classList.contains('collapsed') ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-up";[span_70](start_span)[span_70](end_span)
    }
}

function setCategory(cat) {
    let lvl = state.player?.level ? state.player.level : 1;[span_71](start_span)[span_71](end_span)
    
    if (cat === 'moto' && lvl < 5) return showToast("🔒 Мотоциклы доступны с 5 уровня!");[span_72](start_span)[span_72](end_span)
    if (cat === 'atv' && lvl < 8) return showToast("🔒 Квадроциклы доступны с 8 уровня!");[span_73](start_span)[span_73](end_span)
    if (cat === 'comfort' && lvl < 30) return showToast("🔒 Нужен 30 ур!");[span_74](start_span)[span_74](end_span)
    if (cat === 'premium' && lvl < 30) return showToast("🔒 Нужен 30 ур!");[span_75](start_span)[span_75](end_span)
    if (cat === 'hyper' && lvl < 50) return showToast("🔒 Нужен 50 ур!");[span_76](start_span)[span_76](end_span)
    if (cat === 'truck' && lvl < 50) return showToast("🔒 Нужен 50 ур!");[span_77](start_span)[span_77](end_span)
    if (cat === 'yacht' && lvl < 100) return showToast("🔒 Нужен 100 ур!");[span_78](start_span)[span_78](end_span)
    
    state.activeCategory = cat;[span_79](start_span)[span_79](end_span)
    
    document.querySelectorAll('.cat-tile').forEach(c => c.classList.remove('active'));[span_80](start_span)[span_80](end_span)
    const btn = document.getElementById("catBtn-" + cat);[span_81](start_span)[span_81](end_span)
    if (btn) btn.classList.add('active');[span_82](start_span)[span_82](end_span)

    const meta = CATEGORY_META[cat] ? CATEGORY_META[cat] : CATEGORY_META.economy;[span_83](start_span)[span_83](end_span)
    setTxt("currentCatBadge", meta.name);[span_84](start_span)[span_84](end_span)
    setTxt("catInfoTitle", "<i class='fa-solid fa-chart-line'></i> " + meta.title + ":");[span_85](start_span)[span_85](end_span)
    setTxt("catInfoPrice", "Капитал: " + meta.capital);[span_86](start_span)[span_86](end_span)
    setTxt("catInfoDesc", meta.desc);[span_87](start_span)[span_87](end_span)

    playSound('tick');[span_88](start_span)[span_88](end_span)
    populateMarketFeed();[span_89](start_span)[span_89](end_span)
}

function refreshMarketFeedManual() {
    const cost = getMarketRefreshCost();[span_90](start_span)[span_90](end_span)
    let pCash = (state.player && state.player.cash) ? state.player.cash : 0;[span_91](start_span)[span_91](end_span)
    let pFuel = (state.player && state.player.fuel !== undefined) ? state.player.fuel : 0;[span_92](start_span)[span_92](end_span)

    if (pCash < cost) return showToast("Не хватает " + cost.toLocaleString() + " ₽!");[span_93](start_span)[span_93](end_span)
    if (pFuel < 5) return showToast("Закончился бензин ⛽! Заправьтесь на АЗС.");[span_94](start_span)[span_94](end_span)
    
    state.player.cash -= cost;[span_95](start_span)[span_95](end_span)
    state.player.fuel -= 5;[span_96](start_span)[span_96](end_span)
    
    const grid = document.getElementById('marketCatListContainer');[span_97](start_span)[span_97](end_span)
    const btnIcon = document.querySelector('#btnToggleMarketGrid i');[span_98](start_span)[span_98](end_span)
    if (grid && !grid.classList.contains('collapsed')) {[span_99](start_span)[span_99](end_span)
        grid.classList.add('collapsed');[span_100](start_span)[span_100](end_span)
        if (btnIcon) btnIcon.className = "fa-solid fa-chevron-down";[span_101](start_span)[span_101](end_span)
    }

    saveState();[span_102](start_span)[span_102](end_span)
    populateMarketFeed();[span_103](start_span)[span_103](end_span)
    renderMarketFeed();[span_104](start_span)[span_104](end_span)
    showToast("Лента предложений обновлена (-5 ⛽)!");[span_105](start_span)[span_105](end_span)
}

// ----------------------------------------------------
// ГЕНЕРАТОР ПРЕДЛОЖЕНИЙ
// ----------------------------------------------------
function populateMarketFeed() {
    if (typeof CAR_DATABASE === 'undefined' || !CAR_DATABASE) return;[span_106](start_span)[span_106](end_span)
    
    let cat = state.activeCategory ? state.activeCategory : 'economy';[span_107](start_span)[span_107](end_span)
    let pool = CAR_DATABASE[cat] ? CAR_DATABASE[cat] : CAR_DATABASE.economy;[span_108](start_span)[span_108](end_span)
    if (!pool || pool.length === 0) return;[span_109](start_span)[span_109](end_span)

    let shuffledPool = [...pool];[span_110](start_span)[span_110](end_span)
    for (let i = shuffledPool.length - 1; i > 0; i--) {[span_111](start_span)[span_111](end_span)
        const j = Math.floor(Math.random() * (i + 1));[span_112](start_span)[span_112](end_span)
        [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];[span_113](start_span)[span_113](end_span)
    }

    state.marketFeed = [];[span_114](start_span)[span_114](end_span)
    let lvl = (state.player && state.player.level) ? state.player.level : 1;[span_115](start_span)[span_115](end_span)
    
    const feedCount = Math.min(8, Math.max(6, shuffledPool.length));[span_116](start_span)[span_116](end_span)

    for (let i = 0; i < feedCount; i++) {[span_117](start_span)[span_117](end_span)
        const template = shuffledPool[i % shuffledPool.length];[span_118](start_span)[span_118](end_span)
        if (!template) continue;[span_119](start_span)[span_119](end_span)

        let dealRoll = Math.random();[span_120](start_span)[span_120](end_span)
        let dealType = 'normal';[span_121](start_span)[span_121](end_span)
        let priceMultiplier = 0.85;[span_122](start_span)[span_122](end_span)

        if (dealRoll < 0.22) {[span_123](start_span)[span_123](end_span)
            dealType = 'urgent';[span_124](start_span)[span_124](end_span)
            priceMultiplier = 0.68 + Math.random() * 0.10;[span_125](start_span)[span_125](end_span)
        } else if (dealRoll < 0.68) {[span_126](start_span)[span_126](end_span)
            dealType = 'normal';[span_127](start_span)[span_127](end_span)
            priceMultiplier = 0.82 + Math.random() * 0.12;[span_128](start_span)[span_128](end_span)
        } else {
            dealType = 'overprice';[span_129](start_span)[span_129](end_span)
            priceMultiplier = 1.05 + Math.random() * 0.18;[span_130](start_span)[span_130](end_span)
        }

        let defectChance = 0.38;[span_131](start_span)[span_131](end_span)
        if (dealType === 'urgent') defectChance = 0.55;[span_132](start_span)[span_132](end_span)
        if (lvl <= 5) defectChance = 0.28;[span_133](start_span)[span_133](end_span)
        else if (lvl >= 20) defectChance = 0.48;[span_134](start_span)[span_134](end_span)
        if (cat === 'premium' || cat === 'hyper') defectChance -= 0.10;[span_135](start_span)[span_135](end_span)

        let hasHiddenDefect = false;[span_136](start_span)[span_136](end_span)
        if (typeof OBD_ERRORS !== 'undefined' && OBD_ERRORS.length > 0) {[span_137](start_span)[span_137](end_span)
            if (Math.random() < defectChance) hasHiddenDefect = true;[span_138](start_span)[span_138](end_span)
        }

        let isStolen = Math.random() < (dealType === 'urgent' ? 0.20 : 0.10);[span_139](start_span)[span_139](end_span)
        const carId = "m_" + Date.now() + "_" + i;[span_140](start_span)[span_140](end_span)
        
        let isCoolNumber = Math.random() < 0.08;
        let genPlate = isCoolNumber ? generateCoolPlate() : generateNormalPlate();

        let baseP = template.basePrice ? template.basePrice : 100000;[span_141](start_span)[span_141](end_span)
        let tType = template.type ? template.type : cat;[span_142](start_span)[span_142](end_span)
        const dynPrice = getDynamicPrice(baseP, tType);[span_143](start_span)[span_143](end_span)

        let carOnlyPrice = Math.round(dynPrice * priceMultiplier);[span_144](start_span)[span_144](end_span)
        const baseVal = Math.round(dynPrice * 1.05);[span_145](start_span)[span_145](end_span)
        const plateVal = evaluatePlate(genPlate);[span_146](start_span)[span_146](end_span)

        let sellerPrice = carOnlyPrice;[span_147](start_span)[span_147](end_span)
        let isLuckyFind = false;[span_148](start_span)[span_148](end_span)

        if (plateVal > 5000) {[span_149](start_span)[span_149](end_span)
            if (Math.random() < 0.14) {[span_150](start_span)[span_150](end_span)
                isLuckyFind = true;[span_151](start_span)[span_151](end_span)
                sellerPrice = carOnlyPrice;[span_152](start_span)[span_152](end_span)
            } else {
                let plateMarkup = Math.round(plateVal * (0.75 + Math.random() * 0.20));[span_153](start_span)[span_153](end_span)
                sellerPrice = carOnlyPrice + plateMarkup;[span_154](start_span)[span_154](end_span)
            }
        }

        let defectObj = null;[span_155](start_span)[span_155](end_span)
        if (hasHiddenDefect && typeof OBD_ERRORS !== 'undefined') {[span_156](start_span)[span_156](end_span)
            const errItem = OBD_ERRORS[Math.floor(Math.random() * OBD_ERRORS.length)];[span_157](start_span)[span_157](end_span)
            defectObj = { text: errItem.text, cost: errItem.cost };[span_158](start_span)[span_158](end_span)
        }

        let sNote = "Машина в порядке, сел и поехал.";[span_159](start_span)[span_159](end_span)
        if (isLuckyFind) {[span_160](start_span)[span_160](end_span)
            sNote = "«Отдаю дедовский аппарат как есть, в ценах на номера не разбираюсь.» (🔥 Продавец не знает цену номеров!)";[span_161](start_span)[span_161](end_span)
        } else if (dealType === 'overprice') {[span_162](start_span)[span_162](end_span)
            const overpriceNotes = [[span_163](start_span)[span_163](end_span)
                "«Цена окончательная, знаю что продаю. Свои цены не предлагать!»",[span_164](start_span)[span_164](end_span)
                "«Вложено в два раза больше стоимости. Отдам только истинному ценителю.»",[span_165](start_span)[span_165](end_span)
                "«Рынок видел, хлам за копейки покупайте в другом месте.»[span_166](start_span)"[span_166](end_span)
            ];
            sNote = overpriceNotes[Math.floor(Math.random() * overpriceNotes.length)];[span_167](start_span)[span_167](end_span)
        } else if (dealType === 'urgent') {[span_168](start_span)[span_168](end_span)
            sNote = "«Срочно нужны деньги до вечера, отдам с хорошим дисконтом!»";[span_169](start_span)[span_169](end_span)
        } else if (plateVal > 15000) {[span_170](start_span)[span_170](end_span)
            sNote = "«Продаю только вместе с красивым госномером " + genPlate + ", торга нет!»";[span_171](start_span)[span_171](end_span)
        } else if (hasHiddenDefect) {[span_172](start_span)[span_172](end_span)
            const riskyPhrases = [[span_173](start_span)[span_173](end_span)
                "«Есть мелкие недочеты, на езду не влияет.»",[span_174](start_span)[span_174](end_span)
                "«Продаю срочно, перекупам не звонить.»",[span_175](start_span)[span_175](end_span)
                "«Двигатель работает ровно, но чек горит (датчик кислорода).»[span_176](start_span)"[span_176](end_span)
            ];
            sNote = riskyPhrases[Math.floor(Math.random() * riskyPhrases.length)];[span_177](start_span)[span_177](end_span)
        } else if (typeof SELLER_ADS_PHRASES !== 'undefined' && SELLER_ADS_PHRASES.length > 0) {[span_178](start_span)[span_178](end_span)
            sNote = SELLER_ADS_PHRASES[Math.floor(Math.random() * SELLER_ADS_PHRASES.length)];[span_179](start_span)[span_179](end_span)
        }

        let cName = template.name ? template.name : "Техника";[span_180](start_span)[span_180](end_span)
        let cPower = template.power ? template.power : 100;[span_181](start_span)[span_181](end_span)
        let cImg = template.img ? template.img : "";[span_182](start_span)[span_182](end_span)
        let cFallback = template.fallback || getCategoryFallback(tType);[span_183](start_span)[span_183](end_span)

        let cCond = hasHiddenDefect ? Math.floor(40 + Math.random() * 30) : Math.floor(75 + Math.random() * 20);[span_184](start_span)[span_184](end_span)
        if (cat === 'premium' || cat === 'hyper') cCond = Math.max(65, cCond);[span_185](start_span)[span_185](end_span)

        let isThick1 = (Math.random() > 0.55) ? Math.floor(220 + Math.random() * 350) : 110;[span_186](start_span)[span_186](end_span)
        let isThick2 = (Math.random() > 0.45) ? Math.floor(260 + Math.random() * 450) : 115;[span_187](start_span)[span_187](end_span)
        
        let engWear = hasHiddenDefect ? (35 + Math.random() * 35) : (75 + Math.random() * 20);[span_188](start_span)[span_188](end_span)
        let transWear = hasHiddenDefect ? (40 + Math.random() * 30) : (80 + Math.random() * 15);[span_189](start_span)[span_189](end_span)

        const sellerTypes = ['greedy', 'calm', 'hurried'];[span_190](start_span)[span_190](end_span)
        const currentSellerType = dealType === 'urgent' ? 'hurried' : (dealType === 'overprice' ? 'greedy' : sellerTypes[Math.floor(Math.random() * sellerTypes.length)]);[span_191](start_span)[span_191](end_span)

        state.marketFeed.push({
            id: carId,[span_192](start_span)[span_192](end_span)
            name: cName,[span_193](start_span)[span_193](end_span)
            power: cPower,[span_194](start_span)[span_194](end_span)
            type: tType,[span_195](start_span)[span_195](end_span)
            drivetrain: template.drivetrain || 'rwd',[span_196](start_span)[span_196](end_span)
            basePrice: baseP,[span_197](start_span)[span_197](end_span)
            mileage: Math.floor(Math.random() * (tType === 'premium' ? 80000 : 180000)) + 15000,[span_198](start_span)[span_198](end_span)
            price: sellerPrice,[span_199](start_span)[span_199](end_span)
            originalAskingPrice: sellerPrice,[span_200](start_span)[span_200](end_span)
            baseMarketValue: baseVal,[span_201](start_span)[span_201](end_span)
            marketValue: baseVal + plateVal,[span_202](start_span)[span_202](end_span)
            img: cImg,[span_203](start_span)[span_203](end_span)
            fallback: cFallback,[span_204](start_span)[span_204](end_span)
            plate: genPlate,[span_205](start_span)[span_205](end_span)
            isStolen: isStolen,[span_206](start_span)[span_206](end_span)
            autotekaChecked: false,[span_207](start_span)[span_207](end_span)
            cooldownUntil: 0,[span_208](start_span)[span_208](end_span)
            stoChecked: false,[span_209](start_span)[span_209](end_span)
            gaugeChecked: false,[span_210](start_span)[span_210](end_span)
            haggled: false,[span_211](start_span)[span_211](end_span)
            hagglePatience: currentSellerType === 'greedy' ? 2 : (currentSellerType === 'hurried' ? 5 : 3),[span_212](start_span)[span_212](end_span)
            sellerPersonality: currentSellerType,[span_213](start_span)[span_213](end_span)
            dealType: dealType,[span_214](start_span)[span_214](end_span)
            unavailable: false,[span_215](start_span)[span_215](end_span)
            hiddenDefect: defectObj,[span_216](start_span)[span_216](end_span)
            sellerNote: sNote,[span_217](start_span)[span_217](end_span)
            condition: cCond,[span_218](start_span)[span_218](end_span)
            insurance: null,[span_219](start_span)[span_219](end_span)
            tuning: { 
                chip: 0, exhaust: false, stance: false, bodykit: false, 
                rollCage: false, dragSlicks: false, hydroHandbrake: false, 
                weldedDiff: false, steeringAngle: false, bucketSeats: false, 
                customWheels: false, risk1251: 0 
            },[span_220](start_span)[span_220](end_span)
            wear: { engine: engWear, transmission: transWear },[span_221](start_span)[span_221](end_span)
            bodyThickness: { hood: isThick1, roof: 100, doors: isThick2, wings: 110 },[span_222](start_span)[span_222](end_span)
            rolledOdometer: false,[span_223](start_span)[span_223](end_span)
            hasAdditive: false,[span_224](start_span)[span_224](end_span)
            isRepainted: false,[span_225](start_span)[span_225](end_span)
            isPolished: false,[span_226](start_span)[span_226](end_span)
            isPersonal: false,[span_227](start_span)[span_227](end_span)
            isRegisteredOnPlayer: true,
            ownershipDays: 0,
            engineTemp: 90,
            tireWear: 100,
            viewed: false[span_228](start_span)[span_228](end_span)
        });
    }
    saveState();[span_229](start_span)[span_229](end_span)
    renderMarketFeed();[span_230](start_span)[span_230](end_span)
}

function renderMarketFeed() {
    const container = document.getElementById('marketCardContainer');[span_231](start_span)[span_231](end_span)
    if (!container) return;[span_232](start_span)[span_232](end_span)
    
    const refreshText = document.getElementById('refreshCostText');[span_233](start_span)[span_233](end_span)
    if (refreshText) refreshText.innerText = getMarketRefreshCost().toLocaleString();[span_234](start_span)[span_234](end_span)
    
    const mainContent = document.querySelector('.main-content');[span_235](start_span)[span_235](end_span)
    const scrollPos = mainContent ? mainContent.scrollTop : 0;[span_236](start_span)[span_236](end_span)
    const now = Date.now();[span_237](start_span)[span_237](end_span)

    if (!state.marketFeed || state.marketFeed.length === 0) {[span_238](start_span)[span_238](end_span)
        container.innerHTML = `<div class='glass-card text-center py-6 sub-label'>${t('classes_title')}: нет активных лотов. Нажмите «${t('btn_refresh_market')}»!</div>`;[span_239](start_span)[span_239](end_span)
        return;[span_240](start_span)[span_240](end_span)
    }
    
    let htmlContent = "";[span_241](start_span)[span_241](end_span)
    
    state.marketFeed.forEach(car => {[span_242](start_span)[span_242](end_span)
        if (!car || car.unavailable) return;[span_243](start_span)[span_243](end_span)
        
        let isBusy = (car.cooldownUntil && car.cooldownUntil > now);[span_244](start_span)[span_244](end_span)
        let timeLeft = isBusy ? Math.ceil((car.cooldownUntil - now) / 1000) : 0;[span_245](start_span)[span_245](end_span)
        let hasScanner = !!(state.player && state.player.tools && (state.player.tools.obd || state.player.tools.obd_launch));[span_246](start_span)[span_246](end_span)
        
        let carMileage = (typeof car.mileage === 'number') ? car.mileage.toLocaleString() : "85 000";[span_247](start_span)[span_247](end_span)
        let carPrice = (typeof car.price === 'number') ? car.price.toLocaleString() : "100 000";[span_248](start_span)[span_248](end_span)
        let carMarketVal = (typeof car.marketValue === 'number') ? car.marketValue.toLocaleString() : carPrice;[span_249](start_span)[span_249](end_span)
        let carType = car.type ? car.type.toUpperCase() : "CAR";[span_250](start_span)[span_250](end_span)
        
        let fallbackUrl = car.fallback || getCategoryFallback(car.type);[span_251](start_span)[span_251](end_span)
        let carImg = car.img ? car.img : fallbackUrl;[span_252](start_span)[span_252](end_span)
        
        let viewedBadge = car.viewed ? `<div class='viewed-badge'><i class='fa-solid fa-eye'></i> ${t('inspected')}</div>` : "";[span_253](start_span)[span_253](end_span)
        let busyClass = isBusy ? "busy" : "";[span_254](start_span)[span_254](end_span)
        let viewedClass = car.viewed ? "viewed-card" : "";[span_255](start_span)[span_255](end_span)
        let sellerNoteBlock = car.sellerNote ? "<div class='seller-note-card'>" + car.sellerNote + "</div>" : "";[span_256](start_span)[span_256](end_span)
        
        let toolIcon = (state.player && state.player.tools && (state.player.tools.gauge || state.player.tools.gauge_pro)) ? "✓" : "(3k)";[span_257](start_span)[span_257](end_span)
        let obdIcon = hasScanner ? "OBD2 ✓" : "OBD2 (5k)";[span_258](start_span)[span_258](end_span)
        let autoIcon = car.autotekaChecked ? "0" : "5k";[span_259](start_span)[span_259](end_span)

        let dealBadge = "";[span_260](start_span)[span_260](end_span)
        if (car.dealType === 'urgent') {[span_261](start_span)[span_261](end_span)
            dealBadge = "<span class='tag-badge bg-tag-green ml-1'>🔥 URGENT</span>";[span_262](start_span)[span_262](end_span)
        } else if (car.dealType === 'overprice') {[span_263](start_span)[span_263](end_span)
            dealBadge = "<span class='tag-badge bg-tag-red ml-1'>⚠️ OVERPRICE</span>";[span_264](start_span)[span_264](end_span)
        }

        let pVal = evaluatePlate(car.plate);[span_265](start_span)[span_265](end_span)
        let coolPlateBadge = pVal > 15000[span_266](start_span)[span_266](end_span)
            ? "<span class='tag-badge bg-tag-purple ml-1'>🏷️ БЛАТНЫЕ НОМЕРА</span>[span_267](start_span)"[span_267](end_span)
            : "";[span_268](start_span)[span_268](end_span)

        let carName = car.name ? car.name : "Автомобиль";[span_269](start_span)[span_269](end_span)
        let carPower = car.power ? car.power : 100;[span_270](start_span)[span_270](end_span)
        let carPlate = car.plate ? car.plate : "ТРАНЗИТ";[span_271](start_span)[span_271](end_span)

        htmlContent += `
        <div class='glass-card mb-3 ${busyClass} ${viewedClass}' id='card_${car.id}'>
            ${viewedBadge}
            
            <div class='cooldown-timer notranslate' translate='no' style='${isBusy ? "display:flex !important;" : "display:none !important;"}'>
                <div class='timer-clock notranslate' translate='no' id='timer_num_${car.id}'>${timeLeft}с</div>
                <div class='timer-text'>${t('busy_subscriber')}</div>
                <button onclick="paidCallMarketCar('${car.id}')" class='btn btn-amber' style='width: 80%;'>${t('paid_call')} (1000 ₽)</button>
            </div>

            <div class='car-img-wrap'>
                <img src='${carImg}' class='car-img' onerror="this.onerror=null; this.src='${fallbackUrl}';">
                <div class='badge-tag' style='bottom: 8px; right: 8px;'>${carType} ${dealBadge} ${coolPlateBadge}</div>
                <div class='plate-corner'><div class='license-plate notranslate' translate='no'>${carPlate} <div class='license-flag'>RUS</div></div></div>
            </div>

            <div class='mb-2'>
                <h4 class='font-bold'>${carName}</h4>
                <div class='sub-label mb-2'>${carPower} л.с. / Пробег: ${carMileage} км</div>
                ${sellerNoteBlock}
            </div>

            <div class='price-box'>
                <div>
                    <span class='text-xs color-green font-bold'>${t('price')}:</span>
                    <div class='price-val notranslate' translate='no' id='price_txt_${car.id}'>${carPrice} ₽</div>
                </div>
                <div class='sub-label'>${t('market_estimate')}: ~${carMarketVal} ₽</div>
            </div>

            <div class='grid-3 mb-2'>
                <button onclick="openGaugeModal('${car.id}')" class='btn btn-dark btn-sm'>${t('thickness_gauge')} ${toolIcon}</button>
                <button onclick="quickOBDScanMarketCar('${car.id}')" class='btn btn-dark btn-sm'>${obdIcon}</button>
                <button onclick="openAutotekaModal('${car.id}')" class='btn btn-dark btn-sm'>${t('autoteka')} (${autoIcon})</button>
            </div>

            <button onclick="initiateBuyMarketCar('${car.id}')" class='btn btn-cyan w-full'>
                <i class='fa-solid fa-phone'></i> ${t('call_seller')}
            </button>
        </div>`;[span_272](start_span)[span_272](end_span)
    });
    
    container.innerHTML = htmlContent;[span_273](start_span)[span_273](end_span)
    if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });[span_274](start_span)[span_274](end_span)
}

function quickOBDScanMarketCar(carId) {
    const car = state.marketFeed.find(c => c && c.id === carId);[span_275](start_span)[span_275](end_span)
    if (!car) return;[span_276](start_span)[span_276](end_span)
    car.viewed = true;[span_277](start_span)[span_277](end_span)

    let hasScanner = !!(state.player && state.player.tools && (state.player.tools.obd || state.player.tools.obd_launch));[span_278](start_span)[span_278](end_span)

    if (!hasScanner) {[span_279](start_span)[span_279](end_span)
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_280](start_span)[span_280](end_span)
        if (cash < 5000) return showToast("Нужно 5,000 ₽ на выездного диагноста или сканер из Маркета!");[span_281](start_span)[span_281](end_span)
        state.player.cash -= 5000;[span_282](start_span)[span_282](end_span)
        showToast("Выездной мастер подключил сканер (-5,000 ₽)");[span_283](start_span)[span_283](end_span)
    } else {
        showToast("Подключен ваш собственный диагностический сканер ✓");[span_284](start_span)[span_284](end_span)
    }

    car.stoChecked = true;[span_285](start_span)[span_285](end_span)

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('obd_scan', 1);
    }

    saveState();[span_286](start_span)[span_286](end_span)
    renderMarketFeed();[span_287](start_span)[span_287](end_span)

    if (car.hiddenDefect) {[span_288](start_span)[span_288](end_span)
        let costStr = car.hiddenDefect.cost ? car.hiddenDefect.cost.toLocaleString() : "10 000";[span_289](start_span)[span_289](end_span)
        openVerdictModal("ОШИБКИ В ЭБУ! ⚠️", "Сканер считал неисправность: " + car.hiddenDefect.text + ". Затраты на ремонт: ~" + costStr + " ₽. Используйте это в торгах!", false);[span_290](start_span)[span_290](end_span)
    } else {
        let eng = car.wear?.engine ? Math.round(car.wear.engine) : 90;[span_291](start_span)[span_291](end_span)
        let trans = car.wear?.transmission ? Math.round(car.wear.transmission) : 90;[span_292](start_span)[span_292](end_span)
        openVerdictModal("ОШИБОК НЕТ ✓", "ЭБУ чист. Ресурс двигателя: " + eng + "%, трансмиссии: " + trans + "%.", true);[span_293](start_span)[span_293](end_span)
    }
}

function initiateBuyMarketCar(carId) {
    const carIndex = state.marketFeed.findIndex(c => c && c.id === carId);[span_294](start_span)[span_294](end_span)
    if (carIndex === -1) return;[span_295](start_span)[span_295](end_span)
    const car = state.marketFeed[carIndex];[span_296](start_span)[span_296](end_span)
    car.viewed = true;[span_297](start_span)[span_297](end_span)
    renderMarketFeed();[span_298](start_span)[span_298](end_span)
    const now = Date.now();[span_299](start_span)[span_299](end_span)
    
    if (car.cooldownUntil && car.cooldownUntil > now) {[span_300](start_span)[span_300](end_span)
        return showToast("Абонент всё ещё занят! Подождите.");[span_301](start_span)[span_301](end_span)
    }
    
    setTxt("buyCallEmoji", "📞");[span_302](start_span)[span_302](end_span)
    setTxt("buyCallTitle", "Звонок продавцу...");[span_303](start_span)[span_303](end_span)
    setTxt("buyCallDesc", "Соединение с абонентом... Идут гудки...");[span_304](start_span)[span_304](end_span)
    const btnBox = document.getElementById("buyCallActionBtnBox");[span_305](start_span)[span_305](end_span)
    if (btnBox) btnBox.innerHTML = "<button class='btn btn-dark w-full' disabled>Гудки в трубке...</button>";[span_306](start_span)[span_306](end_span)
    
    const modal = document.getElementById("modalBuyCall");[span_307](start_span)[span_307](end_span)
    if (modal) modal.classList.add('active');[span_308](start_span)[span_308](end_span)
    tgHaptic('light');[span_309](start_span)[span_309](end_span)

    setTimeout(() => {
        let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;[span_310](start_span)[span_310](end_span)
        let callSuccessChance = 60;[span_311](start_span)[span_311](end_span)
        if (karma > 65) callSuccessChance += 15;[span_312](start_span)[span_312](end_span)
        if (karma < 35) callSuccessChance -= 15;[span_313](start_span)[span_313](end_span)
        if (car.type === 'premium' || car.type === 'hyper') callSuccessChance -= 15;[span_314](start_span)[span_314](end_span)
        if (car.dealType === 'urgent') callSuccessChance += 20;[span_315](start_span)[span_315](end_span)
        
        const roll = Math.random() * 100;[span_316](start_span)[span_316](end_span)

        if (roll < callSuccessChance) {[span_317](start_span)[span_317](end_span)
            closeModal("modalBuyCall");[span_318](start_span)[span_318](end_span)
            openMarketDeal(carId);[span_319](start_span)[span_319](end_span)
        } else if (roll < 88) {[span_320](start_span)[span_320](end_span)
            const waitSec = Math.floor(20 + Math.random() * 25);[span_321](start_span)[span_321](end_span)
            car.cooldownUntil = Date.now() + (waitSec * 1000);[span_322](start_span)[span_322](end_span)
            setTxt("buyCallEmoji", "📵");[span_323](start_span)[span_323](end_span)
            setTxt("buyCallTitle", "Абонент сбросил");[span_324](start_span)[span_324](end_span)
            setTxt("buyCallDesc", "«Не могу говорить, перезвоните через " + waitSec + " сек!»");[span_325](start_span)[span_325](end_span)
            if (btnBox) btnBox.innerHTML = "<button onclick=\"closeModal('modalBuyCall')\" class='btn btn-dark w-full'>Понятно</button>";[span_326](start_span)[span_326](end_span)
            saveState();[span_327](start_span)[span_327](end_span)
            renderMarketFeed();[span_328](start_span)[span_328](end_span)
        } else { 
            setTxt("buyCallEmoji", "❌");[span_329](start_span)[span_329](end_span)
            setTxt("buyCallTitle", "Объявление снято");[span_330](start_span)[span_330](end_span)
            setTxt("buyCallDesc", "«Только что внесли задаток, машина ушла!»");[span_331](start_span)[span_331](end_span)
            car.unavailable = true;[span_332](start_span)[span_332](end_span)
            saveState();[span_333](start_span)[span_333](end_span)
            renderMarketFeed();[span_334](start_span)[span_334](end_span)
            if (btnBox) btnBox.innerHTML = "<button onclick=\"closeModal('modalBuyCall')\" class='btn btn-dark w-full'>Закрыть</button>";[span_335](start_span)[span_335](end_span)
        }
    }, 1100);
}

function paidCallMarketCar(carId) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_336](start_span)[span_336](end_span)
    if (cash < 1000) return showToast("Не хватает 1000 ₽ на платный дозвон!");[span_337](start_span)[span_337](end_span)
    state.player.cash -= 1000;[span_338](start_span)[span_338](end_span)
    
    const carIndex = state.marketFeed.findIndex(c => c && c.id === carId);[span_339](start_span)[span_339](end_span)
    if (carIndex === -1) return;[span_340](start_span)[span_340](end_span)
    const car = state.marketFeed[carIndex];[span_341](start_span)[span_341](end_span)

    let successChance = 0.75;[span_342](start_span)[span_342](end_span)
    let lvl = (state.player && state.player.level) ? state.player.level : 1;[span_343](start_span)[span_343](end_span)
    if (lvl >= 10 || (state.player && state.player.policeImmunityDays > 0)) {[span_344](start_span)[span_344](end_span)
        successChance = 0.90;[span_345](start_span)[span_345](end_span)
    }

    if (Math.random() < successChance) {[span_346](start_span)[span_346](end_span)
        car.cooldownUntil = 0;[span_347](start_span)[span_347](end_span)
        saveState();[span_348](start_span)[span_348](end_span)
        renderMarketFeed();[span_349](start_span)[span_349](end_span)
        playSound('win');[span_350](start_span)[span_350](end_span)
        tgHaptic('success');[span_351](start_span)[span_351](end_span)
        showToast("Успешный дозвон по приоритетной линии!");[span_352](start_span)[span_352](end_span)
        openMarketDeal(carId);[span_353](start_span)[span_353](end_span)
    } else {
        car.cooldownUntil = Date.now() + 8000;[span_354](start_span)[span_354](end_span)
        saveState();[span_355](start_span)[span_355](end_span)
        renderMarketFeed();[span_356](start_span)[span_356](end_span)
        tgHaptic('error');[span_357](start_span)[span_357](end_span)
        showToast("📵 Абонент отклонил второй вызов! Попробуйте позже.");[span_358](start_span)[span_358](end_span)
    }
}

// ----------------------------------------------------
// ЛОГИКА ТОРГА ПРИ ПОКУПКЕ
// ----------------------------------------------------
function openMarketDeal(carId) {
    const carIndex = state.marketFeed.findIndex(c => c && c.id === carId);[span_359](start_span)[span_359](end_span)
    if (carIndex === -1) return;[span_360](start_span)[span_360](end_span)
    const car = state.marketFeed[carIndex];[span_361](start_span)[span_361](end_span)
    pendingMarketCar = { car: car, carIndex: carIndex };[span_362](start_span)[span_362](end_span)
    
    const imgEl = document.getElementById("dealCarImg");[span_363](start_span)[span_363](end_span)
    if (imgEl) {[span_364](start_span)[span_364](end_span)
        let fallbackUrl = car.fallback || getCategoryFallback(car.type);[span_365](start_span)[span_365](end_span)
        imgEl.src = car.img ? car.img : fallbackUrl;[span_366](start_span)[span_366](end_span)
        imgEl.onerror = () => { imgEl.src = fallbackUrl; };[span_367](start_span)[span_367](end_span)
    }
    
    let cName = car.name ? car.name : "Авто";[span_368](start_span)[span_368](end_span)
    setTxt("dealCarTitle", cName);[span_369](start_span)[span_369](end_span)
    
    let mileageStr = car.mileage ? car.mileage.toLocaleString() : "0";[span_370](start_span)[span_370](end_span)
    let plateStr = car.plate ? car.plate : "ТРАНЗИТ";[span_371](start_span)[span_371](end_span)
    setTxt("dealCarMileageInfo", "Пробег: " + mileageStr + " км / Госномер: " + plateStr);[span_372](start_span)[span_372](end_span)
    
    let priceStr = car.price ? car.price.toLocaleString() : "0";[span_373](start_span)[span_373](end_span)
    setTxt("dealCarPrice", priceStr + " ₽");[span_374](start_span)[span_374](end_span)
    
    const avatars = ["👨‍💼", "🧔", "😎", "👨‍🔧", "🧑‍💻", "🕵️‍♂️"];[span_375](start_span)[span_375](end_span)
    const names = ["Сергей", "Алексей", "Дмитрий", "Артем", "Михаил", "Игорь"];[span_376](start_span)[span_376](end_span)
    let numSum = 0;[span_377](start_span)[span_377](end_span)
    for (let k = 0; k < carId.length; k++) numSum += carId.charCodeAt(k);[span_378](start_span)[span_378](end_span)
    const randIdx = numSum % avatars.length;[span_379](start_span)[span_379](end_span)
    
    const sellerTitle = names[randIdx];[span_380](start_span)[span_380](end_span)
    pendingMarketCar.sellerName = sellerTitle;[span_381](start_span)[span_381](end_span)
    setTxt("dealSellerAvatar", avatars[randIdx]);[span_382](start_span)[span_382](end_span)
    setTxt("dealSellerName", sellerTitle + " (Продавец)");[span_383](start_span)[span_383](end_span)

    const thread = document.getElementById("dealChatThread");[span_384](start_span)[span_384](end_span)
    if (thread) {[span_385](start_span)[span_385](end_span)
        let greeting = "«Алло, да, продаю. Машина в порядке, сел и поехал. Что интересует?»";[span_386](start_span)[span_386](end_span)
        if (car.dealType === 'urgent') greeting = "«Привет! Отдаю срочно, если заберёшь быстро — выслушаю адекватные предложения.»";[span_387](start_span)[span_387](end_span)
        if (car.dealType === 'overprice') greeting = "«Слушаю. Машина в идеале, торга почти нет, перекупам просьба не беспокоить.»";[span_388](start_span)[span_388](end_span)
        thread.innerHTML = "<div class='chat-msg msg-seller'>" + greeting + "</div>";[span_389](start_span)[span_389](end_span)
    }

    renderMarketHaggleControls();[span_390](start_span)[span_390](end_span)
    const modal = document.getElementById("modalMarketDeal");[span_391](start_span)[span_391](end_span)
    if (modal) modal.classList.add('active');[span_392](start_span)[span_392](end_span)
    playSound('tick');[span_393](start_span)[span_393](end_span)
}

function renderMarketHaggleControls() {
    const haggleArea = document.getElementById("dealHaggleArea");[span_394](start_span)[span_394](end_span)
    if (!haggleArea || !pendingMarketCar) return;[span_395](start_span)[span_395](end_span)

    const car = pendingMarketCar.car;[span_396](start_span)[span_396](end_span)
    if (car.hagglePatience <= 0) {[span_397](start_span)[span_397](end_span)
        haggleArea.innerHTML = "<div class='text-center sub-label color-red font-bold py-2'>🚫 Продавец категорически отказался продолжать торг!</div>";[span_398](start_span)[span_398](end_span)
        return;[span_399](start_span)[span_399](end_span)
    }

    let inspectionBonusBtn = "";[span_400](start_span)[span_400](end_span)
    if (car.stoChecked && car.hiddenDefect) {[span_401](start_span)[span_401](end_span)
        inspectionBonusBtn = `
        <button onclick="attemptDefectArgueHaggle()" class="btn btn-purple btn-sm w-full mb-2">
            🔍 Ткнуть в ошибку ЭБУ: «${car.hiddenDefect.text.slice(0, 32)}...» (-10%)
        </button>`;[span_402](start_span)[span_402](end_span)
    } else if (car.gaugeChecked && (car.bodyThickness.doors > 200 || car.bodyThickness.hood > 200)) {[span_403](start_span)[span_403](end_span)
        inspectionBonusBtn = `
        <button onclick="attemptPaintArgueHaggle()" class="btn btn-amber btn-sm w-full mb-2">
            🎨 Указать на шпаклёвку кузова прибором (-7%)
        </button>`;[span_404](start_span)[span_404](end_span)
    }

    haggleArea.innerHTML = `
        <div class="risk-meter-box mb-2">
            <div class="flex-between text-xs">
                <span>Терпение продавца:</span>
                <b class="${car.hagglePatience > 2 ? 'color-green' : 'color-red'}">${car.hagglePatience} попытки</b>
            </div>
        </div>
        ${inspectionBonusBtn}
        <div class="grid-3">
            <button onclick="attemptMarketHaggle(3)" class="btn btn-dark btn-sm">
                -3%<br><span class="color-green text-xs">Мягко</span>
            </button>
            <button onclick="attemptMarketHaggle(6)" class="btn btn-dark btn-sm">
                -6%<br><span class="color-amber text-xs">Аргумент</span>
            </button>
            <button onclick="attemptMarketHaggle(12)" class="btn btn-dark btn-sm">
                -12%<br><span class="color-red text-xs">Нагло</span>
            </button>
        </div>`;[span_405](start_span)[span_405](end_span)
}

function attemptDefectArgueHaggle() {
    if (!pendingMarketCar) return;[span_406](start_span)[span_406](end_span)
    const car = pendingMarketCar.car;[span_407](start_span)[span_407](end_span)
    const thread = document.getElementById("dealChatThread");[span_408](start_span)[span_408](end_span)

    let discount = Math.round(car.price * 0.10);[span_409](start_span)[span_409](end_span)
    car.price = Math.max(10000, car.price - discount);[span_410](start_span)[span_410](end_span)
    car.hagglePatience -= 1;[span_411](start_span)[span_411](end_span)
    car.stoChecked = false;[span_412](start_span)[span_412](end_span)

    setTxt("dealCarPrice", car.price.toLocaleString() + " ₽");[span_413](start_span)[span_413](end_span)

    if (thread) {[span_414](start_span)[span_414](end_span)
        thread.innerHTML += `
            <div class="chat-msg msg-player">«Я сканером прочитал ЭБУ: тут висит ${car.hiddenDefect.text}. Ремонт влетит в копеечку, скидывай!»</div>
            <div class="chat-msg msg-seller">«Чёрт, спалил... Ладно, скину ${discount.toLocaleString()} ₽ на ремонт в сервисе.»</div>`;[span_415](start_span)[span_415](end_span)
        thread.scrollTop = thread.scrollHeight;[span_416](start_span)[span_416](end_span)
    }

    playSound('win');[span_417](start_span)[span_417](end_span)
    tgHaptic('success');[span_418](start_span)[span_418](end_span)
    renderMarketHaggleControls();[span_419](start_span)[span_419](end_span)
    saveState();[span_420](start_span)[span_420](end_span)
}

function attemptPaintArgueHaggle() {
    if (!pendingMarketCar) return;[span_421](start_span)[span_421](end_span)
    const car = pendingMarketCar.car;[span_422](start_span)[span_422](end_span)
    const thread = document.getElementById("dealChatThread");[span_423](start_span)[span_423](end_span)

    let discount = Math.round(car.price * 0.07);[span_424](start_span)[span_424](end_span)
    car.price = Math.max(10000, car.price - discount);[span_425](start_span)[span_425](end_span)
    car.hagglePatience -= 1;[span_426](start_span)[span_426](end_span)
    car.gaugeChecked = false;[span_427](start_span)[span_427](end_span)

    setTxt("dealCarPrice", car.price.toLocaleString() + " ₽");[span_428](start_span)[span_428](end_span)

    if (thread) {[span_429](start_span)[span_429](end_span)
        thread.innerHTML += `
            <div class="chat-msg msg-player">«Тут шпакля под 400 микрон звенит, не надо заливать про заводской окрас!»</div>
            <div class="chat-msg msg-seller">«Ладно-ладно, уступлю ${discount.toLocaleString()} ₽ на полировку и косяки.»</div>`;[span_430](start_span)[span_430](end_span)
        thread.scrollTop = thread.scrollHeight;[span_431](start_span)[span_431](end_span)
    }

    playSound('win');[span_432](start_span)[span_432](end_span)
    tgHaptic('success');[span_433](start_span)[span_433](end_span)
    renderMarketHaggleControls();[span_434](start_span)[span_434](end_span)
    saveState();[span_435](start_span)[span_435](end_span)
}

function attemptMarketHaggle(percent) {
    if (!pendingMarketCar) return;[span_436](start_span)[span_436](end_span)
    const car = pendingMarketCar.car;[span_437](start_span)[span_437](end_span)
    if (car.hagglePatience <= 0) return showToast("Продавец больше не торгуется!");[span_438](start_span)[span_438](end_span)

    car.hagglePatience -= 1;[span_439](start_span)[span_439](end_span)

    let baseChance = percent === 3 ? 80 : (percent === 6 ? 50 : 20);[span_440](start_span)[span_440](end_span)
    if (car.sellerPersonality === 'hurried') baseChance += 25;[span_441](start_span)[span_441](end_span)
    if (car.sellerPersonality === 'greedy') baseChance -= 25;[span_442](start_span)[span_442](end_span)

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;[span_443](start_span)[span_443](end_span)
    let lvl = (state.player && state.player.level) ? state.player.level : 1;[span_444](start_span)[span_444](end_span)
    
    let finalChance = baseChance + (lvl * 0.4) + ((karma - 50) * 0.3);[span_445](start_span)[span_445](end_span)
    const thread = document.getElementById("dealChatThread");[span_446](start_span)[span_446](end_span)

    if (Math.random() * 100 <= finalChance) {[span_447](start_span)[span_447](end_span)
        let disc = Math.round(car.price * (percent / 100));[span_448](start_span)[span_448](end_span)
        car.price = Math.max(10000, car.price - disc);[span_449](start_span)[span_449](end_span)
        setTxt("dealCarPrice", car.price.toLocaleString() + " ₽");[span_450](start_span)[span_450](end_span)

        if (thread) {[span_451](start_span)[span_451](end_span)
            thread.innerHTML += `
                <div class="chat-msg msg-player">«Скинь ${percent}%, забираю прямо сейчас за наличку без лишних вопросов.»</div>
                <div class="chat-msg msg-seller">«По рукам. Уступаю ${disc.toLocaleString()} ₽, оформляем ДКП.»</div>`;[span_452](start_span)[span_452](end_span)
            thread.scrollTop = thread.scrollHeight;[span_453](start_span)[span_453](end_span)
        }
        playSound('win');[span_454](start_span)[span_454](end_span)
        tgHaptic('success');[span_455](start_span)[span_455](end_span)
    } else {
        if (thread) {[span_456](start_span)[span_456](end_span)
            let failReplies = [[span_457](start_span)[span_457](end_span)
                "«Никаких скидок, цена и так по низу рынка!»",[span_458](start_span)[span_458](end_span)
                "«Не устраивает цена — ищи другой вариант на площадке.»",[span_459](start_span)[span_459](end_span)
                "«Ты надоел торговаться, больше ни копейки не скину!»[span_460](start_span)"[span_460](end_span)
            ];
            let reply = failReplies[Math.floor(Math.random() * failReplies.length)];[span_461](start_span)[span_461](end_span)
            thread.innerHTML += `
                <div class="chat-msg msg-player">«Скидывай ${percent}%, слишком много просишь!»</div>
                <div class="chat-msg msg-seller">${reply}</div>`;[span_462](start_span)[span_462](end_span)
            thread.scrollTop = thread.scrollHeight;[span_463](start_span)[span_463](end_span)
        }
        tgHaptic('error');[span_464](start_span)[span_464](end_span)
    }

    renderMarketHaggleControls();[span_465](start_span)[span_465](end_span)
    saveState();[span_466](start_span)[span_466](end_span)
}

// ----------------------------------------------------
// ВЫКУП АВТО ЧЕРЕЗ БЛАНК ДКП
// ----------------------------------------------------
function confirmMarketPurchaseSuccess() {
    if (!pendingMarketCar) return;[span_467](start_span)[span_467](end_span)
    const car = pendingMarketCar.car;[span_468](start_span)[span_468](end_span)
    
    const maxSlots = getTotalGarageSlots();[span_469](start_span)[span_469](end_span)
    let currentSlots = state.garage ? state.garage.length : 0;[span_470](start_span)[span_470](end_span)

    if (currentSlots >= maxSlots) return showToast("Гараж полон! Вместимость: " + maxSlots + " мест.");[span_471](start_span)[span_471](end_span)
    
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_472](start_span)[span_472](end_span)
    let price = car.price ? car.price : 0;[span_473](start_span)[span_473](end_span)

    if (cash < price) return showToast("Недостаточно денег на выкуп!");[span_474](start_span)[span_474](end_span)
    
    closeModal("modalMarketDeal");[span_475](start_span)[span_475](end_span)

    activePendingDKPDeal = {
        type: 'buy',[span_476](start_span)[span_476](end_span)
        car: car,[span_477](start_span)[span_477](end_span)
        carIndex: pendingMarketCar.carIndex,[span_478](start_span)[span_478](end_span)
        seller: pendingMarketCar.sellerName || "Продавец",[span_479](start_span)[span_479](end_span)
        buyer: (state.player && state.player.name) ? state.player.name : "Перекуп #777",[span_480](start_span)[span_480](end_span)
        price: price[span_481](start_span)[span_481](end_span)
    };

    if (typeof openDKPModal === 'function') {
        openDKPModal(activePendingDKPDeal);[span_482](start_span)[span_482](end_span)
    } else {
        openRegistrationChoiceModal(activePendingDKPDeal);
    }
}

// ----------------------------------------------------
// ВЫБОР РЕГИСТРАЦИИ: УЧЁТ РФ В МРЭО vs ПЕРЕПРОДАЖА НА ДКП
// ----------------------------------------------------
function openRegistrationChoiceModal(deal) {
    activePendingDKPDeal = deal;
    let modal = document.getElementById('modalRegistrationChoice');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalRegistrationChoice';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-box text-center" style="max-width: 410px;">
                <div style="font-size: 36px; margin-bottom: 6px;">📑</div>
                <h3 class="font-bold mb-1 color-cyan">Способ оформления автомобиля</h3>
                <p class="sub-label mb-3">Выберите форму владения для выкупленного авто:</p>

                <div class="glass-card text-left p-2 mb-2" style="border-left: 3px solid var(--green);">
                    <b class="text-xs color-green">1. Поставить на чистый учёт в МРЭО</b>
                    <div class="sub-label my-1" style="font-size:10px;">
                        • Оплата госпошлины: <b>2,850 ₽</b><br>
                        • Юридическая чистота: 0 рисков при проверках ДПС.<br>
                        • ⚠️ <b>Налог 13%</b> с чистой прибыли при быстрой перепродаже (до 30 дней владения)!
                    </div>
                    <button onclick="confirmRegistrationChoice(true)" class="btn btn-green btn-sm w-full mt-1">Оформить на себя в МРЭО (-2,850 ₽)</button>
                </div>

                <div class="glass-card text-left p-2 mb-3" style="border-left: 3px solid var(--amber);">
                    <b class="text-xs color-amber">2. Оставить на ДКП (Перекупский режим)</b>
                    <div class="sub-label my-1" style="font-size:10px;">
                        • Пошлина: <b>0 ₽</b> (Экономия)<br>
                        • Налог 13%: <b>Не платится</b> (Вся маржа ваша)<br>
                        • 🚨 <b>Риск 10 дней:</b> если вас остановят ДПС с просроченным ДКП — штраф до 50,000 ₽!
                    </div>
                    <button onclick="confirmRegistrationChoice(false)" class="btn btn-amber btn-sm w-full mt-1">Оставить на ДКП (Без пошлины и налога)</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    modal.classList.add('active');
    playSound('tick');
    tgHaptic('light');
}

function confirmRegistrationChoice(registerOnPlayer) {
    closeModal('modalRegistrationChoice');
    if (!activePendingDKPDeal) return;

    if (registerOnPlayer) {
        let duty = 2850;
        let cash = state.player?.cash || 0;
        if (cash < duty) {
            showToast("Не хватает 2,850 ₽ на госпошлину МРЭО! Авто оформлено по ДКП.");
            activePendingDKPDeal.isRegisteredOnPlayer = false;
        } else {
            state.player.cash -= duty;
            activePendingDKPDeal.isRegisteredOnPlayer = true;
            showToast("Машина зарегистрирована в МРЭО ГИБДД (-2,850 ₽ госпошлина) ✓");
        }
    } else {
        activePendingDKPDeal.isRegisteredOnPlayer = false;
        showToast("Автомобиль оставлен на ДКП без постановки на учёт (Лимит: 10 дней)!");
    }

    finishMarketCarBuyProcess(activePendingDKPDeal);
}

function finishMarketCarBuyProcess(deal) {
    const car = deal.car;
    const price = deal.price;
    const carIndex = deal.carIndex;

    state.player.cash -= price;[span_483](start_span)[span_483](end_span)
    
    if (!state.player.stats) state.player.stats = {};[span_484](start_span)[span_484](end_span)
    state.player.stats.bought = (state.player.stats.bought || 0) + 1;[span_485](start_span)[span_485](end_span)
    
    if (!state.garage) state.garage = [];[span_486](start_span)[span_486](end_span)
    
    const newCar = Object.assign({}, car);[span_487](start_span)[span_487](end_span)
    newCar.customPlate = car.plate;[span_488](start_span)[span_488](end_span)
    newCar.impounded = false;[span_489](start_span)[span_489](end_span)
    newCar.unregistered = false;[span_490](start_span)[span_490](end_span)
    newCar.insurance = null;[span_491](start_span)[span_491](end_span)
    newCar.purchaseCost = price;[span_492](start_span)[span_492](end_span)
    newCar.wear = car.wear ? car.wear : { engine: 85, transmission: 85 };[span_493](start_span)[span_493](end_span)
    newCar.preSaleVisited = false;[span_494](start_span)[span_494](end_span)
    newCar.isPersonal = false;[span_495](start_span)[span_495](end_span)
    newCar.isRegisteredOnPlayer = !!deal.isRegisteredOnPlayer;
    newCar.ownershipDays = 0;
    newCar.engineTemp = 90;
    newCar.tireWear = 100;
    
    newCar.tuning = { 
        chip: 0, exhaust: false, stance: false, bodykit: false, 
        rollCage: false, dragSlicks: false, hydroHandbrake: false, 
        weldedDiff: false, steeringAngle: false, bucketSeats: false, 
        customWheels: false, risk1251: 0 
    };[span_496](start_span)[span_496](end_span)

    if (typeof recalculateCarMarketValue === 'function') {
        recalculateCarMarketValue(newCar);[span_497](start_span)[span_497](end_span)
    }

    state.garage.push(newCar);[span_498](start_span)[span_498](end_span)
    
    if (state.marketFeed && state.marketFeed.length > carIndex) {[span_499](start_span)[span_499](end_span)
        state.marketFeed.splice(carIndex, 1);[span_500](start_span)[span_500](end_span)
    }
    
    pendingMarketCar = null;[span_501](start_span)[span_501](end_span)
    activePendingDKPDeal = null;[span_502](start_span)[span_502](end_span)
    addXp(40);[span_503](start_span)[span_503](end_span)

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('buy_car', 1);
    }
    
    let carName = car.name ? car.name : "Авто";[span_504](start_span)[span_504](end_span)
    showToast("✅ " + carName + " куплен за " + price.toLocaleString() + " ₽!");[span_505](start_span)[span_505](end_span)
    spawnFloatingReward("-" + price.toLocaleString() + " ₽");[span_506](start_span)[span_506](end_span)
    
    saveState();[span_507](start_span)[span_507](end_span)
    renderMarketFeed();[span_508](start_span)[span_508](end_span)
    renderGarage();[span_509](start_span)[span_509](end_span)
    setTimeout(() => { switchTab("tabGarage"); }, 400);[span_510](start_span)[span_510](end_span)
}

// ----------------------------------------------------
// ТОЛЩИНОМЕР ЛКП (ИСПРАВЛЕННЫЙ ВЫХОД БЕЗ ЗАВИСАНИЙ)
// ----------------------------------------------------
function openGaugeModal(carId) { 
    activeInspectCarId = carId;[span_511](start_span)[span_511](end_span)
    if (!state.marketFeed) return;[span_512](start_span)[span_512](end_span)
    const car = state.marketFeed.find(c => c && c.id === carId);[span_513](start_span)[span_513](end_span)
    if (car) {
        car.viewed = true;[span_514](start_span)[span_514](end_span)
        car.gaugeChecked = true;[span_515](start_span)[span_515](end_span)
    }

    let hasGauge = !!(state.player && state.player.tools && (state.player.tools.gauge || state.player.tools.gauge_pro));[span_516](start_span)[span_516](end_span)

    if (!hasGauge) {[span_517](start_span)[span_517](end_span)
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_518](start_span)[span_518](end_span)
        if (cash < 3000) return showToast("Купите толщиномер в Маркете или отдайте 3,000 ₽ за выездной замер!");[span_519](start_span)[span_519](end_span)
        state.player.cash -= 3000;[span_520](start_span)[span_520](end_span)
        showToast("Услуга замера оплачена: -3,000 ₽");
    }

    ['hood', 'roof', 'doors', 'wings'].forEach(part => {
        const el = document.getElementById("part-" + part);
        if (el) el.innerHTML = "Замерить";
    });

    if (typeof trackQuestProgress === 'function') {
        trackQuestProgress('gauge_check', 1);
    }

    saveState();[span_521](start_span)[span_521](end_span)
    const modal = document.getElementById("modalGauge");[span_522](start_span)[span_522](end_span)
    if (modal) modal.classList.add('active');[span_523](start_span)[span_523](end_span)
    renderMarketFeed();[span_524](start_span)[span_524](end_span)
}

function checkBodyPart(part) { 
    if (!activeInspectCarId || !state.marketFeed) return;[span_525](start_span)[span_525](end_span)
    const car = state.marketFeed.find(c => c && c.id === activeInspectCarId);[span_526](start_span)[span_526](end_span)
    if (!car || !car.bodyThickness) return;[span_527](start_span)[span_527](end_span)
    
    playSound('tick');[span_528](start_span)[span_528](end_span)
    tgHaptic('light');[span_529](start_span)[span_529](end_span)
    
    let val = car.bodyThickness[part] ? car.bodyThickness[part] : 100;[span_530](start_span)[span_530](end_span)

    const el = document.getElementById("part-" + part);[span_531](start_span)[span_531](end_span)
    if (el) {
        if (val > 200) {[span_532](start_span)[span_532](end_span)
            el.innerHTML = "<span class='color-red'>" + val + " мкм (Шпакля)</span>";[span_533](start_span)[span_533](end_span)
        } else {
            el.innerHTML = "<span class='color-green'>" + val + " мкм (Завод)</span>";[span_534](start_span)[span_534](end_span)
        }
    }
}

function closeGaugeModal() {
    closeModal("modalGauge");
    activeInspectCarId = null;
    playSound('tick');
}

function openAutotekaModal(carId) {
    if (!state.marketFeed) return;[span_535](start_span)[span_535](end_span)
    const car = state.marketFeed.find(c => c && c.id === carId);[span_536](start_span)[span_536](end_span)
    if (!car) return;[span_537](start_span)[span_537](end_span)
    car.viewed = true;[span_538](start_span)[span_538](end_span)
    
    if (!car.autotekaChecked) {[span_539](start_span)[span_539](end_span)
        let isVip = !!(state.player && state.player.vipPro);[span_540](start_span)[span_540](end_span)
        const cost = isVip ? 0 : 5000;[span_541](start_span)[span_541](end_span)
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;[span_542](start_span)[span_542](end_span)
        
        if (cash < cost && !isVip) return showToast("Автотека стоит 5,000 ₽!");[span_543](start_span)[span_543](end_span)
        state.player.cash -= cost;[span_544](start_span)[span_544](end_span)
        car.autotekaChecked = true;[span_545](start_span)[span_545](end_span)
        saveState();[span_546](start_span)[span_546](end_span)
    }
    
    const rep = document.getElementById("autotekaReportContent");[span_547](start_span)[span_547](end_span)
    if (rep) {[span_548](start_span)[span_548](end_span)
        let cName = car.name ? car.name : "Автомобиль";[span_549](start_span)[span_549](end_span)
        let cPlate = car.plate ? car.plate : "ТРАНЗИТ";[span_550](start_span)[span_550](end_span)
        let dtpCount = car.hiddenDefect ? "2 ДТП (В расчётах)" : "ДТП не найдены";[span_551](start_span)[span_551](end_span)
        let dtpBadgeClass = car.hiddenDefect ? "bg-tag-red" : "bg-tag-green";[span_552](start_span)[span_552](end_span)
        
        let legalStatus = car.isStolen[span_553](start_span)[span_553](end_span)
            ? "<span class='tag-badge bg-tag-red'>🚨 В РОЗЫСКЕ / ПЕРЕБИТ VIN</span>[span_554](start_span)"[span_554](end_span)
            : "<span class='tag-badge bg-tag-green'>✓ ЮРИДИЧЕСКИ ЧИСТ</span>";[span_555](start_span)[span_555](end_span)

        let mVal = car.mileage ? car.mileage : 85000;[span_556](start_span)[span_556](end_span)
        let mileagePercent = Math.min(100, Math.round((mVal / 250000) * 100));[span_557](start_span)[span_557](end_span)
        let odoWarning = car.rolledOdometer[span_558](start_span)[span_558](end_span)
            ? "<span class='color-red text-xs font-bold'>⚠ Зафиксирована скрутка пробега!</span>[span_559](start_span)"[span_559](end_span)
            : "<span class='color-green text-xs'>✓ Пробег подтвержден станциями ТО</span>";[span_560](start_span)[span_560](end_span)

        let engWear = car.wear?.engine ? Math.round(car.wear.engine) : 85;[span_561](start_span)[span_561](end_span)
        let transWear = car.wear?.transmission ? Math.round(car.wear.transmission) : 85;[span_562](start_span)[span_562](end_span)
        let avgTech = Math.round((engWear + transWear) / 2);[span_563](start_span)[span_563](end_span)

        rep.innerHTML = `
            <div class='flex-between mb-2'>
                <div>
                    <b class='color-cyan' style='font-size:13px;'>${cName}</b>
                    <div class='sub-label'>Госномер: <span class='license-plate text-xs notranslate' translate='no' style='padding:1px 4px;'>${cPlate}</span></div>
                </div>
                ${legalStatus}
            </div>

            <div class='p-2 mb-2' style='background:#0d1424; border-radius:8px; border:1px solid rgba(255,255,255,0.06);'>
                <div class='flex-between text-xs mb-1'>
                    <span>Зафиксированный пробег:</span>
                    <b class='color-amber notranslate' translate='no'>${mVal.toLocaleString()} км</b>
                </div>
                <div class='biz-progress-track'><div class='biz-progress-fill fill-biz-stock' style='width:${mileagePercent}%;'></div></div>
                <div class='text-right'>${odoWarning}</div>
            </div>

            <div class='p-2 mb-2' style='background:#0d1424; border-radius:8px; border:1px solid rgba(255,255,255,0.06);'>
                <div class='flex-between text-xs mb-1'>
                    <span>Ресурс силовых агрегатов:</span>
                    <b class='color-green notranslate' translate='no'>${avgTech}%</b>
                </div>
                <div class='biz-progress-track'><div class='biz-progress-fill fill-biz-lvl' style='width:${avgTech}%;'></div></div>
                <div class='sub-label text-xs notranslate' translate='no'>Мотор: ${engWear}% | КПП: ${transWear}%</div>
            </div>

            <div class='flex-between text-xs p-2' style='background:#0d1424; border-radius:8px; border:1px solid rgba(255,255,255,0.06);'>
                <span>История ДТП и расчёты ремонтов:</span>
                <span class='tag-badge ${dtpBadgeClass}'>${dtpCount}</span>
            </div>`;[span_564](start_span)[span_564](end_span)
    }
    
    const modal = document.getElementById("modalAutoteka");[span_565](start_span)[span_565](end_span)
    if (modal) modal.classList.add('active');[span_566](start_span)[span_566](end_span)
    playSound('tick');[span_567](start_span)[span_567](end_span)
    renderMarketFeed();[span_568](start_span)[span_568](end_span)
}

function updateMarketTimers() {
    if (!state.marketFeed) return;[span_569](start_span)[span_569](end_span)
    const now = Date.now();[span_570](start_span)[span_570](end_span)
    let needFullReRender = false;[span_571](start_span)[span_571](end_span)

    state.marketFeed.forEach(car => {[span_572](start_span)[span_572](end_span)
        if (!car) return;[span_573](start_span)[span_573](end_span)
        const cardEl = document.getElementById("card_" + car.id);[span_574](start_span)[span_574](end_span)
        const timerNumEl = document.getElementById("timer_num_" + car.id);[span_575](start_span)[span_575](end_span)

        if (car.cooldownUntil && car.cooldownUntil > now) {[span_576](start_span)[span_576](end_span)
            const timeLeft = Math.ceil((car.cooldownUntil - now) / 1000);[span_577](start_span)[span_577](end_span)
            if (timerNumEl) timerNumEl.innerText = timeLeft + "с";[span_578](start_span)[span_578](end_span)
            if (cardEl && !cardEl.classList.contains('busy')) cardEl.classList.add('busy');[span_579](start_span)[span_579](end_span)
        } else if (car.cooldownUntil && car.cooldownUntil <= now) {[span_580](start_span)[span_580](end_span)
            car.cooldownUntil = 0;[span_581](start_span)[span_581](end_span)
            if (cardEl) cardEl.classList.remove('busy');[span_582](start_span)[span_582](end_span)
            needFullReRender = true;[span_583](start_span)[span_583](end_span)
        }
    });

    if (needFullReRender) renderMarketFeed();[span_584](start_span)[span_584](end_span)
}

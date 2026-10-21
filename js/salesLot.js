// ========================================================
// js/salesLot.js — ПЛОЩАДКА ПРОДАЖ, ДЕТЕЙЛИНГ И КЛУБНЫЙ СБЫТ (v3.7.0-hardcore)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v3.7.0 (СИНХРОНИЗАЦИЯ С КЛУБОМ СИНДИКАТА И M+):
//   1. Интегрирован клубный перк «Синдикат-Сбыт» (+6% к предложению покупателей).
//   2. Фирменный бейдж синдиката на карточках лотов и особые реплики покупателей.
//   3. Полная синхронизация со стикерами и диалогами 3-секционного мессенджера M+.
//   4. Сохранён хардкор-баланс рынка (marketValue), риски скрутки и таймеры.
// ========================================================

let salesLotTimerInterval = null;
let activeSalesLotHaggleIndex = null;
let _lastSalesLotTickTimestamp = Date.now();

// --------------------------------------------------------
// ЗАЩИТНЫЙ ХЕЛПЕР
// --------------------------------------------------------
function _isStateReady() {
    return typeof state !== 'undefined' && state !== null && !!state.player;
}

// --------------------------------------------------------
// ПРОВЕРКА ПЕРКОВ АВТОКЛУБА
// --------------------------------------------------------
function getPlayerClubPerks() {
    if (!_isStateReady()) return [];
    const club = state.player?.club;
    if (!club) return [];
    const clubId = typeof club === 'string' ? club : club.id;

    if (clubId === 'sts') {
        return ['syndicate_sell', 'garage_brotherhood', 'dps_inside'];
    }
    if (clubId === 'mdd') {
        return ['turbo_boost', 'drift_discount', 'fuel_discount'];
    }
    if (clubId === 'rac') {
        return ['retro_hunt', 'archive_plates', 'vip_deposit'];
    }
    if (Array.isArray(club.perks)) {
        return club.perks.map(p => p.id || p.title || p);
    }
    return [];
}

function hasClubPerk(perkKey) {
    if (!_isStateReady()) return false;
    const perks = getPlayerClubPerks();
    if (perks.includes(perkKey)) return true;

    if (perkKey === 'syndicate_sell') {
        const club = state.player?.club;
        const clubId = typeof club === 'string' ? club : club?.id;
        if (clubId === 'sts') return true;
        if (Array.isArray(club?.perks) && club.perks.some(p => String(p.title || '').includes('Сбыт'))) {
            return true;
        }
    }
    return false;
}

// --------------------------------------------------------
// БАЗОВЫЕ АРХЕТИПЫ ПОКУПАТЕЛЕЙ (NPC)
// --------------------------------------------------------
const BUYER_ARCHETYPES = [
    {
        id: "student",
        name: "Макс (Студент)",
        avatar: "🧢",
        patience: 4,
        riskTolerance: "low",
        moodPhrase: "«Ищу первую тачку подкопить опыт. Денег впритык, уступи немного!»",
        inspectionSkill: "low"
    },
    {
        id: "podbor",
        name: "Олег (Автоподбор)",
        avatar: "🔎",
        patience: 5,
        riskTolerance: "mid",
        moodPhrase: "«Здравствуйте. Осматриваю авто под ключ для клиента. Давайте проверим кузов и диагностику.»",
        inspectionSkill: "high"
    },
    {
        id: "perekup",
        name: "Серго (Перекуп)",
        avatar: "🧔",
        patience: 3,
        riskTolerance: "high",
        moodPhrase: "«Салам! Заберу за наличку прямо сейчас, но скинь по-братски!»",
        inspectionSkill: "mid"
    },
    {
        id: "shadow",
        name: "Артур (Теневой)",
        avatar: "🕶️",
        patience: 4,
        riskTolerance: "high",
        moodPhrase: "«Машина на ходу, документы чистые? Если сойдёмся в цене — забираю.»",
        inspectionSkill: "mid"
    },
    {
        id: "family",
        name: "Виктор (Семьянин)",
        avatar: "👨‍👩‍👦",
        patience: 5,
        riskTolerance: "low",
        moodPhrase: "«Нужна надёжная машина для семьи на каждый день. Главное чтобы без сюрпризов.»",
        inspectionSkill: "low"
    }
];

// --------------------------------------------------------
// VIP-ПОКУПАТЕЛИ (САРАФАННОЕ РАДИО)
// --------------------------------------------------------
const VIP_BUYER_ARCHETYPES = [
    {
        id: "vip_collector",
        name: "Коллекционер Георгий",
        avatar: "👑",
        patience: 6,
        riskTolerance: "low",
        isVIP: true,
        bonusMultiplier: 1.15,
        moodPhrase: "«Добрый день. Услышал о вашей репутации на рынке. Ищу автомобиль в коллекцию — состояние и история важнее цены.»",
        inspectionSkill: "high"
    },
    {
        id: "vip_oligarch",
        name: "Олигарх Роман",
        avatar: "💎",
        patience: 5,
        riskTolerance: "high",
        isVIP: true,
        bonusMultiplier: 1.25,
        moodPhrase: "«Здравствуйте. Мне рекомендовали вас как честного продавца. Если машина в идеале — забираю сегодня.»",
        inspectionSkill: "mid"
    },
    {
        id: "vip_blogger",
        name: "Автоблогер Тим",
        avatar: "📸",
        patience: 4,
        riskTolerance: "mid",
        isVIP: true,
        bonusMultiplier: 1.18,
        moodPhrase: "«Привет! У меня канал про тачки, хочу снять обзор на ваш лот. Готов немного переплатить за живой экземпляр!»",
        inspectionSkill: "low"
    },
    {
        id: "vip_dealer",
        name: "Дилер Престиж-Авто",
        avatar: "🤵",
        patience: 5,
        riskTolerance: "low",
        isVIP: true,
        bonusMultiplier: 1.12,
        moodPhrase: "«Добрый день. Представляю салон. Готов выкупить лот по адекватной рыночной цене без лишних проверок.»",
        inspectionSkill: "mid"
    }
];

// ========================================================
// СОХРАНЕНИЕ ОРИГИНАЛЬНОЙ ОБЛОЖКИ ИЗ ГАРАЖА
// ========================================================
function getOrAssignLotCarImage(car, lot) {
    const defaultPlaceholder = "assets/cars/economy/2101/vaz-2101.jpg";
    if (!car) {
        return {
            src: defaultPlaceholder,
            baseFallback: defaultPlaceholder,
            fallback: defaultPlaceholder
        };
    }

    let chosenImg = car.img || car.baseImg || (Array.isArray(car.images) && car.images.length > 0 ? car.images[0] : null) || defaultPlaceholder;

    car.baseImg = car.baseImg || chosenImg;
    car.assignedLotImg = chosenImg;
    car.img = chosenImg;
    if (lot) lot.lockedImg = chosenImg;

    let universalFallback = car.fallback || defaultPlaceholder;

    return {
        src: chosenImg,
        baseFallback: chosenImg,
        fallback: universalFallback
    };
}

function removeDialogByCarIndex(idx) {
    if (!_isStateReady()) return false;
    if (!Array.isArray(state.player.phoneMessages)) return false;

    const lot = state.salesLot?.[idx];
    const carUid = lot?.car?.uid || lot?.car?.id || null;

    const toRemove = state.player.phoneMessages
        .filter(m => {
            if (!m || m.category !== 'buyers') return false;
            if (carUid && m.carUid === carUid) return true;
            if (m.carIndex === idx) return true;
            return false;
        })
        .map(m => m.id);

    if (toRemove.length === 0) return false;

    const before = state.player.phoneMessages.length;
    state.player.phoneMessages = state.player.phoneMessages.filter(m => {
        if (!m) return false;
        if (m.category === 'buyers') {
            if (carUid && m.carUid === carUid) return false;
            if (m.carIndex === idx) return false;
        }
        return true;
    });

    const removed = before !== state.player.phoneMessages.length;

    if (removed && typeof window.AppM !== 'undefined' && window.AppM.activeDialogId) {
        if (toRemove.includes(window.AppM.activeDialogId)) {
            try {
                window.AppM.activeDialogId = null;
                if (typeof window.AppM.render === 'function') {
                    const container = document.getElementById('phoneAppContainer');
                    if (container) window.AppM.render(container);
                }
            } catch (e) {}
        }
    }

    if (removed && typeof PhoneManager !== 'undefined' && typeof PhoneManager.updateUnreadBadge === 'function') {
        PhoneManager.updateUnreadBadge();
    }
    return removed;
}

function shiftDialogIndicesAfterRemoval(removedIdx) {
    if (!_isStateReady()) return;
    if (!Array.isArray(state.player.phoneMessages)) return;
    state.player.phoneMessages.forEach(m => {
        if (m && m.category === 'buyers' && typeof m.carIndex === 'number') {
            if (m.carIndex > removedIdx) m.carIndex -= 1;
        }
    });
}

function _adjustHaggleIndexAfterRemoval(removedIdx) {
    if (activeSalesLotHaggleIndex === null) return false;

    if (activeSalesLotHaggleIndex === removedIdx) {
        activeSalesLotHaggleIndex = null;
        try {
            if (typeof ModalManager !== 'undefined') {
                ModalManager.close('modalLotHoodDeal');
            }
        } catch (e) {}
        return true;
    }

    if (activeSalesLotHaggleIndex > removedIdx) {
        activeSalesLotHaggleIndex -= 1;
    }

    return false;
}

function cleanupOrphanedDialogs() {
    if (!_isStateReady()) return 0;
    if (!Array.isArray(state.player.phoneMessages)) return 0;
    
    const totalLots = Array.isArray(state.salesLot) ? state.salesLot.length : 0;
    const validCarUids = new Set();
    if (Array.isArray(state.salesLot)) {
        state.salesLot.forEach(lot => {
            const uid = lot?.car?.uid || lot?.car?.id;
            if (uid) validCarUids.add(uid);
        });
    }

    const before = state.player.phoneMessages.length;

    state.player.phoneMessages = state.player.phoneMessages.filter(m => {
        if (!m) return false;
        if (m.category !== 'buyers') return true;

        if (m.carUid) {
            return validCarUids.has(m.carUid);
        }

        if (typeof m.carIndex === 'number') {
            return m.carIndex >= 0 && m.carIndex < totalLots;
        }

        return true;
    });

    const removed = before - state.player.phoneMessages.length;
    if (removed > 0 && typeof PhoneManager !== 'undefined' && typeof PhoneManager.updateUnreadBadge === 'function') {
        PhoneManager.updateUnreadBadge();
    }
    return removed;
}

function initSalesLotTimer() {
    if (!_isStateReady()) return;
    if (salesLotTimerInterval) clearInterval(salesLotTimerInterval);
    _lastSalesLotTickTimestamp = Date.now();
    salesLotTimerInterval = setInterval(() => {
        updateSalesLotTimers();
    }, 1000);
}

function _startSalesLotTimerWhenReady() {
    if (_isStateReady()) {
        initSalesLotTimer();
        return;
    }

    let attempts = 0;
    const check = setInterval(() => {
        attempts++;
        if (_isStateReady()) {
            clearInterval(check);
            initSalesLotTimer();
        } else if (attempts > 100) {
            clearInterval(check);
        }
    }, 100);
}

function renderSalesLot() {
    if (!_isStateReady()) return;

    const container = document.getElementById('salesLotList');
    if (!container) return;

    if (!state.salesLot) state.salesLot = [];

    cleanupOrphanedDialogs();

    const validLots = state.salesLot.filter(lot => lot && (lot.car || lot.name));

    const badge = document.getElementById('lotCountBadge');
    if (badge) badge.innerText = `${validLots.length} авто на продаже`;

    const ticketDisplay = document.getElementById('expressCountDisplay');
    if (ticketDisplay) {
        ticketDisplay.innerText = `${state.player?.expressTickets || 0} / ${state.player?.maxExpressTickets || 25}`;
    }

    if (validLots.length === 0) {
        container.innerHTML = `
            <div class="glass-card text-center py-6 sub-label">
                <i class="fa-solid fa-car-on mb-2 color-green" style="font-size:28px;"></i>
                <div>На площадке продаж пусто.</div>
                <div class="text-xs mt-1">Перейдите в <b class="color-cyan" style="cursor:pointer;" onclick="switchTab('tabGarage')">Гараж</b> и выставьте автомобиль на продажу!</div>
            </div>
        `;
        return;
    }

    const hasSyndicatePerk = hasClubPerk('syndicate_sell');
    let html = "";

    state.salesLot.forEach((lot, idx) => {
        if (!lot) return;
        const car = lot.car || lot;
        if (!car) return;

        let askingPrice = lot.askingPrice || car.price || 100000;
        let purchaseCost = car.purchaseCost || Math.round(askingPrice * 0.75);
        let margin = askingPrice - purchaseCost;
        let marginClass = margin >= 0 ? "color-green" : "color-red";

        const marketVal = car.marketValue || car.baseMarketValue || car.basePrice || 100000;
        const priceRatio = askingPrice / Math.max(1000, marketVal);
        let defaultTimer = 45;

        if (priceRatio > 1.35) {
            defaultTimer = 160;
        } else if (priceRatio > 1.15) {
            defaultTimer = 90;
        } else if (priceRatio > 1.05) {
            defaultTimer = 55;
        } else if (priceRatio < 0.90) {
            defaultTimer = 25;
        }

        let detailBonusTime = 0;
        if (car.headlightsPolished) detailBonusTime += 6;
        if (car.isPolished) detailBonusTime += 8;
        if (car.odorFree) detailBonusTime += 5;

        defaultTimer = Math.max(15, defaultTimer - detailBonusTime);

        if (lot.timer === undefined || isNaN(lot.timer)) {
            lot.timer = (lot.maxTimer && !isNaN(lot.maxTimer)) ? lot.maxTimer : defaultTimer;
        }
        if (lot.maxTimer === undefined || isNaN(lot.maxTimer)) {
            lot.maxTimer = defaultTimer;
        }

        let remainingSec = Math.max(0, lot.timer);
        let maxSec = Math.max(1, lot.maxTimer);
        let progressPct = Math.min(100, Math.max(0, Math.round(((maxSec - remainingSec) / maxSec) * 100)));

        let hasBuyer = !!lot.currentBuyer || !!lot.buyer;

        if (remainingSec === 0 && !hasBuyer && !lot.buyerGenerationPending) {
            lot.buyerGenerationPending = true;
            try {
                lot.currentBuyer = generateRandomLotBuyer(car, askingPrice);
                lot.buyer = lot.currentBuyer;
                lot.buyerTimerLeft = 120;
                lot._buyerTimerActive = true;
                hasBuyer = true;
                syncBuyerToMNetwork(lot, idx);
            } catch (e) {
                lot.timer = 30;
                lot.maxTimer = 30;
                hasBuyer = false;
            } finally {
                lot.buyerGenerationPending = false;
            }
        }

        const imgInfo = getOrAssignLotCarImage(car, lot);
        let rawImg = imgInfo.src;
        let baseFallback = imgInfo.baseFallback;
        let universalFallback = imgInfo.fallback;

        let carImgAttrs = (typeof buildCarImageAttrs === 'function')
            ? buildCarImageAttrs(rawImg, car)
            : `src="${rawImg}" onerror="if(this.src!=='${baseFallback}' && '${baseFallback}'){this.src='${baseFallback}';}else{this.onerror=null;this.src='${universalFallback}';}"`;

        let statusBadgeHtml = "";
        let waitSectionHtml = "";
        const isVIP = lot.currentBuyer && lot.currentBuyer.isVIP;

        if (!hasBuyer) {
            let demandNotice = priceRatio > 1.30 ? `<span class="sub-label color-red block mt-1" style="font-size:8px;">⚠️ Сильно выше рынка (${priceRatio.toFixed(1)}x)! Покупатели неохотно смотрят лот.</span>` : '';

            statusBadgeHtml = `<span class="tag-badge bg-tag-cyan"><i class="fa-solid fa-satellite-dish mr-1"></i> СКАНИРОВАНИЕ...</span>`;
            waitSectionHtml = `
                <div class="mb-2">
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label"><i class="fa-solid fa-users mr-1"></i> Ожидание покупателя:</span>
                        <span class="color-amber font-bold" id="lot_timer_text_${idx}">⏳ ${remainingSec}с</span>
                    </div>
                    <div class="lot-progress-track" style="height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden; border:1px solid rgba(0,242,254,0.2);">
                        <div id="lot_progress_fill_${idx}" class="lot-progress-fill" style="width:${progressPct}%; height:100%; background:linear-gradient(90deg, #00f2fe, #4facfe); box-shadow:0 0 10px rgba(0,242,254,0.6); transition:width 0.4s ease;"></div>
                    </div>
                    ${demandNotice}
                </div>

                <div class="grid-2 mb-2">
                    <button onclick="speedUpLotSearch(${idx}, 'ticket')" class="btn btn-purple btn-sm">
                        <i class="fa-solid fa-ticket mr-1"></i> ПРОПУСК (${state.player?.expressTickets || 0} ШТ)
                    </button>
                    <button onclick="speedUpLotSearch(${idx}, 'stars')" class="btn btn-amber btn-sm">
                        <i class="fa-solid fa-star mr-1"></i> 5 STARS ⭐
                    </button>
                </div>
            `;
        } else {
            let buyer = lot.currentBuyer || lot.buyer;
            let isOnlineChat = buyer.dealType === 'chat';

            if (isVIP) {
                statusBadgeHtml = `<span class="tag-badge bg-tag-amber"><i class="fa-solid fa-crown mr-1"></i> VIP-КЛИЕНТ</span>`;
            } else if (isOnlineChat) {
                statusBadgeHtml = `<span class="tag-badge bg-tag-cyan"><i class="fa-solid fa-envelope mr-1"></i> НАПИСАЛ В ТЕЛЕФОН</span>`;
            } else {
                statusBadgeHtml = `<span class="tag-badge bg-tag-green"><span class="led-dot led-green"></span> КЛИЕНТ У КАПОТА!</span>`;
            }
            waitSectionHtml = renderBuyerCardActions(lot, idx);
        }

        let plateText = car.customPlate || car.plate || "ТРАНЗИТ";
        let condVal = car.condition || 85;
        let shieldIconClass = condVal >= 80 ? 'spec-tile-icon-shield' : (condVal >= 50 ? 'spec-tile-icon-shield-mid' : 'spec-tile-icon-shield-low');
        let condColorClass = condVal >= 80 ? 'color-green' : (condVal >= 50 ? 'color-amber' : 'color-red');

        let detailingBadges = [];
        if (hasSyndicatePerk) detailingBadges.push(`<span class="tag-badge bg-tag-purple" style="font-size:7.5px;">🦅 [STS] +6% СБЫТ</span>`);
        if (car.headlightsPolished) detailingBadges.push(`<span class="tag-badge bg-tag-cyan" style="font-size:7.5px;">✨ ФАРЫ/ШИНЫ</span>`);
        if (car.isPolished) detailingBadges.push(`<span class="tag-badge bg-tag-cyan" style="font-size:7.5px;">💎 ПОЛИРОВКА</span>`);
        if (car.odorFree) detailingBadges.push(`<span class="tag-badge bg-tag-green" style="font-size:7.5px;">💨 СУХОЙ ТУМАН</span>`);

        html += `
            <div class="glass-card mb-3 ${hasBuyer ? 'card-glow-deal' : ''}" id="sales_lot_card_${idx}" data-lot-idx="${idx}" style="${isVIP ? 'border: 1.5px solid var(--amber) !important;' : ''}">
                <div class="car-img-wrap mb-2">
                    <img ${carImgAttrs} class="car-img">
                </div>

                <div class="car-header-row-volumetric mb-2">
                    <div>
                        <div class="flex-gap" style="align-items:center;">
                            <span class="car-brand-pill brand-default">ЛОТ</span>
                            <h3 class="font-bold text-xs" style="font-size:15px;">${car.name}</h3>
                        </div>
                        <div class="mt-1 flex-gap" style="align-items:center; flex-wrap:wrap; gap:4px;">
                            <span class="license-plate" style="font-size:9.5px; padding:2px 6px;">${plateText} <span class="license-flag">RUS</span></span>
                            <span class="tag-badge bg-tag-green">НА ПЛОЩАДКЕ</span>
                            ${detailingBadges.join(' ')}
                        </div>
                    </div>

                    <div class="car-price-badge-3d text-right">
                        <span class="car-price-label-sub">Цена на лоте</span>
                        <div class="car-price-value-3d" style="color:var(--green);">${askingPrice.toLocaleString()} ₽</div>
                        <div class="text-xs font-bold ${marginClass}" style="font-size:9.5px;">
                            ${margin >= 0 ? '▲ +' : '▼ '}${margin.toLocaleString()} ₽ маржа
                        </div>
                    </div>
                </div>

                <div class="car-specs-grid-volumetric mb-2">
                    <div class="spec-tile-3d-col">
                        <div class="spec-tile-icon-wrap spec-tile-icon-power"><i class="fa-solid fa-bolt"></i></div>
                        <div class="spec-tile-col-data">
                            <span class="spec-tile-col-label">Мощность</span>
                            <b class="color-amber">${car.power || 100} л.с.</b>
                        </div>
                    </div>

                    <div class="spec-tile-3d-col">
                        <div class="spec-tile-icon-wrap spec-tile-icon-road"><i class="fa-solid fa-road"></i></div>
                        <div class="spec-tile-col-data">
                            <span class="spec-tile-col-label">Пробег</span>
                            <b class="color-cyan">${(car.mileage || 85000).toLocaleString()} км</b>
                        </div>
                    </div>

                    <div class="spec-tile-3d-col">
                        <div class="spec-tile-icon-wrap ${shieldIconClass}"><i class="fa-solid fa-shield"></i></div>
                        <div class="spec-tile-col-data">
                            <span class="spec-tile-col-label">Кузов</span>
                            <b class="${condColorClass}">${condVal}%</b>
                        </div>
                    </div>
                </div>

                <div class="flex-between mb-2">
                    <span class="text-xs sub-label">Статус лота:</span>
                    ${statusBadgeHtml}
                </div>

                ${waitSectionHtml}

                <button onclick="reclaimCarFromLot(${idx})" class="btn btn-dark btn-sm w-full mt-2">
                    <i class="fa-solid fa-rotate-left mr-1"></i> Забрать обратно в гараж
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderBuyerCardActions(lot, idx) {
    const buyer = lot.currentBuyer || lot.buyer;
    if (!buyer) return "";

    const car = lot.car || lot;
    const askingPrice = lot.askingPrice || car.price || 100000;
    const currentPriceOffer = buyer.currentOffer || buyer.offeredPrice || Math.round(askingPrice * 0.85);
    const isOnlineChat = buyer.dealType === 'chat';
    const isVIP = !!buyer.isVIP;

    return `
        <div class="p-2 mb-2" style="background:#060a14; border-radius:12px; border:1px solid ${isVIP ? 'rgba(255,179,0,0.6)' : 'rgba(0, 242, 254, 0.3)'};">
            <div class="flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <span style="font-size:24px;">${buyer.avatar}</span>
                    <div>
                        <b class="text-xs ${isVIP ? 'color-amber' : 'color-cyan'}" style="font-size:12px;">${buyer.name} ${isVIP ? '👑' : ''}</b>
                        <div class="sub-label" style="font-size:8.5px;">
                            ${isVIP ? '👑 По сарафанному радио • ' : (isOnlineChat ? '📩 Написал в телефон • ' : '🚗 Стоит у капота • ')}
                            <span class="color-amber">⏳ ${lot.buyerTimerLeft || 120}с</span>
                        </div>
                    </div>
                </div>

                <div class="text-right">
                    <span class="sub-label" style="font-size:8px;">ПРЕДЛОЖЕНИЕ:</span>
                    <div class="price-val color-green" style="font-size:15px;">${currentPriceOffer.toLocaleString()} ₽</div>
                </div>
            </div>

            <div class="seller-dialog-bubble my-2" style="border-left: 3px solid ${isVIP ? 'var(--amber)' : 'var(--cyan)'}; background: ${isVIP ? 'rgba(255, 179, 0, 0.06)' : 'rgba(0, 242, 254, 0.04)'}; padding: 8px 10px; border-radius: 8px;">
                <span class="seller-mood-icon">${buyer.avatar}</span>
                <span class="seller-bubble-text" style="font-size:10px; line-height:1.35; color:#f1f5f9;">${buyer.lastReply}</span>
            </div>

            <div class="grid-2 mt-2" style="gap:6px;">
                ${isOnlineChat ? `
                    <button onclick="openLotBuyerInNetworkM(${idx})" class="btn btn-cyan btn-sm font-bold" style="padding:8px 0; font-size:11px;">
                        <i class="fa-solid fa-comment-dots mr-1"></i> ОТКРЫТЬ ДИАЛОГ 💬
                    </button>
                ` : `
                    <button onclick="openLotHoodHaggleModal(${idx})" class="btn btn-amber btn-sm font-bold" style="padding:8px 0; font-size:11px;">
                        <i class="fa-solid fa-comments-dollar mr-1"></i> ТОРГ У КАПОТА 🗣️
                    </button>
                `}
                <button onclick="rejectLotBuyer(${idx})" class="btn btn-danger btn-sm font-bold" style="padding:8px 0; font-size:11px;">
                    ✕ ОТКАЗ
                </button>
            </div>
        </div>
    `;
}

// --------------------------------------------------------
// ⭐ ГЕНЕРАЦИЯ ПОКУПАТЕЛЯ: РАСЧЕТ С УЧЕТОМ ПЕРКА СИНДИКАТА
// --------------------------------------------------------
function generateRandomLotBuyer(car, askingPrice) {
    if (!car) car = { name: 'Автомобиль', type: 'economy' };
    if (!askingPrice || askingPrice <= 0) askingPrice = 100000;

    const karma = state.player?.karma || 50;
    const connections = state.player?.connections || 0;
    const isVIP = (karma > 80 && connections > 5) && Math.random() < 0.20;

    const archetypePool = isVIP ? VIP_BUYER_ARCHETYPES : BUYER_ARCHETYPES;
    const archetype = archetypePool[Math.floor(Math.random() * archetypePool.length)];

    let marketPrice = Number(car.marketValue || car.baseMarketValue || car.basePrice || 100000);
    if (marketPrice <= 1000) marketPrice = 50000;

    let baseRatio = isVIP
        ? archetype.bonusMultiplier * (0.95 + Math.random() * 0.10)
        : (0.84 + Math.random() * 0.10);

    // ⭐ ПЕРК КЛУБА: СИНДИКАТ-СБЫТ (+6%)
    let syndicateRemark = '';
    if (hasClubPerk('syndicate_sell')) {
        baseRatio += 0.06;
        syndicateRemark = "«Слышал, ты состоишь в Синдикате [STS] — ценник уважаю, накинул +6%!»";
    }

    let preSaleRemarks = [];
    if (car.headlightsPolished) {
        baseRatio += 0.04;
        preSaleRemarks.push("«Фары горят, резина чистая — глаз радуется!»");
    }
    if (car.isPolished) {
        baseRatio += 0.05;
        preSaleRemarks.push("«ЛКП блестит без паутинки!»");
    }
    if (car.odorFree) {
        baseRatio += 0.03;
        preSaleRemarks.push("«В салоне свежо, табаком не разит.»");
    }

    let rawPrice = marketPrice * baseRatio;

    const priceRatio = askingPrice / marketPrice;
    let overpriceNotice = '';

    if (priceRatio > 1.35) {
        rawPrice = marketPrice * (0.75 + Math.random() * 0.08);
        overpriceNotice = ` «Ты откуда такой ценник (${askingPrice.toLocaleString()} ₽) взял?! На авторынке этой машине красная цена ${marketPrice.toLocaleString()} ₽. Предлагаю по факту!»`;
    } else if (priceRatio > 1.15) {
        rawPrice = Math.min(askingPrice * 0.88, marketPrice * 0.95);
        overpriceNotice = ` «Цену ты задрал, конечно. По верху рынка отдаешь. Давайте торговаться.»`;
    } else if (askingPrice <= marketPrice * 0.92) {
        rawPrice = Math.min(askingPrice, marketPrice * 0.95);
    }

    let bondoWarning = '';
    if (car.hasBondoBalloons && (archetype.inspectionSkill === 'high' || archetype.inspectionSkill === 'mid')) {
        rawPrice *= 0.82;
        bondoWarning = ` «Достал толщиномер: под баллончиком слой шпакли 400 мкм! Срезаю 18% за гаражный подкрас.»`;
    }

    let defectWarning = '';
    if (car.hiddenDefect && !car.hasAdditive) {
        const cost = car.hiddenDefect.cost || 15000;
        rawPrice = Math.max(10000, rawPrice - cost);
        defectWarning = ` «Движок гремит (${car.hiddenDefect.text || 'дефект'}). Скидывай ${cost.toLocaleString()} ₽ на сервис!»`;
    }

    let odometerBust = false;
    let odometerBustText = '';
    if (car.rolledOdometer && (archetype.inspectionSkill === 'high' || Math.random() < 0.35)) {
        odometerBust = true;
        rawPrice *= 0.70;
        odometerBustText = ` «Я подключил Launch: в блоках зафиксирован реальный пробег ${(car.actualMileage || 220000).toLocaleString()} км! Ты одометр скрутил?!»`;

        if (state.player?.p2pReputation) {
            state.player.p2pReputation.badReviews = (state.player.p2pReputation.badReviews || 0) + 1;
            state.player.p2pReputation.rating = Math.max(1.0, state.player.p2pReputation.rating - 0.3);
            if (!state.player.p2pReputation.reviewsLog) state.player.p2pReputation.reviewsLog = [];
            state.player.p2pReputation.reviewsLog.unshift({
                buyerName: archetype.name,
                stars: 1,
                text: `Смотал пробег на ${car.name}! В блоках вскрылась скрутка. Обманщик!`
            });
        }
        state.player.karma = Math.max(0, (state.player.karma || 50) - 8);
    }

    rawPrice = Math.min(rawPrice, askingPrice);
    const offeredPrice = Math.max(5000, Math.round(rawPrice / 1000) * 1000);
    const isOnlineChat = isVIP ? false : (Math.random() < 0.50);

    let initialDialogue = archetype.moodPhrase + (syndicateRemark ? ' ' + syndicateRemark : '') + (preSaleRemarks[0] ? ' ' + preSaleRemarks[0] : '') + overpriceNotice + bondoWarning + defectWarning + odometerBustText;
    if (isOnlineChat) {
        initialDialogue = `«Здравствуйте! По объявлению «${car.name}». За ${offeredPrice.toLocaleString()} ₽ отдадите?»` + (syndicateRemark ? ' ' + syndicateRemark : '') + overpriceNotice + bondoWarning + defectWarning + odometerBustText;
    }

    return {
        id: "buyer_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
        archetypeId: archetype.id,
        name: archetype.name,
        avatar: archetype.avatar,
        patience: archetype.patience,
        maxPatience: archetype.patience,
        riskTolerance: archetype.riskTolerance,
        inspectionSkill: archetype.inspectionSkill,
        offeredPrice: offeredPrice,
        initialOfferedPrice: offeredPrice,
        currentOffer: offeredPrice,
        lastReply: initialDialogue,
        dealType: isOnlineChat ? "chat" : "hood",
        isVIP: isVIP,
        odometerBusted: odometerBust,
        dialogHistory: [
            { from: 'them', text: initialDialogue }
        ],
        inspectionsDone: { gauge: false, obd: false, testDrive: false }
    };
}

function syncBuyerToMNetwork(lot, idx) {
    if (!lot || !lot.buyer || lot.buyer.dealType !== 'chat') return;
    if (!_isStateReady()) return;
    if (!state.player) state.player = {};
    if (!state.player.phoneMessages) state.player.phoneMessages = [];

    const car = lot.car || lot;
    if (!car) return;

    if (typeof window.ensureCarIdentity === 'function') {
        window.ensureCarIdentity(car);
    }
    const carUid = car.uid || car.id || null;
    if (!carUid) return;

    const buyer = lot.buyer;
    const safeCarName = String(car.name || 'car').replace(/[^a-zа-я0-9]/gi, '_');
    const dialogId = `dlg_buyer_slot_${idx}_${safeCarName}`;

    let exists = state.player.phoneMessages.find(m => m && m.category === 'buyers' && m.carUid === carUid);

    if (!exists) {
        state.player.phoneMessages.unshift({
            id: dialogId,
            category: 'buyers',
            sender: `${buyer.avatar} ${buyer.name}`,
            senderName: buyer.name,
            avatar: buyer.avatar,
            time: "Сейчас",
            unread: true,
            viewed: false,
            carIndex: idx,
            carUid: carUid,
            carData: car,
            isNPC: true,
            askingPrice: lot.askingPrice || car.price,
            offerPrice: buyer.currentOffer,
            preview: buyer.lastReply,
            chatHistory: [
                { from: 'them', text: buyer.lastReply }
            ]
        });
        if (typeof PhoneManager !== 'undefined' && typeof PhoneManager.updateUnreadBadge === 'function') {
            PhoneManager.updateUnreadBadge();
        }
    } else {
        exists.askingPrice = lot.askingPrice || car.price;
        exists.offerPrice = buyer.currentOffer;
        exists.carIndex = idx;
    }
}

window.handleNetworkMBuyerHaggle = function(dialogId, percent, risk) {
    if (!_isStateReady()) return;
    const msg = (state.player?.phoneMessages || []).find(m => m && m.id === dialogId);
    if (!msg) return;

    let lot = null;
    if (msg.carUid && Array.isArray(state.salesLot)) {
        lot = state.salesLot.find(l => l && l.car && (l.car.uid === msg.carUid || l.car.id === msg.carUid));
    }
    if (!lot && typeof msg.carIndex === 'number' && state.salesLot[msg.carIndex]) {
        lot = state.salesLot[msg.carIndex];
    }

    if (!lot || !lot.buyer) return showToast("❌ Покупатель больше недоступен");

    const buyer = lot.buyer;
    if (buyer.patience <= 0) return showToast("Покупатель отказался от дальнейшего торга!");

    buyer.patience -= 1;
    const currentPrice = buyer.currentOffer || buyer.offeredPrice;
    const raiseAmount = Math.round(currentPrice * (percent / 100));
    const newPrice = currentPrice + raiseAmount;

    if (!msg.chatHistory) msg.chatHistory = [];

    msg.chatHistory.push({
        from: 'me',
        text: `«За ${currentPrice.toLocaleString()} ₽ не отдам. Добавь хотя бы +${raiseAmount.toLocaleString()} ₽, и по рукам!»`
    });

    const isSuccess = Math.random() * 100 >= risk;

    setTimeout(() => {
        if (isSuccess) {
            buyer.currentOffer = newPrice;
            buyer.offeredPrice = newPrice;
            msg.offerPrice = newPrice;
            lot.askingPrice = Math.max(lot.askingPrice || 0, newPrice);

            msg.chatHistory.push({
                from: 'them',
                text: `«По рукам! Добавил +${raiseAmount.toLocaleString()} ₽. Итого ${newPrice.toLocaleString()} ₽. Оформляем ДКП!»`
            });

            if (typeof playSound === 'function') playSound('win');
            if (typeof tgHaptic === 'function') tgHaptic('success');
            showToast(`✅ Цена выросла до ${newPrice.toLocaleString()} ₽!`);
        } else {
            msg.chatHistory.push({
                from: 'them',
                text: `«Не, брат, это крайний бюджет, двигайся сам или я ухожу!»`
            });

            if (typeof playSound === 'function') playSound('tick');
            showToast("❌ Покупатель отклонил прибавку к цене!");
        }

        saveState();
        if (window.AppM && typeof window.AppM.openDialog === 'function') {
            window.AppM.openDialog(dialogId);
        }
    }, 350);

    saveState();
    if (window.AppM && typeof window.AppM.openDialog === 'function') {
        window.AppM.openDialog(dialogId);
    }
};

function openLotHoodHaggleModal(idx) {
    if (!_isStateReady()) return;
    const lot = state.salesLot[idx];
    if (!lot) return showToast("❌ Лот не найден");

    const buyer = lot.currentBuyer || lot.buyer;
    if (!buyer) return showToast("❌ У лота нет покупателя");

    activeSalesLotHaggleIndex = idx;
    const modal = (typeof ensureModal === 'function') ? ensureModal('modalLotHoodDeal') : document.getElementById('modalLotHoodDeal');

    renderLotHoodHaggleModalContent();
    if (typeof ModalManager !== 'undefined') {
        ModalManager.open('modalLotHoodDeal');
    } else if (modal) {
        modal.classList.add('active');
    }
    if (typeof playSound === 'function') playSound('tick');
}

function renderLotHoodHaggleModalContent() {
    if (!_isStateReady()) return;
    const modal = document.getElementById('modalLotHoodDeal');
    if (!modal || activeSalesLotHaggleIndex === null) return;

    const lot = state.salesLot[activeSalesLotHaggleIndex];
    if (!lot || !lot.buyer) {
        if (typeof ModalManager !== 'undefined') ModalManager.close('modalLotHoodDeal');
        activeSalesLotHaggleIndex = null;
        return;
    }

    const car = lot.car || lot;
    const buyer = lot.buyer;
    const currentOffer = buyer.currentOffer || buyer.offeredPrice;
    const isVIP = !!buyer.isVIP;

    const imgInfo = getOrAssignLotCarImage(car, lot);
    let rawImg = imgInfo.src;
    let baseFallback = imgInfo.baseFallback;
    let universalFallback = imgInfo.fallback;

    let carImgAttrs = (typeof buildCarImageAttrs === 'function')
        ? buildCarImageAttrs(rawImg, car)
        : `src="${rawImg}" onerror="if(this.src!=='${baseFallback}' && '${baseFallback}'){this.src='${baseFallback}';}else{this.onerror=null;this.src='${universalFallback}';}"`;

    let plateText = car.customPlate || car.plate || "ТРАНЗИТ";

    let patience = buyer.patience !== undefined ? buyer.patience : 4;
    let maxPatience = buyer.maxPatience || 4;
    let patiencePct = Math.round((patience / maxPatience) * 100);
    let patienceColor = patiencePct > 60 ? "color-green" : (patiencePct > 30 ? "color-amber" : "color-red");
    let progressBg = patiencePct > 60 ? "var(--green)" : (patiencePct > 30 ? "var(--amber)" : "var(--red)");

    let historyHtml = (buyer.dialogHistory || []).map(m => `
        <div class="chat-msg ${m.from === 'me' ? 'msg-player' : 'msg-seller'}" style="margin-bottom:6px;">
            ${m.text}
        </div>
    `).join('');

    let actionButtonsGrid = "";
    if (patience <= 0) {
        actionButtonsGrid = `
            <div class="p-2 mb-2 text-center" style="background:rgba(255,51,102,0.1); border-radius:10px; border:1px solid var(--red);">
                <b class="color-red text-xs block mb-1">🚫 ${isVIP ? 'VIP-КЛИЕНТ' : 'ПОКУПАТЕЛЬ'} УСТАЛ ОТ ТОРГА!</b>
                <div class="sub-label" style="font-size:9px;">Дальнейшие попытки сбить цену приведут к срыву сделки.</div>
            </div>
        `;
    } else {
        actionButtonsGrid = `
            <div class="grid-3 mb-2" style="gap:4px;">
                <button onclick="executeModalHaggleStep(3, 15)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                    <div class="font-bold color-green text-xs" style="font-size:9.5px;">+3% НА ДОРОГУ</div>
                    <div class="sub-label" style="font-size:7.5px;">РИСК: 15%</div>
                </button>

                <button onclick="executeModalHaggleStep(6, 35)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                    <div class="font-bold color-amber text-xs" style="font-size:9.5px;">+6% ПО ФАКТУ</div>
                    <div class="sub-label" style="font-size:7.5px;">РИСК: 35%</div>
                </button>

                <button onclick="executeModalHaggleStep(12, 65)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                    <div class="font-bold color-red text-xs" style="font-size:9.5px;">+12% ЖЕСТКО</div>
                    <div class="sub-label" style="font-size:7.5px;">РИСК: 65%</div>
                </button>
            </div>
        `;
    }

    const vipBanner = isVIP ? `
        <div class="p-2 mb-2 text-center" style="background:linear-gradient(90deg,rgba(255,215,0,0.15),rgba(255,179,0,0.08)); border-radius:10px; border:1px solid var(--amber);">
            <b class="text-xs color-amber"><i class="fa-solid fa-crown mr-1"></i> VIP-КЛИЕНТ ПО САРАФАННОМУ РАДИО</b>
            <div class="sub-label mt-1" style="font-size:8.5px; color:#fef3c7;">Этот клиент пришёл по рекомендации. Он платит щедро, если авто в порядке!</div>
        </div>
    ` : '';

    modal.innerHTML = `
        <div class="modal-box chat-deal-box" style="max-width:440px;">
            ${vipBanner}
            <div class="chat-header-bar flex-between mb-2">
                <div class="flex-gap" style="align-items:center;">
                    <div class="chat-avatar-circle" style="font-size:20px;">${buyer.avatar}</div>
                    <div>
                        <div class="font-bold text-xs">${buyer.name} ${isVIP ? '👑' : ''}</div>
                        <div class="text-xs color-green">● Личная встреча у капота</div>
                    </div>
                </div>
                <button onclick="closeModal('modalLotHoodDeal')" class="btn btn-dark btn-auto btn-sm">✕</button>
            </div>

            <div class="deal-car-preview-card mb-2">
                <img ${carImgAttrs} class="deal-car-thumb">
                <div style="flex:1;">
                    <div class="font-bold text-xs">${car.name}</div>
                    <div class="text-xs sub-label">Пробег: ${(car.mileage || 85000).toLocaleString()} км / Госномер: ${plateText}</div>
                    <div class="price-val text-xs color-green" id="modalLotDealPrice">${currentOffer.toLocaleString()} ₽</div>
                </div>
            </div>

            <div class="chat-thread-container mb-2" id="modalLotChatThread" style="max-height:160px; min-height:120px; overflow-y:auto; padding:8px;">
                ${historyHtml}
            </div>

            <div class="mb-2 p-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                <div class="flex-between text-xs mb-1" style="font-size:9.5px;">
                    <span>Терпение ${isVIP ? 'VIP-клиента' : 'покупателя'}:</span>
                    <b class="${patienceColor}">${patiencePct}% (${patience} попыток)</b>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                    <div style="width:${patiencePct}%; height:100%; background:${progressBg}; transition:width 0.3s ease;"></div>
                </div>
            </div>

            ${actionButtonsGrid}

            <div class="grid-2" style="gap:6px;">
                <button onclick="closeModal('modalLotHoodDeal')" class="btn btn-dark">
                    УЕХАТЬ 🚗
                </button>
                <button onclick="confirmLotHoodDKP()" class="btn btn-green font-bold">
                    ОФОРМИТЬ ДКП 🤝
                </button>
            </div>
        </div>
    `;

    const thread = document.getElementById('modalLotChatThread');
    if (thread) thread.scrollTop = thread.scrollHeight;
}

function executeModalHaggleStep(percent, failRisk) {
    if (!_isStateReady()) return;
    if (activeSalesLotHaggleIndex === null) return;
    const lot = state.salesLot[activeSalesLotHaggleIndex];
    if (!lot || !lot.buyer) return;

    const buyer = lot.buyer;
    const isVIP = !!buyer.isVIP;

    if (buyer.patience <= 0) return showToast("Покупатель больше не торгуется!");

    buyer.patience -= 1;
    if (!buyer.dialogHistory) buyer.dialogHistory = [];

    let actualRisk = failRisk;
    if (buyer.riskTolerance === 'high') actualRisk -= 10;
    if (buyer.riskTolerance === 'low') actualRisk += 15;
    if (isVIP) actualRisk += 20;

    let karma = state.player?.karma !== undefined ? state.player.karma : 50;
    let lvl = state.player?.level || 1;
    actualRisk = Math.max(5, Math.min(95, actualRisk - (lvl * 0.3) - ((karma - 50) * 0.2)));

    let roll = Math.random() * 100;
    buyer.dialogHistory.push({ from: 'me', text: `«Добавь +${percent}%, забирай прямо сейчас!»` });

    if (roll < actualRisk) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');

        if (buyer.patience <= 0 || roll < 10) {
            buyer.dialogHistory.push({ from: 'them', text: `«Ты надоел торговаться, сделки не будет!»` });
            showToast("🚫 Покупатель психанул и уехал!");
            lot.currentBuyer = null;
            lot.buyer = null;
            lot.timer = 50;
            lot.maxTimer = 50;
            lot._buyerTimerActive = false;
            removeDialogByCarIndex(activeSalesLotHaggleIndex);
            setTimeout(() => {
                if (typeof ModalManager !== 'undefined') ModalManager.close('modalLotHoodDeal');
                activeSalesLotHaggleIndex = null;
                renderSalesLot();
            }, 1200);
            saveState();
            return;
        } else {
            buyer.dialogHistory.push({ from: 'them', text: `«Никаких надбавок, цена и так край!»` });
            showToast("Покупатель отказался накидывать цену!");
        }
    } else {
        let currentOffer = buyer.currentOffer || buyer.offeredPrice || 100000;
        let raiseAmount = Math.round(currentOffer * (percent / 100));

        buyer.currentOffer = currentOffer + raiseAmount;
        buyer.offeredPrice = buyer.currentOffer;
        buyer.lastReply = `«По рукам. Накинул +${raiseAmount.toLocaleString()} ₽, оформляем?»`;
        buyer.dialogHistory.push({ from: 'them', text: `«По рукам. Накидываю +${raiseAmount.toLocaleString()} ₽, оформляем ДКП!»` });

        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`Успешный торг! Предложение выросло на +${raiseAmount.toLocaleString()} ₽`);
    }

    saveState();
    renderLotHoodHaggleModalContent();
    renderSalesLot();
}

function confirmLotHoodDKP() {
    if (activeSalesLotHaggleIndex === null) return;
    const idx = activeSalesLotHaggleIndex;
    if (typeof ModalManager !== 'undefined') ModalManager.close('modalLotHoodDeal');
    acceptLotBuyerDeal(idx);
}

function acceptLotBuyerDeal(idx) {
    if (!_isStateReady()) return;
    const lot = state.salesLot[idx];
    if (!lot) return;
    const buyer = lot.currentBuyer || lot.buyer;
    if (!buyer) return;

    const car = lot.car || lot;
    const finalPrice = buyer.currentOffer || buyer.offeredPrice;
    const purchaseCost = car.purchaseCost || Math.round(finalPrice * 0.75);
    const profit = finalPrice - purchaseCost;

    finishSalesLotDeal(idx, finalPrice, profit, purchaseCost);
}

function finishSalesLotDeal(idx, price, profit, costPrice = 0) {
    if (!_isStateReady()) return;
    const lot = state.salesLot[idx];
    if (!lot) return;

    if (lot._finishing) return;
    lot._finishing = true;

    try {
        const car = lot.car || lot;
        const buyer = lot.currentBuyer || lot.buyer;
        const isVIP = buyer && buyer.isVIP;
        const realCost = costPrice > 0 ? costPrice : (car.purchaseCost || Math.round(price * 0.75));

        state.player.cash = (state.player.cash || 0) + price;
        if (!state.player.stats) state.player.stats = {};
        state.player.stats.sold = (state.player.stats.sold || 0) + 1;
        state.player.stats.totalProfit = (state.player.stats.totalProfit || 0) + Math.max(0, profit);

        if (typeof addXp === 'function') addXp(isVIP ? 100 : 50);
        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Продажа авто на площадке${isVIP ? ' (VIP)' : ''}: ${car.name}`, price, true);
        }

        if (typeof trackQuestProgress === 'function') {
            trackQuestProgress('sell_car', 1);
        }

        if (window.EventBus) {
            window.EventBus.emit('saleslot:deal_completed', { car, price, profit });
        }

        if (window.FB_Bridge?.Plates && car.plate) {
            try {
                window.FB_Bridge.Plates.releasePlate(car.plate, null, false);
            } catch (e) {}
        }

        removeDialogByCarIndex(idx);
        _adjustHaggleIndexAfterRemoval(idx);

        state.salesLot.splice(idx, 1);
        shiftDialogIndicesAfterRemoval(idx);

        saveState();
        updateHeaderUI();
        renderSalesLot();

        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');

        if (typeof window.openCarSoldSuccessModal === 'function') {
            window.openCarSoldSuccessModal(car.name, price, profit, realCost);
        } else if (typeof openVerdictModal === 'function') {
            openVerdictModal(
                "АВТОМОБИЛЬ ПРОДАН! 🤝",
                `Машина «<b>${car.name}</b>» успешно передана новому владельцу!\nВыручка: +${price.toLocaleString()} ₽\nЧистая прибыль: +${profit.toLocaleString()} ₽`,
                true
            );
        }
    } finally {
        try { lot._finishing = false; } catch (e) {}
    }
}

function rejectLotBuyer(idx) {
    if (!_isStateReady()) return;
    const lot = state.salesLot[idx];
    if (!lot) return;

    removeDialogByCarIndex(idx);

    lot.currentBuyer = null;
    lot.buyer = null;
    lot.timer = 45;
    lot.maxTimer = 45;
    lot.buyerGenerationPending = false;
    lot._buyerTimerActive = false;

    if (activeSalesLotHaggleIndex === idx) {
        activeSalesLotHaggleIndex = null;
        try { if (typeof ModalManager !== 'undefined') ModalManager.close('modalLotHoodDeal'); } catch (e) {}
    }

    saveState();
    renderSalesLot();
    if (typeof playSound === 'function') playSound('tick');
    showToast("Покупателю отказано. Начат поиск следующего клиента!");
}

function openLotBuyerInNetworkM(idx) {
    if (!_isStateReady()) return;
    const lot = state.salesLot[idx];
    if (!lot) return;
    const buyer = lot.currentBuyer || lot.buyer;
    if (!buyer) return;

    const car = lot.car || lot;
    const safeCarName = String(car.name || 'car').replace(/[^a-zа-я0-9]/gi, '_');
    const dialogId = `dlg_buyer_slot_${idx}_${safeCarName}`;

    syncBuyerToMNetwork(lot, idx);

    if (typeof switchTab === 'function') switchTab('tabPhone');

    setTimeout(() => {
        if (typeof PhoneManager !== 'undefined') {
            PhoneManager.openApp('m');
        }

        setTimeout(() => {
            if (window.AppM && typeof window.AppM.openDialog === 'function') {
                window.AppM.openDialog(dialogId);
            }
        }, 120);
    }, 100);
}

function updateSalesLotTimers() {
    if (!_isStateReady()) return;
    if (!state.salesLot || state.salesLot.length === 0) return;

    const now = Date.now();
    const elapsedSeconds = Math.max(1, Math.floor((now - _lastSalesLotTickTimestamp) / 1000));
    _lastSalesLotTickTimestamp = now;

    let needReRender = false;

    for (let idx = state.salesLot.length - 1; idx >= 0; idx--) {
        const lot = state.salesLot[idx];
        if (!lot) continue;

        let hasBuyer = !!lot.currentBuyer || !!lot.buyer;

        if (!hasBuyer) {
            if (lot.buyerGenerationPending) continue;

            if (lot.timer > 0) {
                lot.timer = Math.max(0, lot.timer - elapsedSeconds);
                const textEl = document.getElementById(`lot_timer_text_${idx}`);
                const barEl = document.getElementById(`lot_progress_fill_${idx}`);
                if (textEl) textEl.innerText = `⏳ ${lot.timer}с`;
                if (barEl) {
                    let progressPct = Math.min(100, Math.max(0, Math.round(((lot.maxTimer - lot.timer) / lot.maxTimer) * 100)));
                    barEl.style.width = `${progressPct}%`;
                }
            } else {
                lot.buyerGenerationPending = true;
                try {
                    let car = lot.car || lot;
                    let askingPrice = lot.askingPrice || car.price || 100000;
                    lot.currentBuyer = generateRandomLotBuyer(car, askingPrice);
                    lot.buyer = lot.currentBuyer;
                    lot.buyerTimerLeft = 120;
                    lot._buyerTimerActive = true;
                    syncBuyerToMNetwork(lot, idx);
                    needReRender = true;
                } catch (e) {
                    lot.timer = 30;
                    lot.maxTimer = 30;
                    needReRender = true;
                } finally {
                    lot.buyerGenerationPending = false;
                }
            }
        } else {
            if (typeof lot.buyerTimerLeft !== 'number' || isNaN(lot.buyerTimerLeft)) {
                lot.buyerTimerLeft = 120;
            }

            if (lot._buyerTimerActive && lot.buyerTimerLeft > 0) {
                lot.buyerTimerLeft = Math.max(0, lot.buyerTimerLeft - elapsedSeconds);
                const buyerTimeText = document.getElementById(`lot_buyer_timer_${idx}`);
                if (buyerTimeText) buyerTimeText.innerText = `⏳ ${lot.buyerTimerLeft}с`;

                if (activeSalesLotHaggleIndex === idx) {
                    const modalTimerText = document.querySelector('#modalLotHoodDeal .sub-label .color-amber');
                    if (modalTimerText) modalTimerText.innerText = `⏳ ${lot.buyerTimerLeft}с`;
                }
            } else if (lot.buyerTimerLeft <= 0) {
                removeDialogByCarIndex(idx);

                lot.currentBuyer = null;
                lot.buyer = null;
                lot.timer = 50;
                lot.maxTimer = 50;
                lot.buyerGenerationPending = false;
                lot._buyerTimerActive = false;

                if (activeSalesLotHaggleIndex === idx) {
                    activeSalesLotHaggleIndex = null;
                    try { if (typeof ModalManager !== 'undefined') ModalManager.close('modalLotHoodDeal'); } catch (e) {}
                }

                needReRender = true;
            }
        }
    }

    if (needReRender) {
        saveState();
        renderSalesLot();
    }
}

function speedUpLotSearch(idx, type) {
    if (!_isStateReady()) return;
    const lot = state.salesLot[idx];
    if (!lot) return;

    if (type === 'ticket') {
        let t = state.player?.expressTickets || 0;
        if (t <= 0) return showToast("Нет экспресс-талонов!");
        state.player.expressTickets -= 1;
    } else if (type === 'stars') {
        let s = state.player?.stars || 0;
        if (s < 5) return showToast("Не хватает 5 Stars ⭐!");
        state.player.stars -= 5;
    }

    removeDialogByCarIndex(idx);

    let car = lot.car || lot;
    let askingPrice = lot.askingPrice || car.price || 100000;

    lot.timer = 0;
    lot.buyerGenerationPending = false;
    try {
        lot.currentBuyer = generateRandomLotBuyer(car, askingPrice);
        lot.buyer = lot.currentBuyer;
        lot.buyerTimerLeft = 120;
        lot._buyerTimerActive = true;
        syncBuyerToMNetwork(lot, idx);
    } catch (e) {
        lot.timer = 30;
        lot.maxTimer = 30;
    }

    saveState();
    updateHeaderUI();
    renderSalesLot();

    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    showToast("Покупатель найден!");
}

function reclaimCarFromLot(idx) {
    if (!_isStateReady()) return;
    const lot = state.salesLot[idx];
    if (!lot) return;

    const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
    if ((state.garage?.length || 0) >= maxSlots) {
        return showToast("В гараже нет свободного места!");
    }

    const car = lot.car || lot;
    if (!car) return;

    if (!state.garage) state.garage = [];
    state.garage.push(car);

    removeDialogByCarIndex(idx);
    _adjustHaggleIndexAfterRemoval(idx);

    state.salesLot.splice(idx, 1);
    shiftDialogIndicesAfterRemoval(idx);

    saveState();
    renderSalesLot();
    if (typeof renderGarage === 'function') renderGarage();
    if (typeof playSound === 'function') playSound('tick');
    showToast(`«${car.name}» возвращен в гараж.`);
}

// ========================================================
// ЭКСПОРТ
// ========================================================
window.getOrAssignLotCarImage = getOrAssignLotCarImage;
window.removeDialogByCarIndex = removeDialogByCarIndex;
window.shiftDialogIndicesAfterRemoval = shiftDialogIndicesAfterRemoval;
window.cleanupOrphanedDialogs = cleanupOrphanedDialogs;
window._adjustHaggleIndexAfterRemoval = _adjustHaggleIndexAfterRemoval;
window.getPlayerClubPerks = getPlayerClubPerks;
window.hasClubPerk = hasClubPerk;

window.renderSalesLot = renderSalesLot;
window.initSalesLotTimer = initSalesLotTimer;
window.updateSalesLotTimers = updateSalesLotTimers;
window.speedUpLotSearch = speedUpLotSearch;
window.reclaimCarFromLot = reclaimCarFromLot;
window.openLotHoodHaggleModal = openLotHoodHaggleModal;
window.renderLotHoodHaggleModalContent = renderLotHoodHaggleModalContent;
window.executeModalHaggleStep = executeModalHaggleStep;
window.confirmLotHoodDKP = confirmLotHoodDKP;
window.acceptLotBuyerDeal = acceptLotBuyerDeal;
window.finishSalesLotDeal = finishSalesLotDeal;
window.rejectLotBuyer = rejectLotBuyer;
window.openLotBuyerInNetworkM = openLotBuyerInNetworkM;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _startSalesLotTimerWhenReady);
} else {
    _startSalesLotTimerWhenReady();
}

console.log('[🏪 salesLot v3.7.0-hardcore] Перк синдиката [STS] (+6% сбыт) и синхронизация с M+ активированы ✓');

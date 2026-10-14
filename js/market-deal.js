// ========================================================
// js/market-deal.js — ТОРГ У КАПОТА 4.3.0 (v4.3.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v4.3.0:
//   - ДОБАВЛЕНА openDKPModal() — кнопка «Оформить ДКП» теперь работает
//   - ДОБАВЛЕНЫ confirmSignDKP() / abortDKPDeal() — обработчики модалки
//   - ФИКС _dealActionPending: больше не залипает при ошибках
//   - ФИКС двойного делегирования confirmMarketPurchaseSuccess
//   - Убрана «двойная» openRegistrationChoiceModal
//   - Показ РЕАЛЬНОЙ маржи (offerPrice - purchaseCost) в карточке торга
//   - Улучшенная формула шансов торга (интуитивная)
//   - Защита от двойного клика по кнопке «Подписать ДКП»
//   - Флаг __DKP_PENDING__ для модалки
// ========================================================

let pendingMarketCar = null;
let buyCallTimeoutTimer = null;
let _dealActionPending = false;

// ⭐ v4.3.0: защита от двойного клика внутри модалки ДКП
if (typeof window.__DKP_PENDING__ !== 'boolean') {
    window.__DKP_PENDING__ = false;
}

// ⭐ v4.3.0: активная сделка для модалки ДКП
let _activeDKPDeal = null;

// ========================================================
// ЗВОНОК ПРОДАВЦУ
// ========================================================
function initiateBuyMarketCar(carId) {
    if (buyCallTimeoutTimer) { clearTimeout(buyCallTimeoutTimer); buyCallTimeoutTimer = null; }
    if (!carId) return;

    // P2P лоты
    let p2pItem = (state.p2pMarketListings || []).find(l => l && l.id === carId);
    if (p2pItem) { openP2PDealModal(p2pItem.id); return; }

    const car = (state.marketFeed || []).find(c => c && c.id === carId);
    if (!car) { if (typeof showToast === 'function') showToast("Лот не найден."); return; }

    car.viewed = true;
    if (typeof renderMarketFeed === 'function') renderMarketFeed();

    const now = Date.now();
    if (car.cooldownUntil && car.cooldownUntil > now) {
        return showToast("Абонент всё ещё занят! Подождите.");
    }

    if (typeof setTxt === 'function') {
        setTxt("buyCallEmoji", "📞");
        setTxt("buyCallTitle", "Звонок продавцу...");
        setTxt("buyCallDesc", "Набираем номер... Идут гудки...");
    }

    const btnBox = document.getElementById("buyCallActionBtnBox");
    if (btnBox) btnBox.innerHTML = "<button class='btn btn-dark w-full' disabled>Гудки в трубке...</button>";

    ModalManager.open("modalBuyCall", { closeOthers: true });
    if (typeof tgHaptic === 'function') tgHaptic('light');

    buyCallTimeoutTimer = setTimeout(() => {
        let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
        let callSuccessChance = 75;
        if (karma > 65) callSuccessChance += 15;
        if (karma < 35) callSuccessChance -= 15;
        if (car.dealType === 'urgent' || car.isBeaterProject) callSuccessChance += 20;

        const roll = Math.random() * 100;

        if (roll < callSuccessChance) {
            ModalManager.close("modalBuyCall");
            showToast("🚗 Вы приехали по адресу и осматриваете машину у капота!");
            openMarketDeal(carId);
        } else if (roll < 92) {
            const waitSec = Math.floor(15 + Math.random() * 20);
            car.cooldownUntil = Date.now() + (waitSec * 1000);
            if (typeof setTxt === 'function') {
                setTxt("buyCallEmoji", "📵");
                setTxt("buyCallTitle", "Продавец занят");
                setTxt("buyCallDesc", "«Сейчас на работе, перезвоните через " + waitSec + " сек!»");
            }
            if (btnBox) btnBox.innerHTML = `<button onclick="ModalManager.close('modalBuyCall')" class='btn btn-dark w-full'>Понятно</button>`;
            if (typeof saveState === 'function') saveState();
            if (typeof renderMarketFeed === 'function') renderMarketFeed();
        } else {
            if (typeof setTxt === 'function') {
                setTxt("buyCallEmoji", "❌");
                setTxt("buyCallTitle", "Лот продан");
                setTxt("buyCallDesc", "«Только что приехали с задатком, машина ушла!»");
            }
            car.unavailable = true;
            if (typeof saveState === 'function') saveState();
            if (typeof renderMarketFeed === 'function') renderMarketFeed();
            if (btnBox) btnBox.innerHTML = `<button onclick="ModalManager.close('modalBuyCall')" class='btn btn-dark w-full'>Закрыть</button>`;
        }
    }, 700);
}

// ========================================================
// P2P ДИАЛОГ
// ========================================================
function openP2PDealModal(p2pId) {
    if (!p2pId) return;
    let p2pItem = (state.p2pMarketListings || []).find(l => l && l.id === p2pId);
    if (!p2pItem) return showToast("Лот не найден на бирже!");

    if (!state.player) state.player = {};
    if (!state.player.phoneMessages) state.player.phoneMessages = [];

    let dialogId = `p2p_deal_${p2pItem.id}`;
    let existingMsg = state.player.phoneMessages.find(m => m.id === dialogId);

    let askingPrice = p2pItem.price || 100000;
    let initialOffer = p2pItem.currentOffer || Math.round(askingPrice * 0.85);

    if (!existingMsg) {
        if ((p2pItem.type === 'car' || p2pItem.type === 'cars') && p2pItem.itemData) {
            if (typeof window.ensureCarIdentity === 'function') window.ensureCarIdentity(p2pItem.itemData);
        }

        existingMsg = {
            id: dialogId,
            category: 'p2p_market',
            sender: `${p2pItem.sellerName || 'Игрок P2P'}`,
            time: "Сейчас",
            unread: false,
            viewed: true,
            isP2PMarket: true,
            p2pId: p2pItem.id,
            carData: {
                name: p2pItem.name || 'Имущество P2P',
                img: p2pItem.itemData?.img || p2pItem.img || "assets/cars/economy/2101/vaz-2101.jpg",
                images: p2pItem.itemData?.images || [],
                type: p2pItem.type || 'economy',
                price: askingPrice
            },
            askingPrice: askingPrice,
            offerPrice: initialOffer,
            patience: p2pItem.patience !== undefined ? p2pItem.patience : 4,
            maxPatience: 4,
            chatHistory: [{ from: 'them', text: `«Здорово! Пишу по объявлению на «${p2pItem.name}». Готов обсудить условия.»` }]
        };
        state.player.phoneMessages.unshift(existingMsg);
    }

    if (typeof saveState === 'function') saveState();
    if (typeof switchTab === 'function') switchTab('tabPhone');
    setTimeout(() => {
        if (typeof PhoneManager !== 'undefined') PhoneManager.openApp('m');
        if (typeof AppM !== 'undefined') {
            AppM.activeTab = 'chats';
            AppM.activeDialogId = dialogId;
            let c = document.getElementById('phoneAppContainer');
            if (c && typeof AppM.render === 'function') AppM.render(c);
        }
    }, 100);
}

function paidCallMarketCar(carId) {
    if (!carId) return;
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < 1000) return showToast("Не хватает 1,000 ₽ на приоритетный дозвон!");
    state.player.cash -= 1000;

    const car = (state.marketFeed || []).find(c => c && c.id === carId);
    if (!car) return showToast("Лот уже снят с продажи!");

    car.cooldownUntil = 0;
    if (typeof saveState === 'function') saveState();
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    showToast("Приоритетный вызов успешен!");
    openMarketDeal(carId);
}

// ========================================================
// ВСТРЕЧА У КАПОТА
// ========================================================
function openMarketDeal(carId) {
    if (!carId) return;

    const car = (state.marketFeed || []).find(c => c && c.id === carId);
    if (!car) return showToast("Автомобиль недоступен!");

    pendingMarketCar = null;
    pendingMarketCar = { car: car, carId: carId };

    car.inspectedAtHood = true;
    if (typeof saveState === 'function') saveState();

    // Превью картинки
    const imgEl = document.getElementById("dealCarImg");
    if (imgEl) {
        let fallbackUrl = car.fallback || (typeof getCategoryFallback === 'function' ? getCategoryFallback(car.type) : '');
        let rawImg = car.img ? car.img : fallbackUrl;
        imgEl.src = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
        imgEl.onerror = () => { imgEl.src = fallbackUrl; };
        imgEl.style.width = "90px";
        imgEl.style.height = "62px";
        imgEl.style.objectFit = "cover";
    }

    if (typeof setTxt === 'function') {
        setTxt("dealCarTitle", car.name || "Автомобиль");
        setTxt("dealCarMileageInfo", `Пробег: ${(car.mileage || 0).toLocaleString()} км / Госномер: ${car.plate || "ТРАНЗИТ"}`);
        setTxt("dealCarPrice", `${(car.price || 0).toLocaleString()} ₽`);
    }

    // Продавец с архетипом
    const sellerAvatar = car.sellerMoodIcon || (['👨‍💼', '🧔', '😎', '👨‍🔧', '🧑‍💻', '👴'][Math.floor(Math.random() * 6)]);
    const sellerTitle = car.isP2PUserListing ? (car.sellerPlayerName || 'Игрок P2P') : `${sellerAvatar} Продавец`;
    pendingMarketCar.sellerName = sellerTitle;

    if (typeof setTxt === 'function') {
        setTxt("dealSellerAvatar", sellerAvatar);
        setTxt("dealSellerName", sellerTitle);
    }

    const thread = document.getElementById("dealChatThread");
    if (thread) {
        let greeting = car.sellerNote || "«Привет! Вот машина, осматривай, проверяй, можем прокатиться!»";
        let archetypeInfo = car.sellerArchetype ? ` <span style="font-size:9px; color:#94a3b8;">(${car.sellerArchetype})</span>` : '';
        thread.innerHTML = `
            <div class='chat-msg msg-seller'>${greeting}${archetypeInfo}</div>
            ${(car._revealedDefects && car._revealedDefects.length > 0) ? `
                <div class='chat-msg msg-seller' style='border-left:3px solid var(--amber); background:rgba(255,179,0,0.06);'>
                    <b class="color-amber" style="font-size:9.5px;">💡 Вы уже знаете о ${car._revealedDefects.length} дефектах этой машины!</b>
                    <div class="sub-label" style="font-size:9px; margin-top:2px;">Используйте их для аргументированного торга ↓</div>
                </div>
            ` : ''}
        `;
    }

    renderMarketHaggleControls();
    ModalManager.open("modalMarketDeal", { closeOthers: true });
    if (typeof playSound === 'function') playSound('tick');
}

// ========================================================
// ТЕСТ-ДРАЙВ
// ========================================================
function startMarketTestDrive(carId) {
    if (!pendingMarketCar || !pendingMarketCar.car) return;
    const car = pendingMarketCar.car;
    const thread = document.getElementById("dealChatThread");

    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('medium');

    car.testDriven = true;
    let driveResults = [];

    if (car.wear?.engine < 45) driveResults.push("Двигатель троит при нажатии в пол, ощущается потеря тяги.");
    else driveResults.push("Мотор крутится бодро, провалов и сизого дыма нет.");

    if (car.wear?.transmission < 50) driveResults.push("Коробка хрустит при включении второй передачи.");
    else driveResults.push("Сцепление схватывает чётко, передачи включаются плавно.");

    if (car.bodyThickness?.doors > 200 || car.bodyThickness?.hood > 200) driveResults.push("На кочках в салоне поскрипывает кузов.");

    if (thread) {
        thread.innerHTML += `
            <div class="chat-msg msg-player">«Давай сделаем тестовый заезд вокруг квартала.»</div>
            <div class="chat-msg msg-seller">«Без проблем, садись за руль!»</div>
            <div class="chat-msg msg-seller" style="border-left-color: var(--cyan);">
                <b>📋 Итоги тест-драйва:</b><br>
                ${driveResults.map(r => `• ${r}`).join('<br>')}
            </div>`;
        thread.scrollTop = thread.scrollHeight;
    }

    showToast("Тест-драйв проведён!");
    renderMarketHaggleControls();
    if (typeof saveState === 'function') saveState();
}

// ========================================================
// ПАНЕЛЬ ИНСТРУМЕНТОВ И КНОПОК ТОРГА
// ⭐ v4.3.0: показываем РЕАЛЬНУЮ маржу + улучшенные шансы торга
// ========================================================
function renderMarketHaggleControls() {
    const haggleArea = document.getElementById("dealHaggleArea");
    if (!haggleArea || !pendingMarketCar || !pendingMarketCar.car) return;

    const car = pendingMarketCar.car;
    const seller = (typeof SELLER_ARCHETYPES !== 'undefined' ? SELLER_ARCHETYPES : []).find(s => s.id === car.sellerArchetype) || null;

    let hasGauge = !!(state.player && state.player.tools && (state.player.tools.gauge || state.player.tools.gauge_pro));
    let hasScanner = !!(state.player && state.player.tools && (state.player.tools.obd || state.player.tools.obd_launch));
    const hasScrapYard = (state.businesses || []).some(b => b.id === 'razborka' && b.level > 0);

    let toolIcon = hasGauge ? "✓" : "🔒";
    let obdIcon = hasScanner ? "Launch ✓" : "🔒";

    let maxP = car.maxHagglePatience || 4;
    let curP = car.hagglePatience !== undefined ? car.hagglePatience : maxP;
    let patiencePct = Math.round((curP / maxP) * 100);
    let pColor = patiencePct > 60 ? "color-green" : (patiencePct > 30 ? "color-amber" : "color-red");
    let pBg = patiencePct > 60 ? "var(--green)" : (patiencePct > 30 ? "var(--amber)" : "var(--red)");

    const revealed = car._revealedDefects || [];
    const revealedLegal = car._revealedLegal || null;
    const mechDefects = (car.mechanicalDefects || []).filter(d => revealed.includes(d.id));

    let knownDiscountPct = 0;
    mechDefects.forEach(d => { knownDiscountPct += d.pricePenaltyPct || 0; });
    if (revealedLegal) {
        const ldef = (typeof LEGAL_DEFECTS !== 'undefined' ? LEGAL_DEFECTS : []).find(l => l.id === revealedLegal);
        if (ldef) knownDiscountPct += ldef.pricePenaltyPct || 0;
    }
    knownDiscountPct = Math.min(60, knownDiscountPct);

    // ⭐ v4.3.0: расчёт шанса успеха торга — упрощённый и интуитивный
    let karma = state.player?.karma !== undefined ? state.player.karma : 50;
    let lvl = state.player?.level || 1;
    const calcHaggleChance = (baseRisk) => {
        let risk = baseRisk;
        if (seller) {
            if (seller.id === 'panicker' || seller.id === 'honest_grandpa') risk -= 15;
            if (seller.id === 'cunning_perekup' || seller.id === 'criminal') risk += 15;
            if (seller.id === 'collector') risk += 20;
        }
        if (car.isBeaterProject) risk -= 15;
        if (car.dealType === 'urgent') risk -= 10;

        // ⭐ v4.3.0: понятный бонус от уровня и кармы
        const levelBonus = Math.min(15, Math.floor(lvl / 5));            // до +15% на 75+ уровне
        const karmaBonus = Math.round((karma - 50) * 0.15);              // ±7.5% при карме 0/100

        risk = risk - levelBonus - karmaBonus;
        risk = Math.max(5, Math.min(95, risk));
        return Math.round(100 - risk);
    };

    const chanceSoft = calcHaggleChance(12);
    const chanceMedium = calcHaggleChance(30);
    const chanceHard = calcHaggleChance(60);

    if (curP <= 0) {
        haggleArea.innerHTML = `
            <div class='text-center p-2 mb-2' style="background:rgba(255,51,102,0.1); border-radius:8px; border:1px solid var(--red);">
                <b class="color-red text-xs block mb-1">🚫 ПРОДАВЕЦ УСТАЛ ОТ ТОРГА И ЗАФИКСИРОВАЛ ЦЕНУ!</b>
                <div class="sub-label" style="font-size:9px;">Дальнейшие попытки сбить цену приведут к срыву встречи.</div>
            </div>
        `;
        return;
    }

    let inspectionToolsBlock = `
        <div class="grid-3 mb-2">
            <button onclick="openGaugeModal('${car.id}')" class="btn ${hasGauge ? 'btn-dark' : 'btn-dark opacity-50'} btn-sm">
                <i class="fa-solid fa-microchip color-cyan mr-1"></i> Толщиномер ${toolIcon}
            </button>
            <button onclick="quickOBDScanMarketCar('${car.id}')" class="btn ${hasScanner ? 'btn-dark' : 'btn-dark opacity-50'} btn-sm">
                <i class="fa-solid fa-tablet-screen-button color-cyan mr-1"></i> ${obdIcon}
            </button>
            <button onclick="startMarketTestDrive('${car.id}')" class="btn ${car.testDriven ? 'btn-dark opacity-50' : 'btn-cyan'} btn-sm">
                <i class="fa-solid fa-gauge-high mr-1"></i> ${car.testDriven ? 'Прокатились ✓' : 'Тест-драйв'}
            </button>
        </div>
        <button onclick="openInspectionChoiceModal('${car.id}')" class="btn btn-purple btn-sm w-full mb-2 font-bold">
            <i class="fa-solid fa-magnifying-glass-chart mr-1"></i> 🔍 Проверить авто (5 уровней)
        </button>
    `;

    let defectArgueBlock = '';
    if (mechDefects.length > 0 || revealedLegal) {
        defectArgueBlock = `
            <div class="p-2 mb-2" style="background:rgba(255,179,0,0.08); border-radius:8px; border:1px solid rgba(255,179,0,0.4);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber">💡 У вас есть ${mechDefects.length + (revealedLegal ? 1 : 0)} аргумент(ов)</b>
                    <span class="tag-badge bg-tag-amber">Потенциал: -${knownDiscountPct}%</span>
                </div>
                <div class="sub-label mb-2" style="font-size:9px;">Найденные дефекты, которые можно предъявить продавцу:</div>
                ${mechDefects.slice(0, 3).map(d => `
                    <div class="sub-label mb-1" style="font-size:9px; color:#f1f5f9;">
                        • <b>${d.name}</b> (-${d.pricePenaltyPct}% / ~${(d.cost || 0).toLocaleString()} ₽)
                    </div>
                `).join('')}
                ${mechDefects.length > 3 ? `<div class="sub-label" style="font-size:8.5px; color:#94a3b8;">... и ещё ${mechDefects.length - 3}</div>` : ''}
                ${revealedLegal ? `
                    <div class="sub-label mb-1 color-red" style="font-size:9px; margin-top:4px;">
                        ⚖️ <b>${(typeof LEGAL_DEFECTS !== 'undefined' ? LEGAL_DEFECTS : []).find(l => l.id === revealedLegal)?.name || 'Юр. проблема'}</b>
                    </div>
                ` : ''}

                <button onclick="argueKnownDefects('${car.id}')" class="btn btn-amber btn-sm w-full mt-2 font-bold">
                    <i class="fa-solid fa-bullhorn mr-1"></i> Предъявить дефекты (скидка до -${knownDiscountPct}%)
                </button>
            </div>
        `;
    }

    let scrapOptionBtn = '';
    if (hasScrapYard && (car.isStolen || car.isBeaterProject || (car.hiddenDefect && car.hiddenDefect.severity === "Критическая"))) {
        let scrapPrice = Math.round(car.price * 0.60);
        scrapOptionBtn = `
        <button onclick="buyCarDirectToScrapYard(${scrapPrice})" class="btn btn-danger btn-sm w-full mb-2">
            🔩 Выкупить под распил на Разборку (${scrapPrice.toLocaleString()} ₽ / -40%)
        </button>`;
    }

    let legalWarningBlock = '';
    if (revealedLegal) {
        const ldef = (typeof LEGAL_DEFECTS !== 'undefined' ? LEGAL_DEFECTS : []).find(l => l.id === revealedLegal);
        if (ldef) {
            legalWarningBlock = `
                <div class="p-2 mb-2" style="background:rgba(220,38,38,0.15); border-radius:8px; border:1.5px solid var(--red);">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-red">⚠️ ЮРИДИЧЕСКАЯ ПРОБЛЕМА</b>
                        <span class="tag-badge bg-tag-red">${ldef.severity}</span>
                    </div>
                    <div class="sub-label mb-1" style="font-size:9px;"><b>${ldef.name}</b> — ${ldef.desc}</div>
                    <div class="sub-label color-red" style="font-size:8.5px;">Последствие: ${ldef.consequence}</div>
                </div>
            `;
        }
    }

    // ⭐ v4.3.0: РЕАЛЬНАЯ МАРЖА — показываем игроку, заработает он или уйдёт в минус
    const basePrice = car.price || 0;
    const basePurchaseCost = car.baseMarketValue || Math.round(basePrice * 0.75);
    const baseMargin = basePrice - basePurchaseCost;
    const marginClass = baseMargin >= 0 ? 'color-green' : 'color-red';
    const marginIcon = baseMargin >= 0 ? '▲' : '▼';

    let realMarginBlock = `
        <div class="p-2 mb-2" style="background:rgba(0,242,254,0.05); border-radius:8px; border:1px solid rgba(0,242,254,0.3);">
            <div class="flex-between text-xs mb-1">
                <span class="sub-label" style="font-size:9px;">Оценка рынка:</span>
                <b class="color-cyan" style="font-size:10px;">${basePurchaseCost.toLocaleString()} ₽</b>
            </div>
            <div class="flex-between text-xs">
                <span class="sub-label" style="font-size:9px;">Маржа при текущей цене:</span>
                <b class="${marginClass}" style="font-size:11px;">${marginIcon} ${baseMargin >= 0 ? '+' : ''}${baseMargin.toLocaleString()} ₽</b>
            </div>
        </div>
    `;

    haggleArea.innerHTML = `
        ${legalWarningBlock}
        ${realMarginBlock}
        <div class="mb-2 p-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
            <div class="flex-between text-xs mb-1">
                <span>Терпение продавца${seller ? ` (${seller.name})` : ''}:</span>
                <b class="${pColor}">${patiencePct}% (${curP} попыток)</b>
            </div>
            <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                <div style="width:${patiencePct}%; height:100%; background: ${pBg}; transition:width 0.3s ease;"></div>
            </div>
        </div>

        ${inspectionToolsBlock}
        ${defectArgueBlock}
        ${scrapOptionBtn}

        <div class="grid-3 mb-1">
            <button onclick="attemptMarketHaggle(5, 12)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                <div class="font-bold color-green text-xs">-5% на дорогу</div>
                <div class="sub-label" style="font-size:8px;">Шанс: ${chanceSoft}%</div>
            </button>
            <button onclick="attemptMarketHaggle(10, 30)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                <div class="font-bold color-amber text-xs">-10% по факту</div>
                <div class="sub-label" style="font-size:8px;">Шанс: ${chanceMedium}%</div>
            </button>
            <button onclick="attemptMarketHaggle(18, 60)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                <div class="font-bold color-red text-xs">-18% жестко</div>
                <div class="sub-label" style="font-size:8px;">Шанс: ${chanceHard}%</div>
            </button>
        </div>`;
}

// ========================================================
// АРГУМЕНТЫ ПО НАЙДЕННЫМ ДЕФЕКТАМ
// ========================================================
function argueKnownDefects(carId) {
    if (!pendingMarketCar || !pendingMarketCar.car) return;
    const car = pendingMarketCar.car;
    const thread = document.getElementById("dealChatThread");

    const revealed = car._revealedDefects || [];
    const revealedLegal = car._revealedLegal || null;
    const mechDefects = (car.mechanicalDefects || []).filter(d => revealed.includes(d.id));

    if (mechDefects.length === 0 && !revealedLegal) {
        return showToast("Нет обнаруженных дефектов для предъявления!");
    }

    let totalDiscountPct = 0;
    mechDefects.forEach(d => { totalDiscountPct += d.pricePenaltyPct || 0; });
    let legalName = '';
    if (revealedLegal) {
        const ldef = (typeof LEGAL_DEFECTS !== 'undefined' ? LEGAL_DEFECTS : []).find(l => l.id === revealedLegal);
        if (ldef) {
            totalDiscountPct += ldef.pricePenaltyPct || 0;
            legalName = ldef.name;
        }
    }
    totalDiscountPct = Math.min(60, totalDiscountPct);

    const seller = (typeof SELLER_ARCHETYPES !== 'undefined' ? SELLER_ARCHETYPES : []).find(s => s.id === car.sellerArchetype);
    let agreeChance = 0.55;
    if (seller) {
        if (seller.id === 'honest_grandpa' || seller.id === 'collector') agreeChance = 0.85;
        if (seller.id === 'panicker') agreeChance = 0.90;
        if (seller.id === 'cunning_perekup') agreeChance = 0.35;
        if (seller.id === 'criminal') agreeChance = 0.30;
        if (seller.id === 'pensioner') agreeChance = 0.70;
    }
    const karma = state.player?.karma || 50;
    agreeChance += (karma - 50) * 0.003;
    agreeChance = Math.max(0.15, Math.min(0.95, agreeChance));

    car.hagglePatience = Math.max(0, (car.hagglePatience || 1) - 1);

    if (Math.random() < agreeChance) {
        const discountAmount = Math.round(car.price * (totalDiscountPct / 100));
        car.price = Math.max(10000, car.price - discountAmount);
        if (typeof setTxt === 'function') setTxt("dealCarPrice", `${car.price.toLocaleString()} ₽`);

        let playerPhrase = `«Я проверил машину экспертизой. Нашёл проблем: ${mechDefects.length}${revealedLegal ? ' + юридическая' : ''}. Скидывай -${totalDiscountPct}%!»`;
        if (typeof DIALOGUES_DATABASE !== 'undefined' && DIALOGUES_DATABASE.playerHagglePhrases) {
            const phrases = DIALOGUES_DATABASE.playerHagglePhrases;
            playerPhrase = phrases[Math.floor(Math.random() * phrases.length)](totalDiscountPct);
        }

        let sellerPhrase = `«Ладно, твоя взяла. Скидываю ${discountAmount.toLocaleString()} ₽ за найденные косяки!»`;
        if (revealedLegal && legalName) {
            sellerPhrase = `«По ${legalName} — согласен, проблема серьёзная. Уступаю ${discountAmount.toLocaleString()} ₽!»`;
        }

        if (thread) {
            thread.innerHTML += `
                <div class="chat-msg msg-player">${playerPhrase}</div>
                <div class="chat-msg msg-seller" style="border-left-color:var(--green);">
                    ${sellerPhrase} <b class="color-green">(-${totalDiscountPct}%)</b>
                </div>`;
            thread.scrollTop = thread.scrollHeight;
        }

        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`✅ Продавец согласился! Скидка -${totalDiscountPct}%`);
    } else {
        let sellerPhrase = `«Все машины с косяками, за это скидок не даю. Цена окончательная!»`;
        if (seller && seller.id === 'cunning_perekup') sellerPhrase = `«Слышал я эти байки. Всё в порядке с машиной, не морочь голову!»`;
        if (seller && seller.id === 'criminal') sellerPhrase = `«Э, ты чё мне тут предъявляешь? Какие ещё дефекты? Или по-хорошему, или до свидания.»`;
        if (seller && seller.id === 'collector') sellerPhrase = `«На этой машине косяки — это история. За неё цену не скидывают.»`;

        if (thread) {
            thread.innerHTML += `
                <div class="chat-msg msg-player">«Нашёл у машины ${mechDefects.length} дефектов! Скидывай цену!»</div>
                <div class="chat-msg msg-seller" style="border-left-color:var(--red); color:#fca5a5;">
                    ${sellerPhrase}
                </div>`;
            thread.scrollTop = thread.scrollHeight;
        }

        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');
        showToast("Продавец отказался признавать дефекты!");
    }

    renderMarketHaggleControls();
    if (typeof saveState === 'function') saveState();
}

// ========================================================
// ВЫКУП ПОД РАСПИЛ
// ========================================================
function buyCarDirectToScrapYard(price) {
    if (!pendingMarketCar || !pendingMarketCar.car) return;
    const car = pendingMarketCar.car;
    let cash = state.player?.cash || 0;
    if (cash < price) return showToast("Не хватает денег на выкуп!");

    state.player.cash -= price;
    let salvageYield = Math.round(price * (1.35 + Math.random() * 0.25));
    let gainedXp = 50;

    if (state.businesses) {
        let razborka = state.businesses.find(b => b.id === 'razborka');
        if (razborka) {
            razborka.stock = Math.min(razborka.maxStock || 100, (razborka.stock || 0) + 40);
            razborka.stored = (razborka.stored || 0) + (salvageYield - price);
        }
    }

    if (typeof addXp === 'function') addXp(gainedXp);
    car.unavailable = true;

    ModalManager.close("modalMarketDeal");
    if (typeof saveState === 'function') saveState();
    if (typeof updateHeaderUI === 'function') updateHeaderUI();
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');

    if (typeof openVerdictModal === 'function') {
        openVerdictModal(
            "РАСПИЛЕН НА РАЗБОРКЕ! 🔩",
            `Автомобиль «${car.name}» доставлен на авторазборку!\nЧистая прибыль с запчастей: +${(salvageYield - price).toLocaleString()} ₽\nЗапас сырья пополнен (+40%).`,
            true,
            salvageYield
        );
    }

    pendingMarketCar = null;
}

// ========================================================
// ТОРГ ПО ПРОЦЕНТАМ
// ========================================================
function attemptMarketHaggle(percent, failRisk = 25) {
    if (!pendingMarketCar || !pendingMarketCar.car) return showToast("Машина недоступна!");

    const car = pendingMarketCar.car;
    if (car.hagglePatience <= 0) return showToast("Продавец больше не торгуется!");

    car.hagglePatience -= 1;
    const thread = document.getElementById("dealChatThread");

    let actualRisk = failRisk;

    const seller = (typeof SELLER_ARCHETYPES !== 'undefined' ? SELLER_ARCHETYPES : []).find(s => s.id === car.sellerArchetype);
    if (seller) {
        if (seller.id === 'panicker' || seller.id === 'honest_grandpa') actualRisk -= 15;
        if (seller.id === 'cunning_perekup' || seller.id === 'criminal') actualRisk += 15;
        if (seller.id === 'collector') actualRisk += 20;
    }
    if (car.isBeaterProject) actualRisk -= 15;
    if (car.dealType === 'urgent') actualRisk -= 10;

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
    let lvl = (state.player && state.player.level) ? state.player.level : 1;

    // ⭐ v4.3.0: та же формула, что и в подсказках
    const levelBonus = Math.min(15, Math.floor(lvl / 5));
    const karmaBonus = Math.round((karma - 50) * 0.15);
    actualRisk = actualRisk - levelBonus - karmaBonus;
    actualRisk = Math.max(5, Math.min(95, actualRisk));

    let roll = Math.random() * 100;

    if (roll < actualRisk) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');

        if (car.hagglePatience <= 0 || roll < 12) {
            if (thread) {
                thread.innerHTML += `
                    <div class="chat-msg msg-player">«Скидывай ${percent}%, у меня деньги на руках!»</div>
                    <div class="chat-msg msg-seller" style="border-left-color:var(--red);">«Ты надоел торговаться, машина снята с продажи! Я поехал.»</div>
                `;
                thread.scrollTop = thread.scrollHeight;
            }
            car.unavailable = true;
            showToast("🚫 Продавец психанул, сел в машину и уехал!");
            setTimeout(() => {
                ModalManager.close("modalMarketDeal");
                if (typeof renderMarketFeed === 'function') renderMarketFeed();
            }, 1200);
            pendingMarketCar = null;
            return;
        } else {
            if (thread) {
                let failReplies = [
                    "«Никаких скидок, цена и так по низу рынка!»",
                    "«Не устраивает цена — ищи другой вариант.»",
                    "«Ты надоел торговаться, больше ни копейки!»"
                ];
                let reply = failReplies[Math.floor(Math.random() * failReplies.length)];
                thread.innerHTML += `
                    <div class="chat-msg msg-player">«Скидывай ${percent}%!»</div>
                    <div class="chat-msg msg-seller">${reply}</div>`;
                thread.scrollTop = thread.scrollHeight;
            }
            showToast("Продавец отказался снижать цену!");
        }
    } else {
        let disc = Math.round(car.price * (percent / 100));
        car.price = Math.max(10000, car.price - disc);
        if (typeof setTxt === 'function') setTxt("dealCarPrice", `${car.price.toLocaleString()} ₽`);

        if (thread) {
            thread.innerHTML += `
                <div class="chat-msg msg-player">«Скинь ${percent}%, забираю сейчас!»</div>
                <div class="chat-msg msg-seller" style="border-left-color:var(--green);">«По рукам. Уступаю ${disc.toLocaleString()} ₽, оформляем!»</div>`;
            thread.scrollTop = thread.scrollHeight;
        }
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`Успешный торг! Скинуто -${disc.toLocaleString()} ₽`);
    }

    renderMarketHaggleControls();
    if (typeof saveState === 'function') saveState();
}

// ========================================================
// МОДАЛКА ВЫБОРА РЕГИСТРАЦИИ (МРЭО vs ДКП)
// ⭐ v4.3.0: восстановлена как полноценная функция
// ========================================================
function openRegistrationChoiceModal(deal) {
    if (!deal || !deal.car) return showToast("Ошибка данных сделки");

    _activeDKPDeal = deal;

    // Открываем модалку из index.html
    ModalManager.open('modalRegistrationChoice', { closeOthers: true });
    if (typeof playSound === 'function') playSound('tick');
}

function confirmRegistrationChoice(registerOnPlayer) {
    if (!_activeDKPDeal) return showToast("Ошибка: сделка потеряна");

    ModalManager.close('modalRegistrationChoice');

    _activeDKPDeal.isRegisteredOnPlayer = !!registerOnPlayer;

    if (registerOnPlayer) {
        // Списываем госпошлину
        const gosposhlina = 2850;
        if ((state.player.cash || 0) < gosposhlina) {
            showToast(`Не хватает ${gosposhlina} ₽ на госпошлину!`);
            return;
        }
        state.player.cash -= gosposhlina;
        if (typeof logBankTransaction === 'function') {
            logBankTransaction('Госпошлина МРЭО', gosposhlina, false);
        }
        showToast("✅ Автомобиль оформлен в МРЭО (-2,850 ₽)");
    } else {
        showToast("📄 Автомобиль оставлен на ДКП (10 дней на оформление)");
    }

    finishMarketCarBuyProcess(_activeDKPDeal);
}

// ========================================================
// МОДАЛКА ДКП (открывается при покупке или продаже)
// ⭐ v4.3.0: ДОБАВЛЕНА — раньше вызывалась, но не была определена
// ========================================================
function openDKPModal(deal) {
    if (!deal || !deal.car) {
        return showToast("❌ Ошибка: данные сделки потеряны");
    }

    // Защита от повторного открытия
    if (window.__DKP_PENDING__) {
        console.log('[DKP] Модалка уже открыта, игнорируем повторный вызов');
        return;
    }
    window.__DKP_PENDING__ = true;

    _activeDKPDeal = deal;

    const car = deal.car;
    const price = deal.price || car.price || 0;
    const buyerName = deal.buyer || (state.player?.name) || "Перекуп #777";
    const sellerName = deal.seller || "Продавец";

    // Заполняем бланк
    if (typeof setTxt === 'function') {
        setTxt('dkpSellerName', sellerName);
        setTxt('dkpBuyerName', buyerName);
        setTxt('dkpCarTitle', car.name || "Автомобиль");
        setTxt('dkpCarSpecs', `Мощность: ${car.power || 100} л.с. | Пробег: ${(car.mileage || 0).toLocaleString()} км`);
        setTxt('dkpCarPlate', car.customPlate || car.plate || "ТРАНЗИТ");
        setTxt('dkpPriceAmount', `${price.toLocaleString()} ₽`);
    }

    // Показываем чистую прибыль (для продажи)
    const profitEl = document.getElementById('dkpNetProfitBadge');
    if (profitEl && deal.type === 'sale') {
        const purchaseCost = car.purchaseCost || Math.round(price * 0.75);
        const profit = price - purchaseCost;
        profitEl.style.display = 'block';
        if (profit > 0) {
            profitEl.className = 'text-xs text-center font-bold mb-2 color-green';
            profitEl.innerText = `Чистая прибыль: +${profit.toLocaleString()} ₽ 📈`;
        } else if (profit < 0) {
            profitEl.className = 'text-xs text-center font-bold mb-2 color-red';
            profitEl.innerText = `Убыток: ${profit.toLocaleString()} ₽ 📉`;
        } else {
            profitEl.className = 'text-xs text-center font-bold mb-2 color-amber';
            profitEl.innerText = `Сделка в ноль`;
        }
    } else if (profitEl) {
        profitEl.style.display = 'none';
    }

    // Кнопка подписи активна, кнопка закрытия скрыта
    const btnSign = document.getElementById('btnSignDKP');
    const btnAbort = document.getElementById('btnAbortDKP');
    const btnClose = document.getElementById('btnCloseDKP');
    if (btnSign) btnSign.style.display = 'block';
    if (btnAbort) btnAbort.style.display = 'block';
    if (btnClose) btnClose.style.display = 'none';

    // Сброс штампа
    const stamp = document.getElementById('dkpOfficialStamp');
    if (stamp) stamp.classList.remove('stamp-approved');
    if (typeof setTxt === 'function') setTxt('dkpBuyerSig', '✍️ Ожидает...');

    ModalManager.open('modalDKP', { closeOthers: true });
    if (typeof playSound === 'function') playSound('tick');
}

// ========================================================
// ПОДПИСАНИЕ ДКП
// ⭐ v4.3.0: корректный вызов finishMarketCarBuyProcess / finishSalesLotDeal
// ========================================================
function confirmSignDKP() {
    if (!_activeDKPDeal) {
        showToast("❌ Ошибка: сделка потеряна");
        ModalManager.close('modalDKP');
        window.__DKP_PENDING__ = false;
        return;
    }

    const deal = _activeDKPDeal;

    // Показываем штамп
    const stamp = document.getElementById('dkpOfficialStamp');
    if (stamp) stamp.classList.add('stamp-approved');
    if (typeof setTxt === 'function') setTxt('dkpBuyerSig', '✓ Подписано');

    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');

    // Даём 800мс на анимацию штампа, потом закрываем
    setTimeout(() => {
        ModalManager.close('modalDKP');

        const type = deal.type;

        if (type === 'buy') {
            // Покупка на рынке
            finishMarketCarBuyProcess(deal);
        } else if (type === 'sale') {
            // Продажа на площадке
            const idx = deal.lotIndex;
            if (idx !== undefined && typeof finishSalesLotDeal === 'function') {
                finishSalesLotDeal(idx, deal.price, deal.profit);
            } else {
                showToast("❌ Ошибка: не удалось завершить сделку");
            }
        } else {
            showToast("❌ Неизвестный тип сделки");
        }

        _activeDKPDeal = null;
        window.__DKP_PENDING__ = false;
    }, 900);
}

// ========================================================
// ОТМЕНА ДКП
// ========================================================
function abortDKPDeal() {
    if (!confirm("Разорвать сделку? Все изменения будут отменены.")) return;

    ModalManager.close('modalDKP');
    _activeDKPDeal = null;
    window.__DKP_PENDING__ = false;
    pendingMarketCar = null;

    showToast("Сделка разорвана.");
    if (typeof playSound === 'function') playSound('error');
}

// ========================================================
// ЗАВЕРШЕНИЕ ПОКУПКИ
// ⭐ v4.3.0: улучшенная защита от двойного клика и информативные ошибки
// ========================================================
function finishMarketCarBuyProcess(deal) {
    if (_dealActionPending) {
        console.log('[Market] finishMarketCarBuyProcess проигнорирован — операция в процессе');
        return;
    }
    if (!deal || !deal.carId) return;

    _dealActionPending = true;

    try {
        const car = deal.car;
        const carId = deal.carId;
        const price = deal.price;

        // Проверка слотов гаража
        const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
        const currentSlots = state.garage ? state.garage.length : 0;
        if (currentSlots >= maxSlots) {
            showToast(`🚫 Гараж полон! (${currentSlots}/${maxSlots} мест). Продайте машину или купите бокс.`);
            return;
        }

        // Проверка, что лот ещё активен
        const liveCarIndex = (state.marketFeed || []).findIndex(c => c && c.id === carId);
        if (liveCarIndex === -1) {
            showToast("❌ Лот уже снят с продажи или куплен другим игроком!");
            pendingMarketCar = null;
            if (typeof renderMarketFeed === 'function') renderMarketFeed();
            return;
        }

        // Проверка денег
        const cash = state.player?.cash || 0;
        if (cash < price) {
            showToast(`💸 Не хватает ${(price - cash).toLocaleString()} ₽!`);
            return;
        }

        state.player.cash -= price;
        if (!state.player.stats) state.player.stats = {};
        state.player.stats.bought = (state.player.stats.bought || 0) + 1;
        if (!state.garage) state.garage = [];

        const newCar = Object.assign({}, car);
        newCar.customPlate = car.plate;
        newCar.impounded = false;
        newCar.unregistered = false;
        newCar.insurance = null;
        newCar.purchaseCost = price;
        newCar.wear = car.wear ? car.wear : { engine: 85, transmission: 85 };
        newCar.isPersonal = false;
        newCar.isRegisteredOnPlayer = !!deal.isRegisteredOnPlayer;
        newCar.ownershipDays = 0;
        newCar.engineTemp = 90;
        newCar.tireWear = car.tireWear !== undefined ? car.tireWear : 100;
        newCar.tuning = car.tuning || {
            chip: 0, exhaust: false, stance: false, bodykit: false,
            rollCage: false, dragSlicks: false, hydroHandbrake: false,
            weldedDiff: false, steeringAngle: false, bucketSeats: false,
            customWheels: false, risk1251: 0
        };

        newCar.images = Array.isArray(car.images) && car.images.length > 0
            ? [...car.images]
            : (car.img ? [car.img] : []);
        if (!newCar.img && newCar.images.length > 0) newCar.img = newCar.images[0];

        if (typeof window.ensureCarIdentity === 'function') window.ensureCarIdentity(newCar);

        newCar.mechanicalDefects = car.mechanicalDefects || [];
        newCar.legalDefect = car.legalDefect || null;
        newCar._revealedDefects = car._revealedDefects || [];
        newCar._revealedLegal = car._revealedLegal || null;
        newCar.sellerArchetype = car.sellerArchetype || null;

        if (car.legalDefect && !car._legalResolved) {
            newCar._backfireDay = (state.player.day || 1) + 3 + Math.floor(Math.random() * 4);
            newCar._backfireType = car.legalDefect.id;
        }

        if (typeof recalculateCarMarketValue === 'function') recalculateCarMarketValue(newCar);

        state.garage.push(newCar);
        state.marketFeed = (state.marketFeed || []).filter(c => c && c.id !== carId);
        state.marketFeedVersion = (state.marketFeedVersion || 0) + 1;

        pendingMarketCar = null;

        if (typeof addXp === 'function') addXp(40);
        if (typeof trackQuestProgress === 'function') trackQuestProgress('buy_car', 1);

        if (typeof logBankTransaction === 'function') logBankTransaction(`Покупка авто: ${car.name}`, price, false);

        let msg = `✅ ${car.name} куплен за ${price.toLocaleString()} ₽!`;
        if (car.legalDefect) msg += ` ⚠️ Есть юридическая проблема (см. в гараже)`;
        showToast(msg);
        if (typeof spawnFloatingReward === 'function') spawnFloatingReward(`-${price.toLocaleString()} ₽`);

        if (typeof saveState === 'function') saveState();
        if (typeof renderMarketFeed === 'function') renderMarketFeed();
        if (typeof renderGarage === 'function') renderGarage();
        setTimeout(() => { if (typeof switchTab === 'function') switchTab("tabGarage"); }, 400);
    } finally {
        _dealActionPending = false;
    }
}

// ========================================================
// АВТО-ВЫКУП ИЗ КАРТОЧКИ (кнопка «Оформить ДКП»)
// ⭐ v4.3.0: обёрнуто в try/finally — флаг _dealActionPending больше не залипает
// ========================================================
function confirmMarketPurchaseSuccess() {
    if (_dealActionPending) {
        console.log('[Market] confirmMarketPurchaseSuccess проигнорирован — операция в процессе');
        return;
    }

    _dealActionPending = true;

    try {
        if (!pendingMarketCar) {
            showToast("❌ Машина недоступна. Попробуйте заново.");
            return;
        }

        const car = pendingMarketCar.car;
        if (!car) {
            showToast("❌ Данные о машине потеряны.");
            pendingMarketCar = null;
            return;
        }

        // Проверка слотов
        const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
        let currentSlots = state.garage ? state.garage.length : 0;
        if (currentSlots >= maxSlots) {
            showToast(`🚫 Гараж полон! (${currentSlots}/${maxSlots} мест). Продайте машину или купите бокс.`);
            return;
        }

        // Проверка денег
        let cash = (state.player && state.player.cash) ? state.player.cash : 0;
        let price = car.price ? car.price : 0;
        if (cash < price) {
            showToast(`💸 Не хватает ${(price - cash).toLocaleString()} ₽! Нужно: ${price.toLocaleString()} ₽`);
            return;
        }

        // Проверка, что лот не продан
        if (car.unavailable) {
            showToast("❌ Этот лот уже продан!");
            return;
        }

        ModalManager.close("modalMarketDeal");

        const deal = {
            type: 'buy',
            carId: car.id,
            car: car,
            seller: pendingMarketCar.sellerName || "Продавец",
            buyer: (state.player && state.player.name) ? state.player.name : "Перекуп #777",
            price: price,
            isRegisteredOnPlayer: false
        };

        // ⭐ v4.3.0: теперь openRegistrationChoiceModal определена локально
        openRegistrationChoiceModal(deal);
    } finally {
        _dealActionPending = false;
    }
}

// ========================================================
// ⭐ v4.1.0: BACKFIRE — ПРЕТЕНЗИЯ ПОКУПАТЕЛЯ ЧЕРЕЗ N ДНЕЙ
// ========================================================
function _triggerBuyerBackfire(car, idx) {
    if (!car) return;
    const type = car._backfireType;
    const cash = state.player?.cash || 0;

    let penaltyCash = 80000;
    let description = "Покупатель машины подал в суд по скрытой проблеме!";
    let canResolveViaReshala = true;
    let reshalaCostConn = 2;

    if (typeof LEGAL_DEFECTS !== 'undefined') {
        const ldef = LEGAL_DEFECTS.find(l => l.id === type);
        if (ldef) {
            penaltyCash = ldef.penaltyCash || 150000;
            description = ldef.consequence || description;
            canResolveViaReshala = ldef.canResolveViaReshala;
            reshalaCostConn = ldef.reshalaCostConn || 2;
        }
    }

    let modal = document.getElementById('modalBackfire');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalBackfire';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-box text-center" style="max-width:410px; border-color:var(--red);">
            <div class="radar-spinner-ring mb-2" style="border-top-color:var(--red);">
                <div class="radar-spinner-center" style="font-size:26px;">⚠️</div>
            </div>
            <div class="modal-glow-badge mb-2" style="color:var(--red); border-color:var(--red);">ПРЕТЕНЗИЯ ПОКУПАТЕЛЯ</div>
            <h3 class="font-bold mb-2 color-red" style="font-size:13px;">${car.name}</h3>
            <div class="sub-label mb-3" style="font-size:10.5px; line-height:1.35;">${description}</div>

            <div class="p-2 mb-3" style="background:rgba(220,38,38,0.1); border-radius:8px;">
                <b class="color-red text-xs">Штраф: ${penaltyCash.toLocaleString()} ₽</b>
                <div class="sub-label mt-1" style="font-size:8.5px;">Оплатить или решить через Решалу</div>
            </div>

            <div class="space-y-2">
                ${canResolveViaReshala && (state.player.connections || 0) >= reshalaCostConn ? `
                    <button onclick="resolveBackfire('${car.id}', 'reshala')" class="btn btn-purple w-full font-bold">
                        🤝 Решить через Решалу (${reshalaCostConn} связей)
                    </button>
                ` : ''}
                <button onclick="resolveBackfire('${car.id}', 'pay')" class="btn btn-amber w-full" ${cash < penaltyCash ? 'disabled' : ''}>
                    💸 Оплатить штраф (${penaltyCash.toLocaleString()} ₽)
                </button>
                <button onclick="resolveBackfire('${car.id}', 'ignore')" class="btn btn-danger w-full">
                    🚫 Игнорировать (карма -15, штраф вырастет)
                </button>
            </div>
        </div>
    `;
    ModalManager.open('modalBackfire', { closeOthers: true });
    if (typeof playSound === 'function') playSound('error');
    if (typeof tgHaptic === 'function') tgHaptic('error');
}

function resolveBackfire(carId, action) {
    const car = (state.garage || []).find(c => c && c.id === carId);
    if (!car) {
        // ⭐ v4.3.0: не теряем модалку, если машина уже продана
        ModalManager.close('modalBackfire');
        return showToast("Машина уже не в гараже.");
    }

    const type = car._backfireType;
    let ldef = (typeof LEGAL_DEFECTS !== 'undefined') ? LEGAL_DEFECTS.find(l => l.id === type) : null;
    let penaltyCash = ldef ? (ldef.penaltyCash || 150000) : 80000;
    let reshalaCostConn = ldef ? (ldef.reshalaCostConn || 2) : 2;

    if (action === 'reshala') {
        if ((state.player.connections || 0) < reshalaCostConn) return showToast("Не хватает связей!");
        state.player.connections -= reshalaCostConn;
        showToast(`🤝 Решала уладил вопрос! (-${reshalaCostConn} связей)`);
    } else if (action === 'pay') {
        if ((state.player.cash || 0) < penaltyCash) return showToast("Не хватает денег!");
        state.player.cash -= penaltyCash;
        if (typeof logBankTransaction === 'function') logBankTransaction(`Штраф по претензии: ${car.name}`, penaltyCash, false);
        showToast(`💸 Штраф оплачен: -${penaltyCash.toLocaleString()} ₽`);
    } else if (action === 'ignore') {
        state.player.karma = Math.max(0, (state.player.karma || 50) - 15);
        car._backfireResolved = false;
        car._backfireDay = (state.player.day || 1) + 3;
        showToast(`🚫 Вы проигнорировали. Карма -15, штраф вырастет через 3 дня.`);
    }

    car._legalResolved = true;
    if (typeof saveState === 'function') saveState();
    if (typeof updateHeaderUI === 'function') updateHeaderUI();
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    ModalManager.close('modalBackfire');
}

// ========================================================
// ЭКСПОРТ
// ========================================================
Object.assign(window, {
    initiateBuyMarketCar,
    openP2PDealModal,
    paidCallMarketCar,
    openMarketDeal,
    startMarketTestDrive,
    renderMarketHaggleControls,
    buyCarDirectToScrapYard,
    attemptMarketHaggle,
    argueKnownDefects,
    confirmMarketPurchaseSuccess,
    finishMarketCarBuyProcess,
    openRegistrationChoiceModal,
    confirmRegistrationChoice,
    openDKPModal,
    confirmSignDKP,
    abortDKPDeal,
    _triggerBuyerBackfire,
    resolveBackfire
});

window.getPendingMarketCar = () => pendingMarketCar;
window.resetPendingMarketCar = () => { pendingMarketCar = null; _dealActionPending = false; };
window.resetDKPPending = () => { window.__DKP_PENDING__ = false; _activeDKPDeal = null; };

console.log('[🤝 market-deal v4.3.0] ФИКС кнопки ДКП + openDKPModal + confirmSignDKP + защита от залипания ✓');
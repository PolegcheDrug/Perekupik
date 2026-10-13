// ========================================================
// js/market-deal.js — ЗВОНКИ, ВСТРЕЧА У КАПОТА И ТОРГ (v3.6.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ПОЛНЫЙ ФАЙЛ БЕЗ СОКРАЩЕНИЙ.
// Интеграция P2P биржи и звонков в единое окно чата/торга M+
// ========================================================

let pendingMarketCar = null;
let buyCallTimeoutTimer = null;

function initiateBuyMarketCar(carId) {
    if (buyCallTimeoutTimer) {
        clearTimeout(buyCallTimeoutTimer);
        buyCallTimeoutTimer = null;
    }

    // Проверяем, это лот с P2P биржи (state.p2pMarketListings) или обычный рынок (state.marketFeed)
    let p2pItem = (state.p2pMarketListings || []).find(l => l && l.id === carId);
    if (p2pItem) {
        // Открываем точно такой же интерфейс чата/торга как в M+ Hub для P2P лотов
        openP2PDealModal(p2pItem);
        return;
    }

    const carIndex = (state.marketFeed || []).findIndex(c => c && c.id === carId);
    if (carIndex === -1) return;
    const car = state.marketFeed[carIndex];
    car.viewed = true;
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
    const now = Date.now();
    
    if (car.cooldownUntil && car.cooldownUntil > now) {
        return showToast("Абонент всё ещё занят! Подождите.");
    }
    
    if (typeof setTxt === 'function') {
        setTxt("buyCallEmoji", "📞");
        setTxt("buyCallTitle", "Звонок продавцу...");
        setTxt("buyCallDesc", "Набираем номер продавца... Идут гудки в трубке...");
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
                setTxt("buyCallDesc", "«Сейчас на работе, перезвоните через " + waitSec + " сек, всё покажу!»");
            }
            if (btnBox) btnBox.innerHTML = "<button onclick=\"ModalManager.close('modalBuyCall')\" class='btn btn-dark w-full'>Понятно</button>";
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
            if (btnBox) btnBox.innerHTML = "<button onclick=\"ModalManager.close('modalBuyCall')\" class='btn btn-dark w-full'>Закрыть</button>";
        }
    }, 700);
}

// ========================================================
// js/market-deal.js — ЕДИНОЕ ОКНО ТОРГА ДЛЯ P2P БИРЖИ
// ========================================================

function openP2PDealModal(p2pId) {
    let p2pItem = (state.p2pMarketListings || []).find(l => l && l.id === p2pId);
    if (!p2pItem) return showToast("Лот не найден на бирже!");

    if (!state.player) state.player = {};
    if (!state.player.phoneMessages) state.player.phoneMessages = [];

    let dialogId = `p2p_deal_${p2pItem.id}`;
    let existingMsg = state.player.phoneMessages.find(m => m.id === dialogId);

    let askingPrice = p2pItem.price || 100000;
    let initialOffer = p2pItem.currentOffer || Math.round(askingPrice * 0.85);

    if (!existingMsg) {
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
                type: p2pItem.type || 'economy',
                price: askingPrice
            },
            askingPrice: askingPrice,
            offerPrice: initialOffer,
            patience: p2pItem.patience !== undefined ? p2pItem.patience : 4,
            maxPatience: 4,
            chatHistory: [
                { from: 'them', text: `Здорово! Пишу по объявлению на «${p2pItem.name}». Готов обсудить условия сделки.` }
            ]
        };
        state.player.phoneMessages.unshift(existingMsg);
    }

    saveState();

    // Переходим в приложение M+ прямо на экран этого диалога, точь-в-точь как с NPC
    if (typeof switchTab === 'function') switchTab('tabPhone');
    setTimeout(() => {
        if (typeof PhoneManager !== 'undefined') {
            PhoneManager.openApp('m');
        }
        if (typeof AppM !== 'undefined') {
            AppM.activeTab = 'chats';
            AppM.activeDialogId = dialogId;
            let container = document.getElementById('phoneAppContainer');
            if (container) AppM.render(container);
        }
    }, 100);
}

function executeP2PHaggle(p2pId, percent, failRisk) {
    let p2pItem = (state.p2pMarketListings || []).find(l => l && l.id === p2pId);
    if (!p2pItem) return;

    if (p2pItem.patience <= 0) {
        return showToast("Продавец на бирже отказался продолжать диалог!");
    }

    p2pItem.patience -= 1;
    let pctVal = Math.round((p2pItem.patience / 4) * 100);

    let pBar = document.getElementById("p2pPatienceBar");
    let pLabel = document.getElementById("p2pPatienceLabel");
    if (pBar) pBar.style.width = `${pctVal}%`;
    if (pLabel) pLabel.innerText = `${pctVal}% (${p2pItem.patience} попытки)`;

    let roll = Math.random() * 100;
    let historyBox = document.getElementById("p2pDynamicChatHistory");

    if (roll < failRisk) {
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');

        if (historyBox) {
            historyBox.innerHTML += `
                <div class="chat-msg msg-player" style="margin-bottom:6px;">Скидывай ${percent}%, забираю прямо сейчас!</div>
                <div class="chat-msg msg-seller" style="margin-bottom:6px;">«Много хочешь! Такая цена меня не устраивает.»</div>
            `;
        }
        showToast("Продавец отклонил предложение по скидке!");
    } else {
        let asking = p2pItem.price;
        let discount = Math.round(asking * (percent / 100));
        p2pItem.currentOffer = Math.max(Math.round(asking * 0.5), p2pItem.currentOffer - discount);

        let offerEl = document.getElementById("p2pCurOfferVal");
        let btnTextEl = document.getElementById("p2pBtnOfferText");
        let formatted = Number(p2pItem.currentOffer).toLocaleString();
        if (offerEl) offerEl.innerText = `${formatted} ₽`;
        if (btnTextEl) btnTextEl.innerText = formatted;

        if (historyBox) {
            historyBox.innerHTML += `
                <div class="chat-msg msg-player" style="margin-bottom:6px;">Давай подвинься на ${percent}%, оформляем сделку на бирже!</div>
                <div class="chat-msg msg-seller" style="margin-bottom:6px;">«Ладно, уступаю в цене, забирай за ${formatted} ₽ 🤝»</div>
            `;
        }

        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast("Успешный торг! Цена лота на бирже снижена.");
    }

    let scrollBox = document.getElementById("p2pChatScrollBox");
    if (scrollBox) scrollBox.scrollTop = scrollBox.scrollHeight;

    saveState();
}

function finalizeP2PDeal(p2pId) {
    let p2pItem = (state.p2pMarketListings || []).find(l => l && l.id === p2pId);
    if (!p2pItem) return;

    let finalPrice = p2pItem.currentOffer || p2pItem.price;
    let cash = state.player?.cash || 0;

    if (cash < finalPrice) {
        return showToast(`Не хватает денег! Нужно: ${Number(finalPrice).toLocaleString()} ₽`);
    }

    state.player.cash -= finalPrice;

    if (p2pItem.type === 'cars' || p2pItem.type === 'car') {
        if (!state.garage) state.garage = [];
        state.garage.push(Object.assign({}, p2pItem.itemData, { id: "p2p_" + Date.now(), purchaseCost: finalPrice }));
        if (typeof renderGarage === 'function') renderGarage();
    } else if (p2pItem.type === 'plates' || p2pItem.type === 'plate') {
        if (!state.ownedPlates) state.ownedPlates = [];
        state.ownedPlates.push(p2pItem.itemData?.plate || p2pItem.name);
    } else if (p2pItem.type === 'business') {
        let biz = (state.businesses || []).find(b => b.id === (p2pItem.itemData?.bizId || p2pItem.id));
        if (biz) {
            biz.level = Math.max(biz.level || 0, p2pItem.itemData?.level || 1);
            biz.stock = 100;
        }
    } else if (p2pItem.type === 'housing') {
        let hId = p2pItem.itemData?.houseId || 'gsk_box';
        if (!state.player.ownedHouses) state.player.ownedHouses = [];
        if (!state.player.ownedHouses.includes(hId)) state.player.ownedHouses.push(hId);
        state.player.housingId = hId;
        state.player.housingType = 'own';
    }

    state.p2pMarketListings = (state.p2pMarketListings || []).filter(l => l.id !== p2pId);
    saveState();
    updateHeaderUI();
    ModalManager.close("modalMarketDeal");
    
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');

    if (typeof openVerdictModal === 'function') {
        openVerdictModal("P2P СДЕЛКА ЗАКРЫТА! 🤝", `Вы выторговали и выкупили «${p2pItem.name}» за ${Number(finalPrice).toLocaleString()} ₽!`, true, finalPrice);
    } else {
        showToast("Сделка на бирже успешно закрыта!");
    }

    if (typeof AppM !== 'undefined' && AppM.renderMarketScreen) {
        AppM.renderMarketScreen(document.getElementById('mHubSubContentBox'));
    }
}

function paidCallMarketCar(carId) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < 1000) return showToast("Не хватает 1,000 ₽ на приоритетный дозвон!");
    state.player.cash -= 1000;
    
    const carIndex = (state.marketFeed || []).findIndex(c => c && c.id === carId);
    if (carIndex === -1) return;
    const car = state.marketFeed[carIndex];

    car.cooldownUntil = 0;
    if (typeof saveState === 'function') saveState();
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    showToast("Приоритетный вызов успешен! Встреча назначена.");
    openMarketDeal(carId);
}

function openMarketDeal(carId) {
    const carIndex = (state.marketFeed || []).findIndex(c => c && c.id === carId);
    if (carIndex === -1) return;
    const car = state.marketFeed[carIndex];
    pendingMarketCar = { car: car, carIndex: carIndex };

    car.inspectedAtHood = true;
    if (typeof saveState === 'function') saveState();
    
    const imgEl = document.getElementById("dealCarImg");
    if (imgEl) {
        let fallbackUrl = car.fallback || getCategoryFallback(car.type);
        let rawImg = car.img ? car.img : fallbackUrl;
        imgEl.src = (typeof resolveCarAssetUrl === 'function') ? resolveCarAssetUrl(rawImg) : rawImg;
        imgEl.onerror = () => { imgEl.src = fallbackUrl; };
        imgEl.style.width = "90px";
        imgEl.style.height = "62px";
        imgEl.style.objectFit = "cover";
    }
    
    if (typeof setTxt === 'function') {
        setTxt("dealCarTitle", car.name || "Автомобиль");
        let mileageStr = car.mileage ? car.mileage.toLocaleString() : "0";
        let plateStr = car.plate ? car.plate : "ТРАНЗИТ";
        setTxt("dealCarMileageInfo", "Пробег: " + mileageStr + " км / Госномер: " + plateStr);
        let priceStr = car.price ? car.price.toLocaleString() : "0";
        setTxt("dealCarPrice", priceStr + " ₽");
    }
    
    const avatars = ["👨‍💼", "🧔", "😎", "👨‍🔧", "🧑‍💻", "👴"];
    const names = ["Сергей", "Алексей", "Дмитрий", "Артём", "Михаил", "Игорь"];
    let numSum = 0;
    for (let k = 0; k < carId.length; k++) numSum += carId.charCodeAt(k);
    const randIdx = numSum % avatars.length;
    
    const sellerTitle = car.sellerPlayerName ? car.sellerPlayerName : names[randIdx];
    pendingMarketCar.sellerName = sellerTitle;
    
    if (typeof setTxt === 'function') {
        setTxt("dealSellerAvatar", car.sellerMoodIcon || avatars[randIdx]);
        setTxt("dealSellerName", sellerTitle + " (Продавец у капота)");
    }

    const thread = document.getElementById("dealChatThread");
    if (thread) {
        let greeting = "«Привет! Вот машина, осматривай кузов, проверяй сканером. Можем сделать кружок на тест-драйве!»";
        if (car.isP2PUserListing) greeting = `«Здорово! Я реальный владелец. Смотри машину, любые проверки за твой счёт.»`;
        else if (car.isMuseumStock) greeting = "«Здравствуйте! Машина в коллекционном состоянии, пылинки сдувал. Смотрите кузов.»";
        else if (car.isTunedSpec) greeting = "«Привет! Тачка заряженная, едет боком в отсечку. Проверь выворот, прокатись!»";
        else if (car.isBeaterProject) greeting = "«Здорово. За такие деньги состояние сам видишь, но до сервиса доедет своим ходом.»";
        else if (car.dealType === 'urgent') greeting = "«Здорово! Мне срочно нужны деньги до вечера, готов уступить реальному покупателю!»";
        thread.innerHTML = "<div class='chat-msg msg-seller'>" + greeting + "</div>";
    }

    renderMarketHaggleControls();
    ModalManager.open("modalMarketDeal", { closeOthers: true });
    if (typeof playSound === 'function') playSound('tick');
}

function startMarketTestDrive(carId) {
    if (!pendingMarketCar) return;
    const car = pendingMarketCar.car;
    const thread = document.getElementById("dealChatThread");

    if (typeof playSound === 'function') playSound('tick');
    if (typeof tgHaptic === 'function') tgHaptic('medium');

    car.testDriven = true;
    let driveResults = [];

    if (car.wear?.engine < 45) {
        driveResults.push("Двигатель троит при нажатии в пол, ощущается потеря тяги.");
    } else {
        driveResults.push("Мотор крутится бодро, провалов и сизого дыма нет.");
    }

    if (car.wear?.transmission < 50) {
        driveResults.push("Коробка хрустит при включении второй передачи.");
    } else {
        driveResults.push("Сцепление схватывает чётко, передачи включаются плавно.");
    }

    if (thread) {
        thread.innerHTML += `
            <div class="chat-msg msg-player">«Давай сделаем тестовый заезд вокруг квартала, послушаем подвеску и мотор.»</div>
            <div class="chat-msg msg-seller">«Без проблем, садись за руль!»</div>
            <div class="chat-msg msg-seller" style="border-left-color: var(--cyan);">
                <b>📋 Итоги тест-драйва:</b><br>
                ${driveResults.map(r => `• ${r}`).join('<br>')}
            </div>`;
        thread.scrollTop = thread.scrollHeight;
    }

    showToast("Тест-драйв проведён! Поведение машины изучено.");
    renderMarketHaggleControls();
    if (typeof saveState === 'function') saveState();
}

function renderMarketHaggleControls() {
    const haggleArea = document.getElementById("dealHaggleArea");
    if (!haggleArea || !pendingMarketCar) return;

    const car = pendingMarketCar.car;
    let hasGauge = !!(state.player && state.player.tools && (state.player.tools.gauge || state.player.tools.gauge_pro));
    let hasScanner = !!(state.player && state.player.tools && (state.player.tools.obd || state.player.tools.obd_launch));
    const hasScrapYard = (state.businesses || []).some(b => b.id === 'razborka' && b.level > 0);

    let toolIcon = hasGauge ? "✓" : "🔒 Купить";
    let obdIcon = hasScanner ? "Launch OBD2 ✓" : "🔒 Купить OBD2";

    let maxP = car.maxHagglePatience || 4;
    let curP = car.hagglePatience !== undefined ? car.hagglePatience : maxP;
    let patiencePct = Math.round((curP / maxP) * 100);
    let pColor = patiencePct > 60 ? "color-green" : (patiencePct > 30 ? "color-amber" : "color-red");

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
    `;

    let scrapOptionBtn = "";
    if (hasScrapYard && (car.isStolen || car.isBeaterProject || (car.hiddenDefect && car.hiddenDefect.severity === "Критическая"))) {
        let scrapPrice = Math.round(car.price * 0.60);
        scrapOptionBtn = `
        <button onclick="buyCarDirectToScrapYard(${scrapPrice})" class="btn btn-danger btn-sm w-full mb-2">
            🔩 Выкупить под распил на свою Разборку (${scrapPrice.toLocaleString()} ₽ / -40%)
        </button>`;
    }

    let inspectionBonusBtn = "";
    if (car.stoChecked && car.hiddenDefect) {
        inspectionBonusBtn = `
        <button onclick="attemptDefectArgueHaggle()" class="btn btn-purple btn-sm w-full mb-2">
            🔍 Ткнуть в ошибку ${car.hiddenDefect.code || 'DTC'}: -15% цены (Риск: 25%)
        </button>`;
    } else if (car.gaugeChecked && (car.bodyThickness?.doors > 200 || car.bodyThickness?.hood > 200)) {
        inspectionBonusBtn = `
        <button onclick="attemptPaintArgueHaggle()" class="btn btn-amber btn-sm w-full mb-2">
            🎨 Показать слой шпаклёвки на приборе (>200 мкм): -10% цены (Риск: 20%)
        </button>`;
    }

    haggleArea.innerHTML = `
        <div class="mb-2 p-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
            <div class="flex-between text-xs mb-1">
                <span>Терпение продавца:</span>
                <b class="${pColor}">${patiencePct}% (${curP} попыток)</b>
            </div>
            <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                <div style="width:${patiencePct}%; height:100%; background: ${patiencePct > 60 ? 'var(--green)' : (patiencePct > 30 ? 'var(--amber)' : 'var(--red)')}; transition:width 0.3s ease;"></div>
            </div>
        </div>

        ${inspectionToolsBlock}
        ${scrapOptionBtn}
        ${inspectionBonusBtn}

        <div class="grid-3 mb-1">
            <button onclick="attemptMarketHaggle(5, 12)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                <div class="font-bold color-green text-xs">-5% на дорогу</div>
                <div class="sub-label" style="font-size:8px;">Риск: 12%</div>
            </button>
            <button onclick="attemptMarketHaggle(10, 30)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                <div class="font-bold color-amber text-xs">-10% по факту</div>
                <div class="sub-label" style="font-size:8px;">Риск: 30%</div>
            </button>
            <button onclick="attemptMarketHaggle(18, 60)" class="btn btn-dark btn-sm text-left" style="padding:6px 6px;">
                <div class="font-bold color-red text-xs">-18% жестко</div>
                <div class="sub-label" style="font-size:8px;">Риск: 60%</div>
            </button>
        </div>`;
}

function buyCarDirectToScrapYard(price) {
    if (!pendingMarketCar) return;
    const car = pendingMarketCar.car;
    let cash = state.player?.cash || 0;
    if (cash < price) return showToast("Не хватает денег на выкуп машины!");

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
            `Автомобиль «${car.name}» доставлен на авторазборку «Последний Путь» минуя МРЭО!\nЧистая прибыль с запчастей: +${(salvageYield - price).toLocaleString()} ₽\nЗапас сырья на разборке пополнен (+40%).`,
            true,
            salvageYield
        );
    }
}

function attemptDefectArgueHaggle() {
    if (!pendingMarketCar) return;
    const car = pendingMarketCar.car;
    const thread = document.getElementById("dealChatThread");

    let discount = Math.round(car.price * 0.15);
    car.price = Math.max(10000, car.price - discount);
    car.hagglePatience = Math.max(0, (car.hagglePatience || 1) - 1);
    car.stoChecked = false;

    if (typeof setTxt === 'function') setTxt("dealCarPrice", car.price.toLocaleString() + " ₽");

    if (thread) {
        thread.innerHTML += `
            <div class="chat-msg msg-player">«Я Launch подключил: в блоке висит ${car.hiddenDefect.text}. Тут работы на круглую сумму, скидывай!»</div>
            <div class="chat-msg msg-seller">«Да уж, спалил ты меня... Ладно, уступаю ${discount.toLocaleString()} ₽ на сервис!»</div>`;
        thread.scrollTop = thread.scrollHeight;
    }

    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    renderMarketHaggleControls();
    if (typeof saveState === 'function') saveState();
}

function attemptPaintArgueHaggle() {
    if (!pendingMarketCar) return;
    const car = pendingMarketCar.car;
    const thread = document.getElementById("dealChatThread");

    let discount = Math.round(car.price * 0.10);
    car.price = Math.max(10000, car.price - discount);
    car.hagglePatience = Math.max(0, (car.hagglePatience || 1) - 1);
    car.gaugeChecked = false;

    if (typeof setTxt === 'function') setTxt("dealCarPrice", car.price.toLocaleString() + " ₽");

    if (thread) {
        thread.innerHTML += `
            <div class="chat-msg msg-player">«Вот, смотри на толщиномер: здесь слой шпакли звенит за 300 мкм! Скидывай за неродной окрас.»</div>
            <div class="chat-msg msg-seller">«Ладно, твоя взяла. Скидываю ${discount.toLocaleString()} ₽ за вторичный окрас.»</div>`;
        thread.scrollTop = thread.scrollHeight;
    }

    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    renderMarketHaggleControls();
    if (typeof saveState === 'function') saveState();
}

function attemptMarketHaggle(percent, failRisk = 25) {
    if (!pendingMarketCar) return;
    const car = pendingMarketCar.car;
    if (car.hagglePatience <= 0) return showToast("Продавец больше не торгуется!");

    car.hagglePatience -= 1;
    const thread = document.getElementById("dealChatThread");

    let actualRisk = failRisk;
    if (car.sellerPersonality === 'hurried') actualRisk -= 10;
    if (car.sellerPersonality === 'aggressive') actualRisk += 15;
    if (car.isBeaterProject) actualRisk -= 15;
    if (car.dealType === 'urgent') actualRisk -= 10;

    let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
    let lvl = (state.player && state.player.level) ? state.player.level : 1;
    actualRisk = Math.max(5, Math.min(95, actualRisk - (lvl * 0.4) - ((karma - 50) * 0.25)));

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
            setTimeout(() => { ModalManager.close("modalMarketDeal"); renderMarketFeed(); }, 1200);
            return;
        } else {
            if (thread) {
                let failReplies = [
                    "«Никаких скидок, цена и так по низу рынка!»",
                    "«Не устраивает цена — ищи другой вариант на площадке.»",
                    "«Ты надоел торговаться, больше ни копейки не скину!»"
                ];
                let reply = failReplies[Math.floor(Math.random() * failReplies.length)];
                thread.innerHTML += `
                    <div class="chat-msg msg-player">«Скидывай ${percent}%, слишком много просишь!»</div>
                    <div class="chat-msg msg-seller">${reply}</div>`;
                thread.scrollTop = thread.scrollHeight;
            }
            showToast("Продавец отказался снижать цену!");
        }
    } else {
        let disc = Math.round(car.price * (percent / 100));
        car.price = Math.max(10000, car.price - disc);
        if (typeof setTxt === 'function') setTxt("dealCarPrice", car.price.toLocaleString() + " ₽");

        if (thread) {
            thread.innerHTML += `
                <div class="chat-msg msg-player">«Скинь ${percent}%, забираю прямо сейчас за наличку без лишних вопросов.»</div>
                <div class="chat-msg msg-seller" style="border-left-color:var(--green);">«По рукам. Уступаю ${disc.toLocaleString()} ₽, оформляем ДКП.»</div>`;
            thread.scrollTop = thread.scrollHeight;
        }
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`Успешный торг! Скинуто -${disc.toLocaleString()} ₽`);
    }

    renderMarketHaggleControls();
    if (typeof saveState === 'function') saveState();
}

Object.assign(window, {
    initiateBuyMarketCar,
    openP2PDealModal,
    executeP2PHaggle,
    finalizeP2PDeal,
    paidCallMarketCar,
    openMarketDeal,
    startMarketTestDrive,
    renderMarketHaggleControls,
    buyCarDirectToScrapYard,
    attemptDefectArgueHaggle,
    attemptPaintArgueHaggle,
    attemptMarketHaggle
});
// ========================================================
// js/market-deal.js — ТОРГ У КАПОТА (v5.1.3 FIXED)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v5.1.3 (STRICT NPC MODAL):
//   - ФИКС: initiateBuyMarketCar защищён от двойного вызова
//   - ФИКС: при открытии модалки ТОРГ У КАПОТА сбрасываются
//     все флаги, чтобы предотвратить конфликты с другими модалками
//   - ФИКС: проверка на существование модалки перед открытием
// ========================================================

let pendingMarketCar = null;
let buyCallTimeoutTimer = null;
let _dealActionPending = false;

if (typeof window.__DKP_PENDING__ !== 'boolean') {
    window.__DKP_PENDING__ = false;
}

let _activeDKPDeal = null;

window.__getDKPState = function() {
    return {
        _activeDKPDeal: _activeDKPDeal,
        _dealActionPending: _dealActionPending,
        __DKP_PENDING__: window.__DKP_PENDING__,
        pendingMarketCar: pendingMarketCar
    };
};

window.__resetDKPFlags = function() {
    _dealActionPending = false;
    window.__DKP_PENDING__ = false;
    console.log('[DKP] Все флаги сброшены:', window.__getDKPState());
};

function _openP2PDealFallback(p2pId) {
    if (!p2pId) return;
    const toast = (m) => { if (typeof showToast === 'function') showToast(m); };

    if (!window.P2POffersManager?.createOffer) {
        return toast("❌ P2P торговля недоступна (p2p-offers.js не загружен)");
    }

    const profile = (typeof getCurrentPlayerProfile === 'function') ? getCurrentPlayerProfile() : null;
    const myUid = String(profile?.id || state.player?.uid || window.tgUserId || '');

    const findLot = (lots) => (lots || []).find(l => l && (
        String(l.id) === String(p2pId) || String(l.lot_id) === String(p2pId)
    ));

    const doOffer = (lot) => {
        if (!lot) return toast("❌ Лот не найден на бирже");
        if (String(lot.sellerId) === myUid) return toast("🚫 Это ваш собственный лот");

        const askingPrice = Number(lot.price) || 100000;
        const raw = prompt(
            `Ваше предложение по «${lot.name}»?\n\nЦена продавца: ${askingPrice.toLocaleString()} ₽\nВведите сумму:`,
            String(askingPrice)
        );
        if (raw === null) return;
        const offeredPrice = parseInt(raw, 10);
        if (!offeredPrice || offeredPrice < 1000) return toast("❌ Цена не менее 1 000 ₽");

        window.P2POffersManager.createOffer(String(lot.id || lot.lot_id || p2pId), offeredPrice, "")
            .then(res => {
                if (res.success) {
                    toast(`📤 Оффер отправлен продавцу: ${offeredPrice.toLocaleString()} ₽`);
                    if (window.AudioFx) {
                        window.AudioFx.play('win');
                        window.AudioFx.haptic('success');
                    }
                } else {
                    toast(`❌ ${res.error || 'Ошибка создания оффера'}`);
                    if (window.AudioFx) window.AudioFx.play('error');
                }
            })
            .catch(e => toast(`❌ ${e.message}`));
    };

    const localLot = findLot(state.p2pMarketListings);
    if (localLot) return doOffer(localLot);

    if (window.FB_Bridge?.MarketLots?.fetchLots) {
        toast('⏳ Загрузка лота с биржи...');
        window.FB_Bridge.MarketLots.fetchLots(true)
            .then(lots => doOffer(findLot(lots)))
            .catch(() => toast("❌ Не удалось загрузить лот"));
        return;
    }

    toast("❌ Лот не найден");
}

// ⭐ v5.1.3: initiateBuyMarketCar защищён от двойного вызова
function initiateBuyMarketCar(carId) {
    if (buyCallTimeoutTimer) { clearTimeout(buyCallTimeoutTimer); buyCallTimeoutTimer = null; }
    if (!carId) return;

    // Проверка на двойной вызов
    if (_dealActionPending) {
        console.warn('[MarketDeal] initiateBuyMarketCar уже в процессе');
        return;
    }

    let p2pItem = (state.p2pMarketListings || []).find(l => l && (
        String(l.id) === String(carId) || String(l.lot_id) === String(carId)
    ));
    if (p2pItem) {
        if (typeof window.openP2PDealModal === 'function') {
            return window.openP2PDealModal(p2pItem.id || p2pItem.lot_id);
        }
        return _openP2PDealFallback(p2pItem.id || p2pItem.lot_id);
    }

    const car = (state.marketFeed || []).find(c => c && c.id === carId);
    if (!car) {
        if (typeof showToast === 'function') showToast("Лот не найден.");
        return;
    }

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

// ⭐ v5.1.3: openMarketDeal принудительно сбрасывает флаги
function openMarketDeal(carId) {
    if (!carId) return;

    const car = (state.marketFeed || []).find(c => c && c.id === carId);
    if (!car) return showToast("Автомобиль недоступен!");

    if (car.isP2PUserListing) {
        const p2pItem = (state.p2pMarketListings || []).find(l => l && (
            String(l.id) === String(carId) || String(l.lot_id) === String(carId)
        ));
        const targetId = p2pItem ? (p2pItem.id || p2pItem.lot_id) : carId;
        if (typeof window.openP2PDealModal === 'function') {
            return window.openP2PDealModal(targetId);
        }
        return _openP2PDealFallback(targetId);
    }

    _dealActionPending = false;
    window.__DKP_PENDING__ = false;

    pendingMarketCar = { car: car, carId: carId };
    car.inspectedAtHood = true;
    if (typeof saveState === 'function') saveState();

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

function renderMarketHaggleControls() {
    const haggleArea = document.getElementById("dealHaggleArea");
    if (!haggleArea || !pendingMarketCar || !pendingMarketCar.car) return;

    const car = pendingMarketCar.car;

    if (car.isP2PUserListing) {
        haggleArea.innerHTML = `
            <div class="p-2 mb-2" style="background:rgba(0,242,254,0.08); border-radius:8px; border:1px solid rgba(0,242,254,0.3);">
                <b class="text-xs color-cyan">💬 P2P ЛОТ — торг ведётся в M+ Hub</b>
                <div class="sub-label mt-1" style="font-size:9px;">Используйте кнопку «Торг» для реального диалога с игроком.</div>
            </div>
        `;
        return;
    }

    const seller = (typeof SELLER_ARCHETYPES !== 'undefined' ? SELLER_ARCHETYPES : []).find(s => s.id === car.sellerArchetype) || null;

    let hasGauge = !!(state.player && state.player.tools && (state.player.tools.gauge || state.player.tools.gauge_pro));
    let hasScanner = !!(state.player && state.player.tools && (state.player.tools.obd || state.player.tools.obd_launch));
    const hasScrapYard = (state.businesses || []).some(b => b.id === 'razborka' && b.level > 0);

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

    let karma = state.player?.karma !== undefined ? state.player.karma : 50;
    let lvl = state.player?.level || 1;
    const brandReputation = typeof getBrandReputation === 'function' ? getBrandReputation(car.name) : 1.0;

    const calcHaggleChance = (baseRisk) => {
        let risk = baseRisk;
        if (seller) {
            if (seller.id === 'panicker' || seller.id === 'honest_grandpa') risk -= 15;
            if (seller.id === 'cunning_perekup' || seller.id === 'criminal') risk += 15;
            if (seller.id === 'collector') risk += 20;
        }
        if (car.isBeaterProject) risk -= 15;
        if (car.dealType === 'urgent') risk -= 10;

        const levelBonus = Math.min(15, Math.floor(lvl / 5));
        const karmaBonus = Math.round((karma - 50) * 0.15);
        const brandBonus = Math.round((brandReputation - 1.0) * 30);

        risk = risk - levelBonus - karmaBonus + brandBonus;
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

    let inspectionToolsBlock = "";

    if (hasGauge || hasScanner) {
        let toolsButtonsHtml = "";
        if (hasGauge) {
            toolsButtonsHtml += `
                <button onclick="openGaugeModal('${car.id}')" class="btn btn-dark btn-sm">
                    <i class="fa-solid fa-microchip color-cyan mr-1"></i> Толщиномер
                </button>`;
        }
        if (hasScanner) {
            toolsButtonsHtml += `
                <button onclick="quickOBDScanMarketCar('${car.id}')" class="btn btn-dark btn-sm">
                    <i class="fa-solid fa-tablet-screen-button color-cyan mr-1"></i> OBD2
                </button>`;
        }
        toolsButtonsHtml += `
            <button onclick="startMarketTestDrive('${car.id}')" class="btn ${car.testDriven ? 'btn-dark opacity-50' : 'btn-cyan'} btn-sm">
                <i class="fa-solid fa-gauge-high mr-1"></i> ${car.testDriven ? 'Прокатились ✓' : 'Тест-драйв'}
            </button>`;

        inspectionToolsBlock = `
            <div class="grid-3 mb-2" style="gap:6px;">
                ${toolsButtonsHtml}
            </div>
        `;
    } else {
        inspectionToolsBlock = `
            <div class="mb-2">
                <button onclick="startMarketTestDrive('${car.id}')" class="btn ${car.testDriven ? 'btn-dark opacity-50' : 'btn-cyan'} btn-sm w-full">
                    <i class="fa-solid fa-gauge-high mr-1"></i> ${car.testDriven ? 'Прокатились ✓' : 'Тест-драйв'}
                </button>
            </div>
        `;
    }

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

    let darknetOptionBtn = '';
    if (car.legalDefect || car.isStolen || car.isBeaterProject) {
        const hasDarknet = (state.player?.unlockedApps || []).includes('darknet') || (state.player?.level || 1) >= 7;
        if (hasDarknet) {
            let darknetPrice = Math.round((car.marketValue || car.price || 100000) * (0.4 + Math.random() * 0.2));
            darknetOptionBtn = `
            <button onclick="sellCarToDarknet(${darknetPrice})" class="btn btn-dark btn-sm w-full mb-2" style="border-color:var(--red); color:#fca5a5;">
                🏴‍☠️ Слить в Даркнет (${darknetPrice.toLocaleString()} ₽ / без ДКП)
            </button>`;
        }
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

    const basePrice = car.price || 0;
    const basePurchaseCost = car.baseMarketValue || Math.round(basePrice * 0.75);
    const baseMargin = basePrice - basePurchaseCost;
    const marginClass = baseMargin >= 0 ? 'color-green' : 'color-red';
    const marginIcon = baseMargin >= 0 ? '▲' : '▼';

    let brandRepBadgeHtml = '';
    if (brandReputation > 1.1) {
        brandRepBadgeHtml = `<span class="tag-badge bg-tag-green" style="font-size:7.5px;">🔥 ${(brandReputation * 100 - 100).toFixed(0)}% BRAND</span>`;
    } else if (brandReputation < 0.9) {
        brandRepBadgeHtml = `<span class="tag-badge bg-tag-red" style="font-size:7.5px;">📉 ${(100 - brandReputation * 100).toFixed(0)}% BRAND</span>`;
    }

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
            ${brandRepBadgeHtml ? `<div class="flex-between mt-1">${brandRepBadgeHtml}</div>` : ''}
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
        ${darknetOptionBtn}

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

    const levelBonus = Math.min(15, Math.floor(lvl / 5));
    const karmaBonus = Math.round((karma - 50) * 0.15);
    const brandReputation = typeof getBrandReputation === 'function' ? getBrandReputation(car.name) : 1.0;
    const brandPenalty = Math.round((brandReputation - 1.0) * 30);

    actualRisk = actualRisk - levelBonus - karmaBonus + brandPenalty;
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

function confirmMarketPurchaseSuccess() {
    if (_dealActionPending) return;

    if (!pendingMarketCar || !pendingMarketCar.car) {
        showToast("❌ Данные об автомобиле недоступны.");
        return;
    }

    const car = pendingMarketCar.car;

    const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
    let currentSlots = state.garage ? state.garage.length : 0;
    if (currentSlots >= maxSlots) {
        showToast(`🚫 Гараж полон! (${currentSlots}/${maxSlots} мест). Продайте авто или докупите бокс.`);
        return;
    }

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    let price = car.price || 0;
    if (cash < price) {
        showToast(`💸 Не хватает ${(price - cash).toLocaleString()} ₽!`);
        return;
    }

    if (car.unavailable) {
        showToast("❌ Этот лот уже продан!");
        return;
    }

    const deal = {
        type: 'buy',
        carId: car.id,
        car: car,
        seller: pendingMarketCar.sellerName || "Продавец",
        buyer: (state.player && state.player.name) ? state.player.name : "Перекуп #777",
        price: price,
        isRegisteredOnPlayer: false
    };

    ModalManager.close("modalMarketDeal");
    openRegistrationChoiceModal(deal);
}

function openRegistrationChoiceModal(deal) {
    if (!deal || !deal.car) return showToast("Ошибка данных сделки");

    _activeDKPDeal = deal;
    window.__DKP_PENDING__ = false;
    _dealActionPending = false;

    ModalManager.open('modalRegistrationChoice', { closeOthers: true });
    if (typeof playSound === 'function') playSound('tick');
}

function confirmRegistrationChoice(registerOnPlayer) {
    if (!_activeDKPDeal) return showToast("Ошибка: сделка потеряна");

    _activeDKPDeal.isRegisteredOnPlayer = !!registerOnPlayer;

    if (registerOnPlayer) {
        const gosposhlina = 2850;
        if ((state.player?.cash || 0) < gosposhlina) {
            showToast(`Не хватает ${gosposhlina} ₽ на госпошлину!`);
            return;
        }
        state.player.cash -= gosposhlina;
        if (typeof logBankTransaction === 'function') {
            logBankTransaction('Госпошлина МРЭО', gosposhlina, false);
        }
        showToast("✅ Оформление в МРЭО (-2,850 ₽)");
    } else {
        showToast("📄 Автомобиль оформляется по ДКП");
    }

    ModalManager.close('modalRegistrationChoice');
    openDKPModal(_activeDKPDeal);
}

function openDKPModal(deal) {
    if (!deal || !deal.car) {
        window.__DKP_PENDING__ = false;
        _dealActionPending = false;
        return showToast("❌ Ошибка: данные сделки потеряны");
    }

    _activeDKPDeal = deal;
    window.__DKP_PENDING__ = false;
    _dealActionPending = false;

    const car = deal.car;
    const price = deal.price || car.price || 0;
    const buyerName = deal.buyer || (state.player?.name) || "Перекуп #777";
    const sellerName = deal.seller || "Продавец";

    const hasLegalDefect = !!(car.legalDefect && !car._legalResolved);
    const legalDefectInfo = hasLegalDefect
        ? (typeof LEGAL_DEFECTS !== 'undefined' ? LEGAL_DEFECTS.find(l => l.id === car.legalDefect.id) : null)
        : null;

    const dkpModal = document.getElementById('modalDKP');
    if (!dkpModal) return;

    const contractNum = `МРЭО-${String(Date.now()).slice(-6)}-${car.id ? car.id.slice(-3) : '777'}`;
    const contractDate = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const carVIN = car.vin || `XTA${String(car.id || '2107000').slice(-13).padEnd(13, '0')}`;

    dkpModal.innerHTML = `
        <div class="modal-box dkp-official-blank" style="max-width: 420px;">
            <div class="dkp-watermark">МРЭО РФ</div>
            <div class="dkp-watermark dkp-watermark-2">ГИБДД</div>

            <div class="dkp-blank-border">
                <div class="dkp-header text-center mb-2">
                    <div class="dkp-title-small">МИНИСТЕРСТВО ВНУТРЕННИХ ДЕЛ РФ</div>
                    <h3 class="dkp-title-main mb-1">ДОГОВОР КУПЛИ-ПРОДАЖИ ТС</h3>
                    <div class="dkp-contract-num">№ <b>${contractNum}</b> от <b>${contractDate}</b></div>
                </div>

                <div class="dkp-section-compact">
                    <div class="dkp-two-col">
                        <div>
                            <div class="dkp-section-title">ПРОДАВЕЦ</div>
                            <div class="dkp-row-compact">
                                <b class="dkp-value" id="dkpSellerName">${sellerName}</b>
                            </div>
                        </div>
                        <div>
                            <div class="dkp-section-title">ПОКУПАТЕЛЬ</div>
                            <div class="dkp-row-compact">
                                <b class="dkp-value color-cyan" id="dkpBuyerName">${buyerName}</b>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dkp-section-compact">
                    <div class="dkp-section-title">ТРАНСПОРТНОЕ СРЕДСТВО</div>
                    <div class="dkp-row-compact">
                        <span class="dkp-label">Модель:</span>
                        <b class="dkp-value color-amber" id="dkpCarTitle">${car.name || "Автомобиль"}</b>
                    </div>
                    <div class="dkp-row-compact">
                        <span class="dkp-label">VIN:</span>
                        <span class="dkp-value-mono color-cyan">${carVIN}</span>
                    </div>
                    <div class="dkp-row-compact">
                        <span class="dkp-label">Мощность / Пробег:</span>
                        <b class="dkp-value">${car.power || 100} л.с. / ${(car.mileage || 0).toLocaleString()} км</b>
                    </div>
                    <div class="dkp-row-compact">
                        <span class="dkp-label">Госномер:</span>
                        <span class="license-plate" style="font-size:10px; padding:1px 6px;" id="dkpCarPlate">${car.customPlate || car.plate || "ТРАНЗИТ"}</span>
                    </div>
                </div>

                <div class="dkp-section-compact dkp-price-line-highlight">
                    <div class="dkp-row-compact">
                        <span class="dkp-label">СУММА:</span>
                        <b class="price-val color-green" style="font-size:15px;" id="dkpPriceAmount">${price.toLocaleString()} ₽</b>
                    </div>
                    <div class="dkp-row-compact">
                        <span class="dkp-label">Учёт:</span>
                        <b class="dkp-value color-amber">${deal.isRegisteredOnPlayer ? '✅ МРЭО' : '📄 ДКП'}</b>
                    </div>
                </div>

                ${hasLegalDefect ? `
                    <div class="dkp-legal-warning dkp-compact-warning">
                        <b class="text-xs color-red">⚠️ ЮРИДИЧЕСКАЯ ПРОБЛЕМА: ${legalDefectInfo?.name || ''}</b>
                    </div>
                ` : ''}

                <div class="dkp-signatures-area dkp-compact-sigs">
                    <div class="dkp-sig-col">
                        <span class="dkp-sig-label">Продавец:</span>
                        <div class="dkp-handwrite" id="dkpSellerSig">✓ Подписано</div>
                        <div class="dkp-sig-date">${contractDate}</div>
                    </div>
                    <div class="dkp-sig-col text-right">
                        <span class="dkp-sig-label">Покупатель:</span>
                        <div class="dkp-handwrite" id="dkpBuyerSig">✍️ Ожидает...</div>
                        <div class="dkp-sig-date" id="dkpBuyerSigDate">—</div>
                    </div>
                    <div id="dkpOfficialStamp" class="official-mreo-stamp">
                        <div class="stamp-inner">
                            <span>МРЭО ГИБДД</span>
                            <span>ЗАРЕГИСТРИРОВАНО</span>
                            <span>РФ</span>
                        </div>
                    </div>
                </div>

                <div class="mt-2">
                    <button id="btnSignDKP" onclick="confirmSignDKP()" class="btn btn-green w-full font-bold btn-sm">
                        ✍️ ПОДПИСАТЬ ДОГОВОР
                    </button>

                    <div class="grid-2 mt-1" style="gap:6px;">
                        <button onclick="downloadDKPPDF()" class="btn btn-dark btn-sm">
                            <i class="fa-solid fa-download mr-1"></i> PDF
                        </button>
                        ${hasLegalDefect ? `
                            <button onclick="disputeDKP()" class="btn btn-danger btn-sm">
                                <i class="fa-solid fa-gavel mr-1"></i> Оспорить
                            </button>
                        ` : `
                            <button onclick="abortDKPDeal()" class="btn btn-dark btn-sm">
                                <i class="fa-solid fa-xmark mr-1"></i> Отмена
                            </button>
                        `}
                    </div>

                    <button id="btnAbortDKP" onclick="abortDKPDeal()" class="btn btn-danger btn-sm w-full mt-1" style="${hasLegalDefect ? '' : 'display:none;'}">
                        ❌ Разорвать сделку
                    </button>
                    <button id="btnCloseDKP" onclick="closeModal('modalDKP')" class="btn btn-dark w-full mt-1" style="display:none;">Готово</button>
                </div>
            </div>
        </div>
    `;

    ModalManager.open('modalDKP', { closeOthers: true });
    if (typeof playSound === 'function') playSound('tick');

    setTimeout(() => {
        const btnSign = document.getElementById('btnSignDKP');
        const btnAbort = document.getElementById('btnAbortDKP');
        const btnClose = document.getElementById('btnCloseDKP');

        if (btnSign) { btnSign.onclick = confirmSignDKP; btnSign.style.display = 'block'; btnSign.disabled = false; }
        if (btnAbort) { btnAbort.onclick = abortDKPDeal; btnAbort.style.display = hasLegalDefect ? 'block' : 'none'; }
        if (btnClose) { btnClose.style.display = 'none'; }
    }, 50);
}

function downloadDKPPDF() {
    if (typeof showToast === 'function') {
        showToast("📄 Договор сохранён в буфер обмена (PDF-имитация)");
    }
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');

    if (_activeDKPDeal && _activeDKPDeal.car) {
        const car = _activeDKPDeal.car;
        const contractText = `
ДОГОВОР КУПЛИ-ПРОДАЖИ ТС
Дата: ${new Date().toLocaleDateString('ru-RU')}
Продавец: ${_activeDKPDeal.seller || 'Продавец'}
Покупатель: ${_activeDKPDeal.buyer || 'Покупатель'}
Автомобиль: ${car.name}
VIN: ${car.vin || '—'}
Госномер: ${car.customPlate || car.plate || 'ТРАНЗИТ'}
Цена: ${(_activeDKPDeal.price || 0).toLocaleString()} ₽
        `.trim();

        if (navigator.clipboard) {
            navigator.clipboard.writeText(contractText).catch(() => {});
        }
    }
}

function disputeDKP() {
    if (!_activeDKPDeal || !_activeDKPDeal.car) return;

    const car = _activeDKPDeal.car;

    if (typeof showToast === 'function') {
        showToast("⚖️ Вы вызвали юриста для оспаривания сделки...");
    }

    const hasConnections = (state.player?.connections || 0) >= 1;
    const hasMoney = (state.player?.cash || 0) >= 100000;

    if (hasConnections && Math.random() < 0.6) {
        state.player.connections -= 1;
        if (typeof showToast === 'function') showToast("🤝 Решала уладил юридические проблемы (-1 связь)!");
        car.legalDefect = null;
        car._legalResolved = true;
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        setTimeout(() => { openDKPModal(_activeDKPDeal); }, 800);
    } else if (hasMoney) {
        state.player.cash -= 100000;
        car.legalDefect = null;
        car._legalResolved = true;
        if (typeof logBankTransaction === 'function') {
            logBankTransaction('Юридическое сопровождение ДКП', 100000, false);
        }
        if (typeof showToast === 'function') showToast("💸 Юрист уладил проблемы (-100,000 ₽)!");
        if (typeof playSound === 'function') playSound('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        setTimeout(() => { openDKPModal(_activeDKPDeal); }, 800);
    } else {
        if (typeof showToast === 'function') showToast("❌ Не хватает ни связей, ни денег для оспаривания!");
        if (typeof playSound === 'function') playSound('error');
        if (typeof tgHaptic === 'function') tgHaptic('error');
    }
}

function confirmSignDKP() {
    console.log('[DKP] confirmSignDKP вызван. State:', window.__getDKPState());

    if (window.__DKP_PENDING__) return;

    if (!_activeDKPDeal) {
        showToast("❌ Ошибка: сделка потеряна");
        ModalManager.close('modalDKP');
        window.__DKP_PENDING__ = false;
        _dealActionPending = false;
        return;
    }

    window.__DKP_PENDING__ = true;
    const deal = _activeDKPDeal;

    const stamp = document.getElementById('dkpOfficialStamp');
    if (stamp) stamp.classList.add('stamp-approved');

    const buyerSig = document.getElementById('dkpBuyerSig');
    const buyerSigDate = document.getElementById('dkpBuyerSigDate');
    const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (buyerSig) buyerSig.innerText = '✓ Подписано';
    if (buyerSigDate) buyerSigDate.innerText = today;

    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');

    const btnClose = document.getElementById('btnCloseDKP');
    if (btnClose) {
        setTimeout(() => {
            btnClose.style.display = 'block';
            btnClose.onclick = () => {
                ModalManager.close('modalDKP');
                closeModal('modalDKP');
            };
        }, 800);
    }

    setTimeout(() => {
        ModalManager.close('modalDKP');

        const type = deal.type;
        if (type === 'buy') {
            finishMarketCarBuyProcess(deal);
        } else if (type === 'sale') {
            const idx = deal.lotIndex;
            if (idx !== undefined && typeof finishSalesLotDeal === 'function') {
                finishSalesLotDeal(idx, deal.price, deal.profit);
            } else {
                showToast("❌ Ошибка: не удалось завершить сделку продажи");
            }
        } else {
            showToast("❌ Неизвестный тип сделки");
        }

        _activeDKPDeal = null;
        window.__DKP_PENDING__ = false;
        _dealActionPending = false;
    }, 1500);
}

function abortDKPDeal() {
    ModalManager.close('modalDKP');
    _activeDKPDeal = null;
    window.__DKP_PENDING__ = false;
    _dealActionPending = false;
    pendingMarketCar = null;

    showToast("Сделка отменена.");
    if (typeof playSound === 'function') playSound('error');
}

function finishMarketCarBuyProcess(deal) {
    if (!deal || !deal.carId) {
        _dealActionPending = false;
        window.__DKP_PENDING__ = false;
        return;
    }

    _dealActionPending = true;

    try {
        const car = deal.car;
        const carId = deal.carId;
        const price = deal.price || car.price || 0;

        const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
        const currentSlots = state.garage ? state.garage.length : 0;
        if (currentSlots >= maxSlots) {
            showToast(`🚫 Гараж полон! (${currentSlots}/${maxSlots} мест).`);
            return;
        }

        const liveCarIndex = (state.marketFeed || []).findIndex(c => c && c.id === carId);
        if (liveCarIndex === -1) {
            showToast("❌ Лот уже снят с продажи!");
            pendingMarketCar = null;
            if (typeof renderMarketFeed === 'function') renderMarketFeed();
            return;
        }

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

        if (typeof updateBrandReputationAfterSale === 'function') {
            const isCleanSale = !car.legalDefect && !car.rolledOdometer && !car.hiddenDefect && !car.isStolen;
            updateBrandReputationAfterSale(car.name, isCleanSale);
        }

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
        window.__DKP_PENDING__ = false;
    }
}

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

Object.assign(window, {
    initiateBuyMarketCar,
    paidCallMarketCar,
    openMarketDeal,
    startMarketTestDrive,
    renderMarketHaggleControls,
    buyCarDirectToScrapYard,
    sellCarToDarknet,
    attemptMarketHaggle,
    argueKnownDefects,
    confirmMarketPurchaseSuccess,
    finishMarketCarBuyProcess,
    openRegistrationChoiceModal,
    confirmRegistrationChoice,
    openDKPModal,
    confirmSignDKP,
    abortDKPDeal,
    downloadDKPPDF,
    disputeDKP,
    _triggerBuyerBackfire,
    resolveBackfire
});

// Только если функции еще нет в window, вешаем резерв
if (typeof window.openP2PDealModal !== 'function') {
    window.openP2PDealModal = _openP2PDealFallback;
}

window.getPendingMarketCar = () => pendingMarketCar;
window.resetPendingMarketCar = () => { pendingMarketCar = null; _dealActionPending = false; window.__DKP_PENDING__ = false; };
window.resetDKPPending = () => { window.__DKP_PENDING__ = false; _activeDKPDeal = null; _dealActionPending = false; };

console.log('[🤝 market-deal v5.1.3] Строгий запуск модалки торга у капота + сброс флагов ✓');
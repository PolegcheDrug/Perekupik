// ========================================================
// js/market/market-deal.js — ТОРГ У КАПОТА И ДКП (v5.5.0 DEEP INSPECTION & MREO GATE)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ v5.5.0:
//   - ИНТЕГРАЦИЯ ТЕСТ-ДРАЙВА: кнопка прямого запуска осмотра у капота (звук ДВС, дым, КПП).
//   - БЛОКИРОВКА МРЭО ПРИ ЗАПРЕТАХ: автомобили с ограничениями ФССП, залогами и распилами
//     нельзя поставить на официальный учет (доступен только ДКП перекупа или Даркнет/разборка).
//   - ПОЛНЫЙ ПЕРЕНОС ДАННЫХ: autotekaReport, симптомы дымности/шумов ДВС и реальный пробег.
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
    const overlays = ['modalBuyCall', 'modalMarketDeal', 'modalRegistrationChoice', 'modalDKP', 'modalBackfire', 'modalTestDrive'];
    overlays.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active');
            el.style.display = 'none';
        }
    });
};

function _forceCloseAllDealModals() {
    const list = ['modalBuyCall', 'modalMarketDeal', 'modalRegistrationChoice', 'modalDKP', 'modalBackfire', 'modalTestDrive'];
    list.forEach(id => {
        if (typeof ModalManager !== 'undefined' && typeof ModalManager.close === 'function') {
            try { ModalManager.close(id); } catch (e) {}
        }
        if (typeof closeModal === 'function') {
            try { closeModal(id); } catch (e) {}
        }
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active');
            el.style.display = 'none';
        }
    });
}

function _getPersonalGarageCount() {
    if (!state || !Array.isArray(state.garage)) return 0;
    return state.garage.filter(c => c && !c.commercialRegistered && !c.assignedBusinessId).length;
}

function _openP2PDealFallback(p2pId) {
    if (!p2pId) return;
    const toast = (m) => { if (typeof showToast === 'function') showToast(m); };

    if (!window.P2POffersManager?.createOffer) {
        return toast("❌ P2P торговля недоступна");
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

function initiateBuyMarketCar(carId) {
    if (buyCallTimeoutTimer) {
        clearTimeout(buyCallTimeoutTimer);
        buyCallTimeoutTimer = null;
    }
    if (!carId) return;

    _dealActionPending = false;
    window.__DKP_PENDING__ = false;

    let p2pItem = (state.p2pMarketListings || []).find(l => l && (
        String(l.id) === String(carId) || String(l.lot_id) === String(carId)
    ));
    if (p2pItem) {
        if (typeof window.openP2PDealModal === 'function') {
            return window.openP2PDealModal(p2pItem.id || p2pItem.lot_id);
        }
        return _openP2PDealFallback(p2pItem.id || p2pItem.lot_id);
    }

    const car = (state.marketFeed || []).find(c => c && (String(c.id) === String(carId) || c.id == carId));
    if (!car) {
        if (typeof showToast === 'function') showToast("Лот не найден.");
        return;
    }

    car.viewed = true;
    if (typeof renderMarketFeed === 'function') renderMarketFeed();

    const now = Date.now();
    if (car.cooldownUntil && car.cooldownUntil > now) {
        const left = Math.ceil((car.cooldownUntil - now) / 1000);
        return showToast(`⏳ Абонент всё ещё занят (${left}с)! Подождите.`);
    }

    if (typeof setTxt === 'function') {
        setTxt("buyCallEmoji", "📞");
        setTxt("buyCallTitle", "Звонок продавцу...");
        setTxt("buyCallDesc", "Набираем номер... Идут гудки...");
    }

    const btnBox = document.getElementById("buyCallActionBtnBox");
    if (btnBox) btnBox.innerHTML = "<button class='btn btn-dark w-full' disabled>Гудки в трубке...</button>";

    const modalCall = document.getElementById("modalBuyCall");
    if (typeof ModalManager !== 'undefined' && modalCall) {
        ModalManager.open("modalBuyCall", { closeOthers: true });
    } else if (modalCall) {
        modalCall.classList.add("active");
        modalCall.style.display = "flex";
    }

    if (typeof tgHaptic === 'function') tgHaptic('light');

    buyCallTimeoutTimer = setTimeout(() => {
        let karma = (state.player && state.player.karma !== undefined) ? state.player.karma : 50;
        let callSuccessChance = 80;
        if (karma > 65) callSuccessChance += 10;
        if (karma < 35) callSuccessChance -= 15;
        if (car.dealType === 'urgent' || car.isBeaterProject) callSuccessChance += 20;

        const roll = Math.random() * 100;

        if (roll < callSuccessChance) {
            _forceCloseAllDealModals();
            if (typeof showToast === 'function') showToast("🚗 Вы приехали по адресу и осматриваете машину у капота!");
            openMarketDeal(carId);
        } else if (roll < 93) {
            const waitSec = Math.floor(15 + Math.random() * 20);
            car.cooldownUntil = Date.now() + (waitSec * 1000);
            if (typeof setTxt === 'function') {
                setTxt("buyCallEmoji", "📵");
                setTxt("buyCallTitle", "Продавец занят");
                setTxt("buyCallDesc", "«Сейчас на работе, перезвоните через " + waitSec + " сек!»");
            }
            if (btnBox) btnBox.innerHTML = `<button onclick="_forceCloseAllDealModals()" class='btn btn-dark w-full'>Понятно</button>`;
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
            if (btnBox) btnBox.innerHTML = `<button onclick="_forceCloseAllDealModals()" class='btn btn-dark w-full'>Закрыть</button>`;
        }
    }, 450);
}

function paidCallMarketCar(carId) {
    if (!carId) return;
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < 1000) return showToast("Не хватает 1,000 ₽ на приоритетный дозвон!");
    state.player.cash -= 1000;

    const car = (state.marketFeed || []).find(c => c && (String(c.id) === String(carId) || c.id == carId));
    if (!car) return showToast("Лот уже снят с продажи!");

    car.cooldownUntil = 0;
    if (typeof saveState === 'function') saveState();
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');
    showToast("Приоритетный вызов успешен!");
    openMarketDeal(carId);
}

function openMarketDeal(carId) {
    if (!carId) return;

    const car = (state.marketFeed || []).find(c => c && (String(c.id) === String(carId) || c.id == carId));
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

    pendingMarketCar = { car: car, carId: car.id || carId };
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
                    <div class="sub-label" style="font-size:9px; margin-top:2px;">Используйте их для торга ↓</div>
                </div>
            ` : ''}
        `;
    }

    renderMarketHaggleControls();
    if (typeof ModalManager !== 'undefined') {
        ModalManager.open("modalMarketDeal", { closeOthers: true });
    } else {
        const m = document.getElementById("modalMarketDeal");
        if (m) { m.classList.add("active"); m.style.display = "flex"; }
    }
    if (typeof playSound === 'function') playSound('tick');
}

function startMarketTestDrive(carId) {
    if (!pendingMarketCar || !pendingMarketCar.car) return;
    const targetId = carId || pendingMarketCar.car.id;
    if (typeof openTestDriveModal === 'function') {
        openTestDriveModal(targetId);
    }
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

    let hasGauge = !!(state.player && (state.player.tools?.gauge || state.player.tools?.gauge_pro || state.player.hasGauge || (state.player.inventory || []).includes('gauge')));
    let hasScanner = !!(state.player && (state.player.tools?.obd || state.player.tools?.obd_launch || state.player.hasOBD || (state.player.inventory || []).includes('obd')));
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
    knownDiscountPct = Math.min(45, knownDiscountPct);

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
        <button onclick="startMarketTestDrive('${car.id}')" class="btn ${car.inspectionStatus?.testDrive ? 'btn-dark' : 'btn-cyan'} btn-sm">
            <i class="fa-solid fa-gauge-high mr-1"></i> ${car.inspectionStatus?.testDrive ? 'Тест-драйв ✓' : 'Тест-драйв'}
        </button>`;

    const gridCols = (hasGauge && hasScanner) ? 'grid-3' : ((hasGauge || hasScanner) ? 'grid-2' : 'grid-1');
    let inspectionToolsBlock = `
        <div class="${gridCols} mb-2" style="gap:6px;">
            ${toolsButtonsHtml}
        </div>
    `;

    let defectArgueBlock = '';
    if (mechDefects.length > 0 || revealedLegal) {
        defectArgueBlock = `
            <div class="p-2 mb-2" style="background:rgba(255,179,0,0.08); border-radius:8px; border:1px solid rgba(255,179,0,0.4);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-amber">💡 У вас есть ${mechDefects.length + (revealedLegal ? 1 : 0)} аргумент(ов)</b>
                    <span class="tag-badge bg-tag-amber">Скидка: -${knownDiscountPct}%</span>
                </div>
                <div class="sub-label mb-2" style="font-size:9px;">Найденные дефекты, которые можно предъявить продавцу:</div>
                ${mechDefects.slice(0, 3).map(d => `
                    <div class="sub-label mb-1" style="font-size:9px; color:#f1f5f9;">
                        • <b>${d.name}</b> (-${d.pricePenaltyPct}%)
                    </div>
                `).join('')}
                ${mechDefects.length > 3 ? `<div class="sub-label" style="font-size:8.5px; color:#94a3b8;">... и ещё ${mechDefects.length - 3}</div>` : ''}
                ${revealedLegal ? `
                    <div class="sub-label mb-1 color-red" style="font-size:9px; margin-top:4px;">
                        ⚖️ <b>${(typeof LEGAL_DEFECTS !== 'undefined' ? LEGAL_DEFECTS : []).find(l => l.id === revealedLegal)?.name || 'Юр. проблема'}</b>
                    </div>
                ` : ''}

                <button onclick="argueKnownDefects('${car.id}')" class="btn btn-amber btn-sm w-full mt-2 font-bold" ${car._defectsArgued ? 'disabled' : ''}>
                    <i class="fa-solid fa-bullhorn mr-1"></i> ${car._defectsArgued ? 'Дефекты уже предъявлены ✓' : `Предъявить дефекты (скидка -${knownDiscountPct}%)`}
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
    const estMarketVal = car.marketValue || car.baseMarketValue || Math.round(basePrice * 1.25);
    const estProfit = estMarketVal - basePrice;
    const marginClass = estProfit >= 0 ? 'color-green' : 'color-red';
    const marginIcon = estProfit >= 0 ? '▲' : '▼';

    let realMarginBlock = `
        <div class="p-2 mb-2" style="background:rgba(0,242,254,0.05); border-radius:8px; border:1px solid rgba(0,242,254,0.3);">
            <div class="flex-between text-xs mb-1">
                <span class="sub-label" style="font-size:9px;">Оценка вторичного рынка:</span>
                <b class="color-cyan" style="font-size:10px;">~${estMarketVal.toLocaleString()} ₽</b>
            </div>
            <div class="flex-between text-xs">
                <span class="sub-label" style="font-size:9px;">Потенциальный навар:</span>
                <b class="${marginClass}" style="font-size:11px;">${marginIcon} ${estProfit >= 0 ? '+' : ''}${estProfit.toLocaleString()} ₽</b>
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

function argueKnownDefects(carId) {
    if (!pendingMarketCar || !pendingMarketCar.car) return;
    const car = pendingMarketCar.car;
    if (car._defectsArgued) return showToast("Вы уже получили скидку за эти дефекты!");

    const revealed = car._revealedDefects || [];
    const revealedLegal = car._revealedLegal || null;
    const mechDefects = (car.mechanicalDefects || []).filter(d => revealed.includes(d.id));

    let totalDiscountPct = 0;
    mechDefects.forEach(d => { totalDiscountPct += (d.pricePenaltyPct || 0); });
    if (revealedLegal) totalDiscountPct += 15;

    totalDiscountPct = Math.min(35, Math.max(5, totalDiscountPct));

    const discountAmount = Math.round(car.price * (totalDiscountPct / 100));
    car.price = Math.max(15000, car.price - discountAmount);
    car._defectsArgued = true;
    car.hagglePatience = Math.max(0, (car.hagglePatience !== undefined ? car.hagglePatience : 3) - 1);

    const thread = document.getElementById("dealChatThread");
    if (thread) {
        thread.innerHTML += `
            <div class="chat-msg msg-player">«Я проверил машину приборами: есть косяки по технике и кузову! Скидывай ${totalDiscountPct}%.»</div>
            <div class="chat-msg msg-seller" style="border-left-color: var(--amber);">
                «Ладно, против фактов не попрёшь... Скидываю <b>-${discountAmount.toLocaleString()} ₽</b>!»
            </div>
        `;
        thread.scrollTop = thread.scrollHeight;
    }

    if (typeof setTxt === 'function') setTxt("dealCarPrice", `${car.price.toLocaleString()} ₽`);
    showToast(`Аргументированная скидка: -${discountAmount.toLocaleString()} ₽!`);
    if (typeof playSound === 'function') playSound('win');
    if (typeof tgHaptic === 'function') tgHaptic('success');

    renderMarketHaggleControls();
    if (typeof saveState === 'function') saveState();
}

function buyCarDirectToScrapYard(price) {
    if (!pendingMarketCar || !pendingMarketCar.car) return;
    const car = pendingMarketCar.car;
    const cash = state.player?.cash || 0;
    if (cash < price) return showToast("Не хватает денег!");

    state.player.cash -= price;
    car.unavailable = true;
    showToast(`🔩 ${car.name} выкуплен на разборку за ${price.toLocaleString()} ₽!`);
    _forceCloseAllDealModals();
    if (typeof saveState === 'function') saveState();
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
}

function sellCarToDarknet(price) {
    if (!pendingMarketCar || !pendingMarketCar.car) return;
    const car = pendingMarketCar.car;
    state.player.cash = (state.player.cash || 0) + price;
    car.unavailable = true;
    showToast(`🏴‍☠️ ${car.name} продан в Даркнет за ${price.toLocaleString()} ₽!`);
    _forceCloseAllDealModals();
    if (typeof saveState === 'function') saveState();
    if (typeof renderMarketFeed === 'function') renderMarketFeed();
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
                _forceCloseAllDealModals();
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
        car.price = Math.max(15000, car.price - disc);
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
        isRegisteredOnPlayer: false,
        buyTarget: 'personal',
        targetBizId: null,
        targetBizName: null
    };

    _forceCloseAllDealModals();
    openRegistrationChoiceModal(deal);
}

function openRegistrationChoiceModal(deal) {
    if (!deal || !deal.car) return showToast("Ошибка данных сделки");

    _activeDKPDeal = deal;
    window.__DKP_PENDING__ = false;
    _dealActionPending = false;

    const car = deal.car;
    const legal = state.player?.legalEntity || { type: 'none' };
    const docs = state.player?.documents || {};
    const hasLegal = legal.type === 'ip' || legal.type === 'ooo' || Boolean(docs.ipRegistered) || Boolean(docs.oooRegistered) || Boolean(state.player?.hasIP) || Boolean(state.player?.hasOOO);
    const legalType = hasLegal ? (legal.type !== 'none' ? legal.type : (docs.oooRegistered ? 'ooo' : 'ip')) : 'none';
    const legalConfig = window.LEGAL_ENTITIES ? window.LEGAL_ENTITIES[legalType] : null;

    const ownedBiz = (state.businesses || []).filter(b => b && (b.level > 0 || b.purchased || b.owned));
    const ownedBizIds = ownedBiz.map(b => b.id);
    let matchingBusinesses = [];

    if (typeof window.getCarBusinessSuitability === 'function') {
        const matches = window.getCarBusinessSuitability(car, ownedBizIds);
        matchingBusinesses = matches.filter(m => ownedBizIds.includes(m.id)).map(m => {
            const bObj = ownedBiz.find(b => b.id === m.id);
            return {
                bizId: m.id,
                name: bObj?.customName || bObj?.name || m.name,
                icon: m.icon || 'fa-briefcase',
                badgeColor: m.badgeColor || 'var(--cyan)'
            };
        });
    } else if (window.FLEET_CALCULATOR && ownedBizIds.length > 0) {
        const suit = window.FLEET_CALCULATOR.checkSuitability(car, ownedBizIds);
        if (suit && suit.suitable) {
            matchingBusinesses = (suit.matches || []).filter(m => m.isOwned);
        }
    }

    let modal = document.getElementById('modalRegistrationChoice');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalRegistrationChoice';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    // 🔒 ПРОВЕРКА ЮРИДИЧЕСКИХ ОГРАНИЧЕНИЙ ДЛЯ МРЭО (v5.5.0)
    const hasLegalBlocker = Boolean(
        (car.legalDefect && !car._legalResolved && ['legal_fssp', 'legal_arrest', 'legal_pledge', 'legal_pts_duplicate'].includes(car.legalDefect.id)) ||
        car.isStolen ||
        car.autotekaReport?.hasFsspRestrictions ||
        car.autotekaReport?.isPledged ||
        car.autotekaReport?.isCutFrame
    );

    let bizOptionsHtml = '';
    if (hasLegalBlocker) {
        bizOptionsHtml = `
            <div class="p-2 mb-2" style="background:rgba(220,38,38,0.12); border-radius:8px; border:1px solid var(--red);">
                <b class="text-xs color-red"><i class="fa-solid fa-ban mr-1"></i> Запрет коммерческого учёта</b>
                <div class="sub-label mt-1" style="font-size:8.5px; color:#fca5a5;">Автомобиль имеет залог, ограничения ФССП или статус распила! Постановка на баланс юрлица невозможна.</div>
            </div>
        `;
    } else if (!hasLegal) {
        bizOptionsHtml = `
            <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; opacity:0.85; border:1px dashed rgba(255,179,0,0.3);">
                <b class="text-xs color-amber"><i class="fa-solid fa-lock"></i> Покупка на юрлицо заблокирована</b>
                <div class="sub-label mt-1" style="font-size:8.5px;">Оформите ИП или ООО в Госуслугах, чтобы ставить машины на баланс коммерческих парков.</div>
            </div>
        `;
    } else if (matchingBusinesses.length === 0) {
        bizOptionsHtml = `
            <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
                <b class="text-xs color-cyan"><i class="fa-solid fa-building"></i> ${legal.companyName || docs.companyName || 'Ваша организация'}</b>
                <div class="sub-label mt-1" style="font-size:8.5px;">У вас нет открытых автобизнесов, подходящих под категорию этого автомобиля.</div>
            </div>
        `;
    } else {
        const buttons = matchingBusinesses.map(m => {
            const currentFleetCount = window.BusinessFleetModule ? window.BusinessFleetModule.getAssignedVehicles(m.bizId).length : 0;
            const maxFleet = legalConfig?.maxFleetPerBiz || 5;
            const isFull = currentFleetCount >= maxFleet;

            return `
                <div style="background:rgba(9,14,24,0.95); border:1px solid rgba(255,255,255,0.08); border-left:3px solid ${m.badgeColor}; border-radius:10px; padding:8px 12px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                            <i class="fa-solid ${m.icon}" style="color:${m.badgeColor}; font-size:12px;"></i>
                            <b style="color:#fff; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.name}</b>
                        </div>
                        <div class="sub-label" style="font-size:8.5px; color:#94a3b8;">
                            Автопарк: <b style="color:${m.badgeColor};">${currentFleetCount} из ${maxFleet}</b> ед.
                        </div>
                    </div>
                    <div style="flex-shrink:0;">
                        ${!isFull ? `
                            <button onclick="confirmRegistrationChoice('business', '${m.bizId}', '${m.name}')" class="btn btn-green btn-sm" style="width:auto !important; min-width:90px; padding:6px 12px; font-size:10px; font-weight:700; white-space:nowrap; border-radius:7px; box-shadow:0 0 10px rgba(0,230,118,0.25);">
                                На баланс
                            </button>
                        ` : `<span class="tag-badge bg-tag-red" style="padding:4px 8px; font-size:8.5px;">Парк полон</span>`}
                    </div>
                </div>
            `;
        }).join('');

        bizOptionsHtml = `
            <div class="mb-2">
                <div class="sub-label mb-1" style="font-size:9px;"><i class="fa-solid fa-briefcase color-green"></i> На баланс компании (${legalConfig?.tag || 'Юрлицо'}):</div>
                ${buttons}
            </div>
        `;
    }

    const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : (state.player?.baseSlots || 2);
    const personalSlots = _getPersonalGarageCount();
    const isPersonalFull = personalSlots >= maxSlots;

    modal.innerHTML = `
        <div class="modal-box" style="max-width:400px; padding:14px;">
            <div class="flex-between mb-2">
                <div class="modal-glow-badge" style="font-size:9px; padding:3px 8px;"><i class="fa-solid fa-file-signature"></i> ОФОРМЛЕНИЕ ТС</div>
                <button onclick="_forceCloseAllDealModals()" class="btn btn-dark btn-auto btn-sm" style="width:28px; height:28px; padding:0; display:flex; align-items:center; justify-content:center;">✕</button>
            </div>

            <div class="p-2 mb-2" style="background:#050914; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                <b class="text-xs color-cyan">${car.name}</b>
                <div class="sub-label" style="font-size:9px;">Сумма сделки: <b style="color:#fff;">${(deal.price || 0).toLocaleString()} ₽</b></div>
            </div>

            <div class="sub-label mb-2" style="font-size:9.5px;">Куда оформить приобретаемый автомобиль?</div>

            <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid rgba(0,229,255,0.25);">
                <div class="flex-between mb-1">
                    <b class="text-xs color-cyan" style="font-size:10px;"><i class="fa-solid fa-user"></i> В личный гараж (Физлицо)</b>
                    <span class="tag-badge ${isPersonalFull ? 'bg-tag-red' : 'bg-tag-cyan'}" style="font-size:7.5px;">Мест: ${personalSlots}/${maxSlots}</span>
                </div>
                <div class="sub-label mb-2" style="font-size:8.5px;">Для личной езды, гаражного тюнинга или перепродажи.</div>

                ${hasLegalBlocker ? `
                    <div class="p-1 mb-2 color-red font-bold" style="font-size:8.5px; background:rgba(220,38,38,0.12); border-radius:6px; border:1px solid var(--red);">
                        ⚠️ Внимание: У машины есть запрет приставов / залог! МРЭО откажет в регистрации.
                    </div>
                ` : ''}

                ${isPersonalFull ? `
                    <div class="p-1 text-center color-red font-bold" style="font-size:9px; background:rgba(255,51,102,0.1); border-radius:6px;">
                        🚫 Личные боксы заняты (${personalSlots}/${maxSlots}). Расширьте гараж или оформите на бизнес!
                    </div>
                ` : `
                    <div class="grid-2" style="gap:6px;">
                        <button onclick="${hasLegalBlocker ? "showToast('❌ МРЭО отказало в регистрации из-за запретов/залога!')" : "confirmRegistrationChoice('personal_mreo')"}" class="btn ${hasLegalBlocker ? 'btn-dark opacity-50' : 'btn-green'} btn-sm" style="font-size:9px; padding:6px 4px; font-weight:700;">
                            ${hasLegalBlocker ? '🚫 МРЭО Запрещено' : 'С учетом МРЭО (2,850 ₽)'}
                        </button>
                        <button onclick="confirmRegistrationChoice('personal_dkp')" class="btn btn-dark btn-sm" style="font-size:9px; padding:6px 4px; font-weight:700; border-color:var(--amber); color:var(--amber);">
                            Только ДКП (Перекуп)
                        </button>
                    </div>
                `}
            </div>

            ${bizOptionsHtml}

            <button onclick="_forceCloseAllDealModals()" class="btn btn-dark btn-sm w-full mt-1" style="padding:7px; font-size:10px;">Отмена</button>
        </div>
    `;

    modal.classList.add('active');
    modal.style.display = 'flex';
    if (typeof playSound === 'function') playSound('tick');
}

function confirmRegistrationChoice(mode, bizId = null, bizName = null) {
    if (!_activeDKPDeal) return showToast("Ошибка: сделка потеряна");

    if (mode === 'business') {
        const legal = state.player?.legalEntity || { type: 'none' };
        const docs = state.player?.documents || {};
        const hasLegal = legal.type === 'ip' || legal.type === 'ooo' || Boolean(docs.ipRegistered) || Boolean(docs.oooRegistered) || Boolean(state.player?.hasIP) || Boolean(state.player?.hasOOO);

        if (!hasLegal) {
            showToast("⚠️ Требуется зарегистрировать ИП или ООО в Госуслугах!");
            if (window.PhoneManager) window.PhoneManager.openApp('gosuslugi');
            return;
        }

        const compName = legal.companyName || docs.companyName || state.player?.companyName || (docs.oooRegistered ? 'ООО «ВЕКТОР МОТОРС»' : `ИП ${state.player?.name || 'Игрок'}`);

        _activeDKPDeal.buyTarget = 'business';
        _activeDKPDeal.targetBizId = bizId;
        _activeDKPDeal.targetBizName = bizName;
        _activeDKPDeal.buyer = compName;
        _activeDKPDeal.isRegisteredOnPlayer = true;
        showToast(`💼 Оформление на баланс «${bizName}»`);
    } else {
        const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : (state.player?.baseSlots || 2);
        const personalSlots = _getPersonalGarageCount();
        if (personalSlots >= maxSlots) {
            return showToast(`🚫 Личный гараж полон (${personalSlots}/${maxSlots})!`);
        }

        if (mode === 'personal_mreo') {
            const fee = 2850;
            if ((state.player?.cash || 0) < fee) return showToast(`Нужно ${fee} ₽ на госпошлину!`);
            state.player.cash -= fee;
            if (typeof logBankTransaction === 'function') logBankTransaction('Госпошлина МРЭО', fee, false);

            _activeDKPDeal.buyTarget = 'personal';
            _activeDKPDeal.isRegisteredOnPlayer = true;
            _activeDKPDeal.buyer = state.player?.name || "Игрок";
            showToast("✅ Оформление в МРЭО на физлицо (-2,850 ₽)");
        } else {
            _activeDKPDeal.buyTarget = 'personal';
            _activeDKPDeal.isRegisteredOnPlayer = false;
            _activeDKPDeal.buyer = state.player?.name || "Игрок";
            showToast("📄 Оформление по ДКП без постановки на учет");
        }
    }

    _forceCloseAllDealModals();
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

    const isCompany = deal.buyTarget === 'business';
    const legal = state.player?.legalEntity || {};
    const docs = state.player?.documents || {};

    const hasLegalDefect = !!(car.legalDefect && !car._legalResolved);
    const legalDefectInfo = hasLegalDefect
        ? (typeof LEGAL_DEFECTS !== 'undefined' ? LEGAL_DEFECTS.find(l => l.id === car.legalDefect.id) : null)
        : null;

    const dkpModal = document.getElementById('modalDKP');
    if (!dkpModal) return;

    const contractNum = `МРЭО-${String(Date.now()).slice(-6)}-${car.id ? String(car.id).slice(-3) : '777'}`;
    const contractDate = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const carVIN = car.vin || `XTA${String(car.id || '2107000').slice(-13).padEnd(13, '0')}`;

    const displayInn = legal.inn || docs.inn || '7701234567';
    const displayOgrn = legal.ogrn || docs.ogrn || '1207700012345';

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
                            <div class="dkp-section-title">${isCompany ? 'ПОКУПАТЕЛЬ (ЮРЛИЦО)' : 'ПОКУПАТЕЛЬ'}</div>
                            <div class="dkp-row-compact">
                                <b class="dkp-value color-cyan" id="dkpBuyerName">${buyerName}</b>
                            </div>
                            ${isCompany ? `
                                <div class="sub-label" style="font-size:7.5px; color:#94a3b8;">
                                    ИНН: ${displayInn} • ОГРН: ${displayOgrn}
                                </div>
                            ` : ''}
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
                        <span class="dkp-label">Назначение:</span>
                        <b class="dkp-value ${isCompany ? 'color-green' : 'color-amber'}">
                            ${isCompany ? `💼 Баланс (${deal.targetBizName})` : (deal.isRegisteredOnPlayer ? '✅ Личный учет МРЭО' : '📄 ДКП физлица')}
                        </b>
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
                            <span>${isCompany ? 'РЕЕСТР ЮРЛИЦ' : 'МРЭО ГИБДД'}</span>
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
                </div>
            </div>
        </div>
    `;

    dkpModal.classList.add('active');
    dkpModal.style.display = 'flex';
    if (typeof playSound === 'function') playSound('tick');
}

function downloadDKPPDF() {
    if (typeof showToast === 'function') {
        showToast("📄 Договор сохранён в буфер обмена");
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
Назначение: ${_activeDKPDeal.buyTarget === 'business' ? `Баланс компании (${_activeDKPDeal.targetBizName})` : 'Личное владение'}
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
    const hasConnections = (state.player?.connections || 0) >= 1;
    const hasMoney = (state.player?.cash || 0) >= 100000;

    if (hasConnections && Math.random() < 0.6) {
        state.player.connections -= 1;
        showToast("🤝 Решала уладил юридические проблемы (-1 связь)!");
        car.legalDefect = null;
        car._legalResolved = true;
        if (typeof playSound === 'function') playSound('win');
        setTimeout(() => { openDKPModal(_activeDKPDeal); }, 600);
    } else if (hasMoney) {
        state.player.cash -= 100000;
        car.legalDefect = null;
        car._legalResolved = true;
        if (typeof logBankTransaction === 'function') logBankTransaction('Юридическое сопровождение ДКП', 100000, false);
        showToast("💸 Юрист уладил проблемы (-100,000 ₽)!");
        if (typeof playSound === 'function') playSound('win');
        setTimeout(() => { openDKPModal(_activeDKPDeal); }, 600);
    } else {
        showToast("❌ Не хватает связей или денег для оспаривания!");
        if (typeof playSound === 'function') playSound('error');
    }
}

function confirmSignDKP() {
    if (window.__DKP_PENDING__) return;

    if (!_activeDKPDeal) {
        showToast("❌ Ошибка: сделка потеряна");
        _forceCloseAllDealModals();
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

    setTimeout(() => {
        _forceCloseAllDealModals();
        finishMarketCarBuyProcess(deal);
        _activeDKPDeal = null;
        window.__DKP_PENDING__ = false;
        _dealActionPending = false;
    }, 500);
}

function abortDKPDeal() {
    _forceCloseAllDealModals();
    _activeDKPDeal = null;
    window.__DKP_PENDING__ = false;
    _dealActionPending = false;
    pendingMarketCar = null;

    showToast("Сделка отменена.");
    if (typeof playSound === 'function') playSound('error');
}

// ⭐ НАДЁЖНОЕ ЗАВЕРШЕНИЕ СДЕЛКИ И ДОБАВЛЕНИЕ В ГАРАЖ СО ВСЕМИ ПАРАМЕТРАМИ (v5.5.0)
function finishMarketCarBuyProcess(deal) {
    if (!deal || !deal.car) {
        _dealActionPending = false;
        window.__DKP_PENDING__ = false;
        return;
    }

    _dealActionPending = true;

    try {
        const car = deal.car;
        const carId = deal.carId || car.id;
        const price = Number(deal.price ?? car.price ?? 0);
        const isBusinessBuy = deal.buyTarget === 'business' && Boolean(deal.targetBizId);

        if (!isBusinessBuy) {
            const maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : (state.player?.baseSlots || 2);
            const personalSlots = _getPersonalGarageCount();
            if (personalSlots >= maxSlots) {
                showToast(`🚫 Личный гараж полон! (${personalSlots}/${maxSlots} мест).`);
                return;
            }
        }

        const cash = state.player?.cash || 0;
        if (cash < price) {
            showToast(`💸 Не хватает ${(price - cash).toLocaleString()} ₽!`);
            return;
        }

        state.player.cash -= price;
        if (!state.player.stats) state.player.stats = {};
        state.player.stats.bought = (state.player.stats.bought || 0) + 1;
        if (!Array.isArray(state.garage)) state.garage = [];

        // Полное глубокое копирование с фиксацией характеристик
        const newCar = Object.assign({}, car);
        newCar.uid = 'car_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        newCar.id = car.id || newCar.uid;
        
        const plateVal = car.customPlate || car.plate || "ТРАНЗИТ";
        newCar.plate = plateVal;
        newCar.customPlate = plateVal;
        
        newCar.impounded = false;
        newCar.unregistered = false;
        newCar.insurance = null;
        newCar.purchaseCost = price;
        newCar.baseMarketValue = car.baseMarketValue || car.basePrice || 100000;
        newCar.wear = car.wear ? Object.assign({}, car.wear) : { engine: 85, transmission: 85 };
        newCar.isPersonal = false;
        newCar.ownershipDays = 0;
        newCar.engineTemp = 90;
        newCar.tireWear = car.tireWear !== undefined ? car.tireWear : 100;
        
        // Синхронизация флагов автотеки, симптомов и ЛКП
        newCar.actualMileage = car.actualMileage || car.mileage || 85000;
        newCar.rolledOdometer = Boolean(car.rolledOdometer);
        newCar.autotekaMileageDiscrepancy = Boolean(car.autotekaMileageDiscrepancy || car.rolledOdometer);
        newCar.hasAdditive = Boolean(car.hasAdditive);
        newCar.isRepainted = Boolean(car.isRepainted);
        newCar.isPolished = Boolean(car.isPolished);
        newCar.isMuseumStock = Boolean(car.isMuseumStock);
        newCar.isTunedSpec = Boolean(car.isTunedSpec);
        newCar.isBeaterProject = Boolean(car.isBeaterProject);
        newCar.hiddenDefect = car.hiddenDefect ? Object.assign({}, car.hiddenDefect) : null;

        // Симптомы тест-драйва и Автотека PRO
        newCar.exhaustSmoke = car.exhaustSmoke || "clean";
        newCar.engineNoise = car.engineNoise || "quiet";
        newCar.gearboxBehavior = car.gearboxBehavior || "smooth";
        newCar.autotekaReport = car.autotekaReport ? Object.assign({}, car.autotekaReport) : null;
        newCar.ptsData = car.ptsData ? Object.assign({}, car.ptsData) : null;

        newCar.tuning = car.tuning ? Object.assign({}, car.tuning) : {
            chip: 0, exhaust: false, stance: false, bodykit: false,
            rollCage: false, dragSlicks: false, hydroHandbrake: false,
            weldedDiff: false, steeringAngle: false, bucketSeats: false,
            customWheels: false, risk1251: 0
        };

        newCar.images = Array.isArray(car.images) && car.images.length > 0
            ? [...car.images]
            : (car.img ? [car.img] : []);
        if (!newCar.img && newCar.images.length > 0) newCar.img = newCar.images[0];

        if (typeof window.ensureCarIdentity === 'function') {
            try { window.ensureCarIdentity(newCar); } catch (e) {}
        }

        newCar.mechanicalDefects = Array.isArray(car.mechanicalDefects) ? [...car.mechanicalDefects] : [];
        newCar.legalDefect = car.legalDefect ? Object.assign({}, car.legalDefect) : null;
        newCar._revealedDefects = Array.isArray(car._revealedDefects) ? [...car._revealedDefects] : [];
        newCar._revealedLegal = car._revealedLegal || null;
        newCar.sellerArchetype = car.sellerArchetype || null;

        if (isBusinessBuy) {
            newCar.commercialRegistered = true;
            newCar.registeredCompany = deal.buyer;
            newCar.assignedBusinessId = deal.targetBizId;
            newCar.assignedBusinessName = deal.targetBizName;
            newCar.registrationDate = new Date().toLocaleDateString('ru-RU');
            window.garageFilter = 'commercial';
        } else {
            newCar.commercialRegistered = false;
            newCar.isRegisteredOnPlayer = !!deal.isRegisteredOnPlayer;
            newCar.assignedBusinessId = null;
            newCar.assignedBusinessName = null;
            if (window.garageFilter === 'commercial') window.garageFilter = 'all';
        }

        if (car.legalDefect && !car._legalResolved) {
            newCar._backfireDay = (state.player.day || 1) + 3 + Math.floor(Math.random() * 4);
            newCar._backfireType = car.legalDefect.id;
        }

        if (typeof recalculateCarMarketValue === 'function') {
            try { recalculateCarMarketValue(newCar); } catch (e) {}
        }

        state.garage.push(newCar);

        if (Array.isArray(state.marketFeed)) {
            state.marketFeed = state.marketFeed.filter(c => c && String(c.id) !== String(carId) && c.id != carId);
        }
        state.marketFeedVersion = (state.marketFeedVersion || 0) + 1;

        pendingMarketCar = null;

        if (typeof addXp === 'function') addXp(40);
        if (typeof trackQuestProgress === 'function') trackQuestProgress('buy_car', 1);
        if (typeof logBankTransaction === 'function') logBankTransaction(`Покупка авто: ${car.name}`, price, false);

        let msg = `✅ ${car.name} куплен за ${price.toLocaleString()} ₽!`;
        if (isBusinessBuy) msg += ` Поставлен на баланс «${deal.targetBizName}»!`;
        showToast(msg);
        if (typeof spawnFloatingReward === 'function') spawnFloatingReward(`-${price.toLocaleString()} ₽`);

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (typeof renderMarketFeed === 'function') renderMarketFeed();
        if (typeof renderGarage === 'function') renderGarage();

        setTimeout(() => {
            if (typeof switchTab === 'function') switchTab("tabGarage");
            if (typeof renderGarage === 'function') renderGarage();
        }, 250);
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
    if (typeof ModalManager !== 'undefined') {
        ModalManager.open('modalBackfire', { closeOthers: true });
    } else {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
    if (typeof playSound === 'function') playSound('error');
    if (typeof tgHaptic === 'function') tgHaptic('error');
}

function resolveBackfire(carId, action) {
    const car = (state.garage || []).find(c => c && (String(c.id) === String(carId) || c.id == carId));
    if (!car) {
        _forceCloseAllDealModals();
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
    _forceCloseAllDealModals();
}

const MarketDeal = {
    initiateBuyMarketCar,
    startCall: initiateBuyMarketCar,
    paidCallMarketCar,
    openMarketDeal,
    startMarketTestDrive,
    renderMarketHaggleControls,
    buyCarDirectToScrapYard,
    sellCarToDarknet,
    attemptMarketHaggle,
    argueKnownDefects,
    confirmMarketPurchaseSuccess,
    openRegistrationChoiceModal,
    confirmRegistrationChoice,
    openDKPModal,
    confirmSignDKP,
    abortDKPDeal,
    downloadDKPPDF,
    disputeDKP,
    _triggerBuyerBackfire,
    resolveBackfire,
    _forceCloseAllDealModals
};

window.MarketDeal = MarketDeal;

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
    openRegistrationChoiceModal,
    confirmRegistrationChoice,
    openDKPModal,
    confirmSignDKP,
    abortDKPDeal,
    downloadDKPPDF,
    disputeDKP,
    _triggerBuyerBackfire,
    resolveBackfire,
    _forceCloseAllDealModals
});

if (typeof window.openP2PDealModal !== 'function') {
    window.openP2PDealModal = _openP2PDealFallback;
}

window.getPendingMarketCar = () => pendingMarketCar;
window.resetPendingMarketCar = () => { pendingMarketCar = null; _dealActionPending = false; window.__DKP_PENDING__ = false; };
window.resetDKPPending = () => { window.__DKP_PENDING__ = false; _activeDKPDeal = null; _dealActionPending = false; };

console.log('[🤝 market-deal v5.5.0] Тест-драйв у капота + блок МРЭО при запретах ✓');

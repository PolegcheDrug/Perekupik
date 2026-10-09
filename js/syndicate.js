// ========================================================
// js/syndicate.js — P2P БИРЖА, АВТОКЛУБЫ, РЕФЕРАЛЫ И ТОП
// ========================================================

let p2pActiveFilter = 'cars';
let p2pNewListingType = 'car';

function renderSyndicateHub() {
    let subTab = state.syndicateSubTab ? state.syndicateSubTab : 'p2p';
    switchSyndicateTab(subTab);
}

function switchSyndicateTab(sub) {
    state.syndicateSubTab = sub;
    ['p2p', 'clubs', 'friends', 'leaderboard'].forEach(s => {
        const scr = document.getElementById('synScreen-' + s);
        const btn = document.getElementById('synTabBtn-' + s);
        if (scr) scr.style.display = (s === sub) ? 'block' : 'none';
        if (btn) {
            if (s === sub) {
                btn.classList.add('active');
                btn.classList.add('btn-cyan');
                btn.classList.remove('btn-dark');
            } else {
                btn.classList.remove('active');
                btn.classList.remove('btn-cyan');
                btn.classList.add('btn-dark');
            }
        }
    });

    if (sub === 'p2p') renderP2PListings();
    if (sub === 'clubs') renderClubsList();
    if (sub === 'friends') renderFriendsList();
    if (sub === 'leaderboard') renderLeaderboard();
}

// ----------------------------------------------------
// 1. P2P БИРЖА ТЕХНИКИ И НОМЕРОВ
// ----------------------------------------------------
function filterP2P(type) {
    p2pActiveFilter = type;
    const btnCars = document.getElementById('p2pFilter-cars');
    const btnPlates = document.getElementById('p2pFilter-plates');

    if (type === 'cars') {
        if (btnCars) { btnCars.className = 'btn btn-cyan btn-sm'; }
        if (btnPlates) { btnPlates.className = 'btn btn-dark btn-sm'; }
    } else {
        if (btnCars) { btnCars.className = 'btn btn-dark btn-sm'; }
        if (btnPlates) { btnPlates.className = 'btn btn-cyan btn-sm'; }
    }
    renderP2PListings();
}

function renderP2PListings() {
    const list = document.getElementById('p2pItemsList');
    if (!list) return;

    if (!state.p2pMarketListings || state.p2pMarketListings.length === 0) {
        // Дефолтные предложения игроков биржи
        state.p2pMarketListings = [
            {
                id: "p2p_1",
                seller: "Maga_GTI",
                type: "car",
                name: "VW Golf VI GTI (Stage 2)",
                price: 1350000,
                plate: "О777ОО 77",
                power: 260,
                img: "assets/cars/comfort/golf6.jpg"
            },
            {
                id: "p2p_2",
                seller: "Major_Vova",
                type: "plate",
                name: "Госномер А777АА 77",
                price: 950000,
                plate: "А777АА 77"
            },
            {
                id: "p2p_3",
                seller: "Serega_Drift",
                type: "car",
                name: "ВАЗ-2107 (Выворот + Заварка)",
                price: 180000,
                plate: "В123ВВ 77",
                power: 85,
                img: "assets/cars/economy/vaz-2107.jpg"
            },
            {
                id: "p2p_4",
                seller: "Bumer_Boy",
                type: "plate",
                name: "Госномер В001ОР 777",
                price: 650000,
                plate: "В001ОР 777"
            }
        ];
    }

    let filtered = state.p2pMarketListings.filter(item => {
        if (p2pActiveFilter === 'cars') return item.type === 'car';
        return item.type === 'plate';
    });

    if (filtered.length === 0) {
        list.innerHTML = "<div class='glass-card text-center sub-label py-6'>В этой категории биржи пока нет активных лотов.</div>";
        return;
    }

    let html = "";
    filtered.forEach(item => {
        let isMyListing = (state.myP2PListings && state.myP2PListings.includes(item.id));
        let btnAction = isMyListing 
            ? "<button onclick=\"cancelP2PListing('" + item.id + "')\" class='btn btn-danger btn-auto btn-sm'>Снять с биржи</button>"
            : "<button onclick=\"buyP2PListing('" + item.id + "')\" class='btn btn-green btn-auto btn-sm'>Купить (" + item.price.toLocaleString() + " ₽)</button>";

        if (item.type === 'car') {
            let carImg = item.img ? item.img : "assets/cars/economy/vaz-2107.jpg";
            html += 
            "<div class='glass-card mb-2'>" +
                "<div class='flex-between mb-2'>" +
                    "<div class='flex-gap' style='align-items:center;'>" +
                        "<div class='chat-avatar-circle' style='width:28px; height:28px; font-size:14px;'>👤</div>" +
                        "<div><b class='text-xs color-cyan'>" + item.seller + "</b><div class='sub-label' style='font-size:9px;'>Продавец лота</div></div>" +
                    "</div>" +
                    "<span class='tag-badge bg-tag-cyan'>АВТО P2P</span>" +
                "</div>" +
                "<div class='deal-car-preview-card mb-2'>" +
                    "<img src='" + carImg + "' class='deal-car-thumb' onerror=\"this.src='assets/cars/economy/vaz-2107.jpg'\">" +
                    "<div style='flex:1;'>" +
                        "<div class='font-bold text-xs'>" + item.name + "</div>" +
                        "<div class='license-plate text-xs' style='padding:1px 4px; margin:2px 0;'>" + item.plate + "</div>" +
                        "<div class='price-val text-xs color-green'>" + item.price.toLocaleString() + " ₽</div>" +
                    "</div>" +
                "</div>" +
                "<div class='flex-between'>" +
                    "<span class='sub-label text-xs'>Мощность: " + (item.power || 100) + " л.с.</span>" +
                    btnAction +
                "</div>" +
            "</div>";
        } else {
            html += 
            "<div class='glass-card p-2 flex-between mb-2'>" +
                "<div>" +
                    "<div class='license-plate mb-1'>" + item.plate + " <div class='license-flag'>RUS</div></div>" +
                    "<div class='sub-label text-xs'>Продавец: <b class='color-cyan'>" + item.seller + "</b></div>" +
                "</div>" +
                "<div class='text-right'>" +
                    "<div class='price-val text-xs color-green mb-1'>" + item.price.toLocaleString() + " ₽</div>" +
                    btnAction +
                "</div>" +
            "</div>";
        }
    });

    list.innerHTML = html;
}

function openCreateListingModal() {
    selectP2PListingType('car');
    const modal = document.getElementById('modalCreateP2P');
    if (modal) modal.classList.add('active');
    playSound('tick');
}

function selectP2PListingType(type) {
    p2pNewListingType = type;
    const btnCar = document.getElementById('btnP2PTypeCar');
    const btnPlate = document.getElementById('btnP2PTypePlate');
    const select = document.getElementById('p2pItemSelect');

    if (type === 'car') {
        if (btnCar) { btnCar.className = 'btn btn-cyan btn-sm'; }
        if (btnPlate) { btnPlate.className = 'btn btn-dark btn-sm'; }
        
        let opts = "";
        if (state.garage && state.garage.length > 0) {
            state.garage.forEach((c, i) => {
                let isBlocked = c.impounded || c.unregistered;
                let cPlate = c.customPlate || c.plate || "ТРАНЗИТ";
                if (!isBlocked) {
                    opts += "<option value='car_" + i + "'>" + c.name + " (" + cPlate + ")</option>";
                }
            });
        }
        if (!opts) opts = "<option value=''>Нет доступных авто в гараже</option>";
        if (select) select.innerHTML = opts;
    } else {
        if (btnCar) { btnCar.className = 'btn btn-dark btn-sm'; }
        if (btnPlate) { btnPlate.className = 'btn btn-cyan btn-sm'; }

        let opts = "";
        if (state.ownedPlates && state.ownedPlates.length > 0) {
            state.ownedPlates.forEach((p, i) => {
                opts += "<option value='plate_" + i + "'>" + p + "</option>";
            });
        }
        if (!opts) opts = "<option value=''>Нет свободных номеров в инвентаре</option>";
        if (select) select.innerHTML = opts;
    }
}

function onP2PItemSelected(val) {
    const input = document.getElementById('p2pPriceInput');
    if (!input || !val) return;

    if (val.startsWith('car_')) {
        let idx = parseInt(val.replace('car_', ''));
        let car = state.garage[idx];
        if (car) input.value = car.marketValue || car.price || 150000;
    } else if (val.startsWith('plate_')) {
        let idx = parseInt(val.replace('plate_', ''));
        let plate = state.ownedPlates[idx];
        if (plate && typeof calculatePlateValue === 'function') {
            input.value = calculatePlateValue(plate);
        }
    }
}

function confirmCreateP2PListing() {
    const select = document.getElementById('p2pItemSelect');
    const input = document.getElementById('p2pPriceInput');
    if (!select || !input) return;

    const val = select.value;
    const price = parseInt(input.value);

    if (!val) return showToast("Выберите предмет для продажи!");
    if (isNaN(price) || price <= 0) return showToast("Укажите корректную стоимость в рублях!");

    let sellerName = (state.player && state.player.name) ? state.player.name : "Вы";

    if (val.startsWith('car_')) {
        let idx = parseInt(val.replace('car_', ''));
        let car = state.garage[idx];
        if (!car) return;

        state.garage.splice(idx, 1);
        let listingId = "p2p_lot_" + Date.now();

        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        state.p2pMarketListings.unshift({
            id: listingId,
            seller: sellerName,
            type: "car",
            name: car.name,
            price: price,
            plate: car.customPlate || car.plate || "ТРАНЗИТ",
            power: car.power || 100,
            img: car.img,
            originalCarObj: car
        });

        if (!state.myP2PListings) state.myP2PListings = [];
        state.myP2PListings.push(listingId);
    } else if (val.startsWith('plate_')) {
        let idx = parseInt(val.replace('plate_', ''));
        let plate = state.ownedPlates[idx];
        if (!plate) return;

        state.ownedPlates.splice(idx, 1);
        let listingId = "p2p_lot_" + Date.now();

        if (!state.p2pMarketListings) state.p2pMarketListings = [];
        state.p2pMarketListings.unshift({
            id: listingId,
            seller: sellerName,
            type: "plate",
            name: "Госномер " + plate,
            price: price,
            plate: plate
        });

        if (!state.myP2PListings) state.myP2PListings = [];
        state.myP2PListings.push(listingId);
    }

    saveState();
    closeModal('modalCreateP2P');
    if (typeof renderGarage === 'function') renderGarage();
    renderP2PListings();
    playSound('win');
    tgHaptic('success');
    showToast("Лот успешно выставлен на онлайн P2P биржу!");
}

function buyP2PListing(listingId) {
    if (!state.p2pMarketListings) return;
    const idx = state.p2pMarketListings.findIndex(l => l.id === listingId);
    if (idx === -1) return;
    const lot = state.p2pMarketListings[idx];

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < lot.price) return showToast("Не хватает денег для выкупа лота с биржи!");

    if (lot.type === 'car') {
        let maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
        let curSlots = (state.garage && state.garage.length) ? state.garage.length : 0;
        if (curSlots >= maxSlots) return showToast("В гараже нет свободного места!");

        state.player.cash -= lot.price;
        let carObj = lot.originalCarObj ? lot.originalCarObj : {
            id: "car_p2p_" + Date.now(),
            name: lot.name,
            power: lot.power || 100,
            type: "comfort",
            price: lot.price,
            purchaseCost: lot.price,
            baseMarketValue: lot.price,
            marketValue: lot.price,
            img: lot.img,
            plate: lot.plate,
            customPlate: lot.plate,
            condition: 90,
            wear: { engine: 90, transmission: 90 },
            tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }
        };

        if (!state.garage) state.garage = [];
        state.garage.push(carObj);
    } else {
        state.player.cash -= lot.price;
        if (!state.ownedPlates) state.ownedPlates = [];
        state.ownedPlates.push(lot.plate);
    }

    state.p2pMarketListings.splice(idx, 1);
    saveState();
    updateHeaderUI();
    renderP2PListings();
    if (typeof renderGarage === 'function') renderGarage();
    playSound('win');
    tgHaptic('success');
    showToast("Лот успешно выкуплен с P2P биржи!");
}

function cancelP2PListing(listingId) {
    if (!state.p2pMarketListings) return;
    const idx = state.p2pMarketListings.findIndex(l => l.id === listingId);
    if (idx === -1) return;
    const lot = state.p2pMarketListings[idx];

    if (lot.type === 'car') {
        let maxSlots = (typeof getTotalGarageSlots === 'function') ? getTotalGarageSlots() : 2;
        let curSlots = (state.garage && state.garage.length) ? state.garage.length : 0;
        if (curSlots >= maxSlots) return showToast("В гараже нет свободного места под возврат авто!");

        let carObj = lot.originalCarObj ? lot.originalCarObj : {
            id: "car_p2p_" + Date.now(),
            name: lot.name,
            power: lot.power || 100,
            type: "comfort",
            price: lot.price,
            img: lot.img,
            plate: lot.plate,
            customPlate: lot.plate
        };

        if (!state.garage) state.garage = [];
        state.garage.push(carObj);
    } else {
        if (!state.ownedPlates) state.ownedPlates = [];
        state.ownedPlates.push(lot.plate);
    }

    state.p2pMarketListings.splice(idx, 1);
    if (state.myP2PListings) {
        state.myP2PListings = state.myP2PListings.filter(id => id !== listingId);
    }

    saveState();
    renderP2PListings();
    if (typeof renderGarage === 'function') renderGarage();
    showToast("Лот снят с продажи и возвращён в инвентарь.");
}

// ----------------------------------------------------
// 2. АВТОКЛУБЫ СИНДИКАТА
// ----------------------------------------------------
function renderClubsList() {
    const container = document.getElementById('synClubsContainer');
    const myClubNameEl = document.getElementById('synMyClubName');
    if (!container) return;

    let myClub = (state.player && state.player.club) ? state.player.club : null;
    if (myClubNameEl) {
        myClubNameEl.innerText = myClub ? myClub.name : "Без автоклуба";
    }

    const clubsPool = [
        { id: "club_jdm", name: "JDM Legends Moscow", members: 42, perk: "+10% к оценке японских авто", fee: 100000 },
        { id: "club_vaz", name: "Боевая Классика Клуб", members: 89, perk: "Бесплатный ремонт подвески на сходках", fee: 40000 },
        { id: "club_m", name: "Bavarian Power M", members: 31, perk: "+15% к победе в ночных заездах на 402м", fee: 250000 },
        { id: "club_elite", name: "Синдикат Олигархов", members: 12, perk: "-25% ко всем налогам и проверкам ГИБДД", fee: 1000000 }
    ];

    let html = "";
    clubsPool.forEach(club => {
        let isMember = myClub && myClub.id === club.id;
        let btnContent = isMember 
            ? "<button onclick='leaveClubAction()' class='btn btn-danger btn-auto btn-sm'>Покинуть</button>"
            : "<button onclick=\"joinClubAction('" + club.id + "', '" + club.name + "', " + club.fee + ")\" class='btn btn-cyan btn-auto btn-sm'>Вступить (" + (club.fee / 1000).toFixed(0) + "k ₽)</button>";

        html += 
        "<div class='glass-card p-2 flex-between mb-2'>" +
            "<div>" +
                "<b class='color-cyan text-xs'>" + club.name + "</b>" +
                "<div class='sub-label' style='font-size:10px;'>👥 Участников: " + club.members + " | " + club.perk + "</div>" +
            "</div>" +
            btnContent +
        "</div>";
    });

    container.innerHTML = html;
}

function joinClubAction(clubId, clubName, fee) {
    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < fee) return showToast("Не хватает денег на вступительный взнос!");

    state.player.cash -= fee;
    state.player.club = { id: clubId, name: clubName };
    saveState();
    updateHeaderUI();
    renderClubsList();
    playSound('win');
    tgHaptic('success');
    showToast("Вы вступили в автоклуб «" + clubName + "»!");
}

function leaveClubAction() {
    state.player.club = null;
    saveState();
    updateHeaderUI();
    renderClubsList();
    showToast("Вы покинули автоклуб.");
}

function createClubPrompt() {
    let name = prompt("Введите название нового автоклуба:");
    if (!name || !name.trim()) return;

    let cash = (state.player && state.player.cash) ? state.player.cash : 0;
    if (cash < 500000) return showToast("Нужно 500,000 ₽ на регистрацию клуба!");

    state.player.cash -= 500000;
    state.player.club = { id: "club_custom_" + Date.now(), name: name.trim() };
    saveState();
    updateHeaderUI();
    renderClubsList();
    playSound('win');
    tgHaptic('success');
    showToast("Автоклуб «" + name.trim() + "» успешно создан!");
}

// ----------------------------------------------------
// 3. РЕФЕРАЛЬНАЯ СЕТЬ (ДРУЗЬЯ В TELEGRAM)
// ----------------------------------------------------
function getReferralLink() {
    let userId = "777";
    try {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
            userId = window.Telegram.WebApp.initDataUnsafe.user.id;
        }
    } catch(e) {}
    return "https://t.me/PerekupSimBot?start=ref_" + userId;
}

function shareReferralLink() {
    const link = getReferralLink();
    const text = "Залетай со мной в «Симулятор Перекупа»! Поднимай кэш на авторынке и собирай гараж мечты.";
    const shareUrl = "https://t.me/share/url?url=" + encodeURIComponent(link) + "&text=" + encodeURIComponent(text);

    try {
        if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(shareUrl);
        } else {
            window.open(shareUrl, '_blank');
        }
    } catch(e) {
        window.open(shareUrl, '_blank');
    }
}

function copyReferralLink() {
    const link = getReferralLink();
    if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
            showToast("Ссылка скопирована в буфер обмена!");
        }).catch(() => {
            fallbackCopyText(link);
        });
    } else {
        fallbackCopyText(link);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.executeCommand('copy');
        showToast("Ссылка скопирована!");
    } catch(err) {
        showToast("Не удалось скопировать.");
    }
    document.body.removeChild(textArea);
}

function renderFriendsList() {
    const container = document.getElementById('friendsListContainer');
    const badge = document.getElementById('friendsCountBadge');
    if (!container) return;

    if (!state.friendsList || state.friendsList.length === 0) {
        state.friendsList = [
            { name: "Артем_BMW", earned: 50000, lvl: 14, date: "Сегодня" },
            { name: "Денис_Vaz", earned: 50000, lvl: 8, date: "Вчера" }
        ];
    }

    if (badge) badge.innerText = state.friendsList.length + " друзей";

    let html = "";
    state.friendsList.forEach(f => {
        html += 
        "<div class='glass-card p-2 flex-between mb-2'>" +
            "<div>" +
                "<b class='text-xs color-cyan'>" + f.name + "</b>" +
                "<div class='sub-label' style='font-size:10px;'>Уровень: " + f.lvl + " | Приглашён: " + f.date + "</div>" +
            "</div>" +
            "<span class='tag-badge bg-tag-green'>+50,000 ₽ получено</span>" +
        "</div>";
    });

    container.innerHTML = html;
}

// ----------------------------------------------------
// 4. ТОП ПЕРЕКУПОВ (ЛИДЕРБОРД)
// ----------------------------------------------------
function renderLeaderboard() {
    const container = document.getElementById('leaderboardListContainer');
    if (!container) return;

    const leaders = [
        { rank: 1, name: "Илюха DXF", profit: 142500000, lvl: 85, badge: "👑 ОЛИГАРХ" },
        { rank: 2, name: "Святой Максиман", profit: 98400000, lvl: 64, badge: "⚡ ХОЗЯИН РЫНКА" },
        { rank: 3, name: "Серёга Техно", profit: 76100000, lvl: 52, badge: "🔧 ТОП ДЕЛЕЦ" },
        { rank: 4, name: "Жиминка Пендосовская", profit: 54000000, lvl: 41, badge: "🤖 AI ПЕРЕКУП" },
        { rank: 5, name: (state.player && state.player.name) ? state.player.name : "Вы", profit: (state.player && state.player.stats && state.player.stats.totalNetProfit) ? state.player.stats.totalNetProfit : 0, lvl: (state.player && state.player.level) ? state.player.level : 1, badge: "🎯 ВЫ" }
    ];

    let html = "";
    leaders.forEach(lead => {
        let isMe = lead.rank === 5;
        let rankColor = lead.rank === 1 ? "color-amber" : (lead.rank === 2 ? "color-cyan" : (lead.rank === 3 ? "color-purple" : ""));

        html += 
        "<div class='glass-card p-2 flex-between mb-2 " + (isMe ? "border-cyan" : "") + "'>" +
            "<div class='flex-gap' style='align-items:center;'>" +
                "<b class='font-bold " + rankColor + "' style='font-size:14px; min-width:20px;'>#" + lead.rank + "</b>" +
                "<div>" +
                    "<b class='text-xs'>" + lead.name + "</b>" +
                    "<div class='sub-label' style='font-size:10px;'>Ур. " + lead.lvl + " | Чистая прибыль: <span class='color-green font-bold'>" + lead.profit.toLocaleString() + " ₽</span></div>" +
                "</div>" +
            "</div>" +
            "<span class='tag-badge " + (isMe ? "bg-tag-cyan" : "bg-tag-amber") + "'>" + lead.badge + "</span>" +
        "</div>";
    });

    container.innerHTML = html;
}

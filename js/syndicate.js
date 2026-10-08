// ===================== Вкладка: СИНДИКАТ И ЧАТ (js/syndicate.js) =====================

function switchSyndicateTab(sub) {
    state.syndicateSubTab = sub;
    ['p2p', 'clubs', 'friends', 'leaderboard'].forEach(s => {
        document.getElementById(`synTabBtn-${s}`)?.classList.toggle('active', s === sub);
        const screen = document.getElementById(`synScreen-${s}`);
        if (screen) screen.style.display = s === sub ? 'block' : 'none';
    });
    renderSyndicateHub();
}

function renderSyndicateHub() {
    if (state.syndicateSubTab === 'p2p') renderP2P();
    else if (state.syndicateSubTab === 'clubs') renderClubsSub();
    else if (state.syndicateSubTab === 'friends') renderFriendsSub();
    else if (state.syndicateSubTab === 'leaderboard') renderLeaderboardSub();
}

// ===================== 1. P2P БИРЖА =====================
function filterP2P(type) {
    state.p2pMode = type;
    document.getElementById('p2pFilter-cars')?.classList.toggle('btn-cyan', type === 'cars');
    document.getElementById('p2pFilter-cars')?.classList.toggle('btn-dark', type !== 'cars');
    document.getElementById('p2pFilter-plates')?.classList.toggle('btn-cyan', type === 'plates');
    document.getElementById('p2pFilter-plates')?.classList.toggle('btn-dark', type !== 'plates');
    renderP2P();
}

function renderP2P() {
    const c = document.getElementById('p2pItemsList'); 
    if (!c) return;
    
    if (state.player.level < 5) {
        c.innerHTML = `
            <div class="glass-card item-locked text-center py-6">
                <i class="fa-solid fa-lock" style="font-size:32px; color:var(--red); margin-bottom:10px;"></i>
                <h3 class="font-bold">Биржа закрыта</h3>
                <p class="sub-label mt-1">Доступ к P2P торговле открывается с <b>5 уровня</b> авторитета.</p>
            </div>
        `;
        return;
    }

    if (typeof OnlineBridge === 'undefined' || !OnlineBridge.mockListings) {
        c.innerHTML = `<div class="glass-card text-center sub-label py-6">Ошибка подключения к бирже.</div>`;
        return;
    }

    const items = OnlineBridge.mockListings.filter(l => state.p2pMode === 'cars' ? l.itemType === 'car' : l.itemType === 'plate');
    if (items.length === 0) { 
        c.innerHTML = `<div class="glass-card text-center sub-label py-6">Лотов нет в этой категории. Будьте первым!</div>`; 
        return; 
    }
    
    c.innerHTML = items.map(lot => {
        if (lot.itemType === 'car') {
            return `
            <div class="glass-card mb-2">
                <div class="flex-between mb-1">
                    <h4 class="font-bold">${lot.itemData.name}</h4>
                    <span class="tag-badge bg-tag-cyan">${lot.sellerName}</span>
                </div>
                <div class="sub-label mb-2">${lot.itemData.power || 100} л.с. | Оценка: ~${(lot.recommendedPrice || lot.price).toLocaleString()} ₽</div>
                <div class="flex-between mb-2">
                    <div class="license-plate">${lot.itemData.plate} <div class="license-flag">RUS</div></div>
                    <div class="price-val">${lot.price.toLocaleString()} ₽</div>
                </div>
                <button onclick="buyP2POnlineListing('${lot.id}')" class="btn btn-green w-full">Выкупить лот</button>
            </div>`;
        } else {
            return `
            <div class="glass-card flex-between mb-2">
                <div>
                    <div class="license-plate">${lot.itemData.plate} <div class="license-flag">RUS</div></div>
                    <div class="sub-label mt-1">Оценка: ~${(lot.recommendedPrice || lot.price).toLocaleString()} ₽</div>
                </div>
                <div class="text-right flex-gap">
                    <span class="price-val text-xs" style="line-height:28px;">${lot.price.toLocaleString()} ₽</span>
                    <button onclick="buyP2POnlineListing('${lot.id}')" class="btn btn-amber btn-auto btn-sm">Купить</button>
                </div>
            </div>`;
        }
    }).join('');
}

let currentP2PType = 'car';
function openCreateListingModal() {
    if (state.player.level < 5) return showToast("Выставление лотов доступно с 5 уровня!");
    selectP2PListingType('car');
    document.getElementById('modalCreateP2P')?.classList.add('active');
}

function selectP2PListingType(type) {
    currentP2PType = type;
    document.getElementById('btnP2PTypeCar')?.classList.toggle('btn-cyan', type === 'car');
    document.getElementById('btnP2PTypeCar')?.classList.toggle('btn-dark', type !== 'car');
    document.getElementById('btnP2PTypePlate')?.classList.toggle('btn-cyan', type === 'plate');
    document.getElementById('btnP2PTypePlate')?.classList.toggle('btn-dark', type !== 'plate');

    const sel = document.getElementById('p2pItemSelect'); 
    if (!sel) return;

    if (type === 'car') {
        if (state.garage.length === 0) {
            sel.innerHTML = `<option value="">Гараж пуст</option>`;
        } else {
            sel.innerHTML = state.garage.map((c, i) => `<option value="${i}">${c.name} (${c.customPlate || c.plate})</option>`).join('');
        }
    } else {
        if (!state.ownedPlates || state.ownedPlates.length === 0) {
            sel.innerHTML = `<option value="">Нет номеров в коллекции</option>`;
        } else {
            sel.innerHTML = state.ownedPlates.map((p, i) => `<option value="${i}">${p}</option>`).join('');
        }
    }
    onP2PItemSelected(sel.value);
}

function onP2PItemSelected(val) {
    const inp = document.getElementById('p2pPriceInput');
    const badge = document.getElementById('p2pRecPriceBadge');
    const hint = document.getElementById('p2pPriceHint');
    if (!inp || val === "") {
        if (badge) badge.innerText = "Оценка: 0 ₽";
        return;
    }
    const idx = parseInt(val);
    let recPrice = 100000;

    if (currentP2PType === 'car') {
        const car = state.garage[idx];
        if (car) recPrice = car.marketValue || car.price || 150000;
    } else {
        const plate = state.ownedPlates[idx];
        if (plate && typeof evaluatePlate === 'function') recPrice = evaluatePlate(plate);
    }

    inp.value = recPrice;
    if (badge) badge.innerText = `Оценка: ~${recPrice.toLocaleString()} ₽`;
    if (hint) hint.innerText = `Рекомендованный диапазон: ${Math.round(recPrice * 0.9).toLocaleString()} - ${Math.round(recPrice * 1.15).toLocaleString()} ₽`;
}

function confirmCreateP2PListing() {
    const sel = document.getElementById('p2pItemSelect');
    const price = parseInt(document.getElementById('p2pPriceInput').value);
    const announce = document.getElementById('p2pAnnounceFeed')?.checked;

    if (isNaN(price) || price <= 0) return showToast("Укажите цену лота!");
    if (!sel || sel.value === "") return showToast("Выберите предмет из списка!");

    const idx = parseInt(sel.value);
    let itemData = null;
    let rec = price;

    if (currentP2PType === 'car') {
        itemData = state.garage.splice(idx, 1)[0];
        rec = itemData.marketValue || itemData.price || 100000;
        renderGarage();
    } else {
        const plate = state.ownedPlates.splice(idx, 1)[0];
        itemData = { plate: plate };
        rec = typeof evaluatePlate === 'function' ? evaluatePlate(plate) : price;
    }

    const newLot = {
        id: 'lot_u_' + Date.now(),
        sellerId: 'me',
        sellerName: state.player.name,
        itemType: currentP2PType,
        price: price,
        recommendedPrice: rec,
        itemData: itemData
    };

    if (typeof OnlineBridge !== 'undefined' && OnlineBridge.mockListings) {
        OnlineBridge.mockListings.unshift(newLot);
    }

    if (announce && typeof OnlineBridge !== 'undefined' && OnlineBridge.mockLiveFeed) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        OnlineBridge.mockLiveFeed.push({
            id: 'msg_' + Date.now(),
            author: state.player.name,
            text: `📢 Выставил на P2P: ${currentP2PType === 'car' ? itemData.name : itemData.plate} за ${price.toLocaleString()} ₽!`,
            type: 'p2p_ad',
            time: timeStr
        });
        renderLifeChat();
    }

    closeModal('modalCreateP2P');
    saveState();
    renderP2P();
    tgHaptic('success');
    showToast("Лот успешно опубликован на бирже!");
}

function buyP2POnlineListing(lotId) {
    if (typeof OnlineBridge === 'undefined' || !OnlineBridge.mockListings) return;
    const idx = OnlineBridge.mockListings.findIndex(l => l.id === lotId);
    if (idx === -1) return showToast("Лот уже продан!");
    const lot = OnlineBridge.mockListings[idx];

    if (state.player.cash < lot.price) return showToast("Не хватает денег для выкупа лота!");
    if (lot.itemType === 'car' && state.garage.length >= getTotalGarageSlots()) return showToast("В гараже нет свободного места!");

    state.player.cash -= lot.price;
    if (lot.itemType === 'car') {
        state.garage.push({ 
            ...lot.itemData, 
            purchaseCost: lot.price, 
            customPlate: lot.itemData.plate,
            impounded: false 
        });
        renderGarage();
    } else {
        state.ownedPlates.push(lot.itemData.plate);
    }

    OnlineBridge.mockListings.splice(idx, 1);
    saveState();
    renderP2P();
    playSound('win');
    tgHaptic('success');
    openVerdictModal("КУПЛЕНО НА БИРЖЕ! 🤝", `Вы приобрели ${lot.itemType === 'car' ? lot.itemData.name : lot.itemData.plate}`, true);
}

// ===================== 2. АВТОКЛУБЫ =====================
function renderClubsSub() {
    const c = document.getElementById('synClubsContainer'); 
    if (!c) return;
    setTxt('synMyClubName', state.player.club || 'Без автоклуба');

    if (typeof OnlineBridge === 'undefined' || !OnlineBridge.mockClubs) return;

    c.innerHTML = OnlineBridge.mockClubs.map(club => {
        const isMy = state.player.club === club.name;
        return `
        <div class="club-card ${isMy ? 'my-club' : ''}">
            <div class="flex-between mb-1">
                <b class="font-bold">${club.icon} [${club.tag}] ${club.name}</b>
                <span class="tag-badge bg-tag-cyan">Ур. ${club.level}</span>
            </div>
            <p class="sub-label mb-2">${club.desc}</p>
            <div class="flex-between text-xs mb-3">
                <span>Участники: <b>${club.membersCount}/${club.maxMembers}</b></span>
                <span>Казна: <b class="color-green">${club.bank.toLocaleString()} ₽</b></span>
            </div>
            ${isMy ? 
                `<button class="btn btn-dark btn-sm" disabled>Вы состоите в этом клубе</button>` :
                `<button onclick="joinNetworkClub('${club.name}')" class="btn btn-cyan btn-sm">Вступить в клуб</button>`
            }
        </div>`;
    }).join('');
}

function joinNetworkClub(name) {
    state.player.club = name;
    saveState();
    renderClubsSub();
    tgHaptic('success');
    showToast(`Вы вступили в клуб «${name}»!`);
}

function createClubPrompt() {
    const name = prompt("Название нового автоклуба:");
    if (name && name.trim()) {
        if (state.player.cash < 500000) return showToast("Создание клуба стоит 500,000 ₽!");
        state.player.cash -= 500000;
        
        OnlineBridge.mockClubs.push({
            id: 'club_' + Date.now(),
            name: name.trim(),
            tag: name.trim().substring(0, 4).toUpperCase(),
            leader: state.player.name,
            membersCount: 1,
            maxMembers: 30,
            level: 1,
            bank: 500000,
            desc: "Перспективный независимый автоклуб",
            icon: "🔰"
        });
        joinNetworkClub(name.trim());
    }
}

// ===================== 3. РЕФЕРАЛКА (ДРУЗЬЯ) =====================
function renderFriendsSub() {
    const list = document.getElementById('friendsListContainer');
    const badge = document.getElementById('friendsCountBadge');
    if (!list || typeof OnlineBridge === 'undefined' || !OnlineBridge.mockFriends) return;
    
    if (badge) badge.innerText = `${OnlineBridge.mockFriends.length} друзей`;

    list.innerHTML = OnlineBridge.mockFriends.map(f => `
        <div class="friend-item">
            <div>
                <div class="font-bold text-xs"><span class="online-dot ${f.online ? 'dot-green' : 'dot-gray'}"></span>${f.name}</div>
                <div class="sub-label">Уровень: ${f.level} | Капитал: ${f.netWorth.toLocaleString()} ₽</div>
            </div>
            <button onclick="showToast('Прямой трейд будет доступен после синхронизации!')" class="btn btn-dark btn-auto btn-sm">Трейд 🤝</button>
        </div>
    `).join('');
}

function shareReferralLink() {
    if (typeof OnlineBridge === 'undefined') return;
    const link = OnlineBridge.getReferralLink();
    if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(link);
    } else {
        window.open(link, '_blank');
    }
}

function copyReferralLink() {
    const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "777";
    const refUrl = `https://t.me/ВАШ_БОТ?startapp=ref_${tgId}`;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(refUrl).then(() => showToast("Ссылка скопирована!")).catch(() => showToast("Готово"));
    } else {
        showToast("Ссылка: " + refUrl);
    }
}

// ===================== 4. ЛИДЕРБОРД =====================
function renderLeaderboardSub() {
    const c = document.getElementById('leaderboardListContainer'); 
    if (!c || typeof OnlineBridge === 'undefined' || !OnlineBridge.mockLeaderboard) return;

    c.innerHTML = OnlineBridge.mockLeaderboard.map(u => `
        <div class="leader-item">
            <div class="leader-rank ${u.rank === 1 ? 'rank-1' : (u.rank === 2 ? 'rank-2' : (u.rank === 3 ? 'rank-3' : ''))}">#${u.rank}</div>
            <div style="flex: 1;">
                <div class="font-bold text-xs">${u.name} <span class="tag-badge bg-tag-amber">${u.badge}</span></div>
                <div class="sub-label">Уровень: ${u.level}</div>
            </div>
            <div class="text-right">
                <div class="color-green font-bold text-xs">${u.netWorth.toLocaleString()} ₽</div>
            </div>
        </div>
    `).join('');
}

// ===================== 5. ГОРОДСКОЙ ЭФИР (ЧАТ) =====================
function renderLifeChat() {
    const feed = document.getElementById('lifeChatFeed'); 
    if (!feed || typeof OnlineBridge === 'undefined' || !OnlineBridge.mockLiveFeed) return;
    const myName = state.player.name;

    feed.innerHTML = OnlineBridge.mockLiveFeed.map(m => {
        const isMine = m.author === myName;
        return `
        <div class="chat-bubble ${isMine ? 'mine' : ''} ${m.type || ''}">
            <div class="chat-bubble-header">
                <span class="chat-bubble-author">${m.author}</span>
                <span class="chat-bubble-time">${m.time || '12:00'}</span>
            </div>
            <div class="chat-bubble-text">${m.text}</div>
        </div>`;
    }).join('');
    feed.scrollTop = feed.scrollHeight;
}

function sendChatMessageFromInput() {
    const inp = document.getElementById('feedMessageInput'); 
    if (!inp) return;
    const text = inp.value.trim(); 
    if (!text) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (typeof OnlineBridge !== 'undefined' && OnlineBridge.mockLiveFeed) {
        OnlineBridge.mockLiveFeed.push({
            id: 'msg_' + Date.now(),
            author: state.player.name,
            text: text,
            type: 'user_msg',
            time: timeStr
        });
    }
    inp.value = '';
    renderLifeChat();
    tgHaptic('light');
}
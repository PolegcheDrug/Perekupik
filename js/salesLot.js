let activeHaggleSlotIdx = null;
function upgradeExpressCapacity() {
if ((state.player?.maxExpressTickets || 25) >= 200) return showToast(`Достигнут максимум склада талонов (200 шт)!`);
const cost = typeof getExpressTicketUpgradeCost === 'function' ? getExpressTicketUpgradeCost() : 50000;
if ((state.player?.cash || 0) < cost) return showToast(`Не хватает денег! Нужно ${cost.toLocaleString()} ₽`);
state.player.cash -= cost;
state.player.maxExpressTickets = (state.player.maxExpressTickets || 25) + 25;
saveState();
renderSalesLot();
tgHaptic(`success`);
showToast(`Вместимость склада увеличена до ${state.player.maxExpressTickets} талонов!`);
}
function renderSalesLot() {
const list = document.getElementById(`salesLotList`);
if (!list) return;
setTxt(`lotCountBadge`, `${state.salesLot?.length || 0} авто на продаже`);
setTxt(`expressCountDisplay`, `${state.player?.expressTickets \vert{}\vert{} 0} / ${state.player?.maxExpressTickets || 25}`);
const upgBtn = document.getElementById(`btnUpgradeTickets`);
if (upgBtn) {
const cost = typeof getExpressTicketUpgradeCost === 'function' ? getExpressTicketUpgradeCost() : 50000;
upgBtn.innerText = (state.player?.maxExpressTickets || 25) >= 200 ? `МАКСИМУМ` : `Расширить (${(cost / 1000).toFixed(0)}k ₽)`;
if ((state.player?.maxExpressTickets || 25) >= 200) upgBtn.disabled = true;
}
const mainContent = document.querySelector(`.main-content`);
const scrollPos = mainContent ? mainContent.scrollTop : 0;
if (!state.salesLot || state.salesLot.length === 0) {
list.innerHTML = `<div class="glass-card text-center sub-label py-8">
<i class="fa-solid fa-car-on color-green mb-2" style="font-size:32px;">
</i>
<div>Площадка пуста. Выставьте авто из гаража!</div>
</div>`;
return;
}
let htmlContent = ``;
state.salesLot.forEach((slot, idx) => {
if (!slot || !slot.car) return;
const car = slot.car;
const buyer = slot.currentBuyer;
const progressPercent = Math.max(0, Math.min(100, ((30 - slot.timer) / 30) * 100));
let clientStatus = slot.timer <= 0 ? `<span class="tag-badge bg-tag-green">Клиент осматривает!</span>` : ``;
let timerBlock = ``;
let buyerBlock = ``;
if (slot.timer > 0) {
timerBlock = `
<div class="lot-progress-wrap">
  <div class="lot-progress-bar" id="lot_progress_fill_${idx}" style="width: ${progressPercent}%;">
  </div>
</div>
<div class="sub-label mb-2 text-center" id="lot_timer_text_${idx}">Ожидание покупателя: ${slot.timer}с</div>
<div class="grid-2 mb-2">
  <button onclick="speedUpLotWithTicket(${idx})" class="btn btn-purple btn-sm">🎟️ Пропуск (${state.player?.expressTickets || 0} шт)</button>
  <button onclick="speedUpLotWithStars(${idx})" class="btn btn-amber btn-sm">⭐ 5 Stars</button>
</div>`;
}
if (buyer) {
const disableHaggle = buyer.offerPrice === 0 ? `disabled` : ``;
buyerBlock = `
<div class="glass-card p-3 mb-2" style="background:#090e18; border-color:var(--cyan);">
  <div class="flex-between mb-1">
    <div class="font-bold text-xs color-cyan">${buyer.avatar} ${buyer.name}</div>
    <div class="price-val">${(buyer.offerPrice || 0).toLocaleString()} ₽</div>
  </div>
  <div class="sub-label mb-2 color-amber" style="font-style:italic;">«${buyer.preStatus || ''}»</div>
  <div class="grid-3">
    <button onclick="acceptBuyerDeal(${idx})" class="btn btn-green btn-sm">Продать</button>
    <button onclick="openHaggleSaleModal(${idx})" class="btn btn-amber btn-sm" ${disableHaggle}>Торг 🗣</button>
    <button onclick="rejectBuyerDeal(${idx})" class="btn btn-dark btn-sm">Отказать</button>
  </div>
</div>`;
}
htmlContent += `
<div class="glass-card mb-3">
  <div class="car-img-wrap" style="height:135px;">
    <img src="${car.img}" class="car-img" onerror="this.src='https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80'">
      <div class="plate-corner">
        <div class="license-plate">${car.customPlate || car.plate || 'ТРАНЗИТ'}</div>
      </div>
    </div>
    <div class="flex-between mb-2">
      <div>
        <h4 class="font-bold">${car.name || 'Автомобиль'}</h4>
        <div class="sub-label">Цена выставления: <b class="color-green">${(slot.askingPrice || 0).toLocaleString()} ₽</b>
      </div>
    </div>
    <div>${clientStatus}</div>
  </div>
  ${timerBlock}
  ${buyerBlock}
  <button onclick="withdrawFromLot(${idx})" class="btn btn-dark w-full mt-1 btn-sm">Забрать обратно в гараж</button>
</div>`;
});
list.innerHTML = htmlContent;
if (mainContent) requestAnimationFrame(() => { mainContent.scrollTop = scrollPos; });
}
function speedUpLotWithTicket(idx) {
if ((state.player?.expressTickets || 0) <= 0) {
return showToast(`Нет пропусков! Купите у Решалы или дождитесь смены дня.`);
}
state.player.expressTickets -= 1;
const slot = state.salesLot[idx];
if (!slot) return;
slot.timer = 0;
generateBuyerForSlot(slot);
saveState();
renderSalesLot();
tgHaptic(`success`);
showToast(`🎟️ Экспресс-пропуск активирован! Клиент подошёл к капоту.`);
}
function speedUpLotWithStars(idx) {
if ((state.player?.stars || 0) < 5) return showToast(`Не хватает 5 Telegram Stars ⭐!`);
state.player.stars -= 5;
const slot = state.salesLot[idx];
if (!slot) return;
slot.timer = 0;
generateBuyerForSlot(slot);
saveState();
renderSalesLot();
tgHaptic(`success`);
showToast(`⭐ VIP-покупатель сразу у капота!`);
}
function openHaggleSaleModal(idx) {
activeHaggleSlotIdx = idx;
const slot = state.salesLot[idx];
if (!slot || !slot.currentBuyer) return;
const buyer = slot.currentBuyer;
if ((state.player?.karma || 50) < (buyer.minKarma || 0)) {
return showToast(`Ваша репутация слишком низкая для торга с этим покупателем!`);
}
const riskClass = buyer.patience > 50 ? `color-green` : `color-red`;
const fillClass = buyer.patience > 50 ? `risk-low` : `risk-high`;
const html = `
<div class="modal-box">
  <h4 class="text-center mb-1">
    <i class="fa-solid fa-comments-dollar color-amber">
    </i> Торг у капота</h4>
    <div class="text-xs color-cyan text-center font-bold mb-1">${buyer.avatar} ${buyer.name}</div>
    <div class="sub-label text-center mb-2 color-amber">Предложение: <b>${(buyer.offerPrice || 0).toLocaleString()} ₽</b>
  </div>
  <div class="risk-meter-box mb-2">
    <div class="flex-between text-xs">
      <span>Терпение покупателя:</span>
      <b class="${riskClass}">${buyer.patience}%</b>
    </div>
    <div class="risk-track">
      <div class="risk-fill ${fillClass}" style="width: ${buyer.patience}%;">
      </div>
    </div>
  </div>
  <div class="space-y-2 mb-3">
    <button onclick="attemptHaggleSale('safe')" class="btn btn-dark w-full">🛡 Обосновать по кузову (+2% | Риск 15%)</button>
    <button onclick="attemptHaggleSale('firm')" class="btn btn-dark w-full">🔥 Давить на эксклюзив (+6% | Риск 45%)</button>
  </div>
  <button onclick="closeModal('modalHaggleSale')" class="btn btn-dark w-full">Назад к предложению</button>
</div>`;
document.getElementById(`modalHaggleSale`).innerHTML = html;
document.getElementById(`modalHaggleSale`).classList.add(`active`);
}
function attemptHaggleSale(strategy) {
if (activeHaggleSlotIdx === null) return;
const slot = state.salesLot[activeHaggleSlotIdx];
if (!slot || !slot.currentBuyer) return;
const buyer = slot.currentBuyer;
const lvl = state.player?.level || 1;
let priceBoost = 0;
let patienceHit = 0;
let failChance = 0;
const hardModifier = lvl >= 20 ? 1.35 : (lvl <= 5 ? 0.85 : 1.0);
if (strategy === 'safe') {
priceBoost = 0.02;
patienceHit = Math.round(15 * hardModifier);
failChance = 0.15 * hardModifier;
} else if (strategy === 'firm') {
priceBoost = 0.06;
patienceHit = Math.round(35 * hardModifier);
failChance = 0.40 * hardModifier;
}
if (Math.random() < failChance || buyer.patience - patienceHit <= 0) {
closeModal(`modalHaggleSale`);
rejectBuyerDeal(activeHaggleSlotIdx);
return showToast(`😡 Покупатель развернулся и ушёл!`);
} else {
buyer.offerPrice = Math.min(slot.askingPrice, Math.round(buyer.offerPrice * (1 + priceBoost)));
buyer.patience -= patienceHit;
openHaggleSaleModal(activeHaggleSlotIdx);
showToast(`Удалось накинуть цену, но терпение падает!`);
}
}
function generateBuyerForSlot(slot) {
if (typeof EXPANDED_BUYERS_POOL === 'undefined') return;
const b = EXPANDED_BUYERS_POOL[Math.floor(Math.random() * EXPANDED_BUYERS_POOL.length)];
const car = slot.car;
const plateVal = typeof calculatePlateValue === 'function' ? calculatePlateValue(car.customPlate || car.plate) : 0;
const realMarketVal = (car.baseMarketValue || car.price || 150000) + plateVal;
let rate = Math.min(1.05, b.rate + 0.05);
let fairPrice = Math.round(realMarketVal * rate);
let finalOffer = Math.min(slot.askingPrice, fairPrice);
slot.currentBuyer = {
name: b.name,
avatar: b.avatar,
type: b.type,
minKarma: b.minKarma || 0,
offerPrice: finalOffer,
preStatus: b.preStatus,
rejectSay: b.rejectSay,
patience: 100
};
}
function acceptBuyerDeal(idx) {
const slot = state.salesLot[idx];
if (!slot || !slot.currentBuyer) return;
const buyer = slot.currentBuyer;
const car = slot.car;
if (car.isStolen) {
const hasRoof = (state.player?.policeImmunityDays || 0) > 0;
if (!hasRoof && (['inspector', 'regular'].includes(buyer.type) || Math.random() < 0.45)) {
tgHaptic(`error`);
state.salesLot.splice(idx, 1);
state.player.cash = Math.max(0, state.player.cash - 150000);
state.player.karma = Math.max(0, (state.player.karma || 50) - 20);
saveState();
renderSalesLot();
openVerdictModal(
`🚨 ОБЛАВА ПРИ ПРОДАЖЕ!`,
`Покупатель (${buyer.name}) сверил VIN по базам ГИБДД и вызвал наряд! Автомобиль «${car.name}» конфискован в пользу государства, наложен штраф 150,000 ₽.`,
false
);
return;
} else if (hasRoof) {
showToast(`🛡️ Крыша Решалы отвела проверку VIN!`);
}
}
const cost = car.purchaseCost || car.basePrice || Math.round(buyer.offerPrice * 0.9);
const netProfit = buyer.offerPrice - cost;
state.player.cash += buyer.offerPrice;
state.player.stats.sold = (state.player.stats.sold || 0) + 1;
state.player.stats.totalNetProfit = (state.player.stats.totalNetProfit || 0) + netProfit;
if (netProfit >= 0) state.player.stats.profitableSales = (state.player.stats.profitableSales || 0) + 1;
else state.player.stats.lossSales = (state.player.stats.lossSales || 0) + 1;
addXp(35);
state.salesLot.splice(idx, 1);
saveState();
renderSalesLot();
openVerdictModal(`СДЕЛКА ЗАКРЫТА! 🎉`, `${buyer.name} забрал «${car.name}»!`, true, buyer.offerPrice, netProfit);
}
function rejectBuyerDeal(idx) {
const slot = state.salesLot[idx];
if (!slot) return;
slot.currentBuyer = null;
slot.timer = 30;
saveState();
renderSalesLot();
showToast(`Ждём следующего покупателя...`);
}
function withdrawFromLot(idx) {
const slot = state.salesLot.splice(idx, 1)[0];
if (!state.garage) state.garage = [];
state.garage.push(slot.car);
saveState();
renderGarage();
renderSalesLot();
showToast(`Автомобиль возвращен в бокс гаража.`);
}
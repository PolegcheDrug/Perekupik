// ========================================================
// js/phone-barn.js — ПРИЛОЖЕНИЕ «ПОИСК В САРАЯХ» (v0.6.0)
// Разведка заброшенных гаражей, дачных сараев и ангаров
// с ежедневным суточным кулдауном и шансом дропа раритетов.
// ========================================================

const AppBarn = {
    render(container) {
        const pDay = state.player?.day || 1;
        const lastDay = state.player?.lastBarnDay || 0;
        const canScoutToday = lastDay < pDay;
        const lvl = state.player?.level || 1;

        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-screwdriver-wrench color-amber mr-1"></i> Находки в сараях</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2 flex-between">
                    <div>
                        <b class="text-xs color-amber">Разведка заброшек</b>
                        <div class="sub-label" style="font-size:10px;">Шанс найти ретро-классику и архивные номера!</div>
                    </div>
                    <span class="tag-badge bg-tag-amber">1 раз/сутки</span>
                </div>
        `;

        (typeof BARN_TIERS_CONFIG !== 'undefined' ? BARN_TIERS_CONFIG : []).forEach(b => {
            let isLvlLocked = lvl < b.reqLvl;
            let isDoneToday = !canScoutToday;
            let rareCar = (typeof BARN_FINDS !== 'undefined' && BARN_FINDS[b.rareIdx]) ? BARN_FINDS[b.rareIdx] : { name: "Раритет" };
            let imgSrc = b.img || `assets/barns/barn_tier${b.tier}.jpg`;
            let fallbackSrc = b.fallback || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80';

            let statusBadge = isLvlLocked 
                ? `<span class='tag-badge bg-tag-red'><i class='fa-solid fa-lock'></i> С ${b.reqLvl} УР</span>`
                : (isDoneToday ? "<span class='tag-badge bg-tag-amber'>Осмотрено</span>" : "<span class='tag-badge bg-tag-green'>Доступно</span>");

            let btnDisabled = (isLvlLocked || isDoneToday) ? "disabled" : "";
            let btnText = isLvlLocked ? `Требуется ${b.reqLvl} уровень` : (isDoneToday ? "Осмотрено (Сброс в 00:00 🌙)" : `Вскрыть ангар (${(b.cost / 1000).toFixed(0)}k ₽)`);

            html += `
                <div class="glass-card mb-3 p-2 ${b.classGrade}">
                    <div class="car-img-wrap mb-2" style="height:120px; position:relative;">
                        <img src="${imgSrc}" class="car-img" onerror="this.onerror=null; this.src='${fallbackSrc}';">
                        <div class="badge-tag badge-br">${statusBadge}</div>
                    </div>
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan">${b.title}</b>
                        <span class="price-val text-xs color-amber">${b.cost.toLocaleString()} ₽</span>
                    </div>
                    <p class="sub-label mb-2" style="font-size:10px;">${b.desc}</p>
                    <div class="text-xs mb-1 color-amber">⭐ Редкий дроп (5%): <b>${rareCar.name}</b></div>
                    <div class="text-xs mb-2 color-purple">🏷️ Архивные номера: <b>15% шанс</b></div>
                    <button onclick="scoutBarnTier(${b.tier}); AppBarn.render(document.getElementById('phoneAppContainer'));" class="btn btn-cyan btn-sm w-full" ${btnDisabled}>${btnText}</button>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }
};

window.AppBarn = AppBarn;
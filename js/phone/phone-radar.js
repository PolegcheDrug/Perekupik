// ========================================================
// js/phone-radar.js — ПРИЛОЖЕНИЕ «РАДАР ДПС» (v0.6.0)
// Мониторинг рейдов дорожной полиции, счетчик заездов 
// и экстренный вызов крыши при угрозе конфискации.
// ========================================================

const AppRadar = {
    render(container) {
        let immunity = state.player?.policeImmunityDays || 0;
        let races = state.player?.consecutiveRaces || 0;
        let maxRaces = state.player?.maxRacesBeforeRaid || 12;

        let statusText = immunity > 0 
            ? `<span class="color-green font-bold">Иммунитет (${immunity} дн.)</span>` 
            : `<span class="color-amber font-bold">Рейды активны</span>`;

        let progressPct = Math.min(100, (races / maxRaces) * 100);
        let barClass = races >= maxRaces - 2 ? "risk-high" : (races >= Math.floor(maxRaces / 2) ? "fill-biz-stock" : "fill-biz-lvl");

        container.innerHTML = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-tower-broadcast color-red mr-1"></i> ДПС Радар</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
                <div class="glass-card mb-2 p-2">
                    <div class="flex-between mb-2">
                        <b class="text-xs">Статус рейдов:</b>
                        ${statusText}
                    </div>
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label">Внимание ДПС на 402м:</span>
                        <b class="${races > 8 ? 'color-red' : 'color-green'}">${races} / ${maxRaces} заездов</b>
                    </div>
                    <div class="biz-progress-track mb-2">
                        <div class="biz-progress-fill ${barClass}" style="width:${progressPct}%;"></div>
                    </div>
                    <p class="sub-label mb-2" style="font-size:10px;">При превышении лимита спецбатальон ДПС устраивает облаву на споте и конфискует боевой автомобиль на штрафстоянку!</p>
                    <button onclick="PhoneManager.openApp('darknet')" class="btn btn-purple btn-sm w-full">Купить крышу в Даркнете</button>
                </div>

                <div class="glass-card p-2">
                    <div class="flex-between mb-1">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-satellite-dish"></i> Городские посты и камеры</b>
                        <span class="tag-badge bg-tag-cyan">Мониторинг</span>
                    </div>
                    <div class="sub-label" style="font-size:9.5px; line-height:1.4;">
                        • МКАД, внешнее кольцо — экипаж с мобильным шумомером (замер выхлопа)<br>
                        • Парковка у ТЦ — патруль проверяет угол выворота колёс и заварку<br>
                        • Промзона, 402 метра — дежурит спецрота перехвата
                    </div>
                </div>
            </div>
        `;
    }
};

window.AppRadar = AppRadar;
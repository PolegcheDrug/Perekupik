// ========================================================
// js/phone-port.js — ПРИЛОЖЕНИЕ «ПОРТ И КОНТЕЙНЕРЫ» (v0.6.0)
// Таможенные контейнеры, импорт японских и европейских авто,
// а также закрытые слепые аукционы ФССП.
// ========================================================

const AppPort = {
    render(container) {
        let lvl = state.player?.level || 1;
        let isLocked = lvl < 12;

        let html = `
            <div class="phone-app-header">
                <button onclick="PhoneManager.goHome()" class="phone-back-btn"><i class="fa-solid fa-chevron-left"></i> Назад</button>
                <div class="phone-app-title"><i class="fa-solid fa-box-open color-purple mr-1"></i> Порт & Контейнеры</div>
                <div style="width:40px;"></div>
            </div>
            <div class="phone-app-body">
        `;

        if (isLocked) {
            html += `
                <div class="glass-card text-center p-4 my-auto">
                    <div class="radar-spinner-ring mb-3" style="border-top-color: var(--purple); border-right-color: var(--cyan);">
                        <div class="radar-spinner-center">🚢</div>
                    </div>
                    <div class="modal-glow-badge mb-2" style="color:var(--purple); border-color:rgba(192,132,252,0.4); background:rgba(192,132,252,0.1);">
                        ТАМОЖНЯ ОПЕЧАТАНА
                    </div>
                    <h3 class="font-bold color-purple mb-1">Доступ с 12 Уровня!</h3>
                    <p class="sub-label mb-3" style="font-size:10.5px; line-height:1.45;">
                        Ваш текущий уровень авторитета: <b>${lvl} из 12</b>.<br>
                        Контейнеры из Японии, Германии и аукционов США станут доступны после набора авторитета!
                    </p>
                    <button onclick="PhoneManager.goHome()" class="btn btn-dark btn-sm w-full">На рабочий стол</button>
                </div>
            </div>`;
            container.innerHTML = html;
            return;
        }

        html += `
            <div class="glass-card mb-2 p-2" style="background: radial-gradient(circle, rgba(220, 38, 38, 0.2) 0%, #0b101a 100%); border-color: rgba(220, 38, 38, 0.4);">
                <div class="flex-between mb-1">
                    <b class="color-red text-xs"><i class="fa-solid fa-gavel"></i> Слепой аукцион ФССП</b>
                    <span class="tag-badge bg-tag-red">Слепой лот</span>
                </div>
                <p class="sub-label mb-2" style="font-size:10px;">Машина под чехлом. Неизвестен пробег и скрытые дефекты.</p>
                <button onclick="openBlindAuctionModal()" class="btn btn-danger btn-sm w-full">Перейти к торгам</button>
            </div>

            <div class="glass-card p-2">
                <div class="flex-between mb-2">
                    <b class="text-xs color-purple"><i class="fa-solid fa-ship"></i> Портовые Контейнеры</b>
                    <span class="sub-label" style="font-size:10px;">Таможня Кобе / Copart</span>
                </div>
                <div id="containersListRender"></div>
            </div>
        </div>`;

        container.innerHTML = html;
        if (typeof renderContainersList === 'function') {
            renderContainersList();
        }
    }
};

window.AppPort = AppPort;
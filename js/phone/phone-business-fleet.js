// ========================================================
// js/phone/phone-business-fleet.js — АВТОПАРКИ, КЛАССЫ И НАЛОГИ (v2.1.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ========================================================

const BusinessFleetModule = {
    /**
     * Возвращает прикрепленные к конкретному бизнесу машины из гаража
     */
    getAssignedVehicles(bizId) {
        if (!window.state?.garage) return [];
        return window.state.garage.filter(c => c && c.assignedBusinessId === bizId);
    },

    /**
     * Считает суммарный суточный доход автопарка для бизнеса с вычетом налога
     */
    calculateFleetIncomeForBiz(bizId) {
        const vehicles = this.getAssignedVehicles(bizId);
        if (vehicles.length === 0) return { gross: 0, tax: 0, net: 0, count: 0 };

        const legal = window.state?.player?.legalEntity || { type: 'ip' };
        let totalGross = 0;
        let totalTax = 0;
        let totalNet = 0;

        vehicles.forEach(car => {
            const isReg = Boolean(car.commercialRegistered);
            const calc = window.FLEET_CALCULATOR
                ? window.FLEET_CALCULATOR.calculateCarDailyIncome(car, bizId, legal.type, isReg)
                : { grossIncome: 5000, taxDeduction: 300, netIncome: 4700 };

            totalGross += calc.grossIncome;
            totalTax += calc.taxDeduction;
            totalNet += calc.netIncome;
        });

        return {
            gross: Math.round(totalGross),
            tax: Math.round(totalTax),
            net: Math.round(totalNet),
            count: vehicles.length
        };
    },

    /**
     * Рендер окна управления автопарком
     */
    renderFleetManagerModal(bizId) {
        const biz = (window.state?.businesses || []).find(b => b && b.id === bizId);
        if (!biz) return;

        const req = window.BUSINESS_FLEET_REQUIREMENTS ? window.BUSINESS_FLEET_REQUIREMENTS[bizId] : null;
        if (!req) return showToast("Этот бизнес не поддерживает коммерческий автопарк");

        const legal = window.state?.player?.legalEntity || { type: 'none' };
        const legalConfig = window.LEGAL_ENTITIES ? window.LEGAL_ENTITIES[legal.type] : null;
        const maxLimit = legalConfig?.maxFleetPerBiz || 5;

        const assigned = this.getAssignedVehicles(bizId);
        const stats = this.calculateFleetIncomeForBiz(bizId);

        let modal = document.getElementById('modalBizFleet');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalBizFleet';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        let assignedListHtml = '';
        if (assigned.length === 0) {
            assignedListHtml = `<div class="sub-label text-center py-4">На линии пока нет машин. Добавьте подходящий транспорт из гаража.</div>`;
        } else {
            assigned.forEach(car => {
                const isReg = Boolean(car.commercialRegistered);
                const incomeInfo = window.FLEET_CALCULATOR
                    ? window.FLEET_CALCULATOR.calculateCarDailyIncome(car, bizId, legal.type, isReg)
                    : { netIncome: 5000 };

                assignedListHtml += `
                    <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid ${isReg ? 'rgba(0,230,118,0.25)' : 'rgba(255,179,0,0.3)'};">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-cyan">${car.brand || ''} ${car.name || car.model || 'Авто'}</b>
                            <span class="tag-badge ${isReg ? 'bg-tag-green' : 'bg-tag-amber'}">
                                ${isReg ? 'В строю' : 'Без учета МРЭО (-50%)'}
                            </span>
                        </div>
                        <div class="flex-between sub-label mb-2" style="font-size:9.5px;">
                            <span>Класс: <b>${(car.category || car.type || 'economy').toUpperCase()}</b></span>
                            <span>Доход: <b class="color-green">+${incomeInfo.netIncome.toLocaleString()} ₽/день</b></span>
                        </div>
                        <button onclick="BusinessFleetModule.unassignVehicle('${car.id || car.vin}', '${bizId}')" class="btn btn-dark btn-sm w-full opacity-70">
                            Снять с линии в гараж
                        </button>
                    </div>
                `;
            });
        }

        const availableFromGarage = (window.state?.garage || []).filter(c => {
            if (c.assignedBusinessId) return false;
            const res = window.FLEET_CALCULATOR ? window.FLEET_CALCULATOR.checkSuitability(c, [bizId]) : { suitable: true };
            return res.suitable;
        });

        let availableHtml = '';
        if (availableFromGarage.length === 0) {
            availableHtml = `<div class="sub-label text-center py-2" style="font-size:9.5px;">В гараже нет подходящих свободных машин. Купите их на авторынке!</div>`;
        } else {
            availableFromGarage.forEach(c => {
                const isReg = Boolean(c.commercialRegistered);
                availableHtml += `
                    <div class="p-2 mb-1 flex-between" style="background:#090e18; border-radius:6px;">
                        <div>
                            <b class="text-xs" style="font-size:10px;">${c.brand || ''} ${c.name || c.model}</b>
                            <div class="sub-label" style="font-size:8.5px;">${(c.category || 'economy').toUpperCase()} • Сост: ${c.condition || 100}% • ${isReg ? 'МРЭО ✓' : 'Физлицо'}</div>
                        </div>
                        <button onclick="BusinessFleetModule.assignVehicle('${c.id || c.vin}', '${bizId}')" class="btn btn-green btn-sm" style="padding:4px 8px; font-size:9.5px;">
                            На линию
                        </button>
                    </div>
                `;
            });
        }

        modal.innerHTML = `
            <div class="modal-box" style="max-width:440px;">
                <div class="flex-between mb-2">
                    <div class="modal-glow-badge" style="color:var(--cyan); border-color:var(--cyan);">
                        <i class="fa-solid ${req.icon}"></i> АВТОПАРК: ${biz.customName || biz.name}
                    </div>
                    <button onclick="ModalManager.close('modalBizFleet')" class="btn btn-dark btn-auto btn-sm">✕</button>
                </div>

                <div class="glass-card p-2 mb-2 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0,230,118,0.15), #090e18);">
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label">Машин на линии:</span>
                        <b>${assigned.length} / ${maxLimit}</b>
                    </div>
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label">Грязная выручка:</span>
                        <b class="color-amber">+${stats.gross.toLocaleString()} ₽/д</b>
                    </div>
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label">Налог юрлица (${(legalConfig?.taxRate || 0.06) * 100}%):</span>
                        <b class="color-red">-${stats.tax.toLocaleString()} ₽/д</b>
                    </div>
                    <div class="flex-between text-xs pt-1" style="border-top:1px dashed rgba(255,255,255,0.1);">
                        <span class="font-bold">ЧИСТЫЙ ДОХОД ФЛОТА:</span>
                        <b class="color-green font-bold" style="font-size:13px;">+${stats.net.toLocaleString()} ₽/день</b>
                    </div>
                </div>

                <div class="sub-label mb-1" style="font-size:9.5px;"><i class="fa-solid fa-car"></i> Машины в работе:</div>
                <div style="max-height:160px; overflow-y:auto; margin-bottom:10px;">
                    ${assignedListHtml}
                </div>

                <div class="sub-label mb-1" style="font-size:9.5px;"><i class="fa-solid fa-warehouse"></i> Свободный транспорт в гараже:</div>
                <div style="max-height:120px; overflow-y:auto; margin-bottom:10px;">
                    ${availableHtml}
                </div>

                <button onclick="ModalManager.close('modalBizFleet')" class="btn btn-dark w-full">Закрыть</button>
            </div>
        `;

        if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modalBizFleet', { closeOthers: true });
        } else {
            modal.classList.add('active');
            modal.style.display = 'flex';
        }
    },

    assignVehicle(carIdentifier, bizId) {
        const car = (window.state?.garage || []).find(c => (c.id === carIdentifier || c.vin === carIdentifier));
        if (!car) return showToast("Машина не найдена");

        const legal = window.state?.player?.legalEntity || { type: 'none' };
        const legalConfig = window.LEGAL_ENTITIES ? window.LEGAL_ENTITIES[legal.type] : null;
        const maxLimit = legalConfig?.maxFleetPerBiz || 5;

        const currentCount = this.getAssignedVehicles(bizId).length;
        if (currentCount >= maxLimit) {
            return showToast(`Лимит автопарка (${maxLimit} машин) исчерпан! Для расширения оформите ООО.`);
        }

        const biz = (window.state?.businesses || []).find(b => b && b.id === bizId);

        car.assignedBusinessId = bizId;
        car.assignedBusinessName = biz?.customName || biz?.name || 'Бизнес';

        if (typeof saveState === 'function') saveState();
        if (window.AudioFx) window.AudioFx.play('win');
        showToast(`✅ ${car.brand || ''} ${car.name || car.model} отправлен на линию!`);

        this.renderFleetManagerModal(bizId);
        if (window.PhoneBusiness) window.PhoneBusiness.render(document.getElementById('phoneAppContainer'));
    },

    unassignVehicle(carIdentifier, bizId) {
        const car = (window.state?.garage || []).find(c => (c.id === carIdentifier || c.vin === carIdentifier));
        if (!car) return showToast("Машина не найдена");

        car.assignedBusinessId = null;
        car.assignedBusinessName = null;

        if (typeof saveState === 'function') saveState();
        if (window.AudioFx) window.AudioFx.play('tick');
        showToast("Машина возвращена в личный гараж");

        this.renderFleetManagerModal(bizId);
        if (window.PhoneBusiness) window.PhoneBusiness.render(document.getElementById('phoneAppContainer'));
    }
};

window.BusinessFleetModule = BusinessFleetModule;
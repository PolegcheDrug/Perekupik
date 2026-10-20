// ========================================================
// js/phone/phone-business-fleet.js — АВТОПАРКИ, ШТАТ И ЦЕХ ТОЧКИ (v3.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
//
// ⭐ v3.0.0 (ИНДИВИДУАЛЬНЫЙ АВТОПАРК, ШТАТ И ЦЕХ ДЛЯ КАЖДОГО БИЗНЕСА):
//   1. Персональный автопарк точки: допуск строго по лицензии (запрет купе
//      и грузовиков в такси, допуск фур в ТК), экспресс-ТО сломанных машин.
//   2. Персональный штат точки: найм управляющего, мастера и охраны
//      индивидуально под конкретный бизнес с автономной зарплатой и перками.
//   3. Персональный цех: 3 ветки профильного оборудования для каждого бизнеса.
//   4. Сетевая синергия марок автопарка (VAG, LADA, Корея, ГАЗ, КамАЗ).
// ========================================================

const BusinessFleetModule = {
    // Каталог специалистов для персонального найма в точку
    pointStaffCatalog: [
        { id: 'manager', name: 'Управляющий филиала', icon: 'fa-user-tie', salary: 12000, incomeBonus: 15, desc: '+15% к выручке, контроль сырья' },
        { id: 'master', name: 'Старший мастер смены', icon: 'fa-wrench', salary: 8500, incomeBonus: 10, desc: '+10% к кассе, экономит 20% сырья' },
        { id: 'security', name: 'Пост охраны ЧОП', icon: 'fa-shield-halved', salary: 5000, incomeBonus: 0, desc: '100% защита точки от краж и ночных проверок' }
    ],

    /**
     * Определение бренда/концерна автомобиля для расчета синергии
     */
    detectCarBrandFamily(car) {
        if (!car) return 'unknown';
        const str = ((car.brand || '') + ' ' + (car.name || '') + ' ' + (car.model || '')).toLowerCase();

        if (str.includes('volkswagen') || str.includes('vw') || str.includes('skoda') || str.includes('audi') || str.includes('golf') || str.includes('octavia') || str.includes('passat')) {
            return 'vag';
        }
        if (str.includes('ваз') || str.includes('vaz') || str.includes('lada') || str.includes('лада') || str.includes('granta') || str.includes('vesta') || str.includes('priora') || str.includes('жигули') || str.includes('210')) {
            return 'lada';
        }
        if (str.includes('toyota') || str.includes('тойота') || str.includes('lexus') || str.includes('camry') || str.includes('corolla') || str.includes('mark')) {
            return 'toyota';
        }
        if (str.includes('hyundai') || str.includes('kia') || str.includes('хёндэ') || str.includes('киа') || str.includes('solaris') || str.includes('rio') || str.includes('k5')) {
            return 'korea';
        }
        if (str.includes('газ') || str.includes('gaz') || str.includes('газель') || str.includes('соболь') || str.includes('газон')) {
            return 'gaz';
        }
        if (str.includes('камаз') || str.includes('kamaz')) {
            return 'kamaz';
        }
        if (str.includes('bmw') || str.includes('бмв')) {
            return 'bmw';
        }
        if (str.includes('mercedes') || str.includes('мерседес') || str.includes('benz')) {
            return 'mercedes';
        }

        return (car.brand || 'other').toLowerCase();
    },

    /**
     * Расчет монобрендового синергетического бонуса парка
     */
    detectBrandSynergy(vehicles, bizId) {
        if (!Array.isArray(vehicles) || vehicles.length < 2) {
            return { active: false, multiplier: 1.0, label: 'Нет синергии', desc: 'Добавьте 2+ машины одной марки для бонуса сети' };
        }

        const counts = {};
        vehicles.forEach(c => {
            const family = this.detectCarBrandFamily(c);
            if (family && family !== 'unknown' && family !== 'other') {
                counts[family] = (counts[family] || 0) + 1;
            }
        });

        let topFamily = null;
        let maxCount = 0;
        Object.keys(counts).forEach(f => {
            if (counts[f] > maxCount) {
                maxCount = counts[f];
                topFamily = f;
            }
        });

        if (maxCount >= 2 && topFamily) {
            const synergyConfigs = {
                vag: { name: 'VAG Group (Skoda / VW / Audi)', mul: 1.15, perk: '+15% к выручке за комфорт и высокий рейтинг у клиентов' },
                lada: { name: 'Отечественный парк (LADA / ВАЗ)', mul: 1.12, perk: '+12% к марже за счёт дешёвого обслуживания' },
                korea: { name: 'Корейский Альянс (Kia / Hyundai)', mul: 1.14, perk: '+14% к выручке за надёжность на линии' },
                toyota: { name: 'Японский Синдикат (Toyota / Lexus)', mul: 1.16, perk: '+16% к выручке за статус и безаварийность' },
                gaz: { name: 'Коммерческий Флот (ГАЗ / ГАЗель)', mul: 1.18, perk: '+18% к грузообороту и заказам' },
                kamaz: { name: 'Тяжелый Конвой (КамАЗ)', mul: 1.20, perk: '+20% к выручке по магистральным тендерам' }
            };

            const cfg = synergyConfigs[topFamily] || { name: topFamily.toUpperCase(), mul: 1.10, perk: '+10% к кассе парка' };
            const isFullFleet = maxCount === vehicles.length;

            return {
                active: true,
                family: topFamily,
                count: maxCount,
                total: vehicles.length,
                isFullFleet: isFullFleet,
                multiplier: isFullFleet ? cfg.mul : 1 + ((cfg.mul - 1) * 0.65),
                label: `Синергия: ${cfg.name} (${maxCount}/${vehicles.length})`,
                desc: cfg.perk
            };
        }

        return { active: false, multiplier: 1.0, label: 'Разношерстный парк', desc: 'Соберите парк одной марки для бонуса до +20% к кассе' };
    },

    /**
     * Валидация пригодности машины для конкретного предприятия
     */
    validateVehicleForBiz(car, bizId) {
        if (!car) return { valid: false, reason: "Транспортное средство не определено" };

        const category = (car.category || car.type || 'economy').toLowerCase();
        const condition = Number(car.condition !== undefined ? car.condition : 100);
        const nameStr = ((car.brand || '') + ' ' + (car.name || '') + ' ' + (car.model || '')).toLowerCase();

        if (car.hasArrest || car.hasPledge || car.isStolen) {
            return { valid: false, reason: "Машина под арестом или в розыске! Сначала решите вопрос с документами." };
        }

        if (bizId === 'taxi') {
            const forbidden = ['truck', 'moto', 'scooter', 'atv', 'yacht', 'hyper'];
            if (forbidden.includes(category)) {
                return { valid: false, reason: "В таксопарк нельзя оформлять грузовики, мототехнику, суперкары и водный транспорт!" };
            }
            if (nameStr.includes('купе') || nameStr.includes('coupe') || car.doors === 2) {
                return { valid: false, reason: "В такси принимаются только 4-х и 5-дверные пассажирские кузова!" };
            }
            if (condition < 40) {
                return { valid: false, reason: `Состояние авто (${condition}%) слишком низкое для перевозки пассажиров (нужно от 40%).` };
            }
        } else if (bizId === 'delivery') {
            const allowed = ['scooter', 'moto', 'economy', 'comfort', 'truck'];
            if (!allowed.includes(category) && !nameStr.includes('каблук') && !nameStr.includes('фургон')) {
                return { valid: false, reason: "Для доставки подходят только малолитражки, каблучки, фургоны или скутеры!" };
            }
            if (category === 'hyper' || category === 'yacht' || category === 'premium') {
                return { valid: false, reason: "Премиальные суперкары и яхты не подходят для курьерских доставок!" };
            }
        } else if (bizId === 'transport_company') {
            const isTruck = category === 'truck' || nameStr.includes('газель') || nameStr.includes('тягач') || nameStr.includes('камаз') || nameStr.includes('магистрал') || nameStr.includes('scania') || nameStr.includes('volvo') || nameStr.includes('фура');
            if (!isTruck) {
                return { valid: false, reason: "В Транспортную компанию принимаются только грузовики, фургоны и магистральные тягачи!" };
            }
            if (condition < 45) {
                return { valid: false, reason: `Грузовик не пройдет предрейсовый контроль! Состояние: ${condition}% (нужно от 45%).` };
            }
        } else if (bizId === 'tow_truck') {
            const isTowSuitable = category === 'truck' || nameStr.includes('эвакуатор') || nameStr.includes('газель') || nameStr.includes('газон') || nameStr.includes('пикап');
            if (!isTowSuitable) {
                return { valid: false, reason: "Службе эвакуации требуется грузовая платформа или спецтранспорт!" };
            }
        } else if (bizId === 'razborka') {
            if (category === 'yacht' || category === 'hyper') {
                return { valid: false, reason: "Гиперкары и яхты не принимаются на обычную авторазборку!" };
            }
        }

        return { valid: true };
    },

    getAssignedVehicles(bizId) {
        if (!window.state?.garage) return [];
        return window.state.garage.filter(c => c && c.assignedBusinessId === bizId);
    },

    /**
     * Считает суммарный суточный доход автопарка для бизнеса с вычетом налога и бонусом синергии
     */
    calculateFleetIncomeForBiz(bizId) {
        const vehicles = this.getAssignedVehicles(bizId);
        if (vehicles.length === 0) return { gross: 0, tax: 0, net: 0, count: 0, workingCount: 0, brokenCount: 0, synergy: null };

        const legal = window.state?.player?.legalEntity || { type: 'ip' };
        const synergy = this.detectBrandSynergy(vehicles, bizId);
        const synergyMul = synergy.active ? synergy.multiplier : 1.0;

        let totalGross = 0;
        let totalTax = 0;
        let totalNet = 0;
        let brokenCount = 0;

        vehicles.forEach(car => {
            const condition = Number(car.condition !== undefined ? car.condition : 100);
            
            if (condition < 40) {
                brokenCount++;
                return;
            }

            const isReg = Boolean(car.commercialRegistered);
            let calc = { grossIncome: 5000, taxDeduction: 300, netIncome: 4700 };

            if (window.FLEET_CALCULATOR && typeof window.FLEET_CALCULATOR.calculateCarDailyIncome === 'function') {
                calc = window.FLEET_CALCULATOR.calculateCarDailyIncome(car, bizId, legal.type, isReg);
            }

            const boostedGross = Math.round(calc.grossIncome * synergyMul);
            const legalConfig = window.LEGAL_ENTITIES ? window.LEGAL_ENTITIES[legal.type] : { taxRate: 0.06 };
            const boostedTax = Math.round(boostedGross * (legalConfig?.taxRate || 0.06));
            const boostedNet = Math.max(0, boostedGross - boostedTax);

            totalGross += boostedGross;
            totalTax += boostedTax;
            totalNet += boostedNet;
        });

        return {
            gross: Math.round(totalGross),
            tax: Math.round(totalTax),
            net: Math.round(totalNet),
            count: vehicles.length,
            workingCount: vehicles.length - brokenCount,
            brokenCount: brokenCount,
            synergy: synergy
        };
    },

    /**
     * Рендер модалки персонального автопарка
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
        const synergy = stats.synergy || this.detectBrandSynergy(assigned, bizId);

        let modal = document.getElementById('modalBizFleet');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalBizFleet';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        let synergyBadgeHtml = '';
        if (synergy.active) {
            synergyBadgeHtml = `
                <div class="p-2 mb-2" style="background: rgba(0, 242, 254, 0.1); border: 1px solid var(--cyan); border-radius: 8px;">
                    <div class="flex-between">
                        <b class="text-xs color-cyan"><i class="fa-solid fa-network-wired mr-1"></i> ${synergy.label}</b>
                        <span class="tag-badge bg-tag-cyan font-bold">+${Math.round((synergy.multiplier - 1) * 100)}% К КАССЕ</span>
                    </div>
                    <div class="sub-label mt-1" style="font-size: 9px; line-height: 1.3;">${synergy.desc}</div>
                </div>
            `;
        }

        let assignedListHtml = '';
        if (assigned.length === 0) {
            assignedListHtml = `<div class="sub-label text-center py-4">На линии пока нет машин. Добавьте подходящий транспорт из гаража.</div>`;
        } else {
            assigned.forEach(car => {
                const isReg = Boolean(car.commercialRegistered);
                const condition = Number(car.condition !== undefined ? car.condition : 100);
                const isBroken = condition < 40;

                const incomeInfo = window.FLEET_CALCULATOR
                    ? window.FLEET_CALCULATOR.calculateCarDailyIncome(car, bizId, legal.type, isReg)
                    : { netIncome: 5000 };

                const boostedNet = Math.round(incomeInfo.netIncome * (synergy.active ? synergy.multiplier : 1.0));

                let statusBadge = `<span class="tag-badge bg-tag-green">В строю</span>`;
                if (isBroken) {
                    statusBadge = `<span class="tag-badge bg-tag-red">🚨 Простой: Нужен ремонт</span>`;
                } else if (!isReg) {
                    statusBadge = `<span class="tag-badge bg-tag-amber">Без учета МРЭО (-50%)</span>`;
                }

                let serviceBtnHtml = '';
                if (condition < 85) {
                    const serviceCost = Math.round((100 - condition) * 450);
                    serviceBtnHtml = `
                        <button onclick="BusinessFleetModule.serviceFleetVehicle('${car.id || car.vin}', '${bizId}', ${serviceCost})" class="btn btn-amber btn-sm" style="font-size: 9px; padding: 3px 6px;">
                            🔧 ТО (${serviceCost.toLocaleString()} ₽)
                        </button>
                    `;
                }

                assignedListHtml += `
                    <div class="p-2 mb-2" style="background:#090e18; border-radius:8px; border:1px solid ${isBroken ? 'var(--red)' : (isReg ? 'rgba(0,230,118,0.25)' : 'rgba(255,179,0,0.3)')};">
                        <div class="flex-between mb-1">
                            <b class="text-xs color-cyan">${car.brand || ''} ${car.name || car.model || 'Авто'}</b>
                            ${statusBadge}
                        </div>
                        <div class="flex-between sub-label mb-2" style="font-size:9.5px;">
                            <span>Класс: <b>${(car.category || car.type || 'economy').toUpperCase()}</b> • Сост: <b class="${condition < 50 ? 'color-red' : 'color-green'}">${condition}%</b></span>
                            <span>Доход: <b class="${isBroken ? 'color-red' : 'color-green'}">${isBroken ? '0 ₽ (сломан)' : `+${boostedNet.toLocaleString()} ₽/день`}</b></span>
                        </div>
                        <div class="grid-2" style="gap:4px;">
                            ${serviceBtnHtml}
                            <button onclick="BusinessFleetModule.unassignVehicle('${car.id || car.vin}', '${bizId}')" class="btn btn-dark btn-sm opacity-70" style="font-size:9px; padding:3px 6px;">
                                Снять в гараж
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        const availableFromGarage = (window.state?.garage || []).filter(c => {
            if (c.assignedBusinessId) return false;
            const validation = this.validateVehicleForBiz(c, bizId);
            return validation.valid;
        });

        let availableHtml = '';
        if (availableFromGarage.length === 0) {
            availableHtml = `<div class="sub-label text-center py-2" style="font-size:9.5px;">В гараже нет подходящих свободных машин. Купите их на авторынке в соответствии со стандартами!</div>`;
        } else {
            availableFromGarage.forEach(c => {
                const isReg = Boolean(c.commercialRegistered);
                const family = this.detectCarBrandFamily(c);
                const isSynergyMatch = synergy.active && synergy.family === family;

                availableHtml += `
                    <div class="p-2 mb-1 flex-between" style="background:#090e18; border-radius:6px; ${isSynergyMatch ? 'border-left: 3px solid var(--cyan);' : ''}">
                        <div>
                            <b class="text-xs" style="font-size:10px;">${c.brand || ''} ${c.name || c.model}</b>
                            <div class="sub-label" style="font-size:8.5px;">
                                ${(c.category || 'economy').toUpperCase()} • Сост: ${c.condition || 100}% • ${isReg ? 'МРЭО ✓' : 'Физлицо'}
                                ${isSynergyMatch ? '<b class="color-cyan ml-1">+Синергия!</b>' : ''}
                            </div>
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

                ${synergyBadgeHtml}

                <div class="glass-card p-2 mb-2 text-center" style="background: radial-gradient(circle at 50% 0%, rgba(0,230,118,0.15), #090e18);">
                    <div class="flex-between text-xs mb-1">
                        <span class="sub-label">Машин на линии:</span>
                        <b>${stats.workingCount} из ${assigned.length} (Лимит: ${maxLimit})</b>
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

                <div class="sub-label mb-1" style="font-size:9.5px;"><i class="fa-solid fa-car"></i> Транспорт на балансе предприятия (${assigned.length}):</div>
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

    serviceFleetVehicle(carIdentifier, bizId, cost) {
        const car = (window.state?.garage || []).find(c => (c.id === carIdentifier || c.vin === carIdentifier));
        if (!car) return showToast("Машина не найдена");

        const playerCash = Number(window.state?.player?.cash) || 0;
        if (playerCash < cost) {
            if (window.AudioFx) window.AudioFx.play('error');
            return showToast(`Не хватает денег на ТО: нужно ${cost.toLocaleString()} ₽!`);
        }

        window.state.player.cash -= cost;
        car.condition = 100;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`ТО коммерческого авто: ${car.name || car.model}`, cost, false);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`✅ Автомобиль полностью обслужен и вернулся в рейс!`);

        this.renderFleetManagerModal(bizId);
        if (window.PhoneBusiness && window.PhoneBusiness.selectedBizId === bizId) {
            window.PhoneBusiness.render(document.getElementById('phoneAppContainer'));
        }
    },

    assignVehicle(carIdentifier, bizId) {
        const car = (window.state?.garage || []).find(c => (c.id === carIdentifier || c.vin === carIdentifier));
        if (!car) return showToast("Машина не найдена");

        const validation = this.validateVehicleForBiz(car, bizId);
        if (!validation.valid) {
            if (window.AudioFx) window.AudioFx.play('error');
            return showToast(`❌ ${validation.reason}`);
        }

        const legal = window.state?.player?.legalEntity || { type: 'none' };
        const legalConfig = window.LEGAL_ENTITIES ? window.LEGAL_ENTITIES[legal.type] : null;
        const maxLimit = legalConfig?.maxFleetPerBiz || 5;

        const currentCount = this.getAssignedVehicles(bizId).length;
        if (currentCount >= maxLimit) {
            if (window.AudioFx) window.AudioFx.play('error');
            return showToast(`Лимит автопарка (${maxLimit} машин) исчерпан! Для расширения оформите ООО.`);
        }

        const biz = (window.state?.businesses || []).find(b => b && b.id === bizId);

        car.assignedBusinessId = bizId;
        car.assignedBusinessName = biz?.customName || biz?.name || 'Бизнес';

        if (typeof saveState === 'function') saveState();
        if (window.AudioFx) window.AudioFx.play('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`✅ ${car.brand || ''} ${car.name || car.model} отправлен на линию!`);

        this.renderFleetManagerModal(bizId);
        if (window.PhoneBusiness && window.PhoneBusiness.selectedBizId === bizId) {
            window.PhoneBusiness.render(document.getElementById('phoneAppContainer'));
        }
    },

    unassignVehicle(carIdentifier, bizId) {
        const car = (window.state?.garage || []).find(c => (c.id === carIdentifier || c.vin === carIdentifier));
        if (!car) return showToast("Машина не найдена");

        car.assignedBusinessId = null;
        car.assignedBusinessName = null;

        if (typeof saveState === 'function') saveState();
        if (window.AudioFx) window.AudioFx.play('tick');
        showToast("Машина снята с линии и возвращена в личный гараж");

        this.renderFleetManagerModal(bizId);
        if (window.PhoneBusiness && window.PhoneBusiness.selectedBizId === bizId) {
            window.PhoneBusiness.render(document.getElementById('phoneAppContainer'));
        }
    },

    /**
     * Персональный найм штата для конкретной точки
     */
    hirePointStaff(bizId, staffId) {
        const biz = (window.state?.businesses || []).find(b => b && b.id === bizId);
        if (!biz) return;

        const sObj = this.pointStaffCatalog.find(s => s.id === staffId);
        if (!sObj) return;

        if (!biz.pointStaff) biz.pointStaff = {};
        if (biz.pointStaff[staffId]) return showToast("Специалист уже нанят на этом объекте!");

        const playerCash = Number(window.state?.player?.cash) || 0;
        if (playerCash < sObj.salary) {
            if (window.AudioFx) window.AudioFx.play('error');
            return showToast(`Не хватает денег на первый оклад: нужно ${sObj.salary.toLocaleString()} ₽!`);
        }

        window.state.player.cash -= sObj.salary;
        biz.pointStaff[staffId] = true;

        if (typeof logBankTransaction === 'function') {
            logBankTransaction(`Найм: ${sObj.name} в «${biz.customName || biz.name}»`, sObj.salary, false);
        }

        if (typeof saveState === 'function') saveState();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        if (window.AudioFx) window.AudioFx.play('win');
        if (typeof tgHaptic === 'function') tgHaptic('success');
        showToast(`✅ ${sObj.name} приступил к работе на объекте!`);

        if (window.PhoneBusiness && window.PhoneBusiness.selectedBizId === bizId) {
            window.PhoneBusiness.render(document.getElementById('phoneAppContainer'));
        }
    }
};

window.BusinessFleetModule = BusinessFleetModule;

console.log('[🚛 phone-business-fleet v3.0.0] Загружен: Индивидуальный автопарк и штат точек ✓');

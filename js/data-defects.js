// ========================================================
// js/data-defects.js — ЕДИНЫЙ КАТАЛОГ ДЕФЕКТОВ И ЮРИДИЧЕСКИХ ПРОБЛЕМ (v1.0.0)
// Разработчики: Tak Toje, Max, Sergo, gemini, Илья Чепиль
// ⭐ 42 механических дефекта + 12 юридических проблем для рынка 2.0
//   Каждый дефект: detectMethod, cost, severity, penalty, consequence
// ========================================================

const DEFECT_CATEGORIES = {
    ENGINE:     'Двигатель',
    TRANSMISSION: 'АКПП / МКПП',
    BODY:       'Кузов и ЛКП',
    ELECTRICAL: 'Электрика',
    SUSPENSION: 'Подвеска и рулевое',
    INTERIOR:   'Салон',
    LEGAL:      'Юридические проблемы'
};

// --------------------------------------------------------
// УРОВНИ ОБНАРУЖЕНИЯ
// visual       — заметно при визуальном осмотре (бесплатно)
// gauge        — требует толщиномер (5k, ресурс)
// obd          — требует сканер OBD2 (Launch или ELM)
// endoscope    — требует видеоэндоскоп
// compression  — требует компрессометр
// autoteka     — требует отчёт Автотеки (5k)
// autoteka_pro — требует расширенный VIN-отчёт (15k)
// expert       — требует полной экспертизы (60k)
// --------------------------------------------------------
const DEFECT_DETECT_METHODS = {
    visual:       { name: 'Визуальный осмотр',           cost: 0,     tool: null },
    gauge:        { name: 'Толщиномер ЛКП',              cost: 0,     tool: 'gauge' },
    obd:          { name: 'Сканер OBD2 (Launch)',        cost: 0,     tool: 'obd_launch' },
    endoscope:    { name: 'Видеоэндоскоп цилиндров',     cost: 0,     tool: 'endoscope' },
    compression:  { name: 'Компрессометр',               cost: 0,     tool: 'compressor' },
    autoteka:     { name: 'Отчёт Автотеки',              cost: 5000,  tool: null },
    autoteka_pro: { name: 'Расширенный VIN-отчёт',       cost: 15000, tool: null },
    expert:       { name: 'Полная экспертиза на подъёмнике', cost: 60000, tool: null }
};

// --------------------------------------------------------
// 42 МЕХАНИЧЕСКИХ ДЕФЕКТА
// --------------------------------------------------------
const MECHANICAL_DEFECTS = [

    // ═══════════ ДВИГАТЕЛЬ (12) ═══════════
    {
        id: 'eng_oil_leak_valve',
        category: 'ENGINE',
        name: 'Течь масла через прокладку клапанной крышки',
        desc: 'Масло сочится на горячий выпускной коллектор, запах гари под капотом.',
        detectMethod: 'visual',
        cost: 4500,
        severity: 'Низкая',
        probability: 0.14,
        pricePenaltyPct: 4,
        driveRisk: 5
    },
    {
        id: 'eng_knock_hydro',
        category: 'ENGINE',
        name: 'Стук гидрокомпенсаторов',
        desc: 'Цокающий звук на холодную, пропадает через 30 секунд.',
        detectMethod: 'visual',
        cost: 18000,
        severity: 'Средняя',
        probability: 0.10,
        pricePenaltyPct: 7,
        driveRisk: 10
    },
    {
        id: 'eng_oil_burn',
        category: 'ENGINE',
        name: 'Повышенный расход масла на угар',
        desc: 'Сизый дым из выхлопа, 1л на 1000км.',
        detectMethod: 'visual',
        cost: 55000,
        severity: 'Высокая',
        probability: 0.08,
        pricePenaltyPct: 12,
        driveRisk: 25
    },
    {
        id: 'eng_timing_chain',
        category: 'ENGINE',
        name: 'Растянута цепь ГРМ',
        desc: 'Металлический шелест, возможен пропуск зубьев и загнутые клапаны.',
        detectMethod: 'obd',
        obdCode: 'P0016',
        cost: 85000,
        severity: 'Критическая',
        probability: 0.05,
        pricePenaltyPct: 18,
        driveRisk: 45
    },
    {
        id: 'eng_turbo_underboost',
        category: 'ENGINE',
        name: 'Недодув турбины',
        desc: 'Потеря мощности после 3500 об/мин, чек на приборке.',
        detectMethod: 'obd',
        obdCode: 'P0299',
        cost: 65000,
        severity: 'Высокая',
        probability: 0.07,
        pricePenaltyPct: 15,
        driveRisk: 30
    },
    {
        id: 'eng_head_gasket',
        category: 'ENGINE',
        name: 'Пробита прокладка ГБЦ',
        desc: 'Эмульсия в масле, пузыри в расширительном бачке.',
        detectMethod: 'compression',
        cost: 120000,
        severity: 'Критическая',
        probability: 0.03,
        pricePenaltyPct: 25,
        driveRisk: 55
    },
    {
        id: 'eng_rings_worn',
        category: 'ENGINE',
        name: 'Износ поршневых колец',
        desc: 'Низкая компрессия, повышенный расход топлива и масла.',
        detectMethod: 'compression',
        cost: 95000,
        severity: 'Высокая',
        probability: 0.06,
        pricePenaltyPct: 18,
        driveRisk: 35
    },
    {
        id: 'eng_rich_mixture',
        category: 'ENGINE',
        name: 'Богатая топливная смесь',
        desc: 'Черный нагар на свечах, повышенный расход.',
        detectMethod: 'obd',
        obdCode: 'P0171',
        cost: 4000,
        severity: 'Средняя',
        probability: 0.09,
        pricePenaltyPct: 5,
        driveRisk: 8
    },
    {
        id: 'eng_coil_fail',
        category: 'ENGINE',
        name: 'Пропуски зажигания (катушка)',
        desc: 'Троение на ХХ, потеря тяги.',
        detectMethod: 'obd',
        obdCode: 'P0300',
        cost: 11000,
        severity: 'Средняя',
        probability: 0.11,
        pricePenaltyPct: 6,
        driveRisk: 12
    },
    {
        id: 'eng_catalyst_dead',
        category: 'ENGINE',
        name: 'Закоксованный катализатор',
        desc: 'Ошибка по эффективности катализатора, потеря мощности.',
        detectMethod: 'obd',
        obdCode: 'P0420',
        cost: 25000,
        severity: 'Средняя',
        probability: 0.08,
        pricePenaltyPct: 7,
        driveRisk: 15
    },
    {
        id: 'eng_radiator_leak',
        category: 'ENGINE',
        name: 'Микротрещины радиатора',
        desc: 'Медленная утечка антифриза, пятна под машиной.',
        detectMethod: 'visual',
        cost: 14000,
        severity: 'Средняя',
        probability: 0.10,
        pricePenaltyPct: 5,
        driveRisk: 15
    },
    {
        id: 'eng_carbon_deposits',
        category: 'ENGINE',
        name: 'Слой нагара на впускных клапанах',
        desc: 'Слышны детонационные стуки при разгоне, потеря мощности.',
        detectMethod: 'endoscope',
        cost: 35000,
        severity: 'Средняя',
        probability: 0.12,
        pricePenaltyPct: 6,
        driveRisk: 12
    },

    // ═══════════ АКПП / МКПП (8) ═══════════
    {
        id: 'trans_fluid_burnt',
        category: 'TRANSMISSION',
        name: 'Горелое масло АКПП',
        desc: 'Запах горелого от щупа АКПП, темный цвет.',
        detectMethod: 'visual',
        cost: 15000,
        severity: 'Средняя',
        probability: 0.13,
        pricePenaltyPct: 6,
        driveRisk: 20
    },
    {
        id: 'trans_slip_1_2',
        category: 'TRANSMISSION',
        name: 'Пробуксовка при 1→2 передаче',
        desc: 'Задержка переключения, рывки.',
        detectMethod: 'obd',
        obdCode: 'P0700',
        cost: 45000,
        severity: 'Высокая',
        probability: 0.09,
        pricePenaltyPct: 12,
        driveRisk: 30
    },
    {
        id: 'trans_torque_conv',
        category: 'TRANSMISSION',
        name: 'Износ гидротрансформатора',
        desc: 'Вибрация на скорости 80–100 км/ч.',
        detectMethod: 'obd',
        cost: 85000,
        severity: 'Высокая',
        probability: 0.05,
        pricePenaltyPct: 15,
        driveRisk: 35
    },
    {
        id: 'trans_clutch_worn',
        category: 'TRANSMISSION',
        name: 'Изношено сцепление (МКПП)',
        desc: 'Схватывает в самом конце, запах гари при старте.',
        detectMethod: 'visual',
        cost: 25000,
        severity: 'Средняя',
        probability: 0.11,
        pricePenaltyPct: 7,
        driveRisk: 15
    },
    {
        id: 'trans_synchro',
        category: 'TRANSMISSION',
        name: 'Хруст синхронизаторов 2-й передачи',
        desc: 'Хруст при включении 2-й на холодную.',
        detectMethod: 'visual',
        cost: 40000,
        severity: 'Средняя',
        probability: 0.08,
        pricePenaltyPct: 8,
        driveRisk: 18
    },
    {
        id: 'trans_mechatronic',
        category: 'TRANSMISSION',
        name: 'Сбои мехатроника DSG',
        desc: 'Рывки на низких скоростях, аварийный режим.',
        detectMethod: 'obd',
        cost: 140000,
        severity: 'Критическая',
        probability: 0.04,
        pricePenaltyPct: 22,
        driveRisk: 45
    },
    {
        id: 'trans_leak_seal',
        category: 'TRANSMISSION',
        name: 'Течь сальника хвостовика',
        desc: 'Масляные пятна под задней частью КПП.',
        detectMethod: 'visual',
        cost: 8000,
        severity: 'Низкая',
        probability: 0.10,
        pricePenaltyPct: 3,
        driveRisk: 5
    },
    {
        id: 'trans_rear_diff_worn',
        category: 'TRANSMISSION',
        name: 'Износ редуктора заднего моста',
        desc: 'Гул на скорости 60–80 км/ч.',
        detectMethod: 'visual',
        cost: 55000,
        severity: 'Высокая',
        probability: 0.07,
        pricePenaltyPct: 10,
        driveRisk: 25
    },

    // ═══════════ КУЗОВ И ЛКП (8) ═══════════
    {
        id: 'body_hidden_rust_sill',
        category: 'BODY',
        name: 'Скрытая ржавчина на порогах',
        desc: 'Скрытая коррозия под пластиковыми накладками.',
        detectMethod: 'gauge',
        cost: 45000,
        severity: 'Высокая',
        probability: 0.14,
        pricePenaltyPct: 12,
        driveRisk: 0
    },
    {
        id: 'body_hidden_rust_arch',
        category: 'BODY',
        name: 'Сквозная коррозия арок',
        desc: 'Пузыри ЛКП на арках, лечится только сваркой.',
        detectMethod: 'visual',
        cost: 38000,
        severity: 'Высокая',
        probability: 0.13,
        pricePenaltyPct: 10,
        driveRisk: 0
    },
    {
        id: 'body_thick_putty',
        category: 'BODY',
        name: 'Толстый слой шпаклёвки (>500 мкм)',
        desc: 'Скрытая маскировка серьёзных ДТП.',
        detectMethod: 'gauge',
        cost: 60000,
        severity: 'Высокая',
        probability: 0.18,
        pricePenaltyPct: 15,
        driveRisk: 0
    },
    {
        id: 'body_repainted_panel',
        category: 'BODY',
        name: 'Перекрашенная панель',
        desc: 'Толщина ЛКП 300+ мкм, отличается оттенок.',
        detectMethod: 'gauge',
        cost: 20000,
        severity: 'Средняя',
        probability: 0.22,
        pricePenaltyPct: 6,
        driveRisk: 0
    },
    {
        id: 'body_structural_repair',
        category: 'BODY',
        name: 'Следы кузовного ремонта лонжеронов',
        desc: 'Сварные швы в моторном отсеке.',
        detectMethod: 'expert',
        cost: 120000,
        severity: 'Критическая',
        probability: 0.06,
        pricePenaltyPct: 25,
        driveRisk: 15
    },
    {
        id: 'body_door_misalign',
        category: 'BODY',
        name: 'Нарушены зазоры дверей',
        desc: 'Неравномерные зазоры, скрип при закрытии.',
        detectMethod: 'visual',
        cost: 15000,
        severity: 'Средняя',
        probability: 0.09,
        pricePenaltyPct: 5,
        driveRisk: 0
    },
    {
        id: 'body_glass_chip',
        category: 'BODY',
        name: 'Скол на лобовом стекле',
        desc: 'Трещина на пассажирской стороне.',
        detectMethod: 'visual',
        cost: 12000,
        severity: 'Низкая',
        probability: 0.16,
        pricePenaltyPct: 3,
        driveRisk: 0
    },
    {
        id: 'body_underside_rust',
        category: 'BODY',
        name: 'Коррозия днища и лонжеронов снизу',
        desc: 'Видна только на подъёмнике.',
        detectMethod: 'expert',
        cost: 75000,
        severity: 'Высокая',
        probability: 0.10,
        pricePenaltyPct: 12,
        driveRisk: 20
    },

    // ═══════════ ЭЛЕКТРИКА (6) ═══════════
    {
        id: 'elec_battery_weak',
        category: 'ELECTRICAL',
        name: 'Просаженный АКБ',
        desc: 'Плохо крутит стартер, слабый пусковой ток.',
        detectMethod: 'visual',
        cost: 12000,
        severity: 'Низкая',
        probability: 0.15,
        pricePenaltyPct: 3,
        driveRisk: 10
    },
    {
        id: 'elec_alternator',
        category: 'ELECTRICAL',
        name: 'Умирающий генератор',
        desc: 'Разрядка АКБ на ходу, гул подшипников.',
        detectMethod: 'obd',
        cost: 28000,
        severity: 'Средняя',
        probability: 0.09,
        pricePenaltyPct: 6,
        driveRisk: 25
    },
    {
        id: 'elec_wiring_chew',
        category: 'ELECTRICAL',
        name: 'Погрызенная проводка (мыши)',
        desc: 'Сбои датчиков, короткое замыкание.',
        detectMethod: 'expert',
        cost: 35000,
        severity: 'Средняя',
        probability: 0.06,
        pricePenaltyPct: 7,
        driveRisk: 20
    },
    {
        id: 'elec_abs_sensor',
        category: 'ELECTRICAL',
        name: 'Неисправен датчик ABS',
        desc: 'Горит ошибка ABS, работает нестабильно.',
        detectMethod: 'obd',
        cost: 9000,
        severity: 'Средняя',
        probability: 0.11,
        pricePenaltyPct: 4,
        driveRisk: 15
    },
    {
        id: 'elec_ecu_chip',
        category: 'ELECTRICAL',
        name: 'Чип-тюнинг ECU (нелегальный)',
        desc: 'Прошивка Stage 2 без сертификата НАМИ.',
        detectMethod: 'obd',
        cost: 15000,
        severity: 'Средняя',
        probability: 0.14,
        pricePenaltyPct: 5,
        driveRisk: 8
    },
    {
        id: 'elec_injectors_clog',
        category: 'ELECTRICAL',
        name: 'Забитые форсунки',
        desc: 'Троение, неравномерная работа на ХХ.',
        detectMethod: 'obd',
        cost: 18000,
        severity: 'Средняя',
        probability: 0.10,
        pricePenaltyPct: 5,
        driveRisk: 15
    },

    // ═══════════ ПОДВЕСКА И РУЛЕВОЕ (5) ═══════════
    {
        id: 'susp_shock_leak',
        category: 'SUSPENSION',
        name: 'Течь амортизатора',
        desc: 'Масляный след по корпусу стойки, раскачивание кузова.',
        detectMethod: 'visual',
        cost: 22000,
        severity: 'Средняя',
        probability: 0.13,
        pricePenaltyPct: 5,
        driveRisk: 15
    },
    {
        id: 'susp_ball_joint',
        category: 'SUSPENSION',
        name: 'Люфт шаровой опоры',
        desc: 'Стук при проезде неровностей.',
        detectMethod: 'visual',
        cost: 12000,
        severity: 'Высокая',
        probability: 0.12,
        pricePenaltyPct: 6,
        driveRisk: 25
    },
    {
        id: 'susp_rack_leak',
        category: 'SUSPENSION',
        name: 'Течь рулевой рейки',
        desc: 'Жидкость ГУР подкапывает, тугое вращение.',
        detectMethod: 'visual',
        cost: 38000,
        severity: 'Высокая',
        probability: 0.09,
        pricePenaltyPct: 9,
        driveRisk: 30
    },
    {
        id: 'susp_spring_broken',
        category: 'SUSPENSION',
        name: 'Лопнула виток пружины',
        desc: 'Машина стоит с перекосом, скрежет при езде.',
        detectMethod: 'expert',
        cost: 18000,
        severity: 'Высокая',
        probability: 0.07,
        pricePenaltyPct: 7,
        driveRisk: 28
    },
    {
        id: 'susp_wheel_bearing',
        category: 'SUSPENSION',
        name: 'Гул ступичного подшипника',
        desc: 'Гул, усиливающийся при повороте руля.',
        detectMethod: 'visual',
        cost: 14000,
        severity: 'Средняя',
        probability: 0.10,
        pricePenaltyPct: 5,
        driveRisk: 18
    },

    // ═══════════ САЛОН (3) ═══════════
    {
        id: 'int_tobacco_smell',
        category: 'INTERIOR',
        name: 'Запах табака в салоне',
        desc: 'Прокуренные потолок и сиденья.',
        detectMethod: 'visual',
        cost: 8500,
        severity: 'Низкая',
        probability: 0.20,
        pricePenaltyPct: 3,
        driveRisk: 0
    },
    {
        id: 'int_seat_worn',
        category: 'INTERIOR',
        name: 'Сильно потёртые сиденья',
        desc: 'Прорывы обивки, вдавленные пружины.',
        detectMethod: 'visual',
        cost: 15000,
        severity: 'Низкая',
        probability: 0.16,
        pricePenaltyPct: 4,
        driveRisk: 0
    },
    {
        id: 'int_flood_damage',
        category: 'INTERIOR',
        name: 'Следы затопления',
        desc: 'Запах сырости, следы грязи под коврами.',
        detectMethod: 'expert',
        cost: 45000,
        severity: 'Высокая',
        probability: 0.05,
        pricePenaltyPct: 15,
        driveRisk: 20
    }
];

// --------------------------------------------------------
// 12 ЮРИДИЧЕСКИХ ПРОБЛЕМ
// --------------------------------------------------------
const LEGAL_DEFECTS = [
    {
        id: 'legal_pledge',
        name: 'Залог в банке',
        desc: 'Авто числится залогом по кредиту. Через 2 недели банк начнёт изъятие.',
        detectMethod: 'autoteka',
        severity: 'Критическая',
        probability: 0.06,
        pricePenaltyPct: 40,
        consequence: 'Арест и изъятие машины банком',
        penaltyCash: 0,
        canResolveViaReshala: true,
        reshalaCostConn: 3
    },
    {
        id: 'legal_fssp',
        name: 'Ограничение ФССП',
        desc: 'Приставы наложили запрет на регистрационные действия.',
        detectMethod: 'autoteka',
        severity: 'Высокая',
        probability: 0.08,
        pricePenaltyPct: 25,
        consequence: 'Невозможно поставить на учёт в ГИБДД',
        penaltyCash: 0,
        canResolveViaReshala: true,
        reshalaCostConn: 2
    },
    {
        id: 'legal_arrest',
        name: 'Арест приставов',
        desc: 'Машина арестована за долги предыдущего владельца.',
        detectMethod: 'autoteka_pro',
        severity: 'Критическая',
        probability: 0.04,
        pricePenaltyPct: 50,
        consequence: 'Машину изымут при первой же проверке ГИБДД',
        penaltyCash: 0,
        canResolveViaReshala: true,
        reshalaCostConn: 4
    },
    {
        id: 'legal_double_vin',
        name: 'Двойник VIN',
        desc: 'VIN совпадает с другой машиной в базе ГИБДД — уголовная статья.',
        detectMethod: 'autoteka_pro',
        severity: 'Критическая',
        probability: 0.02,
        pricePenaltyPct: 60,
        consequence: 'Уголовное дело, конфискация авто',
        penaltyCash: 200000,
        canResolveViaReshala: true,
        reshalaCostConn: 5
    },
    {
        id: 'legal_lease_unclosed',
        name: 'Незакрытый лизинг',
        desc: 'Машина в лизинге, предыдущий владелец не выкупил её полностью.',
        detectMethod: 'autoteka',
        severity: 'Высокая',
        probability: 0.05,
        pricePenaltyPct: 30,
        consequence: 'Лизинговая компания потребует изъятия',
        penaltyCash: 150000,
        canResolveViaReshala: true,
        reshalaCostConn: 3
    },
    {
        id: 'legal_taxi_former',
        name: 'Бывшее такси',
        desc: 'Скрытый реальный пробег +200,000 км, жёлтая краска под слоем.',
        detectMethod: 'autoteka',
        severity: 'Средняя',
        probability: 0.10,
        pricePenaltyPct: 20,
        consequence: 'Реальный пробег в 2–3 раза выше заявленного',
        penaltyCash: 0,
        canResolveViaReshala: false
    },
    {
        id: 'legal_odometer_rollback',
        name: 'Скрученный пробег',
        desc: 'В отчёте Автотеки зафиксирована скрутка на 60,000 км.',
        detectMethod: 'autoteka',
        severity: 'Высокая',
        probability: 0.12,
        pricePenaltyPct: 15,
        consequence: 'Возврат покупателя через суд + штраф',
        penaltyCash: 80000,
        canResolveViaReshala: true,
        reshalaCostConn: 2
    },
    {
        id: 'legal_pts_duplicate',
        name: 'Дубликат ПТС',
        desc: 'Оригинал ПТС утерян, выдан дубликат — частая схема перекупов.',
        detectMethod: 'autoteka',
        severity: 'Средняя',
        probability: 0.14,
        pricePenaltyPct: 10,
        consequence: 'Возможны проблемы с оформлением в МРЭО',
        penaltyCash: 0,
        canResolveViaReshala: false
    },
    {
        id: 'legal_customs_unpaid',
        name: 'Неуплаченная таможенная пошлина',
        desc: 'Машина ввезена по серой схеме, таможня не закрыта.',
        detectMethod: 'autoteka_pro',
        severity: 'Критическая',
        probability: 0.03,
        pricePenaltyPct: 45,
        consequence: 'Задолженность по таможенным платежам перед ФТС',
        penaltyCash: 350000,
        canResolveViaReshala: true,
        reshalaCostConn: 4
    },
    {
        id: 'legal_restricted_reg',
        name: 'Ограничение регистрационных действий',
        desc: 'Запрет на постановку на учёт из-за долгов бывшего владельца.',
        detectMethod: 'autoteka',
        severity: 'Высокая',
        probability: 0.07,
        pricePenaltyPct: 22,
        consequence: 'Невозможно оформить на себя',
        penaltyCash: 0,
        canResolveViaReshala: true,
        reshalaCostConn: 2
    },
    {
        id: 'legal_criminal_vin',
        name: 'Криминальный VIN (перебит)',
        desc: 'VIN перебит кустарным способом, номера спилены.',
        detectMethod: 'expert',
        severity: 'Критическая',
        probability: 0.02,
        pricePenaltyPct: 70,
        consequence: 'Уголовная статья 326 УК РФ',
        penaltyCash: 500000,
        canResolveViaReshala: false
    },
    {
        id: 'legal_pledge_partial',
        name: 'Частичный залог (автокредит)',
        desc: 'Машина заложена по автокредиту бывшего владельца, платёж не закрыт.',
        detectMethod: 'autoteka_pro',
        severity: 'Высокая',
        probability: 0.05,
        pricePenaltyPct: 35,
        consequence: 'Банк может инициировать изъятие',
        penaltyCash: 100000,
        canResolveViaReshala: true,
        reshalaCostConn: 3
    }
];

// --------------------------------------------------------
// УРОВНИ ПРОВЕРКИ (можно применить к машине у капота)
// --------------------------------------------------------
const INSPECTION_TIERS = [
    {
        id: 'quick',
        name: 'Экспресс-осмотр',
        cost: 0,
        desc: 'Визуально у капота + прослушивание мотора',
        detects: ['visual'],
        icon: '👁'
    },
    {
        id: 'standard',
        name: 'Стандартная проверка',
        cost: 5000,
        desc: 'Толщиномер ЛКП + сканер OBD2',
        detects: ['visual', 'gauge', 'obd'],
        icon: '🔍'
    },
    {
        id: 'expert',
        name: 'Экспертиза',
        cost: 25000,
        desc: 'Всё из стандартной + эндоскоп + компрессометр',
        detects: ['visual', 'gauge', 'obd', 'endoscope', 'compression'],
        icon: '🔬'
    },
    {
        id: 'full',
        name: 'Полная проверка',
        cost: 60000,
        desc: 'Экспертиза + Автотека + подъёмник',
        detects: ['visual', 'gauge', 'obd', 'endoscope', 'compression', 'autoteka', 'expert'],
        icon: '🏛'
    },
    {
        id: 'vin_report',
        name: 'VIN-отчёт (Автотека Pro)',
        cost: 15000,
        desc: 'Только глубокая проверка юридической чистоты через VIN',
        detects: ['autoteka', 'autoteka_pro'],
        icon: '📜'
    }
];

// --------------------------------------------------------
// УТИЛИТЫ
// --------------------------------------------------------

/**
 * Возвращает случайный дефект по категории
 */
function rollRandomDefect(category = null) {
    let pool = MECHANICAL_DEFECTS;
    if (category) pool = pool.filter(d => d.category === category);
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Возвращает случайный юридический дефект
 */
function rollRandomLegalDefect() {
    return LEGAL_DEFECTS[Math.floor(Math.random() * LEGAL_DEFECTS.length)];
}

/**
 * Проверяет, обнаруживается ли дефект при данном уровне проверки
 */
function isDefectDetectable(defect, inspectionTierId) {
    const tier = INSPECTION_TIERS.find(t => t.id === inspectionTierId);
    if (!tier) return false;
    return tier.detects.includes(defect.detectMethod);
}

/**
 * Возвращает массив дефектов, которые могут быть найдены при заданном методе
 */
function getDefectsForDetectMethod(method) {
    return {
        mechanical: MECHANICAL_DEFECTS.filter(d => d.detectMethod === method),
        legal: LEGAL_DEFECTS.filter(d => d.detectMethod === method)
    };
}

/**
 * Суммарная стоимость ремонта пачки дефектов
 */
function getTotalRepairCost(defects) {
    if (!Array.isArray(defects)) return 0;
    return defects.reduce((sum, d) => sum + (d.cost || 0), 0);
}

/**
 * Итоговый штраф к цене от дефектов
 */
function getTotalPricePenaltyPct(defects) {
    if (!Array.isArray(defects)) return 0;
    return defects.reduce((sum, d) => sum + (d.pricePenaltyPct || 0), 0);
}

// --------------------------------------------------------
// ЭКСПОРТ В WINDOW
// --------------------------------------------------------
window.DEFECT_CATEGORIES = DEFECT_CATEGORIES;
window.DEFECT_DETECT_METHODS = DEFECT_DETECT_METHODS;
window.MECHANICAL_DEFECTS = MECHANICAL_DEFECTS;
window.LEGAL_DEFECTS = LEGAL_DEFECTS;
window.INSPECTION_TIERS = INSPECTION_TIERS;

window.rollRandomDefect = rollRandomDefect;
window.rollRandomLegalDefect = rollRandomLegalDefect;
window.isDefectDetectable = isDefectDetectable;
window.getDefectsForDetectMethod = getDefectsForDetectMethod;
window.getTotalRepairCost = getTotalRepairCost;
window.getTotalPricePenaltyPct = getTotalPricePenaltyPct;

console.log('[🩺 data-defects v1.0.0] Загружено:', MECHANICAL_DEFECTS.length, 'мех. дефектов +', LEGAL_DEFECTS.length, 'юридических проблем ✓');
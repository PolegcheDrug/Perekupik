// ===================== МОДУЛЬ СЕТИ И ОНЛАЙН-МОСТА (firebase-bridge.js) =====================

const OnlineBridge = {
    // Демо-данные для P2P-биржи
    mockListings: [
        {
            id: 'lot_p2p_1',
            sellerId: 'user_102',
            sellerName: 'Maga_Drift',
            itemType: 'car',
            price: 780000,
            recommendedPrice: 850000,
            itemData: {
                name: "ВАЗ-2107 (Турбо-Шеснарь 200 л.с.)",
                power: 200,
                type: "economy",
                plate: "Е777КХ 77",
                img: "assets/cars/economy/vaz-2107.jpg",
                basePrice: 95000,
                marketValue: 850000,
                condition: 92,
                wear: { engine: 95, transmission: 90 },
                tuning: { chip: 2, exhaust: true, stance: true, bodykit: true, risk1251: 60 }
            }
        },
        {
            id: 'lot_p2p_2',
            sellerId: 'user_205',
            sellerName: 'Crypto_Reseller',
            itemType: 'car',
            price: 2150000,
            recommendedPrice: 2400000,
            itemData: {
                name: "Kia K5 GT-Line",
                power: 194,
                type: "comfort",
                plate: "Х001ХХ 77",
                img: "assets/cars/comfort/k5.jpg",
                basePrice: 2400000,
                marketValue: 2400000,
                condition: 98,
                wear: { engine: 98, transmission: 98 },
                tuning: { chip: 0, exhaust: false, stance: false, bodykit: false, risk1251: 0 }
            }
        },
        {
            id: 'lot_p2p_3',
            sellerId: 'user_301',
            sellerName: 'Bunker_Msk',
            itemType: 'plate',
            price: 650000,
            recommendedPrice: 700000,
            itemData: {
                plate: "А007МР 77"
            }
        },
        {
            id: 'lot_p2p_4',
            sellerId: 'user_404',
            sellerName: 'OldSchool_Boy',
            itemType: 'plate',
            price: 280000,
            recommendedPrice: 320000,
            itemData: {
                plate: "В777ВВ 777"
            }
        }
    ],

    // Список доступных автоклубов
    mockClubs: [
        {
            id: 'club_drift',
            name: 'Street Drift Mafia',
            tag: 'SDM',
            leader: 'Vazovod_77',
            membersCount: 24,
            maxMembers: 30,
            level: 4,
            bank: 4500000,
            desc: 'Ночные сходки, парный дрифт, скидка 15% на резину и запчасти.',
            icon: '🏎️'
        },
        {
            id: 'club_vag',
            name: 'VAG Performance Club',
            tag: 'VAG',
            leader: 'GTI_Stage3',
            membersCount: 19,
            maxMembers: 25,
            level: 5,
            bank: 8200000,
            desc: 'Чип-тюнинг, логи, ланчи. Члены клуба бесплатно читают ошибки ЭБУ.',
            icon: '⚡'
        },
        {
            id: 'club_syndicate',
            name: 'Теневой Синдикат',
            tag: 'SHD',
            leader: 'Артур_Решала',
            membersCount: 28,
            maxMembers: 30,
            level: 8,
            bank: 25000000,
            desc: 'Закрытый синдикат. Увеличенная на 20% награда за все контракты.',
            icon: '🕶️'
        }
    ],

    // Список друзей игрока
    mockFriends: [
        { id: 'f_1', name: 'Саня_Механик', level: 14, netWorth: 3450000, online: true },
        { id: 'f_2', name: 'Илья_ЧПУ', level: 22, netWorth: 12800000, online: true },
        { id: 'f_3', name: 'Дима_Подбор', level: 9, netWorth: 1850000, online: false },
        { id: 'f_4', name: 'Карен_Автосалон', level: 31, netWorth: 48900000, online: false }
    ],

    // Таблица лидеров
    mockLeaderboard: [
        { rank: 1, name: 'Султан_Дубай', level: 78, netWorth: 1450000000, badge: 'Шейх' },
        { rank: 2, name: 'Артур_Решала', level: 64, netWorth: 620000000, badge: 'Авторитет' },
        { rank: 3, name: 'Карен_Автосалон', level: 52, netWorth: 285000000, badge: 'Магнат' },
        { rank: 4, name: 'Maga_M5', level: 41, netWorth: 140000000, badge: 'Стритрейсер' },
        { rank: 5, name: 'GTI_Stage3', level: 35, netWorth: 85000000, badge: 'Тюнер' },
        { rank: 6, name: 'Илья_ЧПУ', level: 22, netWorth: 12800000, badge: 'Перекуп' }
    ],

    // Живой эфир сообщений
    mockLiveFeed: [
        { id: 'msg_1', author: '🚨 ДПС_Инфо', text: 'Внимание! На ул. Ленина рейд по 12.5.1, прячьте прямотоки!', type: 'dps', time: '12:40' },
        { id: 'msg_2', author: 'Vazovod_77', text: 'Куплю кузов под корч ВАЗ 2107 или 2101, срочно в лс!', type: 'chat', time: '12:42' },
        { id: 'msg_3', author: 'Maga_Drift', text: 'Выставил турбо-семерку на P2P биржу, налетайте!', type: 'p2p_ad', time: '12:45' }
    ],

    // Генерация реферальной ссылки
    getReferralLink() {
        const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '777';
        return `https://t.me/share/url?url=https://t.me/ВАШ_БОТ?startapp=ref_${tgId}&text=Заходи%20в%20Симулятор%20Перекупа!%20Поднимай%20кэш%20на%20тачках%20вместе%20со%20мной!`;
    }
};
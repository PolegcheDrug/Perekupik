// ===================== МОДУЛЬ СЕТЕВЫХ СЕРВИСОВ =====================
const OnlineBridge = {
// Флаг: переключим на true, когда будем цеплять реальный Firebase
isLiveBackend: false,
// 1. Моковые данные: Друзья
mockFriends: [
{ uid: "tg_101", name: "Артем Гаражный", level: 14, netWorth: 4500000, online: true },
{ uid: "tg_102", name: "Smotra_Style", level: 28, netWorth: 18200000, online: false },
{ uid: "tg_103", name: "Влад_Перекуп77", level: 9, netWorth: 1250000, online: true }
],
// 2. Моковые данные: Лидерборд
mockLeaderboard: [
{ rank: 1, name: "Major_Vova", level: 52, netWorth: 142000000, badge: "👑 Олигарх" },
{ rank: 2, name: "Drift_King", level: 46, netWorth: 98500000, badge: "🏎️ Синдикат" },
{ rank: 3, name: "Perecup_VIP", level: 38, netWorth: 64000000, badge: "💼 Магнат" },
{ rank: 4, name: "Smotra_Style", level: 28, netWorth: 18200000, badge: "🔍 Эксперт" },
{ rank: 5, name: "Артем Гаражный", level: 14, netWorth: 4500000, badge: "🛠️ Мастер" }
],
// 3. Моковые данные: Автоклубы
mockClubs: [
{
id: "club_drift",
name: "DRIFT SYNDICATE",
tag: "DRIFT",
leader: "Drift_King",
membersCount: 42,
maxMembers: 50,
level: 5,
bank: 12500000,
desc: "+15% к наградам за драг-рейсинг",
icon: "🏎️"
},
{
id: "club_stance",
name: "STANCE & SHINE",
tag: "STANCE",
leader: "Major_Vova",
membersCount: 28,
maxMembers: 35,
level: 4,
bank: 8200000,
desc: "+25% баллов на фестивалях Автошоу",
icon: "✨"
},
{
id: "club_night",
name: "NIGHT RUNNERS",
tag: "NR",
leader: "Shadow_Msk",
membersCount: 31,
maxMembers: 40,
level: 3,
bank: 5400000,
desc: "-30% к шансу облавы ДПС (ст. 12.5.1)",
icon: "🌙"
}
],
// 4. Моковые данные: Лента P2P Биржи
mockListings: [
{
id: "lot_p2p_01",
sellerId: "tg_102",
sellerName: "Smotra_Style",
itemType: "car",
price: 1850000,
recommendedPrice: 1750000,
itemData: {
name: "Skoda Octavia A7 1.8",
power: 180,
type: "comfort",
img: "assets/cars/comfort/octavia.jpg",
plate: "Х777АМ 77",
condition: 92,
mileage: 62000,
tuning: { chip: 1, exhaust: true, stance: false, bodykit: false, risk1251: 15 }
}
},
{
id: "lot_p2p_02",
sellerId: "tg_101",
sellerName: "Артем Гаражный",
itemType: "plate",
price: 450000,
recommendedPrice: 420000,
itemData: {
plate: "А777АА 777"
}
}
],
// 5. Моковые данные: Чат Городского Эфира
mockLiveFeed: [
{ id: "msg_1", author: "🚨 ДПС_Инфо", text: "Внимание! На ул. Ленина рейд по 12.5.1, прячьте прямотоки!", type: "dps", time: "08:35" },
{ id: "msg_2", author: "Smotra_Style", text: "Выставил чипованную Октавию A7 на P2P биржу. Осмотр на месте!", type: "p2p_ad", time: "08:38" },
{ id: "msg_3", author: "Major_Vova", text: "Скупаю красивые номера 777 региона. Бюджет свободный.", type: "user_msg", time: "08:41" }
],
// Генерация динамической реферальной ссылки для Telegram
getReferralLink() {
const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "777";
// Замените ВАШ_БОТ на актуальный username вашего бота (без @)
return `https://t.me/share/url?url=https://t.me/ВАШ_БОТ?startapp=ref_${tgId}&text=Залетай%20в%20Симулятор%20Перекупа!%20Дают%20+50,000%20₽%20и%20связи%20на%20старте!`;
}
};
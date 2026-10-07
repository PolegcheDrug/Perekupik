import hashlib
import hmac
import json
from urllib.parse import parse_qsl
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any

from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# Замените на реальный токен вашего бота от BotFather
BOT_TOKEN = "8817926334:AAE7WBh3KSFjLtMc6BdklWnnWniPDBds2fg"

# Настройка базы данных SQLite
DATABASE_URL = "sqlite:///./perekup.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- МОДЕЛИ БАЗЫ ДАННЫХ ---

class UserModel(Base):
    __tablename__ = "users"
    tg_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, default="Player")
    avatar_url = Column(String, nullable=True)
    cash = Column(Integer, default=150000)
    stars = Column(Integer, default=15)
    level = Column(Integer, default=1)
    garage_json = Column(Text, default="[]")

class FriendModel(Base):
    __tablename__ = "friends"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.tg_id"), index=True)
    friend_id = Column(Integer, index=True)
    friend_username = Column(String)

class P2PLotModel(Base):
    __tablename__ = "p2p_market"
    lot_id = Column(String, primary_key=True, index=True)
    seller_id = Column(Integer, index=True)
    seller_username = Column(String)
    price = Column(Integer)
    car_json = Column(Text)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Perekup Simulator Full API")

# Настройка CORS для свободного доступа
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- АВТОРИЗАЦИЯ И ВАЛИДАЦИЯ TELEGRAM INIT DATA ---
def verify_telegram_data(init_data: str) -> dict:
    if not init_data:
        # Режим отладки для локального тестирования без Telegram
        return {"id": 777777, "username": "TestPlayer", "photo_url": ""}
        
    parsed_data = dict(parse_qsl(init_data))
    if "hash" not in parsed_data:
        raise HTTPException(status_code=401, detail="Отсутствует хеш авторизации Telegram")

    received_hash = parsed_data.pop("hash")
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))
    
    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
    if calculated_hash != received_hash:
        raise HTTPException(status_code=403, detail="Неверная подпись Telegram. Доступ запрещен.")
        
    return json.loads(parsed_data.get("user", "{}"))

def get_current_user(tma_data: str = Header(None, alias="X-Telegram-Init-Data"), db: Session = Depends(get_db)):
    user_info = verify_telegram_data(tma_data)
    user_id = user_info.get("id")
    username = user_info.get("username") or user_info.get("first_name", "Player")
    avatar = user_info.get("photo_url", "")

    db_user = db.query(UserModel).filter(UserModel.tg_id == user_id).first()
    if not db_user:
        db_user = UserModel(
            tg_id=user_id,
            username=username,
            avatar_url=avatar,
            cash=150000,
            stars=15,
            level=1,
            garage_json="[]"
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    else:
        db_user.username = username
        if avatar:
            db_user.avatar_url = avatar
        db.commit()

    return db_user

# --- PYDANTIC МОДЕЛИ ЗАПРОСОВ ---
class SyncProfileRequest(BaseModel):
    cash: int
    stars: int
    level: int
    garage: list

class SellP2PRequest(BaseModel):
    car: Dict[str, Any]
    price: int

class BuyP2PRequest(BaseModel):
    lot_id: str

class AddFriendRequest(BaseModel):
    friend_id: int
    friend_username: str

# --- ЭНДПОИНТЫ ПРОФИЛЯ ---

@app.get("/api/profile")
async def get_profile(user: UserModel = Depends(get_current_user)):
    return {
        "tg_id": user.tg_id,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "cash": user.cash,
        "stars": user.stars,
        "level": user.level,
        "garage": json.loads(user.garage_json)
    }

@app.post("/api/profile/sync")
async def sync_profile(req: SyncProfileRequest, user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    user.cash = req.cash
    user.stars = req.stars
    user.level = req.level
    user.garage_json = json.dumps(req.garage)
    db.commit()
    return {"status": "success"}

# --- ЭНДПОИНТЫ P2P БИРЖИ ---

@app.get("/api/p2p/listings")
async def get_p2p_listings(user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    lots = db.query(P2PLotModel).filter(P2PLotModel.seller_id != user.tg_id).all()
    result = []
    for lot in lots:
        result.append({
            "lot_id": lot.lot_id,
            "seller_id": lot.seller_id,
            "seller_username": lot.seller_username,
            "price": lot.price,
            "car_data": json.loads(lot.car_json)
        })
    return {"cars": result}

@app.post("/api/p2p/sell")
async def sell_p2p_lot(req: SellP2PRequest, user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    lot_id = f"lot_{user.tg_id}_{int(hashlib.md5(json.dumps(req.car).encode()).hexdigest()[:8])}"
    
    new_lot = P2PLotModel(
        lot_id=lot_id,
        seller_id=user.tg_id,
        seller_username=user.username,
        price=req.price,
        car_json=json.dumps(req.car)
    )
    db.add(new_lot)
    db.commit()
    return {"status": "success", "lot_id": lot_id}

@app.post("/api/p2p/buy")
async def buy_p2p_lot(req: BuyP2PRequest, user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    lot = db.query(P2PLotModel).filter(P2PLotModel.lot_id == req.lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Лот не найден или уже продан")
    
    if lot.seller_id == user.tg_id:
        raise HTTPException(status_code=400, detail="Нельзя выкупать собственную машину")

    if user.cash < lot.price:
        raise HTTPException(status_code=400, detail="Недостаточно наличных средств")

    seller = db.query(UserModel).filter(UserModel.tg_id == lot.seller_id).first()
    car_data = json.loads(lot.car_json)

    if seller:
        seller.cash += lot.price
        db.add(seller)

    user.cash -= lot.price
    current_garage = json.loads(user.garage_json)
    current_garage.append(car_data)
    user.garage_json = json.dumps(current_garage)

    db.delete(lot)
    db.commit()

    return {"status": "success", "car": car_data, "new_cash": user.cash}

# --- ЭНДПОИНТЫ СИСТЕМЫ ДРУЗЕЙ ---

@app.get("/api/friends")
async def get_friends(user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    friends = db.query(FriendModel).filter(FriendModel.user_id == user.tg_id).all()
    result = []
    for f in friends:
        friend_acc = db.query(UserModel).filter(UserModel.tg_id == f.friend_id).first()
        result.append({
            "friend_id": f.friend_id,
            "friend_username": f.friend_username,
            "level": friend_acc.level if friend_acc else 1,
            "cash": friend_acc.cash if friend_acc else 0
        })
    return {"friends": result}

@app.post("/api/friends/add")
async def add_friend(req: AddFriendRequest, user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.friend_id == user.tg_id:
        raise HTTPException(status_code=400, detail="Нельзя добавить самого себя в друзья")
    
    existing = db.query(FriendModel).filter(FriendModel.user_id == user.tg_id, FriendModel.friend_id == req.friend_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Пользователь уже у вас в друзьях")

    new_friend = FriendModel(
        user_id=user.tg_id,
        friend_id=req.friend_id,
        friend_username=req.friend_username
    )
    db.add(new_friend)
    db.commit()
    return {"status": "success"}
from fastapi import FastAPI, Depends, HTTPException, status, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field, StringConstraints, field_validator
from typing import Annotated, Optional, List
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import models
import web_pages
import email_sender
import sharing
from database import engine, get_db
import os
import hashlib
import secrets
import time
from dotenv import load_dotenv

load_dotenv()

# יצירת הטבלאות ב-DB
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# הגדרות אבטחה
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY is not set. Add it in Render → Environment, or to .env for local runs.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # שבוע
MIN_PASSWORD_LENGTH = 4

# איפוס סיסמה
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "https://shoppinglistapp-7dj5.onrender.com").rstrip("/")
RESET_LINK_MINUTES = 30
RESET_RESEND_COOLDOWN_SECONDS = 60
RESET_REQUEST_MESSAGE = "אם כתובת האימייל רשומה אצלנו, נשלח אליה קישור לאיפוס הסיסמה."

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # בייצור: רק הדומיינים המותרים
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== Pydantic Models =====
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username", "email", mode="before")
    @classmethod
    def strip_spaces(cls, value):
        """הסרת רווחים מסביב (המקלדת בטלפון מוסיפה רווח אחרי מילה)"""
        return value.strip() if isinstance(value, str) else value
    
class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class AccountDeleteRequest(BaseModel):
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# שם של רשימה/מוצר: בלי רווחים מסביב, לא ריק, עד 100 תווים
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
# כמות של מוצר: 1 עד 999
Amount = Annotated[int, Field(ge=1, le=999)]

class ShoppingListCreate(BaseModel):
    name: Name

class ShoppingListResponse(BaseModel):
    id: int
    name: str
    owner_id: int
    # האם המשתמש המחובר הוא הבעלים (ולא רשימה ששותפה איתו).
    # ברירת המחדל True מתאימה ליצירה ולשינוי שם - רק הבעלים יכול לבצע אותם
    is_owner: bool = True

    class Config:
        from_attributes = True

class ItemCreate(BaseModel):
    name: Name
    amount: Amount = 1
    list_id: int

class ItemUpdate(BaseModel):
    name: Optional[Name] = None
    amount: Optional[Amount] = None
    purchased: Optional[bool] = None
    position: Optional[int] = None

class ReorderEntry(BaseModel):
    id: int
    position: int

class ShareListRequest(BaseModel):
    list_id: int
    username: Annotated[str, StringConstraints(strip_whitespace=True)]

# ===== פונקציות עזר לאבטחה =====
def verify_password(plain_password, hashed_password):
    """בדיקה שהסיסמא תואמת להash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """יצירת hash מהסיסמא - זה מה ששומרים בDB"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """יצירת JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def find_user_for_login(db: Session, username: str):
    """שם מדויק; ואם לא נמצא - לפי השם בלי רווחים מסביב
    (כולל משתמשים ישנים שנרשמו בטעות עם רווח, לפני שההרשמה התחילה להסיר רווחים)"""
    user = get_user_by_username(db, username)
    if user:
        return user
    stripped = username.strip()
    if not stripped:
        return None
    return db.query(models.User).filter(func.trim(models.User.username) == stripped).first()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """קבלת המשתמש הנוכחי מהtoken"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_username(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

# ===== API Endpoints =====

@app.get("/")
def root():
    return {"status": "Server is up and running!", "version": "2.0"}

# === Authentication Endpoints ===

@app.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """רישום משתמש חדש"""
    if len(user.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"הסיסמה חייבת להכיל לפחות {MIN_PASSWORD_LENGTH} תווים"
        )

    # בדיקה אם המשתמש כבר קיים
    if get_user_by_username(db, user.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="שם המשתמש כבר תפוס"
        )
    if get_user_by_email(db, user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="כתובת האימייל כבר רשומה"
        )
    
    # יצירת משתמש חדש עם סיסמא מוצפנת
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # יצירת רשימה ברירת מחדל למשתמש
    default_list = models.ShoppingList(
        name="הרשימה שלי",
        owner_id=db_user.id
    )
    db.add(default_list)
    db.commit()
    
    return db_user

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """התחברות וקבלת token"""
    user = find_user_for_login(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="שם משתמש או סיסמה שגויים",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    """קבלת פרטי המשתמש המחובר"""
    return current_user
    
@app.put("/users/password")
def change_password(
    password_data: PasswordChangeRequest, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """שינוי סיסמת משתמש"""
    # 1. אימות שהסיסמה הנוכחית נכונה
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="הסיסמה הנוכחית שגויה"
        )
    
    # 2. (אופציונלי אבל מומלץ) בדיקת אורך סיסמה חדשה
    if len(password_data.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"הסיסמה החדשה חייבת להכיל לפחות {MIN_PASSWORD_LENGTH} תווים"
        )

    # 3. הצפנת הסיסמה החדשה ושמירה
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "הסיסמה עודכנה בהצלחה"}

# === מחיקת חשבון (דרישה של Google Play) ===

def delete_user_account(db: Session, user: models.User):
    """מחיקת משתמש וכל המידע שלו: הרשימות שבבעלותו (כולל המוצרים שבהן) והשיתופים שלו"""
    for shopping_list in list(user.owned_lists):
        db.delete(shopping_list)  # המוצרים נמחקים בזכות cascade, והשיתופים של הרשימה נמחקים אוטומטית
    user.shared_lists.clear()  # הסרת הגישה לרשימות של אחרים
    db.delete(user)
    db.commit()

@app.delete("/users/me")
def delete_my_account(
    request: AccountDeleteRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """מחיקת החשבון מתוך האפליקציה (דורש אישור סיסמה)"""
    # 400 ולא 401 - כדי שסיסמה שגויה לא תיחשב באפליקציה כהתחברות שפגה
    if not verify_password(request.password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="הסיסמה שגויה")
    delete_user_account(db, current_user)
    return {"message": "החשבון נמחק"}

@app.get("/delete-account", response_class=HTMLResponse)
def delete_account_page():
    """דף אינטרנט למחיקת חשבון בלי האפליקציה"""
    return web_pages.delete_account_form()

@app.post("/delete-account", response_class=HTMLResponse)
def delete_account_web(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return HTMLResponse(web_pages.delete_account_form(error="שם המשתמש או הסיסמה שגויים"), status_code=400)
    delete_user_account(db, user)
    return web_pages.delete_account_done()

@app.get("/privacy", response_class=HTMLResponse)
def privacy_policy():
    """מדיניות פרטיות (הקישור שמוזן ב-Play Console)"""
    return web_pages.privacy_policy()

# === איפוס סיסמה דרך המייל ===

class PasswordResetRequest(BaseModel):
    email: str

def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def start_password_reset(db: Session, email: str, background_tasks: BackgroundTasks):
    """יוצר קישור איפוס ושולח אותו במייל (ברקע). למייל לא רשום - לא עושה כלום, בלי לחשוף את זה."""
    email = (email or "").strip().lower()
    user = db.query(models.User).filter(func.lower(models.User.email) == email).first() if email else None
    if not user:
        return

    now = datetime.utcnow()
    tokens = db.query(models.PasswordResetToken).filter(models.PasswordResetToken.user_id == user.id)
    latest = tokens.order_by(models.PasswordResetToken.created_at.desc()).first()
    if latest and now - latest.created_at < timedelta(seconds=RESET_RESEND_COOLDOWN_SECONDS):
        return  # הגנה מספאם: לכל היותר מייל אחד בדקה

    tokens.filter(models.PasswordResetToken.used == False).update({"used": True})  # קישור חדש מבטל את הקודמים
    token = secrets.token_urlsafe(32)
    db.add(models.PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_reset_token(token),
        created_at=now,
        expires_at=now + timedelta(minutes=RESET_LINK_MINUTES),
    ))
    db.commit()

    link = f"{PUBLIC_BASE_URL}/reset-password?token={token}"
    background_tasks.add_task(
        email_sender.send_email, user.email, "איפוס סיסמה ל-ShopLi", web_pages.reset_password_email(user.username, link)
    )

def find_valid_reset_token(db: Session, token: str):
    if not token:
        return None
    reset = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token_hash == _hash_reset_token(token)
    ).first()
    if not reset or reset.used or reset.expires_at < datetime.utcnow():
        return None
    return reset

@app.post("/password-reset/request")
def password_reset_request(data: PasswordResetRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """בקשת איפוס מהאפליקציה. תמיד אותה תשובה, כדי שאי אפשר יהיה לגלות אילו מיילים רשומים"""
    start_password_reset(db, data.email, background_tasks)
    return {"message": RESET_REQUEST_MESSAGE}

@app.get("/forgot-password", response_class=HTMLResponse)
def forgot_password_page():
    return web_pages.forgot_password_form()

@app.post("/forgot-password", response_class=HTMLResponse)
def forgot_password_web(background_tasks: BackgroundTasks, email: str = Form(...), db: Session = Depends(get_db)):
    start_password_reset(db, email, background_tasks)
    return web_pages.forgot_password_sent()

@app.get("/reset-password", response_class=HTMLResponse)
def reset_password_page(token: str = "", db: Session = Depends(get_db)):
    if not find_valid_reset_token(db, token):
        return HTMLResponse(web_pages.reset_password_invalid(), status_code=400)
    return web_pages.reset_password_form(token)

@app.post("/reset-password", response_class=HTMLResponse)
def reset_password_web(
    token: str = Form(...),
    password: str = Form(...),
    confirm: str = Form(...),
    db: Session = Depends(get_db)
):
    reset = find_valid_reset_token(db, token)
    if not reset:
        return HTMLResponse(web_pages.reset_password_invalid(), status_code=400)
    if password != confirm:
        return HTMLResponse(web_pages.reset_password_form(token, error="הסיסמאות אינן תואמות"), status_code=400)
    if len(password) < MIN_PASSWORD_LENGTH:
        return HTMLResponse(
            web_pages.reset_password_form(token, error=f"הסיסמה חייבת להכיל לפחות {MIN_PASSWORD_LENGTH} תווים"),
            status_code=400,
        )

    reset.user.hashed_password = get_password_hash(password)
    reset.used = True
    db.commit()
    return web_pages.reset_password_done()

# === Shopping Lists Endpoints ===

@app.get("/lists", response_model=List[ShoppingListResponse])
def get_lists(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """קבלת כל הרשימות של המשתמש (שלו + משותפות)"""
    owned_lists = current_user.owned_lists
    shared_lists = current_user.shared_lists
    all_lists = owned_lists + shared_lists
    return [
        ShoppingListResponse(
            id=lst.id,
            name=lst.name,
            owner_id=lst.owner_id,
            is_owner=lst.owner_id == current_user.id,
        )
        for lst in all_lists
    ]

@app.post("/lists", response_model=ShoppingListResponse, status_code=status.HTTP_201_CREATED)
def create_list(list_data: ShoppingListCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """יצירת רשימת קניות חדשה"""
    new_list = models.ShoppingList(
        name=list_data.name,
        owner_id=current_user.id
    )
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    return new_list

DUPLICATE_SUFFIX = " (עותק)"
LIST_NAME_MAX_LENGTH = 100

@app.post("/lists/{list_id}/duplicate", response_model=ShoppingListResponse, status_code=status.HTTP_201_CREATED)
def duplicate_list(list_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """שכפול רשימה (בעלים או משתתף). הרשימה החדשה שייכת למשתמש הנוכחי, בלי שיתופים ובלי קוד הזמנה"""
    source = get_accessible_list_or_error(db, list_id, current_user)
    base = source.name[:LIST_NAME_MAX_LENGTH - len(DUPLICATE_SUFFIX)]
    new_list = models.ShoppingList(name=f"{base}{DUPLICATE_SUFFIX}", owner_id=current_user.id)
    db.add(new_list)
    db.flush()
    source_items = (
        db.query(models.ShoppingItem)
        .filter(models.ShoppingItem.list_id == source.id)
        .order_by(models.ShoppingItem.position)
        .all()
    )
    for item in source_items:
        db.add(models.ShoppingItem(
            name=item.name,
            amount=item.amount,
            position=item.position,
            purchased=False,
            list_id=new_list.id,
        ))
    db.commit()
    db.refresh(new_list)
    return ShoppingListResponse(id=new_list.id, name=new_list.name, owner_id=new_list.owner_id, is_owner=True)

@app.post("/lists/share")
def share_list(share_request: ShareListRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """שיתוף רשימה עם משתמש אחר"""
    # בדיקה שהרשימה קיימת ושייכת למשתמש
    shopping_list = db.query(models.ShoppingList).filter(models.ShoppingList.id == share_request.list_id).first()
    if not shopping_list:
        raise HTTPException(status_code=404, detail="List not found")
    if shopping_list.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to share this list")
    
    # מציאת המשתמש לשיתוף
    user_to_share = get_user_by_username(db, share_request.username)
    if not user_to_share:
        raise HTTPException(status_code=404, detail="User not found")
    
    # הוספת המשתמש לרשימה משותפת
    if user_to_share not in shopping_list.shared_users:
        shopping_list.shared_users.append(user_to_share)
        db.commit()
    
    return {"message": f"List shared with {share_request.username}"}

# === Items Endpoints ===

@app.get("/items/suggestions")
def get_item_suggestions(
    q: str = "",
    list_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """הצעות השלמה להוספת מוצר, מההיסטוריה של המשתמש בלבד (עד 8)"""
    excluded = set()
    if list_id is not None:
        shopping_list = get_accessible_list_or_error(db, list_id, current_user)
        open_items = db.query(models.ShoppingItem).filter(
            models.ShoppingItem.list_id == shopping_list.id,
            models.ShoppingItem.purchased == False  # noqa: E712
        ).all()
        excluded = {i.name.strip().lower() for i in open_items}

    key = q.strip().lower()
    rows = db.query(models.ItemHistory).filter(models.ItemHistory.user_id == current_user.id).order_by(
        models.ItemHistory.use_count.desc(), models.ItemHistory.last_used.desc()
    ).all()
    rows = [r for r in rows if r.name_key not in excluded]
    if key:
        prefix = [r for r in rows if r.name_key.startswith(key)]
        contains = [r for r in rows if key in r.name_key and not r.name_key.startswith(key)]
        rows = prefix + contains
    return [r.name for r in rows[:8]]

@app.get("/items")
def get_items(list_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """קבלת כל הפריטים ברשימה"""
    # בדיקה שהמשתמש מורשה לגשת לרשימה
    shopping_list = db.query(models.ShoppingList).filter(models.ShoppingList.id == list_id).first()
    if not shopping_list:
        raise HTTPException(status_code=404, detail="List not found")
    if shopping_list.owner_id != current_user.id and current_user not in shopping_list.shared_users:
        raise HTTPException(status_code=403, detail="Not authorized to access this list")
    
    items = db.query(models.ShoppingItem).filter(models.ShoppingItem.list_id == list_id).order_by(models.ShoppingItem.position).all()
    return items

def _find_history(db: Session, user_id: int, name_key: str):
    return db.query(models.ItemHistory).filter(
        models.ItemHistory.user_id == user_id,
        models.ItemHistory.name_key == name_key
    ).first()


def _record_history(db: Session, user_id: int, name: str):
    """מעדכן את היסטוריית המוצרים. בתוך SAVEPOINT, כדי שהוספה מקבילה לא תכשיל את הוספת המוצר"""
    name_key = name.strip().lower()[:100]
    clean_name = name.strip()[:100]
    now = datetime.utcnow()

    def bump(row):
        row.use_count = (row.use_count or 0) + 1
        row.last_used = now
        row.name = clean_name

    history = _find_history(db, user_id, name_key)
    if history:
        bump(history)
        return
    try:
        with db.begin_nested():
            db.add(models.ItemHistory(
                user_id=user_id, name=clean_name, name_key=name_key,
                use_count=1, last_used=now
            ))
    except IntegrityError:
        # הוספה מקבילה יצרה את השורה קודם - מגדילים אותה
        bump(_find_history(db, user_id, name_key))


@app.post("/items")
def add_item(item: ItemCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """הוספת פריט חדש"""
    # בדיקת הרשאות
    shopping_list = db.query(models.ShoppingList).filter(models.ShoppingList.id == item.list_id).first()
    if not shopping_list:
        raise HTTPException(status_code=404, detail="List not found")
    if shopping_list.owner_id != current_user.id and current_user not in shopping_list.shared_users:
        raise HTTPException(status_code=403, detail="Not authorized to modify this list")
    
    # מוצר חדש נכנס לראש הרשימה: position קטן מכל הקיימים
    # (כך האפליקציה לא צריכה לשלוח בקשת סידור נוספת אחרי כל הוספה)
    min_position = db.query(func.min(models.ShoppingItem.position)).filter(
        models.ShoppingItem.list_id == item.list_id
    ).scalar()
    top_position = 0 if min_position is None else min_position - 1

    # קנייה חוזרת: אם יש ברשימה מוצר שנקנה באותו שם - מחזירים אותו לרשימה במקום להוסיף כפילות
    wanted = item.name.strip().lower()
    bought = db.query(models.ShoppingItem).filter(
        models.ShoppingItem.list_id == item.list_id,
        models.ShoppingItem.purchased == True  # noqa: E712
    ).order_by(models.ShoppingItem.position).all()
    revived = next((i for i in bought if i.name.strip().lower() == wanted), None)

    if revived is not None:
        revived.purchased = False
        revived.position = top_position
        new_item = revived
    else:
        new_item = models.ShoppingItem(
            name=item.name,
            amount=item.amount,
            list_id=item.list_id,
            position=top_position
        )
        db.add(new_item)

    # היסטוריית מוצרים של המשתמש המוסיף (באותה טרנזקציה)
    _record_history(db, current_user.id, item.name)
    db.commit()
    db.refresh(new_item)
    return new_item

@app.put("/items/{item_id}")
def update_item(item_id: int, item_update: ItemUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """עדכון פריט"""
    item = db.query(models.ShoppingItem).filter(models.ShoppingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # בדיקת הרשאות
    shopping_list = item.shopping_list
    if shopping_list.owner_id != current_user.id and current_user not in shopping_list.shared_users:
        raise HTTPException(status_code=403, detail="Not authorized to modify this list")
    
    if item_update.name is not None:
        item.name = item_update.name
    if item_update.amount is not None:
        item.amount = item_update.amount
    if item_update.purchased is not None:
        item.purchased = item_update.purchased
    if item_update.position is not None:
        item.position = item_update.position
    
    db.commit()
    db.refresh(item)
    return item

@app.delete("/items/{item_id}")
def delete_item(item_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """מחיקת פריט"""
    item = db.query(models.ShoppingItem).filter(models.ShoppingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # בדיקת הרשאות
    shopping_list = item.shopping_list
    if shopping_list.owner_id != current_user.id and current_user not in shopping_list.shared_users:
        raise HTTPException(status_code=403, detail="Not authorized to modify this list")
    
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}

@app.post("/items/reorder")
async def reorder_items(reordered_items: List[ReorderEntry], current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """עדכון סדר הפריטים"""
    for item_data in reordered_items:
        item = db.query(models.ShoppingItem).filter(models.ShoppingItem.id == item_data.id).first()
        if item:
            # בדיקת הרשאות
            shopping_list = item.shopping_list
            if shopping_list.owner_id != current_user.id and current_user not in shopping_list.shared_users:
                raise HTTPException(status_code=403, detail="Not authorized to modify this list")
            
            item.position = item_data.position
    
    db.commit()
    return {"status": "success"}
    
@app.put("/lists/{list_id}", response_model=ShoppingListResponse)
def update_list(list_id: int, list_data: ShoppingListCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """עדכון שם רשימה"""
    shopping_list = db.query(models.ShoppingList).filter(models.ShoppingList.id == list_id).first()
    if not shopping_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    # בדיקת הרשאות (רק הבעלים יכול לערוך את שם הרשימה)
    if shopping_list.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this list")
    
    shopping_list.name = list_data.name
    db.commit()
    db.refresh(shopping_list)
    return shopping_list

@app.delete("/lists/{list_id}")
def delete_list(list_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """מחיקת רשימה (כולל כל הפריטים שבה בזכות cascade)"""
    shopping_list = db.query(models.ShoppingList).filter(models.ShoppingList.id == list_id).first()
    if not shopping_list:
        raise HTTPException(status_code=404, detail="List not found")
    
    # בדיקת הרשאות (רק הבעלים יכול למחוק את הרשימה)
    if shopping_list.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this list")
    
    db.delete(shopping_list)
    db.commit()
    return {"message": "List deleted successfully"}    

# === Invite Endpoints ===

join_limiter = sharing.JoinAttemptLimiter()

def get_owned_list_or_error(db: Session, list_id: int, user: models.User):
    """מחזיר רשימה שהמשתמש הוא הבעלים שלה, או 404/403"""
    shopping_list = db.query(models.ShoppingList).filter(models.ShoppingList.id == list_id).first()
    if not shopping_list:
        raise HTTPException(status_code=404, detail="הרשימה לא נמצאה")
    if shopping_list.owner_id != user.id:
        raise HTTPException(status_code=403, detail="רק הבעלים של הרשימה יכול לבצע פעולה זו")
    return shopping_list

def set_new_invite_code(db: Session, shopping_list: models.ShoppingList) -> str:
    """יוצר קוד חדש לרשימה. אם הקוד כבר תפוס מנסים שוב, עד 5 פעמים"""
    for _ in range(5):
        code = sharing.generate_invite_code()
        if not db.query(models.ListInvite).filter(models.ListInvite.code == code).first():
            break
    else:
        raise HTTPException(status_code=500, detail="לא הצלחנו ליצור קוד הזמנה, נסו שוב")
    if shopping_list.invite:
        shopping_list.invite.code = code
        shopping_list.invite.created_at = datetime.utcnow()
    else:
        shopping_list.invite = models.ListInvite(code=code, created_at=datetime.utcnow())
    db.commit()
    return code

@app.post("/lists/{list_id}/invite")
def get_invite_code(list_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """קוד ההזמנה של הרשימה (נוצר בפעם הראשונה). רק הבעלים"""
    shopping_list = get_owned_list_or_error(db, list_id, current_user)
    if shopping_list.invite:
        return {"code": shopping_list.invite.code}
    try:
        return {"code": set_new_invite_code(db, shopping_list)}
    except IntegrityError:
        # שתי בקשות ראשונות במקביל: השנייה נכשלה על המפתח הראשי - מחזירים את הקוד שנוצר
        db.rollback()
        invite = db.query(models.ListInvite).filter(models.ListInvite.list_id == list_id).first()
        if not invite:
            raise
        return {"code": invite.code}

@app.post("/lists/{list_id}/invite/reset")
def reset_invite_code(list_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """מחליף את קוד ההזמנה בקוד חדש, והקוד הישן מפסיק לעבוד. רק הבעלים"""
    shopping_list = get_owned_list_or_error(db, list_id, current_user)
    return {"code": set_new_invite_code(db, shopping_list)}

class JoinListRequest(BaseModel):
    code: str = Field(max_length=100)

@app.post("/lists/join", response_model=ShoppingListResponse)
def join_list(join_request: JoinListRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """הצטרפות לרשימה עם קוד הזמנה. מוגבל בניסיונות כושלים"""
    now = time.monotonic()
    if join_limiter.is_blocked(current_user.id, now):
        raise HTTPException(status_code=429, detail="יותר מדי ניסיונות, נסה שוב בעוד כמה דקות")
    code = sharing.normalize_invite_code(join_request.code)
    invite = db.query(models.ListInvite).filter(models.ListInvite.code == code).first()
    if not invite:
        join_limiter.record_failure(current_user.id, now)
        raise HTTPException(status_code=404, detail="קוד ההזמנה לא נמצא")
    shopping_list = db.query(models.ShoppingList).filter(models.ShoppingList.id == invite.list_id).first()
    if shopping_list.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="זו הרשימה שלך")
    if current_user not in shopping_list.shared_users:
        shopping_list.shared_users.append(current_user)
        db.commit()
    return ShoppingListResponse(id=shopping_list.id, name=shopping_list.name, owner_id=shopping_list.owner_id, is_owner=False)

# === Members Endpoints ===

def get_accessible_list_or_error(db: Session, list_id: int, user: models.User):
    """מחזיר רשימה שהמשתמש הוא הבעלים שלה או משתתף בה, או 404/403"""
    shopping_list = db.query(models.ShoppingList).filter(models.ShoppingList.id == list_id).first()
    if not shopping_list:
        raise HTTPException(status_code=404, detail="הרשימה לא נמצאה")
    if shopping_list.owner_id != user.id and user not in shopping_list.shared_users:
        raise HTTPException(status_code=403, detail="אין לך גישה לרשימה הזו")
    return shopping_list

@app.post("/lists/{list_id}/purchased/restore")
def restore_purchased_items(list_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """החזרת כל המוצרים שנקנו למצב 'לא נקנה'"""
    get_accessible_list_or_error(db, list_id, current_user)
    restored = db.query(models.ShoppingItem).filter(
        models.ShoppingItem.list_id == list_id,
        models.ShoppingItem.purchased == True  # noqa: E712
    ).update({models.ShoppingItem.purchased: False}, synchronize_session=False)
    db.commit()
    return {"restored": restored}

@app.post("/lists/{list_id}/purchased/clear")
def clear_purchased_items(list_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """מחיקת כל המוצרים שנקנו"""
    get_accessible_list_or_error(db, list_id, current_user)
    deleted = db.query(models.ShoppingItem).filter(
        models.ShoppingItem.list_id == list_id,
        models.ShoppingItem.purchased == True  # noqa: E712
    ).delete(synchronize_session=False)
    db.commit()
    return {"deleted": deleted}

@app.get("/lists/{list_id}/members")
def get_list_members(list_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """משתתפי הרשימה: הבעלים ראשון ואחריו המשתתפים לפי שם משתמש. בלי אימייל"""
    shopping_list = get_accessible_list_or_error(db, list_id, current_user)
    members = [{"id": shopping_list.owner.id, "username": shopping_list.owner.username, "is_owner": True}]
    for user in sorted(shopping_list.shared_users, key=lambda u: u.username):
        members.append({"id": user.id, "username": user.username, "is_owner": False})
    return members

@app.delete("/lists/{list_id}/members/{user_id}")
def remove_list_member(list_id: int, user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """הוצאת משתתף מהרשימה. רק הבעלים"""
    shopping_list = get_owned_list_or_error(db, list_id, current_user)
    member = next((u for u in shopping_list.shared_users if u.id == user_id), None)
    if not member:
        raise HTTPException(status_code=404, detail="המשתתף לא נמצא ברשימה")
    shopping_list.shared_users.remove(member)
    db.commit()
    return {"message": "המשתתף הוצא מהרשימה"}

@app.post("/lists/{list_id}/leave")
def leave_list(list_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """עזיבת רשימה משותפת. הבעלים לא יכול לעזוב"""
    shopping_list = get_accessible_list_or_error(db, list_id, current_user)
    if shopping_list.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="הבעלים לא יכול לעזוב את הרשימה")
    shopping_list.shared_users.remove(current_user)
    db.commit()
    return {"message": "עזבת את הרשימה"}

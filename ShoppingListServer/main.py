from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import models
from database import engine, get_db
import os
from dotenv import load_dotenv

load_dotenv()

# יצירת הטבלאות ב-DB
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# הגדרות אבטחה
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")  # ⚠️ חשוב לשנות בייצור!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # שבוע

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

class ShoppingListCreate(BaseModel):
    name: str

class ShoppingListResponse(BaseModel):
    id: int
    name: str
    owner_id: int
    
    class Config:
        from_attributes = True

class ItemCreate(BaseModel):
    name: str
    amount: int = 1
    list_id: int

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[int] = None
    purchased: Optional[bool] = None
    position: Optional[int] = None

class ShareListRequest(BaseModel):
    list_id: int
    username: str

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
    # בדיקה אם המשתמש כבר קיים
    if get_user_by_username(db, user.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    if get_user_by_email(db, user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
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
    user = get_user_by_username(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
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

# === Shopping Lists Endpoints ===

@app.get("/lists", response_model=List[ShoppingListResponse])
def get_lists(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """קבלת כל הרשימות של המשתמש (שלו + משותפות)"""
    owned_lists = current_user.owned_lists
    shared_lists = current_user.shared_lists
    all_lists = owned_lists + shared_lists
    return all_lists

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

@app.post("/items")
def add_item(item: ItemCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """הוספת פריט חדש"""
    # בדיקת הרשאות
    shopping_list = db.query(models.ShoppingList).filter(models.ShoppingList.id == item.list_id).first()
    if not shopping_list:
        raise HTTPException(status_code=404, detail="List not found")
    if shopping_list.owner_id != current_user.id and current_user not in shopping_list.shared_users:
        raise HTTPException(status_code=403, detail="Not authorized to modify this list")
    
    # חישוב position הבא
    max_position = db.query(models.ShoppingItem).filter(models.ShoppingItem.list_id == item.list_id).count()
    
    new_item = models.ShoppingItem(
        name=item.name,
        amount=item.amount,
        list_id=item.list_id,
        position=max_position
    )
    db.add(new_item)
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
async def reorder_items(reordered_items: List[dict], current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """עדכון סדר הפריטים"""
    for item_data in reordered_items:
        item = db.query(models.ShoppingItem).filter(models.ShoppingItem.id == item_data['id']).first()
        if item:
            # בדיקת הרשאות
            shopping_list = item.shopping_list
            if shopping_list.owner_id != current_user.id and current_user not in shopping_list.shared_users:
                raise HTTPException(status_code=403, detail="Not authorized to modify this list")
            
            item.position = item_data['position']
    
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
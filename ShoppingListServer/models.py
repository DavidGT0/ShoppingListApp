from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base

# טבלת many-to-many לשיתוף רשימות בין משתמשים
shared_lists = Table(
    'shared_lists',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('list_id', Integer, ForeignKey('shopping_lists.id'))
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # קשר לרשימות שהמשתמש יצר
    owned_lists = relationship("ShoppingList", back_populates="owner", foreign_keys="ShoppingList.owner_id")
    
    # קשר לרשימות משותפות
    shared_lists = relationship("ShoppingList", secondary=shared_lists, back_populates="shared_users")

    # בקשות איפוס סיסמה (נמחקות יחד עם המשתמש)
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")

    # היסטוריית מוצרים להצעות השלמה (נמחקת יחד עם המשתמש)
    item_history = relationship("ItemHistory", back_populates="user", cascade="all, delete-orphan")


class ShoppingList(Base):
    __tablename__ = "shopping_lists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey('users.id'))
    
    # קשר למשתמש הבעלים
    owner = relationship("User", back_populates="owned_lists", foreign_keys=[owner_id])
    
    # קשר למשתמשים משותפים
    shared_users = relationship("User", secondary=shared_lists, back_populates="shared_lists")
    
    # קשר לפריטים
    items = relationship("ShoppingItem", back_populates="shopping_list", cascade="all, delete-orphan")

    # קוד הזמנה (אחד לכל רשימה, נמחק יחד איתה)
    invite = relationship("ListInvite", uselist=False, cascade="all, delete-orphan")

    # מחלקות מותאמות אישית של הרשימה (נמחקות יחד איתה)
    custom_categories = relationship(
        "CustomCategory", back_populates="shopping_list",
        cascade="all, delete-orphan", order_by="CustomCategory.id"
    )


class ShoppingItem(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    amount = Column(Integer, default=1)
    purchased = Column(Boolean, default=False)
    position = Column(Integer, default=0)  # לסדר הפריטים
    list_id = Column(Integer, ForeignKey('shopping_lists.id'))
    # עמודות שנוספו בסבב 2 (נוספות ל-DB קיים דרך schema_upgrade.ensure_columns)
    unit = Column(String(10), nullable=True)
    note = Column(String(100), nullable=True)
    category = Column(String(40), nullable=True)
    added_by_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    shopping_list = relationship("ShoppingList", back_populates="items")
    added_by = relationship("User", foreign_keys=[added_by_id])


class CustomCategory(Base):
    """מחלקה מותאמת אישית, שייכת לרשימה אחת. הערך בפריט: custom:<id>"""
    __tablename__ = "custom_categories"
    __table_args__ = (UniqueConstraint("list_id", "name", name="uq_custom_category_list_name"),)

    id = Column(Integer, primary_key=True, index=True)
    list_id = Column(Integer, ForeignKey('shopping_lists.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(30), nullable=False)
    color = Column(String(9), nullable=False)
    created_at = Column(DateTime, nullable=False)  # UTC

    shopping_list = relationship("ShoppingList", back_populates="custom_categories")


class ItemHistory(Base):
    """שמות מוצרים שהמשתמש הוסיף בעבר, להצעות השלמה. פרטי לכל משתמש."""
    __tablename__ = "item_history"
    __table_args__ = (UniqueConstraint("user_id", "name_key", name="uq_item_history_user_name"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    name = Column(String(100), nullable=False)      # כפי שהוקלד לאחרונה
    name_key = Column(String(100), nullable=False)  # name.strip().lower()
    use_count = Column(Integer, default=1, nullable=False)
    last_used = Column(DateTime, nullable=False)  # UTC
    category = Column(String(40), nullable=True)

    user = relationship("User", back_populates="item_history")


class PasswordResetToken(Base):
    """קישור איפוס סיסמה חד-פעמי. נשמר רק ה-hash של הטוקן, לא הטוקן עצמו."""
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False)  # UTC
    expires_at = Column(DateTime, nullable=False)  # UTC
    used = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="reset_tokens")


class ListInvite(Base):
    """קוד הזמנה לרשימה: מי שמחזיק בקוד יכול להצטרף לרשימה"""
    __tablename__ = "list_invites"

    list_id = Column(Integer, ForeignKey('shopping_lists.id'), primary_key=True)
    code = Column(String(16), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False)  # UTC

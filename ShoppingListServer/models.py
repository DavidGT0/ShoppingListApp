from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table
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


class ShoppingItem(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    amount = Column(Integer, default=1)
    purchased = Column(Boolean, default=False)
    position = Column(Integer, default=0)  # לסדר הפריטים
    list_id = Column(Integer, ForeignKey('shopping_lists.id'))
    
    shopping_list = relationship("ShoppingList", back_populates="items")
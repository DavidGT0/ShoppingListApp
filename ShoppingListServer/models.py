from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class ShoppingItem(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    amount = Column(Integer, default=1)
    purchased = Column(Boolean, default=False)
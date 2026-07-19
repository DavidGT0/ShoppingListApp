from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import models
from database import engine, get_db

# יצירת הטבלאות ב-DB (אם הן לא קיימות)
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# הוספת CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic מודלים
class ItemCreate(BaseModel):
    name: str
    amount: int = 1

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[int] = None
    purchased: Optional[bool] = None

@app.get("/")
def root():
    return {"status": "Server is up and running!"}

@app.get("/items")
def get_items(db: Session = Depends(get_db)):
    items = db.query(models.ShoppingItem).all()
    return items

@app.post("/items")
def add_item(item: ItemCreate, db: Session = Depends(get_db)):
    new_item = models.ShoppingItem(name=item.name, amount=item.amount)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@app.put("/items/{item_id}")
def update_item(item_id: int, item_update: ItemUpdate, db: Session = Depends(get_db)):
    item = db.query(models.ShoppingItem).filter(models.ShoppingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item_update.name is not None:
        item.name = item_update.name
    if item_update.amount is not None:
        item.amount = item_update.amount
    if item_update.purchased is not None:
        item.purchased = item_update.purchased
    
    db.commit()
    db.refresh(item)
    return item

@app.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.ShoppingItem).filter(models.ShoppingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}
    
@app.post("/items/reorder")
async def reorder_items(reordered_items: list[dict]):
    # reordered_items יקבל רשימה של {id: 1, position: 0}, {id: 2, position: 1} וכו'
    for item_data in reordered_items:
        # כאן תריץ עדכון ל-SQL:
        # UPDATE items SET position = item_data['position'] WHERE id = item_data['id']
        pass
    return {"status": "success"}
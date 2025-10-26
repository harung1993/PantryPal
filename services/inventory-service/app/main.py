from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel
import os

app = FastAPI(title="PantryPal Inventory Service", version="1.0.0")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///data/inventory.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ItemDB(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    barcode = Column(String, index=True, nullable=True)
    name = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    category = Column(String, default="Uncategorized")
    location = Column(String, default="Basement Pantry")
    quantity = Column(Integer, default=1)
    expiry_date = Column(Date, nullable=True)
    notes = Column(String, nullable=True)
    manually_added = Column(Boolean, default=False)
    added_date = Column(DateTime, default=datetime.utcnow)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

Base.metadata.create_all(bind=engine)

class ItemCreate(BaseModel):
    barcode: Optional[str] = None
    name: str
    brand: Optional[str] = None
    image_url: Optional[str] = None
    category: str = "Uncategorized"
    location: str = "Basement Pantry"
    quantity: int = 1
    expiry_date: Optional[date] = None
    notes: Optional[str] = None
    manually_added: bool = False

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    quantity: Optional[int] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None

class ItemResponse(BaseModel):
    id: int
    barcode: Optional[str]
    name: str
    brand: Optional[str]
    image_url: Optional[str]
    category: str
    location: str
    quantity: int
    expiry_date: Optional[date]
    notes: Optional[str]
    manually_added: bool
    added_date: datetime
    updated_date: datetime
    
    class Config:
        from_attributes = True

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "inventory-service", "timestamp": datetime.utcnow().isoformat()}

@app.post("/items", response_model=ItemResponse)
async def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    db_item = ItemDB(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/items", response_model=List[ItemResponse])
async def get_items(location: Optional[str] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ItemDB)
    if location:
        query = query.filter(ItemDB.location == location)
    if search:
        search_term = f"%{search}%"
        query = query.filter((ItemDB.name.ilike(search_term)) | (ItemDB.brand.ilike(search_term)) | (ItemDB.barcode.ilike(search_term)))
    items = query.order_by(ItemDB.updated_date.desc()).all()
    return items

@app.get("/items/expiring")
async def get_expiring_items(days: int = 7, db: Session = Depends(get_db)):
    """Get items expiring within specified days"""
    from datetime import timedelta
    cutoff_date = date.today() + timedelta(days=days)
    items = db.query(ItemDB).filter(
        ItemDB.expiry_date.isnot(None),
        ItemDB.expiry_date <= cutoff_date
    ).order_by(ItemDB.expiry_date).all()
    return items

@app.get("/items/{item_id}", response_model=ItemResponse)
async def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(ItemDB).filter(ItemDB.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: int, item_update: ItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(ItemDB).filter(ItemDB.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    update_data = item_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)
    db_item.updated_date = datetime.utcnow()
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/items/{item_id}")
async def delete_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(ItemDB).filter(ItemDB.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(db_item)
    db.commit()
    return {"message": "Item deleted successfully", "id": item_id}

@app.get("/locations")
async def get_locations(db: Session = Depends(get_db)):
    locations = db.query(ItemDB.location).distinct().all()
    return {"locations": [loc[0] for loc in locations], "count": len(locations)}

@app.get("/categories")
async def get_categories(db: Session = Depends(get_db)):
    categories = db.query(ItemDB.category).distinct().all()
    return {"categories": [cat[0] for cat in categories], "count": len(categories)}

@app.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    total_items = db.query(ItemDB).count()
    locations = db.query(ItemDB.location).distinct().count()
    categories = db.query(ItemDB.category).distinct().count()
    total_quantity = db.query(ItemDB).with_entities(ItemDB.quantity).all()
    
    # Count expiring items (within 7 days)
    from datetime import timedelta
    cutoff_date = date.today() + timedelta(days=7)
    expiring_soon = db.query(ItemDB).filter(
        ItemDB.expiry_date.isnot(None),
        ItemDB.expiry_date <= cutoff_date
    ).count()
    
    return {
        "total_items": total_items,
        "total_quantity": sum(q[0] for q in total_quantity),
        "locations_count": locations,
        "categories_count": categories,
        "expiring_soon": expiring_soon,
        "manually_added_count": db.query(ItemDB).filter(ItemDB.manually_added == True).count()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
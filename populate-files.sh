#!/bin/bash

# PantryPal - Populate all files with code
# Run this inside the pantrypal directory

set -e

echo "📝 Populating all PantryPal files with code..."
echo ""

# ============================================
# DOCKER COMPOSE
# ============================================
echo "Writing docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  api-gateway:
    build: ./services/api-gateway
    container_name: pantrypal-api-gateway
    ports:
      - "8000:8000"
    depends_on:
      - inventory-service
      - lookup-service
    environment:
      - INVENTORY_SERVICE_URL=http://inventory-service:8001
      - LOOKUP_SERVICE_URL=http://lookup-service:8002
    networks:
      - pantrypal-network
    restart: unless-stopped

  inventory-service:
    build: ./services/inventory-service
    container_name: pantrypal-inventory
    ports:
      - "8001:8001"
    volumes:
      - ./data/inventory:/app/data
    environment:
      - DATABASE_URL=sqlite:///data/inventory.db
    networks:
      - pantrypal-network
    restart: unless-stopped

  lookup-service:
    build: ./services/lookup-service
    container_name: pantrypal-lookup
    ports:
      - "8002:8002"
    volumes:
      - ./data/lookup_cache:/app/data
    environment:
      - CACHE_DB_PATH=/app/data/lookup_cache.db
      - CACHE_TTL_DAYS=30
    networks:
      - pantrypal-network
    restart: unless-stopped

networks:
  pantrypal-network:
    driver: bridge
EOF

# ============================================
# API GATEWAY
# ============================================
echo "Writing API Gateway files..."

cat > services/api-gateway/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

cat > services/api-gateway/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
httpx==0.25.1
pydantic==2.5.0
EOF

cat > services/api-gateway/app/main.py << 'EOF'
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from typing import Optional
from pydantic import BaseModel

app = FastAPI(title="PantryPal API Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INVENTORY_SERVICE_URL = os.getenv("INVENTORY_SERVICE_URL", "http://inventory-service:8001")
LOOKUP_SERVICE_URL = os.getenv("LOOKUP_SERVICE_URL", "http://lookup-service:8002")

class AddItemRequest(BaseModel):
    barcode: str
    location: str = "Basement Pantry"
    quantity: int = 1

class ManualAddRequest(BaseModel):
    name: str
    barcode: Optional[str] = None
    brand: Optional[str] = None
    location: str = "Basement Pantry"
    quantity: int = 1
    notes: Optional[str] = None

class UpdateItemRequest(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    location: Optional[str] = None
    quantity: Optional[int] = None
    notes: Optional[str] = None

@app.get("/")
async def root():
    return {"service": "PantryPal API Gateway", "version": "1.0.0", "status": "healthy"}

@app.get("/health")
async def health_check():
    try:
        async with httpx.AsyncClient() as client:
            inventory_health = await client.get(f"{INVENTORY_SERVICE_URL}/health", timeout=2.0)
            lookup_health = await client.get(f"{LOOKUP_SERVICE_URL}/health", timeout=2.0)
        return {
            "status": "healthy",
            "services": {
                "inventory": inventory_health.json(),
                "lookup": lookup_health.json()
            }
        }
    except Exception as e:
        return {"status": "degraded", "error": str(e)}

@app.get("/api/lookup/{barcode}")
async def lookup_barcode(barcode: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{LOOKUP_SERVICE_URL}/lookup/{barcode}", timeout=10.0)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Lookup service error: {str(e)}")

@app.post("/api/items")
async def add_item(request: AddItemRequest):
    try:
        async with httpx.AsyncClient() as client:
            lookup_response = await client.get(f"{LOOKUP_SERVICE_URL}/lookup/{request.barcode}", timeout=10.0)
            
            if lookup_response.status_code == 200:
                product_info = lookup_response.json()
            else:
                product_info = {
                    "barcode": request.barcode,
                    "name": f"Unknown Product ({request.barcode})",
                    "brand": None,
                    "image_url": None,
                    "found": False
                }
            
            inventory_data = {
                "barcode": request.barcode,
                "name": product_info.get("name", request.barcode),
                "brand": product_info.get("brand"),
                "image_url": product_info.get("image_url"),
                "location": request.location,
                "quantity": request.quantity,
                "manually_added": False
            }
            
            inventory_response = await client.post(f"{INVENTORY_SERVICE_URL}/items", json=inventory_data, timeout=5.0)
            inventory_response.raise_for_status()
            
            result = inventory_response.json()
            result["product_info"] = product_info
            return result
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Service error: {str(e)}")

@app.post("/api/items/manual")
async def add_item_manual(request: ManualAddRequest):
    try:
        async with httpx.AsyncClient() as client:
            inventory_data = {
                "barcode": request.barcode,
                "name": request.name,
                "brand": request.brand,
                "image_url": None,
                "location": request.location,
                "quantity": request.quantity,
                "notes": request.notes,
                "manually_added": True
            }
            response = await client.post(f"{INVENTORY_SERVICE_URL}/items", json=inventory_data, timeout=5.0)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Inventory service error: {str(e)}")

@app.get("/api/items")
async def get_items(location: Optional[str] = None, search: Optional[str] = None):
    try:
        params = {}
        if location:
            params["location"] = location
        if search:
            params["search"] = search
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{INVENTORY_SERVICE_URL}/items", params=params, timeout=5.0)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Inventory service error: {str(e)}")

@app.get("/api/items/{item_id}")
async def get_item(item_id: int):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{INVENTORY_SERVICE_URL}/items/{item_id}", timeout=5.0)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Item not found")
        raise HTTPException(status_code=500, detail=f"Inventory service error: {str(e)}")

@app.put("/api/items/{item_id}")
async def update_item(item_id: int, request: UpdateItemRequest):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.put(f"{INVENTORY_SERVICE_URL}/items/{item_id}", json=request.dict(exclude_unset=True), timeout=5.0)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Item not found")
        raise HTTPException(status_code=500, detail=f"Inventory service error: {str(e)}")

@app.delete("/api/items/{item_id}")
async def delete_item(item_id: int):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(f"{INVENTORY_SERVICE_URL}/items/{item_id}", timeout=5.0)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Item not found")
        raise HTTPException(status_code=500, detail=f"Inventory service error: {str(e)}")

@app.get("/api/locations")
async def get_locations():
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{INVENTORY_SERVICE_URL}/locations", timeout=5.0)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Inventory service error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF

# ============================================
# INVENTORY SERVICE
# ============================================
echo "Writing Inventory Service files..."

cat > services/inventory-service/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
EOF

cat > services/inventory-service/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
pydantic==2.5.0
EOF

cat > services/inventory-service/app/main.py << 'EOFPYTHON'
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
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
    location = Column(String, default="Basement Pantry")
    quantity = Column(Integer, default=1)
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
    location: str = "Basement Pantry"
    quantity: int = 1
    notes: Optional[str] = None
    manually_added: bool = False

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    location: Optional[str] = None
    quantity: Optional[int] = None
    notes: Optional[str] = None

class ItemResponse(BaseModel):
    id: int
    barcode: Optional[str]
    name: str
    brand: Optional[str]
    image_url: Optional[str]
    location: str
    quantity: int
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

@app.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    total_items = db.query(ItemDB).count()
    locations = db.query(ItemDB.location).distinct().count()
    total_quantity = db.query(ItemDB).with_entities(ItemDB.quantity).all()
    return {
        "total_items": total_items,
        "total_quantity": sum(q[0] for q in total_quantity),
        "locations_count": locations,
        "manually_added_count": db.query(ItemDB).filter(ItemDB.manually_added == True).count()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
EOFPYTHON

# ============================================
# LOOKUP SERVICE
# ============================================
echo "Writing Lookup Service files..."

cat > services/lookup-service/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 8002

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
EOF

cat > services/lookup-service/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
httpx==0.25.1
EOF

cat > services/lookup-service/app/main.py << 'EOFPYTHON'
from fastapi import FastAPI, HTTPException
import httpx
import sqlite3
import json
import os
from datetime import datetime, timedelta
from typing import Optional

app = FastAPI(title="PantryPal Lookup Service", version="1.0.0")

CACHE_DB_PATH = os.getenv("CACHE_DB_PATH", "/app/data/lookup_cache.db")
CACHE_TTL_DAYS = int(os.getenv("CACHE_TTL_DAYS", "30"))

def init_cache_db():
    os.makedirs(os.path.dirname(CACHE_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(CACHE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS lookup_cache (
            barcode TEXT PRIMARY KEY,
            product_data TEXT NOT NULL,
            cached_at TIMESTAMP NOT NULL,
            expires_at TIMESTAMP NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_cache_db()

def get_from_cache(barcode: str) -> Optional[dict]:
    conn = sqlite3.connect(CACHE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT product_data, expires_at FROM lookup_cache WHERE barcode = ? AND expires_at > ?", 
                   (barcode, datetime.utcnow().isoformat()))
    result = cursor.fetchone()
    conn.close()
    if result:
        return json.loads(result[0])
    return None

def save_to_cache(barcode: str, product_data: dict):
    conn = sqlite3.connect(CACHE_DB_PATH)
    cursor = conn.cursor()
    cached_at = datetime.utcnow()
    expires_at = cached_at + timedelta(days=CACHE_TTL_DAYS)
    cursor.execute("INSERT OR REPLACE INTO lookup_cache (barcode, product_data, cached_at, expires_at) VALUES (?, ?, ?, ?)",
                   (barcode, json.dumps(product_data), cached_at.isoformat(), expires_at.isoformat()))
    conn.commit()
    conn.close()

async def lookup_open_food_facts(barcode: str) -> Optional[dict]:
    url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == 1 and "product" in data:
                    product = data["product"]
                    return {
                        "barcode": barcode,
                        "name": product.get("product_name", "Unknown Product"),
                        "brand": product.get("brands", "").split(",")[0].strip() if product.get("brands") else None,
                        "image_url": product.get("image_url"),
                        "source": "Open Food Facts",
                        "found": True
                    }
    except Exception as e:
        print(f"Open Food Facts lookup error: {e}")
    return None

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "lookup-service", "timestamp": datetime.utcnow().isoformat()}

@app.get("/lookup/{barcode}")
async def lookup_barcode(barcode: str):
    cached_data = get_from_cache(barcode)
    if cached_data:
        cached_data["from_cache"] = True
        return cached_data
    product_data = await lookup_open_food_facts(barcode)
    if product_data:
        save_to_cache(barcode, product_data)
        product_data["from_cache"] = False
        return product_data
    return {
        "barcode": barcode,
        "name": f"Unknown Product ({barcode})",
        "brand": None,
        "image_url": None,
        "source": None,
        "found": False,
        "from_cache": False
    }

@app.get("/cache/stats")
async def cache_stats():
    conn = sqlite3.connect(CACHE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM lookup_cache")
    total = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM lookup_cache WHERE expires_at > ?", (datetime.utcnow().isoformat(),))
    valid = cursor.fetchone()[0]
    conn.close()
    return {"total_cached": total, "valid_cached": valid, "expired": total - valid, "ttl_days": CACHE_TTL_DAYS}

@app.delete("/cache/{barcode}")
async def clear_cache_item(barcode: str):
    conn = sqlite3.connect(CACHE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lookup_cache WHERE barcode = ?", (barcode,))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    if deleted > 0:
        return {"message": f"Cache cleared for barcode {barcode}"}
    else:
        raise HTTPException(status_code=404, detail="Barcode not found in cache")

@app.delete("/cache")
async def clear_all_cache():
    conn = sqlite3.connect(CACHE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lookup_cache")
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    return {"message": f"Cache cleared, {deleted} items removed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
EOFPYTHON

# ============================================
# DONE
# ============================================
echo ""
echo "✅ All files populated!"
echo ""
echo "📋 Next steps:"
echo "1. docker-compose build"
echo "2. docker-compose up -d"
echo "3. curl http://localhost:8000/health"
echo ""
echo "🚀 Ready to build!"
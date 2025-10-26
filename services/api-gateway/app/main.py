from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import Optional
import httpx
import os
from typing import Optional
from datetime import date
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
    expiry_date: Optional[str] = None

class ManualAddRequest(BaseModel):
    name: str
    barcode: Optional[str] = None
    brand: Optional[str] = None
    category: str = "Uncategorized"
    location: str = "Basement Pantry"
    quantity: int = 1
    expiry_date: Optional[str] = None
    notes: Optional[str] = None

class UpdateItemRequest(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    quantity: Optional[int] = None
    expiry_date: Optional[str] = None
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
                    "category": "Uncategorized",
                    "found": False
                }
            
            inventory_data = {
                "barcode": request.barcode,
                "name": product_info.get("name", request.barcode),
                "brand": product_info.get("brand"),
                "image_url": product_info.get("image_url"),
                "category": product_info.get("category", "Uncategorized"),
                "location": request.location,
                "quantity": request.quantity,
                "expiry_date": request.expiry_date,
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
                "category": request.category,
                "location": request.location,
                "quantity": request.quantity,
                "expiry_date": request.expiry_date,
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

@app.get("/api/categories")
async def get_categories():
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{INVENTORY_SERVICE_URL}/categories", timeout=5.0)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Inventory service error: {str(e)}")
    
@app.get("/api/stats/expiring")
async def get_expiring_items(days: int = 7):
    """
    Get items expiring within specified days
    Returns counts and items grouped by urgency
    """
    try:
        async with httpx.AsyncClient() as client:
            # Get all items with expiry dates
            response = await client.get(f"{INVENTORY_SERVICE_URL}/items", timeout=5.0)
            response.raise_for_status()
            items = response.json()
            
            # Filter to only items with expiry dates
            items_with_expiry = [item for item in items if item.get('expiry_date')]
            
            # Calculate expiry status
            today = datetime.now().date()
            
            expired = []
            critical = []  # 0-3 days
            warning = []   # 4-7 days
            upcoming = []  # 8+ days (within specified range)
            
            for item in items_with_expiry:
                try:
                    expiry_date = datetime.fromisoformat(item['expiry_date']).date()
                    days_until = (expiry_date - today).days
                    
                    item_info = {
                        'id': item['id'],
                        'name': item['name'],
                        'brand': item.get('brand'),
                        'location': item['location'],
                        'category': item.get('category', 'Uncategorized'),
                        'quantity': item['quantity'],
                        'expiry_date': item['expiry_date'],
                        'days_until_expiry': days_until
                    }
                    
                    if days_until < 0:
                        expired.append(item_info)
                    elif days_until <= 3:
                        critical.append(item_info)
                    elif days_until <= 7:
                        warning.append(item_info)
                    elif days_until <= days:
                        upcoming.append(item_info)
                        
                except (ValueError, TypeError):
                    continue
            
            # Sort by days until expiry
            expired.sort(key=lambda x: x['days_until_expiry'])
            critical.sort(key=lambda x: x['days_until_expiry'])
            warning.sort(key=lambda x: x['days_until_expiry'])
            upcoming.sort(key=lambda x: x['days_until_expiry'])
            
            return {
                'summary': {
                    'expired': len(expired),
                    'critical': len(critical),
                    'warning': len(warning),
                    'upcoming': len(upcoming),
                    'total_expiring': len(expired) + len(critical) + len(warning)
                },
                'items': {
                    'expired': expired,
                    'critical': critical,
                    'warning': warning,
                    'upcoming': upcoming
                },
                'generated_at': datetime.now().isoformat()
            }
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Inventory service error: {str(e)}")



@app.get("/api/notifications/preferences")
async def get_notification_preferences():
    """Get notification preferences (stored in a simple JSON file for now)"""
    try:
        import json
        import os
        
        prefs_file = '/app/data/notification_preferences.json'
        os.makedirs(os.path.dirname(prefs_file), exist_ok=True)
        
        if os.path.exists(prefs_file):
            with open(prefs_file, 'r') as f:
                return json.load(f)
        else:
            # Return defaults
            return {
                'mobile_enabled': False,
                'notification_time': '09:00',
                'critical_threshold': 3,
                'warning_threshold': 7,
                'home_assistant_enabled': False
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")


@app.post("/api/notifications/preferences")
async def save_notification_preferences(preferences: dict):
    """Save notification preferences"""
    try:
        import json
        import os
        
        prefs_file = '/app/data/notification_preferences.json'
        os.makedirs(os.path.dirname(prefs_file), exist_ok=True)
        
        with open(prefs_file, 'w') as f:
            json.dump(preferences, f, indent=2)
        
        return {'status': 'success', 'preferences': preferences}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save preferences: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
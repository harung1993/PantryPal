#!/usr/bin/env bash

set -e

echo "📝 Populating all PantryPal files..."

# Docker Compose
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

echo "✅ Docker Compose written"

# API Gateway Dockerfile
cat > services/api-gateway/Dockerfile << 'EOF'
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

echo "✅ API Gateway Dockerfile written"


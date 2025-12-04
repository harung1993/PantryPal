#!/bin/bash

set -e

echo "🔧 Setting up Docker buildx for multi-architecture builds..."
docker buildx create --name multiarch --driver docker-container --use 2>/dev/null || docker buildx use multiarch
docker buildx inspect --bootstrap

echo ""
echo "🏗️  Building PantryPal for AMD64 (Ubuntu) and ARM64 (Mac)..."
echo "⏱️  This will take 10-15 minutes..."
echo ""

# Build nginx
echo "📦 [1/5] Building nginx..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t harung43/pantrypal-nginx:latest \
  --push \
  ./nginx

# Build api-gateway
echo "📦 [2/5] Building api-gateway..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t harung43/pantrypal-api-gateway:latest \
  --push \
  ./services/api-gateway

# Build inventory-service
echo "📦 [3/5] Building inventory-service..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t harung43/pantrypal-inventory-service:latest \
  --push \
  ./services/inventory-service

# Build lookup-service
echo "📦 [4/5] Building lookup-service..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t harung43/pantrypal-lookup-service:latest \
  --push \
  ./services/lookup-service

# Build web-ui
echo "📦 [5/5] Building web-ui..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t harung43/pantrypal-web-ui:latest \
  --push \
  ./services/web-ui

echo ""
echo "✅ All images built and pushed to Docker Hub!"
echo ""
echo "📋 Verify multi-arch support:"
echo "   docker buildx imagetools inspect harung43/pantrypal-api-gateway:latest"
echo ""
echo "🚀 Now deploy on Ubuntu:"
echo "   1. Delete the pantrypal stack in Portainer"
echo "   2. Re-create the stack with the same docker-compose.yml"
echo "   3. Ubuntu will automatically pull AMD64 images"
echo ""
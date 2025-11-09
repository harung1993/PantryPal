#!/bin/bash

# PantryPal Startup Script
# This script starts all PantryPal backend services

set -e

echo "🥫 Starting PantryPal..."

# Detect host IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    HOST_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    HOST_IP=$(hostname -I | awk '{print $1}')
else
    # Windows (Git Bash / WSL)
    HOST_IP=$(ipconfig | grep -A 5 "Wireless LAN adapter Wi-Fi" | grep "IPv4" | awk '{print $NF}' | tr -d '\r')
fi

# Fallback if detection fails
if [ -z "$HOST_IP" ]; then
    echo "⚠️  Could not auto-detect IP address. Using default: 192.168.1.100"
    HOST_IP="192.168.1.100"
else
    echo "🌐 Detected host IP: $HOST_IP"
fi

# Export for docker-compose
export HOST_IP

# Start services
echo "🚀 Starting Docker services..."
docker-compose up -d

echo ""
echo "✅ PantryPal is running!"
echo ""
echo "📊 Web Dashboard:  http://localhost"
echo "🔌 API Gateway:    http://localhost/api"
echo "🏠 Your IP:        http://$HOST_IP"
echo ""
echo "📱 Mobile App:"
echo "  Run 'cd mobile && npx expo start' to start the mobile dev server"
echo "  (Will be built with Apple Developer account soon!)"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop PantryPal:"
echo "  docker-compose down"
echo ""
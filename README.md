# 🥫 PantryPal - Self-Hosted Pantry Inventory System

**Version 1.2.0** | Self-hosted | Barcode Scanning | Smart Home Ready

A beautiful, self-hosted inventory management system for tracking pantry items. Scan barcodes, track expiry dates, get notifications, and integrate with Home Assistant!

![PantryPal](https://img.shields.io/badge/Status-Production%20Ready-success)
![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android%20%7C%20Web-blue)
![License](https://img.shields.io/badge/License-Personal%20Use-orange)

---

## ✨ Features

### 📱 Mobile App (iOS/Android)
- **📷 Barcode Scanning** - Quick item additions via camera
- **✏️ Manual Entry** - Add items without barcodes
- **🔔 Smart Notifications** - Daily alerts for expiring items
- **📥 CSV Import/Export** - Backup and bulk operations
- **🎨 Beautiful Pastel UI** - Delightful user experience
- **⚙️ Card-Based Settings** - Easy configuration

### 🌐 Web Dashboard
- **📊 Stats Cards** - Total items, expiring soon, locations
- **📋 Table View** - Full CRUD operations
- **🔍 Search & Filter** - Find items quickly
- **📥 CSV Export** - Download filtered data
- **💻 Responsive Design** - Works on any screen size

### 🏠 Home Assistant Integration
- **📡 REST Sensor** - Track expiring items in HA
- **🤖 Automations** - Trigger actions based on inventory
- **🔊 TTS Announcements** - Voice alerts via smart speakers
- **📱 HA Notifications** - Alert all household devices
- **📊 Dashboard Cards** - Visual inventory status

### 🔧 Backend (Microservices)
- **🐳 Docker Compose** - Easy deployment
- **🚀 FastAPI** - High-performance Python backend
- **🗄️ SQLite** - Lightweight, portable databases
- **🌍 Open Food Facts** - Automatic product lookup
- **💾 Smart Caching** - 30-day TTL for API responses

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### 1. Clone Repository

```bash
git clone git@github.com:harung1993/PantryPal.git
cd PantryPal
```

### 2. Start Backend

```bash
docker-compose up -d
```

Backend will be available at `http://localhost:8000`

### 3. Start Mobile App

```bash
cd mobile
npm install --legacy-peer-deps
npx expo start
```

Scan the QR code with Expo Go app on your phone!

### 4. Start Web Dashboard (Optional)

```bash
cd services/web-ui
npm install
npm run dev
```

Open http://localhost:5173 in your browser!

---

## 📖 Usage

### Adding Items

**Method 1: Barcode Scan**
1. Open app → Tap "📷 Scan"
2. Point camera at barcode
3. Product info auto-fills
4. Adjust quantity, location, expiry date
5. Tap "Add to Pantry"

**Method 2: Manual Entry**
1. Open app → Tap "✏️ Manual"
2. Enter item details
3. Tap "Save Item"

### Managing Inventory

- **View Items:** Home screen shows all items sorted by expiry
- **Group By:** Toggle between Location or Category grouping
- **Edit Items:** Tap any item → Edit → Save
- **Delete Items:** Tap item → Remove from Pantry

### Expiry Tracking

Items are color-coded:
- 🔴 **Red border** - Expired or expires in ≤3 days
- 🟠 **Coral border** - Expires in 4-7 days
- ⚠️ **Text warnings** - "Expires Tomorrow!", "3 days left"

### Notifications

1. Settings → 🔔 Notifications
2. Enable → Grant permission
3. Set daily check time (e.g., 09:00)
4. Configure thresholds
5. Receive daily alerts about expiring items!

---

## 🏠 Home Assistant Setup

### 1. Add REST Sensor

Edit `configuration.yaml`:

```yaml
sensor:
  - platform: rest
    name: Pantry Expiring Items
    resource: http://YOUR_SERVER_IP:8000/api/stats/expiring?days=7
    value_template: "{{ value_json.summary.total_expiring }}"
    json_attributes:
      - summary
      - items
    scan_interval: 3600
```

### 2. Create Automation

```yaml
automation:
  - alias: "Pantry Expiry Alert"
    trigger:
      - platform: time
        at: "09:00:00"
    condition:
      - condition: numeric_state
        entity_id: sensor.pantry_expiring_items
        above: 0
    action:
      - service: notify.mobile_app
        data:
          title: "⚠️ Pantry Alert"
          message: "{{ states('sensor.pantry_expiring_items') }} items expiring soon!"
```

### 3. Add Dashboard Card

```yaml
type: entities
title: 🥫 Pantry Status
entities:
  - sensor.pantry_expiring_items
  - sensor.pantry_expired_count
  - sensor.pantry_critical_count
  - sensor.pantry_warning_count
state_color: true
```

---

## ⚙️ Configuration

### Mobile App

**Set Backend URL:**
1. Settings → 🌐 Connection
2. Enter your server IP (e.g., `http://192.168.1.100:8000`)
3. Tap "Test Connection"
4. Save

**Customize Locations:**
- Settings → ⚙️ Preferences → Manage locations
- Default: Basement Pantry, Kitchen, Fridge, Freezer, Garage

**Customize Categories:**
- Settings → ⚙️ Preferences → Manage categories
- Default: Beverages, Snacks, Dairy, Canned Goods, etc.

### Web Dashboard

Same as mobile - configure via Settings page!

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│           Mobile App (Expo)             │
│   - Barcode Scanner                     │
│   - Notifications                       │
│   - CSV Import/Export                   │
└────────────┬────────────────────────────┘
             │
             │ HTTP REST API
             │
┌────────────▼────────────────────────────┐
│      API Gateway (Port 8000)            │
│   - Request routing                     │
│   - Expiring items stats                │
└───┬──────────────────┬──────────────────┘
    │                  │
    │                  │
┌───▼──────────────┐  ┌▼─────────────────┐
│ Inventory Service│  │ Lookup Service   │
│ (Port 8001)      │  │ (Port 8002)      │
│ - SQLite DB      │  │ - Open Food Facts│
│ - Item CRUD      │  │ - Cache (SQLite) │
└──────────────────┘  └──────────────────┘
```

---

## 📊 Technology Stack

**Backend:**
- Python 3.11 + FastAPI
- SQLite databases
- Docker + Docker Compose
- Open Food Facts API

**Mobile:**
- React Native + Expo SDK 54
- expo-camera (barcode scanning)
- expo-notifications (alerts)
- AsyncStorage (local storage)

**Web:**
- React 18 + Vite
- Axios for API calls
- localStorage for config

**Integration:**
- Home Assistant REST sensor
- YAML automations

---

## 📥 CSV Import/Export

### Export
- Filter by: All Items, Location, or Category
- Download CSV with all item details
- Use for backup or analysis

### Import
- Bulk add items from CSV
- Preview before importing
- Automatic duplicate detection
- Import summary with counts

**CSV Format:**
```csv
ID,Name,Brand,Category,Location,Quantity,Expiry Date,Notes,Barcode,Added Date
1,"Coca Cola","Coca-Cola","Beverages","Basement Pantry",12,2025-12-31,"","5449000000996","2025-10-01"
```

---

## 🔔 Notification System

### Mobile Notifications
- Daily checks at your chosen time
- Smart grouping: Expired, Critical (≤3 days), Warning (≤7 days)
- Configurable thresholds
- Test button for immediate verification
- Works in Expo Go (local notifications)

### Home Assistant
- Hourly sensor updates
- Create automations for:
  - Push notifications to all devices
  - TTS announcements
  - Shopping list additions
  - Light alerts
  - Custom triggers

---

## 🎨 Screenshots

*Coming soon - Add screenshots of mobile app and web dashboard here*

---

## 📚 Documentation

Full documentation available in [`docs/PantryPal - Complete Project Documentation.md`](./docs/PantryPal%20-%20Complete%20Project%20Documentation.md)

Includes:
- Complete API reference
- Architecture details
- Development timeline
- Troubleshooting guide
- Home Assistant integration examples
- Testing procedures

---

## 🛠️ Development

### Project Structure

```
pantrypal/
├── docker-compose.yml          # Backend orchestration
├── services/
│   ├── api-gateway/           # Main API (port 8000)
│   ├── inventory-service/     # Inventory CRUD (port 8001)
│   ├── lookup-service/        # Barcode lookup (port 8002)
│   └── web-ui/                # React dashboard
├── mobile/                     # React Native app
│   └── src/
│       ├── screens/           # 6 app screens
│       ├── services/          # API & notifications
│       └── styles/            # Pastel theme
└── data/                       # SQLite databases (not in git)
```

### Running Locally

```bash
# Backend
docker-compose up -d

# Mobile (separate terminal)
cd mobile && npx expo start

# Web (separate terminal)
cd services/web-ui && npm run dev
```

### Testing

```bash
# Test backend
curl http://localhost:8000/health

# Test expiring items endpoint
curl http://localhost:8000/api/stats/expiring?days=7

# Test barcode lookup
curl http://localhost:8000/api/lookup/5449000000996
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
docker-compose ps
docker-compose logs -f
docker-compose restart
```

### Mobile app can't connect
- Settings → Connection → Verify server IP
- Make sure phone and server on same WiFi
- Test connection with curl from your computer

### Notifications not working
- Grant permission in device Settings
- Verify items have expiry dates
- Try "Send Test Notification" button

### Home Assistant sensor unavailable
- Check backend is accessible from HA
- Verify URL in configuration.yaml
- Check HA logs for errors

---

## 🤝 Contributing

This is a personal project, but feel free to:
- Report issues
- Suggest features
- Fork and customize for your needs

---

## 📝 License

Personal Use - Built for home inventory management

---

## 👤 Author

**Harun**  
Built with ❤️ in October 2025

---

## 🙏 Acknowledgments

- [Open Food Facts](https://world.openfoodfacts.org/) - Free product database
- [Expo](https://expo.dev/) - React Native development platform
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [Home Assistant](https://www.home-assistant.io/) - Smart home platform

---

## ⭐ Star This Repo

If you find PantryPal useful, give it a star! ⭐

**Built to solve the age-old problem: "Do we have this already in the basement pantry?" 🤔**
# PantryPal - Self-Hosted Pantry Inventory System

**Version 1.3.0** | Self-hosted | Barcode Scanning | Smart Home Ready

A self-hosted inventory management system for tracking pantry items with barcode scanning, expiry notifications, and multi-user support. Built as part of the PalStack ecosystem of privacy-first life management tools.

![PantryPal](https://img.shields.io/badge/Status-Production%20Ready-success)
![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Web-blue)
![License](https://img.shields.io/badge/License-Personal%20Use-orange)

---

## Overview

PantryPal helps you manage your household pantry inventory by tracking items, monitoring expiration dates, and sending notifications. Built with a microservices architecture, it runs entirely on your own infrastructure with no cloud dependencies.

**Mission:** "That's what pals do - they show up and help with the everyday stuff."

---

## Features

### Core Functionality
- Barcode scanning with automatic product lookup via Open Food Facts
- Manual item entry with customizable categories and locations
- Expiry date tracking with configurable notifications
- Multi-user support with role-based access control (Owner, Admin, Member, Guest)
- Search and filter by location, category, or expiration status
- Group items by location or category

### Platform Support
- **Web Dashboard:** React-based interface accessible from any browser
- **iOS Mobile App:** Native React Native app distributed via TestFlight
- **Android:** Supported via Expo Go (no native build yet)

### Authentication & Security
- Smart authentication mode: open on local network, secure when accessed remotely
- Multi-tenancy with role-based permissions
- Session-based authentication with bcrypt password hashing
- API key support for service integrations
- Email notifications for password reset and user invites

### Integration
- Home Assistant automation support via REST sensors
- Daily expiry notifications via mobile push or Home Assistant
- API-first design for custom integrations
- Webhook support for automations

---

## Mobile App Access

The PantryPal iOS app is currently distributed via TestFlight for internal testing.

**To request TestFlight access:**
- Email: palstack4u@gmail.com
- Subject: "PantryPal TestFlight Request"
- Include: Your Apple ID email address
- You will receive an invitation within 24-48 hours

**Note:** This app is for personal/family use only and is not available on the public App Store.

---

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- (Optional) SMTP credentials for email notifications
- For iOS: TestFlight access (see above)
- For Android: Expo Go app

### 1. Clone Repository

```bash
git clone https://github.com/harung1993/pantrypal.git
cd pantrypal
```

### 2. Configure Environment (Optional)

For email notifications, create a `.env` file:

```bash
cat > .env << 'EOF'
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=PantryPal
SMTP_USE_TLS=true
EOF
```

**Note:** For Gmail, you must use an App Password, not your regular password. Generate one at: https://myaccount.google.com/apppasswords

### 3. Start Services

```bash
./start-pantrypal.sh
```

Or manually:

```bash
docker-compose up -d
```

### 4. Access the Application

- **Web Dashboard:** http://localhost
- **API Gateway:** http://localhost/api
- **API Documentation:** http://localhost/api/docs
- **Your Local IP:** Displayed by start script (e.g., http://192.168.1.100)

### 5. Default Admin Credentials

- **Username:** admin
- **Password:** admin
- **IMPORTANT:** Change these immediately after first login via Settings > Profile > Change Password

---

## Architecture

PantryPal uses a microservices architecture with the following components:

```
nginx (reverse proxy on port 80)
├── api-gateway (FastAPI)
│   ├── Authentication & user management
│   ├── Request routing
│   ├── Email service (SMTP)
│   └── Session management
├── inventory-service (FastAPI)
│   ├── Item CRUD operations
│   ├── Location & category management
│   └── SQLite database
├── lookup-service (FastAPI)
│   ├── Barcode product lookup
│   ├── Open Food Facts API integration
│   └── SQLite cache (30-day TTL)
└── web-ui (React + Vite)
    └── Web dashboard interface
```

All services run in Docker containers behind an nginx reverse proxy.

---

## Authentication Modes

Configure `AUTH_MODE` in `docker-compose.yml`:

| Mode | Use Case | Home Access | External Access |
|------|----------|-------------|-----------------|
| **smart** | Recommended for home servers | Open (no login) | Login required |
| **none** | Single user, local only | Open | Open (insecure) |
| **full** | Maximum security | Login required | Login required |
| **api_key_only** | API-first, no UI auth | API key required | API key required |

**Recommended:** Use `smart` mode with `TRUSTED_NETWORKS` configured for your home network.

### Trusted Networks

Default trusted networks (local/private IPs):
```
192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 127.0.0.0/8
```

---

## User Management

### Admin Features

Admins can:
- View all users and system statistics
- Invite new users (creates account + sends welcome email)
- Enable/disable user accounts
- Delete users
- Manage their own profile and password

### Creating Users

1. Login as admin
2. Navigate to Settings > Invite User
3. Fill in username, email, and password
4. User receives welcome email with login instructions
5. User can immediately login with provided credentials

### User Roles

- **Admin:** Full access including user management
- **Member:** Can manage inventory items
- **Guest:** Read-only access (future feature)
- **Owner:** Reserved for future multi-tenancy features

---

## Email Notifications

When configured, PantryPal sends:

### Welcome Emails
- Sent when admin invites new users
- Includes username and link to PantryPal
- Password communicated separately for security

### Password Reset
- Requested via "Forgot Password" link
- Secure one-time token expires in 1 hour
- Email includes reset link

---

## Data Storage

All data stored locally in SQLite databases:

- `data/users.db` - User accounts, sessions, API keys
- `data/inventory/inventory.db` - Pantry items
- `data/lookup_cache/lookup_cache.db` - Cached product lookups

**Backup Important:** These databases contain all your data. Back them up regularly.

---

## Home Assistant Integration

### REST Sensor Setup

Add to `configuration.yaml`:

```yaml
sensor:
  - platform: rest
    name: Pantry Expiring Items
    resource: http://YOUR_SERVER_IP/api/stats/expiring?days=7
    value_template: "{{ value_json.summary.total_expiring }}"
    json_attributes:
      - summary
      - items
    scan_interval: 3600
```

### Example Automation

```yaml
automation:
  - alias: "Daily Pantry Check"
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
          title: "Pantry Alert"
          message: "{{ states('sensor.pantry_expiring_items') }} items expiring soon"
```

---

## Technology Stack

**Backend:**
- Python 3.11 with FastAPI
- SQLite databases
- Docker & Docker Compose
- nginx reverse proxy
- Bcrypt password hashing
- SMTP email integration

**Frontend (Web):**
- React 18
- Vite build tool
- Axios for API calls
- Modern amber/orange color scheme

**Frontend (Mobile):**
- React Native
- Expo SDK 54
- expo-camera for barcode scanning
- expo-notifications for alerts
- AsyncStorage for local data
- Distributed via TestFlight (iOS)

**External APIs:**
- Open Food Facts (product lookup)

---

## Development

### Backend Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api-gateway

# Rebuild after code changes
docker-compose up -d --build api-gateway

# Stop all services
docker-compose down
```

### Web Dashboard Development

```bash
cd services/web-ui
npm install
npm run dev
# Opens at http://localhost:5173
```

### Mobile App Development

```bash
cd mobile
npm install
npx expo start
# Scan QR code with Expo Go or iOS Simulator
```

### iOS App Deployment

```bash
cd mobile
# Build for TestFlight
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --latest
```

Requires Apple Developer account (Team ID: SF335GD5DY).

---

## Project Structure

```
pantrypal/
├── services/
│   ├── api-gateway/           # Main API, auth, routing
│   │   └── app/
│   │       ├── main.py       # API endpoints
│   │       ├── auth.py       # Authentication logic
│   │       ├── user_db.py    # User management
│   │       └── email_service.py
│   ├── inventory-service/     # Item management
│   ├── lookup-service/        # Barcode lookup
│   └── web-ui/                # React dashboard
├── mobile/                     # React Native iOS app
│   ├── src/
│   │   ├── screens/          # 9 screens
│   │   ├── services/         # API client
│   │   └── styles/           # Theme colors
│   ├── app.json              # Expo configuration
│   └── eas.json              # EAS Build config
├── nginx/                      # Reverse proxy
├── data/                       # SQLite databases (gitignored)
├── docker-compose.yml
├── .env                        # SMTP credentials (gitignored)
├── start-pantrypal.sh
└── README.md
```

---

## Troubleshooting

### Backend Issues

**Containers won't start:**
```bash
docker-compose ps
docker-compose logs -f
docker-compose restart api-gateway
```

**Database locked:**
```bash
docker-compose down
docker-compose up -d
```

### Mobile App Issues

**Can't connect to server:**
1. Verify server is running: `docker-compose ps`
2. Check server IP is correct in Settings > Connection
3. Ensure phone and server on same WiFi network
4. Test connection: `curl http://YOUR_IP/health`

**Notifications not working:**
- Grant notification permission in device Settings
- Verify items have expiry dates set
- Use "Send Test Notification" button
- Check notification time is set correctly

### Authentication Issues

**403 Forbidden errors:**
- Clear app data and login again
- Verify AUTH_MODE in docker-compose.yml
- Check if IP is in TRUSTED_NETWORKS for smart mode

**Can't login as admin:**
- Verify backend is running
- Check credentials: admin/admin (default)
- Review api-gateway logs for errors

---

## Roadmap

- Android native app (currently Expo Go only)
- Receipt scanning with OCR/LLM integration
- CSV bulk import improvements
- Shopping list generation from pantry
- Meal planning integration
- Multiple pantry location support
- Barcode generation for custom items
- Additional PalStack tool integrations

---

## Contributing

This is a personal project built for family use. However:
- Bug reports are welcome via GitHub Issues
- Feature suggestions appreciated
- Forks encouraged for personal customization
- Commercial use requires permission (see LICENSE)

---

## License

**Personal Use License**

Copyright (c) 2025 Harun Gunasekaran

This software is available for personal, non-commercial use only. See LICENSE file for full terms.

- You MAY use for personal/family household management
- You MAY self-host and modify for personal use
- You MAY NOT use commercially or offer as a paid service
- You MAY NOT distribute on app stores without permission

---

## Acknowledgments

- **Open Food Facts** - Free, open product database
- **Expo** - React Native development platform
- **FastAPI** - Modern Python web framework
- **Home Assistant Community** - Inspiration for smart home integration

---

## Contact

**For TestFlight Access:** palstack4u@gmail.com  
**For Issues:** GitHub Issues  
**For Commercial Licensing:** palstack4u@gmail.com

---

**Part of PalStack - Privacy-first tools for everyday life.**

Built in Boston, MA. October-November 2025.
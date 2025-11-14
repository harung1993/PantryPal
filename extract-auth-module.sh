#!/bin/bash

# Extract PalStack Auth Module from PantryPal
# This script creates a standalone auth module repository

set -e

echo "🔐 Extracting PalStack Auth Module..."

# Create directory structure
DEST="../palstack-auth"

if [ -d "$DEST" ]; then
    echo "⚠️  Warning: $DEST already exists!"
    read -p "Delete and recreate? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$DEST"
    else
        echo "Aborted."
        exit 1
    fi
fi

echo "📁 Creating directory structure..."

mkdir -p "$DEST"
mkdir -p "$DEST/backend"
mkdir -p "$DEST/frontend/web/components"
mkdir -p "$DEST/frontend/mobile/screens"
mkdir -p "$DEST/examples/fastapi-integration"
mkdir -p "$DEST/tests"
mkdir -p "$DEST/docs"

# ============================================================================
# BACKEND FILES
# ============================================================================

echo "📦 Copying backend files..."

# Core auth files
cp services/api-gateway/app/auth_db.py "$DEST/backend/"
cp services/api-gateway/app/user_db.py "$DEST/backend/"
cp services/api-gateway/app/auth.py "$DEST/backend/"
cp services/api-gateway/app/network_utils.py "$DEST/backend/"
cp services/api-gateway/app/email_service.py "$DEST/backend/"

# Create __init__.py
cat > "$DEST/backend/__init__.py" << 'EOF'
"""
PalStack Authentication Module
A complete authentication system for FastAPI applications
"""

__version__ = "2.0.0"
__author__ = "PalStack Team"
__license__ = "MIT"

from . import auth_db
from . import user_db
from . import auth
from . import network_utils
from . import email_service

__all__ = [
    "auth_db",
    "user_db", 
    "auth",
    "network_utils",
    "email_service",
]
EOF

# Create requirements.txt
cat > "$DEST/backend/requirements.txt" << 'EOF'
# PalStack Auth Module - Backend Dependencies

# FastAPI and server
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
python-multipart>=0.0.6

# Authentication
passlib[bcrypt]>=1.7.4
bcrypt>=4.0.1
python-jose[cryptography]>=3.3.0

# Email
aiosmtplib>=3.0.0

# Optional for testing
pytest>=7.4.0
httpx>=0.25.0
EOF

echo "✅ Backend files copied"

# ============================================================================
# FRONTEND - WEB FILES
# ============================================================================

echo "🌐 Copying web frontend files..."

cp services/web-ui/src/LandingPage.jsx "$DEST/frontend/web/components/"
cp services/web-ui/src/ResetPasswordPage.jsx "$DEST/frontend/web/components/"

# Extract auth-related portions of api.js
cp services/web-ui/src/api.js "$DEST/frontend/web/"

# Extract auth-related portions of SettingsPage
cat > "$DEST/frontend/web/components/ApiKeySettings.jsx" << 'EOF'
// Extract just the API Keys tab from SettingsPage
// Users can integrate this into their own settings page
// See INTEGRATION_GUIDE.md for full example
EOF

# Create web README
cat > "$DEST/frontend/web/README.md" << 'EOF'
# PalStack Auth - Web Frontend Components

React components for authentication UI.

## Components

- **LandingPage.jsx** - Entry point with server config and auth options
- **ResetPasswordPage.jsx** - Password reset form
- **ApiKeySettings.jsx** - API key management UI

## Integration

See `../../INTEGRATION_GUIDE.md` for complete setup instructions.

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "axios": "^1.6.0"
  }
}
```
EOF

echo "✅ Web frontend copied"

# ============================================================================
# FRONTEND - MOBILE FILES
# ============================================================================

echo "📱 Copying mobile frontend files..."

cp mobile/src/screens/LandingScreen.js "$DEST/frontend/mobile/screens/"
cp mobile/src/screens/LoginScreen.js "$DEST/frontend/mobile/screens/"
cp mobile/src/screens/SignupScreen.js "$DEST/frontend/mobile/screens/"
cp mobile/src/screens/ForgotPasswordScreen.js "$DEST/frontend/mobile/screens/"

# Extract auth API client
cp mobile/src/services/api.js "$DEST/frontend/mobile/"

# Create mobile README
cat > "$DEST/frontend/mobile/README.md" << 'EOF'
# PalStack Auth - Mobile Frontend Components

React Native screens for authentication.

## Screens

- **LandingScreen.js** - Welcome screen with server config
- **LoginScreen.js** - Login form
- **SignupScreen.js** - Registration form
- **ForgotPasswordScreen.js** - Password reset request

## Integration

See `../../INTEGRATION_GUIDE.md` for complete setup instructions.

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-native": "^0.72.0",
    "@react-navigation/native": "^6.0.0",
    "@react-navigation/native-stack": "^6.0.0",
    "@react-native-async-storage/async-storage": "^1.19.0",
    "axios": "^1.6.0"
  }
}
```
EOF

echo "✅ Mobile frontend copied"

# ============================================================================
# DOCUMENTATION
# ============================================================================

echo "📚 Creating documentation..."

# Main README
cat > "$DEST/README.md" << 'EOF'
# 🔐 PalStack Auth Module

A complete, modular authentication system for FastAPI applications with smart network-aware access control.

## Features

- 🌐 **Smart Mode** - Open at home, secure away
- 🔑 **API Keys** - Long-lived tokens for services
- 👤 **User Accounts** - Sessions with bcrypt passwords
- 📧 **Email Integration** - Password reset and invitations
- 🎨 **Beautiful UI** - React and React Native components included

## Quick Start

```bash
# Install backend
pip install -r backend/requirements.txt

# Copy files to your project
cp backend/* your-project/app/

# Add to your main.py
from .auth import get_current_auth
```

See `INTEGRATION_GUIDE.md` for complete setup instructions.

## Authentication Modes

| Mode | Use Case | Home Access | External Access |
|------|----------|-------------|-----------------|
| `smart` | Home servers | ✅ Open | 🔐 Login |
| `none` | Single user | ✅ Open | ✅ Open |
| `api_key_only` | API-first | 🔑 Key | 🔑 Key |
| `full` | Max security | 🔐 Login | 🔐 Login |

## Documentation

- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Step-by-step setup
- **[API_REFERENCE.md](./API_REFERENCE.md)** - Complete API docs
- **[SECURITY.md](./SECURITY.md)** - Security best practices

## License

MIT License - See LICENSE file

## Part of PalStack

*"That's what pals do – they show up and help with the everyday stuff."*

Built for self-hosted applications that respect your privacy.
EOF

# Copy existing documentation
cp AUTH_MODULE.md "$DEST/docs/"
cp AUTHENTICATION.md "$DEST/docs/"
cp API_KEY_SETUP.md "$DEST/docs/"

echo "✅ Documentation created"

# ============================================================================
# EXAMPLES
# ============================================================================

echo "📝 Creating example project..."

# Create example FastAPI project
cat > "$DEST/examples/fastapi-integration/main.py" << 'EOF'
"""
Example FastAPI application with PalStack Auth Module
"""
from fastapi import FastAPI, Depends, Response, Request, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import sys
import os

# Add parent directory to path to import auth module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from backend.auth import get_current_auth, require_admin
from backend import auth_db, user_db
from backend.email_service import is_email_configured
from pydantic import BaseModel

app = FastAPI(title="Example App with PalStack Auth")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class LoginRequest(BaseModel):
    username: str
    password: str

# Public endpoint
@app.get("/")
async def root():
    return {"message": "Example app with PalStack Auth", "status": "healthy"}

# Login endpoint
@app.post("/api/auth/login")
async def login(request: LoginRequest, response: Response, http_request: Request):
    user = user_db.authenticate_user(request.username, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    session_token = user_db.create_session(user["id"])
    response.set_cookie("session_token", session_token, httponly=True, max_age=7*24*60*60)
    
    return {"user": user, "session_token": session_token}

# Protected endpoint - any auth
@app.get("/api/protected")
async def protected_route(auth = Depends(get_current_auth)):
    return {"message": "You're authenticated!", "auth": auth}

# Admin only endpoint
@app.get("/api/admin/users")
async def list_users(auth = Depends(require_admin)):
    users = user_db.list_users()
    return {"users": users}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF

cat > "$DEST/examples/fastapi-integration/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - AUTH_MODE=smart
      - TRUSTED_NETWORKS=192.168.0.0/16,10.0.0.0/8
      - ALLOW_REGISTRATION=true
      # Email (optional)
      # - SMTP_HOST=smtp.gmail.com
      # - SMTP_PORT=587
      # - SMTP_USERNAME=your-email@gmail.com
      # - SMTP_PASSWORD=your-app-password
    volumes:
      - ./data:/app/data
EOF

cat > "$DEST/examples/fastapi-integration/Dockerfile" << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Copy auth module
COPY ../../backend ./backend

# Copy example app
COPY main.py .

# Install dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

echo "✅ Example project created"

# ============================================================================
# LICENSE
# ============================================================================

cat > "$DEST/LICENSE" << 'EOF'
MIT License

Copyright (c) 2025 PalStack Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

# ============================================================================
# .gitignore
# ============================================================================

cat > "$DEST/.gitignore" << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
*.egg-info/
dist/
build/

# Databases
*.db
*.sqlite
*.sqlite3
data/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
.pytest_cache/
.coverage
htmlcov/

# Node (for frontend examples)
node_modules/
.expo/
.expo-shared/
EOF

# ============================================================================
# INTEGRATION GUIDE
# ============================================================================

cat > "$DEST/INTEGRATION_GUIDE.md" << 'EOF'
# PalStack Auth - Integration Guide

Step-by-step guide to integrate PalStack Auth into your FastAPI project.

## Prerequisites

- Python 3.11+
- FastAPI application
- SQLite or PostgreSQL database

## Backend Integration (15 minutes)

### Step 1: Install Dependencies

```bash
pip install -r backend/requirements.txt
```

### Step 2: Copy Auth Module

```bash
# Copy all auth files to your project
cp -r palstack-auth/backend/* your-project/app/auth/
```

### Step 3: Update main.py

```python
from fastapi import FastAPI, Depends, Response, Request, status
from fastapi.middleware.cors import CORSMiddleware
from .auth import get_current_auth, require_admin
from . import auth_db, user_db

app = FastAPI()

# CORS (important for credentials!)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add auth endpoints
# ... (see examples/fastapi-integration/main.py)
```

### Step 4: Configure Environment

```yaml
# docker-compose.yml
environment:
  - AUTH_MODE=smart
  - TRUSTED_NETWORKS=192.168.0.0/16
  - ALLOW_REGISTRATION=true
```

### Step 5: Protect Your Routes

```python
@app.get("/api/protected")
async def protected(auth = Depends(get_current_auth)):
    return {"user": auth}
```

## Frontend Integration

### Web (React)

See `frontend/web/README.md`

### Mobile (React Native)

See `frontend/mobile/README.md`

## Testing

```bash
# Start your app
docker-compose up -d

# Test auth
curl http://localhost/api/auth/status

# Login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  -c cookies.txt

# Access protected route
curl http://localhost/api/protected -b cookies.txt
```

## Next Steps

- Configure email (SMTP settings)
- Customize landing pages
- Add user profile management
- Set up admin controls
- Deploy to production

EOF

# ============================================================================
# API REFERENCE
# ============================================================================

cat > "$DEST/API_REFERENCE.md" << 'EOF'
# PalStack Auth - API Reference

Complete API documentation for the authentication module.

## Authentication Endpoints

### POST /api/auth/login
Login with username and password.

**Request:**
```json
{
  "username": "john",
  "password": "secret123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "full_name": "John Doe",
    "is_admin": false
  },
  "session_token": "abc123..."
}
```

### POST /api/auth/register
Create new user account.

**Request:**
```json
{
  "username": "jane",
  "email": "jane@example.com",
  "full_name": "Jane Smith",
  "password": "secret123"
}
```

### POST /api/auth/forgot-password
Request password reset email.

### POST /api/auth/reset-password
Reset password with email token.

### GET /api/auth/me
Get current authenticated user.

### POST /api/auth/logout
Logout current session.

## API Key Endpoints

### POST /api/auth/keys
Create new API key.

### GET /api/auth/keys
List all API keys.

### DELETE /api/auth/keys/{id}
Delete an API key.

## Admin Endpoints

### GET /api/users
List all users (admin only).

### DELETE /api/users/{id}
Delete a user (admin only).

See full examples in `examples/` directory.
EOF

# ============================================================================
# SECURITY DOCUMENTATION
# ============================================================================

cat > "$DEST/SECURITY.md" << 'EOF'
# Security Best Practices

## Password Security
- Bcrypt hashing (cost factor 12)
- Minimum 8 characters enforced
- Salted automatically

## Session Security
- 256-bit random tokens
- HttpOnly cookies (prevents XSS)
- SameSite=lax (CSRF protection)
- 7-day expiry (configurable)

## API Key Security
- 256-bit random keys
- Bcrypt hashed in database
- Usage tracking
- Revocable anytime

## Network Security
- Smart mode uses IP validation
- X-Forwarded-For header support
- Configurable trusted networks
- HTTPS ready

## Email Security
- 1-hour password reset token expiry
- One-time use tokens
- No email enumeration

## Recommendations

1. Change default admin password immediately
2. Use HTTPS in production
3. Enable email for password recovery
4. Rotate API keys periodically
5. Review trusted networks regularly
6. Monitor failed login attempts
7. Keep dependencies updated
EOF

# ============================================================================
# CHANGELOG
# ============================================================================

cat > "$DEST/CHANGELOG.md" << 'EOF'
# Changelog

## [2.0.0] - 2025-11-09

### Added
- Smart authentication mode with network detection
- API key management system
- User accounts with sessions
- Password reset via email
- Beautiful landing pages (web + mobile)
- Comprehensive documentation

### Security
- Bcrypt password hashing
- Secure session tokens
- HttpOnly cookies
- Network-based access control

## [1.0.0] - 2025-10-29

Initial release extracted from PantryPal project.
EOF

# ============================================================================
# Initialize Git Repo
# ============================================================================

cd "$DEST"

# Create .gitattributes
cat > .gitattributes << 'EOF'
*.py linguist-language=Python
*.js linguist-language=JavaScript
*.jsx linguist-language=JavaScript
EOF

# Initialize git
git init
git add .
git commit -m "Initial commit: PalStack Auth Module v2.0.0

Complete authentication system for FastAPI applications:
- Four authentication modes (none, api_key_only, full, smart)
- User management with sessions
- API key system
- Email integration
- Network-aware smart mode
- Web and mobile UI components
- Complete documentation
- Example FastAPI integration

Extracted from PantryPal project and made modular for reuse
across all PalStack applications."

echo ""
echo "✅ PalStack Auth Module extracted successfully!"
echo ""
echo "📁 Location: $DEST"
echo ""
echo "Next steps:"
echo "  1. cd $DEST"
echo "  2. Create GitHub repo: gh repo create palstack-auth --public"
echo "  3. git remote add origin git@github.com:USERNAME/palstack-auth.git"
echo "  4. git push -u origin main"
echo ""
echo "🎉 Done! Your auth module is ready to share!"
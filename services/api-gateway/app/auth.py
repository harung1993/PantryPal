from fastapi import Header, HTTPException, status, Cookie, Request
from typing import Optional
import os
from .auth_db import validate_api_key
from .user_db import validate_session
from .network_utils import is_trusted_network, get_client_ip

# Authentication mode: none, api_key_only, full, or smart
AUTH_MODE = os.getenv("AUTH_MODE", "none").lower()


async def verify_api_key_only(x_api_key: Optional[str] = Header(None)):
    """
    Verify API key only (for api_key_only mode)
    """
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Please provide X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    key_info = validate_api_key(x_api_key)
    
    if not key_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    return {"type": "api_key", **key_info}


async def verify_session_only(
    session_token: Optional[str] = Cookie(None, alias="session_token"),
    authorization: Optional[str] = Header(None)
):
    """
    Verify session token (supports both cookies and Authorization header)
    """
    token = None
    
    # Try Authorization header first (for mobile)
    if authorization and authorization.startswith('Bearer '):
        token = authorization.replace('Bearer ', '')
    # Fall back to cookie (for web)
    elif session_token:
        token = session_token
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please login.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_info = validate_session(token)
    
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return {"type": "session", **user_info}


async def verify_api_key_or_session(
    x_api_key: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None, alias="session_token"),
    authorization: Optional[str] = Header(None)
):
    """
    Verify either API key or session token (supports both cookies and Authorization header)
    API key takes precedence if both provided
    """
    # Try API key first (for Home Assistant and other services)
    if x_api_key:
        key_info = validate_api_key(x_api_key)
        if key_info:
            return {"type": "api_key", **key_info}
    
    # Try session token from Authorization header (mobile)
    if authorization and authorization.startswith('Bearer '):
        token = authorization.replace('Bearer ', '')
        user_info = validate_session(token)
        if user_info:
            return {"type": "session", **user_info}
    
    # Try session token from cookie (web)
    if session_token:
        user_info = validate_session(session_token)
        if user_info:
            return {"type": "session", **user_info}
    
    # Neither worked
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide either X-API-Key header or valid session.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def verify_smart_auth(
    request: Request,
    x_api_key: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None, alias="session_token"),
    authorization: Optional[str] = Header(None)
):
    """
    Smart authentication mode:
    - Local network (192.168.x.x, 10.x.x.x, etc.) → Allow without auth
    - External network → Require API key OR session
    - API keys always work regardless of network
    """
    client_ip = get_client_ip(request)
    
    # Check if from trusted network (home network)
    if is_trusted_network(client_ip):
        return {
            "type": "trusted_network",
            "name": "Local Network User",
            "client_ip": client_ip,
            "trusted": True
        }
    
    # External access - require authentication
    # Try API key first
    if x_api_key:
        key_info = validate_api_key(x_api_key)
        if key_info:
            return {"type": "api_key", "trusted": False, **key_info}
    
    # Try session token from Authorization header (mobile)
    if authorization and authorization.startswith('Bearer '):
        token = authorization.replace('Bearer ', '')
        user_info = validate_session(token)
        if user_info:
            return {"type": "session", "trusted": False, **user_info}
    
    # Try session token from cookie (web)
    if session_token:
        user_info = validate_session(session_token)
        if user_info:
            return {"type": "session", "trusted": False, **user_info}
    
    # External access with no valid auth
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="External access requires authentication. Please login or provide an API key.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_auth(
    request: Request,
    x_api_key: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None, alias="session_token"),
    authorization: Optional[str] = Header(None)
):
    """
    Main authentication dependency - handles all AUTH_MODE options
    Use this for all protected endpoints
    Supports both cookies (web) and Authorization header (mobile)
    """
    # Mode: none - no authentication required
    if AUTH_MODE == "none":
        return {"type": "none", "name": "Anonymous", "trusted": True}
    
    # Mode: api_key_only - require API key
    elif AUTH_MODE == "api_key_only":
        return await verify_api_key_only(x_api_key)
    
    # Mode: full - require either API key or session
    elif AUTH_MODE == "full":
        return await verify_api_key_or_session(x_api_key, session_token, authorization)
    
    # Mode: smart - network-aware authentication
    elif AUTH_MODE == "smart":
        return await verify_smart_auth(request, x_api_key, session_token, authorization)
    
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid AUTH_MODE: {AUTH_MODE}. Must be 'none', 'api_key_only', 'full', or 'smart'."
        )


async def require_admin(
    request: Request,
    x_api_key: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None, alias="session_token"),
    authorization: Optional[str] = Header(None)
):
    """
    Require admin user (only works in 'full' or 'smart' mode with session auth)
    Use for admin-only endpoints like user management
    """
    if AUTH_MODE not in ["full", "smart"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin features only available in 'full' or 'smart' authentication mode"
        )
    
    # Get current auth
    auth = await get_current_auth(request, x_api_key, session_token, authorization)
    
    # Trusted network users are not admin
    if auth.get("type") == "trusted_network":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access requires user login"
        )
    
    # Only session-based auth can be admin (API keys are not users)
    if auth.get("type") != "session":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access requires user login"
        )
    
    if not auth.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return auth
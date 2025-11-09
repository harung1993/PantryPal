from fastapi import Header, HTTPException, status, Cookie, Request
from typing import Optional
import os
from .auth_db import validate_api_key
from .user_db import validate_session

# Authentication mode: none, api_key_only, or full
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


async def verify_session_only(session_token: Optional[str] = Cookie(None, alias="session_token")):
    """
    Verify session token only (for full mode - UI access)
    """
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please login.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_info = validate_session(session_token)
    
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return {"type": "session", **user_info}


async def verify_api_key_or_session(
    x_api_key: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None, alias="session_token")
):
    """
    Verify either API key or session token (for full mode - API access)
    API key takes precedence if both provided
    """
    # Try API key first (for Home Assistant and other services)
    if x_api_key:
        key_info = validate_api_key(x_api_key)
        if key_info:
            return {"type": "api_key", **key_info}
    
    # Try session token (for logged-in users via web/mobile)
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


async def get_current_auth(
    x_api_key: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None, alias="session_token")
):
    """
    Main authentication dependency - handles all AUTH_MODE options
    Use this for all protected endpoints
    """
    # Mode: none - no authentication required
    if AUTH_MODE == "none":
        return {"type": "none", "name": "Anonymous"}
    
    # Mode: api_key_only - require API key
    elif AUTH_MODE == "api_key_only":
        return await verify_api_key_only(x_api_key)
    
    # Mode: full - require either API key or session
    elif AUTH_MODE == "full":
        return await verify_api_key_or_session(x_api_key, session_token)
    
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid AUTH_MODE: {AUTH_MODE}. Must be 'none', 'api_key_only', or 'full'."
        )


async def require_admin(
    auth = None,
    x_api_key: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None, alias="session_token")
):
    """
    Require admin user (only works in 'full' mode with session auth)
    Use for admin-only endpoints like user management
    """
    if AUTH_MODE != "full":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin features only available in 'full' authentication mode"
        )
    
    # Get current auth
    if auth is None:
        auth = await get_current_auth(x_api_key, session_token)
    
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
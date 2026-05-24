from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, Request, status

from app.services.auth_service import auth_service


def _extract_bearer_token(request: Request) -> str:
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid auth header")
    token = auth.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid auth header")
    return token


def get_current_user(request: Request) -> dict[str, Any]:
    token = _extract_bearer_token(request)
    payload = auth_service.decode_access_token(token)
    user = {
        "sub": payload.get("sub") or payload.get("user_id") or payload.get("uid"),
        "email": payload.get("email"),
        "name": payload.get("name") or payload.get("given_name"),
        "roles": payload.get("roles") or payload.get("role") or [],
    }
    if not user.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return user


def require_user(request: Request, user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return user

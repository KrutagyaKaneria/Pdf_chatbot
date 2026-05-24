from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status

from app.core.auth import get_current_user
from app.models.schemas import LoginRequest, RefreshRequest, SignupRequest
from app.services.auth_service import auth_service
from app.utils.responses import success_response

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup")
async def signup(payload: SignupRequest, request: Request, response: Response):
    auth_response = auth_service.signup(
        email=payload.email,
        password=payload.password,
        name=payload.name,
        request=request,
        response=response,
    )
    return success_response(
        auth_response.message,
        auth_response.data,
        status.HTTP_201_CREATED,
        user=auth_response.user,
        tokens=auth_response.tokens,
    )


@router.post("/login")
async def login(payload: LoginRequest, request: Request, response: Response):
    auth_response = auth_service.login(
        email=payload.email,
        password=payload.password,
        request=request,
        response=response,
    )
    return success_response(auth_response.message, auth_response.data, user=auth_response.user, tokens=auth_response.tokens)


@router.post("/refresh")
async def refresh(request: Request, response: Response, payload: RefreshRequest | None = None):
    auth_response = auth_service.refresh(
        request=request,  # type: ignore[arg-type]
        response=response,  # type: ignore[arg-type]
        refresh_token=(payload.refresh_token if payload else None),
    )
    return success_response(auth_response.message, auth_response.data, user=auth_response.user, tokens=auth_response.tokens)


@router.post("/logout")
async def logout(request: Request, response: Response):
    result = auth_service.logout(request=request, response=response)
    return success_response(result["message"], result)


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    user = auth_service.me(current_user["sub"])
    return success_response("Current user fetched", user, user=user)

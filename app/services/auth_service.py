from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, Request, Response, status
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError
from passlib.context import CryptContext
from sqlalchemy import select, update

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.db.session import create_db_session
from app.db.user_models import RefreshTokenSession, User
from app.models.schemas import AuthResponse, AuthSessionData, AuthTokenData, UserPublic

logger = get_logger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _get_signing_key(self) -> str:
        dev_fallback = "dev-jwt-secret-change-me"
        if self.settings.jwt_algorithm.upper() == "RS256":
            if not self.settings.jwt_private_key:
                raise HTTPException(status_code=500, detail="JWT private key not configured")
            return self.settings.jwt_private_key
        if not self.settings.jwt_secret:
            if (self.settings.environment or "").lower() != "production":
                return dev_fallback
            raise HTTPException(status_code=500, detail="JWT secret not configured")
        return self.settings.jwt_secret

    def _get_verification_key(self) -> str:
        dev_fallback = "dev-jwt-secret-change-me"
        if self.settings.jwt_algorithm.upper() == "RS256":
            if not self.settings.jwt_public_key:
                raise HTTPException(status_code=500, detail="JWT public key not configured")
            return self.settings.jwt_public_key
        if not self.settings.jwt_secret:
            if (self.settings.environment or "").lower() != "production":
                return dev_fallback
            raise HTTPException(status_code=500, detail="JWT secret not configured")
        return self.settings.jwt_secret

    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, password_hash: str) -> bool:
        return pwd_context.verify(plain_password, password_hash)

    def _to_public_user(self, user: User) -> UserPublic:
        return UserPublic(user_id=user.user_id, email=user.email, name=user.name)

    def _create_token(self, *, user: User, token_type: str, expires_delta: timedelta, session_id: str | None = None, jti: str | None = None) -> str:
        now = self._now()
        payload: dict[str, Any] = {
            "sub": user.user_id,
            "email": user.email,
            "name": user.name,
            "roles": ["user"],
            "token_type": token_type,
            "iat": int(now.timestamp()),
            "exp": int((now + expires_delta).timestamp()),
            "iss": "pdf-chatbot",
        }
        if session_id:
            payload["sid"] = session_id
        if jti:
            payload["jti"] = jti
        return jwt.encode(payload, self._get_signing_key(), algorithm=self.settings.jwt_algorithm)

    def _create_access_token(self, user: User, session_id: str) -> tuple[str, int]:
        expires_delta = timedelta(minutes=self.settings.access_token_exp_minutes)
        token = self._create_token(user=user, token_type="access", expires_delta=expires_delta, session_id=session_id)
        return token, int(expires_delta.total_seconds())

    def _create_refresh_token(self, user: User, session_id: str) -> tuple[str, str, datetime]:
        expires_delta = timedelta(days=self.settings.refresh_token_exp_days)
        jti = uuid.uuid4().hex
        token = self._create_token(user=user, token_type="refresh", expires_delta=expires_delta, session_id=session_id, jti=jti)
        return token, jti, self._now() + expires_delta

    def _token_hash(self, token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def _find_user_by_email(self, db, email: str) -> User | None:
        stmt = select(User).where(User.email == email.lower())
        return db.scalars(stmt).first()

    def _persist_user(self, *, email: str, password: str, name: str | None = None) -> User:
        now = self._now()
        with create_db_session() as db:
            existing = self._find_user_by_email(db, email)
            if existing:
                if getattr(existing, "password_hash", None):
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

                # Upgrade a legacy row created before password auth existed.
                existing.password_hash = self.hash_password(password)
                existing.auth_provider = "local"
                existing.is_active = True
                existing.name = name or existing.name
                existing.updated_at = now
                existing.last_login_at = now
                db.add(existing)
                db.commit()
                db.refresh(existing)
                return existing
            user = User(
                user_id=uuid.uuid4().hex,
                email=email.lower(),
                name=name,
                password_hash=self.hash_password(password),
                auth_provider="local",
                is_active=True,
                created_at=now,
                updated_at=now,
                last_login_at=now,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    def _create_session(self, *, db, user: User, request: Request, refresh_token: str, jti: str, expires_at: datetime) -> RefreshTokenSession:
        session = RefreshTokenSession(
            session_id=uuid.uuid4().hex,
            user_id=user.user_id,
            token_jti=jti,
            token_hash=self._token_hash(refresh_token),
            created_at=self._now(),
            expires_at=expires_at,
            revoked_at=None,
            user_agent=(request.headers.get("user-agent") or None),
            ip_address=(request.client.host if request.client else None),
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def _set_refresh_cookie(self, response: Response, refresh_token: str) -> None:
        response.set_cookie(
            key=self.settings.auth_refresh_cookie_name,
            value=refresh_token,
            httponly=True,
            secure=bool(self.settings.auth_cookie_secure),
            samesite=self.settings.auth_cookie_samesite,
            max_age=self.settings.refresh_token_exp_days * 24 * 60 * 60,
            path="/auth",
        )

    def _clear_refresh_cookie(self, response: Response) -> None:
        response.delete_cookie(key=self.settings.auth_refresh_cookie_name, path="/auth")

    def _session_to_response(self, user: User, access_token: str, expires_in: int, response: Response) -> AuthResponse:
        payload = AuthSessionData(
            user=self._to_public_user(user),
            tokens=AuthTokenData(access_token=access_token, expires_in=expires_in),
        )
        return AuthResponse(message="Authentication successful", data=payload, user=payload.user, tokens=payload.tokens)

    def signup(self, *, email: str, password: str, name: str | None, request: Request, response: Response) -> AuthResponse:
        user = self._persist_user(email=email, password=password, name=name)
        return self._create_logged_in_session(user=user, request=request, response=response)

    def login(self, *, email: str, password: str, request: Request, response: Response) -> AuthResponse:
        with create_db_session() as db:
            user = self._find_user_by_email(db, email)
            if not user or not user.password_hash or not self.verify_password(password, user.password_hash):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
            return self._create_logged_in_session(user=user, request=request, response=response)

    def _create_logged_in_session(self, *, user: User, request: Request, response: Response) -> AuthResponse:
        session_id = uuid.uuid4().hex
        access_token, expires_in = self._create_access_token(user, session_id=session_id)
        refresh_token, jti, refresh_expires_at = self._create_refresh_token(user, session_id=session_id)

        with create_db_session() as db:
            db.execute(
                update(User)
                .where(User.user_id == user.user_id)
                .values(last_login_at=self._now(), updated_at=self._now())
            )
            self._create_session(db=db, user=user, request=request, refresh_token=refresh_token, jti=jti, expires_at=refresh_expires_at)

        self._set_refresh_cookie(response, refresh_token)
        payload = AuthSessionData(user=self._to_public_user(user), tokens=AuthTokenData(access_token=access_token, expires_in=expires_in))
        return AuthResponse(message="Authentication successful", data=payload, user=payload.user, tokens=payload.tokens)

    def refresh(self, *, request: Request, response: Response, refresh_token: str | None = None) -> AuthResponse:
        token = refresh_token or request.cookies.get(self.settings.auth_refresh_cookie_name)
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

        try:
            payload = jwt.decode(token, self._get_verification_key(), algorithms=[self.settings.jwt_algorithm])
        except ExpiredSignatureError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired") from exc
        except JWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

        if payload.get("token_type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        user_id = payload.get("sub")
        jti = payload.get("jti")
        sid = payload.get("sid")
        if not user_id or not jti or not sid:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        with create_db_session() as db:
            user = db.get(User, user_id)
            if not user or not user.is_active:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

            stmt = select(RefreshTokenSession).where(
                RefreshTokenSession.user_id == user_id,
                RefreshTokenSession.token_jti == jti,
                RefreshTokenSession.revoked_at.is_(None),
            )
            session = db.scalars(stmt).first()
            if not session or session.token_hash != self._token_hash(token):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")

            # rotate refresh token
            new_access_token, expires_in = self._create_access_token(user, session_id=sid)
            new_refresh_token, new_jti, new_refresh_exp = self._create_refresh_token(user, session_id=sid)
            session.token_jti = new_jti
            session.token_hash = self._token_hash(new_refresh_token)
            session.expires_at = new_refresh_exp
            db.add(session)
            db.commit()
            db.refresh(session)

        self._set_refresh_cookie(response, new_refresh_token)
        payload = AuthSessionData(user=self._to_public_user(user), tokens=AuthTokenData(access_token=new_access_token, expires_in=expires_in))
        return AuthResponse(message="Session refreshed", data=payload, user=payload.user, tokens=payload.tokens)

    def logout(self, *, request: Request, response: Response, refresh_token: str | None = None) -> dict[str, str]:
        token = refresh_token or request.cookies.get(self.settings.auth_refresh_cookie_name)
        if token:
            try:
                payload = jwt.decode(token, self._get_verification_key(), algorithms=[self.settings.jwt_algorithm], options={"verify_exp": False})
                jti = payload.get("jti")
                if jti:
                    with create_db_session() as db:
                        db.execute(
                            update(RefreshTokenSession)
                            .where(RefreshTokenSession.token_jti == jti)
                            .values(revoked_at=self._now())
                        )
                        db.commit()
            except JWTError:
                pass
        self._clear_refresh_cookie(response)
        return {"message": "Logged out"}

    def me(self, user_id: str) -> UserPublic:
        with create_db_session() as db:
            user = db.get(User, user_id)
            if not user or not user.is_active:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
            return self._to_public_user(user)

    def decode_access_token(self, token: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(token, self._get_verification_key(), algorithms=[self.settings.jwt_algorithm])
        except ExpiredSignatureError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Access token expired") from exc
        except JWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
        if payload.get("token_type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        return payload


auth_service = AuthService()

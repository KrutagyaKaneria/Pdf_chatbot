from __future__ import annotations

import json
import time
from dataclasses import dataclass
from functools import lru_cache
from hashlib import sha256
from typing import Any

from redis import Redis

from app.core.config import Settings, get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def stable_hash(text: str) -> str:
    return sha256((text or "").encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class CacheKey:
    namespace: str
    parts: tuple[str, ...]

    def render(self) -> str:
        return ":".join(("pdfchat", self.namespace, *self.parts))


@lru_cache
def get_redis_client() -> Redis:
    settings: Settings = get_settings()
    return Redis.from_url(settings.redis_url, decode_responses=False)


class CacheService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client = get_redis_client()

    def enabled(self) -> bool:
        return bool(self.settings.cache_enabled)

    def get_json(self, key: CacheKey) -> Any | None:
        if not self.enabled():
            return None
        try:
            raw = self._client.get(key.render())
            if raw is None:
                return None
            return json.loads(raw.decode("utf-8"))
        except Exception as exc:
            logger.debug("Cache get_json failed", extra={"key": key.render(), "reason": str(exc)})
            return None

    def set_json(self, key: CacheKey, value: Any, ttl_seconds: int | None = None) -> None:
        if not self.enabled():
            return
        ttl = int(ttl_seconds or self.settings.cache_default_ttl_seconds)
        try:
            payload = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            self._client.set(name=key.render(), value=payload, ex=ttl)
        except Exception as exc:
            logger.debug("Cache set_json failed", extra={"key": key.render(), "reason": str(exc)})

    def get_bytes(self, key: CacheKey) -> bytes | None:
        if not self.enabled():
            return None
        try:
            return self._client.get(key.render())
        except Exception as exc:
            logger.debug("Cache get_bytes failed", extra={"key": key.render(), "reason": str(exc)})
            return None

    def set_bytes(self, key: CacheKey, value: bytes, ttl_seconds: int | None = None) -> None:
        if not self.enabled():
            return
        ttl = int(ttl_seconds or self.settings.cache_default_ttl_seconds)
        try:
            self._client.set(name=key.render(), value=value, ex=ttl)
        except Exception as exc:
            logger.debug("Cache set_bytes failed", extra={"key": key.render(), "reason": str(exc)})

    def delete(self, key: CacheKey) -> None:
        if not self.enabled():
            return
        try:
            self._client.delete(key.render())
        except Exception as exc:
            logger.debug("Cache delete failed", extra={"key": key.render(), "reason": str(exc)})

    def ping(self) -> bool:
        if not self.enabled():
            return False
        try:
            return bool(self._client.ping())
        except Exception:
            return False


class LocalTTLCache:
    """Small in-process fallback cache (for dev), intentionally tiny + simple."""

    def __init__(self, max_items: int = 512) -> None:
        self.max_items = max_items
        self._store: dict[str, tuple[float, bytes]] = {}

    def get(self, key: str) -> bytes | None:
        item = self._store.get(key)
        if not item:
            return None
        expires_at, payload = item
        if expires_at < time.time():
            self._store.pop(key, None)
            return None
        return payload

    def set(self, key: str, payload: bytes, ttl_seconds: int) -> None:
        if len(self._store) >= self.max_items:
            self._store.pop(next(iter(self._store)))
        self._store[key] = (time.time() + ttl_seconds, payload)

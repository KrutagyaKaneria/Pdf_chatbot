from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.services.cache_service import CacheKey, CacheService

logger = get_logger(__name__)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@dataclass
class PdfJobStatus:
    job_id: str
    state: str
    filename: str
    stored_filename: str
    file_path: str
    collection_name: str | None = None
    error: str | None = None
    retries: int = 0
    created_at: str | None = None
    updated_at: str | None = None


class PDFQueueService:
    """Redis-backed queue + status store for background PDF processing."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.cache = CacheService(self.settings)

    def enabled(self) -> bool:
        return bool(self.settings.cache_enabled and self.settings.pdf_background_enabled and self.cache.enabled())

    def _queue_key(self) -> str:
        return CacheKey("pdfq", (self.settings.pdf_queue_name,)).render()

    def _status_key(self, job_id: str) -> str:
        return CacheKey("pdfjob", (job_id,)).render()

    def enqueue(self, file_path: Path, filename: str, stored_filename: str) -> str:
        if not self.enabled():
            raise RuntimeError("PDF background queue is disabled")

        job_id = uuid.uuid4().hex
        now = _utc_now_iso()

        status = {
            "job_id": job_id,
            "state": "queued",
            "filename": filename,
            "stored_filename": stored_filename,
            "file_path": str(file_path),
            "collection_name": "",
            "error": "",
            "retries": 0,
            "created_at": now,
            "updated_at": now,
        }

        try:
            client = self.cache._client
            key = self._status_key(job_id)
            client.set(key, __import__("json").dumps(status, ensure_ascii=False).encode("utf-8"), ex=int(self.settings.pdf_job_ttl_seconds))
            client.lpush(self._queue_key(), job_id)
            client.expire(self._queue_key(), int(self.settings.pdf_job_ttl_seconds))
        except Exception as exc:
            logger.error("Failed to enqueue PDF job", extra={"reason": str(exc)})
            raise

        return job_id

    def get_status(self, job_id: str) -> dict:
        if not self.enabled():
            raise RuntimeError("PDF background queue is disabled")
        try:
            raw = self.cache._client.get(self._status_key(job_id))
            if not raw:
                return {}
            return __import__("json").loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def update_status(self, job_id: str, **updates) -> None:
        if not self.enabled():
            return
        try:
            current = self.get_status(job_id) or {"job_id": job_id}
            current.update({k: v for k, v in updates.items() if v is not None})
            current["updated_at"] = _utc_now_iso()
            self.cache._client.set(
                self._status_key(job_id),
                __import__("json").dumps(current, ensure_ascii=False).encode("utf-8"),
                ex=int(self.settings.pdf_job_ttl_seconds),
            )
        except Exception:
            return

from __future__ import annotations

import os
from dataclasses import dataclass
from io import BytesIO
import tempfile
from pathlib import Path

import cloudinary
import cloudinary.uploader
import requests

from app.core.config import Settings, get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _ensure_config(settings: Settings | None = None) -> None:
    if os.getenv("CLOUDINARY_URL"):
        return

    if settings:
        cloudinary.config(
            cloud_name=getattr(settings, "cloudinary_cloud_name", None) or os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=getattr(settings, "cloudinary_api_key", None) or os.getenv("CLOUDINARY_API_KEY"),
            api_secret=getattr(settings, "cloudinary_api_secret", None) or os.getenv("CLOUDINARY_API_SECRET"),
        )


def download_url_to_temp(url: str) -> Path:
    """Download a remote URL to a temporary file and return the Path."""
    response = requests.get(url, stream=True, timeout=30)
    response.raise_for_status()
    suffix = Path(url).suffix or ".pdf"
    fd, tmp_name = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    handle.write(chunk)
        return Path(tmp_name)
    except Exception:
        Path(tmp_name).unlink(missing_ok=True)
        raise


@dataclass
class CloudinaryUploadResult:
    public_id: str
    secure_url: str
    resource_type: str
    bytes: int | None
    mime_type: str | None


class CloudinaryStorageService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._configure()

    def _configure(self) -> None:
        if self.settings.cloudinary_url:
            cloudinary.config(cloudinary_url=self.settings.cloudinary_url)
            return

        cloud_name = self.settings.cloudinary_cloud_name
        api_key = self.settings.cloudinary_api_key
        api_secret = self.settings.cloudinary_api_secret
        if cloud_name and api_key and api_secret:
            cloudinary.config(
                cloud_name=cloud_name,
                api_key=api_key,
                api_secret=api_secret,
            )

    def upload_pdf(self, pdf_bytes: bytes, original_filename: str, owner_id: str) -> CloudinaryUploadResult:
        if not pdf_bytes:
            raise ValueError("PDF payload is empty")

        owner_slug = owner_id.replace(" ", "_").strip() or "system"
        filename_slug = original_filename.rsplit(".", 1)[0].replace(" ", "_")[:80] or "uploaded"
        public_id = f"{self.settings.cloudinary_folder}/{owner_slug}/{filename_slug}"

        logger.info("Uploading PDF to Cloudinary", extra={"owner_id": owner_id, "filename": original_filename})
        upload_result = cloudinary.uploader.upload(
            BytesIO(pdf_bytes),
            resource_type="raw",
            public_id=public_id,
            use_filename=False,
            unique_filename=True,
            overwrite=True,
            timeout=self.settings.cloudinary_timeout_seconds,
        )

        return CloudinaryUploadResult(
            public_id=str(upload_result.get("public_id") or public_id),
            secure_url=str(upload_result.get("secure_url") or upload_result.get("url") or ""),
            resource_type=str(upload_result.get("resource_type") or "raw"),
            bytes=int(upload_result.get("bytes") or len(pdf_bytes)),
            mime_type=str(upload_result.get("format") or "application/pdf"),
        )

    def delete_pdf(self, public_id: str) -> None:
        if not public_id:
            return
        try:
            cloudinary.uploader.destroy(public_id, resource_type="raw")
        except Exception as exc:
            logger.debug("Cloudinary delete failed", extra={"public_id": public_id, "reason": str(exc)})

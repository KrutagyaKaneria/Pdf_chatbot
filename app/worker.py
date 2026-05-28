from __future__ import annotations

import json
import sys
import time
import shutil
import tempfile
from pathlib import Path
from urllib.request import urlopen

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.logging import get_logger
from app.services.document_repository import DocumentRepository
from app.services.cache_service import CacheKey, CacheService
from app.services.pdf_queue_service import PDFQueueService
from app.services.pdf_service import PDFProcessingService

logger = get_logger(__name__)


def main() -> int:
    settings = get_settings()
    configure_logging(settings)
    cache = CacheService(settings)
    queue = PDFQueueService(settings)
    document_repo = DocumentRepository()

    if not queue.enabled():
        print("PDF background worker is disabled. Enable CACHE_ENABLED and PDF_BACKGROUND_ENABLED.")
        return 2

    client = cache._client
    queue_key = CacheKey("pdfq", (settings.pdf_queue_name,)).render()

    logger.info("PDF worker started", extra={"queue": queue_key})
    print(f"PDF worker started. Waiting for jobs on queue '{queue_key}'...", flush=True)

    while True:
        try:
            item = client.brpop(queue_key, timeout=10)
            if not item:
                continue
            _, raw_job_id = item
            job_id = raw_job_id.decode("utf-8") if isinstance(raw_job_id, (bytes, bytearray)) else str(raw_job_id)

            status = queue.get_status(job_id)
            if not status:
                continue

            retries = int(status.get("retries") or 0)
            source_url = status.get("source_url") or status.get("file_path")
            if not source_url:
                continue

            queue.update_status(job_id, state="processing")

            try:
                service = PDFProcessingService(settings)
                temp_path = None
                try:
                    # If the source is an http(s) URL, download to temp file
                    if str(source_url).startswith("http"):
                        temp_file = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
                        temp_path = Path(temp_file.name)
                        temp_file.close()
                        with urlopen(source_url, timeout=60) as response, temp_path.open("wb") as handle:
                            shutil.copyfileobj(response, handle)
                        collection_name = service.process_uploaded_pdf(
                            temp_path,
                            status.get("owner_id"),
                            status.get("filename"),
                            status.get("stored_filename"),
                        )
                    else:
                        # Assume local path
                        collection_name = service.process_uploaded_pdf(
                            Path(source_url),
                            status.get("owner_id"),
                            status.get("filename"),
                            status.get("stored_filename"),
                        )
                finally:
                    if temp_path:
                        temp_path.unlink(missing_ok=True)
                document_repo.upsert_document(
                    owner_id=str(status.get("owner_id") or "system"),
                    collection_name=collection_name,
                    filename=str(status.get("filename") or status.get("stored_filename") or "uploaded.pdf"),
                    stored_filename=str(status.get("stored_filename") or "uploaded.pdf"),
                    cloudinary_public_id=status.get("cloudinary_public_id"),
                    cloudinary_url=status.get("cloudinary_url") or source_url,
                    cloudinary_resource_type=status.get("cloudinary_resource_type") or "raw",
                    file_size_bytes=int(status.get("file_size_bytes") or 0) or None,
                    mime_type=status.get("mime_type") or "application/pdf",
                )
                queue.update_status(job_id, state="succeeded", collection_name=collection_name, error="")
            except Exception as exc:
                err = str(exc)
                retries += 1
                if retries <= int(settings.pdf_job_max_retries):
                    queue.update_status(job_id, state="queued", retries=retries, error=err)
                    client.lpush(queue_key, job_id)
                else:
                    queue.update_status(job_id, state="failed", retries=retries, error=err)
        except KeyboardInterrupt:
            logger.info("PDF worker stopped")
            return 0
        except Exception as exc:
            logger.error("PDF worker loop error", extra={"reason": str(exc)})
            time.sleep(1)


if __name__ == "__main__":
    sys.exit(main())

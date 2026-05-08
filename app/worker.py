from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.logging import get_logger
from app.services.cache_service import CacheKey, CacheService
from app.services.pdf_queue_service import PDFQueueService
from app.services.pdf_service import PDFProcessingService

logger = get_logger(__name__)


def main() -> int:
    settings = get_settings()
    configure_logging(settings)
    cache = CacheService(settings)
    queue = PDFQueueService(settings)

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
            file_path = status.get("file_path")
            if not file_path:
                continue

            queue.update_status(job_id, state="processing")

            try:
                service = PDFProcessingService(settings)
                collection_name = service.process_uploaded_pdf(Path(file_path))
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

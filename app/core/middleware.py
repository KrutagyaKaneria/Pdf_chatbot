import time
import uuid

from fastapi import FastAPI, Request

from app.core.logging import get_logger


logger = get_logger(__name__)


def register_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def request_logging_middleware(request: Request, call_next):
        request_id = str(uuid.uuid4())
        start = time.perf_counter()
        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.info(
                "HTTP request completed",
                extra={
                    "request_id": request_id,
                    "http_method": request.method,
                    "request_path": request.url.path,
                    "http_status_code": response.status_code,
                    "duration_ms": duration_ms,
                },
            )
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.exception(
                "HTTP request failed",
                extra={
                    "request_id": request_id,
                    "http_method": request.method,
                    "request_path": request.url.path,
                    "duration_ms": duration_ms,
                },
            )
            raise
        response.headers["X-Request-ID"] = request_id
        return response

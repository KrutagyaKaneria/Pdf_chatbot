from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.utils.responses import error_response


logger = get_logger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError):
        logger.error("Application error: %s", exc.message, extra={"error_code": exc.code})
        return error_response(exc.message, exc.code, exc.status_code, exc.details)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_: Request, exc: RequestValidationError):
        logger.warning("Request validation error: %s", exc.errors())
        return error_response(
            "Malformed request",
            "request_validation_error",
            422,
            {"errors": exc.errors()},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(_: Request, exc: StarletteHTTPException):
        message = str(exc.detail)
        logger.warning("HTTP error: %s", message)
        return error_response(message, "http_error", exc.status_code)

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_: Request, exc: Exception):
        logger.exception("Unhandled server error")
        return error_response("Internal server error", "internal_error", 500)

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.api.auth_routes import router as auth_router
from app.core.config import Settings, get_settings
from app.core.handlers import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.middleware import register_middleware
from app.db.init_db import init_db
from app.db.pgvector import ensure_pgvector_ready


logger = get_logger(__name__)


def create_app() -> FastAPI:
    settings: Settings = get_settings()
    configure_logging(settings)
    settings.validate_runtime()

    try:
        init_db()
    except Exception as exc:
        logger.warning("Database bootstrap skipped during startup", extra={"reason": str(exc)})

    try:
        ensure_pgvector_ready()
    except Exception as exc:
        logger.warning("pgvector bootstrap skipped during startup", extra={"reason": str(exc)})

    app = FastAPI(title=settings.app_name)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_middleware(app)
    register_exception_handlers(app)

    app.include_router(auth_router)
    app.include_router(api_router)

    @app.get("/")
    async def redirect_root_to_docs():
        return RedirectResponse("/docs")

    @app.get("/health")
    async def health():
        # Cheap endpoint for Render health checks and the frontend's wake-up ping.
        return {"status": "ok"}

    logger.info("FastAPI application initialized")
    return app


app = create_app()

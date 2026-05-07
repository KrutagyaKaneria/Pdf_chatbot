from __future__ import annotations

from app.core.logging import get_logger
from app.db.base import Base
from app.db import chat_models  # noqa: F401
from app.db.session import get_engine

logger = get_logger(__name__)


def init_db() -> None:
    engine = get_engine()
    logger.info("Initializing database (chat memory tables)")
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        logger.exception("Database initialization failed", extra={"reason": str(exc)})
        raise
    logger.info("Database tables ensured")

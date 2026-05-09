from __future__ import annotations

from sqlalchemy import inspect, text

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

        # Lightweight, safe schema migration for chat metadata.
        inspector = inspect(engine)
        if "chat_sessions" in inspector.get_table_names():
            existing_cols = {c.get("name") for c in inspector.get_columns("chat_sessions")}
            with engine.begin() as conn:
                if "filename" not in existing_cols:
                    conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN filename VARCHAR(255)"))
                if "stored_filename" not in existing_cols:
                    conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN stored_filename VARCHAR(255)"))
    except Exception as exc:
        logger.exception("Database initialization failed", extra={"reason": str(exc)})
        raise
    logger.info("Database tables ensured")

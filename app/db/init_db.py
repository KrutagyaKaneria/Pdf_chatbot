from __future__ import annotations

from sqlalchemy import inspect, text

from app.core.logging import get_logger
from app.db.base import Base
from app.db import chat_models  # noqa: F401
from app.db import document_models  # noqa: F401
from app.db import user_models  # noqa: F401
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
                if "owner_id" not in existing_cols:
                    # Add owner_id with a default placeholder for existing rows; caller should backfill as needed.
                    conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN owner_id VARCHAR(128)"))
                    # Set a default owner for legacy rows to avoid nulls; use 'system' as fallback.
                    conn.execute(text("UPDATE chat_sessions SET owner_id = 'system' WHERE owner_id IS NULL"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_chat_sessions_owner_id ON chat_sessions(owner_id)"))

        if "users" in inspector.get_table_names():
            existing_cols = {c.get("name") for c in inspector.get_columns("users")}
            with engine.begin() as conn:
                if "password_hash" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN password_hash TEXT"))
                if "auth_provider" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(32)"))
                if "is_active" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN"))
                if "updated_at" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE"))
                if "last_login_at" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE"))

                conn.execute(text("UPDATE users SET auth_provider = COALESCE(auth_provider, 'local')"))
                conn.execute(text("UPDATE users SET is_active = COALESCE(is_active, true)"))
                conn.execute(text("UPDATE users SET updated_at = COALESCE(updated_at, created_at, NOW())"))

                # Once backfilled, tighten the columns for production safety.
                conn.execute(text("ALTER TABLE users ALTER COLUMN auth_provider SET DEFAULT 'local'"))
                conn.execute(text("ALTER TABLE users ALTER COLUMN is_active SET DEFAULT true"))
                conn.execute(text("ALTER TABLE users ALTER COLUMN auth_provider SET NOT NULL"))
                conn.execute(text("ALTER TABLE users ALTER COLUMN is_active SET NOT NULL"))
                conn.execute(text("ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL"))

        if "user_documents" in inspector.get_table_names():
            existing_cols = {c.get("name") for c in inspector.get_columns("user_documents")}
            with engine.begin() as conn:
                if "cloudinary_public_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE user_documents ADD COLUMN cloudinary_public_id VARCHAR(255)"))
                if "cloudinary_url" not in existing_cols:
                    conn.execute(text("ALTER TABLE user_documents ADD COLUMN cloudinary_url TEXT"))
                if "cloudinary_resource_type" not in existing_cols:
                    conn.execute(text("ALTER TABLE user_documents ADD COLUMN cloudinary_resource_type VARCHAR(32)"))
                if "file_size_bytes" not in existing_cols:
                    conn.execute(text("ALTER TABLE user_documents ADD COLUMN file_size_bytes BIGINT"))
                if "mime_type" not in existing_cols:
                    conn.execute(text("ALTER TABLE user_documents ADD COLUMN mime_type VARCHAR(128)"))
                conn.execute(
                    text(
                        "CREATE UNIQUE INDEX IF NOT EXISTS ux_user_documents_collection ON user_documents(collection_name)"
                    )
                )
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS ix_user_documents_owner_stored ON user_documents(owner_id, stored_filename)"
                    )
                )
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS ix_user_documents_owner_public_id ON user_documents(owner_id, cloudinary_public_id)"
                    )
                )
                # Best-effort backfill for legacy chat rows so existing user chats retain access.
                conn.execute(
                    text(
                        """
                        INSERT INTO user_documents (
                            document_id,
                            owner_id,
                            collection_name,
                            filename,
                            stored_filename,
                            cloudinary_public_id,
                            cloudinary_url,
                            cloudinary_resource_type,
                            created_at,
                            updated_at
                        )
                        SELECT
                            md5(random()::text || clock_timestamp()::text),
                            cs.owner_id,
                            cs.collection_name,
                            COALESCE(cs.filename, cs.stored_filename, cs.collection_name),
                            COALESCE(cs.stored_filename, cs.filename),
                            NULL,
                            NULL,
                            NULL,
                            NOW(),
                            NOW()
                        FROM chat_sessions cs
                        WHERE cs.owner_id IS NOT NULL
                          AND cs.collection_name IS NOT NULL
                          AND COALESCE(cs.stored_filename, cs.filename) IS NOT NULL
                        ON CONFLICT (collection_name) DO NOTHING
                        """
                    )
                )
    except Exception as exc:
        logger.exception("Database initialization failed", extra={"reason": str(exc)})
        raise
    logger.info("Database tables ensured")

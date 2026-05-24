from functools import lru_cache
import threading

from langchain_core.embeddings import Embeddings
from langchain_community.vectorstores import PGVector
from sqlalchemy import text

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.db.session import get_engine
from app.services.embedding_service import get_embeddings


logger = get_logger(__name__)
_BOOTSTRAP_LOCK = threading.Lock()


class _BootstrapEmbeddings(Embeddings):
    """Minimal embeddings implementation used only to bootstrap PGVector metadata."""

    def embed_query(self, text: str) -> list[float]:
        return [0.0]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [[0.0] for _ in texts]


@lru_cache(maxsize=1)
def ensure_pgvector_ready() -> None:
    settings: Settings = get_settings()
    logger.info("Bootstrapping pgvector support", extra={"database_url": settings.database_url})

    with _BOOTSTRAP_LOCK:
        engine = get_engine()
        logger.info("Ensuring pgvector extension exists")
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

        logger.info("Creating LangChain PGVector metadata tables")
        bootstrap_store = PGVector(
            collection_name="__pgvector_bootstrap__",
            connection_string=settings.database_url,
            embedding_function=_BootstrapEmbeddings(),
            use_jsonb=True,
            create_extension=False,
        )

        try:
            logger.info("Removing temporary bootstrap collection if present")
            bootstrap_store.delete_collection()
        except Exception as exc:
            logger.info("Bootstrap collection cleanup skipped", extra={"reason": str(exc)})

        logger.info("PGVector bootstrap completed")


def get_vector_store(collection_name: str) -> PGVector:
    settings: Settings = get_settings()
    ensure_pgvector_ready()
    logger.info("Creating PGVector store handle", extra={"collection_name": collection_name})
    return PGVector(
        collection_name=collection_name,
        connection_string=settings.database_url,
        embedding_function=get_embeddings(),
        use_jsonb=True,
        create_extension=False,
    )

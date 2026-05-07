from langchain_community.vectorstores import PGVector

from app.core.config import Settings, get_settings
from app.services.embedding_service import get_embeddings


def get_vector_store(collection_name: str) -> PGVector:
    settings: Settings = get_settings()
    return PGVector(
        collection_name=collection_name,
        connection_string=settings.database_url,
        embedding_function=get_embeddings(),
        use_jsonb=True,
    )

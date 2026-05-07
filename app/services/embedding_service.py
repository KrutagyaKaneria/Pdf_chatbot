import os
from functools import lru_cache

from langchain_huggingface import HuggingFaceEmbeddings

from app.core.config import Settings, get_settings


os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")


@lru_cache
def get_embeddings():
    settings: Settings = get_settings()
    model_kwargs = {"local_files_only": True} if settings.embeddings_local_only else {}
    return HuggingFaceEmbeddings(
        model_name=settings.embedding_model,
        model_kwargs=model_kwargs,
    )

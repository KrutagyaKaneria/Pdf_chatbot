import os
import hashlib
from functools import lru_cache
from typing import Any

from app.core.config import Settings, get_settings
from app.services.cache_service import CacheKey, CacheService, stable_hash


os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")


@lru_cache
def get_embeddings():
    settings: Settings = get_settings()
    model_kwargs = {"local_files_only": True} if settings.embeddings_local_only else {}
    try:
        # Import lazily so startup does not load the Hugging Face stack unless embeddings are actually used.
        from langchain_huggingface import HuggingFaceEmbeddings

        base = HuggingFaceEmbeddings(
            model_name=settings.embedding_model,
            model_kwargs=model_kwargs,
        )
    except Exception as exc:
        return CachedEmbeddings(FallbackEmbeddings(settings=settings, reason=str(exc)), settings=settings)
    return CachedEmbeddings(base, settings=settings)


class CachedEmbeddings:
    """Redis-cached wrapper for LangChain embeddings.

    Keeps behavior identical while avoiding repeated embedding computation.
    """

    def __init__(self, base: Any, settings: Settings | None = None) -> None:
        self._base = base
        self._settings = settings or get_settings()
        self._cache = CacheService(self._settings)

    @property
    def model_name(self) -> str:
        return getattr(self._base, "model_name", self._settings.embedding_model)

    def embed_query(self, text: str) -> list[float]:
        text = text or ""
        key = CacheKey("emb", (self.model_name, "q", stable_hash(text)))
        cached = self._cache.get_json(key)
        if isinstance(cached, list) and cached:
            return [float(x) for x in cached]
        vec = self._base.embed_query(text)
        self._cache.set_json(key, vec, ttl_seconds=self._settings.cache_embeddings_ttl_seconds)
        return vec

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        texts = texts or []
        results: list[list[float] | None] = [None] * len(texts)
        missing: list[tuple[int, str, CacheKey]] = []

        for idx, txt in enumerate(texts):
            key = CacheKey("emb", (self.model_name, "d", stable_hash(txt or "")))
            cached = self._cache.get_json(key)
            if isinstance(cached, list) and cached:
                results[idx] = [float(x) for x in cached]
            else:
                missing.append((idx, txt, key))

        if missing:
            computed = self._base.embed_documents([t for _, t, _ in missing])
            for (idx, _txt, key), vec in zip(missing, computed, strict=False):
                results[idx] = vec
                self._cache.set_json(key, vec, ttl_seconds=self._settings.cache_embeddings_ttl_seconds)

        return [r if r is not None else self._base.embed_query(texts[i] or "") for i, r in enumerate(results)]

    def __getattr__(self, name: str) -> Any:
        return getattr(self._base, name)


class FallbackEmbeddings:
    """Deterministic local fallback when sentence-transformers / torch are unavailable.

    This keeps uploads and retrieval functional in lightweight environments.
    """

    def __init__(self, settings: Settings | None = None, reason: str | None = None) -> None:
        self._settings = settings or get_settings()
        self._reason = reason or "unknown"
        self._dimension = 384
        self.model_name = f"fallback-{self._settings.embedding_model}"

    def _encode(self, text: str) -> list[float]:
        tokens = (text or "").lower().split()
        vector = [0.0] * self._dimension
        if not tokens:
            return vector

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            for idx in range(0, len(digest), 2):
                bucket = int.from_bytes(digest[idx:idx + 2], "big") % self._dimension
                vector[bucket] += 1.0

        norm = sum(value * value for value in vector) ** 0.5 or 1.0
        return [value / norm for value in vector]

    def embed_query(self, text: str) -> list[float]:
        return self._encode(text)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._encode(text) for text in texts]

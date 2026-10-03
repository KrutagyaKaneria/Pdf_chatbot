import hashlib
from functools import lru_cache
from typing import Any

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.services.cache_service import CacheKey, CacheService, stable_hash


logger = get_logger(__name__)


def _fastembed_model_name(model_name: str) -> str:
    # fastembed uses the full Hugging Face repo id; keep accepting the short sentence-transformers names.
    return model_name if "/" in model_name else f"sentence-transformers/{model_name}"


@lru_cache
def get_embeddings():
    settings: Settings = get_settings()
    try:
        base = FastEmbedEmbeddings(settings)
    except Exception as exc:
        logger.warning(
            "Embedding model unavailable; using low-quality hash fallback embeddings",
            extra={"model": settings.embedding_model, "reason": str(exc)},
        )
        return CachedEmbeddings(FallbackEmbeddings(settings=settings, reason=str(exc)), settings=settings)
    return CachedEmbeddings(base, settings=settings)


class FastEmbedEmbeddings:
    """ONNX-based embeddings (no torch), producing the same vectors as sentence-transformers."""

    def __init__(self, settings: Settings) -> None:
        # Import lazily so startup does not load onnxruntime unless embeddings are actually used.
        from fastembed import TextEmbedding

        # Keep the short name so Redis cache keys stay valid across the sentence-transformers -> fastembed switch.
        self.model_name = settings.embedding_model
        self._batch_size = settings.embedding_batch_size
        self._model = TextEmbedding(
            model_name=_fastembed_model_name(settings.embedding_model),
            cache_dir=str(settings.embedding_cache_dir),
            local_files_only=settings.embeddings_local_only,
            threads=settings.embedding_threads,
            # onnxruntime's arena keeps every batch's peak allocation forever (~700 MB after a few uploads),
            # which doesn't fit a 512 MB instance. Without it memory returns to baseline after each batch.
            enable_cpu_mem_arena=False,
        )

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [vec.tolist() for vec in self._model.embed(texts, batch_size=self._batch_size)]


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


if __name__ == "__main__":
    # Pre-download the embedding model (used by the Render build so the server starts with it on disk).
    embeddings = get_embeddings()
    if isinstance(embeddings._base, FallbackEmbeddings):
        raise SystemExit(f"Embedding model download failed: {embeddings._base._reason}")
    print(f"Embedding model ready: {embeddings.model_name} ({len(embeddings._base.embed_query('ok'))} dims)")

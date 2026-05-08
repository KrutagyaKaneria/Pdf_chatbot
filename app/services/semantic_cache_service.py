from __future__ import annotations

import math
from dataclasses import dataclass
import json

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.services.cache_service import CacheKey, CacheService, stable_hash
from app.services.embedding_service import get_embeddings

logger = get_logger(__name__)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b, strict=False):
        dot += x * y
        na += x * x
        nb += y * y
    denom = math.sqrt(na) * math.sqrt(nb)
    if denom <= 0:
        return 0.0
    return float(dot / denom)


@dataclass
class SemanticCacheHit:
    similarity: float
    answer: str


class SemanticCacheService:
    """Embedding-based semantic cache built on plain Redis primitives.

    Design:
    - Per collection index list storing entry ids (bounded length)
    - Each entry stored as JSON: {q_emb, answer, ...}
    - Lookup computes query embedding once and brute-forces over recent entries.

    This avoids needing Redis Stack vector search while still enabling semantic reuse.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.cache = CacheService(self.settings)

    def enabled(self) -> bool:
        return bool(self.settings.semantic_cache_enabled and self.cache.enabled())

    def _index_key(self, collection_name: str) -> str:
        return CacheKey("semidx", (collection_name,)).render()

    def _entry_key(self, entry_id: str) -> str:
        return CacheKey("sement", (entry_id,)).render()

    def lookup(self, collection_name: str, question: str) -> SemanticCacheHit | None:
        if not self.enabled():
            return None

        question = (question or "").strip()
        if not question:
            return None

        embeddings = get_embeddings()
        q_emb = embeddings.embed_query(question)

        try:
            # Fetch candidate ids (small bounded list)
            client = self.cache._client  # intentional: avoid duplicating client wrappers
            ids = client.lrange(self._index_key(collection_name), 0, self.settings.semantic_cache_max_entries - 1)
            if not ids:
                return None

            # Bulk get candidates
            entry_keys = [self._entry_key(i.decode("utf-8") if isinstance(i, (bytes, bytearray)) else str(i)) for i in ids]
            raws = client.mget(entry_keys)
        except Exception as exc:
            logger.debug("Semantic cache lookup failed", extra={"reason": str(exc)})
            return None

        best: SemanticCacheHit | None = None
        for raw in raws:
            if not raw:
                continue
            try:
                obj = json.loads(raw.decode("utf-8"))
                emb = obj.get("q_emb")
                ans = obj.get("answer")
                if not isinstance(emb, list) or not isinstance(ans, str) or not ans:
                    continue
                emb_f = [float(x) for x in emb]
                sim = _cosine_similarity(q_emb, emb_f)
                if sim < self.settings.semantic_cache_similarity_threshold:
                    continue
                if best is None or sim > best.similarity:
                    best = SemanticCacheHit(similarity=sim, answer=ans)
            except Exception:
                continue

        return best

    def store(self, collection_name: str, question: str, answer: str) -> None:
        if not self.enabled():
            return

        question = (question or "").strip()
        answer = (answer or "").strip()
        if not question or not answer:
            return

        embeddings = get_embeddings()
        q_emb = embeddings.embed_query(question)
        entry_id = stable_hash(f"{collection_name}:{question}:{answer}")

        try:
            import json

            payload = json.dumps({"q": question, "q_emb": q_emb, "answer": answer}, ensure_ascii=False).encode("utf-8")
            client = self.cache._client
            client.set(self._entry_key(entry_id), payload, ex=int(self.settings.semantic_cache_ttl_seconds))
            client.lpush(self._index_key(collection_name), entry_id)
            client.ltrim(self._index_key(collection_name), 0, int(self.settings.semantic_cache_max_entries) - 1)
            client.expire(self._index_key(collection_name), int(self.settings.semantic_cache_ttl_seconds))
        except Exception as exc:
            logger.debug("Semantic cache store failed", extra={"reason": str(exc)})

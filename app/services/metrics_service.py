from __future__ import annotations

import time
from dataclasses import dataclass

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.services.cache_service import CacheKey, CacheService
from app.services.memory_service import estimate_tokens

logger = get_logger(__name__)


@dataclass
class RagMetrics:
    collection_name: str
    cache_answer_hit: bool = False
    cache_retrieval_hit: bool = False
    cache_semantic_hit: bool = False
    retrieved_docs: int = 0
    retrieval_ms: float = 0.0
    llm_ms: float = 0.0
    total_ms: float = 0.0
    prompt_tokens_est: int = 0
    completion_tokens_est: int = 0


class MetricsService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.cache = CacheService(self.settings)

    def record_rag(self, metrics: RagMetrics) -> None:
        # Always log; Redis metrics are optional.
        logger.info(
            "RAG metrics",
            extra={
                "collection_name": metrics.collection_name,
                "cache_answer_hit": metrics.cache_answer_hit,
                "cache_retrieval_hit": metrics.cache_retrieval_hit,
                "cache_semantic_hit": metrics.cache_semantic_hit,
                "retrieved_docs": metrics.retrieved_docs,
                "retrieval_ms": round(metrics.retrieval_ms, 2),
                "llm_ms": round(metrics.llm_ms, 2),
                "total_ms": round(metrics.total_ms, 2),
                "prompt_tokens_est": metrics.prompt_tokens_est,
                "completion_tokens_est": metrics.completion_tokens_est,
                "total_tokens_est": metrics.prompt_tokens_est + metrics.completion_tokens_est,
            },
        )

        if not self.cache.enabled() or not self.settings.metrics_redis_enabled:
            return

        key = CacheKey("metrics", ("rag",)).render()
        try:
            client = self.cache._client
            client.hincrby(key, "requests", 1)
            client.hincrby(key, "answer_cache_hit", 1 if metrics.cache_answer_hit else 0)
            client.hincrby(key, "retrieval_cache_hit", 1 if metrics.cache_retrieval_hit else 0)
            client.hincrby(key, "semantic_cache_hit", 1 if metrics.cache_semantic_hit else 0)
            client.hincrby(key, "prompt_tokens_est", int(metrics.prompt_tokens_est))
            client.hincrby(key, "completion_tokens_est", int(metrics.completion_tokens_est))
            client.expire(key, 60 * 60 * 24)
        except Exception:
            return

    @staticmethod
    def estimate_prompt_tokens(memory_summary: str, chat_history: list[dict[str, str]], question: str, context: str) -> int:
        text = "\n".join(
            [
                "MEMORY:\n" + (memory_summary or ""),
                "HISTORY:\n" + "\n".join(f"{m.get('role')}: {m.get('content')}" for m in chat_history or []),
                "QUESTION:\n" + (question or ""),
                "CONTEXT:\n" + (context or ""),
            ]
        )
        return estimate_tokens(text)


class Timer:
    def __init__(self) -> None:
        self._start = time.perf_counter()

    def ms(self) -> float:
        return (time.perf_counter() - self._start) * 1000

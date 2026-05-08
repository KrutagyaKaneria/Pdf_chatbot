from __future__ import annotations

import time
import uuid
from dataclasses import asdict, dataclass

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.services.cache_service import CacheKey, CacheService

logger = get_logger(__name__)


@dataclass
class RetrievalTrace:
    trace_id: str
    created_at_ms: int

    collection_name: str
    question: str
    rewritten_question: str
    rewrite_keywords: list[str]
    rewrite_confidence: float

    hybrid_enabled: bool
    keyword_query: str

    cache_retrieval_hit: bool

    vector_candidates: int
    keyword_candidates: int
    fused_candidates: int

    reranker_provider: str

    top_docs: list[dict]

    timings_ms: dict[str, float]


class RetrievalObservabilityService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.cache = CacheService(self.settings)

    def new_trace_id(self) -> str:
        return uuid.uuid4().hex

    def log_and_store(self, trace: RetrievalTrace) -> None:
        if self.settings.retrieval_observability_log_enabled:
            logger.info("Retrieval trace", extra={"retrieval_trace": asdict(trace)})

        if self.settings.retrieval_observability_store_enabled:
            key = CacheKey("rtrace", (trace.trace_id,))
            self.cache.set_json(key, asdict(trace), ttl_seconds=self.settings.retrieval_trace_ttl_seconds)

    @staticmethod
    def now_ms() -> int:
        return int(time.time() * 1000)

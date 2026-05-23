from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate

from app.core.config import Settings, get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class RerankResult:
    docs: list[Document]
    scores: list[float]
    provider: str


@lru_cache
def _load_cross_encoder(model_name: str, local_only: bool) -> Any:
    from sentence_transformers import CrossEncoder

    return CrossEncoder(model_name, trust_remote_code=False, local_files_only=local_only)


_llm_rerank_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are a reranker for RAG.

Given a user query and candidate chunks, output STRICT JSON only:
{{"ranking": [0, 3, 1, ...]}}

Rules:
- ranking must contain each index exactly once.
- rank by semantic relevance to the query.
- do NOT add commentary.
""",
        ),
        (
            "human",
            "Query: {query}\n\nCandidates:\n{candidates}\n",
        ),
    ]
)


class RerankerService:
    def __init__(self, llm: Any, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.llm = llm

    def rerank(self, query: str, docs: list[Document]) -> RerankResult:
        if not self.settings.reranker_enabled:
            return RerankResult(docs=docs, scores=[0.0] * len(docs), provider="disabled")

        provider = (self.settings.reranker_provider or "").strip().lower()
        if provider == "bge":
            return self._rerank_bge(query, docs)
        if provider == "llm":
            return self._rerank_llm(query, docs)
        # Unknown provider → no-op
        return RerankResult(docs=docs, scores=[0.0] * len(docs), provider=f"noop:{provider or 'unknown'}")

    def _rerank_bge(self, query: str, docs: list[Document]) -> RerankResult:
        query = (query or "").strip()
        if not query or not docs:
            return RerankResult(docs=docs, scores=[0.0] * len(docs), provider="bge")

        try:
            model = _load_cross_encoder(
                self.settings.reranker_model_name,
                local_only=bool(self.settings.reranker_local_only),
            )
        except Exception as exc:
            logger.info(
                "BGE reranker unavailable; falling back to LLM",
                extra={"reason": str(exc)},
            )
            return self._rerank_llm(query, docs)

        pairs = [(query, (d.page_content or "")[: self.settings.reranker_max_chars]) for d in docs]
        try:
            scores = [float(s) for s in model.predict(pairs)]
        except Exception as exc:
            logger.info("BGE rerank failed; falling back to LLM", extra={"reason": str(exc)})
            return self._rerank_llm(query, docs)

        order = sorted(range(len(docs)), key=lambda i: scores[i], reverse=True)
        return RerankResult(docs=[docs[i] for i in order], scores=[scores[i] for i in order], provider="bge")

    def _rerank_llm(self, query: str, docs: list[Document]) -> RerankResult:
        query = (query or "").strip()
        if not query or not docs:
            return RerankResult(docs=docs, scores=[0.0] * len(docs), provider="llm")

        parts: list[str] = []
        for i, d in enumerate(docs):
            src = str((d.metadata or {}).get("source", ""))
            page = str((d.metadata or {}).get("page", ""))
            snippet = ((d.page_content or "").strip())[: self.settings.reranker_snippet_chars]
            parts.append(f"[{i}] (source={src}, page={page}) {snippet}")

        prompt = _llm_rerank_prompt.invoke({"query": query, "candidates": "\n".join(parts)})
        try:
            response = self.llm.invoke(prompt)
            text = (getattr(response, "content", None) or str(response) or "").strip()
        except Exception as exc:
            logger.debug("LLM rerank failed", extra={"reason": str(exc)})
            return RerankResult(docs=docs, scores=[0.0] * len(docs), provider="llm")

        try:
            parsed = json.loads(text)
            ranking = parsed.get("ranking")
            if not isinstance(ranking, list):
                raise ValueError("ranking is not a list")
            ranking = [int(x) for x in ranking]
            if sorted(ranking) != list(range(len(docs))):
                raise ValueError("ranking is not a permutation")
        except Exception:
            # Best-effort fallback: keep original order
            return RerankResult(docs=docs, scores=[0.0] * len(docs), provider="llm")

        return RerankResult(docs=[docs[i] for i in ranking], scores=[0.0] * len(docs), provider="llm")

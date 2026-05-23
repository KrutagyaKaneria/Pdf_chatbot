from __future__ import annotations

from dataclasses import dataclass

from langchain_core.documents import Document


@dataclass(frozen=True)
class HybridDoc:
    doc: Document
    source: str
    score: float


@dataclass(frozen=True)
class HybridFusionResult:
    docs: list[Document]
    fused_scores: dict[str, float]


def _doc_key(doc: Document) -> str:
    src = str((doc.metadata or {}).get("source", ""))
    page = str((doc.metadata or {}).get("page", ""))
    content_hash = str(hash((doc.page_content or "").strip()))
    return "|".join((src, page, content_hash))


def reciprocal_rank_fusion(
    ranked_lists: list[list[Document]],
    weights: list[float] | None = None,
    rrf_k: int = 60,
    limit: int = 20,
) -> HybridFusionResult:
    """Fuse multiple ranked lists using weighted Reciprocal Rank Fusion.

    Each list is assumed sorted best→worst.
    """

    weights = weights or [1.0] * len(ranked_lists)
    if len(weights) != len(ranked_lists):
        weights = [1.0] * len(ranked_lists)

    scores: dict[str, float] = {}
    docs_by_key: dict[str, Document] = {}

    for lst, w in zip(ranked_lists, weights, strict=False):
        for rank, doc in enumerate(lst, start=1):
            key = _doc_key(doc)
            docs_by_key.setdefault(key, doc)
            scores[key] = scores.get(key, 0.0) + float(w) * (1.0 / (rrf_k + rank))

    fused = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    top_keys = [k for k, _ in fused[:limit]]
    return HybridFusionResult(docs=[docs_by_key[k] for k in top_keys if k in docs_by_key], fused_scores=scores)

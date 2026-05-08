from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from typing import Any

from langchain_core.documents import Document
from sqlalchemy import text

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.db.session import get_engine

logger = get_logger(__name__)


@dataclass(frozen=True)
class KeywordHit:
    doc: Document
    score: float


_INDEX_READY = False


def _ensure_fts_index() -> None:
    """Create a GIN index for Postgres full-text search if possible.

    Safe to call repeatedly; failures are non-fatal.
    """

    global _INDEX_READY
    if _INDEX_READY:
        return

    settings: Settings = get_settings()
    if not settings.keyword_search_enabled:
        return

    engine = get_engine()
    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_lc_pg_embedding_document_fts
                    ON langchain_pg_embedding
                    USING gin (to_tsvector('english', document));
                    """
                )
            )
        _INDEX_READY = True
    except Exception as exc:
        # Still allow keyword search without an index.
        logger.debug("FTS index ensure failed", extra={"reason": str(exc)})
        _INDEX_READY = True


class KeywordSearchService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def search(self, collection_name: str, query: str, k: int | None = None) -> list[KeywordHit]:
        collection_name = (collection_name or "").strip()
        query = (query or "").strip()
        if not self.settings.keyword_search_enabled:
            return []
        if not collection_name or not query:
            return []

        final_k = int(k or self.settings.keyword_search_k)
        final_k = max(1, min(100, final_k))
        fetch_k = max(final_k, int(self.settings.keyword_search_fetch_k))
        fetch_k = max(1, min(500, fetch_k))

        _ensure_fts_index()

        sql = text(
            """
            SELECT
                e.document AS document,
                e.cmetadata AS cmetadata,
                ts_rank_cd(to_tsvector('english', e.document), websearch_to_tsquery('english', :q)) AS rank
            FROM langchain_pg_embedding e
            JOIN langchain_pg_collection c ON e.collection_id = c.uuid
            WHERE c.name = :collection_name
              AND to_tsvector('english', e.document) @@ websearch_to_tsquery('english', :q)
            ORDER BY rank DESC
            LIMIT :limit
            """
        )

        engine = get_engine()
        hits: list[KeywordHit] = []
        try:
            with engine.connect() as conn:
                rows = conn.execute(
                    sql,
                    {
                        "q": query,
                        "collection_name": collection_name,
                        "limit": fetch_k,
                    },
                ).fetchall()
        except Exception as exc:
            logger.debug(
                "Keyword search failed",
                extra={"collection_name": collection_name, "reason": str(exc)},
            )
            return []

        candidates: list[KeywordHit] = []
        for row in rows:
            doc_text = (row[0] or "").strip()
            meta_raw = row[1]
            rank = row[2]

            metadata: dict[str, Any] = {}
            if isinstance(meta_raw, dict):
                metadata = dict(meta_raw)
            elif isinstance(meta_raw, (bytes, bytearray)):
                try:
                    metadata = json.loads(meta_raw.decode("utf-8"))
                except Exception:
                    metadata = {}
            elif isinstance(meta_raw, str):
                try:
                    metadata = json.loads(meta_raw)
                except Exception:
                    metadata = {}

            try:
                score = float(rank or 0.0)
            except Exception:
                score = 0.0

            candidates.append(KeywordHit(doc=Document(page_content=doc_text, metadata=metadata), score=score))

        if not candidates:
            return []

        if self.settings.keyword_bm25_enabled:
            try:
                candidates = self._rerank_bm25(query=query, hits=candidates)
            except Exception as exc:
                logger.debug("BM25 rerank failed; keeping FTS order", extra={"reason": str(exc)})

        return candidates[:final_k]

    _token_re = re.compile(r"[a-zA-Z0-9_]+")

    def _tokenize(self, text: str) -> list[str]:
        tokens = [t.lower() for t in self._token_re.findall(text or "")]
        # Keep short acronyms like jwt, cicd; drop single-char noise.
        return [t for t in tokens if len(t) >= 2]

    def _rerank_bm25(self, query: str, hits: list[KeywordHit]) -> list[KeywordHit]:
        q_tokens = self._tokenize(query)
        if not q_tokens:
            return hits

        docs_tokens = [self._tokenize(h.doc.page_content) for h in hits]
        N = len(docs_tokens)
        if N == 0:
            return hits

        doc_lens = [len(toks) for toks in docs_tokens]
        avgdl = (sum(doc_lens) / max(1, N)) or 1.0

        # Document frequency per query token (within candidate set).
        df: dict[str, int] = {t: 0 for t in set(q_tokens)}
        for toks in docs_tokens:
            unique = set(toks)
            for t in df.keys():
                if t in unique:
                    df[t] += 1

        k1 = float(self.settings.keyword_bm25_k1)
        b = float(self.settings.keyword_bm25_b)

        def idf(n_t: int) -> float:
            # Standard BM25 idf with +1 to keep non-negative.
            return math.log(((N - n_t + 0.5) / (n_t + 0.5)) + 1.0)

        idfs = {t: idf(df[t]) for t in df.keys()}

        reranked: list[KeywordHit] = []
        for hit, toks, dl in zip(hits, docs_tokens, doc_lens, strict=False):
            tf: dict[str, int] = {}
            for tok in toks:
                if tok in idfs:
                    tf[tok] = tf.get(tok, 0) + 1

            score = 0.0
            denom_norm = k1 * (1.0 - b + b * (float(dl) / avgdl))
            for t in idfs.keys():
                f = float(tf.get(t, 0))
                if f <= 0:
                    continue
                score += idfs[t] * (f * (k1 + 1.0)) / (f + denom_norm)

            reranked.append(KeywordHit(doc=hit.doc, score=score))

        reranked.sort(key=lambda h: h.score, reverse=True)
        return reranked

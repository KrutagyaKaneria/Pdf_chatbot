import os
import json

from langchain_core.documents import Document
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import RunnableLambda
from langchain_groq import ChatGroq

from app.core.config import Settings, get_settings
from app.core.exceptions import LLMError, ValidationAppError, VectorStoreError
from app.core.logging import get_logger
from app.db.pgvector import get_vector_store
from app.models.schemas import QuestionInput, RagResult, SourceReference
from app.prompts.rag_prompts import contextualize_q_prompt, qa_prompt
from app.services.cache_service import CacheKey, CacheService, stable_hash
from app.services.hybrid_retrieval_service import reciprocal_rank_fusion
from app.services.keyword_search_service import KeywordSearchService
from app.services.metrics_service import MetricsService, RagMetrics, Timer
from app.services.query_rewrite_service import QueryRewrite, QueryRewriteService
from app.services.reranker_service import RerankerService
from app.services.retrieval_observability_service import RetrievalObservabilityService, RetrievalTrace
from app.services.semantic_cache_service import SemanticCacheService


logger = get_logger(__name__)


class RAGService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.cache = CacheService(self.settings)
        self.semantic_cache = SemanticCacheService(self.settings)
        self.metrics = MetricsService(self.settings)
        self.keyword_search = KeywordSearchService(self.settings)
        self.obs = RetrievalObservabilityService(self.settings)
        self._llm = None
        self._control_llm = None
        self._rewriter = None
        self._reranker = None

    def _get_llm(self):
        if self._llm is None:
            # Instantiate the Groq client only when a request actually needs generation.
            self._llm = ChatGroq(
                model=self.settings.groq_model,
                temperature=self.settings.llm_temperature,
                max_tokens=self.settings.llm_max_tokens,
                api_key=self.settings.groq_api_key,
            )
        return self._llm

    def _get_control_llm(self):
        if self._control_llm is None:
            self._control_llm = ChatGroq(
                model=self.settings.groq_model,
                temperature=0.0,
                max_tokens=min(256, int(self.settings.llm_max_tokens)),
                api_key=self.settings.groq_api_key,
            )
        return self._control_llm

    def _get_rewriter(self):
        if self._rewriter is None:
            self._rewriter = QueryRewriteService(self._get_control_llm(), self.settings)
        return self._rewriter

    def _get_reranker(self):
        if self._reranker is None:
            self._reranker = RerankerService(self._get_control_llm(), self.settings)
        return self._reranker

    def answer(
        self,
        question: str,
        collection_name: str,
        chat_history: list[dict[str, str]],
        memory_summary: str = "",
    ) -> RagResult:
        total_timer = Timer()
        question = (question or "").strip()
        collection_name = (collection_name or "").strip()
        if not question:
            raise ValidationAppError("question is required")
        if not collection_name:
            raise ValidationAppError("collection_name is required")

        lc_history = self._to_langchain_messages(chat_history)
        final_question, rewrite = self._rewrite_question(question, lc_history, memory_summary=memory_summary)

        # Semantic cache is only safe when conversation context is minimal.
        semantic_hit = False
        if not (memory_summary or "").strip() and not lc_history:
            hit = self.semantic_cache.lookup(collection_name=collection_name, question=final_question)
            if hit:
                semantic_hit = True
                self.metrics.record_rag(
                    RagMetrics(
                        collection_name=collection_name,
                        cache_semantic_hit=True,
                        total_ms=total_timer.ms(),
                    )
                )
                return RagResult(answer=hit.answer, docs=[], collection_name=collection_name)

        retrieval_timer = Timer()
        docs, retrieval_cache_hit = self._retrieve_docs(
            collection_name=collection_name,
            final_question=final_question,
            rewrite=rewrite,
        )
        retrieval_ms = retrieval_timer.ms()

        logger.info(
            "Retrieved RAG documents",
            extra={"collection_name": collection_name, "doc_count": len(docs)},
        )

        context = self._format_docs(docs)

        answer_cache_key = CacheKey(
            "ans",
            (
                collection_name,
                stable_hash(final_question),
                stable_hash(context),
                stable_hash((memory_summary or "").strip()),
            ),
        )
        cached_answer = self.cache.get_json(answer_cache_key)
        if isinstance(cached_answer, dict) and cached_answer.get("answer"):
            self.metrics.record_rag(
                RagMetrics(
                    collection_name=collection_name,
                    cache_answer_hit=True,
                    cache_retrieval_hit=retrieval_cache_hit,
                    retrieved_docs=len(docs),
                    retrieval_ms=retrieval_ms,
                    total_ms=total_timer.ms(),
                    prompt_tokens_est=self.metrics.estimate_prompt_tokens(
                        memory_summary=memory_summary,
                        chat_history=chat_history,
                        question=final_question,
                        context=context,
                    ),
                )
            )
            return RagResult(
                answer=str(cached_answer.get("answer")),
                docs=self._extract_sources(docs),
                collection_name=collection_name,
            )

        llm_timer = Timer()
        try:
            final_prompt = qa_prompt.invoke(
                {
                    "context": context,
                    "memory_summary": (memory_summary or "").strip(),
                    "chat_history": lc_history,
                    "question": final_question,
                }
            )
            response = self._get_llm().invoke(final_prompt)
        except Exception as exc:
            raise LLMError("LLM generation failed", details={"reason": str(exc)}) from exc

        answer = response.content if hasattr(response, "content") else str(response)

        llm_ms = llm_timer.ms()

        self.cache.set_json(
            answer_cache_key,
            {"answer": answer},
            ttl_seconds=self.settings.cache_answer_ttl_seconds,
        )

        if not (memory_summary or "").strip() and not lc_history:
            self.semantic_cache.store(collection_name=collection_name, question=final_question, answer=answer)

        self.metrics.record_rag(
            RagMetrics(
                collection_name=collection_name,
                cache_retrieval_hit=retrieval_cache_hit,
                cache_semantic_hit=semantic_hit,
                retrieved_docs=len(docs),
                retrieval_ms=retrieval_ms,
                llm_ms=llm_ms,
                total_ms=total_timer.ms(),
                prompt_tokens_est=self.metrics.estimate_prompt_tokens(
                    memory_summary=memory_summary,
                    chat_history=chat_history,
                    question=final_question,
                    context=context,
                ),
                completion_tokens_est=0,
            )
        )
        return RagResult(
            answer=answer,
            docs=self._extract_sources(docs),
            collection_name=collection_name,
        )

    def stream_answer(
        self,
        question: str,
        collection_name: str,
        chat_history: list[dict[str, str]],
        memory_summary: str = "",
    ) -> tuple[object, list[SourceReference]]:
        """Yield answer chunks (strings). Returns (iterator, sources).

        This is additive and does not change the existing /chat behavior.
        """

        total_timer = Timer()
        question = (question or "").strip()
        collection_name = (collection_name or "").strip()
        if not question:
            raise ValidationAppError("question is required")
        if not collection_name:
            raise ValidationAppError("collection_name is required")

        lc_history = self._to_langchain_messages(chat_history)
        final_question, rewrite = self._rewrite_question(question, lc_history, memory_summary=memory_summary)

        # Semantic cache is only safe when conversation context is minimal.
        if not (memory_summary or "").strip() and not lc_history:
            hit = self.semantic_cache.lookup(collection_name=collection_name, question=final_question)
            if hit:
                def _gen_semantic():
                    yield hit.answer

                self.metrics.record_rag(
                    RagMetrics(
                        collection_name=collection_name,
                        cache_semantic_hit=True,
                        total_ms=total_timer.ms(),
                    )
                )
                return (_gen_semantic(), [])

        retrieval_timer = Timer()
        docs, retrieval_cache_hit = self._retrieve_docs(
            collection_name=collection_name,
            final_question=final_question,
            rewrite=rewrite,
        )
        retrieval_ms = retrieval_timer.ms()
        sources = self._extract_sources(docs)
        context = self._format_docs(docs)

        answer_cache_key = CacheKey(
            "ans",
            (
                collection_name,
                stable_hash(final_question),
                stable_hash(context),
                stable_hash((memory_summary or "").strip()),
            ),
        )
        cached_answer = self.cache.get_json(answer_cache_key)
        if isinstance(cached_answer, dict) and cached_answer.get("answer"):
            answer_text = str(cached_answer.get("answer"))

            def _gen_cached():
                yield answer_text

            self.metrics.record_rag(
                RagMetrics(
                    collection_name=collection_name,
                    cache_answer_hit=True,
                    cache_retrieval_hit=retrieval_cache_hit,
                    retrieved_docs=len(docs),
                    retrieval_ms=retrieval_ms,
                    total_ms=total_timer.ms(),
                    prompt_tokens_est=self.metrics.estimate_prompt_tokens(
                        memory_summary=memory_summary,
                        chat_history=chat_history,
                        question=final_question,
                        context=context,
                    ),
                )
            )
            return (_gen_cached(), sources)

        final_prompt = qa_prompt.invoke(
            {
                "context": context,
                "memory_summary": (memory_summary or "").strip(),
                "chat_history": lc_history,
                "question": final_question,
            }
        )

        def _gen_llm():
            llm_timer = Timer()
            parts: list[str] = []
            completed = False
            try:
                llm = self._get_llm()
                stream_fn = getattr(llm, "stream", None)
                if callable(stream_fn):
                    for chunk in stream_fn(final_prompt):
                        text = getattr(chunk, "content", None)
                        if not text:
                            continue
                        parts.append(str(text))
                        yield str(text)
                else:
                    response = llm.invoke(final_prompt)
                    text = response.content if hasattr(response, "content") else str(response)
                    parts.append(str(text))
                    yield str(text)
                completed = True
            except Exception as exc:
                raise LLMError("LLM generation failed", details={"reason": str(exc)}) from exc
            finally:
                llm_ms = llm_timer.ms()
                if completed:
                    answer = "".join(parts).strip()
                    if answer:
                        self.cache.set_json(
                            answer_cache_key,
                            {"answer": answer},
                            ttl_seconds=self.settings.cache_answer_ttl_seconds,
                        )
                        if not (memory_summary or "").strip() and not lc_history:
                            self.semantic_cache.store(
                                collection_name=collection_name,
                                question=final_question,
                                answer=answer,
                            )
                    self.metrics.record_rag(
                        RagMetrics(
                            collection_name=collection_name,
                            cache_retrieval_hit=retrieval_cache_hit,
                            retrieved_docs=len(docs),
                            retrieval_ms=retrieval_ms,
                            llm_ms=llm_ms,
                            total_ms=total_timer.ms(),
                            prompt_tokens_est=self.metrics.estimate_prompt_tokens(
                                memory_summary=memory_summary,
                                chat_history=chat_history,
                                question=final_question,
                                context=context,
                            ),
                        )
                    )

        return (_gen_llm(), sources)

    def _retrieve_docs(self, collection_name: str, final_question: str, rewrite: QueryRewrite):
        keyword_query = (rewrite.rewritten_question or final_question).strip()
        if rewrite.keywords:
            keyword_query = (keyword_query + " " + " ".join(rewrite.keywords)).strip()

        final_k = max(self.settings.retriever_k, self.settings.context_max_chunks)

        retriever_params = {
            "hybrid": bool(self.settings.hybrid_search_enabled),
            "vector_weight": float(self.settings.hybrid_vector_weight),
            "keyword_weight": float(self.settings.hybrid_keyword_weight),
            "rrf_k": int(self.settings.hybrid_rrf_k),
            "final_k": int(final_k),
            "vector_fetch_k": int(self.settings.retriever_fetch_k),
            "keyword_k": int(self.settings.keyword_search_k),
            "reranker_enabled": bool(self.settings.reranker_enabled),
            "reranker_provider": str(self.settings.reranker_provider),
            "reranker_top_n": int(self.settings.reranker_top_n),
        }
        retrieval_key = CacheKey(
            "ret",
            (
                collection_name,
                stable_hash(final_question),
                stable_hash(keyword_query),
                stable_hash(json.dumps(retriever_params, sort_keys=True)),
            ),
        )

        cached = self.cache.get_json(retrieval_key)
        if isinstance(cached, list) and cached:
            # Rehydrate as lightweight objects compatible with _format_docs/_extract_sources.
            class _Doc:
                def __init__(self, page_content: str, metadata: dict):
                    self.page_content = page_content
                    self.metadata = metadata

            docs = [_Doc(d.get("page_content", ""), d.get("metadata", {})) for d in cached]
            try:
                self.obs.log_and_store(
                    RetrievalTrace(
                        trace_id=self.obs.new_trace_id(),
                        created_at_ms=self.obs.now_ms(),
                        collection_name=collection_name,
                        question=final_question,
                        rewritten_question=(rewrite.rewritten_question or "").strip(),
                        rewrite_keywords=list(rewrite.keywords or []),
                        rewrite_confidence=float(getattr(rewrite, "confidence", 0.0) or 0.0),
                        hybrid_enabled=bool(self.settings.hybrid_search_enabled),
                        keyword_query=keyword_query,
                        cache_retrieval_hit=True,
                        vector_candidates=0,
                        keyword_candidates=0,
                        fused_candidates=len(docs),
                        reranker_provider="cache",
                        top_docs=[
                            {
                                "source": d.metadata.get("source"),
                                "page": d.metadata.get("page"),
                                "chunk_id": d.metadata.get("chunk_id"),
                                "preview": (d.page_content or "")[:180],
                            }
                            for d in docs[:5]
                        ],
                        timings_ms={},
                    )
                )
            except Exception:
                pass

            return (docs, True)

        trace_id = self.obs.new_trace_id()
        timings: dict[str, float] = {}
        vector_candidates = 0
        keyword_candidates = 0
        fused_candidates = 0
        reranker_provider = "disabled"

        try:
            vector_store = get_vector_store(collection_name)

            if not self.settings.hybrid_search_enabled:
                # Preserve legacy behavior.
                retriever = vector_store.as_retriever(
                    search_type="mmr",
                    search_kwargs={
                        "k": final_k,
                        "fetch_k": self.settings.retriever_fetch_k,
                        "lambda_mult": self.settings.retriever_lambda_mult,
                    },
                )
                vec_timer = Timer()
                docs = retriever.invoke(final_question)
                timings["vector_ms"] = vec_timer.ms()
                vector_candidates = len(docs)
            else:
                vec_timer = Timer()
                vec_hits = vector_store.similarity_search_with_score(
                    final_question,
                    k=self.settings.retriever_fetch_k,
                )
                timings["vector_ms"] = vec_timer.ms()
                vector_docs: list[Document] = [d for d, _s in vec_hits]
                vector_candidates = len(vector_docs)

                kw_timer = Timer()
                kw_hits = self.keyword_search.search(
                    collection_name=collection_name,
                    query=keyword_query,
                    k=self.settings.keyword_search_k,
                )
                timings["keyword_ms"] = kw_timer.ms()
                keyword_docs: list[Document] = [h.doc for h in kw_hits]
                keyword_candidates = len(keyword_docs)

                fuse_timer = Timer()
                fused = reciprocal_rank_fusion(
                    [vector_docs, keyword_docs],
                    weights=[self.settings.hybrid_vector_weight, self.settings.hybrid_keyword_weight],
                    rrf_k=self.settings.hybrid_rrf_k,
                    limit=max(self.settings.retriever_fetch_k, final_k),
                )
                timings["fusion_ms"] = fuse_timer.ms()
                candidates = fused.docs
                fused_candidates = len(candidates)

                rerank_timer = Timer()
                top_n = max(1, min(len(candidates), self.settings.reranker_top_n))
                reranked = self._get_reranker().rerank(final_question, candidates[:top_n])
                reranker_provider = reranked.provider
                docs = (reranked.docs + candidates[top_n:])[:final_k]
                timings["rerank_ms"] = rerank_timer.ms()
        except Exception as exc:
            raise VectorStoreError("Retrieval failed", details={"reason": str(exc)}) from exc

        try:
            self.obs.log_and_store(
                RetrievalTrace(
                    trace_id=trace_id,
                    created_at_ms=self.obs.now_ms(),
                    collection_name=collection_name,
                    question=final_question,
                    rewritten_question=(rewrite.rewritten_question or "").strip(),
                    rewrite_keywords=list(rewrite.keywords or []),
                    rewrite_confidence=float(getattr(rewrite, "confidence", 0.0) or 0.0),
                    hybrid_enabled=bool(self.settings.hybrid_search_enabled),
                    keyword_query=keyword_query,
                    cache_retrieval_hit=False,
                    vector_candidates=vector_candidates,
                    keyword_candidates=keyword_candidates,
                    fused_candidates=fused_candidates,
                    reranker_provider=reranker_provider,
                    top_docs=[
                        {
                            "source": getattr(d, "metadata", {}).get("source"),
                            "page": getattr(d, "metadata", {}).get("page"),
                            "chunk_id": getattr(d, "metadata", {}).get("chunk_id"),
                            "preview": (getattr(d, "page_content", "") or "")[:180],
                        }
                        for d in docs[:5]
                    ],
                    timings_ms=timings,
                )
            )
        except Exception:
            pass

        try:
            serializable = [
                {"page_content": getattr(d, "page_content", ""), "metadata": getattr(d, "metadata", {})}
                for d in docs
            ]
            self.cache.set_json(
                retrieval_key,
                serializable,
                ttl_seconds=self.settings.cache_retrieval_ttl_seconds,
            )
        except Exception:
            pass

        return (docs, False)

    def _rewrite_question(self, question: str, chat_history, memory_summary: str = "") -> tuple[str, QueryRewrite]:
        question = (question or "").strip()

        # Keep the existing standalone-question prompt as a fallback.
        rewrite = QueryRewrite(original_question=question, rewritten_question=question, keywords=[], confidence=0.0)

        # Primary: structured rewrite (better for short follow-ups + hybrid keyword search).
        try:
            rewrite = self._get_rewriter().rewrite(question=question, chat_history=chat_history, memory_summary=memory_summary)
        except Exception:
            rewrite = QueryRewrite(original_question=question, rewritten_question=question, keywords=[], confidence=0.0)

        rewritten = (rewrite.rewritten_question or "").strip() or question

        # Secondary: if rewrite is disabled or weak, use the legacy standalone-question prompt.
        if not rewrite.used and chat_history and (memory_summary or "").strip():
            try:
                prompt = contextualize_q_prompt.invoke(
                    {
                        "memory_summary": (memory_summary or "").strip(),
                        "chat_history": chat_history,
                        "question": question,
                    }
                )
                response = self._get_llm().invoke(prompt)
                rewritten = (getattr(response, "content", None) or str(response) or "").strip() or rewritten
            except Exception:
                pass

        return rewritten, rewrite

    def _to_langchain_messages(self, raw_history: list[dict[str, str]]):
        messages = []
        for msg in raw_history[-self.settings.history_message_limit :]:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg.get("content", "")))
            elif msg.get("role") == "assistant":
                messages.append(AIMessage(content=msg.get("content", "")))
        return messages

    @staticmethod
    def _format_docs(docs) -> str:
        settings = get_settings()
        seen = set()
        blocks: list[str] = []
        used_tokens = 0

        def est_tokens(text: str) -> int:
            return max(1, len((text or "")) // 4)

        for doc in docs[: settings.context_max_chunks]:
            source = os.path.basename(doc.metadata.get("source", "Uploaded PDF"))
            page = doc.metadata.get("page", "N/A")
            content = (doc.page_content or "").strip()
            if not content:
                continue

            # Dedup identical chunks (common with overlapping splits)
            key = (source, page, hash(content))
            if key in seen:
                continue
            seen.add(key)

            content = content[: settings.context_max_chars_per_chunk]
            block = f"[Source: {source}, Page {page}]\n{content}"

            block_tokens = est_tokens(block)
            if blocks and used_tokens + block_tokens > settings.context_token_budget:
                break
            used_tokens += block_tokens
            blocks.append(block)

        return "\n\n".join(blocks)

    @staticmethod
    def _extract_sources(docs) -> list[SourceReference]:
        seen = set()
        sources = []
        for doc in docs:
            source = doc.metadata.get("source", "Uploaded PDF")
            page = doc.metadata.get("page")
            key = (source, page)
            if key in seen:
                continue
            seen.add(key)
            sources.append(SourceReference(source=source, page=page))
        return sources


def rag_pipeline(input_dict: dict) -> dict:
    result = RAGService().answer(
        question=input_dict.get("question", ""),
        collection_name=input_dict.get("collection_name", ""),
        chat_history=input_dict.get("chat_history", []),
        memory_summary=input_dict.get("memory_summary", ""),
    )
    return result.model_dump()


final_chain = RunnableLambda(rag_pipeline).with_types(input_type=QuestionInput)

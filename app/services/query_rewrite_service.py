from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from langchain_core.messages import BaseMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.core.config import Settings, get_settings
from app.core.exceptions import LLMError
from app.core.logging import get_logger

logger = get_logger(__name__)


_rewrite_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You rewrite conversational follow-up questions into retrieval-ready standalone queries.

Inputs you get:
- memory summary (may be empty)
- recent chat history
- latest user question

Your goals:
- Resolve references like 'one', 'there', 'that', 'it' using the chat history and memory.
- Expand short follow-ups into explicit queries containing the missing entity/topic keywords.
- Keep it concise (one sentence).
- Do NOT answer.

Output STRICT JSON only (no markdown):
{
  "rewritten_question": "...",
  "keywords": ["...", "..."],
  "confidence": 0.0
}

Guidelines:
- keywords should be 3-8 short tokens/phrases useful for keyword search (e.g., blockchain, JWT, CI/CD, MongoDB).
- confidence is your confidence that the rewrite correctly resolves the follow-up (0-1).
""",
        ),
        MessagesPlaceholder(variable_name="chat_history"),
        (
            "human",
            "Memory summary (may be empty):\n{memory_summary}\n\nLatest user question:\n{question}",
        ),
    ]
)


@dataclass(frozen=True)
class QueryRewrite:
    original_question: str
    rewritten_question: str
    keywords: list[str]
    confidence: float
    raw_model_output: str | None = None

    @property
    def used(self) -> bool:
        return (self.rewritten_question or "").strip() and self.rewritten_question.strip() != (self.original_question or "").strip()


class QueryRewriteService:
    def __init__(self, llm: Any, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.llm = llm

    def rewrite(
        self,
        question: str,
        chat_history: list[BaseMessage],
        memory_summary: str = "",
    ) -> QueryRewrite:
        question = (question or "").strip()
        if not self.settings.query_rewrite_enabled:
            return QueryRewrite(question, question, [], 0.0)

        if not chat_history and not (memory_summary or "").strip():
            return QueryRewrite(question, question, [], 0.0)

        try:
            prompt = _rewrite_prompt.invoke(
                {
                    "memory_summary": (memory_summary or "").strip(),
                    "chat_history": chat_history[-self.settings.query_rewrite_history_messages :],
                    "question": question,
                }
            )
            response = self.llm.invoke(prompt)
            text = (getattr(response, "content", None) or str(response) or "").strip()
        except Exception as exc:
            raise LLMError("Query rewriting failed", details={"reason": str(exc)}) from exc

        rewritten = question
        keywords: list[str] = []
        confidence = 0.0

        parsed: dict[str, Any] | None = None
        try:
            parsed = json.loads(text)
        except Exception:
            parsed = None

        if isinstance(parsed, dict):
            maybe_rewritten = str(parsed.get("rewritten_question", "") or "").strip()
            if maybe_rewritten:
                rewritten = maybe_rewritten
            maybe_keywords = parsed.get("keywords", [])
            if isinstance(maybe_keywords, list):
                keywords = [str(k).strip() for k in maybe_keywords if str(k).strip()][:8]
            try:
                confidence = float(parsed.get("confidence", 0.0) or 0.0)
            except Exception:
                confidence = 0.0
        else:
            # Best-effort fallback: treat raw output as rewritten string
            if text:
                rewritten = text

        return QueryRewrite(
            original_question=question,
            rewritten_question=rewritten,
            keywords=keywords,
            confidence=max(0.0, min(1.0, confidence)),
            raw_model_output=text,
        )

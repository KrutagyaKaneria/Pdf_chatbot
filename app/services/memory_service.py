from __future__ import annotations

from dataclasses import dataclass

from langchain_groq import ChatGroq

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.prompts.rag_prompts import memory_summarize_prompt
from app.services.chat_repository import ChatRepository

logger = get_logger(__name__)


def estimate_tokens(text: str) -> int:
    # Heuristic: ~4 chars/token for English-ish text.
    text = text or ""
    return max(1, len(text) // 4)


@dataclass
class ChatMemory:
    summary: str
    recent_messages: list[dict[str, str]]


class MemoryService:
    def __init__(
        self,
        repo: ChatRepository | None = None,
        settings: Settings | None = None,
    ) -> None:
        self.repo = repo or ChatRepository()
        self.settings = settings or get_settings()
        self.llm = ChatGroq(
            model=self.settings.groq_model,
            temperature=0.0,
            max_tokens=self.settings.memory_summary_max_tokens,
            api_key=self.settings.groq_api_key,
        )

    def get_memory(self, chat_id: str) -> ChatMemory:
        summary, summary_until_id = self.repo.get_summary_state(chat_id)
        summary_text = summary or ""

        # Over-fetch, then token-trim.
        fetch_limit = max(self.settings.history_message_limit * 4, self.settings.history_message_limit)
        recent_desc = self.repo.list_messages_desc(chat_id, limit=fetch_limit)

        recent: list[dict[str, str]] = []
        token_budget = self.settings.history_token_budget
        used = 0

        for msg in recent_desc:
            if msg.id <= summary_until_id:
                break
            msg_tokens = int(msg.token_estimate or estimate_tokens(msg.content))
            if recent and used + msg_tokens > token_budget:
                break
            used += msg_tokens
            recent.append({"role": msg.role, "content": msg.content})

            if len(recent) >= self.settings.history_message_limit:
                break

        recent.reverse()
        return ChatMemory(summary=summary_text, recent_messages=recent)

    def maybe_summarize(self, chat_id: str) -> None:
        summary, summary_until_id = self.repo.get_summary_state(chat_id)
        latest_id = self.repo.get_latest_message_id(chat_id)

        # Keep a rolling recent window; summarize everything older than that.
        keep_recent_limit = max(self.settings.history_message_limit, 1)
        recent_desc = self.repo.list_messages_desc(chat_id, limit=keep_recent_limit)
        if recent_desc:
            first_kept_id = int(recent_desc[-1].id)  # smallest id among kept recent messages
        else:
            first_kept_id = latest_id + 1

        summarize_up_to_id = first_kept_id - 1

        if summarize_up_to_id <= summary_until_id:
            return

        to_summarize = self.repo.list_messages_range(
            chat_id,
            after_id=summary_until_id,
            up_to_id=summarize_up_to_id,
        )
        if len(to_summarize) < self.settings.memory_summarize_min_messages:
            return

        new_block = "\n".join(f"{m.role.upper()}: {m.content}" for m in to_summarize)
        existing = summary or ""

        try:
            prompt = memory_summarize_prompt.invoke(
                {
                    "existing_summary": existing,
                    "new_messages": new_block,
                }
            )
            response = self.llm.invoke(prompt)
            updated = (response.content or "").strip()
        except Exception as exc:
            logger.exception("Memory summarization failed", extra={"chat_id": chat_id, "reason": str(exc)})
            return

        if not updated:
            return

        self.repo.update_summary(chat_id, updated, summary_until_message_id=summarize_up_to_id)
        logger.info(
            "Chat summary updated",
            extra={"chat_id": chat_id, "summarized_messages": len(to_summarize), "summary_until": summarize_up_to_id},
        )

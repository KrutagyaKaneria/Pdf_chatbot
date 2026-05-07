from datetime import datetime, timezone

from app.core.exceptions import ChatNotFoundError, CollectionMismatchError, ValidationAppError
from app.models.schemas import ChatData, ChatDetailData, ChatMessage, ChatSummary
from app.services.rag_service import RAGService
from app.services.chat_repository import ChatRepository
from app.services.memory_service import MemoryService, estimate_tokens
from app.utils.time import utc_now_iso


def _dt_to_iso_z(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


class ChatService:
    def __init__(
        self,
        rag_service: RAGService | None = None,
        repo: ChatRepository | None = None,
        memory_service: MemoryService | None = None,
    ) -> None:
        self.rag_service = rag_service or RAGService()
        self.repo = repo or ChatRepository()
        self.memory_service = memory_service or MemoryService(repo=self.repo)

    def list_chats(self) -> list[ChatSummary]:
        sessions = self.repo.list_chats()
        return [
            ChatSummary(
                chat_id=s.chat_id,
                title=s.title,
                collection_name=s.collection_name,
                created_at=_dt_to_iso_z(s.created_at),
                last_updated=_dt_to_iso_z(s.last_updated) if s.last_updated else None,
            )
            for s in sessions
        ]

    def get_chat(self, chat_id: str) -> ChatDetailData:
        session = self.repo.get_chat(chat_id)
        messages_desc = self.repo.list_messages_desc(chat_id, limit=10_000)
        messages_desc.sort(key=lambda m: m.id)
        return ChatDetailData(
            chat_id=chat_id,
            title=session.title,
            collection_name=session.collection_name,
            messages=[ChatMessage(role=m.role, content=m.content) for m in messages_desc],
            created_at=_dt_to_iso_z(session.created_at),
            last_updated=_dt_to_iso_z(session.last_updated) if session.last_updated else None,
        )

    def send_message(self, question: str, collection_name: str, chat_id: str | None = None) -> ChatData:
        question = question.strip()
        collection_name = collection_name.strip()
        if not question or not collection_name:
            raise ValidationAppError("question and collection_name are required")

        if not chat_id:
            new_session = self._create_chat(question, collection_name)
            chat_id = new_session.chat_id
        else:
            existing = self.repo.get_chat(chat_id)
            if existing.collection_name != collection_name:
                raise CollectionMismatchError("chat_id belongs to a different collection_name")

        memory = self.memory_service.get_memory(chat_id)
        result = self.rag_service.answer(
            question=question,
            collection_name=collection_name,
            chat_history=memory.recent_messages,
            memory_summary=memory.summary,
        )

        self.repo.add_message(chat_id, role="user", content=question, token_estimate=estimate_tokens(question))
        self.repo.add_message(
            chat_id,
            role="assistant",
            content=result.answer,
            token_estimate=estimate_tokens(result.answer),
        )
        self.memory_service.maybe_summarize(chat_id)

        session = self.repo.get_chat(chat_id)

        return ChatData(
            chat_id=chat_id,
            answer=result.answer,
            docs=result.docs,
            title=session.title,
        )

    def _create_chat(self, question: str, collection_name: str):
        title = question[:60] + "..." if len(question) > 60 else question
        return self.repo.create_chat(title=title, collection_name=collection_name)


chat_service = ChatService()

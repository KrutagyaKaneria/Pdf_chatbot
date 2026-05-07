import uuid

from app.core.exceptions import ChatNotFoundError, CollectionMismatchError, ValidationAppError
from app.models.schemas import ChatData, ChatDetailData, ChatMessage, ChatSummary
from app.services.rag_service import RAGService
from app.utils.time import utc_now_iso


class ChatService:
    def __init__(self, rag_service: RAGService | None = None) -> None:
        self.rag_service = rag_service or RAGService()
        self.sessions: dict[str, dict] = {}

    def list_chats(self) -> list[ChatSummary]:
        chats = [
            ChatSummary(
                chat_id=chat_id,
                title=session["title"],
                collection_name=session["collection_name"],
                created_at=session["created_at"],
                last_updated=session.get("last_updated"),
            )
            for chat_id, session in self.sessions.items()
        ]
        chats.sort(key=lambda chat: chat.last_updated or chat.created_at, reverse=True)
        return chats

    def get_chat(self, chat_id: str) -> ChatDetailData:
        session = self.sessions.get(chat_id)
        if not session:
            raise ChatNotFoundError("Chat not found")
        return ChatDetailData(
            chat_id=chat_id,
            title=session["title"],
            collection_name=session["collection_name"],
            messages=[ChatMessage(**message) for message in session["messages"]],
            created_at=session["created_at"],
            last_updated=session.get("last_updated"),
        )

    def send_message(self, question: str, collection_name: str, chat_id: str | None = None) -> ChatData:
        question = question.strip()
        collection_name = collection_name.strip()
        if not question or not collection_name:
            raise ValidationAppError("question and collection_name are required")

        if not chat_id:
            chat_id = self._create_chat(question, collection_name)
        elif chat_id not in self.sessions:
            raise ChatNotFoundError("Chat not found")
        elif self.sessions[chat_id]["collection_name"] != collection_name:
            raise CollectionMismatchError("chat_id belongs to a different collection_name")

        session = self.sessions[chat_id]
        result = self.rag_service.answer(
            question=question,
            collection_name=collection_name,
            chat_history=session["messages"],
        )

        session["messages"].append({"role": "user", "content": question})
        session["messages"].append({"role": "assistant", "content": result.answer})
        session["last_updated"] = utc_now_iso()

        return ChatData(
            chat_id=chat_id,
            answer=result.answer,
            docs=result.docs,
            title=session["title"],
        )

    def _create_chat(self, question: str, collection_name: str) -> str:
        chat_id = str(uuid.uuid4())
        now = utc_now_iso()
        self.sessions[chat_id] = {
            "title": question[:60] + "..." if len(question) > 60 else question,
            "collection_name": collection_name,
            "messages": [],
            "created_at": now,
            "last_updated": now,
        }
        return chat_id


chat_service = ChatService()

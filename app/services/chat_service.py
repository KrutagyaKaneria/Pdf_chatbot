from datetime import datetime, timezone
import json
from pathlib import Path

from app.core.exceptions import ChatNotFoundError, CollectionMismatchError, ValidationAppError
from app.models.schemas import ChatData, ChatDetailData, ChatMessage, ChatSummary
from app.services.rag_service import RAGService
from app.services.chat_repository import ChatRepository
from app.services.document_repository import DocumentRepository
from app.services.memory_service import MemoryService, estimate_tokens
from app.utils.time import utc_now_iso
from app.db.session import get_engine
from sqlalchemy import text


def _dt_to_iso_z(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


class ChatService:
    def __init__(
        self,
        rag_service: RAGService | None = None,
        repo: ChatRepository | None = None,
        document_repo: DocumentRepository | None = None,
        memory_service: MemoryService | None = None,
    ) -> None:
        self.rag_service = rag_service
        self.repo = repo or ChatRepository()
        self.document_repo = document_repo or DocumentRepository()
        self.memory_service = memory_service or MemoryService(repo=self.repo)

    def _get_rag_service(self) -> RAGService:
        if self.rag_service is None:
            self.rag_service = RAGService()
        return self.rag_service

    def list_chats(self, owner_id: str | None = None) -> list[ChatSummary]:
        sessions = self.repo.list_chats(owner_id=owner_id)
        return [
            ChatSummary(
                chat_id=s.chat_id,
                title=s.title,
                collection_name=s.collection_name,
                filename=getattr(s, "filename", None),
                stored_filename=getattr(s, "stored_filename", None),
                created_at=_dt_to_iso_z(s.created_at),
                last_updated=_dt_to_iso_z(s.last_updated) if s.last_updated else None,
            )
            for s in sessions
        ]

    def get_chat(self, chat_id: str, owner_id: str | None = None) -> ChatDetailData:
        session = self.repo.get_chat(chat_id, owner_id=owner_id)

        # Backfill PDF metadata for older chats if missing.
        inferred = self._infer_pdf_metadata_from_collection(session.collection_name)
        if getattr(session, "stored_filename", None) is None and inferred.get("stored_filename"):
            self.repo.update_chat_pdf_metadata(
                chat_id,
                filename=inferred.get("filename"),
                stored_filename=inferred.get("stored_filename"),
            )
            # Refresh local object so response contains the inferred values.
            session = self.repo.get_chat(chat_id, owner_id=owner_id)

        messages_desc = self.repo.list_messages_desc(chat_id, limit=10_000)
        messages_desc.sort(key=lambda m: m.id)
        return ChatDetailData(
            chat_id=chat_id,
            title=session.title,
            collection_name=session.collection_name,
            filename=getattr(session, "filename", None),
            stored_filename=getattr(session, "stored_filename", None),
            messages=[ChatMessage(role=m.role, content=m.content) for m in messages_desc],
            created_at=_dt_to_iso_z(session.created_at),
            last_updated=_dt_to_iso_z(session.last_updated) if session.last_updated else None,
        )

    def _infer_pdf_metadata_from_collection(self, collection_name: str) -> dict[str, str | None]:
        """Best-effort inference of stored PDF filename for a collection.

        Uses the pgvector tables populated by LangChain (langchain_pg_collection / langchain_pg_embedding)
        and extracts the basename of cmetadata->>'source'.
        """

        engine = get_engine()
        sql = text(
            """
            SELECT e.cmetadata->>'source' AS source
            FROM langchain_pg_embedding e
            JOIN langchain_pg_collection c ON e.collection_id = c.uuid
            WHERE c.name = :collection_name
            LIMIT 1
            """
        )
        try:
            with engine.begin() as conn:
                row = conn.execute(sql, {"collection_name": collection_name}).mappings().first()
        except Exception:
            return {"filename": None, "stored_filename": None}

        source = (row or {}).get("source") if row else None
        if not source:
            return {"filename": None, "stored_filename": None}

        stored = Path(str(source)).name
        # We often don't have the original user filename; use stored filename as a fallback display name.
        return {"filename": stored, "stored_filename": stored}

    def send_message(
        self,
        question: str,
        collection_name: str,
        chat_id: str | None = None,
        filename: str | None = None,
        stored_filename: str | None = None,
        owner_id: str | None = None,
    ) -> ChatData:
        question = question.strip()
        collection_name = collection_name.strip()
        if not question or not collection_name:
            raise ValidationAppError("question and collection_name are required")
        if not owner_id:
            raise ValidationAppError("authenticated user is required")

        self.document_repo.ensure_collection_owner(owner_id, collection_name)

        if not chat_id:
            new_session = self._create_chat(question, collection_name, filename=filename, stored_filename=stored_filename, owner_id=owner_id)
            chat_id = new_session.chat_id
        else:
            existing = self.repo.get_chat(chat_id, owner_id=owner_id)
            if existing.collection_name != collection_name:
                raise CollectionMismatchError("chat_id belongs to a different collection_name")

        memory = self.memory_service.get_memory(chat_id)
        result = self._get_rag_service().answer(
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

        session = self.repo.get_chat(chat_id, owner_id=owner_id)

        return ChatData(
            chat_id=chat_id,
            answer=result.answer,
            docs=result.docs,
            title=session.title,
        )

    def send_message_stream(
        self,
        question: str,
        collection_name: str,
        chat_id: str | None = None,
        filename: str | None = None,
        stored_filename: str | None = None,
        owner_id: str | None = None,
    ):
        question = (question or "").strip()
        collection_name = (collection_name or "").strip()
        if not question or not collection_name:
            raise ValidationAppError("question and collection_name are required")
        if not owner_id:
            raise ValidationAppError("authenticated user is required")

        self.document_repo.ensure_collection_owner(owner_id, collection_name)

        if not chat_id:
            new_session = self._create_chat(question, collection_name, filename=filename, stored_filename=stored_filename, owner_id=owner_id)
            chat_id = new_session.chat_id
        else:
            existing = self.repo.get_chat(chat_id, owner_id=owner_id)
            if existing.collection_name != collection_name:
                raise CollectionMismatchError("chat_id belongs to a different collection_name")

        def sse(event: str, data: dict) -> str:
            return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

        yield sse("meta", {"chat_id": chat_id, "collection_name": collection_name})

        memory = self.memory_service.get_memory(chat_id)
        chunks_iter, sources = self._get_rag_service().stream_answer(
            question=question,
            collection_name=collection_name,
            chat_history=memory.recent_messages,
            memory_summary=memory.summary,
        )

        yield sse("sources", {"docs": [s.model_dump() for s in sources]})

        self.repo.add_message(chat_id, role="user", content=question, token_estimate=estimate_tokens(question))

        answer_parts: list[str] = []
        try:
            for chunk in chunks_iter:
                answer_parts.append(str(chunk))
                yield sse("token", {"text": str(chunk)})
        except Exception as exc:
            yield sse("error", {"message": str(exc)})
            raise

        answer = "".join(answer_parts).strip()
        self.repo.add_message(
            chat_id,
            role="assistant",
            content=answer,
            token_estimate=estimate_tokens(answer),
        )
        self.memory_service.maybe_summarize(chat_id)
        session = self.repo.get_chat(chat_id, owner_id=owner_id)

        yield sse(
            "done",
            {
                "chat_id": chat_id,
                "answer": answer,
                "docs": [s.model_dump() for s in sources],
                "title": session.title,
            },
        )

    def _create_chat(
        self,
        question: str,
        collection_name: str,
        filename: str | None = None,
        stored_filename: str | None = None,
        owner_id: str | None = None,
    ):
        title = question[:60] + "..." if len(question) > 60 else question
        return self.repo.create_chat(
            title=title,
            collection_name=collection_name,
            owner_id=owner_id or "system",
            filename=filename,
            stored_filename=stored_filename,
        )

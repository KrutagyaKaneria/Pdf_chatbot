from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Select, func, select, update
from sqlalchemy.orm import Session

from app.core.exceptions import ChatNotFoundError
from app.db.chat_models import ChatMessage, ChatSession
from app.db.session import create_db_session


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ChatRepository:
    def __init__(self) -> None:
        pass

    def list_chats(self) -> list[ChatSession]:
        with create_db_session() as db:
            stmt: Select[tuple[ChatSession]] = select(ChatSession).order_by(ChatSession.last_updated.desc())
            return list(db.scalars(stmt).all())

    def get_chat(self, chat_id: str) -> ChatSession:
        with create_db_session() as db:
            session = db.get(ChatSession, chat_id)
            if not session:
                raise ChatNotFoundError("Chat not found")
            return session

    def create_chat(self, title: str, collection_name: str) -> ChatSession:
        chat_id = str(uuid.uuid4())
        now = _utc_now()
        session = ChatSession(
            chat_id=chat_id,
            title=title,
            collection_name=collection_name,
            created_at=now,
            last_updated=now,
            summary=None,
            summary_updated_at=None,
            summary_until_message_id=0,
        )
        with create_db_session() as db:
            db.add(session)
            db.commit()
        return session

    def touch_chat(self, chat_id: str) -> None:
        with create_db_session() as db:
            stmt = (
                update(ChatSession)
                .where(ChatSession.chat_id == chat_id)
                .values(last_updated=_utc_now())
            )
            db.execute(stmt)
            db.commit()

    def add_message(self, chat_id: str, role: str, content: str, token_estimate: int) -> ChatMessage:
        msg = ChatMessage(
            chat_id=chat_id,
            role=role,
            content=content,
            created_at=_utc_now(),
            token_estimate=token_estimate,
        )
        with create_db_session() as db:
            db.add(msg)
            db.execute(
                update(ChatSession)
                .where(ChatSession.chat_id == chat_id)
                .values(last_updated=_utc_now())
            )
            db.commit()
            db.refresh(msg)
        return msg

    def list_messages_desc(self, chat_id: str, limit: int) -> list[ChatMessage]:
        with create_db_session() as db:
            stmt = (
                select(ChatMessage)
                .where(ChatMessage.chat_id == chat_id)
                .order_by(ChatMessage.id.desc())
                .limit(limit)
            )
            return list(db.scalars(stmt).all())

    def list_messages_range(self, chat_id: str, after_id: int, up_to_id: int) -> list[ChatMessage]:
        with create_db_session() as db:
            stmt = (
                select(ChatMessage)
                .where(
                    ChatMessage.chat_id == chat_id,
                    ChatMessage.id > after_id,
                    ChatMessage.id <= up_to_id,
                )
                .order_by(ChatMessage.id.asc())
            )
            return list(db.scalars(stmt).all())

    def get_latest_message_id(self, chat_id: str) -> int:
        with create_db_session() as db:
            stmt = select(func.coalesce(func.max(ChatMessage.id), 0)).where(ChatMessage.chat_id == chat_id)
            return int(db.execute(stmt).scalar_one())

    def update_summary(self, chat_id: str, summary: str, summary_until_message_id: int) -> None:
        with create_db_session() as db:
            stmt = (
                update(ChatSession)
                .where(ChatSession.chat_id == chat_id)
                .values(
                    summary=summary,
                    summary_updated_at=_utc_now(),
                    summary_until_message_id=summary_until_message_id,
                    last_updated=_utc_now(),
                )
            )
            db.execute(stmt)
            db.commit()

    def get_summary_state(self, chat_id: str) -> tuple[str | None, int]:
        with create_db_session() as db:
            session = db.get(ChatSession, chat_id)
            if not session:
                raise ChatNotFoundError("Chat not found")
            return session.summary, int(session.summary_until_message_id or 0)

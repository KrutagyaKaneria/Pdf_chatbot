from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import Select, select, update

from app.db.document_models import UserDocument
from app.db.session import create_db_session


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class DocumentRepository:
    def get_any_by_collection(self, collection_name: str) -> UserDocument | None:
        with create_db_session() as db:
            stmt: Select[tuple[UserDocument]] = select(UserDocument).where(UserDocument.collection_name == collection_name)
            return db.scalars(stmt).first()

    def get_by_collection(self, owner_id: str, collection_name: str) -> UserDocument | None:
        with create_db_session() as db:
            stmt: Select[tuple[UserDocument]] = select(UserDocument).where(
                UserDocument.owner_id == owner_id,
                UserDocument.collection_name == collection_name,
            )
            return db.scalars(stmt).first()

    def get_by_stored_filename(self, owner_id: str, stored_filename: str) -> UserDocument | None:
        with create_db_session() as db:
            stmt: Select[tuple[UserDocument]] = select(UserDocument).where(
                UserDocument.owner_id == owner_id,
                UserDocument.stored_filename == stored_filename,
            )
            return db.scalars(stmt).first()

    def ensure_collection_owner(self, owner_id: str, collection_name: str) -> UserDocument:
        row = self.get_any_by_collection(collection_name)
        if not row or row.owner_id != owner_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
        return row

    def upsert_document(
        self,
        owner_id: str,
        collection_name: str,
        filename: str,
        stored_filename: str,
    ) -> UserDocument:
        now = _utc_now()
        with create_db_session() as db:
            stmt: Select[tuple[UserDocument]] = select(UserDocument).where(UserDocument.collection_name == collection_name)
            existing = db.scalars(stmt).first()
            if existing:
                if existing.owner_id != owner_id:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Collection ownership conflict")
                db.execute(
                    update(UserDocument)
                    .where(
                        UserDocument.collection_name == collection_name,
                    )
                    .values(
                        filename=filename,
                        stored_filename=stored_filename,
                        updated_at=now,
                    )
                )
                db.commit()
                return self.get_by_collection(owner_id, collection_name)  # type: ignore[return-value]

            created = UserDocument(
                document_id=uuid.uuid4().hex,
                owner_id=owner_id,
                collection_name=collection_name,
                filename=filename,
                stored_filename=stored_filename,
                created_at=now,
                updated_at=now,
            )
            db.add(created)
            db.commit()
            db.refresh(created)
            return created
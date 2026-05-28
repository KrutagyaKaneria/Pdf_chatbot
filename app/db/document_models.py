from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserDocument(Base):
    __tablename__ = "user_documents"

    document_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    collection_name: Mapped[str] = mapped_column(String(255), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    cloudinary_public_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cloudinary_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    cloudinary_resource_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


Index("ux_user_documents_collection", UserDocument.collection_name, unique=True)
Index("ix_user_documents_owner_stored", UserDocument.owner_id, UserDocument.stored_filename)
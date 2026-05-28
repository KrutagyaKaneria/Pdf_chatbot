"""add cloudinary columns to user_documents

Revision ID: add_cloudinary_columns_20260528
Revises: 20260524_0001_auth_tenant_tables
Create Date: 2026-05-28
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "add_cloudinary_columns_20260528"
down_revision = "20260524_0001_auth_tenant_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("user_documents")}

    if "cloudinary_public_id" not in existing_columns:
        op.add_column("user_documents", sa.Column("cloudinary_public_id", sa.String(length=255), nullable=True))
    if "cloudinary_url" not in existing_columns:
        op.add_column("user_documents", sa.Column("cloudinary_url", sa.Text(), nullable=True))
    if "cloudinary_resource_type" not in existing_columns:
        op.add_column("user_documents", sa.Column("cloudinary_resource_type", sa.String(length=32), nullable=True))
    if "file_size_bytes" not in existing_columns:
        op.add_column("user_documents", sa.Column("file_size_bytes", sa.BigInteger(), nullable=True))
    if "mime_type" not in existing_columns:
        op.add_column("user_documents", sa.Column("mime_type", sa.String(length=128), nullable=True))

    existing_indexes = {index["name"] for index in inspector.get_indexes("user_documents")}
    if "ux_user_documents_collection" not in existing_indexes:
        op.create_unique_constraint(
            "ux_user_documents_collection",
            "user_documents",
            ["collection_name"],
        )
    if "ix_user_documents_owner_stored" not in existing_indexes:
        op.create_index(
            "ix_user_documents_owner_stored",
            "user_documents",
            ["owner_id", "stored_filename"],
        )
    if "ix_user_documents_owner_public_id" not in existing_indexes:
        op.create_index(
            "ix_user_documents_owner_public_id",
            "user_documents",
            ["owner_id", "cloudinary_public_id"],
        )


def downgrade() -> None:
    return

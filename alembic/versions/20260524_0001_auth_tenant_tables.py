"""auth tenant tables

Revision ID: 20260524_0001_auth_tenant_tables
Revises: 
Create Date: 2026-05-24 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260524_0001_auth_tenant_tables"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("user_id", sa.String(length=128), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=True, unique=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column("auth_provider", sa.String(length=32), nullable=False, server_default="local"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "refresh_sessions",
        sa.Column("session_id", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=128), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("token_jti", sa.String(length=64), nullable=False, unique=True),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
    )
    op.create_index("ix_refresh_sessions_user_id_revoked_at", "refresh_sessions", ["user_id", "revoked_at"])

    op.add_column("chat_sessions", sa.Column("owner_id", sa.String(length=128), nullable=False, server_default="system"))
    op.create_index("ix_chat_sessions_owner_id", "chat_sessions", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_chat_sessions_owner_id", table_name="chat_sessions")
    op.drop_column("chat_sessions", "owner_id")
    op.drop_index("ix_refresh_sessions_user_id_revoked_at", table_name="refresh_sessions")
    op.drop_table("refresh_sessions")
    op.drop_table("users")

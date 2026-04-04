"""add rich-text edit tracking and ticket soft delete

Revision ID: 0005_richtext_soft_delete
Revises: 0004_email_verification
Create Date: 2026-04-04 12:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "0005_richtext_soft_delete"
down_revision: Union[str, None] = "0004_email_verification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tickets",
        sa.Column("is_deleted_for_customer", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("tickets", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "tickets",
        sa.Column("deleted_by_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_tickets_deleted_by_id_users",
        "tickets",
        "users",
        ["deleted_by_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "comments",
        sa.Column("is_edited", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("comments", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "comments",
        sa.Column("edited_by_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_comments_edited_by_id_users",
        "comments",
        "users",
        ["edited_by_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_comments_edited_by_id_users", "comments", type_="foreignkey")
    op.drop_column("comments", "edited_by_id")
    op.drop_column("comments", "updated_at")
    op.drop_column("comments", "is_edited")

    op.drop_constraint("fk_tickets_deleted_by_id_users", "tickets", type_="foreignkey")
    op.drop_column("tickets", "deleted_by_id")
    op.drop_column("tickets", "deleted_at")
    op.drop_column("tickets", "is_deleted_for_customer")

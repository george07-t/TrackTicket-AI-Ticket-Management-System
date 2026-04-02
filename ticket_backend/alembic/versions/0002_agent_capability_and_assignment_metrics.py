"""add agent capability and assignment metrics fields

Revision ID: 0002_agent_assignment
Revises: 0001_init
Create Date: 2026-04-02 00:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "0002_agent_assignment"
down_revision: Union[str, None] = "0001_init"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("users", sa.Column("expertise_tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")))
    op.add_column("users", sa.Column("max_active_tickets", sa.Integer(), nullable=False, server_default=sa.text("10")))

    op.add_column("tickets", sa.Column("ai_suggested_agent_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("tickets", sa.Column("ai_assignment_confidence", sa.Float(), nullable=True))
    op.add_column("tickets", sa.Column("assignment_method", sa.String(length=50), nullable=False, server_default=sa.text("'load_balance'")))
    op.add_column("tickets", sa.Column("reassignment_count", sa.Integer(), nullable=False, server_default=sa.text("0")))
    op.add_column("tickets", sa.Column("first_response_at", sa.DateTime(timezone=True), nullable=True))

    op.create_foreign_key(
        "fk_tickets_ai_suggested_agent_id_users",
        "tickets",
        "users",
        ["ai_suggested_agent_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_tickets_ai_suggested_agent_id_users", "tickets", type_="foreignkey")

    op.drop_column("tickets", "first_response_at")
    op.drop_column("tickets", "reassignment_count")
    op.drop_column("tickets", "assignment_method")
    op.drop_column("tickets", "ai_assignment_confidence")
    op.drop_column("tickets", "ai_suggested_agent_id")

    op.drop_column("users", "max_active_tickets")
    op.drop_column("users", "expertise_tags")
    op.drop_column("users", "is_available")

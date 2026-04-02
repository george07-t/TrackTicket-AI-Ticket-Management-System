"""add phone to users

Revision ID: 0003_user_phone
Revises: 0002_agent_assignment
Create Date: 2026-04-02 13:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0003_user_phone"
down_revision: Union[str, None] = "0002_agent_assignment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=25), nullable=True))
    op.create_index(op.f("ix_users_phone"), "users", ["phone"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_phone"), table_name="users")
    op.drop_column("users", "phone")

"""add email verification fields

Revision ID: 0004_email_verification
Revises: 0003_user_phone
Create Date: 2026-04-02 14:10:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0004_email_verification"
down_revision: Union[str, None] = "0003_user_phone"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("users", sa.Column("email_otp_code", sa.String(length=6), nullable=True))
    op.add_column("users", sa.Column("email_otp_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("email_otp_attempts", sa.Integer(), nullable=False, server_default=sa.text("0")))


def downgrade() -> None:
    op.drop_column("users", "email_otp_attempts")
    op.drop_column("users", "email_otp_expires_at")
    op.drop_column("users", "email_otp_code")
    op.drop_column("users", "email_verified")

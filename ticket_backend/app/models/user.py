import uuid
from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import JSON, Boolean, DateTime, Enum, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(StrEnum):
    ADMIN = "admin"
    AGENT = "agent"
    CUSTOMER = "customer"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    phone: Mapped[str | None] = mapped_column(String(25), unique=True, index=True, nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda e: [x.value for x in e]),
        nullable=False,
        default=UserRole.CUSTOMER,
    )
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    expertise_tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    max_active_tickets: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

    # Password reset OTP
    otp_code: Mapped[str | None] = mapped_column(String(6), nullable=True)
    otp_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    otp_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    email_otp_code: Mapped[str | None] = mapped_column(String(6), nullable=True)
    email_otp_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    email_otp_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Audit
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    tickets_created = relationship(
        "Ticket",
        back_populates="creator",
        foreign_keys="Ticket.created_by",
        passive_deletes=True,
        passive_updates=True,
    )
    tickets_assigned = relationship(
        "Ticket",
        back_populates="assignee",
        foreign_keys="Ticket.assigned_to",
        passive_deletes=True,
        passive_updates=True,
    )
    ai_suggested_tickets = relationship(
        "Ticket",
        back_populates="ai_suggested_agent",
        foreign_keys="Ticket.ai_suggested_agent_id",
        passive_deletes=True,
        passive_updates=True,
    )
    comments = relationship(
        "Comment",
        back_populates="author",
        passive_deletes=True,
        passive_updates=True,
    )
    activities = relationship(
        "TicketActivity",
        back_populates="actor",
        passive_deletes=True,
        passive_updates=True,
    )

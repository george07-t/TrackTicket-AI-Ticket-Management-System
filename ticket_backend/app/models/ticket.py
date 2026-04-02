import uuid
from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TicketStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TicketCategory(StrEnum):
    BILLING = "billing"
    TECHNICAL = "technical"
    ACCOUNT = "account"
    GENERAL = "general"


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="ticket_status", values_callable=lambda e: [x.value for x in e]),
        nullable=False,
        default=TicketStatus.OPEN,
    )
    priority: Mapped[TicketPriority | None] = mapped_column(
        Enum(TicketPriority, name="ticket_priority", values_callable=lambda e: [x.value for x in e]),
        nullable=True,
    )
    category: Mapped[TicketCategory | None] = mapped_column(
        Enum(TicketCategory, name="ticket_category", values_callable=lambda e: [x.value for x in e]),
        nullable=True,
    )

    # AI fields
    ai_suggested_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_confidence_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ai_classified: Mapped[bool] = mapped_column(default=False, nullable=False)
    ai_suggested_agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    ai_assignment_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    assignment_method: Mapped[str] = mapped_column(String(50), nullable=False, default="load_balance")
    reassignment_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relations
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    first_response_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    creator = relationship("User", back_populates="tickets_created", foreign_keys=[created_by])
    assignee = relationship("User", back_populates="tickets_assigned", foreign_keys=[assigned_to])
    ai_suggested_agent = relationship("User", back_populates="ai_suggested_tickets", foreign_keys=[ai_suggested_agent_id])
    comments = relationship("Comment", back_populates="ticket", cascade="all, delete-orphan")
    activities = relationship(
        "TicketActivity", back_populates="ticket", cascade="all, delete-orphan",
        order_by="TicketActivity.created_at"
    )


class TicketActivity(Base):
    """Audit log: every status change, assignment, AI classification recorded here."""

    __tablename__ = "ticket_activities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    ticket = relationship("Ticket", back_populates="activities")
    actor = relationship("User", back_populates="activities")

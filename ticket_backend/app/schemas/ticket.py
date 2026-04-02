import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

from app.models.ticket import TicketCategory, TicketPriority, TicketStatus
from app.schemas.user import UserOut


class TicketCreate(BaseModel):
    title: str
    description: str

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Title cannot be empty")
        if len(v) < 5:
            raise ValueError("Title must be at least 5 characters")
        if len(v) > 200:
            raise ValueError("Title cannot exceed 200 characters")
        return v

    @field_validator("description")
    @classmethod
    def description_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Description cannot be empty")
        if len(v) < 10:
            raise ValueError("Description must be at least 10 characters")
        return v


class TicketUpdate(BaseModel):
    status: TicketStatus | None = None
    assigned_to: uuid.UUID | None = None


class TicketAiOverride(BaseModel):
    category: TicketCategory
    priority: TicketPriority
    suggested_response: str | None = None


class TicketAiReplyGenerate(BaseModel):
    force: bool = False


class TicketActivityOut(BaseModel):
    id: uuid.UUID
    action: str
    detail: str | None
    actor: UserOut | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TicketOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    status: TicketStatus
    priority: TicketPriority | None
    category: TicketCategory | None
    ai_suggested_response: str | None
    ai_confidence_note: str | None
    ai_classified: bool
    ai_suggested_agent_id: uuid.UUID | None
    ai_assignment_confidence: float | None
    assignment_method: str
    reassignment_count: int
    created_by: uuid.UUID
    assigned_to: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None
    first_response_at: datetime | None
    creator: UserOut
    assignee: UserOut | None
    ai_suggested_agent: UserOut | None

    model_config = {"from_attributes": True}


class TicketDetailOut(TicketOut):
    activities: list[TicketActivityOut] = []

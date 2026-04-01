import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.ticket import TicketCategory, TicketPriority, TicketStatus
from app.schemas.user import UserOut


class TicketCreate(BaseModel):
    title: str
    description: str


class TicketUpdate(BaseModel):
    status: TicketStatus | None = None
    assigned_to: uuid.UUID | None = None


class TicketAiOverride(BaseModel):
    category: TicketCategory
    priority: TicketPriority
    suggested_response: str | None = None


class TicketOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    status: TicketStatus
    priority: TicketPriority | None
    category: TicketCategory | None
    ai_suggested_response: str | None
    created_by: uuid.UUID
    assigned_to: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    creator: UserOut
    assignee: UserOut | None

    model_config = {"from_attributes": True}

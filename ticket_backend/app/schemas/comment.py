import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

from app.schemas.user import UserOut


class CommentCreate(BaseModel):
    body: str
    is_internal: bool = False

    @field_validator("body")
    @classmethod
    def body_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Comment body cannot be empty")
        return v


class CommentUpdate(BaseModel):
    body: str

    @field_validator("body")
    @classmethod
    def body_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Comment body cannot be empty")
        return v


class CommentOut(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    author_id: uuid.UUID
    body: str
    is_internal: bool
    is_edited: bool
    updated_at: datetime | None
    edited_by_id: uuid.UUID | None
    created_at: datetime
    author: UserOut

    model_config = {"from_attributes": True}

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserOut


class CommentCreate(BaseModel):
    body: str
    is_internal: bool = False


class CommentOut(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    author_id: uuid.UUID
    body: str
    is_internal: bool
    created_at: datetime
    author: UserOut

    model_config = {"from_attributes": True}

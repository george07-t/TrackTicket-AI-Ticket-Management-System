import asyncio
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal, get_db
from app.dependencies import get_current_user, require_role
from app.models.comment import Comment
from app.models.ticket import Ticket
from app.models.user import User, UserRole
from app.schemas.comment import CommentCreate, CommentOut
from app.schemas.ticket import TicketAiOverride, TicketCreate, TicketOut, TicketUpdate
from app.services.ai_service import AiService

router = APIRouter(prefix="/tickets", tags=["tickets"])
logger = logging.getLogger(__name__)


def _can_access_ticket(user: User, ticket: Ticket) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    if user.role == UserRole.CUSTOMER:
        return ticket.created_by == user.id
    return ticket.assigned_to == user.id


async def _load_ticket_or_404(db: AsyncSession, ticket_id: uuid.UUID) -> Ticket:
    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.creator), selectinload(Ticket.assignee))
        .where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


async def _select_agent_id(db: AsyncSession) -> uuid.UUID | None:
    result = await db.execute(
        select(User.id, func.count(Ticket.id).label("ticket_count"))
        .outerjoin(Ticket, Ticket.assigned_to == User.id)
        .where(User.role == UserRole.AGENT, User.is_active.is_(True))
        .group_by(User.id)
        .order_by(func.count(Ticket.id).asc(), User.created_at.asc())
    )
    row = result.first()
    if not row:
        return None
    return row.id


async def _run_ai_classification(ticket_id: uuid.UUID, title: str, description: str) -> None:
    ai_service = AiService()
    async with AsyncSessionLocal() as db:
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            return

        try:
            classification = await ai_service.classify_ticket(title=title, description=description)
            ticket.category = classification.category
            ticket.priority = classification.priority
            ticket.ai_suggested_response = classification.suggested_response
            await db.commit()
        except Exception as exc:
            await db.rollback()
            logger.exception("AI classification failed for ticket %s", ticket_id)

            fallback = ai_service.fallback_classification()
            ticket.category = fallback.category
            ticket.priority = fallback.priority
            ticket.ai_suggested_response = fallback.suggested_response
            await db.commit()
@router.post("/", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
) -> Ticket:
    assigned_to = await _select_agent_id(db)
    ticket = Ticket(
        title=payload.title.strip(),
        description=payload.description.strip(),
        created_by=current_user.id,
        assigned_to=assigned_to,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    asyncio.create_task(_run_ai_classification(ticket.id, ticket.title, ticket.description))

    loaded_ticket = await _load_ticket_or_404(db, ticket.id)
    return loaded_ticket


@router.get("/", response_model=list[TicketOut])
async def list_tickets(
    status_filter: str | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Ticket]:
    stmt = select(Ticket).options(selectinload(Ticket.creator), selectinload(Ticket.assignee)).order_by(Ticket.created_at.desc())

    if current_user.role == UserRole.CUSTOMER:
        stmt = stmt.where(Ticket.created_by == current_user.id)
    elif current_user.role == UserRole.AGENT:
        stmt = stmt.where(Ticket.assigned_to == current_user.id)

    if status_filter:
        stmt = stmt.where(Ticket.status == status_filter)

    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{ticket_id}", response_model=TicketOut)
async def get_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Ticket:
    ticket = await _load_ticket_or_404(db, ticket_id)
    if not _can_access_ticket(current_user, ticket):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketOut)
async def update_ticket(
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT)),
) -> Ticket:
    ticket = await _load_ticket_or_404(db, ticket_id)

    if current_user.role == UserRole.AGENT and ticket.assigned_to != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Agents can only update their assigned tickets")

    if payload.status is not None:
        ticket.status = payload.status

    if payload.assigned_to is not None:
        if current_user.role == UserRole.AGENT:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admin can reassign tickets")

        assignee = await db.get(User, payload.assigned_to)
        if not assignee or assignee.role != UserRole.AGENT or not assignee.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid assignee")
        ticket.assigned_to = payload.assigned_to

    await db.commit()
    await db.refresh(ticket)
    return await _load_ticket_or_404(db, ticket.id)


@router.patch("/{ticket_id}/ai", response_model=TicketOut)
async def override_ai(
    ticket_id: uuid.UUID,
    payload: TicketAiOverride,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> Ticket:
    ticket = await _load_ticket_or_404(db, ticket_id)
    ticket.category = payload.category
    ticket.priority = payload.priority
    ticket.ai_suggested_response = payload.suggested_response
    await db.commit()
    await db.refresh(ticket)
    return await _load_ticket_or_404(db, ticket.id)


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> None:
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    await db.delete(ticket)
    await db.commit()


@router.post("/{ticket_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def add_comment(
    ticket_id: uuid.UUID,
    payload: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Comment:
    ticket = await _load_ticket_or_404(db, ticket_id)
    if not _can_access_ticket(current_user, ticket):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if current_user.role == UserRole.CUSTOMER and payload.is_internal:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customers cannot create internal notes")

    comment = Comment(
        ticket_id=ticket.id,
        author_id=current_user.id,
        body=payload.body.strip(),
        is_internal=payload.is_internal,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    result = await db.execute(select(Comment).options(selectinload(Comment.author)).where(Comment.id == comment.id))
    return result.scalar_one()


@router.get("/{ticket_id}/comments", response_model=list[CommentOut])
async def list_comments(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Comment]:
    ticket = await _load_ticket_or_404(db, ticket_id)
    if not _can_access_ticket(current_user, ticket):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    stmt = select(Comment).options(selectinload(Comment.author)).where(Comment.ticket_id == ticket_id).order_by(Comment.created_at.asc())
    if current_user.role == UserRole.CUSTOMER:
        stmt = stmt.where(Comment.is_internal.is_(False))

    result = await db.execute(stmt)
    return list(result.scalars().all())

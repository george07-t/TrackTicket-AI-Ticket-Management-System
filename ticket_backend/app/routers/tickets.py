import logging
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal, get_db
from app.config import settings
from app.dependencies import get_current_user, require_role
from app.models.comment import Comment
from app.models.ticket import Ticket, TicketActivity, TicketCategory, TicketPriority, TicketStatus
from app.models.user import User, UserRole
from app.schemas.comment import CommentCreate, CommentOut
from app.schemas.ticket import TicketAiOverride, TicketAiReplyGenerate, TicketCreate, TicketDetailOut, TicketOut, TicketUpdate
from app.services.ai_service import AiService
from app.services.email_service import send_ticket_assigned_email, send_ticket_update_email

router = APIRouter(prefix="/tickets", tags=["tickets"])
logger = logging.getLogger(__name__)
AI_ASSIGNMENT_CONFIDENCE_THRESHOLD = settings.ai_assignment_confidence_threshold

# ─────────────────────────── helpers ────────────────────────────────────────


def _can_access_ticket(user: User, ticket: Ticket) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    if user.role == UserRole.CUSTOMER:
        return ticket.created_by == user.id
    # Agent: must be assigned; None assigned → no access
    return ticket.assigned_to is not None and ticket.assigned_to == user.id


def _is_agent_profile_complete(user: User) -> bool:
    if user.role != UserRole.AGENT:
        return True
    return bool(user.expertise_tags) and user.max_active_tickets > 0


def _ensure_agent_profile_complete(user: User) -> None:
    if not _is_agent_profile_complete(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Complete your agent profile (expertise and capacity) before accessing ticket workspace",
        )


async def _load_ticket(
    db: AsyncSession, ticket_id: uuid.UUID, *, with_activities: bool = False
) -> Ticket:
    opts = [
        selectinload(Ticket.creator),
        selectinload(Ticket.assignee),
        selectinload(Ticket.ai_suggested_agent),
    ]
    if with_activities:
        opts.append(
            selectinload(Ticket.activities).selectinload(TicketActivity.actor)
        )

    result = await db.execute(
        select(Ticket).options(*opts).where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


async def _select_agent_id(db: AsyncSession) -> uuid.UUID | None:
    """Assign to available active agent with the fewest active tickets within capacity."""
    result = await db.execute(
        select(
            User.id,
            func.count(Ticket.id).label("cnt"),
            User.max_active_tickets,
        )
        .outerjoin(
            Ticket,
            (Ticket.assigned_to == User.id)
            & (Ticket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS])),
        )
        .where(
            User.role == UserRole.AGENT,
            User.is_active.is_(True),
            User.is_available.is_(True),
        )
        .group_by(User.id, User.max_active_tickets, User.created_at)
        .order_by(func.count(Ticket.id).asc(), User.created_at.asc())
    )
    for row in result.all():
        if row.cnt < row.max_active_tickets:
            return row.id
    return None


async def _get_assignment_candidates(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(
            User.id,
            User.email,
            User.full_name,
            User.expertise_tags,
            User.max_active_tickets,
            func.count(Ticket.id).label("active_tickets"),
        )
        .outerjoin(
            Ticket,
            (Ticket.assigned_to == User.id)
            & (Ticket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS])),
        )
        .where(
            User.role == UserRole.AGENT,
            User.is_active.is_(True),
            User.is_available.is_(True),
        )
        .group_by(
            User.id,
            User.email,
            User.full_name,
            User.expertise_tags,
            User.max_active_tickets,
            User.created_at,
        )
        .order_by(func.count(Ticket.id).asc(), User.created_at.asc())
    )

    candidates = []
    for row in result.all():
        if row.active_tickets >= row.max_active_tickets:
            continue
        max_tickets = max(1, row.max_active_tickets)
        candidates.append(
            {
                "id": str(row.id),
                "email": row.email,
                "name": row.full_name,
                "expertise_tags": row.expertise_tags or [],
                "active_tickets": int(row.active_tickets),
                "max_active_tickets": max_tickets,
                "current_load_ratio": round(float(row.active_tickets) / float(max_tickets), 3),
            }
        )

    return candidates


async def _log_activity(
    db: AsyncSession,
    ticket_id: uuid.UUID,
    action: str,
    detail: str | None = None,
    actor_id: uuid.UUID | None = None,
) -> None:
    db.add(
        TicketActivity(
            ticket_id=ticket_id, actor_id=actor_id, action=action, detail=detail
        )
    )
    # caller is responsible for committing


# ─────────────────────── background AI task ─────────────────────────────────


async def _run_ai_classification(ticket_id: uuid.UUID, title: str, description: str) -> None:
    """Runs in background after ticket creation. Uses its own DB session."""
    ai = AiService()
    async with AsyncSessionLocal() as db:
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            return

        try:
            result = await ai.classify_ticket(title=title, description=description)
        except Exception:
            logger.exception("AI classify failed for ticket %s", ticket_id)
            result = ai.fallback_classification()

        ticket.category = result.category
        ticket.priority = result.priority
        # Reply generation is user-triggered (manual) to avoid unnecessary regeneration noise.
        if not ticket.ai_suggested_response:
            ticket.ai_suggested_response = None
        ticket.ai_confidence_note = result.confidence_note
        ticket.ai_classified = True

        candidates = await _get_assignment_candidates(db)
        default_agent_id = await _select_agent_id(db)
        assignment_method = "load_balance"
        assigned_to = default_agent_id

        if candidates:
            suggestion = await ai.suggest_agent(
                title=title,
                description=description,
                category=result.category.value,
                priority=result.priority.value,
                agents_json=json.dumps(candidates),
            )

            ticket.ai_assignment_confidence = suggestion.confidence
            suggestion_id = suggestion.suggested_agent_id
            suggested_candidate = next(
                (candidate for candidate in candidates if candidate["id"] == suggestion_id),
                None,
            )

            if suggested_candidate:
                ticket.ai_suggested_agent_id = uuid.UUID(suggested_candidate["id"])

            if suggested_candidate and suggestion.confidence >= AI_ASSIGNMENT_CONFIDENCE_THRESHOLD:
                assigned_to = uuid.UUID(suggested_candidate["id"])
                assignment_method = "ai_confident"
            else:
                assignment_method = "load_balance_fallback"

            threshold_note = (
                f" Agent suggestion confidence={suggestion.confidence:.2f}, "
                f"threshold={AI_ASSIGNMENT_CONFIDENCE_THRESHOLD:.2f}."
            )
            ticket.ai_confidence_note = ((ticket.ai_confidence_note or "") + threshold_note)[:255]

        if assigned_to and ticket.assigned_to != assigned_to:
            ticket.assigned_to = assigned_to
            ticket.reassignment_count += 1

            assignee = await db.get(User, assigned_to)
            assignee_name = assignee.full_name if assignee else str(assigned_to)
            await _log_activity(
                db,
                ticket_id=ticket_id,
                action="auto_reassigned",
                detail=f"Auto-assigned by {assignment_method} to {assignee_name}",
            )

        ticket.assignment_method = assignment_method

        await _log_activity(
            db,
            ticket_id=ticket_id,
            action="ai_classified",
            detail=(
                f"Category: {result.category}, Priority: {result.priority}, "
                f"assignment_method: {ticket.assignment_method}"
            ),
        )
        try:
            await db.commit()
        except Exception:
            logger.exception("Failed to save AI result for ticket %s", ticket_id)
            await db.rollback()


# ─────────────────────────── routes ─────────────────────────────────────────


@router.post("/", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: TicketCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CUSTOMER)),
) -> Ticket:
    assigned_to = await _select_agent_id(db)

    ticket = Ticket(
        title=payload.title,
        description=payload.description,
        created_by=current_user.id,
        assigned_to=assigned_to,
        assignment_method="load_balance",
    )
    db.add(ticket)
    await db.flush()  # get ticket.id before commit

    await _log_activity(
        db,
        ticket_id=ticket.id,
        action="created",
        detail="Ticket submitted by customer",
        actor_id=current_user.id,
    )
    await db.commit()
    await db.refresh(ticket)

    # Notify assigned agent via email (non-blocking)
    if assigned_to:
        result = await db.execute(select(User).where(User.id == assigned_to))
        agent = result.scalar_one_or_none()
        if agent:
            background_tasks.add_task(
                send_ticket_assigned_email,
                agent.email,
                agent.full_name,
                ticket.title,
                str(ticket.id),
            )

    # AI classification — FastAPI BackgroundTasks (correct pattern)
    background_tasks.add_task(
        _run_ai_classification, ticket.id, ticket.title, ticket.description
    )

    return await _load_ticket(db, ticket.id)


@router.get("/", response_model=list[TicketOut])
async def list_tickets(
    status_filter: TicketStatus | None = Query(default=None, alias="status"),
    category: TicketCategory | None = Query(default=None),
    priority: TicketPriority | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Ticket]:
    stmt = (
        select(Ticket)
        .options(selectinload(Ticket.creator), selectinload(Ticket.assignee))
        .order_by(Ticket.created_at.desc())
    )

    # Role-based filtering
    if current_user.role == UserRole.CUSTOMER:
        stmt = stmt.where(Ticket.created_by == current_user.id)
    elif current_user.role == UserRole.AGENT:
        _ensure_agent_profile_complete(current_user)
        stmt = stmt.where(Ticket.assigned_to == current_user.id)
    # Admin sees all

    # Optional filters
    if status_filter:
        stmt = stmt.where(Ticket.status == status_filter)
    if category:
        stmt = stmt.where(Ticket.category == category)
    if priority:
        stmt = stmt.where(Ticket.priority == priority)

    # Pagination
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{ticket_id}", response_model=TicketDetailOut)
async def get_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Ticket:
    if current_user.role == UserRole.AGENT:
        _ensure_agent_profile_complete(current_user)

    ticket = await _load_ticket(db, ticket_id, with_activities=True)
    if not _can_access_ticket(current_user, ticket):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketOut)
async def update_ticket(
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT)),
) -> Ticket:
    if current_user.role == UserRole.AGENT:
        _ensure_agent_profile_complete(current_user)

    ticket = await _load_ticket(db, ticket_id)

    if current_user.role == UserRole.AGENT and not _can_access_ticket(current_user, ticket):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update tickets assigned to you",
        )

    changes = []

    if payload.status is not None and payload.status != ticket.status:
        old_status = ticket.status
        ticket.status = payload.status

        # Set resolved_at timestamp when resolved
        if payload.status == TicketStatus.RESOLVED:
            ticket.resolved_at = datetime.now(timezone.utc)
        elif old_status == TicketStatus.RESOLVED:
            ticket.resolved_at = None  # reopened

        changes.append(f"Status: {old_status} → {payload.status}")

        # Email customer on status change
        result = await db.execute(select(User).where(User.id == ticket.created_by))
        customer = result.scalar_one_or_none()
        if customer:
            background_tasks.add_task(
                send_ticket_update_email,
                customer.email,
                customer.full_name,
                ticket.title,
                str(ticket.id),
                payload.status.value,
            )

    if "assigned_to" in payload.model_fields_set:
        if current_user.role == UserRole.AGENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can reassign tickets",
            )

        if payload.assigned_to != ticket.assigned_to:
            if payload.assigned_to is None:
                ticket.assigned_to = None
                ticket.reassignment_count += 1
                ticket.assignment_method = "manual_admin"
                changes.append("Unassigned from agent")
            else:
                assignee = await db.get(User, payload.assigned_to)
                if not assignee or assignee.role != UserRole.AGENT or not assignee.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Assignee must be an active agent",
                    )
                ticket.assigned_to = payload.assigned_to
                ticket.reassignment_count += 1
                ticket.assignment_method = "manual_admin"
                changes.append(f"Reassigned to {assignee.full_name}")

                background_tasks.add_task(
                    send_ticket_assigned_email,
                    assignee.email,
                    assignee.full_name,
                    ticket.title,
                    str(ticket.id),
                )

    if changes:
        await _log_activity(
            db,
            ticket_id=ticket.id,
            action="updated",
            detail="; ".join(changes),
            actor_id=current_user.id,
        )

    await db.commit()
    return await _load_ticket(db, ticket.id)


@router.patch("/{ticket_id}/ai", response_model=TicketOut)
async def override_ai(
    ticket_id: uuid.UUID,
    payload: TicketAiOverride,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
) -> Ticket:
    ticket = await _load_ticket(db, ticket_id)

    old = f"Category: {ticket.category}, Priority: {ticket.priority}"
    ticket.category = payload.category
    ticket.priority = payload.priority
    if payload.suggested_response is not None:
        ticket.ai_suggested_response = payload.suggested_response

    await _log_activity(
        db,
        ticket_id=ticket.id,
        action="ai_overridden",
        detail=f"{old} → Category: {payload.category}, Priority: {payload.priority}",
        actor_id=current_user.id,
    )
    await db.commit()
    return await _load_ticket(db, ticket.id)


@router.post("/{ticket_id}/ai-reply", response_model=TicketOut)
async def generate_ai_reply(
    ticket_id: uuid.UUID,
    payload: TicketAiReplyGenerate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT)),
) -> Ticket:
    if current_user.role == UserRole.AGENT:
        _ensure_agent_profile_complete(current_user)

    ticket = await _load_ticket(db, ticket_id)
    if current_user.role == UserRole.AGENT and not _can_access_ticket(current_user, ticket):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if ticket.ai_suggested_response and not payload.force:
        return ticket

    comments_result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.ticket_id == ticket.id)
        .order_by(Comment.created_at.desc())
        .limit(8)
    )
    comments = list(comments_result.scalars().all())
    conversation_context = "\n".join(
        [f"{comment.author.full_name}: {comment.body}" for comment in reversed(comments)]
    )

    ai = AiService()
    generated_reply = await ai.generate_reply(
        title=ticket.title,
        description=ticket.description,
        status=ticket.status.value,
        previous_reply=ticket.ai_suggested_response or "",
        conversation_context=conversation_context,
    )

    action = "ai_reply_regenerated" if ticket.ai_suggested_response else "ai_reply_generated"
    ticket.ai_suggested_response = generated_reply
    await _log_activity(
        db,
        ticket_id=ticket.id,
        action=action,
        detail=f"AI reply {'regenerated' if payload.force else 'generated'} by {current_user.full_name}",
        actor_id=current_user.id,
    )
    await db.commit()
    return await _load_ticket(db, ticket.id)


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


# ─────────────────────────── comments ───────────────────────────────────────


@router.post("/{ticket_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def add_comment(
    ticket_id: uuid.UUID,
    payload: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Comment:
    if current_user.role == UserRole.AGENT:
        _ensure_agent_profile_complete(current_user)

    ticket = await _load_ticket(db, ticket_id)

    if not _can_access_ticket(current_user, ticket):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if current_user.role == UserRole.CUSTOMER and payload.is_internal:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customers cannot create internal notes",
        )

    # Customers cannot comment on closed tickets
    if current_user.role == UserRole.CUSTOMER and ticket.status == TicketStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot comment on a closed ticket",
        )

    comment = Comment(
        ticket_id=ticket.id,
        author_id=current_user.id,
        body=payload.body,
        is_internal=payload.is_internal,
    )
    db.add(comment)
    await db.flush()

    if (
        current_user.role == UserRole.AGENT
        and not payload.is_internal
        and ticket.first_response_at is None
    ):
        ticket.first_response_at = datetime.now(timezone.utc)

    await _log_activity(
        db,
        ticket_id=ticket.id,
        action="internal_note" if payload.is_internal else "comment_added",
        detail=f"By {current_user.full_name}",
        actor_id=current_user.id,
    )
    await db.commit()
    await db.refresh(comment)

    result = await db.execute(
        select(Comment).options(selectinload(Comment.author)).where(Comment.id == comment.id)
    )
    return result.scalar_one()


@router.get("/{ticket_id}/comments", response_model=list[CommentOut])
async def list_comments(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Comment]:
    if current_user.role == UserRole.AGENT:
        _ensure_agent_profile_complete(current_user)

    ticket = await _load_ticket(db, ticket_id)

    if not _can_access_ticket(current_user, ticket):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    stmt = (
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.ticket_id == ticket_id)
        .order_by(Comment.created_at.asc())
    )

    # Customers cannot see internal notes
    if current_user.role == UserRole.CUSTOMER:
        stmt = stmt.where(Comment.is_internal.is_(False))

    result = await db.execute(stmt)
    return list(result.scalars().all())

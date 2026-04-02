from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_role
from app.models.ticket import Ticket, TicketCategory, TicketPriority, TicketStatus
from app.models.user import User, UserRole

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _is_agent_profile_complete(user: User) -> bool:
    if user.role != UserRole.AGENT:
        return True
    return bool(user.expertise_tags) and user.max_active_tickets > 0


@router.get("/stats")
async def stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> dict:
    # Core counts
    total = await db.scalar(select(func.count(Ticket.id))) or 0
    open_count = await db.scalar(
        select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.OPEN)
    ) or 0
    in_progress = await db.scalar(
        select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.IN_PROGRESS)
    ) or 0
    resolved = await db.scalar(
        select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.RESOLVED)
    ) or 0
    closed = await db.scalar(
        select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.CLOSED)
    ) or 0

    # Unassigned tickets
    unassigned = await db.scalar(
        select(func.count(Ticket.id)).where(Ticket.assigned_to.is_(None))
    ) or 0

    # AI classified vs not yet
    ai_classified = await db.scalar(
        select(func.count(Ticket.id)).where(Ticket.ai_classified.is_(True))
    ) or 0

    # Avg resolution time (seconds → hours)
    avg_secs = await db.scalar(
        select(
            func.avg(
                func.extract("epoch", Ticket.resolved_at - Ticket.created_at)
            )
        ).where(
            Ticket.status == TicketStatus.RESOLVED,
            Ticket.resolved_at.isnot(None),
        )
    )
    avg_resolution_hours = round((avg_secs or 0) / 3600, 2)

    reassigned_tickets = await db.scalar(
        select(func.count(Ticket.id)).where(Ticket.reassignment_count > 0)
    ) or 0
    assigned_tickets = await db.scalar(
        select(func.count(Ticket.id)).where(Ticket.assigned_to.isnot(None))
    ) or 0
    reassignment_rate = round((reassigned_tickets / assigned_tickets) * 100, 2) if assigned_tickets else 0.0

    first_response_secs = await db.scalar(
        select(func.avg(func.extract("epoch", Ticket.first_response_at - Ticket.created_at))).where(
            Ticket.first_response_at.isnot(None)
        )
    )
    avg_first_response_minutes = round((first_response_secs or 0) / 60, 2)

    # By category
    cat_rows = await db.execute(
        select(Ticket.category, func.count(Ticket.id)).group_by(Ticket.category)
    )
    by_category = {
        (c.value if isinstance(c, TicketCategory) else "unclassified"): cnt
        for c, cnt in cat_rows.all()
    }

    # By priority
    pri_rows = await db.execute(
        select(Ticket.priority, func.count(Ticket.id)).group_by(Ticket.priority)
    )
    by_priority = {
        (p.value if isinstance(p, TicketPriority) else "unclassified"): cnt
        for p, cnt in pri_rows.all()
    }

    resolution_by_agent_rows = await db.execute(
        select(
            User.full_name,
            func.avg(func.extract("epoch", Ticket.resolved_at - Ticket.created_at)).label("avg_secs"),
            func.count(Ticket.id).label("resolved_count"),
        )
        .join(User, Ticket.assigned_to == User.id)
        .where(Ticket.status == TicketStatus.RESOLVED, Ticket.resolved_at.isnot(None))
        .group_by(User.id, User.full_name)
        .order_by(User.full_name.asc())
    )
    resolution_by_agent = [
        {
            "agent": name,
            "avg_resolution_hours": round((avg_secs or 0) / 3600, 2),
            "resolved_count": resolved_count,
        }
        for name, avg_secs, resolved_count in resolution_by_agent_rows.all()
    ]

    resolution_by_category_rows = await db.execute(
        select(
            Ticket.category,
            func.avg(func.extract("epoch", Ticket.resolved_at - Ticket.created_at)).label("avg_secs"),
            func.count(Ticket.id).label("resolved_count"),
        )
        .where(Ticket.status == TicketStatus.RESOLVED, Ticket.resolved_at.isnot(None))
        .group_by(Ticket.category)
    )
    resolution_by_category = [
        {
            "category": category.value if isinstance(category, TicketCategory) else "unclassified",
            "avg_resolution_hours": round((avg_secs or 0) / 3600, 2),
            "resolved_count": resolved_count,
        }
        for category, avg_secs, resolved_count in resolution_by_category_rows.all()
    ]

    # Agent workload
    agent_rows = await db.execute(
        select(User.full_name, func.count(Ticket.id).label("open_tickets"))
        .outerjoin(
            Ticket,
            (Ticket.assigned_to == User.id) & (Ticket.status == TicketStatus.OPEN),
        )
        .where(User.role == UserRole.AGENT, User.is_active.is_(True))
        .group_by(User.id, User.full_name)
        .order_by(func.count(Ticket.id).desc())
    )
    agent_workload = [
        {"agent": name, "open_tickets": cnt} for name, cnt in agent_rows.all()
    ]

    # User counts
    total_customers = await db.scalar(
        select(func.count(User.id)).where(User.role == UserRole.CUSTOMER)
    ) or 0
    total_agents = await db.scalar(
        select(func.count(User.id)).where(User.role == UserRole.AGENT)
    ) or 0

    return {
        "tickets": {
            "total": total,
            "open": open_count,
            "in_progress": in_progress,
            "resolved": resolved,
            "closed": closed,
            "unassigned": unassigned,
            "ai_classified": ai_classified,
            "ai_pending": total - ai_classified,
        },
        "avg_resolution_hours": avg_resolution_hours,
        "assignment_quality": {
            "reassignment_rate": reassignment_rate,
            "avg_first_response_minutes": avg_first_response_minutes,
            "reassigned_tickets": reassigned_tickets,
            "assigned_tickets": assigned_tickets,
        },
        "by_category": by_category,
        "by_priority": by_priority,
        "resolution_by_agent": resolution_by_agent,
        "resolution_by_category": resolution_by_category,
        "agent_workload": agent_workload,
        "users": {
            "total_customers": total_customers,
            "total_agents": total_agents,
        },
    }


@router.get("/agent-stats")
async def agent_stats(
    db: AsyncSession = Depends(get_db),
    current_agent: User = Depends(require_role(UserRole.AGENT, UserRole.ADMIN)),
) -> dict:
    """Personal stats for the logged-in agent."""
    if current_agent.role == UserRole.AGENT and not _is_agent_profile_complete(current_agent):
        return {
            "assigned_total": 0,
            "open": 0,
            "resolved": 0,
            "critical_open": 0,
        }

    agent_id = current_agent.id

    assigned = await db.scalar(
        select(func.count(Ticket.id)).where(Ticket.assigned_to == agent_id)
    ) or 0
    open_count = await db.scalar(
        select(func.count(Ticket.id)).where(
            Ticket.assigned_to == agent_id,
            Ticket.status == TicketStatus.OPEN,
        )
    ) or 0
    resolved_count = await db.scalar(
        select(func.count(Ticket.id)).where(
            Ticket.assigned_to == agent_id,
            Ticket.status == TicketStatus.RESOLVED,
        )
    ) or 0
    critical_open = await db.scalar(
        select(func.count(Ticket.id)).where(
            Ticket.assigned_to == agent_id,
            Ticket.status == TicketStatus.OPEN,
            Ticket.priority == "critical",
        )
    ) or 0

    return {
        "assigned_total": assigned,
        "open": open_count,
        "resolved": resolved_count,
        "critical_open": critical_open,
    }

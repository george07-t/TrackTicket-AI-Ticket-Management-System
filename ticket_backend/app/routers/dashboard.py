from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_role
from app.models.ticket import Ticket, TicketCategory, TicketPriority, TicketStatus
from app.models.user import User, UserRole

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> dict:
    total = await db.scalar(select(func.count(Ticket.id)))
    open_count = await db.scalar(select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.OPEN))
    resolved_count = await db.scalar(select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.RESOLVED))

    avg_resolution = await db.scalar(
        select(func.avg(func.extract("epoch", Ticket.updated_at - Ticket.created_at))).where(Ticket.status == TicketStatus.RESOLVED)
    )

    category_rows = await db.execute(select(Ticket.category, func.count(Ticket.id)).group_by(Ticket.category))
    priority_rows = await db.execute(select(Ticket.priority, func.count(Ticket.id)).group_by(Ticket.priority))

    by_category = {
        (category.value if isinstance(category, TicketCategory) else "unclassified"): count
        for category, count in category_rows.all()
    }
    by_priority = {
        (priority.value if isinstance(priority, TicketPriority) else "unclassified"): count
        for priority, count in priority_rows.all()
    }

    return {
        "total_tickets": total or 0,
        "open_tickets": open_count or 0,
        "resolved_tickets": resolved_count or 0,
        "avg_resolution_time_hours": round(((avg_resolution or 0) / timedelta(hours=1).total_seconds()), 2),
        "tickets_by_category": by_category,
        "tickets_by_priority": by_priority,
    }

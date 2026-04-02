"""
Seed script — run once after migrations:
  python seed.py
"""
import asyncio
import json
import uuid

from sqlalchemy import func, select

from app.database import AsyncSessionLocal
from app.models.ticket import Ticket, TicketCategory, TicketPriority, TicketStatus
from app.models.user import User, UserRole
from app.services.auth_service import AuthService
from app.services.ai_service import AiService

SEED_PASSWORD = "Password123!"

ADMIN_USER = {
    "email": "admin@TrackTicket.dev",
    "phone": "8801700000001",
    "full_name": "Admin User",
    "role": UserRole.ADMIN,
}

AGENT_USERS = [
    {
        "email": "agent1@TrackTicket.dev",
        "phone": "8801700000011",
        "full_name": "Agent Alice",
        "expertise_tags": ["account", "authentication", "security"],
        "max_active_tickets": 8,
    },
    {
        "email": "agent2@TrackTicket.dev",
        "phone": "8801700000012",
        "full_name": "Agent Bob",
        "expertise_tags": ["billing", "invoice", "payment"],
        "max_active_tickets": 10,
    },
    {
        "email": "agent3@TrackTicket.dev",
        "phone": "8801700000013",
        "full_name": "Agent Charlie",
        "expertise_tags": ["technical", "api", "performance"],
        "max_active_tickets": 7,
    },
]

CUSTOMER_USERS = [
    ("customer1@TrackTicket.dev", "8801700000021", "Customer Carol"),
    ("customer2@TrackTicket.dev", "8801700000022", "Customer David"),
    ("customer3@TrackTicket.dev", "8801700000023", "Customer Eve"),
    ("customer4@TrackTicket.dev", "8801700000024", "Customer Frank"),
    ("customer5@TrackTicket.dev", "8801700000025", "Customer Grace"),
]

TICKETS = [
    (
        "Cannot login after password reset",
        "I reset my password 2 hours ago but still can't log in. Getting 'invalid credentials'.",
        TicketStatus.OPEN,
    ),
    (
        "Double charged for subscription",
        "I was charged twice for October. Transaction IDs: TXN-8812 and TXN-8819.",
        TicketStatus.IN_PROGRESS,
    ),
    (
        "API integration returning 500 errors",
        "Our webhook integration has been failing with 500 responses since yesterday morning. Blocking our production pipeline.",
        TicketStatus.OPEN,
    ),
    (
        "Invoice amount is incorrect",
        "My latest invoice shows $299 but my plan is $199/month. Need this corrected.",
        TicketStatus.OPEN,
    ),
    (
        "Dashboard crashes on reports tab",
        "Every time I open the Reports tab, the whole dashboard freezes and crashes. Started after the last update.",
        TicketStatus.OPEN,
    ),
]


async def _get_assignment_candidates(db) -> list[dict]:
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


def _fallback_agent(candidates: list[dict]) -> str | None:
    if not candidates:
        return None
    return sorted(candidates, key=lambda c: (c["current_load_ratio"], c["name"]))[0]["id"]


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        ai = AiService()

        # ── users ─────────────────────────────────────────────
        created_users: dict[str, User] = {}

        all_users_payload = [
            ADMIN_USER,
            *[
                {
                    "email": agent["email"],
                    "phone": agent["phone"],
                    "full_name": agent["full_name"],
                    "role": UserRole.AGENT,
                    "expertise_tags": agent["expertise_tags"],
                    "max_active_tickets": agent["max_active_tickets"],
                }
                for agent in AGENT_USERS
            ],
            *[
                {
                    "email": email,
                    "phone": phone,
                    "full_name": name,
                    "role": UserRole.CUSTOMER,
                }
                for email, phone, name in CUSTOMER_USERS
            ],
        ]

        for payload in all_users_payload:
            email = payload["email"].lower()
            existing = (
                await db.execute(select(User).where(func.lower(User.email) == email))
            ).scalar_one_or_none()

            if existing:
                # Normalize existing seed users so auth lookups are consistent.
                existing.email = email
                existing.phone = payload.get("phone")
                existing.full_name = payload["full_name"]
                existing.role = payload["role"]
                existing.email_verified = True
                existing.hashed_password = AuthService.hash_password(SEED_PASSWORD)
                existing.expertise_tags = payload.get("expertise_tags", [])
                existing.max_active_tickets = payload.get("max_active_tickets", 10)
                existing.is_available = True
                created_users[email] = existing
                print(f"  ↩  User exists: {email}")
                continue

            user = User(
                email=email,
                phone=payload.get("phone"),
                full_name=payload["full_name"],
                role=payload["role"],
                email_verified=True,
                hashed_password=AuthService.hash_password(SEED_PASSWORD),
                expertise_tags=payload.get("expertise_tags", []),
                max_active_tickets=payload.get("max_active_tickets", 10),
                is_available=True,
            )
            db.add(user)
            created_users[email] = user
            print(f"  ✅ Created user: {email} ({payload['role']})")

        await db.commit()

        # refresh to get IDs
        for email in created_users:
            result = await db.execute(select(User).where(User.email == email))
            created_users[email] = result.scalar_one()

        # ── tickets ───────────────────────────────────────────
        ticket_count = (await db.execute(select(func.count(Ticket.id)))).scalar_one()
        if ticket_count >= 5:
            print(f"  ↩  Tickets already exist ({ticket_count}) — skipping")
        else:
            customers = [u for u in created_users.values() if u.role == UserRole.CUSTOMER]
            if len(customers) < 5:
                raise RuntimeError("Need at least 5 customers for seed")

            existing_titles = {
                row[0]
                for row in (await db.execute(select(Ticket.title))).all()
            }

            created_count = 0

            for i, (title, description, ticket_status) in enumerate(TICKETS):
                if title in existing_titles:
                    continue
                if ticket_count + created_count >= 5:
                    break

                customer = customers[i % len(customers)]

                classification = await ai.classify_ticket(title=title, description=description)
                candidates = await _get_assignment_candidates(db)

                assigned_to = None
                assignment_method = "load_balance"
                ai_confidence = None
                suggested_agent_id = None

                if candidates:
                    suggestion = await ai.suggest_agent(
                        title=title,
                        description=description,
                        category=classification.category.value,
                        priority=classification.priority.value,
                        agents_json=json.dumps(candidates),
                    )
                    ai_confidence = suggestion.confidence
                    if suggestion.suggested_agent_id:
                        suggested_agent_id = suggestion.suggested_agent_id

                    if suggestion.suggested_agent_id and suggestion.confidence >= 0.75:
                        assigned_to = uuid.UUID(suggestion.suggested_agent_id)
                        assignment_method = "ai_confident"
                    else:
                        fallback_id = _fallback_agent(candidates)
                        assigned_to = uuid.UUID(fallback_id) if fallback_id else None
                        assignment_method = "load_balance_fallback"

                ticket = Ticket(
                    title=title,
                    description=description,
                    category=classification.category,
                    priority=classification.priority,
                    status=ticket_status,
                    ai_suggested_response=classification.suggested_response,
                    ai_confidence_note=classification.confidence_note,
                    ai_classified=True,
                    ai_assignment_confidence=ai_confidence,
                    ai_suggested_agent_id=uuid.UUID(suggested_agent_id) if suggested_agent_id else None,
                    assignment_method=assignment_method,
                    created_by=customer.id,
                    assigned_to=assigned_to,
                )
                db.add(ticket)
                await db.commit()
                created_count += 1
                print(f"  ✅ Created ticket: {title[:50]} ({assignment_method})")

        print("\n🎉 Seed complete!")
        print(f"\n📋 Login credentials (all passwords: {SEED_PASSWORD})")
        print("  admin@trackticket.dev     -> Admin")
        print("  agent1@trackticket.dev    -> Agent")
        print("  agent2@trackticket.dev    -> Agent")
        print("  agent3@trackticket.dev    -> Agent")
        print("  customer1@trackticket.dev -> Customer")
        print("  customer2@trackticket.dev -> Customer")
        print("  customer3@trackticket.dev -> Customer")
        print("  customer4@trackticket.dev -> Customer")
        print("  customer5@trackticket.dev -> Customer")


if __name__ == "__main__":
    asyncio.run(seed())

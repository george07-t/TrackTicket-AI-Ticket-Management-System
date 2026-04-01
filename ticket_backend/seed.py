import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.ticket import Ticket, TicketCategory, TicketPriority, TicketStatus
from app.models.user import User, UserRole
from app.services.auth_service import AuthService


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        # Normalize early seed emails from .local to a valid domain.
        legacy_emails = {
            "admin@ticket.local": "admin@ticket.dev",
            "agent1@ticket.local": "agent1@ticket.dev",
            "agent2@ticket.local": "agent2@ticket.dev",
            "customer1@ticket.local": "customer1@ticket.dev",
            "customer2@ticket.local": "customer2@ticket.dev",
            "customer3@ticket.local": "customer3@ticket.dev",
        }

        for old_email, new_email in legacy_emails.items():
            existing_old = (await db.execute(select(User).where(User.email == old_email))).scalar_one_or_none()
            if not existing_old:
                continue
            existing_new = (await db.execute(select(User).where(User.email == new_email))).scalar_one_or_none()
            if existing_new:
                await db.delete(existing_old)
            else:
                existing_old.email = new_email

        await db.commit()

        users = [
            ("admin@ticket.dev", "Admin User", UserRole.ADMIN),
            ("agent1@ticket.dev", "Agent One", UserRole.AGENT),
            ("agent2@ticket.dev", "Agent Two", UserRole.AGENT),
            ("customer1@ticket.dev", "Customer One", UserRole.CUSTOMER),
            ("customer2@ticket.dev", "Customer Two", UserRole.CUSTOMER),
            ("customer3@ticket.dev", "Customer Three", UserRole.CUSTOMER),
        ]

        for email, name, role in users:
            exists = await db.execute(select(User).where(User.email == email))
            if exists.scalar_one_or_none():
                continue
            db.add(
                User(
                    email=email,
                    full_name=name,
                    role=role,
                    hashed_password=AuthService.get_password_hash("Password123!"),
                )
            )

        await db.commit()

        customer = (await db.execute(select(User).where(User.role == UserRole.CUSTOMER))).scalars().first()
        agent = (await db.execute(select(User).where(User.role == UserRole.AGENT))).scalars().first()
        has_tickets = (await db.execute(select(Ticket.id))).first()

        if customer and agent and not has_tickets:
            samples = [
                ("Cannot login", "I am locked out after password reset", TicketCategory.ACCOUNT, TicketPriority.HIGH),
                ("Billing mismatch", "Invoice amount is higher than expected", TicketCategory.BILLING, TicketPriority.MEDIUM),
                ("App crash", "Dashboard crashes after opening reports", TicketCategory.TECHNICAL, TicketPriority.CRITICAL),
                ("Change email", "Need to update account email", TicketCategory.ACCOUNT, TicketPriority.LOW),
                ("Feature question", "How to export my ticket history?", TicketCategory.GENERAL, TicketPriority.LOW),
            ]
            for title, description, category, priority in samples:
                db.add(
                    Ticket(
                        title=title,
                        description=description,
                        category=category,
                        priority=priority,
                        ai_suggested_response="We have received your request and will follow up shortly.",
                        status=TicketStatus.OPEN,
                        created_by=customer.id,
                        assigned_to=agent.id,
                    )
                )
            await db.commit()


if __name__ == "__main__":
    asyncio.run(seed())

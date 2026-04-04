import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from app.database import AsyncSessionLocal
from app.dependencies import get_current_user
from app.main import app
from app.models.ticket import Ticket, TicketStatus
from app.models.user import User, UserRole
from app.routers import tickets as tickets_router


@pytest.fixture
async def api_client(monkeypatch: pytest.MonkeyPatch) -> AsyncGenerator[tuple[AsyncClient, dict], None]:
    actor: dict[str, User | None] = {"user": None}

    async def override_current_user() -> User:
        user = actor["user"]
        if user is None:
            raise RuntimeError("Test actor is not set")
        return user

    async def fake_ai_classification(*args, **kwargs) -> None:
        # Keep tests deterministic and offline.
        return

    monkeypatch.setattr(tickets_router, "_run_ai_classification", fake_ai_classification)
    app.dependency_overrides[get_current_user] = override_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client, actor

    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.anyio
async def test_ticket_crud_across_roles_with_soft_and_permanent_delete(
    api_client: tuple[AsyncClient, dict],
) -> None:
    client, actor = api_client
    suffix = uuid.uuid4().hex[:8]

    async with AsyncSessionLocal() as db:
        admin = User(
            email=f"admin-{suffix}@example.com",
            full_name="Admin Tester",
            role=UserRole.ADMIN,
            hashed_password="x",
            email_verified=True,
            is_active=True,
        )
        agent = User(
            email=f"agent-{suffix}@example.com",
            full_name="Agent Tester",
            role=UserRole.AGENT,
            hashed_password="x",
            email_verified=True,
            is_active=True,
            expertise_tags=["technical"],
            max_active_tickets=5,
            is_available=True,
        )
        customer = User(
            email=f"customer-{suffix}@example.com",
            full_name="Customer Tester",
            role=UserRole.CUSTOMER,
            hashed_password="x",
            email_verified=True,
            is_active=True,
        )

        db.add_all([admin, agent, customer])
        await db.commit()
        await db.refresh(admin)
        await db.refresh(agent)
        await db.refresh(customer)

    try:
        # Customer creates ticket
        actor["user"] = customer
        create_resp = await client.post(
            "/api/tickets/",
            json={
                "title": "Cannot login after reset",
                "description": "Customer is unable to login after password reset flow.",
            },
        )
        assert create_resp.status_code == 201, create_resp.text
        ticket_id = create_resp.json()["id"]

        # Customer can update own ticket while not resolved/closed
        update_by_customer = await client.patch(
            f"/api/tickets/{ticket_id}",
            json={"description": "Updated details from customer side for reproduction."},
        )
        assert update_by_customer.status_code == 200, update_by_customer.text

        # Agent cannot delete tickets
        actor["user"] = agent
        agent_delete = await client.delete(f"/api/tickets/{ticket_id}")
        assert agent_delete.status_code == 403, agent_delete.text

        # Admin can assign ticket to agent
        actor["user"] = admin
        assign_resp = await client.patch(
            f"/api/tickets/{ticket_id}",
            json={"assigned_to": str(agent.id)},
        )
        assert assign_resp.status_code == 200, assign_resp.text
        assert assign_resp.json()["assigned_to"] == str(agent.id)

        # Agent can update status on assigned ticket
        actor["user"] = agent
        agent_update = await client.patch(
            f"/api/tickets/{ticket_id}",
            json={"status": TicketStatus.IN_PROGRESS.value},
        )
        assert agent_update.status_code == 200, agent_update.text
        assert agent_update.json()["status"] == TicketStatus.IN_PROGRESS.value

        # Admin resolves ticket
        actor["user"] = admin
        resolve_resp = await client.patch(
            f"/api/tickets/{ticket_id}",
            json={"status": TicketStatus.RESOLVED.value},
        )
        assert resolve_resp.status_code == 200, resolve_resp.text

        # Customer cannot edit resolved ticket
        actor["user"] = customer
        blocked_update = await client.patch(
            f"/api/tickets/{ticket_id}",
            json={"title": "Customer tries to edit after resolution"},
        )
        assert blocked_update.status_code == 400, blocked_update.text

        # Customer soft-deletes own ticket
        customer_soft_delete = await client.delete(f"/api/tickets/{ticket_id}")
        assert customer_soft_delete.status_code == 204, customer_soft_delete.text

        # Soft-deleted ticket is hidden from customer list
        customer_list = await client.get("/api/tickets/")
        assert customer_list.status_code == 200, customer_list.text
        customer_ticket_ids = {item["id"] for item in customer_list.json()}
        assert ticket_id not in customer_ticket_ids

        # Admin still sees ticket and soft-delete metadata
        actor["user"] = admin
        admin_list = await client.get("/api/tickets/")
        assert admin_list.status_code == 200, admin_list.text
        matching = [item for item in admin_list.json() if item["id"] == ticket_id]
        assert len(matching) == 1
        assert matching[0]["is_deleted_for_customer"] is True
        assert matching[0]["deleted_by_id"] == str(customer.id)

        # Customer cannot permanently delete
        actor["user"] = customer
        customer_perm_delete = await client.delete(f"/api/tickets/{ticket_id}?permanent=true")
        assert customer_perm_delete.status_code == 403, customer_perm_delete.text

        # Admin can permanently delete
        actor["user"] = admin
        admin_perm_delete = await client.delete(f"/api/tickets/{ticket_id}?permanent=true")
        assert admin_perm_delete.status_code == 204, admin_perm_delete.text

        # Ticket is actually gone from DB
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Ticket).where(Ticket.id == uuid.UUID(ticket_id)))
            assert result.scalar_one_or_none() is None

    finally:
        # Cleanup users created by this test.
        async with AsyncSessionLocal() as db:
            await db.execute(
                delete(User).where(
                    User.email.in_(
                        [
                            f"admin-{suffix}@example.com",
                            f"agent-{suffix}@example.com",
                            f"customer-{suffix}@example.com",
                        ]
                    )
                )
            )
            await db.commit()

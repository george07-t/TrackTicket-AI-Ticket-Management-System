# TrackTicket — AI Ticket Management System

AI-powered customer support ticket management built with FastAPI + Next.js + PostgreSQL + Groq LLaMA 3.3.

---

## Features

### Core
- 3-role system: **Customer**, **Agent**, **Admin**
- JWT authentication (stateless)
- AI ticket classification (category + priority + suggested response) via Groq LLaMA 3.3
- Auto agent assignment (round-robin by lowest open ticket count)
- Ticket activity/audit log on every action
- Role-filtered ticket listing with pagination + filters
- Internal notes (agents/admin only, hidden from customers)
- Customer cannot comment on closed tickets

### Auth & Security
- Password strength validation (8+ chars, uppercase, digit)
- Timing-attack-safe login (constant-time hash check)
- Forgot password via email OTP (6-digit, 10 min expiry)
- OTP brute-force lockout (5 failed attempts)
- Change password (authenticated, requires current password)
- Admin cannot deactivate/delete own account

### Email Notifications (async, non-blocking)
- OTP email for password reset
- Agent notified when ticket assigned
- Customer notified on ticket status change

### Admin
- Full user management (create agents, update role/status, delete)
- Admin stats dashboard (totals, by category, by priority, agent workload, avg resolution time)
- Agent personal stats endpoint
- AI override per ticket

### Bonus Features
- `resolved_at` timestamp tracked separately for accurate SLA reporting
- `ai_classified` boolean flag — frontend can show "pending AI" badge
- `ai_confidence_note` — AI explains its own classification
- Ticket filter by status + category + priority with pagination
- User list filterable by role + active status
- Unassigned ticket count in dashboard

---

## Quick Start

### 1. Setup environment
```bash
cp .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY, GROQ_API_KEY, SMTP credentials
```

### 2. Run with Docker Compose
```bash
docker compose up --build -d
```

### 3. Run migrations
```bash
docker compose exec backend alembic upgrade head
```

### 4. Seed demo data
```bash
docker compose exec backend python seed.py
```

### 5. Access
- API docs: http://localhost:8000/docs
- Frontend: http://localhost:3000

---

## Demo Credentials (after seed)

| Email | Password | Role |
|---|---|---|
| admin@TrackTicket.dev | Password123! | Admin |
| agent1@TrackTicket.dev | Password123! | Agent |
| agent2@TrackTicket.dev | Password123! | Agent |
| customer1@TrackTicket.dev | Password123! | Customer |
| customer2@TrackTicket.dev | Password123! | Customer |

---

## API Reference

### Auth
```
POST /api/auth/register          — Customer self-register
POST /api/auth/login             — Login → JWT token
GET  /api/auth/me                — Current user info
POST /api/auth/forgot-password   — Send OTP to email
POST /api/auth/verify-otp        — Verify OTP + set new password
POST /api/auth/change-password   — Change password (authenticated)
```

### Tickets
```
POST   /api/tickets/                    — Create ticket (customer)
GET    /api/tickets/?status=&category=&priority=&page=&page_size=
GET    /api/tickets/{id}                — Full detail + activity log
PATCH  /api/tickets/{id}                — Update status/assignee (admin/agent)
PATCH  /api/tickets/{id}/ai             — Override AI classification (admin)
DELETE /api/tickets/{id}                — Delete (admin)
POST   /api/tickets/{id}/comments       — Add comment or internal note
GET    /api/tickets/{id}/comments       — List comments
```

### Users (Admin only)
```
GET    /api/users/?role=&is_active=     — List users with filters
POST   /api/users/                      — Create agent/admin account
GET    /api/users/{id}                  — Get user
PATCH  /api/users/{id}                  — Update role/status/name
DELETE /api/users/{id}                  — Delete user
```

### Dashboard
```
GET /api/dashboard/stats         — Full admin stats
GET /api/dashboard/agent-stats   — Agent's own stats
```

### Health
```
GET /health
```

---

## EC2 Nginx Config (host level)

```nginx
server {
    listen 80;
    server_name yourdomain.duckdns.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/yourdomain.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.duckdns.org/privkey.pem;

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Fixes Applied vs Original Code

| Issue | Fix |
|---|---|
| `asyncio.create_task()` for background AI | Replaced with FastAPI `BackgroundTasks` |
| `datetime.utcnow()` deprecated | `lambda: datetime.now(timezone.utc)` |
| Agent `None` assigned_to access bug | Explicit None guard in `_can_access_ticket` |
| Double DB load after update | Single `_load_ticket` call after commit |
| Status filter not enum-validated | `TicketStatus \| None` query param |
| Unsafe fallback commit after rollback | Wrapped in inner try/except |
| No password validation | `field_validator` — 8 chars, uppercase, digit |
| Empty title/description accepted | `field_validator` with strip + min length |
| Admin self-deactivate allowed | Guard in `PATCH /users/{id}` |
| No startup DB health check | `lifespan` with `SELECT 1` |
| Timing attack on login | Dummy hash always evaluated |
| No OTP brute-force protection | 5-attempt lockout |

# TrackTicket — AI Ticket Management System

Production-grade customer support ticket system with three-role RBAC, a three-stage AI pipeline (classification → agent routing → reply generation) powered by Groq LLaMA 3.3 70B, and full CI/CD deployment to AWS EC2.

**Live:** `https://trackticketai.duckdns.org`

---

## Screenshots & Demo

> _Screenshots and demo video coming here._

---

## System Architecture

```text
Browser
  │
  ▼
Nginx (reverse proxy, SSL termination)
  ├── /api/*  ──►  FastAPI backend  (port 8000)
  │                    │
  │               PostgreSQL 16
  │               Groq LLaMA 3.3 70B (via LangChain)
  │               aiosmtplib (async email)
  │
  └── /*      ──►  Next.js frontend  (port 3000)
                       │
                  Zustand (auth state)
                  TanStack Query (server state)
                  Axios (API client)
```

**Request flow for ticket creation:**

1. Customer submits ticket → FastAPI creates DB record, returns immediately
2. FastAPI `BackgroundTasks` fires the AI pipeline in a separate async DB session (non-blocking)
3. AI pipeline: classify → suggest agent → assign → commit
4. Frontend polls every 2.5 s while `ai_classified = false` (stops at 60 s or on classification)
5. Toast fires exactly once when classification lands or agent is assigned

---

## AI Pipeline

All three stages use **Groq LLaMA 3.3 70B Versatile** via LangChain, each with an independent `PromptTemplate` chain.

### Stage 1 — Classification (`classify_ticket`)

Prompt instructs the model to return strict JSON only. Fields: `category`, `priority`, `suggested_response`, `confidence_note`.

```text
category  : billing | technical | account | general
priority  : low | medium | high | critical
```

Rules embedded in the prompt enforce category-to-priority semantics (e.g. "critical → system down, data loss, security breach, no workaround"). `JsonOutputParser` validates the response; any parse failure or auth error falls back to `GENERAL / MEDIUM` with a neutral suggested response.

### Stage 2 — Agent Routing (`suggest_agent`)

Candidates query: available active agents with remaining capacity (`active_tickets < max_active_tickets`), sorted by ascending load ratio. Their `expertise_tags`, `active_tickets`, `max_active_tickets`, and `current_load_ratio` are serialised as JSON and passed to the model.

The model returns `{ suggested_agent_id, confidence, rationale }`. If `confidence ≥ AI_ASSIGNMENT_CONFIDENCE_THRESHOLD` (default `0.7`), the suggested agent is assigned (`assignment_method = "ai_confident"`). Otherwise falls back to the least-loaded agent (`assignment_method = "load_balance_fallback"`).

### Stage 3 — Reply Generation (`generate_reply`)

Takes ticket title, description, current status, previous AI reply, and the last 8 comments as conversation context. Returns 2–4 plain-text sentences — no markdown, empathetic tone, contextually aware of resolved/open status.

Agents can regenerate the reply at any time (`force=True`), or use it as a draft pre-filled into the comment box.

---

## Tech Stack

| Layer | Choice | Reason |
| --- | --- | --- |
| API | FastAPI + Python 3.11 | async-native, automatic OpenAPI, dependency injection |
| ORM | SQLAlchemy 2 async + Alembic | fully async, typed models, migration history |
| Database | PostgreSQL 16 | JSONB for `expertise_tags`, reliable enum types |
| Auth | JWT (HS256) + PBKDF2-SHA256 | stateless, no bcrypt 72-byte limit |
| AI | LangChain + Groq LLaMA 3.3 70B | fast inference, structured JSON output, free tier |
| Email | aiosmtplib | non-blocking SMTP, no Celery dependency |
| Frontend | Next.js 16 App Router + React 19 + TypeScript | SSR-ready, file-based routing, strict typing |
| State | Zustand (auth) + TanStack Query (server) | minimal auth store, automatic cache/refetch |
| HTTP | Axios | interceptor-based 401 auto-logout, typed responses |
| UI | Tailwind CSS + custom design tokens | consistent `var(--brand)` system, no component library lock-in |
| UX libs | react-toastify, react-loading-skeleton, react-phone-number-input, TipTap, DOMPurify | polished rich-text UX + safe HTML rendering |
| Deployment | Docker Compose + AWS EC2 + Nginx | portable, single-host, no k8s overhead |
| CI/CD | GitHub Actions → EC2 SSH | push-to-deploy, sequential low-memory builds |

---

## Features

### Customer
- Register with email verification (6-digit OTP)
- Create tickets with rich text (bold/italic/lists/headings/quotes/code/images)
- Paste or upload images directly in the editor (up to 5 MB each)
- Real-time AI classification badge (polls until classified, fires one-shot toast)
- See assigned agent, ticket status, and comment thread
- Edit own ticket and own replies until ticket is resolved/closed
- Soft-delete own ticket from customer view (admin still retains full audit visibility)
- Cannot comment on resolved/closed tickets

### Agent
- Dashboard with personal stats (assigned total, open, resolved, critical-open)
- View assigned tickets only; workspace locked until profile is complete (expertise tags + capacity set)
- Update ticket status, add replies/internal notes, and edit own replies with rich text
- AI suggested reply with one-click draft insert or clipboard copy; regenerate on demand
- First-response timestamp recorded automatically

### Admin
- Full ticket access: reassign, override AI category/priority/suggested response, and customer-soft-delete tracking
- User management: create agents, activate/deactivate, toggle availability, delete
- Analytics dashboard: totals by status/category/priority, avg resolution time, agent workload, reassignment rate, avg first-response time
- Cannot deactivate or delete own account

### Rich Text & Soft Delete Behavior

- Ticket descriptions and replies are stored as rich HTML from TipTap
- Rendered content is sanitized with DOMPurify, then shown with original formatting (including pasted images)
- Reply edit tracking is kept (`is_edited`, `updated_at`, `edited_by_id`) and displayed in UI
- Ticket delete is soft delete for customers: hidden from customer lists/details, still visible to admins with deleted metadata and activity history

### URL Design

- Ticket URLs use human-readable slugs: `/customer/tickets/{title-slug}-{uuid}`
- `ticketSlug(ticket)` in `lib/slug.ts` generates the slug from the title; `extractTicketId()` recovers the UUID via regex for API calls
- Attachment filenames are slugified on upload: `{original-stem}-{8-char-uid}.{ext}` (e.g. `my-screenshot-a3f9c12b.png`)

---

## Security

| Concern | Implementation |
| --- | --- |
| Password storage | PBKDF2-SHA256 (Django-compatible, avoids bcrypt 72-byte limit) |
| Timing attack on login | Dummy hash always evaluated even for non-existent email |
| OTP brute-force | 5-attempt lockout; OTP cleared on lockout or expiry |
| OTP expiry | 2-minute window, cleared from DB after use |
| Password strength | 8+ chars, ≥1 uppercase, ≥1 digit — validated in Pydantic schema |
| Role enforcement | `require_role()` dependency on every protected route |
| Agent workspace gate | Profile completeness checked before any ticket/comment access |
| Admin self-harm | Cannot deactivate, change own role, or delete own account |
| CORS | `FRONTEND_ORIGIN` allowlist, credentials mode |
| File uploads | MIME type check + 5 MB limit; slugified filenames prevent path traversal |
| JWT auto-logout | Axios 401 interceptor clears session and redirects to `/login` |

---

## Project Structure

```
.
├── docker-compose.yml          # Full stack: db, backend, frontend, seed (profile)
├── .env.example                # Shared env template
├── .github/workflows/
│   └── deploy.yml              # CI/CD: push to main → SSH deploy to EC2
├── ticket_backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app, lifespan, StaticFiles mount
│   │   ├── config.py           # Pydantic Settings, .env loading
│   │   ├── database.py         # AsyncSession factory
│   │   ├── dependencies.py     # get_current_user, require_role, is_agent_profile_complete
│   │   ├── models/             # SQLAlchemy ORM: User, Ticket, TicketActivity, Comment
│   │   ├── schemas/            # Pydantic I/O schemas with field validators
│   │   ├── routers/            # auth, tickets, users, dashboard, attachments
│   │   └── services/           # ai_service, auth_service, email_service
│   ├── alembic/versions/       # Migration history
│   └── seed.py                 # Demo data seeder
└── ticket_frontend/
    ├── app/                    # Next.js App Router pages by role
    ├── components/             # tickets/, ui/, layout/, auth/, dashboard/
    ├── lib/                    # api.ts (Axios), auth.ts, slug.ts, types.ts
    ├── providers/              # QueryClientProvider, ToastProvider
    └── store/                  # auth-store.ts (Zustand)
```

---

## Local Setup (No Docker)

**Prerequisites:** Python 3.11, Node.js 20+, PostgreSQL 16 running locally.

**1. Environment**

```bash
cp .env.example .env
# fill DATABASE_URL, SECRET_KEY, GROQ_API_KEY, FRONTEND_ORIGIN, NEXT_PUBLIC_API_URL
```

**2. Backend**

```bash
cd ticket_backend
pip install -r requirements.txt
alembic upgrade head
python seed.py          # optional demo data
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Health check: `http://localhost:8000/health`

**3. Frontend**

```bash
cd ticket_frontend
npm install
npm run dev
```

App: `http://localhost:3000`

---

## Docker Setup

```bash
cp .env.example .env
# edit .env

docker compose up --build -d
docker compose --profile seed run --rm seed   # optional demo data
```

Startup order enforced by health checks: `db` healthy → `backend` starts and runs migrations → `frontend` builds and starts.

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose down          # stop
docker compose down -v       # stop + wipe DB volume
```

### Run Backend Unit Test In Docker (Server)

Use this to validate ticket CRUD + soft/permanent delete behavior on the deployed server stack.

```bash
# from project root on server
git pull --ff-only origin main
docker compose build backend
docker compose up -d db backend

# run the single backend test file inside the backend container
docker compose exec backend sh -lc "pip install --no-cache-dir pytest anyio && pytest -vv tests/test_ticket_crud_roles.py"
```

Alternative one-shot command (spawns a temporary backend container):

```bash
docker compose run --rm backend sh -lc "pip install --no-cache-dir pytest anyio && pytest -vv tests/test_ticket_crud_roles.py"
```

Expected result:

```text
1 passed
```

---

## Production Deployment (AWS EC2 + Nginx)

### Infrastructure

- **Server:** AWS EC2 t3.micro (1 GB RAM), Ubuntu 22.04, 20 GB EBS
- **Domain:** DuckDNS subdomain (`trackticketai.duckdns.org`) with 5-minute cron IP update
- **SSL:** Let's Encrypt via Certbot (`--nginx` plugin, auto-renews)
- **Swap:** 4 GB swap file required on t3.micro for Next.js build


### Frontend ↔ Backend Interaction

- `NEXT_PUBLIC_API_URL` is baked into the Next.js image at build time (not runtime)
- All Axios requests go to `https://trackticketai.duckdns.org/api`
- Nginx routes `/api/*` to the FastAPI container on `127.0.0.1:8000`
- FastAPI serves all routes under `/api/` prefix
- Static uploads (`/uploads/*`) served directly by FastAPI's `StaticFiles` mount, proxied through Nginx `/api/`

---

## CI/CD (GitHub Actions)

Trigger: push to `main` or manual `workflow_dispatch`.

**Pipeline steps:**

1. SSH into EC2 (`appleboy/ssh-action`)
2. `git pull --ff-only origin main`
3. Build containers sequentially (`COMPOSE_PARALLEL_LIMIT=1`) — prevents OOM on 1 GB RAM
4. `docker compose run --rm backend alembic upgrade head` — migrations before traffic
5. `docker compose up -d` — rolling restart
6. `sudo systemctl reload nginx`

Secrets required: `EC2_HOST`, `EC2_USERNAME`, `EC2_SSH_KEY`, `EC2_PROJECT_PATH`, `REPO_SSH_URL`.

---

## Environment Variables

| Variable | Used by | Description |
| --- | --- | --- |
| `DATABASE_URL` | Backend | `postgresql+asyncpg://user:pass@host:5432/db` |
| `SECRET_KEY` | Backend | JWT signing secret (min 32 chars) |
| `GROQ_API_KEY` | Backend | Groq API key for LLaMA inference |
| `FRONTEND_ORIGIN` | Backend | CORS allowlist, e.g. `https://trackticketai.duckdns.org` |
| `SMTP_HOST/PORT/USER/PASSWORD` | Backend | Async email (OTP + notifications) |
| `AI_ASSIGNMENT_CONFIDENCE_THRESHOLD` | Backend | Float 0–1, default `0.7` |
| `NEXT_PUBLIC_API_URL` | Frontend (build-time) | API base URL, e.g. `https://trackticketai.duckdns.org/api` |
| `POSTGRES_USER/PASSWORD/DB` | Docker Compose | PostgreSQL container credentials |

---

## Demo Credentials

Seeded by `seed.py`:

| Email | Password | Role |
| --- | --- | --- |
| `admin@trackticket.dev` | `Password123!` | Admin |
| `agent1@trackticket.dev` | `Password123!` | Agent |
| `agent2@trackticket.dev` | `Password123!` | Agent |
| `customer1@trackticket.dev` | `Password123!` | Customer |
| `customer2@trackticket.dev` | `Password123!` | Customer |

---

## API Reference

```
# Auth
POST  /api/auth/register            self-registration (customer/agent)
POST  /api/auth/login               returns JWT + user
GET   /api/auth/me                  current user
PATCH /api/auth/me/profile          update name, phone, agent settings
POST  /api/auth/forgot-password     send reset OTP
POST  /api/auth/verify-reset-otp    verify OTP → reset token
POST  /api/auth/reset-password      new password via reset token
POST  /api/auth/change-password     authenticated password change
POST  /api/auth/verify-email-otp    verify email after registration
POST  /api/auth/resend-email-otp    resend email verification OTP

# Tickets
POST   /api/tickets/                           create (customer)
GET    /api/tickets/?status=&category=&priority=&page=&page_size=
GET    /api/tickets/{id}                       detail + activity log
PATCH  /api/tickets/{id}                       update status/assignee (admin/agent)
PATCH  /api/tickets/{id}/ai                    override AI fields (admin)
POST   /api/tickets/{id}/ai-reply              generate/regenerate AI reply
DELETE /api/tickets/{id}                       delete (admin)
POST   /api/tickets/{id}/comments              add reply or internal note
GET    /api/tickets/{id}/comments              list comments (internal filtered for customers)

# Users (admin only)
GET    /api/users/                  list with role + active filters
POST   /api/users/                  create agent account
PATCH  /api/users/{id}              update role/status/availability
DELETE /api/users/{id}              delete user

# Dashboard
GET /api/dashboard/stats            full admin analytics
GET /api/dashboard/agent-stats      agent's personal stats

# Attachments
POST /api/attachments/upload        upload image (returns /uploads/{slug}-{uid}.ext)

# Health
GET /health
```

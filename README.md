# TrackTicket AI Ticket Management System

Production-style AI ticket management system with role-based access:
- Customer: create and track tickets
- Agent: work assigned tickets and add replies/internal notes
- Admin: manage users, reassign tickets, override AI, and view dashboard stats

Stack:
- Backend: FastAPI, SQLAlchemy async, PostgreSQL, Alembic, JWT, LangChain + Groq
- Frontend: Next.js 16, TypeScript, Tailwind, Zustand, TanStack Query, Axios
- Deployment: Docker Compose (optional for local), EC2 + Nginx

Important:
- Use only the root `docker-compose.yml` for containerized runs.
- Do not use `ticket_backend/docker-compose.yml` for this project workflow.

## Project Structure

- `ticket_backend` FastAPI API server
- `ticket_frontend` Next.js web app
- `.env.example` shared env template used by both services
- `docker-compose.yml` full local Docker stack

## 1) Local Setup (No Docker, Two Separate Servers)

Prerequisites:
- Python 3.11
- Node.js 20+
- PostgreSQL 16+ running locally
- Root virtual env exists at `.venv` (you already have it)

### Step A: Create root `.env`

Copy `.env.example` to `.env` in the root folder and fill values.

Required minimum for local run:
- `DATABASE_URL=postgresql+asyncpg://<user>:<pass>@localhost:5432/<db_name>`
- `SECRET_KEY=<strong-random-secret>`
- `GROQ_API_KEY=<your-groq-key>`
- `FRONTEND_ORIGIN=http://localhost:3000`
- `NEXT_PUBLIC_API_URL=http://localhost:8000/api`

Notes:
- Backend reads env from root `.env` via `../.env` fallback in `ticket_backend/app/config.py`.
- Frontend reads `NEXT_PUBLIC_API_URL` when running/building.

### Step B: Run backend (Terminal 1)

```powershell
Set-Location "D:\George's Area\Ticket Management GTR"
.\.venv\Scripts\Activate.ps1
Set-Location .\ticket_backend
pip install -r requirements.txt
alembic upgrade head
python seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend health check:
- `http://localhost:8000/health`

### Step C: Run frontend (Terminal 2)

```powershell
Set-Location "D:\George's Area\Ticket Management GTR\ticket_frontend"
npm install
npm run dev
```

Frontend URL:
- `http://localhost:3000`

## 2) Docker Setup (After local test)

From root:

```powershell
Set-Location "D:\George's Area\Ticket Management GTR"
Copy-Item .env.example .env
# edit .env values first

docker compose up --build -d
```

What root compose now does automatically:
- waits for PostgreSQL health before backend startup
- runs `alembic upgrade head` before starting API
- builds frontend with `NEXT_PUBLIC_API_URL` from root `.env`

Run seed inside Docker:

```powershell
docker compose --profile seed run --rm seed
```

Or run app and seed together in one flow:

```powershell
docker compose --profile seed up --build -d
docker compose --profile seed run --rm seed
```

Check running services:

```powershell
docker compose ps
```

Logs:

```powershell
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

Stop:

```powershell
docker compose down
```

Reset DB volume:

```powershell
docker compose down -v
```

## Environment Variables Ownership

Shared root `.env`:
- Used by backend container via `env_file`
- Used by docker compose variable substitution (build args and service env values)
- Used by backend local run (through settings env_file fallback)

Backend-only runtime vars:
- `DATABASE_URL`
- `SECRET_KEY`
- `GROQ_API_KEY`
- `FRONTEND_ORIGIN`

Frontend runtime/build vars:
- `NEXT_PUBLIC_API_URL`

Postgres service vars (Docker):
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

## Quick Troubleshooting

- CORS error: ensure `FRONTEND_ORIGIN` includes scheme, e.g. `http://localhost:3000`
- Auth redirect loop: clear browser storage and cookies for localhost
- DB migration issues: run `alembic upgrade head` from `ticket_backend`
- AI classification missing: verify `GROQ_API_KEY` is valid

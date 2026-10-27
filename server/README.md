# Kiloric Server

FastAPI backend for Kiloric – handles all auth and user data. Runs on Ubuntu (Hetzner, 2 vCPU).

## Stack
- FastAPI + Uvicorn
- PostgreSQL via SQLAlchemy 2.0 (SQLite works for local dev)
- JWT auth (python-jose), bcrypt passwords (passlib)
- Alembic migrations

## Quick Start (local dev with SQLite)

```bash
cd server
uv sync
cp .env.example .env  # edit as needed
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

## Production (Hetzner Ubuntu)

```bash
# 1. Install postgres
sudo apt install postgresql postgresql-contrib -y
sudo -u postgres createdb kiloric
sudo -u postgres createuser kiloric --pwprompt

# 2. Clone / copy this folder, then:
uv sync --no-dev
cp .env.example .env   # set DATABASE_URL, JWT_SECRET, etc.
uv run alembic upgrade head

# 3. Run via systemd (see deploy/kiloric-server.service)
sudo cp deploy/kiloric-server.service /etc/systemd/system/
sudo systemctl enable --now kiloric-server
```

## API base: `/v1/`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/register` | Create account |
| POST | `/v1/auth/login` | Get JWT |
| POST | `/v1/auth/logout` | Invalidate token |
| POST | `/v1/auth/reset-password-request` | Email reset link |
| POST | `/v1/auth/reset-password-confirm` | Set new password |
| GET | `/v1/me` | Current user + profile |
| PATCH | `/v1/me` | Update profile |
| DELETE | `/v1/me` | Delete account + all data |
| CRUD | `/v1/meals`, `/v1/water`, `/v1/food-entries`, `/v1/tasks`, `/v1/workouts`, `/v1/workout-sets`, `/v1/weight-logs`, `/v1/saved-meals`, `/v1/meal-plan-entries`, `/v1/prep-sessions`, `/v1/grocery-items` | Full CRUD |

## Food contribution review

Contributors submit photos through `POST /v1/files` and manual or photo-backed
entries through `POST /v1/food-contributions`. Review submissions are not
available through a contributor list endpoint. The private `/review` portal
uses a bcrypt password hash and the case-sensitive username `Admin`; it shows
each user's macro suggestions separately from the admin-reviewed values and
allows an admin to save reviewed values. Set a strong `JWT_SECRET` before
deploying because it signs the short-lived review session cookie.

Food catalog lookups in the app use the supplied Oracle ORDS `code` and
`friendly-food` endpoints. ORDS write URLs for food logs were not included in
the integration details; the current food log writer therefore remains on the
existing persistence transport until those ORDS resource paths and payload
contracts are available.

# iPermit Backend

FastAPI service — see [../docs/design.md](../docs/design.md) for architecture and
[../.claude/skills/backend-standards/SKILL.md](../.claude/skills/backend-standards/SKILL.md)
for coding conventions.

## Run locally (Docker — recommended)

```bash
cp backend/.env.example backend/.env   # edit SECRET_KEY before real use
docker compose up --build
```

- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Health: http://localhost:8000/health · Readiness (DB check): http://localhost:8000/ready

## Migrations

Run inside the backend container (or locally with `DATABASE_URL` pointed at the
compose Postgres on `localhost:5432`):

```bash
docker compose exec backend alembic revision --autogenerate -m "message"
docker compose exec backend alembic upgrade head
```

## Tests & linting (run locally with a venv, or inside the container)

```bash
pip install -r requirements-dev.txt
ruff check app
black --check app
pytest
```

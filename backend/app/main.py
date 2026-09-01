from fastapi import FastAPI, Response, status
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text

from app.api.routers import auth
from app.core.config import settings
from app.core.database import SessionLocal

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title=settings.app_name)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth.router)


@app.get("/health")
def health() -> dict:
    """Process is up. See backend-standards skill: needed for Docker healthchecks."""
    return {"status": "ok"}


@app.get("/ready")
def ready(response: Response) -> dict:
    """Process is up AND the database is reachable."""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ready"}
    except Exception:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not ready"}

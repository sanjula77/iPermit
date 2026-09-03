from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(prefix="/face", tags=["face"])


@router.get("/status")
def get_face_status() -> dict:
    """REQ-5 AC4: liveness/anti-spoofing must be an explicit, disclosed
    fact when disabled, not a silently skipped step. Phase 5's police
    verification UI should surface this to officers rather than implying
    a face match alone proves a live person is present."""
    return {
        "liveness_check_enabled": settings.liveness_check_enabled,
        "note": (
            "Liveness/anti-spoofing is not implemented. A face match confirms "
            "embedding similarity only -- it does not verify the presented "
            "face is a live person, not a photo or screen."
            if not settings.liveness_check_enabled
            else "Liveness check is active."
        ),
    }

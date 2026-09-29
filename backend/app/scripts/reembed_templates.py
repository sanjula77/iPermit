"""Re-compute every stored face template with the current pipeline.

Needed whenever preprocessing changes (e.g. face_clahe_enabled): a template
built one way compared against a probe processed another way scores lower
for the same person. Each driver's template is rebuilt from the four face
photos on their most recent APPROVED application, exactly as approval does
(build_enrollment_embedding), then saved and indexed with store_template.

Usage (inside the backend container, after changing the setting):
    python -m app.scripts.reembed_templates
"""

import uuid

from app.core import face_template_store
from app.core.database import SessionLocal
from app.core.face_engine import FaceEngineError
from app.models.application import ApplicationStatus
from app.repositories import application_repository
from app.services.face_service import (
    FaceEnrollmentError,
    build_enrollment_embedding,
    store_template,
)


def main() -> None:
    driver_ids = sorted(
        {driver_id for _, driver_id, _ in face_template_store.list_all_templates()}
    )
    rebuilt, skipped = 0, 0
    db = SessionLocal()
    try:
        for driver_id in driver_ids:
            applications = application_repository.list_by_driver(
                db, uuid.UUID(driver_id)
            )
            approved = next(
                (a for a in applications if a.status == ApplicationStatus.APPROVED),
                None,
            )
            if approved is None:
                print(f"skip {driver_id}: no approved application")
                skipped += 1
                continue
            try:
                store_template(driver_id, build_enrollment_embedding(approved))
            except (FaceEnrollmentError, FaceEngineError) as exc:
                # Keep the old template rather than leaving the driver unmatchable.
                print(f"skip {driver_id}: {exc}")
                skipped += 1
                continue
            rebuilt += 1
    finally:
        db.close()
    print(f"Re-embedded {rebuilt} template(s), skipped {skipped}.")


if __name__ == "__main__":
    main()

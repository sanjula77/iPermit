"""Creates DEMO drivers with back-dated violation histories so the behaviour
insights screens have something to show. The demo drivers are separate accounts
(@ipermit.demo) -- real accounts are never touched. The data is invented, only
for demonstrations; do not use it as evidence of anything.

    docker compose exec backend python -m scripts.seed_behaviour_demo
    docker compose exec backend python -m scripts.seed_behaviour_demo --remove

Demo password for every account: demo-pass-123
"""

import sys
from datetime import datetime, timedelta

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.application import Application, ApplicationStatus
from app.models.fine import VIOLATION_FINE_AMOUNT, Fine, FineStatus
from app.models.license import License, LicenseCategory, LicenseStatus, VehicleCategory
from app.models.user import User, UserRole
from app.models.violation import VIOLATION_POINTS, Violation, ViolationType
from app.services.violation_service import SUSPENSION_POINTS_THRESHOLD

POINTS_VALIDITY_DAYS = 365
DEMO_PASSWORD = "demo-pass-123"
DEMO_DOMAIN = "@ipermit.demo"

# (name, nic, licence age in days, [(days ago, type, fine status)])
S, W, R, D = (
    ViolationType.SPEEDING,
    ViolationType.WHITE_LINE,
    ViolationType.RED_LIGHT,
    ViolationType.DRUNK_DRIVING,
)
UNPAID, PAID = FineStatus.UNPAID, FineStatus.PAID
# What each demo driver may drive, so the licence card's back has something to show.
V = VehicleCategory
DEMO_CATEGORIES = {
    "clean": [V.A1, V.A, V.B, V.G1],
    "improving": [V.B],
    "worsening": [V.A, V.B],
    "high": [V.B, V.C1],
    "suspended": [V.B, V.D1],
}
DEMO_DRIVERS = [
    ("clean", "DEMO0001", 800, []),
    ("improving", "DEMO0002", 700, [(400, S, PAID), (150, W, PAID), (120, S, PAID)]),
    ("worsening", "DEMO0003", 700, [(300, W, PAID), (100, W, PAID), (20, S, UNPAID)]),
    ("high", "DEMO0004", 700, [(55, R, UNPAID), (30, S, UNPAID), (10, W, UNPAID)]),
    ("suspended", "DEMO0005", 700, [(200, D, UNPAID), (150, R, UNPAID)]),
]


def _remove(db) -> None:
    users = list(db.scalars(select(User).where(User.email.like(f"%{DEMO_DOMAIN}"))))
    for user in users:
        violations = list(
            db.scalars(select(Violation).where(Violation.driver_id == user.id))
        )
        for violation in violations:
            for fine in db.scalars(
                select(Fine).where(Fine.violation_id == violation.id)
            ):
                db.delete(fine)
            db.delete(violation)
        for license_ in db.scalars(select(License).where(License.driver_id == user.id)):
            db.delete(license_)
        for application in db.scalars(
            select(Application).where(Application.driver_id == user.id)
        ):
            db.delete(application)
        db.delete(user)
    db.commit()
    print(f"Removed {len(users)} demo driver(s).")


def _backfill_categories(db, user, categories) -> None:
    """Gives an already-seeded demo licence its categories (added after the
    first version of this script), so re-running it brings old demo data up to date."""
    license_ = db.scalar(select(License).where(License.driver_id == user.id))
    if license_ is None or license_.categories:
        return
    license_.categories = [
        LicenseCategory(
            category=category,
            issued_at=license_.issued_at,
            expiry_at=license_.expiry_at,
        )
        for category in categories
    ]
    db.commit()


def _seed(db) -> None:
    officer = db.scalar(select(User).where(User.role == UserRole.POLICE))
    if officer is None:
        sys.exit("No police account exists to attribute the violations to.")
    now = datetime.utcnow()

    for name, nic, licence_age, history in DEMO_DRIVERS:
        email = f"demo.{name}{DEMO_DOMAIN}"
        existing = db.scalar(select(User).where(User.email == email))
        if existing:
            _backfill_categories(db, existing, DEMO_CATEGORIES[name])
            print(f"{email}: already exists, skipped")
            continue
        user = User(
            email=email,
            nic=nic,
            password_hash=hash_password(DEMO_PASSWORD),
            role=UserRole.DRIVER,
        )
        db.add(user)
        db.flush()
        issued = now - timedelta(days=licence_age)
        application = Application(
            driver_id=user.id,
            status=ApplicationStatus.APPROVED,
            created_at=issued,
            updated_at=issued,
        )
        db.add(application)
        db.flush()
        points = 0
        for days_ago, vtype, fine_status in history:
            when = now - timedelta(days=days_ago)
            pts = VIOLATION_POINTS[vtype]
            violation = Violation(
                driver_id=user.id,
                officer_id=officer.id,
                type=vtype,
                points_deducted=pts,
                confirmed_at=when,
            )
            db.add(violation)
            db.flush()
            db.add(
                Fine(
                    violation_id=violation.id,
                    amount=VIOLATION_FINE_AMOUNT[vtype],
                    status=fine_status,
                    created_at=when,
                    paid_at=when if fine_status == PAID else None,
                )
            )
            # Points count for a rolling year; paying a fine does not change them.
            if days_ago < POINTS_VALIDITY_DAYS:
                points += pts
        db.add(
            License(
                driver_id=user.id,
                application_id=application.id,
                license_no=f"DEMO-{nic}",
                qr_token=f"demo-qr-{nic}",
                status=(
                    LicenseStatus.SUSPENDED
                    if points >= SUSPENSION_POINTS_THRESHOLD
                    else LicenseStatus.ACTIVE
                ),
                points=min(points, SUSPENSION_POINTS_THRESHOLD),
                issued_at=issued,
                expiry_at=issued + timedelta(days=365 * 5),
                categories=[
                    LicenseCategory(
                        category=category,
                        issued_at=issued,
                        expiry_at=issued + timedelta(days=365 * 5),
                    )
                    for category in DEMO_CATEGORIES[name]
                ],
            )
        )
        print(f"{email}: created ({len(history)} violations, {points} points)")
    admin_email = f"admin{DEMO_DOMAIN}"
    if not db.scalar(select(User).where(User.email == admin_email)):
        db.add(
            User(
                email=admin_email,
                nic="DEMOADMIN",
                password_hash=hash_password(DEMO_PASSWORD),
                role=UserRole.ADMIN,
            )
        )
        print(f"{admin_email}: created")
    db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        _remove(db) if "--remove" in sys.argv else _seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()

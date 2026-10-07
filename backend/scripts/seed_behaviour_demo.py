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
from app.models.license import License, LicenseStatus
from app.models.user import User, UserRole
from app.models.violation import VIOLATION_POINTS, Violation, ViolationType
from app.services.violation_service import SUSPENSION_POINTS_THRESHOLD

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
DEMO_DRIVERS = [
    ("clean", "DEMO0001", 800, []),
    ("improving", "DEMO0002", 700, [(400, S, PAID), (150, W, PAID), (120, S, PAID)]),
    ("worsening", "DEMO0003", 700, [(300, W, PAID), (100, W, PAID), (20, S, UNPAID)]),
    ("high", "DEMO0004", 700, [(55, R, UNPAID), (30, W, UNPAID)]),
    ("suspended", "DEMO0005", 700, [(200, D, UNPAID)]),
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


def _seed(db) -> None:
    officer = db.scalar(select(User).where(User.role == UserRole.POLICE))
    if officer is None:
        sys.exit("No police account exists to attribute the violations to.")
    now = datetime.utcnow()

    for name, nic, licence_age, history in DEMO_DRIVERS:
        email = f"demo.{name}{DEMO_DOMAIN}"
        if db.scalar(select(User).where(User.email == email)):
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
            # Paying a fine restores its points, as in the live system.
            if fine_status == UNPAID:
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
                points=points,
                issued_at=issued,
                expiry_at=issued + timedelta(days=365 * 5),
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

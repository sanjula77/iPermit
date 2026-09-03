"""Bootstrap the first ADMIN or POLICE account.

REQ-1 AC4: only DRIVER accounts self-register; POLICE/ADMIN are provisioned
separately. This is that separate path -- a CLI, not a public endpoint, so
account creation for privileged roles is never reachable over HTTP.

Usage (inside the backend container):
    python -m app.scripts.create_admin --email admin@ipermit.lk \\
        --nic 000000000V --password <pw> --role ADMIN
"""

import argparse

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import UserRole
from app.repositories import user_repository


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True)
    parser.add_argument("--nic", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--role", choices=["ADMIN", "POLICE"], default="ADMIN")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if user_repository.get_by_email(db, args.email):
            print(f"A user with email {args.email} already exists.")
            return
        if user_repository.get_by_nic(db, args.nic):
            print(f"A user with NIC {args.nic} already exists.")
            return

        user = user_repository.create(
            db,
            email=args.email,
            nic=args.nic,
            password_hash=hash_password(args.password),
            role=UserRole(args.role),
        )
        print(f"Created {user.role.value} user {user.email} ({user.id})")
    finally:
        db.close()


if __name__ == "__main__":
    main()

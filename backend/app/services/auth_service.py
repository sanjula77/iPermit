from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.repositories import user_repository


class AuthError(Exception):
    pass


def register_driver(db: Session, *, email: str, nic: str, password: str) -> User:
    """Self-registration always creates a DRIVER. POLICE/ADMIN are provisioned
    separately by an admin (REQ-1) — role is never taken from client input here."""
    if user_repository.get_by_email(db, email):
        raise AuthError("Email already registered")
    if user_repository.get_by_nic(db, nic):
        raise AuthError("NIC already registered")

    return user_repository.create(
        db,
        email=email,
        nic=nic,
        password_hash=hash_password(password),
        role=UserRole.DRIVER,
    )


def authenticate(db: Session, *, identifier: str, password: str) -> str:
    """Returns a JWT access token, or raises AuthError. `identifier` may be an
    email or NIC (REQ-1). Error message is intentionally generic — never reveal
    which of identifier/password was wrong."""
    user = user_repository.get_by_email(db, identifier) or user_repository.get_by_nic(
        db, identifier
    )
    if not user or not verify_password(password, user.password_hash):
        raise AuthError("Invalid credentials")

    return create_access_token(subject=str(user.id), role=user.role.value)

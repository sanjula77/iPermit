from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole


def get_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def get_by_nic(db: Session, nic: str) -> User | None:
    return db.scalar(select(User).where(User.nic == nic))


def get_by_id(db: Session, user_id) -> User | None:
    return db.get(User, user_id)


def create(db: Session, *, email: str, nic: str, password_hash: str, role) -> User:
    user = User(email=email, nic=nic, password_hash=password_hash, role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_by_roles(db: Session, roles: list[UserRole]) -> list[User]:
    stmt = select(User).where(User.role.in_(roles)).order_by(User.created_at.desc())
    return list(db.scalars(stmt))


def delete(db: Session, user: User) -> None:
    """Removes the user without committing -- the caller controls the
    transaction (see admin_user_service.delete_user)."""
    db.delete(user)

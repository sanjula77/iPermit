from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


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

from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user import User


def has_users(db: Session) -> bool:
    count = db.query(func.count(User.id)).scalar()
    return bool(count and int(count) > 0)


def get_user_by_email(email: str, db: Session) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def create_user(
    *,
    email: str,
    hashed_password: str,
    role: str,
    db: Session,
    name: str | None = None,
    profile_image_url: str | None = None,
) -> User:
    _ = (name, profile_image_url)
    user = User(email=email, hashed_password=hashed_password, role=role, is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

from typing import Optional

from sqlalchemy.orm import Session


def apply_default_group_assignment(default_group_id: Optional[str], user_id: int, db: Session) -> None:
    _ = (default_group_id, user_id, db)
    return None

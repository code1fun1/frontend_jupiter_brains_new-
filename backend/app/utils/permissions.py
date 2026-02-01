from typing import Any, List, Optional

from sqlalchemy.orm import Session


def get_permissions(user_id: int, configured_permissions: Optional[List[Any]], db: Session) -> List[Any]:
    _ = (user_id, configured_permissions, db)
    return []

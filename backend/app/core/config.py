import os
from dataclasses import dataclass
from typing import Any, List, Optional


def _get_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


def _get_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw.strip())
    except ValueError:
        return default


@dataclass
class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://jupiter:jupiter123@localhost:5433/jupiter_chat",
    )

    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = _get_int("ACCESS_TOKEN_EXPIRE_MINUTES", 60)

    ENABLE_SIGNUP: bool = _get_bool("ENABLE_SIGNUP", True)
    DEFAULT_USER_ROLE: str = os.getenv("DEFAULT_USER_ROLE", "user")

    AUTH_COOKIE_SAMESITE: str = os.getenv("AUTH_COOKIE_SAMESITE", "lax")
    AUTH_COOKIE_SECURE: bool = _get_bool("AUTH_COOKIE_SECURE", False)

    WEBHOOK_URL: str = os.getenv("WEBHOOK_URL", "")
    WEBUI_NAME: str = os.getenv("WEBUI_NAME", "Jupiter Chat")

    WEBUI_AUTH: bool = _get_bool("WEBUI_AUTH", False)
    ENABLE_LOGIN_FORM: bool = _get_bool("ENABLE_LOGIN_FORM", True)
    ENABLE_INITIAL_ADMIN_SIGNUP: bool = _get_bool("ENABLE_INITIAL_ADMIN_SIGNUP", True)

    DEFAULT_GROUP_ID: Optional[str] = os.getenv("DEFAULT_GROUP_ID")
    USER_PERMISSIONS: Optional[List[Any]] = None

    CORS_ORIGINS: List[str] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        raw_origins = os.getenv("CORS_ORIGINS", "")
        if raw_origins.strip():
            self.CORS_ORIGINS = [o.strip() for o in raw_origins.split(",") if o.strip()]
        else:
            self.CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]


settings = Settings()

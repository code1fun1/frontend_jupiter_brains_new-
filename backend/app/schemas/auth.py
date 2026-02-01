from typing import Any, List, Optional

from pydantic import BaseModel, EmailStr


class SignupForm(BaseModel):
    email: EmailStr
    password: str


class LoginForm(BaseModel):
    email: EmailStr
    password: str


class SessionUserResponse(BaseModel):
    token: str
    token_type: str
    expires_at: int
    id: int
    email: str
    role: str
    permissions: List[Any] = []

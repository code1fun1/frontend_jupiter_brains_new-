import time
import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, get_password_hash, validate_password, verify_password
from app.crud.user import create_user, get_user_by_email, has_users
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginForm, SessionUserResponse, SignupForm
from app.utils.constants import ERROR_MESSAGES
from app.utils.email import validate_email_format

router = APIRouter()


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
) -> User:
    token = credentials.credentials if credentials else ""
    if not token:
        token = request.cookies.get("token", "")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@router.get("/health")
def auth_health_check():
    return {"status": "Auth routes are running"}


@router.post("/signup", response_model=SessionUserResponse)
def signup(form_data: SignupForm, response: Response, db: Session = Depends(get_db)):
    has_any_user = has_users(db=db)

    if not settings.ENABLE_SIGNUP:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_MESSAGES.ACCESS_PROHIBITED)

    email = form_data.email.lower()
    if not validate_email_format(email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ERROR_MESSAGES.INVALID_EMAIL_FORMAT)

    if get_user_by_email(email=email, db=db):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ERROR_MESSAGES.EMAIL_TAKEN)

    try:
        validate_password(form_data.password)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    try:
        hashed_password = get_password_hash(form_data.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    role = "admin" if not has_any_user else settings.DEFAULT_USER_ROLE

    user = create_user(email=email, hashed_password=hashed_password, role=role, db=db)
    if not user:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=ERROR_MESSAGES.CREATE_USER_ERROR)

    expires_delta = datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expires_at = int(time.time()) + int(expires_delta.total_seconds())
    token = create_access_token(data={"id": str(user.id)}, expires_delta=expires_delta)

    response.set_cookie(
        key="token",
        value=token,
        expires=datetime.datetime.fromtimestamp(expires_at, datetime.timezone.utc),
        httponly=True,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        secure=settings.AUTH_COOKIE_SECURE,
    )

    return {
        "token": token,
        "token_type": "Bearer",
        "expires_at": expires_at,
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "permissions": [],
    }


@router.post("/login", response_model=SessionUserResponse)
def login(form_data: LoginForm, response: Response, db: Session = Depends(get_db)):
    email = form_data.email.lower()
    user = get_user_by_email(email=email, db=db)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=ERROR_MESSAGES.INVALID_CREDENTIALS)

    expires_delta = datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expires_at = int(time.time()) + int(expires_delta.total_seconds())
    token = create_access_token(data={"id": str(user.id)}, expires_delta=expires_delta)

    response.set_cookie(
        key="token",
        value=token,
        expires=datetime.datetime.fromtimestamp(expires_at, datetime.timezone.utc),
        httponly=True,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        secure=settings.AUTH_COOKIE_SECURE,
    )

    return {
        "token": token,
        "token_type": "Bearer",
        "expires_at": expires_at,
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "permissions": [],
    }


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "role": current_user.role}

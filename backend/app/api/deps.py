from typing import Generator, Optional
from fastapi import Cookie, Depends, HTTPException, Request, status
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.database import SessionLocal
from app.db.models import User
from app.schemas.user import UserResponse

def get_db() -> Generator[Session, None, None]:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def _extract_token(request: Request, cookie_token: Optional[str]) -> Optional[str]:
    """
    Try to get the JWT from (in order of priority):
    1. Authorization: Bearer <token>  header  (deployed Vercel → Render)
    2. access_token HTTP-only cookie           (same-site / local dev)
    """
    # 1. Authorization header (works cross-origin without cookie restrictions)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[len("Bearer "):]
    # 2. HTTP-only cookie (local dev + same-origin)
    return cookie_token

def get_current_user(
    request: Request,
    access_token: str = Cookie(default=None),
    db: Session = Depends(get_db),
) -> UserResponse:
    token = _extract_token(request, access_token)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated — please log in",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth credentials")
    except (JWTError, ValidationError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth credentials")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return UserResponse.model_validate(user)

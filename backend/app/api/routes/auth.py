from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.db.models import User
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.core.security import get_password_hash, verify_password, create_access_token
from app.api.deps import get_db, get_current_user
from app.core.config import settings

router = APIRouter()

# Cookie settings differ between local dev (HTTP) and production (HTTPS cross-origin)
is_production = settings.ENVIRONMENT == "production"
COOKIE_SECURE   = is_production        # secure=True requires HTTPS
COOKIE_SAMESITE = "none" if is_production else "lax"  # none = cross-site, lax = same-site

@router.post("/register")
def register(user_in: UserCreate, response: Response, db: Session = Depends(get_db)):
    """Register a new user and set httponly secure cookie."""
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists in the system.",
        )
    user = User(
        email=user_in.email,
        name=user_in.name,
        password_hash=get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(subject=user.id)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=7 * 24 * 60 * 60
    )
    return {"user": UserResponse.model_validate(user)}

@router.post("/login")
def login(login_data: UserLogin, response: Response, db: Session = Depends(get_db)):
    """Authenticate and issue httponly cookie."""
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid phone or password")
        
    access_token = create_access_token(subject=user.id)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=7 * 24 * 60 * 60
    )
    return {"user": UserResponse.model_validate(user)}

@router.post("/logout")
def logout(response: Response):
    """Clear httponly cookie to logout."""
    response.delete_cookie("access_token")
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
def read_user_me(current_user: UserResponse = Depends(get_current_user)):
    """Get current user data via cookie."""
    return current_user

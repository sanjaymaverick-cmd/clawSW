from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import Permission, User
from ..schemas import LoginRequest, MeResponse, PermissionOut, TokenResponse
from ..security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(
        select(User).where(User.email == body.email)
    ).scalar_one_or_none()
    if (
        user is None
        or not user.active
        or not verify_password(body.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return TokenResponse(access_token=create_access_token(user.id, user.role.name))


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    grants = db.execute(
        select(Permission).where(Permission.role_id == user.role_id)
    ).scalars()
    return MeResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.name,
        active=user.active,
        created_at=user.created_at,
        permissions=[PermissionOut(resource=p.resource, action=p.action) for p in grants],
    )

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import ratelimit
from ..db import get_db
from ..deps import get_current_user
from ..models import Permission, User
from ..schemas import LoginRequest, MeResponse, PermissionOut, TokenResponse
from ..security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = ratelimit.client_ip(request)
    # Rate-limit before touching the password: a locked (email, IP) pair is
    # refused outright so the lockout can't be probed one guess at a time.
    until = ratelimit.locked_until(db, body.email, ip)
    if until is not None:
        retry_after = max(1, int((until - datetime.now(timezone.utc)).total_seconds()))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
            headers={"Retry-After": str(retry_after)},
        )

    user = db.execute(
        select(User).where(User.email == body.email)
    ).scalar_one_or_none()
    if (
        user is None
        or not user.active
        or not verify_password(body.password, user.password_hash)
    ):
        ratelimit.record_failure(db, body.email, ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    ratelimit.clear(db, body.email, ip)
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

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_permission
from ..models import Role, User
from ..schemas import UserCreate, UserOut, UserUpdate
from ..security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


def _to_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.name,
        active=user.active,
        created_at=user.created_at,
    )


def _get_role(db: Session, name: str) -> Role:
    role = db.execute(select(Role).where(Role.name == name)).scalar_one_or_none()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown role '{name}'",
        )
    return role


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("admin", "read")),
):
    users = db.execute(select(User).order_by(User.created_at)).scalars()
    return [_to_out(u) for u in users]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("admin", "write")),
):
    if db.execute(select(User.id).where(User.email == body.email)).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with that email already exists",
        )
    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role_id=_get_role(db, body.role).id,
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _to_out(user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("admin", "write")),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if body.active is False and user.id == actor.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )
    if body.name is not None:
        user.name = body.name
    if body.password is not None:
        user.password_hash = hash_password(body.password)
    if body.role is not None:
        user.role_id = _get_role(db, body.role).id
    if body.active is not None:
        user.active = body.active
    db.commit()
    db.refresh(user)
    return _to_out(user)

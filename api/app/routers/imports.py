"""Import container tracking — Wave D."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_permission
from ..models import ImportContainer, User
from ..schemas import ImportContainerCreate, ImportContainerOut

router = APIRouter(prefix="/imports", tags=["imports"])
read = require_permission("imports", "read")
write = require_permission("imports", "write")


@router.get("/containers", response_model=list[ImportContainerOut])
def list_containers(
    db: Session = Depends(get_db),
    _: User = Depends(read),
):
    return list(
        db.execute(select(ImportContainer).order_by(ImportContainer.created_at.desc()))
        .scalars()
    )


@router.post(
    "/containers",
    response_model=ImportContainerOut,
    status_code=status.HTTP_201_CREATED,
)
def create_container(
    body: ImportContainerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(write),
):
    existing = db.execute(
        select(ImportContainer).where(ImportContainer.code == body.code)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Container code exists")
    row = ImportContainer(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/containers/{container_id}", response_model=ImportContainerOut)
def update_container(
    container_id: uuid.UUID,
    body: ImportContainerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(write),
):
    row = db.get(ImportContainer, container_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Container not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        if k == "code":
            continue
        setattr(row, k, v)
    # allow full replace of fields except code
    for k, v in body.model_dump().items():
        if k != "code":
            setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row

"""Operational turnkey projects — Wave D."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_permission
from ..models import Project, ProjectContainer, User
from ..schemas import ProjectCreate, ProjectOut

router = APIRouter(prefix="/projects", tags=["projects"])
read = require_permission("projects", "read")
write = require_permission("projects", "write")


@router.get("", response_model=list[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    _: User = Depends(read),
):
    return list(db.execute(select(Project).order_by(Project.created_at.desc())).scalars())


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    body: ProjectCreate,
    db: Session = Depends(get_db),
    _: User = Depends(write),
):
    if db.execute(select(Project).where(Project.code == body.code)).scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Project code exists")
    row = Project(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: uuid.UUID,
    body: ProjectCreate,
    db: Session = Depends(get_db),
    _: User = Depends(write),
):
    row = db.get(Project, project_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    for k, v in body.model_dump().items():
        if k != "code":
            setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.post("/{project_id}/containers/{container_id}", status_code=status.HTTP_201_CREATED)
def link_container(
    project_id: uuid.UUID,
    container_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(write),
):
    if not db.get(Project, project_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    link = ProjectContainer(project_id=project_id, container_id=container_id)
    db.add(link)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"ok": True}

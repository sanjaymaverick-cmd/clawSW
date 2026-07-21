"""Phase 2 — service jobs, technician assignment, status flow, parts used.

Access is gated on ('service_jobs', read/write) rows of the permissions
table. On top of that, the blueprint's role matrix scopes the technician
role to "own jobs only": technicians see and modify only jobs assigned to
them, cannot reassign jobs, and cannot mark jobs billed.

Consuming a part writes job_parts_used AND the Phase 1 stock ledger in one
transaction: a negative stock_move with move_type='service_use' and
reference to the job, so parts usage is always reconciled with inventory.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_permission
from ..models import (
    Item,
    JobPartUsed,
    Machinery,
    Permission,
    ServiceJob,
    StockMove,
    User,
    Warehouse,
)
from ..routers.inventory import _locked_level
from ..schemas import (
    JobPartCreate,
    JobPartOut,
    ServiceJobCreate,
    ServiceJobOut,
    ServiceJobUpdate,
    TechnicianOut,
)

router = APIRouter(prefix="/service-jobs", tags=["service"])

read_jobs = require_permission("service_jobs", "read")
write_jobs = require_permission("service_jobs", "write")

# Forward-only status flow.
TRANSITIONS: dict[str, set[str]] = {
    "open": {"in_progress"},
    "in_progress": {"completed"},
    "completed": {"billed"},
    "billed": set(),
}


def _own_jobs_only(user: User) -> bool:
    """Blueprint section 4: the technician role is scoped to its own jobs."""
    return user.role.name == "technician"


def _job_out(job: ServiceJob) -> ServiceJobOut:
    return ServiceJobOut(
        id=job.id,
        customer_name=job.customer_name,
        machine_id=job.machine_id,
        machine_name=job.machine.name if job.machine else None,
        assigned_technician_id=job.assigned_technician_id,
        technician_name=job.technician.name,
        status=job.status,
        description=job.description,
        created_at=job.created_at,
        completed_at=job.completed_at,
    )


def _get_job_for(db: Session, job_id: uuid.UUID, user: User) -> ServiceJob:
    job = db.get(ServiceJob, job_id)
    # Scoped users get 404 (not 403) for others' jobs: no existence leaks.
    if job is None or (
        _own_jobs_only(user) and job.assigned_technician_id != user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service job not found"
        )
    return job


def _validate_assignee(db: Session, technician_id: uuid.UUID) -> User:
    assignee = db.get(User, technician_id)
    if assignee is None or not assignee.active:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Assigned technician not found or inactive",
        )
    # Table-driven check: any role with service_jobs write can hold a job.
    can_hold = db.execute(
        select(Permission.id).where(
            Permission.role_id == assignee.role_id,
            Permission.resource == "service_jobs",
            Permission.action == "write",
        )
    ).first()
    if can_hold is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Role '{assignee.role.name}' cannot be assigned service jobs",
        )
    return assignee


def _validate_machine(db: Session, machine_id: uuid.UUID) -> None:
    if db.get(Machinery, machine_id) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Machine not found",
        )


@router.get("/technicians", response_model=list[TechnicianOut])
def list_assignable_technicians(
    db: Session = Depends(get_db),
    _: User = Depends(write_jobs),
):
    """Active users whose role holds service_jobs write — for assignment."""
    rows = db.execute(
        select(User)
        .join(Permission, Permission.role_id == User.role_id)
        .where(
            User.active.is_(True),
            Permission.resource == "service_jobs",
            Permission.action == "write",
        )
        .order_by(User.name)
    ).scalars()
    return [TechnicianOut(id=u.id, name=u.name) for u in rows]


@router.get("", response_model=list[ServiceJobOut])
def list_jobs(
    db: Session = Depends(get_db),
    user: User = Depends(read_jobs),
    status_filter: str | None = None,
    technician_id: uuid.UUID | None = None,
):
    query = select(ServiceJob).order_by(ServiceJob.created_at.desc())
    if _own_jobs_only(user):
        query = query.where(ServiceJob.assigned_technician_id == user.id)
    elif technician_id:
        query = query.where(ServiceJob.assigned_technician_id == technician_id)
    if status_filter:
        query = query.where(ServiceJob.status == status_filter)
    return [_job_out(j) for j in db.execute(query).scalars()]


@router.post("", response_model=ServiceJobOut, status_code=status.HTTP_201_CREATED)
def create_job(
    body: ServiceJobCreate,
    db: Session = Depends(get_db),
    user: User = Depends(write_jobs),
):
    if _own_jobs_only(user) and body.assigned_technician_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Technicians can only create jobs assigned to themselves",
        )
    _validate_assignee(db, body.assigned_technician_id)
    if body.machine_id is not None:
        _validate_machine(db, body.machine_id)
    job = ServiceJob(
        customer_name=body.customer_name,
        machine_id=body.machine_id,
        assigned_technician_id=body.assigned_technician_id,
        description=body.description,
        status="open",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return _job_out(job)


@router.get("/{job_id}", response_model=ServiceJobOut)
def get_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(read_jobs),
):
    return _job_out(_get_job_for(db, job_id, user))


@router.patch("/{job_id}", response_model=ServiceJobOut)
def update_job(
    job_id: uuid.UUID,
    body: ServiceJobUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(write_jobs),
):
    job = _get_job_for(db, job_id, user)
    changes = body.model_dump(exclude_unset=True)

    if "assigned_technician_id" in changes:
        if _own_jobs_only(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Technicians cannot reassign jobs",
            )
        _validate_assignee(db, changes["assigned_technician_id"])

    if changes.get("machine_id") is not None:
        _validate_machine(db, changes["machine_id"])

    new_status = changes.get("status")
    if new_status and new_status != job.status:
        if new_status not in TRANSITIONS[job.status]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot move a job from '{job.status}' to '{new_status}'",
            )
        if new_status == "billed" and _own_jobs_only(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Technicians cannot mark jobs as billed",
            )
        if new_status == "completed":
            job.completed_at = datetime.now(timezone.utc)

    for field, value in changes.items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return _job_out(job)


# ---- parts used ----

@router.get("/{job_id}/parts", response_model=list[JobPartOut])
def list_job_parts(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(read_jobs),
):
    job = _get_job_for(db, job_id, user)
    rows = db.execute(
        select(JobPartUsed, Item)
        .join(Item, JobPartUsed.item_id == Item.id)
        .where(JobPartUsed.job_id == job.id)
    )
    return [
        JobPartOut(
            id=part.id,
            item_id=part.item_id,
            sku=item.sku,
            item_name=item.name,
            unit=item.unit,
            quantity=part.quantity,
        )
        for part, item in rows
    ]


@router.post(
    "/{job_id}/parts", response_model=JobPartOut, status_code=status.HTTP_201_CREATED
)
def add_job_part(
    job_id: uuid.UUID,
    body: JobPartCreate,
    db: Session = Depends(get_db),
    user: User = Depends(write_jobs),
):
    job = _get_job_for(db, job_id, user)
    if job.status not in ("open", "in_progress"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add parts to a job that is '{job.status}'",
        )
    item = db.get(Item, body.item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
        )
    warehouse = db.get(Warehouse, body.warehouse_id)
    if warehouse is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found"
        )

    level = _locked_level(db, item.id, warehouse.id)
    if level.quantity < body.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient stock: {level.quantity} on hand at "
                f"'{warehouse.name}', cannot use {body.quantity}"
            ),
        )
    level.quantity -= body.quantity

    part = JobPartUsed(job_id=job.id, item_id=item.id, quantity=body.quantity)
    db.add(part)
    db.add(
        StockMove(
            item_id=item.id,
            warehouse_id=warehouse.id,
            quantity=-body.quantity,
            move_type="service_use",
            reference_type="service_job",
            reference_id=job.id,
            created_by=user.id,
        )
    )
    db.commit()
    db.refresh(part)
    return JobPartOut(
        id=part.id,
        item_id=item.id,
        sku=item.sku,
        item_name=item.name,
        unit=item.unit,
        quantity=part.quantity,
    )

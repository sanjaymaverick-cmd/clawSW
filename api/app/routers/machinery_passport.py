"""Machine passport + rule-based maintenance risk — Wave E."""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_permission
from ..models import Item, JobPartUsed, Machinery, ServiceJob, User
from ..schemas import MachinePassportOut

router = APIRouter(prefix="/machinery", tags=["machinery"])
read = require_permission("service_jobs", "read")


def _risk_for(
    *,
    installed_at: date | None,
    job_count: int,
    open_jobs: int,
    parts_value: float,
) -> tuple[int, str]:
    score = 0
    reasons: list[str] = []
    age_days = (date.today() - installed_at).days if installed_at else 0
    if age_days > 365 * 5:
        score += 35
        reasons.append("age >5y")
    elif age_days > 365 * 2:
        score += 20
        reasons.append("age >2y")
    if open_jobs > 0:
        score += 25 + min(20, open_jobs * 10)
        reasons.append(f"{open_jobs} open job(s)")
    if job_count >= 5:
        score += 20
        reasons.append("high service frequency")
    elif job_count >= 2:
        score += 10
        reasons.append("repeat service")
    if parts_value >= 50_000:
        score += 20
        reasons.append("high parts spend")
    elif parts_value >= 10_000:
        score += 10
        reasons.append("elevated parts spend")
    score = min(100, score)
    reason = ", ".join(reasons) if reasons else "stable"
    return score, reason


@router.get("/passports", response_model=list[MachinePassportOut])
def list_passports(
    db: Session = Depends(get_db),
    _: User = Depends(read),
):
    machines = list(db.execute(select(Machinery).order_by(Machinery.name)).scalars())
    out: list[MachinePassportOut] = []
    for m in machines:
        job_count = int(
            db.execute(
                select(func.count(ServiceJob.id)).where(ServiceJob.machine_id == m.id)
            ).scalar_one()
        )
        open_jobs = int(
            db.execute(
                select(func.count(ServiceJob.id)).where(
                    ServiceJob.machine_id == m.id,
                    ServiceJob.status.in_(("open", "in_progress")),
                )
            ).scalar_one()
        )
        parts_value = float(
            db.execute(
                select(
                    func.coalesce(func.sum(JobPartUsed.quantity * Item.price), 0)
                )
                .join(ServiceJob, JobPartUsed.job_id == ServiceJob.id)
                .join(Item, JobPartUsed.item_id == Item.id)
                .where(ServiceJob.machine_id == m.id)
            ).scalar_one()
        )
        score, reason = _risk_for(
            installed_at=m.installed_at,
            job_count=job_count,
            open_jobs=open_jobs,
            parts_value=parts_value,
        )
        out.append(
            MachinePassportOut(
                id=m.id,
                name=m.name,
                category=m.category,
                qr_code=m.qr_code,
                brochure_path=m.brochure_path,
                installed_at=m.installed_at,
                city=m.city,
                customer_name=m.customer_name,
                service_job_count=job_count,
                open_job_count=open_jobs,
                parts_value=parts_value,
                risk_score=score,
                risk_reason=reason,
            )
        )
    out.sort(key=lambda x: x.risk_score, reverse=True)
    return out


@router.get("/passports/{machine_id}", response_model=MachinePassportOut)
def get_passport(
    machine_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(read),
):
    rows = list_passports(db=db, _=user)
    for p in rows:
        if p.id == machine_id:
            return p
    raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Machine not found")

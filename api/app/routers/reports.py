"""Phase 3 — role dashboards.

One summary endpoint feeds every role's dashboard. Which sections a
caller receives is decided entirely by the permissions table:

    section 'stock'     -> reports:read + inventory:read
    section 'service'   -> reports:read + service_jobs:read
    section 'financial' -> reports:read + invoices:read
    section 'people'    -> reports:read + admin:read

The owner/CEO role holds everything, so it gets the full aggregated
view across all modules; warehouse gets stock only; technicians hold
no reports:read and are rejected outright. A section never reveals
anything the role could not already read from the module's own
endpoints.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import has_permission, require_permission
from ..models import (
    Item,
    JobPartUsed,
    Role,
    ServiceJob,
    StockLevel,
    StockMove,
    User,
    Warehouse,
)
from ..schemas import (
    FinancialReport,
    LowStockRow,
    PeopleReport,
    ReportSummary,
    ServiceReport,
    StockReport,
    TechnicianOpenRow,
)

router = APIRouter(prefix="/reports", tags=["reports"])

read_reports = require_permission("reports", "read")


def _stock_value(db: Session) -> float:
    return float(
        db.execute(
            select(func.coalesce(func.sum(StockLevel.quantity * Item.price), 0)).join(
                Item, StockLevel.item_id == Item.id
            )
        ).scalar_one()
    )


def _stock_report(db: Session) -> StockReport:
    total_items = db.execute(select(func.count(Item.id))).scalar_one()
    total_warehouses = db.execute(select(func.count(Warehouse.id))).scalar_one()

    # Per item, totalled across warehouses; reorder_level 0 means
    # "no threshold set" and is never flagged.
    low_rows = db.execute(
        select(
            Item.sku,
            Item.name,
            func.coalesce(func.sum(StockLevel.quantity), 0).label("total"),
            Item.reorder_level,
        )
        .outerjoin(StockLevel, StockLevel.item_id == Item.id)
        .where(Item.reorder_level > 0)
        .group_by(Item.id, Item.sku, Item.name, Item.reorder_level)
        .having(func.coalesce(func.sum(StockLevel.quantity), 0) <= Item.reorder_level)
        .order_by(func.coalesce(func.sum(StockLevel.quantity), 0))
        .limit(20)
    ).all()

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    moves = db.execute(
        select(func.count(StockMove.id)).where(StockMove.created_at >= week_ago)
    ).scalar_one()

    return StockReport(
        total_items=total_items,
        total_warehouses=total_warehouses,
        total_stock_value=_stock_value(db),
        low_stock=[
            LowStockRow(
                sku=sku, name=name, total_quantity=float(total), reorder_level=reorder
            )
            for sku, name, total, reorder in low_rows
        ],
        moves_last_7_days=moves,
    )


def _service_report(db: Session) -> ServiceReport:
    by_status = {
        status: count
        for status, count in db.execute(
            select(ServiceJob.status, func.count(ServiceJob.id)).group_by(
                ServiceJob.status
            )
        )
    }

    open_rows = db.execute(
        select(User.name, func.count(ServiceJob.id))
        .join(User, ServiceJob.assigned_technician_id == User.id)
        .where(ServiceJob.status.in_(("open", "in_progress")))
        .group_by(User.id, User.name)
        .order_by(func.count(ServiceJob.id).desc())
    ).all()

    durations = db.execute(
        select(ServiceJob.created_at, ServiceJob.completed_at).where(
            ServiceJob.completed_at.is_not(None)
        )
    ).all()
    avg_hours = None
    if durations:
        total_seconds = sum(
            (done - started).total_seconds() for started, done in durations
        )
        avg_hours = round(total_seconds / len(durations) / 3600, 2)

    parts_value = float(
        db.execute(
            select(
                func.coalesce(func.sum(JobPartUsed.quantity * Item.price), 0)
            ).join(Item, JobPartUsed.item_id == Item.id)
        ).scalar_one()
    )

    return ServiceReport(
        jobs_by_status=by_status,
        open_by_technician=[
            TechnicianOpenRow(technician_name=name, open_jobs=count)
            for name, count in open_rows
        ],
        avg_completion_hours=avg_hours,
        parts_used_value=parts_value,
    )


def _financial_report(db: Session) -> FinancialReport:
    billed_jobs = db.execute(
        select(func.count(ServiceJob.id)).where(ServiceJob.status == "billed")
    ).scalar_one()
    billed_parts_value = float(
        db.execute(
            select(func.coalesce(func.sum(JobPartUsed.quantity * Item.price), 0))
            .join(Item, JobPartUsed.item_id == Item.id)
            .join(ServiceJob, JobPartUsed.job_id == ServiceJob.id)
            .where(ServiceJob.status == "billed")
        ).scalar_one()
    )
    return FinancialReport(
        billed_jobs=billed_jobs,
        billed_parts_value=billed_parts_value,
        stock_value=_stock_value(db),
    )


def _people_report(db: Session) -> PeopleReport:
    active = db.execute(
        select(func.count(User.id)).where(User.active.is_(True))
    ).scalar_one()
    by_role = {
        role_name: count
        for role_name, count in db.execute(
            select(Role.name, func.count(User.id))
            .join(User, User.role_id == Role.id)
            .where(User.active.is_(True))
            .group_by(Role.name)
        )
    }
    return PeopleReport(active_users=active, users_by_role=by_role)


@router.get("/summary", response_model=ReportSummary)
def summary(
    db: Session = Depends(get_db),
    user: User = Depends(read_reports),
):
    out = ReportSummary()
    if has_permission(db, user, "inventory", "read"):
        out.stock = _stock_report(db)
    if has_permission(db, user, "service_jobs", "read"):
        out.service = _service_report(db)
    if has_permission(db, user, "invoices", "read"):
        out.financial = _financial_report(db)
    if has_permission(db, user, "admin", "read"):
        out.people = _people_report(db)
    return out

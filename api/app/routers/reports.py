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

CEO snapshot (`GET /reports/ceo`) is further gated on admin:read so only
the owner receives the cross-module executive pack.
"""
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import has_permission, require_permission
from ..models import (
    DemoBooking,
    ImportContainer,
    Item,
    JobPartUsed,
    Machinery,
    Project,
    ReceivableSnapshot,
    Role,
    ServiceJob,
    StockLevel,
    StockMove,
    TallySyncLog,
    User,
    Warehouse,
    WebsiteOrder,
    WebsiteOrderItem,
)
from ..schemas import (
    CeoFinancialMetrics,
    CeoGrowthSeriesPoint,
    CeoImportsSummary,
    CeoInsight,
    CeoMaintenanceRisk,
    CeoMaintenanceSummary,
    CeoOperationalKpis,
    CeoPrediction,
    CeoProjectsSummary,
    CeoReceivablesSummary,
    CeoRiskItem,
    CeoServiceCity,
    CeoSnapshot,
    FinancialReport,
    LowStockRow,
    PeopleReport,
    ReportSummary,
    ServiceReport,
    StockReport,
    TechnicianOpenRow,
)
from ..tally import TallyClient
from .receivables import refresh_inferred_receivables

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


def _order_line_value(db: Session, since: datetime | None = None, status: str | None = None) -> float:
    q = (
        select(func.coalesce(func.sum(WebsiteOrderItem.quantity * WebsiteOrderItem.price_at_order), 0))
        .join(WebsiteOrder, WebsiteOrderItem.order_id == WebsiteOrder.id)
    )
    if since is not None:
        q = q.where(WebsiteOrder.created_at >= since)
    if status is not None:
        q = q.where(WebsiteOrder.status == status)
    return float(db.execute(q).scalar_one())


def _count_orders(db: Session, since: datetime | None = None, status: str | None = None) -> int:
    q = select(func.count(WebsiteOrder.id))
    if since is not None:
        q = q.where(WebsiteOrder.created_at >= since)
    if status is not None:
        q = q.where(WebsiteOrder.status == status)
    return int(db.execute(q).scalar_one())


def _ceo_risks(
    *,
    low_stock: int,
    open_jobs: int,
    in_progress: int,
    pending_orders: int,
    failed_tally: int,
    avg_hours: float | None,
    pending_value: float,
) -> list[CeoRiskItem]:
    risks: list[CeoRiskItem] = []
    backlog = open_jobs + in_progress
    if low_stock >= 5:
        risks.append(
            CeoRiskItem(
                id="low-stock-high",
                severity="critical" if low_stock >= 10 else "high",
                category="inventory",
                title=f"{low_stock} SKUs at or below reorder",
                detail="Stockouts can stall service jobs and website fulfilment.",
                metric=float(low_stock),
                action_hint="Review Inventory → low-stock list and place PO / transfers.",
            )
        )
    elif low_stock > 0:
        risks.append(
            CeoRiskItem(
                id="low-stock-med",
                severity="medium",
                category="inventory",
                title=f"{low_stock} SKU(s) near reorder",
                detail="Early signal — replenish before service demand spikes.",
                metric=float(low_stock),
                action_hint="Warehouse team to confirm on-hand and reorder.",
            )
        )

    if backlog >= 8:
        risks.append(
            CeoRiskItem(
                id="service-backlog",
                severity="high",
                category="service",
                title=f"Service backlog of {backlog} active jobs",
                detail="High open + in-progress load may stretch technicians and CSAT.",
                metric=float(backlog),
                action_hint="Rebalance technician assignment or hire temp support.",
            )
        )
    elif backlog >= 4:
        risks.append(
            CeoRiskItem(
                id="service-load",
                severity="medium",
                category="service",
                title=f"{backlog} active service jobs",
                detail="Monitor completion velocity vs. new intake.",
                metric=float(backlog),
            )
        )

    if avg_hours is not None and avg_hours > 72:
        risks.append(
            CeoRiskItem(
                id="slow-close",
                severity="medium",
                category="service",
                title=f"Avg job close {avg_hours:.0f}h",
                detail="Longer cycle time ties up parts and delays billing.",
                metric=avg_hours,
                action_hint="Audit stalled in-progress jobs.",
            )
        )

    if pending_orders >= 3:
        risks.append(
            CeoRiskItem(
                id="order-queue",
                severity="high" if pending_orders >= 6 else "medium",
                category="website",
                title=f"{pending_orders} website orders awaiting confirm",
                detail=f"≈ ₹{pending_value:,.0f} sitting in pending status.",
                metric=float(pending_orders),
                action_hint="Confirm orders from the Website tab to deduct stock.",
            )
        )

    if failed_tally > 0:
        risks.append(
            CeoRiskItem(
                id="tally-fail",
                severity="high",
                category="finance",
                title=f"{failed_tally} failed Tally push(es)",
                detail="Accounting system of record is out of sync for some sales.",
                metric=float(failed_tally),
                action_hint="Check Invoicing tab / Tally gateway connectivity.",
            )
        )

    if not risks:
        risks.append(
            CeoRiskItem(
                id="all-clear",
                severity="low",
                category="ops",
                title="No critical risks flagged",
                detail="Composite signals look healthy on current thresholds.",
                metric=0,
            )
        )
    return risks


def _ceo_predictions(
    *,
    gmv_7d: float,
    gmv_30d: float,
    orders_30d: int,
    open_jobs: int,
    low_stock: int,
    moves_7d: int,
) -> list[CeoPrediction]:
    daily_gmv = gmv_7d / 7 if gmv_7d > 0 else (gmv_30d / 30 if gmv_30d > 0 else 0)
    daily_orders = orders_30d / 30 if orders_30d else 0
    conf = "high" if orders_30d >= 10 else ("medium" if orders_30d >= 3 else "low")
    return [
        CeoPrediction(
            id="gmv-30d-fwd",
            horizon="Next 30 days",
            title="Website GMV run-rate projection",
            estimate=f"₹{daily_gmv * 30:,.0f}",
            confidence=conf,
            basis="Linear extrapolation of last 7-day website GMV (parts/tools orders).",
        ),
        CeoPrediction(
            id="orders-30d-fwd",
            horizon="Next 30 days",
            title="Expected website order volume",
            estimate=f"~{max(0, round(daily_orders * 30))} orders",
            confidence=conf,
            basis="30-day average order intake, constant demand assumption.",
        ),
        CeoPrediction(
            id="service-pressure",
            horizon="Next 14 days",
            title="Service capacity pressure",
            estimate=(
                "Elevated"
                if open_jobs >= 6
                else ("Moderate" if open_jobs >= 3 else "Manageable")
            ),
            confidence="medium",
            basis=f"{open_jobs} open jobs + {low_stock} low-stock SKUs affecting parts readiness.",
        ),
        CeoPrediction(
            id="inventory-velocity",
            horizon="Next 7 days",
            title="Inventory movement intensity",
            estimate=f"~{moves_7d} moves expected" if moves_7d else "Quiet week expected",
            confidence="medium" if moves_7d else "low",
            basis="Matches last 7 days of stock_move activity.",
        ),
    ]


def _ceo_insights(
    financial: CeoFinancialMetrics,
    operational: CeoOperationalKpis,
    health: int,
) -> list[CeoInsight]:
    insights: list[CeoInsight] = []
    insights.append(
        CeoInsight(
            id="health",
            tone="positive" if health >= 70 else ("warning" if health >= 45 else "critical"),
            title=f"Business health score: {health}/100",
            body=(
                "Composite of inventory risk, service backlog, order queue, and Tally sync."
                if health < 100
                else "All monitored signals are within healthy bands."
            ),
        )
    )
    if financial.website_gmv_7d > 0:
        wow = (
            (financial.website_gmv_7d * 4.3 / financial.website_gmv_30d - 1) * 100
            if financial.website_gmv_30d > 0
            else 0
        )
        insights.append(
            CeoInsight(
                id="gmv-trend",
                tone="positive" if wow >= 0 else "warning",
                title=f"7-day website GMV ₹{financial.website_gmv_7d:,.0f}",
                body=(
                    f"Annualized pace vs 30-day average is roughly {wow:+.0f}%."
                    if financial.website_gmv_30d
                    else "Building baseline — keep converting pending orders."
                ),
            )
        )
    if operational.service_completion_rate_pct is not None:
        insights.append(
            CeoInsight(
                id="svc-rate",
                tone="positive" if operational.service_completion_rate_pct >= 60 else "warning",
                title=f"Service completion rate {operational.service_completion_rate_pct:.0f}%",
                body="Share of jobs that reached completed or billed status.",
            )
        )
    if financial.pipeline_value > 0:
        insights.append(
            CeoInsight(
                id="pipeline",
                tone="neutral",
                title=f"₹{financial.pipeline_value:,.0f} in order pipeline",
                body="Pending + confirmed website orders not yet synced to Tally.",
            )
        )
    if operational.demo_bookings_pending:
        insights.append(
            CeoInsight(
                id="demos",
                tone="positive",
                title=f"{operational.demo_bookings_pending} demo booking(s) waiting",
                body="Sales pipeline signal from the public site — confirm slots promptly.",
            )
        )
    return insights


def _health_score(
    *,
    low_stock: int,
    open_jobs: int,
    pending_orders: int,
    failed_tally: int,
    completion_rate: float | None,
) -> int:
    score = 100
    score -= min(40, low_stock * 4)
    score -= min(25, (open_jobs // 2) * 3)
    score -= min(20, pending_orders * 3)
    score -= min(20, failed_tally * 10)
    if completion_rate is not None and completion_rate < 50:
        score -= 10
    return max(0, min(100, score))


@router.get("/ceo", response_model=CeoSnapshot)
def ceo_snapshot(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("admin", "read")),
    _: User = Depends(read_reports),
):
    """Owner/CEO executive pack — cross-module aggregates for the top seat.

    Gated on admin:read (owner only in the default matrix) so managers keep
    the lighter departmental summary.
    """
    now = datetime.now(timezone.utc)
    d7 = now - timedelta(days=7)
    d14 = now - timedelta(days=14)
    d30 = now - timedelta(days=30)

    stock_capital = _stock_value(db)
    financial_base = _financial_report(db)
    service = _service_report(db)
    stock = _stock_report(db)
    people = _people_report(db)

    by_status = service.jobs_by_status or {}
    open_j = int(by_status.get("open", 0))
    prog_j = int(by_status.get("in_progress", 0))
    done_j = int(by_status.get("completed", 0))
    billed_j = int(by_status.get("billed", 0))
    total_jobs = open_j + prog_j + done_j + billed_j
    completion_rate = (
        round(100.0 * (done_j + billed_j) / total_jobs, 1) if total_jobs else None
    )

    gmv_all = _order_line_value(db)
    gmv_30 = _order_line_value(db, since=d30)
    gmv_7 = _order_line_value(db, since=d7)
    pending_val = _order_line_value(db, status="pending")
    confirmed_val = _order_line_value(db, status="confirmed")

    pending_orders = _count_orders(db, status="pending")
    orders_30 = _count_orders(db, since=d30)

    demo_pending = int(
        db.execute(
            select(func.count(DemoBooking.id)).where(DemoBooking.status == "pending")
        ).scalar_one()
    )
    # DemoBooking has no created_at — use preferred_date within 30d as proxy count
    today = date.today()
    demo_30 = int(
        db.execute(
            select(func.count(DemoBooking.id)).where(
                DemoBooking.preferred_date.is_not(None),
                DemoBooking.preferred_date >= today - timedelta(days=30),
            )
        ).scalar_one()
    )

    failed_tally = int(
        db.execute(
            select(func.count(TallySyncLog.id)).where(TallySyncLog.status == "failed")
        ).scalar_one()
    )
    pending_push = _count_orders(db, status="confirmed")
    last_push = db.execute(
        select(func.max(TallySyncLog.synced_at)).where(TallySyncLog.status == "success")
    ).scalar_one()

    # 14-day series (UTC calendar days)
    series_map: dict[str, dict] = defaultdict(
        lambda: {
            "website_orders": 0,
            "website_gmv": 0.0,
            "service_jobs_opened": 0,
            "stock_moves": 0,
        }
    )
    for i in range(14):
        day = (now - timedelta(days=13 - i)).date().isoformat()
        series_map[day]  # ensure key exists

    def _day_key(day_ts) -> str | None:
        if day_ts is None:
            return None
        if hasattr(day_ts, "date") and callable(day_ts.date):
            return day_ts.date().isoformat()
        return str(day_ts)[:10]

    order_day = func.date_trunc("day", WebsiteOrder.created_at).label("d")
    order_rows = db.execute(
        select(order_day, func.count(WebsiteOrder.id))
        .where(WebsiteOrder.created_at >= d14)
        .group_by(order_day)
    ).all()
    for day_ts, cnt in order_rows:
        key = _day_key(day_ts)
        if key and key in series_map:
            series_map[key]["website_orders"] = int(cnt)

    gmv_day = func.date_trunc("day", WebsiteOrder.created_at).label("d")
    gmv_rows = db.execute(
        select(
            gmv_day,
            func.coalesce(
                func.sum(WebsiteOrderItem.quantity * WebsiteOrderItem.price_at_order), 0
            ),
        )
        .join(WebsiteOrderItem, WebsiteOrderItem.order_id == WebsiteOrder.id)
        .where(WebsiteOrder.created_at >= d14)
        .group_by(gmv_day)
    ).all()
    for day_ts, val in gmv_rows:
        key = _day_key(day_ts)
        if key and key in series_map:
            series_map[key]["website_gmv"] = float(val)

    job_day = func.date_trunc("day", ServiceJob.created_at).label("d")
    job_rows = db.execute(
        select(job_day, func.count(ServiceJob.id))
        .where(ServiceJob.created_at >= d14)
        .group_by(job_day)
    ).all()
    for day_ts, cnt in job_rows:
        key = _day_key(day_ts)
        if key and key in series_map:
            series_map[key]["service_jobs_opened"] = int(cnt)

    move_day = func.date_trunc("day", StockMove.created_at).label("d")
    move_rows = db.execute(
        select(move_day, func.count(StockMove.id))
        .where(StockMove.created_at >= d14)
        .group_by(move_day)
    ).all()
    for day_ts, cnt in move_rows:
        key = _day_key(day_ts)
        if key and key in series_map:
            series_map[key]["stock_moves"] = int(cnt)

    series = [
        CeoGrowthSeriesPoint(
            day=day,
            website_orders=series_map[day]["website_orders"],
            website_gmv=series_map[day]["website_gmv"],
            service_jobs_opened=series_map[day]["service_jobs_opened"],
            stock_moves=series_map[day]["stock_moves"],
        )
        for day in sorted(series_map.keys())
    ]

    financial = CeoFinancialMetrics(
        stock_capital=stock_capital,
        billed_jobs=financial_base.billed_jobs,
        billed_parts_value=financial_base.billed_parts_value,
        website_gmv_all=gmv_all,
        website_gmv_30d=gmv_30,
        website_gmv_7d=gmv_7,
        pending_order_value=pending_val,
        confirmed_not_synced_value=confirmed_val,
        pipeline_value=pending_val + confirmed_val,
    )
    # Van / main stock split (Wave B)
    main_value = float(
        db.execute(
            select(func.coalesce(func.sum(StockLevel.quantity * Item.price), 0))
            .join(Item, StockLevel.item_id == Item.id)
            .join(Warehouse, StockLevel.warehouse_id == Warehouse.id)
            .where(Warehouse.kind != "van")
        ).scalar_one()
    )
    van_value = float(
        db.execute(
            select(func.coalesce(func.sum(StockLevel.quantity * Item.price), 0))
            .join(Item, StockLevel.item_id == Item.id)
            .join(Warehouse, StockLevel.warehouse_id == Warehouse.id)
            .where(Warehouse.kind == "van")
        ).scalar_one()
    )
    van_low_rows = db.execute(
        select(Item.id, Item.reorder_level, func.sum(StockLevel.quantity))
        .join(StockLevel, StockLevel.item_id == Item.id)
        .join(Warehouse, StockLevel.warehouse_id == Warehouse.id)
        .where(Warehouse.kind == "van", Item.reorder_level > 0)
        .group_by(Item.id, Item.reorder_level)
    ).all()
    van_low = sum(1 for _, reorder, qty in van_low_rows if float(qty or 0) <= reorder)

    operational = CeoOperationalKpis(
        open_service_jobs=open_j,
        in_progress_jobs=prog_j,
        completed_jobs=done_j,
        billed_jobs=billed_j,
        service_completion_rate_pct=completion_rate,
        avg_completion_hours=service.avg_completion_hours,
        parts_used_value=service.parts_used_value,
        low_stock_skus=len(stock.low_stock),
        stock_moves_7d=stock.moves_last_7_days,
        website_orders_pending=pending_orders,
        website_orders_30d=orders_30,
        demo_bookings_pending=demo_pending,
        demo_bookings_30d=demo_30,
        active_users=people.active_users,
        van_low_stock_skus=van_low,
        stock_main_value=main_value,
        stock_van_value=van_value,
    )

    health = _health_score(
        low_stock=len(stock.low_stock),
        open_jobs=open_j + prog_j,
        pending_orders=pending_orders,
        failed_tally=failed_tally,
        completion_rate=completion_rate,
    )
    risks = _ceo_risks(
        low_stock=len(stock.low_stock),
        open_jobs=open_j,
        in_progress=prog_j,
        pending_orders=pending_orders,
        failed_tally=failed_tally,
        avg_hours=service.avg_completion_hours,
        pending_value=pending_val,
    )
    if van_low > 0:
        risks.append(
            CeoRiskItem(
                id="van-low",
                severity="medium",
                category="inventory",
                title=f"{van_low} van SKU(s) below reorder",
                detail="Field vans low on spares can delay same-day repairs.",
                metric=float(van_low),
                action_hint="Transfer from main warehouse to van bins.",
            )
        )
    predictions = _ceo_predictions(
        gmv_7d=gmv_7,
        gmv_30d=gmv_30,
        orders_30d=orders_30,
        open_jobs=open_j + prog_j,
        low_stock=len(stock.low_stock),
        moves_7d=stock.moves_last_7_days,
    )
    insights = _ceo_insights(financial, operational, health)

    # Wave C — receivables
    try:
        refresh_inferred_receivables(db)
    except Exception:
        pass
    recv_rows = list(db.execute(select(ReceivableSnapshot)).scalars())
    overdue_rows = [r for r in recv_rows if r.status == "overdue"]
    receivables = CeoReceivablesSummary(
        overdue_total=sum(r.amount for r in overdue_rows),
        overdue_count=len(overdue_rows),
        bucket_0_30=sum(r.amount for r in overdue_rows if 0 < r.days_overdue <= 30),
        bucket_31_60=sum(r.amount for r in overdue_rows if 30 < r.days_overdue <= 60),
        bucket_60_plus=sum(r.amount for r in overdue_rows if r.days_overdue > 60),
        upcoming_total=sum(r.amount for r in recv_rows if r.status == "upcoming"),
    )
    if receivables.overdue_count > 0:
        risks.append(
            CeoRiskItem(
                id="ar-overdue",
                severity="high" if receivables.overdue_total >= 500_000 else "medium",
                category="finance",
                title=f"Overdue receivables ₹{receivables.overdue_total:,.0f}",
                detail=f"{receivables.overdue_count} open item(s) past due (inferred/Tally).",
                metric=receivables.overdue_total,
                action_hint="Review Invoicing / collections.",
            )
        )

    # Wave D — imports + projects
    containers = list(db.execute(select(ImportContainer)).scalars())
    delayed = [c for c in containers if c.delay_days > 0 or c.status == "Customs Hold"]
    imports = CeoImportsSummary(
        total=len(containers),
        delayed_or_hold=len(delayed),
        on_water=sum(1 for c in containers if c.status == "On Water"),
        value_at_risk=sum(c.value_inr for c in delayed),
    )
    if imports.delayed_or_hold > 0:
        risks.append(
            CeoRiskItem(
                id="import-delay",
                severity="high",
                category="imports",
                title=f"{imports.delayed_or_hold} container(s) delayed/on hold",
                detail=f"Value at risk ₹{imports.value_at_risk:,.0f}.",
                metric=float(imports.delayed_or_hold),
                action_hint="Open Imports tab for customs/ETA follow-up.",
            )
        )

    active_projects = list(
        db.execute(select(Project).where(Project.status == "active")).scalars()
    )
    lowest = min(active_projects, key=lambda p: p.margin_pct) if active_projects else None
    projects = CeoProjectsSummary(
        active_count=len(active_projects),
        pipeline_boq_value=sum(p.boq_value for p in active_projects),
        lowest_margin_pct=float(lowest.margin_pct) if lowest else None,
        lowest_margin_customer=lowest.customer_name if lowest else None,
    )
    if lowest and lowest.margin_pct < 16:
        risks.append(
            CeoRiskItem(
                id="project-margin",
                severity="medium",
                category="projects",
                title=f"Low margin project: {lowest.customer_name} ({lowest.margin_pct}%)",
                detail=f"BOQ ₹{lowest.boq_value:,.0f} at stage {lowest.stage}.",
                metric=float(lowest.margin_pct),
                action_hint="Review import cost allocation before install.",
            )
        )

    # Wave E — maintenance risk + service map
    from .machinery_passport import _risk_for

    top_risks: list[CeoMaintenanceRisk] = []
    elevated = 0
    for m in db.execute(select(Machinery)).scalars():
        job_count = int(
            db.execute(
                select(func.count(ServiceJob.id)).where(ServiceJob.machine_id == m.id)
            ).scalar_one()
        )
        open_jobs_m = int(
            db.execute(
                select(func.count(ServiceJob.id)).where(
                    ServiceJob.machine_id == m.id,
                    ServiceJob.status.in_(("open", "in_progress")),
                )
            ).scalar_one()
        )
        parts_value = float(
            db.execute(
                select(func.coalesce(func.sum(JobPartUsed.quantity * Item.price), 0))
                .join(ServiceJob, JobPartUsed.job_id == ServiceJob.id)
                .join(Item, JobPartUsed.item_id == Item.id)
                .where(ServiceJob.machine_id == m.id)
            ).scalar_one()
        )
        score, reason = _risk_for(
            installed_at=m.installed_at,
            job_count=job_count,
            open_jobs=open_jobs_m,
            parts_value=parts_value,
        )
        if score >= 40:
            elevated += 1
            top_risks.append(
                CeoMaintenanceRisk(
                    machinery_id=str(m.id),
                    name=m.name,
                    risk_score=score,
                    reason=reason,
                )
            )
    top_risks.sort(key=lambda x: x.risk_score, reverse=True)
    maintenance = CeoMaintenanceSummary(
        elevated_count=elevated, top_risks=top_risks[:5]
    )

    city_counts = db.execute(
        select(ServiceJob.city, func.count(ServiceJob.id))
        .where(
            ServiceJob.status.in_(("open", "in_progress")),
            ServiceJob.city.is_not(None),
        )
        .group_by(ServiceJob.city)
    ).all()
    service_map = [
        CeoServiceCity(city=city or "Unknown", open_jobs=int(cnt), type="city")
        for city, cnt in city_counts
    ]
    if not service_map:
        service_map = [
            CeoServiceCity(city="Jodhpur", open_jobs=open_j, type="hq"),
            CeoServiceCity(city="Jaipur", open_jobs=max(0, prog_j), type="branch"),
        ]

    reachable = False
    client = TallyClient()
    try:
        reachable = client.is_reachable()
    except Exception:
        reachable = False
    finally:
        client.close()

    return CeoSnapshot(
        generated_at=now.isoformat(),
        financial=financial,
        operational=operational,
        series_14d=series,
        risks=risks,
        predictions=predictions,
        insights=insights,
        health_score=health,
        tally={
            "gateway_reachable": reachable,
            "pending_push_count": pending_push,
            "failed_push_count": failed_tally,
            "last_push_at": last_push.isoformat() if last_push else None,
        },
        receivables=receivables,
        imports=imports,
        projects=projects,
        maintenance=maintenance,
        service_map=service_map,
    )

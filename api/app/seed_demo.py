"""Phase 8 — mock/demo dataset (blueprint section 7, Phase 8).

A rehearsal fixture, NOT real business data: fictional items, warehouses,
machinery, service jobs, website orders, demo bookings, and one login per
non-owner role so all six role-dashboards can be exercised end-to-end.
The real Excel/Tally migration is a separate later project (v2/v3).

Two things keep this out of a real deployment:

- it is gated behind ``SEED_DEMO_DATA`` (config ``settings.seed_demo_data``);
  ``seed_demo`` is a no-op unless the flag is set, and ``main.py`` only calls
  it on startup when the flag is set — so it stays off the path ``seed.py``
  runs on every boot;
- like ``seed.py`` it is idempotent: every row is matched on a stable natural
  key (SKU, warehouse name, QR code, email, job/order/booking identity) and
  only inserted when missing, so re-running it never duplicates rows.

Roles and the owner user are seeded by ``seed.py``; this only adds the five
remaining role logins and the demo content, so ``seed.py`` must have run
first (it does, both on startup and in the tests).
"""
import logging
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .models import (
    CompletedProject,
    DemoBooking,
    Item,
    JobPartUsed,
    Machinery,
    Role,
    ServiceJob,
    StockLevel,
    User,
    Warehouse,
    WebsiteOrder,
    WebsiteOrderItem,
)
from .security import hash_password

logger = logging.getLogger(__name__)


def _dt(year: int, month: int, day: int) -> datetime:
    return datetime(year, month, day, tzinfo=timezone.utc)


# One login per non-owner role (owner is seeded by seed.py). role -> (name,
# email); the password is shared and comes from settings.seed_demo_password.
DEMO_USERS: list[tuple[str, str, str]] = [
    ("manager", "Demo Manager", "manager@clawsw.example"),
    ("accountant", "Demo Accountant", "accountant@clawsw.example"),
    ("service_manager", "Demo Service Manager", "service_manager@clawsw.example"),
    ("technician", "Demo Technician", "technician@clawsw.example"),
    ("warehouse", "Demo Warehouse", "warehouse@clawsw.example"),
]

# Mix of spares and tools; keyed on the unique SKU.
DEMO_ITEMS: list[dict] = [
    dict(sku="DEMO-SP-001", name="Hydraulic Seal Kit", category="Spares",
         unit="kit", price=1250.0, reorder_level=10, is_spare=True, is_tool=False,
         description="Replacement seal kit for hydraulic cylinders."),
    dict(sku="DEMO-SP-002", name="Drive Belt A-48", category="Spares",
         unit="pcs", price=480.0, reorder_level=20, is_spare=True, is_tool=False,
         description="V-belt for main drive assembly."),
    dict(sku="DEMO-SP-003", name="Spindle Bearing 6205", category="Spares",
         unit="pcs", price=2100.0, reorder_level=8, is_spare=True, is_tool=False,
         description="Precision bearing for grinder spindle."),
    dict(sku="DEMO-TL-001", name="Torque Wrench 1/2\"", category="Tools",
         unit="pcs", price=3600.0, reorder_level=3, is_spare=False, is_tool=True,
         description="Click-type torque wrench, 20-210 Nm."),
    dict(sku="DEMO-TL-002", name="Digital Caliper 150mm", category="Tools",
         unit="pcs", price=1800.0, reorder_level=5, is_spare=False, is_tool=True,
         description="Stainless digital caliper, 0.01mm resolution."),
    dict(sku="DEMO-TL-003", name="Grease Gun", category="Tools",
         unit="pcs", price=950.0, reorder_level=6, is_spare=False, is_tool=True,
         description="Lever-action grease gun for service work."),
]

# Two warehouses; keyed on name.
DEMO_WAREHOUSES: list[dict] = [
    dict(name="Demo Main Warehouse", location="Bengaluru"),
    dict(name="Demo Secondary Warehouse", location="Hyderabad"),
]

# Per-warehouse quantity for each item, indexed by warehouse name.
DEMO_STOCK: dict[str, float] = {
    "Demo Main Warehouse": 40.0,
    "Demo Secondary Warehouse": 15.0,
}

# A few machinery rows with placeholder brochures + QR codes; keyed on qr_code.
DEMO_MACHINERY: list[dict] = [
    dict(name="Demo CNC Lathe X200", category="CNC",
         brochure_path="/brochures/demo-cnc-lathe-x200.pdf",
         qr_code="DEMO-QR-CNC-X200"),
    dict(name="Demo Hydraulic Press H50", category="Press",
         brochure_path="/brochures/demo-hydraulic-press-h50.pdf",
         qr_code="DEMO-QR-PRESS-H50"),
    dict(name="Demo Surface Grinder G10", category="Grinder",
         brochure_path="/brochures/demo-surface-grinder-g10.pdf",
         qr_code="DEMO-QR-GRINDER-G10"),
]

# One service job per status. machine_qr picks the machinery row (or None);
# parts is a list of (sku, quantity) for job_parts_used. Keyed on customer_name.
DEMO_SERVICE_JOBS: list[dict] = [
    dict(customer_name="Ashok Textiles (demo)", status="open",
         machine_qr="DEMO-QR-CNC-X200",
         description="Spindle noise on startup — diagnose.",
         completed_at=None, parts=[("DEMO-SP-003", 1)]),
    dict(customer_name="Vega Engineering (demo)", status="in_progress",
         machine_qr="DEMO-QR-PRESS-H50",
         description="Hydraulic leak, reseal main cylinder.",
         completed_at=None, parts=[("DEMO-SP-001", 2)]),
    dict(customer_name="Nova Fabricators (demo)", status="completed",
         machine_qr="DEMO-QR-GRINDER-G10",
         description="Replaced worn drive belt and lubricated.",
         completed_at=_dt(2026, 6, 18), parts=[("DEMO-SP-002", 1), ("DEMO-TL-003", 1)]),
    dict(customer_name="Sunrise Metals (demo)", status="billed",
         machine_qr="DEMO-QR-CNC-X200",
         description="Annual service — bearings replaced, invoiced.",
         completed_at=_dt(2026, 5, 30), parts=[("DEMO-SP-003", 2)]),
]

DEMO_PROJECTS: list[dict] = [
    dict(title="Demo Turnkey Machine Shop", client_name="Ashok Textiles (demo)",
         description="Installed and commissioned a 6-machine line.",
         image_paths=["/projects/demo-shop-1.jpg", "/projects/demo-shop-2.jpg"],
         date_completed=date(2026, 3, 12)),
    dict(title="Demo Press Line Overhaul", client_name="Vega Engineering (demo)",
         description="Full overhaul of a hydraulic press line.",
         image_paths=["/projects/demo-press-1.jpg"],
         date_completed=date(2025, 11, 4)),
]

# One order per status; items is (sku, quantity, price_at_order). Keyed on email.
DEMO_ORDERS: list[dict] = [
    dict(customer_name="Ravi Kumar (demo)", email="ravi.demo@example.com",
         phone="+91-90000-00001", status="pending",
         items=[("DEMO-SP-001", 1, 1250.0), ("DEMO-SP-002", 2, 480.0)]),
    dict(customer_name="Priya Nair (demo)", email="priya.demo@example.com",
         phone="+91-90000-00002", status="confirmed",
         items=[("DEMO-TL-001", 1, 3600.0)]),
    dict(customer_name="Imran Shaikh (demo)", email="imran.demo@example.com",
         phone="+91-90000-00003", status="synced_to_tally",
         items=[("DEMO-SP-003", 2, 2100.0), ("DEMO-TL-002", 1, 1800.0)]),
]

# A few demo bookings; machine_qr picks the machinery row. Keyed on email.
DEMO_BOOKINGS: list[dict] = [
    dict(customer_name="Ravi Kumar (demo)", email="ravi.demo@example.com",
         phone="+91-90000-00001", machine_qr="DEMO-QR-CNC-X200",
         preferred_date=date(2026, 8, 5), status="pending"),
    dict(customer_name="Priya Nair (demo)", email="priya.demo@example.com",
         phone="+91-90000-00002", machine_qr="DEMO-QR-PRESS-H50",
         preferred_date=date(2026, 8, 12), status="confirmed"),
]


def seed_demo(db: Session) -> None:
    """Populate the demo dataset. No-op unless SEED_DEMO_DATA is set.

    Idempotent: safe to run on every boot of a demo instance — existing rows
    are matched on their natural key and left untouched.
    """
    if not settings.seed_demo_data:
        logger.info("SEED_DEMO_DATA not set; skipping demo dataset")
        return

    _seed_users(db)
    items = _seed_items(db)
    warehouses = _seed_warehouses(db)
    _seed_stock_levels(db, items, warehouses)
    machinery = _seed_machinery(db)
    _seed_service_jobs(db, items, machinery)
    _seed_projects(db)
    _seed_orders(db, items)
    _seed_bookings(db, machinery)

    db.commit()
    logger.info("Seeded demo dataset (SEED_DEMO_DATA set)")


def _seed_users(db: Session) -> None:
    roles = {r.name: r for r in db.execute(select(Role)).scalars()}
    existing = {u.email for u in db.execute(select(User)).scalars()}
    for role_name, name, email in DEMO_USERS:
        if email in existing:
            continue
        db.add(
            User(
                name=name,
                email=email,
                password_hash=hash_password(settings.seed_demo_password),
                role_id=roles[role_name].id,
                active=True,
            )
        )
    db.flush()


def _seed_items(db: Session) -> dict[str, Item]:
    existing = {i.sku: i for i in db.execute(select(Item)).scalars()}
    for data in DEMO_ITEMS:
        if data["sku"] not in existing:
            item = Item(**data)
            db.add(item)
            existing[data["sku"]] = item
    db.flush()
    return existing


def _seed_warehouses(db: Session) -> dict[str, Warehouse]:
    existing = {w.name: w for w in db.execute(select(Warehouse)).scalars()}
    for data in DEMO_WAREHOUSES:
        if data["name"] not in existing:
            wh = Warehouse(**data)
            db.add(wh)
            existing[data["name"]] = wh
    db.flush()
    return existing


def _seed_stock_levels(
    db: Session, items: dict[str, Item], warehouses: dict[str, Warehouse]
) -> None:
    existing = {
        (s.item_id, s.warehouse_id) for s in db.execute(select(StockLevel)).scalars()
    }
    for data in DEMO_ITEMS:
        item = items[data["sku"]]
        for wh_name, quantity in DEMO_STOCK.items():
            wh = warehouses[wh_name]
            if (item.id, wh.id) not in existing:
                db.add(
                    StockLevel(item_id=item.id, warehouse_id=wh.id, quantity=quantity)
                )
    db.flush()


def _seed_machinery(db: Session) -> dict[str, Machinery]:
    existing = {m.qr_code: m for m in db.execute(select(Machinery)).scalars()}
    for data in DEMO_MACHINERY:
        if data["qr_code"] not in existing:
            m = Machinery(**data)
            db.add(m)
            existing[data["qr_code"]] = m
    db.flush()
    return existing


def _seed_service_jobs(
    db: Session, items: dict[str, Item], machinery: dict[str, Machinery]
) -> None:
    technician = db.execute(
        select(User).where(User.email == "technician@clawsw.example")
    ).scalar_one()
    existing = {
        j.customer_name: j for j in db.execute(select(ServiceJob)).scalars()
    }
    for data in DEMO_SERVICE_JOBS:
        if data["customer_name"] in existing:
            continue
        job = ServiceJob(
            customer_name=data["customer_name"],
            machine_id=machinery[data["machine_qr"]].id if data["machine_qr"] else None,
            assigned_technician_id=technician.id,
            status=data["status"],
            description=data["description"],
            completed_at=data["completed_at"],
        )
        db.add(job)
        db.flush()
        for sku, qty in data["parts"]:
            db.add(JobPartUsed(job_id=job.id, item_id=items[sku].id, quantity=qty))
    db.flush()


def _seed_projects(db: Session) -> None:
    existing = {p.title for p in db.execute(select(CompletedProject)).scalars()}
    for data in DEMO_PROJECTS:
        if data["title"] not in existing:
            db.add(CompletedProject(**data))
    db.flush()


def _seed_orders(db: Session, items: dict[str, Item]) -> None:
    existing = {o.email: o for o in db.execute(select(WebsiteOrder)).scalars()}
    for data in DEMO_ORDERS:
        if data["email"] in existing:
            continue
        order = WebsiteOrder(
            customer_name=data["customer_name"],
            email=data["email"],
            phone=data["phone"],
            status=data["status"],
        )
        db.add(order)
        db.flush()
        for sku, qty, price in data["items"]:
            db.add(
                WebsiteOrderItem(
                    order_id=order.id,
                    item_id=items[sku].id,
                    quantity=qty,
                    price_at_order=price,
                )
            )
    db.flush()


def _seed_bookings(db: Session, machinery: dict[str, Machinery]) -> None:
    existing = {b.email for b in db.execute(select(DemoBooking)).scalars()}
    for data in DEMO_BOOKINGS:
        if data["email"] in existing:
            continue
        db.add(
            DemoBooking(
                customer_name=data["customer_name"],
                email=data["email"],
                phone=data["phone"],
                machinery_id=machinery[data["machine_qr"]].id,
                preferred_date=data["preferred_date"],
                status=data["status"],
            )
        )
    db.flush()

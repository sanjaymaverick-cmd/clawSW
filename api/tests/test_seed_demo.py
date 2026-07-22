"""Phase 8 — the demo dataset must only load when SEED_DEMO_DATA is set and
must survive re-runs without duplicating rows.

These run against a throwaway in-memory database of their own (not the shared
``client`` fixture DB) so the committed demo rows can't leak into the rest of
the suite. seed() runs first to create the roles the demo logins reference.
"""
import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.db import Base
from app.models import (
    CompletedProject,
    DemoBooking,
    Item,
    JobPartUsed,
    Machinery,
    ServiceJob,
    StockLevel,
    User,
    Warehouse,
    WebsiteOrder,
    WebsiteOrderItem,
)
from app.seed import seed
from app.seed_demo import (
    DEMO_BOOKINGS,
    DEMO_ITEMS,
    DEMO_ORDERS,
    DEMO_SERVICE_JOBS,
    DEMO_USERS,
    seed_demo,
)

DEMO_EMAILS = {email for _, _, email in DEMO_USERS}
DEMO_TABLES = (
    User, Item, Warehouse, StockLevel, Machinery, ServiceJob,
    JobPartUsed, CompletedProject, WebsiteOrder, WebsiteOrderItem, DemoBooking,
)


@pytest.fixture
def demo_db():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    db = Session()
    seed(db)  # roles + permissions + owner, so demo logins have roles to bind to
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


@pytest.fixture
def demo_flag(monkeypatch):
    monkeypatch.setattr(settings, "seed_demo_data", True)


def _counts(db):
    return {m: db.execute(select(func.count()).select_from(m)).scalar_one() for m in DEMO_TABLES}


def test_noop_when_flag_unset(demo_db):
    assert settings.seed_demo_data is False  # default guards real deployments
    before = _counts(demo_db)
    seed_demo(demo_db)
    assert _counts(demo_db) == before
    # No demo logins, no items — nothing beyond what seed() created.
    assert demo_db.execute(
        select(func.count()).select_from(User).where(User.email.in_(DEMO_EMAILS))
    ).scalar_one() == 0
    assert demo_db.execute(select(func.count()).select_from(Item)).scalar_one() == 0


def test_populates_when_flag_set(demo_db, demo_flag):
    seed_demo(demo_db)

    # One login per remaining role (owner already seeded by seed()).
    for role_name, _, email in DEMO_USERS:
        user = demo_db.execute(select(User).where(User.email == email)).scalar_one()
        assert user.role.name == role_name
        assert user.active is True

    # Items include both spares and tools.
    items = list(demo_db.execute(select(Item)).scalars())
    assert len(items) == len(DEMO_ITEMS)
    assert any(i.is_spare for i in items) and any(i.is_tool for i in items)

    # Two warehouses, with a stock level per item/warehouse pair.
    assert demo_db.execute(select(func.count()).select_from(Warehouse)).scalar_one() == 2
    assert (
        demo_db.execute(select(func.count()).select_from(StockLevel)).scalar_one()
        == len(DEMO_ITEMS) * 2
    )

    # Machinery with brochure paths + QR codes.
    machines = list(demo_db.execute(select(Machinery)).scalars())
    assert machines and all(m.brochure_path and m.qr_code for m in machines)

    # Service jobs cover every status, and carry job_parts_used.
    job_statuses = {
        j.status for j in demo_db.execute(select(ServiceJob)).scalars()
    }
    assert job_statuses == {"open", "in_progress", "completed", "billed"}
    assert demo_db.execute(select(func.count()).select_from(JobPartUsed)).scalar_one() > 0

    # completed_projects for the gallery.
    assert demo_db.execute(
        select(func.count()).select_from(CompletedProject)
    ).scalar_one() > 0

    # Website orders cover every status, and carry line items.
    order_statuses = {
        o.status for o in demo_db.execute(select(WebsiteOrder)).scalars()
    }
    assert order_statuses == {"pending", "confirmed", "synced_to_tally"}
    assert demo_db.execute(
        select(func.count()).select_from(WebsiteOrderItem)
    ).scalar_one() > 0

    # A few demo bookings, each tied to a machinery row.
    bookings = list(demo_db.execute(select(DemoBooking)).scalars())
    assert bookings and all(b.machinery_id is not None for b in bookings)


def test_rerun_is_idempotent(demo_db, demo_flag):
    seed_demo(demo_db)
    after_first = _counts(demo_db)
    seed_demo(demo_db)
    seed_demo(demo_db)
    assert _counts(demo_db) == after_first

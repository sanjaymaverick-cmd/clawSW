"""Tables must match docs/BLUEPRINT.md section 5 exactly.

Phase 0: users, roles, permissions
Phase 1: items, warehouses, stock_levels, stock_moves
Phase 2: service_jobs, job_parts_used (+ machinery table only, as the
         FK target of service_jobs.machine_id — its endpoints are Phase 4)
Phase 4: completed_projects, website_orders, website_order_items,
         demo_bookings
Phase 5: tally_sync_log
Phase 6: audit_log
Phase 9: login_attempts (brute-force lockout state — not in the blueprint's
         section-5 schema; added to close the login rate-limiting gap)
"""
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    ARRAY,
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

# NUMERIC columns per the blueprint; asdecimal=False keeps the Python/JSON
# side as plain numbers while the database column type stays NUMERIC.
NUMERIC = Numeric(asdecimal=False)

# TEXT[] per the blueprint on Postgres; the SQLite test database has no
# array type, so it stores the same list as JSON there.
TEXT_ARRAY = ARRAY(Text).with_variant(JSON(), "sqlite")

# JSONB per the blueprint on Postgres; plain JSON on the SQLite test database.
JSONB_ = JSON().with_variant(JSONB(), "postgresql")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    permissions: Mapped[list["Permission"]] = relationship(back_populates="role")
    users: Mapped[list["User"]] = relationship(back_populates="role")


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id"), nullable=False)
    resource: Mapped[str] = mapped_column(Text, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)

    role: Mapped[Role] = relationship(back_populates="permissions")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id"), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )

    role: Mapped[Role] = relationship(back_populates="users")


class Item(Base):
    __tablename__ = "items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    sku: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(Text)
    unit: Mapped[str | None] = mapped_column(Text)
    price: Mapped[float] = mapped_column(NUMERIC, nullable=False, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_spare: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_tool: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    description: Mapped[str | None] = mapped_column(Text)
    image_path: Mapped[str | None] = mapped_column(Text)


class Warehouse(Base):
    __tablename__ = "warehouses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str | None] = mapped_column(Text)


class StockLevel(Base):
    __tablename__ = "stock_levels"
    __table_args__ = (UniqueConstraint("item_id", "warehouse_id"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("items.id"), nullable=False)
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("warehouses.id"), nullable=False
    )
    quantity: Mapped[float] = mapped_column(NUMERIC, nullable=False, default=0)

    item: Mapped[Item] = relationship()
    warehouse: Mapped[Warehouse] = relationship()


class StockMove(Base):
    __tablename__ = "stock_moves"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("items.id"), nullable=False)
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("warehouses.id"), nullable=False
    )
    # Signed: positive = stock into the warehouse, negative = out, so
    # SUM(quantity) per (item, warehouse) always reproduces stock_levels.
    quantity: Mapped[float] = mapped_column(NUMERIC, nullable=False)
    move_type: Mapped[str] = mapped_column(Text, nullable=False)  # 'in','out','transfer','service_use'
    reference_type: Mapped[str | None] = mapped_column(Text)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )

    item: Mapped[Item] = relationship()
    warehouse: Mapped[Warehouse] = relationship()
    creator: Mapped[User] = relationship()


class Machinery(Base):
    __tablename__ = "machinery"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    brochure_path: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(Text)
    qr_code: Mapped[str | None] = mapped_column(Text, unique=True)


class ServiceJob(Base):
    __tablename__ = "service_jobs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    customer_name: Mapped[str] = mapped_column(Text, nullable=False)
    machine_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("machinery.id"))
    assigned_technician_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        Text, nullable=False, default="open"
    )  # 'open','in_progress','completed','billed'
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    machine: Mapped[Machinery | None] = relationship()
    technician: Mapped[User] = relationship()
    parts_used: Mapped[list["JobPartUsed"]] = relationship(back_populates="job")


class JobPartUsed(Base):
    __tablename__ = "job_parts_used"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("service_jobs.id"), nullable=False
    )
    item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("items.id"), nullable=False)
    quantity: Mapped[float] = mapped_column(NUMERIC, nullable=False)

    job: Mapped[ServiceJob] = relationship(back_populates="parts_used")
    item: Mapped[Item] = relationship()


class CompletedProject(Base):
    __tablename__ = "completed_projects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    image_paths: Mapped[list[str] | None] = mapped_column(TEXT_ARRAY)
    client_name: Mapped[str | None] = mapped_column(Text)
    date_completed: Mapped[date | None] = mapped_column(Date)


class WebsiteOrder(Base):
    __tablename__ = "website_orders"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    customer_name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        Text, nullable=False, default="pending"
    )  # 'pending','confirmed','synced_to_tally'
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )

    items: Mapped[list["WebsiteOrderItem"]] = relationship(back_populates="order")


class WebsiteOrderItem(Base):
    __tablename__ = "website_order_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("website_orders.id"), nullable=False
    )
    item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("items.id"), nullable=False)
    quantity: Mapped[float] = mapped_column(NUMERIC, nullable=False)
    price_at_order: Mapped[float] = mapped_column(NUMERIC, nullable=False)

    order: Mapped[WebsiteOrder] = relationship(back_populates="items")
    item: Mapped[Item] = relationship()


class TallySyncLog(Base):
    __tablename__ = "tally_sync_log"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    direction: Mapped[str] = mapped_column(Text, nullable=False)  # 'to_tally','from_tally'
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)  # e.g. 'website_order'
    entity_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    status: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # 'success','failed','payment_received'
    error_message: Mapped[str | None] = mapped_column(Text)
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class AuditLog(Base):
    """Written automatically by app/audit.py on every flush that touches an
    audited table, plus explicit boundary events via audit.record_event()
    (e.g. AI queries) — never constructed in route handlers directly."""

    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Nullable: public-website writes and worker processes have no user.
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(Text, nullable=False)  # 'create','update','delete'
    resource: Mapped[str] = mapped_column(Text, nullable=False)  # audited table name
    resource_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(Text)
    payload_snapshot: Mapped[dict | None] = mapped_column(JSONB_)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, index=True
    )

    user: Mapped[User | None] = relationship()


class LoginAttempt(Base):
    """Phase 9 — brute-force lockout state for /auth/login, one row per
    (email, client IP). Written by app/ratelimit.py, never a business
    record, so it is deliberately NOT one of the audited tables — it churns
    on every failed login and carries no data worth an audit trail."""

    __tablename__ = "login_attempts"
    __table_args__ = (UniqueConstraint("email", "ip_address"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Email is lowercased and IP defaults to 'unknown' before storage so the
    # (email, ip_address) key is stable and never NULL.
    email: Mapped[str] = mapped_column(Text, nullable=False)
    ip_address: Mapped[str] = mapped_column(Text, nullable=False)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Set once failed_count crosses the threshold; NULL means not locked.
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class DemoBooking(Base):
    __tablename__ = "demo_bookings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    customer_name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str | None] = mapped_column(Text)
    machinery_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("machinery.id"), nullable=False
    )
    preferred_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(
        Text, nullable=False, default="pending"
    )  # 'pending','confirmed','cancelled'

    machinery: Mapped[Machinery] = relationship()

"""Tables must match docs/BLUEPRINT.md section 5 exactly.

Phase 0: users, roles, permissions
Phase 1: items, warehouses, stock_levels, stock_moves
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

# NUMERIC columns per the blueprint; asdecimal=False keeps the Python/JSON
# side as plain numbers while the database column type stays NUMERIC.
NUMERIC = Numeric(asdecimal=False)


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

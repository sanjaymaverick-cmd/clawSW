import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    role: str
    active: bool
    created_at: datetime


class PermissionOut(BaseModel):
    resource: str
    action: str


class MeResponse(UserOut):
    permissions: list[PermissionOut]


class UserCreate(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)
    role: str


class UserUpdate(BaseModel):
    name: str | None = None
    password: str | None = Field(default=None, min_length=8)
    role: str | None = None
    active: bool | None = None


# ---- Phase 1: inventory ----

class ItemBase(BaseModel):
    sku: str = Field(min_length=1)
    name: str = Field(min_length=1)
    category: str | None = None
    unit: str | None = None
    price: float = Field(default=0, ge=0)
    reorder_level: int = Field(default=0, ge=0)
    is_spare: bool = False
    is_tool: bool = False
    description: str | None = None
    image_path: str | None = None


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    sku: str | None = Field(default=None, min_length=1)
    name: str | None = Field(default=None, min_length=1)
    category: str | None = None
    unit: str | None = None
    price: float | None = Field(default=None, ge=0)
    reorder_level: int | None = Field(default=None, ge=0)
    is_spare: bool | None = None
    is_tool: bool | None = None
    description: str | None = None
    image_path: str | None = None


class ItemOut(ItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class WarehouseCreate(BaseModel):
    name: str = Field(min_length=1)
    location: str | None = None


class WarehouseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    location: str | None = None


class WarehouseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    location: str | None


class StockLevelOut(BaseModel):
    item_id: uuid.UUID
    sku: str
    item_name: str
    warehouse_id: uuid.UUID
    warehouse_name: str
    quantity: float
    reorder_level: int
    below_reorder: bool


class StockAdjustRequest(BaseModel):
    item_id: uuid.UUID
    warehouse_id: uuid.UUID
    move_type: str = Field(pattern="^(in|out)$")
    quantity: float = Field(gt=0)


class StockTransferRequest(BaseModel):
    item_id: uuid.UUID
    from_warehouse_id: uuid.UUID
    to_warehouse_id: uuid.UUID
    quantity: float = Field(gt=0)


class StockMoveOut(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    sku: str
    item_name: str
    warehouse_id: uuid.UUID
    warehouse_name: str
    quantity: float
    move_type: str
    reference_type: str | None
    reference_id: uuid.UUID | None
    created_by_name: str
    created_at: datetime


# ---- Phase 2: service module ----

JOB_STATUSES = ("open", "in_progress", "completed", "billed")


class ServiceJobCreate(BaseModel):
    customer_name: str = Field(min_length=1)
    assigned_technician_id: uuid.UUID
    machine_id: uuid.UUID | None = None
    description: str | None = None


class ServiceJobUpdate(BaseModel):
    customer_name: str | None = Field(default=None, min_length=1)
    assigned_technician_id: uuid.UUID | None = None
    machine_id: uuid.UUID | None = None
    description: str | None = None
    status: str | None = Field(default=None, pattern="^(open|in_progress|completed|billed)$")


class ServiceJobOut(BaseModel):
    id: uuid.UUID
    customer_name: str
    machine_id: uuid.UUID | None
    machine_name: str | None
    assigned_technician_id: uuid.UUID
    technician_name: str
    status: str
    description: str | None
    created_at: datetime
    completed_at: datetime | None


class TechnicianOut(BaseModel):
    id: uuid.UUID
    name: str


class JobPartCreate(BaseModel):
    item_id: uuid.UUID
    warehouse_id: uuid.UUID
    quantity: float = Field(gt=0)


class JobPartOut(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    sku: str
    item_name: str
    unit: str | None
    quantity: float


# ---- Phase 3: role dashboards / reports ----

class LowStockRow(BaseModel):
    sku: str
    name: str
    total_quantity: float
    reorder_level: int


class StockReport(BaseModel):
    total_items: int
    total_warehouses: int
    total_stock_value: float
    low_stock: list[LowStockRow]
    moves_last_7_days: int


class TechnicianOpenRow(BaseModel):
    technician_name: str
    open_jobs: int


class ServiceReport(BaseModel):
    jobs_by_status: dict[str, int]
    open_by_technician: list[TechnicianOpenRow]
    avg_completion_hours: float | None
    parts_used_value: float


class FinancialReport(BaseModel):
    # Placeholder financials until Phase 5 brings real invoices via Tally.
    billed_jobs: int
    billed_parts_value: float
    stock_value: float


class PeopleReport(BaseModel):
    active_users: int
    users_by_role: dict[str, int]


class ReportSummary(BaseModel):
    """Sections are present only when the caller's role holds reports:read
    plus read on the section's underlying resource — scoping comes from the
    permissions table, never from role names."""

    stock: StockReport | None = None
    service: ServiceReport | None = None
    financial: FinancialReport | None = None
    people: PeopleReport | None = None


# ---- Phase 4: public website ----

ORDER_STATUSES = ("pending", "confirmed", "synced_to_tally")
BOOKING_STATUSES = ("pending", "confirmed", "cancelled")


class CatalogItemOut(BaseModel):
    """Public projection of `items` for the website catalog.

    Blueprint section 6: only is_spare/is_tool items, only sale-facing
    fields — internal fields (reorder levels, exact stock counts) stay off
    the wire; availability is a boolean.
    """

    id: uuid.UUID
    sku: str
    name: str
    category: str | None
    unit: str | None
    price: float
    is_spare: bool
    is_tool: bool
    description: str | None
    image_path: str | None
    in_stock: bool


class MachineryCreate(BaseModel):
    name: str = Field(min_length=1)
    brochure_path: str | None = None
    category: str | None = None
    qr_code: str | None = None


class MachineryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    brochure_path: str | None = None
    category: str | None = None
    qr_code: str | None = None


class MachineryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    brochure_path: str | None
    category: str | None
    qr_code: str | None


class PublicMachineryOut(BaseModel):
    """Public projection of `machinery` — qr_code stays internal."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    brochure_path: str | None
    category: str | None


class CompletedProjectCreate(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    image_paths: list[str] | None = None
    client_name: str | None = None
    date_completed: date | None = None


class CompletedProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    description: str | None = None
    image_paths: list[str] | None = None
    client_name: str | None = None
    date_completed: date | None = None


class CompletedProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    image_paths: list[str] | None
    client_name: str | None
    date_completed: date | None


class OrderItemIn(BaseModel):
    item_id: uuid.UUID
    quantity: float = Field(gt=0)


class WebsiteOrderCreate(BaseModel):
    customer_name: str = Field(min_length=1)
    email: EmailStr
    phone: str | None = None
    items: list[OrderItemIn] = Field(min_length=1)


class WebsiteOrderItemOut(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    sku: str
    item_name: str
    quantity: float
    price_at_order: float


class WebsiteOrderOut(BaseModel):
    id: uuid.UUID
    customer_name: str
    email: EmailStr
    phone: str | None
    status: str
    created_at: datetime
    items: list[WebsiteOrderItemOut]
    total: float


class OrderConfirmRequest(BaseModel):
    # The warehouse the confirmed order's stock is deducted from.
    warehouse_id: uuid.UUID


class DemoBookingCreate(BaseModel):
    customer_name: str = Field(min_length=1)
    email: EmailStr
    phone: str | None = None
    machinery_id: uuid.UUID
    preferred_date: date | None = None


class DemoBookingUpdate(BaseModel):
    status: str = Field(pattern="^(pending|confirmed|cancelled)$")


class DemoBookingOut(BaseModel):
    id: uuid.UUID
    customer_name: str
    email: EmailStr
    phone: str | None
    machinery_id: uuid.UUID
    machinery_name: str
    preferred_date: date | None
    status: str


class PublicOrderReceipt(BaseModel):
    """What the public order/booking endpoints return: enough for the
    customer to reference their request, nothing internal."""

    id: uuid.UUID
    status: str
    total: float


class PublicBookingReceipt(BaseModel):
    id: uuid.UUID
    status: str

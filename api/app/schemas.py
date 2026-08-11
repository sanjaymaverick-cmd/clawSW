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
    kind: str = Field(default="main", pattern="^(main|van|branch)$")
    assigned_user_id: uuid.UUID | None = None


class WarehouseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    location: str | None = None
    kind: str | None = Field(default=None, pattern="^(main|van|branch)$")
    assigned_user_id: uuid.UUID | None = None


class WarehouseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    location: str | None
    kind: str = "main"
    assigned_user_id: uuid.UUID | None = None


class StockLevelOut(BaseModel):
    item_id: uuid.UUID
    sku: str
    item_name: str
    warehouse_id: uuid.UUID
    warehouse_name: str
    warehouse_kind: str = "main"
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


# ---- CEO / owner executive dashboard ----

class CeoFinancialMetrics(BaseModel):
    """Core financial picture from ops data (pre-full Tally P&L)."""

    stock_capital: float
    billed_jobs: int
    billed_parts_value: float
    website_gmv_all: float
    website_gmv_30d: float
    website_gmv_7d: float
    pending_order_value: float
    confirmed_not_synced_value: float
    pipeline_value: float  # pending + confirmed (not yet synced)


class CeoOperationalKpis(BaseModel):
    open_service_jobs: int
    in_progress_jobs: int
    completed_jobs: int
    billed_jobs: int
    service_completion_rate_pct: float | None
    avg_completion_hours: float | None
    parts_used_value: float
    low_stock_skus: int
    stock_moves_7d: int
    website_orders_pending: int
    website_orders_30d: int
    demo_bookings_pending: int
    demo_bookings_30d: int
    active_users: int
    van_low_stock_skus: int = 0
    stock_main_value: float = 0
    stock_van_value: float = 0


class CeoGrowthSeriesPoint(BaseModel):
    day: str  # YYYY-MM-DD
    website_orders: int
    website_gmv: float
    service_jobs_opened: int
    stock_moves: int


class CeoRiskItem(BaseModel):
    id: str
    severity: str  # critical | high | medium | low
    category: str
    title: str
    detail: str
    metric: float | None = None
    action_hint: str | None = None


class CeoPrediction(BaseModel):
    id: str
    horizon: str
    title: str
    estimate: str
    confidence: str  # high | medium | low
    basis: str


class CeoInsight(BaseModel):
    id: str
    tone: str  # positive | warning | neutral | critical
    title: str
    body: str


class CeoReceivablesSummary(BaseModel):
    overdue_total: float
    overdue_count: int
    bucket_0_30: float
    bucket_31_60: float
    bucket_60_plus: float
    upcoming_total: float


class CeoImportsSummary(BaseModel):
    total: int
    delayed_or_hold: int
    on_water: int
    value_at_risk: float


class CeoProjectsSummary(BaseModel):
    active_count: int
    pipeline_boq_value: float
    lowest_margin_pct: float | None
    lowest_margin_customer: str | None


class CeoMaintenanceRisk(BaseModel):
    machinery_id: str
    name: str
    risk_score: int
    reason: str


class CeoMaintenanceSummary(BaseModel):
    elevated_count: int
    top_risks: list[CeoMaintenanceRisk]


class CeoServiceCity(BaseModel):
    city: str
    open_jobs: int
    type: str = "city"  # city | hq | branch


class CeoSnapshot(BaseModel):
    """Owner/CEO executive view — aggregates only, no customer PII rows."""

    generated_at: str
    financial: CeoFinancialMetrics
    operational: CeoOperationalKpis
    series_14d: list[CeoGrowthSeriesPoint]
    risks: list[CeoRiskItem]
    predictions: list[CeoPrediction]
    insights: list[CeoInsight]
    health_score: int  # 0-100 composite
    tally: dict  # gateway_reachable, pending_push, failed_push, last_push_at
    receivables: CeoReceivablesSummary | None = None
    imports: CeoImportsSummary | None = None
    projects: CeoProjectsSummary | None = None
    maintenance: CeoMaintenanceSummary | None = None
    service_map: list[CeoServiceCity] = []


# ---- Imports / projects ----

class ImportContainerCreate(BaseModel):
    code: str = Field(min_length=1)
    origin: str | None = None
    port: str | None = None
    supplier: str | None = None
    eta_port: date | None = None
    status: str = "On Water"
    milestone: str | None = None
    value_inr: float = 0
    delay_days: int = 0
    machine_count: int = 0
    notes: str | None = None


class ImportContainerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    origin: str | None
    port: str | None
    supplier: str | None
    eta_port: date | None
    status: str
    milestone: str | None
    value_inr: float
    delay_days: int
    machine_count: int
    notes: str | None
    created_at: datetime


class ProjectCreate(BaseModel):
    code: str = Field(min_length=1)
    customer_name: str = Field(min_length=1)
    city: str | None = None
    stage: str = "Quote"
    boq_value: float = 0
    margin_pct: float = 0
    target_install: date | None = None
    status: str = "active"


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    customer_name: str
    city: str | None
    stage: str
    boq_value: float
    margin_pct: float
    target_install: date | None
    status: str
    created_at: datetime


class ReceivableOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    party_ref: str | None
    party_name: str
    amount: float
    due_date: date | None
    days_overdue: int
    status: str
    source: str
    entity_type: str | None
    entity_id: uuid.UUID | None
    captured_at: datetime


class MachinePassportOut(BaseModel):
    id: uuid.UUID
    name: str
    category: str | None
    qr_code: str | None
    brochure_path: str | None
    installed_at: date | None
    city: str | None
    customer_name: str | None
    service_job_count: int
    open_job_count: int
    parts_value: float
    risk_score: int
    risk_reason: str


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


# ---- Phase 5: Tally sync ----

SYNC_DIRECTIONS = ("to_tally", "from_tally")
SYNC_STATUSES = ("success", "failed", "payment_received")


class TallySyncLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    direction: str
    entity_type: str
    entity_id: uuid.UUID
    status: str
    error_message: str | None
    synced_at: datetime


class TallyStatusOut(BaseModel):
    gateway_reachable: bool
    pending_push_count: int
    synced_order_count: int
    failed_push_count: int
    last_push_at: datetime | None


# ---- Phase 6: audit log ----

class AuditLogOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    # None = write without a signed-in user (public website, bridge worker).
    user_name: str | None
    action: str
    resource: str
    resource_id: uuid.UUID
    ip_address: str | None
    payload_snapshot: dict | None
    created_at: datetime


class PublicOrderReceipt(BaseModel):
    """What the public order/booking endpoints return: enough for the
    customer to reference their request, nothing internal."""

    id: uuid.UUID
    status: str
    total: float


class PublicBookingReceipt(BaseModel):
    id: uuid.UUID
    status: str


# ---- Phase 7: AI query ----

class AiQueryRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    # Financial aggregates are only sent when this is True AND the caller
    # is the owner — enforced in app/ai_query.py, not just here.
    include_financial: bool = False


class AiQueryResponse(BaseModel):
    answer: str
    # Which aggregate sections were sent to the model, so the dashboard
    # can show "this used aggregated inventory + service_jobs data".
    resources_used: list[str]
    financial_included: bool

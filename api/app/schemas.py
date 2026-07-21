import uuid
from datetime import datetime

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

"""Phase 1 — items, warehouses, stock levels, stock moves.

All routes are gated on the ('inventory', read/write) rows of the
permissions table. Stock is only ever changed through moves: every
adjustment/transfer writes signed stock_moves rows and updates
stock_levels in the same transaction.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_permission
from ..models import Item, StockLevel, StockMove, User, Warehouse
from ..schemas import (
    ItemCreate,
    ItemOut,
    ItemUpdate,
    StockAdjustRequest,
    StockLevelOut,
    StockMoveOut,
    StockTransferRequest,
    WarehouseCreate,
    WarehouseOut,
    WarehouseUpdate,
)

router = APIRouter(tags=["inventory"])

read_inventory = require_permission("inventory", "read")
write_inventory = require_permission("inventory", "write")


def _get_or_404(db: Session, model, entity_id: uuid.UUID, label: str):
    obj = db.get(model, entity_id)
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} not found"
        )
    return obj


# ---- items ----

@router.get("/items", response_model=list[ItemOut])
def list_items(
    db: Session = Depends(get_db),
    _: User = Depends(read_inventory),
    category: str | None = None,
):
    query = select(Item).order_by(Item.sku)
    if category:
        query = query.where(Item.category == category)
    return list(db.execute(query).scalars())


@router.post("/items", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    body: ItemCreate,
    db: Session = Depends(get_db),
    _: User = Depends(write_inventory),
):
    if db.execute(select(Item.id).where(Item.sku == body.sku)).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An item with SKU '{body.sku}' already exists",
        )
    item = Item(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/items/{item_id}", response_model=ItemOut)
def get_item(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(read_inventory),
):
    return _get_or_404(db, Item, item_id, "Item")


@router.patch("/items/{item_id}", response_model=ItemOut)
def update_item(
    item_id: uuid.UUID,
    body: ItemUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(write_inventory),
):
    item = _get_or_404(db, Item, item_id, "Item")
    changes = body.model_dump(exclude_unset=True)
    new_sku = changes.get("sku")
    if new_sku and new_sku != item.sku:
        if db.execute(select(Item.id).where(Item.sku == new_sku)).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An item with SKU '{new_sku}' already exists",
            )
    for field, value in changes.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(write_inventory),
):
    item = _get_or_404(db, Item, item_id, "Item")
    has_moves = db.execute(
        select(StockMove.id).where(StockMove.item_id == item_id).limit(1)
    ).first()
    if has_moves:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Item has stock movement history and cannot be deleted",
        )
    db.execute(
        StockLevel.__table__.delete().where(StockLevel.item_id == item_id)
    )
    db.delete(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Item is referenced elsewhere and cannot be deleted",
        )


# ---- warehouses ----

@router.get("/warehouses", response_model=list[WarehouseOut])
def list_warehouses(
    db: Session = Depends(get_db),
    _: User = Depends(read_inventory),
):
    return list(db.execute(select(Warehouse).order_by(Warehouse.name)).scalars())


@router.post(
    "/warehouses", response_model=WarehouseOut, status_code=status.HTTP_201_CREATED
)
def create_warehouse(
    body: WarehouseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(write_inventory),
):
    warehouse = Warehouse(**body.model_dump())
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.patch("/warehouses/{warehouse_id}", response_model=WarehouseOut)
def update_warehouse(
    warehouse_id: uuid.UUID,
    body: WarehouseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(write_inventory),
):
    warehouse = _get_or_404(db, Warehouse, warehouse_id, "Warehouse")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(warehouse, field, value)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.delete("/warehouses/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_warehouse(
    warehouse_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(write_inventory),
):
    warehouse = _get_or_404(db, Warehouse, warehouse_id, "Warehouse")
    has_moves = db.execute(
        select(StockMove.id).where(StockMove.warehouse_id == warehouse_id).limit(1)
    ).first()
    has_stock = db.execute(
        select(StockLevel.id)
        .where(StockLevel.warehouse_id == warehouse_id, StockLevel.quantity != 0)
        .limit(1)
    ).first()
    if has_moves or has_stock:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Warehouse has stock or movement history and cannot be deleted",
        )
    db.execute(
        StockLevel.__table__.delete().where(StockLevel.warehouse_id == warehouse_id)
    )
    db.delete(warehouse)
    db.commit()


# ---- stock ----

def _locked_level(
    db: Session, item_id: uuid.UUID, warehouse_id: uuid.UUID
) -> StockLevel:
    """Fetch-or-create the stock_levels row, row-locked on Postgres."""
    level = db.execute(
        select(StockLevel)
        .where(
            StockLevel.item_id == item_id,
            StockLevel.warehouse_id == warehouse_id,
        )
        .with_for_update()
    ).scalar_one_or_none()
    if level is None:
        level = StockLevel(item_id=item_id, warehouse_id=warehouse_id, quantity=0)
        db.add(level)
        db.flush()
    return level


@router.get("/stock", response_model=list[StockLevelOut])
def list_stock(
    db: Session = Depends(get_db),
    _: User = Depends(read_inventory),
    warehouse_id: uuid.UUID | None = None,
    item_id: uuid.UUID | None = None,
):
    query = (
        select(StockLevel, Item, Warehouse)
        .join(Item, StockLevel.item_id == Item.id)
        .join(Warehouse, StockLevel.warehouse_id == Warehouse.id)
        .order_by(Item.sku, Warehouse.name)
    )
    if warehouse_id:
        query = query.where(StockLevel.warehouse_id == warehouse_id)
    if item_id:
        query = query.where(StockLevel.item_id == item_id)
    return [
        StockLevelOut(
            item_id=level.item_id,
            sku=item.sku,
            item_name=item.name,
            warehouse_id=level.warehouse_id,
            warehouse_name=warehouse.name,
            quantity=level.quantity,
            reorder_level=item.reorder_level,
            below_reorder=level.quantity <= item.reorder_level,
        )
        for level, item, warehouse in db.execute(query)
    ]


@router.post("/stock/adjust", response_model=StockLevelOut)
def adjust_stock(
    body: StockAdjustRequest,
    db: Session = Depends(get_db),
    user: User = Depends(write_inventory),
):
    item = _get_or_404(db, Item, body.item_id, "Item")
    warehouse = _get_or_404(db, Warehouse, body.warehouse_id, "Warehouse")

    signed = body.quantity if body.move_type == "in" else -body.quantity
    level = _locked_level(db, item.id, warehouse.id)
    if level.quantity + signed < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient stock: {level.quantity} on hand at "
                f"'{warehouse.name}', cannot remove {body.quantity}"
            ),
        )
    level.quantity += signed
    db.add(
        StockMove(
            item_id=item.id,
            warehouse_id=warehouse.id,
            quantity=signed,
            move_type=body.move_type,
            created_by=user.id,
        )
    )
    db.commit()
    return StockLevelOut(
        item_id=item.id,
        sku=item.sku,
        item_name=item.name,
        warehouse_id=warehouse.id,
        warehouse_name=warehouse.name,
        quantity=level.quantity,
        reorder_level=item.reorder_level,
        below_reorder=level.quantity <= item.reorder_level,
    )


@router.post("/stock/transfer", response_model=list[StockLevelOut])
def transfer_stock(
    body: StockTransferRequest,
    db: Session = Depends(get_db),
    user: User = Depends(write_inventory),
):
    if body.from_warehouse_id == body.to_warehouse_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination warehouse must differ",
        )
    item = _get_or_404(db, Item, body.item_id, "Item")
    source = _get_or_404(db, Warehouse, body.from_warehouse_id, "Warehouse")
    dest = _get_or_404(db, Warehouse, body.to_warehouse_id, "Warehouse")

    source_level = _locked_level(db, item.id, source.id)
    if source_level.quantity < body.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient stock: {source_level.quantity} on hand at "
                f"'{source.name}', cannot transfer {body.quantity}"
            ),
        )
    dest_level = _locked_level(db, item.id, dest.id)
    source_level.quantity -= body.quantity
    dest_level.quantity += body.quantity

    # Two signed rows sharing one reference id, so the pair stays linked.
    transfer_ref = uuid.uuid4()
    for warehouse_id, signed in (
        (source.id, -body.quantity),
        (dest.id, body.quantity),
    ):
        db.add(
            StockMove(
                item_id=item.id,
                warehouse_id=warehouse_id,
                quantity=signed,
                move_type="transfer",
                reference_type="transfer",
                reference_id=transfer_ref,
                created_by=user.id,
            )
        )
    db.commit()
    return [
        StockLevelOut(
            item_id=item.id,
            sku=item.sku,
            item_name=item.name,
            warehouse_id=warehouse.id,
            warehouse_name=warehouse.name,
            quantity=level.quantity,
            reorder_level=item.reorder_level,
            below_reorder=level.quantity <= item.reorder_level,
        )
        for warehouse, level in ((source, source_level), (dest, dest_level))
    ]


@router.get("/stock/moves", response_model=list[StockMoveOut])
def list_stock_moves(
    db: Session = Depends(get_db),
    _: User = Depends(read_inventory),
    item_id: uuid.UUID | None = None,
    warehouse_id: uuid.UUID | None = None,
    limit: int = Query(default=100, le=500),
):
    query = (
        select(StockMove, Item, Warehouse, User)
        .join(Item, StockMove.item_id == Item.id)
        .join(Warehouse, StockMove.warehouse_id == Warehouse.id)
        .join(User, StockMove.created_by == User.id)
        .order_by(StockMove.created_at.desc())
        .limit(limit)
    )
    if item_id:
        query = query.where(StockMove.item_id == item_id)
    if warehouse_id:
        query = query.where(StockMove.warehouse_id == warehouse_id)
    return [
        StockMoveOut(
            id=move.id,
            item_id=move.item_id,
            sku=item.sku,
            item_name=item.name,
            warehouse_id=move.warehouse_id,
            warehouse_name=warehouse.name,
            quantity=move.quantity,
            move_type=move.move_type,
            reference_type=move.reference_type,
            reference_id=move.reference_id,
            created_by_name=creator.name,
            created_at=move.created_at,
        )
        for move, item, warehouse, creator in db.execute(query)
    ]

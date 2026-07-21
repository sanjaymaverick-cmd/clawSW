"""Phase 4 — unauthenticated endpoints backing the public website.

Blueprint section 6, "Website ↔ Inventory": the public site reads `items`
through a read-only projection scoped to is_spare/is_tool rows — internal
fields (reorder levels, exact stock counts) are never exposed, stock
availability is a boolean. Orders and demo bookings are the only public
writes; both land as 'pending' rows for staff to act on, and stock is NOT
touched here — deduction happens when staff confirm the order (see
routers/website.py), logged as a stock_move with
reference_type='website_order'.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (
    CompletedProject,
    DemoBooking,
    Item,
    Machinery,
    StockLevel,
    WebsiteOrder,
    WebsiteOrderItem,
)
from ..schemas import (
    CatalogItemOut,
    CompletedProjectOut,
    DemoBookingCreate,
    PublicBookingReceipt,
    PublicMachineryOut,
    PublicOrderReceipt,
    WebsiteOrderCreate,
)

router = APIRouter(prefix="/public", tags=["public website"])


def _public_items_query():
    return select(Item).where(Item.is_spare.is_(True) | Item.is_tool.is_(True))


@router.get("/catalog", response_model=list[CatalogItemOut])
def public_catalog(
    db: Session = Depends(get_db),
    category: str | None = None,
):
    query = _public_items_query().order_by(Item.name)
    if category:
        query = query.where(Item.category == category)
    items = list(db.execute(query).scalars())

    totals = dict(
        db.execute(
            select(StockLevel.item_id, func.sum(StockLevel.quantity)).group_by(
                StockLevel.item_id
            )
        ).all()
    )
    return [
        CatalogItemOut(
            id=item.id,
            sku=item.sku,
            name=item.name,
            category=item.category,
            unit=item.unit,
            price=item.price,
            is_spare=item.is_spare,
            is_tool=item.is_tool,
            description=item.description,
            image_path=item.image_path,
            in_stock=(totals.get(item.id) or 0) > 0,
        )
        for item in items
    ]


@router.get("/machinery", response_model=list[PublicMachineryOut])
def public_machinery(
    db: Session = Depends(get_db),
    category: str | None = None,
):
    query = select(Machinery).order_by(Machinery.name)
    if category:
        query = query.where(Machinery.category == category)
    return list(db.execute(query).scalars())


@router.get("/projects", response_model=list[CompletedProjectOut])
def public_projects(db: Session = Depends(get_db)):
    return list(
        db.execute(
            select(CompletedProject).order_by(
                CompletedProject.date_completed.desc().nulls_last()
            )
        ).scalars()
    )


@router.post(
    "/orders", response_model=PublicOrderReceipt, status_code=status.HTTP_201_CREATED
)
def create_order(body: WebsiteOrderCreate, db: Session = Depends(get_db)):
    # Only catalog items are orderable; price is snapshotted at order time.
    item_ids = [line.item_id for line in body.items]
    if len(set(item_ids)) != len(item_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate item in order",
        )
    items: dict[uuid.UUID, Item] = {
        i.id: i
        for i in db.execute(
            _public_items_query().where(Item.id.in_(item_ids))
        ).scalars()
    }
    missing = [str(i) for i in item_ids if i not in items]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Item(s) not available for order: {', '.join(missing)}",
        )

    order = WebsiteOrder(
        customer_name=body.customer_name,
        email=body.email,
        phone=body.phone,
        status="pending",
    )
    db.add(order)
    db.flush()
    total = 0.0
    for line in body.items:
        item = items[line.item_id]
        db.add(
            WebsiteOrderItem(
                order_id=order.id,
                item_id=item.id,
                quantity=line.quantity,
                price_at_order=item.price,
            )
        )
        total += item.price * line.quantity
    db.commit()
    return PublicOrderReceipt(id=order.id, status=order.status, total=total)


@router.post(
    "/demo-bookings",
    response_model=PublicBookingReceipt,
    status_code=status.HTTP_201_CREATED,
)
def create_demo_booking(body: DemoBookingCreate, db: Session = Depends(get_db)):
    if db.get(Machinery, body.machinery_id) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Machinery not found",
        )
    booking = DemoBooking(
        customer_name=body.customer_name,
        email=body.email,
        phone=body.phone,
        machinery_id=body.machinery_id,
        preferred_date=body.preferred_date,
        status="pending",
    )
    db.add(booking)
    db.commit()
    return PublicBookingReceipt(id=booking.id, status=booking.status)

"""Phase 4 — internal management of the public-website module.

Gated on the ('website', read/write) rows of the permissions table:
machinery catalog and completed-projects content, incoming website orders,
and demo bookings.

Confirming an order is the blueprint's "background job" moment (section 6):
in one transaction the order flips 'pending' → 'confirmed', stock_levels
are decremented at the chosen warehouse, and a signed stock_move with
reference_type='website_order' is written per line — so the ledger always
reconciles. The 'synced_to_tally' status is set by the Phase 5 Tally
bridge, not here.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_permission
from ..models import (
    CompletedProject,
    DemoBooking,
    Item,
    Machinery,
    ServiceJob,
    StockMove,
    User,
    Warehouse,
    WebsiteOrder,
    WebsiteOrderItem,
)
from ..routers.inventory import _locked_level
from ..schemas import (
    CompletedProjectCreate,
    CompletedProjectOut,
    CompletedProjectUpdate,
    DemoBookingOut,
    DemoBookingUpdate,
    MachineryCreate,
    MachineryOut,
    MachineryUpdate,
    OrderConfirmRequest,
    WebsiteOrderItemOut,
    WebsiteOrderOut,
)

router = APIRouter(prefix="/website", tags=["website admin"])

read_website = require_permission("website", "read")
write_website = require_permission("website", "write")


def _get_or_404(db: Session, model, entity_id: uuid.UUID, label: str):
    obj = db.get(model, entity_id)
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} not found"
        )
    return obj


# ---- machinery catalog ----

@router.get("/machinery", response_model=list[MachineryOut])
def list_machinery(
    db: Session = Depends(get_db),
    _: User = Depends(read_website),
):
    return list(db.execute(select(Machinery).order_by(Machinery.name)).scalars())


@router.post(
    "/machinery", response_model=MachineryOut, status_code=status.HTTP_201_CREATED
)
def create_machinery(
    body: MachineryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(write_website),
):
    if body.qr_code and db.execute(
        select(Machinery.id).where(Machinery.qr_code == body.qr_code)
    ).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"QR code '{body.qr_code}' is already assigned",
        )
    machine = Machinery(**body.model_dump())
    db.add(machine)
    db.commit()
    db.refresh(machine)
    return machine


@router.patch("/machinery/{machinery_id}", response_model=MachineryOut)
def update_machinery(
    machinery_id: uuid.UUID,
    body: MachineryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(write_website),
):
    machine = _get_or_404(db, Machinery, machinery_id, "Machinery")
    changes = body.model_dump(exclude_unset=True)
    new_qr = changes.get("qr_code")
    if new_qr and new_qr != machine.qr_code:
        if db.execute(
            select(Machinery.id).where(Machinery.qr_code == new_qr)
        ).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"QR code '{new_qr}' is already assigned",
            )
    for field, value in changes.items():
        setattr(machine, field, value)
    db.commit()
    db.refresh(machine)
    return machine


@router.delete("/machinery/{machinery_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_machinery(
    machinery_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(write_website),
):
    machine = _get_or_404(db, Machinery, machinery_id, "Machinery")
    referenced = (
        db.execute(
            select(ServiceJob.id).where(ServiceJob.machine_id == machinery_id).limit(1)
        ).first()
        or db.execute(
            select(DemoBooking.id)
            .where(DemoBooking.machinery_id == machinery_id)
            .limit(1)
        ).first()
    )
    if referenced:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Machinery has service or booking history and cannot be deleted",
        )
    db.delete(machine)
    db.commit()


# ---- completed projects gallery ----

@router.get("/projects", response_model=list[CompletedProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    _: User = Depends(read_website),
):
    return list(
        db.execute(
            select(CompletedProject).order_by(
                CompletedProject.date_completed.desc().nulls_last()
            )
        ).scalars()
    )


@router.post(
    "/projects",
    response_model=CompletedProjectOut,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    body: CompletedProjectCreate,
    db: Session = Depends(get_db),
    _: User = Depends(write_website),
):
    project = CompletedProject(**body.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/projects/{project_id}", response_model=CompletedProjectOut)
def update_project(
    project_id: uuid.UUID,
    body: CompletedProjectUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(write_website),
):
    project = _get_or_404(db, CompletedProject, project_id, "Project")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(write_website),
):
    project = _get_or_404(db, CompletedProject, project_id, "Project")
    db.delete(project)
    db.commit()


# ---- website orders ----

def _order_out(db: Session, order: WebsiteOrder) -> WebsiteOrderOut:
    rows = db.execute(
        select(WebsiteOrderItem, Item)
        .join(Item, WebsiteOrderItem.item_id == Item.id)
        .where(WebsiteOrderItem.order_id == order.id)
    ).all()
    lines = [
        WebsiteOrderItemOut(
            id=line.id,
            item_id=line.item_id,
            sku=item.sku,
            item_name=item.name,
            quantity=line.quantity,
            price_at_order=line.price_at_order,
        )
        for line, item in rows
    ]
    return WebsiteOrderOut(
        id=order.id,
        customer_name=order.customer_name,
        email=order.email,
        phone=order.phone,
        status=order.status,
        created_at=order.created_at,
        items=lines,
        total=sum(l.quantity * l.price_at_order for l in lines),
    )


@router.get("/orders", response_model=list[WebsiteOrderOut])
def list_orders(
    db: Session = Depends(get_db),
    _: User = Depends(read_website),
    status_filter: str | None = None,
):
    query = select(WebsiteOrder).order_by(WebsiteOrder.created_at.desc())
    if status_filter:
        query = query.where(WebsiteOrder.status == status_filter)
    return [_order_out(db, o) for o in db.execute(query).scalars()]


@router.get("/orders/{order_id}", response_model=WebsiteOrderOut)
def get_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(read_website),
):
    return _order_out(db, _get_or_404(db, WebsiteOrder, order_id, "Order"))


@router.post("/orders/{order_id}/confirm", response_model=WebsiteOrderOut)
def confirm_order(
    order_id: uuid.UUID,
    body: OrderConfirmRequest,
    db: Session = Depends(get_db),
    user: User = Depends(write_website),
):
    order = _get_or_404(db, WebsiteOrder, order_id, "Order")
    if order.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order is '{order.status}', only pending orders can be confirmed",
        )
    warehouse = _get_or_404(db, Warehouse, body.warehouse_id, "Warehouse")

    lines = list(
        db.execute(
            select(WebsiteOrderItem).where(WebsiteOrderItem.order_id == order.id)
        ).scalars()
    )
    # All-or-nothing: any shortfall aborts the whole confirmation.
    for line in lines:
        level = _locked_level(db, line.item_id, warehouse.id)
        if level.quantity < line.quantity:
            item = db.get(Item, line.item_id)
            detail = (
                f"Insufficient stock of '{item.sku}' at '{warehouse.name}': "
                f"{level.quantity} on hand, order needs {line.quantity}"
            )
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=detail
            )
        level.quantity -= line.quantity
        db.add(
            StockMove(
                item_id=line.item_id,
                warehouse_id=warehouse.id,
                quantity=-line.quantity,
                move_type="out",
                reference_type="website_order",
                reference_id=order.id,
                created_by=user.id,
            )
        )
    order.status = "confirmed"
    db.commit()
    db.refresh(order)
    return _order_out(db, order)


# ---- demo bookings ----

def _booking_out(booking: DemoBooking) -> DemoBookingOut:
    return DemoBookingOut(
        id=booking.id,
        customer_name=booking.customer_name,
        email=booking.email,
        phone=booking.phone,
        machinery_id=booking.machinery_id,
        machinery_name=booking.machinery.name,
        preferred_date=booking.preferred_date,
        status=booking.status,
    )


@router.get("/demo-bookings", response_model=list[DemoBookingOut])
def list_demo_bookings(
    db: Session = Depends(get_db),
    _: User = Depends(read_website),
    status_filter: str | None = None,
):
    query = select(DemoBooking).order_by(DemoBooking.preferred_date.asc().nulls_last())
    if status_filter:
        query = query.where(DemoBooking.status == status_filter)
    return [_booking_out(b) for b in db.execute(query).scalars()]


@router.patch("/demo-bookings/{booking_id}", response_model=DemoBookingOut)
def update_demo_booking(
    booking_id: uuid.UUID,
    body: DemoBookingUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(write_website),
):
    booking = _get_or_404(db, DemoBooking, booking_id, "Demo booking")
    booking.status = body.status
    db.commit()
    db.refresh(booking)
    return _booking_out(booking)

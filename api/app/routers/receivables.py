"""Receivables aging — Wave C."""
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_permission
from ..models import ReceivableSnapshot, User, WebsiteOrder, WebsiteOrderItem
from ..schemas import ReceivableOut

router = APIRouter(prefix="/receivables", tags=["receivables"])
read = require_permission("invoices", "read")


def refresh_inferred_receivables(db: Session) -> None:
    """Rebuild inferred AR from confirmed/synced website orders older than 14d.

    Idempotent: deletes previous inferred_order rows then re-inserts.
    """
    db.execute(
        delete(ReceivableSnapshot).where(ReceivableSnapshot.source == "inferred_order")
    )
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    orders = db.execute(
        select(WebsiteOrder).where(
            WebsiteOrder.status.in_(("confirmed", "synced_to_tally")),
            WebsiteOrder.created_at <= cutoff,
        )
    ).scalars()
    today = date.today()
    for order in orders:
        total = float(
            db.execute(
                select(
                    func.coalesce(
                        func.sum(
                            WebsiteOrderItem.quantity * WebsiteOrderItem.price_at_order
                        ),
                        0,
                    )
                ).where(WebsiteOrderItem.order_id == order.id)
            ).scalar_one()
        )
        due = order.created_at.date() + timedelta(days=14)
        days = max(0, (today - due).days)
        status = "overdue" if days > 0 else "upcoming"
        db.add(
            ReceivableSnapshot(
                party_ref=order.email,
                party_name=order.customer_name,
                amount=total,
                due_date=due,
                days_overdue=days,
                status=status,
                source="inferred_order",
                entity_type="website_order",
                entity_id=order.id,
            )
        )
    db.commit()


@router.get("", response_model=list[ReceivableOut])
def list_receivables(
    db: Session = Depends(get_db),
    _: User = Depends(read),
):
    refresh_inferred_receivables(db)
    return list(
        db.execute(
            select(ReceivableSnapshot).order_by(ReceivableSnapshot.days_overdue.desc())
        ).scalars()
    )


@router.post("/refresh", response_model=list[ReceivableOut])
def force_refresh(
    db: Session = Depends(get_db),
    _: User = Depends(read),
):
    refresh_inferred_receivables(db)
    return list(
        db.execute(
            select(ReceivableSnapshot).order_by(ReceivableSnapshot.days_overdue.desc())
        ).scalars()
    )

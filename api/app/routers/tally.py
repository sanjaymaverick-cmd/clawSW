"""Phase 5 — Tally sync visibility and manual triggers.

Gated on the ('invoices', read/write) rows of the permissions table:
Accountant holds write (full Invoicing/Tally column in the section-4
matrix); Owner and Manager hold read. The bridge worker handles routine
syncing — these endpoints exist for visibility and the blueprint's
"manual invoice trigger".
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_permission
from ..models import TallySyncLog, User, WebsiteOrder
from ..schemas import TallyStatusOut, TallySyncLogOut
from ..tally import TallyClient, get_tally_client, pull_payments, push_order

router = APIRouter(prefix="/tally", tags=["tally"])

read_invoices = require_permission("invoices", "read")
write_invoices = require_permission("invoices", "write")


@router.get("/status", response_model=TallyStatusOut)
def bridge_status(
    db: Session = Depends(get_db),
    _: User = Depends(read_invoices),
    client: TallyClient = Depends(get_tally_client),
):
    def order_count(order_status: str) -> int:
        return db.execute(
            select(func.count(WebsiteOrder.id)).where(
                WebsiteOrder.status == order_status
            )
        ).scalar_one()

    last_success = db.execute(
        select(func.max(TallySyncLog.synced_at)).where(
            TallySyncLog.direction == "to_tally", TallySyncLog.status == "success"
        )
    ).scalar_one()
    failed = db.execute(
        select(func.count(TallySyncLog.id)).where(TallySyncLog.status == "failed")
    ).scalar_one()
    return TallyStatusOut(
        gateway_reachable=client.is_reachable(),
        pending_push_count=order_count("confirmed"),
        synced_order_count=order_count("synced_to_tally"),
        failed_push_count=failed,
        last_push_at=last_success,
    )


@router.get("/sync-log", response_model=list[TallySyncLogOut])
def sync_log(
    db: Session = Depends(get_db),
    _: User = Depends(read_invoices),
    limit: int = 100,
):
    return list(
        db.execute(
            select(TallySyncLog)
            .order_by(TallySyncLog.synced_at.desc())
            .limit(min(limit, 500))
        ).scalars()
    )


@router.post("/push/orders/{order_id}", response_model=TallySyncLogOut)
def push_order_now(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(write_invoices),
    client: TallyClient = Depends(get_tally_client),
):
    order = db.get(WebsiteOrder, order_id)
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    if order.status != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Order is '{order.status}' — only confirmed orders can be "
                "pushed to Tally"
            ),
        )
    entry = push_order(db, client, order)
    if entry.status == "failed":
        # The attempt is logged either way; surface the failure to the caller.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Tally push failed: {entry.error_message}",
        )
    return entry


@router.post("/pull-payments", response_model=list[TallySyncLogOut])
def pull_payments_now(
    db: Session = Depends(get_db),
    _: User = Depends(write_invoices),
    client: TallyClient = Depends(get_tally_client),
):
    return pull_payments(db, client)

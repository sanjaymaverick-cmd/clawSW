"""Phase 6 — read access to the audit trail.

Gated on ('admin', 'read'): per the section-4 matrix only the Owner holds
admin, so the log of who-did-what is not visible to the people it records.
The audit_log table is append-only through the app — no write endpoints.
"""
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_permission
from ..models import AuditLog, User
from ..schemas import AuditLogOut

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditLogOut])
def list_audit_log(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("admin", "read")),
    resource: str | None = None,
    action: str | None = None,
    user_id: uuid.UUID | None = None,
    limit: int = Query(default=100, le=500),
):
    query = (
        select(AuditLog, User)
        .join(User, AuditLog.user_id == User.id, isouter=True)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    if resource:
        query = query.where(AuditLog.resource == resource)
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    return [
        AuditLogOut(
            id=entry.id,
            user_id=entry.user_id,
            user_name=user.name if user else None,
            action=entry.action,
            resource=entry.resource,
            resource_id=entry.resource_id,
            ip_address=entry.ip_address,
            payload_snapshot=entry.payload_snapshot,
            created_at=entry.created_at,
        )
        for entry, user in db.execute(query)
    ]

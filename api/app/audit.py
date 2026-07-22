"""Phase 6 — automatic audit trail (blueprint section 5, audit_log note).

Every write to the sensitive tables — stock_moves, service_jobs,
website_orders, users — lands in audit_log automatically, implemented as
API-layer middleware rather than DB triggers so each entry can carry the
acting user and client IP:

- an HTTP middleware (main.py) decodes the bearer token best-effort and
  stashes (user_id, ip_address) in a contextvar for the request;
- a SQLAlchemy after_flush listener snapshots every insert/update/delete
  of an audited model and writes audit_log rows on the same connection,
  inside the same transaction — so an audit row commits (or rolls back)
  together with the write it records, and route handlers never have to
  remember to log anything.

Writes outside a request (seed, the Tally bridge worker) are recorded
with user_id/ip NULL. Importing this module registers the listener.
"""
import uuid
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import date, datetime, timezone

from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from .models import AuditLog, ServiceJob, StockMove, User, WebsiteOrder

AUDITED_MODELS = (StockMove, ServiceJob, WebsiteOrder, User)

# Never persisted into payload_snapshot, even though the write is logged.
REDACTED_COLUMNS = {"password_hash"}

# (user_id, ip_address) of the request being handled, if any.
_actor: ContextVar[tuple[uuid.UUID | None, str | None]] = ContextVar(
    "audit_actor", default=(None, None)
)


@contextmanager
def audit_context(user_id: uuid.UUID | None, ip_address: str | None):
    token = _actor.set((user_id, ip_address))
    try:
        yield
    finally:
        _actor.reset(token)


def _jsonable(value):
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _snapshot(obj) -> dict:
    return {
        attr.key: _jsonable(getattr(obj, attr.key))
        for attr in inspect(obj).mapper.column_attrs
        if attr.key not in REDACTED_COLUMNS
    }


def _audit_rows(session: Session) -> list[dict]:
    now = datetime.now(timezone.utc)
    user_id, ip_address = _actor.get()
    rows = []
    for action, objs in (
        ("create", session.new),
        ("update", session.dirty),
        ("delete", session.deleted),
    ):
        for obj in objs:
            if not isinstance(obj, AUDITED_MODELS):
                continue
            if action == "update" and not session.is_modified(obj):
                continue
            rows.append(
                {
                    "id": uuid.uuid4(),
                    "user_id": user_id,
                    "action": action,
                    "resource": obj.__tablename__,
                    "resource_id": obj.id,
                    "ip_address": ip_address,
                    "payload_snapshot": _snapshot(obj),
                    "created_at": now,
                }
            )
    return rows


@event.listens_for(Session, "after_flush")
def _write_audit_rows(session: Session, _flush_context) -> None:
    rows = _audit_rows(session)
    if rows:
        # Same connection = same transaction as the audited write.
        session.connection().execute(AuditLog.__table__.insert(), rows)

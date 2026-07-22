"""Phase 9 — login rate limiting.

Brute-force protection for /auth/login: after `login_max_attempts`
consecutive failures for a given (email, client IP) pair, that pair is
locked out for `login_lockout_minutes`. State lives in the login_attempts
table (one row per email+IP) rather than in process memory so the lockout
survives restarts and is shared across API workers.

Keying on email + IP (not email alone) is the blueprint's requirement: one
attacker hammering an account from a single host still trips the limit,
while they cannot lock the real user out from a different address by
guessing wrongly on purpose.
"""
from datetime import datetime, timedelta, timezone

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .models import LoginAttempt


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _email_key(email: str) -> str:
    return email.strip().lower()


def _ip_key(ip: str | None) -> str:
    # Coalesce a missing client IP to a sentinel so the (email, ip_address)
    # unique key is never NULL (NULLs would defeat the uniqueness and let
    # duplicate rows accumulate).
    return ip or "unknown"


def _as_aware(dt: datetime | None) -> datetime | None:
    # SQLite returns naive datetimes; treat any stored value as UTC so the
    # comparisons below behave the same on SQLite and Postgres.
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def client_ip(request: Request) -> str | None:
    """Client IP, honouring X-Forwarded-For when behind the reverse proxy
    (Phase 10 puts Caddy in front), matching the audit middleware."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _get(db: Session, email: str, ip: str | None) -> LoginAttempt | None:
    return db.execute(
        select(LoginAttempt).where(
            LoginAttempt.email == _email_key(email),
            LoginAttempt.ip_address == _ip_key(ip),
        )
    ).scalar_one_or_none()


def locked_until(db: Session, email: str, ip: str | None) -> datetime | None:
    """Return the lockout expiry if this (email, IP) is currently locked,
    else None."""
    row = _get(db, email, ip)
    if row is None:
        return None
    until = _as_aware(row.locked_until)
    if until is not None and until > _now():
        return until
    return None


def record_failure(db: Session, email: str, ip: str | None) -> None:
    """Count a failed login for (email, IP) and lock the pair once it
    reaches `login_max_attempts`."""
    now = _now()
    row = _get(db, email, ip)
    if row is None:
        row = LoginAttempt(
            email=_email_key(email), ip_address=_ip_key(ip), failed_count=0
        )
        db.add(row)
    # An expired lockout starts a fresh counting window.
    until = _as_aware(row.locked_until)
    if until is not None and until <= now:
        row.failed_count = 0
        row.locked_until = None
    row.failed_count += 1
    row.updated_at = now
    if row.failed_count >= settings.login_max_attempts:
        row.locked_until = now + timedelta(minutes=settings.login_lockout_minutes)
    db.commit()


def clear(db: Session, email: str, ip: str | None) -> None:
    """Reset the failure counter on a successful login."""
    row = _get(db, email, ip)
    if row is not None:
        db.delete(row)
        db.commit()

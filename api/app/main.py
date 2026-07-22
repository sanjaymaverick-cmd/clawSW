import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import jwt
from alembic import command
from alembic.config import Config
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect

from .audit import audit_context
from .config import settings
from .db import SessionLocal, engine
from .routers import (
    audit,
    auth,
    inventory,
    public,
    reports,
    service,
    tally,
    users,
    website,
)
from .security import decode_access_token
from .seed import seed

logging.basicConfig(level=logging.INFO)

# The revision that captures the schema as it stood before Alembic was
# introduced (phases 0-2). Databases created back then by
# Base.metadata.create_all() already match it and only need stamping.
BASELINE_REVISION = "d5c1f027e9a2"


def run_migrations() -> None:
    cfg = Config(str(Path(__file__).resolve().parent.parent / "alembic.ini"))
    inspector = inspect(engine)
    if inspector.has_table("users") and not inspector.has_table("alembic_version"):
        command.stamp(cfg, BASELINE_REVISION)
    command.upgrade(cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="clawSW API", lifespan=lifespan)

@app.middleware("http")
async def audit_actor_middleware(request: Request, call_next):
    """Stashes (user_id, client IP) for app/audit.py's flush listener.

    Best-effort by design: route dependencies still do the real auth; an
    invalid token here simply means any audited write in this request is
    recorded without a user (it would be rejected by RBAC anyway).
    """
    user_id: uuid.UUID | None = None
    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        try:
            payload = decode_access_token(authorization[7:])
            user_id = uuid.UUID(payload["sub"])
        except (jwt.PyJWTError, KeyError, ValueError):
            pass
    forwarded = request.headers.get("x-forwarded-for")
    ip_address = (
        forwarded.split(",")[0].strip()
        if forwarded
        else (request.client.host if request.client else None)
    )
    with audit_context(user_id, ip_address):
        return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(inventory.router)
app.include_router(service.router)
app.include_router(reports.router)
app.include_router(public.router)
app.include_router(website.router)
app.include_router(tally.router)
app.include_router(audit.router)


@app.get("/health")
def health():
    return {"status": "ok"}

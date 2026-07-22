import logging
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect

from .config import settings
from .db import SessionLocal, engine
from .routers import auth, inventory, public, reports, service, tally, users, website
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


@app.get("/health")
def health():
    return {"status": "ok"}

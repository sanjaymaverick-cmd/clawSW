import os

# The suite needs its own database. By default that's a throwaway in-memory
# SQLite so `pytest` runs with zero setup. Point TEST_DATABASE_URL at a real
# Postgres to exercise the engine the app actually ships with (this is what
# CI does). Its `public` schema is dropped and rebuilt from the Alembic
# migrations at the start of the session, so only ever aim it at a
# disposable database.
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "sqlite+pysqlite:///:memory:"
)
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("ADMIN_EMAIL", "owner@clawsw.example")
os.environ.setdefault("ADMIN_PASSWORD", "owner-password")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db import engine
from app.main import app


def _reset_schema() -> None:
    """Give Postgres runs a clean slate so migrations build from empty and
    count-based assertions don't trip over rows left by a previous run.
    In-memory SQLite already starts empty each session, so it's a no-op."""
    if engine.dialect.name != "postgresql":
        return
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))


@pytest.fixture(scope="session")
def client():
    _reset_schema()
    with TestClient(app) as c:
        yield c


def login(client: TestClient, email: str, password: str) -> str:
    resp = client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def auth_headers(client: TestClient, email: str, password: str) -> dict:
    return {"Authorization": f"Bearer {login(client, email, password)}"}


@pytest.fixture(scope="session")
def owner_headers(client):
    return auth_headers(client, "owner@clawsw.example", "owner-password")

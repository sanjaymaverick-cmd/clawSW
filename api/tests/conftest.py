import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["ADMIN_EMAIL"] = "owner@clawsw.example"
os.environ["ADMIN_PASSWORD"] = "owner-password"

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
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

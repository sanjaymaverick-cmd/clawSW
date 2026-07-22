"""Phase 7 — the AI query layer.

The load-bearing guarantees, asked directly of the code:
- the sanitizer never leaks customer PII or financial figures unless the
  caller is the owner AND explicitly opted in (and PII never, full stop);
- the /ai-query endpoint is gated on the ('ai_query', 'read') permission;
- what was sent is audited (question + aggregate payload, not the answer);
- the Claude API call itself is mocked — no test hits the network.
"""
import json
import uuid
from types import SimpleNamespace

import pytest
from sqlalchemy import select

from app.ai_query import classify_question, sanitize_question
from app.config import settings
from app.db import SessionLocal
from app.models import (
    AuditLog,
    Item,
    ServiceJob,
    StockLevel,
    User,
    Warehouse,
    WebsiteOrder,
    WebsiteOrderItem,
)

from .conftest import auth_headers

# Values planted in the database that must never appear in an outbound
# payload. Customer PII per the blueprint: names, emails, phone numbers.
PII_NAME = "Priya Leakcheck"
PII_EMAIL = "priya.leakcheck@example.com"
PII_PHONE = "+91-98765-43210"


@pytest.fixture(scope="module")
def seeded_pii(client, owner_headers):
    """An item with stock, a website order, and a service job — every row
    carrying customer PII that must not cross the boundary."""
    with SessionLocal() as db:
        owner = db.execute(
            select(User).where(User.email == "owner@clawsw.example")
        ).scalar_one()
        item = Item(sku="AIQ-001", name="Hydraulic filter", price=250.0)
        warehouse = Warehouse(name="AIQ Main")
        db.add_all([item, warehouse])
        db.flush()
        db.add(StockLevel(item_id=item.id, warehouse_id=warehouse.id, quantity=8))
        order = WebsiteOrder(
            customer_name=PII_NAME, email=PII_EMAIL, phone=PII_PHONE
        )
        db.add(order)
        db.flush()
        db.add(
            WebsiteOrderItem(
                order_id=order.id,
                item_id=item.id,
                quantity=2,
                price_at_order=250.0,
            )
        )
        db.add(
            ServiceJob(
                customer_name=PII_NAME,
                assigned_technician_id=owner.id,
                status="billed",
            )
        )
        db.commit()
    return True


@pytest.fixture(scope="module")
def role_headers(client, owner_headers):
    """One login per role the tests exercise, created via the API."""
    out = {"owner": owner_headers}
    for role in ("manager", "accountant", "technician"):
        email = f"aiq-{role}@clawsw.example"
        resp = client.post(
            "/users",
            headers=owner_headers,
            json={
                "name": f"AIQ {role}",
                "email": email,
                "password": "password-123",
                "role": role,
            },
        )
        assert resp.status_code == 201, resp.text
        out[role] = auth_headers(client, email, "password-123")
    return out


# ---- step 1: classification ----

def test_classify_targets_the_right_resources(client):
    assert classify_question("How many items are below reorder level?") == [
        "inventory"
    ]
    assert classify_question("Which technician has open jobs?") == [
        "service_jobs"
    ]
    assert "financial" in classify_question("What was our billed revenue?")


def test_classify_falls_back_to_overview_without_financial(client):
    resources = classify_question("Give me a general overview please")
    assert set(resources) == {"inventory", "service_jobs", "website"}
    assert "financial" not in resources


# ---- step 2: the sanitizer never leaks ----

def test_sanitizer_never_leaks_pii(client, seeded_pii):
    """No role/flag combination — including owner + opt-in — may produce a
    payload containing customer names, emails, or phone numbers."""
    question = (
        "Show revenue, sales value, orders, bookings, stock and service jobs"
    )
    with SessionLocal() as db:
        for role in ("owner", "manager", "accountant"):
            for flag in (False, True):
                sanitized = sanitize_question(db, question, role, flag)
                blob = json.dumps(sanitized.payload)
                assert PII_NAME not in blob, (role, flag)
                assert PII_EMAIL not in blob, (role, flag)
                assert PII_PHONE not in blob, (role, flag)


def test_financial_needs_owner_and_flag(client, seeded_pii):
    question = "What is our total sales revenue and stock value?"
    with SessionLocal() as db:
        # owner without the flag: no financial section
        no_flag = sanitize_question(db, question, "owner", False)
        assert not no_flag.financial_included
        assert "financial" not in no_flag.payload

        # non-owner with the flag: still no financial section
        manager = sanitize_question(db, question, "manager", True)
        assert not manager.financial_included
        assert "financial" not in manager.payload

        # owner + flag + a question that touches financials: included
        both = sanitize_question(db, question, "owner", True)
        assert both.financial_included
        assert both.payload["financial"]["billed_jobs"] >= 1
        assert both.payload["financial"]["stock_value"] > 0


def test_flag_alone_does_not_force_financial(client, seeded_pii):
    """Opt-in is permission, not a request: a question that never touches
    financials sends none even for the owner with the flag set."""
    with SessionLocal() as db:
        sanitized = sanitize_question(
            db, "How many demo bookings are pending?", "owner", True
        )
        assert not sanitized.financial_included
        assert "financial" not in sanitized.payload


def test_payload_is_aggregates_only(client, seeded_pii):
    """Sections contain scalars and small groupings — never lists of rows."""
    with SessionLocal() as db:
        sanitized = sanitize_question(
            db, "stock, service and order overview", "owner", False
        )
        for section in sanitized.payload.values():
            for value in section.values():
                assert isinstance(value, (int, float, dict, type(None)))


# ---- the endpoint: permissions, transparency, audit ----

@pytest.fixture()
def mock_claude(monkeypatch):
    calls = []

    def fake_ask_claude(question, sanitized):
        calls.append((question, sanitized))
        return "Mocked model answer"

    monkeypatch.setattr("app.routers.ai_query.ask_claude", fake_ask_claude)
    return calls


def test_owner_and_manager_can_query(client, role_headers, mock_claude, seeded_pii):
    for role in ("owner", "manager"):
        resp = client.post(
            "/ai-query",
            headers=role_headers[role],
            json={"question": "How many items are in stock?"},
        )
        assert resp.status_code == 200, (role, resp.text)
        body = resp.json()
        assert body["answer"] == "Mocked model answer"
        assert body["resources_used"] == ["inventory"]
        assert body["financial_included"] is False


def test_other_roles_are_rejected(client, role_headers, mock_claude):
    for role in ("accountant", "technician"):
        resp = client.post(
            "/ai-query",
            headers=role_headers[role],
            json={"question": "How many items are in stock?"},
        )
        assert resp.status_code == 403, role
    assert mock_claude == []  # rejected before anything was sent


def test_unauthenticated_is_rejected(client, mock_claude):
    resp = client.post("/ai-query", json={"question": "stock levels?"})
    assert resp.status_code == 401
    assert mock_claude == []


def test_financial_flag_ignored_for_manager_endpoint(
    client, role_headers, mock_claude, seeded_pii
):
    resp = client.post(
        "/ai-query",
        headers=role_headers["manager"],
        json={"question": "What is our sales revenue?", "include_financial": True},
    )
    assert resp.status_code == 200
    assert resp.json()["financial_included"] is False
    _, sanitized = mock_claude[-1]
    assert "financial" not in sanitized.payload


def test_query_is_audited_without_the_answer(
    client, role_headers, mock_claude, seeded_pii
):
    question = "Audit trail check: how many pending orders?"
    resp = client.post(
        "/ai-query", headers=role_headers["owner"], json={"question": question}
    )
    assert resp.status_code == 200
    with SessionLocal() as db:
        entry = db.execute(
            select(AuditLog)
            .where(AuditLog.resource == "ai_query")
            .order_by(AuditLog.created_at.desc())
        ).scalars().first()
    assert entry is not None
    assert entry.action == "ai_query"
    assert entry.user_id is not None
    snapshot = entry.payload_snapshot
    assert snapshot["question"] == question
    assert snapshot["resources"] == ["website"]
    assert snapshot["payload"]["website"]["orders_by_status"]["pending"] >= 1
    # what came back is deliberately not recorded — only what was sent
    assert "Mocked model answer" not in json.dumps(snapshot)


def test_unconfigured_api_key_returns_503(client, role_headers):
    # No mock: the real ask_claude runs, sees the empty key, and bails
    # before any network call.
    assert settings.anthropic_api_key == ""
    resp = client.post(
        "/ai-query",
        headers=role_headers["owner"],
        json={"question": "How many items are in stock?"},
    )
    assert resp.status_code == 503


# ---- the Claude call itself, with the SDK client stubbed ----

def test_ask_claude_sends_only_the_sanitized_payload(
    client, role_headers, monkeypatch, seeded_pii
):
    captured = {}

    def fake_create(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(
            stop_reason="end_turn",
            content=[SimpleNamespace(type="text", text="Stubbed answer")],
        )

    stub_client = SimpleNamespace(
        messages=SimpleNamespace(create=fake_create)
    )
    monkeypatch.setattr("app.ai_query._anthropic_client", lambda: stub_client)
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")

    resp = client.post(
        "/ai-query",
        headers=role_headers["owner"],
        json={"question": "How many items are in stock?"},
    )
    assert resp.status_code == 200
    assert resp.json()["answer"] == "Stubbed answer"

    assert captured["model"] == settings.anthropic_model
    sent = captured["messages"][0]["content"]
    assert "How many items are in stock?" in sent
    assert "total_items" in sent  # the aggregate payload went along
    for pii in (PII_NAME, PII_EMAIL, PII_PHONE):
        assert pii not in json.dumps(captured)

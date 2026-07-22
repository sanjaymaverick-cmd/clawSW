"""Phase 4 — public website endpoints and internal website management.

Covers the blueprint's section-6 rules: the public catalog exposes only
is_spare/is_tool items and no internal fields; orders land as 'pending'
without touching stock; confirming an order decrements stock_levels and
writes stock_moves with reference_type='website_order' in one transaction.
"""
import uuid

import pytest

from .conftest import auth_headers


@pytest.fixture(scope="module")
def setup(client, owner_headers):
    """Items (public + internal), a warehouse with stock, machinery, users."""
    def make_item(sku, name, price, **flags):
        resp = client.post(
            "/items",
            headers=owner_headers,
            json={"sku": sku, "name": name, "price": price, "unit": "pc", **flags},
        )
        assert resp.status_code == 201, resp.text
        return resp.json()

    spare = make_item("WEB-SPARE-1", "Claw Bearing", 250.0, is_spare=True)
    tool = make_item("WEB-TOOL-1", "Torque Wrench", 1200.0, is_tool=True)
    internal = make_item("WEB-INT-1", "Internal Assembly Jig", 99.0)
    unstocked = make_item("WEB-SPARE-2", "Claw Seal Kit", 80.0, is_spare=True)

    resp = client.post(
        "/warehouses",
        headers=owner_headers,
        json={"name": "Web Fulfilment", "location": "Unit 1"},
    )
    assert resp.status_code == 201, resp.text
    warehouse = resp.json()

    for item, qty in ((spare, 50), (tool, 10), (internal, 5)):
        resp = client.post(
            "/stock/adjust",
            headers=owner_headers,
            json={
                "item_id": item["id"],
                "warehouse_id": warehouse["id"],
                "move_type": "in",
                "quantity": qty,
            },
        )
        assert resp.status_code == 200, resp.text

    resp = client.post(
        "/website/machinery",
        headers=owner_headers,
        json={
            "name": "ClawMaster 3000",
            "category": "excavation",
            "brochure_path": "/brochures/clawmaster-3000.pdf",
            "qr_code": "QR-CM3000",
        },
    )
    assert resp.status_code == 201, resp.text
    machine = resp.json()

    resp = client.post(
        "/users",
        headers=owner_headers,
        json={
            "name": "Web Tech",
            "email": "webtech@clawsw.example",
            "password": "password-123",
            "role": "technician",
        },
    )
    assert resp.status_code == 201, resp.text
    resp = client.post(
        "/users",
        headers=owner_headers,
        json={
            "name": "Web Accountant",
            "email": "webacct@clawsw.example",
            "password": "password-123",
            "role": "accountant",
        },
    )
    assert resp.status_code == 201, resp.text

    return {
        "spare": spare,
        "tool": tool,
        "internal": internal,
        "unstocked": unstocked,
        "warehouse": warehouse,
        "machine": machine,
    }


# ---- public catalog ----

def test_catalog_needs_no_auth_and_hides_internal_items(client, setup):
    resp = client.get("/public/catalog")
    assert resp.status_code == 200
    skus = {row["sku"] for row in resp.json()}
    assert {"WEB-SPARE-1", "WEB-TOOL-1", "WEB-SPARE-2"} <= skus
    assert "WEB-INT-1" not in skus


def test_catalog_exposes_no_internal_fields(client, setup):
    rows = client.get("/public/catalog").json()
    by_sku = {r["sku"]: r for r in rows}
    row = by_sku["WEB-SPARE-1"]
    assert "reorder_level" not in row
    assert row["in_stock"] is True
    # No exact quantities on the wire, just availability.
    assert "quantity" not in row
    assert by_sku["WEB-SPARE-2"]["in_stock"] is False


def test_public_machinery_hides_qr_code(client, setup):
    resp = client.get("/public/machinery")
    assert resp.status_code == 200
    rows = resp.json()
    names = {m["name"] for m in rows}
    assert "ClawMaster 3000" in names
    assert all("qr_code" not in m for m in rows)


# ---- projects gallery ----

def test_projects_gallery_public_read_internal_write(client, owner_headers, setup):
    resp = client.post(
        "/website/projects",
        headers=owner_headers,
        json={
            "title": "Quarry conveyor overhaul",
            "description": "Full rebuild of the primary conveyor line.",
            "image_paths": ["/projects/quarry-1.jpg", "/projects/quarry-2.jpg"],
            "client_name": "Acme Quarries",
            "date_completed": "2026-05-30",
        },
    )
    assert resp.status_code == 201, resp.text

    rows = client.get("/public/projects").json()
    titles = {p["title"] for p in rows}
    assert "Quarry conveyor overhaul" in titles
    project = next(p for p in rows if p["title"] == "Quarry conveyor overhaul")
    assert project["image_paths"] == [
        "/projects/quarry-1.jpg",
        "/projects/quarry-2.jpg",
    ]


# ---- order flow ----

def _place_order(client, setup, quantity=2):
    return client.post(
        "/public/orders",
        json={
            "customer_name": "Jordan Buyer",
            "email": "jordan@example.com",
            "phone": "+91 90000 00000",
            "items": [
                {"item_id": setup["spare"]["id"], "quantity": quantity},
                {"item_id": setup["tool"]["id"], "quantity": 1},
            ],
        },
    )


def _stock_of(client, headers, item_id, warehouse_id):
    rows = client.get(
        "/stock",
        headers=headers,
        params={"item_id": item_id, "warehouse_id": warehouse_id},
    ).json()
    return rows[0]["quantity"] if rows else 0


def test_order_created_pending_without_touching_stock(client, owner_headers, setup):
    before = _stock_of(
        client, owner_headers, setup["spare"]["id"], setup["warehouse"]["id"]
    )
    resp = _place_order(client, setup)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "pending"
    assert body["total"] == 2 * 250.0 + 1 * 1200.0
    after = _stock_of(
        client, owner_headers, setup["spare"]["id"], setup["warehouse"]["id"]
    )
    assert after == before


def test_order_rejects_non_catalog_item(client, setup):
    resp = client.post(
        "/public/orders",
        json={
            "customer_name": "Sneaky Buyer",
            "email": "sneaky@example.com",
            "items": [{"item_id": setup["internal"]["id"], "quantity": 1}],
        },
    )
    assert resp.status_code == 422


def test_order_rejects_unknown_item(client, setup):
    resp = client.post(
        "/public/orders",
        json={
            "customer_name": "Ghost Buyer",
            "email": "ghost@example.com",
            "items": [{"item_id": str(uuid.uuid4()), "quantity": 1}],
        },
    )
    assert resp.status_code == 422


def test_confirm_decrements_stock_and_logs_website_order_move(
    client, owner_headers, setup
):
    spare_before = _stock_of(
        client, owner_headers, setup["spare"]["id"], setup["warehouse"]["id"]
    )
    order_id = _place_order(client, setup, quantity=3).json()["id"]

    resp = client.post(
        f"/website/orders/{order_id}/confirm",
        headers=owner_headers,
        json={"warehouse_id": setup["warehouse"]["id"]},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "confirmed"

    spare_after = _stock_of(
        client, owner_headers, setup["spare"]["id"], setup["warehouse"]["id"]
    )
    assert spare_after == spare_before - 3

    moves = client.get(
        "/stock/moves",
        headers=owner_headers,
        params={"item_id": setup["spare"]["id"]},
    ).json()
    move = next(m for m in moves if m["reference_id"] == order_id)
    assert move["reference_type"] == "website_order"
    assert move["move_type"] == "out"
    assert move["quantity"] == -3


def test_confirm_is_idempotent_guarded(client, owner_headers, setup):
    order_id = _place_order(client, setup, quantity=1).json()["id"]
    confirm = lambda: client.post(  # noqa: E731
        f"/website/orders/{order_id}/confirm",
        headers=owner_headers,
        json={"warehouse_id": setup["warehouse"]["id"]},
    )
    assert confirm().status_code == 200
    assert confirm().status_code == 400  # already confirmed — no double deduction


def test_confirm_all_or_nothing_on_insufficient_stock(client, owner_headers, setup):
    resp = client.post(
        "/public/orders",
        json={
            "customer_name": "Bulk Buyer",
            "email": "bulk@example.com",
            "items": [
                {"item_id": setup["spare"]["id"], "quantity": 1},
                {"item_id": setup["unstocked"]["id"], "quantity": 5},
            ],
        },
    )
    order_id = resp.json()["id"]
    spare_before = _stock_of(
        client, owner_headers, setup["spare"]["id"], setup["warehouse"]["id"]
    )
    resp = client.post(
        f"/website/orders/{order_id}/confirm",
        headers=owner_headers,
        json={"warehouse_id": setup["warehouse"]["id"]},
    )
    assert resp.status_code == 400
    # First line must have been rolled back too.
    spare_after = _stock_of(
        client, owner_headers, setup["spare"]["id"], setup["warehouse"]["id"]
    )
    assert spare_after == spare_before
    order = client.get(f"/website/orders/{order_id}", headers=owner_headers).json()
    assert order["status"] == "pending"


# ---- demo bookings ----

def test_demo_booking_flow(client, owner_headers, setup):
    resp = client.post(
        "/public/demo-bookings",
        json={
            "customer_name": "Demo Prospect",
            "email": "prospect@example.com",
            "phone": "+91 91111 11111",
            "machinery_id": setup["machine"]["id"],
            "preferred_date": "2026-08-15",
        },
    )
    assert resp.status_code == 201, resp.text
    booking_id = resp.json()["id"]
    assert resp.json()["status"] == "pending"

    rows = client.get("/website/demo-bookings", headers=owner_headers).json()
    booking = next(b for b in rows if b["id"] == booking_id)
    assert booking["machinery_name"] == "ClawMaster 3000"

    resp = client.patch(
        f"/website/demo-bookings/{booking_id}",
        headers=owner_headers,
        json={"status": "confirmed"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "confirmed"


def test_demo_booking_unknown_machinery_rejected(client, setup):
    resp = client.post(
        "/public/demo-bookings",
        json={
            "customer_name": "Lost Prospect",
            "email": "lost@example.com",
            "machinery_id": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == 422


# ---- RBAC gates ----

def test_technician_cannot_touch_website_admin(client, setup):
    tech = auth_headers(client, "webtech@clawsw.example", "password-123")
    assert client.get("/website/orders", headers=tech).status_code == 403
    assert (
        client.post(
            "/website/machinery", headers=tech, json={"name": "Rogue Machine"}
        ).status_code
        == 403
    )


def test_accountant_reads_orders_but_cannot_confirm(client, setup):
    acct = auth_headers(client, "webacct@clawsw.example", "password-123")
    assert client.get("/website/orders", headers=acct).status_code == 200
    order_id = _place_order(client, setup, quantity=1).json()["id"]
    resp = client.post(
        f"/website/orders/{order_id}/confirm",
        headers=acct,
        json={"warehouse_id": setup["warehouse"]["id"]},
    )
    assert resp.status_code == 403


def test_website_admin_requires_auth(client, setup):
    assert client.get("/website/orders").status_code == 401

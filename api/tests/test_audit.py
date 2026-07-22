"""Phase 6 — the audit trail writes itself and only the Owner reads it.

Blueprint section 5 note on audit_log: every write to stock_moves,
service_jobs, website_orders, and users must land in audit_log
automatically — route handlers never insert audit rows themselves.
"""
from .conftest import auth_headers


def _audit(client, owner_headers, **params):
    resp = client.get("/audit", headers=owner_headers, params=params)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _entries_for(client, owner_headers, resource, resource_id, action=None):
    entries = _audit(client, owner_headers, resource=resource, **(
        {"action": action} if action else {}
    ))
    return [e for e in entries if e["resource_id"] == resource_id]


def test_user_writes_are_audited_and_password_hash_redacted(client, owner_headers):
    resp = client.post(
        "/users",
        headers=owner_headers,
        json={
            "name": "Audit Subject",
            "email": "audit-subject@clawsw.example",
            "password": "password-123",
            "role": "warehouse",
        },
    )
    assert resp.status_code == 201, resp.text
    user = resp.json()

    created = _entries_for(client, owner_headers, "users", user["id"], "create")
    assert len(created) == 1
    entry = created[0]
    assert entry["user_name"] is not None  # acting owner resolved by name
    assert entry["ip_address"]  # captured from the request
    snapshot = entry["payload_snapshot"]
    assert snapshot["email"] == "audit-subject@clawsw.example"
    assert "password_hash" not in snapshot

    resp = client.patch(
        f"/users/{user['id']}", headers=owner_headers, json={"active": False}
    )
    assert resp.status_code == 200
    updated = _entries_for(client, owner_headers, "users", user["id"], "update")
    assert len(updated) >= 1
    assert updated[0]["payload_snapshot"]["active"] is False
    assert "password_hash" not in updated[0]["payload_snapshot"]


def test_stock_moves_are_audited_with_acting_user(client, owner_headers):
    item = client.post(
        "/items",
        headers=owner_headers,
        json={"sku": "AUD-1", "name": "Audited Bearing", "price": 10},
    ).json()
    warehouse = client.post(
        "/warehouses", headers=owner_headers, json={"name": "Audit WH"}
    ).json()
    resp = client.post(
        "/stock/adjust",
        headers=owner_headers,
        json={
            "item_id": item["id"],
            "warehouse_id": warehouse["id"],
            "move_type": "in",
            "quantity": 5,
        },
    )
    assert resp.status_code == 200, resp.text

    me = client.get("/auth/me", headers=owner_headers).json()
    moves = [
        e
        for e in _audit(client, owner_headers, resource="stock_moves")
        if e["payload_snapshot"]["item_id"] == item["id"]
    ]
    assert len(moves) == 1
    assert moves[0]["action"] == "create"
    assert moves[0]["user_id"] == me["id"]
    assert moves[0]["payload_snapshot"]["quantity"] == 5


def test_public_order_audited_without_user(client, owner_headers):
    item = client.post(
        "/items",
        headers=owner_headers,
        json={"sku": "AUD-2", "name": "Audited Spare", "price": 99, "is_spare": True},
    ).json()
    resp = client.post(
        "/public/orders",
        json={
            "customer_name": "Anonymous Buyer",
            "email": "buyer@example.com",
            "items": [{"item_id": item["id"], "quantity": 1}],
        },
    )
    assert resp.status_code == 201, resp.text
    order_id = resp.json()["id"]

    created = _entries_for(client, owner_headers, "website_orders", order_id, "create")
    assert len(created) == 1
    assert created[0]["user_id"] is None  # unauthenticated public write
    assert created[0]["user_name"] is None
    assert created[0]["ip_address"]  # IP still recorded
    assert created[0]["payload_snapshot"]["status"] == "pending"


def test_service_job_lifecycle_audited(client, owner_headers):
    tech = client.post(
        "/users",
        headers=owner_headers,
        json={
            "name": "Audit Tech",
            "email": "audit-tech@clawsw.example",
            "password": "password-123",
            "role": "technician",
        },
    ).json()
    job = client.post(
        "/service-jobs",
        headers=owner_headers,
        json={"customer_name": "Audit Customer", "assigned_technician_id": tech["id"]},
    ).json()
    resp = client.patch(
        f"/service-jobs/{job['id']}",
        headers=owner_headers,
        json={"status": "in_progress"},
    )
    assert resp.status_code == 200, resp.text

    assert _entries_for(client, owner_headers, "service_jobs", job["id"], "create")
    updates = _entries_for(client, owner_headers, "service_jobs", job["id"], "update")
    assert updates and updates[0]["payload_snapshot"]["status"] == "in_progress"


def test_only_admin_role_reads_audit_log(client, owner_headers):
    for email, role in [
        ("audit-reader-tech@clawsw.example", "technician"),
        ("audit-reader-acct@clawsw.example", "accountant"),
        ("audit-reader-mgr@clawsw.example", "manager"),
    ]:
        resp = client.post(
            "/users",
            headers=owner_headers,
            json={
                "name": f"Reader {role}",
                "email": email,
                "password": "password-123",
                "role": role,
            },
        )
        assert resp.status_code == 201, resp.text
        headers = auth_headers(client, email, "password-123")
        assert client.get("/audit", headers=headers).status_code == 403

    assert client.get("/audit").status_code in (401, 403)  # anonymous
    assert client.get("/audit", headers=owner_headers).status_code == 200

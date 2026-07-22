"""The blueprint's key scenario: role gates enforced at the API layer,
driven by the permissions table — e.g. a technician must not reach
admin-only user management."""
from .conftest import auth_headers


def _create_user(client, owner_headers, name, email, role):
    resp = client.post(
        "/users",
        headers=owner_headers,
        json={"name": name, "email": email, "password": "password-123", "role": role},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_owner_can_list_and_create_users(client, owner_headers):
    _create_user(client, owner_headers, "Tech One", "tech@clawsw.example", "technician")
    resp = client.get("/users", headers=owner_headers)
    assert resp.status_code == 200
    emails = {u["email"] for u in resp.json()}
    assert {"owner@clawsw.example", "tech@clawsw.example"} <= emails


def test_technician_cannot_touch_users(client, owner_headers):
    tech = auth_headers(client, "tech@clawsw.example", "password-123")
    assert client.get("/users", headers=tech).status_code == 403
    resp = client.post(
        "/users",
        headers=tech,
        json={
            "name": "Sneaky",
            "email": "sneaky@clawsw.example",
            "password": "password-123",
            "role": "owner",
        },
    )
    assert resp.status_code == 403


def test_duplicate_email_rejected(client, owner_headers):
    resp = client.post(
        "/users",
        headers=owner_headers,
        json={
            "name": "Dup",
            "email": "tech@clawsw.example",
            "password": "password-123",
            "role": "technician",
        },
    )
    assert resp.status_code == 409


def test_unknown_role_rejected(client, owner_headers):
    resp = client.post(
        "/users",
        headers=owner_headers,
        json={
            "name": "Ghost",
            "email": "ghost@clawsw.example",
            "password": "password-123",
            "role": "superadmin",
        },
    )
    assert resp.status_code == 422


def test_deactivated_user_cannot_login(client, owner_headers):
    user = _create_user(
        client, owner_headers, "Temp", "temp@clawsw.example", "warehouse"
    )
    resp = client.patch(
        f"/users/{user['id']}", headers=owner_headers, json={"active": False}
    )
    assert resp.status_code == 200
    resp = client.post(
        "/auth/login",
        json={"email": "temp@clawsw.example", "password": "password-123"},
    )
    assert resp.status_code == 401


def test_technician_cannot_see_accountant_data(client, owner_headers):
    """Blueprint Phase 6: 'can a technician see accountant data' — asked
    directly of the API. Every invoicing/financial/admin surface an
    accountant (or owner) can reach must 403 for a technician."""
    _create_user(
        client, owner_headers, "Probe Tech", "probe-tech@clawsw.example", "technician"
    )
    _create_user(
        client, owner_headers, "Probe Acct", "probe-acct@clawsw.example", "accountant"
    )
    tech = auth_headers(client, "probe-tech@clawsw.example", "password-123")
    acct = auth_headers(client, "probe-acct@clawsw.example", "password-123")

    accountant_surfaces = [
        ("GET", "/tally/status"),          # invoicing bridge status
        ("GET", "/tally/sync-log"),        # invoicing history
        ("POST", "/tally/pull-payments"),  # payment status pull
        ("GET", "/reports/summary"),       # financial reports
        ("GET", "/website/orders"),        # customer orders incl. PII
        ("GET", "/users"),                 # admin
        ("GET", "/audit"),                 # admin (owner-only)
    ]
    for method, path in accountant_surfaces:
        resp = client.request(method, path, headers=tech)
        assert resp.status_code == 403, f"technician reached {method} {path}"

    # The same doors open for the accountant (per the section-4 matrix:
    # invoices full, reports financial, website orders read — not admin).
    assert client.get("/tally/sync-log", headers=acct).status_code == 200
    assert client.get("/reports/summary", headers=acct).status_code == 200
    assert client.get("/website/orders", headers=acct).status_code == 200
    assert client.get("/users", headers=acct).status_code == 403
    assert client.get("/audit", headers=acct).status_code == 403


def test_owner_cannot_deactivate_self(client, owner_headers):
    me = client.get("/auth/me", headers=owner_headers).json()
    resp = client.patch(
        f"/users/{me['id']}", headers=owner_headers, json={"active": False}
    )
    assert resp.status_code == 400

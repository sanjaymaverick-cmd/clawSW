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


def test_owner_cannot_deactivate_self(client, owner_headers):
    me = client.get("/auth/me", headers=owner_headers).json()
    resp = client.patch(
        f"/users/{me['id']}", headers=owner_headers, json={"active": False}
    )
    assert resp.status_code == 400

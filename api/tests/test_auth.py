def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_login_wrong_password(client):
    resp = client.post(
        "/auth/login",
        json={"email": "owner@clawsw.example", "password": "wrong"},
    )
    assert resp.status_code == 401


def test_login_unknown_user(client):
    resp = client.post(
        "/auth/login",
        json={"email": "nobody@clawsw.example", "password": "whatever"},
    )
    assert resp.status_code == 401


def test_me_requires_token(client):
    assert client.get("/auth/me").status_code == 401


def test_me_rejects_garbage_token(client):
    resp = client.get("/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401


def test_owner_me(client, owner_headers):
    resp = client.get("/auth/me", headers=owner_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "owner@clawsw.example"
    assert body["role"] == "owner"
    grants = {(p["resource"], p["action"]) for p in body["permissions"]}
    assert ("admin", "write") in grants
    assert ("inventory", "write") in grants

"""Phase 9 — login rate limiting on /auth/login.

Lockout is keyed by (email, client IP): after `login_max_attempts`
consecutive failures a pair is refused for `login_lockout_minutes`, a
correct password included. A different IP is unaffected, and a successful
login clears the counter. The TestClient reports a single client IP, so
these tests set X-Forwarded-For to simulate distinct source addresses.
"""
from app.config import settings


def _login(client, email, password, ip):
    return client.post(
        "/auth/login",
        json={"email": email, "password": password},
        headers={"X-Forwarded-For": ip},
    )


def _make_user(client, owner_headers, email, password="password-123"):
    resp = client.post(
        "/users",
        headers=owner_headers,
        json={"name": "Rate Victim", "email": email, "password": password,
              "role": "warehouse"},
    )
    assert resp.status_code == 201, resp.text


def test_lockout_after_max_attempts_blocks_even_correct_password(
    client, owner_headers
):
    email = "rl-lock@clawsw.example"
    _make_user(client, owner_headers, email)
    ip = "203.0.113.10"

    for _ in range(settings.login_max_attempts):
        assert _login(client, email, "wrong", ip).status_code == 401

    # Threshold reached: the correct password is now refused too.
    resp = _login(client, email, "password-123", ip)
    assert resp.status_code == 429
    assert "Retry-After" in resp.headers
    assert int(resp.headers["Retry-After"]) > 0


def test_lockout_is_scoped_by_ip(client, owner_headers):
    email = "rl-scoped@clawsw.example"
    _make_user(client, owner_headers, email)

    for _ in range(settings.login_max_attempts):
        assert _login(client, email, "wrong", "198.51.100.1").status_code == 401

    # Locked from the attacking IP...
    assert _login(client, email, "password-123", "198.51.100.1").status_code == 429
    # ...but the real user logs in fine from a different address.
    assert _login(client, email, "password-123", "198.51.100.2").status_code == 200


def test_unknown_email_also_counts_toward_lockout(client):
    email = "rl-ghost@clawsw.example"  # never created
    ip = "203.0.113.20"
    for _ in range(settings.login_max_attempts):
        assert _login(client, email, "whatever", ip).status_code == 401
    # Enumerating a non-existent account is rate-limited the same way.
    assert _login(client, email, "whatever", ip).status_code == 429


def test_successful_login_resets_counter(client, owner_headers):
    email = "rl-reset@clawsw.example"
    _make_user(client, owner_headers, email)
    ip = "203.0.113.30"

    # One short of the threshold, then a good login clears the tally.
    for _ in range(settings.login_max_attempts - 1):
        assert _login(client, email, "wrong", ip).status_code == 401
    assert _login(client, email, "password-123", ip).status_code == 200

    # A fresh run of failures is needed to lock again — the earlier ones
    # did not carry over.
    for _ in range(settings.login_max_attempts - 1):
        assert _login(client, email, "wrong", ip).status_code == 401
    assert _login(client, email, "password-123", ip).status_code == 200

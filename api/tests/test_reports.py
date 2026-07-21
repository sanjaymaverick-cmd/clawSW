"""Phase 3 — role dashboards: section visibility must follow the
permissions table, and aggregates must reconcile with the module
endpoints they summarize."""
import pytest

from .conftest import auth_headers


def _mk_user(client, owner_headers, name, email, role):
    resp = client.post(
        "/users",
        headers=owner_headers,
        json={"name": name, "email": email, "password": "password-123", "role": role},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture(scope="module")
def role_headers(client, owner_headers):
    users = {
        "manager": "rep.mgr@clawsw.example",
        "accountant": "rep.acct@clawsw.example",
        "service_manager": "rep.sm@clawsw.example",
        "technician": "rep.tech@clawsw.example",
        "warehouse": "rep.wh@clawsw.example",
    }
    for role, email in users.items():
        _mk_user(client, owner_headers, f"Rep {role}", email, role)
    return {
        role: auth_headers(client, email, "password-123")
        for role, email in users.items()
    }


@pytest.fixture(scope="module")
def report_data(client, owner_headers):
    """Known data: a deliberately low-stock item and a billed job with parts."""
    wh = client.post(
        "/warehouses", headers=owner_headers, json={"name": "Reports WH"}
    ).json()
    low_item = client.post(
        "/items",
        headers=owner_headers,
        json={"sku": "RPT-LOW", "name": "Report low item", "price": 100,
              "reorder_level": 5},
    ).json()
    client.post(
        "/stock/adjust",
        headers=owner_headers,
        json={"item_id": low_item["id"], "warehouse_id": wh["id"],
              "move_type": "in", "quantity": 2},
    )

    part_item = client.post(
        "/items",
        headers=owner_headers,
        json={"sku": "RPT-PART", "name": "Report part", "price": 40},
    ).json()
    client.post(
        "/stock/adjust",
        headers=owner_headers,
        json={"item_id": part_item["id"], "warehouse_id": wh["id"],
              "move_type": "in", "quantity": 10},
    )

    me = client.get("/auth/me", headers=owner_headers).json()
    job = client.post(
        "/service-jobs",
        headers=owner_headers,
        json={"customer_name": "Reports Co", "assigned_technician_id": me["id"]},
    ).json()
    client.post(
        f"/service-jobs/{job['id']}/parts",
        headers=owner_headers,
        json={"item_id": part_item["id"], "warehouse_id": wh["id"], "quantity": 3},
    )
    for status in ("in_progress", "completed", "billed"):
        resp = client.patch(
            f"/service-jobs/{job['id']}", headers=owner_headers,
            json={"status": status},
        )
        assert resp.status_code == 200, resp.text
    return {"wh": wh, "low_item": low_item, "part_item": part_item, "job": job}


def _sections(body: dict) -> set:
    return {k for k, v in body.items() if v is not None}


def test_owner_gets_full_aggregated_view(client, owner_headers, report_data):
    resp = client.get("/reports/summary", headers=owner_headers)
    assert resp.status_code == 200
    assert _sections(resp.json()) == {"stock", "service", "financial", "people"}


def test_sections_follow_permission_table(client, role_headers, report_data):
    expected = {
        # reports:read + the underlying resource reads each role holds
        "manager": {"stock", "service", "financial"},
        "accountant": {"stock", "financial"},
        "service_manager": {"stock", "service"},
        "warehouse": {"stock"},
    }
    for role, sections in expected.items():
        body = client.get("/reports/summary", headers=role_headers[role]).json()
        assert _sections(body) == sections, f"role={role}"


def test_technician_has_no_reports_access(client, role_headers):
    resp = client.get("/reports/summary", headers=role_headers["technician"])
    assert resp.status_code == 403


def test_reports_require_auth(client):
    assert client.get("/reports/summary").status_code == 401


def test_stock_report_reconciles_with_inventory_endpoints(
    client, owner_headers, report_data
):
    report = client.get("/reports/summary", headers=owner_headers).json()["stock"]

    items = client.get("/items", headers=owner_headers).json()
    stock = client.get("/stock", headers=owner_headers).json()
    warehouses = client.get("/warehouses", headers=owner_headers).json()
    price_by_item = {i["id"]: i["price"] for i in items}
    expected_value = sum(
        row["quantity"] * price_by_item[row["item_id"]] for row in stock
    )

    assert report["total_items"] == len(items)
    assert report["total_warehouses"] == len(warehouses)
    assert report["total_stock_value"] == pytest.approx(expected_value)

    low = {row["sku"]: row for row in report["low_stock"]}
    assert "RPT-LOW" in low
    assert low["RPT-LOW"]["total_quantity"] == 2
    assert low["RPT-LOW"]["reorder_level"] == 5


def test_service_report_reconciles_with_job_endpoints(
    client, owner_headers, report_data
):
    report = client.get("/reports/summary", headers=owner_headers).json()["service"]
    jobs = client.get("/service-jobs", headers=owner_headers).json()

    expected_by_status: dict[str, int] = {}
    for j in jobs:
        expected_by_status[j["status"]] = expected_by_status.get(j["status"], 0) + 1
    assert report["jobs_by_status"] == expected_by_status

    open_total = sum(r["open_jobs"] for r in report["open_by_technician"])
    assert open_total == sum(
        1 for j in jobs if j["status"] in ("open", "in_progress")
    )
    assert report["avg_completion_hours"] is not None
    assert report["parts_used_value"] >= 3 * 40  # RPT-PART usage at least


def test_financial_report_counts_billed_work(client, owner_headers, report_data):
    body = client.get("/reports/summary", headers=owner_headers).json()
    fin = body["financial"]
    assert fin["billed_jobs"] >= 1
    # Our billed job used 3 x RPT-PART @ 40
    assert fin["billed_parts_value"] >= 120
    assert fin["stock_value"] == pytest.approx(body["stock"]["total_stock_value"])


def test_people_report_matches_user_admin(client, owner_headers, report_data):
    people = client.get("/reports/summary", headers=owner_headers).json()["people"]
    users = client.get("/users", headers=owner_headers).json()
    active = [u for u in users if u["active"]]
    assert people["active_users"] == len(active)
    expected_by_role: dict[str, int] = {}
    for u in active:
        expected_by_role[u["role"]] = expected_by_role.get(u["role"], 0) + 1
    assert people["users_by_role"] == expected_by_role

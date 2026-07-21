"""Phase 2 — service jobs: assignment, status flow, technician scoping,
and parts consumption reconciled against the stock ledger."""
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
def people(client, owner_headers):
    sm = _mk_user(client, owner_headers, "Serv Mgr", "sm@clawsw.example", "service_manager")
    t1 = _mk_user(client, owner_headers, "Tech A", "tech.a@clawsw.example", "technician")
    t2 = _mk_user(client, owner_headers, "Tech B", "tech.b@clawsw.example", "technician")
    return {
        "sm": sm,
        "t1": t1,
        "t2": t2,
        "sm_h": auth_headers(client, "sm@clawsw.example", "password-123"),
        "t1_h": auth_headers(client, "tech.a@clawsw.example", "password-123"),
        "t2_h": auth_headers(client, "tech.b@clawsw.example", "password-123"),
    }


@pytest.fixture(scope="module")
def stocked(client, owner_headers):
    """An item with 20 units on hand in one warehouse."""
    wh = client.post(
        "/warehouses", headers=owner_headers, json={"name": "Service Store"}
    ).json()
    item = client.post(
        "/items",
        headers=owner_headers,
        json={"sku": "FLT-090", "name": "Oil filter", "unit": "pcs", "price": 350,
              "is_spare": True},
    ).json()
    resp = client.post(
        "/stock/adjust",
        headers=owner_headers,
        json={"item_id": item["id"], "warehouse_id": wh["id"],
              "move_type": "in", "quantity": 20},
    )
    assert resp.status_code == 200
    return {"wh": wh, "item": item}


@pytest.fixture(scope="module")
def job(client, people):
    resp = client.post(
        "/service-jobs",
        headers=people["sm_h"],
        json={
            "customer_name": "Acme Mills",
            "assigned_technician_id": people["t1"]["id"],
            "description": "Annual maintenance",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "open"
    assert body["technician_name"] == "Tech A"
    return body


def test_assignment_validation(client, people, owner_headers):
    acct = _mk_user(
        client, owner_headers, "No Jobs", "nojobs@clawsw.example", "accountant"
    )
    resp = client.post(
        "/service-jobs",
        headers=people["sm_h"],
        json={"customer_name": "X", "assigned_technician_id": acct["id"]},
    )
    assert resp.status_code == 422
    assert "cannot be assigned" in resp.json()["detail"]


def test_technician_sees_only_own_jobs(client, people, job):
    t1_jobs = client.get("/service-jobs", headers=people["t1_h"]).json()
    assert [j["id"] for j in t1_jobs] == [job["id"]]
    assert client.get("/service-jobs", headers=people["t2_h"]).json() == []
    # Direct fetch of someone else's job is a 404, not a 403 leak.
    resp = client.get(f"/service-jobs/{job['id']}", headers=people["t2_h"])
    assert resp.status_code == 404


def test_technician_cannot_reassign(client, people, job):
    resp = client.patch(
        f"/service-jobs/{job['id']}",
        headers=people["t1_h"],
        json={"assigned_technician_id": people["t2"]["id"]},
    )
    assert resp.status_code == 403


def test_status_flow(client, people, job):
    jid = job["id"]
    # open -> completed skips a step
    resp = client.patch(
        f"/service-jobs/{jid}", headers=people["t1_h"], json={"status": "completed"}
    )
    assert resp.status_code == 400

    resp = client.patch(
        f"/service-jobs/{jid}", headers=people["t1_h"], json={"status": "in_progress"}
    )
    assert resp.status_code == 200
    assert resp.json()["completed_at"] is None


def test_parts_consumption_hits_stock_ledger(client, people, job, stocked):
    jid = job["id"]
    resp = client.post(
        f"/service-jobs/{jid}/parts",
        headers=people["t1_h"],
        json={"item_id": stocked["item"]["id"], "warehouse_id": stocked["wh"]["id"],
              "quantity": 2},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["sku"] == "FLT-090"

    too_many = client.post(
        f"/service-jobs/{jid}/parts",
        headers=people["t1_h"],
        json={"item_id": stocked["item"]["id"], "warehouse_id": stocked["wh"]["id"],
              "quantity": 9999},
    )
    assert too_many.status_code == 400

    parts = client.get(f"/service-jobs/{jid}/parts", headers=people["t1_h"]).json()
    assert [(p["sku"], p["quantity"]) for p in parts] == [("FLT-090", 2)]

    stock = client.get(
        f"/stock?item_id={stocked['item']['id']}", headers=people["sm_h"]
    ).json()
    assert stock[0]["quantity"] == 18

    moves = client.get(
        f"/stock/moves?item_id={stocked['item']['id']}", headers=people["sm_h"]
    ).json()
    service_moves = [m for m in moves if m["move_type"] == "service_use"]
    assert len(service_moves) == 1
    assert service_moves[0]["quantity"] == -2
    assert service_moves[0]["created_by_name"] == "Tech A"


def test_complete_and_bill(client, people, job):
    jid = job["id"]
    resp = client.patch(
        f"/service-jobs/{jid}", headers=people["t1_h"], json={"status": "completed"}
    )
    assert resp.status_code == 200
    assert resp.json()["completed_at"] is not None

    # No parts on completed jobs
    resp = client.post(
        f"/service-jobs/{jid}/parts",
        headers=people["t1_h"],
        json={"item_id": jid, "warehouse_id": jid, "quantity": 1},
    )
    assert resp.status_code == 400

    # Technician cannot bill; service manager can
    resp = client.patch(
        f"/service-jobs/{jid}", headers=people["t1_h"], json={"status": "billed"}
    )
    assert resp.status_code == 403
    resp = client.patch(
        f"/service-jobs/{jid}", headers=people["sm_h"], json={"status": "billed"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "billed"


def test_technician_can_self_create_but_not_for_others(client, people):
    resp = client.post(
        "/service-jobs",
        headers=people["t1_h"],
        json={"customer_name": "Walk-in", "assigned_technician_id": people["t1"]["id"]},
    )
    assert resp.status_code == 201
    resp = client.post(
        "/service-jobs",
        headers=people["t1_h"],
        json={"customer_name": "Walk-in", "assigned_technician_id": people["t2"]["id"]},
    )
    assert resp.status_code == 403


def test_roles_without_service_access_are_blocked(client, owner_headers):
    _mk_user(client, owner_headers, "Wh User", "wh.user@clawsw.example", "warehouse")
    wh_h = auth_headers(client, "wh.user@clawsw.example", "password-123")
    assert client.get("/service-jobs", headers=wh_h).status_code == 403


def test_technician_list_for_assignment(client, people):
    resp = client.get("/service-jobs/technicians", headers=people["sm_h"])
    assert resp.status_code == 200
    names = {t["name"] for t in resp.json()}
    # Everyone whose role can hold jobs: both techs, the service manager,
    # plus owner/manager roles — but never accountant/warehouse users.
    assert {"Tech A", "Tech B", "Serv Mgr"} <= names
    assert "No Jobs" not in names
    assert "Wh User" not in names

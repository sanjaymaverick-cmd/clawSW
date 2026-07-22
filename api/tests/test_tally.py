"""Phase 5 — Tally XML bridge.

The gateway is mocked with httpx.MockTransport, so these tests pin down:
the Sales voucher XML we send (structure + escaping), success flipping
orders 'confirmed' → 'synced_to_tally' with a success row in
tally_sync_log, failures logged without losing the order, payment pulls
deduplicating, and the invoices read/write RBAC gates.
"""
import re
import uuid
import xml.etree.ElementTree as ET

import httpx
import pytest

from app.db import SessionLocal
from app.models import WebsiteOrder
from app.tally import (
    TallyClient,
    get_tally_client,
    parse_import_response,
    pull_payments,
    push_confirmed_orders,
    voucher_number,
)

from .conftest import auth_headers

IMPORT_OK = """<ENVELOPE><HEADER><STATUS>1</STATUS></HEADER><BODY><DATA>
<IMPORTRESULT><CREATED>1</CREATED><ALTERED>0</ALTERED><ERRORS>0</ERRORS></IMPORTRESULT>
</DATA></BODY></ENVELOPE>"""

IMPORT_LINEERROR = """<ENVELOPE><BODY><DATA><IMPORTRESULT>
<CREATED>0</CREATED><ERRORS>1</ERRORS></IMPORTRESULT>
<LINEERROR>Ledger 'Website Customers' does not exist!</LINEERROR>
</DATA></BODY></ENVELOPE>"""

EMPTY_RECEIPTS = "<ENVELOPE></ENVELOPE>"


def receipts_with(voucher_no: str) -> str:
    return f"""<ENVELOPE><BODY><DATA><TALLYMESSAGE>
    <VOUCHER VCHTYPE="Receipt"><VOUCHERNUMBER>42</VOUCHERNUMBER>
    <REFERENCE>{voucher_no}</REFERENCE><AMOUNT>-1700.00</AMOUNT></VOUCHER>
    </TALLYMESSAGE></DATA></BODY></ENVELOPE>"""


class FakeGateway:
    """Programmable Tally gateway: records import payloads, answers with
    whatever the test configured."""

    def __init__(self):
        self.import_response = IMPORT_OK
        self.export_response = EMPTY_RECEIPTS
        self.down = False
        self.requests: list[str] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        if self.down:
            raise httpx.ConnectError("connection refused")
        body = request.content.decode()
        self.requests.append(body)
        if "Import Data" in body:
            return httpx.Response(200, text=self.import_response)
        return httpx.Response(200, text=self.export_response)

    def client(self) -> TallyClient:
        return TallyClient(transport=httpx.MockTransport(self.handler))


@pytest.fixture()
def gateway(client):
    gw = FakeGateway()
    tally_client = gw.client()
    from app.main import app

    app.dependency_overrides[get_tally_client] = lambda: tally_client
    yield gw
    app.dependency_overrides.pop(get_tally_client, None)
    tally_client.close()


@pytest.fixture(scope="module")
def setup(client, owner_headers):
    """Catalog items with stock, an accountant + technician, and a helper
    that places and confirms a fresh website order."""
    items = []
    for sku, name, price in (
        ("TLY-SPARE-1", "Claw Pin & Bush Kit <heavy>", 500.0),
        ("TLY-SPARE-2", "Hydraulic Seal", 200.0),
    ):
        resp = client.post(
            "/items",
            headers=owner_headers,
            json={"sku": sku, "name": name, "price": price, "unit": "pc",
                  "is_spare": True},
        )
        assert resp.status_code == 201, resp.text
        items.append(resp.json())

    resp = client.post(
        "/warehouses", headers=owner_headers, json={"name": "Tally WH"}
    )
    assert resp.status_code == 201, resp.text
    warehouse = resp.json()

    for item in items:
        resp = client.post(
            "/stock/adjust",
            headers=owner_headers,
            json={
                "item_id": item["id"],
                "warehouse_id": warehouse["id"],
                "move_type": "in",
                "quantity": 500,
            },
        )
        assert resp.status_code == 200, resp.text

    for name, email, role in (
        ("Tally Accountant", "tallyacct@clawsw.example", "accountant"),
        ("Tally Tech", "tallytech@clawsw.example", "technician"),
    ):
        resp = client.post(
            "/users",
            headers=owner_headers,
            json={"name": name, "email": email, "password": "password-123",
                  "role": role},
        )
        assert resp.status_code == 201, resp.text

    def make_confirmed_order(customer_name="Ravi & Sons <Pvt>"):
        resp = client.post(
            "/public/orders",
            json={
                "customer_name": customer_name,
                "email": "ravi@example.com",
                "phone": "+91 98888 77777",
                "items": [
                    {"item_id": items[0]["id"], "quantity": 3},
                    {"item_id": items[1]["id"], "quantity": 1},
                ],
            },
        )
        assert resp.status_code == 201, resp.text
        order_id = resp.json()["id"]
        resp = client.post(
            f"/website/orders/{order_id}/confirm",
            headers=owner_headers,
            json={"warehouse_id": warehouse["id"]},
        )
        assert resp.status_code == 200, resp.text
        return order_id

    return {
        "items": items,
        "warehouse": warehouse,
        "make_confirmed_order": make_confirmed_order,
    }


@pytest.fixture(scope="module")
def acct_headers(client, setup):
    return auth_headers(client, "tallyacct@clawsw.example", "password-123")


@pytest.fixture(scope="module")
def tech_headers(client, setup):
    return auth_headers(client, "tallytech@clawsw.example", "password-123")


def _order_status(client, owner_headers, order_id):
    return client.get(
        f"/website/orders/{order_id}", headers=owner_headers
    ).json()["status"]


# ---- voucher XML ----

def test_sales_voucher_xml_structure_and_escaping(client, setup):
    order_id = setup["make_confirmed_order"]()
    from app.tally import build_sales_voucher_xml

    with SessionLocal() as db:
        order = db.get(WebsiteOrder, uuid.UUID(order_id))
        xml = build_sales_voucher_xml(db, order)
        vch_no = voucher_number(order)

    root = ET.fromstring(xml)  # would raise if escaping were broken
    assert root.find("HEADER/TALLYREQUEST").text == "Import Data"
    voucher = root.find(".//VOUCHER")
    assert voucher.get("VCHTYPE") == "Sales"
    assert voucher.get("ACTION") == "Create"
    assert voucher.find("VOUCHERNUMBER").text == vch_no
    assert voucher.find("BASICBUYERNAME").text == "Ravi & Sons <Pvt>"
    assert re.fullmatch(r"WEB-[0-9A-F]{12}", vch_no)

    # Party debit balances the inventory lines: 3*500 + 1*200 = 1700.
    party = voucher.find("LEDGERENTRIES.LIST")
    assert party.find("LEDGERNAME").text == "Website Customers"
    assert party.find("AMOUNT").text == "-1700.00"

    entries = voucher.findall("ALLINVENTORYENTRIES.LIST")
    assert len(entries) == 2
    first = entries[0]
    assert first.find("STOCKITEMNAME").text == "Claw Pin & Bush Kit <heavy>"
    assert first.find("RATE").text == "500.00/pc"
    assert first.find("BILLEDQTY").text == "3 pc"
    assert first.find("AMOUNT").text == "1500.00"
    allocation = first.find("ACCOUNTINGALLOCATIONS.LIST")
    assert allocation.find("LEDGERNAME").text == "Sales"
    assert allocation.find("AMOUNT").text == "1500.00"


def test_parse_import_response():
    assert parse_import_response(IMPORT_OK).ok is True
    failed = parse_import_response(IMPORT_LINEERROR)
    assert failed.ok is False
    assert "Website Customers" in failed.error
    assert parse_import_response("not xml at all").ok is False


# ---- manual push endpoint ----

def test_push_success_flips_status_and_logs(
    client, owner_headers, acct_headers, setup, gateway
):
    order_id = setup["make_confirmed_order"]()
    resp = client.post(f"/tally/push/orders/{order_id}", headers=acct_headers)
    assert resp.status_code == 200, resp.text
    entry = resp.json()
    assert entry["direction"] == "to_tally"
    assert entry["entity_type"] == "website_order"
    assert entry["entity_id"] == order_id
    assert entry["status"] == "success"
    assert entry["error_message"] is None
    assert _order_status(client, owner_headers, order_id) == "synced_to_tally"
    # The voucher XML actually went to the gateway.
    assert any("Import Data" in r and "VOUCHER" in r for r in gateway.requests)


def test_push_failure_logs_error_and_keeps_order_confirmed(
    client, owner_headers, acct_headers, setup, gateway
):
    gateway.import_response = IMPORT_LINEERROR
    order_id = setup["make_confirmed_order"]()
    resp = client.post(f"/tally/push/orders/{order_id}", headers=acct_headers)
    assert resp.status_code == 502
    assert "Website Customers" in resp.json()["detail"]
    # Still awaiting sync — the worker will retry it.
    assert _order_status(client, owner_headers, order_id) == "confirmed"
    log = client.get("/tally/sync-log", headers=acct_headers).json()
    row = next(e for e in log if e["entity_id"] == order_id)
    assert row["status"] == "failed"
    assert "Website Customers" in row["error_message"]
    # Clean up so later tests aren't affected by this pending order.
    gateway.import_response = IMPORT_OK
    assert (
        client.post(f"/tally/push/orders/{order_id}", headers=acct_headers).status_code
        == 200
    )


def test_push_gateway_down_logs_and_keeps_order(
    client, owner_headers, acct_headers, setup, gateway
):
    gateway.down = True
    order_id = setup["make_confirmed_order"]()
    resp = client.post(f"/tally/push/orders/{order_id}", headers=acct_headers)
    assert resp.status_code == 502
    assert "unreachable" in resp.json()["detail"]
    assert _order_status(client, owner_headers, order_id) == "confirmed"
    gateway.down = False
    assert (
        client.post(f"/tally/push/orders/{order_id}", headers=acct_headers).status_code
        == 200
    )


def test_push_rejects_pending_and_synced_orders(
    client, owner_headers, acct_headers, setup, gateway
):
    resp = client.post(
        "/public/orders",
        json={
            "customer_name": "Pending Person",
            "email": "pending@example.com",
            "items": [{"item_id": setup["items"][0]["id"], "quantity": 1}],
        },
    )
    pending_id = resp.json()["id"]
    resp = client.post(f"/tally/push/orders/{pending_id}", headers=acct_headers)
    assert resp.status_code == 400

    synced_id = setup["make_confirmed_order"]()
    assert (
        client.post(f"/tally/push/orders/{synced_id}", headers=acct_headers).status_code
        == 200
    )
    resp = client.post(f"/tally/push/orders/{synced_id}", headers=acct_headers)
    assert resp.status_code == 400  # no duplicate vouchers in Tally

    resp = client.post(f"/tally/push/orders/{uuid.uuid4()}", headers=acct_headers)
    assert resp.status_code == 404


# ---- worker cycle ----

def test_worker_pushes_all_confirmed_orders(client, owner_headers, setup):
    ids = {setup["make_confirmed_order"](), setup["make_confirmed_order"]()}
    gw = FakeGateway()
    tally_client = gw.client()
    with SessionLocal() as db:
        entries = push_confirmed_orders(db, tally_client)
    tally_client.close()
    assert {str(e.entity_id) for e in entries} >= ids
    assert all(e.status == "success" for e in entries)
    for order_id in ids:
        assert _order_status(client, owner_headers, order_id) == "synced_to_tally"


# ---- payment pull ----

def test_pull_payments_matches_and_deduplicates(
    client, owner_headers, acct_headers, setup, gateway
):
    order_id = setup["make_confirmed_order"]()
    assert (
        client.post(f"/tally/push/orders/{order_id}", headers=acct_headers).status_code
        == 200
    )
    with SessionLocal() as db:
        vch_no = voucher_number(db.get(WebsiteOrder, uuid.UUID(order_id)))

    # No receipts in Tally yet: nothing to record.
    resp = client.post("/tally/pull-payments", headers=acct_headers)
    assert resp.status_code == 200
    assert all(e["entity_id"] != order_id for e in resp.json())

    gateway.export_response = receipts_with(vch_no)
    resp = client.post("/tally/pull-payments", headers=acct_headers)
    entries = [e for e in resp.json() if e["entity_id"] == order_id]
    assert len(entries) == 1
    assert entries[0]["direction"] == "from_tally"
    assert entries[0]["status"] == "payment_received"

    # Same receipt seen on the next poll must not produce a second row.
    resp = client.post("/tally/pull-payments", headers=acct_headers)
    assert all(e["entity_id"] != order_id for e in resp.json())
    log = client.get("/tally/sync-log", headers=acct_headers).json()
    payment_rows = [
        e
        for e in log
        if e["entity_id"] == order_id and e["status"] == "payment_received"
    ]
    assert len(payment_rows) == 1


def test_pull_payments_survives_gateway_outage(client, acct_headers, setup, gateway):
    gateway.down = True
    resp = client.post("/tally/pull-payments", headers=acct_headers)
    assert resp.status_code == 200
    assert resp.json() == []


# ---- status endpoint ----

def test_status_reports_counts_and_reachability(
    client, owner_headers, setup, gateway
):
    resp = client.get("/tally/status", headers=owner_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["gateway_reachable"] is True
    assert body["synced_order_count"] >= 1
    assert body["last_push_at"] is not None

    gateway.down = True
    assert (
        client.get("/tally/status", headers=owner_headers).json()["gateway_reachable"]
        is False
    )


# ---- RBAC gates ----

def test_owner_reads_but_cannot_push(client, owner_headers, setup, gateway):
    # Owner holds invoices:read only (section-4 matrix: "full (read)").
    assert client.get("/tally/sync-log", headers=owner_headers).status_code == 200
    order_id = setup["make_confirmed_order"]()
    assert (
        client.post(f"/tally/push/orders/{order_id}", headers=owner_headers).status_code
        == 403
    )
    assert (
        client.post("/tally/pull-payments", headers=owner_headers).status_code == 403
    )


def test_technician_cannot_touch_tally(client, tech_headers, setup, gateway):
    assert client.get("/tally/status", headers=tech_headers).status_code == 403
    assert client.get("/tally/sync-log", headers=tech_headers).status_code == 403
    assert (
        client.post(f"/tally/push/orders/{uuid.uuid4()}", headers=tech_headers).status_code
        == 403
    )


def test_tally_requires_auth(client, setup):
    assert client.get("/tally/status").status_code == 401
    assert client.get("/tally/sync-log").status_code == 401

"""Phase 1 — inventory CRUD, stock movement bookkeeping, and role gates."""
import pytest

from .conftest import auth_headers


@pytest.fixture(scope="module")
def wh_headers(client, owner_headers):
    """A warehouse-role user: inventory read/write, but no admin access."""
    client.post(
        "/users",
        headers=owner_headers,
        json={
            "name": "Store Keeper",
            "email": "stores@clawsw.example",
            "password": "password-123",
            "role": "warehouse",
        },
    )
    return auth_headers(client, "stores@clawsw.example", "password-123")


@pytest.fixture(scope="module")
def acct_headers(client, owner_headers):
    """An accountant: inventory read only."""
    client.post(
        "/users",
        headers=owner_headers,
        json={
            "name": "Beans Counter",
            "email": "accounts@clawsw.example",
            "password": "password-123",
            "role": "accountant",
        },
    )
    return auth_headers(client, "accounts@clawsw.example", "password-123")


@pytest.fixture(scope="module")
def setup(client, wh_headers):
    """Two warehouses and one item, created by the warehouse-role user."""
    main = client.post(
        "/warehouses", headers=wh_headers, json={"name": "Main Store", "location": "HQ"}
    ).json()
    site = client.post(
        "/warehouses", headers=wh_headers, json={"name": "Site Van"}
    ).json()
    item = client.post(
        "/items",
        headers=wh_headers,
        json={
            "sku": "BRG-6204",
            "name": "Ball bearing 6204",
            "category": "bearings",
            "unit": "pcs",
            "price": 180,
            "reorder_level": 10,
            "is_spare": True,
        },
    ).json()
    return {"main": main, "site": site, "item": item}


def test_item_crud(client, wh_headers):
    created = client.post(
        "/items",
        headers=wh_headers,
        json={"sku": "TMP-1", "name": "Temp item", "price": 5},
    )
    assert created.status_code == 201, created.text
    item_id = created.json()["id"]

    dup = client.post(
        "/items", headers=wh_headers, json={"sku": "TMP-1", "name": "Dup", "price": 1}
    )
    assert dup.status_code == 409

    patched = client.patch(
        f"/items/{item_id}", headers=wh_headers, json={"price": 7.5, "is_tool": True}
    )
    assert patched.status_code == 200
    assert patched.json()["price"] == 7.5
    assert patched.json()["is_tool"] is True

    assert client.delete(f"/items/{item_id}", headers=wh_headers).status_code == 204
    assert client.get(f"/items/{item_id}", headers=wh_headers).status_code == 404


def test_stock_in_out_updates_level(client, wh_headers, setup):
    item_id = setup["item"]["id"]
    main_id = setup["main"]["id"]

    resp = client.post(
        "/stock/adjust",
        headers=wh_headers,
        json={"item_id": item_id, "warehouse_id": main_id, "move_type": "in", "quantity": 50},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["quantity"] == 50
    assert resp.json()["below_reorder"] is False

    resp = client.post(
        "/stock/adjust",
        headers=wh_headers,
        json={"item_id": item_id, "warehouse_id": main_id, "move_type": "out", "quantity": 42},
    )
    assert resp.status_code == 200
    assert resp.json()["quantity"] == 8
    assert resp.json()["below_reorder"] is True  # 8 <= reorder_level 10


def test_stock_cannot_go_negative(client, wh_headers, setup):
    resp = client.post(
        "/stock/adjust",
        headers=wh_headers,
        json={
            "item_id": setup["item"]["id"],
            "warehouse_id": setup["main"]["id"],
            "move_type": "out",
            "quantity": 9999,
        },
    )
    assert resp.status_code == 400
    assert "Insufficient stock" in resp.json()["detail"]


def test_transfer_moves_stock_between_warehouses(client, wh_headers, setup):
    item_id = setup["item"]["id"]
    resp = client.post(
        "/stock/transfer",
        headers=wh_headers,
        json={
            "item_id": item_id,
            "from_warehouse_id": setup["main"]["id"],
            "to_warehouse_id": setup["site"]["id"],
            "quantity": 3,
        },
    )
    assert resp.status_code == 200, resp.text
    levels = {row["warehouse_name"]: row["quantity"] for row in resp.json()}
    assert levels == {"Main Store": 5, "Site Van": 3}

    too_much = client.post(
        "/stock/transfer",
        headers=wh_headers,
        json={
            "item_id": item_id,
            "from_warehouse_id": setup["main"]["id"],
            "to_warehouse_id": setup["site"]["id"],
            "quantity": 9999,
        },
    )
    assert too_much.status_code == 400

    same = client.post(
        "/stock/transfer",
        headers=wh_headers,
        json={
            "item_id": item_id,
            "from_warehouse_id": setup["main"]["id"],
            "to_warehouse_id": setup["main"]["id"],
            "quantity": 1,
        },
    )
    assert same.status_code == 400


def test_moves_ledger_reconciles_with_levels(client, wh_headers, setup):
    item_id = setup["item"]["id"]
    moves = client.get(
        f"/stock/moves?item_id={item_id}", headers=wh_headers
    ).json()
    # in +50, out -42, transfer -3/+3 → ledger sums to on-hand total of 8
    assert sum(m["quantity"] for m in moves) == 8
    assert {m["move_type"] for m in moves} == {"in", "out", "transfer"}
    assert all(m["created_by_name"] == "Store Keeper" for m in moves)

    stock = client.get(f"/stock?item_id={item_id}", headers=wh_headers).json()
    assert sum(row["quantity"] for row in stock) == 8


def test_accountant_can_read_but_not_write(client, acct_headers, setup):
    assert client.get("/items", headers=acct_headers).status_code == 200
    assert client.get("/stock", headers=acct_headers).status_code == 200
    resp = client.post(
        "/items",
        headers=acct_headers,
        json={"sku": "NOPE-1", "name": "Nope", "price": 1},
    )
    assert resp.status_code == 403
    resp = client.post(
        "/stock/adjust",
        headers=acct_headers,
        json={
            "item_id": setup["item"]["id"],
            "warehouse_id": setup["main"]["id"],
            "move_type": "in",
            "quantity": 1,
        },
    )
    assert resp.status_code == 403


def test_item_with_history_cannot_be_deleted(client, wh_headers, setup):
    resp = client.delete(f"/items/{setup['item']['id']}", headers=wh_headers)
    assert resp.status_code == 409

    resp = client.delete(f"/warehouses/{setup['main']['id']}", headers=wh_headers)
    assert resp.status_code == 409


def test_inventory_requires_auth(client):
    assert client.get("/items").status_code == 401
    assert client.get("/stock").status_code == 401

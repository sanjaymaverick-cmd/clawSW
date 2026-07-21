"""Seed integrity: the seeded roles/permissions must match the blueprint
section-4 matrix, cover every gate the routers enforce, and survive
re-runs without duplicating or altering anything."""
from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import Permission, Role, User
from app.seed import PERMISSION_MATRIX, ROLE_NAMES, seed

# docs/BLUEPRINT.md section 4, one row per role (including the Website
# module column added in Phase 4). Spelled out here independently of
# app.seed so a typo there cannot self-validate.
BLUEPRINT_MATRIX = {
    "owner": {
        ("inventory", "read"), ("inventory", "write"),
        ("invoices", "read"),
        ("service_jobs", "read"), ("service_jobs", "write"),
        ("reports", "read"),
        ("website", "read"), ("website", "write"),
        ("admin", "read"), ("admin", "write"),
    },
    "manager": {
        ("inventory", "read"), ("inventory", "write"),
        ("invoices", "read"),
        ("service_jobs", "read"), ("service_jobs", "write"),
        ("reports", "read"),
        ("website", "read"), ("website", "write"),
    },
    "accountant": {
        ("inventory", "read"),
        ("invoices", "read"), ("invoices", "write"),
        ("reports", "read"),
        ("website", "read"),
    },
    "service_manager": {
        ("inventory", "read"),
        ("service_jobs", "read"), ("service_jobs", "write"),
        ("reports", "read"),
    },
    "technician": {
        ("inventory", "read"),
        ("service_jobs", "read"), ("service_jobs", "write"),
    },
    "warehouse": {
        ("inventory", "read"), ("inventory", "write"),
        ("reports", "read"),
        ("website", "read"),
    },
}

# Every (resource, action) any router currently gates on — including the
# has_permission() section checks in the reports router.
GATES_IN_USE = {
    ("inventory", "read"), ("inventory", "write"),
    ("service_jobs", "read"), ("service_jobs", "write"),
    ("admin", "read"), ("admin", "write"),
    ("reports", "read"),
    ("invoices", "read"),
    ("website", "read"), ("website", "write"),
}


def _seeded_matrix(db) -> dict[str, set[tuple[str, str]]]:
    rows = db.execute(
        select(Role.name, Permission.resource, Permission.action).join(
            Permission, Permission.role_id == Role.id
        )
    ).all()
    out: dict[str, set[tuple[str, str]]] = {name: set() for name in ROLE_NAMES}
    for role_name, resource, action in rows:
        out[role_name].add((resource, action))
    return out


def test_all_blueprint_roles_seeded(client):
    with SessionLocal() as db:
        names = {r.name for r in db.execute(select(Role)).scalars()}
    assert names == set(ROLE_NAMES) == set(BLUEPRINT_MATRIX)


def test_seeded_permissions_match_blueprint_matrix(client):
    assert {k: set(v) for k, v in PERMISSION_MATRIX.items()} == BLUEPRINT_MATRIX
    with SessionLocal() as db:
        assert _seeded_matrix(db) == BLUEPRINT_MATRIX


def test_every_enforced_gate_is_grantable(client):
    granted = set().union(*BLUEPRINT_MATRIX.values())
    missing = GATES_IN_USE - granted
    assert not missing, f"Routers gate on permissions nobody holds: {missing}"


def test_seed_rerun_is_idempotent(client):
    with SessionLocal() as db:
        def counts():
            return (
                db.execute(select(func.count(Role.id))).scalar_one(),
                db.execute(select(func.count(Permission.id))).scalar_one(),
                db.execute(select(func.count(User.id))).scalar_one(),
            )

        before = counts()
        seed(db)
        seed(db)
        assert counts() == before

        assert _seeded_matrix(db) == BLUEPRINT_MATRIX


def test_exactly_one_seeded_owner(client):
    with SessionLocal() as db:
        n = db.execute(
            select(func.count(User.id)).where(User.email == "owner@clawsw.example")
        ).scalar_one()
    assert n == 1

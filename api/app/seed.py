"""Idempotent startup seed: roles, permission matrix, initial owner user.

The (resource, action) rows encode the role matrix in BLUEPRINT.md section 4.
Row scoping ("own jobs only", "department reports", "financial only") is a
later-phase concern enforced inside the relevant modules; the permissions
table answers only whether the role may touch the resource at all.
"""
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .models import Permission, Role, User
from .security import hash_password

logger = logging.getLogger(__name__)

ROLE_NAMES = [
    "owner",
    "manager",
    "accountant",
    "service_manager",
    "technician",
    "warehouse",
]

# role -> list of (resource, action), encoding the BLUEPRINT.md section-4
# matrix including its Website module column (Phase 4). Like everything
# else these are table rows, adjustable without code changes.
PERMISSION_MATRIX: dict[str, list[tuple[str, str]]] = {
    "owner": [
        ("inventory", "read"), ("inventory", "write"),
        ("invoices", "read"),
        ("service_jobs", "read"), ("service_jobs", "write"),
        ("reports", "read"),
        ("website", "read"), ("website", "write"),
        ("admin", "read"), ("admin", "write"),
    ],
    "manager": [
        ("inventory", "read"), ("inventory", "write"),
        ("invoices", "read"),
        ("service_jobs", "read"), ("service_jobs", "write"),
        ("reports", "read"),
        ("website", "read"), ("website", "write"),
    ],
    "accountant": [
        ("inventory", "read"),
        ("invoices", "read"), ("invoices", "write"),
        ("reports", "read"),
        ("website", "read"),
    ],
    "service_manager": [
        ("inventory", "read"),
        ("service_jobs", "read"), ("service_jobs", "write"),
        ("reports", "read"),
    ],
    "technician": [
        ("inventory", "read"),
        ("service_jobs", "read"), ("service_jobs", "write"),
    ],
    "warehouse": [
        ("inventory", "read"), ("inventory", "write"),
        ("reports", "read"),
        ("website", "read"),
    ],
}


def seed(db: Session) -> None:
    roles: dict[str, Role] = {
        r.name: r for r in db.execute(select(Role)).scalars()
    }
    for name in ROLE_NAMES:
        if name not in roles:
            role = Role(name=name)
            db.add(role)
            roles[name] = role
    db.flush()

    existing = {
        (p.role_id, p.resource, p.action)
        for p in db.execute(select(Permission)).scalars()
    }
    for role_name, grants in PERMISSION_MATRIX.items():
        role = roles[role_name]
        for resource, action in grants:
            if (role.id, resource, action) not in existing:
                db.add(Permission(role_id=role.id, resource=resource, action=action))

    has_users = db.execute(select(User.id).limit(1)).first() is not None
    if not has_users:
        db.add(
            User(
                name=settings.admin_name,
                email=settings.admin_email,
                password_hash=hash_password(settings.admin_password),
                role_id=roles["owner"].id,
                active=True,
            )
        )
        logger.info("Seeded initial owner user %s", settings.admin_email)

    db.commit()

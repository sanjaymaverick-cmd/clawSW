"""wave B-E: vans, receivables, imports, projects, machinery passport fields

Revision ID: a1b2c3d4e5f6
Revises: c9d2004e37c4
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "c9d2004e37c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("warehouses", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("kind", sa.Text(), nullable=False, server_default="main")
        )
        batch_op.add_column(sa.Column("assigned_user_id", sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            "fk_warehouses_assigned_user",
            "users",
            ["assigned_user_id"],
            ["id"],
        )

    with op.batch_alter_table("machinery", schema=None) as batch_op:
        batch_op.add_column(sa.Column("installed_at", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("city", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("customer_name", sa.Text(), nullable=True))

    with op.batch_alter_table("service_jobs", schema=None) as batch_op:
        batch_op.add_column(sa.Column("city", sa.Text(), nullable=True))

    op.create_table(
        "receivable_snapshots",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("party_ref", sa.Text(), nullable=True),
        sa.Column("party_name", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(asdecimal=False), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("days_overdue", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=True),
        sa.Column("entity_id", sa.Uuid(), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "import_containers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("origin", sa.Text(), nullable=True),
        sa.Column("port", sa.Text(), nullable=True),
        sa.Column("supplier", sa.Text(), nullable=True),
        sa.Column("eta_port", sa.Date(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("milestone", sa.Text(), nullable=True),
        sa.Column("value_inr", sa.Numeric(asdecimal=False), nullable=False, server_default="0"),
        sa.Column("delay_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("machine_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "projects",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("customer_name", sa.Text(), nullable=False),
        sa.Column("city", sa.Text(), nullable=True),
        sa.Column("stage", sa.Text(), nullable=False),
        sa.Column("boq_value", sa.Numeric(asdecimal=False), nullable=False, server_default="0"),
        sa.Column("margin_pct", sa.Numeric(asdecimal=False), nullable=False, server_default="0"),
        sa.Column("target_install", sa.Date(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "project_containers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("container_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["container_id"], ["import_containers.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "container_id"),
    )


def downgrade() -> None:
    op.drop_table("project_containers")
    op.drop_table("projects")
    op.drop_table("import_containers")
    op.drop_table("receivable_snapshots")
    with op.batch_alter_table("service_jobs", schema=None) as batch_op:
        batch_op.drop_column("city")
    with op.batch_alter_table("machinery", schema=None) as batch_op:
        batch_op.drop_column("customer_name")
        batch_op.drop_column("city")
        batch_op.drop_column("installed_at")
    with op.batch_alter_table("warehouses", schema=None) as batch_op:
        batch_op.drop_constraint("fk_warehouses_assigned_user", type_="foreignkey")
        batch_op.drop_column("assigned_user_id")
        batch_op.drop_column("kind")

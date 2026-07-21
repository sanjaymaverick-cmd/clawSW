"""Guard against schema drift: every model change must ship a migration.

The app fixture boots via Alembic (upgrade head), so comparing the migrated
database against the SQLAlchemy metadata must yield no differences. If this
test fails, run:  alembic revision --autogenerate -m "<describe change>"
"""
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext

from app.db import Base, engine


def test_migrations_match_models(client):
    with engine.connect() as connection:
        migration_context = MigrationContext.configure(connection)
        diff = compare_metadata(migration_context, Base.metadata)
    assert diff == [], f"Models changed without a migration: {diff}"


def test_alembic_version_is_stamped(client):
    with engine.connect() as connection:
        context = MigrationContext.configure(connection)
        assert context.get_current_revision() is not None

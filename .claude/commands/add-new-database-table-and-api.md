---
name: add-new-database-table-and-api
description: Workflow command scaffold for add-new-database-table-and-api in clawSW.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-new-database-table-and-api

Use this workflow when working on **add-new-database-table-and-api** in `clawSW`.

## Goal

Adds a new database table, generates Alembic migration, updates backend models and schemas, exposes new API endpoints, updates seed data and tests, and (if relevant) adds frontend integration.

## Common Files

- `api/app/models.py`
- `api/app/schemas.py`
- `api/app/routers/*.py`
- `api/app/seed.py`
- `api/migrations/versions/*.py`
- `api/tests/test_*.py`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Define new table(s) in models.py
- Generate Alembic migration for schema changes
- Update schemas.py with new Pydantic models
- Update or create relevant routers (e.g., public.py, website.py, tally.py) to expose new endpoints
- Update seed.py to seed initial data and permissions

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.
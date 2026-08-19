---
name: update-permissions-and-seed-data
description: Workflow command scaffold for update-permissions-and-seed-data in clawSW.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /update-permissions-and-seed-data

Use this workflow when working on **update-permissions-and-seed-data** in `clawSW`.

## Goal

Updates permission matrix in documentation, aligns seed data and tests to new or changed permissions.

## Common Files

- `docs/BLUEPRINT.md`
- `api/app/seed.py`
- `api/tests/test_seed.py`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit docs/BLUEPRINT.md to update the permissions matrix
- Update seed.py to seed new or changed permissions
- Update test_seed.py to test new permission logic
- Update comments in seed and test files to reference the correct documentation section

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.
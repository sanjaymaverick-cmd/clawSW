```markdown
# clawSW Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and workflows used in the `clawSW` Python codebase. You'll learn the project's coding conventions, how to add new database-backed features and APIs, update permissions and seed data, and how to structure and write tests. This guide is ideal for contributors who want to quickly become productive and follow established practices.

## Coding Conventions

### File Naming
- **Convention:** camelCase (e.g., `myModule.py`, `userProfile.py`)
- **Example:**
  ```
  userProfile.py
  seedData.py
  ```

### Import Style
- **Convention:** Relative imports are preferred.
- **Example:**
  ```python
  from .models import User
  from .schemas import UserSchema
  ```

### Export Style
- **Convention:** Mixed (both explicit and implicit exports are used).
- **Example:**
  ```python
  # Explicit export
  __all__ = ["User", "UserSchema"]

  # Implicit export (just defining classes/functions)
  class User:
      ...
  ```

### Commit Patterns
- **Type:** Freeform, no enforced prefix.
- **Average Length:** ~36 characters.

## Workflows

### Add New Database Table and API
**Trigger:** When introducing a new business entity or feature that requires persistent storage and API access.  
**Command:** `/new-table`

1. **Define new table(s) in `models.py`:**
   ```python
   class Widget(Base):
       __tablename__ = "widgets"
       id = Column(Integer, primary_key=True)
       name = Column(String, nullable=False)
   ```
2. **Generate Alembic migration for schema changes:**
   ```bash
   alembic revision --autogenerate -m "Add widgets table"
   alembic upgrade head
   ```
3. **Update `schemas.py` with new Pydantic models:**
   ```python
   class WidgetSchema(BaseModel):
       id: int
       name: str
   ```
4. **Update or create relevant routers to expose new endpoints:**
   ```python
   @router.post("/widgets/", response_model=WidgetSchema)
   def create_widget(widget: WidgetSchema):
       ...
   ```
5. **Update `seed.py` to seed initial data and permissions:**
   ```python
   def seed_widgets(session):
       session.add(Widget(name="Sample Widget"))
   ```
6. **Update or add tests for new functionality:**
   - Add or update files like `test_seed.py`, `test_widget.py`.
   ```python
   def test_create_widget(client):
       response = client.post("/widgets/", json={"name": "Test"})
       assert response.status_code == 200
   ```
7. **Update documentation (`docs/BLUEPRINT.md`) to reflect schema and permission changes.**
8. **Update frontend (Next.js or dashboard) to consume new API endpoints if applicable.**
   - Example: Update `dashboard/src/widgets.tsx`.

**Files Involved:**
- `api/app/models.py`
- `api/app/schemas.py`
- `api/app/routers/*.py`
- `api/app/seed.py`
- `api/migrations/versions/*.py`
- `api/tests/test_*.py`
- `docs/BLUEPRINT.md`
- `dashboard/src/*.tsx`
- `website/app/**/*.tsx`

---

### Update Permissions and Seed Data
**Trigger:** When changing or adding permission levels for roles or modules.  
**Command:** `/update-permissions`

1. **Edit `docs/BLUEPRINT.md` to update the permissions matrix.**
   - Document new roles, modules, or permission changes.
2. **Update `seed.py` to seed new or changed permissions.**
   ```python
   def seed_permissions(session):
       session.add(Permission(role="admin", module="widgets", level="write"))
   ```
3. **Update `test_seed.py` to test new permission logic.**
   ```python
   def test_admin_can_write_widget(client, admin_token):
       response = client.post("/widgets/", headers={"Authorization": f"Bearer {admin_token}"})
       assert response.status_code == 200
   ```
4. **Update comments in seed and test files to reference the correct documentation section.**

**Files Involved:**
- `docs/BLUEPRINT.md`
- `api/app/seed.py`
- `api/tests/test_seed.py`

---

## Testing Patterns

- **Framework:** Unknown (not explicitly detected).
- **File Pattern:** Test files follow the pattern `test_*.py` (Python) and `*.test.ts` (TypeScript for frontend).
- **Example:**
  ```python
  # api/tests/test_widget.py
  def test_widget_creation(client):
      response = client.post("/widgets/", json={"name": "Gadget"})
      assert response.status_code == 200
  ```

- **Frontend Example:**
  ```typescript
  // dashboard/src/widget.test.ts
  test('renders widget', () => {
    render(<Widget />);
    expect(screen.getByText('Widget')).toBeInTheDocument();
  });
  ```

## Commands

| Command            | Purpose                                                         |
|--------------------|-----------------------------------------------------------------|
| /new-table         | Add a new database table, migration, API, and related frontend  |
| /update-permissions| Update permissions matrix, seed data, and related tests         |
```

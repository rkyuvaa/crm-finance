# AI DEVELOPMENT RULES & GOVERNANCE

> **Mandate for AI Agents**: Cursor | Antigravity | GitHub Copilot | Other AI Assistants

---

## 1. Golden Rules of Multi-AI Development

1. **INSPECT BEFORE INVENTING**: Always search the existing codebase before creating a new utility, component, table, schema, or helper. If an equivalent exists, **REUSE OR EXTEND IT**.
2. **ZERO COMPETING ARCHITECTURES**: Never introduce a parallel state management library, alternative UI framework, redundant ORM, or secondary authentication/permission system.
3. **NO GUESSING CODE LOGIC OR PATHS**: Never infer database column names, API method signatures, or component props. Read the authoritative source code first.
4. **NO DESTRUCTIVE REWRITES**: Do not rewrite existing core infrastructure files (`package.json`, `docker-compose.yml`, `alembic.ini`, `server/app/main.py`, shared components) unless required for the explicit task.
5. **SERVERSIDE SECURITY FIRST**: Never rely solely on frontend hidden fields or UI disabling for access control. Every API route must enforce backend authorization (`Depends(get_current_user)` / `require_permission`).

---

## 2. Standard Workflow for Feature Development

```
1. INSPECT  ───>  Search codebase for existing entities, endpoints, and components.
2. PLAN     ───>  Define exact backend schemas, models, migrations, and frontend views.
3. IMPLEMENT ──>  Write clean, typed, modular code adhering to ERP design system.
4. VALIDATE ───>  Execute pytest backend suite and tsc typecheck frontend.
5. REPORT   ───>  Provide concise summary of modified files and verification results.
```

---

## 3. Mandatory Coding Conventions

### Backend (FastAPI + SQLAlchemy)
- Use SQLAlchemy 2.0 type annotations (`Mapped[int] = mapped_column(...)`).
- Use `func.current_timestamp()` instead of `func.now()` for SQLite/PostgreSQL cross-compatibility.
- Place route handlers in `server/app/api/v1/`.
- Wrap complex business operations in `server/app/services/`.
- Ensure all DDL changes are captured in an Alembic migration in `server/alembic/versions/`.

### Frontend (React + TypeScript + MUI)
- All pages must use `AppLayout` and follow the standard visual header pattern.
- Form components must use `react-hook-form` + `zod` for validation.
- Server state MUST be fetched via RTK Query hooks in `@/api/`.
- Display monetary values using standard formatters (`₹X.XX` or `₹X.XL`).

---

## 4. Protected Shared Files

The following shared architecture files require high care. Small, safe, incremental changes only:

- `client/package.json`
- `server/pyproject.toml`
- `docker-compose.yml`
- `server/app/models/__init__.py`
- `server/app/api/v1/api.py`
- `client/src/App.tsx`
- `client/src/components/layout/Sidebar.tsx`

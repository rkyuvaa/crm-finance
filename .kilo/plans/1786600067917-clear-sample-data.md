# Clear All Sample Data from CRM-Finance

## Goal
Delete every row from all application tables (sample/seed data) and restore a single admin user so login still works. Changes must go to the `main` branch (user preference — not `master`).

## Current State
- `server/scripts/clear_data.py` has already been written (currently untracked in git).
- It deletes rows from all tables in foreign-key-safe order (`Activity, Delivery, Disbursement, Document, FinanceSubmission, Sanction, Verification, Notification, Application, FinanceCompany, VehicleModel, PipelineStage, User`) and then recreates `admin@kim.com` with `settings.seed_default_password` (default `Kim@2025`).

## Tasks

1. **Verify script** — confirm `server/scripts/clear_data.py` contents match the intended table order and restore-admin logic above.

2. **Commit and push to `main`**
   - Ensure on the `main` branch (`git checkout main`).
   - `git add server/scripts/clear_data.py`
   - `git commit -m "Add clear_data script to wipe all sample data"`
   - `git push origin main` (DO NOT push to `master`).

3. **Run on the server** — execute inside the API container so app deps (SQLAlchemy, Argon2) are available:
   ```bash
   docker exec -i <api-container> python -m scripts.clear_data
   ```
   (`<api-container>` is typically `crm-finance-api-1`; verify with `docker ps`.)

## Validation
- Database state: `applications`, `documents`, `verifications`, etc. all return 0 rows; `users` returns exactly 1 row.
  ```bash
  docker exec -i <db-container> psql -U kim -d crmfinance -c "SELECT (SELECT count(*) FROM applications) AS apps, (SELECT count(*) FROM users) AS users;"
  ```
  Expect `apps = 0`, `users = 1`.
- Login works: `POST /api/v1/auth/login` with `admin@kim.com` / `Kim@2025` returns 200 + tokens.

## Risks / Notes
- This permanently deletes all transactional data; idempotent-safe to rerun.
- The API container's `CMD` runs `python -m scripts.seed` on startup, which will REPOPULATE sample data. If a fresh container is ever started, the script must be run again afterward, or seeding must be made conditional (out of scope unless requested).
- Admin password overridable via `SEED_DEFAULT_PASSWORD` in `.env`; if custom, use that value instead of `Kim@2025`.
"""
Bulk Import Employees from Excel into CRMFinance KIM database.
"""
import argparse
import os
import sys
from datetime import datetime, timezone
import openpyxl
import argon2

# Adjust path to find server app if needed
SERVER_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

import sqlite3


DEPARTMENT_CONFIG = {
    "Management": {"code": "MANAGEMENT", "name": "Management", "parent_code": "COMPANY", "rbac_role": "admin", "user_role": "ADMIN"},
    "NPD": {"code": "NPD", "name": "New Product Development", "parent_code": "COMPANY", "rbac_role": "employee", "user_role": "SALES_EXECUTIVE"},
    "Service": {"code": "SERVICE", "name": "Service", "parent_code": "COMPANY", "rbac_role": "delivery_team", "user_role": "DELIVERY_TEAM"},
    "Stores": {"code": "STORES", "name": "Stores", "parent_code": "OPERATIONS", "rbac_role": "employee", "user_role": "SALES_EXECUTIVE"},
    "Accounts": {"code": "ACCOUNTS", "name": "Accounts & Finance", "parent_code": "FINANCE", "rbac_role": "finance_officer", "user_role": "FINANCE_OFFICER"},
    "Production": {"code": "PRODUCTION", "name": "Production", "parent_code": "OPERATIONS", "rbac_role": "employee", "user_role": "SALES_EXECUTIVE"},
    "Sales": {"code": "SALES", "name": "Sales", "parent_code": "COMPANY", "rbac_role": "sales_executive", "user_role": "SALES_EXECUTIVE"},
    "IT": {"code": "IT", "name": "IT & Systems", "parent_code": "COMPANY", "rbac_role": "admin", "user_role": "ADMIN"},
}


def parse_excel(file_path: str):
    wb = openpyxl.load_workbook(file_path, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    
    header = [str(c).strip().lower() if c else "" for c in rows[0]]
    # Find column indices
    name_idx = next((i for i, h in enumerate(header) if "name" in h), 0)
    email_idx = next((i for i, h in enumerate(header) if "email" in h), 1)
    dept_idx = next((i for i, h in enumerate(header) if "dept" in h or "department" in h), 2)
    pwd_idx = next((i for i, h in enumerate(header) if "password" in h), 3)

    records = []
    for r in rows[1:]:
        if not r or not any(r):
            continue
        full_name = str(r[name_idx]).strip() if r[name_idx] else ""
        email = str(r[email_idx]).strip().lower() if r[email_idx] else ""
        dept = str(r[dept_idx]).strip() if len(r) > dept_idx and r[dept_idx] else "Sales"
        custom_pwd = str(r[pwd_idx]).strip() if len(r) > pwd_idx and r[pwd_idx] else None
        if not email or not full_name:
            continue
        records.append({
            "full_name": full_name,
            "email": email,
            "department": dept,
            "custom_password": custom_pwd,
        })
    return records


def import_to_db(db_path: str, records: list, default_password: str = "Kim@2025", dry_run: bool = False):
    print(f"\nProcessing database: {db_path} (dry_run={dry_run})")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    ph = argon2.PasswordHasher()
    default_pwd_hash = ph.hash(default_password)

    # 1. Fetch existing departments
    cur.execute("SELECT id, code, name FROM departments")
    existing_depts = {row[1]: (row[0], row[2]) for row in cur.fetchall()}

    # Fetch root company dept if exists
    root_id = existing_depts.get("COMPANY", (None, None))[0]

    # 2. Ensure all needed departments exist
    for dept_key, cfg in DEPARTMENT_CONFIG.items():
        code = cfg["code"]
        if code not in existing_depts:
            name = cfg["name"]
            parent_code = cfg.get("parent_code")
            parent_id = existing_depts.get(parent_code, (root_id, None))[0]
            print(f"  + Creating missing department: {name} (code={code})")
            if not dry_run:
                cur.execute(
                    "INSERT INTO departments (name, code, description, parent_id, status) VALUES (?, ?, ?, ?, ?)",
                    (name, code, f"{name} Department", parent_id, "ACTIVE")
                )
                cur.execute("SELECT last_insert_rowid()")
                new_id = cur.fetchone()[0]
                existing_depts[code] = (new_id, name)
            else:
                existing_depts[code] = (999, name)

    # 3. Fetch existing roles
    cur.execute("SELECT id, code FROM roles")
    roles_map = {row[1]: row[0] for row in cur.fetchall()}

    # 4. Fetch existing users
    cur.execute("SELECT id, email, username FROM users")
    existing_users = {row[1].lower(): (row[0], row[2]) for row in cur.fetchall()}
    existing_usernames = {row[2].lower() for row in cur.fetchall() if row[2]}

    now_iso = datetime.now(timezone.utc).isoformat()

    created_count = 0
    skipped_count = 0

    for rec in records:
        email = rec["email"]
        full_name = rec["full_name"]
        dept_name = rec["department"]
        
        dept_cfg = DEPARTMENT_CONFIG.get(dept_name, DEPARTMENT_CONFIG["Sales"])
        dept_id = existing_depts.get(dept_cfg["code"], (None, None))[0]
        rbac_role_code = dept_cfg["rbac_role"]
        role_id = roles_map.get(rbac_role_code)
        user_role_enum = dept_cfg["user_role"]

        if email in existing_users:
            print(f"  [SKIP] User already exists: {email} ({full_name})")
            skipped_count += 1
            continue

        # Generate unique username from email
        uname_base = email.split("@")[0].lower()
        uname = uname_base
        counter = 1
        while uname in existing_usernames:
            uname = f"{uname_base}{counter}"
            counter += 1
        existing_usernames.add(uname)

        pwd_hash = ph.hash(rec["custom_password"]) if rec.get("custom_password") else default_pwd_hash

        print(f"  [CREATE] {full_name:<25} | Email: {email:<32} | Dept: {dept_cfg['code']:<10} | Role: {rbac_role_code}")

        if not dry_run:
            cur.execute("""
                INSERT INTO users (
                    email, username, password_hash, full_name, role, status,
                    force_password_change, failed_login_attempts, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                email, uname, pwd_hash, full_name, user_role_enum, "ACTIVE",
                1, 0, now_iso, now_iso
            ))
            cur.execute("SELECT last_insert_rowid()")
            user_id = cur.fetchone()[0]

            # Assign Department
            if dept_id:
                cur.execute("""
                    INSERT INTO department_users (user_id, department_id, is_primary, assigned_at)
                    VALUES (?, ?, ?, ?)
                """, (user_id, dept_id, 1, now_iso))

            # Assign RBAC Role
            if role_id:
                cur.execute("""
                    INSERT INTO user_roles (user_id, role_id, is_primary, assigned_at)
                    VALUES (?, ?, ?, ?)
                """, (user_id, role_id, 1, now_iso))

        created_count += 1

    if not dry_run:
        conn.commit()
        print(f"\n[DONE] Committed {created_count} users to {db_path} (skipped {skipped_count})")
    else:
        print(f"\n[DRY RUN] Would create {created_count} users in {db_path} (skipped {skipped_count})")
    conn.close()


def main():
    parser = argparse.ArgumentParser(description="Import users from Excel file")
    parser.add_argument("--file", default=r"C:\Users\Ramesh\Downloads\employees_export_2026-10-23.xlsx", help="Path to Excel file")
    parser.add_argument("--password", default="Kim@2025", help="Default password for new users")
    parser.add_argument("--dry-run", action="store_true", help="Preview without making changes")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"Error: File not found at {args.file}")
        sys.exit(1)

    records = parse_excel(args.file)
    print(f"Found {len(records)} employee records in {args.file}")

    # Check both dev.db locations if present
    db_paths = []
    for candidate in [
        os.path.join(SERVER_DIR, "dev.db"),
        os.path.join(SERVER_DIR, "..", "dev.db"),
    ]:
        cand_norm = os.path.abspath(candidate)
        if os.path.exists(cand_norm) and cand_norm not in db_paths:
            db_paths.append(cand_norm)

    for db_path in db_paths:
        import_to_db(db_path, records, default_password=args.password, dry_run=args.dry_run)


if __name__ == "__main__":
    main()

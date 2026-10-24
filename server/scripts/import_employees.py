"""
Bulk Import Employees into CRMFinance KIM database using SQLAlchemy.
Works seamlessly across SQLite (local) and PostgreSQL (Docker / production).

Usage:
  In Docker (production):
    docker compose exec api python -m scripts.import_employees --password "Kim@2026"

  Or from host / local:
    python server/scripts/import_employees.py --password "Kim@2026"
"""
import argparse
import os
import sys

# Setup Python paths so both 'python -m scripts.import_employees' (inside /app)
# and 'python server/scripts/import_employees.py' (from repo root) work
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
REPO_ROOT = os.path.abspath(os.path.join(SERVER_DIR, ".."))

for p in [SERVER_DIR, CURRENT_DIR, REPO_ROOT]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.db.session import SessionLocal
from app.models.user import User, UserStatus
from app.models.enums import UserRole
from app.models.rbac import (
    Department,
    DepartmentUser,
    Role,
    UserRole as RbacUserRole,
    PermissionStatus,
)
from app.core.security import hash_password


# Department mapping configuration
DEPARTMENT_CONFIG = {
    "Management": {
        "code": "MANAGEMENT",
        "name": "Management",
        "parent_code": "COMPANY",
        "rbac_role": "admin",
        "user_role": UserRole.ADMIN,
    },
    "NPD": {
        "code": "NPD",
        "name": "New Product Development",
        "parent_code": "COMPANY",
        "rbac_role": "employee",
        "user_role": UserRole.SALES_EXECUTIVE,
    },
    "Service": {
        "code": "SERVICE",
        "name": "Service",
        "parent_code": "COMPANY",
        "rbac_role": "delivery_team",
        "user_role": UserRole.DELIVERY_TEAM,
    },
    "Stores": {
        "code": "STORES",
        "name": "Stores",
        "parent_code": "OPERATIONS",
        "rbac_role": "employee",
        "user_role": UserRole.SALES_EXECUTIVE,
    },
    "Accounts": {
        "code": "ACCOUNTS",
        "name": "Accounts & Finance",
        "parent_code": "FINANCE",
        "rbac_role": "finance_officer",
        "user_role": UserRole.FINANCE_OFFICER,
    },
    "Production": {
        "code": "PRODUCTION",
        "name": "Production",
        "parent_code": "OPERATIONS",
        "rbac_role": "employee",
        "user_role": UserRole.SALES_EXECUTIVE,
    },
    "Sales": {
        "code": "SALES",
        "name": "Sales",
        "parent_code": "COMPANY",
        "rbac_role": "sales_executive",
        "user_role": UserRole.SALES_EXECUTIVE,
    },
    "IT": {
        "code": "IT",
        "name": "IT & Systems",
        "parent_code": "COMPANY",
        "rbac_role": "admin",
        "user_role": UserRole.ADMIN,
    },
}

# 28 Employees exported from Konwert India Motors master list
DEFAULT_EMPLOYEES = [
    {"full_name": "Nickendra M", "email": "nm@konwertindiamotors.com", "department": "Management"},
    {"full_name": "Akshay Jith P P", "email": "aj@konwertindiamotors.com", "department": "NPD"},
    {"full_name": "Three Vishnu", "email": "three.vishnu@konwertindiamotors.com", "department": "NPD"},
    {"full_name": "Edwin Ezhilarasu", "email": "ee@konwertindiamotors.com", "department": "Management"},
    {"full_name": "Yuvanesh Kumar", "email": "yuvanesh.k@konwertindiamotors.com", "department": "NPD"},
    {"full_name": "Satishkumar M", "email": "sathish.k@konwertindiamotors.com", "department": "NPD"},
    {"full_name": "Suthith RaviChandran", "email": "suthith.r@konwertindiamotors.com", "department": "Service"},
    {"full_name": "Vinoth S", "email": "vinoth.s@konwertindiamotors.com", "department": "Stores"},
    {"full_name": "Naveen Raman", "email": "naveen.r@konwertindiamotors.com", "department": "Accounts"},
    {"full_name": "Kanishk KS", "email": "kanishk.ks@konwertindiamotors.com", "department": "Production"},
    {"full_name": "Nahul Prasath S", "email": "nahul.p@konwertindiamotors.com", "department": "NPD"},
    {"full_name": "Harish A", "email": "harish.a@konwertindiamotors.com", "department": "Sales"},
    {"full_name": "Ramesh Kumar Y", "email": "rk@konwertindiamotors.com", "department": "IT"},
    {"full_name": "Sans Batsha", "email": "sansbatsha.s@konwertindiamotors.com", "department": "NPD"},
    {"full_name": "Viswanand", "email": "viswanad.m@konwertindiamotors.com", "department": "NPD"},
    {"full_name": "Vijay Naik", "email": "vn@konwertindiamotors.com", "department": "Sales"},
    {"full_name": "Charan K", "email": "charan.k@konwertindiamotors.com", "department": "Sales"},
    {"full_name": "Ramakrishnaa", "email": "rn2312001@gmail.com", "department": "Sales"},
    {"full_name": "Karthik Prabhulingam", "email": "karthick.p@konwertindiamotors.com", "department": "Service"},
    {"full_name": "Muthu N", "email": "mn@konwertindiamotors.com", "department": "Accounts"},
    {"full_name": "Supreetha Kumari", "email": "supreetha.s@konwertindiamotors.com", "department": "Sales"},
    {"full_name": "Medhun Krishna", "email": "medhun.k@konwertindiamotors.com", "department": "NPD"},
    {"full_name": "Phavithran Sundararajan", "email": "phavithran.s@konwertindiamotors.com", "department": "NPD"},
    {"full_name": "Sanjith D", "email": "sanjith.d@konwertindiamotors.com", "department": "NPD"},
    {"full_name": "Sri Prenesh V", "email": "prenesh.v@konwertindiamotors.com", "department": "NPD"},
    {"full_name": "Sanjiv Balasubramaniyan", "email": "sanjiv.b@konwertindiamotors.com", "department": "NPD"},
    {"full_name": "Thrisanth S", "email": "thrisanth.s@konwertindiamotors.com", "department": "Stores"},
    {"full_name": "Baskar B", "email": "baskar.b@konwertindiamotors.com", "department": "Accounts"},
]


def load_from_excel(file_path: str) -> list[dict]:
    try:
        import openpyxl
    except ImportError:
        print("[!] openpyxl is not installed. To parse Excel files, install openpyxl or rely on embedded records.")
        return []

    wb = openpyxl.load_workbook(file_path, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []

    header = [str(c).strip().lower() if c else "" for c in rows[0]]
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


def run_import(records: list[dict], default_password: str = "Kim@2026", dry_run: bool = False):
    db = SessionLocal()
    try:
        print(f"\nConnected to database via SQLAlchemy. dry_run={dry_run}")
        default_pwd_hash = hash_password(default_password)

        # 1. Ensure all departments exist
        existing_depts = {d.code: d for d in db.query(Department).all()}
        root_company = existing_depts.get("COMPANY")
        root_id = root_company.id if root_company else None

        for dept_name, cfg in DEPARTMENT_CONFIG.items():
            code = cfg["code"]
            if code not in existing_depts:
                parent_code = cfg.get("parent_code")
                parent = existing_depts.get(parent_code)
                parent_id = parent.id if parent else root_id
                print(f"  + Creating department: {cfg['name']} ({code})")
                new_dept = Department(
                    name=cfg["name"],
                    code=code,
                    description=f"{cfg['name']} Department",
                    parent_id=parent_id,
                    status=PermissionStatus.ACTIVE,
                )
                db.add(new_dept)
                db.flush()
                existing_depts[code] = new_dept

        # 2. Existing roles
        roles_map = {r.code: r for r in db.query(Role).all()}

        # 3. Existing users
        existing_users = {u.email.lower(): u for u in db.query(User).all()}
        existing_unames = {u.username.lower() for u in db.query(User).all() if u.username}

        created = 0
        skipped = 0

        for rec in records:
            email = rec["email"].strip().lower()
            full_name = rec["full_name"].strip()
            dept_key = rec["department"]

            if email in existing_users:
                print(f"  [SKIP] User already exists: {email} ({full_name})")
                skipped += 1
                continue

            dept_cfg = DEPARTMENT_CONFIG.get(dept_key, DEPARTMENT_CONFIG["Sales"])
            dept_obj = existing_depts.get(dept_cfg["code"])
            role_obj = roles_map.get(dept_cfg["rbac_role"])
            user_role_enum = dept_cfg["user_role"]

            # Unique username
            uname_base = email.split("@")[0].lower()
            uname = uname_base
            counter = 1
            while uname in existing_unames:
                uname = f"{uname_base}{counter}"
                counter += 1
            existing_unames.add(uname)

            pwd_hash = hash_password(rec["custom_password"]) if rec.get("custom_password") else default_pwd_hash

            print(f"  [CREATE] {full_name:<25} | Email: {email:<32} | Dept: {dept_cfg['code']:<10} | Role: {dept_cfg['rbac_role']}")

            if not dry_run:
                new_user = User(
                    email=email,
                    username=uname,
                    password_hash=pwd_hash,
                    full_name=full_name,
                    role=user_role_enum,
                    status=UserStatus.ACTIVE,
                    force_password_change=True,
                    failed_login_attempts=0,
                )
                db.add(new_user)
                db.flush()

                # Assign Department
                if dept_obj:
                    db.add(DepartmentUser(
                        user_id=new_user.id,
                        department_id=dept_obj.id,
                        is_primary=True,
                    ))

                # Assign RBAC Role
                if role_obj:
                    db.add(RbacUserRole(
                        user_id=new_user.id,
                        role_id=role_obj.id,
                        is_primary=True,
                    ))

            created += 1

        if not dry_run:
            db.commit()
            print(f"\n[DONE] Successfully committed {created} users (skipped {skipped} existing).")
        else:
            db.rollback()
            print(f"\n[DRY RUN] Would create {created} users (skipped {skipped} existing).")

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Bulk Import Employees into CRMFinance KIM database")
    parser.add_argument("--file", default=None, help="Optional path to Excel file (.xlsx)")
    parser.add_argument("--password", default="Kim@2026", help="Default initial password (default: Kim@2026)")
    parser.add_argument("--dry-run", action="store_true", help="Simulate import without committing changes")
    args = parser.parse_args()

    records = []
    if args.file and os.path.exists(args.file):
        print(f"Loading employees from file: {args.file}")
        records = load_from_excel(args.file)
    else:
        if args.file:
            print(f"Note: Specified file '{args.file}' not found. Falling back to embedded list of 28 employees.")
        else:
            print("Using embedded list of 28 Konwert India Motors employees.")
        records = DEFAULT_EMPLOYEES

    print(f"Prepared {len(records)} employee records.")
    run_import(records, default_password=args.password, dry_run=args.dry_run)


if __name__ == "__main__":
    main()

"""CLI script to export a full system data backup (Database SQL + Uploaded images/files) to a ZIP package.

Usage:
    python -m scripts.backup --output /path/to/backup.zip [--format zip|sql|json]
"""
import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

from app.db.session import SessionLocal
from app.services.backup_service import create_system_backup, create_system_zip_backup, generate_sql_dump


def main():
    parser = argparse.ArgumentParser(description="Export CRMFinance system database backup & uploaded files.")
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help="Target output path for the backup file. Default: crm_finance_full_backup_<timestamp>.zip",
    )
    parser.add_argument(
        "--format", "-f",
        choices=["zip", "sql", "json"],
        default="zip",
        help="Backup package format: 'zip' (Full DB SQL + Uploaded images), 'sql' (SQL script), 'json'. Default: zip",
    )
    args = parser.parse_args()

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    output_path = args.output
    if not output_path:
        ext = args.format
        output_path = f"crm_finance_full_backup_{timestamp}.{ext}"

    print(f"Creating system backup package (format={args.format})...")
    db = SessionLocal()
    try:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        if args.format == "zip":
            zip_bytes = create_system_zip_backup(db)
            path.write_bytes(zip_bytes)
            print(f"Full System ZIP Backup (DB SQL + Uploaded images) successfully saved to: {path.resolve()}")
        elif args.format == "sql":
            sql_str = generate_sql_dump(db, include_audit_logs=True)
            path.write_text(sql_str, encoding="utf-8")
            print(f"Database SQL Dump successfully saved to: {path.resolve()}")
        else:
            payload = create_system_backup(db, include_audit_logs=True)
            path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"Database JSON Backup successfully saved to: {path.resolve()}")
    except Exception as e:
        print(f"Backup failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

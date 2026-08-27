"""CLI script to export a full system data backup to a JSON file.

Usage:
    python -m scripts.backup --output /path/to/backup.json
"""
import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

from app.db.session import SessionLocal
from app.services.backup_service import create_system_backup


def main():
    parser = argparse.ArgumentParser(description="Export CRMFinance system database backup.")
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help="Target output path for the backup JSON file. Default: crm_finance_backup_<timestamp>.json",
    )
    parser.add_argument(
        "--include-audit-logs",
        action="store_true",
        help="Include system audit logs in the backup payload.",
    )
    args = parser.parse_args()

    output_path = args.output
    if not output_path:
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        output_path = f"crm_finance_backup_{timestamp}.json"

    print(f"Creating system data backup...")
    db = SessionLocal()
    try:
        backup_payload = create_system_backup(db, include_audit_logs=args.include_audit_logs)
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(path, "w", encoding="utf-8") as f:
            json.dump(backup_payload, f, indent=2, ensure_ascii=False)
            
        print(f"Backup successfully saved to: {path.resolve()}")
        print(f"Total tables exported: {backup_payload['metadata']['total_tables']}")
        for tbl, count in backup_payload['metadata']['record_counts'].items():
            if count > 0:
                print(f"  - {tbl}: {count} records")
    except Exception as e:
        print(f"Backup failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

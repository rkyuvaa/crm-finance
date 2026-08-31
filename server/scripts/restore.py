"""CLI script to restore system database and uploaded images/files from a ZIP, SQL, or JSON backup file.

Usage:
    python -m scripts.restore --input /path/to/backup.zip [--mode overwrite|merge]
"""
import argparse
import json
import sys
from pathlib import Path

from app.db.session import SessionLocal
from app.services.backup_service import restore_system_backup, restore_system_zip_backup


def main():
    parser = argparse.ArgumentParser(description="Restore CRMFinance database and uploaded files from backup archive.")
    parser.add_argument(
        "--input", "-i",
        type=str,
        required=True,
        help="Path to the ZIP, SQL, or JSON backup file.",
    )
    parser.add_argument(
        "--mode", "-m",
        choices=["overwrite", "merge"],
        default="overwrite",
        help="Restore mode: 'overwrite' (clears existing data first) or 'merge'. Default: overwrite",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Backup file not found at {input_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Reading backup payload from {input_path}...")
    db = SessionLocal()
    try:
        if input_path.suffix.lower() == ".zip":
            zip_bytes = input_path.read_bytes()
            result = restore_system_zip_backup(db, zip_bytes, mode=args.mode)
            print(f"Restoration completed successfully!")
            print(f"  - Database tables restored: {len(result.get('restored_tables', {}))}")
            print(f"  - Uploaded files & images restored: {result.get('restored_files_count', 0)}")
        else:
            with open(input_path, "r", encoding="utf-8") as f:
                backup_payload = json.load(f)
            result = restore_system_backup(db, backup_payload, mode=args.mode)
            print(f"Restoration completed successfully!")
            for tbl, count in result.get("restored_tables", {}).items():
                print(f"  - {tbl}: {count} records")
    except Exception as e:
        print(f"Restoration failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

"""CLI script to restore system database from a JSON backup file.

Usage:
    python -m scripts.restore --input /path/to/backup.json [--mode overwrite|merge]
"""
import argparse
import json
import sys
from pathlib import Path

from app.db.session import SessionLocal
from app.services.backup_service import restore_system_backup


def main():
    parser = argparse.ArgumentParser(description="Restore CRMFinance system database from backup JSON.")
    parser.add_argument(
        "--input", "-i",
        type=str,
        required=True,
        help="Path to the JSON backup file.",
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
    try:
        with open(input_path, "r", encoding="utf-8") as f:
            backup_payload = json.load(f)
    except Exception as e:
        print(f"Error loading backup JSON: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Restoring database (mode={args.mode})...")
    db = SessionLocal()
    try:
        result = restore_system_backup(db, backup_payload, mode=args.mode)
        print(f"Restoration completed successfully!")
        print("Restored table record counts:")
        for tbl, count in result.get("restored_tables", {}).items():
            print(f"  - {tbl}: {count} records")
    except Exception as e:
        print(f"Restoration failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

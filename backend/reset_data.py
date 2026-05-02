"""
reset_data.py
Clears ALL employees, attendance logs, and registered face photos.
Admin user is preserved.
Run from: s:\Antigravity Files\CCtv\backend
"""
import os
import shutil
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "sql_app.db")
FACES_DB_PATH = os.path.join(os.path.dirname(__file__), "faces_db")

print("=" * 50)
print("  CCTV Attendance System — Data Reset Tool")
print("=" * 50)

confirm = input("\nThis will DELETE all employees, attendance logs, and face photos.\nType YES to confirm: ").strip()
if confirm != "YES":
    print("Aborted. Nothing was changed.")
    exit(0)

# ── 1. Clear database tables ──────────────────────────
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("DELETE FROM attendance_logs")
logs_deleted = cursor.rowcount
print(f"\n✓ Deleted {logs_deleted} attendance log(s)")

cursor.execute("DELETE FROM employees")
emp_deleted = cursor.rowcount
print(f"✓ Deleted {emp_deleted} employee(s)")

conn.commit()
conn.close()
print("✓ Database cleaned")

# ── 2. Delete face photo folders ─────────────────────
if os.path.exists(FACES_DB_PATH):
    deleted_dirs = 0
    for item in os.listdir(FACES_DB_PATH):
        item_path = os.path.join(FACES_DB_PATH, item)
        if os.path.isdir(item_path):
            shutil.rmtree(item_path)
            deleted_dirs += 1
            print(f"  ✓ Removed face folder: {item}")
        elif item.endswith(".pkl"):
            os.remove(item_path)
            print(f"  ✓ Removed cache file: {item}")
    print(f"✓ Removed {deleted_dirs} face photo folder(s)")
else:
    print("✓ No face photos directory found (skipping)")

print("\n✅ Reset complete! All employee data and attendance logs have been cleared.")
print("   Admin login credentials are unchanged.")
print("=" * 50)

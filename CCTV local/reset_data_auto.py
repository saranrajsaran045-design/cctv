"""
reset_data_auto.py — Non-interactive data wipe. Deletes all employees, attendance logs, face photos.
"""
import os, shutil, sqlite3

DB_PATH    = r"s:\Antigravity Files\CCtv\backend\sql_app.db"
FACES_PATH = r"s:\Antigravity Files\CCtv\backend\faces_db"

conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()
cur.execute("DELETE FROM attendance_logs")
print(f"Deleted {cur.rowcount} attendance log(s)")
cur.execute("DELETE FROM employees")
print(f"Deleted {cur.rowcount} employee(s)")
conn.commit()
conn.close()

if os.path.exists(FACES_PATH):
    for item in os.listdir(FACES_PATH):
        p = os.path.join(FACES_PATH, item)
        if os.path.isdir(p):
            shutil.rmtree(p)
            print(f"Removed face dir: {item}")
        elif item.endswith(".pkl"):
            os.remove(p)
            print(f"Removed cache: {item}")

print("DONE — database and face photos cleared.")

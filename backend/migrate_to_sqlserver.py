"""
Migrate all data from the old SQLite database to SQL Server.
Run once: python migrate_to_sqlserver.py
"""
import sqlite3, pyodbc, os

if not os.path.exists('sql_app.db'):
    print('No SQLite DB found - nothing to migrate.')
    exit()

sqlite_conn = sqlite3.connect('sql_app.db')
sqlite_conn.row_factory = sqlite3.Row
sc = sqlite_conn.cursor()

sql_conn = pyodbc.connect(
    'DRIVER={ODBC Driver 17 for SQL Server};'
    r'SERVER=(LocalDB)\MSSQLLocalDB;'
    'DATABASE=CCTV_Attendance;Trusted_Connection=yes;',
    autocommit=True
)
mc = sql_conn.cursor()

print("=== Migrating Users ===")
try:
    rows = sc.execute('SELECT username, hashed_password FROM users').fetchall()
    for r in rows:
        uname = r['username']
        try:
            mc.execute('INSERT INTO users (username, hashed_password) VALUES (?, ?)',
                       uname, r['hashed_password'])
            print(f'  Migrated user: {uname}')
        except Exception as e:
            print(f'  Skipped user {uname}: already exists')
except Exception as e:
    print(f'  No users table in SQLite: {e}')

print("\n=== Migrating Employees ===")
try:
    rows = sc.execute('SELECT emp_id, name, department, hashed_password FROM employees').fetchall()
    for r in rows:
        eid = r['emp_id']
        try:
            mc.execute(
                'INSERT INTO employees (emp_id, name, department, hashed_password) VALUES (?, ?, ?, ?)',
                eid, r['name'], r['department'], r['hashed_password']
            )
            print(f'  Migrated: {r["name"]} ({eid})')
        except Exception as e:
            print(f'  Skipped {eid}: already exists')
except Exception as e:
    print(f'  No employees table in SQLite: {e}')

print("\n=== Migrating Attendance Logs ===")
try:
    rows = sc.execute('''
        SELECT al.timestamp, al.camera_id, e.emp_id
        FROM attendance_logs al
        LEFT JOIN employees e ON e.id = al.employee_id
    ''').fetchall()
    migrated = 0
    for r in rows:
        try:
            mc.execute('''
                INSERT INTO attendance_logs (employee_id, timestamp, camera_id)
                SELECT id, ?, ? FROM employees WHERE emp_id = ?
            ''', r['timestamp'], r['camera_id'], r['emp_id'])
            migrated += 1
        except Exception:
            pass
    print(f'  Migrated {migrated} attendance logs')
except Exception as e:
    print(f'  No attendance_logs in SQLite: {e}')

sqlite_conn.close()
sql_conn.close()
print("\nMigration complete! SQL Server now has all your data.")

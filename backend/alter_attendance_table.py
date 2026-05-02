"""
Alter the attendance_logs table in SQL Server to add:
- in_time, out_time, total_hours, status (P/A/L), employee_name, leave_type
- daily_summary VIEW for present/missed days per employee

Run once: python alter_attendance_table.py
"""
import pyodbc

conn = pyodbc.connect(
    'DRIVER={ODBC Driver 17 for SQL Server};'
    r'SERVER=(LocalDB)\MSSQLLocalDB;'
    'DATABASE=CCTV_Attendance;Trusted_Connection=yes;',
    autocommit=True
)
cursor = conn.cursor()

print("=== Altering attendance_logs table ===")

alter_statements = [
    # Denormalized employee name for fast reporting
    "IF COL_LENGTH('attendance_logs','employee_name') IS NULL "
    "ALTER TABLE attendance_logs ADD employee_name NVARCHAR(100) NULL",

    # Explicit in-time and out-time columns
    "IF COL_LENGTH('attendance_logs','in_time') IS NULL "
    "ALTER TABLE attendance_logs ADD in_time DATETIME2 NULL",

    "IF COL_LENGTH('attendance_logs','out_time') IS NULL "
    "ALTER TABLE attendance_logs ADD out_time DATETIME2 NULL",

    # Calculated working hours (stored, updated when out_time is set)
    "IF COL_LENGTH('attendance_logs','total_hours') IS NULL "
    "ALTER TABLE attendance_logs ADD total_hours DECIMAL(5,2) NULL",

    # Attendance status: P=Present, A=Absent, L=Leave
    "IF COL_LENGTH('attendance_logs','status') IS NULL "
    "ALTER TABLE attendance_logs ADD status NVARCHAR(10) DEFAULT 'P'",

    # Leave type: NULL, Sick, Annual, Emergency, etc.
    "IF COL_LENGTH('attendance_logs','leave_type') IS NULL "
    "ALTER TABLE attendance_logs ADD leave_type NVARCHAR(50) NULL",

    # Working date (date part only, for grouping)
    "IF COL_LENGTH('attendance_logs','work_date') IS NULL "
    "ALTER TABLE attendance_logs ADD work_date DATE NULL",
]

for stmt in alter_statements:
    try:
        cursor.execute(stmt)
        col = stmt.split('ADD ')[1].split(' ')[0] if 'ADD ' in stmt else stmt[:50]
        print(f"  OK: Added/verified column [{col}]")
    except Exception as e:
        print(f"  ERR: {e}")


print("\n=== Backfilling existing rows ===")
try:
    cursor.execute("""
        UPDATE al
        SET
            al.employee_name = e.name,
            al.in_time       = al.timestamp,
            al.work_date     = CAST(al.timestamp AS DATE),
            al.status        = 'P'
        FROM attendance_logs al
        LEFT JOIN employees e ON e.id = al.employee_id
        WHERE al.employee_name IS NULL
    """)
    print(f"  Backfilled {cursor.rowcount} existing rows.")
except Exception as e:
    print(f"  Backfill ERR: {e}")


print("\n=== Creating daily_attendance VIEW ===")
try:
    cursor.execute("IF OBJECT_ID('daily_attendance', 'V') IS NOT NULL DROP VIEW daily_attendance")
    cursor.execute("""
        CREATE VIEW daily_attendance AS
        SELECT
            al.id,
            al.employee_id,
            e.emp_id,
            ISNULL(al.employee_name, e.name)  AS employee_name,
            e.department,
            ISNULL(al.work_date, CAST(al.timestamp AS DATE)) AS work_date,
            al.in_time,
            al.out_time,
            al.total_hours,
            ISNULL(al.status, 'P')            AS status,
            al.leave_type,
            al.camera_id,
            al.timestamp
        FROM attendance_logs al
        LEFT JOIN employees e ON e.id = al.employee_id
    """)
    print("  daily_attendance view created.")
except Exception as e:
    print(f"  View ERR: {e}")


print("\n=== Creating employee_summary VIEW ===")
try:
    cursor.execute("IF OBJECT_ID('employee_summary', 'V') IS NOT NULL DROP VIEW employee_summary")
    cursor.execute("""
        CREATE VIEW employee_summary AS
        SELECT
            e.emp_id,
            e.name,
            e.department,
            COUNT(CASE WHEN ISNULL(al.status,'P') = 'P' THEN 1 END) AS present_days,
            COUNT(CASE WHEN al.status = 'A'                THEN 1 END) AS absent_days,
            COUNT(CASE WHEN al.status = 'L'                THEN 1 END) AS leave_days,
            ROUND(SUM(ISNULL(al.total_hours, 0)), 2)                   AS total_hours_worked
        FROM employees e
        LEFT JOIN attendance_logs al ON al.employee_id = e.id
        GROUP BY e.emp_id, e.name, e.department
    """)
    print("  employee_summary view created.")
except Exception as e:
    print(f"  View ERR: {e}")


conn.close()
print("\nAll done! Run `python migrate_to_sqlserver.py` is NOT needed again.")
print("Restart FastAPI backend to pick up new columns.")

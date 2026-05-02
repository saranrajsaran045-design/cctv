"""
Run this once to create all CCTV_Attendance tables on SQL Server.
Usage: python setup_sqlserver.py
"""
import pyodbc

SERVER = r'(LocalDB)\MSSQLLocalDB'

# Step 1: Create the database
conn = pyodbc.connect(
    f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER};Trusted_Connection=yes;',
    autocommit=True
)
cursor = conn.cursor()

cursor.execute("""
IF DB_ID('CCTV_Attendance') IS NULL
    CREATE DATABASE CCTV_Attendance;
""")
print("[1/2] Database CCTV_Attendance ready.")
conn.close()

# Step 2: Connect to the database and create tables
conn = pyodbc.connect(
    f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER};DATABASE=CCTV_Attendance;Trusted_Connection=yes;',
    autocommit=True
)
cursor = conn.cursor()

statements = [
    # Drop in reverse order (child first)
    "IF OBJECT_ID('attendance_logs', 'U') IS NOT NULL DROP TABLE attendance_logs",
    "IF OBJECT_ID('employees', 'U') IS NOT NULL DROP TABLE employees",
    "IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users",

    # Create users table
    """
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(100) NOT NULL,
        hashed_password NVARCHAR(255) NOT NULL,
        CONSTRAINT UQ_username UNIQUE (username)
    )
    """,

    # Create employees table
    """
    CREATE TABLE employees (
        id INT IDENTITY(1,1) PRIMARY KEY,
        emp_id NVARCHAR(50) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        department NVARCHAR(50),
        hashed_password NVARCHAR(255),
        created_at DATETIME2 DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_emp_id UNIQUE (emp_id)
    )
    """,

    # Create attendance_logs table
    """
    CREATE TABLE attendance_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        employee_id INT,
        timestamp DATETIME2 DEFAULT SYSDATETIME(),
        camera_id NVARCHAR(50),
        CONSTRAINT FK_att_emp FOREIGN KEY (employee_id)
            REFERENCES employees(id) ON DELETE CASCADE
    )
    """,

    # Indexes
    "CREATE INDEX IDX_emp_id ON employees(emp_id)",
    "CREATE INDEX IDX_att_time ON attendance_logs(timestamp)",
    "CREATE INDEX IDX_att_emp ON attendance_logs(employee_id)",
]

for stmt in statements:
    try:
        cursor.execute(stmt)
        short = stmt.strip()[:70].replace('\n', ' ')
        print(f"  OK: {short}")
    except Exception as e:
        print(f"  ERR: {e}")

conn.close()
print("[2/2] All tables created successfully!")
print("\nSQL Server is ready. Restart the FastAPI backend now.")

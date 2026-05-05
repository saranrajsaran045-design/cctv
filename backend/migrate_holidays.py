"""
Migration script to add the holidays table without dropping existing data.
Usage: python migrate_holidays.py
"""
import pyodbc

SERVER = r'(LocalDB)\MSSQLLocalDB'
DATABASE = 'CCTV_Attendance'

conn = pyodbc.connect(
    f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER};DATABASE={DATABASE};Trusted_Connection=yes;',
    autocommit=True
)
cursor = conn.cursor()

print(f"Connecting to {DATABASE} on {SERVER}...")

try:
    # Check if table exists
    cursor.execute("IF OBJECT_ID('holidays', 'U') IS NULL BEGIN PRINT 'Creating table'; END")
    
    cursor.execute("""
    IF OBJECT_ID('holidays', 'U') IS NULL
    BEGIN
        CREATE TABLE holidays (
            id INT IDENTITY(1,1) PRIMARY KEY,
            holiday_name NVARCHAR(100) NOT NULL,
            start_date DATETIME2 NOT NULL,
            end_date DATETIME2 NOT NULL,
            type NVARCHAR(50) NOT NULL,
            description NVARCHAR(255),
            created_at DATETIME2 DEFAULT SYSDATETIME()
        );
        CREATE INDEX IDX_hol_start ON holidays(start_date);
        PRINT 'Holidays table created successfully.';
    END
    ELSE
    BEGIN
        PRINT 'Holidays table already exists.';
    END
    """)
except Exception as e:
    print(f"Error: {e}")

conn.close()
print("Migration complete.")

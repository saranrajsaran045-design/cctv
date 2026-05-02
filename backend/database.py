import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# ─────────────────────────────────────────────
# SQL SERVER (LocalDB) CONNECTION
# ─────────────────────────────────────────────
SQL_SERVER   = os.getenv("SQL_SERVER",   r"(LocalDB)\MSSQLLocalDB")
SQL_DATABASE = os.getenv("SQL_DATABASE", "CCTV_Attendance")
SQL_DRIVER   = os.getenv("SQL_DRIVER",   "ODBC+Driver+17+for+SQL+Server")

# Build the mssql+pyodbc connection URL
SQLALCHEMY_DATABASE_URL = (
    f"mssql+pyodbc://{SQL_SERVER}/{SQL_DATABASE}"
    f"?driver={SQL_DRIVER}&Trusted_Connection=yes&TrustServerCertificate=yes"
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    # Suppress LocalDB version warning and fix parameter binding
    use_setinputsizes=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

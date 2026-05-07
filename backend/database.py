import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# ─────────────────────────────────────────────
# DATABASE CONFIGURATION
# ─────────────────────────────────────────────

# Priority 1: DATABASE_URL (Production - PostgreSQL/Neon)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if SQLALCHEMY_DATABASE_URL:
    # Fix for SQLAlchemy 1.4+ which requires 'postgresql://' instead of 'postgres://'
    if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=1800,
    )
else:
    # Priority 2: SQL SERVER (Local Development)
    SQL_SERVER   = os.getenv("SQL_SERVER",   r"(LocalDB)\MSSQLLocalDB")
    SQL_DATABASE = os.getenv("SQL_DATABASE", "CCTV_Attendance")
    SQL_DRIVER   = os.getenv("SQL_DRIVER",   "ODBC+Driver+17+for+SQL+Server")

    SQLALCHEMY_DATABASE_URL = (
        f"mssql+pyodbc://{SQL_SERVER}/{SQL_DATABASE}"
        f"?driver={SQL_DRIVER}&Trusted_Connection=yes&TrustServerCertificate=yes"
    )
    
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=1800,
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

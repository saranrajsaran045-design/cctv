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
        pool_recycle=300, # More aggressive recycle for Neon free tier
        pool_size=10,
        max_overflow=20
    )
else:
    # Priority 2: SQLite (Local Development fallback — no extra drivers needed)
    import warnings
    warnings.warn(
        "DATABASE_URL not set — using local SQLite database (cctv_local.db). "
        "Set DATABASE_URL to a PostgreSQL URL for production.",
        stacklevel=2,
    )
    SQLALCHEMY_DATABASE_URL = "sqlite:///./cctv_local.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

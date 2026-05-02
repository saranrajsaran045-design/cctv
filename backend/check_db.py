from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models

SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

db = SessionLocal()
employees = db.query(models.Employee).all()

print("DATABASE EMPLOYEES:")
for emp in employees:
    print(f"ID: {emp.id}, EmpID: {emp.emp_id}, Name: {emp.name}")

db.close()

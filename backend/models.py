from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, LargeBinary
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """Admin User for Dashboard Access"""
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)


class Employee(Base):
    """Registered Employees for Face Recognition"""
    __tablename__ = "employees"
    id              = Column(Integer, primary_key=True, index=True)
    emp_id          = Column(String(50),  unique=True, index=True, nullable=False)
    name            = Column(String(100), index=True,  nullable=False)
    department      = Column(String(50))
    hashed_password = Column(String(255), nullable=True)
    created_at      = Column(DateTime, server_default=func.now())

    attendances = relationship(
        "AttendanceLog",
        back_populates="employee",
        cascade="all, delete-orphan"
    )
    
    faces = relationship(
        "EmployeeFace",
        back_populates="employee",
        cascade="all, delete-orphan"
    )


class EmployeeFace(Base):
    """Stored Face Images for Persistence"""
    __tablename__ = "employee_faces"
    id          = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"))
    image_data  = Column(LargeBinary, nullable=False)
    created_at  = Column(DateTime, server_default=func.now())

    employee = relationship("Employee", back_populates="faces")


class AttendanceLog(Base):
    """Attendance Records"""
    __tablename__ = "attendance_logs"
    id          = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"))
    timestamp   = Column(DateTime, server_default=func.now())
    camera_id   = Column(String(50))

    employee = relationship("Employee", back_populates="attendances")


class Holiday(Base):
    """Holiday Records"""
    __tablename__ = "holidays"
    id          = Column(Integer, primary_key=True, index=True)
    holiday_name = Column(String(100), nullable=False)
    start_date  = Column(DateTime, nullable=False)
    end_date    = Column(DateTime, nullable=False)
    type        = Column(String(50), nullable=False) # public, company, optional
    description = Column(String(255))
    created_at  = Column(DateTime, server_default=func.now())

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class EmployeeBase(BaseModel):
    emp_id: str
    name: str
    department: str

class EmployeeCreate(EmployeeBase):
    password: str

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None

class EmployeeResponse(EmployeeBase):
    id: int
    created_at: datetime
    has_face: bool = False
    class Config:
        from_attributes = True

class AttendanceLogBase(BaseModel):
    camera_id: str

class AttendanceLogCreate(AttendanceLogBase):
    employee_id: int

class AttendanceLogResponse(AttendanceLogBase):
    id: int
    employee_id: Optional[int]
    timestamp: datetime
    employee: Optional[EmployeeResponse] = None
    class Config:
        from_attributes = True

class EmployeeLogin(BaseModel):
    emp_id: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str # 'admin' or 'employee'

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str

class UserInDB(User):
    hashed_password: str

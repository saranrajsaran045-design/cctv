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
    emp_id: Optional[str] = None
    name: Optional[str] = None
    department: Optional[str] = None
    created_at: Optional[datetime] = None

class EmployeePasswordChange(BaseModel):
    new_password: str

class EmployeePasswordReset(BaseModel):
    # Optional if we want to force a specific one, but usually admin just sets a new one
    new_password: Optional[str] = None

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

class HolidayBase(BaseModel):
    holiday_name: str
    start_date: datetime
    end_date: datetime
    type: str
    description: Optional[str] = None

class HolidayCreate(HolidayBase):
    pass

class HolidayUpdate(BaseModel):
    holiday_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    type: Optional[str] = None
    description: Optional[str] = None

class HolidayResponse(HolidayBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

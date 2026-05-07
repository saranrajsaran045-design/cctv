from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from datetime import timedelta, datetime, date
from typing import List, Optional
import time
import io
import csv
import cv2
import os
import numpy as np
from fastapi.staticfiles import StaticFiles

import models
import schemas
import auth
import cctv_manager
import face_engine
from database import engine, get_db

def is_holiday(db: Session, date_obj: date):
    # Check if any holiday range covers this date
    # Convert date to datetime for comparison
    dt_start = datetime.combine(date_obj, datetime.min.time())
    dt_end = datetime.combine(date_obj, datetime.max.time())
    return db.query(models.Holiday).filter(
        models.Holiday.start_date <= dt_end,
        models.Holiday.end_date >= dt_start
    ).first()

# Create DB Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CCTV Attendance System")

@app.on_event("startup")
def startup_populate_db():
    db = next(get_db())
    # Create admin user if it doesn't exist
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        print("SEEDING: Creating default admin user...")
        admin_user = models.User(
            username="admin",
            hashed_password=auth.get_password_hash("admin123")
        )
        db.add(admin_user)
        db.commit()
    db.close()

# Fix CORS: allow_origins=["*"] and allow_credentials=True is invalid.
# We must specify the origins if we want to allow credentials (which axios might use).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for local Wi-Fi access
    allow_credentials=False, # Must be False if origins is ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount faces_db to serve images
if not os.path.exists("faces_db"):
    os.makedirs("faces_db")
app.mount("/faces", StaticFiles(directory="faces_db"), name="faces")

# Global 404 handler to debug routing
@app.exception_handler(404)
async def custom_404_handler(request: Request, exc: HTTPException):
    print(f"ROUTING ERROR: 404 Not Found for {request.method} {request.url.path}")
    return JSONResponse(
        status_code=404,
        content={
            "detail": f"Route {request.method} {request.url.path} not found on this server.",
            "available_routes": ["/token", "/employee/login", "/employee/me", "/employee/my-attendance", "/attendance/webcam"]
        }
    )

# Debug middleware
@app.middleware("http")
async def debug_middleware(request: Request, call_next):
    print(f"DEBUG: {request.method} {request.url.path}")
    return await call_next(request)

# --- ROUTES ---

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.1", "routes": ["/token", "/employee/login", "/employee/me", "/employee/my-attendance"]}

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    print(f"LOGIN ATTEMPT: {form_data.username}")
    user = auth.get_user(db, username=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid login")
    return {"access_token": auth.create_access_token(data={"sub": user.username, "role": "admin"}), "token_type": "bearer", "role": "admin"}

@app.post("/employee/login")
def emp_login(login_data: schemas.EmployeeLogin, db: Session = Depends(get_db)):
    emp = auth.get_employee_by_id(db, emp_id=login_data.emp_id)
    if not emp or not auth.verify_password(login_data.password, emp.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid login")
    return {"access_token": auth.create_access_token(data={"sub": emp.emp_id, "role": "employee"}), "token_type": "bearer", "role": "employee"}

@app.get("/employee/me", response_model=schemas.EmployeeResponse)
def get_me(current_user=Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "employee":
        raise HTTPException(status_code=403, detail="Not an employee")
    
    emp_dir = os.path.join(face_engine.FACES_DB_PATH, current_user.emp_id)
    current_user.has_face = os.path.exists(emp_dir) and len([f for f in os.listdir(emp_dir) if f.endswith(".jpg")]) > 0
    return current_user

@app.get("/employee/my-attendance", response_model=List[schemas.AttendanceLogResponse])
def get_my_att(current_user=Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # The current_user can be either an Admin (models.User) or an Employee (models.Employee)
    # We check the role injected by auth.get_current_user
    if current_user.role != "employee":
        raise HTTPException(status_code=403, detail="Not an employee")
    return db.query(models.AttendanceLog).filter(models.AttendanceLog.employee_id == current_user.id).order_by(models.AttendanceLog.timestamp.desc()).all()

@app.put("/employee/change-password")
def employee_change_password(data: schemas.EmployeePasswordChange, current_user=Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "employee":
        raise HTTPException(status_code=403, detail="Not an employee")
    
    # current_user is the employee object
    current_user.hashed_password = auth.get_password_hash(data.new_password)
    db.commit()
    return {"status": "ok", "message": "Password updated successfully"}

# CRITICAL: Attendance Management
@app.get("/attendance", response_model=List[schemas.AttendanceLogResponse])
def get_att(period: Optional[str] = "all", db: Session = Depends(get_db)):
    query = db.query(models.AttendanceLog).options(joinedload(models.AttendanceLog.employee))
    
    now = datetime.now()
    if period == "daily":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(models.AttendanceLog.timestamp >= start_date)
    elif period == "weekly":
        start_date = now - timedelta(days=7)
        query = query.filter(models.AttendanceLog.timestamp >= start_date)
    elif period == "monthly":
        start_date = now - timedelta(days=30)
        query = query.filter(models.AttendanceLog.timestamp >= start_date)
        
    return query.order_by(models.AttendanceLog.timestamp.desc()).all()

@app.put("/manage-log/{log_id}")
def update_att(log_id: int, data: dict, db: Session = Depends(get_db)):
    print(f"ATTEMPTING UPDATE: ID {log_id}")
    log = db.query(models.AttendanceLog).filter(models.AttendanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log record not found in DB")
    if "timestamp" in data:
        log.timestamp = datetime.fromisoformat(data["timestamp"].replace(" ", "T"))
    db.commit()
    return {"status": "ok"}

@app.delete("/manage-log/{log_id}")
def delete_att(log_id: int, db: Session = Depends(get_db)):
    print(f"ATTEMPTING DELETE: ID {log_id}")
    log = db.query(models.AttendanceLog).filter(models.AttendanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log record not found in DB")
    db.delete(log)
    db.commit()
    return {"status": "ok"}

@app.get("/employees", response_model=List[schemas.EmployeeResponse])
def get_emps(db: Session = Depends(get_db)):
    employees = db.query(models.Employee).all()
    for emp in employees:
        emp_dir = os.path.join(face_engine.FACES_DB_PATH, emp.emp_id)
        emp.has_face = os.path.exists(emp_dir) and len([f for f in os.listdir(emp_dir) if f.endswith(".jpg")]) > 0
    return employees

@app.post("/employees")
def create_emp(employee: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    hashed_pw = auth.get_password_hash(employee.password)
    new_emp = models.Employee(emp_id=employee.emp_id, name=employee.name, department=employee.department, hashed_password=hashed_pw)
    db.add(new_emp)
    db.commit()
    return new_emp

@app.put("/employees/{emp_id}")
def update_emp(emp_id: str, employee_update: schemas.EmployeeUpdate, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.emp_id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Handle Employee ID change
    if employee_update.emp_id and employee_update.emp_id != emp.emp_id:
        # Check if new ID already exists
        exists = db.query(models.Employee).filter(models.Employee.emp_id == employee_update.emp_id).first()
        if exists:
            raise HTTPException(status_code=400, detail="New Employee ID already exists")
            
        # Rename face directory if it exists
        old_dir = os.path.join(face_engine.FACES_DB_PATH, emp.emp_id)
        new_dir = os.path.join(face_engine.FACES_DB_PATH, employee_update.emp_id)
        if os.path.exists(old_dir):
            try:
                os.rename(old_dir, new_dir)
            except Exception as e:
                print(f"Error renaming directory: {e}")
                # We still proceed with DB update if renaming fails for some reason (e.g. permission)
        
        emp.emp_id = employee_update.emp_id

    if employee_update.name:
        emp.name = employee_update.name
    if employee_update.department:
        emp.department = employee_update.department
    if employee_update.created_at:
        emp.created_at = employee_update.created_at

    db.commit()
    return {"status": "ok"}

@app.put("/employees/{emp_id}/reset-password")
def reset_emp_password(emp_id: str, data: schemas.EmployeePasswordReset, current_user=Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can reset passwords")
    
    emp = db.query(models.Employee).filter(models.Employee.emp_id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    new_password = data.new_password if data.new_password else "123456" # Default reset password
    emp.hashed_password = auth.get_password_hash(new_password)
    db.commit()
    return {"status": "ok", "message": f"Password reset successfully to: {new_password}" if not data.new_password else "Password reset successfully"}

@app.put("/employees/{emp_id}/change-password")
def change_emp_password(emp_id: str, data: schemas.EmployeePasswordChange, current_user=Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can change passwords")
    
    emp = db.query(models.Employee).filter(models.Employee.emp_id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    emp.hashed_password = auth.get_password_hash(data.new_password)
    db.commit()
    return {"status": "ok", "message": "Password updated successfully"}

@app.delete("/employees/{emp_id}")
def delete_emp(emp_id: str, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.emp_id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(emp)
    db.commit()
    
    # Delete associated face images and cache
    emp_dir = os.path.join(face_engine.FACES_DB_PATH, emp_id)
    if os.path.exists(emp_dir):
        import shutil
        shutil.rmtree(emp_dir)
        pkl_path = os.path.join(face_engine.FACES_DB_PATH, "representations_vgg_face.pkl")
        if os.path.exists(pkl_path):
            try: os.remove(pkl_path)
            except: pass

    return {"status": "ok"}

@app.get("/employees/{emp_id}/face")
def get_primary_face(emp_id: str):
    emp_dir = os.path.join(face_engine.FACES_DB_PATH, emp_id)
    if not os.path.exists(emp_dir):
        raise HTTPException(status_code=404, detail="No face directory")
    faces = [f for f in os.listdir(emp_dir) if f.endswith(".jpg")]
    if not faces:
        raise HTTPException(status_code=404, detail="No face photos")
    from fastapi.responses import FileResponse
    return FileResponse(os.path.join(emp_dir, faces[0]))

@app.delete("/employees/{emp_id}/faces")
def delete_emp_faces(emp_id: str, db: Session = Depends(get_db)):
    emp_dir = os.path.join(face_engine.FACES_DB_PATH, emp_id)
    if os.path.exists(emp_dir):
        import shutil
        shutil.rmtree(emp_dir)
        
        # Invalidate DeepFace cache
        pkl_path = os.path.join(face_engine.FACES_DB_PATH, "representations_vgg_face.pkl")
        if os.path.exists(pkl_path):
            try: os.remove(pkl_path)
            except: pass
            
    return {"status": "ok", "message": "All face photos deleted"}

@app.post("/employees/{emp_id}/faces")
async def register_face_route(emp_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Verify employee exists
    emp = db.query(models.Employee).filter(models.Employee.emp_id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    content = await file.read()
    
    # We need to know how many images already exist to name the new one
    emp_dir = os.path.join(face_engine.FACES_DB_PATH, emp_id)
    existing_images = 0
    if os.path.exists(emp_dir):
        existing_images = len([f for f in os.listdir(emp_dir) if f.endswith(".jpg")])
    
    success = face_engine.register_face(emp_id, content, existing_images)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save face image")
    
    return {"status": "ok", "message": f"Face image {existing_images} registered"}

@app.post("/attendance/webcam")
async def webcam(file: UploadFile = File(...), expected_id: Optional[str] = Form(None), type: Optional[str] = Form("in"), db: Session = Depends(get_db)):
    content = await file.read()
    nparr = np.frombuffer(content, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return {"status": "error", "message": "Could not decode image"}
        
    matches = face_engine.recognize_face(frame)
    if not matches: 
        return {"status": "none", "message": "Face not recognized"}
    
    best = min(matches, key=lambda m: m["distance"])
    
    # NEW: Security check for Employee Login
    if expected_id and best["emp_id"] != expected_id:
        # Check if the expected_id exists in DB to be safe
        target_emp = db.query(models.Employee).filter(models.Employee.emp_id == expected_id).first()
        return {
            "status": "failed", 
            "message": f"Identity Mismatch! This camera is strictly for {target_emp.name if target_emp else expected_id}.",
            "name": best["emp_id"], # Show who was actually seen
            "expected": expected_id
        }

    emp = db.query(models.Employee).filter(models.Employee.emp_id == best["emp_id"]).first()
    if not emp: 
        return {"status": "none", "message": "Employee record not found"}
    
    # Logic for In-Time and Out-Time
    today = date.today()
    holiday = is_holiday(db, today)
    
    logs_today = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.employee_id == emp.id,
        models.AttendanceLog.timestamp >= datetime.combine(today, datetime.min.time()),
        models.AttendanceLog.timestamp <= datetime.combine(today, datetime.max.time())
    ).order_by(models.AttendanceLog.timestamp.asc()).all()
    
    if type == "in" and len(logs_today) > 0:
        return {
            "status": "duplicate",
            "message": "In-Time already marked for today",
            "name": emp.name,
            "emp_id": emp.emp_id,
            "department": emp.department,
            "timestamp": logs_today[0].timestamp.isoformat(),
            "is_holiday": holiday is not None
        }
        
    if type == "out":
        if len(logs_today) == 0:
            return {"status": "failed", "message": "Please mark In-Time first."}
        if len(logs_today) >= 2:
            return {
                "status": "duplicate",
                "message": "Out-Time already marked for today",
                "name": emp.name,
                "emp_id": emp.emp_id,
                "department": emp.department,
                "timestamp": logs_today[-1].timestamp.isoformat(),
                "is_holiday": holiday is not None
            }
        
    log = models.AttendanceLog(employee_id=emp.id, camera_id="webcam", timestamp=datetime.now())
    db.add(log)
    db.commit()
    db.refresh(log)
    
    msg = f"Welcome, {emp.name}!"
    if holiday:
        msg = f"Logged in on Holiday ({holiday.holiday_name}): {emp.name}"
    
    return {
        "status": "success",
        "message": msg,
        "name": emp.name,
        "emp_id": emp.emp_id,
        "department": emp.department,
        "timestamp": log.timestamp.isoformat(),
        "is_holiday": holiday is not None,
        "holiday_name": holiday.holiday_name if holiday else None
    }

@app.get("/cameras/active")
def cams():
    return {"cameras": list(cctv_manager.ACTIVE_CAMERAS.keys())}

@app.get("/cameras/{camera_id}/stream")
def stream(camera_id: str):
    def gen():
        while True:
            f = cctv_manager.get_camera_frame(camera_id)
            if f: yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + f + b'\r\n')
            else: time.sleep(0.1)
    return StreamingResponse(gen(), media_type="multipart/x-mixed-replace; boundary=frame")


# --- HOLIDAY ENDPOINTS ---

@app.get("/holidays", response_model=List[schemas.HolidayResponse])
def get_holidays(db: Session = Depends(get_db)):
    return db.query(models.Holiday).order_by(models.Holiday.start_date.asc()).all()

@app.post("/holidays", response_model=schemas.HolidayResponse)
def create_holiday(holiday: schemas.HolidayCreate, db: Session = Depends(get_db)):
    if holiday.start_date > holiday.end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date")
        
    new_holiday = models.Holiday(**holiday.dict())
    db.add(new_holiday)
    db.commit()
    db.refresh(new_holiday)
    return new_holiday

@app.put("/holidays/{holiday_id}", response_model=schemas.HolidayResponse)
def update_holiday(holiday_id: int, holiday_update: schemas.HolidayUpdate, db: Session = Depends(get_db)):
    db_holiday = db.query(models.Holiday).filter(models.Holiday.id == holiday_id).first()
    if not db_holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    update_data = holiday_update.dict(exclude_unset=True)
    
    # Validation if dates are being updated
    current_start = update_data.get('start_date', db_holiday.start_date)
    current_end = update_data.get('end_date', db_holiday.end_date)
    if current_start > current_end:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date")

    for key, value in update_data.items():
        setattr(db_holiday, key, value)
    
    db.commit()
    db.refresh(db_holiday)
    return db_holiday

@app.delete("/holidays/{holiday_id}")
def delete_holiday(holiday_id: int, db: Session = Depends(get_db)):
    db_holiday = db.query(models.Holiday).filter(models.Holiday.id == holiday_id).first()
    if not db_holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    db.delete(db_holiday)
    db.commit()
    return {"status": "ok"}


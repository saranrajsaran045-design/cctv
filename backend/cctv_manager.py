import cv2
import threading
import time
from queue import Queue
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from face_engine import recognize_face

# Dictionary to store active camera streams
ACTIVE_CAMERAS = {}
# Thread-safe queue for attendance marking
attendance_queue = Queue()

class CCTVStream:
    def __init__(self, camera_id: str, stream_url: str):
        self.camera_id = camera_id
        self.stream_url = stream_url
        self.cap = None
        self.running = False
        self.thread = None
        self.current_frame = None
        # To prevent spamming DB: Track last attendance time for each emp_id
        self.last_attendance = {} 
        self.cooldown_minutes = 1440 # 24 hours to prevent duplicate logs on the same day
        
    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._process_stream, daemon=True)
        self.thread.start()
        
    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join()
        if self.cap:
            self.cap.release()
            
    def _process_stream(self):
        # Open RTSP/HTTP or Local Camera
        def open_capture(url):
            try:
                # Try to see if it's an integer (camera index)
                idx = int(url)
                return cv2.VideoCapture(idx)
            except (ValueError, TypeError):
                # Otherwise treat as URL
                return cv2.VideoCapture(url)

        self.cap = open_capture(self.stream_url)
            
        frame_skip = 10 # Slightly more frequent processing for local testing
        frame_count = 0
        
        while self.running:
            if not self.cap or not self.cap.isOpened():
                time.sleep(2) # Wait and try to reconnect
                if self.cap: self.cap.release()
                self.cap = open_capture(self.stream_url)
                continue
                
            ret, frame = self.cap.read()
            if not ret:
                time.sleep(1)
                continue
            
            self.current_frame = frame.copy()
            frame_count += 1
            
            if frame_count % frame_skip == 0:
                # Downscale for faster processing
                small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
                # Recognize faces
                faces = recognize_face(small_frame)
                
                now = datetime.now()
                for face in faces:
                    emp_id = face['emp_id']
                    # Check cooldown
                    last_seen = self.last_attendance.get(emp_id)
                    if not last_seen or (now - last_seen) > timedelta(minutes=self.cooldown_minutes):
                        self.last_attendance[emp_id] = now
                        attendance_queue.put({
                            "emp_id": emp_id,
                            "camera_id": self.camera_id,
                            "timestamp": now
                        })
                        
    def get_frame_jpeg(self):
        if self.current_frame is not None:
            ret, jpeg = cv2.imencode('.jpg', self.current_frame)
            if ret:
                return jpeg.tobytes()
        return None

def attendance_worker():
    """Background thread to process the attendance queue and save to DB."""
    while True:
        record = attendance_queue.get()
        if record is None:
            break
        emp_id = record['emp_id']
        camera_id = record['camera_id']
        ts = record['timestamp']
        
        db: Session = SessionLocal()
        try:
            employee = db.query(models.Employee).filter(models.Employee.emp_id == emp_id).first()
            if employee:
                # Check if employee already has attendance for today
                today_start = ts.replace(hour=0, minute=0, second=0, microsecond=0)
                recent_log = db.query(models.AttendanceLog).filter(
                    models.AttendanceLog.employee_id == employee.id,
                    models.AttendanceLog.timestamp >= today_start
                ).first()
                
                if not recent_log:
                    new_log = models.AttendanceLog(
                        employee_id=employee.id,
                        camera_id=camera_id,
                        timestamp=ts
                    )
                    db.add(new_log)
                    db.commit()
                    print(f"Marked attendance for {employee.name} at {ts}")
        except Exception as e:
            print(f"DB Error in worker: {e}")
        finally:
            db.close()
        attendance_queue.task_done()

# Start the worker thread
worker_thread = threading.Thread(target=attendance_worker, daemon=True)
worker_thread.start()

def add_camera(camera_id: str, stream_url: str):
    if camera_id in ACTIVE_CAMERAS:
        ACTIVE_CAMERAS[camera_id].stop()
    stream = CCTVStream(camera_id, stream_url)
    stream.start()
    ACTIVE_CAMERAS[camera_id] = stream

def remove_camera(camera_id: str):
    if camera_id in ACTIVE_CAMERAS:
        ACTIVE_CAMERAS[camera_id].stop()
        del ACTIVE_CAMERAS[camera_id]

def get_camera_frame(camera_id: str):
    if camera_id in ACTIVE_CAMERAS:
        return ACTIVE_CAMERAS[camera_id].get_frame_jpeg()
    return None

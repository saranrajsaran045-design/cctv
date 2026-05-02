# CCTV Facial Recognition Attendance System

A production-ready facial recognition attendance system using CCTV camera feeds.

## Core Features
- **Face Recognition**: Powered by DeepFace and OpenCV (VGG-Face model).
- **CCTV Integration**: Supports RTSP/HTTP streams and local webcams.
- **Attendance System**: Auto-marks attendance with a configurable cooldown period (10 minutes) to prevent duplicates.
- **Admin Dashboard**: React + Vite frontend to manage employees, cameras, and view live logs.
- **Export**: Export attendance data to CSV.

## Folder Structure
- `backend/`: FastAPI Python application.
- `frontend/`: React Vite application.
- `docker-compose.yml`: Docker configuration.

## Requirements
- Docker and Docker Compose
- Or Python 3.10+ and Node.js 18+

## Quick Start (Docker)

1. Build and run containers:
   ```bash
   docker-compose up --build
   ```
2. Access Frontend at `http://localhost:5173`
3. Access API Docs at `http://localhost:8000/docs`

## Manual Setup

### Backend
1. Navigate to `backend/`
2. Create virtual environment: `python -m venv venv`
3. Activate it: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
4. Install dependencies: `pip install -r requirements.txt`
5. Run server: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

### Frontend
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`

## Default Credentials
- **Username**: admin
- **Password**: admin123

## Notes for Production
- Switch to PostgreSQL instead of SQLite by updating `DATABASE_URL` in `.env` or `docker-compose.yml`.
- Configure HTTPS.
- Scale workers in Uvicorn or use Gunicorn.
- Depending on camera stream quality and volume, a dedicated GPU is recommended. DeepFace will automatically use GPU if TensorFlow/PyTorch is configured with CUDA.

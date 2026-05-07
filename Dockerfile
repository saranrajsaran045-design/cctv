FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for OpenCV and DeepFace
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Use a dynamic port (defaults to 8000 for local, Render/HF will provide their own)
ENV PORT=8000
EXPOSE 8000

# Run uvicorn on the dynamic port
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]

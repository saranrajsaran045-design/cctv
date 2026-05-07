import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
import cv2
import time
import numpy as np

import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import DeepFace, but provide a fallback if it fails due to environment issues
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    logger.info("DeepFace successfully loaded (TF 2.15.0 environment).")
except ImportError as e:
    logger.error(f"DeepFace could not be loaded (Environment/DLL issue): {e}")
    DEEPFACE_AVAILABLE = False
except Exception as e:
    logger.error(f"An unexpected error occurred while loading DeepFace: {e}")
    DEEPFACE_AVAILABLE = False

FACES_DB_PATH = os.path.abspath("faces_db")

if not os.path.exists(FACES_DB_PATH):
    os.makedirs(FACES_DB_PATH)

def sync_faces_from_db(employees_with_faces):
    """
    Restores the local faces_db folder from database records.
    employees_with_faces: List of objects with emp_id and faces (list of EmployeeFace)
    """
    logger.info(f"SYNC: Restoring faces for {len(employees_with_faces)} employees...")
    for emp in employees_with_faces:
        emp_dir = os.path.join(FACES_DB_PATH, emp.emp_id)
        os.makedirs(emp_dir, exist_ok=True)
        
        for idx, face in enumerate(emp.faces):
            image_path = os.path.join(emp_dir, f"db_restore_{idx}.jpg")
            if not os.path.exists(image_path):
                with open(image_path, "wb") as f:
                    f.write(face.image_data)
    
    # Invalidate cache after restore
    pkl_path = os.path.join(FACES_DB_PATH, "representations_vgg_face.pkl")
    if os.path.exists(pkl_path):
        os.remove(pkl_path)
    logger.info("SYNC: Face database restoration complete.")

def recognize_face(frame_np):
    """
    Recognizes faces in a given frame.
    Returns a list of dicts with 'emp_id' and 'bbox'.
    """
    if not DEEPFACE_AVAILABLE:
        # Fallback: Simple face detection without recognition to keep the system "alive"
        # We'll use OpenCV's built-in Haar Cascades which don't require TensorFlow
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(frame_np, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        results = []
        for (x, y, w, h) in faces:
            results.append({
                "emp_id": "UNKNOWN",
                "bbox": (int(x), int(y), int(w), int(h)),
                "distance": 0
            })
        return results

    try:
        # DeepFace.find returns a list of dataframes (one for each face detected in the frame)
        logger.info(f"Recognition attempt started...")
        dfs = DeepFace.find(
            img_path=frame_np,
            db_path=FACES_DB_PATH,
            model_name="VGG-Face",
            detector_backend="opencv", # Revert to opencv for speed
            enforce_detection=False,
            align=True,
            silent=True
        )
        
        results = []
        THRESHOLD = 0.50
        
        if not dfs:
            logger.warning("No detection results returned by DeepFace.")
            return []

        for i, df in enumerate(dfs):
            if not df.empty:
                match = df.iloc[0]
                distance = float(match['distance'])
                identity = str(match['identity'])
                
                logger.info(f"Face {i} matched with {identity} (Distance: {distance:.4f})")
                
                if distance < THRESHOLD:
                    identity_path = os.path.normpath(identity)
                    parts = identity_path.split(os.sep)
                    
                    if len(parts) >= 2:
                        emp_id = parts[-2]
                        if emp_id == "faces_db" and len(parts) >= 3:
                            emp_id = parts[-3]

                        x = int(match['source_x'])
                        y = int(match['source_y'])
                        w = int(match['source_w'])
                        h = int(match['source_h'])
                        
                        logger.info(f"SUCCESS: Recognized Employee ID: '{emp_id}'")
                        
                        results.append({
                            "emp_id": emp_id,
                            "bbox": (x, y, w, h),
                            "distance": distance
                        })
                else:
                    logger.info(f"MATCH FAILED: Distance {distance:.4f} > {THRESHOLD}")
            else:
                logger.info(f"DETECTION INFO: Face {i} detected but no match found.")
        return results
    except Exception as e:
        logger.error(f"CRITICAL ERROR in face recognition: {e}")
        return []

def register_face(emp_id: str, image_bytes: bytes, image_idx: int):
    """
    Saves an image byte string to the filesystem under the employee's directory.
    """
    try:
        emp_dir = os.path.join(FACES_DB_PATH, emp_id)
        if not os.path.exists(emp_dir):
            os.makedirs(emp_dir)
            
        image_path = os.path.join(emp_dir, f"sample_{image_idx}.jpg")
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            logger.error(f"Failed to decode image for {emp_id}")
            return False
            
        cv2.imwrite(image_path, img)
        logger.info(f"Saved face image to {image_path}")
        
        # Invalidate DeepFace cache so it reloads the new image on next recognition
        pkl_path = os.path.join(FACES_DB_PATH, "representations_vgg_face.pkl")
        if os.path.exists(pkl_path):
            try:
                os.remove(pkl_path)
                print("Invalidated DeepFace representations cache")
            except Exception as e:
                print(f"Failed to remove cache file: {e}")
                
        # We don't call DeepFace.find here anymore to avoid long wait times during upload.
        # The cache will be rebuilt during the next recognition call.
        return True
    except Exception as e:
        print(f"Error registering face for {emp_id}: {e}")
        return False

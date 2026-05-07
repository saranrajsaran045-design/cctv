import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
import cv2
import numpy as np
import pickle
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FACES_DB_PATH = os.path.abspath("faces_db")
RECOGNIZER_PATH = os.path.join(FACES_DB_PATH, "lbph_model.yml")
LABELS_PATH = os.path.join(FACES_DB_PATH, "labels.pkl")

if not os.path.exists(FACES_DB_PATH):
    os.makedirs(FACES_DB_PATH)

# Face detector (lightweight, always available)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# LBPH Face Recognizer (lightweight, works in 512MB RAM)
recognizer = cv2.face.LBPHFaceRecognizer_create(
    radius=2,
    neighbors=16,
    grid_x=8,
    grid_y=8,
    threshold=80.0  # Lower = stricter matching
)

# Label mapping: numeric label -> emp_id
label_map = {}
is_trained = False


def sync_faces_from_db(employees_with_faces):
    """
    Restores the local faces_db folder from database records.
    employees_with_faces: List of objects with emp_id and faces (list of EmployeeFace)
    """
    logger.info(f"SYNC: Restoring faces for {len(employees_with_faces)} employees...")
    for emp in employees_with_faces:
        if not emp.faces:
            continue
        emp_dir = os.path.join(FACES_DB_PATH, emp.emp_id)
        os.makedirs(emp_dir, exist_ok=True)
        
        for idx, face in enumerate(emp.faces):
            image_path = os.path.join(emp_dir, f"db_restore_{idx}.jpg")
            if not os.path.exists(image_path):
                with open(image_path, "wb") as f:
                    f.write(face.image_data)
    
    logger.info("SYNC: Face database restoration complete.")
    # Retrain the model after restoring
    train_recognizer()


def train_recognizer():
    """
    Trains the LBPH recognizer using all face images in faces_db.
    This is lightweight and fast (~1-2 seconds for 50 images).
    """
    global label_map, is_trained
    
    faces = []
    labels = []
    label_map = {}
    current_label = 0
    
    if not os.path.exists(FACES_DB_PATH):
        logger.warning("faces_db directory does not exist.")
        is_trained = False
        return
    
    for emp_id in os.listdir(FACES_DB_PATH):
        emp_dir = os.path.join(FACES_DB_PATH, emp_id)
        if not os.path.isdir(emp_dir):
            continue
            
        images_found = False
        for img_file in os.listdir(emp_dir):
            if not img_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                continue
                
            img_path = os.path.join(emp_dir, img_file)
            img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                continue
            
            # Detect face in the registered image
            detected_faces = face_cascade.detectMultiScale(img, 1.1, 4, minSize=(50, 50))
            
            if len(detected_faces) > 0:
                (x, y, w, h) = detected_faces[0]
                face_roi = img[y:y+h, x:x+w]
                face_roi = cv2.resize(face_roi, (200, 200))
                faces.append(face_roi)
                labels.append(current_label)
                images_found = True
            else:
                # If no face detected, use the whole image (resized)
                face_roi = cv2.resize(img, (200, 200))
                faces.append(face_roi)
                labels.append(current_label)
                images_found = True
        
        if images_found:
            label_map[current_label] = emp_id
            current_label += 1
    
    if len(faces) == 0:
        logger.warning("TRAIN: No face images found to train on.")
        is_trained = False
        return
    
    logger.info(f"TRAIN: Training LBPH with {len(faces)} images across {len(label_map)} employees...")
    recognizer.train(faces, np.array(labels))
    
    # Save model and labels
    try:
        recognizer.save(RECOGNIZER_PATH)
        with open(LABELS_PATH, 'wb') as f:
            pickle.dump(label_map, f)
    except Exception as e:
        logger.error(f"TRAIN: Could not save model: {e}")
    
    is_trained = True
    logger.info(f"TRAIN: Model trained successfully! Labels: {label_map}")


def recognize_face(frame_np):
    """
    Recognizes faces in a given frame using LBPH.
    Returns a list of dicts with 'emp_id' and 'bbox'.
    """
    global is_trained, label_map
    
    # Try loading saved model if not trained yet
    if not is_trained:
        if os.path.exists(RECOGNIZER_PATH) and os.path.exists(LABELS_PATH):
            try:
                recognizer.read(RECOGNIZER_PATH)
                with open(LABELS_PATH, 'rb') as f:
                    label_map = pickle.load(f)
                is_trained = True
                logger.info(f"LOADED saved LBPH model with labels: {label_map}")
            except Exception as e:
                logger.error(f"Failed to load saved model: {e}")
        
        if not is_trained:
            # Try training from scratch
            train_recognizer()
        
        if not is_trained:
            logger.warning("No trained model available. Returning empty.")
            return []
    
    # Convert to grayscale for detection
    gray = cv2.cvtColor(frame_np, cv2.COLOR_BGR2GRAY)
    
    # Detect faces
    detected_faces = face_cascade.detectMultiScale(
        gray, 
        scaleFactor=1.1, 
        minNeighbors=5, 
        minSize=(80, 80)
    )
    
    if len(detected_faces) == 0:
        return []
    
    results = []
    for (x, y, w, h) in detected_faces:
        face_roi = gray[y:y+h, x:x+w]
        face_roi = cv2.resize(face_roi, (200, 200))
        
        try:
            label, confidence = recognizer.predict(face_roi)
            # LBPH confidence: lower = better match. Typically < 80 is a good match.
            distance = confidence / 100.0  # Normalize to 0-1 range
            
            logger.info(f"PREDICT: label={label}, confidence={confidence:.1f}, emp_id={label_map.get(label, 'UNKNOWN')}")
            
            if label in label_map and confidence < 80:
                results.append({
                    "emp_id": label_map[label],
                    "bbox": (int(x), int(y), int(w), int(h)),
                    "distance": distance
                })
            else:
                logger.info(f"REJECT: confidence {confidence:.1f} too high (>80) or label {label} not in map")
        except Exception as e:
            logger.error(f"PREDICT ERROR: {e}")
    
    return results


def register_face(emp_id: str, image_bytes: bytes, image_idx: int):
    """
    Saves an image byte string to the filesystem under the employee's directory.
    Then retrains the recognizer so it can immediately recognize the new face.
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
        
        # Retrain the model with the new face
        train_recognizer()
                
        return True
    except Exception as e:
        print(f"Error registering face for {emp_id}: {e}")
        return False

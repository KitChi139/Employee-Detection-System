from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import numpy as np
import torch
import torchvision.transforms as T

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
model = torch.load("face_recognition_model.pth", map_location="cpu")
model.eval()

# === Preprocessing (MUST match training) ===
transform = T.Compose([
    T.Resize((224, 224), interpolation=T.InterpolationMode.BICUBIC),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# Pre-computed embeddings (load once at startup)
EMPLOYEE_DB = []  # Will be populated on startup

@app.on_event("startup")
async def load_employee_embeddings():
    global EMPLOYEE_DB
    # TODO: Load from database
    # Example:
    # for emp in db_employees:
    #     emb = compute_embedding(emp.photo)
    #     EMPLOYEE_DB.append({"id": emp.id, "name": emp.name, "embedding": emb})
    print(f"Loaded {len(EMPLOYEE_DB)} employee embeddings")

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8)

@app.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        image_tensor = transform(image).unsqueeze(0)
        
        with torch.no_grad():
            embedding = model(image_tensor)[0].numpy()   # shape (128) or (512) etc.

        # Matching
        best_match = None
        best_score = -1.0

        for emp in EMPLOYEE_DB:
            sim = cosine_similarity(embedding, emp["embedding"])
            if sim > best_score:
                best_score = sim
                best_match = emp

        threshold = 0.85  # Tune this (0.6~0.95 depending on your model)

        if best_match and best_score > threshold:
            return {
                "success": True,
                "name": best_match["name"],
                "employee_id": best_match["id"],
                "confidence": float(best_score * 100),
                "embedding": embedding.tolist()  # optional
            }
        else:
            return {
                "success": False,
                "name": None,
                "confidence": float(best_score * 100)
            }

    except Exception as e:
        return {"success": False, "error": str(e)}
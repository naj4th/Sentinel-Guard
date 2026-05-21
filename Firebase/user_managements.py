from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import auth, firestore, credentials
import firebase_admin
from pydantic import BaseModel
from typing import Optional

# Initialize Firebase
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

app = FastAPI()

# ==========================================
# CORS — Allow React frontend on port 3000
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ==========================================
# MODELS
# ==========================================

class UpdateRoleRequest(BaseModel):
    role: str  # "admin" or "standard"

class CreateUserRequest(BaseModel):
    email: str
    password: str
    displayName: str
    role: str  # "admin" or "standard"

# ==========================================
# HELPER — Verify token and check admin
# ==========================================

def get_current_admin(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        decoded = auth.verify_id_token(token)

        # Check role from Firestore
        user_doc = db.collection("users").document(decoded["uid"]).get()
        if not user_doc.exists or user_doc.to_dict().get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        return decoded
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# ==========================================
# ROUTE 1 — Get all users
# ==========================================

@app.get("/admin/users")
def get_all_users(admin=Depends(get_current_admin)):
    users = db.collection("users").stream()
    return [{"id": u.id, **u.to_dict()} for u in users]

# ==========================================
# ROUTE 2 — Update user role
# ==========================================

@app.put("/admin/users/{user_id}/role")
def update_user_role(user_id: str, body: UpdateRoleRequest, admin=Depends(get_current_admin)):
    if body.role not in ["admin", "standard"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Update Firestore
    db.collection("users").document(user_id).update({"role": body.role})

    # Update Firebase Auth custom claims
    auth.set_custom_user_claims(user_id, {"role": body.role})

    return {"message": f"Role updated to {body.role} for user {user_id}"}

# ==========================================
# ROUTE 3 — Create new user
# ==========================================

@app.post("/admin/users")
def create_user(body: CreateUserRequest, admin=Depends(get_current_admin)):
    if body.role not in ["admin", "standard"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Create in Firebase Auth
    new_user = auth.create_user(
        email=body.email,
        password=body.password,
        display_name=body.displayName
    )

    # Set custom claims
    auth.set_custom_user_claims(new_user.uid, {"role": body.role})

    # Save to Firestore
    db.collection("users").document(new_user.uid).set({
        "email": body.email,
        "displayName": body.displayName,
        "role": body.role,
        "createdAt": firestore.SERVER_TIMESTAMP
    })

    return {"message": "User created", "uid": new_user.uid}

# ==========================================
# ROUTE 4 — Delete user
# ==========================================

@app.delete("/admin/users/{user_id}")
def delete_user(user_id: str, admin=Depends(get_current_admin)):
    # Delete from Firebase Auth
    auth.delete_user(user_id)

    # Delete from Firestore
    db.collection("users").document(user_id).delete()

    return {"message": f"User {user_id} deleted"}
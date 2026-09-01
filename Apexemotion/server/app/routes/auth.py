# app/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from app.models.user import UserRegister, UserLogin, Token
from app.auth.utils import hash_password, verify_password, create_access_token, decode_token
from app.db import db  # <- import db from db.py

router = APIRouter(prefix="/auth", tags=["auth"])

users = db.users
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

@router.post("/register")
async def register(user: UserRegister):
    existing = await users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = hash_password(user.password)
    new_user = {"username": user.username, "email": user.email, "hashed_password": hashed_pw}
    result = await users.insert_one(new_user)
    return {"message": "Registered successfully", "id": str(result.inserted_id)}

@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    db_user = await users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(db_user["_id"]), "email": db_user["email"]})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
async def me(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"user": payload}

@router.post("/logout")
async def logout():
    # Stateless JWT: logout handled client-side by deleting token
    return {"message": "Logged out successfully"}

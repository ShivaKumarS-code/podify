from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Dict, Any
from app.core.database import get_session
from app.core.auth import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import User

router = APIRouter()

from typing import Optional

class UserRegister(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

@router.post("/register")
def register_user(data: UserRegister, db: Session = Depends(get_session)) -> Dict[str, Any]:
    # Basic email format check
    email = data.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address format."
        )
    
    # Check if user already exists
    statement = select(User).where(User.email == email)
    existing_user = db.exec(statement).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
        
    # Create new user
    new_user = User(
        email=email,
        hashed_password=hash_password(data.password),
        name=data.name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate token
    token = create_access_token(new_user.id, new_user.email)
    
    return {
        "token": token,
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "default_skill_level": new_user.default_skill_level
        }
    }

@router.post("/login")
def login_user(data: UserLogin, db: Session = Depends(get_session)) -> Dict[str, Any]:
    email = data.email.strip().lower()
    statement = select(User).where(User.email == email)
    user = db.exec(statement).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
        
    token = create_access_token(user.id, user.email)
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "default_skill_level": user.default_skill_level
        }
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "default_skill_level": current_user.default_skill_level
    }

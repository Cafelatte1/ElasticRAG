import os
from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import database
from sqlalchemy.orm import Session
from dotenv import load_dotenv
load_dotenv()

# 보안 설정
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_hashed_password(plain_password):
    return pwd_context.hash(plain_password)

def create_access_token(data: dict, expires_minutes: int | None = None):
    if expires_minutes:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    else:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({**data, "exp": expires_at}, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(access_token: str = Depends(oauth2_scheme), db: Session = Depends(database.GetRDB)):
    try:
        data = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})

    username = data.get("username", None)
    if username is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    
    user = db.query(
        database.Users.id, database.Users.username, database.Users.is_active, database.Users.created_at
    ).filter(database.Users.username == username).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    
    return user

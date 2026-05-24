"""认证路由 - 用户注册与登录"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt, JWTError
from database import get_db
from models.user import User
from schemas.user import UserCreate, UserLogin, UserResponse
from config import settings

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 配置
ACCESS_TOKEN_EXPIRE_DAYS = 7
ALGORITHM = "HS256"


def create_access_token(user_id: int, email: str, onboarded: bool = False) -> str:
    """生成 JWT access token（7天有效）"""
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "email": email, "onboarded": onboarded, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str) -> Optional[dict]:
    """验证 JWT token，返回 payload 或 None"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
) -> User:
    """获取当前登录用户。支持 Bearer token（新）和 X-User-Id header（过渡期）。"""
    # 模式1: JWT Bearer token
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        payload = verify_access_token(token)
        if payload:
            user = db.query(User).filter(User.id == int(payload["sub"])).first()
            if user:
                return user
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")

    # 模式2: X-User-Id header（过渡期兼容）
    if x_user_id is not None:
        user = db.query(User).filter(User.id == int(x_user_id)).first()
        if user:
            return user
        raise HTTPException(status_code=401, detail="用户不存在")

    raise HTTPException(status_code=401, detail="请先登录")


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, db: Session = Depends(get_db)):
    """用户注册 - 邮箱 + 密码（注册即登录，返回 token）"""
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="该邮箱已被注册")

    user = User(
        email=body.email,
        hashed_password=pwd_context.hash(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id, user.email, onboarded=False)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
    }


@router.post("/login")
async def login(body: UserLogin, db: Session = Depends(get_db)):
    """用户登录 - 邮箱 + 密码，返回 JWT token"""
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    if not pwd_context.verify(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    access_token = create_access_token(user.id, user.email, onboarded=user.onboarded)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
    }


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前登录用户信息"""
    return UserResponse.model_validate(current_user)


@router.post("/complete-onboarding")
async def complete_onboarding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """完成新手引导，标记 onboarded 并返回新 token"""
    current_user.onboarded = True
    db.commit()
    new_token = create_access_token(
        current_user.id, current_user.email, onboarded=True
    )
    return {
        "access_token": new_token,
        "token_type": "bearer",
        "user_id": current_user.id,
        "email": current_user.email,
    }
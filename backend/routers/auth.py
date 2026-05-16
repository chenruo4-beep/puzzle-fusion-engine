"""认证路由 - 用户注册与登录"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from database import get_db
from models.user import User
from schemas.user import UserCreate, UserLogin, UserResponse

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, db: Session = Depends(get_db)):
    """用户注册 - 邮箱 + 密码"""
    # 检查邮箱是否已被注册
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="该邮箱已被注册")

    # 创建用户
    user = User(
        email=body.email,
        hashed_password=pwd_context.hash(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login")
async def login(body: UserLogin, db: Session = Depends(get_db)):
    """用户登录 - 邮箱 + 密码"""
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    if not pwd_context.verify(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    # TODO: 返回 JWT token
    return {
        "message": "登录成功",
        "user_id": user.id,
        "email": user.email,
    }
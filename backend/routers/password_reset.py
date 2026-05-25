"""拼拼看Me - 密码重置路由

流程：
1. 用户提交邮箱 → 生成重置token（1小时有效）→ 发送邮件
2. 用户点击邮件链接 → 验证token → 设置新密码
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from database import get_db
from models.user import User
from config import settings

router = APIRouter()

# 密码重置 Token 配置
RESET_TOKEN_EXPIRE_HOURS = 1
ALGORITHM = "HS256"


class ResetRequest(BaseModel):
    """请求重置密码"""
    email: str


class ResetConfirm(BaseModel):
    """确认重置密码"""
    token: str
    new_password: str


def create_reset_token(user_id: int, email: str) -> str:
    """生成密码重置 token（1小时有效）"""
    expire = datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user_id),
        "email": email,
        "purpose": "password_reset",
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def verify_reset_token(token: str) -> dict | None:
    """验证密码重置 token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "password_reset":
            return None
        return payload
    except JWTError:
        return None


@router.post("/request-reset")
async def request_reset(body: ResetRequest, db: Session = Depends(get_db)):
    """请求密码重置 — 发送重置邮件到注册邮箱

    无论邮箱是否存在，都返回成功（防止邮箱枚举攻击）
    """
    user = db.query(User).filter(User.email == body.email).first()

    if user:
        token = create_reset_token(user.id, user.email)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

        # 发送密码重置邮件
        from services.email import send_password_reset as _send_reset
        await _send_reset(user.email, reset_url)

    # 无论邮箱是否存在，都返回相同响应（安全最佳实践）
    return {"message": "如果该邮箱已注册，你将收到重置密码的邮件"}


@router.post("/confirm-reset")
async def confirm_reset(body: ResetConfirm, db: Session = Depends(get_db)):
    """确认密码重置 — 验证 token 并设置新密码"""
    payload = verify_reset_token(body.token)
    if not payload:
        raise HTTPException(
            status_code=400,
            detail="重置链接无效或已过期，请重新申请",
        )

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 更新密码
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    user.hashed_password = pwd_context.hash(body.new_password)
    db.commit()

    return {"message": "密码重置成功，请使用新密码登录"}

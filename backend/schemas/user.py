"""用户相关的 Pydantic 模型"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    """注册请求体"""
    email: str
    password: str


class UserLogin(BaseModel):
    """登录请求体"""
    email: str
    password: str


class UserResponse(BaseModel):
    """用户信息响应体"""
    id: int
    email: str
    onboarded: bool = False
    tier: str = "free"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
"""用户模型 - 存放用户认证信息"""

from sqlalchemy import Column, Integer, String, DateTime, func
from database import Base


class User(Base):
    """用户表"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # 用户邮箱（唯一）
    email = Column(String(255), unique=True, nullable=False, index=True)
    # 加密后的密码
    hashed_password = Column(String(255), nullable=False)
    # 创建时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())

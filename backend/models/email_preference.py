"""邮件偏好模型"""

from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey, func
from database import Base


class EmailPreference(Base):
    """用户邮件通知偏好设置"""

    __tablename__ = "email_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)

    # 各类型邮件开关
    password_reset = Column(Boolean, default=True, server_default="1")
    checkin_reminder = Column(Boolean, default=True, server_default="1")
    weekly_report = Column(Boolean, default=True, server_default="1")
    milestone = Column(Boolean, default=True, server_default="1")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

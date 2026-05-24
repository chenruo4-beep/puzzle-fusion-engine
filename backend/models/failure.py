"""失败记录模型 - 飞轮数据系统的核心"""

from sqlalchemy import Column, Integer, String, DateTime, func
from database import Base


class FailureRecord(Base):
    """失败记录表 - 用户标记'不切实际'等反馈"""

    __tablename__ = "failure_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, default=1)
    fusion_id = Column(Integer, nullable=True)
    profession = Column(String(200), nullable=True)
    reason = Column(String(200), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

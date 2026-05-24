"""用户反馈模型"""

from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database import Base


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, default=1)
    category = Column(String(20), default="建议")  # 建议/问题/使用体验
    content = Column(Text, nullable=False)
    contact = Column(String(100), nullable=True)  # 可选联系方式
    created_at = Column(DateTime, server_default=func.now())

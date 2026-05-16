"""A/B测试埋点模型"""

from sqlalchemy import Column, Integer, String, DateTime, func
from database import Base


class ABEvent(Base):
    """A/B测试事件表 - 记录 page_view / cta_click 等埋点事件"""

    __tablename__ = "ab_events"

    id = Column(Integer, primary_key=True, index=True)
    # A/B测试版本标识：如 "A" 或 "B"
    version = Column(String(10), nullable=False)
    # 事件类型：page_view / cta_click
    event_type = Column(String(50), nullable=False)
    # 匿名用户标识（localStorage uuid 或 session id）
    user_id = Column(String(100), nullable=True)
    # 事件发生时间
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
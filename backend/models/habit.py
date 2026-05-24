"""微习惯模型 - 碎片孵化为每日微行动"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, func
from database import Base


class MicroHabit(Base):
    """微习惯表 - 从碎片孵化的每日2分钟微行动"""

    __tablename__ = "micro_habits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    fragment_id = Column(Integer, ForeignKey("fragments.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=False)
    growth_stage = Column(Integer, default=0, nullable=False)
    streak = Column(Integer, default=0, nullable=False)
    last_checkin_date = Column(String(10), nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

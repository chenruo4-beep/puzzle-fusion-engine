"""融合日记模型 - 每次融合后用户写的一句话记录"""

from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, func
from database import Base


class FusionDiary(Base):
    """融合日记表"""

    __tablename__ = "fusion_diaries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    fusion_id = Column(Integer, ForeignKey("fusions.id"), nullable=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

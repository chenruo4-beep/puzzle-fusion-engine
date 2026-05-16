"""打卡模型 - 存放用户完成融合后的打卡记录"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Integer as IntCol, ForeignKey, func
from database import Base


class CheckIn(Base):
    """打卡表 - 用户完成融合后的成就记录"""

    __tablename__ = "checkins"

    id = Column(Integer, primary_key=True, index=True)
    # 所属用户
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # 打卡标题（要做什么）
    title = Column(String(200), nullable=False, default="")
    # 具体行动描述
    action = Column(Text, nullable=True)
    # 关联的融合结果
    fusion_id = Column(Integer, ForeignKey("fusions.id"), nullable=True)
    # 打卡状态：pending / completed
    status = Column(String(50), default="pending")
    # 用户反馈
    feedback = Column(Text, nullable=True)
    # 完成时间
    completed_at = Column(DateTime(timezone=True), nullable=True)
    # 创建时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())

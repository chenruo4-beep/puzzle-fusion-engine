"""融合模型 - 存放多次融合后的迭代结果"""

from sqlalchemy import Column, Integer, Text, String, DateTime, Integer as IntCol, ForeignKey, func
from database import Base


class Fusion(Base):
    """融合表 - 将碎片融合成连贯洞察的结果"""

    __tablename__ = "fusions"

    id = Column(Integer, primary_key=True, index=True)
    # 所属用户
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # 职业/场景
    profession = Column(String(100), nullable=True)
    # 融合标题（AI生成或前端提供）
    title = Column(String(200), nullable=True)
    # 参与融合的碎片ID列表（JSON 字符串）
    fragment_ids = Column(Text, nullable=False)
    # 融合结果文本
    result = Column(Text, nullable=False)
    # 迭代次数
    iteration = Column(IntCol, default=1)
    # 创建时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # 用户反馈: useful / not_useful / null
    feedback = Column(String(20), nullable=True)
    # 反馈时间
    feedback_at = Column(DateTime(timezone=True), nullable=True)
    # 反馈原因（用户选择"没用"时收集）
    feedback_reason = Column(Text, nullable=True)
    # 反馈来源（web / mobile）
    feedback_source = Column(String(20), nullable=True)
    # 低分审核标记：feedback=not_useful 时标记待审核
    needs_review = Column(Integer, default=0)

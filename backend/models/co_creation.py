"""合拍模型 - 两人合伙创业/项目的组合分析"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, func
from database import Base


class CoCreation(Base):
    """合拍分析表 - 两人碎片组合分析"""

    __tablename__ = "co_creations"

    id = Column(Integer, primary_key=True, index=True)
    # 用户A
    user_a_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_a_name = Column(String(100), nullable=False, default="")
    # 用户B
    user_b_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_b_name = Column(String(100), nullable=False, default="")
    # 关系类型
    relationship = Column(String(50), nullable=False, default="partner")  # partner/lover/spouse/friend
    # 项目类型
    project_type = Column(String(100), nullable=False, default="")
    # 组合分析结果
    result = Column(Text, nullable=True)
    # 契合潜力值 0-100（原success_rate）
    potential_score = Column(Integer, default=50)
    # 互补性评分 0-100
    complement_score = Column(Integer, default=50)
    # 风险等级 low/medium/high
    risk_level = Column(String(20), default="medium")
    # 状态
    status = Column(String(50), default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CoCreationFragment(Base):
    """合拍使用的碎片关联表"""

    __tablename__ = "co_creation_fragments"

    id = Column(Integer, primary_key=True, index=True)
    co_creation_id = Column(Integer, ForeignKey("co_creations.id"), nullable=False)
    fragment_id = Column(Integer, ForeignKey("fragments.id"), nullable=False)
    user_role = Column(String(10), nullable=False)  # 'a' or 'b'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

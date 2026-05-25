"""社区功能模型 - 评论与点赞"""

from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, UniqueConstraint, func
from database import Base


class Comment(Base):
    """评论表 - 用户对融合结果的评论"""

    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    fusion_id = Column(Integer, ForeignKey("fusions.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Like(Base):
    """点赞表 - 用户对融合结果的点赞"""

    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    fusion_id = Column(Integer, ForeignKey("fusions.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "fusion_id", name="uq_user_fusion_like"),
    )

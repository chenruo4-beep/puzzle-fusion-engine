"""碎片模型 - 存放用户解构日记后提取的关键信息碎片"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Integer as IntCol, ForeignKey, func
from database import Base


class Fragment(Base):
    """碎片表 - 从日记中提取的结构化信息"""

    __tablename__ = "fragments"

    id = Column(Integer, primary_key=True, index=True)
    # 所属用户
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # 来源日记ID
    journal_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True, index=True)
    # 碎片类型：技能/能力/爱好/习惯/知识/经历/资源/性格
    fragment_type = Column(String(20), nullable=True, default="技能")
    # 碎片内容
    content = Column(Text, nullable=False)
    # 碎片标签（JSON 字符串存储）
    tags = Column(Text, nullable=True)
    # 是否归档（1=归档，0=活跃）
    archived = Column(Integer, default=0)
    # 创建时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())

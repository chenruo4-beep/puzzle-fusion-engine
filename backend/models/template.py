"""模板模型 - 存放6个预设日记模板"""

from sqlalchemy import Column, Integer, String, Text, DateTime, func
from database import Base


class Template(Base):
    """模板表 - 预设的6个日记引导模板"""

    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    # 模板名称
    name = Column(String(100), nullable=False)
    # 模板描述
    description = Column(Text, nullable=True)
    # 提示问题（JSON 字符串）
    prompts = Column(Text, nullable=False)
    # 创建时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())

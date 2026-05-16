"""日记模型 - 存放用户的原始日记条目"""

from sqlalchemy import Column, Integer, Text, String, DateTime, Integer as IntCol, ForeignKey, func
from database import Base


class JournalEntry(Base):
    """日记表 - 用户写下的原始日记"""

    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    # 所属用户
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # 日记正文
    content = Column(Text, nullable=False)
    # 日记标签（逗号分隔）
    tags = Column(String(500), nullable=True)
    # AI建议的碎片（JSON字符串，格式：[{"type":"技能","content":"..."},...]）
    suggested_fragments = Column(Text, nullable=True)
    # 从本日记提取的碎片ID列表（JSON 字符串，用户确认后的）
    extracted_fragment_ids = Column(String(500), nullable=True)
    # 自动提取的碎片数量（用于前端Toast通知）
    auto_extracted_count = Column(IntCol, default=0, nullable=False)
    # 创建时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())

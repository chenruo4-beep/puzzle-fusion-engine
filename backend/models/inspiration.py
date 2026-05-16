"""灵感集模型"""

from sqlalchemy import Column, Integer, String, Text, DateTime, func
from database import Base


class Inspiration(Base):
    """灵感集表 - 存储融合后的灵感火花"""

    __tablename__ = "inspirations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # 用户ID（默认1，为多用户预留）
    user_id = Column(Integer, default=1, nullable=False, index=True)
    # 标题
    title = Column(String(200), nullable=False)
    # 洞察内容
    insight = Column(Text, nullable=True)
    # 行动项
    action = Column(Text, nullable=True)
    # 可选方向列表（JSON字符串）
    directions = Column(Text, nullable=True)
    # 金句
    spark = Column(Text, nullable=True)
    # 拼图片数量
    fragment_count = Column(Integer, default=0)
    # 保存时间
    saved_at = Column(DateTime(timezone=True), server_default=func.now())
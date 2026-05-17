"""合拍订单模型 - 双人确认+冷静期机制"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, func
from database import Base


class CoCreationOrder(Base):
    """合拍地图订单表"""

    __tablename__ = "co_creation_orders"

    id = Column(Integer, primary_key=True, index=True)
    # 关联的合拍分析
    co_creation_id = Column(Integer, ForeignKey("co_creations.id"), nullable=False)
    
    # 发起人信息
    initiator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    initiator_name = Column(String(100), nullable=False)
    
    # 对方信息
    partner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    partner_name = Column(String(100), nullable=False)
    
    # 订单状态
    status = Column(String(50), default="pending_partner")  # pending_partner/partner_confirmed/paid/completed/refunded
    
    # 冷静期
    cool_down_end = Column(DateTime(timezone=True), nullable=True)  # 冷静期截止时间
    refund_available = Column(Boolean, default=True)  # 是否可退款
    
    # 支付信息
    amount = Column(Float, default=9.9)
    paid_by = Column(String(10), default="initiator")  # initiator/partner/aa
    paid_at = Column(DateTime(timezone=True), nullable=True)
    
    # 地图生成状态
    map_generated = Column(Boolean, default=False)
    map_id = Column(Integer, nullable=True)
    
    # 关系存档（分手后保留纪念地图）
    archived = Column(Boolean, default=False)  # 是否已存档
    archived_at = Column(DateTime(timezone=True), nullable=True)  # 存档时间
    archive_note = Column(Text, nullable=True)  # 存档留言（可选）
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

"""支付记录模型 - 追踪 Stripe 支付历史"""

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, Float, func
from database import Base


class Payment(Base):
    """支付记录表"""

    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    # 关联用户
    user_id = Column(Integer, nullable=False, index=True)
    # Stripe 支付意图 ID
    stripe_payment_intent_id = Column(String(255), nullable=True)
    # Stripe 发票 ID
    stripe_invoice_id = Column(String(255), nullable=True, index=True)
    # Stripe 订阅 ID
    stripe_subscription_id = Column(String(255), nullable=True, index=True)
    # 金额（单位：分，如 ¥29.00 = 2900）
    amount = Column(Integer, nullable=False)
    # 币种
    currency = Column(String(10), default="cny")
    # 状态: succeeded / failed / refunded / pending
    status = Column(String(50), nullable=False, default="pending")
    # 计费类型: monthly / yearly
    plan_type = Column(String(50), nullable=True)
    # 创建时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())

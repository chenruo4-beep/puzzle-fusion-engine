"""用户模型 - 存放用户认证信息"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from database import Base


class User(Base):
    """用户表"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # 用户邮箱（唯一）
    email = Column(String(255), unique=True, nullable=False, index=True)
    # 加密后的密码
    hashed_password = Column(String(255), nullable=False)
    # 是否完成新手引导
    onboarded = Column(Boolean, default=False, server_default='0')
    # 用户等级: free / pro
    tier = Column(String(20), default="free", server_default="free")
    # 专业版试用到期时间（7天试用）
    trial_expires_at = Column(DateTime(timezone=True), nullable=True)

    # ---------- Stripe 订阅字段 ----------
    # Stripe 客户 ID（用户在 Stripe 的唯一标识）
    stripe_customer_id = Column(String(255), nullable=True, unique=True)
    # Stripe 订阅 ID（当前激活的订阅）
    stripe_subscription_id = Column(String(255), nullable=True, unique=True)
    # 订阅状态: active / past_due / canceled / trialing / incomplete / null
    subscription_status = Column(String(50), nullable=True)
    # 当前计费周期结束时间
    subscription_current_period_end = Column(DateTime(timezone=True), nullable=True)

    # 创建时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())

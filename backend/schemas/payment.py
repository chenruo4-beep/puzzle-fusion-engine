"""支付相关的 Pydantic 模型"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CreateSubscriptionRequest(BaseModel):
    """创建订阅请求体"""
    price_id: str
    success_url: str = "http://localhost:3000/dashboard"
    cancel_url: str = "http://localhost:3000/billing"


class CreateSubscriptionResponse(BaseModel):
    """创建订阅响应体 — 返回 Stripe Checkout URL"""
    url: str
    session_id: str


class SubscriptionStatusResponse(BaseModel):
    """订阅状态响应"""
    tier: str
    is_active: bool
    plan_type: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False


class PaymentRecord(BaseModel):
    """单条支付记录"""
    id: int
    amount: int
    currency: str
    status: str
    plan_type: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentHistoryResponse(BaseModel):
    """支付历史响应"""
    payments: list[PaymentRecord]


class CustomerPortalResponse(BaseModel):
    """客户门户 URL 响应"""
    url: str

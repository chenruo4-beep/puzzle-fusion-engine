"""计费路由 — 用量查询 / 订阅管理 / Stripe Webhook"""

from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
import stripe
from stripe import SignatureVerificationError

from database import get_db
from models.user import User
from routers.auth import get_current_user
from services.billing import get_usage, start_trial
from services.payment import (
    create_checkout_session,
    create_customer_portal_session,
    cancel_subscription,
    get_subscription_status,
    get_payment_history,
    handle_checkout_completed,
    handle_subscription_updated,
    handle_subscription_deleted,
    handle_invoice_paid,
    handle_invoice_payment_failed,
)
from schemas.payment import (
    CreateSubscriptionRequest,
    SubscriptionStatusResponse,
    PaymentHistoryResponse,
    PaymentRecord,
    CustomerPortalResponse,
)
from config import settings
from logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)


# ==================== 现有端点（保持兼容）====================

@router.get("/usage")
async def usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """查询当前用量"""
    return get_usage(current_user, db)


@router.post("/trial")
async def trial(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """开启 7 天专业版试用"""
    start_trial(current_user, db)
    return get_usage(current_user, db)


# ==================== 订阅管理 ====================


@router.post("/create-subscription", response_model=dict)
async def create_subscription(
    body: CreateSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建 Stripe Checkout 会话（用于订阅专业版）"""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="支付功能尚未配置，请联系管理员",
        )
    return create_checkout_session(
        user=current_user,
        price_id=body.price_id,
        success_url=body.success_url,
        cancel_url=body.cancel_url,
    )


@router.post("/cancel-subscription", response_model=dict)
async def cancel_user_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """取消订阅（当前周期结束后不再续费）"""
    return cancel_subscription(current_user, db)


@router.get("/subscription", response_model=SubscriptionStatusResponse)
async def subscription_status(
    current_user: User = Depends(get_current_user),
):
    """查看当前订阅状态"""
    return get_subscription_status(current_user)


@router.get("/payments", response_model=PaymentHistoryResponse)
async def payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """查看支付历史"""
    records = get_payment_history(current_user, db)
    return PaymentHistoryResponse(
        payments=[PaymentRecord.model_validate(r) for r in records]
    )


@router.post("/portal", response_model=CustomerPortalResponse)
async def billing_portal(
    current_user: User = Depends(get_current_user),
):
    """获取 Stripe Customer Portal URL（管理订阅/发票）"""
    return create_customer_portal_session(current_user)


# ==================== Stripe Webhook ====================


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """接收 Stripe Webhook 事件

    注意：必须使用原始请求体进行签名验证。
    需要 Stripe 签名密钥（STRIPE_WEBHOOK_SECRET）。
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.warning("STRIPE_WEBHOOK_SECRET 未配置，跳过 Webhook 验证")
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Webhook 未配置",
        )

    # 获取原始请求体
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="缺少 stripe-signature 请求头",
        )

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except SignatureVerificationError as e:
        logger.error("Stripe Webhook 签名验证失败", extra={
            "error": {"type": "SignatureVerificationError", "message": str(e)},
        })
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook 签名验证失败",
        )
    except ValueError as e:
        logger.error("Stripe Webhook payload 解析失败", extra={
            "error": {"type": "ValueError", "message": str(e)},
        })
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的 Webhook payload",
        )

    # 分发事件
    event_type = event.get("type")
    event_data = event.get("data", {}).get("object", {})

    logger.info("收到 Stripe Webhook", extra={
        "event_type": event_type,
        "event_id": event.get("id"),
    })

    try:
        if event_type == "checkout.session.completed":
            handle_checkout_completed(
                subscription_id=event_data.get("subscription"),
                customer_id=event_data.get("customer"),
                metadata=event_data.get("metadata", {}),
            )
        elif event_type == "customer.subscription.updated":
            handle_subscription_updated(event_data)
        elif event_type == "customer.subscription.deleted":
            handle_subscription_deleted(event_data)
        elif event_type == "invoice.paid":
            handle_invoice_paid(event_data)
        elif event_type == "invoice.payment_failed":
            handle_invoice_payment_failed(event_data)
        else:
            logger.debug("未处理的 Webhook 事件类型", extra={
                "event_type": event_type,
            })
    except Exception as e:
        logger.error("处理 Stripe Webhook 事件失败", extra={
            "event_type": event_type,
            "error": {"type": type(e).__name__, "message": str(e)},
        }, exc_info=True)
        # 返回 200 避免 Stripe 重试（记录异常但不阻塞后续事件）
        return {"received": True, "warning": f"事件处理异常: {type(e).__name__}"}

    return {"received": True, "type": event_type}

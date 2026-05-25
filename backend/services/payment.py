"""Stripe 支付服务 — 订阅创建 / Webhook 处理 / 支付记录"""

from datetime import datetime, timezone
from typing import Optional

import stripe
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from config import settings
from logging_config import get_logger
from models.payment import Payment
from models.user import User

logger = get_logger(__name__)

# 初始化 Stripe SDK
stripe.api_key = settings.STRIPE_SECRET_KEY


def get_stripe_price_id(plan_type: str) -> str:
    """根据计划类型返回 Stripe Price ID"""
    if plan_type == "monthly":
        return settings.STRIPE_PRICE_MONTHLY
    elif plan_type == "yearly":
        return settings.STRIPE_PRICE_YEARLY
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"不支持的计费计划: {plan_type}，可选: monthly / yearly",
    )


def create_checkout_session(
    user: User,
    price_id: str,
    success_url: str,
    cancel_url: str,
) -> dict:
    """创建 Stripe Checkout Session（订阅模式）"""
    try:
        # 确保用户在 Stripe 有 Customer 记录
        if not user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=user.email,
                metadata={"user_id": str(user.id)},
            )
            user.stripe_customer_id = customer.id

        session = stripe.checkout.Session.create(
            customer=user.stripe_customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url,
            metadata={
                "user_id": str(user.id),
                "user_email": user.email,
            },
            subscription_data={
                "metadata": {
                    "user_id": str(user.id),
                },
            },
        )

        return {"url": session.url, "session_id": session.id}
    except stripe.error.StripeError as e:
        logger.error("Stripe 创建 Checkout Session 失败", extra={
            "error": {"type": type(e).__name__, "message": str(e)},
            "user_id": str(user.id),
        })
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"支付服务暂时不可用: {e.user_message or '请稍后重试'}",
        )


def create_customer_portal_session(user: User) -> dict:
    """创建 Stripe Customer Portal 会话（管理订阅）"""
    if not user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="您还没有 Stripe 客户记录，请先订阅",
        )
    try:
        session = stripe.billing_portal.Session.create(
            customer=user.stripe_customer_id,
            return_url="http://localhost:3000/billing",
        )
        return {"url": session.url}
    except stripe.error.StripeError as e:
        logger.error("Stripe 创建 Customer Portal 失败", extra={
            "error": {"type": type(e).__name__, "message": str(e)},
            "user_id": str(user.id),
        })
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="管理页面暂时不可用",
        )


def cancel_subscription(user: User, db: Session) -> dict:
    """取消订阅（在周期结束时停止续费）"""
    if not user.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="没有可取消的订阅",
        )
    try:
        stripe.Subscription.modify(
            user.stripe_subscription_id,
            cancel_at_period_end=True,
        )
        user.subscription_status = "canceled"
        db.commit()

        logger.info("用户订阅已标记到期取消", extra={
            "user_id": str(user.id),
            "subscription_id": user.stripe_subscription_id,
        })
        return {"message": "订阅将在当前周期结束后取消"}
    except stripe.error.StripeError as e:
        logger.error("Stripe 取消订阅失败", extra={
            "error": {"type": type(e).__name__, "message": str(e)},
            "user_id": str(user.id),
        })
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="取消失败，请稍后重试",
        )


def get_subscription_status(user: User) -> dict:
    """获取用户订阅状态"""
    is_active = (
        user.tier == "pro"
        and user.subscription_status == "active"
    )

    # 试用期也视为有效
    if (
        user.tier == "free"
        and user.trial_expires_at
        and user.trial_expires_at > datetime.now(timezone.utc)
    ):
        is_active = True

    # 判断是否是周期结束取消
    cancel_at_period_end = False
    if user.stripe_subscription_id and is_active:
        try:
            sub = stripe.Subscription.retrieve(user.stripe_subscription_id)
            cancel_at_period_end = sub.cancel_at_period_end
        except stripe.error.StripeError:
            pass

    return {
        "tier": user.tier,
        "is_active": is_active,
        "plan_type": "yearly" if user.stripe_subscription_id and "yearly" in str(user.stripe_subscription_id) else "monthly" if user.stripe_subscription_id else None,
        "current_period_end": user.subscription_current_period_end,
        "cancel_at_period_end": cancel_at_period_end,
    }


def get_payment_history(user: User, db: Session, limit: int = 50) -> list[Payment]:
    """获取用户支付历史"""
    return (
        db.query(Payment)
        .filter(Payment.user_id == user.id)
        .order_by(Payment.created_at.desc())
        .limit(limit)
        .all()
    )


# ==================== Webhook 处理 ====================


def handle_checkout_completed(subscription_id: str, customer_id: str, metadata: dict) -> None:
    """处理 checkout.session.completed 事件"""
    from database import SessionLocal

    db = SessionLocal()
    try:
        user_id = int(metadata.get("user_id", 0))
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error("Webhook: 用户不存在", extra={"user_id": str(user_id)})
            return

        # 获取订阅详情
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
        except stripe.error.StripeError as e:
            logger.error("Webhook: 获取订阅失败", extra={"error": str(e)})
            return

        user.stripe_customer_id = customer_id
        user.stripe_subscription_id = subscription_id
        user.subscription_status = subscription.status
        user.tier = "pro"
        if subscription.current_period_end:
            user.subscription_current_period_end = datetime.fromtimestamp(
                subscription.current_period_end, tz=timezone.utc
            )

        db.commit()
        logger.info("用户订阅已激活", extra={
            "user_id": user.id,
            "subscription_id": subscription_id,
        })
    finally:
        db.close()


def handle_subscription_updated(subscription: stripe.Subscription) -> None:
    """处理 customer.subscription.updated"""
    from database import SessionLocal

    db = SessionLocal()
    try:
        user_id = int(subscription.metadata.get("user_id", 0))
        if not user_id:
            # 回退到通过 customer_id 查找
            customers = stripe.Customer.list(
                limit=1, email=subscription.metadata.get("user_email", "")
            )
            logger.warning("Webhook subscription.updated 缺少 user_id metadata", extra={
                "subscription_id": subscription.id,
            })
            db.close()
            return

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error("Webhook: 用户不存在", extra={"user_id": str(user_id)})
            return

        user.subscription_status = subscription.status
        if subscription.current_period_end:
            user.subscription_current_period_end = datetime.fromtimestamp(
                subscription.current_period_end, tz=timezone.utc
            )

        # 状态映射
        if subscription.status == "active":
            user.tier = "pro"
        elif subscription.status in ("canceled", "incomplete_expired", "unpaid"):
            user.tier = "free"
            user.subscription_status = "canceled"

        db.commit()
        logger.info("用户订阅状态已更新", extra={
            "user_id": user.id,
            "subscription_id": subscription.id,
            "status": subscription.status,
        })
    finally:
        db.close()


def handle_subscription_deleted(subscription: stripe.Subscription) -> None:
    """处理 customer.subscription.deleted"""
    from database import SessionLocal

    db = SessionLocal()
    try:
        user_id = int(subscription.metadata.get("user_id", 0))
        if not user_id:
            logger.warning("Webhook subscription.deleted 缺少 user_id metadata")
            db.close()
            return

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error("Webhook: 用户不存在", extra={"user_id": str(user_id)})
            return

        user.tier = "free"
        user.subscription_status = "canceled"
        user.stripe_subscription_id = None
        db.commit()
        logger.info("用户订阅已删除", extra={
            "user_id": user.id,
            "subscription_id": subscription.id,
        })
    finally:
        db.close()


def handle_invoice_paid(invoice) -> None:
    """处理 invoice.paid — 记录支付"""
    from database import SessionLocal

    db = SessionLocal()
    try:
        subscription_id = invoice.get("subscription")
        customer_id = invoice.get("customer")
        payment_intent = invoice.get("payment_intent")
        amount = invoice.get("amount_paid", 0)
        currency = invoice.get("currency", "cny")

        if not subscription_id:
            db.close()
            return

        # 查找用户
        user = db.query(User).filter(
            User.stripe_subscription_id == subscription_id
        ).first()
        if not user:
            # 通过 customer_id 查找
            user = db.query(User).filter(
                User.stripe_customer_id == customer_id
            ).first()
        if not user:
            logger.error("Webhook invoice.paid: 未找到对应用户", extra={
                "subscription_id": subscription_id,
            })
            db.close()
            return

        # 记录支付
        payment = Payment(
            user_id=user.id,
            stripe_payment_intent_id=payment_intent,
            stripe_invoice_id=invoice.get("id"),
            stripe_subscription_id=subscription_id,
            amount=amount,
            currency=currency,
            status="succeeded",
        )
        db.add(payment)
        db.commit()
        logger.info("支付记录已保存", extra={
            "user_id": user.id,
            "amount": amount,
            "invoice_id": invoice.get("id"),
        })
    finally:
        db.close()


def handle_invoice_payment_failed(invoice) -> None:
    """处理 invoice.payment_failed"""
    from database import SessionLocal

    db = SessionLocal()
    try:
        subscription_id = invoice.get("subscription")
        if not subscription_id:
            db.close()
            return

        user = db.query(User).filter(
            User.stripe_subscription_id == subscription_id
        ).first()
        if not user:
            db.close()
            return

        amount = invoice.get("amount_due", 0)
        currency = invoice.get("currency", "cny")

        # 记录失败的支付
        payment = Payment(
            user_id=user.id,
            stripe_payment_intent_id=invoice.get("payment_intent"),
            stripe_invoice_id=invoice.get("id"),
            stripe_subscription_id=subscription_id,
            amount=amount,
            currency=currency,
            status="failed",
        )
        db.add(payment)

        # 更新订阅状态
        user.subscription_status = "past_due"
        db.commit()
        logger.warning("用户支付失败", extra={
            "user_id": user.id,
            "amount": amount,
            "invoice_id": invoice.get("id"),
        })
    finally:
        db.close()

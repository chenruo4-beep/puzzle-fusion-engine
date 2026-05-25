"""计费服务 — 免费版限制逻辑"""

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from fastapi import HTTPException, status

from models.user import User
from models.fragment import Fragment
from models.fusion import Fusion

# 免费版限制
FREE_FRAGMENT_LIMIT = 50
FREE_FUSION_LIMIT = 25
TRIAL_DAYS = 7


def _is_pro_user(user: User) -> bool:
    """判断用户是否为专业版（含试用 + Stripe 订阅活跃）"""
    if user.tier == "pro":
        if user.subscription_status == "active":
            return True
        if user.subscription_status == "trialing":
            return True
    # 试用期活跃
    if user.trial_expires_at and user.trial_expires_at > datetime.now(timezone.utc):
        return True
    return user.tier == "pro"


def check_fragment_limit(user: User, db: Session) -> None:
    """免费用户碎片数 ≥ 50 时拒绝创建"""
    if _is_pro_user(user):
        return
    count = db.query(sqlfunc.count(Fragment.id)).filter(
        Fragment.user_id == user.id,
        Fragment.archived == 0,
    ).scalar()
    if count is not None and count >= FREE_FRAGMENT_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "fragment_limit_reached",
                "message": f"免费版最多 {FREE_FRAGMENT_LIMIT} 块碎片，已使用 {count} 块。升级专业版解锁无限碎片。",
                "limit": FREE_FRAGMENT_LIMIT,
                "used": count,
                "tier": "free",
            },
        )


def check_fusion_limit(user: User, db: Session) -> None:
    """免费用户当月融合次数 ≥ 25 时拒绝"""
    if _is_pro_user(user):
        return
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    count = db.query(sqlfunc.count(Fusion.id)).filter(
        Fusion.user_id == user.id,
        Fusion.created_at >= month_start,
    ).scalar()
    if count is not None and count >= FREE_FUSION_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "fusion_limit_reached",
                "message": f"免费版每月最多 {FREE_FUSION_LIMIT} 次融合，本月已用 {count} 次。升级专业版解锁无限融合。",
                "limit": FREE_FUSION_LIMIT,
                "used": count,
                "tier": "free",
            },
        )


def get_usage(user: User, db: Session) -> dict:
    """获取用户当前用量"""
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    fragment_count = db.query(sqlfunc.count(Fragment.id)).filter(
        Fragment.user_id == user.id,
        Fragment.archived == 0,
    ).scalar() or 0

    fusion_count = db.query(sqlfunc.count(Fusion.id)).filter(
        Fusion.user_id == user.id,
        Fusion.created_at >= month_start,
    ).scalar() or 0

    is_trial = (
        user.tier == "free"
        and user.trial_expires_at is not None
        and user.trial_expires_at > now
    )

    return {
        "tier": user.tier,
        "subscription_status": user.subscription_status,
        "is_trial": is_trial,
        "trial_days_left": (
            (user.trial_expires_at - now).days
            if is_trial and user.trial_expires_at
            else 0
        ),
        "is_pro": _is_pro_user(user),
        "fragments": {
            "used": fragment_count,
            "limit": None if _is_pro_user(user) else FREE_FRAGMENT_LIMIT,
        },
        "fusions": {
            "used": fusion_count,
            "limit": None if _is_pro_user(user) else FREE_FUSION_LIMIT,
        },
    }


def start_trial(user: User, db: Session) -> None:
    """开启 7 天专业版试用"""
    user.tier = "free"
    user.trial_expires_at = datetime.utcnow() + timedelta(days=TRIAL_DAYS)
    db.commit()

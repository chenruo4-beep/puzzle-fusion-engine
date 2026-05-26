"""拼拼看Me - Web Push 推送路由

提供推送订阅管理及测试推送的 API。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from models.user import User
from routers.auth import get_current_user

router = APIRouter()


# ========== 请求/响应模型 ==========


class SubscriptionRequest(BaseModel):
    """保存推送订阅"""
    subscription: dict  # {endpoint, keys: {p256dh, auth}}


class UnsubscribeRequest(BaseModel):
    """取消推送订阅"""
    endpoint: str


class TestPushRequest(BaseModel):
    """测试推送"""
    title: str = "拼拼看Me"
    body: str = "这是一条测试推送通知"
    url: str = ""


# ========== API 端点 ==========


@router.post("/subscribe")
async def subscribe(
    body: SubscriptionRequest,
    current_user: User = Depends(get_current_user),
):
    """保存推送订阅

    - subscription: 浏览器 PushSubscription JSON 对象
    """
    from services.push_service import subscribe as _subscribe

    _subscribe(current_user.id, body.subscription)
    return {"message": "订阅成功"}


@router.delete("/subscribe")
async def unsubscribe(
    body: UnsubscribeRequest,
    current_user: User = Depends(get_current_user),
):
    """取消推送订阅

    - endpoint: 要取消的 endpoint URL
    """
    from services.push_service import unsubscribe as _unsubscribe

    removed = _unsubscribe(current_user.id, body.endpoint)
    if not removed:
        raise HTTPException(status_code=404, detail="未找到该订阅")
    return {"message": "取消订阅成功"}


@router.post("/test")
async def test_push(
    body: TestPushRequest = TestPushRequest(),
    current_user: User = Depends(get_current_user),
):
    """向当前用户发送一条测试推送

    - title: 通知标题（默认：拼拼看Me）
    - body: 通知正文（默认：这是一条测试推送通知）
    - url: 点击跳转 URL（可选）
    """
    from services.push_service import send_push

    count = send_push(current_user.id, body.title, body.body, body.url)
    if count == 0:
        raise HTTPException(
            status_code=404,
            detail="没有找到可用的推送订阅，请先订阅",
        )
    return {"message": f"测试推送已发送 ({count} 个终端)"}


@router.get("/vapid-public-key")
async def vapid_public_key():
    """获取 VAPID 公钥（base64 DER 格式）"""
    from services.push_service import get_vapid_public_key_b64

    return {"public_key": get_vapid_public_key_b64()}

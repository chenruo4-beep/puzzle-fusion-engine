"""拼拼看Me - Web Push 通知服务

基于 pywebpush 实现浏览器推送通知。
VAPID 密钥对首次使用时自动生成，保存到 keys/ 目录。
订阅数据保存在内存 dict 中。
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

from config import settings

logger = logging.getLogger(__name__)

# 内存订阅存储: user_id -> list[subscription_dict]
_subscriptions: dict[int, list[dict[str, Any]]] = {}

# VAPID 密钥缓存
_vapid_private_key: bytes | None = None
_vapid_public_key: bytes | None = None
_vapid_public_key_b64: str | None = None


# ========== VAPID 密钥管理 ==========


def _ensure_keys_directory() -> Path:
    """确保 keys/ 目录存在。"""
    keys_dir = Path(settings.VAPID_PRIVATE_KEY_PATH).resolve().parent
    keys_dir.mkdir(parents=True, exist_ok=True)
    return keys_dir


def _load_or_generate_vapid_keys() -> tuple[bytes, bytes, str]:
    """加载或生成 VAPID 密钥对。

    Returns:
        (private_key_pem, public_key_pem, public_key_base64_der)
    """
    global _vapid_private_key, _vapid_public_key, _vapid_public_key_b64

    if _vapid_private_key is not None:
        return _vapid_private_key, _vapid_public_key, _vapid_public_key_b64  # type: ignore[return-value]

    priv_path = Path(settings.VAPID_PRIVATE_KEY_PATH)
    pub_path = Path(settings.VAPID_PUBLIC_KEY_PATH)

    if priv_path.exists():
        _vapid_private_key = priv_path.read_bytes()
        _vapid_public_key = pub_path.read_bytes()
        _vapid_public_key_b64 = _der_to_base64(_vapid_public_key)
        logger.info("已从文件加载 VAPID 密钥对")
        return _vapid_private_key, _vapid_public_key, _vapid_public_key_b64

    # 首次运行 — 自动生成 EC 密钥
    logger.info("未找到 VAPID 密钥对，正在自动生成...")
    _ensure_keys_directory()

    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    # 保存私钥 (PKCS#8 PEM)
    priv_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    priv_path.write_bytes(priv_pem)
    # Windows 上限制私钥文件权限
    try:
        os.chmod(str(priv_path), 0o600)
    except PermissionError:
        pass

    # 保存公钥 (SubjectPublicKeyInfo DER → base64 URL-safe)
    pub_der = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    pub_b64 = _der_to_base64(pub_der)
    pub_path.write_text(pub_b64)

    _vapid_private_key = priv_pem
    _vapid_public_key = pub_der
    _vapid_public_key_b64 = pub_b64

    logger.info("VAPID 密钥对已生成并保存到 keys/ 目录")
    return _vapid_private_key, _vapid_public_key, _vapid_public_key_b64


def _der_to_base64(der_data: bytes) -> str:
    """将 DER 编码的公钥转为 URL-safe base64 字符串（无 padding）。"""
    import base64
    return base64.urlsafe_b64encode(der_data).rstrip(b"=").decode("ascii")


def get_vapid_public_key_b64() -> str:
    """获取 VAPID 公钥（base64 URL-safe 格式，无 padding）。"""
    _, _, b64 = _load_or_generate_vapid_keys()
    return b64


def get_vapid_private_key_pem() -> bytes:
    """获取 VAPID 私钥 PEM 字节。"""
    pem, _, _ = _load_or_generate_vapid_keys()
    return pem


# ========== 订阅管理 ==========


def subscribe(user_id: int, subscription: dict[str, Any]) -> None:
    """保存用户的推送订阅。

    同一 endpoint 不会重复添加。
    """
    endpoint = subscription.get("endpoint")
    if not endpoint:
        logger.warning("订阅缺少 endpoint，已忽略")
        return

    if user_id not in _subscriptions:
        _subscriptions[user_id] = []

    # 去重
    for existing in _subscriptions[user_id]:
        if existing.get("endpoint") == endpoint:
            existing.clear()
            existing.update(subscription)
            logger.info("更新订阅", extra={"user_id": user_id})
            return

    _subscriptions[user_id].append(subscription)
    logger.info("添加订阅", extra={"user_id": user_id, "total": len(_subscriptions[user_id])})


def unsubscribe(user_id: int, endpoint: str) -> bool:
    """按 endpoint 取消订阅。返回是否真的移除了某项。"""
    subs = _subscriptions.get(user_id, [])
    before = len(subs)
    _subscriptions[user_id] = [s for s in subs if s.get("endpoint") != endpoint]
    removed = len(_subscriptions[user_id]) < before
    if removed:
        logger.info("取消订阅", extra={"user_id": user_id})
    return removed


def get_subscriptions(user_id: int) -> list[dict[str, Any]]:
    """获取用户的所有订阅。"""
    return list(_subscriptions.get(user_id, []))


def _build_payload(title: str, body: str, url: str = "") -> bytes:
    """构建推送消息 payload（JSON）。"""
    data = {"title": title, "body": body}
    if url:
        data["url"] = url
    return json.dumps(data).encode("utf-8")


# ========== 发送推送 ==========


def send_push(user_id: int, title: str, body: str, url: str = "") -> int:
    """向用户的所有订阅发送推送通知。

    Args:
        user_id: 目标用户 ID
        title: 通知标题
        body: 通知正文
        url: 点击通知后跳转的 URL（可选）

    Returns:
        成功发送的数量
    """
    if not settings.PUSH_ENABLED:
        logger.info("推送未启用（PUSH_ENABLED=false），跳过推送")
        return 0

    subs = get_subscriptions(user_id)
    if not subs:
        logger.info("用户 %s 没有推送订阅", user_id)
        return 0

    from pywebpush import webpush, WebPushException

    private_key = get_vapid_private_key_pem()
    payload = _build_payload(title, body, url)

    success_count = 0
    expired_endpoints: list[str] = []

    for sub in subs:
        endpoint = sub.get("endpoint", "")
        try:
            response = webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=private_key.decode("utf-8"),
                vapid_claims={"sub": settings.VAPID_SUBJECT},
                content_encoding="aes128gcm",
            )
            logger.info(
                "推送成功",
                extra={"user_id": user_id, "endpoint": endpoint, "status": response.status_code},
            )
            success_count += 1

        except WebPushException as e:
            # 410 Gone = 订阅已过期，移除
            if e.response and e.response.status_code == 410:
                expired_endpoints.append(endpoint)
                logger.info("订阅已过期，即将移除", extra={"endpoint": endpoint})
            else:
                logger.warning(
                    "推送失败",
                    extra={"user_id": user_id, "endpoint": endpoint, "error": str(e)},
                )

    # 清理过期订阅
    for ep in expired_endpoints:
        unsubscribe(user_id, ep)

    return success_count

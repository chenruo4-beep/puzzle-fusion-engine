"""拼拼看Me - Sentry 错误监控初始化

使用方式：
1. pip install sentry-sdk[fastapi]
2. 在 .env 中设置 SENTRY_DSN
3. main.py 中调用 init_sentry()
"""

import logging
from config import settings

logger = logging.getLogger(__name__)


def init_sentry() -> bool:
    """初始化 Sentry SDK。如果 SENTRY_DSN 为空则跳过。

    Returns:
        True 表示初始化成功，False 表示跳过
    """
    if not settings.SENTRY_DSN:
        logger.info("Sentry DSN 未配置，错误监控已跳过")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.SENTRY_ENVIRONMENT or "development",
            # 性能监控采样率
            traces_sample_rate=0.1,
            # 性能分析采样率
            profiles_sample_rate=0.1,
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
            ],
            # 发送前过滤敏感信息
            before_send=strip_sensitive_data,
            # 忽略特定异常
            ignore_errors=[
                # FastAPI 的 HTTPException 不需要上报
                "fastapi.HTTPException",
                "starlette.exceptions.HTTPException",
            ],
        )
        logger.info(
            "Sentry 已初始化",
            extra={"sentry_dsn": settings.SENTRY_DSN[:24] + "..."},
        )
        return True
    except ImportError:
        logger.warning(
            "sentry-sdk 未安装，错误监控未启用。"
            "请执行: pip install 'sentry-sdk[fastapi]'"
        )
        return False


def strip_sensitive_data(event: dict, hint: dict) -> dict | None:
    """在发送到 Sentry 前脱敏：移除 JWT token、密码等"""
    # 过滤请求头中的 Authorization
    if event.get("request", {}).get("headers"):
        headers = event["request"]["headers"]
        event["request"]["headers"] = [
            (k, "***" if k.lower() in ("authorization", "cookie") else v)
            for k, v in headers
        ]

    # 过滤请求体中的密码字段
    if event.get("request", {}).get("data"):
        data = event["request"]["data"]
        if isinstance(data, dict):
            for key in ("password", "hashed_password", "secret_key", "token"):
                if key in data:
                    data[key] = "***"

    return event

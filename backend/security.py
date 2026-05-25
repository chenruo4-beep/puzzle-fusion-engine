"""拼拼看Me - 安全中间件模块

包含：
- Rate Limiting（基于 slowapi）
- 安全响应头（Helmet-like）
- 请求大小限制
"""

import os
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# ---------- Rate Limiting ----------

_rate_limiter = None


def setup_rate_limiting(app: FastAPI) -> None:
    """初始化请求限流。依赖 slowapi，如果未安装则静默跳过。"""
    global _rate_limiter
    try:
        from slowapi import Limiter
        from slowapi.util import get_remote_address
        from slowapi.errors import RateLimitExceeded
        from slowapi.middleware import SlowAPIMiddleware

        _rate_limiter = Limiter(
            key_func=get_remote_address,
            default_limits=["200/minute", "20/second"],
            storage_uri="memory://",  # 生产环境建议换成 Redis
        )

        app.state.limiter = _rate_limiter

        @app.exception_handler(RateLimitExceeded)
        async def rate_limit_exceeded(request: Request, exc: RateLimitExceeded):
            return Response(
                content='{"detail":"请求过于频繁，请稍后再试"}',
                status_code=429,
                media_type="application/json",
            )

        app.add_middleware(SlowAPIMiddleware)

    except ImportError:
        # slowapi 未安装，跳过限流（开发环境可接受）
        import logging
        logging.getLogger(__name__).warning(
            "slowapi 未安装，请求限流未启用。生产环境请执行: pip install slowapi"
        )


# ---------- 安全响应头 ----------


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """添加安全相关的 HTTP 响应头"""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # 不设 HSTS，除非你确定全站 HTTPS
        return response


# ---------- 请求大小限制 ----------


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """限制请求体大小，防止大文件攻击"""

    MAX_BODY_BYTES = 10 * 1024 * 1024  # 10MB

    async def dispatch(self, request: Request, call_next):
        if request.method in ("POST", "PUT", "PATCH"):
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > self.MAX_BODY_BYTES:
                return Response(
                    content='{"detail":"请求体过大，最大10MB"}',
                    status_code=413,
                    media_type="application/json",
                )
        return await call_next(request)

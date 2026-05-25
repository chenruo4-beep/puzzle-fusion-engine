"""拼拼看Me - 配置管理模块"""

import os
import secrets
import warnings
from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置，支持从 .env 文件加载"""

    # 数据库连接
    DATABASE_URL: str = "sqlite:///./puzzle_fusion.db"

    # JWT 密钥 —— 生产环境必须通过环境变量设置
    # 启动时如果仍是默认值会发出警告
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    # 环境标识：development / staging / production
    ENVIRONMENT: str = "development"

    # ---------- 向量数据库 ----------
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "puzzle_fragments"

    # ---------- Embedding ----------
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536  # text-embedding-3-small 维度

    # ---------- AI 服务 ----------
    AI_API_KEY: str = ""
    AI_API_BASE: str = "https://api.openai.com"

    # 前端地址（用于生成重置密码链接等）
    FRONTEND_URL: str = "http://localhost:3000"

    # ---------- 日志 ----------
    LOG_LEVEL: str = "INFO"

    # ---------- Sentry（可选，置空则不启用）----------
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "development"

    # ---------- 安全 ----------
    # 是否允许 X-User-Id header 旁路认证（仅开发环境）
    ALLOW_USER_ID_HEADER: bool = True
    # Rate limiting 存储后端（memory:// 或 redis://localhost:6379）
    RATE_LIMIT_STORAGE: str = "memory://"
    # 默认限流策略
    RATE_LIMIT_DEFAULT: str = "200/minute"
    # 请求体最大字节数
    MAX_REQUEST_BODY_BYTES: int = 10 * 1024 * 1024  # 10MB

    # ---------- SMTP 邮件 ----------
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@puzzlefusion.app"

    # ---------- Stripe 支付 ----------
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_MONTHLY: str = "price_monthly"
    STRIPE_PRICE_YEARLY: str = "price_yearly"

    # ---------- Web Push ----------
    VAPID_PRIVATE_KEY_PATH: str = "keys/vapid_private.pem"
    VAPID_PUBLIC_KEY_PATH: str = "keys/vapid_public.pem"
    VAPID_SUBJECT: str = "mailto:admin@puzzlefusion.me"
    PUSH_ENABLED: bool = True

    model_config = ConfigDict(env_file=".env")

    def check_security(self) -> None:
        """启动时安全检查，发现不安全配置时发出警告或拒绝启动"""
        if self.SECRET_KEY == "dev-secret-key-change-in-production":
            if self.ENVIRONMENT == "production":
                raise RuntimeError(
                    "❌ 生产环境必须设置 SECRET_KEY 环境变量！"
                    "请执行: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
                )
            else:
                warnings.warn(
                    "⚠️ SECRET_KEY 使用默认值，请勿在生产环境运行！",
                    stacklevel=2,
                )

        if self.ENVIRONMENT == "production" and self.ALLOW_USER_ID_HEADER:
            warnings.warn(
                "⚠️ 生产环境不应启用 ALLOW_USER_ID_HEADER，"
                "请在 .env 中设置 ALLOW_USER_ID_HEADER=false",
                stacklevel=2,
            )


def generate_secret_key() -> str:
    """生成一个安全的随机密钥，用于首次部署"""
    return secrets.token_urlsafe(32)


settings = Settings()

"""
AI 服务配置 — pydantic-settings
"""

from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class AISettings(BaseSettings):
    """AI 引擎配置，支持从 .env 加载"""

    # 主提供者: builtin | openai | deepseek | qclaw
    AI_PRIMARY_PROVIDER: str = "builtin"

    # 外部 AI 配置（可选，不配则只用内置引擎）
    AI_API_KEY: str = ""
    AI_API_BASE: str = ""
    AI_MODEL: str = "deepseek-chat"

    # 缓存
    AI_CACHE_TTL_SECONDS: int = 86400  # 24 小时
    AI_CACHE_MAX_ENTRIES: int = 1000

    # 兜底
    AI_MAX_RETRIES: int = 3
    AI_TIMEOUT_SECONDS: int = 30

    # 模板冷却
    AI_TEMPLATE_COOLDOWN: int = 3  # 同一用户 N 次融合内不重复

    model_config = ConfigDict(env_file=".env", env_prefix="AI_", extra="ignore")


ai_settings = AISettings()

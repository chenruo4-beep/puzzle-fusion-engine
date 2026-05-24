"""拼拼看Me - 配置管理模块"""

from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置，支持从 .env 文件加载"""

    # 数据库连接
    DATABASE_URL: str = "sqlite:///./puzzle_fusion.db"

    # JWT 密钥
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    # 向量数据库
    QDRANT_URL: str = "http://localhost:6333"

    # AI 服务（已移除外部 AI 依赖，使用内置引擎）

    model_config = ConfigDict(env_file=".env")


settings = Settings()
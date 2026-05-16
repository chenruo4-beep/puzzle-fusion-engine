"""拼图融合引擎 - 配置管理模块"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置，支持从 .env 文件加载"""

    # 数据库连接
    DATABASE_URL: str = "sqlite:///./puzzle_fusion.db"

    # JWT 密钥
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    # 向量数据库
    QDRANT_URL: str = "http://localhost:6333"

    # AI 服务
    AI_API_KEY: str = ""
    AI_API_BASE: str = "https://api.openai.com/v1"
    AI_MODEL: str = "gpt-4o"

    class Config:
        env_file = ".env"


settings = Settings()
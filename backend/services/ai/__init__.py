"""
AI 服务包 — 内置模板融合引擎 + 外部 AI 提供者抽象

架构：
  builtin/  — 纯规则引擎（永远可用，零延迟）
  external/ — OpenAI-compatible 提供者（可选，有兜底）
  templates/ — 方向原型、金句、洞察等模板
  prompts/   — 外部 AI 的 Prompt 模板（A/B/C）
"""

from services.ai.base import AIProvider
from services.ai.config import ai_settings
from services.ai.builtin.engine import BuiltinProvider


def get_provider(name: str = "") -> AIProvider:
    """工厂函数：根据配置或名称返回 AI 提供者实例"""
    name = name or ai_settings.AI_PRIMARY_PROVIDER
    if name == "builtin":
        return BuiltinProvider()
    elif name in ("openai", "deepseek", "qclaw", "external"):
        from services.ai.external.ai_provider import ExternalProvider
        return ExternalProvider()
    raise ValueError(f"Unknown AI provider: {name}")

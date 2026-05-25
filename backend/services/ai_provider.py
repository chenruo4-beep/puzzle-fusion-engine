"""
AI Provider 服务 — 支持多 AI 提供商切换

支持的 Provider:
- openai: OpenAI GPT 系列
- deepseek: DeepSeek
- qwen: 通义千问
- zhipu: 智谱 AI
- custom: 自定义 OpenAI-compatible API

所有 Provider 都走 OpenAI-compatible 接口格式，
只是 API base 和 model name 不同。
"""

from dataclasses import dataclass, field
from typing import Optional
import httpx
from config import settings
from logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class AIProvider:
    """AI 提供商配置"""
    id: str
    name: str
    api_base: str
    model: str
    max_tokens: int = 4096
    temperature: float = 0.7
    supports_streaming: bool = True


# 预定义 Provider 列表
BUILTIN_PROVIDERS: dict[str, AIProvider] = {
    "deepseek": AIProvider(
        id="deepseek",
        name="DeepSeek",
        api_base="https://api.deepseek.com",
        model="deepseek-chat",
        max_tokens=8192,
        temperature=0.7,
    ),
    "qwen": AIProvider(
        id="qwen",
        name="通义千问",
        api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
        model="qwen-plus",
        max_tokens=8192,
        temperature=0.7,
    ),
    "zhipu": AIProvider(
        id="zhipu",
        name="智谱AI",
        api_base="https://open.bigmodel.cn/api/paas/v4",
        model="glm-4-flash",
        max_tokens=4096,
        temperature=0.7,
    ),
    "openai": AIProvider(
        id="openai",
        name="OpenAI",
        api_base="https://api.openai.com",
        model="gpt-4o-mini",
        max_tokens=4096,
        temperature=0.7,
    ),
}

# 用户自定义 Provider 存储（生产环境应改用数据库）
_custom_providers: dict[str, AIProvider] = {}

# 用户当前选择的 Provider（生产环境应改用数据库）
_user_provider_map: dict[int, str] = {}


def get_available_providers() -> list[dict]:
    """获取所有可用的 AI Provider 列表"""
    result = []
    for p in BUILTIN_PROVIDERS.values():
        result.append({
            "id": p.id,
            "name": p.name,
            "model": p.model,
            "max_tokens": p.max_tokens,
            "builtin": True,
        })
    for p in _custom_providers.values():
        result.append({
            "id": p.id,
            "name": p.name,
            "model": p.model,
            "max_tokens": p.max_tokens,
            "builtin": False,
        })
    return result


def get_user_provider(user_id: int) -> AIProvider:
    """获取用户当前选择的 Provider"""
    provider_id = _user_provider_map.get(user_id, "deepseek")
    # 优先从自定义找
    if provider_id in _custom_providers:
        return _custom_providers[provider_id]
    # 再从内置找
    if provider_id in BUILTIN_PROVIDERS:
        return BUILTIN_PROVIDERS[provider_id]
    # 兜底
    return BUILTIN_PROVIDERS["deepseek"]


def set_user_provider(user_id: int, provider_id: str) -> bool:
    """设置用户的 AI Provider"""
    if provider_id not in BUILTIN_PROVIDERS and provider_id not in _custom_providers:
        return False
    _user_provider_map[user_id] = provider_id
    logger.info(
        f"用户 {user_id} 切换 AI Provider 为 {provider_id}",
        extra={"user_id": user_id, "provider_id": provider_id},
    )
    return True


def add_custom_provider(provider: AIProvider) -> None:
    """添加自定义 Provider"""
    _custom_providers[provider.id] = provider
    logger.info(f"添加自定义 AI Provider: {provider.id} ({provider.name})")


def remove_custom_provider(provider_id: str) -> bool:
    """删除自定义 Provider"""
    if provider_id in _custom_providers:
        del _custom_providers[provider_id]
        # 如果有用户正在用这个，切换回 deepseek
        for uid, pid in _user_provider_map.items():
            if pid == provider_id:
                _user_provider_map[uid] = "deepseek"
        return True
    return False


async def chat_completion(
    user_id: int,
    messages: list[dict],
    *,
    max_tokens: Optional[int] = None,
    temperature: Optional[float] = None,
    stream: bool = False,
) -> dict | None:
    """
    调用 AI Provider 的 Chat Completion API

    Args:
        user_id: 用户 ID（用于确定用哪个 Provider）
        messages: OpenAI 格式的消息列表
        max_tokens: 覆盖默认 max_tokens
        temperature: 覆盖默认 temperature
        stream: 是否流式输出

    Returns:
        OpenAI 格式的响应字典，失败返回 None
    """
    provider = get_user_provider(user_id)
    api_key = settings.AI_API_KEY

    if not api_key:
        logger.warning("AI_API_KEY 未配置，无法调用 AI 服务")
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": provider.model,
        "messages": messages,
        "max_tokens": max_tokens or provider.max_tokens,
        "temperature": temperature or provider.temperature,
        "stream": stream,
    }

    url = f"{provider.api_base.rstrip('/')}/v1/chat/completions"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        logger.error(
            f"AI API 调用失败: {e.response.status_code} - {e.response.text[:200]}",
            extra={"provider": provider.id, "status": e.response.status_code},
        )
        return None
    except httpx.RequestError as e:
        logger.error(f"AI API 网络错误: {e}", extra={"provider": provider.id})
        return None

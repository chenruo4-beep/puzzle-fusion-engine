"""嵌入服务 — 文本转向量，支持 OpenAI-compatible API"""

import logging
from typing import Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from config import settings

logger = logging.getLogger(__name__)


class EmbeddingError(Exception):
    """嵌入调用失败"""
    pass


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
)
async def _call_embedding_api(texts: list[str]) -> list[list[float]]:
    """调用外部嵌入 API，返回向量列表"""
    if not settings.AI_API_KEY:
        raise EmbeddingError(
            "未配置 AI_API_KEY，无法使用外部嵌入服务。"
            "请在 .env 中设置 AI_API_KEY（支持 OpenAI / DeepSeek 等兼容 API）"
        )

    headers = {
        "Authorization": f"Bearer {settings.AI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "input": texts,
        "model": settings.EMBEDDING_MODEL,
    }
    if settings.EMBEDDING_MODEL == "text-embedding-3-small":
        payload["dimensions"] = settings.EMBEDDING_DIMENSIONS

    url = f"{settings.AI_API_BASE.rstrip('/')}/v1/embeddings"

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            raise EmbeddingError(
                f"嵌入 API 返回异常 (HTTP {resp.status_code}): {resp.text[:200]}"
            )
        data = resp.json()
        # 按输入顺序取出向量
        data["data"].sort(key=lambda x: x["index"])
        return [item["embedding"] for item in data["data"]]


async def get_embedding(text: str) -> list[float]:
    """将单段文本转为向量"""
    results = await _call_embedding_api([text])
    return results[0]


async def get_embeddings(texts: list[str]) -> list[list[float]]:
    """批量将多段文本转为向量，按输入顺序返回"""
    return await _call_embedding_api(texts)

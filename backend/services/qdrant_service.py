"""
Qdrant 向量检索服务

提供完整的向量索引生命周期管理：集合初始化、批量写入、相似度搜索、向量删除、健康检查。
"""

import logging
from typing import Any, Optional

from config import settings

logger = logging.getLogger(__name__)


class QdrantService:
    """Qdrant 向量数据库封装，惰性初始化"""

    def __init__(self):
        self._client: Optional[Any] = None  # qdrant_client.QdrantClient
        self._available = False

    # ── 客户端管理 ────────────────────────────────────────────

    def _get_client(self):
        """获取（或初始化）Qdrant HTTP 客户端"""
        if self._client is not None:
            return self._client

        try:
            from qdrant_client import QdrantClient
        except ImportError:
            logger.warning("qdrant-client 未安装，请执行 pip install qdrant-client")
            self._available = False
            return None

        kwargs: dict = {"url": settings.QDRANT_URL}
        if settings.QDRANT_API_KEY:
            kwargs["api_key"] = settings.QDRANT_API_KEY
        try:
            self._client = QdrantClient(**kwargs, timeout=10)
            self._available = True
        except Exception as e:
            logger.error("Qdrant 客户端初始化失败: %s", e)
            self._available = False
            return None

        return self._client

    # ── 集合管理 ──────────────────────────────────────────────

    async def ensure_collection(self) -> bool:
        """自动创建集合（若不存在），返回是否就绪"""
        client = self._get_client()
        if not client:
            return False

        collection = settings.QDRANT_COLLECTION
        vector_size = settings.EMBEDDING_DIMENSIONS

        try:
            collections = client.get_collections().collections
            exists = any(c.name == collection for c in collections)
            if not exists:
                from qdrant_client.http import models as qmodels

                client.create_collection(
                    collection_name=collection,
                    vectors_config=qmodels.VectorParams(
                        size=vector_size,
                        distance=qmodels.Distance.COSINE,
                    ),
                )
                logger.info("已创建 Qdrant 集合: %s (size=%d)", collection, vector_size)
            self._available = True
            return True
        except Exception as e:
            logger.error("Qdrant ensure_collection 失败: %s", e)
            self._available = False
            return False

    # ── 写入 ──────────────────────────────────────────────────

    async def upsert_vectors(
        self,
        fragments: list[dict],
    ) -> int:
        """
        批量写入向量。

        fragments 每项格式::

            {
                "id": int,              # 碎片 ID（必填）
                "vector": list[float],  # 嵌入向量（必填）
                "metadata": {           # 附加元数据（可选）
                    "fragment_type": str,
                    "content": str,
                    "user_id": int,
                }
            }

        返回成功写入的条数。
        """
        client = self._get_client()
        if not client:
            return 0

        from qdrant_client.http import models as qmodels

        points = [
            qmodels.PointStruct(
                id=frag["id"],
                vector=frag["vector"],
                payload=frag.get("metadata") or {},
            )
            for frag in fragments
        ]

        try:
            result = client.upsert(
                collection_name=settings.QDRANT_COLLECTION,
                points=points,
                wait=True,
            )
            count = len(points)
            if result.status == "completed":
                logger.info("Qdrant 写入成功: %d 条", count)
            else:
                logger.warning("Qdrant 写入状态: %s", result.status)
            return count
        except Exception as e:
            logger.error("Qdrant upsert_vectors 失败: %s", e)
            raise

    # ── 搜索 ──────────────────────────────────────────────────

    async def search_similar(
        self,
        query_vector: list[float],
        limit: int = 10,
        min_score: float = 0.5,
    ) -> list[dict]:
        """
        搜索最相似的向量。

        返回按分数降序排列的结果::

            [
                {
                    "id": int,
                    "score": float,
                    "fragment_type": str,
                    "content": str,
                    "user_id": int,
                },
                ...
            ]
        """
        client = self._get_client()
        if not client or not self._available:
            return []

        from qdrant_client.http import models as qmodels

        try:
            hits = client.search(
                collection_name=settings.QDRANT_COLLECTION,
                query_vector=query_vector,
                limit=limit,
                score_threshold=min_score,
            )
            results = []
            for hit in hits:
                payload = hit.payload or {}
                results.append({
                    "id": hit.id,
                    "score": round(float(hit.score), 4),
                    "fragment_type": payload.get("fragment_type", ""),
                    "content": payload.get("content", ""),
                    "user_id": payload.get("user_id", 0),
                })
            return results
        except Exception as e:
            logger.error("Qdrant search_similar 失败: %s", e)
            return []

    # ── 删除 ──────────────────────────────────────────────────

    async def delete_vectors(self, fragment_ids: list[int]) -> int:
        """
        按碎片 ID 批量删除向量。

        返回 Qdrant 响应的 status。
        """
        client = self._get_client()
        if not client:
            return 0

        from qdrant_client.http import models as qmodels

        try:
            result = client.delete(
                collection_name=settings.QDRANT_COLLECTION,
                points_selector=qmodels.PointIdsList(
                    points=fragment_ids,
                ),
                wait=True,
            )
            logger.info("Qdrant 删除完成: %d 条", len(fragment_ids))
            return 1 if result.status == "completed" else 0
        except Exception as e:
            logger.error("Qdrant delete_vectors 失败: %s", e)
            raise

    # ── 健康检查 ──────────────────────────────────────────────

    async def health_check(self) -> bool:
        """检测 Qdrant 是否可连通"""
        client = self._get_client()
        if not client:
            return False
        try:
            client.get_collections()
            return True
        except Exception:
            return False


# 全局单例
qdrant_service = QdrantService()

"""
向量存储 — 碎片相似度检索层

内置后端：基于 n-gram 频率向量的 SQLite 索引，免基础设施。
Qdrant 后端：当 QDRANT_URL 可用时自动切换（部署阶段启用）。

所有上层代码通过 search_similar / find_connections 调用，
不关心底层用的是哪种索引。
"""

import json
import re
from collections import Counter
from typing import Optional
from threading import Lock

from config import settings


# ============================================================
# 内置向量引擎：字符 bigram 频率向量 + cosine 相似度
# ============================================================

class _BuiltinVectorIndex:
    """内存中的向量索引，碎片少时比 Qdrant 更快"""

    def __init__(self):
        self._lock = Lock()
        self._vectors: dict[int, Counter] = {}  # fragment_id → bigram Counter
        self._metas: dict[int, dict] = {}       # fragment_id → {type, content, user_id}

    # ---- 索引维护 ----

    def upsert(self, fragment_id: int, fragment_type: str, content: str, user_id: int = 0):
        """插入或更新碎片的向量索引"""
        vec = self._text_to_vector(content)
        with self._lock:
            self._vectors[fragment_id] = vec
            self._metas[fragment_id] = {
                "type": fragment_type,
                "content": content[:40],
                "user_id": user_id,
            }

    def remove(self, fragment_id: int):
        """删除碎片向量"""
        with self._lock:
            self._vectors.pop(fragment_id, None)
            self._metas.pop(fragment_id, None)

    def clear_user(self, user_id: int):
        """清除某个用户的所有索引（重建用）"""
        with self._lock:
            to_remove = [
                fid for fid, m in self._metas.items()
                if m.get("user_id") == user_id
            ]
            for fid in to_remove:
                self._vectors.pop(fid, None)
                self._metas.pop(fid, None)
            return len(to_remove)

    # ---- 检索 ----

    def search_similar(
        self,
        target_content: str,
        limit: int = 5,
        exclude_ids: Optional[set[int]] = None,
        same_type_boost: float = 1.3,
        min_score: float = 0.08,
    ) -> list[dict]:
        """搜索与目标内容最相似的碎片"""
        target_vec = self._text_to_vector(target_content)
        exclude = exclude_ids or set()
        scored: list[tuple[float, int]] = []

        with self._lock:
            for fid, vec in self._vectors.items():
                if fid in exclude:
                    continue
                score = self._cosine(target_vec, vec)
                if score >= min_score:
                    scored.append((score, fid))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        with self._lock:
            for score, fid in scored[:limit]:
                meta = self._metas.get(fid, {})
                results.append({
                    "id": fid,
                    "fragment_type": meta.get("type", ""),
                    "content": meta.get("content", ""),
                    "score": round(float(score), 4),
                })
        return results

    def find_cross_type_connections(
        self,
        fragments: list[dict],
        limit: int = 3,
        threshold: float = 0.10,
    ) -> list[dict]:
        """跨类型关联发现 — 基于向量相似度"""
        connections = []
        for i, a in enumerate(fragments):
            for j, b in enumerate(fragments):
                if j <= i:
                    continue
                ta = a.get("type", "")
                tb = b.get("type", "")
                if ta == tb:
                    continue
                ca = a.get("content", "")
                cb = b.get("content", "")
                vec_a = self._text_to_vector(ca)
                vec_b = self._text_to_vector(cb)
                score = self._cosine(vec_a, vec_b)
                if score >= threshold:
                    connections.append({
                        "fragment_a": ca[:30],
                        "fragment_b": cb[:30],
                        "similarity": round(score, 3),
                        "connection": self._describe(ta, tb, ca, cb),
                    })
        connections.sort(key=lambda x: x["similarity"], reverse=True)
        return connections[:limit]

    # ---- 内部 ----

    @staticmethod
    def _text_to_vector(text: str) -> Counter:
        """将中文短文本转为字符 bigram 频率向量"""
        chars = re.sub(r"\s+", "", text)
        if len(chars) < 2:
            return Counter({chars: 1})
        bigrams = [chars[i:i+2] for i in range(len(chars)-1)]
        return Counter(bigrams)

    @staticmethod
    def _cosine(vec_a: Counter, vec_b: Counter) -> float:
        """cosine 相似度"""
        if not vec_a or not vec_b:
            return 0.0
        intersection = set(vec_a.keys()) & set(vec_b.keys())
        dot = sum(vec_a[k] * vec_b[k] for k in intersection)
        norm_a = sum(v ** 2 for v in vec_a.values()) ** 0.5
        norm_b = sum(v ** 2 for v in vec_b.values()) ** 0.5
        if not norm_a or not norm_b:
            return 0.0
        return dot / (norm_a * norm_b)

    @staticmethod
    def _describe(type_a: str, type_b: str, content_a: str, content_b: str) -> str:
        """跨维度关联描述"""
        return (
            f"「{content_a[:10]}」让你有根基，"
            f"「{content_b[:10]}」让你有方向——"
            f"两者结合，你的思路会更立体。"
        )


# ============================================================
# Qdrant 后端（占位 — 部署时启用）
# ============================================================

class _QdrantStore:
    """Qdrant 向量检索后端（待部署）"""

    def __init__(self):
        self._available = False
        self._collection_name = "fragments"

    async def ensure_collection(self):
        try:
            from qdrant_client import QdrantClient
            client = QdrantClient(url=settings.QDRANT_URL)
            # 检查集合是否存在
            collections = client.get_collections().collections
            exists = any(c.name == self._collection_name for c in collections)
            if not exists:
                client.create_collection(
                    collection_name=self._collection_name,
                    vectors_config={"size": 128, "distance": "Cosine"},
                )
            self._available = True
        except Exception:
            self._available = False

    @property
    def available(self) -> bool:
        return self._available

    def search_similar(self, content: str, limit: int = 5) -> list[dict]:
        if not self._available:
            return []
        return []  # 部署后实现


# ============================================================
# 统一入口
# ============================================================

# 全局内置索引
_builtin = _BuiltinVectorIndex()
# Qdrant 客户端（惰性初始化）
_qdrant: Optional[_QdrantStore] = None


def _get_qdrant() -> Optional[_QdrantStore]:
    global _qdrant
    if _qdrant is None and settings.QDRANT_URL != "http://localhost:6333":
        _qdrant = _QdrantStore()
    return _qdrant if _qdrant and _qdrant.available else None


# ---- 公开 API ----

def upsert_vector(fragment_id: int, fragment_type: str, content: str, user_id: int = 0):
    """碎片创建/更新时同步写入向量索引"""
    _builtin.upsert(fragment_id, fragment_type, content, user_id)


def remove_vector(fragment_id: int):
    """碎片删除时清理向量索引"""
    _builtin.remove(fragment_id)


def search_similar(
    content: str,
    limit: int = 5,
    exclude_ids: Optional[set[int]] = None,
    min_score: float = 0.08,
) -> list[dict]:
    """
    相似碎片搜索。

    当前使用内置向量索引（零基础设施），
    部署 Qdrant 后会自动切换。
    """
    qd = _get_qdrant()
    if qd:
        return qd.search_similar(content, limit)
    return _builtin.search_similar(content, limit, exclude_ids=exclude_ids, min_score=min_score)


def find_cross_type_connections(
    fragments: list[dict],
    limit: int = 3,
    threshold: float = 0.10,
) -> list[dict]:
    """跨类型关联发现"""
    return _builtin.find_cross_type_connections(fragments, limit, threshold)

"""
内容相似度计算 — 委托给 vector_store（向量索引），
保留 jaccard_similarity 为兼容层供 fragment.py 等调用。
"""

from services.ai.vector_store import search_similar, find_cross_type_connections as _vs_connections
from services.ai.vector_store import _BuiltinVectorIndex


# ---------- 兼容层（保留供 fragment.py 等使用）----------

def bigrams(text: str) -> set[str]:
    """提取文本的字符级 bigram 集合（兼容保留）"""
    chars = text.replace(" ", "")
    if len(chars) < 2:
        return {chars}
    return {chars[i:i + 2] for i in range(len(chars) - 1)}


def jaccard_similarity(a: str, b: str) -> float:
    """Jaccard 相似度（兼容保留，供 fragment.py 使用）"""
    set_a = bigrams(a)
    set_b = bigrams(b)
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union) if union else 0.0


def _keyword_overlap(a: str, b: str) -> float:
    """关键词重叠度（兼容保留）"""
    def extract_keywords(text: str) -> set[str]:
        words = set()
        chars = text.replace(" ", "")
        for i in range(len(chars)):
            if i + 2 <= len(chars):
                words.add(chars[i:i + 2])
            if i + 3 <= len(chars):
                words.add(chars[i:i + 3])
        return words
    set_a = extract_keywords(a)
    set_b = extract_keywords(b)
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union) if union else 0.0


# ---------- 核心入口 — 委托给 vector_store ----------

def find_cross_type_connections(fragments: list[dict], threshold: float = 0.12) -> list[dict]:
    """
    跨类型关联发现。
    委托给 vector_store（向量索引），阈值自动映射。
    """
    return _vs_connections(fragments, limit=3, threshold=threshold)


def compute_type_diversity(fragments: list[dict]) -> dict:
    """计算碎片类型多样性指标"""
    from collections import Counter
    type_counts = Counter(f.get("type", "未知") for f in fragments)
    total = len(fragments)
    if total == 0:
        return {"types": {}, "diversity_score": 0, "is_balanced": False, "warning": "暂无碎片"}

    # 简单多样性：不同类型的数量 / 总碎片数
    unique_types = len(type_counts)
    diversity_score = min(1.0, unique_types / 5)  # 5种类型=满分1.0

    # 判断是否某类型过度集中
    max_ratio = max(type_counts.values()) / total if total > 0 else 0
    is_balanced = max_ratio < 0.5 and unique_types >= 2

    warning = ""
    if max_ratio > 0.6:
        dominant = type_counts.most_common(1)[0][0]
        warning = f"⚠️ {dominant}偏多，试试记录一些其他维度的碎片"
    elif unique_types < 2:
        warning = "碎片类型太单一，试试添加不同维度的碎片"

    return {
        "types": dict(type_counts),
        "diversity_score": round(diversity_score, 2),
        "is_balanced": is_balanced,
        "warning": warning,
    }

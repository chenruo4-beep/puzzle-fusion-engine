"""
内置灵感碰撞 — 基于碎片类型组合模板
"""

from services.ai.templates.spark_combo_templates import get_spark_for_pair


def builtin_spark(fragments: list[dict]) -> dict:
    """内置灵感碰撞——基于碎片类型组合模板"""
    if len(fragments) < 2:
        return {
            "title": "再加一块",
            "spark": "至少需要两块碎片才能碰撞出火花。再拖一块过来试试。",
            "action": "从碎片列表里再选一块拖过来",
        }

    f0 = fragments[0]
    f1 = fragments[1]
    t0 = f0.get("type", "技能")
    t1 = f1.get("type", "技能")
    c0 = f0.get("content", "")
    c1 = f1.get("content", "")

    return get_spark_for_pair(t0, t1, c0, c1)

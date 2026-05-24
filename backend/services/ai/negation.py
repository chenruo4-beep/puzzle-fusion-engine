"""
中文否定词处理 — 识别 15 种常见否定模式，避免"不会编程"被识别为编程技能
"""

# 否定模式列表：(模式, 否定强度)
# 强度: full=完全否定, partial=部分否定/降低权重
NEGATION_PATTERNS: list[tuple[str, str]] = [
    # 完全否定
    ("不太会", "full"),
    ("不会", "full"),
    ("不擅长", "full"),
    ("不懂", "full"),
    ("不怎么会", "full"),
    ("不算", "full"),
    ("没有", "full"),
    ("没做过", "full"),
    ("从来没", "full"),
    ("完全不会", "full"),
    ("一点都不会", "full"),
    ("学不会", "full"),
    # 部分否定
    ("不太", "partial"),
    ("不够", "partial"),
    ("有一点了解但不够深", "partial"),
    ("稍微会一点", "partial"),
    ("知道一点但不精通", "partial"),
    ("会一点但不专业", "partial"),
]


def check_negation(text: str, keyword: str) -> tuple[bool, str]:
    """
    检查文本中某个关键词是否被否定。

    Args:
        text: 原始文本
        keyword: 要检查的关键词

    Returns:
        (is_negated: bool, negation_type: str)
        negation_type: 'none' | 'full' | 'partial'
    """
    pos = text.find(keyword)
    if pos == -1:
        return False, "none"

    # 检查关键词前 15 个字符范围内是否有否定模式
    prefix = text[max(0, pos - 15):pos]
    for pattern, strength in NEGATION_PATTERNS:
        if pattern in prefix:
            return True, strength

    return False, "none"


def filter_negated_matches(text: str, matches: list[str]) -> list[str]:
    """
    从匹配列表中过滤掉被否定的关键词。

    Args:
        text: 原始文本
        matches: 匹配到的关键词列表

    Returns:
        未被否定的关键词列表
    """
    result = []
    for kw in matches:
        is_negated, _ = check_negation(text, kw)
        if not is_negated:
            result.append(kw)
    return result


def adjust_score_for_negation(text: str, base_score: float) -> float:
    """
    根据否定模式调整分数。部分否定降低权重，完全否定归零。

    Args:
        text: 原始文本
        base_score: 基础分数

    Returns:
        调整后的分数
    """
    for pattern, strength in NEGATION_PATTERNS:
        if pattern in text:
            if strength == "full":
                return 0.0
            elif strength == "partial":
                return base_score * 0.4
    return base_score

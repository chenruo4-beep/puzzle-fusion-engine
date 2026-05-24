"""
内置碎片评分器 — 基于具体性、可操作性、独特性三维度
"""


def builtin_score(fragment_type: str, content: str) -> int:
    """内置评分：基于具体性、可操作性、独特性"""
    score = 3
    text = content.strip()

    # 具体性加分
    if len(text) >= 15:
        score += 1

    # 可操作性加分：包含动作信号
    action_signals = ['会', '能做', '擅长', '每天', '坚持', '做过', '完成', '开发', '写', '拍', '修', '做', '教']
    if any(signal in text for signal in action_signals):
        score += 1

    # 独特性扣分：太泛泛的描述
    vague_signals = ['有责任心', '认真', '努力', '上进', '好学', '勤奋']
    if any(vague in text for vague in vague_signals):
        score -= 1

    # 太短扣分
    if len(text) < 6:
        score -= 1

    return max(1, min(5, score))

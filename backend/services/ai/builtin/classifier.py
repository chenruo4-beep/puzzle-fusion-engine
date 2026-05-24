"""
内置文本分类器 — 启发式分类（碎片 vs 日记）
Engine 0.4: 否定词感知 + 类型消歧 + 可信度评分
"""

from services.ai.negation import check_negation
from services.ai.templates.tag_system import TAG_DEFINITIONS


def builtin_classify(content: str) -> dict:
    """启发式分类：判断输入是碎片还是日记"""
    text = content.strip()

    # 日记特征
    journal_kw = ['今天', '昨天', '最近', '感觉', '觉得', '因为', '所以', '然后',
                  '早晨', '晚上', '上午', '下午', '刚才', '刚刚', '周末']

    is_journal_like = len(text) >= 50 or any(kw in text for kw in journal_kw)

    if is_journal_like:
        return {"category": "journal", "reason": "检测到日常记录特征，已归入日记"}
    else:
        fragment_type = _guess_fragment_type(text)
        # Engine 0.4: 否定词感知的能力标签
        capability_tags = _negation_aware_tags(text, limit=2)
        quality = _estimate_quality(text)
        valid = _is_valid(text, quality)
        return {
            "category": "fragment",
            "fragment_type": fragment_type,
            "quality_score": quality["score"],
            "is_valid": valid,
            "capability_tags": capability_tags,
            "reason": f"检测到碎片特征，归类为{fragment_type}，能力标签：{'、'.join(capability_tags) if capability_tags else '暂无'}",
        }


def _guess_fragment_type(text: str) -> str:
    """Engine 0.4: 各类型打分，取最高分（消歧）"""
    type_kw = {
        '技能': ['会', '能做', '擅长', '精通', '编程', '设计', '写', '拍', '修', '做', '开发',
                 '翻译', '开车', '做饭', '摄影', '剪辑', '演讲', '教学', '运营'],
        '经历': ['曾经', '做过', '参与', '负责', '公司', '项目', '年经验', '实习', '任职', '从事'],
        '知识': ['知道', '了解', '学过', '研究', '理论', '专业', '原理', '概念'],
        '资源': ['有', '资源', '渠道', '人脉', '认识', '关系', '客户', '粉丝', '群'],
        '兴趣': ['喜欢', '热爱', '爱好', '感兴趣', '沉迷', '享受'],
        '性格': ['性格', '耐心', '细心', '外向', '内向', '坚持', '乐观', '开朗', '负责'],
        '习惯': ['每天', '坚持', '习惯', '日常', '经常', '总是', '定期'],
    }

    scores = {}
    for ftype, keywords in type_kw.items():
        score = 0
        for kw in keywords:
            if kw in text:
                is_negated, nt = check_negation(text, kw)
                if nt == "full":
                    continue
                elif nt == "partial":
                    score += 0.5
                else:
                    score += 1
        if score > 0:
            scores[ftype] = score

    if not scores:
        return '技能'

    return max(scores, key=scores.get)


def _negation_aware_tags(text: str, limit: int = 2) -> list[str]:
    """
    Engine 0.4: 否定词感知的能力标签匹配。
    检查每个 tag 匹配到的关键词是否被否定，被完全否定的关键词不计分。
    """
    scores: dict[str, float] = {}
    for tag, info in TAG_DEFINITIONS.items():
        score = 0.0
        for kw in info["keywords"]:
            if kw in text:
                is_negated, nt = check_negation(text, kw)
                if nt == "full":
                    continue
                kw_score = 1.0 + (len(kw) - 2) * 0.15
                if nt == "partial":
                    kw_score *= 0.4
                score += kw_score
        if score > 0:
            scores[tag] = score

    sorted_tags = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [tag for tag, _ in sorted_tags[:limit]]


def _is_valid(text: str, quality: dict) -> bool:
    """Engine 0.4: 判断碎片是否有效"""
    # 太短或纯否定
    if quality["score"] <= 1:
        return False
    # 无实质内容的语气词
    filler = {'嗯', '哦', '啊', '哈', '哎呀', '对了', '好吧', '就是', '我觉得', '我想说'}
    if text.strip() in filler or len(text.strip()) < 2:
        return False
    return True


def _estimate_quality(text: str) -> dict:
    """Engine 0.4: 可信度评分 + is_valid"""
    score = 3

    # 长度
    if len(text) >= 12:
        score += 1
    elif len(text) < 5:
        score -= 1

    # 含具体动作
    if any(kw in text for kw in ['会', '擅长', '做过', '坚持', '每天', '能', '有']):
        score += 1

    # 含否定 → 降低可信度
    if any(p in text for p in ['不太会', '不会', '不擅长', '不懂', '没做过']):
        score -= 1

    score = max(1, min(5, score))
    is_valid = _is_valid(text, {"score": score})

    return {"score": score, "is_valid": is_valid}

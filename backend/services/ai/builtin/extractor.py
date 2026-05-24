"""
内置碎片提取器 — 基于文本分句和关键词匹配
Engine 0.1: 集成能力标签系统，为每个碎片标注 8 维能力标签
"""

import re

from services.ai.negation import check_negation
from services.ai.templates.tag_system import get_top_tags


# 碎片类型关键词库
KW_TYPE: dict[str, list[str]] = {
    '技能': [
        '会', '能做', '擅长', '精通', '掌握', '编程', '设计', '写', '画', '拍', '修',
        '做', '开发', '翻译', '开车', '做饭', '摄影', '剪辑', '排版', '调试', '维修',
        '弹', '唱', '跳', '演讲', '谈判', '销售', '管理', '教学', '写作', '运营',
    ],
    '经历': [
        '曾经', '做过', '参与', '负责', '项目', '公司', '团队', '年经验', '之前', '以前',
        '实习', '工作过', '任职', '从事', '创业', '管理过', '带领',
    ],
    '知识': [
        '知道', '了解', '学过', '研究', '理论', '原理', '概念', '专业', '法律', '金融',
        '医学', '心理', '历史', '哲学', '科学', '数学', '物理', '化学', '生物', '经济', '政治',
    ],
    '资源': [
        '有', '资源', '渠道', '人脉', '认识', '关系', '客户', '供应商', '库存', '设备',
        '工具', '数据库', '平台', '账号', '粉丝', '群',
    ],
    '兴趣': [
        '喜欢', '热爱', '爱好', '感兴趣', '沉迷', '享受', '乐在', '平时', '周末',
        '业余', '闲', '玩', '运动', '旅行', '读书', '看', '听', '逛', '收集',
    ],
    '性格': [
        '性格', '个性', '特质', '耐心', '细心', '外向', '内向', '坚持', '乐观', '谨慎',
        '果断', '负责', '幽默', '认真', '开朗', '坚韧', '灵活', '稳重',
    ],
    '习惯': [
        '每天', '坚持', '习惯', '日常', '经常', '总是', '定期', '日日', '晨', '早起',
        '记日记', '复盘', '反思', '规划', '整理',
    ],
}


# 日常时间限定词 — 匹配到这些说明是"今天做了啥"而非"我拥有什么能力"
_TIME_BOUND_WORDS = {"今天", "昨天", "刚才", "刚刚", "今晚", "昨晚", "今早", "早上", "下午", "上午", "晚上", "中午", "明天", "前天", "后天", "周末"}

# 弱质量词 — 匹配到这些不能作为主要依据
_WEAK_WORDS = {"不错", "挺好", "还行", "可以", "好", "看了", "听了", "吃了", "去了", "买了"}

# 单字噪声关键词 — 单独匹配不算，需要同类型有第二个词确认
_NOISY_SINGLE_CHAR = {"看", "听", "吃", "去", "买", "玩", "做", "写", "画", "拍", "修", "逛", "有", "读", "弹", "唱", "跳"}


def _is_quality_fragment(sentence: str, scores: dict[str, int], total_score: float) -> bool:
    """
    判断一个句子是否值得提取为碎片。
    过滤：日常流水账、单关键词偶然匹配、纯时间描述。
    """
    # 门槛1：总匹配分必须 ≥ 1.5（至少1个强关键词或2个弱关键词）
    if total_score < 1.5:
        return False

    # 门槛2：必须有至少一条非单字噪声词的关键词匹配
    # 防止"下午看了会书" → "会"+"看"绕过
    all_single_char = True
    for ftype, keyword_list in KW_TYPE.items():
        for kw in keyword_list:
            if kw in sentence and kw not in _NOISY_SINGLE_CHAR and len(kw) >= 2:
                all_single_char = False
                break
        if not all_single_char:
            break
    if all_single_char:
        return False

    # 门槛3：如果句子以时间词开头，需要额外的技能词佐证
    first_word = sentence[:2]
    if first_word in _TIME_BOUND_WORDS:
        strong_kws = {"擅长", "精通", "负责", "做过", "经验", "项目", "能力", "学会"}
        if not any(kw in sentence for kw in strong_kws):
            return False

    # 门槛4：纯弱词组合不提取
    weak_matches = sum(1 for w in _WEAK_WORDS if w in sentence)
    if weak_matches >= 2:
        return False

    # 门槛5：内容最小有效长度
    if len(sentence.strip()) < 6:
        return False

    return True


async def builtin_extract_fragments(text: str) -> list[dict]:
    """内置碎片提取 — 基于文本分句和关键词匹配"""
    sentences = re.split(r'[。，,；;\n]+', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) >= 4]

    if not sentences:
        return []

    fragments: list[dict] = []
    seen: set[str] = set()

    for sentence in sentences[:20]:
        if sentence in seen or len(sentence) < 4:
            continue
        seen.add(sentence)

        # 各类型打分
        scores: dict[str, int] = {}
        total_score = 0.0
        for ftype, keywords in KW_TYPE.items():
            score = 0
            for kw in keywords:
                if kw in sentence:
                    # 检查否定词
                    is_negated, negation_type = check_negation(sentence, kw)
                    if negation_type == "full":
                        continue  # 完全否定，不计入
                    elif negation_type == "partial":
                        score += 0.5
                    else:
                        score += 1
            if score > 0:
                scores[ftype] = score
                total_score += score

        if not scores:
            # 无任何关键词匹配 — 跳过
            continue

        # 质量门禁：跳过低质量提取
        if not _is_quality_fragment(sentence, scores, total_score):
            continue

        # 选最优类型
        best_type = max(scores, key=scores.get)

        content = sentence[:30].strip()
        if len(content) >= 4:
            tags = get_top_tags(content, limit=2)
            fragments.append({"type": best_type, "content": content, "tags": tags})

    # 相邻句子合并：共享主题词的句子合并
    merged = _merge_adjacent(fragments)
    return merged[:10]  # 最多 10 条，且宁缺毋滥


def _merge_adjacent(fragments: list[dict]) -> list[dict]:
    """合并相邻且内容相关的碎片"""
    if len(fragments) < 2:
        return fragments

    merged = []
    i = 0
    while i < len(fragments):
        current = fragments[i]
        # 看下一个碎片是否跟当前共享关键词
        if i + 1 < len(fragments):
            next_frag = fragments[i + 1]
            # 简单共享主题词检测
            cwords = set(current.get("content", ""))
            nwords = set(next_frag.get("content", ""))
            overlap = cwords & nwords
            if len(overlap) >= 2:  # 共享 2 个以上字
                merged_content = current["content"] + "，" + next_frag["content"]
                merged_type = current["type"]  # 保持第一个的类型
                # Engine 0.1: 合并时合并标签
                merged_tags = list(set(current.get("tags", []) + next_frag.get("tags", [])))[:2]
                merged.append({"type": merged_type, "content": merged_content[:40], "tags": merged_tags})
                i += 2
                continue
        merged.append(current)
        i += 1
    return merged

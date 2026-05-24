"""
内置融合引擎 — 基于方向原型 + 模板的纯规则引擎
Engine 0.1: 集成语义路由层（tag_system + DomainExtractor）
"""
import hashlib
import random
from typing import Optional

from services.ai.base import AIProvider, FusionRequest, FusionResult
from services.ai.templates.direction_prototypes import DIRECTION_PROTOTYPES
from services.ai.templates.golden_sentences import get_golden_sentence
from services.ai.templates.insight_templates import get_insight
from services.ai.templates.tag_system import build_tag_profile, get_top_tags
from services.ai.similarity import find_cross_type_connections, compute_type_diversity
from services.ai.feedback_loop import feedback_tracker
from services.ai.failure_tracker import failure_flywheel
from services.ai.builtin.domain_extractor import extract_domains, extract_scene_context, extract_scene_hints
from services.ai.templates.domain_templates import DOMAIN_TEMPLATES


class BuiltinProvider(AIProvider):
    """内置 AI 提供者 — 纯规则融合引擎"""

    provider_name = "builtin"

    async def is_available(self) -> bool:
        return True

    async def fuse(self, request: FusionRequest) -> FusionResult:
        return self._builtin_fusion(request.profession, request.fragments, request.goal)

    async def spark(self, request):
        from services.ai.builtin.spark import builtin_spark
        return builtin_spark(request.fragments)

    async def score_fragment(self, fragment_type: str, content: str) -> int:
        from services.ai.builtin.scorer import builtin_score
        return builtin_score(fragment_type, content)

    async def extract_fragments(self, text: str) -> list[dict]:
        from services.ai.builtin.extractor import builtin_extract_fragments
        return await builtin_extract_fragments(text)

    async def classify_text(self, content: str) -> dict:
        from services.ai.builtin.classifier import builtin_classify
        return builtin_classify(content)

    @staticmethod
    def _builtin_fusion(profession: str, fragments: list[dict], goal: Optional[str] = None) -> dict:
        """基于方向原型匹配的融合引擎"""

        # 1. 统计碎片类型分布
        type_counts: dict[str, int] = {}
        for f in fragments:
            t = f.get("type", "技能")
            type_counts[t] = type_counts.get(t, 0) + 1

        total_frags = len(fragments)

        # 2. 提取碎片内容
        frag_contents = [f.get("content", "") for f in fragments]
        frag_summary = "、".join(c[:15] for c in frag_contents[:4]) if frag_contents else "你的独特组合"

        # 3. 冷启动模式：碎片太少时的探索性引导
        if total_frags <= 3:
            return BuiltinProvider._cold_start_response(fragments, profession, frag_summary)

        # 4. 匹配方向原型
        selected_prototypes = BuiltinProvider._select_prototypes(fragments, profession, goal, type_counts)

        # 5. 构建方向
        directions = []
        for proto in selected_prototypes:
            direction = BuiltinProvider._build_direction(proto, fragments, profession, type_counts)
            directions.append(direction)

        # 6. 补足方向到 2 个
        while len(directions) < 2:
            directions.append(BuiltinProvider._fallback_direction(fragments, profession, type_counts))

        # 7. 金句、洞察
        golden = get_golden_sentence(frag_summary, user_id=str(hash(frag_summary)))
        insight = get_insight(total_frags, frag_summary, "跨维度组合")

        # 8. 碎片连接（语义路由层：cross-type Jaccard + keyword overlap）
        connections = find_cross_type_connections(fragments)
        if not connections and len(fragments) >= 2:
            # 兜底：用 keyword overlap 做最后一道防线
            for i in range(min(3, len(fragments) - 1)):
                a = fragments[i]
                b = fragments[i + 1]
                at = a.get("type", "")
                bt = b.get("type", "")
                if at != bt:  # 确保跨类型
                    connections.append({
                        "fragment_a": a.get("content", "")[:20],
                        "fragment_b": b.get("content", "")[:20],
                        "connection": f"「{a.get('content', '')[:10]}」和「{b.get('content', '')[:10]}」互相强化",
                    })

        # 9. 动态 confidence
        confidence = BuiltinProvider._compute_confidence(fragments, type_counts, goal)

        # 10. 多样性提示
        diversity = compute_type_diversity(fragments)
        diversity_hint = diversity.get("warning", "")

        # 11. 能力标签画像（Engine 0.1）
        capability_profile = build_tag_profile(fragments)

        # 12. profile_tag (用能力标签替代简单规则)
        profile_tag = BuiltinProvider._build_profile_tag(fragments, type_counts, profession, capability_profile)

        # 13. 用户领域感知（Engine 0.1）
        user_domains = extract_domains(fragments)
        scene_context = extract_scene_context(fragments)

        # 14. skill_gaps
        skill_gaps = BuiltinProvider._build_skill_gaps(type_counts, goal)

        result = {
            "golden_sentence": golden,
            "profile_tag": profile_tag,
            "capability_tags": capability_profile.get("top_tags", []),
            "capability_signature": capability_profile.get("signature_tag", ""),
            "user_domains": user_domains,
            "confidence": confidence,
            "directions": directions,
            "insight": insight,
            "skill_gaps": skill_gaps,
            "fragment_connections": connections,
            "mini_directions": BuiltinProvider._build_mini_directions(fragments, type_counts),
            "type_diversity": diversity_hint,
        }

        # 记录模板使用
        for proto in selected_prototypes:
            feedback_tracker.record_use(proto.get("prototype_id", "unknown"))

        return result

    @staticmethod
    def _select_prototypes(
        fragments: list[dict],
        profession: str,
        goal: Optional[str],
        type_counts: dict,
    ) -> list[dict]:
        """
        按加权打分选择方向原型（Engine 0.1: 引入能力标签 + 领域感知）。
        Engine 0.7: 增加模板冷却机制，避免同一用户近期重复匹配相同原型。
        """
        # 预先计算能力标签和用户领域
        all_text = " ".join(f.get("content", "") for f in fragments)
        user_domains = extract_domains(fragments)
        user_tags = get_top_tags(all_text, 3)

        # Engine 0.7: 模板冷却 — 从 feedback_tracker 读取最近使用的模板并降低权重
        recently_used = [
            tid for tid, stats in feedback_tracker.get_all_stats().items()
            if stats.get("total_uses", 0) > 0
        ]

        scored = []
        for proto in DIRECTION_PROTOTYPES:
            score = 0.0

            # goal 匹配（+100）
            if goal:
                goal_lower = goal.lower()
                proto_name_lower = proto.get("name", "").lower()
                proto_logic = proto.get("core_logic", "").lower()
                if any(kw in proto_name_lower + proto_logic for kw in goal_lower.split()):
                    score += 100
                elif any(kw in proto_name_lower for kw in ["变现", "赚钱", "副业"]):
                    score += 30

            # Engine 0.1: 能力标签覆盖（+50，使用 tag_system 精确匹配）
            trigger_tags = proto.get("trigger_tags", [])
            if trigger_tags:
                tag_hits = 0
                for tag in trigger_tags:
                    # 使用 tag_system 分类结果匹配
                    if tag in user_tags:
                        tag_hits += 1
                    # 兜底：关键词出现在碎片内容中
                    elif tag in all_text:
                        tag_hits += 1
                coverage = tag_hits / len(trigger_tags) if trigger_tags else 1.0
                score += 50 * coverage

            # Engine 0.3: goal 驱动的类型需求匹配（+20）
            if goal:
                from services.gap_service import GOAL_TYPE_REQUIREMENTS
                if goal in GOAL_TYPE_REQUIREMENTS:
                    # 统计 user 已有的类型覆盖
                    user_types = set(f.get("type", "") for f in fragments)
                    # 看 prototype 的 trigger_tags 是否覆盖 goal 所需的高权重类型
                    goal_reqs = GOAL_TYPE_REQUIREMENTS[goal]
                    high_need_types = {t for t, n in goal_reqs.items() if n >= 2}
                    prototype_type_hits = sum(1 for t in trigger_tags if t in high_need_types)
                    if prototype_type_hits >= 2:
                        score += 20
                    elif prototype_type_hits >= 1:
                        score += 10

            # Engine 0.1: 领域匹配（+40，用于 trigger_domain_required 原型）
            if proto.get("trigger_domain_required", False):
                if any(d in all_text for d in user_domains):
                    score += 35
                elif profession and profession in all_text:
                    score += 15  # 职业名匹配也给部分分

            # Engine 0.7: 模板冷却 — 最近用过的原型减分，避免反复推送
            proto_id = proto.get("prototype_id", "")
            if proto_id in recently_used:
                score -= 40  # 大幅降低权重，让其他原型有机会

            # 反馈加权（0~30）
            proto_id = proto.get("prototype_id", "")
            fw = feedback_tracker.get_weight(proto_id)
            score += (fw - 1.0) * 30

            # 随机扰动（0~15）
            score += random.uniform(0, 15)

            # serendipity: 10% 概率强制从不同维度选
            if random.random() < 0.1:
                score += random.uniform(20, 50)

            scored.append((score, proto))

        # 按分数降序
        scored.sort(key=lambda x: x[0], reverse=True)

        # 取前 2，第二个强制不同原型
        selected = []
        selected_ids = set()
        for _, proto in scored:
            pid = proto.get("prototype_id", "")
            if pid not in selected_ids:
                selected.append(proto)
                selected_ids.add(pid)
            if len(selected) >= 2:
                break

        return selected if selected else DIRECTION_PROTOTYPES[:2]

    @staticmethod
    def _build_direction(proto: dict, fragments: list[dict], profession: str, type_counts: dict) -> dict:
        """用用户碎片内容填充方向原型（Engine 0.2: 集成领域模板 + 覆盖率匹配）"""
        frag_contents = [f.get("content", "") for f in fragments]
        top_skill = next((f.get("content", "")[:15] for f in fragments if f.get("type") in ("技能", "能力")), "你的技能")
        top_exp = next((f.get("content", "")[:15] for f in fragments if f.get("type") in ("经历", "经验")), "你的经历")
        # Engine 0.1: 用能力标签选择更精准的 top_skill
        all_text = " ".join(frag_contents)
        top_tags = get_top_tags(all_text, limit=1)
        if top_tags:
            tag_to_skill = {
                "内容创作": "你的内容创作能力",
                "人际沟通": "你的沟通能力",
                "逻辑分析": "你的分析能力",
                "执行落地": "你的执行力",
                "创意审美": "你的审美",
                "共情关怀": "你的共情力",
                "资源整合": "你的资源整合力",
                "个人特质": "你的个人特质",
            }
            top_skill = tag_to_skill.get(top_tags[0], top_skill)

        # Engine 0.2: 检测领域并加载领域模板（支持前缀匹配）
        user_domains = extract_domains(fragments)
        domain_template = None
        for d in user_domains:
            # 精确匹配
            if d in DOMAIN_TEMPLATES:
                domain_template = DOMAIN_TEMPLATES[d]
                break
            # 前缀匹配（如 "物流/运输" → "物流"）
            for dt_key in DOMAIN_TEMPLATES:
                if d.startswith(dt_key) or dt_key.startswith(d):
                    domain_template = DOMAIN_TEMPLATES[dt_key]
                    break
            if domain_template:
                break
        if not domain_template:
            domain_template = DOMAIN_TEMPLATES.get("通用", {})

        # Engine 0.2: 获取该原型的领域覆盖
        proto_id = proto.get("prototype_id", "")
        domain_override = domain_template.get("prototype_overrides", {}).get(proto_id, {})

        # 构建描述：基础描述 + 领域附加描述
        base_desc = proto.get("base_description", "").replace("{domain}", profession).replace("{tag}", top_skill)
        extra_desc = domain_override.get("base_description_extra", "")
        why_this_works = base_desc + ("\n\n" + extra_desc if extra_desc else "")

        # 构建 roadmap（应用领域覆盖）
        roadmap = []
        for i, tmpl in enumerate(proto.get("roadmap_template", [])[:5]):
            action_text = tmpl["name"]

            # 领域覆盖的 actions
            step_overrides = domain_override.get("roadmap_step_override", {}).get(tmpl["step"], {})
            actions = list(step_overrides.get("actions", tmpl.get("actions", [])))

            # Task 0.3: 可行性约束 — 第一步必须是打开手机/电脑就能做的具体事
            if i == 0:
                modified = []
                for a in actions:
                    if not any(kw in a for kw in ["打开手机", "打开电脑", "手机", "备忘录", "写下", "记录"]):
                        a = f"打开手机备忘录，{a}"
                    modified.append(a)
                # 引用用户已有的碎片
                if frag_contents:
                    ref = frag_contents[0][:40]
                    modified.insert(0, f"回顾你的碎片：「{ref}」— 从这条开始想")
                actions = modified

            step = {
                "step": tmpl["step"],
                "time": f"第{tmpl['step']}步",
                "action": action_text,
                "scenic_spot": tmpl.get("landmark", ""),
                "scenic_spot_icon": BuiltinProvider._landmark_icon(tmpl.get("landmark", "")),
                "checklist": [
                    a.replace("{skill}", top_skill).replace("{experience}", top_exp).replace("{domain}", profession)
                    for a in actions
                ],
                "completion_marker": tmpl.get("completion", ""),
                "verification_cost": "🟢" if tmpl["step"] <= 2 else ("🟡" if tmpl["step"] <= 3 else "🔴"),
                "failure_hint": failure_flywheel.get_failure_message(proto_id, tmpl["step"]),
            }
            roadmap.append(step)

        # Engine 0.1: 用 DomainExtractor 提取场景上下文
        scene_context = extract_scene_context(fragments)
        if not scene_context:
            scene_context = f"你现在的{profession}工作"
        scene_hints = extract_scene_hints(fragments)

        # 领域覆盖的 common_pitfalls
        pitfalls = list(proto.get("common_pitfalls", []))
        extra_pitfalls = domain_override.get("common_pitfalls_extra", [])
        pitfalls.extend(extra_pitfalls)

        # Engine 0.2: 计算覆盖率级别
        coverage_level = BuiltinProvider._compute_coverage_level(proto, user_domains, top_tags)
        market_hint = BuiltinProvider._build_market_hint(coverage_level, scene_context, top_skill, user_domains)

        used = frag_contents[:3] if len(frag_contents) >= 3 else frag_contents

        # P3.1: 记录原型尝试
        failure_flywheel.record_prototype_attempt(proto_id)

        return {
            "title": proto.get("base_title", "").replace("{domain}", profession),
            "why_this_works": why_this_works,
            "market_hint": market_hint,
            "difficulty": "easy" if len(fragments) >= 5 else "medium",
            "time_to_first_result": "1-2周",
            "roadmap": roadmap,
            "used_fragments": used,
            "next_action": f"今天就做：打开手机备忘录，写下{scene_context}场景里，有哪些小事你用{top_skill}能比别人做得更好",
            "common_pitfalls": pitfalls,
            "coverage_level": coverage_level,
        }

    @staticmethod
    def _compute_coverage_level(proto: dict, user_domains: list[str], top_tags: list[str]) -> str:
        """
        计算原型与用户的覆盖率级别。

        100% (强匹配): trigger_tags 全部命中 + 领域匹配(如有要求)
        80%  (中匹配): trigger_tags 全部命中
        60%  (弱匹配): trigger_tags 部分命中
        """
        trigger_tags = proto.get("trigger_tags", [])
        if not trigger_tags:
            return "60%"  # 无 trigger 的原型默认弱匹配

        # 计算 tag 命中率
        tag_hits = sum(1 for t in trigger_tags if t in top_tags)

        if tag_hits == len(trigger_tags):
            # 全部命中
            if proto.get("trigger_domain_required", False):
                if user_domains:
                    return "100%"
                return "80%"
            return "80%"
        elif tag_hits > 0:
            return "60%"
        return "60%"

    @staticmethod
    def _build_market_hint(coverage_level: str, scene_context: str, top_skill: str, user_domains: list[str]) -> str:
        """根据覆盖率级别生成 market_hint"""
        if coverage_level == "100%":
            return (
                f"你对这个方向很有基础。就从{scene_context}这个场景出发，"
                f"用你的{top_skill}解决身边人的具体问题。你的经验就是最大的优势。"
            )
        elif coverage_level == "80%":
            return (
                f"不需要换行业。就从{scene_context}这个场景出发，"
                f"用你的{top_skill}解决身边人的具体问题。"
            )
        else:
            return (
                f"这是一个值得探索的方向。先从日常小事开始，看看{scene_context}场景里有没有能用上{top_skill}的地方。"
            )

    @staticmethod
    def _landmark_icon(landmark: str) -> str:
        """景点名 → emoji 图标映射"""
        icon_map = {
            "瞭望台": "🏛️", "试炼场": "🔧", "锻造坊": "🏪", "金矿洞": "🗼",
            "瞭望台·定标": "🏛️", "瞭望台·寻人": "🏛️", "瞭望台·盘点": "🏛️",
            "瞭望台·定品": "🏛️", "瞭望台·盘库": "🏛️",
            "试炼场·初鸣": "🔧", "试炼场·初助": "🔧", "试炼场·首单": "🔧",
            "试炼场·打样": "🔧", "试炼场·搭桥": "🔧",
            "锻造坊·锤炼": "🏪", "锻造坊·精进": "🏪", "锻造坊·打磨": "🏪",
            "锻造坊·求精": "🏪", "锻造坊·织网": "🏪",
            "金矿洞·收获": "🗼", "金矿洞·认可": "🗼", "金矿洞·口碑": "🗼",
            "金矿洞·复利": "🗼", "金矿洞·信息流": "🗼",
            "探索林": "🌲", "汇流湖": "💧",
        }
        for key, icon in icon_map.items():
            if key in landmark:
                return icon
        return "📍"

    @staticmethod
    def _cold_start_response(fragments: list[dict], profession: str, frag_summary: str) -> dict:
        """新用户冷启动响应：碎片≤3时不强行出方向，给探索性引导"""
        return {
            "golden_sentence": "你不是没有碎片，你只是还没开始收集。每一块都很珍贵。",
            "profile_tag": f"正在探索{profession}的拼图新手",
            "confidence": 30,
            "directions": [
                {
                    "title": "你的碎片还在成长中",
                    "why_this_works": (
                        "你目前的碎片还比较零散，Me 帮你从中发现了几个可能的线索方向。"
                        "继续记录日常——你的经历、你擅长的事、别人夸你的话、你每天不知不觉在做的事——"
                        "这些线索会越来越清晰。不用着急，认识自己是一个慢慢拼的过程。"
                    ),
                    "market_hint": "先不急着找方向，先让碎片丰富起来。每天记录1-2件小事就够了。",
                    "difficulty": "easy",
                    "time_to_first_result": "1-2周",
                    "roadmap": [
                        {
                            "step": 1, "time": "今天", "action": "记录今天发生的一件小事",
                            "scenic_spot": "瞭望台", "scenic_spot_icon": "🏛️",
                            "checklist": ["打开随手记", "写下一件今天发生的事（哪怕很小）"],
                            "completion_marker": "已记录1条", "verification_cost": "🟢"
                        },
                        {
                            "step": 2, "time": "本周", "action": "连续记录3天",
                            "scenic_spot": "探索林", "scenic_spot_icon": "🌲",
                            "checklist": ["每天记录至少1条", "周末回看这3天的记录"],
                            "completion_marker": "本周记录≥3条", "verification_cost": "🟢"
                        },
                        {
                            "step": 3, "time": "下周", "action": "回来再拼一次",
                            "scenic_spot": "汇流湖", "scenic_spot_icon": "💧",
                            "checklist": ["当碎片积累到5块以上，回来重新拼方向"],
                            "completion_marker": "碎片≥5块后重新融合", "verification_cost": "🟡"
                        },
                    ],
                    "used_fragments": [f.get("content", "")[:15] for f in fragments],
                    "next_action": "打开随手记，写下今天发生的一件事——哪怕只是'帮同事带了一杯咖啡'",
                    "common_pitfalls": [
                        "觉得自己的日常'没有价值'——最有价值的碎片往往藏在你觉得'这没什么'的事里",
                    ],
                },
                {
                    "title": "你还可以试试添加这些碎片",
                    "why_this_works": (
                        f"基于你已有的{frag_summary}，Me 建议你试着收集这些类型的碎片，"
                        "它们会让你的拼图更立体，下一次融合分析结果也会更精准。"
                    ),
                    "market_hint": "",
                    "difficulty": "easy",
                    "time_to_first_result": "即可",
                    "roadmap": [
                        {
                            "step": 1, "time": "现在", "action": "补充一条经历碎片",
                            "scenic_spot": "收集站", "scenic_spot_icon": "📍",
                            "checklist": ["回忆一个你做过的、觉得有点特别的事", "写下来，哪怕只有一句话"],
                            "completion_marker": "已添加1条经历碎片", "verification_cost": "🟢"
                        },
                        {
                            "step": 2, "time": "今天", "action": "补充一条性格碎片",
                            "scenic_spot": "收集站", "scenic_spot_icon": "📍",
                            "checklist": ["问问自己：朋友用哪3个词形容你？", "选最准那个记下来"],
                            "completion_marker": "已添加1条性格碎片", "verification_cost": "🟢"
                        },
                    ],
                    "used_fragments": [],
                    "next_action": "问问身边一个朋友：'你觉得我最厉害的是什么？'把答案记下来",
                    "common_pitfalls": [
                        "不要只记录'技能'碎片，经历、性格、资源同样重要——完整的拼图需要不同形状的碎片",
                    ],
                },
            ],
            "insight": get_insight(len(fragments), frag_summary, "目标驱动型"),
            "skill_gaps": ["需要更多碎片来形成完整拼图", "建议补充经历和性格类碎片", "每天随手记1-2条"],
            "fragment_connections": [],
            "mini_directions": [],
            "capability_tags": [],
            "capability_signature": "",
            "user_domains": [],
        }

    @staticmethod
    def _fallback_direction(fragments: list[dict], profession: str, type_counts: dict) -> dict:
        """兜底方向：当没有原型匹配时"""
        frag_contents = [f.get("content", "") for f in fragments]
        top = frag_contents[0][:15] if frag_contents else "你的独特之处"
        return {
            "title": "把你的日常变成素材库",
            "why_this_works": (
                f"你每天的生活——你的工作、你的观察、你遇到的问题和解决的办法——"
                f"都是独一无二的内容。{profession}这个身份本身就意味着你有特定人群想看的东西。"
                f"真实经历+你的独特视角=别人抄不走的内容。"
            ),
            "market_hint": "小红书和抖音上的普通人真实生活分享，最容易起号。同城流量优先。",
            "difficulty": "easy",
            "time_to_first_result": "1-2周",
            "roadmap": [
                {
                    "step": 1, "time": "今天", "action": "记录今天的一件小事",
                    "scenic_spot": "瞭望台", "scenic_spot_icon": "🏛️",
                    "checklist": ["选一件今天遇到的有意思的事，写成200字"],
                    "completion_marker": "已写下第一条", "verification_cost": "🟢"
                },
                {
                    "step": 2, "time": "第1周", "action": "坚持每天发一条",
                    "scenic_spot": "试炼场", "scenic_spot_icon": "🔧",
                    "checklist": ["每天发一条内容，坚持一周，看哪条有人看"],
                    "completion_marker": "连续发布7天", "verification_cost": "🟡"
                },
                {
                    "step": 3, "time": "第2-3周", "action": "集中精力做方向",
                    "scenic_spot": "锻造坊", "scenic_spot_icon": "🏪",
                    "checklist": ["集中精力做数据最好的那个方向"],
                    "completion_marker": "找到1个能持续产出的内容方向", "verification_cost": "🟡"
                },
            ],
            "used_fragments": frag_contents[:2],
            "next_action": f"打开备忘录，写下今天发生的一件事：跟{top}有关的",
            "common_pitfalls": ["想太多、不行动——先发再优化，完成比完美重要"],
        }

    @staticmethod
    def _compute_confidence(fragments: list[dict], type_counts: dict, goal: Optional[str]) -> int:
        """
        动态计算 confidence（30-95）。

        边界值验证：
        - 空碎片 → 30（最低）
        - 碎片≤3 → 30-45（冷启动）
        - 4-6 碎片、3+类型 → 50-75
        - 7+ 碎片、4+ 类型、有目标 → 75-95
        """
        if not fragments:
            return 30

        unique_types = len([t for t, c in type_counts.items() if c > 0])
        total = len(fragments)

        # 冷启动判断
        if total <= 3:
            base = 30 + unique_types * 3 + total * 2
            return max(30, min(45, base))

        # 常规计算
        # 基础分：碎片数量（0-15）
        base = 45 + min(15, total * 2)
        # 类型多样性（0-15）
        base += min(15, unique_types * 3)
        # 内容质量（0-10）
        avg_len = sum(len(f.get("content", "")) for f in fragments) / total
        base += min(10, int(avg_len / 5))
        # 目标加分（0-10）
        if goal:
            base += 10
        # 多样性惩罚
        if unique_types <= 2 and total >= 5:
            base -= 10

        # Engine 0.7: 基于历史反馈率微调
        from services.ai.quality_monitor import quality_monitor as _qm
        _ur = _qm.get_useful_rate()
        if _ur > 0.5:
            base += 5
        elif 0 < _ur < 0.3:
            base -= 5

        return max(30, min(95, int(base)))

    @staticmethod
    def _build_profile_tag(fragments: list[dict], type_counts: dict, profession: str, capability_profile: dict = None) -> str:
        """构建内容感知的 profile_tag（Engine 0.1: 引入能力标签）"""
        if capability_profile and capability_profile.get("top_tags"):
            top_tags = capability_profile["top_tags"]
            signature = capability_profile.get("signature_tag", "")
            total = len(fragments)
            if signature:
                return f"基于{total}块碎片：{signature}"
            return f"基于{total}块碎片：能力集中在{'、'.join(top_tags[:2])}"

        # 兜底：旧逻辑
        skill_frags = [f.get("content", "") for f in fragments if f.get("type") in ("技能", "能力")]
        trait_frags = [f.get("content", "") for f in fragments if f.get("type") in ("性格", "特质")]

        top_skill = skill_frags[0][:8] if skill_frags else profession[:8]
        top_trait = trait_frags[0][:8] if trait_frags else "踏实肯干"

        total = len(fragments)
        return f"基于{total}块碎片的分析：{top_skill}+{top_trait}"

    @staticmethod
    def _build_skill_gaps(type_counts: dict, goal: Optional[str]) -> list[str]:
        """构建目标感知 skill_gaps（Engine 0.3: 更具体的行动描述）"""
        gaps = []
        from services.gap_service import GOAL_TYPE_REQUIREMENTS

        if goal and goal in GOAL_TYPE_REQUIREMENTS:
            reqs = GOAL_TYPE_REQUIREMENTS[goal]
            for ftype, needed in reqs.items():
                if needed > 0 and type_counts.get(ftype, 0) == 0:
                    action_map = {
                        "技能": "今天花30分钟练一个跟目标相关的小技能",
                        "能力": "回忆最近一次处理复杂问题的经历，总结用了什么能力",
                        "经历": "写一段200字的经历，讲一件你做成过的事",
                        "资源": "打开通讯录，找出3个可能对目标有帮助的人",
                        "性格": "问问朋友：你觉得我哪个性格特点最适合做这个？",
                        "知识": "搜3篇目标领域的干货文章，做笔记",
                        "习惯": "设计一个每天10分钟的习惯，跟目标相关",
                        "爱好": "想想你的爱好里有没有跟目标交叉的点",
                    }
                    action = action_map.get(ftype, "先记录一块相关碎片")
                    gaps.append(f"缺少「{ftype}」碎片——{action}")
        else:
            missing = [t for t, c in type_counts.items() if c == 0]
            if "经历" in missing:
                gaps.append("缺少「经历」碎片——写一段200字的自我介绍，讲一件你做成过的事")
            if "资源" in missing:
                gaps.append("缺少「资源」碎片——打开通讯录，找出3个可能对你有帮助的人")
            if "性格" in missing:
                gaps.append("缺少「性格」碎片——问问身边朋友：你最突出的3个性格特点是什么")

        while len(gaps) < 3:
            gaps.append("继续随手记，让碎片更多样——每一块都可能是关键的拼图")

        return gaps[:4]

    @staticmethod
    def _build_mini_directions(fragments: list[dict], type_counts: dict) -> list[dict]:
        """构建 mini_directions（4 个小方案）"""
        skill_frags = [f for f in fragments if f.get("type") in ("技能", "能力")]
        exp_frags = [f for f in fragments if f.get("type") in ("经历", "经验")]

        mini = []
        if skill_frags:
            s = skill_frags[0].get("content", "")[:10]
            mini.append({"title": f"用'{s}'接单", "type": "服务", "tagline": f"把你的{s}变成能卖的服务"})
        if exp_frags:
            e = exp_frags[0].get("content", "")[:10]
            mini.append({"title": f"把'{e}'写成故事", "type": "内容", "tagline": "你的经历对别人来说是攻略"})
        if len(fragments) >= 3:
            mini.append({"title": "找个互补搭档", "type": "社群", "tagline": "你缺的碎片，别人可能有"})
        mini.append({"title": "每天记录一件小事", "type": "习惯", "tagline": "一年后回看，你会感谢今天的自己"})

        return mini[:4]

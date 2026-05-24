"""
用户认知模型 — P3.2 动态维度标签
从打卡频率、方案切换率、反馈数据自动计算用户类型。
"""

import json
import time
from pathlib import Path
from threading import Lock
from typing import Optional

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
PROFILE_FILE = DATA_DIR / "cognitive_profile.json"


class CognitiveProfile:
    """用户认知模型 — 自动标注行动偏好/抗压能力/优势领域"""

    def __init__(self):
        self._lock = Lock()
        self._data: dict = {
            "user_profiles": {},
            "computed_at": None,
        }
        self._load()

    def _load(self):
        if PROFILE_FILE.exists():
            try:
                with open(PROFILE_FILE, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
            except (json.JSONDecodeError, IOError):
                pass

    def _save(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with self._lock:
            try:
                with open(PROFILE_FILE, "w", encoding="utf-8") as f:
                    json.dump(self._data, f, ensure_ascii=False, indent=2)
            except IOError:
                pass

    def compute_profile(
        self,
        user_id: int = 1,
        checkin_count: int = 0,
        fusion_count: int = 0,
        fragment_count: int = 0,
        abandoned_map_count: int = 0,
        total_map_count: int = 0,
        useful_feedback_count: int = 0,
        not_useful_feedback_count: int = 0,
        top_fragment_types: Optional[list[str]] = None,
    ) -> dict:
        """
        从行为数据计算用户认知画像。

        Args:
            user_id: 用户ID
            checkin_count: 打卡次数（反映行动力）
            fusion_count: 融合次数（反映探索意愿）
            fragment_count: 碎片数
            abandoned_map_count: 放弃地图数
            total_map_count: 总地图数
            useful_feedback_count: 有用反馈数
            not_useful_feedback_count: 无用反馈数
            top_fragment_types: 高频碎片类型列表

        Returns:
            dict: 用户认知画像
        """
        # 1. 行动偏好：冲动型 / 观察型 / 研究型
        action_style = self._compute_action_style(
            checkin_count, fusion_count, fragment_count, total_map_count
        )

        # 2. 抗压能力
        resilience = self._compute_resilience(
            abandoned_map_count, total_map_count, not_useful_feedback_count
        )

        # 3. 优势领域
        strengths = self._compute_strengths(top_fragment_types, fragment_count)

        # 4. 行为模式摘要
        behavior_pattern = self._compute_pattern(
            checkin_count, fusion_count, useful_feedback_count, not_useful_feedback_count
        )

        profile = {
            "user_id": user_id,
            "action_style": action_style,
            "resilience": resilience,
            "strengths": strengths,
            "behavior_pattern": behavior_pattern,
            "computed_at": time.time(),
            "raw_data": {
                "checkin_count": checkin_count,
                "fusion_count": fusion_count,
                "fragment_count": fragment_count,
                "abandon_rate": round(abandoned_map_count / total_map_count, 2) if total_map_count else 0,
                "feedback_total": useful_feedback_count + not_useful_feedback_count,
            },
        }

        with self._lock:
            self._data["user_profiles"][str(user_id)] = profile
            self._data["computed_at"] = time.time()
        self._save()
        return profile

    def _compute_action_style(
        self, checkin_count: int, fusion_count: int, fragment_count: int, map_count: int
    ) -> dict:
        """
        计算行动偏好维度。

        - 冲动型: 多打卡、多融合、碎片多 → 先做再想
        - 研究型: 碎片多但打卡少、融合多但地图少 → 先收集再决定
        - 观察型: 碎片少、打卡少、融合少 → 观望为主
        """
        # 行动指数：打卡和融合反映行动力
        action_score = checkin_count * 2 + fusion_count
        # 收集指数：碎片数量反映收集倾向
        collect_score = fragment_count
        # 承诺指数：地图数量反映承诺倾向
        commit_score = map_count

        if action_score >= 10 and action_score > collect_score * 1.5:
            style = "冲动型"
            desc = "你倾向于先做再想。别人还在犹豫的时候，你已经试过了。这种'先动起来'的特质是你的核心动力。"
            advice = "可以偶尔在行动前多收一条信息——多花5分钟收集信息，能让你的行动更有方向。"
        elif collect_score >= 8 and action_score < collect_score:
            style = "研究型"
            desc = "你喜欢先搞清楚再动手。你会收集足够的信息，等'差不多懂了'才开始。这让你很少走弯路。"
            advice = "你的信息收集能力很强，但有时会陷入'永远没准备好'的循环。试试设置一个信息收集截止时间。"
        else:
            style = "观察型"
            desc = "你正在熟悉这个领域。你花时间观察，慢慢积累，等自己有把握了再行动。"
            advice = "试着从一件很小的事开始——不是'做决定'，只是'试一试'。每次试完你都会多知道一点。"

        return {
            "label": style,
            "description": desc,
            "advice": advice,
        }

    def _compute_resilience(
        self, abandoned_count: int, map_count: int, not_useful_count: int
    ) -> dict:
        """
        计算抗压能力。

        - 高: 很少放弃，很少给无用反馈 → 坚持度高
        - 中: 偶尔放弃 → 正常范围
        - 低: 高放弃率 → 需要更多支持
        """
        abandon_rate = abandoned_count / map_count if map_count > 0 else 0

        if abandon_rate < 0.2 and not_useful_count < 3:
            level = "高"
            desc = "你很少在遇到困难时放弃。即使结果不如预期，你也会坚持到看到结果。"
        elif abandon_rate < 0.5:
            level = "中"
            desc = "你会在觉得方向不对时及时调整。这其实是成熟的表现——知道什么时候该坚持，什么时候该掉头。"
        else:
            level = "需要关注"
            desc = "你似乎经常觉得找到的方向不太对。这可能不是你的问题，而是推荐给你的方向还不够精准。"

        return {
            "level": level,
            "description": desc,
        }

    def _compute_strengths(
        self, top_types: Optional[list[str]], fragment_count: int
    ) -> dict:
        """计算优势领域"""
        if not top_types or fragment_count == 0:
            return {
                "primary": "尚未确定",
                "description": "你还在积累碎片的阶段。再多记录一些，你的优势领域就会浮现出来。",
            }

        # 取前2个类型作为优势领域
        primary = top_types[0] if top_types else ""
        secondary = top_types[1] if len(top_types) > 1 else ""

        type_labels = {
            "能力": "技能", "知识": "知识", "特质": "个人特质",
            "经验": "经验", "兴趣": "兴趣", "资源": "资源",
        }
        primary_label = type_labels.get(primary, primary)
        secondary_label = type_labels.get(secondary, secondary) if secondary else ""

        desc = f"你拥有最多的是{primary_label}"
        if secondary_label:
            desc += f"，其次是{secondary_label}"
        desc += f"。这是你的优势储备（基于{fragment_count}块碎片的分析）。"

        return {
            "primary": primary_label,
            "secondary": secondary_label,
            "description": desc,
        }

    def _compute_pattern(
        self, checkin_count: int, fusion_count: int,
        useful_count: int, not_useful_count: int
    ) -> dict:
        """计算行为模式摘要"""
        total_feedback = useful_count + not_useful_count
        useful_rate = useful_count / total_feedback if total_feedback > 0 else None

        if useful_rate and useful_rate >= 0.6:
            engagement = "高参与"
            desc = "你对推荐的方向接受度很高，并且愿意尝试。"
        elif useful_rate and useful_rate >= 0.3:
            engagement = "选择性参与"
            desc = "你有自己的判断标准，会筛选适合自己的方向。"
        else:
            engagement = "探索中"
            desc = "你还在探索阶段，对不同方向保持开放态度。"

        return {
            "engagement": engagement,
            "description": desc,
        }

    def get_profile(self, user_id: int = 1) -> Optional[dict]:
        """获取缓存的用户认知画像"""
        with self._lock:
            profile = self._data["user_profiles"].get(str(user_id))
            return dict(profile) if profile else None

    def get_style_adjective(self, user_id: int = 1) -> str:
        """获取用户风格形容词（用于引擎输出个性化）"""
        profile = self.get_profile(user_id)
        if not profile:
            return ""
        style = profile.get("action_style", {}).get("label", "")
        mapping = {
            "冲动型": "你是个行动派——",
            "研究型": "你是个思考者——",
            "观察型": "你是个观察者——",
        }
        return mapping.get(style, "")


cognitive_profile = CognitiveProfile()

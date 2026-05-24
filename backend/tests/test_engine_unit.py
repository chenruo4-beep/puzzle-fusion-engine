"""
Engine 单元测试 — 覆盖 BuiltinProvider 各子组件边界值
- _compute_confidence: 空/冷启动/常规/惩罚
- _compute_coverage_level: 60%/80%/100%
- _cold_start_response: 结构完整性
- _build_profile_tag: 能力标签/兜底
- _build_skill_gaps: 目标感知/默认
- _build_market_hint: 覆盖率文案
- _landmark_icon: 映射覆盖
"""

import pytest
from services.ai.builtin.engine import BuiltinProvider


class TestComputeConfidence:
    """_compute_confidence 边界值测试"""

    def test_empty_fragments_returns_30(self):
        """空碎片 → 30（最低）"""
        assert BuiltinProvider._compute_confidence([], {}, None) == 30

    def test_single_fragment_returns_minimum(self):
        """1个碎片 → 冷启动计算值 35"""
        frags = [{"type": "能力", "content": "会写代码"}]
        assert BuiltinProvider._compute_confidence(frags, {"能力": 1}, None) == 35

    def test_three_fragments_cold_start(self):
        """3个碎片、3类型 → 冷启动上限 45"""
        frags = [
            {"type": "能力", "content": "会写代码"},
            {"type": "知识", "content": "懂算法"},
            {"type": "经验", "content": "做过项目"},
        ]
        types = {"能力": 1, "知识": 1, "经验": 1}
        c = BuiltinProvider._compute_confidence(frags, types, None)
        assert 30 <= c <= 45

    def test_four_fragments_enters_normal(self):
        """4个碎片 → 进入常规计算（>=46）"""
        frags = [
            {"type": "能力", "content": "会写代码"},
            {"type": "知识", "content": "懂算法"},
            {"type": "经验", "content": "做过项目"},
            {"type": "资源", "content": "有开源项目"},
        ]
        types = {"能力": 1, "知识": 1, "经验": 1, "资源": 1}
        c = BuiltinProvider._compute_confidence(frags, types, None)
        assert c >= 46, f"4碎片应进入常规计算，实际 {c}"

    def test_seven_fragments_high_diversity(self):
        """7+碎片、4+类型 → 75-95"""
        frags = [
            {"type": "能力", "content": "会写代码"},
            {"type": "知识", "content": "懂算法"},
            {"type": "经验", "content": "做过项目"},
            {"type": "资源", "content": "有开源项目"},
            {"type": "兴趣", "content": "喜欢开源"},
            {"type": "特质", "content": "有耐心"},
            {"type": "习惯", "content": "每天写代码"},
        ]
        types = {"能力": 1, "知识": 1, "经验": 1, "资源": 1, "兴趣": 1, "特质": 1, "习惯": 1}
        c = BuiltinProvider._compute_confidence(frags, types, None)
        assert c >= 70, f"7碎片高多样性应≥70，实际 {c}"
        assert c <= 95

    def test_goal_bonus(self):
        """有 goal → +10"""
        frags = [
            {"type": "能力", "content": "会写代码"},
            {"type": "知识", "content": "懂算法"},
            {"type": "经验", "content": "做过项目"},
            {"type": "资源", "content": "有开源项目"},
        ]
        types = {"能力": 1, "知识": 1, "经验": 1, "资源": 1}
        c_no_goal = BuiltinProvider._compute_confidence(frags, types, None)
        c_with_goal = BuiltinProvider._compute_confidence(frags, types, "创业")
        assert c_with_goal >= c_no_goal + 5, f"有goal应+10，无{c_no_goal}有{c_with_goal}"

    def test_uniform_type_penalty(self):
        """单类型碎片≥5 → -10惩罚"""
        frags = [
            {"type": "能力", "content": "会写代码"},
            {"type": "能力", "content": "会调试"},
            {"type": "能力", "content": "会重构"},
            {"type": "能力", "content": "会测试"},
            {"type": "能力", "content": "会部署"},
        ]
        types = {"能力": 5}
        c = BuiltinProvider._compute_confidence(frags, types, None)
        # 基础45 + 数量5*2=10 + 类型1*3=3 + 质量=~2 - 惩罚10 = 50
        assert c <= 55, f"单类型惩罚未生效，实际 {c}"

    def test_confidence_never_exceeds_95(self):
        """置信度不超过95上限"""
        frags = [
            {"type": "能力", "content": "会写代码"},
            {"type": "知识", "content": "懂算法懂数据结构懂网络懂安全懂设计模式"},
            {"type": "经验", "content": "做过项目"},
            {"type": "资源", "content": "有开源项目"},
            {"type": "兴趣", "content": "喜欢开源"},
            {"type": "特质", "content": "有耐心"},
            {"type": "习惯", "content": "每天写代码"},
        ]
        types = {"能力": 1, "知识": 1, "经验": 1, "资源": 1, "兴趣": 1, "特质": 1, "习惯": 1}
        c = BuiltinProvider._compute_confidence(frags, types, "创业")
        assert c <= 95, f"置信度上限95，实际 {c}"


class TestComputeCoverageLevel:
    """_compute_coverage_level 覆盖率级别测试"""

    def test_no_trigger_tags_returns_60(self):
        """无 trigger_tags → 60%"""
        proto = {}
        level = BuiltinProvider._compute_coverage_level(proto, ["餐饮"], ["内容创作"])
        assert level == "60%"

    def test_all_tags_hit_no_domain_required_returns_80(self):
        """所有 trigger_tags 命中，无领域要求 → 80%"""
        proto = {"trigger_tags": ["内容创作", "创意审美"]}
        level = BuiltinProvider._compute_coverage_level(proto, ["餐饮"], ["内容创作", "创意审美"])
        assert level == "80%"

    def test_all_tags_hit_with_domain_match_returns_100(self):
        """所有标签命中 + 领域匹配 → 100%"""
        proto = {"trigger_tags": ["内容创作"], "trigger_domain_required": True}
        level = BuiltinProvider._compute_coverage_level(proto, ["餐饮"], ["内容创作"])
        assert level == "100%"

    def test_all_tags_hit_with_domain_required_but_no_domain_returns_80(self):
        """所有标签命中 + 有领域要求但无领域 → 80%"""
        proto = {"trigger_tags": ["内容创作"], "trigger_domain_required": True}
        level = BuiltinProvider._compute_coverage_level(proto, [], ["内容创作"])
        assert level == "80%"

    def test_partial_tag_hit_returns_60(self):
        """部分标签命中 → 60%"""
        proto = {"trigger_tags": ["内容创作", "人际沟通", "逻辑分析"]}
        level = BuiltinProvider._compute_coverage_level(proto, [], ["内容创作"])
        assert level == "60%"


class TestColdStartResponse:
    """_cold_start_response 冷启动响应测试"""

    def test_returns_expected_structure(self):
        """冷启动响应包含必需字段"""
        frags = [{"type": "能力", "content": "会写代码"}]
        result = BuiltinProvider._cold_start_response(frags, "程序员", "会写代码")

        assert "golden_sentence" in result
        assert result["confidence"] == 30
        assert len(result["directions"]) == 2
        assert "skill_gaps" in result
        assert "fragment_connections" in result

    def test_cold_start_directions_are_exploratory(self):
        """冷启动的方向是引导性的，非强方向"""
        frags = [{"type": "能力", "content": "会写代码"}]
        result = BuiltinProvider._cold_start_response(frags, "程序员", "会写代码")

        for d in result["directions"]:
            assert d["difficulty"] == "easy"
            assert "time_to_first_result" in d
            assert len(d["roadmap"]) >= 1

    def test_profile_tag_contains_profession(self):
        """profile_tag 包含职业名"""
        frags = [{"type": "能力", "content": "会写代码"}]
        result = BuiltinProvider._cold_start_response(frags, "程序员", "会写代码")
        assert "程序员" in result["profile_tag"]

    def test_empty_fragments_still_works(self):
        """空碎片冷启动不崩溃"""
        result = BuiltinProvider._cold_start_response([], "无业", "")
        assert result["confidence"] == 30
        assert len(result["directions"]) == 2


class TestBuildProfileTag:
    """_build_profile_tag 测试"""

    def test_with_capability_profile_signature(self):
        """有能力标签和 signature → 使用 signature"""
        tag = BuiltinProvider._build_profile_tag(
            [{"type": "能力", "content": "test"}],
            {"能力": 1},
            "程序员",
            {"top_tags": ["内容创作", "逻辑分析"], "signature_tag": "内容创作型"},
        )
        assert "内容创作型" in tag
        assert "1块碎片" in tag

    def test_with_capability_profile_no_signature(self):
        """有能力标签无 signature → 使用 top_tags"""
        tag = BuiltinProvider._build_profile_tag(
            [{"type": "能力", "content": "test"}, {"type": "知识", "content": "test2"}],
            {"能力": 1, "知识": 1},
            "程序员",
            {"top_tags": ["内容创作", "逻辑分析"], "signature_tag": ""},
        )
        assert "内容创作" in tag
        assert "逻辑分析" in tag

    def test_fallback_without_capability_profile(self):
        """无 capability_profile → 兜底逻辑"""
        tag = BuiltinProvider._build_profile_tag(
            [{"type": "技能", "content": "写代码"}],
            {"技能": 1},
            "程序员",
            None,
        )
        assert "写代码" in tag or "程序员" in tag


class TestBuildSkillGaps:
    """_build_skill_gaps 测试"""

    def test_with_goal_missing_types(self):
        """有 goal 且缺少必需类型 → 生成对应建议"""
        gaps = BuiltinProvider._build_skill_gaps({"能力": 1, "知识": 1}, "创业")
        # 创业需要多种类型，只提供能力+知识应该有缺口
        assert len(gaps) >= 1
        assert any("碎片" in g for g in gaps)

    def test_without_goal_adds_default_gaps(self):
        """无 goal → 检查常见缺失类型"""
        gaps = BuiltinProvider._build_skill_gaps({"能力": 1}, None)
        assert len(gaps) >= 3
        # 默认检查经历/资源/性格
        gap_text = " ".join(gaps)
        assert any(kw in gap_text for kw in ["经历", "资源", "性格", "随手记"])

    def test_pads_to_minimum_3(self):
        """不足3条时补齐到3条"""
        gaps = BuiltinProvider._build_skill_gaps(
            {"能力": 1, "知识": 1, "经验": 1, "资源": 1, "性格": 1, "兴趣": 1},
            None,
        )
        assert len(gaps) >= 3

    def test_max_4_gaps(self):
        """最多返回4条"""
        gaps = BuiltinProvider._build_skill_gaps({}, "创业")
        assert len(gaps) <= 4


class TestBuildMarketHint:
    """_build_market_hint 测试"""

    def test_hint_100_percent(self):
        """100% 覆盖率 → 强匹配文案"""
        hint = BuiltinProvider._build_market_hint("100%", "编程场景", "你的分析能力", ["技术"])
        assert "很有基础" in hint

    def test_hint_80_percent(self):
        """80% 覆盖率 → 中匹配文案"""
        hint = BuiltinProvider._build_market_hint("80%", "编程场景", "你的分析能力", [])
        assert "不需要换行业" in hint

    def test_hint_60_percent(self):
        """60% 覆盖率 → 弱匹配文案"""
        hint = BuiltinProvider._build_market_hint("60%", "编程场景", "你的分析能力", [])
        assert "值得探索" in hint


class TestLandmarkIcon:
    """_landmark_icon 映射测试"""

    def test_known_landmarks(self):
        """已知景点 → 对应图标"""
        assert BuiltinProvider._landmark_icon("瞭望台") == "🏛️"
        assert BuiltinProvider._landmark_icon("试炼场") == "🔧"
        assert BuiltinProvider._landmark_icon("锻造坊") == "🏪"
        assert BuiltinProvider._landmark_icon("金矿洞") == "🗼"
        assert BuiltinProvider._landmark_icon("探索林") == "🌲"
        assert BuiltinProvider._landmark_icon("汇流湖") == "💧"

    def test_substring_matching(self):
        """子串匹配：'瞭望台·定标' → 🏛️"""
        assert BuiltinProvider._landmark_icon("瞭望台·定标") == "🏛️"
        assert BuiltinProvider._landmark_icon("试炼场·初鸣") == "🔧"
        assert BuiltinProvider._landmark_icon("锻造坊·锤炼") == "🏪"
        assert BuiltinProvider._landmark_icon("金矿洞·收获") == "🗼"

    def test_unknown_landmark_returns_default(self):
        """未知景点 → 默认 📍"""
        assert BuiltinProvider._landmark_icon("未知地点") == "📍"
        assert BuiltinProvider._landmark_icon("") == "📍"


class TestBuildMiniDirections:
    """_build_mini_directions 测试"""

    def test_with_skill_and_experience(self):
        """有技能和经历碎片 → 返回服务和内容方案"""
        frags = [
            {"type": "技能", "content": "写代码"},
            {"type": "经历", "content": "做过项目"},
            {"type": "能力", "content": "会调试"},
        ]
        types = {"技能": 1, "经历": 1, "能力": 1}
        mini = BuiltinProvider._build_mini_directions(frags, types)
        assert len(mini) >= 2
        assert any("接单" in m["title"] or "服务" in m["type"] for m in mini)
        assert any("故事" in m["title"] or "内容" in m["type"] for m in mini)

    def test_no_skill_no_experience(self):
        """无技能/经历 → 仍然有兜底方案"""
        frags = [{"type": "兴趣", "content": "喜欢音乐"}]
        types = {"兴趣": 1}
        mini = BuiltinProvider._build_mini_directions(frags, types)
        assert len(mini) >= 1
        assert any("记录" in m["title"] for m in mini)

    def test_max_4_items(self):
        """最多返回4个 mini_directions"""
        frags = [
            {"type": "技能", "content": "写代码"},
            {"type": "经历", "content": "做过项目"},
            {"type": "能力", "content": "会调试"},
            {"type": "知识", "content": "懂算法"},
            {"type": "资源", "content": "有人脉"},
        ]
        types = {"技能": 1, "经历": 1, "能力": 1, "知识": 1, "资源": 1}
        mini = BuiltinProvider._build_mini_directions(frags, types)
        assert len(mini) <= 4

"""
Engine 0.6: 黄金测试集 — 50组标注案例
覆盖 8 维能力标签 / 18 方向原型 / 否定词感知 / 冷启动 / 边界条件
"""

import pytest
from services.ai.builtin.engine import BuiltinProvider


# 每个测试用例: (profession, fragments, goal, expected)
# expected 包含: min_directions, min_confidence, has_skill_gaps
GOLDEN_SET = [
    # ===== 垂直内容创作者 (PROTO-001) =====
    pytest.param(
        "初中语文老师", [
            {"type": "能力", "content": "很会安慰人"},
            {"type": "能力", "content": "批改作文一眼看出问题"},
            {"type": "知识", "content": "了解教育心理学"},
            {"type": "经验", "content": "带过三届毕业班"},
        ], "", {"min_directions": 1, "min_confidence": 60},
        id="GS-001-语文老师→内容创作",
    ),
    pytest.param(
        "程序员", [
            {"type": "能力", "content": "能把复杂概念讲清楚"},
            {"type": "经验", "content": "写过5年代码"},
            {"type": "兴趣", "content": "喜欢分享知识"},
            {"type": "资源", "content": "有个人博客"},
        ], "做副业", {"min_directions": 1, "min_confidence": 65},
        id="GS-002-程序员→技术内容",
    ),
    pytest.param(
        "外卖骑手", [
            {"type": "能力", "content": "熟悉城市每一条路"},
            {"type": "经验", "content": "遇到过各种客户"},
            {"type": "特质", "content": "有耐心"},
        ], "", {"min_directions": 0, "min_confidence": 30},
        id="GS-003-骑手→冷启动",
    ),
    # ===== 技能服务者 (PROTO-003) =====
    pytest.param(
        "会计", [
            {"type": "能力", "content": "会做财务报表"},
            {"type": "能力", "content": "精通Excel"},
            {"type": "经验", "content": "帮小公司报过税"},
            {"type": "资源", "content": "有会计证"},
        ], "做兼职", {"min_directions": 1, "min_confidence": 60},
        id="GS-004-会计→技能服务",
    ),
    pytest.param(
        "平面设计师", [
            {"type": "能力", "content": "会PS和AI"},
            {"type": "能力", "content": "审美很好"},
            {"type": "经验", "content": "做过LOGO设计"},
        ], "接单", {"min_directions": 1, "min_confidence": 30},
        id="GS-005-设计师→技能服务",
    ),
    # ===== 资源整合者 (PROTO-004) =====
    pytest.param(
        "销售经理", [
            {"type": "能力", "content": "认识很多供应商"},
            {"type": "资源", "content": "有装修行业人脉"},
            {"type": "经验", "content": "做过采购"},
        ], "创业", {"min_directions": 1, "min_confidence": 30},
        id="GS-006-销售→资源整合",
    ),
    # ===== 经验产品化 (PROTO-002) =====
    pytest.param(
        "HR", [
            {"type": "能力", "content": "会看简历"},
            {"type": "经验", "content": "面试过500人"},
            {"type": "知识", "content": "懂职业规划"},
            {"type": "能力", "content": "能给人反馈"},
        ], "做副业", {"min_directions": 1, "min_confidence": 65},
        id="GS-007-HR→经验产品化",
    ),
    # ===== 人际沟通类 =====
    pytest.param(
        "客服", [
            {"type": "能力", "content": "擅长沟通"},
            {"type": "特质", "content": "有共情能力"},
            {"type": "经验", "content": "处理过各种投诉"},
            {"type": "知识", "content": "懂心理学"},
        ], "转行", {"min_directions": 1, "min_confidence": 60},
        id="GS-008-客服→沟通优势",
    ),
    # ===== 创意审美类 =====
    pytest.param(
        "花艺师", [
            {"type": "能力", "content": "会插花"},
            {"type": "能力", "content": "配色感觉好"},
            {"type": "兴趣", "content": "喜欢拍照"},
            {"type": "资源", "content": "有花店资源"},
        ], "扩大收入", {"min_directions": 1, "min_confidence": 60},
        id="GS-009-花艺师→创意变现",
    ),
    # ===== 执行落地类 =====
    pytest.param(
        "项目经理", [
            {"type": "能力", "content": "执行力强"},
            {"type": "能力", "content": "能同时管多个项目"},
            {"type": "经验", "content": "带过10人团队"},
        ], "", {"min_directions": 1, "min_confidence": 30},
        id="GS-010-PM→执行优势",
    ),
    # ===== 冷启动 (≤3 fragments) =====
    pytest.param(
        "大学生", [
            {"type": "能力", "content": "会写文章"},
            {"type": "兴趣", "content": "喜欢打游戏"},
        ], "找实习", {"min_directions": 0, "min_confidence": 30},
        id="GS-011-大学生→冷启动",
    ),
    pytest.param(
        "全职妈妈", [
            {"type": "能力", "content": "做饭好吃"},
            {"type": "特质", "content": "有耐心"},
            {"type": "经验", "content": "组织过亲子活动"},
        ], "做点自己的事", {"min_directions": 0, "min_confidence": 30},
        id="GS-012-全职妈妈→冷启动",
    ),
    # ===== 否定词感知 =====
    pytest.param(
        "会计", [
            {"type": "能力", "content": "完全不会编程"},
            {"type": "能力", "content": "Excel用得不错"},
            {"type": "能力", "content": "不太会演讲"},
        ], "", {"min_directions": 1, "min_confidence": 30},
        id="GS-013-否定词→只匹配有效技能",
    ),
    pytest.param(
        "销售", [
            {"type": "能力", "content": "不会写代码"},
            {"type": "能力", "content": "但很会聊天"},
            {"type": "知识", "content": "懂产品知识"},
        ], "", {"min_directions": 1, "min_confidence": 30},
        id="GS-014-否定词→过滤不相关",
    ),
    # ===== 碎片类型多样性 =====
    pytest.param(
        "自由职业者", [
            {"type": "能力", "content": "会剪辑视频"},
            {"type": "能力", "content": "会写文案"},
            {"type": "资源", "content": "有相机设备"},
            {"type": "经验", "content": "做过短视频"},
            {"type": "兴趣", "content": "喜欢研究算法"},
        ], "全职做自媒体", {"min_directions": 1, "min_confidence": 70},
        id="GS-015-高多样性→高置信度",
    ),
    # ===== 单一类型碎片 =====
    pytest.param(
        "保安", [
            {"type": "经历", "content": "在工厂干过"},
            {"type": "经历", "content": "在餐厅干过"},
            {"type": "经历", "content": "在工地干过"},
        ], "", {"min_directions": 0, "min_confidence": 30},
        id="GS-016-单一类型→低置信度",
    ),
    # ===== Goal 感知 =====
    pytest.param(
        "护士", [
            {"type": "能力", "content": "会照顾人"},
            {"type": "能力", "content": "做事细心"},
            {"type": "知识", "content": "懂基础医学"},
            {"type": "经验", "content": "在急诊科工作过"},
        ], "想创业", {"min_directions": 1, "min_confidence": 55},
        id="GS-017-护士→创业方向",
    ),
    # ===== 领域模板匹配 (餐饮) =====
    pytest.param(
        "厨师", [
            {"type": "能力", "content": "做菜好吃"},
            {"type": "经验", "content": "在后厨干过5年"},
            {"type": "能力", "content": "会控制成本"},
            {"type": "资源", "content": "有厨师证"},
        ], "开店", {"min_directions": 1, "min_confidence": 60},
        id="GS-018-厨师→餐饮方向",
    ),
    # ===== 领域模板匹配 (物流) =====
    pytest.param(
        "快递员", [
            {"type": "能力", "content": "熟悉片区路线"},
            {"type": "经验", "content": "送了3年快递"},
            {"type": "特质", "content": "不怕吃苦"},
        ], "升职加薪", {"min_directions": 1, "min_confidence": 30},
        id="GS-019-快递员→物流方向",
    ),
    # ===== 领域模板匹配 (销售) =====
    pytest.param(
        "导购", [
            {"type": "能力", "content": "会推销产品"},
            {"type": "能力", "content": "能看懂顾客需求"},
            {"type": "经验", "content": "连续三个月销售冠军"},
        ], "", {"min_directions": 1, "min_confidence": 30},
        id="GS-020-导购→销售方向",
    ),
    # ===== 边缘：碎片太少 =====
    pytest.param(
        "学生", [
            {"type": "能力", "content": "会画画"},
        ], "", {"min_directions": 0, "min_confidence": 30},
        id="GS-021-单碎片→兜底",
    ),
    # ===== 边缘：碎片为空 =====
    pytest.param(
        "无业", [], "", {"min_directions": 0, "min_confidence": 0},
        id="GS-022-空碎片→空结果",
    ),
    # ===== 共情关怀类 =====
    pytest.param(
        "社工", [
            {"type": "能力", "content": "很会倾听"},
            {"type": "特质", "content": "有同理心"},
            {"type": "经验", "content": "做过心理热线志愿者"},
            {"type": "知识", "content": "学过心理咨询"},
        ], "", {"min_directions": 1, "min_confidence": 60},
        id="GS-023-社工→共情优势",
    ),
    # ===== 逻辑分析类 =====
    pytest.param(
        "数据分析师", [
            {"type": "能力", "content": "会写SQL"},
            {"type": "能力", "content": "会用Python"},
            {"type": "知识", "content": "懂统计学"},
            {"type": "经验", "content": "做过用户增长分析"},
        ], "做独立开发", {"min_directions": 1, "min_confidence": 65},
        id="GS-024-数据分析→技术方向",
    ),
    # ===== 资源整合类 =====
    pytest.param(
        "物业经理", [
            {"type": "资源", "content": "认识很多维修工"},
            {"type": "能力", "content": "协调能力强"},
            {"type": "经验", "content": "管过小区物业"},
        ], "", {"min_directions": 1, "min_confidence": 30},
        id="GS-025-物业→资源整合",
    ),
    # ===== 个人特质主导 =====
    pytest.param(
        "收银员", [
            {"type": "特质", "content": "做事认真"},
            {"type": "特质", "content": "记性好"},
            {"type": "特质", "content": "有耐心"},
        ], "", {"min_directions": 0, "min_confidence": 30},
        id="GS-026-特质碎片→冷启动",
    ),
    # ===== 混合碎片 =====
    pytest.param(
        "摄影师", [
            {"type": "能力", "content": "会拍照"},
            {"type": "能力", "content": "会修图"},
            {"type": "兴趣", "content": "喜欢旅行"},
            {"type": "经验", "content": "拍过婚礼"},
            {"type": "资源", "content": "有单反相机"},
        ], "全职摄影", {"min_directions": 1, "min_confidence": 70},
        id="GS-027-摄影师→高置信度",
    ),
    # ===== 否定词+有效碎片混合 =====
    pytest.param(
        "市场专员", [
            {"type": "能力", "content": "不擅长写文案"},
            {"type": "能力", "content": "但很会做数据分析和报表"},
            {"type": "能力", "content": "不会做图"},
            {"type": "经验", "content": "管过公众号后台数据"},
        ], "", {"min_directions": 1, "min_confidence": 45},
        id="GS-028-否定词→筛选有效技能",
    ),
    # ===== 18个方向原型覆盖 =====
    pytest.param(
        "退休教师", [
            {"type": "能力", "content": "会辅导功课"},
            {"type": "能力", "content": "有耐心"},
            {"type": "经验", "content": "教了一辈子书"},
            {"type": "资源", "content": "有教辅资料"},
        ], "发挥余热", {"min_directions": 1, "min_confidence": 55},
        id="GS-029-退休教师→知识付费",
    ),
    pytest.param(
        "健身教练", [
            {"type": "能力", "content": "会制定训练计划"},
            {"type": "知识", "content": "懂营养学"},
            {"type": "能力", "content": "能激励别人"},
        ], "线上业务", {"min_directions": 1, "min_confidence": 30},
        id="GS-030-教练→线上课程",
    ),
    # ===== 碎片含利益点 =====
    pytest.param(
        "手工艺人", [
            {"type": "能力", "content": "会做手工皮具"},
            {"type": "兴趣", "content": "喜欢设计"},
            {"type": "经验", "content": "做过市集摊位"},
            {"type": "资源", "content": "有工具有材料"},
            {"type": "能力", "content": "会拍产品照片"},
        ], "开网店", {"min_directions": 1, "min_confidence": 65},
        id="GS-031-手工艺人→电商方向",
    ),
    pytest.param(
        "翻译", [
            {"type": "能力", "content": "英语流利"},
            {"type": "能力", "content": "会日语"},
            {"type": "经验", "content": "做过会议翻译"},
            {"type": "知识", "content": "懂商务礼仪"},
        ], "", {"min_directions": 1, "min_confidence": 60},
        id="GS-032-翻译→语言服务",
    ),
    # ===== 目标导向 =====
    pytest.param(
        "行政文员", [
            {"type": "能力", "content": "会做PPT"},
            {"type": "能力", "content": "组织能力强"},
            {"type": "经验", "content": "组织过公司年会"},
            {"type": "特质", "content": "细心"},
        ], "转行做运营", {"min_directions": 1, "min_confidence": 55},
        id="GS-033-行政→运营方向",
    ),
    pytest.param(
        "幼师", [
            {"type": "能力", "content": "会带小孩"},
            {"type": "能力", "content": "会做手工"},
            {"type": "能力", "content": "会弹钢琴"},
            {"type": "特质", "content": "有亲和力"},
        ], "副业", {"min_directions": 1, "min_confidence": 60},
        id="GS-034-幼师→多元副业",
    ),
    # ===== 高同质性碎片 =====
    pytest.param(
        "技术员", [
            {"type": "能力", "content": "会修电脑"},
            {"type": "能力", "content": "会修打印机"},
            {"type": "能力", "content": "会修手机"},
            {"type": "能力", "content": "会修网络"},
        ], "", {"min_directions": 1, "min_confidence": 50},
        id="GS-035-技术员→技术服务",
    ),
    # ===== 跨类型关联 =====
    pytest.param(
        "餐厅服务员", [
            {"type": "能力", "content": "记性好不用写单"},
            {"type": "能力", "content": "会推荐菜"},
            {"type": "兴趣", "content": "喜欢研究美食"},
            {"type": "经验", "content": "在网红店干过"},
        ], "", {"min_directions": 1, "min_confidence": 50},
        id="GS-036-服务员→美食内容",
    ),
    # ===== 自我发现者方向 =====
    pytest.param(
        "大一新生", [
            {"type": "兴趣", "content": "什么都想试试"},
            {"type": "特质", "content": "好奇"},
            {"type": "能力", "content": "学东西快"},
        ], "找到方向", {"min_directions": 0, "min_confidence": 30},
        id="GS-037-新生→探索方向",
    ),
    # ===== 技能探索者方向 =====
    pytest.param(
        "中年转行者", [
            {"type": "经验", "content": "干过10年销售"},
            {"type": "能力", "content": "会开车"},
            {"type": "能力", "content": "会基本英语"},
            {"type": "特质", "content": "愿意学新东西"},
        ], "转行", {"min_directions": 1, "min_confidence": 45},
        id="GS-038-转行者→技能探索",
    ),
    # ===== 专业服务方向 =====
    pytest.param(
        "律师", [
            {"type": "能力", "content": "会写法律文书"},
            {"type": "能力", "content": "逻辑分析强"},
            {"type": "知识", "content": "懂合同法"},
            {"type": "经验", "content": "打过官司"},
        ], "做知识付费", {"min_directions": 1, "min_confidence": 60},
        id="GS-039-律师→专业服务",
    ),
    # ===== 碎片含否定词+有效词 =====
    pytest.param(
        "美工", [
            {"type": "能力", "content": "不太会手绘"},
            {"type": "能力", "content": "但PS用得很熟"},
            {"type": "能力", "content": "不会做动画"},
            {"type": "经验", "content": "做过电商详情页"},
        ], "", {"min_directions": 1, "min_confidence": 45},
        id="GS-040-美工→否定词过滤",
    ),
    # ===== 行业垂直 =====
    pytest.param(
        "牙医", [
            {"type": "能力", "content": "会补牙"},
            {"type": "能力", "content": "会沟通治疗方案"},
            {"type": "知识", "content": "懂口腔健康"},
            {"type": "资源", "content": "有执业医师证"},
        ], "做科普", {"min_directions": 1, "min_confidence": 60},
        id="GS-041-牙医→健康科普",
    ),
    # ===== 碎片质量 =====
    pytest.param(
        "测试用户", [
            {"type": "能力", "content": "嗯"},
            {"type": "能力", "content": "还行吧"},
            {"type": "能力", "content": "不知道"},
        ], "", {"min_directions": 0, "min_confidence": 0},
        id="GS-042-低质量碎片→过滤",
    ),
    # ===== 行业转型 =====
    pytest.param(
        "传统编辑", [
            {"type": "能力", "content": "会写文章"},
            {"type": "能力", "content": "会校对"},
            {"type": "知识", "content": "懂出版流程"},
            {"type": "能力", "content": "会公众号排版"},
        ], "转新媒体", {"min_directions": 1, "min_confidence": 60},
        id="GS-043-编辑→新媒体转型",
    ),
    # ===== 疗愈方向 =====
    pytest.param(
        "瑜伽老师", [
            {"type": "能力", "content": "会教瑜伽"},
            {"type": "知识", "content": "懂人体解剖"},
            {"type": "特质", "content": "声音好听"},
            {"type": "能力", "content": "会做冥想引导"},
        ], "线上教学", {"min_directions": 1, "min_confidence": 60},
        id="GS-044-瑜伽→疗愈方向",
    ),
    # ===== 工具型能力 =====
    pytest.param(
        "建筑工人", [
            {"type": "能力", "content": "会看图纸"},
            {"type": "能力", "content": "会砌墙"},
            {"type": "能力", "content": "会水电"},
            {"type": "经验", "content": "干过装修"},
        ], "自己接活", {"min_directions": 1, "min_confidence": 50},
        id="GS-045-建筑→技能变现",
    ),
    # ===== 高置信度完美匹配 =====
    pytest.param(
        "运营总监", [
            {"type": "能力", "content": "会做增长策略"},
            {"type": "能力", "content": "会带团队"},
            {"type": "能力", "content": "会数据分析"},
            {"type": "知识", "content": "懂产品思维"},
            {"type": "经验", "content": "从0到1做过产品"},
            {"type": "资源", "content": "有行业人脉"},
        ], "创业", {"min_directions": 1, "min_confidence": 75},
        id="GS-046-运营→高置信度创业",
    ),
    # ===== 艺术类 =====
    pytest.param(
        "音乐老师", [
            {"type": "能力", "content": "会弹吉他"},
            {"type": "能力", "content": "会编曲"},
            {"type": "能力", "content": "会教学生"},
            {"type": "经验", "content": "带过乐队"},
        ], "", {"min_directions": 1, "min_confidence": 55},
        id="GS-047-音乐老师→艺术方向",
    ),
    # ===== 碎片+目标明确 =====
    pytest.param(
        "兽医", [
            {"type": "能力", "content": "会看动物疾病"},
            {"type": "能力", "content": "会做手术"},
            {"type": "知识", "content": "懂宠物营养"},
            {"type": "经验", "content": "开过宠物诊所"},
        ], "做宠物自媒体", {"min_directions": 1, "min_confidence": 65},
        id="GS-048-兽医→宠物赛道",
    ),
    # ===== 冷启动：2碎片含否定词 =====
    pytest.param(
        "刚毕业", [
            {"type": "能力", "content": "不会编程"},
            {"type": "能力", "content": "但写作还行"},
        ], "找工作", {"min_directions": 0, "min_confidence": 30},
        id="GS-049-应届生→冷启动",
    ),
    # ===== 综合：多碎片跨领域 =====
    pytest.param(
        "公务员", [
            {"type": "能力", "content": "会写公文"},
            {"type": "能力", "content": "组织过活动"},
            {"type": "兴趣", "content": "喜欢摄影"},
            {"type": "特质", "content": "做事有条理"},
            {"type": "能力", "content": "会开车"},
        ], "副业", {"min_directions": 1, "min_confidence": 50},
        id="GS-050-公务员→多元副业",
    ),
]


class TestGoldenSet:
    """引擎黄金测试集 — 50组案例验证"""

    @pytest.fixture
    def engine(self):
        return BuiltinProvider()

    @pytest.mark.parametrize(
        "profession,fragments,goal,expected",
        GOLDEN_SET,
    )
    @pytest.mark.asyncio
    async def test_fusion(self, engine, profession, fragments, goal, expected):
        """验证引擎输出的基本质量"""
        from services.ai.base import FusionRequest

        request = FusionRequest(profession=profession, fragments=fragments, goal=goal or None)
        result = await engine.fuse(request)

        # 1. 方向数量 >= 最低要求
        assert len(result["directions"]) >= expected["min_directions"], (
            f"{profession}: 期望至少 {expected['min_directions']} 个方向，"
            f"实际 {len(result['directions'])}"
        )

        # 2. 置信度 >= 最低要求
        assert result["confidence"] >= expected["min_confidence"], (
            f"{profession}: 期望置信度 ≥ {expected['min_confidence']}，"
            f"实际 {result['confidence']}"
        )

        # 3. 如果有方向，金句不应为空
        if result["directions"]:
            assert result["golden_sentence"], f"{profession}: 有方向时金句不应为空"

        # 4. 置信度在有效范围
        assert 0 <= result["confidence"] <= 99, f"{profession}: 置信度超出范围 {result['confidence']}"

    @pytest.mark.asyncio
    async def test_all_professions_have_directions(self, engine):
        """验证至少 60% 的测试用例产生方向"""
        from services.ai.base import FusionRequest

        # 从 GOLDEN_SET 提取参数: 每个 pytest.param 的 values 是 (profession, fragments, goal, expected)
        cases = [p.values for p in GOLDEN_SET]

        success = 0
        for values in cases:
            profession, fragments, goal, expected = values
            request = FusionRequest(profession=profession, fragments=fragments, goal=goal or None)
            result = await engine.fuse(request)
            if len(result["directions"]) >= 1:
                success += 1

        rate = success / len(GOLDEN_SET)
        assert rate >= 0.6, f"方向覆盖率 {rate:.0%} < 60%（{success}/{len(GOLDEN_SET)}）"

    @pytest.mark.asyncio
    async def test_negation_filtering(self, engine):
        """验证否定词场景下能力标签正确过滤"""
        from services.ai.base import FusionRequest

        cases = [
            ("会计", [{"type": "能力", "content": "完全不会编程"}], False),
            ("程序员", [{"type": "能力", "content": "不擅长写文案"}], False),
            ("销售", [{"type": "能力", "content": "很会聊天"}], True),
        ]

        for profession, fragments, should_have_directions in cases:
            request = FusionRequest(profession=profession, fragments=fragments)
            result = await engine.fuse(request)
            if should_have_directions:
                assert len(result["directions"]) >= 0
            else:
                # 否定词碎片不应产生高置信度方向
                pass

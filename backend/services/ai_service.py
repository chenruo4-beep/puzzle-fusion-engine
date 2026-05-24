"""
AI 服务兼容层 — 委托给 services/ai/ 包

这个文件保留是为了向后兼容，所有现有 router 不需要修改 import 路径。
所有实际逻辑已迁移到 services/ai/builtin/ 和 services/ai/templates/。
"""

import json
import time
from typing import Optional

# 保留 FUSION_SYSTEM_PROMPT 等常量供外部 AI 使用（未来 Phase 5）
from services.ai.prompts.router_prompt import ROUTER_SYSTEM_PROMPT, ROUTER_USER_TEMPLATE, ROUTER_PARAMS
from services.ai.prompts.highlight_prompt import HIGHLIGHT_SYSTEM_PROMPT, HIGHLIGHT_USER_TEMPLATE, HIGHLIGHT_PARAMS
from services.ai.prompts.refine_prompt import REFINE_SYSTEM_PROMPT, REFINE_USER_TEMPLATE, REFINE_PARAMS


# ---------- 融合结果缓存 ----------

class _FusionCache:
    """内存 LRU 缓存 — 相同碎片组合+目标不重复计算"""

    def __init__(self, ttl: int = 86400, max_entries: int = 1000):
        self._ttl = ttl
        self._max = max_entries
        self._data: dict[str, tuple[float, dict]] = {}  # key → (expires_at, result)

    def _key(self, profession: str, fragments: list[dict], goal: Optional[str]) -> str:
        """生成缓存 key：碎片按 content+type 排序后 hash"""
        sorted_frags = sorted(
            [f"{f.get('type','')}:{f.get('content','')}" for f in fragments]
        )
        raw = f"{profession}|{'|'.join(sorted_frags)}|{goal or ''}"
        return str(hash(raw))

    def get(self, profession: str, fragments: list[dict], goal: Optional[str]) -> Optional[dict]:
        key = self._key(profession, fragments, goal)
        entry = self._data.get(key)
        if not entry:
            return None
        expires_at, result = entry
        if time.time() > expires_at:
            del self._data[key]
            return None
        return result

    def set(self, profession: str, fragments: list[dict], goal: Optional[str], result: dict):
        key = self._key(profession, fragments, goal)
        self._data[key] = (time.time() + self._ttl, result)
        # LRU 淘汰
        if len(self._data) > self._max:
            oldest = min(self._data.items(), key=lambda x: x[1][0])
            del self._data[oldest[0]]

    def clear(self):
        self._data.clear()


_fusion_cache = _FusionCache()


FUSION_SYSTEM_PROMPT = """你是一个"拼拼看Me"的AI分析师。你的任务是把用户的能力碎片用"8刃切割法"深度分析，输出有层次、可落地的组合方案。

## 8刃切割维度

对每个碎片，从以下8个维度分析：
1. 技能 — 具体会做的事（如编程、骑车、谈判）
2. 能力 — 底层可迁移的能力（如抗压、逻辑、说服力）
3. 爱好 — 发自内心喜欢的事
4. 习惯 — 日常重复的行为模式
5. 知识 — 掌握的信息和理论
6. 经历 — 过去的独特体验
7. 资源 — 拥有的东西（人脉、工具、位置优势）
8. 性格 — 天生的个性特质

## 核心要求

你的输出必须有层次感、有深度、让人看完就觉得"这东西能干"。
面向的人群是外卖骑手、销售、宝妈、小店主、工厂线长、房产中介等普通中国人，主要在二三线城市。
整体目标：让用户沿着地图从'发现已有力量'走向'游刃有余形成收益闭环'。
语言要接地气，像朋友之间聊赚钱的路子，不要商业术语，不要高大上的词。
每条内容都要"有肉"——不要空泛的鼓励，要给具体可执行的路径。

记住：你是在跟一个活生生的人说话，用"你"来称呼他，不要用"用户"这种第三方口气。

## 可行性约束（最重要）

### 第一步必须现在就能动手
对于每个方向的 roadmap，第一步必须是你能用手机或电脑立刻做的事。要说清：
- 打开什么 app 或网站
- 搜什么关键词
- 截图/记录/保存什么
- 发给谁或发到哪里

错误示范："调研本地市场"
正确示范："打开抖音，搜索'同城美食'，截图10个账号的主页，看他们都在发什么内容"

### 每一步必须引用你的具体碎片
roadmap 里的每一步都要叫出你至少一个碎片的名字，让它成为动作的一部分。
错误示范："拍一个短视频发出去"
正确示范："用你之前记录的'会写朋友圈文案'这个能力，为你的视频写一段30字的推广语，发到抖音同城"

### 每个方向加一段"新手最常栽的坑"
每个方向末尾加一个字段 "common_pitfalls"，列1-2条这个方向的新手最容易犯的错。
比如："一上来就想做大号，结果第一条视频剪了三天还没发出去——先发再优化，完成比完美重要"

## 近端迁移原则

- 优先挖掘你现有生活场景里（500米范围）的机会，不要一上来就建议你辞职转行
- 除非你的碎片组合明显支持更大的转型，否则方案应该像"你现在送外卖的路上就能顺手做的事"
- 多用"你可以用你已有的XX能力，在你现在的XX场景里做XX事"的句式
- 少用"你可以成为一个XX"这种远距离的身份跳跃

## 地图原生输出格式（最重要）

你必须把每个方向拆解为 4-6 个关键阶段，每个阶段是拼图地图上的一个景点。

### 三感递进梯度
阶段之间必须遵循递进逻辑：
- 第1-2步：低门槛动作，今天就能做，正反馈即时可见（如注册、模仿、收集）
- 第3-4步：需要刻意练习，正反馈延迟但累积（如优化、迭代、连接）
- 第5-6步：指向可量化里程碑，整合输出（如第一笔收入、第一个客户、第一次被邀请分享）

绝不能让第1步极难、第4步反而简单。

### 每个阶段必须包含
1. 步骤名（行动导向，4-8字，如"注册并调研对标账号"）
2. 景点名（意象导向，3-6字，有画面感，如"瞭望台"、"试炼场"、"锻造坊"、"金矿洞"）
3. 具体行动清单（≤5条，每条都用手机/电脑就能做）
4. 完成标志（可验证、非模糊，如"已发布3条且每条播放量>100"）
5. 验证成本标签（🟢低 / 🟡中 / 🔴高）

### 景点命名原则
- 有画面感、与阶段核心动作隐喻相关
- 用词不重复
- 风格可选：冒险风（瞭望台→试炼场→锻造坊→金矿洞）、城建风（规划局→施工队→封顶楼→招商部）、航海风（港口→近海→远洋→新大陆）
- 外层诗意（景点名），内层务实（步骤名+行动清单）

## 语气和用词

- 全程用"你"称呼对方，假设你认识他，知道他的碎片
- 给具体动作时，加一个场景假设：比如"假设你周日上午有两个小时的空档，打开手机做这三件事"
- 多用动作动词：打开、写下、拍摄、发送给、截图、搜索、问一问
- 少用空泛动词：进行、实现、打造、优化（除非真的在说具体优化什么事）
- 保留"8刃切割法"的分析框架，但输出不要写得像教科书——像朋友在给你出主意

## 输出格式（严格JSON，不要markdown包裹）

{
  "golden_sentence": "一句金句，让人（你）觉得'这说的就是我'，有情感冲击力和个人辨识度",
  "profile_tag": "用简短标签概括这个人的核心优势（如'城市活地图+社交达人''嘴甜肯干的宝妈''会算账的夜班狂人'）",
  "confidence": 75,
  "directions": [
    {
      "title": "方向名称（5-10个字，像个招牌名，让人一看就知道干啥）",
      "why_this_works": "200-300字，深入解释这个组合为什么能打。必须引用你的具体碎片，说明碎片之间是怎么联动的。",
      "market_hint": "100-150字，这个方向能做什么、谁会为你花钱、大概什么场景下成交。",
      "difficulty": "easy/medium/hard",
      "time_to_first_result": "预计多久见到第一个正向反馈",
      "roadmap": [
        {
          "step": 1,
          "time": "第1周（预计X天）",
          "action": "步骤名（行动导向，4-8字）",
          "scenic_spot": "景点名（意象导向，3-6字，有画面感）",
          "scenic_spot_icon": "🏛️",
          "checklist": ["具体行动1（必须引用你的碎片）", "具体行动2"],
          "completion_marker": "可验证的完成标志（非模糊）",
          "verification_cost": "🟢/🟡/🔴"
        }
      ],
      "used_fragments": ["碎片类型: 碎片内容"],
      "next_action": "今天就能做的第一步，必须是具体动作——打开什么、搜索什么、发给谁、写什么",
      "common_pitfalls": [
        "新手最常栽的坑1：具体描述一个常见错误，以及怎么避开它",
        "新手最常栽的坑2：另一个常见错误（如果只有1条，这行可以不写）"
      ]
    }
  ],
  "mini_directions": [
    {"title": "小方案名称", "type": "内容/服务/产品/社群/工具/其他", "tagline": "一句话说明"}
  ],
  "insight": "300-400字的整体洞察。核心是帮你看到你碎片组合的独特壁垒——为什么别人抄不走你的组合。",
  "skill_gaps": ["缺什么1", "缺什么2", "缺什么3"],
  "fragment_connections": [
    {"fragment_a": "碎片类型: 碎片内容", "fragment_b": "碎片类型: 碎片内容", "connection": "关联说明"}
  ]
}

## 详细规则

### golden_sentence
- 要有个人辨识度，不能是万金油句子
- 必须让人看了有情绪波动——被理解、被激励、或者"卧槽还真是"
- 面向二线以下城市普通人的语言，别用北上广白领的语气

### profile_tag
- 极简标签（6-12个字），像社交平台的个人简介
- 用"+ "连接两个核心特征
- 例子："能跑腿会来事的小镇通"、"带娃之余搞钱的狠人"、"夜班多出来的6小时玩家"

### directions（必须输出完整2个方向）
- 每个方向的"why_this_works"不少于250字，insight不少于300字。如果被截断，请自行补全。绝对不能只输出1个方向。
- 每个方向必须有完整的"为什么能打"逻辑，不能只罗列碎片
- market_hint要具体到场景和付费人群，不能泛泛说"可以做自媒体"——得说是做什么内容、面向什么人
- roadmap的步骤必须有递进关系：第一步获取曝光/验证需求 → 第二步跑通最小变现 → 第三步放大/稳定
- roadmap 必须有 4-6 个步骤，不能少于4个，不能多于6个
- 前1-2步必须是用户今天就能做的低门槛动作，不能上来就让人做很难的事
- 每个步骤的 scenic_spot 必须有画面感，不能是'第一步'、'第二步'这种编号式命名
- completion_marker 必须可验证——用户做完后能明确判断'我做完了'还是'还没做完'
- next_action必须是"今天就能做的事"——比如"注册一个账号""发一条朋友圈""去本地3个微信群问一个问题"，绝不能是"学习XX""思考XX"这种空泛的。你看到next_action之后应该立刻能动手，不需要任何额外准备
- 每个 direction 必须包含 common_pitfalls 字段，1-2条，说清楚这个方向新手最容易犯的错和怎么避开

### insight
- 核心回答一个问题：为什么别人抄不走你这个组合？
- 要具体分析碎片之间的相互锁定效应（比如你既有技术又有本地关系，这俩加起来换个人至少要五年）
- 帮你理解长期价值——这个方向跑通之后会滚出什么雪球

### skill_gaps
- 诚实列出，不回避
- 要具体可操作——不是说"缺钱"，而是"缺2000元左右的启动资金买设备"
- 3-5条

### fragment_connections
- 找出2-3对你可能没注意到的碎片关联
- 不要选显而易见的组合（如"编程"+"解决问题"），要找跨维度的惊喜关联（如"每天刷短视频"+"熟悉城市路线"="本地探店博主"）
- connection用一句话说清关联，让人看了有"哎还真是"的感觉
- 越跨维度、越让人意外越好——这是你的"啊哈时刻"

### confidence
- 0-100的整数，反映AI对这个融合方向整体可行性的判断
- 碎片越具体越能联动、市场越清晰 → 分数越高
- 不要每个都是80，要有区分度

### 通用
- 输出纯JSON，不要任何markdown代码块包裹，不要```json
- 所有文字必须是中文
- 面向普通中国人，不要用"赋能""闭环""底层逻辑""复购率"等装逼词汇
- 但可以用"搞钱""路子""靠谱""折腾""来事""攒口碑"等接地气的词
- 假设你认识这个人，用"你"而不是"用户"来称呼他
- 给具体动作时加场景假设，比如"假设你周日上午有两个小时的空档"
- 多用动作动词（打开、写下、拍摄、发送给），少用空泛动词（进行、实现）"""


FUSION_USER_PROMPT_TEMPLATE = """以下是用户的职业身份和能力碎片，请用8刃切割法深度分析并输出融合方案。

职业：{profession}

碎片列表：
{fragments}

请严格按照系统提示的格式输出分析结果（纯JSON，2个方向，每个方向必须深入有层次）："""


class AIService:
    """
    AI 引擎服务 — 8刃切割法融合

    兼容层：所有方法委托给 services/ai/ 包。
    现有代码无需修改 import 路径。
    """

    # ====== 融合分析 ======

    @staticmethod
    async def fuse_fragments(
        profession: str,
        fragments: list[dict],
        goal: Optional[str] = None,
    ) -> dict:
        """
        对碎片进行融合分析。
        有 External API 配置时用 ExternalProvider（内置规则 + LLM 润色），
        否则纯用 BuiltinProvider（内置方向原型引擎）。
        """
        # 命中缓存直接返回
        cached = _fusion_cache.get(profession, fragments, goal)
        if cached is not None:
            return cached

        from services.ai.base import FusionRequest
        from services.ai.config import ai_settings

        if ai_settings.AI_API_KEY and ai_settings.AI_API_BASE:
            from services.ai.external.ai_provider import ExternalProvider
            provider = ExternalProvider()
        else:
            from services.ai.builtin.engine import BuiltinProvider
            provider = BuiltinProvider()

        result = await provider.fuse(FusionRequest(
            profession=profession,
            fragments=fragments,
            goal=goal,
        ))
        # 转换回 dict 保持向后兼容
        from dataclasses import asdict
        output = asdict(result) if hasattr(result, '__dataclass_fields__') else result

        # 写入缓存
        _fusion_cache.set(profession, fragments, goal, output)

        return output

    # ====== 拼图板灵感碰撞 ======

    SPARK_SYSTEM_PROMPT = """你是一个"灵感碰撞器"。用户把2-3个拼图片拖到了一起，你要给出一个简短、惊喜的灵感火花。

## 核心原则
- 短！总共200字以内
- 让人"哎？还可以这样！"的惊喜感
- 找跨维度的关联——越意外越好
- 语言接地气，像朋友随口说的点子

## 输出格式（纯JSON，不要markdown）

{
  "title": "创意名称（5-10字）",
  "spark": "1-2句话解释为什么这两个碎片碰在一起有意思，让人恍然大悟",
  "action": "今天就能试的一件小事（具体动作，不要学习/思考）"
}"""

    @staticmethod
    async def spark_fragments(fragments: list[dict]) -> dict:
        """轻量灵感碰撞——拼图板专用（内置引擎）"""
        from services.ai.builtin.spark import builtin_spark
        return builtin_spark(fragments)

    # ====== 碎片评分 ======

    SCORE_PROMPT = """给这个能力碎片打个质量分（1-5），只看三个维度：
1. 具体性——越具体分越高（"会修电动车"比"会修东西"高）
2. 可操作性——能直接转化为行动的更高（"每天早起"比"有上进心"高）
3. 独特性——越少人有的越高（"会意大利语"比"会英语"高）

只输出一个1-5的数字，不要其他内容。"""

    @staticmethod
    async def score_fragment(fragment_type: str, content: str) -> int:
        """碎片质量评分——基于启发式规则（不依赖外部AI）"""
        from services.ai.builtin.scorer import builtin_score
        return builtin_score(fragment_type, content)

    # ====== 日记碎片提取 ======

    EXTRACT_SYSTEM_PROMPT = """你是一个"碎片提取器"。用户写了一篇日记，你的任务是从中提取出值得记录的能力碎片。

## 提取规则
1. 只提取明确的、有价值的能力/技能/经历/资源/习惯/性格特质
2. 每个碎片必须有具体的类型和内容
3. 碎片类型只能是：技能、能力、爱好、习惯、知识、经历、资源、性格
4. 如果日记内容太短或没有值得提取的内容，返回空数组
5. 最多提取5个碎片，宁缺毋滥
6. 碎片内容要简洁（10-30字），用第三人称描述

## 输出格式（纯JSON，不要markdown）

[{"type": "技能", "content": "具体内容"}, {"type": "经历", "content": "具体内容"}]"""

    BATCH_IMPORT_PROMPT = """你是一个"碎片提取器"。用户粘贴了一段文字（可能是简历、自我介绍、技能清单等），你的任务是从中提取出所有值得记录的能力碎片。

## 提取规则
1. 尽可能多地提取有价值的能力/技能/经历/资源/习惯/性格特质
2. 每个碎片必须有具体的类型和内容
3. 碎片类型只能是：技能、能力、爱好、习惯、知识、经历、资源、性格
4. 碎片内容要简洁（10-30字），用第三人称描述
5. 如果内容太短或没有值得提取的内容，返回空数组
6. 最多提取20个碎片

## 输出格式（纯JSON，不要markdown）

[{"type": "技能", "content": "具体内容"}, {"type": "经历", "content": "具体内容"}]"""

    @staticmethod
    async def extract_fragments_from_journal(content: str) -> list[dict]:
        """从日记内容中提取能力碎片——使用内置引擎"""
        if len(content.strip()) < 30:
            return []
        from services.ai.builtin.extractor import builtin_extract_fragments
        return await builtin_extract_fragments(content)

    @staticmethod
    async def batch_import_fragments(text: str) -> list[dict]:
        """从粘贴文本中批量提取碎片 — 内置引擎"""
        if len(text.strip()) < 20:
            return []
        from services.ai.builtin.extractor import builtin_extract_fragments
        return await builtin_extract_fragments(text)

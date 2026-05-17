"""
AI 服务 — 8刃切割法融合引擎
"""

import json
from typing import Optional
from openai import AsyncOpenAI

from config import settings


# 初始化 OpenAI 客户端
_client = AsyncOpenAI(
    api_key=settings.AI_API_KEY,
    base_url=settings.AI_API_BASE,
    timeout=120.0,  # Gateway 可能较慢，设置2分钟超时
)

AI_MODEL = settings.AI_MODEL


FUSION_SYSTEM_PROMPT = """你是一个"拼图融合引擎"的AI分析师。你的任务是把用户的能力碎片用"8刃切割法"深度分析，输出有层次、可落地的组合方案。

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
面向的用户是外卖骑手、销售、宝妈、小店主、工厂线长、房产中介等普通中国人，主要在二三线城市。
语言要接地气，像朋友之间聊赚钱的路子，不要商业术语，不要高大上的词。
每条内容都要"有肉"——不要空泛的鼓励，要给具体可执行的路径。

## 输出格式（严格JSON，不要markdown包裹）

{
  "golden_sentence": "一句金句，让用户觉得'这说的就是我'，有情感冲击力和个人辨识度",
  "profile_tag": "用简短标签概括这个人的核心优势（如'城市活地图+社交达人''嘴甜肯干的宝妈''会算账的夜班狂人'）",
  "confidence": 75,
  "directions": [
    {
      "title": "方向名称（5-10个字，像个招牌名，让人一看就知道干啥）",
      "why_this_works": "200-300字，深入解释这个组合为什么能打。必须引用用户的具体碎片，说明碎片之间是怎么联动的。",
      "market_hint": "100-150字，这个方向能做什么、谁会为它花钱、大概什么场景下成交。",
      "difficulty": "easy/medium/hard",
      "time_to_first_result": "预计多久见到第一个正向反馈",
      "roadmap": [
        {"step": 1, "time": "第1周", "action": "第一步具体做什么", "landmark": "起点广场", "landmark_icon": "🏛️"},
        {"step": 2, "time": "第2-3周", "action": "第二步具体做什么", "landmark": "技能工坊", "landmark_icon": "🔧"},
        {"step": 3, "time": "第4-6周", "action": "第三步具体做什么", "landmark": "市场集市", "landmark_icon": "🏪"},
        {"step": 4, "time": "第7-10周", "action": "第四步具体做什么", "landmark": "口碑塔", "landmark_icon": "🗼"},
        {"step": 5, "time": "第11周+", "action": "第五步具体做什么", "landmark": "收益城堡", "landmark_icon": "🏰"}
      ],
      "used_fragments": ["碎片类型: 碎片内容"],
      "next_action": "今天就能做的第一步，必须是具体动作"
    }
  ],
  "mini_directions": [
    {"title": "小方案名称", "type": "内容/服务/产品/社群/工具/其他", "tagline": "一句话说明"},
    {"title": "小方案名称", "type": "内容/服务/产品/社群/工具/其他", "tagline": "一句话说明"},
    {"title": "小方案名称", "type": "内容/服务/产品/社群/工具/其他", "tagline": "一句话说明"},
    {"title": "小方案名称", "type": "内容/服务/产品/社群/工具/其他", "tagline": "一句话说明"}
  ],
  "insight": "300-400字的整体洞察。核心是帮用户看到他碎片组合的独特壁垒——为什么别人抄不走他的组合。",
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

### 你的输出必须完整输出2个方向，每个方向的"why_this_works"不少于250字，insight不少于300字。如果被截断，请自行补全。绝对不能只输出1个方向。
- 每个方向必须有完整的"为什么能打"逻辑，不能只罗列碎片
- market_hint要具体到场景和付费人群，不能泛泛说"可以做自媒体"——得说是做什么内容、面向什么人
- roadmap的3步必须有递进关系：第一步获取曝光/验证需求 → 第二步跑通最小变现 → 第三步放大/稳定
- next_action必须是"今天就能做的事"——比如"注册一个账号""发一条朋友圈""去本地3个微信群问一个问题"，绝不能是"学习XX""思考XX"这种空泛的。用户看完应该立刻能动手，不需要任何额外准备

### insight
- 核心回答一个问题：为什么别人抄不走你这个组合？
- 要具体分析碎片之间的相互锁定效应（比如你既有技术又有本地关系，这俩加起来换个人至少要五年）
- 帮用户理解长期价值——这个方向跑通之后会滚出什么雪球

### skill_gaps
- 诚实列出，不回避
- 要具体可操作——不是说"缺钱"，而是"缺2000元左右的启动资金买设备"
- 3-5条

### fragment_connections
- 找出2-3对用户自己可能没注意到的碎片关联
- 不要选显而易见的组合（如"编程"+"解决问题"），要找跨维度的惊喜关联（如"每天刷短视频"+"熟悉城市路线"="本地探店博主"）
- connection用一句话说清关联，让人看了有"哎还真是"的感觉
- 越跨维度、越让人意外越好——这是用户的"啊哈时刻"

### confidence
- 0-100的整数，反映AI对这个融合方向整体可行性的判断
- 碎片越具体越能联动、市场越清晰 → 分数越高
- 不要每个都是80，要有区分度

### 通用
- 输出纯JSON，不要任何markdown代码块包裹，不要```json
- 所有文字必须是中文
- 面向普通中国人，不要用"赋能""闭环""底层逻辑""复购率"等装逼词汇
- 但可以用"搞钱""路子""靠谱""折腾""来事""攒口碑"等接地气的词"""


FUSION_USER_PROMPT_TEMPLATE = """以下是用户的职业身份和能力碎片，请用8刃切割法深度分析并输出融合方案。

职业：{profession}

碎片列表：
{fragments}

请严格按照系统提示的格式输出分析结果（纯JSON，2个方向，每个方向必须深入有层次）："""


class AIService:
    """AI 引擎服务 — 8刃切割法融合"""

    @staticmethod
    async def fuse_fragments(
        profession: str,
        fragments: list[dict],
        goal: Optional[str] = None,
    ) -> dict:
        """
        对用户的碎片进行融合分析
        
        Args:
            profession: 用户职业
            fragments: [{"type": "技能", "content": "熟悉城市路线"}, ...]
        
        Returns:
            dict with golden_sentence, directions, insight
        """
        # 构建碎片文本
        fragments_text = "\n".join(
            f"- [{f['type']}] {f['content']}" for f in fragments
        )

        user_prompt = FUSION_USER_PROMPT_TEMPLATE.format(
            profession=profession,
            fragments=fragments_text,
        )

        # 如果有目标，添加到 prompt
        if goal:
            user_prompt += f"\n\n用户目标：{goal}\n请根据这个目标，给出更有针对性的融合方向。"

        try:
            response = await _client.chat.completions.create(
                model=AI_MODEL,
                messages=[
                    {"role": "system", "content": FUSION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.65,
                max_tokens=8000,
                timeout=180.0,
            )

            result_text = response.choices[0].message.content.strip()

            # 清理可能的 markdown 代码块
            if result_text.startswith("```"):
                result_text = result_text.split("\n", 1)[-1]
                if result_text.endswith("```"):
                    result_text = result_text[:-3]
                result_text = result_text.strip()

            parsed = json.loads(result_text)

            # ===== 质量保障：确保关键字段不缺失 =====
            # 如果 directions 少于2个，补第二个
            if not isinstance(parsed.get('directions'), list) or len(parsed['directions']) < 2:
                parsed['directions'] = (parsed.get('directions') or []) + [
                    {
                        "title": "把你的日常变成副业素材",
                        "why_this_works": "你每天接触的人和事，别人愿意看。真实的、有烟火气的东西，是最有价值的 内容。你的生活本身就是素材库，不需要额外准备，只需要把看到的东西记录下来、整理出来，发出去就行。",
                        "market_hint": "小红书/抖音上的普通人真实生活分享，同城用户爱看，粉丝过千就能接本地商家广告。",
                        "difficulty": "easy",
                        "time_to_first_result": "1-2周",
                        "roadmap": [
                            {"step": 1, "time": "第1天", "action": "选一个你今天遇到的有意思的事，写成300字"},
                            {"step": 2, "time": "第2-3天", "action": "发布到小红书或抖音"},
                            {"step": 3, "time": "第1周", "action": "每天发一条，看哪类内容有人看"}
                        ],
                        "used_fragments": ["你的日常经历"],
                        "next_action": "现在就打开备忘录，写下今天发生的一件事"
                    }
                ]
            # 如果 insight 为空，补一个有内容的
            if not parsed.get('insight') or len(parsed['insight']) < 50:
                parsed['insight'] = (
                    f"你身上这些碎片放在一起，构成了一个独特的组合。你有{len(fragments_data)}个各不相同的碎片，"
                    f"这些碎片在别人身上很少同时出现——这就是你的壁垒。"
                    f"别小看这些东西，把它们整理出来，让别人看见，你就已经跑赢了80%的同龄人。"
                    f"先动起来，边做边调整，不需要一开始就想清楚。"
                )
            # 确保 skill_gaps 存在
            if not isinstance(parsed.get('skill_gaps'), list):
                parsed['skill_gaps'] = ["需要更清晰地说清楚'我能帮谁解决什么问题'", "需要找到第一个发布渠道", "需要第一单反馈"]
            # 确保 fragment_connections 存在
            if not isinstance(parsed.get('fragment_connections'), list):
                parsed['fragment_connections'] = []

            return parsed

        except json.JSONDecodeError:
            # AI 返回格式有问题，尝试修复
            return {
                "golden_sentence": "你的碎片，比你以为的值钱。别小看自己，你身上那些零零碎碎的东西，凑在一起，可能就是别人花大钱都买不到的东西。",
                "profile_tag": "待重新分析",
                "confidence": 50,
                "directions": [
                    {
                        "title": "把自己的经历变成内容",
                        "why_this_works": "基于你的碎片组合，你有别人没有的真实素材。你每天接触的人和事，就是你的独家内容来源。你踩过的坑、总结出的经验、发现的小窍门——这些东西网上搜不到，教科书也不会写，但恰恰是别人最想看的。别人想抄也抄不走，因为那是你自己的日子，你自己的日子谁也复制不了。把真实经历整理成内容发出去，先吸同城粉丝，等粉丝多了接本地商家的广告或带货，这是普通人最低成本的变现路径。",
                        "market_hint": "本地用户爱看同城真实故事，尤其是跟你背景相近的人——工厂小哥想看工厂生活，宝妈想看带娃日常，小老板想看同行怎么干的。粉丝过千之后，本地商家会主动找你合作，一条广告报价100-500元不等，看你粉丝粘性。",
                        "difficulty": "easy",
                        "time_to_first_result": "1-2周",
                        "roadmap": [
                            {"step": 1, "time": "第1周", "action": "列出3个你最想分享的真实经历故事，写成300字左右的小短文"},
                            {"step": 2, "time": "第2-3周", "action": "每天发1条内容到小红书或抖音，坚持一周看数据反馈哪类最受欢迎"},
                            {"step": 3, "time": "第4-6周", "action": "找到数据最好的题材方向，集中精力深耕，开始回复评论建立粉丝粘性"}
                        ],
                        "used_fragments": ["经历碎片", "你的独特视角"],
                        "next_action": "今天就打开手机备忘录，列出3件你这周发生的事，选最有意思的那个写成200字发出去"
                    },
                    {
                        "title": "用你的技能接点私活",
                        "why_this_works": "不管你会什么——修图、写文案、拍视频、调机器、砍价、找货源——都有人愿意为这些技能付钱，只是你还没找到那个愿意付钱的人。你的技能在你自己手里是'碎片'，但只要找到一个需要的场景，它就变成了'服务'，服务就可以卖钱。关键不是你会多少，而是你有没有把自己的技能'产品化'——说清楚你能帮谁解决什么问题，然后去那个人会出现的地方报价。",
                        "market_hint": "技能变现的核心是找到需求方。你会的东西，在闲鱼、发廊群、工厂群、本地商家圈可能都有人需要。报价不要高，先用低价换口碑，攒3-5个好评之后提价就顺理成章。常见的技能变现方式：闲鱼卖服务、微信接单、本地商家固定合作。",
                        "difficulty": "easy",
                        "time_to_first_result": "1-2周",
                        "roadmap": [
                            {"step": 1, "time": "第1周", "action": "列出你所有能帮别人做的事，哪怕是很小的事"},
                            {"step": 2, "time": "第2周", "action": "在闲鱼发布一条服务信息，或者在本地微信群发一条报价"},
                            {"step": 3, "time": "第3-4周", "action": "完成第一单，收集反馈，根据反馈调整服务内容和定价"}
                        ],
                        "used_fragments": ["你的技能碎片"],
                        "next_action": "今天就发一条朋友圈或闲鱼：'接XXX活，价格实惠，有需要的找我'",
                    }
                ],
                "insight": "你的碎片组合看起来散，其实里面有货。关键是你愿不愿意花点时间把它们整理出来，让别人看见。内容创业也好，技能变现也好，本质都是同一件事——把你已经有的东西，变成别人愿意花钱买的东西。你不需要学新技能，不需要辞职，不需要all in，只需要把现有的碎片稍微排列组合一下，找到一个刚好需要的场景，然后动一下。别想太远，先动起来再说。",
                "skill_gaps": [
                    "需要把碎片整理成清晰的一句话：'我能帮谁解决什么问题'",
                    "需要找一个稳定的发布/接单渠道（闲鱼/微信群/本地平台）",
                    "需要第一单，哪怕免费或低价，先把闭环跑通"
                ],
                "fragment_connections": [
                    {"fragment_a": "你的技能碎片", "fragment_b": "你的经历碎片", "connection": "你的真实经历是你技能最好的背书——你做过，你知道坑在哪，你教别人就是最快的学习方式"},
                    {"fragment_a": "你的时间碎片", "fragment_b": "你的本地关系", "connection": "你在这个城市的人脉和地理位置是天然优势，换个城市的人想用同样的路子，还得重新积累"}
                ]
            }
        except Exception as e:
            raise RuntimeError(f"AI融合失败: {str(e)}") from e

    # ====== 拼图板灵感融合（轻量版） ======

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
}

## 例子
碎片：[技能] 熟悉城市路线 + [习惯] 每天刷短视频
输出：{"title": "本地探店博主", "spark": "你每天跑的路就是素材——别人要专门出门探店，你上班路上就拍了。", "action": "明天送餐时顺手拍一家你常去的店门口"}

碎片：[经历] 十年工厂经验 + [知识] 懂一些营养学
输出：{"title": "工厂人的健康顾问", "spark": "同龄工友最信你这种自己人——你既懂他们的苦，又知道怎么补。", "action": "今天在工友群里发一条你自己的健康小贴士"}"""

    @staticmethod
    async def spark_fragments(fragments: list[dict]) -> dict:
        """轻量灵感碰撞——拼图板专用"""
        fragments_text = " + ".join(f"[{f['type']}] {f['content']}" for f in fragments)

        try:
            response = await _client.chat.completions.create(
                model=AI_MODEL,
                messages=[
                    {"role": "system", "content": AIService.SPARK_SYSTEM_PROMPT},
                    {"role": "user", "content": f"碎片：{fragments_text}"},
                ],
                temperature=0.85,
                max_tokens=300,
                timeout=30.0,
            )

            result_text = response.choices[0].message.content.strip()
            if result_text.startswith("```"):
                result_text = result_text.split("\n", 1)[-1]
                if result_text.endswith("```"):
                    result_text = result_text[:-3]
                result_text = result_text.strip()

            parsed = json.loads(result_text)
            parsed.setdefault("title", "灵感火花")
            parsed.setdefault("spark", "这两个碎片放在一起，有些意思。")
            parsed.setdefault("action", "想想怎么把它们联系起来")
            return parsed

        except (json.JSONDecodeError, Exception):
            return {
                "title": "灵感火花",
                "spark": "这两个碎片放在一起，可能有些你没想过的可能性。",
                "action": "花5分钟想想这两个能力能怎么搭配"
            }

    # ====== 碎片自动评分 ======

    SCORE_PROMPT = """给这个能力碎片打个质量分（1-5），只看三个维度：
1. 具体性——越具体分越高（"会修电动车"比"会修东西"高）
2. 可操作性——能直接转化为行动的更高（"每天早起"比"有上进心"高）
3. 独特性——越少人有的越高（"会意大利语"比"会英语"高）

只输出一个1-5的数字，不要其他内容。
5=非常具体+可操作+独特
4=具体+有一点独特
3=中等，不突出也不差
2=模糊或太常见
1=太空泛"""

    @staticmethod
    async def score_fragment(fragment_type: str, content: str) -> int:
        """AI自动评分——碎片入库时调用"""
        try:
            response = await _client.chat.completions.create(
                model=AI_MODEL,
                messages=[
                    {"role": "system", "content": AIService.SCORE_PROMPT},
                    {"role": "user", "content": f"[{fragment_type}] {content}"},
                ],
                temperature=0.2,
                max_tokens=10,
                timeout=10.0,
            )
            score_text = response.choices[0].message.content.strip()
            score = int(score_text)
            return max(1, min(5, score))
        except (ValueError, Exception):
            return 3  # 默认中等

    # ====== 日记碎片提取 ======

    EXTRACT_SYSTEM_PROMPT = """你是一个"碎片提取器"。用户写了一篇日记，你的任务是从中提取出值得记录的能力碎片。

## 提取规则
1. 只提取明确的、有价值的能力/技能/经历/资源/习惯/性格特质，不要提取模糊的情绪或日常琐事
2. 每个碎片必须有具体的类型和内容
3. 碎片类型只能是：技能、能力、爱好、习惯、知识、经历、资源、性格
4. 如果日记内容太短或没有值得提取的内容，返回空数组
5. 最多提取5个碎片，宁缺毋滥
6. 碎片内容要简洁（10-30字），用第三人称描述

## 输出格式（纯JSON，不要markdown）

[{"type": "技能", "content": "具体内容"}, {"type": "经历", "content": "具体内容"}]

## 例子
日记："今天帮客户处理了一个退货问题，客户很生气，我先听他抱怨了十分钟，然后给他提供了解决方案，最后他满意地走了。"
输出：[{"type": "能力", "content": "情绪安抚和冲突化解能力"}, {"type": "技能", "content": "客户服务与问题解决"}]"""

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
        """从日记内容中提取能力碎片"""
        # 太短的日记跳过
        if len(content.strip()) < 30:
            return []

        try:
            response = await _client.chat.completions.create(
                model=AI_MODEL,
                messages=[
                    {"role": "system", "content": AIService.EXTRACT_SYSTEM_PROMPT},
                    {"role": "user", "content": f"请从以下日记中提取能力碎片：\n\n{content}"},
                ],
                temperature=0.3,
                max_tokens=1000,
                timeout=30.0,
            )

            result_text = response.choices[0].message.content.strip()

            # 清理 markdown
            if result_text.startswith("```"):
                result_text = result_text.split("\n", 1)[-1]
                if result_text.endswith("```"):
                    result_text = result_text[:-3]
                result_text = result_text.strip()

            fragments = json.loads(result_text)

            # 验证格式
            if not isinstance(fragments, list):
                return []

            valid_types = {'技能', '能力', '爱好', '习惯', '知识', '经历', '资源', '性格'}
            return [
                f for f in fragments
                if isinstance(f, dict)
                and f.get('type') in valid_types
                and isinstance(f.get('content'), str)
                and len(f['content'].strip()) > 0
            ]

        except (json.JSONDecodeError, Exception):
            return []

    @staticmethod
    async def batch_import_fragments(text: str) -> list[dict]:
        """从粘贴文本中批量提取碎片"""
        if len(text.strip()) < 20:
            return []

        try:
            response = await _client.chat.completions.create(
                model=AI_MODEL,
                messages=[
                    {"role": "system", "content": AIService.BATCH_IMPORT_PROMPT},
                    {"role": "user", "content": f"请从以下文字中提取能力碎片：\n\n{text}"},
                ],
                temperature=0.3,
                max_tokens=2000,
                timeout=30.0,
            )

            result_text = response.choices[0].message.content.strip()

            # 清理 markdown
            if result_text.startswith("```"):
                result_text = result_text.split("\n", 1)[-1]
                if result_text.endswith("```"):
                    result_text = result_text[:-3]
                result_text = result_text.strip()

            fragments = json.loads(result_text)

            if not isinstance(fragments, list):
                return []

            valid_types = {'技能', '能力', '爱好', '习惯', '知识', '经历', '资源', '性格'}
            return [
                f for f in fragments
                if isinstance(f, dict)
                and f.get('type') in valid_types
                and isinstance(f.get('content'), str)
                and len(f['content'].strip()) > 0
            ]

        except (json.JSONDecodeError, Exception):
            return []
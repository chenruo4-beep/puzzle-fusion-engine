"""智能输入流路由 - AI自动分拣到碎片或日记"""

import json
import threading
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.fragment import Fragment
from models.journal import JournalEntry


router = APIRouter()

SMART_LOG_SYSTEM_PROMPT = """你是一个文本分类器。给定用户输入的一段文本，判断它应该被归类为"碎片"还是"日记"。

## 分类标准
- **碎片(fragment)**: 一个具体的技能、能力、爱好、习惯、知识、经历、资源或性格特质。通常简短(一两句话)，描述用户"有什么"。比如"我会Python编程"、"我擅长跟人打交道"、"我喜欢拍照"
- **日记(journal)**: 一段经历描述、日常记录、反思感悟。通常较长，描述用户"做了什么"或"想了什么"。比如"今天去送外卖遇到一个特别的客户..."

## 碎片类型
如果分类为碎片，还需要确定类型。类型只能是以下之一：
- 技能: 具体会做的事（编程、开车、修电器）
- 能力: 底层可迁移的能力（抗压、逻辑、说服）
- 爱好: 发自内心喜欢的事（拍照、钓鱼、做饭）
- 习惯: 日常重复的行为模式（早起、记账、跑步）
- 知识: 掌握的信息和理论（经济学、心理学、历史）
- 经历: 过去的独特体验（曾做过销售、去过10个国家）
- 资源: 拥有的东西（人脉、工具、位置优势）
- 性格: 天生的个性特质（乐观、细心、有耐心）

同时给出质量评分(quality_score, 1-5):
- 1: 低信息量
- 3: 正常
- 5: 非常有价值

## 输出格式（严格JSON，不要markdown包裹，不要```代码块）
{"category":"fragment","fragment_type":"技能","quality_score":3,"reason":"分类理由"}
或
{"category":"journal","reason":"分类理由"}
"""


class SmartLogRequest(BaseModel):
    content: str
    user_id: int = 1


@router.post("/")
async def smart_log(payload: SmartLogRequest, db: Session = Depends(get_db)):
    """智能输入流：自动判断内容类型并创建对应实体"""
    content = payload.content.strip()
    if not content:
        return {"error": "内容不能为空"}

    # 调用AI分类
    classification = await _classify(content)

    if classification.get("category") == "fragment":
        fragment_type = classification.get("fragment_type", "技能")
        quality_score = classification.get("quality_score", 3)
        tags = json.dumps({"quality_score": quality_score}, ensure_ascii=False)

        fragment = Fragment(
            user_id=payload.user_id,
            fragment_type=fragment_type,
            content=content,
            tags=tags,
        )
        db.add(fragment)
        db.commit()
        db.refresh(fragment)

        return {
            "category": "fragment",
            "id": fragment.id,
            "fragment_type": fragment_type,
            "content": content,
            "quality_score": quality_score,
            "reason": classification.get("reason", ""),
            "message": f"已添加为{fragment_type}碎片 ✨"
        }
    else:
        journal = JournalEntry(
            user_id=payload.user_id,
            content=content,
        )
        db.add(journal)
        db.commit()
        db.refresh(journal)

        # 后台触发碎片提取
        try:
            from routers.journal import _extract_fragments_bg
            threading.Thread(
                target=_extract_fragments_bg,
                args=(journal.id, content),
                daemon=True
            ).start()
        except Exception:
            pass  # 后台提取失败不影响主流程

        return {
            "category": "journal",
            "id": journal.id,
            "content": content,
            "reason": classification.get("reason", ""),
            "message": "已保存为日记，AI正在扫描可提取的碎片... 📝"
        }


async def _classify(content: str) -> dict:
    """AI分类：判断输入是碎片还是日记"""
    try:
        from config import settings
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            api_key=settings.AI_API_KEY,
            base_url=settings.AI_API_BASE,
            timeout=60.0,
        )

        response = await client.chat.completions.create(
            model=settings.AI_MODEL,
            messages=[
                {"role": "system", "content": SMART_LOG_SYSTEM_PROMPT},
                {"role": "user", "content": content}
            ],
            temperature=0.3,
            max_tokens=200,
        )

        result_text = response.choices[0].message.content.strip()
        # 清理可能的markdown包裹
        if result_text.startswith("```"):
            lines = result_text.split("\n")
            result_text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        return json.loads(result_text)

    except Exception:
        # 启发式回退：短文本且不像叙事 → 碎片
        journal_kw = ['今天', '昨天', '最近', '感觉', '觉得', '因为', '所以', '然后']
        is_journal_like = len(content) >= 50 or any(kw in content for kw in journal_kw)

        if is_journal_like:
            return {"category": "journal", "reason": "检测到日常记录特征，已归入日记"}
        else:
            return {"category": "fragment", "fragment_type": "技能", "quality_score": 3, "reason": "检测到技能/特质特征，已归入碎片"}
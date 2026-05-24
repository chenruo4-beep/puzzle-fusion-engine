"""日记路由 - 日记的增删查"""

from __future__ import annotations

import json
import random
import logging
from datetime import date, datetime, timedelta
from collections import Counter
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from database import get_db
from services.ai.vector_store import upsert_vector
from models.journal import JournalEntry
from models.fragment import Fragment
from models.fusion import Fusion
from models.journey_map import JourneyMap
from models.checkin import CheckIn
from models.user import User
from routers.auth import get_current_user
from schemas.journal import JournalCreate, JournalResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()


async def _extract_and_suggest(journal: JournalEntry, content: str, db: Session):
    """同步提取碎片，存入 suggested_fragments（不自动入库，等待用户确认）"""
    from services.ai_service import AIService
    fragments = await AIService.extract_fragments_from_journal(content)
    if fragments:
        journal.suggested_fragments = json.dumps(fragments, ensure_ascii=False)
    else:
        journal.suggested_fragments = None


@router.get("/")
async def list_journals(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取当前用户的所有日记列表，支持分页"""
    from utils.response import paginated_response
    q = db.query(JournalEntry).filter(JournalEntry.user_id == current_user.id)
    total = q.count()
    items = q.order_by(JournalEntry.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return paginated_response(items, total, page, page_size)


@router.post("/", response_model=JournalResponse, status_code=status.HTTP_201_CREATED)
async def create_journal(body: JournalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """创建新的日记条目 — 同步提取碎片存为建议，等待用户确认后入库"""
    journal = JournalEntry(
        user_id=current_user.id,
        content=body.content,
        tags=body.tags,
    )
    db.add(journal)
    db.commit()
    db.refresh(journal)

    # 同步提取碎片，存入 suggested_fragments
    await _extract_and_suggest(journal, body.content, db)
    db.commit()
    db.refresh(journal)

    return journal


@router.get("/daily-template")
async def get_daily_template():
    today = date.today()
    template_id = f"template-{today.strftime('%Y%m%d')}"
    idx = today.toordinal() % len(OBSERVATION_PROMPTS)
    prompt = OBSERVATION_PROMPTS[idx]
    return {"id": template_id, **prompt}


@router.post("/quick-save")
async def quick_save(body: QuickSaveRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    content = f"{body.question}\n{body.answer}"
    journal = JournalEntry(
        user_id=current_user.id,
        content=content,
        tags="今日自我观察",
    )
    db.add(journal)
    db.commit()
    db.refresh(journal)

    # 同步提取碎片存为建议
    await _extract_and_suggest(journal, content, db)
    db.commit()
    db.refresh(journal)

    return {"id": journal.id, "suggested_fragments": json.loads(journal.suggested_fragments) if journal.suggested_fragments else [], "message": "已记录"}


class TodaySuggestionResponse(BaseModel):
    suggestion: str
    context: str


@router.get("/today-suggestion", response_model=TodaySuggestionResponse)
async def get_today_suggestion(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    week_ago = today_start - timedelta(days=7)
    now = datetime.utcnow()
    hour = now.hour

    recent_journals = (
        db.query(JournalEntry)
        .filter(JournalEntry.user_id == current_user.id)
        .filter(JournalEntry.created_at >= yesterday_start)
        .order_by(JournalEntry.created_at.desc())
        .all()
    )

    today_content = ""
    for j in recent_journals:
        if j.created_at >= today_start:
            today_content += " " + (j.content or "")

    all_content = " ".join(j.content or "" for j in recent_journals)

    recent_fragments = (
        db.query(Fragment)
        .filter(Fragment.user_id == current_user.id)
        .filter(Fragment.created_at >= week_ago)
        .order_by(Fragment.created_at.desc())
        .all()
    )

    all_fragments_count = (
        db.query(sql_func.count(Fragment.id))
        .filter(Fragment.user_id == current_user.id)
        .scalar()
    )

    energy_keywords = ["累", "疲惫", "焦虑", "消耗", "能量", "压力", "无力", "耗竭"]
    if any(kw in all_content for kw in energy_keywords):
        return {"suggestion": "你的碎片今天可能电量不足。把需要独处思考的事安排在明天上午。", "context": "energy_drain"}

    creative_types = ["创作", "写作", "画画", "设计", "音乐", "摄影", "视频", "表达"]
    for f in recent_fragments:
        fc = (f.fragment_type or "") + (f.content or "")
        if any(kw in fc for kw in creative_types):
            return {"suggestion": "你的创造碎片在发光。趁热记录下此刻的感受，它会是你未来做选择时的重要路标。", "context": "creative_fragment"}

    skill_types = ["技能", "编程", "语言", "工具", "技术"]
    for f in recent_fragments:
        fc = (f.fragment_type or "") + (f.content or "")
        if any(kw in fc for kw in skill_types):
            return {"suggestion": "你最近点亮了一个技能碎片。今天花10分钟用它做一件小事，感受它在你手里的温度。", "context": "skill_fragment"}

    if not today_content.strip():
        return {"suggestion": "今天还没留下痕迹。哪怕只写一句话，也是对今天的自己一个交代。", "context": "no_journal_today"}

    confusion_keywords = ["迷茫", "困惑", "不知道", "不确定", "犹豫", "徘徊", "纠结"]
    if any(kw in all_content for kw in confusion_keywords):
        return {"suggestion": "当拼图还看不清全貌时，不用急着找答案。先捡起最顺手的那一块。", "context": "confusion"}

    progress_keywords = ["进展", "完成", "达成", "做到", "成功", "突破", "克服"]
    if any(kw in all_content for kw in progress_keywords):
        return {"suggestion": "你最近有进展。别急着冲刺下一段，先停下来感受一下'做到了'的实感。", "context": "progress"}

    if hour >= 20 or hour < 6:
        return {"suggestion": "夜深了。如果今天有些碎片还没拼上，没关系——它们只是还没找到对的邻居。", "context": "evening"}

    if hour < 10:
        return {"suggestion": "早安。今天的你会比昨天多一块拼图。从一件小事开始就好。", "context": "morning"}

    if all_fragments_count < 5:
        return {"suggestion": "你的拼图还在起步阶段。每一块新碎片，都是未来组合的一块基石。", "context": "early_stage"}

    if len(recent_fragments) >= 3:
        return {"suggestion": "你的碎片最近很活跃。今天不妨把两个看起来不相关的碎片放在一起，看看会发生什么。", "context": "fusion_ready"}

    return {"suggestion": "今天有什么小事，是你做了会觉得'这才像我'的？哪怕只是5分钟。", "context": "default"}


class DeepQuestionResponse(BaseModel):
    question: str
    context: str
    timestamp: str


DEEP_QUESTIONS = {
    "积累": [
        "你的碎片堆得差不多了。有没有哪一块，你在等一个'合适的时机'？",
        "收集了这么多关于自己的线索，假如把它们摊在桌上，哪三块会让你心里动一下？",
        "你已经有足够多的拼图了。是什么让你觉得'还不到时候'？",
    ],
    "卡住": [
        "这一步卡住的时候，你通常对自己说什么？是'再坚持一下'，还是'也许我不适合'？",
        "如果这张地图上有一个'暂停'按钮，你会按吗？",
        "卡住不一定是坏事。有时候是方法不对，有时候是方向不对。你觉得是哪一种？",
    ],
    "完成": [
        "你刚跨过了一个节点。现在回头看，那个'出发前的你'和'现在的你'，最大的不同是什么？",
        "这一步走完了。你学到了什么，是你出发前没想到的？",
        "庆贺一下。然后呢？下一个你想挑战的东西是什么？",
    ],
    "探索": [
        "如果你的人生是一本书，这一章叫什么名字？",
        "今天有没有一个瞬间，让你觉得'这才像我'？",
        "你身上的哪一块拼图，是你最想被别人看到的？",
        "有没有什么事，你一直觉得'不是自己'，但其实做了才发现'好像也行'？",
    ],
}


@router.get("/deep-question", response_model=DeepQuestionResponse)
async def deep_question(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """返回一个基于用户当前语境的深度问题"""
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    three_days_ago = now - timedelta(days=3)
    user_id = current_user.id

    recent_fragment_count = (
        db.query(Fragment)
        .filter(Fragment.user_id == user_id)
        .filter(Fragment.created_at >= seven_days_ago)
        .filter(Fragment.archived == 0)
        .count()
    )

    recent_fusion_count = (
        db.query(Fusion)
        .filter(Fusion.user_id == user_id)
        .filter(Fusion.created_at >= seven_days_ago)
        .count()
    )

    active_maps = (
        db.query(JourneyMap)
        .filter(JourneyMap.user_id == user_id)
        .filter(JourneyMap.status == "active")
        .all()
    )

    recent_checkin_count = (
        db.query(CheckIn)
        .filter(CheckIn.user_id == user_id)
        .filter(CheckIn.created_at >= three_days_ago)
        .count()
    )

    completed_checkin_count = (
        db.query(CheckIn)
        .filter(CheckIn.user_id == user_id)
        .filter(CheckIn.status == "completed")
        .filter(CheckIn.completed_at >= seven_days_ago)
        .count()
    )

    completed_map_count = (
        db.query(JourneyMap)
        .filter(JourneyMap.user_id == user_id)
        .filter(JourneyMap.status == "completed")
        .filter(JourneyMap.updated_at >= seven_days_ago)
        .count()
    )

    recently_completed_milestone = (completed_checkin_count + completed_map_count) > 0

    if recent_fragment_count > 5 and recent_fusion_count == 0:
        context = "积累"
    elif active_maps and recent_checkin_count == 0:
        context = "卡住"
    elif recently_completed_milestone:
        context = "完成"
    else:
        context = "探索"

    question = random.choice(DEEP_QUESTIONS[context])

    return {
        "question": question,
        "context": context,
        "timestamp": now.isoformat(),
    }


@router.get("/{journal_id}", response_model=JournalResponse)
async def get_journal(journal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """获取单条日记详情"""
    journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id, JournalEntry.user_id == current_user.id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="日记不存在")
    return journal


@router.put("/{journal_id}", response_model=JournalResponse)
async def update_journal(journal_id: int, body: JournalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """编辑日记（仅24小时内可修改）— 同步重新提取碎片存为建议"""
    journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id, JournalEntry.user_id == current_user.id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="日记不存在")
    now = datetime.utcnow()
    age = now - journal.created_at
    if age > timedelta(hours=24):
        raise HTTPException(status_code=403, detail="超过24小时，无法修改")
    journal.content = body.content
    journal.tags = body.tags
    journal.suggested_fragments = None  # 清空旧建议
    db.commit()
    db.refresh(journal)

    # 同步重新提取
    await _extract_and_suggest(journal, body.content, db)
    db.commit()
    db.refresh(journal)

    return journal


@router.post("/{journal_id}/confirm-fragments", response_model=list)
async def confirm_fragments(journal_id: int, body: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """确认日记提取的碎片，将选中的建议碎片正式入库"""
    journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="日记不存在")

    # body: {"indices": [0, 1, 2]}  用户选中的碎片索引
    indices = body.get("indices", [])
    if not journal.suggested_fragments:
        raise HTTPException(status_code=400, detail="没有待确认的碎片")

    suggested = json.loads(journal.suggested_fragments)
    created_fragments = []
    confirmed_ids = []

    for i in indices:
        if 0 <= i < len(suggested):
            frag_data = suggested[i]
            fragment = Fragment(
                user_id=current_user.id,
                journal_id=journal.id,
                fragment_type=frag_data["type"],
                content=frag_data["content"],
                tags="日记提取",
            )
            db.add(fragment)
            db.flush()
            upsert_vector(fragment.id, frag_data["type"], frag_data["content"], current_user.id)
            created_fragments.append({
                "id": fragment.id,
                "type": fragment.fragment_type,
                "content": fragment.content,
            })
            confirmed_ids.append(fragment.id)

    # 更新日记的已确认碎片ID列表
    existing_ids = json.loads(journal.extracted_fragment_ids or "[]")
    existing_ids.extend(confirmed_ids)
    journal.extracted_fragment_ids = json.dumps(existing_ids)
    # 清空建议
    journal.suggested_fragments = None
    db.commit()

    return created_fragments


@router.post("/{journal_id}/dismiss-fragments")
async def dismiss_fragments(journal_id: int, db: Session = Depends(get_db)):
    """忽略日记的碎片建议"""
    journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="日记不存在")
    journal.suggested_fragments = None
    db.commit()
    return {"ok": True}


@router.delete("/{journal_id}")
async def delete_journal(journal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """删除日记（仅24小时内可删除）— 同时删除关联的自动提取碎片"""
    journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id, JournalEntry.user_id == current_user.id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="日记不存在")
    now = datetime.utcnow()
    age = now - journal.created_at
    if age > timedelta(hours=24):
        raise HTTPException(status_code=403, detail="超过24小时，无法删除")

    # 删除关联的自动提取碎片
    if journal.extracted_fragment_ids:
        try:
            ids = json.loads(journal.extracted_fragment_ids)
            for fid in ids:
                frag = db.query(Fragment).filter(Fragment.id == fid).first()
                if frag:
                    db.delete(frag)
        except Exception:
            pass

    db.delete(journal)
    db.commit()
    return {"ok": True}


WEEKDAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
PERIOD_LABELS = {
    "morning": "上午", "afternoon": "下午", "evening": "晚上", "night": "深夜"
}


def _get_period(hour: int) -> str:
    if 6 <= hour < 12:
        return "morning"
    if 12 <= hour < 18:
        return "afternoon"
    if 18 <= hour < 23:
        return "evening"
    return "night"


def _iso_week_str(d: date) -> str:
    iso = d.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


@router.get("/weekly-insight")
async def weekly_insight(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    cutoff = now - timedelta(days=7)
    user_id = current_user.id

    journals = (
        db.query(JournalEntry)
        .filter(
            JournalEntry.user_id == user_id,
            JournalEntry.created_at >= cutoff,
        )
        .all()
    )

    if len(journals) < 3:
        return {"insights": [], "message": "再记录几天，Me就能帮你发现规律了。"}

    fragments = (
        db.query(Fragment)
        .filter(
            Fragment.user_id == user_id,
            Fragment.created_at >= cutoff,
        )
        .all()
    )

    insights = []

    day_counts = Counter(j.created_at.weekday() for j in journals)
    period_counter = Counter(_get_period(j.created_at.hour) for j in journals)
    if day_counts and period_counter:
        top_days = sorted(day_counts.most_common(), key=lambda x: (-x[1], x[0]))
        top_period = period_counter.most_common(1)[0]
        day_display = "、".join(WEEKDAY_NAMES[d] for d, _ in top_days[:2])
        period_display = PERIOD_LABELS.get(top_period[0], "上午")
        insights.append({
            "text": f"这周你最高效的时间段是{day_display}{period_display}。",
            "icon": "⏰",
        })

    if fragments:
        type_counts = Counter(f.fragment_type for f in fragments if f.fragment_type)
        if type_counts:
            top_type, top_count = type_counts.most_common(1)[0]
            insights.append({
                "text": f"'{top_type}'是你本周被激活最多次的能力碎片，共{top_count}次。",
                "icon": "\U0001f3a8",
            })

    active_kw = sum(1 for j in journals if j.content and ("主动" in j.content or "帮别人" in j.content or "帮忙" in j.content))
    passive_kw = sum(1 for j in journals if j.content and ("被动" in j.content or "获得帮助" in j.content or "别人帮" in j.content))
    if active_kw + passive_kw > 0:
        a = active_kw or 1
        p = passive_kw or 1
        insights.append({
            "text": f"你这周帮助别人次数中，主动和被动的比例是{a}:{p}。",
            "icon": "\U0001f91d",
        })

    total_journals = len(journals)
    tag_counter = Counter()
    for j in journals:
        if j.tags:
            for tag in j.tags.split(","):
                tag = tag.strip()
                if tag:
                    tag_counter[tag] += 1
    if tag_counter:
        top_tag, top_tag_count = tag_counter.most_common(1)[0]
        insights.append({
            "text": f"这周你记录了{total_journals}篇日记，最常出现的标签是「{top_tag}」({top_tag_count}次)。",
            "icon": "\U0001f4dd",
        })

    if day_counts:
        top_day_idx, top_day_count = day_counts.most_common(1)[0]
        highlight = f"你这周最有能量的一天是{WEEKDAY_NAMES[top_day_idx]}。"
    else:
        total = len(journals)
        highlight = f"这周你一共记录了{total}篇日记，继续保持。"

    week_str = _iso_week_str(date.today())

    return {
        "title": "本周，关于你自己，你可能没注意到的事",
        "insights": insights,
        "highlight": highlight,
        "week": week_str,
    }


OBSERVATION_PROMPTS = [
    {
        "question": "今天，我大部分的能量消耗在了____上。",
        "type": "single-select",
        "options": ["创造", "沟通", "重复劳动", "对抗焦虑", "应付他人", "沉浸在自己的世界"],
    },
    {
        "question": "今天有一个瞬间，让我觉得'这才是我该做的事'，那是在____的时候。",
        "type": "short-text",
        "hint": "比如：帮同事改完文案的那一刻",
    },
    {
        "question": "今天我的情绪底色是____。",
        "type": "single-select",
        "options": ["平静", "焦虑", "兴奋", "疲惫", "满足", "烦躁", "低落"],
    },
    {
        "question": "如果用一个词形容今天的节奏，是____。",
        "type": "single-select",
        "options": ["冲刺", "漫步", "卡顿", "顺流", "原地打转", "起飞"],
    },
    {
        "question": "今天和别人的互动中，我更像____。",
        "type": "single-select",
        "options": ["给予者", "接收者", "旁观者", "协调者", "对抗者"],
    },
    {
        "question": "今天让我意外的发现是____。",
        "type": "short-text",
        "hint": "比如：原来我下午效率更高",
    },
    {
        "question": "今天我的注意力像____。",
        "type": "single-select",
        "options": ["聚光灯", "散落的拼图", "风筝", "石头", "流水"],
    },
    {
        "question": "今天做的事里，____%是真正重要的。",
        "type": "single-select",
        "options": ["不到20%", "20-40%", "40-60%", "60-80%", "80%以上"],
    },
    {
        "question": "今天我第一次意识到____。",
        "type": "short-text",
        "hint": "比如：开会前的5分钟准备能省掉会后半小时",
    },
    {
        "question": "今天最让我分心的是____。",
        "type": "single-select",
        "options": ["手机", "杂念", "别人的需求", "环境噪音", "身体不适", "没什么特别的"],
    },
    {
        "question": "如果今天是一块拼图，它的颜色是____。",
        "type": "single-select",
        "options": ["暖黄色", "深海蓝", "森林绿", "火焰红", "雾灰色", "星空紫"],
    },
    {
        "question": "今天我离自己想要的样子，更近了一步还是远了一步？",
        "type": "single-select",
        "options": ["更近了", "远了点", "站在原地", "方向变了"],
    },
]


class QuickSaveRequest(BaseModel):
    template_id: str
    question: str
    answer: str


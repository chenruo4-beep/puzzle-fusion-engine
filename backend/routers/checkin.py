"""打卡路由 - 创建打卡、列表、完成、提交反馈、连续打卡、追问闭环"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database import get_db
from models.checkin import CheckIn
from models.fragment import Fragment
from models.user import User
from pydantic import BaseModel, ConfigDict
from typing import Optional
from routers.auth import get_current_user
from services.ai_service import AIService
from services.ai.vector_store import upsert_vector


class CheckInCreate(BaseModel):
    """创建打卡请求体"""
    title: str
    action: Optional[str] = None
    fusion_id: Optional[int] = None


class CheckInResponse(BaseModel):
    """打卡响应体"""
    id: int
    user_id: int
    title: str
    action: Optional[str] = None
    fusion_id: Optional[int] = None
    status: str
    feedback: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str
    streak_days: int
    is_new_record: int
    followup_question: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FeedbackBody(BaseModel):
    """反馈请求体"""
    feedback: str


class FollowupBody(BaseModel):
    """追问回答请求体"""
    answer: str

    model_config = ConfigDict(from_attributes=True)


router = APIRouter()


def _calculate_streak(db: Session, user_id: int) -> int:
    """计算用户当前连续打卡天数"""
    checkins = db.query(CheckIn).filter(
        CheckIn.user_id == user_id,
        CheckIn.status == "completed"
    ).order_by(CheckIn.completed_at.desc()).all()
    
    if not checkins:
        return 0
    
    streak = 0
    today = datetime.utcnow().date()
    expected_date = today
    
    for c in checkins:
        if c.completed_at:
            completed_date = c.completed_at.date()
            if completed_date == expected_date or completed_date == today:
                streak += 1
                expected_date = completed_date - timedelta(days=1)
            elif completed_date == expected_date + timedelta(days=1):
                # 同一天多次打卡，只算一次
                continue
            else:
                break
    
    return streak


@router.get("/", response_model=list[CheckInResponse])
async def list_checkins(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """获取所有打卡记录"""
    checkins = db.query(CheckIn).filter(CheckIn.user_id == current_user.id).order_by(CheckIn.created_at.desc()).all()
    result = []
    for c in checkins:
        result.append({
            "id": c.id,
            "user_id": c.user_id,
            "title": c.title,
            "action": c.action,
            "fusion_id": c.fusion_id,
            "status": c.status,
            "feedback": c.feedback,
            "completed_at": c.completed_at.isoformat() if c.completed_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else "",
            "streak_days": c.streak_days,
            "is_new_record": c.is_new_record,
            "followup_question": c.followup_question,
        })
    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_checkin(body: CheckInCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """创建新的打卡"""
    checkin = CheckIn(
        user_id=current_user.id,
        title=body.title,
        action=body.action,
        fusion_id=body.fusion_id,
        status="pending",
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return {
        "id": checkin.id,
        "user_id": checkin.user_id,
        "title": checkin.title,
        "action": checkin.action,
        "fusion_id": checkin.fusion_id,
        "status": checkin.status,
        "feedback": checkin.feedback,
        "completed_at": checkin.completed_at.isoformat() if checkin.completed_at else None,
        "created_at": checkin.created_at.isoformat() if checkin.created_at else "",
    }


@router.get("/streak")
async def get_streak(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """获取当前连续打卡天数"""
    streak = _calculate_streak(db, current_user.id)

    # 获取历史最高记录
    max_streak = db.query(CheckIn).filter(
        CheckIn.user_id == current_user.id
    ).order_by(CheckIn.streak_days.desc()).first()
    max_streak_days = max_streak.streak_days if max_streak else 0
    
    # 检查今天是否已打卡（用 current_user 完成前面替换后此处保持）
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today + timedelta(days=1), datetime.min.time())

    today_checkin = db.query(CheckIn).filter(
        CheckIn.user_id == current_user.id,
        CheckIn.status == "completed",
        CheckIn.completed_at >= today_start,
        CheckIn.completed_at < today_end
    ).first()
    
    return {
        "current_streak": streak,
        "max_streak": max(max_streak_days, streak),
        "today_completed": today_checkin is not None,
        "next_milestone": ((streak // 7) + 1) * 7,
    }


@router.patch("/{checkin_id}/complete")
async def complete_checkin(checkin_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """完成打卡 - 标记完成并生成 AI 追问"""
    checkin = db.query(CheckIn).filter(CheckIn.id == checkin_id).first()
    if not checkin:
        raise HTTPException(status_code=404, detail="打卡记录不存在")

    checkin.status = "completed"
    checkin.completed_at = datetime.utcnow()

    # 计算连续打卡天数
    streak = _calculate_streak(db, current_user.id)
    checkin.streak_days = streak

    # 检查是否是新纪录
    max_streak = db.query(CheckIn).filter(
        CheckIn.user_id == current_user.id
    ).order_by(CheckIn.streak_days.desc()).first()
    if max_streak and streak > max_streak.streak_days:
        checkin.is_new_record = 1

    # 生成追问（基于 title 和 action）
    followup = _generate_followup(checkin.title, checkin.action)
    checkin.followup_question = followup

    db.commit()
    db.refresh(checkin)
    return {
        "message": "打卡完成",
        "checkin_id": checkin.id,
        "status": checkin.status,
        "completed_at": checkin.completed_at.isoformat() if checkin.completed_at else None,
        "streak_days": streak,
        "is_new_record": checkin.is_new_record == 1,
        "followup_question": followup,
    }


def _generate_followup(title: str, action: Optional[str]) -> str:
    """根据打卡内容生成追问 — 模板化，无需 LLM"""
    template_pool = [
        f"完成了「{title}」，感觉怎么样？有没有什么新发现或意外的事？告诉我，我帮你记下来。",
        f"「{title}」这一步做完了，你觉得自己做得怎么样？如果再做一次，有什么想调整的？",
        f"👍 这一步完成了！过程中有没有遇到什么有意思的事？随便聊聊，你的回答会成为新的碎片。",
        f"好，第一步迈出去了！现在复盘一下：完成「{title}」的过程中，你用了什么能力？",
        f"恭喜完成✅ 有没有什么经验或感受想记录下来？这些记录以后融合时可能会派上用场。",
    ]
    import hashlib
    idx = hash(title + (action or "done")) % len(template_pool)
    return template_pool[idx]


@router.post("/{checkin_id}/followup")
async def submit_followup(checkin_id: int, body: FollowupBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """用户回答追问，自动提取新碎片入库"""
    checkin = db.query(CheckIn).filter(CheckIn.id == checkin_id, CheckIn.user_id == current_user.id).first()
    if not checkin:
        raise HTTPException(status_code=404, detail="打卡记录不存在")

    checkin.followup_answer = body.answer

    # 从回答中提取碎片
    new_fragments = []
    try:
        extracted = await AIService.extract_fragments_from_journal(body.answer)
        for item in extracted:
            frag = Fragment(
                user_id=current_user.id,
                fragment_type=item.get("type", "能力"),
                content=item.get("content", body.answer[:30]),
                tags='{"source": "checkin_followup", "quality_score": 3}',
            )
            db.add(frag)
            db.flush()
            upsert_vector(frag.id, frag.fragment_type, frag.content, current_user.id)
            new_fragments.append({"id": frag.id, "type": frag.fragment_type, "content": frag.content})
    except Exception:
        pass  # 提取失败不阻塞

    import json
    checkin.followup_fragments = json.dumps(new_fragments, ensure_ascii=False)

    db.commit()
    db.refresh(checkin)

    return {
        "message": "回答已记录",
        "checkin_id": checkin.id,
        "answer": checkin.followup_answer,
        "new_fragments": new_fragments,
        "fragment_count": len(new_fragments),
    }


@router.patch("/{checkin_id}/feedback")
async def submit_feedback(checkin_id: int, body: FeedbackBody, db: Session = Depends(get_db)):
    """提交打卡反馈"""
    checkin = db.query(CheckIn).filter(CheckIn.id == checkin_id).first()
    if not checkin:
        raise HTTPException(status_code=404, detail="打卡记录不存在")

    checkin.feedback = body.feedback
    db.commit()
    db.refresh(checkin)
    return {
        "message": "反馈提交成功",
        "checkin_id": checkin.id,
        "feedback": checkin.feedback,
    }
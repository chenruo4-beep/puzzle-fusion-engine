"""打卡路由 - 创建打卡、列表、完成、提交反馈、连续打卡"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database import get_db
from models.checkin import CheckIn
from pydantic import BaseModel
from typing import Optional


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

    class Config:
        from_attributes = True


class FeedbackBody(BaseModel):
    """反馈请求体"""
    feedback: str


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
async def list_checkins(db: Session = Depends(get_db)):
    """获取所有打卡记录"""
    checkins = db.query(CheckIn).filter(CheckIn.user_id == 1).order_by(CheckIn.created_at.desc()).all()
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
        })
    return result


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_checkin(body: CheckInCreate, db: Session = Depends(get_db)):
    """创建新的打卡"""
    checkin = CheckIn(
        user_id=1,  # 占位
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
async def get_streak(db: Session = Depends(get_db)):
    """获取当前连续打卡天数"""
    streak = _calculate_streak(db, 1)
    
    # 获取历史最高记录
    max_streak = db.query(CheckIn).filter(
        CheckIn.user_id == 1
    ).order_by(CheckIn.streak_days.desc()).first()
    max_streak_days = max_streak.streak_days if max_streak else 0
    
    # 检查今天是否已打卡
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today + timedelta(days=1), datetime.min.time())
    
    today_checkin = db.query(CheckIn).filter(
        CheckIn.user_id == 1,
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
async def complete_checkin(checkin_id: int, db: Session = Depends(get_db)):
    """完成打卡 - 将打卡状态标记为已完成，计算连续天数"""
    checkin = db.query(CheckIn).filter(CheckIn.id == checkin_id).first()
    if not checkin:
        raise HTTPException(status_code=404, detail="打卡记录不存在")

    checkin.status = "completed"
    checkin.completed_at = datetime.utcnow()
    
    # 计算连续打卡天数
    streak = _calculate_streak(db, 1)
    checkin.streak_days = streak
    
    # 检查是否是新纪录
    max_streak = db.query(CheckIn).filter(
        CheckIn.user_id == 1
    ).order_by(CheckIn.streak_days.desc()).first()
    if max_streak and streak > max_streak.streak_days:
        checkin.is_new_record = 1
    
    db.commit()
    db.refresh(checkin)
    return {
        "message": "打卡完成",
        "checkin_id": checkin.id,
        "status": checkin.status,
        "completed_at": checkin.completed_at.isoformat() if checkin.completed_at else None,
        "streak_days": streak,
        "is_new_record": checkin.is_new_record == 1,
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
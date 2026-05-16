"""打卡路由 - 创建打卡、列表、完成、提交反馈"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
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

    class Config:
        from_attributes = True


class FeedbackBody(BaseModel):
    """反馈请求体"""
    feedback: str


router = APIRouter()


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


@router.patch("/{checkin_id}/complete")
async def complete_checkin(checkin_id: int, db: Session = Depends(get_db)):
    """完成打卡 - 将打卡状态标记为已完成"""
    checkin = db.query(CheckIn).filter(CheckIn.id == checkin_id).first()
    if not checkin:
        raise HTTPException(status_code=404, detail="打卡记录不存在")

    checkin.status = "completed"
    checkin.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(checkin)
    return {
        "message": "打卡完成",
        "checkin_id": checkin.id,
        "status": checkin.status,
        "completed_at": checkin.completed_at.isoformat() if checkin.completed_at else None,
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
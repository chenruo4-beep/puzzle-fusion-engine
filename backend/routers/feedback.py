"""用户反馈路由"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.feedback import Feedback
from models.user import User
from routers.auth import get_current_user

router = APIRouter()


class FeedbackCreate(BaseModel):
    category: str = "建议"
    content: str
    contact: str | None = None


@router.get("/")
async def list_feedback(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """查看当前用户提交的反馈记录"""
    feedbacks = db.query(Feedback).filter(
        Feedback.user_id == current_user.id
    ).order_by(Feedback.created_at.desc()).all()
    return [
        {
            "id": f.id,
            "category": f.category,
            "content": f.content,
            "contact": f.contact,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in feedbacks
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_feedback(body: FeedbackCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """用户提交反馈或建议"""
    fb = Feedback(
        user_id=current_user.id,
        category=body.category,
        content=body.content.strip(),
        contact=body.contact.strip() if body.contact else None,
    )
    db.add(fb)
    db.commit()
    return {"ok": True, "message": "收到你的反馈了，谢谢！"}

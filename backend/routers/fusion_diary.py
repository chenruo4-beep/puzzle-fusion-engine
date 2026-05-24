"""融合日记路由 - 每次融合后写一句话记录"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.fusion_diary import FusionDiary
from routers.auth import get_current_user
from schemas.fusion_diary import FusionDiaryCreate, FusionDiaryResponse

router = APIRouter()


@router.get("/", response_model=list[FusionDiaryResponse])
async def list_diaries(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """获取当前用户所有融合日记，按时间倒序"""
    diaries = db.query(FusionDiary).filter(
        FusionDiary.user_id == current_user.id
    ).order_by(FusionDiary.created_at.desc()).all()
    return diaries


@router.post("/", response_model=FusionDiaryResponse, status_code=status.HTTP_201_CREATED)
async def create_diary(body: FusionDiaryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """写一条融合日记"""
    diary = FusionDiary(
        user_id=current_user.id,
        fusion_id=body.fusion_id,
        content=body.content,
    )
    db.add(diary)
    db.commit()
    db.refresh(diary)
    return diary

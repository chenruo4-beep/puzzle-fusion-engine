"""计费路由 — 用量查询与升级"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from routers.auth import get_current_user
from services.billing import get_usage, start_trial

router = APIRouter()


@router.get("/usage")
async def usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """查询当前用量"""
    return get_usage(current_user, db)


@router.post("/trial")
async def trial(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """开启 7 天专业版试用"""
    start_trial(current_user, db)
    return get_usage(current_user, db)

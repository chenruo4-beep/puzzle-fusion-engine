"""用户认知画像路由 — P3.2 动态维度标签"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.checkin import CheckIn
from models.fusion import Fusion
from models.fragment import Fragment
from models.journey_map import JourneyMap
from models.user import User
from routers.auth import get_current_user
from services.ai.cognitive_profile import cognitive_profile

router = APIRouter()


@router.get("/profile/cognitive")
async def get_cognitive_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """计算并返回用户认知画像"""
    user_id = current_user.id
    # 检查缓存
    cached = cognitive_profile.get_profile(user_id)
    if cached:
        return cached

    # 收集行为数据
    checkin_count = db.query(CheckIn).filter(CheckIn.user_id == user_id).count()
    fusion_count = db.query(Fusion).filter(Fusion.user_id == user_id).count()
    fragment_count = db.query(Fragment).filter(Fragment.user_id == user_id).count()
    total_map_count = db.query(JourneyMap).filter(JourneyMap.user_id == user_id).count()
    abandoned_map_count = db.query(JourneyMap).filter(
        JourneyMap.user_id == user_id, JourneyMap.status == "abandoned"
    ).count()

    # 反馈数据
    useful_count = db.query(Fusion).filter(
        Fusion.user_id == user_id, Fusion.feedback == "useful"
    ).count()
    not_useful_count = db.query(Fusion).filter(
        Fusion.user_id == user_id, Fusion.feedback == "not_useful"
    ).count()

    # 碎片类型分布
    fragments = db.query(Fragment.fragment_type).filter(
        Fragment.user_id == user_id
    ).all()
    type_counts: dict[str, int] = {}
    for (ftype,) in fragments:
        if ftype:
            type_counts[ftype] = type_counts.get(ftype, 0) + 1
    top_types = sorted(type_counts, key=type_counts.get, reverse=True)[:3] if type_counts else []

    # 计算画像
    return cognitive_profile.compute_profile(
        user_id=user_id,
        checkin_count=checkin_count,
        fusion_count=fusion_count,
        fragment_count=fragment_count,
        abandoned_map_count=abandoned_map_count,
        total_map_count=total_map_count,
        useful_feedback_count=useful_count,
        not_useful_feedback_count=not_useful_count,
        top_fragment_types=top_types,
    )

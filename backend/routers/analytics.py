"""A/B测试埋点路由"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.analytics import ABEvent
from pydantic import BaseModel
from typing import Optional


router = APIRouter()


class EventPayload(BaseModel):
    """埋点事件请求体"""
    version: str          # "A" 或 "B"
    event_type: str       # "page_view" 或 "cta_click"
    user_id: Optional[str] = None  # 匿名用户标识


class EventResponse(BaseModel):
    """埋点事件响应体"""
    id: int
    version: str
    event_type: str
    user_id: Optional[str] = None
    timestamp: str

    class Config:
        from_attributes = True


@router.post("/event", response_model=EventResponse)
async def track_event(payload: EventPayload, db: Session = Depends(get_db)):
    """接收埋点事件"""
    event = ABEvent(
        version=payload.version,
        event_type=payload.event_type,
        user_id=payload.user_id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return EventResponse(
        id=event.id,
        version=event.version,
        event_type=event.event_type,
        user_id=event.user_id,
        timestamp=event.timestamp.isoformat() if event.timestamp else "",
    )


@router.get("/stats")
async def get_ab_stats(db: Session = Depends(get_db)):
    """获取 A/B 测试统计数据（转化率对比）"""
    from sqlalchemy import func as sql_func

    # 按版本+事件类型聚合
    rows = (
        db.query(
            ABEvent.version,
            ABEvent.event_type,
            sql_func.count(ABEvent.id).label("cnt"),
        )
        .group_by(ABEvent.version, ABEvent.event_type)
        .all()
    )

    # 构建聚合字典
    counts: dict[str, dict[str, int]] = {}
    for version, event_type, cnt in rows:
        counts.setdefault(version, {})[event_type] = cnt

    # 计算转化率
    result_stats = {}
    for version in sorted(counts.keys()):
        page_views = counts[version].get("page_view", 0)
        cta_clicks = counts[version].get("cta_click", 0)
        conversion = round((cta_clicks / page_views * 100) if page_views > 0 else 0, 1)
        result_stats[version] = {
            "page_views": page_views,
            "cta_clicks": cta_clicks,
            "conversion_rate": conversion,
            "lift_vs_a": None,  # 稍后填充
        }

    # 补充 lift（相对于版本A的提升）
    a_rate = result_stats.get("A", {}).get("conversion_rate", 0)
    for v in result_stats:
        if v == "A":
            result_stats[v]["lift_vs_a"] = 0
        else:
            v_rate = result_stats[v]["conversion_rate"]
            if a_rate > 0:
                result_stats[v]["lift_vs_a"] = round((v_rate - a_rate) / a_rate * 100, 1)
            else:
                result_stats[v]["lift_vs_a"] = 0 if v_rate == 0 else None

    # 总计
    total_events = sum(
        v_events["page_views"] + v_events["cta_clicks"]
        for v_events in result_stats.values()
    )

    return {
        "total_events": total_events,
        "stats": result_stats,
        "versions": sorted(counts.keys()),
    }
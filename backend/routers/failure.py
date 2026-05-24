"""失败飞轮路由 — P3.1 高频失败路径追踪"""

from fastapi import APIRouter
from services.ai.failure_tracker import failure_flywheel
from services.ai.quality_monitor import quality_monitor

router = APIRouter()


@router.get("/failure-flywheel/summary")
async def get_failure_summary():
    """获取失败飞轮摘要数据"""
    return failure_flywheel.get_summary()


@router.get("/failure-flywheel/hot-steps")
async def get_hot_stuck_steps(limit: int = 10):
    """获取最常见的卡住步骤"""
    return failure_flywheel.get_hot_stuck_steps(limit)


@router.get("/failure-flywheel/quality-report")
async def get_quality_report():
    """获取质量监控报告"""
    return quality_monitor.get_quality_report()


@router.post("/failure-flywheel/track-abandon")
async def track_abandon(map_id: int, title: str = "", progress: int = 0, reason: str = ""):
    """手动记录地图放弃事件"""
    failure_flywheel.record_map_abandoned(map_id, title, progress, reason)
    return {"status": "ok"}

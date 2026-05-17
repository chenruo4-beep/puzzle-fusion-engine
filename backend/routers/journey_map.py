"""行进拼图地图路由 — 地图CRUD和进度管理"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.journey_map import JourneyMap, MapStep, MapProgress
from models.fusion import Fusion
from schemas.journey_map import (
    JourneyMapCreate, JourneyMapResponse, MapStepResponse,
    MapProgressUpdate, MapProgressResponse, MiniDirection
)

router = APIRouter()


@router.post("/", response_model=JourneyMapResponse, status_code=status.HTTP_201_CREATED)
async def create_journey_map(body: JourneyMapCreate, db: Session = Depends(get_db)):
    """从融合结果创建行进地图"""
    # 创建地图
    map_obj = JourneyMap(
        user_id=1,
        fusion_id=body.fusion_id,
        title=body.title,
        subtitle=body.subtitle,
        difficulty=body.difficulty,
        time_to_result=body.time_to_result,
        status="active",
        progress=0,
    )
    db.add(map_obj)
    db.commit()
    db.refresh(map_obj)

    # 创建地图步骤
    for i, step_data in enumerate(body.steps):
        step = MapStep(
            map_id=map_obj.id,
            step_number=step_data.step_number,
            title=step_data.title,
            description=step_data.description,
            landmark=step_data.landmark,
            landmark_icon=step_data.landmark_icon,
            time_estimate=step_data.time_estimate,
            action=step_data.action,
            status="active" if i == 0 else "locked",
            position_x=step_data.position_x,
            position_y=step_data.position_y,
        )
        db.add(step)

    db.commit()

    # 初始化用户进度
    progress = MapProgress(
        user_id=1,
        map_id=map_obj.id,
        current_step=1,
        overall_progress=0,
    )
    db.add(progress)
    db.commit()

    return map_obj


@router.get("/", response_model=list[JourneyMapResponse])
async def list_journey_maps(db: Session = Depends(get_db)):
    """获取用户的所有行进地图"""
    maps = db.query(JourneyMap).filter(JourneyMap.user_id == 1).order_by(JourneyMap.created_at.desc()).all()
    return maps


@router.get("/{map_id}", response_model=JourneyMapResponse)
async def get_journey_map(map_id: int, db: Session = Depends(get_db)):
    """获取单个地图详情（包含步骤）"""
    map_obj = db.query(JourneyMap).filter(JourneyMap.id == map_id, JourneyMap.user_id == 1).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="地图不存在")
    return map_obj


@router.get("/{map_id}/steps", response_model=list[MapStepResponse])
async def get_map_steps(map_id: int, db: Session = Depends(get_db)):
    """获取地图的所有步骤"""
    steps = db.query(MapStep).filter(MapStep.map_id == map_id).order_by(MapStep.step_number).all()
    return steps


@router.get("/{map_id}/progress", response_model=MapProgressResponse)
async def get_map_progress(map_id: int, db: Session = Depends(get_db)):
    """获取用户在地图上的进度"""
    progress = db.query(MapProgress).filter(
        MapProgress.map_id == map_id,
        MapProgress.user_id == 1
    ).first()
    if not progress:
        raise HTTPException(status_code=404, detail="进度记录不存在")
    return progress


@router.patch("/{map_id}/progress")
async def update_map_progress(map_id: int, body: MapProgressUpdate, db: Session = Depends(get_db)):
    """更新地图进度"""
    progress = db.query(MapProgress).filter(
        MapProgress.map_id == map_id,
        MapProgress.user_id == 1
    ).first()
    if not progress:
        raise HTTPException(status_code=404, detail="进度记录不存在")

    # 更新当前步骤
    if body.current_step is not None:
        progress.current_step = body.current_step

    # 更新整体进度
    if body.overall_progress is not None:
        progress.overall_progress = body.overall_progress

    # 更新步骤状态
    if body.step_status is not None:
        step = db.query(MapStep).filter(
            MapStep.map_id == map_id,
            MapStep.step_number == body.step_number
        ).first()
        if step:
            step.status = body.step_status
            if body.completion_percent is not None:
                step.completion_percent = body.completion_percent

    db.commit()
    db.refresh(progress)

    # 重新计算整体进度
    steps = db.query(MapStep).filter(MapStep.map_id == map_id).all()
    if steps:
        total_percent = sum(s.completion_percent for s in steps)
        progress.overall_progress = min(100, total_percent // len(steps))

        # 更新地图整体进度
        map_obj = db.query(JourneyMap).filter(JourneyMap.id == map_id).first()
        if map_obj:
            map_obj.progress = progress.overall_progress

    db.commit()
    return progress


@router.delete("/{map_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journey_map(map_id: int, db: Session = Depends(get_db)):
    """删除地图及其步骤和进度"""
    map_obj = db.query(JourneyMap).filter(JourneyMap.id == map_id, JourneyMap.user_id == 1).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="地图不存在")

    # 删除关联数据
    db.query(MapStep).filter(MapStep.map_id == map_id).delete()
    db.query(MapProgress).filter(MapProgress.map_id == map_id).delete()
    db.delete(map_obj)
    db.commit()

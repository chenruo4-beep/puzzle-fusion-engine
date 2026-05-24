"""行进拼图地图路由 — 地图CRUD和进度管理"""

import time

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.journey_map import JourneyMap, MapStep, MapProgress
from models.fusion import Fusion
from models.user import User
from routers.auth import get_current_user
from schemas.journey_map import (
    JourneyMapCreate, JourneyMapResponse, MapStepResponse,
    MapProgressUpdate, MapProgressResponse, MiniDirection
)
from services.ai.failure_tracker import failure_flywheel

router = APIRouter()


@router.post("/", response_model=JourneyMapResponse, status_code=status.HTTP_201_CREATED)
async def create_journey_map(body: JourneyMapCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """从融合结果创建行进地图"""
    # 创建地图
    map_obj = JourneyMap(
        user_id=current_user.id,
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
    failure_flywheel.record_map_created()

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
        user_id=current_user.id,
        map_id=map_obj.id,
        current_step=1,
        overall_progress=0,
    )
    db.add(progress)
    db.commit()

    return map_obj


@router.get("/", response_model=list[JourneyMapResponse])
async def list_journey_maps(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """获取用户的所有行进地图"""
    maps = db.query(JourneyMap).filter(JourneyMap.user_id == current_user.id).order_by(JourneyMap.created_at.desc()).all()
    return maps


@router.get("/{map_id}", response_model=JourneyMapResponse)
async def get_journey_map(map_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """获取单个地图详情（包含步骤）"""
    map_obj = db.query(JourneyMap).filter(JourneyMap.id == map_id, JourneyMap.user_id == current_user.id).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="地图不存在")
    return map_obj


@router.get("/{map_id}/steps", response_model=list[MapStepResponse])
async def get_map_steps(map_id: int, db: Session = Depends(get_db)):
    """获取地图的所有步骤"""
    steps = db.query(MapStep).filter(MapStep.map_id == map_id).order_by(MapStep.step_number).all()
    return steps


@router.get("/{map_id}/progress", response_model=MapProgressResponse)
async def get_map_progress(map_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """获取用户在地图上的进度"""
    progress = db.query(MapProgress).filter(
        MapProgress.map_id == map_id,
        MapProgress.user_id == current_user.id
    ).first()
    if not progress:
        raise HTTPException(status_code=404, detail="进度记录不存在")
    return progress


@router.patch("/{map_id}/progress")
async def update_map_progress(map_id: int, body: MapProgressUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """更新地图进度"""
    progress = db.query(MapProgress).filter(
        MapProgress.map_id == map_id,
        MapProgress.user_id == current_user.id
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
async def delete_journey_map(map_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """删除地图及其步骤和进度"""
    map_obj = db.query(JourneyMap).filter(JourneyMap.id == map_id, JourneyMap.user_id == current_user.id).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="地图不存在")

    # P3.1: 记录放弃事件
    failure_flywheel.record_map_abandoned(map_id, map_obj.title, map_obj.progress)

    # 删除关联数据
    db.query(MapStep).filter(MapStep.map_id == map_id).delete()
    db.query(MapProgress).filter(MapProgress.map_id == map_id).delete()
    db.delete(map_obj)
    db.commit()


# ── 人生章节叙事 ──────────────────────────────────────────

CHAPTER_TEMPLATES = {
    "序章": [
        "你站在了这条路的起点。{title}——这个念头可能在你心里转了有一阵了。\n\n你带来的东西：{strengths}。\n\n接下来，你会穿过{step_count}个阶段。第一个关口就在眼前。别想太远，先迈出第一步。",
    ],
    "进行中": [
        "你已经走过了{completed_steps}个阶段，这条路开始有形状了。\n\n最让你觉得'这对了'的，是{best_step}。\n\n接下来是{next_step}——这一步可能会花你{next_time}。不急，按你的节奏来。",
    ],
    "完成": [
        "你做到了。\n\n从{first_step}开始，到{last_step}结束，你总共走了{total_time}。回头看的时候，哪一步让你最意外？\n\n{strengths}——这些不是别人告诉你的，是你一步一步走出来的。",
    ],
}

NARRATIVE_MODES = {
    "epic": {
        "label": "史诗模式",
        "desc": "把你的旅程当作一场英雄叙事",
        "opening_tone": "这是一段值得被记住的旅程。",
    },
    "experiment": {
        "label": "试验模式",
        "desc": "每一次尝试，都是在收集关于自己的数据",
        "opening_tone": "不用太严肃。这只是一个试验。",
    },
}


@router.get("/{map_id}/chapter-narrative")
async def chapter_narrative(map_id: int, mode: str = "experiment", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """生成人生章节叙事（序章/进行中/完成）"""
    map_obj = db.query(JourneyMap).filter(JourneyMap.id == map_id, JourneyMap.user_id == current_user.id).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="地图不存在")

    steps = db.query(MapStep).filter(MapStep.map_id == map_id).order_by(MapStep.step_number).all()
    if not steps:
        raise HTTPException(status_code=404, detail="地图没有步骤")

    fusion = db.query(Fusion).filter(Fusion.id == map_obj.fusion_id).first()

    completed_steps = [s for s in steps if s.status == "completed"]
    active_step = next((s for s in steps if s.status == "active"), None)
    locked_steps = [s for s in steps if s.status == "locked"]

    # 提取碎片线索
    strengths = "你的执行力和直觉"
    if fusion and fusion.fragment_ids:
        from models.fragment import Fragment
        frag_ids = [int(x.strip()) for x in fusion.fragment_ids.split(",") if x.strip().isdigit()]
        frags = db.query(Fragment).filter(Fragment.id.in_(frag_ids[:3])).all()
        if frags:
            strengths = "、".join(f.content[:20] for f in frags)

    step_count = len(steps)

    if map_obj.status == "active" and len(completed_steps) == 0:
        chapter_type = "序章"
        template = CHAPTER_TEMPLATES["序章"][0]
        narrative = template.format(
            title=map_obj.title,
            strengths=strengths,
            step_count=step_count,
        )
    elif map_obj.status == "active":
        chapter_type = "进行中"
        template = CHAPTER_TEMPLATES["进行中"][0]
        best_step = completed_steps[-1].landmark or completed_steps[-1].title if completed_steps else "第一步"
        next_step = active_step.landmark if active_step else (locked_steps[0].landmark if locked_steps else "下一阶段")
        next_time = active_step.time_estimate if active_step else "一些时间"
        narrative = template.format(
            completed_steps=len(completed_steps),
            best_step=best_step,
            next_step=next_step,
            next_time=next_time,
        )
    else:
        chapter_type = "完成"
        template = CHAPTER_TEMPLATES["完成"][0]
        first = steps[0].landmark or "出发"
        last = steps[-1].landmark or "终点"
        total_time = map_obj.time_to_result or "一段时间"
        narrative = template.format(
            first_step=first,
            last_step=last,
            total_time=total_time,
            strengths=strengths,
        )

    mode_config = NARRATIVE_MODES.get(mode, NARRATIVE_MODES["experiment"])

    return {
        "map_id": map_id,
        "chapter_type": chapter_type,
        "mode": mode,
        "mode_config": mode_config,
        "narrative": narrative.strip(),
        "stats": {
            "total_steps": step_count,
            "completed_steps": len(completed_steps),
            "active_step": active_step.step_number if active_step else None,
            "progress": map_obj.progress,
        },
    }


@router.get("/{map_id}/journey-review")
async def journey_review(map_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """生成完整旅程回顾报告"""
    map_obj = db.query(JourneyMap).filter(JourneyMap.id == map_id, JourneyMap.user_id == current_user.id).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="地图不存在")

    steps = db.query(MapStep).filter(MapStep.map_id == map_id).order_by(MapStep.step_number).all()
    if not steps:
        raise HTTPException(status_code=404, detail="地图没有步骤")

    fusion = db.query(Fusion).filter(Fusion.id == map_obj.fusion_id).first()

    # 提取出发碎片
    origin_fragments = []
    if fusion and fusion.fragment_ids:
        from models.fragment import Fragment
        frag_ids = [int(x.strip()) for x in fusion.fragment_ids.split(",") if x.strip().isdigit()]
        frags = db.query(Fragment).filter(Fragment.id.in_(frag_ids)).all()
        origin_fragments = [{"type": f.fragment_type, "content": f.content} for f in frags]

    # 构建景点头部
    landmarks_passed = []
    for s in steps:
        if s.status != "locked":
            landmarks_passed.append({
                "name": s.landmark or s.title,
                "icon": s.landmark_icon or "🧩",
                "status": s.status,
                "progress": s.completion_percent,
            })

    completed = [s for s in steps if s.status == "completed"]
    total_time = map_obj.time_to_result or "一段时间"

    # 收获总结
    gains = []
    if origin_fragments:
        gains.append(f"从{len(origin_fragments)}块碎片出发，走出了{len(steps)}个阶段")
    if len(completed) > 0:
        gains.append(f"完成了{len(completed)}个关卡的挑战")
    if map_obj.progress == 100:
        gains.append("走完了全程，看清了自己是谁")
    elif map_obj.progress and map_obj.progress >= 50:
        gains.append("已经走过了一半，对自己的了解比大多数人都深")
    else:
        gains.append("还在路上，每一步都算数")

    # 关键转折点
    turning_points = []
    for i, s in enumerate(steps):
        if s.status == "completed" and i > 0:
            prev = steps[i - 1]
            if prev.status == "completed" and s.completion_percent >= 80:
                turning_points.append(f"从「{prev.landmark or prev.title}」走到「{s.landmark or s.title}」时，你跨过了一个关键节点")

    narrative = f"""你从这些碎片出发：
{chr(10).join(f'· {f["content"]}' for f in origin_fragments) if origin_fragments else '· 带着对自己的好奇出发'}

一路上，你走过了这些地方：
{chr(10).join(f'{l["icon"]} {l["name"]}{" ✓" if l["status"] == "completed" else " ..."}' for l in landmarks_passed)}

{gains[0] if gains else ''}

这条路花了你{total_time}。途中经历了{len(turning_points) if turning_points else '一些'}转折时刻。
{chr(10).join(turning_points[:3])}

现在回头看看出发前的自己——你比那时候，更知道自己是谁了。"""

    return {
        "map_id": map_id,
        "map_title": map_obj.title,
        "map_status": map_obj.status,
        "progress": map_obj.progress,
        "origin_fragments": origin_fragments,
        "landmarks_passed": landmarks_passed,
        "gains": gains,
        "turning_points": turning_points,
        "total_time": total_time,
        "narrative": narrative.strip(),
        "shareable": map_obj.progress == 100,
    }

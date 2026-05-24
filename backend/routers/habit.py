"""微习惯路由 - 碎片孵化、每日打卡、生长追踪"""

from __future__ import annotations

import logging
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.habit import MicroHabit
from models.fragment import Fragment
from models.user import User
from routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

MICRO_ACTIONS = {
    "技能": {
        "name": "让{}闪一下光",
        "desc": "每天花2分钟，找一个能用到{}的小场景，哪怕只是跟朋友聊一句。",
        "action": "今天找到1个用到它的机会"
    },
    "知识": {
        "name": "给{}浇水",
        "desc": "每天花2分钟，随便翻一篇跟{}有关的东西，不用记住，翻就行。",
        "action": "今天翻了一篇相关内容"
    },
    "特质": {
        "name": "看见{}",
        "desc": "每天花2分钟，留意自己什么时候表现出了{}，记一个小瞬间。",
        "action": "今天记下了一个展现它的时刻"
    },
    "经验": {
        "name": "回味{}",
        "desc": "每天花2分钟，回想那段经历里你学到的一个小点。",
        "action": "今天回想了一个小收获"
    },
    "兴趣": {
        "name": "碰一下{}",
        "desc": "每天花2分钟，做一件跟{}有关的极小的事。看个视频、存张图都算。",
        "action": "今天碰了一下这件事"
    },
    "默认": {
        "name": "滋养{}",
        "desc": "每天花2分钟，给{}一点点注意力。不需要完成什么，碰一下就好。",
        "action": "今天给了它一点注意力"
    },
}


class HabitSuggestRequest(BaseModel):
    fragment_id: int
    user_id: int = 1


class HabitStartRequest(BaseModel):
    habit_id: int
    user_id: int = 1


class HabitCheckinRequest(BaseModel):
    habit_id: int
    user_id: int = 1


@router.post("/suggest")
def suggest_habit(req: HabitSuggestRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """为碎片建议一个微习惯"""
    fragment = db.query(Fragment).filter(Fragment.id == req.fragment_id, Fragment.user_id == current_user.id).first()
    if not fragment:
        raise HTTPException(status_code=404, detail="碎片不存在")

    ftype = fragment.fragment_type or "默认"
    template = MICRO_ACTIONS.get(ftype, MICRO_ACTIONS["默认"])
    content = fragment.content if fragment.content else "它"

    return {
        "fragment_id": fragment.id,
        "fragment_content": content,
        "fragment_type": ftype,
        "habit_name": template["name"].format(content[:20]),
        "habit_desc": template["desc"].format(content[:20]),
        "daily_action": template["action"],
        "growth_stages": [
            {"stage": 0, "label": "种子", "icon": "🌱", "days": 0},
            {"stage": 1, "label": "发芽", "icon": "🌿", "days": 3},
            {"stage": 2, "label": "幼苗", "icon": "🪴", "days": 7},
            {"stage": 3, "label": "开花", "icon": "🌸", "days": 21},
            {"stage": 4, "label": "结果", "icon": "🍀", "days": 66},
        ],
    }


@router.post("/start")
def start_habit(req: HabitStartRequest, db: Session = Depends(get_db)):
    """确认开启微习惯——但需要先调用 suggest 拿到完整信息"""
    raise HTTPException(status_code=400, detail="请先调用 suggest，再调用 start_with_data")


class HabitStartFullRequest(BaseModel):
    fragment_id: int
    user_id: int = 1
    habit_name: str
    habit_desc: str


@router.post("/start_with_data")
def start_habit_full(req: HabitStartFullRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """确认开启微习惯"""
    fragment = db.query(Fragment).filter(Fragment.id == req.fragment_id, Fragment.user_id == current_user.id).first()
    if not fragment:
        raise HTTPException(status_code=404, detail="碎片不存在")

    existing = db.query(MicroHabit).filter(
        MicroHabit.fragment_id == req.fragment_id,
        MicroHabit.active == True
    ).first()
    if existing:
        return {"ok": True, "habit_id": existing.id, "message": "已经在孵化中", "existing": True}

    habit = MicroHabit(
        user_id=current_user.id,
        fragment_id=req.fragment_id,
        name=req.habit_name,
        description=req.habit_desc,
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return {"ok": True, "habit_id": habit.id, "message": "种子已播下", "existing": False}


@router.post("/checkin")
def checkin_habit(req: HabitCheckinRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """每日打卡——给习惯浇一次水"""
    habit = db.query(MicroHabit).filter(MicroHabit.id == req.habit_id, MicroHabit.user_id == current_user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="习惯不存在")

    today = str(date.today())
    if habit.last_checkin_date == today:
        return {"ok": True, "message": "今天已经浇过水了", "streak": habit.streak, "stage": habit.growth_stage, "duplicate": True}

    yesterday = str(date.today().replace(day=date.today().day - 1) if date.today().day > 1 else date.today())
    if habit.last_checkin_date == yesterday:
        habit.streak += 1
    else:
        habit.streak = 1

    habit.last_checkin_date = today

    if habit.streak >= 66:
        habit.growth_stage = 4
    elif habit.streak >= 21:
        habit.growth_stage = 3
    elif habit.streak >= 7:
        habit.growth_stage = 2
    elif habit.streak >= 3:
        habit.growth_stage = 1

    db.commit()
    db.refresh(habit)

    stage_labels = {0: "种子", 1: "发芽", 2: "幼苗", 3: "开花", 4: "结果"}
    stage_icons = {0: "🌱", 1: "🌿", 2: "🪴", 3: "🌸", 4: "🍀"}
    return {
        "ok": True,
        "message": f"浇了一次水，{stage_icons[habit.growth_stage]} {stage_labels[habit.growth_stage]}阶段",
        "streak": habit.streak,
        "stage": habit.growth_stage,
        "stage_label": stage_labels[habit.growth_stage],
        "stage_icon": stage_icons[habit.growth_stage],
        "duplicate": False,
    }


@router.get("/active")
def list_active_habits(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """列出用户所有活跃的微习惯"""
    habits = db.query(MicroHabit).filter(MicroHabit.user_id == current_user.id, MicroHabit.active == True).all()
    stage_labels = {0: "种子", 1: "发芽", 2: "幼苗", 3: "开花", 4: "结果"}
    stage_icons = {0: "🌱", 1: "🌿", 2: "🪴", 3: "🌸", 4: "🍀"}

    result = []
    for h in habits:
        fragment = db.query(Fragment).filter(Fragment.id == h.fragment_id).first()
        result.append({
            "id": h.id,
            "fragment_id": h.fragment_id,
            "fragment_content": fragment.content if fragment else "",
            "name": h.name,
            "description": h.description,
            "streak": h.streak,
            "growth_stage": h.growth_stage,
            "stage_label": stage_labels.get(h.growth_stage, "种子"),
            "stage_icon": stage_icons.get(h.growth_stage, "🌱"),
            "last_checkin_date": h.last_checkin_date,
            "today_checked": h.last_checkin_date == str(date.today()),
        })
    return {"habits": result}


@router.post("/stop")
def stop_habit(req: HabitStartRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """停用一个微习惯（不删除）"""
    habit = db.query(MicroHabit).filter(MicroHabit.id == req.habit_id, MicroHabit.user_id == current_user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="习惯不存在")
    habit.active = False
    db.commit()
    return {"ok": True, "message": "已放入'放下'区域"}

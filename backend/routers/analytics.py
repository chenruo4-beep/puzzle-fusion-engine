"""A/B测试埋点路由 + 失败飞轮 + 用户认知模型"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from database import get_db
from models.analytics import ABEvent
from models.failure import FailureRecord
from models.fragment import Fragment
from models.fusion import Fusion
from models.checkin import CheckIn
from models.journal import JournalEntry
from models.journey_map import JourneyMap
from models.user import User
from routers.auth import get_current_user
from pydantic import BaseModel, ConfigDict
from typing import Optional
import random


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

    model_config = ConfigDict(from_attributes=True)


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


# ── 失败飞轮 ──────────────────────────────────────────────

class FailureReportPayload(BaseModel):
    fusion_id: int | None = None
    profession: str | None = None
    reason: str
    user_id: int | None = None


@router.post("/report-failure")
def report_failure(payload: FailureReportPayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """记录一次失败反馈"""
    record = FailureRecord(
        user_id=current_user.id,
        fusion_id=payload.fusion_id,
        profession=payload.profession,
        reason=payload.reason,
    )
    db.add(record)
    db.commit()
    return {"ok": True, "message": "已记录"}


@router.get("/failure-stats")
def failure_stats(profession: str | None = None, db: Session = Depends(get_db)):
    """获取失败统计数据"""
    q = db.query(
        FailureRecord.reason,
        sql_func.count(FailureRecord.id).label("cnt")
    )
    if profession:
        q = q.filter(FailureRecord.profession == profession)
    q = q.group_by(FailureRecord.reason).order_by(sql_func.count(FailureRecord.id).desc())

    rows = q.all()
    total = sum(r.cnt for r in rows)
    reasons = [{"reason": r.reason, "count": r.cnt, "pct": round(r.cnt / total * 100) if total > 0 else 0} for r in rows]

    # 根据失败数据生成提示
    warning = None
    if total >= 3 and reasons:
        top = reasons[0]
        if "太笼统" in top["reason"]:
            warning = f"选了这条路的人里，{top['pct']}%觉得方案太笼统。如果你也这种感觉，试试要求更具体的行动步骤。"
        elif "行不通" in top["reason"]:
            warning = f"这条路有{top['pct']}%的人试过之后觉得行不通。建议先找一个最小版本试一下，不要全量投入。"
        elif "不符" in top["reason"]:
            warning = f"{top['pct']}%的人觉得这跟自己的情况不符。你可以试着换两块碎片重新拼一下。"

    return {
        "total_failures": total,
        "reasons": reasons,
        "warning": warning,
    }


# ── 用户认知模型 ──────────────────────────────────────────

USER_PROFILES = {
    "冲动型": {
        "action_preference": "冲动型",
        "action_desc": "你倾向于想到就做，不太纠结细节。这让你启动很快，但有时会踩坑。",
        "advice": "下次拼出方向后，先花5分钟找一个'最小可试版本'，而不是直接跳进去。",
        "icons": "⚡",
    },
    "观察型": {
        "action_preference": "观察型",
        "action_desc": "你喜欢先看清楚再动。这让你少踩很多坑，但有时会错过时机。",
        "advice": "下次看到想试的方向，给自己定一个'48小时内必须动一下'的小目标。",
        "icons": "🔍",
    },
    "研究型": {
        "action_preference": "研究型",
        "action_desc": "你倾向深度研究后再行动。你的方案质量通常很高，但容易陷入'永远在准备'的状态。",
        "advice": "研究到60%就可以动了。剩下的40%会在行动中自然补上。",
        "icons": "📚",
    },
    "均衡型": {
        "action_preference": "均衡型",
        "action_desc": "你在一头扎进去和先想清楚之间找到了平衡。这是一种很难得的状态。",
        "advice": "保持这个节奏。你现在的挑战不是'怎么动'，而是'往哪个方向动'。",
        "icons": "⚖️",
    },
}


@router.get("/user-profile")
def user_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """分析用户行为，返回认知维度标签"""
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    user_id = current_user.id

    # 打卡频率
    total_checkins = db.query(CheckIn).filter(CheckIn.user_id == user_id).count()
    recent_checkins = db.query(CheckIn).filter(
        CheckIn.user_id == user_id, CheckIn.created_at >= thirty_days_ago
    ).count()

    # 融合数据
    total_fusions = db.query(Fusion).filter(Fusion.user_id == user_id).count()
    recent_fusions = db.query(Fusion).filter(
        Fusion.user_id == user_id, Fusion.created_at >= thirty_days_ago
    ).count()

    # 碎片数据
    total_fragments = db.query(Fragment).filter(
        Fragment.user_id == user_id, Fragment.archived == 0
    ).count()

    # 失败反馈
    total_failures = db.query(FailureRecord).filter(FailureRecord.user_id == user_id).count()
    common_failure_reason = None
    if total_failures > 0:
        top_reason = (
            db.query(FailureRecord.reason, sql_func.count(FailureRecord.id).label("cnt"))
            .filter(FailureRecord.user_id == user_id)
            .group_by(FailureRecord.reason)
            .order_by(sql_func.count(FailureRecord.id).desc())
            .first()
        )
        common_failure_reason = top_reason.reason if top_reason else None

    # 日记数据
    total_journals = db.query(JournalEntry).filter(JournalEntry.user_id == user_id).count()

    # 活跃地图
    active_maps = db.query(JourneyMap).filter(
        JourneyMap.user_id == user_id, JourneyMap.status == "active"
    ).count()
    completed_maps = db.query(JourneyMap).filter(
        JourneyMap.user_id == user_id, JourneyMap.status == "completed"
    ).count()

    # 判断行动偏好
    if total_fusions == 0:
        profile = USER_PROFILES["观察型"]
    elif recent_fusions >= 5 and total_failures >= 3:
        profile = USER_PROFILES["冲动型"]
    elif recent_fusions <= 1 and total_fragments > 10:
        profile = USER_PROFILES["研究型"]
    elif recent_fusions >= 2 and total_failures <= 1:
        profile = USER_PROFILES["均衡型"]
    else:
        profile = USER_PROFILES["观察型"]

    # 优势领域（从碎片类型推断）
    fragment_types = (
        db.query(Fragment.fragment_type, sql_func.count(Fragment.id).label("cnt"))
        .filter(Fragment.user_id == user_id, Fragment.archived == 0)
        .group_by(Fragment.fragment_type)
        .order_by(sql_func.count(Fragment.id).desc())
        .all()
    )
    top_types = [{"type": t, "count": c} for t, c in fragment_types[:3]]

    return {
        "action_preference": profile["action_preference"],
        "action_desc": profile["action_desc"],
        "advice": profile["advice"],
        "icons": profile["icons"],
        "stats": {
            "total_fragments": total_fragments,
            "total_fusions": total_fusions,
            "total_journals": total_journals,
            "total_checkins": total_checkins,
            "active_maps": active_maps,
            "completed_maps": completed_maps,
            "total_failures": total_failures,
            "common_failure_reason": common_failure_reason,
        },
        "top_strengths": top_types,
    }


@router.get("/user-dashboard")
def user_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """高级分析仪表盘：时间线、类型分布、活跃热力图、增长趋势"""
    user_id = current_user.id
    now = datetime.utcnow()

    # ── 1. 按月统计碎片/融合/日记增长 ──────────────────
    six_months_ago = now - timedelta(days=180)
    months_raw = db.query(
        sql_func.strftime('%Y-%m', Fragment.created_at).label('month'),
        sql_func.count(Fragment.id).label('fragments')
    ).filter(Fragment.user_id == user_id, Fragment.created_at >= six_months_ago
    ).group_by(sql_func.strftime('%Y-%m', Fragment.created_at)).all()

    fusion_months = db.query(
        sql_func.strftime('%Y-%m', Fusion.created_at).label('month'),
        sql_func.count(Fusion.id).label('fusions')
    ).filter(Fusion.user_id == user_id, Fusion.created_at >= six_months_ago
    ).group_by(sql_func.strftime('%Y-%m', Fusion.created_at)).all()

    journal_months = db.query(
        sql_func.strftime('%Y-%m', JournalEntry.created_at).label('month'),
        sql_func.count(JournalEntry.id).label('journals')
    ).filter(JournalEntry.user_id == user_id, JournalEntry.created_at >= six_months_ago
    ).group_by(sql_func.strftime('%Y-%m', JournalEntry.created_at)).all()

    # 合并成统一时间线
    all_months = sorted(set(
        [r.month for r in months_raw] +
        [r.month for r in fusion_months] +
        [r.month for r in journal_months]
    ))
    frag_map = {r.month: r.fragments for r in months_raw}
    fus_map = {r.month: r.fusions for r in fusion_months}
    jour_map = {r.month: r.journals for r in journal_months}

    timeline = [
        {
            "month": m,
            "fragments": frag_map.get(m, 0),
            "fusions": fus_map.get(m, 0),
            "journals": jour_map.get(m, 0),
        }
        for m in all_months
    ]

    # ── 2. 碎片类型分布 ──────────────────────────────────
    type_dist = db.query(
        Fragment.fragment_type, sql_func.count(Fragment.id).label('cnt')
    ).filter(Fragment.user_id == user_id, Fragment.archived == 0
    ).group_by(Fragment.fragment_type
    ).order_by(sql_func.count(Fragment.id).desc()).all()

    fragment_type_distribution = [{"type": t, "count": c} for t, c in type_dist]

    # ── 3. 每周活跃热力图（过去12周） ────────────────────
    twelve_weeks_ago = now - timedelta(weeks=12)
    # 合并所有活动时间
    frag_dates = db.query(Fragment.created_at.label('dt')).filter(
        Fragment.user_id == user_id, Fragment.created_at >= twelve_weeks_ago
    ).all()
    fus_dates = db.query(Fusion.created_at.label('dt')).filter(
        Fusion.user_id == user_id, Fusion.created_at >= twelve_weeks_ago
    ).all()
    jour_dates = db.query(JournalEntry.created_at.label('dt')).filter(
        JournalEntry.user_id == user_id, JournalEntry.created_at >= twelve_weeks_ago
    ).all()
    checkin_dates = db.query(CheckIn.completed_at.label('dt')).filter(
        CheckIn.user_id == user_id, CheckIn.completed_at >= twelve_weeks_ago, CheckIn.status == 'completed'
    ).all()

    from collections import Counter
    date_counter: Counter[str] = Counter()
    for d in frag_dates + fus_dates + jour_dates + checkin_dates:
        if d.dt:
            date_counter[d.dt.strftime('%Y-%m-%d')] += 1

    activity_heatmap = [{"date": dt, "count": cnt} for dt, cnt in sorted(date_counter.items())]

    # ── 4. 关键指标 ─────────────────────────────────────
    total_fragments = db.query(Fragment).filter(Fragment.user_id == user_id, Fragment.archived == 0).count()
    total_fusions = db.query(Fusion).filter(Fusion.user_id == user_id).count()
    total_journals = db.query(JournalEntry).filter(JournalEntry.user_id == user_id).count()
    total_checkins = db.query(CheckIn).filter(CheckIn.user_id == user_id, CheckIn.status == 'completed').count()

    # 融合率 = 融合数 / 碎片数（每个碎片被融合的概率）
    fusion_rate = round((total_fusions / total_fragments * 100) if total_fragments > 0 else 0, 1)

    # 7日活跃度
    seven_days_ago = now - timedelta(days=7)
    weekly_active = len([dt for dt in date_counter if dt >= seven_days_ago.strftime('%Y-%m-%d')])

    # 平均每日活动（过去30天有活动的天数）
    thirty_days_ago = now - timedelta(days=30)
    active_days_30 = len([dt for dt in date_counter if dt >= thirty_days_ago.strftime('%Y-%m-%d')])

    return {
        "key_metrics": {
            "total_fragments": total_fragments,
            "total_fusions": total_fusions,
            "total_journals": total_journals,
            "total_checkins": total_checkins,
            "fusion_rate": fusion_rate,
            "weekly_active_days": weekly_active,
            "active_days_30": active_days_30,
        },
        "timeline": timeline,
        "fragment_type_distribution": fragment_type_distribution,
        "activity_heatmap": activity_heatmap,
    }
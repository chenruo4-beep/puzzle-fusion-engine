"""融合路由 — AI 融合碎片的创建与查询"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json

from database import get_db
from models.fusion import Fusion
from models.fragment import Fragment
from schemas.fusion import FusionCreate, FusionSaveRequest, FusionResponse


class FeedbackBody(BaseModel):
    feedback: str  # 'useful' or 'not_useful'
    reason: Optional[str] = None  # 选择"没用"时的原因
    source: Optional[str] = 'web'  # 反馈来源
from services.ai_service import AIService

router = APIRouter()


class FragmentItem(BaseModel):
    """单个碎片数据"""
    type: str       # 技能/能力/爱好/习惯/知识/经历/资源/性格
    content: str    # 碎片内容


class FusionAnalyzeRequest(BaseModel):
    """前端发起融合请求"""
    profession: str            # 用户职业
    profession_icon: str = ""  # 职业图标
    fragments: List[FragmentItem]  # 用户选择的碎片列表
    goal: Optional[str] = None  # 用户目标（可选）


@router.post("/analyze")
async def analyze_fragments(body: FusionAnalyzeRequest):
    """
    直接融合分析 — 前端传入碎片内容，AI 返回融合结果
    不依赖数据库，MVP 最快路径
    """
    if not body.fragments or len(body.fragments) < 2:
        raise HTTPException(status_code=400, detail="至少需要3个碎片才能融合")

    try:
        fragments_data = [{"type": f.type, "content": f.content} for f in body.fragments]
        result = await AIService.fuse_fragments(
            profession=body.profession,
            fragments=fragments_data,
            goal=body.goal,  # 传递用户目标（可选）
        )
        return {
            "success": True,
            "data": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI融合失败: {str(e)}")


@router.post("/spark")
async def spark_fragments(body: FusionAnalyzeRequest):
    """轻量灵感碰撞——拼图板专用，返回短小灵感火花"""
    if not body.fragments or len(body.fragments) < 2:
        raise HTTPException(status_code=400, detail="至少需要2个碎片")

    try:
        fragments_data = [{"type": f.type, "content": f.content} for f in body.fragments]
        result = await AIService.spark_fragments(fragments_data)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"灵感碰撞失败: {str(e)}")


@router.post("/save", response_model=FusionResponse, status_code=status.HTTP_201_CREATED)
async def save_fusion(body: FusionSaveRequest, db: Session = Depends(get_db)):
    """保存融合结果到历史"""
    user_id = 1  # TODO: 用户认证

    fusion = Fusion(
        user_id=user_id,
        profession=body.profession,
        title=body.title,
        fragment_ids=json.dumps(body.fragment_ids),
        result=body.result,
        iteration=1,
    )
    db.add(fusion)
    db.commit()
    db.refresh(fusion)
    return fusion


@router.get("/", response_model=list[FusionResponse])
async def list_fusions(db: Session = Depends(get_db)):
    """获取当前用户的所有融合历史"""
    user_id = 1  # TODO: 用户认证
    return db.query(Fusion).filter(Fusion.user_id == user_id).order_by(Fusion.created_at.desc()).all()


@router.get("/replay")
async def replay_fusions(db: Session = Depends(get_db)):
    """
    回放融合过程 - 按时间排序返回融合事件列表
    用于前端展示拼图板演变动画
    """
    user_id = 1  # TODO: 用户认证
    
    # 获取当前用户的所有融合记录（按创建时间排序）
    fusions = db.query(Fusion).filter(Fusion.user_id == user_id).order_by(Fusion.created_at.asc()).all()
    
    replay_events = []
    
    for fusion in fusions:
        # 解析参与融合的碎片ID
        fragment_ids = json.loads(fusion.fragment_ids) if fusion.fragment_ids else []
        
        # 获取这些碎片的详细信息
        fragments_involved = []
        if fragment_ids:
            fragments = db.query(Fragment).filter(Fragment.id.in_(fragment_ids)).all()
            fragments_involved = [{"id": f.id, "type": f.fragment_type, "content": f.content} for f in fragments]
        
        # 解析融合结果，提取标题
        result_data = None
        try:
            result_data = json.loads(fusion.result) if fusion.result else None
        except:
            pass
        
        title = fusion.title
        if not title and result_data:
            # 如果没有标题，从结果中提取
            if isinstance(result_data, dict):
                title = result_data.get("golden_sentence", "")
        if not title:
            title = f"融合 #{fusion.id}"
        
        # 构建回放事件
        replay_events.append({
            "event_id": fusion.id,
            "event_type": "fusion",
            "title": title,
            "fragments_involved": fragments_involved,
            "fragment_count": len(fragments_involved),
            "created_at": fusion.created_at.isoformat() if fusion.created_at else None,
            "result_summary": result_data.get("golden_sentence", "") if result_data else ""
        })
    
    return {
        "success": True,
        "total_events": len(replay_events),
        "events": replay_events
    }


@router.get("/{fusion_id}", response_model=FusionResponse)
async def get_fusion(fusion_id: int, db: Session = Depends(get_db)):
    """获取单个融合结果详情"""
    fusion = db.query(Fusion).filter(Fusion.id == fusion_id).first()
    if not fusion:
        raise HTTPException(status_code=404, detail="融合结果不存在")
    return fusion


@router.patch("/{fusion_id}/feedback")
async def submit_fusion_feedback(fusion_id: int, body: FeedbackBody, db: Session = Depends(get_db)):
    """记录融合结果的反馈（有用/没用），支持收集原因用于优化LLM Prompt"""
    fusion = db.query(Fusion).filter(Fusion.id == fusion_id).first()
    if not fusion:
        raise HTTPException(status_code=404, detail="融合结果不存在")

    fusion.feedback = body.feedback
    fusion.feedback_at = datetime.utcnow()
    if body.reason:
        fusion.feedback_reason = body.reason
    if body.source:
        fusion.feedback_source = body.source
    db.commit()
    db.refresh(fusion)
    return {
        "message": "反馈已记录",
        "feedback": fusion.feedback,
        "feedback_at": fusion.feedback_at.isoformat() if fusion.feedback_at else None,
        "reason": fusion.feedback_reason,
    }
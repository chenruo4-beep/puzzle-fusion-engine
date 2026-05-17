"""合拍路由 - 两人合伙分析"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from models.co_creation import CoCreation, CoCreationFragment
from models.fragment import Fragment
from pydantic import BaseModel
from typing import Optional, List


class CoCreationCreate(BaseModel):
    """创建合拍分析请求"""
    user_a_name: str
    user_b_name: str
    relationship: str = "partner"  # partner/lover/spouse/friend
    project_type: str
    user_a_fragment_ids: List[int]
    user_b_fragment_ids: List[int]


class CoCreationResponse(BaseModel):
    """合拍响应"""
    id: int
    user_a_name: str
    user_b_name: str
    relationship: str
    project_type: str
    potential_score: int  # 契合潜力值（原success_rate）
    complement_score: int
    risk_level: str
    result: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


router = APIRouter()


@router.post("/analyze")
async def analyze_co_creation(body: CoCreationCreate, db: Session = Depends(get_db)):
    """分析两人合拍度"""
    # 获取碎片
    a_fragments = db.query(Fragment).filter(
        Fragment.id.in_(body.user_a_fragment_ids)
    ).all()
    b_fragments = db.query(Fragment).filter(
        Fragment.id.in_(body.user_b_fragment_ids)
    ).all()

    if len(a_fragments) < 2 or len(b_fragments) < 2:
        raise HTTPException(status_code=400, detail="每人至少需要2个碎片")

    # 计算互补性
    a_types = set(f.fragment_type for f in a_fragments)
    b_types = set(f.fragment_type for f in b_fragments)
    
    # 类型重叠度（越低越互补）
    overlap = len(a_types & b_types)
    total_types = len(a_types | b_types)
    type_complement = int((1 - overlap / max(total_types, 1)) * 100)
    
    # 内容互补性（简单实现：关键词差异）
    a_keywords = set()
    b_keywords = set()
    for f in a_fragments:
        a_keywords.update(f.content.split()[:5])
    for f in b_fragments:
        b_keywords.update(f.content.split()[:5])
    
    content_overlap = len(a_keywords & b_keywords)
    content_total = len(a_keywords | b_keywords)
    content_complement = int((1 - content_overlap / max(content_total, 1)) * 100)
    
    # 综合互补性
    complement_score = int((type_complement + content_complement) / 2)

    # 计算成功率（基于碎片质量和互补性）
    a_quality = sum(f.quality_score or 3 for f in a_fragments) / len(a_fragments)
    b_quality = sum(f.quality_score or 3 for f in b_fragments) / len(b_fragments)
    avg_quality = (a_quality + b_quality) / 2
    
    # 关系加成
    relationship_bonus = {
        "spouse": 10,
        "lover": 8,
        "partner": 5,
        "friend": 3,
    }.get(body.relationship, 0)
    
    potential_score = min(95, int(avg_quality * 15 + complement_score * 0.3 + relationship_bonus))

    # 风险等级（基于契合潜力值）
    if potential_score >= 75:
        risk_level = "low"
    elif potential_score >= 50:
        risk_level = "medium"
    else:
        risk_level = "high"

    # 生成分析结果
    result = {
        "golden_sentence": f"{body.user_a_name} × {body.user_b_name} = 一个值得尝试的组合",
        "complement_analysis": {
            "type_complement": type_complement,
            "content_complement": content_complement,
            "overall": complement_score,
        },
        "potential_factors": [
            f"碎片质量: {avg_quality:.1f}/5",
            f"类型互补: {type_complement}%",
            f"关系加成: +{relationship_bonus}",
        ],
        "risk_points": [],
        "recommendations": [
            "先从小项目开始试水",
            "明确分工和决策机制",
            "定期复盘，及时调整",
        ],
        "directions": [
            {
                "title": f"{body.project_type} 合伙人模式",
                "description": f"基于{body.user_a_name}的{a_types.pop() if a_types else '核心能力'}和{body.user_b_name}的{b_types.pop() if b_types else '核心能力'}，形成互补",
                "difficulty": "medium",
                "next_action": "先做一个MVP验证市场需求",
                "landmark": f"{body.project_type}启动",
                "landmark_icon": "🚀",
            }
        ],
        "roadmap": [
            {"step": 1, "title": "能力盘点", "landmark": "碎片对齐", "landmark_icon": "🧩", "description": "双方完整梳理各自碎片"},
            {"step": 2, "title": "分工设计", "landmark": "角色确认", "landmark_icon": "⚖️", "description": "明确谁负责什么"},
            {"step": 3, "title": "MVP验证", "landmark": "首次交付", "landmark_icon": "🎯", "description": "最小可行产品测试"},
            {"step": 4, "title": "正式运营", "landmark": "项目上线", "landmark_icon": "🚀", "description": "全面投入运营"},
        ],
    }

    import json
    
    # 保存到数据库
    co = CoCreation(
        user_a_id=1,  # 占位
        user_a_name=body.user_a_name,
        user_b_id=2,  # 占位
        user_b_name=body.user_b_name,
        relationship=body.relationship,
        project_type=body.project_type,
        result=json.dumps(result, ensure_ascii=False),
        potential_score=potential_score,
        complement_score=complement_score,
        risk_level=risk_level,
    )
    db.add(co)
    db.commit()
    db.refresh(co)

    # 保存碎片关联
    for fid in body.user_a_fragment_ids:
        cf = CoCreationFragment(
            co_creation_id=co.id,
            fragment_id=fid,
            user_role='a',
        )
        db.add(cf)
    for fid in body.user_b_fragment_ids:
        cf = CoCreationFragment(
            co_creation_id=co.id,
            fragment_id=fid,
            user_role='b',
        )
        db.add(cf)
    db.commit()

    return {
        "success": True,
        "data": {
            "id": co.id,
            "user_a_name": co.user_a_name,
            "user_b_name": co.user_b_name,
            "relationship": co.relationship,
            "project_type": co.project_type,
            "potential_score": co.potential_score,
            "complement_score": co.complement_score,
            "risk_level": co.risk_level,
            "result": result,
            "created_at": co.created_at.isoformat() if co.created_at else "",
        }
    }


@router.get("/")
async def list_co_creations(db: Session = Depends(get_db)):
    """获取所有合拍分析"""
    cos = db.query(CoCreation).order_by(CoCreation.created_at.desc()).all()
    import json
    result = []
    for c in cos:
        result.append({
            "id": c.id,
            "user_a_name": c.user_a_name,
            "user_b_name": c.user_b_name,
            "relationship": c.relationship,
            "project_type": c.project_type,
            "potential_score": c.potential_score,
            "complement_score": c.complement_score,
            "risk_level": c.risk_level,
            "result": json.loads(c.result) if c.result else None,
            "created_at": c.created_at.isoformat() if c.created_at else "",
        })
    return result

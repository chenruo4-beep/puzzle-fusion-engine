"""
缺口识别路由 — 分析已选碎片 vs 目标所需
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from services.gap_service import GapService

router = APIRouter()


class FragmentItem(BaseModel):
    type: str
    content: str


class GapAnalysisRequest(BaseModel):
    fragments: List[FragmentItem]
    goal: str
    profession: Optional[str] = None


class GapItem(BaseModel):
    type: str
    severity: str
    current_count: int
    needed_count: int
    suggestion: str
    action: str


class GapAnalysisResponse(BaseModel):
    goal: str
    has_enough_fragments: bool
    total_fragments: int
    type_coverage: dict
    missing_types: List[str]
    gaps: List[dict]
    overall_readiness: int
    summary: str
    ai_enhanced: bool = False


@router.post("/analyze", response_model=GapAnalysisResponse)
async def analyze_gaps(body: GapAnalysisRequest):
    """
    分析碎片缺口
    
    根据已选碎片和目标，返回缺口分析：
    - 缺哪些类型的碎片
    - 严重程度
    - 具体建议
    - 今天就能做的事
    """
    if not body.goal:
        raise HTTPException(status_code=400, detail="目标不能为空")
    
    if not body.fragments:
        raise HTTPException(status_code=400, detail="至少选择1个碎片")

    fragments_data = [{"type": f.type, "content": f.content} for f in body.fragments]

    result = GapService.analyze_gaps_heuristic(
        fragments_data,
        body.goal,
    )

    return result


@router.get("/types")
async def get_fragment_types():
    """获取所有碎片类型列表"""
    from services.gap_service import FRAGMENT_TYPES
    return {
        "types": FRAGMENT_TYPES,
        "descriptions": {
            "技能": "具体会做的事（如编程、骑车、谈判）",
            "能力": "底层可迁移能力（如抗压、逻辑、说服力）",
            "爱好": "发自内心喜欢的事",
            "习惯": "日常重复的行为模式",
            "知识": "掌握的信息和理论",
            "经历": "过去的独特体验",
            "资源": "拥有的东西（人脉、工具、位置优势）",
            "性格": "天生的个性特质",
        }
    }

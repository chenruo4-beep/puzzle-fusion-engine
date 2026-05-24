"""灵感集路由 - 灵感的增删查"""

import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.inspiration import Inspiration
from pydantic import BaseModel, ConfigDict
from typing import Optional, List


router = APIRouter()


# ---------- Pydantic schemas ----------

class DirectionItem(BaseModel):
    title: str
    description: str


class InspirationCreate(BaseModel):
    """创建灵感请求体"""
    title: str
    insight: Optional[str] = None
    action: Optional[str] = None
    directions: Optional[List[DirectionItem]] = None
    spark: Optional[str] = None
    fragment_count: int = 0
    user_id: int = 1


class InspirationUpdate(BaseModel):
    """更新灵感请求体"""
    title: Optional[str] = None
    insight: Optional[str] = None
    action: Optional[str] = None
    directions: Optional[List[DirectionItem]] = None
    spark: Optional[str] = None
    fragment_count: Optional[int] = None


class InspirationResponse(BaseModel):
    """灵感响应体"""
    id: int
    user_id: int
    title: str
    insight: Optional[str] = None
    action: Optional[str] = None
    directions: Optional[List[DirectionItem]] = None
    spark: Optional[str] = None
    fragment_count: int
    saved_at: str

    model_config = ConfigDict(from_attributes=True)


def _inspiration_to_response(insp: Inspiration) -> InspirationResponse:
    """模型 → 响应体转换（处理 directions JSON）"""
    directions = None
    if insp.directions:
        try:
            directions = json.loads(insp.directions)
        except (json.JSONDecodeError, TypeError):
            directions = None

    return InspirationResponse(
        id=insp.id,
        user_id=insp.user_id,
        title=insp.title,
        insight=insp.insight,
        action=insp.action,
        directions=directions,
        spark=insp.spark,
        fragment_count=insp.fragment_count,
        saved_at=insp.saved_at.isoformat() if insp.saved_at else "",
    )


# ---------- Routes ----------

@router.get("/", response_model=List[InspirationResponse])
async def list_inspirations(db: Session = Depends(get_db)):
    """获取所有灵感（按保存时间倒序）"""
    inspirations = (
        db.query(Inspiration)
        .order_by(Inspiration.saved_at.desc())
        .all()
    )
    return [_inspiration_to_response(insp) for insp in inspirations]


@router.post("/", response_model=InspirationResponse, status_code=status.HTTP_201_CREATED)
async def create_inspiration(payload: InspirationCreate, db: Session = Depends(get_db)):
    """创建一条灵感"""
    # 序列化 directions 为 JSON 字符串
    directions_json = None
    if payload.directions:
        directions_json = json.dumps(
            [d.model_dump() for d in payload.directions],
            ensure_ascii=False
        )

    insp = Inspiration(
        user_id=payload.user_id,
        title=payload.title,
        insight=payload.insight,
        action=payload.action,
        directions=directions_json,
        spark=payload.spark,
        fragment_count=payload.fragment_count,
    )
    db.add(insp)
    db.commit()
    db.refresh(insp)
    return _inspiration_to_response(insp)


@router.get("/{inspiration_id}", response_model=InspirationResponse)
async def get_inspiration(inspiration_id: int, db: Session = Depends(get_db)):
    """获取单条灵感"""
    insp = db.query(Inspiration).filter(Inspiration.id == inspiration_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="灵感不存在")
    return _inspiration_to_response(insp)


@router.delete("/{inspiration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inspiration(inspiration_id: int, db: Session = Depends(get_db)):
    """删除一条灵感"""
    insp = db.query(Inspiration).filter(Inspiration.id == inspiration_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="灵感不存在")
    db.delete(insp)
    db.commit()
    return None
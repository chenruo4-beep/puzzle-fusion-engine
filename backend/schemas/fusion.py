"""融合相关的 Pydantic 模型"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class FusionCreate(BaseModel):
    """创建融合请求体"""
    fragment_ids: List[int]


class FusionSaveRequest(BaseModel):
    """保存融合结果请求体"""
    profession: Optional[str] = None
    title: Optional[str] = None
    fragment_ids: List[int]
    result: str


class FusionResponse(BaseModel):
    """融合响应体"""
    id: int
    user_id: int
    profession: Optional[str] = None
    title: Optional[str] = None
    fragment_ids: str
    result: str
    iteration: int
    feedback: Optional[str] = None
    feedback_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackBody(BaseModel):
    feedback: str  # "useful" | "not_useful"
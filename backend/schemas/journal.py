"""日记相关的 Pydantic 模型"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class JournalCreate(BaseModel):
    """创建日记请求体"""
    content: str
    tags: Optional[str] = None


class JournalResponse(BaseModel):
    """日记响应体"""
    id: int
    user_id: int
    content: str
    tags: Optional[str] = None
    suggested_fragments: Optional[str] = None
    extracted_fragment_ids: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
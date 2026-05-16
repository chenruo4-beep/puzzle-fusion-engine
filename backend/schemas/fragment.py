"""碎片相关的 Pydantic 模型"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class FragmentCreate(BaseModel):
    """创建碎片请求体"""
    journal_id: Optional[int] = None
    fragment_type: Optional[str] = None
    content: str
    tags: Optional[str] = None


class FragmentUpdate(BaseModel):
    """更新碎片请求体"""
    fragment_type: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[str] = None
    archived: Optional[int] = None


class FragmentArchiveRequest(BaseModel):
    """归档/取消归档请求体"""
    archived: int  # 1=归档, 0=取消归档


class BatchImportRequest(BaseModel):
    """批量导入请求体"""
    text: str


class BatchImportPreviewItem(BaseModel):
    """批量导入预览项"""
    type: str
    content: str


class FragmentResponse(BaseModel):
    """碎片响应体"""
    id: int
    user_id: int
    journal_id: Optional[int] = None
    fragment_type: Optional[str] = None
    content: str
    tags: Optional[str] = None
    archived: int = 0
    created_at: datetime

    class Config:
        from_attributes = True
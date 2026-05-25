"""社区功能 Pydantic 模型"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


# ====== 评论 ======

class CommentCreate(BaseModel):
    """创建评论请求体"""
    content: str
    parent_id: Optional[int] = None  # 回复某条评论时传


class CommentUpdate(BaseModel):
    """编辑评论请求体"""
    content: str


class CommentResponse(BaseModel):
    """评论响应体"""
    id: int
    user_id: int
    fusion_id: int
    content: str
    parent_id: Optional[int] = None
    created_at: datetime
    author_name: Optional[str] = None  # 冗余字段方便前端展示
    reply_count: int = 0  # 回复数

    model_config = ConfigDict(from_attributes=True)


class CommentListResponse(BaseModel):
    """评论列表响应体"""
    items: list[CommentResponse]
    total: int


# ====== 点赞 ======

class LikeResponse(BaseModel):
    """点赞状态响应体"""
    liked: bool
    like_count: int

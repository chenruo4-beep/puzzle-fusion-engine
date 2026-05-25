"""语义搜索 — 请求/响应模型"""

from pydantic import BaseModel, Field


class SemanticSearchRequest(BaseModel):
    """语义搜索请求"""
    query: str = Field(..., min_length=1, max_length=500, description="搜索查询文本")
    limit: int = Field(default=10, ge=1, le=100, description="返回结果数量")
    min_score: float = Field(default=0.5, ge=0.0, le=1.0, description="最低相似度阈值")


class SearchResultItem(BaseModel):
    """单条搜索结果"""
    id: int
    score: float
    fragment_type: str = ""
    content: str = ""
    user_id: int = 0


class SemanticSearchResponse(BaseModel):
    """语义搜索响应"""
    results: list[SearchResultItem]
    total: int
    query: str

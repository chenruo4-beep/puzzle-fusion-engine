"""碎片相关的 Pydantic 模型"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class FragmentCreate(BaseModel):
    """创建碎片请求体"""
    journal_id: Optional[int] = Field(
        default=None,
        description="关联的日记ID"
    )
    fragment_type: Optional[str] = Field(
        default=None,
        max_length=50,
        description="碎片类型，最大50字符"
    )
    content: str = Field(
        min_length=1,
        max_length=2000,
        description="碎片内容，1-2000字符"
    )
    tags: Optional[str] = Field(
        default=None,
        max_length=500,
        description="标签JSON字符串，最大500字符"
    )

    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        """验证内容长度和安全性"""
        if len(v.strip()) < 1:
            raise ValueError('内容不能为空')
        if len(v) > 2000:
            raise ValueError('内容不能超过2000个字符')
        # 移除潜在的恶意内容
        malicious_patterns = [
            '<script', 'javascript:', 'eval(', 'exec(',
            'onload=', 'onclick=', 'onerror=', 'onfocus=',
            'document.cookie', 'localStorage', 'sessionStorage'
        ]
        if any(pattern in v.lower() for pattern in malicious_patterns):
            raise ValueError('内容包含非法字符')
        return v.strip()

    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v):
        """验证标签JSON格式"""
        if v and v.strip():
            try:
                import json
                tags_dict = json.loads(v)
                if not isinstance(tags_dict, dict):
                    raise ValueError('标签必须是JSON对象')
                if len(v) > 500:
                    raise ValueError('标签字符串超过500字符')
            except json.JSONDecodeError:
                raise ValueError('标签必须是有效的JSON格式')
        return v


class FragmentUpdate(BaseModel):
    """更新碎片请求体"""
    fragment_type: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[str] = None
    archived: Optional[int] = None


class FragmentArchiveRequest(BaseModel):
    """归档/取消归档请求体"""
    archived: int  # 1=归档, 0=取消归档


class RateFragmentBody(BaseModel):
    """碎片评分请求体"""
    quality_score: int  # 1-5


class ConfirmTraitBody(BaseModel):
    """确认推测特质请求体"""
    text: str
    fragment_type: str = "能力"


class DenyTraitBody(BaseModel):
    """否认推测特质请求体"""
    text: str = ""


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

    model_config = ConfigDict(from_attributes=True)
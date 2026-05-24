"""融合相关的 Pydantic 模型"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class FusionCreate(BaseModel):
    """创建融合请求体"""
    fragment_ids: List[int] = Field(
        min_length=2,
        max_length=20,
        description="至少选择2个，最多20个碎片"
    )

    @field_validator('fragment_ids')
    @classmethod
    def validate_fragment_ids(cls, v):
        """验证碎片ID列表"""
        if len(v) < 2:
            raise ValueError('至少需要选择2个碎片')
        if len(v) > 20:
            raise ValueError('最多只能选择20个碎片')
        if any(id <= 0 for id in v):
            raise ValueError('碎片ID必须为正数')
        return v


class FusionSaveRequest(BaseModel):
    """保存融合结果请求体"""
    profession: Optional[str] = Field(
        default=None,
        max_length=100,
        description="职业类型，最大100字符"
    )
    title: Optional[str] = Field(
        default=None,
        max_length=200,
        description="融合标题，最大200字符"
    )
    fragment_ids: List[int] = Field(
        min_length=2,
        max_length=20,
        description="至少选择2个，最多20个碎片"
    )
    result: str = Field(
        min_length=10,
        max_length=10000,
        description="融合结果，10-10000字符"
    )

    @field_validator('fragment_ids')
    @classmethod
    def validate_fragment_ids(cls, v):
        """验证碎片ID列表"""
        if len(v) < 2:
            raise ValueError('至少需要选择2个碎片')
        if len(v) > 20:
            raise ValueError('最多只能选择20个碎片')
        if any(id <= 0 for id in v):
            raise ValueError('碎片ID必须为正数')
        return v

    @field_validator('result')
    @classmethod
    def validate_result(cls, v):
        """验证融合结果"""
        if len(v.strip()) < 10:
            raise ValueError('融合结果至少需要10个字符')
        if len(v) > 10000:
            raise ValueError('融合结果不能超过10000个字符')
        # 移除潜在的恶意内容
        malicious_patterns = [
            '<script>', 'javascript:', 'eval(', 'exec(',
            'onload=', 'onclick=', 'onerror='
        ]
        if any(pattern in v.lower() for pattern in malicious_patterns):
            raise ValueError('结果包含非法字符')
        return v.strip()


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

    model_config = ConfigDict(from_attributes=True)


class FeedbackBody(BaseModel):
    feedback: str  # "useful" | "not_useful"
"""模板相关的 Pydantic 模型"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TemplateResponse(BaseModel):
    """模板响应体"""
    id: int
    name: str
    description: Optional[str] = None
    prompts: str  # JSON 字符串
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateApply(BaseModel):
    """应用模板请求体"""
    content: str  # 用户填写的日记内容
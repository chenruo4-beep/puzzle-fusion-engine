"""模板相关的 Pydantic 模型"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TemplateResponse(BaseModel):
    """模板响应体"""
    id: int
    name: str
    description: Optional[str] = None
    prompts: str  # JSON 字符串
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TemplateApply(BaseModel):
    """应用模板请求体"""
    content: str  # 用户填写的日记内容
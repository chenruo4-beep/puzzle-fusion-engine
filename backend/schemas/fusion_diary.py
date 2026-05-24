from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class FusionDiaryCreate(BaseModel):
    fusion_id: Optional[int] = None
    content: str


class FusionDiaryResponse(BaseModel):
    id: int
    user_id: int
    fusion_id: Optional[int] = None
    content: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

"""行进拼图地图 schemas"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MapStepCreate(BaseModel):
    step_number: int
    title: str
    description: Optional[str] = None
    landmark: Optional[str] = None
    landmark_icon: Optional[str] = None
    time_estimate: Optional[str] = None
    action: Optional[str] = None
    position_x: int = 0
    position_y: int = 0


class JourneyMapCreate(BaseModel):
    fusion_id: Optional[int] = None
    title: str
    subtitle: Optional[str] = None
    difficulty: Optional[str] = None
    time_to_result: Optional[str] = None
    steps: List[MapStepCreate]


class MapStepResponse(BaseModel):
    id: int
    map_id: int
    step_number: int
    title: str
    description: Optional[str]
    landmark: Optional[str]
    landmark_icon: Optional[str]
    time_estimate: Optional[str]
    action: Optional[str]
    status: str
    completion_percent: int
    position_x: int
    position_y: int
    created_at: datetime

    class Config:
        from_attributes = True


class JourneyMapResponse(BaseModel):
    id: int
    user_id: int
    fusion_id: Optional[int]
    title: str
    subtitle: Optional[str]
    difficulty: Optional[str]
    time_to_result: Optional[str]
    status: str
    progress: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class MapProgressUpdate(BaseModel):
    current_step: Optional[int] = None
    overall_progress: Optional[int] = None
    step_number: Optional[int] = None
    step_status: Optional[str] = None
    completion_percent: Optional[int] = None


class MapProgressResponse(BaseModel):
    id: int
    user_id: int
    map_id: int
    current_step: int
    overall_progress: int
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class MiniDirection(BaseModel):
    title: str
    type: str
    tagline: str

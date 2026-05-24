"""行进拼图地图模型 — 将融合方案转化为可视化地图"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, func
from database import Base


class JourneyMap(Base):
    """行进地图表 — 每个融合方向对应一张地图"""

    __tablename__ = "journey_maps"

    id = Column(Integer, primary_key=True, index=True)
    # 所属用户
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # 关联的融合记录ID
    fusion_id = Column(Integer, ForeignKey("fusions.id"), nullable=True, index=True)
    # 地图标题（方向名称）
    title = Column(String(100), nullable=False)
    # 地图副标题
    subtitle = Column(String(200), nullable=True)
    # 难度等级
    difficulty = Column(String(20), nullable=True)
    # 预计见效时间
    time_to_result = Column(String(50), nullable=True)
    # 地图状态：active(进行中) / completed(已完成) / abandoned(已放弃)
    status = Column(String(20), default="active")
    # 整体进度 0-100
    progress = Column(Integer, default=0)
    # 创建时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # 更新时间
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class MapStep(Base):
    """地图步骤表 — 地图上的每个景点/建筑物"""

    __tablename__ = "map_steps"

    id = Column(Integer, primary_key=True, index=True)
    # 所属地图
    map_id = Column(Integer, ForeignKey("journey_maps.id"), nullable=False, index=True)
    # 步骤序号
    step_number = Column(Integer, nullable=False)
    # 步骤名称
    title = Column(String(100), nullable=False)
    # 步骤描述
    description = Column(Text, nullable=True)
    # 地标名称（如"起点广场""技能工坊"）
    landmark = Column(String(50), nullable=True)
    # 地标图标（emoji）
    landmark_icon = Column(String(10), nullable=True)
    # 预计时间
    time_estimate = Column(String(50), nullable=True)
    # 具体行动
    action = Column(Text, nullable=True)
    # 步骤状态：locked(未解锁) / active(进行中) / completed(已完成)
    status = Column(String(20), default="locked")
    # 完成百分比 0-100
    completion_percent = Column(Integer, default=0)
    # 在地图上的位置坐标（用于可视化布局）
    position_x = Column(Integer, default=0)
    position_y = Column(Integer, default=0)
    # 创建时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MapProgress(Base):
    """用户地图进度表 — 记录用户在每张地图上的进度"""

    __tablename__ = "map_progress"

    id = Column(Integer, primary_key=True, index=True)
    # 所属用户
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # 所属地图
    map_id = Column(Integer, ForeignKey("journey_maps.id"), nullable=False, index=True)
    # 当前步骤序号
    current_step = Column(Integer, default=1)
    # 整体进度 0-100
    overall_progress = Column(Integer, default=0)
    # 最后更新时间
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
